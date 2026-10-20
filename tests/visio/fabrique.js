/* ===========================================================================
   LES SCHÉMAS VISIO D'ESSAI — des .vsdx « comme Visio les écrit », d'autres mains
   ---------------------------------------------------------------------------
   Le banc (tests/visio.js) mesure ce que Volta retrouve dans un .vsdx. Les
   folios que Volta écrit lui-même (09-visio) ne suffisent pas : ils sont tous
   de la même main, et Volta sait ce qu'il y a mis. Ce module fabrique, AUTREMENT
   (son propre écrivain, ses propres conventions, celles que Visio emploie),
   des dessins dont il rend la vérité :

     A « gabarit »   des MAÎTRES (un gabarit d'équipements : relais, connecteur,
                     disjoncteur, masse ; le connecteur dynamique ; le renvoi de
                     page) ; chaque instance est un GROUPE dont les formes et les
                     numéros de borne viennent du maître (rien n'est redit dans
                     la page) ; des points de connexion indexés (Connections.X3,
                     ToPart 102) ; des connecteurs COLLÉS, d'autres seulement
                     POSÉS au bout d'un point ; deux pages, des RENVOIS entre elles
                     (le maître « Off-page reference », ses liens et ses données
                     OPC) ; le cartouche sur chaque page ;
     B « à la main » pas de maître : des rectangles avec des points de connexion,
                     le repère et les numéros de borne dans des TEXTES SÉPARÉS ;
                     des connecteurs collés à la forme ENTIÈRE (colle dynamique),
                     des traits (l'outil Ligne : des formes 1-D) posés sur le point
                     ou sur le bord, une polyligne, des T sur un autre trait et
                     un point de jonction, un trait qui n'arrive nulle part ;
     C « données »   des groupes dont chaque borne est une petite forme (sa propre
                     colle), des repères dans les DONNÉES de la forme (Shape Data),
                     des repères d'une autre convention (K12, J101), des points de
                     connexion NOMMÉS (A1, B2…), une page d'ARRIÈRE-PLAN qui porte
                     le cartouche, trois pages et des renvois appariés par leur
                     texte (le nom d'un signal).
   Tout est déterministe. Chaque style rend { nom, fichiers ({ chemin: texte }),
   verite: [{ de, borneDe, vers, borneVers, page }] }.
   =========================================================================== */
'use strict';

const NS = 'http://schemas.microsoft.com/office/visio/2012/main', NSR = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const REL = 'http://schemas.microsoft.com/visio/2010/relationships/';
const XML = '<?xml version=\'1.0\' encoding=\'utf-8\' ?>\r\n';
const x = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&apos;').replace(/"/g, '&quot;');
const v = n => (typeof n === 'number' ? String(Math.round(n * 1e9) / 1e9) : String(n));
// Visio écrit ses attributs entre apostrophes
const C = (N, V, F, U) => `<Cell N='${N}' V='${x(v(V))}'${U ? ` U='${U}'` : ''}${F ? ` F='${x(F)}'` : ''}/>`;
const MM = mm => mm / 25.4;

