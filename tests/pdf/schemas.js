/* ===========================================================================
   LES SCHÉMAS D'ESSAI DU LECTEUR DE PDF — trois styles dont on sait la vérité
   ---------------------------------------------------------------------------
   Le banc (tests/pdf.js) mesure ce que Volta retrouve dans un PDF de schéma.
   Les folios de Volta ne suffisent pas : ils sont tous dessinés de la même
   main. Ce générateur dessine, en SVG (des millimètres, un A3 paysage), des
   folios d'autres mains, et rend la vérité de chacun :

     A « cadres »    les numéros de borne écrits DANS le cadre, contre le bord ;
                     le repère dans le cadre, la référence dessous ; police à
                     empattements ; types de câble le long des traits.
     B « debout »    les équipements en rangées, les fils verticaux ; les
                     numéros de borne et des repères TOURNÉS à 90° ; les cadres
                     dessinés en quatre traits séparés ; police sans empattement.
     C « renvois »   le repère écrit AU-DESSUS du cadre, la référence dedans,
                     les numéros de borne DEHORS sur le fil ; des RENVOIS d'un
                     folio à l'autre (une flèche, « 2/B3 ») ; des T sans point ;
                     police à chasse fixe.
     D « ailleurs »  la disposition de A, mais des repères d'une autre
                     convention (J105, K112, CB-120) : Volta les devine (le
                     texte le plus grand du cadre).
   Partout : des traits orthogonaux, des points de jonction sur les T, des
   croisements SANS point (qui ne relient rien), des masses, des prises de
   coupure (le même numéro des deux côtés), un cartouche, des repères de zone.

   La vérité d'un réseau à trois bouts ou plus : les liaisons que le dessin trace
   de proche en proche — l'arbre couvrant le plus court entre les bouts, mesuré
   le long des traits que le générateur a posés (le même principe que le lecteur,
   calculé ici sur la géométrie exacte, sans rien lire du PDF).
   Tout est déterministe (une graine par style).
   =========================================================================== */
'use strict';

const W = 420, H = 297;   // A3 paysage, en mm
function hasard(graine) { let a = graine >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const f = x => (Math.round(x * 100) / 100).toString();
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/* ---- le dessin : une liste de primitives, puis le SVG ------------------------------------------------------------ */
function toile(police) { const out = [];
  return { out, police,
    ligne(x1, y1, x2, y2, ep = 0.25) { out.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="#111" stroke-width="${ep}" stroke-linecap="round"/>`); },
    poly(pts, ep = 0.25) { out.push(`<polyline points="${pts.map(p => f(p[0]) + ',' + f(p[1])).join(' ')}" fill="none" stroke="#111" stroke-width="${ep}" stroke-linejoin="round"/>`); },
    rect(x, y, w, h, ep = 0.35) { out.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="none" stroke="#111" stroke-width="${ep}"/>`); },
    rectChemin(x, y, w, h, ep = 0.35) { out.push(`<path d="M${f(x)} ${f(y)}H${f(x + w)}V${f(y + h)}H${f(x)}Z" fill="#fff" stroke="#111" stroke-width="${ep}"/>`); },
    rectQuatre(x, y, w, h, ep = 0.35) { this.ligne(x, y, x + w, y, ep); this.ligne(x + w, y, x + w, y + h, ep); this.ligne(x + w, y + h, x, y + h, ep); this.ligne(x, y + h, x, y, ep); },
    point(x, y, r = 0.6) { out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="#111"/>`); },
    fleche(x, y, sens) { const s = sens; out.push(`<path d="M${f(x)} ${f(y)}L${f(x - s * 2.4)} ${f(y - 1)}L${f(x - s * 2.4)} ${f(y + 1)}Z" fill="#111"/>`); },
    texte(x, y, s, o = {}) { const t = o.angle ? ` transform="rotate(${o.angle} ${f(x)} ${f(y)})"` : '';
      out.push(`<text x="${f(x)}" y="${f(y)}" font-family="${o.police || police}" font-size="${o.taille || 2.2}" font-weight="${o.gras ? 700 : 400}" text-anchor="${o.ancre || 'start'}"${t} fill="#111">${esc(s)}</text>`); },
    svg() { return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#fff"/>${out.join('')}</svg>`; } }; }

