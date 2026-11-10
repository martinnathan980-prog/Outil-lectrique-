'use strict';
/* ===========================================================================
   08 — LA SAUVEGARDE D'ENSEMBLE (v88)

   Le lecteur, à l'état des lieux du 9 novembre 2026 : « Ton travail n'a aucune sauvegarde d'ensemble : faut le faire. »
   Tout ce que VOLTA garde vit dans le navigateur — les installations et leurs plans (ce qu'on y a réglé, déplacé,
   écrit), la base des plans déjà faits, les normes et la bible importées, les hypothèses, le carnet. Un navigateur
   vidé, un poste changé : tout partait.

       ⋮ › Réglages › Sauvegarde

   · « Tout sauvegarder » fabrique UN fichier (`VOLTA-sauvegarde-2026-11-10.volta` : du JSON compressé), que le lecteur
     range où il veut. Rien ne part nulle part : le fichier s'enregistre comme un export.
   · « Restaurer » relit ce fichier, dit ce qu'il porte et ce qu'il remplace, et — après un oui — remet le navigateur
     dans cet état, puis recharge VOLTA.

   CE QUI N'Y EST JAMAIS : les réglages de l'IA interne (son adresse, son modèle, sa clé) et sa file d'attente — la
   charte : « jamais dans un export ». Une restauration ne les touche pas non plus.

   Le fichier : { format, version, quand, volta, resume, bases: { nom: { version, magasins: { nom: { keyPath,
   autoIncrement, cles, valeurs } } } }, local: { clé: texte } }. Les valeurs que le JSON ne sait pas dire (une date, un
   tableau d'octets, une Map…) sont emballées ({ $v: 'date', v }) et déballées au retour.
   =========================================================================== */
const SAUVEGARDE = { format: 'volta-sauvegarde', version: 1, cle: 'volta.sauvegarde.quand', bases: ['volta-bibliotheque', 'atelier-schema', 'volta-base', 'volta-see'],
  recu: null, travail: '', erreur: '', lie: false };
// les clés du navigateur que la sauvegarde emporte : celles de VOLTA — jamais celles de l'IA interne, ni sa propre date
const cleSauvee = k => /^(volta[.-]|atelier[.-])/.test(k) && !/^volta\.ia\./.test(k) && k !== SAUVEGARDE.cle;

/* ---- emballer, déballer : ce que le JSON ne sait pas dire ---------------------------------------------------------- */
const b64DeOctets = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const octetsDeB64 = t => { const s = atob(t), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
// `blobs` reçoit les fichiers rencontrés (leur contenu se lit après, il est asynchrone)
function emballer(v, blobs) {
  if (v == null || typeof v === 'string' || typeof v === 'boolean') return v === undefined ? { $v: 'indefini' } : v;
  if (typeof v === 'number') return Number.isFinite(v) ? v : { $v: 'nombre', v: String(v) };
  if (typeof v === 'bigint') return { $v: 'grand', v: String(v) };
  if (v instanceof Date) return { $v: 'date', v: v.getTime() };
  if (typeof Blob !== 'undefined' && v instanceof Blob) { const o = { $v: 'fichier', t: v.type, n: v.name || '', v: '' }; blobs.push({ o, blob: v }); return o; }
  if (v instanceof ArrayBuffer) return { $v: 'octets', v: b64DeOctets(new Uint8Array(v)) };
  if (ArrayBuffer.isView(v)) return { $v: 'vue', c: v.constructor.name, v: b64DeOctets(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)) };
  if (v instanceof Map) return { $v: 'map', v: [...v].map(([k, x]) => [emballer(k, blobs), emballer(x, blobs)]) };
  if (v instanceof Set) return { $v: 'set', v: [...v].map(x => emballer(x, blobs)) };
  if (Array.isArray(v)) return v.map(x => emballer(x, blobs));
  if (typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = emballer(v[k], blobs); return Object.prototype.hasOwnProperty.call(o, '$v') ? { $v: 'objet', v: o } : o; }
  return null; }   // une fonction, un symbole : rien à garder
