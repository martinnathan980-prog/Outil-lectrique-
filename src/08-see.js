/* ===========================================================================
   08 — LE PAQUET SEE : chaque folio tel que l'Atelier le dessine, pour SEE
   ---------------------------------------------------------------------------
   Le technicien doit saisir ses folios dans SEE Electrical Expert. L'Atelier
   sait les placer et les router ; un classeur pilote (see/vba/*.bas) sait
   dessiner dans SEE. Entre les deux, un fichier : le PAQUET SEE, un classeur
   .xlsx dont see/FORMAT-PAQUET.md est le contrat (il fait foi : on ne change
   pas une colonne sans l'y changer d'abord).

   Deux parties ici :
   · LE MODÈLE, pur, sans DOM — le même code sert la page et le lot
     (see/exporter.js le charge sous Node, dans un bac vm, dans l'ordre de
     construire.js). `modeleSEE` lit un folio dessiné (l'objet de
     `dessinDuPlacement`, 08) et le rend en millimètres sur la feuille A3 ;
     `classeurSEE` range les folios dans le classeur. Le modèle parle la
     langue du contrat : chaque rangée porte les noms ASCII de ses colonnes.
   · L'INTERFACE : la fiche « Exporter pour SEE » (menu), l'avancement folio
     par folio, le téléchargement.

   CE QUI EST EXPORTÉ, C'EST LE DESSIN. Le folio passe par `sceneSvg` (06),
   comme à l'écran, sur une COPIE de ses blocs : les repères qui cherchent
   leur place (barrettes, prises, masses, barrettes à poser) et les numéros
   de fil sont lus là où le dessin les a posés ; les corps, pastilles,
   pièces et lettres sont relus dans le SVG de chaque bloc. Le dessin n'est
   pas touché, et 06 non plus : le moteur garde sa version (VERSION_MOTEUR),
   les dessins affinés gardés dans le navigateur restent valables.

   UNE BORNE, TROIS POINTS. L'ACCROCHE (X, Y) : le bout du tracé du fil, au
   bord du bloc du moteur. LE CONTACT (CX, CY) : là où le fil touche la borne
   dessinée — le bord de la pièce de connecteur (ou du corps), de la fiche ou
   de l'embase, de la pastille du côté du fil, le premier trait de la masse ;
   entre les deux, l'AMORCE, que 06 trace à la couleur du fil. LE CENTRE
   (PX, PY) : la pastille, le numéro dans la pièce. Le DXF (08-dxf) pose ses
   bornes au contact : une seule vérité. Une borne de barrette qui reçoit
   plusieurs fils a un rond par fil, donc plusieurs lignes : `Rond` les
   numérote de haut en bas, et chaque fil cite le sien (`DeRond`, `VersRond`).

   Les coordonnées : la feuille fait PAGE_W × PAGE_H = 1680 × 1188 unités à
   un quart de millimètre (A3 paysage, 420 × 297 mm) ; le dessin s'y cale à
   l'échelle k (pageDe) : x_mm = (x − bb.x) / k × 0,25, y_mm = (y − bb.y) / k
   × 0,25, origine en haut à gauche, y vers le bas, au centième.
   =========================================================================== */
'use strict';

const SEE_FORMAT = 'paquet-see/1';
const SEE_UNITE = 0.25;   // une unité de feuille, en mm
/* Les colonnes de chaque feuille, dans l'ordre de FORMAT-PAQUET.md (tests/see.js les relit dans le document). */
const SEE_COLONNES = {
  Folios: ['Folio', 'Plan', 'Nom', 'Harness', 'Titre', 'Indice', 'Dessine', 'Date', 'Echelle', 'Pas', 'CadreX', 'CadreY', 'CadreL', 'CadreH', 'NbBlocs', 'NbBornes', 'NbFils', 'Droits', 'Croisements', 'Remarque'],
  Blocs: ['Folio', 'Bloc', 'Repere', 'Nature', 'Code', 'PN', 'Description', 'X', 'Y', 'L', 'H', 'RepereX', 'RepereY', 'Sens', 'Morceau'],
  Connecteurs: ['Folio', 'Bloc', 'Repere', 'Lettre', 'PN', 'Cote', 'X0', 'X1', 'Haut', 'Bas', 'LettreX', 'LettreY'],
  Bornes: ['Folio', 'Bloc', 'Repere', 'Connecteur', 'Borne', 'Numero', 'Cote', 'X', 'Y', 'PX', 'PY', 'Contact', 'Sexe', 'Rond', 'CX', 'CY'],
  Fils: ['Folio', 'Ordre', 'Fil', 'DeBloc', 'DeRepere', 'DeBorne', 'VersBloc', 'VersRepere', 'VersBorne', 'DeCote', 'VersCote', 'Type', 'Jauge', 'Blinde', 'Route', 'Couleur', 'Longueur', 'Shunt', 'Points', 'NumeroX', 'NumeroY', 'NumeroAngle', 'DeRond', 'VersRond'],
  Jonctions: ['Folio', 'X', 'Y'],
  Legende: ['Folio', 'Route', 'Couleur', 'NbFils']
};
const centieme = v => (Math.round(v * 100) / 100) || 0;   // || 0 : jamais de « -0 »
const nomDeFolioSEE = (plan, rang) => String(plan || '').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'Folio ' + rang;

/* ---- relire le SVG d'un bloc ------------------------------------------
   `sceneSvg` peint chaque bloc dans un groupe `<g class="comp" … transform=
   "translate(x,y)">`, dans l'ordre de `dessin.comps`. On en relit les
   éléments (rectangle, trait, rond, texte) en absolu : ce que la page montre,
   sans refaire ses calculs. */
const ATTRS_SVG = /([\w-]+)="([^"]*)"/g;
const sansEntites = s => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
function elementsSvg(fragment, dx, dy) { const out = [], re = /<(rect|line|circle|text|path)\b([^>]*?)\/?>(?:([^<]*)<\/text>)?/g; let m;
  while ((m = re.exec(fragment))) { const a = {}; let q; ATTRS_SVG.lastIndex = 0; while ((q = ATTRS_SVG.exec(m[2]))) a[q[1]] = q[2];
    const n = k => a[k] != null ? +a[k] : null, e = { tag: m[1], cls: a.class || '', a };
    if (e.tag === 'rect') Object.assign(e, { x: n('x') + dx, y: n('y') + dy, w: n('width'), h: n('height') });
    else if (e.tag === 'line') Object.assign(e, { x1: n('x1') + dx, y1: n('y1') + dy, x2: n('x2') + dx, y2: n('y2') + dy });
    else if (e.tag === 'circle') Object.assign(e, { cx: n('cx') + dx, cy: n('cy') + dy, r: n('r') });
    else if (e.tag === 'text') Object.assign(e, { x: n('x') + dx, y: n('y') + dy, ancre: a['text-anchor'] || 'start', texte: sansEntites(m[3] || '') });
    out.push(e); }
  return out; }
function groupesDesBlocs(svg) { const parts = svg.split('<g class="comp" ').slice(1);
  return parts.map(p => { const t = /transform="translate\(([-\d.]+),([-\d.]+)\)"/.exec(p), fin = p.indexOf('</g>');
    return elementsSvg(p.slice(p.indexOf('>') + 1, fin < 0 ? p.length : fin), t ? +t[1] : 0, t ? +t[2] : 0); }); }
