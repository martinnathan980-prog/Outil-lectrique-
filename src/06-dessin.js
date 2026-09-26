/* ===========================================================================
   06 — LE DESSIN
   Du placement et du routage on tire la planche : une feuille au format A
   avec ses zones et son cartouche, les fils, les numéros de fil, les
   barrettes, et un symbole par nature de matériel.

   UNE SEULE ENCRE. Ce qui distingue une pièce d'une autre, c'est l'épaisseur
   et la forme du trait, jamais sa couleur : 1,8 la barrette, 1,0 le corps
   d'un matériel, 0,95 un fil, 0,7 une boîte de bornes, 0,5 une cellule.
   Ça s'imprime en noir et blanc.
   =========================================================================== */
'use strict';

const f1 = n => Math.round(n * 10) / 10;
/* XML n'accepte aucun caractère de contrôle ; les clés internes en portent. */
const xmlSur = s => String(s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const esc = s => xmlSur(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const escA = s => esc(s).replace(/"/g, '&quot;');
const clip = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

function styleDessin() {
  return `<defs>
   <pattern id="gfine" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#eef1f5" stroke-width=".8"/></pattern>
   <style>
     text{font-family:ui-monospace,Menlo,Consolas,monospace}
     .sym{fill:none;stroke:#1b2430;stroke-width:1;stroke-linecap:round;stroke-linejoin:round}
     .sym-thin{fill:none;stroke:#46535f;stroke-width:.7;stroke-linecap:round}
     .dot-fix{fill:#1b2430;stroke:none}
     .cab{fill:none;stroke:#26323f;stroke-width:.95;stroke-linecap:round;stroke-linejoin:round;transition:opacity .12s,stroke-width .12s}
     .jn{fill:#1b2430;stroke:none}
     .earth{fill:none;stroke:#1b2430;stroke-width:.9;stroke-linecap:butt}
     .rep{fill:#111b25;font-weight:500;font-size:10px;letter-spacing:1.15px}
     .rep-big{fill:#111b25;font-weight:500;font-size:10.5px;letter-spacing:1.15px}
     .des{fill:#8a96a2;font-size:6.8px;font-weight:400;letter-spacing:.4px}
     .body{fill:#ffffff;stroke:#1b2430;stroke-width:1}
     .bstrip{fill:#ffffff;stroke:#1b2430;stroke-width:.7}
     .bcell{fill:#ffffff;stroke:#1b2430;stroke-width:.55}
     .bsname{fill:#7a8794;font-size:6.5px;font-weight:600;letter-spacing:.9px}
     .pinlbl{fill:#2b3743;font-size:7.5px;font-weight:500;letter-spacing:.2px}
     .filnum{fill:#55636f;font-size:6px;font-weight:500;letter-spacing:.1px}
     .barrette{stroke:#1b2430;stroke-width:1.5;stroke-linecap:square}
     .busbar{stroke:#1b2430;stroke-width:2.6;stroke-linecap:square}
     .barfeed,.busdot{fill:#1b2430;stroke:none}
     .barfeedline{stroke:#1b2430;stroke-width:1.3;stroke-linecap:butt}
     .lead{stroke:#1b2430;stroke-width:.95;stroke-linecap:butt}
     .pont{stroke:#1b2430;stroke-width:2.2;stroke-linecap:round}
     .rpill{fill:#ffffff;stroke:#c8d1d9;stroke-width:.7}
     .rname{fill:#46535f;font-weight:600;font-size:7.5px;letter-spacing:.6px}
     .frame{fill:none;stroke:#c2ccd5;stroke-width:.8}
     .zline{stroke:#e2e7ec;stroke-width:.7}
     .zone{fill:#b9c2cb;font-size:8px;font-weight:600;letter-spacing:.5px}
     .cbox{fill:#ffffff;stroke:#c2ccd5;stroke-width:.8}
     .cdiv{stroke:#e6ebef;stroke-width:.8}
     .carth{fill:#9aa6b2;font-size:5.6px;font-weight:700;letter-spacing:.6px}
     .cartx{fill:#2b3743;font-size:7.5px;font-weight:600}
     .cartT{fill:#111c26;font-size:9.5px;font-weight:700;letter-spacing:.3px}
     .cartA{fill:#8e99a4;font-size:6.5px;font-weight:700;letter-spacing:1.2px}
     .selbox{fill:none;stroke:#9c3a14;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
     .comp{cursor:pointer;transition:opacity .12s}
     .focus .cab,.focus .barrette,.focus .busbar,.focus .barfeedline,.focus .jn,.focus .busdot,.focus .barfeed{opacity:.10}
     .focus .comp{opacity:.28}
     .focus .cab.hl{opacity:1;stroke-width:2.9}
     .focus .comp.hl{opacity:1}
   </style></defs>`;
}

/* ---- la feuille : cadre, zones A/B/C × 1/2/3, cartouche ------------------ */
function feuilleSvg(bb, cartouche, folio) {
  const x = bb.x, y = bb.y, w = bb.w, h = bb.h, ix = x + 16, iy = y + 16, iw = w - 32, ih = h - 32;
  let s = `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="#ffffff"/>`;
  s += `<rect x="${f1(ix)}" y="${f1(iy)}" width="${f1(iw)}" height="${f1(ih)}" fill="url(#gfine)"/>`;
  s += `<rect class="frame" x="${f1(ix)}" y="${f1(iy)}" width="${f1(iw)}" height="${f1(ih)}"/>`;
  const ncol = Math.max(2, Math.round(iw / 150)), nrow = Math.max(2, Math.round(ih / 150));
  for (let i = 1; i < ncol; i++) { const xx = ix + iw * i / ncol;
    s += `<line class="zline" x1="${f1(xx)}" y1="${f1(iy)}" x2="${f1(xx)}" y2="${f1(iy - 6)}"/><line class="zline" x1="${f1(xx)}" y1="${f1(iy + ih)}" x2="${f1(xx)}" y2="${f1(iy + ih + 6)}"/>`; }
  for (let i = 0; i < ncol; i++) { const cx = ix + iw * (i + 0.5) / ncol;
    s += `<text class="zone" x="${f1(cx)}" y="${f1(iy - 7)}" text-anchor="middle">${i + 1}</text><text class="zone" x="${f1(cx)}" y="${f1(iy + ih + 13)}" text-anchor="middle">${i + 1}</text>`; }
  for (let i = 1; i < nrow; i++) { const yy = iy + ih * i / nrow;
    s += `<line class="zline" x1="${f1(ix)}" y1="${f1(yy)}" x2="${f1(ix - 6)}" y2="${f1(yy)}"/><line class="zline" x1="${f1(ix + iw)}" y1="${f1(yy)}" x2="${f1(ix + iw + 6)}" y2="${f1(yy)}"/>`; }
  for (let i = 0; i < nrow; i++) { const cy = iy + ih * (i + 0.5) / nrow; const L = String.fromCharCode(65 + i);
    s += `<text class="zone" x="${f1(ix - 10)}" y="${f1(cy + 3)}" text-anchor="middle">${L}</text><text class="zone" x="${f1(ix + iw + 10)}" y="${f1(cy + 3)}" text-anchor="middle">${L}</text>`; }
  return s + cartoucheSvg(ix + iw, iy + ih, cartouche, folio);
}
function cartoucheSvg(rx, by, c, folio) {
  const W = 224, H = 66, x = rx - W, y = by - H;
  let s = `<rect class="cbox" x="${f1(x)}" y="${f1(y)}" width="${W}" height="${H}"/>`;
  [[x, y + 20, x + W, y + 20], [x, y + 43, x + W, y + 43], [x + 152, y + 20, x + 152, y + H], [x + 80, y + 20, x + 80, y + H]]
    .forEach(([a, b, c2, d]) => { s += `<line class="cdiv" x1="${a}" y1="${b}" x2="${c2}" y2="${d}"/>`; });
  s += `<text class="cartT" x="${x + 11}" y="${y + 13.5}">${esc(clip(c.titre || '—', 34))}</text>`;
  const cell = (cx, cy, h, v) => `<text class="carth" x="${cx}" y="${cy}">${h}</text><text class="cartx" x="${cx}" y="${cy + 10}">${esc(v || '—')}</text>`;
  s += cell(x + 11, y + 29, 'DESSINÉ', c.auteur) + cell(x + 87, y + 29, 'DATE', c.date) + cell(x + 11, y + 52, 'ÉCHELLE', c.echelle) + cell(x + 87, y + 52, 'INDICE', c.indice);
  s += `<text class="carth" x="${x + 159}" y="${y + 29}">FOLIO</text><text class="cartT" x="${x + 159}" y="${y + 39.5}">${esc(folio || '1 / 1')}</text>`;
  s += `<text class="cartA" x="${x + W - 9}" y="${y + 59}" text-anchor="end">ATELIER·SCHÉMA</text>`;
  return s;
}

/* ---- les fils --------------------------------------------------------- */
function filSvg(w) {
  if (!w.pts.length) return '';           // un shunt n'a pas de tracé : la réglette le porte
  let d = 'M ' + f1(w.pts[0].x) + ' ' + f1(w.pts[0].y);
  for (let i = 1; i < w.pts.length; i++) d += ' L ' + f1(w.pts[i].x) + ' ' + f1(w.pts[i].y);
  return `<path class="cab" data-i="${w.i}" data-a="${escA(w.de)}" data-b="${escA(w.vers)}" d="${d}"/>`;
}
/* Le numéro de fil, au-dessus du plus long segment horizontal, en son milieu
   — ou décalé le long du segment si le milieu est pris. Jamais sur un
   vertical, jamais sur une autre étiquette, jamais barré par un fil vertical.
   Mieux vaut un fil muet qu'une planche où les étiquettes se marchent dessus :
   les plus longs segments choisissent en premier. */
function reperesDeFil(fils) {
  const H = 5.6, CAR = 0.60, fs = 6, poses = [], verticaux = [];
  fils.forEach(w => { for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1];
    if (Math.abs(a.x - b.x) < 0.6 && Math.abs(a.y - b.y) > 1) verticaux.push({ x: a.x, y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y) }); } });
  const libre = (x0, y0, x1, y1) => !poses.some(b => x1 > b.x0 - 2 && x0 < b.x1 + 2 && y1 > b.y0 - 1.5 && y0 < b.y1 + 1.5)
    && !verticaux.some(v => v.x > x0 - 1.5 && v.x < x1 + 1.5 && v.y1 > y0 && v.y0 < y1);
  const cands = [];
  fils.forEach(w => { const nom = String(w.cable || '').trim(); if (!nom) return;
    let bL = 0, bx0 = 0, bx1 = 0, by = 0;
    for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1]; if (Math.abs(a.y - b.y) > 0.6) continue;
      const L = Math.abs(b.x - a.x); if (L > bL) { bL = L; bx0 = Math.min(a.x, b.x); bx1 = Math.max(a.x, b.x); by = a.y; } }
    if (bL > 0) cands.push({ nom, L: bL, x0: bx0, x1: bx1, y: by }); });
  cands.sort((a, b) => b.L - a.L);
  let out = '';
  cands.forEach(c => { const larg = c.nom.length * CAR * fs; if (larg + 10 > c.L) return;
    const mid = (c.x0 + c.x1) / 2, marge = 5, dmax = Math.max(0, (c.L - larg) / 2 - marge);
    let pose = null;
    for (let d = 0; d <= dmax + 0.01 && !pose; d += Math.max(3, larg / 3)) {
      for (const cx of (d === 0 ? [mid] : [mid - d, mid + d])) {
        const x0 = cx - larg / 2, x1 = cx + larg / 2, y1 = c.y - 2.2, y0 = y1 - H;
        if (x0 < c.x0 + marge || x1 > c.x1 - marge) continue;
        if (libre(x0, y0, x1, y1)) { pose = { cx, x0, y0, x1, y1 }; break; } } }
    if (!pose) return;
    poses.push(pose);
    out += `<text class="filnum" x="${f1(pose.cx)}" y="${f1(pose.y1)}" text-anchor="middle">${esc(c.nom)}</text>`; });
  return out;
}
/* Barrette : une barre pleine et épaisse (du cuivre continu), un carré plein
   sur la borne qui alimente, un raccord en trait plein, des piquages carrés. */