/* le cadre de la feuille, ses repères de zone (des chiffres en haut, des lettres à gauche), le cartouche */
function feuille(T, cart, style) { const x0 = 15, y0 = 12, x1 = W - 10, y1 = H - 10; T.rect(x0, y0, x1 - x0, y1 - y0, 0.5);
  const nc = 8, nl = 6;
  for (let i = 0; i < nc; i++) { const x = x0 + (i + 0.5) * (x1 - x0) / nc; T.texte(x, y0 - 3, String(i + 1), { ancre: 'middle', taille: 2.6 }); if (i) T.ligne(x0 + i * (x1 - x0) / nc, y0, x0 + i * (x1 - x0) / nc, y0 - 2, 0.2); }
  for (let j = 0; j < nl; j++) { const y = y0 + (j + 0.5) * (y1 - y0) / nl; T.texte(x0 - 4.5, y + 1, 'ABCDEF'[j], { ancre: 'middle', taille: 2.6 }); if (j) T.ligne(x0, y0 + j * (y1 - y0) / nl, x0 - 2, y0 + j * (y1 - y0) / nl, 0.2); }
  // le cartouche, en bas à droite
  const cw = 150, ch = 30, cx = x1 - cw, cy = y1 - ch; T.rect(cx, cy, cw, ch, 0.45);
  const cases = style === 'B'
    ? [[cx, cy, 100, 15, 'Titre : ' + cart.titre], [cx + 100, cy, 50, 15, 'Folio : ' + cart.folio + '/' + cart.folios], [cx, cy + 15, 100, 15, 'N° : ' + cart.numero], [cx + 100, cy + 15, 50, 15, 'Indice : ' + cart.indice]]
    : style === 'C'
      ? [[cx, cy, 150, 12, null, 'TITLE', cart.titre], [cx, cy + 12, 80, 18, null, 'DOCUMENT', cart.numero], [cx + 80, cy + 12, 35, 18, null, 'SHEET', cart.folio + ' / ' + cart.folios], [cx + 115, cy + 12, 35, 18, null, 'REV.', cart.indice]]
      : [[cx, cy, 150, 12, null, 'TITRE', cart.titre], [cx, cy + 12, 70, 18, null, 'N° DE PLAN', cart.numero], [cx + 70, cy + 12, 40, 18, null, 'FOLIO', cart.folio + ' / ' + cart.folios], [cx + 110, cy + 12, 40, 18, null, 'INDICE', cart.indice]];
  cases.forEach(([x, y, w, h, ligne, et, val]) => { if (x > cx) T.ligne(x, y, x, y + h, 0.25); if (y > cy) T.ligne(cx, y, cx + cw, y, 0.25);
    if (ligne) T.texte(x + 2, y + h / 2 + 1.2, ligne, { taille: 3 });
    else { T.texte(x + 2, y + 3.6, et, { taille: 2 }); T.texte(x + 2, y + h - 3.5, val, { taille: 3.6, gras: true }); } });
  return { x0, y0, x1, y1, zone: (x, y) => 'ABCDEF'[Math.max(0, Math.min(nl - 1, Math.floor((y - y0) / ((y1 - y0) / nl))))] + (Math.max(0, Math.min(nc - 1, Math.floor((x - x0) / ((x1 - x0) / nc)))) + 1) }; }

