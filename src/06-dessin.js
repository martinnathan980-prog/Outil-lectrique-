/* ===========================================================================
   06 — LE DESSIN
   Du placement et du routage on tire la planche : une feuille au format A
   avec ses zones et son cartouche, les fils, les numéros de fil, les
   barrettes, et un symbole par nature de matériel.

   UNE SEULE ENCRE pour les pièces. Ce qui distingue une pièce d'une autre,
   c'est l'épaisseur et la forme du trait, jamais sa couleur : 1,0 le corps
   d'un matériel, 0,95 un fil (et tout ce qui en est : piquage, pont de
   shunt), 0,7 une réglette, 0,55 une cellule. La seule couleur est celle
   des ROUTES : un fil prend la couleur de sa route, jusqu'au bout — le
   raccord de sa borne compris —, que la légende du cartouche nomme ; sans
   route, il reste à l'encre. Son numéro s'écrit en noir.

   RIEN NE S'ÉCRIT SUR RIEN. Tout texte qui a le choix de sa place — le
   numéro d'un fil, le repère d'une barrette, d'une masse, d'une prise —
   la cherche dans l'OCCUPATION : les fils tracés, les corps, les pastilles,
   les textes déjà posés. Les repères se posent d'abord, là où on les attend
   (sous le point de départ, sous les barres) ou au plus près ; les numéros
   de fil ensuite, qui glissent le long de leur segment.
   =========================================================================== */
'use strict';

