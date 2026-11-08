/* ===========================================================================
   DOCUMENT C — le même schéma, comme un dessinateur l'aurait fait dans Visio
   ---------------------------------------------------------------------------
   Un .vsdx valide (un zip d'XML selon MS-VSDX), écrit d'une autre main que
   celle de VOLTA (src/09-visio.js) : un GABARIT de maîtres (disjoncteur, masse,
   renvoi de page « Off-page reference », point de jonction, connecteur
   dynamique) ; chaque équipement un GROUPE dessiné à la main (sa boîte, ses
   textes, ses points de connexion) ; chaque fil un connecteur dynamique COLLÉ
   aux deux points (Connects et formules PAR(PNT(…))). Les habitudes d'un vrai
   dessinateur, mêlées comme dans la vie :
     · des points de connexion sans nom, le numéro de broche écrit à côté dans
       un texte ; d'autres nommés par la broche (« A1 ») ; un connecteur lettré
       dont les points disent « 12 » et la lettre « A » est un texte ;
     · un disjoncteur : une boîte, son symbole dedans (des lignes, pas des
       fils), ses points « 1 » et « 2 » ;
     · une barrette en pastilles sur un pointillé (la plage de métal commune,
       une ligne en tirets dans le groupe), dont les points disent « 51A » ;
       une autre dont les points disent seulement « A » (le module « 51 »
       écrit au-dessus) ;
     · le numéro de fil écrit sur le connecteur, là où le folio l'écrit ;
     · des renvois de page qui portent un lien vers la page d'en face et leurs
       données OPC (leur identifiant, celui de leur vis-à-vis), le texte « F3/B2 » ;
     · quelques traits dessinés à l'outil Ligne, NON collés : posés pile sur le
       point, ou à un millimètre, contre le bord de la boîte ;
     · un T : le fil finit sur un autre fil, un point de jonction posé dessus.
   La vérité est celle du document A (les mêmes fils, les mêmes bornes).
   =========================================================================== */
'use strict';
const { decouper, STYLES, BARRETTE } = require('./schema');

const NS = 'http://schemas.microsoft.com/office/visio/2012/main', NSR = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', REL = 'http://schemas.microsoft.com/visio/2010/relationships/';
const XML = '<?xml version=\'1.0\' encoding=\'utf-8\' ?>\r\n';
const x = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&apos;').replace(/"/g, '&quot;');
const v = n => (typeof n === 'number' ? String(Math.round(n * 1e7) / 1e7) : String(n));
const C = (N, V, F, U) => `<Cell N='${N}' V='${x(v(V))}'${U ? ` U='${U}'` : ''}${F ? ` F='${x(F)}'` : ''}/>`;
const W_IN = 420 / 25.4, H_IN = 297 / 25.4, I = mm => mm / 25.4;
// une page en mm (l'origine en haut à gauche) → des pouces (l'origine en bas à gauche)
const PX = xmm => I(xmm), PY = ymm => I(297 - ymm);
const guid = (k) => '{' + [8, 4, 4, 4, 12].map((n, i) => ((k * 2654435761 + i * 40503) >>> 0).toString(16).padStart(8, '0').slice(0, n).padEnd(n, '0')).join('-').toUpperCase() + '}';

const xform = (px, py, w, h) => `${C('PinX', px)}${C('PinY', py)}${C('Width', w)}${C('Height', h)}${C('LocPinX', w / 2, 'Width*0.5')}${C('LocPinY', h / 2, 'Height*0.5')}${C('Angle', 0)}${C('FlipX', 0)}${C('FlipY', 0)}${C('ResizeMode', 0)}`;
const car = (pt, gras) => `<Section N='Character'><Row IX='0'>${C('Font', 'Calibri')}${C('Color', '#000000')}${C('Style', gras ? 1 : 0)}${C('Size', pt / 72, null, 'PT')}</Row></Section>`;
const para = ha => `<Section N='Paragraph'><Row IX='0'>${C('HorzAlign', ha)}</Row></Section>`;
const marges = () => `${C('LeftMargin', 0, null, 'PT')}${C('RightMargin', 0, null, 'PT')}${C('TopMargin', 0, null, 'PT')}${C('BottomMargin', 0, null, 'PT')}`;
// une géométrie : des polylignes en coordonnées locales (pouces) ; fermée ou non ; un cercle
const geo = (ix, pts, o = {}) => `<Section N='Geometry' IX='${ix}'>${C('NoFill', o.plein ? 0 : 1)}${C('NoLine', 0)}${C('NoShow', 0)}${C('NoSnap', 0)}`
  + pts.map((p, k) => `<Row T='${k ? 'LineTo' : 'MoveTo'}' IX='${k + 1}'>${C('X', p[0])}${C('Y', p[1])}</Row>`).join('') + `</Section>`;
const geoCercle = (ix, cx, cy, r, plein) => `<Section N='Geometry' IX='${ix}'>${C('NoFill', plein ? 0 : 1)}${C('NoLine', plein ? 1 : 0)}${C('NoShow', 0)}${C('NoSnap', 0)}<Row T='Ellipse' IX='1'>${C('X', cx)}${C('Y', cy)}${C('A', cx + r)}${C('B', cy)}${C('C', cx)}${C('D', cy + r)}</Row></Section>`;

