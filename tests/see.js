/* ===========================================================================
   LE PAQUET SEE — ce que l'Atelier écrit pour SEE Electrical Expert tient-il
   son contrat (see/FORMAT-PAQUET.md) ? Sans navigateur.
       node tests/see.js                 l'exemple, des câblages du corpus, le lot
       node tests/see.js --corpus-entier les soixante-douze câblages du banc au lieu de sept (lent)
       node tests/see.js --navigateur    et, à la vraie souris, la fiche « Exporter
                                         pour SEE » de la page : le même paquet que
                                         le lot, le dessin vu (retouche, affiné),
                                         l'écran jamais figé plus d'une seconde
       --captures=dossier                (avec --navigateur) la fiche en cours et finie
   L'Atelier est chargé comme le lot le charge (see/exporter.js : src/ dans
   l'ordre de construire.js, SheetJS à côté). On vérifie
     · que les feuilles et leurs colonnes sont EXACTEMENT celles du contrat,
       relues dans FORMAT-PAQUET.md lui-même, dans son ordre, en ASCII ;
     · sur les six folios de l'exemple, sur des câblages du corpus que rien
       n'a réglés, sur un contrat sans FWD que l'Atelier découpe (des renvois)
       et sur un collecteur de masse, le classeur RELU (XLSX.read) : le premier et le dernier point
       de chaque fil sont le point d'accroche de sa borne (au centième de mm),
       chaque segment est horizontal ou vertical, tout est dans la feuille
       (420 × 297), chaque liaison du folio est un fil du paquet (son numéro,
       ses deux repères, ses deux bornes), un bloc est unique dans son folio,
       une ligne de Bornes est unique (Bloc, Borne, Connecteur, Rond : les
       ronds d'une même borne numérotés de haut en bas) et chaque bout de fil
       en cite exactement une, dont l'accroche est son premier ou son dernier
       point ; le contact (CX, CY) est sur l'horizontale de l'accroche, sur la
       borne dessinée (le bord de la pièce, du corps, de la fiche, de
       l'embase, de la pastille du côté du fil, le trait de la masse) ; les
       nombres sont de vrais nombres au centième, les étiquettes du texte ;
     · que le dessin ne change pas : le SVG du folio est le même, au caractère
       près, avant et après l'export ; chaque numéro écrit sur le plan est
       relu, à sa place ;
     · qu'un fil posé sur un autre (une jonction) est prolongé jusqu'à sa borne,
       et que le folio le dit ;
     · le lot : `node see/exporter.js --exemple` (une sélection de folios, puis
       en deux tâches parallèles) écrit le même paquet que ce qu'on calcule ici,
       à la date près ; la version du moteur est celle d'index.html ;
     · le DXF de chaque folio (le repli, see/FORMAT-DXF.md), relu par une lecture
       maison : des paires code / valeur bien formées, R12, les sections, les
       tables, les blocs et leurs ATTDEF ; une insertion par borne, au contact
       du paquet, avec ses quatre attributs ; une LINE par segment, chaque fil
       d'une insertion de sa borne à l'autre, passant par les points du paquet,
       à l'index ACI de sa route ; les comptes égaux à ceux du modèle ;
       Windows-1252 ; le zip relu (CRC-32 recalculés bit à bit) ; `--dxf=
       dossier/` du lot ; et, --navigateur, le zip et le DXF d'un folio
       téléchargés depuis la fiche, et le bilan de la fiche, montré seulement
       s'il dit ce que le bouton referait (même contrat, fichier, folios).
   Tout tourne, puis rend 1 s'il y a eu un échec.
   =========================================================================== */
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const RACINE = path.join(__dirname, '..');
const E = require(path.join(RACINE, 'see', 'exporter.js'));
const { genererDansLaPage, PROFILS } = require('./corpus');
const A = E.chargerAtelier(), XLSX = A.XLSX;
const arg = k => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : null; };
let total = 0, echecs = 0;
const ok = (nom, cond, mesure) => { total++; if (!cond) echecs++; console.log('  ' + (cond ? 'OK    ' : 'ÉCHEC ') + nom + (mesure ? '   — ' + mesure : '')); };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'see-'));

/* ---- 1. le contrat, relu dans FORMAT-PAQUET.md ---------------------------- */
console.log('\n1. LES FEUILLES ET LEURS COLONNES SONT CELLES DU CONTRAT (see/FORMAT-PAQUET.md)');
const doc = fs.readFileSync(path.join(RACINE, 'see', 'FORMAT-PAQUET.md'), 'utf8');
const CONTRAT = {}, CLES_PAQUET = [];
doc.split(/^## /m).slice(1).forEach(s => { const m = /^Feuille `(\w+)`/.exec(s); if (!m) return;
  // la table des colonnes : la PREMIÈRE de la section (une autre peut suivre, qui explique)
  const lignes = s.split('\n'), i0 = lignes.findIndex(l => /^\|/.test(l)), i1 = i0 < 0 ? -1 : lignes.findIndex((l, i) => i > i0 && !/^\|/.test(l));
  const table = i0 < 0 ? [] : lignes.slice(i0, i1 < 0 ? lignes.length : i1).filter(l => !/^\|\s*-/.test(l)).slice(1);
  const noms = t => (t.match(/`([^`]+)`/g) || []).map(x => x.slice(1, -1));
  if (m[1] === 'Paquet') { CONTRAT.Paquet = noms(lignes.find(l => /colonnes/.test(l)) || ''); table.forEach(l => CLES_PAQUET.push(noms(l.split('|')[1])[0])); return; }
  CONTRAT[m[1]] = table.length ? table.flatMap(l => noms(l.split('|')[1])) : noms((lignes.find(l => /^`/.test(l)) || '').split(' : ')[0]); });
const FEUILLES = Object.keys(CONTRAT), SEE_COLONNES = A('SEE_COLONNES');
ok('le contrat se relit : huit feuilles, Paquet d’abord', FEUILLES.join(' ') === 'Paquet Folios Blocs Connecteurs Bornes Fils Jonctions Legende', FEUILLES.join(' '));
ok('les colonnes du code (SEE_COLONNES) sont celles du contrat, dans son ordre', FEUILLES.slice(1).every(f => JSON.stringify(SEE_COLONNES[f]) === JSON.stringify(CONTRAT[f])) && Object.keys(SEE_COLONNES).length === FEUILLES.length - 1,
  FEUILLES.slice(1).filter(f => JSON.stringify(SEE_COLONNES[f]) !== JSON.stringify(CONTRAT[f])).join(', ') || Object.values(CONTRAT).reduce((s, c) => s + c.length, 0) + ' colonnes');
ok('les en-têtes sont en ASCII, sans accent', Object.values(CONTRAT).flat().every(c => /^[A-Za-z0-9_]+$/.test(c)) && CLES_PAQUET.every(c => /^[a-z_]+$/.test(c)), CLES_PAQUET.join(' '));

/* ---- les contrôles d'un classeur relu ------------------------------------ */
const NUMERIQUES = { Folios: ['Folio', 'Echelle', 'Pas', 'CadreX', 'CadreY', 'CadreL', 'CadreH', 'NbBlocs', 'NbBornes', 'NbFils', 'Droits', 'Croisements'], Blocs: ['Folio', 'X', 'Y', 'L', 'H', 'RepereX', 'RepereY', 'Morceau'],
  Connecteurs: ['Folio', 'X0', 'X1', 'Haut', 'Bas', 'LettreX', 'LettreY'], Bornes: ['Folio', 'X', 'Y', 'PX', 'PY', 'Rond', 'CX', 'CY'], Fils: ['Folio', 'Ordre', 'Jauge', 'Longueur', 'NumeroX', 'NumeroY', 'NumeroAngle', 'DeRond', 'VersRond'], Jonctions: ['Folio', 'X', 'Y'], Legende: ['Folio', 'NbFils'] };
