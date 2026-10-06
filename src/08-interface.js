/* ===========================================================================
   08 — L'INTERFACE
   Le plan est l'écran. Tout ce qui s'affiche se déduit de `app` par
   `synchroniser()` ; aucun état ne vit dans le DOM.

   app.contrat      le contrat tel qu'il est édité (liaisons, désignations, cartouche)
   app.source       les liaisons d'origine quand le contrat est découpé en folios
                    tout seul ; `verite()` rend toujours ce qu'on édite
   app.plan         '*' = tout d'un tenant, sinon le folio affiché
   app.dessin       le dessin du folio affiché (placement + routage)
   app.base         la base à côté du plan : ouverte ou non, son filtre, son tri
   app.cible        ce qui est choisi : un bloc { type:'bloc', nom } ou un fil
                    { type:'fil', l } — allumé sur le plan, marqué dans la base
   app.actif        la liaison dont on écrit une cellule : son fil s'allume
   app.bible        la bible des barrettes en cours, et son nom (bibleNom)
   app.norme        la norme en cours (familles, fils, déclassements, réseau)
                    et son nom (normeNom) ; app.simu : les hypothèses de la
                    simulation (longueur, courant, tension, conditions)
   La base est LE document : on la corrige, le plan suit. Une fiche ne sert
   qu'au cartouche, au collage et à la bible — jamais deux documents à la fois.
   La carte d'une barrette ou d'une prise, au-dessus de ses fils, est un
   DESSIN : la réglette de face, tous ses modules, ses paquets, ses fils de
   tous les folios (`physiqueDeBarrette`), chaque fil dans son trou selon la
   norme (`remplirSelonNorme`), puis la SIMULATION (`simulerBornier`) sur des
   hypothèses dites et modifiables ; la table dessous est sa base.
   Les commandes sont dans la barre de gauche (le rail) ; le menu, en bas
   d'elle, porte ce qu'on fait une fois et ce qui se lit (le dossier ouvert).
   =========================================================================== */
'use strict';

const app = {
  contrat: nouveauContrat(), source: null, nFolios: 0, budget: 16, plan: '*', nom: '',
  vue: { s: 1, tx: 0, ty: 0 }, choisi: null, cible: null, actif: null, dessin: null, hist: [], fiche: null,
  bible: [], bibleNom: '', norme: null, normeNom: '', simu: null,   // simu : les hypothèses, posées au démarrage (relireSimu)
  base: { ouvert: false, filtre: '', tri: null, largeur: 0, hauteur: 0, sale: true, defiler: false, enSaisie: false, choixOuvert: false, normeOuverte: false },
  retouches: new Map()   // folio (sa clé de placement) -> le dessin retouché à la souris (la retouche)
};
const $ = id => document.getElementById(id);
const CLE_CONTRAT = 'atelier.contrat.v2';
const CLE_BASE = 'atelier.base.v1';
const ZMIN = 0.06, ZMAX = 8;
const verite = () => app.source || app.contrat.liaisons;
const plans = () => plansDe(app.contrat.liaisons);
const mouvementReduit = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const telephone = () => window.innerWidth <= 700;

/* ---- le dessin ---------------------------------------------------------- */
function liaisonsDuPlan() { const L = app.contrat.liaisons.filter(liaisonComplete);
  return app.plan === '*' ? L : L.filter(l => l.plan === app.plan); }
/* Le placement d'un folio se garde tant que ses liaisons ne changent pas : le
   concours du folio chargé prend quelques secondes, revenir sur un folio déjà
   vu est instantané. La clé : ce que le placement lit de chaque liaison. */
const placements = new Map(), PLACEMENTS_GARDES = 24;
const clePlacement = L => JSON.stringify(L.map(l => [l.de, l.borneDe, l.vers, l.borneVers, l.cable, l.pnDe, l.pnVers]));
function placementDe(L) {
  const cle = clePlacement(L);
  // un folio retouché à la souris : la retouche, toujours (elle se défait par « automatique » ou Ctrl+Z)
  if (app.retouches.has(cle)) return app.retouches.get(cle);
  // un folio déjà affiné (dans cette session, ou gardé d'une autre) : son meilleur dessin
  if (affinage.profonds.has(cle)) return affinage.profonds.get(cle);
  if (placements.has(cle)) { const P = placements.get(cle); placements.delete(cle); placements.set(cle, P); return P; }
  const P = meilleurPlacement(L); placements.set(cle, P);
  if (placements.size > PLACEMENTS_GARDES) placements.delete(placements.keys().next().value);
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
  const P = plans(), L0 = app.contrat.liaisons.filter(liaisonComplete), parPlan = app.plan === '*' || !P.length ? [L0] : [liaisonsDuPlan(), ...P.filter(p => p !== app.plan).map(p => L0.filter(l => l.plan === p))];
  const travaux = parPlan.filter(L => L.length).map(L => ({ cle: clePlacement(L), L: L.map(l => ({ ...l })) })).filter(t => !affinage.finis.has(t.cle) && !(affinage.encours && affinage.encours.cle === t.cle));
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
const IDB_NOM = 'atelier-schema', IDB_MAGASIN = 'placements', IDB_RETOUCHES = 'retouches';
function ouvrirIDB() { return new Promise((ok, ko) => { try { const r = indexedDB.open(IDB_NOM, 2);
  r.onupgradeneeded = () => { [IDB_MAGASIN, IDB_RETOUCHES].forEach(m => { if (!r.result.objectStoreNames.contains(m)) r.result.createObjectStore(m); }); };
  r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); } catch (err) { ko(err); } }); }
function garderAffine(cle, P) { ouvrirIDB().then(db => { db.transaction(IDB_MAGASIN, 'readwrite').objectStore(IDB_MAGASIN).put({ P, t: Date.now() }, VERSION_MOTEUR + '|' + cle); }).catch(() => { }); }
function relireAffines() { if (!affinage.actif) return; const avant = cleCourante();
  ouvrirIDB().then(db => { const req = db.transaction(IDB_MAGASIN, 'readwrite').objectStore(IDB_MAGASIN).openCursor();
    req.onsuccess = () => { const c = req.result;
      if (!c) { const ici = cleCourante(); if (ici && ici === avant && affinage.profonds.has(ici)) rafraichirDessin(); affinerTout(); return; }
      const k = String(c.key);
      if (k.startsWith(VERSION_MOTEUR + '|')) { const cle = k.slice(VERSION_MOTEUR.length + 1); if (!affinage.profonds.has(cle) && c.value && c.value.P) affinage.profonds.set(cle, c.value.P); affinage.finis.add(cle); }
      else c.delete();
      c.continue(); }; }).catch(() => { }); }
/* ---- la RETOUCHE : déplacer un bloc à la souris, tout suit ------------- */
/* Le dessin automatique est le point de départ ; on peut le retoucher. Un
   bloc (équipement, barrette, prise) se prend et glisse dans sa colonne :
   ses masses collées le suivent, ses fils se reroutent en direct, et il
   s'AIMANTE à la hauteur qui rend droit un de ses fils. Il s'arrête à huit
   unités d'un voisin de sa colonne (deux blocs ne se collent pas). Lâché, le
   folio est RETOUCHÉ : son dessin se garde dans ce navigateur (IndexedDB),
   l'affinage ne le remplace plus, Ctrl+Z défait le geste, « automatique »
   rend le dessin du moteur. Au doigt, un appui long prend le bloc (un
   glissé simple déplace la vue). */
const AIMANT = 5, GARDE_RETOUCHE = 8;
// les pastilles (masses, morceaux de barrette seuls) collées au flanc d'un bloc, à sa hauteur : elles le suivent
const pastillesCollees = (comps, c) => comps.filter(t => t.kind === 'tag' && t.y + t.h / 2 > c.y - 1 && t.y + t.h / 2 < c.y + c.h + 1
  && (Math.abs(t.x + t.w + FIL_PASTILLE - c.x) < 2 || Math.abs(t.x - (c.x + c.w + FIL_PASTILLE)) < 2));
const surLeBloc = (c, nom, e) => String(nom) === String(c.name) && e.x >= c.x - 1 && e.x <= c.x + c.w + 1 && e.y >= c.y - 1 && e.y <= c.y + c.h + 1;
const decalerComp = (k, dy) => { const rangs = {}; Object.keys(k.rangs || {}).forEach(lid => { rangs[lid] = k.rangs[lid].map(p => ({ ...p, y: p.y + dy })); });
  const parCle = new Map(); (k.parCle || new Map()).forEach((v, cl) => parCle.set(cl, { ...v, y: v.y + dy })); return { ...k, y: k.y + dy, rangs, parCle }; };
// jusqu'où le bloc peut aller sans venir à moins de GARDE d'un voisin de sa colonne, ni sortir de la zone utile de la
// feuille (seul dans sa colonne, il partait au-delà, et la feuille rapetissait tout pour le suivre) : [haut, bas] de dy
function courseDuBloc(P, c) { let lo = -Infinity, hi = Infinity; const bb = app.dessin && app.dessin.bbox;
  if (bb) { const k = bb.k || 1; lo = bb.y + (PAGE_CADRE + PAGE_MARGE) * k - c.y; hi = bb.y + bb.h - (PAGE_CADRE + PAGE_MARGE + PAGE_CARTOUCHE) * k - (c.y + c.h); }
  P.comps.forEach(o => { if (o === c || o.kind === 'tag' || o.col !== c.col || o.x >= c.x + c.w || c.x >= o.x + o.w) return;
    if (o.y + o.h <= c.y + 0.5) lo = Math.max(lo, o.y + o.h + GARDE_RETOUCHE - c.y); else if (o.y >= c.y + c.h - 0.5) hi = Math.min(hi, o.y - GARDE_RETOUCHE - (c.y + c.h)); });
  return [Math.min(lo, 0), Math.max(hi, 0)]; }