/* ---- les maîtres du gabarit ---------------------------------------------------------------------------------------- */
const MAITRES = [
  { id: 1, nom: 'Disjoncteur', xml: `<Shape ID='5' NameU='Disjoncteur' Name='Disjoncteur' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(I(5), I(2.5), I(10), I(5))}${C('LinePattern', 1)}${C('LineWeight', 0.3 / 25.4)}`
      + `${geoCercle(0, I(1.25), I(2.5), I(1.25))}${geoCercle(1, I(8.75), I(2.5), I(1.25))}<Section N='Geometry' IX='2'>${C('NoFill', 1)}${C('NoLine', 0)}${C('NoShow', 0)}<Row T='MoveTo' IX='1'>${C('X', I(1.25))}${C('Y', I(3.75))}</Row><Row T='ArcTo' IX='2'>${C('X', I(8.75))}${C('Y', I(3.75))}${C('A', I(2.4))}</Row></Section>`
      + `<Section N='Connection'><Row IX='0'>${C('X', 0)}${C('Y', I(2.5))}${C('DirX', -1)}${C('DirY', 0)}${C('Type', 0)}${C('Prompt', '1', null, 'STR')}</Row><Row IX='1'>${C('X', I(10))}${C('Y', I(2.5))}${C('DirX', 1)}${C('DirY', 0)}${C('Type', 0)}${C('Prompt', '2', null, 'STR')}</Row></Section></Shape>` },
  { id: 2, nom: 'Masse', xml: `<Shape ID='5' NameU='Masse' Name='Masse' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(I(2), I(1), I(4), I(2))}${C('LineWeight', 0.3 / 25.4)}${C('TxtPinX', I(7))}${C('TxtPinY', I(0.6))}${C('TxtWidth', I(8))}${C('TxtHeight', I(3))}`
      + `${geo(0, [[0, I(2)], [I(4), I(2)]])}${geo(1, [[I(0.7), I(1)], [I(3.3), I(1)]])}${geo(2, [[I(1.4), 0], [I(2.6), 0]])}<Section N='Connection'><Row IX='0'>${C('X', I(2))}${C('Y', I(2))}${C('DirX', 0)}${C('DirY', 1)}${C('Type', 0)}</Row></Section></Shape>` },
  { id: 3, nom: 'Off-page reference', xml: `<Shape ID='5' NameU='Off-page reference' Name='Renvoi de page' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(I(7), I(2.5), I(14), I(5))}${C('LineWeight', 0.3 / 25.4)}`
      + `${geo(0, [[0, 0], [I(11), 0], [I(14), I(2.5)], [I(11), I(5)], [0, I(5)], [0, 0]])}<Section N='Connection'><Row IX='0'>${C('X', 0)}${C('Y', I(2.5))}${C('DirX', -1)}${C('DirY', 0)}${C('Type', 0)}</Row></Section>`
      + `<Section N='User'><Row N='OPCDocID'>${C('Value', 0)}</Row><Row N='OPCPageID'>${C('Value', 0)}</Row><Row N='OPCShapeID'>${C('Value', '', null, 'STR')}</Row><Row N='OPCDPageID'>${C('Value', 0)}</Row><Row N='OPCDShapeID'>${C('Value', '', null, 'STR')}</Row></Section></Shape>` },
  { id: 4, nom: 'Point de jonction', xml: `<Shape ID='5' NameU='Point de jonction' Name='Point de jonction' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(I(0.65), I(0.65), I(1.3), I(1.3))}${C('FillForegnd', '#000000')}${C('FillPattern', 1)}${geoCercle(0, I(0.65), I(0.65), I(0.65), true)}</Shape>` },
  { id: 5, nom: 'Dynamic connector', xml: `<Shape ID='5' NameU='Dynamic connector' Name='Connecteur dynamique' Type='Shape' LineStyle='7' FillStyle='7' TextStyle='7'>${C('PinX', 0)}${C('PinY', 0)}${C('Width', 1)}${C('Height', 0)}${C('BeginX', 0)}${C('BeginY', 0)}${C('EndX', 1)}${C('EndY', 0)}${C('ObjType', 2)}${C('LineWeight', 0.28 / 25.4)}${C('TextBkgnd', '#FFFFFF')}</Shape>` }];

