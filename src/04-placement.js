/* ===========================================================================
   04 — LE PLACEMENT
   Le cœur de l'outil. Un moteur en étapes nommées, un seul juge :

     modele        ce que le placement sait des blocs et des fils
     niveaux       chaque bloc reçoit sa colonne (le flux amont → aval ; ou,
                   autour d'un gros équipement, le hub au centre et ses
                   partenaires étagés des deux côtés)
     rangees       composantes, serpentin : chaque bloc reçoit sa rangée
     flancs        un connecteur va sur le flanc de ses partenaires, se coupe
                   s'il sert les deux côtés ; les listes de bornes
     resoudre      les ORDONNÉES : union des nets + plus long chemin — un
                   maximum de fils dont les deux bornes sont à la même hauteur
     barycentre    l'ordre des blocs d'une colonne et des bornes d'un
                   connecteur, itéré avec le solveur
     assembler     la géométrie : colonnes, goulottes, pastilles, le contrat
                   que lisent le routeur et le dessin
     juger / bat   sain, tient sur la feuille, lisibilité (fils droits moins
                   croisements), numéros muets, encombrement, surface, longueur
     estimer       ce que le juge dira, sans router : le tamis des gestes
     rechercheLocale  des gestes tamisés à l'estimation, triés au routage
                   rapide, confirmés au routage complet ; gardés s'ils gagnent
     concours / meilleurPlacement  plusieurs graines de niveaux, les meilleures
                   en recherche locale, le serpentin en secours

   L'ÉTAT d'un placement (E) : place (rangée, colonne), piles (l'ordre des
   blocs d'une colonne), listes (l'ordre des bornes d'un flanc), flancDe,
   dirs (côté des fils d'une borne de bornier), runs (les connecteurs),
   prioritaires (les fils alignés en premier). Une POSITION (pos) : l'ordonnée
   de chaque borne, le haut et le bas de chaque bloc.
   =========================================================================== */
'use strict';

const PRH = 14, STRIPW = 20, BODYW = 104, BORNW = 24, VGAP = 22;
const MARGE = 70, HAUT_PAGE = MARGE + 120, RANGEE_GAP = 130;
/* Une pastille (masse, rail) se colle au flanc de la borne qu'elle sert : un
   fil de 30, où le numéro de fil s'écrit, puis la pastille de 40. La colonne
   réserve cette place (ZONE) sur le flanc concerné, hors des goulottes. */
const FIL_PASTILLE = 22, HAUT_PASTILLE = 14, ZONE_PASTILLE = FIL_PASTILLE + BORNW;   // un fil de masse est court : le symbole est contre l'équipement
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
  // un shunt : deux bornes pontées d'un même bloc — pas un fil, un pont dessiné ; les bornes pontées ensemble font un PAQUET
  const pontes = new Map();
  liens.forEach(w => { if (w.shunt) (pontes.get(w.a.id) || pontes.set(w.a.id, []).get(w.a.id)).push([w.a.cle, w.b.cle]); });
  const paquetDe = new Map();
  blocs.forEach(b => { const chef = new Map(b.bornes.map(p => [p.cle, p.cle])); const trouver = c => { while (chef.get(c) !== c) c = chef.get(c); return c; };
    (pontes.get(b.id) || []).forEach(([u, v]) => { const ru = trouver(u), rv = trouver(v); if (ru !== rv) chef.set(rv, ru); });
    b.bornes.forEach(p => paquetDe.set(K(b.id, p.cle), K(b.id, trouver(p.cle)))); });
  // une pastille se colle à UNE borne d'un bloc ; sinon c'est un bloc comme un autre
  blocs.forEach(b => { if (b.genre !== 'tag') return; const ps = parts.get(K(b.id, b.bornes[0].cle)) || [];
    if (ps.length !== 1 || blocs.get(ps[0].id).genre === 'tag') b.genre = 'equip'; });
  const estTag = id => blocs.get(id).genre === 'tag';
  const partenairesDe = k => parts.get(k) || [];
  const partenairesBlocs = k => partenairesDe(k).filter(q => !estTag(q.id));
  const voisins = new Map(ids.map(id => [id, new Set()]));
  liens.forEach(w => { if (w.boucle || w.shunt || estTag(w.a.id) || estTag(w.b.id)) return; voisins.get(w.a.id).add(w.b.id); voisins.get(w.b.id).add(w.a.id); });
  const hauteurEstimee = id => blocs.get(id).bornes.length * PRH + 46;
  return { lk, ids, blocs, liens, pontes, paquetDe, estTag, partenairesDe, partenairesBlocs, voisins, hauteurEstimee };
}

/* ===== 2. LES NIVEAUX : chaque bloc reçoit sa colonne =================== */
/* Le graphe des niveaux : l'adjacence pondérée et orientée entre blocs (les
   pastilles suivent leur borne, elles n'y sont pas). Le HUB : un gros
   équipement (huit bornes, six voisins) autour duquel le dessin s'organise
   — quand il y en a un, le flux rayonne depuis lui plutôt que de gauche à
   droite. */
function grapheDesNiveaux(M) {
  const noeuds = M.ids.filter(id => !M.estTag(id));
  const adj = new Map(noeuds.map(n => [n, new Map()]));
  M.liens.forEach(w => { if (w.shunt || w.boucle) return; const a = w.a.id, b = w.b.id; if (!adj.has(a) || !adj.has(b)) return;
    const ea = adj.get(a).get(b) || adj.get(a).set(b, { w: 0, aval: 0 }).get(b); ea.w++; ea.aval++;        // a → b : b est en aval de a
    const eb = adj.get(b).get(a) || adj.get(b).set(a, { w: 0, aval: 0 }).get(a); eb.w++; });
  const degre = new Map(noeuds.map(n => { let s = 0; adj.get(n).forEach(e => s += e.w); return [n, s]; }));
  const parDegre = noeuds.slice().sort((a, b) => degre.get(b) - degre.get(a));
  const hub = parDegre.find(id => M.blocs.get(id).genre === 'equip' && M.blocs.get(id).bornes.length >= 8 && adj.get(id).size >= 6) || null;
  return { noeuds, adj, parDegre, hub };
}
/* Ce qu'un fil coûte selon la portée entre ses colonnes : gratuit vers une
   colonne voisine (il peut être droit), plié à coup sûr et une piste de
   goulotte dans la même colonne (3), sa portée quand il enjambe. Un fil
   d'aval qui repart à contresens coûte SENS : le flux se lit de gauche à
   droite, les sources à gauche — ou, autour d'un hub, du hub vers le bord. */
const coutDePortee = d => (d === 0 ? 4 : d === 1 ? 0 : d);
const SENS = 1;
/* Un fil de a (colonne ca) vers b (colonne cb) va-t-il à contresens ? */
function contresens(N, col, ca, cb) {
  if (N.hub == null) return cb < ca;
  const ch = col.get(N.hub); return Math.abs(cb - ch) < Math.abs(ca - ch);
}
/* Un fil qui enjambe une colonne passe par un couloir entre ses blocs : une
   colonne d'équipements en offre peu, une colonne de fragments de barrette
   beaucoup. Chaque équipement enjambé coûte TRAVERSEE, un bornier le quart. */
const TRAVERSEE = 0.3, TOUR_NIVEAU = 6;
const obstruction = (M, id) => M.blocs.get(id).genre === 'equip' ? 1 : 0.25;
/* Le coût d'un bloc à une colonne : ses fils, un peu plus pour un fil d'aval
   à contresens, ce que ses fils enjambent et ce qui l'enjambe, puis les
   flancs du bloc et de ses voisins, puis le format (F : le compte des
   colonnes, tenu à jour). */
function coutNiveau(M, N, col, F, n, c) {
  let s = 0; const c0 = col.get(n); col.set(n, c); if (c !== c0) F.bouger(n, c0, c);
  for (const [k, e] of N.adj.get(n)) { const ck = col.get(k), d = Math.abs(c - ck);
    s += e.w * coutDePortee(d); if (d) s += SENS * (contresens(N, col, c, ck) ? e.aval : 0) + SENS * (contresens(N, col, ck, c) ? e.w - e.aval : 0);
    if (d >= 2) for (let x = Math.min(c, ck) + 1; x < Math.max(c, ck); x++) s += TRAVERSEE * e.w * F.obstruction(x); }
  s += TRAVERSEE * F.enjambe(c) * obstruction(M, n);
  const format = F.format(); if (c !== c0) F.bouger(n, c, c0); col.set(n, c0);
  const colDe = id => (id === n ? c : col.get(id));
  M.voisins.get(n).forEach(k => s += coutDesFlancs(M, colDe, k)); s += coutDesFlancs(M, colDe, n);
  return s + 6 * Math.max(0, format - FORMAT_VISE);
}
/* Le coût de toute une mise en niveaux, pour classer les candidats. */
function coutTotal(M, N, col) {
  let s = 0; const colDe = id => col.get(id), F = compteDesColonnes(M, N, col);
  N.noeuds.forEach(n => { for (const [k, e] of N.adj.get(n)) { if (k < n) continue; const cn = col.get(n), ck = col.get(k), d = Math.abs(cn - ck);
    s += e.w * coutDePortee(d); if (d) s += SENS * (contresens(N, col, cn, ck) ? e.aval : 0) + SENS * (contresens(N, col, ck, cn) ? N.adj.get(k).get(n).aval : 0);
    if (d >= 2) for (let x = Math.min(cn, ck) + 1; x < Math.max(cn, ck); x++) s += TRAVERSEE * e.w * F.obstruction(x); }
    s += coutDesFlancs(M, colDe, n); });
  return s + 6 * Math.max(0, F.format() - FORMAT_VISE);
}
/* Le compte des colonnes, tenu à jour bloc par bloc : la hauteur de chaque
   colonne et ses équipements, ce que chaque colonne OBSTRUE (ses
   équipements, ses borniers au quart) et combien de fils l'ENJAMBENT ; le
   FORMAT qu'auraient les colonnes (la largeur des colonnes et de leurs
   goulottes sur la hauteur de la plus haute). */
function compteDesColonnes(M, N, col) {
  const h = new Map(), large = new Map(), obs = new Map(), enj = new Map(); let tags = 0;
  const ajouter = (m, c, v) => m.set(c, (m.get(c) || 0) + v);
  col.forEach((c, id) => { ajouter(h, c, M.hauteurEstimee(id) + VGAP); if (M.blocs.get(id).genre === 'equip') ajouter(large, c, 1); ajouter(obs, c, obstruction(M, id)); });
  M.ids.forEach(id => { if (M.estTag(id)) tags++; });
  const enjamber = (ca, cb, w) => { for (let x = Math.min(ca, cb) + 1; x < Math.max(ca, cb); x++) ajouter(enj, x, w); };
  N.noeuds.forEach(n => { for (const [k, e] of N.adj.get(n)) if (k > n) enjamber(col.get(n), col.get(k), e.w); });
  const F = {
    format() { let W = GOULOTTE_MIN + tags * ZONE_PASTILLE / 2, H = 0;
      h.forEach((hh, c) => { if (hh <= 0.01) return; W += (large.get(c) ? LARGEUR.equip : LARGEUR.coupure) + GOULOTTE_MIN; H = Math.max(H, hh); });
      return W / Math.max(60, H); },
    obstruction: c => obs.get(c) || 0, enjambe: c => enj.get(c) || 0,
    bouger(n, c0, c1) { const hn = M.hauteurEstimee(n) + VGAP, eq = M.blocs.get(n).genre === 'equip' ? 1 : 0, o = obstruction(M, n);
      ajouter(h, c0, -hn); ajouter(h, c1, hn); if (eq) { ajouter(large, c0, -1); ajouter(large, c1, 1); } ajouter(obs, c0, -o); ajouter(obs, c1, o);
      for (const [k, e] of N.adj.get(n)) { const ck = col.get(k); enjamber(c0, ck, -e.w); enjamber(c1, ck, e.w); } } };
  return F;
}
/* Ce que les colonnes font aux flancs d'un bloc : un connecteur dont des
   bornes servent les deux côtés se coupe en deux pièces (1 : la coupure
   elle-même, chaque borne regarde alors son partenaire) ; une borne libre
   qui parle des deux côtés se dédouble (0,5) ; une borne qui sert deux
   blocs du même côté demande une barrette de piquage (1). */
