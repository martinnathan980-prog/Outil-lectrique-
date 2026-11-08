/* ===========================================================================
   08 — L'IA INTERNE (le grand chantier des documents d'entrée, novembre 2026)
   Le lecteur a une IA interne : une API de type OpenAI (/v1/chat/completions et une clé), un modèle ouvert, plus modeste
   que les grands modèles. Il a choisi que VOLTA l'appelle DE LUI-MÊME quand il bloque sur un document d'entrée : c'est la
   SEULE exception au « aucun appel réseau » de la charte. Ce module tient trois choses.
     1. LE RÉGLAGE « IA interne » (⋮ › Plus, la palette « / ») : l'adresse, le modèle, la clé — gardés dans ce navigateur
        (localStorage, `CLE_IA`) et nulle part ailleurs : ni dans un export, ni dans le contrat, ni dans un journal, ni dans
        le DOM (les champs reçoivent leur valeur par propriété, jamais par attribut). Un interrupteur coupe tout.
     2. « TESTER LA CONNEXION » (`testerIA`) : un diagnostic en clair, une étape après l'autre, chacune avec ce qu'il faut
        faire — l'adresse, le navigateur (le CORS : une page ouverte depuis un fichier a l'origine « null »), la clé, le
        modèle, la réponse et son temps, les images (un chiffre dessiné qu'elle doit lire), ce qu'elle lit d'un coup. Ce
        qu'il mesure se garde (`IA.capacites`), sans la clé.
     3. LE MOTEUR D'APPEL. Une seule fonction fait le réseau : `appelIA` — aucun autre fetch ni XMLHttpRequest dans src/
        (tests/ia.js le vérifie en lisant les sources). Au-dessus, LA FILE : une ou deux demandes à la fois, les nouvelles
        tentatives à attente croissante, le 429 respecté, l'arrêt et la reprise, l'avancement honnête (fait, à faire, le
        temps mesuré sur les dernières réponses), la réponse JSON validée (mal formée : VOLTA redemande une fois, en le
        disant). Une lecture longue est gardée dans IndexedDB (`IDB_IA`) : coupée, elle reprend où elle en était.

   LES POINTS D'APPEL — pour la suite du chantier (la lecture des PDF, des Visio, des gros documents). Rien n'y est encore
   branché : on attend la mesure de l'agent « documents ».
     · `iaPrete()` : vrai quand VOLTA peut appeler (l'interrupteur allumé, une adresse, un modèle).
     · `IA.capacites` : ce que le dernier test réussi a mesuré — { modele, latence (ms), vision (vrai, faux, ou null : pas
       essayé), contexte (jetons, ou null), contexteSur ('annonce' | 'essai' | 'limite' | 'moins'), json, date }. Par
       exemple : n'envoyer l'image d'une page scannée que si `IA.capacites.vision` ; couper un gros document en morceaux qui
       tiennent dans `IA.capacites.contexte`.
     · `partieImageIA(source)` : une image (un canvas, une data URL) prête à poser dans `content`, au format image_url.
     · `await demanderIA(messages, options)` : une demande par la file, rendue quand elle est faite —
       { texte, json, modele, duree, essais, redemande }. options : json (une réponse JSON, validée ; mal formée, redemandée
       une fois), schema ({ type: 'objet' | 'liste', requis: [...] }), valider (fn(json) → vrai, ou ce qui ne va pas),
       maxJetons, temperature, delai (ms). Une erreur porte son `genre` ('coupee', 'reglage', 'cle', 'modele', 'image',
       'contexte', 'requete', 'json', 'arret'…) et un texte en clair.
     · `lireEnFondIA({ lot, titre, genre, demandes: [{ rang, messages, options }] })` : une lecture longue, gardée ; elle
       survit à la page refermée et reprend à la réouverture. Son avancement : `avancementIA(lot)`, le réglage, et
       l'événement `ia-avance` (window) à chaque changement ; `ia-lot-fini` à la fin. Chaque réponse est remise à
       `surReponseIA(genre, fn)` — fn({ lot, rang, reponse, erreur }) —, toutes ensemble par `await resultatsIA(lot)` ;
       `oublierLotIA(lot)` la range.
     · `arreterIA()`, `reprendreIA()` : l'arrêt (les demandes en vol reviennent dans la file, sans compter d'essai) et la
       reprise.
   LES CONSIGNES À L'IA : pas de rôle « system » (des modèles de sa famille le refusent) ; la consigne va dans le message
   de l'utilisateur, et les rôles alternent (utilisateur, assistant, utilisateur…).
   =========================================================================== */
'use strict';

const CLE_IA = 'volta.ia.reglage', CLE_IA_MESURE = 'volta.ia.mesure', IDB_IA = 'volta-ia';
const REGLAGE_IA_VIDE = Object.freeze({ actif: true, adresse: '', modele: '', cle: '', parallele: 2 });
const IA = {
  reglage: null,          // { actif, adresse, modele, cle, parallele } — localStorage, `CLE_IA`
  capacites: null,        // ce que le dernier test réussi a mesuré (sans la clé) — localStorage, `CLE_IA_MESURE`
  diag: null,             // le dernier diagnostic : { date, ok, perime, lignes } — idem
  test: null,             // le test en cours : { ab, lignes }
  file: [],               // les demandes à faire ou en vol, légères (les messages d'une lecture restent dans IndexedDB)
  actifs: new Map(),      // id → AbortController : celles qui sont en vol
  lots: new Map(),        // les lectures longues : id → { id, titre, genre, cree, etat ('actif' | 'arrete' | 'fini'), total, faites, echecs }
  traitants: new Map(),   // genre → fn : à qui remettre chaque réponse d'une lecture
  arret: false,           // le lecteur a arrêté la file
  bloque: null,           // { genre, texte } : une erreur qui arrête tout (la clé, le modèle…) jusqu'à un nouveau réglage ou « Reprendre »
  pause: 0,               // un 429 : rien ne part avant cet instant
  attend: null,           // { depuis, texte } : l'IA ne répond plus — VOLTA réessaie toutes les deux minutes
  cadence: [],            // les instants des dernières réponses depuis la dernière (re)prise : le temps restant s'en déduit
  reveil: 0,              // le minuteur du prochain départ
  attenteBase: 2000,      // la première attente d'une nouvelle tentative, puis × 2 jusqu'à une minute (les tests la raccourcissent)
  essaisMax: 5,           // au-delà, l'IA « ne répond plus » : la demande attend deux minutes, puis réessaie
  delaiQuestion: 300000,  // une question sans réponse au bout de 5 min : abandonnée, puis réessayée
  tenue: undefined,       // vrai : cette page tient la file des lectures gardées (`tenirFileIA`) ; faux : un autre onglet la tient
  canal: null,            // le canal entre les onglets de VOLTA (une lecture lancée ailleurs arrive à celui qui tient la file)
  db: null, n: 0, rendu: 0, diagT: false, lie: false
};

/* ---- LE RÉGLAGE : lu au chargement, gardé à chaque frappe ---------------------------------------------------------- */
function lireReglageIA() { let x = null; try { x = JSON.parse(localStorage.getItem(CLE_IA) || 'null'); } catch (_) { x = null; }
  const r = { ...REGLAGE_IA_VIDE, ...(x && typeof x === 'object' ? x : {}) };
  ['adresse', 'modele', 'cle'].forEach(k => { r[k] = typeof r[k] === 'string' ? r[k] : ''; });
  r.actif = r.actif !== false; r.parallele = r.parallele === 1 ? 1 : 2; return r; }
