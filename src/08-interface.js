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
   app.base         le récapitulatif (08-recap), en moitié en bas ou en page :
                    ouvert ou non, son onglet, ce qu'il montre (ce folio ou
                    tout), sa recherche, son tri
   app.cible        ce qui est choisi : un bloc { type:'bloc', nom } ou un fil
                    { type:'fil', l } — allumé sur le plan, sa fiche dans
                    l'inspecteur, sa ligne marquée dans le tableau
   app.actif        la liaison dont on écrit une cellule : son fil s'allume
   app.bible        la bible des barrettes en cours, et son nom (bibleNom)
   app.norme        la norme en cours (familles, fils, déclassements, réseau)
                    et son nom (normeNom) ; app.simu : les hypothèses de la
                    simulation (longueur, courant, tension, conditions)
   Le plan d'abord. Un clic sur un bloc ou un fil ouvre sa FICHE dans
   l'INSPECTEUR, à droite (08 bis) ; le RÉCAPITULATIF, en bas (B) ou en page
   (Maj+B), est le contrat en onglets : on le corrige, le plan suit. Le plan se recadre
   à côté de l'un, au-dessus de l'autre, jamais dessous. Les documents rares
   (cartouche, collage, bible) s'ouvrent dans une fiche à part.
   Les commandes sont dans la barre de gauche (le rail) ; le menu ⋮, en haut
   à droite, porte en peu de lignes ce qu'on fait une fois (ouvrir, vos
   fichiers, exporter…) et dit ce qui est ouvert.
   =========================================================================== */
'use strict';

const app = {
  contrat: nouveauContrat(), source: null, nFolios: 0, budget: 16, plan: '*', nom: '',
  vue: { s: 1, tx: 0, ty: 0 }, choisi: null, cible: null, actif: null, dessin: null, hist: [], fiche: null,
  bible: [], bibleNom: '', norme: null, normeNom: '', simu: null,   // simu : les hypothèses, posées au démarrage (relireSimu)
  base: { ouvert: false, portee: 'folio', filtre: '', filtreAuto: false, tri: null, hauteur: 0, sale: true, defiler: false, enSaisie: false, choixOuvert: false, normeOuverte: false },
  retouches: new Map(),  // folio (sa clé de placement) -> le dessin retouché à la souris (la retouche)
  // l'inspecteur : ouvert sur l'INDEX des repères (une fiche venue de lui y revient par ‹), ce qu'on y cherche, le champ
  // « ajouter » ouvert ; la PILE des fiches vues (30 au plus) et celle qu'on regarde (08 bis, la navigation ‹ ›)
  insp: { index: false, filtre: '', ajout: false, pile: [], pos: -1 }
};
const $ = id => document.getElementById(id);
/* ce qui est choisi, en un mot : la clé d'un objet (un bloc par son repère, un fil par son numéro) */
const cleDeCible = () => !app.cible ? '' : app.cible.type === 'fil' ? 'fil:' + (app.cible.l && app.cible.l.cable || '') : 'bloc:' + app.cible.nom;
/* La typographie française, une fois pour toutes, sur le texte affiché : une espace insécable avant « ; : ? ! » et le
   guillemet fermant, après l'ouvrant ; l'apostrophe courbe. Aucun signe ne tombe seul en début de ligne, quel que soit
   le texte (le nôtre, celui d'une table de normes, d'un retest). Jamais dans le dessin des folios (svg) ni dans un champ :
   ce qu'on y lit reste ce qu'on y a écrit. Un observateur la pose sur ce qui s'ajoute ou change. */
const TYPO_HORS = 'svg,script,style,textarea,input,select,code,pre,[contenteditable]';
const typo = t => t.replace(/ ([:;?!»])/g, '\u00a0$1').replace(/« /g, '«\u00a0').replace(/([A-Za-zÀ-ÿ])'(?=[A-Za-zÀ-ÿ])/g, '$1’');
function typographier(n) {
  if (n.nodeType === 3) { const el = n.parentElement; if (!el || el.closest(TYPO_HORS)) return; const t = typo(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; return; }
  if (n.nodeType !== 1 || n.closest(TYPO_HORS)) return;
  const w = document.createTreeWalker(n, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, { acceptNode: x => x.nodeType === 1 ? (x.matches(TYPO_HORS) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP) : NodeFilter.FILTER_ACCEPT });
  for (let x; (x = w.nextNode());) { const t = typo(x.nodeValue); if (t !== x.nodeValue) x.nodeValue = t; } }
function typographieVivante() { typographier(document.body);
  new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') typographier(m.target); else m.addedNodes.forEach(typographier); } })
    .observe(document.body, { childList: true, subtree: true, characterData: true }); }
const CLE_CONTRAT = 'atelier.contrat.v2';
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
   prend et glisse OÙ L'ON VEUT, en x comme en y : il suit la souris au pas du CARREAU de la feuille (le quadrillage fin
   du papier), et Alt le laisse libre. Des AIMANTS, pas des rails : la hauteur où un de ses fils devient droit (dans
   toutes les colonnes), un bord aligné sur celui d'un voisin (haut, bas ; gauche, droite, milieu), sa colonne de bornes
   contre la paroi d'une goulotte — un guide fin pointillé le montre. Les colonnes se relisent sur les blocs posés (05,
   `preparerPose`) : le bloc rejoint une colonne, l'élargit, ou en devient une à lui ; les colonnes voisines s'écartent
   quand il mord sur une goulotte. Ses masses collées le suivent, ses fils se reroutent en direct.
   Pendant le geste, un FANTÔME du contour est à la place visée, rouge quand elle est prise (sur un bloc, ou à côté d'un
   bloc de la colonne, à sa hauteur) ; le bloc, lui, est déjà à la place libre la plus proche, où il tombera, et le mot
   le dit quand on lâche (« 101BT1 posé 64 px plus haut : la place était prise »). Un bloc choisi se pousse aux
   flèches, d'un carreau (Maj : cinq). Lâché, le folio est RETOUCHÉ : l'automatique ne repasse plus dessus (rien ne
   bouge sans qu'on l'ait voulu) ; son dessin se garde dans ce navigateur (IndexedDB), Ctrl+Z défait le geste,
   « Dessin retouché · rendre au moteur » rend la main au moteur. Au doigt, un appui long prend le bloc (un glissé
   simple déplace la vue). */
const PAS_PAPIER = 25;   // le carreau du papier (06, le motif `gfine`), en unités de la feuille : × k en unités du dessin
const surLeBloc = (c, nom, e) => String(nom) === String(c.name) && e.x >= c.x - 1 && e.x <= c.x + c.w + 1 && e.y >= c.y - 1 && e.y <= c.y + c.h + 1;
/* Prendre un bloc du dessin P (un geste à la souris, une poussée aux flèches) : la pose préparée par le moteur, le carreau,
   ce que la feuille laisse au bloc, ses aimants. La feuille : sa zone utile (cartouche ôté) au début du geste, et de quoi
   en sortir de la taille du bloc — le dessin grandit, la feuille se recale dessus ; plus loin, il se perdrait. */
function preparerPrise(P, c) { const pose = preparerPose(P, c), bb = (app.dessin && app.dessin.bbox) || null, k = (bb && bb.k) || 1, [flo, fhi] = pose.etendue;
  const m = (PAGE_CADRE + PAGE_MARGE) * k, lx = fhi - flo, ly = c.h;
  const bornes = bb ? { x0: Math.min(0, bb.x + m - lx - flo), x1: Math.max(0, bb.x + bb.w - m + lx - fhi), y0: Math.min(0, bb.y + m - ly - c.y), y1: Math.max(0, bb.y + bb.h - (m + PAGE_CARTOUCHE * k) + ly - (c.y + c.h)) }
    : { x0: -Infinity, x1: Infinity, y0: -Infinity, y1: Infinity };
  return { P, c, pose, pas: PAS_PAPIER * k, bornes, aimants: aimantsDuBloc(P, c, pose) }; }
