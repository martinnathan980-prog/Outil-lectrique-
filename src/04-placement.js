/* ===========================================================================
   04 — LE PLACEMENT
   Le cœur de l'outil. Les nœuds vont en colonnes (niveaux d'un parcours en
   largeur depuis une graine) ; puis les ordonnées sont choisies pour rendre
   un MAXIMUM de fils parfaitement droits — un fil dont les deux bornes sont à
   la même hauteur. C'est la priorité absolue, tout le reste est du confort.

   `placer` fait UNE mise en page pour une graine donnée. `meilleurPlacement`
   en essaie sept, route chacune pour de vrai, et garde celle qui a le plus de
   fils droits (croisements en départage) ; puis, si le dessin est un ruban,
   le replie en rangées (serpentin).

   Géométrie partagée par les étapes, pour un nœud `id` et une broche `cle` :
     xDe(id)                 abscisse du bloc
     hautDe(id) / basDe(id)  bords haut et bas du bloc
     yBroche(id + SEP + cle) ordonnée de la broche
     listes.get(id)          broches par flanc : {L, R} ou {S} (réglette)
   =========================================================================== */
'use strict';

const PRH = 14, STRIPW = 20, BODYW = 104, BORNW = 40, VGAP = 22, HH = 20, BPAD = 6, HHS = 15;
const MARGE = 70, HAUT_PAGE = MARGE + 120;
const RANGEE_GAP = 130;

