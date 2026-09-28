/* ===========================================================================
   05 — LE ROUTAGE
   Les blocs sont posés ; il reste à tracer les fils. Un fil dont les deux
   bornes sont à la même ordonnée et dont le couloir est libre part tout
   droit. Les autres passent par les GOULOTTES verticales entre colonnes :
   chaque fil y reçoit une VERTICALE (un « travail »), reliée aux parois par
   ses horizontales. Dans une goulotte, seul l'ORDRE des verticales décide
   des croisements entre elles : c'est un problème d'ordre linéaire, résolu
   exactement (petites goulottes) ou par recherche locale.
   Plusieurs fils sur une même borne, du même côté, partagent une verticale
   courte au ras de la borne — le PIQUAGE — d'où chaque fil repart droit.
   Le piquage est une verticale comme les autres pour l'ordre des pistes.

   Contrat de sortie, lu par le dessin :
     fils[].pts          le tracé complet, de borne à borne
     barrettes[]         les piquages { x, y1, y2, py, gardes:[{y}], bus }
     barrettes.raccords  le trait de la borne au piquage { x0, x1, y }
     piquages[]          les points de départ sur les piquages
     points[]            les jonctions : un fil qui quitte le fil d'un autre
   =========================================================================== */
'use strict';

const PISTE = 9;            // entre deux verticales voisines d'une goulotte
const RETRAIT = 14;         // de la paroi à la première verticale : la longueur d'un raccord
const ECART_VERT = 10;      // deux verticales sur la même piste se lisent séparées
const NMAX_EXACT = 12;      // au-delà, l'ordre des pistes se cherche par déplacements
const INTERDIT = 1e6;       // le coût d'un ordre impossible

/* Un tracé ne repasse pas sur ses pas : les points doublés et les
   allers-retours sur une même ligne (a → b → c avec b au-delà de a et c)
   disparaissent, le segment reste. Un point aligné entre deux autres reste :
   il marque une jonction. */
function simplifier(pts) {
  const out = [];
  pts.forEach(q => { const a = out[out.length - 2], b = out[out.length - 1];
    if (b && Math.abs(b.x - q.x) < 0.3 && Math.abs(b.y - q.y) < 0.3) return;
    if (a && b) { const horiz = Math.abs(a.y - b.y) < 0.3 && Math.abs(b.y - q.y) < 0.3, vert = Math.abs(a.x - b.x) < 0.3 && Math.abs(b.x - q.x) < 0.3;
      if (horiz && (b.x - a.x) * (q.x - b.x) < 0) { out.pop(); if (Math.abs(a.x - q.x) < 0.3) return; }
      else if (vert && (b.y - a.y) * (q.y - b.y) < 0) { out.pop(); if (Math.abs(a.y - q.y) < 0.3) return; } }
    out.push(q); });
  return out;
}

/* ---- la géométrie des goulottes ---------------------------------------- */
function goulottes(layout) {
  const g = layout.geom, blocs = layout.comps;
  const x0 = ch => ch === 0 ? (g.colX.length ? g.colX[0] - g.chW[0] : 70) : g.colX[ch - 1] + g.colW[ch - 1];
  const x1 = ch => x0(ch) + g.chW[ch];
  // un segment horizontal passe s'il ne traverse aucun bloc étranger
  const couloirLibre = (xa, xb, y, exclus) => { if (xa > xb) { const t = xa; xa = xb; xb = t; }
    return !blocs.some(c => !exclus.has(c.name) && xb > c.x + 1 && xa < c.x + c.w - 1 && y > c.y - 3 && y < c.y + c.h + 3); };
  // un segment vertical passe s'il ne traverse aucun bloc étranger
  const verticaleLibre = (x, ya, yb, exclus) => { if (ya > yb) { const t = ya; ya = yb; yb = t; }
    return !blocs.some(c => !exclus.has(c.name) && x > c.x - 3 && x < c.x + c.w + 3 && yb > c.y + 1 && ya < c.y + c.h - 1); };
  // les blocs qui vivent DANS une goulotte (pastilles collées à un flanc)
  const dedans = ch => blocs.filter(c => c.x + c.w > x0(ch) + 2 && c.x < x1(ch) - 2);
  return { n: g.nCols + 1, x0, x1, couloirLibre, verticaleLibre, dedans, yMin: g.yMin, yMax: g.yMax };
}

/* ---- la forme de chaque fil ---------------------------------------------
   Un fil est repéré par ses deux bouts A et B ; `ch` est la goulotte où le
   bout regarde, `mur` la paroi de cette goulotte où il est ('L' : paroi
   gauche, la borne est sur le flanc droit d'un bloc). Chaque forme se
   décrit par des TRAVAUX : une verticale par goulotte traversée, avec ses
   deux attaches { y, mur } aux parois — `paire` les garde pour le tracé,
   `att` sont celles qui comptent pour les croisements. */
const murDe = ep => ep.stub === 'L' ? 'L' : 'R';
const cle = (li, tag) => li + ':' + tag;
const travail = (ch, a0, a1, blocs) => ({ ch, att: [a0, a1], paire: [a0, a1], blocs, contraintes: [] });