// les hauteurs où un fil du bloc devient droit (son autre bout sur un bloc qui ne bouge pas)
function aimantsDuBloc(P, c, tags) { const ds = []; P.links.forEach(l => { if (l.shunt || l.boucle) return;
  [[l.de, l.epA, l.vers, l.epB], [l.vers, l.epB, l.de, l.epA]].forEach(([n, e, n2, e2]) => { if (!surLeBloc(c, n, e)) return;
    const autre = P.comps.find(k => surLeBloc(k, n2, e2)); if (!autre || autre === c || tags.includes(autre)) return; ds.push(e2.y - e.y); }); });
  return ds; }
// le dessin avec le bloc déplacé de dy, ses pastilles avec lui, rerouté
function deplacerBloc(P, c, dy) { const tags = pastillesCollees(P.comps, c), bouge = new Set([c, ...tags]);
  const comps = P.comps.map(k => bouge.has(k) ? decalerComp(k, dy) : k);
  const touche = (nom, e) => [...bouge].some(k => surLeBloc(k, nom, e));
  const links = P.links.map(l => { const a = touche(l.de, l.epA), b = touche(l.vers, l.epB); if (!a && !b) return l;
    return { ...l, epA: a ? { ...l.epA, y: l.epA.y + dy } : l.epA, epB: b ? { ...l.epB, y: l.epB.y + dy } : l.epB }; });
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
    app.dessin.couleurDe = w => routes.get(routeDe(w)) || null; app.dessin.legende = legendeDesRoutes(app.dessin.fils.filter(w => !w.shunt && String(w.de) !== String(w.vers)), routeDe, routes); }
  return app.dessin;
}
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
const CLE_BIBLE = 'atelier.bible.v1', CLE_NORME = 'atelier.norme.v1', CLE_SIMU = 'atelier.simu.v1';
/* La bible, et avec elle la norme et les hypothèses de simulation : ce que
   ce navigateur a gardé, sinon ce qui est embarqué. */
function relireBible() { relireNorme(); relireSimu();
  try { const o = JSON.parse(localStorage.getItem(CLE_BIBLE) || 'null'); if (o && o.entrees && o.entrees.length) { app.bible = avecModules(o.entrees.map(entreeBible).filter(Boolean)); app.bibleNom = o.nom || ''; return true; } } catch (_) { }
  app.bible = bibleDeLOutil(); app.bibleNom = ''; return false; }
/* Une autre bible : les références sous les barrettes changent, la carte de
   la barrette choisie aussi, et la fiche de la bible si elle est ouverte. */
function adopterBible(entrees, nom) { app.bible = avecModules(entrees); app.bibleNom = nom || '';
  try { localStorage.setItem(CLE_BIBLE, JSON.stringify({ entrees, nom: app.bibleNom, t: Date.now() })); } catch (_) { }
  peindre(); rallumer(); rafraichirBase(); if (app.fiche && app.fiche.mode === 'bible') ficheBible(app.fiche.ref); }
function relireNorme() { try { const o = JSON.parse(localStorage.getItem(CLE_NORME) || 'null'); if (o && o.norme && normeLue(o.norme)) { app.norme = { ...normeVide(), ...o.norme }; app.normeNom = o.nom || ''; return true; } } catch (_) { }
  app.norme = normeEmbarquee(); app.normeNom = ''; return false; }
/* Une autre norme : la carte de la barrette choisie se remplit et se simule
   autrement ; la fiche de la bible le dit. Le plan, lui, ne bouge pas. */
function adopterNorme(norme, nom) { app.norme = norme; app.normeNom = nom || '';
  try { if (nom) localStorage.setItem(CLE_NORME, JSON.stringify({ norme, nom, t: Date.now() })); else localStorage.removeItem(CLE_NORME); } catch (_) { }
  rafraichirBase(); if (app.fiche && app.fiche.mode === 'bible') ficheBible(app.fiche.ref); }
/* Les hypothèses de la simulation : une commodité de ce navigateur. */
function relireSimu() { app.simu = { ...HYPOTHESES };
  try { const o = JSON.parse(localStorage.getItem(CLE_SIMU) || 'null'); if (o && typeof o === 'object') app.simu = { ...HYPOTHESES, ...o, conditions: Array.isArray(o.conditions) ? o.conditions : HYPOTHESES.conditions }; } catch (_) { } }
function memoriserSimu() { try { localStorage.setItem(CLE_SIMU, JSON.stringify(app.simu)); } catch (_) { } }
function peindre() {
  const svg = $('svg');
  $('vide').hidden = app.contrat.liaisons.length > 0;
  if (!app.dessin) { svg.innerHTML = ''; appliquerVue(); return; }
  svg.innerHTML = styleDessin() + `<g id="scene" transform="translate(${app.vue.tx},${app.vue.ty}) scale(${app.vue.s})">`
    + sceneSvg(app.dessin, app.contrat.cartouche, folioCourant(), designationDe, app.choisi) + '</g>';
  appliquerVue();
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
const RAIL = 52;
function marges() { const tel = telephone(), folios = !$('folios').hidden;
  const doc = !$('base').hidden ? $('base') : (!$('fiche').hidden ? $('fiche') : null);
  if (tel) return { haut: 16, bas: (doc ? doc.offsetHeight + 8 : 8) + 56 + (folios ? 52 : 0), gauche: 12, droite: 12 };
  return { haut: 28, bas: folios ? 72 : 28, gauche: 12 + RAIL + 16, droite: 28 + (doc ? doc.offsetWidth + 24 : 0) }; }
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
/* Aller voir quelque chose : on le met au centre du vide, lisible. */
function centrerSur(x, y, w, h) { const r = cadre(), m = marges();
  const s = Math.max(app.vue.s, Math.min(1.1, Math.min((r.width - m.gauche - m.droite) / (w + 80), (r.height - m.haut - m.bas) / (h + 80))));
  const cx = m.gauche + (r.width - m.gauche - m.droite) / 2, cy = m.haut + (r.height - m.haut - m.bas) / 2;
  animerVue({ s, tx: cx - (x + w / 2) * s, ty: cy - (y + h / 2) * s }, true); }
function viser(nom) { const c = app.dessin && app.dessin.compDe.get(nom); if (!c) return false;
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
  sc.querySelectorAll('.comp').forEach(g => { if (noms.has(g.dataset.name)) g.classList.add('hl'); }); }
const allumerFil = f => allumerFils([f]);
/* Ce qui est choisi reste allumé après un survol ou un redessin ; la ligne
   qu'on écrit passe devant. */
function rallumer() { const c = app.cible, w = app.actif && filDe(app.actif);
  if (w) allumerFil(w);
  else if (c && c.type === 'bloc' && app.dessin && app.dessin.compDe.has(c.nom)) allumerBloc(c.nom);
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
  /* la PRISE d'un bloc (la retouche) : à la souris, appuyer sur un bloc et glisser le déplace ; au doigt, un appui long
     le prend, un glissé simple déplace la vue. `prise` : le bloc, l'ordonnée de départ, le dessin d'avant, sa course */
  let prise = null, long = null, image = 0, dernierBloc = null, dernierAppui = null;
  const prenable = c => c && c.kind !== 'tag' && !c.rail && !estRenvoi(c.name);
  const commencerPrise = () => { const L = liaisonsDuPlan(), cle = L.length ? clePlacement(L) : null; if (!cle) return false;
    const P = placementDe(L), c = P.comps.find(k => k === prise.c) || null; if (!c) return false;
    const tags = pastillesCollees(P.comps, c);
    Object.assign(prise, { cle, P, avant: app.retouches.get(cle) || null, course: courseDuBloc(P, c), aimants: aimantsDuBloc(P, c, tags), dy: 0 });
    histPush('déplacer ' + c.name); mode = 'bloc'; stage.classList.add('deplace'); eteindre(); return true; };
  const suitPrise = e => { const w = versMonde(e.clientX, e.clientY); let dy = Math.round((w.y - prise.wy) * 2) / 2;
    const tol = Math.max(2, Math.min(14, 6 / app.vue.s)), a = prise.aimants.filter(d => Math.abs(d - dy) <= tol).sort((u, v) => Math.abs(u - dy) - Math.abs(v - dy))[0];
    if (a != null) dy = a;
    dy = Math.max(prise.course[0], Math.min(prise.course[1], dy)); if (dy === prise.dy) return; prise.dy = dy;
    cancelAnimationFrame(image); image = requestAnimationFrame(() => { app.retouches.set(prise.cle, dy ? deplacerBloc(prise.P, prise.c, dy) : (prise.avant || deplacerBloc(prise.P, prise.c, 0)));
      calculer(); peindre(); }); };
  const finPrise = () => { cancelAnimationFrame(image); stage.classList.remove('deplace');
    if (!prise.dy) { if (prise.avant) app.retouches.set(prise.cle, prise.avant); else app.retouches.delete(prise.cle); app.hist.pop(); synchroniserHistorique(); }
    else { app.retouches.set(prise.cle, deplacerBloc(prise.P, prise.c, prise.dy)); garderRetouche(prise.cle); dire(prise.c.name + ' déplacé · Ctrl+Z pour défaire, « automatique » pour tout rétablir'); }
    calculer(); peindre(); synchroniser(); rallumer(); prise = null; };
  stage.addEventListener('pointerdown', e => { if (e.button && e.button !== 0) return; fermerMenu(); fermerRecherche();
    try { stage.setPointerCapture(e.pointerId); } catch (_) { }
    pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY }); clearTimeout(long);
    if (pointeurs.size >= 2) { prise = null; debutPinch(); return; }
    bouge = false; origine = [e.clientX, e.clientY]; mode = 'pan'; pan = { tx: app.vue.tx, ty: app.vue.ty, x: e.clientX, y: e.clientY };
    const w = versMonde(e.clientX, e.clientY), c = blocSous(w); prise = prenable(c) ? { c, wy: w.y } : null;
    if (!dernierBloc || Date.now() - dernierBloc.t > 800) dernierBloc = c ? { nom: c.name, t: Date.now() } : null;   // le premier appui d'un double-clic fait foi
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
      const t = Date.now(), d = dernierAppui; dernierAppui = { t, x: e.clientX, y: e.clientY };
      if (d && t - d.t < 400 && Math.abs(e.clientX - d.x) < 8 && Math.abs(e.clientY - d.y) < 8) { dernierAppui = null; doubleAppui(e); }
      else cliquer(versMonde(e.clientX, e.clientY)); }
    mode = null; pan = null; prise = null; };
  // double appui : sur une barrette ou une prise, sa vue en relief ; ailleurs, on zoome
  const doubleAppui = e => { const c = blocSous(versMonde(e.clientX, e.clientY)), nom = dernierBloc && Date.now() - dernierBloc.t < 800 ? dernierBloc.nom : c && c.name;
    if (nom && reliefPossible(nom)) { ouvrirRelief(nom); return; }
    const r = cadre(); zoomer(1.6, e.clientX - r.left, e.clientY - r.top); };
  stage.addEventListener('pointerup', fin); stage.addEventListener('pointercancel', fin);
  stage.addEventListener('mousemove', e => { if (mode || pointeurs.size) return;
    const c = blocSous(versMonde(e.clientX, e.clientY)); const nm = c ? c.name : null;
    if (nm !== survole) { survole = nm; if (nm) allumerBloc(nm); else rallumer(); } });
  stage.addEventListener('mouseleave', () => { if (!mode) { survole = null; rallumer(); } });
  stage.addEventListener('wheel', e => { e.preventDefault(); const r = cadre(); zoomer(Math.exp(-e.deltaY * 0.0014), e.clientX - r.left, e.clientY - r.top); }, { passive: false });

}
/* Un clic sur la planche : un bloc, un renvoi, un fil, ou le vide. */
function cliquer(w) { const c = blocSous(w);
  if (c) { if (estRenvoi(c.name)) { const t = c.name.replace(RENVOI, ''); if (plans().includes(t)) allerAuPlan(t); return; }
    if (c.rail) return; choisirBloc(c); return; }
  const f = filSous(w); if (f) choisirFil(f); else deselectionner(); }