const VUES_OCTETS = { Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array };
function deballer(v) {
  if (v == null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(deballer);
  if (typeof v.$v === 'string') { const x = v.v;
    switch (v.$v) {
      case 'indefini': return undefined; case 'nombre': return Number(x); case 'grand': return BigInt(x); case 'date': return new Date(x);
      case 'octets': return octetsDeB64(x).buffer;
      case 'vue': { const u = octetsDeB64(x), C = VUES_OCTETS[v.c] || Uint8Array; return C === Uint8Array ? u : new C(u.buffer, 0, Math.floor(u.byteLength / C.BYTES_PER_ELEMENT)); }
      case 'fichier': return new Blob([octetsDeB64(x)], { type: v.t || '' });
      case 'map': return new Map(x.map(([k, y]) => [deballer(k), deballer(y)])); case 'set': return new Set(x.map(deballer));
      case 'objet': { const o = {}; for (const k of Object.keys(x)) o[k] = deballer(x[k]); return o; } } }
  const o = {}; for (const k of Object.keys(v)) o[k] = deballer(v[k]); return o; }

/* ---- lire et écrire une base du navigateur ------------------------------------------------------------------------- */
// tout le contenu d'une base, ou null quand elle n'existe pas (on ne la laisse pas vide derrière soi)
function lireBaseDuNavigateur(nom) { return new Promise((ok, ko) => { let neuve = false, r;
  try { r = indexedDB.open(nom); } catch (e) { ko(e); return; }
  r.onupgradeneeded = () => { neuve = true; }; r.onerror = () => ko(r.error); r.onblocked = () => ko(new Error('base occupée par un autre onglet'));
  r.onsuccess = () => { const db = r.result;
    if (neuve) { db.close(); const d = indexedDB.deleteDatabase(nom); d.onsuccess = d.onerror = d.onblocked = () => ok(null); return; }
    const noms = [...db.objectStoreNames], out = { version: db.version, magasins: {} }; if (!noms.length) { db.close(); ok(out); return; }
    const tx = db.transaction(noms, 'readonly');
    noms.forEach(m => { const s = tx.objectStore(m), M = out.magasins[m] = { keyPath: s.keyPath, autoIncrement: s.autoIncrement, cles: [], valeurs: [] };
      s.getAllKeys().onsuccess = e => { M.cles = e.target.result; }; s.getAll().onsuccess = e => { M.valeurs = e.target.result; }; });
    tx.oncomplete = () => { db.close(); ok(out); }; tx.onerror = tx.onabort = () => { db.close(); ko(tx.error || new Error('lecture interrompue')); }; }; }); }
/* Remettre une base : ses magasins vidés, puis remplis. Une base que ce navigateur n'a pas encore se crée à la version 1
   avec les magasins du fichier — VOLTA, en l'ouvrant à sa version, y ajoute ce qui manquerait (ses propres créations
   vérifient d'abord). Un magasin du fichier que la base d'ici n'a pas est laissé (rien n'en lirait). */
function ecrireBaseDuNavigateur(nom, B) { return new Promise((ok, ko) => { let r; const M = B.magasins || {};
  try { r = indexedDB.open(nom); } catch (e) { ko(e); return; }
  r.onupgradeneeded = () => { const db = r.result; Object.keys(M).forEach(m => { if (db.objectStoreNames.contains(m)) return; const o = {}; if (M[m].keyPath != null) o.keyPath = M[m].keyPath; if (M[m].autoIncrement) o.autoIncrement = true; db.createObjectStore(m, o); }); };
  r.onerror = () => ko(r.error); r.onblocked = () => ko(new Error('base occupée par un autre onglet'));
  r.onsuccess = () => { const db = r.result, noms = Object.keys(M).filter(m => db.objectStoreNames.contains(m)); if (!noms.length) { db.close(); ok(0); return; }
    const tx = db.transaction(noms, 'readwrite'); let n = 0;
    noms.forEach(m => { const s = tx.objectStore(m), cles = M[m].cles || [], valeurs = M[m].valeurs || []; s.clear();
      valeurs.forEach((v, i) => { if (s.keyPath != null) s.put(v); else s.put(v, cles[i]); n++; }); });
    tx.oncomplete = () => { db.close(); ok(n); }; tx.onerror = tx.onabort = () => { db.close(); ko(tx.error || new Error('écriture interrompue')); }; }; }); }

/* ---- fabriquer la sauvegarde, la relire ---------------------------------------------------------------------------- */
// ce que ce navigateur garde, en chiffres : pour l'écran, et pour le fichier (ce qu'il dira avant d'être restauré)
function resumeDuNavigateur() { let E = {}; try { E = etatsDesFichiers(); } catch (_) { E = {}; }
  const nI = typeof installsVraies === 'function' ? installsVraies().length : 0, nP = typeof plansVrais === 'function' ? plansVrais().length : 0;
  const B = app.references, M = B && B.base ? B.base.meta : null;
  let mod = 0; try { mod = typeof tableModifiee === 'function' ? TABLES_NORME.filter(tableModifiee).length : 0; } catch (_) { mod = 0; }
  return { installations: nI, plans: nP, base: M ? { nom: B.nom || '', liaisons: M.n || 0 } : null, bible: app.bibleNom || '', normes: mod, dit: E }; }
async function fabriquerSauvegarde() { const bases = {}, blobs = [];
  // ce qui attend d'être écrit l'est d'abord (le plan sur la table s'enregistre avec un petit retard)
  try { if (typeof ecrireContrat === 'function') ecrireContrat(); } catch (_) { }
  await new Promise(r => setTimeout(r, 350));
  for (const nom of SAUVEGARDE.bases) { let B = null; try { B = await lireBaseDuNavigateur(nom); } catch (_) { B = null; } if (!B) continue;
    Object.values(B.magasins).forEach(M => { M.cles = emballer(M.cles, blobs); M.valeurs = emballer(M.valeurs, blobs); }); bases[nom] = B; }
  await Promise.all(blobs.map(async x => { x.o.v = b64DeOctets(new Uint8Array(await x.blob.arrayBuffer())); }));
  const local = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (cleSauvee(k)) local[k] = localStorage.getItem(k); } } catch (_) { }
  const R = resumeDuNavigateur(); delete R.dit;
  return { format: SAUVEGARDE.format, version: SAUVEGARDE.version, quand: Date.now(), volta: typeof BILAN !== 'undefined' ? BILAN.version : '', resume: R, bases, local }; }