function formerLesFils(layout, G, permis) {
  const fils = new Map();                     // li -> { forme, A, B, travaux, chez }
  const candidats = [];                       // fils qu'un détour par une goulotte voisine pourrait soulager
  const barrieres = Array.from({ length: G.n }, () => []);   // horizontales de paroi à paroi, par goulotte
  const couloirsPris = [];                    // corridors à travers une colonne : { y, xa, xb }
  const pris = (xa, xb, y) => couloirsPris.some(m => Math.abs(m.y - y) < 8 && xb > m.xa - 7 && xa < m.xb + 7);
  const prendre = (xa, xb, y) => couloirsPris.push({ y, xa, xb });
  const exclusDe = l => new Set([String(l.de), String(l.vers)]);
  const bouts = li => { const l = layout.links[li]; let A = { ...l.epA, tag: 'A' }, B = { ...l.epB, tag: 'B' };
    if (A.ch > B.ch || (A.ch === B.ch && murDe(A) === 'R' && murDe(B) === 'L')) { const t = A; A = B; B = t; }
    return [A, B]; };
  // 1) les fils droits, d'abord : ce sont les barrières de tout le reste
  layout.links.forEach((l, li) => { if (l.boucle || l.shunt) return;
    const [A, B] = bouts(li); if (Math.abs(A.y - B.y) > 0.75) return;
    const dr = murDe(A) === 'L' && murDe(B) === 'R';                       // A regarde à droite, B à gauche
    if (!dr || !G.couloirLibre(A.x + 2, B.x - 2, A.y, exclusDe(l))) return;
    fils.set(li, { forme: 'droit', A, B, travaux: [], chez: {} });
    for (let ch = A.ch; ch <= B.ch; ch++) barrieres[ch].push(A.y);
    if (A.ch < B.ch) prendre(G.x1(A.ch), G.x0(B.ch), A.y); });
  // combien de barrières une verticale de la goulotte `ch` enjambe entre deux ordonnées (barrières triées, dichotomie)
  barrieres.forEach(B => B.sort((u, v) => u - v));
  const avant = (B, v) => { let a = 0, b = B.length; while (a < b) { const m = (a + b) >> 1; if (B[m] < v) a = m + 1; else b = m; } return a; };
  const coupe = (ch, ya, yb) => { const B = barrieres[ch], lo = Math.min(ya, yb), hi = Math.max(ya, yb); return Math.max(0, avant(B, hi - 0.5) - avant(B, lo + 0.5 + 1e-9)); };
  // 2) les autres, par la forme qui croise le moins de barrières
  layout.links.forEach((l, li) => { if (l.boucle || l.shunt || fils.has(li)) return;
    const [A, B] = bouts(li), K = { G, coupe, pris, ex: exclusDe(l), li, A, B, mA: murDe(A), mB: murDe(B) };
    const choix = formesDirectes(K);
    /* un passage par une goulotte voisine ne se cherche que si le direct
       coûte ; il n'est pris que s'il est PERMIS — le routeur l'essaie pour de
       vrai, car l'estimation ne voit que les fils droits */
    if (!choix.length || choix[0].cout >= 4) { const detours = formesParDetour(K).sort((u, v) => u.cout - v.cout);
      if (detours.length && (!choix.length || detours[0].cout <= choix[0].cout - 2)) {
        if (permis.has(li)) choix.push(detours[0]); else candidats.push({ li, gain: (choix.length ? choix[0].cout : 20) - detours[0].cout }); } }
    choix.sort((u, v) => u.cout - v.cout);
    const f = choix[0] || { forme: 'detour', travaux: [travail(A.ch, K.attache(A, K.mA), K.libre(null, 'R'), K.ex), travail(B.ch, K.libre(null, 'L'), K.attache(B, K.mB), K.ex)] };
    (f.corridors || []).forEach(([xa, xb, y]) => prendre(xa, xb, y));
    fils.set(li, { forme: f.forme, A, B, chez: {}, travaux: f.travaux, y: f.y }); });
  fils.candidats = candidats.sort((u, v) => v.gain - u.gain).map(c => c.li);
  return fils;
}
/* Les formes DIRECTES d'un fil plié : dans sa goulotte (même goulotte),
   droit puis verticale à l'arrivée, verticale au départ puis droit, ou un
   corridor entre les deux avec un Z dans chaque goulotte. Le coût d'une forme
   est le nombre de fils droits que ses verticales enjambent. */