function coutDesFlancs(M, colDe, id) {
  const b = M.blocs.get(id), cb = colDe(id); const votes = new Map(), paquets = new Map(); let s = 0;
  b.bornes.forEach(p => { const cotes = new Map(); const paquet = M.paquetDe.get(K(id, p.cle));
    M.partenairesBlocs(K(id, p.cle)).forEach(q => { const t = Math.sign(colDe(q.id) - cb); if (!t) return;
      (cotes.get(t) || cotes.set(t, new Set()).get(t)).add(q.id);
      if (b.genre !== 'equip') return;
      const g = b.connecteur.get(p.cle) ?? ('~' + p.cle); const v = votes.get(g) || votes.set(g, { g: 0, d: 0, libre: !b.connecteur.has(p.cle) }).get(g);
      if (t < 0) v.g++; else v.d++;
      // un paquet de bornes pontées sort d'un seul flanc (le pont ne se dessine pas entre deux flancs) : il vote d'un bloc
      if (b.connecteur.has(p.cle)) { const pq = paquets.get(paquet) || paquets.set(paquet, { g: 0, d: 0 }).get(paquet); if (t < 0) pq.g++; else pq.d++; } });
    cotes.forEach(set => { if (set.size >= 2) s += 1; }); });
  // un paquet (une borne seule en est un) qui sert les deux côtés : un de ses fils fait le tour, quoi qu'on fasse — plus cher
  // ici qu'au juge, pour que la mise en niveaux préfère un fil qui enjambe une colonne à un fil qui fait le tour de son bloc
  paquets.forEach(pq => { if (pq.g && pq.d) s += TOUR_NIVEAU * Math.min(pq.g, pq.d); });
  votes.forEach(v => { if (v.g && v.d) s += v.libre ? 0.5 * Math.min(v.g, v.d) : 1; });
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
/* Le HUB À DROITE : le flux, mais le bloc de plus fort degré passe à droite
   de tous ses voisins — un calculateur qui lit ses capteurs se dessine aussi
   bien après eux qu'avant, et ses fils y font des faisceaux au lieu de
   traverser. */
function couchesHubADroite(N) {
  const col = couchesParFlux(N); const H = N.parDegre[0]; if (!H) return col;
  const voisins = [...N.adj.get(H).keys()]; if (!voisins.length) return col;   // un bloc sans voisin (ses partenaires sont des pastilles) n'a pas de droite
  col.set(H, 1 + Math.max(...voisins.map(k => col.get(k))));
  return col;
}
/* La DESCENTE : un bloc se rapproche de ses voisins tant que ça coûte
   moins — tous les blocs, ou seulement `sujets` (le voisinage d'un coup de
   pied) ; `garde(n, c)` dit les colonnes qu'un bloc n'a pas le droit de
   prendre (autour d'un hub : changer de côté, ou la colonne du hub). */
function descendre(M, N, col, F, sujets, garde) {
  const liste = sujets || N.parDegre;
  for (let passe = 0; passe < (sujets ? 3 : 8); passe++) { let bouge = false;
    for (const n of liste) { const c0 = col.get(n); let best = c0, bc = coutNiveau(M, N, col, F, n, c0);
      for (const c of [c0 - 1, c0 + 1, c0 - 2, c0 + 2]) { if (garde && !garde(n, c)) continue; const cc = coutNiveau(M, N, col, F, n, c); if (cc < bc - 0.01) { bc = cc; best = c; } }
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
function explorerNiveaux(M, N, col, vivier, pieds, garde) {
  let F = compteDesColonnes(M, N, col); descendre(M, N, col, F, null, garde); let cout = coutTotal(M, N, col);
  const noter = (c, k) => { const s = signatureDe(normaliser(new Map(c))); if (!vivier.has(s) || vivier.get(s).cout > k) vivier.set(s, { col: normaliser(new Map(c)), cout: k }); };
  noter(col, cout);
  for (let tour = 0; tour < 2 && pieds > 0; tour++) { let mieux = false;
    for (const n of N.parDegre) { if (pieds <= 0) break;
      const lo = Math.min(...col.values()) - 1, hi = Math.max(...col.values()) + 1;
      for (let c = lo; c <= hi; c++) { if (c === col.get(n) || (garde && !garde(n, c)) || pieds-- <= 0) continue;
        const essai = new Map(col), F2 = compteDesColonnes(M, N, essai); const ce = essai.get(n); essai.set(n, c); F2.bouger(n, ce, c);
        descendre(M, N, essai, F2, [n, ...M.voisins.get(n)], garde);
        let k = coutTotal(M, N, essai);
        if (k < cout - 0.01) { descendre(M, N, essai, F2, null, garde); k = coutTotal(M, N, essai); col = essai; F = F2; cout = k; mieux = true; }
        noter(essai, k); } }
    if (!mieux) break; }
  return col;
}
/* Une feuille (tous ses voisins dans une même colonne) coûte autant des deux
   côtés : sur demande, elle va du côté le moins chargé. */
function equilibrerFeuilles(M, N, col) {
  const { adj, parDegre } = N; const F = compteDesColonnes(M, N, col);
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
/* Le HUB AU CENTRE : un gros équipement se dessine au milieu de la feuille,
   ses partenaires empilés de part et d'autre — c'est ce qu'un câbleur fait
   à la main, et c'est ce qui tient en paysage. Sans le hub, le graphe se
   défait en SOUS-ENSEMBLES (une pompe et sa barrette, un relais, sa lampe
   et son interrupteur) ; chacun va d'un côté et s'y étage par le flux
   depuis le hub : ce que le hub alimente à une colonne, ce que cela sert
   à la suivante… ; ce qui n'en descend pas (une barrette qui alimente le
   hub) se pose juste avant ce qu'il sert. Un connecteur dont les bornes
   servent les deux côtés se coupe : chaque borne regarde son partenaire.
   Deux répartitions : par la HAUTEUR (chaque sous-ensemble du côté le
   moins haut, le plus haut d'abord), ou par CONNECTEUR (les sous-ensembles
   accrochés au même connecteur ensemble, les connecteurs équilibrés). */
function couchesAutourDuHub(M, N) {
  const H = N.hub; if (!H) return [];
  const compDe = new Map(), comps = [];
  N.noeuds.forEach(s => { if (s === H || compDe.has(s)) return; const c = { ids: [], h: 0, bornes: new Map(), prof: null }; comps.push(c); const q = [s]; compDe.set(s, c);
    while (q.length) { const u = q.pop(); c.ids.push(u); c.h += M.hauteurEstimee(u) + VGAP;
      for (const k of N.adj.get(u).keys()) { if (k === H || compDe.has(k)) continue; compDe.set(k, c); q.push(k); } } });
  if (comps.length < 2) return [];
  // par quelles bornes du hub, et par quel connecteur, chaque sous-ensemble s'y accroche
  const bH = M.blocs.get(H);
  bH.bornes.forEach(p => M.partenairesBlocs(K(H, p.cle)).forEach(q => { const c = compDe.get(q.id); if (!c) return;
    const g = bH.connecteur.get(p.cle) ?? ('~' + p.cle); c.bornes.set(g, (c.bornes.get(g) || 0) + 1); }));
  // les profondeurs, à trois colonnes au plus : au-delà, le fil de retour au hub traverse trop de monde
  comps.forEach(c => { c.prof = profondeursDepuis(N, H, new Set(c.ids)); c.prof.forEach((d, id) => c.prof.set(id, Math.min(3, d))); });
  const hauteurDe = id => M.hauteurEstimee(id) + VGAP;
  // la hauteur d'un côté : sa colonne la plus haute
  const poser = (cote) => { const col = new Map([[H, 0]]); comps.forEach(c => c.prof.forEach((d, id) => col.set(id, cote.get(c) * d))); return col; };
  const hauteurs = cs => { const h = new Map(); cs.forEach(c => c.prof.forEach((d, id) => h.set(d, (h.get(d) || 0) + hauteurDe(id)))); return Math.max(0, ...h.values()); };
  // 1. par la hauteur : le plus haut d'abord, chacun du côté qui reste le moins haut
  const parHauteur = (() => { const cote = new Map(), cotes = { '-1': [], '1': [] };
    comps.slice().sort((a, b) => b.h - a.h).forEach(c => { const s = hauteurs([...cotes[1], c]) <= hauteurs([...cotes[-1], c]) ? 1 : -1; cote.set(c, s); cotes[s].push(c); });
    return poser(cote); })();
  // 2. dans l'ordre des bornes du hub (A1, A2… B1…), coupé en deux parts contiguës aussi hautes que possible l'une que l'autre
  const rang = new Map(bH.bornes.slice().sort((u, v) => ordreNaturel(u.etiq, v.etiq)).map((p, i) => [p.cle, i]));
  const premiere = c => { let m = Infinity; bH.bornes.forEach(p => { if (M.partenairesBlocs(K(H, p.cle)).some(q => compDe.get(q.id) === c)) m = Math.min(m, rang.get(p.cle)); }); return m; };
  const contigus = comps.slice().sort((a, b) => premiere(a) - premiere(b));
  let meilleure = null;
  for (let k = 1; k < contigus.length; k++) { const h = Math.max(hauteurs(contigus.slice(0, k)), hauteurs(contigus.slice(k))); if (!meilleure || h < meilleure.h) meilleure = { k, h }; }
  const parBornes = poser(new Map(contigus.map((c, i) => [c, i < meilleure.k ? -1 : 1])));
  return [parHauteur, parBornes];
}
/* Autour d'un hub, un bloc garde son côté et n'entre pas dans la colonne du
   hub : c'est la structure qu'on a voulue, la descente n'y règle que la
   profondeur. */
function gardeDuHub(N, col) { const H = N.hub, cH = col.get(H);
  return (n, c) => n !== H && c !== cH && Math.sign(c - cH) === Math.sign(col.get(n) - cH); }
/* Les profondeurs d'un sous-ensemble depuis le hub : le plus long chemin du
   flux, sans les arcs qui reviennent au hub (les cycles se coupent aux arcs
   de retour d'un parcours) ; un bloc que le flux n'atteint pas se pose
   juste avant ce qu'il sert, ou à un pas du hub. */
function profondeursDepuis(N, H, ids) {
  const sortants = a => [...N.adj.get(a)].filter(([b, e]) => b !== H && (ids.has(b) || b === H) && (e.aval * 2 > e.w || (e.aval * 2 === e.w && a < b))).map(([b]) => b);
  const etat = new Map(), arcs = new Map([...ids, H].map(n => [n, []])), ordre = [];
  const dfs = a => { etat.set(a, 1); sortants(a).forEach(b => { if (etat.get(b) === 1) return; arcs.get(a).push(b); if (!etat.has(b)) dfs(b); }); etat.set(a, 2); ordre.push(a); };
  dfs(H); ids.forEach(n => { if (!etat.has(n)) dfs(n); });
  const prof = new Map([[H, 0]]);
  for (let i = ordre.length - 1; i >= 0; i--) { const a = ordre[i]; if (!prof.has(a)) continue; arcs.get(a).forEach(b => prof.set(b, Math.max(prof.get(b) || 0, prof.get(a) + 1))); }
  // ce que le flux n'atteint pas : juste avant ce qu'il sert (au moins à un pas du hub) — l'aval d'abord
  for (let i = 0; i < ordre.length; i++) { const a = ordre[i]; if (prof.has(a)) continue;
    const servis = arcs.get(a).filter(b => prof.has(b)).map(b => prof.get(b)); prof.set(a, Math.max(1, servis.length ? Math.min(...servis) - 1 : 1)); }
  ids.forEach(n => { if (!prof.has(n)) prof.set(n, 1); }); prof.delete(H);
  return prof;
}
/* Les mises en niveaux candidates, de la moins chère à la plus chère : les
   graines (le flux, les parcours depuis les plus gros blocs et depuis le plus
   loin, le hub au centre), chacune explorée ; puis, sur les meilleures, les
   feuilles équilibrées et les feuilles d'un hub sur deux colonnes. Le juge,
   au routage réel, tranchera entre les premières ; les mises en niveaux
   autour du hub y vont d'office (elles commencent mal ordonnées). */
function candidatsDeNiveaux(M, combien) {
  const N = grapheDesNiveaux(M); const vivier = new Map();
  if (!N.noeuds.length) return [{ col: new Map(), centre: false }];
  const nB = N.noeuds.length, graines = nB > 200 ? ['flux', 0] : ['flux', 'hub', 0, 'loin', 1, 2];
  const pieds = nB > 200 ? 0 : nB > 60 ? 30 : 40;
  const depart = g => g === 'flux' ? couchesParFlux(N) : g === 'hub' ? couchesHubADroite(N) : couchesParParcours(N, g);
  graines.forEach(g => explorerNiveaux(M, N, depart(g), vivier, pieds));
  const centres = couchesAutourDuHub(M, N).flatMap(c => { const v = explorerNiveaux(M, N, c, vivier, pieds, gardeDuHub(N, c));
    // les feuilles nombreuses d'un côté se rangent sur deux colonnes : la colonne fait moitié moins haut
    const p = new Map(v); approfondir(M, N, p, 8); const s = signatureDe(normaliser(new Map(p)));
    if (!vivier.has(s)) vivier.set(s, { col: normaliser(new Map(p)), cout: coutTotal(M, N, p) + 0.005 });
    return [vivier.get(signatureDe(normaliser(new Map(v)))), vivier.get(s)]; }).filter((v, i, a) => v && a.indexOf(v) === i);
  const tri = () => [...vivier.values()].sort((a, b) => a.cout - b.cout);
  const noter = c => { normaliser(c); const s = signatureDe(c); if (!vivier.has(s)) vivier.set(s, { col: c, cout: coutTotal(M, N, c) + 0.005 }); return vivier.get(s); };
  tri().slice(0, combien).forEach(v => {
    const e = new Map(v.col); equilibrerFeuilles(M, N, e); noter(e);
    if (N.hub) { const p = new Map(v.col); approfondir(M, N, p, 8); noter(p); } });
  const choisis = diversifier(tri(), combien, Math.max(2, Math.floor(nB / 4)));
  centres.forEach(c => { if (c && !choisis.includes(c)) choisis.push(c); });
  return choisis.map(v => ({ col: v.col, centre: centres.includes(v) }));
}
/* Le choix dans le vivier : la moitié au coût, l'autre moitié parmi les mises
   en niveaux qui diffèrent nettement (au moins `ecart` blocs d'une autre
   colonne) de toutes celles déjà prises — le coût est une estimation, le juge
   au routage réel doit voir des structures différentes. */
function diversifier(tries, combien, ecart) {
  const pris = tries.slice(0, Math.ceil(combien / 2));
  const distance = (a, b) => { let d = 0; a.forEach((c, id) => { if (b.get(id) !== c) d++; }); return d; };
  for (const v of tries) { if (pris.length >= combien) break; if (pris.includes(v)) continue;
    if (pris.every(p => distance(p.col, v.col) >= ecart)) pris.push(v); }
  for (const v of tries) { if (pris.length >= combien) break; if (!pris.includes(v)) pris.push(v); }
  return pris;
}

/* ===== 3. LES RANGÉES : composantes côte à côte, serpentin ============== */
/* Chaque composante part de la colonne 0 et occupe ses rangées : une seule,
   ou plusieurs en boustrophédon si elle est plus longue que la largeur de
   serpentin. Les petites composantes se rangent côte à côte sur une étagère.
   Rend place : id -> { r, c }. */
function rangees(M, col, serpentin) {
  const compDe = new Map(); const comps = [];
  for (const s of col.keys()) { if (compDe.has(s)) continue; const c = { ids: [], lo: Infinity, hi: -Infinity, h: 0, hm: 0 }; comps.push(c); const q = [s]; compDe.set(s, c);
    while (q.length) { const u = q.pop(); c.ids.push(u); c.lo = Math.min(c.lo, col.get(u)); c.hi = Math.max(c.hi, col.get(u)); c.h += M.hauteurEstimee(u); c.hm = Math.max(c.hm, M.hauteurEstimee(u));
      M.voisins.get(u).forEach(v => { if (!compDe.has(v)) { compDe.set(v, c); q.push(v); } }); } }
  comps.sort((a, b) => (b.ids.length - a.ids.length) || (b.h - a.h));
  const W = serpentin || Infinity, place = new Map(); let r0 = 0, etagere = null;
  if (!comps.length) return place;
  let largeurPrincipale = Math.max(4, Math.min(comps[0].hi - comps[0].lo + 1, W));
  /* beaucoup de petites composantes (vingt paires barrette–appareil, par exemple) : l'étagère prend la largeur qui
     rapproche le dessin du format visé, au lieu d'empiler dix rangées de deux */
  const petits = comps.filter((c, i) => i > 0 && c.hi - c.lo + 1 <= 3 && c.ids.length <= 4);
  if (petits.length >= 4) { const spanTot = petits.reduce((t, c) => t + (c.hi - c.lo + 1), 0), hRang = petits.reduce((t, c) => t + c.hm, 0) / petits.length + RANGEE_GAP / 2;
    let meilleure = largeurPrincipale, ecart = Infinity;
    for (let w = largeurPrincipale; w <= Math.min(16, W); w++) { const H = Math.ceil(spanTot / w) * hRang + comps[0].hm + RANGEE_GAP / 2, L = w * (LARGEUR.equip + GOULOTTE_MIN);
      const d = Math.abs(Math.log(L / H) - Math.log(FORMAT_VISE)); if (d < ecart - 1e-9) { ecart = d; meilleure = w; } }
    largeurPrincipale = meilleure; }
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
/* Un CONNECTEUR va sur le flanc de ses partenaires, ses bornes se suivent ;
   quand ses bornes servent les deux côtés, il se COUPE en deux pièces et
   chaque paquet de bornes (pontées ensemble) regarde ses partenaires — un
   fil ne fait jamais le tour de son bloc. Une borne sans connecteur choisit
   seule et se dédouble si elle parle des deux côtés. Un bornier garde ses
   bornes dans l'ordre naturel : chacune sort du côté de son partenaire, des
   deux côtés si elle en a des deux (une prise de coupure toujours). Deux
   blocs d'une MÊME colonne se parlent par la goulotte calme : celle où le
   moins de leurs fils passent, la même pour les deux bouts. */
function flancs(M, place) {
  const listes = new Map(), flancDe = new Map(), dirs = new Map(), scindes = [];
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
    // un connecteur qui parle des deux côtés se coupe : chaque borne sort du côté de ses partenaires
    const coupes = new Set(); votes.forEach((v, g) => { if (g[0] !== '~' && v.g && v.d) { coupes.add(g); scindes.push(b.nom + ' ' + g); } });
    // dans un connecteur coupé, un paquet ponté vote d'un bloc : un pont ne se dessine pas entre deux flancs
    const flancDuPaquet = new Map();
    coupes.forEach(g => paquetsDe(M, id, b.bornes.filter(p => groupe(p.cle) === g).map(p => p.cle)).forEach(cles => { let gg = 0, d = 0;
      cles.forEach(c => M.partenairesBlocs(K(id, c)).forEach(q => { const s = cote(id, q); if (s < 0) gg++; else if (s > 0) d++; }));
      const f = gg > d ? 'L' : d > gg ? 'R' : (gg ? 'R' : null); cles.forEach(c => flancDuPaquet.set(c, f)); }));
    b.bornes.forEach(p => { const v = votes.get(groupe(p.cle)), libre = !b.connecteur.has(p.cle);
      if (coupes.has(groupe(p.cle))) { flancDe.set(K(id, p.cle), flancDuPaquet.get(p.cle)); return; }
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
  return { listes, flancDe, dirs, scindes };
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
  const E = { col, place, ...flancs(M, place), sorties: new Map(), prioritaires: new Set(), refuses: new Set(), goulottes: null, options: opt };
  E.clesListes = id => E.listes.get(id).S ? ['S'] : ['L', 'R'];
  E.pileDe = id => { const p = place.get(id); return p.r + '|' + p.c; };
  E.piles = new Map();
  M.ids.forEach(id => { if (M.estTag(id)) return; const k = E.pileDe(id); (E.piles.get(k) || E.piles.set(k, []).get(k)).push(id); });
  construireRuns(M, E);
  return E;
}
const etatInitial = (M, opt) => etatDepuisColonnes(M, candidatsDeNiveaux(M, 1)[0].col, opt);
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
    // un pas entre deux bornes ; deux pas entre deux connecteurs : la lettre du second s'écrit au-dessus de sa pièce
    const b = M.blocs.get(id), memeConnecteur = (u, v) => b.genre !== 'equip' || b.connecteur.get(u.cle) === b.connecteur.get(v.cle);
    listes.forEach(L => { for (let j = 1; j < L.length; j++) S.aretes.push([K(id, L[j - 1].cle), K(id, L[j].cle), memeConnecteur(L[j - 1], L[j]) ? PRH : 2 * PRH]); }); });
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
  const idx = new Map(); let n = 0; const id = s => { let i = idx.get(s); if (i === undefined) { i = n++; idx.set(s, i); } return i; };
  const src = new Int32Array(A.length), dst = new Int32Array(A.length); let m = 0;
  for (const [a, b, w] of A) { if (a === b) { if (w > 0.01) return false; continue; } src[m] = id(a); dst[m] = id(b); m++; }
  // un tri topologique sur des tableaux : les degrés entrants, les arcs rangés par origine, la file
  const indeg = new Int32Array(n), debut = new Int32Array(n + 1);
  for (let e = 0; e < m; e++) { indeg[dst[e]]++; debut[src[e] + 1]++; }
  for (let i = 0; i < n; i++) debut[i + 1] += debut[i];
  const adj = new Int32Array(m), pos = debut.slice(0, n);
  for (let e = 0; e < m; e++) adj[pos[src[e]]++] = dst[e];
  const file = new Int32Array(n); let tete = 0, fin = 0;
  for (let i = 0; i < n; i++) if (!indeg[i]) file[fin++] = i;
  let vus = 0;
  while (tete < fin) { const u = file[tete++]; vus++; for (let k = debut[u]; k < debut[u + 1]; k++) { const v = adj[k]; if (--indeg[v] === 0) file[fin++] = v; } }
  return vus === n;
}
/* Les fils qu'on peut rendre droits : entre deux blocs de la même rangée et
   de colonnes différentes ; pas ceux d'une borne qui sert plusieurs blocs du
   même côté — une barrette de piquage les rend droits quelle que soit leur
   hauteur. Les fils prioritaires d'abord, puis ceux d'une barrette (elle
   s'allonge), puis les voisins, les enjambements en dernier. */
function filsCandidats(M, E) {
  const piquage = (id, cle, s) => new Set(M.partenairesBlocs(K(id, cle)).filter(q => coteDe(E.place, id, q) === s).map(q => q.id)).size >= 2;
  const cand = [];
  M.liens.forEach(w => { if (w.shunt || w.boucle || M.estTag(w.a.id) || M.estTag(w.b.id) || E.refuses.has(w.li)) return;
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
    // jamais plus bas que juste au-dessus de la borne suivante : une contrainte d'aval lointaine enverrait le sommet au fond du bloc
    if (!(oe && oe.length)) mx = isFinite(cible) ? cible : y0; else if (isFinite(cible)) mx = Math.min(mx, cible);
    if (mx > y0 + 0.5 && hauts >= 1 && bas === 0) Y.set(n, mx); }
}
/* RÉSOUDRE : chaque fil accepté reçoit UNE ordonnée partagée par ses deux
   bornes ; un fil qui créerait un cycle reste plié. `guide` : les ordonnées
   du tour précédent, pour deviner les couloirs des enjambements. Rend
   { y, haut, bas, acc } — acc, le nombre de fils alignés. */
function resoudre(M, E, guide) {
  evaluations += 2;                       // un solveur coûte deux routages rapides, mesuré
  const N = nets(M, E), S = structureDesContraintes(M, E); const traversees = []; const estimY = k => (guide && guide.get(k)) ?? 0;
  /* les arêtes de structure, portées sur les nets courants ; pour un essai de fusion, seules celles qui touchent le net
     qui fond changent (son décalage d s'ajoute à ce qui en part, se retranche à ce qui y arrive) — et l'essai accepté
     devient la base */
  let base = contraintes(S, N.pos, []);
  const essai = (ra, rb, d) => base.map(([x, y, w]) => (x === rb || y === rb) ? [x === rb ? ra : x, y === rb ? ra : y, w + (x === rb ? d : 0) - (y === rb ? d : 0)] : [x, y, w]);
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
    const A = essai(ra, rb, d), T = contraintes({ aretes: [], derniers: S.derniers, premiers: S.premiers, mb: S.mb, mh: S.mh }, f, traversees);
    if (!acyclique(A.concat(T))) { ajoutees.forEach(() => traversees.pop()); return; }
    N.fondre(rb, ra, d); acc++; base = A; });
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
      // une borne qui ne sert qu'une pastille (une masse) suit sa voisine d'ordre naturel : sa pastille pend alors sous une borne
      // qui la suit aussi, pas sur le fil de la borne qu'elle aurait doublée
      unites.forEach((u, i) => { if (u.k != null) return;
        const suivante = unites.slice(i + 1).find(v => v.k != null);
        u.k = i > 0 ? unites[i - 1].k + 1e-3 : suivante ? suivante.k - 1e-3 : (y.get(K(id, u.cles[0])) ?? i); });
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
/* Ordonner un état : le barycentre et le solveur en alternance ; l'ordre
   gardé est celui que l'ESTIMATION préfère (fils droits moins croisements,
   comme le juge) — l'ordre qui aligne le plus de fils en fait souvent
   croiser trop. */
function ordonnerLesBlocs(M, E, maxit) {
  const note = pos => estimer(assembler(M, E, pos)).lisibilite;
  let pos = resoudre(M, E, null), best = pos, bestNote = note(pos), bestOrdre = photoOrdres(E), stagne = 0;
  const MAXIT = maxit || (M.ids.length > 300 ? 8 : 20);
  for (let it = 0; it < MAXIT && stagne < 6; it++) { barycentre(M, E, pos.y, (it >> 1) % 2 === 1, it % 2); pos = resoudre(M, E, pos.y);
    const n = note(pos); if (n > bestNote + 0.01) { best = pos; bestNote = n; bestOrdre = photoOrdres(E); stagne = 0; } else stagne++; }
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
  return { comps, links, bbox, compDe, options: E.options, coupes: connecteursCoupes(M, E), geom: { colonnes, colonneDe, colX: cols.colX, colW: cols.colW, chW: cols.chW, nCols: cols.nCols, yMin, yMax, pastilles: [], pastillesCollees: pastilles, rangees: nR > 1 ? nR : 0, resserre: !!E.goulottes } };
}
/* Les connecteurs COUPÉS : ceux dont des bornes sortent des deux flancs (une
   borne libre dédoublée n'en est pas un). Le juge les compte. */
function connecteursCoupes(M, E) { let n = 0;
  M.ids.forEach(id => { const b = M.blocs.get(id); if (b.genre !== 'equip') return; const flancsDe = new Map();
    b.bornes.forEach(p => { const g = b.connecteur.get(p.cle); if (g == null) return; const f = flancDe1(E, id, p.cle); if (f !== 'L' && f !== 'R') return;
      (flancsDe.get(g) || flancsDe.set(g, new Set()).get(g)).add(f); });
    flancsDe.forEach(fl => { if (fl.size > 1) n++; }); });
  return n; }

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
/* Les SEGMENTS PARTAGÉS : deux fils de nets différents qui se superposent sur
   un même segment (même ordonnée, abscisses qui se recouvrent, ou l'inverse)
   se lisent comme une connexion qui n'existe pas — pire qu'un croisement, où
   le lecteur voit au moins un pont. Un net : les bornes reliées, shunts
   compris (deux bornes pontées sont un même potentiel, se toucher n'y ment
   pas). Rend le nombre de paires (fil, fil) qui partagent un segment. */
function compterPartages(fils, detail) {
  const chef = new Map(); const trouver = k => { while (chef.has(k) && chef.get(k) !== k) k = chef.get(k); return k; };
  const unir = (a, b) => { const ra = trouver(a), rb = trouver(b); if (!chef.has(ra)) chef.set(ra, ra); if (!chef.has(rb)) chef.set(rb, rb); if (ra !== rb) chef.set(rb, ra); };
  const bornes = w => [String(w.de) + ':' + String(w.borneDe), String(w.vers) + ':' + String(w.borneVers)];
  fils.forEach(w => { const [a, b] = bornes(w); unir(a, b); });
  const H = new Map(), V = new Map(); let n = 0;
  const poser = (Mp, k, a, b, net, li) => { const L = Mp.get(k) || Mp.set(k, []).get(k); const lo = Math.min(a, b), hi = Math.max(a, b);
    L.forEach(s => { if (s.net !== net && s.li !== li && Math.min(hi, s.hi) - Math.max(lo, s.lo) > 0.5) { n++; if (detail) detail.push(fils[s.li].cable + ' / ' + fils[li].cable); } }); L.push({ lo, hi, net, li }); };
  fils.forEach((w, li) => { if (w.shunt || !w.pts || w.pts.length < 2) return; const net = trouver(bornes(w)[0]);
    for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1];
      if (Math.abs(a.y - b.y) < 0.01) poser(H, Math.round(a.y * 10), a.x, b.x, net, li); else if (Math.abs(a.x - b.x) < 0.01) poser(V, Math.round(a.x * 10), a.y, b.y, net, li); } });
  return n;
}
/* Les TOURS : un fil qui sort d'un bloc par le flanc opposé à la colonne de
   son partenaire fait le tour du bloc — la distance de Manhattan ne le voit
   pas (le tour est déjà dans la distance), il se compte à part. Un
   partenaire de la même colonne n'est d'aucun côté : ce n'est pas un tour.
   Un connecteur coupé en deux flancs se justifie en en supprimant un. */
const colonneDuBout = ep => ep.stub === 'L' ? ep.ch - 1 : ep.ch;          // stub L : le bout est sur le flanc droit, sa goulotte à droite
function compterTours(L) { let n = 0;
  L.links.forEach(l => { if (l.boucle || l.shunt) return; const A = l.epA, B = l.epB, ca = colonneDuBout(A), cb = colonneDuBout(B);
    if ((A.stub === 'L' && cb < ca) || (A.stub === 'R' && cb > ca)) n++;
    if ((B.stub === 'L' && ca < cb) || (B.stub === 'R' && ca > cb)) n++; });
  return n; }
/* Les MASSES QUI PENDENT SUR UN FIL : le symbole de masse se dessine sous
   son fil (trois barres et le repère, sur une trentaine d'unités) ; un fil
   étranger qui passe dessous se lit à travers. Le placement l'évite en
   rangeant la masse en bout de flanc ; le juge compte celles qui restent. */
const PEND_MASSE = 30;
function compterMassesGenees(L, fils) { let n = 0;
  L.comps.forEach(c => { if (c.kind !== 'tag' || !estMasse(c.name)) return; const y0 = c.y + c.h / 2 + 1, y1 = y0 + PEND_MASSE;
    if (fils.some(w => { for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1];
      if (Math.abs(a.y - b.y) < 0.01 && a.y > y0 && a.y < y1 && Math.max(a.x, b.x) > c.x && Math.min(a.x, b.x) < c.x + c.w) return true; } return false; })) n++; });
  return n; }
/* Les DÉTOURS : ce qu'un fil parcourt de plus que la distance de Manhattan
   entre ses deux bouts — un U dans une goulotte, un couloir qui s'écarte.
   Un Z n'en a pas. */
const detourDe = w => { const p = w.pts; if (!p || p.length < 3) return 0; let l = 0;
  for (let i = 0; i < p.length - 1; i++) l += Math.abs(p[i + 1].x - p[i].x) + Math.abs(p[i + 1].y - p[i].y);
  return l - Math.abs(p[p.length - 1].x - p[0].x) - Math.abs(p[p.length - 1].y - p[0].y); };
function compterDetours(fils) { let d = 0; fils.forEach(w => d += detourDe(w)); return d; }
/* Les CONTOURS : un fil qui contourne des blocs — un couloir qui s'écarte
   de plus d'un bloc, un fil qui passe par-dessus tout le dessin — se lit
   comme un fil qui fait le tour ; ce qu'il dépasse d'un petit détour
   (CONTOUR_LIBRE) se compte en fils droits, un par CONTOUR_PAS. */
const CONTOUR_LIBRE = 120, CONTOUR_PAS = 150;
function compterContours(fils) { let s = 0; fils.forEach(w => s += Math.max(0, detourDe(w) - CONTOUR_LIBRE) / CONTOUR_PAS); return s; }
/* Les corps ÉTIRÉS : un équipement dont le corps dépasse une fois et demie
   sa hauteur naturelle (ses bornes au pas, plus les marges), à un pas près
   — deux pour un bloc d'une ou deux bornes par flanc, qui se décale d'un
   pas ou deux pour deux fils droits sans que ce soit un étirement (les
   replis d'une chaîne en sont faits). Le solveur l'a
   allongé pour aligner un fil, et le bloc fait trois fois la taille de ses
   voisins. Ça se voit tout de suite ; ça ne vaut que si l'étirement rend
   droits au moins deux fils de plus. */
const ETIREMENT_MAX = 1.5;
const bornesParFlanc = c => Math.max(1, (c.rangs.L || []).length, (c.rangs.R || []).length);
function hauteurNaturelle(c) { const n = bornesParFlanc(c); return (n - 1) * PRH + 2 * (n === 1 ? 23 : 18); }
const corpsEtire = c => c.kind === 'equip' && c.h > ETIREMENT_MAX * hauteurNaturelle(c) + (bornesParFlanc(c) <= 2 ? 2 : 1) * PRH;
/* Les BANDES d'un dessin : ses rangées de blocs séparées par du vide, dans
   toutes les colonnes. Un dessin d'au moins deux bandes un peu trop large
   s'étire à la fin (etirerAuFormat) sans rien perdre : il TIENDRA. */
function compterBandes(blocs) {
  const iv = blocs.map(c => [c.y, c.y + c.h]).sort((a, b) => a[0] - b[0]); let n = 0, fin = -Infinity;
  iv.forEach(([a, b]) => { if (a > fin + 1) n++; fin = Math.max(fin, b); });
  return n;
}
const compterEtires = comps => comps.filter(corpsEtire).length;
function chevauchements(C) { let n = 0;
  for (let i = 0; i < C.length; i++) for (let j = i + 1; j < C.length; j++) { const a = C[i], b = C[j];
    if (a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1) n++; }
  return n; }
/* Les fils qui traversent un bloc : un bloc ÉTRANGER, c'est l'invariant
   violé, le dessin est faux ; LEUR PROPRE bloc, c'est une faiblesse du
   routeur (il exclut les deux blocs d'un fil de sa vérification de couloir,
   et un fil qui arrive sur le flanc opposé à son partenaire passe alors à
   travers le corps). L'audit ne voit pas les seconds ; le juge ne les compte
   pas droits et les compte deux croisements chacun — sinon la recherche
   apprendrait à « rendre droit » un fil à travers son bloc, ou, en les
   tenant pour faux, écarterait la moitié des dispositions. */
function traversees(fils, blocs) { let etrangers = 0; const propres = new Set();
  fils.forEach(w => { const siens = new Set([String(w.de), String(w.vers)]);
    for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1];
      const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
      for (const c of blocs) { if (!(x1 > c.x + 2 && x0 < c.x + c.w - 2 && y1 > c.y + 2 && y0 < c.y + c.h - 2)) continue;
        if (siens.has(String(c.name))) propres.add(w); else etrangers++; } } });
  return { etrangers, propres }; }