const boiteDe = es => { const xs = [], ys = [];
  es.forEach(e => { if (e.tag === 'line') { xs.push(e.x1, e.x2); ys.push(e.y1, e.y2); } else if (e.tag === 'rect') { xs.push(e.x, e.x + e.w); ys.push(e.y, e.y + e.h); } else if (e.tag === 'circle') { xs.push(e.cx - e.r, e.cx + e.r); ys.push(e.cy - e.r, e.cy + e.r); } });
  return xs.length ? { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) } : null; };
/* Un texte ancré au début ou à la fin, ramené à son milieu (sa largeur : celle que le dessin lui compte, 06). */
const ancreAuMilieu = (x, a, n, fs, ls) => a === 'start' ? x + largeurTexte(n, fs, ls) / 2 : a === 'end' ? x - largeurTexte(n, fs, ls) / 2 : x;
const distanceAuTrace = (p, pts) => { let d = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], b = pts[i + 1], L2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2, t = L2 ? Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / L2)) : 0;
    d = Math.min(d, Math.hypot(p.x - a.x - t * (b.x - a.x), p.y - a.y - t * (b.y - a.y))); }
  return d; };
/* Les numéros de fil tels que `reperesDeFil` (06) les a écrits : le centre du texte (sa boîte, comptée comme le dessin
   la compte), couché (0) ou debout le long d'un vertical (90 : tourné de −90°, il se lit de bas en haut). */
