/* ===========================================================================
   08 — LE DXF : chaque folio en dessin DXF, le repli du paquet SEE
   ---------------------------------------------------------------------------
   Si le pilote (see/vba) ne peut pas commander SEE Electrical Expert au
   bureau, SEE sait importer un DOSSIER de DXF d'un coup : un folio par
   fichier, le folio nommé d'après le fichier (« 01.Power.DWG »), les blocs
   convertis en symboles électriques par leur nom (attribut « DXF/DWG Block
   Name » des symboles, jokers * acceptés), les attributs repris, les lignes
   importées comme connexions (depuis le correctif V4R3 SP3). Le réglage
   exact se fera là-bas : le DXF doit être PROPRE, SIMPLE, et ses noms de
   calques et de blocs STABLES. Ils sont décrits dans see/FORMAT-DXF.md, qui
   fait foi comme FORMAT-PAQUET.md pour le paquet.

   Le DXF se lit dans le MODÈLE du paquet (`modeleSEE`, 08-see) : ce qui
   s'exporte, c'est le dessin de l'Atelier, en millimètres sur la feuille A3,
   rien de recalculé. Il est écrit à la main, sans dépendance :
   · DXF ASCII R12 (AC1009), le plus ancien et le plus lu ; fins de ligne
     CRLF ; textes en Windows-1252 ($DWGCODEPAGE = ANSI_1252, le code page
     d'un Windows français) ; pas de handles (R12 n'en exige pas) ;
   · en mm, Y VERS LE HAUT : y_dxf = 297 − y_mm (le paquet a y vers le bas) ;
   · dix calques (DXF_CALQUES) ; les fils en LINE, un segment droit par
     LINE, à la couleur ACI la plus proche de leur route (sans route :
     BYLAYER) ; les corps en polylignes fermées ; chaque borne en INSERT d'un
     bloc nommé (DXF_BLOCS) qui porte quatre ATTRIB : REPERE, CONNECTEUR,
     BORNE, NUMERO ; les textes en TEXT (un numéro de fil juste AU-DESSUS de
     son fil : R12 n'a pas de masque pour le fond blanc de l'Atelier) ; le
     cadre et un cartouche simple.

   LE POINT D'INSERTION D'UNE BORNE EST LE BOUT DU FIL. Dans l'Atelier, le
   bout de fil qui entre dans un bloc (le raccord jusqu'à la pièce de
   connecteur, l'amorce d'une masse, d'un rond de barrette, d'une prise) EST
   du fil, à la couleur de sa route. Le fil du DXF est donc le tracé du
   paquet (`Points`) prolongé de cette amorce jusqu'au CONTACT du paquet
   (`CX`, `CY` : le bord extérieur de la pièce de connecteur, ou du corps
   sans connecteur, le bord de la fiche ou de l'embase, le bord de la
   pastille du côté du fil, le premier trait de la masse — calculé une fois,
   dans `modeleSEE` ; une pastille du DXF a un rayon fixe : elle s'insère au
   bord de son cercle, à 0,6 unité au plus). Le bloc de la borne est posé là,
   si bien qu'un
   symbole SEE dont le point de connexion est à son origine se branche sur
   le fil. Un bloc ne dessine que la borne elle-même (une pastille, les trois
   traits d'une masse) : rien qui dépende de la longueur d'une amorce.

   L'ÉCHELLE. Un folio chargé est dessiné plus petit (k grand). Les blocs
   sont définis une fois pour toutes à k = 1 (une unité de l'Atelier =
   0,25 mm), identiques dans tous les fichiers, et chaque INSERT porte
   l'échelle du folio (41 = 42 = 43 = 1/k) : SEE peut fusionner des blocs de
   même nom d'un fichier à l'autre sans les fausser. Ce que SEE fait de
   l'échelle d'un INSERT n'est pas établi : le réglage `blocs: 'folio'` les
   dessine à l'échelle de chaque folio, posés à l'échelle 1.

   Puis le ZIP : un DXF par folio, « NN.<nom du folio>.dxf », en un seul
   téléchargement — un zip « stocké » (sans compression), écrit à la main
   lui aussi, CRC-32 compris.
   =========================================================================== */
'use strict';

/* Les calques : [nom, couleur ACI, ce qu'il porte]. L'ordre est celui de la table LAYER. */
const DXF_CALQUES = [
  ['CADRE', 8, 'le cadre, ses zones, le cartouche et la légende des routes'],
  ['EQUIPEMENTS', 7, 'les corps des équipements, renvois et rails'],
  ['CONNECTEURS', 7, 'les pièces de connecteur et leurs lettres'],
  ['BORNES', 7, 'les bornes des équipements (SEE_BORNE_G / _D) et leurs pontages'],
  ['FILS', 7, 'les fils (LINE) et les points de jonction (SEE_JONCTION)'],
  ['REPERES', 7, 'les repères des blocs'],
  ['NUMEROS', 7, 'les numéros de fil'],
  ['MASSES', 7, 'les masses (SEE_MASSE_G / _D) et les collecteurs de masse'],
  ['BARRETTES', 7, 'les barrettes : ligne pointillée, point de départ, pastilles (SEE_PASTILLE…)'],
  ['PRISES', 7, 'les prises de coupure : fiche, embase, contacts (SEE_CONTACT_FICHE / _EMBASE)']
];
const DXF_LTYPE_POINTILLE = 'POINTILLE';
const R_PASTILLE_DXF = 4;   // le rayon d'une pastille dans le DXF, en unités de l'Atelier (06 : 3,4 à 4,6 selon le numéro)
/* Les blocs, en unités de l'Atelier (× 0,25 mm à k = 1). « G » : le fil arrive par la GAUCHE du point d'insertion (le
   bloc s'étend vers la droite) ; « D » : par la droite. `numero` : où l'attribut NUMERO s'écrit par défaut [x, y, corps
   de texte], `null` s'il reste caché ; `dessin` : ce que le bloc trace. */