/* ---- la vérité d'un réseau dessiné : l'arbre couvrant le plus court entre ses bouts, le long des segments ------- */
function veriteDuReseau(segs, bouts) { const cle = p => f(p[0]) + ',' + f(p[1]), adj = new Map(), ajout = (a, b, L) => { (adj.get(a) || adj.set(a, []).get(a)).push([b, L]); };
  // un segment est coupé à chaque sommet posé sur lui (les T)
  const pts = [...new Set(segs.flatMap(([a, b]) => [cle(a), cle(b)]))].map(k => k.split(',').map(Number));
  segs.forEach(([a, b]) => { const sur = pts.filter(p => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), t = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / (L * L);
      const q = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]; return t >= -1e-3 && t <= 1 + 1e-3 && Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.02; })
      .sort((p, q) => Math.hypot(p[0] - a[0], p[1] - a[1]) - Math.hypot(q[0] - a[0], q[1] - a[1]));
    for (let i = 1; i < sur.length; i++) { const L = Math.hypot(sur[i][0] - sur[i - 1][0], sur[i][1] - sur[i - 1][1]); ajout(cle(sur[i - 1]), cle(sur[i]), L); ajout(cle(sur[i]), cle(sur[i - 1]), L); } });
  const D = bouts.map(b => { const d = new Map([[cle(b.p), 0]]), file = [cle(b.p)];
    while (file.length) { file.sort((x, y) => d.get(x) - d.get(y)); const n = file.shift(); (adj.get(n) || []).forEach(([m, L]) => { if (d.get(n) + L < (d.has(m) ? d.get(m) : Infinity)) { d.set(m, d.get(n) + L); file.push(m); } }); }
    return d; });
  const paires = []; for (let i = 0; i < bouts.length; i++) for (let j = i + 1; j < bouts.length; j++) paires.push([i, j, D[i].get(cle(bouts[j].p))]);
  if (paires.some(q => q[2] == null)) throw new Error('réseau non connexe dans le générateur'); paires.sort((a, b) => a[2] - b[2]); const g = bouts.map((_, i) => i), r = i => g[i] === i ? i : (g[i] = r(g[i])), out = [];
  paires.forEach(([i, j]) => { if (r(i) === r(j)) return; g[r(i)] = r(j); out.push([bouts[i], bouts[j]]); });
  return out; }