function formesDirectes(K) {
  const { G, coupe, pris, ex, li, A, B, mA, mB } = K;
  K.attache = (ep, mur) => ({ y: ep.y, mur, bout: cle(li, ep.tag) });
  K.libre = (y, mur) => ({ y, mur, bout: null });
  const att = K.attache, libre = K.libre, choix = [];
  if (A.ch === B.ch) return [{ forme: 'meme', cout: coupe(A.ch, A.y, B.y), travaux: [travail(A.ch, att(A, mA), att(B, mB), ex)] }];
  if (mA === 'L' && G.couloirLibre(A.x + 2, G.x0(B.ch) + 2, A.y, ex) && !pris(G.x1(A.ch), G.x0(B.ch), A.y))
    choix.push({ forme: 'arrivee', cout: coupe(B.ch, A.y, B.y), corridors: [[G.x1(A.ch), G.x0(B.ch), A.y]], travaux: [travail(B.ch, { y: A.y, mur: 'L', bout: cle(li, A.tag) }, att(B, mB), ex)] });
  if (mB === 'R' && G.couloirLibre(G.x1(A.ch) - 2, B.x - 2, B.y, ex) && !pris(G.x1(A.ch), G.x0(B.ch), B.y))
    choix.push({ forme: 'depart', cout: coupe(A.ch, A.y, B.y), corridors: [[G.x1(A.ch), G.x0(B.ch), B.y]], travaux: [travail(A.ch, att(A, mA), { y: B.y, mur: 'R', bout: cle(li, B.tag) }, ex)] });
  // le corridor traverse des colonnes entières, celles des deux blocs comprises : rien n'en est exclu
  const lo = Math.min(A.y, B.y), hi = Math.max(A.y, B.y), rien = new Set(); let meilleur = null;
  for (let y = Math.max(G.yMin - 12, lo - 240); y <= Math.min(G.yMax + 12, hi + 240); y += 4) {
    const c = coupe(A.ch, A.y, y) + coupe(B.ch, y, B.y) + 0.5 + 0.0005 * Math.abs(y - (lo + hi) / 2) + (y < lo || y > hi ? 0.4 : 0);
    if (meilleur && c >= meilleur.cout) continue;
    if (!G.couloirLibre(G.x0(A.ch) + 2, G.x1(B.ch) - 2, y, rien) || pris(G.x1(A.ch), G.x0(B.ch), y)) continue;
    meilleur = { forme: 'couloir', cout: c, y }; }
  if (meilleur) choix.push({ ...meilleur, corridors: [[G.x1(A.ch), G.x0(B.ch), meilleur.y]], travaux: [travail(A.ch, att(A, mA), libre(meilleur.y, 'R'), ex), travail(B.ch, libre(meilleur.y, 'L'), att(B, mB), ex)] });
  return choix.sort((u, v) => u.cout - v.cout);
}
/* Les formes PAR DÉTOUR : le fil sort de sa goulotte par un corridor, descend
   une goulotte voisine (à gauche ou à droite, une ou deux colonnes plus
   loin) et revient par un second corridor. Ça vaut quand la goulotte du fil
   est barrée de fils droits que la voisine n'a pas. */
function formesParDetour(K) {
  const { G, coupe, pris, ex, A, B, mA, mB } = K, att = K.attache, libre = K.libre, choix = [];
  const PORTEE = 160, PAS = 8, rien = new Set();      // un corridor traverse des colonnes entières, celle du bloc du fil comprise
  const corridorsPres = (ch0, ch1, y0) => { const out = [], xa = Math.min(G.x0(ch0), G.x0(ch1)) + 2, xb = Math.max(G.x1(ch0), G.x1(ch1)) - 2;
    const xc = Math.min(G.x1(ch0), G.x1(ch1)), xd = Math.max(G.x0(ch0), G.x0(ch1));
    for (let y = Math.max(G.yMin - 12, y0 - PORTEE); y <= Math.min(G.yMax + 12, y0 + PORTEE); y += PAS)
      if (G.couloirLibre(xa, xb, y, rien) && !pris(xc, xd, y)) out.push(y);
    return out; };
  [-1, -2, 1, 2].forEach(d => { const v = d < 0 ? A.ch + d : B.ch + d; if (v < 0 || v >= G.n) return;
    const gauche = d < 0, c1s = corridorsPres(A.ch, v, A.y), c2s = corridorsPres(v, B.ch, B.y);
    if (!c1s.length || !c2s.length) return;
    let meilleur = null;
    c1s.forEach(c1 => c2s.forEach(c2 => { if (Math.abs(c1 - c2) < 8) return;
      const c = coupe(A.ch, A.y, c1) + coupe(v, c1, c2) + coupe(B.ch, c2, B.y) + 1.5 + 0.5 * (Math.abs(d) - 1) + 0.0005 * (Math.abs(c1 - A.y) + Math.abs(c2 - B.y));
      if (!meilleur || c < meilleur.cout) meilleur = { cout: c, c1, c2 }; }));
    if (!meilleur) return; const { c1, c2 } = meilleur;
    const sortie = gauche ? 'L' : 'R', paroi = gauche ? 'R' : 'L';       // par où le fil quitte sa goulotte, et où il s'accroche dans la voisine
    const xc1 = [Math.min(G.x1(A.ch), G.x1(v)), Math.max(G.x0(A.ch), G.x0(v)), c1], xc2 = [Math.min(G.x1(v), G.x1(B.ch)), Math.max(G.x0(v), G.x0(B.ch)), c2];
    choix.push({ forme: 'voisine', cout: meilleur.cout, corridors: [xc1, xc2],
      travaux: [travail(A.ch, att(A, mA), libre(c1, sortie), ex), travail(v, libre(c1, paroi), libre(c2, paroi), ex), travail(B.ch, libre(c2, sortie === 'L' ? 'L' : 'R'), att(B, mB), ex)] }); });
  return choix;
}

/* Les DÉTOURS : un fil qui ne trouve aucun corridor passe au-dessus (ou
   au-dessous) de tout le dessin, sur un niveau à lui ; les portées courtes
   passent au plus près, les longues par-dessus, pour ne pas se croiser. */
function poserLesDetours(fils, G) {
  const dets = [...fils.values()].filter(f => f.forme === 'detour');
  const parLeHaut = f => (f.A.y - G.yMin) + (f.B.y - G.yMin) <= (G.yMax - f.A.y) + (G.yMax - f.B.y);
  const niveaux = { haut: [], bas: [] };
  dets.map(f => ({ f, xa: G.x0(f.A.ch), xb: G.x1(f.B.ch) })).sort((u, v) => (u.xb - u.xa) - (v.xb - v.xa)).forEach(({ f, xa, xb }) => {
    const cote = parLeHaut(f) ? 'haut' : 'bas', N = niveaux[cote]; let t = 0;
    while (N[t] && N[t].some(([a, b]) => !(xb < a - 7 || xa > b + 7))) t++;
    (N[t] || (N[t] = [])).push([xa, xb]);
    f.y = cote === 'haut' ? G.yMin - 30 - t * PISTE : G.yMax + 30 + t * PISTE;
    f.travaux.forEach(t2 => t2.paire.forEach(a => { if (a.y == null) a.y = f.y; })); });
}