// le fichier : du JSON compressé (fflate, embarqué pour Visio) — tel quel si la compression n'est pas là
function octetsDeSauvegarde(S) { const texte = new TextEncoder().encode(JSON.stringify(S));
  try { if (typeof fflate !== 'undefined' && fflate.gzipSync) return fflate.gzipSync(texte, { level: 6 }); } catch (_) { }
  return texte; }
function sauvegardeDesOctets(u) { let texte;
  if (u.length > 2 && u[0] === 0x1f && u[1] === 0x8b) { if (typeof fflate === 'undefined' || !fflate.gunzipSync) throw new Error('compression'); texte = new TextDecoder().decode(fflate.gunzipSync(u)); }
  else texte = new TextDecoder().decode(u);
  const S = JSON.parse(texte); if (!S || S.format !== SAUVEGARDE.format || typeof S.bases !== 'object') throw new Error('format');
  if (S.version > SAUVEGARDE.version) throw new Error('version'); return S; }
const nomDeSauvegarde = t => { const d = new Date(t), p = n => String(n).padStart(2, '0'); return `VOLTA-sauvegarde-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.volta`; };
const quandSauvee = () => { try { return +localStorage.getItem(SAUVEGARDE.cle) || 0; } catch (_) { return 0; } };

async function toutSauvegarder() { if (SAUVEGARDE.travail) return; SAUVEGARDE.travail = 'sauve'; SAUVEGARDE.erreur = ''; rendreSauvegarde();
  try { const S = await fabriquerSauvegarde(), u = octetsDeSauvegarde(S), nom = nomDeSauvegarde(S.quand);
    telecharger(new Blob([u], { type: 'application/octet-stream' }), nom);
    try { localStorage.setItem(SAUVEGARDE.cle, String(S.quand)); } catch (_) { }
    dire(`Sauvegarde enregistrée : ${nom} — ${poidsDit(u.length)}. Rangez-la où vous voulez.`); }
  catch (e) { SAUVEGARDE.erreur = 'La sauvegarde n’a pas pu se faire : ' + (e && e.message ? e.message : 'erreur inconnue') + '.'; }
  SAUVEGARDE.travail = ''; rendreSauvegarde(); if (typeof rendreMenuSauvegarde === 'function') rendreMenuSauvegarde(); }