function placer(G, options) {
  const { liaisons: lk, ids, noeuds, bouts, nid, partenaires, adj, degreDe } = G;
  const opt = options || {};
  const graine = opt.graine || 0;                 // 0 = plus fort degré, 'loin' = point le plus éloigné, n = décalage
  const SERP = opt.serpentin | 0;                 // largeur de rangée (0 = pas de repli)
  const mediane = a => { a = a.slice().sort((x, y) => x - y); return a[a.length >> 1]; };
  /* Un SHUNT — deux bornes d'un même bornier pontées — n'est pas un fil :
     il ne prend ni goulotte ni ordonnée, le dessin le trace dans la réglette. */
  const shunts = new Set();
  lk.forEach((l, li) => { const A = bouts.get(li + ':A'), B = bouts.get(li + ':B');
    if (A.cle !== B.cle && nid(A.nom, A.cle) === nid(B.nom, B.cle) && estBornier(A.nom)) shunts.add(li); });

  /* ===== 1. NIVEAUX : chaque nœud reçoit sa colonne ======================= */
  const niveau = new Map();
  { const bfs = (s, vus) => { const d = new Map([[s, 0]]); const q = [s]; let loin = s;
      while (q.length) { const c = q.shift();
        [...adj.get(c).keys()].forEach(k => { if (!d.has(k) && !(vus && vus.has(k))) {
          d.set(k, d.get(c) + 1); if (d.get(k) > d.get(loin)) loin = k; q.push(k); } }); }
      return { d, loin }; };
    const graines = [...ids].sort((a, b) => degreDe(b) - degreDe(a));
    const decalage = typeof graine === 'number' ? graine : 0;
    if (decalage > 0 && graines.length > decalage) { const tete = graines.splice(0, decalage); graines.push(...tete); }
    for (const s of graines) { if (niveau.has(s)) continue;
      let depart = s; if (graine === 'loin') depart = bfs(s, niveau).loin;
      for (const [k, v] of bfs(depart, niveau).d) niveau.set(k, v); }
    // raffinement local : un nœud se rapproche de ses voisins si ça coûte moins
    const cout = (n, ln) => { let sc = 0; for (const [k, w] of adj.get(n)) { const dd = Math.abs(ln - niveau.get(k));
      sc += w * (dd === 1 ? 0 : (dd === 0 ? 2 : 1 + dd)); } return sc; };
    for (let passe = 0; passe < 3; passe++) { let bouge = false;
      for (const n of ids) { const l0 = niveau.get(n); let best = l0, bc = cout(n, l0);
        for (const c of [l0 - 1, l0 + 1]) { if (c < 0) continue; const cc = cout(n, c); if (cc < bc - 0.01) { bc = cc; best = c; } }
        if (best !== l0) { niveau.set(n, best); bouge = true; } }
      if (!bouge) break; }
    // une feuille (tous ses voisins dans une même colonne) coûte autant des
    // deux côtés : sur demande, elle va du côté le moins chargé — les colonnes
    // s'équilibrent, mais le flanc opposé du hub peut se charger de fils pliés ;
    // c'est au concours de trancher, pas à cette règle
    const charge = new Map(); const hauteur = n => noeuds.get(n).broches.length * PRH + 60;
    ids.forEach(n => charge.set(niveau.get(n), (charge.get(niveau.get(n)) || 0) + hauteur(n)));
    if (opt.equilibrer) ids.slice().sort((a, b) => hauteur(b) - hauteur(a)).forEach(n => {
      const voisins = [...adj.get(n).keys()]; const autour = [...new Set(voisins.map(k => niveau.get(k)))]; if (autour.length !== 1) return;
      if (voisins.length === 1 && adj.get(voisins[0]).size === 1) return;      // un îlot de deux blocs n'a pas de côté
      const l0 = niveau.get(n), l1 = 2 * autour[0] - l0; if (Math.abs(l1 - l0) !== 2) return;
      if ((charge.get(l1) || 0) + hauteur(n) >= (charge.get(l0) || 0)) return;
      niveau.set(n, l1); charge.set(l0, charge.get(l0) - hauteur(n)); charge.set(l1, (charge.get(l1) || 0) + hauteur(n)); });
    const usuels = [...new Set(ids.map(n => niveau.get(n)))].sort((a, b) => a - b);
    const remap = new Map(usuels.map((l, i) => [l, i]));
    ids.forEach(n => niveau.set(n, remap.get(niveau.get(n))));
  }

  /* ===== 2. VOIES : les composantes indépendantes côte à côte ============ */
  { const comp = new Map(); let nc = 0;
    for (const n of ids) { if (comp.has(n)) continue; const q = [n]; comp.set(n, nc);
      while (q.length) { const u = q.pop(); for (const k of adj.get(u).keys()) if (!comp.has(k)) { comp.set(k, nc); q.push(k); } } nc++; }
    if (nc > 1) {
      const comps = Array.from({ length: nc }, () => ({ ids: [], h: 0, span: 0 }));
      ids.forEach(n => { const c = comps[comp.get(n)]; c.ids.push(n);
        c.h += noeuds.get(n).broches.length * PRH + 60; c.span = Math.max(c.span, niveau.get(n)); });
      const totH = comps.reduce((s, c) => s + c.h, 0);
      const laneW = (Math.max(...comps.map(c => c.span)) + 1) * 260;
      let K = Math.max(1, Math.round(Math.sqrt(1.414 * totH / laneW))); K = Math.min(K, 8, nc);
      if (K > 1) { comps.sort((a, b) => b.h - a.h);
        const voies = Array.from({ length: K }, () => ({ h: 0, span: 0, comps: [] }));
        comps.forEach(c => { const v = voies.reduce((m, l) => l.h < m.h ? l : m, voies[0]); v.comps.push(c); v.h += c.h; v.span = Math.max(v.span, c.span); });
        let off = 0; voies.forEach(v => { if (!v.comps.length) return; v.comps.forEach(c => c.ids.forEach(n => niveau.set(n, niveau.get(n) + off))); off += v.span + 1; }); } } }

  /* ===== 3. SERPENTIN : replier les colonnes en rangées, en boustrophédon = */
  const rangeeDe = new Map(ids.map(n => [n, 0]));
  if (SERP > 0) ids.forEach(n => { const l = niveau.get(n), r = Math.floor(l / SERP), k = l % SERP;
    rangeeDe.set(n, r); niveau.set(n, (r % 2 === 0) ? k : (SERP - 1 - k)); });
  const nRang = SERP > 0 ? 1 + Math.max(0, ...ids.map(n => rangeeDe.get(n))) : 1;

  const nMax = ids.length ? Math.max(...ids.map(n => niveau.get(n))) : 0;
  const colonnes = Array.from({ length: nMax + 1 }, () => []);
  ids.forEach(n => colonnes[niveau.get(n)].push(n));
  const colonneDe = new Map(); colonnes.forEach((c, i) => c.forEach(n => colonneDe.set(n, i)));

  /* ===== 4. GÉOMÉTRIE DES COLONNES : flancs, largeurs, goulottes ========= */
  const flancDe = new Map(), listes = new Map();
  for (const id of ids) { const N = noeuds.get(id);
    if (N.reglette) { listes.set(id, { S: N.broches.slice() }); continue; }
    const L = [], R = []; const cn = colonneDe.get(id) || 0;
    N.broches.forEach(p => { let d = 0, g = 0;
      (partenaires.get(id + SEP + p.cle) || []).forEach(q => { const cq = colonneDe.get(q.id) || 0; if (cq < cn) g++; else d++; });
      const f = (d >= g) ? 'R' : 'L'; flancDe.set(id + SEP + p.cle, f); (f === 'R' ? R : L).push(p); });
    listes.set(id, { L, R }); }
  const clesListes = id => listes.get(id).S ? ['S'] : ['L', 'R'];
  const liste = (id, lid) => listes.get(id)[lid];
  const listeDeBroche = (id, cle) => listes.get(id).S ? 'S' : (flancDe.get(id + SEP + cle) === 'L' ? 'L' : 'R');
  const chaqueBroche = (id, f) => clesListes(id).forEach(lid => liste(id, lid).forEach(p => f(p, lid)));
  const estPastille = id => { const ls = listes.get(id); return !!ls.S && ls.S.length === 1 && estRail(noeuds.get(id).nom); };
  const largeurDe = id => { const ls = listes.get(id);
    if (ls.S) return estPastille(id) ? BORNW : (STRIPW + BODYW + STRIPW);
    if (estMasse(noeuds.get(id).nom)) return 26;      // le symbole de masse tient en 10 unités
    return STRIPW + BODYW + STRIPW; };
  const hauteurEstimee = id => { const ls = listes.get(id);
    const rangs = ls.S ? Math.max(1, ls.S.length) : Math.max(ls.L.length, ls.R.length, 1);
    return Math.max(ls.S ? HH + rangs * PRH + BPAD : 46, rangs * PRH + 26); };
  const nCols = colonnes.length;
  const colW = colonnes.map(c => c.length ? Math.max(...c.map(largeurDe)) : 92);
  const flancDuBout = (nom, cle, autreNom, autreCle) => { const id = nid(nom, cle);
    if (!listes.get(id).S) return flancDe.get(id + SEP + cle);
    return (colonneDe.get(nid(autreNom, autreCle)) || 0) < (colonneDe.get(id) || 0) ? 'L' : 'R'; };
  const goulotteDuBout = (id, flanc) => (colonneDe.get(id) || 0) + (flanc === 'R' ? 1 : 0);
  const chCount = new Array(nCols + 1).fill(0);
  lk.forEach((l, li) => { if (shunts.has(li)) return; const A = bouts.get(li + ':A'), B = bouts.get(li + ':B');
    const cA = goulotteDuBout(nid(A.nom, A.cle), flancDuBout(A.nom, A.cle, B.nom, B.cle));
    const cB = goulotteDuBout(nid(B.nom, B.cle), flancDuBout(B.nom, B.cle, A.nom, A.cle));
    chCount[cA]++; if (cA !== cB) chCount[cB]++; });
  // largeur de goulotte : 9 par fil ; ou celle réellement occupée au tour précédent
  const chW = chCount.map((c, i) => (opt.goulottes && opt.goulottes[i] != null) ? opt.goulottes[i] : Math.max(54, 28 + c * 9));
  const colX = []; let cx = MARGE + chW[0];
  for (let i = 0; i < nCols; i++) { colX.push(cx); cx += colW[i] + chW[i + 1]; }
  const largeurTotale = Math.max(cx, MARGE + 360);

  /* ===== 5. POSITION INITIALE, PUIS ORDONNANCEMENT ÉLASTIQUE ============= */
  // un bloc plus étroit que sa colonne (une masse) se range du côté de ses fils
  const xDe = new Map(); colonnes.forEach((c, i) => c.forEach(id => { const w = largeurDe(id); let g = 0, d = 0;
    if (w < colW[i]) chaqueBroche(id, p => (partenaires.get(id + SEP + p.cle) || []).forEach(q => { const cq = colonneDe.get(q.id) ?? 0; if (cq > i) d++; else if (cq < i) g++; }));
    xDe.set(id, (d && !g) ? colX[i] + colW[i] - w : colX[i]); }));
  const yBroche = new Map(), hautDe = new Map(), basDe = new Map();
  const yB = (id, k) => yBroche.get(id + SEP + k);
  const glisser = (id, dy) => { chaqueBroche(id, p => yBroche.set(id + SEP + p.cle, yB(id, p.cle) + dy));
    hautDe.set(id, hautDe.get(id) + dy); basDe.set(id, basDe.get(id) + dy); };
  const bandeY = [];
  { const colH = colonnes.map(c => c.reduce((s, id) => s + hauteurEstimee(id) + VGAP, -VGAP));
    const maxColH = Math.max(60, ...colH);
    const hR = new Array(nRang).fill(0);
    colonnes.forEach(c => { const s = new Array(nRang).fill(-VGAP); c.forEach(id => { s[rangeeDe.get(id)] += hauteurEstimee(id) + VGAP; });
      for (let r = 0; r < nRang; r++) hR[r] = Math.max(hR[r], Math.max(0, s[r])); });
    let y = HAUT_PAGE; for (let r = 0; r < nRang; r++) { bandeY.push(y); y += hR[r] + RANGEE_GAP; }
    colonnes.forEach((c, i) => { if (SERP > 0) c.sort((a, b) => rangeeDe.get(a) - rangeeDe.get(b));
      const cur = bandeY.slice(); if (SERP <= 0) cur[0] = HAUT_PAGE + (maxColH - colH[i]) / 2;
      c.forEach(id => { const r = rangeeDe.get(id) || 0; const y = cur[r]; hautDe.set(id, y);
        clesListes(id).forEach(lid => liste(id, lid).forEach((p, j) => yBroche.set(id + SEP + p.cle, y + 16 + j * PRH)));
        basDe.set(id, y + hauteurEstimee(id)); cur[r] = y + hauteurEstimee(id) + VGAP; }); }); }

  // les partenaires d'une borne, ceux de ses bornes pontées compris : deux
  // bornes d'un shunt reçoivent le même barycentre et restent voisines
  const partenairesExternes = (id, cle) => { const vus = new Set([cle]), pile = [cle], out = [];
    while (pile.length) { const c = pile.pop(); (partenaires.get(id + SEP + c) || []).forEach(q => {
      if (q.id !== id) out.push(q); else if (!vus.has(q.cle)) { vus.add(q.cle); pile.push(q.cle); } }); }
    return out; };
  const trierBroches = () => { for (const id of ids) clesListes(id).forEach(lid => { const L = liste(id, lid); if (L.length < 2) return;
    const sc = new Map(L.map(p => { const ps = partenairesExternes(id, p.cle);
      if (!ps.length) return [p.cle, yB(id, p.cle)]; let s = 0; ps.forEach(q => s += yB(q.id, q.cle)); return [p.cle, s / ps.length]; }));
    L.sort((a, b) => sc.get(a.cle) - sc.get(b.cle)); }); };
  const trierColonnes = () => colonnes.forEach(c => { if (c.length < 2) return;
    const cle = new Map(c.map(id => { const isS = !!listes.get(id).S; const des = [], tous = [];
      chaqueBroche(id, p => (partenaires.get(id + SEP + p.cle) || []).forEach(q => { if (q.id === id) return;
        const y = yB(q.id, q.cle); tous.push(y); if (isS || !listes.get(q.id).S) des.push(y); }));
      const use = des.length ? des : tous; return [id, use.length ? mediane(use) : hautDe.get(id)]; }));
    c.sort((a, b) => (rangeeDe.get(a) - rangeeDe.get(b)) || (cle.get(a) - cle.get(b))); });
  // pose : les écarts entre broches suivent ceux des partenaires (bornés), la
  // liste est centrée dans le corps, le bloc se translate en face (médiane)
  const elastique = () => { const GAPX = 4 * PRH; colonnes.forEach(c => { let curseur = -Infinity;
    c.forEach(id => { const ls = clesListes(id); const isS = !!listes.get(id).S;
      let aEq = false; chaqueBroche(id, p => (partenaires.get(id + SEP + p.cle) || []).forEach(q => { if (q.id !== id && !listes.get(q.id).S) aEq = true; }));
      const desDe = lid => liste(id, lid).map(p => {
        let ps = (partenaires.get(id + SEP + p.cle) || []).filter(q => q.id !== id && (isS || !aEq || !listes.get(q.id).S));
        const lf = ps.filter(q => (colonneDe.get(q.id) ?? 0) < (colonneDe.get(id) ?? 0)); if (lf.length) ps = lf;
        return ps.length ? mediane(ps.map(q => yB(q.id, q.cle))) : null; });
      const relDe = (lid, des) => { const L = liste(id, lid); const rel = []; let r = 0;
        L.forEach((p, j) => { if (j > 0) { let pas = PRH;
          if (!isS && des[j] != null && des[j - 1] != null) pas = Math.max(PRH, Math.min(des[j] - des[j - 1], PRH + GAPX));
          r += pas; } rel.push(r); });
        return rel; };
      const desL = {}, relL = {}; let maxSpan = 0;
      const spanDe = lid => { const r = relL[lid]; return r && r.length ? Math.max(...r) : 0; };
      ls.forEach(lid => { desL[lid] = desDe(lid); relL[lid] = relDe(lid, desL[lid]); maxSpan = Math.max(maxSpan, spanDe(lid)); });
      const h = isS ? (HHS + maxSpan + PRH + 5) : Math.max(64, maxSpan + 2 * 22);
      const baseL = {}; ls.forEach(lid => { baseL[lid] = isS ? (HHS + PRH / 2) : ((h - spanDe(lid)) / 2); });
      const offs = [];
      ls.forEach(lid => desL[lid].forEach((d, j) => { if (d != null) offs.push(d - (baseL[lid] + relL[lid][j])); }));
      if (!offs.length) ls.forEach(lid => liste(id, lid).forEach((p, j) => (partenaires.get(id + SEP + p.cle) || []).forEach(q => { if (q.id !== id) offs.push(yB(q.id, q.cle) - (baseL[lid] + relL[lid][j])); })));
      let haut = offs.length ? mediane(offs) : hautDe.get(id);
      haut = Math.max(haut, curseur + (isS ? 14 : VGAP), (bandeY[rangeeDe.get(id) || 0] ?? HAUT_PAGE) - 60);
      ls.forEach(lid => liste(id, lid).forEach((p, j) => yBroche.set(id + SEP + p.cle, haut + baseL[lid] + relL[lid][j])));
      hautDe.set(id, haut); basDe.set(id, haut + h); curseur = haut + h; }); }); };
  for (let tour = 0; tour < 4; tour++) { trierBroches(); trierColonnes(); elastique(); }
  trierBroches(); elastique();

  // faisceaux : plusieurs fils entre les mêmes deux blocs gardent le même ordre
  { const faisceaux = new Map();
    lk.forEach((l, li) => { const A = bouts.get(li + ':A'), B = bouts.get(li + ':B');
      const ia = nid(A.nom, A.cle), ib = nid(B.nom, B.cle); if (ia === ib) return;
      let a = { id: ia, cle: A.cle }, b = { id: ib, cle: B.cle };
      const ca = colonneDe.get(ia) ?? 0, cb = colonneDe.get(ib) ?? 0;
      if (ca > cb || (ca === cb && ia > ib)) { const t = a; a = b; b = t; }
      const k = a.id + '|' + b.id + '|' + listeDeBroche(b.id, b.cle);
      (faisceaux.get(k) || faisceaux.set(k, []).get(k)).push({ a, b }); });
    const verrou = new Set();
    [...faisceaux.values()].filter(ws => ws.length > 1).sort((x, y) => y.length - x.length).forEach(ws => {
      const bId = ws[0].b.id; const lid = listeDeBroche(bId, ws[0].b.cle); const L = liste(bId, lid);
      const idx = new Map(L.map((p, i) => [p.cle, i])); const parB = new Map();
      ws.forEach(w => { const e = parB.get(w.b.cle) || { s: 0, c: 0 }; e.s += yB(w.a.id, w.a.cle); e.c++; parB.set(w.b.cle, e); });
      const cles = [...parB.keys()].filter(k => !verrou.has(bId + SEP + k)); if (cles.length < 2) return;
      const places = cles.map(k => idx.get(k)).sort((u, v) => u - v);
      const voulu = [...cles].sort((k1, k2) => (parB.get(k1).s / parB.get(k1).c) - (parB.get(k2).s / parB.get(k2).c));
      const parPlace = new Map(); voulu.forEach((k, i) => { parPlace.set(places[i], k); verrou.add(bId + SEP + k); });
      const autres = L.filter(p => !cles.includes(p.cle)); const nouv = new Array(L.length); let ri = 0;
      for (let i = 0; i < L.length; i++) nouv[i] = parPlace.has(i) ? L.find(pp => pp.cle === parPlace.get(i)) : autres[ri++];
      listes.get(bId)[lid] = nouv.filter(Boolean); }); }

  // micro-alignement : chaque bloc glisse d'un résidu de fil, sans chevaucher
  const polir = () => { for (let passe = 0; passe < 4; passe++) { let bouge = false;
    colonnes.forEach(c => c.forEach((id, k) => { const isS = !!listes.get(id).S; const res = [], tous = [];
      chaqueBroche(id, p => (partenaires.get(id + SEP + p.cle) || []).forEach(q => { if (colonneDe.get(q.id) === colonneDe.get(id)) return;
        const r = yB(q.id, q.cle) - yB(id, p.cle); tous.push(r); if (isS || !listes.get(q.id).S) res.push(r); }));
      if (!res.length) res.push(...tous); if (!res.length) return;
      const h = basDe.get(id) - hautDe.get(id);
      const bas = k > 0 ? basDe.get(c[k - 1]) + 10 : -Infinity, haut = (k < c.length - 1 ? hautDe.get(c[k + 1]) - 10 : Infinity) - h;
      let best = 0, bestN = res.filter(r => Math.abs(r) < 0.6).length;
      [...new Set(res.map(r => Math.round(r * 2) / 2))].forEach(s => { if (s === 0 || Math.abs(s) > 3 * PRH) return;
        const t = hautDe.get(id) + s; if (t < bas - 0.01 || t > haut + 0.01) return;
        const n = res.filter(r => Math.abs(r - s) < 0.6).length;
        if (n > bestN || (n === bestN && n > 0 && Math.abs(s) < Math.abs(best) && best !== 0)) { best = s; bestN = n; } });
      if (best !== 0) { glisser(id, best); bouge = true; } }));
    if (!bouge) break; } };
  const scoreDroits = () => { let n = 0; lk.forEach((l, li) => { const A = bouts.get(li + ':A'), B = bouts.get(li + ':B');
    const ia = nid(A.nom, A.cle), ib = nid(B.nom, B.cle); if (ia === ib) return;
    if (Math.abs(yB(ia, A.cle) - yB(ib, B.cle)) < 0.6) n += (!listes.get(ia).S && !listes.get(ib).S) ? 3 : 1; }); return n; };
  const photo = () => ({ p: new Map(yBroche), t: new Map(hautDe), b: new Map(basDe), o: colonnes.map(c => c.slice()) });
  const revenir = st => { yBroche.clear(); st.p.forEach((v, k) => yBroche.set(k, v)); hautDe.clear(); st.t.forEach((v, k) => hautDe.set(k, v));
    basDe.clear(); st.b.forEach((v, k) => basDe.set(k, v)); st.o.forEach((c, i) => colonnes[i] = c); };
  { let bestScore = -1, bestSnap = null;
    for (let r = 0; r < 4; r++) { trierColonnes(); elastique(); polir(); const sc = scoreDroits();
      if (sc > bestScore) { bestScore = sc; bestSnap = photo(); } }
    if (bestSnap) revenir(bestSnap); }
  // recherche locale : échanges de voisins de colonne, gardés s'ils gagnent
  if (ids.length <= 60) { let cur = scoreDroits();
    for (let passe = 0; passe < 2; passe++) { let mieux = false;
      for (const c of colonnes) for (let i = 0; i + 1 < c.length; i++) {
        if (rangeeDe.get(c[i]) !== rangeeDe.get(c[i + 1])) continue;
        const st = photo(); const t = c[i]; c[i] = c[i + 1]; c[i + 1] = t;
        elastique(); polir(); const sc = scoreDroits();
        if (sc > cur) { cur = sc; mieux = true; } else revenir(st); }
      if (!mieux) break; } }
  // sauvetage : un bloc sans aucun fil en face rejoint sa cible si un trou l'accueille
  colonnes.forEach(c => c.forEach(id => { const isS = !!listes.get(id).S; const res = [], tous = [];
    chaqueBroche(id, p => (partenaires.get(id + SEP + p.cle) || []).forEach(q => { if (q.id === id || colonneDe.get(q.id) === colonneDe.get(id)) return;
      const r = yB(q.id, q.cle) - yB(id, p.cle); tous.push(r); if (isS || !listes.get(q.id).S) res.push(r); }));
    const R = res.length ? res : tous; if (!R.length || R.some(r => Math.abs(r) < 0.6)) return;
    const h = basDe.get(id) - hautDe.get(id); const autres = c.filter(o => o !== id);
    const tient = t => autres.every(o => t + h + 10 <= hautDe.get(o) || t >= basDe.get(o) + 10);
    let best = 0, bestN = 0;
    [...new Set(R.map(r => Math.round(r * 2) / 2))].forEach(s => { if (!s || !tient(hautDe.get(id) + s)) return;
      const n = R.filter(r => Math.abs(r - s) < 0.6).length; if (n > bestN) { best = s; bestN = n; } });
    if (best) glisser(id, best); }));

  /* ===== 6. RÉSOLUTION EXACTE : chaque liaison acceptée reçoit UNE ordonnée
     partagée par ses deux broches ; les blocs s'étirent juste ce qu'il faut.
     Plus-long-chemin sur le graphe des contraintes (ordre des broches ≥ PRH,
     non-chevauchement dans une colonne) ; une liaison qui créerait un cycle
     reste pliée, le routeur s'en charge. ======================================= */
  const mHaut = new Map(), mBas = new Map(), estS = new Map();
  { ids.forEach(id => { const isS = !!listes.get(id).S; estS.set(id, isS);
      if (isS && estPastille(id)) { mHaut.set(id, 7); mBas.set(id, 7); }
      else if (isS) { mHaut.set(id, HHS + PRH / 2); mBas.set(id, PRH / 2 + 5); }
      else { let L = 1; clesListes(id).forEach(lid => L = Math.max(L, liste(id, lid).length));
        const m = Math.max(18, (46 - (L - 1) * PRH) / 2); mHaut.set(id, m); mBas.set(id, m); } });
    const PK = (id, cle) => id + SEP + cle;
    const resoudre = colBlocs => {
      const par = new Map(), etiq = new Map();
      ids.forEach(id => chaqueBroche(id, (p, lid) => { const k = PK(id, p.cle); par.set(k, k); etiq.set(k, new Map([[id + '|' + lid, 1]])); }));
      const find = x => { let r = x; while (par.get(r) !== r) r = par.get(r); let c = x; while (par.get(c) !== c) { const n = par.get(c); par.set(c, r); c = n; } return r; };
      const aretes = f => { const E = [];
        ids.forEach(id => clesListes(id).forEach(lid => { const L = liste(id, lid); for (let j = 1; j < L.length; j++) E.push([f(PK(id, L[j - 1].cle)), f(PK(id, L[j].cle)), PRH]); }));
        colBlocs.map(c => c.filter(id => !estPastille(id))).forEach(c => { for (let i = 1; i < c.length; i++) { const P = c[i - 1], N = c[i];
          const w = mBas.get(P) + ((estS.get(P) && estS.get(N)) ? 14 : VGAP) + mHaut.get(N);
          const derniers = [], premiers = [];
          clesListes(P).forEach(lid => { const L = liste(P, lid); if (L.length) derniers.push(f(PK(P, L[L.length - 1].cle))); });
          clesListes(N).forEach(lid => { const L = liste(N, lid); if (L.length) premiers.push(f(PK(N, L[0].cle))); });
          derniers.forEach(a => premiers.forEach(b => E.push([a, b, w]))); } });
        return E; };
      const acyclique = E => { if (E.some(([a, b]) => a === b)) return false;
        const indeg = new Map(), ad = new Map(), ns = new Set();
        E.forEach(([a, b]) => { ns.add(a); ns.add(b); (ad.get(a) || ad.set(a, []).get(a)).push(b); indeg.set(b, (indeg.get(b) || 0) + 1); });
        const q = [...ns].filter(n => !(indeg.get(n) || 0)); let vus = 0;
        while (q.length) { const n = q.pop(); vus++; (ad.get(n) || []).forEach(m => { const d = indeg.get(m) - 1; indeg.set(m, d); if (!d) q.push(m); }); }
        return vus === ns.size; };
      const cand = [];
      lk.forEach((l, li) => { const A = bouts.get(li + ':A'), B = bouts.get(li + ':B');
        const ia = nid(A.nom, A.cle), ib = nid(B.nom, B.cle); if (ia === ib) return;
        const d = Math.abs((colonneDe.get(ia) ?? 0) - (colonneDe.get(ib) ?? 0)); if (d === 0) return;
        if (!par.has(PK(ia, A.cle)) || !par.has(PK(ib, B.cle))) return;
        const genre = (estS.get(ia) ? 1 : 0) + (estS.get(ib) ? 1 : 0);
        cand.push({ a: PK(ia, A.cle), b: PK(ib, B.cle), pr: (d > 1 ? 10 : 0) + genre, w: (d === 1 ? 1 : 0.25) * (genre === 0 ? 1.06 : 1) }); });
      cand.sort((x, y) => x.pr - y.pr);
      let acc = 0;
      cand.forEach(wc => { const ra = find(wc.a), rb = find(wc.b);
        if (ra === rb) { acc += wc.w; return; }
        const ta = etiq.get(ra), tb = etiq.get(rb);
        for (const k of tb.keys()) if (ta.has(k)) return;              // deux broches d'une même liste
        const f = x => { const r = find(x); return r === rb ? ra : r; };
        if (!acyclique(aretes(f))) return;
        par.set(rb, ra); acc += wc.w; tb.forEach((v, k) => ta.set(k, (ta.get(k) || 0) + v)); etiq.delete(rb); });
      const E = aretes(find); const indeg = new Map(), ad = new Map(), ns = new Set();
      ids.forEach(id => chaqueBroche(id, p => ns.add(find(PK(id, p.cle)))));
      E.forEach(([a, b, w]) => { (ad.get(a) || ad.set(a, []).get(a)).push([b, w]); indeg.set(b, (indeg.get(b) || 0) + 1); });
      const Y = new Map(); const q = [...ns].filter(n => !(indeg.get(n) || 0)); q.forEach(n => Y.set(n, 0)); let qi = 0;
      while (qi < q.length) { const n = q[qi++]; (ad.get(n) || []).forEach(([m, w]) => { Y.set(m, Math.max(Y.get(m) || 0, (Y.get(n) || 0) + w));
        const d = indeg.get(m) - 1; indeg.set(m, d); if (!d) q.push(m); }); }
      // détente : un net qui est le sommet d'un bloc (et le bas d'aucun) redescend au plus près
      const netBlocs = new Map();
      ids.forEach(id => chaqueBroche(id, p => { const r = find(PK(id, p.cle)); (netBlocs.get(r) || netBlocs.set(r, new Set()).get(r)).add(id); }));
      for (let dp = 0; dp < 2; dp++) for (let i = q.length - 1; i >= 0; i--) { const n = q[i]; const oe = ad.get(n);
        let mx = Infinity; if (oe && oe.length) oe.forEach(([m, w]) => mx = Math.min(mx, (Y.get(m) || 0) - w));
        const y0 = Y.get(n) || 0; let hauts = 0, bas = 0, tgt = Infinity;
        (netBlocs.get(n) || []).forEach(id => { if (estPastille(id)) return;
          let lo = Infinity, lo2 = Infinity, hi = -Infinity, loN = 0;
          chaqueBroche(id, p => { const yy = Y.get(find(PK(id, p.cle))) || 0;
            if (yy < lo - 0.01) { lo2 = lo; lo = yy; loN = 1; } else if (yy < lo + 0.01) loN++; else if (yy < lo2) lo2 = yy;
            if (yy > hi) hi = yy; });
          if (Math.abs(y0 - lo) < 0.01 && loN === 1) { hauts++; if (isFinite(lo2)) tgt = Math.min(tgt, lo2 - PRH); }
          if (Math.abs(y0 - hi) < 0.01) bas++; });
        if (!(oe && oe.length)) mx = isFinite(tgt) ? tgt : y0;
        if (mx <= y0 + 0.5) continue;
        if (hauts >= 1 && bas === 0) Y.set(n, mx); }
      const py = new Map(); ids.forEach(id => chaqueBroche(id, p => { const k = PK(id, p.cle); py.set(k, HAUT_PAGE + (Y.get(find(k)) || 0)); }));
      return { acc, py }; };

    const RANG = id => (rangeeDe.get(id) || 0) * 1e9;     // la rangée du serpentin prime tout
    let colBlocs = colonnes.map(c => [...c].sort((a, b) => (RANG(a) + hautDe.get(a)) - (RANG(b) + hautDe.get(b))));
    let best = resoudre(colBlocs), bestBlocs = colBlocs;
    const cleBary = (py, moyenne) => id => { const ds = [];
      chaqueBroche(id, p => (partenaires.get(id + SEP + p.cle) || []).forEach(q => { if (q.id !== id && py.has(PK(q.id, q.cle))) ds.push(py.get(PK(q.id, q.cle))); }));
      let bar; if (!ds.length) bar = hautDe.get(id); else if (moyenne) bar = ds.reduce((a, b) => a + b, 0) / ds.length; else bar = mediane(ds);
      return RANG(id) + bar; };
    const MAXIT = ids.length > 600 ? 10 : (ids.length > 120 ? 16 : 24);
    // les bornes d'une réglette n'ont pas d'ordre imposé : elles se mettent face à leurs partenaires
    const reordonner = py => ids.forEach(id => { if (!estS.get(id)) return;
      clesListes(id).forEach(lid => { const L = liste(id, lid); if (L.length < 2) return;
        const sc = new Map(L.map(p => { const ps = partenairesExternes(id, p.cle);
          let s = 0, c = 0; ps.forEach(q => { const y = py.get(PK(q.id, q.cle)); if (y != null) { s += y; c++; } });
          return [p.cle, c ? s / c : (py.get(PK(id, p.cle)) || 0)]; }));
        L.sort((a, b) => sc.get(a.cle) - sc.get(b.cle)); }); });
    const photoOrdre = () => new Map(ids.map(id => { const ls = listes.get(id); return [id, { L: ls.L ? ls.L.slice() : null, R: ls.R ? ls.R.slice() : null, S: ls.S ? ls.S.slice() : null }]; }));
    const revenirOrdre = snap => snap.forEach((o, id) => { const ls = listes.get(id); if (o.L) ls.L = o.L; if (o.R) ls.R = o.R; if (o.S) ls.S = o.S; });
    let py = best.py, cur = colBlocs, stagne = 0, bestOrdre = photoOrdre();
    for (let it = 0; it < MAXIT && stagne < 5; it++) { reordonner(py);
      const cle = cleBary(py, it % 2 === 1);
      const nb = cur.map(c => { const k = new Map(c.map(id => [id, cle(id)])); return [...c].sort((a, b) => k.get(a) - k.get(b)); });
      const r = resoudre(nb); py = r.py; cur = nb;
      if (r.acc > best.acc + 0.01) { best = r; bestBlocs = nb; bestOrdre = photoOrdre(); stagne = 0; } else stagne++; }
    revenirOrdre(bestOrdre); colBlocs = bestBlocs;
    // dégonflage : un bloc étiré pour rien (broche accrochée à l'extrémité opposée
    // du partenaire) se referme en déplaçant la broche partenaire dans sa liste
    const sommeH = st => { let h = 0; ids.forEach(id => { let lo = Infinity, hi = -Infinity;
      chaqueBroche(id, p => { const y = st.py.get(PK(id, p.cle)); lo = Math.min(lo, y); hi = Math.max(hi, y); }); if (isFinite(lo)) h += hi - lo; }); return h; };
    for (let rp = 0; rp < 3; rp++) { const py2 = best.py; const sauve = new Map(); let bouge = false;
      ids.forEach(id => clesListes(id).forEach(lid => { const L = liste(id, lid); if (L.length < 2) return;
        const ys = L.map(p => py2.get(PK(id, p.cle)));
        let bj = -1, bg = 0; for (let j = 0; j + 1 < L.length; j++) { const g = ys[j + 1] - ys[j]; if (g > bg) { bg = g; bj = j; } }
        if (bg <= 3 * PRH) return;
        const enHaut = (bj + 1) <= L.length / 2; const grp = enHaut ? L.slice(0, bj + 1) : L.slice(bj + 1);
        if (grp.length > L.length / 2) return;
        const cible = enHaut ? ys[bj + 1] : ys[bj];
        grp.forEach(p => (partenaires.get(id + SEP + p.cle) || []).forEach(q => { if (q.id === id) return;
          const L2 = listes.get(q.id)[listeDeBroche(q.id, q.cle)]; if (!L2 || L2.length < 2) return;
          const qi = L2.findIndex(pp => pp.cle === q.cle); if (qi < 0) return;
          const ys2 = L2.map(pp => py2.get(PK(q.id, pp.cle))); let ni = 0; while (ni < L2.length && ys2[ni] < cible) ni++;
          if (ni === qi || ni === qi + 1) return;
          if (!sauve.has(L2)) sauve.set(L2, L2.slice());
          const item = L2.splice(qi, 1)[0]; L2.splice(qi < ni ? ni - 1 : ni, 0, item); bouge = true; })); }));
      if (!bouge) break;
      const r = resoudre(colBlocs);
      if (r.acc >= best.acc && sommeH(r) < sommeH(best)) best = r;
      else { sauve.forEach((copie, arr) => { arr.length = 0; copie.forEach(x => arr.push(x)); }); break; } }
    ids.forEach(id => { let lo = Infinity, hi = -Infinity;
      chaqueBroche(id, p => { const y = best.py.get(PK(id, p.cle)); yBroche.set(PK(id, p.cle), y); lo = Math.min(lo, y); hi = Math.max(hi, y); });
      if (!isFinite(lo)) { lo = HAUT_PAGE; hi = HAUT_PAGE; }
      hautDe.set(id, lo - mHaut.get(id)); basDe.set(id, hi + mBas.get(id)); }); }

  const recalerBords = id => { let lo = Infinity, hi = -Infinity; chaqueBroche(id, p => { const y = yB(id, p.cle); lo = Math.min(lo, y); hi = Math.max(hi, y); });
    if (isFinite(lo)) { hautDe.set(id, lo - mHaut.get(id)); basDe.set(id, hi + mBas.get(id)); } };
  const voisinsDe = id => { const s = new Set(); chaqueBroche(id, p => (partenaires.get(id + SEP + p.cle) || []).forEach(q => { if (q.id !== id && !estPastille(q.id)) s.add(q.id); })); return s; };
  const tous = colonnes.flat();
  const heurte = (L, nt, nb, exclus) => { const x = xDe.get(L), w = largeurDe(L);
    return tous.some(o => { if (o === L || estPastille(o) || (exclus && exclus.includes(o))) return false; const ox = xDe.get(o), ow = largeurDe(o);
      return x < ox + ow + 6 && ox < x + w + 6 && nt < basDe.get(o) + 8 && hautDe.get(o) < nb + 8; }); };

  /* ===== 7. FINITIONS QUI NE PLIENT AUCUN FIL DROIT ====================== */
  // flancs alignés : un flanc qui ne dessert que des feuilles les emmène avec lui
  tous.forEach(B => { if (estS.get(B) || estPastille(B)) return;
    const ls = listes.get(B); if (!ls.L || !ls.R || !ls.L.length || !ls.R.length) return;
    const cen = arr => arr.reduce((s, p) => s + yB(B, p.cle), 0) / arr.length;
    const d = cen(ls.L) - cen(ls.R); if (Math.abs(d) < 12) return;
    const feuilles = flanc => { const set = new Set(); ls[flanc].forEach(p => (partenaires.get(B + SEP + p.cle) || []).forEach(q => { if (q.id !== B && !estPastille(q.id)) set.add(q.id); }));
      const ps = [...set]; if (!ps.length) return null; for (const q of ps) { const nb = voisinsDe(q); if (nb.size !== 1 || !nb.has(B)) return null; } return ps; };
    const rl = feuilles('R'), ll = feuilles('L'); let flanc = null, dy = 0;
    if (rl) { flanc = 'R'; dy = d; } else if (ll) { flanc = 'L'; dy = -d; }
    if (!flanc || Math.abs(dy) < 12) return;
    const fs = flanc === 'R' ? rl : ll;
    if (fs.some(id => heurte(id, hautDe.get(id) + dy, basDe.get(id) + dy, fs))) return;
    ls[flanc].forEach(p => yBroche.set(B + SEP + p.cle, yB(B, p.cle) + dy)); fs.forEach(q => glisser(q, dy)); recalerBords(B); });
  // droiture bornée : un gros trou vide dans un équipement se referme en glissant
  // le côté qui a le moins de broches ; un bloc dense n'est jamais touché
  ids.forEach(id => { if (estS.get(id) || estPastille(id)) return;
    const cles = []; chaqueBroche(id, p => cles.push(id + SEP + p.cle)); if (cles.length < 2) return;
    const permis = (cles.length - 1) * (cles.length >= 16 ? 100 : 130);
    { const ys = cles.map(k => yBroche.get(k)); if (Math.max(...ys) - Math.min(...ys) <= permis) return; }
    for (let garde = 0; garde < 80; garde++) {
      const arr = cles.map(k => ({ k, y: yBroche.get(k) })).sort((a, b) => a.y - b.y);
      const span = arr[arr.length - 1].y - arr[0].y; if (span <= permis) break;
      let bi = -1, bg = PRH; for (let i = 1; i < arr.length; i++) { const g = arr[i].y - arr[i - 1].y; if (g > bg) { bg = g; bi = i; } }
      if (bi < 0) break; const reduit = Math.min(span - permis, bg - PRH); if (reduit <= 0.5) break;
      const dessus = arr.slice(0, bi), dessous = arr.slice(bi);
      const m = dessus.length <= dessous.length ? { set: new Set(dessus.map(a => a.k)), d: reduit } : { set: new Set(dessous.map(a => a.k)), d: -reduit };
      cles.forEach(k => { if (m.set.has(k)) yBroche.set(k, yBroche.get(k) + m.d); }); }
    recalerBords(id); });
  // feuilles : un bloc qui ne se raccorde qu'à un seul autre se met pile en face
  tous.forEach(L => { if (estS.get(L) || estPastille(L)) return;
    const nb = voisinsDe(L); if (nb.size !== 1) return; const B = [...nb][0]; if (estPastille(B)) return;
    const parFlanc = {}, all = [];
    clesListes(L).forEach(lid => { const arr = []; liste(L, lid).forEach(p => { const qs = (partenaires.get(L + SEP + p.cle) || []).filter(q => q.id === B);
      const it = { cle: p.cle, cur: yB(L, p.cle), des: qs.length ? mediane(qs.map(q => yB(q.id, q.cle))) : null }; arr.push(it); all.push(it); }); parFlanc[lid] = arr; });
    let exact = all.length > 0 && all.every(it => it.des != null);
    if (exact) for (const lid in parFlanc) { const a = parFlanc[lid]; for (let i = 1; i < a.length; i++) if (a[i].des < a[i - 1].des + PRH - 0.5) { exact = false; break; } if (!exact) break; }
    if (exact) { let lo = Infinity, hi = -Infinity; all.forEach(it => { lo = Math.min(lo, it.des); hi = Math.max(hi, it.des); });
      const nt = lo - mHaut.get(L), nb2 = hi + mBas.get(L);
      if (!heurte(L, nt, nb2)) { all.forEach(it => yBroche.set(L + SEP + it.cle, it.des)); hautDe.set(L, nt); basDe.set(L, nb2); return; } }
    let s = 0, c = 0; all.forEach(it => { if (it.des != null) { s += it.des - it.cur; c++; } });
    if (!c) return; const dy = s / c; if (Math.abs(dy) < 1) return;
    if (!heurte(L, hautDe.get(L) + dy, basDe.get(L) + dy)) glisser(L, dy); });
  const recollerPastilles = () => tous.forEach(id => { if (!estPastille(id)) return;
    const pp = liste(id, 'S')[0]; if (!pp) return;
    const qs = (partenaires.get(id + SEP + pp.cle) || []).filter(q => q.id !== id); if (!qs.length) return;
    let y = yB(qs[0].id, qs[0].cle); const x = xDe.get(id), w = largeurDe(id);
    for (const o of tous) { if (o === id || o === qs[0].id || estPastille(o)) continue; const ox = xDe.get(o), ow = largeurDe(o);
      if (!(x < ox + ow + 2 && ox < x + w + 2)) continue; const t = hautDe.get(o) - 9, b = basDe.get(o) + 9;
      if (y > t && y < b) { const up = y - t, dn = b - y; if (Math.min(up, dn) <= 20) y = (up <= dn) ? t : b; } }
    yBroche.set(id + SEP + pp.cle, y); hautDe.set(id, y - 7); basDe.set(id, y + 7); });
  recollerPastilles();
  // bandes vides : tout remonte d'autant, les fils droits le restent
  { const iv = tous.map(id => [hautDe.get(id), basDe.get(id)]).sort((a, b) => a[0] - b[0]); const fus = [];
    iv.forEach(([a, b]) => { const m = fus[fus.length - 1]; if (m && a <= m[1] + VGAP) m[1] = Math.max(m[1], b); else fus.push([a, b]); });
    const moves = []; for (let i = 1; i < fus.length; i++) { const gap = fus[i][0] - fus[i - 1][1]; if (gap > 3 * VGAP) moves.push([fus[i][0], gap - 3 * VGAP]); }
    if (moves.length) tous.forEach(id => { const t = hautDe.get(id); let d = 0; moves.forEach(([y, g]) => { if (t >= y - 0.01) d += g; }); if (d) glisser(id, -d); }); }
  // aucun chevauchement, jamais : le bloc du dessous glisse sous l'autre
  { const ids2 = tous.filter(id => !estPastille(id));
    for (let passe = 0; passe < 8; passe++) { let bouge = false;
      for (let i = 0; i < ids2.length; i++) for (let j = 0; j < ids2.length; j++) { if (i === j) continue;
        const u = ids2[i], v = ids2[j];
        if (!(xDe.get(u) < xDe.get(v) + largeurDe(v) + 6 && xDe.get(v) < xDe.get(u) + largeurDe(u) + 6 && hautDe.get(u) < basDe.get(v) + 6 && hautDe.get(v) < basDe.get(u) + 6)) continue;
        glisser(v, (basDe.get(u) + 10) - hautDe.get(v)); bouge = true; }
      if (!bouge) break; } }
  // pastilles : si sa colonne est prise ou son fil très long, la pastille se
  // colle au flanc de son partenaire, dans la goulotte
  const pastilles = [];
  tous.forEach(id => { if (!estPastille(id)) return;
    const t = hautDe.get(id), bb = basDe.get(id), x = xDe.get(id), w = largeurDe(id);
    const pp = liste(id, 'S')[0]; if (!pp) return;
    const qs = (partenaires.get(id + SEP + pp.cle) || []).filter(q => q.id !== id); if (!qs.length) return;
    const q = qs[0]; const qx = xDe.get(q.id), qw = largeurDe(q.id);
    const gene = tous.some(o => o !== id && !estPastille(o) && x < xDe.get(o) + largeurDe(o) + 2 && xDe.get(o) < x + w + 2 && t < basDe.get(o) + 2 && hautDe.get(o) < bb + 2);
    const loin = Math.min(Math.abs(x - (qx + qw)), Math.abs(qx - (x + w))) > 120;
    if (!gene && !loin) return;
    const droite = (colonneDe.get(id) ?? 0) >= (colonneDe.get(q.id) ?? 0);
    xDe.set(id, droite ? qx + qw + 6 : qx - w - 6);
    pastilles.push({ id, ch: droite ? (colonneDe.get(q.id) ?? 0) + 1 : (colonneDe.get(q.id) ?? 0), y1: t, y2: bb }); });

  /* ===== 8. ALLER-RETOUR BORNES ↔ ÉQUIPEMENTS ============================ */
  { const dansCorps = (id, y) => { const isS = !!listes.get(id).S;
      return y >= hautDe.get(id) + (isS ? HHS + PRH / 2 : 16) - 0.5 && y <= basDe.get(id) - (isS ? PRH / 2 + 3 : 10) + 0.5; };
    const couloirLibre = (ia, ib, y) => { const xa = xDe.get(ia), xb = xDe.get(ib); if (xa == null || xb == null) return false;
      const seg = xa < xb ? [xa + largeurDe(ia), xb] : [xb + largeurDe(ib), xa]; if (seg[1] - seg[0] < 4) return true;
      return !tous.some(o => { if (o === ia || o === ib) return false; const ox = xDe.get(o), ow = largeurDe(o);
        return seg[1] > ox + 2 && seg[0] < ox + ow - 2 && y > hautDe.get(o) + 2 && y < basDe.get(o) - 2; }); };
    const filsDroits = () => { const S = [];
      lk.forEach((l, li) => { const A = bouts.get(li + ':A'), B = bouts.get(li + ':B'); const ia = nid(A.nom, A.cle), ib = nid(B.nom, B.cle); if (ia === ib) return;
        const ya = yB(ia, A.cle), yb = yB(ib, B.cle); if (Math.abs(ya - yb) >= 0.6) return;
        const xa = xDe.get(ia), xb = xDe.get(ib); if (xa == null || xb == null) return;
        const seg = xa < xb ? [xa + largeurDe(ia), xb] : [xb + largeurDe(ib), xa]; S.push({ y: ya, x0: seg[0], x1: seg[1], ia, ib, ka: A.cle, kb: B.cle }); });
      return S; };
    const avaleUnDroit = (L, nt, nb) => { const x = xDe.get(L), w = largeurDe(L);
      return filsDroits().some(sg => sg.ia !== L && sg.ib !== L && sg.x1 > x + 2 && sg.x0 < x + w - 2 && sg.y > nt + 2 && sg.y < nb - 2); };
    const espaceOK = (id, cle, y) => { for (const p of liste(id, listeDeBroche(id, cle))) { if (p.cle !== cle && Math.abs(yB(id, p.cle) - y) < PRH - 0.5) return false; } return true; };
    // un fil droit à tout prix : le bloc a le droit de grandir pour l'attraper,
    // sans chevaucher personne ni avaler le fil droit de personne
    const poser = (id, cle, y) => { if (!espaceOK(id, cle, y)) return false;
      if (dansCorps(id, y)) { yBroche.set(id + SEP + cle, y); return true; }
      if (listes.get(id).S || tous.length > 400) return false;
      const nt = Math.min(hautDe.get(id), y - 16), nb = Math.max(basDe.get(id), y + 10);
      if (nb - nt > 900 || (nb - nt) - (basDe.get(id) - hautDe.get(id)) > 260) return false;
      if (heurte(id, nt, nb) || avaleUnDroit(id, nt, nb)) return false;
      yBroche.set(id + SEP + cle, y); hautDe.set(id, nt); basDe.set(id, nb); return true; };
    const detente = () => { let bouge = false;
      lk.forEach((l, li) => { const A = bouts.get(li + ':A'), B = bouts.get(li + ':B'); const ia = nid(A.nom, A.cle), ib = nid(B.nom, B.cle); if (ia === ib) return;
        const dc = Math.abs((colonneDe.get(ia) ?? 0) - (colonneDe.get(ib) ?? 0)); if (dc === 0 || estPastille(ia) || estPastille(ib)) return;
        const ya = yB(ia, A.cle), yb = yB(ib, B.cle); if (Math.abs(ya - yb) < 0.6) return;
        const mobile = (id, cle) => { const ps = (partenaires.get(id + SEP + cle) || []).filter(q => q.id !== id);
          if (ps.length === 1) return true; if (!ps.length) return false; const y0 = yB(ps[0].id, ps[0].cle); return ps.every(q => Math.abs(yB(q.id, q.cle) - y0) < 0.6); };
        const ok = y => dc === 1 || couloirLibre(ia, ib, y);
        if (mobile(ia, A.cle) && ok(yb) && poser(ia, A.cle, yb)) bouge = true;
        else if (mobile(ib, B.cle) && ok(ya) && poser(ib, B.cle, ya)) bouge = true; });
      return bouge; };
    const pousser = () => { let any = false; const S = filsDroits();
      const heurteFil = (id, nt, nb) => { const x = xDe.get(id), w = largeurDe(id); return S.some(sg => sg.ia !== id && sg.ib !== id && sg.y > nt + 2 && sg.y < nb - 2 && sg.x1 > x + 2 && sg.x0 < x + w - 2); };
      tous.forEach(id => { if (estPastille(id)) return; const rs = [];
        chaqueBroche(id, p => (partenaires.get(id + SEP + p.cle) || []).forEach(q => { if (q.id === id || estPastille(q.id)) return;
          if (Math.abs((colonneDe.get(q.id) ?? 0) - (colonneDe.get(id) ?? 0)) !== 1) return; rs.push(yB(q.id, q.cle) - yB(id, p.cle)); }));
        if (!rs.length) return; const cur = rs.filter(r => Math.abs(r) < 0.6).length; let best = 0, bg = 0;
        [...new Set(rs.map(r => Math.round(r * 2) / 2))].forEach(s => { if (Math.abs(s) < 0.6) return; const n = rs.filter(r => Math.abs(r - s) < 0.6).length;
          if (n - cur > bg && !heurte(id, hautDe.get(id) + s, basDe.get(id) + s) && !heurteFil(id, hautDe.get(id) + s, basDe.get(id) + s)) { bg = n - cur; best = s; } });
        if (best) { glisser(id, best); any = true; } });
      return any; };
    // dé-croisement : sur chaque flanc, les bornes pliées échangent leurs places
    // pour suivre l'ordre vertical de leurs partenaires
    const permuter = () => { let any = false;
      tous.forEach(id => { if (estPastille(id)) return;
        clesListes(id).forEach(lid => { const L = liste(id, lid); const grp = { L: [], R: [] };
          L.forEach(p => { const ps = partenaires.get(id + SEP + p.cle) || []; if (ps.length !== 1) return; const q = ps[0]; if (q.id === id || estPastille(q.id)) return;
            const dc = (colonneDe.get(q.id) ?? 0) - (colonneDe.get(id) ?? 0); if (Math.abs(dc) !== 1) return;
            const my = yB(id, p.cle), tgt = yB(q.id, q.cle); if (Math.abs(my - tgt) < 0.6) return; grp[dc > 0 ? 'R' : 'L'].push({ cle: p.cle, y: my, tgt }); });
          ['L', 'R'].forEach(g => { const libres = grp[g]; if (libres.length < 2) return;
            const places = libres.map(f => f.y).sort((a, b) => a - b); const ordre = libres.slice().sort((a, b) => a.tgt - b.tgt);
            if (!ordre.some((f, i) => Math.abs(f.y - places[i]) > 0.5)) return;
            ordre.forEach((f, i) => yBroche.set(id + SEP + f.cle, places[i])); any = true; }); }); });
      return any; };
    // rétreint : une broche extrême dont le fil est plié de toute façon se rapproche
    const retreindre = () => { tous.forEach(id => { if (estPastille(id)) return;
      let mT = Infinity, mB = -Infinity; chaqueBroche(id, p => { const y = yB(id, p.cle); mT = Math.min(mT, y); mB = Math.max(mB, y); });
      mT = isFinite(mT) ? mT - hautDe.get(id) : 0; mB = isFinite(mB) ? basDe.get(id) - mB : 0;
      for (let garde = 0; garde < 40; garde++) { const items = [];
        chaqueBroche(id, p => { const k = id + SEP + p.cle, y = yB(id, p.cle); const ps = (partenaires.get(k) || []).filter(q => q.id !== id && !estPastille(q.id));
          items.push({ k, y, droit: ps.length > 0 && ps.every(q => Math.abs(yB(q.id, q.cle) - y) < 0.6) }); });
        if (items.length < 2) break; items.sort((a, b) => a.y - b.y); let fait = false;
        const h0 = items[0], h1 = items[1];
        if (!h0.droit && h1.y - h0.y > PRH + 0.5) { yBroche.set(h0.k, h1.y - PRH); fait = true; }
        else { const b0 = items[items.length - 1], b1 = items[items.length - 2]; if (!b0.droit && b0.y - b1.y > PRH + 0.5) { yBroche.set(b0.k, b1.y + PRH); fait = true; } }
        if (!fait) break; }
      let lo = Infinity, hi = -Infinity; chaqueBroche(id, p => { const y = yB(id, p.cle); lo = Math.min(lo, y); hi = Math.max(hi, y); });
      if (isFinite(lo)) { hautDe.set(id, lo - mT); basDe.set(id, hi + mB); } }); };
    // paires libres (un appareil + son bornier dédié) dans l'ordre naturel des repères
    colonnes.forEach(col => { const paires = [];
      col.forEach(id => { if (listes.get(id).S || estPastille(id)) return; const nb = voisinsDe(id); if (nb.size !== 1) return; const fr = [...nb][0];
        if (!listes.get(fr).S || estPastille(fr)) return; const fn = voisinsDe(fr); if (fn.size !== 1 || [...fn][0] !== id) return; paires.push({ dev: id, fr }); });
      if (paires.length < 2) return;
      const hautP = p => Math.min(hautDe.get(p.dev), hautDe.get(p.fr)), hP = p => Math.round(Math.max(basDe.get(p.dev), basDe.get(p.fr)) - hautP(p));
      const parH = new Map(); paires.forEach(p => { const h = hP(p); (parH.get(h) || parH.set(h, []).get(h)).push(p); });
      parH.forEach(grp => { if (grp.length < 2) return; const hauts = grp.map(hautP).sort((a, b) => a - b);
        const ordre = grp.slice().sort((a, b) => String(noeuds.get(a.dev).nom).localeCompare(String(noeuds.get(b.dev).nom), undefined, { numeric: true }));
        ordre.forEach((p, i) => { const dy = hauts[i] - hautP(p); if (Math.abs(dy) < 0.5) return; glisser(p.dev, dy); glisser(p.fr, dy); }); }); });
    // condensation rigide : un trou dans un hub se referme en emmenant les grappes-feuilles
    const condenser = () => { const rebord = new Set();
      tous.forEach(H => { if (estPastille(H)) return;
        const grappe = P => { const vus = new Set([P]); const st = [P];
          while (st.length) { const u = st.pop(); if (vus.size > 40) return null;
            chaqueBroche(u, p => (partenaires.get(u + SEP + p.cle) || []).forEach(q => { if (q.id === H || estPastille(q.id) || vus.has(q.id)) return; vus.add(q.id); st.push(q.id); })); }
          return vus; };
        let bouge = false;
        for (let g = 0; g < 60; g++) { const items = []; chaqueBroche(H, p => items.push({ k: p.cle, y: yB(H, p.cle) }));
          if (items.length < 3) break; items.sort((a, b) => a.y - b.y);
          const trous = []; for (let i = 1; i < items.length; i++) { const gp = items[i].y - items[i - 1].y; if (gp > 3 * PRH) trous.push({ i, gp }); }
          if (!trous.length) break; trous.sort((a, b) => b.gp - a.gp); let fait = false;
          for (const T of trous) { const dessus = items.slice(0, T.i), dessous = items.slice(T.i);
            const essai = (cote, dy) => { const cles = new Set(cote.map(it => it.k)); const parts = new Set(); let ok = true;
              cote.forEach(it => (partenaires.get(H + SEP + it.k) || []).forEach(q => { if (!ok) return;
                if (q.id === H) { if (!cles.has(q.cle)) ok = false; return; } if (estPastille(q.id) || parts.has(q.id)) return;
                const c = grappe(q.id); if (!c) { ok = false; return; } c.forEach(m => parts.add(m)); }));
              if (!ok || !parts.size) return false;
              for (const m of parts) { let mal = false; chaqueBroche(m, p => (partenaires.get(m + SEP + p.cle) || []).forEach(q => { if (q.id === H && !cles.has(q.cle)) mal = true; })); if (mal) return false; }
              const signe = dy > 0 ? 1 : -1; let mag = Math.abs(dy);
              for (const P of parts) { const x = xDe.get(P), w = largeurDe(P);
                tous.forEach(o => { if (o === P || o === H || parts.has(o) || estPastille(o)) return; const ox = xDe.get(o), ow = largeurDe(o); if (!(x < ox + ow + 6 && ox < x + w + 6)) return;
                  if (signe > 0) { if (hautDe.get(o) >= basDe.get(P) - 1) mag = Math.min(mag, hautDe.get(o) - 8 - basDe.get(P)); }
                  else { if (basDe.get(o) <= hautDe.get(P) + 1) mag = Math.min(mag, hautDe.get(P) - (basDe.get(o) + 8)); } }); }
              if (mag < 2 * PRH) return false; const d = signe * mag;
              cote.forEach(it => yBroche.set(H + SEP + it.k, yB(H, it.k) + d)); parts.forEach(P => glisser(P, d)); return true; };
            /* glissement de broches : quand le bloc partenaire ne peut pas bouger, on
               ne glisse que ses broches concernées dans leur bloc — aucun bloc ne bouge,
               les deux bouts glissent ensemble, les fils restent droits. Candidat
               (opt.condenser) : mesuré, il ne change pas la droiture mais rend les
               blocs compacts — un équipement n'a plus à grandir pour attraper un fil
               qu'une masse peut aller chercher. */
            const essaiBroches = (cote, dy) => { if (!opt.condenser) return false;
              const clesH = new Set(cote.map(it => it.k)); const mv = [], mvSet = new Set(); let ok = true;
              cote.forEach(it => (partenaires.get(H + SEP + it.k) || []).forEach(q => { if (!ok || estPastille(q.id)) return;
                if (q.id === H) { if (!clesH.has(q.cle)) ok = false; return; }
                const pk = q.id + SEP + q.cle; if (mvSet.has(pk)) return;
                for (const r of (partenaires.get(pk) || [])) { if (!(r.id === H && clesH.has(r.cle))) { ok = false; return; } }
                mvSet.add(pk); mv.push({ id: q.id, cle: q.cle }); }));
              if (!ok || !mv.length) return false;
              const signe = dy > 0 ? 1 : -1, touches = [...new Set(mv.map(m => m.id))];
              let SGS = null; const sgs = () => SGS || (SGS = filsDroits());
              const enMouvement = sg => (sg.ia === H && clesH.has(sg.ka)) || (sg.ib === H && clesH.has(sg.kb)) || mvSet.has(sg.ia + SEP + sg.ka) || mvSet.has(sg.ib + SEP + sg.kb);
              let bornes = null;
              const tient = mag => { const d = signe * mag; bornes = new Map();
                for (const m of mv) { const y = yB(m.id, m.cle) + d; if (!couloirLibre(H, m.id, y)) return false;
                  for (const p of noeuds.get(m.id).broches) { if (mvSet.has(m.id + SEP + p.cle)) continue; if (Math.abs(yB(m.id, p.cle) - y) < PRH - 0.5) return false; } }
                for (const id of touches) { let lo = Infinity, hi = -Infinity;
                  noeuds.get(id).broches.forEach(p => { const y = yB(id, p.cle) + (mvSet.has(id + SEP + p.cle) ? d : 0); lo = Math.min(lo, y); hi = Math.max(hi, y); });
                  const isS = !!listes.get(id).S, nt = lo - (isS ? HHS + PRH / 2 : 22), nb = hi + (isS ? PRH / 2 + 5 : 22);
                  if (nt < hautDe.get(id) - 0.5 || nb > basDe.get(id) + 0.5) { if (heurte(id, nt, nb)) return false;
                    const x = xDe.get(id), w = largeurDe(id), zt1 = nt, zb1 = hautDe.get(id), zt2 = basDe.get(id), zb2 = nb;
                    if (sgs().some(sg => !enMouvement(sg) && sg.ia !== id && sg.ib !== id && sg.x1 > x + 2 && sg.x0 < x + w - 2 && ((sg.y > zt1 + 2 && sg.y < zb1 - 2) || (sg.y > zt2 + 2 && sg.y < zb2 - 2)))) return false; }
                  bornes.set(id, { nt, nb }); }
                return true; };
              let mag = Math.abs(dy); while (mag >= 2 * PRH && !tient(mag)) mag = Math.floor(mag / 2);
              if (mag < 2 * PRH) return false; const d = signe * mag;
              cote.forEach(it => yBroche.set(H + SEP + it.k, yB(H, it.k) + d)); mv.forEach(m => yBroche.set(m.id + SEP + m.cle, yB(m.id, m.cle) + d));
              bornes.forEach((b2, id) => { hautDe.set(id, b2.nt); basDe.set(id, b2.nb); }); return true; };
            const reduit = T.gp - PRH;
            fait = dessus.length <= dessous.length
              ? (essai(dessus, reduit) || essai(dessous, -reduit) || essaiBroches(dessus, reduit) || essaiBroches(dessous, -reduit))
              : (essai(dessous, -reduit) || essai(dessus, reduit) || essaiBroches(dessous, -reduit) || essaiBroches(dessus, reduit));
            if (fait) break; }
          if (!fait) break; bouge = true; }
        if (bouge) rebord.add(H); });
      rebord.forEach(B => { let lo = Infinity, hi = -Infinity; chaqueBroche(B, p => { const y = yB(B, p.cle); lo = Math.min(lo, y); hi = Math.max(hi, y); });
        if (isFinite(lo)) { const isS = !!listes.get(B).S; hautDe.set(B, Math.max(hautDe.get(B), lo - (isS ? HHS + PRH / 2 : 22))); basDe.set(B, Math.min(basDe.get(B), hi + (isS ? PRH / 2 + 5 : 22))); } }); };
    for (let tour = 0; tour < 4; tour++) { const a = detente(); const b = pousser(); const c = permuter(); recollerPastilles(); if (!a && !b && !c) break; }
    condenser(); retreindre(); detente(); permuter(); recollerPastilles();
    pastilles.forEach(sp => { sp.y1 = hautDe.get(sp.id); sp.y2 = basDe.get(sp.id); });
    ids.forEach(id => clesListes(id).forEach(lid => liste(id, lid).sort((a, b) => yB(id, a.cle) - yB(id, b.cle))));
  }

  /* ===== 9. TASSEMENT, ÎLOTS, RANGÉES ==================================== */
  // toute bande vide sur toute la largeur se referme à un petit interstice
  { const GAPMIN = 44; const evs = ids.map(id => ({ t: hautDe.get(id), b: basDe.get(id) })).concat(pastilles.map(sp => ({ t: sp.y1, b: sp.y2 }))).sort((a, b) => a.t - b.t);
    const occ = []; evs.forEach(e => { const L = occ[occ.length - 1]; if (L && e.t <= L.b + GAPMIN) L.b = Math.max(L.b, e.b); else occ.push({ t: e.t, b: e.b }); });
    const moves = []; let cum = 0; for (let i = 1; i < occ.length; i++) { const gap = occ[i].t - occ[i - 1].b; if (gap > GAPMIN) { cum += gap - GAPMIN; moves.push({ from: occ[i].t, dy: cum }); } }
    if (moves.length) { const dyDe = y => { let d = 0; for (const m of moves) { if (y >= m.from - 0.1) d = m.dy; else break; } return d; };
      ids.forEach(id => { const d = dyDe(hautDe.get(id)); if (d) glisser(id, -d); });
      pastilles.forEach(sp => { const d = dyDe(sp.y1); if (d) { sp.y1 -= d; sp.y2 -= d; } }); } }
  // îlots indépendants : en étagères à droite de l'îlot principal, au format de la page
  { const par = new Map(ids.map(n => [n, n])); const find = k => { while (par.get(k) !== k) { par.set(k, par.get(par.get(k))); k = par.get(k); } return k; };
    ids.forEach(id => chaqueBroche(id, p => (partenaires.get(id + SEP + p.cle) || []).forEach(q => { if (par.has(q.id)) { const a = find(id), b = find(q.id); if (a !== b) par.set(a, b); } })));
    const grp = new Map(); ids.forEach(n => { const r = find(n); (grp.get(r) || grp.set(r, []).get(r)).push(n); });
    const cadre = g => { let x0 = 1e18, y0 = 1e18, x1 = -1e18, y1 = -1e18;
      g.forEach(n => { x0 = Math.min(x0, xDe.get(n)); x1 = Math.max(x1, xDe.get(n) + largeurDe(n)); y0 = Math.min(y0, hautDe.get(n)); y1 = Math.max(y1, basDe.get(n)); });
      return { x0, y0, w: x1 - x0, h: y1 - y0 }; };
    // on ne déplace un îlot que si tous ses fils internes sont droits : une translation les garde droits
    const sur = g => { const S = new Set(g); for (const id of g) for (const p of noeuds.get(id).broches) { const py = yB(id, p.cle);
      for (const q of (partenaires.get(id + SEP + p.cle) || [])) { if (!S.has(q.id)) continue; const qy = yB(q.id, q.cle); if (py == null || qy == null || Math.abs(py - qy) > 1.5) return false; } } return true; };
    const items = [], fixes = []; const all = [...grp.values()]; let bi = 0; all.forEach((g, i) => { if (g.length > all[bi].length) bi = i; });
    all.forEach((g, i) => { if (i === bi || !sur(g)) fixes.push(g); else items.push(g); });
    if (items.length >= 3) {
      items.forEach(g => { if (g.length < 2 || g.length > 3) return; const devs = g.filter(n => !noeuds.get(n).reglette), frs = g.filter(n => noeuds.get(n).reglette);
        if (devs.length !== 1 || !frs.length) return; const d = devs[0]; const dx0 = xDe.get(d), dw = largeurDe(d); let ro = dx0 + dw + 30, lo = dx0 - 30;
        frs.slice().sort((a, b) => xDe.get(a) - xDe.get(b)).forEach(f => { const fw = largeurDe(f); if (xDe.get(f) >= dx0 + dw) { xDe.set(f, ro); ro += fw + 26; } else { lo -= fw; xDe.set(f, lo); lo -= 26; } }); });
      const PAD = 16;
      const cleDe = g => { let m = 1e15; g.forEach(n => { const N = noeuds.get(n); if (N.reglette) return; const v = parseFloat(N.nom); if (!isNaN(v)) m = Math.min(m, v); }); return m; };
      const rects = items.map(g => { const b = cadre(g); return { g, b, w: b.w + 2 * PAD, h: b.h + 2 * PAD, k: cleDe(g) }; });
      rects.sort((a, b) => (b.h - a.h) || (a.k - b.k));
      let MB = null; fixes.forEach(g => { const b = cadre(g); MB = MB ? { x0: Math.min(MB.x0, b.x0), y0: Math.min(MB.y0, b.y0), x1: Math.max(MB.x1, b.x0 + b.w), y1: Math.max(MB.y1, b.y0 + b.h) } : { x0: b.x0, y0: b.y0, x1: b.x0 + b.w, y1: b.y0 + b.h }; });
      // la première étagère se remplit sous l'îlot principal, les suivantes à sa droite
      const ranger = capH => { const pos = []; let x = MB.x0, y = MB.y1, cw = MB.x1 - MB.x0 + 34, ybot = MB.y1, xr = MB.x1;
        rects.forEach(r => { if (y > MB.y0 && y + r.h > MB.y0 + capH) { x += cw; cw = 0; y = MB.y0; } pos.push({ r, x, y }); cw = Math.max(cw, r.w); ybot = Math.max(ybot, y + r.h); xr = Math.max(xr, x + r.w); y += r.h; });
        return { pos, W: xr - MB.x0, H: Math.max(MB.y1, ybot) - MB.y0 }; };
      const mh = Math.max(MB.y1 - MB.y0, 500); const cands = [0.8, 1, 1.3, 1.7, 2.2, 2.9].map(f => ranger(mh * f));
      const cout = c => Math.abs(Math.log((Math.max(c.W, 60) / Math.max(c.H, 60)) / 1.414));
      const P = cands.reduce((m, c) => cout(c) < cout(m) ? c : m, cands[0]);
      P.pos.forEach(({ r, x, y }) => { const dx = (x + PAD) - r.b.x0, dy = (y + PAD) - r.b.y0; if (!dx && !dy) return;
        r.g.forEach(n => { xDe.set(n, xDe.get(n) + dx); glisser(n, dy); });
        pastilles.forEach(sp => { if (r.g.includes(sp.id)) { sp.y1 += dy; sp.y2 += dy; } }); }); } }
  // serpentin : les rangées se remettent l'une sous l'autre par translation RIGIDE
  if (SERP > 0 && nRang > 1) { const parRangee = Array.from({ length: nRang }, () => []); ids.forEach(n => parRangee[rangeeDe.get(n) || 0].push(n));
    let y = HAUT_PAGE;
    parRangee.forEach(grp => { if (!grp.length) return; let lo = Infinity, hi = -Infinity; grp.forEach(id => { lo = Math.min(lo, hautDe.get(id)); hi = Math.max(hi, basDe.get(id)); });
      if (!isFinite(lo)) return; const dy = y - lo; if (dy) grp.forEach(id => glisser(id, dy)); y += (hi - lo) + RANGEE_GAP; });
    pastilles.forEach(sp => { sp.y1 = hautDe.get(sp.id); sp.y2 = basDe.get(sp.id); }); }
  let yMin = Infinity, yMax = -Infinity;
  ids.forEach(id => { yMin = Math.min(yMin, hautDe.get(id)); yMax = Math.max(yMax, basDe.get(id)); });
  if (!isFinite(yMin)) { yMin = HAUT_PAGE; yMax = HAUT_PAGE + 200; }

  /* ===== 10. LES BLOCS ET LES LIAISONS, PRÊTS À DESSINER ================= */
  const comps = [], compDe = new Map();
  for (const id of ids) { const N = noeuds.get(id); const x = xDe.get(id), haut = hautDe.get(id), bas = basDe.get(id); const ls = listes.get(id);
    const parCle = new Map(); const rangs = {};
    clesListes(id).forEach(lid => { rangs[lid] = liste(id, lid).map(p => { const py = yBroche.get(id + SEP + p.cle); parCle.set(p.cle, { y: py });
      let g = 0, d = 0; (partenaires.get(id + SEP + p.cle) || []).forEach(q => { if (q.id === id) return; const dc = (colonneDe.get(q.id) ?? 0) - (colonneDe.get(id) ?? 0); if (dc < 0) g++; else if (dc > 0) d++; });
      return { etiq: p.etiq, y: py, dir: (d && !g) ? 1 : ((g && !d) ? -1 : 0) }; }); });
    const tag = estPastille(id);
    const c = { name: N.nom, id, x, y: haut, w: largeurDe(id), h: bas - haut, col: colonneDe.get(id),
      kind: tag ? 'tag' : (ls.S ? 'strip' : 'equip'), lw: tag ? 0 : STRIPW, rw: tag ? 0 : STRIPW, rangs, parCle, rail: estRail(N.nom) };
    comps.push(c); compDe.set(id, c); if (!compDe.has(N.nom)) compDe.set(N.nom, c); }
  const links = lk.map((l, li) => { const A = bouts.get(li + ':A'), B = bouts.get(li + ':B'); const ia = nid(A.nom, A.cle), ib = nid(B.nom, B.cle);
    const sA = flancDuBout(A.nom, A.cle, B.nom, B.cle), sB = flancDuBout(B.nom, B.cle, A.nom, A.cle); const cA = compDe.get(ia), cB = compDe.get(ib);
    return { i: li, ...l, boucle: l.de === l.vers && l.borneDe === l.borneVers, shunt: shunts.has(li),
      epA: { x: sA === 'R' ? cA.x + cA.w : cA.x, y: cA.parCle.get(A.cle).y, ch: goulotteDuBout(ia, sA), stub: sA === 'R' ? 'L' : 'R' },
      epB: { x: sB === 'R' ? cB.x + cB.w : cB.x, y: cB.parCle.get(B.cle).y, ch: goulotteDuBout(ib, sB), stub: sB === 'R' ? 'L' : 'R' } }; });
  // le cadre se cale sur les blocs dessinés, marges proportionnées, réserve pour le cartouche
  const cx0 = Math.min(...comps.map(c => c.x)), cx1 = Math.max(...comps.map(c => c.x + c.w));
  const cw0 = cx1 - cx0, ch0 = yMax - yMin, resv = 30;
  const mx = Math.max(50, Math.min(150, cw0 * 0.07)), mt = Math.max(50, Math.min(150, ch0 * 0.07)), mb = Math.max(95, Math.min(150, ch0 * 0.07));
  const bbox = { x: cx0 - resv - mx, y: yMin - mt, w: (cx1 + resv + mx) - (cx0 - resv - mx), h: (yMax + mb) - (yMin - mt) };
  // on tend vers le format A3 sans jamais ajouter plus d'un tiers de vide
  const A3 = (cw0 / Math.max(1, ch0) < 1) ? (1 / 1.414) : 1.414, GONFLE = 1.35, r0 = bbox.w / bbox.h;
  if (r0 < A3) { const nw = Math.min(bbox.h * A3, bbox.w * GONFLE); if (nw > bbox.w) { bbox.x -= (nw - bbox.w) / 2; bbox.w = nw; } }
  else if (r0 > A3) { const nh = Math.min(bbox.w / A3, bbox.h * GONFLE); if (nh > bbox.h) { bbox.y -= (nh - bbox.h) / 2; bbox.h = nh; } }
  return { comps, links, bbox, compDe, geom: { colonnes, colonneDe, colX, colW, chW, nCols, yMin, yMax, pastilles, rangees: SERP > 0 ? nRang : 0 } };
}