/* ---- les piquages ---------------------------------------------------------
   Plusieurs fils sur une même borne, du même côté : une verticale au ras de
   la borne (à RETRAIT de la paroi), d'où chaque fil repart droit vers sa
   destination quand rien ne l'en empêche. Un fil qui ne peut pas repartir
   droit du piquage garde sa propre verticale, entre la borne et le piquage ;
   un fil droit passe par la jonction sans s'arrêter.
   Les horizontales qui partent d'une même borne se superposent : une seule
   compte dans le modèle des croisements, celle du PORTEUR — le piquage, ou
   à défaut la verticale la plus longue — et les autres verticales de la
   borne restent entre la paroi et lui. */
function formerLesPiquages(layout, fils, G) {
  const groupes = new Map();
  fils.forEach((f, li) => [f.A, f.B].forEach(ep => { const k = Math.round(ep.x) + ',' + Math.round(ep.y) + ',' + ep.stub;
    (groupes.get(k) || groupes.set(k, []).get(k)).push({ li, tag: ep.tag, ep }); }));
  const piquages = [];
  groupes.forEach((entrees, k) => { if (entrees.length < 2) return;
    const ep = entrees[0].ep, mur = murDe(ep), ch = ep.ch, bx = mur === 'L' ? G.x0(ch) + RETRAIT : G.x1(ch) - RETRAIT;
    const l0 = layout.links[entrees[0].li], propre = String(entrees[0].tag === 'A' ? l0.de : l0.vers);
    const b = { borne: k, ch, mur, x: bx, px: ep.x, py: ep.y, dir: mur === 'L' ? 1 : -1, departs: [], gardes: [], n: entrees.length, propre };
    const travaux = [];                    // les verticales de la borne, avec leur attache à la borne
    let barriere = false;                  // un fil passe droit : son horizontale couvre toutes les autres
    entrees.forEach(e => { const f = fils.get(e.li), l = layout.links[e.li], ex = new Set([String(l.de), String(l.vers)]);
      const bout = cle(e.li, e.tag);
      const tv = f.travaux.find(t => t.ch === ch && t.paire.some(a => a.bout === bout));
      if (!tv || tv.piquage) { barriere = barriere || !tv; f.chez[e.tag] = b; return; }
      const ici = tv.paire.find(a => a.bout === bout), autre = tv.paire.find(a => a.bout !== bout); ici.borne = k;
      const murX = autre.mur === 'L' ? G.x0(ch) + 2 : G.x1(ch) - 2;
      if (G.verticaleLibre(bx, ep.y, autre.y, ex) && G.couloirLibre(bx, murX, autre.y, ex)) {
        tv.piquage = b; tv.att = [autre]; autre.li = e.li; b.departs.push(autre); return; }
      f.chez[e.tag] = b; travaux.push({ tv, ici }); });
    const longueur = t => Math.abs(t.tv.paire[1].y - t.tv.paire[0].y);
    const porteur = b.departs.length ? b : (travaux.length ? travaux.reduce((m, t) => longueur(t) > longueur(m) ? t : m).tv : null);
    if (b.departs.length) { piquages.push(b); b.sansRaccord = barriere; }
    else entrees.forEach(e => { if (fils.get(e.li).chez[e.tag] === b) delete fils.get(e.li).chez[e.tag]; });   // sans départ, pas de piquage
    travaux.forEach(({ tv, ici }) => { if (tv === porteur && !barriere) return;
      tv.att = tv.att.filter(a => a !== ici);
      if (porteur && tv !== porteur) tv.contraintes.push({ porteur, mur, borne: k }); }); });
  return piquages;
}

/* ---- l'ordre des verticales d'une goulotte ----------------------------------
   Deux verticales i et j se croisent selon leur ordre seulement : une attache
   de j vers la paroi gauche traverse i si i est à gauche de j et si l'attache
   passe dans la hauteur de i. Le coût d'un ordre est la somme de ces paires.
   Une attache qui arrive sur son propre piquage n'est pas un croisement :
   c'est la jonction. Une verticale qui doit rester entre sa borne et le
   porteur de la borne le paie très cher si elle passe de l'autre côté. */
function coutsParPaires(travaux) {
  const n = travaux.length, c = Array.from({ length: n }, () => new Float64Array(n));
  const idx = new Map(travaux.map((t, i) => [t, i]));
  const dans = (y, t) => y > t.lo + 0.5 && y < t.hi - 0.5;
  const jonction = (t, a) => !!t.piquage && a.borne != null && t.piquage.borne === a.borne;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (i === j) continue;
    let v = 0; const I = travaux[i], J = travaux[j];
    J.att.forEach(a => { if (a.mur === 'L' && dans(a.y, I) && !jonction(I, a)) v++; });
    I.att.forEach(a => { if (a.mur === 'R' && dans(a.y, J) && !jonction(J, a)) v++; });
    c[i][j] = v + (i > j ? 1e-4 : 0); }           // à égalité, l'ordre naturel (par ordonnée) reste
  travaux.forEach((t, i) => t.contraintes.forEach(ct => { const P = ct.porteur.travail || ct.porteur, p = idx.get(P); if (p == null || p === i) return;
    if (ct.mur === 'L') c[p][i] = INTERDIT; else c[i][p] = INTERDIT; }));
  return c;
}
function coutDeLOrdre(ordre, c) { let s = 0; for (let a = 0; a < ordre.length; a++) for (let b = a + 1; b < ordre.length; b++) s += c[ordre[a]][ordre[b]]; return s; }
/* Exact : programmation dynamique sur les sous-ensembles — le dernier posé
   ne coûte que contre ceux déjà posés. */
