/* ===========================================================================
   04 — LE PLACEMENT
   Le cœur de l'outil. Un moteur en étapes nommées, un seul juge :

     modele        ce que le placement sait des blocs et des fils
     niveaux       chaque bloc reçoit sa colonne (le flux amont → aval)
     rangees       composantes, serpentin : chaque bloc reçoit sa rangée
     flancs        un connecteur choisit un flanc ; les listes de bornes
     resoudre      les ORDONNÉES : union des nets + plus long chemin — un
                   maximum de fils dont les deux bornes sont à la même hauteur
     barycentre    l'ordre des blocs d'une colonne et des bornes d'un
                   connecteur, itéré avec le solveur
     assembler     la géométrie : colonnes, goulottes, pastilles, le contrat
                   que lisent le routeur et le dessin
     juger / bat   sain, tient sur la feuille, fils droits, croisements,
                   numéros muets, encombrement, surface, longueur des fils
     rechercheLocale  des gestes jugés au routage réel, gardés s'ils gagnent
     meilleurPlacement  plusieurs graines de niveaux, le serpentin en secours,
                   la recherche locale sur le vainqueur

   L'ÉTAT d'un placement (E) : place (rangée, colonne), piles (l'ordre des
   blocs d'une colonne), listes (l'ordre des bornes d'un flanc), flancDe,
   dirs (côté des fils d'une borne de bornier), runs (les connecteurs),
   prioritaires (les fils alignés en premier). Une POSITION (pos) : l'ordonnée
   de chaque borne, le haut et le bas de chaque bloc.
   =========================================================================== */
'use strict';

const PRH = 14, STRIPW = 20, BODYW = 104, BORNW = 36, VGAP = 22;
const MARGE = 70, HAUT_PAGE = MARGE + 120, RANGEE_GAP = 130;
/* Une pastille (masse, rail) se colle au flanc de la borne qu'elle sert : un
   fil de 30, où le numéro de fil s'écrit, puis la pastille de 40. La colonne
   réserve cette place (ZONE) sur le flanc concerné, hors des goulottes. */
const FIL_PASTILLE = 28, HAUT_PASTILLE = 14, ZONE_PASTILLE = FIL_PASTILLE + BORNW;
/* Une goulotte : 9 par piste, 28 de marges, jamais moins de 40 — un fil
   droit qui la traverse porte son numéro (28) et une barrette de piquage y
   tient (14 à 44). */
const GOULOTTE_MIN = 40;
/* Un dessin plus de 2,2 fois plus large que haut ne tient sur aucune
   feuille ; les niveaux se tassent avant d'en arriver là. */
const FORMAT_MAX = 2.2, FORMAT_VISE = 1.9;
const LARGEUR = { equip: STRIPW + BODYW + STRIPW, barrette: STRIPW + 24 + STRIPW, coupure: STRIPW + 30 + STRIPW, tag: BORNW };
const A3 = 1.414;
/* L'ordre naturel des bornes : numérique quand la borne est un nombre, sinon
   alphanumérique (1, 2, 10 ; A1, A2, B1). C'est l'ordre du matériel. */
const ordreNaturel = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' });
const K = (id, cle) => id + SEP + cle;
const mediane = a => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };

/* ===== 1. LE MODÈLE ====================================================== */
function modele(G) {
  const { liaisons: lk, ids, noeuds, bouts, nid } = G;
  const blocs = new Map(); const connecteursDuNom = new Map();
  for (const id of ids) { const N = noeuds.get(id), nom = N.nom;
    const genre = estPotentiel(nom) ? 'tag' : estBarrette(nom) ? 'barrette' : estCoupure(nom) ? 'coupure' : 'equip';
    const b = { id, nom, genre, bornes: N.broches.slice(), connecteur: new Map() };
    if (genre === 'equip') { if (!connecteursDuNom.has(nom)) connecteursDuNom.set(nom, connecteurParBorne(nom, lk));
      const m = connecteursDuNom.get(nom); b.bornes.forEach(p => { const c = m.get(String(p.etiq)); if (c) b.connecteur.set(p.cle, c.nom); }); }
    blocs.set(id, b); }
  const liens = lk.map((l, li) => { const A = bouts.get(li + ':A'), B = bouts.get(li + ':B');
    const a = { id: nid(A.nom, A.cle), cle: A.cle }, b = { id: nid(B.nom, B.cle), cle: B.cle };
    return { li, a, b, boucle: a.id === b.id && a.cle === b.cle, shunt: a.id === b.id && a.cle !== b.cle }; });
  const parts = new Map();
  const noter = (u, v, li) => (parts.get(K(u.id, u.cle)) || parts.set(K(u.id, u.cle), []).get(K(u.id, u.cle))).push({ id: v.id, cle: v.cle, li });
  liens.forEach(w => { if (w.boucle || w.shunt) return; noter(w.a, w.b, w.li); noter(w.b, w.a, w.li); });
  // un shunt : deux bornes pontées d'un même bloc — pas un fil, un pont dessiné
  const pontes = new Map();
  liens.forEach(w => { if (w.shunt) (pontes.get(w.a.id) || pontes.set(w.a.id, []).get(w.a.id)).push([w.a.cle, w.b.cle]); });
  // une pastille se colle à UNE borne d'un bloc ; sinon c'est un bloc comme un autre
  blocs.forEach(b => { if (b.genre !== 'tag') return; const ps = parts.get(K(b.id, b.bornes[0].cle)) || [];
    if (ps.length !== 1 || blocs.get(ps[0].id).genre === 'tag') b.genre = 'equip'; });
  const estTag = id => blocs.get(id).genre === 'tag';
  const partenairesDe = k => parts.get(k) || [];
  const partenairesBlocs = k => partenairesDe(k).filter(q => !estTag(q.id));
  const voisins = new Map(ids.map(id => [id, new Set()]));
  liens.forEach(w => { if (w.boucle || w.shunt || estTag(w.a.id) || estTag(w.b.id)) return; voisins.get(w.a.id).add(w.b.id); voisins.get(w.b.id).add(w.a.id); });
  const hauteurEstimee = id => blocs.get(id).bornes.length * PRH + 46;
  return { lk, ids, blocs, liens, pontes, estTag, partenairesDe, partenairesBlocs, voisins, hauteurEstimee };
}

/* ===== 2. LES NIVEAUX : chaque bloc reçoit sa colonne =================== */
/* Le graphe des niveaux : l'adjacence pondérée et orientée entre blocs (les
   pastilles suivent leur borne, elles n'y sont pas). */
function grapheDesNiveaux(M) {
  const noeuds = M.ids.filter(id => !M.estTag(id));
  const adj = new Map(noeuds.map(n => [n, new Map()]));
  M.liens.forEach(w => { if (w.shunt || w.boucle) return; const a = w.a.id, b = w.b.id; if (!adj.has(a) || !adj.has(b)) return;
    const ea = adj.get(a).get(b) || adj.get(a).set(b, { w: 0, aval: 0 }).get(b); ea.w++; ea.aval++;        // a → b : b est en aval de a
    const eb = adj.get(b).get(a) || adj.get(b).set(a, { w: 0, aval: 0 }).get(a); eb.w++; });
  const degre = new Map(noeuds.map(n => { let s = 0; adj.get(n).forEach(e => s += e.w); return [n, s]; }));
  return { noeuds, adj, parDegre: noeuds.slice().sort((a, b) => degre.get(b) - degre.get(a)) };
}
/* Ce qu'un fil coûte selon la portée entre ses colonnes : gratuit vers une
   colonne voisine (il peut être droit), plié à coup sûr et une piste de
   goulotte dans la même colonne (3), sa portée quand il enjambe. Un fil
   d'aval qui repart vers la gauche coûte SENS : le flux se lit de gauche à
   droite, les sources à gauche. */
const coutDePortee = d => (d === 0 ? 3 : d === 1 ? 0 : d);
const SENS = 1;
/* Le coût d'un bloc à une colonne : ses fils, un peu plus pour un fil d'aval
   qui repart vers la gauche (le flux se lit de gauche à droite), puis les
   flancs du bloc et de ses voisins, puis le format (F : le compte des
   colonnes, tenu à jour). */
function coutNiveau(M, N, col, F, n, c) {
  let s = 0;
  for (const [k, e] of N.adj.get(n)) { const ck = col.get(k), d = Math.abs(c - ck);
    s += e.w * coutDePortee(d); if (d) s += SENS * (c > ck ? e.aval : e.w - e.aval); }
  const colDe = id => (id === n ? c : col.get(id));
  M.voisins.get(n).forEach(k => s += coutDesFlancs(M, colDe, k)); s += coutDesFlancs(M, colDe, n);
  return s + 6 * Math.max(0, F.format(n, col.get(n), c) - FORMAT_VISE);
}
/* Le coût de toute une mise en niveaux, pour classer les candidats. */
function coutTotal(M, N, col) {
  let s = 0; const colDe = id => col.get(id);
  N.noeuds.forEach(n => { for (const [k, e] of N.adj.get(n)) { if (k < n) continue; const d = Math.abs(col.get(n) - col.get(k));
    s += e.w * coutDePortee(d); if (d) s += SENS * (col.get(n) > col.get(k) ? e.aval : N.adj.get(k).get(n).aval); }
    s += coutDesFlancs(M, colDe, n); });
  return s + 6 * Math.max(0, compteDesColonnes(M, col).format() - FORMAT_VISE);
}
/* Le compte des colonnes : la hauteur de chaque colonne et ses équipements,
   tenu à jour bloc par bloc ; le FORMAT qu'auraient les colonnes (la largeur
   des colonnes et de leurs goulottes sur la hauteur de la plus haute), le
   bloc n déplacé de c0 en c1. */
function compteDesColonnes(M, col) {
  const h = new Map(), large = new Map(); let tags = 0;
  col.forEach((c, id) => { h.set(c, (h.get(c) || 0) + M.hauteurEstimee(id) + VGAP); if (M.blocs.get(id).genre === 'equip') large.set(c, (large.get(c) || 0) + 1); });
  M.ids.forEach(id => { if (M.estTag(id)) tags++; });
  const F = {
    format(n, c0, c1) { const hn = n == null ? 0 : M.hauteurEstimee(n) + VGAP, eq = n != null && M.blocs.get(n).genre === 'equip' ? 1 : 0;
      let W = GOULOTTE_MIN + tags * ZONE_PASTILLE / 2, H = 0; const cols = new Set(h.keys()); if (c1 != null) cols.add(c1);
      cols.forEach(c => { let hh = h.get(c) || 0, lg = large.get(c) || 0; if (c === c0) { hh -= hn; lg -= eq; } if (c === c1) { hh += hn; lg += eq; }
        if (hh <= 0.01) return; W += (lg ? LARGEUR.equip : LARGEUR.coupure) + GOULOTTE_MIN; H = Math.max(H, hh); });
      return W / Math.max(60, H); },
    bouger(n, c0, c1) { const hn = M.hauteurEstimee(n) + VGAP, eq = M.blocs.get(n).genre === 'equip' ? 1 : 0;
      h.set(c0, h.get(c0) - hn); h.set(c1, (h.get(c1) || 0) + hn); if (eq) { large.set(c0, large.get(c0) - 1); large.set(c1, (large.get(c1) || 0) + 1); } } };
  return F;
}
/* Ce que les colonnes font aux flancs d'un bloc : un connecteur dont des
   fils partent à contresens de sa majorité les fait faire le tour (1,5 par
   fil ; 0,5 pour une borne libre, qui se dédouble) ; une borne qui sert
   deux blocs du même côté demande une barrette de piquage (1). */
