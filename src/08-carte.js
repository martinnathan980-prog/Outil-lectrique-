/* ===========================================================================
   08 — LA CARTE : la fiche qui naît du clic (v72, « Nuit bleue »)
   Le lecteur (20 octobre 2026) : « quand tu cliques, ça s'ouvre sur un volet à droite, il est statique — pourquoi pas
   quelque chose de waouh : ça s'ouvre à partir de là où tu cliques, une pop-up que tu peux bouger un peu partout ».
   L'inspecteur devient une CARTE FLOTTANTE : elle grandit depuis la boîte même du bloc cliqué (280 ms, vive puis
   freinée), se pose à côté de lui là où elle cache le moins — jamais le bloc, ni ses câbles, ni où ils arrivent (l'audit
   v72), entière plutôt que coupée, la table libre avant la feuille —, un fil fin l'y relie et le suit quand on déplace
   le plan ou la carte ; posée sous la souris, elle fait oublier au plan ce qu'il allumait au survol ; on la
   tient par sa barre (ou son symbole) ; l'épingle — un bouton de la
   barre, ou la porter au bord droit, où le quai se dessine — en fait le volet d'hier, qui recadre le plan à côté ; Échap
   ou un clic dehors la rendent au bloc, où elle se résorbe. Un autre bloc cliqué : elle y glisse (sauf si on l'a posée à
   la main et qu'elle ne le cache pas). Le plan qui se centre de lui-même (la recherche, l'index) et l'amènerait sous elle
   : elle s'écarte. Elle ne prend aucune place au plan (`marges`, 08-interface). Le récapitulatif ouvert, elle se range en
   volet (le tableau s'arrête à côté d'elle). Au téléphone, rien de cela : le tiroir.
   Ce module ne fait que la géométrie et le mouvement ; ce qu'elle montre est la fiche (08-fiche) ou l'index (08-interface).
   Les classes du corps : `insp-flotte` (ouverte, flottante), `insp-epingle` (ouverte, en volet), `carte-tenue` (on la
   déplace), `carte-quai` (portée au bord : elle s'épinglera). Le mouvement réduit coupe les élans, pas les gestes.
   =========================================================================== */
'use strict';

const CARTE = { epingle: false, origine: null, deplacee: false, appui: null, prise: null, ecart: 0 };
// une fiche, pas un volet ; plus large sur un grand écran (l'ingénieur v73 : « à 1920, la carte garde 440 px alors qu'il y a
// la place : les contacts tiendraient sur une ligne, la courbe du disjoncteur gagnerait un quart »)
// AGRANDIE (le lecteur, v74 : « la pop-up, je ne peux pas l'agrandir ») : deux fois plus large et toute la hauteur de l'écran
const CARTE_L = () => (CARTE.grande ? Math.min(Math.round(window.innerWidth * 0.6), window.innerWidth >= 1800 ? 980 : 840) : window.innerWidth >= 1800 ? 500 : 420);
// au plus : au-delà elle défile — une carte, pas un pan d'écran (v73 : 680, le cadran d'un disjoncteur en vue sous sa carte de décision)
const carteH = () => (CARTE.grande ? 4000 : 680);
const CARTE_AIR = 44;           // l'air entre le bloc et la carte : le fil y passe
const CARTE_COURBE = 'cubic-bezier(.2,.8,.2,1)';
/* Flottante, sauf épinglée, au téléphone (le tiroir) — et le RÉCAPITULATIF ouvert : on y travaille en tableaux, la fiche
   se range en volet à droite et le tableau s'arrête à côté d'elle (une carte posée dessus en cacherait les boutons) */
const carteFlottante = () => !CARTE.epingle && !telephone() && !(typeof app !== 'undefined' && app.base && app.base.ouvert);
// les classes du corps disent ce qu'est l'inspecteur ouvert : une carte, ou le volet épinglé ; fermé, ni l'un ni l'autre
function modeCarte() { const ouvert = !$('inspecteur').hidden, b = document.body, tel = telephone(), flotte = carteFlottante();
  b.classList.toggle('insp-flotte', ouvert && flotte); b.classList.toggle('insp-epingle', ouvert && !tel && !flotte); }

/* ---- D'OÙ ELLE NAÎT ------------------------------------------------------------------------------------------------ */
// `v` : une autre vue que celle de l'écran (celle où le plan va, quand il glisse : 08-interface, `vueVisee`)
const rectDuMonde = (x, y, w, h, v) => { const r = cadre(), V = v || app.vue, s = V.s; return { left: r.left + V.tx + x * s, top: r.top + V.ty + y * s, width: w * s, height: h * s }; };
/* Le bloc choisi (sa boîte suit le plan) ; sinon l'endroit du clic (un câble, une barrette à poser : le point du dessin
   sous le doigt) ; sinon le milieu du câble ; sinon le bouton des repères (l'index). */