/* ---- le paquet ---------------------------------------------------------------------------------------------------- */
function paquet({ pages, maitres = [], titre = 'Schéma', fonds = [] }) {
  const f = {}, tous = [...pages, ...fonds];
  f['[Content_Types].xml'] = `${XML}<Types xmlns='http://schemas.openxmlformats.org/package/2006/content-types'><Default Extension='emf' ContentType='image/x-emf'/><Default Extension='rels' ContentType='application/vnd.openxmlformats-package.relationships+xml'/><Default Extension='xml' ContentType='application/xml'/>`
    + `<Override PartName='/visio/document.xml' ContentType='application/vnd.ms-visio.drawing.main+xml'/>` + (maitres.length ? `<Override PartName='/visio/masters/masters.xml' ContentType='application/vnd.ms-visio.masters+xml'/>` + maitres.map((m, i) => `<Override PartName='/visio/masters/master${i + 1}.xml' ContentType='application/vnd.ms-visio.master+xml'/>`).join('') : '')
    + `<Override PartName='/visio/pages/pages.xml' ContentType='application/vnd.ms-visio.pages+xml'/>` + tous.map((p, i) => `<Override PartName='/visio/pages/page${i + 1}.xml' ContentType='application/vnd.ms-visio.page+xml'/>`).join('')
    + `<Override PartName='/visio/windows.xml' ContentType='application/vnd.ms-visio.windows+xml'/><Override PartName='/docProps/core.xml' ContentType='application/vnd.openxmlformats-package.core-properties+xml'/><Override PartName='/docProps/app.xml' ContentType='application/vnd.openxmlformats-officedocument.extended-properties+xml'/></Types>`;
  f['_rels/.rels'] = `${XML}<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'><Relationship Id='rId3' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties' Target='docProps/app.xml'/><Relationship Id='rId2' Type='http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties' Target='docProps/core.xml'/><Relationship Id='rId1' Type='${REL}document' Target='visio/document.xml'/></Relationships>`;
  f['docProps/app.xml'] = `${XML}<Properties xmlns='http://schemas.openxmlformats.org/officeDocument/2006/extended-properties' xmlns:vt='http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes'><Template></Template><Application>Microsoft Visio</Application><ScaleCrop>false</ScaleCrop><TitlesOfParts><vt:vector size='${tous.length}' baseType='lpstr'>${tous.map(p => `<vt:lpstr>${x(p.nom)}</vt:lpstr>`).join('')}</vt:vector></TitlesOfParts><AppVersion>16.0000</AppVersion></Properties>`;
  f['docProps/core.xml'] = `${XML}<cp:coreProperties xmlns:cp='http://schemas.openxmlformats.org/package/2006/metadata/core-properties' xmlns:dc='http://purl.org/dc/elements/1.1/' xmlns:dcterms='http://purl.org/dc/terms/' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'><dc:title>${x(titre)}</dc:title><dcterms:created xsi:type='dcterms:W3CDTF'>2026-01-05T09:00:00Z</dcterms:created></cp:coreProperties>`;
  f['visio/_rels/document.xml.rels'] = `${XML}<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'><Relationship Id='rId2' Type='${REL}pages' Target='pages/pages.xml'/>${maitres.length ? `<Relationship Id='rId1' Type='${REL}masters' Target='masters/masters.xml'/>` : ''}<Relationship Id='rId3' Type='${REL}windows' Target='windows.xml'/></Relationships>`;
  f['visio/windows.xml'] = `${XML}<Windows ClientWidth='1600' ClientHeight='900' xmlns='${NS}' xmlns:r='${NSR}' xml:space='preserve'><Window ID='0' WindowType='Drawing' WindowState='1073741824' ViewScale='-1' ViewCenterX='8' ViewCenterY='6' Page='0'/></Windows>`;
  // des styles comme ceux d'un dessin Visio : « Normal » (3), « Connector » (7) hérités de « No Style » (0)
  f['visio/document.xml'] = `${XML}<VisioDocument xmlns='${NS}' xmlns:r='${NSR}' xml:space='preserve'><DocumentSettings TopPage='0' DefaultTextStyle='3' DefaultLineStyle='3' DefaultFillStyle='3' DefaultGuideStyle='4'><GlueSettings>9</GlueSettings><SnapSettings>65847</SnapSettings></DocumentSettings>`
    + `<Colors><ColorEntry IX='24' RGB='#1F4E79'/></Colors><FaceNames><FaceName NameU='Calibri' UnicodeRanges='-536859905 -1073732485 9 0' CharSets='536871423 0' Panos='2 15 5 2 2 2 4 3 2 4' Flags='325'/></FaceNames>`
    + `<StyleSheets><StyleSheet ID='0' NameU='No Style' IsCustomNameU='1' Name='No Style' IsCustomName='1'>${C('EnableLineProps', 1)}${C('EnableFillProps', 1)}${C('EnableTextProps', 1)}${C('LineWeight', 0.01041666666666667)}${C('LineColor', 0)}${C('LinePattern', 1)}${C('FillForegnd', 1)}${C('FillPattern', 1)}${C('VerticalAlign', 1)}`
    + `<Section N='Character'><Row IX='0'>${C('Font', 'Calibri')}${C('Color', 0)}${C('Size', 0.1666666666666667)}</Row></Section><Section N='Paragraph'><Row IX='0'>${C('HorzAlign', 1)}</Row></Section></StyleSheet>`
    + `<StyleSheet ID='3' NameU='Normal' IsCustomNameU='1' Name='Normal' IsCustomName='1' LineStyle='0' FillStyle='0' TextStyle='0'>${C('LineWeight', 0.01041666666666667, 'THEMEVAL()')}${C('LineColor', '#1f4e79', 'THEMEVAL()')}${C('FillForegnd', '#ffffff', 'THEMEVAL()')}</StyleSheet>`
    + `<StyleSheet ID='7' NameU='Connector' IsCustomNameU='1' Name='Connector' IsCustomName='1' LineStyle='3' FillStyle='3' TextStyle='3'>${C('EndArrow', 0)}${C('LineColor', '#000000')}<Section N='Character'><Row IX='0'>${C('Size', 0.1111111111111111)}</Row></Section></StyleSheet></StyleSheets>`
    + `<DocumentSheet NameU='TheDoc' IsCustomNameU='1' Name='TheDoc' IsCustomName='1' LineStyle='0' FillStyle='0' TextStyle='0'>${C('OutputFormat', 0)}${C('DocLangID', 1036)}</DocumentSheet></VisioDocument>`;
  if (maitres.length) {
    f['visio/masters/masters.xml'] = `${XML}<Masters xmlns='${NS}' xmlns:r='${NSR}' xml:space='preserve'>${maitres.map((m, i) => `<Master ID='${m.id}' NameU='${x(m.nom)}' IsCustomNameU='1' Name='${x(m.nom)}' IsCustomName='1' Prompt='' IconSize='1' AlignName='2' MatchByName='0' IconUpdate='1' UniqueID='{00000000-0000-0000-0000-0000000000${String(10 + i)}}' BaseID='{00000000-0000-0000-0001-0000000000${String(10 + i)}}' PatternFlags='0' Hidden='0' MasterType='2'><PageSheet LineStyle='0' FillStyle='0' TextStyle='0'>${C('PageWidth', 1)}${C('PageHeight', 1)}</PageSheet><Rel r:id='rId${i + 1}'/></Master>`).join('')}</Masters>`;
    f['visio/masters/_rels/masters.xml.rels'] = `${XML}<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>${maitres.map((m, i) => `<Relationship Id='rId${i + 1}' Type='${REL}master' Target='master${i + 1}.xml'/>`).join('')}</Relationships>`;
    maitres.forEach((m, i) => { f[`visio/masters/master${i + 1}.xml`] = `${XML}<MasterContents xmlns='${NS}' xmlns:r='${NSR}' xml:space='preserve'><Shapes>${m.xml}</Shapes></MasterContents>`; }); }
  f['visio/pages/pages.xml'] = `${XML}<Pages xmlns='${NS}' xmlns:r='${NSR}' xml:space='preserve'>${tous.map((p, i) => `<Page ID='${p.id}' NameU='${x(p.nom)}' IsCustomNameU='1' Name='${x(p.nom)}' IsCustomName='1'${p.fond ? " Background='1'" : ''}${p.arriere != null ? ` BackPage='${p.arriere}'` : ''} ViewScale='-1' ViewCenterX='8.2' ViewCenterY='5.8'>`
    + `<PageSheet LineStyle='0' FillStyle='0' TextStyle='0'>${C('PageWidth', p.w, null, 'MM')}${C('PageHeight', p.h, null, 'MM')}${C('PageScale', 1, null, 'IN')}${C('DrawingScale', 1, null, 'IN')}${C('DrawingSizeType', 3)}${C('PrintPageOrientation', 2)}</PageSheet><Rel r:id='rId${i + 1}'/></Page>`).join('')}</Pages>`;
  f['visio/pages/_rels/pages.xml.rels'] = `${XML}<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>${tous.map((p, i) => `<Relationship Id='rId${i + 1}' Type='${REL}page' Target='page${i + 1}.xml'/>`).join('')}</Relationships>`;
  tous.forEach((p, i) => { f[`visio/pages/page${i + 1}.xml`] = `${XML}<PageContents xmlns='${NS}' xmlns:r='${NSR}' xml:space='preserve'><Shapes>${p.formes.join('')}</Shapes>${p.connects.length ? `<Connects>${p.connects.join('')}</Connects>` : ''}</PageContents>`;
    const ms = [...new Set(p.maitres || [])]; if (ms.length) f[`visio/pages/_rels/page${i + 1}.xml.rels`] = `${XML}<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>${ms.map((id, k) => `<Relationship Id='rId${k + 1}' Type='${REL}master' Target='../masters/master${maitres.findIndex(m => m.id === id) + 1}.xml'/>`).join('')}</Relationships>`; });
  return f; }

/* ---- une page : ses formes, ses colles --------------------------------------------------------------------------- */
function page(nom, id, o = {}) { const P = { nom, id, w: o.w || 16.53543307086614, h: o.h || 11.69291338582677, formes: [], connects: [], maitres: [], n: o.premier || 1, fond: !!o.fond, arriere: o.arriere };
  P.id_ = () => P.n++; return P; }
const geoRect = (w, h, ix = 0, noFill = 0) => `<Section N='Geometry' IX='${ix}'>${C('NoFill', noFill)}${C('NoLine', 0)}${C('NoShow', 0)}${C('NoSnap', 0)}<Row T='RelMoveTo' IX='1'>${C('X', 0)}${C('Y', 0)}</Row><Row T='RelLineTo' IX='2'>${C('X', 1)}${C('Y', 0)}</Row><Row T='RelLineTo' IX='3'>${C('X', 1)}${C('Y', 1)}</Row><Row T='RelLineTo' IX='4'>${C('X', 0)}${C('Y', 1)}</Row><Row T='RelLineTo' IX='5'>${C('X', 0)}${C('Y', 0)}</Row></Section>`;
const xform = (px, py, w, h) => `${C('PinX', px)}${C('PinY', py)}${C('Width', w)}${C('Height', h)}${C('LocPinX', w / 2, 'Width*0.5')}${C('LocPinY', h / 2, 'Height*0.5')}${C('Angle', 0)}${C('FlipX', 0)}${C('FlipY', 0)}${C('ResizeMode', 0)}`;
// un texte seul (l'outil Texte) : une forme sans trait ni fond
function texte(P, cx, cy, s, o = {}) { const id = P.id_(), t = o.taille || 8 / 72, w = Math.max(0.12, 0.62 * t * s.length + 0.1), h = t * 1.6;
  P.formes.push(`<Shape ID='${id}' NameU='Sheet.${id}' Name='Sheet.${id}' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(cx, cy, w, h)}${C('LinePattern', 0)}${C('FillPattern', 0)}${o.angle ? C('Angle', o.angle) : ''}<Section N='Character'><Row IX='0'>${C('Size', t)}</Row></Section><Text>${x(s)}</Text></Shape>`); return id; }