/* Ce que le juge mesure sur un dessin routé : sain (aucun fil dans un bloc
   étranger, aucun chevauchement), tient sur la feuille, fils droits,
   croisements, lisibilité, numéros muets, encombrement (ce qui limite
   l'échelle d'impression sur une feuille au format A, paysage ou portrait),
   surface, longueur des fils. */
function juger(L, R) {
  const fils = R.fils.filter(w => !w.shunt), blocs = L.comps.filter(c => c.kind !== 'tag'), t = traversees(fils, blocs);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  L.comps.forEach(c => { x0 = Math.min(x0, c.x); x1 = Math.max(x1, c.x + c.w); y0 = Math.min(y0, c.y); y1 = Math.max(y1, c.y + c.h); });
  // les goulottes sont taillées pour tous leurs fils, mais les fils droits ne prennent pas de piste : on juge la largeur qu'aura le dessin resserré
  const occ = L.geom.resserre ? null : goulottesOccupees(L, R); let resserre = 0; if (occ) for (let i = 1; i < L.geom.nCols; i++) resserre += Math.max(0, L.geom.chW[i] - occ[i]);
  const w = Math.max(1, x1 - x0 - resserre), h = Math.max(1, y1 - y0), r = w / h;
  let longueur = 0; fils.forEach(f => { for (let i = 0; i < f.pts.length - 1; i++) longueur += Math.abs(f.pts[i + 1].x - f.pts[i].x) + Math.abs(f.pts[i + 1].y - f.pts[i].y); });
  const droits = compterDroits(fils.filter(w => !t.propres.has(w))), croisements = compterCroisements(fils, R.barrettes) + 2 * t.propres.size;
  const partages = compterPartages(R.fils), etires = compterEtires(L.comps);
  // un demi pour cent de tolérance : le juge mesure pastilles comprises, il est plus strict que la feuille
  const tient = r <= FORMAT_MAX * 1.005 && r >= 1 / (FORMAT_MAX * 1.005), tiendra = tient || (r <= FORMAT_MAX * ETIRABLE && compterBandes(blocs) >= 2);
  const contours = compterContours(fils);
  const j = { sain: t.etrangers === 0 && chevauchements(L.comps) === 0, tient, tiendra, format: r, largeur: w,
    droits, croisements, partages, etires, tours: compterTours(L), propres: t.propres.size, contours,
    lisibilite: droits - croisements / CROISEMENTS_PAR_DROIT - PARTAGE * partages - ETIRE * etires - TOUR * compterTours(L) - contours, genees: compterMassesGenees(L, fils), detours: compterDetours(fils), coupes: L.coupes || 0,
    encombrement: Math.min(Math.max(w / A3, h), Math.max(w, h / A3)), surface: w * h, longueur };
  // les muets coûtent cher à compter (le dessin pose ses étiquettes) : seulement quand droits et croisements sont à égalité
  let muets = null; Object.defineProperty(j, 'muets', { enumerable: true, get() { if (muets == null) muets = compterMuets(R); return muets; } });
  return j;
}
/* Un dessin qui met un fil dans un bloc ne gagne jamais ; un dessin qui tient
   sur une feuille bat un dessin qui n'y tient pas ; puis la LISIBILITÉ : les
   fils droits, dont on retranche DEUX FOIS les croisements — un croisement
   est un pont que le lecteur doit résoudre, et un croisement pour rien se
   voit avant un fil plié : quand échanger deux bornes ôte un croisement en
   pliant un fil, on échange (un lecteur l'a demandé deux fois sur la même
   feuille, 210SP1 et 601RC) — et deux fois chaque segment partagé par deux
   fils étrangers (une connexion qui ment), une fois et demie chaque corps
   étiré (il ne vaut que s'il rend droits deux fils de plus) ; à égalité les fils droits, puis
   les croisements, puis les numéros muets, puis les TOURS (un fil qui fait
   le tour de son bloc), les masses qui pendent sur un fil, les DÉTOURS (à
   partir d'une goulotte de différence), puis les
   connecteurs coupés en deux flancs (jamais sans raison : seuls un détour ou
   un croisement en moins le justifient), l'encombrement, la surface, la
   longueur des fils. */