// une pose juste : sur la feuille, et acceptée par le moteur (ni sur un bloc, ni à côté d'un bloc de sa colonne)
const poseJuste = (pr, dx, dy) => { const B = pr.bornes;
  return dx >= B.x0 - 0.01 && dx <= B.x1 + 0.01 && dy >= B.y0 - 0.01 && dy <= B.y1 + 0.01 && !pr.pose.examiner(dx, dy).refus; };
/* La place libre la plus proche de la visée (dx, dy), ramenée sur la feuille : la visée elle-même si elle est juste ;
   sinon, parmi les places qui comptent — contre chaque voisin (à ECART_RETOUCHE), dans chaque colonne, juste à côté ou
   la mordant d'une goulotte au plus (05), au bord de la feuille —, la plus proche ; à défaut, là où il était. */
function placeLibre(pr, dx, dy) { const B = pr.bornes, c = pr.c, [flo, fhi] = pr.pose.etendue, g = pr.P.geom, E = ECART_RETOUCHE, dx0 = dx, dy0 = dy;
  dx = Math.max(B.x0, Math.min(B.x1, dx)); dy = Math.max(B.y0, Math.min(B.y1, dy));
  // pourquoi il n'est pas où l'on vise : la feuille s'arrête avant, ou la place est prise
  const feuille = Math.abs(dx - dx0) > 0.01 || Math.abs(dy - dy0) > 0.01;
  if ((!dx && !dy) || poseJuste(pr, dx, dy)) return { dx, dy, pourquoi: feuille ? 'feuille' : null };
  const xs = new Set([dx, 0, B.x0, B.x1]), ys = new Set([dy, 0, B.y0, B.y1]);
  g.colX.forEach((a, k) => { const z = a + g.colW[k]; xs.add(a - fhi - 1); xs.add(z - flo + 1); xs.add(a + GOULOTTE_MIN - fhi - 0.5); xs.add(z - GOULOTTE_MIN - flo + 0.5);
    if (z - a >= fhi - flo) { xs.add(a - flo); xs.add(z - fhi); xs.add(Math.max(a - flo, Math.min(z - fhi, dx))); } });
  pr.P.comps.forEach(o => { if (o.kind === 'tag' || o === c) return;
    xs.add(o.x - E - (c.x + c.w)); xs.add(o.x + o.w + E - c.x); ys.add(o.y - E - (c.y + c.h)); ys.add(o.y + o.h + E - c.y); });
  const cands = [];
  xs.forEach(x => { if (x < B.x0 - 0.01 || x > B.x1 + 0.01) return; ys.forEach(y => { if (y >= B.y0 - 0.01 && y <= B.y1 + 0.01) cands.push([x, y, (x - dx) * (x - dx) + (y - dy) * (y - dy)]); }); });
  cands.sort((u, v) => u[2] - v[2]);
  for (const [x, y] of cands) if ((!x && !y) || !pr.pose.examiner(x, y).refus) return { dx: x, dy: y, pourquoi: 'prise' };
  return { dx: 0, dy: 0, pourquoi: 'prise' }; }
/* Les AIMANTS du bloc : les décalages où un de ses fils devient droit (l'autre bout sur un bloc qui ne bouge pas, dans
   n'importe quelle colonne), où un de ses bords s'aligne sur celui d'un voisin, où sa colonne de bornes vient contre la
   paroi d'une goulotte. Chacun sait tracer son guide pour une pose (dx, dy). */
function aimantsDuBloc(P, c, pose) { const x = [], y = [], suit = new Set([c, ...pose.tags]), [flo, fhi] = pose.etendue;
  const H = (Y, o) => dx => ({ x1: Math.min(o.x, c.x + dx) - 6, y1: Y, x2: Math.max(o.x + o.w, c.x + dx + c.w) + 6, y2: Y });
  const V = (X, o) => (dx, dy) => ({ x1: X, y1: Math.min(o.y, c.y + dy) - 6, x2: X, y2: Math.max(o.y + o.h, c.y + dy + c.h) + 6 });
  P.links.forEach(l => { if (l.shunt || l.boucle || !l.epA || !l.epB) return;
    [[l.de, l.epA, l.vers, l.epB], [l.vers, l.epB, l.de, l.epA]].forEach(([n, e, n2, e2]) => { if (!surLeBloc(c, n, e)) return;
      const autre = P.comps.find(k => surLeBloc(k, n2, e2)); if (!autre || suit.has(autre)) return;
      y.push({ d: e2.y - e.y, fort: true, guide: dx => ({ x1: e.x + dx, y1: e2.y, x2: e2.x, y2: e2.y }) }); }); });
  P.comps.forEach(o => { if (o.kind === 'tag' || suit.has(o)) return;
    y.push({ d: o.y - c.y, guide: H(o.y, o) }, { d: o.y + o.h - c.y - c.h, guide: H(o.y + o.h, o) });
    x.push({ d: o.x - c.x, guide: V(o.x, o) }, { d: o.x + o.w - c.x - c.w, guide: V(o.x + o.w, o) }, { d: o.x + o.w / 2 - c.x - c.w / 2, guide: V(o.x + o.w / 2, o) }); });
  const g = P.geom; if (g && g.colX) g.colX.forEach((a, k) => { const z = a + g.colW[k], paroi = X => () => ({ x1: X, y1: g.yMin - 12, x2: X, y2: g.yMax + 12 });
    x.push({ d: a - flo, guide: paroi(a) }, { d: z - fhi, guide: paroi(z) }); });
  return { x, y }; }
// le dessin avec le bloc déplacé de (dx, dy), ses pastilles avec lui, les colonnes relues et rerouté (05) ; nul si la pose est refusée
function deplacerBloc(P, c, dx, dy, pose) { const r = (pose || preparerPose(P, c)).poser(dx, dy); if (r.refus) return null;
  const compDe = new Map(); r.comps.forEach(k => { if (k.id != null) compDe.set(k.id, k); if (!compDe.has(k.name)) compDe.set(k.name, k); });
  return { ...P, comps: r.comps, links: r.links, geom: r.geom, compDe, routage: r.routage, retouche: true, poussee: r.poussee }; }
// la retouche se garde (IndexedDB) ; une clé sans retouche s'efface
function garderRetouche(cle) { const P = app.retouches.get(cle);
  ouvrirIDB().then(db => { const st = db.transaction(IDB_RETOUCHES, 'readwrite').objectStore(IDB_RETOUCHES); if (P) st.put({ P, t: Date.now() }, cle); else st.delete(cle); }).catch(() => { }); }
function relireRetouches() { ouvrirIDB().then(db => { const req = db.transaction(IDB_RETOUCHES, 'readonly').objectStore(IDB_RETOUCHES).openCursor(); let vu = false;
  req.onsuccess = () => { const c = req.result; if (!c) { if (vu) rafraichirDessin(); return; } if (c.value && c.value.P && !app.retouches.has(String(c.key))) { app.retouches.set(String(c.key), c.value.P); vu = true; } c.continue(); }; }).catch(() => { }); }
function revenirAutomatique() { const cle = cleCourante(); if (!cle || !app.retouches.has(cle)) return;
  histPush('retouche de ce folio'); app.retouches.delete(cle); garderRetouche(cle); rafraichirDessin(); dire('Le moteur reprend la main : dessin automatique rétabli · Ctrl+Z pour retrouver vos retouches.'); }
/* Le bouton du bas, sur un folio retouché : il dit ce qu'il fait — rendre le dessin au moteur — et sa bulle, que les
   retouches de ce folio se gardent dans ce navigateur. */