/* Choisir un bloc : la base se filtre sur lui — c'est sa fiche. */
function choisirBloc(c) { app.choisi = c.name; app.cible = { type: 'bloc', nom: c.name }; app.base.filtre = c.name; app.base.defiler = true;
  peindre(); ouvrirBase(); rendreBase(); allumerBloc(c.name); }
/* Choisir un fil : sa ligne se marque et vient sous les yeux. */
function choisirFil(f) { const l = liaisonsDuPlan()[f.i]; if (!l) return; const src = sourceDe(l) || l;
  if (app.choisi) { app.choisi = null; peindre(); }
  app.cible = { type: 'fil', l: src }; app.base.defiler = true;
  if (!lignesVisibles().some(([x]) => x === src)) app.base.filtre = '';
  ouvrirBase(); rendreBase(); allumerFil(f); }
function deselectionner() { const c = app.cible;
  if (c) { app.cible = null; if (app.choisi) { app.choisi = null; peindre(); }
    if (c.type === 'bloc' && app.base.filtre === c.nom) app.base.filtre = '';
    rendreBase(); eteindre(); }
  if (app.fiche) fermerFiche(true); }

/* ---- les folios : y aller, les montrer --------------------------------- */
function allerAuPlan(plan) { if (plan === app.plan) return; app.plan = plan; app.choisi = null; fermerFiche(); redessiner(); ajuster(); }
function allerAuFolio(pas) { const P = plans(); let i = P.indexOf(app.plan);
  if (i < 0) i = pas > 0 ? -1 : P.length; i += pas; if (i < 0 || i >= P.length) return; allerAuPlan(P[i]); }
