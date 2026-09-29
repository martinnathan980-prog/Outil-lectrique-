/* ===========================================================================
   06 — LE DESSIN
   Du placement et du routage on tire la planche : une feuille au format A
   avec ses zones et son cartouche, les fils, les numéros de fil, les
   barrettes, et un symbole par nature de matériel.

   UNE SEULE ENCRE. Ce qui distingue une pièce d'une autre, c'est l'épaisseur
   et la forme du trait, jamais sa couleur : 1,0 le corps d'un matériel,
   0,95 un fil (et tout ce qui en est : piquage, pont de shunt), 0,7 une
   réglette, 0,55 une cellule. Ça s'imprime en noir et blanc.
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
     .dot-fix{fill:#1b2430;stroke:none}
     .cab{fill:none;stroke:#26323f;stroke-width:.95;stroke-linecap:round;stroke-linejoin:round;transition:opacity .12s,stroke-width .12s}
     .jn{fill:#1b2430;stroke:none}
     .earth{fill:none;stroke:#1b2430;stroke-width:1.1;stroke-linecap:butt}
     .rep{fill:#111b25;font-weight:500;font-size:10px;letter-spacing:1.15px}
     .rep-big{fill:#111b25;font-weight:500;font-size:10.5px;letter-spacing:1.15px}
     .des{fill:#8a96a2;font-size:6.8px;font-weight:400;letter-spacing:.4px}
     .body{fill:#ffffff;stroke:#1b2430;stroke-width:1}
     .bstrip{fill:#ffffff;stroke:#1b2430;stroke-width:.7}
     .bcell{fill:#ffffff;stroke:#1b2430;stroke-width:.55}
     .bsname{fill:#7a8794;font-size:6.5px;font-weight:600;letter-spacing:.9px}
     .pinlbl{fill:#2b3743;font-size:7.5px;font-weight:500;letter-spacing:.2px}
     .filnum{fill:#55636f;font-size:6px;font-weight:500;letter-spacing:.1px}
     .lead{stroke:#26323f;stroke-width:.95;stroke-linecap:butt}
     .conn{fill:#ffffff;stroke:#1b2430;stroke-width:.75}
     .connnom{fill:#1b2430;font-size:6.5px;font-weight:700;letter-spacing:.3px}
     .connpin{fill:#2b3743;font-size:5.6px;font-weight:500}
     .barre{fill:none;stroke:#1b2430;stroke-width:1;stroke-dasharray:3 2.2;stroke-linecap:butt}
     .bardot{fill:#1b2430;stroke:none}
     .pontage{stroke:#1b2430;stroke-width:1.1;stroke-linecap:butt}
     .barnum{fill:#2b3743;font-size:5.6px;font-weight:600}
     .fiche{fill:#ffffff;stroke:#1b2430;stroke-width:.9}
     .embase{fill:#ffffff;stroke:#1b2430;stroke-width:1.1}
     .pont{stroke:#1b2430;stroke-width:1;stroke-linecap:butt}
     .bpast{fill:#1b2430;stroke:none}
     .bpnum{fill:#ffffff;font-size:4px;font-weight:700}
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
     .focus .cab,.focus .jn{opacity:.10}
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
/* Un croisement se lit d'un coup d'œil quand le fil horizontal ENJAMBE le
   vertical : un petit pont, toujours au-dessus. Deux fils qui se touchent en
   bout (piquage, jonction) ne se croisent pas : le test est strict. Des
   verticaux trop serrés sont enjambés d'un seul pont. */
const R_PONT = 2.8;
function verticauxDe(traces) { const v = [];
  traces.forEach(pts => { for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1];
    if (Math.abs(a.x - b.x) < 0.6 && Math.abs(a.y - b.y) > 1) v.push({ x: a.x, y0: Math.min(a.y, b.y) + 0.6, y1: Math.max(a.y, b.y) - 0.6 }); } });
  return v; }