const DXF_BLOCS = {
  SEE_BORNE_G: { aide: 'borne d’équipement, flanc gauche : le bord extérieur de sa pièce de connecteur (ou du corps)', numero: [CONN_W / 2, 0, 5.6], dessin: [['point', 0, 0]] },
  SEE_BORNE_D: { aide: 'borne d’équipement, flanc droit', numero: [-CONN_W / 2, 0, 5.6], dessin: [['point', 0, 0]] },
  SEE_CONTACT_FICHE: { aide: 'contact de prise, côté fiche (amont, le fil à gauche) : le bord gauche de la fiche', numero: [4.5, 0, 5.4], dessin: [['point', 0, 0]] },
  SEE_CONTACT_EMBASE: { aide: 'contact de prise, côté embase (aval, le fil à droite) : le bord droit de l’embase', numero: null, dessin: [['point', 0, 0]] },
  SEE_PASTILLE_G: { aide: 'pastille de barrette, le fil arrive par la gauche : le bord gauche de la pastille', numero: [R_PASTILLE_DXF, 0, 4], dessin: [['cercle', R_PASTILLE_DXF, 0, R_PASTILLE_DXF]] },
  SEE_PASTILLE_D: { aide: 'pastille de barrette, le fil arrive par la droite : le bord droit de la pastille', numero: [-R_PASTILLE_DXF, 0, 4], dessin: [['cercle', -R_PASTILLE_DXF, 0, R_PASTILLE_DXF]] },
  SEE_PASTILLE: { aide: 'pastille de barrette, le fil arrive d’en haut ou d’en bas : son centre', numero: [0, 0, 4], dessin: [['cercle', 0, 0, R_PASTILLE_DXF]] },
  SEE_MASSE_G: { aide: 'masse, le fil arrive par la gauche : le premier trait du symbole (CEI 60617)', numero: null, dessin: [['ligne', 0, -6, 0, 6], ['ligne', 3.2, -4, 3.2, 4], ['ligne', 6.4, -2, 6.4, 2]] },
  SEE_MASSE_D: { aide: 'masse, le fil arrive par la droite', numero: null, dessin: [['ligne', 0, -6, 0, 6], ['ligne', -3.2, -4, -3.2, 4], ['ligne', -6.4, -2, -6.4, 2]] },
  SEE_JONCTION: { aide: 'point de jonction, là où un fil se partage (sans attribut)', sans: true, dessin: [['disque', 0, 0, 1.9]] }
};
const DXF_ATTRIBUTS = ['REPERE', 'CONNECTEUR', 'BORNE', 'NUMERO'];
const DXF_HAUTEUR = 0.7;    // la hauteur d'une capitale, en part du corps de texte (celui du SVG, en unités)

/* ---- la palette ACI (AutoCAD Color Index) -------------------------------
   1 à 9 fixes ; 10 à 249 : vingt-quatre teintes de 15° × cinq valeurs (255, 165, 127, 76, 38), pleines puis à demi
   saturées (à une unité près de la table d'AutoCAD) ; 250 à 255 : les gris. Une couleur de route prend l'index le plus
   proche (distance « redmean »), hors 7 (noir ou blanc selon le fond) et des gris : une route est une couleur. Deux
   routes d'un folio ne prennent jamais le même index : la seconde prend le plus proche qui reste (`aciDesRoutes`). */
const PALETTE_ACI = (() => { const p = [[0, 0, 0], [255, 0, 0], [255, 255, 0], [0, 255, 0], [0, 255, 255], [0, 0, 255], [255, 0, 255], [255, 255, 255], [128, 128, 128], [192, 192, 192]];
  const V = [255, 255, 165, 165, 127, 127, 76, 76, 38, 38];
  for (let i = 10; i < 250; i++) { const h = Math.floor((i - 10) / 10) * 15, v = V[(i - 10) % 10], s = (i - 10) % 2 ? 0.5 : 1;
    const c = x => { const k = (x + h / 60) % 6, f = Math.max(0, Math.min(k, 4 - k, 1)); return Math.floor(v * (1 - s * f)); };
    p.push([c(5), c(3), c(1)]); }
  [51, 91, 132, 173, 214, 255].forEach(g => p.push([g, g, g]));
  return p; })();
function aciDe(hex, exclus) { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || '')); if (!m) return null;
  const [r, g, b] = [m[1], m[2], m[3]].map(x => parseInt(x, 16)); let best = null, dmin = Infinity;
  PALETTE_ACI.forEach(([R, G, B], i) => { if (i < 1 || i === 7 || i === 8 || i === 9 || i >= 250 || (exclus && exclus.has(i))) return; const rm = (r + R) / 2;
    const d = (2 + rm / 256) * (r - R) ** 2 + 4 * (g - G) ** 2 + (2 + (255 - rm) / 256) * (b - B) ** 2; if (d < dmin) { dmin = d; best = i; } });
  return best; }
// les routes d'un folio, dans l'ordre de sa légende → leur index ACI, tous différents
function aciDesRoutes(m) { const out = new Map(), pris = new Set();
  (m.legende || []).forEach(r => { if (!r.Route || out.has(r.Route)) return; const i = aciDe(r.Couleur, pris); if (i != null) { out.set(r.Route, i); pris.add(i); } });
  return out; }

/* ---- l'écriture : des paires code / valeur ------------------------------
   Le code sur trois caractères calé à droite, la valeur sur la ligne suivante, comme AutoCAD les écrit. Un nombre au
   dix-millième au plus, jamais en notation exponentielle ; un texte en une ligne, sans caractère de contrôle, réduit
   à Windows-1252 : quelques signes de l'Atelier s'écrivent en ASCII (▷F3 d'un renvoi → >F3, Ω → Ohm), une lettre
   accentuée hors de la page perd son accent, le reste devient « ? ». */
const CP1252_HAUT = '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ';
// les codes de groupe dont la valeur est un entier (couleur 62, drapeaux 66 et 70, justifications 72 à 74…) ; les autres nombres sont réels
const codeEntier = c => (c >= 60 && c <= 99) || (c >= 170 && c <= 179) || (c >= 270 && c <= 289) || (c >= 370 && c <= 389) || (c >= 400 && c <= 409) || (c >= 1060 && c <= 1071);
const dxfNb = v => { const r = Math.round((+v || 0) * 10000) / 10000; if (r === 0) return '0.0'; const s = Number.isInteger(r) ? r.toFixed(1) : r.toFixed(4).replace(/0+$/, ''); return s; };
const dansCp1252 = ch => { const c = ch.charCodeAt(0); return (c >= 0x20 && c < 0x7f) || (c >= 0xa0 && c <= 0xff) || (CP1252_HAUT.includes(ch) && !/[\u0080-\u009f]/.test(ch)); };
const HORS_CP1252 = { '▷': '>', '▶': '>', '►': '>', '◁': '<', '◀': '<', '→': '->', '←': '<-', '⇄': '<->', 'Ω': 'Ohm', '≤': '<=', '≥': '>=', '≈': '~', '√': 'V', '∞': 'inf', 'Δ': 'D', '✓': 'v' };
function dxfChaine(s) {
  let t = String(s == null ? '' : s).replace(/[\x00-\x1f\x7f-\x9f]+/g, ' ').replace(/[▷▶►◁◀→←⇄Ω≤≥≈√∞Δ✓]/g, c => HORS_CP1252[c]);
  const sansAccent = ch => ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  t = [...t].map(ch => dansCp1252(ch) ? ch : [...sansAccent(ch)].every(dansCp1252) ? sansAccent(ch) : '?').join('');
  return t.replace(/%%/g, '%%%%%%').slice(0, 250);   // « %%% » écrit un « % » : « %% » ne doit pas devenir un code de contrôle (%%d, %%c…)
}
function octetsCp1252(texte) { const o = new Uint8Array(texte.length);
  for (let i = 0; i < texte.length; i++) { const c = texte.charCodeAt(i); if (c < 0x80 || (c >= 0xa0 && c <= 0xff)) o[i] = c; else { const j = CP1252_HAUT.indexOf(texte[i]); o[i] = j >= 0 ? 0x80 + j : 0x3f; } }
  return o; }