function numerosDuSvg(svg) { const out = [], re = /<text class="filnum"((?: [\w-]+="[^"]*")*)>([^<]*)<\/text>/g; let m;
  while ((m = re.exec(svg))) { const a = {}; let q; ATTRS_SVG.lastIndex = 0; while ((q = ATTRS_SVG.exec(m[1]))) a[q[1]] = q[2];
    const x = +a.x, y = +a.y, nom = sansEntites(m[2]), b = boiteDeTexte(x, y, 'middle', nom.length, FS_FIL, 0.1), dy = (b.y0 + b.y1) / 2 - y;
    // debout : la boîte tourne de −90° autour de l'ancre, son milieu passe à gauche du point d'ancrage
    out.push(/rotate\(-90/.test(a.transform || '') ? { nom, x: x + dy, y, angle: 90 } : { nom, x, y: y + dy, angle: 0 }); }
  return out; }

/* ---- LE MODÈLE D'UN FOLIO -------------------------------------------------
   modeleSEE(dessin, L, infos) → le folio en mm, rangées aux noms du contrat :
     { folio: <rangée Folios>, blocs, connecteurs, bornes, fils, jonctions, legende }
   `dessin` : `dessinDuPlacement(P, L, routes)` (08) — comps, fils, points, barrettes à poser nommées, bbox, couleurDe,
              legende ; il n'est pas modifié.
   `L`      : les liaisons du folio telles que le moteur les a reçues (avecBarrettesAPoser) : le fil n° i du dessin est L[i].
   `infos`  : { folio (rang dans le paquet), plan, cartouche, designations (Map repère → texte saisi), contactDe(l) → { de, vers }
              ({ contact, sexe } ou null : le contact à sertir de chaque bout, s'il est connu) }.
   Dans les rangées, `Points` d'un fil est un tableau de [x, y] (mm) ; le classeur l'écrit en texte « x y|x y ». */
function modeleSEE(dessin, L, infos) {
  infos = infos || {};
  const bb = dessin.bbox, k = bb.k || bb.w / PAGE_W, F = infos.folio || 1, remarques = [];
  const X = x => centieme((x - bb.x) / k * SEE_UNITE), Y = y => centieme((y - bb.y) / k * SEE_UNITE), D = v => centieme(v / k * SEE_UNITE);
  // le dessin, peint sur une copie : les repères qui cherchent leur place s'y posent (c.repere, b.repere), les numéros aussi
  const comps = dessin.comps.map(c => ({ ...c })), barrettes = Object.assign((dessin.barrettes || []).map(b => ({ ...b })), { raccords: (dessin.barrettes || []).raccords || [] });
  const svg = sceneSvg({ ...dessin, comps, barrettes }, infos.cartouche || nouveauContrat().cartouche, '', () => '', null);
  const groupes = groupesDesBlocs(svg);
  if (groupes.length !== comps.length) remarques.push('le dessin des blocs n’a pas pu être relu en entier');
  const descriptions = descriptionsDe({ liaisons: L }), saisies = infos.designations || new Map();
  const pnDe = nom => { const s = new Set(); L.forEach(l => { if (l.de === nom && l.pnDe) s.add(l.pnDe); if (l.vers === nom && l.pnVers) s.add(l.pnVers); }); return s.size === 1 ? [...s][0] : null; };
  const codeDe = nom => { const q = lireRepere(nom); return q && q.num ? q.code : VT_A_POSER.test(String(nom)) ? 'VT' : null; };

  /* ---- les blocs, et les bornes de chacun : `accroches` garde, en unités du dessin, le point où un fil s'y accroche
     (ux, uy) et le contact (cx, sur la même horizontale ; null : à lire dans le fil qui arrive, `rayon` plus loin) */
  const cle = (x, y) => Math.round(x * 100) + ',' + Math.round(y * 100), bouts = new Set();
  dessin.fils.forEach(w => { if (w.pts && w.pts.length) { bouts.add(cle(w.pts[0].x, w.pts[0].y)); bouts.add(cle(w.pts[w.pts.length - 1].x, w.pts[w.pts.length - 1].y)); } });
  const blocs = [], connecteurs = [], bornes = [], accroches = [];
  const borne = (bloc, rangee, ux, uy, px, py, cx, rayon) => { const r = { Folio: F, Bloc: bloc.Bloc, Repere: bloc.Repere, Connecteur: null, Borne: '', Numero: null, Cote: 'C', X: X(ux), Y: Y(uy), PX: X(px), PY: Y(py), Contact: null, Sexe: null, Rond: null, CX: null, CY: null, ...rangee };
    const a = { r, bloc, ux, uy, cx, rayon }; bornes.push(r); accroches.push(a); return a; };
  // le bord d'une pastille de rayon r posée en xc, du côté d'où vient le fil (s < 0 : de la gauche)
  const bordDePastille = (xc, r, s) => xc + Math.sign(s) * (r || 0);
  const rect = (b, r) => { if (!r) { remarques.push('corps de ' + b.Repere + ' non relu'); return; } b.X = X(r.x); b.Y = Y(r.y); b.L = D(r.w); b.H = D(r.h); };
  const repere = (b, x, y) => { b.RepereX = X(x); b.RepereY = Y(y); };
  const parNom = new Map(); comps.forEach(c => parNom.set(c.name, (parNom.get(c.name) || 0) + 1));
  comps.forEach((c, ic) => { const es = groupes[ic] || [], nom = String(c.name), de = cls => es.filter(e => e.cls === cls);
    const nature = c.kind === 'tag' ? (estMasse(nom) ? 'MASSE' : estBarrette(nom) ? 'BARRETTE' : 'RAIL')
      : c.kind === 'strip' ? (estCoupure(nom) ? 'PRISE' : 'BARRETTE')
      : estRenvoi(nom) ? 'RENVOI' : estMasse(nom) ? 'COLLECTEUR' : c.rail || estRail(nom) ? 'RAIL' : 'EQUIPEMENT';
    const b = { Folio: F, Bloc: 'B' + (blocs.length + 1), Repere: nom, Nature: nature, Code: codeDe(nom), PN: nature === 'MASSE' || nature === 'RAIL' ? null : pnDe(nom),
      Description: saisies.get(nom) || descriptions.get(nom) || null, X: null, Y: null, L: null, H: null, RepereX: null, RepereY: null, Sens: null, Morceau: null };
    blocs.push(b); b._c = c;
    const rangs = c.rangs || {}, bx = c.x + c.lw, bw = c.w - c.lw - c.rw;
    if (c.kind === 'tag') {
      // une pastille (masse, morceau de barrette, rail) : un fil, une borne ; son symbole tout de suite après le bout du fil
      const p = (rangs.S || [])[0] || { etiq: '', y: c.y + c.h / 2, dir: -1 }, gauche = (p.dir || -1) < 0, M = symboleDePastille(c);
      b.Sens = nature === 'BARRETTE' ? null : (gauche ? 'G' : 'D');
      if (nature === 'MASSE') rect(b, boiteDe(de('earth').filter(e => Math.abs(e.x1 - e.x2) < 1e-6)));
      else if (nature === 'BARRETTE') { const r = Math.max(0, ...de('bpast').map(e => e.r)), l = de('barre')[0]; rect(b, l ? { x: l.x1 - r, y: Math.min(l.y1, l.y2), w: 2 * r, h: Math.abs(l.y2 - l.y1) } : null); }
      else rect(b, boiteDe(de('rpill')));
      const t = es.find(e => e.tag === 'text' && /^(rep-petit|rname)$/.test(e.cls));
      if (c.repere) { const R = reperesCandidats(c); repere(b, ancreAuMilieu(c.repere.x, c.repere.a, c.repere.nom.length, R.fs, R.ls), c.repere.y); }
      else if (t) repere(b, t.x, t.y);
      // le contact : le premier trait de la masse, le bord de la pastille du morceau ; la pilule d'un rail commence à l'accroche
      const xa = gauche ? c.x : c.x + c.w, rp = (de('bpast')[0] || {}).r;
      borne(b, { Borne: String(p.etiq == null ? '' : p.etiq), Numero: p.etiq ? String(p.etiq) : null }, xa, p.y, M ? M.xs : c.x + c.w / 2, p.y,
        !M ? xa : M.genre === 'masse' ? M.xs : bordDePastille(M.xs, rp, gauche ? -1 : 1));
      return; }
    if (c.kind === 'strip' && nature === 'PRISE') {
      // une prise de coupure : la fiche (mobile, à gauche, l'amont), l'embase (fixe, à droite, l'aval) ; un contact, deux accroches
      const fi = de('fiche')[0], em = de('embase')[0];
      rect(b, boiteDe([fi, em].filter(Boolean)));
      if (c.repere) { const R = reperesCandidats(c); repere(b, ancreAuMilieu(c.repere.x, c.repere.a, c.repere.nom.length, R.fs, R.ls), c.repere.y); }
      [['FICHE', 'G', fi], ['EMBASE', 'D', em]].forEach(([lettre, cote, e]) => { if (e) connecteurs.push({ Folio: F, Bloc: b.Bloc, Repere: nom, Lettre: lettre, PN: b.PN, Cote: cote, X0: X(e.x), X1: X(e.x + e.w), Haut: Y(e.y), Bas: Y(e.y + e.h), LettreX: null, LettreY: null }); });
      // le contact : le bord gauche de la fiche, le bord droit de l'embase (06 y arrête l'amorce)
      (rangs.S || []).forEach(p => { const n = p.etiq ? String(p.etiq) : '';
        borne(b, { Connecteur: 'FICHE', Borne: n, Numero: n || null, Cote: 'G' }, c.x, p.y, fi ? fi.x + fi.w / 2 : bx, p.y, fi ? fi.x : c.x);
        borne(b, { Connecteur: 'EMBASE', Borne: n, Numero: n || null, Cote: 'D' }, c.x + c.w, p.y, em ? em.x + em.w / 2 : c.x + c.w - c.rw, p.y, em ? em.x + em.w : c.x + c.w); });
      return; }
    if (c.kind === 'strip') {
      // une barrette (ou un de ses morceaux) : la colonne pointillée, une pastille par rond ; le fil s'accroche au bord du bloc
      const l = de('barre')[0], r = Math.max(0, ...de('bpast').map(e => e.r)), mid = l ? l.x1 : bx + bw / 2;
      rect(b, l ? { x: mid - r, y: Math.min(l.y1, l.y2), w: 2 * r, h: Math.abs(l.y2 - l.y1) } : null);
      if (c.repere) { const R = reperesCandidats(c); repere(b, ancreAuMilieu(c.repere.x, c.repere.a, c.repere.nom.length, R.fs, R.ls), c.repere.y); }
      // un rond porte un fil au plus : il s'accroche du côté où ce fil arrive ; sans fil (un pontage seul), du côté de son départ.
      // Le contact : le bord de sa pastille, de ce côté.
      (rangs.S || []).forEach(p => { const n = p.etiq ? String(p.etiq) : '', d = bouts.has(cle(c.x + c.w, p.y)) ? 1 : bouts.has(cle(c.x, p.y)) ? -1 : (p.dir || 0);
        borne(b, { Borne: n, Numero: n || null }, d > 0 ? c.x + c.w : c.x, p.y, mid, p.y, bordDePastille(mid, r, d > 0 ? 1 : -1)); });
      return; }
    // un équipement (un renvoi, un rail, un collecteur de masse dessinés en bloc) : le corps, ses pièces de connecteur, ses bornes sur les flancs
    const corps = de('body')[0];
    if (nature === 'COLLECTEUR') rect(b, boiteDe(de('earth').filter(e => ![e.x1, e.x2].some(x => Math.abs(x - c.x) < 1e-6 || Math.abs(x - c.x - c.w) < 1e-6))));
    else rect(b, corps || null);
    const t = es.find(e => e.tag === 'text' && /^(rep-big|rep)$/.test(e.cls)); if (t) repere(b, t.x, t.y);
    const pieces = c.connecteurs ? piecesDeConnecteur(c) : [], lettres = de('connnom'), cn = c.connecteurs || new Map();
    pieces.forEach((p, i) => { const g = [...cn.values()].find(x => x.nom === p.nom), lt = lettres[i];
      connecteurs.push({ Folio: F, Bloc: b.Bloc, Repere: nom, Lettre: p.nom, PN: g && g.pn ? g.pn : null, Cote: p.x0 < bx ? 'G' : 'D', X0: X(p.x0), X1: X(p.x1), Haut: Y(p.t), Bas: Y(p.b), LettreX: lt ? X(lt.x) : null, LettreY: lt ? Y(lt.y) : null }); });
    const axe = nature === 'COLLECTEUR' ? (de('earth').find(e => Math.abs(e.x1 - e.x2) < 1e-6) || {}).x1 : null;
    /* le contact, comme 06 (`bornesSvg`) arrête le raccord : dans un connecteur, au bord extérieur de la pièce ; sinon, au
       bord du corps. Le collecteur commence à l'accroche (son trait jusqu'à l'axe est le symbole, pas du fil). */
    [['L', 'G', c.x, bx, -1], ['R', 'D', c.x + c.w, bx + bw, 1]].forEach(([lid, cote, xa, xc, s]) => (rangs[lid] || []).forEach(p => {
      const n = String(p.etiq == null ? '' : p.etiq), g = cn.get(n), pc = g && pieces.find(q => q.nom === g.nom && (cote === 'G' ? q.x0 < bx : q.x0 >= bx) && p.y >= q.t - 0.01 && p.y <= q.b + 0.01);
      borne(b, { Connecteur: g ? g.nom : null, Borne: n, Numero: n ? (g ? etiquetteDansConnecteur(n, g.nom) : n) : null, Cote: nature === 'COLLECTEUR' ? 'C' : cote },
        xa, p.y, axe != null ? axe : pc ? (pc.x0 + pc.x1) / 2 : xc, p.y, nature === 'COLLECTEUR' ? xa : g ? xc + s * CONN_W : xc); })); });
  // les morceaux d'un même repère (une barrette coupée, une masse posée à chaque fil), numérotés de haut en bas
  blocs.filter(b => parNom.get(b.Repere) > 1).sort((u, v) => u._c.y - v._c.y || u._c.x - v._c.x)
    .forEach(b => { b.Morceau = blocs.filter(o => o.Repere === b.Repere && (o._c.y < b._c.y || (o._c.y === b._c.y && o._c.x < b._c.x))).length + 1; });
  /* les barrettes à poser (05 les pose au ras de leur borne, 08 les nomme) : une pastille par borne, le fil s'y accroche en son
     centre ; son contact, le bord de la pastille du côté d'où vient le fil, se lit dans ce fil (plus bas) */
  const vts = new Map();
  barrettes.forEach(v => { const bs = bornesDePiquage(v), r = Math.max(...bs.map(p => R_PASTILLE(String(p.n))));
    const b = { Folio: F, Bloc: 'B' + (blocs.length + 1), Repere: v.nomVT || null, Nature: 'BARRETTE_A_POSER', Code: 'VT', PN: null, Description: null,
      X: X(v.x - r), Y: Y(bs[0].y), L: D(2 * r), H: D(bs[bs.length - 1].y - bs[0].y), RepereX: null, RepereY: null, Sens: null, Morceau: null };
    if (v.repere && v.nomVT) repere(b, ancreAuMilieu(v.repere.x, v.repere.a, v.nomVT.length, 6, 0.3), v.repere.y);   // 6 et 0,3 : le corps du repère d'une barrette à poser (poserReperesVT)
    if (!v.nomVT) remarques.push('une barrette à poser sans repère');
    blocs.push(b); if (v.nomVT) vts.set(v.nomVT, { b, v });
    bs.forEach(p => borne(b, { Borne: String(p.n), Numero: String(p.n) }, v.x, p.y, v.x, p.y, null, R_PASTILLE(String(p.n)))); });

  /* ---- les fils : chaque liaison du folio, dans son ordre ---------------------------------------------------------- */
  const ici = new Map();
  accroches.forEach(a => { const k2 = cle(a.ux, a.uy); (ici.get(k2) || ici.set(k2, []).get(k2)).push(a); });
  const aPoint = (p, rep) => { const xs = ici.get(cle(p.x, p.y)) || []; return xs.find(a => a.r.Repere === rep) || xs[0] || null; };
  // un bout sans tracé (un pontage) : la borne de ce repère et de cette étiquette, à la hauteur du bout
  const aBorne = (rep, etiq, ep) => { const xs = accroches.filter(a => a.r.Repere === rep && a.r.Borne === String(etiq == null ? '' : etiq)); if (!ep) return xs[0] || null;
    return xs.find(a => Math.abs(a.uy - ep.y) < 0.01 && a.bloc._c && ep.x >= a.bloc._c.x - 0.01 && ep.x <= a.bloc._c.x + a.bloc._c.w + 0.01) || xs.find(a => Math.abs(a.uy - ep.y) < 0.01) || xs[0] || null; };
  const parI = new Map(); dessin.fils.forEach(w => parI.set(w.i, w));
  const numeros = numerosDuSvg(svg), pris = new Set();
  const numeroDe = (nom, pts) => { let best = null, dmin = Infinity;
    numeros.forEach((n, j) => { if (pris.has(j) || n.nom !== nom) return; const d = distanceAuTrace(n, pts); if (d < dmin) { dmin = d; best = j; } });
    if (best == null) return null; pris.add(best); return numeros[best]; };
  const contacts = typeof infos.contactDe === 'function' ? infos.contactDe : null;
  const fils = [], liens = [];   // liens : chaque bout de fil posé, et l'accroche (la ligne de Bornes) qu'il cite
  L.forEach((l, i) => { const w = parI.get(i), num = String(l.cable || '').trim();
    const f = { Folio: F, Ordre: fils.length + 1, Fil: num || null, DeBloc: null, DeRepere: l.de, DeBorne: l.borneDe, VersBloc: null, VersRepere: l.vers, VersBorne: l.borneVers,
      DeCote: null, VersCote: null, Type: l.type || null, Jauge: jaugeDuType(l.type), Blinde: blindeDuType(l.type) ? 'O' : 'N', Route: l.route || null,
      Couleur: (dessin.couleurDe && dessin.couleurDe({ i })) || null, Longueur: l.longueur > 0 ? Math.round(l.longueur * 1000) / 1000 : null, Shunt: 'N', Points: [], NumeroX: null, NumeroY: null, NumeroAngle: null, DeRond: null, VersRond: null };
    fils.push(f); let sertir;   // le contact à sertir des deux bouts, demandé une fois
    const poser = (bout, a, attendu) => { if (!a) { remarques.push('fil ' + (num || f.Ordre) + ' : borne ' + attendu + ' introuvable'); return; }
      f[bout + 'Bloc'] = a.r.Bloc; f[bout + 'Repere'] = a.r.Repere; f[bout + 'Borne'] = a.r.Borne; liens.push({ f, bout, a });
      if (a.r.Connecteur === 'FICHE' || a.r.Connecteur === 'EMBASE') f[bout + 'Cote'] = a.r.Connecteur;
      if (a.r.Repere !== attendu) remarques.push('fil ' + (num || f.Ordre) + ' : accroché à ' + a.r.Repere + ' au lieu de ' + attendu);
      const voulu = String((bout === 'De' ? l.borneDe : l.borneVers) || '');
      if (a.r.Borne !== voulu && a.r.Repere === attendu) { if (a.bloc.Nature === 'RAIL' || a.bloc.Nature === 'MASSE') { a.r.Borne = voulu; a.r.Numero = voulu || null; f[bout + 'Borne'] = voulu; }
        else remarques.push('fil ' + (num || f.Ordre) + ' : part de la borne ' + a.r.Borne + ' de ' + a.r.Repere + ' (le contrat dit ' + voulu + ')'); }
      if (contacts) { if (sertir === undefined) sertir = contacts(l) || null; const x = sertir && sertir[bout === 'De' ? 'de' : 'vers']; if (x && (x.contact || x.sexe)) { a.r.Contact = x.contact || a.r.Contact; a.r.Sexe = x.sexe || a.r.Sexe; } } };
    const vt = !w && VT_A_POSER.test(l.vers) && l.borneVers === '1' && !VT_A_POSER.test(l.de) ? vts.get(l.vers) : null;
    if (w && w.pts && w.pts.length >= 2) {
      // un fil tracé : ses deux bouts sont des accroches ; un bout posé sur un autre fil (une jonction) est prolongé jusqu'à sa borne
      let pts = w.pts.map(p => ({ x: p.x, y: p.y }));
      const bout = (p, ep, rep, etiq) => { const a = aPoint(p, rep); if (a) return { a };
        const b = aBorne(rep, etiq, ep) || aPoint(ep, rep); if (!b) return { a: null };
        remarques.push('fil ' + (num || f.Ordre) + ' : tracé prolongé de sa jonction jusqu’à ' + rep + ':' + b.r.Borne);
        const q = { x: b.ux, y: b.uy }; return { a: b, ajout: q.x === p.x || q.y === p.y ? [q] : [q, { x: p.x, y: q.y }] }; };
      const A = bout(pts[0], w.epA, l.de, l.borneDe), B = bout(pts[pts.length - 1], w.epB, l.vers, l.borneVers);
      if (A.ajout) pts = [...A.ajout, ...pts]; if (B.ajout) pts = [...pts, ...B.ajout.slice().reverse()];
      poser('De', A.a, l.de); poser('Vers', B.a, l.vers);
      f.Points = pts.map(p => [X(p.x), Y(p.y)]);
      if (num) { const n = numeroDe(num, w.pts); if (n) { f.NumeroX = X(n.x); f.NumeroY = Y(n.y); f.NumeroAngle = n.angle; } } }
    else if (w && w.shunt) { f.Shunt = 'O'; poser('De', aBorne(w.de, w.borneDe, w.epA), l.de); poser('Vers', aBorne(w.vers, w.borneVers, w.epB), l.vers); }
    else if (vt && (dessin.barrettes || []).raccords) {
      // le fil À CRÉER, de la borne dédoublée à la borne 1 de sa barrette à poser : le raccord que 05 trace
      const r = vt.v.raccord, a = r ? aPoint({ x: r.x0, y: r.y }, l.de) : null, b2 = r ? aPoint({ x: r.x1, y: r.y }, l.vers) : null;
      poser('De', a, l.de); poser('Vers', b2, l.vers); if (r) f.Points = [[X(r.x0), Y(r.y)], [X(r.x1), Y(r.y)]]; }
    else if (l.de === l.vers && vts.has(l.de)) {
      // les bornes d'une barrette à poser sont pontées : des pontages, sans tracé
      f.Shunt = 'O'; const { b } = vts.get(l.de), ab = e => accroches.find(a => a.bloc === b && a.r.Borne === String(e)) || borneManquante(b, e);
      poser('De', ab(l.borneDe), l.de); poser('Vers', ab(l.borneVers), l.vers); }
    else { f.Shunt = l.de === l.vers ? 'O' : 'N'; remarques.push('liaison ' + (num || f.Ordre) + ' (' + l.de + ':' + l.borneDe + ' → ' + l.vers + ':' + l.borneVers + ') non dessinée'); } });
  // une borne de barrette à poser que le dessin a fondue dans une autre (deux bornes à la même hauteur) : elle existe au contrat
  function borneManquante(b, etiq) { const v = [...vts.values()].find(x => x.b === b).v, a1 = accroches.find(a => a.bloc === b && a.r.Borne === '1');
    const a = borne(b, { Borne: String(etiq), Numero: String(etiq) }, v.x, a1 ? a1.uy : v.py, v.x, a1 ? a1.uy : v.py, null, R_PASTILLE(String(etiq)));
    remarques.push('borne ' + etiq + ' de ' + b.Repere + ' confondue avec la borne 1 sur le dessin'); return a; }
  blocs.forEach(b => { delete b._c; });
  /* Les contacts qui restaient à lire dans le fil : une pastille de barrette à poser, où le tracé finit en son centre. Le
     contact est au bord, du côté d'où vient le fil (son avant-dernier point, s'il arrive couché et de plus loin que le
     bord) ; sinon, au centre. */
  liens.forEach(({ f, bout, a }) => { if (a.cx != null || !a.rayon || f.Points.length < 2) return;
    const P = f.Points, [p, q] = bout === 'De' ? [P[0], P[1]] : [P[P.length - 1], P[P.length - 2]];
    if (Math.abs(q[1] - p[1]) < 0.011 && Math.abs(q[0] - p[0]) > D(a.rayon)) a.cx = bordDePastille(a.ux, a.rayon, q[0] - p[0]); });
  accroches.forEach(a => { a.r.CX = X(a.cx != null ? a.cx : a.ux); a.r.CY = Y(a.uy); });
  // les ronds d'une même borne (une borne de barrette qui reçoit plusieurs fils : un rond par fil), numérotés de haut en bas ; chaque fil cite le sien
  const memes = new Map();
  bornes.forEach(r => { const k = r.Bloc + '|' + r.Borne + '|' + (r.Connecteur || ''); (memes.get(k) || memes.set(k, []).get(k)).push(r); });
  memes.forEach(rs => { if (rs.length > 1) rs.slice().sort((u, v) => u.Y - v.Y || u.X - v.X).forEach((r, i) => { r.Rond = i + 1; }); });
  liens.forEach(({ f, bout, a }) => { f[bout + 'Rond'] = a.r.Rond; });

  const fl = dessin.fils.filter(w => !w.shunt);
  const cadre = PAGE_CADRE + PAGE_MARGE;
  const harness = [...new Set(L.map(l => l.harness).filter(Boolean))], c = infos.cartouche || {};
  const folio = { Folio: F, Plan: infos.plan == null || infos.plan === '*' ? null : String(infos.plan), Nom: nomDeFolioSEE(infos.plan === '*' ? '' : infos.plan, F), Harness: harness.length === 1 ? harness[0] : null,
    Titre: c.titre || null, Indice: c.indice || null, Dessine: c.auteur || null, Date: c.date || null, Echelle: Math.round(k * 10000) / 10000, Pas: D(PRH),
    CadreX: centieme(cadre * SEE_UNITE), CadreY: centieme(cadre * SEE_UNITE), CadreL: centieme((PAGE_W - 2 * cadre) * SEE_UNITE), CadreH: centieme((PAGE_H - 2 * cadre - PAGE_CARTOUCHE) * SEE_UNITE),
    NbBlocs: blocs.length, NbBornes: bornes.length, NbFils: fils.length, Droits: compterDroits(fl), Croisements: compterCroisements(fl, dessin.barrettes || []),
    Remarque: [...new Set(remarques)].join(' ; ') || null };
  return { folio, blocs, connecteurs, bornes, fils,
    jonctions: (dessin.points || []).map(p => ({ Folio: F, X: X(p.x), Y: Y(p.y) })),
    legende: (dessin.legende || []).map(r => ({ Folio: F, Route: r.route || null, Couleur: r.couleur || null, NbFils: r.n })) };
}

/* ---- LE CLASSEUR ----------------------------------------------------------
   classeurSEE(modeles, meta) → un classeur SheetJS (global XLSX) : Paquet, puis une feuille par sorte de rangée, les
   colonnes du contrat dans son ordre, l'en-tête en ASCII. Une cellule vide dit « inconnu » ; les nombres sont de vrais
   nombres. `meta` : { fichier, contrat (le titre du cartouche), date (ISO), version (du moteur) }. */
function lignesSEE(modeles) { const out = { Folios: [], Blocs: [], Connecteurs: [], Bornes: [], Fils: [], Jonctions: [], Legende: [] };
  modeles.forEach(m => { out.Folios.push(m.folio); out.Blocs.push(...m.blocs); out.Connecteurs.push(...m.connecteurs); out.Bornes.push(...m.bornes);
    out.Fils.push(...m.fils.map(f => ({ ...f, Points: f.Points.length ? f.Points.map(p => p[0] + ' ' + p[1]).join('|') : null }))); out.Jonctions.push(...m.jonctions); out.Legende.push(...m.legende); });
  return out; }
function enteteSEE(modeles, meta) { meta = meta || {};
  return [['format', SEE_FORMAT], ['outil', 'Atelier Schéma'], ['version_moteur', meta.version || (typeof VERSION_MOTEUR !== 'undefined' ? VERSION_MOTEUR : '')],
    ['date', meta.date || new Date().toISOString()], ['fichier', meta.fichier || ''], ['contrat', meta.contrat || ''], ['folios', modeles.length],
    ['unite', 'mm'], ['origine', 'haut-gauche'], ['axe_y', 'bas'], ['feuille_l', PAGE_W * SEE_UNITE], ['feuille_h', PAGE_H * SEE_UNITE]]; }
function classeurSEE(modeles, meta) {
  const wb = XLSX.utils.book_new(), lignes = lignesSEE(modeles);
  const feuille = (nom, aoa) => { const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = aoa[0].map((_, j) => ({ wch: Math.min(48, Math.max(6, ...aoa.slice(0, 200).map(r => r[j] == null ? 0 : String(r[j]).length + 1))) }));
    XLSX.utils.book_append_sheet(wb, ws, nom); };
  feuille('Paquet', [['Cle', 'Valeur'], ...enteteSEE(modeles, meta)]);
  Object.keys(SEE_COLONNES).forEach(nom => { const cols = SEE_COLONNES[nom];
    feuille(nom, [cols, ...lignes[nom].map(r => cols.map(c => r[c] == null || r[c] === '' ? null : r[c]))]); });
  return wb; }

/* ===========================================================================
   L'INTERFACE : « Exporter pour SEE » (menu)
   ---------------------------------------------------------------------------
   Une fiche sobre : le paquet SEE (.xlsx, pour le classeur pilote) ou le DXF
   (le repli, 08-dxf : un dessin par folio, en un zip) ; tous les folios ou
   celui-ci ; l'avancement folio par
   folio — une case par folio, qui s'allume quand il est fait (ambre s'il a
   fallu simplifier, rouge s'il n'a pas pu se dessiner) — ; puis le
   téléchargement « paquet-see-<nom>.xlsx ». Chaque folio part tel qu'on le
   voit : la retouche gardée, sinon le dessin affiné, sinon celui du
   concours. Un folio jamais placé se place par le mécanisme de la page —
   au loin, dans le Worker, quand la page le fait (08, `demanderPlacement`),
   ici sinon (un petit folio : bien moins d'une seconde) — ; la main revient
   à l'écran entre deux folios.
   =========================================================================== */
const EXPORT_SEE = { encours: null, portee: 'tous', format: 'paquet', dernier: null };
const pauseSEE = ms => new Promise(ok => setTimeout(ok, ms || 0));
/* CE QUE LE BOUTON FERAIT. La portée choisie reste celle du technicien ; un contrat d'un seul folio n'a que « ce folio »
   (sans toucher au choix : le contrat suivant le retrouve). Le bilan d'un export (`dernier`) ne se montre que s'il dit
   ce que le bouton referait : le même contrat, le même fichier, les mêmes folios — sinon la fiche annonce l'export à
   venir, pas un fichier d'un autre contrat ou d'un autre folio. */
const porteeSEE = () => plans().length > 1 ? EXPORT_SEE.portee : 'folio';
const cibleSEE = (format, liste) => [app.nom || '', format, ...liste.map(f => f.cle)].join('\u0001');
const bilanSEE = () => { const d = EXPORT_SEE.dernier;
  return d && d.contrat === app.contrat && d.cible === cibleSEE(EXPORT_SEE.format, foliosPourSEE(porteeSEE())) ? d : null; };
// le dessin qu'on voit d'un folio, s'il existe déjà : la retouche, sinon l'affiné, sinon le placement gardé (comme placementDe)
function placementVu(L) { const cle = clePlacement(L); return app.retouches.get(cle) || affinage.profonds.get(cle) || placements.get(cle) || null; }
async function placementPourSEE(plan, L, x) { let P = placementVu(L); if (P) return P;
  const cle = clePlacement(L);
  if (plan !== '*' && placement.ailleurs && placement.worker !== false && L.length > SEUIL_ICI && (placement.attentes.has(cle) || demanderPlacement(cle, L, plan))) {
    x.etape = 'le moteur le place au loin'; montrerExportSEE();
    while (placement.attentes.has(cle)) { await pauseSEE(150); if (x.arret) return null; P = placementVu(L); if (P) return P; }
    P = placementVu(L); if (P) return P; }
  x.etape = 'placement'; montrerExportSEE(); await pauseSEE(30);
  P = meilleurPlacement(L); garderPlacement(cle, P); return P; }
/* Le contact à sertir de chaque bout d'un fil, tel que les fiches le donnent (08 sexies, `sertirDuFil`) — les plans d'un
   repère se calculent une fois par export. */
function contactsPourSEE() { const parRepere = new Map();
  const plansDe = rep => { if (parRepere.has(rep)) return parRepere.get(rep); let Q = [];
    try { Q = coupureEnModules(rep) ? [planDeCoupure(rep).plan] : barretteEnModules(rep) ? [planDeBarrette(rep).plan] : cavitesDe(rep).map(c => c.plan); } catch (_) { Q = []; }
    parRepere.set(rep, Q); return Q; };
  const bout = (rep, l) => { if (!rep || VT_A_POSER.test(rep) || estMasse(rep) || estRenvoi(rep)) return null;
    for (const Q of plansDe(rep)) { const x = (Q.fils || []).find(y => y.f.l === l); if (x) return { contact: x.sertir ? motSertir(x.sertir) : '', sexe: x.sexe || '' }; }
    return null; };
  return l => { const o = l.origine || l; return { de: l.de === o.de ? bout(o.de, o) : null, vers: l.vers === o.vers ? bout(o.vers, o) : null }; }; }
/* Les folios à exporter : { cle, plan, rang } — `cle` celle de `liaisonsDe` ('*' : le contrat d'un seul dessin, tel que la
   page l'affiche), `plan` la valeur FWD qui nomme le folio, `rang` sa place dans le contrat (le nom d'un DXF la porte). */
function foliosPourSEE(portee) { const P = plans();
  if (portee === 'folio' || P.length <= 1) { const cle = P.length ? app.plan : '*'; return [{ cle, plan: cle === '*' ? (P.length === 1 ? P[0] : null) : cle, rang: Math.max(1, P.indexOf(cle) + 1) }]; }
  return P.map((p, i) => ({ cle: p, plan: p, rang: i + 1 })); }
/* LE CLASSEUR S'ÉCRIT AU LOIN : huit cents folios font un classeur de quinze mégaoctets, une quinzaine de secondes de
   calcul (mesurées sous Node) qui figeraient l'écran. Un Worker reçoit chaque folio dès qu'il est relu et écrit le
   classeur à la fin : SheetJS (relu dans son <script> de la page) et les trois fonctions du classeur, telles quelles.
   Sans Worker, le classeur s'écrit ici. */
function ecrivainSEE() { try {
    const lib = [...document.scripts].find(s => s.textContent.trimStart().startsWith('/*! xlsx.js'));
    if (!lib || typeof Worker === 'undefined') return null;
    const code = lib.textContent + `\nconst SEE_FORMAT = ${JSON.stringify(SEE_FORMAT)}, SEE_UNITE = ${SEE_UNITE}, SEE_COLONNES = ${JSON.stringify(SEE_COLONNES)}, PAGE_W = ${PAGE_W}, PAGE_H = ${PAGE_H};\n${lignesSEE}\n${enteteSEE}\n${classeurSEE}\n`
      + `const modeles = []; self.onmessage = e => { const d = e.data; if (d.modele) { modeles.push(d.modele); return; }
        try { const octets = XLSX.write(classeurSEE(modeles, d.meta), { type: 'array', bookType: 'xlsx', compression: true }); postMessage({ octets }, [octets]); }
        catch (err) { postMessage({ erreur: String((err && err.message) || err) }); } };`;
    const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' })), w = new Worker(url);
    return { w, url, envoyer: m => { try { w.postMessage({ modele: m }); } catch (_) { w.casse = true; } }, fin: () => { w.terminate(); URL.revokeObjectURL(url); } }; }
  catch (_) { return null; } }
const metaSEE = () => ({ fichier: app.nom || '', contrat: app.contrat.cartouche.titre || '', version: VERSION_MOTEUR, date: new Date().toISOString() });
async function octetsSEE(x, ecrivain) { const meta = metaSEE();
  if (ecrivain && !ecrivain.w.casse) { const r = await new Promise(ok => { ecrivain.w.onmessage = e => ok(e.data); ecrivain.w.onerror = () => ok({ erreur: 'Worker' }); ecrivain.w.postMessage({ ecrire: true, meta }); });
    if (r.octets) return r.octets; }
  return XLSX.write(classeurSEE(x.modeles, meta), { type: 'array', bookType: 'xlsx', compression: true }); }
async function exporterSEE(portee, format) { if (EXPORT_SEE.encours) return;
  if (!verite().length) { dire('Rien à exporter : dépose d’abord un fichier.'); return; }
  const liste = foliosPourSEE(portee), dxf = (format || EXPORT_SEE.format) === 'dxf';
  const x = EXPORT_SEE.encours = { liste, portee: liste.length > 1 ? 'tous' : 'folio', format: dxf ? 'dxf' : 'paquet', total: Math.max(1, plans().length), dxf: [],
    contrat: app.contrat, cible: cibleSEE(dxf ? 'dxf' : 'paquet', liste),
    i: 0, etats: liste.map(() => ''), modeles: [], fils: 0, t0: performance.now(), etape: '', arret: false, fin: null };
  // le DXF d'un folio s'écrit dès qu'il est relu (au plus quelques dizaines de millisecondes) ; le classeur, lui, au loin (`ecrivainSEE`)
  const routes = couleursDesRoutes(), cartouche = { ...app.contrat.cartouche }, designations = new Map(app.contrat.designations), contactDe = contactsPourSEE(), ecrivain = dxf ? null : ecrivainSEE();
  try { montrerExportSEE();
    for (; x.i < liste.length && !x.arret; x.i++) { const { cle, plan } = liste[x.i]; x.etats[x.i] = 'encours'; x.etape = ''; montrerExportSEE(); await pauseSEE();
      try { const L = liaisonsDe(cle); if (!L.length) { x.etats[x.i] = 'vide'; continue; }
        const Pl = await placementPourSEE(cle, L, x); if (!Pl) { x.etats[x.i] = x.arret ? '' : 'ko'; continue; }
        x.etape = 'relecture du dessin'; montrerExportSEE(); await pauseSEE();
        const m = modeleSEE(dessinDuPlacement(Pl, L, routes), L, { folio: x.modeles.length + 1, plan, cartouche, designations, contactDe });
        x.modeles.push(m); x.fils += m.fils.length; x.etats[x.i] = m.folio.Remarque ? 'att' : 'ok';
        // le DXF du folio tout de suite, son CRC aussi : le zip de la fin ne fait plus que les mettre bout à bout
        if (dxf) { const rang = x.liste[x.i].rang, octets = octetsCp1252(dxfDuFolio(m, { total: x.total, rang, echelle: cartouche.echelle })); x.dxf.push({ nom: nomDuDxf(m, rang, x.total), octets, crc: crc32(octets) }); }
        else if (ecrivain) ecrivain.envoyer(m); }
      catch (e) { x.etats[x.i] = 'ko'; x.erreur = String((e && e.message) || e); } }
    x.etape = ''; x.fin = performance.now();
    if (!x.arret && x.modeles.length && dxf) {
      // un folio : son DXF ; plusieurs : un zip « stocké », assemblé morceau par morceau (le Blob ne recopie rien)
      x.etape = 'écriture du zip'; montrerExportSEE(); await pauseSEE(30);
      telecharger(x.dxf.length === 1 ? new Blob([x.dxf[0].octets], { type: 'application/dxf' }) : new Blob(partiesZip(x.dxf, new Date()), { type: 'application/zip' }), x.nom = nomDuPaquetSEE(x));
      dire((x.dxf.length > 1 ? 'DXF enregistrés : ' : 'DXF enregistré : ') + pluriel(x.dxf.length, 'folio') + ', ' + pluriel(x.fils, 'fil') + '.'); }
    else if (!x.arret && x.modeles.length) { x.etape = 'écriture du classeur'; montrerExportSEE(); await pauseSEE(30);
      const octets = await octetsSEE(x, ecrivain);
      telecharger(new Blob([octets], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), x.nom = nomDuPaquetSEE(x));
      dire('Paquet SEE enregistré : ' + pluriel(x.modeles.length, 'folio') + ', ' + pluriel(x.fils, 'fil') + '.'); }
    else if (x.arret) dire('Export pour SEE arrêté : rien n’est enregistré.'); }
  catch (e) { x.erreur = String((e && e.message) || e); dire((dxf ? 'Les DXF n’ont' : 'Le paquet SEE n’a') + ' pas pu s’écrire : ' + x.erreur, true); }
  finally { if (ecrivain) ecrivain.fin(); x.etape = ''; x.fin = x.fin || performance.now(); EXPORT_SEE.dernier = x; EXPORT_SEE.encours = null; montrerExportSEE(); } }
/* Le fichier : « paquet-see-<contrat>[-folio-<plan>].xlsx » ; en DXF, « NN.<nom du folio>.dxf » pour un seul folio (le nom
   que SEE lit), « dxf-see-<contrat>.zip » pour plusieurs. */
function nomDuPaquetSEE(x) { const p = x.liste[0].plan;
  if (x.format === 'dxf') { if (x.dxf && x.dxf.length === 1) return x.dxf[0].nom; const f = x.liste[0];
    return x.liste.length === 1 ? nomDuDxf({ folio: { Folio: f.rang, Nom: nomDeFolioSEE(f.plan, f.rang) } }, f.rang, x.total || plans().length) : 'dxf-see-' + nomContrat() + '.zip'; }
  return 'paquet-see-' + nomContrat() + (x.portee === 'folio' && p && plans().length > 1 ? '-folio-' + nomAscii(String(p)) : '') + '.xlsx'; }
const nomPrevuSEE = () => { const liste = foliosPourSEE(porteeSEE()); return nomDuPaquetSEE({ liste, portee: liste.length > 1 ? 'tous' : 'folio', format: EXPORT_SEE.format, total: plans().length }); };
function ficheSEE() { if (!verite().length) { dire('Rien à exporter : dépose d’abord un fichier.'); return; }
  const P = plans(), n = Math.max(1, P.length), ici = !P.length || app.plan === '*' ? '' : app.plan, portee = porteeSEE();
  const puce = (v, t) => `<button class="fi-chip" data-portee="${v}" aria-pressed="${portee === v}">${t}</button>`;
  const sorte = (v, t) => `<button class="fi-chip" data-format="${v}" aria-pressed="${EXPORT_SEE.format === v}">${t}</button>`;
  const corps = tete('Le dessin', 'Exporter pour SEE', true)
    + (EXPORT_SEE.format === 'dxf'
      ? `<p class="note">Le <b>DXF</b> : un dessin par folio, tel qu’il est dessiné ici — fils, bornes, connecteurs, repères, en millimètres sur la feuille A3, rangés sur dix calques, chaque borne un bloc nommé qui porte son repère et son numéro. SEE Electrical Expert importe un dossier de DXF d’un coup : c’est le repli quand le classeur pilote ne peut pas le commander.</p>`
      : `<p class="note">Le <b>paquet SEE</b> : un classeur qui décrit chaque folio tel qu’il est dessiné ici — blocs, connecteurs, bornes, fils et leur tracé, en millimètres sur la feuille A3. Le classeur pilote le dessine dans SEE Electrical Expert.</p>`)
    + `<div class="se-portee" role="group" aria-label="Quel fichier">${sorte('paquet', 'Paquet SEE · .xlsx')}${sorte('dxf', 'DXF · un fichier par folio')}</div>`
    + `<div class="se-portee" role="group" aria-label="Quels folios">${n > 1 ? puce('tous', 'Tous les folios · ' + n) : ''}${puce('folio', ici ? 'Ce folio · ' + esc(clip(ici, 18)) : 'Le folio')}</div>`
    + `<div id="se-avance" class="se-avance"></div>`;
  ouvrirFiche({ mode: 'see' }, corps, '<button class="btn cuivre" id="se-go">Exporter</button><span class="se-nom" id="se-nom"></span>');
  // changer de portée ou de fichier : la fiche annonce le nouvel export (le bilan du précédent ne se montre plus, `bilanSEE`)
  $('fiche-corps').querySelectorAll('[data-portee]').forEach(b => b.onclick = () => { if (EXPORT_SEE.encours || n <= 1 || EXPORT_SEE.portee === b.dataset.portee) return; EXPORT_SEE.portee = b.dataset.portee; ficheSEE(); });
  $('fiche-corps').querySelectorAll('[data-format]').forEach(b => b.onclick = () => { if (EXPORT_SEE.encours || EXPORT_SEE.format === b.dataset.format) return; EXPORT_SEE.format = b.dataset.format; ficheSEE(); });
  $('se-go').onclick = () => { if (EXPORT_SEE.encours) { EXPORT_SEE.encours.arret = true; montrerExportSEE(); } else exporterSEE(porteeSEE(), EXPORT_SEE.format); };
  montrerExportSEE(); }
/* L'avancement : une case par folio (à faire, en cours qui respire, fait, simplifié, pas dessiné), la ligne du folio en
   cours, trois chiffres, et ce qu'il a fallu simplifier. Le squelette se pose une fois par export ; chaque pas ne touche
   que ce qui change (huit cents cases ne se refont pas à chaque folio, une liste dépliée le reste). */
const ETATS_SEE = { ok: 'exporté', att: 'exporté, simplifié', ko: 'pas dessiné', vide: 'vide', encours: 'en cours' };
function montrerExportSEE() { const el = $('se-avance'); if (!el || !app.fiche || app.fiche.mode !== 'see') return;
  const x = EXPORT_SEE.encours || bilanSEE(), go = $('se-go'), nom = $('se-nom');
  if (go) { go.textContent = EXPORT_SEE.encours ? (EXPORT_SEE.encours.arret ? 'Arrêt…' : 'Arrêter') : x && x.nom ? 'Exporter à nouveau' : 'Exporter'; go.className = 'btn ' + (EXPORT_SEE.encours ? 'papier' : 'cuivre'); }
  $('fiche-corps').querySelectorAll('[data-portee], [data-format]').forEach(b => { b.disabled = !!EXPORT_SEE.encours; });
  if (!x) { el.hidden = true; if (nom) nom.textContent = nomPrevuSEE(); return; }
  el.hidden = false; if (nom) nom.textContent = x.nom || nomDuPaquetSEE(x);
  const nomF = f => f.plan ? 'Folio ' + f.plan : 'Le dessin';
  if (el.__x !== x) { el.__x = x;
    el.innerHTML = `<div class="se-cases" role="img">${x.liste.map(f => `<i class="afaire" title="${escA(nomF(f) + ' — à faire')}"></i>`).join('')}</div>`
      + '<p class="se-ligne" aria-live="polite"></p><div class="fi-tuiles"></div><div class="se-bilan"></div>'; }
  const faits = x.etats.filter(e => e === 'ok' || e === 'att').length, att = x.etats.filter(e => e === 'att').length, ko = x.etats.filter(e => e === 'ko').length;
  const boite = el.querySelector('.se-cases'), cases = boite.children;
  x.etats.forEach((e, i) => { const c = e || 'afaire'; if (cases[i] && cases[i].className !== c) { cases[i].className = c; cases[i].title = nomF(x.liste[i]) + ' — ' + (ETATS_SEE[e] || 'à faire'); } });
  boite.setAttribute('aria-label', faits + ' folio' + (faits > 1 ? 's' : '') + ' exporté' + (faits > 1 ? 's' : '') + ' sur ' + x.liste.length);
  // la durée tient dans sa tuile : « 42 s », « 3 min 07 s », « 1 h 05 min » (le reste en petit)
  const s = Math.round(((x.fin || performance.now()) - x.t0) / 1000), sur = t => '<span class="se-sur">\u00a0' + t + '</span>';
  const duree = s < 60 ? s + '\u00a0s' : s < 3600 ? Math.floor(s / 60) + '\u00a0min' + sur(String(s % 60).padStart(2, '0') + '\u00a0s') : Math.floor(s / 3600) + '\u00a0h' + sur(String(Math.floor(s / 60) % 60).padStart(2, '0') + '\u00a0min');
  const cour = EXPORT_SEE.encours ? x.liste[Math.min(x.i, x.liste.length - 1)] : null;
  el.querySelector('.se-ligne').innerHTML = EXPORT_SEE.encours ? (x.arret ? 'Arrêt après ce folio…' : `${esc(clip(nomF(cour), 30))} · ${Math.min(x.i + 1, x.liste.length)} / ${x.liste.length}${x.etape ? ' — ' + esc(x.etape) : ''}`)
    : x.arret ? 'Arrêté : rien n’est enregistré.' : x.nom ? `Enregistré : <span class="id">${esc(x.nom)}</span>` : x.modeles.length ? (x.format === 'dxf' ? 'Les DXF n’ont pas pu s’écrire.' : 'Le classeur n’a pas pu s’écrire.') : 'Aucun folio n’a pu se dessiner.';
  const tuile = (v, t) => `<div class="fi-tuile"><b>${v}</b><span>${t}</span></div>`;
  el.querySelector('.fi-tuiles').innerHTML = tuile(faits + (x.liste.length > 1 ? '<span class="se-sur">\u00a0/\u00a0' + x.liste.length + '</span>' : ''), x.liste.length > 1 ? 'folios' : 'folio') + tuile(x.fils, 'fils') + tuile(duree, 'de calcul');
  const remarques = x.modeles.filter(m => m.folio.Remarque).map(m => `<li class="fi-att"><b>${esc(m.folio.Nom)}</b> · ${esc(m.folio.Remarque)}</li>`).join('');
  const bilan = att || ko || x.erreur ? `<details class="fi-etat ${ko || x.erreur ? 'ko' : 'att'}"><summary><i></i><span>${[att ? pluriel(att, 'folio') + ' simplifié' + (att > 1 ? 's' : '') : '', ko ? pluriel(ko, 'folio') + ' pas dessiné' + (ko > 1 ? 's' : '') : '', x.erreur && !ko ? 'une erreur' : ''].filter(Boolean).join(' · ')}</span></summary><ul>${remarques}${x.erreur ? `<li>${esc(x.erreur)}</li>` : ''}</ul></details>` : '';
  const b = el.querySelector('.se-bilan'); if (b.__html !== bilan) { const ouvert = !!(b.querySelector('details') || {}).open; b.innerHTML = b.__html = bilan; if (ouvert && b.querySelector('details')) b.querySelector('details').open = true; } }