function coutDesFlancs(M, colDe, id) {
  const b = M.blocs.get(id), cb = colDe(id); const votes = new Map(); let s = 0;
  b.bornes.forEach(p => { const cotes = new Map();
    M.partenairesBlocs(K(id, p.cle)).forEach(q => { const t = Math.sign(colDe(q.id) - cb); if (!t) return;
      (cotes.get(t) || cotes.set(t, new Set()).get(t)).add(q.id);
      if (b.genre !== 'equip') return;
      const g = b.connecteur.get(p.cle) ?? ('~' + p.cle); const v = votes.get(g) || votes.set(g, { g: 0, d: 0, libre: !b.connecteur.has(p.cle) }).get(g);
      if (t < 0) v.g++; else v.d++; });
    cotes.forEach(set => { if (set.size >= 2) s += 1; }); });
  votes.forEach(v => s += (v.libre ? 0.5 : 1.5) * Math.min(v.g, v.d));
  return s;
}
/* Les niveaux par le FLUX : un arc a → b quand plus de fils vont de a vers b
   que l'inverse ; les cycles se coupent aux arcs de retour d'un parcours en
   profondeur ; le niveau est le plus long chemin depuis une source. */
function couchesParFlux(N) {
  const { noeuds, adj, parDegre } = N;
  const sortants = new Map(noeuds.map(n => [n, []]));
  noeuds.forEach(a => adj.get(a).forEach((e, b) => { if (e.aval * 2 > e.w || (e.aval * 2 === e.w && a < b)) sortants.get(a).push(b); }));
  const etat = new Map(); const arcs = new Map(noeuds.map(n => [n, []])); const entrants = new Map(noeuds.map(n => [n, 0]));
  const dfs = a => { etat.set(a, 1); sortants.get(a).forEach(b => { if (etat.get(b) === 1) return; arcs.get(a).push(b); entrants.set(b, entrants.get(b) + 1); if (!etat.has(b)) dfs(b); }); etat.set(a, 2); };
  parDegre.forEach(n => { if (!etat.has(n)) dfs(n); });
  const col = new Map(); const file = noeuds.filter(n => !entrants.get(n)); file.forEach(n => col.set(n, 0));
  for (let i = 0; i < file.length; i++) { const a = file[i]; arcs.get(a).forEach(b => { col.set(b, Math.max(col.get(b) || 0, col.get(a) + 1));
    entrants.set(b, entrants.get(b) - 1); if (!entrants.get(b)) file.push(b); }); }
  return col;
}
/* Les niveaux par un PARCOURS en largeur depuis une graine : le bloc de plus
   fort degré (graine 0), le k-ième (graine k), ou le point le plus éloigné
   du premier (graine 'loin'). */
function couchesParParcours(N, graine) {
  const { adj, parDegre } = N; const col = new Map();
  const bfs = (s, vus) => { const d = new Map([[s, 0]]); const q = [s]; let loin = s;
    for (let i = 0; i < q.length; i++) { const c = q[i]; for (const k of adj.get(c).keys()) { if (d.has(k) || vus.has(k)) continue;
      d.set(k, d.get(c) + 1); if (d.get(k) > d.get(loin)) loin = k; q.push(k); } }
    return { d, loin }; };
  const graines = parDegre.slice(); const k = typeof graine === 'number' ? graine : 0;
  if (k > 0 && graines.length > k) graines.push(...graines.splice(0, k));
  for (const s of graines) { if (col.has(s)) continue;
    const depart = graine === 'loin' ? bfs(s, col).loin : s;
    for (const [n, v] of bfs(depart, col).d) col.set(n, v); }
  return col;
}
/* La DESCENTE : un bloc se rapproche de ses voisins tant que ça coûte
   moins — tous les blocs, ou seulement `sujets` (le voisinage d'un coup de
   pied). */
function descendre(M, N, col, F, sujets) {
  const liste = sujets || N.parDegre;
  for (let passe = 0; passe < (sujets ? 3 : 8); passe++) { let bouge = false;
    for (const n of liste) { const c0 = col.get(n); let best = c0, bc = coutNiveau(M, N, col, F, n, c0);
      for (const c of [c0 - 1, c0 + 1, c0 - 2, c0 + 2]) { const cc = coutNiveau(M, N, col, F, n, c); if (cc < bc - 0.01) { bc = cc; best = c; } }
      if (best !== c0) { col.set(n, best); F.bouger(n, c0, best); bouge = true; } }
    if (!bouge) break; }
}
const normaliser = col => { const usuels = [...new Set(col.values())].sort((a, b) => a - b); const remap = new Map(usuels.map((c, i) => [c, i]));
  col.forEach((c, n) => col.set(n, remap.get(c))); return col; };
const signatureDe = col => [...col].map(([id, c]) => id + ':' + c).sort().join(';');
/* L'EXPLORATION depuis une graine : la descente, puis chaque bloc essayé
   dans chaque colonne et son voisinage redescendu — un coup de pied qui sort
   la descente de son creux ; s'il fait mieux, tout redescend et l'exploration
   repart de là. Le vivier garde chaque mise en niveaux distincte rencontrée
   avec son coût. `pieds` borne le nombre de coups de pied : le résultat ne
   dépend pas de la machine. */
function explorerNiveaux(M, N, col, vivier, pieds) {
  let F = compteDesColonnes(M, col); descendre(M, N, col, F); let cout = coutTotal(M, N, col);
  const noter = (c, k) => { const s = signatureDe(normaliser(new Map(c))); if (!vivier.has(s) || vivier.get(s).cout > k) vivier.set(s, { col: normaliser(new Map(c)), cout: k }); };
  noter(col, cout);
  for (let tour = 0; tour < 2 && pieds > 0; tour++) { let mieux = false;
    for (const n of N.parDegre) { if (pieds <= 0) break;
      const lo = Math.min(...col.values()) - 1, hi = Math.max(...col.values()) + 1;
      for (let c = lo; c <= hi; c++) { if (c === col.get(n) || pieds-- <= 0) continue;
        const essai = new Map(col), F2 = compteDesColonnes(M, essai); F2.bouger(n, essai.get(n), c); essai.set(n, c);
        descendre(M, N, essai, F2, [n, ...M.voisins.get(n)]);
        let k = coutTotal(M, N, essai);
        if (k < cout - 0.01) { descendre(M, N, essai, F2); k = coutTotal(M, N, essai); col = essai; F = F2; cout = k; mieux = true; }
        noter(essai, k); } }
    if (!mieux) break; }
  return col;
}
/* Une feuille (tous ses voisins dans une même colonne) coûte autant des deux
   côtés : sur demande, elle va du côté le moins chargé. */
function equilibrerFeuilles(M, N, col) {
  const { adj, parDegre } = N; const F = compteDesColonnes(M, col);
  const charge = new Map(); col.forEach((c, n) => charge.set(c, (charge.get(c) || 0) + M.hauteurEstimee(n)));
  parDegre.slice().sort((a, b) => M.hauteurEstimee(b) - M.hauteurEstimee(a)).forEach(n => {
    const voisins = [...adj.get(n).keys()]; const autour = [...new Set(voisins.map(k => col.get(k)))]; if (autour.length !== 1) return;
    if (voisins.length === 1 && adj.get(voisins[0]).size === 1) return;          // un îlot de deux blocs n'a pas de côté
    const c0 = col.get(n), c1 = 2 * autour[0] - c0; if (Math.abs(c1 - c0) !== 2) return;
    const h = M.hauteurEstimee(n); if ((charge.get(c1) || 0) + h >= (charge.get(c0) || 0)) return;
    if (coutNiveau(M, N, col, F, n, c1) > coutNiveau(M, N, col, F, n, c0) + 0.01) return;
    col.set(n, c1); F.bouger(n, c0, c1); charge.set(c0, charge.get(c0) - h); charge.set(c1, (charge.get(c1) || 0) + h); });
}
/* Un hub qui a beaucoup de feuilles d'un même côté les range sur deux
   colonnes, une feuille sur deux plus loin : leur fil passe droit entre deux
   feuilles de la première colonne et la colonne fait moitié moins haut. */
function approfondir(M, N, col, seuil) {
  const feuille = id => N.adj.get(id).size === 1 && M.blocs.get(id).bornes.length === 1;
  N.noeuds.forEach(H => [-1, 1].forEach(s => {
    const fs = M.blocs.get(H).bornes.flatMap(p => M.partenairesBlocs(K(H, p.cle)).map(q => q.id))
      .filter((id, i, a) => a.indexOf(id) === i && feuille(id) && col.get(id) === col.get(H) + s);
    if (fs.length >= seuil) fs.forEach((id, i) => { if (i % 2) col.set(id, col.get(H) + 2 * s); }); }));
}
/* Les mises en niveaux candidates, de la moins chère à la plus chère : les
   graines (le flux, les parcours depuis les plus gros blocs et depuis le plus
   loin), chacune explorée ; puis, sur les meilleures, les feuilles
   équilibrées et les feuilles d'un hub sur deux colonnes. Le juge, au
   routage réel, tranchera entre les premières. */
function candidatsDeNiveaux(M, combien) {
  const N = grapheDesNiveaux(M); const vivier = new Map();
  if (!N.noeuds.length) return [new Map()];
  const nB = N.noeuds.length, graines = nB > 200 ? ['flux', 0] : ['flux', 0, 'loin', 1, 2, 3];
  const pieds = nB > 200 ? 0 : nB > 60 ? 60 : 240;
  graines.forEach(g => explorerNiveaux(M, N, g === 'flux' ? couchesParFlux(N) : couchesParParcours(N, g), vivier, pieds));
  const tri = () => [...vivier.values()].sort((a, b) => a.cout - b.cout);
  const gros = N.noeuds.some(H => M.blocs.get(H).bornes.length >= 8 && N.adj.get(H).size >= 8);
  tri().slice(0, combien).forEach(v => {
    const e = new Map(v.col); equilibrerFeuilles(M, N, e); normaliser(e); if (!vivier.has(signatureDe(e))) vivier.set(signatureDe(e), { col: e, cout: coutTotal(M, N, e) + 0.005 });
    if (gros) { const p = new Map(v.col); approfondir(M, N, p, 8); normaliser(p); if (!vivier.has(signatureDe(p))) vivier.set(signatureDe(p), { col: p, cout: coutTotal(M, N, p) + 0.005 }); } });
  return tri().slice(0, combien).map(v => v.col);
}

/* ===== 3. LES RANGÉES : composantes côte à côte, serpentin ============== */
/* Chaque composante part de la colonne 0 et occupe ses rangées : une seule,
   ou plusieurs en boustrophédon si elle est plus longue que la largeur de
   serpentin. Les petites composantes se rangent côte à côte sur une étagère.
   Rend place : id -> { r, c }. */