function cheminAvecPonts(pts, verticaux) {
  let d = 'M ' + f1(pts[0].x) + ' ' + f1(pts[0].y);
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i];
    if (Math.abs(a.y - b.y) < 0.6 && Math.abs(b.x - a.x) > 2 * R_PONT + 2) {
      const s = b.x > a.x ? 1 : -1, y = a.y, xa = Math.min(a.x, b.x) + R_PONT + 1, xb = Math.max(a.x, b.x) - R_PONT - 1;
      const xs = verticaux.filter(v => v.x > xa && v.x < xb && y > v.y0 && y < v.y1).map(v => v.x).sort((u, w) => s * (u - w));
      let g = null; const groupes = [];
      xs.forEach(x => { if (g && Math.abs(x - g[g.length - 1]) < 2 * R_PONT + 0.5) g.push(x); else groupes.push(g = [x]); });
      groupes.forEach(gr => { const x0 = gr[0] - s * R_PONT, x1 = gr[gr.length - 1] + s * R_PONT, rx = Math.abs(x1 - x0) / 2;
        d += ` L ${f1(x0)} ${f1(y)} A ${f1(rx)} ${R_PONT} 0 0 ${s > 0 ? 1 : 0} ${f1(x1)} ${f1(y)}`; }); }
    d += ' L ' + f1(b.x) + ' ' + f1(b.y); }
  return d; }
function filSvg(w, verticaux) {
  if (!w.pts.length) return '';           // un shunt n'a pas de tracé : la réglette le porte
  return `<path class="cab" data-i="${w.i}" data-a="${escA(w.de)}" data-b="${escA(w.vers)}" d="${cheminAvecPonts(w.pts, verticaux)}"/>`;
}
/* Un piquage — plusieurs fils sur une même borne — se dessine comme du fil :
   le fil sort de la borne, rejoint une verticale d'où partent les autres, et
   chaque départ est marqué d'un point de jonction. Rien de plus épais que le
   fil : c'est du fil. */
function tracesDePiquage(barrettes) {
  const traces = [];
  (barrettes.raccords || []).forEach(r => traces.push([{ x: r.x0, y: r.y }, { x: r.x1, y: r.y }]));
  barrettes.forEach(b => traces.push([{ x: b.x, y: b.y1 + 3 }, { x: b.x, y: b.y2 - 3 }]));
  return traces; }
function piquagesSvg(barrettes, piquages, verticaux) {
  let s = '';
  (barrettes.raccords || []).forEach(r => { s += `<path class="cab" d="${cheminAvecPonts([{ x: r.x0, y: r.y }, { x: r.x1, y: r.y }], verticaux)}"/>`; });
  barrettes.forEach(b => {
    /* Un piquage — plusieurs fils sur une même borne — se dessine comme la
       BARRETTE qu'il faudra poser : une fine ligne pointillée, un point à
       chaque départ, les numéros 1, 2, 3… du côté des départs. */
    const ys = [b.py, ...b.gardes.map(k => k.y)].filter((y, i, a) => a.findIndex(z => Math.abs(z - y) < 0.6) === i).sort((u, v) => u - v);
    s += `<line class="barre" x1="${f1(b.x)}" y1="${f1(ys[0])}" x2="${f1(b.x)}" y2="${f1(ys[ys.length - 1])}"/>`;
    ys.forEach((y, i) => { s += pastilleSvg(b.x, y, String(i + 1)); }); });
  return s;
}
/* Une borne de barrette : un point noir sur la ligne, comme d'habitude, son numéro dedans en blanc. */
function pastilleSvg(x, y, etiq) {
  const r = etiq.length > 2 ? 4.4 : 3.4;
  return `<circle class="bpast" cx="${f1(x)}" cy="${f1(y)}" r="${r}"/><text class="bpnum" x="${f1(x)}" y="${f1(y + 1.45)}" text-anchor="middle">${esc(etiq)}</text>`;
}
/* Le numéro de fil, au-dessus du plus long segment horizontal, en son milieu
   — ou décalé le long du segment si le milieu est pris. Jamais sur un
   vertical, jamais sur une autre étiquette, jamais barré par un fil vertical.
   Mieux vaut un fil muet qu'une planche où les étiquettes se marchent dessus :
   les plus longs segments choisissent en premier. */