function origineDeLaCible() { const c = app.cible, d = app.dessin, recent = CARTE.appui && Date.now() - CARTE.appui.t < 900;
  if (c && c.type === 'bloc' && d && d.compDe.get(c.nom)) return { type: 'bloc', nom: c.nom };
  if (c && recent && d) { const w = versMonde(CARTE.appui.x, CARTE.appui.y); return { type: 'point', x: w.x, y: w.y }; }
  if (c && c.type === 'fil' && d) { const w = c.f || filDe(c.l); if (w && w.pts && w.pts.length) { const a = w.pts[0], b = w.pts[1] || a; return { type: 'point', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; } }
  if (!c && app.insp.index) return { type: 'ecran', rect: $('btnIndex').getBoundingClientRect() };
  return null; }
function rectDeLOrigine(o, v) { o = o || CARTE.origine; if (!o) return null;
  if (o.type === 'ecran') return o.rect;
  if (!app.dessin) return null;
  if (o.type === 'bloc') { const k = app.dessin.compDe.get(o.nom); return k ? rectDuMonde(k.x, k.y, k.w, k.h, v) : null; }
  const r = rectDuMonde(o.x, o.y, 0, 0, v); return { left: r.left - 7, top: r.top - 7, width: 14, height: 14 }; }


/* ---- OÙ ELLE SE POSE ----------------------------------------------------------------------------------------------- */
const jetonPx = n => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)) || 0;
// sous la barre du haut, à droite du rail, à un jeu des bords
function zoneDeLaCarte() { const j = jetonPx('--jeu') || 10; return { L: (jetonPx('--rail') || 64) + 2, T: (jetonPx('--entete') || 52) + j, R: window.innerWidth - j, B: window.innerHeight - j }; }
/* CE QU'ELLE NE DOIT PAS CACHER (l'audit v72 : « la carte cache les câbles du bloc cliqué » ; « à 1440, la carte de
   102CB1 se pose sur 395SW1 et son cadran est coupé ») : le bloc, interdit ; le départ de chacun de ses câbles — du bloc
   jusqu'au premier coude, le suivant aussi si le premier n'est qu'un ergot —, très lourd ; le reste de ses câbles et les
   blocs où ils arrivent (ses voisins : on lit la fiche en regardant où vont ses câbles), lourds ; ce qui est dessiné
   d'autre (les blocs, les câbles), un peu ; la feuille blanche, un rien (« à 1920, elle se pose sur le plan alors que
   300 px de table restent libres » : la table d'abord). D'un câble cliqué : le point du clic, interdit ; son tracé, lourd
   près du clic. Des rectangles d'écran { left, top, right, bottom, poids } ; `v` : la vue où le plan va (s'il glisse). */
const POIDS_CARTE = { depart: 40, cable: 8, voisin: 5, bloc: 1.2, autre: .6, feuille: .2 };
const feuilleALEcran = v => { const d = app.dessin; if (!d || !d.bbox) return null; const V = v || app.vue, r = cadre(), b = d.bbox;
  return { left: r.left + V.tx + b.x * V.s, top: r.top + V.ty + b.y * V.s, right: r.left + V.tx + (b.x + b.w) * V.s, bottom: r.top + V.ty + (b.y + b.h) * V.s }; };
function zonesAProteger(v) { const o = CARTE.origine, d = app.dessin, out = [], P = POIDS_CARTE;
  // la barre du bas (les folios, le zoom) : elle mène ailleurs, la carte ne s'y pose pas
  const pied = $('folios'); if (pied && !pied.hidden) [...pied.children].forEach(c => { const b = c.getBoundingClientRect(); if (b.width > 40 && b.height > 20) out.push({ left: b.left - 8, right: b.right + 8, top: b.top - 8, bottom: b.bottom + 8, poids: P.depart, pied: true }); });
  if (!o || !d || o.type === 'ecran') return out;
  const V = v || app.vue, r = cadre(), X = x => r.left + V.tx + x * V.s, Y = y => r.top + V.ty + y * V.s;
  const F = feuilleALEcran(V); if (F) out.push({ ...F, poids: P.feuille });
  const nom = o.type === 'bloc' ? o.nom : null, L0 = liaisonsDuPlan(), cable = app.cible && app.cible.type === 'fil' ? (app.cible.f || filDe(app.cible.l)) : null;
  // ses voisins : les repères à l'autre bout de ses câbles
  const voisins = new Set(); if (nom) L0.forEach(l => { if (l.de === nom && l.vers !== nom) voisins.add(l.vers); else if (l.vers === nom && l.de !== nom) voisins.add(l.de); });
  d.comps.forEach(k => { if (k.name === nom) return; const pres = voisins.has(k.name); if (k.kind === 'tag' && !pres) return;
    out.push({ left: X(k.x), right: X(k.x + k.w), top: Y(k.y), bottom: Y(k.y + k.h), poids: pres ? P.voisin : P.bloc }); });
  d.fils.forEach(f => { const l = L0[f.i]; if (!f.pts || f === cable || (l && nom && (l.de === nom || l.vers === nom))) return;
    for (let i = 0; i < f.pts.length - 1; i++) { const a = f.pts[i], b = f.pts[i + 1]; out.push({ left: Math.min(X(a.x), X(b.x)) - 3, right: Math.max(X(a.x), X(b.x)) + 3, top: Math.min(Y(a.y), Y(b.y)) - 3, bottom: Math.max(Y(a.y), Y(b.y)) + 3, poids: P.autre }); } });
  const seg = (a, b, poids, marge) => out.push({ left: Math.min(X(a.x), X(b.x)) - marge, right: Math.max(X(a.x), X(b.x)) + marge, top: Math.min(Y(a.y), Y(b.y)) - marge, bottom: Math.max(Y(a.y), Y(b.y)) + marge, poids });
  const L = liaisonsDuPlan();
  if (o.type === 'bloc') { const k = d.compDe.get(o.nom); if (!k) return out;
    out.push({ left: X(k.x) - 8, right: X(k.x + k.w) + 8, top: Y(k.y) - 8, bottom: Y(k.y + k.h) + 8, poids: Infinity });
    const pres = p => p.x >= k.x - 24 && p.x <= k.x + k.w + 24 && p.y >= k.y - 24 && p.y <= k.y + k.h + 24;
    d.fils.forEach(f => { const l = L[f.i]; if (!l || (l.de !== o.nom && l.vers !== o.nom) || !f.pts || f.pts.length < 2) return;
      const n = f.pts.length, pts = pres(f.pts[0]) || !pres(f.pts[n - 1]) ? f.pts : [...f.pts].reverse();
      let i = 1; seg(pts[0], pts[1], P.depart, 10); if (n > 2 && Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) * V.s < 28) { seg(pts[1], pts[2], P.depart, 10); i = 2; }
      for (; i < n - 1; i++) seg(pts[i], pts[i + 1], P.cable, 6); }); }
  else { const p = { left: X(o.x) - 10, right: X(o.x) + 10, top: Y(o.y) - 10, bottom: Y(o.y) + 10, poids: Infinity }; out.push(p);
    const c = app.cible, w = c && c.type === 'fil' ? (c.f || filDe(c.l)) : null;
    if (w && w.pts) for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1], m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      seg(a, b, Math.hypot(X(m.x) - X(o.x), Y(m.y) - Y(o.y)) < 220 ? 40 : 3, 8); } }
  return out; }