function rangees(M, col, serpentin) {
  const compDe = new Map(); const comps = [];
  for (const s of col.keys()) { if (compDe.has(s)) continue; const c = { ids: [], lo: Infinity, hi: -Infinity, h: 0 }; comps.push(c); const q = [s]; compDe.set(s, c);
    while (q.length) { const u = q.pop(); c.ids.push(u); c.lo = Math.min(c.lo, col.get(u)); c.hi = Math.max(c.hi, col.get(u)); c.h += M.hauteurEstimee(u);
      M.voisins.get(u).forEach(v => { if (!compDe.has(v)) { compDe.set(v, c); q.push(v); } }); } }
  comps.sort((a, b) => (b.ids.length - a.ids.length) || (b.h - a.h));
  const W = serpentin || Infinity, place = new Map(); let r0 = 0, etagere = null;
  if (!comps.length) return place;
  const largeurPrincipale = Math.max(4, Math.min(comps[0].hi - comps[0].lo + 1, W));
  comps.forEach((c, i) => { const span = c.hi - c.lo + 1;
    if (i > 0 && span <= 3 && c.ids.length <= 4) {
      if (!etagere || etagere.c + span > largeurPrincipale) etagere = { r: r0++, c: 0 };
      c.ids.forEach(n => place.set(n, { r: etagere.r, c: etagere.c + col.get(n) - c.lo })); etagere.c += span; return; }
    etagere = null; const larg = Math.min(W, span);
    c.ids.forEach(id => { const k = col.get(id) - c.lo, r = Math.floor(k / W), kk = k % W;
      place.set(id, { r: r0 + r, c: (r % 2 === 0) ? kk : (larg - 1 - kk) }); });
    r0 += Math.ceil(span / W); });
  return place;
}

/* ===== 4. LES FLANCS ET LES LISTES ====================================== */
/* De quel côté d'un bloc est un partenaire : sa colonne, ou, dans une autre
   rangée, le côté du repli qui les relie. */
function coteDe(place, id, q) { const a = place.get(id), b = place.get(q.id); if (!a || !b) return 0;
  if (b.c !== a.c) return Math.sign(b.c - a.c); if (b.r === a.r) return 0;
  return (Math.min(a.r, b.r) % 2 === 0) ? 1 : -1; }
/* Un CONNECTEUR choisit UN flanc — celui de la majorité de ses partenaires —
   et ses bornes se suivent ; une borne sans connecteur choisit seule et se
   dédouble si elle parle des deux côtés. Un bornier garde ses bornes dans
   l'ordre naturel : chacune sort du côté de son partenaire, des deux côtés
   si elle en a des deux (une prise de coupure toujours). Deux blocs d'une
   MÊME colonne se parlent par la goulotte calme : celle où le moins de leurs
   fils passent, la même pour les deux bouts. */
function flancs(M, place) {
  const listes = new Map(), flancDe = new Map(), dirs = new Map();
  const cote = (id, q) => coteDe(place, id, q);
  // vers où penchent les fils d'un bloc (+ à droite) : l'autre côté est la goulotte calme
  const penchant = new Map(M.ids.map(id => { let s = 0; M.blocs.get(id).bornes.forEach(p => M.partenairesBlocs(K(id, p.cle)).forEach(q => s += cote(id, q))); return [id, s]; }));
  // 1. ce que les partenaires d'un côté imposent ; null reste à décider
  for (const id of M.ids) { const b = M.blocs.get(id);
    if (b.genre === 'tag') { listes.set(id, { S: b.bornes.slice() }); continue; }
    if (b.genre !== 'equip') { listes.set(id, { S: b.bornes.slice().sort((u, v) => ordreNaturel(u.etiq, v.etiq)) });
      b.bornes.forEach(p => { const cs = M.partenairesBlocs(K(id, p.cle)).map(q => cote(id, q)); const meme = cs.includes(0); const sides = new Set(cs.filter(s => s));
        let d; if (b.genre === 'coupure') d = 0; else if (sides.size === 2) d = 0; else if (sides.size === 1) d = meme ? 0 : [...sides][0];
        else d = (meme || !M.partenairesDe(K(id, p.cle)).length) ? null : (penchant.get(id) < 0 ? -1 : 1);
        dirs.set(K(id, p.cle), d); });
      continue; }
    const groupe = cle => b.connecteur.get(cle) ?? ('~' + cle); const votes = new Map();
    b.bornes.forEach(p => { const v = votes.get(groupe(p.cle)) || votes.set(groupe(p.cle), { g: 0, d: 0 }).get(groupe(p.cle));
      M.partenairesBlocs(K(id, p.cle)).forEach(q => { const s = cote(id, q); if (s < 0) v.g++; else if (s > 0) v.d++; }); });
    b.bornes.forEach(p => { const v = votes.get(groupe(p.cle)), libre = !b.connecteur.has(p.cle);
      flancDe.set(K(id, p.cle), v.g > v.d ? 'L' : v.d > v.g ? 'R' : (v.g ? (libre ? 'LR' : 'R') : null)); }); }
  // 2. le reste — partenaires de même colonne, pastilles seules — par la goulotte calme, la même pour les deux
  const valeur = (id, cle) => (M.blocs.get(id).genre === 'equip' ? flancDe : dirs).get(K(id, cle));
  M.ids.forEach(id => { const b = M.blocs.get(id); if (b.genre === 'tag') return;
    b.bornes.forEach(p => { const k = K(id, p.cle); if (valeur(id, p.cle) != null) return;
      const memes = M.partenairesBlocs(k).filter(q => cote(id, q) === 0); let side = 0;
      for (const q of memes) { const vq = valeur(q.id, q.cle); if (vq === 'L' || vq === -1) side = -1; else if (vq === 'R' || vq === 1) side = 1; if (side) break; }
      if (!side) { const s = penchant.get(id) + memes.reduce((t, q) => t + penchant.get(q.id), 0); side = s > 0 ? -1 : 1; }
      if (b.genre !== 'equip') { dirs.set(k, side); return; }
      const g = groupe(b, p.cle); b.bornes.forEach(pp => { if (groupe(b, pp.cle) === g && flancDe.get(K(id, pp.cle)) == null) flancDe.set(K(id, pp.cle), side < 0 ? 'L' : 'R'); }); }); });
  M.ids.forEach(id => { const b = M.blocs.get(id); if (b.genre !== 'equip') return;
    listes.set(id, { L: listeDuFlanc(b, flancDe, 'L'), R: listeDuFlanc(b, flancDe, 'R') }); });
  return { listes, flancDe, dirs };
}
const groupe = (b, cle) => b.connecteur.get(cle) ?? ('~' + cle);
/* Les bornes d'un flanc : celles d'un connecteur se suivent dans l'ordre
   naturel, les connecteurs dans l'ordre de leur première borne. */
function listeDuFlanc(b, flancDe, lid) {
  const groupes = new Map();
  b.bornes.slice().sort((u, v) => ordreNaturel(u.etiq, v.etiq)).forEach(p => { const f = flancDe.get(K(b.id, p.cle)); if (f !== lid && f !== 'LR') return;
    const g = b.connecteur.get(p.cle) ?? ('~' + p.cle); (groupes.get(g) || groupes.set(g, []).get(g)).push(p); });
  return [...groupes.values()].flat();
}
/* Les RUNS : sur chaque flanc, le groupe des bornes d'un même connecteur (au
   moins deux) — contiguës, au pas, d'un bloc. */
function construireRuns(M, E) {
  E.runs = new Map();
  M.ids.forEach(id => { const b = M.blocs.get(id); if (b.genre !== 'equip') return;
    ['L', 'R'].forEach(lid => { const parNom = new Map();
      E.listes.get(id)[lid].forEach(p => { const g = b.connecteur.get(p.cle); if (g == null) return; (parNom.get(g) || parNom.set(g, []).get(g)).push(p.cle); });
      parNom.forEach((cles, nom) => { if (cles.length < 2) return; const r = { id, lid, nom, cles }; cles.forEach(c => E.runs.set(id + '|' + lid + '|' + c, r)); }); }); });
}
const runDe = (E, id, lid, cle) => E.runs.get(id + '|' + lid + '|' + cle) || null;
const lesRuns = E => [...new Set(E.runs.values())];
/* Le côté d'une pastille : le flanc de la borne qu'elle sert ; sur un
   bornier, le côté de ses fils, ou celui qui n'en a pas. */
function coteDePastille(M, E, t) {
  const p = M.partenairesDe(K(t, M.blocs.get(t).bornes[0].cle))[0]; const B = M.blocs.get(p.id);
  if (B.genre === 'equip') return flancDe1(E, p.id, p.cle) === 'L' ? 'L' : 'R';
  const d = dirs1(E, p.id, p.cle); if (d) return d < 0 ? 'L' : 'R';
  const g = M.partenairesBlocs(K(p.id, p.cle)).filter(q => coteDe(E.place, p.id, q) < 0).length;
  return g ? 'R' : 'L';
}
const flancDe1 = (E, id, cle) => E.sorties.get(K(id, cle)) || E.flancDe.get(K(id, cle));
const dirs1 = (E, id, cle) => E.sorties.has(K(id, cle)) ? (E.sorties.get(K(id, cle)) === 'L' ? -1 : 1) : E.dirs.get(K(id, cle));

/* ===== 5. L'ÉTAT INITIAL ================================================= */
function etatDepuisColonnes(M, col, opt) {
  const place = rangees(M, new Map(col), opt.serpentin | 0);
  const E = { col, place, ...flancs(M, place), sorties: new Map(), prioritaires: new Set(), goulottes: null, options: opt };
  E.clesListes = id => E.listes.get(id).S ? ['S'] : ['L', 'R'];
  E.pileDe = id => { const p = place.get(id); return p.r + '|' + p.c; };
  E.piles = new Map();
  M.ids.forEach(id => { if (M.estTag(id)) return; const k = E.pileDe(id); (E.piles.get(k) || E.piles.set(k, []).get(k)).push(id); });
  construireRuns(M, E);
  return E;
}
const etatInitial = (M, opt) => etatDepuisColonnes(M, candidatsDeNiveaux(M, 1)[0], opt);
const photoOrdres = E => ({ piles: new Map([...E.piles].map(([k, v]) => [k, v.slice()])),
  listes: new Map([...E.listes].map(([id, ls]) => [id, { L: ls.L && ls.L.slice(), R: ls.R && ls.R.slice(), S: ls.S && ls.S.slice() }])),
  runs: lesRuns(E).map(r => [r, r.cles.slice()]) });
const revenirOrdres = (E, ph) => { ph.piles.forEach((v, k) => E.piles.set(k, v.slice()));
  ph.listes.forEach((o, id) => { const ls = E.listes.get(id); if (o.L) ls.L = o.L.slice(); if (o.R) ls.R = o.R.slice(); if (o.S) ls.S = o.S.slice(); });
  ph.runs.forEach(([r, cles]) => { r.cles = cles.slice(); }); };

/* ===== 6. LE SOLVEUR D'ORDONNÉES ======================================== */
/* Les marges d'un bloc au-dessus de sa première borne et sous la dernière. */
function margesDe(M, E, id) { const b = M.blocs.get(id);
  if (b.genre !== 'equip') return [PRH / 2 + 5, PRH / 2 + 5];
  const ls = E.listes.get(id), L = Math.max(1, ls.L.length, ls.R.length); return [L === 1 ? 23 : 18, L === 1 ? 23 : 18]; }
/* Les NETS : union-find à décalages. Un net est un ensemble de bornes à une
   ordonnée commune, à un décalage près : les bornes d'un connecteur en
   forment un dès le départ (k × PRH sous la première), et un fil accepté
   fond les nets de ses deux bouts. */
