/* ===========================================================================
   08 sexies — LES CONTRATS DÉJÀ FAITS, à l'écran : « Déjà fait », la
   comparaison à trois échelles, le DESSIN (FWD) qu'on ouvre, la bible
   ---------------------------------------------------------------------------
   On dépose la grande base (un retest de plusieurs harness) ; elle se garde
   dans ce navigateur (IndexedDB), indexée une fois (09 quinquies).
     · Sur la fiche de chaque équipement, « DÉJÀ FAIT » : les trois machines
       les plus proches, chacune avec le repère décodé en mots, le harness,
       l'appareil, la date — et LE DESSIN où l'équipement apparaît : combien
       d'équipements, combien chez nous, ce qui nous manque.
     · Un clic ouvre la COMPARAISON : à l'échelle de l'ÉQUIPEMENT (ses
       lignes), de son VOISINAGE (ce qui lui est relié dans le dessin, à un
       ou deux pas) ou du DESSIN entier — en vert ce que la machine a et que
       nous n'avons pas, en ambre ce qui diffère, en gris ce qui est pareil,
       sur fond gris (neutre : ni à reprendre ni à voir) ce que nous avons en plus ; ses repères lus avec les nôtres
       (même repère, part number, voisins, code — « ? » quand c'est proposé :
       un clic sur la puce CONFIRME la proposition ou la CORRIGE, parmi nos
       repères de même code ou tous, ou « nouveau chez nous » ; le choix se
       garde pour ce contrat et cette machine, à toutes les échelles).
       On coche, « Reprendre » l'ajoute au contrat (Ctrl+Z le défait), et ce
       qui est repris passe les mêmes contrôles que le reste — avec sa route,
       sans la longueur mesurée sur l'autre machine.
     · « DESSIN » ouvre un calque plein écran (`#fwd`, créé ici) qui DESSINE
       le FWD avec le moteur de l'outil — placé et routé comme un folio, sur
       sa feuille, qu'on zoome et déplace —, l'équipement comparé encadré,
       ceux que nous avons en gris, ceux qui nous manquent en vert, les fils
       qui manquent ou diffèrent en pointillé ; à côté, la colonne qui
       EXPLIQUE le dessin : chaque repère décodé, ce qui lui est relié, ce
       qu'il devient chez nous. Échap ferme. Un dessin ne se calcule que
       quand on l'ouvre, et se garde.
     · Dans la BIBLE, la base par harness et par dessin, une recherche
       (harness, dessin, appareil, repère), un clic sur un dessin l'ouvre.
   L'ÉNORME RETEST (v72 : « il faut gérer l'énorme retest qui gère tous les
   contrats » — 100 000 lignes et plus) : un gros fichier se lit AILLEURS, dans
   un Worker refait du moteur (09, `lireLaBase` : le classeur au fil de l'eau),
   une carte dit le vrai (les lignes lues, le temps qui reste) ; la base se
   garde sur le PC par morceaux (IndexedDB « volta-base »), sert tout de suite
   à la bibliothèque (un contrat d'un clic, la recherche dans tout, la
   conversion en lot — 08-bibliotheque) et s'indexe pour « Déjà fait » par
   tranches, après coup. Un retest ENTIER se compare au déjà-fait : le
   document « Déjà fait » (les plus proches, ce qui est pareil, ce qui diffère,
   dessin par dessin), proposé à l'ouverture d'un retest.
   Tout reste hors ligne, dans ce navigateur.
   =========================================================================== */
'use strict';

const IDB_REFERENCES = 'references';
/* ce que l'écran garde d'une fiche à l'autre : les lignes cochées, l'échelle de la comparaison (équipement, voisinage à
   `pas` pas, dessin), la recherche de la bible ; LES CHOIX de l'utilisateur sur les repères proposés (`fixes` : clé
   contrat ␁ harness ␁ repère de la machine → { vers, sur }, le repère dont le choix est ouvert, « tous les repères ») ;
   et les caches : les dessins calculés, les comparaisons de dessins */
const REF = { coches: new Set(), portee: 'equipement', pas: 1, q: '', dessins: new Map(), cmp: new Map(), lie: false, fixes: new Map(), corrOuverte: '', corrTous: false, proches: null, choisi: '' };
const MOTS_SUR = { cible: 'l’équipement comparé', 'repère': 'même repère', pn: 'même part number', voisins: 'même code, mêmes voisins — à confirmer', code: 'même code, le plus proche — à confirmer', nouveau: 'nouveau chez nous', choisi: 'votre choix' };
const incertain = sur => sur === 'code' || sur === 'voisins';
/* Les choix se gardent par contrat (son nom) et par machine : ouvrir un autre fichier n'hérite pas des choix faits pour
   celui-ci. Un choix qui vise un repère qui n'est plus au contrat (renommé, supprimé) ne vaut plus. */
const cleFixe = (harness, r) => [typeof app !== 'undefined' && app.nom || '', harness, r].join('\u0001');
function fixesPour(harness) { const f = new Map(), pre = cleFixe(harness, ''), nos = new Set(reperesDe(verite()));
  REF.fixes.forEach((v, k) => { if (k.startsWith(pre)) { const r = k.slice(pre.length); if (v.sur === 'nouveau' || nos.has(v.vers)) f.set(r, v); } }); return f; }

/* ---- LA BASE, dans la page : lire (un Worker), garder (IndexedDB, par morceaux), indexer (par tranches), oublier ------
   « L'énorme retest qui gère tous les contrats » (le lecteur, 20 octobre 2026) : 100 000 lignes ou plus. Un gros fichier
   se lit AILLEURS — un Worker refait du moteur (09, `lireLaBase`) : la page reste libre, une carte dit le vrai (les lignes
   lues sur celles que le classeur annonce, le temps qu'il reste) ; la base revient par morceaux, se garde sur le PC
   (IndexedDB « volta-base » : ses contrats, ses morceaux — rien ne part sur le réseau) et s'indexe pour « Déjà fait » par
   tranches de quelques millisecondes, après coup : la bibliothèque, la recherche et l'ouverture d'un contrat n'attendent
   pas l'index. Un petit fichier se lit dans la page, d'un coup, comme avant. */
const IDB_BASE = 'volta-base', SEUIL_AILLEURS = 1.5e6, TRANCHE_MS = 24;
const BASE = { lecture: null, construction: null, chargement: null, jeton: 0, url: null, xlsx: null, fini: null };
function idbBase() { return new Promise((ok, ko) => { try { const r = indexedDB.open(IDB_BASE, 1);
  r.onupgradeneeded = () => ['meta', 'morceaux'].forEach(m => { if (!r.result.objectStoreNames.contains(m)) r.result.createObjectStore(m); }); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); } catch (e) { ko(e); } }); }
const idbFaire = (db, magasins, mode, f) => new Promise((ok, ko) => { const t = db.transaction(magasins, mode), q = f(t); t.oncomplete = () => ok(q && q.result); t.onerror = () => ko(t.error); t.onabort = () => ko(t.error); });
/* Garder une base : les morceaux un à un, puis ses contrats (`meta`, marqué complet) — une base à moitié écrite ne se relit
   pas. `surMorceau(k, n)` dit où on en est. */
async function garderBase(B, surMorceau) { const jeton = BASE.jeton; let db;
  try { db = await idbBase(); await idbFaire(db, ['meta', 'morceaux'], 'readwrite', t => { t.objectStore('meta').clear(); t.objectStore('morceaux').clear(); });
    for (let k = 0; k < B.morceaux.length; k++) { if (jeton !== BASE.jeton) return false; const m = B.morceaux[k];
      await idbFaire(db, ['morceaux'], 'readwrite', t => t.objectStore('morceaux').put({ debut: m.debut, n: m.n, lignes: m.lignes, bas: m.bas }, k)); if (surMorceau) surMorceau(k + 1, B.morceaux.length); }
    if (jeton !== BASE.jeton) return false;
    await idbFaire(db, ['meta'], 'readwrite', t => t.objectStore('meta').put({ ...B.meta, morceaux: B.morceaux.length, complet: true }, 'base')); db.close();
    // la base d'avant v72 (un seul enregistrement de liaisons) n'a plus lieu d'être
    ouvrirIDB().then(d => d.transaction(IDB_REFERENCES, 'readwrite').objectStore(IDB_REFERENCES).delete('base')).catch(() => { }); return true; }
  catch (e) { if (db) db.close(); BASE.pasGardee = true; return false; } }
async function oublierBaseGardee() { try { const db = await idbBase(); await idbFaire(db, ['meta', 'morceaux'], 'readwrite', t => { t.objectStore('meta').clear(); t.objectStore('morceaux').clear(); }); db.close(); } catch (_) { }
  ouvrirIDB().then(d => d.transaction(IDB_REFERENCES, 'readwrite').objectStore(IDB_REFERENCES).delete('base')).catch(() => { }); }
// la base gardée : ses contrats d'abord, puis ses morceaux un à un (la page respire entre deux) ; null s'il n'y en a pas
async function lireBaseGardee() { let db; try { db = await idbBase(); const meta = await idbFaire(db, ['meta'], 'readonly', t => t.objectStore('meta').get('base'));
    if (!meta || !meta.complet) { db.close(); return null; } const morceaux = [];
    for (let k = 0; k < meta.morceaux; k++) { const m = await idbFaire(db, ['morceaux'], 'readonly', t => t.objectStore('morceaux').get(k)); if (!m) { db.close(); return null; } morceaux.push(m); }
    db.close(); return { meta, morceaux }; } catch (_) { if (db) db.close(); return null; } }

/* ---- la base devient celle de l'outil ------------------------------------------------------------------------------ */
function viderCachesReferences() { REF.dessins.clear(); REF.cmp.clear(); REF.proches = null; }
// ce qui la montre se refait : la fiche ouverte, la bible, « Vos fichiers », la bibliothèque
function apresBase() { CONTROLE.cle = null; if (app.cible) rendreFiche(); if (app.fiche && app.fiche.mode === 'bible') ficheBible(app.fiche.ref); if (app.fiche && app.fiche.mode === 'deja-contrat') ficheDejaFaitContrat();
  if (typeof rendreFichiers === 'function') rendreFichiers(); suivreLaBase(); montrerLecture(); }
/* UNE PETITE BASE (un fichier lu dans la page, les essais) : rangée, indexée et gardée d'un coup. Au-delà de 20 000 lignes,
   l'index se fait par tranches (`poserBase`). Vide : la base est oubliée. */
function adopterReferences(liaisons, nom) { BASE.jeton++; arreterLecture(); viderCachesReferences(); const ancienne = baseDeReferences();
  if (!liaisons || !liaisons.length) { figerLesPlansDeLaBase(ancienne, null); app.references = null; BASE.construction = null; oublierBaseGardee(); apresBase(); return; }
  const B = baseDesLiaisons(liaisons, nom);
  if (liaisons.length > 20000) { poserBase(B); return; }
  figerLesPlansDeLaBase(ancienne, B);
  app.references = { nom: nom || '', t: B.meta.t, n: B.meta.n, base: B, liaisons, index: indexerReferences(liaisons), pret: true }; BASE.construction = null;
  garderBase(B); apresBase(); }
/* UNE GRANDE BASE (lue par le Worker, ou relue du PC) : elle sert tout de suite à la bibliothèque, à la recherche, à ouvrir un
   contrat ; « Déjà fait » l'attend le temps de l'index. `o.garder` : l'écrire sur le PC (pas quand on vient de la relire). */
function poserBase(B, o) { o = o || {}; const jeton = ++BASE.jeton; viderCachesReferences();
  // une base qui en remplace une autre : les plans de l'ancienne qu'elle ne porte plus gardent leurs liaisons
  if (o.garder !== false) figerLesPlansDeLaBase(baseDeReferences(), B);
  // l'index se fait : une coquille vide en attendant (ce qui lit `index.harnais` ne casse pas), « Déjà fait » se tait
  app.references = { nom: B.meta.nom || '', t: B.meta.t || Date.now(), n: B.meta.n, base: B, liaisons: [], index: { harnais: new Map(), dessins: new Map(), parPn: new Map(), parCode: new Map(), liaisons: 0, enCours: true }, pret: false };
  BASE.construction = { fait: 0, total: B.meta.n, t0: performance.now() };
  if (o.garder !== false) garderBase(B, (k, n) => { BASE.garde = { k, n }; montrerLecture(); }).then(() => { BASE.garde = null; montrerLecture(); });
  construireIndex(B, jeton); apresBase(); }
// une pause qui laisse la page peindre et répondre (un MessageChannel : pas freiné comme setTimeout dans un onglet caché)
const respirer = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
/* L'INDEX « DÉJÀ FAIT », par tranches : chaque morceau se relit en liaisons (les chaînes qui se répètent partagées), passe à
   l'indexeur (09), et la page respire toutes les 24 ms. À la fin, la base est « prête » : les fiches disent ce qui a déjà
   été fait. Un autre dépôt entre-temps l'arrête (`jeton`). */