function plansDuRepere(nom) { return [...new Set(app.contrat.liaisons.filter(l => l.de === nom || l.vers === nom).map(l => l.plan).filter(Boolean))]; }
function plansDuFil(cable) { return [...new Set(app.contrat.liaisons.filter(l => l.cable === cable).map(l => l.plan).filter(Boolean))]; }
function synchroniserFolios() { const P = plans(), strip = $('fo-strip');
  // la barre du bas reste (cadrage, zoom) ; la partie folios ne se montre qu'à plusieurs feuilles
  $('fo-part').hidden = P.length < 2;
  if (app.plan !== '*' && !P.includes(app.plan)) app.plan = P.length > 1 ? P[0] : '*';
  const i = P.indexOf(app.plan);
  strip.innerHTML = P.length < 2 ? '' : P.map(p => `<button class="chip${p === app.plan ? ' on' : ''}" data-plan="${escA(p)}" aria-label="Folio ${escA(p)}"${p === app.plan ? ' aria-current="page"' : ''}>${esc(p)}</button>`).join('');
  $('fo-lbl').textContent = i < 0 ? (P.length > 1 ? 'tout' : '1 / 1') : (i + 1) + ' / ' + P.length;
  // une seule feuille : les flèches n'ont nulle part où aller
  const seul = P.length < 2; $('fo-prev').disabled = seul || i === 0; $('fo-next').disabled = seul || (i >= 0 && i >= P.length - 1);
  const on = strip.querySelector('.chip.on'); if (on && on.scrollIntoView) { try { on.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (_) { } } }

/* ---- aller à un repère ou à un fil, même sur un autre folio ------------ */
function aller(cible) { const P = plans(); const nom = cible.nom;
  const ou = cible.type === 'fil' ? plansDuFil(nom) : plansDuRepere(nom);
  if (P.length > 1 && app.plan !== '*' && ou.length && !ou.includes(app.plan)) allerAuPlan(ou[0]);
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
      <span class="genre">${c.type === 'fil' ? 'fil' : 'repère'}</span><span class="nom">${esc(c.nom)}</span><span class="des">${esc(c.des)}</span>${c.n ? `<span class="cpt">${c.n} fil${c.n > 1 ? 's' : ''}</span>` : ''}</button>`).join('')
    : '<div class="q-rien">Rien qui corresponde.</div>'; }
/* La fenêtre de recherche s'ouvre à côté du rail, par le bouton ou « / »,
   et disparaît sitôt qu'on a trouvé ou qu'on regarde ailleurs. */
function ouvrirRecherche() { document.body.classList.add('cherche'); const q = $('q'); q.focus(); q.select(); if (q.value.trim()) montrerCandidats(); }
function fermerRecherche() { $('q-liste').hidden = true; document.body.classList.remove('cherche'); }
const rechercheOuverte = () => document.body.classList.contains('cherche');
function lierRecherche() { const q = $('q'), box = $('q-liste');
  q.addEventListener('input', () => { qSel = 0; montrerCandidats(); });
  q.addEventListener('focus', () => { document.body.classList.add('cherche'); if (q.value.trim()) montrerCandidats(); });
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
function lignesVisibles() { const V = verite(), f = app.base.filtre.trim().toLowerCase(), C = colonnes();
  let L = V.map((l, i) => [l, i]); if (f) L = L.filter(([l]) => C.some(c => String(l[c.k]).toLowerCase().includes(f)));
  const tri = app.base.tri; if (!tri) return L;
  const cmp = (a, b) => { const x = a[0][tri.k], y = b[0][tri.k], nx = parseFloat(x), ny = parseFloat(y);
    return (!isNaN(nx) && !isNaN(ny) && String(nx) === x && String(ny) === y) ? nx - ny : String(x).localeCompare(String(y), 'fr', { numeric: true }); };
  return L.sort((a, b) => tri.sens * cmp(a, b) || a[1] - b[1]); }
function ligneChoisie(l) { const c = app.cible; if (!c) return false;
  return c.type === 'fil' ? c.l === l : (l.de === c.nom || l.vers === c.nom); }
function rendreLigne(l, i, folios) { const c = app.cible, mode = modeFolio();
  const surCeFolio = app.plan === '*' || (mode === 'auto' ? (folios.get(cleDe(l)) || []).includes(app.plan) : l.plan === app.plan);
  const cell = col => { if (col.k === 'plan' && mode === 'auto') return `<td class="n">${(folios.get(cleDe(l)) || []).map(p => `<button class="f" data-plan="${escA(p)}" title="Aller au folio ${escA(p)}">${esc(p)}</button>`).join('')}</td>`;
    return `<td${col.cls ? ` class="${col.cls}"` : ''}><input data-i="${i}" data-f="${col.k}" value="${escA(l[col.k])}" aria-label="${col.lib}, ligne ${i + 1}" spellcheck="false" autocomplete="off"></td>`; };
  return `<tr data-i="${i}" class="${ligneChoisie(l) ? 'on' : ''}${surCeFolio && liaisonComplete(l) ? '' : ' hors'}"><td class="g"><button data-voir="${i}" title="${surCeFolio ? 'Voir ce fil sur le plan' : 'Ce fil n’est pas sur ce folio'}">${i + 1}</button></td>`
    + colonnes().map(cell).join('') + `<td class="x"><button data-x="${i}" aria-label="Supprimer la ligne ${i + 1}">×</button></td></tr>`; }
/* Tout le panneau se déduit de `app` ; le tableau n'est pas refait tant
   qu'on y écrit (voir rafraichirBase). */
function rendreBase() { const b = app.base; b.sale = false; if ($('base').hidden) { b.sale = true; return; }
  const V = verite(), vues = lignesVisibles(), folios = foliosParSource(), tri = b.tri;
  $('ba-titre').innerHTML = vues.length === V.length ? `<b>${V.length}</b> liaison${V.length > 1 ? 's' : ''}` : `<b>${vues.length}</b> sur ${V.length}`;
  const fi = $('ba-filtre'); if (fi.value !== b.filtre) fi.value = b.filtre; $('ba-vider').hidden = !b.filtre;
  $('ba-thead').innerHTML = '<tr><th title="Numéro de ligne">#</th>' + colonnes().map(c => `<th data-k="${c.k}" class="${tri && tri.k === c.k ? 'tri' : ''}" title="Trier par ${escA(c.lib)}">${c.lib}${tri && tri.k === c.k ? `<span class="sens">${tri.sens > 0 ? '▲' : '▼'}</span>` : ''}</th>`).join('') + '<th></th>';
  $('ba-tbody').innerHTML = vues.slice(0, CAP_LIGNES).map(([l, i]) => rendreLigne(l, i, folios)).join('')
    + (vues.length > CAP_LIGNES ? `<tr class="reste"><td colspan="${colonnes().length + 2}">… et ${vues.length - CAP_LIGNES} autres lignes — affine le filtre.</td></tr>` : '')
    + (!vues.length ? `<tr class="reste"><td colspan="${colonnes().length + 2}">${V.length ? 'Rien qui corresponde au filtre.' : 'Aucune liaison. Ajoute une ligne, ou dépose un fichier.'}</td></tr>` : '');
  rendreEquip();
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
const pluriel = (n, mot) => n + ' ' + mot + (n > 1 ? 's' : '');
/* L'équipement choisi, au-dessus de ses fils : son repère, ce qu'on écrit
   dessous, et ce que le contrat sait de lui — ses connecteurs ; pour une
   barrette ou une prise de coupure, son dessin physique, puis sa référence. */
function rendreEquip() { const box = $('ba-equip'), c = app.cible; box.hidden = !(c && c.type === 'bloc'); if (box.hidden) return;
  const nom = c.nom, V = verite(), n = V.filter(l => l.de === nom || l.vers === nom).length;
  const bornier = estBornier(nom), b = bornier ? besoinsDeBarrette(nom, V) : null;
  // la physique de la référence retenue, puis chaque fil dans son trou selon la norme
  const enModules = barretteEnModules(nom), coupure = !enModules && coupureEnModules(nom), cavites = !bornier && cavitesDe(nom).length > 0;
  const P = bornier && !enModules && !coupure ? remplirSelonNorme(physiqueDeBarrette(nom, V, app.bible, app.contrat.designations.get(nom) || ''), app.norme) : null;
  const tete = esc(enModules ? 'barrette · modules de jonction' : coupure ? 'prise de coupure · ' + (nomDeFamille(app.norme, planDeCoupure(nom).plan.famille) || 'module de connecteur') : P ? P.nature : natureDe(nom) + (cavites ? ' · connecteur ' + [...new Set(cavitesDe(nom).map(c => nomDeFamille(app.norme, c.plan.famille)))].join(', ') : '')) + ' · ' + pluriel(n, 'fil') + (b && b.shunts ? ' · ' + pluriel(b.shunts, 'shunt') : '');
  box.innerHTML = `<div class="sur">${tete}</div>
    <div class="actions">${bornier || cavites ? '<button class="btn lien" id="eq-relief" title="La pièce en perspective, chaque fil dans son trou (ou double-clic sur le bloc)">Voir en relief</button>' : ''}<button class="btn lien danger" id="eq-del" title="Supprimer l’équipement et ses fils">Supprimer</button></div>
    <input class="rep" id="eq-rep" value="${escA(nom)}" aria-label="Repère" title="Renommer : chaque fil suit" spellcheck="false">`
    + (bornier ? '' : `<input class="des" id="eq-des" value="${escA(app.contrat.designations.get(nom) || '')}" placeholder="Désignation, écrite sous le repère" aria-label="Désignation" spellcheck="false">`)
    + (enModules ? carteModules(nom) : coupure ? carteCoupureModules(nom) : bornier ? cartePhysique(nom, P, b) : carteConnecteurs(nom) + carteCavites(nom));
  $('eq-rep').addEventListener('change', e => { const nr = e.target.value.trim(); if (!nr || nr === nom) { e.target.value = nom; return; }
    histPush('renommage de ' + nom); renommer(nom, nr); app.choisi = nr; app.cible = { type: 'bloc', nom: nr }; app.base.filtre = nr; apresEdition(); });
  if ($('eq-des')) $('eq-des').addEventListener('change', e => { histPush('désignation de ' + nom); designer(nom, e.target.value.trim()); apresEdition(); });
  $('eq-del').onclick = () => { if (!confirm('Supprimer « ' + nom + ' » et ses ' + n + ' liaison(s) ?')) return;
    histPush('suppression de ' + nom); supprimerEquipement(nom); app.base.filtre = ''; apresEdition(); dire(nom + ' supprimé.'); };
  if (enModules) lierCarteModules(nom); else if (coupure || cavites) lierCarteContacts(nom); else if (bornier) lierCartePhysique(nom);
  if ($('eq-relief')) $('eq-relief').onclick = () => ouvrirRelief(nom);
  box.querySelectorAll('input').forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } })); }
/* La carte se redessine quand la place change (fenêtre, poignée), jamais
   sous les doigts de qui y écrit. */
function rafraichirCarte() { const box = $('ba-equip'); if (box.hidden || !(app.cible && app.cible.type === 'bloc') || box.contains(document.activeElement)) return; rendreEquip(); }
/* Les connecteurs : « A · *704A46220028 · bornes A3, A4 », une ligne chacun.
   Une borne qui ne dit pas son connecteur (« 12 », sans part number) n'en fait pas. */
function carteConnecteurs(nom) { const C = connecteursDe(nom, verite()).filter(c => c.nom); if (!C.length) return '';
  return `<div class="conns">` + C.map(c => `<div class="conn"><b>${esc(c.nom)}</b>${c.pn && c.pn !== c.nom ? ` · <span class="pn">${esc(c.pn)}</span>` : ''}`
    + ` · borne${c.bornes.length > 1 ? 's' : ''} <span class="b">${esc(c.bornes.slice().sort(triNaturel).join(', '))}</span></div>`).join('') + '</div>'; }
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
const MOTS_VERDICT = { ok: 'ok', jauge: 'jauge hors plage', fil: 'dépasse le fil', contact: 'dépasse le contact', chute: 'chute trop forte', inconnu: 'fil inconnu de la norme' };
const dec = (x, n) => x == null ? '—' : x.toFixed(n).replace('.', ',');
function carteSimulation(nom, P, S) { const H = S.hyp, V = verite(), N = app.norme || normeVide();
  const conds = N.declassements.map(d => `<label class="hyp-c"><input type="checkbox" data-cond="${escA(d.condition)}"${H.conditions.includes(d.condition) ? ' checked' : ''}><span>${esc(d.condition)} ×${nombre(d.facteur)}</span></label>`).join('');
  const champ = (id, lib, val, unite, pas) => `<label class="hyp-n"><span>${lib}</span><input id="${id}" type="number" inputmode="decimal" step="${pas}" min="0" value="${val}" aria-label="${lib} (hypothèse)"><span class="u">${unite}</span></label>`;
  let s = `<div class="simu"><div class="simu-tete"><span class="sur">Simulation</span><span class="simu-note">hypothèses, pas des mesures : le retest ne porte ni longueur ni courant</span></div>
    <div class="hyp">${champ('si-L', 'longueur', H.longueur, 'm', '0.5')}${champ('si-I', 'courant', H.courant, 'A', '0.5')}${champ('si-U', 'tension', H.tension, 'V', '1')}${conds}</div>`;
  if (S.sansNorme) return s + `<p class="simu-vide">Aucune norme ne connaît cette famille ni ces fils : rien n’est calculé. Importe une norme depuis la bible.</p></div>`;
  if (!S.lignes.length) return s + `<p class="simu-vide">Aucun fil dans un trou : rien à simuler.</p></div>`;
  const ligne = x => { const i = V.indexOf(x.l), dest = x.vers + (x.borneVers ? ':' + x.borneVers : '');
    return `<tr class="fil sim-${x.verdict}" data-i="${i}" data-fils="${i}" data-borne="${escA(x.borne)}" tabindex="0" role="button" aria-label="${escA('Voir le fil ' + x.cable + ' sur le plan')}"><td class="c">${esc(x.borne)}<span class="sens">${x.sens === 'amont' ? '↓ ' + (P.cotes.amont === 'fiche' ? 'fiche' : 'amont') : '↑ ' + (P.cotes.aval === 'embase' ? 'embase' : 'aval')}</span>${x.surcharge ? '<span class="ko">surcharge</span>' : ''}</td>`
      + `<td class="m"><b>${esc(x.cable)}</b><span class="dest">${esc(dest)}</span></td><td class="m${x.jaugeOk === false ? ' ko' : ''}">${esc(x.type || '—')}${x.jaugeOk === false ? '<span class="ko">hors plage</span>' : x.approx ? '<span class="att">jauge seule</span>' : ''}</td>`
      + `<td class="d">${x.iFil == null ? '—' : dec(x.iFil, 1)} / ${x.iContact == null ? '—' : dec(x.iContact, 1)}</td><td class="d">${x.dU == null ? '—' : dec(x.dU, 2) + ' V<span class="sep"> · </span><span class="pct">' + dec(x.pct, 1) + ' %</span>'}</td><td><span class="verdict v-${x.verdict}">${MOTS_VERDICT[x.verdict]}</span></td></tr>`; };
  const bilan = Object.entries(S.compte).map(([v, n]) => `<span class="verdict v-${v}">${n} ${MOTS_VERDICT[v]}</span>`).join(' ');
  const ex = S.lignes.find(x => x.dU != null);
  const calcul = ex ? `<div class="calcul"><b>${esc(ex.cable)}</b> : (${nombre(ex.fil.resistance)} Ω/km × ${nombre(H.longueur)} m + ${nombre(S.rContact * 1000)} mΩ) × ${nombre(H.courant)} A = <b>${dec(ex.dU, 3)} V</b>, soit ${dec(ex.pct, 2)} % de ${nombre(H.tension)} V` + (S.chute && S.chute.chuteMax != null ? ` — admis : ${nombre(S.chute.chuteMax)} V` : '') + '</div>' : '';
  s += `<div class="simu-defile"><table class="simu-tab"><thead><tr><th>contact</th><th>fil</th><th>type</th><th title="Intensité admissible du fil (déclassée) / du contact">I fil / contact (A)</th><th title="Chute de tension sur la longueur d’hypothèse">ΔU</th><th>verdict</th></tr></thead><tbody>${S.lignes.map(ligne).join('')}</tbody></table></div>
    <div class="bilan">${bilan}</div>
    <div class="formule">ΔU = (ρ × L + R<sub>contact</sub>) × I — ρ la résistance du fil (norme), L la longueur, R<sub>contact</sub> celle du contact (${S.rContact ? nombre(S.rContact * 1000) + ' mΩ' : 'inconnue'}), I le courant. I fil = intensité du fil × ${nombre(S.facteur)} (déclassement)${S.iContact != null ? ' ; contact ' + nombre(S.iContact) + ' A' : ''}. Les ponts ne sont pas des fils dans un trou : ils ne sont pas simulés.</div>${calcul}</div>`;
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
  const norme = $('bar-norme'); if (norme) norme.onclick = () => { app.base.normeOuverte = true; ficheBible(''); };
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
/* Une hypothèse changée : elle est gardée, la carte se refait, le champ
   garde la main. */
function lierHypotheses(box) { const H = app.simu;
  const refaire = id => { memoriserSimu(); rendreEquip(); const el = id && $(id); if (el) el.focus(); };
  [['si-L', 'longueur'], ['si-I', 'courant'], ['si-U', 'tension']].forEach(([id, k]) => { const el = $(id); if (!el) return;
    el.addEventListener('change', () => { const v = parseFloat(String(el.value).replace(',', '.')); if (isNaN(v) || v < 0) { el.value = H[k]; return; } if (v === H[k]) return; H[k] = v; refaire(id); }); });
  box.querySelectorAll('.hyp input[data-cond]').forEach(el => el.addEventListener('change', () => { const c = el.dataset.cond;
    H.conditions = el.checked ? [...new Set([...H.conditions, c])] : H.conditions.filter(x => x !== c); refaire(); })); }
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
function defsPhysique() { return '<defs><pattern id="phy-hachure" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#eef1f5"/><line x1="0" y1="0" x2="0" y2="6" stroke="#c9d1d9" stroke-width="2"/></pattern></defs>'; }
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
  const w = filDe(l); if (w) { allumerFil(w); viserFil(w); } marquerLignes(); }
/* Le même geste depuis la carte d'une barrette : le bloc reste choisi, sa
   carte reste ; on va seulement voir le fil, même sur un autre folio. */
function voirFilDeCarte(i) { const l = verite()[i]; if (!l) return;
  const ou = foliosDe(l);
  if (app.plan !== '*' && ou.length && !ou.includes(app.plan)) { allerAuPlan(ou[0]); if (app.cible && app.cible.type === 'bloc') { app.choisi = app.cible.nom; peindre(); } }
  const w = filDe(l); if (w) { allumerFil(w); viserFil(w); } else dire('Ce fil n’est pas dessiné sur ce folio.'); }
function lierBase() { const t = $('ba-tab'), corps = $('ba-tbody'), fi = $('ba-filtre'); let sT, fT;
  fi.addEventListener('input', () => { clearTimeout(fT); fT = setTimeout(() => { app.base.filtre = fi.value;
    const c = app.cible; if (c && c.type === 'bloc' && fi.value.trim() !== c.nom) { app.cible = null; app.choisi = null; peindre(); }
    rendreBase(); rallumer(); }, 150); });
  fi.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); if (fi.value) { fi.value = ''; fi.dispatchEvent(new Event('input')); } else fi.blur(); } });
  $('ba-vider').onclick = () => { fi.value = ''; fi.dispatchEvent(new Event('input')); fi.focus(); };
  $('ba-fermer').onclick = fermerBase;
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
/* La poignée : la base se règle en largeur (à droite) ou en hauteur (en tiroir). */
function lierPoignee() { const p = $('ba-poignee'), b = $('base'); let actif = false;
  p.addEventListener('pointerdown', e => { actif = true; b.classList.add('redim'); try { p.setPointerCapture(e.pointerId); } catch (_) { } e.preventDefault(); });
  p.addEventListener('pointermove', e => { if (!actif) return;
    if (telephone()) { app.base.hauteur = Math.round(Math.max(160, Math.min(window.innerHeight * 0.85, window.innerHeight - e.clientY))); }
    else { app.base.largeur = Math.round(Math.max(340, Math.min(window.innerWidth * 0.7, window.innerWidth - 12 - e.clientX))); }
    appliquerTailleBase(); });
  const fin = () => { if (!actif) return; actif = false; b.classList.remove('redim'); memoriserBase(); ajuster(true); rafraichirCarte(); };
  p.addEventListener('pointerup', fin); p.addEventListener('pointercancel', fin); }
function appliquerTailleBase() { const r = document.documentElement.style;
  if (app.base.largeur) r.setProperty('--base-l', app.base.largeur + 'px'); if (app.base.hauteur) r.setProperty('--base-h', app.base.hauteur + 'px'); }
function ouvrirBase() { if (app.base.ouvert) return; app.base.ouvert = true; fermerFiche();
  const b = $('base'); b.hidden = false; b.classList.remove('entre'); void b.offsetWidth; b.classList.add('entre');
  document.body.classList.add('base-ouverte'); $('btnBase').setAttribute('aria-pressed', 'true');
  rendreBase(); memoriserBase(); ajuster(true); }
function fermerBase() { if (!app.base.ouvert) return; app.base.ouvert = false;
  $('base').hidden = true; document.body.classList.remove('base-ouverte'); $('btnBase').setAttribute('aria-pressed', 'false');
  if (app.cible) { app.cible = null; if (app.choisi) { app.choisi = null; peindre(); } eteindre(); }
  memoriserBase(); ajuster(true); }
function basculerBase() { if (app.base.ouvert) fermerBase(); else if (app.contrat.liaisons.length || verite().length) ouvrirBase(); else dire('Rien à montrer : dépose d’abord un fichier.'); }
/* Ouverte ou non, sa taille : une commodité de ce navigateur, rien de plus. */
function memoriserBase() { try { localStorage.setItem(CLE_BASE, JSON.stringify({ ouvert: app.base.ouvert, largeur: app.base.largeur, hauteur: app.base.hauteur })); } catch (_) { } }
function relireBase() { let o = null; try { o = JSON.parse(localStorage.getItem(CLE_BASE) || 'null'); } catch (_) { }
  if (o) { app.base.largeur = o.largeur || 0; app.base.hauteur = o.hauteur || 0; } appliquerTailleBase();
  return o ? !!o.ouvert : !telephone(); }   // au premier lancement, la base est là sur un grand écran

/* ---- la fiche : cartouche, collage, bible — les documents rares --------- */
function ouvrirFiche(mode, corps, pied) { const f = $('fiche'); fermerBase();
  $('fiche-corps').innerHTML = corps; const p = $('fiche-pied'); p.innerHTML = pied || ''; p.hidden = !pied;
  const nouveau = f.hidden || !app.fiche || app.fiche.mode !== mode.mode;
  const r = document.documentElement.style; r.setProperty('--fiche-l', (mode.large ? 560 : 400) + 'px');
  f.hidden = false; if (nouveau) { f.classList.remove('entre'); void f.offsetWidth; f.classList.add('entre'); }
  app.fiche = mode; $('fiche-corps').scrollTop = 0;
  // sur téléphone la fiche monte en tiroir : le rail et les folios se posent au-dessus d'elle
  document.body.classList.add('fiche-ouverte'); r.setProperty('--fiche-h', f.offsetHeight + 'px');
  $('fi-fermer').onclick = () => fermerFiche(true); if (nouveau) ajuster(true); }
/* `recadrer` : quand on ferme la fiche pour elle-même, le plan reprend la place. */
function fermerFiche(recadrer) { const f = $('fiche'); if (f.hidden && !app.fiche) return; f.hidden = true; app.fiche = null;
  document.body.classList.remove('fiche-ouverte'); if (recadrer) ajuster(true); }
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
/* La bible des barrettes : d'où elle vient, ce qu'elle contient, et comment
   en mettre une autre ; puis la NORME en cours, table par table, et comment
   en importer une. */
const COLONNES_BIBLE_TEXTE = '<b>Référence</b> et <b>Bornes</b> au minimum, puis Famille, Nature, Jauge min, Jauge max, Intensité, Blindage, Note';
const COLONNES_NORME_TEXTE = 'une table <b>Familles</b> (Famille, Pas, Jauge min, Jauge max, Intensité, Résistance, Fils par côté, Ordre, Paquets, Réservés, Masse), une table <b>Fils</b> (Type, Jauge, Section, Résistance, Intensité), <b>Déclassement</b> (Condition, Facteur), <b>Réseau</b> (Tension, Chute max)';
/* `ref` : une référence à montrer en grand, au-dessus de la table — celle
   qu'on a cliquée dans la table, ou depuis la carte d'une barrette. */
function ficheBible(ref) { const B = app.bible || [], nom = app.bibleNom, n = B.length, familles = [...new Set(B.filter(e => e.module).map(e => e.famille))]; ref = typeof ref === 'string' ? ref : '';
  const zoom = ref ? B.find(e => e.reference === ref) || null : null;
  const etat = nom ? `<div class="bible-etat"><span><b>${esc(nom)}</b> · ${pluriel(n, 'référence')} · gardée dans ce navigateur</span></div>`
    : (() => { const compte = fs => fs.map(f => pluriel(B.filter(e => e.module && e.famille === f).length, 'module') + ' ' + nomDeFamille(app.norme, f)).join(' et '), bar = famillesDeModules(app.norme), con = famillesDeModules(app.norme, 'connecteur');
        return `<div class="bible-etat exemple"><span><b>Bible de l’outil</b> · pour les barrettes, ${compte(bar.filter(f => familles.includes(f)))}${con.length ? ` ; pour les connecteurs et les prises de coupure, ${compte(con.filter(f => familles.includes(f)))}` : ''} — et ${pluriel(B.filter(e => !e.module).length, 'référence')} d’exemple (coupures, connecteurs).</span></div>`; })();
  // un filtre par norme : les modules d'une norme, ou le reste (coupures, connecteurs)
  const filtre = app.base.bibleFiltre || '', garde = e => !filtre || (filtre === '-' ? !e.module : e.module && e.famille === filtre), vus = B.filter(e => garde(e) || e === zoom);
  const filtres = B.some(e => e.module) ? `<div class="bible-filtres" role="group" aria-label="Filtrer la bible">` + [['', 'tout', n], ...familles.map(f => [f, nomDeFamille(app.norme, f), B.filter(e => e.module && e.famille === f).length]), ['-', 'coupures et connecteurs', B.filter(e => !e.module).length]]
    .map(([f, t, k]) => `<button class="mj-norme ${f && f !== '-' ? classeFamille(f) : ''}" data-filtre="${escA(f)}" aria-pressed="${filtre === f}">${esc(t)} · ${k}</button>`).join('') + '</div>' : '';
  const ligne = e => `<tr class="${e === zoom ? 'on' : ''}"><td class="pict">${pictoBible(e)}</td><td class="ref"><button class="ref-btn" data-ref="${escA(e.reference)}" aria-pressed="${e === zoom}" title="${e === zoom ? 'Replier' : 'Voir la référence en grand'}">${esc(e.reference)}</button></td>
    <td class="sans">${esc(e.nature)}</td><td class="d">${nombre(e.bornes)}</td>
    <td class="d">${jaugeEntree(e)}</td><td class="d">${e.intensite != null ? nombre(e.intensite) + ' A' : '—'}</td><td>${e.blindage ? 'oui' : '—'}</td><td class="bible-note">${esc(e.note)}</td></tr>`;
  const corps = tete('Barrettes et connecteurs', 'Bible des barrettes', true) + etat + (zoom ? zoomBible(zoom) : '') + filtres
    + (n ? `<table class="bible"><thead><tr><th></th><th>Référence</th><th>Nature</th><th>Bornes</th><th>Jauge</th><th title="Intensité">Int.</th><th title="Blindage">Blindé</th><th>Note</th></tr></thead><tbody>${vus.map(ligne).join('')}</tbody></table>` : '<p class="note">Aucune référence.</p>')
    + `<p class="note">Un Excel ou un CSV dont une ligne d’en-têtes nomme ${COLONNES_BIBLE_TEXTE}. La jauge s’écrit en AWG : « min » est la plus fine acceptée. Une bible se dépose aussi directement sur la table.</p>`
    + ficheNorme();
  const pied = '<button class="btn cuivre" id="bi-importer">Importer un Excel / CSV</button><button class="btn papier" id="no-importer">Importer une norme</button><input type="file" id="fichier-norme" accept=".csv,.tsv,.txt,.xlsx,.xlsm,.xls" hidden><span class="espace"></span>'
    + (nom ? '<button class="btn lien" id="bi-exemple">Revenir à la bible d’exemple</button>' : '') + (app.normeNom ? '<button class="btn lien" id="no-embarquee">Revenir à la norme embarquée</button>' : '');
  ouvrirFiche({ mode: 'bible', large: true, ref: zoom ? ref : '' }, corps, pied);
  $('bi-importer').onclick = () => $('fichier-bible').click();
  $('no-importer').onclick = () => $('fichier-norme').click();
  $('fichier-norme').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) importerNorme(f); e.target.value = ''; });
  if ($('bi-exemple')) $('bi-exemple').onclick = () => { adopterBible(bibleDeLOutil(), ''); dire('Bible d’exemple rétablie.'); };
  if ($('no-embarquee')) $('no-embarquee').onclick = () => { adopterNorme(normeEmbarquee(), ''); dire('Norme embarquée rétablie.'); };
  const det = $('fiche-corps').querySelector('details.norme'); if (det) det.addEventListener('toggle', () => { app.base.normeOuverte = det.open; });
  $('fiche-corps').querySelectorAll('.ref-btn').forEach(b => b.onclick = () => ficheBible(b.getAttribute('aria-pressed') === 'true' ? '' : b.dataset.ref));
  if ($('bz-fermer')) $('bz-fermer').onclick = () => ficheBible('');
  $('fiche-corps').querySelectorAll('.bible-filtres .mj-norme').forEach(b => b.onclick = () => { app.base.bibleFiltre = b.dataset.filtre; ficheBible(zoom ? ref : ''); });
}
/* La norme en cours : d'où elle vient, puis ses quatre tables telles que
   l'outil les a lues — repliées, ouvertes depuis la carte d'une barrette. */
function ficheNorme() { const N = app.norme || normeVide(), nom = app.normeNom, ex = normeExemple(N), lue = normeLue(N), mods = N.modules || [], tailles = N.tailles || [];
  const compte = [...(mods.length ? [pluriel(mods.length, 'module') + ' de jonction'] : []), pluriel(N.familles.length, 'famille'), pluriel(N.fils.length, 'fil'), pluriel(N.declassements.length, 'déclassement'), N.reseau.length + ' réseau' + (N.reseau.length > 1 ? 'x' : '')].join(' · ');
  const etat = !lue ? `<div class="bible-etat"><span><b>Aucune norme</b> : les barrettes se dessinent avec un trou par côté, rien n’est jugé ni simulé.</span></div>`
    : nom ? `<div class="bible-etat"><span><b>${esc(nom)}</b> · ${compte} · gardée dans ce navigateur</span></div>`
    : `<div class="bible-etat exemple"><span><b>Norme ${ex ? 'd’exemple' : 'embarquée'}</b> · ${compte}${ex ? ' · chiffres inventés, sans valeur normative — les vraies se déposent dans normes/'
      : mods.length ? ' · les modules viennent des normes ASNE 0599 et NSA937901 (plages AWG des contacts ASNE 0599 à confirmer) ; fils, déclassements, réseau et prise EN3646 restent des chiffres d’exemple' : ''}</span></div>`;
  const oui = v => v ? 'oui' : '—', t = (th, rows) => rows.length ? `<table class="norme"><thead><tr>${th.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>` : '';
  const familles = t(['Norme', 'Famille', 'Nature', 'Variantes', 'Pas', 'Jauge', 'Intensité', 'Résistance', 'Fils/côté', 'Ordre', 'Paquets', 'Réservés', 'Masse'], N.familles.map(f => `<tr><td class="sans">${esc(f.norme)}</td><td class="ref">${esc(f.famille)}</td><td class="sans">${esc(f.nature)}</td><td>${esc(f.variantes.join(' ') || '—')}</td><td class="d">${f.pas != null ? nombre(f.pas) + ' mm' : '—'}</td><td class="d">${f.jaugeMin != null ? jaugeEntree(f) : '—'}</td><td class="d">${f.intensite != null ? nombre(f.intensite) + ' A' : '—'}</td><td class="d">${f.resistance != null ? nombre(f.resistance) + ' mΩ' : '—'}</td><td class="d">${f.filsParCote}</td><td class="sans">${f.ordre}</td><td class="sans">${f.paquets}</td><td>${esc(f.reserves.join(', ') || '—')}</td><td class="sans">${f.masse || '—'}</td></tr>`));
  const fils = t(['Type', 'Jauge', 'Section', 'Résistance', 'Intensité', 'Note'], N.fils.map(f => `<tr><td class="ref">${esc(f.type)}</td><td class="d">${nombre(f.jauge)}</td><td class="d">${f.section != null ? nombre(f.section) + ' mm²' : '—'}</td><td class="d">${f.resistance != null ? nombre(f.resistance) + ' Ω/km' : '—'}</td><td class="d">${f.intensite != null ? nombre(f.intensite) + ' A' : '—'}</td><td class="sans note-c">${esc(f.note)}</td></tr>`));
  const tl = t(['Norme', 'Taille', 'Jauge', 'Note'], tailles.map(x => `<tr><td class="sans">${esc(nomDeFamille(N, x.famille))}</td><td class="ref">#${x.taille}</td><td class="d">${x.jaugeMin != null ? x.jaugeMin + '–' + x.jaugeMax + ' AWG' : 'câble spécial'}</td><td class="sans note-c">${esc(x.note || '')}</td></tr>`));
  const md = t(['Désignation', 'Variante', 'Contacts', 'Groupes', 'Usage', 'Masse', 'Hauteur', 'Note'], mods.map(m => `<tr><td class="ref">${esc(m.reference)}</td><td>${esc(m.variante)}</td><td class="d">${esc(taillesDe(m))}</td><td class="d">${esc(tailleDesGroupes(m))}</td><td class="sans">${esc(m.usage)}</td><td class="d">${m.poids != null ? nombre(m.poids) + ' g' : '—'}</td><td class="d">${m.hauteur != null ? nombre(m.hauteur) + ' mm' : '—'}</td><td class="sans note-c">${esc(m.note)}</td></tr>`));
  const decl = t(['Condition', 'Facteur', 'Note'], N.declassements.map(d => `<tr><td class="ref">${esc(d.condition)}</td><td class="d">×${nombre(d.facteur)}</td><td class="sans note-c">${esc(d.note)}</td></tr>`));
  const res = t(['Tension', 'Chute max', 'Note'], N.reseau.map(r => `<tr><td class="d">${nombre(r.tension)} V</td><td class="d">${r.chuteMax != null ? nombre(r.chuteMax) + ' V' : '—'}${r.chutePct != null ? ' · ' + nombre(r.chutePct) + ' %' : ''}</td><td class="sans note-c">${esc(r.note)}</td></tr>`));
  return `<h3 class="sous-titre">La norme</h3>${etat}` + (lue ? `<details class="norme"${app.base.normeOuverte ? ' open' : ''}><summary><span>Ce que la norme dit, table par table</span><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>
      <div class="norme-defile">${md ? '<div class="sur">Modules — barrettes (ASNE 0599, NSA937901), connecteurs et prises (EN 4165, EN 2997) — une variante par ligne : ses contacts et ses groupes reliés</div>' + md : ''}${tl ? '<div class="sur">Tailles de contact — les jauges qu’un contact reçoit</div>' + tl : ''}${familles ? '<div class="sur">Familles — par contact : jauges, intensité, résistance ; fils par côté ; règle de remplissage</div>' + familles : ''}${fils ? '<div class="sur">Fils — section, résistance à 20 °C, intensité admissible du fil seul</div>' + fils : ''}${decl ? '<div class="sur">Déclassement</div>' + decl : ''}${res ? '<div class="sur">Réseau — la chute admise</div>' + res : ''}</div></details>` : '')
    + `<p class="note">Une norme est un Excel (une table par feuille, ou à la suite) ou un CSV : ${COLONNES_NORME_TEXTE}. Une norme importée remplace la norme d’exemple et se fond avec celles déjà importées. Le PDF de la norme se garde à côté, dans normes/.</p>`; }
async function importerNorme(fichier) { if (!fichier) return;
  try { const r = await lireNormeFichier(fichier);
    if (!normeLue(r)) { dire('« ' + fichier.name + ' » n’a pas l’air d’une norme : il faut ' + COLONNES_NORME_TEXTE.replace(/<\/?b>/g, '') + '.', true); return; }
    // la norme d'exemple s'efface devant une vraie ; les vraies se complètent entre elles
    const base = app.normeNom ? app.norme : normeVide(), N = fusionnerNormes(base, r), nom = app.normeNom ? app.normeNom + ' + ' + fichier.name : fichier.name;
    adopterNorme(N, nom); app.base.normeOuverte = true; if (app.fiche && app.fiche.mode === 'bible') ficheBible(app.fiche.ref);
    dire(pluriel(r.familles.length, 'famille') + ', ' + pluriel(r.fils.length, 'fil') + ' lu' + (r.fils.length > 1 ? 's' : '') + ' dans « ' + fichier.name + ' » : les cartes suivent.');
  } catch (e) { dire('Erreur : ' + (e && e.message || e), true); } }
/* Le pictogramme d'une référence dans la table : sa physique en petit — un
   trait par module, à la même échelle pour toutes, pour comparer d'un œil. */
function pictoBible(e) { if (e.module) { const m = moduleDeReference(app.norme, e.reference); if (m) return pictoModule(m); }
  const n = Math.min(40, Math.max(1, Math.round(e.bornes || 1))), w = n * 4 + 2, W = Math.min(w, 44), k = W / w;
  if (e.nature === 'coupure' || e.nature === 'connecteur') { const deux = e.nature === 'coupure', H = deux ? 15 : 8;
    const bande = y => `<rect x="0.5" y="${y + 0.5}" width="${w - 1}" height="6.5" rx="1.5"/>` + Array.from({ length: n }, (_, j) => `<circle cx="${j * 4 + 3}" cy="${y + 3.75}" r="1.1"/>`).join('');
    return `<svg class="picto" width="${f1(W)}" height="${f1(H * k)}" viewBox="0 0 ${w} ${H}" aria-hidden="true"><g class="p-bande">${bande(0)}${deux ? bande(8) : ''}</g></svg>`; }
  return `<svg class="picto" width="${f1(W)}" height="${f1(10 * k)}" viewBox="0 0 ${w} 10" aria-hidden="true"><g class="p-cell${e.nature === 'blindage' ? ' p-blind' : ''}">`
    + Array.from({ length: n }, (_, j) => `<rect x="${j * 4 + 1.5}" y="0.5" width="3" height="7"/>`).join('') + `</g><rect class="p-rail" x="0.5" y="8" width="${w - 1}" height="1.5"/></svg>`; }
/* Une référence en grand : le même dessin que la carte d'une barrette, sans
   contrat — tous ses modules — et ses caractéristiques. */
function zoomBible(e) { if (e.module && moduleDeReference(app.norme, e.reference)) return zoomModule(e);
  const P = remplirSelonNorme(physiqueDeReference(e), app.norme), forme = e.nature === 'coupure' ? 'coupure' : e.nature === 'connecteur' ? 'connecteur' : 'reglette', F = P.famille;
  const carac = [['famille', e.famille], ['nature', P.nature], [forme === 'reglette' ? 'modules' : 'contacts', nombre(e.bornes)], ['jauge', e.jaugeMin == null ? '—' : jaugeEntree(e) + ' AWG'],
    ['intensité', e.intensite != null ? nombre(e.intensite) + ' A' : '—'], ['blindage', e.blindage ? 'oui' : 'non'], e.mobile ? ['partie mobile', e.mobile] : null, e.note ? ['note', e.note] : null,
    ['norme', F ? F.norme + (F.pas != null ? ' · pas ' + nombre(F.pas) + ' mm' : '') + (F.resistance != null ? ' · ' + nombre(F.resistance) + ' mΩ' : '') + ' · ' + pluriel(F.filsParCote, 'fil') + ' par côté' : 'aucune pour cette famille']].filter(Boolean);
  return `<div class="bible-zoom"><div class="bz-tete"><div class="min0"><div class="sur">${esc(P.nature)}</div><div class="bz-ref">${esc(e.reference)}</div></div>
      <button class="rond fermer" id="bz-fermer" aria-label="Replier la référence"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    ${dessinPhysique('', P, largeurFiche(), { forme })}
    <div class="bar-faits">${carac.map(([k, v]) => `<span>${esc(k)}</span><span>${esc(v)}</span>`).join('')}</div></div>`; }
async function importerBible(fichier) { if (!fichier) return;
  try { const r = await lireBibleFichier(fichier);
    if (!r.entrees.length) { dire('« ' + fichier.name + ' » n’a pas l’air d’une bible : il faut une ligne d’en-têtes avec ' + COLONNES_BIBLE_TEXTE.replace(/<\/?b>/g, '') + '.', true); return; }
    adopterBible(r.entrees, fichier.name); dire(pluriel(r.entrees.length, 'référence') + ' lue' + (r.entrees.length > 1 ? 's' : '') + ' : les barrettes suivent.');
  } catch (e) { dire('Erreur : ' + (e && e.message || e), true); } }

/* ---- corriger : toujours la vérité, puis on refait les folios ----------- */
/* Une demi-liaison de renvoi porte le vrai bout dans sa borne : « 733LE 4 ». */
const boutSource = (n, b) => { if (!estRenvoi(n)) return [n, b]; const k = b.indexOf(' '); return k < 0 ? [b, ''] : [b.slice(0, k), b.slice(k + 1)]; };
function cleSource(l) { const [de, bDe] = boutSource(l.de, l.borneDe), [vers, bVers] = boutSource(l.vers, l.borneVers); return [de, bDe, vers, bVers, l.cable].join('\u0001'); }
function sourceDe(l) { if (!app.source || app.source.includes(l)) return l;
  const k = cleSource(l); return app.source.find(s => cleDe(s) === k) || null; }
function renommer(ancien, nouveau) { verite().forEach(l => { if (l.de === ancien) l.de = nouveau; if (l.vers === ancien) l.vers = nouveau; });
  const d = app.contrat.designations.get(ancien); app.contrat.designations.delete(ancien); if (d) app.contrat.designations.set(nouveau, d); }
function designer(nom, d) { if (d) app.contrat.designations.set(nom, d); else app.contrat.designations.delete(nom); }
function supprimerEquipement(nom) { const g = l => l.de !== nom && l.vers !== nom;
  if (app.source) app.source = app.source.filter(g); app.contrat.liaisons = app.contrat.liaisons.filter(g);
  app.contrat.designations.delete(nom); app.choisi = null; app.cible = null; }
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
function histPush(quoi) { app.hist.push({ quoi, liaisons: app.contrat.liaisons.map(l => ({ ...l })), source: app.source ? app.source.map(l => ({ ...l })) : null,
  nFolios: app.nFolios, budget: app.budget, plan: app.plan, nom: app.nom, designations: new Map(app.contrat.designations), retouches: new Map(app.retouches) });
  if (app.hist.length > 40) app.hist.shift(); synchroniserHistorique(); }
function annuler() { const p = app.hist.pop(); if (!p) return null;
  app.contrat.liaisons = p.liaisons; app.source = p.source; app.nFolios = p.nFolios; app.budget = p.budget || 16; app.plan = p.plan; app.nom = p.nom || ''; app.contrat.designations = p.designations;
  // les retouches d'avant reviennent, et se gardent comme elles étaient
  if (p.retouches) { const cles = new Set([...app.retouches.keys(), ...p.retouches.keys()]); app.retouches = p.retouches; cles.forEach(garderRetouche); }
  app.choisi = null; app.cible = null; app.actif = null; app.base.enSaisie = false; fermerFiche();
  if (document.activeElement && $('ba-tab').contains(document.activeElement)) document.activeElement.blur();
  redessiner(); ajuster(true); sauver(); return p.quoi; }
let sauveT = null;
function sauver() { clearTimeout(sauveT); sauveT = setTimeout(() => { try {
    localStorage.setItem(CLE_CONTRAT, JSON.stringify({ liaisons: app.contrat.liaisons, source: app.source, nFolios: app.nFolios, budget: app.budget, plan: app.plan, nom: app.nom,
      designations: [...app.contrat.designations], cartouche: app.contrat.cartouche, t: Date.now() }));
    heureSauve(Date.now()); } catch (_) { heureSauve(null); } }, 400); }
function heureSauve(t) { const el = $('ctx-sauve');
  if (!t) { el.textContent = 'non enregistré'; el.classList.add('ko'); el.title = 'Le navigateur refuse d’enregistrer (navigation privée ?). Le travail tient tant que l’onglet est ouvert.'; return; }
  const d = new Date(t); el.textContent = 'enregistré ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); el.classList.remove('ko');
  el.title = 'Gardé dans ce navigateur. Rien n’est parti sur le réseau.'; }
function relire() { try { const j = localStorage.getItem(CLE_CONTRAT); if (!j) return false; const o = JSON.parse(j);
    if (!o || !o.liaisons || !o.liaisons.length) return false;
    app.contrat.liaisons = o.liaisons.map(liaison); app.source = o.source ? o.source.map(liaison) : null; app.nFolios = o.nFolios || 0; app.budget = o.budget || 16; app.plan = o.plan || '*'; app.nom = o.nom || '';
    app.contrat.designations = new Map(o.designations || []); if (o.cartouche) Object.assign(app.contrat.cartouche, o.cartouche);
    const P = plans(); if (app.plan === '*' && P.length > 1) app.plan = P[0];
    redessiner(); ajuster(); heureSauve(o.t || Date.now()); return true; } catch (_) { return false; } }

/* ---- charger un contrat ----------------------------------------------- */
function chargerContrat(liaisons, quoi, nom) { histPush(quoi || 'chargement d’un contrat');
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
    chargerContrat(r.liaisons, 'ouverture de ' + fichier.name, fichier.name);
    dire(r.liaisons.length + ' liaisons' + (r.format === 'retest' ? ' — format retest, en-têtes ligne ' + r.entete : '') + (plans().length > 1 ? ' · ' + plans().length + ' folios' : '') + '.');
  } catch (e) { dire('Erreur : ' + (e && e.message || e), true); } }
function lierDepot() { let n = 0;
  window.addEventListener('dragenter', e => { e.preventDefault(); n++; document.body.classList.add('depot-actif'); });
  window.addEventListener('dragover', e => { e.preventDefault(); });
  window.addEventListener('dragleave', e => { e.preventDefault(); if (--n <= 0) { n = 0; document.body.classList.remove('depot-actif'); } });
  window.addEventListener('drop', e => { e.preventDefault(); n = 0; document.body.classList.remove('depot-actif');
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) ouvrirFichier(f); }); }