function nets(M, E) {
  const par = new Map(), dec = new Map(), listesDe = new Map(), decales = new Set();
  M.ids.forEach(id => { if (M.estTag(id)) return; E.clesListes(id).forEach(lid => E.listes.get(id)[lid].forEach(p => { const k = K(id, p.cle);
    if (!par.has(k)) { par.set(k, k); dec.set(k, 0); listesDe.set(k, new Set()); } listesDe.get(k).add(id + '|' + lid); })); });
  const find = x => { let r = x; while (par.get(r) !== r) r = par.get(r);
    const chaine = []; for (let c = x; c !== r; c = par.get(c)) chaine.push(c);
    let cum = 0; for (let i = chaine.length - 1; i >= 0; i--) { cum += dec.get(chaine[i]); par.set(chaine[i], r); dec.set(chaine[i], cum); }
    return r; };
  const pos = x => { const r = find(x); return [r, x === r ? 0 : dec.get(x)]; };
  const fondre = (rb, ra, d) => { par.set(rb, ra); dec.set(rb, d); if (decales.has(rb)) decales.add(ra);
    const ta = listesDe.get(ra); listesDe.get(rb).forEach(k => ta.add(k)); listesDe.delete(rb); };
  lesRuns(E).forEach(r => { const k0 = K(r.id, r.cles[0]);
    r.cles.forEach((c, j) => { if (!j) return; const [ra, oa] = pos(k0), [rb, ob] = pos(K(r.id, c)); if (ra === rb) return;
      fondre(rb, ra, oa + j * PRH - ob); decales.add(ra); }); });
  return { par, dec, listesDe, decales, find, pos, fondre };
}
/* Les CONTRAINTES d'écart qui ne dépendent pas des nets, comme des arêtes
   (a, b, w) sur les bornes : Y(b) ≥ Y(a) + w. L'ordre des bornes d'une liste
   (PRH), les blocs d'une pile qui ne se chevauchent pas, les rangées qui se
   suivent (un nœud virtuel '#r' par frontière). Avec les premières et
   dernières bornes de chaque bloc et ses marges, pour les couloirs. */
function structureDesContraintes(M, E) {
  const S = { aretes: [], premiers: new Map(), derniers: new Map(), mh: new Map(), mb: new Map() };
  M.ids.forEach(id => { if (M.estTag(id)) return; const [mh, mb] = margesDe(M, E, id); S.mh.set(id, mh); S.mb.set(id, mb);
    const listes = E.clesListes(id).map(lid => E.listes.get(id)[lid]).filter(L => L.length);
    S.premiers.set(id, listes.map(L => K(id, L[0].cle))); S.derniers.set(id, listes.map(L => K(id, L[L.length - 1].cle)));
    listes.forEach(L => { for (let j = 1; j < L.length; j++) S.aretes.push([K(id, L[j - 1].cle), K(id, L[j].cle), PRH]); }); });
  const bornier = id => M.blocs.get(id).genre !== 'equip';
  E.piles.forEach(pile => { for (let i = 1; i < pile.length; i++) { const P = pile[i - 1], N = pile[i];
    const w = S.mb.get(P) + ((bornier(P) && bornier(N)) ? 14 : VGAP) + S.mh.get(N);
    S.derniers.get(P).forEach(a => S.premiers.get(N).forEach(b => S.aretes.push([a, b, w]))); } });
  const parRangee = new Map(); M.ids.forEach(id => { if (M.estTag(id)) return; const r = E.place.get(id).r; (parRangee.get(r) || parRangee.set(r, []).get(r)).push(id); });
  parRangee.forEach((ids, r) => { if (!parRangee.has(r + 1)) return; const sep = '#' + r;
    ids.forEach(id => S.derniers.get(id).forEach(a => S.aretes.push([a, sep, S.mb.get(id) + RANGEE_GAP / 2])));
    parRangee.get(r + 1).forEach(id => S.premiers.get(id).forEach(b => S.aretes.push([sep, b, RANGEE_GAP / 2 + S.mh.get(id)]))); });
  return S;
}
/* Les contraintes portées sur les nets : `f` place une borne dans son net
   (racine, décalage) ; plus les couloirs des fils qui enjambent une colonne. */
function contraintes(S, f, traversees) {
  const A = []; const fx = x => (x[0] === '#' ? [x, 0] : f(x));
  const arete = (a, b, w) => { const [ra, oa] = fx(a), [rb, ob] = fx(b); A.push([ra, rb, w + oa - ob]); };
  S.aretes.forEach(([a, b, w]) => arete(a, b, w));
  traversees.forEach(t => { if (t.dessus) S.derniers.get(t.dessus).forEach(a => arete(a, t.net, S.mb.get(t.dessus) + 6));
    if (t.dessous) S.premiers.get(t.dessous).forEach(b => arete(t.net, b, S.mh.get(t.dessous) + 6)); });
  return A;
}
/* Un système d'écarts est possible s'il n'a pas de cycle : une contrainte
   d'un net sur lui-même est vide si son poids est nul ou négatif. */
function acyclique(A) {
  const indeg = new Map(), ad = new Map(), ns = new Set();
  for (const [a, b, w] of A) { if (a === b) { if (w > 0.01) return false; continue; }
    ns.add(a); ns.add(b); (ad.get(a) || ad.set(a, []).get(a)).push(b); indeg.set(b, (indeg.get(b) || 0) + 1); }
  const q = [...ns].filter(n => !indeg.get(n)); let vus = 0;
  while (q.length) { const n = q.pop(); vus++; (ad.get(n) || []).forEach(m => { const d = indeg.get(m) - 1; indeg.set(m, d); if (!d) q.push(m); }); }
  return vus === ns.size;
}
/* Les fils qu'on peut rendre droits : entre deux blocs de la même rangée et
   de colonnes différentes ; pas ceux d'une borne qui sert plusieurs blocs du
   même côté — une barrette de piquage les rend droits quelle que soit leur
   hauteur. Les fils prioritaires d'abord, puis ceux d'une barrette (elle
   s'allonge), puis les voisins, les enjambements en dernier. */
function filsCandidats(M, E) {
  const piquage = (id, cle, s) => new Set(M.partenairesBlocs(K(id, cle)).filter(q => coteDe(E.place, id, q) === s).map(q => q.id)).size >= 2;
  const cand = [];
  M.liens.forEach(w => { if (w.shunt || w.boucle || M.estTag(w.a.id) || M.estTag(w.b.id)) return;
    const pa = E.place.get(w.a.id), pb = E.place.get(w.b.id); if (pa.r !== pb.r || pa.c === pb.c) return;
    const s = Math.sign(pb.c - pa.c); if (piquage(w.a.id, w.a.cle, s) || piquage(w.b.id, w.b.cle, -s)) return;
    const d = Math.abs(pa.c - pb.c), genre = id => M.blocs.get(id).genre;
    const bornier = (genre(w.a.id) !== 'equip') + (genre(w.b.id) !== 'equip'), barrette = (genre(w.a.id) === 'barrette') + (genre(w.b.id) === 'barrette');
    cand.push({ li: w.li, a: K(w.a.id, w.a.cle), b: K(w.b.id, w.b.cle), r: pa.r, c0: Math.min(pa.c, pb.c), c1: Math.max(pa.c, pb.c),
      pr: (E.prioritaires.has(w.li) ? -100 : 0) + (d > 1 ? 10 : 0) + bornier - 2 * barrette }); });
  return cand.sort((x, y) => x.pr - y.pr);
}
/* Entre quels blocs d'une colonne enjambée un fil passe, d'après les
   ordonnées du tour précédent. */
function couloir(M, E, estimY, r, c, y) {
  let dessus = null, dessous = null;
  (E.piles.get(r + '|' + c) || []).forEach(id => { let lo = Infinity, hi = -Infinity;
    E.clesListes(id).forEach(lid => E.listes.get(id)[lid].forEach(p => { const v = estimY(K(id, p.cle)); lo = Math.min(lo, v); hi = Math.max(hi, v); }));
    if (!isFinite(lo)) return;
    if (hi <= y) { if (!dessus || hi > dessus.hi) dessus = { id, hi }; }
    else if (lo >= y) { if (!dessous || lo < dessous.lo) dessous = { id, lo }; }
    else if (y - lo < hi - y) { if (!dessous || lo < dessous.lo) dessous = { id, lo }; }     // le fil passe au-dessus du bloc qui le gêne
    else if (!dessus || hi > dessus.hi) dessus = { id, hi }; });
  return { dessus: dessus && dessus.id, dessous: dessous && dessous.id };
}
/* Le plus long chemin depuis le haut : chaque net au plus haut que les
   contraintes permettent. Rend Y par net et l'ordre topologique. */
function plusLongChemin(A, racines) {
  const indeg = new Map(), ad = new Map(), ns = new Set(racines);
  A.forEach(([a, b, w]) => { if (a === b) return; ns.add(a); ns.add(b); (ad.get(a) || ad.set(a, []).get(a)).push([b, w]); indeg.set(b, (indeg.get(b) || 0) + 1); });
  const Y = new Map(); const ordre = [...ns].filter(n => !indeg.get(n)); ordre.forEach(n => Y.set(n, 0));
  for (let i = 0; i < ordre.length; i++) { const n = ordre[i]; (ad.get(n) || []).forEach(([m, w]) => { Y.set(m, Math.max(Y.get(m) || 0, Y.get(n) + w));
    const d = indeg.get(m) - 1; indeg.set(m, d); if (!d) ordre.push(m); }); }
  return { Y, ordre, ad };
}
/* La DÉTENTE : un net qui est le sommet d'un bloc (et le bas d'aucun)
   redescend au plus près — le bloc se referme sur ses bornes. */
function detendre(M, E, N, Y, ordre, ad) {
  const yDe = k => { const [r, o] = N.pos(k); return (Y.get(r) || 0) + o; };
  const netBlocs = new Map();
  M.ids.forEach(id => { if (M.estTag(id)) return; E.clesListes(id).forEach(lid => E.listes.get(id)[lid].forEach(p => { const r = N.find(K(id, p.cle)); (netBlocs.get(r) || netBlocs.set(r, new Set()).get(r)).add(id); })); });
  for (let dp = 0; dp < 2; dp++) for (let i = ordre.length - 1; i >= 0; i--) { const n = ordre[i]; if (N.decales.has(n) || n[0] === '#') continue;
    const oe = ad.get(n); let mx = Infinity; if (oe && oe.length) oe.forEach(([m, w]) => mx = Math.min(mx, Y.get(m) - w));
    const y0 = Y.get(n) || 0; let hauts = 0, bas = 0, cible = Infinity;
    (netBlocs.get(n) || []).forEach(id => { let lo = Infinity, lo2 = Infinity, hi = -Infinity, loN = 0;
      E.clesListes(id).forEach(lid => E.listes.get(id)[lid].forEach(p => { const yy = yDe(K(id, p.cle));
        if (yy < lo - 0.01) { lo2 = lo; lo = yy; loN = 1; } else if (yy < lo + 0.01) loN++; else if (yy < lo2) lo2 = yy;
        if (yy > hi) hi = yy; }));
      if (Math.abs(y0 - lo) < 0.01 && loN === 1) { hauts++; if (isFinite(lo2)) cible = Math.min(cible, lo2 - PRH); }
      if (Math.abs(y0 - hi) < 0.01) bas++; });
    if (!(oe && oe.length)) mx = isFinite(cible) ? cible : y0;
    if (mx > y0 + 0.5 && hauts >= 1 && bas === 0) Y.set(n, mx); }
}
/* RÉSOUDRE : chaque fil accepté reçoit UNE ordonnée partagée par ses deux
   bornes ; un fil qui créerait un cycle reste plié. `guide` : les ordonnées
   du tour précédent, pour deviner les couloirs des enjambements. Rend
   { y, haut, bas, acc } — acc, le nombre de fils alignés. */
