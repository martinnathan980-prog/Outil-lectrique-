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
   à droite, porte en peu de lignes ce qu'on fait une fois (la bibliothèque,
   ouvrir, vos fichiers, exporter…) et dit ce qui est ouvert.
   On arrive par la BIBLIOTHÈQUE (08-bibliotheque) : une installation, ses plans ;
   le plan qu'on ouvre est le contrat sur la table (app.planId).
   =========================================================================== */
'use strict';

const app = {
  contrat: nouveauContrat(), source: null, nFolios: 0, budget: 16, plan: '*', nom: '',
  planId: '',   // le plan de la bibliothèque qui est sur la table (08-bibliotheque) : ce qu'on fait s'y garde

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
   concours d'un folio chargé prend des secondes, revenir sur un folio déjà
   vu est instantané. La CLÉ : ce que le placement lit de chaque liaison — ses
   deux bouts, son numéro (le dessin l'écrit ; le juge compte les numéros qui
   ne s'écrivent pas). Pas le part number : le dessin n'en dépend pas, et
   retenir un autre calibre (MS3320-10 → MS3320-20, 08-disjoncteurs) refaisait
   le concours entier — un folio de 115 câbles disparaissait 42 s (l'audit de
   fluidité). Sauf celui d'un RAIL, qui nomme ses points de raccordement (03,
   `construireGraphe`). */
const placements = new Map(), PLACEMENTS_GARDES = 24;
const clePlacement = L => JSON.stringify(L.map(l => [l.de, l.borneDe, l.vers, l.borneVers, l.cable, estRail(l.de) ? l.pnDe : '', estRail(l.vers) ? l.pnVers : '']));
// la clé d'avant (les part numbers dedans) : une retouche gardée dans ce navigateur sous elle se reprend sous la nouvelle
const cleDAvant = L => JSON.stringify(L.map(l => [l.de, l.borneDe, l.vers, l.borneVers, l.cable, l.pnDe, l.pnVers]));
function reprendreRetouche(cle, L) { if (app.retouches.has(cle)) return; const k = cleDAvant(L); if (k === cle || !app.retouches.has(k)) return;
  app.retouches.set(cle, app.retouches.get(k)); app.retouches.delete(k); garderRetouche(cle); garderRetouche(k); }
// un placement entre en mémoire ; au-delà de la réserve, le moins récent s'en va — jamais celui du folio affiché (la retouche le relit)
function garderPlacement(cle, P) { placements.delete(cle); placements.set(cle, P); placement.prets.add(cle); const ici = cleCourante();
  for (const k of [...placements.keys()]) { if (placements.size <= PLACEMENTS_GARDES) break; if (k !== ici) placements.delete(k); } }
function placementDe(L) {
  const cle = clePlacement(L); reprendreRetouche(cle, L);
  // un folio retouché à la souris : la retouche, toujours (elle se défait par « automatique » ou Ctrl+Z)
  if (app.retouches.has(cle)) return app.retouches.get(cle);
  // un folio déjà affiné (dans cette session, ou gardé d'une autre) : son meilleur dessin
  if (affinage.profonds.has(cle)) return affinage.profonds.get(cle);
  if (placements.has(cle)) { const P = placements.get(cle); placements.delete(cle); placements.set(cle, P); return P; }
  /* un gros folio jamais vu : le moteur le place AU LOIN (un Worker), le dessin viendra ; un petit, ici même. En
     attendant, le folio ne reste jamais vide quand on a de quoi le montrer : son dessin d'avant (une liaison renumérotée,
     une borne corrigée), ou l'ESQUISSE que le Worker envoie au bout d'une seconde (`provisoire`) */
  if (placement.attentes.has(cle)) { const a = placement.attentes.get(cle); if (!a.vue || a.plan !== app.plan) { a.vue = true; a.plan = app.plan; a.cibleAvant = app.cible; } return provisoire(a, L); }
  if (auLoin(L) && demanderPlacement(cle, L, app.plan)) return provisoire(placement.attentes.get(cle), L);
  const P = meilleurPlacement(L); garderPlacement(cle, P); if (placement.ailleurs && L.length > SEUIL_ICI) garderConcours(cle, P);
  return P;
}
/* Le DESSIN PROVISOIRE d'un folio qui se place au loin. D'abord son dessin d'avant, s'il a les mêmes bouts dans le même
   ordre (le fil n° i reste la liaison n° i) : le folio ne s'efface pas pour un numéro changé, ses étiquettes suivent ;
   sinon l'esquisse, si elle est arrivée ; sinon rien (l'attente se dit). Il porte `provisoire` : 'avant' ou 'esquisse'. */
const boutsDe = L => L.map(l => [l.de, l.borneDe, l.vers, l.borneVers].join('\u0001'));
function provisoire(a, L) { if (!a) return null; const d = placement.derniers.get(a.plan);
  if (d && d.bouts.length === L.length && boutsDe(L).every((b, i) => b === d.bouts[i])) {
    const maj = o => o && L[o.i] ? { ...o, cable: L[o.i].cable, type: L[o.i].type, route: L[o.i].route, pnDe: L[o.i].pnDe, pnVers: L[o.i].pnVers } : o;
    return { ...d.P, links: d.P.links.map(maj), routage: { ...d.P.routage, fils: d.P.routage.fils.map(maj) }, provisoire: 'avant' }; }
  return a.esquisse || null; }

/* ---- l'AFFINAGE : la recherche profonde, en arrière-plan ---------------- */
/* Le dessin qu'on voit d'abord est celui du concours. Puis la recherche
   profonde (04, `placementProfond`) tourne dans un Worker — le moteur, refait
   depuis son <script id="moteur"> —, folio par folio, le folio affiché
   d'abord : chaque fois qu'elle trouve mieux, le dessin se remplace sous les
   yeux, en fondu, la feuille à sa place (jamais au milieu d'un geste). Le
   temps n'est pas un souci (le lecteur : « une heure de calcul pour une vie
   d'études bien faite, on s'en fiche ») : ce qu'elle trouve se GARDE dans ce
   navigateur (IndexedDB), par folio et par version du moteur — un folio
   affiné l'est pour toujours. Elle ne part qu'une fois TOUS les folios placés
   (`placementEnCours`) : elle refaisait le folio que le Worker du placement
   calculait encore, deux cœurs sur le même travail (l'audit de fluidité, le
   parcours) ; un folio à placer (une liaison corrigée) la suspend, elle
   reprend ensuite. Sous pilote automatique (navigator.webdriver), elle dort :
   les bancs mesurent le concours, déterministe ; `atelier.affinage(true)` la
   réveille. Sans Worker ni IndexedDB, rien ne change : le dessin du concours
   reste. */
const TOURS_PROFONDS = 48;
const affinage = { actif: !(typeof navigator !== 'undefined' && navigator.webdriver), worker: null, file: [], encours: null,
  profonds: new Map(), finis: new Set(), etat: null, vu: 0 };
const cleCourante = () => { const L = liaisonsDuPlan(); return L.length ? clePlacement(L) : null; };
// tous les folios du contrat dans la file, le folio affiché d'abord ; ceux qui ne sont plus au contrat en sortent
function affinerTout() { if (!affinage.actif) return;
  const P = plans(), parPlan = app.plan === '*' || !P.length ? [liaisonsDe('*')] : [liaisonsDuPlan(), ...P.filter(p => p !== app.plan).map(liaisonsDe)];
  const travaux = parPlan.filter(L => L.length).map(L => ({ cle: clePlacement(L), L: L.map(({ origine, ...l }) => l) })).filter(t => !affinage.finis.has(t.cle) && !(affinage.encours && affinage.encours.cle === t.cle));
  affinage.file = travaux.filter((t, i) => travaux.findIndex(u => u.cle === t.cle) === i); pomper(); }
// le placement au loin a-t-il encore du travail ? (un folio attendu, en cours, ou un folio du contrat pas encore placé)
const placementEnCours = () => placement.ailleurs && placement.worker !== false && (placement.attentes.size > 0 || !!placement.encours || !!prochainAuLoin());
function pomper() { while (affinage.file.length && affinage.finis.has(affinage.file[0].cle)) affinage.file.shift();
  if (affinage.encours || !affinage.file.length || placementEnCours()) { montrerBande(); return; }
  const w = travailleur(); if (!w) return;
  affinage.encours = affinage.file.shift(); affinage.etat = { k: 0, n: TOURS_PROFONDS };
  w.postMessage({ cle: affinage.encours.cle, liaisons: affinage.encours.L, tours: TOURS_PROFONDS }); montrerBande(); }
// un folio à placer passe avant : l'affinage en cours s'arrête (son folio retourne en tête de la file), il reprendra
function suspendreAffinage() { if (!affinage.encours || !affinage.worker) return; const j = affinage.encours;
  try { affinage.worker.terminate(); } catch (_) { } affinage.worker = null; affinage.encours = null; affinage.etat = null;
  if (!affinage.finis.has(j.cle) && !affinage.file.some(t => t.cle === j.cle)) affinage.file.unshift(j); montrerBande(); }
function travailleur() { if (affinage.worker) return affinage.worker; if (affinage.worker === false) return null;
  try { const src = document.getElementById('moteur').textContent;
    // le moteur rapporte à chaque tour ; un dessin meilleur part avec, la fin aussi
    const glue = `\nself.onmessage = e => { const { cle, liaisons, tours } = e.data; let dernier = null;
      try { const P = placementProfond(liaisons, tours, (k, n, m) => { if (k > 0 && m !== dernier) postMessage({ cle, k, n, P: sortieDuPlacement(m) }); else postMessage({ cle, k, n }); dernier = m; });
        postMessage({ cle, fini: true, P }); }
      catch (err) { postMessage({ cle, erreur: String(err && err.message || err) }); } };`;
    const w = new Worker(URL.createObjectURL(new Blob([src + glue], { type: 'text/javascript' })));
    w.onmessage = recevoirAffinage; w.onerror = () => { affinage.worker = false; affinage.encours = null; affinage.file = []; montrerBande(); };
    return (affinage.worker = w); }
  catch (_) { affinage.worker = false; return null; } }
function recevoirAffinage(e) { const d = e.data, j = affinage.encours; if (!j || d.cle !== j.cle) return;
  if (d.n) affinage.etat = { k: d.k, n: d.n };
  if (d.P && !d.fini) { affinage.profonds.set(d.cle, d.P); if (cleCourante() === d.cle) { affinage.vu = Date.now(); remplacerDessin(); } }
  if (d.erreur) affinage.erreur = d.erreur;
  if (d.fini || d.erreur) { affinage.finis.add(d.cle); if (d.P) { affinage.profonds.set(d.cle, d.P); garderAffine(d.cle, d.P); }
    affinage.encours = null; pomper(); }
  montrerBande(); }
// le dessin se remplace, la vue reste où elle est
function rafraichirDessin() { calculer(); peindre(); synchroniser(); rallumer(); }
/* REMPLACER le dessin affiché par celui qui arrive (le concours après l'esquisse, un mieux de l'affinage) : le dessin SE
   RANGE (v73, le moment signature n° 3 du designer : le fondu enchaîné de 550 ms superposait deux dispositions — deux
   300XC1, des câbles en double —, l'objet principal de l'outil « bavait »). La feuille reste exactement à sa place à
   l'écran (même coin, même taille : les deux dessins n'ont pas la même échelle de feuille), rien ne saute ; chaque bloc
   glisse de sa place d'esquisse à sa place définitive (`rangerLeDessin`). Jamais au milieu d'un geste (on tient le plan,
   un bloc) : il attend qu'on lâche. */
function remplacerDessin() { const pl = $('planche'); clearTimeout(remplacerDessin.t);
  if (pl && (pl.classList.contains('tient') || pl.classList.contains('deplace'))) { remplacerDessin.t = setTimeout(remplacerDessin, 400); return; }
  finirGlisse(); finirRangement(); const D0 = app.dessin, bb0 = D0 && D0.bbox, v0 = { ...app.vue }, sc0 = $('scene');
  // ce que l'esquisse montrait : chaque bloc à l'écran ; ses câbles, une copie qui s'effacera
  const avant = bb0 && sc0 && !mouvementReduit() ? { blocs: D0.comps.map(c => ({ name: c.name, x: v0.tx + c.x * v0.s, y: v0.ty + c.y * v0.s })), cables: copieDesCables(sc0) } : null;
  calculer();
  const bb1 = app.dessin && app.dessin.bbox;
  if (bb0 && bb1 && Math.abs(bb0.w - bb1.w) + Math.abs(bb0.x - bb1.x) + Math.abs(bb0.y - bb1.y) > 0.01) { const s = v0.s * bb0.w / bb1.w;
    if (anim) { cancelAnimationFrame(anim); anim = null; }
    app.vue = { s, tx: v0.tx + bb0.x * v0.s - bb1.x * s, ty: v0.ty + bb0.y * v0.s - bb1.y * s }; }
  peindre(); synchroniser(); rallumer();
  // le bloc de la carte a pu changer de place sur le nouveau dessin : passé dessous, elle s'écarte (08-carte)
  if (typeof planifierEcart === 'function') planifierEcart(true);
  if (avant) rangerLeDessin(avant); }
/* La copie des câbles d'un dessin (les traits, les numéros et leurs fonds, les points, les barrettes à poser), dans un
   groupe qui porte la vue et les classes de la scène (le focus, le zoom sémantique) : sans identifiant ni `data-i`, rien
   ne la confond avec le dessin. */
function copieDesCables(sc) { const g = document.createElementNS(NS_SVG, 'g');
  g.setAttribute('class', 'range-part ' + (sc.getAttribute('class') || '')); g.setAttribute('aria-hidden', 'true'); g.setAttribute('transform', sc.getAttribute('transform') || '');
  sc.querySelectorAll(':scope > :is(.cab,text.filnum,rect.halo,.jn,.vt)').forEach(e => { const k = e.cloneNode(true); k.removeAttribute('data-i'); k.querySelectorAll('[data-i],[id]').forEach(x => { x.removeAttribute('data-i'); x.removeAttribute('id'); }); g.appendChild(k); });
  return g; }
/* LE DESSIN SE RANGE. Pour chaque bloc présent dans les deux dessins (par son repère ; plusieurs du même nom — trois
   masses 906G — chacun avec le plus proche), l'écart entre sa place d'avant et la nouvelle, à l'écran : le bloc neuf part
   de là et glisse à sa place (420 ms, `--courbe-glisse`), le plus proche de son arrivée d'abord (+6 ms par rang, 120 ms au
   plus). Les câbles de l'esquisse s'effacent en 120 ms ; ceux du définitif attendent, puis paraissent quand les blocs
   arrivent (260 à 520 ms) : jamais deux jeux de câbles à la fois. Un bloc qui n'existait pas paraît à +200 ms (220 ms). Un transform par
   bloc, rien d'autre ne bouge ; le mouvement réduit coupe net. */
/* La fin d'un geste animé : `fin` à la fin de l'animation — et, si cette fin se perd (une page chargée, une animation
   annulée), un filet la rattrape ; une animation en pause (les planches image par image) attend. `fin` ne sert qu'une fois. */
function auBoutDe(a, fin, ms) { let fait = false; const une = () => { if (!fait) { fait = true; fin(); } }; a.onfinish = une;
  const filet = () => { if (fait) return; if (a.playState === 'paused' || a.playState === 'running') { setTimeout(filet, ms); return; } une(); }; setTimeout(filet, ms); }
const RANGE = { anims: [], g: null, part: null };
function rangerLeDessin(avant) { const sc = $('scene'), svg = $('svg'), D = app.dessin; finirRangement(); if (!sc || !svg || !D) return;
  const s = app.vue.s, parNom = new Map(); avant.blocs.forEach(a => (parNom.get(a.name) || parNom.set(a.name, []).get(a.name)).push(a));
  const vont = [];
  sc.querySelectorAll(':scope > .comp').forEach(g => { const c = D.comps[+g.dataset.k]; if (!c) return; const ici = { x: app.vue.tx + c.x * s, y: app.vue.ty + c.y * s }, cs = parNom.get(c.name);
    if (!cs || !cs.length) { vont.push({ g, c, neuf: true }); return; }
    let j = 0; cs.forEach((a, i) => { if (Math.hypot(a.x - ici.x, a.y - ici.y) < Math.hypot(cs[j].x - ici.x, cs[j].y - ici.y)) j = i; });
    const a = cs.splice(j, 1)[0]; vont.push({ g, c, dx: (a.x - ici.x) / s, dy: (a.y - ici.y) / s, d: Math.hypot(a.x - ici.x, a.y - ici.y) }); });
  // les câbles de l'esquisse, au-dessus du nouveau dessin le temps de s'effacer ; ceux du définitif attendent dans un groupe
  // à eux (à leur place dans l'ordre du dessin), qui paraît de 260 à 520 ms — quand les blocs arrivent : plus tôt, on les
  // voyait flotter loin de leurs blocs encore en chemin (la planche du rangement) —, puis se défait
  svg.appendChild(avant.cables);
  const part = avant.cables.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
  auBoutDe(part, () => avant.cables.remove(), 400); RANGE.anims.push(part); RANGE.part = avant.cables;
  const neufs = [...sc.querySelectorAll(':scope > :is(.cab,text.filnum,rect.halo,.jn,.vt)')], vient = { duration: 260, delay: 260, easing: 'cubic-bezier(.32,.72,0,1)', fill: 'backwards' };
  if (neufs.length) { const g = document.createElementNS(NS_SVG, 'g'); g.setAttribute('class', 'range-cables'); neufs[0].before(g); neufs.forEach(e => g.appendChild(e)); RANGE.g = g;
    const a = g.animate([{ opacity: 0 }, { opacity: 1 }], vient); auBoutDe(a, deballerRangement, 900); RANGE.anims.push(a); }
  sc.querySelectorAll(':scope > .loupe').forEach(l => RANGE.anims.push(l.animate([{ opacity: 0 }, { opacity: 1 }], vient)));
  vont.filter(v => !v.neuf).sort((a, b) => a.d - b.d).forEach((v, rang) => { if (v.d < 0.5) return;
    RANGE.anims.push(v.g.animate([{ transform: `translate(${v.c.x + v.dx}px,${v.c.y + v.dy}px)` }, { transform: `translate(${v.c.x}px,${v.c.y}px)` }],
      { duration: 420, delay: Math.min(120, rang * 6), easing: 'cubic-bezier(.65,0,.35,1)', fill: 'backwards' })); });
  vont.filter(v => v.neuf).forEach(v => { const cx = v.c.x + v.c.w * 0.02, cy = v.c.y + v.c.h * 0.02;
    RANGE.anims.push(v.g.animate([{ opacity: 0, transform: `translate(${cx}px,${cy}px) scale(.96)` }, { opacity: 1, transform: `translate(${v.c.x}px,${v.c.y}px)` }],
      { duration: 220, delay: 200, easing: 'cubic-bezier(.32,.72,0,1)', fill: 'backwards' })); }); }
// les câbles du définitif reprennent leur place dans la scène (le groupe du rangement se défait)
function deballerRangement() { const g = RANGE.g; RANGE.g = null; if (!g || !g.parentNode) return; while (g.firstChild) g.before(g.firstChild); g.remove(); }
// un rangement en cours se termine net (un autre dessin arrive, un folio change, un repeint) : tout à sa place
function finirRangement() { const xs = RANGE.anims; RANGE.anims = []; xs.forEach(a => { try { a.finish(); } catch (_) { } });
  deballerRangement(); if (RANGE.part) { RANGE.part.remove(); RANGE.part = null; } }
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
/* Le concours d'un folio chargé prend des secondes : dans la page, l'écran se
   figeait sans un mot. Un gros folio jamais vu se place donc AU LOIN — dans
   un Worker refait du moteur, comme l'affinage et le FWD — pendant que
   l'écran reste à nous. Au bout d'une seconde environ, le Worker envoie une
   ESQUISSE (04, `rapporter` : le meilleur des candidats de départ, un dessin
   complet) : le folio se montre, se lit, ses blocs se choisissent ; quand le
   concours a fini, son dessin la remplace en fondu, la feuille à sa place
   (`remplacerDessin`). Avant l'esquisse, l'attente se dit vraiment : le
   folio, ses câbles, une durée estimée sur ce que cet ordinateur a déjà mis
   (`ETALON`), une barre, et ce qu'on peut faire pendant (les problèmes du
   contrat, le récapitulatif). Le dessin qui arrive est EXACTEMENT celui que
   la page aurait calculé (le concours est déterministe : même entrée, même
   sortie) ; il se garde dans ce navigateur (IndexedDB, magasin `concours`,
   par version du moteur) et revient à l'ouverture suivante en quelques
   dizaines de millisecondes. Le folio affiché passe toujours devant (un
   autre en cours lui cède la place et reprend après) ; puis les folios
   demandés ; puis les autres folios du contrat, l'un après l'autre, pour
   être prêts quand on y va — la bande le dit (« 7 / 20 folios prêts »).
   Restent dans la page : un petit folio (SEUIL_ICI liaisons au plus), un
   contrat sans folios ou découpé par l'outil (`ajusterFolios` lit le dessin
   aussitôt), et tout quand le navigateur refuse le Worker. Sous pilote
   automatique (navigator.webdriver) le placement reste dans la page,
   synchrone, pour que les bancs lisent le dessin dès `redessiner()` ;
   `placementAilleurs(true)` l'envoie au loin (tests/placement.js). */
const SEUIL_ICI = 12;
const placement = { ailleurs: !(typeof navigator !== 'undefined' && navigator.webdriver), worker: null, url: null, encours: null, file: [], attentes: new Map(), faits: 0, relus: 0, erreur: null, nettoye: false,
  aides: [],             // les Workers qui partagent le concours du chef (`travailleurPlacement`)
  prets: new Set(),      // les clés des folios placés dans cette session (gardés ou non en mémoire) : on ne les redemande pas
  derniers: new Map(),   // folio -> son dernier dessin montré (ses bouts, son placement) : le dessin d'avant, s'il convient encore
  horloge: 0 };
// ce folio part-il au loin ? gros, venu du fichier (ni le dessin entier, ni un découpage de l'outil), le Worker possible
const auLoin = L => placement.ailleurs && placement.worker !== false && app.plan !== '*' && !app.nFolios && L.length > SEUIL_ICI;
const attenteCourante = () => { const cle = cleCourante(); return cle && placement.attentes.has(cle) ? placement.attentes.get(cle) : null; };
/* Demander un folio : d'abord ce navigateur (le concours gardé d'une session passée), sinon la file du Worker. L'attente
   retient la cible du moment : si une autre est choisie pendant le calcul (l'index, la recherche), c'est elle qu'on cadrera.
   Un folio à placer passe avant l'affinage, qui se suspend. */
function demanderPlacement(cle, L, plan) { if (!travailleurPlacement()) return false; suspendreAffinage();
  placement.attentes.set(cle, { cle, L: L.map(({ origine, ...l }) => l), plan, t: performance.now(), debut: 0, p: 0, esquisse: null, vue: plan === app.plan, cibleAvant: app.cible });
  lireConcours(cle).then(P => { if (!placement.attentes.has(cle)) return;
    if (P) { placement.relus++; recevoirPlacement(cle, P, false); } else { placement.file.push(cle); pomperPlacement(); } });
  return true; }
/* Le Worker : le moteur, et sa glu. Il est le CHEF d'un concours partagé (04, `menerAuLoin`) : ses AIDES — d'autres
   Workers du même moteur, un par cœur libre, trois au plus — font les recherches indépendantes de chaque lot (les deux
   chemins de chaque finaliste, la passe finale de chacun) ; le dessin est le même qu'à la suite, plus tôt. Le chef
   rapporte l'esquisse (une fois), où il en est (une fraction), puis le dessin. La page les relie (un MessageChannel par
   aide) ; sans aide possible, le chef fait tout, à la suite. */
const AIDES_PLACEMENT = Math.max(0, Math.min(3, ((typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 2) - 1));
const GLU_PLACEMENT = `
(() => { let AIDES = [], NUMERO = 0; const ATTENTES = new Map();   // dans sa portée : le moteur a ses propres noms
const faireAilleurs = (cle, liaisons) => t => { const port = AIDES.reduce((m, p) => p.charge < m.charge ? p : m, AIDES[0]), id = ++NUMERO; port.charge++;
  port.postMessage({ id, cle, liaisons, t: tacheEnDonnees(t) });
  return new Promise((ok, ko) => ATTENTES.set(id, { port, ok: r => ok(desDonnees(t.M, r)), ko })); };
self.onmessage = e => { const d = e.data;
  if (d.role === 'aide') { d.port.onmessage = m => { const { id, cle, liaisons, t } = m.data;
      try { d.port.postMessage({ id, r: faireTacheEnDonnees(cle, liaisons, t) }); } catch (err) { d.port.postMessage({ id, erreur: String(err && err.message || err) }); } }; return; }
  if (d.role === 'chef') { AIDES = d.aides || []; AIDES.forEach(p => { p.charge = 0; p.onmessage = m => { const x = ATTENTES.get(m.data.id); if (!x) return; ATTENTES.delete(m.data.id); x.port.charge--;
      if (m.data.erreur) x.ko(new Error(m.data.erreur)); else x.ok(m.data.r); }; }); return; }
  const { cle, liaisons } = d, rapport = { dire: (quoi, x) => postMessage({ cle, [quoi]: typeof x === 'function' ? x() : x }) };
  let fait; try { fait = AIDES.length ? meilleurPlacementAuLoin(liaisons, rapport, faireAilleurs(cle, liaisons)) : Promise.resolve(meilleurPlacement(liaisons, rapport)); } catch (err) { fait = Promise.reject(err); }
  fait.then(P => postMessage({ cle, P }), err => postMessage({ cle, erreur: String(err && err.message || err) })); }; })();`;
function travailleurPlacement() { if (placement.worker) return placement.worker; if (placement.worker === false) return null;
  try { if (!placement.url) placement.url = URL.createObjectURL(new Blob([document.getElementById('moteur').textContent + GLU_PLACEMENT], { type: 'text/javascript' }));   // le moteur, une fois : un Worker relancé le relit
    const w = new Worker(placement.url), ports = []; placement.aides = [];
    for (let i = 0; i < AIDES_PLACEMENT; i++) { try { const a = new Worker(placement.url), ch = new MessageChannel(); a.postMessage({ role: 'aide', port: ch.port1 }, [ch.port1]); ports.push(ch.port2); placement.aides.push(a); } catch (_) { break; } }
    w.postMessage({ role: 'chef', aides: ports }, ports);
    w.onmessage = recevoirDuLoin; w.onerror = e => { placement.erreur = String((e && e.message) || 'Worker refusé'); arreterPlacement(); placement.worker = false; placement.encours = null; placerIci(); };
    return (placement.worker = w); }
  catch (_) { placement.worker = false; return null; } }
// arrêter le chef et ses aides (un folio qui passe devant, une erreur) ; le prochain folio en refera
function arreterPlacement() { const w = placement.worker; placement.worker = null; try { if (w) w.terminate(); } catch (_) { }
  (placement.aides || []).forEach(a => { try { a.terminate(); } catch (_) { } }); placement.aides = []; }
/* La file : le folio affiché d'abord — s'il attend pendant qu'un autre se calcule, l'autre cède (il reprendra) — ; puis
   les folios demandés ; puis, d'avance, les autres folios du contrat, un à la fois. Ce qui ne correspond plus à un folio
   du contrat (une liaison corrigée, un autre fichier) sort de la file. Quand il n'y a plus rien, l'affinage peut partir. */
function pomperPlacement() { if (!placement.ailleurs || placement.worker === false) return;
  const vivant = cle => { const a = placement.attentes.get(cle); return !!a && plans().includes(a.plan) && clePlacement(liaisonsDe(a.plan)) === cle; };
  placement.file = placement.file.filter(vivant);
  [...placement.attentes.keys()].forEach(cle => { if (!vivant(cle) && !(placement.encours && placement.encours.cle === cle)) placement.attentes.delete(cle); });
  const ici = cleCourante();
  if (placement.encours) { if (placement.encours.cle === ici || !placement.file.includes(ici)) { montrerAttente(); return; }
    const cede = placement.encours.cle, a = placement.attentes.get(cede); arreterPlacement(); placement.encours = null;
    if (a) { a.debut = 0; a.p = 0; } if (vivant(cede)) placement.file.push(cede); }
  const cle = placement.file.includes(ici) ? ici : placement.file.shift(); placement.file = placement.file.filter(k => k !== cle);
  if (!cle) { const p = prochainAuLoin(); if (p) demanderPlacement(p.cle, p.L, p.plan); else pomper(); montrerAttente(); return; }
  const w = travailleurPlacement(); if (!w) { placerIci(); return; }
  const a = placement.attentes.get(cle); a.debut = performance.now(); a.p = 0;
  placement.encours = { cle, t: a.debut }; w.postMessage({ cle, liaisons: a.L }); montrerAttente(); }
// le prochain folio du contrat à placer d'avance : après le folio affiché, dans l'ordre, un folio gros et jamais vu
function prochainAuLoin() { if (app.plan === '*' || app.nFolios) return null; const P = plans(), i = Math.max(0, P.indexOf(app.plan));
  for (let k = 1; k < P.length; k++) { const p = P[(i + k) % P.length], L = liaisonsDe(p); if (L.length <= SEUIL_ICI) continue; const cle = cleDuPlan(p);
    if (placement.prets.has(cle) || app.retouches.has(cle) || affinage.profonds.has(cle) || placements.has(cle) || placement.attentes.has(cle)) continue; return { cle, L, plan: p }; }
  return null; }
// la clé d'un folio, gardée tant que ses liaisons sont les mêmes (le même tableau : `liaisonsDe`)
const clesDesPlans = new Map();
function cleDuPlan(p) { const L = liaisonsDe(p), m = clesDesPlans.get(p); if (m && m.L === L) return m.cle; const cle = L.length ? clePlacement(L) : ''; clesDesPlans.set(p, { L, cle }); return cle; }
function recevoirDuLoin(e) { const d = e.data || {}; if (!placement.encours || d.cle !== placement.encours.cle) return;   // un calcul qu'on avait abandonné
  const a = placement.attentes.get(d.cle);
  if (d.etape != null) { if (a) a.p = Math.max(a.p, +d.etape || 0); return; }
  // l'esquisse : montrée tout de suite si le folio est affiché et n'a rien d'autre à montrer (ni son dessin d'avant)
  if (d.esquisse) { if (a && !a.esquisse) { a.esquisse = { ...d.esquisse, provisoire: 'esquisse' };
      if (cleCourante() === d.cle && !app.dessin) { rafraichirDessin(); finirAttente(a); } }
    montrerAttente(); return; }
  const duree = performance.now() - placement.encours.t; placement.encours = null;
  if (d.erreur) { placement.erreur = d.erreur; placerIci(d.cle); return; }
  placement.faits++; if (a && d.P) etalonner(a.L.length, duree); recevoirPlacement(d.cle, d.P, true); }
/* Sans Worker (refusé, ou en erreur) : le chemin d'avant, dans la page — juste après que l'attente s'est affichée, pour
   qu'on sache ce qui se passe ; le folio affiché d'abord. */
function placerIci(cle) { const ici = cleCourante(), cles = (cle ? [cle] : [...placement.attentes.keys()]).sort((a, b) => (b === ici) - (a === ici));
  setTimeout(() => cles.forEach(k => { const a = placement.attentes.get(k); if (!a) return; let P = null;
    try { P = meilleurPlacement(a.L); } catch (err) { placement.erreur = String((err && err.message) || err); }
    recevoirPlacement(k, P, true); }), 30); }
/* Le dessin arrive : il se garde ; sur le folio affiché, il remplace l'esquisse (ou le dessin d'avant) en fondu, sinon il
   s'ouvre comme un folio qu'on ouvre. */
function recevoirPlacement(cle, P, neuf) { const a = placement.attentes.get(cle); placement.attentes.delete(cle); placement.file = placement.file.filter(k => k !== cle);
  if (P) { garderPlacement(cle, P); if (neuf) garderConcours(cle, P); }
  else if (a && cleCourante() === cle) dire('Le folio ' + a.plan + ' n’a pas pu se dessiner' + (placement.erreur ? ' : ' + placement.erreur : '') + '.', true);
  if (P && cleCourante() === cle) { if (app.dessin && app.dessin.provisoire) { remplacerDessin(); const c = app.cible, k = c && c.type === 'bloc' && app.dessin && app.dessin.compDe.get(c.nom); if (k) montrerSiCache(k); } else { rafraichirDessin(); finirAttente(a); } }
  pomperPlacement(); montrerAttente(); }
/* Le dessin attendu est là (l'esquisse, ou le concours) : la vue se cadre comme si le folio venait de s'ouvrir ; ce qu'on a
   choisi pendant l'attente (depuis l'index, la recherche, le tableau) est choisi et cadré, comme si le dessin avait été là. */
function finirAttente(a) { const c = app.cible, d = app.dessin; if (!d) return; ajuster(); if (!c) return;
  if (c.type === 'fil') { const w = filDe(c.l); if (w) { allumerFil(w); viserFil(w); } return; }
  if (c.type !== 'bloc' || !a || c === a.cibleAvant) return;
  const k = d.comps.find(x => x.name === c.nom && x.kind !== 'tag'), vt = k ? null : barretteAPoser(c.nom);
  if (k) choisirBloc(k); else if (vt) choisirBarretteAPoser(vt); viser(c.nom); }
// la cible d'une recherche pendant que son folio se place au loin : sa fiche tout de suite, choisie et cadrée quand le dessin arrive
function reporterCible(cible) { if (cible.type === 'fil') { const l = verite().find(x => x.cable === cible.nom); if (!l) return; app.cible = { type: 'fil', l }; } else app.cible = { type: 'bloc', nom: cible.nom };
  ouvrirInspecteur(); }

/* ---- l'ATTENTE, honnête ------------------------------------------------- */
/* Combien de temps ? Le concours croît comme n^2,2 (n : les liaisons du folio, l'audit) ; la constante est celle de CET
   ordinateur, apprise sur chaque folio placé (une moyenne glissante) et gardée dans ce navigateur. La première fois, celle
   d'un ordinateur de bureau ordinaire. */
const ETALON = (() => { const e = { c: 0.5, n: 0 }; try { const x = JSON.parse(localStorage.getItem('volta.placement.etalon') || 'null'); if (x && x.c > 0 && isFinite(x.c)) Object.assign(e, x); } catch (_) { } return e; })();
const dureeEstimee = n => ETALON.c * Math.pow(Math.max(1, n), 2.2);
function etalonner(n, ms) { if (!(n > SEUIL_ICI) || !(ms > 0)) return; const c = ms / Math.pow(n, 2.2);
  ETALON.c = ETALON.n ? 0.6 * ETALON.c + 0.4 * c : c; ETALON.n++;
  try { localStorage.setItem('volta.placement.etalon', JSON.stringify(ETALON)); } catch (_) { } }
// une durée, en mots : « 8 s », « 25 s », « 2 min »
const enSecondes = ms => { const s = ms / 1000; return s < 15 ? Math.max(1, Math.round(s)) + ' s' : s < 60 ? Math.round(s / 5) * 5 + ' s' : s < 100 ? '1 min' + (s >= 80 ? ' 30' : '') : Math.round(s / 60) + ' min'; };
/* Où en est le folio `a` : une fraction (le temps écoulé sur le temps estimé, ce que le Worker rapporte), et ce qu'il
   reste, en mots. En file derrière un autre folio : il attend son tour. */
function avancement(a) { const est = dureeEstimee(a.L.length);
  if (!a.debut) return { p: 0, mot: 'environ ' + enSecondes(est), file: !!placement.encours && placement.encours.cle !== a.cle };
  const ecoule = performance.now() - a.debut, p = Math.min(0.97, Math.max(a.p || 0, ecoule / est)), reste = est - ecoule;
  return { p, mot: ecoule < 1500 ? 'environ ' + enSecondes(est) : reste > 1500 ? 'encore environ ' + enSecondes(reste) : 'presque fini' }; }
// le nom du folio et sa place : « 3 / 20 », ou « MEE…003A (3 / 20) »
function folioEtRang(plan) { const P = plans(), i = P.indexOf(plan) + 1; if (!i) return String(plan); return String(plan) === String(i) ? i + ' / ' + P.length : plan + ' (' + i + ' / ' + P.length + ')'; }
// ce qu'on peut faire pendant ce temps : les problèmes du contrat (l'index « à reprendre »), le récapitulatif — comptés
// comme partout (« 5 problèmes · 9 à voir », `compteProblemes`, 08-controle)
function libelleProblemes() { const c = compteProblemes();
  return c.ko ? 'Les ' + c.mot : c.att ? (c.att > 1 ? 'Les ' + c.att + ' points à voir' : 'Le point à voir') : 'Les repères'; }
const gestesDeLAttente = () => `<span class="at-gestes">Pendant ce temps : <button type="button" data-at="problemes">${libelleProblemes()}</button><button type="button" data-at="recap">Le récapitulatif</button></span>`;
/* L'attente, visible : au milieu de la place libre du plan, le folio, ses câbles, la durée, une barre ; et ce qu'on peut
   faire pendant. Dans la barre du bas, la puce du folio qui se calcule respire ; les folios pas encore prêts sont pâles.
   L'élément se crée à la première attente, dans la planche (#attente). Une horloge le tient à jour tant qu'on attend. */
function montrerAttente() { const a = app.contrat.liaisons.length && !app.dessin ? attenteCourante() : null; let el = $('attente');
  if (!el && a) { el = document.createElement('div'); el.id = 'attente'; el.className = 'attente'; $('planche').appendChild(el);
    el.addEventListener('click', e => { const b = e.target.closest('[data-at]'); if (!b) return; if (b.dataset.at === 'problemes') basculerIndex(); else ouvrirBase(); }); }
  if (el) { if (!a) { el.hidden = true; el.dataset.cle = ''; }
    else { const m = marges(), v = avancement(a); Object.assign(el.style, { left: m.gauche + 'px', right: m.droite + 'px', top: m.haut + 'px', bottom: m.bas + 'px' });
      const detail = pluriel(a.L.length, 'câble') + ' · ' + (v.file ? 'son tour vient · ' : '') + v.mot;
      if (el.dataset.cle !== a.cle) { el.dataset.cle = a.cle;
        el.innerHTML = `<i aria-hidden="true"></i><b role="status">Dessin du folio ${esc(folioEtRang(a.plan))}</b><small class="at-detail">${esc(detail)}</small>`
          + `<span class="at-barre" aria-hidden="true"><span></span></span>${gestesDeLAttente()}`; }
      else { const s = el.querySelector('.at-detail'); if (s && s.textContent !== detail) s.textContent = detail;
        // le contrôle du contrat arrive après la lecture : le geste des problèmes en dit le compte dès qu'il est là
        const b = el.querySelector('[data-at="problemes"]'), mot = libelleProblemes(); if (b && b.textContent !== mot) b.textContent = mot; }
      const barre = el.querySelector('.at-barre span'); if (barre) barre.style.transform = `scaleX(${v.p.toFixed(3)})`; el.hidden = false; } }
  const vifs = new Set(); if (a) vifs.add(app.plan); if (placement.encours && placement.attentes.has(placement.encours.cle)) vifs.add(placement.attentes.get(placement.encours.cle).plan);
  const prets = foliosPrets(), pas = prets && prets.n < prets.N ? prets.pas : null;
  $('fo-strip').querySelectorAll('.chip').forEach(c => { c.classList.toggle('attend', vifs.has(c.dataset.plan)); c.classList.toggle('a-venir', !!pas && pas.has(c.dataset.plan) && !vifs.has(c.dataset.plan)); });
  montrerBande(); remonterHorloge(); }
// l'horloge de l'attente : quatre fois par seconde tant qu'un folio se calcule ou s'esquisse, rien sinon
function remonterHorloge() { const utile = placement.ailleurs && (!!placement.encours || placement.attentes.size > 0);
  if (utile && !placement.horloge) placement.horloge = setInterval(() => { montrerAttente(); }, 250);
  else if (!utile && placement.horloge) { clearInterval(placement.horloge); placement.horloge = 0; } }
/* Les folios prêts : placés (dans cette session, ou relus de ce navigateur), affinés, retouchés, ou assez petits pour
   se placer à l'instant. Rend { n, N, pas: les folios pas encore prêts } ; compté au plus deux fois par seconde. */
function foliosPrets() { const t = performance.now(), m = foliosPrets.m; if (m && t - m.t < 500) return m.r;
  const P = plans(); let r = null;
  if (P.length > 1 && app.plan !== '*' && !app.nFolios && placement.ailleurs) { const pas = new Set();
    P.forEach(p => { const L = liaisonsDe(p); if (L.length <= SEUIL_ICI) return; const k = cleDuPlan(p);
      if (!(placement.prets.has(k) || placements.has(k) || affinage.profonds.has(k) || app.retouches.has(k))) pas.add(p); });
    r = { n: P.length - pas.size, N: P.length, pas }; }
  foliosPrets.m = { t, r }; return r; }
/* LA PETITE BANDE du milieu, en bas (#affinage) : ce qui travaille pour nous, une chose à la fois — le dessin définitif du
   folio affiché (l'esquisse est là), les folios qui se préparent (« 7 / 20 folios prêts »), puis le dessin qui s'affine. */
function montrerBande() { const el = $('affinage'); if (!el) return; const txt = $('af-txt'); let barre = el.querySelector('.af-barre');
  const poser = (mot, p, ailleurs, bulle) => { el.hidden = false; el.classList.toggle('ailleurs', !!ailleurs); el.setAttribute('aria-live', p == null ? 'polite' : 'off'); if (txt.textContent !== mot) txt.textContent = mot;
    if (p == null) { if (barre) barre.hidden = true; } else { if (!barre) { barre = document.createElement('span'); barre.className = 'af-barre'; barre.setAttribute('aria-hidden', 'true'); barre.appendChild(document.createElement('span')); el.appendChild(barre); }
      barre.hidden = false; barre.firstChild.style.transform = `scaleX(${Math.max(0.02, p).toFixed(3)})`; }
    el.setAttribute('aria-label', bulle ? mot + ' — ' + bulle : mot); el.removeAttribute('title'); };
  const a = attenteCourante();
  if (a && app.dessin && app.dessin.provisoire) { const v = avancement(a);
    poser((app.dessin.provisoire === 'esquisse' ? 'Esquisse · le dessin définitif ' : 'Dessin d’avant · le nouveau ') + (v.mot === 'presque fini' ? 'arrive' : 'dans ' + v.mot.replace(/^encore /, '')), v.p, false, 'le folio se lit déjà ; son dessin définitif le remplacera sans bouger la feuille'); return; }
  const prets = foliosPrets();
  if (prets && prets.n < prets.N && (placement.encours || placement.attentes.size)) { poser(prets.n + ' / ' + prets.N + ' folios prêts', prets.n / prets.N, true, 'les autres folios se dessinent en arrière-plan, l’un après l’autre'); return; }
  const j = affinage.encours, e = affinage.etat;
  if (affinage.actif && j) { const ici = j.cle === cleCourante(), reste = affinage.file.length;
    poser((ici ? 'Le dessin s’affine' : 'Un autre folio s’affine') + (e ? ' · ' + e.k + ' / ' + e.n : '') + (reste ? ' · ' + reste + ' en attente' : ''), e && e.n ? e.k / e.n : null, !ici, 'chaque mieux trouvé remplace le dessin, et se garde dans ce navigateur'); return; }
  el.hidden = true; }
const montrerAffinage = montrerBande;
// le concours gardé : une entrée par version du moteur et folio ; les concours d'un moteur passé s'effacent, une fois par session
function garderConcours(cle, P) { ouvrirIDB().then(db => { db.transaction(IDB_CONCOURS, 'readwrite').objectStore(IDB_CONCOURS).put({ P, t: Date.now() }, VERSION_MOTEUR + '|' + cle); }).catch(() => { }); }
function lireConcours(cle) { return ouvrirIDB().then(db => new Promise(ok => { if (!placement.nettoye) { placement.nettoye = true; nettoyerConcours(db); }
  const r = db.transaction(IDB_CONCOURS).objectStore(IDB_CONCOURS).get(VERSION_MOTEUR + '|' + cle); r.onsuccess = () => ok((r.result && r.result.P) || null); r.onerror = () => ok(null); })).catch(() => null); }
function nettoyerConcours(db) { try { const st = db.transaction(IDB_CONCOURS, 'readwrite').objectStore(IDB_CONCOURS), req = st.openKeyCursor(), vieux = [];
  req.onsuccess = () => { const c = req.result; if (c) { if (!String(c.key).startsWith(VERSION_MOTEUR + '|')) vieux.push(c.key); c.continue(); } else vieux.forEach(k => st.delete(k)); }; } catch (_) { } }
/* Pour les bancs : envoyer le placement au loin sous pilote (il y dort), et lire où il en est. */
function placementAilleurs(on) { placement.ailleurs = !!on; if (on && app.contrat.liaisons.length && !app.dessin) redessiner(); return etatPlacement(); }
function etatPlacement() { const plan = cle => { const a = placement.attentes.get(cle); return a ? a.plan : null; }, a = attenteCourante(), prets = foliosPrets();
  return { ailleurs: placement.ailleurs, worker: placement.worker === false ? 'refusé' : placement.worker ? 'oui' : 'pas encore', encours: placement.encours ? plan(placement.encours.cle) : null,
    file: placement.file.map(plan), attentes: [...placement.attentes.values()].map(a => a.plan), faits: placement.faits, relus: placement.relus, gardes: placements.size, erreur: placement.erreur,
    provisoire: (app.dessin && app.dessin.provisoire) || null, esquisse: !!(a && a.esquisse), prets: prets ? prets.n + ' / ' + prets.N : null, etalon: Math.round(ETALON.c * 1000) / 1000, aides: (placement.aides || []).length }; }
/* ---- la RETOUCHE : tout se prend à la souris, tout suit ----------------- */
/* Le dessin automatique est le point de départ ; on en a la MAÎTRISE TOTALE (le lecteur : « tout doit bouger — bornier,
   fil, borne, tout »). Ce qui se prend, et comment :
   · un BLOC — équipement, disjoncteur, bornier, barrette, prise, renvoi, et la PASTILLE d'une masse, d'un morceau de
     barrette, d'un rail — glisse OÙ L'ON VEUT, en x comme en y, au pas du CARREAU de la feuille (le quadrillage fin du
     papier) ; les colonnes se relisent sur les blocs posés (05, `preparerPose`) ;
   · une BORNE glisse le long de son bloc (là où elle se dessine : le bout de fil entre le flanc et le corps, la pastille
     numérotée d'une barrette), au demi-pas des bornes ; sur une autre, elles échangent leurs places (05, `preparerBorne`) ;
   · un TRONÇON DE FIL : vertical, il glisse à gauche ou à droite, de piste en piste, jusque dans une autre goulotte ;
     horizontal — un couloir qui traverse une colonne —, il monte ou descend (05, les consignes) ;
   · une BARRETTE À POSER glisse dans sa goulotte, au ras de sa borne ou plus loin.
   Au survol, ce qui se prendrait s'allume et le curseur dit dans quel sens ça va. Des AIMANTS, pas des rails : la hauteur
   où un fil devient droit, les bords alignés sur un voisin, la paroi d'une goulotte, la place que le moteur donnait — un
   guide fin pointillé le montre ; Alt laisse libre. Pendant le geste, un FANTÔME est à la place visée, rouge quand elle
   est prise ; l'objet, lui, est déjà à la place libre la plus proche, où il tombera, et le mot le dit quand on lâche. Le
   routeur garde ses règles : pas d'oblique, pas de fil dans un bloc, pas de fil partagé — une pose qui en romprait une est
   refusée. Lâché, le folio est RETOUCHÉ : l'automatique ne repasse plus dessus ; son dessin se garde dans ce navigateur
   (IndexedDB), Ctrl+Z défait le geste, ↺ (ou un double-clic) rend au dessin automatique ce qu'on a changé — un fil, une borne, un
   bloc —, « Dessin retouché · revenir au dessin automatique » le folio entier. Un bloc choisi se pousse aux flèches, d'un carreau
   (Maj : cinq). Au doigt, un appui long prend ce qui est dessous (un glissé simple déplace la vue). */
const PAS_PAPIER = 25;   // le carreau du papier (06, le motif `gfine`), en unités de la feuille : × k en unités du dessin
const PAS_BORNE = PRH / 2;   // une borne glisse au demi-pas des bornes ; un couloir aussi
const surLeBloc = (c, nom, e) => String(nom) === String(c.name) && e.x >= c.x - 1 && e.x <= c.x + c.w + 1 && e.y >= c.y - 1 && e.y <= c.y + c.h + 1;
/* Le dessin que le moteur donne au folio, sans la main : celui qu'on rend. `connu` : seulement s'il est déjà là (affiné,
   ou placé dans cette session) — sinon le moteur le recalcule, ce qui prend quelques secondes sur un gros folio. */
function placementAuto(L, connu) { const cle = clePlacement(L);
  if (affinage.profonds.has(cle)) return affinage.profonds.get(cle); if (placements.has(cle)) return placements.get(cle); if (connu) return null;
  const P = meilleurPlacement(L); if (P) garderPlacement(cle, P); return P; }
// les consignes d'un dessin (05), toujours de la même forme
const consignesDe = P => ({ fils: ((P.geom && P.geom.consignes && P.geom.consignes.fils) || []).slice(), barrettes: ((P.geom && P.geom.consignes && P.geom.consignes.barrettes) || []).slice() });
// le dessin retouché, recomposé pour l'interface ; il porte la poussée du geste
function dessinRetouche(P, r) { const compDe = new Map(); r.comps.forEach(k => { if (k.id != null) compDe.set(k.id, k); if (!compDe.has(k.name)) compDe.set(k.name, k); });
  return { ...P, comps: r.comps, links: r.links, geom: r.geom, compDe, routage: r.routage, retouche: true, poussee: r.poussee || 0 }; }
/* Un dessin retouché où la main n'a plus rien laissé — ni bloc posé, ni borne déplacée, ni consigne — et dont les blocs
   sont là où le moteur les met : c'est le dessin du moteur. */
function retoucheVide(P, auto) { const C = consignesDe(P);
  if (C.fils.length || C.barrettes.length || P.comps.some(c => c.main || Object.values(c.rangs || {}).some(ps => ps.some(p => p.ya != null)))) return false;
  if (!auto) return false; const parId = new Map(auto.comps.map(c => [c.id, c]));
  return P.comps.every(c => { const a = parId.get(c.id); return a && Math.abs(a.x - c.x) < 0.5 && Math.abs(a.y - c.y) < 0.5 && Math.abs(a.h - c.h) < 0.5; }); }

/* ---- les BLOCS ---- */
/* Prendre un bloc du dessin P (un geste à la souris, une poussée aux flèches) : la pose préparée par le moteur, le carreau,
   ce que la feuille laisse au bloc, ses aimants. La feuille : sa zone utile (cartouche ôté) au début du geste, et de quoi
   en sortir de la taille du bloc — le dessin grandit, la feuille se recale dessus ; plus loin, il se perdrait. */
function bornesDeLaFeuille(lo, hi, haut, bas) { const bb = (app.dessin && app.dessin.bbox) || null, k = (bb && bb.k) || 1;
  if (!bb) return { x0: -Infinity, x1: Infinity, y0: -Infinity, y1: Infinity };
  const m = (PAGE_CADRE + PAGE_MARGE) * k, lx = hi - lo, ly = bas - haut;
  return { x0: Math.min(0, bb.x + m - lx - lo), x1: Math.max(0, bb.x + bb.w - m + lx - hi), y0: Math.min(0, bb.y + m - ly - haut), y1: Math.max(0, bb.y + bb.h - (m + PAGE_CARTOUCHE * k) + ly - bas) }; }
function preparerPrise(P, c) { const pose = preparerPose(P, c), k = (app.dessin && app.dessin.bbox && app.dessin.bbox.k) || 1, [flo, fhi] = pose.etendue;
  return { P, c, pose, pas: PAS_PAPIER * k, bornes: bornesDeLaFeuille(flo, fhi, c.y, c.y + c.h), aimants: aimantsDuBloc(P, c, pose) }; }
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
   paroi d'une goulotte ; pour une pastille, sa place collée contre sa borne. Chacun sait tracer son guide pour une pose. */
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
  // une pastille : sa place collée, au bout d'un fil court, du côté de sa borne
  const k = pose.colle, e = pose.partenaire && pose.partenaire.ep; if (k && e) {
    const ici = () => ({ x1: Math.min(e.x, k.x), y1: e.y, x2: Math.max(e.x, k.x + c.w), y2: e.y });
    x.push({ d: k.x - c.x, fort: true, guide: ici }); y.push({ d: k.y - c.y, fort: true, guide: ici }); }
  return { x, y }; }
/* le dessin avec le bloc déplacé de (dx, dy), ses pastilles avec lui, les colonnes relues et rerouté (05) ; nul si la pose
   est refusée — sur un bloc, à côté d'un bloc de sa colonne — ou si le dessin romprait une règle (un numéro de plus qui
   ne s'écrit pas, un fil dans un bloc, partagé, rompu) */
function deplacerBloc(P, c, dx, dy, pose) { const r = (pose || preparerPose(P, c)).poser(dx, dy);
  if (r.refus || r.muets > r.muetsAvant || !routageSain(r.comps, r.routage)) return null; return dessinRetouche(P, r); }

/* ---- les BORNES ---- */
/* Les aimants d'une borne : les hauteurs où un de ses fils devient droit (l'autre bout sur un autre bloc), la place que le
   moteur lui donnait, celles des autres bornes de son flanc (elles échangent leurs places). */
function aimantsDeBorne(P, c, y0) { const y = [], ici = { x: c.x, w: c.w };
  P.links.forEach(l => { if (l.shunt || l.boucle || !l.epA || !l.epB) return;
    [[l.de, l.epA, l.epB], [l.vers, l.epB, l.epA]].forEach(([n, e, e2]) => { if (!surLeBloc(c, n, e) || Math.abs(e.y - y0) > 0.5 || surLeBloc(c, n, e2)) return;
      y.push({ y: e2.y, fort: true, guide: () => ({ x1: Math.min(e.x, e2.x), y1: e2.y, x2: Math.max(e.x, e2.x), y2: e2.y }) }); }); });
  Object.values(c.rangs || {}).flat().forEach(p => { if (Math.abs(p.y - y0) < 0.5) { if (p.ya != null) y.push({ y: p.ya, fort: true, guide: () => ({ x1: ici.x - 8, y1: p.ya, x2: ici.x + ici.w + 8, y2: p.ya }) }); return; }
    y.push({ y: p.y, guide: () => ({ x1: ici.x - 8, y1: p.y, x2: ici.x + ici.w + 8, y2: p.y }) }); });
  return y; }

/* ---- les FILS et les BARRETTES À POSER ---- */
/* Les bouts d'un fil, rangés comme le routeur les range : `g` celui de la goulotte de gauche. */
const boutsDuFil = l => { const A = l.epA, B = l.epB; return A.ch > B.ch || (A.ch === B.ch && A.stub === 'R' && B.stub === 'L') ? [B, A] : [A, B]; };
/* La consigne d'un fil après un geste sur un de ses tronçons (05, les consignes) : `k0` celle d'avant ; un tronçon
   VERTICAL de la goulotte ch0 posé à l'abscisse X (dans la goulotte ch1) ; un tronçon HORIZONTAL posé à la hauteur Y.
   Une verticale qui passe dans la goulotte de l'autre bout du fil : il part droit de ce bout (un couloir à sa hauteur) ;
   dans une goulotte où aucun de ses bouts ne regarde, il y passe (le couloir s'oublie). Un couloir posé : les verticales
   ailleurs que dans ses deux goulottes s'oublient. */
function consigneDuGeste(l, k0, geste, G) { const [g, d] = boutsDuFil(l), xs0 = (k0 && k0.xs) || [];
  if (geste.y != null) return { li: l.i, y: geste.y, xs: xs0.filter(x => [g.ch, d.ch].includes(G.chDe(x))) };
  const ch0 = geste.ch0, ch1 = G.chDe(geste.x), xs = [...xs0.filter(x => { const ch = G.chDe(x); return ch !== ch0 && ch !== ch1; }), geste.x];
  if (ch1 === ch0) return { li: l.i, ...(k0 && k0.y != null ? { y: k0.y } : {}), xs };
  if (ch0 === g.ch && ch1 === d.ch && g.ch !== d.ch) return { li: l.i, y: g.y, xs: [geste.x] };
  if (ch0 === d.ch && ch1 === g.ch && g.ch !== d.ch) return { li: l.i, y: d.y, xs: [geste.x] };
  return { li: l.i, xs }; }
// la goulotte d'un dessin, comme le routeur la voit
const goulottesDe = P => goulottes({ comps: P.comps, geom: P.geom });
/* Le dessin avec ces consignes, routé (05) ; nul s'il ne tient pas ses règles — une oblique, un fil dans un bloc ou
   partagé, un fil rompu, un numéro de plus qui ne s'écrit pas. */
function avecConsignes(P, consignes) { const r = poserConsignes(P, consignes);
  if (!routageSain(r.comps, r.routage) || r.muets > r.muetsAvant) return null; return dessinRetouche(P, r); }
// un dessin où une borne a glissé (05) ; nul si la pose est refusée ou si elle romprait une règle
function deplacerBorne(P, pb, y) { const r = pb.poser(y); if (!r || r.refus || r.rien) return null;
  if (!routageSain(r.comps, r.routage) || r.muets > r.muetsAvant) return null; return dessinRetouche(P, r); }

/* ---- la garde, le retour au moteur ---- */
// la retouche se garde (IndexedDB) ; une clé sans retouche s'efface
function garderRetouche(cle) { const P = app.retouches.get(cle);
  ouvrirIDB().then(db => { const st = db.transaction(IDB_RETOUCHES, 'readwrite').objectStore(IDB_RETOUCHES); if (P) st.put({ P, t: Date.now() }, cle); else st.delete(cle); }).catch(() => { }); }
function relireRetouches() { ouvrirIDB().then(db => { const req = db.transaction(IDB_RETOUCHES, 'readonly').objectStore(IDB_RETOUCHES).openCursor(); let vu = false;
  req.onsuccess = () => { const c = req.result; if (!c) { if (vu) rafraichirDessin(); return; } if (c.value && c.value.P && !app.retouches.has(String(c.key))) { app.retouches.set(String(c.key), c.value.P); vu = true; } c.continue(); }; }).catch(() => { }); }
function revenirAutomatique() { const cle = cleCourante(); if (!cle || !app.retouches.has(cle)) return;
  histPush('retouche de ce folio', true); app.retouches.delete(cle); garderRetouche(cle); rafraichirDessin(); direRetablir('Le dessin automatique revient sur ce folio ; vos retouches attendent derrière « Rétablir » (ou Ctrl+Z).'); }
/* Rendre au moteur UN objet retouché (↺, ou un double-clic) : un fil perd sa consigne, une barrette à poser aussi ; une
   borne revient à la hauteur que le moteur lui donnait (elle échange au besoin sa place avec celle qui l'a prise) ; un
   bloc revient à la place que le moteur lui donnait, si elle est libre. Quand la main n'a plus rien laissé, le folio
   redevient celui du moteur. */
function rendreAuMoteur(objet) { const L = liaisonsDuPlan(), cle = L.length ? clePlacement(L) : null, P = cle && app.retouches.get(cle); if (!P) return false;
  let P2 = null, nom = '', refus = '';
  if (objet.genre === 'fil') { const l = P.links[objet.li], C = consignesDe(P); C.fils = C.fils.filter(k => k.li !== objet.li); P2 = avecConsignes(P, C); nom = String((l && l.cable) || 'le câble'); }
  else if (objet.genre === 'vt') { const C = consignesDe(P); C.barrettes = C.barrettes.filter(k => k.cle !== objet.cle); P2 = avecConsignes(P, C); nom = objet.nom; }
  else if (objet.genre === 'borne') { const c = P.comps.find(k => k === objet.c), p = c && Object.values(c.rangs).flat().find(q => Math.abs(q.y - objet.y) < 0.5);
    if (c && p && p.ya != null) { const pb = preparerBorne(P, c, p.y), r = pb && pb.examiner(p.ya); P2 = r && !r.refus ? deplacerBorne(P, pb, p.ya) : null;
      if (!P2) refus = r && r.refus === 'serre' ? 'une autre borne est trop près de sa place' : 'son bloc grandirait sur un voisin'; }
    nom = 'la borne ' + (p ? p.etiq : '') + ' de ' + objet.c.name; }
  else if (objet.genre === 'bloc') { const c = P.comps.find(k => k === objet.c), auto = placementAuto(L), a = auto && c && auto.comps.find(k => k.id === c.id);
    if (a) { const pose = preparerPose(P, c), r = pose.examiner(a.x - c.x, a.y - c.y);
      P2 = r.refus ? null : deplacerBloc(P, c, a.x - c.x, a.y - c.y, pose);
      if (!P2) refus = 'la place que le dessin automatique lui donnait est prise' + (r.avec ? ' (' + r.avec.name + ')' : '');
      else { const i = P2.comps.findIndex(k => k.id === c.id); if (i >= 0) { const { main, ...sans } = P2.comps[i], comps = P2.comps.slice(); comps[i] = sans; P2 = dessinRetouche(P, { ...P2, comps }); } } }
    nom = c ? c.name : ''; }
  if (!P2) { dire(refus ? 'Impossible de rendre ' + nom + ' au dessin automatique : ' + refus + '.' : 'Rien à rendre au dessin automatique ici.', !!refus); return false; }
  histPush('rendre ' + nom + ' au dessin automatique', true);
  if (retoucheVide(P2, placementAuto(L, true))) app.retouches.delete(cle); else app.retouches.set(cle, P2);
  garderRetouche(cle); rafraichirDessin();
  direRetablir((nom.charAt(0).toUpperCase() + nom.slice(1)) + ' revient au dessin automatique.');
  return true; }
/* Le bouton du bas, sur un folio retouché : il dit ce qu'il fait — rendre le dessin au moteur — et sa bulle, que les
   retouches de ce folio se gardent dans ce navigateur. */
const MOT_RETOUCHE = 'Dessin retouché · revenir au dessin automatique', BULLE_RETOUCHE = 'Les retouches de ce folio se gardent dans ce navigateur ; ce bouton rend tout le folio au dessin automatique';
function synchroniserRetouche() { const b = $('btnAuto'); if (!b) return; const cle = cleCourante(); b.hidden = !(cle && app.retouches.has(cle));
  const mot = b.querySelector('span:not(.bulle)'), bulle = b.querySelector('.bulle');
  if (mot && mot.textContent !== MOT_RETOUCHE) mot.textContent = MOT_RETOUCHE;
  if (bulle && bulle.textContent !== BULLE_RETOUCHE) bulle.textContent = BULLE_RETOUCHE;
  if (b.getAttribute('aria-label') !== MOT_RETOUCHE) b.setAttribute('aria-label', MOT_RETOUCHE); }
function calculer() {
  const L = liaisonsDuPlan(); if (!L.length) { app.dessin = null; return null; }
  // l'affinage se met en file ici, mais ne part qu'une fois tous les folios placés (`pomper`)
  const P = placementDe(L); affinerTout();
  // le dernier vrai dessin du folio : s'il change (un numéro, une borne), on le montre en attendant le nouveau (`provisoire`)
  if (P && !P.provisoire && app.plan !== '*') placement.derniers.set(app.plan, { bouts: boutsDe(L), P });
  // la feuille : la même pour tous les folios (A3 paysage), le dessin calé dedans ; `provisoire` : l'esquisse ou le dessin d'avant
  app.dessin = P ? { comps: P.comps, links: P.links, bbox: pageDe(P.comps, P.routage.fils), geom: P.geom, compDe: P.compDe,
                     fils: P.routage.fils, points: P.routage.points, barrettes: P.routage.barrettes, piquages: P.routage.piquages, provisoire: P.provisoire || null } : null;
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
// les couleurs des routes, dans l'ordre où elles se donnent (les routes par leur nom) : ni le rouge ni le vert des ÉTATS
// en tête (l'audit v72 : « une prise saine montre quatre contacts rouges ») — le bleu, le violet, la sarcelle, le brun,
// l'ardoise, l'olive, le magenta ; l'orange, le rouge et le vert en dernier, pour un contrat à huit routes et plus
const PALETTE_ROUTES = ['#1f5fbf', '#7d3c98', '#117a8b', '#9a6324', '#9c7a00', '#5d6d1e', '#c2185b', '#d35400', '#c0392b', '#1e8449'];
function couleursDesRoutes() { const choisies = app.contrat.couleursRoutes || {}, m = new Map();
  [...new Set(app.contrat.liaisons.map(l => l.route).filter(Boolean))].sort(triNaturel).forEach((r, i) => m.set(r, choisies[r] || PALETTE_ROUTES[i % PALETTE_ROUTES.length]));
  return m; }
// la légende d'un folio : ses routes, chacune avec son nombre de fils ; « sans route » quand d'autres en ont une
function legendeDesRoutes(fils, routeDe, routes) { const n = new Map(); fils.forEach(w => { const r = routeDe(w); n.set(r, (n.get(r) || 0) + 1); });
  if (![...n.keys()].some(Boolean)) return [];
  return [...n].sort((a, b) => (!a[0]) - (!b[0]) || triNaturel(a[0], b[0])).map(([route, k]) => ({ route, n: k, couleur: routes.get(route) || null })); }
// le folio du cartouche : son rang, le compte, son nom (un dessin FWD s'écrit sous le titre, 06 `cartoucheSvg`)
function folioCourant() { const P = plans(), i = P.indexOf(app.plan);
  return (app.plan !== '*' && P.length > 1 && i >= 0) ? { rang: i + 1, total: P.length, nom: app.plan } : { rang: 1, total: 1, nom: '' }; }
/* Ce qui s'écrit sous le repère : la désignation si on en a donné une ;
   sinon, pour une barrette, la référence choisie dans la bible, et pour une
   prise de coupure, le part number que le fichier porte ; sinon, la DESCRIPTION
   du retest (l'audit v72 : « Description1/2 disent RELAIS, POMPE, CB 10A » et
   l'outil écrivait « Nom — à taper ») — la première non vide de ses liaisons (`descriptionDuRetest`, 08-fiche). */
function designationDe(n) { const d = app.contrat.designations.get(n);
  // une barrette en modules : la désignation retenue (une variante, une norme) dit seulement ce que le remplissage vise
  if (estBarrette(n)) { const I = barretteInfos(n, verite(), app.bible, app.norme, d || ''); return I.plan ? I.reference : d || I.reference; }
  if (d) return d;
  if (estCoupure(n)) return coupureEnModules(n) ? planDeCoupure(n).plan.reference || coupureInfos(n, verite(), app.bible).reference : coupureInfos(n, verite(), app.bible).reference;
  return descriptionDuRetest(n); }
/* La bible, la norme et les hypothèses de simulation (leur persistance, leur adoption) vivent dans 08-normes.js : relireBible, adopterBible, relireNorme, adopterNorme, relireSimu, memoriserSimu. */
/* PEINDRE : la feuille et le dessin, en SVG. Le CHOIX (les crochets du bloc choisi) n'en fait plus partie : il se pose à
   part, dans son bloc (`peindreChoix`). Et la scène ne se refait que si ce qu'elle montre a changé — le dessin, le folio,
   le cartouche, ce qui s'écrit sous les repères (désignations, calibres, autres folios) : sa SIGNATURE. Choisir un bloc
   (`app.choisi = …; peindre()`, partout dans l'outil) ne réécrit plus tout le folio pour quatre crochets (l'audit de
   fluidité v72 : 290 ms par clic, dont la moitié à refaire le SVG). */
let peint = { dessin: null, sig: '' };
/* Le calibre qu'un disjoncteur écrit au folio : le retenu, et celui de l'installation quand le part number écrit en dit un
   autre (08-export, `calibresAuFolio` : « 15 A » et « (installation 10 A) » dessous — l'écran, l'impression, le SVG,
   le PNG et le dossier PDF disent la même chose). */
const calibresDuFolio = n => typeof calibresAuFolio === 'function' ? calibresAuFolio(n) : { calibre: calibreAuFolio(n), retest: null };
function peindre() {
  const svg = $('svg');
  $('vide').hidden = app.contrat.liaisons.length > 0 || !app.planId;   // un plan de la bibliothèque, vide : il le dit
  // pas de dessin : la table vide — ou, si le folio se place au loin, l'attente à sa place
  if (!app.dessin) { svg.innerHTML = ''; peint = { dessin: null, sig: '' }; appliquerVue(); montrerAttente(); return; }
  const D = app.dessin, folio = folioCourant(), des = new Map(), cal = new Map(), ail = ailleursDesReperes();
  const designation = n => { if (!des.has(n)) des.set(n, designationDe(n)); return des.get(n); };
  const disjoncteur = n => { if (!cal.has(n)) cal.set(n, calibresDuFolio(n)); return cal.get(n); };
  const sig = JSON.stringify([folio, app.contrat.cartouche, D.comps.map(c => [designation(c.name), c.kind === 'equip' && estDisjoncteur(c.name) ? [disjoncteur(c.name).calibre, disjoncteur(c.name).retest || null] : null, c.kind === 'equip' ? ail(c.name) : null])]);
  if (peint.dessin === D && peint.sig === sig && $('scene')) { peindreChoix(); appliquerVue(); montrerAttente(); return; }
  svg.innerHTML = styleDessin() + `<g id="scene" transform="translate(${app.vue.tx},${app.vue.ty}) scale(${app.vue.s})">`
    + sceneSvg(D, app.contrat.cartouche, folio, designation, null, disjoncteur, ail) + '</g>';
  peint = { dessin: D, sig }; peindreChoix(); appliquerVue(); montrerAttente();
}
/* Les autres folios où paraît chaque repère, par leur rang (« ↔ f. 2 · 4 » sous le repère, 06) : une passe sur le contrat. */
function ailleursDesReperes() { const P = plans(), ou = new Map(); if (P.length < 2 || app.plan === '*') return () => null;
  app.contrat.liaisons.forEach(l => { if (!l.plan || l.plan === app.plan) return; [l.de, l.vers].forEach(n => { if (n) (ou.get(n) || ou.set(n, new Set()).get(n)).add(l.plan); }); });
  return n => { const s = ou.get(n); return s ? [...s].map(p => P.indexOf(p) + 1).filter(r => r > 0).sort((a, b) => a - b) : null; }; }
/* LE CHOIX, posé à la main dans le folio déjà peint : les crochets autour du symbole de chaque bloc qui porte le repère
   choisi (06 `crochetsDe` : une réglette, autour de sa réglette), ceux d'une barrette à poser autour de sa ligne. */
function peindreChoix() { const sc = $('scene'); if (!sc || !app.dessin) return; const D = app.dessin, nom = app.choisi;
  sc.querySelectorAll('.selbox').forEach(e => e.remove()); sc.querySelectorAll('.vt.sel').forEach(g => g.classList.remove('sel'));
  if (nom == null || nom === '') return; const n = xmlSur(nom);
  /* un repère dessiné plusieurs fois (une barrette en morceaux, 668VT31) : des crochets pleins sur l'occurrence cliquée, en
     pointillé sur les autres (le technicien v73 : « je ne sais pas laquelle est elle ») */
  const gs = [...sc.querySelectorAll('.comp')].filter(g => g.dataset.name === n), ici = gs.some(g => +g.dataset.k === app.choisiK) ? app.choisiK : gs.length ? +gs[0].dataset.k : -1;
  gs.forEach(g => { const c = D.comps[+g.dataset.k]; if (!c) return; const h = crochetsDe(c); g.insertAdjacentHTML('afterbegin', gs.length > 1 && +g.dataset.k !== ici ? h.replace('class="selbox"', 'class="selbox selbox-autre"') : h); });
  sc.querySelectorAll('.vt').forEach(g => { if (g.dataset.vt !== n) return; const b = (D.barrettes || []).find(x => x.nomVT === nom); if (!b) return; g.classList.add('sel'); g.insertAdjacentHTML('beforeend', crochetsDeBarrette(b)); }); }
function redessiner() { calculer(); peindre(); synchroniser(); rallumer(); }

/* ---- la vue : zoom, cadrage, l'ombre sous la feuille ------------------- */
const cadre = () => $('planche').getBoundingClientRect();
/* LE 100 % SE LIT (v73, l'ergonome : à « 100 % », un numéro de câble faisait 6,5 px sur le folio 3, 4,1 px un numéro de
   barrette — « il faut 200 % pour lire un numéro, et l'on perd la vue d'ensemble »). Le pourcentage se lit désormais par
   rapport à l'ÉCRITURE, plus à la feuille : à 100 %, un numéro de câble fait 11 px d'écran sur tous les folios (la plus
   petite écriture du dessin, 9 px) ; 1 et 2 vont à 100 et 200 %, les pas tombent sur les mêmes crans. */
const S100 = 11 / FS_FIL;
const zoomEnPourcent = s => Math.round(s / S100 * 100);
/* LE ZOOM SÉMANTIQUE : sous 7 px d'écran, une écriture ne se lit plus, elle fait de la poussière — le numéro d'un câble,
   d'une borne, d'une pastille, la lettre d'un connecteur, un petit repère se TAISENT (leur trait reste, le fil du câble
   se referme sous son numéro) ; le dessin cadré se lit comme une carte : les blocs, leurs repères, les routes. Ce qu'on
   survole ou qu'on a choisi parle toujours (`.hl`), en grand (la loupe, plus bas). Le zoom les rend en 140 ms. */
const SEUIL_TAIRE = 7;
function appliquerVue() {
  const sc = $('scene'); if (sc) { sc.setAttribute('transform', `translate(${app.vue.tx},${app.vue.ty}) scale(${app.vue.s})`);
    // LOIN : un trait de câble ferait moins d'un pixel d'écran — les traits s'épaississent (06), les routes gardent leur couleur
    const loin = app.vue.s * 0.95 < 0.9; if (sc.classList.contains('loin') !== loin) sc.classList.toggle('loin', loin);
    // trois paliers, par la taille des écritures (en unités du dessin) : 5,6 (une borne de connecteur, une pastille, un
    // petit repère), 6,4 (un numéro de câble, la lettre d'un connecteur, une désignation), 7,5 (une borne d'équipement)
    [['tait-1', 5.6], ['tait', FS_FIL], ['tait-3', 7.5]].forEach(([k, fs]) => { const t = fs * app.vue.s < SEUIL_TAIRE; if (sc.classList.contains(k) !== t) sc.classList.toggle(k, t); });
    if (LOUPE.s !== app.vue.s) poserLoupe(); }
  // la table glisse d'un rien sous la feuille (08-table), le fil de la carte suit son bloc (08-carte)
  parallaxeTable(); dessinerLien();
  $('zlbl').textContent = zoomEnPourcent(app.vue.s) + ' %';
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
/* La place du plan : ce que laissent le volet épinglé (à droite), le tableau (en bas), la fiche des documents (à droite).
   Le plan se recadre dans ce qui reste : rien ne le recouvre. La CARTE flottante (08-carte) ne prend aucune place : elle
   se pose à côté de son bloc, et s'écarte s'il passe dessous. */
function marges() { const tel = telephone(), folios = !$('folios').hidden, vu = id => !$(id).hidden ? $(id) : null;
  const droite = vu('fiche') || (carteFlottante() || (typeof grandLibre === 'function' && grandLibre()) ? null : vu('inspecteur')), bas = vu('base'), jeton = n => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)) || 0;
  const entete = jeton('--entete'), rail = jeton('--rail') || RAIL, pied = jeton('--pied') || 40;
  if (tel) { const d = vu('fiche') || vu('inspecteur') || bas; return { haut: 16 + entete, bas: (d ? d.offsetHeight + 8 : 8) + 56 + (folios ? 52 : 0), gauche: 12, droite: 12 }; }
  return { haut: 24 + entete, bas: (bas ? bas.offsetHeight + 16 : 0) + (folios ? pied + 24 : 24), gauche: rail + 24, droite: 24 + (droite ? droite.offsetWidth + 8 : 0) }; }
let anim = null, vueVisee = null;   // l'animation de la vue en cours, et la vue où elle va (la carte s'y place d'avance : 08-carte)
/* LA VUE GLISSE vers sa cible (260 ms). L'échelle va d'un pas égal en proportion (son logarithme) et le point du dessin au
   centre de la planche glisse droit vers le sien : l'interpolation de tx, ty et s chacun pour soi faisait d'abord fuir ce
   qu'on allait voir, puis le ramenait (un zoom fort « en S »). La première image ne revient jamais en arrière (l'instant
   d'une image peut précéder celui de l'appel). */
function animerVue(cible, doux) {
  if (anim) { cancelAnimationFrame(anim); anim = null; } vueVisee = cible; VUE.main = false;   // une vue que l'outil pose (08, `garderVue`)
  if (!doux || mouvementReduit()) { app.vue = cible; appliquerVue(); planifierEcart(false); return; }
  const de = { ...app.vue }, t0 = performance.now(), D = 260, r = cadre(), X = r.width / 2, Y = r.height / 2;
  const cA = { x: (X - de.tx) / de.s, y: (Y - de.ty) / de.s }, cB = { x: (X - cible.tx) / cible.s, y: (Y - cible.ty) / cible.s }, lA = Math.log(de.s), lB = Math.log(cible.s);
  const pas = t => { const k = Math.max(0, Math.min(1, (t - t0) / D)), e = 1 - Math.pow(1 - k, 3);
    if (k >= 1) app.vue = { ...cible };
    else { const s = Math.exp(lA + (lB - lA) * e), cx = cA.x + (cB.x - cA.x) * e, cy = cA.y + (cB.y - cA.y) * e; app.vue = { s, tx: X - cx * s, ty: Y - cy * s }; }
    appliquerVue(); anim = k < 1 ? requestAnimationFrame(pas) : null; };
  anim = requestAnimationFrame(pas);
  planifierEcart(doux);
}
// la main reprend la vue (un glisser, la molette, les doigts, un pas de zoom) : l'animation en cours s'arrête où elle est —
// elle ramenait sinon la vue sous la main, image après image, jusqu'à sa cible
function arreterVue() { if (anim) { cancelAnimationFrame(anim); anim = null; } vueVisee = null; }
/* La place libre du plan (la planche moins ses marges) : sa boîte, sa largeur, sa hauteur, son centre. */
function placeDuPlan() { const r = cadre(), m = marges(), W = Math.max(80, r.width - m.gauche - m.droite), H = Math.max(80, r.height - m.haut - m.bas);
  return { r, m, W, H, X: m.gauche + W / 2, Y: m.haut + H / 2 }; }
/* AJUSTER : la FEUILLE entière (le cartouche compris), ou le DESSIN seul — ses blocs, ses câbles, ses repères, au plus
   près : un petit folio se lit d'emblée (le folio 1 de l'exemple passe de 59 à 112 %, l'audit v72 ; il nageait dans deux
   tiers de papier vide). Le bouton, le pourcentage et la touche 0 ALTERNENT (`VUE.geste`, posé par la main qui le demande,
   `lierPlanche`) : déjà cadré, on passe à l'autre cadrage ; ailleurs, on revient au cadrage choisi. Le cadrage choisi vaut
   pour tous les folios, et un recadrage de l'outil (un panneau qui s'ouvre, un folio jamais vu) le suit. Le plan s'ouvre
   cadré sur le DESSIN (v73, le technicien : « à l'ouverture, le folio n'est qu'une poussière de traits ») — le cartouche
   se voit d'un 0 ; un petit dessin ne s'y grossit pas au-delà de 100 % (ses numéros à leur taille de lecture, 11 px). */
const VUE = { cadrage: 'dessin', geste: false, parFolio: null, retours: [], main: false };
const DESSIN_MAX = S100;
function boiteDuDessin(d) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; const v = (x, y) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
  d.comps.forEach(c => { v(c.x, c.y - 16); v(c.x + c.w, c.y + c.h + 14); });   // la lettre d'un connecteur au-dessus, le repère dessous
  d.fils.forEach(w => (w.pts || []).forEach(q => v(q.x, q.y)));
  (d.barrettes || []).forEach(b => { v(b.x - 12, b.y1 - 6); v(b.x + 12, b.y2 + 16); });
  return isFinite(x0) ? { x: x0, y: y0, w: Math.max(40, x1 - x0), h: Math.max(40, y1 - y0) } : d.bbox; }
// le zoom va de la moitié de la feuille entière à 400 % (un numéro de câble à 44 px : la plus petite écriture se lit de loin)
function bornesZoom(P) { const d = app.dessin; if (!d) return { min: ZMIN, max: ZMAX }; P = P || placeDuPlan();
  const bb = d.bbox, feuille = Math.min(P.W / bb.w, P.H / bb.h);
  return { min: Math.max(ZMIN, feuille / 2), max: Math.max(feuille, Math.min(ZMAX, 4 * S100)) }; }
function cadrageDe(quoi) { const d = app.dessin, P = placeDuPlan(), Z = bornesZoom(P), dessin = quoi === 'dessin';
  const b = dessin ? boiteDuDessin(d) : d.bbox, marge = dessin ? 24 : 0;
  const s = Math.max(Z.min, Math.min(dessin ? Math.min(Z.max, DESSIN_MAX) : Z.max, Math.min(P.W / (b.w + 2 * marge), P.H / (b.h + 2 * marge))));
  return { s, tx: P.X - (b.x + b.w / 2) * s, ty: P.Y - (b.y + b.h / 2) * s }; }
const memeVue = (a, b) => Math.abs(a.s - b.s) <= 0.015 * b.s && Math.abs(a.tx - b.tx) < 6 && Math.abs(a.ty - b.ty) < 6;
function ajuster(doux) {
  if (!app.dessin) { VUE.geste = false; app.vue = { s: 1, tx: 40, ty: 40 }; appliquerVue(); return; }
  if (VUE.geste) { VUE.geste = false; const ici = anim && vueVisee ? vueVisee : app.vue; if (memeVue(ici, cadrageDe(VUE.cadrage))) VUE.cadrage = VUE.cadrage === 'feuille' ? 'dessin' : 'feuille'; }
  animerVue(cadrageDe(VUE.cadrage), doux); }
// ce que fera « Ajuster » : la bulle du bouton et son nom le disent (lus quand on s'en approche)
function direAjuster() { const b = $('zfit'); if (!b || !app.dessin) return; const ici = anim && vueVisee ? vueVisee : app.vue;
  const vers = memeVue(ici, cadrageDe(VUE.cadrage)) ? (VUE.cadrage === 'feuille' ? 'dessin' : 'feuille') : VUE.cadrage, mot = vers === 'dessin' ? 'Le dessin, au plus près' : 'La feuille entière';
  const bulle = b.querySelector('.bulle'); if (bulle) bulle.innerHTML = esc(mot) + '<kbd>0</kbd>'; b.setAttribute('aria-label', mot + ' (0)'); }
/* Les PAS du zoom (les boutons, + et −) tombent sur des CRANS — … 50, 75, 100, 150, 200, 300 % — au lieu de
   59 → 73 → 92 → 115 % ; la molette et les doigts restent continus. */
const CRANS = [0.1, 0.15, 0.2, 0.25, 0.35, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6];
function zoomer(k, mx, my) { arreterVue(); const P = placeDuPlan(); if (mx == null) { mx = P.X; my = P.Y; }
  const wx = (mx - app.vue.tx) / app.vue.s, wy = (my - app.vue.ty) / app.vue.s, Z = bornesZoom(P);
  let ns = app.vue.s * k;
  if (Math.abs(k - 1.25) < 1e-9 || Math.abs(k - 0.8) < 1e-9) { const p = app.vue.s / S100, c = k > 1 ? CRANS.find(x => x > p * 1.02) : [...CRANS].reverse().find(x => x < p * 0.98); if (c != null) ns = c * S100; }
  ns = Math.max(Z.min, Math.min(Z.max, ns));
  app.vue = { s: ns, tx: mx - wx * ns, ty: my - wy * ns }; VUE.main = true; appliquerVue(); }
// un zoom donné (1 : 100 %, 2 : 200 %), autour d'un point de la planche (la souris), sinon du centre de la place
function zoomerA(pct, mx, my) { if (!app.dessin) return; zoomer(pct * S100 / app.vue.s, mx, my); }
/* LA VUE DE CHAQUE FOLIO : on retrouve un folio comme on l'a laissé (l'audit v72 : à 200 % sur un coin du folio 3, aller
   au 4 et revenir rendait la page entière). Elle se garde par plan et par folio — le point du dessin au centre de la
   place, et l'échelle : une fenêtre d'une autre taille la retrouve au même endroit —, dans ce navigateur, d'une session à
   l'autre (`retrouverVue`). */
const CLE_VUES = 'atelier.vues.v1', VUES_GARDEES = 120;
const cleDeVue = () => (app.planId || app.nom || '') + '\u0001' + app.plan;
function vuesGardees() { if (VUE.parFolio) return VUE.parFolio; VUE.parFolio = new Map();
  try { const o = JSON.parse(localStorage.getItem(CLE_VUES) || '[]'); if (Array.isArray(o)) o.forEach(e => { if (Array.isArray(e) && e[1] && e[1].s > 0) VUE.parFolio.set(e[0], e[1]); }); } catch (_) { }
  return VUE.parFolio; }
function garderVue() { if (!app.dessin || !app.plan) return;
  const v = anim && vueVisee ? vueVisee : app.vue, P = placeDuPlan(), M = vuesGardees(), k = cleDeVue();
  /* une vue que la MAIN a posée (un glisser, la molette, un pas de zoom, les doigts : `VUE.main`) se garde telle quelle ;
     une vue cadrée, ou posée par l'outil (aller voir un repère, une recherche), se garde comme un CADRAGE — elle se refera
     dans la place du moment (un tableau ouvert depuis, une autre fenêtre) : on revient au folio, pas à la recherche d'hier */
  const cadree = ['feuille', 'dessin'].find(q => memeVue(v, cadrageDe(q))) || (VUE.main ? null : VUE.cadrage);
  M.delete(k); M.set(k, cadree ? { cadre: cadree, s: +v.s.toFixed(4) } : { cx: +((P.X - v.tx) / v.s).toFixed(1), cy: +((P.Y - v.ty) / v.s).toFixed(1), s: +v.s.toFixed(4) });
  while (M.size > VUES_GARDEES) M.delete(M.keys().next().value);
  try { localStorage.setItem(CLE_VUES, JSON.stringify([...M])); } catch (_) { } }
/* Elle se garde quand on QUITTE le folio (`allerAuPlan`) ou la page (`pagehide`) — jamais pendant qu'elle bouge : au
   lancement, le cadrage d'office écraserait la vue de la veille avant qu'on ait pu la retrouver. */
/* Retrouver la vue gardée du folio affiché (le folio où l'on revient, le plan qu'on rouvre le lendemain) ; sinon le cadrer.
   Rend vrai si une vue gardée est revenue. */
function retrouverVue() { const v = app.dessin && vuesGardees().get(cleDeVue());
  if (!v) { ajuster(); return false; }
  if (v.cadre) { animerVue(cadrageDe(v.cadre), false); return true; }
  const P = placeDuPlan(), Z = bornesZoom(P), s = Math.max(Z.min, Math.min(Z.max, v.s));
  animerVue({ s, tx: P.X - v.cx * s, ty: P.Y - v.cy * s }, false); VUE.main = true; return true; }
const versMonde = (cx, cy) => { const r = cadre(); return { x: (cx - r.left - app.vue.tx) / app.vue.s, y: (cy - r.top - app.vue.ty) / app.vue.s }; };
function filSous(w) { if (!app.dessin) return null; const tol = Math.max(4, 7 / app.vue.s); let best = null, bd = tol;
  const d = (px, py, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy; let t = L2 ? ((px - a.x) * dx + (py - a.y) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy)); };
  for (const f of app.dessin.fils) for (let i = 0; i < f.pts.length - 1; i++) { const dd = d(w.x, w.y, f.pts[i], f.pts[i + 1]); if (dd < bd) { bd = dd; best = f; } }
  return best; }
/* Aller voir quelque chose (la recherche, l'index, un renvoi) : on le met au centre du vide, LISIBLE — au bureau, jamais
   sous un numéro de câble de 10 px d'écran (LISIBLE_BUREAU ; 412VC3B arrivait à 78 %, ses numéros à 5 px, l'audit v72),
   sans qu'un bloc qui tenait dans la place en déborde (300XC1, cinq cents unités de haut, se montre alors entier, au plus
   près). Au téléphone la place est petite : un bloc haut (un calculateur) y tiendrait en vignette illisible. On le cadre
   alors sur sa largeur, assez grand pour que son repère se lise (LISIBLE : cent pixels de large), et l'on en montre le
   haut — le reste se fait défiler au doigt. */
const LISIBLE = 100, LISIBLE_BUREAU = 10 / FS_FIL;
function centrerSur(x, y, w, h) { const r = cadre(), m = marges(), W = r.width - m.gauche - m.droite, H = r.height - m.haut - m.bas;
  let s = Math.max(app.vue.s, Math.min(LISIBLE_BUREAU, Math.min(W / (w + 80), H / (h + 80))));
  if (telephone()) s = Math.max(s, Math.min(2.5, W / (w + 24), LISIBLE / Math.max(w, 40)));
  s = Math.min(s, bornesZoom().max);
  const cx = m.gauche + W / 2, cy = m.haut + H / 2, entier = h * s <= H - 16;
  animerVue({ s, tx: cx - (x + w / 2) * s, ty: entier ? cy - (y + h / 2) * s : m.haut + 12 - y * s }, true); }
function viser(nom) { const c = app.dessin && app.dessin.compDe.get(nom);
  if (!c) { const b = barretteAPoser(nom); if (!b) return false; const bs = bornesDePiquage(b); centrerSur(b.x - 30, bs[0].y - 20, 60, bs[bs.length - 1].y - bs[0].y + 50); return true; }
  centrerSur(c.x, c.y, c.w, c.h); return true; }
function viserFil(f) { const xs = f.pts.map(p => p.x), ys = f.pts.map(p => p.y);
  const x0 = Math.min(...xs), y0 = Math.min(...ys); centrerSur(x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0); }

/* ---- la surbrillance : des classes sur le rendu, jamais un recalcul ---- */
/* Un fil s'allume EN ENTIER : son trait, son numéro et son fond, le bout de fil dessiné dans chaque bloc où il arrive
   (06 : `data-i` sur chacun) ; s'il part d'une barrette à poser, la barrette et son raccord — le câble à créer — avec lui
   (W-012 paraissait coupé à VT1). Les blocs s'allument par leur PLACE (`data-k`) : ceux où arrive un bout d'un fil
   allumé — les trois masses 906G d'un folio ne s'allument plus pour un seul de leurs fils. */
function eteindre() { const sc = $('scene'); if (!sc) return; effacerSurvolLeger(sc);
  if (sc.classList.contains('focus')) { sc.classList.remove('focus'); sc.querySelectorAll('.hl').forEach(el => el.classList.remove('hl')); }
  retirerLoupe(sc); }
// les blocs (leur place dans le dessin) où arrive un bout du fil
function blocsDuFil(w) { const D = app.dessin, out = []; if (!D) return out; const bouts = [w.epA, w.epB, w.pts[0], w.pts[w.pts.length - 1]].filter(Boolean);
  D.comps.forEach((c, k) => { if ((c.name === w.de || c.name === w.vers) && bouts.some(q => q.x >= c.x - 0.6 && q.x <= c.x + c.w + 0.6 && q.y >= c.y - 0.6 && q.y <= c.y + c.h + 0.6)) out.push(k); });
  return out; }
// les barrettes à poser d'où part un fil (le contrat du folio les nomme)
function barrettesDuFil(w, L) { const l = L[w.i]; return l ? [l.de, l.vers].filter(n => n && VT_A_POSER.test(n)) : []; }
// ce que des fils allument : leurs indices, les blocs où ils arrivent, les barrettes à poser d'où ils partent
function ceQuAllument(ws, blocs) { const L = liaisonsDuPlan(), idx = new Set(), vts = new Set(); blocs = blocs || new Set();
  ws.forEach(w => { idx.add(w.i); blocsDuFil(w).forEach(k => blocs.add(k)); barrettesDuFil(w, L).forEach(n => vts.add(n)); });
  return { idx, blocs, vts }; }
const porteUnDe = (e, idx) => e.dataset.i.split(' ').some(i => idx.has(+i));
function allumerSur(sc, A) { sc.classList.add('focus');
  sc.querySelectorAll('[data-i]').forEach(e => { if (porteUnDe(e, A.idx)) e.classList.add('hl'); });
  sc.querySelectorAll('.comp').forEach(g => { if (A.blocs.has(+g.dataset.k)) g.classList.add('hl'); });
  if (A.vts.size) sc.querySelectorAll('[data-vt]').forEach(g => { if (A.vts.has(g.dataset.vt)) g.classList.add('hl'); });
  poserLoupe(); }
/* LA LOUPE (v73, le zoom sémantique) : le folio cadré, un numéro de câble fait 4 à 7 px — illisible. Le câble qu'on
   survole, ceux du bloc choisi : leur numéro se LÈVE, à 11 px d'écran, sur une pastille de papier cerclée de la couleur
   de sa route, pile à sa place (son milieu sur l'axe du câble, debout sur un vertical). Deux pastilles ne se chevauchent
   pas : celle qui n'a pas la place garde son numéro à sa taille. Elle suit le zoom (`appliquerVue`), s'en va quand le
   numéro se lit seul (9,5 px). Rien de cela ne part à l'export : c'est l'écran. */
const LOUPE = { s: null, px: 11, seuil: 9.5, max: 40 };
const NS_SVG = 'http://www.w3.org/2000/svg';
function retirerLoupe(sc) { sc = sc || $('scene'); const g = sc && sc.querySelector(':scope > .loupe'); if (g) g.remove(); }
function poserLoupe() { const sc = $('scene'), s = app.vue.s; LOUPE.s = s; if (!sc) return; retirerLoupe(sc);
  if (FS_FIL * s >= LOUPE.seuil || !sc.classList.contains('focus')) return;
  const lus = [...sc.querySelectorAll('text.filnum.hl')].slice(0, 80); if (!lus.length) return;
  const F = LOUPE.px / s, AX = 0.365 * F, H = 1.42 * F, pad = 0.42 * F, poses = [], marge = 2 / s;
  const couleurDe = i => { const p = sc.querySelector(`path.cab[data-i="${i}"]`); return (p && p.style.stroke) || '#26323f'; };
  let h = '';
  for (const t of lus) { if (poses.length >= LOUPE.max) break;
    const nom = t.textContent, x = +t.getAttribute('x'), y = +t.getAttribute('y'), rot = /rotate\(-90/.test(t.getAttribute('transform') || '');
    // le milieu du numéro à sa taille : sur l'axe de son câble (06, `reperesDeFil` : la ligne de base à AXE sous l'axe)
    const cx = rot ? x - 0.365 * FS_FIL : x, cy = rot ? y : y - 0.365 * FS_FIL, W = largeurTexte(nom.length, F, 0.1 * F / FS_FIL) + 2 * pad;
    const b = rot ? { x0: cx - H / 2, x1: cx + H / 2, y0: cy - W / 2, y1: cy + W / 2 } : { x0: cx - W / 2, x1: cx + W / 2, y0: cy - H / 2, y1: cy + H / 2 };
    if (poses.some(o => b.x1 + marge > o.x0 && b.x0 - marge < o.x1 && b.y1 + marge > o.y0 && b.y0 - marge < o.y1)) continue;
    poses.push(b);
    const coul = couleurDe((t.dataset.i || '').split(' ')[0]), r = n3(0.32 * F);
    // (la rotation dans un groupe à elle : celui qui grandit en paraissant n'a pas de transform, son origine reste au centre)
    h += `<g class="lp"><g${rot ? ` transform="rotate(-90 ${n3(cx)} ${n3(cy)})"` : ''}><rect class="lp-ombre" x="${n3(cx - W / 2)}" y="${n3(cy - H / 2 + 0.12 * F)}" width="${n3(W)}" height="${n3(H)}" rx="${r}"/>`
      + `<rect class="lp-fond" x="${n3(cx - W / 2)}" y="${n3(cy - H / 2)}" width="${n3(W)}" height="${n3(H)}" rx="${r}" style="stroke:${coul}"/>`
      + `<text class="lp-n" x="${n3(cx)}" y="${n3(cy + AX)}" text-anchor="middle" style="font-size:${n3(F)}px">${esc(nom)}</text></g></g>`; }
  if (!h) return;
  const g = document.createElementNS(NS_SVG, 'g'); g.setAttribute('class', 'loupe'); g.setAttribute('aria-hidden', 'true'); g.innerHTML = h; sc.appendChild(g); }
/* L'OBJET TROUVÉ PULSE DEUX FOIS (v73, le technicien : « quand la recherche amène un objet, que l'œil le trouve ») : un
   anneau de glace s'élargit et s'efface autour du bloc, ou le câble s'éclaire deux fois — 2 × 300 ms, une fois la vue
   posée sur lui. Le mouvement réduit s'en passe (le bloc reste choisi, ses crochets le disent). */
function pulser(cible) { if (mouvementReduit() || !app.dessin) return; clearTimeout(pulser.t);
  pulser.t = setTimeout(() => { const sc = $('scene'), D = app.dessin; if (!sc || !D) return; sc.querySelectorAll(':scope > .pulse').forEach(e => e.remove());
    let el = null; const u = 1 / app.vue.s;
    if (cible.type === 'fil') { const w = cible.f, p = w && sc.querySelector(`path.cab[data-i="${w.i}"]`); if (!p) return;
      el = document.createElementNS(NS_SVG, 'path'); el.setAttribute('d', p.getAttribute('d')); el.setAttribute('class', 'pulse pulse-fil'); }
    // plusieurs liaisons à la fois (les câbles que Volta vient de grossir : 08-disjoncteurs) — leurs câbles dessinés, ensemble
    else if (cible.type === 'liaisons') { const ps = D.fils.filter(w => !w.shunt && cible.ls.some(l => l.cable ? w.cable === l.cable : !w.cable && ((w.de === l.de && w.vers === l.vers) || (w.de === l.vers && w.vers === l.de))))
        .map(w => sc.querySelector(`path.cab[data-i="${w.i}"]`)).filter(Boolean); if (!ps.length) return;
      el = document.createElementNS(NS_SVG, 'g'); el.setAttribute('class', 'pulse');
      ps.forEach(p => { const q = document.createElementNS(NS_SVG, 'path'); q.setAttribute('d', p.getAttribute('d')); q.setAttribute('class', 'pulse-fil'); el.appendChild(q); }); }
    else { const c = D.compDe.get(cible.nom) || D.comps.find(k => k.name === cible.nom), vt = c ? null : barretteAPoser(cible.nom); let b = null;
      if (c) { const q = boiteDuSymbole(c); b = { x: c.x + q.x, y: c.y + q.y, w: q.w, h: q.h }; }
      else if (vt) { const bs = bornesDePiquage(vt); b = { x: vt.x - 6, y: bs[0].y - 6, w: 12, h: bs[bs.length - 1].y - bs[0].y + 12 }; }
      if (!b) return; const m = 7 * u + 4;
      el = document.createElementNS(NS_SVG, 'rect'); el.setAttribute('class', 'pulse pulse-bloc');
      [['x', b.x - m], ['y', b.y - m], ['width', b.w + 2 * m], ['height', b.h + 2 * m], ['rx', 6 * u]].forEach(([k, v]) => el.setAttribute(k, n3(v))); }
    el.setAttribute('aria-hidden', 'true'); sc.appendChild(el);
    const fil = cible.type === 'fil' || cible.type === 'liaisons';
    const kf = fil ? [{ opacity: 0 }, { opacity: 0.75, offset: 0.35 }, { opacity: 0 }] : [{ opacity: 0.95, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.16)' }];
    const a = el.animate(kf, { duration: 300, iterations: 2, easing: fil ? 'ease-in-out' : 'cubic-bezier(.32,.72,0,1)' });
    a.onfinish = () => el.remove(); }, anim ? 300 : 30); }
function allumerBloc(nom) { const sc = $('scene'); if (!sc || !app.dessin) return; eteindre(); const D = app.dessin, blocs = new Set();
  D.comps.forEach((c, k) => { if (c.name === nom) blocs.add(k); });
  allumerSur(sc, ceQuAllument(D.fils.filter(w => !w.shunt && (w.de === nom || w.vers === nom)), blocs)); }
/* Plusieurs fils à la fois : ceux d'une borne, d'un module de barrette qu'on survole. */
function allumerFils(ws) { const sc = $('scene'); if (!sc) return; eteindre(); if (!ws.length) return; allumerSur(sc, ceQuAllument(ws)); }
const allumerFil = f => allumerFils([f]);
// une barrette à poser s'allume avec ses fils ; par sa clé de fil (08 bis), un fil ou, à défaut, la barrette de son raccord
function allumerBarretteAPoser(nom) { const sc = $('scene'); if (!sc) return; const ws = filsDeBarretteAPoser(nom); allumerFils(ws);
  if (!ws.length) { eteindre(); sc.classList.add('focus'); } sc.querySelectorAll('[data-vt]').forEach(g => { if (g.dataset.vt === xmlSur(nom)) g.classList.add('hl'); }); }
/* LE SURVOL NE VOLE PLUS LE CHOIX : quand un objet est choisi (sa fiche ouverte), ce qu'on survole se marque à peine
   (`.sv` : 62 % pour un bloc, 55 % pour ses fils) ; le choix, ses crochets et ses fils restent pleins (l'audit v72 : la
   fiche disait 352PM2, le plan allumait 351PM1, les crochets du choisi tombaient à 28 %). */
function survolLeger(ws, blocs) { const sc = $('scene'); if (!sc) return; effacerSurvolLeger(sc); if (!sc.classList.contains('focus')) return;
  const A = ceQuAllument(ws, blocs);
  sc.querySelectorAll('[data-i]').forEach(e => { if (!e.classList.contains('hl') && porteUnDe(e, A.idx)) e.classList.add('sv'); });
  sc.querySelectorAll('.comp').forEach(g => { if (A.blocs.has(+g.dataset.k) && !g.classList.contains('hl')) g.classList.add('sv'); }); }
function effacerSurvolLeger(sc) { sc = sc || $('scene'); if (sc) sc.querySelectorAll('.sv').forEach(e => e.classList.remove('sv')); }
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

/* ---- la planche : pan, pinch, molette, clic, survol, et la prise ------- */
/* Ce que la souris prend sous elle (w : un point du dessin) — d'abord ce qui est dessous au point près : une BORNE (là
   où elle se dessine, 06 `bornesPrenables`), un BLOC (le reste de son corps ; une pastille entière) ; puis, à quelques
   pixels, une BARRETTE À POSER, un TRONÇON DE FIL ; enfin un bloc à quelques unités près. Un tronçon se prend s'il est
   vertical dans une goulotte (`sens` 'V') ou s'il traverse une colonne d'un fil dont les bouts sont dans deux goulottes
   ('H') ; sinon il se clique seulement. Rend { genre: 'borne' | 'bloc' | 'vt' | 'fil', … } ou null. */
function blocA(w, m) { const cs = app.dessin.comps;
  for (let i = cs.length - 1; i >= 0; i--) { const c = cs[i]; if (w.x >= c.x - m && w.x <= c.x + c.w + m && w.y >= c.y - m && w.y <= c.y + c.h + m) return c; } return null; }
function blocSous(w) { return app.dessin ? blocA(w, 5) : null; }
function priseSous(w) { const d = app.dessin; if (!d) return null;
  const tol = Math.max(2.5, 6 / app.vue.s), surBloc = c => { if (c.kind === 'tag') return { genre: 'bloc', c };
    const z = bornesPrenables(c).find(z => w.x >= z.x0 - 1 && w.x <= z.x1 + 1 && w.y >= z.y0 && w.y <= z.y1);
    return z ? { genre: 'borne', c, y: z.y, etiq: z.etiq, zone: z } : { genre: 'bloc', c }; };
  const c = blocA(w, 0); if (c) return surBloc(c);
  const vt = barretteAPoserSous(w); if (vt) return { genre: 'vt', b: vt };
  const s = segmentSous(w, tol); if (s) return s;
  const c2 = blocA(w, 5); return c2 ? surBloc(c2) : null; }
// le tronçon de fil le plus proche, à `tol` près ; prenable ou non (`sens`)
function segmentSous(w, tol) { const d = app.dessin; let best = null, bd = tol;
  for (const f of d.fils) { if (f.shunt) continue; for (let i = 0; i + 1 < f.pts.length; i++) { const a = f.pts[i], b = f.pts[i + 1];
    const dd = Math.abs(a.x - b.x) < 0.5 ? (w.y < Math.min(a.y, b.y) || w.y > Math.max(a.y, b.y) ? Infinity : Math.abs(w.x - a.x))
      : (w.x < Math.min(a.x, b.x) || w.x > Math.max(a.x, b.x) ? Infinity : Math.abs(w.y - a.y));
    if (dd < bd) { bd = dd; best = { f, i, a, b }; } } }
  if (!best) return null;
  const { f, a, b } = best, l = d.links[f.i], g = d.geom, G = goulottes({ comps: d.comps, geom: g }); let sens = null;
  if (Math.abs(a.x - b.x) < 0.5) { if (G.chDe(a.x) >= 0) sens = 'V'; }
  else if (l && l.epA && l.epB) { const [bg, bd2] = boutsDuFil(l), xa = Math.min(a.x, b.x), xb = Math.max(a.x, b.x);
    if (bg.ch !== bd2.ch && g.colX.some((x, k) => x >= xa - 1 && x + g.colW[k] <= xb + 1)) sens = 'H'; }
  return { genre: 'fil', ...best, sens }; }
// les fils d'une borne : ceux dont un bout est sur ce bloc, à cette hauteur
const filsDeLaBorne = (c, y) => ((app.dessin && app.dessin.fils) || []).filter(w => !w.shunt && [[w.de, w.epA], [w.vers, w.epB]].some(([n, e]) => e && surLeBloc(c, n, e) && Math.abs(e.y - y) < 0.5));
// ce qu'un objet pris a de retouché (de quoi le rendre au moteur), et cet objet pour `rendreAuMoteur`
function objetDe(p) { if (!p) return null;
  if (p.genre === 'fil') return { genre: 'fil', li: p.f.i };
  if (p.genre === 'vt') return { genre: 'vt', cle: cleDeBarrette(p.b), nom: p.b.nomVT || 'la barrette' };
  if (p.genre === 'borne') return { genre: 'borne', c: p.c, y: p.y };
  return { genre: 'bloc', c: p.c }; }
function estRetouche(p) { const d = app.dessin; if (!p || !d) return false; const C = (d.geom && d.geom.consignes) || {};
  if (p.genre === 'fil') return (C.fils || []).some(k => k.li === p.f.i);
  if (p.genre === 'vt') return (C.barrettes || []).some(k => k.cle === cleDeBarrette(p.b));
  if (p.genre === 'borne') return Object.values(p.c.rangs || {}).flat().some(q => Math.abs(q.y - p.y) < 0.5 && q.ya != null);
  return !!p.c.main; }
const cleDePrise = p => !p ? '' : p.genre === 'fil' ? 'f' + p.f.i + ':' + p.i : p.genre === 'vt' ? 'v' + cleDeBarrette(p.b) : p.genre === 'borne' ? 'p' + app.dessin.comps.indexOf(p.c) + ':' + p.y : 'b' + app.dessin.comps.indexOf(p.c);
const sensDePrise = p => !p ? '' : p.genre === 'fil' ? (p.sens ? 'fil-' + p.sens.toLowerCase() : 'fil') : p.genre;
const prenable = p => !!p && (p.genre !== 'fil' || !!p.sens);
const n3 = x => x.toFixed(3);
/* Le SURVOL : ce qui se prendrait s'allume — la zone d'une borne, un tronçon de fil, la ligne d'une barrette à poser,
   en gris d'encre à travers le papier — et, sur un objet retouché, le ↺ qui le rend au moteur. */
function dessinSurvol(p, u) { if (!p) return { h: '', rendre: null };
  let h = '', rx = 0, ry = 0; const trait = (x1, y1, x2, y2) => `<line class="rt-allume" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke-width="${n3(10 * u)}"/>`;
  if (p.genre === 'borne') { const z = p.zone; h = `<rect class="rt-zone" x="${f1(z.x0 - 1.5)}" y="${f1(z.y0)}" width="${f1(z.x1 - z.x0 + 3)}" height="${f1(z.y1 - z.y0)}" rx="${n3(3 * u)}" stroke-width="${n3(u)}"/>`;
    const gauche = (z.x0 + z.x1) / 2 < p.c.x + p.c.w / 2; rx = gauche ? z.x0 - 14 * u : z.x1 + 14 * u; ry = z.y - 15 * u; }
  else if (p.genre === 'fil') { if (p.sens) h = trait(p.a.x, p.a.y, p.b.x, p.b.y);   // un tronçon qui ne se prend pas ne s'allume pas : le fil se clique
    if (Math.abs(p.a.x - p.b.x) < 0.5) { rx = p.a.x + 13 * u; ry = (p.a.y + p.b.y) / 2; } else { rx = (p.a.x + p.b.x) / 2; ry = p.a.y - 13 * u; } }
  else if (p.genre === 'vt') { const bs = bornesDePiquage(p.b); h = trait(p.b.x, bs[0].y, p.b.x, bs[bs.length - 1].y); rx = p.b.x + 13 * u; ry = bs[0].y - 4 * u; }
  else { rx = p.c.x + p.c.w + 9 * u; ry = p.c.y - 9 * u; }
  if (!estRetouche(p)) return { h, rendre: null };
  const r = 10 * u, k = 0.6 * u;
  h += `<g class="rt-rendre" role="button" aria-label="Rendre au moteur"><circle cx="${f1(rx)}" cy="${f1(ry)}" r="${n3(r)}" stroke-width="${n3(u)}"/>`
    + `<path transform="translate(${n3(rx - 12 * k)} ${n3(ry - 12 * k)}) scale(${n3(k)})" d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4" stroke-width="2"/></g>`;
  return { h, rendre: { x: rx, y: ry } }; }

function lierPlanche() {
  const stage = $('planche'); const pointeurs = new Map(); let mode = null, pan = null, pinch = null, bouge = false, origine = null;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const debutPinch = () => { mode = 'pinch'; pan = null; arreterVue(); const r = cadre(); const p = [...pointeurs.values()];
    const mx = (p[0].x + p[1].x) / 2 - r.left, my = (p[0].y + p[1].y) / 2 - r.top;
    pinch = { d: dist(p[0], p[1]), wx: (mx - app.vue.tx) / app.vue.s, wy: (my - app.vue.ty) / app.vue.s, s0: app.vue.s, Z: bornesZoom() }; };
  const suitPinch = () => { const r = cadre(); const p = [...pointeurs.values()]; if (p.length < 2) return;
    const ns = Math.max(pinch.Z.min, Math.min(pinch.Z.max, pinch.s0 * dist(p[0], p[1]) / pinch.d));
    const mx = (p[0].x + p[1].x) / 2 - r.left, my = (p[0].y + p[1].y) / 2 - r.top;
    app.vue = { s: ns, tx: mx - pinch.wx * ns, ty: my - pinch.wy * ns }; VUE.main = true; appliquerVue(); };
  /* la PRISE (la retouche) : à la souris, appuyer sur ce qui se prend et glisser le déplace ; au doigt, un appui long le
     prend, un glissé simple déplace la vue. `prise` : ce qu'on a pris (priseSous) et le point de départ ; le geste
     commencé, sa préparation (GESTES[genre].preparer), le dessin d'avant (`avant`), la visée (`vise`), la place où il
     tombe (`place`) et s'il y est posé (`posee`) */
  let prise = null, long = null, image = 0, dernierBloc = null, dernierAppui = null, clavier = null, dernierPris = null;
  // la visée sur un aimant à portée (les forts d'abord), sinon au pas
  const tolAimant = () => Math.max(2, Math.min(20, 7 / app.vue.s));
  const aimante = (L, v) => { const tol = tolAimant(), pres = L.filter(a => Math.abs(a.d - v) <= tol); if (!pres.length) return null; const forts = pres.filter(a => a.fort);
    return (forts.length ? forts : pres).reduce((m, a) => Math.abs(a.d - v) < Math.abs(m.d - v) ? a : m); };
  const ecartDit = (ex, ey) => { const px = v => Math.round(Math.abs(v) * app.vue.s), mots = [];
    if (px(ex)) mots.push(px(ex) + ' px plus à ' + (ex > 0 ? 'droite' : 'gauche')); if (px(ey)) mots.push(px(ey) + ' px plus ' + (ey > 0 ? 'bas' : 'haut'));
    return mots.join(' et '); };
  const lignesDeGuides = (L, u) => { let h = ''; const lignes = new Map();
    L.forEach(t => { const vert = Math.abs(t.x1 - t.x2) < 0.01, k = (vert ? 'x' : 'y') + Math.round((vert ? t.x1 : t.y1) * 2), l = lignes.get(k);
      if (!l) { lignes.set(k, { ...t }); return; }
      if (vert) { l.y1 = Math.min(l.y1, t.y1, t.y2); l.y2 = Math.max(l.y2, t.y1, t.y2); } else { l.x1 = Math.min(l.x1, t.x1, t.x2); l.x2 = Math.max(l.x2, t.x1, t.x2); } });
    lignes.forEach(t => { h += `<line class="rt-guide" x1="${f1(t.x1)}" y1="${f1(t.y1)}" x2="${f1(t.x2)}" y2="${f1(t.y2)}" stroke-width="${n3(u)}" stroke-dasharray="${n3(4 * u)} ${n3(3 * u)}"/>`; });
    return h; };
  const ligne = (cls, x1, y1, x2, y2, u, tirets) => `<line class="${cls}" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke-width="${n3(2 * u)}"${tirets ? ` stroke-dasharray="${n3(5 * u)} ${n3(3 * u)}"` : ''}/>`;
  // où l'objet est vraiment pendant le geste : la dernière place qui a tenu (null : où il était avant le geste)
  const ici = pr => pr.posee ? pr.tenu : null;
  /* LES GESTES, un par genre : préparer (le dessin, les aimants ; rend ce que l'historique en dira), viser (le pas, les
     aimants, Alt), placer (la place juste la plus proche de la visée, et pourquoi elle diffère), poser (le dessin routé ;
     'retour' : à sa place d'avant ; null : la pose romprait une règle), calque (le fantôme, les guides), et le mot. */
  const GESTES = {
    bloc: {
      preparer(pr, P) { const c = P.comps.find(k => k === pr.c); if (!c) return null; Object.assign(pr, preparerPrise(P, c)); return 'déplacer ' + c.name; },
      viser(pr, rx, ry, libre) { if (libre) return { dx: Math.round(rx * 2) / 2, dy: Math.round(ry * 2) / 2 };
        const ax = aimante(pr.aimants.x, rx), ay = aimante(pr.aimants.y, ry);
        return { dx: ax ? ax.d : Math.round(rx / pr.pas) * pr.pas, dy: ay ? ay.d : Math.round(ry / pr.pas) * pr.pas }; },
      placer: (pr, v) => placeLibre(pr, v.dx, v.dy),
      meme: (a, b) => a.dx === b.dx && a.dy === b.dy,
      immobile: p => !p.dx && !p.dy,
      poser: (pr, p) => deplacerBloc(pr.P, pr.c, p.dx, p.dy, pr.pose),
      pris: pr => { const p = ici(pr) || { dx: 0, dy: 0 }; return Math.abs(pr.vise.dx - p.dx) > 0.01 || Math.abs(pr.vise.dy - p.dy) > 0.01; },
      calque(pr, u) { const c = pr.c, v = pr.vise, p = ici(pr) || { dx: 0, dy: 0 }, m = 3 * u, pris = GESTES.bloc.pris(pr);
        const cadreDe = (cls, dx, dy, tirets) => `<rect class="${cls}" x="${f1(c.x + dx - m)}" y="${f1(c.y + dy - m)}" width="${f1(c.w + 2 * m)}" height="${f1(c.h + 2 * m)}" rx="${n3(2 * u)}" stroke-width="${n3(1.5 * u)}"${tirets ? ` stroke-dasharray="${n3(5 * u)} ${n3(3 * u)}"` : ''}/>`;
        const guides = []; [['x', p.dx], ['y', p.dy]].forEach(([axe, d]) => pr.aimants[axe].forEach(a => { if (Math.abs(a.d - d) <= 0.26) guides.push(a.guide(p.dx, p.dy)); }));
        return lignesDeGuides(guides, u) + (pris ? cadreDe('rt-pose', p.dx, p.dy, false) : '') + cadreDe('rt-fantome' + (pris ? ' pris' : ''), v.dx, v.dy, true); },
      mot(pr) { const { c, vise: v, place: p } = pr, feuille = p.pourquoi === 'feuille';
        if (!pr.posee) return v && (v.dx || v.dy) ? (feuille ? 'La feuille s’arrête là : ' : 'Pas de place ici : ') + c.name + ' reste où il était.' : '';
        dernierPris = { nom: c.name, x: c.x + p.dx, y: c.y + p.dy };
        const ecart = v ? ecartDit(p.dx - v.dx, p.dy - v.dy) : '', pousse = Math.round(((pr.P2 && pr.P2.poussee) || 0) * app.vue.s);
        return ecart ? c.name + ' posé ' + ecart + (feuille ? ' : la feuille s’arrête là.' : ' : la place était prise.')
          : c.name + ' déplacé' + (pousse ? ' · les colonnes voisines s’écartent de ' + pousse + ' px' : '') + ' · Ctrl+Z pour défaire.'; } },
    borne: {
      preparer(pr, P) { const c = P.comps.find(k => k === pr.c); if (!c) return null; const pb = preparerBorne(P, c, pr.y); if (!pb) return null;
        const bb = app.dessin && app.dessin.bbox, k = (bb && bb.k) || 1, m = (PAGE_CADRE + PAGE_MARGE) * k;
        Object.assign(pr, { c, pb, y0: pr.y, aimants: aimantsDeBorne(P, c, pr.y), lim: bb ? [bb.y + m + MARGE_BORNE, bb.y + bb.h - m - PAGE_CARTOUCHE * k - MARGE_BORNE] : [-Infinity, Infinity] });
        return 'déplacer la borne ' + pr.etiq + ' de ' + c.name; },
      // l'aimant le plus proche — un fil droit l'emporte de peu : une autre borne visée en plein, c'est l'échange qu'on veut
      viser(pr, rx, ry, libre) { const y = pr.y0 + ry; if (libre) return { y: Math.round(y * 2) / 2 };
        const tol = tolAimant(), a = pr.aimants.filter(a => Math.abs(a.y - y) <= tol).reduce((m, a) => !m || Math.abs(a.y - y) - (a.fort ? 2 : 0) < Math.abs(m.y - y) - (m.fort ? 2 : 0) ? a : m, null);
        return { y: a ? a.y : pr.y0 + Math.round(ry / PAS_BORNE) * PAS_BORNE }; },
      // la visée si la borne peut y aller (sur une autre : l'échange) ; sinon, de demi-pas en demi-pas, la place juste la plus proche
      placer(pr, v) { const [a, b] = pr.lim, y = Math.max(a, Math.min(b, v.y)), feuille = Math.abs(y - v.y) > 0.01, r = pr.pb.examiner(y);
        if (!r.refus) return { y: r.y, echange: r.echange, pourquoi: feuille ? 'feuille' : null };
        for (let n = 1; n <= 80; n++) for (const s of [1, -1]) { const yy = y + s * n * PAS_BORNE; if (yy < a || yy > b) continue; const q = pr.pb.examiner(yy); if (!q.refus) return { y: q.y, echange: q.echange, pourquoi: 'prise', refus: r }; }
        return { y: pr.y0, pourquoi: 'prise', refus: r }; },
      meme: (a, b) => Math.abs(a.y - b.y) < 0.01,
      immobile: (p, pr) => Math.abs(p.y - pr.y0) < 0.5,
      poser: (pr, p) => deplacerBorne(pr.P, pr.pb, p.y),
      pris: pr => Math.abs(pr.vise.y - (ici(pr) || { y: pr.y0 }).y) > 0.01,
      // les places justes autour d'une place que le routage ne tient pas : de demi-pas en demi-pas, la plus proche d'abord
      voisines(pr, p) { const out = [], [a, b] = pr.lim; for (let n = 1; n <= 12; n++) for (const s of [1, -1]) { const y = p.y + s * n * PAS_BORNE; if (y < a || y > b) continue;
        const q = pr.pb.examiner(y); if (!q.refus) out.push(q.rien ? { y: pr.y0 } : { y: q.y, echange: q.echange }); } return out; },
      calque(pr, u) { const z = pr.zone, pris = GESTES.borne.pris(pr), y = (ici(pr) || { y: pr.y0 }).y, cadre = (cls, y, tirets) => `<rect class="${cls}" x="${f1(z.x0 - 1.5)}" y="${f1(y - (z.y1 - z.y0) / 2)}" width="${f1(z.x1 - z.x0 + 3)}" height="${f1(z.y1 - z.y0)}" rx="${n3(3 * u)}" stroke-width="${n3(1.5 * u)}"${tirets ? ` stroke-dasharray="${n3(4 * u)} ${n3(2.5 * u)}"` : ''}/>`;
        const guides = pr.aimants.filter(a => Math.abs(a.y - y) <= 0.26).map(a => a.guide());
        return lignesDeGuides(guides, u) + (pris ? cadre('rt-pose', y, false) : '') + cadre('rt-fantome' + (pris ? ' pris' : ''), pr.vise.y, true); },
      mot(pr) { const { c, place: p } = pr, nom = 'la borne ' + pr.etiq + ' de ' + c.name;
        if (!pr.posee) { if (!pr.vise || Math.abs(pr.vise.y - pr.y0) < 0.5) return '';
          const r = p.refus || {}; return 'Pas de place ici pour ' + nom + (r.refus === 'serre' && r.avec ? ' : la borne ' + r.avec.etiq + (r.deux ? ', d’un autre connecteur, est à moins de deux pas' : ' est à moins d’un pas') : r.refus === 'bloc' && r.avec ? ' : ' + c.name + ' grandirait sur ' + r.avec.name : pr.refuse ? ' : un câble y romprait une règle' : '') + ' — elle reste où elle était.'; }
        const q = p.echange != null ? Object.values(c.rangs).flat().find(x => Math.abs(x.y - p.y) < 0.5) : null;
        return (q ? c.name + ' : les bornes ' + pr.etiq + ' et ' + q.etiq + ' échangent leurs places' : (nom.charAt(0).toUpperCase() + nom.slice(1)) + ' glisse' + (p.pourquoi === 'prise' ? ' au plus près : la place visée était prise' : ''))
          + ' · double-clic pour la rendre au moteur · Ctrl+Z pour défaire.'; } },
    vt: {
      preparer(pr, P) { const b = pr.b, G = goulottesDe(P), ch = G.chDe(b.x); if (ch < 0 || !(P.routage.barrettes || []).includes(b)) return null;
        const a = G.x0(ch) + RETRAIT, z = G.x1(ch) - RETRAIT, grille = [];
        for (let x = a; x <= z + 0.01; x += PISTE) grille.push(x); for (let x = z; x >= a - 0.01; x -= PISTE) grille.push(x);
        Object.assign(pr, { x0: b.x, lim: [a, Math.max(a, z)], grille, cleVT: cleDeBarrette(b) }); return 'déplacer ' + (b.nomVT || 'la barrette ajoutée'); },
      viser(pr, rx, ry, libre) { const x = pr.x0 + rx; if (libre) return { x: Math.round(x * 2) / 2, ry };
        const g = pr.grille.reduce((m, v) => Math.abs(v - x) < Math.abs(m - x) ? v : m, pr.grille[0]); return { x: g != null ? g : x, ry }; },
      placer(pr, v) { const x = Math.max(pr.lim[0], Math.min(pr.lim[1], v.x)); return { x, pourquoi: Math.abs(x - v.x) > 0.01 ? 'goulotte' : null }; },
      meme: (a, b) => Math.abs(a.x - b.x) < 0.01,
      immobile: (p, pr) => Math.abs(p.x - pr.x0) < 0.5,
      poser(pr, p) { const C = consignesDe(pr.P); C.barrettes = C.barrettes.filter(k => k.cle !== pr.cleVT).concat({ cle: pr.cleVT, d: (p.x - pr.b.px) * pr.b.dir }); return avecConsignes(pr.P, C); },
      pris: pr => Math.abs(pr.vise.x - (ici(pr) || { x: pr.x0 }).x) > 0.01,
      voisines: (pr, p) => pr.grille.filter((x, i, a) => a.indexOf(x) === i && Math.abs(x - p.x) > 0.01).sort((u, v) => Math.abs(u - p.x) - Math.abs(v - p.x)).map(x => ({ x })),
      calque(pr, u) { const bs = bornesDePiquage(pr.b), y0 = bs[0].y - 4, y1 = bs[bs.length - 1].y + 4, pris = GESTES.vt.pris(pr), x = (ici(pr) || { x: pr.x0 }).x;
        return (pris ? ligne('rt-pose', x, y0, x, y1, u) : '') + ligne('rt-fantome' + (pris ? ' pris' : ''), pr.vise.x, y0, pr.vise.x, y1, u, true); },
      mot(pr) { const nom = pr.b.nomVT || 'La barrette ajoutée', haut = pr.vise && Math.abs(pr.vise.ry || 0) > 3 * PRH;
        if (!pr.posee) return haut ? nom + ' reste au ras de sa borne : elle glisse dans sa goulotte, à gauche ou à droite.' : pr.refuse ? 'Pas de place ici pour ' + nom + ' : elle reste où elle était.' : '';
        const pres = pr.place.pourquoi === 'goulotte' ? ' jusqu’à sa paroi' : pr.place.pourquoi ? ' — au plus près : la place visée était prise' : '';
        return nom + ' glisse dans sa goulotte' + pres + (haut ? ' (elle reste à la hauteur de sa borne)' : '') + ' · double-clic pour la rendre au moteur · Ctrl+Z pour défaire.'; } },
    fil: {
      preparer(pr, P) { const l = P.links[pr.f.i]; if (!l || l.shunt || !P.routage.fils.includes(pr.f)) return null; const G = goulottesDe(P);
        Object.assign(pr, { l, G, k0: consignesDe(P).fils.find(k => k.li === l.i) || null });
        if (pr.sens === 'V') { pr.x0 = pr.a.x; pr.ch0 = G.chDe(pr.a.x); if (pr.ch0 < 0) return null; pr.grille = [];
          for (let ch = 0; ch < G.n; ch++) { const a = G.x0(ch) + RETRAIT, z = G.x1(ch) - RETRAIT; for (let x = a; x <= z + 0.01; x += PISTE) pr.grille.push(x); for (let x = z; x >= a - 0.01; x -= PISTE) pr.grille.push(x); } }
        else { const [g, d] = boutsDuFil(l), xa = Math.min(pr.a.x, pr.b.x), xb = Math.max(pr.a.x, pr.b.x); pr.y0 = pr.a.y;
          // à la hauteur d'une de ses bornes, le fil en part droit : un guide le dit, de la borne au bout du tronçon
          const borne = e => () => ({ x1: Math.min(e.x, xa), y1: e.y, x2: Math.max(e.x, xb), y2: e.y });
          pr.aimants = [{ d: g.y, fort: true, guide: borne(g) }, { d: d.y, fort: true, guide: borne(d) }, { d: pr.y0, fort: true }]; }
        return 'déplacer ' + (l.cable || 'le câble'); },
      viser(pr, rx, ry, libre) {
        if (pr.sens === 'V') { const x = pr.x0 + rx; if (libre) return { x: Math.round(x * 2) / 2 };
          const tol = Math.max(PISTE / 2, tolAimant()), g = pr.grille.filter(v => Math.abs(v - x) <= tol).reduce((m, v) => m == null || Math.abs(v - x) < Math.abs(m - x) ? v : m, null);
          return { x: g != null ? g : Math.round(x) }; }
        const y = pr.y0 + ry; if (libre) return { y: Math.round(y * 2) / 2 };
        const a = aimante(pr.aimants, y); return { y: a ? a.d : pr.y0 + Math.round(ry / PAS_BORNE) * PAS_BORNE }; },
      // une verticale tombe dans une goulotte : visée dans une colonne, elle va à la piste la plus proche
      placer(pr, v) { if (pr.sens !== 'V') return { y: v.y };
        if (pr.G.chDe(v.x) >= 0) return { x: v.x }; const g = pr.grille.reduce((m, x) => Math.abs(x - v.x) < Math.abs(m - v.x) ? x : m, pr.grille[0]); return { x: g, pourquoi: 'colonne' }; },
      meme: (a, b) => a.x === b.x && a.y === b.y,
      immobile: (p, pr) => pr.sens === 'V' ? Math.abs(p.x - pr.x0) < 0.5 : Math.abs(p.y - pr.y0) < 0.5,
      poser(pr, p) { const k = consigneDuGeste(pr.l, pr.k0, pr.sens === 'V' ? { ch0: pr.ch0, x: p.x } : { y: p.y }, pr.G);
        const C = consignesDe(pr.P); C.fils = C.fils.filter(q => q.li !== pr.l.i).concat(k);
        const P2 = avecConsignes(pr.P, C), w = P2 && P2.routage.fils.find(q => q.i === pr.l.i); if (!w || w.retouche !== 'tenue') return null;
        if (pr.sens === 'V') { const G2 = goulottesDe(P2), ch = pr.G.chDe(p.x), xs = [];
          w.pts.forEach((q, i) => { if (i && Math.abs(q.x - w.pts[i - 1].x) < 0.5 && Math.abs(q.y - w.pts[i - 1].y) > 0.5 && G2.chDe(q.x) === ch) xs.push(q.x); });
          if (!xs.length) return null; p.reel = xs.reduce((m, x) => Math.abs(x - p.x) < Math.abs(m - p.x) ? x : m); }
        else if (!w.pts.some((q, i) => i && Math.abs(q.y - p.y) < 0.5 && Math.abs(w.pts[i - 1].y - p.y) < 0.5)) return null;
        return P2; },
      pris: pr => { const q = ici(pr); if (pr.sens !== 'V') return Math.abs(pr.vise.y - (q ? q.y : pr.y0)) > 0.01;
        return Math.abs(pr.vise.x - (!q ? pr.x0 : q.reel != null ? q.reel : q.x)) > PISTE / 2; },
      // autour d'une place que le routage ne tient pas : les pistes de la même goulotte, ou les hauteurs de demi-pas en demi-pas, les plus proches d'abord
      voisines(pr, p) { if (pr.sens !== 'V') { const out = []; for (let n = 1; n <= 12; n++) for (const s of [1, -1]) out.push({ y: p.y + s * n * PAS_BORNE }); return out; }
        const ch = pr.G.chDe(p.x); return pr.grille.filter((x, i, a) => a.indexOf(x) === i && Math.abs(x - p.x) > 0.01 && pr.G.chDe(x) === ch).sort((u, v) => Math.abs(u - p.x) - Math.abs(v - p.x)).map(x => ({ x })); },
      calque(pr, u) { const pris = GESTES.fil.pris(pr), a = pr.a, b = pr.b, q = ici(pr);
        if (pr.sens === 'V') { const y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y), xp = !q ? pr.x0 : q.reel != null ? q.reel : q.x;
          return (pris ? ligne('rt-pose', xp, y0, xp, y1, u) : '') + ligne('rt-fantome' + (pris ? ' pris' : ''), pr.vise.x, y0, pr.vise.x, y1, u, true); }
        const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
        const yp = q ? q.y : pr.y0, guides = pr.aimants.filter(m => m.guide && Math.abs(m.d - yp) < 0.26).map(m => m.guide());
        return lignesDeGuides(guides, u) + (pris ? ligne('rt-pose', x0, yp, x1, yp, u) : '') + ligne('rt-fantome' + (pris ? ' pris' : ''), x0, pr.vise.y, x1, pr.vise.y, u, true); },
      mot(pr) { const nom = String(pr.l.cable || 'Le câble'), p = pr.place;
        if (!pr.posee) return pr.vise && !GESTES.fil.immobile(pr.vise, pr) ? 'Pas de passage ici pour ' + nom + ' : il y croiserait un bloc, une borne ou un autre câble — il reste où il était.' : '';
        let quoi;
        if (pr.sens === 'V') { const x = p.reel != null ? p.reel : p.x, n = Math.round((x - pr.x0) / PISTE);
          quoi = pr.G.chDe(p.x) !== pr.ch0 ? nom + ' passe par une autre goulotte' : n ? nom + ' glisse de ' + Math.abs(n) + ' piste' + (Math.abs(n) > 1 ? 's' : '') + ' à ' + (n > 0 ? 'droite' : 'gauche') : nom + ' glisse dans sa goulotte'; }
        else { const px = Math.round(Math.abs(p.y - pr.y0) * app.vue.s); quoi = nom + ' : son couloir ' + (p.y < pr.y0 ? 'monte' : 'descend') + ' de ' + px + ' px'; }
        const pres = p.pourquoi === 'colonne' ? ' — dans la goulotte la plus proche : un câble ne passe pas dans une colonne' : p.pourquoi ? ' — au plus près : la place visée croisait un bloc, une borne ou un autre câble' : '';
        return quoi + pres + ' · double-clic sur le câble pour le rendre au moteur · Ctrl+Z pour défaire.'; } } };
  const commencerPrise = () => { const L = liaisonsDuPlan(), cle = L.length ? clePlacement(L) : null; if (!cle) return false;
    const P = placementDe(L), G = prise && GESTES[prise.genre]; if (!P || !G) return false;
    Object.assign(prise, { cle, P, avant: app.retouches.get(cle) || null, vise: null, place: null, posee: false, refuse: false, P2: null });
    const quoi = G.preparer(prise, P); if (!quoi) return false;
    const mot = $('toast'); if (mot) mot.classList.remove('on');   // le mot du geste d'avant s'en va : celui-ci aura le sien, s'il bouge
    histPush(quoi, true); mode = 'retouche'; stage.classList.add('deplace'); stage.dataset.prise = sensDePrise(prise); eteindre(); effacerSurvol(); return true; };
  // revenu à sa place : le dessin d'avant le geste
  const remettre = () => { if (prise.avant) app.retouches.set(prise.cle, prise.avant); else app.retouches.delete(prise.cle); prise.posee = false; prise.P2 = null; prise.tenu = null; };
  /* le dessin du geste : là où il tombe, rerouté. Une place que le routage ne tient pas sans rompre une règle : la plus
     proche qui la tient, parmi quelques voisines (`voisines`) ; revenu à sa place d'avant, il y reste ; sinon le dernier
     dessin juste demeure */
  const ESSAIS = 8;
  const poserPrise = () => { const G = GESTES[prise.genre], p = prise.place; if (!p) return;
    prise.tente = p; if (G.immobile(p, prise)) { remettre(); prise.refuse = false; return; }
    let P2 = G.poser(prise, p), q = p;
    if (!P2 && G.voisines) for (const v of G.voisines(prise, p).slice(0, ESSAIS)) { if (G.immobile(v, prise)) { remettre(); prise.refuse = true; return; }
      const P3 = G.poser(prise, v); if (P3) { P2 = P3; q = { ...v, pourquoi: 'prise' }; break; } }
    prise.refuse = !P2;
    if (P2) { app.retouches.set(prise.cle, P2); prise.P2 = P2; prise.posee = true; prise.tenu = q; } };
  /* le CALQUE du geste, par-dessus le dessin : le fantôme à la place visée (à l’encre ; rouge quand elle est prise, et
     alors le contour plein de la place où il tombe), les guides des aimants que la pose touche. Les épaisseurs se
     tiennent à l'écran, quelle que soit l'échelle. */
  const calque = () => { const sc = $('scene'); if (!sc || !prise || mode !== 'retouche' || !prise.vise || !prise.place) return;
    let g = sc.querySelector('#rt-calque'); if (!g) { g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.id = 'rt-calque'; g.setAttribute('class', 'rt-calque'); sc.appendChild(g); }
    const G = GESTES[prise.genre]; g.innerHTML = G.calque(prise, 1 / app.vue.s); g.dataset.pris = G.pris(prise) ? '1' : ''; };
  const suitPrise = e => { prise.souris = { clientX: e.clientX, clientY: e.clientY };
    const G = GESTES[prise.genre], w = versMonde(e.clientX, e.clientY), v = G.viser(prise, w.x - prise.wx, w.y - prise.wy, !!e.altKey), p = G.placer(prise, v);
    prise.vise = v;
    if (prise.place && G.meme(p, prise.place)) { prise.place.pourquoi = p.pourquoi; prise.place.refus = p.refus; calque(); return; }   // la même place — peut-être plus pour la même raison
    prise.place = p;
    cancelAnimationFrame(image); image = requestAnimationFrame(() => { if (!prise || mode !== 'retouche') return; poserPrise(); calculer(); peindre(); calque(); }); };
  // Alt pressé ou lâché pendant le geste : la visée se refait sur place
  const altPendant = e => { if (e.key !== 'Alt' || mode !== 'retouche' || !prise || !prise.souris) return; e.preventDefault(); suitPrise({ ...prise.souris, altKey: e.type === 'keydown' }); };
  window.addEventListener('keydown', altPendant); window.addEventListener('keyup', altPendant);
  // le geste abandonné (Échap, un second doigt) : le dessin d'avant revient, l'historique n'en garde rien
  const annulerPrise = () => { if (mode !== 'retouche' || !prise) return; cancelAnimationFrame(image); stage.classList.remove('deplace');
    remettre(); app.hist.pop(); synchroniserHistorique();
    calculer(); peindre(); synchroniser(); rallumer(); prise = null; mode = null; };
  window.addEventListener('keydown', e => { if (e.key !== 'Escape' || mode !== 'retouche') return; e.preventDefault(); e.stopPropagation(); annulerPrise(); }, true);
  /* lâché : un mot seulement si l'objet a bougé — déplacé, ou posé ailleurs que visé (et pourquoi) — ou si la place visée
     était prise et qu'il reste où il était */
  const finPrise = () => { cancelAnimationFrame(image); stage.classList.remove('deplace');
    const G = GESTES[prise.genre];
    if (prise.place && prise.tente !== prise.place) poserPrise();   // la dernière visée, pas encore posée
    if (!prise.place || G.immobile(prise.place, prise) || !prise.posee) remettre();
    if (!prise.posee) { app.hist.pop(); synchroniserHistorique(); } else garderRetouche(prise.cle);
    if (prise.posee && prise.tenu) prise.place = prise.tenu;
    const m = G.mot(prise); if (m) dire(m);
    calculer(); peindre(); synchroniser(); rallumer(); prise = null; };
  /* Un bloc CHOISI se pousse aux flèches : d'un carreau, de cinq avec Maj — à la place exacte, ou pas du tout (le mot dit
     pourquoi). Une série de poussées sur le même bloc fait une seule entrée d'historique. Les flèches gauche et droite
     changent de folio quand aucun bloc n'est choisi (lierPanneau) : ce gardien, posé avant, passe la main. */
  const blocChoisi = () => { const ci = app.cible; if (!ci || ci.type !== 'bloc' || !app.dessin || String(app.choisi) !== String(ci.nom)) return null;
    const cs = app.dessin.comps.filter(k => String(k.name) === String(ci.nom)); if (cs.length < 2 || !dernierPris || dernierPris.nom !== ci.nom) return cs[0] || null;
    const loin = k => Math.hypot(k.x - dernierPris.x, k.y - dernierPris.y); return cs.reduce((a, k) => loin(k) < loin(a) ? k : a); };
  const pousser = (c, nx, ny) => { const L = liaisonsDuPlan(), cle = L.length ? clePlacement(L) : null; if (!cle) return;
    const P = placementDe(L); if (!P || !P.comps.includes(c)) return;
    const pr = preparerPrise(P, c), dx = nx * pr.pas, dy = ny * pr.pas;
    const P2 = poseJuste(pr, dx, dy) ? deplacerBloc(P, c, dx, dy, pr.pose) : null;
    if (!P2) { dire('Pas de place ' + (nx < 0 ? 'à gauche' : nx > 0 ? 'à droite' : ny < 0 ? 'au-dessus' : 'au-dessous') + ' : ' + c.name + ' reste où il était.'); return; }
    const t = Date.now(), suite = !!clavier && clavier.cle === cle && clavier.nom === c.name && t - clavier.t < 1500 && app.hist.length === clavier.n;
    if (!suite) histPush('pousser ' + c.name, true);
    app.retouches.set(cle, P2); garderRetouche(cle); clavier = { cle, nom: c.name, t, n: app.hist.length }; dernierPris = { nom: c.name, x: c.x + dx, y: c.y + dy };
    calculer(); peindre(); synchroniser(); rallumer();
    if (!suite) dire(c.name + ' poussé d’un carreau · Maj : cinq carreaux · Ctrl+Z pour défaire.'); };
  window.addEventListener('keydown', e => { const sens = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!sens || e.ctrlKey || e.metaKey || e.altKey || mode || pointeurs.size) return;
    // le clavier dans la carte, un document, le récapitulatif ou la palette : les flèches sont à eux (un cran du cadran poussait
    // 102CB1, le domaine B v73). La carte qui vient de s'ouvrir tient le clavier SUR ELLE-MÊME (`prendreLeClavier`, 08-carte) :
    // là, rien en elle ne veut des flèches, elles poussent toujours le bloc choisi (« un bloc choisi se pousse aux flèches »)
    const t = e.target; if (t && t.closest && t.id !== 'inspecteur' && t.closest('input,textarea,select,[contenteditable],[role="listbox"],[role="menu"],#menu,#inspecteur,#fiche,#base,#palette')) return;
    const c = blocChoisi(); if (!c) return;
    e.preventDefault(); e.stopPropagation(); const k = e.shiftKey ? 5 : 1; pousser(c, sens[0] * k, sens[1] * k); }, true);
  /* Le SURVOL : ce qui se prendrait s'allume, le curseur dit dans quel sens ça va (`data-prise` sur la planche : bloc,
     borne, vt, fil-v, fil-h, fil), et le ↺ d'un objet retouché attend qu'on le clique — on peut aller jusqu'à lui sans
     que le survol ne s'en aille. */
  let survol = null, survolCle = '', survolRendre = null;
  function effacerSurvol() { const g = document.getElementById('rt-survol'); if (g) g.remove(); survol = null; survolCle = ''; survolRendre = null; if (!mode) stage.dataset.prise = ''; }
  const peindreSurvol = p => { const sc = $('scene'); let g = sc && sc.querySelector('#rt-survol');
    if (!sc) return; if (!g) { g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.id = 'rt-survol'; g.setAttribute('class', 'rt-survol'); sc.appendChild(g); }
    const u = 1 / app.vue.s, d = dessinSurvol(p, u); g.innerHTML = d.h; g.dataset.genre = sensDePrise(p);
    const r = cadre(); survolRendre = d.rendre ? { x: r.left + app.vue.tx + d.rendre.x * app.vue.s, y: r.top + app.vue.ty + d.rendre.y * app.vue.s } : null; };
  /* Rien de choisi : ce qu'on survole s'allume. Un objet CHOISI : il reste allumé, ce qu'on survole se marque à peine
     (`survolLeger`) — le plan montre toujours ce que dit la fiche. */
  const allumerSurvol = p => { const choix = !!app.cible;
    if (!choix) { if (p.genre === 'bloc') allumerBloc(p.c.name); else if (p.genre === 'borne') allumerFils(filsDeLaBorne(p.c, p.y));
      else if (p.genre === 'vt') allumerBarretteAPoser(p.b.nomVT); else allumerFil(p.f); return; }
    const D = app.dessin, k = p.c ? D.comps.indexOf(p.c) : -1, blocs = new Set(k >= 0 ? [k] : []);
    const ws = p.genre === 'bloc' ? D.fils.filter(w => !w.shunt && (w.de === p.c.name || w.vers === p.c.name) && blocsDuFil(w).includes(k)) : p.genre === 'borne' ? filsDeLaBorne(p.c, p.y) : p.genre === 'vt' ? filsDeBarretteAPoser(p.b.nomVT) : [p.f];
    survolLeger(ws, blocs); };
  const survoler = e => { if (mode || pointeurs.size || !app.dessin) return;
    souris = { x: e.clientX, y: e.clientY }; armerBulle(e);
    if (e.target && e.target.closest && e.target.closest('.rt-rendre')) { stage.dataset.prise = 'rendre'; return; }
    if (survolRendre && survol && Math.hypot(e.clientX - survolRendre.x, e.clientY - survolRendre.y) < 22 && document.getElementById('rt-survol')) return;   // en chemin vers le ↺
    const p = priseSous(versMonde(e.clientX, e.clientY)), k = cleDePrise(p);
    if (k === survolCle && (!p || document.getElementById('rt-survol'))) { stage.dataset.prise = sensDePrise(p); return; }
    survolCle = k; survol = p; stage.dataset.prise = sensDePrise(p);
    if (!p) { const g = document.getElementById('rt-survol'); if (g) g.remove(); survolRendre = null; if (app.cible) effacerSurvolLeger(); else rallumer(); return; }
    allumerSurvol(p); peindreSurvol(p); };
  /* LA BULLE DU PLAN : la souris posée un instant (350 ms) sur un câble dit ce qu'il est — son numéro, de → vers, sa route,
     son type, sa longueur quand le retest la porte — ; sur un bloc, sa désignation, ses câbles sur ce folio, les autres
     folios où il paraît ; sur un renvoi, où il mène. On lit le folio sans zoomer (DESIGN : « le pourquoi se lit dans la
     bulle du survol »). La bulle de l'outil (claire sur la nuit), jamais pendant un geste. */
  let souris = null, bulleT = 0, bulleCle = ''; const bulle = document.createElement('div'); bulle.id = 'pl-bulle'; bulle.className = 'pl-bulle'; bulle.setAttribute('role', 'tooltip'); bulle.hidden = true; document.body.appendChild(bulle);
  const cacherBulle = () => { clearTimeout(bulleT); bulleT = 0; bulle.hidden = true; bulleCle = ''; };
  const armerBulle = e => { if (e.buttons || mode) { cacherBulle(); return; }
    const x = e.clientX, y = e.clientY, t = e.target, q = t && t.closest && t.closest('.rt-rendre') ? { cle: 'rendre', genre: 'rendre' } : objetDeBulle(versMonde(x, y));
    if (!q) { cacherBulle(); return; }
    if (q.cle === bulleCle) return;   // le même objet : la bulle reste, ou attend encore
    cacherBulle(); bulleCle = q.cle;
    bulleT = setTimeout(() => { bulleT = 0; if (mode || pointeurs.size || !app.dessin) return; const h = texteDeBulle(q); if (!h) return;
      bulle.innerHTML = h; bulle.hidden = false; const w = bulle.offsetWidth, hh = bulle.offsetHeight;
      bulle.style.left = Math.max(8, Math.min(x + 16, window.innerWidth - w - 8)) + 'px'; bulle.style.top = (y + 20 + hh <= window.innerHeight - 8 ? y + 20 : Math.max(8, y - 14 - hh)) + 'px'; }, 350); };
  // LE PLAN VIDE (#vide) vit sur la planche : un appui qui en part est un clic sur ses boutons, pas une prise de la vue — ni
  // capture du pointeur (elle volerait le « click » au bouton), ni pan
  const surLAccueil = e => !!(e.target && e.target.closest && e.target.closest('#vide'));
  /* SE DÉPLACER sans rien retoucher (la convention des logiciels de dessin) : le bouton du MILIEU, ou ESPACE tenu, et l'on
     glisse — la vue bouge, où qu'on appuie, jamais un bloc (l'audit v72 : à 200 %, la moitié du folio « prend », un glisser
     pour aller voir plus bas déplaçait 372CP2 et reroutait ses voisins). Le glisser simple garde son sens : on prend. */
  let espace = false, surLePlan = false;
  const champActif = t => !!(t && t.closest && t.closest('input,textarea,select,[contenteditable],[role="menu"],[role="listbox"]'));
  // un bouton qui a gardé le clavier (+, Ajuster…) : Espace le presserait ; la souris sur le plan, c'est la vue qu'on veut
  const boutonActif = t => !!(t && t.closest && t.closest('button,a,[role="button"]'));
  const planVisible = () => !!app.dessin && !document.body.classList.contains('biblio');
  stage.addEventListener('mouseenter', () => { surLePlan = true; }); stage.addEventListener('mouseleave', () => { surLePlan = false; });
  window.addEventListener('keydown', e => { if (e.code !== 'Space' || e.ctrlKey || e.metaKey || e.altKey || champActif(e.target) || (boutonActif(e.target) && !surLePlan) || !planVisible()) return;
    e.preventDefault(); if (boutonActif(e.target) && e.target.blur) e.target.blur(); if (!espace) { espace = true; stage.classList.add('espace'); cacherBulle(); } }, true);
  const lacherEspace = () => { if (!espace) return; espace = false; stage.classList.remove('espace'); };
  window.addEventListener('keyup', e => { if (e.code === 'Space') lacherEspace(); }); window.addEventListener('blur', lacherEspace);
  stage.addEventListener('auxclick', e => { if (e.button === 1) e.preventDefault(); });
  stage.addEventListener('pointerdown', e => { const milieu = e.button === 1; if (e.button && !milieu) return; cacherBulle(); fermerMenu(); fermerRecherche(); if (surLAccueil(e)) return;
    if (milieu) e.preventDefault();   // pas de défilement automatique du navigateur
    // le ↺ d'un objet retouché : il est rendu au moteur, rien d'autre
    if (!milieu && !espace && e.target && e.target.closest && e.target.closest('.rt-rendre') && survol) { e.preventDefault(); const o = objetDe(survol); effacerSurvol(); rendreAuMoteur(o); return; }
    try { stage.setPointerCapture(e.pointerId); } catch (_) { }
    stage.classList.add('appui');   // pendant l'appui, le texte du folio ne se sélectionne pas
    pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY }); clearTimeout(long);
    if (pointeurs.size >= 2) { annulerPrise(); prise = null; debutPinch(); return; }
    bouge = false; origine = [e.clientX, e.clientY]; mode = 'pan'; pan = { tx: app.vue.tx, ty: app.vue.ty, x: e.clientX, y: e.clientY };
    if (milieu || espace) { pan.vue = true; prise = null; stage.classList.add('tient'); return; }   // la vue, et rien d'autre
    const w = versMonde(e.clientX, e.clientY), p = app.dessin ? priseSous(w) : null, c = p && p.c, vt = p && p.genre === 'vt' ? p.b : null;
    prise = prenable(p) ? { ...p, wx: w.x, wy: w.y } : null;
    if (!dernierBloc || Date.now() - dernierBloc.t > 800) dernierBloc = c ? { nom: c.name, t: Date.now() } : vt ? { nom: vt.nomVT, t: Date.now() } : null;   // le premier appui d'un double-clic fait foi
    if (prise && e.pointerType !== 'touch') mode = 'prise';
    else if (prise) long = setTimeout(() => { if (mode === 'pan' && !bouge && prise && commencerPrise()) { if (navigator.vibrate) navigator.vibrate(12); } }, 380); });
  stage.addEventListener('pointermove', e => { if (pointeurs.has(e.pointerId)) pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (mode === 'pinch') { suitPinch(); return; } if (!mode) return;
    if (origine && (Math.abs(e.clientX - origine[0]) > 3 || Math.abs(e.clientY - origine[1]) > 3)) { if (!bouge && mode === 'prise' && !commencerPrise()) mode = 'pan'; bouge = true; clearTimeout(long); if (mode === 'pan') stage.classList.add('tient'); }
    if (mode === 'retouche') { suitPrise(e); return; }
    if (mode === 'pan') { if (anim) { arreterVue(); pan.tx = app.vue.tx - (e.clientX - pan.x); pan.ty = app.vue.ty - (e.clientY - pan.y); }   // la vue glissait encore : on la prend où elle est
      app.vue.tx = pan.tx + (e.clientX - pan.x); app.vue.ty = pan.ty + (e.clientY - pan.y); VUE.main = true; appliquerVue(); } });
  const fin = e => { try { stage.releasePointerCapture(e.pointerId); } catch (_) { } stage.classList.remove('tient'); clearTimeout(long);
    const etaitPinch = mode === 'pinch'; pointeurs.delete(e.pointerId); if (!pointeurs.size) stage.classList.remove('appui');
    if (prise && prise.genre === 'bloc' && !bouge) dernierPris = { nom: prise.c.name, x: prise.c.x, y: prise.c.y };   // le morceau cliqué (une barrette en a plusieurs) : les flèches le poussent
    if (etaitPinch) { if (pointeurs.size < 2) { mode = null; pinch = null; } return; }
    if (mode === 'retouche') { finPrise(); mode = null; pan = null; survolCle = ''; return; }
    if (pan && pan.vue) { mode = null; pan = null; prise = null; return; }   // le bouton du milieu, Espace : la vue seule, jamais un clic
    if ((mode === 'pan' || mode === 'prise') && !bouge) {
      /* le DOUBLE appui se reconnaît ici : le premier clic choisit le bloc et redessine la page, et le navigateur
         n'émet alors ni « click » ni « dblclick » — deux appuis à moins de 400 ms, au même endroit */
      const t = Date.now(), d = dernierAppui; dernierAppui = { t, x: e.clientX, y: e.clientY }; appuiDuPlan = { ...dernierAppui, nom: dernierBloc && dernierBloc.nom };
      if (d && t - d.t < 400 && Math.abs(e.clientX - d.x) < 8 && Math.abs(e.clientY - d.y) < 8) { dernierAppui = null; doubleAppui(e); }
      else cliquer(versMonde(e.clientX, e.clientY)); survolCle = ''; }
    mode = null; pan = null; prise = null; };
  /* double appui : sur une borne, un fil, une barrette à poser que la main a retouchés, ils sont rendus au moteur ;
     ailleurs, on zoome */
  const doubleAppui = e => { const w = versMonde(e.clientX, e.clientY), p = app.dessin ? priseSous(w) : null;
    if (p && p.genre !== 'bloc' && estRetouche(p)) { rendreAuMoteur(objetDe(p)); return; }
    // (v78) un double-clic sur l'objet choisi (un bloc, un câble, une barrette à poser) : sa fiche entière, en grand (08-niveaux)
    if (app.cible && !$('inspecteur').hidden && typeof ouvrirGrand === 'function' && (blocSous(w) || barretteAPoserSous(w) || filSous(w))) { ouvrirGrand(''); return; }
    const r = cadre(); zoomer(1.6, e.clientX - r.left, e.clientY - r.top); };
  stage.addEventListener('pointerup', fin); stage.addEventListener('pointercancel', fin);
  stage.addEventListener('mousemove', survoler);
  stage.addEventListener('mouseleave', () => { cacherBulle(); souris = null; if (!mode) { effacerSurvol(); rallumer(); } });
  stage.addEventListener('wheel', e => { if (surLAccueil(e)) return;   // le plan vide ne zoome pas
    e.preventDefault(); cacherBulle(); const r = cadre(); zoomer(Math.exp(-e.deltaY * 0.0014), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  /* « AJUSTER » ALTERNE la feuille et le dessin (`ajuster`) quand c'est la main qui le demande : le bouton, le pourcentage, la
     touche 0 (ou f). Ces écouteurs, posés avant ceux du panneau (phase de capture), le notent ; un recadrage de l'outil
     (un panneau qui s'ouvre…) ne bascule rien. Survolé, le bouton dit ce qu'il fera. */
  const geste = () => { VUE.geste = true; setTimeout(() => { VUE.geste = false; }, 0); };
  window.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('#zfit,#zlbl')) geste(); }, true);
  ['pointerenter', 'focus'].forEach(t => { const b = $('zfit'); if (b) b.addEventListener(t, direAjuster); });
  /* LES TOUCHES DU LECTEUR : 1 = 100 %, 2 = 200 % (autour de la souris si elle est sur le plan), 0 = la feuille ou le dessin ;
     Alt+← revient d'un renvoi suivi (le folio et la vue d'avant). Dans un champ, le clavier est au champ. */
  window.addEventListener('keydown', e => { if (!planVisible() || champActif(e.target)) return;
    if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.key === 'ArrowLeft' && revenirDuRenvoi()) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey || boutonActif(e.target)) return;
    if (e.key === '0' || e.key === 'f') { geste(); return; }   // le panneau ajuste (lierPanneau)
    if ((e.key === '1' || e.key === '2') && !e.repeat && !(rechercheOuverte && rechercheOuverte())) { e.preventDefault(); const r = cadre();
      zoomerA(+e.key, souris ? souris.x - r.left : null, souris ? souris.y - r.top : null); } }, true);
  // la vue se garde quand on quitte la page (le lendemain, `retrouverVue`)
  window.addEventListener('pagehide', () => garderVue()); document.addEventListener('visibilitychange', () => { if (document.hidden) garderVue(); });
}
/* Ce que la bulle du plan montrerait sous un point du dessin : un câble, un bloc, une borne, une barrette à poser, un renvoi
   (et une clé, pour qu'elle reste tant qu'on reste dessus). */
function objetDeBulle(w) { const D = app.dessin; if (!D) return null; const p = priseSous(w);
  if (p && (p.genre === 'bloc' || p.genre === 'borne')) { const k = D.comps.indexOf(p.c);
    if (estRenvoi(p.c.name)) { const f = filDuRenvoi(p.c, w.y, w.x); return { cle: 'r' + k + ':' + (f ? f.i : ''), genre: 'renvoi', c: p.c, f }; }
    return p.genre === 'borne' ? { cle: 'p' + k + ':' + p.y, genre: 'borne', c: p.c, y: p.y, etiq: p.etiq } : { cle: 'b' + k, genre: 'bloc', c: p.c }; }
  if (p && p.genre === 'vt') return { cle: 'v' + p.b.nomVT, genre: 'vt', b: p.b };
  const f = p && p.genre === 'fil' ? p.f : filSous(w); return f ? { cle: 'f' + f.i, genre: 'fil', f } : null; }
const bornePlusRepere = (n, b) => String(n || '') + (b != null && String(b) !== '' ? ':' + b : '');
// un bout de liaison tel qu'on le lit : un renvoi dit l'équipement d'en face (« ▷F2 » + « 101LP2 2 » → 101LP2:2)
const boutLisible = (n, b) => { const [r, x] = boutSource(n, b); return bornePlusRepere(r, x); };
const rangsDesFolios = ps => { const P = plans(); return ps.map(p => P.indexOf(p) + 1).filter(r => r > 0).sort((a, b) => a - b); };
function texteDeBulle(q) { const D = app.dessin, L = liaisonsDuPlan(), T = t => `<b class="pl-b-t">${esc(t)}</b>`, l_ = t => `<span class="pl-b-l">${t}</span>`, id = t => `<span class="pl-b-id">${esc(t)}</span>`;
  if (q.genre === 'rendre') return T('Rendre au moteur') + l_('ce qu’on a changé ici revient au dessin automatique');
  const lignesDeFil = f => { const l = L[f.i] || {}, s = sourceDe(l) || l; return id(s.cable || s.type || 'sans numéro') + ' · ' + id(boutLisible(s.de, s.borneDe)) + ' → ' + id(boutLisible(s.vers, s.borneVers)); };
  if (q.genre === 'fil') { const l = L[q.f.i] || {}, s = sourceDe(l) || l, c = D.couleurDe && D.couleurDe(q.f), lg = parseFloat(String(s.longueur || '').replace(',', '.'));
    return T(s.cable || majuscule(cableDit(s))) + l_(id(boutLisible(s.de, s.borneDe)) + ' → ' + id(boutLisible(s.vers, s.borneVers)))
      + l_((c ? `<i class="pl-b-route" style="background:${c}"></i>` : '') + esc(s.route || 'sans route') + ' · ' + esc(s.type || 'type inconnu') + (lg > 0 ? ' · ' + String(Math.round(lg * 100) / 100).replace('.', ',') + ' m' : '')); }
  if (q.genre === 'renvoi') { const t = q.c.name.replace(RENVOI, ''), l = q.f && L[q.f.i], bout = l ? (l.de === q.c.name ? l.borneDe : l.borneVers) : '';
    return T('Vers le folio ' + t) + (l ? l_(id(autreBoutDuRenvoi(bout)) + (l.cable ? ' · ' + id(l.cable) : '')) : '') + l_('Clic : y aller, l’autre moitié allumée'); }
  if (q.genre === 'vt') { const ws = filsDeBarretteAPoser(q.b.nomVT), r = liaisonsDuPlan().find(l => l.vers === q.b.nomVT && l.borneVers === '1' && !VT_A_POSER.test(l.de));
    return T(q.b.nomVT) + l_('barrette ajoutée par Volta' + (r ? ' sur ' + id(bornePlusRepere(r.de, r.borneDe)) : '')) + l_(pluriel(ws.length, 'câble')); }
  const c = q.c, nom = c.name;
  if (q.genre === 'borne') { const ws = filsDeLaBorne(c, q.y);
    return T(bornePlusRepere(nom, q.etiq)) + ws.slice(0, 3).map(f => l_(lignesDeFil(f))).join('') + (ws.length > 3 ? l_('et ' + (ws.length - 3) + (ws.length > 4 ? ' autres câbles' : ' autre câble')) : '') + l_('Glisser : la déplacer le long du bloc'); }
  const n = D.fils.filter(w => !w.shunt && (w.de === nom || w.vers === nom)).length, ail = rangsDesFolios(plansDuRepere(nom).filter(p => p !== app.plan));
  const genre = estMasse(nom) ? 'masse' : c.kind === 'tag' && estBarrette(nom) ? 'morceau de barrette' : estCoupure(nom) ? 'prise de coupure' : estBarrette(nom) ? 'barrette' : estDisjoncteur(nom) ? 'disjoncteur' : '';
  const d = c.kind === 'tag' ? '' : designationDe(nom), cc = estDisjoncteur(nom) && c.kind === 'equip' ? calibresDuFolio(nom) : null, cal = cc && cc.calibre;
  return T(nom) + ((genre || d || cal) ? l_(esc([genre, cal ? amperesCb(cal) + (cc.retest ? ' (installation ' + amperesCb(cc.retest) + ')' : '') : '', d].filter(Boolean).join(' · '))) : '')
    + l_(pluriel(n, 'câble') + ' sur ce folio' + (ail.length ? ' · aussi sur f. ' + ail.join(' · ') : ''))
    + (estRenvoi(nom) || c.rail ? '' : l_('Clic : sa fiche · glisser : le déplacer')); }
let appuiDuPlan = null;   // le dernier appui simple sur la planche (l'instant, l'endroit, le bloc) : un double-clic peut finir ailleurs
/* Un clic sur la planche : un bloc, un renvoi, un fil, ou le vide. */
function cliquer(w) { const c = blocSous(w);
  if (c) { if (estRenvoi(c.name)) { suivreRenvoi(c, w); return; }
    if (c.rail) return; choisirBloc(c); return; }
  const vt = barretteAPoserSous(w); if (vt) { choisirBarretteAPoser(vt); return; }
  const f = filSous(w); if (f) choisirFil(f); else deselectionner(); }
/* SUIVRE UN RENVOI : le câble continue sur un autre folio. On y va : l'AUTRE MOITIÉ du câble y est choisie, allumée et
   centrée, lisible (l'audit v72 : le clic menait au folio à la page entière, rien de choisi, et il fallait chercher la
   demi-liaison d'en face parmi d'autres boîtes) ; Alt+← revient d'où l'on vient, à la même vue. */
function suivreRenvoi(c, w) { const t = c.name.replace(RENVOI, ''); if (!plans().includes(t)) return;
  const f = filDuRenvoi(c, w.y, w.x), l = f && liaisonsDuPlan()[f.i], de = app.plan, vue = { ...(anim && vueVisee ? vueVisee : app.vue) }, main = VUE.main;
  allerAuPlan(t); if (app.plan !== t) return;
  const g = l ? autreMoitie(l, de) : null, cable = (g && g.cable) || (l && l.cable) || '';
  VUE.retours.push({ plan: de, vue, main, vers: t, cable }); if (VUE.retours.length > 20) VUE.retours.shift();
  const retour = ' · Alt+← revient au folio ' + de + '.';
  if (g) { choisirFil(g); viserFil(g); dire('Folio ' + t + ' : ' + (cable ? cable + ', ' : '') + 'l’autre moitié du câble' + retour); return; }
  if (!app.dessin && cable) { aller({ type: 'fil', nom: cable }); dire('Folio ' + t + retour); return; }   // le folio se dessine encore : le câble attend
  dire('Folio ' + t + retour); }
// le fil d'un renvoi au plus près d'un point : son bout est sur le flanc du renvoi, à la hauteur d'un port
function filDuRenvoi(c, y, x) { const D = app.dessin; let best = null, bd = Infinity; if (!D) return null;
  D.fils.forEach(f => { if (f.shunt) return; [[f.de, f.epA], [f.vers, f.epB]].forEach(([n, e]) => { if (n !== c.name || !e) return;
    const d = Math.abs(e.y - y) + (x != null ? 0.2 * Math.abs(e.x - x) : 0); if (d < bd) { bd = d; best = f; } }); });
  return best; }
/* L'autre moitié d'une liaison coupée par un renvoi (07 : de ce côté-ci « 101LP2:2 → ▷F1 » et la borne d'en face écrite
   « 300RL1 X1 » ; de l'autre, « ▷F2 » et « 101LP2 2 » → 300RL1:X1), sur le folio affiché ; à défaut, le même câble. */
function autreMoitie(l, de) { const D = app.dessin, L = liaisonsDuPlan(); if (!D) return null; const r = '▷F' + de;
  const ici = estRenvoi(l.vers) ? [l.de, l.borneDe] : [l.vers, l.borneVers], etiq = String(ici[0] || '') + (ici[1] ? ' ' + ici[1] : '');
  return D.fils.find(f => { const m = L[f.i]; return !!m && ((m.de === r && String(m.borneDe) === etiq) || (m.vers === r && String(m.borneVers) === etiq)); })
    || (l.cable ? D.fils.find(f => f.cable === l.cable) : null) || null; }
// Alt+← après un renvoi suivi : tant qu'on est sur le folio où il a mené (rien d'autre de choisi que son câble), on revient
function revenirDuRenvoi() { const r = VUE.retours[VUE.retours.length - 1]; if (!r || app.plan !== r.vers || !plans().includes(r.plan)) return false;
  const c = app.cible; if (c && !(c.type === 'fil' && r.cable && c.l && c.l.cable === r.cable)) return false;
  VUE.retours.pop(); if (c) deselectionner(); allerAuPlan(r.plan); if (app.plan !== r.plan) return true;
  animerVue(r.vue, false); VUE.main = r.main; dire('Retour au folio ' + r.plan + '.'); return true; }
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
function choisirBloc(c) { app.choisi = c.name; app.cible = { type: 'bloc', nom: c.name }; app.choisiK = app.dessin ? app.dessin.comps.indexOf(c) : -1;
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
    if (app.insp.index && !$('inspecteur').hidden) { rendreFiche(); CARTE.origine = origineDeLaCible(); dessinerLien(); return; } }
  fermerInspecteur();
  if (app.fiche) fermerFiche(true); }
const retourIndex = () => deselectionner();
/* L'inspecteur : s'ouvre sur ce qu'on choisit, se ferme quand on ne choisit plus rien. Une CARTE (08-carte) : elle naît
   de ce qu'on a cliqué et se pose à côté, le plan ne bouge pas ; épinglée (le volet), le plan se recadre à côté (sans
   bouger si ce qu'on vient de choisir est déjà en vue). Au téléphone, le tiroir. */
function ouvrirInspecteur() { const el = $('inspecteur'), etait = !el.hidden, avant = etait ? el.getBoundingClientRect() : null, vieille = CARTE.origine; if (app.fiche) fermerFiche();
  CARTE.origine = origineDeLaCible();
  el.hidden = false; document.body.classList.add('insp-ouvert'); modeCarte(); rendreFiche(); synchroniserRail();
  if (carteFlottante()) { el.classList.remove('entre'); poserLaCarte(etait, avant, vieille); return; }
  if (!etait) { el.classList.remove('entre'); void el.offsetWidth; el.classList.add('entre'); recadrerSiCache(); } }
/* Fermer : la carte se résorbe dans son bloc (son double ; elle, elle est fermée tout de suite) ; le volet rend la place. */
function fermerInspecteur() { const el = $('inspecteur'); app.insp.index = false; synchroniserRail(); if (el.hidden) return;
  const volet = !carteFlottante(); if (!volet) resorberCarte(el);
  el.hidden = true; document.body.classList.remove('insp-ouvert'); modeCarte(); CARTE.origine = null; dessinerLien(); if (volet) recadrerSiCache();
  // (v78) la prochaine fiche s'ouvre en carte : le grand ne dure que le temps qu'on y travaille
  if (typeof NIVEAU !== 'undefined') NIVEAU.grand = false; CARTE.epingle = false; document.body.classList.remove('insp-grand', 'insp-grand-ouvert'); }
/* Le rail dit ce qui est ouvert : l'outil dont le panneau est là se marque pressé (dans un carré gris). */
function synchroniserRail() { const p = (id, on) => { const b = $(id); if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false'); };
  p('btnIndex', app.insp.index && !$('inspecteur').hidden); p('btnCherche', document.body.classList.contains('cherche')); p('btnBible', !!(app.fiche && app.fiche.mode === 'bible')); }

/* ---- l'INDEX : les repères du contrat ---------------------------------- */
/* Le lecteur : « on se repère pas, on est perdu ». Un bouton du rail (R) ouvre l'inspecteur sur la liste de tous les
   repères — équipements, barrettes (celles à poser comprises), prises —, chacun avec son état et ses folios ; on y
   cherche ; un clic ouvre la fiche, la flèche ramène à la liste. Rien n'est caché derrière le plan. */
function basculerIndex() { if (!$('inspecteur').hidden && app.insp.index) { if (app.cible) retourIndex(); else fermerInspecteur(); return; }   // depuis une fiche venue de l'index, R ramène à la liste
  if (!(app.contrat.liaisons.length || verite().length)) { dire('Rien à montrer : ouvrez d’abord une installation.'); return; }
  app.insp.index = true; if (app.cible) { const c = app.cible; app.cible = null; if (app.choisi) { app.choisi = null; peindre(); }
    if (c.type === 'bloc' && app.base.filtreAuto) { app.base.filtre = ''; app.base.filtreAuto = false; rendreBase(); } eteindre(); marquerLignes(); }
  ouvrirInspecteur(); const q = $('ix-q'); if (q && !telephone()) q.focus(); }
/* LA MÉMOIRE DU CONTRAT (l'audit de fluidité, P1-6 : sur 3 000 liaisons, chaque redessin relisait tous les repères —
   changer de folio 824 ms, chaque touche du filtre de l'index 1,1 s) : ce qu'on déduit du contrat entier se garde tant
   qu'il ne change pas. La clé : ce que la liste lit — les liaisons (la vérité et les folios), les choix (désignations,
   profils, sexes, raccords, les barrettes à poser numérotées), la norme, la bible. */
const MEMO_CONTRAT = { cle: null, valeurs: new Map() };
function cleDuContrat() { const C = app.contrat, V = verite();
  return V.length + '|' + C.liaisons.length + '|' + app.nFolios + '|' + app.budget + '|' + signature(V) + '|' + V.map(l => (l.descriptionDe || '') + '\u0002' + (l.descriptionVers || '')).join('\u0001') + '|' + JSON.stringify([...C.designations]) + '|' + JSON.stringify([...(C.charges || [])])
    + '|' + JSON.stringify([...(C.sexes || [])]) + '|' + JSON.stringify([...(C.raccords || [])]) + '|' + JSON.stringify([...(C.provisoires || [])]) + '|' + idDeObjet(app.norme) + '|' + idDeObjet(app.bible); }
// un numéro par objet (la norme, la bible : une table changée, une bible importée en font un autre)
const idDeObjet = (() => { const M = new WeakMap(); let n = 0; return o => !o || typeof o !== 'object' ? 0 : M.get(o) || (M.set(o, ++n), n); })();
function memoContrat(k, f) { const M = MEMO_CONTRAT, c = cleDuContrat(); if (c !== M.cle) { M.cle = c; M.valeurs.clear(); }
  if (!M.valeurs.has(k)) M.valeurs.set(k, f()); return M.valeurs.get(k); }
// les repères du contrat, et les barrettes à poser de chaque folio : nom, genre, ce qu'on écrit dessous, ses folios
const reperesDuContrat = () => memoContrat('reperes', () => { const V = verite(), out = [];
  reperesDe(V).filter(r => !estRenvoi(r) && !estMasse(r) && !estRail(r)).forEach(nom => { const des = app.contrat.designations.get(nom) || '';
    const genre = estCoupure(nom) ? 'coupure' : estBarrette(nom) ? 'barrette' : estDisjoncteur(nom) ? 'cb' : 'eqpt';
    let sous = des || designationDe(nom);
    if (genre === 'cb') { const c = calibreDe(nom); sous = (c ? amperes(c) : '') + (sous && sous !== 'disjoncteur' ? (c ? ' · ' : '') + sous : ''); }
    if (!sous && genre === 'eqpt') sous = [...new Set(connecteursDe(nom, V).map(c => c.pn).filter(Boolean))].slice(0, 2).join(' · ');
    if (!sous) sous = pluriel(V.filter(l => l.de === nom || l.vers === nom).length, 'câble');
    out.push({ nom, genre, plans: plansDuRepere(nom).sort(triNaturel), sous }); });
  (plans().length ? plans() : ['*']).forEach(p => liaisonsDe(p).forEach(l => { if (l.origine === null && l.vers === l.aPoser && l.borneVers === '1')
    out.push({ nom: l.aPoser, genre: 'barrette', plan: p, plans: p === '*' ? [] : [p], sous: 'ajoutée par Volta sur ' + l.de + ':' + l.borneDe }); }));
  return out.sort((a, b) => triNaturel(a.nom, b.nom) || triNaturel(a.plan || '', b.plan || '')); });
/* L'index : d'abord ce qu'il y a à reprendre (08 quater, par genre), puis les repères par genre — les disjoncteurs à part.
   Le filtre cherche dans les repères et ce qu'on écrit dessous (la désignation, la description du retest, le calibre, le
   part number) — et dans les CÂBLES (l'audit v72 : « l'index R trouve les câbles ») : un numéro, un type. */
function rendreIndex(box) { const etats = new Map();
  (CONTROLE.items || []).forEach(x => { if (!x.nom) return; if (x.niveau === 'ko' || !etats.has(x.nom)) etats.set(x.nom, x.niveau); });
  const f = app.insp.filtre.trim().toLowerCase(), items = reperesDuContrat().filter(r => !f || r.nom.toLowerCase().includes(f) || r.sous.toLowerCase().includes(f));
  // les câbles que le filtre trouve (le numéro, le type), douze au plus
  const cables = !f ? [] : (() => { const vus = new Set(), out = []; for (const l of verite()) { const c = l.cable || ''; if (!c || vus.has(c)) continue;
      if (c.toLowerCase().includes(f) || (f.length >= 2 && String(l.type || '').toLowerCase().includes(f))) { vus.add(c); out.push(l); } }
    return out.sort((a, b) => triNaturel(a.cable, b.cable)); })();
  // ce que le filtre a trouvé, surligné dans le repère et sa ligne
  const marque = t => { const h = esc(t); if (!f) return h; const i = String(t).toLowerCase().indexOf(f); return i < 0 ? h : esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + f.length)) + '</mark>' + esc(t.slice(i + f.length)); };
  const groupes = [['cb', 'Disjoncteurs'], ['eqpt', 'Équipements'], ['barrette', 'Barrettes'], ['coupure', 'Prises de coupure']].map(([g, t]) => { const xs = items.filter(r => r.genre === g); if (!xs.length) return '';
    return `<div class="ix-groupe"><span>${t}</span><b>${xs.length}</b></div><ul class="ix-liste">` + xs.map(r => `<li><button class="ix-item" data-nom="${escA(r.nom)}"${r.plan ? ` data-plan="${escA(r.plan)}"` : ''}>`
      + `<span class="ix-etat ${etats.get(r.nom) || 'ok'}" aria-hidden="true"></span><span class="min0"><b>${marque(r.nom)}</b><small>${insecable(marque(r.sous))}</small></span>`
      + (r.plans.length ? `<span class="ix-folio">${esc(r.plans.length > 3 ? r.plans.length + ' folios' : 'f. ' + r.plans.join(' · '))}</span>` : '') + '</button></li>').join('') + '</ul>'; }).join('')
    + (cables.length ? `<div class="ix-groupe"><span>Câbles</span><b>${cables.length > 12 ? '12 / ' + cables.length : cables.length}</b></div><ul class="ix-liste">` + cables.slice(0, 12).map(l => { const p = plansDuFil(l.cable);
      return `<li><button class="ix-item ix-cable" data-cable="${escA(l.cable)}"><span class="ix-etat ok" aria-hidden="true"></span><span class="min0"><b>${marque(l.cable)}</b><small>${marque(l.type || 'sans type')} · ${esc(l.de)} → ${esc(l.vers)}</small></span>`
        + (p.length ? `<span class="ix-folio">${esc(p.length > 3 ? p.length + ' folios' : 'f. ' + p.join(' · '))}</span>` : '') + '</button></li>'; }).join('') + '</ul>' : '');
  const meme = box.dataset.cle === 'index', haut = box.scrollTop, nko = (CONTROLE.items || []).filter(x => x.niveau === 'ko').length, natt = (CONTROLE.items || []).length - nko;
  box.className = 'fi ix'; box.dataset.cle = 'index';
  // la fiche qu'on y a laissée : ‹ la rouvre (Alt+←), à la même place
  const I = typeof pileInsp === 'function' ? pileInsp() : null, laissee = I && I.pile[I.pos];
  box.innerHTML = `<header class="ix-tete">${laissee ? `<button class="fi-pas" id="fi-prec" aria-label="${escA('Revenir à ' + nomDEntree(laissee) + ' (Alt+←)')}" data-bulle="${escA('Revenir à ' + nomDEntree(laissee) + ' (Alt+←)')}">${ico('gauche')}</button>` : ''}<h2>Repères<b class="ix-n" data-bulle="${escA(pluriel(items.length, 'repère') + ' — hors renvois, masses et rails')}">${items.length}</b></h2><span class="espace"></span><button class="fi-x plus" id="ix-plus" data-bulle="Ajouter un équipement : son repère, puis ses câbles dans le tableau" aria-label="Ajouter un équipement" aria-expanded="${!!app.insp.ajout}">${ico('plus')}</button>${boutonTaille()}${boutonEpingle()}<button class="fi-x" id="in-fermer" aria-label="Fermer (Échap)" data-bulle="Fermer · Échap">${ico('fermer')}</button></header>`
    // ajouter un équipement : un champ en ligne, sous le titre (pas une boîte du navigateur)
    + (app.insp.ajout ? `<form class="ix-ajout" id="ix-ajout"><div class="filtre">${ico('plus')}<input id="ix-nouveau" placeholder="Repère du nouvel équipement, par exemple 105RL2" aria-label="Repère du nouvel équipement" autocomplete="off" spellcheck="false"></div><button class="btn cuivre" type="submit">Ajouter</button><button class="btn lien" type="button" id="ix-annuler">Annuler</button></form>` : '')
    + `<div class="filtre ix-filtre">${ico('loupe')}<input id="ix-q" value="${escA(app.insp.filtre)}" placeholder="Chercher un repère, une désignation, un câble" aria-label="Chercher un repère ou un câble" autocomplete="off" spellcheck="false"><button class="vider" id="ix-vider"${f ? '' : ' hidden'} aria-label="Effacer la recherche">×</button></div>`
    + (f ? '' : `<details class="ix-controle"${CONTROLE.ouvert ? ' open' : ''}><summary><span class="fi-etat ${nko ? 'ko' : natt ? 'att' : 'ok'}"><i aria-hidden="true">${nko ? '✕' : natt ? '!' : '✓'}</i>${nko ? pluriel(nko, 'problème') + (natt ? ' · ' + natt + ' à voir' : '') : natt ? natt + ' à voir' : 'rien à reprendre'}</span>${(nko || natt) ? ico('bas', 'fi-chevron') : ''}</summary>${listeControleHtml()}</details>`)
    + (groupes || `<div class="ix-vide"><span class="ix-vide-ico" aria-hidden="true">${ico('loupe')}</span><p>Aucun repère ni câble ne contient « ${esc(app.insp.filtre.trim())} ».</p><button class="btn papier" id="ix-effacer">Effacer la recherche</button></div>`);
  // la même liste refaite (un filtre tapé) garde sa place ; l'index qu'on ouvre commence en haut, titre et recherche en vue
  box.scrollTop = meme ? haut : 0; survolQuiSuit(box); if (typeof lierBulles === 'function') lierBulles(box);
  $('in-fermer').onclick = () => fermerInspecteur();
  const ep = $('fi-epingle'); if (ep) ep.onclick = e => { e.stopPropagation(); epinglerCarte(!CARTE.epingle); }; lierTaille();
  if ($('fi-prec')) $('fi-prec').onclick = () => naviguer(-1);
  const q = $('ix-q'); q.addEventListener('input', () => { app.insp.filtre = q.value; const pos = q.selectionStart; rendreIndex(box); const q2 = $('ix-q'); q2.focus(); q2.setSelectionRange(pos, pos); });
  /* AU CLAVIER (v73, l'ergonome : « ↓ dans sa recherche ne descend pas dans la liste ») : ↑ ↓ parcourent les lignes qu'on
     voit sans quitter le champ (on peut encore taper : `aria-activedescendant`), la teinte qui suit se pose sur la ligne
     choisie ; Entrée l'ouvre (sans ligne choisie : la première) ; Début, Fin. */
  const lignes = () => [...box.querySelectorAll('.ix-item')].filter(b => b.checkVisibility ? b.checkVisibility() : b.offsetParent !== null);
  q.setAttribute('role', 'combobox'); q.setAttribute('aria-expanded', 'true'); q.setAttribute('aria-autocomplete', 'list');
  const choisirLigne = k => { const xs = lignes(); if (!xs.length) return; k = Math.max(0, Math.min(xs.length - 1, k)); box.querySelectorAll('.ix-item.actif').forEach(b => { b.classList.remove('actif'); b.removeAttribute('aria-selected'); });
    const b = xs[k]; b.id = b.id || 'ix-o-' + k; b.classList.add('actif'); b.setAttribute('aria-selected', 'true'); q.setAttribute('aria-activedescendant', b.id); app.insp.actif = k;
    b.scrollIntoView({ block: 'nearest' }); if (box.poserSurvol) box.poserSurvol(b); };
  app.insp.actif = -1;
  q.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); if (q.value) { q.value = ''; q.dispatchEvent(new Event('input')); } else fermerInspecteur(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); const n = lignes().length; if (!n) return; const k = app.insp.actif;
      choisirLigne(e.key === 'ArrowDown' ? (k < 0 ? 0 : (k + 1) % n) : (k <= 0 ? n - 1 : k - 1)); }
    else if ((e.key === 'Home' || e.key === 'End') && app.insp.actif >= 0) { e.preventDefault(); choisirLigne(e.key === 'Home' ? 0 : lignes().length - 1); }
    else if (e.key === 'Enter') { const b = (app.insp.actif >= 0 && box.querySelector('.ix-item.actif')) || box.querySelector('.ix-item[data-nom], .ix-item[data-cable]'); if (b) { e.preventDefault(); b.click(); } } });
  const effacer = () => { app.insp.filtre = ''; rendreIndex(box); const q2 = $('ix-q'); if (q2) q2.focus(); };
  ['ix-vider', 'ix-effacer'].forEach(id => { const b = $(id); if (b) b.onclick = effacer; });
  $('ix-plus').onclick = () => { app.insp.ajout = !app.insp.ajout; rendreIndex(box); const n = $('ix-nouveau'); if (n) n.focus(); };
  const aj = $('ix-ajout'); if (aj) { const n = $('ix-nouveau'), fin = () => { app.insp.ajout = false; rendreIndex(box); };
    aj.addEventListener('submit', e => { e.preventDefault(); const r = n.value.trim(); if (!r) { n.focus(); return; } fin();
      if (!app.base.ouvert) ouvrirBase(); ajouterLiaison(r); dire(r + ' : écrivez ses câbles dans le tableau, le plan suit.'); });
    $('ix-annuler').onclick = fin; n.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); fin(); } }); }
  const det = box.querySelector('.ix-controle'); if (det) det.addEventListener('toggle', () => { CONTROLE.ouvert = det.open; });
  if (det) lierListeControle(det, () => rendreIndex(box));
  box.querySelectorAll('.ix-item.co-item').forEach(b => b.onclick = () => { const L = lignesDuControle(), i = L.findIndex(l => l.cle === b.dataset.ligne); if (i >= 0) CONTROLE.pas = { cle: L[i].cle, rang: i }; allerAuControle(CONTROLE.items[+b.dataset.k]); });
  box.querySelectorAll('.ix-item[data-nom]').forEach(b => b.onclick = () => allerAuRepere(b.dataset.nom, b.dataset.plan));
  box.querySelectorAll('.ix-item[data-cable]').forEach(b => b.onclick = () => aller({ type: 'fil', nom: b.dataset.cable })); }
/* LE SURVOL QUI SUIT (v68 : « très fluide, très naturel ») : une seule teinte, posée sous la ligne que la souris survole
   (ou qui a le clavier), qui GLISSE d'une ligne à l'autre au lieu de s'éteindre et de se rallumer ; elle s'efface quand on
   quitte les lignes. Posée dans la fiche (elle défile avec la liste), refaite à chaque rendu de l'index ; les écouteurs, une
   fois pour toutes sur l'inspecteur, ne valent que pour l'index (`.ix`). */
function survolQuiSuit(box) { const s = document.createElement('span'); s.className = 'ix-survol'; s.setAttribute('aria-hidden', 'true'); box.prepend(s); box.classList.add('suit');
  if (box.dataset.ixSuit) return; box.dataset.ixSuit = '1'; let pose = false;
  // la ligne choisie au clavier (↑ ↓ dans la recherche de l'index) la pose aussi
  const poser = box.poserSurvol = b => { const t = box.querySelector(':scope > .ix-survol'); if (!t) return;
    if (!b) { t.style.opacity = '0'; pose = false; return; }
    const rb = box.getBoundingClientRect(), r = b.getBoundingClientRect();
    // la première fois, elle paraît sur place (sans glisser depuis le coin) ; ensuite elle glisse
    if (!pose || t.style.opacity !== '1') { t.style.transition = 'none'; }
    t.style.transform = `translate(${r.left - rb.left + box.scrollLeft}px,${r.top - rb.top + box.scrollTop}px)`; t.style.width = r.width + 'px'; t.style.height = r.height + 'px';
    if (t.style.transition === 'none') { void t.offsetWidth; t.style.transition = ''; }
    t.style.opacity = '1'; pose = true; };
  const ligne = e => box.classList.contains('ix') && e.target && e.target.closest ? e.target.closest('.ix-item') : null;
  box.addEventListener('mouseover', e => { if (box.classList.contains('ix')) poser(ligne(e)); });
  box.addEventListener('mouseleave', () => poser(null));
  box.addEventListener('focusin', e => { const b = ligne(e); if (b && b.matches(':focus-visible')) poser(b); });
  // « à reprendre » qui se plie ou se déplie déplace les lignes : la teinte s'efface, la souris la reposera
  box.addEventListener('click', e => { if (ligne(e) === null && box.classList.contains('ix') && e.target.closest && e.target.closest('summary')) poser(null); }); }
// depuis l'index : le folio du repère, son bloc choisi sur le plan, sa fiche
function allerAuRepere(nom, plan) { const P = plans();
  if (plan && plan !== app.plan && P.includes(plan)) allerAuPlan(plan);
  else if (!plan) { const ou = plansDuRepere(nom); if (app.plan !== '*' && ou.length && !ou.includes(app.plan)) allerAuPlan(ou[0]); }
  const c = app.dessin && app.dessin.comps.find(k => k.name === nom && k.kind !== 'tag'), vt = c ? null : barretteAPoser(nom);
  if (c) choisirBloc(c); else if (vt) choisirBarretteAPoser(vt); else { app.cible = { type: 'bloc', nom }; ouvrirInspecteur(); }
  if (viser(nom)) pulser({ type: 'bloc', nom }); }
/* Le panneau qui s'ouvre ou se ferme change la place du plan. Si l'on regardait la feuille ENTIÈRE (ou le dessin entier,
   cadré sur lui), elle se recadre en douceur dans la place qui reste (jamais sous le panneau) ; si l'on avait zoomé sur un endroit, on n'y touche pas —
   seulement, si ce qu'on vient de choisir passe sous le panneau, on le ramène, à la même échelle. */
function recadrerSiCache() { const d = app.dessin; if (!d) { ajuster(true); return; }
  // (v78) le grand ouvert : l'objet reste cadré dans le tiers du plan, lisible — pas la feuille entière, minuscule
  if (document.body.classList.contains('insp-epingle') && document.body.classList.contains('insp-grand') && boiteDeLaCible()) { montrerSiCache(boiteDeLaCible()); return; }
  const r = cadre(), s = app.vue.s, entier = bb => { const x0 = app.vue.tx + bb.x * s, y0 = app.vue.ty + bb.y * s; return x0 >= -2 && y0 >= -2 && x0 + bb.w * s <= r.width + 2 && y0 + bb.h * s <= r.height + 2; };
  // la feuille entière — ou, cadré sur lui (v73), le DESSIN entier — se recadre dans la place qui reste
  if (entier(d.bbox) || (VUE.cadrage === 'dessin' && !VUE.main && entier(boiteDuDessin(d)))) { ajuster(true); return; }
  const c = app.cible, k = c && c.type === 'bloc' && d.compDe.get(c.nom), w = c && c.type === 'fil' && filDe(c.l);
  if (k) montrerSiCache({ x: k.x, y: k.y, w: k.w, h: k.h });
  else if (w) { const xs = w.pts.map(p => p.x), ys = w.pts.map(p => p.y), a = Math.min(...xs), b = Math.min(...ys); montrerSiCache({ x: a, y: b, w: Math.max(...xs) - a, h: Math.max(...ys) - b }); } }
// la boîte, dans le dessin, de ce qui est choisi : un bloc, un câble, une barrette à poser — null s'il n'est pas sur ce folio
function boiteDeLaCible() { const d = app.dessin, c = app.cible; if (!d || !c) return null;
  if (c.type === 'bloc') { const k = d.compDe.get(c.nom); if (k) return { x: k.x, y: k.y, w: k.w, h: k.h };
    const vt = typeof barretteAPoser === 'function' ? barretteAPoser(c.nom) : null; if (vt) { const bs = bornesDePiquage(vt); return { x: vt.x - 20, y: bs[0].y - 12, w: 40, h: bs[bs.length - 1].y - bs[0].y + 24 }; } return null; }
  if (c.type === 'fil') { const w = c.f || filDe(c.l); if (!w || !w.pts || !w.pts.length) return null; const xs = w.pts.map(p => p.x), ys = w.pts.map(p => p.y), a = Math.min(...xs), b = Math.min(...ys); return { x: a, y: b, w: Math.max(...xs) - a, h: Math.max(...ys) - b }; }
  return null; }
/* R5 — LE PLAN NE BOUGE PAS pour rien : ouvrir une fiche depuis une fiche allume l'objet ; le plan ne glisse que si
   l'objet est hors de la place libre (sous un panneau, hors de l'écran), et alors à la même échelle quand il y tient.
   `b` : la boîte de l'objet, dans le repère du dessin. */
function montrerSiCache(b) { if (!b || !app.dessin) return; const r = cadre(), m = marges(), s = app.vue.s;
  const X0 = app.vue.tx + b.x * s, Y0 = app.vue.ty + b.y * s, X1 = X0 + b.w * s, Y1 = Y0 + b.h * s, L = m.gauche, T = m.haut, R = r.width - m.droite, B = r.height - m.bas;
  // (v78) à côté du grand, le plan n'a qu'un tiers : l'objet s'y cadre lisible (ses voisins autour), sauf s'il l'est déjà
  if (document.body.classList.contains('insp-grand') && document.body.classList.contains('insp-epingle')) { const lisible = Math.min(LISIBLE_BUREAU, Math.max(0.42, Math.min((R - L) / (b.w + 260), (B - T) / (b.h + 200))));
    if (X0 >= L - 1 && X1 <= R + 1 && Y0 >= T - 1 && Y1 <= B + 1 && s >= Math.min(0.42, lisible) - 1e-3) return;
    animerVue({ s: lisible, tx: (L + R) / 2 - (b.x + b.w / 2) * lisible, ty: (T + B) / 2 - (b.y + b.h / 2) * lisible }, true); return; }
  if (X0 >= L - 1 && X1 <= R + 1 && Y0 >= T - 1 && Y1 <= B + 1) return;
  if (b.w * s > R - L || b.h * s > B - T) { centrerSur(b.x, b.y, b.w, b.h); return; }
  animerVue({ s, tx: (L + R) / 2 - (b.x + b.w / 2) * s, ty: (T + B) / 2 - (b.y + b.h / 2) * s }, true); }

/* ---- les folios : y aller, les montrer --------------------------------- */
/* ALLER À UN FOLIO : la vue du folio qu'on quitte se garde, celle du folio où l'on arrive revient — on le retrouve comme
   on l'a laissé ; un folio jamais vu se cadre (la feuille, ou le dessin : le cadrage choisi). Le folio se garde avec le
   contrat (`sauver`) : le lendemain, on rouvre au folio 3, pas au folio 1 (l'audit du parcours v72). */
function allerAuPlan(plan) { if (plan === app.plan) return;
  const P = plans(), i0 = P.indexOf(app.plan), i1 = P.indexOf(plan), sens = i0 >= 0 && i1 >= 0 ? Math.sign(i1 - i0) : 0;
  finirGlisse(); finirRangement(); const photo = sens && app.dessin && !mouvementReduit() ? photoDuFolio() : null;
  garderVue(); app.plan = plan; app.choisi = null; fermerFiche(); redessiner(); retrouverVue(); sauver();
  if (photo) glisserFolio(photo, sens); }
/* LE FOLIO GLISSE (v73, le designer § 5.4 : « une coupe franche ») : le DESSIN qu'on quitte sort de 32 px du côté d'où
   l'on vient, en 120 ms (`--courbe-sortie`) ; le nouveau entre de 32 px du côté où l'on va, en 260 ms (`--courbe-entree`),
   quand l'ancien est presque effacé — jamais deux dessins à la fois. La FEUILLE, elle, ne clignote pas : elle reste (cadrée
   sur le dessin, elle couvre la table d'un folio à l'autre ; un fondu la faisait passer par la nuit), et si sa place
   change, elle y glisse (300 ms, `--courbe-glisse`) avec son ombre. Le dessin qu'on quitte est une photo (une copie sans
   identifiants ni feuille) posée au-dessus, le nouveau attend dans un groupe à lui, puis tout reprend sa place ; un autre
   changement achève net le précédent. Le mouvement réduit coupe. */
const GLISSE_FOLIO = { photo: null, anims: [], g: null };
function photoDuFolio() { const svg = $('svg'), D = app.dessin; if (!svg || !D || !$('scene')) return null;
  const s = svg.cloneNode(true); s.removeAttribute('id'); s.setAttribute('class', 'folio-part'); s.setAttribute('aria-hidden', 'true');
  s.querySelectorAll('[id]').forEach(e => e.removeAttribute('id')); s.querySelectorAll('.loupe,.pulse,.rt-survol,.rt-calque').forEach(e => e.remove());
  const f = s.querySelector('g.feuille'), sc = f && f.parentNode, bb = D.bbox, v = app.vue; if (f) f.remove();
  return { svg: s, feuille: f, scene: sc, papier: { x: v.tx + bb.x * v.s, y: v.ty + bb.y * v.s, w: bb.w * v.s, h: bb.h * v.s } }; }
// le nouveau dessin reprend sa place dans la scène (le groupe du glissement se défait)
function deballerGlisse() { const g = GLISSE_FOLIO.g; GLISSE_FOLIO.g = null; if (!g || !g.parentNode) return; while (g.firstChild) g.before(g.firstChild); g.remove(); }
function finirGlisse() { const xs = GLISSE_FOLIO.anims; GLISSE_FOLIO.anims = []; xs.forEach(a => { try { a.finish(); } catch (_) { } }); deballerGlisse();
  if (GLISSE_FOLIO.photo) { GLISSE_FOLIO.photo.svg.remove(); GLISSE_FOLIO.photo = null; } }
function glisserFolio(photo, sens) { finirGlisse(); const svg = $('svg'), sc = $('scene'), o = $('ombre'), D = app.dessin; if (!svg) return;
  svg.after(photo.svg); GLISSE_FOLIO.photo = photo;
  // le folio se dessine encore (au loin) : sa feuille ne viendra qu'avec lui, la photo la garde le temps de s'effacer
  if (!D || !sc) { if (photo.feuille && photo.scene) photo.scene.prepend(photo.feuille); }
  const d = 32 * sens, sortie = { duration: 120, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }, entree = { duration: 260, delay: 100, easing: 'cubic-bezier(.32,.72,0,1)', fill: 'backwards' };
  const a = photo.svg.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-d}px)` }], sortie);
  auBoutDe(a, () => { if (GLISSE_FOLIO.photo === photo) { photo.svg.remove(); GLISSE_FOLIO.photo = null; } }, 400); GLISSE_FOLIO.anims.push(a);
  if (!D || !sc) return;
  const s = app.vue.s, kids = [...sc.children].filter(e => !e.matches('g.feuille'));
  if (kids.length) { const g = document.createElementNS(NS_SVG, 'g'); g.setAttribute('class', 'folio-vient'); kids[0].before(g); kids.forEach(e => g.appendChild(e)); GLISSE_FOLIO.g = g;
    const b = g.animate([{ opacity: 0, transform: `translate(${d / s}px,0)` }, { opacity: 1, transform: 'none' }], entree); auBoutDe(b, deballerGlisse, 700); GLISSE_FOLIO.anims.push(b); }
  // la feuille et son ombre glissent de leur place d'avant à la nouvelle — si elle a changé
  const bb = D.bbox, R0 = photo.papier, R1 = { x: app.vue.tx + bb.x * s, y: app.vue.ty + bb.y * s, w: bb.w * s, h: bb.h * s }, f = sc.querySelector('g.feuille');
  if (f && Math.abs(R0.x - R1.x) + Math.abs(R0.y - R1.y) + Math.abs(R0.w - R1.w) > 1.5) { const k = bb.k || bb.w / PAGE_W, glisse = { duration: 300, easing: 'cubic-bezier(.65,0,.35,1)' };
    GLISSE_FOLIO.anims.push(f.animate([{ transform: `translate(${(R0.x - app.vue.tx) / s}px,${(R0.y - app.vue.ty) / s}px) scale(${k * R0.w / R1.w})` }, { transform: `translate(${bb.x}px,${bb.y}px) scale(${k})` }], glisse));
    if (o && o.style.display !== 'none') GLISSE_FOLIO.anims.push(o.animate([{ transform: `translate(${R0.x}px,${R0.y}px)`, width: R0.w + 'px', height: R0.h + 'px' }, { transform: o.style.transform, width: o.style.width, height: o.style.height }], glisse)); } }
/* LES FLÈCHES ← → vont au folio voisin (rien de choisi : un bloc choisi, elles le poussent, `lierPlanche`) — mais pas
   quand le clavier est sur un CONTRÔLE d'un panneau (un bouton de la carte, une case du récapitulatif, une ligne de
   l'index, la palette, le menu) : la flèche y est à lui, ou à rien ; changer de folio fermait la carte sous la main
   (v74). La carte qui tient le clavier sur elle-même, elle, laisse les flèches au plan. */
function flechesAuFolio(t) { return !(t && t.closest && t.id !== 'inspecteur' && t.closest('#inspecteur,#fiche,#base,#palette,#menu,#raccourcis,[role="listbox"],[role="menu"],[role="tablist"],[role="radiogroup"],[role="slider"],[role="dialog"]')); }
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
  // la barre du bas reste (cadrage, zoom) ; la partie folios ne se montre qu'à plusieurs feuilles ; sans contrat (la bibliothèque, un plan vide), rien
  $('folios').hidden = !app.contrat.liaisons.length;
  $('fo-part').hidden = P.length < 2;
  if (app.plan !== '*' && !P.includes(app.plan)) app.plan = P.length > 1 ? P[0] : '*';
  const i = P.indexOf(app.plan), k = coupureDesFolios(P);
  // la puce courante d'avant : si elle change, la pastille glissera d'elle à la nouvelle (`glisserPastille`)
  const avant = strip.querySelector('.chip.on'), deP = avant && avant.dataset.plan, deX = avant ? avant.offsetLeft : 0, deW = avant ? avant.offsetWidth : 0;
  const html = P.length < 2 ? '' : P.map(p => `<button class="chip${p === app.plan ? ' on' : ''}${k ? ' abrege' : ''}" data-plan="${escA(p)}" data-nom="${escA('Folio ' + p)}" aria-label="Folio ${escA(p)}"${p === app.plan ? ' aria-current="page"' : ''}>${k ? `<span class="chip-pre">${esc(p.slice(0, k))}</span>${esc(p.slice(k))}` : esc(p)}</button>`).join('');
  // la même bande (le même folio, les mêmes puces) ne se refait pas : la puce qui a le clavier le garde, la pastille ne saute pas
  if (synchroniserFolios.html !== html || !strip.querySelector('.chip') !== !html) { strip.innerHTML = html; synchroniserFolios.html = html; }
  if (deP && deP !== app.plan && P.includes(deP)) glisserPastille(strip, deP, deX, deW);
  if (sel) { sel.hidden = P.length <= FOLIOS_EN_LISTE; sel.innerHTML = sel.hidden ? '' : P.map((p, j) => `<option value="${escA(p)}"${p === app.plan ? ' selected' : ''}>${j + 1} · ${esc(p)}</option>`).join(''); }
  $('fo-lbl').textContent = i < 0 ? (P.length > 1 ? 'tout' : '1 / 1') : (i + 1) + ' / ' + P.length;
  // une seule feuille : les flèches n'ont nulle part où aller
  const seul = P.length < 2; $('fo-prev').disabled = seul || i === 0; $('fo-next').disabled = seul || (i >= 0 && i >= P.length - 1);
  const on = strip.querySelector('.chip.on'); if (on && on.scrollIntoView) { try { on.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (_) { } } }
/* LA PASTILLE GLISSE (v73, le designer) : la pièce claire du folio courant va d'une puce à l'autre en 220 ms
   (`--courbe-glisse`) au lieu de sauter. Une pastille de la matière de la puce courante (lue sur elle) passe sous les
   puces ; les mots changent d'encre en chemin (sombre sur la pastille, clair sur le verre). Le mouvement réduit coupe. */
function glisserPastille(strip, deP, deX, deW) { const on = strip.querySelector('.chip.on'), de = strip.querySelector(`.chip[data-plan="${CSS.escape(deP)}"]`);
  if (glisserPastille.fin) glisserPastille.fin();
  if (!on || !de || mouvementReduit() || !on.offsetWidth) return;
  const s = getComputedStyle(on), clair = getComputedStyle(de).color, encre = s.color, p = document.createElement('span'); p.className = 'fo-pastille'; p.setAttribute('aria-hidden', 'true');
  Object.assign(p.style, { background: s.backgroundColor, boxShadow: s.boxShadow, borderRadius: s.borderRadius, top: on.offsetTop + 'px', height: on.offsetHeight + 'px', width: on.offsetWidth + 'px' });
  strip.prepend(p); on.style.transition = 'none'; on.style.background = 'transparent'; on.style.boxShadow = 'none';   // sa propre transition ferait une seconde pastille
  const t = { duration: 220, easing: 'cubic-bezier(.65,0,.35,1)' }, as = [
    p.animate([{ transform: `translateX(${deX}px)`, width: (deW || on.offsetWidth) + 'px' }, { transform: `translateX(${on.offsetLeft}px)`, width: on.offsetWidth + 'px' }], { ...t, fill: 'forwards' }),
    // l'encre change quand la pastille passe la moitié du chemin (la même courbe) : sombre sur elle, claire sur le verre
    on.animate([{ color: clair }, { color: clair, offset: 0.5 }, { color: encre, offset: 0.62 }, { color: encre }], t), de.animate([{ color: encre }, { color: encre, offset: 0.38 }, { color: clair, offset: 0.5 }, { color: clair }], t)];
  let fini = false; const fin = () => { if (fini) return; fini = true; if (glisserPastille.fin === fin) glisserPastille.fin = null; as.forEach(a => { try { a.cancel(); } catch (_) { } }); p.remove(); on.style.background = ''; on.style.boxShadow = ''; requestAnimationFrame(() => { on.style.transition = ''; }); };
  glisserPastille.fin = fin; auBoutDe(as[0], fin, 500); }

/* ---- aller à un repère ou à un fil, même sur un autre folio ------------ */
function aller(cible) { const P = plans(); const nom = cible.nom;
  // un type de câble : tous ses câbles, dans le récapitulatif (le plan reste où il est) ; une nature, son onglet
  if (cible.type === 'type') { montrerLiaisons(nom); return; }
  if (cible.type === 'nature') { montrerNature(cible); return; }
  const ou = cible.type === 'fil' ? plansDuFil(nom) : plansDuRepere(nom);
  if (P.length > 1 && app.plan !== '*' && ou.length && !ou.includes(app.plan)) allerAuPlan(ou[0]);
  if (!app.dessin && attenteCourante()) { reporterCible(cible); return; }   // le folio se place au loin : la cible attend le dessin (finirAttente)
  if (cible.type === 'fil') { const f = app.dessin && app.dessin.fils.find(w => w.cable === nom); if (!f) { dire('« ' + nom + ' » n’est pas dessiné.'); return; }
    choisirFil(f); viserFil(f); pulser({ type: 'fil', f }); return; }
  const c = app.dessin && app.dessin.compDe.get(nom); if (!c) { dire('« ' + nom + ' » n’est sur aucun folio.'); return; }
  // une borne : la fiche du repère sur son connecteur, la ligne du contact allumée (08-fiche, `rouvrir` et son but)
  if (cible.type === 'borne' && typeof rouvrir === 'function') { const l = cible.l, g = estMasse(nom) ? null : connecteurParBorne(nom, liaisonsDeRepere(nom)).get(String(cible.borne));
    rouvrir({ type: 'bloc', nom }, null, estMasse(nom) ? { section: 'fils', viser: cleFil(l) } : { connecteur: g ? g.nom : '', section: 'connecteur', viser: cleFil(l) }); viser(nom); pulser({ type: 'bloc', nom }); return; }
  choisirBloc(c); viser(nom); pulser({ type: 'bloc', nom }); }

// une nature trouvée (« tous les disjoncteurs ») : son onglet du récapitulatif, sur tout le plan (08-recap, comme `montrerLiaisons`)
function montrerNature(c) { const b = app.base; if (typeof changerOnglet !== 'function') return; b.filtreAuto = false; changerOnglet(c.onglet, true);
  b.filtre = c.filtre || ''; b.portee = 'tout'; if (typeof memoriserBase === 'function') memoriserBase(); if (b.ouvert) rendreBase(true); else ouvrirBase(); }

/* ---- la recherche ------------------------------------------------------- */
/* Ce qu'on tape dans la barre du haut trouve (l'audit v72, P2-7 : « MS3320 », « DR12 », « relais », « 300XC1:B5 » →
   « Rien qui corresponde ») : un REPÈRE par son nom, sa désignation, la description du retest ou son part number ; un
   CÂBLE par son numéro ; un TYPE de câble (« DR12 » : tous les câbles de ce type, dans le récapitulatif) ; une BORNE,
   « repère:borne » ou « repère borne » (la fiche du repère, son connecteur, le contact allumé). Le rang : ce qui commence
   par ce qu'on tape, puis ce qui le contient, puis ce qui le dit ailleurs (un part number, une description). */
/* LA RECHERCHE PARDONNE (v73, le technicien : « w012 », « W 012 », « w12 », « disjoncteur » ne trouvaient rien — « à
   l'atelier on écrit W012 sur les étiquettes »). On compare À PLAT : sans casse ni accent, sans espace, tiret, point,
   barre ni deux-points ; les zéros de tête d'un nombre sont facultatifs (« w12 » trouve W-012) ; le nom d'une NATURE
   (« disjoncteur », « relais », « barrettes »…) trouve les repères de cette nature, et la ligne « tous les disjoncteurs »
   ouvre leur onglet du récapitulatif ; une borne s'écrit collée (« 300xc1b5 »). Rien du tout : « Vouliez-vous dire
   W-012 ? », le plus proche par les fautes de frappe (une lettre de trop, de moins, changée ou inversée). */
const A_PLAT = new Map();   // chaque frappe relit tout le contrat : un texte se met à plat une fois
const aPlat = s => { s = String(s == null ? '' : s); let a = A_PLAT.get(s); if (a != null) return a;
  a = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s\-_.\/·:'’]+/g, ''); if (A_PLAT.size > 60000) A_PLAT.clear(); A_PLAT.set(s, a); return a; };
const sansZeros = s => s.replace(/\d+/g, d => d.replace(/^0+(?=\d)/, ''));
/* le rang d'un texte pour ce qu'on cherche (déjà à plat : `Q`, et sans ses zéros : `Qz`) — 0 commence par, 1 contient,
   2 rien. Sans ses zéros, il faut l'égalité (« w12 » = W-012) ; le début ne compte que si l'on n'a pas tapé de zéro soi-même
   (« w12 » trouve aussi W-120, « w012 » non). */
function rangAPlat(t, Q, Qz) { const a = aPlat(t); if (!a || !Q) return 2; if (a.startsWith(Q)) return 0; const z = sansZeros(a);
  if (z === Qz || (Q === Qz && z.startsWith(Qz))) return 0; return a.includes(Q) ? 1 : 2; }
// les natures que ce qu'on tape nomme (« disj », « relais », « barrettes » — trois lettres au moins) : leurs codes de repère
function naturesDe(Q) { if (Q.length < 3) return []; const out = [];
  Object.entries(CODES).forEach(([code, c]) => { const n = aPlat(c.nom); if (n.startsWith(Q) || (Q.startsWith(n) && Q.length - n.length <= 1)) out.push(code); });
  return out; }
const ONGLET_DE_NATURE = { CB: 'disjoncteurs', VT: 'barrettes', VC: 'prises' };
// la distance des fautes de frappe (une lettre de trop, de moins, changée, deux inversées), arrêtée au-delà de `max`
function distanceFrappe(a, b, max) { if (Math.abs(a.length - b.length) > max) return max + 1;
  let p2 = null, p = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) { const c = [i]; let bas = i;
    for (let j = 1; j <= b.length; j++) { const k = a[i - 1] === b[j - 1] ? 0 : 1; c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + k);
      if (p2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) c[j] = Math.min(c[j], p2[j - 2] + 1); bas = Math.min(bas, c[j]); }
    if (bas > max) return max + 1; p2 = p; p = c; }
  return p[b.length]; }
function candidats(q) { q = q.trim(); const Q = aPlat(q), Qz = sansZeros(Q); if (!Q) return [];
  const L = verite(), D = app.contrat.designations, info = new Map();
  L.forEach(l => [[l.de, l.pnDe, l.descriptionDe], [l.vers, l.pnVers, l.descriptionVers]].forEach(([n, pn, d]) => { if (!n || estRenvoi(n)) return;
    const x = info.get(n) || info.set(n, { n: 0, pns: new Set(), descs: new Set() }).get(n); x.n++; if (pn) x.pns.add(String(pn)); if (d) x.descs.add(String(d).trim()); }));
  const rang = n => rangAPlat(n, Q, Qz), contient = t => rangAPlat(t, Q, Qz) < 2;
  // une borne : « 300XC1:B5 », « 300XC1 B5 », « 300xc1b5 » — le repère exact, la borne qui commence par ce qu'on tape
  const bornes = [], m = /^(\S+?)\s*[:\s]\s*(\S*)$/.exec(q);
  let rep0 = null, bq = '';
  if (m) { rep0 = [...info.keys()].find(n => aPlat(n) === aPlat(m[1])); bq = aPlat(m[2]); }
  if (!rep0 && Q.length > 3) { const r = [...info.keys()].filter(n => Q.startsWith(aPlat(n)) && Q.length > aPlat(n).length).sort((a, b) => aPlat(b).length - aPlat(a).length)[0]; if (r) { rep0 = r; bq = Q.slice(aPlat(r).length); } }
  if (rep0) { const vues = new Set(); L.forEach(l => [['de', l.de, l.borneDe, l.vers, l.borneVers], ['vers', l.vers, l.borneVers, l.de, l.borneDe]].forEach(([c, r, b, autre, bAutre]) => {
      if (r !== rep0 || !b || vues.has(b) || !aPlat(b).startsWith(bq)) return; vues.add(b);
      bornes.push({ type: 'borne', nom: rep0, borne: String(b), l, cote: c, des: (l.cable ? l.cable + (l.type ? ' · ' + l.type : '') : cableDit(l)) + ' → ' + autre + (bAutre ? ':' + bAutre : '') }); }));
    bornes.sort((a, b) => triNaturel(a.borne, b.borne)); }
  // les repères : par le nom, la désignation, la description du retest, le part number (dit à côté de ce qui l'a trouvé) ; par la nature
  const rep = [], natures = naturesDe(Q), codeDe = n => { const r = lireRepere(n); return r && r.num ? r.code : ''; };
  info.forEach((x, n) => { const des = D.get(n) || ''; let r = rang(n), dit = des || [...x.descs][0] || '';
    if (r === 2 && natures.includes(codeDe(n))) { r = 1.5; dit = CODES[codeDe(n)].nom + (estDisjoncteur(n) && typeof calibreAuFolio === 'function' && calibreAuFolio(n) ? ' · ' + amperesCb(calibreAuFolio(n)) : '') + (dit ? ' · ' + dit : ''); }
    if (r === 2) { const d = contient(des) ? des : [...x.descs].find(contient), pn = d ? null : [...x.pns].find(contient); if (!d && !pn) return; dit = d || pn; r = d ? 2 : 3; }
    // ni désignation ni description : sa nature (« disjoncteur · 15 A »), plutôt qu'une ligne vide
    if (!dit) dit = natureDe(n) + (estDisjoncteur(n) && typeof calibreAuFolio === 'function' && calibreAuFolio(n) ? ' · ' + amperesCb(calibreAuFolio(n)) : '');
    rep.push({ type: 'repere', nom: n, des: dit, n: x.n, r }); });
  rep.sort((a, b) => a.r - b.r || b.n - a.n || triNaturel(a.nom, b.nom));
  // la nature entière : « tous les disjoncteurs », dans le récapitulatif
  const nat = natures.map(code => { const k = rep.filter(r => codeDe(r.nom) === code).length; if (!k) return null; const nom = CODES[code].nom, onglet = ONGLET_DE_NATURE[code] || 'equipements';
    return { type: 'nature', nom: k > 1 ? nom.replace(/^(\S+?)([sxz]?)(?=\s|$)/, (t, a, b) => a + (b || 's')) : nom, code, onglet, filtre: onglet === 'equipements' ? nom : '', des: 'tous, dans le récapitulatif', n: k, sansCable: true }; }).filter(Boolean).slice(0, 2);
  // les câbles par leur numéro ; un type de câble (deux lettres au moins) : la ligne « tous les DR12 », puis quelques-uns
  const fils = [], vus = new Set(), types = new Map();
  L.forEach(l => { const c = l.cable; if (c && !vus.has(c) && contient(c)) { vus.add(c); fils.push({ type: 'fil', nom: c, des: l.de + ' → ' + l.vers, r: rang(c) }); }
    if (Q.length >= 2 && l.type && contient(l.type) && l.de !== l.vers) types.set(l.type, (types.get(l.type) || 0) + 1); });
  fils.sort((a, b) => a.r - b.r || triNaturel(a.nom, b.nom));
  const ty = [...types].sort((a, b) => rang(a[0]) - rang(b[0]) || b[1] - a[1]).slice(0, 2).map(([t, n]) => ({ type: 'type', nom: t, des: 'tous les câbles de ce type, dans le récapitulatif', n }));
  // un câble trouvé EXACTEMENT (« w12 » = W-012) passe devant les repères qui ne font que le contenir
  const exact = fils.filter(f => sansZeros(aPlat(f.nom)) === Qz), autres = fils.filter(f => !exact.includes(f));
  const out = [...bornes.slice(0, 6), ...exact.slice(0, 2), ...nat, ...rep.slice(0, bornes.length ? 2 : 7), ...ty, ...autres.slice(0, 5)].slice(0, 12);
  return out.length ? out : proposition(Q, info, L); }
/* « Vouliez-vous dire… » : le repère, le câble ou le type le plus proche par les fautes de frappe — une faute pour un mot
   court, deux au-delà de six signes. */
function proposition(Q, info, L) { const Qz = sansZeros(Q), max = Qz.length <= 3 ? 0 : Qz.length <= 6 ? 1 : 2; if (!max) return [];
  let best = null; const essayer = (t, quoi) => { const d = distanceFrappe(sansZeros(aPlat(t)), Qz, best ? Math.min(max, best.d) : max); if (d <= max && (!best || d < best.d)) best = { d, t, quoi }; };
  info.forEach((x, n) => essayer(n, 'repere')); const vus = new Set(), types = new Set();
  for (const l of L) { if (l.cable && !vus.has(l.cable)) { vus.add(l.cable); essayer(l.cable, 'fil'); } if (l.type) types.add(l.type); if (best && best.d === 1 && vus.size > 5000) break; }
  types.forEach(t => essayer(t, 'type'));
  if (!best) return [];
  const l = best.quoi === 'fil' ? L.find(x => x.cable === best.t) : null;
  return [{ type: best.quoi, nom: best.t, propose: true, des: best.quoi === 'fil' ? l.de + ' → ' + l.vers : best.quoi === 'type' ? 'tous les câbles de ce type' : (app.contrat.designations.get(best.t) || natureDe(best.t)) }]; }
let qSel = 0, qCands = [];
const GENRE_CANDIDAT = { repere: 'repère', fil: 'câble', borne: 'borne', type: 'type', nature: 'nature' };
/* Les lignes de la liste ne prennent pas Tab (v74) : ↑ ↓ les parcourent depuis le champ (`aria-activedescendant`), un clic
   les prend ; Tab quitte la recherche — il menait à une ligne que la recherche, fermée en perdant le clavier, cachait aussitôt. */
function montrerCandidats() { const box = $('q-liste'), q = $('q').value; qCands = candidats(q);
  if (!q.trim()) { box.hidden = true; return; } box.hidden = false; qSel = Math.min(qSel, Math.max(0, qCands.length - 1));
  const propose = qCands.length && qCands[0].propose;
  box.innerHTML = (propose ? `<div class="q-rien q-rien-tete">Rien qui s’écrive « ${esc(q.trim())} ».</div>` : '')
    + (qCands.length ? qCands.map((c, i) => `<button class="q-item${i === qSel ? ' on' : ''}${c.propose ? ' q-propose' : ''}" role="option" id="q-opt-${i}" data-i="${i}" tabindex="-1" aria-selected="${i === qSel}">
      <span class="genre">${c.propose ? 'Vouliez-vous dire' : GENRE_CANDIDAT[c.type] || c.type}</span><span class="nom">${esc(c.type === 'borne' ? c.nom + ':' + c.borne : c.nom)}${c.propose ? ' ?' : ''}</span><span class="des${c.type === 'fil' || c.type === 'borne' ? ' mono' : ''}">${esc(c.des)}</span>${c.n ? `<span class="cpt">${esc(c.sansCable ? String(c.n) : pluriel(c.n, 'câble'))}</span>` : ''}</button>`).join('')
    : '<div class="q-rien">Rien qui corresponde — un repère, un câble, un part number, un type, une nature (« disjoncteur »), une description, ou « repère:borne ».</div>');
  $('q').setAttribute('aria-activedescendant', qCands.length ? 'q-opt-' + qSel : ''); }
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
// (Ctrl+K, ⌘K : la touche globale du chrome — « tout relier », A2 — appelle `ouvrirPalette` ; ouverte, la palette la reprend pour se fermer)

/* ---- LA PALETTE (Ctrl+K) -------------------------------------------------
   v73 (l'ingénieur, n° 10 : « le clavier n'est pas celui d'un outil pro ; rien pour “export”, “hypo”, “pdf” ») : une
   palette qui cherche À LA FOIS les ACTIONS — chaque ligne du menu ⋮ (lue sur le menu même : son mot, sa touche, son
   geste), les gestes du plan qui ont une touche (les repères, le problème suivant, la feuille entière, 100 %…), les
   folios — et les OBJETS du plan (la liste de la recherche, qui pardonne). « Actions » en tête quand le mot y répond ;
   « À reprendre » : les gestes concrets du contrôle (« Tout régler : 102CB1 en 15 A… », 08-controle `gestesDuPoint`). Un
   verre de nuit au centre, qui tombe en 200 ms ; chaque action dit sa touche : la palette l'enseigne en passant. ↑ ↓,
   Entrée, Échap (le clavier revient d'où il venait), Ctrl+K encore. Ctrl+K l'ouvre depuis la touche globale (A2). */
const PALETTE = { el: null, sel: 0, lignes: [], avant: null };
// ce qu'on tape aussi pour trouver une action (ses mots d'atelier, sans accent)
const MOTS_DES_ACTIONS = { dossierpdf: 'pdf dossier imprimer tous folios garde', retestcorrige: 'excel xlsx installation corrigee retest modifications envoyer livrable', svg: 'image vectorielle dessin',
  png: 'image capture', imprimer: 'papier a3 imprimante', hypotheses: 'hypo reglages simulation ambiante longueur marge', normes: 'tables sources', bible: 'barrettes modules references',
  nomenclature: 'bom pieces commander liste magasin', nomenclaturecsv: 'bom csv pieces', recapitulatif: 'tableau liaisons tableaux recap', fichiers: 'base installations retests contrats deposer',
  bibliotheque: 'accueil installations plans', ouvrir: 'fichier importer charger installation retest excel', coller: 'presse-papiers coller', exemple: 'demo demonstration', cartouche: 'titre auteur date indice',
  raccourcis: 'clavier touches aide', suivi: 'csv barrettes prises connecteurs', dejafait: 'comparer base deja fait', visio: 'vsdx microsoft' };
const ACTIONS_D_ABORD = ['retestcorrige', 'dossierpdf', 'recapitulatif', 'index', 'suivant', 'hypotheses', 'nomenclature', 'raccourcis', 'comprendre'];
function actionsDeLaPalette() { const xs = [], vu = new Set();
  document.querySelectorAll('#menu [role="menuitem"][data-act]').forEach(b => { const act = b.dataset.act; if (vu.has(act) || !MENU.actions[act] || b.hidden) return; vu.add(act);
    const l = b.querySelector('.menu-l'), mot = (l ? [...l.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('') : b.textContent).trim();
    const sous = l && l.querySelector('small') ? l.querySelector('small').textContent.trim() : '', p = b.closest('.menu-panneau'), ou = p && p.id === 'mp-exporter' ? 'Exporter' : p && p.id === 'mp-plus' ? 'Plus' : '';
    const r = b.querySelector('.raccourci'), ico = b.querySelector('svg.ico:not(.menu-chevron)');
    xs.push({ act, mot, des: sous, ou, touche: r ? r.textContent.trim() : '', ico: ico ? ico.innerHTML : '', mots: MOTS_DES_ACTIONS[act] || '', eteint: !!b.disabled, faire: () => MENU.actions[act]() }); });
  // les icônes des gestes du plan : celles de leurs boutons (le rail, la barre du bas), lues sur eux
  const plan = verite().length > 0, P = plans(), I = id => { const b = $(id), g = b && b.querySelector('svg'); return g ? g.innerHTML : ''; };
  const en = (act, mot, touche, faire, o) => xs.push({ act, mot, touche, faire, des: '', ou: '', ico: '', mots: '', ...(o || {}) });
  if (plan) {
    en('index', 'Repères et problèmes', 'R', basculerIndex, { mots: 'index liste reperes problemes', des: typeof compteProblemes === 'function' ? compteProblemes().mot : '', ico: I('btnIndex') });
    if (typeof problemeSuivant === 'function') en('suivant', 'Le problème suivant', 'P', () => problemeSuivant(1), { mots: 'erreur defaut probleme suivant reprendre', ico: ICONE_OBJET.geste });
    en('page', 'Le récapitulatif en page', 'Maj+B', () => ouvrirBase('page'), { mots: 'tableau page entiere recap', ico: I('btnBase') });
    en('feuille', 'Voir la feuille entière', '0', () => { VUE.cadrage = 'feuille'; ajuster(true); }, { mots: 'cadrer ajuster cartouche page', ico: I('zfit') });
    en('dessin', 'Voir le dessin, au plus près', '0', () => { VUE.cadrage = 'dessin'; ajuster(true); }, { mots: 'cadrer ajuster zoom', ico: I('zfit') });
    en('cent', 'Zoomer à 100 %', '1', () => zoomerA(1), { mots: 'zoom lire taille reelle', ico: I('zin') }); en('deuxcents', 'Zoomer à 200 %', '2', () => zoomerA(2), { mots: 'zoom loupe', ico: I('zin') });
    en('liaison', 'Ajouter une liaison', '', () => nouvelleLiaison(), { mots: 'nouveau cable liaison', ico: I('btnLiaison') });
    if (P.length > 1) { en('folio+', 'Folio suivant', '→', () => allerAuFolio(1), { mots: 'folio page suivant', ico: I('fo-next') }); en('folio-', 'Folio précédent', '←', () => allerAuFolio(-1), { mots: 'folio page precedent', ico: I('fo-prev') });
      P.forEach((p, i) => en('folio:' + p, 'Folio ' + p, '', () => allerAuPlan(p), { des: pluriel(liaisonsDe(p).length, 'câble'), mots: 'folio f' + (i + 1) + ' page ' + (i + 1) })); }
    const cle = cleCourante(); if (cle && app.retouches.has(cle)) en('auto', 'Revenir au dessin automatique', '', revenirAutomatique, { mots: 'retouche moteur annuler dessin' }); }
  if (app.hist && app.hist.length) en('defaire', 'Défaire : ' + app.hist[app.hist.length - 1].quoi, 'Ctrl+Z', defaire, { mots: 'annuler defaire retour', ico: I('btnUndo') });
  const aRefaire = typeof pileRefaire === 'function' ? pileRefaire() : [];
  if (aRefaire.length && typeof refaireEtDire === 'function') en('refaire', 'Refaire : ' + aRefaire[aRefaire.length - 1].quoi, 'Ctrl+Y', refaireEtDire, { mots: 'refaire retablir', ico: I('btnRedo') });
  /* « COMMENT VOLTA RÉFLÉCHIT » (v74, la page du lot N, `ficheComprendre`) : la palette l'offre dès qu'elle existe, avec ou
     sans plan. Si le menu la porte déjà (une ligne de ⋮ › Plus), c'est elle qu'on garde — sous la clé `comprendre`, pour
     qu'elle soit des premières actions —, sinon la palette l'appelle elle-même. */
  const comprendre = xs.find(a => /comment volta r[ée]fl[ée]chit/i.test(a.mot)), motsComprendre = 'comprendre comment ca marche pourquoi aide explication novice cuisinier fonctionnement volta reflechit';
  if (comprendre) Object.assign(comprendre, { act: 'comprendre', mots: (comprendre.mots + ' ' + motsComprendre).trim(), ico: comprendre.ico || ICONE_OBJET.comprendre });
  else if (typeof ficheComprendre === 'function') en('comprendre', 'Comment Volta réfléchit', '', () => ficheComprendre(), { des: 'ce que Volta lit, d’où viennent ses pièces, comment il choisit', mots: motsComprendre, ico: ICONE_OBJET.comprendre });
  return xs; }
// les gestes concrets du contrôle : un par point, le principal (« Tout régler… », « Unifier sur… », « La poser »)
function gestesDeLaPalette() { if (typeof gestesDuPoint !== 'function' || !CONTROLE || !CONTROLE.items) return []; const out = [], vus = new Set();
  CONTROLE.items.forEach(x => { let gs = []; try { gs = gestesDuPoint(x) || []; } catch (_) { } const g = gs.find(y => y.principal) || null; if (!g || vus.has(g.mot)) return; vus.add(g.mot);
    out.push({ act: 'geste', mot: g.mot, des: x.nom ? x.nom + (x.texte ? ' — ' + x.texte : '') : (x.texte || ''), touche: '', ico: '', mots: aPlat(x.nom || '') + ' regler corriger probleme', faire: g.faire, niveau: x.niveau }); });
  return out.sort((a, b) => (a.niveau === 'ko' ? 0 : 1) - (b.niveau === 'ko' ? 0 : 1)); }
// le rang d'une action pour ce qu'on tape (chaque mot doit y répondre) : son mot d'abord, puis ses mots d'atelier, sa ligne
function rangAction(a, termes) { let r = 0; const motsDuMot = aPlatMots(a.mot), mots = aPlatMots(a.mots + ' ' + a.ou + ' ' + (a.act || '')), des = aPlat(a.des);
  for (const t of termes) { if (motsDuMot.some(w => w.startsWith(t))) continue; if (aPlat(a.mot).includes(t)) { r += 1; continue; }
    if (mots.some(w => w.startsWith(t))) { r += 2; continue; } if (t.length >= 3 && des.includes(t)) { r += 3; continue; } return null; }
  return r; }
const aPlatMots = s => String(s || '').split(/[\s'’,·()›:—-]+/).map(aPlat).filter(Boolean);
function lignesDeLaPalette(q) { const termes = aPlatMots(q), out = [];
  const A = actionsDeLaPalette(), G = gestesDeLaPalette(), groupe = (titre, xs) => { if (xs.length) out.push({ titre }, ...xs); };
  if (!termes.length) { groupe('Actions', ACTIONS_D_ABORD.map(k => A.find(a => a.act === k)).filter(Boolean));
    groupe('À reprendre', G.slice(0, 4)); return out; }
  const choix = xs => xs.map(a => ({ a, r: rangAction(a, termes) })).filter(x => x.r != null).sort((x, y) => x.r - y.r).map(x => x.a);   // à rang égal, l'ordre du menu
  const acts = choix(A).slice(0, 7), gestes = choix(G).slice(0, 4), objets = verite().length ? candidats(q).map(c => ({ objet: c })).slice(0, 7) : [];
  const fort = acts.length && rangAction(acts[0], termes) <= 1;
  if (fort || !objets.length) { groupe('Actions', acts); groupe('À reprendre', gestes); groupe('Sur le plan', objets); }
  else { groupe('Sur le plan', objets); groupe('Actions', acts); groupe('À reprendre', gestes); }
  return out; }
const paletteOuverte = () => !!PALETTE.el && !PALETTE.el.hidden;
function construirePalette() { if (PALETTE.el) return PALETTE.el;
  const el = document.createElement('div'); el.id = 'palette'; el.className = 'palette'; el.hidden = true;
  el.innerHTML = `<div class="pa-boite menu-verre" role="dialog" aria-modal="true" aria-label="Palette : une action, un repère, un câble">`
    + `<div class="pa-tete"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>`
    + `<input id="pa-q" type="text" role="combobox" aria-expanded="true" aria-controls="pa-liste" aria-autocomplete="list" placeholder="Une action, un repère, un câble… (pdf, hypo, w012, disjoncteur)" aria-label="Chercher une action, un repère ou un câble" autocomplete="off" spellcheck="false">`
    + `<kbd class="pa-echap" aria-hidden="true">Échap</kbd></div><div class="pa-liste" id="pa-liste" role="listbox" aria-label="Ce que la palette trouve"></div>`
    + `<div class="pa-pied" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> choisir</span><span><kbd>Entrée</kbd> faire</span><span><kbd>Ctrl</kbd><kbd>K</kbd> ou <kbd>Échap</kbd> fermer</span></div></div>`;
  document.body.appendChild(el); PALETTE.el = el;
  const q = el.querySelector('#pa-q'), liste = el.querySelector('#pa-liste');
  q.addEventListener('input', () => { PALETTE.sel = 0; rendrePalette(); });
  q.addEventListener('keydown', e => { const n = PALETTE.lignes.length;
    const pas = d => { if (!n) return; PALETTE.sel = (PALETTE.sel + d + n) % n; marquerPalette(true); };
    if (e.key === 'ArrowDown') { e.preventDefault(); pas(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); pas(-1); }
    else if (e.key === 'Home' && n && !q.value) { e.preventDefault(); PALETTE.sel = 0; marquerPalette(true); } else if (e.key === 'End' && n && !q.value) { e.preventDefault(); PALETTE.sel = n - 1; marquerPalette(true); }
    else if (e.key === 'Enter') { e.preventDefault(); faireDeLaPalette(PALETTE.sel); }
    else if (e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && (e.key || '').toLowerCase() === 'k')) { e.preventDefault(); e.stopPropagation(); fermerPalette(); }
    else if (e.key === 'Tab') { e.preventDefault(); pas(e.shiftKey ? -1 : 1); } });   // le clavier reste dans la palette
  liste.addEventListener('pointerdown', e => e.preventDefault());   // le champ garde le clavier
  // une ligne longue (le pourquoi d'un point à reprendre) tient sur deux lignes ; au-delà, sa bulle la donne entière (08-fiche)
  if (typeof lierBulles === 'function') lierBulles(liste);
  liste.addEventListener('pointermove', e => { const b = e.target.closest('[data-i]'); if (b && +b.dataset.i !== PALETTE.sel) { PALETTE.sel = +b.dataset.i; marquerPalette(false); } });
  liste.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) faireDeLaPalette(+b.dataset.i); });
  el.addEventListener('pointerdown', e => { if (!e.target.closest('.pa-boite')) { e.preventDefault(); fermerPalette(); } });
  return el; }
function ouvrirPalette() { const el = construirePalette(); if (rechercheOuverte()) fermerRecherche(); if (typeof fermerMenu === 'function') fermerMenu();
  PALETTE.avant = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
  el.hidden = false; document.body.classList.add('palette-ouverte'); const q = el.querySelector('#pa-q'); q.value = ''; PALETTE.sel = 0; rendrePalette();
  if (!mouvementReduit()) el.querySelector('.pa-boite').animate([{ opacity: 0, transform: 'translateY(-6px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.32,.72,0,1)' });
  try { q.focus({ preventScroll: true }); } catch (_) { q.focus(); } }
function fermerPalette(rendre) { const el = PALETTE.el; if (!el || el.hidden) return; el.hidden = true; document.body.classList.remove('palette-ouverte');
  const a = PALETTE.avant; PALETTE.avant = null; if (rendre !== false && a && a.isConnected && a.focus) try { a.focus({ preventScroll: true }); } catch (_) { } else if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }
const ICONE_OBJET = { repere: '<rect x="5" y="6" width="14" height="12" rx="1.5"/><path d="M2.5 10h2.5M2.5 14h2.5M19 10h2.5M19 14h2.5"/>', fil: '<path d="M3 16c4 0 4-8 9-8s5 8 9 8"/>', borne: '<circle cx="12" cy="12" r="3.2"/><path d="M3 12h5.8M15.2 12H21"/>',
  type: '<path d="M4 7h16M4 12h16M4 17h10"/>', nature: '<path d="M4 6h16v4H4zM4 14h16v4H4z"/>', action: '<path d="m13 3-7 10h5l-1 8 7-10h-5z"/>', geste: '<path d="M4.5 12h13M13 6.5l5.5 5.5-5.5 5.5"/>', folio: '<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v3h3"/>',
  comprendre: '<circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.6a2.4 2.4 0 1 1 3.3 2.2c-.6.3-1 .8-1 1.5v.6M12 16.6v.3"/>' };
function rendrePalette() { const el = PALETTE.el; if (!el) return; const q = el.querySelector('#pa-q').value, liste = el.querySelector('#pa-liste');
  const L = lignesDeLaPalette(q); PALETTE.lignes = L.filter(x => !x.titre); PALETTE.sel = Math.min(PALETTE.sel, Math.max(0, PALETTE.lignes.length - 1));
  let i = 0;
  liste.innerHTML = L.length ? L.map(x => { if (x.titre) return `<div class="pa-groupe" role="presentation">${esc(x.titre)}</div>`; const k = i++;
      if (x.objet) { const c = x.objet; return `<div class="pa-l" role="option" id="pa-o-${k}" data-i="${k}" aria-selected="false"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONE_OBJET[c.type] || ICONE_OBJET.repere}</svg>`
        + `<span class="pa-mot"><b class="pa-id">${esc(c.type === 'borne' ? c.nom + ':' + c.borne : c.nom)}</b><small>${c.propose ? 'Vouliez-vous dire ? · ' : ''}${esc([GENRE_CANDIDAT[c.type] || c.type, c.des].filter(Boolean).join(' · '))}</small></span>`
        + `${c.n ? `<span class="pa-cpt">${esc(c.sansCable ? String(c.n) : pluriel(c.n, 'câble'))}</span>` : ''}</div>`; }
      const a = x, ico = a.ico || ICONE_OBJET[a.act === 'geste' ? 'geste' : /^folio:/.test(a.act) ? 'folio' : 'action'];
      return `<div class="pa-l${a.eteint ? ' eteint' : ''}${a.act === 'geste' ? ' pa-geste ' + (a.niveau || '') : ''}" role="option" id="pa-o-${k}" data-i="${k}" aria-selected="false"${a.eteint ? ' aria-disabled="true"' : ''}><svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ico}</svg>`
        + `<span class="pa-mot">${a.ou ? `<i class="pa-ou">${esc(a.ou)} ›</i> ` : ''}${esc(a.mot)}${a.des ? `<small${a.des.length > 70 ? ` data-bulle="${escA(a.des)}"` : ''}>${esc(a.des)}</small>` : ''}</span>`
        + (a.touche ? `<span class="pa-touche">${a.touche.split('+').map(t => `<kbd>${esc(t)}</kbd>`).join('')}</span>` : '') + '</div>'; }).join('')
    : `<div class="pa-rien">Rien pour « ${esc(q.trim())} » — une action (« pdf », « hypo », « exporter »), un repère, un câble, un type, une nature.</div>`;
  marquerPalette(true); }
function marquerPalette(defiler) { const el = PALETTE.el; if (!el) return; const q = el.querySelector('#pa-q');
  el.querySelectorAll('.pa-l').forEach(b => { const on = +b.dataset.i === PALETTE.sel; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); if (on && defiler) b.scrollIntoView({ block: 'nearest' }); });
  q.setAttribute('aria-activedescendant', PALETTE.lignes.length ? 'pa-o-' + PALETTE.sel : ''); }
function faireDeLaPalette(i) { const x = PALETTE.lignes[i]; if (!x || x.eteint) return; fermerPalette(false);
  if (x.objet) { aller(x.objet); return; }
  try { x.faire(); } catch (err) { dire('Ce geste n’a pas abouti : ' + ((err && err.message) || err), true); } }

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
const triNaturel = (a, b) => COLLATEUR_FR.compare(String(a), String(b));
const pluriel = (n, mot) => n + ' ' + mot + (n > 1 && !/[sxz]$/.test(mot) ? 's' : '');   // « 2 harness », pas « harnesss »
/* Le même, le nombre lié à son mot par une espace insécable : dans un texte qui coule (un bilan, l'état d'un document),
   jamais le chiffre en bout de ligne et son mot dessous. `pluriel` garde l'espace simple : la fiche en retire le nombre
   (« 3 potentiels » → « potentiels », 08-fiche). */
const INSECABLE = '\u00a0', plurielLie = (n, mot) => pluriel(n, mot).replace(' ', INSECABLE);
/* La fiche se refait après chaque correction et quand la place change (fenêtre, poignée) — jamais sous les doigts de
   qui y ÉCRIT : quand un champ de la fiche a le focus, elle se refait EN PLACE autour de lui (08 bis,
   `rafraichirFicheEnPlace` : l'en-tête, les problèmes, les autres sections suivent ; le champ et sa saisie restent).
   Un bouton de la fiche qu'on vient de presser (une puce, une variante) a le focus lui aussi : la fiche se refait
   quand même, et `rendreFiche` lui rend le focus. */
function rafraichirCarte() { const box = $('ba-equip'), a = document.activeElement; if ($('inspecteur').hidden) return;
  if (box.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) { if (app.cible && typeof rafraichirFicheEnPlace === 'function') rafraichirFicheEnPlace(); return; }
  rendreFiche(); }
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
    + (hors ? ` · <span class="ko">${hors} hors référence</span>` : '') + (b.jaugeFine != null ? ` · gauge ${jaugeTexte(b)}` : '');
  return `<div class="bar-ref"><span class="ref">${esc(R.ref)}</span><span class="dou">${R.dou}</span></div><div class="phy-compte">${compte}</div>` + ligneNorme(P)
    + dessinPhysique(nom, P, largeurCarte(), { forme: coupure ? 'coupure' : 'reglette' })
    + `<div class="legende"><span class="l-fleche"></span>ce qui arrive (amont) au-dessus, ce qui repart (aval) en dessous · <span class="l-trou occ"></span>trou occupé · <span class="l-trou"></span>trou libre`
    + (coupure ? '' : ' · <span class="l-peigne"></span>paquet ponté') + ' · <span class="l-libre"></span>libre</div>' + verdictsNorme(P, coupure)
    + carteSimulation(nom, P, simulerBornier(P, app.norme, app.simu)) + choixReference(nom, I, R); }
/* Ce que la norme sait de cette famille, en une ligne — ou qu'elle n'en sait rien. */
function ligneNorme(P) { const F = P.famille;
  if (!F) return `<div class="bar-norme sans">aucune norme ne connaît ${P.entree && P.entree.famille ? 'la famille <b>' + esc(P.entree.famille) + '</b>' : 'cette référence'} — un trou par côté, rien n’est jugé</div>`;
  const faits = [F.pas != null ? `pas ${nombre(F.pas)} mm` : '', F.jaugeMin != null ? `${jaugeEntree(F)} AWG` : '', F.intensite != null ? `${nombre(F.intensite)} A` : '', F.resistance != null ? `${nombre(F.resistance)} mΩ` : '',
    pluriel(F.filsParCote, 'câble') + ' par côté'].filter(Boolean);
  return `<div class="bar-norme${F.exemple ? ' exemple' : ''}">norme <b>${esc(F.norme)}</b> · ${faits.join(' · ')}${F.exemple ? ' · <span class="ex">sans valeur normative</span>' : ''}</div>`; }
/* Ce que la règle de remplissage de la norme trouve à redire. */
function verdictsNorme(P, coupure) { if (!P.famille) return '';
  const F = P.famille, regle = [F.ordre === 'croissant' ? 'dans l’ordre' : '', F.paquets === 'contigus' && !coupure ? 'paquets contigus' : '', F.reserves.length ? 'réservé' + (F.reserves.length > 1 ? 's' : '') + ' : ' + F.reserves.join(', ') : '', F.masse ? 'une masse par paquet' : ''].filter(Boolean);
  return `<div class="verdicts"><div class="regle">règle de remplissage : ${regle.length ? regle.join(' · ') : 'libre'} — ${P.verdicts.length ? pluriel(P.verdicts.length, 'remarque') : 'rien à redire'}</div>`
    + P.verdicts.map(v => `<div class="verdict-l ${v.niveau}" data-bornes="${escA(v.bornes.join(' '))}">${esc(v.texte)}</div>`).join('') + '</div>'; }
/* La SIMULATION : le bandeau des hypothèses (dites, modifiables), puis fil
   par fil ce que la norme en dit, la formule et un calcul écrit en entier. */
const MOTS_VERDICT = { ok: 'ok', jauge: 'gauge hors plage', fil: 'dépasse le câble', contact: 'dépasse le contact', chute: 'chute trop forte', inconnu: 'câble inconnu de la norme', reactance: 'X à saisir (≥ ' + GROS_CABLE + ' mm² de cuivre)' };
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
  const nb = (id, k, lib, unite, pas, groupe, sert, o) => ({ genre: 'nombre', id, k, lib, unite, pas, groupe, sert, min: o && o.negatif ? null : 0, titre: (o && o.titre) || '', vide: (o && o.vide) || '' });
  // les conditions de déclassement, une case par condition, avec le facteur que la table donne pour ce faisceau (le point FAA le plus proche, l'altitude interpolée)
  const noms = [...new Set(N.declassements.map(d => d.condition))], detail = detailDeclassement(N, noms, { fils: ctx.fils, charge: H.charge, altitude: H.altitude });
  const conds = noms.map(c => { const d = detail.find(x => x.condition === c), p = d && d.point;
    const titre = p ? (p.fils != null ? `le point ${p.fils} câbles à ${nombre(p.charge != null ? p.charge : 100)} % (${p.note || 'table'})` : p.altitude != null ? `${nombre(p.altitude)} ft (${p.note || 'table'})` : p.note || '') : '';
    const sert = c === 'faisceau' ? 'Des câbles en faisceau admettent moins qu’un câble seul (AC 43.13-1B, fig. 11-5) : le facteur dépend du nombre de câbles et de leur charge.' : c === 'altitude' ? 'L’air raréfié refroidit moins (AC 43.13-1B, fig. 11-6) : le facteur dépend de l’altitude.' : 'Un déclassement de la table Déclassement de la norme, sur ce qu’un câble admet.';
    return { genre: 'condition', c, lib: c, facteur: d ? d.facteur : 1, titre, groupe: 'declassement', sert }; });
  const faisceau = N.declassements.some(d => d.fils != null) && H.conditions.includes('faisceau'), altitude = N.declassements.some(d => d.altitude != null) && H.conditions.includes('altitude');
  const TABLEAU = 'L’ambiante du tableau de disjoncteurs : seules les courbes de disjonction qui l’encadrent jugent';
  return [
    nb('si-L', 'longueur', 'longueur', 'm', '0.5', 'fil', 'La longueur d’un câble que l’installation ne mesure pas : la chute sur ce câble, et la chute en ligne depuis le disjoncteur, se calculent dessus.'),
    nb('si-I', 'courant', 'courant', 'A', '0.5', 'fil', 'Le courant d’un câble qu’aucun disjoncteur n’alimente, et celui de la simulation d’une barrette ou d’une prise.'),
    nb('si-U', 'tension', 'tension', 'V', '1', 'fil', 'La tension du réseau : le pourcentage de chute, et la ligne de la table Réseau quand la chute admise de la règle du lecteur est vidée.'),
    N.fils.some(f => f.tr != null) ? nb('si-T', 'ambiante', 'ambiante', '°C', '5', 'temperature', 'L’ambiante autour des câbles : l’EN 2853 déclasse ce qu’un câble admet (note 2), et sa tenue en température se juge dessus (+ 40 °C au conducteur).') : null,
    nb('si-Tc', 'tconducteur', 'conducteur', '°C', '5', 'temperature', 'La température du conducteur, pour sa résistance : 20 °C, la convention de la base des câbles ; 135 °C, le cas de l’EN 2853.'),
    { genre: 'choix', id: 'si-Ret', k: 'retour', lib: 'retour', aria: 'Retour du courant', options: Object.entries(RETOURS), valeur: H.retour || 'structure', groupe: 'fil', sert: 'Par la structure, l’aller seul compte (AC 43.13-1B : du bus à la masse de l’équipement) ; par un câble identique, la résistance double — le câble et ses contacts, deux fois.' },
    { genre: 'choix', id: 'si-R', k: 'regime', lib: 'régime', aria: 'Régime du réseau', options: Object.entries(REGIMES), valeur: regime, groupe: 'reseau', sert: 'Continu, monophasé ou triphasé : la formule de la chute, et la chute admise — en triphasé, la chute composée (√3 ×) se compare aux 4 V de la règle du lecteur.' },
    regime !== 'continu' ? { genre: 'choix', id: 'si-C', k: 'cosphi', lib: 'cos φ', aria: 'cos φ', options: [['0.8', '0,8 · régime permanent'], ['0.35', '0,35 · démarrage moteur']], valeur: Math.abs(H.cosphi - 0.35) < 1e-9 ? '0.35' : Math.abs(H.cosphi - 0.8) < 1e-9 ? '0.8' : '', groupe: 'reseau', sert: '0,8 en régime permanent, 0,35 au démarrage d’un moteur.' } : null,
    regime !== 'continu' ? nb('si-X', 'reactance', 'X', 'mΩ/m', '0.01', 'reseau', 'La réactance linéique à 400 Hz : négligée sous ' + GROS_CABLE + ' mm² de cuivre, à saisir au-delà (la simulation l’estime, sans jamais la prendre d’office).') : null,
    ...conds,
    faisceau ? nb('si-P', 'charge', 'charge du faisceau', '%', '10', 'declassement', 'La part de ce que les câbles du faisceau admettent ensemble qui circule vraiment : le point de la figure 11-5.') : null,
    altitude ? nb('si-A', 'altitude', 'altitude', 'ft', '5000', 'declassement', 'L’altitude de vol, pour le déclassement de la figure 11-6.') : null,
    N.disjoncteurs && N.disjoncteurs.length ? nb('si-Tmin', 'tableauMin', 'tableau min', '°C', '5', 'tableau', 'L’ambiante la plus basse du tableau de disjoncteurs : la courbe de disjonction juste au-dessous (la lente) juge la protection du câble.', { negatif: true, titre: TABLEAU }) : null,
    N.disjoncteurs && N.disjoncteurs.length ? nb('si-Tmax', 'tableauMax', 'tableau max', '°C', '5', 'tableau', 'L’ambiante la plus haute du tableau : la courbe juste au-dessus (la rapide) juge le déclenchement intempestif.', { negatif: true, titre: TABLEAU }) : null,
    ...(ctx.fiche ? hypothesesR2(N, H, nb) : [])
  ].filter(Boolean); }
/* Les hypothèses de la recherche R2 (09-barrettes, HYPOTHESES), pour la fiche : la chute en ligne (la température des
   conducteurs, la chute propre du disjoncteur), la fréquence du réseau, et le choix du meilleur calibre (les deux marges,
   le préchauffage, les calibres qu'on s'impose). */
function hypothesesR2(N, H, nb) { const dj = !!(N.disjoncteurs && N.disjoncteurs.length), reseau = U => { const r = chuteAdmise(N, U, U === 115 ? 'tri' : 'continu', { chuteMono: null, chuteTri: null }); return r ? nombre(r.chuteMax) + ' V' : '—'; };
  return [
    // la chute admise : la règle du lecteur (octobre 2026), en hypothèse ; vidée, la table Réseau de la norme reprend
    nb('si-Cm', 'chuteMono', 'chute admise, continu et monophasé', 'V', '0.5', 'chute', 'La règle du lecteur (octobre 2026) : « 2 V au maximum en monophasé » — le continu (le 28 V) aussi, et une pointe n’a pas droit au double. Vide : la table Réseau de la norme reprend (' + reseau(28) + ' sous 28 V ; l’AC 43.13-1B double pour une pointe de 2 min au plus).', { vide: 'table Réseau' }),
    nb('si-Ct', 'chuteTri', 'chute admise, triphasé', 'V', '0.5', 'chute', 'La règle du lecteur (octobre 2026) : « 4 V en triphasé », contre la chute composée (entre deux phases). Vide : la ligne de la tension composée de la table Réseau reprend (' + reseau(115) + ' entre phases sous 115 V).', { vide: 'table Réseau' }),
    { genre: 'choix', id: 'si-Cc', k: 'chuteConducteur', lib: 'température des conducteurs', aria: 'Température des conducteurs pour la chute', options: [['estimee', 'estimée sous le courant'], ['fixe', 'fixe : « conducteur » (20 °C)']], valeur: H.chuteConducteur === 'fixe' ? 'fixe' : 'estimee', groupe: 'chute',
      sert: 'Estimée (par défaut) : chaque câble à la température que son courant lui donne, ambiante + 40 °C × (I / I admise)², AC 43.13-1B § 11-66 d(6). Fixe : à l’hypothèse « conducteur », 20 °C comme l’Excel et les fiches constructeur.' },
    dj ? { genre: 'case', id: 'si-Cd', k: 'chuteDisjoncteur', lib: 'compter la chute du disjoncteur', groupe: 'chute',
      sert: 'Cochée (par défaut) : la chute du disjoncteur entre dans la chute en ligne — celle de votre table (« Du max », comptée entière), sinon celle de sa famille au prorata I / In. La génération est négligée : elle garantit 28 V en sortie des panneaux de disjoncteurs (votre note).' } : null,
    nb('si-F', 'frequence', 'fréquence', 'Hz', '10', 'reseau', 'En alternatif, la réactance saisie (à 400 Hz) monte avec la fréquence (X = 2πfL) : 400 Hz par défaut, un réseau à fréquence fixe ; 800 en fréquence variable (MIL-STD-704F, 360 à 800 Hz). Sans effet en continu.'),
    dj ? { genre: 'case', id: 'si-Ca', k: 'calibreAuto', lib: 'Volta écrit lui-même le calibre qui passe', groupe: 'tableau',
      sert: 'Cochée (par défaut — le lecteur, v74 : « dès que ça touche la courbe, tu mets directement le calibre qui marche ») : un calibre du fichier qui touche la courbe ou déclenche est remplacé par le plus petit qui passe, et ses câbles grossis. Décochée : Volta le propose seulement.' } : null,
    dj ? nb('si-M', 'marge', 'marge de courant', '%', '5', 'tableau', 'Le meilleur calibre tient chaque courant du profil majoré de ce pourcentage : 10 % par défaut, pour un profil estimé (R2 règle 13) ; 0 % pour un profil qui sort du bilan électrique au pire cas (NASA TM-102179).') : null,
    dj ? nb('si-Mt', 'margeTemps', 'marge de temps', '%', '5', 'tableau', 'Ce qu’une pointe peut consommer, au plus, du temps de déclenchement du meilleur calibre : 75 % par défaut (R2 § 3.1, étape 2).') : null,
    dj ? nb('si-Pc', 'prechauffage', 'préchauffage', '', '0.1', 'tableau', 'Un état ajouté au profil survient en service, le bilame chaud : son temps de déclenchement se divise par ce facteur. 1,6 par défaut, la borne basse de la feuille MS3320N (table VII : 1,6 à 3,7) ; 1 l’ôte.') : null,
    dj ? { genre: 'liste', id: 'si-Cp', k: 'calibresPreferes', lib: 'calibres préférés', unite: 'A', groupe: 'tableau',
      sert: 'Les calibres que vous posez, dans le catalogue de la famille du part number : 1 3 5 7,5 10 15 20 25 par défaut (au-delà de 25 A, la famille garde les siens) ; le meilleur se choisit parmi eux. Vide : tout le catalogue de la famille.' } : null]; }
/* Un champ d'hypothèse, tel que le bandeau d'une carte le montre (compact) ; la fiche l'habille d'une ligne qui dit à
   quoi il sert. Les identifiants (si-L, si-I…) sont ceux que `lierHypotheses` lit. */
function champHypotheseHtml(c, H) {
  if (c.genre === 'condition') return `<label class="hyp-c" title="${escA(c.titre)}"><input type="checkbox" data-cond="${escA(c.c)}"${H.conditions.includes(c.c) ? ' checked' : ''}><span>${esc(c.c)} ×${nombre(Math.round(c.facteur * 100) / 100)}</span></label>`;
  if (c.genre === 'case') return `<label class="hyp-c"><input type="checkbox" id="${c.id}"${H[c.k] !== false ? ' checked' : ''} aria-label="${escA(c.lib + ' (hypothèse)')}"><span>${esc(c.lib)}</span></label>`;
  if (c.genre === 'liste') return `<label class="hyp-n hyp-liste"><span>${esc(c.lib)}</span><input id="${c.id}" type="text" inputmode="decimal" value="${escA((H[c.k] || []).map(nombre).join(' '))}" placeholder="tout le catalogue" spellcheck="false" autocomplete="off" aria-label="${escA(c.lib + ' (hypothèse)')}"><span class="u">${esc(c.unite)}</span></label>`;
  if (c.genre === 'choix') return `<label class="hyp-n"><span>${esc(c.lib)}</span><select id="${c.id}" aria-label="${escA(c.aria + ' (hypothèse)')}">${c.options.map(([v, t]) => `<option value="${escA(v)}"${String(v) === String(c.valeur) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  return `<label class="hyp-n"${c.titre ? ` title="${escA(c.titre)}"` : ''}><span>${esc(c.lib)}</span><input id="${c.id}" type="number" inputmode="decimal" step="${c.pas}"${c.min != null ? ` min="${c.min}"` : ''} value="${H[c.k] == null ? '' : H[c.k]}"${c.vide ? ` placeholder="${escA(c.vide)}"` : ''} aria-label="${escA(c.lib + ' (hypothèse)')}"><span class="u">${esc(c.unite)}</span></label>`; }
const GROUPES_HYPOTHESES = [['fil', 'Le câble'], ['temperature', 'La température'], ['chute', 'La chute en ligne'], ['reseau', 'Le réseau'], ['declassement', 'Le déclassement'], ['tableau', 'Les disjoncteurs']];
/* CE QUE FAIT CHAQUE RÉGLAGE, EN UNE PHRASE (l'ergonome v73 : « 232 mots à lire : chaque réglage porte un paragraphe ») ; le
   paragraphe entier — la règle, la source, la valeur par défaut — se lit dans le « ? » de sa ligne. */
const COURT_HYPOTHESES = { longueur: 'La longueur d’un câble que l’installation ne mesure pas.', courant: 'Le courant d’un câble qu’aucun disjoncteur n’alimente.', tension: 'La tension du réseau.',
  ambiante: 'L’air autour des câbles : ce qu’un câble admet en dépend.', tconducteur: 'La température qui donne sa résistance à un câble.', retour: 'Par où le courant revient : la structure, ou un câble.',
  regime: 'Continu, monophasé ou triphasé.', cosphi: 'Le facteur de puissance, en alternatif.', reactance: 'La réactance d’un gros câble, en alternatif.', charge: 'La part de ce que le faisceau admet qui y circule vraiment.',
  altitude: 'L’altitude de vol.', tableauMin: 'L’ambiante la plus basse du tableau de disjoncteurs.', tableauMax: 'L’ambiante la plus haute du tableau de disjoncteurs.',
  chuteMono: 'La chute en ligne admise : votre règle, 2 V.', chuteTri: 'En triphasé, la chute admise entre phases : votre règle, 4 V.', chuteConducteur: 'La température des câbles, pour la chute en ligne.',
  chuteDisjoncteur: 'La chute propre du disjoncteur compte dans la chute en ligne.', frequence: 'La fréquence du réseau alternatif.', marge: 'La marge du meilleur calibre sur chaque courant du profil.',
  margeTemps: 'Ce qu’une pointe peut consommer du temps de déclenchement.', prechauffage: 'Un état en service trouve le bilame chaud.', calibresPreferes: 'Les calibres que vous posez : le meilleur se choisit parmi eux.',
  // v74 (la règle du calibre) : la case a sa phrase courte, son paragraphe reste dans le « ? »
  calibreAuto: 'Un calibre qui touche la courbe devient le plus petit qui passe.' };
const courtDe = c => c.genre === 'condition' ? (c.c === 'faisceau' ? 'Des câbles en faisceau admettent moins qu’un câble seul.' : c.c === 'altitude' ? 'L’air raréfié refroidit moins les câbles.' : 'Un déclassement de la norme.') : COURT_HYPOTHESES[c.k] || c.sert;
/* Une ligne de la fiche : le champ, ce qu'il fait ; réglée ici (autre que `HYPOTHESES`), « ↺ » et la valeur de l'outil
   la rendent, d'un clic. */
const valeurDeLOutil = c => { const v = HYPOTHESES[c.k]; if (c.genre === 'choix') { const o = c.options.find(([x]) => String(x) === String(v)); return o ? o[1] : String(v); }
  if (c.genre === 'case') return v === false ? 'non' : 'oui'; if (c.genre === 'liste') return (v || []).map(nombre).join(' ') || 'tout le catalogue';
  return v == null ? 'vide' : nombre(v) + (c.unite ? ' ' + c.unite : ''); };
const ligneHypotheseHtml = (c, H) => { const reglee = c.k && c.k in HYPOTHESES && JSON.stringify(H[c.k]) !== JSON.stringify(HYPOTHESES[c.k]);
  return `<div class="hy-ligne${reglee ? ' reglee' : ''}"><div class="hy-champ">${champHypotheseHtml(c, H)}</div>`
    + (reglee ? `<button class="hy-rendre" data-hy-rendre="${escA(c.k)}" data-bulle="${escA('Revenir à la valeur de l’outil : ' + valeurDeLOutil(c))}">↺ ${esc(valeurDeLOutil(c))}</button>` : '')
    + `<p class="hy-sert">${esc(courtDe(c))}<button type="button" class="hy-q" data-bulle="${escA(c.sert + (c.genre === 'condition' && c.titre ? ' — ' + c.titre : ''))}" aria-label="${escA('Ce que fait « ' + c.lib + ' » : ' + c.sert)}">?</button></p></div>`; };
/* LA FICHE DES HYPOTHÈSES : un document à droite (mode `hypotheses`), comme des réglages — un groupe par thème, une ligne
   par hypothèse : son nom, son champ aligné à droite, ce qu'elle fait en petit (style.css, `.hy-*`) ; le pied dit où l'on
   en est (les valeurs de l'outil, ou combien sont réglées ici) et « Revenir aux valeurs de l'outil » rend `HYPOTHESES`.
   Atteignable du menu, du mot « hypothèse » de la fiche d'un fil, de « longueurs d'hypothèse » de la fiche d'un
   disjoncteur. */
function ficheHypotheses() { const H = app.simu || (app.simu = { ...HYPOTHESES }), N = app.norme || normeVide(), cs = hypothesesDe(N, H, { fiche: true });
  const reglees = Object.keys(HYPOTHESES).filter(k => JSON.stringify(H[k]) !== JSON.stringify(HYPOTHESES[k])).length, defaut = !reglees;
  // le chapeau dit où vont ces réglages (l'ingénieur v73 : « si j'envoie le dossier, on ne peut pas refaire le calcul ») : ils
  // partent avec chaque export — la page « Hypothèses et sources » du dossier PDF, la feuille « Volta » de l'installation corrigée
  const corps = tete('Simulation', 'Hypothèses') + '<p class="note">Ce que l’installation ne porte pas, Volta le suppose ; chaque fiche qui s’en sert le dit (<b>hypothèse</b>). <b>Ces réglages sont écrits dans chaque export</b> — la page « Hypothèses et sources » du dossier PDF, la feuille « Volta » de l’installation corrigée.</p>'
    + GROUPES_HYPOTHESES.map(([g, t]) => { const xs = cs.filter(c => c.groupe === g); return xs.length ? `<section class="hy-groupe"><h3 class="hy-titre">${esc(t)}</h3>${xs.map(c => ligneHypotheseHtml(c, H)).join('')}</section>` : ''; }).join('');
  const pied = `<span class="hy-etat${defaut ? '' : ' regle'}">${defaut ? 'Les valeurs de l’outil' : `<b>${pluriel(reglees, 'hypothèse')}</b> réglée${reglees > 1 ? 's' : ''} ici`}</span><span class="espace"></span>`
    + `<button class="btn papier" id="hy-defaut"${defaut ? ' disabled' : ''}>Revenir aux valeurs de l’outil</button>`;
  const deja = app.fiche && app.fiche.mode === 'hypotheses', y = deja ? $('fiche-corps').scrollTop : 0;
  ouvrirFiche({ mode: 'hypotheses', large: true }, corps, pied); if (deja) $('fiche-corps').scrollTop = y;
  lierHypotheses($('fiche-corps'), ficheHypotheses);
  $('fiche-corps').querySelectorAll('[data-hy-rendre]').forEach(b => b.onclick = () => { const k = b.dataset.hyRendre, v = HYPOTHESES[k];
    app.simu[k] = Array.isArray(v) ? [...v] : v; apresHypotheses(); ficheHypotheses(); dire('La valeur de l’outil est rendue (' + b.textContent.replace('↺', '').trim() + ').'); });
  $('hy-defaut').onclick = () => { app.simu = { ...HYPOTHESES, conditions: [...HYPOTHESES.conditions], calibresPreferes: [...HYPOTHESES.calibresPreferes] }; apresHypotheses(); ficheHypotheses(); dire('Les hypothèses de l’outil sont rétablies.'); }; }
/* Une hypothèse a changé : gardée, le contrôle se refait (sa clé l'oublie), la fiche ouverte dans l'inspecteur aussi. */
// le calibre du folio suit les hypothèses (`peindre` ne repeint que si un calibre a changé)
function apresHypotheses() { memoriserSimu(); if (typeof CONTROLE !== 'undefined') CONTROLE.cle = null; rendreControle(); peindre(); rafraichirCarte(); }
function carteSimulation(nom, P, S) { const H = S.hyp, V = verite(), N = app.norme || normeVide();
  let s = `<div class="simu"><div class="simu-tete"><span class="sur">Simulation</span><span class="simu-note">hypothèses, pas des mesures : l’installation ne porte ni longueur ni courant</span></div>
    <div class="hyp">${hypothesesDe(N, H, { fils: S.fils }).map(c => champHypotheseHtml(c, H)).join('')}</div>`;
  if (S.sansNorme) return s + `<p class="simu-vide">Aucune norme ne connaît cette famille ni ces câbles : rien n’est calculé. Importez une norme depuis la bible.</p></div>`;
  if (!S.lignes.length) return s + `<p class="simu-vide">Aucun câble dans un trou : rien à simuler.</p></div>`;
  const ligne = x => { const i = V.indexOf(x.l), dest = x.vers + (x.borneVers ? ':' + x.borneVers : '');
    return `<tr class="fil sim-${x.verdict}" data-i="${i}" data-fils="${i}" data-borne="${escA(x.borne)}" tabindex="0" role="button" aria-label="${escA('Voir le câble ' + x.cable + ' sur le plan')}"><td class="c">${esc(x.borne)}<span class="sens">${x.sens === 'amont' ? '↓ ' + (P.cotes.amont === 'fiche' ? 'fiche' : 'amont') : '↑ ' + (P.cotes.aval === 'embase' ? 'embase' : 'aval')}</span>${x.surcharge ? '<span class="ko">surcharge</span>' : ''}</td>`
      + `<td class="m"><b>${esc(x.cable)}</b><span class="dest">${esc(dest)}</span></td><td class="m${x.jaugeOk === false ? ' ko' : ''}">${esc(x.type || '—')}${x.jaugeOk === false ? '<span class="ko">hors plage</span>' : x.approx ? '<span class="att">gauge seule</span>' : ''}${x.tenue && !x.tenue.ok ? `<span class="att" title="${escA('Câble ' + nombre(x.tenue.tmax) + ' °C : ' + nombre(x.tenue.conducteurA) + ' °C au conducteur (ambiante ' + nombre(x.tenue.ambiante) + ' + 40 °C de l’EN 2853)')}">${esc(nombre(x.tenue.conducteurA))} °C &gt; ${esc(nombre(x.tenue.tmax))} °C</span>` : ''}</td>`
      + `<td class="d">${x.iFil == null ? '—' : dec(x.iFil, 1)} / ${x.iContact == null ? '—' : dec(x.iContact, 1)}</td><td class="d">${x.dU == null ? '—' : dec(x.dU, 2) + ' V<span class="sep"> · </span><span class="pct">' + dec(x.pct, 1) + ' %</span>'}</td><td><span class="verdict v-${x.verdict}">${MOTS_VERDICT[x.verdict]}</span>${x.xEstime != null ? `<span class="sim-x" title="Une estimation : un câble seul à ${POSE_HAUTEUR} mm de la structure, à ${FREQUENCE_BORD} Hz — à saisir dans X, jamais prise d’office">X ≈ ${esc(nombre(Math.round(x.xEstime * 100) / 100))} mΩ/m ?</span>` : ''}</td></tr>`; };
  const bilan = Object.entries(S.compte).map(([v, n]) => `<span class="verdict v-${v}">${n} ${MOTS_VERDICT[v]}</span>`).join(' ');
  const ex = S.lignes.find(x => x.dU != null);
  const calcul = !ex ? '' : (() => { const admis = S.chute && S.chute.chuteMax != null ? ` — admis : ${nombre(S.chute.chuteMax)} V` : '', fin = `<b>${dec(ex.dU, 3)} V</b>, soit ${dec(ex.pct, 2)} % de ${nombre(H.tension)} V${admis}</div>`;
    const rho = `${nombre(arrondi(ex.rho, 1))} Ω/km à ${nombre(Math.round(ex.T != null ? ex.T : H.tconducteur))} °C${ex.rhoSource === 'câble' ? ' — le câble ' + esc(ex.cab.cable) + ' de la base' : ex.rhoSource === 'jauge' ? ' — la jauge seule, EN 2853' : ''}${ex.kTemperature && Math.abs(ex.kTemperature - 1) > 1e-6 ? ' (× ' + nombre(Math.round(ex.kTemperature * 1000) / 1000) + ' depuis 20 °C)' : ''}`;
    if (ex.regime === 'continu') return `<div class="calcul"><b>${esc(ex.cable)}</b> : (${rho} × ${nombre(H.longueur)} m + ${nombre(S.rContact * 1000)} mΩ) × ${nombre(H.courant)} A = ${fin}`;
    return `<div class="calcul"><b>${esc(ex.cable)}</b> : R = ${rho} × ${nombre(H.longueur)} m + ${nombre(S.rContact * 1000)} mΩ = ${dec(ex.R, 3)} Ω ; ΔU${ex.regime === 'tri' ? ' composée' : ''} = ${ex.regime === 'tri' ? '√3 × ' : ''}${nombre(H.courant)} A × (${dec(ex.R, 3)} × ${nombre(ex.cosphi)} + ${dec(ex.X, 3)} × ${dec(Math.sqrt(1 - ex.cosphi * ex.cosphi), 2)}) = ${fin}`; })();
  s += `<div class="simu-defile"><table class="simu-tab"><thead><tr><th>contact</th><th>câble</th><th>type</th><th title="Intensité admissible du câble (déclassée) / du contact">I câble / contact (A)</th><th title="Chute de tension sur la longueur d’hypothèse">ΔU</th><th>verdict</th></tr></thead><tbody>${S.lignes.map(ligne).join('')}</tbody></table></div>
    <div class="bilan">${bilan}</div>
    <div class="formule">${formuleChute(S.regime)} — ρ la résistance du câble à ${nombre(H.tconducteur)} °C (la base des câbles, sinon l’EN 2853), L la longueur${S.regime !== 'continu' ? ' simple du câble, I le courant par phase, X la réactance (négligée sous ' + GROS_CABLE + ' mm² de cuivre, à saisir au-delà)' : ''}, R<sub>contact</sub> celle du contact (${S.rContact ? nombre(Math.round(S.rContact * 10000) / 10) + ' mΩ' + (S.famille && S.famille.resistance != null ? '' : S.famille && S.famille.nature !== 'coupure' ? ', deux par potentiel' : ', par la taille du contact') : 'inconnue'}), I le courant. I câble = intensité du câble × ${nombre(Math.round(S.facteur * 100) / 100)} (${S.declassement && S.declassement.length ? S.declassement.map(d => d.condition + (d.point && d.point.fils != null ? ' : ' + S.fils + ' câbles, le point ' + d.point.fils + ' à ' + nombre(d.point.charge) + ' %' : '')).join(' · ') : 'sans déclassement'})${S.iContact != null ? ' ; contact ' + nombre(S.iContact) + ' A' : ''}.${S.regime === 'tri' && S.chute ? ' La chute composée se compare ' + (S.chute.regle === 'lecteur' ? 'aux ' + nombre(S.chute.chuteMax) + ' V de la règle du lecteur.' : 'à la ligne ' + nombre(S.chute.tension) + ' V du réseau.') : ''} Les ponts ne sont pas des câbles dans un trou : ils ne sont pas simulés.</div>${calcul}</div>`;
  return s; }
/* Un module au-delà de ce que la référence retenue compte : la borne existe
   dans le contrat, pas sur le matériel. */
const horsReference = (P, m) => !!(P.entree && P.entree.bornes != null && /^\d+$/.test(m.borne) && +m.borne > P.entree.bornes);
/* La référence, repliée sous le dessin : ce que le fichier portait, les
   raisons du choix, ce que la barrette porte, et les candidates — on en
   retient une d'un clic. */
function choixReference(nom, I, R) { const aLoger = Math.max(I.nBornes, I.borneMax || 0), s = n => n > 1 ? 's' : '';
  const faits = [['bornes', esc(I.bornes.slice().sort(triNaturel).join(', ') || '—') + (I.choix ? ` · ${aLoger} sur ${I.choix.bornes}` : '')],
    ['gauge', I.jaugeFine != null ? jaugeTexte(I) : 'inconnue'], ['blindage', I.blindes ? `${I.blindes} câble${s(I.blindes)} blindé${s(I.blindes)}` : 'aucun'], ['shunts', String(I.shunts)], ['fichier', esc(I.pn || '—')]];
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
  const ca = el('si-Ca'); if (ca) ca.addEventListener('change', () => { H.calibreAuto = ca.checked; if (ca.checked) { try { appliquerCalibresVolta(); } catch (_) { } } refaire('si-Ca'); });
  // la chute admise de la règle du lecteur : un nombre > 0, ou vide — la table Réseau reprend
  [['si-Cm', 'chuteMono'], ['si-Ct', 'chuteTri']].forEach(([id, k]) => { const e = el(id); if (!e) return;
    e.addEventListener('change', () => { const t = String(e.value).trim(), v = t ? parseFloat(t.replace(',', '.')) : null; if (v != null && !(v > 0)) { e.value = H[k] == null ? '' : H[k]; return; }
      if (v === H[k]) return; H[k] = v; refaire(id); }); });
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
  const w = filDe(l); if (w) { allumerFil(w); viserFil(w); } else if (!attenteCourante()) dire('Ce câble n’est pas dessiné sur ce folio.'); }
/* ---- la fiche : cartouche, collage, bible — les documents rares --------- */
/* LA LARGEUR D'UN DOCUMENT, réglée ici pour tous (l'audit des pages, P2-1) : un document courant 400 px ; « large » (vos
   fichiers, la nomenclature, le collage, les hypothèses) 560 ; « ample » — les normes, la bible, qu'on consulte en
   gardant le plan — jusqu'à 1 040 px en laissant 40 % de l'écran au plan (la barre des folios devient alors « ‹ › 3 / 6 »,
   style.css) ; la base SEE prend la page (la barre des folios attend dessous). `mode.largeur` le dit, sinon son nom. */
const LARGEURS_DOC = { normes: 'ample', bible: 'ample', see: 'page' };
const largeurDuDoc = mode => { const k = mode.largeur || LARGEURS_DOC[mode.mode] || (mode.large ? 'large' : 'document');
  return k === 'page' ? 'calc(100vw - var(--rail) - var(--jeu))' : k === 'ample' ? 'min(1040px, calc(60vw - var(--rail)))' : k === 'large' ? '560px' : '400px'; };
/* LE CLAVIER D'UN DOCUMENT (le panel v73, l'ergonome P1 : « ouverts par le menu, ils ne prennent pas le clavier ; Échap le
   rend à la page ») : un document qui s'ouvre prend le clavier — son titre, ou l'onglet choisi d'un document à onglets
   (`[data-clavier]`) ; ce qui l'a ouvert est retenu (une ligne du menu ⋮ : le ⋮ lui-même) ; fermé pour lui-même (×, Échap),
   il rend le clavier à cet ouvreur, sans faire paraître sa bulle (`rendreLeClavier`, 08-menu). Un document qui se refait sur
   place (les hypothèses après un réglage, Vos fichiers après un dépôt) ne déplace pas le clavier. */
const DOC = { ouvreur: null };
function ouvreurDuDoc() { const a = document.activeElement, f = $('fiche');
  if (!a || a === document.body || (f && f.contains(a))) return DOC.ouvreur && DOC.ouvreur.isConnected ? DOC.ouvreur : $('btnMenu');
  return a.closest('#menu') ? $('btnMenu') : a; }
function prendreLeClavierDuDoc() { const c = $('fiche-corps'), cible = c.querySelector('[data-clavier]') || c.querySelector('.fiche-tete .titre');
  if (!cible) return; if (!cible.hasAttribute('tabindex') && !/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(cible.tagName)) cible.setAttribute('tabindex', '-1');
  try { cible.focus({ preventScroll: true }); } catch (_) { cible.focus(); } }
function ouvrirFiche(mode, corps, pied) { const f = $('fiche'), nouveau = f.hidden || !app.fiche || app.fiche.mode !== mode.mode;
  if (nouveau && f.hidden) DOC.ouvreur = ouvreurDuDoc();
  fermerBase(); if (!$('inspecteur').hidden) { $('inspecteur').hidden = true; document.body.classList.remove('insp-ouvert'); modeCarte(); dessinerLien(); }
  $('fiche-corps').innerHTML = corps; const p = $('fiche-pied'); p.innerHTML = pied || ''; p.hidden = !pied;
  document.documentElement.style.setProperty('--fiche-l', largeurDuDoc(mode));
  f.hidden = false; f.dataset.mode = mode.mode || ''; if (nouveau) { f.classList.remove('entre'); void f.offsetWidth; f.classList.add('entre'); }
  app.fiche = mode; $('fiche-corps').scrollTop = 0; f.classList.remove('defile');
  // sur téléphone un document est une page, de la barre du haut au rail : la bande des folios se range (style.css)
  document.body.classList.add('fiche-ouverte');
  $('fi-fermer').onclick = () => fermerFiche(true); lierCoquille(); mesurerTeteFiche(); synchroniserRail(); if (nouveau) ajuster(true);
  // ce qui porte `data-bulle` dans un document dit son pourquoi au survol (08-fiche) ; le clavier entre dans le document
  if (typeof lierBulles === 'function') { lierBulles($('fiche-corps')); lierBulles(p); }
  if (nouveau) prendreLeClavierDuDoc(); }
/* LA COQUILLE d'un document (style.css, « les documents ») : sa tête reste en haut quand on descend ; un filet paraît
   sous elle dès qu'on a défilé (`#fiche.defile`), et ce qui colle sous elle (l'en-tête d'une table, les onglets de SEE)
   lit sa hauteur, `--fi-tete`, remesurée quand la feuille change de taille. Posé une fois. */
function mesurerTeteFiche() { const t = $('fiche-corps').querySelector('.fiche-tete'); $('fiche').style.setProperty('--fi-tete', (t ? t.offsetHeight : 0) + 'px'); }
let coquilleLiee = false;
function lierCoquille() { if (coquilleLiee) return; coquilleLiee = true; const f = $('fiche'), c = $('fiche-corps');
  c.addEventListener('scroll', () => f.classList.toggle('defile', c.scrollTop > 2), { passive: true });
  if (window.ResizeObserver) new ResizeObserver(() => { if (!f.hidden) mesurerTeteFiche(); }).observe(c); }
/* `recadrer` : quand on ferme la fiche pour elle-même, ce qu'on avait choisi revient dans l'inspecteur (le document
   l'avait remplacé), sinon le plan reprend la place. */
function fermerFiche(recadrer) { const f = $('fiche'); if (f.hidden && !app.fiche) return; const avait = f.contains(document.activeElement) || document.activeElement === document.body;
  f.hidden = true; app.fiche = null; const o = DOC.ouvreur && DOC.ouvreur.isConnected && DOC.ouvreur.getClientRects().length ? DOC.ouvreur : $('btnMenu'); DOC.ouvreur = null;
  document.body.classList.remove('fiche-ouverte'); synchroniserRail(); if (!recadrer) return;
  if (app.cible && $('inspecteur').hidden) ouvrirInspecteur(); else ajuster(true);
  // fermé pour lui-même : le clavier revient à ce qui l'avait ouvert (le ⋮ pour un document du menu), sans sa bulle
  // (la carte que le document avait remplacée revient — elle prend le clavier en naissant : le ⋮ le reprend, c'est de lui
  // qu'on venait)
  // (le titre caché garde le focus jusqu'à la prochaine image : il compte comme « personne »)
  const a = document.activeElement; if (avait && o && (!a || a === document.body || f.contains(a) || $('inspecteur').contains(a))) { if (typeof rendreLeClavier === 'function') rendreLeClavier(o); else o.focus(); } }
/* La croix d'un document : sa bulle dit le geste et sa touche, comme celle de la feuille des raccourcis (une bulle du chrome,
   `.bulle` : au survol après 400 ms, tout de suite au clavier) — le même geste, le même mot partout. */
const CROIX_DOC = `<button class="rond fermer" id="fi-fermer" aria-label="Fermer (Échap)"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg><span class="bulle" aria-hidden="true">Fermer<kbd>Échap</kbd></span></button>`;
const tete = (sur, titre, sans) => `<div class="fiche-tete"><div class="min0"><div class="sur">${esc(sur)}</div><h2 class="titre${sans ? ' sans' : ''}" tabindex="-1">${esc(titre)}</h2></div>${CROIX_DOC}</div>`;
const champ = (id, lib, val, opt) => `<label class="champ${opt && opt.sans ? ' sans' : ''}"><span>${lib}</span><input id="${id}" value="${escA(val || '')}"${opt && opt.ph ? ` placeholder="${escA(opt.ph)}"` : ''} spellcheck="false"></label>`;
const CHAMPS_CARTOUCHE = [['ca-titre', 'titre', 'Titre'], ['ca-auteur', 'auteur', 'Dessiné par'], ['ca-indice', 'indice', 'Indice'], ['ca-date', 'date', 'Date'], ['ca-echelle', 'echelle', 'Échelle']];
/* LE CARTOUCHE : d'abord ce qu'il donne — son aperçu sur papier, le dessin même du folio (`cartoucheSvg`, 06), le folio
   courant, qui suit chaque lettre tapée —, puis le petit formulaire : le titre, qui l'a dessiné, l'indice, la date,
   l'échelle. Le plan se repeint quand un champ est quitté. */
function ficheCartouche() { const c = app.contrat.cartouche, W = CART_FOLIO + CART_TITRE;
  const apercu = () => `<svg viewBox="-1 -1 ${W + 2} ${CART_H + 2}" role="img" aria-label="Aperçu du cartouche">${cartoucheSvg(W, CART_H, c, folioCourant(), [])}</svg>`;
  const corps = tete('Sur chaque folio', 'Cartouche') + '<p class="note">Il part avec chaque planche enregistrée ou imprimée ; le numéro de folio s’écrit tout seul.</p>'
    + `<figure class="ca-apercu" id="ca-apercu">${apercu()}</figure><div class="ca-form">`
    + champ('ca-titre', 'Titre', c.titre, { sans: true, ph: 'Le titre de la planche' }) + champ('ca-auteur', 'Dessiné par', c.auteur, { sans: true, ph: 'Initiales ou nom' })
    + `<div class="grille ca-trois">${champ('ca-indice', 'Indice', c.indice, { ph: 'A' })}${champ('ca-date', 'Date', c.date, { ph: 'aaaa-mm-jj' })}${champ('ca-echelle', 'Échelle', c.echelle, { ph: '1:1' })}</div></div>`;
  ouvrirFiche({ mode: 'cartouche' }, corps, '');
  CHAMPS_CARTOUCHE.forEach(([id, k]) => { $(id).addEventListener('input', e => { c[k] = e.target.value; $('ca-apercu').innerHTML = apercu(); }); $(id).addEventListener('change', () => { peindre(); rallumer(); sauver(); }); });
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
/* `serie` (« Toutes les poser », 08-controle) : `{ plan }` le folio de la barrette ; ni historique, ni dessin, ni mot — la
   série fait les siens, une fois. */
function poserBarrette(vt, nom, serie) { const L = (serie ? liaisonsDe(serie.plan || app.plan) : liaisonsDuPlan()).filter(l => l.aPoser === vt), V = verite(); if (!L.length) return false;
  if (V.some(l => l.de === nom || l.vers === nom)) { if (!serie) dire(nom + ' existe déjà au contrat : choisissez un autre repère.', true); return false; }
  if (!serie) histPush('pose de ' + nom + ' (' + vt + ')'); const plan = modeFolio() === 'fichier' ? L[0].plan || '' : '';
  L.forEach(l => {
    if (l.origine) { const s = sourceDe(l); if (!s) return;
      if (l.de === vt) { s.de = nom; s.borneDe = l.borneDe; s.pnDe = ''; } if (l.vers === vt) { s.vers = nom; s.borneVers = l.borneVers; s.pnVers = ''; } return; }
    V.push(liaison({ ...l, de: l.de === vt ? nom : l.de, vers: l.vers === vt ? nom : l.vers, plan })); });
  const n = L.filter(l => l.de === vt && l.vers === vt).length; if (serie) { if (app.nFolios) refaireFolios(); return true; }
  app.choisi = nom; app.cible = { type: 'bloc', nom }; apresEdition();
  direRetablir(`${vt} posée au contrat sous ${nom} : un câble à créer, ${pluriel(n, 'shunt')}.`); return true; }
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
function apresEdition() { try { appliquerCalibresVolta(); } catch (_) { } if (app.nFolios) refaireFolios(); redessiner(); sauver(); }

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
   charge), le cartouche — et le PLAN de la bibliothèque qui était sur la table : défaire un chargement rend aussi les
   choix, le cartouche et le plan d'avant (le plan ouvert entre-temps reste dans la bibliothèque).
   REFAIRE (le panel v73 : « refaire impossible, et Ctrl+Maj+Z défait une deuxième fois ») : défaire photographie d'abord
   ce qu'il quitte, sur une seconde pile ; refaire la reprend, et photographie à son tour ce qu'il quitte, sur l'historique.
   Un geste neuf vide la pile à refaire : on ne refait pas ce qu'un autre geste a remplacé. La pile suit l'historique
   qu'elle double — un plan qu'on ouvre lui en donne un neuf (`app.hist = []`, 08-bibliotheque), elle repart vide. */
const photo = (quoi, retouche) => ({ quoi, retouche: !!retouche, planId: app.planId, liaisons: app.contrat.liaisons.map(l => ({ ...l })), source: app.source ? app.source.map(l => ({ ...l })) : null,
  nFolios: app.nFolios, budget: app.budget, plan: app.plan, nom: app.nom, designations: new Map(app.contrat.designations), sexes: new Map(app.contrat.sexes || []), raccords: new Map([...(app.contrat.raccords || [])].map(([k, v]) => [k, { ...v }])), charges: new Map([...(app.contrat.charges || [])].map(([k, v]) => [k, JSON.parse(JSON.stringify(v))])), cartouche: { ...app.contrat.cartouche }, retouches: new Map(app.retouches) });
const REFAIRE = { hist: null, pile: [] }, HISTOIRE = { recit: '' };
function pileRefaire() { if (REFAIRE.hist !== app.hist) { REFAIRE.hist = app.hist; REFAIRE.pile = []; } return REFAIRE.pile; }
const borner = (xs, n) => { while (xs.length > n) xs.shift(); };
function histPush(quoi, retouche) { app.hist.push(photo(quoi, retouche)); borner(app.hist, 40); pileRefaire().length = 0; synchroniserHistorique(); }
// défaire : la photo du dessus revient ; ce qu'on quitte part sur la pile à refaire. Rend le nom du geste défait.
function annuler() { const p = app.hist.pop(); if (!p) return null; const ici = photo(p.quoi, p.retouche), pile = pileRefaire(); pile.push(ici); borner(pile, 40);
  poserPhoto(p); HISTOIRE.recit = recitDuGeste(ici, p, p, 'revient'); return p.quoi; }
// refaire : la photo du dessus de la pile à refaire revient ; ce qu'on quitte retourne sur l'historique
function refaire() { const pile = pileRefaire(), p = pile.pop(); if (!p) return null; const ici = photo(p.quoi, p.retouche); app.hist.push(ici); borner(app.hist, 40);
  poserPhoto(p); HISTOIRE.recit = recitDuGeste(ici, p, p, 'passe'); return p.quoi; }
function poserPhoto(p) { const plan = app.plan;
  // un autre plan était sur la table : ce qu'on vient d'y faire se garde d'abord, puis il revient
  if (p.planId !== undefined && p.planId !== app.planId) { sauverMaintenant(); app.planId = p.planId; }
  app.contrat.liaisons = p.liaisons; app.source = p.source; app.nFolios = p.nFolios; app.budget = p.budget || 16; app.plan = p.plan; app.nom = p.nom || ''; app.contrat.designations = p.designations; app.contrat.sexes = p.sexes || new Map(); app.contrat.charges = p.charges || new Map(); app.contrat.raccords = p.raccords || new Map();
  if (p.cartouche) app.contrat.cartouche = { ...p.cartouche };
  // les retouches d'avant reviennent, et se gardent comme elles étaient
  if (p.retouches) { const cles = new Set([...app.retouches.keys(), ...p.retouches.keys()]); app.retouches = p.retouches; cles.forEach(garderRetouche); }
  app.choisi = null; app.cible = null; app.actif = null; app.base.enSaisie = false; fermerFiche();
  if (document.activeElement && $('ba-tab').contains(document.activeElement)) document.activeElement.blur();
  // défaire une retouche ne recadre pas la vue : on regardait ce qu'on retouchait ; le récapitulatif en moitié non plus,
  // sur le même folio (P1-3 : il garde l'échelle du plan, on y corrige en regardant le plan)
  const garder = p.plan === plan && (p.retouche || (app.base.ouvert && app.base.taille === 'moitie'));
  redessiner(); if (!garder) ajuster(true); sauver(); }
/* LE GESTE EN MOTS (le panel v73 : « Annulé : calibre de 102CB1 : automatique » se lisait à l'envers — on croyait le
   calibre revenu à l'automatique, c'était l'inverse). Deux états du contrat comparés — deux photos, ou une photo et la
   table — et ce qui a changé, dit comme on le lit sur le plan : un câble, un repère, un calibre. `sens` dit le verbe :
   'revient' (défaire : « W-012 revient en DR20 »), 'passe' (refaire : « W-012 passe en DR12 »), 'court' (la bulle du
   rail : « W-012 en DR12 »). `vers` est l'état où l'on arrive ; `p` la photo du geste (son nom, s'il touche le dessin).
   Les câbles d'un même champ se disent ensemble (« W-011, W-012 et W-015 reviennent en DR16, DR20 et DR24 ») ; au-delà de
   trois phrases, le compte ; ce qui ne se compare pas (un autre plan, une retouche du dessin) se dit par le geste. */
const etatSurLaTable = () => ({ planId: app.planId, nom: app.nom, liaisons: app.contrat.liaisons, charges: app.contrat.charges || new Map(), designations: app.contrat.designations, sexes: app.contrat.sexes || new Map(), raccords: app.contrat.raccords || new Map() });
const etListe = xs => xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' et ' + xs[xs.length - 1];
function recitDuGeste(de, vers, p, sens) { const quoi = (p && p.quoi) || '', V = { revient: ['revient', 'reviennent'], passe: ['passe', 'passent'], court: ['', ''] }[sens];
  const dire2 = (sujets, apres) => sujets.join('') && (etListe(sujets) + (V[0] ? ' ' + V[sujets.length > 1 ? 1 : 0] : '') + ' ' + apres).trim();
  // un autre plan sur la table (une ouverture, un chargement) : celui où l'on arrive
  if (de.planId !== vers.planId || (de.nom || '') !== (vers.nom || '') && Math.abs(de.liaisons.length - vers.liaisons.length) > 2) return sens === 'court' ? quoi : guillemets(vers.nom || 'le plan d’avant') + ' revient sur la table';
  // une retouche du dessin : le geste la nomme (« déplacer 103RL1 », « pousser 103RL1 », « rendre 103RL1 au dessin automatique »)
  if (p && p.retouche) { const m = /^(?:déplacer|pousser) (.+)$/.exec(quoi), r = /^rendre (.+) au dessin automatique$/.exec(quoi);
    if (m) return sens === 'court' ? m[1] + ' déplacé' : sens === 'revient' ? m[1] + ' revient à sa place' : m[1] + ' reprend sa nouvelle place';
    if (r) return sens === 'court' ? r[1] + ' rendu au dessin automatique' : sens === 'revient' ? r[1] + ' retrouve sa place retouchée' : r[1] + ' revient au dessin automatique';
    if (/^retouche de ce folio/.test(quoi)) return sens === 'court' ? 'le dessin automatique de ce folio' : sens === 'revient' ? 'vos retouches reviennent sur ce folio' : 'le dessin automatique revient sur ce folio';
    return sens === 'court' ? quoi : quoi + (sens === 'revient' ? ' : défait' : ' : refait'); }
  const phrases = [], A = de.liaisons || [], B = vers.liaisons || [];
  const nomC = l => l.cable || (l.de && l.vers ? l.de + ' → ' + l.vers : 'une liaison');
  // des liaisons en plus ou en moins : lesquelles (par leurs bouts et leur numéro)
  if (A.length !== B.length) { const cle = l => [l.de, l.borneDe, l.vers, l.borneVers, l.cable].join('|'), cles = xs => xs.reduce((m, l) => m.set(cle(l), (m.get(cle(l)) || 0) + 1), new Map());
    const plus = B.length > A.length, [grand, petit] = plus ? [B, A] : [A, B], reste = cles(petit), xs = grand.filter(l => { const n = reste.get(cle(l)) || 0; if (n) { reste.set(cle(l), n - 1); return false; } return true; });
    const n = xs.length || Math.abs(B.length - A.length), qui = n === 1 && xs[0] ? 'la liaison ' + nomC(xs[0]) : pluriel(n, 'liaison');
    // plus de liaisons à l'arrivée : défaire rend ce qu'on avait supprimé, refaire rajoute ce qu'on avait ajouté
    const verbe = plus ? { revient: n > 1 ? 'reviennent' : 'revient', passe: n > 1 ? 'sont ajoutées' : 'est ajoutée', court: n > 1 ? 'ajoutées' : 'ajoutée' } : { revient: n > 1 ? 's’en vont' : 's’en va', passe: n > 1 ? 'sont supprimées' : 'est supprimée', court: n > 1 ? 'supprimées' : 'supprimée' };
    phrases.push(qui + ' ' + verbe[sens]); }
  else { // les champs changés, liaison par liaison ; un même champ se dit pour tous ses câbles (ou ses repères)
    const groupes = new Map(), noter = (cleG, sujet, val, fmt) => { const g = groupes.get(cleG) || groupes.set(cleG, { cle: cleG, fmt, xs: [] }).get(cleG); if (!g.xs.some(x => x.sujet === sujet)) g.xs.push({ sujet, val }); };
    const vide = v => v == null || v === '';
    B.forEach((b, i) => { const a = A[i]; if (!a) return;
      ['type', 'pnDe', 'pnVers', 'longueur', 'route', 'cable', 'de', 'borneDe', 'vers', 'borneVers', 'contactDe', 'contactVers', 'plan'].forEach(ch => { const va = a[ch] == null ? '' : a[ch], vb = b[ch] == null ? '' : b[ch]; if (va === vb) return;
        if (ch === 'type') noter('type', nomC(b), vide(vb) ? 'sans type' : 'en ' + vb);
        // le part number d'un disjoncteur porte son calibre : on dit le calibre (« 102CB1 revient à 10 A (MS3320-10) »)
        else if (ch === 'pnDe' || ch === 'pnVers') { const c = !vide(vb) && typeof calibreDuPn === 'function' ? calibreDuPn(vb) : null;
          noter('pn', ch === 'pnDe' ? b.de : b.vers, vide(vb) ? 'sans part number' : c > 0 ? 'à ' + amperes(c) + ' (' + vb + ')' : 'en ' + vb); }
        else if (ch === 'longueur') noter('longueur', nomC(b), vide(vb) ? 'sans longueur' : 'à ' + nombre(Math.round(vb * 100) / 100) + ' m');
        else if (ch === 'route') noter('route', nomC(b), vide(vb) ? 'sans route' : 'sur la route ' + vb);
        else if (ch === 'cable') noter('cable', va || nomC(a), vide(vb) ? 'sans numéro' : vb, 'numero');
        else if (ch === 'contactDe' || ch === 'contactVers') noter('contact', nomC(b), vide(vb) ? 'au contact automatique' : 'au contact ' + vb);
        else if (ch === 'plan') noter('plan', nomC(b), 'au folio ' + (vb || '—'));
        else noter('bout', nomC(b), 'sur ' + (ch.endsWith('De') || ch === 'de' ? b.de + (b.borneDe ? ':' + b.borneDe : '') : b.vers + (b.borneVers ? ':' + b.borneVers : ''))); }); });
    // le calibre d'un disjoncteur (son profil) : il dit aussi son part number, qu'on ne répète pas
    const calibres = new Set(), ca = de.charges || new Map(), cb = vers.charges || new Map();
    new Set([...ca.keys(), ...cb.keys()]).forEach(nom => { const x = ca.get(nom) || {}, y = cb.get(nom) || {}; if (JSON.stringify(x) === JSON.stringify(y)) return;
      if ((x.calibre || null) !== (y.calibre || null)) { calibres.add(nom); const auto = typeof calibreDe === 'function' && sens !== 'court' ? calibreDe(nom) : null;
        noter('calibre', nom, y.calibre > 0 ? (sens === 'court' ? amperes(y.calibre) + ' à la main' : 'à ' + amperes(y.calibre) + ' à la main') : (sens === 'court' ? 'calibre automatique' : 'au calibre automatique') + (auto > 0 ? ', ' + amperes(auto) : '')); }
      else noter('profil', 'le profil de charge de ' + nom, sens === 'court' ? 'récrit' : sens === 'revient' ? 'comme avant' : 'récrit', 'etat'); });
    const pn = groupes.get('pn'); if (pn) { pn.xs = pn.xs.filter(x => !calibres.has(x.sujet)); if (!pn.xs.length) groupes.delete('pn'); }
    // les choix écrits à la main : un contact à sertir, une nature, une désignation ou une référence ; un raccord, un sexe
    const da = de.designations || new Map(), db = vers.designations || new Map();
    new Set([...da.keys(), ...db.keys()]).forEach(k => { const va = da.get(k) || '', vb = db.get(k) || ''; if (va === vb) return; const xs = k.split('|');
      if (xs[0] === 'sertir') noter('contact', 'le contact de ' + xs[1] + ':' + xs.slice(2).join('|'), vb ? 'à ' + vb : 'à l’automatique');
      else if (xs[1] === 'nature') noter('nature', 'la nature de ' + xs[0], vb ? 'à ' + guillemets(vb) : 'au type du repère');
      else noter('choix', xs[0], vb ? 'à ' + guillemets(vb.split('|')[0] || vb) : 'au choix de l’outil'); });
    [['raccords', 'le raccord de '], ['sexes', 'le sexe des contacts de ']].forEach(([m, mot]) => { const x = de[m] || new Map(), y = vers[m] || new Map();
      new Set([...x.keys(), ...y.keys()]).forEach(k => { if (JSON.stringify(x.get(k) || null) !== JSON.stringify(y.get(k) || null)) noter(m, mot + k, sens === 'court' ? 'changé' : sens === 'revient' ? 'comme avant' : 'changé', 'etat'); }); });
    // le disjoncteur d'abord (la cause), puis ses câbles, puis le reste
    const ORDRE = ['calibre', 'pn', 'profil', 'type', 'contact', 'longueur', 'route', 'cable', 'bout', 'plan', 'choix', 'nature', 'raccords', 'sexes'], rangG = g => { const i = ORDRE.indexOf(g.cle); return i < 0 ? ORDRE.length : i; };
    [...groupes.values()].sort((a, b) => rangG(a) - rangG(b)).forEach(g => { const memes = g.xs.every(x => x.val === g.xs[0].val), sujets = g.xs.map(x => x.sujet);
      if (g.fmt === 'numero') g.xs.forEach(x => phrases.push(sens === 'court' ? x.sujet + ' → ' + x.val : x.sujet + (sens === 'revient' ? ' redevient ' : ' devient ') + x.val));
      else if (g.fmt === 'etat') g.xs.forEach(x => phrases.push(sens === 'court' ? x.sujet + ' ' + x.val : x.sujet + (sens === 'revient' ? ' revient ' + x.val : ' est ' + x.val)));
      else if (g.xs.length > 4 && !memes) phrases.push(sujets.length + ' ' + (/^(pn|calibre|choix)$/.test(g.cle) ? 'repères' : 'câbles') + ' ' + { revient: 'reviennent comme avant', passe: 'changent', court: 'changés' }[sens]);
      else if (memes) phrases.push(dire2(sujets.length > 4 ? [sujets.length + ' ' + (/^(pn|calibre|choix)$/.test(g.cle) ? 'repères' : 'câbles')] : sujets, g.xs[0].val));
      // des valeurs différentes : « W-011, W-012 et W-015 reviennent en DR16, DR20 et DR24 »
      else { const t = g.xs.map(x => x.val), pre = /^(en|à|sur|au|sans) /.exec(t[0]), tous = pre && t.every(v => v.startsWith(pre[0]));
        phrases.push(dire2(sujets, tous ? pre[0] + etListe(t.map(v => v.slice(pre[0].length))) : etListe(t))); } }); }
  const ph = phrases.filter(Boolean); if (!ph.length) return sens === 'court' ? quoi : quoi ? quoi + (sens === 'revient' ? ' : défait' : ' : refait') : '';
  const n = ph.length - 2; return ph.length > 3 ? ph.slice(0, 2).join(' · ') + ' et ' + n + (n > 1 ? ' autres changements' : ' autre changement') : ph.join(' · '); }
/* LA MÉMOIRE DU CONTRAT. Ce qui se garde d'un contrat (`etatDuContrat`) : ses liaisons, ses folios, ses choix, son
   cartouche, le plan de la bibliothèque qu'il est. Il se garde 400 ms après le dernier geste, à deux endroits : ce
   navigateur (localStorage : le plan qui est sur la table, relu au lancement, derrière la bibliothèque) et la
   bibliothèque (IndexedDB, `garderLePlan` : chaque plan garde le sien). `sauverMaintenant` n'attend pas — avant de
   changer de plan, ce qu'on vient de faire part. `poserEtat` remet un état gardé sur la table. */
let sauveT = null;
const etatDuContrat = () => ({ planId: app.planId, liaisons: app.contrat.liaisons, source: app.source, nFolios: app.nFolios, budget: app.budget, plan: app.plan, nom: app.nom,
  designations: [...app.contrat.designations], sexes: [...(app.contrat.sexes || [])], charges: [...(app.contrat.charges || [])], raccords: [...(app.contrat.raccords || [])], provisoires: [...(app.contrat.provisoires || [])], cartouche: app.contrat.cartouche, t: Date.now() });
function ecrireContrat() { sauveT = null; const o = etatDuContrat();
  try { localStorage.setItem(CLE_CONTRAT, JSON.stringify(o)); heureSauve(o.t); } catch (_) { heureSauve(null); }
  if (typeof garderLePlan === 'function') garderLePlan(o); }
function sauver() { clearTimeout(sauveT); sauveT = setTimeout(ecrireContrat, 400); }
function sauverMaintenant() { if (sauveT) { clearTimeout(sauveT); ecrireContrat(); } }
function heureSauve(t) { const el = $('ctx-sauve');
  if (!t) { el.textContent = 'non enregistré'; el.classList.add('ko'); el.title = 'Le navigateur refuse d’enregistrer (navigation privée ?). Le travail tient tant que l’onglet est ouvert.'; return; }
  const d = new Date(t); el.textContent = 'enregistré ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); el.classList.remove('ko');
  el.title = 'Gardé dans ce navigateur. Rien n’est parti sur le réseau.'; }
function poserEtat(o) { app.contrat = contratNeuf(); app.planId = o.planId || '';
  app.contrat.liaisons = o.liaisons.map(liaison); app.source = o.source ? o.source.map(liaison) : null; app.nFolios = o.nFolios || 0; app.budget = o.budget || 16; app.plan = o.plan || '*'; app.nom = o.nom || '';
  app.contrat.designations = new Map(o.designations || []); app.contrat.sexes = new Map(o.sexes || []); app.contrat.charges = new Map(o.charges || []); app.contrat.raccords = new Map(o.raccords || []); app.contrat.provisoires = new Map(o.provisoires || []); if (o.cartouche) Object.assign(app.contrat.cartouche, o.cartouche);
  const P = plans(); if (app.plan === '*' && P.length > 1) app.plan = P[0];
  app.choisi = null; app.cible = null; app.actif = null;
  calibresVoltaALOuverture(); }   // un plan gardé avant la règle du calibre (v74) la reçoit en s'ouvrant
// le plan qui était sur la table à la fermeture revient (derrière la bibliothèque, qui s'ouvre au lancement)
function relire() { try { const j = localStorage.getItem(CLE_CONTRAT); if (!j) return false; const o = JSON.parse(j);
    if (!o || !o.liaisons || !o.liaisons.length) return false;
    poserEtat(o); redessiner(); retrouverVue(); heureSauve(o.t || Date.now()); return true; } catch (_) { return false; } }

/* ---- charger un contrat ----------------------------------------------- */
/* Un contrat NEUF : rien du contrat d'avant ne survit — ni désignations, ni sexes des contacts, ni profils de charge,
   ni raccords (les repères se répètent d'une machine à l'autre : le 102CB1 d'un retest prendrait le profil du 102CB1 de
   l'autre) ; le cartouche repart à neuf, sauf qui dessine et à quelle échelle, qui sont ceux du bureau. `relire()` rend
   les choix du contrat gardé ; Ctrl+Z rend ceux d'avant le chargement.
   LE PLAN qu'il devient (08-bibliotheque, `planPour`) : `o.planId` un plan nommé (l'exemple, un plan qu'on ouvre),
   `o.nouveau` un plan neuf de l'installation ouverte (un fichier ouvert) ; sans rien, le plan sur la table (le collage qui le
   remplace) — ou un plan neuf s'il n'y en a pas. La bibliothèque s'efface : le contrat est sur la table. */
function contratNeuf() { const d = app.contrat.cartouche, c = nouveauContrat(); c.cartouche.auteur = d.auteur; c.cartouche.echelle = d.echelle; return c; }
function chargerContrat(liaisons, quoi, nom, o) { sauverMaintenant(); histPush(quoi || 'chargement d’un contrat'); app.contrat = contratNeuf();
  app.contrat.liaisons = liaisons.map(liaison); app.source = null; app.nFolios = 0; app.choisi = null; app.cible = null; app.actif = null; app.nom = nom || app.nom;
  if (typeof planPour === 'function') app.planId = planPour(o || {}, app.nom, app.contrat.liaisons);
  app.base.filtre = ''; app.base.tri = null; app.base.enSaisie = false;
  if (document.activeElement && $('ba-tab').contains(document.activeElement)) document.activeElement.blur();
  const P = plans(); app.plan = P.length > 1 ? P[0] : '*';
  fermerFiche(); fermerMenu(); $('q').value = ''; if (typeof montrerLePlan === 'function') montrerLePlan();
  redessiner(); ajuster(); if (P.length <= 1) ajusterFolios(); sauver(); }
/* Ouvrir un fichier (ouvrirFichier : le retest, ou ce qu'il est — une bible, une norme, une base, un tableau à
   deviner — et l'erreur dite dans « Vos fichiers »), ficheHarnais (plusieurs harness : lequel ouvrir ?) vivent dans
   08-fichiers.js. */
/* Le dépôt : toute la fenêtre est la cible ; la bibliothèque ou une carte de « Vos fichiers » qui porte data-depot dit
   ce qu'on y dépose (des retests qui deviennent des plans — plusieurs à la fois —, la base des contrats déjà faits, la
   bible, une norme) — ailleurs, un retest (ou ce que le fichier se révèle être). La cible survolée s'allume. */
function lierDepot() { let n = 0, vise = null;
  const cible = e => e.target && e.target.closest ? e.target.closest('[data-depot]') : null;
  const viser = el => { if (vise === el) return; if (vise) vise.classList.remove('survol-depot'); vise = el; if (el) el.classList.add('survol-depot'); };
  window.addEventListener('dragenter', e => { e.preventDefault(); n++; document.body.classList.add('depot-actif'); viser(cible(e)); });
  window.addEventListener('dragover', e => { e.preventDefault(); viser(cible(e)); });
  window.addEventListener('dragleave', e => { e.preventDefault(); if (--n <= 0) { n = 0; document.body.classList.remove('depot-actif'); viser(null); } });
  window.addEventListener('drop', e => { e.preventDefault(); n = 0; document.body.classList.remove('depot-actif'); const c = cible(e), ou = c && c.dataset.depot; viser(null);
    const fs = e.dataTransfer && e.dataTransfer.files ? [...e.dataTransfer.files] : [], f = fs[0]; if (!f) return;
    if (ou === 'plans') ajouterPlans(fs); else if (ou === 'base') importerReferences(f); else if (ou === 'bible') importerBible(f); else if (ou === 'normes') importerNorme(f); else ouvrirFichier(f); }); }

/* ---- sortir le dessin : SVG, PNG, impression -------------------------- */
// le nom d'un folio enregistré : la même règle que les autres fichiers (`nomContrat`, ASCII et tirets) — l'audit v72 en
// voyait deux (« Contrat_d_exemple-folio-1.png », « Contrat-d-exemple-liaisons.csv »)
function nomFolio() { return nomContrat() + (app.plan !== '*' ? '-folio-' + (nomAscii(app.plan) || 'sans-nom') : ''); }
/* Un nom de fichier en ASCII : ouvert depuis file://, Chromium remplace par « download » tout nom qui porte un accent,
   une apostrophe ou un tiret cadratin. Les accents tombent, tout le reste devient un tiret. */
const nomAscii = nom => String(nom).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+(?=\.|$)/g, '');
const nomContrat = () => nomAscii((app.nom || 'contrat').replace(/\.[^.]+$/, '')) || 'contrat';
function telecharger(blob, nom) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nomAscii(nom);
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
function svgDuFolio() { return app.dessin ? svgAutonome(app.dessin, app.contrat.cartouche, folioCourant(), designationDe, null, calibresDuFolio) : null; }
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
function imprimer() { if (!app.dessin) return; const S = svgAutonome(app.dessin, app.contrat.cartouche, folioCourant(), designationDe, '#ffffff', calibresDuFolio);
  $('printroot').innerHTML = `<style>@page{size:A3 landscape;margin:8mm}</style>` + S.txt.replace(/^<\?xml[^>]*\?>\s*/, ''); window.print(); }

/* ---- ce que le menu et le rail affichent ------------------------------ */
const NOM_EXEMPLE = 'Contrat d’exemple';
/* L'en-tête du menu dit QUEL contrat est ouvert : le titre du cartouche si on en a écrit un, sinon le nom du fichier ;
   et que c'est l'exemple embarqué quand c'est lui (il ne s'ouvre qu'à la demande ; le fil de la barre du haut dit
   « Exemple »). La barre du haut et la bibliothèque suivent (08-bibliotheque). */
function synchroniserContexte() { const n = app.contrat.liaisons.length, P = plans(), nom = n ? (app.nom || 'Sans nom') : (app.planId ? 'Plan vide' : 'Aucun plan ouvert'), exemple = n && app.nom === NOM_EXEMPLE;
  // les nombres liés à leur mot (l'audit des pages : « 67 / repères » coupé au bout de la ligne du menu)
  const sous = n ? (exemple ? 'l’exemple embarqué · ' : '') + plurielLie(n, 'liaison') + ' · ' + plurielLie(reperesDuContrat().length, 'repère') + (P.length > 1 ? ' · ' + plurielLie(P.length, 'folio') : '') : '';
  $('ctx-nom').textContent = nom; $('ctx-txt').textContent = sous; $('ctx-nom').title = nom;
  if (typeof synchroniserBibliotheque === 'function') synchroniserBibliotheque();
  // « Comparer au déjà-fait » sans base déposée ne dit rien (le technicien) : éteint au gris lisible, sa bulle dit pourquoi
  // et où la déposer ; un clic l'ouvre quand même, qui le redit
  const df = document.querySelector('#menu [data-act="dejafait"]'); if (df) { const sans = !app.references;
    if (!df.dataset.aideBase) df.dataset.aideBase = df.dataset.aide || '';
    if (sans) df.setAttribute('aria-disabled', 'true');
    const t = 'Aucune base des contrats déjà faits pour l’instant : déposez-la dans Vos fichiers, puis comparez le plan aux contrats les plus proches.', aide = sans ? (typeof typo === 'function' ? typo(t) : t) : df.dataset.aideBase;
    if (df.dataset.aide !== aide) { df.dataset.aide = aide; const s = $(df.getAttribute('aria-describedby') || ''); if (s) s.textContent = aide; } } }
/* Défaire ↶ et refaire ↷ restent à leur place, éteints quand leur pile est vide. Leur bulle dit ce qu'ils feraient
   (« W-012 en DR12 ») : elle s'écrit quand elle paraît (l'événement `bulle`, 08-menu), pas à chaque geste — comparer deux
   états du contrat ne coûte rien une fois, mais rien n'oblige à le faire à chaque frappe. */
function synchroniserHistorique() { const u = $('btnUndo'), r = $('btnRedo'); u.disabled = !app.hist.length; if (r) r.disabled = !pileRefaire().length; }
function bulleDuGeste(b, refaire_) { const s = b.querySelector('.bulle-s'), d = b.querySelector('.bulle-detail'), p = refaire_ ? pileRefaire()[pileRefaire().length - 1] : app.hist[app.hist.length - 1];
  const t = !p ? '' : refaire_ ? recitDuGeste(etatSurLaTable(), p, p, 'court') : recitDuGeste(p, etatSurLaTable(), p, 'court');
  if (s) s.textContent = t; if (d) d.textContent = (refaire_ ? 'Refaire' : 'Défaire') + (t ? ' : ' + t : ''); }
/* LES COMPTES (le panel v73, le technicien : « je ne sais plus combien il m'en reste, donc je ne sais pas quand j'ai fini »).
   UNE règle partout : « problème » = rouge seulement, « à voir » = ambre, séparés par « · ». La source est le contrôle
   (08-controle, `compteProblemes` : sur tout le plan) ; il pose aussi la pastille du rail (`rendreControle`) et mène P
   (`problemeSuivant`). Ici, la BULLE des repères : replié, « Repères et problèmes R » et dessous « 5 problèmes · 9 à voir » ;
   déplié, « Repères et problèmes · 5 problèmes · 9 à voir ». Elle s'écrit quand elle paraît (et à chaque synchronisation). */
function bulleDesReperes() { const s = $('bulle-index'), d = $('bulle-index-detail'); if (!s && !d) return; const c = compteProblemes(), rien = !c.ko && !c.att;
  if (s) s.textContent = rien ? '' : c.mot; if (d) d.textContent = 'Repères et problèmes · ' + (rien ? 'rien à reprendre' : c.mot); }
/* LE RETEST CORRIGÉ, le vrai livrable (le technicien : « le bouton Exporter le plus visible sort un CSV, le retest corrigé
   est la 6ᵉ ligne d'un sous-menu »). Dès que le plan porte un changement, la pilule de la barre du haut le dit (« 3
   changements · Retest corrigé ») ; dans ⋮ › Exporter, sa ligne vient en tête avec son compte. Le compte est celui du
   retest corrigé (08-export, `nombreDeChangements`, `motChangements` : les liaisons dont une case diffère du fichier), lu,
   pas refait ; un clic ouvre son relevé (`exporterRetestCorrige`). */
function synchroniserRetest() { const n = app.contrat.liaisons.length ? nombreDeChangements() : 0, b = $('btnRetest'); if (!b) return;
  const avant = b.hidden, mod = plurielLie(n, 'liaison') + ' modifiée' + (n > 1 ? 's' : ''); b.hidden = !n;
  if (n) { $('en-retest-n').textContent = motChangements(n); b.setAttribute('aria-label', 'L’installation corrigée — ' + mod + ' ; relire ce qui part, puis l’enregistrer');
    b.querySelector('.bulle').textContent = 'L’installation corrigée : ' + mod + '. Un relevé montre ce qui part, puis l’Excel s’enregistre';
    // elle paraît : elle tombe d'un rien, une fois
    if (avant) { b.classList.remove('entre-v'); void b.offsetWidth; b.classList.add('entre-v'); } }
  const m = $('mn-retest'); if (m) m.textContent = n ? mod : 'aucune modification pour l’instant';
  const e = $('mn-exporter'); if (e) { e.hidden = !n; e.textContent = n ? 'installation corrigée · ' + motChangements(n) : ''; e.closest('button').classList.toggle('menu-2l', !!n); } }
function synchroniser() { synchroniserContexte(); synchroniserFolios(); synchroniserHistorique(); synchroniserRetouche(); rendreControle(); bulleDesReperes(); synchroniserRetest(); rafraichirBase(); rafraichirCarte(); montrerAttente(); }
/* LE RAIL SE DÉPLIE (le technicien : « la liste à puces avec une pastille, je la prends pour des notifications ; le ⊸+ pour un
   curseur de réglage ») : au survol prolongé — 250 ms, une main qui passe ne l'ouvre pas —, il montre le mot et la touche
   de chaque outil (style.css, `#rail.deplie`). Il se replie dès qu'on clique (et ne se rouvre pas sous la main restée là :
   il faut sortir et revenir), dès qu'on le quitte. Au clavier il reste plié : la bulle de chaque outil dit son nom, sa
   touche et son état, tout de suite (08-menu) — un palet qui s'élargit à chaque Tab couvrirait ce qu'on lit à côté.
   Seulement à la souris d'un ordinateur : au doigt, le rail est en bas, replié. */
const DEPLI = { tempo: 0, muet: false };
function lierRail() { const r = $('rail'); if (!r) return; const peut = () => matchMedia('(min-width: 701px) and (hover: hover)').matches;
  const plier = () => { clearTimeout(DEPLI.tempo); r.classList.remove('deplie'); }, deplier = () => { clearTimeout(DEPLI.tempo); if (peut()) r.classList.add('deplie'); };
  r.addEventListener('pointerenter', e => { if (e.pointerType === 'touch' || DEPLI.muet) return; clearTimeout(DEPLI.tempo); DEPLI.tempo = setTimeout(deplier, 250); });
  r.addEventListener('pointerleave', () => { DEPLI.muet = false; plier(); });
  r.addEventListener('pointerdown', () => { DEPLI.muet = true; plier(); });
  // un clic replie, et fait taire le rail jusqu'à ce que la main en sorte
  r.addEventListener('click', e => { if (e.detail > 0) DEPLI.muet = true; plier(); });
  $('btnUndo').addEventListener('bulle', e => bulleDuGeste(e.currentTarget, false)); $('btnIndex').addEventListener('bulle', bulleDesReperes);
  const redo = $('btnRedo'); if (redo) redo.addEventListener('bulle', e => bulleDuGeste(e.currentTarget, true)); }
/* LE MOT QUI PASSE (le toast) : une ligne, en haut, au milieu de la place du plan. Trois sortes :
   · l'information : elle passe (2,8 s) ;
   · l'erreur : elle RESTE jusqu'au clic (sur elle, ou n'importe où ailleurs) — on ne la perd pas en clignant des yeux ;
   · le geste : `dire(msg, erreur, { geste: 'Rétablir', faire })` pose un bouton dans le mot, 8 s. C'est la règle des
     confirmations (l'audit v72, § 3) : ce qui se défait se FAIT d'abord, et se rattrape là — plus jamais `confirm()` ;
     seul ce qui ne se rattrape pas se confirme dans sa carte. Le survol le retient (08-fichiers). `signaler`
     (08-fichiers, « Voir ») et `direAvecGeste` (08-bibliothèque) passent par le même bouton (`.toast-voir`). */
let toastT = null; const TOAST = { erreur: false, t: 0 };
const cacherToast = () => { clearTimeout(toastT); $('toast').classList.remove('on', 'action'); TOAST.erreur = false; };
/* Le temps qu'il reste : 2,8 s pour une ligne ; un mot plus long se lit plus longtemps (le technicien : « deux lignes
   effacées en 2,8 s, je n'ai pas eu le temps de lire le nom du fichier »), 6 s au plus ; 8 s quand il offre un geste. */
const dureeDuMot = (msg, geste) => geste ? 8000 : Math.min(6000, Math.max(2800, 1400 + String(msg).length * 45));
function dire(msg, erreur, o) { const t = $('toast'); t.textContent = msg; t.classList.toggle('erreur', !!erreur); t.classList.remove('action'); t.classList.add('on');
  clearTimeout(toastT); TOAST.erreur = !!erreur; TOAST.t = Date.now();
  if (o && o.geste && typeof o.faire === 'function') { const b = document.createElement('button'); b.type = 'button'; b.className = 'toast-voir toast-geste'; b.textContent = o.geste;
    b.addEventListener('click', e => { e.stopPropagation(); cacherToast(); o.faire(); }); t.appendChild(b); t.classList.add('action'); }
  placerToast(t);
  if (!erreur) toastT = setTimeout(() => t.classList.remove('on', 'action'), dureeDuMot(msg, o && o.geste));
  if (!TOAST.lie) { TOAST.lie = true;
    // l'erreur s'en va au premier clic qui la suit (pas celui qui l'a fait naître) ; sur un de ses boutons, il fait d'abord le sien
    document.addEventListener('pointerdown', e => { if (!TOAST.erreur || Date.now() - TOAST.t < 400 || (e.target.closest && e.target.closest('#toast button'))) return; cacherToast(); }, true); } }
/* Où il se pose : au milieu de la place du plan (style.css) ; une CARTE flottante est sous lui (le designer : « Problème
   1 / 10 chevauche la carte de 21 px », sur ses flèches ‹ ›) — il passe dans la plus grande place libre à côté d'elle,
   à 16 px d'elle, plus étroit s'il le faut. Seulement là : un document, le volet, la base SEE, la visionneuse ont leur
   règle (les feuilles de style). */
function placerToast(t) { t.classList.remove('evite'); const b = document.body, insp = $('inspecteur');
  if (innerWidth <= 700 || !b.classList.contains('insp-flotte') || b.matches('.fiche-ouverte, .pdf-ouvert, .visio-ouvert') || !insp || insp.hidden) return;
  const c = insp.getBoundingClientRect(), w = t.offsetWidth, h = t.offsetHeight, haut = t.getBoundingClientRect().top, rail = $('rail').getBoundingClientRect().right + 12;
  const x0 = rail + (innerWidth - rail) / 2; if (c.top > haut + h + 8 || c.bottom < haut || x0 + w / 2 < c.left - 16 || x0 - w / 2 > c.right + 16) return;
  const zones = [[rail, c.left - 16], [c.right + 16, innerWidth - 12]].map(([a, z]) => ({ a, z, l: z - a })).sort((p, q) => q.l - p.l), Z = zones[0]; if (Z.l < 220) return;
  t.style.setProperty('--toast-x', Math.round(Z.a + Z.l / 2) + 'px'); t.style.setProperty('--toast-max', Math.round(Math.min(560, Z.l)) + 'px'); t.classList.add('evite'); }
/* DÉFAIRE, REFAIRE — Ctrl+Z, Ctrl+Y (ou Ctrl+Maj+Z), ↶ et ↷ du rail : le mot dit l'ÉTAT D'ARRIVÉE (« Défait : W-012 revient en
   DR20 »), pas le nom du geste, et offre le geste inverse (« Refaire », « Défaire ») ; rien à faire, il le dit aussi (on
   ne se demande pas si ça a marché). La fiche ouverte se rouvre sur le même objet (08-fiche, `garderLaFiche`). */
const garderFiche = () => { if (typeof garderLaFiche === 'function') garderLaFiche(); };
function defaire() { garderFiche(); const q = annuler(); if (!q) { dire('Rien à défaire.'); return q; }
  dire('Défait : ' + (HISTOIRE.recit || q) + '.', false, { geste: 'Refaire', faire: refaireEtDire }); return q; }
function refaireEtDire() { garderFiche(); const q = refaire(); if (!q) { dire('Rien à refaire.'); return q; }
  dire('Refait : ' + (HISTOIRE.recit || q) + '.', false, { geste: 'Défaire', faire: defaire }); return q; }
/* ---- le menu ⋮ : peu de lignes ; Exporter et Plus s'ouvrent EN PLACE (page.html) -----------------------------------
   `montrerPanneau(nom)` : '' le menu, sinon un sous-menu, qui prend sa place (le menu garde sa largeur). Le clavier va à la
   première ligne du panneau montré — au retour, à la ligne qui avait ouvert le sous-menu. */
function ouvrirMenu() { $('menu').hidden = false; $('btnMenu').setAttribute('aria-expanded', 'true'); montrerPanneau(''); }
/* fermé, le menu revient à son panneau principal : il se rouvrira sur lui, le clavier sur sa première ligne. Il est fermé
   TOUT DE SUITE (le clavier, les tests, le geste qu'on vient de choisir n'attendent pas) ; ce qui s'efface en 120 ms est son
   DOUBLE, une image sans identifiants ni clavier (`.menu-part`, style.css) — sauf sous le mouvement réduit. */
function fermerMenu() { const m = $('menu'); if (!m.hidden) partirMenu(m); m.hidden = true; $('btnMenu').setAttribute('aria-expanded', 'false');
  m.querySelectorAll('.menu-panneau').forEach(p => { p.hidden = p.id !== 'mp-principal'; }); m.querySelectorAll('[data-sous]').forEach(b => b.setAttribute('aria-expanded', 'false')); }
function partirMenu(m) { if (matchMedia('(prefers-reduced-motion: reduce)').matches || !m.offsetParent) return;
  document.querySelectorAll('.menu-part').forEach(d => d.remove());
  const d = m.cloneNode(true); d.removeAttribute('id'); d.querySelectorAll('[id]').forEach(e => e.removeAttribute('id')); d.querySelectorAll('[role]').forEach(e => e.removeAttribute('role')); d.removeAttribute('role');
  d.classList.add('menu-part'); d.setAttribute('aria-hidden', 'true'); d.inert = true; m.after(d); d.scrollTop = m.scrollTop;
  const fin = () => d.remove(); d.addEventListener('animationend', fin, { once: true }); setTimeout(fin, 1000); }
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
// les gestes des lignes (data-act) : ceux de l'interface, puis ceux qu'un module ajoute (`entreeDuMenu`) — un `var`, pour
// qu'un module chargé avant celui-ci puisse déjà en poser
var MENU = (typeof MENU !== 'undefined' && MENU) || { actions: {} };
function lierMenu(actions) { const m = $('menu'); Object.assign(MENU.actions, actions);
  $('btnMenu').onclick = e => { e.stopPropagation(); m.hidden ? ouvrirMenu() : fermerMenu(); };
  m.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button'); if (!b) return;
    if (b.dataset.sous) montrerPanneau(b.dataset.sous);
    else if (b.hasAttribute('data-retour')) montrerPanneau('');
    else if (b.dataset.act && MENU.actions[b.dataset.act]) { fermerMenu(); MENU.actions[b.dataset.act](); } });
  m.addEventListener('keydown', e => { const p = panneauDuMenu(); if (!p) return; const sous = p.id !== 'mp-principal', ici = document.activeElement;
    const xs = [...p.querySelectorAll('button[role="menuitem"]')], i = xs.indexOf(ici), aller = k => xs[(k + xs.length) % xs.length].focus();
    const fait = { ArrowDown: () => aller(i + 1), ArrowUp: () => aller(i < 0 ? xs.length - 1 : i - 1), Home: () => aller(0), End: () => aller(xs.length - 1),
      ArrowRight: () => { if (ici && ici.dataset.sous) montrerPanneau(ici.dataset.sous); }, ArrowLeft: () => { if (sous) montrerPanneau(''); },
      Escape: sous ? () => montrerPanneau('') : null }[e.key];
    if (!fait) return; e.preventDefault(); e.stopPropagation(); fait(); });
  document.addEventListener('click', e => { if (!e.target.closest('#menuBoite')) fermerMenu(); }); }
/* UNE LIGNE DE PLUS DANS LE MENU, posée par un module (le dossier en PDF, le folio pour Visio…) sans toucher à page.html :
   `entreeDuMenu({ act, panneau: 'exporter' | 'plus' | 'principal', groupe: 'folio' | 'contrat' | …, titreGroupe, libelle,
   sous, aide, icone, raccourci, avant, faire, surLePlan })`. Elle se range dans son groupe (créé au besoin, avec son
   titre pour les lecteurs d'écran), avant la ligne `avant` si on la nomme ; sa bulle (`aide`, 160 signes au plus) se
   lit comme les autres ; `faire` est son geste — `surLePlan` le fait sur le plan (la bibliothèque s'efface). Une seconde
   pose de la même `act` remplace la première. Rend la ligne. À appeler d'un module chargé après celui-ci, ou au démarrage. */
const ICONE_MENU = '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/>';
function entreeDuMenu(o) { if (!MENU) MENU = { actions: {} }; const D = id => document.getElementById(id), P = D(o.panneau && o.panneau !== 'principal' ? 'mp-' + o.panneau : 'mp-principal'); if (!P || !o.act) return null;
  const vieille = P.querySelector(`[data-act="${CSS.escape(o.act)}"]`); if (vieille) vieille.remove();
  let g = o.groupe ? P.querySelector(`.menu-bloc[data-groupe="${CSS.escape(o.groupe)}"]`) : P.querySelector('.menu-bloc:last-of-type');
  if (!g) { g = document.createElement('div'); g.className = 'menu-bloc'; g.setAttribute('role', 'group'); g.dataset.groupe = o.groupe || ''; g.setAttribute('aria-label', o.titreGroupe || o.groupe || ''); P.appendChild(g); }
  const b = document.createElement('button'); b.setAttribute('role', 'menuitem'); b.dataset.act = o.act; if (o.sous) b.classList.add('menu-2l');
  b.innerHTML = `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${o.icone || ICONE_MENU}</svg><span class="menu-l">${esc(o.libelle || o.act)}${o.sous ? `<small>${esc(o.sous)}</small>` : ''}</span>${o.raccourci ? `<span class="raccourci">${esc(o.raccourci)}</span>` : ''}`;
  if (o.aide) { b.dataset.aide = typeof typo === 'function' ? typo(o.aide) : o.aide; const boite = D('menu-aides');
    if (boite) { const id = 'aide-' + o.act; let sp = D(id); if (!sp) { sp = document.createElement('span'); sp.id = id; boite.appendChild(sp); } sp.textContent = b.dataset.aide; b.setAttribute('aria-describedby', id); } }
  const avant = o.avant ? g.querySelector(`[data-act="${CSS.escape(o.avant)}"]`) : null; g.insertBefore(b, avant);
  if (typeof o.faire === 'function') MENU.actions[o.act] = o.surLePlan && typeof surLePlan === 'function' ? surLePlan(o.faire) : o.faire;
  return b; }
/* ---- LA FEUILLE DES RACCOURCIS (« ? ») -------------------------------------------------------------------------------
   L'audit v72 (P2-13) : « les raccourcis existent, ne se découvrent pas » — /, R, B, N au survol du rail, Ctrl+O dans ⋮,
   Maj+B, Alt+← →, F2 nulle part. Une feuille, posée sur la table comme une carte : ce qu'on fait au clavier, en cinq
   groupes ; « ? » l'ouvre (et Plus › Raccourcis clavier), Échap, « ? » ou un clic dehors la referment. Le panel v73 : elle
   dit TOUT — refaire, la palette (Ctrl+K), les touches d'une fiche et du cadran — et le clavier ne s'en échappe plus
   (aria-modal : Tab tourne dans la feuille). Une touche qui ne vaut qu'à un endroit le dit sous sa ligne. */
const RACCOURCIS = [
  ['Se repérer', [['Chercher un repère, un câble, un part number, une borne', ['/']], ['Chercher un objet ou une action (« pdf », « hypothèses »…)', ['Ctrl', 'K']], ['Les repères et les problèmes', ['R']],
    ['Le problème suivant, le précédent (les problèmes, puis ce qui est à voir)', ['P'], ['Maj', 'P']],
    ['Folio précédent, suivant', ['←'], ['→']], ['La feuille entière, puis le dessin au plus près', ['0']], ['Zoomer, dézoomer', ['+'], ['−']], ['À 100 %, à 200 %', ['1'], ['2']],
    ['Déplacer la vue (en glissant ; le bouton du milieu aussi)', ['Espace']]]],
  ['Lire en tableaux', [['Le récapitulatif, en moitié', ['B']], ['Le récapitulatif, en page', ['Maj', 'B']], ['La nomenclature', ['N']], ['Corriger une case', ['Entrée'], ['F2']], ['La case suivante', ['Tab']]]],
  ['Dans une fiche', [['La fiche d’avant, d’après ; revenir d’un renvoi', ['Alt', '←'], ['Alt', '→']], ['Renommer le repère', ['F2']],
    ['Le calibre : le cran d’avant, d’après|sur le cadran d’un disjoncteur', ['←'], ['→']], ['Retenir ce calibre ; rendre l’automatique|sur le cadran', ['Entrée'], ['Échap']], ['Fermer la fiche, revenir au plan', ['Échap']]]],
  ['Corriger', [['Défaire le dernier geste', ['Ctrl', 'Z']], ['Refaire ce qu’on vient de défaire', ['Ctrl', 'Y'], ['Ctrl', 'Maj', 'Z']], ['Pousser le bloc choisi d’un carreau (cinq avec Maj)', ['↑'], ['↓']]]],
  ['Ouvrir, sortir', [['Ouvrir une installation', ['Ctrl', 'O']], ['Imprimer le folio', ['Ctrl', 'P']], ['Fermer ce qui est ouvert, revenir', ['Échap']], ['Cette feuille', ['?']]]],
  ['Améliorer Volta', [['Noter une hésitation dans le carnet de séance|l’écran où vous êtes s’écrit avec elle', ['C']]]]];
const raccourcisOuverts = () => { const el = $('raccourcis'); return !!el && !el.hidden; };
function montrerRaccourcis() { fermerMenu(); let el = $('raccourcis');
  if (!el) { el = document.createElement('div'); el.id = 'raccourcis'; el.className = 'raccourcis'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'rk-titre');
    const touches = ks => ks.map(k => `<kbd>${esc(k)}</kbd>`).join(''), dt = q => { const [t, ou] = q.split('|'); return esc(t) + (ou ? `<small>${esc(ou)}</small>` : ''); };
    el.innerHTML = `<div class="rk-feuille"><header class="rk-tete"><h2 id="rk-titre">Raccourcis clavier</h2><button type="button" class="fi-x" id="rk-fermer" aria-label="Fermer (Échap)">${ico('fermer')}<span class="bulle" aria-hidden="true">Fermer<kbd>Échap</kbd></span></button></header>`
      + `<div class="rk-groupes">${RACCOURCIS.map(([t, xs]) => `<section class="rk-groupe"><h3>${esc(t)}</h3><dl>${xs.map(([quoi, ...ks]) => `<div class="rk-ligne"><dt>${dt(quoi)}</dt><dd>${ks.map(touches).join('<span class="rk-ou">ou</span>')}</dd></div>`).join('')}</dl></section>`).join('')}</div>`
      + `<p class="rk-pied">Le rail se déplie au survol : chaque outil y dit son nom et sa touche. Dans un champ, les touches s’écrivent.</p></div>`;
    document.body.appendChild(el);
    el.addEventListener('pointerdown', e => { if (!e.target.closest('.rk-feuille')) fermerRaccourcis(); });
    el.querySelector('#rk-fermer').onclick = fermerRaccourcis;
    // Tab tourne dans la feuille, d'où que parte le clavier (la page derrière comprise) : du dernier élément au premier, et
    // l'inverse (la croix, seule, garde le clavier)
    document.addEventListener('keydown', e => { if (e.key !== 'Tab' || !raccourcisOuverts()) return; const xs = [...el.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent); if (!xs.length) return;
      const i = xs.indexOf(document.activeElement), j = i < 0 ? (e.shiftKey ? xs.length - 1 : 0) : (i + (e.shiftKey ? -1 : 1) + xs.length) % xs.length; e.preventDefault(); e.stopPropagation(); xs[j].focus(); }, true); }
  RACCOURCIS.avant = document.activeElement; el.hidden = false;
  // elle se pose comme tout ce qui paraît (la règle d'entrée commune, style.css) — le voile, lui, est déjà là
  const f = el.querySelector('.rk-feuille'); f.classList.remove('entre-v'); void f.offsetWidth; f.classList.add('entre-v');
  // le clavier sur la feuille (Tab mène à la croix), sans l'anneau d'un bouton pressé
  f.tabIndex = -1; try { f.focus({ preventScroll: true }); } catch (_) { f.focus(); } }
function fermerRaccourcis() { const el = $('raccourcis'); if (!el || el.hidden) return; el.hidden = true; const a = RACCOURCIS.avant; RACCOURCIS.avant = null; if (a && a.focus && a.isConnected) try { rendreLeClavier(a); } catch (_) { } }
function basculerBible() { if (app.fiche && app.fiche.mode === 'bible') fermerFiche(true); else ficheBible(); }

/* ---- tout relier -------------------------------------------------------- */
function lierPanneau() {
  const o = (id, fn) => { const e = $(id); if (e) e.onclick = fn; };
  const choisirFichier = () => $('fichier').click();
  const exemple = () => ouvrirExemple();   // l'exemple embarqué, à la demande (08-fichiers)
  $('fichier').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) ouvrirFichier(f); e.target.value = ''; });
  $('fichier-bible').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) importerBible(f); e.target.value = ''; });
  o('btnBase', basculerBase); o('btnCherche', () => { if (rechercheOuverte()) fermerRecherche(); else ouvrirRecherche(); });
  // le bouton des repères ; un clic sur son compte rouge ouvre les PROBLÈMES (l'index, « à reprendre » déplié) — et ne
  // referme pas l'index déjà ouvert (on croyait ouvrir les problèmes, on fermait le panneau)
  o('btnIndex', e => { if (e && e.target && e.target.closest && e.target.closest('.rd-point')) ouvrirProblemes(); else basculerIndex(); });
  o('btnLiaison', nouvelleLiaison); o('btnBible', basculerBible);
  // le menu (page.html) : la bibliothèque (l'entrée principale), ouvrir un retest (il devient un plan de l'installation ouverte),
  // vos fichiers (la base des contrats déjà faits y a sa carte), le récapitulatif, la nomenclature ; Exporter (SVG, PNG,
  // imprimer, le suivi) ; Plus (coller, l'exemple, la bible, les normes, les hypothèses, le cartouche). Ce qui porte sur le
  // plan le remet sur la table quand la bibliothèque le cache (08-bibliotheque, `surLePlan`).
  lierMenu({ bibliotheque: () => montrerBibliotheque(), ouvrir: choisirFichier, fichiers: () => ficheFichiers(),
    recapitulatif: surLePlan(basculerBase), nomenclature: surLePlan(ficheNomenclature), dejafait: surLePlan(ficheDejaFaitContrat),
    svg: surLePlan(exporterSVG), png: surLePlan(exporterPNG), imprimer: surLePlan(imprimer), dossierpdf: surLePlan(exporterDossierPdf), retestcorrige: surLePlan(exporterRetestCorrige), suivi: surLePlan(exporterSuivi),
    nomenclaturecsv: surLePlan(() => { if (!verite().length) { dire('Aucun plan ouvert : rien à compter.'); return; } exporterNomenclature(); }),
    coller: ficheColler, exemple, bible: ficheBible, normes: () => ficheNormes(), hypotheses: ficheHypotheses, cartouche: surLePlan(ficheCartouche), raccourcis: montrerRaccourcis });
  o('btnUndo', defaire); o('btnRedo', refaireEtDire);
  // la pilule du retest corrigé : le relevé de ce qui part, puis l'Excel (08-export)
  o('btnRetest', surLePlan(exporterRetestCorrige));
  o('btnAuto', revenirAutomatique);
  o('fo-prev', () => allerAuFolio(-1)); o('fo-next', () => allerAuFolio(+1));
  lierRail(); if (typeof lierBullesDuChrome === 'function') lierBullesDuChrome();
  const strip = $('fo-strip'); strip.addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) allerAuPlan(c.dataset.plan); });
  // le nom entier d'un folio, dans la bulle de la planche (pas l'infobulle du système) : une bulle pour toute la bande,
  // posée au-dessus de la puce survolée — dans la puce, elle serait rognée par la bande qui défile. Elle suit la règle des
  // bulles du chrome (08-menu) : 400 ms la première, tout de suite si une bulle vient de se fermer, éteinte au clic
  const bulle = document.createElement('span'); bulle.className = 'bulle fo-bulle'; bulle.setAttribute('aria-hidden', 'true'); $('folios').appendChild(bulle);
  let tempo = 0; const cacher = () => { clearTimeout(tempo); if (bulle.classList.contains('on') && typeof bulleEteinte === 'function') bulleEteinte(); bulle.classList.remove('on'); };
  strip.addEventListener('pointerover', e => { const c = e.target.closest('.chip'); if (!c || e.pointerType === 'touch') return; clearTimeout(tempo);
    const vite = bulle.classList.contains('on') || (typeof bulleChaude === 'function' && bulleChaude());
    tempo = setTimeout(() => { const r = c.getBoundingClientRect(), f = $('folios').getBoundingClientRect(); bulle.textContent = c.dataset.nom;
      bulle.style.left = Math.max(4, Math.min(r.left + r.width / 2 - f.left, f.width - 4)) + 'px'; bulle.classList.add('on'); }, vite ? 0 : 400); });
  strip.addEventListener('pointerleave', cacher); strip.addEventListener('pointerdown', cacher); strip.addEventListener('scroll', cacher, { passive: true });
  // la bande des folios défile à la molette (elle n'a pas de barre), la liste déroulante y va d'un choix
  strip.addEventListener('wheel', e => { if (!e.deltaY || e.deltaX || strip.scrollWidth <= strip.clientWidth) return; e.preventDefault(); strip.scrollLeft += e.deltaY; }, { passive: false });
  const sel = $('fo-select'); if (sel) sel.addEventListener('change', () => allerAuPlan(sel.value));
  // au téléphone, la bande des folios se pose au-dessus de l'inspecteur : sa hauteur (celle de la fiche ouverte) se dit au style par le jeton --insp-h
  // (v77 : la fiche s'ouvre pliée, elle grandit quand on déplie) la feuille entière au-dessus du tiroir y reste : le tiroir
  // qui monte sur elle la fait se recadrer dans la place qui reste
  let hInsp = 0, tInsp = 0;
  const insp = $('inspecteur'); if (window.ResizeObserver) new ResizeObserver(() => { const h = insp.hidden ? 0 : insp.offsetHeight; document.documentElement.style.setProperty('--insp-h', h + 'px');
    // (la feuille cadrée par Volta — pas un zoom à la main — que le tiroir a fini par couvrir)
    if (telephone() && h > hInsp && app.dessin && app.dessin.bbox) { clearTimeout(tInsp); tInsp = setTimeout(() => { try { if (insp.hidden || (typeof VUE !== 'undefined' && VUE.main)) return;
      const q = insp.getBoundingClientRect(), r = $('planche').getBoundingClientRect(), bb = app.dessin.bbox, bas = r.top + app.vue.ty + (bb.y + bb.h) * app.vue.s;
      const s = app.vue.s, haut = r.top + app.vue.ty + bb.y * s, g = r.left + app.vue.tx + bb.x * s, d = g + bb.w * s;
      // la feuille entière était en vue (sa tête, ses deux côtés) et le tiroir lui mange le pied : elle se recadre au-dessus
      if (bas > q.top + 2 && haut >= r.top - 2 && g >= r.left - 2 && d <= r.right + 2) ajuster(true); } catch (_) { } }, 120); }
    hInsp = h; }).observe(insp);
  o('zin', () => zoomer(1.25)); o('zout', () => zoomer(1 / 1.25)); o('zfit', () => ajuster(true)); o('zlbl', () => ajuster(true));
  lierRecherche(); lierDepot(); lierBase(); lierControle();
  window.addEventListener('keydown', e => {
    const dansChamp = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '');
    // C : le carnet de séance, sur tous les écrans (08-bilan) — jamais dans un champ, ni sous la feuille des raccourcis
    if (!dansChamp && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'c' && typeof ouvrirCarnet === 'function' && !raccourcisOuverts()) { e.preventDefault(); ouvrirCarnet(); return; }
    // la bibliothèque ouverte : ses touches (Échap remonte, « / » cherche) ; celles du plan, caché dessous, se taisent
    if (toucheBibliotheque(e, dansChamp)) return;
    // Échap ferme d'abord ce qui est ouvert par-dessus : la feuille des raccourcis, le menu ⋮, la recherche, le « ⋯ »
    // d'une fiche, les colonnes du récapitulatif (puis la fiche, au second appui ; puis le récapitulatif)
    const plusFiche = $('fi-menu-liste'), colonnes = $('ba-colonnes-menu');
    // (le clavier rendu au ⋮ ne fait pas paraître sa bulle : elle couvrait la croix du document ouvert — `rendreLeClavier`)
    if (e.key === 'Escape') { if (raccourcisOuverts()) fermerRaccourcis(); else if (!$('menu').hidden) { fermerMenu(); rendreLeClavier($('btnMenu')); } else if (rechercheOuverte()) { fermerRecherche(); $('q').blur(); }
      else if (plusFiche && !plusFiche.hidden) { plusFiche.hidden = true; const m = $('fi-menu'); if (m) { m.setAttribute('aria-expanded', 'false'); m.focus(); } }
      else if (colonnes && !colonnes.hidden) { fermerMenuColonnes(); $('ba-colonnes').focus(); }
      else if (dansChamp) e.target.blur();   // dans un champ, Échap ne fait que le quitter
      else if (app.fiche) fermerFiche(true);
      // (v78) le grand se réduit d'abord en carte ; la carte se ferme au second appui
      else if (app.cible && typeof NIVEAU !== 'undefined' && NIVEAU.grand && !$('inspecteur').hidden) reduireFiche();
      else if (app.cible || !$('inspecteur').hidden) deselectionner(); else fermerBase(); return; }
    // Ctrl+Z défait ; Ctrl+Y et Ctrl+Maj+Z (⌘⇧Z) REFONT — jamais ne défont (le panel v73 : Ctrl+Maj+Z défaisait un second geste)
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !dansChamp && (e.key.toLowerCase() === 'y' || e.key.toLowerCase() === 'z' && e.shiftKey)) { e.preventDefault(); refaireEtDire(); return; }
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'z' && !dansChamp) { e.preventDefault(); defaire(); return; }
    // Ctrl+K : la palette des objets et des actions (la recherche, `ouvrirPalette`), quand elle est là
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k' && typeof ouvrirPalette === 'function') { e.preventDefault(); ouvrirPalette(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') { e.preventDefault(); imprimer(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); choisirFichier(); return; }
    if (dansChamp || e.ctrlKey || e.metaKey || e.altKey) return;
    if (raccourcisOuverts()) { if (e.key === '?') fermerRaccourcis(); return; }   // la feuille ouverte : seule Échap (ou ?) la ferme
    if (e.key === '?') { e.preventDefault(); montrerRaccourcis(); return; }
    // P : un pas par POINT, les problèmes puis ce qui est à voir (08-controle) — les nombres de la pastille
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); problemeSuivant(e.key === 'P' ? -1 : 1); return; }
    if (e.key === '/') { e.preventDefault(); ouvrirRecherche(); }
    else if (e.key === 'b') basculerBase();
    else if (e.key === 'r') { e.preventDefault(); basculerIndex(); }   // sinon le « r » s'écrit dans le champ de l'index qui vient de prendre le focus
    else if (e.key === 'n') { if (app.fiche && app.fiche.mode === 'nomenclature') fermerFiche(true); else if (verite().length) ficheNomenclature(); }
    // ← → : le folio voisin, sauf le clavier sur un contrôle d'un panneau (`flechesAuFolio`, « les folios », v74)
    else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && flechesAuFolio(e.target)) allerAuFolio(e.key === 'ArrowLeft' ? -1 : 1);
    else if (e.key === '+' || e.key === '=') zoomer(1.25); else if (e.key === '-') zoomer(1 / 1.25); else if (e.key === '0' || e.key === 'f') ajuster(true); });
  let rT; window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { if (telephone()) ajuster(); else appliquerVue();
    rafraichirCarte(); if (app.fiche && app.fiche.mode === 'bible' && app.fiche.ref) ficheBible(app.fiche.ref); }, 160); });
  window.addEventListener('orientationchange', () => setTimeout(() => ajuster(), 300));
}