const TEXTES = { Folios: ['Plan', 'Nom'], Blocs: ['Bloc', 'Repere'], Bornes: ['Borne', 'Numero'], Fils: ['Fil', 'DeBorne', 'VersBorne', 'Points'] };
const MM = { Folios: ['Pas', 'CadreX', 'CadreY', 'CadreL', 'CadreH'], Blocs: ['X', 'Y', 'L', 'H', 'RepereX', 'RepereY'], Connecteurs: ['X0', 'X1', 'Haut', 'Bas', 'LettreX', 'LettreY'], Bornes: ['X', 'Y', 'PX', 'PY', 'CX', 'CY'], Fils: ['NumeroX', 'NumeroY'], Jonctions: ['X', 'Y'] };
const points = t => !t ? [] : String(t).split('|').map(p => p.trim().split(/\s+/).map(Number));
const pres = (a, b) => Math.abs(a - b) <= 0.01 + 1e-9;
/* Relit un classeur écrit (des octets) et rend ce qui ne va pas, contrôle par contrôle. `folios` : [{ L }] dans l'ordre du paquet. */
function verifierClasseur(octets, folios) {
  const wb = XLSX.read(octets, { type: 'buffer' }), F = {}, faute = {}, dire = (k, x) => { (faute[k] = faute[k] || []).push(x); };
  F.noms = wb.SheetNames;
  FEUILLES.forEach(n => { const ws = wb.Sheets[n]; if (!ws) { dire('feuilles', n + ' absente'); return; }
    const rangs = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }); if (JSON.stringify(rangs[0]) !== JSON.stringify(CONTRAT[n])) dire('colonnes', n + ' : ' + JSON.stringify(rangs[0]));
    F[n] = XLSX.utils.sheet_to_json(ws);
    // le type de chaque cellule : de vrais nombres, du texte pour les étiquettes, le centième
    const r = XLSX.utils.decode_range(ws['!ref']), col = c => rangs[0].indexOf(c);
    for (let i = 1; i <= r.e.r; i++) {
      (NUMERIQUES[n] || []).forEach(c => { const cel = ws[XLSX.utils.encode_cell({ r: i, c: col(c) })]; if (cel && cel.t !== 'n') dire('nombres', n + '.' + c + ' ligne ' + (i + 1) + ' : ' + cel.t + ' ' + cel.v); });
      (TEXTES[n] || []).forEach(c => { const cel = ws[XLSX.utils.encode_cell({ r: i, c: col(c) })]; if (cel && cel.t !== 's') dire('textes', n + '.' + c + ' ligne ' + (i + 1) + ' : ' + cel.t + ' ' + cel.v); });
      (MM[n] || []).forEach(c => { const cel = ws[XLSX.utils.encode_cell({ r: i, c: col(c) })]; if (cel && Math.abs(cel.v * 100 - Math.round(cel.v * 100)) > 1e-6) dire('centieme', n + '.' + c + ' = ' + cel.v); }); } });
  if (faute.feuilles) return { F, faute };
  const P = new Map(F.Paquet.map(r => [r.Cle, r.Valeur]));
  if (JSON.stringify(F.Paquet.map(r => r.Cle)) !== JSON.stringify(CLES_PAQUET)) dire('paquet', 'clés ' + F.Paquet.map(r => r.Cle).join(' '));
  if (P.get('format') !== 'paquet-see/1' || P.get('unite') !== 'mm' || P.get('origine') !== 'haut-gauche' || P.get('axe_y') !== 'bas' || P.get('feuille_l') !== 420 || P.get('feuille_h') !== 297 || P.get('folios') !== folios.length) dire('paquet', JSON.stringify([...P]));
  // les blocs : uniques dans leur folio ; les bornes et les connecteurs en citent un qui existe, sous le même repère
  const blocs = new Map(); F.Blocs.forEach(b => { const k = b.Folio + '|' + b.Bloc; if (blocs.has(k)) dire('unique', k); blocs.set(k, b); });
  [...F.Bornes, ...F.Connecteurs].forEach(x => { const b = blocs.get(x.Folio + '|' + x.Bloc); if (!b || b.Repere !== x.Repere) dire('bloc cité', x.Folio + '|' + x.Bloc + ' ' + x.Repere); });
  const t = v => v == null ? '' : String(v), groupe = (m, k, x) => (m.get(k) || m.set(k, []).get(k)).push(x);
  const bornes = new Map(); F.Bornes.forEach(x => groupe(bornes, x.Folio + '|' + x.Bloc + '|' + t(x.Borne), x));
  // une ligne de Bornes est unique par Bloc, Borne, Connecteur et Rond ; les ronds d'une même borne, 1…n de haut en bas, vide pour une ligne seule
  const memes = new Map(), cles = new Set();
  F.Bornes.forEach(x => { const k = x.Folio + '|' + x.Bloc + '|' + t(x.Borne) + '|' + t(x.Connecteur); groupe(memes, k, x);
    if (cles.has(k + '|' + t(x.Rond))) dire('clé de borne', k + '|' + t(x.Rond)); cles.add(k + '|' + t(x.Rond)); });
  memes.forEach((xs, k) => { if (xs.length === 1) { if (xs[0].Rond != null) dire('rond', k + ' : Rond ' + xs[0].Rond + ' pour une ligne seule'); return; }
    const tri = xs.slice().sort((a, b) => a.Y - b.Y || a.X - b.X); if (tri.some((x, i) => x.Rond !== i + 1)) dire('rond', k + ' : ' + tri.map(x => '(' + x.Y + ') ' + x.Rond).join(', ')); });
  // tout dans la feuille
  const dans = (x, y, quoi) => { if (x == null && y == null) return; if (!(x >= 0 && x <= 420 && y >= 0 && y <= 297)) dire('feuille', quoi + ' (' + x + ', ' + y + ')'); };
  F.Blocs.forEach(b => { dans(b.X, b.Y, 'bloc ' + b.Repere); dans(b.X + b.L, b.Y + b.H, 'bloc ' + b.Repere); dans(b.RepereX, b.RepereY, 'repère ' + b.Repere); });
  F.Connecteurs.forEach(c => { dans(c.X0, c.Haut, 'pièce ' + c.Repere); dans(c.X1, c.Bas, 'pièce ' + c.Repere); dans(c.LettreX, c.LettreY, 'lettre ' + c.Repere); });
  F.Bornes.forEach(x => { dans(x.X, x.Y, 'borne ' + x.Repere + ':' + x.Borne); dans(x.PX, x.PY, 'borne ' + x.Repere + ':' + x.Borne); });
  F.Jonctions.forEach(j => dans(j.X, j.Y, 'jonction'));
  // les fils : leurs bouts sur leurs bornes, des segments droits, chaque liaison du folio
  const voisins = new Map();   // ligne de Bornes → les bouts de fil qui y arrivent : { p (le bout), q (le point d'avant) }
  const couleurs = new Map(F.Legende.filter(r => r.Route).map(r => [r.Folio + '|' + r.Route, r.Couleur]));
  F.Fils.forEach(f => { const pts = points(f.Points), id = 'folio ' + f.Folio + ' ' + (f.Fil || 'fil ' + f.Ordre);
    pts.forEach(p => dans(p[0], p[1], id)); dans(f.NumeroX, f.NumeroY, 'numéro ' + id);
    if (f.NumeroAngle != null && f.NumeroAngle !== 0 && f.NumeroAngle !== 90) dire('angle', id + ' ' + f.NumeroAngle);
    /* chaque bout cite UNE ligne de Bornes (Bloc, Borne, Cote — le Connecteur d'une prise —, Rond) : le premier ou le dernier
       point du tracé est SON accroche, pas celle d'un autre rond de la même borne */
    [['De', pts[0], pts[1]], ['Vers', pts[pts.length - 1], pts[pts.length - 2]]].forEach(([b, p, q]) => { const xs = bornes.get(f.Folio + '|' + f[b + 'Bloc'] + '|' + t(f[b + 'Borne'])) || [];
      if (!xs.length) { dire('borne citée', id + ' ' + b + ' ' + f[b + 'Bloc'] + ':' + f[b + 'Borne']); return; }
      if (xs[0].Repere !== f[b + 'Repere']) dire('borne citée', id + ' ' + b + ' repère ' + f[b + 'Repere'] + ' / ' + xs[0].Repere);
      if (f[b + 'Cote'] && !xs.some(x => x.Connecteur === f[b + 'Cote'])) dire('côté', id + ' ' + b + ' ' + f[b + 'Cote']);
      const prise = c => c === 'FICHE' || c === 'EMBASE', la = xs.filter(x => (f[b + 'Cote'] ? x.Connecteur === f[b + 'Cote'] : !prise(x.Connecteur)) && t(x.Rond) === t(f[b + 'Rond']));
      if (la.length !== 1) { dire('borne citée', id + ' ' + b + ' ' + f[b + 'Bloc'] + ':' + f[b + 'Borne'] + ' rond ' + t(f[b + 'Rond']) + ' : ' + la.length + ' lignes'); return; }
      if (p && !(pres(la[0].X, p[0]) && pres(la[0].Y, p[1]))) dire('accroche', id + ' ' + b + ' (' + p + ') ≠ (' + la[0].X + ',' + la[0].Y + ')' + (xs.length > 1 ? ' rond ' + t(f[b + 'Rond']) : ''));
      if (p && q) groupe(voisins, la[0], { p, q }); });
    if (f.Shunt === 'O' ? pts.length !== 0 : pts.length < 2) dire('points', id + ' : ' + pts.length + ' point(s), shunt ' + f.Shunt);
    for (let i = 0; i + 1 < pts.length; i++) if (pts[i][0] !== pts[i + 1][0] && pts[i][1] !== pts[i + 1][1]) dire('segments', id + ' : (' + pts[i] + ')→(' + pts[i + 1] + ')');
    if (f.Couleur != null && !/^#[0-9a-f]{6}$/.test(f.Couleur)) dire('couleur', id + ' ' + f.Couleur);
    if (f.Route && couleurs.has(f.Folio + '|' + f.Route) && couleurs.get(f.Folio + '|' + f.Route) !== f.Couleur) dire('couleur', id + ' ' + f.Couleur + ' / légende ' + couleurs.get(f.Folio + '|' + f.Route)); });
  /* le contact (FORMAT-PAQUET, « Accroche, amorce, contact ») : sur l'horizontale de l'accroche, sur la borne dessinée — le
     bord extérieur de la pièce de connecteur (feuille Connecteurs) ou du corps, le bord de la fiche ou de l'embase, le trait
     de la masse, le bord de la pastille (rayon de 06 : 3,4, 4 ou 4,6 unités) du côté d'où vient le fil ; l'accroche d'un rail
     en pastille ou d'un collecteur */
  const pieces = new Map(); F.Connecteurs.forEach(c => groupe(pieces, c.Folio + '|' + c.Bloc, c));
  const echelle = new Map(F.Folios.map(r => [r.Folio, r.Echelle]));
  F.Bornes.forEach(x => { const b = blocs.get(x.Folio + '|' + x.Bloc) || {}, N = b.Nature, id = 'folio ' + x.Folio + ' ' + x.Repere + ':' + t(x.Borne) + (x.Rond ? ' rond ' + x.Rond : '') + ' (' + N + ')';
    if (x.CX == null || x.CY == null || !pres(x.CY, x.Y)) { dire('contact', id + ' : (' + x.CX + ', ' + x.CY + ') hors de l’horizontale de l’accroche ' + x.Y); return; }
    const u = 0.25 / echelle.get(x.Folio), ps = pieces.get(x.Folio + '|' + x.Bloc) || [];
    let attendu = null;
    if (N === 'PRISE') { const pc = ps.find(c => c.Lettre === x.Connecteur); attendu = pc ? (x.Connecteur === 'FICHE' ? pc.X0 : pc.X1) : NaN; }
    else if (x.Cote === 'G' || x.Cote === 'D') { const G = x.Cote === 'G', pc = x.Connecteur ? ps.find(c => c.Lettre === x.Connecteur && c.Cote === x.Cote && x.Y >= c.Haut - 0.01 && x.Y <= c.Bas + 0.01) : null;
      attendu = x.Connecteur ? (pc ? (G ? pc.X0 : pc.X1) : NaN) : G ? b.X : b.X + b.L; }
    else if (N === 'MASSE') attendu = x.PX;
    else if (N === 'BARRETTE' || N === 'BARRETTE_A_POSER') {
      const d = x.CX - x.PX, bord = [3.4, 4, 4.6].some(r => Math.abs(Math.abs(d) - r * u) <= 0.011);
      // une barrette : la pastille du côté de l'accroche ; une barrette à poser (le tracé finit au centre) : du côté du fil qui arrive, s'il arrive couché
      const vs = (voisins.get(x) || []).filter(v => pres(v.q[1], v.p[1])), loin = vs.find(v => Math.abs(v.q[0] - v.p[0]) > 4.6 * u + 0.011);
      const cote = v => bord && Math.sign(d) === Math.sign(v.q[0] - v.p[0]);
      const bon = N === 'BARRETTE' ? bord && Math.sign(d) === Math.sign(x.X - x.PX) : loin ? cote(loin) : pres(x.CX, x.PX) || vs.some(cote);
      if (!bon) dire('contact', id + ' : CX ' + x.CX + ', centre ' + x.PX + ', accroche ' + x.X + (vs.length ? ', fil venant de ' + vs[0].q[0] : '')); return; }
    else attendu = x.X;
    if (!pres(x.CX, attendu)) dire('contact', id + ' : CX ' + x.CX + ' au lieu de ' + attendu + ' (accroche ' + x.X + ')'); });
  folios.forEach((fo, k) => { const n = k + 1, fs2 = F.Fils.filter(f => f.Folio === n).sort((a, b) => a.Ordre - b.Ordre);
    if (fs2.length !== fo.L.length) dire('liaisons', 'folio ' + n + ' : ' + fs2.length + ' fils pour ' + fo.L.length + ' liaisons');
    fo.L.forEach((l, i) => { const f = fs2[i]; if (!f) return; const t = v => v == null ? '' : String(v);
      if (t(f.Fil) !== t(l.cable) || t(f.DeRepere) !== t(l.de) || t(f.VersRepere) !== t(l.vers)) dire('liaisons', 'folio ' + n + ' n° ' + (i + 1) + ' : ' + [f.Fil, f.DeRepere, f.VersRepere] + ' ≠ ' + [l.cable, l.de, l.vers]);
      else if (t(f.DeBorne) !== t(l.borneDe) || t(f.VersBorne) !== t(l.borneVers)) dire('bornes du contrat', 'folio ' + n + ' ' + (l.cable || 'n° ' + (i + 1)) + ' : ' + [f.DeBorne, f.VersBorne] + ' ≠ ' + [l.borneDe, l.borneVers]); });
    const fo2 = F.Folios.find(r => r.Folio === n); if (!fo2) { dire('folios', 'folio ' + n + ' absent'); return; }
    if (fo2.NbBlocs !== F.Blocs.filter(b => b.Folio === n).length || fo2.NbBornes !== F.Bornes.filter(b => b.Folio === n).length || fo2.NbFils !== fs2.length) dire('comptes', 'folio ' + n); });
  return { F, faute }; }