// un connecteur dynamique (son maître, ou pas), ses points en pouces de la page ; colle : [{ cote: 'B'|'E', forme, cellule, part, formule }]
function connecteur(P, pts, o = {}) { const id = P.id_(), b = pts[0], e = pts[pts.length - 1], W = e[0] - b[0], H = e[1] - b[1];
  const colle = c => { const g = (o.colles || []).find(k => k.cote === c); return g || null; };
  const fx = c => { const g = colle(c); if (!g || g.sansFormule) return null; return g.dyn ? '_WALKGLUE(BegTrigger,EndTrigger,WalkPreference)' : `PAR(PNT(Sheet.${g.forme}!${g.cellule},Sheet.${g.forme}!${g.cellule.replace(/X(\d*)$/, 'Y$1')}))`; };
  const maitre = o.maitre != null ? ` Master='${o.maitre}'` : ''; if (o.maitre != null) P.maitres.push(o.maitre);
  const geo = `<Section N='Geometry' IX='0'>${C('NoFill', 1)}${C('NoLine', 0)}${C('NoShow', 0)}` + pts.map((p, k) => `<Row T='${k ? 'LineTo' : 'MoveTo'}' IX='${k + 1}'>${C('X', p[0] - b[0])}${C('Y', p[1] - b[1])}</Row>`).join('') + '</Section>';
  P.formes.push(`<Shape ID='${id}' NameU='${o.ligne ? 'Line' : 'Dynamic connector'}.${id}' Name='${o.ligne ? 'Line' : 'Dynamic connector'}.${id}' Type='Shape'${maitre}${o.maitre == null ? " LineStyle='7' FillStyle='7' TextStyle='7'" : ''}>`
    + `${C('PinX', (b[0] + e[0]) / 2, 'Inh')}${C('PinY', (b[1] + e[1]) / 2, 'Inh')}${C('Width', o.ligne ? Math.hypot(W, H) : W, 'Inh')}${C('Height', o.ligne ? 0 : H, 'Inh')}${C('LocPinX', (o.ligne ? Math.hypot(W, H) : W) / 2, 'Inh')}${C('LocPinY', o.ligne ? 0 : H / 2, 'Inh')}${C('Angle', o.ligne ? Math.atan2(H, W) : 0, 'Inh')}`
    + `${C('BeginX', b[0], fx('B'))}${C('BeginY', b[1], fx('B'))}${C('EndX', e[0], fx('E'))}${C('EndY', e[1], fx('E'))}${o.ligne ? '' : C('ObjType', 2)}`
    + (o.ligne ? `<Section N='Geometry' IX='0'>${C('NoFill', 1)}<Row T='MoveTo' IX='1'>${C('X', 0)}${C('Y', 0)}</Row><Row T='LineTo' IX='2'>${C('X', Math.hypot(W, H), 'Width*1')}${C('Y', 0)}</Row></Section>` : geo)
    + (o.texte ? `<Text>${x(o.texte)}</Text>` : '') + '</Shape>');
  (o.colles || []).forEach(g => { if (g.sansConnect) return; P.connects.push(`<Connect FromSheet='${id}' FromCell='${g.cote === 'B' ? 'BeginX' : 'EndX'}' FromPart='${g.cote === 'B' ? 9 : 12}' ToSheet='${g.forme}' ToCell='${g.dyn ? 'PinX' : g.cellule}' ToPart='${g.dyn ? 3 : g.part}'/>`); });
  return id; }
// le cartouche, en textes (une étiquette, sa valeur dessous), dans un rectangle
function cartouche(P, champs, x1 = 16.2, y0 = 0.35) { const w = MM(170), h = MM(24), x0 = x1 - w, id = P.id_();
  P.formes.push(`<Shape ID='${id}' NameU='Title block' Name='Title block' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(x0 + w / 2, y0 + h / 2, w, h)}${C('LineWeight', 0.02)}${geoRect(w, h, 0, 1)}</Shape>`);
  champs.forEach(([lab, val], k) => { const cx = x0 + MM(6) + k * (w / champs.length); texte(P, cx + MM(6), y0 + h - MM(5), lab, { taille: 6 / 72 }); texte(P, cx + MM(8), y0 + MM(7), val, { taille: 10 / 72 }); }); }