function ecrivainDxf() { const L = [];
  const g = (code, v) => { L.push(code < 10 ? '  ' + code : code < 100 ? ' ' + code : String(code), typeof v !== 'number' ? String(v) : codeEntier(code) ? String(Math.round(v)) : dxfNb(v)); };
  const pt = (x, y, n) => { g(10 + (n || 0), x); g(20 + (n || 0), y); g(30 + (n || 0), 0); };
  const tete = (type, calque, couleur, ltype) => { g(0, type); g(8, calque); if (ltype) g(6, ltype); if (couleur != null && couleur !== 256) g(62, couleur); };
  const W = {
    g, fin: () => L.join('\r\n') + '\r\n',
    ligne: (calque, x1, y1, x2, y2, couleur, ltype) => { tete('LINE', calque, couleur, ltype); pt(x1, y1); pt(x2, y2, 1); },
    point: (calque, x, y) => { tete('POINT', calque); pt(x, y); },
    cercle: (calque, x, y, r) => { tete('CIRCLE', calque); pt(x, y); g(40, r); },
    // une polyligne : [{ x, y, b }] (b : le renflement vers le sommet suivant, 1 pour un demi-cercle), fermée ou non, d'une largeur
    polyligne: (calque, pts, fermee, largeur, couleur) => { tete('POLYLINE', calque, couleur); g(66, 1); pt(0, 0); g(70, fermee ? 1 : 0); if (largeur) { g(40, largeur); g(41, largeur); }
      pts.forEach(p => { g(0, 'VERTEX'); g(8, calque); pt(p.x, p.y); if (p.b) g(42, p.b); }); g(0, 'SEQEND'); g(8, calque); },
    // un disque plein : deux demi-cercles d'une largeur égale au rayon (le DONUT de R12)
    disque: (calque, x, y, r) => W.polyligne(calque, [{ x: x - r / 2, y, b: 1 }, { x: x + r / 2, y, b: 1 }], true, r),
    rectangle: (calque, x0, y0, x1, y1) => W.polyligne(calque, [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }], true),
    /* un texte : `j` G (à gauche), C (centré), D (à droite) ; `v` 'base' (sur la ligne de base) ou 'milieu' ; `angle` en degrés.
       `attrib` : { tag, cache } en fait un ATTRIB (dans une insertion), `attdef` : { tag, cache } un ATTDEF (dans un bloc). */
    texte: (calque, valeur, x, y, h, o) => { o = o || {}; const j = { G: 0, C: 1, D: 2 }[o.j || 'G'], v = o.v === 'milieu' ? 2 : 0, A = o.attrib || o.attdef;
      g(0, o.attrib ? 'ATTRIB' : o.attdef ? 'ATTDEF' : 'TEXT'); g(8, calque); pt(x, y); g(40, h); g(1, dxfChaine(valeur));
      if (o.attdef) g(3, A.tag); if (A) { g(2, A.tag); g(70, A.cache ? 1 : 0); }
      if (o.angle) g(50, o.angle); g(7, 'STANDARD');
      if (j || v) { g(72, j); pt(x, y, 1); g(A ? 74 : 73, v); } },
    // une insertion de bloc, à l'échelle s, et ses attributs : [{ tag, valeur, x, y, h, j, v, cache }]
    insertion: (calque, bloc, x, y, s, attributs) => { g(0, 'INSERT'); g(8, calque); if (attributs && attributs.length) g(66, 1); g(2, bloc); pt(x, y);
      if (s !== 1) { g(41, s); g(42, s); g(43, s); }
      if (attributs && attributs.length) { attributs.forEach(a => W.texte(calque, a.valeur, a.x, a.y, a.h, { j: a.j, v: a.v, attrib: { tag: a.tag, cache: a.cache } })); g(0, 'SEQEND'); g(8, calque); } }
  };
  return W; }