async function construireIndex(B, jeton) { const IX = indexeurDeReferences(), garder = partageur(), L = []; let t = performance.now();
  for (const m of B.morceaux) { const D = debutsDe(m, 'lignes');
    for (let i = 0; i < m.n;) { const tranche = []; for (; i < m.n && tranche.length < 120; i++) tranche.push(liaisonDeLaBase(m.lignes.slice(D[i], D[i + 1] - 1), garder));
      IX.ajouter(tranche); for (const l of tranche) L.push(l);
      if (performance.now() - t > TRANCHE_MS) { if (BASE.construction) { BASE.construction.fait = L.length; montrerLecture(); } await respirer(); if (jeton !== BASE.jeton) return; t = performance.now(); } } }
  await respirer(); if (jeton !== BASE.jeton) return; const index = IX.finir();
  const ms = BASE.construction ? Math.round(performance.now() - BASE.construction.t0) : 0;
  app.references = { ...app.references, liaisons: L, index, pret: true }; BASE.construction = null; BASE.indexMs = ms; viderCachesReferences(); apresBase(); }
const indexReferences = () => app.references && app.references.index && !app.references.index.enCours ? app.references.index : null;
const baseDeReferences = () => app.references && app.references.base || null;
/* Au démarrage : la base gardée revient (ses morceaux un à un), puis s'indexe par tranches. Une base d'avant v72 (un seul
   enregistrement de liaisons, magasin `references`) se range au nouveau format, une fois. */
function relireReferences() { BASE.chargement = (async () => { const B = await lireBaseGardee();
    if (B) { if (!app.references) poserBase(B, { garder: false }); return; }
    const o = await new Promise(ok => ouvrirIDB().then(db => { const q = db.transaction(IDB_REFERENCES).objectStore(IDB_REFERENCES).get('base'); q.onsuccess = () => ok(q.result || null); q.onerror = () => ok(null); }).catch(() => ok(null)));
    if (o && o.liaisons && o.liaisons.length && !app.references) { const L = o.liaisons.map(liaison), B2 = baseDesLiaisons(L, o.nom || ''); B2.meta.t = o.t || B2.meta.t; poserBase(B2); } })().catch(() => { }).finally(() => { BASE.chargement = null; }); return BASE.chargement; }
/* Les liaisons d'un contrat de la base (un plan qu'on ouvre, la conversion en lot) : on attend la base si elle se relit
   encore ; null si elle n'est pas là. */
async function liaisonsDuContrat(h, fwd) { if (!baseDeReferences() && BASE.chargement) await BASE.chargement; const B = baseDeReferences(); if (!B) return null;
  const L = liaisonsDuContratDeLaBase(B, h); return L && fwd ? L.filter(l => fwdDe(l) === fwd) : L; }

/* ---- LIRE AILLEURS : le Worker, sa carte ------------------------------------------------------------------------------ */
// le Worker : le moteur (09 lit le classeur), puis ce qui lui parle ; SheetJS lui est donné en texte, au cas où (un .xls)
const PROGRAMME_BASE = `self.onmessage = async e => { const d = e.data; if (d.xlsx) self.__xlsx = d.xlsx;
  try { const r = await lireLaBase(d.fichier, p => postMessage({ progres: p })); r.base.morceaux.forEach(m => postMessage({ morceau: m }));
    postMessage({ fin: { lecture: r.lecture, meta: r.base.meta } }); } catch (err) { postMessage({ erreur: String(err && err.message || err) }); } };`;
function urlTravailleurBase() { if (BASE.url) return BASE.url; const src = document.getElementById('moteur').textContent; return (BASE.url = URL.createObjectURL(new Blob([src, '\n', PROGRAMME_BASE], { type: 'text/javascript' }))); }
// la balise de SheetJS : `#xlsx` si construire.js la nomme, sinon celle qui commence par son en-tête
const texteXlsx = () => { if (BASE.xlsx == null) { const s = document.getElementById('xlsx') || [...document.scripts].find(x => /^\s*\/\*! xlsx\.js/.test(x.textContent.slice(0, 80))); BASE.xlsx = s ? s.textContent : ''; } return BASE.xlsx; };
/* LIRE UNE BASE AILLEURS. `but` : 'base' (déposée comme base) ou 'ouvrir' (un gros fichier ouvert comme un retest : un seul
   contrat s'ouvre comme un plan, plusieurs deviennent la base). La carte de lecture dit chaque étape ; « Arrêter » l'arrête. */
function lireLaBaseAilleurs(fichier, but) { arreterLecture(); const L = { nom: fichier.name || 'la base', but: but || 'base', etape: 'ouvre', fait: 0, total: 0, n: 0, octets: 0, octetsTotal: fichier.size || 0, t0: performance.now(), morceaux: [], w: null };
  let w; try { w = new Worker(urlTravailleurBase()); } catch (_) { return false; }
  BASE.lecture = L; BASE.fini = null; L.w = w; montrerLecture();
  w.onmessage = e => { const m = e.data; if (BASE.lecture !== L) return;
    if (m.progres) { Object.assign(L, m.progres); montrerLecture(); }
    else if (m.morceau) L.morceaux.push(m.morceau);
    else if (m.fin) { w.terminate(); finDeLecture(L, m.fin); }
    else if (m.erreur) { w.terminate(); BASE.lecture = null; montrerLecture(); echecImport('base', { texte: `${esc(L.nom)} n’a pas pu être lu : ${esc(m.erreur)}.` }); } };
  w.onerror = e => { e.preventDefault(); if (BASE.lecture !== L) return; w.terminate(); BASE.lecture = null; montrerLecture(); echecImport('base', { texte: `${esc(L.nom)} n’a pas pu être lu : ${esc(e.message || 'erreur du lecteur')}.` }); };
  w.postMessage({ fichier, xlsx: /\.xls$/i.test(L.nom) || !/\.(csv|tsv|txt)$/i.test(L.nom) ? texteXlsx() : '' }); return true; }
// la carte d'une lecture finie se retire seule (quinze secondes), ou dès qu'on ouvre un plan ou qu'on convertit
function finirCarteLecture() { clearTimeout(BASE.finiT); BASE.finiT = setTimeout(() => { BASE.fini = null; montrerLecture(); }, 15000); }
const retirerCarteLecture = () => { if (BASE.fini) { BASE.fini = null; montrerLecture(); } };
function arreterLecture() { const L = BASE.lecture; if (!L) return; try { L.w.terminate(); } catch (_) { } BASE.lecture = null; montrerLecture(); }
/* La lecture finie : ce qui ne va pas se dit dans la carte de la base (comme un petit fichier) ; sinon la base est posée,
   gardée, rangée dans la bibliothèque — et la carte de lecture dit ce qu'il y a, et en combien de temps. */
async function finDeLecture(L, fin) { BASE.lecture = null; const R = fin.lecture, B = { meta: fin.meta, morceaux: L.morceaux }, nom = L.nom, ms = Math.round(performance.now() - L.t0);
  const liste = R.ignorees.length ? ['Feuilles ignorées (pas les en-têtes de l’installation) : ' + R.ignorees.map(n => guillemets(esc(n))).join(', ')] : [];
  if (!R.entete) { montrerLecture(); echecImport('base', { texte: `${esc(nom)} : je ne trouve pas les en-têtes de l’installation dans les 30 premières lignes — la base a les mêmes colonnes que l’installation, avec <span class="id">Harness</span>. ${ceQueJaiLu(R.brutes)} ${IL_ME_FAUT}`, gestes: [['modele-base', 'Télécharger un modèle']] }, nom + ' : je ne trouve pas les en-têtes de l’installation dans les 30 premières lignes.'); return; }
  if (!R.n) { montrerLecture(); echecImport('base', { texte: `« ${esc(nom)} » : les en-têtes de l’installation sont là (ligne ${R.entete}), mais aucune liaison dessous.`, liste }); return; }
  const C = B.meta.contrats, sans = !C.some(c => c.h !== '—');
  // un seul contrat, ouvert comme un retest : il devient un plan, sans passer par la base
  if (L.but === 'ouvrir' && C.length === 1) { const V = liaisonsDuContratDeLaBase(B, C[0]); montrerLecture();
    chargerContrat(V, 'ouverture de ' + nom, nom, { nouveau: true }); contratRecu(nom, 'retest'); dire(pluriel(V.length, 'liaison') + (plans().length > 1 ? ' · ' + plans().length + ' folios' : '') + ` — lu en ${secondesLues(ms)}.`); return; }
  if (sans) { const V = liaisonsDuContratDeLaBase(B, C[0]), G = rangerLaBase(V, nom); montrerLecture();
    echecImport('base', { texte: `${esc(nom)} : ${R.harness ? 'la colonne <span class="id">Harness</span> est vide' : 'aucune colonne <span class="id">Harness</span>'}. Sans elle, je ne sais pas séparer les machines. Ajoutez-la, ou ouvrez ce fichier comme un plan.${G ? ` Ses ${esc(lies([plurielLie(G.installs, 'installation'), plurielLie(G.plans, 'plan')]))} sont rangés dans la bibliothèque.` : ''}`, liste }, nom + ' : aucune colonne Harness — sans elle, je ne sais pas séparer les machines.');
    FICHIERS.base = { nom, liaisons: V }; rendreFichiers(); return; }
  // la base posée, puis rangée, puis dite : trois temps, la page respire entre eux
  poserBase(B); await respirer(); const G = rangerLesContrats(B, nom); await respirer();
  BASE.fini = { nom, n: R.n, contrats: C.length, installs: B.meta.installs.length, ms, rangee: G, t: Date.now() }; finirCarteLecture();
  baseRecue(nom, R.ignorees.length ? { texte: 'Feuilles ignorées (pas les en-têtes de l’installation) :', liste: R.ignorees.map(n => guillemets(esc(n))) } : null, G);
  montrerLecture();
  dire(lies([nombreLie(R.n, 'liaison'), nombreLie(C.length, 'contrat'), B.meta.installs.length ? nombreLie(B.meta.installs.length, 'installation') : '']) + ` — lus en ${secondesLues(ms)}, gardés sur ce PC.`); }
const secondesLues = ms => ms < 1000 ? ms + ' ms' : nombre(Math.round(ms / 100) / 10) + ' s';
// « 300 109 liaisons » : les milliers séparés, le nombre lié à son mot
const nombreLie = (n, mot) => milliers(n) + INSECABLE + mot + (n > 1 && !/[sxz]$/.test(mot) ? 's' : '');

/* LA CARTE DE LECTURE (`#lecture-base`, posée en bas à droite, au-dessus de tout) : le nom du fichier, la barre (le travail
   vraiment fait : les octets décompressés du classeur), les lignes lues sur celles qu'il annonce, le temps passé et celui qui
   reste ; puis le rangement sur le PC et l'index « Déjà fait » ; à la fin, ce qu'il y a, et deux gestes. */
function carteLecture() { let c = $('lecture-base'); if (c) return c; c = document.createElement('section'); c.id = 'lecture-base'; c.className = 'lecture-base'; c.hidden = true; c.setAttribute('role', 'status'); c.setAttribute('aria-live', 'polite');
  document.body.appendChild(c);
  c.addEventListener('click', e => { const b = e.target.closest('[data-lb]'); if (!b) return; const k = b.dataset.lb;
    if (k === 'arreter') { arreterLecture(); dire('Lecture arrêtée : la base d’avant reste.'); }
    else if (k === 'fermer') { BASE.fini = null; montrerLecture(); }
    else if (k === 'bibliotheque') { BASE.fini = null; montrerLecture(); fermerFiche(); montrerBibliotheque('racine'); }
    else if (k === 'chercher') { BASE.fini = null; montrerLecture(); fermerFiche(); montrerBibliotheque('racine'); setTimeout(() => { const q = $('bi-q'); if (q) q.focus(); }, 50); } });
  return c; }