function barrettesSvg(barrettes, piquages) {
  let s = '';
  (barrettes.raccords || []).forEach(r => { s += `<line class="barfeedline" x1="${f1(r.x0)}" y1="${f1(r.y)}" x2="${f1(r.x1)}" y2="${f1(r.y)}"/>`; });
  barrettes.forEach(b => { s += `<line class="${b.bus ? 'busbar' : 'barrette'}" x1="${f1(b.x)}" y1="${f1(b.y1)}" x2="${f1(b.x)}" y2="${f1(b.y2)}"/>`;
    if (b.py != null) s += `<rect class="barfeed" x="${f1(b.x - 2.2)}" y="${f1(b.py - 2.2)}" width="4.4" height="4.4"/>`; });
  piquages.forEach(d => { s += `<circle class="jn" cx="${f1(d.x)}" cy="${f1(d.y)}" r="1.7"/>`; });
  return s;
}

/* ---- les blocs -------------------------------------------------------- */
const BOXPAD = 3, BANDPAD = 1.5;
/* Une colonne de bornes se découpe en paquets de bornes voisines : deux
   bornes très écartées font deux boîtes, sinon la boîte s'étire en barre vide. */
function paquets(rangs) { const g = []; let s = 0;
  for (let i = 1; i <= rangs.length; i++) if (i === rangs.length || rangs[i].y - rangs[i - 1].y > 2.2 * PRH) { g.push(rangs.slice(s, i)); s = i; }
  return g; }