const CROISEMENTS_PAR_DROIT = 0.5, PARTAGE = 2, ETIRE = 1.5, TOUR = 3, DETOUR_MIN = GOULOTTE_MIN;
/* Le choix des finalistes se fait sur une géométrie aux goulottes taillées large, que le resserrage et la recherche
   locale compactent d'un bon tiers : un candidat un peu trop large y a droit. */
const TOLERANCE = 1.35;
function bat(a, b, tolerant) {
  if (!b) return true;
  /* tolérant (le choix des finalistes) : un dessin un peu trop large, ou un fil dans un bloc, se répare en recherche
     locale ; sinon, un dessin qui TIENDRA (étirable à la fin) et qui n'est pas plus large que l'autre vaut un dessin
     qui tient — un corps qui se compacte rend le dessin moins haut, jamais plus large ; un bloc parti dans une colonne
     neuve, si */
  const tient = (j, autre) => tolerant ? (j.format <= FORMAT_MAX * TOLERANCE && j.format >= 1 / (FORMAT_MAX * TOLERANCE)) : (j.tient || (j.tiendra && j.largeur <= autre.largeur + 1));
  if (!tolerant && a.sain !== b.sain) return a.sain; if (tient(a, b) !== tient(b, a)) return tient(a, b);
  if (Math.abs(a.lisibilite - b.lisibilite) > 0.01) return a.lisibilite > b.lisibilite;
  if (a.droits !== b.droits) return a.droits > b.droits; if (a.croisements !== b.croisements) return a.croisements < b.croisements;
  if (a.muets !== b.muets) return a.muets < b.muets;
  if (a.tours !== b.tours) return a.tours < b.tours;
  if (a.genees !== b.genees) return a.genees < b.genees;
  if (Math.abs(a.detours - b.detours) >= DETOUR_MIN) return a.detours < b.detours;
  if (a.coupes !== b.coupes) return a.coupes < b.coupes;
  if (Math.abs(a.encombrement - b.encombrement) > 0.01 * b.encombrement) return a.encombrement < b.encombrement;
  if (Math.abs(a.surface - b.surface) > 0.01 * b.surface) return a.surface < b.surface;
  return a.longueur < b.longueur - 0.5;
}
/* L'ESTIMATION : ce que le juge dira, à peu près, sans router. Un fil est
   droit si ses deux bornes sont à la même hauteur, face à face, couloir
   libre ; un fil plié prend une verticale dans une goulotte (celle du
   départ, de l'arrivée, ou un couloir entre les deux : la forme qui enjambe
   le moins de fils droits, comme le routeur) ; deux verticales d'une
   goulotte se croisent au mieux de leurs deux ordres ; une verticale qui
   enjambe un fil droit le croise. C'est le TAMIS des gestes de la recherche
   locale : cent fois moins cher qu'un routage, faux d'un croisement ou deux,
   et le routage tranche. */