const poidsDit = n => n > 1048576 ? nombre(Math.round(n / 104857.6) / 10) + ' Mo' : Math.max(1, Math.round(n / 1024)) + ' Ko';

// un fichier choisi : on le lit, on dit ce qu'il porte — rien n'est remplacé avant « Restaurer »
async function lireSauvegardeChoisie(f) { SAUVEGARDE.recu = null; SAUVEGARDE.erreur = '';
  try { const S = sauvegardeDesOctets(new Uint8Array(await f.arrayBuffer())); SAUVEGARDE.recu = { S, nom: f.name, poids: f.size }; }
  catch (e) { const m = e && e.message;
    SAUVEGARDE.erreur = m === 'version' ? `${f.name} vient d’une version plus récente de VOLTA : ouvrez-la avec cette version.` : `${f.name} n’est pas une sauvegarde de VOLTA (un fichier .volta fait par « Tout sauvegarder »).`; }
  rendreSauvegarde(); }
async function restaurerLaSauvegarde() { const R = SAUVEGARDE.recu; if (!R || SAUVEGARDE.travail) return; SAUVEGARDE.travail = 'restaure'; SAUVEGARDE.erreur = ''; rendreSauvegarde();
  try { const S = R.S;
    // les connexions ouvertes par VOLTA n'empêchent pas d'écrire ; on écrit base par base
    for (const nom of Object.keys(S.bases || {})) { if (!SAUVEGARDE.bases.includes(nom)) continue;
      const B = S.bases[nom], M = {}; Object.keys(B.magasins || {}).forEach(m => { const x = B.magasins[m]; M[m] = { keyPath: x.keyPath, autoIncrement: x.autoIncrement, cles: deballer(x.cles), valeurs: deballer(x.valeurs) }; });
      await ecrireBaseDuNavigateur(nom, { version: B.version, magasins: M }); }
    // une base que ce navigateur a et que la sauvegarde n'a pas : vidée (l'état du fichier, tout l'état)
    for (const nom of SAUVEGARDE.bases) { if (S.bases[nom]) continue; let B = null; try { B = await lireBaseDuNavigateur(nom); } catch (_) { B = null; }
      if (B && Object.keys(B.magasins).length) await ecrireBaseDuNavigateur(nom, { magasins: Object.fromEntries(Object.keys(B.magasins).map(m => [m, { cles: [], valeurs: [] }])) }); }
    try { const aOter = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (cleSauvee(k)) aOter.push(k); }
      aOter.forEach(k => localStorage.removeItem(k)); Object.keys(S.local || {}).forEach(k => { if (cleSauvee(k)) localStorage.setItem(k, S.local[k]); });
      localStorage.setItem(SAUVEGARDE.cle, String(S.quand || Date.now())); } catch (_) { }
    // VOLTA repart de ce qu'il vient d'écrire : rien de ce qui est en mémoire ne doit se réécrire par-dessus
    SAUVEGARDE.travail = 'recharge'; rendreSauvegarde(); window.onbeforeunload = null; setTimeout(() => location.reload(), 500); }
  catch (e) { SAUVEGARDE.travail = ''; SAUVEGARDE.erreur = 'La restauration s’est arrêtée : ' + (e && e.message ? e.message : 'erreur inconnue') + '. Fermez les autres onglets de VOLTA, puis recommencez.'; rendreSauvegarde(); } }