const MOT_RETOUCHE = 'Dessin retouché · rendre au moteur', BULLE_RETOUCHE = 'Les retouches de ce folio se gardent dans ce navigateur · revenir au dessin du moteur';
function synchroniserRetouche() { const b = $('btnAuto'); if (!b) return; const cle = cleCourante(); b.hidden = !(cle && app.retouches.has(cle));
  const mot = b.querySelector('span:not(.bulle)'), bulle = b.querySelector('.bulle');
  if (mot && mot.textContent !== MOT_RETOUCHE) mot.textContent = MOT_RETOUCHE;
  if (bulle && bulle.textContent !== BULLE_RETOUCHE) bulle.textContent = BULLE_RETOUCHE;
  if (b.getAttribute('aria-label') !== MOT_RETOUCHE) b.setAttribute('aria-label', MOT_RETOUCHE); }
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
    + sceneSvg(app.dessin, app.contrat.cartouche, folioCourant(), designationDe, app.choisi, n => ({ calibre: calibreNominal(n) })) + '</g>';
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
     un appui long le prend, un glissé simple déplace la vue. `prise` : le bloc, le point de départ ; le geste commencé,
     la prise préparée (`preparerPrise`), le dessin d'avant, la visée (`vise`) et la place où il tombe (dx, dy) */
  let prise = null, long = null, image = 0, dernierBloc = null, dernierAppui = null, clavier = null, dernierPris = null;
  const prenable = c => c && c.kind !== 'tag' && !c.rail && !estRenvoi(c.name);
  const commencerPrise = () => { const L = liaisonsDuPlan(), cle = L.length ? clePlacement(L) : null; if (!cle) return false;
    const P = placementDe(L), c = (P && P.comps.find(k => k === prise.c)) || null; if (!c) return false;
    Object.assign(prise, preparerPrise(P, c), { cle, avant: app.retouches.get(cle) || null, dx: 0, dy: 0, vise: null, poussee: 0, pourquoi: null });
    const mot = $('toast'); if (mot) mot.classList.remove('on');   // le mot du geste d'avant s'en va : celui-ci aura le sien, s'il bouge
    histPush('déplacer ' + c.name); mode = 'bloc'; stage.classList.add('deplace'); eteindre(); return true; };
  // la visée : la souris au pas du carreau, ou sur l'aimant à portée (un fil droit d'abord) ; Alt : libre, au demi-point
  const viser = (rx, ry, libre) => { if (libre) return { dx: Math.round(rx * 2) / 2, dy: Math.round(ry * 2) / 2 };
    const tol = Math.max(2, Math.min(20, 7 / app.vue.s)), A = prise.aimants, pas = prise.pas;
    const proche = (L, v) => { const pres = L.filter(a => Math.abs(a.d - v) <= tol); if (!pres.length) return null; const forts = pres.filter(a => a.fort);
      return (forts.length ? forts : pres).reduce((m, a) => Math.abs(a.d - v) < Math.abs(m.d - v) ? a : m); };
    const ax = proche(A.x, rx), ay = proche(A.y, ry);
    return { dx: ax ? ax.d : Math.round(rx / pas) * pas, dy: ay ? ay.d : Math.round(ry / pas) * pas }; };
  // le dessin du geste : le bloc où il tombe, rerouté ; revenu à sa place, le dessin d'avant
  const poserPrise = () => { const { cle, P, c, dx, dy } = prise;
    if (!dx && !dy) { if (prise.avant) app.retouches.set(cle, prise.avant); else app.retouches.delete(cle); prise.poussee = 0; return; }
    const P2 = deplacerBloc(P, c, dx, dy, prise.pose); if (P2) { app.retouches.set(cle, P2); prise.poussee = P2.poussee || 0; } };
  /* le CALQUE du geste, par-dessus le dessin : le fantôme du contour à la place visée (à l’encre ; rouge quand elle est prise,
     et alors le contour plein de la place où il tombe), les guides des aimants que la pose touche. Les épaisseurs se
     tiennent à l'écran, quelle que soit l'échelle. */
  const calque = () => { const sc = $('scene'); if (!sc || !prise || mode !== 'bloc' || !prise.vise) return;
    let g = sc.querySelector('#rt-calque'); if (!g) { g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.id = 'rt-calque'; g.setAttribute('class', 'rt-calque'); sc.appendChild(g); }
    const u = 1 / app.vue.s, c = prise.c, v = prise.vise, m = 3 * u, pris = Math.abs(v.dx - prise.dx) > 0.01 || Math.abs(v.dy - prise.dy) > 0.01, n = x => x.toFixed(3);
    const cadreDe = (cls, dx, dy, tirets) => `<rect class="${cls}" x="${f1(c.x + dx - m)}" y="${f1(c.y + dy - m)}" width="${f1(c.w + 2 * m)}" height="${f1(c.h + 2 * m)}" rx="${n(2 * u)}" stroke-width="${n(1.5 * u)}"${tirets ? ` stroke-dasharray="${n(5 * u)} ${n(3 * u)}"` : ''}/>`;
    // les guides : un trait par ligne d'alignement (deux aimants sur la même ligne n'en font qu'un, d'un bout à l'autre)
    let h = ''; const lignes = new Map();
    [['x', prise.dx], ['y', prise.dy]].forEach(([axe, d]) => prise.aimants[axe].forEach(a => { if (Math.abs(a.d - d) > 0.26) return;
      const t = a.guide(prise.dx, prise.dy), vert = Math.abs(t.x1 - t.x2) < 0.01, k = (vert ? 'x' : 'y') + Math.round((vert ? t.x1 : t.y1) * 2), l = lignes.get(k);
      if (!l) { lignes.set(k, { ...t }); return; }
      if (vert) { l.y1 = Math.min(l.y1, t.y1, t.y2); l.y2 = Math.max(l.y2, t.y1, t.y2); } else { l.x1 = Math.min(l.x1, t.x1, t.x2); l.x2 = Math.max(l.x2, t.x1, t.x2); } }));
    lignes.forEach(t => { h += `<line class="rt-guide" x1="${f1(t.x1)}" y1="${f1(t.y1)}" x2="${f1(t.x2)}" y2="${f1(t.y2)}" stroke-width="${n(u)}" stroke-dasharray="${n(4 * u)} ${n(3 * u)}"/>`; });
    if (pris) h += cadreDe('rt-pose', prise.dx, prise.dy, false);
    h += cadreDe('rt-fantome' + (pris ? ' pris' : ''), v.dx, v.dy, true);
    g.innerHTML = h; g.dataset.pris = pris ? '1' : ''; };
  const suitPrise = e => { prise.souris = { clientX: e.clientX, clientY: e.clientY };
    const w = versMonde(e.clientX, e.clientY), v = viser(w.x - prise.wx, w.y - prise.wy, !!e.altKey), p = placeLibre(prise, v.dx, v.dy);
    prise.vise = v; prise.pourquoi = p.pourquoi;
    if (p.dx === prise.dx && p.dy === prise.dy) { calque(); return; }
    prise.dx = p.dx; prise.dy = p.dy;
    cancelAnimationFrame(image); image = requestAnimationFrame(() => { if (!prise || mode !== 'bloc') return; poserPrise(); calculer(); peindre(); calque(); }); };
  // Alt pressé ou lâché pendant le geste : la visée se refait sur place
  const altPendant = e => { if (e.key !== 'Alt' || mode !== 'bloc' || !prise || !prise.souris) return; e.preventDefault(); suitPrise({ ...prise.souris, altKey: e.type === 'keydown' }); };
  window.addEventListener('keydown', altPendant); window.addEventListener('keyup', altPendant);
  // le geste abandonné (Échap, un second doigt) : le dessin d'avant revient, l'historique n'en garde rien
  const annulerPrise = () => { if (mode !== 'bloc' || !prise) return; cancelAnimationFrame(image); stage.classList.remove('deplace');
    if (prise.avant) app.retouches.set(prise.cle, prise.avant); else app.retouches.delete(prise.cle); app.hist.pop(); synchroniserHistorique();
    calculer(); peindre(); synchroniser(); rallumer(); prise = null; mode = null; };
  window.addEventListener('keydown', e => { if (e.key !== 'Escape' || mode !== 'bloc') return; e.preventDefault(); e.stopPropagation(); annulerPrise(); }, true);
  // l'écart entre la visée et la place, en pixels d'écran et en mots
  const ecartDit = (ex, ey) => { const px = v => Math.round(Math.abs(v) * app.vue.s), mots = [];
    if (px(ex)) mots.push(px(ex) + ' px plus à ' + (ex > 0 ? 'droite' : 'gauche')); if (px(ey)) mots.push(px(ey) + ' px plus ' + (ey > 0 ? 'bas' : 'haut'));
    return mots.join(' et '); };
  /* lâché : un mot seulement si le bloc a bougé — déplacé, ou posé ailleurs que visé (et pourquoi) — ou si la place visée
     était prise et qu'il reste où il était */
  const finPrise = () => { cancelAnimationFrame(image); stage.classList.remove('deplace');
    const { c, dx, dy, vise, cle } = prise, feuille = prise.pourquoi === 'feuille';
    if (!dx && !dy) { if (prise.avant) app.retouches.set(cle, prise.avant); else app.retouches.delete(cle); app.hist.pop(); synchroniserHistorique();
      if (vise && (vise.dx || vise.dy)) dire((feuille ? 'La feuille s’arrête là : ' : 'Pas de place ici : ') + c.name + ' reste où il était.'); }
    else { poserPrise(); garderRetouche(cle); dernierPris = { nom: c.name, x: c.x + dx, y: c.y + dy };
      const ecart = vise ? ecartDit(dx - vise.dx, dy - vise.dy) : '', pousse = Math.round((prise.poussee || 0) * app.vue.s);
      dire(ecart ? c.name + ' posé ' + ecart + (feuille ? ' : la feuille s’arrête là.' : ' : la place était prise.')
        : c.name + ' déplacé' + (pousse ? ' · les colonnes voisines s’écartent de ' + pousse + ' px' : '') + ' · Ctrl+Z pour défaire.'); }
    calculer(); peindre(); synchroniser(); rallumer(); prise = null; };
  /* Un bloc CHOISI se pousse aux flèches : d'un carreau, de cinq avec Maj — à la place exacte, ou pas du tout (le mot dit
     pourquoi). Une série de poussées sur le même bloc fait une seule entrée d'historique. Les flèches gauche et droite
     changent de folio quand aucun bloc n'est choisi (lierPanneau) : ce gardien, posé avant, passe la main. */
  const blocChoisi = () => { const ci = app.cible; if (!ci || ci.type !== 'bloc' || !app.dessin || String(app.choisi) !== String(ci.nom)) return null;
    const cs = app.dessin.comps.filter(k => String(k.name) === String(ci.nom) && prenable(k)); if (cs.length < 2 || !dernierPris || dernierPris.nom !== ci.nom) return cs[0] || null;
    const loin = k => Math.hypot(k.x - dernierPris.x, k.y - dernierPris.y); return cs.reduce((a, k) => loin(k) < loin(a) ? k : a); };
  const pousser = (c, nx, ny) => { const L = liaisonsDuPlan(), cle = L.length ? clePlacement(L) : null; if (!cle) return;
    const P = placementDe(L); if (!P || !P.comps.includes(c)) return;
    const pr = preparerPrise(P, c), dx = nx * pr.pas, dy = ny * pr.pas;
    if (!poseJuste(pr, dx, dy)) { dire('Pas de place ' + (nx < 0 ? 'à gauche' : nx > 0 ? 'à droite' : ny < 0 ? 'au-dessus' : 'au-dessous') + ' : ' + c.name + ' reste où il était.'); return; }
    const t = Date.now(), suite = !!clavier && clavier.cle === cle && clavier.nom === c.name && t - clavier.t < 1500 && app.hist.length === clavier.n;
    if (!suite) histPush('pousser ' + c.name);
    const P2 = deplacerBloc(P, c, dx, dy, pr.pose); if (!P2) return;
    app.retouches.set(cle, P2); garderRetouche(cle); clavier = { cle, nom: c.name, t, n: app.hist.length }; dernierPris = { nom: c.name, x: c.x + dx, y: c.y + dy };
    calculer(); peindre(); synchroniser(); rallumer();
    if (!suite) dire(c.name + ' poussé d’un carreau · Maj : cinq carreaux · Ctrl+Z pour défaire.'); };
  window.addEventListener('keydown', e => { const sens = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!sens || e.ctrlKey || e.metaKey || e.altKey || mode || pointeurs.size || !$('relief').hidden) return;
    const t = e.target; if (t && t.closest && t.closest('input,textarea,select,[contenteditable],[role="listbox"],[role="menu"],#menu')) return;
    const c = blocChoisi(); if (!c) return;
    e.preventDefault(); e.stopPropagation(); const k = e.shiftKey ? 5 : 1; pousser(c, sens[0] * k, sens[1] * k); }, true);
  // l'ACCUEIL (#vide) vit sur la planche : un appui qui en part est un clic sur ses boutons, pas une prise de la vue — ni
  // capture du pointeur (elle volerait le « click » au bouton), ni pan
  const surLAccueil = e => !!(e.target && e.target.closest && e.target.closest('#vide'));
  stage.addEventListener('pointerdown', e => { if (e.button && e.button !== 0) return; fermerMenu(); fermerRecherche(); if (surLAccueil(e)) return;
    try { stage.setPointerCapture(e.pointerId); } catch (_) { }
    stage.classList.add('appui');   // pendant l'appui, le texte du folio ne se sélectionne pas
    pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY }); clearTimeout(long);
    if (pointeurs.size >= 2) { annulerPrise(); prise = null; debutPinch(); return; }
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
    const etaitPinch = mode === 'pinch'; pointeurs.delete(e.pointerId); if (!pointeurs.size) stage.classList.remove('appui');
    if (prise && prise.c && !bouge) dernierPris = { nom: prise.c.name, x: prise.c.x, y: prise.c.y };   // le morceau cliqué (une barrette en a plusieurs) : les flèches le poussent
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
/* Le rail dit ce qui est ouvert : l'outil dont le panneau est là se marque pressé (dans un carré gris). */
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
  // la fiche qu'on y a laissée : ‹ la rouvre (Alt+←), à la même place
  const I = typeof pileInsp === 'function' ? pileInsp() : null, laissee = I && I.pile[I.pos];
  box.innerHTML = `<header class="ix-tete">${laissee ? `<button class="fi-pas" id="fi-prec" aria-label="${escA('Revenir à ' + nomDEntree(laissee) + ' (Alt+←)')}" title="${escA('Revenir à ' + nomDEntree(laissee) + ' (Alt+←)')}">${ico('gauche')}</button>` : ''}<h2>Repères<b class="ix-n" title="${escA(pluriel(items.length, 'repère') + ' — hors renvois, masses et rails')}">${items.length}</b></h2><span class="espace"></span><button class="fi-x plus" id="ix-plus" title="Ajouter un équipement : son repère, puis ses fils dans le tableau" aria-label="Ajouter un équipement" aria-expanded="${!!app.insp.ajout}">${ico('plus')}</button><button class="fi-x" id="in-fermer" aria-label="Fermer (Échap)">${ico('fermer')}</button></header>`
    // ajouter un équipement : un champ en ligne, sous le titre (pas une boîte du navigateur)
    + (app.insp.ajout ? `<form class="ix-ajout" id="ix-ajout"><div class="filtre">${ico('plus')}<input id="ix-nouveau" placeholder="Repère du nouvel équipement, par exemple 105RL2" aria-label="Repère du nouvel équipement" autocomplete="off" spellcheck="false"></div><button class="btn cuivre" type="submit">Ajouter</button><button class="btn lien" type="button" id="ix-annuler">Annuler</button></form>` : '')
    + `<div class="filtre ix-filtre">${ico('loupe')}<input id="ix-q" value="${escA(app.insp.filtre)}" placeholder="Chercher un repère, une désignation" aria-label="Chercher un repère" autocomplete="off" spellcheck="false"><button class="vider" id="ix-vider"${f ? '' : ' hidden'} aria-label="Effacer la recherche">×</button></div>`
    + (f ? '' : `<details class="ix-controle"${CONTROLE.ouvert ? ' open' : ''}><summary><span class="fi-etat ${nko ? 'ko' : natt ? 'att' : 'ok'}"><i aria-hidden="true">${nko ? '✕' : natt ? '!' : '✓'}</i>${nko ? pluriel(nko, 'problème') + (natt ? ' · ' + natt + ' à voir' : '') : natt ? natt + ' à voir' : 'rien à reprendre'}</span>${(nko || natt) ? ico('bas', 'fi-chevron') : ''}</summary>${listeControleHtml()}</details>`)
    + (groupes || `<p class="ix-vide">Aucun repère ne contient « ${esc(app.insp.filtre.trim())} ». <button class="btn lien" id="ix-effacer">Effacer</button></p>`);
  // la même liste refaite (un filtre tapé) garde sa place ; l'index qu'on ouvre commence en haut, titre et recherche en vue
  box.scrollTop = meme ? haut : 0;
  $('in-fermer').onclick = () => fermerInspecteur();
  if ($('fi-prec')) $('fi-prec').onclick = () => naviguer(-1);
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
  box.querySelectorAll('.ix-item.co-item').forEach(b => b.onclick = () => allerAuControle(CONTROLE.items[+b.dataset.k]));
  box.querySelectorAll('.ix-item[data-nom]').forEach(b => b.onclick = () => allerAuRepere(b.dataset.nom, b.dataset.plan)); }