function estimer(L) {
  const blocs = L.comps.filter(c => c.kind !== 'tag'), g = L.geom;
  const x0 = ch => ch === 0 ? g.colX[0] - g.chW[0] : g.colX[ch - 1] + g.colW[ch - 1], x1 = ch => x0(ch) + g.chW[ch];
  const mur = ep => ep.stub === 'L' ? 'L' : 'R';
  const libre = (xa, xb, y, ex) => { if (xa > xb) { const t = xa; xa = xb; xb = t; } return !blocs.some(c => !ex.has(c.name) && xb > c.x + 1 && xa < c.x + c.w - 1 && y > c.y - 3 && y < c.y + c.h + 3); };
  const fils = []; L.links.forEach(l => { if (l.boucle || l.shunt) return; let A = l.epA, B = l.epB;
    if (A.ch > B.ch || (A.ch === B.ch && mur(A) === 'R' && mur(B) === 'L')) { const t = A; A = B; B = t; }
    fils.push({ A, B, ex: new Set([String(l.de), String(l.vers)]) }); });
  const nG = g.nCols + 1, barrieres = Array.from({ length: nG }, () => []), verticales = Array.from({ length: nG }, () => []);
  let droits = 0; const plies = [];
  fils.forEach(f => { const { A, B, ex } = f;
    if (Math.abs(A.y - B.y) <= 0.75 && mur(A) === 'L' && mur(B) === 'R' && libre(A.x + 2, B.x - 2, A.y, ex)) { droits++;
      // il barre les goulottes qu'il traverse de part en part (le fil d'une pastille reste dans sa colonne)
      for (let ch = A.ch; ch <= B.ch; ch++) if (A.x <= x0(ch) + 1 && B.x >= x1(ch) - 1) barrieres[ch].push(A.y); } else plies.push(f); });
  barrieres.forEach(b => b.sort((u, v) => u - v));
  const coupe = (ch, ya, yb) => { const lo = Math.min(ya, yb) + 0.5, hi = Math.max(ya, yb) - 0.5; let n = 0; for (const y of barrieres[ch]) { if (y > hi) break; if (y > lo) n++; } return n; };
  const vert = (ch, a0, a1) => verticales[ch].push({ lo: Math.min(a0.y, a1.y), hi: Math.max(a0.y, a1.y), att: [a0, a1] });
  // les bandes d'ordonnées que les colonnes entre deux goulottes occupent : un couloir passe entre elles (calculées une fois par paire de goulottes)
  const bandes = new Map(); const couloirLibre = (ca, cb, y) => { const k = ca + ':' + cb; let B = bandes.get(k);
    if (!B) { B = blocs.filter(c => c.col >= ca && c.col < cb).map(c => [c.y - 3, c.y + c.h + 3]).sort((u, v) => u[0] - v[0]); bandes.set(k, B); }
    for (const [a, b] of B) { if (a > y) return true; if (y < b) return false; } return true; };
  plies.forEach(({ A, B, ex }) => { const mA = mur(A), mB = mur(B);
    if (A.ch === B.ch) { vert(A.ch, { y: A.y, mur: mA }, { y: B.y, mur: mB }); return; }
    const choix = [];
    if (mA === 'L' && libre(A.x + 2, x0(B.ch) + 2, A.y, ex)) choix.push({ c: coupe(B.ch, A.y, B.y), pose: () => vert(B.ch, { y: A.y, mur: 'L' }, { y: B.y, mur: mB }) });
    if (mB === 'R' && libre(x1(A.ch) - 2, B.x - 2, B.y, ex)) choix.push({ c: coupe(A.ch, A.y, B.y), pose: () => vert(A.ch, { y: A.y, mur: mA }, { y: B.y, mur: 'R' }) });
    // un couloir entre les deux goulottes, libre à travers les colonnes entières, celui qui enjambe le moins
    const lo = Math.min(A.y, B.y), hi = Math.max(A.y, B.y); let ym = null, cm = Infinity;
    for (let y = lo - 240; y <= hi + 240; y += 8) { const c = coupe(A.ch, A.y, y) + coupe(B.ch, y, B.y) + 0.5 + 0.0005 * Math.abs(y - (lo + hi) / 2) + (y < lo || y > hi ? 0.4 : 0);
      if (c < cm && couloirLibre(A.ch, B.ch, y)) { cm = c; ym = y; } }
    if (ym != null) choix.push({ c: cm, pose: () => { vert(A.ch, { y: A.y, mur: mA }, { y: ym, mur: 'R' }); vert(B.ch, { y: ym, mur: 'L' }, { y: B.y, mur: mB }); } });
    if (choix.length) choix.sort((u, v) => u.c - v.c)[0].pose(); });
  let croisements = 0; const dans = (y, t) => y > t.lo + 0.5 && y < t.hi - 0.5, detail = [];
  verticales.forEach((V0, ch) => {
    // les fils d'une même borne partagent une verticale, le PIQUAGE, d'où chacun repart : une seule verticale, l'union des leurs
    const cleDe = a => a.mur + ':' + Math.round(a.y * 2), chef = V0.map((_, i) => i), trouver = i => { while (chef[i] !== i) i = chef[i]; return i; };
    const parBorne = new Map(); V0.forEach((v, i) => v.att.forEach(a => { const k = cleDe(a); if (parBorne.has(k)) chef[trouver(i)] = trouver(parBorne.get(k)); else parBorne.set(k, i); }));
    const fondues = new Map(); V0.forEach((v, i) => { const r = trouver(i), f = fondues.get(r);
      if (!f) { fondues.set(r, { lo: v.lo, hi: v.hi, att: v.att.slice() }); return; }
      f.lo = Math.min(f.lo, v.lo); f.hi = Math.max(f.hi, v.hi); v.att.forEach(a => { if (!f.att.some(b => cleDe(b) === cleDe(a))) f.att.push(a); }); });
    const V = [...fondues.values()]; let ici = 0; V.forEach(v => { ici += coupe(ch, v.lo, v.hi); });
    for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) { const I = V[i], J = V[j]; let ij = 0, ji = 0;   // I à gauche de J, puis l'inverse
      J.att.forEach(a => { if (dans(a.y, I)) { if (a.mur === 'L') ij++; else ji++; } });
      I.att.forEach(a => { if (dans(a.y, J)) { if (a.mur === 'R') ij++; else ji++; } });
      ici += Math.min(ij, ji); }
    croisements += ici; detail.push({ ch, verticales: V.length, brutes: V0.length, barrieres: barrieres[ch].length, croisements: ici }); });
  // les corps étirés se voient sans router : l'estimation les compte comme le juge
  const etires = compterEtires(blocs), tours = compterTours(L);
  return { droits, croisements, etires, tours, lisibilite: droits - croisements / CROISEMENTS_PAR_DROIT - ETIRE * etires - TOUR * tours, detail };
}
/* Évaluer un état à une position : assembler, router, juger. Le routage
   RAPIDE (le routeur sans ses détours par une goulotte voisine, qu'il
   n'essaie qu'après coup) trie les gestes de la recherche locale ; le
   routage complet confirme ceux qui gagnent, et juge tout le reste. Le
   compteur sert de budget : en unités de routage, pas en secondes, pour que
   le même contrat donne le même dessin sur toute machine — un routage
   complet en vaut deux rapides, un solveur aussi (mesuré sur le folio
   chargé : 1,6 ms le routage rapide, 2,8 le complet, 3,5 le solveur). */