/* ---- un folio : des équipements en colonnes (A, C) ou en rangées (B), reliés par des fils orthogonaux ------------ */
const CODES = ['RL', 'CP', 'LP', 'SW', 'PM', 'VL', 'ST', 'HT', 'MT', 'PR', 'XC', 'TB', 'CB'];
const PNS = ['EN2997Y1A08P', 'EN2997Y1A12S', 'MS3320-10', 'NSA937802-03', 'E0836IS35-22SA', 'ABS0864-12', 'EN3645W1214AN', 'D38999/26WB35PN', 'MS27467T15B35P', 'EN4165-2M'];
const TYPES = ['DR20', 'DR22', 'DR24', 'MLB22', 'MLB24', 'DR16'];
function folio(style, rnd, n, total, cart, renvoisEntrants, prefixe) {
  const T = toile({ A: 'Liberation Serif', B: 'Liberation Sans', C: 'Courier 10 Pitch', D: 'DejaVu Sans' }[style]), F = feuille(T, { ...cart, folio: n, folios: total }, style);
  const liaisons = [], renvoisSortants = [], P = 6, tx = style === 'C' ? 2.4 : 2.2;   // le pas des bornes ; la taille des numéros
  const debout = style === 'B';
  // --- les équipements : trois colonnes (ou trois rangées), deux à trois chacune
  const lignes = debout ? [30, 125, 220] : [38, 168, 300], eqs = [];
  let num = 100 + n * 30 + (prefixe || 0);
  const nouveauRepere = (code, i) => style === 'D' ? ['J', 'K', 'P', 'CB-', 'X'][Math.floor(rnd() * 5)] + (num + i)   // une autre convention que 102CB1
    : (num + i) + (code || CODES[Math.floor(rnd() * CODES.length)]) + (1 + Math.floor(rnd() * 3));
  const commeA = style === 'A' || style === 'D';
  lignes.forEach((base, c) => { const nb = debout ? 3 : commeA ? (c < 2 ? 4 : 3) : 2 + (rnd() < 0.5 ? 1 : 0); let pos = debout ? 45 : 28;
    for (let k = 0; k < nb; k++) {
      const prise = c === 1 && k === 1 && !debout ? true : (debout && c === 1 && k === 0);
      const nG = c === 0 ? 0 : prise ? 0 : 2 + Math.floor(rnd() * 4), nD = c === 2 ? (style === 'C' && n < total ? 2 : 0) : prise ? 0 : 3 + Math.floor(rnd() * 4), nPr = prise ? 4 + Math.floor(rnd() * 3) : 0;
      const nRe = c === 0 && style === 'C' && renvoisEntrants && renvoisEntrants.length && k === 0 ? renvoisEntrants.length : 0;
      const nb2 = Math.max(nG, nD, nPr, nRe), long = Math.max(4, nb2) * P + 8, epais = prise ? 8 : debout ? 34 : 40;
      const off = c % 2 ? P / 2 : 0;
      const e = { rep: prise ? (num + 60 + k) + 'VC' + (1 + k) + 'A' : nouveauRepere(c === 0 && k === 0 ? 'CP' : null, eqs.length * 3 + 1), pn: prise ? 'EN3646A6083AAN' : PNS[Math.floor(rnd() * PNS.length)], prise, bornes: [] };
      // la place : un axe (x en colonnes, y en rangées), et le pas des bornes décalé d'une demi-borne une colonne sur deux
      const debut = Math.ceil((pos + 4 - off) / P) * P + off;
      if (!debout) { e.x = base; e.y = debut - 4; e.w = epais; e.h = long; } else { e.y = base; e.x = debut - 4; e.h = epais; e.w = long; }
      pos = (debout ? e.x + e.w : e.y + e.h) + 14 + rnd() * 6;
      const noms = (k2, cote) => { const genre = (commeA ? ['n', 'n', 'l'] : style === 'B' ? ['n', 'L'] : ['n', 'n'])[Math.floor(rnd() * (commeA ? 3 : 2))];
        return genre === 'l' ? 'AB'[cote === 'D' ? 1 : 0] + (k2 + 1) : genre === 'L' ? 'ABCDEFGHJK'[k2] : String(k2 + 1 + (cote === 'D' && nG ? nG : 0)); };
      for (let i = 0; i < (prise ? nPr : nG); i++) e.bornes.push({ nom: prise ? String(i + 1) : noms(i, 'G'), cote: 'G', t: debut + i * P });
      for (let i = 0; i < (prise ? nPr : nD); i++) e.bornes.push({ nom: prise ? String(i + 1) : noms(i, 'D'), cote: 'D', t: debut + i * P });
      for (let i = 0; i < nRe; i++) e.bornes.push({ nom: noms(i, 'G') === String(i + 1) ? 'R' + (i + 1) : String(20 + i), cote: 'G', t: debut + i * P, renvoi: true });
      // un nom de borne n'est qu'une fois par équipement (une prise : le même des deux côtés)
      const vus = new Set(); e.bornes.forEach(b => { if (prise) return; while (vus.has(b.nom)) b.nom = String(+b.nom + 7 || b.nom + '1'); vus.add(b.nom); });
      eqs.push({ ...e, c }); } });
  // le point où le fil touche une borne, et le sens d'où il vient
  const ancre = (e, b) => debout ? [b.t, b.cote === 'G' ? e.y : e.y + e.h] : [b.cote === 'G' ? e.x : e.x + e.w, b.t];
  // --- dessiner les équipements
  eqs.forEach(e => { const Rc = style === 'B' ? T.rectQuatre.bind(T) : style === 'C' ? T.rectChemin.bind(T) : T.rect.bind(T); Rc(e.x, e.y, e.w, e.h, 0.35);
    const ver = debout && e.prise, cx = e.x + e.w / 2;
    if (style === 'C') T.texte(e.x, e.y - 1.6, e.rep, { taille: 3.2, gras: true });
    else if (e.prise && !debout) T.texte(cx, e.y - 2, e.rep, { taille: 3.2, gras: true, ancre: 'middle' });
    else if (ver || (debout && e.c === 1)) T.texte(cx + 1.2, e.y + e.h / 2, e.rep, { taille: 3.2, gras: true, angle: -90, ancre: 'middle' });
    else T.texte(cx, e.y + (debout ? e.h / 2 + 1 : 5.5), e.rep, { taille: 3.4, gras: true, ancre: 'middle' });
    if (!e.prise) { if (style === 'C') T.texte(cx, e.y + e.h / 2 + 1, e.pn, { taille: 2, ancre: 'middle' }); else if (debout) { if (e.c === 1) T.texte(cx + 4.5, e.y + e.h / 2, e.pn, { taille: 2, ancre: 'middle', angle: -90 }); else T.texte(cx, e.c === 0 ? e.y - 2 : e.y + e.h + 4, e.pn, { taille: 2, ancre: 'middle' }); } else T.texte(cx, e.y + e.h + 3.4, e.pn, { taille: 2, ancre: 'middle' }); }
    e.bornes.forEach(b => { const [x, y] = ancre(e, b);
      if (e.prise) { if (b.cote === 'G') { if (debout) T.texte(x + 0.8, e.y + e.h / 2 + 0.8, b.nom, { taille: tx, ancre: 'middle', angle: -90 }); else T.texte(cx, y + 0.8, b.nom, { taille: tx, ancre: 'middle' }); } return; }
      if (commeA) T.texte(b.cote === 'G' ? x + 1.4 : x - 1.4, y + 0.8, b.nom, { taille: tx, ancre: b.cote === 'G' ? 'start' : 'end' });
      else if (debout) T.texte(x + 0.8, b.cote === 'G' ? y + 1.4 : y - 1.4, b.nom, { taille: tx, angle: -90, ancre: b.cote === 'G' ? 'end' : 'start' });
      else T.texte(b.cote === 'G' ? x - 1.2 : x + 1.2, y - 0.7, b.nom, { taille: tx, ancre: b.cote === 'G' ? 'end' : 'start' }); }); });
  // --- un cadre de groupe en pointillé autour de la colonne du milieu (style A) : il ne relie rien
  if (style === 'A') { const C1 = eqs.filter(e => e.c === 1), y0 = Math.min(...C1.map(e => e.y)) - 9, y1 = Math.max(...C1.map(e => e.y + e.h)) + 7;
    T.out.push(`<rect x="${f(160)}" y="${f(y0)}" width="56" height="${f(y1 - y0)}" fill="none" stroke="#111" stroke-width="0.3" stroke-dasharray="3 1.6"/>`); T.texte(162, y0 + 3, 'BAIE AVIONIQUE', { taille: 2 }); }
  // --- les fils, canal par canal (entre deux colonnes) : des paires, des réseaux à trois bouts, des masses
  const canaux = [[0, 1], [1, 2]], fils = [];
  const cotes = (e, cote) => e.bornes.filter(b => b.cote === cote && !b.renvoi);
  canaux.forEach(([c1, c2]) => {
    const R = eqs.filter(e => e.c === c1).flatMap(e => cotes(e, 'D').map(b => ({ e, b }))), L = eqs.filter(e => e.c === c2).flatMap(e => cotes(e, 'G').map(b => ({ e, b })));
    const melange = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    melange(R); melange(L);
    const reseaux = [];
    while (R.length && L.length) { const x = rnd();
      if (x < 0.12 && R.length) { reseaux.push({ masse: R.pop() }); continue; }
      if (x < 0.2 && L.length) { reseaux.push({ masse: L.pop() }); continue; }
      if (x < 0.34 && L.length >= 2) { reseaux.push({ bouts: [R.pop(), L.pop(), L.pop()] }); continue; }
      if (x < 0.42 && R.length >= 2) { reseaux.push({ bouts: [R.pop(), R.pop(), L.pop()] }); continue; }
      reseaux.push({ bouts: [R.pop(), L.pop()] }); }
    // une borne restée seule : le style A y laisse un bout de fil qui n'arrive nulle part (un orphelin, hors de la vérité)
    if (style === 'A' && R.length && c1 === 0) reseaux.push({ orphelin: R.pop() });
    // le canal : des pistes (x en colonnes, y en rangées), une par réseau
    const bord1 = Math.max(...eqs.filter(e => e.c === c1).map(e => debout ? e.y + e.h : e.x + e.w)), bord2 = Math.min(...eqs.filter(e => e.c === c2).map(e => debout ? e.y : e.x));
    const pistes = reseaux.filter(r => r.bouts), a0 = bord1 + 14, a1 = bord2 - 14, pas = (a1 - a0) / Math.max(1, pistes.length - 1);
    pistes.forEach((r, i) => { r.piste = a0 + i * pas; });
    reseaux.forEach(r => fils.push(r)); });
  const dessin = [];   // [segments] par réseau, pour la vérité
  fils.forEach(r => {
    if (r.orphelin) { const [x, y] = ancre(r.orphelin.e, r.orphelin.b); T.ligne(x, y, x + 9, y); return; }
    if (r.masse) { const { e, b } = r.masse, [x, y] = ancre(e, b), s = b.cote === 'G' ? -1 : 1, nom = (900 + Math.floor(rnd() * 90)) + 'G';
      if (debout) { const y2 = y + s * 6; T.ligne(x, y, x, y2); T.ligne(x - 2, y2, x + 2, y2, 0.3); T.ligne(x - 1.3, y2 + s * 1, x + 1.3, y2 + s * 1, 0.3); T.ligne(x - 0.6, y2 + s * 2, x + 0.6, y2 + s * 2, 0.3); T.texte(x + 2.6, y2 + s * 1 + 1, nom, { taille: 2 }); }
      else { const x2 = x + s * 6; T.ligne(x, y, x2, y); T.ligne(x2, y - 2, x2, y + 2, 0.3); T.ligne(x2 + s * 1, y - 1.3, x2 + s * 1, y + 1.3, 0.3); T.ligne(x2 + s * 2, y - 0.6, x2 + s * 2, y + 0.6, 0.3); T.texte(x2 + s * 1, y + 4.6, nom, { taille: 2, ancre: 'middle' }); }
      liaisons.push({ de: e.rep, borneDe: b.nom, vers: nom, borneVers: '' }); return; }
    const B = r.bouts.map(o => ({ ...o, p: ancre(o.e, o.b) })), segs = [], k = r.piste;
    // chaque bout rejoint la piste par un trait droit ; la piste court du plus haut au plus bas
    B.forEach(o => { const q = debout ? [o.p[0], k] : [k, o.p[1]]; segs.push([o.p, q]); });
    const sur = B.map(o => debout ? o.p[0] : o.p[1]), m0 = Math.min(...sur), m1 = Math.max(...sur);
    segs.push(debout ? [[m0, k], [m1, k]] : [[k, m0], [k, m1]]);
    // un fil se dessine d'un seul trait brisé (A, C : comme un logiciel de schéma l'exporte), ou en segments séparés (B) ;
    // un réseau à trois bouts : le trait brisé d'un bout extrême à l'autre, les bouts du milieu en T dessus
    if (debout) segs.forEach(([a, b]) => T.ligne(a[0], a[1], b[0], b[1]));
    else { const i0 = sur.indexOf(m0), i1 = sur.lastIndexOf(m1); T.poly([B[i0].p, [k, m0], [k, m1], B[i1].p]); B.forEach((o, i) => { if (i !== i0 && i !== i1) T.ligne(o.p[0], o.p[1], k, o.p[1]); }); }
    // un T au milieu de la piste : un point de jonction (le style C en oublie un sur deux : un T se lit sans point)
    B.forEach((o, i) => { const v = sur[i]; if (v > m0 + 1e-6 && v < m1 - 1e-6 && !(style === 'C' && i % 2)) T.point(debout ? v : k, debout ? k : v); });
    // un type de câble le long d'un trait, une fois sur trois
    if (style !== 'B' && rnd() < 0.4) { const o = B[0], [x, y] = o.p, s = o.b.cote === 'D' ? 1 : -1; T.texte(debout ? x : x + s * 9, debout ? y : y - 0.8, TYPES[Math.floor(rnd() * TYPES.length)], { taille: 1.9, ancre: 'middle' }); }
    veriteDuReseau(segs, B).forEach(([x, y]) => liaisons.push({ de: x.e.rep, borneDe: x.b.nom, vers: y.e.rep, borneVers: y.b.nom }));
    dessin.push(segs); });
  // --- les renvois (style C) : des bornes de droite partent vers le folio suivant ; celles de gauche arrivent du précédent
  if (style === 'C') {
    eqs.filter(e => e.c === 2).forEach(e => e.bornes.filter(b => b.cote === 'D').forEach((b, i) => { const [x, y] = ancre(e, b), xe = F.x1 - 22 - i * 0;
      T.ligne(x, y, xe, y); T.fleche(xe + 2.4, y, 1); renvoisSortants.push({ rep: e.rep, borne: b.nom, y, x: xe }); }));
    (renvoisEntrants || []).forEach((rv, i) => { const e = eqs.find(e => e.c === 0 && e.bornes.some(b => b.renvoi)); const b = e.bornes.filter(b => b.renvoi)[i]; const [x, y] = ancre(e, b), xs = F.x0 + 14;
      T.ligne(xs, y, x, y); T.fleche(xs, y, 1); T.texte(xs - 3, y + 0.8, rv.depuis, { taille: 2.2, ancre: 'end' }); rv.arrivee = { rep: e.rep, borne: b.nom, y }; liaisons.push({ de: rv.rep, borneDe: rv.borne, vers: e.rep, borneVers: b.nom, renvoi: true }); });
  }
  return { T, F, liaisons, renvoisSortants, eqs }; }