/* ---- une page ------------------------------------------------------------------------------------------------------- */
function pageVisio(scene, k, o) {
  let id = 1; const F = [], CO = [], liens = { pts: new Map() }, maitres = new Set();
  const texte = (s, xmm, ymm, pt, opts = {}) => { const w = Math.max(I(0.62 * pt * 0.3528 * String(s).length + 1), I(3)), h = I(pt * 0.3528 * 1.4), cx = opts.ancre === 'start' ? PX(xmm) + w / 2 : opts.ancre === 'end' ? PX(xmm) - w / 2 : PX(xmm);
    return `<Shape ID='${id++}' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(cx, PY(ymm) + h * 0.32, w, h)}${C('LinePattern', 0)}${C('FillPattern', 0)}${marges()}${car(pt, opts.gras)}${para(opts.ancre === 'start' ? 0 : opts.ancre === 'end' ? 2 : 1)}<Text>${x(s)}</Text></Shape>`; };
  // le cadre, ses zones, le cartouche (des rectangles et des textes)
  F.push(`<Shape ID='${id++}' NameU='Cadre' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(PX((15 + 410) / 2), PY((12 + 287) / 2), I(395), I(275))}${C('LineWeight', 0.5 / 25.4)}${geo(0, [[0, 0], [I(395), 0], [I(395), I(275)], [0, I(275)], [0, 0]])}</Shape>`);
  for (let i = 0; i < 8; i++) F.push(texte(String(i + 1), 15 + (i + 0.5) * 395 / 8, 8.8, 7.4));
  for (let j = 0; j < 6; j++) F.push(texte('ABCDEF'[j], 10.4, 12 + (j + 0.5) * 275 / 6 + 1, 7.4));
  const K = scene.cartouche; F.push(`<Shape ID='${id++}' NameU='Cartouche' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(PX((K.x0 + K.x1) / 2), PY((K.y0 + K.y1) / 2), I(K.x1 - K.x0), I(K.y1 - K.y0))}${C('LineWeight', 0.3 / 25.4)}`
    + [[0, 12], [0, 24]].map(([a, b], i) => geo(i + 1, [[0, I(K.y1 - K.y0 - b)], [I(K.x1 - K.x0), I(K.y1 - K.y0 - b)]])).join('') + geo(0, [[0, 0], [I(K.x1 - K.x0), 0], [I(K.x1 - K.x0), I(K.y1 - K.y0)], [0, I(K.y1 - K.y0)], [0, 0]]) + `</Shape>`);
  const cx = K.x0, cy = K.y0, cases = [[cx, cy, 'TITRE'], [cx, cy + 12, 'N° DE PLAN'], [cx + 75, cy + 12, 'FOLIO'], [cx + 115, cy + 12, 'INDICE'], [cx + 135, cy + 12, 'FAISCEAU'], [cx, cy + 24, 'DESSINÉ'], [cx + 60, cy + 24, 'DATE'], [cx + 115, cy + 24, 'ÉCHELLE']];
  const valeurs = Object.fromEntries(scene.champs);
  cases.forEach(([xx, yy, et]) => { F.push(texte(et, xx + 1.6, yy + 3.4, 5.4, { ancre: 'start' })); F.push(texte(valeurs[et] || '', xx + 1.6, yy + 9, et === 'FOLIO' ? 11 : 9, { ancre: 'start', gras: true })); });
  // les équipements : un groupe chacun
  const sheet = new Map();   // rep → { id, pts: Map(cle → { id (la forme qui porte le point), cell, p (mm) }) }
  for (const e of scene.equipements) { const gid = id++, gx = PX(e.x), gy = PY(e.y + e.h), W = I(e.w), H = I(e.h), loc = (xmm, ymm) => [I(xmm - e.x), I(e.y + e.h - ymm)];
    const pts = new Map(), enfants = [], rows = [], S = { id: gid, pts }; sheet.set(e.rep, S);
    const genre = e.genre, nomme = genre === 'relais' || (e.visio && e.visio.points === 'nommes');
    // une ligne de connexion : sans nom (un texte à côté), nommée, ou à l'invite (Prompt)
    const point = (cle, xmm, ymm, dir, o2 = {}) => { const [lx, ly] = loc(xmm, ymm), n = rows.length;
      const invite = o2.prompt ? C('Prompt', o2.prompt, null, 'STR') : '';
      rows.push(o2.nom ? `<Row N='${x(o2.nom)}'>${C('X', lx)}${C('Y', ly)}${C('DirX', dir)}${C('DirY', 0)}${C('Type', 0)}${invite}</Row>` : `<Row IX='${n}'>${C('X', lx)}${C('Y', ly)}${C('DirX', dir)}${C('DirY', 0)}${C('Type', 0)}${invite}</Row>`);
      pts.set(cle, { id: gid, cell: o2.nom ? `Connections.${o2.nom}` : `Connections.X${n + 1}`, ix: n, p: [xmm, ymm], nom: o2.nom }); };
    const tEnfant = (s, xmm, ymm, pt, o2 = {}) => { const [lx, ly] = loc(xmm, ymm), w = Math.max(I(0.62 * pt * 0.3528 * String(s).length + 0.6), I(2)), h = I(pt * 0.3528 * 1.4), cxx = o2.ancre === 'start' ? lx + w / 2 : o2.ancre === 'end' ? lx - w / 2 : lx;
      const coul = o2.blanc ? car(pt, o2.gras).replace("V='#000000'", "V='#FFFFFF'") : car(pt, o2.gras);
      enfants.push(`<Shape ID='${id++}' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(cxx, ly + h * 0.32, w, h)}${C('LinePattern', 0)}${C('FillPattern', 0)}${marges()}${coul}${para(o2.ancre === 'start' ? 0 : o2.ancre === 'end' ? 2 : 1)}<Text>${x(s)}</Text></Shape>`); };
    const ligneEnfant = (pts, tirets) => { const B = [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))], wmm = Math.max(B[2] - B[0], 0.01), hmm = Math.max(B[3] - B[1], 0.01);
      const [lx, ly] = loc(B[0] + wmm / 2, B[1] + hmm / 2), L = p => [I(p[0] - B[0]), I(B[3] - p[1])];
      enfants.push(`<Shape ID='${id++}' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(lx, ly, I(wmm), I(hmm))}${C('LineWeight', 0.3 / 25.4)}${C('LinePattern', tirets ? 2 : 1)}${geo(0, pts.map(L))}</Shape>`); };
    const pastilleEnfant = (xmm, ymm, rmm) => { const [lx, ly] = loc(xmm, ymm); enfants.push(`<Shape ID='${id++}' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(lx, ly, I(2 * rmm), I(2 * rmm))}${C('FillForegnd', '#000000')}${C('FillPattern', 1)}${geoCercle(0, I(rmm), I(rmm), I(rmm), true)}</Shape>`); };
    const rectEnfant = (xmm, ymm, wmm, hmm) => { const [lx, ly] = loc(xmm + wmm / 2, ymm + hmm / 2); enfants.push(`<Shape ID='${id++}' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(lx, ly, I(wmm), I(hmm))}${C('LineWeight', 0.3 / 25.4)}${C('FillPattern', 0)}${geo(0, [[0, 0], [I(wmm), 0], [I(wmm), I(hmm)], [0, I(hmm)], [0, 0]])}</Shape>`); return id - 1; };
    if (genre === 'disjoncteur') { // un groupe : sa boîte, son symbole dedans (des lignes, pas des fils), ses deux points « 1 » et « 2 »
      const y = e.y + e.dy, c1 = e.x + 5.5, c2 = e.x + e.w - 5.5, r = 1.1;
      rectEnfant(e.x, e.y, e.w, e.h); ligneEnfant([[e.x, y], [c1 - r, y]]); ligneEnfant([[c2 + r, y], [e.x + e.w, y]]);
      [c1, c2].forEach(c => { const [lx, ly] = loc(c, y); enfants.push(`<Shape ID='${id++}' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(lx, ly, I(2 * r), I(2 * r))}${C('LineWeight', 0.3 / 25.4)}${geoCercle(0, I(r), I(r), I(r))}</Shape>`); });
      { const [lx, ly] = loc((c1 + c2) / 2, y - 2); enfants.push(`<Shape ID='${id++}' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(lx, ly, I(c2 - c1), I(2))}${C('LineWeight', 0.3 / 25.4)}<Section N='Geometry' IX='0'>${C('NoFill', 1)}${C('NoLine', 0)}${C('NoShow', 0)}<Row T='MoveTo' IX='1'>${C('X', 0)}${C('Y', I(0.9))}</Row><Row T='ArcTo' IX='2'>${C('X', I(c2 - c1))}${C('Y', I(0.9))}${C('A', I(1.4))}</Row></Section></Shape>`); }
      tEnfant('1', e.x + 1.3, y - 0.8, 6.2, { ancre: 'start' }); tEnfant('2', e.x + e.w - 1.3, y - 0.8, 6.2, { ancre: 'end' });
      point('1:G', e.x, y, -1, { prompt: '1' }); point('2:D', e.x + e.w, y, 1, { prompt: '2' });
      F.push(`<Shape ID='${gid}' NameU='Disjoncteur.${gid}' Name='${x(e.rep)}' Type='Group' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(gx + W / 2, gy + H / 2, W, H)}${C('TxtPinX', I(1.4) + I(9))}${C('TxtPinY', H - I(2.6))}${C('TxtWidth', I(18))}${C('TxtHeight', I(4))}${C('LinePattern', 0)}${C('FillPattern', 0)}${marges()}${car(7.4, true)}${para(0)}`
        + `<Section N='Property'><Row N='Calibre'>${C('Value', e.calibre || '', null, 'STR')}${C('Label', 'Calibre', null, 'STR')}</Row><Row N='Reference'>${C('Value', e.pn || '', null, 'STR')}${C('Label', 'Référence', null, 'STR')}</Row></Section>`
        + `<Section N='Connection'>${rows.join('')}</Section><Text>${x(e.rep)}</Text><Shapes>${enfants.join('')}</Shapes></Shape>`);
      F.push(texte(e.calibre || '', e.x + e.w / 2, e.y + e.h + 3.2, 5.6)); continue; }
    if (genre === 'barrette') { const lettresSeules = !(e.visio && e.visio.prompt === 'module'), cx = e.x + e.w / 2, portee = BARRETTE[STYLES[scene.style].barrette].portee;
      // le pointillé de chaque groupe d'abord (la plage de métal commune), puis les pastilles posées dessus
      (scene.peignes || []).filter(P => P.rep === e.rep).forEach(P => { const ys = P.lettres.map(l => e.broches.find(q => q.nom === P.module + l).y); ligneEnfant([[cx, ys[0]], [cx, ys[ys.length - 1]]], true); });
      e.modules.forEach(M => { if (M.yTete != null) tEnfant(M.num, cx, M.yTete + 3.6, 5.6, { gras: true });
        [...M.lettres].forEach(l => { const b = e.broches.find(q => q.nom === M.num + l); pastilleEnfant(cx, b.y, 1.5); tEnfant(l, cx, b.y + 0.72, 5.6, { gras: true, blanc: true });
          // le point de connexion : au bord de la pastille, là où le fil arrive
          ['G', 'D'].forEach(cote => point(M.num + l + ':' + cote, cote === 'G' ? e.x + portee : e.x + e.w - portee, b.y, cote === 'G' ? -1 : 1, { prompt: lettresSeules ? l : M.num + l })); }); }); }
    else if (genre === 'prise') { rectEnfant(e.x, e.y, 7.5, e.h); rectEnfant(e.x + 7.5, e.y, e.w - 7.5, e.h);
      [...e.lettres].forEach(l => { const b = e.broches.find(q => q.nom === l); tEnfant(l, e.x + 3.75, b.y + 0.8, 6); tEnfant(l, e.x + 10, b.y + 0.8, 6);
        ['G', 'D'].forEach(cote => point(l + ':' + cote, cote === 'G' ? e.x : e.x + e.w, b.y, cote === 'G' ? -1 : 1, { prompt: l })); }); }
    else { // une boîte, un relais : sa boîte, ses broches (points sans nom et un texte à côté, ou points nommés), ses connecteurs lettrés
      rectEnfant(e.x, e.y, e.w, e.h); if (e.desig) tEnfant(e.desig, e.x + 1.6, e.y + 7.6, 4.8, { ancre: 'start' });
      const parC = new Map(); if (e.connecteurs) e.broches.forEach(b => { const c = decouper(b.nom).connecteur; (parC.get(c) || parC.set(c, []).get(c)).push(b); });
      const sousBoites = new Map(); parC.forEach((bs, c) => { const y0 = Math.min(...bs.map(b => b.y)) - 2.5, y1 = Math.max(...bs.map(b => b.y)) + 2.5, xc = bs[0].cote === 'G' ? e.x : e.x + e.w - 7.5; sousBoites.set(c, rectEnfant(xc, y0, 7.5, y1 - y0)); tEnfant(c, xc + 3.75, y0 - 1.3, 6.8, { gras: true }); });
      e.broches.forEach(b => { const cote = b.cote; if (!b.ancres || !b.ancres[cote]) return; const [ax, ay] = b.ancres[cote], numero = e.connecteurs ? decouper(b.nom).numero : b.nom;
        if (e.connecteurs && e.visio && e.visio.points === 'numero') point(b.nom + ':' + cote, ax, ay, cote === 'G' ? -1 : 1, { nom: 'P' + numero + decouper(b.nom).connecteur, prompt: numero });
        else if (nomme || e.connecteurs) point(b.nom + ':' + cote, ax, ay, cote === 'G' ? -1 : 1, { nom: b.nom });
        else point(b.nom + ':' + cote, ax, ay, cote === 'G' ? -1 : 1);
        tEnfant(numero, ax + (cote === 'G' ? 1.3 : -1.3), genre === 'relais' ? ay - 0.8 : ay + 0.8, 6.2, { ancre: cote === 'G' ? 'start' : 'end' }); });
      // un connecteur lettré « par numéro » : ses points sont portés par la sous-boîte de sa lettre et disent « 12 » (Prompt)
      if (e.connecteurs && e.visio && e.visio.points === 'numero') { /* (les points restent sur le groupe : leur invite seule dit le numéro) */ }
      if (genre === 'relais') { // la bobine et le contact, dessinés dans une forme enfant (des lignes, pas des fils)
        const [lx, ly] = loc(e.x + e.w / 2, e.y + e.h / 2), L = (a, b) => [loc(...a), loc(...b)];
        const sym = [[[e.x, e.y + 10], [e.x + 8, e.y + 10], [e.x + 8, e.y + 12]], [[e.x, e.y + 20], [e.x + 8, e.y + 20], [e.x + 8, e.y + 18]], [[e.x + e.w, e.y + 10], [e.x + e.w - 7, e.y + 10], [e.x + e.w - 11, e.y + 15]], [[e.x + e.w, e.y + 15], [e.x + e.w - 11, e.y + 15]], [[e.x + e.w, e.y + 20], [e.x + e.w - 11, e.y + 20]]];
        enfants.push(`<Shape ID='${id++}' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(lx, ly, W, H)}${C('LineWeight', 0.3 / 25.4)}${sym.map((pl, i) => geo(i, pl.map(p => { const [a, b2] = loc(...p); return [a, b2]; }))).join('')}${geo(5, [[I(6.5), I(e.h - 12)], [I(9.5), I(e.h - 12)], [I(9.5), I(e.h - 18)], [I(6.5), I(e.h - 18)], [I(6.5), I(e.h - 12)]])}</Shape>`); void L; } }
    const txt = genre === 'barrette' || genre === 'prise' ? `${C('TxtPinX', W / 2)}${C('TxtPinY', H + I(2.6))}${C('TxtWidth', I(20))}${C('TxtHeight', I(4))}` : `${C('TxtPinX', I(1.6) + I(10))}${C('TxtPinY', H - I(3.6))}${C('TxtWidth', I(20))}${C('TxtHeight', I(4))}`;
    F.push(`<Shape ID='${gid}' NameU='${x(e.rep)}' Name='${x(e.rep)}' Type='Group' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(gx + W / 2, gy + H / 2, W, H)}${txt}${C('LinePattern', 0)}${C('FillPattern', 0)}${marges()}${car(8.6, true)}${para(genre === 'barrette' || genre === 'prise' ? 1 : 0)}`
      + (e.pn ? `<Section N='Property'><Row N='Reference'>${C('Value', e.pn, null, 'STR')}${C('Label', 'Référence', null, 'STR')}</Row>${e.desig ? `<Row N='Designation'>${C('Value', e.desig, null, 'STR')}${C('Label', 'Désignation', null, 'STR')}</Row>` : ''}</Section>` : '')
      + (rows.length ? `<Section N='Connection'>${rows.join('')}</Section>` : '') + `<Text>${x(e.rep)}</Text><Shapes>${enfants.join('')}</Shapes></Shape>`);
    if (e.pn && genre !== 'disjoncteur') F.push(texte(e.pn, e.x + e.w / 2, e.y + e.h + 3.6, 5)); }
  // le point de connexion d'un bout de fil
  const ptDe = (rep, borne, cote) => { const S = sheet.get(rep); if (!S) return null; return S.pts.get(borne + ':' + cote) || S.pts.get(borne + ':' + (cote === 'G' ? 'D' : 'G')) || null; };
  // les masses et les renvois : des instances des maîtres, chacune son point de connexion
  const masses = new Map(); scene.masses.forEach(m => { const mid = id++; maitres.add(2);
    F.push(`<Shape ID='${mid}' NameU='Masse.${mid}' Type='Shape' Master='2'>${xform(PX(m.p[0]), PY(m.p[1] + 1), I(4), I(2))}${car(6.4)}<Text>${x(m.rep)}</Text></Shape>`); masses.set(m.net, { id: mid, cell: 'Connections.X1', p: m.p }); });
  const renvois = new Map(); scene.renvois.forEach(r => { const rid = id++; maitres.add(3); const s = r.droite ? 1 : -1;
    F.push(`<Shape ID='${rid}' NameU='Off-page reference.${rid}' Type='Shape' Master='3'>${xform(PX(r.p[0] + s * 7), PY(r.p[1]), I(14), I(5))}${C('FlipX', r.droite ? 0 : 1)}${car(6.2)}`
      + `<Section N='User'><Row N='OPCShapeID'>${C('Value', guid(o.cleNum(r.cle) * 2 + (o.premier(r) ? 0 : 1)), null, 'STR')}</Row><Row N='OPCDShapeID'>${C('Value', guid(o.cleNum(r.cle) * 2 + (o.premier(r) ? 1 : 0)), null, 'STR')}</Row></Section>`
      + `<Section N='Hyperlink'><Row N='Row_1'>${C('Description', 'Folio ' + r.folio, null, 'STR')}${C('Address', '', null, 'STR')}${C('SubAddress', 'Folio ' + r.folio, null, 'STR')}</Row></Section><Text>${x(r.texte)}</Text></Shape>`);
    if (r.signal) F.push(texte(r.signal, r.p[0] + s * 0.5, r.p[1] - 3.4, 4.6, { ancre: r.droite ? 'start' : 'end' }));
    renvois.set(r.net, { id: rid, cell: 'Connections.X1', p: r.p }); });
  // les fils : des connecteurs dynamiques collés ; quelques traits à la main ; un T posé sur un autre fil
  let n = 0;
  scene.traits.forEach(t => { if (t.peigne) return; n++;
    const pts = t.pts, b = pts[0], e2 = pts[pts.length - 1], cid = id++;
    const finA = t.tA ? null : (t.ancreA ? ptDe(t.ancreA.rep, t.ancreA.borne, t.ancreA.cote) : null);
    const finB = t.tB ? null : t.masse ? masses.get(t.net) : t.renvoi ? renvois.get(t.net) : (t.ancreB ? ptDe(t.ancreB.rep, t.ancreB.borne, t.ancreB.cote) : null);
    // un trait à la main sur sept : pas de colle ; un sur deux de ceux-là, posé à un millimètre du point, contre la boîte
    const main = o.main(t, n), decale = main && n % 2 === 0;
    let P = pts.map(p => [PX(p[0]), PY(p[1])]);
    // (à la main, un bout se pose rarement pile : 0,6 mm à côté du point d'ordinaire ; 1,6 mm, une fois sur trois)
    if (decale && finA && !t.tA) { const q = pts[1], d = Math.sign(q[0] - b[0]) || 1; P[0] = [PX(b[0] + d * (n % 3 === 0 ? 1.6 : 0.6)), PY(b[1])]; }
    const B = P[0], E = P[P.length - 1], Wd = E[0] - B[0], Hd = E[1] - B[1];
    // la cellule d'un point : « Connections.X3 » (le 3e, sans nom) ou « Connections.A1.X » (nommé)
    const cellX = f => f.nom ? f.cell + '.X' : f.cell, cellY = f => f.nom ? f.cell + '.Y' : f.cell.replace(/\.X(\d+)$/, '.Y$1');
    const formule = f => f ? `PAR(PNT(Sheet.${f.id}!${cellX(f)},Sheet.${f.id}!${cellY(f)}))` : null;
    const typeTxt = [o.numeroEcrit(t) ? t.numero : '', t.type && o.etiquette(t, n) ? t.type : ''].filter(Boolean).join(' ');
    if (!main) maitres.add(5);
    F.push(`<Shape ID='${cid}' NameU='${main ? 'Line' : 'Dynamic connector'}.${cid}' Type='Shape'${main ? " LineStyle='3' FillStyle='3' TextStyle='3'" : " Master='5'"}>`
      + `${C('PinX', (B[0] + E[0]) / 2, 'GUARD((BeginX+EndX)/2)')}${C('PinY', (B[1] + E[1]) / 2, 'GUARD((BeginY+EndY)/2)')}${C('Width', Wd, 'GUARD(EndX-BeginX)')}${C('Height', Hd, 'GUARD(EndY-BeginY)')}${C('LocPinX', Wd / 2, 'GUARD(Width*0.5)')}${C('LocPinY', Hd / 2, 'GUARD(Height*0.5)')}${C('Angle', 0)}${C('FlipX', 0)}${C('FlipY', 0)}`
      + `${C('BeginX', B[0], main ? null : formule(finA))}${C('BeginY', B[1], main ? null : formule(finA))}${C('EndX', E[0], main ? null : formule(finB))}${C('EndY', E[1], main ? null : formule(finB))}${C('ObjType', 2)}${C('LineWeight', 0.28 / 25.4)}${C('LineColor', '#000000')}${C('LinePattern', 1)}`
      + (typeTxt ? `${C('TxtPinX', o.txtX(t, B, Wd))}${C('TxtPinY', o.txtY(t, B) + I(1.6))}${C('TxtWidth', I(10))}${C('TxtHeight', I(3))}${car(5.4)}` : '')
      + `<Section N='Geometry' IX='0'>${C('NoFill', 1)}${C('NoLine', 0)}${C('NoShow', 0)}` + P.map((p, k) => `<Row T='${k ? 'LineTo' : 'MoveTo'}' IX='${k + 1}'>${C('X', p[0] - B[0])}${C('Y', p[1] - B[1])}</Row>`).join('') + `</Section>`
      + (typeTxt ? `<Text>${x(typeTxt)}</Text>` : '') + `</Shape>`);
    if (!main) { if (finA) CO.push(`<Connect FromSheet='${cid}' FromCell='BeginX' FromPart='9' ToSheet='${finA.id}' ToCell='${cellX(finA)}' ToPart='${finA.ix != null ? 100 + finA.ix : 100}'/>`);
      if (finB) CO.push(`<Connect FromSheet='${cid}' FromCell='EndX' FromPart='12' ToSheet='${finB.id}' ToCell='${cellX(finB)}' ToPart='${finB.ix != null ? 100 + finB.ix : 100}'/>`); }
    // un T : un point de jonction posé sur le fil qui tient la broche
    if (t.tA) liens.pts.set(b.join(','), b); if (t.tB) liens.pts.set(e2.join(','), e2); });
  // un point de jonction sur chaque T
  (scene.jonctions || []).forEach(p => liens.pts.set(p.join(','), p));
  liens.pts.forEach(p => { maitres.add(4); F.push(`<Shape ID='${id++}' NameU='Point de jonction.${id - 1}' Type='Shape' Master='4'>${xform(PX(p[0]), PY(p[1]), I(1.3), I(1.3))}</Shape>`); });
  // les notes et les types de câble posés à côté d'un trait à la main
  return { nom: 'Folio ' + scene.cart.folio, formes: F, connects: CO, maitres: [...maitres] }; }