function reperesDeFil(fils, verticaux, barrettes) {
  const H = 5.6, CAR = 0.60, fs = 6, poses = [];
  const libre = (x0, y0, x1, y1) => !poses.some(b => x1 > b.x0 - 2 && x0 < b.x1 + 2 && y1 > b.y0 - 1.5 && y0 < b.y1 + 1.5)
    && !verticaux.some(v => v.x > x0 - R_PONT - 1 && v.x < x1 + R_PONT + 1 && v.y1 > y0 && v.y0 < y1);
  const horizontaux = fils.some(w => w.pts.length > 1);
  const cands = [], debout = [];
  fils.forEach(w => { const nom = String(w.cable || '').trim(); if (!nom) return;
    let bL = 0, bx0 = 0, bx1 = 0, by = 0, vL = 0, vx = 0, vy0 = 0, vy1 = 0;
    for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1];
      if (Math.abs(a.y - b.y) < 0.6) { const L = Math.abs(b.x - a.x); if (L > bL) { bL = L; bx0 = Math.min(a.x, b.x); bx1 = Math.max(a.x, b.x); by = a.y; } }
      else if (Math.abs(a.x - b.x) < 0.6) { const L = Math.abs(b.y - a.y); if (L > vL) { vL = L; vx = a.x; vy0 = Math.min(a.y, b.y); vy1 = Math.max(a.y, b.y); } } }
    // un fil qui n'est qu'un raccord vers un piquage a, sur la verticale du piquage, un tronçon à lui seul
    if (vL === 0 && w.pts.length) { const t = tronconDePiquage(w, barrettes || []); if (t) { vL = t.vL; vx = t.vx; vy0 = t.vy0; vy1 = t.vy1; } }
    cands.push({ nom, L: bL, x0: bx0, x1: bx1, y: by, vL, vx, vy0, vy1 }); });
  cands.sort((a, b) => b.L - a.L);
  let out = '';
  cands.forEach(c => { const larg = c.nom.length * CAR * fs, marge = c.L < 40 ? 2 : 5;   // un fil court (masse collée) garde son numéro
    let pose = null;
    if (larg + 2 * marge <= c.L) { const mid = (c.x0 + c.x1) / 2, dmax = Math.max(0, (c.L - larg) / 2 - marge);
      for (let d = 0; d <= dmax + 0.01 && !pose; d += Math.max(3, larg / 3)) {
        for (const cx of (d === 0 ? [mid] : [mid - d, mid + d])) {
          const x0 = cx - larg / 2, x1 = cx + larg / 2, y1 = c.y - 2.2, y0 = y1 - H;
          if (x0 < c.x0 + marge || x1 > c.x1 - marge) continue;
          if (libre(x0, y0, x1, y1)) { pose = { cx, x0, y0, x1, y1 }; break; } } } }
    if (pose) { poses.push(pose); out += `<text class="filnum" x="${f1(pose.cx)}" y="${f1(pose.y1)}" text-anchor="middle">${esc(c.nom)}</text>`; return; }
    // pas de place à l'horizontale : le numéro se lit debout, le long du plus long vertical
    if (larg + 10 > c.vL) return;
    const cy = (c.vy0 + c.vy1) / 2, x1 = c.vx - 2.2, x0 = x1 - H, y0 = cy - larg / 2, y1 = cy + larg / 2;
    if (!poses.some(b => x1 > b.x0 - 2 && x0 < b.x1 + 2 && y1 > b.y0 - 1.5 && y0 < b.y1 + 1.5)) {
      poses.push({ x0, y0, x1, y1 });
      out += `<text class="filnum" transform="rotate(-90 ${f1(x1)} ${f1(cy)})" x="${f1(x1)}" y="${f1(cy)}" text-anchor="middle">${esc(c.nom)}</text>`; } });
  return out;
}
/* Sur la verticale d'un piquage, le tronçon entre la borne d'un fil et le
   départ voisin n'appartient qu'à ce fil : son numéro peut s'y écrire. */
function tronconDePiquage(w, barrettes) {
  for (const q of [w.pts[0], w.pts[w.pts.length - 1]]) {
    const b = barrettes.find(b => Math.abs(b.x - q.x) < 0.5 && q.y > b.y1 - 0.5 && q.y < b.y2 + 0.5); if (!b) continue;
    const ys = [b.py, ...b.gardes.map(g => g.y)].filter(y => Math.abs(y - q.y) > 0.6);
    const versPy = b.py < q.y ? -1 : 1;
    const voisins = ys.filter(y => versPy < 0 ? y < q.y : y > q.y);
    if (!voisins.length) continue;
    const y2 = versPy < 0 ? Math.max(...voisins) : Math.min(...voisins);
    return { vL: Math.abs(y2 - q.y), vx: b.x, vy0: Math.min(q.y, y2), vy1: Math.max(q.y, y2) };
  }
  return null;
}
/* ---- les blocs -------------------------------------------------------- */
/* Les bornes d'un équipement : le fil entre par le flanc et continue jusqu'au
   corps, où une petite borne ronde marque le contact ; le numéro s'écrit DANS
   le corps, contre le bord, comme sur un plan de câblage. Pas de boîte. */