/* Largeur réellement occupée par les pistes de chaque goulotte, pour resserrer
   les colonnes au second tour. */
function goulottesOccupees(L) {
  const g = L.geom; if (!g.colX.length) return null;
  const gx = i => i === 0 ? (g.colX[0] - g.chW[0]) : g.colX[i - 1] + g.colW[i - 1];
  const maxOff = new Array(g.nCols + 1).fill(0);
  L.routage.fils.forEach(w => { for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1];
    if (Math.abs(a.x - b.x) > 0.5) continue; const x = a.x;
    for (let ch = 0; ch <= g.nCols; ch++) { const x0 = gx(ch); if (x >= x0 - 2 && x <= x0 + g.chW[ch] + 2) { maxOff[ch] = Math.max(maxOff[ch], x - x0); break; } } } });
  return maxOff.map((o, i) => Math.max(54, Math.min(g.chW[i], o + 26)));
}

/* ===========================================================================
   LE CONCOURS : sept graines, routées pour de vrai, la plus droite gagne.
   Mesuré : les graines seules rendent exactement ce que rendaient vingt-deux
   candidats — regroupement, éclatement, resserrage, condensation n'ont jamais
   changé un pixel. Puis le SECOURS : un dessin en ruban (plus de 2,2 fois plus
   large que haut) se replie en rangées, si ça rapproche nettement le format
   du papier sans plier plus d'un fil par report.
   =========================================================================== */