/* ---- l'écran : ⋮ › Réglages › Sauvegarde ---------------------------------------------------------------------------- */
const ficheSauvegardeOuverte = () => !!(app.fiche && app.fiche.mode === 'sauvegarde' && $('fiche') && !$('fiche').hidden);
const quandSauveDit = t => { if (!t) return ''; const x = new Date(t), h = x.getHours() + ' h ' + String(x.getMinutes()).padStart(2, '0'), j = Math.floor((Date.now() - t) / 86400000);
  const jour = new Date().toDateString() === x.toDateString() ? 'aujourd’hui' : 'le ' + x.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: x.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
  return jour + ' à ' + h + (j >= 2 ? ` — il y a ${j} jours` : ''); };
// ce qu'un état (ce navigateur, ou un fichier) contient, en une liste courte — rien pour ce qu'il n'a pas
function lignesDuResume(R) { const xs = [];
  if (R.installations || R.plans) xs.push(`<b>${esc(pluriel(R.installations || 0, 'installation'))}</b> · ${esc(pluriel(R.plans || 0, 'plan'))}`);
  if (R.base) xs.push(`La base des plans déjà faits${R.base.liaisons ? ` · ${esc(pluriel(R.base.liaisons, 'liaison'))}` : ''}`);
  if (R.bible) xs.push(`Votre bible · ${esc(R.bible)}`);
  if (R.normes) xs.push(`Vos normes · ${esc(pluriel(R.normes, 'table'))} modifiée${R.normes > 1 ? 's' : ''}`);
  xs.push('Vos hypothèses, vos réglages d’affichage, votre carnet');
  return `<ul class="sv-liste">${xs.map(x => `<li>${x}</li>`).join('')}</ul>`; }
function corpsSauvegarde() { const R = resumeDuNavigateur(), t = quandSauvee(), W = SAUVEGARDE.travail, X = SAUVEGARDE.recu, vide = !R.installations && !R.plans && !R.base && !R.bible && !R.normes;
  const erreur = SAUVEGARDE.erreur ? `<p class="sv-erreur" role="alert">${esc(SAUVEGARDE.erreur)}</p>` : '';
  const recu = X ? `<div class="sv-recu" id="sv-recu"><p class="sv-recu-t"><b>${esc(X.nom)}</b><span>${esc(poidsDit(X.poids))}</span></p>`
      + `<p class="sv-recu-q">${esc('Sauvegarde ' + quandSauveDit(X.S.quand).replace(/^le /, 'du ').replace(/^aujourd’hui/, 'd’aujourd’hui').replace(/ — .*$/, ''))}${X.S.volta ? ' · VOLTA ' + esc(X.S.volta) : ''}</p>${lignesDuResume(X.S.resume || {})}`
      + `<p class="sv-recu-a">${vide ? 'Ce navigateur ne garde encore rien : la restauration y pose tout ce que porte ce fichier.' : '<b>Restaurer remplace tout ce que ce navigateur garde aujourd’hui</b> par ce que porte ce fichier. Sauvegardez d’abord si vous voulez le retrouver.'}</p>`
      + `<div class="sv-gestes"><button type="button" class="btn cuivre" id="sv-restaurer"${W ? ' disabled' : ''}>${W === 'restaure' ? 'Restauration…' : W === 'recharge' ? 'VOLTA redémarre…' : 'Restaurer'}</button><button type="button" class="btn lien" id="sv-annuler"${W ? ' disabled' : ''}>Annuler</button></div></div>` : '';
  return tete('Réglages', 'Sauvegarde')
    + '<p class="note sv-chapeau">Votre travail vit dans ce navigateur. Un fichier de sauvegarde le met à l’abri : il s’enregistre sur votre poste, comme un export, et ne part nulle part.</p>'
    + `<section class="hy-groupe sv-bloc" aria-labelledby="sv-t-ici"><h3 class="hy-titre" id="sv-t-ici">Ce que ce navigateur garde</h3>${lignesDuResume(R)}`
    + `<p class="sv-quand${t ? '' : ' jamais'}" id="sv-quand">${t ? 'Dernière sauvegarde : ' + esc(quandSauveDit(t)) + '.' : 'Pas encore de sauvegarde.'}</p>`
    + `<div class="sv-gestes"><button type="button" class="btn cuivre" id="sv-sauver"${W ? ' disabled' : ''}>${W === 'sauve' ? 'Sauvegarde en cours…' : 'Tout sauvegarder'}</button></div></section>`
    + `<section class="hy-groupe sv-bloc" aria-labelledby="sv-t-retour"><h3 class="hy-titre" id="sv-t-retour">Restaurer</h3>`
    + '<p class="sv-dit">Un fichier de sauvegarde remet VOLTA dans l’état où il était — sur ce poste, ou sur un autre.</p>'
    + (X ? recu : `<div class="sv-gestes"><button type="button" class="btn papier" id="sv-choisir"${W ? ' disabled' : ''}>Choisir une sauvegarde…</button></div>`) + erreur
    + '<input type="file" id="sv-fichier" accept=".volta,.json,.gz" hidden></section>'
    + '<p class="note sv-ia">Les réglages de l’IA interne (son adresse, son modèle, sa clé) ne sont jamais dans une sauvegarde, et une restauration n’y touche pas.</p>'; }