/* ---- l'en-tête, les tables, les blocs ------------------------------------ */
function enteteDxf(W, ltscale, commentaire) { const g = W.g;
  if (commentaire) g(999, dxfChaine(commentaire));
  g(0, 'SECTION'); g(2, 'HEADER');
  const v = (nom, f) => { g(9, nom); f(); };
  v('$ACADVER', () => g(1, 'AC1009')); v('$DWGCODEPAGE', () => g(3, 'ANSI_1252'));
  v('$INSBASE', () => { g(10, 0); g(20, 0); g(30, 0); });
  v('$EXTMIN', () => { g(10, 0); g(20, 0); g(30, 0); }); v('$EXTMAX', () => { g(10, 420); g(20, 297); g(30, 0); });
  v('$LIMMIN', () => { g(10, 0); g(20, 0); }); v('$LIMMAX', () => { g(10, 420); g(20, 297); });
  v('$LTSCALE', () => g(40, ltscale)); v('$ATTMODE', () => g(70, 1)); v('$TEXTSIZE', () => g(40, 2.5));
  v('$TEXTSTYLE', () => g(7, 'STANDARD')); v('$CLAYER', () => g(8, '0')); v('$CELTYPE', () => g(6, 'BYLAYER')); v('$CECOLOR', () => g(62, 256));
  v('$LUNITS', () => g(70, 2)); v('$LUPREC', () => g(70, 2)); v('$PDMODE', () => g(70, 0)); v('$PDSIZE', () => g(40, 0));
  g(0, 'ENDSEC');
  g(0, 'SECTION'); g(2, 'TABLES');
  const table = (nom, n, f) => { g(0, 'TABLE'); g(2, nom); g(70, n); f(); g(0, 'ENDTAB'); };
  // la vue d'ouverture : toute la feuille
  table('VPORT', 1, () => { g(0, 'VPORT'); g(2, '*ACTIVE'); g(70, 0); g(10, 0); g(20, 0); g(11, 1); g(21, 1); g(12, 210); g(22, 148.5); g(13, 0); g(23, 0);
    g(14, 1); g(24, 1); g(15, 10); g(25, 10); g(16, 0); g(26, 0); g(36, 1); g(17, 0); g(27, 0); g(37, 0); g(40, 310); g(41, 1.414); g(42, 50); g(43, 0); g(44, 0);
    g(50, 0); g(51, 0); g(71, 0); g(72, 100); g(73, 1); g(74, 3); g(75, 0); g(76, 0); g(77, 0); g(78, 0); });
  // le trait plein, et le pointillé d'une barrette (06 : 3 pleins, 2,2 vides, en unités de l'Atelier ; à k = 1, × 0,25 mm)
  table('LTYPE', 2, () => {
    g(0, 'LTYPE'); g(2, 'CONTINUOUS'); g(70, 0); g(3, 'Solid line'); g(72, 65); g(73, 0); g(40, 0);
    g(0, 'LTYPE'); g(2, DXF_LTYPE_POINTILLE); g(70, 0); g(3, 'Barrette __ __ __'); g(72, 65); g(73, 2); g(40, 1.3); g(49, 0.75); g(49, -0.55); });
  table('LAYER', DXF_CALQUES.length + 1, () => [['0', 7], ...DXF_CALQUES].forEach(([nom, c]) => { g(0, 'LAYER'); g(2, nom); g(70, 0); g(62, c); g(6, 'CONTINUOUS'); }));
  table('STYLE', 1, () => { g(0, 'STYLE'); g(2, 'STANDARD'); g(70, 0); g(40, 0); g(41, 1); g(50, 0); g(71, 0); g(42, 2.5); g(3, 'txt'); g(4, ''); });
  table('VIEW', 0, () => { }); table('UCS', 0, () => { });
  table('APPID', 1, () => { g(0, 'APPID'); g(2, 'ACAD'); g(70, 0); });
  table('DIMSTYLE', 0, () => { });
  g(0, 'ENDSEC'); }
/* Les blocs, `u` millimètres par unité de l'Atelier : 0,25 (k = 1, le défaut) ou celle du folio (`blocs: 'folio'`). Les
   traits sont sur le calque 0, en BYLAYER : ils prennent le calque de l'insertion. */
function blocsDxf(W, u) { const g = W.g;
  g(0, 'SECTION'); g(2, 'BLOCKS');
  Object.entries(DXF_BLOCS).forEach(([nom, B]) => {
    g(0, 'BLOCK'); g(8, '0'); g(2, nom); g(70, B.sans ? 0 : 2); g(10, 0); g(20, 0); g(30, 0); g(3, nom);
    B.dessin.forEach(([t, ...a]) => { if (t === 'point') W.point('0', a[0] * u, a[1] * u); else if (t === 'ligne') W.ligne('0', a[0] * u, a[1] * u, a[2] * u, a[3] * u);
      else if (t === 'cercle') W.cercle('0', a[0] * u, a[1] * u, a[2] * u); else if (t === 'disque') W.disque('0', a[0] * u, a[1] * u, a[2] * u); });
    if (!B.sans) DXF_ATTRIBUTS.forEach(tag => { const n = tag === 'NUMERO' && B.numero;
      W.texte('0', '', n ? n[0] * u : 0, n ? n[1] * u : 0, (n ? n[2] : 4) * DXF_HAUTEUR * u, { j: n ? 'C' : 'G', v: n ? 'milieu' : 'base', attdef: { tag, cache: !n } }); });
    g(0, 'ENDBLK'); g(8, '0'); });
  g(0, 'ENDSEC'); }

/* ---- les bornes et les fils du DXF ----------------------------------------
   bornesDxf(modele) → pour chaque rangée de `Bornes`, dans son ordre : { r (la rangée), bloc (son nom DXF), calque, x, y
   (le CONTACT du paquet, `CX`, `CY` : en mm, y vers le bas), numero ({ x, y, fs, j, max } où s'écrit le numéro visible,
   ou null ; `max` : les caractères que l'Atelier y écrit au plus) }. Le contact n'est pas recalculé ici : c'est celui du
   paquet (08-see, `modeleSEE`), une seule vérité pour les deux fichiers — à un détail près, la pastille (plus bas).
   filsDxf(modele) → pour chaque fil tracé : { f (la rangée), points ([{ x, y }], mm, y vers le bas) } : le tracé du paquet
   prolongé de son amorce jusqu'au contact de chaque bout (raccourci quand le contact est sur le fil : la pastille d'une
   barrette à poser, où le fil arrive au centre), les points alignés fondus : un segment droit, une LINE. */
const EPS_DXF = 0.005;
const memePoint = (a, b) => Math.abs(a.x - b.x) < EPS_DXF && Math.abs(a.y - b.y) < EPS_DXF;
const surSegment = (c, a, b) => (Math.abs(a.y - b.y) < EPS_DXF && Math.abs(c.y - a.y) < EPS_DXF && c.x >= Math.min(a.x, b.x) - EPS_DXF && c.x <= Math.max(a.x, b.x) + EPS_DXF)
  || (Math.abs(a.x - b.x) < EPS_DXF && Math.abs(c.x - a.x) < EPS_DXF && c.y >= Math.min(a.y, b.y) - EPS_DXF && c.y <= Math.max(a.y, b.y) + EPS_DXF);