/* La boîte de bornes, plaquée sur le corps : une boîte unique, les numéros
   alignés dedans, le fil part du bord extérieur à la hauteur de son numéro. */
function boiteDeBornes(xCorps, dir, prof, rangs, baseY, hCorps, nom) {
  let out = '';
  paquets(rangs).forEach(g => {
    let t = g[0].y - baseY - PRH / 2 - BOXPAD, b = g[g.length - 1].y - baseY + PRH / 2 + BOXPAD;
    if (hCorps != null) { t = Math.max(t, BANDPAD); b = Math.min(b, hCorps - BANDPAD); if (b <= t) return; }
    const xo = dir > 0 ? xCorps : xCorps - prof, bw = prof;
    if (nom != null) out += `<text class="bsname" x="${f1(xo + bw / 2)}" y="${f1(t - 4)}" text-anchor="middle">${esc(clip(nom, 12))}</text>`;
    out += `<rect class="bstrip" x="${f1(xo)}" y="${f1(t)}" width="${f1(bw)}" height="${f1(b - t)}"/>`;
    // taille fixe pour tout le paquet : une colonne de chiffres s'écrit d'un seul corps
    const lmax = Math.max(1, ...g.filter(p => p.etiq).map(p => String(p.etiq).length));
    const fs = Math.max(5.4, Math.min(7.5, (bw - 4) / (0.62 * lmax)));
    g.forEach(p => { if (!p.etiq) return;
      out += `<text class="pinlbl" style="font-size:${f1(fs)}px" x="${f1(xo + bw / 2)}" y="${f1(p.y - baseY + fs * 0.36)}" text-anchor="middle">${esc(p.etiq)}</text>`; }); });
  return out;
}
function coins(cls, m, w, h) { const X = -m, Y = -m, W = w + 2 * m, H = h + 2 * m, k = Math.max(6, Math.min(16, h / 4));
  return `<path class="${cls}" d="M${f1(X)} ${f1(Y + k)} L${f1(X)} ${f1(Y)} L${f1(X + k)} ${f1(Y)} M${f1(X + W - k)} ${f1(Y)} L${f1(X + W)} ${f1(Y)} L${f1(X + W)} ${f1(Y + k)} M${f1(X + W)} ${f1(Y + H - k)} L${f1(X + W)} ${f1(Y + H)} L${f1(X + W - k)} ${f1(Y + H)} M${f1(X + k)} ${f1(Y + H)} L${f1(X)} ${f1(Y + H)} L${f1(X)} ${f1(Y + H - k)}"/>`; }