// depuis l'index : le folio du repère, son bloc choisi sur le plan, sa fiche
function allerAuRepere(nom, plan) { const P = plans();
  if (plan && plan !== app.plan && P.includes(plan)) allerAuPlan(plan);
  else if (!plan) { const ou = plansDuRepere(nom); if (app.plan !== '*' && ou.length && !ou.includes(app.plan)) allerAuPlan(ou[0]); }
  const c = app.dessin && app.dessin.comps.find(k => k.name === nom && k.kind !== 'tag'), vt = c ? null : barretteAPoser(nom);
  if (c) choisirBloc(c); else if (vt) choisirBarretteAPoser(vt); else { app.cible = { type: 'bloc', nom }; ouvrirInspecteur(); }
  viser(nom); }
/* Le panneau qui s'ouvre ou se ferme change la place du plan. Si l'on regardait la feuille ENTIÈRE, elle se recadre en
   douceur dans la place qui reste (jamais sous le panneau) ; si l'on avait zoomé sur un endroit, on n'y touche pas —
   seulement, si ce qu'on vient de choisir passe sous le panneau, on le ramène, à la même échelle. */
function recadrerSiCache() { const d = app.dessin; if (!d) { ajuster(true); return; }
  const r = cadre(), s = app.vue.s, bb = d.bbox, x0 = app.vue.tx + bb.x * s, y0 = app.vue.ty + bb.y * s, x1 = x0 + bb.w * s, y1 = y0 + bb.h * s;
  if (x0 >= -2 && y0 >= -2 && x1 <= r.width + 2 && y1 <= r.height + 2) { ajuster(true); return; }
  const c = app.cible, k = c && c.type === 'bloc' && d.compDe.get(c.nom), w = c && c.type === 'fil' && filDe(c.l);
  if (k) montrerSiCache({ x: k.x, y: k.y, w: k.w, h: k.h });
  else if (w) { const xs = w.pts.map(p => p.x), ys = w.pts.map(p => p.y), a = Math.min(...xs), b = Math.min(...ys); montrerSiCache({ x: a, y: b, w: Math.max(...xs) - a, h: Math.max(...ys) - b }); } }