const cleBout = (bloc, x, y) => bloc + '|' + centieme(x) + '|' + centieme(y);
function bornesDxf(m) {
  const u = SEE_UNITE / (m.folio.Echelle || 1), R = R_PASTILLE_DXF * u;
  const blocs = new Map(m.blocs.map(b => [b.Bloc, b])), pieces = new Map();
  m.connecteurs.forEach(c => { (pieces.get(c.Bloc) || pieces.set(c.Bloc, []).get(c.Bloc)).push(c); });
  return m.bornes.map(r => { const N = (blocs.get(r.Bloc) || {}).Nature, x = r.CX != null ? r.CX : r.X, y = r.CY != null ? r.CY : r.Y;
    if (N === 'PRISE') { const fiche = r.Connecteur !== 'EMBASE';
      return { r, bloc: fiche ? 'SEE_CONTACT_FICHE' : 'SEE_CONTACT_EMBASE', calque: 'PRISES', x, y,
        numero: fiche ? { x: r.PX, y: r.PY, fs: String(r.Numero || '').length > 1 ? 4.4 : 5.4, j: 'C', max: 2 } : null }; }
    if (r.Cote === 'G' || r.Cote === 'D') {
      // une borne d'équipement : le numéro dans sa pièce de connecteur ; sans pièce, dans le corps, contre le bord
      const G = r.Cote === 'G', p = r.Connecteur ? (pieces.get(r.Bloc) || []).find(c => c.Lettre === r.Connecteur && c.Cote === r.Cote && r.PY >= c.Haut - 0.01 && r.PY <= c.Bas + 0.01) : null;
      return { r, bloc: G ? 'SEE_BORNE_G' : 'SEE_BORNE_D', calque: 'BORNES', x, y,
        numero: p ? { x: r.PX, y: r.PY, fs: 5.6, j: 'C', max: 4 } : { x: r.PX + (G ? 4 : -4) * u, y: r.PY, fs: 7.5, j: G ? 'G' : 'D', max: 5 } }; }
    if (N === 'MASSE') return { r, bloc: r.X <= r.PX ? 'SEE_MASSE_G' : 'SEE_MASSE_D', calque: 'MASSES', x, y, numero: null };
    if (N === 'BARRETTE' || N === 'BARRETTE_A_POSER') {
      /* la pastille s'ouvre du côté du fil, celui de son contact dans le paquet ; au centre (un fil qui n'arrive pas couché),
         elle est centrée. Le cercle du bloc a un rayon fixe (R_PASTILLE_DXF, 4 unités) et reste centré sur la pastille de
         l'Atelier (PX), sur la ligne de la barrette : la borne s'insère au bord de CE cercle, à 0,6 unité au plus du contact
         du paquet (06 : un rayon de 3,4 à 4,6 unités selon le numéro). */
      const cote = x < r.PX - EPS_DXF ? 'G' : x > r.PX + EPS_DXF ? 'D' : null;
      return { r, bloc: cote ? 'SEE_PASTILLE_' + cote : 'SEE_PASTILLE', calque: 'BARRETTES', x: centieme(cote === 'G' ? r.PX - R : cote === 'D' ? r.PX + R : r.PX), y,
        numero: { x: r.PX, y: r.PY, fs: String(r.Numero || '').length > 2 ? 3.2 : 4, j: 'C', max: 3 } }; }
    // un rail en pastille, un collecteur de masse : la borne est au bord du bloc, là où le fil s'accroche
    return { r, bloc: r.X <= r.PX ? 'SEE_BORNE_G' : 'SEE_BORNE_D', calque: N === 'COLLECTEUR' ? 'MASSES' : 'BORNES', x, y, numero: null }; }); }
/* Le tracé commence au contact c : déjà au bout, sur le premier segment (raccourci), ou plus loin dans l'axe (prolongé). */
function depuisContact(pts, c) { const p = pts[0];
  if (memePoint(c, p)) return pts;
  if (pts.length > 1 && surSegment(c, p, pts[1])) return [c, ...pts.slice(1)];
  if (Math.abs(c.y - p.y) < EPS_DXF || Math.abs(c.x - p.x) < EPS_DXF) return [c, ...pts];
  return [c, { x: p.x, y: c.y }, ...pts]; }   // jamais vu : le contact est toujours dans l'axe de l'accroche
function fondreAlignes(pts) { const q = [];
  pts.forEach(p => { if (q.length && memePoint(q[q.length - 1], p)) return;
    if (q.length >= 2) { const a = q[q.length - 2], b = q[q.length - 1];
      const aligne = (Math.abs(a.y - b.y) < EPS_DXF && Math.abs(b.y - p.y) < EPS_DXF && (b.x - a.x) * (p.x - b.x) > 0) || (Math.abs(a.x - b.x) < EPS_DXF && Math.abs(b.x - p.x) < EPS_DXF && (b.y - a.y) * (p.y - b.y) > 0);
      if (aligne) q.pop(); }
    q.push(p); });
  return q; }
function filsDxf(m, bornes) { bornes = bornes || bornesDxf(m);
  const contact = new Map(); bornes.forEach(d => contact.set(cleBout(d.r.Bloc, d.r.X, d.r.Y), d));
  return m.fils.filter(f => f.Points && f.Points.length >= 2).map(f => { let p = f.Points.map(([x, y]) => ({ x, y }));
    const a = contact.get(cleBout(f.DeBloc, p[0].x, p[0].y)), b = contact.get(cleBout(f.VersBloc, p[p.length - 1].x, p[p.length - 1].y));
    if (a) p = depuisContact(p, { x: a.x, y: a.y });
    if (b) p = depuisContact(p.slice().reverse(), { x: b.x, y: b.y }).reverse();
    return { f, points: fondreAlignes(p), de: a || null, vers: b || null }; }); }

/* ---- LE DXF D'UN FOLIO ------------------------------------------------------
   dxfDuFolio(modele, options) → le texte du DXF (une chaîne ; `octetsCp1252` en fait le fichier).
   options : total (folios du contrat, pour « 2 / 6 » au cartouche), rang (le rang du folio dans le contrat), echelle (le
   texte ÉCHELLE du cartouche), cadre (false : ni cadre ni cartouche, SEE a les siens), couleurs (false : les fils en
   BYLAYER), blocs ('echelle' le défaut ; 'folio' : voir l'en-tête), numeros ('dessus' le défaut ; 'dedans' : voir
   plus bas). */