function garderReglageIA() { try { localStorage.setItem(CLE_IA, JSON.stringify(IA.reglage)); return true; } catch (_) { return false; } }
function lireMesureIA() { try { const x = JSON.parse(localStorage.getItem(CLE_IA_MESURE) || 'null'); if (x && typeof x === 'object') { IA.capacites = x.capacites || null; IA.diag = x.diag || null; } } catch (_) { } }
function garderMesureIA() { try { localStorage.setItem(CLE_IA_MESURE, JSON.stringify({ capacites: IA.capacites, diag: IA.diag })); } catch (_) { } }
IA.reglage = lireReglageIA(); lireMesureIA();
// l'adresse de base : sans espace, sans « / » final ; collée avec /chat/completions ou /models, VOLTA les retire (il les ajoute lui-même)
const adresseIA = a => String(a || '').trim().replace(/\s+/g, '').replace(/\/+(chat\/completions|completions|models)\/?$/i, '').replace(/\/+$/, '');
const adresseValideIA = s => /^https?:\/\/[^\s/?#]+/i.test(s || '');
const hoteIA = s => { const m = /^https?:\/\/([^/?#]+)/i.exec(s || ''); return m ? m[1] : String(s || ''); };
const iaPrete = () => { const R = IA.reglage; return !!(R.actif && adresseValideIA(adresseIA(R.adresse)) && R.modele.trim()); };
// une clé ne s'écrit jamais : ni dans un message, ni dans un diagnostic gardé — un texte du serveur qui la citerait la perd
const masquerCleIA = s => { let t = String(s == null ? '' : s); const k = IA.reglage && IA.reglage.cle; if (k && k.length >= 4) t = t.split(k).join('•••'); return t.replace(/Bearer\s+[^\s"',;]+/gi, 'Bearer •••'); };

/* ---- LE RÉSEAU : la seule fonction de VOLTA qui en fait ------------------------------------------------------------
   Un seul appel, sans nouvelle tentative (la file s'en charge). `options` : liste (GET /models), sonde (GET /models en
   mode no-cors, sans clé : l'adresse répond-elle, même quand le navigateur bloque sa réponse ?), adresse, modele,
   maxJetons, temperature, formatJson, delai (ms), signal. Rend { texte, modele, duree, usage, fin } ; pour la liste,
   { modeles: [{ id, contexte }], duree } ; pour la sonde, { joignable: true }. Une erreur porte son `genre` : coupee,
   reglage, reseau (rien ne revient : l'adresse injoignable, ou le navigateur qui bloque), delai, arret, cle, modele,
   chemin, occupee (son `attente` en ms quand l'IA la dit), panne, contexte (sa `limite` quand elle la dit), image,
   requete, reponse. */
const erreurIA = (genre, texte, o) => Object.assign(new Error(masquerCleIA(texte)), { genre }, o || {});
async function appelIA(messages, options) { const o = options || {}, R = IA.reglage;
  if (!R.actif) throw erreurIA('coupee', 'L’IA interne est coupée : rien ne part.');
  const base = adresseIA(o.adresse != null ? o.adresse : R.adresse);
  if (!adresseValideIA(base)) throw erreurIA('reglage', base ? 'L’adresse de l’IA interne doit commencer par http:// ou https://.' : 'L’adresse de l’IA interne n’est pas écrite.');
  const quoi = o.sonde ? 'sonde' : o.liste ? 'liste' : 'question', modele = String(o.modele || R.modele || '').trim();
  if (quoi === 'question' && !modele) throw erreurIA('reglage', 'Le modèle de l’IA interne n’est pas écrit.');
  const url = base + (quoi === 'question' ? '/chat/completions' : '/models');
  const init = { method: quoi === 'question' ? 'POST' : 'GET', mode: quoi === 'sonde' ? 'no-cors' : 'cors', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' };
  if (quoi !== 'sonde') { init.headers = { Accept: 'application/json' }; if (R.cle) init.headers.Authorization = 'Bearer ' + R.cle;
    if (quoi === 'question') { init.headers['Content-Type'] = 'application/json';
      const corps = { model: modele, messages, temperature: o.temperature != null ? o.temperature : 0, max_tokens: o.maxJetons || 2048, stream: false };
      if (o.formatJson) corps.response_format = { type: 'json_object' };
      init.body = JSON.stringify(corps); } }
  const ab = new AbortController(), delai = o.delai || (quoi === 'question' ? IA.delaiQuestion : 15000);
  let parDelai = false; const minuteur = setTimeout(() => { parDelai = true; ab.abort(); }, delai);
  const arreter = () => ab.abort(); if (o.signal) { if (o.signal.aborted) arreter(); else o.signal.addEventListener('abort', arreter, { once: true }); }
  const coupe = () => parDelai ? erreurIA('delai', 'L’IA interne n’a pas répondu en ' + secondesIA(delai) + '.')
    : o.signal && o.signal.aborted ? erreurIA('arret', 'Demande arrêtée.') : erreurIA('reseau', 'Aucune réponse lisible de ' + hoteIA(base) + '.');
  const t0 = performance.now();
  try {
    let r; try { r = await fetch(url, { ...init, signal: ab.signal }); } catch (_) { throw coupe(); }
    if (quoi === 'sonde') return { joignable: true, duree: performance.now() - t0 };
    let texte = ''; try { texte = await r.text(); } catch (_) { throw coupe(); }
    const duree = performance.now() - t0; let corps = null; try { corps = texte ? JSON.parse(texte) : null; } catch (_) { corps = null; }
    if (!r.ok) throw erreurDeStatutIA(r.status, corps, texte, r.headers.get('Retry-After'));
    if (quoi === 'liste') return { modeles: modelesDeIA(corps), duree };
    const choix = corps && Array.isArray(corps.choices) ? corps.choices[0] : null, m = choix && (choix.message || choix.delta);
    let contenu = m ? m.content : choix && typeof choix.text === 'string' ? choix.text : null;
    if (Array.isArray(contenu)) contenu = contenu.map(p => (p && typeof p.text === 'string' ? p.text : '')).join('');
    if (typeof contenu !== 'string') throw erreurIA('reponse', 'L’IA interne a répondu, mais pas comme une IA de type OpenAI : aucun texte dans sa réponse.');
    return { texte: contenu, modele: (corps && typeof corps.model === 'string' && corps.model) || modele, duree, usage: (corps && corps.usage) || null, fin: (choix && choix.finish_reason) || '' };
  } finally { clearTimeout(minuteur); if (o.signal) o.signal.removeEventListener('abort', arreter); } }
// ce que l'IA dit de son erreur, en une ligne (le message de son JSON, sinon son texte sans balises)
function messageDeIA(corps, texte) { const e = corps && corps.error;
  const m = e && typeof e === 'object' ? e.message : typeof e === 'string' ? e : corps && (corps.message || (typeof corps.detail === 'string' ? corps.detail : Array.isArray(corps.detail) ? corps.detail.map(d => d && d.msg).filter(Boolean).join(' ; ') : ''));
  return String(m || String(texte || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, 240); }
// l'attente d'un 429 : l'en-tête Retry-After (des secondes, ou une date), sinon ce que dit son message (« try again in 20s »)
function attenteDeIA(ra, msg) { if (ra) { const s = Number(ra); if (isFinite(s) && s >= 0) return s * 1000; const d = Date.parse(ra); if (isFinite(d)) return Math.max(0, d - Date.now()); }
  const m = /(?:try again|retry|réessayez)[^0-9]{0,24}(\d+(?:[.,]\d+)?)\s*(ms|s|sec|secondes?|seconds?|min|minutes?)?/i.exec(msg || ''); if (!m) return 0;
  const x = parseFloat(m[1].replace(',', '.')), u = (m[2] || 's').toLowerCase(); return u === 'ms' ? x : /^min/.test(u) ? x * 60000 : x * 1000; }
// la limite que dit un refus pour cause de longueur (« maximum context length is 8192 tokens »)
const limiteDeIA = msg => { const m = /(?:maximum context length|context length|context window|max_model_len|n_ctx|contexte)\D{0,40}?(\d[\d\s,.]{2,})/i.exec(msg || ''); const n = m ? parseInt(m[1].replace(/[\s,.]/g, ''), 10) : 0; return n > 0 ? n : 0; };
function erreurDeStatutIA(st, corps, texte, ra) { const msg = masquerCleIA(messageDeIA(corps, texte)), m = msg.toLowerCase(), x = { statut: st, detail: msg };
  const modele = /mod[eè]le|model/.test(m) && /not found|does not exist|unknown|invalid|inconnu|introuvable|not available|no such|n’existe|n'existe/.test(m);
  if (st === 401 || st === 403) return erreurIA('cle', 'L’IA interne refuse la clé (erreur ' + st + ').', x);
  if (st === 429) return erreurIA('occupee', 'L’IA interne reçoit trop de demandes (erreur 429).', { ...x, attente: attenteDeIA(ra, msg) });
  if (st >= 500) return erreurIA('panne', 'L’IA interne est en panne de son côté (erreur ' + st + ').', x);
  if (st === 408) return erreurIA('delai', 'L’IA interne n’a pas répondu à temps (erreur 408).', x);
  if (modele) return erreurIA('modele', 'L’IA interne ne connaît pas ce modèle (erreur ' + st + ').', x);
  if (st === 404) return erreurIA('chemin', 'Rien n’attend les questions à cette adresse (erreur 404).', x);
  if (st === 413 || /context|contexte|too long|too many tokens|maximum[^.]{0,30}tokens|token limit|trop long/.test(m)) return erreurIA('contexte', 'L’IA interne refuse une demande trop longue (erreur ' + st + ').', { ...x, limite: limiteDeIA(msg) });
  if (/image|vision|multimodal|multi-modal/.test(m)) return erreurIA('image', 'L’IA interne refuse les images (erreur ' + st + ').', x);
  return erreurIA('requete', 'L’IA interne a refusé la demande (erreur ' + st + (msg ? ' : ' + msg : '') + ').', x); }
// les modèles qu'elle annonce, et ce que chacun lit d'un coup quand elle le dit (les noms des champs varient d'un serveur à l'autre)
const CHAMPS_CONTEXTE_IA = ['max_model_len', 'context_length', 'context_window', 'max_context_length', 'max_context_tokens', 'n_ctx', 'max_input_tokens', 'input_token_limit', 'inputTokenLimit'];
function contexteDeIA(x) { if (!x || typeof x !== 'object') return 0; for (const k of CHAMPS_CONTEXTE_IA) { const v = Number(x[k]); if (v > 0) return v; }
  const meta = x.meta || x.metadata || x.details; if (meta && typeof meta === 'object') for (const k of ['n_ctx_train', 'n_ctx', 'context_length', 'max_model_len']) { const v = Number(meta[k]); if (v > 0) return v; }
  return 0; }
function modelesDeIA(corps) { const xs = corps && Array.isArray(corps.data) ? corps.data : corps && Array.isArray(corps.models) ? corps.models : Array.isArray(corps) ? corps : [];
  return xs.map(x => typeof x === 'string' ? { id: x, contexte: 0 } : { id: String((x && (x.id || x.name || x.model)) || ''), contexte: contexteDeIA(x) }).filter(x => x.id); }

/* ---- LES IMAGES : une partie de message au format image_url ; le chiffre du test, dessiné -------------------------- */
function partieImageIA(source) { const url = typeof source === 'string' ? source : source && typeof source.toDataURL === 'function' ? source.toDataURL('image/png') : '';
  return { type: 'image_url', image_url: { url } }; }
// un chiffre noir sur blanc, dans la police de VOLTA (embarquée) : toujours le même dessin pour le même chiffre
async function imageChiffreIA(d) { try { await document.fonts.load('700 112px Inter'); } catch (_) { }
  const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 160, 160); g.fillStyle = '#16171a'; g.font = '700 112px Inter, "IBM Plex Sans", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(d), 80, 86); return c.toDataURL('image/png'); }
const chiffreAuHasardIA = () => 2 + Math.floor(Math.random() * 8);   // de 2 à 9 : ni le 0 (un O), ni le 1 (un l)
// les chiffres en toutes lettres (« C’est un sept. ») — ni zéro ni un : VOLTA ne les dessine pas, et « un » est aussi un article
const MOTS_CHIFFRES_IA = [[], [], ['deux', 'two'], ['trois', 'three'], ['quatre', 'four'], ['cinq', 'five'], ['six'], ['sept', 'seven'], ['huit', 'eight'], ['neuf', 'nine']];
function chiffreLuIA(t) { const s = String(t || ''), ds = [...new Set(s.match(/\d/g) || [])]; if (ds.length === 1) return +ds[0]; if (ds.length > 1) return null;
  const mots = s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').split(/[^a-z]+/), vus = MOTS_CHIFFRES_IA.map((xs, d) => xs.some(w => mots.includes(w.normalize('NFD').replace(/\p{M}/gu, ''))) ? d : -1).filter(d => d >= 0);
  return vus.length === 1 ? vus[0] : null; }

/* ---- UNE RÉPONSE JSON : trouvée dans le texte, vérifiée ; mal formée, redemandée une fois ------------------------- */
function finDuBlocIA(s, i) { const ouvre = s[i], ferme = ouvre === '{' ? '}' : ']'; let n = 0, chaine = false, echap = false;
  for (let k = i; k < s.length; k++) { const c = s[k];
    if (chaine) { if (echap) echap = false; else if (c === '\\') echap = true; else if (c === '"') chaine = false; continue; }
    if (c === '"') chaine = true; else if (c === ouvre) n++; else if (c === ferme && --n === 0) return k; }
  return -1; }
const raisonJsonIA = e => { const p = /position (\d+)/.exec((e && e.message) || ''); return 'mal formé' + (p ? ' près du caractère ' + p[1] : ''); };
function jsonDansTexteIA(t) { let s = String(t || '').trim(); const f = /```(?:json)?\s*([\s\S]*?)```/i.exec(s); if (f) s = f[1].trim();
  if (!s) return { ok: false, raison: 'la réponse est vide' };
  try { return { ok: true, json: JSON.parse(s) }; } catch (_) { }
  const i = s.search(/[[{]/); if (i < 0) return { ok: false, raison: 'aucun JSON dans la réponse' };
  const j = finDuBlocIA(s, i); if (j < 0) return { ok: false, raison: 'le JSON s’arrête avant sa fin' };
  try { return { ok: true, json: JSON.parse(s.slice(i, j + 1)) }; } catch (e) { return { ok: false, raison: raisonJsonIA(e) }; } }
function verifierJsonIA(texte, schema, valider) { const r = jsonDansTexteIA(texte); if (!r.ok) return r; const j = r.json;
  if (schema) { const liste = Array.isArray(j), objet = j && typeof j === 'object' && !liste;
    if (schema.type === 'liste' && !liste) return { ok: false, raison: 'une liste [ … ] était attendue' };
    if (schema.type === 'objet' && !objet) return { ok: false, raison: 'un objet { … } était attendu' };
    const manque = objet ? (schema.requis || []).filter(k => !(k in j)) : []; if (manque.length) return { ok: false, raison: 'il manque ' + manque.map(k => '« ' + k + ' »').join(', ') }; }
  if (typeof valider === 'function') { let v; try { v = valider(j); } catch (e) { v = (e && e.message) || 'refusé'; } if (v !== true && v !== undefined) return { ok: false, raison: typeof v === 'string' && v ? v : 'le contenu ne convient pas' }; }
  return { ok: true, json: j }; }
const CONSIGNE_JSON_IA = 'Réponds uniquement par du JSON valide, sans texte autour ni balises de code.';
// la consigne JSON va dans le dernier message de l'utilisateur (pas de rôle « system » : des modèles de sa famille le refusent)
function avecConsigneJsonIA(messages) { const ms = (messages || []).map(m => ({ ...m })), k = ms.map(m => m.role).lastIndexOf('user'); if (k < 0) return [...ms, { role: 'user', content: CONSIGNE_JSON_IA }];
  const m = ms[k]; m.content = Array.isArray(m.content) ? [...m.content, { type: 'text', text: CONSIGNE_JSON_IA }] : String(m.content || '') + '\n\n' + CONSIGNE_JSON_IA; return ms; }
async function repondreIA(messages, o, valider, signal) { o = o || {}; const passe = { ...o, signal };
  if (!o.json) { const r = await appelIA(messages, passe); return { ...r, json: null, redemande: false }; }
  const ms = avecConsigneJsonIA(messages), r1 = await appelIA(ms, passe), v1 = verifierJsonIA(r1.texte, o.schema, valider);
  if (v1.ok) return { ...r1, json: v1.json, redemande: false };
  // mal formé : VOLTA redemande UNE fois, en le disant
  const ms2 = [...ms, { role: 'assistant', content: r1.texte }, { role: 'user', content: 'Ta réponse n’est pas un JSON valide (' + v1.raison + '). Renvoie uniquement le JSON demandé, complet, sans texte autour ni balises de code.' }];
  const r2 = await appelIA(ms2, passe), v2 = verifierJsonIA(r2.texte, o.schema, valider);
  if (v2.ok) return { ...r2, json: v2.json, redemande: true, duree: r1.duree + r2.duree };
  throw erreurIA('json', 'L’IA interne n’a pas rendu un JSON valide, même redemandé (' + v2.raison + ').', { texte: masquerCleIA(r2.texte).slice(0, 400) }); }

/* ---- LA FILE : demandes directes (en mémoire) et lectures longues (gardées) ----------------------------------------
   Une demande : { id, lot, rang, genre, etat ('attente' | 'encours'), essais, apres (pas avant cet instant), messages
   (une demande directe ; ceux d'une lecture restent dans IndexedDB), options, direct, ok, ko }. Elle ne s'écrit dans
   IndexedDB qu'à la fin (faite ou en échec) : une demande en vol quand la page se ferme est refaite à la réouverture. */
const OPTIONS_GARDEES_IA = ['json', 'schema', 'maxJetons', 'temperature', 'delai', 'formatJson'];
const optionsGardeesIA = o => Object.fromEntries(OPTIONS_GARDEES_IA.filter(k => o && o[k] != null).map(k => [k, o[k]]));   // jamais la clé, jamais une fonction
function demanderIA(messages, options) { const o = options || {};
  return new Promise((ok, ko) => { if (!iaPrete()) { ko(!IA.reglage.actif ? erreurIA('coupee', 'L’IA interne est coupée : rien ne part.') : erreurIA('reglage', 'L’IA interne n’est pas réglée (⋮ › Plus › IA interne).')); return; }
    IA.file.push({ id: 'd' + Date.now().toString(36) + '-' + (++IA.n), lot: '', rang: IA.n, genre: '', etat: 'attente', essais: 0, apres: 0, messages, options: optionsGardeesIA(o), valider: typeof o.valider === 'function' ? o.valider : null, direct: true, ok, ko });
    pomperIA(); }); }
/* LA BASE : trois magasins — les lectures (`lots`), leurs demandes sans les messages (`demandes`, avec la réponse quand
   elle est faite), et leurs messages à part (`messages` : une page en image pèse ; relire la file reste léger). */
function baseIA() { if (IA.db) return IA.db;
  IA.db = new Promise((ok, ko) => { try { const r = indexedDB.open(IDB_IA, 1);
    r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains('lots')) db.createObjectStore('lots', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('demandes')) db.createObjectStore('demandes', { keyPath: 'id' }).createIndex('lot', 'lot');
      if (!db.objectStoreNames.contains('messages')) db.createObjectStore('messages', { keyPath: 'id' }); };
    r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); r.onblocked = () => ko(new Error('base occupée par un autre onglet')); } catch (e) { ko(e); } });
  IA.db.catch(() => { IA.db = null; }); return IA.db; }
// une transaction : `fn(magasins)` rend une requête (son résultat est rendu) ou rien
function idbIA(noms, mode, fn) { return baseIA().then(db => new Promise((ok, ko) => { const tx = db.transaction(noms, mode), S = Object.fromEntries([].concat(noms).map(n => [n, tx.objectStore(n)]));
  let res; const q = fn(S); if (q && 'onsuccess' in q) q.onsuccess = () => { res = q.result; }; tx.oncomplete = () => ok(res); tx.onerror = () => ko(tx.error); tx.onabort = () => ko(tx.error); })); }
const lotPublicIA = L => ({ id: L.id, titre: L.titre, genre: L.genre, cree: L.cree, etat: L.etat, total: L.total, faites: L.faites, echecs: L.echecs, fini: L.fini || 0 });
async function lireEnFondIA(L) { L = L || {}; const id = String(L.lot || ('lecture-' + Date.now().toString(36)));
  const lot = IA.lots.get(id) || { id, titre: String(L.titre || id), genre: String(L.genre || ''), cree: Date.now(), etat: 'actif', total: 0, faites: 0, echecs: 0 };
  const ds = (L.demandes || []).map((x, k) => { const rang = x.rang != null ? x.rang : lot.total + k; return { id: id + ':' + rang, lot: id, rang, genre: lot.genre, options: optionsGardeesIA(x.options), messages: x.messages }; })
    .filter(d => !IA.file.some(x => x.id === d.id));
  // une demande déjà gardée (la même lecture relancée après une coupure) ne se refait pas
  let gardees = !lot.memoire, neuves = ds;
  if (gardees) try { const deja = await Promise.all(ds.map(d => idbIA('demandes', 'readonly', S => S.demandes.get(d.id)))); neuves = ds.filter((d, k) => !deja[k]); } catch (_) { gardees = false; }
  lot.total += neuves.length; if (lot.etat === 'fini' && neuves.length) lot.etat = 'actif';
  if (gardees) try { await idbIA(['lots', 'demandes', 'messages'], 'readwrite', S => { S.lots.put(lotPublicIA(lot));
      neuves.forEach(d => { S.demandes.put({ id: d.id, lot: id, rang: d.rang, genre: d.genre, options: d.options, etat: 'attente', cree: Date.now() }); S.messages.put({ id: d.id, messages: d.messages }); }); }); }
    catch (_) { gardees = false; }
  if (!gardees) { lot.memoire = true; lot.resultats = lot.resultats || new Map(); }   // sans IndexedDB : en mémoire, sans reprise après une coupure
  IA.lots.set(id, lot);
  // gardée, elle se lit dans la page qui tient la file (`tenirFileIA`) : ici, ou dans un autre onglet de VOLTA, prévenu
  if (gardees && IA.tenue === false) { if (IA.canal) IA.canal.postMessage({ quoi: 'lot', lot: id }); lot.ailleurs = true; signalerIA(); return id; }
  neuves.forEach(d => IA.file.push({ id: d.id, lot: id, rang: d.rang, genre: d.genre, etat: 'attente', essais: 0, apres: 0, messages: gardees ? null : d.messages, options: d.options, direct: false }));
  pomperIA(); return id; }
function surReponseIA(genre, fn) { if (typeof fn === 'function') IA.traitants.set(String(genre), fn); else IA.traitants.delete(String(genre)); }
async function resultatsIA(id) { const L = IA.lots.get(id);
  if (L && L.memoire) return [...L.resultats.values()].sort((a, b) => a.rang - b.rang);
  let xs = []; try { xs = await idbIA('demandes', 'readonly', S => S.demandes.index('lot').getAll(id)) || []; } catch (_) { xs = []; }
  return xs.sort((a, b) => a.rang - b.rang).map(x => ({ rang: x.rang, etat: x.etat, reponse: x.reponse || null, erreur: x.erreur || null })); }
async function oublierLotIA(id) { IA.file.filter(d => d.lot === id).forEach(d => { const ab = IA.actifs.get(d.id); if (ab) ab.abort(); });
  IA.file = IA.file.filter(d => d.lot !== id); IA.lots.delete(id);
  try { const ids = (await idbIA('demandes', 'readonly', S => S.demandes.index('lot').getAllKeys(id))) || [];
    await idbIA(['lots', 'demandes', 'messages'], 'readwrite', S => { S.lots.delete(id); ids.forEach(k => { S.demandes.delete(k); S.messages.delete(k); }); }); } catch (_) { }
  signalerIA(); }
/* UNE SEULE PAGE TIENT LA FILE des lectures gardées (un verrou du navigateur) : deux onglets de VOLTA ne liraient pas deux
   fois le même document — l'autre prend la suite quand celle-ci se ferme ; une lecture lancée dans un autre onglet arrive
   ici par un canal. */
function tenirFileIA() { if (IA.tenue !== undefined) return IA.tenue;
  const prendre = () => { IA.tenue = true; if (IA.canal) IA.canal.onmessage = e => { if (e.data && e.data.quoi === 'lot') relireFileIA(); }; relireFileIA(); };
  if (!(typeof navigator !== 'undefined' && navigator.locks && navigator.locks.request)) { prendre(); return true; }
  IA.tenue = false; navigator.locks.request('volta-ia-file', () => { prendre(); return new Promise(() => { }); }).catch(() => { if (!IA.tenue) prendre(); });
  return false; }
// les lectures gardées reviennent (au chargement, ou quand un autre onglet en lance une) ; celles qui n'étaient pas arrêtées
// reprennent où elles en étaient. Aucune lecture jamais lancée : la base n'existe pas, et VOLTA ne la crée pas pour rien.
async function relireFileIA() { let lots = [], ds = [];
  try { if (indexedDB.databases) { const xs = await indexedDB.databases(); if (!xs.some(x => x.name === IDB_IA)) return; } } catch (_) { }
  try { lots = (await idbIA('lots', 'readonly', S => S.lots.getAll())) || []; ds = (await idbIA('demandes', 'readonly', S => S.demandes.getAll())) || []; } catch (_) { return; }
  lots.forEach(L => { const M = IA.lots.get(L.id); if (!M) IA.lots.set(L.id, { ...L }); else { delete M.ailleurs; if (L.total > M.total) { M.total = L.total; if (M.etat === 'fini') M.etat = 'actif'; } } });
  ds.filter(d => d.etat === 'attente' && !IA.file.some(x => x.id === d.id)).sort((a, b) => (a.cree || 0) - (b.cree || 0) || a.rang - b.rang)
    .forEach(d => IA.file.push({ id: d.id, lot: d.lot, rang: d.rang, genre: d.genre || '', etat: 'attente', essais: 0, apres: 0, messages: null, options: d.options || {}, direct: false }));
  const repris = [...IA.lots.values()].filter(L => L.etat === 'actif' && IA.file.some(d => d.lot === L.id));
  pomperIA();
  if (repris.length && peutTournerIA() && typeof dire === 'function') { const L = repris[0];
    dire('VOLTA reprend la lecture de « ' + L.titre + ' » où elle en était : ' + (L.faites + L.echecs) + ' sur ' + L.total + '.', false, { geste: 'Voir', faire: () => ficheIA() }); } }

/* ---- LA POMPE : tant qu'il y a de la place (une ou deux à la fois), la prochaine demande part ------------------------ */
const lotArreteIA = id => { const L = id && IA.lots.get(id); return !!(L && L.etat === 'arrete'); };
const peutTournerIA = () => iaPrete() && !IA.arret && !IA.bloque;
// retirer une demande de la file (jamais « la dernière » par mégarde : une demande absente ne retire rien)
const retirerIA = d => { const i = IA.file.indexOf(d); if (i >= 0) IA.file.splice(i, 1); };
function rejeterDirectesIA(err) { IA.file.filter(d => d.direct && d.etat === 'attente').forEach(d => { retirerIA(d); d.ko(err); }); }
function pomperIA() { clearTimeout(IA.reveil); IA.reveil = 0; const R = IA.reglage, now = Date.now();
  // une demande directe n'attend pas un réglage : coupée ou pas réglée, elle échoue tout de suite (une lecture, elle, attend)
  if (!iaPrete()) rejeterDirectesIA(!R.actif ? erreurIA('coupee', 'L’IA interne est coupée : rien ne part.') : erreurIA('reglage', 'L’IA interne n’est pas réglée (⋮ › Plus › IA interne).'));
  else if (IA.bloque) rejeterDirectesIA(erreurIA(IA.bloque.genre, IA.bloque.texte));
  if (!peutTournerIA()) { signalerIA(); return; }
  if (IA.pause > now) { IA.reveil = setTimeout(pomperIA, IA.pause - now + 20); signalerIA(); return; }
  const pret = d => d.etat === 'attente' && !lotArreteIA(d.lot);
  while (IA.actifs.size < R.parallele) { const prete = d => pret(d) && (d.apres || 0) <= now, d = IA.file.find(x => x.direct && prete(x)) || IA.file.find(prete); if (!d) break; lancerIA(d); }
  if (IA.actifs.size < R.parallele) { const t = IA.file.filter(pret).reduce((m, d) => Math.min(m, d.apres || 0), Infinity); if (t !== Infinity && t > now) IA.reveil = setTimeout(pomperIA, t - now + 20); }
  signalerIA(); }
async function lancerIA(d) { const ab = new AbortController(); d.etat = 'encours'; d.debut = Date.now(); IA.actifs.set(d.id, ab);
  try { let messages = d.messages;
    if (!messages) { const x = await idbIA('messages', 'readonly', S => S.messages.get(d.id)); if (!x) throw erreurIA('requete', 'Cette demande n’est plus gardée dans ce navigateur.'); messages = x.messages; }
    const rep = await repondreIA(messages, d.options, d.valider, ab.signal);
    IA.attend = null; IA.cadence.push(Date.now()); if (IA.cadence.length > 20) IA.cadence.shift();
    await finirDemandeIA(d, { texte: rep.texte, json: rep.json, modele: rep.modele, duree: Math.round(rep.duree), essais: d.essais + 1, redemande: !!rep.redemande }, null); }
  catch (e) { await echecIA(d, e); }
  finally { IA.actifs.delete(d.id); pomperIA(); } }
// l'attente avant une nouvelle tentative : 2, 4, 8, 16 s… jusqu'à une minute, à ±15 % (deux postes ne réessaient pas en même temps)
const attenteIA = n => Math.min(60000, IA.attenteBase * Math.pow(2, n - 1)) * (0.85 + Math.random() * 0.3);
async function echecIA(d, e) { const g = (e && e.genre) || 'requete';
  // l'arrêt du lecteur (ou l'interrupteur) : une lecture est rendue à la file, sans compter d'essai ; une demande directe, qu'on attend, le sait
  if (g === 'arret') { if (d.direct && (IA.arret || !iaPrete())) { retirerIA(d); d.ko(e); } else d.etat = 'attente'; return; }
  if (g === 'occupee') { d.etat = 'attente'; d.n429 = (d.n429 || 0) + 1;   // un 429 : TOUTE la file attend ce que l'IA demande
    IA.pause = Math.max(IA.pause, Date.now() + (e.attente > 0 ? e.attente + 250 : Math.min(60000, IA.attenteBase * 2.5 * Math.pow(2, d.n429 - 1)))); return; }
  if (['coupee', 'reglage', 'cle', 'modele', 'chemin'].includes(g)) {   // rien ne passera avant un nouveau réglage
    if (d.direct) { retirerIA(d); d.ko(e); } else d.etat = 'attente';
    IA.bloque = { genre: g, texte: e.message }; return; }
  if (['reseau', 'delai', 'panne', 'reponse'].includes(g)) { d.essais++; d.etat = 'attente';
    if (d.essais < IA.essaisMax) d.apres = Date.now() + attenteIA(d.essais);
    else { d.apres = Date.now() + 120000; if (!IA.attend) IA.attend = { depuis: Date.now(), texte: e.message }; }
    return; }
  // le reste (une demande refusée, trop longue, une image refusée, un JSON introuvable même redemandé) : elle échoue, les autres continuent
  await finirDemandeIA(d, null, { genre: g, texte: e.message, statut: e.statut || 0 }); }
async function finirDemandeIA(d, reponse, erreur) { retirerIA(d);
  if (d.direct) { if (erreur) d.ko(Object.assign(new Error(erreur.texte), erreur)); else d.ok(reponse); return; }
  // la lecture a été rangée pendant que la demande était en vol : rien à garder
  const L = IA.lots.get(d.lot); if (!L) return;
  if (erreur) L.echecs++; else L.faites++; if (L.faites + L.echecs >= L.total) { L.etat = 'fini'; L.fini = Date.now(); }
  if (L.memoire) L.resultats.set(d.rang, { rang: d.rang, etat: erreur ? 'echec' : 'faite', reponse, erreur });
  else try { const x = (await idbIA('demandes', 'readonly', S => S.demandes.get(d.id))) || { id: d.id, lot: d.lot, rang: d.rang, genre: d.genre };
    await idbIA(['lots', 'demandes', 'messages'], 'readwrite', S => { S.demandes.put({ ...x, etat: erreur ? 'echec' : 'faite', reponse, erreur, fini: Date.now() }); S.messages.delete(d.id); S.lots.put(lotPublicIA(L)); }); } catch (_) { }
  const fn = IA.traitants.get(d.genre); if (fn) try { fn({ lot: d.lot, rang: d.rang, reponse, erreur }); } catch (err) { setTimeout(() => { throw err; }); }
  if (L.etat === 'fini') window.dispatchEvent(new CustomEvent('ia-lot-fini', { detail: { lot: L.id } })); }
function arreterIA() { IA.arret = true; IA.lots.forEach(L => { if (L.etat === 'actif') L.etat = 'arrete'; });
  rejeterDirectesIA(erreurIA('arret', 'Les demandes à l’IA interne sont arrêtées.')); IA.actifs.forEach(ab => ab.abort()); IA.cadence = []; garderLotsIA(); pomperIA(); }
function reprendreIA() { IA.arret = false; IA.bloque = null; IA.attend = null; IA.pause = 0; IA.cadence = [];
  IA.lots.forEach(L => { if (L.etat === 'arrete') L.etat = 'actif'; }); IA.file.forEach(d => { d.apres = 0; }); garderLotsIA(); pomperIA(); }
function garderLotsIA() { const xs = [...IA.lots.values()].filter(L => !L.memoire); if (!xs.length) return; idbIA('lots', 'readwrite', S => { xs.forEach(L => S.lots.put(lotPublicIA(L))); }).catch(() => { }); }
// l'état de la file, en un mot, et l'avancement d'une lecture (ou de toutes) — le temps restant mesuré sur les dernières réponses
function etatFileIA() { const R = IA.reglage;
  if (!R.actif) return 'coupee'; if (!iaPrete()) return 'a-regler'; if (IA.bloque) return 'bloquee'; if (IA.arret) return 'arretee';
  if (IA.pause > Date.now()) return 'pause'; if (IA.attend) return 'attend'; return IA.actifs.size || IA.file.some(d => !lotArreteIA(d.lot)) ? 'en-cours' : 'repos'; }
function avancementIA(id) { const Ls = id ? [IA.lots.get(id)].filter(Boolean) : [...IA.lots.values()].filter(L => !L.ailleurs);
  const total = Ls.reduce((s, L) => s + L.total, 0), faites = Ls.reduce((s, L) => s + L.faites, 0), echecs = Ls.reduce((s, L) => s + L.echecs, 0);
  const ids = new Set(Ls.map(L => L.id)), enCours = IA.file.filter(d => d.etat === 'encours' && ids.has(d.lot)).length, aFaire = Math.max(0, total - faites - echecs);
  const C = IA.cadence, debit = C.length >= 3 ? (C.length - 1) / Math.max(1, C[C.length - 1] - C[0]) : 0, etat = etatFileIA();
  return { total, faites, echecs, enCours, aFaire, restant: aFaire && debit > 0 && (etat === 'en-cours') ? Math.round(aFaire / debit) : null, etat }; }
// chaque changement : l'événement, le mot du menu, la carte des lectures si le réglage est ouvert — au plus tous les 120 ms
// (un minuteur, pas une image d'animation : un onglet caché n'en peint aucune, et une lecture se fait souvent onglet caché)
function signalerIA() { if (IA.rendu) return; IA.rendu = setTimeout(() => { IA.rendu = 0;
  try { window.dispatchEvent(new CustomEvent('ia-avance', { detail: avancementIA() })); } catch (_) { }
  rendreMenuIA(); if (ficheIAOuverte()) { rendreTravailIA(); rendreEtatIA(); } }, 120); }

/* ---- TESTER LA CONNEXION : le diagnostic, une étape après l'autre --------------------------------------------------
   Chaque ligne : { k, etat ('ok' | 'ko' | 'att' | 'info' | 'encours'), titre, valeur, bulle, faire, geste ('adresse' |
   'cle' | 'modele' | 'cors'), choix (des modèles à choisir), image (le chiffre montré) }. Elles se rangent dans l'ordre
   des étapes ; la première qui échoue dit quoi faire, et la suite attend qu'elle soit réglée. */
const ORDRE_DIAG_IA = ['adresse', 'navigateur', 'cle', 'modele', 'repond', 'images', 'contexte'];
const PAGE_JETONS_IA = 700;   // une page de texte, en jetons (un jeton : environ trois quarts de mot)
const arrondiIA = x => { if (!(x > 0)) return 0; const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(x)) - 1)); return Math.round(x / p) * p; };
const pagesIA = j => Math.max(1, arrondiIA(j / PAGE_JETONS_IA));
const nombreIA = n => Number(n).toLocaleString('fr-FR');
const secondesIA = ms => { const s = ms / 1000; if (s < 1) return Math.max(1, Math.round(ms)) + ' ms'; if (s < 10) return String(Math.round(s * 10) / 10).replace('.', ',') + ' s'; if (s < 60) return Math.round(s) + ' s'; const m = Math.floor(s / 60); return m + ' min' + (Math.round(s % 60) ? ' ' + String(Math.round(s % 60)).padStart(2, '0') + ' s' : ''); };
const dureeIA = ms => { const m = Math.round(ms / 60000); if (m < 1) return 'moins d’une minute'; if (m < 60) return '≈ ' + m + ' min'; const h = Math.floor(m / 60); return '≈ ' + h + ' h' + (m % 60 ? ' ' + String(m % 60).padStart(2, '0') : ''); };
const courtIA = t => { const s = String(t || '').replace(/\s+/g, ' ').trim(); return s.length > 60 ? s.slice(0, 57) + '…' : s; };
function texteCorsIA(base) { return ['Bonjour,', '',
  'VOLTA, notre outil de câblage, est une page ouverte dans Chrome depuis un fichier (sans serveur). Il doit appeler l’IA interne à l’adresse ' + base + ', mais Chrome bloque ses réponses : il manque l’autorisation CORS (une page ouverte depuis un fichier a l’origine « null »).', '',
  'Pourriez-vous ajouter ces en-têtes aux réponses de ' + hoteIA(base) + ', y compris aux requêtes OPTIONS (le prévol) :',
  '  Access-Control-Allow-Origin: *   (ou : null)', '  Access-Control-Allow-Headers: Authorization, Content-Type', '  Access-Control-Allow-Methods: GET, POST, OPTIONS', '  Access-Control-Expose-Headers: Retry-After',
  '  et, si Chrome le demande au prévol : Access-Control-Allow-Private-Network: true', '', 'Merci !'].join('\n'); }
// ce qu'il faut faire, pour chaque refus — une phrase simple
function faireDeIA(e) { const g = e && e.genre, st = e && e.statut;
  return g === 'cle' ? (IA.reglage.cle ? 'L’IA refuse cette clé (erreur ' + st + '). Vérifiez-la — l’œil la montre — ou demandez-en une nouvelle à l’équipe de l’IA.' : 'L’IA demande une clé (erreur ' + st + ') : écrivez celle que l’équipe vous a remise.')
    : g === 'occupee' ? 'Elle reçoit trop de demandes en ce moment (erreur 429) : réessayez dans une minute. Pendant une lecture, VOLTA attend de lui-même ce qu’elle demande.'
    : g === 'panne' ? 'Elle est en panne de son côté (erreur ' + st + ') : réessayez plus tard ; si cela dure, prévenez l’équipe qui la gère.'
    : g === 'delai' ? 'Elle n’a pas répondu à temps : elle est peut-être surchargée. Réessayez plus tard.'
    : g === 'chemin' ? 'L’adresse répond, mais rien n’y attend les questions (erreur 404) : il lui manque peut-être /v1 à la fin.'
    : g === 'reponse' ? 'Elle a répondu, mais pas comme une IA de type OpenAI : vérifiez que l’adresse mène bien à son /v1.'
    : g === 'contexte' ? 'Elle trouve la question trop longue (erreur ' + st + ') : prévenez l’équipe de l’IA.'
    : 'Elle a refusé la question (erreur ' + (st || '?') + ')' + (e && e.detail ? ' : « ' + courtIA(e.detail) + ' »' : '') + '.'; }
const TITRES_KO_IA = { cle: 'Clé refusée', occupee: 'Occupée', panne: 'En panne de son côté', delai: 'Elle ne répond pas', chemin: 'Rien n’attend les questions', reponse: 'Une réponse illisible', contexte: 'Question jugée trop longue', requete: 'Question refusée', image: 'Question refusée' };
async function testerIA() { if (IA.test) { IA.test.ab.abort(); return; }
  const R = IA.reglage; if (!R.actif) return;
  const ab = new AbortController(), T = IA.test = { ab, lignes: [], debut: Date.now() }, s = { signal: ab.signal };
  const ligne = (k, etat, titre, o) => { const x = { k, etat, titre, ...(o || {}) }, i = T.lignes.findIndex(y => y.k === k); if (i >= 0) T.lignes[i] = x; else T.lignes.push(x);
    T.lignes.sort((a, b) => ORDRE_DIAG_IA.indexOf(a.k) - ORDRE_DIAG_IA.indexOf(b.k)); rendreDiagIA(); return x; };
  const fin = ok => { IA.diag = { date: Date.now(), ok, perime: false, lignes: T.lignes.filter(x => x.etat !== 'encours').map(x => ({ ...x, titre: masquerCleIA(x.titre), faire: x.faire ? masquerCleIA(x.faire) : '' })) };
    IA.test = null; garderMesureIA(); rendreDiagIA(); rendreEtatIA(); rendreMenuIA(); return ok; };
  rendreDiagIA(); rendreEtatIA();
  try {
    let base = adresseIA(R.adresse);
    if (!base) { ligne('adresse', 'ko', 'Pas d’adresse', { faire: 'Écrivez l’adresse de l’IA interne : l’équipe qui la gère vous la donne. Elle commence par http:// ou https:// et finit souvent par /v1.', geste: 'adresse' }); return fin(false); }
    if (!adresseValideIA(base)) { ligne('adresse', 'ko', 'Adresse incomplète', { faire: 'Elle doit commencer par http:// ou https:// — par exemple https://…/v1.', geste: 'adresse' }); return fin(false); }
    // 1. LA LISTE DES MODÈLES : l'adresse répond-elle, le navigateur accepte-t-il sa réponse, la clé passe-t-elle ?
    ligne('adresse', 'encours', 'L’adresse répond');
    let liste = null, v1 = false; const hote = () => hoteIA(base);
    try { liste = await appelIA(null, { liste: true, delai: 15000, ...s }); }
    catch (e) { if (e.genre === 'arret') throw e;
      if (e.genre === 'reseau' || e.genre === 'delai') {
        // rien ne revient : l'adresse est-elle injoignable, ou le navigateur bloque-t-il sa réponse (le CORS) ? La sonde le dit
        let joignable = false; try { await appelIA(null, { sonde: true, delai: 8000, ...s }); joignable = true; } catch (e2) { if (e2.genre === 'arret') throw e2; }
        if (!joignable) { ligne('adresse', 'ko', 'Adresse injoignable', { valeur: hote(), mono: true, faire: 'VOLTA n’atteint pas ' + hote() + ' : vérifiez l’adresse (une faute, http ou https, le port) et que ce PC est sur le réseau de l’entreprise. Pour trancher, ouvrez cette adresse suivie de /models dans Chrome : une page qui s’affiche, même « non autorisé », dit qu’elle est bonne.', geste: 'adresse' }); return fin(false); }
        ligne('adresse', 'ok', 'L’adresse répond', { valeur: hote(), mono: true });
        ligne('navigateur', 'ko', 'Refusée par le navigateur', { faire: 'L’IA répond, mais Chrome bloque sa réponse : VOLTA est une page ouverte depuis un fichier, d’origine « null », que l’IA n’autorise pas (le CORS). Demandez à l’équipe qui la gère d’autoriser l’origine null — ou d’envoyer Access-Control-Allow-Origin: * — avec les en-têtes Authorization et Content-Type.', geste: 'cors' }); return fin(false); }
      if (e.genre === 'cle') { ligne('adresse', 'ok', 'L’adresse répond', { valeur: hote(), mono: true }); ligne('navigateur', 'ok', 'Le navigateur accepte ses réponses');
        ligne('cle', 'ko', 'Clé refusée', { faire: faireDeIA(e), geste: 'cle' }); return fin(false); }
      if (e.genre === 'occupee' || e.genre === 'panne') { ligne('adresse', 'ok', 'L’adresse répond', { valeur: hote(), mono: true }); ligne('navigateur', 'ok', 'Le navigateur accepte ses réponses');
        ligne('repond', 'ko', TITRES_KO_IA[e.genre], { faire: faireDeIA(e) }); return fin(false); }
      // pas de liste à cette adresse (404) : il lui manque peut-être /v1 — VOLTA essaie, et le garde si c'est cela
      if (e.genre === 'chemin' && !/\/v\d+$/i.test(base)) { try { liste = await appelIA(null, { liste: true, adresse: base + '/v1', delai: 15000, ...s }); base = base + '/v1'; R.adresse = base; v1 = true; garderReglageIA(); remplirChampsIA(); } catch (e3) { if (e3.genre === 'arret') throw e3; } }
      // sinon, l'IA n'annonce pas ses modèles : la question dira le reste
    }
    ligne('adresse', 'ok', 'L’adresse répond', { valeur: hote(), mono: true, bulle: v1 ? 'VOLTA a ajouté /v1 à l’adresse : c’est là qu’elle répond.' : '' });
    ligne('navigateur', 'ok', 'Le navigateur accepte ses réponses');
    if (liste && R.cle) ligne('cle', 'ok', 'La clé est acceptée');
    // 2. LE MODÈLE : celui qui est écrit doit être annoncé ; pas écrit, VOLTA prend le seul annoncé, ou les propose
    const ids = liste ? liste.modeles.map(m => m.id) : [];
    if (!R.modele.trim()) {
      if (ids.length === 1) { R.modele = ids[0]; garderReglageIA(); remplirChampsIA(); }
      else if (ids.length > 1) { ligne('modele', 'att', 'Modèle à choisir', { faire: 'L’IA en annonce ' + ids.length + ' : choisissez celui que l’équipe vous a indiqué.', choix: ids.slice(0, 12) }); return fin(false); }
      else { ligne('modele', 'ko', 'Pas de modèle', { faire: 'Écrivez le nom du modèle, tel que l’équipe de l’IA le donne.', geste: 'modele' }); return fin(false); }
    } else if (ids.length && !ids.includes(R.modele.trim())) {
      ligne('modele', 'ko', 'Modèle inconnu', { faire: 'L’IA ne connaît pas « ' + R.modele.trim() + ' ». Choisissez l’un de ceux qu’elle annonce :', choix: ids.slice(0, 12) }); return fin(false); }
    // 3. UNE PETITE QUESTION : elle répond, en combien de temps, et en JSON propre ?
    ligne('repond', 'encours', 'Elle répond');
    let rep;
    try { rep = await appelIA([{ role: 'user', content: 'Réponds seulement par ce JSON, sans rien autour : {"volta":"ok"}' }], { maxJetons: 24, delai: 60000, ...s }); }
    catch (e) { if (e.genre === 'arret') throw e;
      if (e.genre === 'cle') { T.lignes = T.lignes.filter(x => x.k !== 'repond'); ligne('cle', 'ko', 'Clé refusée', { faire: faireDeIA(e), geste: 'cle' }); return fin(false); }
      if (e.genre === 'modele') { T.lignes = T.lignes.filter(x => x.k !== 'repond'); ligne('modele', 'ko', 'Modèle inconnu', { faire: 'L’IA ne connaît pas « ' + R.modele.trim() + ' ».' + (ids.length ? ' Choisissez l’un de ceux qu’elle annonce :' : ' Vérifiez son nom auprès de l’équipe de l’IA : une majuscule, un tiret ou une version qui diffère suffit.'), choix: ids.slice(0, 12), geste: ids.length ? '' : 'modele' }); return fin(false); }
      if (e.genre === 'reseau') { T.lignes = T.lignes.filter(x => x.k !== 'repond'); ligne('navigateur', 'ko', 'Refusée par le navigateur', { faire: 'Chrome laisse passer la liste des modèles, mais bloque les questions : l’IA n’autorise pas l’envoi depuis une page d’origine « null » (le CORS, au prévol). Demandez à l’équipe qui la gère d’accepter les en-têtes Authorization et Content-Type, et la méthode POST, pour l’origine null ou « * ».', geste: 'cors' }); return fin(false); }
      ligne('repond', 'ko', TITRES_KO_IA[e.genre] || 'Elle ne répond pas', { faire: faireDeIA(e) }); return fin(false); }
    if (!(liste && R.cle)) ligne('cle', 'ok', R.cle ? 'La clé est acceptée' : 'Elle ne demande pas de clé');
    ligne('modele', 'ok', 'Le modèle est connu', { valeur: rep.modele, mono: true });
    const json = jsonDansTexteIA(rep.texte).ok;
    ligne('repond', 'ok', 'Elle répond', { valeur: 'en ' + secondesIA(rep.duree), bulle: 'Le temps d’une question d’une ligne' + (json ? ', à laquelle elle a répondu en JSON propre' : ' — elle n’a pas rendu le JSON demandé : VOLTA le redemandera quand il le faudra') + '. Une page de schéma prendra davantage.' });
    // 4. LES IMAGES : un chiffre dessiné, qu'elle doit lire — puis un second, pour ne pas croire un modèle qui devine
    ligne('images', 'encours', 'Voit-elle les images ?');
    const V = await essaiImagesIA(s);
    if (V.vision) ligne('images', 'ok', 'Elle voit les images', { image: V.image, valeur: '« ' + V.repondu + ' »', bulle: 'VOLTA lui a montré deux chiffres dessinés, l’un après l’autre : elle les a lus tous les deux. Il pourra lui montrer les pages scannées.' });
    else if (V.vision === false) { const dit = V.repondu ? V.repondu.replace(/[.\s]+$/, '') : '';
      ligne('images', 'info', 'Elle ne voit pas les images', { image: V.image, valeur: V.refus ? 'refusée' : '« ' + (dit.length > 26 ? dit.slice(0, 25) + '…' : dit) + ' »', bulle: V.refus ? '' : 'VOLTA lui a montré un ' + V.montre + ' ; elle a répondu « ' + dit + ' ».',
        faire: V.refus ? 'Ce modèle refuse les images : VOLTA ne lui enverra que du texte.' : 'Elle n’a pas lu le chiffre montré : VOLTA ne lui enverra que du texte.' }); }
    else ligne('images', 'att', 'Les images n’ont pas pu être essayées', { faire: V.erreur || 'Réessayez plus tard.' });
    // 5. CE QU'ELLE LIT D'UN COUP : annoncé par la liste, sinon un essai prudent
    ligne('contexte', 'encours', 'Ce qu’elle lit d’un coup');
    const C = await contexteIA(liste, rep.modele, s);
    ligne('contexte', C.sur === 'inconnu' ? 'att' : 'info', 'Ce qu’elle lit d’un coup', C.ligne);
    IA.capacites = { date: Date.now(), modele: rep.modele, latence: Math.round(rep.duree), vision: V.vision, contexte: C.jetons, contexteSur: C.sur, json };
    fin(true);
    if (typeof dire === 'function') dire('L’IA interne répond en ' + secondesIA(rep.duree) + (V.vision ? ' et voit les images.' : V.vision === false ? ' ; elle ne voit pas les images.' : '.'));
  } catch (e) {
    if (e && e.genre === 'arret') { IA.test = null; rendreDiagIA(); rendreEtatIA(); if (typeof dire === 'function') dire('Test arrêté.'); return false; }
    T.lignes = T.lignes.filter(x => x.etat !== 'encours'); ligne('repond', 'ko', 'Le test n’a pas abouti', { faire: masquerCleIA((e && e.message) || String(e)) }); return fin(false); } }
async function essaiImagesIA(s) { const q = img => appelIA([{ role: 'user', content: [{ type: 'text', text: 'Quel chiffre est dessiné sur cette image ? Réponds par ce seul chiffre.' }, partieImageIA(img)] }], { maxJetons: 12, delai: 90000, ...s });
  const d1 = chiffreAuHasardIA(), img1 = await imageChiffreIA(d1); let r1;
  try { r1 = await q(img1); } catch (e) { if (e.genre === 'arret') throw e;
    if (['image', 'requete', 'contexte'].includes(e.genre)) return { vision: false, refus: true, montre: d1, image: img1 };
    return { vision: null, montre: d1, image: img1, erreur: e.message }; }
  if (chiffreLuIA(r1.texte) !== d1) return { vision: false, montre: d1, image: img1, repondu: courtIA(r1.texte) || '(rien)' };
  let d2 = chiffreAuHasardIA(); while (d2 === d1) d2 = chiffreAuHasardIA(); const img2 = await imageChiffreIA(d2); let r2;
  try { r2 = await q(img2); } catch (e) { if (e.genre === 'arret') throw e; return { vision: null, montre: d2, image: img2, erreur: e.message }; }
  return { vision: chiffreLuIA(r2.texte) === d2, montre: d2, image: img2, repondu: courtIA(r2.texte) || '(rien)' }; }
// un texte neutre (le câblage, rien de vrai) pour l'essai prudent : environ 6 000 jetons
const remplissageIA = n => { const p = 'Le câble relie la borne A du connecteur au module B de la barrette, puis repart vers le disjoncteur du tableau. '; return p.repeat(Math.ceil(n / p.length)).slice(0, n); };
async function contexteIA(liste, modele, s) { const m = liste && liste.modeles.find(x => x.id === modele), annonce = m && m.contexte;
  const ligne = (jetons, sur, valeur, bulle) => ({ jetons, sur, ligne: { valeur, bulle } });
  if (annonce) return ligne(annonce, 'annonce', '≈ ' + pagesIA(annonce) + ' pages de texte', 'Annoncé par l’IA : ' + nombreIA(annonce) + ' jetons, environ ' + pagesIA(annonce) + ' pages de texte (un jeton, c’est environ trois quarts de mot). VOLTA coupera les gros documents à cette taille.');
  const texte = remplissageIA(24000), estime = Math.round(texte.length / 4);
  try { const r = await appelIA([{ role: 'user', content: texte + '\n\nRéponds seulement : OK' }], { maxJetons: 4, delai: 120000, ...s }), n = (r.usage && r.usage.prompt_tokens) || estime;
    return ligne(n, 'essai', 'au moins ≈ ' + pagesIA(n) + ' pages', 'VOLTA lui a envoyé ' + nombreIA(n) + ' jetons (environ ' + pagesIA(n) + ' pages de texte) : elle les a lus. L’essai s’arrête là, par prudence : elle en lit peut-être bien plus.'); }
  catch (e) { if (e.genre === 'arret') throw e;
    if (e.genre === 'contexte' && e.limite) return ligne(e.limite, 'limite', '≈ ' + pagesIA(e.limite) + ' pages de texte', 'Sa limite : ' + nombreIA(e.limite) + ' jetons, environ ' + pagesIA(e.limite) + ' pages de texte — elle l’a dit en refusant un essai plus long. VOLTA lui enverra des morceaux qui y tiennent.');
    if (e.genre === 'contexte' || e.genre === 'requete') return ligne(null, 'moins', 'moins de ≈ ' + pagesIA(estime) + ' pages', 'Elle a refusé un essai de ' + nombreIA(estime) + ' jetons (environ ' + pagesIA(estime) + ' pages de texte) : VOLTA lui enverra des morceaux plus courts.');
    return { jetons: null, sur: 'inconnu', ligne: { valeur: 'pas mesuré', faire: 'L’essai n’a pas abouti : ' + e.message } }; } }

/* ---- LE DOCUMENT « IA interne » : un réglage, dans la langue des Hypothèses et de « Vos fichiers » ------------------- */
const ficheIAOuverte = () => !!(typeof app !== 'undefined' && app.fiche && app.fiche.mode === 'ia' && $('fiche') && !$('fiche').hidden);
const mouvementIA = () => !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
const SVG_IA = { ok: '<path d="m7.6 12.4 2.9 2.9 5.9-6.3"/>', ko: '<path d="m8.8 8.8 6.4 6.4M15.2 8.8l-6.4 6.4"/>', att: '<path d="M12 7.6v5.6M12 16.3v.1"/>', info: '<path d="M12 11v5.2M12 7.7v.1"/>',
  oeil: '<path d="M2.6 12S6.1 5.6 12 5.6 21.4 12 21.4 12 17.9 18.4 12 18.4 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="2.8"/>', oeilBarre: '<path d="M2.6 12S6.1 5.6 12 5.6 21.4 12 21.4 12 17.9 18.4 12 18.4 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="2.8"/><path d="M4.5 4.5l15 15"/>',
  copier: '<rect x="8.5" y="8.5" width="11" height="12" rx="2"/><path d="M5.5 15.5V5.5a1 1 0 0 1 1-1h9"/>', crayon: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/>' };
const svgIA = (k, cls) => `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${SVG_IA[k]}</svg>`;
const ilYaIA = t => { const d = Date.now() - t; if (d < 60000) return 'à l’instant'; if (d < 3600000) return 'il y a ' + Math.round(d / 60000) + ' min';
  const x = new Date(t), h = x.getHours() + ' h ' + String(x.getMinutes()).padStart(2, '0'); return new Date().toDateString() === x.toDateString() ? 'aujourd’hui à ' + h : 'le ' + x.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' à ' + h; };
const typoIA = t => typeof typo === 'function' ? typo(t) : t;
function ficheIA() { const deja = ficheIAOuverte(), y = deja ? $('fiche-corps').scrollTop : 0;
  ouvrirFiche({ mode: 'ia', large: true }, corpsIA(), piedIA()); remplirChampsIA(); lierFicheIA(); rendreEtatIA();
  if (deja) $('fiche-corps').scrollTop = y; }
function corpsIA() { const R = IA.reglage;
  const champ = (k, lib, type, ph, aide, extra) => `<label class="ia-lib" for="ia-${k}">${lib}</label><span class="ia-saisie${extra ? ' ia-cle' : ''}"><input id="ia-${k}" type="${type}" placeholder="${escA(ph)}" autocomplete="off" autocapitalize="off" spellcheck="false"${k === 'adresse' ? ' inputmode="url"' : ''}>${extra || ''}</span>${aide ? `<p class="ia-aide" id="ia-${k}-aide">${aide}</p>` : ''}`;
  return tete('Réglages', 'IA interne')
    + '<p class="note ia-chapeau">Quand VOLTA ne comprend pas seul un document à lire — un schéma PDF, un Visio, un gros document —, il en envoie <b>des morceaux</b> à l’IA interne de votre entreprise, et rien d’autre.</p>'
    + `<section class="hy-groupe ia-bloc" id="ia-connexion" aria-labelledby="ia-t-connexion"><h3 class="hy-titre" id="ia-t-connexion">La connexion</h3>`
    + `<label class="ia-inter" for="ia-actif"><span class="ia-inter-t"><b>VOLTA peut l’appeler</b><small id="ia-actif-s"></small></span><input id="ia-actif" type="checkbox" role="switch"${R.actif ? ' checked' : ''} aria-describedby="ia-actif-s"></label>`
    + `<div class="ia-champs">`
    + champ('adresse', 'Adresse', 'url', 'https://…/v1', 'Celle que donne l’équipe de l’IA ; elle finit souvent par /v1.')
    + champ('modele', 'Modèle', 'text', 'Son nom, tel que l’équipe le donne', '')
    + champ('cle', 'Clé', 'password', 'La clé remise par l’équipe', 'Les trois restent dans ce navigateur, dans aucun export.', `<button type="button" class="ia-oeil" id="ia-oeil" aria-pressed="false" aria-label="Montrer la clé" data-bulle="Montrer la clé">${svgIA('oeil')}</button>`)
    + `</div><div class="ia-actions"><button type="button" class="btn cuivre" id="ia-tester"><span class="ia-tourne" aria-hidden="true"></span><span class="ia-tester-mot">Tester la connexion</span></button></div></section>`
    + diagHtmlIA() + travailHtmlIA(); }
const piedIA = () => `<span class="hy-etat ia-etat" id="ia-etat"></span><span class="espace"></span><button type="button" class="btn lien" id="ia-oublier">Oublier ces réglages</button>`;
// les champs reçoivent leur valeur par PROPRIÉTÉ : la clé n'est jamais un attribut (elle ne se lirait pas dans le HTML de la page)
function remplirChampsIA() { if (!ficheIAOuverte()) return; const R = IA.reglage;
  ['adresse', 'modele', 'cle'].forEach(k => { const el = $('ia-' + k); if (el && document.activeElement !== el && el.value !== R[k]) el.value = R[k]; });
  const a = $('ia-actif'); if (a) a.checked = R.actif; }
function diagHtmlIA() { const T = IA.test, D = T ? { lignes: T.lignes, encours: true } : IA.diag; if (!D || !D.lignes || !D.lignes.length) return '<section class="hy-groupe ia-bloc ia-diag" id="ia-diag" hidden></section>';
  const ko = D.lignes.find(x => x.etat === 'ko' || (x.etat === 'att' && x.choix)), perime = !T && D.perime;
  const quand = T ? 'en cours' : perime ? 'les réglages ont changé : à refaire' : ilYaIA(D.date);
  // pendant le test, une étape neuve entre en scène (« vif ») ; celle qui change d'état trace sa coche (« frais ») ; les autres restent posées
  const vues = T ? (T.vues || (T.vues = new Map())) : null;
  const anim = x => { if (!vues) return ''; const avant = vues.get(x.k); vues.set(x.k, x.etat); return avant === undefined ? ' vif frais' : avant !== x.etat ? ' frais' : ''; };
  const lignes = D.lignes.map(x => ligneDiagIA(x, anim(x))).join('');
  return `<section class="hy-groupe ia-bloc ia-diag${perime ? ' perime' : ''}" id="ia-diag" aria-labelledby="ia-t-diag"><h3 class="hy-titre" id="ia-t-diag">Le diagnostic<small>${esc(quand)}</small></h3>`
    + `<ol class="ia-etapes" aria-live="polite">${lignes}</ol>${ko && !T ? '<p class="ia-suite">La suite se teste quand ce point est réglé.</p>' : ''}</section>`; }
function ligneDiagIA(x, anim) { const etat = x.etat || 'info', pt = etat === 'encours' ? '<span class="ia-tourne"></span>' : svgIA(etat === 'ko' ? 'ko' : etat === 'att' ? 'att' : etat === 'info' ? 'info' : 'ok');
  // l'image montrée, puis ce qu'elle a répondu : le test se lit d'un coup d'œil
  const img = x.image ? `<img class="ia-vu" src="${escA(x.image)}" alt="Le chiffre montré à l’IA" width="22" height="22"><span class="ia-fl" aria-hidden="true">→</span>` : '';
  const valeur = x.valeur || img ? `<span class="ia-e-v">${img}${x.valeur ? `<span class="${x.mono ? 'ia-mono' : ''}">${esc(x.valeur)}</span>` : ''}</span>` : '';
  const geste = x.geste === 'cors' ? `<button type="button" class="btn papier dense" data-ia-geste="cors">${svgIA('copier')}Copier la demande pour l’équipe de l’IA</button>`
    : x.geste === 'cle' ? `<button type="button" class="btn papier dense" data-ia-geste="cle">${svgIA('crayon')}Corriger la clé</button>`
    : x.geste === 'adresse' ? `<button type="button" class="btn papier dense" data-ia-geste="adresse">${svgIA('crayon')}Corriger l’adresse</button>`
    : x.geste === 'modele' ? `<button type="button" class="btn papier dense" data-ia-geste="modele">${svgIA('crayon')}Écrire le modèle</button>` : '';
  const choix = x.choix && x.choix.length ? `<span class="ia-choix">${x.choix.map(id => `<button type="button" class="ia-puce" data-ia-modele="${escA(id)}">${esc(id)}</button>`).join('')}</span>` : '';
  const faire = x.faire || geste || choix ? `<div class="ia-faire">${x.faire ? `<p>${esc(x.faire)}</p>` : ''}${choix}${geste ? `<span class="ia-gestes">${geste}</span>` : ''}</div>` : '';
  const bulle = x.bulle ? ` data-bulle="${escA(typoIA(x.bulle))}"` : '';
  return `<li class="ia-e ${etat}${anim || ''}" data-k="${escA(x.k)}"><span class="ia-pt" aria-hidden="true">${pt}</span><span class="ia-e-t"${bulle}${x.bulle ? ' tabindex="0"' : ''}>${esc(x.titre)}</span>${valeur}${faire}</li>`; }
function travailHtmlIA() { const Ls = [...IA.lots.values()].sort((a, b) => b.cree - a.cree); if (!Ls.length) return '<section class="hy-groupe ia-bloc ia-travail" id="ia-travail" hidden></section>';
  const etat = etatFileIA(), A = avancementIA(), R = IA.reglage;
  const MOTS = { coupee: 'L’IA interne est coupée : les lectures attendent qu’on la rallume.', 'a-regler': 'L’IA interne n’est pas réglée : les lectures attendent.',
    bloquee: IA.bloque ? IA.bloque.texte + ' Les lectures attendent : corrigez le réglage plus haut, elles reprendront d’elles-mêmes.' : '', arretee: 'Arrêtées : rien ne part tant que vous ne reprenez pas.',
    pause: 'L’IA interne demande d’attendre (erreur 429) : VOLTA attend ce qu’elle dit, puis reprend.',
    attend: IA.attend ? 'L’IA ne répond plus depuis ' + dureeIA(Date.now() - IA.attend.depuis).replace('≈ ', '') + ' : VOLTA réessaie toutes les deux minutes.' : '' };
  const mot = MOTS[etat] ? `<p class="ia-file-mot${['bloquee', 'attend', 'pause'].includes(etat) ? ' att' : ''}">${esc(MOTS[etat])}</p>` : '';
  const lot = L => { const fait = L.faites + L.echecs, p = L.total ? Math.round(100 * fait / L.total) : 0, a = avancementIA(L.id), vif = L.etat === 'actif' && etat === 'en-cours';
    // ce qui reste, honnête : mesuré sur les dernières réponses, sinon dit tel quel ; l'arrêt se dit une fois (en tête, s'il vaut pour toutes)
    const reste = L.ailleurs ? 'elle avance dans un autre onglet de VOLTA' : L.etat === 'fini' ? 'finie ' + ilYaIA(L.fini || Date.now()) : a.restant != null ? 'reste ' + dureeIA(a.restant) : L.etat === 'arrete' && etat !== 'arretee' ? 'arrêtée' : vif ? 'le temps restant se mesure sur les premières réponses' : '';
    const pied = reste || L.echecs || L.etat === 'fini' ? `<div class="ia-lot-c"><span>${esc(reste)}</span>${L.echecs ? `<span class="ia-lot-ko">${L.echecs} en échec</span>` : ''}${L.etat === 'fini' ? `<button type="button" class="btn lien dense" data-ia-lot-oublier="${escA(L.id)}">Ranger</button>` : ''}</div>` : '';
    return `<div class="ia-lot${vif ? ' vif' : ''}" data-lot="${escA(L.id)}"><div class="ia-lot-t"><b>${esc(L.titre)}</b><span class="ia-lot-n"><b>${fait}</b> sur ${L.total}</span></div>`
      + `<div class="ia-barre" role="progressbar" aria-label="${escA(L.titre)}" aria-valuemin="0" aria-valuemax="${L.total}" aria-valuenow="${fait}"><i style="width:${p}%"></i></div>${pied}</div>`; };
  const enCours = Ls.some(L => L.etat !== 'fini');
  const gestes = enCours ? (etat === 'arretee' || etat === 'bloquee' ? '<button type="button" class="btn papier dense" data-ia-file="reprendre">Reprendre</button>' : '<button type="button" class="btn papier dense" data-ia-file="arreter">Arrêter</button>') : '';
  const par = `<span class="ia-par" role="group" aria-label="Demandes à la fois" data-bulle="${escA(typoIA('Combien de demandes partent ensemble : deux vont presque deux fois plus vite, si l’IA interne le supporte (elle dit « occupée » sinon, et VOLTA attend).'))}">${[1, 2].map(n => `<button type="button" data-ia-par="${n}" aria-pressed="${R.parallele === n}">${n}</button>`).join('')}</span><span class="ia-par-mot">à la fois</span>`;
  return `<section class="hy-groupe ia-bloc ia-travail" id="ia-travail" aria-labelledby="ia-t-travail"><h3 class="hy-titre" id="ia-t-travail">Les lectures en fond<small>${A.enCours ? A.enCours + ' en cours' : ''}</small></h3>${mot}${Ls.map(lot).join('')}<div class="ia-file-gestes">${par}<span class="espace"></span>${gestes}</div></section>`; }
// une partie du document se refait sur place — jamais les champs, où l'on écrit peut-être
function remplacerIA(id, html) { const el = $(id); if (!el) return; const t = document.createElement('template'); t.innerHTML = html; const n = t.content.firstElementChild; if (n) el.replaceWith(n); }
// plusieurs étapes qui changent dans le même instant font UN rendu (sinon celui qui traçait une coche serait remplacé avant d'être peint)
function rendreDiagIA() { if (IA.diagT) return; IA.diagT = true;
  queueMicrotask(() => { IA.diagT = false; if (!ficheIAOuverte()) return; remplacerIA('ia-diag', diagHtmlIA()); rendreBoutonIA(); if (IA.test) suivreDiagIA(); }); }
// pendant le test, la dernière étape reste sous les yeux : le document descend avec elle, sans jamais cacher le haut du diagnostic
function suivreDiagIA() { const c = $('fiche-corps'), d = $('ia-diag'); if (!c || !d || d.hidden) return;
  const t = c.querySelector('.fiche-tete'), haut = (t && getComputedStyle(t).position === 'sticky' ? t.offsetHeight : 0) + 8;
  const rc = c.getBoundingClientRect(), rd = d.getBoundingClientRect(), dy = Math.min(rd.bottom - rc.bottom + 16, rd.top - rc.top - haut);
  if (dy > 2) c.scrollBy({ top: dy, behavior: mouvementIA() ? 'smooth' : 'auto' }); }
/* La carte des lectures : quand rien d'autre que les chiffres n'a changé (les mêmes lectures, le même mot, les mêmes gestes),
   elle se met à jour SUR PLACE — la barre glisse jusqu'à sa nouvelle longueur, son reflet continue de couler, le clavier
   reste où il est ; sinon elle se refait. */
const squeletteIA = s => [...s.querySelectorAll('.ia-lot[data-lot], .ia-file-mot, .ia-lot-c, .ia-lot-ko, [data-ia-file], [data-ia-lot-oublier], [data-ia-par]')]
  .map(e => e.dataset.lot || (e.className + ':' + (e.dataset.iaFile || e.dataset.iaPar || '') + ':' + (e.classList.contains('ia-file-mot') ? e.textContent : '') + ':' + (e.getAttribute('aria-pressed') || ''))).join('|');
function rendreTravailIA() { if (!ficheIAOuverte()) return; const el = $('ia-travail'); if (!el) return;
  const t = document.createElement('template'); t.innerHTML = travailHtmlIA(); const n = t.content.firstElementChild; if (!n) return;
  if (!el.hidden && !n.hidden && squeletteIA(el) === squeletteIA(n)) {
    const s = el.querySelector('.hy-titre small'), s2 = n.querySelector('.hy-titre small'); if (s && s2 && s.textContent !== s2.textContent) s.textContent = s2.textContent;
    n.querySelectorAll('.ia-lot[data-lot]').forEach(L => { const M = el.querySelector(`.ia-lot[data-lot="${CSS.escape(L.dataset.lot)}"]`); if (!M) return;
      if (M.className !== L.className) M.className = L.className;
      const c = M.querySelector('.ia-lot-n'), c2 = L.querySelector('.ia-lot-n'); if (c && c2 && c.innerHTML !== c2.innerHTML) c.innerHTML = c2.innerHTML;
      const b = M.querySelector('.ia-barre'), b2 = L.querySelector('.ia-barre'); if (b && b2) { b.setAttribute('aria-valuenow', b2.getAttribute('aria-valuenow')); b.firstElementChild.style.width = b2.firstElementChild.style.width; }
      const r = M.querySelector('.ia-lot-c > span'), r2 = L.querySelector('.ia-lot-c > span'); if (r && r2 && r.textContent !== r2.textContent) r.textContent = r2.textContent;
      const k = M.querySelector('.ia-lot-ko'), k2 = L.querySelector('.ia-lot-ko'); if (k && k2 && k.textContent !== k2.textContent) k.textContent = k2.textContent; });
    return; }
  const a = document.activeElement, sur = a && a.closest && a.closest('#ia-travail') ? (a.dataset.iaFile ? '[data-ia-file]' : a.dataset.iaPar ? `[data-ia-par="${a.dataset.iaPar}"]` : '') : '';
  el.replaceWith(n); if (sur) { const b = document.querySelector('#ia-travail ' + sur); if (b) b.focus({ preventScroll: true }); } }
function rendreBoutonIA() { const b = $('ia-tester'); if (!b) return; const R = IA.reglage, enCours = !!IA.test;
  b.classList.toggle('teste', enCours); b.disabled = !R.actif && !enCours; b.querySelector('.ia-tester-mot').textContent = enCours ? 'Arrêter le test' : 'Tester la connexion';
  if (!R.actif) b.dataset.bulle = 'L’IA interne est coupée : rien ne part.'; else delete b.dataset.bulle; }
// l'état en un mot : le pied du document, le sous-titre de l'interrupteur, le bouton, le mot du menu
function etatIA() { const R = IA.reglage, D = IA.diag, A = avancementIA(), f = etatFileIA();
  if (!R.actif) return { c: 'coupee', mot: 'Coupée : rien ne part', menu: 'coupée' };
  if (!adresseValideIA(adresseIA(R.adresse))) return { c: 'att', mot: 'À régler : son adresse', menu: 'à régler' };
  if (IA.test) return { c: 'test', mot: 'Test en cours', menu: 'test en cours' };
  if (f === 'bloquee') return { c: 'ko', mot: 'Arrêtée : ' + (IA.bloque.genre === 'cle' ? 'la clé est refusée' : IA.bloque.genre === 'modele' ? 'le modèle est inconnu' : 'à régler'), menu: 'à revoir' };
  if (!R.modele.trim()) return { c: 'att', mot: 'À régler : son modèle', menu: 'à régler' };
  // une lecture en cours dit où elle en est : qu'elle avance prouve la connexion mieux qu'un test
  const n = A.faites + A.echecs, compte = n + ' sur ' + A.total;
  if (A.total && n < A.total) return f === 'arretee' ? { c: 'att', mot: 'Lecture arrêtée : ' + compte, menu: 'lecture arrêtée' }
    : f === 'attend' ? { c: 'att', mot: 'L’IA ne répond plus : ' + compte, menu: 'attend l’IA' } : f === 'pause' ? { c: 'att', mot: 'Occupée : VOLTA attend · ' + compte, menu: 'lit en fond : ' + compte }
    : { c: 'ok', mot: 'Lit en fond : ' + compte, menu: 'lit en fond : ' + compte };
  if (!D || D.perime) return { c: 'att', mot: 'À tester', menu: 'à tester' };
  if (!D.ok) { const k = D.lignes.find(x => x.etat === 'ko' || x.etat === 'att'); return { c: 'ko', mot: 'À revoir : ' + (k ? k.titre.charAt(0).toLowerCase() + k.titre.slice(1) : 'le dernier test'), menu: 'à revoir' }; }
  const C = IA.capacites || {}; return { c: 'ok', mot: 'Prête · ' + (C.vision ? 'voit les images' : 'texte seul'), menu: 'prête' }; }
function rendreEtatIA() { if (!ficheIAOuverte()) return; const E = etatIA(), R = IA.reglage, el = $('ia-etat');
  if (el) { el.className = 'hy-etat ia-etat e-' + E.c; el.textContent = E.mot; }
  const s = $('ia-actif-s'); if (s) s.textContent = R.actif ? 'De lui-même, quand il bloque sur un document.' : 'Coupée : rien ne part, VOLTA lit seul.';
  const c = $('ia-connexion'); if (c) c.classList.toggle('coupee', !R.actif);
  const o = $('ia-oublier'); if (o) o.disabled = !(R.adresse || R.modele || R.cle || IA.diag);
  rendreBoutonIA(); }
function rendreMenuIA() { const el = typeof document !== 'undefined' && document.getElementById('mn-ia'); if (!el) return; const m = etatIA().menu; if (el.textContent !== m) el.textContent = m; }
// un réglage a changé : gardé ; le diagnostic d'avant ne vaut plus ; ce qui bloquait la file peut repartir
function reglageChangeIA(k) { const R = IA.reglage; garderReglageIA();
  if (['adresse', 'modele', 'cle'].includes(k) && IA.diag && !IA.diag.perime) { IA.diag.perime = true; garderMesureIA(); rendreDiagIA(); }
  if (k !== 'parallele') { IA.bloque = null; IA.attend = null; }
  if (k === 'actif' && !R.actif) { if (IA.test) IA.test.ab.abort(); IA.actifs.forEach(ab => ab.abort()); }
  pomperIA(); rendreEtatIA(); rendreMenuIA(); }
function copierIA(texte, fini) { const repli = () => { const a = document.createElement('textarea'); a.value = texte; a.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(a); a.select(); let r = false; try { r = document.execCommand('copy'); } catch (_) { } a.remove(); fini(r); };
  try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texte).then(() => fini(true), repli); else repli(); } catch (_) { repli(); } }
function oublierReglageIA() { const avant = { reglage: { ...IA.reglage }, capacites: IA.capacites, diag: IA.diag };
  IA.reglage = { ...REGLAGE_IA_VIDE, actif: IA.reglage.actif, parallele: IA.reglage.parallele }; IA.capacites = null; IA.diag = null; if (IA.test) IA.test.ab.abort();
  garderReglageIA(); garderMesureIA(); reglageChangeIA('cle'); if (ficheIAOuverte()) { ficheIA(); }
  if (typeof dire === 'function') dire('Les réglages de l’IA interne sont oubliés.', false, { geste: 'Rétablir', faire: () => { IA.reglage = avant.reglage; IA.capacites = avant.capacites; IA.diag = avant.diag; garderReglageIA(); garderMesureIA(); reglageChangeIA('parallele'); if (ficheIAOuverte()) ficheIA(); } }); }
/* Les gestes du document : posés une fois sur la coquille (son corps se refait), ils ne répondent que quand le document
   « IA interne » est ouvert. */
function lierFicheIA() { if (IA.lie) return; IA.lie = true; const c = $('fiche-corps'), p = $('fiche-pied'), ici = () => ficheIAOuverte();
  let garde = 0;
  c.addEventListener('input', e => { if (!ici()) return; const el = e.target, k = el && el.id && /^ia-(adresse|modele|cle)$/.test(el.id) ? el.id.slice(3) : '';
    if (!k) return; IA.reglage[k] = k === 'cle' ? el.value.trim().replace(/^Bearer\s+/i, '') : el.value; clearTimeout(garde); garde = setTimeout(() => reglageChangeIA(k), 250); IA.bloque = null; rendreEtatIA(); });
  c.addEventListener('change', e => { if (!ici()) return; const el = e.target;
    if (el.id === 'ia-actif') { IA.reglage.actif = el.checked; reglageChangeIA('actif'); return; }
    if (el.id === 'ia-adresse') { const brute = el.value.trim(), net = adresseIA(brute); IA.reglage.adresse = net; if (net !== brute) { el.value = net; const a = $('ia-adresse-aide');
        if (a && /\/(chat\/completions|completions|models)\/?$/i.test(brute)) { a.textContent = 'VOLTA garde l’adresse de base : il ajoute lui-même la fin.'; a.classList.add('dit'); setTimeout(() => { if (a.isConnected) { a.textContent = 'Celle que donne l’équipe de l’IA ; elle finit souvent par /v1.'; a.classList.remove('dit'); } }, 4000); } }
      clearTimeout(garde); reglageChangeIA('adresse'); }
    if (el.id === 'ia-modele') { IA.reglage.modele = el.value.trim(); el.value = IA.reglage.modele; clearTimeout(garde); reglageChangeIA('modele'); } });
  c.addEventListener('keydown', e => { if (!ici() || e.key !== 'Enter') return; const el = e.target; if (el && /^ia-(adresse|modele|cle)$/.test(el.id || '')) { e.preventDefault(); el.dispatchEvent(new Event('change', { bubbles: true })); testerIA(); } });
  c.addEventListener('click', e => { if (!ici()) return; const b = e.target.closest && e.target.closest('button'); if (!b) return;
    if (b.id === 'ia-tester') { testerIA(); return; }
    if (b.id === 'ia-oeil') { const k = $('ia-cle'), voit = k.type === 'password'; k.type = voit ? 'text' : 'password'; b.setAttribute('aria-pressed', String(voit)); b.setAttribute('aria-label', voit ? 'Masquer la clé' : 'Montrer la clé'); b.dataset.bulle = voit ? 'Masquer la clé' : 'Montrer la clé'; b.innerHTML = svgIA(voit ? 'oeilBarre' : 'oeil'); return; }
    if (b.dataset.iaModele) { IA.reglage.modele = b.dataset.iaModele; garderReglageIA(); remplirChampsIA(); const m = $('ia-modele'); if (m) m.value = IA.reglage.modele; reglageChangeIA('modele'); testerIA(); return; }
    const g = b.dataset.iaGeste;
    if (g === 'cors') { copierIA(texteCorsIA(adresseIA(IA.reglage.adresse)), ok => { if (typeof dire === 'function') dire(ok ? 'La demande est copiée : collez-la dans un message à l’équipe qui gère l’IA.' : 'La copie est refusée ici : la demande reste à écrire.', !ok); }); return; }
    if (g === 'cle' || g === 'adresse' || g === 'modele') { const el = $('ia-' + g); if (el) { el.focus(); el.select(); } return; }
    if (b.dataset.iaFile === 'arreter') { arreterIA(); return; } if (b.dataset.iaFile === 'reprendre') { reprendreIA(); return; }
    if (b.dataset.iaPar) { IA.reglage.parallele = +b.dataset.iaPar === 1 ? 1 : 2; reglageChangeIA('parallele'); rendreTravailIA(); return; }
    if (b.dataset.iaLotOublier) { oublierLotIA(b.dataset.iaLotOublier); } });
  p.addEventListener('click', e => { if (!ici()) return; const b = e.target.closest && e.target.closest('#ia-oublier'); if (b && !b.disabled) oublierReglageIA(); }); }

/* ---- L'ENTRÉE : le menu ⋮ (page.html, Plus › IA interne) et la palette lisent ce geste ; au démarrage, le mot du menu et
   les lectures gardées (MENU est un `var` de 08-interface : ce geste y est posé d'avance) ---------------------------- */
MENU = (typeof MENU !== 'undefined' && MENU) || { actions: {} }; MENU.actions.ia = () => ficheIA();
function initIA() { rendreMenuIA(); try { IA.canal = typeof BroadcastChannel === 'function' ? new BroadcastChannel('volta-ia') : null; } catch (_) { IA.canal = null; } tenirFileIA();
  // le réseau revient : ce qui attendait l'IA repart tout de suite
  window.addEventListener('online', () => { if (!IA.attend) return; IA.attend = null; IA.file.forEach(d => { d.apres = 0; }); pomperIA(); });
  // « il y a 3 min » vieillit : le document ouvert relit ses dates toutes les 30 s (seulement les mots : rien ne bouge sous la main)
  setInterval(() => { if (!ficheIAOuverte() || IA.test) return; rendreBoutonIA();
    const q = document.querySelector('#ia-diag:not(.perime) .hy-titre small'); if (q && IA.diag && !IA.diag.perime) q.textContent = ilYaIA(IA.diag.date); }, 30000); }
if (typeof document !== 'undefined') setTimeout(initIA, 0);