function bornesSvg(xCorps, dir, prof, rangs, baseY, connecteurDe) {
  let out = '';
  rangs.forEach(p => { const y = p.y - baseY, xo = xCorps + dir * prof, c = connecteurDe ? connecteurDe(p.etiq) : null;
    // dans un connecteur, le fil s'arrête sur le connecteur ; sinon il va jusqu'au corps
    const xb = c ? xCorps + dir * CONN_W : xCorps;
    out += `<line class="lead" x1="${f1(xo)}" y1="${f1(y)}" x2="${f1(xb)}" y2="${f1(y)}"/>`;
    if (!p.etiq) return;
    if (c) out += `<text class="connpin" x="${f1(xCorps + dir * CONN_W / 2)}" y="${f1(y + 2)}" text-anchor="middle">${esc(clip(etiquetteDansConnecteur(p.etiq, c.nom), 4))}</text>`;
    else out += `<text class="pinlbl" x="${f1(xCorps - dir * 4)}" y="${f1(y + 2.6)}" text-anchor="${dir > 0 ? 'end' : 'start'}">${esc(clip(String(p.etiq), 5))}</text>`; });
  return out;
}
/* « A12 » dans le connecteur A s'écrit « 12 » : la lettre est déjà en tête. */
function etiquetteDansConnecteur(etiq, nom) {
  const m = LETTRE_CONNECTEUR.exec(String(etiq || '').trim());
  return (m && m[1].toUpperCase() === nom) ? m[2] : String(etiq);
}
/* Les connecteurs : un connecteur est une pièce posée SUR le flanc de
   l'équipement, à l'extérieur du corps — un rectangle fin, ses bornes
   dedans, sa lettre dans une pastille contre le corps. Un connecteur dont
   les bornes ne se suivent pas a plusieurs pièces de la même lettre. */
const CONN_W = 13;
function connecteursSvg(xCorps, dir, rangs, baseY, connecteurDe) {
  const runs = []; let cur = null;
  rangs.forEach(p => { const c = connecteurDe(p.etiq); const nom = c ? c.nom : '';
    if (cur && cur.nom === nom) { cur.y1 = p.y - baseY; return; }
    cur = { nom, y0: p.y - baseY, y1: p.y - baseY }; runs.push(cur); });
  if (!runs.some(r => r.nom)) return '';
  const x0 = dir > 0 ? xCorps : xCorps - CONN_W;
  let out = '';
  runs.forEach(r => { if (!r.nom) return;
    const t = r.y0 - PRH / 2 - 1, b = r.y1 + PRH / 2 + 1;
    out += `<rect class="conn" x="${f1(x0)}" y="${f1(t)}" width="${CONN_W}" height="${f1(b - t)}" rx="1.5"/>`;
    // la lettre du connecteur, au-dessus de la pièce
    out += `<text class="connnom" x="${f1(x0 + CONN_W / 2)}" y="${f1(t - 2.2)}" text-anchor="middle">${esc(clip(r.nom, 3))}</text>`; });
  return out;
}
/* Le repère tient entre les numéros de borne des deux flancs : la taille
   s'adapte au nom, jamais l'inverse. */
function repereSvg(cls, x, y, nom, bw, marge) {
  const fs = Math.max(7, Math.min(10.5, (bw - 2 * marge) / (0.66 * nom.length)));
  return `<text class="${cls}" style="font-size:${f1(fs)}px" x="${f1(x)}" y="${f1(y)}" text-anchor="middle">${esc(nom)}</text>`; }
function coins(cls, m, w, h) { const X = -m, Y = -m, W = w + 2 * m, H = h + 2 * m, k = Math.max(6, Math.min(16, h / 4));
  return `<path class="${cls}" d="M${f1(X)} ${f1(Y + k)} L${f1(X)} ${f1(Y)} L${f1(X + k)} ${f1(Y)} M${f1(X + W - k)} ${f1(Y)} L${f1(X + W)} ${f1(Y)} L${f1(X + W)} ${f1(Y + k)} M${f1(X + W)} ${f1(Y + H - k)} L${f1(X + W)} ${f1(Y + H)} L${f1(X + W - k)} ${f1(Y + H)} M${f1(X + k)} ${f1(Y + H)} L${f1(X)} ${f1(Y + H)} L${f1(X)} ${f1(Y + H - k)}"/>`; }