function ordreExact(n, c) {
  const N = 1 << n, dp = new Float64Array(N).fill(Infinity), dernier = new Int8Array(N).fill(-1);
  dp[0] = 0;
  for (let S = 1; S < N; S++) for (let j = 0; j < n; j++) { if (!(S & (1 << j))) continue;
    const T = S ^ (1 << j); let v = dp[T]; for (let i = 0; i < n; i++) if (T & (1 << i)) v += c[i][j];
    if (v < dp[S]) { dp[S] = v; dernier[S] = j; } }
  const ordre = []; for (let S = N - 1; S; ) { const j = dernier[S]; ordre.push(j); S ^= 1 << j; }
  return ordre.reverse();
}
/* Au-delà : ordre naturel, puis chaque verticale essaie toutes les autres
   places tant qu'un déplacement gagne. */
function ordreParDeplacements(n, c) {
  const ordre = Array.from({ length: n }, (_, i) => i);
  for (let passe = 0; passe < 30; passe++) { let gagne = false;
    for (let p = 0; p < n; p++) { const e = ordre[p]; let bestQ = p, bestD = -1e-9, d = 0;
      for (let q = p + 1; q < n; q++) { d += c[ordre[q]][e] - c[e][ordre[q]]; if (d < bestD) { bestD = d; bestQ = q; } }
      d = 0; for (let q = p - 1; q >= 0; q--) { d += c[e][ordre[q]] - c[ordre[q]][e]; if (d < bestD) { bestD = d; bestQ = q; } }
      if (bestQ !== p) { ordre.splice(p, 1); ordre.splice(bestQ, 0, e); gagne = true; } }
    if (!gagne) break; }
  return ordre;
}
function ordonner(travaux) {
  const n = travaux.length; if (n <= 1) return travaux.map((_, i) => i);
  const c = coutsParPaires(travaux);
  return n <= NMAX_EXACT ? ordreExact(n, c) : ordreParDeplacements(n, c);
}

/* ---- les pistes : une abscisse par verticale --------------------------------
   L'ordre est acquis ; deux verticales qui se chevauchent en hauteur gardent
   PISTE entre elles, dans cet ordre. Chacune tire vers la paroi qu'elle
   dessert (un piquage au ras de sa borne, un Z contre la paroi gauche), sans
   jamais passer sous une pastille posée dans la goulotte. */
function poserLesPistes(travaux, ordre, ch, G) {
  const xL = G.x0(ch), xR = G.x1(ch), tags = G.dedans(ch);
  const chevauche = (u, v) => u.hi + ECART_VERT > v.lo && v.hi + ECART_VERT > u.lo;
  const bornesDe = t => { let lb = xL + RETRAIT, ub = xR - RETRAIT;
    tags.forEach(c => { if (t.blocs.has(c.name) || c.y - 2 > t.hi || c.y + c.h + 2 < t.lo) return;
      if (c.x - xL < xR - (c.x + c.w)) lb = Math.max(lb, c.x + c.w + 4); else ub = Math.min(ub, c.x - 4); });
    return { lb, ub }; };
  const L = ordre.map(i => travaux[i]); L.forEach(t => { const b = bornesDe(t); t.lb = b.lb; t.ub = b.ub; });
  // la profondeur : le plus long enchaînement de verticales qui se chevauchent ;
  // une goulotte trop étroite pour lui resserre son pas plutôt que de déborder
  const rang = new Array(L.length).fill(0); let profondeur = 1;
  L.forEach((t, a) => { for (let b = 0; b < a; b++) if (chevauche(t, L[b])) rang[a] = Math.max(rang[a], rang[b] + 1); profondeur = Math.max(profondeur, rang[a] + 1); });
  const pas = Math.max(4, Math.min(PISTE, (xR - xL - 2 * RETRAIT) / Math.max(1, profondeur - 1)));
  // de droite à gauche : chacune laisse la place à celles qui la suivent
  for (let a = L.length - 1; a >= 0; a--) for (let b = a + 1; b < L.length; b++) if (chevauche(L[a], L[b])) L[a].ub = Math.min(L[a].ub, L[b].ub - pas);
  // de gauche à droite : chacune se pose après celles qui la précèdent, au plus près de son vœu
  L.forEach((t, a) => { let lb = t.lb;
    for (let b = 0; b < a; b++) if (chevauche(L[a], L[b])) lb = Math.max(lb, L[b].x + pas);
    const veut = t.piquage ? (t.piquage.mur === 'L' ? xL + RETRAIT : xR - RETRAIT) : (t.att.length && t.att.every(a2 => a2.mur === 'R') ? xR - RETRAIT : lb);
    t.x = Math.max(lb, Math.min(t.ub, veut)); if (t.piquage) t.piquage.x = t.x; });
}

/* ---- le tracé ------------------------------------------------------------
   De A à B : la borne, puis pour chaque goulotte la verticale (celle du fil
   ou celle du piquage) entre ses deux attaches, puis l'autre borne. Le
   piquage trace lui-même son raccord et sa verticale, une seule fois : un
   fil qui en part commence à son point de départ, un fil qui passe devant
   commence à la jonction, et un fil qui quitte l'horizontale d'un autre fil
   de sa borne commence là où il la quitte. Un fil qui emprunte la verticale
   d'un piquage est marqué `parPiquage` : il n'est pas droit. */