function dxfDuFolio(m, options) {
  const o = Object.assign({ cadre: true, couleurs: true, blocs: 'echelle', numeros: 'dessus' }, options || {});
  const F = m.folio, k = F.Echelle || 1, u = SEE_UNITE / k, H = PAGE_H * SEE_UNITE;
  const s = o.blocs === 'folio' ? 1 : 1 / k, ub = o.blocs === 'folio' ? u : SEE_UNITE;
  const y = v => H - v, h = fs => DXF_HAUTEUR * fs * u;
  const W = ecrivainDxf(), aci = aciDesRoutes(m);
  const couleurDe = f => !o.couleurs ? null : f.Route && aci.has(f.Route) ? aci.get(f.Route) : f.Couleur ? aciDe(f.Couleur) : null;
  enteteDxf(W, 1 / k, 'Atelier Schema - folio ' + (F.Nom || F.Folio) + ' - ' + SEE_FORMAT + ' - mm, y vers le haut');
  blocsDxf(W, ub);
  W.g(0, 'SECTION'); W.g(2, 'ENTITIES');
  if (o.cadre) cadreDxf(W, m, o, aci);
  const bornes = bornesDxf(m), blocs = new Map(m.blocs.map(b => [b.Bloc, b])), parBloc = new Map();
  bornes.forEach(d => { (parBloc.get(d.r.Bloc) || parBloc.set(d.r.Bloc, []).get(d.r.Bloc)).push(d); });

  /* les corps */
  m.blocs.forEach(b => { if (b.X == null || b.L == null) return; const N = b.Nature, x0 = b.X, x1 = b.X + b.L, y0 = y(b.Y), y1 = y(b.Y + b.H), bs = parBloc.get(b.Bloc) || [];
    if (N === 'EQUIPEMENT' || N === 'RENVOI' || (N === 'RAIL' && bs.some(d => d.r.Cote !== 'C'))) W.rectangle('EQUIPEMENTS', x0, y1, x1, y0);
    else if (N === 'RAIL') { const r = Math.min(b.H, b.L) / 2;   // la pastille de potentiel : un rectangle aux bouts ronds
      W.polyligne('EQUIPEMENTS', [{ x: x0 + r, y: y1 }, { x: x1 - r, y: y1, b: 1 }, { x: x1 - r, y: y0 }, { x: x0 + r, y: y0, b: 1 }], true); }
    else if (N === 'BARRETTE' || N === 'BARRETTE_A_POSER') {
      // la ligne pointillée, coupée à chaque pastille (06 la cache sous un point noir ; ici la pastille est un rond)
      const xm = x0 + b.L / 2, R = R_PASTILLE_DXF * u, ys = [...new Set(bs.map(d => d.r.PY))].sort((p, q) => p - q);
      let haut = b.Y; ys.forEach(py => { if (py - R - haut > 0.05) W.ligne('BARRETTES', xm, y(haut), xm, y(py - R), null, DXF_LTYPE_POINTILLE); haut = Math.max(haut, py + R); });
      if (b.Y + b.H - haut > 0.05) W.ligne('BARRETTES', xm, y(haut), xm, y1, null, DXF_LTYPE_POINTILLE);
      if (N === 'BARRETTE') W.disque('BARRETTES', xm, y1, (b.H / u < 15 ? 1.5 : 2.1) * u); }   // le point de départ, en bas (un morceau collé : plus petit)
    else if (N === 'COLLECTEUR') {
      // le collecteur : un trait de chaque borne à l'axe, l'axe, trois barres décroissantes ; un point sur l'axe à chaque borne
      const xa = x0 + b.L / 2, bas = b.Y + b.H;
      bs.forEach(d => { W.ligne('MASSES', d.r.X, y(d.r.Y), xa, y(d.r.Y)); if (bs.length > 1) W.disque('MASSES', xa, y(d.r.Y), 1.5 * u); });
      W.ligne('MASSES', xa, y0, xa, y(bas - 6.4 * u));
      [[7, 6.4], [4.5, 3.2], [2, 0]].forEach(([l, dy]) => W.ligne('MASSES', xa - l * u, y(bas - dy * u), xa + l * u, y(bas - dy * u))); } });
  /* les pièces de connecteur : angles vifs contre le corps, arrondis du côté du fil ; la fiche et l'embase d'une prise */
  const rb = 1.8 * u, quart = Math.tan(Math.PI / 8);
  m.connecteurs.forEach(c => { const x0 = c.X0, x1 = c.X1, yh = y(c.Haut), yb = y(c.Bas);
    if (c.Lettre === 'FICHE' || c.Lettre === 'EMBASE') { W.rectangle('PRISES', x0, yb, x1, yh); return; }
    W.polyligne('CONNECTEURS', c.Cote === 'G'
      ? [{ x: x1, y: yb }, { x: x1, y: yh }, { x: x0 + rb, y: yh, b: quart }, { x: x0, y: yh - rb }, { x: x0, y: yb + rb, b: quart }, { x: x0 + rb, y: yb }]
      : [{ x: x0, y: yb }, { x: x1 - rb, y: yb, b: quart }, { x: x1, y: yb + rb }, { x: x1, y: yh - rb, b: quart }, { x: x1 - rb, y: yh }, { x: x0, y: yh }], true);
    if (c.LettreX != null) W.texte('CONNECTEURS', clip(c.Lettre, 3), c.LettreX, y(c.LettreY), h(6.5), { j: 'C' }); });

  /* les fils : un segment, une LINE, à la couleur de la route ; les jonctions */
  const traces = filsDxf(m, bornes);
  traces.forEach(({ f, points }) => { const c = couleurDe(f);
    for (let i = 0; i + 1 < points.length; i++) W.ligne('FILS', points[i].x, y(points[i].y), points[i + 1].x, y(points[i + 1].y), c); });
  m.jonctions.forEach(j => W.insertion('FILS', 'SEE_JONCTION', j.X, y(j.Y), s, null));
  /* les pontages d'un équipement (des shunts entre bornes d'un même flanc) : un trait fin devant la pièce, un point sur
     chaque borne pontée — comme 06 */
  const ponts = new Map();
  m.fils.forEach(f => { if (f.Shunt !== 'O' || f.DeBloc !== f.VersBloc) return; const b = blocs.get(f.DeBloc); if (!b || !(b.Nature === 'EQUIPEMENT' || b.Nature === 'RENVOI')) return;
    const de = bornes.find(d => d.r.Bloc === f.DeBloc && d.r.Borne === String(f.DeBorne == null ? '' : f.DeBorne)), vers = bornes.find(d => d.r.Bloc === f.VersBloc && d.r.Borne === String(f.VersBorne == null ? '' : f.VersBorne));
    if (!de || !vers || de.r.Cote !== vers.r.Cote || (de.r.Cote !== 'G' && de.r.Cote !== 'D')) return;
    const k2 = f.DeBloc + '|' + de.r.Cote; (ponts.get(k2) || ponts.set(k2, []).get(k2)).push([Math.min(de.r.Y, vers.r.Y), Math.max(de.r.Y, vers.r.Y), de.r.X]); });
  ponts.forEach((ivs, k2) => { const [bloc, cote] = k2.split('|'), dx = (cote === 'G' ? 3.5 : -3.5) * u, paquets = [];
    ivs.sort((p, q) => p[0] - q[0]).forEach(iv => { const d = paquets[paquets.length - 1]; if (d && iv[0] <= d[1] + 0.15) d[1] = Math.max(d[1], iv[1]); else paquets.push(iv.slice()); });
    paquets.forEach(([y1, y2, xa]) => { const xs = xa + dx; W.ligne('BORNES', xs, y(y1), xs, y(y2));
      (parBloc.get(bloc) || []).filter(d => d.r.Cote === cote && d.r.Y >= y1 - 0.01 && d.r.Y <= y2 + 0.01).forEach(d => W.disque('BORNES', xs, y(d.r.Y), 1.6 * u)); }); });

  /* les bornes : un INSERT au contact, ses quatre attributs. Un numéro plus long que ce que l'Atelier écrit à sa place (la
     borne d'un renvoi : « 661VT22 1 ») garde sa valeur entière dans l'attribut, caché, et s'écrit rogné à côté, comme 06. */
  bornes.forEach(d => { const r = d.r, b = blocs.get(r.Bloc) || {}, n = d.numero && r.Numero ? d.numero : null, long = n && String(r.Numero).length > n.max;
    const cache = (tag, valeur) => ({ tag, valeur, x: d.x, y: y(d.y), h: h(4), cache: true });
    W.insertion(d.calque, d.bloc, d.x, y(d.y), s, [cache('REPERE', b.Repere || ''), cache('CONNECTEUR', r.Connecteur || ''), cache('BORNE', r.Borne == null ? '' : r.Borne),
      n && !long ? { tag: 'NUMERO', valeur: r.Numero, x: n.x, y: y(n.y), h: h(n.fs), j: n.j, v: 'milieu' } : cache('NUMERO', r.Numero || '')]);
    if (long) W.texte(d.calque, clip(r.Numero, n.max), n.x, y(n.y), h(n.fs), { j: n.j, v: 'milieu' }); });

  /* les textes : les repères (là où l'Atelier les écrit : centrés, sur la ligne de base), les numéros de fil */
  m.blocs.forEach(b => { if (b.RepereX == null || !b.Repere) return; const N = b.Nature, bs = parBloc.get(b.Bloc) || [];
    const [fs, n] = N === 'EQUIPEMENT' || N === 'RENVOI' || (N === 'RAIL' && bs.some(d => d.r.Cote !== 'C'))
      ? (() => { const nom = clip(b.Repere, 14); return [Math.max(7, Math.min(10.5, (b.L / u - 28) / (0.66 * nom.length))), nom]; })()
      : N === 'COLLECTEUR' ? [10, clip(b.Repere, 10)] : N === 'RAIL' ? [7.5, clip(b.Repere, 7)] : [6, clip(b.Repere, N === 'MASSE' ? 10 : 14)];
    W.texte('REPERES', n, b.RepereX, y(b.RepereY), h(fs), { j: 'C' });
    // un équipement très haut rappelle son repère en pied, comme 06
    if (N === 'EQUIPEMENT' && b.H / u > 380) W.texte('REPERES', clip(b.Repere, 12), b.X + b.L / 2, y(b.Y + b.H - 9 * u), h(6.5), { j: 'C' }); });
  /* Un numéro couché que l'Atelier écrit DANS son fil (sur un fond blanc qui coupe le trait : son centre est à moins de
     trois unités au-dessus du trait) se pose ici juste AU-DESSUS, la ligne de base à 1,5 unité du trait : un DXF R12 n'a
     pas de masque, le trait le barrerait. `numeros: 'dedans'` le laisse là où l'Atelier l'écrit. */
  m.fils.forEach(f => { if (f.NumeroX == null || !f.Fil) return;
    const x = f.NumeroX; let yy = f.NumeroY, v = 'milieu';
    if (o.numeros === 'dessus' && !f.NumeroAngle) { const p = f.Points || [];
      for (let i = 0; i + 1 < p.length; i++) { const d = (yy - p[i][1]) / u;
        if (Math.abs(p[i][1] - p[i + 1][1]) < EPS_DXF && d > -3 && d < 1 && x >= Math.min(p[i][0], p[i + 1][0]) - 0.01 && x <= Math.max(p[i][0], p[i + 1][0]) + 0.01) { yy = p[i][1] - 1.5 * u; v = 'base'; break; } } }
    W.texte('NUMEROS', f.Fil, x, y(yy), h(FS_FIL), { j: 'C', v, angle: f.NumeroAngle || 0 }); });
  W.g(0, 'ENDSEC'); W.g(0, 'EOF');
  return W.fin(); }