const CONTROLES = [['feuilles', 'les huit feuilles sont là'], ['colonnes', 'chaque feuille a les colonnes du contrat, dans son ordre'], ['paquet', 'l’en-tête dit le format, l’unité, l’origine, la feuille, le nombre de folios'],
  ['nombres', 'les nombres sont de vrais nombres'], ['textes', 'les étiquettes (bornes, plans, fils, points) restent du texte'], ['centieme', 'les millimètres sont au centième'],
  ['unique', 'un bloc est unique dans son folio'], ['bloc cité', 'chaque borne et chaque pièce citent un bloc qui existe, sous son repère'],
  ['clé de borne', 'une ligne de Bornes est unique (Folio, Bloc, Borne, Connecteur, Rond)'], ['rond', 'les ronds d’une même borne sont numérotés 1…n de haut en bas, une ligne seule n’a pas de Rond'],
  ['borne citée', 'chaque bout de fil cite exactement une ligne de Bornes (Bloc, Borne, Cote, Rond)'],
  ['côté', 'un bout sur une prise dit FICHE ou EMBASE, et la borne l’a'], ['accroche', 'le premier et le dernier point de chaque fil sont l’accroche de LA ligne qu’il cite (0,01 mm)'],
  ['contact', 'le contact (CX, CY) est sur l’horizontale de l’accroche, sur la borne dessinée : pièce, corps, fiche, embase, masse, bord de la pastille côté fil'],
  ['points', 'un fil a au moins deux points, un shunt aucun'], ['segments', 'chaque segment est horizontal ou vertical'], ['feuille', 'tout est dans la feuille (420 × 297 mm)'],
  ['angle', 'un numéro est couché (0) ou debout (90)'], ['couleur', 'la couleur d’un fil est celle de sa route dans la légende'],
  ['liaisons', 'chaque liaison du folio est un fil du paquet (numéro, repères), dans l’ordre'], ['bornes du contrat', 'et ses bornes sont celles du contrat'], ['comptes', 'les comptes de chaque folio sont justes'], ['folios', 'chaque folio a sa ligne']];
const rapporter = (titre, R) => CONTROLES.forEach(([k, nom]) => ok(titre + ' : ' + nom, !R.faute[k], R.faute[k] ? R.faute[k].length + ' — ' + R.faute[k].slice(0, 3).join(' ; ') : ''));
const octetsDe = (modeles, meta) => XLSX.write(A('classeurSEE')(modeles, meta), { type: 'buffer', bookType: 'xlsx', compression: true });

/* ---- 2. l'exemple ---------------------------------------------------------- */
console.log('\n2. LES SIX FOLIOS DE L’EXEMPLE');
const t0 = Date.now(), V = A('contratExemple')().map(A('liaison')), folios = E.foliosDuContrat(V), routes = A('couleursDeRoutes')(V), cartouche = A('nouveauContrat')().cartouche;
const filnums = s => (s.match(/<text class="filnum"/g) || []).length;
const modeles = [], dessins = [];
let svgIdentique = true, numerosRelus = true, deterministe = true, detailNum = [];
folios.forEach((f, i) => { const P = A('meilleurPlacement')(f.L), d = A('dessinDuPlacement')(P, f.L, routes), svg = () => A('svgAutonome')(d, cartouche, '', () => '', '#ffffff').txt;
  const avant = svg(), m = A('modeleSEE')(d, f.L, { folio: i + 1, plan: f.plan, cartouche }), apres = svg();
  if (avant !== apres) svgIdentique = false;
  const n = m.fils.filter(x => x.NumeroX != null).length; if (n !== filnums(avant)) { numerosRelus = false; detailNum.push('folio ' + f.plan + ' : ' + n + ' / ' + filnums(avant)); }
  if (JSON.stringify(A('modeleSEE')(d, f.L, { folio: i + 1, plan: f.plan, cartouche })) !== JSON.stringify(m)) deterministe = false;
  modeles.push(m); dessins.push({ d, P, f }); });
console.log('     (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s : placement et modèle des six folios)');
ok('six folios, un modèle chacun, rangés 1 à 6, chacun avec son plan', modeles.length === 6 && modeles.every((m, i) => m.folio.Folio === i + 1 && m.folio.Plan === String(i + 1)));
const ex = verifierClasseur(octetsDe(modeles, { fichier: 'Contrat d’exemple', contrat: cartouche.titre }), folios);
rapporter('l’exemple', ex);
{ // les deux constats de la relecture, sur l'exemple : des bornes à plusieurs ronds (le folio 3 en a), des amorces de plusieurs millimètres
  const R = ex.F, ronds = new Map(); R.Bornes.forEach(b => { if (b.Rond) { const k = b.Folio + '|' + b.Bloc + '|' + b.Borne; ronds.set(k, (ronds.get(k) || 0) + 1); } });
  const bouts = R.Fils.reduce((s, f) => s + (f.DeRond ? 1 : 0) + (f.VersRond ? 1 : 0), 0);
  ok('l’exemple a des bornes de barrette à plusieurs ronds (un rond par fil) : chacune numérotée, les fils qui y arrivent citent le leur', ronds.size > 0 && bouts > 0, ronds.size + ' bornes, ' + [...ronds.values()].reduce((s, n) => s + n, 0) + ' ronds, ' + bouts + ' bouts de fil');
  const pr = R.Bornes.filter(b => b.Folio === 2 && b.Repere === '408VC1A'), corps = R.Blocs.find(b => b.Folio === 2 && b.Repere === '408VC1A'), dedans = x => x >= corps.X - 0.01 && x <= corps.X + corps.L + 0.01;
  ok('folio 2 : chaque contact de la prise 408VC1A est SUR la prise (fiche ou embase), son accroche au-dehors, au bout de l’amorce', pr.length && pr.every(b => dedans(b.CX) && !dedans(b.X)),
    'corps ' + corps.X + '…' + (corps.X + corps.L) + ' · ' + pr.slice(0, 2).map(b => b.Connecteur + ' ' + b.Borne + ' : accroche ' + b.X + ', contact ' + b.CX).join(' ; ')); }
ok('l’exemple se dessine sans rien simplifier (aucune remarque)', ex.F.Folios.every(r => !r.Remarque), ex.F.Folios.filter(r => r.Remarque).map(r => r.Folio + ' : ' + r.Remarque).join(' ; '));
ok('le dessin ne change pas : le SVG de chaque folio est le même au caractère près avant et après l’export', svgIdentique);
ok('chaque numéro écrit sur le plan est relu (autant de NumeroX que de numéros dans le SVG)', numerosRelus, detailNum.join(' ; ') || modeles.reduce((s, m) => s + m.fils.filter(x => x.NumeroX != null).length, 0) + ' numéros');
ok('le modèle est déterministe : deux fois le même folio, deux fois le même modèle', deterministe);
{ // ce que le folio 1 dessine : la barrette à poser VT1, son fil à créer, ses pontages ; W-011 droit, son numéro dedans
  const R = ex.F, fl = R.Fils.filter(x => x.Folio === 1), vt = R.Blocs.find(b => b.Folio === 1 && b.Repere === 'VT1'), w11 = fl.find(x => x.Fil === 'W-011'), cree = fl.find(x => !x.Fil && x.VersRepere === 'VT1' && x.Shunt === 'N');
  ok('folio 1 : VT1 est une BARRETTE_A_POSER ; le fil à créer (sans numéro) va de 102CB1:2 à sa borne 1, ses deux pontages sont des shunts', vt && vt.Nature === 'BARRETTE_A_POSER' && cree && cree.DeRepere === '102CB1' && cree.DeBorne === '2' && cree.VersBorne === '1' && cree.VersBloc === vt.Bloc && fl.filter(x => x.DeRepere === 'VT1' && x.VersRepere === 'VT1' && x.Shunt === 'O').length === 2,
    JSON.stringify(cree));
  const p = points(w11.Points);
  ok('folio 1 : W-011 est droit, son numéro est couché dessus, entre ses deux bouts', p.length === 2 && p[0][1] === p[1][1] && w11.NumeroAngle === 0 && Math.abs(w11.NumeroY - p[0][1]) < 1.5 && w11.NumeroX > Math.min(p[0][0], p[1][0]) && w11.NumeroX < Math.max(p[0][0], p[1][0]), w11.Points + ' · ' + w11.NumeroX + ' ' + w11.NumeroY);
  const fo = R.Folios.find(r => r.Folio === 1), d0 = dessins[0].d;
  ok('folio 1 : l’échelle et le pas sont ceux de la page (k, 14 unités)', fo.Echelle === Math.round(d0.bbox.k * 10000) / 10000 && Math.abs(fo.Pas - 14 / d0.bbox.k * 0.25) < 0.006, fo.Echelle + ' · ' + fo.Pas + ' mm');
  const pr = R.Bornes.filter(b => b.Folio === 2 && b.Repere === '408VC1A');
  ok('folio 2 : chaque contact de la prise 408VC1A a deux lignes, FICHE à gauche, EMBASE à droite', pr.length > 0 && pr.length % 2 === 0 && pr.filter(b => b.Connecteur === 'FICHE').every(b => pr.some(e => e.Connecteur === 'EMBASE' && e.Borne === b.Borne && e.X > b.X)), pr.length + ' lignes');
  const morceaux = R.Blocs.filter(b => b.Folio === 2 && b.Repere === '667VT21').map(b => b.Morceau).sort().join(',');
  ok('folio 2 : la barrette 667VT21 coupée en trois morceaux, numérotés 1, 2, 3 ; les masses aussi', morceaux === '1,2,3' && R.Blocs.filter(b => b.Folio === 2 && b.Nature === 'MASSE').every(b => b.Morceau && (b.Sens === 'G' || b.Sens === 'D')), morceaux); }