/* R5 — LE PLAN NE BOUGE PAS pour rien : ouvrir une fiche depuis une fiche allume l'objet ; le plan ne glisse que si
   l'objet est hors de la place libre (sous un panneau, hors de l'écran), et alors à la même échelle quand il y tient.
   `b` : la boîte de l'objet, dans le repère du dessin. */
function montrerSiCache(b) { if (!b || !app.dessin) return; const r = cadre(), m = marges(), s = app.vue.s;
  const X0 = app.vue.tx + b.x * s, Y0 = app.vue.ty + b.y * s, X1 = X0 + b.w * s, Y1 = Y0 + b.h * s, L = m.gauche, T = m.haut, R = r.width - m.droite, B = r.height - m.bas;
  if (X0 >= L - 1 && X1 <= R + 1 && Y0 >= T - 1 && Y1 <= B + 1) return;
  if (b.w * s > R - L || b.h * s > B - T) { centrerSur(b.x, b.y, b.w, b.h); return; }
  animerVue({ s, tx: (L + R) / 2 - (b.x + b.w / 2) * s, ty: (T + B) / 2 - (b.y + b.h / 2) * s }, true); }

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

/* ---- les folios d'une liaison (le récapitulatif, la fiche du fil) -------- */
/* Le folio d'une liaison : il se corrige quand il vient du fichier ; il se lit seulement quand l'outil a découpé
   lui-même ; il n'y en a pas s'il n'y a qu'une feuille. */
const modeFolio = () => app.nFolios ? 'auto' : (plans().length ? 'fichier' : 'aucun');
const cleDe = l => [l.de, l.borneDe, l.vers, l.borneVers, l.cable].join('\u0001');
/* Quand l'outil a découpé, chaque liaison d'origine vit sur un ou deux
   folios : on retrouve la sienne par sa clé, sans parcourir la source. */
function foliosParSource() { const m = new Map(); if (!app.nFolios) return m;
  app.contrat.liaisons.forEach(d => { const k = cleSource(d); const t = m.get(k) || m.set(k, []).get(k); if (!t.includes(d.plan)) t.push(d.plan); });
  return m; }
const natureDe = nom => { const q = lireRepere(nom); return (q && q.num && CODES[q.code]) ? CODES[q.code].nom : 'équipement'; };
const triNaturel = (a, b) => String(a).localeCompare(String(b), 'fr', { numeric: true });
const pluriel = (n, mot) => n + ' ' + mot + (n > 1 && !/[sxz]$/.test(mot) ? 's' : '');   // « 2 harness », pas « harnesss »
/* Le même, le nombre lié à son mot par une espace insécable : dans un texte qui coule (un bilan, l'état d'un document),
   jamais le chiffre en bout de ligne et son mot dessous. `pluriel` garde l'espace simple : la fiche en retire le nombre
   (« 3 potentiels » → « potentiels », 08-fiche). */
const INSECABLE = '\u00a0', plurielLie = (n, mot) => pluriel(n, mot).replace(' ', INSECABLE);
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
   simulé (le facteur de déclassement en dépend ; sans lui, le faisceau de référence de la table). `ctx.fiche` : la fiche
   entière — avec ce qui ne vaut que pour la chute en ligne et le choix du calibre d'un disjoncteur (recherche R2) ;
   chacun dit ce qu'il change et d'où vient sa valeur par défaut. */
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
    N.disjoncteurs && N.disjoncteurs.length ? nb('si-Tmax', 'tableauMax', 'tableau max', '°C', '5', 'tableau', 'L’ambiante la plus haute du tableau : la courbe juste au-dessus (la rapide) juge le déclenchement intempestif.', { negatif: true, titre: TABLEAU }) : null,
    ...(ctx.fiche ? hypothesesR2(N, H, nb) : [])
  ].filter(Boolean); }
/* Les hypothèses de la recherche R2 (09-barrettes, HYPOTHESES), pour la fiche : la chute en ligne (la température des
   conducteurs, la chute propre du disjoncteur), la fréquence du réseau, et le choix du meilleur calibre (les deux marges,
   le préchauffage, les calibres qu'on s'impose). */