/* ---- A « gabarit » : maîtres, groupes, colles indexées, renvois de page ------------------------------------------ */
function styleA() {
  // les maîtres : 2 le connecteur dynamique, 4 un équipement à 2 × n bornes, 6 la masse, 8 le renvoi de page
  const M = [];
  M.push({ id: 2, nom: 'Dynamic connector', xml: `<Shape ID='5' Type='Shape' LineStyle='7' FillStyle='7' TextStyle='7'>${C('PinX', 0)}${C('PinY', 0)}${C('Width', 0, 'GUARD(EndX-BeginX)')}${C('Height', 0, 'GUARD(EndY-BeginY)')}${C('ObjType', 2)}${C('ShapeRouteStyle', 1)}${C('BeginX', 0)}${C('BeginY', 0)}${C('EndX', 1)}${C('EndY', 0)}<Section N='Geometry' IX='0'>${C('NoFill', 1)}<Row T='MoveTo' IX='1'>${C('X', 0)}${C('Y', 0)}</Row><Row T='LineTo' IX='2'>${C('X', 1)}${C('Y', 0)}</Row></Section></Shape>` });
  // un équipement à six bornes : trois à gauche (1, 2, 3), trois à droite (4, 5, 6), leurs numéros dans le maître
  const W = 1.3, H = 1.0, ys = [0.75, 0.5, 0.25].map(k => k * H);
  const sous = [`<Shape ID='7' NameU='Corps' Name='Corps' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(W / 2, H / 2, W, H)}${geoRect(W, H)}</Shape>`];
  [1, 2, 3, 4, 5, 6].forEach((n, k) => { const gauche = k < 3, y = ys[k % 3], id = 8 + k;
    sous.push(`<Shape ID='${id}' NameU='Borne.${n}' Name='Borne.${n}' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(gauche ? 0.12 : W - 0.12, y, 0.16, 0.14)}${C('LinePattern', 0)}${C('FillPattern', 0)}<Section N='Character'><Row IX='0'>${C('Size', 7 / 72)}</Row></Section><Text>${n}</Text></Shape>`); });
  const cnx = [1, 2, 3, 4, 5, 6].map((n, k) => `<Row T='Connection' IX='${k}'>${C('X', k < 3 ? 0 : W, k < 3 ? 'Width*0' : 'Width*1')}${C('Y', ys[k % 3], 'Height*' + (ys[k % 3] / H))}${C('DirX', 0)}${C('DirY', 0)}${C('Type', 0)}${C('AutoGen', 0)}${C('Prompt', '', 'No Formula')}</Row>`).join('');
  M.push({ id: 4, nom: 'Equipement 6 bornes', xml: `<Shape ID='6' Type='Group' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(W / 2, H / 2, W, H)}${C('TxtPinY', H + 0.12, 'Height+0.12in')}${C('TxtHeight', 0.2)}<Section N='Connection'>${cnx}</Section><Section N='Character'><Row IX='0'>${C('Size', 10 / 72)}${C('Style', 1)}</Row></Section><Text>EQ</Text><Shapes>${sous.join('')}</Shapes></Shape>` });
  M.push({ id: 6, nom: 'Masse', xml: `<Shape ID='5' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(0.15, 0.15, 0.3, 0.3)}${C('TxtPinY', -0.1)}<Section N='Connection'><Row T='Connection' IX='0'>${C('X', 0.15, 'Width*0.5')}${C('Y', 0.3, 'Height*1')}${C('Type', 0)}</Row></Section>`
    + `<Section N='Geometry' IX='0'>${C('NoFill', 1)}<Row T='MoveTo' IX='1'>${C('X', 0.15)}${C('Y', 0.3)}</Row><Row T='LineTo' IX='2'>${C('X', 0.15)}${C('Y', 0.18)}</Row></Section><Section N='Geometry' IX='1'>${C('NoFill', 1)}<Row T='MoveTo' IX='1'>${C('X', 0)}${C('Y', 0.18)}</Row><Row T='LineTo' IX='2'>${C('X', 0.3)}${C('Y', 0.18)}</Row></Section>`
    + `<Section N='Geometry' IX='2'>${C('NoFill', 1)}<Row T='MoveTo' IX='1'>${C('X', 0.06)}${C('Y', 0.1)}</Row><Row T='LineTo' IX='2'>${C('X', 0.24)}${C('Y', 0.1)}</Row></Section><Section N='Geometry' IX='3'>${C('NoFill', 1)}<Row T='MoveTo' IX='1'>${C('X', 0.12)}${C('Y', 0.02)}</Row><Row T='LineTo' IX='2'>${C('X', 0.18)}${C('Y', 0.02)}</Row></Section><Text>G</Text></Shape>` });
  M.push({ id: 8, nom: 'Off-page reference', xml: `<Shape ID='5' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(0.25, 0.15, 0.5, 0.3)}<Section N='Connection'><Row T='Connection' IX='0'>${C('X', 0)}${C('Y', 0.15)}</Row><Row T='Connection' IX='1'>${C('X', 0.5)}${C('Y', 0.15)}</Row></Section>`
    + `<Section N='Geometry' IX='0'><Row T='MoveTo' IX='1'>${C('X', 0)}${C('Y', 0)}</Row><Row T='LineTo' IX='2'>${C('X', 0.35)}${C('Y', 0)}</Row><Row T='LineTo' IX='3'>${C('X', 0.5)}${C('Y', 0.15)}</Row><Row T='LineTo' IX='4'>${C('X', 0.35)}${C('Y', 0.3)}</Row><Row T='LineTo' IX='5'>${C('X', 0)}${C('Y', 0.3)}</Row><Row T='LineTo' IX='6'>${C('X', 0)}${C('Y', 0)}</Row></Section></Shape>` });
  const verite = [], pages = [page('Page-1', 0), page('Page-2', 4)];
  // une instance d'équipement : son repère dans le texte du groupe, ses sous-formes héritées (seuls leurs ID dans la page)
  const equip = (P, nom, px, py) => { const id = P.id_(), ids = [0, 1, 2, 3, 4, 5, 6].map(() => P.id_()); P.maitres.push(4);
    P.formes.push(`<Shape ID='${id}' NameU='Equipement 6 bornes.${id}' Name='Equipement 6 bornes.${id}' Type='Group' Master='4'>${C('PinX', px)}${C('PinY', py)}<Text>${x(nom)}</Text><Shapes>${ids.map((s, k) => `<Shape ID='${s}' Type='Shape' MasterShape='${7 + k}'/>`).join('')}</Shapes></Shape>`);
    return { id, nom, px, py, borne: n => { const k = n - 1, gauche = k < 3; return [px - W / 2 + (gauche ? 0 : W), py - H / 2 + ys[k % 3]]; } }; };
  const masse = (P, nom, px, py) => { const id = P.id_(); P.maitres.push(6); P.formes.push(`<Shape ID='${id}' NameU='Masse.${id}' Name='Masse.${id}' Type='Shape' Master='6'>${C('PinX', px)}${C('PinY', py)}<Text>${x(nom)}</Text></Shape>`); return { id, nom, p: [px, py + 0.15] }; };
  // un câble collé : connecteur dynamique, Connections.Xn et ToPart 100 + n − 1 (Visio écrit les deux)
  const relie = (P, a, na, b, nb, texte, colle = [true, true]) => { const p = a.borne(na), q = b.borne(nb), mx = (p[0] + q[0]) / 2, pts = Math.abs(p[1] - q[1]) < 1e-9 ? [p, q] : [p, [mx, p[1]], [mx, q[1]], q];
    connecteur(P, pts, { maitre: 2, texte, colles: [colle[0] && { cote: 'B', forme: a.id, cellule: 'Connections.X' + na, part: 99 + na }, colle[1] && { cote: 'E', forme: b.id, cellule: 'Connections.X' + nb, part: 99 + nb }].filter(Boolean) });
    verite.push({ de: a.nom, borneDe: String(na), vers: b.nom, borneVers: String(nb), page: P.nom }); };
  // la page 1 : quatre rangées de deux équipements, câblés de l'un à l'autre ; quelques connecteurs posés sans colle
  const P1 = pages[0], E1 = [];
  for (let r = 0; r < 4; r++) { E1.push(equip(P1, (110 + r) + 'RL' + (r + 1), 3, 9.5 - r * 2.2), equip(P1, (210 + r) + 'XC' + (r + 1), 8, 9.5 - r * 2.2)); }
  let w = 401;
  for (let r = 0; r < 4; r++) { const [a, b] = [E1[2 * r], E1[2 * r + 1]]; for (let n = 1; n <= 3; n++) relie(P1, a, n + 3, b, n, 'W-' + (w++), r === 2 && n === 2 ? [false, false] : r === 3 && n === 1 ? [true, false] : [true, true]); }
  // des liaisons qui changent de rangée (des coudes), et une masse
  relie(P1, E1[0], 1, E1[2], 1, 'W-' + (w++)); relie(P1, E1[3], 6, E1[5], 4, 'W-' + (w++)); relie(P1, E1[4], 2, E1[6], 3, 'W-' + (w++));
  const G1 = masse(P1, '901G', 1.2, 1.0); { const p = E1[6].borne(1); connecteur(P1, [p, [1.2, p[1]], G1.p], { maitre: 2, texte: 'W-' + (w++), colles: [{ cote: 'B', forme: E1[6].id, cellule: 'Connections.X1', part: 100 }, { cote: 'E', forme: G1.id, cellule: 'Connections.X1', part: 100 }] }); verite.push({ de: E1[6].nom, borneDe: '1', vers: '901G', borneVers: '', page: 'Page-1' }); }
  // des renvois : 3 câbles de la page 1 partent vers la page 2 (le maître Off-page reference, son lien, ses données OPC)
  const P2 = pages[1], E2 = [equip(P2, '310CP1', 4, 8), equip(P2, '311CP2', 4, 5)];
  const renvoi = (P, px, py, versPage, versForme, cle) => { const id = P.id_(); P.maitres.push(8);
    P.formes.push(`<Shape ID='${id}' NameU='Off-page reference.${id}' Name='Off-page reference.${id}' Type='Shape' Master='8'>${C('PinX', px)}${C('PinY', py)}<Section N='User'><Row N='OPCDocID'>${C('Value', 0)}</Row><Row N='OPCPageID'>${C('Value', versPage === 'Page-2' ? 4 : 0)}</Row><Row N='OPCShapeID'>${C('Value', cle, null, 'STR')}</Row></Section>`
      + `<Section N='Hyperlink'><Row N='OffPageConnector'>${C('Description', '', null, 'STR')}${C('Address', '', null, 'STR')}${C('SubAddress', versPage + '/Off-page reference.' + versForme, null, 'STR')}</Row></Section><Text>${x(versPage)}</Text></Shape>`); return { id, p: [px - 0.25, py], q: [px + 0.25, py] }; };
  [[E1[1], 5, E2[0], 1], [E1[3], 4, E2[0], 2], [E1[7], 5, E2[1], 3]].forEach(([a, na, b, nb], k) => { const cle = '{A' + k + '}';
    const o1 = renvoi(P1, 14.6, 9.3 - k * 1.1, 'Page-2', 900 + k, cle), o2 = renvoi(P2, 1.0, 8.6 - k * 1.6, 'Page-1', 800 + k, cle);
    const p = a.borne(na); connecteur(P1, [p, [p[0] + 0.6, p[1]], [p[0] + 0.6, o1.p[1]], o1.p], { maitre: 2, colles: [{ cote: 'B', forme: a.id, cellule: 'Connections.X' + na, part: 99 + na }, { cote: 'E', forme: o1.id, cellule: 'Connections.X1', part: 100 }] });
    const q = b.borne(nb); connecteur(P2, [o2.q, [q[0] - 0.8, o2.q[1]], [q[0] - 0.8, q[1]], q], { maitre: 2, colles: [{ cote: 'B', forme: o2.id, cellule: 'Connections.X2', part: 101 }, { cote: 'E', forme: b.id, cellule: 'Connections.X' + nb, part: 99 + nb }] });
    verite.push({ de: a.nom, borneDe: String(na), vers: b.nom, borneVers: String(nb), page: 'Page-1' }); });
  relie(P2, E2[0], 4, E2[1], 6, 'W-' + (w++)); relie(P2, E2[0], 5, E2[1], 5, 'W-' + (w++)); relie(P2, E2[0], 6, E2[1], 4, 'W-' + (w++));
  pages.forEach((P, k) => cartouche(P, [['N° DE PLAN', 'GB-7731-0' + (k + 1)], ['FOLIO', (k + 1) + ' / 2'], ['INDICE', 'C']]));
  return { nom: 'A', titre: 'gabarit', fichiers: paquet({ pages, maitres: M, titre: 'Essai A' }), verite }; }