/* ---- 3. une jonction : le fil est prolongé jusqu'à sa borne ---------------- */
console.log('\n3. UN FIL QUI PART D’UNE JONCTION');
{ const { d, f } = dessins[0], w = d.fils.find(x => x.cable === 'W-011'), g = Math.sign(w.pts[1].x - w.pts[0].x) * 10;
  // W-011 commence ici à dix unités de sa borne, comme un fil qui part du fil d'un autre
  const d2 = { ...d, fils: d.fils.map(x => x === w ? { ...x, pts: [{ x: w.pts[0].x + g, y: w.pts[0].y }, ...w.pts.slice(1)] } : x) };
  const m = A('modeleSEE')(d2, f.L, { folio: 1, plan: f.plan, cartouche }), r = m.fils.find(x => x.Fil === 'W-011'), b = m.bornes.find(x => x.Bloc === r.DeBloc && x.Borne === r.DeBorne);
  ok('W-011 coupé de sa borne : le tracé repart du point d’accroche de 101BT1:1, et le folio le dit', b && r.Points[0][0] === b.X && r.Points[0][1] === b.Y && /prolongé/.test(m.folio.Remarque || ''), JSON.stringify(r.Points) + ' · ' + m.folio.Remarque); }

/* ---- 4. le corpus ----------------------------------------------------------- */
console.log('\n4. DES CÂBLAGES QU’AUCUN RÉGLAGE N’A VUS (tests/corpus.js), UN CONTRAT DÉCOUPÉ, UN COLLECTEUR');
const generer = A('(' + genererDansLaPage.toString() + ')');
// des graines du banc (tests/banc-corpus.js : 1000 + 37 × profil + 101 × k) : piquages (barrettes à poser), rails, prises, une barrette longue, des connecteurs, sans calculateur, un mélange
const CAS = [[1370, 'piquages'], [1407, 'rails'], [1185, 'prises'], [1444, 'barretteLongue'], [1333, 'connecteurs'], [1148, 'sans'], [1629, 'mixte']];
// --corpus-entier : les soixante-douze câblages du banc (quatre graines par profil), une dizaine de minutes
if (process.argv.includes('--corpus-entier')) { CAS.length = 0; PROFILS.forEach((p, i) => { for (let k = 0; k < 4; k++) CAS.push([1000 + 37 * i + 101 * k, p]); }); }
const t1 = Date.now(), mc = [], fc = [];
const ajouter = (nom, L) => E.foliosDuContrat(L).forEach(f => { f.numero = mc.length + 1; const r = E.modeleDuFolio(f, { routes: [...A('couleursDeRoutes')(L)], cartouche }); mc.push(r.modele); fc.push(f);
  const k = {}; r.modele.blocs.forEach(b => { k[b.Nature] = (k[b.Nature] || 0) + 1; });
  console.log('     ' + (nom + (f.plan ? ' f' + f.plan : '')).padEnd(22) + String(f.L.length).padStart(4) + ' liaisons ' + ((r.ms / 1000).toFixed(1) + ' s').padStart(7) + '  ' + Object.entries(k).map(([n, c]) => c + ' ' + n.toLowerCase()).join(', ') + (r.modele.folio.Remarque ? '\n       ! ' + r.modele.folio.Remarque : '')); });
CAS.forEach(([g, p]) => ajouter(p + '-' + g, generer([g, p]).map(A('liaison'))));
// sans FWD et trop grand pour une feuille, l'Atelier le découpe (07, `decouperEnFolios`) : des RENVOIS d'un folio à l'autre
ajouter('géant découpé', A('decouperEnFolios')(generer([1555, 'geant']).map(l => A('liaison')({ ...l, plan: '' })), 9).liaisons.map(A('liaison')));
// une masse reliée à une autre : un COLLECTEUR ; un rail (L1) qui porte son part number en guise de borne
const li = o => A('liaison')({ type: 'DR20', plan: '1', ...o });
ajouter('collecteur et rail', [li({ de: '101BT1', borneDe: '1', vers: '904G', cable: 'W-1' }), li({ de: '904G', vers: '905G', cable: 'W-2' }), li({ de: '101BT1', borneDe: '2', vers: '102CB1', borneVers: '1', cable: 'W-3' }), li({ de: '102CB1', borneDe: '2', vers: 'L1', pnVers: 'PN-L1', cable: 'W-4' })]);
console.log('     (' + ((Date.now() - t1) / 1000).toFixed(1) + ' s)');
const co = verifierClasseur(octetsDe(mc, { fichier: 'corpus' }), fc);
rapporter('le corpus', co);
const natures = new Set(co.F.Blocs.map(b => b.Nature));
ok('toutes les natures du contrat y passent : équipement, barrette, barrette à poser, prise, masse, rail, collecteur, renvoi', ['EQUIPEMENT', 'BARRETTE', 'BARRETTE_A_POSER', 'PRISE', 'MASSE', 'RAIL', 'COLLECTEUR', 'RENVOI'].every(n => natures.has(n)), [...natures].join(' '));
{ const n = mc.length, r = co.F.Bornes.find(b => b.Folio === n && b.Repere === 'L1'), w = co.F.Fils.find(f => f.Folio === n && f.Fil === 'W-4');   // le dernier folio : le collecteur et le rail
  ok('la borne d’un rail est celle du retest (vide ici), pas le part number que le moteur lui donne pour étiquette', r && r.Borne == null && w && w.VersBloc === r.Bloc, JSON.stringify(r)); }

/* ---- 5. le lot -------------------------------------------------------------- */
console.log('\n5. LE LOT : node see/exporter.js');
/* Un paquet relu, sans ce qui dépend du jour (la date de l'export, celle du cartouche) — et, `sansContacts`, sans les
   contacts à sertir, que seule la page connaît (ses choix de bible et de norme) : le lot ne les écrit pas. */
const relu = (octets, sansContacts) => { const wb = XLSX.read(octets, { type: 'buffer' }), o = {};
  wb.SheetNames.forEach(n => { o[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: null }); });
  o.Paquet = o.Paquet.filter(r => r[0] !== 'date'); o.Folios.slice(1).forEach(r => { r[o.Folios[0].indexOf('Date')] = null; });
  if (sansContacts) o.Bornes.slice(1).forEach(r => { r[o.Bornes[0].indexOf('Contact')] = r[o.Bornes[0].indexOf('Sexe')] = null; });
  return o; };
const sansDates = (octets, sansContacts) => JSON.stringify(relu(octets, sansContacts));
// la première cellule qui diffère entre deux paquets relus, pour le dire
const ecart = (a, b) => { for (const n of Object.keys(a)) { const A1 = a[n], B1 = b[n] || []; for (let i = 0; i < Math.max(A1.length, B1.length); i++) { const r = A1[i] || [], q = B1[i] || [];
  for (let j = 0; j < Math.max(r.length, q.length); j++) if (JSON.stringify(r[j]) !== JSON.stringify(q[j])) return n + ' ligne ' + (i + 1) + ' ' + ((A1[0] || [])[j] || j) + ' : ' + JSON.stringify(r[j]) + ' / ' + JSON.stringify(q[j]); } } return ''; };
const lot = (args, sortie) => { const t = Date.now(), r = spawnSync(process.execPath, [path.join(RACINE, 'see', 'exporter.js'), ...args, '--sortie=' + sortie], { encoding: 'utf8', timeout: 600000 });
  return { ...r, s: ((Date.now() - t) / 1000).toFixed(1) + ' s', sortie }; };
const choisis = [1, 2, 6], attendu = choisis.map((k, i) => JSON.parse(JSON.stringify(modeles[k - 1])));
attendu.forEach((m, i) => [[m.folio], m.blocs, m.connecteurs, m.bornes, m.fils, m.jonctions, m.legende].forEach(xs => xs.forEach(r => { r.Folio = i + 1; })));
const octetsAttendus = octetsDe(attendu, { fichier: 'Contrat d’exemple', contrat: cartouche.titre });
const r1 = lot(['--exemple', '--folios=1-2;6'], path.join(TMP, 'a.xlsx'));
ok('le lot rend la main sans erreur et dit chaque folio', r1.status === 0 && (r1.stdout.match(/folio \d\/3/g) || []).length === 3, r1.s + ' · ' + (r1.stderr || '').trim().slice(0, 200));
ok('--folios=1-2;6 : trois folios rangés 1 à 3, le paquet identique à celui calculé ici (à la date près ; barrettes à poser numérotées sur tout le contrat)', fs.existsSync(r1.sortie) && sansDates(fs.readFileSync(r1.sortie)) === sansDates(octetsAttendus));
const r2 = lot(['--exemple', '--folios=1-2;6', '--taches=2'], path.join(TMP, 'b.xlsx'));
ok('--taches=2 (worker_threads) : le même paquet', r2.status === 0 && fs.existsSync(r2.sortie) && sansDates(fs.readFileSync(r2.sortie)) === sansDates(octetsAttendus), r2.s + ' · ' + (r2.stderr || '').trim().slice(0, 200));
const r3 = spawnSync(process.execPath, [path.join(RACINE, 'see', 'exporter.js')], { encoding: 'utf8' });
ok('sans retest, le lot dit son usage et rend 1', r3.status === 1 && /usage/.test(r3.stderr));
const html = fs.existsSync(path.join(RACINE, 'index.html')) ? fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8') : '', vh = /const VERSION_MOTEUR = '([0-9a-f]+)'/.exec(html);
const ve = XLSX.utils.sheet_to_json(XLSX.read(fs.readFileSync(r1.sortie)).Sheets.Paquet).find(r => r.Cle === 'version_moteur');
ok('la version du moteur écrite par le lot est celle d’index.html', vh && ve && ve.Valeur === vh[1], (ve && ve.Valeur) + ' / ' + (vh && vh[1]));