let evaluations = 0;
const routerVite = L => typeof routerUneFois === 'function' ? routerUneFois(L, new Set()).resultat : router(L);
function evaluer(M, E, pos, vite) { evaluations += vite ? 1 : 2; const L = assembler(M, E, pos); const R = vite ? routerVite(L) : router(L); return { E, pos, L, R, j: juger(L, R) }; }
/* Un dessin un peu trop large pour la feuille s'ÉTIRE : de l'espace
   s'insère dans les bandes vides (aucun bloc ne les traverse, dans aucune
   colonne), ce qui garde tous les alignements et tous les tracés. Gardé
   s'il tient sans rien perdre — pas au juge entier, qui préférerait le
   dessin compact qu'on vient de déclarer trop large. */
const ETIRABLE = 1.3;
function etirerAuFormat(M, meilleur) {
  const j = meilleur.j; if (j.tient || j.format <= FORMAT_MAX || j.format > FORMAT_MAX * ETIRABLE) return meilleur;
  const pos = meilleur.pos, ids = M.ids.filter(id => !M.estTag(id));
  const iv = ids.map(id => [pos.haut.get(id), pos.bas.get(id)]).sort((a, b) => a[0] - b[0]); const occ = [];
  iv.forEach(([a, b]) => { const d = occ[occ.length - 1]; if (d && a <= d[1] + 1) d[1] = Math.max(d[1], b); else occ.push([a, b]); });
  if (occ.length < 2) return meilleur;
  const y0 = occ[0][0], y1 = occ[occ.length - 1][1], manque = j.format * (y1 - y0) / (FORMAT_MAX * 0.98) - (y1 - y0);
  const part = manque / (occ.length - 1), y = new Map(pos.y), haut = new Map(pos.haut), bas = new Map(pos.bas);
  const decalage = v => { let d = 0; for (let i = 1; i < occ.length; i++) if (v >= occ[i][0] - 0.01) d += part; return d; };
  ids.forEach(id => { const d = decalage(pos.haut.get(id)); haut.set(id, pos.haut.get(id) + d); bas.set(id, pos.bas.get(id) + d);
    M.blocs.get(id).bornes.forEach(p => { const k = K(id, p.cle); if (y.has(k)) y.set(k, y.get(k) + d); }); });
  const cand = evaluer(M, meilleur.E, { y, haut, bas, acc: pos.acc }), c = cand.j;
  const sansPerte = c.sain && c.tient && c.droits >= j.droits && c.croisements <= j.croisements && c.partages <= j.partages && c.etires <= j.etires;
  return sansPerte ? cand : meilleur;
}
/* Le RESSERRAGE, une fois le placement choisi : les goulottes reprennent la
   largeur que les pistes occupent vraiment (le juge l'anticipait) ; gardé
   s'il ne perd rien. */
function resserrer(M, meilleur) {
  const E = meilleur.E, fix = goulottesOccupees(meilleur.L, meilleur.R); if (!fix) return meilleur;
  const large = meilleur.L.geom.chW.slice(), avant = E.goulottes;
  const sansPerte = c => c.j.sain && c.j.droits >= meilleur.j.droits && c.j.croisements <= meilleur.j.croisements && c.j.partages <= meilleur.j.partages && c.j.muets <= meilleur.j.muets;
  const essai = g => { E.goulottes = g; return evaluer(M, E, meilleur.pos); };
  const tout = essai(fix); if (sansPerte(tout)) return tout;
  // le routeur n'aime pas toujours une goulotte plus étroite (un piquage y perd sa place) : celles qui ne changent rien, une par une
  const sures = large.slice();
  fix.forEach((w, i) => { if (w >= large[i]) return; const g = sures.slice(); g[i] = w; if (sansPerte(essai(g))) sures[i] = w; });
  const cand = essai(sures); if (sansPerte(cand)) return cand;
  E.goulottes = avant; return meilleur;
}

/* ===== 10. LA RECHERCHE LOCALE AU ROUTAGE RÉEL ========================== */
/* Chaque geste se juge en routant pour de vrai, et n'est gardé que s'il
   gagne au juge :
     · l'ordre des bornes d'un connecteur (exact jusqu'à trois, échanges
       deux à deux au-delà), un paquet ponté restant ensemble ;
     · le glissement d'un bloc en face d'un partenaire, ses feuilles avec lui ;
     · l'échange de deux blocs d'une colonne, puis le solveur rejoue ;
     · un fil plié rendu prioritaire au solveur ; un fil droit qui étire
       un corps refusé au solveur ;
     · le flanc d'un connecteur ;
     · le flanc d'une borne, ou d'un sous-ensemble contigu d'un connecteur
       (le connecteur se coupe, ou se recolle) ;
     · le côté de sortie d'une borne de bornier qui ne sert qu'une pastille ;
     · un bloc qui change de colonne.
   Trois tamis, du moins cher au plus sûr : l'ESTIMATION écarte sans router
   les gestes que le meilleur bat nettement ; le routage RAPIDE écarte ceux
   qui ne gagnent pas contre le meilleur jugé de même (jv) ; le routage
   COMPLET confirme, contre le meilleur (j). Jusqu'à convergence, ou la fin
   du budget. En mode `finale`, les échanges de bornes, les flancs de bornes
   et les glissements seulement, tous routés : c'est la dernière passe, sur
   la géométrie resserrée. */
// ce que l'estimation a le droit de se tromper avant d'écarter un geste : un croisement ; deux dans la passe finale,
// où un geste évident ne doit pas se manquer (l'estimation se trompe d'un ou deux croisements sur un changement de flanc)
const TAMIS = 1 / CROISEMENTS_PAR_DROIT, TAMIS_FINAL = 2 / CROISEMENTS_PAR_DROIT;
function rechercheLocale(M, meilleur, budget, finale) {
  const copie = pos => ({ y: new Map(pos.y), haut: new Map(pos.haut), bas: new Map(pos.bas), acc: pos.acc });
  const journal = meilleur.journal || (meilleur.journal = []); let geste = '';
  if (!meilleur.est) meilleur.est = estimer(meilleur.L);
  if (!meilleur.jv) meilleur.jv = evaluer(M, meilleur.E, meilleur.pos, true).j;
  // trier : les deux premiers tamis, contre le meilleur ; rend le candidat au routage rapide, ou rien
  const trier = (E, pos, tamis = TAMIS, large) => { const est = estimer(assembler(M, E, pos)); if (meilleur.j.sain && est.lisibilite < meilleur.est.lisibilite - tamis) return null;   // un dessin faux se répare à n'importe quel prix
    const vite = evaluer(M, E, pos, true);
    /* large : le routage rapide ne voit pas les croisements que les détours du routage complet ôtent (deux au moins, quand il en ôte) — un candidat qui semble pire de deux croisements va quand même au routage complet */
    if (large) { const marge = Math.max(2, meilleur.jv.croisements - meilleur.j.croisements), seuil = { ...meilleur.jv, croisements: meilleur.jv.croisements + marge, lisibilite: meilleur.jv.lisibilite - marge / CROISEMENTS_PAR_DROIT };
      if (bat(seuil, vite.j)) return null; }
    else if (!bat(vite.j, meilleur.jv)) return null;
    vite.est = est; return vite; };
  // confirmer : le routage complet, contre le meilleur ; gardé s'il gagne
  const confirmer = vite => { const plein = evaluer(M, vite.E, vite.pos); if (!bat(plein.j, meilleur.j)) return false;
    plein.est = vite.est; plein.jv = vite.j; plein.journal = journal; journal.push({ geste, droits: plein.j.droits, croisements: plein.j.croisements }); meilleur = plein; return true; };
  const garder = (E, pos, tamis, large) => { const v = trier(E, pos, tamis, large); return !!v && confirmer(v); };
  const fin = evaluations + budget; let temps = () => evaluations < fin;
  /* l'estimation d'un autre ordre des bornes d'un groupe, sans rien
     réassembler : les bouts des fils touchés prennent leurs nouvelles
     ordonnées, la pastille collée à une borne suit */
  const estimerOrdre = (id, cles, ordre) => { const L = meilleur.L, pos = meilleur.pos, yDe = new Map(ordre.map((c, j) => [K(id, c), pos.y.get(K(id, cles[j]))]));
    const links = L.links.map((l, li) => { const w = M.liens[li]; let ya = yDe.get(K(w.a.id, w.a.cle)), yb = yDe.get(K(w.b.id, w.b.cle)); if (ya == null && yb == null) return l;
      if (ya == null && M.estTag(w.a.id)) ya = yb; if (yb == null && M.estTag(w.b.id)) yb = ya;
      return { ...l, epA: ya == null ? l.epA : { ...l.epA, y: ya }, epB: yb == null ? l.epB : { ...l.epB, y: yb } }; });
    return estimer({ comps: L.comps, links, geom: L.geom }); };
  // après un geste géométrique gardé, l'état reprend l'ordre des ordonnées
  const ordonnerParY = (E, pos) => { M.ids.forEach(id => { if (M.estTag(id)) return; E.clesListes(id).forEach(lid => E.listes.get(id)[lid].sort((u, v) => pos.y.get(K(id, u.cle)) - pos.y.get(K(id, v.cle)))); });
    lesRuns(E).forEach(r => r.cles.sort((a, b) => pos.y.get(K(r.id, a)) - pos.y.get(K(r.id, b))));
    E.piles.forEach(pile => pile.sort((a, b) => pos.haut.get(a) - pos.haut.get(b))); };
  const essayerGeometrie = (pos, tamis, large) => { const E = meilleur.E; if (!garder(E, pos, tamis, large)) return false; ordonnerParY(E, pos); return true; };
  // la position où une borne seule est à la hauteur y, rien d'autre ne bouge (le corps reste ce qu'il est : y est dedans)
  const borneA = (k, y) => { const p = copie(meilleur.pos); p.y.set(k, y); const id = k.split(SEP)[0];
    if (p.haut.has(id)) { if (y - 18 < p.haut.get(id)) p.haut.set(id, y - 18); if (y + 18 > p.bas.get(id)) p.bas.set(id, y + 18); } return p; };
  // un échange de bornes, l'estimation le voit bien (les fils droits exactement) : il n'a pas droit à l'erreur
  const essayerBornes = pos => essayerGeometrie(pos, 0);
  const essayerEtat = () => { const E = meilleur.E; return garder(E, resoudre(M, E, meilleur.pos.y)); };
  // l'état pris dans l'ordre des bornes d'une position, le solveur rejoué : gardé s'il gagne, sinon l'ordre d'avant revient
  const resoudreDans = (p2, tamis, large) => { const E = meilleur.E; ordonnerParY(E, p2); if (garder(E, resoudre(M, E, p2.y), tamis, large)) return true; ordonnerParY(E, meilleur.pos); return false; };
  const gestes = [
    ['permutation', () => permutationsDeBornes(M, meilleur.E, () => meilleur.pos, copie, essayerBornes, temps, estimerOrdre, () => meilleur.est, () => meilleur, p2 => resoudreDans(p2, TAMIS), 0)],
    ['glissement', () => glissements(M, meilleur.E, () => meilleur, copie, essayerGeometrie, temps)],
    ['échange', () => echangesDeBlocs(M, meilleur.E, essayerEtat, temps)],
    ['priorité', () => promotions(M, meilleur.E, () => meilleur, essayerEtat, temps)],
    ['renoncement', () => renoncements(M, meilleur.E, () => meilleur, essayerEtat, temps)],
    ['flanc', () => flancsDeConnecteurs(M, meilleur.E, essayerEtat, temps)],
    ['borne', () => flancsDeBornes(M, meilleur.E, () => meilleur, essayerEtat, temps, (k, y) => essayerGeometrie(borneA(k, y), TAMIS), false, (k, y) => estimer(assembler(M, meilleur.E, borneA(k, y))).lisibilite)],
    ['sortie', () => sortiesDeBornier(M, meilleur.E, essayerEtat, temps)],
    ['colonne', () => changementsDeColonne(M, () => meilleur.E, () => meilleur, trier, confirmer, temps, () => meilleur.est)]];
  // les changements de colonne, chers et structurels, ne s'essaient qu'à la première passe : au-delà ils ne trouvent rien et mangent le budget des gestes fins
  if (!finale) { for (let passe = 0; passe < 6 && temps(); passe++) { let any = false; gestes.forEach(([nom, g]) => { if (nom === 'colonne' && passe > 0) return; geste = nom; if (temps() && g()) any = true; }); if (!any) break; } return meilleur; }
  /* la passe FINALE, sur la géométrie resserrée : les échanges de bornes,
     les flancs de bornes et les glissements — l'estimation ne tamise qu'à
     un croisement près, et une égalité au routage rapide va au routage
     complet (seuls ses détours voient certains croisements). Un geste
     évident ne se manque pas : c'est ce que le banc vérifie, sur cette
     géométrie-là. Sans tamis, les cinquante-cinq paires d'un connecteur de
     onze bornes mangeaient tout le budget à elles seules. */
  const essayerTout = pos => essayerGeometrie(pos, TAMIS_FINAL, true);
  const essayerEtatTout = () => { const E = meilleur.E; return garder(E, resoudre(M, E, meilleur.pos.y), TAMIS_FINAL, true); };
  const estimerBorneA = (k, y) => estimer(assembler(M, meilleur.E, borneA(k, y))).lisibilite;
  /* le flanc d'une borne se juge au ROUTAGE COMPLET directement : ni l'estimation ni le routage rapide ne voient le détour
     qui, seul, ôte parfois les croisements que le changement de flanc apporte — et les candidats sont peu nombreux ;
     l'estimation n'écarte que ce qu'elle donne perdant de quatre croisements */
  const essayerBorneAuComplet = (k, y) => { const E = meilleur.E, pos = borneA(k, y);
    if (meilleur.j.sain && estimerBorneA(k, y) < meilleur.est.lisibilite - 2 * TAMIS_FINAL) return false;
    const plein = evaluer(M, E, pos); if (!bat(plein.j, meilleur.j)) return false;
    plein.est = estimer(plein.L); plein.jv = evaluer(M, E, pos, true).j; plein.journal = journal; journal.push({ geste, droits: plein.j.droits, croisements: plein.j.croisements });
    meilleur = plein; ordonnerParY(E, pos); return true; };
  const finaux = [
    ['borne', () => flancsDeBornes(M, meilleur.E, () => meilleur, essayerEtatTout, temps, essayerBorneAuComplet, true, estimerBorneA)],
    ['glissement', () => glissements(M, meilleur.E, () => meilleur, copie, essayerTout, temps)],
    ['permutation', () => permutationsDeBornes(M, meilleur.E, () => meilleur.pos, copie, essayerTout, temps, estimerOrdre, () => meilleur.est, () => meilleur, p2 => resoudreDans(p2, TAMIS_FINAL, true), TAMIS_FINAL)]];
  // un geste évident ne se manque pas : tant qu'un balayage trouve encore, la passe continue, jusqu'au double de son budget
  const finFinale = evaluations + 2 * budget; temps = () => evaluations < finFinale;
  for (let passe = 0; passe < 6 && temps(); passe++) { let any = false; finaux.forEach(([nom, g]) => { geste = nom; if (temps() && g()) any = true; }); if (!any) break; }
  return meilleur;
}
/* Un bloc change de colonne — la voisine, ou celle d'après, ou une neuve
   au bord : l'état se rebâtit sur les nouvelles colonnes (flancs, piles),
   se remet en ordre, et se juge. Chez le bloc déplacé et ses voisins, un
   connecteur qui parle des deux côtés se coupe (sinon un fil ferait le tour
   et le changement ne gagnerait jamais ; le geste « borne » recolle ce qui
   n'était pas justifié). Tous les changements sont triés, et le MEILLEUR
   est confirmé — le premier venu mène ailleurs (un bloc qui gagne deux
   croisements en perdant un fil droit peut cacher celui qui en gagne sept
   sans rien perdre). */