/* ---- B « à la main » : rectangles, textes séparés, colle dynamique, lignes posées, T, jonction ---------------------- */
function styleB() {
  const P = page('Câblage', 0), verite = [];
  // un équipement : un rectangle et ses points (indexés), le repère au-dessus, les numéros de borne dans des textes à côté
  const equip = (nom, x0, y0, n, cotes = 'GD') => { const h = 0.32 * n + 0.2, w = 1.2, id = P.id_(), pts = [];
    for (let k = 0; k < n; k++) { const y = h - 0.26 - 0.32 * k; if (cotes.includes('G')) pts.push({ x: 0, y, b: String(k + 1) }); if (cotes.includes('D')) pts.push({ x: w, y, b: String(n + k + 1) }); }
    P.formes.push(`<Shape ID='${id}' NameU='Rectangle.${id}' Name='Rectangle.${id}' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(x0 + w / 2, y0 + h / 2, w, h)}${geoRect(w, h)}<Section N='Connection'>${pts.map((q, k) => `<Row T='Connection' IX='${k}'>${C('X', q.x)}${C('Y', q.y)}${C('DirX', 0)}${C('DirY', 0)}${C('Type', 0)}${C('AutoGen', 0)}${C('Prompt', '', 'No Formula')}</Row>`).join('')}</Section></Shape>`);
    texte(P, x0 + w / 2, y0 + h + 0.13, nom, { taille: 10 / 72 });
    pts.forEach(q => texte(P, x0 + q.x + (q.x ? -0.12 : 0.12), y0 + q.y + 0.08, q.b, { taille: 7 / 72 }));
    return { id, nom, borne: b => { const k = pts.findIndex(q => q.b === String(b)); return [x0 + pts[k].x, y0 + pts[k].y]; }, ix: b => pts.findIndex(q => q.b === String(b)), x0, y0, w, h }; };
  const A = equip('120RL1', 1.0, 7.0, 4), B = equip('121RL2', 6.0, 7.0, 4), Cc = equip('220CB4', 1.0, 3.0, 3), D = equip('221SW5', 6.0, 3.0, 3), Ee = equip('330LP7', 11.0, 5.0, 4);
  const v1 = (a, na, b, nb, pts, o) => { connecteur(P, pts, o); verite.push({ de: a.nom, borneDe: String(na), vers: b.nom, borneVers: String(nb), page: P.nom }); };
  // collés à la FORME entière (la colle dynamique) : le bout est sur le bord, au point de connexion le plus proche
  [[1, 5], [2, 6], [3, 7]].forEach(([na, nb]) => { const p = A.borne(na + 4), q = B.borne(nb - 4); v1(A, na + 4, B, nb - 4, [p, q], { colles: [{ cote: 'B', forme: A.id, dyn: true }, { cote: 'E', forme: B.id, dyn: true }] }); });
  // des LIGNES (l'outil Ligne : des formes 1-D, sans colle) posées pile sur le point de connexion
  { const p = A.borne(8), q = B.borne(4); v1(A, 8, B, 4, [p, q], { ligne: true }); }
  [[4, 1], [5, 2]].forEach(([na, nb]) => { const p = Cc.borne(na), q = D.borne(nb); v1(Cc, na, D, nb, [p, q], { ligne: true }); });
  // une ligne posée sur le BORD du rectangle, un rien à côté du point (0,8 mm)
  { const p = Cc.borne(6), q = D.borne(3); v1(Cc, 6, D, 3, [[p[0], p[1] + 0.03], [q[0], q[1] + 0.03]], { ligne: true }); }
  // une POLYLIGNE (une forme 2-D ouverte) de 121RL2:5 à 330LP7:1
  { const p = B.borne(5), q = Ee.borne(1), mx = 9.6, id = P.id_(), pts = [p, [mx, p[1]], [mx, q[1]], q], x0 = Math.min(...pts.map(t => t[0])), y0 = Math.min(...pts.map(t => t[1])), w = Math.max(...pts.map(t => t[0])) - x0, h = Math.max(...pts.map(t => t[1])) - y0;
    P.formes.push(`<Shape ID='${id}' NameU='Sheet.${id}' Name='Sheet.${id}' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(x0 + w / 2, y0 + h / 2, w, h)}<Section N='Geometry' IX='0'>${C('NoFill', 1)}${C('NoLine', 0)}<Row T='MoveTo' IX='1'>${C('X', p[0] - x0)}${C('Y', p[1] - y0)}</Row><Row T='PolylineTo' IX='2'>${C('X', q[0] - x0)}${C('Y', q[1] - y0)}${C('A', `POLYLINE(1, 1, ${pts[1][0] - x0}, ${pts[1][1] - y0}, ${pts[2][0] - x0}, ${pts[2][1] - y0})`)}</Row></Section></Shape>`);
    verite.push({ de: B.nom, borneDe: '5', vers: Ee.nom, borneVers: '1', page: P.nom }); }
  // un réseau à trois bouts : un connecteur de 121RL2:6 à 330LP7:2 ; un trait de 221SW5:4 qui monte et tombe en T sur son
  // dernier tronçon (un point de jonction dessus). Le long des traits : 121RL2:6 → T = 5,3 in, 330LP7:2 → T = 0,5,
  // 221SW5:4 → T = 5,3 : l'arbre le plus court relie 330LP7:2 aux deux autres
  { const p = B.borne(6), q = Ee.borne(2), mx = 10.0; const pts = [p, [mx, p[1]], [mx, q[1]], q]; connecteur(P, pts, { ligne: false, colles: [{ cote: 'B', forme: B.id, cellule: 'Connections.X' + (B.ix(6) + 1), part: 100 + B.ix(6) }, { cote: 'E', forme: Ee.id, cellule: 'Connections.X' + (Ee.ix(2) + 1), part: 100 + Ee.ix(2) }] });
    const r = D.borne(4), t = [(mx + q[0]) / 2, q[1]]; connecteur(P, [r, [t[0], r[1]], t], {}); const id = P.id_();
    P.formes.push(`<Shape ID='${id}' NameU='Circle.${id}' Name='Circle.${id}' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(t[0], t[1], 0.06, 0.06)}${C('FillForegnd', '#000000')}<Section N='Geometry' IX='0'><Row T='Ellipse' IX='1'>${C('X', 0.03)}${C('Y', 0.03)}${C('A', 0.06)}${C('B', 0.03)}${C('C', 0.03)}${C('D', 0.06)}</Row></Section></Shape>`);
    verite.push({ de: B.nom, borneDe: '6', vers: Ee.nom, borneVers: '2', page: P.nom }, { de: D.nom, borneDe: '4', vers: Ee.nom, borneVers: '2', page: P.nom }); }
  // un connecteur posé sans colle sur 330LP7:3 et 221SW5:5, son numéro dans un texte libre posé dessus
  { const p = D.borne(5), q = Ee.borne(3); connecteur(P, [p, [9.2, p[1]], [9.2, q[1]], q], {}); texte(P, 9.2, (p[1] + q[1]) / 2, 'W-77', { taille: 7 / 72, angle: Math.PI / 2 }); verite.push({ de: D.nom, borneDe: '5', vers: Ee.nom, borneVers: '3', page: P.nom }); }
  // un trait qui n'arrive nulle part (un orphelin) et un croisement sans point
  connecteur(P, [Ee.borne(4), [13.6, Ee.borne(4)[1]]], { ligne: true });
  cartouche(P, [['TITRE', 'Essai B'], ['N° DE PLAN', 'HM-102'], ['FOLIO', '1']]);
  return { nom: 'B', titre: 'à la main', fichiers: paquet({ pages: [P], titre: 'Essai B' }), verite }; }