/* ---- 6. le DXF (le repli : un dessin par folio, see/FORMAT-DXF.md) ---------------- */
console.log('\n6. LE DXF, UN FICHIER PAR FOLIO (see/FORMAT-DXF.md)');
/* Une lecture MAISON du DXF, sans rien du module : des paires code / valeur (CRLF), les sections, les tables, les blocs et
   leurs ATTDEF, les entités (un INSERT emporte ses ATTRIB, une POLYLINE ses VERTEX, jusqu'au SEQEND). Rend { faute, … }. */
const CODE_ENTIER = c => (c >= 60 && c <= 99) || (c >= 170 && c <= 179) || (c >= 270 && c <= 289) || (c >= 370 && c <= 389) || (c >= 400 && c <= 409) || (c >= 1060 && c <= 1071);
const CODE_REEL = c => (c >= 10 && c <= 59) || (c >= 110 && c <= 149) || (c >= 210 && c <= 239) || (c >= 1010 && c <= 1059);
function lireDxf(texte) {
  const faute = [], lignes = texte.split('\r\n');
  if (lignes.pop() !== '') faute.push('pas de CRLF final'); if (/[\r\n]/.test(texte.replace(/\r\n/g, ''))) faute.push('CR ou LF seul');
  if (lignes.length % 2) faute.push('nombre de lignes impair : ' + lignes.length);
  const P = []; for (let i = 0; i + 1 < lignes.length; i += 2) { const c = lignes[i].trim(), v = lignes[i + 1];
    if (!/^\d+$/.test(c)) { faute.push('code ' + JSON.stringify(lignes[i]) + ' ligne ' + (i + 1)); continue; }
    if (CODE_ENTIER(+c) && !/^-?\d+$/.test(v)) faute.push('entier attendu : ' + c + ' = ' + v);
    if (CODE_REEL(+c) && !/^-?\d+(\.\d+)?$/.test(v)) faute.push('réel attendu : ' + c + ' = ' + v);
    if (v.length > 255) faute.push('valeur de plus de 255 caractères');
    P.push([+c, v]); }
  const sections = [], entete = new Map(), tables = {}, blocs = new Map(), ents = [];
  let sec = null, i = 0;
  const lireObjet = () => { const o = { type: P[i][1], c: [] }; i++; while (i < P.length && P[i][0] !== 0) { o.c.push(P[i]); i++; } return o; };
  const v1 = (o, c) => { const x = o.c.find(p => p[0] === c); return x ? x[1] : undefined; }, n1 = (o, c) => +(v1(o, c) || 0);
  while (i < P.length) { const [c, v] = P[i];
    if (c === 999) { i++; continue; }
    if (c !== 0) { faute.push('paire hors objet ' + c + ' ' + v); i++; continue; }
    if (v === 'EOF') { if (i !== P.length - 1) faute.push('EOF avant la fin'); sections.eof = true; i++; continue; }
    if (v === 'SECTION') { const o = lireObjet(); sec = v1(o, 2); sections.push(sec);
      if (sec === 'HEADER') { let nom = null; o.c.slice(1).forEach(([k, x]) => { if (k === 9) { nom = x; entete.set(nom, []); } else if (nom) entete.get(nom).push([k, x]); else faute.push('en-tête : ' + k + ' sans variable'); }); }
      continue; }
    if (v === 'ENDSEC') { sec = null; i++; continue; }
    if (sec === 'TABLES') { const o = lireObjet(); if (o.type === 'TABLE') tables.__t = v1(o, 2); else if (o.type !== 'ENDTAB') (tables[tables.__t] = tables[tables.__t] || []).push(o); continue; }
    if (sec === 'BLOCKS') { const o = lireObjet(); if (o.type === 'BLOCK') blocs.set(v1(o, 2), blocs.__b = { o, ents: [] }); else if (o.type === 'ENDBLK') blocs.__b = null; else if (blocs.__b) blocs.__b.ents.push(o); else faute.push('entité hors bloc ' + o.type); continue; }
    if (sec === 'ENTITIES') { const o = lireObjet(), d = ents[ents.length - 1];
      if (o.type === 'ATTRIB' || o.type === 'VERTEX') { if (!d || !d.ouvert) faute.push(o.type + ' orphelin'); else (d.fils = d.fils || []).push(o); }
      else if (o.type === 'SEQEND') { if (!d || !d.ouvert) faute.push('SEQEND orphelin'); else d.ouvert = false; }
      else { if (d && d.ouvert) faute.push(d.type + ' sans SEQEND'); o.ouvert = (o.type === 'INSERT' || o.type === 'POLYLINE') && v1(o, 66) === '1'; ents.push(o); }
      continue; }
    faute.push('objet hors section ' + v); lireObjet(); }
  delete tables.__t;
  return { faute, sections, entete, tables, blocs, ents, v1, n1 }; }