/* Des shunts qui partagent une borne font un seul pont : [1,2] et [2,3] → [1,3]. */
function paquetsDePonts(shunts) {
  const tri = shunts.map(([a, b]) => [Math.min(a, b), Math.max(a, b)]).sort((u, v) => u[0] - v[0]); const out = [];
  tri.forEach(([a, b]) => { const d = out[out.length - 1]; if (d && a <= d[1] + 0.6) d[1] = Math.max(d[1], b); else out.push([a, b]); });
  return out;
}
function blocSvg(c, designation, choisi) {
  let s = `<g class="comp" data-name="${escA(c.name)}" transform="translate(${f1(c.x)},${f1(c.y)})">`;
  if (choisi) s += coins('selbox', 5, c.w, c.h);
  const bx = c.lw, bw = c.w - c.lw - c.rw, mid = bx + bw / 2;
  const rl = c.rangs.L || [], rr = c.rangs.R || [], rs = c.rangs.S || [];
  const yRep = c.h > 90 ? 21 : c.h / 2 - 1.5;
  if (c.kind === 'tag' && estMasse(c.name)) {
    /* MASSE collée à sa borne : le symbole CEI 60617-02 est dans l'AXE du fil,
       perpendiculaire à l'équipement — trois barres verticales décroissantes
       vers l'extérieur — et le repère se lit dessous. */
    // p.dir dit par quel flanc le fil ARRIVE (-1 : par la gauche) ; le symbole grandit vers l'autre flanc.
    const p = rs[0] || { y: c.y + c.h / 2, dir: -1 }, ly = p.y - c.y, d = (p.dir || -1) < 0 ? 1 : -1;
    const x0 = d > 0 ? 0 : c.w, xs = d > 0 ? 4 : c.w - 4;                    // le fil entre par un flanc, le symbole est tout de suite là
    s += `<line class="earth" x1="${f1(x0)}" y1="${f1(ly)}" x2="${f1(xs)}" y2="${f1(ly)}"/>`;
    [[6, 0], [4, 3.2], [2, 6.4]].forEach(([l, dx]) => { const x = xs + d * dx; s += `<line class="earth" x1="${f1(x)}" y1="${f1(ly - l)}" x2="${f1(x)}" y2="${f1(ly + l)}"/>`; });
    // le repère, petit, sous les barres : entre ce fil et le suivant (un pas de 14), sans toucher ni l'un ni l'autre
    s += `<text class="barnum" x="${f1(xs + d * 3.2)}" y="${f1(ly + 11.6)}" text-anchor="middle">${esc(clip(c.name, 10))}</text>`;
  } else if (c.kind === 'tag') {
    // pastille de potentiel, en face de la borne desservie
    s += `<rect class="rpill" x="0" y="${f1(c.h / 2 - 6)}" width="${c.w}" height="12" rx="6"/>`;
    s += `<text class="rname" x="${f1(c.w / 2)}" y="${f1(c.h / 2 + 2.7)}" text-anchor="middle">${esc(clip(c.name, 7))}</text>`;
  } else if (c.kind === 'strip' && estCoupure(c.name)) {
    /* PRISE DE COUPURE : deux rectangles fins de même largeur, côte à côte —
       à gauche la PARTIE MOBILE (la fiche, sur le faisceau), un peu moins
       haute ; à droite la PARTIE FIXE (l'embase, sur la structure), plus
       haute. C'est la différence de hauteur qui dit laquelle est laquelle.
       Les contacts sont numérotés dans l'embase ; le fil amont arrive sur la
       mobile, le fil aval repart de l'embase. */
    // l'embase est la plus FINE des deux ; la mobile, plus large, est un peu moins haute ; angles vifs
    const WE = 5, WM = 9, xe0 = mid - WE / 2 + 2, xe1 = xe0 + WE, xm1 = xe0, xm0 = xm1 - WM;   // la mobile collée à l'embase
    const ym0 = Math.min(PRH * 0.35, c.h / 6), ym1 = c.h - ym0;
    s += `<rect class="embase" x="${f1(xe0)}" y="0" width="${WE}" height="${c.h}"/>`;
    s += `<rect class="fiche" x="${f1(xm0)}" y="${f1(ym0)}" width="${WM}" height="${f1(ym1 - ym0)}"/>`;
    rs.forEach(p => { const ly = p.y - c.y;
      if (p.etiq) s += `<text class="connpin" style="font-size:4px" x="${f1((xe0 + xe1) / 2)}" y="${f1(ly + 1.4)}" text-anchor="middle">${esc(clip(String(p.etiq), 2))}</text>`;
      if ((p.dir || 0) <= 0) s += `<line class="lead" x1="0" y1="${f1(ly)}" x2="${f1(xm0)}" y2="${f1(ly)}"/>`;
      if ((p.dir || 0) >= 0) s += `<line class="lead" x1="${f1(xe1)}" y1="${f1(ly)}" x2="${f1(c.w)}" y2="${f1(ly)}"/>`; });
    s += `<text class="rep" x="${f1(mid)}" y="${f1(c.h + 12)}" text-anchor="middle">${esc(clip(c.name, 14))}</text>`;
  } else if (c.kind === 'strip' || estBarrette(c.name)) {
    /* BARRETTE (et tout bornier, tout potentiel) : une fine ligne pointillée
       verticale ; en bas, un point qui dit le départ, le repère à côté ;
       chaque fil qui vient s'y coller porte le numéro de sa borne, contre la
       ligne. Entre deux bornes shuntées, la ligne devient PLEINE : c'est le
       pontage, tel qu'on le pose. La référence se lit dans la carte. */
    const rangs = (c.kind === 'strip' ? rs : [...rl, ...rr]).slice().sort((u, v) => u.y - v.y);
    const ys = rangs.map(p => p.y - c.y), yh = (ys.length ? Math.min(...ys) : c.h / 2) - 9, yb = (ys.length ? Math.max(...ys) : c.h / 2) + 9;
    s += `<line class="barre" x1="${f1(mid)}" y1="${f1(yh)}" x2="${f1(mid)}" y2="${f1(yb)}"/><circle class="bardot" cx="${f1(mid)}" cy="${f1(yb)}" r="2.1"/>`;
    // entre deux bornes shuntées, la ligne est pleine (aussi fine que le pointillé) : le pontage
    paquetsDePonts(c.shunts || []).forEach(([y1, y2]) => {
      s += `<line class="pont" x1="${f1(mid)}" y1="${f1(y1 - c.y)}" x2="${f1(mid)}" y2="${f1(y2 - c.y)}"/>`; });
    rangs.forEach(p => { const ly = p.y - c.y, d = p.dir || 0;
      if (d <= 0) s += `<line class="lead" x1="0" y1="${f1(ly)}" x2="${f1(mid)}" y2="${f1(ly)}"/>`;
      if (d >= 0) s += `<line class="lead" x1="${f1(mid)}" y1="${f1(ly)}" x2="${f1(c.w)}" y2="${f1(ly)}"/>`; });
    // chaque borne est une pastille sur la ligne, son numéro dedans
    rangs.forEach(p => { const ly = p.y - c.y; s += pastilleSvg(mid, ly, p.etiq ? clip(String(p.etiq), 3) : ''); });
    s += `<text class="rep" x="${f1(mid)}" y="${f1(yb + 12)}" text-anchor="middle">${esc(clip(c.name, 14))}</text>`;
  } else if (estMasse(c.name)) {
    /* MASSE : le fil descend d'un court trait sur le symbole CEI 60617-02 —
       trois barres décroissantes, la plus longue en haut — et le repère se lit
       dessous. Plusieurs fils sur la même masse rejoignent un collecteur. */
    const cx = c.w / 2, ys = [...rl, ...rr].map(p => p.y - c.y);
    const yh = ys.length ? Math.min(...ys) : c.h / 2, yb = ys.length ? Math.max(...ys) : c.h / 2, y0 = yb + 7;
    s += `<line class="earth" x1="${f1(cx)}" y1="${f1(yh)}" x2="${f1(cx)}" y2="${f1(y0)}"/>`;
    rl.forEach(p => { const ly = p.y - c.y; s += `<line class="earth" x1="0" y1="${f1(ly)}" x2="${f1(cx)}" y2="${f1(ly)}"/>`; });
    rr.forEach(p => { const ly = p.y - c.y; s += `<line class="earth" x1="${f1(cx)}" y1="${f1(ly)}" x2="${f1(c.w)}" y2="${f1(ly)}"/>`; });
    if (ys.length > 1) ys.forEach(ly => { s += `<circle class="jn" cx="${f1(cx)}" cy="${f1(ly)}" r="1.5"/>`; });
    [[7, 0], [4.5, 3.2], [2, 6.4]].forEach(([l, dy]) => { s += `<line class="earth" x1="${f1(cx - l)}" y1="${f1(y0 + dy)}" x2="${f1(cx + l)}" y2="${f1(y0 + dy)}"/>`; });
    s += `<text class="rep" x="${f1(cx)}" y="${f1(y0 + 17)}" text-anchor="middle">${esc(clip(c.name, 10))}</text>`;
  } else {
    // équipement : corps, repère en tête (rappelé en pied s'il est très haut), bornes sur les flancs
    s += `<rect class="body" x="${f1(bx)}" y="0" width="${f1(bw)}" height="${c.h}"/>`;
    const connDe = etiq => (c.connecteurs && c.connecteurs.get(String(etiq))) || null;
    const cg = rl.length ? connecteursSvg(bx, -1, rl, c.y, connDe) : '', cd = rr.length ? connecteursSvg(bx + bw, +1, rr, c.y, connDe) : '';
    s += cg + cd;
    s += repereSvg('rep-big', mid, yRep, clip(c.name, 14), bw, 14);
    if (c.h > 380) s += `<text class="bsname" x="${f1(mid)}" y="${f1(c.h - 9)}" text-anchor="middle">${esc(clip(c.name, 12))}</text>`;
    if (designation) s += `<text class="des" x="${f1(mid)}" y="${f1(yRep + 10)}" text-anchor="middle">${esc(clip(designation, 18))}</text>`;
    if (rl.length) s += bornesSvg(bx, -1, c.lw, rl, c.y, connDe);
    if (rr.length) s += bornesSvg(bx + bw, +1, c.rw, rr, c.y, connDe);
    // un shunt entre deux bornes d'un équipement : un pont dans le cadre du connecteur, côté flanc
    // un shunt entre bornes d'un connecteur : un pontage fin, juste devant la pièce, avec ses points
    paquetsDePonts(c.shunts || []).forEach(([y1, y2]) => { const aDroite = rr.some(p => Math.abs(p.y - y1) < 0.6) && !rl.some(p => Math.abs(p.y - y1) < 0.6);
      const xs = aDroite ? bx + bw + CONN_W + 3.5 : bx - CONN_W - 3.5, entre = (aDroite ? rr : rl).filter(p => p.y >= y1 - 0.6 && p.y <= y2 + 0.6);
      s += `<line class="pontage" x1="${f1(xs)}" y1="${f1(y1 - c.y)}" x2="${f1(xs)}" y2="${f1(y2 - c.y)}"/>`;
      entre.forEach(p => { s += `<circle class="jn" cx="${f1(xs)}" cy="${f1(p.y - c.y)}" r="1.3"/>`; }); });
  }
  return s + '</g>';
}