/* Se poser à côté de son bloc, là où elle cache le moins : à droite d'abord (on lit de gauche à droite : le bloc, puis sa
   fiche), à gauche, dessous, dessus — chaque côté à plusieurs hauteurs, le haut et le bas de l'écran compris — ; la table
   libre à côté de la feuille, ou le bord de l'écran. Chaque place coûte ce qu'elle cache (la surface des zones, pondérée),
   ce qu'elle perd de hauteur (plus courte, elle défile : le cadran d'un disjoncteur coupé, c'est la fiche qu'on ne lit
   plus — aussi lourd que ce qu'elle cacherait), sa distance au bloc (le fil s'allonge ; un rien, la table libre vaut un
   détour) et un rien d'ordre. Le bloc n'est jamais dessous ; quand un côté porte ses câbles, elle passe de l'autre.
   `v` : la vue où le plan va ; `diag` : rendre toutes les places pesées (les batteries, la mise au point). */
const COUT_CARTE = { hauteur: .5, distance: 20, rang: 400 };
function placerPres(b, W, H, v, diag) { const Z = zoneDeLaCarte(), e = CARTE_AIR, cl = (x, a, z) => Math.max(a, Math.min(z, x)), HMIN = Math.min(H, 300), C = COUT_CARTE;
  if (!b) return { x: Z.R - W - 6, y: Z.T, h: Math.min(H, Z.B - Z.T) };
  const zones = zonesAProteger(v), places = [];
  // `dispo` : la hauteur que la place lui laisse ; elle y est pesée à sa hauteur d'aujourd'hui (au plus H), et pourra y
  // grandir quand on ouvre une section (le cadran du calibre) — jusqu'à carteH(), jamais sur son bloc
  // (au-dessus de la barre du bas, elle s'arrête à son filet : elle y grandira sans jamais la couvrir — v73, la galerie d'une
  // barrette ouverte posait la carte sur les folios)
  const pieds = zones.filter(z => z.pied);
  const essai = (x, y, dispo, rang, ou) => { x = cl(x, Z.L, Z.R - W); let bas = Z.B; for (const z of pieds) if (x < z.right && x + W > z.left && z.top >= y) bas = Math.min(bas, z.top);
    // (trop bas pour sa hauteur au-dessus de la barre : elle remonte d'autant — entière, sans couvrir les folios)
    if (bas < Z.B && bas - y < H) y = Math.max(Z.T, bas - H); dispo = Math.min(dispo, Z.B - y, bas - y);
    const h = Math.min(dispo, H); if (y < Z.T || h < HMIN) return;
    const perte = (H - h) * W * C.hauteur, loin = Math.hypot(x + W / 2 - (b.left + b.width / 2), y + h / 2 - (b.top + b.height / 2)) * C.distance;
    let cache = 0; for (const z of zones) { const dx = Math.min(x + W, z.right) - Math.max(x, z.left), dy = Math.min(y + h, z.bottom) - Math.max(y, z.top); if (dx > 0 && dy > 0) cache += z.poids * dx * dy; }
    places.push({ x, y, h: dispo, cout: rang * C.rang + perte + loin + cache, ou, perte: Math.round(perte), loin: Math.round(loin), cache: Math.round(cache) }); };
  const droite = b.left + b.width + e, gauche = b.left - e - W, dessous = b.top + b.height + e, F = feuilleALEcran(v);
  for (const y of [b.top - 14, b.top + b.height + 14 - H, (b.top + b.height / 2) - H / 2, Z.T, Z.B - H]) {
    const yy = cl(y, Z.T, Math.max(Z.T, Z.B - H)), D = Z.B - yy; if (droite + W <= Z.R) essai(droite, yy, D, 0, 'droite'); if (gauche >= Z.L) essai(gauche, yy, D, 1, 'gauche');
    // la table libre à côté de la feuille, quand elle a la largeur de la carte
    if (F && F.right + 18 + W <= Z.R) essai(Math.max(F.right + 18, droite), yy, D, 0, 'table à droite'); if (F && F.left - 18 - W >= Z.L) essai(Math.min(F.left - 18 - W, gauche), yy, D, 1, 'table à gauche');
    // ou contre le bord de l'écran, sur la table libre qu'il y a et le bord de la feuille
    if (droite < Z.R - W) essai(Z.R - W, yy, D, .5, 'bord droit'); if (gauche > Z.L) essai(Z.L, yy, D, 1.5, 'bord gauche'); }
  for (const x of [b.left, b.left + b.width / 2 - W / 2, b.left + b.width - W]) {
    essai(x, dessous, Z.B - dessous, 2, 'dessous');
    const haut = b.top - e, hh = Math.min(H, haut - Z.T); if (hh >= HMIN) essai(x, haut - hh, hh, 3, 'dessus'); }
  places.sort((a, c) => a.cout - c.cout); if (diag) return places;
  if (places.length) { const p = places[0]; return { x: p.x, y: p.y, h: p.h }; }
  // rien ne tient : du côté qui a le plus de place, rentrée dans l'écran
  const yA = cl(b.top - 14, Z.T, Z.B - H);
  return Z.R - (b.left + b.width) >= b.left - Z.L ? { x: cl(droite, Z.L, Z.R - W), y: yA } : { x: cl(gauche, Z.L, Z.R - W), y: yA }; }
