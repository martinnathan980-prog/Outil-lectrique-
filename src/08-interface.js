/* ===========================================================================
   08 — L'INTERFACE
   Le plan est l'écran. Tout ce qui s'affiche se déduit de `app` par
   `synchroniser()` ; aucun état ne vit dans le DOM.

   app.contrat      le contrat tel qu'il est édité (liaisons, désignations, cartouche)
   app.source       les liaisons d'origine quand le contrat est découpé en folios
                    tout seul ; `verite()` rend toujours ce qu'on édite
   app.plan         '*' = tout d'un tenant, sinon le folio affiché
   app.dessin       le dessin du folio affiché (placement + routage) — nul le
                    temps qu'un gros folio jamais vu se place au loin (Worker)
   app.base         le tableau des liaisons, en tiroir en bas : ouvert ou non, ce
                    qu'il montre (ce folio ou tout), son filtre, son tri
   app.cible        ce qui est choisi : un bloc { type:'bloc', nom } ou un fil
                    { type:'fil', l } — allumé sur le plan, sa fiche dans
                    l'inspecteur, sa ligne marquée dans le tableau
   app.actif        la liaison dont on écrit une cellule : son fil s'allume
   app.bible        la bible des barrettes en cours, et son nom (bibleNom)
   app.norme        la norme en cours (familles, fils, déclassements, réseau)
                    et son nom (normeNom) ; app.simu : les hypothèses de la
                    simulation (longueur, courant, tension, conditions)
   Le plan d'abord. Un clic sur un bloc ou un fil ouvre sa FICHE dans
   l'INSPECTEUR, à droite (08 bis) ; le TABLEAU des liaisons, en tiroir en
   bas (B), est le contrat : on le corrige, le plan suit. Le plan se recadre
   à côté de l'un, au-dessus de l'autre, jamais dessous. Les documents rares
   (cartouche, collage, bible) s'ouvrent dans une fiche à part.
   Les commandes sont dans la barre de gauche (le rail) ; le menu, en bas
   d'elle, porte ce qu'on fait une fois et ce qui se lit (le dossier ouvert).
   =========================================================================== */
'use strict';

const app = {
  contrat: nouveauContrat(), source: null, nFolios: 0, budget: 16, plan: '*', nom: '',
  vue: { s: 1, tx: 0, ty: 0 }, choisi: null, cible: null, actif: null, dessin: null, hist: [], fiche: null,
  bible: [], bibleNom: '', norme: null, normeNom: '', simu: null,   // simu : les hypothèses, posées au démarrage (relireSimu)
  base: { ouvert: false, portee: 'folio', filtre: '', filtreAuto: false, tri: null, hauteur: 0, sale: true, defiler: false, enSaisie: false, choixOuvert: false, normeOuverte: false },
  retouches: new Map(),  // folio (sa clé de placement) -> le dessin retouché à la souris (la retouche)
  insp: { index: false, filtre: '', ajout: false }   // l'inspecteur : ouvert sur l'INDEX des repères (une fiche y revient par la flèche), ce qu'on y cherche, le champ « ajouter » ouvert
};
const $ = id => document.getElementById(id);
const CLE_CONTRAT = 'atelier.contrat.v2';
const CLE_BASE = 'atelier.base.v2';
const ZMIN = 0.06, ZMAX = 8;
const verite = () => app.source || app.contrat.liaisons;
const plans = () => plansDe(app.contrat.liaisons);
const mouvementReduit = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const telephone = () => window.innerWidth <= 700;

/* ---- le dessin ---------------------------------------------------------- */
/* Le folio tel que le moteur le reçoit : ses liaisons complètes, chaque dédoublement devenu une barrette à poser
   (01, `avecBarrettesAPoser`). Le même tableau tant que rien ne change : le dessin, les clics et la fiche lisent les
   mêmes objets (le fil n° i du dessin est la liaison n° i). Les barrettes à poser se numérotent d'un bout à l'autre du
   contrat, dans l'ordre des folios : un seul VT1, et l'index comme la pastille de contrôle le retrouvent sans ambiguïté.
   Le numéro TIENT (`app.contrat.provisoires`, gardée avec le contrat) : poser VT1 ne renomme pas VT2 en VT1. */
const folios = new Map();
const signature = L => JSON.stringify(L.map(l => [l.de, l.borneDe, l.vers, l.borneVers, l.cable, l.type, l.pnDe, l.pnVers, l.route]));
function liaisonsDe(plan) { const L0 = app.contrat.liaisons.filter(liaisonComplete), L = plan === '*' ? L0 : L0.filter(l => l.plan === plan);
  const P = plans(), depart = plan === '*' ? 0 : P.slice(0, Math.max(0, P.indexOf(plan))).reduce((n, p) => n + dedoublements(L0.filter(l => l.plan === p)).length, 0);
  const g = folios.get(plan), sig = depart + '|' + signature(L);
  if (g && g.sig === sig && g.L.length === L.length && g.L.every((l, i) => l === L[i])) return g.sortie;
  if (!app.contrat.provisoires) app.contrat.provisoires = new Map();
  const sortie = avecBarrettesAPoser(L, depart, app.contrat.provisoires); folios.set(plan, { L, sig, sortie }); return sortie; }
const liaisonsDuPlan = () => liaisonsDe(app.plan);
/* Le placement d'un folio se garde tant que ses liaisons ne changent pas : le
   concours du folio chargé prend quelques secondes, revenir sur un folio déjà
   vu est instantané. La clé : ce que le placement lit de chaque liaison. */
const placements = new Map(), PLACEMENTS_GARDES = 24;
const clePlacement = L => JSON.stringify(L.map(l => [l.de, l.borneDe, l.vers, l.borneVers, l.cable, l.pnDe, l.pnVers]));
// un placement entre en mémoire ; au-delà de la réserve, le moins récent s'en va — jamais celui du folio affiché (la retouche le relit)
function garderPlacement(cle, P) { placements.delete(cle); placements.set(cle, P); const ici = cleCourante();
  for (const k of [...placements.keys()]) { if (placements.size <= PLACEMENTS_GARDES) break; if (k !== ici) placements.delete(k); } }
function placementDe(L) {
  const cle = clePlacement(L);
  // un folio retouché à la souris : la retouche, toujours (elle se défait par « automatique » ou Ctrl+Z)
  if (app.retouches.has(cle)) return app.retouches.get(cle);
  // un folio déjà affiné (dans cette session, ou gardé d'une autre) : son meilleur dessin
  if (affinage.profonds.has(cle)) return affinage.profonds.get(cle);
  if (placements.has(cle)) { const P = placements.get(cle); placements.delete(cle); placements.set(cle, P); return P; }
  // un gros folio jamais vu : le moteur le place AU LOIN (un Worker), le dessin viendra — l'attente se voit ; un petit, ici même
  if (placement.attentes.has(cle)) { const a = placement.attentes.get(cle); if (!a.vue || a.plan !== app.plan) { a.vue = true; a.plan = app.plan; a.cibleAvant = app.cible; } return null; }
  if (auLoin(L) && demanderPlacement(cle, L, app.plan)) return null;
  const P = meilleurPlacement(L); garderPlacement(cle, P); if (placement.ailleurs && L.length > SEUIL_ICI) garderConcours(cle, P);
  return P;
}

/* ---- l'AFFINAGE : la recherche profonde, en arrière-plan ---------------- */
/* Le dessin qu'on voit d'abord est celui du concours (quelques secondes).
   Puis la recherche profonde (04, `placementProfond`) tourne dans un Worker
   — le moteur, refait depuis son <script id="moteur"> —, folio par folio, le
   folio affiché d'abord : chaque fois qu'elle trouve mieux, le dessin se
   remplace sous les yeux, la vue ne bouge pas. Le temps n'est pas un souci
   (le lecteur : « une heure de calcul pour une vie d'études bien faite, on
   s'en fiche ») : ce qu'elle trouve se GARDE dans ce navigateur (IndexedDB),
   par folio et par version du moteur — un folio affiné l'est pour toujours.
   Sous pilote automatique (navigator.webdriver), elle dort : les bancs
   mesurent le concours, déterministe ; `atelier.affinage(true)` la réveille.
   Sans Worker ni IndexedDB (un navigateur qui les refuse), rien ne change :
   le dessin du concours reste. */
const TOURS_PROFONDS = 48;
const affinage = { actif: !(typeof navigator !== 'undefined' && navigator.webdriver), worker: null, file: [], encours: null,
  profonds: new Map(), finis: new Set(), etat: null, vu: 0 };
const cleCourante = () => { const L = liaisonsDuPlan(); return L.length ? clePlacement(L) : null; };
// tous les folios du contrat dans la file, le folio affiché d'abord ; ceux qui ne sont plus au contrat en sortent
function affinerTout() { if (!affinage.actif) return;
  const P = plans(), parPlan = app.plan === '*' || !P.length ? [liaisonsDe('*')] : [liaisonsDuPlan(), ...P.filter(p => p !== app.plan).map(liaisonsDe)];
  const travaux = parPlan.filter(L => L.length).map(L => ({ cle: clePlacement(L), L: L.map(({ origine, ...l }) => l) })).filter(t => !affinage.finis.has(t.cle) && !(affinage.encours && affinage.encours.cle === t.cle));
  affinage.file = travaux.filter((t, i) => travaux.findIndex(u => u.cle === t.cle) === i); pomper(); }
function pomper() { while (affinage.file.length && affinage.finis.has(affinage.file[0].cle)) affinage.file.shift();
  if (affinage.encours || !affinage.file.length) { montrerAffinage(); return; }
  const w = travailleur(); if (!w) return;
  affinage.encours = affinage.file.shift(); affinage.etat = { k: 0, n: TOURS_PROFONDS };
  w.postMessage({ cle: affinage.encours.cle, liaisons: affinage.encours.L, tours: TOURS_PROFONDS }); montrerAffinage(); }
function travailleur() { if (affinage.worker) return affinage.worker; if (affinage.worker === false) return null;
  try { const src = document.getElementById('moteur').textContent;
    // le moteur rapporte à chaque tour ; un dessin meilleur part avec, la fin aussi
    const glue = `\nself.onmessage = e => { const { cle, liaisons, tours } = e.data; let dernier = null;
      try { const P = placementProfond(liaisons, tours, (k, n, m) => { if (k > 0 && m !== dernier) postMessage({ cle, k, n, P: sortieDuPlacement(m) }); else postMessage({ cle, k, n }); dernier = m; });
        postMessage({ cle, fini: true, P }); }
      catch (err) { postMessage({ cle, erreur: String(err && err.message || err) }); } };`;
    const w = new Worker(URL.createObjectURL(new Blob([src + glue], { type: 'text/javascript' })));
    w.onmessage = recevoirAffinage; w.onerror = () => { affinage.worker = false; affinage.encours = null; affinage.file = []; montrerAffinage(); };
    return (affinage.worker = w); }
  catch (_) { affinage.worker = false; return null; } }
function recevoirAffinage(e) { const d = e.data, j = affinage.encours; if (!j || d.cle !== j.cle) return;
  if (d.n) affinage.etat = { k: d.k, n: d.n };
  if (d.P && !d.fini) { affinage.profonds.set(d.cle, d.P); if (cleCourante() === d.cle) { affinage.vu = Date.now(); rafraichirDessin(); } }
  if (d.erreur) affinage.erreur = d.erreur;
  if (d.fini || d.erreur) { affinage.finis.add(d.cle); if (d.P) { affinage.profonds.set(d.cle, d.P); garderAffine(d.cle, d.P); }
    affinage.encours = null; pomper(); }
  montrerAffinage(); }
// le dessin se remplace, la vue reste où elle est
function rafraichirDessin() { calculer(); peindre(); synchroniser(); rallumer(); }
function montrerAffinage() { const el = $('affinage'); if (!el) return; const j = affinage.encours, e = affinage.etat;
  if (!affinage.actif || !j) { el.hidden = true; return; }
  const ici = j.cle === cleCourante(), reste = affinage.file.length;
  el.hidden = false; el.classList.toggle('ailleurs', !ici);
  $('af-txt').textContent = (ici ? 'affinage ' : 'affine un autre folio ') + (e ? e.k + ' / ' + e.n : '') + (reste ? ' · ' + reste + ' en attente' : '');
  el.title = 'La recherche profonde améliore le dessin en arrière-plan ; chaque mieux trouvé le remplace, et le résultat se garde dans ce navigateur.'; }
// IndexedDB : un magasin, une entrée par version du moteur et folio ; les versions passées s'effacent
const IDB_NOM = 'atelier-schema', IDB_MAGASIN = 'placements', IDB_RETOUCHES = 'retouches', IDB_CONCOURS = 'concours';
function ouvrirIDB() { return new Promise((ok, ko) => { try { const r = indexedDB.open(IDB_NOM, 4);   // 4 : le magasin des concours (le placement d'un folio, relu à l'ouverture suivante)
  r.onupgradeneeded = () => { [IDB_MAGASIN, IDB_RETOUCHES, 'references', IDB_CONCOURS].forEach(m => { if (!r.result.objectStoreNames.contains(m)) r.result.createObjectStore(m); }); };
  r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); r.onblocked = () => ko(new Error('base occupée par un autre onglet')); } catch (err) { ko(err); } }); }
function garderAffine(cle, P) { ouvrirIDB().then(db => { db.transaction(IDB_MAGASIN, 'readwrite').objectStore(IDB_MAGASIN).put({ P, t: Date.now() }, VERSION_MOTEUR + '|' + cle); }).catch(() => { }); }
function relireAffines() { if (!affinage.actif) return; const avant = cleCourante();
  ouvrirIDB().then(db => { const req = db.transaction(IDB_MAGASIN, 'readwrite').objectStore(IDB_MAGASIN).openCursor();
    req.onsuccess = () => { const c = req.result;
      if (!c) { const ici = cleCourante(); if (ici && ici === avant && affinage.profonds.has(ici)) rafraichirDessin(); affinerTout(); return; }
      const k = String(c.key);
      if (k.startsWith(VERSION_MOTEUR + '|')) { const cle = k.slice(VERSION_MOTEUR.length + 1); if (!affinage.profonds.has(cle) && c.value && c.value.P) affinage.profonds.set(cle, c.value.P); affinage.finis.add(cle); }
      else c.delete();
      c.continue(); }; }).catch(() => { }); }

/* ---- le PLACEMENT AU LOIN : un folio jamais vu se place dans un Worker --- */
/* Le concours d'un folio chargé prend des secondes (75 fils : onze) : dans la
   page, l'écran se figeait sans un mot. Un gros folio jamais vu se place donc
   AU LOIN — dans un Worker refait du moteur, comme l'affinage et le FWD —
   pendant que l'écran reste libre : un mot au milieu de la place libre (« Le
   moteur place le folio 3… »), la puce du folio qui respire, et l'on change
   de folio, on ouvre une fiche ou le menu. Le dessin qui arrive est
   EXACTEMENT celui que la page aurait calculé (le concours est déterministe :
   même entrée, même sortie) ; il se garde dans ce navigateur (IndexedDB,
   magasin `concours`, par version du moteur) et revient à l'ouverture
   suivante en quelques dizaines de millisecondes. Le folio affiché passe
   toujours devant (un autre en cours lui cède la place et reprend après) ;
   puis les folios demandés ; puis les autres folios du contrat, dans l'ordre,
   pour être prêts quand on y va. Restent dans la page, comme avant : un petit
   folio (SEUIL_ICI liaisons au plus — bien moins d'une seconde, on ne verrait
   que l'attente), un contrat sans folios ou découpé par l'outil
   (`ajusterFolios` lit le dessin aussitôt), et tout quand le navigateur
   refuse le Worker. Sous pilote automatique (navigator.webdriver) le
   placement reste dans la page, synchrone, pour que les bancs lisent le
   dessin dès `redessiner()` ; `placementAilleurs(true)` l'envoie au loin
   (tests/placement.js). */
const SEUIL_ICI = 12;
const placement = { ailleurs: !(typeof navigator !== 'undefined' && navigator.webdriver), worker: null, url: null, encours: null, file: [], attentes: new Map(), faits: 0, relus: 0, erreur: null, nettoye: false };
// ce folio part-il au loin ? gros, venu du fichier (ni le dessin entier, ni un découpage de l'outil), le Worker possible
const auLoin = L => placement.ailleurs && placement.worker !== false && app.plan !== '*' && !app.nFolios && L.length > SEUIL_ICI;
const attenteCourante = () => { const cle = cleCourante(); return cle && placement.attentes.has(cle) ? placement.attentes.get(cle) : null; };
/* Demander un folio : d'abord ce navigateur (le concours gardé d'une session passée), sinon la file du Worker. L'attente
   retient la cible du moment : si une autre est choisie pendant le calcul (l'index, la recherche), c'est elle qu'on cadrera. */
function demanderPlacement(cle, L, plan) { if (!travailleurPlacement()) return false;
  placement.attentes.set(cle, { L: L.map(({ origine, ...l }) => l), plan, t: performance.now(), vue: plan === app.plan, cibleAvant: app.cible });
  lireConcours(cle).then(P => { if (!placement.attentes.has(cle)) return;
    if (P) { placement.relus++; recevoirPlacement(cle, P, false); } else { placement.file.push(cle); pomperPlacement(); } });
  return true; }
function travailleurPlacement() { if (placement.worker) return placement.worker; if (placement.worker === false) return null;
  try { if (!placement.url) { const src = document.getElementById('moteur').textContent;   // le moteur, une fois : un Worker relancé le relit
      const glue = `\nself.onmessage = e => { const { cle, liaisons } = e.data; try { postMessage({ cle, P: meilleurPlacement(liaisons) }); } catch (err) { postMessage({ cle, erreur: String(err && err.message || err) }); } };`;
      placement.url = URL.createObjectURL(new Blob([src + glue], { type: 'text/javascript' })); }
    const w = new Worker(placement.url);
    w.onmessage = recevoirDuLoin; w.onerror = e => { placement.erreur = String((e && e.message) || 'Worker refusé'); placement.worker = false; placement.encours = null; placerIci(); };
    return (placement.worker = w); }
  catch (_) { placement.worker = false; return null; } }
/* La file : le folio affiché d'abord — s'il attend pendant qu'un autre se calcule, l'autre cède (il reprendra) — ; puis
   les folios demandés ; puis, d'avance, les autres folios du contrat. Ce qui ne correspond plus à un folio du contrat
   (une liaison corrigée, un autre fichier) sort de la file. */
function pomperPlacement() { if (!placement.ailleurs || placement.worker === false) return;
  const vivant = cle => { const a = placement.attentes.get(cle); return !!a && plans().includes(a.plan) && clePlacement(liaisonsDe(a.plan)) === cle; };
  placement.file = placement.file.filter(vivant);
  [...placement.attentes.keys()].forEach(cle => { if (!vivant(cle) && !(placement.encours && placement.encours.cle === cle)) placement.attentes.delete(cle); });
  const ici = cleCourante();
  if (placement.encours) { if (placement.encours.cle === ici || !placement.file.includes(ici)) { montrerAttente(); return; }
    const w = placement.worker, cede = placement.encours.cle; placement.worker = null; placement.encours = null; try { w.terminate(); } catch (_) { }
    if (vivant(cede)) placement.file.push(cede); }
  const cle = placement.file.includes(ici) ? ici : placement.file.shift(); placement.file = placement.file.filter(k => k !== cle);
  if (!cle) { const p = prochainAuLoin(); if (p) demanderPlacement(p.cle, p.L, p.plan); montrerAttente(); return; }
  const w = travailleurPlacement(); if (!w) { placerIci(); return; }
  placement.encours = { cle, t: performance.now() }; w.postMessage({ cle, liaisons: placement.attentes.get(cle).L }); montrerAttente(); }
// le prochain folio du contrat à placer d'avance : après le folio affiché, dans l'ordre, un folio gros et jamais vu
function prochainAuLoin() { if (app.plan === '*' || app.nFolios) return null; const P = plans(), i = Math.max(0, P.indexOf(app.plan));
  for (let k = 1; k < P.length; k++) { const p = P[(i + k) % P.length], L = liaisonsDe(p); if (L.length <= SEUIL_ICI) continue; const cle = clePlacement(L);
    if (app.retouches.has(cle) || affinage.profonds.has(cle) || placements.has(cle) || placement.attentes.has(cle)) continue; return { cle, L, plan: p }; }
  return null; }
function recevoirDuLoin(e) { const d = e.data || {}; if (!placement.encours || d.cle !== placement.encours.cle) return;   // un calcul qu'on avait abandonné
  placement.encours = null;
  if (d.erreur) { placement.erreur = d.erreur; placerIci(d.cle); return; }
  placement.faits++; recevoirPlacement(d.cle, d.P, true); }
/* Sans Worker (refusé, ou en erreur) : le chemin d'avant, dans la page — juste après que l'attente s'est affichée, pour
   qu'on sache ce qui se passe ; le folio affiché d'abord. */
function placerIci(cle) { const ici = cleCourante(), cles = (cle ? [cle] : [...placement.attentes.keys()]).sort((a, b) => (b === ici) - (a === ici));
  setTimeout(() => cles.forEach(k => { const a = placement.attentes.get(k); if (!a) return; let P = null;
    try { P = meilleurPlacement(a.L); } catch (err) { placement.erreur = String((err && err.message) || err); }
    recevoirPlacement(k, P, true); }), 30); }
function recevoirPlacement(cle, P, neuf) { const a = placement.attentes.get(cle); placement.attentes.delete(cle); placement.file = placement.file.filter(k => k !== cle);
  if (P) { garderPlacement(cle, P); if (neuf) garderConcours(cle, P); }
  else if (a && cleCourante() === cle) dire('Le folio ' + a.plan + ' n’a pas pu se dessiner' + (placement.erreur ? ' : ' + placement.erreur : '') + '.', true);
  if (P && cleCourante() === cle) { rafraichirDessin(); finirAttente(a); }
  pomperPlacement(); montrerAttente(); }
/* Le dessin attendu est là : la vue se cadre comme si le folio venait de s'ouvrir ; ce qu'on a choisi pendant l'attente
   (depuis l'index, la recherche, le tableau) est choisi et cadré, comme si le dessin avait été là. */
function finirAttente(a) { const c = app.cible, d = app.dessin; if (!d) return; ajuster(); if (!c) return;
  if (c.type === 'fil') { const w = filDe(c.l); if (w) { allumerFil(w); viserFil(w); } return; }
  if (c.type !== 'bloc' || !a || c === a.cibleAvant) return;
  const k = d.comps.find(x => x.name === c.nom && x.kind !== 'tag'), vt = k ? null : barretteAPoser(c.nom);
  if (k) choisirBloc(k); else if (vt) choisirBarretteAPoser(vt); viser(c.nom); }
// la cible d'une recherche pendant que son folio se place au loin : sa fiche tout de suite, choisie et cadrée quand le dessin arrive
function reporterCible(cible) { if (cible.type === 'fil') { const l = verite().find(x => x.cable === cible.nom); if (!l) return; app.cible = { type: 'fil', l }; } else app.cible = { type: 'bloc', nom: cible.nom };
  ouvrirInspecteur(); }
/* L'attente, visible : au milieu de la place libre du plan, le mot et le point qui respire ; dans la barre du bas, la puce du
   folio qui se calcule respire aussi. L'élément se crée à la première attente, dans la planche (#attente). */