function tracerLesFils(layout, fils, piquages) {
  const out = new Array(layout.links.length);
  const garde = (b, y) => { if (!b.gardes.some(g => Math.abs(g.y - y) < 0.6)) b.gardes.push({ y }); };
  const cleDe = ep => Math.round(ep.x) + ',' + Math.round(ep.y) + ',' + ep.stub;
  // combien de points ôter à un bout, et si le fil passe par la verticale du piquage
  const bout = (f, ep, tv, tag) => { const b = f.chez[tag], k = cleDe(ep);
    if (tv && tv.piquage && tv.piquage.borne === k) return { ote: 2, plie: Math.abs(tv.att[0].y - ep.y) > 0.6 };   // part du piquage
    const saVerticale = tv && !tv.piquage && tv.ch === ep.ch && tv.paire.some(a => a.bout === cle(f.li, tag));
    if (b && !saVerticale) { garde(b, ep.y); return { ote: 1, jonction: { x: b.x, y: ep.y } }; }                 // passe par la jonction
    if (b || (tv && tv.contraintes.some(c => c.borne === k))) return { ote: 1 };                                 // naît sur l'horizontale du porteur
    return { ote: 0 }; };
  layout.links.forEach((l, li) => { if (l.boucle) return;
    if (l.shunt) { out[li] = { ...l, pts: [] }; return; }
    const f = fils.get(li); f.li = li; let pts = [{ x: f.A.x, y: f.A.y }];
    f.travaux.forEach(t => { const x = t.piquage ? t.piquage.x : t.x; pts.push({ x, y: t.paire[0].y }, { x, y: t.paire[1].y }); });
    pts.push({ x: f.B.x, y: f.B.y });
    const dA = bout(f, f.A, f.travaux[0], 'A'), dB = bout(f, f.B, f.travaux[f.travaux.length - 1], 'B');
    pts = pts.slice(dA.ote, pts.length - dB.ote);
    if (dA.jonction) pts.unshift(dA.jonction); if (dB.jonction) pts.push(dB.jonction);
    const trace = simplifier(pts); if (f.A.tag === 'B') trace.reverse();
    out[li] = { ...l, pts: trace, parPiquage: !!(dA.plie || dB.plie) }; });
  return out;
}
/* Les JONCTIONS : un bout de fil qui n'est ni une borne ni sur un piquage
   est posé sur le fil d'un autre — un point le dit. */
function jonctions(layout, traces, barrettes) {
  const points = new Map();
  traces.forEach(w => { if (!w || !w.pts.length) return;
    [w.pts[0], w.pts[w.pts.length - 1]].forEach(p => {
      if ([w.epA, w.epB].some(ep => Math.abs(ep.x - p.x) < 0.5 && Math.abs(ep.y - p.y) < 0.5)) return;
      if (barrettes.some(b => Math.abs(b.x - p.x) < 0.5 && p.y > b.y1 - 0.5 && p.y < b.y2 + 0.5)) return;
      points.set(Math.round(p.x) + ',' + Math.round(p.y), { x: p.x, y: p.y }); }); });
  return [...points.values()];
}

/* Le routage entier, puis chaque fil candidat à un détour par une goulotte
   voisine est essayé pour de vrai : le détour, plus long à lire, ne reste
   que s'il ôte au moins deux croisements au dessin entier. */
function router(layout) {
  if (!layout.links.length) return { fils: [], points: [], barrettes: [], piquages: [] };
  const permis = new Set();
  let meilleur = routerUneFois(layout, permis);
  for (const li of meilleur.candidats.slice(0, 4)) { permis.add(li);
    const essai = routerUneFois(layout, permis);
    if (essai.croisements <= meilleur.croisements - 2) meilleur = essai; else permis.delete(li); }
  return meilleur.resultat;
}
function routerUneFois(layout, permis) {
  const G = goulottes(layout);
  const fils = formerLesFils(layout, G, permis);
  poserLesDetours(fils, G);
  const piquages = formerLesPiquages(layout, fils, G);
  // les verticales de chaque goulotte : celles des fils, celles des piquages
  const parGoulotte = Array.from({ length: G.n }, () => []);
  const etendue = t => { const ys = t.paire.map(a => a.y); t.lo = Math.min(...ys); t.hi = Math.max(...ys); return t; };
  fils.forEach(f => f.travaux.forEach(t => { if (!t.piquage) parGoulotte[t.ch].push(etendue(t)); }));
  piquages.forEach(b => { const raccord = { y: b.py, mur: b.mur, borne: b.borne, bout: null };
    const t = { ch: b.ch, piquage: b, att: b.sansRaccord ? b.departs.slice() : [raccord, ...b.departs], paire: [raccord, ...b.departs], blocs: new Set([b.propre]), contraintes: [] };
    b.travail = etendue(t); parGoulotte[b.ch].push(t); });
  parGoulotte.forEach((T, ch) => { if (!T.length) return;
    T.sort((u, v) => (u.lo - v.lo) || (u.hi - v.hi));
    poserLesPistes(T, ordonner(T), ch, G); });
  const traces = tracerLesFils(layout, fils, piquages);
  const barrettes = piquages.map(b => { const ys = [b.py, ...b.departs.map(d => d.y)], lo = Math.min(...ys), hi = Math.max(...ys);
    return { x: b.x, y1: lo - 3, y2: hi + 3, py: b.py, gardes: [...b.departs.map(d => ({ y: d.y })), ...b.gardes], bus: b.n >= 4, dir: b.dir, px: b.px,
             pts: b.departs.filter(d => Math.abs(d.y - b.py) > 1.2).map(d => ({ x: b.x, y: d.y })), raccord: { x0: b.px, x1: b.x, y: b.py } }; });
  barrettes.raccords = barrettes.map(b => b.raccord);
  const resultat = { fils: traces.filter(Boolean), points: jonctions(layout, traces, barrettes), barrettes, piquages: barrettes.flatMap(b => b.pts) };
  return { resultat, candidats: fils.candidats, croisements: compterCroisements(resultat.fils.filter(w => !w.shunt), barrettes) };
}