const f1 = n => Math.round(n * 10) / 10;
/* XML n'accepte aucun caractère de contrôle ; les clés internes en portent. */
const xmlSur = s => String(s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const esc = s => xmlSur(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const escA = s => esc(s).replace(/"/g, '&quot;');
const clip = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

/* Les corps de texte, en unités du dessin. La chasse fixe fait 0,6 corps par
   caractère ; l'interlettrage s'ajoute. Ce sont les seules mesures dont le
   placement des textes a besoin. */
const FS_FIL = 6.4;                 // le numéro d'un fil
const CAR = 0.60;                   // la chasse d'un caractère, en part du corps
const largeurTexte = (n, fs, ls) => n * (CAR * fs + (ls || 0));

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
     .rep-strip{fill:#111b25;font-weight:500;font-size:9px;letter-spacing:1px}
     .des{fill:#6b7885;font-size:6.8px;font-weight:400;letter-spacing:.4px}
     .body{fill:#ffffff;stroke:#1b2430;stroke-width:1}
     .bstrip{fill:#ffffff;stroke:#1b2430;stroke-width:.7}
     .bcell{fill:#ffffff;stroke:#1b2430;stroke-width:.55}
     .bsname{fill:#7a8794;font-size:6.5px;font-weight:600;letter-spacing:.9px}
     .pinlbl{fill:#2b3743;font-size:7.5px;font-weight:500;letter-spacing:.2px}
     .filnum{fill:#0b0f14;font-size:${FS_FIL}px;font-weight:500;letter-spacing:.1px}
     .halo{fill:#ffffff;stroke:none}
     .rep-petit{fill:#1b2430;font-size:6px;font-weight:600;letter-spacing:.3px}
     .lead{stroke:#26323f;stroke-width:.95;stroke-linecap:butt}
     .conn{fill:#ffffff;stroke:#1b2430;stroke-width:.75}
     .connnom{fill:#1b2430;font-size:6.5px;font-weight:700;letter-spacing:.3px}
     .connpin{fill:#2b3743;font-size:5.6px;font-weight:500}
     .prnum{fill:#1b2430;font-size:4.6px;font-weight:600}
     .barre{fill:none;stroke:#1b2430;stroke-width:1;stroke-dasharray:3 2.2;stroke-linecap:butt}
     .bardot{fill:#1b2430;stroke:none}
     .pontage{stroke:#1b2430;stroke-width:1.1;stroke-linecap:butt}
     .barnum{fill:#2b3743;font-size:5.6px;font-weight:600}
     .fiche{fill:#ffffff;stroke:#1b2430;stroke-width:.9}
     .embase{fill:#ffffff;stroke:#1b2430;stroke-width:1.1}
     .pont{stroke:#1b2430;stroke-width:1;stroke-linecap:butt}
     .bpast{fill:#1b2430;stroke:none}
     .bpnum{fill:#ffffff;font-size:4px;font-weight:700}
     .rep-petit{fill:#111b25;font-size:5.6px;font-weight:600;letter-spacing:.35px}
     .rpill{fill:#ffffff;stroke:#8f9ba6;stroke-width:.8}
     .rname{fill:#2b3743;font-weight:600;font-size:7.5px;letter-spacing:.6px}
     .frame{fill:none;stroke:#c2ccd5;stroke-width:.8}
     .zline{stroke:#d8dee4;stroke-width:.7}
     .zone{fill:#9aa5b1;font-size:8px;font-weight:600;letter-spacing:.5px}
     .cbord{fill:none;stroke:#1b2430;stroke-width:1.2}
     .cfond{fill:#f2f4f6;stroke:none}
     .cdiv{stroke:#aab4be;stroke-width:.7}
     .carth{fill:#7d8893;font-size:6px;font-weight:700;letter-spacing:.9px}
     .cartx{fill:#111b25;font-size:8.5px;font-weight:600}
     .cartT{fill:#0b1118;font-size:13px;font-weight:700;letter-spacing:.4px}
     .cartF{fill:#0b1118;font-size:18px;font-weight:700;letter-spacing:.6px}
     .cartA{fill:#7d8893;font-size:6.5px;font-weight:700;letter-spacing:1.6px}
     .legnom{fill:#111b25;font-size:8px;font-weight:700;letter-spacing:.3px}
     .legn{fill:#7d8893;font-size:7px;font-weight:600}
     .selbox{fill:none;stroke:#9c3a14;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
     .comp{cursor:pointer;transition:opacity .12s}
     .focus .cab,.focus .jn{opacity:.10}
     .focus .comp{opacity:.28}
     .focus .cab.hl{opacity:1;stroke-width:2.9}
     .focus .comp.hl{opacity:1}
   </style></defs>`;
}

/* ---- la feuille : cadre, zones A/B/C × 1/2/3, cartouche ------------------ */
/* UNE SEULE FEUILLE pour tous les folios, comme dans un outil de dessin : A3
   paysage, le même cadre, les mêmes zones, le même cartouche. La feuille de
   référence mesure 1680 × 1188 (un quart de millimètre l'unité) ; le dessin
   s'y cale au centre de la zone utile (le cadre moins ses marges, moins la
   bande du cartouche). Le dessin garde ses coordonnées : c'est la feuille
   qui prend l'échelle `k` (unités du dessin par unité de feuille) — un
   folio chargé la remplit, un petit folio s'y dessine plus gros, jamais plus
   de 1 / K_PAGE_MIN fois (sinon ses textes seraient trois fois ceux du
   folio chargé). */
const PAGE_W = 1680, PAGE_H = 1188, PAGE_CADRE = 16, PAGE_MARGE = 44, PAGE_CARTOUCHE = 92, K_PAGE_MIN = 0.55;
function pageDe(comps, fils) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const voir = (x, y) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
  comps.forEach(c => { voir(c.x, c.y - 16); voir(c.x + c.w, c.y + c.h + 12); });      // la lettre au-dessus, le repère dessous
  (fils || []).forEach(w => (w.pts || []).forEach(q => voir(q.x, q.y)));
  if (!isFinite(x0)) { x0 = 0; x1 = 400; y0 = 0; y1 = 280; }
  const uw = PAGE_W - 2 * (PAGE_CADRE + PAGE_MARGE), uh = PAGE_H - 2 * (PAGE_CADRE + PAGE_MARGE) - PAGE_CARTOUCHE;
  const k = Math.max(K_PAGE_MIN, (x1 - x0) / uw, (y1 - y0) / uh);
  const ux = (x0 + x1) / 2 - uw * k / 2, uy = (y0 + y1) / 2 - uh * k / 2;
  return { x: ux - (PAGE_CADRE + PAGE_MARGE) * k, y: uy - (PAGE_CADRE + PAGE_MARGE) * k, w: PAGE_W * k, h: PAGE_H * k, k };
}
function feuilleSvg(bb, cartouche, folio, legende) {
  const k = bb.k || bb.w / PAGE_W;
  return `<g transform="translate(${f1(bb.x)},${f1(bb.y)}) scale(${k.toFixed(5)})">` + feuilleDeReference(cartouche, folio, legende) + '</g>';
}
function feuilleDeReference(cartouche, folio, legende) {
  const x = 0, y = 0, w = PAGE_W, h = PAGE_H, ix = x + PAGE_CADRE, iy = y + PAGE_CADRE, iw = w - 2 * PAGE_CADRE, ih = h - 2 * PAGE_CADRE;
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
  return s + cartoucheSvg(ix + iw, iy + ih, cartouche, folio, legende);
}
/* Le CARTOUCHE, en bas à droite, contre le cadre, dans la bande que le dessin
   laisse libre : un bandeau d'un seul tenant, au trait d'encre, comme sur une
   planche de bureau d'études. De droite à gauche : le FOLIO en grand, et
   l'indice dessous ; le TITRE, la marque de l'atelier, et dessous qui a
   dessiné, quand, à quelle échelle ; puis la LÉGENDE DES ROUTES — un trait
   épais de la couleur de chaque route, son nom, combien de fils elle porte
   sur ce folio (quatre routes par colonne, les colonnes s'ajoutent vers la
   gauche). Un fil sans route reste à l'encre (« sans route ») ; pas de
   légende quand aucun fil n'a de route. */
const CART_H = 84, CART_HAUT = 48, CART_FOLIO = 96, CART_TITRE = 264, LEG_COLONNE = 164, LEG_PAR_COLONNE = 4, LEG_LIGNE = 14.5;
function cartoucheSvg(rx, by, c, folio, legende) {
  const routes = legende && legende.length ? legende : [], nCol = Math.ceil(routes.length / LEG_PAR_COLONNE);
  const W = CART_FOLIO + CART_TITRE + nCol * LEG_COLONNE, x = rx - W, y = by - CART_H, xT = rx - CART_FOLIO - CART_TITRE, xF = rx - CART_FOLIO, yB = y + CART_HAUT;
  const trait = (a, b, c2, d) => `<line class="cdiv" x1="${f1(a)}" y1="${f1(b)}" x2="${f1(c2)}" y2="${f1(d)}"/>`;
  let s = `<rect class="cfond" x="${f1(xF)}" y="${f1(y)}" width="${CART_FOLIO}" height="${CART_HAUT}"/>`;
  // les cases : titre et folio en haut ; dessiné, date, échelle, indice en bas ; chaque colonne de la légende
  s += trait(xT, yB, rx, yB) + trait(xF, y, xF, by) + trait(xT + 88, yB, xT + 88, by) + trait(xT + 176, yB, xT + 176, by);
  for (let k = 0; k < nCol; k++) s += trait(xT - k * LEG_COLONNE, y, xT - k * LEG_COLONNE, by);
  const champ = (cx, cy, h, v, n) => `<text class="carth" x="${f1(cx)}" y="${f1(cy)}">${h}</text><text class="cartx" x="${f1(cx)}" y="${f1(cy + 15)}">${esc(clip(v || '—', n))}</text>`;
  s += champ(xT + 10, yB + 12, 'DESSINÉ', c.auteur, 12) + champ(xT + 98, yB + 12, 'DATE', c.date, 12) + champ(xT + 186, yB + 12, 'ÉCHELLE', c.echelle, 11) + champ(xF + 10, yB + 12, 'INDICE', c.indice, 11);
  s += `<text class="carth" x="${f1(xT + 10)}" y="${f1(y + 13)}">TITRE</text><text class="cartA" x="${f1(xF - 10)}" y="${f1(y + 13)}" text-anchor="end">ATELIER·SCHÉMA</text>`;
  s += `<text class="cartT" x="${f1(xT + 10)}" y="${f1(y + 36)}">${esc(clip(c.titre || '—', 30))}</text>`;
  s += `<text class="carth" x="${f1(xF + 10)}" y="${f1(y + 13)}">FOLIO</text><text class="cartF" x="${f1(xF + CART_FOLIO / 2)}" y="${f1(y + 39)}" text-anchor="middle">${esc(folio || '1 / 1')}</text>`;
  // la légende des routes, colonne après colonne vers la gauche
  routes.forEach((r, i) => { const k = Math.floor(i / LEG_PAR_COLONNE), cx = xT - (nCol - k) * LEG_COLONNE + 10, cy = y + 30 + (i % LEG_PAR_COLONNE) * LEG_LIGNE;
    s += `<line x1="${f1(cx)}" y1="${f1(cy - 3)}" x2="${f1(cx + 24)}" y2="${f1(cy - 3)}" style="stroke:${r.couleur || '#26323f'};stroke-width:3.2;stroke-linecap:round"/>`;
    s += `<text class="legnom" x="${f1(cx + 32)}" y="${f1(cy)}">${esc(clip(r.route || 'sans route', 15))}</text><text class="legn" x="${f1(cx + LEG_COLONNE - 20)}" y="${f1(cy)}" text-anchor="end">${r.n} fil${r.n > 1 ? 's' : ''}</text>`; });
  if (nCol) s += `<text class="carth" x="${f1(x + 10)}" y="${f1(y + 13)}">ROUTES</text>`;
  return s + `<rect class="cbord" x="${f1(x)}" y="${f1(y)}" width="${f1(W)}" height="${CART_H}"/>`;
}

/* ---- les fils --------------------------------------------------------- */
/* Un croisement se lit d'un coup d'œil quand le fil horizontal ENJAMBE le
   vertical : un petit pont, toujours au-dessus. Deux fils qui se touchent en
   bout (piquage, jonction) ne se croisent pas : le test est strict. Des
   verticaux qui se suivent (les pistes voisines d'une goulotte) sont
   enjambés d'un seul pont, un peu plus haut qu'un pont simple. */
const R_PONT = 2.8;
const GROUPE_PONT = 12;             // deux verticaux plus proches que ça partagent un pont
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
      xs.forEach(x => { if (g && Math.abs(x - g[g.length - 1]) < GROUPE_PONT) g.push(x); else groupes.push(g = [x]); });
      groupes.forEach(gr => { const x0 = gr[0] - s * R_PONT, x1 = gr[gr.length - 1] + s * R_PONT, rx = Math.abs(x1 - x0) / 2, ry = Math.min(4, R_PONT + (rx - R_PONT) / 5);
        d += ` L ${f1(x0)} ${f1(y)} A ${f1(rx)} ${f1(ry)} 0 0 ${s > 0 ? 1 : 0} ${f1(x1)} ${f1(y)}`; }); }
    d += ' L ' + f1(b.x) + ' ' + f1(b.y); }
  return d; }
/* un fil se trace à l'encre, ou à la COULEUR DE SA ROUTE (le dessin en porte la fonction, `couleurDe` : l'interface la
   tient du contrat) ; la surbrillance ne touche que l'opacité et l'épaisseur, la couleur reste */
function filSvg(w, verticaux, couleur) {
  if (!w.pts.length) return '';           // un shunt n'a pas de tracé : la réglette le porte
  return `<path class="cab" data-i="${w.i}" data-a="${escA(w.de)}" data-b="${escA(w.vers)}"${couleur ? ` style="stroke:${couleur}"` : ''} d="${cheminAvecPonts(w.pts, verticaux)}"/>`;
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
/* Les bornes d'un piquage, de haut en bas : la borne d'origine et chaque départ. */
const bornesDePiquage = b => [b.py, ...b.gardes.map(k => k.y)].filter((y, i, a) => a.findIndex(z => Math.abs(z - y) < 0.6) === i).sort((u, v) => u - v);
function piquagesSvg(barrettes, piquages, verticaux, couleurBout) {
  let s = '';
  (barrettes.raccords || []).forEach(r => { const c = couleurBout && (couleurBout(r.x0, r.y) || couleurBout(r.x1, r.y));
    s += `<path class="cab"${styleTrait(c)} d="${cheminAvecPonts([{ x: r.x0, y: r.y }, { x: r.x1, y: r.y }], verticaux)}"/>`; });
  barrettes.forEach(b => {
    /* Un piquage — plusieurs fils sur une même borne — se dessine comme la
       BARRETTE qu'il faudra poser : une fine ligne pointillée, un point à
       chaque départ, les numéros 1, 2, 3… du côté des départs. */
    const ys = bornesDePiquage(b);
    s += `<line class="barre" x1="${f1(b.x)}" y1="${f1(ys[0])}" x2="${f1(b.x)}" y2="${f1(ys[ys.length - 1])}"/>`;
    ys.forEach((y, i) => { s += pastilleSvg(b.x, y, String(i + 1)); }); });
  return s;
}
/* Une borne de barrette : un point noir sur la ligne, comme d'habitude, son
   numéro dedans en blanc. Le point grandit avec le numéro ; sur une même
   réglette, tous les points ont la taille du plus grand. */
const R_PASTILLE = etiq => etiq.length > 2 ? 4.6 : (etiq.length > 1 ? 4 : 3.4);
/* Le bout de fil qui entre dans un bloc — le raccord d'une borne, l'amorce d'une masse, d'un morceau de barrette, d'une
   prise — est du fil : il prend la couleur de sa route (le lecteur : « tous les fils doivent être de la même couleur,
   des fois les extrémités c'est pas le cas »). `couleurBout(x, y)` la dit pour un bout de fil, en absolu. */
const styleTrait = couleur => couleur ? ` style="stroke:${couleur}"` : '';
function couleursDesBouts(fils, couleurDe) { const m = new Map(), cle = (x, y) => Math.round(x * 2) + ',' + Math.round(y * 2);
  if (couleurDe) fils.forEach(w => { if (w.shunt) return; const c = couleurDe(w); if (!c) return;
    [w.epA, w.epB, w.pts[0], w.pts[w.pts.length - 1]].forEach(ep => { if (ep && !m.has(cle(ep.x, ep.y))) m.set(cle(ep.x, ep.y), c); }); });
  return (x, y) => m.get(cle(x, y)) || null; }
function pastilleSvg(x, y, etiq, r) {
  return `<circle class="bpast" cx="${f1(x)}" cy="${f1(y)}" r="${r || R_PASTILLE(etiq)}"/><text class="bpnum" x="${f1(x)}" y="${f1(y + 1.45)}" text-anchor="middle">${esc(etiq)}</text>`;
}

/* ---- l'occupation : ce qui est déjà posé, pour ne rien écrire dessus ------
   Les segments de fil (piquages compris), les corps des blocs, les pastilles
   et les textes déjà posés. Une boîte { x0, y0, x1, y1 } est LIBRE si rien de
   tout ça ne la prend ; `mV` est la marge gardée autour d'un vertical (un
   pont y monte de R_PONT), `sauf` l'identifiant du bloc dont on écrit le
   repère (on peut écrire contre son propre corps). */
function occupationDe(fils, barrettes, comps) {
  const H = [], V = [], boites = [], corps = [];
  const seg = (a, b) => { if (Math.abs(a.y - b.y) < 0.6) { if (Math.abs(a.x - b.x) > 0.6) H.push({ y: a.y, x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x) }); }
    else if (Math.abs(a.x - b.x) < 0.6) V.push({ x: a.x, y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y) }); };
  fils.forEach(w => { if (w.shunt) return; for (let i = 0; i < w.pts.length - 1; i++) seg(w.pts[i], w.pts[i + 1]); });
  tracesDePiquage(barrettes || []).forEach(pts => seg(pts[0], pts[1]));
  (barrettes || []).forEach(b => bornesDePiquage(b).forEach((y, i) => { const r = R_PASTILLE(String(i + 1)) + 1; boites.push({ x0: b.x - r, y0: y - r, x1: b.x + r, y1: y + r }); }));
  (comps || []).forEach(c => {
    // le corps d'un équipement compte avec ses pièces de connecteur et leurs lettres ; celui d'une réglette, sa colonne
    /* un morceau de barrette finit par son point de départ, au ras de son cadre : un texte s'en garde de quatre (un numéro
       de fil s'écrivait contre le point du morceau 668VT31, le fil passant un pas sous sa dernière borne) */
    if (c.kind !== 'tag') { const d = c.kind === 'equip' ? CONN_W : 0, pied = c.kind === 'strip' && !estCoupure(c.name) ? 4 : 0;
      corps.push({ x0: c.x + c.lw - d, y0: c.y, x1: c.x + c.w - c.rw + d, y1: c.y + c.h + pied, id: c.id });
      if (c.kind === 'equip') piecesDeConnecteur(c).forEach(p => boites.push({ x0: p.x0, x1: p.x1, y0: p.t - 8.5, y1: p.t - 1, id: c.id })); return; }
    // une pastille : les barres d'une masse, le pointillé d'un morceau de barrette, la pilule d'un rail — le bout de fil qui y mène reste libre
    const M = symboleDePastille(c);
    if (M && M.genre === 'masse') boites.push({ x0: Math.min(M.xs, M.xs + M.d * 6.4), x1: Math.max(M.xs, M.xs + M.d * 6.4), y0: M.y - 6, y1: M.y + 6, id: c.id });
    else if (M) boites.push({ x0: M.xs - 5, x1: M.xs + 5, y0: M.y - 6.5, y1: M.y + 7.5, id: c.id });
    else boites.push({ x0: c.x, x1: c.x + c.w, y0: c.y + c.h / 2 - 6, y1: c.y + c.h / 2 + 6, id: c.id }); });
  const O = { H, V, boites, corps };
  // `sauf` : le bloc dont on pose le repère ne se gêne pas lui-même ; sans `sauf`, TOUT compte (les textes déjà posés n'ont pas d'id)
  const autre = (o, sauf) => sauf == null || o.id == null || o.id !== sauf;
  // `sien` : la hauteur du fil qu'un numéro chevauche de plein droit (il s'écrit DANS le fil, qui le traverse)
  O.libre = (b, mV, sauf, sien) => !boites.some(o => autre(o, sauf) && b.x1 > o.x0 - 3 && b.x0 < o.x1 + 3 && b.y1 > o.y0 - 1.5 && b.y0 < o.y1 + 1.5)
    && !corps.some(o => autre(o, sauf) && b.x1 > o.x0 && b.x0 < o.x1 && b.y1 > o.y0 && b.y0 < o.y1)
    && !H.some(s => s.y > b.y0 - 0.5 && s.y < b.y1 + 0.5 && s.x1 > b.x0 && s.x0 < b.x1 && !(sien != null && Math.abs(s.y - sien) < 0.6))
    && !V.some(s => s.x > b.x0 - mV && s.x < b.x1 + mV && s.y1 > b.y0 && s.y0 < b.y1);
  O.poser = b => { boites.push(b); return b; };
  return O;
}
/* La boîte d'un texte posé en (x, y) : ancré au milieu, au début ou à la fin. */
function boiteDeTexte(x, y, a, n, fs, ls) { const w = largeurTexte(n, fs, ls), x0 = a === 'middle' ? x - w / 2 : (a === 'end' ? x - w : x);
  return { x0, y0: y - 0.78 * fs, x1: x0 + w, y1: y + 0.16 * fs }; }

/* ---- les repères qui cherchent leur place --------------------------------
   Le repère d'une barrette se lit sous son point de départ, celui d'une
   masse sous ses barres, celui d'une prise sous l'embase : c'est là qu'on
   les attend, et c'est là qu'ils vont quand rien n'y passe. Sinon ils
   prennent la place libre la plus proche — à côté du point, au-dessus des
   barres, au-delà du symbole — plutôt que de se faire barrer par un fil. */
/* Le symbole d'une pastille collée à sa borne, en absolu : le fil ARRIVE par
   le flanc que dit p.dir (-1 : par la gauche), le symbole est tout de suite
   là (xs) et grandit vers l'autre flanc (d). Une MASSE : trois barres depuis
   xs ; un MORCEAU DE BARRETTE (une borne, un fil, rien après) : un court
   pointillé vertical en xs, la borne en point noir numéroté dessus, le point
   de départ dessous. Le repère se lit sous le symbole, dans le pas des
   bornes (HAUT_PASTILLE) : il ne touche pas le fil voisin. */
function symboleDePastille(c) { if (c.kind !== 'tag') return null;
  const genre = estMasse(c.name) ? 'masse' : estBarrette(c.name) ? 'barrette' : null; if (!genre) return null;
  const p = (c.rangs.S || [])[0] || { y: c.y + c.h / 2, dir: -1 }, d = (p.dir || -1) < 0 ? 1 : -1, r = genre === 'masse' ? 4 : 7;
  return { genre, y: p.y, d, xs: d > 0 ? c.x + r : c.x + c.w - r, etiq: p.etiq }; }
function reperesCandidats(c) {
  const bw = c.w - c.lw - c.rw, mid = c.x + c.lw + bw / 2, rs = c.rangs.S || [];
  const M = symboleDePastille(c);
  // masse, morceau de barrette collé, prise de coupure, barrette : le même petit repère
  if (M && M.genre === 'masse') { const cx = M.xs + M.d * 3.2;
    return { cls: 'rep-petit', fs: 6, ls: 0.3, nom: clip(c.name, 10), cands: [
      { x: cx, y: M.y + 11.6, a: 'middle' }, { x: cx, y: M.y - 8.4, a: 'middle' }, { x: M.xs + M.d * 9.5, y: M.y + 2, a: M.d > 0 ? 'start' : 'end' }] }; }
  if (M) return { cls: 'rep-petit', fs: 6, ls: 0.3, nom: clip(c.name, 10), cands: [
    { x: M.xs, y: M.y + 12.4, a: 'middle' }, { x: M.xs, y: M.y - 8.4, a: 'middle' }, { x: M.xs + M.d * 7, y: M.y + 2, a: M.d > 0 ? 'start' : 'end' }] };
  if (c.kind === 'strip' && estCoupure(c.name)) return { cls: 'rep-petit', fs: 6, ls: 0.3, nom: clip(c.name, 14), cands: [
    { x: mid, y: c.y + c.h + 8, a: 'middle' }, { x: mid, y: c.y - 4, a: 'middle' }, { x: mid, y: c.y + c.h + 16, a: 'middle' }] };
  if (c.kind === 'strip' || estBarrette(c.name)) {
    const ys = (c.kind === 'strip' ? rs : [...(c.rangs.L || []), ...(c.rangs.R || [])]).map(p => p.y);
    const yh = (ys.length ? Math.min(...ys) : c.y + c.h / 2) - 9, yb = (ys.length ? Math.max(...ys) : c.y + c.h / 2) + 9;
    return { cls: 'rep-petit', fs: 6, ls: 0.3, nom: clip(c.name, 14), yh, yb, mid, cands: [
      { x: mid, y: yb + 8, a: 'middle' }, { x: mid + 5, y: yb + 2.2, a: 'start' }, { x: mid - 5, y: yb + 2.2, a: 'end' }, { x: mid, y: yh - 3.5, a: 'middle' }, { x: mid, y: yb + 16, a: 'middle' }] }; }
  return null;
}
function poserReperes(comps, occ) {
  comps.slice().sort((u, v) => u.y - v.y || u.x - v.x).forEach(c => { const R = reperesCandidats(c); if (!R) { c.repere = null; return; }
    let choix = null;
    for (const k of R.cands) { const b = boiteDeTexte(k.x, k.y, k.a, R.nom.length, R.fs, R.ls); if (occ.libre(b, 1, c.id)) { choix = { ...k, b }; break; } }
    if (!choix) { const k = R.cands[0]; choix = { ...k, b: boiteDeTexte(k.x, k.y, k.a, R.nom.length, R.fs, R.ls) }; }
    occ.poser(choix.b); c.repere = { x: choix.x, y: choix.y, a: choix.a, cls: R.cls, nom: R.nom }; });
}
const repereTexte = r => `<text class="${r.cls}" x="${f1(r.x)}" y="${f1(r.y)}" text-anchor="${r.a}">${esc(r.nom)}</text>`;

/* Le numéro de fil, sur le plus long segment horizontal, en son milieu —
   ou décalé le long du segment si le milieu est pris ; sinon sur le suivant,
   du plus long au plus court ; sinon debout, le long d'un vertical (du plus
   long au plus court, glissé le long de chacun). Jamais sur une autre
   étiquette, jamais barré par un fil, jamais collé à une pastille. Mieux
   vaut un fil muet qu'une planche où les étiquettes se marchent dessus :
   les plus longs segments choisissent en premier. Sans occupation donnée,
   on la bâtit des fils seuls (c'est ainsi que le placement compte les fils
   muets). Le plus long segment seul laissait muet un fil dont l'horizontale
   passait sous une masse et la verticale entre deux ponts (folio 5,
   W-526). */
function reperesDeFil(fils, verticaux, barrettes, occ) {
  const H = 5.6, fs = FS_FIL;
  occ = occ || occupationDe(fils, barrettes || [], []);
  const cands = [];
  fils.forEach(w => { const nom = String(w.cable || '').trim(); if (!nom) return;
    const hs = [], vs = [];
    for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1];
      if (Math.abs(a.y - b.y) < 0.6) hs.push({ L: Math.abs(b.x - a.x), x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), y: a.y });
      else if (Math.abs(a.x - b.x) < 0.6) vs.push({ L: Math.abs(b.y - a.y), x: a.x, y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y) }); }
    // un fil qui n'est qu'un raccord vers un piquage a, sur la verticale du piquage, un tronçon à lui seul
    if (!vs.length && w.pts.length) { const t = tronconDePiquage(w, barrettes || []); if (t) vs.push({ L: t.vL, x: t.vx, y0: t.vy0, y1: t.vy1 }); }
    hs.sort((u, v) => v.L - u.L); vs.sort((u, v) => v.L - u.L);
    cands.push({ nom, L: hs.length ? hs[0].L : 0, hs, vs }); });
  cands.sort((a, b) => b.L - a.L);
  let out = '';
  /* un fil court (une masse collée à sa borne) garde son numéro : il peut
     déborder de quelques unités, mais pas sur le symbole — l'occupation le
     repousse vers l'équipement, où le flanc est vide */
  cands.forEach(c => { const larg = largeurTexte(c.nom.length, fs, 0.1);
    let pose = null;
    /* le numéro s'écrit DANS le fil, qui le traverse (un halo blanc l'isole) : c'est ainsi qu'on sait que c'est le bon
       fil ; s'il n'y a pas la place à cette hauteur, au-dessus. `ecart` : où va la ligne de base par rapport au fil ;
       [écart au fil, débord permis à chaque bout] : sur un fil court, un numéro trop long monte d'une ligne et déborde
       davantage — au-dessus du symbole, jamais sur le corps de l'équipement (l'occupation l'y repousse) */
    const dans = -(H / 2 - 0.35 * fs) - 0.3;   // ligne de base pour que le texte soit centré sur le fil
    for (const g of c.hs) { if (pose) break; const court = g.L < 40;
      for (const [ecart, marge] of (court ? [[dans, -4], [2.2, -4], [7.5, -30]] : [[dans, 5], [2.2, 5]])) { if (pose || !g.L || larg + 2 * marge > g.L) continue;
        const mid = (g.x0 + g.x1) / 2, dmax = Math.max(0, (g.L - larg) / 2 - marge), sien = ecart === dans ? g.y : null;
        for (let d = 0; d <= dmax + 0.01 && !pose; d += court ? 1 : Math.max(3, larg / 3)) {
          for (const cx of (d === 0 ? [mid] : [mid - d, mid + d])) {
            const x0 = cx - larg / 2, x1 = cx + larg / 2, y1 = g.y - ecart, y0 = y1 - H;
            if (x0 < g.x0 + marge || x1 > g.x1 - marge) continue;
            if (occ.libre({ x0, y0, x1, y1 }, R_PONT + 1, null, sien)) { pose = { cx, x0, y0, x1, y1, dedans: sien != null }; break; } } } } }
    if (pose) { occ.poser(pose);
      // dans le fil : un fond blanc coupe le trait sous le numéro, le fil repart de part et d'autre
      if (pose.dedans) out += `<rect class="halo" x="${f1(pose.x0 - 1.2)}" y="${f1(pose.y0 + 0.5)}" width="${f1(pose.x1 - pose.x0 + 2.4)}" height="${f1(pose.y1 - pose.y0 - 1)}"/>`;
      out += `<text class="filnum" x="${f1(pose.cx)}" y="${f1(pose.y0 + 0.78 * fs)}" text-anchor="middle">${esc(c.nom)}</text>`; return; }
    // pas de place à l'horizontale : le numéro se lit debout, le long d'un vertical
    for (const v of c.vs) { if (larg + 10 > v.L) continue; const mid = (v.y0 + v.y1) / 2, dmax = (v.L - larg) / 2 - 5, x1 = v.x - 2.2, x0 = x1 - H;
      for (let d = 0; d <= dmax + 0.01; d += 3) for (const cy of (d === 0 ? [mid] : [mid - d, mid + d])) {
        const y0 = cy - larg / 2, y1 = cy + larg / 2; if (!occ.libre({ x0, y0, x1, y1 }, 0.5)) continue;
        occ.poser({ x0, y0, x1, y1 });
        out += `<text class="filnum" transform="rotate(-90 ${f1(x1)} ${f1(cy)})" x="${f1(x1)}" y="${f1(cy)}" text-anchor="middle">${esc(c.nom)}</text>`; return; } } });
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
function bornesSvg(xCorps, dir, prof, rangs, baseY, connecteurDe, couleurA) {
  let out = '';
  rangs.forEach(p => { const y = p.y - baseY, xo = xCorps + dir * prof, c = connecteurDe ? connecteurDe(p.etiq) : null;
    // dans un connecteur, le fil s'arrête sur le connecteur ; sinon il va jusqu'au corps — à la couleur de son fil
    const xb = c ? xCorps + dir * CONN_W : xCorps;
    out += `<line class="lead"${styleTrait(couleurA && couleurA(p.y))} x1="${f1(xo)}" y1="${f1(y)}" x2="${f1(xb)}" y2="${f1(y)}"/>`;
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
   dedans, sa lettre au-dessus. Un connecteur dont les bornes ne se suivent
   pas a plusieurs pièces de la même lettre. */
const CONN_W = 13;
/* Les pièces d'un flanc, en coordonnées du bloc : des bornes qui se suivent
   sous la même lettre font une pièce { nom, x0, x1, t, b }. */
function piecesDuFlanc(xCorps, dir, rangs, baseY, connecteurDe) {
  const runs = []; let cur = null;
  rangs.forEach(p => { const c = connecteurDe(p.etiq); const nom = c ? c.nom : '';
    if (cur && cur.nom === nom) { cur.y1 = p.y - baseY; return; }
    cur = { nom, y0: p.y - baseY, y1: p.y - baseY }; runs.push(cur); });
  const x0 = dir > 0 ? xCorps : xCorps - CONN_W;
  return runs.filter(r => r.nom).map(r => ({ nom: r.nom, x0, x1: x0 + CONN_W, t: r.y0 - PRH / 2 - 1, b: r.y1 + PRH / 2 + 1 }));
}
/* Toutes les pièces d'un équipement, en absolu. */
function piecesDeConnecteur(c) { const connDe = etiq => (c.connecteurs && c.connecteurs.get(String(etiq))) || null, bx = c.lw, bw = c.w - c.lw - c.rw;
  return [...piecesDuFlanc(bx, -1, c.rangs.L || [], c.y, connDe), ...piecesDuFlanc(bx + bw, +1, c.rangs.R || [], c.y, connDe)]
    .map(p => ({ ...p, x0: p.x0 + c.x, x1: p.x1 + c.x, t: p.t + c.y, b: p.b + c.y })); }
function connecteursSvg(xCorps, dir, rangs, baseY, connecteurDe) {
  let out = '';
  piecesDuFlanc(xCorps, dir, rangs, baseY, connecteurDe).forEach(p => {
    // carrée du côté du corps (elle y est collée), arrondie du côté du fil
    out += `<path class="conn" d="${pieceCollee(p.x0, p.t, CONN_W, p.b - p.t, dir, 1.8)}"/>`;
    // la lettre du connecteur, au-dessus de la pièce
    out += `<text class="connnom" x="${f1(p.x0 + CONN_W / 2)}" y="${f1(p.t - 2.2)}" text-anchor="middle">${esc(clip(p.nom, 3))}</text>`; });
  return out;
}
/* Le contour d'une pièce collée au corps : angles vifs côté corps (dir > 0 : le corps est à gauche), arrondis dehors. */
function pieceCollee(x, y, w, h, dir, r) {
  if (dir > 0) return `M${f1(x)} ${f1(y)} H${f1(x + w - r)} a${r} ${r} 0 0 1 ${r} ${r} V${f1(y + h - r)} a${r} ${r} 0 0 1 -${r} ${r} H${f1(x)} Z`;
  return `M${f1(x + w)} ${f1(y)} H${f1(x + r)} a${r} ${r} 0 0 0 -${r} ${r} V${f1(y + h - r)} a${r} ${r} 0 0 0 ${r} ${r} H${f1(x + w)} Z`;
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
/* Le repère d'un bloc à repère mobile, en coordonnées du bloc ; à défaut
   d'une place cherchée (un dessin sans occupation), la place attendue. */
function repereDe(c) { const r = c.repere || (() => { const R = reperesCandidats(c); return R ? { ...R.cands[0], cls: R.cls, nom: R.nom } : null; })();
  return r ? repereTexte({ ...r, x: r.x - c.x, y: r.y - c.y }) : ''; }
function blocSvg(c, designation, choisi, couleurBout) {
  let s = `<g class="comp" data-name="${escA(c.name)}" transform="translate(${f1(c.x)},${f1(c.y)})">`;
  // la couleur du fil qui arrive à une hauteur (absolue) sur le flanc gauche, ou droit, du bloc
  const aGauche = y => couleurBout ? couleurBout(c.x, y) : null, aDroite = y => couleurBout ? couleurBout(c.x + c.w, y) : null;
  if (choisi) s += coins('selbox', 5, c.w, c.h);
  const bx = c.lw, bw = c.w - c.lw - c.rw, mid = bx + bw / 2;
  const rl = c.rangs.L || [], rr = c.rangs.R || [], rs = c.rangs.S || [];
  const yRep = c.h > 90 ? 21 : c.h / 2 - 1.5;
  if (c.kind === 'tag' && estMasse(c.name)) {
    /* MASSE collée à sa borne : le symbole CEI 60617-02 est dans l'AXE du fil,
       perpendiculaire à l'équipement — trois barres verticales décroissantes
       vers l'extérieur — et le repère se lit dessous. */
    // p.dir dit par quel flanc le fil ARRIVE (-1 : par la gauche) ; le symbole grandit vers l'autre flanc.
    const M = symboleDePastille(c), ly = M.y - c.y, d = M.d, xs = M.xs - c.x, x0 = d > 0 ? 0 : c.w;   // le fil entre par un flanc, le symbole est tout de suite là
    s += `<line class="earth"${styleTrait(d > 0 ? aGauche(M.y) : aDroite(M.y))} x1="${f1(x0)}" y1="${f1(ly)}" x2="${f1(xs)}" y2="${f1(ly)}"/>`;
    [[6, 0], [4, 3.2], [2, 6.4]].forEach(([l, dx]) => { const x = xs + d * dx; s += `<line class="earth" x1="${f1(x)}" y1="${f1(ly - l)}" x2="${f1(x)}" y2="${f1(ly + l)}"/>`; });
    // le repère, petit, sous les barres — ou là où la place est libre
    s += repereDe(c);
  } else if (c.kind === 'tag' && estBarrette(c.name)) {
    /* MORCEAU DE BARRETTE collé à sa borne — une borne, un fil, rien après :
       il se dessine comme une masse, dans l'AXE du fil, en petit : le fil
       arrive sur un court pointillé vertical, la borne est le point noir
       numéroté dessus, le point de départ dessous, le repère en petit. */
    const M = symboleDePastille(c), ly = M.y - c.y, xs = M.xs - c.x, x0 = M.d > 0 ? 0 : c.w;
    s += `<line class="lead"${styleTrait(M.d > 0 ? aGauche(M.y) : aDroite(M.y))} x1="${f1(x0)}" y1="${f1(ly)}" x2="${f1(xs)}" y2="${f1(ly)}"/>`;
    s += `<line class="barre" x1="${f1(xs)}" y1="${f1(ly - 6)}" x2="${f1(xs)}" y2="${f1(ly + 6)}"/><circle class="bardot" cx="${f1(xs)}" cy="${f1(ly + 6)}" r="1.5"/>`;
    s += pastilleSvg(xs, ly, M.etiq ? clip(String(M.etiq), 3) : '');
    s += repereDe(c);
  } else if (c.kind === 'tag') {
    // pastille de potentiel, en face de la borne desservie
    s += `<rect class="rpill" x="0" y="${f1(c.h / 2 - 6)}" width="${c.w}" height="12" rx="6"/>`;
    s += `<text class="rname" x="${f1(c.w / 2)}" y="${f1(c.h / 2 + 2.7)}" text-anchor="middle">${esc(clip(c.name, 7))}</text>`;
  } else if (c.kind === 'strip' && estCoupure(c.name)) {
    /* PRISE DE COUPURE : deux rectangles fins collés — à gauche la PARTIE
       MOBILE (la fiche, sur le faisceau), plus large et un peu moins haute ;
       à droite la PARTIE FIXE (l'embase, sur la structure), la plus fine et
       la plus haute, où les contacts sont numérotés. C'est la différence de
       hauteur qui dit laquelle est laquelle. Le fil amont arrive sur la
       mobile, le fil aval repart de l'embase. Angles vifs. */
    const WE = 6, WM = 9, xm0 = mid - (WE + WM) / 2, xe0 = xm0 + WM, xe1 = xe0 + WE;
    const ym0 = Math.min(PRH * 0.35, c.h / 6), ym1 = c.h - ym0;
    s += `<rect class="embase" x="${f1(xe0)}" y="0" width="${WE}" height="${c.h}"/>`;
    s += `<rect class="fiche" x="${f1(xm0)}" y="${f1(ym0)}" width="${WM}" height="${f1(ym1 - ym0)}"/>`;
    rs.forEach(p => { const ly = p.y - c.y, n = p.etiq ? clip(String(p.etiq), 2) : '';
      if (n) s += `<text class="prnum"${n.length > 1 ? ' style="font-size:3.8px"' : ''} x="${f1((xe0 + xe1) / 2)}" y="${f1(ly + 1.6)}" text-anchor="middle">${esc(n)}</text>`;
      if ((p.dir || 0) <= 0) s += `<line class="lead"${styleTrait(aGauche(p.y))} x1="0" y1="${f1(ly)}" x2="${f1(xm0)}" y2="${f1(ly)}"/>`;
      if ((p.dir || 0) >= 0) s += `<line class="lead"${styleTrait(aDroite(p.y))} x1="${f1(xe1)}" y1="${f1(ly)}" x2="${f1(c.w)}" y2="${f1(ly)}"/>`; });
    s += repereDe(c);
  } else if (c.kind === 'strip' || estBarrette(c.name)) {
    /* BARRETTE (et tout bornier, tout potentiel) : une fine ligne pointillée
       verticale ; en bas, un point qui dit le départ, le repère à côté ;
       chaque fil qui vient s'y coller porte le numéro de sa borne, contre la
       ligne. Entre deux bornes shuntées, la ligne devient PLEINE : c'est le
       pontage, tel qu'on le pose. La référence se lit dans la carte. */
    const rangs = (c.kind === 'strip' ? rs : [...rl, ...rr]).slice().sort((u, v) => u.y - v.y);
    const ys = rangs.map(p => p.y - c.y), yh = (ys.length ? Math.min(...ys) : c.h / 2) - 9, yb = (ys.length ? Math.max(...ys) : c.h / 2) + 9;
    s += `<line class="barre" x1="${f1(mid)}" y1="${f1(yh)}" x2="${f1(mid)}" y2="${f1(yb)}"/><circle class="bardot" cx="${f1(mid)}" cy="${f1(yb)}" r="2.1"/>`;
    // un morceau de barrette est un paquet : ses bornes sont pontées par construction, la ligne reste pointillée
    rangs.forEach(p => { const ly = p.y - c.y, d = p.dir || 0;
      if (d <= 0) s += `<line class="lead"${styleTrait(aGauche(p.y))} x1="0" y1="${f1(ly)}" x2="${f1(mid)}" y2="${f1(ly)}"/>`;
      if (d >= 0) s += `<line class="lead"${styleTrait(aDroite(p.y))} x1="${f1(mid)}" y1="${f1(ly)}" x2="${f1(c.w)}" y2="${f1(ly)}"/>`; });
    // chaque borne est une pastille sur la ligne, son numéro dedans
    const etiqs = rangs.map(p => p.etiq ? clip(String(p.etiq), 3) : ''), r = Math.max(...etiqs.map(R_PASTILLE));
    rangs.forEach((p, i) => { s += pastilleSvg(mid, p.y - c.y, etiqs[i], r); });
    s += repereDe(c);
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
    if (rl.length) s += bornesSvg(bx, -1, c.lw, rl, c.y, connDe, aGauche);
    if (rr.length) s += bornesSvg(bx + bw, +1, c.rw, rr, c.y, connDe, aDroite);
    // un shunt entre bornes d'un connecteur : un pontage fin, juste devant la pièce, un point sur chaque borne pontée
    paquetsDePonts(c.shunts || []).forEach(([y1, y2]) => { const aDroite = rr.some(p => Math.abs(p.y - y1) < 0.6) && !rl.some(p => Math.abs(p.y - y1) < 0.6);
      const xs = aDroite ? bx + bw + CONN_W + 3.5 : bx - CONN_W - 3.5, entre = (aDroite ? rr : rl).filter(p => p.y >= y1 - 0.6 && p.y <= y2 + 0.6);
      s += `<line class="pontage" x1="${f1(xs)}" y1="${f1(y1 - c.y)}" x2="${f1(xs)}" y2="${f1(y2 - c.y)}"/>`;
      entre.forEach(p => { s += `<circle class="jn" cx="${f1(xs)}" cy="${f1(p.y - c.y)}" r="1.6"/>`; }); });
  }
  return s + '</g>';
}

/* ---- la scène entière ------------------------------------------------- */
function sceneSvg(dessin, cartouche, folio, designationDe, choisi) {
  let s = feuilleSvg(dessin.bbox, cartouche, folio, dessin.legende);
  const fils = dessin.fils.filter(w => !w.shunt), couleurDe = dessin.couleurDe || null;
  const verticaux = verticauxDe([...fils.map(w => w.pts), ...tracesDePiquage(dessin.barrettes)]);
  fils.forEach(w => { s += filSvg(w, verticaux, couleurDe && couleurDe(w)); });
  const shunts = new Map();
  dessin.fils.forEach(w => { if (!w.shunt) return; const ys = [w.epA.y, w.epB.y].sort((u, v) => u - v); (shunts.get(w.de) || shunts.set(w.de, []).get(w.de)).push(ys); });
  // un pont appartient au morceau (barrette en paquets, masses répétées) dont les bornes sont à ses hauteurs, pas à tout ce qui porte le nom
  const dedans = (c, ys) => ys.every(y => y >= c.y - 0.5 && y <= c.y + c.h + 0.5);
  dessin.comps.forEach(c => { c.shunts = (shunts.get(c.name) || []).filter(ys => dedans(c, ys)); c.connecteurs = c.kind === 'equip' ? connecteurParBorne(c.name, dessin.fils) : null; });
  // les textes cherchent leur place dans ce qui est tracé : les repères d'abord, les numéros de fil ensuite
  const occ = occupationDe(fils, dessin.barrettes, dessin.comps);
  poserReperes(dessin.comps, occ);
  s += reperesDeFil(dessin.fils, verticaux, dessin.barrettes, occ);
  const couleurBout = couleursDesBouts(fils, couleurDe);
  s += piquagesSvg(dessin.barrettes, dessin.piquages, verticaux, couleurBout);
  dessin.points.forEach(d => s += `<circle class="jn" cx="${f1(d.x)}" cy="${f1(d.y)}" r="1.9"/>`);
  dessin.comps.forEach(c => { s += blocSvg(c, designationDe ? designationDe(c.name) : '', choisi === c.name, couleurBout); });
  return s;
}
/* Le même dessin, en document SVG autonome : pour enregistrer, imprimer,
   coller. `fond` : ce qui entoure la feuille — papier crème à l'écran, blanc
   pour l'imprimante. */
function svgAutonome(dessin, cartouche, folio, designationDe, fond) {
  // le document a les dimensions de la feuille de référence, quel que soit le folio : tous s'enregistrent pareil
  const bb = dessin.bbox, k = bb.k || bb.w / PAGE_W, M = 24 * k, vw = bb.w + 2 * M, vh = bb.h + 2 * M, W = Math.ceil(vw / k), H = Math.ceil(vh / k);
  const x0 = f1(bb.x - M), y0 = f1(bb.y - M);
  const txt = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${x0} ${y0} ${f1(vw)} ${f1(vh)}">`
    + `<rect x="${x0}" y="${y0}" width="${f1(vw)}" height="${f1(vh)}" fill="${fond || '#fbfbf7'}"/>` + styleDessin() + sceneSvg(dessin, cartouche, folio, designationDe, null) + '</svg>';
  return { w: W, h: H, txt };
}
