/* ===========================================================================
   05 — LE ROUTAGE
   Les blocs sont posés ; il reste à tracer les fils. Un fil dont les deux
   bornes sont à la même ordonnée et dont le couloir est libre part tout
   droit. Les autres passent par les GOULOTTES verticales entre colonnes, sur
   des pistes ordonnées pour ne pas se croiser entre elles. Quand plusieurs
   fils partent d'une même borne, ils se répartissent le long d'une BARRETTE
   (trait vertical au ras de la borne) : un piquage par destinataire.
   =========================================================================== */
'use strict';

function router(layout) {
  const g = layout.geom, N = layout.links.length;
  const fils = new Array(N);
  if (!N) return { fils: [], points: [], barrettes: [], piquages: [] };
  const goulotteX = i => i === 0 ? (g.colX.length ? g.colX[0] - g.chW[0] : 70) : g.colX[i - 1] + g.colW[i - 1];
  const allouer = (pistes, lo, hi) => { if (lo > hi) { const t = lo; lo = hi; hi = t; }
    for (let t = 0; t < pistes.length; t++) { if (!pistes[t].some(([a, b]) => !(hi < a - 7 || lo > b + 7))) { pistes[t].push([lo, hi]); return t; } }
    pistes.push([[lo, hi]]); return pistes.length - 1; };
  const autoHaut = [], autoBas = []; const yTraverse = new Map();
  const blocs = layout.comps;
  const couloirLibre = (xa, xb, y) => { if (xa > xb) { const t = xa; xa = xb; xb = t; }
    return !blocs.some(c => xb > c.x + 1 && xa < c.x + c.w - 1 && y > c.y - 4 && y < c.y + c.h + 4); };

  // ---- 0) barrettes ------------------------------------------------------
  const boutAjuste = new Map(); const barrettes = []; const piquages = [];
  { const groupes = new Map();
    layout.links.forEach((l, li) => { if (l.shunt) return; [['A', l.epA, l.epB], ['B', l.epB, l.epA]].forEach(([tag, ep, autre]) => {
      const k = Math.round(ep.x) + ',' + Math.round(ep.y) + ',' + ep.stub;
      (groupes.get(k) || groupes.set(k, []).get(k)).push({ li, tag, ep, autre }); }); });
    const raccords = [];
    const cheminLibre = (ox, oy, tx, propre) => { const xa = Math.min(ox, tx), xb = Math.max(ox, tx);
      return !blocs.some(c => c !== propre && xb > c.x + 1 && xa < c.x + c.w - 1 && oy > c.y + 1 && oy < c.y + c.h - 1); };
    groupes.forEach(tous => { if (tous.length < 2) return;
      const px = tous[0].ep.x;
      const propre = blocs.find(c => tous[0].ep.y >= c.y - 1 && tous[0].ep.y <= c.y + c.h + 1 && (Math.abs(px - c.x) < 2 || Math.abs(px - (c.x + c.w)) < 2));
      const arr = tous.filter(u => cheminLibre(u.autre.x, u.autre.y, px, propre));
      if (arr.length < 2) return;
      const py = arr[0].ep.y;
      const bus = arr.length >= 4;
      arr.sort((u, v) => u.autre.y - v.autre.y);
      const dir = (arr.reduce((s, u) => s + u.autre.x, 0) / arr.length) >= px ? 1 : -1;
      let lo = Math.min(py, arr[0].autre.y), hi = Math.max(py, arr[arr.length - 1].autre.y);
      // la barre se pose dans la goulotte, jamais dans un bloc
      let offMax = 44;
      blocs.forEach(c => { if (c === propre) return;
        if (c.y + c.h > lo - 6 && c.y < hi + 6) {
          if (dir > 0 && c.x >= px) offMax = Math.max(2, Math.min(offMax, c.x - px - 6));
          if (dir < 0 && c.x + c.w <= px) offMax = Math.max(2, Math.min(offMax, px - (c.x + c.w) - 6)); } });
      // abscisse : celle qui coupe le moins de fils droits ; à égalité la plus
      // proche de la borne, et jamais sur la voie d'une barre voisine
      const coupe = x => { let n = 0;
        layout.links.forEach(l => { const a = l.epA, b = l.epB;
          if (Math.abs(a.y - b.y) > 0.6 || a.y < lo - 2 || a.y > hi + 2) return;
          const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
          if (x > x0 + 1 && x < x1 - 1) n++; });
        return n; };
      const VOIE = 20, PROX = 26;
      const genant = x => barrettes.filter(B => Math.abs(B.x - x) < VOIE - 2 && Math.max(B.y1, lo) - Math.min(B.y2, hi) <= PROX).length;
      let bx = px + dir * Math.min(14, offMax), bn = Infinity;
      const pas = (offMax >= 14 + VOIE) ? VOIE : 4;
      for (let o = Math.min(14, offMax); o <= offMax; o += pas) {
        const x = px + dir * o, n = coupe(x) + 120 * genant(x) + o * 0.01;
        if (n < bn) { bn = n; bx = x; } }
      blocs.forEach(c => { if (c === propre) return;
        if (bx > c.x - 6 && bx < c.x + c.w + 6) {
          if (c.y + c.h <= py && c.y + c.h + 8 > lo) lo = c.y + c.h + 8;
          if (c.y >= py && c.y - 8 < hi) hi = c.y - 8; } });
      const ys = arr.map(u => Math.max(lo, Math.min(hi, u.autre.y)));
      for (let i = 1; i < ys.length; i++) if (ys[i] < ys[i - 1] + 5) ys[i] = ys[i - 1] + 5;
      for (let i = ys.length - 2; i >= 0; i--) if (ys[i] > ys[i + 1] - 5) ys[i] = ys[i + 1] - 5;
      // ne se raccordent à la barre que les fils qui en sortent parfaitement droits
      const gardes = [];
      arr.forEach((u, i) => { if (Math.abs(ys[i] - u.autre.y) > 0.6) return;
        if (!cheminLibre(u.autre.x, ys[i], bx, propre)) return;
        gardes.push({ u, y: ys[i] }); });
      if (gardes.length < 2) return;
      const pts = [];
      gardes.forEach(k => { boutAjuste.set(k.u.li + ':' + k.u.tag, { ...k.u.ep, x: bx, y: k.y });
        if (Math.abs(k.y - py) < 1.2) return;
        const d = { x: bx, y: k.y }; piquages.push(d); pts.push(d); });
      const raccord = { x0: px, x1: bx, y: py }; raccords.push(raccord);
      barrettes.push({ x: bx, y1: Math.min(py, gardes[0].y) - 3, y2: Math.max(py, gardes[gardes.length - 1].y) + 3,
                       bus, py, gardes, pts, raccord, dir, px }); });
    // deux barrettes voisines ne se superposent pas : on écarte de proche en
    // proche, chacune emmenant ses piquages (nombre de coups borné)
    const VOIE = 20, PROX = 26;
    const bouge = (A, nx) => { A.x = nx;
      A.gardes.forEach(kp => { const e = boutAjuste.get(kp.u.li + ':' + kp.u.tag); if (e) e.x = nx; });
      A.pts.forEach(d => d.x = nx); if (A.raccord) A.raccord.x1 = nx; };
    for (let i = 0; i < barrettes.length; i++) { let coups = 0;
      for (let k = 0; k < i; k++) { const A = barrettes[i], B = barrettes[k];
        if (Math.abs(A.x - B.x) >= VOIE - 2) continue;
        if (Math.max(A.y1, B.y1) - Math.min(A.y2, B.y2) > PROX) continue;
        const sg = (Math.abs(A.x - B.x) < 0.5) ? (A.dir || 1) : (A.x > B.x ? 1 : -1), nx = B.x + sg * VOIE;
        if (blocs.some(c => nx > c.x - 4 && nx < c.x + c.w + 4 && A.y2 > c.y - 4 && A.y1 < c.y + c.h + 4)) continue;
        bouge(A, nx); if (++coups >= 8) break; k = -1; } }
    barrettes.raccords = raccords;
  }
  const EA = li => boutAjuste.get(li + ':A') || layout.links[li].epA;
  const EB = li => boutAjuste.get(li + ':B') || layout.links[li].epB;

  // ---- 1) un travail par goulotte ---------------------------------------
  const travaux = Array.from({ length: g.nCols + 1 }, () => []);
  const couloirsPris = [];
  let margeD = -1e18, margeG = 1e18;
  blocs.forEach(c => { margeD = Math.max(margeD, c.x + c.w); margeG = Math.min(margeG, c.x); });
  const pistesD = [], pistesG = [];
  const croisementsEstimes = (ch, lo, hi) => { let n = 0; const xa = goulotteX(ch), xb = xa + g.chW[ch];
    for (let k = 0; k < N; k++) { const l = layout.links[k]; const P = l.epA, Q = l.epB;
      if (Math.abs(P.y - Q.y) > 0.75) continue; const y = P.y; if (y <= lo + 1 || y >= hi - 1) continue;
      if (Math.max(P.x, Q.x) > xb - 1 && Math.min(P.x, Q.x) < xa + 1) n++; } return n; };
  const parMarge = new Map();
  const sortie = (P, s, mx, eviterY) => {
    const x0 = s === 'R' ? goulotteX(P.ch) + 2 : mx, x1 = s === 'R' ? mx : goulotteX(P.ch) + g.chW[P.ch] - 2;
    for (let d = 0; d <= 400; d += 16) for (const sg of (d ? [1, -1] : [1])) { const y = P.y + sg * d;
      if (eviterY != null && Math.abs(y - eviterY) < 8) continue;
      if (!couloirLibre(x0, x1, y)) continue;
      if (couloirsPris.some(m => Math.abs(m.y - y) < 8 && x1 > m.xa - 7 && x0 < m.xb + 7)) continue;
      return y; }
    return null; };
  /* Une longue verticale en pleine goulotte tranche tous les fils droits
     qu'elle enjambe : si elle en coûterait beaucoup, elle passe par la marge
     extérieure, où elle ne croise rien. */
  const parLaMarge = (li, A, B) => {
    const portee = Math.abs(A.y - B.y); if (portee < 300) return false;
    const lo = Math.min(A.y, B.y), hi = Math.max(A.y, B.y);
    const ce = croisementsEstimes(A.ch, lo, hi); if (ce < 8) return false;
    const dR = margeD - Math.max(A.x, B.x), dL = Math.min(A.x, B.x) - margeG;
    for (const s of (dR <= dL ? ['R', 'L'] : ['L', 'R'])) {
      const base = s === 'R' ? margeD + 26 : margeG - 26;
      const det = s === 'R' ? (base - A.x) + (base - B.x) : (A.x - base) + (B.x - base);
      if (det > Math.max(2.2 * portee, 300 * ce)) continue;
      const yA2 = sortie(A, s, base, null); if (yA2 == null) continue;
      const yB2 = sortie(B, s, base, yA2); if (yB2 == null) continue;
      const ceLoc = croisementsEstimes(A.ch, Math.min(A.y, yA2), Math.max(A.y, yA2)) + croisementsEstimes(B.ch, Math.min(B.y, yB2), Math.max(B.y, yB2));
      if (ceLoc > ce - 3) continue;
      const t = allouer(s === 'R' ? pistesD : pistesG, Math.min(yA2, yB2), Math.max(yA2, yB2));
      const mx = s === 'R' ? base + t * 10 : base - t * 10;
      couloirsPris.push({ y: yA2, xa: s === 'R' ? goulotteX(A.ch) + 2 : mx, xb: s === 'R' ? mx : goulotteX(A.ch) + g.chW[A.ch] - 2 });
      couloirsPris.push({ y: yB2, xa: s === 'R' ? goulotteX(B.ch) + 2 : mx, xb: s === 'R' ? mx : goulotteX(B.ch) + g.chW[B.ch] - 2 });
      parMarge.set(li, { mx, yA2, yB2 });
      travaux[A.ch].push({ li, part: 1, eps: [{ y: A.y, s: A.stub }, { y: yA2, s }] });
      travaux[B.ch].push({ li, part: 2, eps: [{ y: yB2, s }, { y: B.y, s: B.stub }] });
      return true; }
    return false; };
  for (let li = 0; li < N; li++) { const l = layout.links[li];
    if (l.boucle) continue;                     // une borne reliée à elle-même ne se dessine pas
    // un shunt ne se trace pas : le dessin le pose en pont dans la réglette
    if (l.shunt) { fils[li] = { ...l, pts: [] }; continue; }
    let A = EA(li), B = EB(li);
    if (A.ch > B.ch) { const t = A; A = B; B = t; }
    if (A.ch === B.ch) {
      if (A.stub !== B.stub && Math.abs(A.y - B.y) < 0.75) {
        const P = EA(li), Q = EB(li);
        fils[li] = { ...l, pts: [{ x: P.x, y: P.y }, { x: Q.x, y: Q.y }] };
      } else if (!parLaMarge(li, A, B)) travaux[A.ch].push({ li, part: 0, eps: [{ y: A.y, s: A.stub }, { y: B.y, s: B.stub }] });
    } else if (A.stub === 'R' && B.stub === 'L' && Math.abs(A.y - B.y) < 0.75 && couloirLibre(A.x + 2, B.x - 2, A.y)) {
      fils[li] = { ...l, pts: [{ x: A.x, y: A.y }, { x: B.x, y: B.y }] };       // tout droit
      if (l.epA.ch > l.epB.ch) fils[li].pts.reverse();
    } else if (A.stub === 'R' && couloirLibre(A.x + 2, goulotteX(B.ch) + g.chW[B.ch] - 2, A.y)) {
      travaux[B.ch].push({ li, part: 3, eps: [{ y: A.y, s: 'L' }, { y: B.y, s: B.stub }] });   // droit puis descente à l'arrivée
    } else if (B.stub === 'L' && couloirLibre(goulotteX(A.ch) + 2, B.x - 2, B.y)) {
      travaux[A.ch].push({ li, part: 4, eps: [{ y: A.y, s: A.stub }, { y: B.y, s: 'R' }] });   // coude au départ puis droit
    } else {
      // un couloir intermédiaire libre entre les deux bornes : petit Z local ;
      // le grand détour par-dessus tout le dessin n'est que le dernier recours
      const xa = goulotteX(A.ch) + 2, xb = goulotteX(B.ch) + g.chW[B.ch] - 2;
      const lo = Math.min(A.y, B.y), hi = Math.max(A.y, B.y);
      let mid = null;
      if (hi - lo > 18) {
        const cand = []; for (let t = 1; t <= 24; t++) cand.push(lo + (hi - lo) * t / 25);
        cand.sort((u, v) => Math.abs(u - (lo + hi) / 2) - Math.abs(v - (lo + hi) / 2));
        for (const y of cand) { if (!couloirLibre(xa, xb, y)) continue;
          if (couloirsPris.some(m => Math.abs(m.y - y) < 8 && xb > m.xa - 7 && xa < m.xb + 7)) continue;
          mid = y; break; } }
      if (mid != null) { couloirsPris.push({ y: mid, xa, xb }); yTraverse.set(li, mid);
        travaux[A.ch].push({ li, part: 1, eps: [{ y: A.y, s: A.stub }, { y: mid, s: 'R' }] });
        travaux[B.ch].push({ li, part: 2, eps: [{ y: mid, s: 'L' }, { y: B.y, s: B.stub }] });
      } else if (!parLaMarge(li, A, B)) {
        const haut = g.yMin, bas = g.yMax;
        const parLeHaut = (A.y - haut) + (B.y - haut) <= (bas - A.y) + (bas - B.y);
        const th = allouer(parLeHaut ? autoHaut : autoBas, goulotteX(A.ch), goulotteX(B.ch) + g.chW[B.ch]);
        const hy = parLeHaut ? (haut - 30 - th * 9) : (bas + 30 + th * 9);
        yTraverse.set(li, hy);
        travaux[A.ch].push({ li, part: 1, eps: [{ y: A.y, s: A.stub }, { y: hy, s: 'R' }] });
        travaux[B.ch].push({ li, part: 2, eps: [{ y: hy, s: 'L' }, { y: B.y, s: B.stub }] });
      }
    }
  }

  // ---- 2) ordre des pistes dans chaque goulotte (tri topologique) --------
  const pisteX = Array.from({ length: g.nCols + 1 }, () => new Map());
  for (let ch = 0; ch <= g.nCols; ch++) {
    const jobs = travaux[ch]; if (!jobs.length) continue;
    const specs = jobs.map(j => ({ V: [Math.min(j.eps[0].y, j.eps[1].y), Math.max(j.eps[0].y, j.eps[1].y)], ep: j.eps }));
    const n = jobs.length;
    const lt = Array.from({ length: n }, () => new Set());
    const dansV = (y, V) => y > V[0] + 0.5 && y < V[1] - 0.5;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (i === j) continue;
      specs[j].ep.forEach(e => { if (dansV(e.y, specs[i].V)) { if (e.s === 'L') lt[j].add(i); else lt[i].add(j); } }); }
    for (let a = 0; a < n; a++) for (const b of [...lt[a]]) { if (lt[b].has(a)) { lt[a].delete(b); lt[b].delete(a); } }
    const indeg = new Array(n).fill(0);
    for (let a = 0; a < n; a++) for (const b of lt[a]) indeg[b]++;
    const fait = new Array(n).fill(false); const ordre = [];
    let prets = []; for (let i = 0; i < n; i++) if (!indeg[i]) prets.push(i);
    while (ordre.length < n) {
      if (!prets.length) { let best = -1, bi = 1e9; for (let i = 0; i < n; i++) if (!fait[i] && indeg[i] < bi) { bi = indeg[i]; best = i; } prets.push(best); }
      prets.sort((x, y) => specs[x].V[0] - specs[y].V[0]);
      const u = prets.shift(); if (fait[u]) continue; fait[u] = true; ordre.push(u);
      for (const v of lt[u]) { if (!fait[v] && --indeg[v] === 0) prets.push(v); }
    }
    const x0 = goulotteX(ch) + 14, xMax = goulotteX(ch) + g.chW[ch] - 6;
    const pastilles = (g.pastilles || []).filter(pl => pl.ch === ch);
    ordre.forEach((jobIdx, rang) => { const j = jobs[jobIdx];
      let x = x0 + rang * 9; const V = specs[jobIdx].V;
      if (pastilles.some(pl => !(V[1] < pl.y1 - 2 || V[0] > pl.y2 + 2))) { const nx = x + 44; if (nx < xMax) x = nx; }
      // une piste ne se pose pas sur une barrette
      for (let garde = 0; garde < 10; garde++) {
        const hit = barrettes.find(b => Math.abs(b.x - x) < 8 && !(V[1] < b.y1 - 2 || V[0] > b.y2 + 2));
        if (!hit) break; const nx = hit.x + 9; if (nx >= xMax) break; x = nx; }
      pisteX[ch].set(j.li + ':' + j.part, x); });
  }

  // ---- 3) tracer --------------------------------------------------------
  for (let li = 0; li < N; li++) { if (fils[li]) continue; const l = layout.links[li];
    if (l.boucle) continue;
    let A = EA(li), B = EB(li), inverse = false;
    if (A.ch > B.ch) { const t = A; A = B; B = t; inverse = true; }
    let pts;
    if (parMarge.has(li)) { const R = parMarge.get(li);
      const tx1 = pisteX[A.ch].get(li + ':1'), tx2 = pisteX[B.ch].get(li + ':2');
      pts = [{ x: A.x, y: A.y }, { x: tx1, y: A.y }, { x: tx1, y: R.yA2 }, { x: R.mx, y: R.yA2 },
             { x: R.mx, y: R.yB2 }, { x: tx2, y: R.yB2 }, { x: tx2, y: B.y }, { x: B.x, y: B.y }]
        .filter((p, i, a) => !i || Math.abs(p.x - a[i - 1].x) > 0.01 || Math.abs(p.y - a[i - 1].y) > 0.01);
    } else if (A.ch === B.ch) { const tx = pisteX[A.ch].get(li + ':0');
      pts = [{ x: A.x, y: A.y }, { x: tx, y: A.y }, { x: tx, y: B.y }, { x: B.x, y: B.y }];
    } else if (pisteX[B.ch].has(li + ':3')) { const tx = pisteX[B.ch].get(li + ':3');
      pts = [{ x: A.x, y: A.y }, { x: tx, y: A.y }, { x: tx, y: B.y }, { x: B.x, y: B.y }];
    } else if (pisteX[A.ch].has(li + ':4')) { const tx = pisteX[A.ch].get(li + ':4');
      pts = [{ x: A.x, y: A.y }, { x: tx, y: A.y }, { x: tx, y: B.y }, { x: B.x, y: B.y }];
    } else { const hy = yTraverse.get(li);
      const tx1 = pisteX[A.ch].get(li + ':1'), tx2 = pisteX[B.ch].get(li + ':2');
      pts = [{ x: A.x, y: A.y }, { x: tx1, y: A.y }, { x: tx1, y: hy }, { x: tx2, y: hy }, { x: tx2, y: B.y }, { x: B.x, y: B.y }]; }
    if (inverse) pts.reverse();
    fils[li] = { ...l, pts };
  }

  // jonctions : deux fils qui aboutissent au même point
  const cnt = new Map();
  fils.forEach(w => { if (!w || w.shunt) return; [w.pts[0], w.pts[w.pts.length - 1]].forEach(p => {
    const k = Math.round(p.x) + ',' + Math.round(p.y); cnt.set(k, (cnt.get(k) || 0) + 1); }); });
  const points = []; for (const [k, c] of cnt) { if (c > 1) { const [x, y] = k.split(',').map(Number); points.push({ x, y }); } }
  return { fils: fils.filter(Boolean), points, barrettes, piquages };
}