const piedSauvegarde = () => { const t = quandSauvee(), j = t ? Math.floor((Date.now() - t) / 86400000) : -1;
  return `<span class="hy-etat sv-etat ${!t || j >= 14 ? 'regle att' : 'ok'}">${!t ? 'Jamais sauvegardé' : j >= 14 ? `Sauvegardé il y a ${j} jours` : 'Sauvegardé ' + esc(quandSauveDit(t).replace(/ — .*$/, ''))}</span>`; };
function ficheSauvegarde() { const deja = ficheSauvegardeOuverte(), y = deja ? $('fiche-corps').scrollTop : 0;
  ouvrirFiche({ mode: 'sauvegarde', large: true }, corpsSauvegarde(), piedSauvegarde()); lierFicheSauvegarde(); if (deja) $('fiche-corps').scrollTop = y; }
function rendreSauvegarde() { if (ficheSauvegardeOuverte()) ficheSauvegarde(); }
function lierFicheSauvegarde() { if (SAUVEGARDE.lie) return; SAUVEGARDE.lie = true; const c = $('fiche-corps');
  c.addEventListener('click', e => { if (!ficheSauvegardeOuverte()) return; const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'sv-sauver') toutSauvegarder();
    else if (b.id === 'sv-choisir') { const f = $('sv-fichier'); if (f) { f.value = ''; f.click(); } }
    else if (b.id === 'sv-restaurer') restaurerLaSauvegarde();
    else if (b.id === 'sv-annuler') { SAUVEGARDE.recu = null; SAUVEGARDE.erreur = ''; rendreSauvegarde(); } });
  c.addEventListener('change', e => { if (!ficheSauvegardeOuverte() || e.target.id !== 'sv-fichier') return; const f = e.target.files && e.target.files[0]; if (f) lireSauvegardeChoisie(f); }); }
// le mot sous la ligne du menu : quand a-t-on sauvegardé
function rendreMenuSauvegarde() { const el = document.getElementById('mn-sauvegarde'); if (!el) return; const t = quandSauvee(), j = t ? Math.floor((Date.now() - t) / 86400000) : -1;
  el.textContent = !t ? 'jamais faite' : j < 1 ? 'faite aujourd’hui' : j === 1 ? 'faite hier' : 'il y a ' + j + ' jours'; el.classList.toggle('att', !t || j >= 14); }
// un fichier .volta glissé n'importe où ou ouvert par « Ouvrir » : l'écran de la sauvegarde, prêt à restaurer
const estSauvegarde = f => !!f && /\.volta$/i.test(f.name || '');
function recevoirSauvegarde(f) { ficheSauvegarde(); return lireSauvegardeChoisie(f); }
MENU = (typeof MENU !== 'undefined' && MENU) || { actions: {} }; MENU.actions.sauvegarde = () => ficheSauvegarde();