function montrerAttente() { const a = app.contrat.liaisons.length && !app.dessin ? attenteCourante() : null; let el = $('attente');
  if (!el && !a && !placement.encours) return;
  if (!el && a) { el = document.createElement('div'); el.id = 'attente'; el.className = 'attente'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); $('planche').appendChild(el); }
  if (el) { if (!a) el.hidden = true; else { const m = marges(); Object.assign(el.style, { left: m.gauche + 'px', right: m.droite + 'px', top: m.haut + 'px', bottom: m.bas + 'px' });
    el.innerHTML = `<i aria-hidden="true"></i><b>Le moteur place le folio ${esc(app.plan)}…</b><small>${pluriel(a.L.length, 'fil')} · quelques secondes — l’écran reste libre</small>`; el.hidden = false; } }
  const vifs = new Set(); if (a) vifs.add(app.plan); if (placement.encours && placement.attentes.has(placement.encours.cle)) vifs.add(placement.attentes.get(placement.encours.cle).plan);
  $('fo-strip').querySelectorAll('.chip').forEach(c => c.classList.toggle('attend', vifs.has(c.dataset.plan))); }
// le concours gardé : une entrée par version du moteur et folio ; les concours d'un moteur passé s'effacent, une fois par session
function garderConcours(cle, P) { ouvrirIDB().then(db => { db.transaction(IDB_CONCOURS, 'readwrite').objectStore(IDB_CONCOURS).put({ P, t: Date.now() }, VERSION_MOTEUR + '|' + cle); }).catch(() => { }); }
function lireConcours(cle) { return ouvrirIDB().then(db => new Promise(ok => { if (!placement.nettoye) { placement.nettoye = true; nettoyerConcours(db); }
  const r = db.transaction(IDB_CONCOURS).objectStore(IDB_CONCOURS).get(VERSION_MOTEUR + '|' + cle); r.onsuccess = () => ok((r.result && r.result.P) || null); r.onerror = () => ok(null); })).catch(() => null); }
function nettoyerConcours(db) { try { const st = db.transaction(IDB_CONCOURS, 'readwrite').objectStore(IDB_CONCOURS), req = st.openKeyCursor(), vieux = [];
  req.onsuccess = () => { const c = req.result; if (c) { if (!String(c.key).startsWith(VERSION_MOTEUR + '|')) vieux.push(c.key); c.continue(); } else vieux.forEach(k => st.delete(k)); }; } catch (_) { } }
/* Pour les bancs : envoyer le placement au loin sous pilote (il y dort), et lire où il en est. */
function placementAilleurs(on) { placement.ailleurs = !!on; if (on && app.contrat.liaisons.length && !app.dessin) redessiner(); return etatPlacement(); }
function etatPlacement() { const plan = cle => { const a = placement.attentes.get(cle); return a ? a.plan : null; };
  return { ailleurs: placement.ailleurs, worker: placement.worker === false ? 'refusé' : placement.worker ? 'oui' : 'pas encore', encours: placement.encours ? plan(placement.encours.cle) : null,
    file: placement.file.map(plan), attentes: [...placement.attentes.values()].map(a => a.plan), faits: placement.faits, relus: placement.relus, gardes: placements.size, erreur: placement.erreur }; }
/* ---- la RETOUCHE : déplacer un bloc à la souris, tout suit ------------- */
/* Le dessin automatique est le point de départ ; on en a la MAÎTRISE TOTALE. Un bloc (équipement, barrette, prise) se
   prend et glisse OÙ L'ON VEUT : en hauteur, et d'une colonne à l'autre (il se cale au milieu de la colonne la plus
   proche de la souris, si elle est assez large pour lui). Ses masses collées le suivent, ses fils se reroutent en
   direct, et il s'AIMANTE à la hauteur qui rend droit un de ses fils. Il ne chevauche jamais un voisin : posé sur
   lui, il glisse à la place libre la plus proche. Lâché, le folio est RETOUCHÉ : l'automatique ne repasse plus dessus
   (rien ne bouge sans qu'on l'ait voulu) ; son dessin se garde dans ce navigateur (IndexedDB), Ctrl+Z défait le
   geste, « automatique » rend la main au moteur. Au doigt, un appui long prend le bloc (un glissé simple déplace la
   vue). */
const AIMANT = 5, GARDE_RETOUCHE = 8;
// les pastilles (masses, morceaux de barrette seuls) collées au flanc d'un bloc, à sa hauteur : elles le suivent
const pastillesCollees = (comps, c) => comps.filter(t => t.kind === 'tag' && t.y + t.h / 2 > c.y - 1 && t.y + t.h / 2 < c.y + c.h + 1
  && (Math.abs(t.x + t.w + FIL_PASTILLE - c.x) < 2 || Math.abs(t.x - (c.x + c.w + FIL_PASTILLE)) < 2));
const surLeBloc = (c, nom, e) => String(nom) === String(c.name) && e.x >= c.x - 1 && e.x <= c.x + c.w + 1 && e.y >= c.y - 1 && e.y <= c.y + c.h + 1;
const decalerComp = (k, dy, dx, dcol) => { dx = dx || 0; dcol = dcol || 0;
  const rangs = {}; Object.keys(k.rangs || {}).forEach(lid => { rangs[lid] = k.rangs[lid].map(p => ({ ...p, y: p.y + dy, ...(p.x != null ? { x: p.x + dx } : {}) })); });
  const parCle = new Map(); (k.parCle || new Map()).forEach((v, cl) => parCle.set(cl, { ...v, y: v.y + dy, ...(v.x != null ? { x: v.x + dx } : {}) }));
  return { ...k, x: k.x + dx, y: k.y + dy, col: k.col + dcol, rangs, parCle }; };
// la colonne la plus proche d'une abscisse (le milieu du bloc), parmi celles assez larges pour lui ; rend son décalage
function colonneVisee(P, c, xMilieu) { const g = P.geom; if (!g || !g.colX || c.col == null) return { dcol: 0, dx: 0 };
  const milieu = k => g.colX[k] + g.colW[k] / 2; let mieux = c.col;
  g.colX.forEach((_, k) => { if (g.colW[k] + 1 < c.w) return; if (Math.abs(milieu(k) - xMilieu) < Math.abs(milieu(mieux) - xMilieu)) mieux = k; });
  return { dcol: mieux - c.col, dx: mieux === c.col ? 0 : Math.round(milieu(mieux) - milieu(c.col)) }; }
// la place libre la plus proche de dy, une fois le bloc dans sa colonne (décalé de dx) : jamais sur un voisin
function placeLibre(P, c, dx, dy) { const bb = app.dessin && app.dessin.bbox, x0 = c.x + dx, x1 = x0 + c.w, tags = pastillesCollees(P.comps, c);
  let lo = -Infinity, hi = Infinity;
  if (bb) { const k = bb.k || 1; lo = bb.y + (PAGE_CADRE + PAGE_MARGE) * k - c.y; hi = bb.y + bb.h - (PAGE_CADRE + PAGE_MARGE + PAGE_CARTOUCHE) * k - (c.y + c.h); }
  const autres = P.comps.filter(o => o !== c && o.kind !== 'tag' && !tags.includes(o) && o.x < x1 && x0 < o.x + o.w).map(o => [o.y - GARDE_RETOUCHE - c.h - c.y, o.y + o.h + GARDE_RETOUCHE - c.y]);
  const libre = d => d >= lo - 0.01 && d <= hi + 0.01 && !autres.some(([a, b]) => d > a && d < b);
  if (libre(dy)) return dy;
  const cands = [lo, hi, ...autres.flat()].filter(libre).sort((u, v) => Math.abs(u - dy) - Math.abs(v - dy));
  return cands.length ? cands[0] : null; }
// les hauteurs où un fil du bloc devient droit (son autre bout sur un bloc qui ne bouge pas)
function aimantsDuBloc(P, c, tags) { const ds = []; P.links.forEach(l => { if (l.shunt || l.boucle) return;
  [[l.de, l.epA, l.vers, l.epB], [l.vers, l.epB, l.de, l.epA]].forEach(([n, e, n2, e2]) => { if (!surLeBloc(c, n, e)) return;
    const autre = P.comps.find(k => surLeBloc(k, n2, e2)); if (!autre || autre === c || tags.includes(autre)) return; ds.push(e2.y - e.y); }); });
  return ds; }
// le dessin avec le bloc déplacé (dy en hauteur ; dx, dcol d'une colonne à l'autre), ses pastilles avec lui, rerouté
function deplacerBloc(P, c, dy, dx, dcol) { dx = dx || 0; dcol = dcol || 0; const tags = pastillesCollees(P.comps, c), bouge = new Set([c, ...tags]);
  const comps = P.comps.map(k => bouge.has(k) ? decalerComp(k, dy, dx, dcol) : k);
  const touche = (nom, e) => [...bouge].some(k => surLeBloc(k, nom, e));
  const bout = e => ({ ...e, y: e.y + dy, x: e.x + dx, ch: e.ch + dcol });
  const links = P.links.map(l => { const a = touche(l.de, l.epA), b = touche(l.vers, l.epB); if (!a && !b) return l;
    return { ...l, epA: a ? bout(l.epA) : l.epA, epB: b ? bout(l.epB) : l.epB }; });
  const compDe = new Map(); comps.forEach(k => { if (k.id != null) compDe.set(k.id, k); if (!compDe.has(k.name)) compDe.set(k.name, k); });
  const routage = router({ comps, links, geom: P.geom, bbox: P.bbox });
  return { ...P, comps, links, compDe, routage, retouche: true }; }
// la retouche se garde (IndexedDB) ; une clé sans retouche s'efface
function garderRetouche(cle) { const P = app.retouches.get(cle);
  ouvrirIDB().then(db => { const st = db.transaction(IDB_RETOUCHES, 'readwrite').objectStore(IDB_RETOUCHES); if (P) st.put({ P, t: Date.now() }, cle); else st.delete(cle); }).catch(() => { }); }
function relireRetouches() { ouvrirIDB().then(db => { const req = db.transaction(IDB_RETOUCHES, 'readonly').objectStore(IDB_RETOUCHES).openCursor(); let vu = false;
  req.onsuccess = () => { const c = req.result; if (!c) { if (vu) rafraichirDessin(); return; } if (c.value && c.value.P && !app.retouches.has(String(c.key))) { app.retouches.set(String(c.key), c.value.P); vu = true; } c.continue(); }; }).catch(() => { }); }
function revenirAutomatique() { const cle = cleCourante(); if (!cle || !app.retouches.has(cle)) return;
  histPush('retouche de ce folio'); app.retouches.delete(cle); garderRetouche(cle); rafraichirDessin(); dire('Dessin automatique rétabli.'); }
function synchroniserRetouche() { const b = $('btnAuto'); if (!b) return; const cle = cleCourante(); b.hidden = !(cle && app.retouches.has(cle)); }
function calculer() {
  const L = liaisonsDuPlan(); if (!L.length) { app.dessin = null; return null; }
  const P = placementDe(L); affinerTout();
  // la feuille : la même pour tous les folios (A3 paysage), le dessin calé dedans
  app.dessin = P ? { comps: P.comps, links: P.links, bbox: pageDe(P.comps, P.routage.fils), geom: P.geom, compDe: P.compDe,
                     fils: P.routage.fils, points: P.routage.points, barrettes: P.routage.barrettes, piquages: P.routage.piquages } : null;
  if (app.dessin) { const routes = couleursDesRoutes(), routeDe = w => (L[w.i] && L[w.i].route) || '';
    app.dessin.couleurDe = w => routes.get(routeDe(w)) || null; app.dessin.legende = legendeDesRoutes(app.dessin.fils.filter(w => !w.shunt && String(w.de) !== String(w.vers)), routeDe, routes);
    nommerBarrettesAPoser(app.dessin.barrettes, L); }
  return app.dessin;
}
/* Les BARRETTES À POSER du folio (01) : le routage les a posées au ras de leur borne (05, les `barrettes` du dessin) ;
   chacune reçoit ici son repère provisoire (VT1, VT2…) et, pour chaque borne, le numéro que le folio lui donne — la
   borne 1 pour le fil à créer, la borne du contrat pour chaque fil : la fiche et le plan disent la même chose. */
function nommerBarrettesAPoser(barrettes, L) { const noms = new Map();
  L.forEach(l => { if (VT_A_POSER.test(l.vers) && l.borneVers === '1' && !VT_A_POSER.test(l.de)) noms.set(l.de + '\u0001' + l.borneDe, l.vers); });
  (barrettes || []).forEach(b => { const nom = noms.get(b.propre + '\u0001' + b.etiquette); if (!nom) { delete b.nomVT; return; } b.nomVT = nom;
    b.bornes = (b.bornes || []).map(p => { const l = p.li != null ? L[p.li] : null; return { ...p, n: !l ? 1 : l.de === nom ? +l.borneDe : l.vers === nom ? +l.borneVers : null }; }); }); }
// la barrette à poser d'un repère, sur le dessin ; ses fils
const barretteAPoser = nom => ((app.dessin && app.dessin.barrettes) || []).find(b => b.nomVT === nom) || null;
const filsDeBarretteAPoser = nom => { const L = liaisonsDuPlan(); return ((app.dessin && app.dessin.fils) || []).filter(w => { const l = L[w.i]; return l && l.de !== l.vers && (l.de === nom || l.vers === nom); }); };
/* LES ROUTES : un fil prend la couleur de sa route (la colonne « route » ou « cheminement » du fichier). Une route garde
   sa couleur sur tous les folios du contrat — l'ordre naturel de leurs noms, dans une palette de dix teintes franches,
   lisibles sur le blanc et à l'impression ; une couleur choisie au contrat (`couleursRoutes`) passe devant. */
const PALETTE_ROUTES = ['#1f5fbf', '#c0392b', '#1e8449', '#d35400', '#7d3c98', '#117a8b', '#9a6324', '#c2185b', '#5d6d1e', '#34495e'];
function couleursDesRoutes() { const choisies = app.contrat.couleursRoutes || {}, m = new Map();
  [...new Set(app.contrat.liaisons.map(l => l.route).filter(Boolean))].sort(triNaturel).forEach((r, i) => m.set(r, choisies[r] || PALETTE_ROUTES[i % PALETTE_ROUTES.length]));
  return m; }
// la légende d'un folio : ses routes, chacune avec son nombre de fils ; « sans route » quand d'autres en ont une
function legendeDesRoutes(fils, routeDe, routes) { const n = new Map(); fils.forEach(w => { const r = routeDe(w); n.set(r, (n.get(r) || 0) + 1); });
  if (![...n.keys()].some(Boolean)) return [];
  return [...n].sort((a, b) => (!a[0]) - (!b[0]) || triNaturel(a[0], b[0])).map(([route, k]) => ({ route, n: k, couleur: routes.get(route) || null })); }
function folioCourant() { const P = plans();
  return (app.plan !== '*' && P.length > 1) ? (app.plan + ' / ' + P.length) : '1 / 1'; }
/* Ce qui s'écrit sous le repère : la désignation si on en a donné une ;
   sinon, pour une barrette, la référence choisie dans la bible, et pour une
   prise de coupure, le part number que le fichier porte. */
function designationDe(n) { const d = app.contrat.designations.get(n);
  // une barrette en modules : la désignation retenue (une variante, une norme) dit seulement ce que le remplissage vise
  if (estBarrette(n)) { const I = barretteInfos(n, verite(), app.bible, app.norme, d || ''); return I.plan ? I.reference : d || I.reference; }
  if (d) return d;
  if (estCoupure(n)) return coupureEnModules(n) ? planDeCoupure(n).plan.reference || coupureInfos(n, verite(), app.bible).reference : coupureInfos(n, verite(), app.bible).reference;
  return ''; }
/* La bible, la norme et les hypothèses de simulation (leur persistance, leur adoption) vivent dans 08-normes.js : relireBible, adopterBible, relireNorme, adopterNorme, relireSimu, memoriserSimu. */
function peindre() {
  const svg = $('svg');
  $('vide').hidden = app.contrat.liaisons.length > 0;
  // pas de dessin : la table vide — ou, si le folio se place au loin, l'attente à sa place
  if (!app.dessin) { svg.innerHTML = ''; appliquerVue(); montrerAttente(); return; }
  svg.innerHTML = styleDessin() + `<g id="scene" transform="translate(${app.vue.tx},${app.vue.ty}) scale(${app.vue.s})">`
    + sceneSvg(app.dessin, app.contrat.cartouche, folioCourant(), designationDe, app.choisi) + '</g>';
  appliquerVue(); montrerAttente();
}
function redessiner() { calculer(); peindre(); synchroniser(); rallumer(); }

/* ---- la vue : zoom, cadrage, l'ombre sous la feuille ------------------- */
const cadre = () => $('planche').getBoundingClientRect();
function appliquerVue() {
  const sc = $('scene'); if (sc) sc.setAttribute('transform', `translate(${app.vue.tx},${app.vue.ty}) scale(${app.vue.s})`);
  // le zoom se lit par rapport à la feuille : la même feuille, cadrée, affiche le même pourcentage sur tous les folios
  $('zlbl').textContent = Math.round(app.vue.s * (app.dessin && app.dessin.bbox.k || 1) * 100) + ' %';
  const o = $('ombre');
  if (!app.dessin) { o.style.display = 'none'; return; }
  const bb = app.dessin.bbox, s = app.vue.s;
  o.style.display = 'block'; o.style.transform = `translate(${app.vue.tx + bb.x * s}px,${app.vue.ty + bb.y * s}px)`;
  o.style.width = bb.w * s + 'px'; o.style.height = bb.h * s + 'px';
}
/* Le vide que laissent le rail, la réglette des folios et le document
   ouvert : la feuille se cadre dedans. Sur téléphone tout est en bas, empilé
   au-dessus du tiroir : le rail (48), puis les folios (44) s'il y en a. */
const RAIL = 52;   // la largeur du rail de gauche ; le plan commence après (et sous la barre du haut, --entete)
/* La place du plan : ce que laissent l'inspecteur (à droite), le tableau (en bas), la fiche des documents (à droite).
   Le plan se recadre dans ce qui reste : rien ne le recouvre. */
function marges() { const tel = telephone(), folios = !$('folios').hidden, vu = id => !$(id).hidden ? $(id) : null;
  const droite = vu('fiche') || vu('inspecteur'), bas = vu('base'), jeton = n => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)) || 0;
  const entete = jeton('--entete'), rail = jeton('--rail') || RAIL, pied = jeton('--pied') || 40;
  if (tel) { const d = vu('fiche') || vu('inspecteur') || bas; return { haut: 16 + entete, bas: (d ? d.offsetHeight + 8 : 8) + 56 + (folios ? 52 : 0), gauche: 12, droite: 12 }; }
  return { haut: 24 + entete, bas: (bas ? bas.offsetHeight + 16 : 0) + (folios ? pied + 24 : 24), gauche: rail + 24, droite: 24 + (droite ? droite.offsetWidth + 8 : 0) }; }
let anim = null;
function animerVue(cible, doux) {
  if (anim) { cancelAnimationFrame(anim); anim = null; }
  if (!doux || mouvementReduit()) { app.vue = cible; appliquerVue(); return; }
  const de = { ...app.vue }, t0 = performance.now(), D = 260;
  const pas = t => { const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3);
    app.vue = { s: de.s + (cible.s - de.s) * e, tx: de.tx + (cible.tx - de.tx) * e, ty: de.ty + (cible.ty - de.ty) * e };
    appliquerVue(); anim = k < 1 ? requestAnimationFrame(pas) : null; };
  anim = requestAnimationFrame(pas);
}
function ajuster(doux) {
  if (!app.dessin) { app.vue = { s: 1, tx: 40, ty: 40 }; appliquerVue(); return; }
  const bb = app.dessin.bbox, r = cadre(), m = marges();
  const W = Math.max(80, r.width - m.gauche - m.droite), H = Math.max(80, r.height - m.haut - m.bas);
  const s = Math.max(ZMIN, Math.min(ZMAX, Math.min(W / bb.w, H / bb.h)));
  animerVue({ s, tx: m.gauche + (W - bb.w * s) / 2 - bb.x * s, ty: m.haut + (H - bb.h * s) / 2 - bb.y * s }, doux);
}
function zoomer(k, mx, my) { const r = cadre(); if (mx == null) { mx = r.width / 2; my = r.height / 2; }
  const wx = (mx - app.vue.tx) / app.vue.s, wy = (my - app.vue.ty) / app.vue.s;
  const ns = Math.max(ZMIN, Math.min(ZMAX, app.vue.s * k));
  app.vue = { s: ns, tx: mx - wx * ns, ty: my - wy * ns }; appliquerVue(); }
const versMonde = (cx, cy) => { const r = cadre(); return { x: (cx - r.left - app.vue.tx) / app.vue.s, y: (cy - r.top - app.vue.ty) / app.vue.s }; };
function blocSous(w) { if (!app.dessin) return null; const cs = app.dessin.comps;
  for (let i = cs.length - 1; i >= 0; i--) { const c = cs[i]; if (w.x >= c.x - 5 && w.x <= c.x + c.w + 5 && w.y >= c.y - 5 && w.y <= c.y + c.h + 5) return c; } return null; }
function filSous(w) { if (!app.dessin) return null; const tol = Math.max(4, 7 / app.vue.s); let best = null, bd = tol;
  const d = (px, py, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy; let t = L2 ? ((px - a.x) * dx + (py - a.y) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy)); };
  for (const f of app.dessin.fils) for (let i = 0; i < f.pts.length - 1; i++) { const dd = d(w.x, w.y, f.pts[i], f.pts[i + 1]); if (dd < bd) { bd = dd; best = f; } }
  return best; }
/* Aller voir quelque chose : on le met au centre du vide, lisible. Au téléphone la place est petite : un bloc haut (un
   calculateur) y tiendrait en vignette illisible. On le cadre alors sur sa largeur, assez grand pour que son repère se
   lise (LISIBLE : cent pixels de large), et l'on en montre le haut — le reste se fait défiler au doigt. */
const LISIBLE = 100;
function centrerSur(x, y, w, h) { const r = cadre(), m = marges(), W = r.width - m.gauche - m.droite, H = r.height - m.haut - m.bas;
  let s = Math.max(app.vue.s, Math.min(1.1, Math.min(W / (w + 80), H / (h + 80))));
  if (telephone()) s = Math.max(s, Math.min(2.5, W / (w + 24), LISIBLE / Math.max(w, 40)));
  const cx = m.gauche + W / 2, cy = m.haut + H / 2, entier = h * s <= H - 16;
  animerVue({ s, tx: cx - (x + w / 2) * s, ty: entier ? cy - (y + h / 2) * s : m.haut + 12 - y * s }, true); }
function viser(nom) { const c = app.dessin && app.dessin.compDe.get(nom);
  if (!c) { const b = barretteAPoser(nom); if (!b) return false; const bs = bornesDePiquage(b); centrerSur(b.x - 30, bs[0].y - 20, 60, bs[bs.length - 1].y - bs[0].y + 50); return true; }
  centrerSur(c.x, c.y, c.w, c.h); return true; }
function viserFil(f) { const xs = f.pts.map(p => p.x), ys = f.pts.map(p => p.y);
  const x0 = Math.min(...xs), y0 = Math.min(...ys); centrerSur(x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0); }

/* ---- la surbrillance : des classes sur le rendu, jamais un recalcul ---- */
function eteindre() { const sc = $('scene'); if (!sc) return;
  if (sc.classList.contains('focus')) { sc.classList.remove('focus'); sc.querySelectorAll('.hl').forEach(el => el.classList.remove('hl')); } }
function allumerBloc(nom) { const sc = $('scene'); if (!sc) return; eteindre(); sc.classList.add('focus'); nom = xmlSur(nom);
  const autres = new Set();
  sc.querySelectorAll('.cab').forEach(p => { const a = p.dataset.a, b = p.dataset.b; if (a === nom || b === nom) { p.classList.add('hl'); autres.add(a); autres.add(b); } });
  sc.querySelectorAll('.comp').forEach(g => { if (g.dataset.name === nom || autres.has(g.dataset.name)) g.classList.add('hl'); }); }