/* ---- sortir le dessin : SVG, PNG, impression -------------------------- */
function nomFolio() { const base = (app.nom || 'atelier-schema').replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_');
  return base + (app.plan !== '*' ? '-folio-' + String(app.plan).replace(/[^\w.-]+/g, '_') : ''); }
function telecharger(blob, nom) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nom;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
function svgDuFolio() { return app.dessin ? svgAutonome(app.dessin, app.contrat.cartouche, folioCourant(), designationDe) : null; }
/* Le suivi : tout ce que le contrat pose (barrettes, prises, connecteurs),
   en CSV, pour le garder d'un contrat à l'autre. */
function exporterSuivi() { const L = suiviDuContrat(verite(), app.bible, app.nom || 'contrat', n => app.contrat.designations.get(n) || '');
  if (!L.length) { dire('Rien à suivre : ni barrette, ni prise, ni connecteur dans ce contrat.'); return; }
  telecharger(new Blob(['\ufeff' + csvDuSuivi(L)], { type: 'text/csv;charset=utf-8' }), (app.nom || 'contrat').replace(/\.[^.]+$/, '') + ' — suivi.csv');
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
function synchroniserContexte() { const n = app.contrat.liaisons.length;
  $('ctx-nom').textContent = n ? (app.nom || 'Sans nom') : 'Aucun contrat';
  const P = plans();
  $('ctx-txt').textContent = n ? `${n} liaison${n > 1 ? 's' : ''} · ${reperesDe(verite()).filter(r => !estRenvoi(r)).length} repères` + (P.length > 1 ? ` · ${P.length} folios` : '') : ''; }
/* Annuler reste à sa place, éteint quand il n'y a rien à annuler ; sa bulle
   dit ce qu'il déferait. */
function synchroniserHistorique() { const b = $('btnUndo'), d = app.hist[app.hist.length - 1]; b.disabled = !d;
  const quoi = d ? 'Annuler : ' + d.quoi : 'Annuler';
  b.setAttribute('aria-label', quoi + ' (Ctrl+Z)'); b.querySelector('.bulle').innerHTML = esc(quoi) + '<kbd>Ctrl+Z</kbd>'; }
function synchroniser() { synchroniserContexte(); synchroniserFolios(); synchroniserHistorique(); synchroniserRetouche(); rafraichirBase(); }
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
  const exemple = () => chargerContrat(contratExemple(), 'contrat d’exemple', 'Contrat d’exemple');
  $('fichier').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) ouvrirFichier(f); e.target.value = ''; });
  $('fichier-bible').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) importerBible(f); e.target.value = ''; });
  o('vd-ouvrir', choisirFichier); o('vd-coller', ficheColler); o('vd-exemple', exemple);
  o('btnBase', basculerBase); o('btnCherche', () => { if (rechercheOuverte()) fermerRecherche(); else ouvrirRecherche(); });
  o('btnLiaison', nouvelleLiaison); o('btnBible', basculerBible); o('btnOuvrir', choisirFichier);
  o('btnMenu', e => { e.stopPropagation(); $('menu').hidden ? ouvrirMenu() : fermerMenu(); });
  const actions = { ouvrir: choisirFichier, coller: ficheColler, exemple, cartouche: ficheCartouche, bible: ficheBible, suivi: exporterSuivi, svg: exporterSVG, png: exporterPNG, imprimer,
    vider: () => { if (!confirm('Effacer tout le contrat ?')) return; histPush('tout effacer'); app.contrat.liaisons = []; app.source = null; app.nFolios = 0; app.plan = '*'; app.nom = ''; app.cible = null; app.choisi = null;
      fermerFiche(); fermerBase(); redessiner(); ajuster(); sauver(); } };
  $('menu').addEventListener('click', e => { const b = e.target.closest('button[data-act]'); if (!b) return; fermerMenu(); actions[b.dataset.act](); });
  document.addEventListener('click', e => { if (!e.target.closest('#menuBoite')) fermerMenu(); });
  o('btnUndo', () => { const q = annuler(); if (q) dire('Annulé : ' + q + '.'); });
  o('btnAuto', revenirAutomatique);
  o('fo-prev', () => allerAuFolio(-1)); o('fo-next', () => allerAuFolio(+1));
  $('fo-strip').addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) allerAuPlan(c.dataset.plan); });
  o('zin', () => zoomer(1.25)); o('zout', () => zoomer(1 / 1.25)); o('zfit', () => ajuster(true)); o('zlbl', () => ajuster(true));
  lierRecherche(); lierDepot(); lierBase();
  window.addEventListener('keydown', e => {
    // la vue en relief ouverte : Échap la ferme, le reste lui appartient
    if (!$('relief').hidden) { if (e.key === 'Escape') fermerRelief(); return; }
    const dansChamp = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '');
    if (e.key === 'Escape') { if (!$('menu').hidden) { fermerMenu(); $('btnMenu').focus(); } else if (rechercheOuverte()) { fermerRecherche(); $('q').blur(); }
      else if (dansChamp) e.target.blur();   // dans un champ, Échap ne fait que le quitter
      else if (app.fiche) fermerFiche(true); else if (app.cible) deselectionner(); else fermerBase(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !dansChamp) { e.preventDefault(); const q = annuler(); if (q) dire('Annulé : ' + q + '.'); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') { e.preventDefault(); imprimer(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); choisirFichier(); return; }
    if (dansChamp || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '/') { e.preventDefault(); ouvrirRecherche(); }
    else if (e.key === 'b') basculerBase();
    else if (e.key === 'ArrowLeft') allerAuFolio(-1); else if (e.key === 'ArrowRight') allerAuFolio(+1);
    else if (e.key === '+' || e.key === '=') zoomer(1.25); else if (e.key === '-') zoomer(1 / 1.25); else if (e.key === '0' || e.key === 'f') ajuster(true); });
  let rT; window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { if (telephone()) ajuster(); else appliquerVue();
    rafraichirCarte(); if (app.fiche && app.fiche.mode === 'bible' && app.fiche.ref) ficheBible(app.fiche.ref); }, 160); });
  window.addEventListener('orientationchange', () => setTimeout(() => ajuster(), 300));
}