/* ---- mesures partagées par le concours de placement et les contrôles ----
   Un shunt n'est ni droit ni plié : il ne compte pas. Une barrette qui
   tranche un fil est un croisement comme un autre, l'œil ne fait pas la
   différence. */
const compterDroits = fils => fils.filter(w => w.pts.length === 2).length;
function compterCroisements(fils, barrettes) {
  const segs = []; fils.forEach((w, wi) => { for (let i = 0; i < w.pts.length - 1; i++)
    segs.push({ x1: w.pts[i].x, y1: w.pts[i].y, x2: w.pts[i + 1].x, y2: w.pts[i + 1].y, wi }); });
  (barrettes || []).forEach((b, bi) => segs.push({ x1: b.x, y1: b.y1, x2: b.x, y2: b.y2, wi: 'barrette' + bi }));
  let c = 0;
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    const a = segs[i], b = segs[j]; if (a.wi === b.wi) continue;
    const ah = Math.abs(a.y1 - a.y2) < .01, bh = Math.abs(b.y1 - b.y2) < .01;
    if (ah === bh) continue;
    const h = ah ? a : b, v = ah ? b : a;
    const hx0 = Math.min(h.x1, h.x2) + 1, hx1 = Math.max(h.x1, h.x2) - 1;
    const vy0 = Math.min(v.y1, v.y2) + 1, vy1 = Math.max(v.y1, v.y2) - 1;
    if (v.x1 > hx0 && v.x1 < hx1 && h.y1 > vy0 && h.y1 < vy1) c++; }
  return c;
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
           croisements: compterCroisements(fils, dessin.barrettes), filsDansBloc, blocsChevauches, blocs: blocs.length, details: coupables };
}