/* ---- C « données » : bornes en sous-formes, repères dans les données, points nommés, arrière-plan, trois pages ------- */
function styleC() {
  const verite = [], fond = page('Arrière-plan', 9, { fond: true }), pages = [page('F1', 1, { arriere: 9 }), page('F2', 2, { arriere: 9 }), page('F3', 3, { arriere: 9 })];
  cartouche(fond, [['TITRE', 'Pompes'], ['N° DE PLAN', 'EL-5512'], ['INDICE', 'B']]);
  // un équipement : un groupe ; son texte dit ce qu'il fait, son repère est dans ses DONNÉES ; chaque borne est une petite forme
  // avec un point de connexion (nommé : A1, A2…) et son numéro dans son texte
  const equip = (P, rep, desig, x0, y0, bornes) => { const id = P.id_(), parCote = Math.max(...['G', 'D'].map(c => bornes.filter(b => b.cote === c).length)), w = 1.6, h = 0.3 * parCote + 0.5, sous = [];
    const corps = P.id_(); sous.push(`<Shape ID='${corps}' NameU='Sheet.${corps}' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(w / 2, h / 2, w - 0.3, h)}${geoRect(w - 0.3, h)}</Shape>`);
    const ids = {};
    bornes.forEach((b, k) => { const sid = P.id_(), gauche = b.cote === 'G', y = h - 0.35 - 0.3 * bornes.slice(0, k).filter(q => q.cote === b.cote).length;
      const bx = gauche ? 0.08 : w - 0.08; ids[b.n] = { id: sid, p: [x0 + bx + (gauche ? -0.08 : 0.08), y0 + y] };
      sous.push(`<Shape ID='${sid}' NameU='Pin.${sid}' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(bx, y, 0.16, 0.16)}${C('FillForegnd', '#ffffff')}<Section N='Connection'><Row N='${b.n}' T='Connection'>${C('X', gauche ? 0 : 0.16)}${C('Y', 0.08)}${C('DirX', 0)}${C('DirY', 0)}${C('Type', 0)}</Row></Section>${geoRect(0.16, 0.16)}<Section N='Character'><Row IX='0'>${C('Size', 5 / 72)}</Row></Section><Text>${x(b.n)}</Text></Shape>`); });
    P.formes.push(`<Shape ID='${id}' NameU='Group.${id}' Name='Group.${id}' Type='Group' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(x0 + w / 2, y0 + h / 2, w, h)}${C('TxtPinY', -0.15)}<Section N='Property'><Row N='Tag'>${C('Value', rep, null, 'STR')}${C('Label', 'Repère', null, 'STR')}${C('Type', 0)}</Row><Row N='PartNumber'>${C('Value', 'D38999/26WB35PN', null, 'STR')}${C('Label', 'Part number', null, 'STR')}${C('Type', 0)}</Row></Section>`
      + `<Text>${x(desig)}</Text><Shapes>${sous.join('')}</Shapes></Shape>`);
    return { id, nom: rep, borne: n => ids[n] }; };
  // (sans coude donné : un Z orthogonal, sa verticale au milieu)
  const glue = (P, a, na, b, nb, pts, texteC) => { const pa = a.borne(na), pb = b.borne(nb), mx = (pa.p[0] + pb.p[0]) / 2;
    if (!pts.length && Math.abs(pa.p[1] - pb.p[1]) > 1e-9) pts = [[mx, pa.p[1]], [mx, pb.p[1]]];
    connecteur(P, [pa.p, ...pts, pb.p], { texte: texteC, colles: [{ cote: 'B', forme: pa.id, cellule: 'Connections.' + na + '.X', part: 100 }, { cote: 'E', forme: pb.id, cellule: 'Connections.' + nb + '.X', part: 100 }] });
    verite.push({ de: a.nom, borneDe: na, vers: b.nom, borneVers: nb, page: P.nom }); };
  const deux = n => [...Array(n)].flatMap((_, k) => [{ n: 'A' + (k + 1), cote: 'G' }, { n: 'B' + (k + 1), cote: 'D' }]);
  const [P1, P2, P3] = pages;
  const K12 = equip(P1, 'K12', 'Relais pompe', 1.5, 7.0, deux(4)), J101 = equip(P1, 'J101', 'Prise moteur', 7.0, 7.0, deux(4)), K13 = equip(P1, 'K13', 'Relais vanne', 1.5, 3.0, deux(3)), J102 = equip(P1, 'J102', 'Prise vanne', 7.0, 3.0, deux(3));
  for (let k = 1; k <= 4; k++) glue(P1, K12, 'B' + k, J101, 'A' + k, [], 'DR22');
  for (let k = 1; k <= 3; k++) glue(P1, K13, 'B' + k, J102, 'A' + k, [], 'DR24');
  glue(P1, K12, 'A1', K13, 'A1', [[1.2, K12.borne('A1').p[1]], [1.2, K13.borne('A1').p[1]]], '');
  // des renvois par le NOM du signal : « CMD-P1 » sur F1 et sur F2 (sans lien : leur texte les apparie)
  const renvoi = (P, px, py, s) => { const id = P.id_(); P.formes.push(`<Shape ID='${id}' NameU='Off-page reference.${id}' Name='Off-page reference.${id}' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(px, py, 0.9, 0.24)}<Section N='Connection'><Row T='Connection' IX='0'>${C('X', 0)}${C('Y', 0.12)}</Row><Row T='Connection' IX='1'>${C('X', 0.9)}${C('Y', 0.12)}</Row></Section>${geoRect(0.9, 0.24)}<Text>${x(s)}</Text></Shape>`);
    return { id, g: [px - 0.45, py], d: [px + 0.45, py] }; };
  const versRenvoi = (P, a, na, o, cote, pts) => { const pa = a.borne(na); connecteur(P, cote === 'G' ? [pa.p, ...pts, o.g] : [o.d, ...pts, pa.p], { colles: cote === 'G' ? [{ cote: 'B', forme: pa.id, cellule: 'Connections.' + na + '.X', part: 100 }, { cote: 'E', forme: o.id, cellule: 'Connections.X1', part: 100 }] : [{ cote: 'B', forme: o.id, cellule: 'Connections.X2', part: 101 }, { cote: 'E', forme: pa.id, cellule: 'Connections.' + na + '.X', part: 100 }] }); };
  const M1 = equip(P2, 'M1', 'Moteur pompe', 6.0, 7.0, [{ n: '1', cote: 'G' }, { n: '2', cote: 'G' }, { n: '3', cote: 'G' }]), V1 = equip(P3, 'V1', 'Vanne', 6.0, 7.0, [{ n: '1', cote: 'G' }, { n: '2', cote: 'G' }]);
  [['CMD-P1', J101, 'B1', M1, '1', P2], ['CMD-P2', J101, 'B2', M1, '2', P2], ['RET-P', J101, 'B3', M1, '3', P2], ['CMD-V', J102, 'B1', V1, '1', P3], ['RET-V', J102, 'B2', V1, '2', P3]].forEach(([s, a, na, b, nb, Pb], k) => {
    const pa = a.borne(na).p, o1 = renvoi(P1, 13.0, pa[1], s); versRenvoi(P1, a, na, o1, 'G', []);
    const pb = b.borne(nb).p, o2 = renvoi(Pb, 2.0, pb[1], s); versRenvoi(Pb, b, nb, o2, 'D', []);
    verite.push({ de: a.nom, borneDe: na, vers: b.nom, borneVers: nb, page: 'F1' }); void k; });
  // sur F2 : un autre groupe et ses liaisons locales
  const X5 = equip(P2, 'K14', 'Relais secours', 1.5, 3.0, deux(2)); glue(P2, X5, 'B1', M1, '1', [[4.5, X5.borne('B1').p[1]], [4.5, M1.borne('1').p[1]]], 'DR20'); glue(P2, X5, 'B2', M1, '3', [[4.8, X5.borne('B2').p[1]], [4.8, M1.borne('3').p[1]]], 'DR20');
  return { nom: 'C', titre: 'données', fichiers: paquet({ pages, fonds: [fond], titre: 'Essai C' }), verite }; }