/* ---- la feuille : le cadre, ses zones, le cartouche (06, `feuilleDeReference`, en mm) ------------------------------ */
function cadreDxf(W, m, o, aci) {
  const q = SEE_UNITE, H = PAGE_H * q, X = v => v * q, Y = v => H - v * q, ht = fs => DXF_HAUTEUR * fs * q, F = m.folio;
  const ix = PAGE_CADRE, iy = PAGE_CADRE, iw = PAGE_W - 2 * PAGE_CADRE, ih = PAGE_H - 2 * PAGE_CADRE;
  W.rectangle('CADRE', X(ix), Y(iy + ih), X(ix + iw), Y(iy));
  const ncol = Math.max(2, Math.round(iw / 150)), nrow = Math.max(2, Math.round(ih / 150));
  for (let i = 1; i < ncol; i++) { const xx = ix + iw * i / ncol; W.ligne('CADRE', X(xx), Y(iy), X(xx), Y(iy - 6)); W.ligne('CADRE', X(xx), Y(iy + ih), X(xx), Y(iy + ih + 6)); }
  for (let i = 0; i < ncol; i++) { const cx = ix + iw * (i + 0.5) / ncol; W.texte('CADRE', String(i + 1), X(cx), Y(iy - 7), ht(8), { j: 'C' }); W.texte('CADRE', String(i + 1), X(cx), Y(iy + ih + 13), ht(8), { j: 'C' }); }
  for (let i = 1; i < nrow; i++) { const yy = iy + ih * i / nrow; W.ligne('CADRE', X(ix), Y(yy), X(ix - 6), Y(yy)); W.ligne('CADRE', X(ix + iw), Y(yy), X(ix + iw + 6), Y(yy)); }
  for (let i = 0; i < nrow; i++) { const cy = iy + ih * (i + 0.5) / nrow, L = String.fromCharCode(65 + i);
    W.texte('CADRE', L, X(ix - 10), Y(cy + 3), ht(8), { j: 'C' }); W.texte('CADRE', L, X(ix + iw + 10), Y(cy + 3), ht(8), { j: 'C' }); }
  // le cartouche, en bas à droite contre le cadre : FOLIO, TITRE, DESSINÉ / DATE / ÉCHELLE / INDICE, la légende des routes à gauche
  const rx = ix + iw, by = iy + ih, routes = m.legende || [], nCol = Math.ceil(routes.length / LEG_PAR_COLONNE);
  const Wc = CART_FOLIO + CART_TITRE + nCol * LEG_COLONNE, x = rx - Wc, yc = by - CART_H, xT = rx - CART_FOLIO - CART_TITRE, xF = rx - CART_FOLIO, yB = yc + CART_HAUT;
  const trait = (a, b, c, d) => W.ligne('CADRE', X(a), Y(b), X(c), Y(d));
  trait(xT, yB, rx, yB); trait(xF, yc, xF, by); trait(xT + 88, yB, xT + 88, by); trait(xT + 176, yB, xT + 176, by);
  for (let k = 0; k < nCol; k++) trait(xT - k * LEG_COLONNE, yc, xT - k * LEG_COLONNE, by);
  const champ = (cx, cy, t, v, n) => { W.texte('CADRE', t, X(cx), Y(cy), ht(6)); W.texte('CADRE', clip(v || '—', n), X(cx), Y(cy + 15), ht(8.5)); };
  const folio = o.total ? (F.Plan || o.rang || F.Folio) + ' / ' + o.total : (F.Plan || String(F.Folio));
  champ(xT + 10, yB + 12, 'DESSINÉ', F.Dessine, 12); champ(xT + 98, yB + 12, 'DATE', F.Date, 12); champ(xT + 186, yB + 12, 'ÉCHELLE', o.echelle, 11); champ(xF + 10, yB + 12, 'INDICE', F.Indice, 11);
  W.texte('CADRE', 'TITRE', X(xT + 10), Y(yc + 13), ht(6)); W.texte('CADRE', 'ATELIER·SCHÉMA', X(xF - 10), Y(yc + 13), ht(6.5), { j: 'D' });
  W.texte('CADRE', clip(F.Titre || '—', 30), X(xT + 10), Y(yc + 36), ht(13));
  W.texte('CADRE', 'FOLIO', X(xF + 10), Y(yc + 13), ht(6)); W.texte('CADRE', clip(folio, 9), X(xF + CART_FOLIO / 2), Y(yc + 39), ht(18), { j: 'C' });
  routes.forEach((r, i) => { const k = Math.floor(i / LEG_PAR_COLONNE), cx = xT - (nCol - k) * LEG_COLONNE + 10, cy = yc + 30 + (i % LEG_PAR_COLONNE) * LEG_LIGNE;
    W.polyligne('CADRE', [{ x: X(cx), y: Y(cy - 3) }, { x: X(cx + 24), y: Y(cy - 3) }], false, 3.2 * q, (o.couleurs && (aci.get(r.Route) || aciDe(r.Couleur))) || null);
    W.texte('CADRE', clip(r.Route || 'sans route', 15), X(cx + 32), Y(cy), ht(8)); W.texte('CADRE', r.NbFils + ' fil' + (r.NbFils > 1 ? 's' : ''), X(cx + LEG_COLONNE - 20), Y(cy), ht(7), { j: 'D' }); });
  if (nCol) W.texte('CADRE', 'ROUTES', X(x + 10), Y(yc + 13), ht(6));
  W.rectangle('CADRE', X(x), Y(by), X(rx), Y(yc)); }