function hypothesesR2(N, H, nb) { const dj = !!(N.disjoncteurs && N.disjoncteurs.length);
  return [
    { genre: 'choix', id: 'si-Cc', k: 'chuteConducteur', lib: 'température des conducteurs', aria: 'Température des conducteurs pour la chute', options: [['estimee', 'estimée sous le courant'], ['fixe', 'fixe : « conducteur » (20 °C)']], valeur: H.chuteConducteur === 'fixe' ? 'fixe' : 'estimee', groupe: 'chute',
      sert: 'Estimée (par défaut) : chaque fil à la température que son courant lui donne, ambiante + 40 °C × (I / I admise)², AC 43.13-1B § 11-66 d(6). Fixe : à l’hypothèse « conducteur », 20 °C comme l’Excel et les fiches constructeur.' },
    dj ? { genre: 'case', id: 'si-Cd', k: 'chuteDisjoncteur', lib: 'compter la chute du disjoncteur', groupe: 'chute',
      sert: 'Cochée (par défaut) : la chute propre du disjoncteur (table Chute disjoncteur, au prorata I / In) entre dans la chute en ligne — l’AC 43.13-1B la mesure du bus à la masse de l’équipement. Décoche si la règle du programme part du bus aval (ABD0100, à confirmer).' } : null,
    nb('si-F', 'frequence', 'fréquence', 'Hz', '10', 'reseau', 'En alternatif, la réactance saisie (à 400 Hz) monte avec la fréquence (X = 2πfL) : 400 Hz par défaut, un réseau à fréquence fixe ; 800 en fréquence variable (MIL-STD-704F, 360 à 800 Hz). Sans effet en continu.'),
    dj ? nb('si-M', 'marge', 'marge de courant', '%', '5', 'tableau', 'Le meilleur calibre tient chaque courant du profil majoré de ce pourcentage : 10 % par défaut, pour un profil estimé (R2 règle 13) ; 0 % pour un profil qui sort du bilan électrique au pire cas (NASA TM-102179).') : null,
    dj ? nb('si-Mt', 'margeTemps', 'marge de temps', '%', '5', 'tableau', 'Ce qu’une pointe peut consommer, au plus, du temps de déclenchement du meilleur calibre : 75 % par défaut (R2 § 3.1, étape 2).') : null,
    dj ? nb('si-Pc', 'prechauffage', 'préchauffage', '', '0.1', 'tableau', 'Un état ajouté au profil survient en service, le bilame chaud : son temps de déclenchement se divise par ce facteur. 1,6 par défaut, la borne basse de la feuille MS3320N (table VII : 1,6 à 3,7) ; 1 l’ôte.') : null,
    dj ? { genre: 'liste', id: 'si-Cp', k: 'calibresPreferes', lib: 'calibres préférés', unite: 'A', groupe: 'tableau',
      sert: 'Les calibres que tu poses, dans le catalogue de la famille du part number : 1 3 5 7,5 10 15 20 25 par défaut (au-delà de 25 A, la famille garde les siens) ; le meilleur se choisit parmi eux. Vide : tout le catalogue de la famille.' } : null]; }
/* Un champ d'hypothèse, tel que le bandeau d'une carte le montre (compact) ; la fiche l'habille d'une ligne qui dit à
   quoi il sert. Les identifiants (si-L, si-I…) sont ceux que `lierHypotheses` lit. */