function blocSvg(c, designation, choisi) {
  let s = `<g class="comp" data-name="${escA(c.name)}" transform="translate(${f1(c.x)},${f1(c.y)})">`;
  if (choisi) s += coins('selbox', 5, c.w, c.h);
  const bx = c.lw, bw = c.w - c.lw - c.rw, mid = bx + bw / 2;
  const rl = c.rangs.L || [], rr = c.rangs.R || [], rs = c.rangs.S || [];
  const yRep = c.h > 90 ? 21 : c.h / 2 - 1.5;
  if (c.kind === 'tag') {
    // pastille de potentiel, en face de la borne desservie
    s += `<rect class="rpill" x="0" y="${f1(c.h / 2 - 6)}" width="${c.w}" height="12" rx="6"/>`;
    s += `<text class="rname" x="${f1(c.w / 2)}" y="${f1(c.h / 2 + 2.7)}" text-anchor="middle">${esc(clip(c.name, 7))}</text>`;
  } else if (c.kind === 'strip' && estCoupure(c.name)) {
    /* PRISE DE COUPURE : deux moitiés — la fiche et l'embase — séparées par
       un jeu ; c'est le blanc entre les deux qui est le symbole, c'est là
       qu'on coupe. Chaque contact est une cellule dans CHAQUE moitié, avec son
       numéro des deux côtés, et entre les deux la fiche (triangle plein) qui
       entre dans l'embase (arc ouvert). Le fil arrive sur le bord du bloc et
       un fil de liaison le mène au contact. */
    const G = 12, xg0 = bx, xg1 = mid - G / 2, xd0 = mid + G / 2, xd1 = bx + bw;
    s += `<rect class="bstrip" x="${f1(xg0)}" y="0" width="${f1(xg1 - xg0)}" height="${c.h}"/><rect class="bstrip" x="${f1(xd0)}" y="0" width="${f1(xd1 - xd0)}" height="${c.h}"/>`;
    rs.forEach(p => { const ly = p.y - c.y, t = ly - PRH / 2 + 1, h = PRH - 2;
      s += `<rect class="bcell" x="${f1(xg0)}" y="${f1(t)}" width="${f1(xg1 - xg0)}" height="${f1(h)}"/><rect class="bcell" x="${f1(xd0)}" y="${f1(t)}" width="${f1(xd1 - xd0)}" height="${f1(h)}"/>`;
      if (p.etiq) s += `<text class="pinlbl" x="${f1((xg0 + xg1) / 2)}" y="${f1(ly + 2.7)}" text-anchor="middle">${esc(p.etiq)}</text><text class="pinlbl" x="${f1((xd0 + xd1) / 2)}" y="${f1(ly + 2.7)}" text-anchor="middle">${esc(p.etiq)}</text>`;
      // la fiche (triangle plein) pointe vers l'embase (demi-cercle ouvert vers elle)
      s += `<path class="dot-fix" d="M ${f1(xg1)} ${f1(ly - 2.8)} L ${f1(mid - 0.5)} ${f1(ly)} L ${f1(xg1)} ${f1(ly + 2.8)} Z"/>`;
      s += `<path class="sym" d="M ${f1(mid + 0.5)} ${f1(ly - 3.2)} A 3.2 3.2 0 0 1 ${f1(mid + 0.5)} ${f1(ly + 3.2)}"/><line class="lead" x1="${f1(mid + 3.7)}" y1="${f1(ly)}" x2="${f1(xd0)}" y2="${f1(ly)}"/>`;
      if ((p.dir || 0) <= 0) s += `<line class="lead" x1="0" y1="${f1(ly)}" x2="${f1(xg0)}" y2="${f1(ly)}"/>`;
      if ((p.dir || 0) >= 0) s += `<line class="lead" x1="${f1(xd1)}" y1="${f1(ly)}" x2="${f1(c.w)}" y2="${f1(ly)}"/>`; });
    s += `<text class="rep" x="${f1(mid)}" y="${f1(c.h + 12)}" text-anchor="middle">${esc(clip(c.name, 14))}</text>`;
  } else if (c.kind === 'strip' || estBarrette(c.name)) {
    /* RÉGLETTE (barrette ou bornier) : une rangée de modules identiques. Chaque
       borne est une cellule de la hauteur d'un pas, centrée sur son ordonnée ;
       entre deux cellules éloignées, le corps continue en trait fin. Un shunt
       entre deux bornes se dessine en PONT : une barre pleine le long des
       cellules, comme le peigne de cuivre qu'on pose sur le matériel. */
    const rangs = c.kind === 'strip' ? rs : [...rl, ...rr].sort((u, v) => u.y - v.y);
    s += `<rect class="bstrip" x="${f1(bx)}" y="0" width="${f1(bw)}" height="${c.h}"/>`;
    rangs.forEach(p => { const ly = p.y - c.y, t = ly - PRH / 2 + 1, h = PRH - 2;
      s += `<rect class="bcell" x="${f1(bx)}" y="${f1(t)}" width="${f1(bw)}" height="${f1(h)}"/>`;
      if (p.etiq) s += `<text class="pinlbl" x="${f1(mid)}" y="${f1(ly + 2.7)}" text-anchor="middle">${esc(p.etiq)}</text>`;
      const d = p.dir || 0;
      if (d <= 0) s += `<line class="lead" x1="0" y1="${f1(ly)}" x2="${f1(bx)}" y2="${f1(ly)}"/>`;
      if (d >= 0) s += `<line class="lead" x1="${f1(bx + bw)}" y1="${f1(ly)}" x2="${f1(c.w)}" y2="${f1(ly)}"/>`; });
    (c.shunts || []).forEach(([y1, y2]) => { const xs = bx + bw - 5;
      s += `<line class="pont" x1="${f1(xs)}" y1="${f1(y1 - c.y)}" x2="${f1(xs)}" y2="${f1(y2 - c.y)}"/><circle class="jn" cx="${f1(xs)}" cy="${f1(y1 - c.y)}" r="1.7"/><circle class="jn" cx="${f1(xs)}" cy="${f1(y2 - c.y)}" r="1.7"/>`; });
    s += `<text class="rep" x="${f1(mid)}" y="${f1(c.h + 12)}" text-anchor="middle">${esc(clip(c.name, 14))}</text>`;
  } else if (estMasse(c.name)) {
    /* MASSE : les fils rejoignent un collecteur vertical, marqués d'un point
       de jonction, et le collecteur descend sur le symbole CEI 60617-02 —
       trois barres décroissantes. Le repère se lit sous le symbole. */
    const cx = c.w / 2, ys = [...rl, ...rr].map(p => p.y - c.y);
    const yh = ys.length ? Math.min(...ys) : c.h / 2, yb = ys.length ? Math.max(...ys) : c.h / 2, y0 = yb + 6;
    s += `<line class="earth" x1="${f1(cx)}" y1="${f1(yh)}" x2="${f1(cx)}" y2="${f1(y0)}"/>`;
    rl.forEach(p => { const ly = p.y - c.y; s += `<line class="earth" x1="0" y1="${f1(ly)}" x2="${f1(cx)}" y2="${f1(ly)}"/>`; });
    rr.forEach(p => { const ly = p.y - c.y; s += `<line class="earth" x1="${f1(cx)}" y1="${f1(ly)}" x2="${f1(c.w)}" y2="${f1(ly)}"/>`; });
    if (ys.length > 1) ys.forEach(ly => { s += `<circle class="jn" cx="${f1(cx)}" cy="${f1(ly)}" r="1.7"/>`; });
    s += `<line class="earth" x1="${f1(cx - 6)}" y1="${f1(y0)}" x2="${f1(cx + 6)}" y2="${f1(y0)}"/><line class="earth" x1="${f1(cx - 4)}" y1="${f1(y0 + 3)}" x2="${f1(cx + 4)}" y2="${f1(y0 + 3)}"/><line class="earth" x1="${f1(cx - 2)}" y1="${f1(y0 + 6)}" x2="${f1(cx + 2)}" y2="${f1(y0 + 6)}"/>`;
    s += `<text class="rep" x="${f1(cx)}" y="${f1(y0 + 17)}" text-anchor="middle">${esc(clip(c.name, 10))}</text>`;
  } else {
    // équipement : corps, repère en tête (rappelé en pied s'il est très haut), boîtes de bornes sur les flancs
    s += `<rect class="body" x="${f1(bx)}" y="0" width="${f1(bw)}" height="${c.h}"/>`;
    s += `<text class="rep-big" x="${f1(mid)}" y="${f1(yRep)}" text-anchor="middle">${esc(clip(c.name, 12))}</text>`;
    if (c.h > 380) s += `<text class="bsname" x="${f1(mid)}" y="${f1(c.h - 9)}" text-anchor="middle">${esc(clip(c.name, 12))}</text>`;
    if (designation) s += `<text class="des" x="${f1(mid)}" y="${f1(yRep + 10)}" text-anchor="middle">${esc(clip(designation, 18))}</text>`;
    if (rl.length) s += boiteDeBornes(bx, -1, c.lw, rl, c.y, c.h, null);
    if (rr.length) s += boiteDeBornes(bx + bw, +1, c.rw, rr, c.y, c.h, null);
  }
  return s + '</g>';
}