/* ---- la scène entière ------------------------------------------------- */
function sceneSvg(dessin, cartouche, folio, designationDe, choisi) {
  let s = feuilleSvg(dessin.bbox, cartouche, folio);
  const fils = dessin.fils.filter(w => !w.shunt);
  const verticaux = verticauxDe([...fils.map(w => w.pts), ...tracesDePiquage(dessin.barrettes)]);
  fils.forEach(w => { s += filSvg(w, verticaux); });
  const shunts = new Map();
  dessin.fils.forEach(w => { if (!w.shunt) return; const ys = [w.epA.y, w.epB.y].sort((u, v) => u - v); (shunts.get(w.de) || shunts.set(w.de, []).get(w.de)).push(ys); });
  s += reperesDeFil(dessin.fils, verticaux, dessin.barrettes);
  s += piquagesSvg(dessin.barrettes, dessin.piquages, verticaux);
  dessin.points.forEach(d => s += `<circle class="jn" cx="${f1(d.x)}" cy="${f1(d.y)}" r="1.9"/>`);
  // un pont appartient au morceau (barrette en paquets, masses répétées) dont les bornes sont à ses hauteurs, pas à tout ce qui porte le nom
  const dedans = (c, ys) => ys.every(y => y >= c.y - 0.5 && y <= c.y + c.h + 0.5);
  dessin.comps.forEach(c => { c.shunts = (shunts.get(c.name) || []).filter(ys => dedans(c, ys)); c.connecteurs = c.kind === 'equip' ? connecteurParBorne(c.name, dessin.fils) : null; s += blocSvg(c, designationDe ? designationDe(c.name) : '', choisi === c.name); });
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