function changementsDeColonne(M, etatDe, meilleurDe, trier, confirmer, temps, estDe) {
  // seuls les blocs qui ont un fil plié peuvent y gagner
  const plies = new Set(); meilleurDe().R.fils.forEach(w => { if (!w.shunt && w.pts.length > 2) { plies.add(M.liens[w.i].a.id); plies.add(M.liens[w.i].b.id); } });
  const candidats = [];
  M.ids.forEach(id => { if (M.estTag(id) || !plies.has(id) || !temps()) return;
    for (const d of [-1, 1, -2, 2]) { if (!temps()) return; const E = etatDe(); const c0 = E.col.get(id), c1 = c0 + d;
      const cs = [...E.col.values()]; if (c1 < Math.min(...cs) - 1 || c1 > Math.max(...cs) + 1) continue;
      const col = new Map(E.col); col.set(id, c1); normaliser(col);
      const E2 = etatDepuisColonnes(M, col, E.options); E2.sorties = new Map(E.sorties);
      // l'ordre complet coûte cher : un premier solveur et l'estimation écartent les changements sans espoir
      const brut = estimer(assembler(M, E2, resoudre(M, E2, null))); if (meilleurDe().j.sain && brut.lisibilite < estDe().lisibilite - TAMIS - 3 / CROISEMENTS_PAR_DROIT) continue;
      const v = trier(E2, ordonnerLesBlocs(M, E2, 8)); if (v) candidats.push(v); } });
  candidats.sort((a, b) => bat(a.j, b.j) ? -1 : (bat(b.j, a.j) ? 1 : 0));
  for (const v of candidats) { if (!temps()) break; if (confirmer(v)) return true; }
  return false;
}
const permutations = a => a.length <= 1 ? [a] : a.flatMap((x, i) => permutations([...a.slice(0, i), ...a.slice(i + 1)]).map(q => [x, ...q]));
/* Les bornes d'un connecteur échangent leurs ordonnées ; les bornes libres
   d'un flanc aussi, entre elles. Pour chaque groupe, d'abord une DESCENTE
   sur l'estimation seule (les échanges deux à deux tant qu'elle gagne),
   routée une fois au bout ; si le routage la refuse, ou si elle n'a rien
   trouvé, les échanges un à un au routage. L'estimation d'un échange ne
   coûte rien et voit les fils droits exactement : un échange qu'elle donne
   perdant de plus d'un fil droit au-delà du tamis ne se route pas, et le
   solveur ne se rejoue que pour celui qui n'a perdu qu'un fil (celui qu'il
   peut redresser en faisant glisser le partenaire). */
function permutationsDeBornes(M, E, posDe, copie, essayer, temps, estimerOrdre, estDe, meilleurDe, resoudreDans, tamis) {
  let any = false; tamis = tamis || 0;
  // un paquet ponté reste d'un seul tenant (dans n'importe quel ordre : le pont couvre tout le paquet)
  const voisinesOK = (id, ordre) => paquetsDe(M, id, ordre).every(paquet => { const idx = paquet.map(c => ordre.indexOf(c)).sort((a, b) => a - b); return idx[idx.length - 1] - idx[0] === idx.length - 1; });
  // échanger deux bornes dont tous les fils sont droits ne peut que les plier : ces paires-là ne se routent pas
  const pliees = new Set(); if (meilleurDe) meilleurDe().R.fils.forEach(w => { if (w.shunt || w.pts.length === 2) return; const l = M.liens[w.i]; pliees.add(K(l.a.id, l.a.cle)); pliees.add(K(l.b.id, l.b.cle)); });
  const utile = (id, a, b) => !meilleurDe || pliees.has(K(id, a)) || pliees.has(K(id, b)) || !M.partenairesBlocs(K(id, a)).length || !M.partenairesBlocs(K(id, b)).length;
  const groupes = [];
  M.ids.forEach(id => { const b = M.blocs.get(id); if (b.genre !== 'equip') return;
    ['L', 'R'].forEach(lid => { const L = E.listes.get(id)[lid], vus = new Set(), libres = [];
      L.forEach(p => { if (flancDe1(E, id, p.cle) === 'LR') return; const r = runDe(E, id, lid, p.cle);
        if (r) { if (!vus.has(r)) { vus.add(r); groupes.push({ id, cles: r.cles }); } } else libres.push(p.cle); });
      if (libres.length >= 2) groupes.push({ id, cles: libres }); }); });
  const echange = (o, i, j) => { const t = o[i]; o[i] = o[j]; o[j] = t; return o; };
  groupes.forEach(g => { if (!temps()) return;
    const cles = () => g.cles.slice().sort((a, b) => posDe().y.get(K(g.id, a)) - posDe().y.get(K(g.id, b)));
    const essai = ordre => { const pos = posDe(), c0 = cles();
      if (ordre.every((c, j) => c === c0[j]) || !voisinesOK(g.id, ordre)) return false;
      const est = estimerOrdre(g.id, c0, ordre).lisibilite, ref = estDe().lisibilite; if (est < ref - Math.max(tamis, 1) - 1e-6) return false;
      const ys = c0.map(c => pos.y.get(K(g.id, c))); const p2 = copie(pos); ordre.forEach((c, j) => p2.y.set(K(g.id, c), ys[j]));
      if (est >= ref - tamis - 1e-6 && essayer(p2)) return true;
      // à hauteurs fixes l'échange plie un fil ; le solveur rejoué dans le nouvel ordre peut faire glisser le partenaire et le garder droit
      return !!resoudreDans && est >= ref - 1 - 1e-6 && temps() && resoudreDans(p2); };
    const n = g.cles.length;
    if (n <= 3) { permutations(cles()).forEach(o => { if (temps() && essai(o)) any = true; }); return; }
    const c0 = cles(); let ordre = c0.slice(), est = estDe().lisibilite, bouge = false;
    for (let passe = 0; passe < 3; passe++) { let gagne = false;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const o = echange(ordre.slice(), i, j); if (!voisinesOK(g.id, o)) continue;
        const e = estimerOrdre(g.id, c0, o).lisibilite; if (e > est + 1e-9) { ordre = o; est = e; gagne = bouge = true; } }
      if (!gagne) break; }
    if (bouge && essai(ordre)) { any = true; return; }
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { if (!temps()) return; const c = cles(); if (utile(g.id, c[i], c[j]) && essai(echange(c, i, j))) any = true; } });
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
      const r = Math.round((pos.y.get(K(q.id, q.cle)) - pos.y.get(K(id, p.cle))) * 2) / 2; if (Math.abs(r) > 0.6 && Math.abs(r) <= 1000) rs.add(r); }));
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
/* Un fil droit d'un corps étiré est REFUSÉ au solveur : le bloc se referme
   sur ses bornes, le fil fait un coude — gardé si le juge préfère. */
function renoncements(M, E, meilleurDe, essayer, temps) {
  let any = false; const m = meilleurDe();
  const etires = new Set(m.L.comps.filter(corpsEtire).map(c => c.id)); if (!etires.size) return false;
  m.R.fils.forEach(w => { if (!temps() || w.shunt || w.pts.length !== 2 || E.refuses.has(w.i)) return; const l = M.liens[w.i];
    if (!etires.has(l.a.id) && !etires.has(l.b.id)) return;
    E.refuses.add(w.i); if (essayer()) any = true; else E.refuses.delete(w.i); });
  return any;
}
/* Un flanc ne se quitte pas pour tourner le dos à un partenaire : passer des
   bornes du côté s0 au côté −s0 ne crée pas de tour si autant de leurs
   partenaires sont de l'autre côté que de celui-ci (ceux d'une même colonne
   ne comptent pas). */
function sansNouveauTour(M, E, id, cles, s0) {
  let ici = 0, la = 0;
  cles.forEach(c => M.partenairesBlocs(K(id, c)).forEach(q => { const s = coteDe(E.place, id, q); if (s === s0) ici++; else if (s === -s0) la++; }));
  return la >= ici;
}
/* Un connecteur entier change de flanc — jamais pour tourner le dos à ses
   partenaires. */