/* Plusieurs fils à la fois : ceux d'un module de barrette qu'on survole. */
function allumerFils(ws) { const sc = $('scene'); if (!sc) return; eteindre(); if (!ws.length) return; sc.classList.add('focus');
  const idx = new Set(ws.map(w => w.i)), noms = new Set(); ws.forEach(w => { noms.add(xmlSur(w.de)); noms.add(xmlSur(w.vers)); });
  sc.querySelectorAll('.cab').forEach(p => { if (idx.has(+p.dataset.i)) p.classList.add('hl'); });
  sc.querySelectorAll('.comp').forEach(g => { if (noms.has(g.dataset.name)) g.classList.add('hl'); });
  sc.querySelectorAll('.vt').forEach(g => { if (noms.has(g.dataset.vt)) g.classList.add('hl'); }); }
const allumerFil = f => allumerFils([f]);
// une barrette à poser s'allume avec ses fils ; par sa clé de fil (08 bis), un fil ou, à défaut, la barrette de son raccord
function allumerBarretteAPoser(nom) { const sc = $('scene'); if (!sc) return; const ws = filsDeBarretteAPoser(nom); allumerFils(ws);
  if (!ws.length) { eteindre(); sc.classList.add('focus'); } sc.querySelectorAll('.vt').forEach(g => { if (g.dataset.vt === xmlSur(nom)) g.classList.add('hl'); }); }
function allumerCle(k) { const w = filDeCle(k); if (w) { allumerFil(w); return true; }
  const l = k && k[0] === 'p' ? liaisonsDuPlan()[+k.slice(1)] : null; if (l && l.aPoser) { allumerBarretteAPoser(l.aPoser); return true; } return false; }
/* Ce qui est choisi reste allumé après un survol ou un redessin ; la ligne
   qu'on écrit passe devant. */
function rallumer() { const c = app.cible, w = app.actif && filDe(app.actif);
  if (w) allumerFil(w);
  else if (c && c.type === 'bloc' && app.dessin && app.dessin.compDe.has(c.nom)) allumerBloc(c.nom);
  else if (c && c.type === 'bloc' && app.dessin && barretteAPoser(c.nom)) allumerFils(filsDeBarretteAPoser(c.nom));
  else if (c && c.type === 'fil' && app.dessin) { const w = filDe(c.l); if (w) allumerFil(w); else eteindre(); }
  else eteindre();
  marquerLignes(); }
function filDe(l) { if (!app.dessin) return null; const L = liaisonsDuPlan();
  return app.dessin.fils.find(w => L[w.i] === l || sourceDe(L[w.i]) === l) || null; }

/* ---- la planche : pan, pinch, molette, clic, survol -------------------- */
function lierPlanche() {
  const stage = $('planche'); const pointeurs = new Map(); let mode = null, pan = null, pinch = null, bouge = false, origine = null, survole = null;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const debutPinch = () => { mode = 'pinch'; pan = null; const r = cadre(); const p = [...pointeurs.values()];
    const mx = (p[0].x + p[1].x) / 2 - r.left, my = (p[0].y + p[1].y) / 2 - r.top;
    pinch = { d: dist(p[0], p[1]), wx: (mx - app.vue.tx) / app.vue.s, wy: (my - app.vue.ty) / app.vue.s, s0: app.vue.s }; };
  const suitPinch = () => { const r = cadre(); const p = [...pointeurs.values()]; if (p.length < 2) return;
    const ns = Math.max(ZMIN, Math.min(ZMAX, pinch.s0 * dist(p[0], p[1]) / pinch.d));
    const mx = (p[0].x + p[1].x) / 2 - r.left, my = (p[0].y + p[1].y) / 2 - r.top;
    app.vue = { s: ns, tx: mx - pinch.wx * ns, ty: my - pinch.wy * ns }; appliquerVue(); };
  /* la PRISE d'un bloc (la retouche) : à la souris, appuyer sur un bloc et glisser le déplace, où l'on veut ; au doigt,
     un appui long le prend, un glissé simple déplace la vue. `prise` : le bloc, le point de départ, le dessin d'avant */
  let prise = null, long = null, image = 0, dernierBloc = null, dernierAppui = null;
  const prenable = c => c && c.kind !== 'tag' && !c.rail && !estRenvoi(c.name);
  const commencerPrise = () => { const L = liaisonsDuPlan(), cle = L.length ? clePlacement(L) : null; if (!cle) return false;
    const P = placementDe(L), c = P.comps.find(k => k === prise.c) || null; if (!c) return false;
    const tags = pastillesCollees(P.comps, c);
    Object.assign(prise, { cle, P, avant: app.retouches.get(cle) || null, aimants: aimantsDuBloc(P, c, tags), dy: 0, dx: 0, dcol: 0 });
    histPush('déplacer ' + c.name); mode = 'bloc'; stage.classList.add('deplace'); eteindre(); return true; };
  const suitPrise = e => { const w = versMonde(e.clientX, e.clientY), c = prise.c; let dy = Math.round((w.y - prise.wy) * 2) / 2;
    const { dcol, dx } = colonneVisee(prise.P, c, c.x + c.w / 2 + (w.x - prise.wx));
    // l'aimant (un fil qui devient droit) ne vaut que dans la colonne d'origine : ailleurs les hauteurs changent de sens
    const tol = Math.max(2, Math.min(14, 6 / app.vue.s)), a = dcol ? null : prise.aimants.filter(d => Math.abs(d - dy) <= tol).sort((u, v) => Math.abs(u - dy) - Math.abs(v - dy))[0];
    if (a != null) dy = a;
    const d = placeLibre(prise.P, c, dx, dy); if (d == null) return; dy = d;
    if (dy === prise.dy && dcol === prise.dcol) return; Object.assign(prise, { dy, dx, dcol });
    cancelAnimationFrame(image); image = requestAnimationFrame(() => { app.retouches.set(prise.cle, dy || dcol ? deplacerBloc(prise.P, c, dy, dx, dcol) : (prise.avant || deplacerBloc(prise.P, c, 0)));
      calculer(); peindre(); }); };
  const finPrise = () => { cancelAnimationFrame(image); stage.classList.remove('deplace');
    if (!prise.dy && !prise.dcol) { if (prise.avant) app.retouches.set(prise.cle, prise.avant); else app.retouches.delete(prise.cle); app.hist.pop(); synchroniserHistorique(); }
    else { app.retouches.set(prise.cle, deplacerBloc(prise.P, prise.c, prise.dy, prise.dx, prise.dcol)); garderRetouche(prise.cle);
      dire(prise.c.name + ' déplacé — ce folio garde vos retouches · Ctrl+Z pour défaire, « automatique » pour rendre la main au moteur'); }
    calculer(); peindre(); synchroniser(); rallumer(); prise = null; };
  // l'ACCUEIL (#vide) vit sur la planche : un appui qui en part est un clic sur ses boutons, pas une prise de la vue — ni
  // capture du pointeur (elle volerait le « click » au bouton), ni pan
  const surLAccueil = e => !!(e.target && e.target.closest && e.target.closest('#vide'));
  stage.addEventListener('pointerdown', e => { if (e.button && e.button !== 0) return; fermerMenu(); fermerRecherche(); if (surLAccueil(e)) return;
    try { stage.setPointerCapture(e.pointerId); } catch (_) { }
    pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY }); clearTimeout(long);
    if (pointeurs.size >= 2) { prise = null; debutPinch(); return; }
    bouge = false; origine = [e.clientX, e.clientY]; mode = 'pan'; pan = { tx: app.vue.tx, ty: app.vue.ty, x: e.clientX, y: e.clientY };
    const w = versMonde(e.clientX, e.clientY), c = blocSous(w), vt = c ? null : barretteAPoserSous(w); prise = prenable(c) ? { c, wy: w.y, wx: w.x } : null;
    if (!dernierBloc || Date.now() - dernierBloc.t > 800) dernierBloc = c ? { nom: c.name, t: Date.now() } : vt ? { nom: vt.nomVT, t: Date.now() } : null;   // le premier appui d'un double-clic fait foi
    if (prise && e.pointerType !== 'touch') mode = 'prise';
    else if (prise) long = setTimeout(() => { if (mode === 'pan' && !bouge && prise && commencerPrise()) { if (navigator.vibrate) navigator.vibrate(12); } }, 380); });
  stage.addEventListener('pointermove', e => { if (pointeurs.has(e.pointerId)) pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (mode === 'pinch') { suitPinch(); return; } if (!mode) return;
    if (origine && (Math.abs(e.clientX - origine[0]) > 3 || Math.abs(e.clientY - origine[1]) > 3)) { if (!bouge && mode === 'prise' && !commencerPrise()) mode = 'pan'; bouge = true; clearTimeout(long); if (mode === 'pan') stage.classList.add('tient'); }
    if (mode === 'bloc') { suitPrise(e); return; }
    if (mode === 'pan') { app.vue.tx = pan.tx + (e.clientX - pan.x); app.vue.ty = pan.ty + (e.clientY - pan.y); appliquerVue(); } });
  const fin = e => { try { stage.releasePointerCapture(e.pointerId); } catch (_) { } stage.classList.remove('tient'); clearTimeout(long);
    const etaitPinch = mode === 'pinch'; pointeurs.delete(e.pointerId);
    if (etaitPinch) { if (pointeurs.size < 2) { mode = null; pinch = null; } return; }
    if (mode === 'bloc') { finPrise(); mode = null; pan = null; return; }
    if ((mode === 'pan' || mode === 'prise') && !bouge) {
      /* le DOUBLE appui se reconnaît ici : le premier clic choisit le bloc et redessine la page, et le navigateur
         n'émet alors ni « click » ni « dblclick » — deux appuis à moins de 400 ms, au même endroit */
      const t = Date.now(), d = dernierAppui; dernierAppui = { t, x: e.clientX, y: e.clientY }; appuiDuPlan = { ...dernierAppui, nom: dernierBloc && dernierBloc.nom };
      if (d && t - d.t < 400 && Math.abs(e.clientX - d.x) < 8 && Math.abs(e.clientY - d.y) < 8) { dernierAppui = null; doubleAppui(e); }
      else cliquer(versMonde(e.clientX, e.clientY)); }
    mode = null; pan = null; prise = null; };
  // double appui : sur une barrette ou une prise, sa vue en relief ; ailleurs, on zoome
  const doubleAppui = e => { const w = versMonde(e.clientX, e.clientY), c = blocSous(w), vt = c ? null : barretteAPoserSous(w);
    const nom = dernierBloc && Date.now() - dernierBloc.t < 800 ? dernierBloc.nom : (c && c.name) || (vt && vt.nomVT);
    if (nom && reliefPossible(nom)) { ouvrirRelief(nom); return; }
    const r = cadre(); zoomer(1.6, e.clientX - r.left, e.clientY - r.top); };
  stage.addEventListener('pointerup', fin); stage.addEventListener('pointercancel', fin);
  /* Le premier appui sur un bloc près du bord droit ouvre l'inspecteur SOUS le pointeur : le second appui du double-clic
     tombe sur la fiche. Il compte quand même — la vue en relief du bloc — et la fiche ne le reçoit pas. */
  const insp = $('inspecteur'); let avale = 0;
  insp.addEventListener('pointerup', e => { const d = appuiDuPlan; appuiDuPlan = null;
    if (!d || Date.now() - d.t > 400 || Math.abs(e.clientX - d.x) > 8 || Math.abs(e.clientY - d.y) > 8 || !d.nom || !reliefPossible(d.nom)) return;
    avale = Date.now(); e.preventDefault(); e.stopPropagation(); ouvrirRelief(d.nom); }, true);
  insp.addEventListener('click', e => { if (Date.now() - avale < 400) { e.preventDefault(); e.stopPropagation(); } }, true);
  stage.addEventListener('mousemove', e => { if (mode || pointeurs.size) return;
    const c = blocSous(versMonde(e.clientX, e.clientY)); const nm = c ? c.name : null;
    if (nm !== survole) { survole = nm; if (nm) allumerBloc(nm); else rallumer(); } });
  stage.addEventListener('mouseleave', () => { if (!mode) { survole = null; rallumer(); } });
  stage.addEventListener('wheel', e => { if (surLAccueil(e)) return;   // l'accueil défile, il ne zoome pas
    e.preventDefault(); const r = cadre(); zoomer(Math.exp(-e.deltaY * 0.0014), e.clientX - r.left, e.clientY - r.top); }, { passive: false });

}
let appuiDuPlan = null;   // le dernier appui simple sur la planche (l'instant, l'endroit, le bloc) : un double-clic peut finir ailleurs
/* Un clic sur la planche : un bloc, un renvoi, un fil, ou le vide. */
function cliquer(w) { const c = blocSous(w);
  if (c) { if (estRenvoi(c.name)) { const t = c.name.replace(RENVOI, ''); if (plans().includes(t)) allerAuPlan(t); return; }
    if (c.rail) return; choisirBloc(c); return; }
  const vt = barretteAPoserSous(w); if (vt) { choisirBarretteAPoser(vt); return; }
  const f = filSous(w); if (f) choisirFil(f); else deselectionner(); }
// une barrette à poser sous le pointeur : sur sa ligne, de sa première à sa dernière borne
function barretteAPoserSous(w) { const tol = 5 / Math.max(0.4, app.vue.s) + 3;
  return ((app.dessin && app.dessin.barrettes) || []).find(b => { if (!b.nomVT) return false; const bs = bornesDePiquage(b); return Math.abs(w.x - b.x) <= tol && w.y >= bs[0].y - tol && w.y <= bs[bs.length - 1].y + tol; }) || null; }
/* Choisir une barrette à poser : sa fiche, ses fils allumés, le tableau filtré sur la borne qu'elle dédouble. */
function choisirBarretteAPoser(b) { app.choisi = b.nomVT; app.cible = { type: 'bloc', nom: b.nomVT };
  if (app.base.ouvert) { app.base.filtre = filtreDuBloc(b.nomVT); app.base.filtreAuto = true; app.base.defiler = true; rendreBase(); }
  peindre(); ouvrirInspecteur(); allumerFils(filsDeBarretteAPoser(b.nomVT)); }
/* Ce que le tableau filtre pour un bloc : son repère ; pour une barrette à poser, qui n'est pas au contrat, l'équipement
   qu'elle dédouble (ses fils y sont). */
const filtreDuBloc = nom => { if (!VT_A_POSER.test(nom)) return nom; const r = liaisonsDuPlan().find(l => l.origine === null && l.vers === nom && l.borneVers === '1'); return r ? r.de : ''; };
/* Choisir un bloc : sa fiche dans l'inspecteur ; le tableau, s'il est ouvert, se filtre sur lui. */
function choisirBloc(c) { app.choisi = c.name; app.cible = { type: 'bloc', nom: c.name };
  if (app.base.ouvert) { app.base.filtre = filtreDuBloc(c.name); app.base.filtreAuto = true; app.base.defiler = true; rendreBase(); }
  peindre(); ouvrirInspecteur(); allumerBloc(c.name); }
/* Choisir un fil : sa fiche ; dans le tableau ouvert, sa ligne se marque et vient sous les yeux. */
function choisirFil(f) { const l = liaisonsDuPlan()[f.i]; if (!l) return; const src = sourceDe(l) || l;
  if (app.choisi) { app.choisi = null; peindre(); }
  app.cible = { type: 'fil', l: src, f };
  if (app.base.ouvert) { app.base.defiler = true; if (!lignesVisibles().some(([x]) => x === src)) app.base.filtre = ''; rendreBase(); }
  ouvrirInspecteur(); allumerFil(f); }
/* Ne plus rien choisir : la fiche se ferme — ou rend la place à l'index, si c'est de lui qu'elle venait. */
function deselectionner() { const c = app.cible;
  if (c) { app.cible = null; if (app.choisi) { app.choisi = null; peindre(); }
    if (c.type === 'bloc' && app.base.filtre && app.base.filtre === filtreDuBloc(c.nom)) { app.base.filtre = ''; app.base.filtreAuto = false; rendreBase(); }
    else marquerLignes(); eteindre();
    if (app.insp.index && !$('inspecteur').hidden) { rendreFiche(); return; } }
  fermerInspecteur();
  if (app.fiche) fermerFiche(true); }
const retourIndex = () => deselectionner();
/* L'inspecteur : s'ouvre sur ce qu'on choisit, se ferme quand on ne choisit plus rien ; le plan se recadre à côté
   (sans bouger si ce qu'on vient de choisir est déjà en vue). */
function ouvrirInspecteur() { const el = $('inspecteur'), etait = !el.hidden; if (app.fiche) fermerFiche();
  el.hidden = false; document.body.classList.add('insp-ouvert'); rendreFiche(); synchroniserRail();
  if (!etait) { el.classList.remove('entre'); void el.offsetWidth; el.classList.add('entre'); recadrerSiCache(); } }
function fermerInspecteur() { const el = $('inspecteur'); app.insp.index = false; synchroniserRail(); if (el.hidden) return; el.hidden = true; document.body.classList.remove('insp-ouvert'); recadrerSiCache(); }
/* Le rail dit ce qui est ouvert : l'outil dont le panneau est là se marque pressé (le trait cyan contre le bord). */
function synchroniserRail() { const p = (id, on) => { const b = $(id); if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false'); };
  p('btnIndex', app.insp.index && !$('inspecteur').hidden); p('btnCherche', document.body.classList.contains('cherche')); p('btnBible', !!(app.fiche && app.fiche.mode === 'bible')); }

/* ---- l'INDEX : les repères du contrat ---------------------------------- */
/* Le lecteur : « on se repère pas, on est perdu ». Un bouton du rail (R) ouvre l'inspecteur sur la liste de tous les
   repères — équipements, barrettes (celles à poser comprises), prises —, chacun avec son état et ses folios ; on y
   cherche ; un clic ouvre la fiche, la flèche ramène à la liste. Rien n'est caché derrière le plan. */
function basculerIndex() { if (!$('inspecteur').hidden && app.insp.index) { if (app.cible) retourIndex(); else fermerInspecteur(); return; }   // depuis une fiche venue de l'index, R ramène à la liste
  if (!(app.contrat.liaisons.length || verite().length)) { dire('Rien à montrer : dépose d’abord un fichier.'); return; }
  app.insp.index = true; if (app.cible) { const c = app.cible; app.cible = null; if (app.choisi) { app.choisi = null; peindre(); }
    if (c.type === 'bloc' && app.base.filtreAuto) { app.base.filtre = ''; app.base.filtreAuto = false; rendreBase(); } eteindre(); marquerLignes(); }
  ouvrirInspecteur(); const q = $('ix-q'); if (q && !telephone()) q.focus(); }
// les repères du contrat, et les barrettes à poser de chaque folio : nom, genre, ce qu'on écrit dessous, ses folios
function reperesDuContrat() { const V = verite(), out = [];
  reperesDe(V).filter(r => !estRenvoi(r) && !estMasse(r) && !estRail(r)).forEach(nom => { const des = app.contrat.designations.get(nom) || '';
    const genre = estCoupure(nom) ? 'coupure' : estBarrette(nom) ? 'barrette' : estDisjoncteur(nom) ? 'cb' : 'eqpt';
    let sous = des || designationDe(nom);
    if (genre === 'cb') { const c = calibreDe(nom); sous = (c ? amperes(c) : '') + (sous && sous !== 'disjoncteur' ? (c ? ' · ' : '') + sous : ''); }
    if (!sous && genre === 'eqpt') sous = [...new Set(connecteursDe(nom, V).map(c => c.pn).filter(Boolean))].slice(0, 2).join(' · ');
    if (!sous) sous = pluriel(V.filter(l => l.de === nom || l.vers === nom).length, 'fil');
    out.push({ nom, genre, plans: plansDuRepere(nom).sort(triNaturel), sous }); });
  (plans().length ? plans() : ['*']).forEach(p => liaisonsDe(p).forEach(l => { if (l.origine === null && l.vers === l.aPoser && l.borneVers === '1')
    out.push({ nom: l.aPoser, genre: 'barrette', plan: p, plans: p === '*' ? [] : [p], sous: 'à poser sur ' + l.de + ':' + l.borneDe }); }));
  return out.sort((a, b) => triNaturel(a.nom, b.nom) || triNaturel(a.plan || '', b.plan || '')); }
/* L'index : d'abord ce qu'il y a à reprendre (08 quater), puis les repères par genre — les disjoncteurs à part. */
function rendreIndex(box) { const etats = new Map();
  (CONTROLE.items || []).forEach(x => { if (!x.nom) return; if (x.niveau === 'ko' || !etats.has(x.nom)) etats.set(x.nom, x.niveau); });
  const f = app.insp.filtre.trim().toLowerCase(), items = reperesDuContrat().filter(r => !f || r.nom.toLowerCase().includes(f) || r.sous.toLowerCase().includes(f));
  // ce que le filtre a trouvé, surligné dans le repère et sa ligne
  const marque = t => { const h = esc(t); if (!f) return h; const i = String(t).toLowerCase().indexOf(f); return i < 0 ? h : esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + f.length)) + '</mark>' + esc(t.slice(i + f.length)); };
  const groupes = [['cb', 'Disjoncteurs'], ['eqpt', 'Équipements'], ['barrette', 'Barrettes'], ['coupure', 'Prises de coupure']].map(([g, t]) => { const xs = items.filter(r => r.genre === g); if (!xs.length) return '';
    return `<div class="ix-groupe"><span>${t}</span><b>${xs.length}</b></div><ul class="ix-liste">` + xs.map(r => `<li><button class="ix-item" data-nom="${escA(r.nom)}"${r.plan ? ` data-plan="${escA(r.plan)}"` : ''}>`
      + `<span class="ix-etat ${etats.get(r.nom) || 'ok'}" aria-hidden="true"></span><span class="min0"><b>${marque(r.nom)}</b><small>${insecable(marque(r.sous))}</small></span>`
      + (r.plans.length ? `<span class="ix-folio" title="Folio">${esc(r.plans.length > 3 ? r.plans.length + ' folios' : 'f. ' + r.plans.join(' · '))}</span>` : '') + '</button></li>').join('') + '</ul>'; }).join('');
  const meme = box.dataset.cle === 'index', haut = box.scrollTop, nko = (CONTROLE.items || []).filter(x => x.niveau === 'ko').length, natt = (CONTROLE.items || []).length - nko;
  box.className = 'fi ix'; box.dataset.cle = 'index';
  box.innerHTML = `<header class="ix-tete"><h2>Repères<b class="ix-n" title="${escA(pluriel(items.length, 'repère') + ' — hors renvois, masses et rails')}">${items.length}</b></h2><span class="espace"></span><button class="fi-x plus" id="ix-plus" title="Ajouter un équipement : son repère, puis ses fils dans le tableau" aria-label="Ajouter un équipement" aria-expanded="${!!app.insp.ajout}">${ico('plus')}</button><button class="fi-x" id="in-fermer" aria-label="Fermer (Échap)">${ico('fermer')}</button></header>`
    // ajouter un équipement : un champ en ligne, sous le titre (pas une boîte du navigateur)
    + (app.insp.ajout ? `<form class="ix-ajout" id="ix-ajout"><div class="filtre">${ico('plus')}<input id="ix-nouveau" placeholder="Repère du nouvel équipement, par exemple 105RL2" aria-label="Repère du nouvel équipement" autocomplete="off" spellcheck="false"></div><button class="btn cuivre" type="submit">Ajouter</button><button class="btn lien" type="button" id="ix-annuler">Annuler</button></form>` : '')
    + `<div class="filtre ix-filtre">${ico('loupe')}<input id="ix-q" value="${escA(app.insp.filtre)}" placeholder="Chercher un repère, une désignation" aria-label="Chercher un repère" autocomplete="off" spellcheck="false"><button class="vider" id="ix-vider"${f ? '' : ' hidden'} aria-label="Effacer la recherche">×</button></div>`
    + (f ? '' : `<details class="ix-controle"${nko ? ' open' : ''}><summary><span class="fi-etat ${nko ? 'ko' : natt ? 'att' : 'ok'}"><i aria-hidden="true">${nko ? '✕' : natt ? '!' : '✓'}</i>${nko ? pluriel(nko, 'problème') + (natt ? ' · ' + natt + ' à voir' : '') : natt ? natt + ' à voir' : 'rien à reprendre'}</span>${(nko || natt) ? ico('bas', 'fi-chevron') : ''}</summary>${listeControleHtml()}</details>`)
    + (groupes || `<p class="ix-vide">Aucun repère ne contient « ${esc(app.insp.filtre.trim())} ». <button class="btn lien" id="ix-effacer">Effacer</button></p>`);
  // la même liste refaite (un filtre tapé) garde sa place ; l'index qu'on ouvre commence en haut, titre et recherche en vue
  box.scrollTop = meme ? haut : 0;
  $('in-fermer').onclick = () => fermerInspecteur();
  const q = $('ix-q'); q.addEventListener('input', () => { app.insp.filtre = q.value; const pos = q.selectionStart; rendreIndex(box); const q2 = $('ix-q'); q2.focus(); q2.setSelectionRange(pos, pos); });
  q.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); if (q.value) { q.value = ''; q.dispatchEvent(new Event('input')); } else fermerInspecteur(); }
    else if (e.key === 'Enter') { const b = box.querySelector('.ix-item[data-nom]'); if (b) b.click(); } });
  const effacer = () => { app.insp.filtre = ''; rendreIndex(box); const q2 = $('ix-q'); if (q2) q2.focus(); };
  ['ix-vider', 'ix-effacer'].forEach(id => { const b = $(id); if (b) b.onclick = effacer; });
  $('ix-plus').onclick = () => { app.insp.ajout = !app.insp.ajout; rendreIndex(box); const n = $('ix-nouveau'); if (n) n.focus(); };
  const aj = $('ix-ajout'); if (aj) { const n = $('ix-nouveau'), fin = () => { app.insp.ajout = false; rendreIndex(box); };
    aj.addEventListener('submit', e => { e.preventDefault(); const r = n.value.trim(); if (!r) { n.focus(); return; } fin();
      if (!app.base.ouvert) ouvrirBase(); ajouterLiaison(r); dire(r + ' : écris ses fils dans le tableau, le plan suit.'); });
    $('ix-annuler').onclick = fin; n.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); fin(); } }); }
  const det = box.querySelector('.ix-controle'); if (det) det.addEventListener('toggle', () => { CONTROLE.ouvert = det.open; });
  if (det && CONTROLE.ouvert != null && !nko) det.open = !!CONTROLE.ouvert;
  box.querySelectorAll('.ix-item.co-item').forEach(b => b.onclick = () => allerAuControle(CONTROLE.items[+b.dataset.k]));
  box.querySelectorAll('.ix-item[data-nom]').forEach(b => b.onclick = () => allerAuRepere(b.dataset.nom, b.dataset.plan)); }