/* ---- le paquet ------------------------------------------------------------------------------------------------------- */
function paquetVisio(pages, titre) {
  const f = {}, maitres = MAITRES.filter(m => pages.some(p => p.maitres.includes(m.id)));
  f['[Content_Types].xml'] = `${XML}<Types xmlns='http://schemas.openxmlformats.org/package/2006/content-types'><Default Extension='rels' ContentType='application/vnd.openxmlformats-package.relationships+xml'/><Default Extension='xml' ContentType='application/xml'/>`
    + `<Override PartName='/visio/document.xml' ContentType='application/vnd.ms-visio.drawing.main+xml'/><Override PartName='/visio/masters/masters.xml' ContentType='application/vnd.ms-visio.masters+xml'/>`
    + maitres.map((m, i) => `<Override PartName='/visio/masters/master${i + 1}.xml' ContentType='application/vnd.ms-visio.master+xml'/>`).join('')
    + `<Override PartName='/visio/pages/pages.xml' ContentType='application/vnd.ms-visio.pages+xml'/>` + pages.map((p, i) => `<Override PartName='/visio/pages/page${i + 1}.xml' ContentType='application/vnd.ms-visio.page+xml'/>`).join('')
    + `<Override PartName='/visio/windows.xml' ContentType='application/vnd.ms-visio.windows+xml'/><Override PartName='/docProps/core.xml' ContentType='application/vnd.openxmlformats-package.core-properties+xml'/><Override PartName='/docProps/app.xml' ContentType='application/vnd.openxmlformats-officedocument.extended-properties+xml'/></Types>`;
  f['_rels/.rels'] = `${XML}<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'><Relationship Id='rId3' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties' Target='docProps/app.xml'/><Relationship Id='rId2' Type='http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties' Target='docProps/core.xml'/><Relationship Id='rId1' Type='${REL}document' Target='visio/document.xml'/></Relationships>`;
  f['docProps/app.xml'] = `${XML}<Properties xmlns='http://schemas.openxmlformats.org/officeDocument/2006/extended-properties' xmlns:vt='http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes'><Template></Template><Application>Microsoft Visio</Application><ScaleCrop>false</ScaleCrop><TitlesOfParts><vt:vector size='${pages.length}' baseType='lpstr'>${pages.map(p => `<vt:lpstr>${x(p.nom)}</vt:lpstr>`).join('')}</vt:vector></TitlesOfParts><AppVersion>16.0000</AppVersion></Properties>`;
  f['docProps/core.xml'] = `${XML}<cp:coreProperties xmlns:cp='http://schemas.openxmlformats.org/package/2006/metadata/core-properties' xmlns:dc='http://purl.org/dc/elements/1.1/' xmlns:dcterms='http://purl.org/dc/terms/' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'><dc:title>${x(titre)}</dc:title><dcterms:created xsi:type='dcterms:W3CDTF'>2026-09-14T08:00:00Z</dcterms:created></cp:coreProperties>`;
  f['visio/_rels/document.xml.rels'] = `${XML}<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'><Relationship Id='rId1' Type='${REL}masters' Target='masters/masters.xml'/><Relationship Id='rId2' Type='${REL}pages' Target='pages/pages.xml'/><Relationship Id='rId3' Type='${REL}windows' Target='windows.xml'/></Relationships>`;
  f['visio/windows.xml'] = `${XML}<Windows ClientWidth='1600' ClientHeight='900' xmlns='${NS}' xmlns:r='${NSR}' xml:space='preserve'><Window ID='0' WindowType='Drawing' WindowState='1073741824' ViewScale='-1' ViewCenterX='8.27' ViewCenterY='5.85' Page='0'/></Windows>`;
  f['visio/document.xml'] = `${XML}<VisioDocument xmlns='${NS}' xmlns:r='${NSR}' xml:space='preserve'><DocumentSettings TopPage='0' DefaultTextStyle='3' DefaultLineStyle='3' DefaultFillStyle='3' DefaultGuideStyle='4'><GlueSettings>9</GlueSettings><SnapSettings>65847</SnapSettings></DocumentSettings>`
    + `<Colors><ColorEntry IX='24' RGB='#1F4E79'/></Colors><FaceNames><FaceName NameU='Calibri' UnicodeRanges='-536859905 -1073732485 9 0' CharSets='536871423 0' Panos='2 15 5 2 2 2 4 3 2 4' Flags='325'/></FaceNames>`
    + `<StyleSheets><StyleSheet ID='0' NameU='No Style' IsCustomNameU='1' Name='No Style' IsCustomName='1'>${C('EnableLineProps', 1)}${C('EnableFillProps', 1)}${C('EnableTextProps', 1)}${C('LineWeight', 0.01041666666666667)}${C('LineColor', 0)}${C('LinePattern', 1)}${C('FillForegnd', 1)}${C('FillPattern', 1)}${C('VerticalAlign', 1)}`
    + `<Section N='Character'><Row IX='0'>${C('Font', 'Calibri')}${C('Color', 0)}${C('Size', 0.1111111111111111)}</Row></Section><Section N='Paragraph'><Row IX='0'>${C('HorzAlign', 1)}</Row></Section></StyleSheet>`
    + `<StyleSheet ID='3' NameU='Normal' IsCustomNameU='1' Name='Normal' IsCustomName='1' LineStyle='0' FillStyle='0' TextStyle='0'>${C('LineWeight', 0.01041666666666667)}${C('LineColor', '#000000')}${C('FillForegnd', '#ffffff')}</StyleSheet>`
    + `<StyleSheet ID='7' NameU='Connector' IsCustomNameU='1' Name='Connector' IsCustomName='1' LineStyle='3' FillStyle='3' TextStyle='3'>${C('EndArrow', 0)}${C('LineColor', '#000000')}<Section N='Character'><Row IX='0'>${C('Size', 0.075)}</Row></Section></StyleSheet></StyleSheets>`
    + `<DocumentSheet NameU='TheDoc' IsCustomNameU='1' Name='TheDoc' IsCustomName='1' LineStyle='0' FillStyle='0' TextStyle='0'>${C('OutputFormat', 0)}${C('DocLangID', 1036)}</DocumentSheet></VisioDocument>`;
  f['visio/masters/masters.xml'] = `${XML}<Masters xmlns='${NS}' xmlns:r='${NSR}' xml:space='preserve'>${maitres.map((m, i) => `<Master ID='${m.id}' NameU='${x(m.nom)}' IsCustomNameU='1' Name='${x(m.nom)}' IsCustomName='1' Prompt='' IconSize='1' AlignName='2' MatchByName='0' IconUpdate='1' UniqueID='${guid(900 + m.id)}' BaseID='${guid(950 + m.id)}' PatternFlags='0' Hidden='0' MasterType='2'><PageSheet LineStyle='0' FillStyle='0' TextStyle='0'>${C('PageWidth', 1)}${C('PageHeight', 1)}</PageSheet><Rel r:id='rId${i + 1}'/></Master>`).join('')}</Masters>`;
  f['visio/masters/_rels/masters.xml.rels'] = `${XML}<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>${maitres.map((m, i) => `<Relationship Id='rId${i + 1}' Type='${REL}master' Target='master${i + 1}.xml'/>`).join('')}</Relationships>`;
  maitres.forEach((m, i) => { f[`visio/masters/master${i + 1}.xml`] = `${XML}<MasterContents xmlns='${NS}' xmlns:r='${NSR}' xml:space='preserve'><Shapes>${m.xml}</Shapes></MasterContents>`; });
  f['visio/pages/pages.xml'] = `${XML}<Pages xmlns='${NS}' xmlns:r='${NSR}' xml:space='preserve'>${pages.map((p, i) => `<Page ID='${i}' NameU='${x(p.nom)}' IsCustomNameU='1' Name='${x(p.nom)}' IsCustomName='1' ViewScale='-1' ViewCenterX='8.27' ViewCenterY='5.85'>`
    + `<PageSheet LineStyle='0' FillStyle='0' TextStyle='0'>${C('PageWidth', W_IN, null, 'MM')}${C('PageHeight', H_IN, null, 'MM')}${C('PageScale', 1, null, 'IN')}${C('DrawingScale', 1, null, 'IN')}${C('DrawingSizeType', 3)}${C('PrintPageOrientation', 2)}</PageSheet><Rel r:id='rId${i + 1}'/></Page>`).join('')}</Pages>`;
  f['visio/pages/_rels/pages.xml.rels'] = `${XML}<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>${pages.map((p, i) => `<Relationship Id='rId${i + 1}' Type='${REL}page' Target='page${i + 1}.xml'/>`).join('')}</Relationships>`;
  pages.forEach((p, i) => { f[`visio/pages/page${i + 1}.xml`] = `${XML}<PageContents xmlns='${NS}' xmlns:r='${NSR}' xml:space='preserve'><Shapes>${p.formes.join('')}</Shapes>${p.connects.length ? `<Connects>${p.connects.join('')}</Connects>` : ''}</PageContents>`;
    const ms = p.maitres.filter(id => maitres.some(m => m.id === id));
    if (ms.length) f[`visio/pages/_rels/page${i + 1}.xml.rels`] = `${XML}<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>${ms.map((id, k) => `<Relationship Id='rId${k + 1}' Type='${REL}master' Target='../masters/master${maitres.findIndex(m => m.id === id) + 1}.xml'/>`).join('')}</Relationships>`; });
  return f; }