/* la poser : sa place et sa hauteur au plus (--carte-x, --carte-y, --carte-hmax, style.css) ; `h` : plus courte que l'écran
   ne le permet (posée au-dessus de son bloc) ; jamais tout à fait hors de l'écran */
function poserCarte(x, y, h) { const s = $('inspecteur').style, Z = zoneDeLaCarte();
  x = Math.max(Z.L - 40, Math.min(Z.R - 120, x)); y = Math.max(Z.T - 2, Math.min(Z.B - 56, y));
  s.setProperty('--carte-x', Math.round(x) + 'px'); s.setProperty('--carte-y', Math.round(y) + 'px'); s.setProperty('--carte-l', CARTE_L() + 'px');
  s.setProperty('--carte-hmax', Math.round(Math.min(carteH(), Z.B - y, h || Infinity)) + 'px'); }
const poserA = p => poserCarte(p.x, p.y, p.h);

// sa taille libre (au plus carteH(), au plus l'écran), mesurée avant de la poser
function mesurerCarte() { const el = $('inspecteur'), Z = zoneDeLaCarte();
  el.style.setProperty('--carte-l', CARTE_L() + 'px'); el.style.setProperty('--carte-hmax', Math.min(carteH(), Z.B - Z.T) + 'px');
  return { W: el.offsetWidth || CARTE_L(), H: el.offsetHeight || 400 }; }
const seCoupent = (a, c) => !(a.left > c.right || a.left + a.width < c.left || a.top > c.bottom || a.top + a.height < c.top);

/* Ouvrir (08-interface, `ouvrirInspecteur`, la fiche déjà rendue) : fermée, elle naît de son origine ; ouverte, un autre
   bloc cliqué sur le plan l'y fait glisser — sauf si on l'a posée à la main et qu'elle ne le cache pas ; ouverte depuis
   la fiche elle-même (‹ ›, un câble de la liste), elle reste où elle est et le fil change de bout. */
function poserLaCarte(etait, avant, vieille) { const el = $('inspecteur'), m = mesurerCarte(), b = rectDeLOrigine(), o = CARTE.origine;
  if (!etait) { CARTE.deplacee = false; poserA(placerPres(b, m.W, m.H)); naitreCarte(el, b); prendreLeClavier(el); return; }
  const depuisPlan = !!(CARTE.appui && Date.now() - CARTE.appui.t < 900);
  const meme = vieille && o && vieille.type === o.type && vieille.nom === o.nom && vieille.x === o.x;
  if (depuisPlan && !meme && b && (!CARTE.deplacee || seCoupent(b, avant))) { poserA(placerPres(b, m.W, m.H)); glisserCarte(el, avant); }
  else { poserCarte(avant.left, avant.top, parseFloat(el.style.getPropertyValue('--carte-hmax')) || 0); dessinerLien(); } }

/* LES COURBES DU MOUVEMENT (le socle v73, style.css) : ce qui PARAÎT (vif, très freiné), ce qui PART (il accélère), ce qui
   VA de A à B sous les yeux (il glisse) — lues dans les jetons, les mêmes que les feuilles. */