function champHypotheseHtml(c, H) {
  if (c.genre === 'condition') return `<label class="hyp-c" title="${escA(c.titre)}"><input type="checkbox" data-cond="${escA(c.c)}"${H.conditions.includes(c.c) ? ' checked' : ''}><span>${esc(c.c)} ×${nombre(Math.round(c.facteur * 100) / 100)}</span></label>`;
  if (c.genre === 'case') return `<label class="hyp-c"><input type="checkbox" id="${c.id}"${H[c.k] !== false ? ' checked' : ''} aria-label="${escA(c.lib + ' (hypothèse)')}"><span>${esc(c.lib)}</span></label>`;
  if (c.genre === 'liste') return `<label class="hyp-n hyp-liste"><span>${esc(c.lib)}</span><input id="${c.id}" type="text" inputmode="decimal" value="${escA((H[c.k] || []).map(nombre).join(' '))}" placeholder="tout le catalogue" spellcheck="false" autocomplete="off" aria-label="${escA(c.lib + ' (hypothèse)')}"><span class="u">${esc(c.unite)}</span></label>`;
  if (c.genre === 'choix') return `<label class="hyp-n"><span>${esc(c.lib)}</span><select id="${c.id}" aria-label="${escA(c.aria + ' (hypothèse)')}">${c.options.map(([v, t]) => `<option value="${escA(v)}"${String(v) === String(c.valeur) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  return `<label class="hyp-n"${c.titre ? ` title="${escA(c.titre)}"` : ''}><span>${esc(c.lib)}</span><input id="${c.id}" type="number" inputmode="decimal" step="${c.pas}"${c.min != null ? ` min="${c.min}"` : ''} value="${H[c.k]}" aria-label="${escA(c.lib + ' (hypothèse)')}"><span class="u">${esc(c.unite)}</span></label>`; }
const GROUPES_HYPOTHESES = [['fil', 'Le fil'], ['temperature', 'La température'], ['chute', 'La chute en ligne'], ['reseau', 'Le réseau'], ['declassement', 'Le déclassement'], ['tableau', 'Les disjoncteurs']];
const ligneHypotheseHtml = (c, H) => `<div class="hy-ligne"><div class="hy-champ">${champHypotheseHtml(c, H)}</div><p class="hy-sert">${esc(c.sert)}${c.genre === 'condition' && c.titre ? ` <i>· ${esc(c.titre)}</i>` : ''}</p></div>`;
/* LA FICHE DES HYPOTHÈSES : un document à droite (mode `hypotheses`), un groupe par thème, chaque hypothèse avec son
   champ et ce qu'elle sert ; « Revenir aux valeurs de l'outil » rend `HYPOTHESES`. Atteignable du menu, du mot
   « hypothèse » de la fiche d'un fil, de « longueurs d'hypothèse » de la fiche d'un disjoncteur. */
function ficheHypotheses() { const H = app.simu || (app.simu = { ...HYPOTHESES }), N = app.norme || normeVide(), cs = hypothesesDe(N, H, { fiche: true });
  const defaut = Object.keys(HYPOTHESES).every(k => JSON.stringify(H[k]) === JSON.stringify(HYPOTHESES[k]));
  const corps = tete('Simulation', 'Hypothèses') + `<p class="note">Ce que le retest ne porte pas, l’outil le suppose. Chaque fiche qui s’en sert le dit (<b>hypothèse</b>) ; ce qu’on règle ici rejuge tout — le contrôle, les fiches, la nomenclature — et se garde dans ce navigateur, pas avec le contrat.${defaut ? '' : ' <b>Réglées</b> : l’outil proposait d’autres valeurs.'}</p>`
    + GROUPES_HYPOTHESES.map(([g, t]) => { const xs = cs.filter(c => c.groupe === g); return xs.length ? `<section class="hy-groupe"><div class="sur">${esc(t)}</div>${xs.map(c => ligneHypotheseHtml(c, H)).join('')}</section>` : ''; }).join('');
  const deja = app.fiche && app.fiche.mode === 'hypotheses', y = deja ? $('fiche-corps').scrollTop : 0;
  ouvrirFiche({ mode: 'hypotheses' }, corps, `<button class="btn papier" id="hy-defaut"${defaut ? ' disabled' : ''}>Revenir aux valeurs de l’outil</button>`); if (deja) $('fiche-corps').scrollTop = y;
  lierHypotheses($('fiche-corps'), ficheHypotheses);
  $('hy-defaut').onclick = () => { app.simu = { ...HYPOTHESES, conditions: [...HYPOTHESES.conditions], calibresPreferes: [...HYPOTHESES.calibresPreferes] }; apresHypotheses(); ficheHypotheses(); dire('Les hypothèses de l’outil sont rétablies.'); }; }
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
    const rho = `${nombre(arrondi(ex.rho, 1))} Ω/km à ${nombre(Math.round(ex.T != null ? ex.T : H.tconducteur))} °C${ex.rhoSource === 'câble' ? ' — le câble ' + esc(ex.cab.cable) + ' de la base' : ex.rhoSource === 'jauge' ? ' — la jauge seule, EN 2853' : ''}${ex.kTemperature && Math.abs(ex.kTemperature - 1) > 1e-6 ? ' (× ' + nombre(Math.round(ex.kTemperature * 1000) / 1000) + ' depuis 20 °C)' : ''}`;
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
  [['si-R', 'regime'], ['si-C', 'cosphi'], ['si-Ret', 'retour'], ['si-Cc', 'chuteConducteur']].forEach(([id, k]) => { const e = el(id); if (!e) return; e.addEventListener('change', () => { H[k] = k === 'cosphi' ? parseFloat(e.value) : e.value; refaire(id); }); });
  // l'ambiante du tableau : deux nombres, négatifs permis, le min sous le max
  [['si-Tmin', 'tableauMin'], ['si-Tmax', 'tableauMax']].forEach(([id, k]) => { const e = el(id); if (!e) return;
    e.addEventListener('change', () => { const v = parseFloat(String(e.value).replace(',', '.')); if (isNaN(v)) { e.value = H[k]; return; } if (v === H[k]) return; H[k] = v;
      if (H.tableauMin > H.tableauMax) { if (k === 'tableauMin') H.tableauMax = v; else H.tableauMin = v; } refaire(id); }); });
  [['si-L', 'longueur'], ['si-I', 'courant'], ['si-U', 'tension'], ['si-T', 'ambiante'], ['si-Tc', 'tconducteur'], ['si-X', 'reactance'], ['si-P', 'charge'], ['si-A', 'altitude']].forEach(([id, k]) => { const e = el(id); if (!e) return;
    e.addEventListener('change', () => { const v = parseFloat(String(e.value).replace(',', '.')); if (isNaN(v) || v < 0) { e.value = H[k]; return; } if (v === H[k]) return; H[k] = v; refaire(id); }); });
  // les hypothèses R2 : la fréquence (> 0), les marges (la marge de temps : 1 à 100 %), le préchauffage (1 au moins), la chute
  // du disjoncteur (une case), les calibres préférés (une liste libre : « 1 3 5 7,5 10 », vide pour tout le catalogue)
  [['si-F', 'frequence', v => v > 0], ['si-M', 'marge', v => v >= 0], ['si-Mt', 'margeTemps', v => v > 0 && v <= 100], ['si-Pc', 'prechauffage', v => v >= 1]].forEach(([id, k, ok]) => { const e = el(id); if (!e) return;
    e.addEventListener('change', () => { const v = parseFloat(String(e.value).replace(',', '.')); if (isNaN(v) || !ok(v)) { e.value = H[k]; return; } if (v === H[k]) return; H[k] = v; refaire(id); }); });
  const cd = el('si-Cd'); if (cd) cd.addEventListener('change', () => { H.chuteDisjoncteur = cd.checked; refaire('si-Cd'); });
  const cp = el('si-Cp'); if (cp) cp.addEventListener('change', () => { const xs = [...new Set(String(cp.value).split(/[\s;]+|,(?=\s)/).map(x => parseFloat(x.replace(',', '.'))).filter(x => x > 0))].sort((a, b) => a - b);
    if (JSON.stringify(xs) === JSON.stringify(H.calibresPreferes || [])) { cp.value = xs.map(nombre).join(' '); return; } H.calibresPreferes = xs; refaire('si-Cp'); });
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
  // une prise (ou un connecteur) a ses deux bandes d'au moins 140 px, la largeur de « PARTIE MOBILE · fiche » (rangCoupure) :
  // le dessin les prend en entier, bord droit compris
  const forme = opts.forme || 'reglette', W = Math.max(Math.max(...rangs.map(r => r.length)) * pas, forme === 'reglette' ? 0 : 140);
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

/* Supprimer une liaison (le récapitulatif, la fiche du fil) : une entrée d'historique, le plan suit. */
function supprimerLiaison(i) { const V = verite(), l = V[i]; if (!l) return; histPush('suppression d’une liaison'); V.splice(i, 1);
  if (app.cible && app.cible.type === 'fil' && app.cible.l === l) app.cible = null; apresEdition(); rendreBase(); }
/* Les folios où une liaison se dessine : ceux que l'outil lui a donnés en
   découpant, sinon celui que le fichier porte. */
function foliosDe(l) { return modeFolio() === 'auto' ? (foliosParSource().get(cleDe(l)) || []) : (l.plan ? [l.plan] : []); }
/* Le même geste depuis la carte d'une barrette : le bloc reste choisi, sa
   carte reste ; on va seulement voir le fil, même sur un autre folio. */
function voirFilDeCarte(i) { const l = verite()[i]; if (!l) return;
  const ou = foliosDe(l);
  if (app.plan !== '*' && ou.length && !ou.includes(app.plan)) { allerAuPlan(ou[0]); if (app.cible && app.cible.type === 'bloc') { app.choisi = app.cible.nom; peindre(); } }
  const w = filDe(l); if (w) { allumerFil(w); viserFil(w); } else if (!attenteCourante()) dire('Ce fil n’est pas dessiné sur ce folio.'); }
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
/* Coller des lignes (ficheColler : l'ordre, un exemple, l'aperçu, ajouter ou remplacer) vit dans 08-fichiers.js. */
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
/* Ouvrir un fichier (ouvrirFichier : le retest, ou ce qu'il est — une bible, une norme, une base, un tableau à
   deviner — et l'erreur dite dans « Vos fichiers »), ficheHarnais (plusieurs harness : lequel ouvrir ?) vivent dans
   08-fichiers.js. */
/* Le dépôt : toute la fenêtre est la cible ; une étape de l'accueil ou une carte de « Vos fichiers » qui porte
   data-depot dit ce qu'on y dépose (la base des contrats déjà faits, la bible, une norme) — ailleurs, un retest (ou ce
   que le fichier se révèle être). La cible survolée s'allume. */
function lierDepot() { let n = 0, vise = null;
  const cible = e => e.target && e.target.closest ? e.target.closest('[data-depot]') : null;
  const viser = el => { if (vise === el) return; if (vise) vise.classList.remove('survol-depot'); vise = el; if (el) el.classList.add('survol-depot'); };
  window.addEventListener('dragenter', e => { e.preventDefault(); n++; document.body.classList.add('depot-actif'); viser(cible(e)); });
  window.addEventListener('dragover', e => { e.preventDefault(); viser(cible(e)); });
  window.addEventListener('dragleave', e => { e.preventDefault(); if (--n <= 0) { n = 0; document.body.classList.remove('depot-actif'); viser(null); } });
  window.addEventListener('drop', e => { e.preventDefault(); n = 0; document.body.classList.remove('depot-actif'); const c = cible(e), ou = c && c.dataset.depot; viser(null);
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return;
    if (ou === 'base') importerReferences(f); else if (ou === 'bible') importerBible(f); else if (ou === 'normes') importerNorme(f); else ouvrirFichier(f); }); }

/* ---- sortir le dessin : SVG, PNG, impression -------------------------- */
function nomFolio() { const base = (app.nom || 'atelier-schema').replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_');
  return base + (app.plan !== '*' ? '-folio-' + String(app.plan).replace(/[^\w.-]+/g, '_') : ''); }
/* Un nom de fichier en ASCII : ouvert depuis file://, Chromium remplace par « download » tout nom qui porte un accent,
   une apostrophe ou un tiret cadratin. Les accents tombent, tout le reste devient un tiret. */
const nomAscii = nom => String(nom).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+(?=\.|$)/g, '');
const nomContrat = () => nomAscii((app.nom || 'contrat').replace(/\.[^.]+$/, '')) || 'contrat';
function telecharger(blob, nom) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nomAscii(nom);
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
function svgDuFolio() { return app.dessin ? svgAutonome(app.dessin, app.contrat.cartouche, folioCourant(), designationDe, null, n => ({ calibre: calibreNominal(n) })) : null; }
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
function imprimer() { if (!app.dessin) return; const S = svgAutonome(app.dessin, app.contrat.cartouche, folioCourant(), designationDe, '#ffffff', n => ({ calibre: calibreNominal(n) }));
  $('printroot').innerHTML = `<style>@page{size:A3 landscape;margin:8mm}</style>` + S.txt.replace(/^<\?xml[^>]*\?>\s*/, ''); window.print(); }