function resoudre(M, E, guide) {
  evaluations += 2;                       // un solveur vaut deux routages au budget
  const N = nets(M, E), S = structureDesContraintes(M, E); const traversees = []; const estimY = k => (guide && guide.get(k)) ?? 0;
  let acc = 0;
  filsCandidats(M, E).forEach(wc => { const [ra, oa] = N.pos(wc.a), [rb, ob] = N.pos(wc.b);
    if (ra === rb) { if (Math.abs(oa - ob) < 0.01) acc++; return; }
    // deux bornes d'une même liste ne partagent pas une ordonnée — sauf à des décalages différents, ce que le test de cycle tranche seul
    if (!N.decales.has(ra) && !N.decales.has(rb)) { const ta = N.listesDe.get(ra); for (const k of N.listesDe.get(rb)) if (ta.has(k)) return; }
    const d = oa - ob;                                  // Y(rb) = Y(ra) + d met les deux bouts à la même hauteur
    const f = x => { const [r, o] = N.pos(x); return r === rb ? [ra, o + d] : [r, o]; };
    const ajoutees = [];
    for (let c = wc.c0 + 1; c < wc.c1; c++) { const { dessus, dessous } = couloir(M, E, estimY, wc.r, c, (estimY(wc.a) + estimY(wc.b)) / 2);
      if (dessus || dessous) { const t = { net: wc.a, dessus, dessous }; traversees.push(t); ajoutees.push(t); } }
    if (!acyclique(contraintes(S, f, traversees))) { ajoutees.forEach(() => traversees.pop()); return; }
    N.fondre(rb, ra, d); acc++; });
  const racines = []; M.ids.forEach(id => { if (M.estTag(id)) return; E.clesListes(id).forEach(lid => E.listes.get(id)[lid].forEach(p => racines.push(N.find(K(id, p.cle))))); });
  const { Y, ordre, ad } = plusLongChemin(contraintes(S, N.pos, traversees), racines);
  detendre(M, E, N, Y, ordre, ad);
  const y = new Map(), haut = new Map(), bas = new Map();
  M.ids.forEach(id => { if (M.estTag(id)) return; let lo = Infinity, hi = -Infinity; const [mh, mb] = margesDe(M, E, id);
    E.clesListes(id).forEach(lid => E.listes.get(id)[lid].forEach(p => { const [r, o] = N.pos(K(id, p.cle)); const v = HAUT_PAGE + (Y.get(r) || 0) + o;
      y.set(K(id, p.cle), v); lo = Math.min(lo, v); hi = Math.max(hi, v); }));
    if (!isFinite(lo)) { lo = HAUT_PAGE; hi = HAUT_PAGE; }
    haut.set(id, lo - mh); bas.set(id, hi + mb); });
  return { y, haut, bas, acc };
}

/* ===== 7. LE BARYCENTRE ================================================== */
/* Les partenaires qui comptent pour ranger un bloc dans sa colonne : une
   borne de bornier (ordre imposé) DICTE, une borne d'équipement suit ; un
   bornier écoute tout le monde. Un partenaire d'une autre rangée compte en
   miroir, pour que les fils de retour d'un repli s'emboîtent. */
function barycentre(M, E, y, moyenne, parite) {
  const centre = v => (moyenne ? v.reduce((a, b) => a + b, 0) / v.length : mediane(v));
  // une colonne sur deux à chaque passe, les autres servant de repère : deux colonnes qui se réordonnent l'une sur l'autre en même temps s'inversent sans fin
  const auTour = id => (E.place.get(id).c % 2) === parite;
  const bandes = new Map();
  y.forEach((v, k) => { const id = k.slice(0, k.indexOf(SEP)); const r = E.place.get(id).r; const b = bandes.get(r) || bandes.set(r, { lo: Infinity, hi: -Infinity }).get(r); b.lo = Math.min(b.lo, v); b.hi = Math.max(b.hi, v); });
  const vue = (id, q) => { const v = y.get(K(q.id, q.cle)); if (v == null) return null; const r = E.place.get(id).r, rq = E.place.get(q.id).r;
    if (r === rq) return v; const b = bandes.get(rq); return b.lo + b.hi - v; };
  const bornier = id => M.blocs.get(id).genre !== 'equip';
  E.piles.forEach(pile => { if (pile.length < 2 || !auTour(pile[0])) return;
    const cle = new Map(pile.map((id, i) => { const fixes = [], tous = [];
      M.blocs.get(id).bornes.forEach(p => M.partenairesBlocs(K(id, p.cle)).forEach(q => { const v = vue(id, q); if (v == null) return; tous.push(v); if (bornier(q.id)) fixes.push(v); }));
      const use = (!bornier(id) && fixes.length) ? fixes : tous; return [id, use.length ? centre(use) : 1e9 + i]; }));
    pile.sort((a, b) => cle.get(a) - cle.get(b)); });
  // les bornes d'un équipement : un connecteur au centre de ses partenaires, ses bornes dans l'ordre vertical des leurs ; un paquet ponté reste ensemble
  M.ids.forEach(id => { const b = M.blocs.get(id); if (b.genre !== 'equip' || !auTour(id)) return;
    ['L', 'R'].forEach(lid => { const L = E.listes.get(id)[lid]; if (L.length < 2) return;
      const cleDe = new Map(L.map(p => { const vs = M.partenairesBlocs(K(id, p.cle)).map(q => vue(id, q)).filter(v => v != null); return [p.cle, vs.length ? centre(vs) : null]; }));
      const paquets = paquetsDe(M, id, L.map(p => p.cle));
      const unites = paquets.map(cles => { const vs = cles.map(c => cleDe.get(c)).filter(v => v != null); return { cles, k: vs.length ? centre(vs) : null, run: runDe(E, id, lid, cles[0]) }; });
      unites.forEach((u, i) => { if (u.k == null) u.k = y.get(K(id, u.cles[0])) ?? i; });
      const groupes = new Map();
      unites.forEach(u => { const g = u.run ? u.run.nom : ('~' + u.cles[0]); (groupes.get(g) || groupes.set(g, []).get(g)).push(u); });
      // à égalité, l'ordre naturel : une borne dédoublée garde le même rang sur ses deux flancs
      const nat = (u, v) => ordreNaturel(etiqDe.get(u.cles[0]), etiqDe.get(v.cles[0])), etiqDe = new Map(b.bornes.map(p => [p.cle, p.etiq]));
      const ordre = [...groupes.values()].map(us => { us.sort((p, q) => (p.k - q.k) || nat(p, q)); return { us, k: centre(us.map(u => u.k)) }; }).sort((p, q) => (p.k - q.k) || nat(p.us[0], q.us[0]));
      const nouv = ordre.flatMap(g => g.us.flatMap(u => u.cles)); const parCle = new Map(L.map(p => [p.cle, p]));
      E.listes.get(id)[lid] = nouv.map(c => parCle.get(c));
      nouv.forEach(c => { const r = runDe(E, id, lid, c); if (r) r.cles = nouv.filter(x => r.cles.includes(x)); }); }); });
}
/* Les paquets d'une liste : les bornes pontées ensemble, dans l'ordre
   naturel ; une borne seule est un paquet. */
function paquetsDe(M, id, cles) {
  const chef = new Map(cles.map(c => [c, c])); const trouver = c => { while (chef.get(c) !== c) c = chef.get(c); return c; };
  (M.pontes.get(id) || []).forEach(([a, b]) => { if (!chef.has(a) || !chef.has(b)) return; const ra = trouver(a), rb = trouver(b); if (ra !== rb) chef.set(rb, ra); });
  const etiq = new Map(M.blocs.get(id).bornes.map(p => [p.cle, p.etiq])); const groupes = new Map();
  cles.slice().sort((a, b) => ordreNaturel(etiq.get(a), etiq.get(b))).forEach(c => { const r = trouver(c); (groupes.get(r) || groupes.set(r, []).get(r)).push(c); });
  return [...groupes.values()];
}
/* Ordonner un état : le barycentre et le solveur en alternance, l'ordre
   qui aligne le plus de fils est gardé. */
function ordonner(M, E, maxit) {
  let pos = resoudre(M, E, null), best = pos, bestOrdre = photoOrdres(E), stagne = 0;
  const MAXIT = maxit || (M.ids.length > 300 ? 8 : 20);
  for (let it = 0; it < MAXIT && stagne < 6; it++) { barycentre(M, E, pos.y, (it >> 1) % 2 === 1, it % 2); pos = resoudre(M, E, pos.y);
    if (pos.acc > best.acc + 0.01) { best = pos; bestOrdre = photoOrdres(E); stagne = 0; } else stagne++; }
  revenirOrdres(E, bestOrdre);
  return best;
}

/* ===== 8. ASSEMBLER : la géométrie, le contrat du routeur et du dessin === */
/* Le bout d'un fil sur une borne : le flanc d'où il sort face à son
   partenaire, la goulotte et son côté (`stub` : 'L' pour une borne du flanc
   droit, dont la goulotte est à droite). */