function flancsDeConnecteurs(M, E, essayer, temps) {
  let any = false;
  M.ids.forEach(id => { const b = M.blocs.get(id); if (b.genre !== 'equip' || !temps()) return;
    const groupes = new Map(); b.bornes.forEach(p => { const g = b.connecteur.get(p.cle) ?? ('~' + p.cle); (groupes.get(g) || groupes.set(g, []).get(g)).push(p.cle); });
    groupes.forEach(cles => { if (!temps()) return; const f0 = E.flancDe.get(K(id, cles[0])); if (f0 !== 'L' && f0 !== 'R') return;
      if (cles.some(c => E.flancDe.get(K(id, c)) !== f0) || !sansNouveauTour(M, E, id, cles, f0 === 'L' ? -1 : 1)) return;
      const f1 = f0 === 'L' ? 'R' : 'L', avant = photoOrdres(E), flancsAvant = cles.map(c => E.flancDe.get(K(id, c)));
      cles.forEach(c => E.flancDe.set(K(id, c), f1));
      const ls = E.listes.get(id); const bornes = ls[f0].filter(p => cles.includes(p.cle)); ls[f0] = ls[f0].filter(p => !cles.includes(p.cle)); ls[f1] = ls[f1].concat(bornes);
      construireRuns(M, E);
      if (essayer()) any = true; else { cles.forEach((c, i) => E.flancDe.set(K(id, c), flancsAvant[i])); revenirOrdres(E, avant); construireRuns(M, E); } }); });
  return any;
}
/* Une BORNE d'un connecteur, ou un sous-ensemble contigu de ses bornes d'un
   flanc, passe sur l'autre flanc — le connecteur se coupe en deux, ou se
   recolle. Candidates : les bornes dont un partenaire n'est pas du côté de
   leur flanc (en face, ou dans la même colonne : le fil fait le tour),
   celles dont un fil est plié (de l'autre flanc, il trouve parfois un
   autre chemin), et celles dont le connecteur a déjà des bornes en face
   (recoller). Sur le
   flanc d'arrivée, le groupe se range à la hauteur de ses bornes, ou contre
   les bornes de son connecteur s'il y en a ; le juge tranche. Deux
   variantes : d'abord la borne seule à hauteur FIXE, rien d'autre ne bouge
   — à sa hauteur si elle est libre sur le flanc d'arrivée, sinon juste
   au-dessus ou au-dessous des bornes de ce flanc, dans le corps (c'est le
   geste que le banc émule) —, puis le solveur rejoue toute la position
   (sauf `fixeSeul` : la passe finale, où il a déjà eu sa chance). */
function flancsDeBornes(M, E, meilleurDe, essayer, temps, essayerFixe, fixeSeul, estimerPos) {
  let any = false;
  const pliees = new Set(); meilleurDe().R.fils.forEach(w => { if (w.shunt || w.pts.length === 2) return; const l = M.liens[w.i]; pliees.add(K(l.a.id, l.a.cle)); pliees.add(K(l.b.id, l.b.cle)); });
  M.ids.forEach(id => { const b = M.blocs.get(id); if (b.genre !== 'equip' || !temps()) return;
    ['L', 'R'].forEach(f0 => { const f1 = f0 === 'L' ? 'R' : 'L', s0 = f0 === 'L' ? -1 : 1, L = E.listes.get(id)[f0];
      const enFace = new Set(E.listes.get(id)[f1].map(p => b.connecteur.get(p.cle)).filter(g => g != null));
      // candidate : une borne dont un partenaire n'est pas de ce côté, ou dont un fil est plié, ou dont le connecteur a des bornes en face —
      // et qui ne tournerait pas le dos à ses partenaires en changeant de flanc
      const candidate = p => { if (flancDe1(E, id, p.cle) !== f0 || !b.connecteur.has(p.cle)) return false;
        const ps = M.partenairesBlocs(K(id, p.cle)); if (!sansNouveauTour(M, E, id, [p.cle], s0)) return false;
        return (ps.length && ps.some(q => coteDe(E.place, id, q) !== s0)) || pliees.has(K(id, p.cle)) || enFace.has(b.connecteur.get(p.cle)); };
      // les groupes contigus d'un même connecteur : chaque borne seule, puis les sous-ensembles contigus de candidates —
      // un paquet ponté reste entier (un pont ne se dessine pas entre deux flancs)
      const groupes = []; let i = 0;
      while (i < L.length) { let j = i; while (j + 1 < L.length && b.connecteur.get(L[j + 1].cle) === b.connecteur.get(L[i].cle)) j++;
        const run = L.slice(i, j + 1), paquets = paquetsDe(M, id, run.map(p => p.cle)).filter(pq => pq.length > 1);
        const entier = g => paquets.every(pq => { const n = pq.filter(c => g.some(p => p.cle === c)).length; return n === 0 || n === pq.length; });
        run.filter(candidate).forEach(p => { if (entier([p])) groupes.push([p]); });
        for (let n = 2; n < run.length; n++) for (let k = 0; k + n <= run.length; k++) { const g = run.slice(k, k + n); if (g.every(candidate) && entier(g)) groupes.push(g); }
        i = j + 1; }
      groupes.forEach(g => { if (!temps() || g.some(p => flancDe1(E, id, p.cle) !== f0)) return;     // un geste gardé a déjà déplacé ces bornes
        const cles = g.map(p => p.cle), avant = photoOrdres(E), pos = meilleurDe().pos;
        cles.forEach(c => E.flancDe.set(K(id, c), f1));
        const ls = E.listes.get(id); ls[f0] = ls[f0].filter(p => !cles.includes(p.cle));
        const nom = b.connecteur.get(cles[0]); let at = ls[f1].findIndex(p => b.connecteur.get(p.cle) === nom);
        if (at >= 0) { while (at < ls[f1].length && b.connecteur.get(ls[f1][at].cle) === nom) at++; }
        else { const y = pos.y.get(K(id, cles[0])); at = ls[f1].findIndex(p => pos.y.get(K(id, p.cle)) > y); if (at < 0) at = ls[f1].length; }
        ls[f1] = [...ls[f1].slice(0, at), ...g, ...ls[f1].slice(at)];
        construireRuns(M, E);
        let garde = false;
        if (g.length === 1 && essayerFixe) { const k = K(id, g[0].cle), y0 = pos.y.get(k), nom = b.connecteur.get(g[0].cle);
          // un pas d'une borne du même connecteur, deux d'une borne d'un autre (sa lettre s'écrit entre les deux)
          const autres = ls[f1].filter(p => p !== g[0]).map(p => ({ y: pos.y.get(K(id, p.cle)), pas: b.connecteur.get(p.cle) === nom ? PRH : 2 * PRH }));
          // au-dessus ou au-dessous du corps d'un pas au plus : le corps grandit d'autant (borneA), le juge voit s'il heurte
          const libre = y => autres.every(a => Math.abs(a.y - y) >= a.pas - 0.5) && y >= pos.haut.get(id) + 10 - PRH && y <= pos.bas.get(id) - 10 + PRH;
          const haut = autres.reduce((m, a) => a.y - a.pas < m ? a.y - a.pas : m, Infinity), basY = autres.reduce((m, a) => a.y + a.pas > m ? a.y + a.pas : m, -Infinity);
          let hauteurs = [y0, ...(autres.length ? [haut, basY] : [])].filter((y, i, a) => a.indexOf(y) === i && libre(y));
          // les hauteurs se routent dans l'ordre de l'estimation (elle ne coûte rien) ; hors passe finale, la meilleure seulement
          if (estimerPos && hauteurs.length > 1) { hauteurs = hauteurs.map(y => [y, estimerPos(k, y)]).sort((u, v) => v[1] - u[1]).map(h => h[0]); if (!fixeSeul) hauteurs = hauteurs.slice(0, 1); }
          for (const y of hauteurs) { if (!temps()) break; if (essayerFixe(k, y)) { garde = true; break; } } }
        if (garde || (!fixeSeul && essayer())) any = true; else { cles.forEach(c => E.flancDe.set(K(id, c), f0)); revenirOrdres(E, avant); construireRuns(M, E); } }); }); });
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
  const E = etatInitial(M, opt); let m = evaluer(M, E, ordonnerLesBlocs(M, E));
  if (opt.affiner) m = rechercheLocale(M, m, opt.budget || 1000);
  m = resserrer(M, m);
  return { ...m.L, routage: m.R, jugement: m.j };
}
/* Une FAMILLE du concours (connecteurs entiers, ou coupés) : les meilleures
   mises en niveaux, chacune ordonnée et routée pour de vrai ; les premières
   au juge (tolérant sur le format : la recherche locale rend souvent un
   dessin plus haut) passent la recherche locale, et la meilleure au juge
   strict gagne ; le serpentin en secours si elle ne tient pas sur la
   feuille. */
function concours(M, opt, budget) {
  // deux finalistes jusqu'à quarante blocs : le budget se partage, le temps ne double pas, et le folio chargé gagne sept croisements
  const nB = M.ids.length, combien = nB <= 40 ? 8 : nB <= 120 ? 4 : 2, finalistes = nB <= 20 ? 5 : nB <= 40 ? 2 : 1;
  const vues = new Set(), candidats = [];
  const essayer = (col, o, centre) => { const E = etatDepuisColonnes(M, col, o);
    const signature = [...E.place].map(([id, p]) => id + ':' + p.r + ',' + p.c).sort().join(';');
    if (vues.has(signature)) return null; vues.add(signature);
    const r = evaluer(M, E, ordonnerLesBlocs(M, E)); r.centre = !!centre; candidats.push(r); return r; };
  candidatsDeNiveaux(M, combien).forEach(c => essayer(c.col, opt, c.centre));
  const classer = tolerant => candidats.sort((a, b) => bat(a.j, b.j, tolerant) ? -1 : (bat(b.j, a.j, tolerant) ? 1 : 0));
  /* un candidat trop large pour la feuille se REPLIE en serpentin, et ses replis concourent comme les autres : sinon
     un escalier qui tient l'emporte sur une chaîne repliée qu'on n'a jamais regardée (les deux meilleurs trop larges) —
     quand assez de candidats tiennent déjà, les replis attendent (ils coûtent autant qu'un candidat chacun) */
  const largeursDeRepli = nc => nc <= 8 ? Array.from({ length: nc - 2 }, (_, i) => i + 2) : [...new Set([2, 3, 4, 5].map(k => Math.ceil(nc / k)))].filter(W => W >= 2);
  if (candidats.filter(c => c.j.tient).length < finalistes) candidats.filter(c => !c.j.tient && c.L.geom.nCols >= 4).sort((a, b) => bat(a.j, b.j, true) ? -1 : 1).slice(0, 2)
    .forEach(c => largeursDeRepli(c.L.geom.nCols).forEach(W => essayer(c.E.col, { ...opt, serpentin: W })));
  /* chaque finaliste a sa recherche locale ; le MEILLEUR seul reçoit la passe finale, sur la géométrie resserrée (le
     routeur n'y prend pas les mêmes décisions), avec le budget de tous : c'est elle qui, balayage après balayage jusqu'à
     convergence, trouve les gestes évidents que le banc vérifie — la donner à un finaliste qui perd, c'est la perdre */
  const principal = Math.floor(budget / finalistes), finale = Math.min(1200, Math.max(150, budget));
  const affiner = c => rechercheLocale(M, c, principal);
  const finir = c => etirerAuFormat(M, rechercheLocale(M, resserrer(M, c), finale, true));
  let meilleur = null; const tetes = classer(true).slice(0, finalistes);
  // le hub au centre commence mal ordonné (ses fils de retour traversent tout) : le meilleur de ses variantes est finaliste
  // d'office s'il tient sur la feuille — à la place du dernier finaliste, ou en plus quand il n'y en a qu'un
  const centre = candidats.filter(c => c.centre && c.j.tient).sort((a, b) => bat(a.j, b.j, true) ? -1 : 1)[0];
  if (centre && !tetes.includes(centre)) { if (tetes.length >= Math.max(2, finalistes)) tetes.pop(); tetes.push(centre); }
  // les finalistes se comparent sur la géométrie qu'on dessinera : resserrée, étirée au format — sinon un dessin replié
  // (étroit) bat un dessin en paysage qui ne « tient » pas encore parce que ses goulottes sont taillées large
  const finaliste = c => etirerAuFormat(M, resserrer(M, affiner(c)));
  tetes.forEach(c => { const r = finaliste(c); if (!meilleur || bat(r.j, meilleur.j)) meilleur = r; });
  const nc = meilleur.L.geom.nCols;
  if (!meilleur.j.tient && nc >= 4) { const col = meilleur.E.col, avant = candidats.length;
    largeursDeRepli(nc).forEach(W => essayer(col, { ...opt, serpentin: W }));
    const replies = candidats.slice(avant).sort((a, b) => bat(a.j, b.j) ? -1 : 1).slice(0, 1);
    replies.forEach(c => { const r = finaliste(c); if (bat(r.j, meilleur.j)) meilleur = r; }); }
  return finir(meilleur);
}
/* Le CONCOURS. Le budget se compte en unités de routage : le même contrat
   donne le même dessin partout — un contrat de vingt blocs en moins de deux
   secondes, un folio de trente en moins de cinq. */
function meilleurPlacement(liaisons) {
  const G = construireGraphe(liaisons); if (!G.ids.length) return null;
  const M = modele(G); const nB = M.ids.length;
  const budget = nB <= 20 ? 1200 : nB <= 40 ? 600 : nB <= 80 ? 400 : 300;
  const meilleur = concours(M, {}, budget);
  return { ...meilleur.L, routage: meilleur.R, jugement: { ...meilleur.j, muets: meilleur.j.muets, scindes: meilleur.E.scindes || [] } };
}