/* ---- les noms : « NN.<nom du folio>.dxf » --------------------------------
   SEE nomme le folio d'après le fichier quand le nom contient un point (« 01.Power.DWG ») : NN est le rang du folio dans
   le contrat (le même fichier d'un export à l'autre), sur au moins deux chiffres ; le nom est celui du paquet (`Nom`,
   le plan nettoyé), réduit à l'ASCII, sans point (le seul point sépare le rang du nom). */
function nomDuDxf(m, rang, total) { const n = rang || m.folio.Folio, l = Math.max(2, String(Math.max(total || 0, n)).length);
  const nom = nomAscii(String(m.folio.Nom || '')).replace(/\./g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '') || 'Folio';
  return String(n).padStart(l, '0') + '.' + nom + '.dxf'; }

/* ---- le ZIP « stocké » ------------------------------------------------------
   partiesZip(fichiers, date) → les morceaux du zip, à mettre bout à bout (un Blob les prend tels quels : huit cents
   folios ne se recopient pas) ; zipDe(fichiers, date) → le zip en un Uint8Array. `fichiers` : [{ nom (ASCII), octets
   (Uint8Array), crc (facultatif : calculé sinon) }]. Méthode 0 (stocké), sans descripteur ni zip64 : au plus 65 535
   fichiers et 4 Go. La date est celle de l'export (heure locale, au format DOS). */
const TABLE_CRC32 = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(octets) { let c = 0xFFFFFFFF; for (let i = 0; i < octets.length; i++) c = TABLE_CRC32[(c ^ octets[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function partiesZip(fichiers, date) {
  if (fichiers.length > 0xFFFF) throw new Error('zip : plus de 65 535 fichiers');
  const d = date || new Date(), heure = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), jour = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const parts = [], centrale = []; let decalage = 0;
  fichiers.forEach(f => { const nom = Uint8Array.from(String(f.nom), c => { const x = c.charCodeAt(0); if (x > 0x7e || x < 0x20) throw new Error('zip : nom non ASCII ' + f.nom); return x; });
    const data = f.octets, crc = f.crc != null ? f.crc : crc32(data);
    if (decalage + 30 + nom.length + data.length > 0xFFFFFFFF) throw new Error('zip : plus de 4 Go');
    const local = new Uint8Array(30 + nom.length), l = new DataView(local.buffer);
    l.setUint32(0, 0x04034b50, true); l.setUint16(4, 10, true); l.setUint16(6, 0, true); l.setUint16(8, 0, true); l.setUint16(10, heure, true); l.setUint16(12, jour, true);
    l.setUint32(14, crc, true); l.setUint32(18, data.length, true); l.setUint32(22, data.length, true); l.setUint16(26, nom.length, true); l.setUint16(28, 0, true); local.set(nom, 30);
    const ent = new Uint8Array(46 + nom.length), c = new DataView(ent.buffer);
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 10, true); c.setUint16(8, 0, true); c.setUint16(10, 0, true); c.setUint16(12, heure, true); c.setUint16(14, jour, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nom.length, true);
    c.setUint16(30, 0, true); c.setUint16(32, 0, true); c.setUint16(34, 0, true); c.setUint16(36, 0, true); c.setUint32(38, 0, true); c.setUint32(42, decalage, true); ent.set(nom, 46);
    parts.push(local, data); centrale.push(ent); decalage += local.length + data.length; });
  const taille = centrale.reduce((t, e) => t + e.length, 0), fin = new Uint8Array(22), e = new DataView(fin.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, fichiers.length, true); e.setUint16(10, fichiers.length, true); e.setUint32(12, taille, true); e.setUint32(16, decalage, true);
  return [...parts, ...centrale, fin]; }
function zipDe(fichiers, date) { const parts = partiesZip(fichiers, date), out = new Uint8Array(parts.reduce((t, p) => t + p.length, 0)); let i = 0;
  parts.forEach(p => { out.set(p, i); i += p.length; }); return out; }