const MOTS_ETAPES = { ouvre: 'Le fichier arrive', mots: 'Les mots du classeur', lignes: 'Les lignes', range: 'Le rangement par contrat' };
function montrerLecture() { if (typeof document === 'undefined') return; const L = BASE.lecture, K = BASE.construction, F = BASE.fini, G = BASE.garde;
  // l'index seul (au lancement, la base relue) ne se montre pas ici : « Vos fichiers » et la bible le disent
  if (!L && !F && !G) { const c = $('lecture-base'); if (c) c.hidden = true; return; }
  const c = carteLecture(), pc = x => Math.max(0, Math.min(100, Math.round(x * 100)));
  let titre, barre = null, detail = '', gestes = '';
  if (L) { const t = (performance.now() - L.t0) / 1000, frac = L.etape === 'lignes' && L.octetsTotal ? L.octets / L.octetsTotal : L.etape === 'range' ? 1 : 0;
    const reste = frac > 0.05 && frac < 1 ? Math.max(1, Math.round(t * (1 - frac) / frac)) : null;
    titre = 'Lecture de ' + guillemets(L.nom); barre = L.etape === 'lignes' ? frac : L.etape === 'range' ? (L.total ? L.fait / L.total : 1) : null;
    detail = L.etape === 'lignes' ? lies([milliers(L.n || 0) + (L.total ? ' lignes lues sur ' + milliers(L.total) : ' lignes lues'), pc(frac) + ' %', nombre(Math.round(t * 10) / 10) + ' s', reste ? 'encore ~' + reste + ' s' : ''])
      : L.etape === 'range' ? lies([MOTS_ETAPES.range, milliers(L.fait || 0) + ' / ' + milliers(L.total || 0) + ' lignes']) : MOTS_ETAPES[L.etape] + '…';
    gestes = '<button class="btn lien" data-lb="arreter">Arrêter</button>'; }
  else if (F) { titre = guillemets(F.nom) + ' est lue';
    detail = lies([nombreLie(F.n, 'liaison'), nombreLie(F.contrats, 'contrat'), F.installs ? nombreLie(F.installs, 'installation') : '', 'en ' + secondesLues(F.ms)]);
    gestes = '<button class="btn papier" data-lb="chercher">Chercher dans la base</button><button class="btn cuivre" data-lb="bibliotheque">Voir la bibliothèque</button><button class="lb-x" data-lb="fermer" aria-label="Fermer">' + ico('fermer') + '</button>'; }
  else titre = 'Contrats déjà faits';
  // ce qui continue derrière : l'écriture sur le PC, l'index « Déjà fait »
  const suite = [G ? 'Gardée sur ce PC : morceau ' + G.k + ' / ' + G.n : '', K ? '« Déjà fait » s’indexe : ' + pc(K.total ? K.fait / K.total : 0) + ' %' : ''].filter(Boolean);
  c.hidden = false; c.classList.toggle('fini', !L && !!F);
  c.innerHTML = `<div class="lb-tete">${ico('tableau')}<b>${esc(titre)}</b></div>`
    + (barre != null || (L && !barre) ? `<div class="lb-barre${barre == null ? ' indefinie' : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="100"${barre != null ? ` aria-valuenow="${pc(barre)}"` : ''}><i style="width:${barre == null ? 30 : pc(barre)}%"></i></div>` : '')
    + (detail ? `<p class="lb-detail">${esc(detail)}</p>` : '') + (suite.length ? `<p class="lb-suite">${esc(suite.join(' · '))}</p>` : '')
    + (gestes ? `<div class="lb-gestes">${gestes}</div>` : ''); }
// la bibliothèque dit les harness de la base qu'aucune installation ne range encore
const suivreLaBase = () => { if (typeof bibliothequeOuverte === 'function' && bibliothequeOuverte() && !BIB.edition) rendreContenuBibliotheque(); };
/* DÉPOSER LA BASE (sa carte dans « Vos fichiers », la bibliothèque vide) : un retest de plusieurs harness — les mêmes
   colonnes, Harness rempli. Un gros fichier (au-delà d'un Mo et demi) se lit ailleurs (`lireLaBaseAilleurs`) ; un petit,
   ici, d'un coup. Ce qui ne convient pas s'écrit dans la carte de la base, en clair, et la base d'avant reste : un fichier
   illisible ou vide, des en-têtes introuvables (ce que l'outil a lu, ce qu'il lui faut), aucune colonne Harness (« Sans
   elle, je ne sais pas séparer les machines » — et l'ouvrir comme un plan), des feuilles ignorées (en liste). Un dépôt
   réussi ramène sur la carte, avec les comptes et « Voir un équipement déjà fait ». Une colonne d'installation (Install,
   Installation, Système) range chaque installation et ses contrats dans la bibliothèque (08-bibliotheque,
   `rangerLesContrats`) ; sans elle, la bibliothèque propose de les ranger. */
async function importerReferences(fichier) { if (!fichier) return; const nom = fichier.name || 'la base';
  if ((fichier.size || 0) > SEUIL_AILLEURS && typeof Worker !== 'undefined' && lireLaBaseAilleurs(fichier, 'base')) return;
  dire('Lecture de « ' + nom + ' »…'); const L = await lireLeFichier(fichier); FICHIERS.base = null;
  if (L.erreur) { echecImport('base', L.erreur); return; }
  try { const r = lireTexte(L.texte), ig = feuillesHtml(L.lu), liste = ig.length ? ['Feuilles ignorées (pas les en-têtes de l’installation) : ' + ig.join(', ')] : [];
    if (r.format !== 'retest') { echecImport('base', { texte: `${esc(nom)} : je ne trouve pas les en-têtes de l’installation dans les 30 premières lignes — la base a les mêmes colonnes que l’installation, avec <span class="id">Harness</span>. ${ceQueJaiLu(L.brutes)} ${IL_ME_FAUT}`, gestes: [['modele-base', 'Télécharger un modèle']] },
      nom + ' : je ne trouve pas les en-têtes de l’installation dans les 30 premières lignes.'); return; }
    if (!r.liaisons.length) { echecImport('base', { texte: `«\u00a0${esc(nom)}\u00a0» : les en-têtes de l’installation sont là (ligne ${r.entete}), mais aucune liaison dessous.`, liste }); return; }
    if (!r.harnais.length) { const e = trouverEnteteRetest(L.brutes), sans = !e || e.col.harness == null, G = rangerLaBase(r.liaisons, nom);
      // sans harness, pas de comparaison ; ses installations, si elle les dit, entrent quand même dans la bibliothèque (un plan par dessin)
      echecImport('base', { texte: `${esc(nom)} : ${sans ? 'aucune colonne <span class="id">Harness</span>' : 'la colonne <span class="id">Harness</span> est vide'}. Sans elle, je ne sais pas séparer les machines. Ajoutez-la, ou ouvrez ce fichier comme un plan.${G ? ` Ses ${esc(lies([plurielLie(G.installs, 'installation'), plurielLie(G.plans, 'plan')]))} sont rangés dans la bibliothèque.` : ''}`, liste },
        nom + ' : aucune colonne Harness — sans elle, je ne sais pas séparer les machines.');
      FICHIERS.base = { nom, liaisons: r.liaisons }; rendreFichiers(); return; }
    adopterReferences(r.liaisons, nom); const B = app.references.base, G = rangerLesContrats(B, nom);
    baseRecue(nom, ig.length ? { texte: 'Feuilles ignorées (pas les en-têtes de l’installation) :', liste: ig } : null, G);
    // déposée depuis la bibliothèque, qui montre déjà les installations créées : « Vos fichiers » ne s'ouvre pas par-dessus
    if (!(typeof bibliothequeOuverte === 'function' && bibliothequeOuverte())) ficheFichiers('base');
    dire(lies([plurielLie(B.meta.harnais, 'harness'), plurielLie(B.meta.dessins, 'dessin'), plurielLie(B.meta.n, 'liaison')]) + ' gardés dans ce navigateur : les fiches disent ce qui a déjà été fait' + (G ? ', et la bibliothèque range ' + plurielLie(G.installs, 'installation') + '.' : '.'));
  } catch (e) { echecImport('base', { texte: `${esc(nom)} n’a pas pu être lu : ${esc(String(e && e.message || e))}.` }); } }