/* ---- mesures partagées par le concours de placement et les contrôles ----
   Un fil est DROIT s'il est un seul segment horizontal, de borne à borne :
   un fil qui passe par un raccord et la verticale d'un piquage ne l'est pas
   (le routeur le marque `parPiquage`). Un shunt n'est ni droit ni plié : il
   ne compte pas. */
const compterDroits = fils => fils.filter(w => w.pts.length >= 2 && !w.parPiquage && w.pts.every(p => Math.abs(p.y - w.pts[0].y) < 0.01)).length;
/* Les segments du dessin, fusionnés : deux fils qui se superposent (les
   fils d'une même borne) font UN trait, et un croisement se compte une fois
   par trait. Les piquages y sont, verticales et raccords. */
function segmentsFusionnes(fils, barrettes) {
  const H = new Map(), V = new Map();
  const poser = (M, k, a, b) => (M.get(k) || M.set(k, []).get(k)).push([Math.min(a, b), Math.max(a, b)]);
  fils.forEach(w => { for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1];
    if (Math.abs(a.y - b.y) < .01) poser(H, Math.round(a.y * 10), a.x, b.x); else if (Math.abs(a.x - b.x) < .01) poser(V, Math.round(a.x * 10), a.y, b.y); } });
  (barrettes || []).forEach(b => poser(V, Math.round(b.x * 10), b.y1 + 3, b.y2 - 3));
  ((barrettes && barrettes.raccords) || []).forEach(r => poser(H, Math.round(r.y * 10), r.x0, r.x1));
  const fondre = M => { const out = []; M.forEach((segs, k) => { segs.sort((u, v) => u[0] - v[0]); let cur = null;
    segs.forEach(s => { if (cur && s[0] <= cur[1] + 0.01) cur[1] = Math.max(cur[1], s[1]); else out.push(cur = [s[0], s[1], k / 10]); }); }); return out; };
  return { H: fondre(H).map(([x0, x1, y]) => ({ x0, x1, y })), V: fondre(V).map(([y0, y1, x]) => ({ y0, y1, x })) };
}
/* Seuls un horizontal et un vertical peuvent se croiser ; toucher en bout
   n'est pas croiser. */
function compterCroisements(fils, barrettes) {
  const { H, V } = segmentsFusionnes(fils, barrettes); let c = 0;
  for (const h of H) for (const v of V) if (v.x > h.x0 + 0.5 && v.x < h.x1 - 0.5 && h.y > v.y0 + 0.5 && h.y < v.y1 - 0.5) c++;
  return c;
}
/* Un segment de fil qui passe dans un bloc : le premier invariant sacré. */
function filsDansBlocs(fils, comps) {
  let n = 0;
  fils.forEach(w => { for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1];
    const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
    for (const c of comps) { if (x1 > c.x + 2 && x0 < c.x + c.w - 2 && y1 > c.y + 2 && y0 < c.y + c.h - 2) { n++; break; } } } });
  return n;
}
/* Les deux invariants sacrés : aucun fil à travers un bloc étranger, aucun
   chevauchement. Un dessin qui les viole est FAUX, quel que soit son score. */
function auditer(dessin) {
  const blocs = dessin.comps.filter(c => c.kind !== 'tag'), fils = dessin.fils.filter(w => !w.shunt);
  let filsDansBloc = 0; const coupables = [];
  fils.forEach(w => { const siens = new Set([String(w.de), String(w.vers)]);
    for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1];
      const xa = Math.min(a.x, b.x), xb = Math.max(a.x, b.x), ya = Math.min(a.y, b.y), yb = Math.max(a.y, b.y);
      const horizontal = Math.abs(a.y - b.y) < 0.01;
      blocs.forEach(c => { if (siens.has(String(c.name))) return;
        const dedans = horizontal ? (a.y > c.y + 1 && a.y < c.y + c.h - 1 && xa < c.x + c.w - 2 && xb > c.x + 2)
                                  : (a.x > c.x + 1 && a.x < c.x + c.w - 1 && ya < c.y + c.h - 2 && yb > c.y + 2);
        if (dedans) { filsDansBloc++; if (coupables.length < 5) coupables.push(w.de + ':' + w.borneDe + '→' + w.vers + ':' + w.borneVers + ' traverse ' + c.name); } }); } });
  let blocsChevauches = 0;
  for (let i = 0; i < blocs.length; i++) for (let j = i + 1; j < blocs.length; j++) { const a = blocs[i], b = blocs[j];
    if (a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1) blocsChevauches++; }
  const droits = compterDroits(fils);
  return { ok: filsDansBloc === 0 && blocsChevauches === 0, fils: fils.length, droits,
           tauxDroits: fils.length ? +(droits / fils.length).toFixed(3) : 1,
           croisements: compterCroisements(fils, dessin.barrettes), filsDansBloc, blocsChevauches, blocs: blocs.length, details: coupables,
           evitables: croisementsEvitables(dessin, { fils, barrettes: dessin.barrettes }) };
}