function boutDe(M, E, geo, id, cle, q) {
  const b = M.blocs.get(id), g = geo.get(id);
  // une pastille regarde sa borne : même goulotte qu'elle, côté opposé
  if (b.genre === 'tag') return { flanc: g.cote === 'R' ? 'L' : 'R', ch: g.col + (g.cote === 'R' ? 1 : 0), stub: g.cote === 'R' ? 'R' : 'L' };
  let flanc;
  { const f = b.genre === 'equip' ? flancDe1(E, id, cle) : null, d = b.genre === 'equip' ? null : dirs1(E, id, cle);
    if (f === 'L' || f === 'R') flanc = f; else if (d) flanc = d < 0 ? 'L' : 'R';
    else { const s = M.estTag(q.id) ? (geo.get(q.id).cote === 'L' ? -1 : 1) : coteDe(E.place, id, q);
      if (s) flanc = s < 0 ? 'L' : 'R';
      else { const fq = E.flancDe.get(K(q.id, q.cle)), dq = E.dirs.get(K(q.id, q.cle)); flanc = fq === 'L' || fq === 'R' ? fq : (dq < 0 ? 'L' : 'R'); } } }
  return { flanc, ch: g.col + (flanc === 'R' ? 1 : 0), stub: flanc === 'R' ? 'L' : 'R' };
}
function assembler(M, E, pos) {
  const blocs = M.ids.filter(id => !M.estTag(id)), tags = M.ids.filter(id => M.estTag(id));
  const colDe = id => E.place.get(id).c; const nCols = 1 + Math.max(0, ...blocs.map(colDe));
  const geo = new Map();
  // les colonnes : le bloc le plus large, plus la place des pastilles collées à ses flancs
  const wMax = new Array(nCols).fill(0), zone = Array.from({ length: nCols }, () => ({ L: false, R: false }));
  blocs.forEach(id => { wMax[colDe(id)] = Math.max(wMax[colDe(id)], LARGEUR[M.blocs.get(id).genre]); });
  const partenaireDe = t => M.partenairesDe(K(t, M.blocs.get(t).bornes[0].cle))[0];
  tags.forEach(t => { const cote = coteDePastille(M, E, t); zone[colDe(partenaireDe(t).id)][cote] = true; geo.set(t, { cote }); });
  const colW = wMax.map((w, c) => w + (zone[c].L ? ZONE_PASTILLE : 0) + (zone[c].R ? ZONE_PASTILLE : 0));
  // les goulottes : 9 par fil qui y entre, jamais moins de 54 ; ou la largeur mesurée au routage précédent
  blocs.forEach(id => { const b = M.blocs.get(id), c = colDe(id), w = LARGEUR[b.genre]; let g = 0, d = 0;
    b.bornes.forEach(p => M.partenairesBlocs(K(id, p.cle)).forEach(q => { const s = coteDe(E.place, id, q); if (s < 0) g++; else if (s > 0) d++; }));
    const x0 = (zone[c].L ? ZONE_PASTILLE : 0) + (w < wMax[c] ? (d && !g ? wMax[c] - w : (g && !d ? 0 : (wMax[c] - w) / 2)) : 0);
    geo.set(id, { x: x0, w, col: c, h: pos.bas.get(id) - pos.haut.get(id), y: pos.haut.get(id) }); });
  tags.forEach(t => { const p = partenaireDe(t), g = geo.get(t), gp = geo.get(p.id); g.col = gp.col; g.w = BORNW; g.h = HAUT_PASTILLE;
    g.x = g.cote === 'R' ? gp.x + gp.w + FIL_PASTILLE : gp.x - FIL_PASTILLE - BORNW; g.y = pos.y.get(K(p.id, p.cle)) - HAUT_PASTILLE / 2; });
  const bouts = M.liens.map(w => (w.shunt || w.boucle) ? null : [boutDe(M, E, geo, w.a.id, w.a.cle, w.b), boutDe(M, E, geo, w.b.id, w.b.cle, w.a)]);
  const chN = new Array(nCols + 1).fill(0);
  bouts.forEach((bt, li) => { if (!bt || M.estTag(M.liens[li].a.id) || M.estTag(M.liens[li].b.id)) return; chN[bt[0].ch]++; if (bt[0].ch !== bt[1].ch) chN[bt[1].ch]++; });
  const chW = chN.map((n, i) => (E.goulottes && E.goulottes[i] != null) ? E.goulottes[i] : Math.max(GOULOTTE_MIN, 28 + n * 9));
  const colX = []; let cx = MARGE + chW[0]; for (let i = 0; i < nCols; i++) { colX.push(cx); cx += colW[i] + chW[i + 1]; }
  geo.forEach(g => { g.x += colX[g.col]; });
  return contrat(M, E, pos, geo, bouts, { colX, colW, chW, nCols });
}
/* Les blocs et les liaisons, prêts à dessiner. */
function contrat(M, E, pos, geo, bouts, cols) {
  const comps = [], compDe = new Map(), pastilles = [];
  let yMin = Infinity, yMax = -Infinity;
  M.ids.forEach(id => { const b = M.blocs.get(id), g = geo.get(id), parCle = new Map(), rangs = {};
    if (b.genre === 'tag') { const p = M.partenairesDe(K(id, b.bornes[0].cle))[0], y = pos.y.get(K(p.id, p.cle));
      rangs.S = [{ etiq: b.bornes[0].etiq, y, dir: g.cote === 'R' ? -1 : 1 }]; parCle.set(b.bornes[0].cle, { y });
      pastilles.push({ id, ch: g.col + (g.cote === 'R' ? 1 : 0), y1: g.y, y2: g.y + g.h, x: g.x, w: g.w }); }
    else E.clesListes(id).forEach(lid => { rangs[lid] = E.listes.get(id)[lid].slice().sort((u, v) => pos.y.get(K(id, u.cle)) - pos.y.get(K(id, v.cle))).map(p => { const y = pos.y.get(K(id, p.cle)); parCle.set(p.cle, { y });
      const f = flancDe1(E, id, p.cle), dir = lid === 'S' ? dirs1(E, id, p.cle) : (f === 'LR' ? 0 : (lid === 'R' ? 1 : -1));
      return { etiq: p.etiq, y, dir }; }); });
    const tag = b.genre === 'tag';
    const c = { name: b.nom, id, x: g.x, y: g.y, w: g.w, h: g.h, col: g.col, kind: tag ? 'tag' : (b.genre === 'equip' ? 'equip' : 'strip'),
      lw: tag ? 0 : STRIPW, rw: tag ? 0 : STRIPW, rangs, parCle, rail: estRail(b.nom) };
    comps.push(c); compDe.set(id, c); if (!compDe.has(b.nom)) compDe.set(b.nom, c);
    if (!tag) { yMin = Math.min(yMin, g.y); yMax = Math.max(yMax, g.y + g.h); } });
  if (!isFinite(yMin)) { yMin = HAUT_PAGE; yMax = HAUT_PAGE + 200; }
  const links = M.liens.map((w, li) => { const l = M.lk[li], bt = bouts[li], cA = compDe.get(w.a.id), cB = compDe.get(w.b.id);
    const ep = (b, u) => { const c = compDe.get(u.id); return b ? { x: b.flanc === 'R' ? c.x + c.w : c.x, y: c.parCle.get(u.cle).y, ch: b.ch, stub: b.stub } : { x: c.x, y: c.parCle.get(u.cle).y, ch: c.col, stub: 'R' }; };
    return { i: li, ...l, boucle: w.boucle, shunt: w.shunt, epA: ep(bt && bt[0], w.a), epB: ep(bt && bt[1], w.b) }; });
  // le cadre se cale sur les blocs dessinés, marges proportionnées, réserve pour le cartouche
  const cx0 = Math.min(...comps.map(c => c.x)), cx1 = Math.max(...comps.map(c => c.x + c.w));
  const cw0 = cx1 - cx0, ch0 = yMax - yMin, resv = 30;
  const mx = Math.max(50, Math.min(150, cw0 * 0.07)), mt = Math.max(50, Math.min(150, ch0 * 0.07)), mb = Math.max(95, Math.min(150, ch0 * 0.07));
  const bbox = { x: cx0 - resv - mx, y: yMin - mt, w: (cx1 + resv + mx) - (cx0 - resv - mx), h: (yMax + mb) - (yMin - mt) };
  // on tend vers le format A3 sans jamais ajouter plus d'un tiers de vide
  const cible = (cw0 / Math.max(1, ch0) < 1) ? (1 / A3) : A3, GONFLE = 1.35, r0 = bbox.w / bbox.h;
  if (r0 < cible) { const nw = Math.min(bbox.h * cible, bbox.w * GONFLE); if (nw > bbox.w) { bbox.x -= (nw - bbox.w) / 2; bbox.w = nw; } }
  else if (r0 > cible) { const nh = Math.min(bbox.w / cible, bbox.h * GONFLE); if (nh > bbox.h) { bbox.y -= (nh - bbox.h) / 2; bbox.h = nh; } }
  const colonnes = Array.from({ length: cols.nCols }, () => []); const colonneDe = new Map();
  comps.forEach(c => { if (c.kind !== 'tag') colonnes[c.col].push(c.id); colonneDe.set(c.id, c.col); });
  const nR = 1 + Math.max(0, ...[...E.place.values()].map(p => p.r));
  /* les pastilles vivent dans la zone réservée de leur colonne, jamais dans
     une goulotte : le routeur n'a pas de piste à en écarter (`pastilles` est
     donné pour information, hors de son champ `pastilles`) */
  return { comps, links, bbox, compDe, options: E.options, geom: { colonnes, colonneDe, colX: cols.colX, colW: cols.colW, chW: cols.chW, nCols: cols.nCols, yMin, yMax, pastilles: [], pastillesCollees: pastilles, rangees: nR > 1 ? nR : 0, resserre: !!E.goulottes } };
}

/* ===== 9. LE JUGE ======================================================== */
/* Les fils MUETS : ceux dont le dessin ne peut pas écrire le numéro (segment
   trop court, ou barré par un vertical). C'est le dessin qui sait poser une
   étiquette : on lui demande, quand il est là. */
function compterMuets(R) {
  if (typeof reperesDeFil !== 'function') return 0;
  const fils = R.fils.filter(w => !w.shunt && String(w.cable || '').trim()); if (!fils.length) return 0;
  const verticaux = verticauxDe([...fils.map(w => w.pts), ...tracesDePiquage(R.barrettes)]);
  return fils.length - (reperesDeFil(fils, verticaux, R.barrettes).match(/<text /g) || []).length;
}
function chevauchements(C) { let n = 0;
  for (let i = 0; i < C.length; i++) for (let j = i + 1; j < C.length; j++) { const a = C[i], b = C[j];
    if (a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1) n++; }
  return n; }
/* Ce que le juge mesure sur un dessin routé : sain, tient sur la feuille,
   fils droits, croisements, lisibilité, numéros muets, encombrement (ce qui
   limite l'échelle d'impression sur une feuille au format A, paysage ou
   portrait), surface, longueur des fils. */
function juger(L, R) {
  const fils = R.fils.filter(w => !w.shunt), blocs = L.comps.filter(c => c.kind !== 'tag');
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  L.comps.forEach(c => { x0 = Math.min(x0, c.x); x1 = Math.max(x1, c.x + c.w); y0 = Math.min(y0, c.y); y1 = Math.max(y1, c.y + c.h); });
  // les goulottes sont taillées pour tous leurs fils, mais les fils droits ne prennent pas de piste : on juge la largeur qu'aura le dessin resserré
  const occ = L.geom.resserre ? null : goulottesOccupees(L, R); let resserre = 0; if (occ) for (let i = 1; i < L.geom.nCols; i++) resserre += Math.max(0, L.geom.chW[i] - occ[i]);
  const w = Math.max(1, x1 - x0 - resserre), h = Math.max(1, y1 - y0), r = w / h;
  let longueur = 0; fils.forEach(f => { for (let i = 0; i < f.pts.length - 1; i++) longueur += Math.abs(f.pts[i + 1].x - f.pts[i].x) + Math.abs(f.pts[i + 1].y - f.pts[i].y); });
  const droits = compterDroits(fils), croisements = compterCroisements(fils, R.barrettes);
  const j = { sain: filsDansBlocs(fils, blocs) === 0 && chevauchements(L.comps) === 0, tient: r <= FORMAT_MAX && r >= 1 / FORMAT_MAX, format: r,
    droits, croisements, lisibilite: droits - croisements / CROISEMENTS_PAR_DROIT,
    encombrement: Math.min(Math.max(w / A3, h), Math.max(w, h / A3)), surface: w * h, longueur };
  // les muets coûtent cher à compter (le dessin pose ses étiquettes) : seulement quand droits et croisements sont à égalité
  let muets = null; Object.defineProperty(j, 'muets', { enumerable: true, get() { if (muets == null) muets = compterMuets(R); return muets; } });
  return j;
}
/* Un dessin qui met un fil dans un bloc ne gagne jamais ; un dessin qui tient
   sur une feuille bat un dessin qui n'y tient pas ; puis la LISIBILITÉ : les
   fils droits, dont on retranche les croisements — un croisement est un pont
   que le lecteur doit résoudre, huit croisements coûtent un fil droit (un fil
   rendu droit par une barrette de piquage qui tranche quinze fils ne gagne
   pas) ; à égalité les fils droits, puis les croisements, puis les numéros
   muets, l'encombrement, la surface, la longueur des fils. */