/* ---- ce que le menu et le rail affichent ------------------------------ */
const NOM_EXEMPLE = 'Contrat d’exemple';
/* L'en-tête du menu dit QUEL contrat est ouvert : le titre du cartouche si on en a écrit un, sinon le nom du fichier ;
   et que c'est l'exemple embarqué quand c'est lui (il ne s'ouvre qu'à la demande ; le bandeau sous la barre le dit aussi). */
function synchroniserContexte() { const n = app.contrat.liaisons.length, P = plans(), nom = n ? (app.nom || 'Sans nom') : 'Aucun contrat', exemple = n && app.nom === NOM_EXEMPLE;
  const sous = n ? (exemple ? 'l’exemple embarqué · ' : '') + `${n} liaison${n > 1 ? 's' : ''} · ${reperesDuContrat().length} repères` + (P.length > 1 ? ` · ${P.length} folios` : '') : '';
  $('ctx-nom').textContent = nom; $('ctx-txt').textContent = sous; $('ctx-nom').title = nom;
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
// le mot qui passe ; `signaler` (08-fichiers) y ajoute « Voir » quand ce qu'il dit s'écrit dans « Vos fichiers »
function dire(msg, erreur) { const t = $('toast'); t.textContent = msg; t.classList.toggle('erreur', !!erreur); t.classList.remove('action'); t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), erreur ? 6000 : 2800); }
/* ---- le menu ⋮ : peu de lignes ; Exporter et Plus s'ouvrent EN PLACE (page.html) -----------------------------------
   `montrerPanneau(nom)` : '' le menu, sinon un sous-menu, qui prend sa place (le menu garde sa largeur). Le clavier va à la
   première ligne du panneau montré — au retour, à la ligne qui avait ouvert le sous-menu. */
function ouvrirMenu() { $('menu').hidden = false; $('btnMenu').setAttribute('aria-expanded', 'true'); montrerPanneau(''); }
// fermé, le menu revient à son panneau principal : il se rouvrira sur lui, le clavier sur sa première ligne
function fermerMenu() { const m = $('menu'); m.hidden = true; $('btnMenu').setAttribute('aria-expanded', 'false');
  m.querySelectorAll('.menu-panneau').forEach(p => { p.hidden = p.id !== 'mp-principal'; }); m.querySelectorAll('[data-sous]').forEach(b => b.setAttribute('aria-expanded', 'false')); }
const panneauDuMenu = () => [...$('menu').querySelectorAll('.menu-panneau')].find(p => !p.hidden);
function montrerPanneau(nom) { const m = $('menu'), avant = panneauDuMenu(), vise = $(nom ? 'mp-' + nom : 'mp-principal'); if (!vise) return;
  m.querySelectorAll('.menu-panneau').forEach(p => { p.hidden = p !== vise; });
  m.querySelectorAll('[data-sous]').forEach(b => b.setAttribute('aria-expanded', String(b.dataset.sous === nom)));
  const bulle = $('menu-bulle'); if (bulle) bulle.classList.remove('on');
  const ouvreur = !nom && avant && avant !== vise ? m.querySelector(`[data-sous="${avant.id.slice(3)}"]`) : null;
  const b = ouvreur || vise.querySelector('button[role="menuitem"]:not([data-retour])'); if (b) b.focus(); }
/* Le menu se lie une fois : le bouton ⋮, un clic sur une ligne (une action, un sous-menu, le retour), un clic ailleurs qui
   le ferme ; au clavier, ↑ ↓ Début Fin dans le panneau montré, → ouvre un sous-menu, ← ou Échap y revient (Échap sur le
   menu lui-même le ferme : 08, la touche globale). Tant que le menu a le clavier, les flèches ne changent pas de folio. */
function lierMenu(actions) { const m = $('menu');
  $('btnMenu').onclick = e => { e.stopPropagation(); m.hidden ? ouvrirMenu() : fermerMenu(); };
  m.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button'); if (!b) return;
    if (b.dataset.sous) montrerPanneau(b.dataset.sous);
    else if (b.hasAttribute('data-retour')) montrerPanneau('');
    else if (b.dataset.act) { fermerMenu(); actions[b.dataset.act](); } });
  m.addEventListener('keydown', e => { const p = panneauDuMenu(); if (!p) return; const sous = p.id !== 'mp-principal', ici = document.activeElement;
    const xs = [...p.querySelectorAll('button[role="menuitem"]')], i = xs.indexOf(ici), aller = k => xs[(k + xs.length) % xs.length].focus();
    const fait = { ArrowDown: () => aller(i + 1), ArrowUp: () => aller(i < 0 ? xs.length - 1 : i - 1), Home: () => aller(0), End: () => aller(xs.length - 1),
      ArrowRight: () => { if (ici && ici.dataset.sous) montrerPanneau(ici.dataset.sous); }, ArrowLeft: () => { if (sous) montrerPanneau(''); },
      Escape: sous ? () => montrerPanneau('') : null }[e.key];
    if (!fait) return; e.preventDefault(); e.stopPropagation(); fait(); });
  document.addEventListener('click', e => { if (!e.target.closest('#menuBoite')) fermerMenu(); }); }
function basculerBible() { if (app.fiche && app.fiche.mode === 'bible') fermerFiche(true); else ficheBible(); }

/* ---- tout relier -------------------------------------------------------- */
function lierPanneau() {
  const o = (id, fn) => { const e = $(id); if (e) e.onclick = fn; };
  const choisirFichier = () => $('fichier').click();
  const exemple = () => ouvrirExemple();   // l'exemple embarqué, à la demande (08-fichiers)
  $('fichier').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) ouvrirFichier(f); e.target.value = ''; });
  $('fichier-bible').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) importerBible(f); e.target.value = ''; });
  o('vd-ouvrir', choisirFichier); o('vd-coller', ficheColler); o('vd-exemple', exemple); o('vd-reprendre', () => { const q = annuler(); if (q) dire('Repris : ' + q + '.'); });
  o('btnBase', basculerBase); o('btnIndex', basculerIndex); o('btnCherche', () => { if (rechercheOuverte()) fermerRecherche(); else ouvrirRecherche(); });
  o('btnLiaison', nouvelleLiaison); o('btnBible', basculerBible);
  // le menu (page.html) : ouvrir un retest, vos fichiers (la base des contrats déjà faits y a sa carte), le récapitulatif, la
  // nomenclature ; Exporter (SVG, PNG, imprimer, le suivi) ; Plus (coller, l'exemple, la bible, les normes, les hypothèses,
  // le cartouche, tout effacer)
  lierMenu({ ouvrir: choisirFichier, fichiers: () => ficheFichiers(), recapitulatif: basculerBase, nomenclature: ficheNomenclature,
    svg: exporterSVG, png: exporterPNG, imprimer, suivi: exporterSuivi,
    coller: ficheColler, exemple, bible: ficheBible, normes: () => ficheNormes(), hypotheses: ficheHypotheses, cartouche: ficheCartouche,
    // tout effacer : la table vide (l'accueil), et un contrat neuf — les choix de celui-ci ne survivent pas (Ctrl+Z, ou « Reprendre », rend tout)
    vider: () => { if (!confirm('Effacer tout le contrat ?')) return; histPush('tout effacer'); app.contrat = contratNeuf(); app.source = null; app.nFolios = 0; app.plan = '*'; app.nom = ''; app.cible = null; app.choisi = null;
      fermerFiche(); fermerInspecteur(); fermerBase(); redessiner(); ajuster(); sauver(); } });
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