const auCentieme = v => Math.round(v * 100) / 100;
const cleSeg = (a, b) => { const p = [auCentieme(a[0]), auCentieme(a[1])].join(" "), q = [auCentieme(b[0]), auCentieme(b[1])].join(" "); return p < q ? p + '|' + q : q + '|' + p; };
/* Le DXF d'un folio contre son modèle : rend les fautes, rangées par contrôle. */
function verifierDxf(m, texte, rang) {
  const D = lireDxf(texte), F = {}, dire = (k, x) => { (F[k] = F[k] || []).push(x); }, { v1, n1 } = D, H = 297;
  const ch = v => A('dxfChaine')(v == null ? '' : v);   // un texte tel que le DXF l'écrit (Windows-1252 ; contrôlé à part)
  D.faute.forEach(x => dire('paires', x));
  if (D.sections.join(' ') !== 'HEADER TABLES BLOCKS ENTITIES' || !D.sections.eof) dire('sections', D.sections.join(' ') + (D.sections.eof ? ' EOF' : ' sans EOF'));
  const ev = (nom, c) => { const x = (D.entete.get(nom) || []).find(p => p[0] === c); return x && x[1]; };
  if (ev('$ACADVER', 1) !== 'AC1009' || ev('$DWGCODEPAGE', 3) !== 'ANSI_1252' || +ev('$EXTMAX', 10) !== 420 || +ev('$EXTMAX', 20) !== 297) dire('entete', [...D.entete.keys()].join(' '));
  const calques = new Set((D.tables.LAYER || []).map(o => v1(o, 2))), ltypes = new Set((D.tables.LTYPE || []).map(o => v1(o, 2)));
  if ([...calques].join(' ') !== '0 CADRE EQUIPEMENTS CONNECTEURS BORNES FILS REPERES NUMEROS MASSES BARRETTES PRISES' || !ltypes.has('CONTINUOUS') || !ltypes.has('POINTILLE') || !(D.tables.STYLE || []).some(o => v1(o, 2) === 'STANDARD')) dire('tables', [...calques].join(' ') + ' · ' + [...ltypes].join(' '));
  const BLOCS = A('DXF_BLOCS');
  if ([...D.blocs.keys()].join(' ') !== Object.keys(BLOCS).join(' ')) dire('blocs', [...D.blocs.keys()].join(' '));
  D.blocs.forEach((b, nom) => { const tags = b.ents.filter(o => o.type === 'ATTDEF').map(o => v1(o, 2)).join(' ');
    if (tags !== (BLOCS[nom] && BLOCS[nom].sans ? '' : 'REPERE CONNECTEUR BORNE NUMERO')) dire('blocs', nom + ' : ' + tags);
    if (b.ents.some(o => v1(o, 8) !== '0')) dire('blocs', nom + ' : un trait hors du calque 0'); });
  // chaque entité sur un calque déclaré, chaque insertion d'un bloc défini, chaque attribut d'un ATTDEF de son bloc, tout dans la feuille
  const pts = o => { const out = []; [[10, 20], [11, 21]].forEach(([a, b]) => { if (v1(o, a) !== undefined) out.push([n1(o, a), n1(o, b)]); }); return out; };
  D.ents.forEach(o => { if (!calques.has(v1(o, 8))) dire('calques', o.type + ' sur ' + v1(o, 8)); if (v1(o, 6) && !ltypes.has(v1(o, 6))) dire('calques', 'type de trait ' + v1(o, 6));
    if (o.type === 'INSERT') { const b = D.blocs.get(v1(o, 2)); if (!b) dire('insertions', v1(o, 2) + ' non défini');
      else (o.fils || []).forEach(a => { if (!b.ents.some(d => d.type === 'ATTDEF' && v1(d, 2) === v1(a, 2))) dire('insertions', v1(o, 2) + ' : ' + v1(a, 2)); }); }
    [o, ...(o.fils || [])].forEach(x => pts(x).forEach(([px, py]) => { if (o.type !== 'POLYLINE' || x !== o) if (!(px >= 0 && px <= 420 && py >= 0 && py <= 297)) dire('feuille', o.type + ' ' + v1(o, 8) + ' (' + px + ', ' + py + ')'); })); });
  // les comptes : une insertion par rangée de Bornes, quatre attributs chacune ; une LINE par segment ; un texte par numéro, par repère
  const de = (t, cs) => D.ents.filter(o => o.type === t && (!cs || cs.includes(v1(o, 8))));
  const ins = de('INSERT', ['BORNES', 'MASSES', 'BARRETTES', 'PRISES']), traces = A('filsDxf')(m), bornes = A('bornesDxf')(m), u = 0.25 / m.folio.Echelle;
  const hauts = m.blocs.filter(b => b.Nature === 'EQUIPEMENT' && b.H / u > 380 && b.RepereX != null).length;
  const comptes = [['insertions de bornes', ins.length, m.bornes.length], ['attributs', ins.reduce((s, o) => s + (o.fils || []).length, 0), 4 * m.bornes.length],
    ['jonctions', de('INSERT', ['FILS']).length, m.jonctions.length], ['LINE des fils', de('LINE', ['FILS']).length, traces.reduce((s, t) => s + t.points.length - 1, 0)],
    ['numéros', de('TEXT', ['NUMEROS']).length, m.fils.filter(f => f.NumeroX != null && f.Fil).length], ['repères', de('TEXT', ['REPERES']).length, m.blocs.filter(b => b.RepereX != null && b.Repere).length + hauts],
    ['corps', de('POLYLINE', ['EQUIPEMENTS']).length, m.blocs.filter(b => ['EQUIPEMENT', 'RENVOI', 'RAIL'].includes(b.Nature)).length],
    ['pièces', de('POLYLINE', ['CONNECTEURS']).length, m.connecteurs.filter(c => c.Lettre !== 'FICHE' && c.Lettre !== 'EMBASE').length],
    ['fiches et embases', de('POLYLINE', ['PRISES']).length, m.connecteurs.filter(c => c.Lettre === 'FICHE' || c.Lettre === 'EMBASE').length]];
  comptes.forEach(([nom, a, b]) => { if (a !== b) dire('comptes', nom + ' ' + a + ' / ' + b); });
  // les insertions, rangée par rangée : le bloc, le calque, le contact (y vers le haut), les attributs du paquet
  ins.forEach((o, k) => { const d = bornes[k], r = d && d.r, b = r && m.blocs.find(x => x.Bloc === r.Bloc), at = new Map((o.fils || []).map(a => [v1(a, 2), v1(a, 1)]));
    /* inséré au contact du paquet (CX, CY) ; une pastille, au bord de son cercle de 4 unités centré sur PX, du côté du contact
       (le rayon de l'Atelier va de 3,4 à 4,6 : à 0,6 unité au plus de CX) */
    if (!d) return; const xi = n1(o, 10), pastille = /^SEE_PASTILLE_[GD]$/.test(v1(o, 2));
    const auContact = pastille ? Math.abs(Math.abs(xi - r.PX) - 4 * u) <= 0.011 && Math.sign(xi - r.PX) === Math.sign(r.CX - r.PX) && Math.abs(xi - r.CX) <= 0.6 * u + 0.011 : Math.abs(xi - r.CX) <= 0.006;
    if (v1(o, 2) !== d.bloc || v1(o, 8) !== d.calque || !auContact || Math.abs(n1(o, 20) - (H - r.CY)) > 0.006) dire('bornes', v1(o, 2) + ' ' + xi + ',' + n1(o, 20) + ' / ' + d.bloc + ' contact du paquet ' + r.CX + ',' + (H - r.CY) + ' centre ' + r.PX);
    if (at.get('REPERE') !== ch(b.Repere) || at.get('BORNE') !== ch(r.Borne) || at.get('CONNECTEUR') !== ch(r.Connecteur) || at.get('NUMERO') !== ch(r.Numero)) dire('attributs', JSON.stringify([...at]) + ' / ' + [b.Repere, r.Connecteur, r.Borne, r.Numero]);
    if (Math.abs(n1(o, 41) - 1 / m.folio.Echelle) > 1e-3) dire('bornes', 'échelle ' + v1(o, 41)); });
  // les fils : les LINE du DXF sont exactement les segments des tracés ; chaque tracé part d'une insertion de sa borne et y
  // arrive ; il passe par tous les points du paquet, et n'en ajoute pas d'autres que ses deux bouts
  // chaque segment attendu prend une LINE de même place ; sa couleur doit être l'index ACI de la route du fil (BYLAYER sans route)
  const lignes = new Map(), aci = A('aciDesRoutes')(m);
  de('LINE', ['FILS']).forEach(o => { const k = cleSeg([n1(o, 10), n1(o, 20)], [n1(o, 11), n1(o, 21)]); (lignes.get(k) || lignes.set(k, []).get(k)).push(v1(o, 62) == null ? 'BYLAYER' : +v1(o, 62)); });
  traces.forEach(({ f, points }) => { const id = f.Fil || 'fil ' + f.Ordre, c = f.Route && aci.has(f.Route) ? aci.get(f.Route) : 'BYLAYER';
    for (let i = 0; i + 1 < points.length; i++) { const k = cleSeg([points[i].x, H - points[i].y], [points[i + 1].x, H - points[i + 1].y]), xs = lignes.get(k) || [];
      if (!xs.length) { dire('fils', id + ' : segment absent ' + k); continue; }
      const j = xs.indexOf(c); if (j < 0) { dire('couleurs', id + ' ' + f.Route + ' : ' + xs[0] + ' au lieu de ' + c); xs.shift(); } else xs.splice(j, 1); }
    [['De', points[0]], ['Vers', points[points.length - 1]]].forEach(([bout, p]) => { const o = ins.find(x => Math.abs(n1(x, 10) - p.x) < 0.006 && Math.abs(n1(x, 20) - (H - p.y)) < 0.006 && (x.fils || []).some(a => v1(a, 2) === 'REPERE' && v1(a, 1) === ch(f[bout + 'Repere'])) && (x.fils || []).some(a => v1(a, 2) === 'BORNE' && v1(a, 1) === ch(f[bout + 'Borne'])));
      if (!o) dire('bouts', id + ' ' + bout + ' (' + p.x + ', ' + p.y + ') sans insertion de ' + f[bout + 'Repere'] + ':' + f[bout + 'Borne']); });
    const sur = (q, a, b) => (Math.abs(a.y - b.y) < 0.006 && Math.abs(q.y - a.y) < 0.006 && q.x >= Math.min(a.x, b.x) - 0.006 && q.x <= Math.max(a.x, b.x) + 0.006) || (Math.abs(a.x - b.x) < 0.006 && Math.abs(q.x - a.x) < 0.006 && q.y >= Math.min(a.y, b.y) - 0.006 && q.y <= Math.max(a.y, b.y) + 0.006);
    const pq = f.Points.map(([x, y]) => ({ x, y }));
    pq.forEach((q, j) => { if ((j > 0 && j < pq.length - 1) && !points.some((a, i) => i + 1 < points.length && sur(q, a, points[i + 1]))) dire('tracés', id + ' : point du paquet (' + q.x + ', ' + q.y + ') hors du tracé'); });
    points.slice(1, -1).forEach(q => { if (!pq.some(a => Math.abs(a.x - q.x) < 0.006 && Math.abs(a.y - q.y) < 0.006)) dire('tracés', id + ' : coude ajouté (' + q.x + ', ' + q.y + ')'); });
    for (let i = 0; i + 1 < points.length; i++) if (Math.abs(points[i].x - points[i + 1].x) > 0.006 && Math.abs(points[i].y - points[i + 1].y) > 0.006) dire('tracés', id + ' : segment oblique'); });
  if ([...lignes.values()].some(xs => xs.length)) dire('fils', 'LINE en trop : ' + [...lignes].filter(([, xs]) => xs.length).map(([k]) => k).slice(0, 3).join(' ; '));
  if (new Set(aci.values()).size !== aci.size) dire('couleurs', 'deux routes, un même index : ' + JSON.stringify([...aci]));
  return { D, F }; }
const CONTROLES_DXF = [['paires', 'des paires code / valeur en CRLF ; les entiers et les réels bien écrits (pas de « 1.0 » pour une couleur)'], ['sections', 'HEADER, TABLES, BLOCKS, ENTITIES, puis EOF'],
  ['entete', 'R12 (AC1009), Windows-1252, la feuille 420 × 297'], ['tables', 'les onze calques, POINTILLE et CONTINUOUS, le style STANDARD'], ['blocs', 'les blocs du contrat, chacun ses ATTDEF REPERE, CONNECTEUR, BORNE, NUMERO, ses traits sur le calque 0'],
  ['calques', 'chaque entité sur un calque déclaré'], ['insertions', 'chaque INSERT d’un bloc défini, chaque ATTRIB d’un ATTDEF de son bloc'], ['feuille', 'tout dans la feuille, y vers le haut'],
  ['comptes', 'les comptes sont ceux du modèle (insertions, attributs, segments, numéros, repères, corps, pièces)'], ['bornes', 'chaque borne : son bloc, son calque, insérée au contact du paquet (CX, CY ; une pastille, au bord de son cercle centré), à l’échelle du folio'],
  ['attributs', 'chaque borne porte le repère, le connecteur, la borne et le numéro du paquet'], ['fils', 'les LINE des fils sont exactement les segments des tracés'],
  ['bouts', 'chaque fil part d’une insertion de sa borne et arrive sur une insertion de l’autre'], ['tracés', 'chaque tracé passe par les points du paquet, droit, sans coude ajouté'], ['couleurs', 'un fil a l’index ACI de sa route ; deux routes, deux index']];