/* Un style : ses folios, leurs SVG, la vérité. Les renvois du style C s'écrivent quand on connaît où ils arrivent. */
function style(nom, graine, nFolios) { const rnd = hasard(graine), cart = { titre: { A: 'Distribution avionique', B: 'Faisceau plancher', C: 'Cabin harness', D: 'Instrument panel' }[nom], numero: { A: 'PL-4471-020', B: 'FX 2210 33', C: 'HN-2041-07', D: 'IP-77-310' }[nom], indice: { A: 'C', B: 'B', C: 'D', D: 'A' }[nom] };
  const folios = []; let entrants = null;
  for (let n = 1; n <= nFolios; n++) { const r = folio(nom, rnd, n, nFolios, cart, entrants, 0); folios.push(r);
    // les renvois sortants de ce folio arriveront au suivant ; leur texte dit le folio et la zone d'arrivée
    entrants = r.renvoisSortants.length ? r.renvoisSortants.map(s => ({ ...s, depuis: n + '/' + r.F.zone(s.x, s.y) })) : null;
    if (entrants) entrants.forEach(s => { s.rep = s.rep; s.borne = s.borne; }); }
  // écrire, sur chaque folio, le texte du renvoi sortant : le folio suivant et la zone où il arrive
  folios.forEach((r, i) => { const suiv = folios[i + 1]; if (!suiv) return; const arr = suiv.liaisons.filter(l => l.renvoi);
    r.renvoisSortants.forEach((s, k) => { const a = arr[k]; const ys = suiv.eqs.find(e => e.rep === a.vers).bornes.find(b => b.nom === a.borneVers);
      const y = suiv.eqs.find(e => e.rep === a.vers); const zone = suiv.F.zone(suiv.F.x0 + 14, ys.t);
      r.T.texte(s.x + 4, s.y + 0.8, (i + 2) + '/' + zone, { taille: 2.2 }); }); });
  return { nom, pages: folios.map(r => r.T.svg()), verite: folios.flatMap((r, i) => r.liaisons.map(l => ({ de: l.de, borneDe: l.borneDe, vers: l.vers, borneVers: l.borneVers, folio: i + 1 }))) }; }

function schemasDEssai() { return [style('A', 4471, 2), style('B', 2210, 2), style('C', 2041, 3), style('D', 5150, 1)]; }
/* Une page HTML qui imprime les folios d'un style, un par page A3 (Chromium, page.pdf). */
const pageHtml = S => `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:420mm 297mm;margin:0}html,body{margin:0}svg{display:block;width:420mm;height:297mm;page-break-after:always}</style></head><body>${S.pages.join('')}</body></html>`;
module.exports = { schemasDEssai, pageHtml, veriteDuReseau };