/* Le document C : les scènes du document A, une page Visio par folio */
function documentVisio(composes, titre) {
  const cles = new Map(), premiers = new Map();
  composes.forEach((c, i) => c.scene.renvois.forEach(r => { if (!cles.has(r.cle)) cles.set(r.cle, cles.size + 1); if (!premiers.has(r.cle)) premiers.set(r.cle, i); }));
  const pages = composes.map((c, i) => pageVisio(c.scene, i, {
    cleNum: cle => cles.get(cle), premier: r => premiers.get(r.cle) === i,
    // un trait sur sept à la main (ni maître, ni colle) ; le type écrit sur trois fils sur quatre
    main: (t, n) => n % 7 === 3, etiquette: (t, n) => n % 4 !== 1,
    // le numéro de fil : là où le folio du PDF l'écrit (la même vérité)
    numeroEcrit: t => !!t.numero && c.scene.textes.some(z => z.net === t.net && z.numero),
    txtX: (t, B) => { const s = t.pts.slice(1).map((p, k) => [t.pts[k], p]).filter(([a, b]) => Math.abs(a[1] - b[1]) < 1e-6).sort((p, q) => Math.abs(q[0][0] - q[1][0]) - Math.abs(p[0][0] - p[1][0]))[0]; return s ? I((s[0][0] + s[1][0]) / 2) - B[0] : 0; },
    txtY: (t, B) => { const s = t.pts.slice(1).map((p, k) => [t.pts[k], p]).filter(([a, b]) => Math.abs(a[1] - b[1]) < 1e-6).sort((p, q) => Math.abs(q[0][0] - q[1][0]) - Math.abs(p[0][0] - p[1][0]))[0]; return s ? PY(s[0][1]) - B[1] : 0; } }));
  return paquetVisio(pages, titre); }

module.exports = { documentVisio };