const rapporterDxf = (titre, F) => CONTROLES_DXF.forEach(([k, nom]) => ok(titre + ' : ' + nom, !F[k], F[k] ? F[k].length + ' — ' + F[k].slice(0, 3).join(' ; ') : ''));
const t7 = Date.now(), dxfs = modeles.map((m, i) => A('dxfDuFolio')(m, { total: 6, rang: i + 1 })), msDxf = Date.now() - t7, fautesDxf = {};
modeles.forEach((m, i) => { const { F } = verifierDxf(m, dxfs[i], i + 1); Object.entries(F).forEach(([k, xs]) => (fautesDxf[k] = fautesDxf[k] || []).push(...xs.map(x => 'folio ' + (i + 1) + ' : ' + x))); });
console.log('     (' + msDxf + ' ms pour écrire les six DXF, ' + Math.round(dxfs.reduce((s, t) => s + t.length, 0) / 1024) + ' Ko)');
rapporterDxf('les six folios', fautesDxf);
const mc2 = mc.filter(m => m.blocs.some(b => ['COLLECTEUR', 'RAIL', 'RENVOI'].includes(b.Nature)) || m.jonctions.length), fautesCorpus = {};
mc2.forEach((m, i) => { const { F } = verifierDxf(m, A('dxfDuFolio')(m, {}), i + 1); Object.entries(F).forEach(([k, xs]) => (fautesCorpus[k] = fautesCorpus[k] || []).push(...xs)); });
ok('le corpus (' + mc2.length + ' folios à rail, collecteur ou renvoi) : tous les contrôles du DXF', !Object.keys(fautesCorpus).length, Object.entries(fautesCorpus).map(([k, xs]) => k + ' ' + xs.length + ' — ' + xs[0]).join(' ; ') || [...new Set(mc2.flatMap(m => m.blocs.map(b => b.Nature)))].join(' '));
{ const f1 = lireDxf(dxfs[0]), v1 = f1.v1, ins = f1.ents.filter(o => o.type === 'INSERT' && (o.fils || []).some(a => v1(a, 2) === 'REPERE' && v1(a, 1) === '101BT1') && (o.fils || []).some(a => v1(a, 2) === 'BORNE' && v1(a, 1) === '1'));
  const b = modeles[0].bornes.find(r => r.Repere === '101BT1' && r.Borne === '1'), p = modeles[0].connecteurs.find(c => c.Repere === '101BT1');
  ok('folio 1 : 101BT1:1 est un SEE_BORNE_G posé au bord gauche de sa pièce A, à y = 297 − y du paquet', ins.length === 1 && v1(ins[0], 2) === 'SEE_BORNE_G' && Math.abs(f1.n1(ins[0], 10) - p.X0) < 0.006 && Math.abs(f1.n1(ins[0], 20) - (297 - b.Y)) < 0.006, ins.length && [v1(ins[0], 2), v1(ins[0], 10), v1(ins[0], 20)].join(' ') + ' / ' + p.X0 + ' ' + (297 - b.Y));
  const vt = f1.ents.filter(o => o.type === 'INSERT' && (o.fils || []).some(a => v1(a, 2) === 'REPERE' && v1(a, 1) === 'VT1')).map(o => v1(o, 2)).sort().join(' ');
  ok('folio 1 : les trois pastilles de VT1 s’ouvrent du côté de leur fil (deux à gauche, une à droite)', vt === 'SEE_PASTILLE_D SEE_PASTILLE_G SEE_PASTILLE_G', vt); }
{ // Windows-1252 relu ici, table à part (le TextDecoder de Node lit 0x80–0x9F comme ISO-8859-1)
  const HAUT = { 0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡', 0x88: 'ˆ', 0x89: '‰', 0x8A: 'Š', 0x8B: '‹', 0x8C: 'Œ', 0x8E: 'Ž', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—', 0x98: '˜', 0x99: '™', 0x9A: 'š', 0x9B: '›', 0x9C: 'œ', 0x9E: 'ž', 0x9F: 'Ÿ' };
  const cp1252 = o => Array.from(o, x => x >= 0x80 && x < 0xA0 ? (HAUT[x] || '\ufffd') : String.fromCharCode(x)).join('');
  const t = dxfs[1], o = A('octetsCp1252')(t), relu = cp1252(o);
  const essai = 'DESSINÉ — l’« Œil » à 20 € · µ ▷F4 Ω', oe = A('octetsCp1252')(A('dxfChaine')(essai));
  ok('le texte s’écrit en Windows-1252, octet pour caractère, et se relit à l’identique (DESSINÉ, ÉCHELLE, câblage, —, ’, €, Œ)', o.length === t.length && relu === t && t.includes('DESSINÉ') && o.includes(0xC9) && cp1252(oe) === 'DESSINÉ — l’« Œil » à 20 € · µ >F4 Ohm', o.length + ' octets · ' + cp1252(oe));
  ok('le DXF est déterministe : deux fois le même folio, deux fois le même texte', A('dxfDuFolio')(modeles[1], { total: 6, rang: 2 }) === t);
  const c = A('dxfChaine'), e = 'ψ\nœ — «x» %%d ▷F3 Ç';
  ok('un texte hors de la page de code est ramené à elle (▷ en >, ψ en ?), sans saut de ligne ni code %%', c(e) === '? œ — «x» %%%%%%d >F3 Ç', c(e));
  const sans = lireDxf(A('dxfDuFolio')(modeles[1], { cadre: false, couleurs: false, blocs: 'folio' })), s1 = sans.v1;
  ok('les réglages : sans cadre (rien sur CADRE), sans couleurs (les fils en BYLAYER), blocs à l’échelle du folio (insertions à 1)', !sans.faute.length && !sans.ents.some(x => s1(x, 8) === 'CADRE') && sans.ents.filter(x => x.type === 'LINE' && s1(x, 8) === 'FILS').every(x => s1(x, 62) === undefined) && sans.ents.filter(x => x.type === 'INSERT').every(x => s1(x, 41) === undefined),
    sans.faute.slice(0, 2).join(' ; ')); }
/* Le zip, relu par une lecture maison : la fin du répertoire, chaque entrée centrale, son en-tête local, ses octets ; le
   CRC-32 recalculé bit à bit (pas par la table du module). */
const crcBits = o => { let c = 0xFFFFFFFF; for (const x of o) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); } return (c ^ 0xFFFFFFFF) >>> 0; };
function lireZip(z) { const v = new DataView(z.buffer, z.byteOffset, z.byteLength), faute = [], out = [];
  let e = -1; for (let i = z.length - 22; i >= 0; i--) if (v.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) return { faute: ['pas de fin de répertoire'], out };
  const n = v.getUint16(e + 10, true), taille = v.getUint32(e + 12, true), debut = v.getUint32(e + 16, true);
  if (debut + taille !== e) faute.push('répertoire mal placé');
  let p = debut;
  for (let k = 0; k < n; k++) { if (v.getUint32(p, true) !== 0x02014b50) { faute.push('entrée ' + k + ' : signature'); break; }
    const meth = v.getUint16(p + 10, true), crc = v.getUint32(p + 16, true), tc = v.getUint32(p + 20, true), tn = v.getUint32(p + 24, true), ln = v.getUint16(p + 28, true), lx = v.getUint16(p + 30, true), lc = v.getUint16(p + 32, true), loc = v.getUint32(p + 42, true);
    const nom = String.fromCharCode(...z.subarray(p + 46, p + 46 + ln));
    if (v.getUint32(loc, true) !== 0x04034b50 || v.getUint32(loc + 14, true) !== crc || v.getUint32(loc + 18, true) !== tc || String.fromCharCode(...z.subarray(loc + 30, loc + 30 + v.getUint16(loc + 26, true))) !== nom) faute.push(nom + ' : en-tête local');
    const data = z.subarray(loc + 30 + v.getUint16(loc + 26, true) + v.getUint16(loc + 28, true), loc + 30 + v.getUint16(loc + 26, true) + v.getUint16(loc + 28, true) + tc);
    if (meth !== 0 || tc !== tn) faute.push(nom + ' : pas stocké'); if (crcBits(data) !== crc) faute.push(nom + ' : CRC');
    out.push({ nom, data, crc }); p += 46 + ln + lx + lc; }
  return { faute, out }; }
{ const fichiers = dxfs.map((t, i) => ({ nom: A('nomDuDxf')(modeles[i], i + 1, 6), octets: A('octetsCp1252')(t) })), z = A('zipDe')(fichiers, new Date(2026, 9, 10, 9, 30, 0)), R = lireZip(z);
  ok('le zip des six DXF se relit (lecture maison) : six entrées stockées, CRC-32 recalculés bit à bit justes, en-têtes locaux d’accord', !R.faute.length && R.out.length === 6, R.faute.join(' ; ') || Math.round(z.length / 1024) + ' Ko');
  ok('chaque entrée est le DXF de son folio, octet pour octet, nommé NN.<nom>.dxf', R.out.every((e, i) => e.nom === fichiers[i].nom && Buffer.compare(Buffer.from(e.data), Buffer.from(fichiers[i].octets)) === 0) && R.out.map(e => e.nom).join(' ') === '01.1.dxf 02.2.dxf 03.3.dxf 04.4.dxf 05.5.dxf 06.6.dxf', R.out.map(e => e.nom).join(' '));
  const n = A('nomDuDxf');
  ok('les noms : le rang du contrat sur la largeur du total, le plan en ASCII sans point ni caractère interdit', n({ folio: { Folio: 1, Nom: 'Câblage 21.3 A/B:C' } }, 7, 812) === '007.Cablage-21-3-A-B-C.dxf' && n({ folio: { Folio: 2, Nom: '' } }, 2, 6) === '02.Folio.dxf', n({ folio: { Folio: 1, Nom: 'Câblage 21.3 A/B:C' } }, 7, 812)); }
{ const dossier = path.join(TMP, 'dxf'), t = Date.now(), r = spawnSync(process.execPath, [path.join(RACINE, 'see', 'exporter.js'), '--exemple', '--folios=1-2;6', '--dxf=' + dossier], { encoding: 'utf8', timeout: 600000, cwd: TMP });
  const ecrits = fs.existsSync(dossier) ? fs.readdirSync(dossier).sort() : [];
  ok('le lot --dxf=dossier/ écrit un DXF par folio choisi, nommé par son rang au contrat (et pas de classeur sans --sortie)', r.status === 0 && ecrits.join(' ') === '01.1.dxf 02.2.dxf 06.6.dxf' && !fs.readdirSync(TMP).some(f => /^paquet-see-.*\.xlsx$/.test(f)), ((Date.now() - t) / 1000).toFixed(1) + ' s · ' + ecrits.join(' ') + ' ' + (r.stderr || '').trim().slice(0, 200));
  ok('chaque DXF du lot est celui calculé ici, octet pour octet', ecrits.length === 3 && [1, 2, 6].every((k, i) => Buffer.compare(fs.readFileSync(path.join(dossier, ecrits[i])), Buffer.from(A('octetsCp1252')(A('dxfDuFolio')(attendu[i], { total: 6, rang: k })))) === 0)); }