// depuis l'index : le folio du repère, son bloc choisi sur le plan, sa fiche
function allerAuRepere(nom, plan) { const P = plans();
  if (plan && plan !== app.plan && P.includes(plan)) allerAuPlan(plan);
  else if (!plan) { const ou = plansDuRepere(nom); if (app.plan !== '*' && ou.length && !ou.includes(app.plan)) allerAuPlan(ou[0]); }
  const c = app.dessin && app.dessin.comps.find(k => k.name === nom && k.kind !== 'tag'), vt = c ? null : barretteAPoser(nom);
  if (c) choisirBloc(c); else if (vt) choisirBarretteAPoser(vt); else { app.cible = { type: 'bloc', nom }; ouvrirInspecteur(); }
  viser(nom); }
/* Le panneau qui s'ouvre ou se ferme change la place du plan : on le recadre en douceur. */
function recadrerSiCache() { ajuster(true); }

/* ---- les folios : y aller, les montrer --------------------------------- */
function allerAuPlan(plan) { if (plan === app.plan) return; app.plan = plan; app.choisi = null; fermerFiche(); redessiner(); ajuster(); }
function allerAuFolio(pas) { const P = plans(); let i = P.indexOf(app.plan);
  if (i < 0) i = pas > 0 ? -1 : P.length; i += pas; if (i < 0 || i >= P.length) return; allerAuPlan(P[i]); }
function plansDuRepere(nom) { return [...new Set(app.contrat.liaisons.filter(l => l.de === nom || l.vers === nom).map(l => l.plan).filter(Boolean))]; }
function plansDuFil(cable) { return [...new Set(app.contrat.liaisons.filter(l => l.cable === cable).map(l => l.plan).filter(Boolean))]; }
/* Les folios du lecteur sont des DESSINS (FWD : MEE256A7815001A, …02A) : des noms longs qui partagent un début. Les
   puces de la bande l'abrègent à ce qui les distingue (« …01A ») — le nom entier reste dans la puce (en retrait, caché
   par le style, lu par les lecteurs d'écran), en bulle, et en clair sur la puce du folio courant. Rend [début, reste]. */
function coupureDesFolios(P) { if (P.length < 2 || P.some(p => p.length < 10)) return null;
  let n = 0; while (n < P[0].length && P.every(p => p[n] === P[0][n])) n++;
  n = Math.min(n, Math.min(...P.map(p => p.length)) - 3); return n >= 5 ? n : null; }
const FOLIOS_EN_LISTE = 8;   // au-delà, une liste déroulante double la bande
function synchroniserFolios() { const P = plans(), strip = $('fo-strip'), sel = $('fo-select');
  // la barre du bas reste (cadrage, zoom) ; la partie folios ne se montre qu'à plusieurs feuilles ; sans contrat (l'accueil), rien
  $('folios').hidden = !app.contrat.liaisons.length;
  $('fo-part').hidden = P.length < 2;
  if (app.plan !== '*' && !P.includes(app.plan)) app.plan = P.length > 1 ? P[0] : '*';
  const i = P.indexOf(app.plan), k = coupureDesFolios(P);
  strip.innerHTML = P.length < 2 ? '' : P.map(p => `<button class="chip${p === app.plan ? ' on' : ''}${k ? ' abrege' : ''}" data-plan="${escA(p)}" data-nom="${escA('Folio ' + p)}" aria-label="Folio ${escA(p)}"${p === app.plan ? ' aria-current="page"' : ''}>${k ? `<span class="chip-pre">${esc(p.slice(0, k))}</span>${esc(p.slice(k))}` : esc(p)}</button>`).join('');
  if (sel) { sel.hidden = P.length <= FOLIOS_EN_LISTE; sel.innerHTML = sel.hidden ? '' : P.map((p, j) => `<option value="${escA(p)}"${p === app.plan ? ' selected' : ''}>${j + 1} · ${esc(p)}</option>`).join(''); }
  $('fo-lbl').textContent = i < 0 ? (P.length > 1 ? 'tout' : '1 / 1') : (i + 1) + ' / ' + P.length;
  // une seule feuille : les flèches n'ont nulle part où aller
  const seul = P.length < 2; $('fo-prev').disabled = seul || i === 0; $('fo-next').disabled = seul || (i >= 0 && i >= P.length - 1);
  const on = strip.querySelector('.chip.on'); if (on && on.scrollIntoView) { try { on.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (_) { } } }

/* ---- aller à un repère ou à un fil, même sur un autre folio ------------ */
function aller(cible) { const P = plans(); const nom = cible.nom;
  const ou = cible.type === 'fil' ? plansDuFil(nom) : plansDuRepere(nom);
  if (P.length > 1 && app.plan !== '*' && ou.length && !ou.includes(app.plan)) allerAuPlan(ou[0]);
  if (!app.dessin && attenteCourante()) { reporterCible(cible); return; }   // le folio se place au loin : la cible attend le dessin (finirAttente)
  if (cible.type === 'fil') { const f = app.dessin && app.dessin.fils.find(w => w.cable === nom); if (!f) { dire('« ' + nom + ' » n’est pas dessiné.'); return; }
    choisirFil(f); viserFil(f); return; }
  const c = app.dessin && app.dessin.compDe.get(nom); if (!c) { dire('« ' + nom + ' » n’est sur aucun folio.'); return; }
  choisirBloc(c); viser(nom); }

/* ---- la recherche ------------------------------------------------------- */
function candidats(q) { q = q.trim().toLowerCase(); if (!q) return [];
  const L = verite(), cnt = new Map(), D = app.contrat.designations;
  L.forEach(l => [l.de, l.vers].forEach(n => { if (n && !estRenvoi(n)) cnt.set(n, (cnt.get(n) || 0) + 1); }));
  const rang = n => n.toLowerCase().startsWith(q) ? 0 : (n.toLowerCase().includes(q) ? 1 : 2);
  const rep = [...cnt.keys()].filter(n => rang(n) < 2 || (D.get(n) || '').toLowerCase().includes(q))
    .sort((a, b) => rang(a) - rang(b) || cnt.get(b) - cnt.get(a) || a.localeCompare(b)).slice(0, 7)
    .map(n => ({ type: 'repere', nom: n, des: D.get(n) || '', n: cnt.get(n) }));
  const fils = [], vus = new Set();
  L.forEach(l => { const c = l.cable; if (c && !vus.has(c) && c.toLowerCase().includes(q)) { vus.add(c); fils.push({ type: 'fil', nom: c, des: l.de + ' → ' + l.vers }); } });
  return rep.concat(fils.sort((a, b) => rang(a.nom) - rang(b.nom)).slice(0, 5)); }
let qSel = 0, qCands = [];
function montrerCandidats() { const box = $('q-liste'), q = $('q').value; qCands = candidats(q);
  if (!q.trim()) { box.hidden = true; return; } box.hidden = false; qSel = Math.min(qSel, Math.max(0, qCands.length - 1));
  box.innerHTML = qCands.length ? qCands.map((c, i) => `<button class="q-item${i === qSel ? ' on' : ''}" role="option" data-i="${i}" aria-selected="${i === qSel}">
      <span class="genre">${c.type === 'fil' ? 'fil' : 'repère'}</span><span class="nom">${esc(c.nom)}</span><span class="des${c.type === 'fil' ? ' mono' : ''}">${esc(c.des)}</span>${c.n ? `<span class="cpt">${c.n} fil${c.n > 1 ? 's' : ''}</span>` : ''}</button>`).join('')
    : '<div class="q-rien">Rien qui corresponde.</div>'; }
/* La fenêtre de recherche s'ouvre à côté du rail, par le bouton ou « / »,
   et disparaît sitôt qu'on a trouvé ou qu'on regarde ailleurs. */
function ouvrirRecherche() { document.body.classList.add('cherche'); synchroniserRail(); const q = $('q'); q.focus(); q.select(); if (q.value.trim()) montrerCandidats(); }
function fermerRecherche() { $('q-liste').hidden = true; document.body.classList.remove('cherche'); synchroniserRail(); }
const rechercheOuverte = () => document.body.classList.contains('cherche');
function lierRecherche() { const q = $('q'), box = $('q-liste');
  q.addEventListener('input', () => { qSel = 0; montrerCandidats(); });
  q.addEventListener('focus', () => { document.body.classList.add('cherche'); synchroniserRail(); if (q.value.trim()) montrerCandidats(); });
  const x = $('rc-x'); if (x) x.addEventListener('click', () => { q.blur(); fermerRecherche(); });
  q.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); qSel = Math.min(qSel + 1, qCands.length - 1); montrerCandidats(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); qSel = Math.max(qSel - 1, 0); montrerCandidats(); }
    else if (e.key === 'Enter') { e.preventDefault(); const c = qCands[qSel]; if (c) trouve(c); }
    else if (e.key === 'Escape') { q.value = ''; fermerRecherche(); q.blur(); } });
  // trouvé : le champ se vide, le résultat est sur le plan et dans la base
  const trouve = c => { q.value = ''; fermerRecherche(); q.blur(); aller(c); };
  box.addEventListener('pointerdown', e => e.preventDefault());   // le champ garde le focus
  box.addEventListener('click', e => { const b = e.target.closest('.q-item'); if (!b) return; const c = qCands[+b.dataset.i]; if (c) trouve(c); });
  q.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== q) fermerRecherche(); }, 120));
  $('recherche').addEventListener('click', e => { if (!e.target.closest('.q-liste')) q.focus(); }); }

/* ---- la base : la table des liaisons, corrigée en direct --------------- */
const COLONNES_BASE = [
  { k: 'de', lib: 'De', cls: 'rep' }, { k: 'borneDe', lib: 'B.', cls: 'n' },
  { k: 'vers', lib: 'Vers', cls: 'rep' }, { k: 'borneVers', lib: 'B.', cls: 'n' },
  { k: 'cable', lib: 'Fil', cls: 'fil' }, { k: 'type', lib: 'Type', cls: 'type', option: true }, { k: 'plan', lib: 'Folio', cls: 'n' },
  { k: 'pnDe', lib: 'Conn. dép.', cls: 'pn', option: true }, { k: 'pnVers', lib: 'Conn. arr.', cls: 'pn', option: true }, { k: 'route', lib: 'Route', cls: 'route', option: true }];
const CAP_LIGNES = 400;
/* La colonne Folio : se corrige quand le folio vient du fichier ; se lit
   seulement quand l'outil a découpé lui-même ; absente s'il n'y a qu'une feuille. */
const modeFolio = () => app.nFolios ? 'auto' : (plans().length ? 'fichier' : 'aucun');
/* Une colonne du retest que le contrat n'utilise pas ne prend pas de place. */
function colonnes() { const V = verite(), mf = modeFolio();
  return COLONNES_BASE.filter(c => c.k === 'plan' ? mf !== 'aucun' : (!c.option || V.some(l => l[c.k]))); }
const cleDe = l => [l.de, l.borneDe, l.vers, l.borneVers, l.cable].join('\u0001');
/* Quand l'outil a découpé, chaque liaison d'origine vit sur un ou deux
   folios : on retrouve la sienne par sa clé, sans parcourir la source. */
function foliosParSource() { const m = new Map(); if (!app.nFolios) return m;
  app.contrat.liaisons.forEach(d => { const k = cleSource(d); const t = m.get(k) || m.set(k, []).get(k); if (!t.includes(d.plan)) t.push(d.plan); });
  return m; }
/* Ce que le tableau montre : les liaisons du folio affiché (« Ce folio »), ou tout le contrat ; puis le filtre, puis le
   tri. Sans tri ni filtre, « Tout » se range par folio. Rend [[liaison, rang]…]. */
const avecPortee = () => app.plan !== '*' && plans().length > 0;
function surLeFolio(l, folios) { if (app.plan === '*') return true;
  return modeFolio() === 'auto' ? (folios.get(cleDe(l)) || []).includes(app.plan) : l.plan === app.plan; }
function lignesVisibles(folios) { folios = folios || foliosParSource(); const V = verite(), f = app.base.filtre.trim().toLowerCase(), C = colonnes();
  let L = V.map((l, i) => [l, i]);
  if (avecPortee() && app.base.portee === 'folio') L = L.filter(([l]) => surLeFolio(l, folios));
  if (f) L = L.filter(([l]) => C.some(c => String(l[c.k]).toLowerCase().includes(f)));
  const tri = app.base.tri;
  if (!tri) { if (groupesParFolio()) { const fo = l => premierFolio(l, folios); L.sort((a, b) => triNaturel(fo(a[0]), fo(b[0])) || a[1] - b[1]); } return L; }
  const cmp = (a, b) => { const x = a[0][tri.k], y = b[0][tri.k], nx = parseFloat(x), ny = parseFloat(y);
    return (!isNaN(nx) && !isNaN(ny) && String(nx) === x && String(ny) === y) ? nx - ny : String(x).localeCompare(String(y), 'fr', { numeric: true }); };
  return L.sort((a, b) => tri.sens * cmp(a, b) || a[1] - b[1]); }
const premierFolio = (l, folios) => (modeFolio() === 'auto' ? (folios.get(cleDe(l)) || [])[0] : l.plan) || '';
const groupesParFolio = () => avecPortee() && app.base.portee === 'tout' && !app.base.tri && !app.base.filtre.trim();
function ligneChoisie(l) { const c = app.cible; if (!c) return false;
  return c.type === 'fil' ? c.l === l : (l.de === c.nom || l.vers === c.nom); }
function rendreLigne(l, i, folios) { const mode = modeFolio(), coul = couleursDesRoutes().get(l.route || '') || '';
  const cell = col => { if (col.k === 'plan' && mode === 'auto') return `<td class="n">${(folios.get(cleDe(l)) || []).map(p => `<button class="f" data-plan="${escA(p)}" title="Aller au folio ${escA(p)}">${esc(p)}</button>`).join('')}</td>`;
    return `<td${col.cls ? ` class="${col.cls}"` : ''}><input data-i="${i}" data-f="${col.k}" value="${escA(l[col.k])}" aria-label="${col.lib}, ligne ${i + 1}" spellcheck="false" autocomplete="off"></td>`
      + (col.k === 'borneDe' ? '<td class="fl" aria-hidden="true"></td>' : ''); };
  return `<tr data-i="${i}" class="${ligneChoisie(l) ? 'on' : ''}${surLeFolio(l, folios) && liaisonComplete(l) ? '' : ' hors'}"${coul ? ` style="--route:${coul}"` : ''}><td class="g"><button data-voir="${i}" title="Voir ce fil sur le plan">${i + 1}</button></td>`
    + colonnes().map(cell).join('') + `<td class="x"><button data-x="${i}" aria-label="Supprimer la ligne ${i + 1}">×</button></td></tr>`; }