/* ---- D « tournés » : des groupes TOURNÉS et RETOURNÉS, des groupes dans des groupes, la colle sur une sous-sous-forme,
   des connecteurs COURBES (NURBS), un repère écrit en partie par un champ, deux pages et un renvoi par son seul lien ----- */
function styleD() {
  const verite = [], P1 = page('Schéma 1', 0), P2 = page('Schéma 2', 1);
  // la géométrie, ici, à part : local → parent (retirer LocPin, retourner, tourner, ajouter Pin)
  const vers = (t, q) => { const x = (q[0] - t.lx) * (t.fx ? -1 : 1), y = q[1] - t.ly, c = Math.cos(t.a), s = Math.sin(t.a); return [t.px + c * x - s * y, t.py + s * x + c * y]; };
  const equip = (P, morceaux, px, py, a, fx, n) => { const W = 1.4, H = 0.3 * n + 0.4, id = P.id_(), tG = { px, py, lx: W / 2, ly: H / 2, a, fx }, sub = P.id_(), tS = { px: 0.25, py: H / 2, lx: 0.2, ly: H / 2 - 0.05, a: 0, fx: 0 }, bornes = {};
    const pins = [...Array(n)].map((_, k) => { const pid = P.id_(), y = H - 0.25 - 0.3 * k, tP = { px: 0.1, py: y - 0.05, lx: 0.1, ly: 0.1, a: 0, fx: 0 };
      // le point de connexion de la borne : son bord gauche, au milieu ; en page, à travers les trois repères
      bornes[k + 1] = { id: pid, p: vers(tG, vers(tS, vers(tP, [0, 0.1]))) };
      return `<Shape ID='${pid}' NameU='Pin.${pid}' Name='Pin.${pid}' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(tP.px, tP.py, 0.2, 0.2)}${geoRect(0.2, 0.2)}<Section N='Connection'><Row T='Connection' IX='0'>${C('X', 0)}${C('Y', 0.1, 'Height*0.5')}${C('Type', 0)}</Row></Section><Section N='Character'><Row IX='0'>${C('Size', 6 / 72)}</Row></Section><Text>${k + 1}</Text></Shape>`; });
    const champ = morceaux.map(m => m.champ ? `<fld IX='0'>${x(m.s)}</fld>` : x(m.s)).join('');
    P.formes.push(`<Shape ID='${id}' NameU='Bloc.${id}' Name='Bloc.${id}' Type='Group' LineStyle='3' FillStyle='3' TextStyle='3'>${C('PinX', px)}${C('PinY', py)}${C('Width', W)}${C('Height', H)}${C('LocPinX', W / 2)}${C('LocPinY', H / 2)}${C('Angle', a)}${C('FlipX', fx ? 1 : 0)}${C('FlipY', 0)}${C('TxtPinX', W / 2 + 0.2)}${C('TxtPinY', H / 2)}`
      + `<Section N='Field'><Row IX='0'>${C('Value', morceaux.find(m => m.champ).s, 'Prop.Zone', 'STR')}${C('Format', '', null, 'STR')}${C('Type', 2)}</Row></Section><Section N='Character'><Row IX='0'>${C('Size', 9 / 72)}</Row></Section>`
      + `<Text>${champ}</Text><Shapes><Shape ID='${P.id_()}' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(W / 2 + 0.2, H / 2, W - 0.4, H)}${geoRect(W - 0.4, H)}</Shape>`
      + `<Shape ID='${sub}' NameU='Connecteur.${sub}' Name='Connecteur.${sub}' Type='Group' LineStyle='3' FillStyle='3' TextStyle='3'>${C('PinX', tS.px)}${C('PinY', tS.py)}${C('Width', 0.4)}${C('Height', H - 0.1)}${C('LocPinX', tS.lx)}${C('LocPinY', tS.ly)}${C('Angle', 0)}<Shapes>${pins.join('')}</Shapes></Shape></Shapes></Shape>`);
    return { nom: morceaux.map(m => m.s).join(''), borne: k => bornes[k] }; };
  // un connecteur courbe : sa géométrie en NURBS (des points de contrôle, comme Visio les écrit), collé aux deux bornes
  const courbe = (P, a, na, b, nb, texteC) => { const pa = a.borne(na), pb = b.borne(nb), id = P.id_(), B = pa.p, E = pb.p, W = E[0] - B[0], H = E[1] - B[1];
    const c1 = [0.3, 0.1], c2 = [0.7, 0.9];   // (type 0 : relatifs à la largeur et à la hauteur)
    P.formes.push(`<Shape ID='${id}' NameU='Curved connector.${id}' Name='Curved connector.${id}' Type='Shape' LineStyle='7' FillStyle='7' TextStyle='7'>${C('PinX', (B[0] + E[0]) / 2)}${C('PinY', (B[1] + E[1]) / 2)}${C('Width', W)}${C('Height', H)}${C('LocPinX', W / 2)}${C('LocPinY', H / 2)}${C('Angle', 0)}`
      + `${C('BeginX', B[0], `PAR(PNT(Sheet.${pa.id}!Connections.X1,Sheet.${pa.id}!Connections.Y1))`)}${C('BeginY', B[1], `PAR(PNT(Sheet.${pa.id}!Connections.X1,Sheet.${pa.id}!Connections.Y1))`)}${C('EndX', E[0], `PAR(PNT(Sheet.${pb.id}!Connections.X1,Sheet.${pb.id}!Connections.Y1))`)}${C('EndY', E[1], `PAR(PNT(Sheet.${pb.id}!Connections.X1,Sheet.${pb.id}!Connections.Y1))`)}${C('ObjType', 2)}${C('ShapeRouteStyle', 16)}${C('ConLineRouteExt', 2)}`
      + `<Section N='Geometry' IX='0'>${C('NoFill', 1)}<Row T='MoveTo' IX='1'>${C('X', 0)}${C('Y', 0)}</Row><Row T='NURBSTo' IX='2'>${C('X', W)}${C('Y', H)}${C('A', 1)}${C('B', 1)}${C('C', 0)}${C('D', 1)}${C('E', `NURBS(1, 3, 0, 0, ${c1[0]}, ${c1[1]}, 0, 1, ${c2[0]}, ${c2[1]}, 0, 1)`)}</Row></Section>`
      + (texteC ? `<Text>${x(texteC)}</Text>` : '') + '</Shape>');
    // Visio n'écrit pas toujours les Connects : ici, seulement les formules (la colle se lit dans BeginX / EndX)
    verite.push({ de: a.nom, borneDe: String(na), vers: b.nom, borneVers: String(nb), page: P.nom }); };
  const Z = (z, s) => [{ s: z, champ: true }, { s }];
  const E = [equip(P1, Z('5', '01RL1'), 2.5, 8.5, 0, 0, 4), equip(P1, Z('5', '02RL2'), 2.5, 4.5, Math.PI / 2, 0, 4), equip(P1, Z('6', '10CP1'), 8.5, 8.5, 0, 1, 5), equip(P1, Z('6', '11CP2'), 8.5, 4.5, -Math.PI / 2, 1, 5), equip(P1, Z('7', '20SW3'), 13.5, 6.5, Math.PI, 0, 3)];
  [[0, 1, 2, 1], [0, 2, 2, 2], [0, 3, 2, 3], [0, 4, 2, 4], [1, 1, 3, 1], [1, 2, 3, 2], [1, 3, 3, 5], [1, 4, 3, 4], [2, 5, 4, 1], [3, 3, 4, 2], [4, 3, 0, 1]].forEach(([i, ni, j, nj], k) => {
    const a = E[i], b = E[j]; courbe(P1, a, ni, b, nj, k % 3 ? 'W-' + (900 + k) + ' DR22' : ''); });
  // le renvoi : sur chaque page, une forme « Off-page reference » qui pointe l'autre par son seul lien (Hyperlink)
  const F = [equip(P2, Z('8', '30PM1'), 6.0, 6.0, Math.PI / 2, 1, 3)];
  const renvoi = (P, px, py, cible, sienne) => { const id = P.id_(); P.formes.push(`<Shape ID='${id}' NameU='Off-page reference.${id}' Name='Off-page reference.${id}' Type='Shape' LineStyle='3' FillStyle='3' TextStyle='3'>${xform(px, py, 0.6, 0.3)}<Section N='Connection'><Row T='Connection' IX='0'>${C('X', 0)}${C('Y', 0.15)}</Row></Section>${geoRect(0.6, 0.3)}<Section N='Hyperlink'><Row N='Row_1'>${C('SubAddress', cible + '/Off-page reference.' + sienne, null, 'STR')}</Row></Section><Text>${x(cible)}</Text></Shape>`); return { id, p: [px - 0.3, py] }; };
  const r1 = P1.n, o1 = renvoi(P1, 15.0, 2.0, 'Schéma 2', P2.n), o2 = renvoi(P2, 2.0, 2.0, 'Schéma 1', r1);
  { const pa = E[3].borne(1); connecteur(P1, [pa.p, [pa.p[0], 2.0], o1.p], { colles: [{ cote: 'B', forme: pa.id, cellule: 'Connections.X1', part: 100 }, { cote: 'E', forme: o1.id, cellule: 'Connections.X1', part: 100 }] }); }
  { const pb = F[0].borne(2); connecteur(P2, [o2.p, [pb.p[0], 2.0], pb.p], { colles: [{ cote: 'B', forme: o2.id, cellule: 'Connections.X1', part: 100 }, { cote: 'E', forme: pb.id, cellule: 'Connections.X1', part: 100 }] }); }
  verite.push({ de: E[3].nom, borneDe: '1', vers: F[0].nom, borneVers: '2', page: P1.nom });
  return { nom: 'D', titre: 'tournés', fichiers: paquet({ pages: [P1, P2], titre: 'Essai D' }), verite }; }

function schemasVisio() { return [styleA(), styleB(), styleC(), styleD()]; }
module.exports = { schemasVisio, paquet, page, connecteur, texte };