/* ---- les croisements ÉVITABLES ---------------------------------------------
   À placement fixé et formes fixées, un croisement est évitable si un autre
   ordre des verticales de sa goulotte le supprime sans en créer. On relit
   les verticales dans les TRACÉS (pas dans le routeur), avec leurs attaches
   aux parois, et on compare le coût de l'ordre dessiné au meilleur ordre.
   Les attaches superposées d'une même borne comptent une fois, par la
   verticale la plus loin de la paroi ; les autres restent entre les deux. */
function croisementsEvitables(layout, R) {
  const G = goulottes(layout); let total = 0;
  const barrettes = R.barrettes || [];
  for (let ch = 0; ch < G.n; ch++) { const xL = G.x0(ch), xR = G.x1(ch), T = [];
    // la verticale en x qui couvre [lo, hi] ; deux verticales sur une même piste, l'une au-dessus de l'autre, restent deux
    const travailEn = (x, lo, hi) => { let t = T.find(u => Math.abs(u.x - x) < 0.5 && hi >= u.lo - 0.5 && lo <= u.hi + 0.5);
      if (!t) { t = { x, lo, hi, att: [], contraintes: [], piquage: null }; T.push(t); }
      t.lo = Math.min(t.lo, lo); t.hi = Math.max(t.hi, hi); return t; };
    // une horizontale qui part du point s vers q : une attache de la verticale en s
    const attacher = (t, q, s) => { if (!q || Math.abs(q.y - s.y) > 0.01 || Math.abs(q.x - s.x) < 0.5) return;
      const mur = q.x < s.x ? 'L' : 'R', auMur = mur === 'L' ? q.x <= xL + 1 : q.x >= xR - 1;
      if (!t.att.some(o => o.mur === mur && Math.abs(o.y - s.y) < 0.3)) t.att.push({ y: s.y, mur, jonctionX: auMur ? null : q.x }); };
    const dedans = x => x > xL + 1 && x < xR - 1;
    barrettes.forEach(b => { if (!dedans(b.x)) return; const t = travailEn(b.x, b.y1 + 3, b.y2 - 3); t.piquage = b;
      attacher(t, { x: b.raccord.x0, y: b.py }, { x: b.x, y: b.py }); });
    R.fils.forEach(w => { const p = w.pts; if (!p.length) return;
      for (let i = 0; i + 1 < p.length; i++) { const a = p[i], b = p[i + 1];
        if (Math.abs(a.x - b.x) > 0.01 || Math.abs(a.y - b.y) < 0.5 || !dedans(a.x)) continue;
        const t = travailEn(a.x, Math.min(a.y, b.y), Math.max(a.y, b.y));
        attacher(t, p[i - 1], a); attacher(t, p[i + 2], b); }
      // un fil qui part d'un piquage : son horizontale est une attache du piquage
      [[p[0], p[1]], [p[p.length - 1], p[p.length - 2]]].forEach(([s, q]) => { const b = barrettes.find(b => Math.abs(b.x - s.x) < 0.5 && s.y > b.y1 - 0.5 && s.y < b.y2 + 0.5);
        if (b && dedans(b.x)) attacher(travailEn(b.x, s.y, s.y), q, s); }); });
    // une verticale qui naît sur le raccord d'un piquage reste entre la borne et lui
    T.forEach(t => { if (t.piquage) return; barrettes.forEach(b => { if (!dedans(b.x)) return; const r = b.raccord;
      if (Math.abs(t.lo - b.py) > 0.3 && Math.abs(t.hi - b.py) > 0.3) return;
      if (t.x > Math.min(r.x0, r.x1) - 0.5 && t.x < Math.max(r.x0, r.x1) + 0.5) t.contraintes.push({ porteur: travailEn(b.x, b.py, b.py), mur: r.x0 < r.x1 ? 'L' : 'R' }); }); });
    T.sort((u, v) => u.x - v.x); if (T.length < 2) continue;
    // par paroi et ordonnée, une seule attache compte : celle de la verticale la plus loin de la paroi
    const parBorne = new Map();
    T.forEach(t => t.att.forEach(a => { if (a.jonctionX != null) return; const k = a.mur + ':' + Math.round(a.y * 2);
      (parBorne.get(k) || parBorne.set(k, []).get(k)).push({ t, a }); }));
    parBorne.forEach(L => { if (L.length < 2) return; const loin = L.reduce((m, e) => (e.a.mur === 'L' ? e.t.x > m.t.x : e.t.x < m.t.x) ? e : m);
      L.forEach(e => { if (e === loin) return; e.t.att = e.t.att.filter(a => a !== e.a); e.t.contraintes.push({ porteur: loin.t, mur: e.a.mur }); }); });
    const c = coutsParPaires(T);
    // une attache qui s'arrête sur une autre verticale (jonction) ne la croise pas
    T.forEach((t, j) => t.att.forEach(a => { if (a.jonctionX == null) return; const i = T.findIndex(u => Math.abs(u.x - a.jonctionX) < 0.5); if (i < 0) return;
      if (a.y > T[i].lo + 0.5 && a.y < T[i].hi - 0.5) { if (a.mur === 'L') c[i][j] -= 1; else c[j][i] -= 1; } }));
    const actuel = coutDeLOrdre(T.map((_, i) => i), c);
    const meilleur = coutDeLOrdre(T.length <= 14 ? ordreExact(T.length, c) : ordreParDeplacements(T.length, c), c);
    total += Math.max(0, Math.round(actuel - meilleur)); }
  return total;
}