/* ---- la scène entière ------------------------------------------------- */
function sceneSvg(dessin, cartouche, folio, designationDe, choisi) {
  let s = feuilleSvg(dessin.bbox, cartouche, folio);
  dessin.fils.forEach(w => { if (!w.shunt) s += filSvg(w); });
  const shunts = new Map();
  dessin.fils.forEach(w => { if (!w.shunt) return; const ys = [w.epA.y, w.epB.y].sort((u, v) => u - v); (shunts.get(w.de) || shunts.set(w.de, []).get(w.de)).push(ys); });
  s += reperesDeFil(dessin.fils);
  s += barrettesSvg(dessin.barrettes, dessin.piquages);
  dessin.points.forEach(d => s += `<circle class="jn" cx="${f1(d.x)}" cy="${f1(d.y)}" r="1.9"/>`);
  dessin.comps.forEach(c => { c.shunts = shunts.get(c.name) || []; s += blocSvg(c, designationDe ? designationDe(c.name) : '', choisi === c.name); });
  return s;
}
/* Le même dessin, en document SVG autonome : pour enregistrer, imprimer, coller. */
function svgAutonome(dessin, cartouche, folio, designationDe) {
  const bb = dessin.bbox, M = 24, W = Math.ceil(bb.w + 2 * M), H = Math.ceil(bb.h + 2 * M), x0 = f1(bb.x - M), y0 = f1(bb.y - M);
  const txt = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${x0} ${y0} ${W} ${H}">`
    + `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="#fbfbf7"/>` + styleDessin() + sceneSvg(dessin, cartouche, folio, designationDe, null) + '</svg>';
  return { w: W, h: H, txt };
}
