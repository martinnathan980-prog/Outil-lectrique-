/* ===========================================================================
   LES DOCUMENTS INVENTÉS — ce que tous les fabricants partagent
   ---------------------------------------------------------------------------
   Le hasard qui se rejoue (une graine), l'ordre naturel des noms, la TOILE
   (un dessin SVG en millimètres, ses traits et ses textes), la FEUILLE (le
   cadre, ses repères de zone, le cartouche — trois « logiciels » qui ne
   l'écrivent pas pareil), la zone d'un point, et la VÉRITÉ au format du
   retest (les seize colonnes de src/02-lecture.js, plus « Dessin » : comment
   la liaison est dessinée, pour que la mesure range ce qu'elle manque).
   Tout est inventé : aucun nom de client, de programme, d'appareil, de
   personne ; les repères suivent la convention de VOLTA (<numéro><CODE><suffixe>).
   =========================================================================== */
'use strict';

// le hasard qui se rejoue : une graine, toujours la même suite
function hasard(graine) { let a = graine >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const choisir = (rnd, a) => a[Math.floor(rnd() * a.length)];
const entier = (rnd, a, b) => a + Math.floor(rnd() * (b - a + 1));
function melanger(rnd, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const COLL = new Intl.Collator('fr', { numeric: true });
const triNaturel = (a, b) => COLL.compare(String(a), String(b));

const f2 = x => (Math.round(x * 100) / 100).toString();
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---- la toile : un dessin SVG en millimètres --------------------------------------------------------------------
   `police` : la famille de caractères du logiciel ; `trait` : l'épaisseur de ses fils. Chaque primitive s'écrit tout de
   suite en SVG ; la page entière se rend par `svg()`. */
function toile(o = {}) { const out = [], W = o.largeur || 420, H = o.hauteur || 297, police = o.police || 'Liberation Sans', fil = o.trait || 0.3;
  const T = { out, W, H, police,
    ligne(x1, y1, x2, y2, ep = fil, extra = '') { out.push(`<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" stroke="#111" stroke-width="${ep}" stroke-linecap="round"${extra}/>`); },
    poly(pts, ep = fil, extra = '') { out.push(`<polyline points="${pts.map(p => f2(p[0]) + ',' + f2(p[1])).join(' ')}" fill="none" stroke="#111" stroke-width="${ep}" stroke-linejoin="round" stroke-linecap="round"${extra}/>`); },
    chemin(d, ep = fil, plein = 'none', extra = '') { out.push(`<path d="${d}" fill="${plein}" stroke="#111" stroke-width="${ep}" stroke-linejoin="round"${extra}/>`); },
    rect(x, y, w, h, ep = 0.35, extra = '') { out.push(`<rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}" fill="none" stroke="#111" stroke-width="${ep}"${extra}/>`); },
    rectPlein(x, y, w, h, couleur) { out.push(`<rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}" fill="${couleur}" stroke="none"/>`); },
    // un cadre en quatre traits séparés (certains logiciels l'écrivent ainsi)
    rectQuatre(x, y, w, h, ep = 0.35) { T.ligne(x, y, x + w, y, ep); T.ligne(x + w, y, x + w, y + h, ep); T.ligne(x + w, y + h, x, y + h, ep); T.ligne(x, y + h, x, y, ep); },
    cercle(cx, cy, r, ep = 0.3, plein = 'none') { out.push(`<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r)}" fill="${plein}" stroke="${plein === 'none' ? '#111' : 'none'}" stroke-width="${ep}"/>`); },
    ellipse(cx, cy, rx, ry, ep = 0.25, extra = '') { out.push(`<ellipse cx="${f2(cx)}" cy="${f2(cy)}" rx="${f2(rx)}" ry="${f2(ry)}" fill="none" stroke="#111" stroke-width="${ep}"${extra}/>`); },
    point(x, y, r = 0.6) { out.push(`<circle cx="${f2(x)}" cy="${f2(y)}" r="${r}" fill="#111"/>`); },
    polygone(pts, ep = 0.3, plein = 'none') { out.push(`<polygon points="${pts.map(p => f2(p[0]) + ',' + f2(p[1])).join(' ')}" fill="${plein}" stroke="#111" stroke-width="${ep}" stroke-linejoin="round"/>`); },
    texte(x, y, s, t = {}) { if (s == null || s === '') return; const rot = t.angle ? ` transform="rotate(${t.angle} ${f2(x)} ${f2(y)})"` : '';
      const esp = t.espace ? ` letter-spacing="${t.espace}"` : '';
      out.push(`<text x="${f2(x)}" y="${f2(y)}" font-family="${t.police || police}" font-size="${t.taille || 2.2}" font-weight="${t.gras ? 700 : 400}"${t.italique ? ' font-style="italic"' : ''} text-anchor="${t.ancre || 'start'}"${esp}${rot} fill="${t.couleur || '#111'}">${esc(s)}</text>`); },
    brut(s) { out.push(s); },
    svg() { return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#fff"/>${out.join('')}</svg>`; } };
  return T; }

/* ---- la feuille : le cadre, les repères de zone, le cartouche --------------------------------------------------
   Une feuille A3 paysage. Les zones : huit colonnes chiffrées en haut, six rangées lettrées à gauche (ce que VOLTA lit
   pour situer un renvoi, 09-pdf `zoneDe`). Trois cartouches, trois logiciels, tous EN FRANÇAIS (le lecteur, 8 novembre
   2026 : « des cartouches en français ») :
     'fr'    en bas à droite (TITRE, N° DE PLAN, FOLIO « 3 / 8 », INDICE, FAISCEAU, DESSINÉ, DATE, ÉCHELLE) ;
     'fr2'   en bas à droite, d'autres mots et un autre ordre (PLAN N°, IND., F° « 12/92 » ; DÉSIGNATION ; FAISCEAU,
             DESSINÉ, LE) ;
     'bande' une bande pleine largeur en bas, le folio écrit « 12/90 ».
   (Le cartouche anglais — DWG NO., SHEET, REV — était celui des documents d'avant : tests/documents/v0/.) */
const CADRE = { x0: 15, y0: 12, x1: 410, y1: 287 }, NC = 8, NL = 6;
function zoneDe(x, y) { const c = Math.max(0, Math.min(NC - 1, Math.floor((x - CADRE.x0) / ((CADRE.x1 - CADRE.x0) / NC)))), l = Math.max(0, Math.min(NL - 1, Math.floor((y - CADRE.y0) / ((CADRE.y1 - CADRE.y0) / NL))));
  return 'ABCDEF'[l] + (c + 1); }
function feuille(T, cart, sorte = 'fr') { const { x0, y0, x1, y1 } = CADRE; T.rect(x0, y0, x1 - x0, y1 - y0, 0.5);
  for (let i = 0; i < NC; i++) { const x = x0 + (i + 0.5) * (x1 - x0) / NC; T.texte(x, y0 - 3.2, String(i + 1), { ancre: 'middle', taille: 2.6 }); if (i) T.ligne(x0 + i * (x1 - x0) / NC, y0, x0 + i * (x1 - x0) / NC, y0 - 2.2, 0.2); }
  for (let j = 0; j < NL; j++) { const y = y0 + (j + 0.5) * (y1 - y0) / NL; T.texte(x0 - 4.6, y + 1, 'ABCDEF'[j], { ancre: 'middle', taille: 2.6 }); if (j) T.ligne(x0, y0 + j * (y1 - y0) / NL, x0 - 2.2, y0 + j * (y1 - y0) / NL, 0.2); }
  const champs = [];   // ce que la vérité attend du cartouche
  const cellule = (x, y, w, h, et, val, grand) => { T.rect(x, y, w, h, 0.3); T.texte(x + 1.6, y + 3.4, et, { taille: 1.9 }); T.texte(x + 1.6, y + h - 3, val, { taille: grand ? 4 : 3.2, gras: true }); champs.push([et, val]); };
  if (sorte === 'bande') { const h = 16, y = y1 - h, w = x1 - x0;
    cellule(x0, y, w * 0.34, h, 'TITRE', cart.titre); cellule(x0 + w * 0.34, y, w * 0.18, h, 'N° DE PLAN', cart.numero); cellule(x0 + w * 0.52, y, w * 0.09, h, 'FOLIO', cart.folio + '/' + cart.folios, true);
    cellule(x0 + w * 0.61, y, w * 0.07, h, 'INDICE', cart.indice); cellule(x0 + w * 0.68, y, w * 0.14, h, 'FAISCEAU', cart.faisceau); cellule(x0 + w * 0.82, y, w * 0.18, h, 'DATE', cart.date);
    return { zoneLibre: { x0: x0 + 4, y0: y0 + 4, x1: x1 - 4, y1: y - 4 }, cartouche: { x0, y0: y, x1, y1 }, champs }; }
  const cw = 175, ch = 34, cx = x1 - cw, cy = y1 - ch, r1 = 12, r2 = 12, r3 = ch - r1 - r2;
  if (sorte === 'fr2') {
    cellule(cx, cy, 80, r1, 'PLAN N°', cart.numero); cellule(cx + 80, cy, 25, r1, 'IND.', cart.indice); cellule(cx + 105, cy, 70, r1, 'F°', cart.folio + '/' + cart.folios, true);
    cellule(cx, cy + r1, cw, r2, 'DÉSIGNATION', cart.titre);
    cellule(cx, cy + r1 + r2, 60, r3, 'FAISCEAU', cart.faisceau); cellule(cx + 60, cy + r1 + r2, 60, r3, 'DESSINÉ', cart.auteur); cellule(cx + 120, cy + r1 + r2, 55, r3, 'LE', cart.date);
  } else {
    cellule(cx, cy, cw, r1, 'TITRE', cart.titre); cellule(cx, cy + r1, 75, r2, 'N° DE PLAN', cart.numero); cellule(cx + 75, cy + r1, 40, r2, 'FOLIO', cart.folio + ' / ' + cart.folios, true);
    cellule(cx + 115, cy + r1, 20, r2, 'INDICE', cart.indice); cellule(cx + 135, cy + r1, 40, r2, 'FAISCEAU', cart.faisceau);
    cellule(cx, cy + r1 + r2, 60, r3, 'DESSINÉ', cart.auteur); cellule(cx + 60, cy + r1 + r2, 55, r3, 'DATE', cart.date); cellule(cx + 115, cy + r1 + r2, 60, r3, 'ÉCHELLE', 'SANS');
  }
  return { zoneLibre: { x0: x0 + 4, y0: y0 + 4, x1: x1 - 4, y1: y1 - 4 }, cartouche: { x0: cx, y0: cy, x1: x1, y1: y1 }, champs }; }

/* ---- la vérité au format du retest ---------------------------------------------------------------------------------
   Une liaison : { de, borneDe, pnDe, descDe, vers, borneVers, pnVers, descVers, type, fwd, harness, dessin }. Un bout de
   barrette s'écrit comme dans les fichiers du lecteur : « 667VT2 51 » et « B » (VOLTA lit 667VT2:51B). */
const EN_TETES = ['Harness', 'Device1', 'Pin1', 'PN1', 'Description1', 'Cable TG', 'Cable Tag', 'Route', 'Device2', 'Pin2', 'PN2', 'Description2', 'FWD', 'Cable length (mm)', 'Appareil', 'Date retest', 'Dessin'];
const champCsv = v => { const s = String(v == null ? '' : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
function csvDeVerite(L) {
  const lignes = [EN_TETES, ...L.map(l => [l.harness || '', l.de, l.borneDe, l.pnDe || '', l.descDe || '', l.type || '', '', '', l.vers, l.borneVers, l.pnVers || '', l.descVers || '', l.fwd || '', '', '', '', (l.dessin || []).join(' ; ')])];
  return '﻿' + lignes.map(r => r.map(champCsv).join(';')).join('\r\n') + '\r\n'; }

/* ---- la vérité d'un réseau dessiné : l'arbre couvrant le plus court entre ses bouts, le long des traits ----------
   (le principe que VOLTA suit, 09-pdf `arbre` : calculé ici sur la géométrie exacte). Sert à VÉRIFIER qu'un dessin dit bien
   ce que la vérité écrit (deux fils sur une borne, un peigne de barrette) : `segs` [[a, b]], `bouts` [{ p, cle }] →
   les paires [cleA, cleB]. */
function arbreDuReseau(segs, bouts) { const cle = p => f2(p[0]) + ',' + f2(p[1]), adj = new Map(), ajout = (a, b, L) => { (adj.get(a) || adj.set(a, []).get(a)).push([b, L]); };
  const pts = [...new Set(segs.flatMap(([a, b]) => [cle(a), cle(b)]).concat(bouts.map(b => cle(b.p))))].map(k => k.split(',').map(Number));
  segs.forEach(([a, b]) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-9) return;
    const sur = pts.filter(p => { const t = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / (L * L), q = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]; return t >= -1e-3 && t <= 1 + 1e-3 && Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.02; })
      .sort((p, q) => Math.hypot(p[0] - a[0], p[1] - a[1]) - Math.hypot(q[0] - a[0], q[1] - a[1]));
    for (let i = 1; i < sur.length; i++) { const d = Math.hypot(sur[i][0] - sur[i - 1][0], sur[i][1] - sur[i - 1][1]); ajout(cle(sur[i - 1]), cle(sur[i]), d); ajout(cle(sur[i]), cle(sur[i - 1]), d); } });
  const D = bouts.map(b => { const d = new Map([[cle(b.p), 0]]), file = [cle(b.p)];
    while (file.length) { file.sort((x, y) => d.get(x) - d.get(y)); const n = file.shift(); (adj.get(n) || []).forEach(([m, L]) => { if (d.get(n) + L < (d.has(m) ? d.get(m) : Infinity) - 1e-9) { d.set(m, d.get(n) + L); file.push(m); } }); }
    return d; });
  const paires = []; for (let i = 0; i < bouts.length; i++) for (let j = i + 1; j < bouts.length; j++) { const d = D[i].get(cle(bouts[j].p)); if (d == null) return null; paires.push([i, j, d]); }
  paires.sort((a, b) => a[2] - b[2] || a[0] - b[0] || a[1] - b[1]); const g = bouts.map((_, i) => i), r = i => g[i] === i ? i : (g[i] = r(g[i])), out = [];
  paires.forEach(([i, j]) => { if (r(i) === r(j)) return; g[r(i)] = r(j); out.push([bouts[i].cle, bouts[j].cle]); });
  return out; }

module.exports = { hasard, choisir, entier, melanger, triNaturel, f2, esc, toile, feuille, zoneDe, CADRE, csvDeVerite, EN_TETES, arbreDuReseau };