/* Une empreinte courte du contrat (ce que la comparaison lit) : les comparaisons gardées se périment quand il change. */
function empreinteContrat() { const V = verite(); let h = 2166136261; const s = V.length + '|' + V.map(l => l.de + l.borneDe + l.vers + l.borneVers + l.type + l.pnDe + l.pnVers).join('\u0001');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
/* La comparaison d'un dessin, ou du voisinage d'un équipement, contre le contrat — gardée tant que rien ne change (ni le
   contrat, ni les choix de l'utilisateur sur les repères de cette machine). */
function comparaisonDe(harness, fwd, repereRef, repere, portee, pas) { const D = dessinDe(indexReferences(), harness, fwd); if (!D) return null;
  const F = fixesPour(harness), k = [harness, fwd, repereRef || '', repere || '', portee, pas || 1, empreinteContrat(), JSON.stringify([...F])].join('\u0001'); if (REF.cmp.has(k)) return REF.cmp.get(k);
  const c = portee === 'voisinage' ? comparerVoisinage(verite(), D, repereRef, repere, pas || 1, F) : comparerDessin(verite(), D, repereRef, repere, F);
  if (REF.cmp.size > 40) REF.cmp.delete(REF.cmp.keys().next().value); REF.cmp.set(k, c); return c; }

/* ---- les mots ------------------------------------------------------------- */
/* Un repère décodé, en chasse fixe : la zone, le code (la nature, au survol), l'ordre, la variante. */
function repereHtml(r) { const d = decoderRepere(r); if (!d) return `<span class="rp">${esc(r)}</span>`;
  return `<span class="rp" data-bulle="${escA(direRepere(r))}"><span class="rp-zone">${esc(d.zone)}</span><span class="rp-code${d.connu ? '' : ' inconnu'}">${esc(d.code)}</span><span class="rp-ordre">${d.ordre != null ? d.ordre : ''}</span>${d.variante ? `<span class="rp-var">${esc(d.variante)}</span>` : ''}</span>`; }
const plurielNature = (n, k) => k > 1 && !/[sx]$/.test(n.split(' ')[0]) ? n.replace(/^(\S+)/, '$1s') : n;
// « 3 pareils · 1 diffère · 2 manquent · 1 en plus » — seulement ce qui est là ; chaque chiffre lié à son mot, chaque
// « · » à ce qui le précède (espaces insécables : la ligne ne coupe qu'après un point médian)
const SEP_POINT = INSECABLE + '· ';   // INSECABLE, plurielLie : 08-interface
function compteMots(c) { return [c.identique ? c.identique + INSECABLE + 'pareil' + (c.identique > 1 ? 's' : '') : '', c.differe ? c.differe + INSECABLE + 'diffère' + (c.differe > 1 ? 'nt' : '') : '', c.manque ? c.manque + INSECABLE + 'manque' + (c.manque > 1 ? 'nt' : '') : '', c.enplus ? c.enplus + INSECABLE + 'en plus' : ''].filter(Boolean).join(SEP_POINT) || 'aucune ligne'; }
// les descriptions que le retest porte, par repère
function descriptionsDe(D) { const m = new Map(); D.liaisons.forEach(l => { if (l.descriptionDe && !m.has(l.de)) m.set(l.de, l.descriptionDe); if (l.descriptionVers && !m.has(l.vers)) m.set(l.vers, l.descriptionVers); }); return m; }
const etatEquipement = e => e.sur === 'cible' ? 'cible' : !e.chezNous ? 'manque' : incertain(e.sur) ? 'propose' : 'chez';
function versMots(e) { return e.sur === 'cible' ? `= <b>${esc(e.vers)}</b> · ${MOTS_SUR.cible}` : !e.chezNous ? 'manque chez nous' : `→ <b>${esc(e.vers)}</b>${incertain(e.sur) ? ' ?' : ''} · ${MOTS_SUR[e.sur] || e.sur}`; }

/* ---- « Déjà fait » sur la fiche d'un équipement ------------------------- */
function dejaFaitHtml(nom) { const I = indexReferences(); if (!I) return '';
  const cs = candidatsDeReference(I, verite(), nom, 3); if (!cs.length) return '';
  const ligne = c => { const D = c.fwd ? dessinDe(I, c.harness, c.fwd) : null, C = D ? comparaisonDe(c.harness, c.fwd, c.repere, nom, 'dessin') : null;
    const manque = C ? C.manquent.slice(0, 3).map(e => `<b>${esc(e.repere)}</b>${e.nature ? ' <i>' + esc(e.nature) + '</i>' : ''}`).join(', ') + (C.manquent.length > 3 ? ' …' : '') : '';
    const dessin = D ? `<span class="cd-ligne cd-dessin"><span class="cd-fwd" data-bulle="Le dessin (FWD) où ${escA(c.repere)} apparaît">${esc(c.fwd)}</span>${SEP_POINT}${plurielLie(D.equipements.size, 'équipement')}${C ? `${SEP_POINT}<b>${C.chezNous}</b>${INSECABLE}chez${INSECABLE}nous${C.manquent.length ? SEP_POINT + 'il manque ' + manque : ''}${C.compte.differe ? `${SEP_POINT}${C.compte.differe}${INSECABLE}câble${C.compte.differe > 1 ? 's' : ''} diffère${C.compte.differe > 1 ? 'nt' : ''}` : ''}` : ''}${c.fwds.length > 1 ? `${SEP_POINT}sur ${plurielLie(c.fwds.length, 'dessin')}` : ''}</span>` : '';
    return `<li class="fi-cand cd-${c.taux >= 0.8 ? 'ok' : c.taux >= 0.4 ? 'att' : 'ko'}" data-ref="${escA(c.harness)}" data-rep="${escA(c.repere)}" data-fwd="${escA(c.fwd || '')}" tabindex="0" role="button" data-bulle="${escA('Comparer avec ' + c.repere + ' de ' + c.harness)}">`
      + `<span class="cd-taux"><b>${Math.round(c.taux * 100)}${INSECABLE}%</b></span><span class="cd-corps"><span class="cd-ligne">${repereHtml(c.repere)} <span class="cd-mots">${esc(direRepere(c.repere))}</span></span>`
      + `<span class="cd-ligne cd-ou"><b>${esc(c.harness)}</b>${c.appareil ? SEP_POINT + esc(c.appareil) : ''}${c.retest ? SEP_POINT + esc(c.retest) : ''}${SEP_POINT}<i>${c.par === 'pn' ? 'même part number' : 'même code'}</i></span>${dessin}</span>${ico('fleche', 'cd-fleche')}</li>`; };
  return `<section class="fi-cadre fi-deja"><div class="fi-ref-ligne"><b class="fi-ref">Déjà fait</b><span class="cd-compte">Les plus proches, dans une base de ${plurielLie(I.harnais.size, 'machine')}${SEP_POINT}${plurielLie(I.dessins.size, 'dessin')}</span></div><ul class="fi-liste cd-liste">${cs.map(ligne).join('')}</ul></section>`; }

/* ---- LA COMPARAISON : la fiche de l'équipement contre l'équipement d'une machine, à trois échelles ------------ */
const cleComparaison = (c, portee) => c.harness + '|' + c.repere + (portee === 'equipement' ? '' : '|' + portee + (portee === 'voisinage' ? REF.pas : ''));
// le dessin d'une comparaison : celui qu'on a demandé, sinon le dessin principal du repère de la machine
function dessinDeComparaison(c) { const I = indexReferences(), h = I && I.harnais.get(c.harness); if (!h) return null;
  const fwd = c.fwd || dessinPrincipal(h.equipements.get(c.repere) || {}); return fwd ? dessinDe(I, c.harness, fwd) : null; }
/* LE CHOIX d'un repère proposé — « 303RL7 (relais n° 7 · zone 303) chez nous, c'est… » : nos repères de même code, du
   plus proche au plus loin (l'ordre, la variante, la zone — 09, `ecartDeReperes`), la proposition de l'outil pressée ;
   « nouveau chez nous » ; « tous les repères » pour sortir du code ; et, après un choix, revenir à la proposition. Un
   clic sur la proposition la CONFIRME (le « ? » s'en va), un clic sur un autre la CORRIGE : le choix se garde (`REF.fixes`)
   et la comparaison se refait, à toutes les échelles, sur le dessin aussi. */
function choixDeRepereHtml(c, corrDe, F) { const r = REF.corrOuverte, m = r && corrDe.get(r); if (!m || m.sur === 'cible' || m.sur === 'repère') return '';
  const q = lireRepere(r), codeR = q && q.code ? q.code : '', nos = reperesDe(verite()).filter(n => !horsEquipement(n) && n !== c.nom);
  const memeCode = codeR ? nos.filter(n => { const p = lireRepere(n); return p && p.code === codeR; }) : [];
  const actuel = m.sur === 'nouveau' ? '' : m.vers, choisi = F.has(r);   // la proposition (ou le choix) d'abord, puis les autres du plus proche au plus loin
  const liste = [...(actuel ? [actuel] : []), ...(REF.corrTous || !memeCode.length ? nos : memeCode).filter(n => n !== actuel).sort((u, v) => ecartDeReperes(r, u) - ecartDeReperes(r, v) || triNaturel(u, v))];
  const puce = n => `<button class="fi-chip cp-cand" data-vers="${escA(n)}" aria-pressed="${n === actuel}" data-bulle="${escA(n === actuel && !choisi ? 'La proposition de l’outil : un clic la confirme' : 'Chez nous, ' + r + ' est ' + n)}">${esc(n)}</button>`;
  return `<div class="cp-choix" role="group" aria-label="${escA('Chez nous, ' + r + ' est…')}"><p class="fi-note fi-rac-t">${esc(r)} <i>· ${esc(direRepere(r))}</i> — chez nous, c’est :</p><div class="fi-puces">${liste.map(puce).join('')}`
    + `<button class="fi-chip cp-cand cp-corr-nouveau" data-vers="" aria-pressed="${actuel === ''}" data-bulle="${escA(r + ' n’existe pas chez nous : ses lignes manquent')}">nouveau chez nous</button>`
    + (memeCode.length && memeCode.length < nos.length ? `<button class="fi-chip" id="cp-corr-tous" aria-pressed="${REF.corrTous}">tous les repères</button>` : '')
    + (choisi ? '<button class="fi-chip" id="cp-corr-defaire">revenir à la proposition de l’outil</button>' : '') + '</div></div>'; }
function ficheComparaison(c) { const I = indexReferences(), h = I && I.harnais.get(c.harness); if (!h) return fiTete({ nom: c.nom, sous: 'référence introuvable' }) + '<p class="fi-note">La base des contrats faits n’est plus là.</p>';
  const D = dessinDeComparaison(c), portee = D ? REF.portee : 'equipement', cle = cleComparaison(c, portee), mots = { identique: 'Pareil', differe: 'Diffère', manque: 'Manque chez nous', enplus: 'En plus chez nous' };
  const F = fixesPour(c.harness), E = differentiel(verite(), c.nom, h.liaisons, c.repere, F), CD = D ? comparaisonDe(c.harness, D.fwd, c.repere, c.nom, 'dessin') : null, C = portee === 'equipement' ? null : comparaisonDe(c.harness, D.fwd, c.repere, c.nom, portee, REF.pas);
  const corrDe = portee === 'equipement' ? E.correspondance : C.correspondance;
  const vers = r => { const m = corrDe.get(r); return !m || m.vers === r ? esc(r) : `${esc(m.vers)}<i class="fi-corr" data-bulle="${escA(r + ' chez ' + c.harness + ' : ' + (MOTS_SUR[m.sur] || m.sur))}">← ${esc(r)}${incertain(m.sur) ? ' ?' : ''}</i>`; };
  const coche = (etat, k) => etat === 'manque' || etat === 'differe' ? `<input type="checkbox" class="cp-coche" data-k="${escA(k)}"${REF.coches.has(cle + '|' + k) ? ' checked' : ''} aria-label="Reprendre cette ligne">` : '<span></span>';
  const bout = b => b ? ':' + esc(b) : '';   // une masse n'a pas de borne : pas de deux-points orphelin
  let liste, bilan, nb;
  if (portee === 'equipement') {
    const ligne = x => { const b = x.ref || x.notre, k = x.ref ? cleLigne(x.ref) : '';
      return `<li class="fi-fil cp-${x.etat}">${coche(x.etat, k)}<span class="fi-ct"><b>${esc(b.borne)}</b></span><span class="fi-w">${esc(b.typeBrut || '—')}</span><span class="fi-dest${b.amont ? ' amont' : ''}">${ico('fleche')}<span>${x.ref ? vers(x.ref.autre) : esc(x.notre.autre)}${bout(b.borneAutre)}</span></span>`
        + (x.etat === 'differe' ? `<span class="fi-ko">chez nous : ${esc(x.notre.typeBrut || '—')} → ${esc(x.notre.autre)}${bout(x.notre.borneAutre)}</span>` : '') + '</li>'; };
    liste = ['manque', 'differe', 'identique', 'enplus'].map(e => { const xs = E.lignes.filter(x => x.etat === e); return xs.length ? `<li class="fi-groupe cp-${e}">${mots[e]}${SEP_POINT}${xs.length}</li>` + xs.map(ligne).join('') : ''; }).join('');
    nb = E.lignes.filter(x => (x.etat === 'manque' || x.etat === 'differe') && REF.coches.has(cle + '|' + cleLigne(x.ref))).length;
    bilan = CD ? `<p class="cp-bilan">Dessin <b class="cd-fwd">${esc(D.fwd)}</b>${SEP_POINT}${plurielLie(CD.nEquipements, 'équipement')}${SEP_POINT}<b>${CD.chezNous}</b>${INSECABLE}chez${INSECABLE}nous${CD.manquent.length ? SEP_POINT + 'il manque ' + CD.manquent.slice(0, 4).map(e => `<b>${esc(e.repere)}</b>${e.nature ? ' <i>' + esc(e.nature) + '</i>' : ''}`).join(', ') + (CD.manquent.length > 4 ? ' …' : '') : ''}${SEP_POINT}${compteMots(CD.compte)}</p>` : '';
  } else {
    // une ligne de la référence vue de l'équipement `e` de l'ensemble ; une ligne en plus, vue de son image chez nous
    const ligne = (x, e) => { if (x.ref) { const L = x.ref, amont = L.vers === e.repere && L.de !== e.repere, borne = amont ? L.borneVers : L.borneDe, autre = amont ? L.de : L.vers, bAutre = amont ? L.borneDe : L.borneVers;
        return `<li class="fi-fil cp-${x.etat}">${coche(x.etat, x.k)}<span class="fi-ct"><b>${esc(borne)}</b></span><span class="fi-w">${esc(L.type || '—')}</span><span class="fi-dest${amont ? ' amont' : ''}">${ico('fleche')}<span>${L.de === L.vers ? 'pontage' + bout(bAutre) : vers(autre) + bout(bAutre)}</span></span>`
          + (x.etat === 'differe' && x.notre ? `<span class="fi-ko">chez nous : ${esc(x.notre.type || '—')} · ${esc(x.notre.de)}${bout(x.notre.borneDe)} → ${esc(x.notre.vers)}${bout(x.notre.borneVers)}</span>` : '') + '</li>'; }
      const l = x.notre, amont = l.vers === e.vers && l.de !== e.vers, borne = amont ? l.borneVers : l.borneDe, autre = amont ? l.de : l.vers, bAutre = amont ? l.borneDe : l.borneVers;
      return `<li class="fi-fil cp-enplus"><span></span><span class="fi-ct"><b>${esc(borne)}</b></span><span class="fi-w">${esc(l.type || '—')}</span><span class="fi-dest${amont ? ' amont' : ''}">${ico('fleche')}<span>${esc(autre)}${bout(bAutre)}</span></span></li>`; };
    liste = C.equipements.map(e => `<li class="fi-groupe cp-eq cp-eq-${etatEquipement(e)}"><span class="cp-eq-rep">${repereHtml(e.repere)}</span><span class="cp-eq-mots">${esc(e.nature || 'équipement')}</span><span class="cp-eq-vers">${versMots(e)}</span><span class="cp-eq-n">${compteMots(e.compte)}</span></li>` + e.lignes.map(x => ligne(x, e)).join('')).join('');
    const uniques = new Map(); C.lignes.forEach(x => { if (x.k && (x.etat === 'manque' || x.etat === 'differe')) uniques.set(x.k, x); });
    nb = [...uniques.keys()].filter(k => REF.coches.has(cle + '|' + k)).length;
    bilan = `<p class="cp-bilan">${portee === 'dessin' ? 'Dessin' : 'Voisinage à ' + plurielLie(REF.pas, 'pas') + ' dans'} <b class="cd-fwd">${esc(D.fwd)}</b>${SEP_POINT}${plurielLie(C.nEquipements, 'équipement')}${SEP_POINT}<b>${C.chezNous}</b>${INSECABLE}chez${INSECABLE}nous${C.manquent.length ? SEP_POINT + 'il manque ' + C.manquent.slice(0, 4).map(e => `<b>${esc(e.repere)}</b>${e.nature ? ' <i>' + esc(e.nature) + '</i>' : ''}`).join(', ') + (C.manquent.length > 4 ? ' …' : '') : ''}${C.proposes.length ? `${SEP_POINT}${C.proposes.length}${INSECABLE}proposé${C.proposes.length > 1 ? 's' : ''} à confirmer` : ''}${SEP_POINT}${compteMots(C.compte)}</p>`;
  }
  const taux = portee === 'equipement' ? E.taux : C.taux, K = portee === 'equipement' ? E.compte : C.compte, niv = taux >= 0.8 ? 'ok' : taux >= 0.4 ? 'att' : 'ko';
  // l'échelle : un segment (équipement, voisinage, dessin) ; au voisinage, sa portée en pas, un second segment
  const portees = D ? `<div class="fi-puces cp-portee" role="group" aria-label="Échelle de la comparaison"><span class="cp-seg">${[['equipement', 'Équipement'], ['voisinage', 'Voisinage'], ['dessin', 'Dessin']].map(([p, t]) => `<button class="fi-chip" data-portee="${p}" aria-pressed="${p === portee}">${t}</button>`).join('')}</span>${portee === 'voisinage' ? `<span class="cp-pas-mot">relié à</span><span class="cp-seg">` + [1, 2].map(n => `<button class="fi-chip cp-pas" data-pas="${n}" aria-pressed="${REF.pas === n}">${n} pas</button>`).join('') + '</span>' : ''}</div>` : '';
  /* LE COUP D'ŒIL : le taux en grand, puis une barre où chaque état a sa longueur — vert ce que la machine a et pas
     nous (à reprendre), ambre ce qui diffère, gris ce qui est pareil, hachuré ce que nous avons en plus — et sa légende
     comptée ; le bilan du dessin dessous, en petit. */
  const ETATS = [['manque', 'manque chez nous', 'manquent chez nous'], ['differe', 'diffère', 'diffèrent'], ['identique', 'pareil', 'pareils'], ['enplus', 'en plus chez nous', 'en plus chez nous']].filter(([e]) => K[e]);
  const barre = ETATS.length ? `<div class="cp-barre" role="img" aria-label="${escA(compteMots(K))}">${ETATS.map(([e]) => `<i class="cp-b-${e}" style="flex-grow:${K[e]}"></i>`).join('')}</div>`
    + `<ul class="cp-legende">${ETATS.map(([e, un, plusieurs]) => `<li class="cp-l-${e}"><i aria-hidden="true"></i><b>${K[e]}</b>${INSECABLE}${K[e] > 1 ? plusieurs : un}</li>`).join('')}</ul>` : '';
  // ses repères chez nous : chaque puce est un bouton — un clic ouvre le choix (confirmer la proposition, ou la corriger)
  const corr = [...corrDe].filter(([r, m]) => m.sur !== 'cible' && m.sur !== 'repère').map(([r, m]) => `<button class="fi-chip cp-corr cp-corr-${m.sur}" data-corr="${escA(r)}" aria-pressed="${REF.corrOuverte === r}" aria-expanded="${REF.corrOuverte === r}" data-bulle="${escA((MOTS_SUR[m.sur] || m.sur) + ' — un clic pour confirmer ou changer')}">${esc(r)} → ${esc(m.vers)}${incertain(m.sur) ? ' ?' : m.sur === 'nouveau' ? ' (nouveau)' : m.sur === 'choisi' ? ' ✓' : ''}</button>`).join('');
  /* La tête : notre équipement (son nom ramène à sa fiche) contre celui de la machine, la machine en petit, × ferme. */
  return `<header class="fi-tete cp-tete"><div class="min0"><div class="cp-sur">Déjà fait${SEP_POINT}${esc(c.harness)}${h.appareil ? SEP_POINT + esc(h.appareil) : ''}${h.retest ? SEP_POINT + esc(h.retest) : ''}</div>`
    + `<div class="cp-nom"><button class="cp-retour" id="cp-retour" data-bulle="${escA('Revenir à la fiche de ' + c.nom)}">${esc(c.nom)}</button><span class="cp-contre">contre</span><span class="cp-ref">${esc(c.repere)}</span></div></div>`
    + `<button class="fi-x" id="in-fermer" aria-label="Fermer (Échap)" data-bulle="Fermer (Échap)">${ico('fermer')}</button></header>`
    + portees
    + `<section class="cp-resume"><div class="cp-taux-l"><b class="cp-taux ${niv}">${Math.round(taux * 100)}${INSECABLE}%</b><span>de lignes communes${portee === 'equipement' ? '' : portee === 'dessin' ? ', sur le dessin entier' : ', sur le voisinage'}</span></div>${barre}${bilan}</section>`
    + `<section class="fi-cadre cp-cadre"><ul class="fi-liste cp-liste">${liste}</ul>${corr ? `<div class="cp-corrs"><p class="fi-note fi-rac-t">Ses repères, chez nous — un clic confirme ou corrige</p><div class="fi-puces">${corr}</div>${choixDeRepereHtml(c, corrDe, F)}</div>` : ''}</section>`
    + `<p class="fi-note cp-note">Ce que cette machine a fait — pas forcément ce qu’il faut faire : ce qui est repris passe les mêmes contrôles que le reste. Les câbles repris n’ont pas encore de numéro.</p>`
    + `<footer class="fi-pied">${D ? `<button class="fi-bouton" id="cp-dessin" data-bulle="${escA('Voir le dessin ' + D.fwd + ' de ' + c.harness + ', dessiné par l’outil')}">${ico('voir')}<span>Dessin</span></button>` : ''}<button class="fi-bouton" id="cp-tout">${ico('tableau')}<span>Tout cocher</span></button><span class="espace"></span><button class="fi-bouton cuivre" id="cp-reprendre"${nb ? '' : ' disabled'}>${ico('fleche')}<span>Reprendre${nb ? ' ' + nb : ''}</span></button></footer>`; }
function lierComparaison(c) { const box = $('ba-equip'), I = indexReferences(), h = I && I.harnais.get(c.harness); lierBulles(box); if (!h) { $('in-fermer').onclick = () => deselectionner(); return; }
  const D = dessinDeComparaison(c), portee = D ? REF.portee : 'equipement', cle = cleComparaison(c, portee), F = fixesPour(c.harness);
  $('in-fermer').onclick = () => deselectionner();
  $('cp-retour').onclick = () => { app.cible = { type: 'bloc', nom: c.nom }; rendreFiche(); };
  box.querySelectorAll('.cp-portee [data-portee]').forEach(b => b.onclick = () => { REF.portee = b.dataset.portee; rendreFiche(); });
  box.querySelectorAll('.cp-portee [data-pas]').forEach(b => b.onclick = () => { REF.pas = +b.dataset.pas; rendreFiche(); });
  if ($('cp-dessin')) $('cp-dessin').onclick = () => ouvrirFwd({ harness: c.harness, fwd: D.fwd, repere: c.repere, notre: c.nom });
  box.querySelectorAll('.cp-coche').forEach(el => el.addEventListener('change', () => { const k = cle + '|' + el.dataset.k; if (el.checked) REF.coches.add(k); else REF.coches.delete(k); rendreFiche(); }));
  // les repères proposés : une puce ouvre le choix ; un choix (un des nôtres, ou « nouveau ») se garde et refait la fiche
  const refaire = () => { REF.corrTous = false; rendreFiche(); };
  box.querySelectorAll('.cp-corr[data-corr]').forEach(b => b.onclick = () => { REF.corrOuverte = REF.corrOuverte === b.dataset.corr ? '' : b.dataset.corr; refaire(); });
  box.querySelectorAll('.cp-cand[data-vers]').forEach(b => b.onclick = () => { const r = REF.corrOuverte; if (!r) return;
    REF.fixes.set(cleFixe(c.harness, r), b.dataset.vers ? { vers: b.dataset.vers, sur: 'choisi' } : { vers: r, sur: 'nouveau' }); REF.corrOuverte = ''; refaire(); });
  if ($('cp-corr-tous')) $('cp-corr-tous').onclick = () => { REF.corrTous = !REF.corrTous; rendreFiche(); };
  if ($('cp-corr-defaire')) $('cp-corr-defaire').onclick = () => { REF.fixes.delete(cleFixe(c.harness, REF.corrOuverte)); REF.corrOuverte = ''; refaire(); };
  // ce qui se coche, et ce qui se reprend : les lignes de l'équipement, ou les lignes uniques de l'ensemble
  let cochables, reprendre;
  if (portee === 'equipement') { const E = differentiel(verite(), c.nom, h.liaisons, c.repere, F);
    cochables = E.lignes.filter(x => x.etat === 'manque' || x.etat === 'differe').map(x => ({ k: cleLigne(x.ref), x }));
    reprendre = (xs, plan) => liaisonsAReprendre(E, c.nom, xs, plan); }
  else { const C = comparaisonDe(c.harness, D.fwd, c.repere, c.nom, portee, REF.pas), u = new Map(); C.lignes.forEach(x => { if (x.k && (x.etat === 'manque' || x.etat === 'differe')) u.set(x.k, x); });
    cochables = [...u].map(([k, x]) => ({ k, x })); reprendre = (xs, plan) => liaisonsDEnsembleAReprendre(C, xs, verite(), plan); }
  const aReprendre = () => cochables.filter(q => REF.coches.has(cle + '|' + q.k));
  $('cp-tout').onclick = () => { const tous = cochables.every(q => REF.coches.has(cle + '|' + q.k)); cochables.forEach(q => { const k = cle + '|' + q.k; if (tous) REF.coches.delete(k); else REF.coches.add(k); }); rendreFiche(); };
  $('cp-reprendre').onclick = () => { const qs = aReprendre(); if (!qs.length) return;
    const plan = plansDuRepere(c.nom)[0] || (app.plan !== '*' ? app.plan : ''), neuves = reprendre(qs.map(q => q.x), plan);
    histPush('reprise de ' + qs.length + ' ligne(s) de ' + c.harness + (portee === 'equipement' ? '' : ' (' + D.fwd + ')')); const cible = verite(); neuves.forEach(l => cible.push(l));
    qs.forEach(q => REF.coches.delete(cle + '|' + q.k)); app.cible = { type: 'bloc', nom: c.nom }; apresEdition(); dire(pluriel(neuves.length, 'liaison') + ' reprise' + (neuves.length > 1 ? 's' : '') + ' de ' + c.harness + ' : à numéroter, puis à vérifier.'); }; }

/* ---- LE DESSIN (FWD) : un calque plein écran, dessiné par le moteur -------------------------------------------- */
const FWD = { ouvert: false, D: null, repere: '', notre: '', L: null, dessin: null, cmp: null, choisi: '', q: '', vue: { s: 1, tx: 0, ty: 0 }, glisse: null };
const ICONES_FWD = { ajuster: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>', enregistrer: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', comparer: '<path d="M4 7h11M11 3l4 4-4 4M20 17H9M13 13l-4 4 4 4"/>' };
const icoFwd = k => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONES_FWD[k]}</svg>`;
/* Le calque, créé une fois : la tête (le dessin, sa machine, les outils), la scène, la colonne (qui dit ses chiffres,
   une fois). */
function assurerFwd() { if ($('fwd')) return; const d = document.createElement('div'); d.id = 'fwd'; d.className = 'fwd'; d.hidden = true; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'fw-titre');
  d.innerHTML = `<div class="fw-boite"><header class="fw-tete"><div class="min0"><div class="sur" id="fw-sur"></div><h2 class="titre" id="fw-titre"></h2></div>`
    + `<div class="fw-outils"><button class="fi-bouton" id="fw-comparer" hidden data-bulle="La comparaison de ce dessin entier avec notre contrat">${icoFwd('comparer')}<span>Comparer</span></button><button class="fi-bouton" id="fw-ajuster" data-bulle="Ajuster le dessin à l’écran (0)">${icoFwd('ajuster')}<span>Ajuster</span></button><button class="fi-bouton" id="fw-svg" data-bulle="Enregistrer ce dessin en SVG">${icoFwd('enregistrer')}<span>SVG</span></button></div>`
    + `<button class="fi-x" id="fw-fermer" aria-label="Fermer le dessin (Échap)">${ico('fermer')}</button></header>`
    + `<div class="fw-corps"><div class="fw-scene" id="fw-scene" data-bulle="Molette pour zoomer, glisser pour déplacer"></div><aside class="fw-colonne" id="fw-colonne" aria-label="Ce que le dessin contient"></aside></div></div>`;
  document.body.appendChild(d); lierFwd(); lierBulles(d); }
/* Ouvrir un dessin : `harness` et `fwd` le nomment ; `repere` (dans la machine) et `notre` (chez nous) disent ce qu'on
   compare, s'il y a lieu. Le dessin se calcule après que le calque s'est peint, et se garde. */
function ouvrirFwd(o) { const I = indexReferences(), D = I && dessinDe(I, o.harness, o.fwd); if (!D) { dire('Ce dessin n’est pas dans la base.', true); return; }
  assurerFwd(); Object.assign(FWD, { D, repere: o.repere || '', notre: o.notre || '', L: null, dessin: null, cmp: null, choisi: o.repere || '', q: '', ouvert: true });
  const d = $('fwd'); d.hidden = false; document.body.classList.add('fwd-ouvert');
  $('fw-sur').textContent = ['Dessin', D.harness, D.appareil, D.retest].filter(Boolean).join(SEP_POINT); $('fw-titre').textContent = D.fwd;
  $('fw-comparer').hidden = !(FWD.repere && FWD.notre);
  $('fw-scene').innerHTML = '<div class="fw-attente">Le moteur place et route le dessin…</div>'; $('fw-colonne').innerHTML = ''; $('fw-fermer').focus();
  setTimeout(() => { if (!FWD.ouvert || FWD.D !== D) return;
    try { FWD.cmp = verite().length ? comparaisonDe(D.harness, D.fwd, FWD.repere, FWD.notre, 'dessin') : null; } catch (_) { FWD.cmp = null; }
    dessinDuFwd(D).then(r => { if (!FWD.ouvert || FWD.D !== D) return; FWD.L = r.L; FWD.dessin = r.dessin; peindreFwd(); ajusterFwd(); colonneFwd(); })
      .catch(e => { if (FWD.D === D) $('fw-scene').innerHTML = `<div class="fw-attente">Le dessin n’a pas pu se faire : ${esc(String(e && e.message || e))}</div>`; }); }, 30); }
function fermerFwd() { const d = $('fwd'); if (!d || d.hidden) return; d.hidden = true; FWD.ouvert = false; document.body.classList.remove('fwd-ouvert'); $('fw-scene').innerHTML = ''; $('fw-colonne').innerHTML = ''; }
/* Le placement d'un gros dessin prend quelques secondes : il se calcule dans un Worker refait du moteur (comme
   l'affinage, 08), la page reste fluide ; sans Worker, dans la page. */
function placerAilleurs(L) { return new Promise(resolve => { let w = null;
  try { const src = document.getElementById('moteur').textContent;
    w = new Worker(URL.createObjectURL(new Blob([src + '\nself.onmessage = e => { try { postMessage({ P: meilleurPlacement(e.data) }); } catch (err) { postMessage({ erreur: String(err && err.message || err) }); } };'], { type: 'text/javascript' }))); }
  catch (_) { resolve(meilleurPlacement(L)); return; }
  w.onmessage = e => { w.terminate(); resolve(e.data && e.data.P ? e.data.P : meilleurPlacement(L)); }; w.onerror = () => { w.terminate(); resolve(meilleurPlacement(L)); };
  w.postMessage(L.map(({ origine, ...l }) => l)); }); }
/* Le dessin d'un FWD, exactement comme un folio (08, `calculer`) : ses dédoublements en barrettes à poser, le placement
   du concours, le routage, la feuille, les couleurs de ses routes. Gardé par dessin. */
async function dessinDuFwd(D) { if (REF.dessins.has(D.cle)) return REF.dessins.get(D.cle);
  const L = avecBarrettesAPoser(D.liaisons.filter(liaisonComplete)), P = await placerAilleurs(L); if (!P) throw new Error('rien à dessiner');
  const dessin = { comps: P.comps, links: P.links, bbox: pageDe(P.comps, P.routage.fils), geom: P.geom, compDe: P.compDe, fils: P.routage.fils, points: P.routage.points, barrettes: P.routage.barrettes, piquages: P.routage.piquages };
  // une route que le contrat ouvert connaît garde sa couleur ; les autres prennent la suite de la palette
  const routes = new Map(), connues = couleursDesRoutes(), prises = new Set(connues.values()); let k = 0;
  [...new Set(L.map(l => l.route).filter(Boolean))].sort(triNaturel).forEach(r => { if (connues.has(r)) { routes.set(r, connues.get(r)); return; } while (prises.has(PALETTE_ROUTES[k % PALETTE_ROUTES.length]) && k < PALETTE_ROUTES.length) k++; routes.set(r, PALETTE_ROUTES[k % PALETTE_ROUTES.length]); k++; });
  const routeDe = w => (L[w.i] && L[w.i].route) || ''; dessin.couleurDe = w => routes.get(routeDe(w)) || null;
  dessin.legende = legendeDesRoutes(dessin.fils.filter(w => !w.shunt && String(w.de) !== String(w.vers)), routeDe, routes); nommerBarrettesAPoser(dessin.barrettes, L);
  const r = { L, dessin }; if (REF.dessins.size > 8) REF.dessins.delete(REF.dessins.keys().next().value); REF.dessins.set(D.cle, r); return r; }
const cartoucheFwd = D => ({ titre: D.fwd, auteur: D.appareil || '', indice: '', date: D.retest || '', echelle: '—' });
const transformFwd = () => `translate(${f1(FWD.vue.tx)},${f1(FWD.vue.ty)}) scale(${FWD.vue.s.toFixed(4)})`;
function peindreFwd() { const d = FWD.dessin, D = FWD.D; if (!d) return; const des = descriptionsDe(D);
  $('fw-scene').innerHTML = `<svg id="fw-svg-dessin" xmlns="http://www.w3.org/2000/svg">${styleDessin()}<g id="fw-vue" transform="${transformFwd()}">${sceneSvg(d, cartoucheFwd(D), '1 / 1', n => des.get(n) || '', FWD.repere || null, n => { const e = D.equipements.get(n), f = e && e.pns.map(p => familleDuPn(p, app.norme)).find(Boolean); return { calibre: f ? f.calibre : null }; })}</g></svg>`;
  marquerFwd(); }
/* Ce que le dessin dit de chaque bloc : comparé (encadré), chez nous, proposé (à confirmer), manque chez nous ; et de
   chaque fil : manque chez nous, diffère — en pointillé, la couleur de la route reste. */
function marquerFwd() { const sc = $('fw-vue'); if (!sc) return; const C = FWD.cmp, etat = new Map();
  if (C) C.equipements.forEach(e => etat.set(e.repere, etatEquipement(e))); if (FWD.repere && !etat.has(FWD.repere)) etat.set(FWD.repere, 'cible');
  sc.querySelectorAll('.comp[data-name]').forEach(g => { const n = g.dataset.name, s = etat.get(n); g.classList.remove('fw-cible', 'fw-chez', 'fw-manque', 'fw-propose'); if (s) g.classList.add('fw-' + s); g.classList.toggle('fw-on', !!FWD.choisi && n === FWD.choisi); });
  const parCle = new Map(); if (C) C.lignes.forEach(x => { if (x.k) parCle.set(x.k, x.etat); });
  sc.querySelectorAll('.cab[data-i]').forEach(p => { const l = FWD.L && FWD.L[+p.dataset.i]; if (!l) return; const src = l.origine === undefined ? l : l.origine; if (!src) return;
    const s = parCle.get(cleRef(src)); p.classList.remove('fw-l-manque', 'fw-l-differe'); if (s === 'manque' || s === 'differe') p.classList.add('fw-l-' + s); }); }
// la vue : ajuster la feuille à la scène, zoomer, déplacer, aller sur un bloc
function appliquerVueFwd() { const g = $('fw-vue'); if (g) g.setAttribute('transform', transformFwd()); }
function ajusterFwd() { const d = FWD.dessin, sc = $('fw-scene'); if (!d || !sc) return; const bb = d.bbox, W = sc.clientWidth || 800, H = sc.clientHeight || 600, m = 16;
  const s = Math.max(0.02, Math.min(6, Math.min((W - 2 * m) / bb.w, (H - 2 * m) / bb.h))); FWD.vue = { s, tx: (W - bb.w * s) / 2 - bb.x * s, ty: (H - bb.h * s) / 2 - bb.y * s }; appliquerVueFwd(); }
function zoomerFwd(k, mx, my) { const sc = $('fw-scene'), r = sc.getBoundingClientRect(); if (mx == null) { mx = r.width / 2; my = r.height / 2; }
  const v = FWD.vue, wx = (mx - v.tx) / v.s, wy = (my - v.ty) / v.s, ns = Math.max(0.02, Math.min(8, v.s * k)); FWD.vue = { s: ns, tx: mx - wx * ns, ty: my - wy * ns }; appliquerVueFwd(); }
function viserFwd(nom) { const d = FWD.dessin, c = d && d.comps.find(k => k.name === nom && k.kind !== 'tag') || (d && d.compDe.get(nom)); if (!c) return;
  const sc = $('fw-scene'), W = sc.clientWidth, H = sc.clientHeight, s = Math.max(FWD.vue.s, Math.min(1.2, Math.min(W / (c.w + 160), H / (c.h + 160))));
  FWD.vue = { s, tx: W / 2 - (c.x + c.w / 2) * s, ty: H / 2 - (c.y + c.h / 2) * s }; appliquerVueFwd(); }
function choisirDansFwd(nom, aller) { FWD.choisi = nom || ''; marquerFwd(); const col = $('fw-colonne');
  col.querySelectorAll('.fw-eq').forEach(li => li.classList.toggle('on', li.dataset.nom === FWD.choisi));
  const li = col.querySelector('.fw-eq.on'); if (li && li.scrollIntoView) { try { li.scrollIntoView({ block: 'nearest' }); } catch (_) { } }
  if (aller && nom) viserFwd(nom); }
/* LA COLONNE qui explique le dessin : ses chiffres (lus comme un instrument, en B612), ce qu'il contient (par nature),
   le bilan contre notre contrat, la légende, puis
   chaque équipement — le repère décodé, sa description et son part number, ce qu'il devient chez nous, ce qui lui est
   relié, ses lignes (pareilles, différentes, manquantes). Le comparé d'abord, puis ce qui manque, puis le reste. */
function colonneFwd() { const D = FWD.D, C = FWD.cmp, R = resumeDessin(D), des = descriptionsDe(D), parRep = new Map((C ? C.equipements : []).map(e => [e.repere, e]));
  const chiffres = `<div class="fw-chiffres"><span><b>${R.equipements}</b> équipement${R.equipements > 1 ? 's' : ''}</span><span><b>${R.fils}</b> câble${R.fils > 1 ? 's' : ''}</span>${R.pontages ? `<span><b>${R.pontages}</b> pontage${R.pontages > 1 ? 's' : ''}</span>` : ''}${R.masses ? `<span><b>${R.masses}</b> masse${R.masses > 1 ? 's' : ''}</span>` : ''}</div>`
    + `<p class="fw-natures">${esc(R.natures.map(([n, k]) => k + ' ' + plurielNature(n === 'équipement' && R.natures.length > 1 ? 'autre équipement' : n, k)).join(', '))}${R.masses ? ' · ' + esc([...D.masses.keys()].sort(triNaturel).join(', ')) : ''}</p>`;
  const bilan = C ? `<div class="fw-bilan"><span class="fw-pastille chez"><b>${C.chezNous}</b> chez nous</span>${C.manquent.length ? `<span class="fw-pastille manque"><b>${C.manquent.length}</b> manque${C.manquent.length > 1 ? 'nt' : ''}</span>` : ''}${C.proposes.length ? `<span class="fw-pastille propose"><b>${C.proposes.length}</b> à confirmer</span>` : ''}${C.compte.differe ? `<span class="fw-pastille differe"><b>${C.compte.differe}</b> câble${C.compte.differe > 1 ? 's' : ''} diffère${C.compte.differe > 1 ? 'nt' : ''}</span>` : ''}${C.compte.manque ? `<span class="fw-pastille fil-manque"><b>${C.compte.manque}</b> câble${C.compte.manque > 1 ? 's' : ''} manque${C.compte.manque > 1 ? 'nt' : ''}</span>` : ''}${C.compte.enplus ? `<span class="fw-pastille enplus"><b>${C.compte.enplus}</b> en plus chez nous</span>` : ''}</div>`
    + `<ul class="fw-legende">${FWD.repere ? '<li><i class="cible"></i>comparé</li>' : ''}<li><i class="chez"></i>chez nous</li><li><i class="propose"></i>proposé, à confirmer</li><li><i class="manque"></i>manque chez nous</li><li><i class="fil-manque"></i>câble qui manque</li><li><i class="fil-differe"></i>câble qui diffère</li></ul>` : '<p class="fw-natures">Aucun contrat ouvert : rien à comparer, le dessin se lit tel quel.</p>';
  const cherche = `<div class="fw-cherche">${ico('loupe')}<input id="fw-q" value="${escA(FWD.q)}" placeholder="Un repère, une nature, un part number" aria-label="Chercher dans le dessin" autocomplete="off" spellcheck="false"></div>`;
  $('fw-colonne').innerHTML = `<div class="fw-resume">${chiffres}${bilan}</div>${cherche}<ul class="fw-liste" id="fw-liste">${listeFwdHtml(parRep, des)}</ul>`;
  const q = $('fw-q'); q.addEventListener('input', () => { FWD.q = q.value; $('fw-liste').innerHTML = listeFwdHtml(parRep, des); }); }
function listeFwdHtml(parRep, des) { const D = FWD.D, t = FWD.q.trim().toLowerCase(), rang = { cible: 0, manque: 1, propose: 2, chez: 3, '': 4 };
  const items = [...D.equipements.values()].map(e => ({ e, c: parRep.get(e.repere) || null, etat: parRep.has(e.repere) ? etatEquipement(parRep.get(e.repere)) : (e.repere === FWD.repere ? 'cible' : '') }))
    .filter(x => !t || x.e.repere.toLowerCase().includes(t) || (x.e.nature || '').includes(t) || direRepere(x.e.repere).toLowerCase().includes(t) || x.e.pns.some(p => p.toLowerCase().includes(t)) || (des.get(x.e.repere) || '').toLowerCase().includes(t))
    .sort((u, v) => rang[u.etat] - rang[v.etat] || triNaturel(u.e.repere, v.e.repere));
  if (!items.length) return '<li class="fw-vide">Rien qui corresponde.</li>';
  return items.map(({ e, c, etat }) => { const vs = [...e.voisins].sort((u, v) => v[1] - u[1] || triNaturel(u[0], v[0])), masses = vs.filter(([r]) => estMasse(r)), autres = vs.filter(([r]) => !estMasse(r));
    const relie = autres.length ? 'relié à ' + autres.slice(0, 6).map(([r, n]) => `<b>${esc(r)}</b>${n > 1 ? ` <i>(${n} câbles)</i>` : ''}`).join(', ') + (autres.length > 6 ? ` <i>et ${autres.length - 6} autres</i>` : '') : 'relié à rien d’autre';
    const sous = [e.pns.join(', '), des.get(e.repere) || ''].filter(Boolean).map(esc).join(' · ');
    return `<li class="fw-eq ${etat || 'neutre'}${e.repere === FWD.choisi ? ' on' : ''}" data-nom="${escA(e.repere)}" tabindex="0" role="button" data-bulle="${escA('Voir ' + e.repere + ' sur le dessin')}"><span class="fw-eq-etat" aria-hidden="true"></span><span class="fw-eq-corps">`
      + `<span class="fw-eq-tete">${repereHtml(e.repere)}<span class="fw-eq-mots">${esc(direRepere(e.repere))}</span></span>${sous ? `<span class="fw-eq-sous">${sous}</span>` : ''}`
      + (c ? `<span class="fw-eq-vers">${versMots(c)}</span>` : '') + `<span class="fw-eq-pos">${relie}${masses.length ? ' · masse ' + masses.map(([r]) => esc(r)).join(', ') : ''}${e.pontages ? ' · ' + pluriel(e.pontages, 'pontage') : ''}</span>`
      + `<span class="fw-eq-n">${e.lignes.length} câble${e.lignes.length > 1 ? 's' : ''}${c ? ' : ' + compteMots(c.compte) : ''}</span></span></li>`; }).join(''); }
// les gestes du calque : fermer, ajuster, enregistrer, comparer ; zoomer, déplacer ; un bloc ou une ligne choisit
function lierFwd() { const d = $('fwd'), sc = $('fw-scene');
  $('fw-fermer').onclick = fermerFwd; $('fw-ajuster').onclick = ajusterFwd;
  $('fw-svg').onclick = () => { if (!FWD.dessin) return; const des = descriptionsDe(FWD.D), S = svgAutonome(FWD.dessin, cartoucheFwd(FWD.D), '1 / 1', n => des.get(n) || '', null, n => { const e = FWD.D.equipements.get(n), f = e && e.pns.map(p => familleDuPn(p, app.norme)).find(Boolean); return { calibre: f ? f.calibre : null }; });
    telecharger(new Blob([S.txt], { type: 'image/svg+xml;charset=utf-8' }), (FWD.D.harness + '-' + FWD.D.fwd).replace(/[^\w.-]+/g, '_') + '.svg'); dire('Dessin enregistré en SVG.'); };
  $('fw-comparer').onclick = () => { if (!(FWD.repere && FWD.notre)) return; const o = { type: 'ref', nom: FWD.notre, harness: FWD.D.harness, repere: FWD.repere, fwd: FWD.D.fwd }; fermerFwd(); REF.portee = 'dessin'; app.cible = o; ouvrirInspecteur(); };
  d.addEventListener('click', e => { if (e.target === d) fermerFwd(); });
  sc.addEventListener('wheel', e => { e.preventDefault(); const r = sc.getBoundingClientRect(); zoomerFwd(Math.exp(-e.deltaY * 0.0014), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  sc.addEventListener('pointerdown', e => { if (e.button) return; FWD.glisse = { x: e.clientX, y: e.clientY, tx: FWD.vue.tx, ty: FWD.vue.ty, bouge: false }; try { sc.setPointerCapture(e.pointerId); } catch (_) { } });
  sc.addEventListener('pointermove', e => { const g = FWD.glisse; if (!g) return; if (Math.abs(e.clientX - g.x) > 3 || Math.abs(e.clientY - g.y) > 3) g.bouge = true; if (!g.bouge) return;
    FWD.vue.tx = g.tx + (e.clientX - g.x); FWD.vue.ty = g.ty + (e.clientY - g.y); sc.classList.add('tient'); appliquerVueFwd(); });
  const fin = e => { const g = FWD.glisse; FWD.glisse = null; sc.classList.remove('tient'); if (!g || g.bouge) return;
    const c = e.target.closest && e.target.closest('.comp[data-name]'); choisirDansFwd(c ? c.dataset.name : '', false); };
  sc.addEventListener('pointerup', fin); sc.addEventListener('pointercancel', () => { FWD.glisse = null; sc.classList.remove('tient'); });
  sc.addEventListener('mouseover', e => { const c = e.target.closest && e.target.closest('.comp[data-name]'); $('fw-colonne').querySelectorAll('.fw-eq.vise').forEach(li => li.classList.remove('vise'));
    if (c) { const li = $('fw-colonne').querySelector(`.fw-eq[data-nom="${CSS.escape(c.dataset.name)}"]`); if (li) li.classList.add('vise'); } });
  const col = $('fw-colonne'); col.addEventListener('click', e => { const li = e.target.closest('.fw-eq'); if (li) choisirDansFwd(li.dataset.nom, true); });
  col.addEventListener('keydown', e => { const li = e.target.closest && e.target.closest('.fw-eq'); if (li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); choisirDansFwd(li.dataset.nom, true); } });
  col.addEventListener('mouseover', e => { const li = e.target.closest('.fw-eq'); const sv = $('fw-vue'); if (!sv) return; sv.querySelectorAll('.comp.fw-vise').forEach(g => g.classList.remove('fw-vise'));
    if (li) sv.querySelectorAll('.comp[data-name]').forEach(g => { if (g.dataset.name === li.dataset.nom) g.classList.add('fw-vise'); }); }); }

/* ---- COMPARER UN RETEST ENTIER AU DÉJÀ-FAIT ---------------------------------------------------------------------------
   Le lecteur : « comparer au déjà-fait — ce qui est pareil, ce qui diffère ». Ce qui existait ne le faisait qu'équipement
   par équipement (« Déjà fait » sur la fiche, et la comparaison à trois échelles) ; un nouveau retest ne se comparait pas
   EN ENTIER. Le document « Déjà fait » le fait : les contrats de la base les plus proches du plan ouvert (09,
   `contratsProches` : chaque ligne réduite à ses deux bouts, leurs bornes, le type — nos repères tels quels, ou sans la zone
   pour une autre machine), puis, pour celui qu'on choisit, chaque ligne jugée (09, `comparerAuContrat` : les repères
   correspondus d'un bloc) et rangée sous son dessin : ce qui manque chez nous, ce qui diffère, ce que nous avons en plus — ce
   qui est pareil compté, replié. Un repère mène au plan ; « Dessin » ouvre le FWD de la machine ; « Ouvrir ce contrat » le
   met sur la table. À l'ouverture d'un retest, le plus proche se propose dans le mot qui passe (« Comparer »). */
function harnessDuPlan(V) { const l = V.find(x => x.harness); return l ? l.harness : ''; }
function contratsLesPlusProches() { const I = indexReferences(), V = verite(); if (!I || !V.length) return [];
  const k = empreinteContrat() + '|' + (app.references.t || 0); if (REF.proches && REF.proches.k === k) return REF.proches.cands;
  const moi = harnessDuPlan(V), cands = contratsProches(I, V, 4, h => !!moi && h.harness === moi);
  REF.proches = { k, cands }; return cands; }
function comparaisonAuContrat(h) { const I = indexReferences(), H = I && I.harnais.get(h); if (!H) return null; const k = ['contrat', h, empreinteContrat(), JSON.stringify([...fixesPour(h)])].join('\u0001');
  if (REF.cmp.has(k)) return REF.cmp.get(k); const C = comparerAuContrat(verite(), H, fixesPour(h)); if (REF.cmp.size > 40) REF.cmp.delete(REF.cmp.keys().next().value); REF.cmp.set(k, C); return C; }
// le plus proche se propose, une fois le retest ouvert (et dessiné) : « Déjà fait à 85 % : … — Comparer »
function proposerDejaFait() { const jeton = BASE.jeton, nom = app.nom; setTimeout(() => { if (jeton !== BASE.jeton || app.nom !== nom || !indexReferences() || bibliothequeOuverte()) return;
  const c = contratsLesPlusProches()[0]; if (!c || c.taux < 0.2) return;
  direAvecGeste(`Déjà fait à ${Math.round(c.taux * 100)}${INSECABLE}% : ${c.harness}${c.appareil ? ' (' + c.appareil + (c.retest ? ', installation du ' + c.retest : '') + ')' : ''}.`, 'Comparer', () => { REF.choisi = c.harness; ficheDejaFaitContrat(); }); }, 1200); }
function ficheDejaFaitContrat() { const R = app.references, I = indexReferences(), V = verite(), K = BASE.construction;
  let corps = tete('Le plan ouvert contre la base', 'Déjà fait'), pied = '';
  if (!R) corps += '<p class="note">Aucune base des contrats déjà faits dans ce navigateur : déposez-la dans ⋮ → Vos fichiers → Contrats déjà faits (un Excel aux colonnes de l’installation, Harness rempli).</p>';
  else if (!V.length) corps += '<p class="note">Aucun plan ouvert : ouvrez une installation, puis comparez-le au déjà-fait.</p>';
  else if (!I) corps += `<p class="note">La base s’indexe${K && K.total ? ' (' + Math.round(100 * K.fait / K.total) + ' %)' : ''} : la comparaison sera prête dans un instant.</p>`;
  else { const cs = contratsLesPlusProches(); if (!REF.choisi || !cs.some(c => c.harness === REF.choisi)) REF.choisi = cs.length ? cs[0].harness : '';
    if (!cs.length) corps += `<p class="note">Aucun contrat de la base ne partage un repère ou un part number avec ${esc(guillemets(app.nom || 'le plan'))}.</p>`;
    else { const C = comparaisonAuContrat(REF.choisi), H = I.harnais.get(REF.choisi); corps += ccCandidatsHtml(cs) + (C ? ccDetailHtml(C, H) : '');
      pied = `<button class="btn papier" id="cc-ouvrir">Ouvrir ${esc(REF.choisi)}</button><span class="espace"></span>${C && C.dessins.some(d => d.fwd[0] !== '\u0001') ? `<span class="cc-pied-note">${esc(plurielLie(C.dessins.filter(d => d.fwd[0] !== '\u0001').length, 'dessin'))} : « Dessin » sur chacun</span>` : ''}`; } }
  ouvrirFiche({ mode: 'deja-contrat', large: true }, corps, pied); lierDejaFaitContrat(); }
// les plus proches : un bouton chacun, son taux, ses mots ; celui qu'on regarde est pressé
function ccCandidatsHtml(cs) { const B = baseDeReferences();
  return `<p class="cc-lead">Les contrats de la base les plus proches de <b>${esc(nomAffiche(app.nom || 'ce plan'))}</b> — leur ressemblance : la part des lignes que les deux contrats ont en commun (chaque ligne réduite à ses deux bouts, leurs bornes, le type de câble).</p><div class="cc-cands" role="group" aria-label="Les plus proches">`
    + cs.map(c => { const k = B && contratDeLaBase(B, c.harness), niv = c.taux >= 0.8 ? 'ok' : c.taux >= 0.4 ? 'att' : 'ko';
      return `<button class="cc-cand" data-h="${escA(c.harness)}" aria-pressed="${c.harness === REF.choisi}"><b class="cc-taux ${niv}">${Math.round(c.taux * 100)}${INSECABLE}%</b><span class="cc-cand-t"><span class="id">${esc(c.harness)}</span><small>${esc(lies([k && k.install, c.appareil, c.retest ? 'installation du ' + c.retest : '', plurielLie(c.lignes, 'ligne'), c.parZone ? 'une autre zone' : '']))}</small></span></button>`; }).join('') + '</div>'; }
function ccDetailHtml(C, H) { const K = C.compte, ETATS = [['manque', 'manque chez nous', 'manquent chez nous'], ['differe', 'diffère', 'diffèrent'], ['identique', 'pareille', 'pareilles'], ['enplus', 'en plus chez nous', 'en plus chez nous']].filter(([e]) => K[e]);
  const image = r => { const m = C.correspondance.get(r); return m ? m.vers : r; }, bout = (r, b) => `<span class="id">${esc(r)}${b ? ':' + esc(b) : ''}</span>`;
  const barre = `<div class="cp-barre" role="img" aria-label="${escA(compteMots(K))}">${ETATS.map(([e]) => `<i class="cp-b-${e}" style="flex-grow:${K[e]}"></i>`).join('')}</div><ul class="cp-legende">${ETATS.map(([e, un, plus]) => `<li class="cp-l-${e}"><i aria-hidden="true"></i><b>${K[e]}</b>${INSECABLE}${K[e] > 1 ? plus : un}</li>`).join('')}</ul>`;
  const manquent = C.manquent.slice(0, 6).map(e => `<b class="id">${esc(e.repere)}</b>${e.nature ? ' <i>' + esc(e.nature) + '</i>' : ''}`).join(', ') + (C.manquent.length > 6 ? ' …' : '');
  const resume = `<p class="cc-resume">${esc(plurielLie(C.nEquipements, 'équipement'))} chez ${esc(H.harness)}${SEP_POINT}<b>${C.chezNous}</b>${INSECABLE}chez${INSECABLE}nous${C.manquent.length ? SEP_POINT + 'il manque ' + manquent : ''}${C.proposes.length ? `${SEP_POINT}${C.proposes.length}${INSECABLE}repère${C.proposes.length > 1 ? 's' : ''} proposé${C.proposes.length > 1 ? 's' : ''} à confirmer` : ''}</p>`;
  // une ligne : ses deux bouts chez nous (leur repère chez eux quand il diffère), le type, le câble ; « diffère » dit les deux
  const ligne = x => { if (x.etat === 'enplus') { const l = x.notre; return `<li class="cc-l cc-enplus"><span class="cc-e">en plus</span><button class="cc-bout" data-rep="${escA(l.de)}">${bout(l.de, l.borneDe)}</button><span aria-hidden="true">→</span><button class="cc-bout" data-rep="${escA(l.vers)}">${bout(l.vers, l.borneVers)}</button><span class="cc-x">${esc(lies([l.type, l.cable]))}</span></li>`; }
    const L = x.ref, a = image(L.de), b = image(L.vers), eux = [a !== L.de ? L.de : '', b !== L.vers ? L.vers : ''].filter(Boolean);
    return `<li class="cc-l cc-${x.etat}"><span class="cc-e">${x.etat === 'manque' ? 'manque' : x.etat === 'differe' ? 'diffère' : 'pareille'}</span><button class="cc-bout" data-rep="${escA(a)}">${bout(a, L.borneDe)}</button><span aria-hidden="true">→</span><button class="cc-bout" data-rep="${escA(b)}">${bout(b, L.borneVers)}</button><span class="cc-x">${esc(lies([L.type, L.cable ? 'chez eux ' + L.cable : '', eux.length ? '(' + eux.join(', ') + ' chez eux)' : '']))}</span>`
      + (x.etat === 'differe' && x.notre ? `<span class="cc-nous">chez nous : ${esc(lies([x.notre.type || 'sans type', x.notre.de + (x.notre.borneDe ? ':' + x.notre.borneDe : '') + ' → ' + x.notre.vers + (x.notre.borneVers ? ':' + x.notre.borneVers : ''), x.notre.cable]))}</span>` : '') + '</li>'; };
  const ordre = { manque: 0, differe: 1, enplus: 2, identique: 3 };
  const dessin = d => { const nous = d.fwd[0] === '\u0001', xs = d.lignes.filter(x => x.etat !== 'identique').sort((u, v) => ordre[u.etat] - ordre[v.etat]), id = d.lignes.length - xs.length;
    return `<section class="cc-dessin${xs.length ? '' : ' cc-pareil'}"><div class="cc-d-tete"><b class="${nous ? '' : 'id'}">${esc(nous ? 'Chez nous seulement' + (d.fwd.slice(1) ? ', folio ' + d.fwd.slice(1) : '') : d.fwd)}</b><span>${esc(compteMots(d.compte))}</span>${nous ? '' : `<button class="btn lien cc-fwd" data-fwd="${escA(d.fwd)}">Dessin</button>`}</div>`
      + (xs.length ? `<ul class="cc-lignes">${xs.map(ligne).join('')}</ul>` : '') + (id ? `<p class="cc-pareilles">${id === d.lignes.length ? 'Tout est pareil' : '+' + INSECABLE + id + INSECABLE + (id > 1 ? 'pareilles' : 'pareille')}</p>` : '') + '</section>'; };
  return `<section class="cp-resume cc-detail"><div class="cp-taux-l"><b class="cp-taux ${C.taux >= 0.8 ? 'ok' : C.taux >= 0.4 ? 'att' : 'ko'}">${Math.round(C.taux * 100)}${INSECABLE}%</b><span>de ses lignes pareilles chez nous${INSECABLE}: <b>${K.identique}</b> sur ${K.identique + K.differe + K.manque}</span></div>${barre}${resume}</section>`
    + C.dessins.map(dessin).join(''); }
function lierDejaFaitContrat() { const c = $('fiche-corps');
  c.querySelectorAll('.cc-cand').forEach(b => b.onclick = () => { REF.choisi = b.dataset.h; ficheDejaFaitContrat(); });
  c.querySelectorAll('.cc-bout').forEach(b => b.onclick = () => { const r = b.dataset.rep; if (!reperesDe(verite()).includes(r)) { dire(guillemets(r) + ' n’est pas dans le plan ouvert : il manque chez nous.'); return; } aller({ type: 'repere', nom: r }); });
  c.querySelectorAll('.cc-fwd').forEach(b => b.onclick = () => ouvrirFwd({ harness: REF.choisi, fwd: b.dataset.fwd }));
  const o = $("cc-ouvrir"); if (o) o.onclick = () => { const h = REF.choisi; fermerFiche(); ouvrirContratTrouve(h); }; }

/* ---- LA BIBLE : la base par harness et par dessin, une recherche ---------------------------------------------- */
function ficheReferences() { const R = app.references, I = indexReferences(), M = R && R.base ? R.base.meta : null, K = BASE.construction;
  const etat = !R || !M ? '<div class="bible-etat"><span><b>Aucun contrat déjà fait</b> : la base se dépose dans ⋮ → Vos fichiers → Contrats déjà faits (un Excel aux colonnes de l’installation, Harness rempli) ; elle se garde dans ce navigateur, rien ne part sur le réseau.</span></div>'
    : `<div class="bible-etat"><span><b>${esc(R.nom || 'Contrats déjà faits')}</b>${SEP_POINT}${plurielLie(M.harnais, 'harness')}${SEP_POINT}${plurielLie(M.dessins, 'dessin')}${SEP_POINT}${plurielLie(M.n, 'liaison')}${SEP_POINT}gardés dans ce navigateur${I ? '' : `${SEP_POINT}« Déjà fait » s’indexe${K && K.total ? ' (' + Math.round(100 * K.fait / K.total) + INSECABLE + '%)' : ''}`}</span></div>`;
  return `<h3 class="sous-titre">Les contrats déjà faits</h3>${etat}` + (I ? `<div id="rf-base">${rfBaseHtml()}</div>` : '')
    + '<p class="note">Pour un équipement du contrat, sa fiche dit les trois machines les plus proches (même part number, sinon même code), le taux de lignes communes, et le dessin (FWD) où il apparaît ; la comparaison — l’équipement, son voisinage, le dessin entier — montre ce qu’elles ont en plus, ce qui diffère, et reprend ce qu’on coche ; « Dessin » ouvre le FWD dessiné par l’outil. « La solution du PH n’est pas forcément la bonne » : ce qui est repris passe les mêmes contrôles que le reste.</p>'; }
function rfBaseHtml() { const I = indexReferences(); if (!I) return ''; const Q = chercherReferences(I, REF.q, 80), t = s => `<div class="sur rf-sur">${s}</div>`;
  const cherche = `<div class="filtre rf-cherche">${ico('loupe')}<input id="rf-q" value="${escA(REF.q)}" placeholder="Chercher un harness, un dessin (FWD), un appareil, un repère" aria-label="Chercher dans les contrats déjà faits" autocomplete="off" spellcheck="false"></div>`;
  // le nom d'un dessin est le bouton qui l'ouvre ; une table large défile de côté (`.norme-defile`, comme la norme)
  const voir = (h, fwd, rep) => `<button class="rf-voir" data-h="${escA(h)}" data-fwd="${escA(fwd)}"${rep ? ` data-rep="${escA(rep)}"` : ''} data-bulle="${escA('Voir le dessin ' + fwd + ' de ' + h + (rep ? ', ' + rep + ' en évidence' : ''))}">${ico('voir')}<span>${esc(fwd)}</span></button>`;
  // une colonne de chiffres (ou de dates) se range à droite, son en-tête avec elle : `droite('Fils')`
  const droite = x => ({ d: x }), table = (th, lignes) => `<div class="norme-defile"><table class="norme rf-tab"><thead><tr>${th.map(x => x.d ? `<th class="d">${x.d}</th>` : `<th>${x}</th>`).join('')}</tr></thead><tbody>${lignes}</tbody></table></div>`;
  const harnais = Q.harnais.length ? t('Par harness · ' + Q.harnais.length) + table(['Harness', 'Appareil', droite('Retest'), droite('Dessins'), droite('Équipements'), droite('Liaisons')],
    Q.harnais.sort((a, b) => triNaturel(a.harness, b.harness)).map(h => `<tr><td class="ref">${esc(h.harness)}</td><td class="sans">${esc(h.appareil || '—')}</td><td class="d">${esc(h.retest || '—')}</td><td class="d">${h.dessins.length}</td><td class="d">${h.equipements.size}</td><td class="d">${h.liaisons.length}</td></tr>`).join('')) : '';
  const dessins = Q.dessins.length ? t('Par dessin (FWD) · ' + Q.dessins.length) + table(['Dessin', 'Harness', 'Appareil', droite('<span data-bulle="Équipements">Équip.</span>'), droite('Câbles')],
    Q.dessins.sort((a, b) => triNaturel(a.fwd, b.fwd) || triNaturel(a.harness, b.harness)).map(d => `<tr><td class="ref">${voir(d.harness, d.fwd)}</td><td>${esc(d.harness)}</td><td class="sans">${esc(d.appareil || '—')}</td><td class="d">${d.equipements.size}</td><td class="d">${d.fils}</td></tr>`).join('')) : '';
  const equipements = Q.equipements.length ? t('Repères · ' + Q.equipements.length) + table(['Repère', 'Nature', 'Part number', 'Dessin', droite('Câbles')],
    Q.equipements.map(x => `<tr><td class="ref">${repereHtml(x.e.repere)}</td><td class="sans">${esc(direRepere(x.e.repere).replace(/ · zone .*$/, ''))}</td><td>${esc(x.e.pns.join(', ') || '—')}</td><td>${voir(x.harness, x.fwd, x.e.repere)}<div class="rf-sous">${esc(x.harness)}${x.appareil ? ' · ' + esc(x.appareil) : ''}</div></td><td class="d">${x.e.lignes.length}</td></tr>`).join('')) : '';
  return cherche + harnais + dessins + equipements + (!Q.total ? '<p class="note">Rien qui corresponde.</p>' : '') + (Q.plus ? `<p class="note">… et ${Q.plus} de plus — précisez la recherche.</p>` : ''); }
/* Les gestes de la bible, posés une fois sur le document (la bible se refait sans nous) : la recherche refait la base
   sous les doigts, « Dessin » ouvre le calque ; et le clavier du calque, avant tout le monde : Échap ferme, 0 ajuste,
   + et − zooment, le reste lui appartient. */
function lierReferencesUneFois() { if (REF.lie || typeof document === 'undefined') return; REF.lie = true;
  // les bulles des documents (la bible, « Déjà fait » à l'échelle du contrat) : celles de l'outil, pas celles du navigateur
  if ($('fiche-corps') && typeof lierBulles === 'function') lierBulles($('fiche-corps'));
  document.addEventListener('input', e => { const q = e.target; if (!q || q.id !== 'rf-q') return; REF.q = q.value; const box = $('rf-base'); if (!box) return;
    const pos = q.selectionStart; box.innerHTML = rfBaseHtml(); const q2 = $('rf-q'); if (q2) { q2.focus(); try { q2.setSelectionRange(pos, pos); } catch (_) { } } });
  document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('.rf-voir'); if (!b) return; e.preventDefault(); e.stopPropagation(); ouvrirFwd({ harness: b.dataset.h, fwd: b.dataset.fwd, repere: b.dataset.rep || '' }); }, true);
  window.addEventListener('keydown', e => { if (!FWD.ouvert) return; const dansChamp = /^(INPUT|TEXTAREA)$/.test((e.target && e.target.tagName) || '');
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (dansChamp && e.target.value) { e.target.value = ''; e.target.dispatchEvent(new Event('input')); return; } fermerFwd(); return; }
    if (dansChamp) { e.stopPropagation(); return; }
    if (e.key === '0' || e.key === 'f') ajusterFwd(); else if (e.key === '+' || e.key === '=') zoomerFwd(1.25); else if (e.key === '-') zoomerFwd(1 / 1.25);
    e.stopPropagation(); }, true); }
lierReferencesUneFois();