const CROISEMENTS_PAR_DROIT = 8;
function bat(a, b, tolerant) {
  if (!b) return true;
  const tient = j => tolerant ? (j.format <= FORMAT_MAX * 1.2 && j.format >= 1 / (FORMAT_MAX * 1.2)) : j.tient;
  if (a.sain !== b.sain) return a.sain; if (tient(a) !== tient(b)) return tient(a);
  if (Math.abs(a.lisibilite - b.lisibilite) > 0.01) return a.lisibilite > b.lisibilite;
  if (a.droits !== b.droits) return a.droits > b.droits; if (a.croisements !== b.croisements) return a.croisements < b.croisements;
  if (a.muets !== b.muets) return a.muets < b.muets;
  if (Math.abs(a.encombrement - b.encombrement) > 0.01 * b.encombrement) return a.encombrement < b.encombrement;
  if (Math.abs(a.surface - b.surface) > 0.01 * b.surface) return a.surface < b.surface;
  return a.longueur < b.longueur - 0.5;
}
/* Évaluer un état à une position : assembler, router, juger. Le compteur
   sert de budget à la recherche locale : en évaluations, pas en secondes,
   pour que le même contrat donne le même dessin sur toute machine. */
let evaluations = 0;
function evaluer(M, E, pos) { evaluations++; const L = assembler(M, E, pos); const R = router(L); return { E, pos, L, R, j: juger(L, R) }; }
/* Un dessin un peu trop large pour la feuille s'ÉTIRE : de l'espace
   s'insère dans les bandes vides (aucun bloc ne les traverse, dans aucune
   colonne), ce qui garde tous les alignements et tous les tracés. */
function etirerAuFormat(M, meilleur) {
  const j = meilleur.j; if (j.tient || j.format <= FORMAT_MAX || j.format > FORMAT_MAX * 1.3) return meilleur;
  const pos = meilleur.pos, ids = M.ids.filter(id => !M.estTag(id));
  const iv = ids.map(id => [pos.haut.get(id), pos.bas.get(id)]).sort((a, b) => a[0] - b[0]); const occ = [];
  iv.forEach(([a, b]) => { const d = occ[occ.length - 1]; if (d && a <= d[1] + 1) d[1] = Math.max(d[1], b); else occ.push([a, b]); });
  if (occ.length < 2) return meilleur;
  const y0 = occ[0][0], y1 = occ[occ.length - 1][1], manque = j.format * (y1 - y0) / (FORMAT_MAX * 0.98) - (y1 - y0);
  const part = manque / (occ.length - 1), y = new Map(pos.y), haut = new Map(pos.haut), bas = new Map(pos.bas);
  const decalage = v => { let d = 0; for (let i = 1; i < occ.length; i++) if (v >= occ[i][0] - 0.01) d += part; return d; };
  ids.forEach(id => { const d = decalage(pos.haut.get(id)); haut.set(id, pos.haut.get(id) + d); bas.set(id, pos.bas.get(id) + d);
    M.blocs.get(id).bornes.forEach(p => { const k = K(id, p.cle); if (y.has(k)) y.set(k, y.get(k) + d); }); });
  const cand = evaluer(M, meilleur.E, { y, haut, bas, acc: pos.acc });
  return bat(cand.j, meilleur.j) ? cand : meilleur;
}
/* Le RESSERRAGE, une fois le placement choisi : les goulottes reprennent la
   largeur que les pistes occupent vraiment (le juge l'anticipait) ; gardé
   s'il ne perd rien. */
function resserrer(M, meilleur) {
  const E = meilleur.E, fix = goulottesOccupees(meilleur.L, meilleur.R); if (!fix) return meilleur;
  const large = meilleur.L.geom.chW.slice(), avant = E.goulottes;
  const sansPerte = c => c.j.sain && c.j.droits >= meilleur.j.droits && c.j.croisements <= meilleur.j.croisements && c.j.muets <= meilleur.j.muets;
  const essai = g => { E.goulottes = g; return evaluer(M, E, meilleur.pos); };
  const tout = essai(fix); if (sansPerte(tout)) return tout;
  // le routeur n'aime pas toujours une goulotte plus étroite (un piquage y perd sa place) : celles qui ne changent rien, une par une
  const sures = large.slice();
  fix.forEach((w, i) => { if (w >= large[i]) return; const g = sures.slice(); g[i] = w; if (sansPerte(essai(g))) sures[i] = w; });
  const cand = essai(sures); if (sansPerte(cand)) return cand;
  E.goulottes = avant; return meilleur;
}

/* ===== 10. LA RECHERCHE LOCALE AU ROUTAGE RÉEL ========================== */
/* L'estimation ne voit ni le piquage qui rend un fil droit, ni le croisement
   que crée une descente ; le routeur, si. Chaque geste se juge donc en
   routant pour de vrai, et n'est gardé que s'il gagne au juge :
     · l'ordre des bornes d'un connecteur (exact jusqu'à cinq, échanges
       deux à deux au-delà), un paquet ponté restant ensemble ;
     · le glissement d'un bloc en face d'un partenaire, ses feuilles avec lui ;
     · l'échange de deux blocs d'une colonne, puis le solveur rejoue ;
     · un fil plié rendu prioritaire au solveur ;
     · le flanc d'un connecteur ;
     · le côté de sortie d'une borne de bornier qui ne sert qu'une pastille.
   Jusqu'à convergence, ou la fin du budget. */
function rechercheLocale(M, meilleur, budget) {
  const copie = pos => ({ y: new Map(pos.y), haut: new Map(pos.haut), bas: new Map(pos.bas), acc: pos.acc });
  const journal = meilleur.journal || (meilleur.journal = []); let geste = '';
  const garder = cand => { if (!bat(cand.j, meilleur.j)) return false; cand.journal = journal; journal.push({ geste, droits: cand.j.droits, croisements: cand.j.croisements }); meilleur = cand; return true; };
  const fin = evaluations + budget; let temps = () => evaluations < fin;
  // après un geste géométrique gardé, l'état reprend l'ordre des ordonnées
  const ordonnerParY = (E, pos) => { M.ids.forEach(id => { if (M.estTag(id)) return; E.clesListes(id).forEach(lid => E.listes.get(id)[lid].sort((u, v) => pos.y.get(K(id, u.cle)) - pos.y.get(K(id, v.cle)))); });
    lesRuns(E).forEach(r => r.cles.sort((a, b) => pos.y.get(K(r.id, a)) - pos.y.get(K(r.id, b))));
    E.piles.forEach(pile => pile.sort((a, b) => pos.haut.get(a) - pos.haut.get(b))); };
  const essayerGeometrie = pos => { const E = meilleur.E, cand = evaluer(M, E, pos); if (!garder(cand)) return false; ordonnerParY(E, pos); return true; };
  const essayerEtat = () => { const E = meilleur.E, cand = evaluer(M, E, resoudre(M, E, meilleur.pos.y)); return garder(cand); };
  const essayerAutreEtat = E2 => garder(evaluer(M, E2, ordonner(M, E2, 8)));
  const gestes = [
    ['permutation', () => permutationsDeBornes(M, meilleur.E, () => meilleur.pos, copie, essayerGeometrie, temps)],
    ['glissement', () => glissements(M, meilleur.E, () => meilleur, copie, essayerGeometrie, temps)],
    ['échange', () => echangesDeBlocs(M, meilleur.E, essayerEtat, temps)],
    ['priorité', () => promotions(M, meilleur.E, () => meilleur, essayerEtat, temps)],
    ['flanc', () => flancsDeConnecteurs(M, meilleur.E, essayerEtat, temps)],
    ['sortie', () => sortiesDeBornier(M, meilleur.E, essayerEtat, temps)],
    ['colonne', () => changementsDeColonne(M, () => meilleur.E, () => meilleur, essayerAutreEtat, temps)]];
  for (let passe = 0; passe < 6 && temps(); passe++) { let any = false; gestes.forEach(([nom, g]) => { geste = nom; if (temps() && g()) any = true; }); if (!any) break; }
  // pour finir, les échanges de bornes seuls, sans compter : un échange évident ne se manque pas
  const finPermutations = evaluations + Math.max(400, budget / 2); temps = () => evaluations < finPermutations; geste = 'permutation';
  for (let passe = 0; passe < 4 && gestes[0][1](); passe++);
  return meilleur;
}
/* Un bloc change de colonne : l'état se rebâtit sur les nouvelles colonnes
   (flancs, piles), se remet en ordre, et se juge. */
function changementsDeColonne(M, etatDe, meilleurDe, essayer, temps) {
  let any = false;
  // seuls les blocs qui ont un fil plié peuvent y gagner
  const plies = new Set(); meilleurDe().R.fils.forEach(w => { if (!w.shunt && w.pts.length > 2) { plies.add(M.liens[w.i].a.id); plies.add(M.liens[w.i].b.id); } });
  M.ids.forEach(id => { if (M.estTag(id) || !plies.has(id) || !temps()) return;
    for (const d of [-1, 1]) { if (!temps()) return; const E = etatDe(); const c0 = E.col.get(id), c1 = c0 + d;
      const col = new Map(E.col); col.set(id, c1);
      if (![...col.values()].includes(c0)) { if (c1 < c0) col.forEach((c, k) => { if (c > c0) col.set(k, c - 1); }); }
      const mn = Math.min(...col.values()); if (mn < 0) col.forEach((c, k) => col.set(k, c - mn));
      const E2 = etatDepuisColonnes(M, col, E.options); E2.sorties = new Map(E.sorties);
      if (essayer(E2)) { any = true; break; } } });
  return any;
}
const permutations = a => a.length <= 1 ? [a] : a.flatMap((x, i) => permutations([...a.slice(0, i), ...a.slice(i + 1)]).map(q => [x, ...q]));
/* Les bornes d'un connecteur échangent leurs ordonnées ; les bornes libres
   d'un flanc aussi, entre elles. */