/* Tout le tiroir se déduit de `app` ; le tableau n'est pas refait tant qu'on y écrit (voir rafraichirBase). */
function rendreBase() { const b = app.base; b.sale = false; if ($('base').hidden) { b.sale = true; return; }
  const V = verite(), folios = foliosParSource(), vues = lignesVisibles(folios), tri = b.tri, C = colonnes(), n = C.length + 3;
  const portee = avecPortee(), ici = portee ? V.filter(l => surLeFolio(l, folios)).length : V.length;
  $('ba-compte').textContent = vues.length === V.length ? String(V.length) : vues.length + ' / ' + V.length;
  $('ba-portee').hidden = !portee;
  if (portee) { $('ba-n-folio').textContent = ici; $('ba-n-tout').textContent = V.length; $('ba-lib-folio').textContent = 'Folio ' + app.plan;
    $('ba-portee').querySelectorAll('[data-portee]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.portee === b.portee))); }
  const fi = $('ba-filtre'); if (fi.value !== b.filtre) fi.value = b.filtre; $('ba-vider').hidden = !b.filtre;
  $('ba-thead').innerHTML = '<tr><th class="g" title="Numéro de ligne">#</th>' + C.map(c => `<th data-k="${c.k}" class="${tri && tri.k === c.k ? 'tri' : ''}" title="Trier par ${escA(c.lib)}">${c.lib}${tri && tri.k === c.k ? `<span class="sens">${tri.sens > 0 ? '▲' : '▼'}</span>` : ''}</th>` + (c.k === 'borneDe' ? '<th class="fl"></th>' : '')).join('') + '<th></th></tr>';
  // « Tout », sans tri ni filtre : un intercalaire par folio
  let html = '', dernier = null; const groupes = groupesParFolio(), parFolio = new Map();
  if (groupes) vues.forEach(([l]) => { const p = premierFolio(l, folios); parFolio.set(p, (parFolio.get(p) || 0) + 1); });
  vues.slice(0, CAP_LIGNES).forEach(([l, i]) => { if (groupes) { const p = premierFolio(l, folios);
      if (p !== dernier) { dernier = p; html += `<tr class="groupe${p === app.plan ? ' ici' : ''}"><td colspan="${n}"><button class="f" data-plan="${escA(p)}">${p ? 'Folio ' + esc(p) : 'Sans folio'}</button><span>${pluriel(parFolio.get(p), 'liaison')}</span></td></tr>`; } }
    html += rendreLigne(l, i, folios); });
  $('ba-tbody').innerHTML = html
    + (vues.length > CAP_LIGNES ? `<tr class="reste"><td colspan="${n}">… et ${vues.length - CAP_LIGNES} autres lignes — affine le filtre.</td></tr>` : '')
    + (!vues.length ? `<tr class="reste"><td colspan="${n}">${V.length ? (b.filtre ? 'Rien qui corresponde au filtre.' : 'Aucune liaison sur ce folio.') : 'Aucune liaison. Ajoute une ligne, ou dépose un fichier.'}</td></tr>` : '');
  if (b.defiler) { b.defiler = false; const tr = $('ba-tbody').querySelector('tr.on'); if (tr && tr.scrollIntoView) { try { tr.scrollIntoView({ block: 'center' }); } catch (_) { } } } }
/* Le rendu attend qu'on ait fini d'écrire dans une cellule : refaire le
   tableau sous les doigts casserait la saisie et la tabulation. On s'en
   remet à `enSaisie` (focusin / focusout) et non à document.activeElement :
   pendant le `change` que déclenche Tab, le navigateur l'a déjà vidé. */
function rafraichirBase() { if (app.base.enSaisie) { app.base.sale = true; return; } rendreBase(); }
function marquerLignes() { if ($('base').hidden) return;
  $('ba-tbody').querySelectorAll('tr[data-i]').forEach(tr => { const l = verite()[+tr.dataset.i]; tr.classList.toggle('on', !!l && ligneChoisie(l)); }); }
const natureDe = nom => { const q = lireRepere(nom); return (q && q.num && CODES[q.code]) ? CODES[q.code].nom : 'équipement'; };
const triNaturel = (a, b) => String(a).localeCompare(String(b), 'fr', { numeric: true });
const pluriel = (n, mot) => n + ' ' + mot + (n > 1 && !/[sxz]$/.test(mot) ? 's' : '');   // « 2 harness », pas « harnesss »
/* La fiche se refait après chaque correction et quand la place change (fenêtre, poignée) — jamais sous les doigts de
   qui y ÉCRIT (un champ de la fiche a le focus). Un bouton de la fiche qu'on vient de presser (une puce, une variante)
   a le focus lui aussi : la fiche se refait quand même, et `rendreFiche` lui rend le focus. */
function rafraichirCarte() { const box = $('ba-equip'), a = document.activeElement; if ($('inspecteur').hidden || (box.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return; rendreFiche(); }
const jaugeTexte = b => b.jaugeFine === b.jaugeGrosse ? String(b.jaugeFine) : b.jaugeFine + ' à ' + b.jaugeGrosse;
const jaugeEntree = e => e.jaugeMin == null ? '—' : (e.jaugeMax != null && e.jaugeMax !== e.jaugeMin ? e.jaugeMin + '–' + e.jaugeMax : String(e.jaugeMin));
const nombre = x => x == null ? '—' : String(x).replace('.', ',');
/* Ce qu'on retient pour une barrette : la désignation qu'on lui a donnée
   (une référence choisie à la main), sinon le choix de la bible. */
function referenceRetenue(nom, infos) { const d = app.contrat.designations.get(nom);
  if (d) return { ref: d, dou: 'choisie à la main', main: true };
  if (infos.choix) return { ref: infos.reference, dou: 'choisie dans la bible', main: false };
  return { ref: infos.pn || '—', dou: infos.pn ? 'du fichier — rien dans la bible ne convient' : 'rien dans la bible ne convient', main: false }; }
/* La barrette ou la prise de coupure : d'abord son DESSIN — la réglette de
   face, tous les modules de la référence retenue, les paquets pontés par
   leur peigne, chaque trou et le fil qui y est selon la norme — puis ce que
   la règle de remplissage en dit, la SIMULATION sur ses hypothèses, et,
   repliée, la référence : d'où elle vient, pourquoi, et les autres qui
   conviendraient. */
function cartePhysique(nom, P, b) { const coupure = estCoupure(nom), I = (coupure ? coupureInfos : barretteInfos)(nom, verite(), app.bible), R = referenceRetenue(nom, I);
  const mot = coupure ? 'contact' : 'module', hors = P.modules.filter(m => horsReference(P, m)).length;
  const compte = [pluriel(P.modules.length, mot), pluriel(P.modules.length - P.libres, 'utilisé'), pluriel(P.libres, 'libre')].join(' · ')
    + (hors ? ` · <span class="ko">${hors} hors référence</span>` : '') + (b.jaugeFine != null ? ` · jauge ${jaugeTexte(b)}` : '');
  return `<div class="bar-ref"><span class="ref">${esc(R.ref)}</span><span class="dou">${R.dou}</span></div><div class="phy-compte">${compte}</div>` + ligneNorme(P)
    + dessinPhysique(nom, P, largeurCarte(), { forme: coupure ? 'coupure' : 'reglette' })
    + `<div class="legende"><span class="l-fleche"></span>ce qui arrive (amont) au-dessus, ce qui repart (aval) en dessous · <span class="l-trou occ"></span>trou occupé · <span class="l-trou"></span>trou libre`
    + (coupure ? '' : ' · <span class="l-peigne"></span>paquet ponté') + ' · <span class="l-libre"></span>libre</div>' + verdictsNorme(P, coupure)
    + carteSimulation(nom, P, simulerBornier(P, app.norme, app.simu)) + choixReference(nom, I, R); }
/* Ce que la norme sait de cette famille, en une ligne — ou qu'elle n'en sait rien. */
function ligneNorme(P) { const F = P.famille;
  if (!F) return `<div class="bar-norme sans">aucune norme ne connaît ${P.entree && P.entree.famille ? 'la famille <b>' + esc(P.entree.famille) + '</b>' : 'cette référence'} — un trou par côté, rien n’est jugé</div>`;
  const faits = [F.pas != null ? `pas ${nombre(F.pas)} mm` : '', F.jaugeMin != null ? `${jaugeEntree(F)} AWG` : '', F.intensite != null ? `${nombre(F.intensite)} A` : '', F.resistance != null ? `${nombre(F.resistance)} mΩ` : '',
    pluriel(F.filsParCote, 'fil') + ' par côté'].filter(Boolean);
  return `<div class="bar-norme${F.exemple ? ' exemple' : ''}">norme <b>${esc(F.norme)}</b> · ${faits.join(' · ')}${F.exemple ? ' · <span class="ex">sans valeur normative</span>' : ''}</div>`; }
/* Ce que la règle de remplissage de la norme trouve à redire. */
function verdictsNorme(P, coupure) { if (!P.famille) return '';
  const F = P.famille, regle = [F.ordre === 'croissant' ? 'dans l’ordre' : '', F.paquets === 'contigus' && !coupure ? 'paquets contigus' : '', F.reserves.length ? 'réservé' + (F.reserves.length > 1 ? 's' : '') + ' : ' + F.reserves.join(', ') : '', F.masse ? 'une masse par paquet' : ''].filter(Boolean);
  return `<div class="verdicts"><div class="regle">règle de remplissage : ${regle.length ? regle.join(' · ') : 'libre'} — ${P.verdicts.length ? pluriel(P.verdicts.length, 'remarque') : 'rien à redire'}</div>`
    + P.verdicts.map(v => `<div class="verdict-l ${v.niveau}" data-bornes="${escA(v.bornes.join(' '))}">${esc(v.texte)}</div>`).join('') + '</div>'; }
/* La SIMULATION : le bandeau des hypothèses (dites, modifiables), puis fil
   par fil ce que la norme en dit, la formule et un calcul écrit en entier. */
const MOTS_VERDICT = { ok: 'ok', jauge: 'jauge hors plage', fil: 'dépasse le fil', contact: 'dépasse le contact', chute: 'chute trop forte', inconnu: 'fil inconnu de la norme', reactance: 'X à saisir (≥ ' + GROS_CABLE + ' mm² de cuivre)' };
/* La formule de la chute selon le régime. */
const formuleChute = r => r === 'tri' ? 'ΔU composée (entre deux phases) = √3 × I × (R cos φ + X sin φ)' : r === 'mono' ? 'ΔU = I × (R cos φ + X sin φ)' : 'ΔU = (ρ × L + R<sub>contact</sub>) × I';
const dec = (x, n) => x == null ? '—' : x.toFixed(n).replace('.', ',');
/* ---- LES HYPOTHÈSES de la simulation --------------------------------------- */
/* Ce que le retest ne porte pas, l'outil le SUPPOSE : la longueur et le courant d'un fil, la tension du réseau, l'ambiante,
   le régime, le déclassement, l'ambiante du tableau de disjoncteurs (`HYPOTHESES`, 09). Elles vivent dans `app.simu`,
   gardées dans ce navigateur (`memoriserSimu`), relues au démarrage (`relireSimu`) — une commodité de l'outil, pas une
   donnée du contrat : pas de Ctrl+Z, « Revenir aux valeurs de l'outil » les rend. Chaque fiche qui s'en sert le dit
   (« hypothèse ») et mène à la fiche des hypothèses ; un changement rejuge tout (le contrôle, la fiche ouverte).
   `hypothesesDe` : la liste des champs, dans l'ordre, chacun avec ce qu'il sert et quelle règle le lit — une seule
   définition pour le bandeau d'une carte (`carteSimulation`) et la fiche (`ficheHypotheses`). `ctx.fils` : le faisceau
   simulé (le facteur de déclassement en dépend ; sans lui, le faisceau de référence de la table). */
function hypothesesDe(N, H, ctx) { ctx = ctx || {}; const regime = REGIMES[H.regime] ? H.regime : 'continu';
  const nb = (id, k, lib, unite, pas, groupe, sert, o) => ({ genre: 'nombre', id, k, lib, unite, pas, groupe, sert, min: o && o.negatif ? null : 0, titre: (o && o.titre) || '' });
  // les conditions de déclassement, une case par condition, avec le facteur que la table donne pour ce faisceau (le point FAA le plus proche, l'altitude interpolée)
  const noms = [...new Set(N.declassements.map(d => d.condition))], detail = detailDeclassement(N, noms, { fils: ctx.fils, charge: H.charge, altitude: H.altitude });
  const conds = noms.map(c => { const d = detail.find(x => x.condition === c), p = d && d.point;
    const titre = p ? (p.fils != null ? `le point ${p.fils} fils à ${nombre(p.charge != null ? p.charge : 100)} % (${p.note || 'table'})` : p.altitude != null ? `${nombre(p.altitude)} ft (${p.note || 'table'})` : p.note || '') : '';
    const sert = c === 'faisceau' ? 'Des fils en faisceau admettent moins qu’un fil seul (AC 43.13-1B, fig. 11-5) : le facteur dépend du nombre de fils et de leur charge.' : c === 'altitude' ? 'L’air raréfié refroidit moins (AC 43.13-1B, fig. 11-6) : le facteur dépend de l’altitude.' : 'Un déclassement de la table Déclassement de la norme, sur ce qu’un fil admet.';
    return { genre: 'condition', c, lib: c, facteur: d ? d.facteur : 1, titre, groupe: 'declassement', sert }; });
  const faisceau = N.declassements.some(d => d.fils != null) && H.conditions.includes('faisceau'), altitude = N.declassements.some(d => d.altitude != null) && H.conditions.includes('altitude');
  const TABLEAU = 'L’ambiante du tableau de disjoncteurs : seules les courbes de disjonction qui l’encadrent jugent';
  return [
    nb('si-L', 'longueur', 'longueur', 'm', '0.5', 'fil', 'La longueur d’un fil que le retest ne mesure pas : la chute sur ce fil, et la chute en ligne depuis le disjoncteur, se calculent dessus.'),
    nb('si-I', 'courant', 'courant', 'A', '0.5', 'fil', 'Le courant d’un fil qu’aucun disjoncteur n’alimente, et celui de la simulation d’une barrette ou d’une prise.'),
    nb('si-U', 'tension', 'tension', 'V', '1', 'fil', 'La tension du réseau : la chute admise en ligne (table Réseau) et le pourcentage de chute.'),
    N.fils.some(f => f.tr != null) ? nb('si-T', 'ambiante', 'ambiante', '°C', '5', 'temperature', 'L’ambiante autour des fils : l’EN 2853 déclasse ce qu’un fil admet (note 2), et la tenue en température des câbles se juge dessus (+ 40 °C au conducteur).') : null,
    nb('si-Tc', 'tconducteur', 'conducteur', '°C', '5', 'temperature', 'La température du conducteur, pour sa résistance : 20 °C, la convention de la base des câbles ; 135 °C, le cas de l’EN 2853.'),
    { genre: 'choix', id: 'si-Ret', k: 'retour', lib: 'retour', aria: 'Retour du courant', options: Object.entries(RETOURS), valeur: H.retour || 'structure', groupe: 'fil', sert: 'Par la structure, l’aller seul compte (AC 43.13-1B : du bus à la masse de l’équipement) ; par un fil identique, la résistance double — le fil et ses contacts, deux fois.' },
    { genre: 'choix', id: 'si-R', k: 'regime', lib: 'régime', aria: 'Régime du réseau', options: Object.entries(REGIMES), valeur: regime, groupe: 'reseau', sert: 'Continu, monophasé ou triphasé : la formule de la chute ; en triphasé, la chute composée (√3 ×) se compare à la ligne 200 V du réseau.' },
    regime !== 'continu' ? { genre: 'choix', id: 'si-C', k: 'cosphi', lib: 'cos φ', aria: 'cos φ', options: [['0.8', '0,8 · régime permanent'], ['0.35', '0,35 · démarrage moteur']], valeur: Math.abs(H.cosphi - 0.35) < 1e-9 ? '0.35' : Math.abs(H.cosphi - 0.8) < 1e-9 ? '0.8' : '', groupe: 'reseau', sert: '0,8 en régime permanent, 0,35 au démarrage d’un moteur.' } : null,
    regime !== 'continu' ? nb('si-X', 'reactance', 'X', 'mΩ/m', '0.01', 'reseau', 'La réactance linéique à 400 Hz : négligée sous ' + GROS_CABLE + ' mm² de cuivre, à saisir au-delà (la simulation l’estime, sans jamais la prendre d’office).') : null,
    ...conds,
    faisceau ? nb('si-P', 'charge', 'charge du faisceau', '%', '10', 'declassement', 'La part de ce que les fils du faisceau admettent ensemble qui circule vraiment : le point de la figure 11-5.') : null,
    altitude ? nb('si-A', 'altitude', 'altitude', 'ft', '5000', 'declassement', 'L’altitude de vol, pour le déclassement de la figure 11-6.') : null,
    N.disjoncteurs && N.disjoncteurs.length ? nb('si-Tmin', 'tableauMin', 'tableau min', '°C', '5', 'tableau', 'L’ambiante la plus basse du tableau de disjoncteurs : la courbe de disjonction juste au-dessous (la lente) juge la protection du fil.', { negatif: true, titre: TABLEAU }) : null,
    N.disjoncteurs && N.disjoncteurs.length ? nb('si-Tmax', 'tableauMax', 'tableau max', '°C', '5', 'tableau', 'L’ambiante la plus haute du tableau : la courbe juste au-dessus (la rapide) juge le déclenchement intempestif.', { negatif: true, titre: TABLEAU }) : null
  ].filter(Boolean); }
/* Un champ d'hypothèse, tel que le bandeau d'une carte le montre (compact) ; la fiche l'habille d'une ligne qui dit à
   quoi il sert. Les identifiants (si-L, si-I…) sont ceux que `lierHypotheses` lit. */
function champHypotheseHtml(c, H) {
  if (c.genre === 'condition') return `<label class="hyp-c" title="${escA(c.titre)}"><input type="checkbox" data-cond="${escA(c.c)}"${H.conditions.includes(c.c) ? ' checked' : ''}><span>${esc(c.c)} ×${nombre(Math.round(c.facteur * 100) / 100)}</span></label>`;
  if (c.genre === 'choix') return `<label class="hyp-n"><span>${esc(c.lib)}</span><select id="${c.id}" aria-label="${escA(c.aria + ' (hypothèse)')}">${c.options.map(([v, t]) => `<option value="${escA(v)}"${String(v) === String(c.valeur) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  return `<label class="hyp-n"${c.titre ? ` title="${escA(c.titre)}"` : ''}><span>${esc(c.lib)}</span><input id="${c.id}" type="number" inputmode="decimal" step="${c.pas}"${c.min != null ? ` min="${c.min}"` : ''} value="${H[c.k]}" aria-label="${escA(c.lib + ' (hypothèse)')}"><span class="u">${esc(c.unite)}</span></label>`; }
const GROUPES_HYPOTHESES = [['fil', 'Le fil'], ['temperature', 'La température'], ['reseau', 'Le réseau'], ['declassement', 'Le déclassement'], ['tableau', 'Le tableau de disjoncteurs']];
const ligneHypotheseHtml = (c, H) => `<div class="hy-ligne"><div class="hy-champ">${champHypotheseHtml(c, H)}</div><p class="hy-sert">${esc(c.sert)}${c.genre === 'condition' && c.titre ? ` <i>· ${esc(c.titre)}</i>` : ''}</p></div>`;
/* LA FICHE DES HYPOTHÈSES : un document à droite (mode `hypotheses`), un groupe par thème, chaque hypothèse avec son
   champ et ce qu'elle sert ; « Revenir aux valeurs de l'outil » rend `HYPOTHESES`. Atteignable du menu, du mot
   « hypothèse » de la fiche d'un fil, de « longueurs d'hypothèse » de la fiche d'un disjoncteur. */
function ficheHypotheses() { const H = app.simu || (app.simu = { ...HYPOTHESES }), N = app.norme || normeVide(), cs = hypothesesDe(N, H);
  const defaut = Object.keys(HYPOTHESES).every(k => JSON.stringify(H[k]) === JSON.stringify(HYPOTHESES[k]));
  const corps = tete('Simulation', 'Hypothèses') + `<p class="note">Ce que le retest ne porte pas, l’outil le suppose. Chaque fiche qui s’en sert le dit (<b>hypothèse</b>) ; ce qu’on règle ici rejuge tout — le contrôle, les fiches, la nomenclature — et se garde dans ce navigateur, pas avec le contrat.${defaut ? '' : ' <b>Réglées</b> : l’outil proposait d’autres valeurs.'}</p>`
    + GROUPES_HYPOTHESES.map(([g, t]) => { const xs = cs.filter(c => c.groupe === g); return xs.length ? `<section class="hy-groupe"><div class="sur">${esc(t)}</div>${xs.map(c => ligneHypotheseHtml(c, H)).join('')}</section>` : ''; }).join('');
  const deja = app.fiche && app.fiche.mode === 'hypotheses', y = deja ? $('fiche-corps').scrollTop : 0;
  ouvrirFiche({ mode: 'hypotheses' }, corps, `<button class="btn papier" id="hy-defaut"${defaut ? ' disabled' : ''}>Revenir aux valeurs de l’outil</button>`); if (deja) $('fiche-corps').scrollTop = y;
  lierHypotheses($('fiche-corps'), ficheHypotheses);
  $('hy-defaut').onclick = () => { app.simu = { ...HYPOTHESES, conditions: [...HYPOTHESES.conditions] }; apresHypotheses(); ficheHypotheses(); dire('Les hypothèses de l’outil sont rétablies.'); }; }
/* Une hypothèse a changé : gardée, le contrôle se refait (sa clé l'oublie), la fiche ouverte dans l'inspecteur aussi. */
function apresHypotheses() { memoriserSimu(); if (typeof CONTROLE !== 'undefined') CONTROLE.cle = null; rendreControle(); rafraichirCarte(); }
function carteSimulation(nom, P, S) { const H = S.hyp, V = verite(), N = app.norme || normeVide();
  let s = `<div class="simu"><div class="simu-tete"><span class="sur">Simulation</span><span class="simu-note">hypothèses, pas des mesures : le retest ne porte ni longueur ni courant</span></div>
    <div class="hyp">${hypothesesDe(N, H, { fils: S.fils }).map(c => champHypotheseHtml(c, H)).join('')}</div>`;
  if (S.sansNorme) return s + `<p class="simu-vide">Aucune norme ne connaît cette famille ni ces fils : rien n’est calculé. Importe une norme depuis la bible.</p></div>`;
  if (!S.lignes.length) return s + `<p class="simu-vide">Aucun fil dans un trou : rien à simuler.</p></div>`;
  const ligne = x => { const i = V.indexOf(x.l), dest = x.vers + (x.borneVers ? ':' + x.borneVers : '');
    return `<tr class="fil sim-${x.verdict}" data-i="${i}" data-fils="${i}" data-borne="${escA(x.borne)}" tabindex="0" role="button" aria-label="${escA('Voir le fil ' + x.cable + ' sur le plan')}"><td class="c">${esc(x.borne)}<span class="sens">${x.sens === 'amont' ? '↓ ' + (P.cotes.amont === 'fiche' ? 'fiche' : 'amont') : '↑ ' + (P.cotes.aval === 'embase' ? 'embase' : 'aval')}</span>${x.surcharge ? '<span class="ko">surcharge</span>' : ''}</td>`
      + `<td class="m"><b>${esc(x.cable)}</b><span class="dest">${esc(dest)}</span></td><td class="m${x.jaugeOk === false ? ' ko' : ''}">${esc(x.type || '—')}${x.jaugeOk === false ? '<span class="ko">hors plage</span>' : x.approx ? '<span class="att">jauge seule</span>' : ''}${x.tenue && !x.tenue.ok ? `<span class="att" title="${escA('Câble ' + nombre(x.tenue.tmax) + ' °C : ' + nombre(x.tenue.conducteurA) + ' °C au conducteur (ambiante ' + nombre(x.tenue.ambiante) + ' + 40 °C de l’EN 2853)')}">${esc(nombre(x.tenue.conducteurA))} °C &gt; ${esc(nombre(x.tenue.tmax))} °C</span>` : ''}</td>`
      + `<td class="d">${x.iFil == null ? '—' : dec(x.iFil, 1)} / ${x.iContact == null ? '—' : dec(x.iContact, 1)}</td><td class="d">${x.dU == null ? '—' : dec(x.dU, 2) + ' V<span class="sep"> · </span><span class="pct">' + dec(x.pct, 1) + ' %</span>'}</td><td><span class="verdict v-${x.verdict}">${MOTS_VERDICT[x.verdict]}</span>${x.xEstime != null ? `<span class="sim-x" title="Une estimation : un fil seul à ${POSE_HAUTEUR} mm de la structure, à ${FREQUENCE_BORD} Hz — à saisir dans X, jamais prise d’office">X ≈ ${esc(nombre(Math.round(x.xEstime * 100) / 100))} mΩ/m ?</span>` : ''}</td></tr>`; };
  const bilan = Object.entries(S.compte).map(([v, n]) => `<span class="verdict v-${v}">${n} ${MOTS_VERDICT[v]}</span>`).join(' ');
  const ex = S.lignes.find(x => x.dU != null);
  const calcul = !ex ? '' : (() => { const admis = S.chute && S.chute.chuteMax != null ? ` — admis : ${nombre(S.chute.chuteMax)} V` : '', fin = `<b>${dec(ex.dU, 3)} V</b>, soit ${dec(ex.pct, 2)} % de ${nombre(H.tension)} V${admis}</div>`;
    const rho = `${nombre(arrondi(ex.rho, 1))} Ω/km à ${nombre(H.tconducteur)} °C${ex.rhoSource === 'câble' ? ' — le câble ' + esc(ex.cab.cable) + ' de la base' : ex.rhoSource === 'jauge' ? ' — la jauge seule, EN 2853' : ''}${ex.kTemperature && Math.abs(ex.kTemperature - 1) > 1e-6 ? ' (× ' + nombre(Math.round(ex.kTemperature * 1000) / 1000) + ' depuis 20 °C)' : ''}`;
    if (ex.regime === 'continu') return `<div class="calcul"><b>${esc(ex.cable)}</b> : (${rho} × ${nombre(H.longueur)} m + ${nombre(S.rContact * 1000)} mΩ) × ${nombre(H.courant)} A = ${fin}`;
    return `<div class="calcul"><b>${esc(ex.cable)}</b> : R = ${rho} × ${nombre(H.longueur)} m + ${nombre(S.rContact * 1000)} mΩ = ${dec(ex.R, 3)} Ω ; ΔU${ex.regime === 'tri' ? ' composée' : ''} = ${ex.regime === 'tri' ? '√3 × ' : ''}${nombre(H.courant)} A × (${dec(ex.R, 3)} × ${nombre(ex.cosphi)} + ${dec(ex.X, 3)} × ${dec(Math.sqrt(1 - ex.cosphi * ex.cosphi), 2)}) = ${fin}`; })();
  s += `<div class="simu-defile"><table class="simu-tab"><thead><tr><th>contact</th><th>fil</th><th>type</th><th title="Intensité admissible du fil (déclassée) / du contact">I fil / contact (A)</th><th title="Chute de tension sur la longueur d’hypothèse">ΔU</th><th>verdict</th></tr></thead><tbody>${S.lignes.map(ligne).join('')}</tbody></table></div>
    <div class="bilan">${bilan}</div>
    <div class="formule">${formuleChute(S.regime)} — ρ la résistance du fil à ${nombre(H.tconducteur)} °C (la base des câbles, sinon l’EN 2853), L la longueur${S.regime !== 'continu' ? ' simple du câble, I le courant par phase, X la réactance (négligée sous ' + GROS_CABLE + ' mm² de cuivre, à saisir au-delà)' : ''}, R<sub>contact</sub> celle du contact (${S.rContact ? nombre(Math.round(S.rContact * 10000) / 10) + ' mΩ' + (S.famille && S.famille.resistance != null ? '' : S.famille && S.famille.nature !== 'coupure' ? ', deux par potentiel' : ', par la taille du contact') : 'inconnue'}), I le courant. I fil = intensité du fil × ${nombre(Math.round(S.facteur * 100) / 100)} (${S.declassement && S.declassement.length ? S.declassement.map(d => d.condition + (d.point && d.point.fils != null ? ' : ' + S.fils + ' fils, le point ' + d.point.fils + ' à ' + nombre(d.point.charge) + ' %' : '')).join(' · ') : 'sans déclassement'})${S.iContact != null ? ' ; contact ' + nombre(S.iContact) + ' A' : ''}.${S.regime === 'tri' && S.chute ? ' La chute composée se compare à la ligne ' + nombre(S.chute.tension) + ' V du réseau.' : ''} Les ponts ne sont pas des fils dans un trou : ils ne sont pas simulés.</div>${calcul}</div>`;
  return s; }
/* Un module au-delà de ce que la référence retenue compte : la borne existe
   dans le contrat, pas sur le matériel. */
const horsReference = (P, m) => !!(P.entree && P.entree.bornes != null && /^\d+$/.test(m.borne) && +m.borne > P.entree.bornes);
/* La référence, repliée sous le dessin : ce que le fichier portait, les
   raisons du choix, ce que la barrette porte, et les candidates — on en
   retient une d'un clic. */
function choixReference(nom, I, R) { const aLoger = Math.max(I.nBornes, I.borneMax || 0), s = n => n > 1 ? 's' : '';
  const faits = [['bornes', esc(I.bornes.slice().sort(triNaturel).join(', ') || '—') + (I.choix ? ` · ${aLoger} sur ${I.choix.bornes}` : '')],
    ['jauge', I.jaugeFine != null ? jaugeTexte(I) : 'inconnue'], ['blindage', I.blindes ? `${I.blindes} fil${s(I.blindes)} blindé${s(I.blindes)}` : 'aucun'], ['shunts', String(I.shunts)], ['fichier', esc(I.pn || '—')]];
  // déplié ou non : un état de `app`, pour survivre au redessin de la carte quand on retient une candidate
  return `<details class="choix"${app.base.choixOuvert ? ' open' : ''}><summary><span>Pourquoi cette référence, et les autres qui conviennent</span><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>`
    + (I.changee && !R.main ? `<div class="bar-chg">Le fichier portait <b>${esc(I.pn)}</b> — la bible en dit une autre.</div>` : '')
    + (R.main && I.pn && I.pn !== R.ref ? `<div class="bar-chg">Le fichier portait <b>${esc(I.pn)}</b>.</div>` : '')
    + `<div class="raisons">${I.raisons.map(r => `<span>${esc(r)}</span>`).join('')}</div>`
    + `<div class="bar-faits">${faits.map(([k, v]) => `<span>${k}</span><span>${v}</span>`).join('')}</div>`
    + (I.candidats.length ? `<div class="cands"><div class="sur">Références qui conviennent</div>` + I.candidats.map(e =>
      `<button class="cand" data-ref="${escA(e.reference)}" aria-pressed="${e.reference === R.ref}"><b>${esc(e.reference)}</b><span>${e.bornes} b.</span><span>${jaugeEntree(e)}</span><span>${e.intensite != null ? nombre(e.intensite) + ' A' : ''}</span>${e.blindage ? '<span>blindée</span>' : ''}${e.reference === R.ref ? '<span class="ok">retenue</span>' : ''}</button>`).join('')
      + (R.main ? '<button class="btn lien" id="bar-auto">Revenir au choix automatique</button>' : '') + '</div>' : '')
    + `<button class="btn lien" id="bar-bible" data-ref="${escA(R.ref)}">Voir dans la bible</button><button class="btn lien" id="bar-norme">Voir la norme</button></details>`; }
/* Les gestes de la carte : retenir une candidate ; survoler un module, un
   fil du dessin ou une ligne de la simulation l'allume sur le plan et marque
   ses lignes ; cliquer un fil le cadre ; changer une hypothèse refait la
   simulation. */
function lierCartePhysique(nom) { const box = $('ba-equip');
  const choix = box.querySelector('details.choix'); if (choix) choix.addEventListener('toggle', () => { app.base.choixOuvert = choix.open; });
  box.querySelectorAll('.cand').forEach(b => b.onclick = () => { const ref = b.dataset.ref; if (b.getAttribute('aria-pressed') === 'true') return;
    histPush('référence de ' + nom); designer(nom, ref); apresEdition(); dire(nom + ' : ' + ref + ' retenue.'); });
  const auto = $('bar-auto'); if (auto) auto.onclick = () => { histPush('référence de ' + nom); designer(nom, ''); apresEdition(); dire(nom + ' : retour au choix de la bible.'); };
  const bible = $('bar-bible'); if (bible) bible.onclick = () => ficheBible(bible.dataset.ref);
  const norme = $('bar-norme'); if (norme) norme.onclick = () => { app.base.normeOuverte = true; ficheNormes({ table: 'familles:' + (estCoupure(nom) ? 'connecteur' : 'barrette') }); };
  lierHypotheses(box);
  const phy = box.querySelector('.phy'); if (!phy) return; let dernier = null;
  const indices = el => (el.dataset.fils || '').split(' ').filter(Boolean).map(Number);
  // un module, ses trous (dessinés à part, par-dessus le rail), un fil du dessin, une ligne de la simulation
  const cibles = () => box.querySelectorAll('.phy .fil, .phy .mod, .phy .trous, .simu-tab tr.fil'), module = t => t.classList.contains('mod') || t.classList.contains('trous');
  const viser = t => { const idx = indices(t), V = verite(); allumerFils(idx.map(i => filDe(V[i])).filter(Boolean)); marquerVisees(idx);
    // un module visé marque tout ce qui porte sa borne (ses trous, ses fils, ses lignes) ; un fil visé, sa ligne et son étiquette
    cibles().forEach(x => x.classList.toggle('vise', x === t || (module(t) ? x.dataset.borne === t.dataset.borne : (x.classList.contains('fil') && x.dataset.i === t.dataset.i)))); };
  const lacher = () => { dernier = null; box.querySelectorAll('.vise').forEach(x => x.classList.remove('vise')); marquerVisees([]); rallumer(); };
  const dedans = el => !!(el && el.closest && el.closest('.phy, .simu-tab'));
  box.addEventListener('mouseover', e => { const t = e.target.closest('.mod, .fil, .trous'); if (!t || t === dernier) return; dernier = t; viser(t); });
  // la souris part du dessin ou de la table : un fil qui a le focus garde la main (un défilement suffit à faire sortir un pointeur immobile)
  box.addEventListener('mouseout', e => { if (dedans(e.relatedTarget)) return;
    const f = box.contains(document.activeElement) ? document.activeElement.closest('.fil') : null; if (f) { dernier = f; viser(f); } else if (dernier) lacher(); });
  box.addEventListener('focusin', e => { const t = e.target.closest('.fil'); if (t) { dernier = t; viser(t); } });
  box.addEventListener('focusout', e => { if (dernier && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.fil'))) lacher(); });
  box.addEventListener('click', e => { const f = e.target.closest('.fil'); if (f) { voirFilDeCarte(+f.dataset.i); return; }
    const m = e.target.closest('.mod, .trous'); if (m) voirModule(indices(m)); });
  box.addEventListener('keydown', e => { const f = e.target.closest('.fil'); if (f && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); voirFilDeCarte(+f.dataset.i); } }); }
/* Une hypothèse changée : elle est gardée et tout se rejuge (`apresHypotheses`) ; ce qui la montre se refait —
   `refaireFiche` (la fiche des hypothèses), sinon la carte de l'inspecteur — et le champ garde la main. `box` : le
   conteneur des champs (les identifiants s'y cherchent : un bandeau de carte et la fiche peuvent coexister). */
function lierHypotheses(box, refaireFiche) { const H = app.simu, el = id => box.querySelector('#' + id);
  const refaire = id => { apresHypotheses(); (refaireFiche || rendreFiche)(); const e = id && el(id); if (e) e.focus(); };
  [['si-R', 'regime'], ['si-C', 'cosphi'], ['si-Ret', 'retour']].forEach(([id, k]) => { const e = el(id); if (!e) return; e.addEventListener('change', () => { H[k] = k === 'cosphi' ? parseFloat(e.value) : e.value; refaire(id); }); });
  // l'ambiante du tableau : deux nombres, négatifs permis, le min sous le max
  [['si-Tmin', 'tableauMin'], ['si-Tmax', 'tableauMax']].forEach(([id, k]) => { const e = el(id); if (!e) return;
    e.addEventListener('change', () => { const v = parseFloat(String(e.value).replace(',', '.')); if (isNaN(v)) { e.value = H[k]; return; } if (v === H[k]) return; H[k] = v;
      if (H.tableauMin > H.tableauMax) { if (k === 'tableauMin') H.tableauMax = v; else H.tableauMin = v; } refaire(id); }); });
  [['si-L', 'longueur'], ['si-I', 'courant'], ['si-U', 'tension'], ['si-T', 'ambiante'], ['si-Tc', 'tconducteur'], ['si-X', 'reactance'], ['si-P', 'charge'], ['si-A', 'altitude']].forEach(([id, k]) => { const e = el(id); if (!e) return;
    e.addEventListener('change', () => { const v = parseFloat(String(e.value).replace(',', '.')); if (isNaN(v) || v < 0) { e.value = H[k]; return; } if (v === H[k]) return; H[k] = v; refaire(id); }); });
  box.querySelectorAll('input[data-cond]').forEach(e => e.addEventListener('change', () => { const c = e.dataset.cond;
    H.conditions = e.checked ? [...new Set([...H.conditions, c])] : H.conditions.filter(x => x !== c); refaire(); })); }
/* Les lignes des fils qu'on survole dans le dessin, marquées dans la table. */
function marquerVisees(idx) { $('ba-tbody').querySelectorAll('tr[data-i]').forEach(tr => tr.classList.toggle('vise', idx.includes(+tr.dataset.i))); }
/* Cliquer un module : sa première ligne vient sous les yeux dans la table. */
function voirModule(idx) { if (!idx.length) return; const tr = $('ba-tbody').querySelector(`tr[data-i="${idx[0]}"]`);
  if (tr && tr.scrollIntoView) { try { tr.scrollIntoView({ block: 'nearest' }); } catch (_) { } } }

/* ---- le dessin physique : la réglette de face ---------------------------- */
/* Mesures en pixels — le dessin n'est jamais mis à l'échelle, pour que le
   texte reste lisible ; quand la réglette ne tient pas en largeur, c'est
   elle qui passe à la ligne. Une étiquette de fil fait trois lignes : le
   numéro de câble, vers quoi il va, son type (la jauge, et si la norme
   l'admet). Les TROUS sont sur le bord du module : pleins s'ils reçoivent
   un fil, vides sinon. */
const PHY = { pas: 40, module: 38, rail: 6, plomb: 14, ligne: 37, inter: 18, bande: 44, jeu: 14, carCable: 6, carDest: 5.7, trou: 3, ecartTrous: 8.5 };
const largeurCarte = () => Math.max(180, ($('ba-equip').clientWidth || 384) - 24);
const largeurFiche = () => (telephone() ? window.innerWidth - 32 : 520) - 24;   // moins le rembourrage du panneau de zoom
/* Les fils d'un module, retrouvés dans la vérité : l'indice de la liaison
   (pour la cadrer), ses folios, son sens (AMONT : il arrive sur la
   barrette, AVAL : il en repart), sa jauge et ce que la norme en dit. */
function filsDuModule(nom, m) { const V = verite();
  return m.fils.map(f => { const i = V.indexOf(f.l); if (i < 0) return null;
    return { i, f, cable: f.cable, vers: f.vers, borne: f.borne, type: f.type, jaugeOk: f.jaugeOk == null ? null : f.jaugeOk, amont: !!f.amont, plans: foliosDe(f.l) }; }).filter(Boolean); }
/* Les trous d'un côté d'un module : le fil (enrichi) qui y est, ou rien.
   Sans norme, un trou par côté. */
function trousDe(m, fils, sens) { if (m.trous) return m.trous[sens].map(f => f ? fils.find(e => e.f === f) || null : null);
  const t = fils.filter(f => f.amont === (sens === 'amont')); return t.length ? t : [null]; }
/* Le pas des modules : assez large pour le plus long texte écrit dessous. */
function pasDesModules(fils, badge) { let cable = 0, dest = 0;
  fils.forEach(f => { cable = Math.max(cable, f.cable.length * PHY.carCable + (badge && f.plans.length ? 6 + f.plans.join(',').length * 5 + 6 : 0)); dest = Math.max(dest, destination(f).length * PHY.carDest, (String(f.type || '').length + 3) * PHY.carDest); });
  return Math.max(PHY.pas, Math.ceil(Math.max(cable, dest)) + 6); }
const destination = f => f.vers + (f.borne ? ':' + f.borne : '');
/* Les rangs : la réglette passe à la ligne quand elle ne tient pas en
   largeur, en coupant entre deux paquets tant que c'est possible ; entre
   deux découpes qui font autant de rangs, la plus équilibrée. */
function rangsDeModules(P, capacite) { const n = P.modules.length; if (n <= capacite) return [P.modules.map((_, i) => i)];
  const unites = [], vu = new Set();
  P.modules.forEach((m, i) => { if (vu.has(i)) return;
    const u = (m.paquet != null && P.paquets[m.paquet].ponte) ? P.modules.map((x, j) => x.paquet === m.paquet ? j : -1).filter(j => j >= 0) : [i];
    u.forEach(j => vu.add(j)); unites.push(u); });
  const tasser = cap => { const rangs = [[]]; unites.forEach(u => { let r = rangs[rangs.length - 1];
    if (r.length && r.length + u.length > cap) { r = []; rangs.push(r); }
    u.forEach(j => { if (r.length >= cap) { r = []; rangs.push(r); } r.push(j); }); }); return rangs; };
  const equilibre = tasser(Math.ceil(n / Math.ceil(n / capacite))), serre = tasser(capacite);
  return equilibre.length <= serre.length ? equilibre : serre; }
/* Le dessin entier : ses rangs l'un sous l'autre, dans un SVG à sa taille,
   rendu avec son conteneur `.phy`. */
function dessinPhysique(nom, P, largeur, opts) { opts = opts || {};
  const fils = P.modules.map(m => nom ? filsDuModule(nom, m) : []), badge = !!nom && plans().length > 1;
  const pas = pasDesModules(fils.flat(), badge), rangs = rangsDeModules(P, Math.max(1, Math.floor((largeur - 6) / pas)));   // 6 : les marges du SVG
  const W = Math.max(...rangs.map(r => r.length)) * pas, forme = opts.forme || 'reglette';
  let y = 0, s = '';
  rangs.forEach((r, k) => { const o = { badge, sansFils: !nom, forme, premier: k === 0, dernier: k === rangs.length - 1 };
    const R = forme === 'reglette' ? rangReglette(P, r, fils, pas, o) : rangCoupure(P, r, fils, pas, o);
    s += `<g transform="translate(0,${y})">${R.svg}</g>`; y += R.h + (k < rangs.length - 1 ? PHY.inter : 0); });
  const titre = `${P.nature}${P.reference ? ' ' + P.reference : ''} : ${pluriel(P.modules.length, forme === 'reglette' ? 'module' : 'contact')}`;
  // le conteneur dit sa hauteur : dans une carte à hauteur bornée, une grille rognerait sinon un conteneur qui défile
  return `<div class="phy" style="min-height:${y + 10 + (W + 6 > largeur ? 14 : 0)}px"><svg class="phy-svg" width="${W + 6}" height="${y + 4}" viewBox="-3 -2 ${W + 6} ${y + 4}" role="img" aria-label="${escA(titre)}">${defsPhysique()}${s}</svg></div>`; }
function defsPhysique() { return '<defs><pattern id="phy-hachure" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect class="phy-h-fond" width="6" height="6"/><line class="phy-h-trait" x1="0" y1="0" x2="0" y2="6" stroke-width="2"/></pattern></defs>'; }
/* Le début du groupe d'un module ou d'un contact — on le referme après ses
   formes : sa classe dit s'il est utilisé, libre, hors de la référence, ou
   en surcharge ; ses données disent ses fils, pour le survol. */
function debutModule(P, m, fils, sansFils) { const cls = sansFils ? 'mod neutre' : m.utilisee ? 'mod' : 'mod libre';
  return `<g class="${cls}${horsReference(P, m) ? ' hors' : ''}${m.surcharge ? ' surcharge' : ''}" data-borne="${escA(m.borne)}" data-fils="${fils.map(f => f.i).join(' ')}"><title>${esc('Borne ' + m.borne + (sansFils ? '' : m.utilisee ? ' · ' + pluriel(fils.length, 'fil') : ' · libre') + (m.surcharge ? ' · surcharge' : ''))}</title>`; }
/* Les trous d'un côté, sur le bord du module : un rond par trou, plein
   quand un fil y est. Le premier trou est sous le plomb, les autres à sa
   droite (centrés s'ils sont nombreux). Ceux qui débordent (surcharge)
   sont barrés. */
function trousSvg(trous, cx, y, n, cote) { const x0 = trous.length <= 3 ? cx : cx - (trous.length - 1) / 2 * PHY.ecartTrous;
  return trous.map((f, k) => { const x = f1(x0 + k * PHY.ecartTrous);
  return `<circle class="trou-fil${f ? ' occ' : ''}${k >= n ? ' sur' : ''}" data-cote="${cote}" cx="${x}" cy="${y}" r="${PHY.trou}"><title>${esc('trou ' + (k + 1) + ' ' + cote + (f ? ' : ' + f.cable : ' : libre'))}</title></circle>`; }).join(''); }
/* Un rang de RÉGLETTE : au-dessus, les fils qui arrivent ; la rangée de
   modules numérotés, leurs trous sur les bords, le peigne de cuivre sur
   chaque paquet, le rail sous eux ; en dessous, les fils qui repartent. */
function rangReglette(P, idx, fils, pas, o) {
  const T = (i, s) => trousDe(P.modules[i], fils[i], s), pleins = t => t.filter(Boolean), n = P.filsParCote || 1;
  const nT = Math.max(0, ...idx.map(i => pleins(T(i, 'amont')).length)), nB = Math.max(0, ...idx.map(i => pleins(T(i, 'aval')).length));
  const yS = nT ? nT * PHY.ligne + PHY.plomb : 0, yR = yS + PHY.module + 2, yBas = yR + PHY.rail, Wr = idx.length * pas;
  let s = `<rect class="rail" x="-2" y="${yR}" width="${Wr + 4}" height="${PHY.rail}" rx="1"/>` + (o.premier ? '' : coupeRail(-2, yR)) + (o.dernier ? '' : coupeRail(Wr + 2, yR));
  idx.forEach((i, k) => { const m = P.modules[i], x = k * pas, cx = x + pas / 2;
    s += debutModule(P, m, fils[i], o.sansFils) + `<rect class="cell" x="${x + 1.5}" y="${yS}" width="${pas - 3}" height="${PHY.module}" rx="2"/><text class="num" x="${cx}" y="${yS + 13}" text-anchor="middle">${esc(clip(m.borne, 4))}</text></g>`; });
  // le peigne : une barre de cuivre d'un bout à l'autre du paquet, une dent par module ; coupé s'il continue sur un autre rang
  const yP = yS + PHY.module * 0.7;
  P.paquets.forEach((p, q) => { if (!p.ponte) return; const tous = P.modules.map((m, j) => m.paquet === q ? j : -1).filter(j => j >= 0);
    const ks = idx.map((i, k) => P.modules[i].paquet === q ? k : -1).filter(k => k >= 0); if (!ks.length) return;
    const x0 = tous.some(j => j < idx[0]) ? -2 : Math.min(...ks) * pas + pas / 2, x1 = tous.some(j => j > idx[idx.length - 1]) ? Wr + 2 : Math.max(...ks) * pas + pas / 2;
    s += `<line class="peigne" x1="${x0}" y1="${yP}" x2="${x1}" y2="${yP}"/>` + ks.map(k => `<circle class="dent" cx="${k * pas + pas / 2}" cy="${yP}" r="3.2"/>`).join(''); });
  // les trous sur les bords (par-dessus le rail), les plombs jusqu'aux étiquettes, les étiquettes
  idx.forEach((i, k) => { const cx = k * pas + pas / 2, m = P.modules[i], tA = T(i, 'amont'), tB = T(i, 'aval'), A = pleins(tA), B = pleins(tB);
    s += `<g class="trous" data-borne="${escA(m.borne)}" data-fils="${fils[i].map(f => f.i).join(' ')}">${trousSvg(tA, cx, yS, n, 'amont')}${trousSvg(tB, cx, yS + PHY.module, n, 'aval')}</g>`;
    A.forEach((f, j) => { s += etiquetteFil(f, m, cx, yS - PHY.plomb - (j + 1) * PHY.ligne, pas, o.badge, j >= n); }); if (A.length) s += plomb(cx, yS - PHY.plomb, yS - PHY.trou);
    B.forEach((f, j) => { s += etiquetteFil(f, m, cx, yBas + PHY.plomb + j * PHY.ligne, pas, o.badge, j >= n); }); if (B.length) s += plomb(cx, yS + PHY.module + PHY.trou, yBas + PHY.plomb - 1); });
  return { svg: s, h: yBas + (nB ? PHY.plomb + nB * PHY.ligne : 0) };
}
/* Un rang de PRISE DE COUPURE, de face et éclatée : la PARTIE MOBILE (la
   fiche, sur le faisceau) en haut, où arrivent les fils d'amont ; la PARTIE
   FIXE (l'embase, sur la structure) en bas, d'où repartent les fils d'aval ;
   les contacts numérotés se font face — un contact est un trou : hachuré
   s'il est vide de ce côté. Une embase seule pour un connecteur. */
function rangCoupure(P, idx, fils, pas, o) {
  const T = (i, s) => trousDe(P.modules[i], fils[i], s), pleins = t => t.filter(Boolean), n = P.filsParCote || 1, mobile = o.forme !== 'connecteur';
  const nT = Math.max(0, ...idx.map(i => pleins(T(i, 'amont')).length)), nB = Math.max(0, ...idx.map(i => pleins(T(i, 'aval')).length));
  const yM = nT ? nT * PHY.ligne + PHY.plomb : 0, yF = mobile ? yM + PHY.bande + PHY.jeu : yM, yBas = yF + PHY.bande, Wr = Math.max(idx.length * pas, 140);
  let s = mobile ? `<rect class="mobile" x="0" y="${yM}" width="${Wr}" height="${PHY.bande}" rx="4"/><text class="part" x="7" y="${yM + 10}">PARTIE MOBILE · fiche</text>` : '';
  s += `<rect class="fixe" x="0" y="${yF}" width="${Wr}" height="${PHY.bande}" rx="3"/><text class="part" x="7" y="${yF + PHY.bande - 5}">${mobile ? 'PARTIE FIXE · embase' : 'EMBASE'}</text>`
    + `<circle class="trou" cx="7" cy="${yF + 8}" r="2.4"/><circle class="trou" cx="${Wr - 7}" cy="${yF + 8}" r="2.4"/>`;
  idx.forEach((i, k) => { const m = P.modules[i], cx = k * pas + pas / 2, cyM = yM + PHY.bande / 2 + 5, cyF = yF + PHY.bande / 2 - 5, num = esc(clip(m.borne, 3));
    const videM = !o.sansFils && !pleins(T(i, 'amont')).length, videF = !o.sansFils && !pleins(T(i, 'aval')).length;
    s += debutModule(P, m, fils[i], o.sansFils);
    if (mobile) s += `<circle class="cell${videM ? ' vide' : ''}" cx="${cx}" cy="${cyM}" r="8.5"/><text class="num" x="${cx}" y="${cyM + 3.6}" text-anchor="middle">${num}</text><line class="axe" x1="${cx}" y1="${yM + PHY.bande}" x2="${cx}" y2="${yF}"/>`;
    s += `<circle class="cell douille${videF ? ' vide' : ''}" cx="${cx}" cy="${cyF}" r="8.5"/><text class="num" x="${cx}" y="${cyF + 3.6}" text-anchor="middle">${num}</text></g>`; });
  idx.forEach((i, k) => { const cx = k * pas + pas / 2, m = P.modules[i], A = pleins(T(i, 'amont')), B = pleins(T(i, 'aval'));
    A.forEach((f, j) => { s += etiquetteFil(f, m, cx, yM - PHY.plomb - (j + 1) * PHY.ligne, pas, o.badge, j >= n); }); if (A.length) s += plomb(cx, yM - PHY.plomb, yM);
    B.forEach((f, j) => { s += etiquetteFil(f, m, cx, yBas + PHY.plomb + j * PHY.ligne, pas, o.badge, j >= n); }); if (B.length) s += plomb(cx, yBas, yBas + PHY.plomb - 1); });
  return { svg: s, h: yBas + (nB ? PHY.plomb + nB * PHY.ligne : 0) };
}
/* L'étiquette d'un fil, sous (ou sur) son module : le numéro de câble, son
   folio en badge si le contrat en a plusieurs, « repère:borne » d'en face,
   puis son type — en rouge si la norme n'admet pas sa jauge. Un fil qui
   n'a pas de trou (surcharge) est cerné de rouge. Cliquable, et au clavier. */
function etiquetteFil(f, m, cx, t, pas, badge, surcharge) { const dest = clip(destination(f), Math.floor((pas - 6) / PHY.carDest));
  let cable;
  if (badge && f.plans.length) { const p = f.plans.join(','), cw = f.cable.length * PHY.carCable, bw = p.length * 5 + 6, x0 = cx - (cw + 4 + bw) / 2;
    cable = `<text class="cable" x="${f1(x0)}" y="${t + 11}">${esc(f.cable)}</text><rect class="badge" x="${f1(x0 + cw + 4)}" y="${t + 2}" width="${bw}" height="11" rx="3"/><text class="badge-t" x="${f1(x0 + cw + 4 + bw / 2)}" y="${t + 10.5}" text-anchor="middle">${esc(p)}</text>`; }
  else cable = `<text class="cable" x="${cx}" y="${t + 11}" text-anchor="middle">${esc(clip(f.cable, Math.floor((pas - 6) / PHY.carCable)))}</text>`;
  const typ = f.type ? `<text class="typ${f.jaugeOk === false ? ' ko' : ''}" x="${cx}" y="${t + 32}" text-anchor="middle">${esc(clip(f.type, Math.floor((pas - 6) / PHY.carDest)))}${f.jaugeOk === false ? ' !' : ''}</text>` : '';
  return `<g class="fil${surcharge ? ' surcharge' : ''}" data-i="${f.i}" data-fils="${f.i}" data-borne="${escA(m.borne)}" tabindex="0" role="button" aria-label="${escA('Voir le fil ' + f.cable + ' sur le plan' + (f.plans.length ? ', folio ' + f.plans.join(', ') : '') + (f.jaugeOk === false ? ' — jauge hors plage' : '') + (surcharge ? ' — en surcharge' : ''))}">`
    + `<rect class="zone" x="${f1(cx - pas / 2 + 1)}" y="${t}" width="${pas - 2}" height="${PHY.ligne - 2}" rx="4"/>${cable}<text class="dest" x="${cx}" y="${t + 22}" text-anchor="middle">${esc(dest)}</text>${typ}</g>`; }
/* Le plomb : le bout de fil entre l'étiquette et le module, fléché dans le
   sens du courant — vers le bas, d'amont en aval. */
const plomb = (cx, y0, y1) => `<line class="plomb" x1="${cx}" y1="${y0}" x2="${cx}" y2="${y1}"/><path class="fleche" d="M${cx - 3} ${y1 - 5}L${cx + 3} ${y1 - 5}L${cx} ${y1}Z"/>`;
/* Le rail coupé : la réglette continue sur le rang d'à côté. */
const coupeRail = (x, y) => `<path class="coupe" d="M${x - 3} ${y - 4}l3 3.5l-3 3.5l3 3.5"/>`;

/* Une cellule corrigée : la vérité change, le plan suit, le fil s'allume.
   Un bloc choisi le reste : on corrige ses fils sans quitter sa fiche. */
function appliquerCellule(inp) { const l = verite()[+inp.dataset.i], k = inp.dataset.f; if (!l || !k) return;
  const v = inp.value.trim(); if (l[k] === v) return;
  if (!inp.dataset.hist) { histPush('modification d’une liaison'); inp.dataset.hist = '1'; }   // une seule entrée d'historique par saisie
  l[k] = v; app.actif = l; if (!(app.cible && app.cible.type === 'bloc')) app.cible = { type: 'fil', l }; apresEdition(); }
/* Entrer dans une cellule : sa ligne devient ce qu'on regarde. */
function entrerCellule(inp) { delete inp.dataset.hist; app.base.enSaisie = true;
  const l = verite()[+inp.dataset.i]; if (!l) return; app.actif = l;
  if (!(app.cible && app.cible.type === 'bloc')) app.cible = { type: 'fil', l }; rallumer(); }
function quitterTable() { app.base.enSaisie = false; app.actif = null; if (app.base.sale) rendreBase(); rallumer(); }
function ajouterLiaison(de) { histPush('ajout d’une liaison');
  const n = liaison({ de: de || '', plan: (modeFolio() === 'fichier' && app.plan !== '*') ? app.plan : '' }); verite().push(n);
  const i = verite().length - 1, sousBloc = de && app.cible && app.cible.type === 'bloc' && app.cible.nom === de;
  if (!sousBloc) { app.cible = { type: 'fil', l: n }; app.base.filtre = ''; }
  app.base.tri = null; apresEdition(); rendreBase();
  const tr = $('ba-tbody').querySelector(`tr[data-i="${i}"]`); const inp = tr && tr.querySelector(`input[data-f="${de ? 'vers' : 'de'}"]`);
  if (inp) { inp.focus(); try { tr.scrollIntoView({ block: 'nearest' }); } catch (_) { } } }
function supprimerLiaison(i) { const V = verite(), l = V[i]; if (!l) return; histPush('suppression d’une liaison'); V.splice(i, 1);
  if (app.cible && app.cible.type === 'fil' && app.cible.l === l) app.cible = null; apresEdition(); rendreBase(); }
/* Les folios où une liaison se dessine : ceux que l'outil lui a donnés en
   découpant, sinon celui que le fichier porte. */
function foliosDe(l) { return modeFolio() === 'auto' ? (foliosParSource().get(cleDe(l)) || []) : (l.plan ? [l.plan] : []); }
/* Voir un fil depuis sa ligne : on change de folio s'il le faut, on le cadre. */
function voirLiaison(i) { const l = verite()[i]; if (!l) return;
  if (app.choisi) { app.choisi = null; peindre(); } app.cible = { type: 'fil', l };
  const ou = foliosDe(l); if (app.plan !== '*' && ou.length && !ou.includes(app.plan)) allerAuPlan(ou[0]);
  const w = filDe(l); if (w) { allumerFil(w); viserFil(w); } marquerLignes(); ouvrirInspecteur(); }
/* Le même geste depuis la carte d'une barrette : le bloc reste choisi, sa
   carte reste ; on va seulement voir le fil, même sur un autre folio. */
function voirFilDeCarte(i) { const l = verite()[i]; if (!l) return;
  const ou = foliosDe(l);
  if (app.plan !== '*' && ou.length && !ou.includes(app.plan)) { allerAuPlan(ou[0]); if (app.cible && app.cible.type === 'bloc') { app.choisi = app.cible.nom; peindre(); } }
  const w = filDe(l); if (w) { allumerFil(w); viserFil(w); } else if (!attenteCourante()) dire('Ce fil n’est pas dessiné sur ce folio.'); }
function lierBase() { const t = $('ba-tab'), corps = $('ba-tbody'), fi = $('ba-filtre'); let sT, fT;
  fi.addEventListener('input', () => { clearTimeout(fT); fT = setTimeout(() => { app.base.filtre = fi.value; app.base.filtreAuto = false;
    const c = app.cible; if (c && c.type === 'bloc' && fi.value.trim() !== filtreDuBloc(c.nom)) { app.cible = null; app.choisi = null; peindre(); }
    rendreBase(); rallumer(); }, 150); });
  fi.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); if (fi.value) { fi.value = ''; fi.dispatchEvent(new Event('input')); } else fi.blur(); } });
  $('ba-vider').onclick = () => { fi.value = ''; fi.dispatchEvent(new Event('input')); fi.focus(); };
  $('ba-fermer').onclick = fermerBase; $('ba-ajouter').onclick = nouvelleLiaison;
  $('ba-portee').addEventListener('click', e => { const b = e.target.closest('[data-portee]'); if (!b || app.base.portee === b.dataset.portee) return; app.base.portee = b.dataset.portee; memoriserBase(); rendreBase(); });
  $('ba-thead').addEventListener('click', e => { const th = e.target.closest('th[data-k]'); if (!th) return; const k = th.dataset.k, tri = app.base.tri;
    app.base.tri = !tri || tri.k !== k ? { k, sens: 1 } : (tri.sens > 0 ? { k, sens: -1 } : null); rendreBase(); });
  t.addEventListener('focusin', e => { if (e.target.dataset.f != null) entrerCellule(e.target); });
  t.addEventListener('input', e => { const inp = e.target; if (inp.dataset.f == null) return; clearTimeout(sT); sT = setTimeout(() => appliquerCellule(inp), 350); });
  t.addEventListener('change', e => { const inp = e.target; if (inp.dataset.f == null) return; clearTimeout(sT); appliquerCellule(inp); });
  // le focus part : si c'est hors de la table (on le sait un instant plus tard), la saisie est finie
  t.addEventListener('focusout', () => setTimeout(() => { if (!t.contains(document.activeElement)) quitterTable(); }, 0));
  t.addEventListener('keydown', e => { const inp = e.target; if (inp.dataset.f == null) return;
    if (e.key === 'Escape') { e.stopPropagation(); inp.blur(); }
    else if (e.key === 'Enter') { e.preventDefault(); const tr = inp.closest('tr'), suiv = tr && tr.nextElementSibling; const n = suiv && suiv.querySelector(`input[data-f="${inp.dataset.f}"]`); if (n) n.focus(); else inp.blur(); } });
  corps.addEventListener('mouseover', e => { const tr = e.target.closest('tr[data-i]'); if (!tr) return; const w = filDe(verite()[+tr.dataset.i]); if (w) allumerFil(w); });
  corps.addEventListener('mouseleave', () => rallumer());
  corps.addEventListener('click', e => { const v = e.target.closest('button[data-voir]'), x = e.target.closest('button[data-x]'), f = e.target.closest('button[data-plan]');
    if (v) voirLiaison(+v.dataset.voir); else if (x) supprimerLiaison(+x.dataset.x); else if (f) allerAuPlan(f.dataset.plan); });
  lierPoignee(); }
/* La poignée : le tiroir se règle en hauteur. */
function lierPoignee() { const p = $('ba-poignee'), b = $('base'); let actif = false;
  p.addEventListener('pointerdown', e => { actif = true; b.classList.add('redim'); try { p.setPointerCapture(e.pointerId); } catch (_) { } e.preventDefault(); });
  p.addEventListener('pointermove', e => { if (!actif) return;
    // le tiroir se règle en hauteur, à la poignée du haut (sur téléphone comme sur grand écran)
    app.base.hauteur = Math.round(Math.max(150, Math.min(window.innerHeight * 0.75, b.getBoundingClientRect().bottom - e.clientY)));
    appliquerTailleBase(); });
  const fin = () => { if (!actif) return; actif = false; b.classList.remove('redim'); memoriserBase(); ajuster(true); };
  p.addEventListener('pointerup', fin); p.addEventListener('pointercancel', fin); }
function appliquerTailleBase() { if (app.base.hauteur) document.documentElement.style.setProperty('--base-h', app.base.hauteur + 'px'); }
function ouvrirBase() { if (app.base.ouvert) return; app.base.ouvert = true; fermerFiche();
  // le filtre suit le bloc choisi ; sans bloc, celui qu'un bloc avait posé s'efface (celui qu'on a écrit reste)
  if (app.cible && app.cible.type === 'bloc') { app.base.filtre = filtreDuBloc(app.cible.nom); app.base.filtreAuto = true; }
  else if (app.base.filtreAuto) { app.base.filtre = ''; app.base.filtreAuto = false; }
  app.base.defiler = true;
  const b = $('base'); b.hidden = false; b.classList.remove('entre'); void b.offsetWidth; b.classList.add('entre');
  document.body.classList.add('base-ouverte'); $('btnBase').setAttribute('aria-pressed', 'true');
  rendreBase(); memoriserBase(); ajuster(true); }
function fermerBase() { if (!app.base.ouvert) return; app.base.ouvert = false;
  $('base').hidden = true; document.body.classList.remove('base-ouverte'); $('btnBase').setAttribute('aria-pressed', 'false');
  memoriserBase(); ajuster(true); }
function basculerBase() { if (app.base.ouvert) fermerBase(); else if (app.contrat.liaisons.length || verite().length) ouvrirBase(); else dire('Rien à montrer : dépose d’abord un fichier.'); }
/* Sa taille et sa portée : une commodité de ce navigateur, rien de plus. Ouvert ou non ne se garde pas : on rouvre
   toujours sur le plan seul (c'est lui qu'on scanne), le tableau vient à la demande (B). */
function memoriserBase() { try { localStorage.setItem(CLE_BASE, JSON.stringify({ portee: app.base.portee, hauteur: app.base.hauteur })); } catch (_) { } }
function relireBase() { let o = null; try { o = JSON.parse(localStorage.getItem(CLE_BASE) || 'null'); } catch (_) { }
  if (o) { app.base.hauteur = o.hauteur || 0; if (o.portee === 'tout' || o.portee === 'folio') app.base.portee = o.portee; } appliquerTailleBase(); }

/* ---- la fiche : cartouche, collage, bible — les documents rares --------- */
function ouvrirFiche(mode, corps, pied) { const f = $('fiche'); fermerBase(); if (!$('inspecteur').hidden) { $('inspecteur').hidden = true; document.body.classList.remove('insp-ouvert'); }
  $('fiche-corps').innerHTML = corps; const p = $('fiche-pied'); p.innerHTML = pied || ''; p.hidden = !pied;
  const nouveau = f.hidden || !app.fiche || app.fiche.mode !== mode.mode;
  const r = document.documentElement.style; r.setProperty('--fiche-l', (mode.large ? 560 : 400) + 'px');
  f.hidden = false; if (nouveau) { f.classList.remove('entre'); void f.offsetWidth; f.classList.add('entre'); }
  app.fiche = mode; $('fiche-corps').scrollTop = 0;
  // sur téléphone un document est une page, de la barre du haut au rail : la bande des folios se range (style.css)
  document.body.classList.add('fiche-ouverte');
  $('fi-fermer').onclick = () => fermerFiche(true); synchroniserRail(); if (nouveau) ajuster(true); }
/* `recadrer` : quand on ferme la fiche pour elle-même, ce qu'on avait choisi revient dans l'inspecteur (le document
   l'avait remplacé), sinon le plan reprend la place. */
function fermerFiche(recadrer) { const f = $('fiche'); if (f.hidden && !app.fiche) return; f.hidden = true; app.fiche = null;
  document.body.classList.remove('fiche-ouverte'); synchroniserRail(); if (!recadrer) return;
  if (app.cible && $('inspecteur').hidden) ouvrirInspecteur(); else ajuster(true); }
const tete = (sur, titre, sans) => `<div class="fiche-tete"><div class="min0"><div class="sur">${esc(sur)}</div><h2 class="titre${sans ? ' sans' : ''}">${esc(titre)}</h2></div>
  <button class="rond fermer" id="fi-fermer" aria-label="Fermer la fiche"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>`;
const champ = (id, lib, val, opt) => `<label class="champ${opt && opt.sans ? ' sans' : ''}"><span>${lib}</span><input id="${id}" value="${escA(val || '')}"${opt && opt.ph ? ` placeholder="${escA(opt.ph)}"` : ''} spellcheck="false"></label>`;
const CHAMPS_CARTOUCHE = [['ca-titre', 'titre', 'Titre'], ['ca-auteur', 'auteur', 'Dessiné par'], ['ca-indice', 'indice', 'Indice'], ['ca-date', 'date', 'Date'], ['ca-echelle', 'echelle', 'Échelle']];
function ficheCartouche() { const c = app.contrat.cartouche;
  const corps = tete('Sur chaque folio', 'Cartouche') + champ('ca-titre', 'Titre', c.titre, { sans: true }) + champ('ca-auteur', 'Dessiné par', c.auteur, { sans: true })
    + `<div class="grille">${champ('ca-indice', 'Indice', c.indice)}${champ('ca-date', 'Date', c.date)}</div>` + champ('ca-echelle', 'Échelle', c.echelle)
    + '<p class="note">Le numéro de folio s’écrit tout seul. Ce cartouche part avec chaque planche enregistrée ou imprimée.</p>';
  ouvrirFiche({ mode: 'cartouche' }, corps, '');
  CHAMPS_CARTOUCHE.forEach(([id, k]) => { $(id).addEventListener('input', e => { c[k] = e.target.value; }); $(id).addEventListener('change', () => { peindre(); rallumer(); sauver(); }); });
}
function ficheColler() {
  const corps = tete('Charger', 'Coller des liaisons')
    + '<p class="note">Une liaison par ligne, colonnes séparées par <b>;</b> <b>,</b> ou une tabulation. Un export du retest est reconnu à ses en-têtes ; sinon l’ordre attendu est :</p>'
    + '<p class="note mono">Équip.1 · Borne · PN · Équip.2 · Borne · PN · Fil · Type · Route · Folio</p>'
    + '<label class="champ"><span>Lignes</span><textarea id="co-txt" placeholder="210SP1;12;;115CD;3;;W-101;DR24;;" spellcheck="false"></textarea></label>';
  const pied = '<button class="btn cuivre" id="co-ok">Charger</button><span class="espace"></span><button class="btn lien" id="co-fichier">…ou choisir un fichier</button>';
  ouvrirFiche({ mode: 'coller' }, corps, pied);
  $('co-ok').onclick = () => { const r = lireTexte($('co-txt').value);
    if (!r.liaisons.length) { dire('Aucune liaison reconnue : vérifie le séparateur et l’ordre des colonnes.', true); return; }
    chargerContrat(r.liaisons, 'collage de ' + r.liaisons.length + ' liaisons', 'Collage'); dire(r.liaisons.length + ' liaisons chargées.'); };
  $('co-fichier').onclick = () => $('fichier').click();
  $('co-txt').focus();
}
/* La bible des barrettes (ficheBible, pictoBible, zoomBible, importerBible), la norme et son import (ficheNormes, importerNorme) vivent dans 08-normes.js. */

/* ---- corriger : toujours la vérité, puis on refait les folios ----------- */
/* Une demi-liaison de renvoi porte le vrai bout dans sa borne : « 733LE 4 ». */
const boutSource = (n, b) => { if (!estRenvoi(n)) return [n, b]; const k = b.indexOf(' '); return k < 0 ? [b, ''] : [b.slice(0, k), b.slice(k + 1)]; };
function cleSource(l) { const [de, bDe] = boutSource(l.de, l.borneDe), [vers, bVers] = boutSource(l.vers, l.borneVers); return [de, bDe, vers, bVers, l.cable].join('\u0001'); }
function sourceDe(l) { if (l && l.origine !== undefined) return l.origine ? sourceDe(l.origine) : null;   // une liaison d'un folio : celle du contrat, ou rien (ajoutée par l'outil)
  if (!app.source || app.source.includes(l)) return l;
  const k = cleSource(l); return app.source.find(s => cleDe(s) === k) || null; }
/* Les liaisons où lire un repère : le contrat ; pour une barrette à poser (VT1…), qui n'existe que sur son folio, le folio. */
const liaisonsDeRepere = nom => VT_A_POSER.test(nom) ? liaisonsDuPlan() : verite();
// le rang d'un fil dans le contrat (dans la vérité), qu'on le tienne du contrat ou d'un folio ; -1 pour un fil que l'outil ajoute
const rangDe = l => { const s = sourceDe(l); return s ? verite().indexOf(s) : -1; };
/* POSER une barrette à poser au contrat, sous son vrai repère : chaque fil du dédoublement part d'une borne à lui, un
   fil à créer (sans numéro) relie la borne de l'équipement à la borne 1, des shunts relient les bornes — ce que le folio
   montrait devient le contrat. Ctrl+Z le défait. */
function poserBarrette(vt, nom) { const L = liaisonsDuPlan().filter(l => l.aPoser === vt), V = verite(); if (!L.length) return false;
  if (V.some(l => l.de === nom || l.vers === nom)) { dire(nom + ' existe déjà au contrat : choisis un autre repère.', true); return false; }
  histPush('pose de ' + nom + ' (' + vt + ')'); const plan = modeFolio() === 'fichier' ? L[0].plan || '' : '';
  L.forEach(l => {
    if (l.origine) { const s = sourceDe(l); if (!s) return;
      if (l.de === vt) { s.de = nom; s.borneDe = l.borneDe; s.pnDe = ''; } if (l.vers === vt) { s.vers = nom; s.borneVers = l.borneVers; s.pnVers = ''; } return; }
    V.push(liaison({ ...l, de: l.de === vt ? nom : l.de, vers: l.vers === vt ? nom : l.vers, plan })); });
  const n = L.filter(l => l.de === vt && l.vers === vt).length;
  app.choisi = nom; app.cible = { type: 'bloc', nom }; apresEdition();
  dire(`${vt} posée au contrat sous ${nom} : un fil à créer, ${pluriel(n, 'shunt')}. Ctrl+Z pour défaire.`); return true; }
function renommer(ancien, nouveau) { verite().forEach(l => { if (l.de === ancien) l.de = nouveau; if (l.vers === ancien) l.vers = nouveau; });
  const d = app.contrat.designations.get(ancien); app.contrat.designations.delete(ancien); if (d) app.contrat.designations.set(nouveau, d);
  // le sexe des contacts et le profil de charge suivent le repère
  [app.contrat.sexes, app.contrat.raccords].forEach(S => { if (!S) return; [...S.keys()].forEach(k => { if (k === ancien || k.startsWith(ancien + '|')) { const v = S.get(k); S.delete(k); S.set(nouveau + k.slice(ancien.length), v); } }); });
  const C = app.contrat.charges || new Map(); if (C.has(ancien)) { const v = C.get(ancien); C.delete(ancien); C.set(nouveau, v); } }
function designer(nom, d) { if (d) app.contrat.designations.set(nom, d); else app.contrat.designations.delete(nom); }
function supprimerEquipement(nom) { const g = l => l.de !== nom && l.vers !== nom;
  if (app.source) app.source = app.source.filter(g); app.contrat.liaisons = app.contrat.liaisons.filter(g);
  app.contrat.designations.delete(nom); if (app.contrat.charges) app.contrat.charges.delete(nom);
  [app.contrat.sexes, app.contrat.raccords].forEach(S => { if (S) [...S.keys()].forEach(k => { if (k === nom || k.startsWith(nom + '|')) S.delete(k); }); }); app.choisi = null; app.cible = null; }
function refaireFolios() { const src = app.source, plan = app.plan; app.contrat.liaisons = src; app.source = null; app.nFolios = 0;
  const R = decouperEnFolios(src, app.budget);
  if (R.applique) { app.source = src; app.contrat.liaisons = R.liaisons; app.nFolios = R.nFolios; app.plan = plansDe(R.liaisons).includes(plan) ? plan : '1'; }
  else app.plan = '*'; }
/* Après chaque correction : les folios, le plan, la base, l'enregistrement. */
function apresEdition() { if (app.nFolios) refaireFolios(); redessiner(); sauver(); }

/* ---- les folios automatiques : découper, dérouler, ajuster tout seul --- */
function decouper(budget) { const src = verite(); const R = decouperEnFolios(src, budget);
  if (!R.applique) return 0;
  app.source = src; app.contrat.liaisons = R.liaisons; app.nFolios = R.nFolios; app.budget = budget; app.plan = '1'; redessiner(); ajuster(); return R.nFolios; }
function derouler() { if (!app.nFolios) return; app.contrat.liaisons = app.source; app.source = null; app.nFolios = 0; app.plan = '*'; redessiner(); ajuster(); }
/* Un dessin qui ne tient pas sur une feuille se découpe tout seul : on essaie
   plusieurs budgets, du plus généreux au plus serré, et on garde le premier
   qui rentre — sinon le meilleur format obtenu. */
function ajusterFolios() { if (app.nFolios) return 0;
  const f = formatDuDessin(app.dessin); if (!f || f.tientSurUnePage) return 0;
  const src = app.contrat.liaisons; let meilleur = null;
  for (const budget of [16, 12, 9, 6]) { if (app.nFolios) derouler(); app.contrat.liaisons = src;
    const n = decouper(budget); if (!n) break;
    const g = formatDuDessin(app.dessin); if (!g) break;
    const ecart = Math.abs(Math.log(g.ratio / 1.41));
    if (!meilleur || ecart < meilleur.ecart) meilleur = { budget, n, ecart };
    if (g.tientSurUnePage) break; }
  if (!meilleur) { derouler(); return 0; }
  const g = formatDuDessin(app.dessin);
  if (!g || Math.abs(Math.log(g.ratio / 1.41)) > meilleur.ecart + 1e-9) { derouler(); app.contrat.liaisons = src; decouper(meilleur.budget); }
  dire('Trop grand pour une feuille : découpé en ' + meilleur.n + ' folios.');
  return meilleur.n; }

/* ---- historique et enregistrement ------------------------------------- */
/* L'historique photographie le contrat entier — les liaisons, les choix (désignations, sexes, raccords, profils de
   charge), le cartouche — : défaire un chargement rend aussi les choix et le cartouche d'avant. */
function histPush(quoi) { app.hist.push({ quoi, liaisons: app.contrat.liaisons.map(l => ({ ...l })), source: app.source ? app.source.map(l => ({ ...l })) : null,
  nFolios: app.nFolios, budget: app.budget, plan: app.plan, nom: app.nom, designations: new Map(app.contrat.designations), sexes: new Map(app.contrat.sexes || []), raccords: new Map([...(app.contrat.raccords || [])].map(([k, v]) => [k, { ...v }])), charges: new Map([...(app.contrat.charges || [])].map(([k, v]) => [k, JSON.parse(JSON.stringify(v))])), cartouche: { ...app.contrat.cartouche }, retouches: new Map(app.retouches) });
  if (app.hist.length > 40) app.hist.shift(); synchroniserHistorique(); }
function annuler() { const p = app.hist.pop(); if (!p) return null;
  app.contrat.liaisons = p.liaisons; app.source = p.source; app.nFolios = p.nFolios; app.budget = p.budget || 16; app.plan = p.plan; app.nom = p.nom || ''; app.contrat.designations = p.designations; app.contrat.sexes = p.sexes || new Map(); app.contrat.charges = p.charges || new Map(); app.contrat.raccords = p.raccords || new Map();
  if (p.cartouche) app.contrat.cartouche = { ...p.cartouche };
  // les retouches d'avant reviennent, et se gardent comme elles étaient
  if (p.retouches) { const cles = new Set([...app.retouches.keys(), ...p.retouches.keys()]); app.retouches = p.retouches; cles.forEach(garderRetouche); }
  app.choisi = null; app.cible = null; app.actif = null; app.base.enSaisie = false; fermerFiche();
  if (document.activeElement && $('ba-tab').contains(document.activeElement)) document.activeElement.blur();
  redessiner(); ajuster(true); sauver(); return p.quoi; }
let sauveT = null;
function sauver() { clearTimeout(sauveT); sauveT = setTimeout(() => { try {
    localStorage.setItem(CLE_CONTRAT, JSON.stringify({ liaisons: app.contrat.liaisons, source: app.source, nFolios: app.nFolios, budget: app.budget, plan: app.plan, nom: app.nom,
      designations: [...app.contrat.designations], sexes: [...(app.contrat.sexes || [])], charges: [...(app.contrat.charges || [])], raccords: [...(app.contrat.raccords || [])], provisoires: [...(app.contrat.provisoires || [])], cartouche: app.contrat.cartouche, t: Date.now() }));
    heureSauve(Date.now()); } catch (_) { heureSauve(null); } }, 400); }
function heureSauve(t) { const el = $('ctx-sauve');
  if (!t) { el.textContent = 'non enregistré'; el.classList.add('ko'); el.title = 'Le navigateur refuse d’enregistrer (navigation privée ?). Le travail tient tant que l’onglet est ouvert.'; return; }
  const d = new Date(t); el.textContent = 'enregistré ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); el.classList.remove('ko');
  el.title = 'Gardé dans ce navigateur. Rien n’est parti sur le réseau.'; }
function relire() { try { const j = localStorage.getItem(CLE_CONTRAT); if (!j) return false; const o = JSON.parse(j);
    if (!o || !o.liaisons || !o.liaisons.length) return false;
    app.contrat.liaisons = o.liaisons.map(liaison); app.source = o.source ? o.source.map(liaison) : null; app.nFolios = o.nFolios || 0; app.budget = o.budget || 16; app.plan = o.plan || '*'; app.nom = o.nom || '';
    app.contrat.designations = new Map(o.designations || []); app.contrat.sexes = new Map(o.sexes || []); app.contrat.charges = new Map(o.charges || []); app.contrat.raccords = new Map(o.raccords || []); app.contrat.provisoires = new Map(o.provisoires || []); if (o.cartouche) Object.assign(app.contrat.cartouche, o.cartouche);
    const P = plans(); if (app.plan === '*' && P.length > 1) app.plan = P[0];
    redessiner(); ajuster(); heureSauve(o.t || Date.now()); return true; } catch (_) { return false; } }

/* ---- charger un contrat ----------------------------------------------- */
/* Un contrat NEUF : rien du contrat d'avant ne survit — ni désignations, ni sexes des contacts, ni profils de charge,
   ni raccords (les repères se répètent d'une machine à l'autre : le 102CB1 d'un retest prendrait le profil du 102CB1 de
   l'autre) ; le cartouche repart à neuf, sauf qui dessine et à quelle échelle, qui sont ceux du bureau. `relire()` rend
   les choix du contrat gardé ; Ctrl+Z rend ceux d'avant le chargement. */
function contratNeuf() { const d = app.contrat.cartouche, c = nouveauContrat(); c.cartouche.auteur = d.auteur; c.cartouche.echelle = d.echelle; return c; }
function chargerContrat(liaisons, quoi, nom) { histPush(quoi || 'chargement d’un contrat'); app.contrat = contratNeuf();
  app.contrat.liaisons = liaisons.map(liaison); app.source = null; app.nFolios = 0; app.choisi = null; app.cible = null; app.actif = null; app.nom = nom || app.nom;
  app.base.filtre = ''; app.base.tri = null; app.base.enSaisie = false;
  if (document.activeElement && $('ba-tab').contains(document.activeElement)) document.activeElement.blur();
  const P = plans(); app.plan = P.length > 1 ? P[0] : '*';
  fermerFiche(); fermerMenu(); $('q').value = '';
  redessiner(); ajuster(); if (P.length <= 1) ajusterFolios(); sauver(); }
/* Un fichier ouvert ou déposé : un retest (reconnu à ses seize colonnes),
   sinon une bible si ses en-têtes en font une, sinon un tableau libre. */
async function ouvrirFichier(fichier) { if (!fichier) return;
  try { dire('Lecture de « ' + fichier.name + ' », puis dessin…'); const texte = await texteDuFichier(fichier);
    if (!trouverEnteteRetest(texte.split(/\r?\n/))) { const b = lireBible(texte);
      if (b.entrees.length) { adopterBible(b.entrees, fichier.name); dire('Bible : ' + pluriel(b.entrees.length, 'référence') + ' lue' + (b.entrees.length > 1 ? 's' : '') + ' dans « ' + fichier.name + ' » ; les barrettes suivent.'); return; }
      if (normeLue(lireNorme(texte))) { await importerNorme(fichier); return; } }   // une norme déposée sur la table : reconnue à ses tables
    const r = lireTexte(texte);
    if (!r.liaisons.length) { dire('« ' + fichier.name + ' » est lu, mais aucune liaison n’est reconnue — vérifie les colonnes.', true); return; }
    if (r.harnais && r.harnais.length > 1) { adopterReferences(r.liaisons, fichier.name); ficheHarnais(r, fichier.name);
      dire(pluriel(r.harnais.length, 'harness') + ' dans « ' + fichier.name + ' » : gardés comme contrats déjà faits — lequel ouvrir sur la table ?'); return; }
    chargerContrat(r.liaisons, 'ouverture de ' + fichier.name, fichier.name);
    dire(r.liaisons.length + ' liaisons' + (r.format === 'retest' ? ' — format retest, en-têtes ligne ' + r.entete : '') + (plans().length > 1 ? ' · ' + plans().length + ' folios' : '') + '.');
  } catch (e) { dire('Erreur : ' + (e && e.message || e), true); } }
/* Un fichier à PLUSIEURS HARNESS (un extrait de la base : une machine par harness) : tout est entré dans la base des
   contrats déjà faits ; cette petite fiche demande lequel ouvrir comme contrat — un contrat, c'est un harness —, ou
   aucun. `r` : la lecture (liaisons, harnais). */
function ficheHarnais(r, nom) { const H = r.harnais.map(h => { const L = r.liaisons.filter(l => l.harness === h);
    return { h, n: L.length, dessins: new Set(L.map(l => l.plan).filter(Boolean)).size, appareil: (L.find(l => l.appareil) || {}).appareil || '' }; });
  const corps = tete('Ouvrir « ' + nom + ' »', pluriel(H.length, 'harness') + ' : lequel ouvrir ?', true)
    + `<p class="note">Un contrat, c’est un harness. Les ${H.length} sont gardés comme <b>contrats déjà faits</b> : les fiches diront ce qui a déjà été fait. Celui qu’on ouvre devient le contrat sur la table.</p>`
    + `<ul class="ch-liste" id="choix-harness">${H.map(x => `<li><button class="ch-harness" data-harness="${escA(x.h)}"><b>${esc(x.h)}</b><span>${[pluriel(x.n, 'liaison'), x.dessins ? pluriel(x.dessins, 'dessin') : '', x.appareil].filter(Boolean).map(esc).join(' · ')}</span>${ico('fleche')}</button></li>`).join('')}</ul>`;
  ouvrirFiche({ mode: 'harnais' }, corps, '<button class="btn papier" id="ch-aucun">N’en ouvrir aucun</button>');
  $('fiche-corps').querySelectorAll('.ch-harness').forEach(b => b.onclick = () => { const h = b.dataset.harness, L = r.liaisons.filter(l => l.harness === h);
    chargerContrat(L, 'ouverture de ' + h + ' (' + nom + ')', h + ' (' + nom + ')'); dire(h + ' : ' + L.length + ' liaisons' + (plans().length > 1 ? ' · ' + plans().length + ' folios' : '') + ' — les autres harness restent des contrats déjà faits.'); });
  $('ch-aucun').onclick = () => fermerFiche(true); }
function lierDepot() { let n = 0;
  window.addEventListener('dragenter', e => { e.preventDefault(); n++; document.body.classList.add('depot-actif'); });
  window.addEventListener('dragover', e => { e.preventDefault(); });
  window.addEventListener('dragleave', e => { e.preventDefault(); if (--n <= 0) { n = 0; document.body.classList.remove('depot-actif'); } });
  window.addEventListener('drop', e => { e.preventDefault(); n = 0; document.body.classList.remove('depot-actif');
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) ouvrirFichier(f); }); }

/* ---- sortir le dessin : SVG, PNG, impression -------------------------- */
function nomFolio() { const base = (app.nom || 'atelier-schema').replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_');
  return base + (app.plan !== '*' ? '-folio-' + String(app.plan).replace(/[^\w.-]+/g, '_') : ''); }
/* Un nom de fichier en ASCII : ouvert depuis file://, Chromium remplace par « download » tout nom qui porte un accent,
   une apostrophe ou un tiret cadratin. Les accents tombent, tout le reste devient un tiret. */
const nomAscii = nom => String(nom).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+(?=\.|$)/g, '');
const nomContrat = () => nomAscii((app.nom || 'contrat').replace(/\.[^.]+$/, '')) || 'contrat';
function telecharger(blob, nom) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nomAscii(nom);
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
function svgDuFolio() { return app.dessin ? svgAutonome(app.dessin, app.contrat.cartouche, folioCourant(), designationDe) : null; }
/* Le suivi : tout ce que le contrat pose (barrettes, prises, connecteurs),
   en CSV, pour le garder d'un contrat à l'autre. */
function exporterSuivi() { const L = suiviDuContrat(verite(), app.bible, app.nom || 'contrat', n => app.contrat.designations.get(n) || '');
  if (!L.length) { dire('Rien à suivre : ni barrette, ni prise, ni connecteur dans ce contrat.'); return; }
  telecharger(new Blob(['\ufeff' + csvDuSuivi(L)], { type: 'text/csv;charset=utf-8' }), nomContrat() + '-suivi.csv');
  dire(pluriel(L.length, 'ligne') + ' de suivi enregistrée' + (L.length > 1 ? 's' : '') + '.'); }
function exporterSVG() { const S = svgDuFolio(); if (!S) return; telecharger(new Blob([S.txt], { type: 'image/svg+xml;charset=utf-8' }), nomFolio() + '.svg'); dire('Folio enregistré en SVG.'); }
function exporterPNG() { const S = svgDuFolio(); if (!S) return;
  const k = Math.max(1, Math.min(3, 12e6 / Math.max(1, S.w * S.h))); const img = new Image();
  img.onload = () => { const cv = document.createElement('canvas'); cv.width = Math.round(S.w * k); cv.height = Math.round(S.h * k);
    const g = cv.getContext('2d'); g.fillStyle = '#fbfbf7'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
    cv.toBlob(b => { if (b) { telecharger(b, nomFolio() + '.png'); dire('Folio enregistré en PNG.'); } }, 'image/png'); };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(S.txt); }
/* Imprimer : la planche seule, sur fond blanc, sur un A3 paysage — la
   feuille de tous les folios. */
function imprimer() { if (!app.dessin) return; const S = svgAutonome(app.dessin, app.contrat.cartouche, folioCourant(), designationDe, '#ffffff');
  $('printroot').innerHTML = `<style>@page{size:A3 landscape;margin:8mm}</style>` + S.txt.replace(/^<\?xml[^>]*\?>\s*/, ''); window.print(); }

/* ---- ce que le menu et le rail affichent ------------------------------ */
const TITRE_CARTOUCHE_DEFAUT = nouveauContrat().cartouche.titre, NOM_EXEMPLE = 'Contrat d’exemple';
/* L'en-tête dit QUEL contrat est ouvert : le titre du cartouche si on en a écrit un, sinon le nom du fichier ; et que
   c'est l'exemple embarqué quand c'est lui (à la première ouverture, il s'affiche sans qu'on l'ait demandé). */
function synchroniserContexte() { const n = app.contrat.liaisons.length, P = plans(), nom = n ? (app.nom || 'Sans nom') : 'Aucun contrat', exemple = n && app.nom === NOM_EXEMPLE;
  const sous = n ? (exemple ? 'l’exemple embarqué · ' : '') + `${n} liaison${n > 1 ? 's' : ''} · ${reperesDuContrat().length} repères` + (P.length > 1 ? ` · ${P.length} folios` : '') : '';
  $('ctx-nom').textContent = nom; $('ctx-txt').textContent = sous; $('ctx-nom').title = nom;
  // la barre du haut, si la page en a une : le nom du contrat et ses comptes (l'état est posé par rendreControle)
  const titre = app.contrat.cartouche && app.contrat.cartouche.titre, en = $('en-nom');
  if (en) { en.textContent = n ? (titre && titre !== TITRE_CARTOUCHE_DEFAUT ? titre : nom) : 'Atelier Schéma'; en.title = en.textContent; const es = $('en-sous'); if (es) { es.textContent = sous; es.title = sous; } }
  // l'accueil : « reprendre » si le dernier geste a vidé la table
  const rep = $('vd-reprendre'); if (rep) { const d = app.hist[app.hist.length - 1]; rep.hidden = !(!n && d && d.liaisons && d.liaisons.length); if (!rep.hidden) rep.textContent = d.nom ? 'Reprendre « ' + d.nom + ' »' : 'Reprendre le contrat'; }
  if (typeof rendreAccueil === 'function') rendreAccueil(); }
/* Annuler reste à sa place, éteint quand il n'y a rien à annuler ; sa bulle
   dit ce qu'il déferait. */
function synchroniserHistorique() { const b = $('btnUndo'), d = app.hist[app.hist.length - 1]; b.disabled = !d;
  const quoi = d ? 'Annuler : ' + d.quoi : 'Annuler';
  b.setAttribute('aria-label', quoi + ' (Ctrl+Z)'); b.querySelector('.bulle').innerHTML = esc(quoi) + '<kbd>Ctrl+Z</kbd>'; }
function synchroniser() { synchroniserContexte(); synchroniserFolios(); synchroniserHistorique(); synchroniserRetouche(); rendreControle(); rafraichirBase(); rafraichirCarte(); montrerAttente(); }
let toastT = null;
function dire(msg, erreur) { const t = $('toast'); t.textContent = msg; t.classList.toggle('erreur', !!erreur); t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), erreur ? 6000 : 2800); }
function ouvrirMenu() { $('menu').hidden = false; $('btnMenu').setAttribute('aria-expanded', 'true'); const b = $('menu').querySelector('button[role="menuitem"]'); if (b) b.focus(); }
function fermerMenu() { $('menu').hidden = true; $('btnMenu').setAttribute('aria-expanded', 'false'); }
/* Depuis le rail : la base s'ouvre s'il le faut, la ligne se prépare sous
   l'équipement choisi. */