const COURBES_CARTE = { entree: 'cubic-bezier(.32,.72,0,1)', sortie: 'cubic-bezier(.4,0,1,1)', glisse: 'cubic-bezier(.65,0,.35,1)' };
const courbeCarte = n => { try { const v = getComputedStyle(document.documentElement).getPropertyValue('--courbe-' + n).trim(); if (v) return v; } catch (_) { } return COURBES_CARTE[n]; };
// l'échelle d'où la carte part (et où elle rentre) : UNIFORME — la plus grande des deux proportions bloc / carte, entre 0,16 et
// 0,5 — jamais sx ≠ sy : ni texte écrasé ni coins ovales (le designer v73)
const echelleDuBloc = (b, r) => Math.min(0.5, Math.max(0.16, b.width / r.width, b.height / r.height));
/* NAÎTRE (v73, le moment signature n° 1 : « la carte se déplie du bloc ») : la carte ENTIÈRE part du CENTRE du bloc, à une
   échelle uniforme, et se déplie jusqu'à sa place en 340 ms (la courbe d'entrée) ; son contenu est LÀ dès la première
   image (une vignette lisible, pas une dalle blanche qui couvre les voisins) ; l'opacité monte dans le premier quart ;
   l'ombre grandit avec elle ; les coins du bloc se serrent (160 ms) ; le fil se trace à 200 ms, en 220 ms. */