function permutationsDeBornes(M, E, posDe, copie, essayer, temps) {
  let any = false;
  const voisinesOK = (id, ordre) => (M.pontes.get(id) || []).every(([a, b]) => { const i = ordre.indexOf(a), j = ordre.indexOf(b); return i < 0 || j < 0 || Math.abs(i - j) === 1; });
  const groupes = [];
  M.ids.forEach(id => { const b = M.blocs.get(id); if (b.genre !== 'equip') return;
    ['L', 'R'].forEach(lid => { const L = E.listes.get(id)[lid], vus = new Set(), libres = [];
      L.forEach(p => { if (flancDe1(E, id, p.cle) === 'LR') return; const r = runDe(E, id, lid, p.cle);
        if (r) { if (!vus.has(r)) { vus.add(r); groupes.push({ id, cles: r.cles }); } } else libres.push(p.cle); });
      if (libres.length >= 2) groupes.push({ id, cles: libres }); }); });
  groupes.forEach(g => { if (!temps()) return;
    const essai = ordre => { const pos = posDe(); const cles = g.cles.slice().sort((a, b) => pos.y.get(K(g.id, a)) - pos.y.get(K(g.id, b)));
      if (ordre.every((c, j) => c === cles[j]) || !voisinesOK(g.id, ordre)) return false;
      const ys = cles.map(c => pos.y.get(K(g.id, c))); const p2 = copie(pos); ordre.forEach((c, j) => p2.y.set(K(g.id, c), ys[j]));
      return essayer(p2); };
    const cles = () => g.cles.slice().sort((a, b) => posDe().y.get(K(g.id, a)) - posDe().y.get(K(g.id, b)));
    if (g.cles.length <= 5) permutations(cles()).forEach(o => { if (temps() && essai(o)) any = true; });
    else for (let i = 0; i < g.cles.length; i++) for (let j = i + 1; j < g.cles.length; j++) { if (!temps()) return; const o = cles(); const t = o[i]; o[i] = o[j]; o[j] = t; if (essai(o)) any = true; } });
  return any;
}
/* Un bloc glisse en face d'un partenaire, du plus court glissement au plus
   long ; ses feuilles (les blocs qui ne parlent qu'à lui) glissent avec lui
   quand la place le permet. */
function glissements(M, E, meilleurDe, copie, essayer, temps) {
  let any = false;
  const heurte = (pos, id, t, b, exclus) => (E.piles.get(E.pileDe(id)) || []).some(o => o !== id && !exclus.has(o) && t < pos.bas.get(o) + 10 && pos.haut.get(o) < b + 10);
  const glisser = (pos, id, dy) => { M.blocs.get(id).bornes.forEach(p => { const k = K(id, p.cle); if (pos.y.has(k)) pos.y.set(k, pos.y.get(k) + dy); }); pos.haut.set(id, pos.haut.get(id) + dy); pos.bas.set(id, pos.bas.get(id) + dy); };
  const feuilleDe = (f, b) => M.blocs.get(f).genre === 'equip' && [...M.voisins.get(f)].every(v => v === b);
  M.ids.forEach(id => { if (M.estTag(id) || !temps()) return; const m = meilleurDe(), pos = m.pos; const rs = new Set();
    M.blocs.get(id).bornes.forEach(p => M.partenairesBlocs(K(id, p.cle)).forEach(q => { if (E.place.get(q.id).c === E.place.get(id).c) return;
      const r = Math.round((pos.y.get(K(q.id, q.cle)) - pos.y.get(K(id, p.cle))) * 2) / 2; if (Math.abs(r) > 0.6 && Math.abs(r) <= 400) rs.add(r); }));
    for (const dy of [...rs].sort((a, b) => Math.abs(a) - Math.abs(b))) { if (!temps()) return;
      const p2 = copie(pos), feuilles = [...M.voisins.get(id)].filter(f => feuilleDe(f, id) && E.place.get(f).c !== E.place.get(id).c);
      const exclus = new Set([id, ...feuilles]);
      if (heurte(p2, id, p2.haut.get(id) + dy, p2.bas.get(id) + dy, exclus)) continue;
      glisser(p2, id, dy); feuilles.forEach(f => { if (!heurte(p2, f, p2.haut.get(f) + dy, p2.bas.get(f) + dy, exclus)) glisser(p2, f, dy); });
      if (essayer(p2)) { any = true; break; } } });
  return any;
}
/* Deux blocs d'une colonne échangent leurs places, et le solveur rejoue. */
function echangesDeBlocs(M, E, essayer, temps) {
  let any = false;
  E.piles.forEach(pile => { const n = pile.length; if (n < 2) return;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < (n <= 8 ? n : Math.min(n, i + 2)); j++) { if (!temps()) return;
      const t = pile[i]; pile[i] = pile[j]; pile[j] = t;
      if (essayer()) any = true; else { pile[j] = pile[i]; pile[i] = t; } } });
  return any;
}
/* Un fil plié passe en tête des candidats du solveur. */
function promotions(M, E, meilleurDe, essayer, temps) {
  let any = false;
  const alignable = li => { const w = M.liens[li]; if (M.estTag(w.a.id) || M.estTag(w.b.id)) return false;
    const pa = E.place.get(w.a.id), pb = E.place.get(w.b.id); return pa.r === pb.r && pa.c !== pb.c; };
  const plies = meilleurDe().R.fils.filter(w => !w.shunt && w.pts.length > 2 && alignable(w.i)).map(w => w.i);
  plies.forEach(li => { if (!temps() || E.prioritaires.has(li)) return; E.prioritaires.add(li);
    if (essayer()) any = true; else E.prioritaires.delete(li); });
  return any;
}
/* Un connecteur entier change de flanc. */
function flancsDeConnecteurs(M, E, essayer, temps) {
  let any = false;
  M.ids.forEach(id => { const b = M.blocs.get(id); if (b.genre !== 'equip' || !temps()) return;
    const groupes = new Map(); b.bornes.forEach(p => { const g = b.connecteur.get(p.cle) ?? ('~' + p.cle); (groupes.get(g) || groupes.set(g, []).get(g)).push(p.cle); });
    groupes.forEach(cles => { if (!temps()) return; const f0 = E.flancDe.get(K(id, cles[0])); if (f0 !== 'L' && f0 !== 'R') return;
      const f1 = f0 === 'L' ? 'R' : 'L', avant = photoOrdres(E), flancsAvant = cles.map(c => E.flancDe.get(K(id, c)));
      cles.forEach(c => E.flancDe.set(K(id, c), f1));
      const ls = E.listes.get(id); const bornes = ls[f0].filter(p => cles.includes(p.cle)); ls[f0] = ls[f0].filter(p => !cles.includes(p.cle)); ls[f1] = ls[f1].concat(bornes);
      construireRuns(M, E);
      if (essayer()) any = true; else { cles.forEach((c, i) => E.flancDe.set(K(id, c), flancsAvant[i])); revenirOrdres(E, avant); construireRuns(M, E); } }); });
  return any;
}
/* Le côté de sortie d'une borne de bornier dont rien n'impose le côté (une
   pastille seule, un partenaire de même colonne) : l'autre goulotte. */
function sortiesDeBornier(M, E, essayer, temps) {
  let any = false;
  M.ids.forEach(id => { const b = M.blocs.get(id); if (b.genre !== 'barrette') return;
    b.bornes.forEach(p => { if (!temps()) return; const k = K(id, p.cle); if (!M.partenairesDe(k).length) return;
      if (M.partenairesBlocs(k).some(q => coteDe(E.place, id, q) !== 0)) return;
      const avant = E.sorties.get(k); const d0 = dirs1(E, id, p.cle); E.sorties.set(k, d0 < 0 ? 'R' : 'L');
      if (essayer()) any = true; else if (avant == null) E.sorties.delete(k); else E.sorties.set(k, avant); }); });
  return any;
}

/* ===== 11. LE CONCOURS ==================================================== */
/* Largeur réellement occupée par les pistes de chaque goulotte : les fils
   droits n'en prennent pas, les colonnes se resserrent d'autant. */
function goulottesOccupees(L, R) {
  const g = L.geom; if (!g.colX.length) return null;
  const gx = i => i === 0 ? (g.colX[0] - g.chW[0]) : g.colX[i - 1] + g.colW[i - 1];
  const maxOff = new Array(g.nCols + 1).fill(0);
  const noter = x => { for (let ch = 0; ch <= g.nCols; ch++) { const x0 = gx(ch); if (x >= x0 - 2 && x <= x0 + g.chW[ch] + 2) { maxOff[ch] = Math.max(maxOff[ch], x - x0); break; } } };
  R.fils.forEach(w => { for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1]; if (Math.abs(a.x - b.x) > 0.5) continue; noter(a.x); } });
  R.barrettes.forEach(b => noter(b.x));
  return maxOff.map((o, i) => Math.max(GOULOTTE_MIN, Math.min(g.chW[i], o + 26)));
}
/* Une mise en page pour des options données (graine, equilibrer, profondeur,
   serpentin, affiner, budget) : le contrat du routeur et du dessin, routé. */
function placer(G, opt) {
  const M = modele(G); opt = opt || {};
  const E = etatInitial(M, opt); let m = evaluer(M, E, ordonner(M, E));
  if (opt.affiner) m = rechercheLocale(M, m, opt.budget || 1000);
  m = resserrer(M, m);
  return { ...m.L, routage: m.R, jugement: m.j };
}
/* Le CONCOURS : les meilleures mises en niveaux, chacune ordonnée et routée
   pour de vrai ; les trois premières au juge (tolérant sur le format : la
   recherche locale rend souvent un dessin plus haut) passent la recherche
   locale, et la meilleure au juge strict gagne ; le serpentin en secours si
   elle ne tient pas sur la feuille ; le resserrage des goulottes. Le budget
   se compte en évaluations : le même contrat donne le même dessin partout —
   un contrat de vingt blocs en moins de deux secondes, un folio de trente en
   moins de cinq. */
function meilleurPlacement(liaisons) {
  const G = construireGraphe(liaisons); if (!G.ids.length) return null;
  const M = modele(G); const nB = M.ids.length;
  const budget = nB <= 20 ? 1500 : nB <= 40 ? 1600 : nB <= 80 ? 1600 : 500;
  const combien = nB <= 40 ? 8 : nB <= 120 ? 4 : 2, finalistes = nB <= 20 ? 3 : nB <= 80 ? 2 : 1;
  const vues = new Set(), candidats = [];
  const essayer = (col, o) => { const E = etatDepuisColonnes(M, col, o);
    const signature = [...E.place].map(([id, p]) => id + ':' + p.r + ',' + p.c).sort().join(';');
    if (vues.has(signature)) return null; vues.add(signature);
    const r = evaluer(M, E, ordonner(M, E)); candidats.push(r); return r; };
  candidatsDeNiveaux(M, combien).forEach(col => essayer(col, {}));
  const classer = tolerant => candidats.sort((a, b) => bat(a.j, b.j, tolerant) ? -1 : (bat(b.j, a.j, tolerant) ? 1 : 0));
  const finir = c => etirerAuFormat(M, resserrer(M, rechercheLocale(M, c, Math.floor(budget / finalistes))));
  let meilleur = null;
  classer(true).slice(0, finalistes).forEach(c => { const r = finir(c); if (!meilleur || bat(r.j, meilleur.j)) meilleur = r; });
  /* secours : le serpentin. Un dessin trop large pour la feuille se replie
     en rangées : on essaie les largeurs de rangée, le juge tranche. */
  const nc = meilleur.L.geom.nCols;
  if (!meilleur.j.tient && nc >= 4) { const col = meilleur.E.col, avant = candidats.length;
    const Ws = nc <= 8 ? Array.from({ length: nc - 2 }, (_, i) => i + 2) : [...new Set([2, 3, 4, 5].map(k => Math.ceil(nc / k)))].filter(W => W >= 2);
    Ws.forEach(W => essayer(col, { serpentin: W }));
    const replies = candidats.slice(avant).sort((a, b) => bat(a.j, b.j) ? -1 : 1).slice(0, 1);
    replies.forEach(c => { const r = finir(c); if (bat(r.j, meilleur.j)) meilleur = r; }); }
  return { ...meilleur.L, routage: meilleur.R, jugement: meilleur.j };
}