function nouvelleLiaison() { if (!app.base.ouvert) ouvrirBase(); ajouterLiaison(app.cible && app.cible.type === 'bloc' ? app.cible.nom : ''); }
function basculerBible() { if (app.fiche && app.fiche.mode === 'bible') fermerFiche(true); else ficheBible(); }

/* ---- tout relier -------------------------------------------------------- */
function lierPanneau() {
  const o = (id, fn) => { const e = $(id); if (e) e.onclick = fn; };
  const choisirFichier = () => $('fichier').click();
  const exemple = () => { chargerContrat(contratExemple(), 'contrat d’exemple', 'Contrat d’exemple'); app.contrat.charges = chargesExemple(); synchroniser(); sauver(); };
  $('fichier').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) ouvrirFichier(f); e.target.value = ''; });
  $('fichier-bible').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) importerBible(f); e.target.value = ''; });
  o('vd-ouvrir', choisirFichier); o('vd-coller', ficheColler); o('vd-exemple', exemple); o('vd-reprendre', () => { const q = annuler(); if (q) dire('Repris : ' + q + '.'); });
  o('btnBase', basculerBase); o('btnIndex', basculerIndex); o('btnCherche', () => { if (rechercheOuverte()) fermerRecherche(); else ouvrirRecherche(); });
  o('btnLiaison', nouvelleLiaison); o('btnBible', basculerBible); o('btnOuvrir', choisirFichier);
  o('btnMenu', e => { e.stopPropagation(); $('menu').hidden ? ouvrirMenu() : fermerMenu(); });
  const actions = { ouvrir: choisirFichier, coller: ficheColler, exemple, cartouche: ficheCartouche, bible: ficheBible, normes: () => ficheNormes(), hypotheses: ficheHypotheses, nomenclature: ficheNomenclature, suivi: exporterSuivi, svg: exporterSVG, png: exporterPNG, imprimer,
    // tout effacer : la table vide (l'accueil), et un contrat neuf — les choix de celui-ci ne survivent pas (Ctrl+Z, ou « Reprendre », rend tout)
    vider: () => { if (!confirm('Effacer tout le contrat ?')) return; histPush('tout effacer'); app.contrat = contratNeuf(); app.source = null; app.nFolios = 0; app.plan = '*'; app.nom = ''; app.cible = null; app.choisi = null;
      fermerFiche(); fermerInspecteur(); fermerBase(); redessiner(); ajuster(); sauver(); } };
  $('menu').addEventListener('click', e => { const b = e.target.closest('button[data-act]'); if (!b) return; fermerMenu(); actions[b.dataset.act](); });
  document.addEventListener('click', e => { if (!e.target.closest('#menuBoite')) fermerMenu(); });
  o('btnUndo', () => { const q = annuler(); if (q) dire('Annulé : ' + q + '.'); });
  o('btnAuto', revenirAutomatique);
  o('fo-prev', () => allerAuFolio(-1)); o('fo-next', () => allerAuFolio(+1));
  const strip = $('fo-strip'); strip.addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) allerAuPlan(c.dataset.plan); });
  // le nom entier d'un folio, dans la bulle de la planche (pas l'infobulle du système) : une bulle pour toute la bande,
  // posée au-dessus de la puce survolée — dans la puce, elle serait rognée par la bande qui défile
  const bulle = document.createElement('span'); bulle.className = 'bulle fo-bulle'; bulle.setAttribute('aria-hidden', 'true'); $('folios').appendChild(bulle);
  let tempo = 0; const cacher = () => { clearTimeout(tempo); bulle.classList.remove('on'); };
  strip.addEventListener('pointerover', e => { const c = e.target.closest('.chip'); if (!c || e.pointerType === 'touch') return; clearTimeout(tempo);
    tempo = setTimeout(() => { const r = c.getBoundingClientRect(), f = $('folios').getBoundingClientRect(); bulle.textContent = c.dataset.nom;
      bulle.style.left = Math.max(4, Math.min(r.left + r.width / 2 - f.left, f.width - 4)) + 'px'; bulle.classList.add('on'); }, bulle.classList.contains('on') ? 0 : 450); });
  strip.addEventListener('pointerleave', cacher); strip.addEventListener('scroll', cacher, { passive: true });
  // la bande des folios défile à la molette (elle n'a pas de barre), la liste déroulante y va d'un choix
  strip.addEventListener('wheel', e => { if (!e.deltaY || e.deltaX || strip.scrollWidth <= strip.clientWidth) return; e.preventDefault(); strip.scrollLeft += e.deltaY; }, { passive: false });
  const sel = $('fo-select'); if (sel) sel.addEventListener('change', () => allerAuPlan(sel.value));
  // au téléphone, la bande des folios se pose au-dessus de l'inspecteur : sa hauteur (celle de la fiche ouverte) se dit au style par le jeton --insp-h
  const insp = $('inspecteur'); if (window.ResizeObserver) new ResizeObserver(() => document.documentElement.style.setProperty('--insp-h', (insp.hidden ? 0 : insp.offsetHeight) + 'px')).observe(insp);
  o('zin', () => zoomer(1.25)); o('zout', () => zoomer(1 / 1.25)); o('zfit', () => ajuster(true)); o('zlbl', () => ajuster(true));
  lierRecherche(); lierDepot(); lierBase(); lierControle();
  window.addEventListener('keydown', e => {
    // la vue en relief ouverte : Échap la ferme, le reste lui appartient
    if (!$('relief').hidden) { if (e.key === 'Escape') fermerRelief(); return; }
    const dansChamp = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '');
    if (e.key === 'Escape') { if (!$('menu').hidden) { fermerMenu(); $('btnMenu').focus(); } else if (rechercheOuverte()) { fermerRecherche(); $('q').blur(); }
      else if (dansChamp) e.target.blur();   // dans un champ, Échap ne fait que le quitter
      else if (app.fiche) fermerFiche(true); else if (app.cible || !$('inspecteur').hidden) deselectionner(); else fermerBase(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !dansChamp) { e.preventDefault(); const q = annuler(); if (q) dire('Annulé : ' + q + '.'); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') { e.preventDefault(); imprimer(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); choisirFichier(); return; }
    if (dansChamp || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '/') { e.preventDefault(); ouvrirRecherche(); }
    else if (e.key === 'b') basculerBase();
    else if (e.key === 'r') { e.preventDefault(); basculerIndex(); }   // sinon le « r » s'écrit dans le champ de l'index qui vient de prendre le focus
    else if (e.key === 'n') { if (app.fiche && app.fiche.mode === 'nomenclature') fermerFiche(true); else if (verite().length) ficheNomenclature(); }
    else if (e.key === 'ArrowLeft') allerAuFolio(-1); else if (e.key === 'ArrowRight') allerAuFolio(+1);
    else if (e.key === '+' || e.key === '=') zoomer(1.25); else if (e.key === '-') zoomer(1 / 1.25); else if (e.key === '0' || e.key === 'f') ajuster(true); });
  let rT; window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { if (telephone()) ajuster(); else appliquerVue();
    rafraichirCarte(); if (app.fiche && app.fiche.mode === 'bible' && app.fiche.ref) ficheBible(app.fiche.ref); }, 160); });
  window.addEventListener('orientationchange', () => setTimeout(() => ajuster(), 300));
}