function naitreCarte(el, de) { if (mouvementReduit()) { dessinerLien(); lacherLeSurvol(); return; }
  const r = el.getBoundingClientRect(), box = $('ba-equip');
  // pas de fondu d'entrée de la fiche pendant qu'elle naît : la vignette se lit tout de suite
  if (box) { box.classList.remove('fondu'); box.getAnimations({ subtree: true }).forEach(a => { try { a.finish(); } catch (_) { } }); }
  const fin = () => { el.classList.remove('carte-nait'); dessinerLien(); lacherLeSurvol(); }; el.classList.add('carte-nait');
  if (!de || !r.width) { el.animate([{ opacity: 0, transform: 'translateY(8px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: courbeCarte('entree') }).onfinish = () => { fin(); dessinerLien(true); }; return; }
  // (l'origine de la carte est son coin haut-gauche : son centre part du centre du bloc)
  const s = echelleDuBloc(de, r), tx = de.left + de.width / 2 - r.left - s * r.width / 2, ty = de.top + de.height / 2 - r.top - s * r.height / 2;
  el.animate([{ transform: `translate(${tx}px,${ty}px) scale(${s})`, opacity: 0 }, { opacity: 1, offset: 0.25 }, { transform: 'none', opacity: 1 }], { duration: 340, easing: courbeCarte('entree') }).onfinish = fin;
  serrerLeViseur();
  setTimeout(() => { if (!el.hidden && el.classList.contains('carte-nait')) dessinerLien(true, r); }, 200); }
// les coins du bloc choisi (06 `crochetsDe` : `.selbox`) se serrent sur lui pendant que la carte en sort
function serrerLeViseur() { const o = CARTE.origine; if (!o || o.type !== 'bloc' || mouvementReduit()) return;
  document.querySelectorAll(`#svg .comp[data-name="${CSS.escape(o.nom)}"] path.selbox`).forEach(p => { p.style.transformBox = 'fill-box'; p.style.transformOrigin = 'center';
    try { p.animate([{ opacity: 0, scale: '1.12' }, { opacity: 1, scale: '1' }], { duration: 160, easing: courbeCarte('entree') }); } catch (_) { p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 }); } }); }
// glisser de son ancienne boîte à la nouvelle, sous les yeux (300 ms, la courbe qui glisse) ; le fil suit
function glisserCarte(el, avant) { if (mouvementReduit() || !avant) { dessinerLien(); lacherLeSurvol(); return; } const r = el.getBoundingClientRect();
  el.animate([{ transform: `translate(${avant.left - r.left}px,${avant.top - r.top}px)` }, { transform: 'none' }], { duration: 300, easing: courbeCarte('glisse') }).onfinish = lacherLeSurvol;
  suivreLienPendant(320); }
/* LE SURVOL QUI RESTAIT (vu sous charge) : la carte vient se poser sous la souris immobile — elle naît, glisse, s'écarte,
   on la lâche —, le plan n'en sait rien (aucun mouvement, aucun « mouseleave ») et ce qu'il allumait au survol reste
   allumé. Quand la souris est sur la carte posée, le plan oublie son survol (son « mouseleave », 08-interface) et rallume
   seulement ce qui est choisi. */
function lacherLeSurvol() { const s = CARTE.souris, el = $('inspecteur'); if (!s || el.hidden) return;
  const r = el.getBoundingClientRect(); if (s.x < r.left || s.x > r.right || s.y < r.top || s.y > r.bottom) return;
  $('planche').dispatchEvent(new MouseEvent('mouseleave')); }
/* Se résorber : la carte est déjà fermée (les gestes et les batteries n'attendent rien) ; c'est son DOUBLE, sans
   identifiants et hors d'atteinte, qui rentre dans le bloc — en 240 ms, la courbe de sortie (il accélère), vers le CENTRE
   du bloc, à échelle uniforme, son contenu lisible jusqu'au bout ; il s'éteint dès 70 % du chemin : jamais de dalle posée
   sur le bloc. */
function resorberCarte(el) { const de = el.getBoundingClientRect(), vers = rectDeLOrigine(); if (mouvementReduit() || !de.width) return;
  const f = el.cloneNode(true); f.removeAttribute('id'); f.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  f.className = 'carte-double'; f.setAttribute('aria-hidden', 'true'); f.inert = true;
  Object.assign(f.style, { left: de.left + 'px', top: de.top + 'px', width: de.width + 'px', height: de.height + 'px' }); document.body.appendChild(f);
  const fi = el.querySelector('.fi'), fi2 = f.querySelector('.fi'); if (fi && fi2) { fi2.classList.remove('fondu'); fi2.scrollTop = fi.scrollTop; }
  if (!vers) { f.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(6px) scale(.98)' }], { duration: 180, easing: courbeCarte('sortie'), fill: 'forwards' }).onfinish = () => f.remove(); return; }
  const s = echelleDuBloc(vers, de), tx = vers.left + vers.width / 2 - de.left - s * de.width / 2, ty = vers.top + vers.height / 2 - de.top - s * de.height / 2;
  f.animate([{ transform: 'none' }, { transform: `translate(${tx}px,${ty}px) scale(${s})` }], { duration: 240, easing: courbeCarte('sortie'), fill: 'forwards' }).onfinish = () => f.remove();
  // (l'opacité suit le temps, pas la courbe : pleine jusqu'à la moitié, éteinte à 70 %)
  f.animate([{ opacity: 1 }, { opacity: 1, offset: 0.45 }, { opacity: 0, offset: 0.7 }, { opacity: 0 }], { duration: 240, fill: 'forwards' }); }

/* ---- LE FIL : du bloc à la carte, une courbe fine (#carte-lien, page.html) ---------------------------------------- */
const auBord = (r, x, y) => ({ x: Math.max(r.left, Math.min(r.left + r.width, x)), y: Math.max(r.top, Math.min(r.top + r.height, y)) });
// `posee` : la boîte où la carte se pose (pendant qu'elle naît, le fil se trace déjà vers elle — à 200 ms, en 220 ms)
function dessinerLien(trace, posee) { const s = $('carte-lien'), el = $('inspecteur'); if (!s) return;
  const b = carteFlottante() && !el.hidden && (posee || !el.classList.contains('carte-nait')) && CARTE.origine && CARTE.origine.type !== 'ecran' ? rectDeLOrigine() : null;
  if (!b) { s.classList.remove('on'); return; }
  const c = posee || el.getBoundingClientRect(), centre = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  // côté carte : à hauteur du bloc s'il est en face, sinon le coin le plus proche ; côté bloc : le point face à la carte
  const pc = auBord({ left: c.left, top: c.top + 20, width: c.width, height: Math.max(0, c.height - 40) }, centre.x, centre.y), pb = auBord(b, pc.x, pc.y);
  const dx = pc.x - pb.x, dy = pc.y - pb.y;
  if (Math.hypot(dx, dy) < 8 || (centre.x > c.left && centre.x < c.right && centre.y > c.top && centre.y < c.bottom)) { s.classList.remove('on'); return; }
  const t = s.querySelector('.cl-trait'); t.setAttribute('d', Math.abs(dx) >= Math.abs(dy) ? `M${pb.x},${pb.y} C${pb.x + dx / 2},${pb.y} ${pc.x - dx / 2},${pc.y} ${pc.x},${pc.y}` : `M${pb.x},${pb.y} C${pb.x},${pb.y + dy / 2} ${pc.x},${pc.y - dy / 2} ${pc.x},${pc.y}`);
  const p = (k, q) => { const n = s.querySelector(k); n.setAttribute('cx', q.x); n.setAttribute('cy', q.y); }; p('.cl-bloc', pb); p('.cl-carte', pc);
  s.classList.add('on');
  if (trace && !mouvementReduit()) { const n = t.getTotalLength(); t.animate([{ strokeDasharray: `${n} ${n}`, strokeDashoffset: n }, { strokeDasharray: `${n} ${n}`, strokeDashoffset: 0 }], { duration: 220, easing: CARTE_COURBE }); } }
function suivreLienPendant(ms) { const t0 = performance.now(); const pas = t => { dessinerLien(); if (t - t0 < ms) requestAnimationFrame(pas); }; requestAnimationFrame(pas); }

/* ---- L'ÉPINGLE ------------------------------------------------------------------------------------------------------ */
// le bouton de la barre (08-fiche, `barreNav` ; l'index, `rendreIndex`) : rien au téléphone (le tiroir)
const boutonEpingle = () => { if (telephone()) return ''; const t = CARTE.epingle ? 'Détacher la fiche : une carte qu’on déplace' : 'Épingler la fiche à droite';
  return `<button type="button" class="fi-x fi-epingle" id="fi-epingle" aria-pressed="${CARTE.epingle}" aria-label="${escA(t)}" data-bulle="${escA(t)}">${ico(CARTE.epingle ? 'detacher' : 'epingler')}</button>`; };
/* AGRANDIR : la carte (ou le volet) prend deux fois la largeur et toute la hauteur ; retenu d'une fiche à l'autre. */
const boutonTaille = () => { if (telephone()) return ''; const t = CARTE.grande ? 'Réduire la fiche' : 'Agrandir la fiche';
  return `<button type="button" class="fi-x fi-taille" id="fi-taille" aria-pressed="${CARTE.grande}" aria-label="${escA(t)}" data-bulle="${escA(t)}">${ico(CARTE.grande ? 'reduire' : 'agrandir')}</button>`; };
const lierTaille = () => { const b = $('fi-taille'); if (b) b.onclick = e => { e.stopPropagation(); agrandirCarte(!CARTE.grande); }; };
function agrandirCarte(oui) { CARTE.grande = !!oui; try { localStorage.setItem('volta.fiche.grande', oui ? '1' : ''); } catch (_) { }
  document.documentElement.classList.toggle('insp-grande', CARTE.grande);
  const b = $('fi-taille'); if (b) { b.outerHTML = boutonTaille(); lierTaille(); }
  const el = $('inspecteur'); if (el.hidden) return; const avant = el.getBoundingClientRect();
  if (carteFlottante()) { const Z = zoneDeLaCarte(), W = CARTE_L();
    // elle grandit vers la gauche si la droite manque, vers le haut si le bas manque : entière à l'écran
    poserCarte(Math.max(Z.L, Math.min(avant.left, Z.R - W)), CARTE.grande ? Math.max(Z.T, Math.min(avant.top, Z.B - 520)) : avant.top); }
  else recadrerSiCache();
  if (!mouvementReduit()) { const r = el.getBoundingClientRect(); el.style.transformOrigin = '0 0';
    el.animate([{ transform: `translate(${avant.left - r.left}px,${avant.top - r.top}px) scale(${avant.width / r.width},${avant.height / r.height})` }, { transform: 'none' }], { duration: 300, easing: CARTE_COURBE }); }
  suivreLienPendant(340); }
/* Épingler : la carte devient le volet de droite et le plan se recadre à côté ; détacher : elle revient près de son
   bloc. `sansElan` : pendant qu'on la tient (la barre déjà sous les doigts, elle suit la main). */
function epinglerCarte(oui, sansElan) { CARTE.epingle = !!oui; try { localStorage.setItem('volta.fiche.epinglee', oui ? '1' : ''); } catch (_) { }
  const el = $('inspecteur'); if (el.hidden) { modeCarte(); return; }
  const avant = el.getBoundingClientRect(); modeCarte();
  // le plan reprend (ou rend) la place du volet ; détachée d'un bouton, elle retourne près de son bloc, là où le plan VA
  recadrerSiCache();
  if (!CARTE.epingle && !sansElan) { CARTE.deplacee = false; const m = mesurerCarte(), v = anim ? vueVisee : null; poserA(placerPres(rectDeLOrigine(null, v), m.W, m.H, v)); }
  const b = $('fi-epingle'); if (b) b.outerHTML = boutonEpingle(); const nb = $('fi-epingle'); if (nb) nb.onclick = e => { e.stopPropagation(); epinglerCarte(!CARTE.epingle); };

  if (!sansElan && !mouvementReduit()) { const r = el.getBoundingClientRect(); el.style.transformOrigin = '0 0';
    el.animate([{ transform: `translate(${avant.left - r.left}px,${avant.top - r.top}px) scale(${avant.width / r.width},${avant.height / r.height})` }, { transform: 'none' }], { duration: 300, easing: CARTE_COURBE });
    $('ba-equip').animate([{ opacity: .2 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' }); }
  suivreLienPendant(340); }

/* Le récapitulatif s'ouvre ou se ferme (08-recap) : la fiche ouverte passe de carte à volet, ou revient près de son
   bloc — là où le plan VA, s'il glisse —, d'un mouvement. */
function basculerModeCarte() { const el = $('inspecteur'); if (el.hidden) { modeCarte(); return; }
  const avant = el.getBoundingClientRect(), etait = document.body.classList.contains('insp-flotte'); modeCarte();
  const flotte = document.body.classList.contains('insp-flotte'); if (flotte === etait) return;
  if (flotte) { CARTE.deplacee = false; const m = mesurerCarte(), v = anim ? vueVisee : null; poserA(placerPres(rectDeLOrigine(null, v), m.W, m.H, v)); }
  if (!mouvementReduit() && avant.width) { const r = el.getBoundingClientRect(); el.style.transformOrigin = '0 0';
    el.animate([{ transform: `translate(${avant.left - r.left}px,${avant.top - r.top}px) scale(${avant.width / r.width},${avant.height / r.height})` }, { transform: 'none' }], { duration: 300, easing: CARTE_COURBE }); }
  suivreLienPendant(340); }

/* ---- S'ÉCARTER : le plan qui glisse de lui-même amène le bloc sous la carte ---------------------------------------- */

function planifierEcart(doux) { clearTimeout(CARTE.ecart); CARTE.ecart = setTimeout(eviterLeBloc, doux && !mouvementReduit() ? 300 : 30); }
function eviterLeBloc() { const el = $('inspecteur'); if (!carteFlottante() || el.hidden || CARTE.deplacee || CARTE.prise || !CARTE.origine || CARTE.origine.type === 'ecran') return;
  // encore en élan (elle naît, glisse, se détache) : on juge sa place une fois posée
  if (el.getAnimations().length || anim) { CARTE.ecart = setTimeout(eviterLeBloc, 80); return; }
  // elle ne montre plus rien de choisi (défait, un autre folio posé sous elle) et n'est pas l'index : elle se ferme —
  // restée là, elle cacherait le plan avec une liste que personne n'a demandée
  if (!app.cible && !app.insp.index) { fermerInspecteur(); return; }
  const b = rectDeLOrigine(), c = el.getBoundingClientRect(); if (!b || !seCoupent(b, c)) return;
  const m = mesurerCarte(); poserA(placerPres(b, m.W, m.H)); glisserCarte(el, c); }   // (glisser lâche le survol à la fin)

/* ---- LE CLAVIER (l'ergonome v73 : « / 102CB1 Entrée ouvre la carte, mais le clavier reste sur la page : 8 Tab plus
   tard, on est encore dans la barre des folios ») : une carte qui s'ouvre — d'un clic, par la recherche, par P — PREND LE
   CLAVIER (Tab commence dans la carte) ; fermée (Échap, ×, un clic dehors), elle le rend d'où il venait : le bouton qui
   l'avait ouverte, la ligne du récapitulatif ; la recherche refermée, son bouton du rail ; sinon la page. ------------ */
function prendreLeClavier(el) { const a = document.activeElement;
  CARTE.ouvreur = a && a !== document.body && !el.contains(a) ? a : null;
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  try { el.focus({ preventScroll: true }); } catch (_) { el.focus(); } }
function rendreLeClavier() { const o = CARTE.ouvreur; CARTE.ouvreur = null; const a = document.activeElement;
  // le clavier est ailleurs (on a cliqué dehors, ou il est déjà parti) : on ne le reprend pas
  if (a && a !== document.body && !$('inspecteur').contains(a)) return;
  const cible = o && o.isConnected && o.offsetParent !== null && !o.closest('[hidden], [inert]') ? (o.matches('input, textarea') ? ($('btnCherche') || null) : o) : null;
  if (cible) { try { cible.focus({ preventScroll: true }); } catch (_) { cible.focus(); } } }

/* ---- LA TENIR PAR SA BARRE ------------------------------------------------------------------------------------------ */
function lierCarte() { const el = $('inspecteur');
  try { CARTE.epingle = localStorage.getItem('volta.fiche.epinglee') === '1'; CARTE.grande = localStorage.getItem('volta.fiche.grande') === '1'; } catch (_) { }
  document.documentElement.classList.toggle('insp-grande', !!CARTE.grande);
  // fermée, d'où qu'on la ferme (08-interface, `fermerInspecteur`), elle rend le clavier
  if (typeof MutationObserver === 'function') new MutationObserver(() => { if (el.hidden) rendreLeClavier(); }).observe(el, { attributes: true, attributeFilter: ['hidden'] });
  // l'endroit du dernier appui sur la planche : la fiche d'un câble naît de là, un clic sur le plan fait glisser la carte
  $('planche').addEventListener('pointerdown', e => { CARTE.appui = { x: e.clientX, y: e.clientY, t: Date.now() }; }, true);
  // où est la souris (la carte qui se pose dessous fait oublier au plan son survol : `lacherLeSurvol`)
  window.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') CARTE.souris = { x: e.clientX, y: e.clientY }; }, { passive: true });
  el.addEventListener('pointerdown', e => { if (telephone() || e.button !== 0) return;
    const barre = e.target.closest && e.target.closest('.fi-nav, .ix-tete, .fi-symbole'); if (!barre || e.target.closest('button, input, select, a, textarea')) return;
    const r = el.getBoundingClientRect(); CARTE.prise = { dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, bouge: false };
    try { barre.setPointerCapture(e.pointerId); } catch (_) { } e.preventDefault(); });
  el.addEventListener('pointermove', e => { const p = CARTE.prise; if (!p) return;
    if (!p.bouge) { if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 4) return; p.bouge = true; document.body.classList.add('carte-tenue');
      // épinglée, on la détache : elle redevient une carte, sa barre sous les doigts
      if (CARTE.epingle) { epinglerCarte(false, true); p.dx = Math.min(p.dx, CARTE_L() - 40); } }
    poserCarte(e.clientX - p.dx, e.clientY - p.dy); dessinerLien(); document.body.classList.toggle('carte-quai', e.clientX > window.innerWidth - 56); });
  const lacher = () => { const p = CARTE.prise; CARTE.prise = null; if (!p || !p.bouge) return; const b = document.body, quai = b.classList.contains('carte-quai');
    b.classList.remove('carte-tenue', 'carte-quai'); if (quai) { epinglerCarte(true); return; } CARTE.deplacee = true;
    // relâchée trop bas : elle remonte d'elle-même dans l'écran
    const r = el.getBoundingClientRect(), Z = zoneDeLaCarte(); poserCarte(r.left, Math.min(r.top, Math.max(Z.T, Z.B - Math.min(r.height, 160)))); dessinerLien(); lacherLeSurvol(); };
  el.addEventListener('pointerup', lacher); el.addEventListener('pointercancel', lacher);
  window.addEventListener('resize', () => { if (!el.hidden && carteFlottante()) { const r = el.getBoundingClientRect(); poserCarte(r.left, r.top); } modeCarte(); dessinerLien(); }); }