function meilleurPlacement(liaisons) {
  const G = construireGraphe(liaisons);
  if (!G.ids.length) return null;
  const nB = G.ids.length;
  const graines = nB > 600 ? [0] : (nB <= 120 ? [0, 'loin', 1, 2, 3, 4, 5] : (nB <= 400 ? [0, 'loin', 1, 2, 3] : [0, 'loin']));
  const filsDansBloc = L => { let n = 0;
    L.routage.fils.forEach(w => { for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1];
      const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
      for (const c of L.comps) { if (x1 > c.x + 2 && x0 < c.x + c.w - 2 && y1 > c.y + 2 && y0 < c.y + c.h - 2) { n++; break; } } } }); return n; };
  const essayer = o => { const L = placer(G, o); L.routage = router(L); return L; };
  const emprise = L => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    L.comps.forEach(c => { x0 = Math.min(x0, c.x); x1 = Math.max(x1, c.x + c.w); y0 = Math.min(y0, c.y); y1 = Math.max(y1, c.y + c.h); });
    return { w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) }; };
  const A3 = 1.414, ecart = L => { const e = emprise(L), r = e.w / e.h; return r > A3 ? r / A3 : A3 / r; };
  // chaque graine, feuilles à droite puis équilibrées : la droiture décide,
  // puis les croisements, puis la longueur des barrettes, puis le format
  let best = null, bScore = -1e18, bOpt = {}, bPeignes = Infinity, bEcart = Infinity;
  const candidats = []; graines.forEach(g => { candidats.push({ graine: g }); if (nB <= 120) candidats.push({ graine: g, equilibrer: true }); });
  candidats.forEach(o => { const L = essayer(o);
    const peignes = L.routage.barrettes.reduce((t, b) => t + Math.abs(b.y2 - b.y1), 0), ec = ecart(L);
    const score = compterDroits(L.routage.fils) - compterCroisements(L.routage.fils, L.routage.barrettes) / 120;
    if (score > bScore || (score === bScore && (peignes < bPeignes || (peignes === bPeignes && ec < bEcart - 0.01)))) {
      best = L; bScore = score; bPeignes = peignes; bEcart = ec; bOpt = o; } });
  // resserrage : les goulottes reprennent la largeur que les pistes occupent
  // vraiment ; gardé si le dessin rétrécit d'au moins 3 % sans perdre plus d'un fil droit
  const largeur = L => Math.max(...L.comps.map(c => c.x + c.w));
  let bGoulottes = null;
  { const fix = goulottesOccupees(best);
    if (fix) { const L2 = essayer({ ...bOpt, goulottes: fix });
      if (compterDroits(L2.routage.fils) >= compterDroits(best.routage.fils) - 1 && largeur(L2) < largeur(best) * 0.97 && filsDansBloc(L2) <= filsDansBloc(best)) { best = L2; bGoulottes = fix; } } }
  // condensation par glissement de broches : gardée si aucun fil droit n'est
  // perdu et pas plus de croisements — elle rend les blocs compacts
  { const L3 = essayer({ ...bOpt, goulottes: bGoulottes, condenser: true });
    const s3 = compterDroits(L3.routage.fils), s0 = compterDroits(best.routage.fils);
    const c3 = compterCroisements(L3.routage.fils, L3.routage.barrettes), c0 = compterCroisements(best.routage.fils, best.routage.barrettes);
    if (filsDansBloc(L3) <= filsDansBloc(best) && (s3 > s0 || (s3 === s0 && c3 <= c0))) best = L3; }
  // secours : serpentin
  const e0 = emprise(best), r0 = e0.w / e0.h, nc = best.geom.nCols;
  if (r0 > 2.2 && nc >= 4) {
    const R0 = Math.max(2, Math.min(6, Math.round(Math.sqrt(r0 / A3)))); const s0 = compterDroits(best.routage.fils);
    const densite = L => { const e = emprise(L); let a = 0; L.comps.forEach(c => a += c.w * c.h); return a / (e.w * e.h); };
    let d0 = ecart(best), q0 = 0; const vus = new Set();
    [R0, R0 + 1, R0 + 2, R0 - 1].filter(k => k >= 2).forEach(k => { const W = Math.ceil(nc / k); if (W < 2 || vus.has(W)) return; vus.add(W);
      let L = null; try { L = essayer({ ...bOpt, goulottes: bGoulottes, serpentin: W }); } catch (e) { return; }
      if (!L || filsDansBloc(L) > 0) return;
      if (compterDroits(L.routage.fils) < s0 - k) return;
      const d = ecart(L), q = densite(L);
      if (d < d0 * 0.9 || (best.geom.rangees && d < d0 * 1.1 && q > q0)) { best = L; d0 = Math.min(d0, d); q0 = q; } });
  }
  return best;
}