/* ---- 7. à la vraie souris (--navigateur) ----------------------------------------- */
async function navigateur() {
  console.log('\n7. LA FICHE « EXPORTER POUR SEE » DANS LA PAGE');
  const { chromium } = require('playwright'), PILOTE = require('./pilote'), CAPT = arg('captures');
  if (CAPT) fs.mkdirSync(CAPT, { recursive: true });
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await nav.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true }), page = await ctx.newPage(); page.setDefaultTimeout(300000);
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  await page.goto(PILOTE.fichierDemande()); await page.waitForFunction(() => typeof atelier !== 'undefined');
  await page.evaluate(() => { chargerContrat(contratExemple(), 'contrat d’exemple', 'Contrat d’exemple'); });
  // l'écran : aucune tâche de plus d'une seconde pendant l'export (le placement au loin réveillé, comme hors pilote)
  await page.evaluate(() => { window.__longues = []; new PerformanceObserver(l => l.getEntries().forEach(e => window.__longues.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: false }); placementAilleurs(true); });
  await page.click('#btnMenu'); await page.click('#menu button[data-act="see"]');
  const fiche = await page.evaluate(() => ({ ouverte: !$('fiche').hidden && app.fiche && app.fiche.mode === 'see', puces: [...document.querySelectorAll('#fiche-corps [data-portee]')].map(b => b.textContent + ':' + b.getAttribute('aria-pressed')) }));
  ok('le menu ouvre la fiche « Exporter pour SEE » : tous les folios ou celui-ci', fiche.ouverte && fiche.puces.length === 2, fiche.puces.join(' · '));
  const dl = page.waitForEvent('download');
  await page.click('#se-go');
  await page.waitForFunction(() => EXPORT_SEE.encours && EXPORT_SEE.encours.i >= 2, null, { timeout: 300000 }).catch(() => { });
  if (CAPT) await page.screenshot({ path: path.join(CAPT, 'see-fiche-en-cours.png') });
  const telecharge = await dl, nom = telecharge.suggestedFilename(), fichier = path.join(TMP, 'page.xlsx'); await telecharge.saveAs(fichier);
  await page.waitForFunction(() => !EXPORT_SEE.encours);
  if (CAPT) { await page.screenshot({ path: path.join(CAPT, 'see-fiche-finie.png') }); await page.locator('#fiche').screenshot({ path: path.join(CAPT, 'see-fiche-zoom.png') }); }
  const etat = await page.evaluate(() => ({ cases: [...document.querySelectorAll('.se-cases i')].map(i => i.className), longues: window.__longues, place: etatPlacement() }));
  ok('le téléchargement s’appelle paquet-see-<nom ASCII>.xlsx', nom === 'paquet-see-Contrat-d-exemple.xlsx', nom);
  ok('l’avancement : six cases, toutes allumées', etat.cases.length === 6 && etat.cases.every(c => c === 'ok'), etat.cases.join(' '));
  ok('les folios jamais vus se sont placés au loin (Worker)', etat.place.faits >= 4, JSON.stringify({ faits: etat.place.faits, relus: etat.place.relus }));
  ok('l’écran ne s’est jamais figé plus d’une seconde', !etat.longues.some(d => d > 1000), 'tâches longues : ' + (etat.longues.join(', ') || 'aucune'));
  const dePage = relu(fs.readFileSync(fichier), true), duLot = relu(octetsDe(modeles, { fichier: 'Contrat d’exemple', contrat: cartouche.titre }), true);
  ok('le paquet de la page est celui du lot, folio pour folio (à la date et aux contacts à sertir près)', JSON.stringify(dePage) === JSON.stringify(duLot), ecart(dePage, duLot));
  const contacts = XLSX.utils.sheet_to_json(XLSX.read(fs.readFileSync(fichier)).Sheets.Bornes).filter(b => b.Contact || b.Sexe);
  ok('la page écrit le contact à sertir que ses fiches donnent (barrettes en modules, connecteurs), le sexe quand il est connu', contacts.length > 0, contacts.length + ' bornes · ' + [...new Set(contacts.map(b => b.Repere))].slice(0, 6).join(', ') + ' · ' + contacts.slice(0, 2).map(b => b.Repere + ':' + b.Borne + ' ' + b.Contact + ' ' + (b.Sexe || '')).join(' ; '));
  // le dessin qu'on voit : un dessin affiné, puis une retouche par-dessus — c'est elle qui part
  const vu = await page.evaluate(async () => { allerAuPlan('2'); const L = liaisonsDuPlan(), cle = clePlacement(L), P = placementDe(L), c = P.comps.find(k => k.kind === 'equip' && k.name === '601RC');
    const bloc = async () => { const x = EXPORT_SEE.dernier = null; await exporterSEE('folio'); const m = EXPORT_SEE.dernier.modeles[0]; return m.blocs.find(b => b.Repere === '601RC').Y; };
    const avant = await bloc();
    affinage.profonds.set(cle, deplacerBloc(P, c, 28)); redessiner(); const affine = await bloc();
    app.retouches.set(cle, deplacerBloc(P, c, 56)); redessiner(); const retouche = await bloc();
    const k = app.dessin.bbox.k; app.retouches.delete(cle); affinage.profonds.delete(cle); redessiner();
    return { avant, affine, retouche, pas: 28 / k * 0.25 }; });
  ok('« ce folio » part tel qu’on le voit : affiné, puis retouché par-dessus (601RC suit)', vu.affine !== vu.avant && vu.retouche !== vu.affine, JSON.stringify(vu));
  // le DXF : la puce « DXF », tous les folios → un zip dont chaque entrée est le DXF calculé ici ; « ce folio » → un seul .dxf
  await page.evaluate(() => { EXPORT_SEE.portee = 'tous'; ficheSEE(); });
  await page.click('#fiche-corps [data-format="dxf"]');
  const choix = await page.evaluate(() => ({ format: EXPORT_SEE.format, presse: document.querySelector('#fiche-corps [data-format="dxf"]').getAttribute('aria-pressed'), nom: $('se-nom').textContent, note: document.querySelector('#fiche-corps .note').textContent.slice(0, 40) }));
  ok('la puce « DXF · un fichier par folio » choisit le DXF : la note et le nom du fichier le disent', choix.format === 'dxf' && choix.presse === 'true' && choix.nom === 'dxf-see-Contrat-d-exemple.zip' && /DXF/.test(choix.note), JSON.stringify(choix));
  if (CAPT) await page.locator('#fiche').screenshot({ path: path.join(CAPT, 'see-fiche-dxf.png') });
  const dl2 = page.waitForEvent('download'); await page.click('#se-go');
  const t2 = await dl2, nom2 = t2.suggestedFilename(), f2 = path.join(TMP, 'page.zip'); await t2.saveAs(f2);
  await page.waitForFunction(() => !EXPORT_SEE.encours);
  if (CAPT) await page.locator('#fiche').screenshot({ path: path.join(CAPT, 'see-fiche-dxf-finie.png') });
  const Z = lireZip(new Uint8Array(fs.readFileSync(f2)));
  ok('tous les folios en DXF : dxf-see-<contrat>.zip, six entrées NN.<plan>.dxf, CRC justes (lecture maison)', nom2 === 'dxf-see-Contrat-d-exemple.zip' && !Z.faute.length && Z.out.map(e => e.nom).join(' ') === '01.1.dxf 02.2.dxf 03.3.dxf 04.4.dxf 05.5.dxf 06.6.dxf', nom2 + ' · ' + Z.out.map(e => e.nom).join(' ') + ' ' + Z.faute.join(' ; '));
  const ecartsDxf = Z.out.map((e, i) => Buffer.compare(Buffer.from(e.data), Buffer.from(A('octetsCp1252')(dxfs[i]))) === 0 ? '' : e.nom).filter(Boolean);
  ok('chaque DXF de la page est celui du lot, octet pour octet', Z.out.length === 6 && !ecartsDxf.length, ecartsDxf.join(' '));
  const dl3 = page.waitForEvent('download'); await page.evaluate(() => { allerAuPlan('3'); EXPORT_SEE.portee = 'folio'; ficheSEE(); }); await page.click('#se-go');
  const t3 = await dl3, f3 = path.join(TMP, 'folio3.dxf'); await t3.saveAs(f3); await page.waitForFunction(() => !EXPORT_SEE.encours);
  ok('« ce folio » en DXF : un seul fichier, 03.3.dxf, le DXF du folio 3', t3.suggestedFilename() === '03.3.dxf' && Buffer.compare(fs.readFileSync(f3), Buffer.from(A('octetsCp1252')(dxfs[2]))) === 0, t3.suggestedFilename());
  await page.evaluate(() => { EXPORT_SEE.format = 'paquet'; EXPORT_SEE.portee = 'tous'; });
  /* La fiche ne montre le bilan d'un export que s'il dit ce que le bouton referait : tous les folios exportés, puis la
     puce « Ce folio » ; puis un autre contrat, d'un seul folio ; puis de nouveau l'exemple (la portée choisie revient). */
  const etatFiche = () => page.evaluate(() => ({ bilan: !$('se-avance').hidden, ligne: (document.querySelector('#se-avance .se-ligne') || {}).textContent || '', go: $('se-go').textContent, nom: $('se-nom').textContent,
    puces: [...document.querySelectorAll('#fiche-corps [data-portee]')].map(b => b.dataset.portee + ':' + b.getAttribute('aria-pressed')).join(' '), portee: EXPORT_SEE.portee }));
  const dl4 = page.waitForEvent('download'); await page.evaluate(() => { allerAuPlan('2'); ficheSEE(); }); await page.click('#se-go'); await dl4; await page.waitForFunction(() => !EXPORT_SEE.encours);
  const e1 = await etatFiche(); await page.click('#fiche-corps [data-portee="folio"]'); const e2 = await etatFiche();
  await page.click('#fiche-corps [data-portee="tous"]'); const e3 = await etatFiche();
  ok('le bilan suit la portée : « Ce folio » après un export de tous les folios annonce son propre fichier, pas celui d’avant ; « Tous » retrouve le bilan',
    e1.bilan && /Enregistré\s:\s*paquet-see-Contrat-d-exemple\.xlsx/.test(e1.ligne) && !e2.bilan && e2.go === 'Exporter' && e2.nom === 'paquet-see-Contrat-d-exemple-folio-2.xlsx' && e3.bilan && e3.go === 'Exporter à nouveau',
    JSON.stringify([e1, e2, e3].map(e => [e.bilan, e.go, e.nom, e.ligne])));
  await page.evaluate(() => { chargerContrat(contratExemple().filter(l => String(l.plan) === '1'), 'un autre contrat', 'Un seul folio'); ficheSEE(); }); const e4 = await etatFiche();
  ok('un autre contrat, d’un seul folio : aucun bilan de l’exemple, « Le folio » seul, la portée choisie gardée pour plus tard', !e4.bilan && e4.go === 'Exporter' && e4.nom === 'paquet-see-Un-seul-folio.xlsx' && e4.puces === 'folio:true' && e4.portee === 'tous', JSON.stringify(e4));
  await page.evaluate(() => { chargerContrat(contratExemple(), 'contrat d’exemple', 'Contrat d’exemple'); ficheSEE(); }); const e5 = await etatFiche();
  ok('de nouveau l’exemple (six folios) : la fiche s’ouvre sur « Tous les folios », sans le bilan d’un contrat d’avant', !e5.bilan && e5.puces === 'tous:true folio:false' && e5.nom === 'paquet-see-Contrat-d-exemple.xlsx', JSON.stringify(e5));
  ok('aucune erreur dans la page', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  await nav.close(); }

(process.argv.includes('--navigateur') ? navigateur() : Promise.resolve()).then(() => {
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log('\n  ' + (total - echecs) + ' / ' + total + ' contrôles passés' + (echecs ? '  —  ' + echecs + ' ÉCHEC(S)' : '  —  tout est vert'));
  process.exit(echecs ? 1 : 0); }, e => { console.error(e); process.exit(1); });
