/* ===========================================================================
   09 — LIRE ET ÉCRIRE UN SCHÉMA VISIO (.vsdx), DANS LES DEUX SENS
   ---------------------------------------------------------------------------
   Le lecteur : « Il faut gérer les PDF mais aussi tout ce qui n'est pas PDF
   mais que de la visio, c'est très très important. » Ses schémas sont des
   .vsdx (Visio 2013 et après) : un zip d'XML, selon les Open Packaging
   Conventions et la spécification publique MS-VSDX.

   LIRE. Un PDF ne montre que des traits ; un Visio dit ce qui est COLLÉ à
   quoi. Chaque page (visio/pages/pageN.xml) porte ses formes — leur texte,
   leur maître (visio/masters/), leur géométrie, leurs points de connexion —
   et les Connects : tel connecteur est collé, par son début ou sa fin, à tel
   point de connexion de telle forme. C'est la vérité des liaisons, sans rien
   deviner : un câble collé aux deux bouts est une liaison, borne à borne. Le
   reste se suit à la géométrie, comme sur un PDF : un trait posé au bout
   d'un point de connexion sans y être collé, un trait qui tombe sur le bord
   d'une forme, sur un autre trait (un T), sur un point de jonction, sur un
   renvoi vers une autre page — un dessin fait à la main. Le repère d'une
   forme se lit dans son texte, ses données, son groupe, ou le texte posé
   contre elle (`lireRepere` et les classes du lecteur de PDF : 09-pdf) ; la
   borne d'un point de connexion, dans son nom, ou le texte de borne écrit
   tout près. Le cartouche se lit avec le lecteur de PDF (les mêmes
   étiquettes : N° DE PLAN, FOLIO, INDICE, HARNESS…) : il donne le FWD et le
   folio. Chaque liaison garde sa CONFIANCE et ses raisons, son trajet et ses
   deux bouts (pour la relecture, qui les surligne sur la page rendue).

   ÉCRIRE. Les folios de Volta, pour les retoucher dans Visio : une page par
   folio ; chaque bloc est un groupe — son dessin (celui du folio), le texte
   de son repère, ses bornes en points de connexion NOMMÉS (le nom exact de
   la borne dans « Prompt », l'étiquette écrite à côté liée au point) ; chaque
   câble est un connecteur dynamique COLLÉ aux deux bornes (Connects et
   formules), son numéro et son type en texte ; le cartouche en tableau de
   texte. Un paquet complet : [Content_Types].xml, _rels, docProps,
   visio/document.xml, les pages — aucun maître n'est nécessaire.

   Testable hors navigateur : il reçoit le paquet déjà dézippé ({ chemin :
   texte ou octets }) et rend des fichiers ; le zip est l'affaire de 08-visio
   (fflate). Les mesures de lecture sont en POINTS, l'origine en haut à
   gauche — l'espace d'une page de PDF : la relecture est la même.
   =========================================================================== */
'use strict';

const SCHEMA_VISIO = (() => {
  const NS = 'http://schemas.microsoft.com/office/visio/2012/main', NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const REL = 'http://schemas.microsoft.com/visio/2010/relationships/';
  const PDFX = () => (typeof SCHEMA_PDF !== 'undefined' ? SCHEMA_PDF : null);

  /* ---- 1. L'XML : un lecteur tolérant, sans DOM (le moteur tourne aussi dans un Worker, et sous Node) --------------
     Un élément : { n (son nom, sans préfixe), a (ses attributs), c (ses enfants : éléments et textes, dans l'ordre) }.
     Le blanc ne compte que dans un texte de forme (<Text>, <fld>). */
  const ENT = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
  const deEnt = s => s.indexOf('&') < 0 ? s : s.replace(/&(#[xX][0-9a-fA-F]+|#\d+|[A-Za-z]+);/g, (m, e) => e[0] === '#' ? String.fromCodePoint(/^#[xX]/.test(e) ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e] != null ? ENT[e] : m);
  const BLANCS = new Set(['Text', 'fld']);
  function lireXml(s) {
    s = String(s || '').replace(/^\uFEFF/, '');
    const RE = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<!DOCTYPE[^>]*>|<(\/?)([^\s<>\/!?]+)((?:\s+[^\s=<>\/]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
    const racine = { n: '#', a: {}, c: [] }, pile = [racine]; let m, fin = 0;
    const texte = t => { const h = pile[pile.length - 1]; if (t && (BLANCS.has(h.n) || /\S/.test(t))) h.c.push(deEnt(t)); };
    while ((m = RE.exec(s))) {
      if (m.index > fin) texte(s.slice(fin, m.index)); fin = RE.lastIndex;
      if (m[1] != null) { pile[pile.length - 1].c.push(m[1]); continue; }
      if (!m[3]) continue;
      const nom = m[3].replace(/^.*:/, '');
      if (m[2]) { for (let i = pile.length - 1; i > 0; i--) if (pile[i].n === nom) { pile.length = i; break; } continue; }
      const a = {}, RA = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g; let q;
      while ((q = RA.exec(m[4]))) { const k = q[1], v = deEnt(q[2] != null ? q[2] : q[3]); if (/^xmlns/.test(k)) continue;
        const i = k.indexOf(':'), loc = i < 0 ? k : k.slice(i + 1); if (i >= 0 && k.slice(0, i) !== 'xml') a[k] = v; if (!(loc in a)) a[loc] = v; }
      const el = { n: nom, a, c: [] }; pile[pile.length - 1].c.push(el); if (!m[5]) pile.push(el); }
    if (fin < s.length) texte(s.slice(fin));
    return racine.c.find(x => typeof x === 'object') || null; }
  const els = (e, n) => e ? e.c.filter(x => typeof x === 'object' && (!n || x.n === n)) : [];
  const el = (e, n) => e ? e.c.find(x => typeof x === 'object' && x.n === n) || null : null;
  const decoder = u => { if (typeof u === 'string') return u; if (u[0] === 0xFF && u[1] === 0xFE) return new TextDecoder('utf-16le').decode(u); return new TextDecoder('utf-8').decode(u); };

  /* ---- 2. LE PAQUET : les relations mènent du paquet au document, du document aux pages et aux maîtres ---------- */
  function normaliser(chemin) { const out = []; String(chemin).replace(/\\/g, '/').split('/').forEach(p => { if (!p || p === '.') return; if (p === '..') out.pop(); else out.push(p); }); return out.join('/'); }
  function paquet(fichiers) {
    const parCle = new Map(); Object.keys(fichiers).forEach(k => parCle.set(normaliser(k).toLowerCase(), k));
    const cache = new Map(), cle = p => parCle.get(normaliser(p).toLowerCase());
    const P = { existe: p => cle(p) != null,
      xml(p) { const k = cle(p); if (k == null) return null; if (!cache.has(k)) cache.set(k, lireXml(decoder(fichiers[k]))); return cache.get(k); },
      relations(partie) { const i = partie.lastIndexOf('/'), dir = i >= 0 ? partie.slice(0, i + 1) : '', x = P.xml(dir + '_rels/' + partie.slice(i + 1) + '.rels');
        return els(x, 'Relationship').map(r => ({ id: r.a.Id, type: r.a.Type || '', cible: r.a.TargetMode === 'External' ? null : normaliser(/^\//.test(r.a.Target || '') ? r.a.Target : dir + (r.a.Target || '')) })); } };
    return P; }
  const relDe = (R, x) => { const rel = el(x, 'Rel'), id = rel && (rel.a['r:id'] || rel.a.id); return (R.find(r => r.id === id) || {}).cible || null; };

  /* La palette des couleurs indexées de Visio (la table par défaut du document) */
  const PALETTE = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#c0c0c0', '#e6e6e6', '#cdcdcd', '#b3b3b3', '#9a9a9a', '#808080', '#666666', '#4d4d4d', '#333333', '#1a1a1a'];
  function ouvrir(fichiers) {
    const P = paquet(fichiers);
    const docPart = (P.relations('').find(r => /\/document$/.test(r.type)) || {}).cible || 'visio/document.xml';
    if (!P.existe(docPart)) throw new Error('ce fichier n’est pas un dessin Visio (.vsdx) : visio/document.xml manque');
    const R = P.relations(docPart), cible = t => (R.find(r => r.type === REL + t || r.type.endsWith('/' + t)) || {}).cible;
    const D = { maitres: new Map(), styles: new Map(), couleurs: PALETTE.slice(), pages: [] };
    const doc = P.xml(docPart);
    els(el(doc, 'Colors'), 'ColorEntry').forEach(c => { if (/^#[0-9a-f]{6}$/i.test(c.a.RGB || '')) D.couleurs[+c.a.IX] = c.a.RGB.toLowerCase(); });
    els(el(doc, 'StyleSheets'), 'StyleSheet').forEach(s => { const f = feuilleVide(D, s); lireFeuille(s, f); D.styles.set(String(s.a.ID), f); });
    // les maîtres, avant les pages : une forme de page hérite de la forme de son maître
    const mp = cible('masters') || (P.existe('visio/masters/masters.xml') ? 'visio/masters/masters.xml' : null);
    if (mp && P.existe(mp)) { const X = P.xml(mp), RM = P.relations(mp);
      els(X, 'Master').forEach(m => { const M = { id: String(m.a.ID), nomU: m.a.NameU || m.a.Name || '', nom: m.a.Name || m.a.NameU || '', formes: [], parId: new Map() };
        const part = relDe(RM, m), C = part ? P.xml(part) : null; D.maitres.set(M.id, M);
        if (C) M.formes = els(el(C, 'Shapes'), 'Shape').map(x => forme(D, x, null, M, M)); }); }
    const pp = cible('pages') || 'visio/pages/pages.xml';
    if (!P.existe(pp)) throw new Error('ce dessin Visio n’a pas de pages (visio/pages/pages.xml manque)');
    const RP = P.relations(pp);
    els(P.xml(pp), 'Page').forEach((p, k) => { const ps = el(p, 'PageSheet'), f = feuilleVide(D, ps || { a: {} }); if (ps) lireFeuille(ps, f);
      const n = N => { const c = f.cel.get(N); const v = c ? parseFloat(c.V) : NaN; return isFinite(v) ? v : null; };
      const part = relDe(RP, p); const ech = (n('PageScale') || 1) / (n('DrawingScale') || 1);
      D.pages.push({ rang: k, id: String(p.a.ID), nom: p.a.Name || p.a.NameU || 'Page-' + (k + 1), nomU: p.a.NameU || p.a.Name || '', fond: p.a.Background === '1' || p.a.Background === 'true', arriere: p.a.BackPage != null ? String(p.a.BackPage) : null,
        largeur: (n('PageWidth') || 8.5) * ech, hauteur: (n('PageHeight') || 11) * ech, ech, xml: part && P.existe(part) ? P.xml(part) : null, feuille: f }); });
    return D; }

  /* ---- 3. LES FORMES : leurs cellules, leurs sections, l'héritage du maître et des styles -------------------------
     Une forme : { id, type, nomU, maitre (l'ID d'un maître), maitreForme (l'ID d'une forme dans ce maître), cel (N →
     { V, F, U }), sec (clé → { N, IX, cel, lignes : clé → { T, N, IX, cel } }), texte (l'élément <Text>), parent,
     enfants }. Une cellule absente se lit dans la forme du maître, puis dans le style (ligne, remplissage, texte). */
  const feuilleVide = (D, x) => ({ D, cel: new Map(), sec: new Map(), styles: { L: x.a.LineStyle, F: x.a.FillStyle, T: x.a.TextStyle } });
  const lireCel = c => ({ V: c.a.V, F: c.a.F, U: c.a.U });
  function lireFeuille(x, f) {
    els(x, 'Cell').forEach(c => f.cel.set(c.a.N, lireCel(c)));
    els(x, 'Section').forEach(s => { const cle = s.a.N === 'Geometry' ? 'Geometry#' + (s.a.IX || 0) : s.a.N;
      const S = { N: s.a.N, IX: s.a.IX != null ? +s.a.IX : 0, del: s.a.Del === '1', cel: new Map(), lignes: new Map() }; let k = 0;
      els(s, 'Cell').forEach(c => S.cel.set(c.a.N, lireCel(c)));
      els(s, 'Row').forEach(r => { const ix = r.a.IX != null ? +r.a.IX : k; k = ix + 1;
        const L = { T: r.a.T, N: r.a.N != null ? r.a.N : null, IX: ix, del: r.a.Del === '1', cel: new Map() }; els(r, 'Cell').forEach(c => L.cel.set(c.a.N, lireCel(c)));
        S.lignes.set(r.a.N != null ? 'n:' + r.a.N : 'i:' + ix, L); });
      f.sec.set(cle, S); }); }
  function forme(D, x, parent, ctx, maitre) {
    const f = Object.assign(feuilleVide(D, x), { id: String(x.a.ID), type: x.a.Type || 'Shape', nomU: x.a.NameU || x.a.Name || '', maitre: x.a.Master != null ? String(x.a.Master) : null,
      maitreForme: x.a.MasterShape != null ? String(x.a.MasterShape) : null, texte: el(x, 'Text'), parent, enfants: [], ctx, dansMaitre: maitre || null });
    lireFeuille(x, f); ctx.parId.set(f.id, f);
    f.enfants = els(el(x, 'Shapes'), 'Shape').map(y => forme(D, y, f, ctx, maitre));
    // une instance de groupe dont la page ne redit pas les formes : elles viennent toutes du maître
    if (!f.enfants.length && !maitre) { const b = base(f); if (b && b.enfants.length) f.enfants = b.enfants.map((y, i) => virtuelle(D, y, f, ctx, i)); }
    return f; }
  function virtuelle(D, m, parent, ctx, i) { const f = { D, cel: new Map(), sec: new Map(), styles: {}, id: parent.id + '.' + i, type: m.type, nomU: m.nomU, maitre: null, maitreForme: m.id, texte: null, parent, enfants: [], ctx, virtuelle: true };
    f.enfants = m.enfants.map((y, j) => virtuelle(D, y, f, ctx, j)); return f; }
  // la forme du maître dont celle-ci hérite
  function base(f) { if (f._b !== undefined) return f._b; let b = null;
    if (f.dansMaitre) b = null;
    else if (f.maitre != null) { const M = f.D.maitres.get(f.maitre); if (M) b = (f.maitreForme != null && M.parId.get(f.maitreForme)) || M.formes[0] || null; }
    else if (f.maitreForme != null) for (let g = f.parent; g; g = g.parent) if (g.maitre != null) { const M = f.D.maitres.get(g.maitre); b = M ? M.parId.get(f.maitreForme) || null : null; break; }
    return f._b = b; }
  const maitreDe = f => { for (let g = f; g; g = g.parent) if (g.maitre != null) return g.D.maitres.get(g.maitre) || null; return null; };
  const chaine = f => { const c = []; for (let g = f; g; g = base(g)) c.push(g); return c; };
  // le style de chaque sorte de cellule
  const DU_STYLE = { L: /^(LineWeight|LineColor|LinePattern|LineCap|BeginArrow|EndArrow|LineColorTrans|Rounding)$/, F: /^(FillForegnd|FillBkgnd|FillPattern|FillForegndTrans|FillBkgndTrans)$/, T: /^(LeftMargin|RightMargin|TopMargin|BottomMargin|VerticalAlign|TextBkgnd|TextDirection)$/ };
  // un style, puis son parent (une chaîne courte : on s'arrête à douze, contre une boucle)
  function styleChaine(D, id, sorte, voir) { for (let n = 0; id != null && n < 12; n++) { const s = D.styles.get(String(id)); if (!s) return null; const r = voir(s); if (r) return r; const p = s.styles[sorte]; id = p != null && String(p) !== String(id) ? p : null; } return null; }
  const styleDe = (f, sorte) => { for (const g of chaine(f)) if (g.styles && g.styles[sorte] != null) return g.styles[sorte]; return null; };
  const duStyle = (f, N, sorte) => styleChaine(f.D, styleDe(f, sorte), sorte, s => s.cel.get(N));
  function cellule(f, N) { for (const g of chaine(f)) { const c = g.cel.get(N); if (c) return c; }
    for (const k of ['L', 'F', 'T']) if (DU_STYLE[k].test(N)) return duStyle(f, N, k); return null; }
  const num = (f, N, def) => { const c = cellule(f, N), v = c ? parseFloat(c.V) : NaN; return isFinite(v) ? v : def; };
  const texteCel = c => c && c.V != null ? String(c.V) : '';
  // une section, fusionnée du maître à l'instance (une ligne supprimée ne s'hérite plus)
  function section(f, cle) { let S = null; const ch = chaine(f);
    for (let i = ch.length - 1; i >= 0; i--) { const s = ch[i].sec.get(cle); if (!s) continue; if (s.del) { S = null; continue; }
      if (!S) S = { N: s.N, IX: s.IX, cel: new Map(s.cel), lignes: new Map() }; else s.cel.forEach((v, k) => S.cel.set(k, v));
      s.lignes.forEach((L, k) => { if (L.del) { S.lignes.delete(k); return; } const p = S.lignes.get(k); S.lignes.set(k, p ? { ...p, T: L.T || p.T, cel: new Map([...p.cel, ...L.cel]) } : { ...L, cel: new Map(L.cel) }); }); }
    if (!S && (cle === 'Character' || cle === 'Paragraph')) return styleChaine(f.D, styleDe(f, 'T'), 'T', s => s.sec.get(cle));
    return S; }
  const lignesDe = S => S ? [...S.lignes.values()].sort((a, b) => (a.IX == null ? 1e9 : a.IX) - (b.IX == null ? 1e9 : b.IX)) : [];
  const lv = (L, N, def) => { const c = L.cel.get(N), v = c ? parseFloat(c.V) : NaN; return isFinite(v) ? v : def; };
  const geometries = f => { const cles = new Set(); chaine(f).forEach(g => g.sec.forEach((s, k) => { if (/^Geometry#/.test(k)) cles.add(k); })); return [...cles].sort((a, b) => +a.split('#')[1] - +b.split('#')[1]); };
  const estUnD = f => !!(cellule(f, 'BeginX') && cellule(f, 'EndX'));
  function couleur(D, c) { if (!c || c.V == null) return undefined; const v = String(c.V).trim(); if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
    if (/^\d+$/.test(v)) return D.couleurs[+v] || '#000000'; const m = /RGB\((\d+),\s*(\d+),\s*(\d+)\)/i.exec(c.F || ''); return m ? '#' + [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, '0')).join('') : undefined; }

  /* ---- 4. LA GÉOMÉTRIE : du repère de la forme à celui de la page --------------------------------------------------
     Une matrice [a b c d e f] : x' = a x + c y + e. Le passage au parent (MS-VSDX 2.2.3.2.1) : retirer LocPin, retourner
     (FlipX, FlipY), tourner de Angle, ajouter Pin. La page de lecture : des points, l'origine en haut à gauche. */
  const mul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
  const app = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  function locale(f) { const W = num(f, 'Width', 0), H = num(f, 'Height', 0), px = num(f, 'PinX', 0), py = num(f, 'PinY', 0), lx = num(f, 'LocPinX', W / 2), ly = num(f, 'LocPinY', H / 2);
    const t = num(f, 'Angle', 0), fx = num(f, 'FlipX', 0) ? -1 : 1, fy = num(f, 'FlipY', 0) ? -1 : 1, c = Math.cos(t), s = Math.sin(t);
    const m = [c * fx, s * fx, -s * fy, c * fy, 0, 0]; m[4] = px - (m[0] * lx + m[2] * ly); m[5] = py - (m[1] * lx + m[3] * ly); return m; }
  const matriceParent = f => f.parent ? matrice(f.parent) : f.ctx.M;
  const matrice = f => f._m || (f._m = mul(matriceParent(f), locale(f)));
  // une forme en chemins, dans son repère : [{ pts, ferme, courbe, noFill, noLine }]
  function arcCercle(a, m, b, n) { // le cercle qui passe par a, m, b ; n cordes de a à b
    const ax = a[0], ay = a[1], bx = m[0], by = m[1], cx = b[0], cy = b[1], d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(d) < 1e-12) return [b];
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d, uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    const r = Math.hypot(ax - ux, ay - uy), t0 = Math.atan2(ay - uy, ax - ux), tm = Math.atan2(by - uy, bx - ux), t1 = Math.atan2(cy - uy, cx - ux);
    const norm = x => { while (x < 0) x += 2 * Math.PI; while (x >= 2 * Math.PI) x -= 2 * Math.PI; return x; };
    let d1 = norm(t1 - t0); const dm = norm(tm - t0); if (dm > d1) d1 = d1 - 2 * Math.PI;
    const out = []; for (let k = 1; k <= n; k++) { const t = t0 + d1 * k / n; out.push([ux + r * Math.cos(t), uy + r * Math.sin(t)]); } out[out.length - 1] = b; return out; }
  function arcElliptique(a, b, ctl, angle, ratio, n) { if (!(ratio > 0)) ratio = 1; const c = Math.cos(-angle), s = Math.sin(-angle);
    const vers = p => { const x = p[0] * c - p[1] * s, y = p[0] * s + p[1] * c; return [x / ratio, y]; }, retour = p => { const x = p[0] * ratio, y = p[1]; return [x * c + y * s, -x * s + y * c]; };
    return arcCercle(vers(a), vers(ctl), vers(b), n).map(retour).map((p, i, A) => i === A.length - 1 ? b : p); }
  const nombres = s => (String(s || '').match(/-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?/g) || []).map(Number);
  // la fonction d'une géométrie (POLYLINE(…), NURBS(…)) : dans la valeur de la cellule (MS-VSDX), parfois dans sa formule
  const fonction = (c, nom) => { if (!c) return ''; const re = new RegExp(nom + '\\s*\\('); return re.test(c.V || '') ? c.V : re.test(c.F || '') ? c.F : ''; };
  function chemins(f) { const W = num(f, 'Width', 0), H = num(f, 'Height', 0), out = [];
    for (const k of geometries(f)) { const S = section(f, k); if (!S) continue; const sv = N => { const c = S.cel.get(N); return c ? +c.V === 1 || c.V === 'true' : false; };
      if (sv('NoShow')) continue; const noFill = sv('NoFill'), noLine = sv('NoLine'); let cur = null, pos = [0, 0];
      const nouveau = p => { cur = { pts: [p], courbe: false, noFill, noLine }; out.push(cur); pos = p; }, vers = p => { if (!cur) nouveau(pos); cur.pts.push(p); pos = p; };
      for (const L of lignesDe(S)) { const T = L.T || '', X = lv(L, 'X', 0), Y = lv(L, 'Y', 0), A = lv(L, 'A', 0), B = lv(L, 'B', 0), C = lv(L, 'C', 0), Dd = lv(L, 'D', 1);
        if (T === 'MoveTo') nouveau([X, Y]); else if (T === 'RelMoveTo') nouveau([X * W, Y * H]);
        else if (T === 'LineTo') vers([X, Y]); else if (T === 'RelLineTo') vers([X * W, Y * H]);
        else if (T === 'ArcTo') { const p = [X, Y], L2 = dist(pos, p); if (Math.abs(A) < 1e-9 || L2 < 1e-9) vers(p); else { const mx = (pos[0] + X) / 2, my = (pos[1] + Y) / 2, nx = -(Y - pos[1]) / L2, ny = (X - pos[0]) / L2;
            if (!cur) nouveau(pos); arcCercle(pos, [mx + nx * A, my + ny * A], p, 10).forEach(q => cur.pts.push(q)); cur.courbe = true; pos = p; } }
        else if (T === 'EllipticalArcTo' || T === 'RelEllipticalArcTo') { const r = T === 'RelEllipticalArcTo', p = r ? [X * W, Y * H] : [X, Y], q = r ? [A * W, B * H] : [A, B];
          if (!cur) nouveau(pos); arcElliptique(pos, p, q, C, Dd, 12).forEach(z => cur.pts.push(z)); cur.courbe = true; pos = p; }
        else if (T === 'RelCubBezTo' || T === 'RelQuadBezTo') { const p = [X * W, Y * H], c1 = [A * W, B * H], c2 = T === 'RelCubBezTo' ? [C * W, Dd * H] : null, p0 = pos; if (!cur) nouveau(pos);
          for (let s = 1; s <= 10; s++) { const t = s / 10, u = 1 - t; cur.pts.push(c2 ? [u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p[0], u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p[1]]
            : [u * u * p0[0] + 2 * u * t * c1[0] + t * t * p[0], u * u * p0[1] + 2 * u * t * c1[1] + t * t * p[1]]); } cur.courbe = true; pos = p; }
        else if (T === 'Ellipse') { const c = [X, Y], u = [A - X, B - Y], v = [C - X, Dd - Y], pts = []; for (let s = 0; s <= 32; s++) { const t = 2 * Math.PI * s / 32; pts.push([c[0] + Math.cos(t) * u[0] + Math.sin(t) * v[0], c[1] + Math.cos(t) * u[1] + Math.sin(t) * v[1]]); }
          out.push({ pts, courbe: true, noFill, noLine, ferme: true }); cur = null; }
        // (MS-VSDX 2.5.4.46-47 : un type 0, des coordonnées relatives à la largeur et à la hauteur ; sinon, celles de la forme)
        else if (T === 'PolylineTo') { const xs = nombres(fonction(L.cel.get('A'), 'POLYLINE')); if (xs.length >= 2) { const rx = xs[0] === 0, ry = xs[1] === 0; for (let i = 2; i + 1 < xs.length; i += 2) vers([rx ? xs[i] * W : xs[i], ry ? xs[i + 1] * H : xs[i + 1]]); } vers([X, Y]); }
        else if (T === 'NURBSTo') { const xs = nombres(fonction(L.cel.get('E'), 'NURBS')); if (xs.length >= 4) { const rx = xs[2] === 0, ry = xs[3] === 0; for (let i = 4; i + 1 < xs.length; i += 4) vers([rx ? xs[i] * W : xs[i], ry ? xs[i + 1] * H : xs[i + 1]]); } vers([X, Y]); if (cur) cur.courbe = true; }
        else if (T === 'SplineStart' || T === 'SplineKnot') vers([X, Y]); }
    }
    out.forEach(c => { if (c.ferme == null) c.ferme = c.pts.length > 2 && dist(c.pts[0], c.pts[c.pts.length - 1]) < 1e-6 * (1 + Math.abs(W) + Math.abs(H)); });
    return out; }

  /* ---- 5. LE TEXTE d'une forme : ses lignes, posées comme Visio les pose (le bloc de texte, l'alignement) ---------- */
  function texteDe(f) { let T = null; for (const g of chaine(f)) if (g.texte) { T = g.texte; break; } if (!T) return '';
    let s = ''; T.c.forEach(x => { if (typeof x === 'string') s += x; else if (x.n === 'fld') s += x.c.filter(y => typeof y === 'string').join(''); });
    return s.replace(/\r\n?|\u2028|\u2029/g, '\n').replace(/\uFFFC/g, '').replace(/\s+$/, ''); }
  function ligne0(f, cle) { const S = section(f, cle); return S ? lignesDe(S)[0] || null : null; }
  function blocTexte(f, m) { const s = texteDe(f); if (!s.trim()) return null;
    const W = num(f, 'Width', 0), H = num(f, 'Height', 0), tw = num(f, 'TxtWidth', Math.abs(W)), th = num(f, 'TxtHeight', Math.abs(H));
    const tpx = num(f, 'TxtPinX', W / 2), tpy = num(f, 'TxtPinY', H / 2), tlx = num(f, 'TxtLocPinX', tw / 2), tly = num(f, 'TxtLocPinY', th / 2), ta = num(f, 'TxtAngle', 0);
    const ch = ligne0(f, 'Character'), pa = ligne0(f, 'Paragraph'), taille = ch ? lv(ch, 'Size', 1 / 6) : 1 / 6, coul = (ch && couleur(f.D, ch.cel.get('Color'))) || '#000000', gras = ch ? (lv(ch, 'Style', 0) & 1) === 1 : false;
    const ha = pa ? lv(pa, 'HorzAlign', 1) : 1, va = num(f, 'VerticalAlign', 1), mg = n => num(f, n, 4 / 72);
    const lignes = s.split('\n'), lh = 1.2 * taille, total = lignes.length * lh, haut = va === 0 ? th - mg('TopMargin') : va === 2 ? mg('BottomMargin') + total : th / 2 + total / 2;
    const c = Math.cos(ta), sn = Math.sin(ta), bloc = (x, y) => [tpx + c * (x - tlx) - sn * (y - tly), tpy + sn * (x - tlx) + c * (y - tly)];
    const M = m || matrice(f), hpt = taille * 72;
    // le sens de lecture sur la page (le repère de la page a l'axe des y vers le bas)
    const o0 = app(M, ...bloc(0, 0)), o1 = app(M, ...bloc(1, 0)), L1 = dist(o0, o1) || 1, u = [(o1[0] - o0[0]) / L1, (o1[1] - o0[1]) / L1];
    const out = lignes.map((t, i) => { const base = haut - (i + 1) * lh + 0.27 * lh, x = ha === 0 ? mg('LeftMargin') : ha === 2 ? tw - mg('RightMargin') : tw / 2;
      const w = 0.56 * hpt * t.length, p = app(M, ...bloc(x, base)), d = ha === 0 || ha === 3 ? 0 : ha === 2 ? w : w / 2;
      return { s: t, o: [p[0] - u[0] * d, p[1] - u[1] * d], w, h: hpt }; });
    const cc = app(M, ...bloc(tw / 2, th / 2)), cv = app(M, ...bloc(tw / 2, haut - total / 2));
    return { s, lignes: out, u, angle: Math.round(Math.atan2(u[1], u[0]) * 180 / Math.PI), h: hpt, c: [cv[0], cv[1]], cBloc: cc, couleur: coul, gras, ancre: ha }; }

  /* ---- 6. UNE PAGE : chaque forme mise à plat, en points de la page ------------------------------------------------ */
  const boiteDe = pts => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return { x0, y0, x1, y1 }; };
  const rangees = (f, cle) => { const S = section(f, cle), m = new Map(); lignesDe(S).forEach(L => { if (L.N != null) m.set(L.N, L); }); return m; };
  function aPlat(D, P, formesHaut, fondDe) {
    const out = [], parId = new Map();
    const visiter = (f, parent, racine, prof) => { if (f.del) return;
      const m = matrice(f), d1 = estUnD(f), M = maitreDe(f), u = rangees(f, 'User'), pr = rangees(f, 'Property'), lk = rangees(f, 'Hyperlink');
      const i = { f, id: f.id, parent, racine: racine || null, prof, d1, groupe: f.type === 'Group', maitre: M ? M.nomU : '', nomU: f.nomU, fond: !!fondDe, enfants: [] };
      i.racine = racine || i; if (parent) parent.enfants.push(i);
      i.texte = texteDe(f).trim(); i.bloc = i.texte ? blocTexte(f, m) : null; i.cache = num(f, 'HideText', 0) === 1;
      i.user = new Map([...u].map(([k, L]) => [k, texteCel(L.cel.get('Value'))]));
      i.props = new Map([...pr].map(([k, L]) => [k, { v: texteCel(L.cel.get('Value')), label: texteCel(L.cel.get('Label')) }]));
      i.liens = [...lk.values()].map(L => ({ adresse: texteCel(L.cel.get('Address')), sous: texteCel(L.cel.get('SubAddress')), dit: texteCel(L.cel.get('Description')) }));
      const W = num(f, 'Width', 0), H = num(f, 'Height', 0);
      i.chemins = chemins(f).map(c => ({ ...c, pts: c.pts.map(p => app(m, p[0], p[1])) }));
      i.coins = [[0, 0], [W, 0], [W, H], [0, H]].map(p => app(m, p[0], p[1])); i.boite = boiteDe(i.chemins.length ? i.chemins.flatMap(c => c.pts) : i.coins);
      i.cadre = boiteDe(i.coins);
      const cx = section(f, 'Connection'); let k = 0;
      i.points = lignesDe(cx).map(L => ({ cle: L.N != null ? 'n:' + L.N : 'i:' + L.IX, nom: L.N || '', ix: L.N != null ? null : L.IX, rang: k++, prompt: texteCel(L.cel.get('Prompt')).trim(), p: app(m, lv(L, 'X', 0), lv(L, 'Y', 0)) }));
      const lw = num(f, 'LineWeight', 0.01), lp = num(f, 'LinePattern', 1), fp = num(f, 'FillPattern', 1);
      i.style = { lw: Math.max(0.25, lw * 72), trait: lp === 0 ? null : (couleur(D, cellule(f, 'LineColor')) || '#000000'), tirets: lp > 1, fond: fp === 0 ? null : (couleur(D, cellule(f, 'FillForegnd')) || '#ffffff') };
      if (d1) { const pm = matriceParent(f); i.debut = app(pm, num(f, 'BeginX', 0), num(f, 'BeginY', 0)); i.fin = app(pm, num(f, 'EndX', 0), num(f, 'EndY', 0));
        i.formules = { B: (cellule(f, 'BeginX') || {}).F || '', E: (cellule(f, 'EndX') || {}).F || '' }; i.objType = num(f, 'ObjType', 0); }
      out.push(i); parId.set(i.id, i);
      f.enfants.forEach(g => visiter(g, i, i.racine, prof + 1)); };
    formesHaut.forEach(f => visiter(f, null, null, 0));
    return { infos: out, parId }; }
  function formesDePage(D, Pg) { const ctx = { parId: new Map(), M: [72 * Pg.ech, 0, 0, -72 * Pg.ech, 0, Pg.hauteur * 72], ech: Pg.ech };
    const formes = Pg.xml ? els(el(Pg.xml, 'Shapes'), 'Shape').map(x => forme(D, x, null, ctx, null)) : [];
    return { ctx, formes }; }

  /* ---- 7. LIRE UNE PAGE : les câbles, leurs bouts, les réseaux, les liaisons ------------------------------------- */
  const E = () => PDFX() || {};
  const estRepere = s => { const X = E(); return X.estRepere ? X.estRepere(s) : !!(typeof lireRepere === 'function' && lireRepere(s)); };
  const estBorneTxt = s => { const X = E(); return X.estBorne ? X.estBorne(s) : /^[A-Z0-9]{1,4}$/i.test(s); };
  const estType = s => { const X = E(); return X.estType ? X.estType(s) : false; };
  const estPN = s => { const X = E(); return X.estPN ? X.estPN(s) : false; };
  const RE_FIL = /^W[-_]?\d{1,5}[A-Z]?$/i;
  const NOM_LIBRE = /^[A-Z0-9+][A-Z0-9\-_./+]{1,15}$/i;
  const mm = x => x * 25.4 / 72, dixieme = x => (Math.round(x * 10) / 10).toString().replace('.', ',');
  function grille(pas) { const cases = new Map(), cle = (i, j) => i * 100003 + j;
    return { ajouter(o, x0, y0, x1, y1) { for (let i = Math.floor(x0 / pas); i <= Math.floor(x1 / pas); i++) for (let j = Math.floor(y0 / pas); j <= Math.floor(y1 / pas); j++) { const k = cle(i, j); (cases.get(k) || cases.set(k, []).get(k)).push(o); } },
      chercher(x0, y0, x1, y1) { const vu = new Set(), out = []; for (let i = Math.floor(x0 / pas); i <= Math.floor(x1 / pas); i++) for (let j = Math.floor(y0 / pas); j <= Math.floor(y1 / pas); j++) { const c = cases.get(cle(i, j)); if (c) for (const o of c) if (!vu.has(o)) { vu.add(o); out.push(o); } } return out; } }; }
  function proj(p, a, b) { const vx = b[0] - a[0], vy = b[1] - a[1], L2 = vx * vx + vy * vy; let t = L2 ? ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L2 : 0; t = Math.max(0, Math.min(1, t)); const q = [a[0] + t * vx, a[1] + t * vy]; return { t, d: dist(p, q), q }; }
  const auBord = (p, B) => { const dx = Math.max(B.x0 - p[0], 0, p[0] - B.x1), dy = Math.max(B.y0 - p[1], 0, p[1] - B.y1); if (dx || dy) return Math.hypot(dx, dy); return -Math.min(p[0] - B.x0, B.x1 - p[0], p[1] - B.y0, B.y1 - p[1]); };
  const dedans = (p, B, m = 0) => p[0] >= B.x0 - m && p[0] <= B.x1 + m && p[1] >= B.y0 - m && p[1] <= B.y1 + m;
  function unions() { const p = []; const f = i => { while (p[i] !== i) { p[i] = p[p[i]]; i = p[i]; } return i; }; return { ajouter: () => { p.push(p.length); return p.length - 1; }, f, u: (a, b) => { a = f(a); b = f(b); if (a !== b) p[a] = b; } }; }
  // la page vue comme un PDF : les lignes de texte en « items » de pdf.js (l'espace du PDF : l'origine en bas), pour le lecteur de PDF
  function itemsPdf(infos, H) { const out = [];
    infos.forEach(i => { if (!i.bloc || i.cache) return; const u = i.bloc.u; i.bloc.lignes.forEach(L => { if (!L.s.trim()) return; const h = L.h, ux = u[0], uy = -u[1];
      out.push({ str: L.s, transform: [h * ux, h * uy, -h * uy, h * ux, L.o[0], H - L.o[1]], width: L.w, forme: i }); }); });
    return out; }
  const estRenvoiForme = i => !i.d1 && (/off.?page|renvoi|hors.?page|page.?ref|r[ée]f[ée]rence.*page|connecteur de page/i.test(i.maitre + ' ' + i.nomU) || [...i.user.keys()].some(k => /^OPC(Page|Shape)/i.test(k)) || i.user.has('voltaRenvoi'));

  function lirePage(D, Pg, rang, fondPg) {
    const { formes } = formesDePage(D, Pg), A = aPlat(D, Pg, formes), Wpt = Pg.largeur * 72, Hpt = Pg.hauteur * 72;
    const fond = fondPg ? aPlat(D, fondPg, formesDePage(D, fondPg).formes, true).infos : [];
    const infos = A.infos, parId = A.parId, X = E();
    // les mots de la page (le lecteur de PDF les sait mesurer et classer), le cartouche (ses étiquettes, sur cette page et son arrière-plan)
    const items = itemsPdf([...fond, ...infos], Hpt), vt = [1, 0, 0, -1, 0, Hpt];
    const mots = X.motsDesTextes ? X.motsDesTextes(items, vt) : [];
    // ses cadres aussi (les rectangles fermés) : le cartouche est le plus petit cadre qui porte deux étiquettes
    const cadres = [...fond, ...infos].filter(i => !i.d1).flatMap(i => i.chemins.filter(c => c.ferme && !c.noLine && !c.courbe && c.pts.length >= 4 && c.pts.length <= 6)
      .map(c => ({ sp: [{ pts: c.pts, ferme: true, courbe: false }], trait: true, plein: false, lw: i.style.lw, tirets: null, ct: [0, 0, 0], cf: null })));
    let champs = {}, zoneCartouche = null;
    if (X.lirePage) try { const r = X.lirePage({ largeur: Wpt, hauteur: Hpt, vt, items, formes: cadres }); champs = r.champs || {}; zoneCartouche = r.zoneCartouche || null; } catch (_) { }
    const hTxt = infos.filter(i => i.bloc && i.texte.length <= 4).map(i => i.bloc.h).sort((a, b) => a - b), u = hTxt.length ? hTxt[hTxt.length >> 1] : 8;
    const TOL = Math.max(2.2, 0.32 * u), dansCart = p => zoneCartouche && dedans(p, zoneCartouche, 2);

    /* Les sortes de formes : les câbles (une forme 1-D posée sur la page, ou un trait ouvert sans texte) ; les renvois ;
       les textes ; le reste : des formes qui portent des points de connexion, des bords. */
    const renvois = infos.filter(estRenvoiForme);
    const exclu = i => /dimension|cote|callout|l[ée]gende|legend/i.test(i.maitre + ' ' + i.nomU);
    const fils = infos.filter(i => !i.parent && !exclu(i) && !estRenvoiForme(i) && (i.d1 || (!i.texte && !i.points.length && i.chemins.length && i.chemins.every(c => !c.ferme && !c.noLine) && !i.enfants.length)))
      .map(i => { let pts = i.chemins.flatMap(c => c.pts); if (i.d1) { if (!pts.length || dist(pts[0], i.debut) > TOL) pts = [i.debut, ...pts]; if (dist(pts[pts.length - 1], i.fin) > TOL) pts.push(i.fin); }
        pts = pts.filter((p, k) => !k || dist(p, pts[k - 1]) > 1e-6); return { i, pts, a: pts[0], b: pts[pts.length - 1] }; })
      .filter(w => w.pts.length >= 2 && !(dansCart(w.a) && dansCart(w.b)));
    const estFil = new Set(fils.map(w => w.i));
    const formes2D = infos.filter(i => !i.d1 && !estFil.has(i) && !estRenvoiForme(i));
    const textes = [...infos, ...fond].filter(i => i.bloc && !estFil.has(i));
    // les index : les points de connexion, les bords, les textes
    const GP = grille(24); formes2D.forEach(i => i.points.forEach(r => GP.ajouter({ i, r }, r.p[0], r.p[1], r.p[0], r.p[1])));
    const GF = grille(48); formes2D.forEach(i => { if (i.boite.x1 - i.boite.x0 < 0.5 && i.boite.y1 - i.boite.y0 < 0.5) return; GF.ajouter(i, i.boite.x0, i.boite.y0, i.boite.x1, i.boite.y1); });
    const GT = grille(36); textes.forEach(t => { const B = boiteTexte(t); t.B = B; GT.ajouter(t, B.x0, B.y0, B.x1, B.y1); });
    const libre = t => !t.parent || (t.parent && !t.parent.parent && t.racine.groupe && !t.racine.points.length && !t.racine.chemins.length && t.racine.enfants.length === 1);
    // les étiquettes que Volta lie à un point de connexion (User.voltaBorne : le nom du point)
    const liees = new Map(); textes.forEach(t => { const b = t.user.get('voltaBorne'); if (b && t.racine) liees.set(t.racine.id + '|' + b, t); });
    // les colles : Connects, sinon les formules de BeginX / EndX
    const colles = new Map();
    els(el(Pg.xml, 'Connects'), 'Connect').forEach(c => { const de = String(c.a.FromSheet), cote = /^Begin/i.test(c.a.FromCell || '') ? 'B' : /^End/i.test(c.a.FromCell || '') ? 'E' : null; if (!cote) return;
      colles.set(de + cote, { vers: String(c.a.ToSheet), cellule: c.a.ToCell || '', part: c.a.ToPart != null ? +c.a.ToPart : null }); });
    fils.forEach(w => { if (!w.i.formules) return; ['B', 'E'].forEach(k => { if (colles.has(w.i.id + k)) return; const F = w.i.formules[k] || '';
      const m = /Sheet\.(\d+)!Connections\.(?:X(\d+)|([A-Za-z_][\w]*)\.X)/.exec(F); if (m) colles.set(w.i.id + k, { vers: m[1], cellule: m[2] ? 'Connections.X' + m[2] : 'Connections.' + m[3] + '.X', part: null, formule: true }); }); });

    /* Le REPÈRE d'une forme : son texte, ses données, son groupe, ou le texte posé contre elle. Rend { repere, comment, conf, i, mot }. */
    const cacheRep = new Map();
    function repereDe(S) { if (cacheRep.has(S)) return cacheRep.get(S); let r = null;
      // un bloc de Volta : son texte, tel qu'il est (on a pu le retoucher dans Visio)
      for (let g = S; g && !r; g = g.parent) if (g.user.get('voltaBloc')) { const t = (g.texte.split('\n')[0] || '').trim() || (g.props.get('Repere') || {}).v || ''; if (t) r = { repere: t, comment: 'repère du bloc', conf: 1, i: g, mot: g }; }
      const premier = t => t.split(/[\s\n]+/).find(x => estRepere(x)) || '';
      for (let g = S; g && !r; g = g.parent) { const t = premier(g.texte); if (t) r = { repere: t, comment: g === S ? 'repère de la forme' : 'repère du groupe', conf: 1, i: g, mot: g };
        // une donnée qui SE DIT repère (Tag, Repère, Designator…) : sa valeur, même d'une autre convention (K12, J101)
        else for (const [k, p] of g.props) if (/rep[eè]re|tag|designator|r[ée]f[ée]rence ?(?:de l.)?[ée]quipement|^name$|^nom$/i.test(k + ' ' + p.label) && (estRepere(p.v) || NOM_LIBRE.test(p.v))) { r = { repere: p.v.trim(), comment: 'repère dans les données de la forme', conf: estRepere(p.v) ? 0.99 : 0.97, i: g }; break; } }
      const R = S.racine || S;
      if (!r) { const c = []; const voir = g => { g.enfants.forEach(x => { const t = premier(x.texte); if (t) c.push({ t, x }); voir(x); }); }; voir(R);
        c.sort((a, b) => b.x.bloc.h - a.x.bloc.h || a.x.bloc.c[1] - b.x.bloc.c[1]); if (c[0]) r = { repere: c[0].t, comment: 'repère écrit dans le groupe', conf: 0.98, i: R, mot: c[0].x }; }
      if (!r) { const B = R.boite, pres = GT.chercher(B.x0 - 3 * u, B.y0 - 3 * u, B.x1 + 3 * u, B.y1 + 3 * u).filter(t => libre(t) && t.racine !== R && premier(t.texte));
        const dans = pres.filter(t => dedans(t.bloc.c, B)).sort((a, b) => b.bloc.h - a.bloc.h)[0];
        if (dans) r = { repere: premier(dans.texte), comment: 'repère écrit dans la forme', conf: 0.97, i: R, mot: dans };
        else { const contre = pres.map(t => ({ t, d: auBord(t.bloc.c, B) })).filter(o => o.d < 2.6 * u && !formes2D.some(k => k !== R && k.racine !== R && k.points.length && dedans(o.t.bloc.c, k.boite))).sort((a, b) => a.d - b.d)[0];
          if (contre) r = { repere: premier(contre.t.texte), comment: 'repère écrit contre la forme', conf: 0.95, i: R, mot: contre.t }; } }
      // un autre usage des noms (J101, K12, CB-12) : le texte de la forme, s'il a l'air d'un nom — deviné, il le dit
      if (!r) for (let g = S; g && !r; g = g.parent) { const t = (g.texte.split('\n')[0] || '').trim(); if (t && NOM_LIBRE.test(t) && /\d/.test(t) && !estType(t) && !RE_FIL.test(t) && (g.points.length || g === R)) r = { repere: t, comment: 'repère deviné : le texte de la forme', conf: 0.82, i: g, mot: g, devine: true }; }
      cacheRep.set(S, r); return r; }
    // la RÉFÉRENCE (part number) d'un équipement : ses données, sinon un texte qui en a la forme, dans son groupe
    function pnDe(R) { if (!R) return ''; for (let g = R.i; g; g = g.parent) for (const [k, p] of g.props) if (/part|r[ée]f[ée]rence|\bpn\b|p\/n|pi[eè]ce/i.test(k + ' ' + p.label) && !/rep[eè]re|[ée]quipement/i.test(k + ' ' + p.label) && p.v) return p.v;
      const top = R.i.racine || R.i; let v = ''; const voir = g => { if (v) return; g.enfants.forEach(x => { const t = x.texte.split(/\s+/).find(estPN); if (t && !v) v = t; voir(x); }); }; voir(top); return v; }
    // la BORNE d'un point de connexion : son étiquette liée, son nom, sinon le texte de borne écrit tout près
    function borneDe(S, r, p, R) {
      if (r) { const top = (R && R.i) || S.racine || S, lab = liees.get(top.id + '|' + r.nom) || liees.get((S.racine || S).id + '|' + r.nom);
        if (lab) { const t = lab.texte.split('\n')[0].trim(); return { borne: t, comment: t === r.prompt ? 'borne : le nom du point de connexion, écrit à côté' : 'borne écrite à côté du point de connexion (son nom était « ' + (r.prompt || r.nom) + ' »)', conf: 1, mot: lab }; }
        // un bloc de Volta : le nom exact de la borne est dans « Prompt » (vide : une masse, une borne sans numéro)
        if (top.user.get('voltaBloc') || S.user.get('voltaBloc')) return { borne: r.prompt, comment: r.prompt ? 'borne : le nom du point de connexion' : 'point de connexion sans numéro de borne', conf: 1 };
        if (r.prompt) return { borne: r.prompt, comment: 'borne : le nom du point de connexion', conf: 1 };
        if (r.nom && !/^(Row|Connections?|Pt|Point|Conn|Cp)_?\d*$/i.test(r.nom)) return { borne: r.nom, comment: 'borne : le nom du point de connexion', conf: 0.99 }; }
      const q = r ? r.p : p, top = (R && R.i && (R.i.racine || R.i)) || S.racine || S, rayon = Math.max(2.8 * u, 10);
      const c = GT.chercher(q[0] - rayon, q[1] - rayon, q[0] + rayon, q[1] + rayon).filter(t => { const s = t.texte; if (!s || s.length > 6 || /\s/.test(s) || (R && s === R.repere) || estRepere(s) || estType(s) || RE_FIL.test(s)) return false;
          return (estBorneTxt(s) || /^[A-Z0-9][A-Z0-9\-+]{0,4}$/i.test(s)) && (t.racine === top || libre(t)); })
        .map(t => { const v = [t.bloc.c[0] - q[0], t.bloc.c[1] - q[1]], lat = r && S.boite ? Math.min(Math.abs(v[1]), Math.abs(v[0])) : 0; return { t, d: Math.max(0, auBord(q, t.B)), s: Math.max(0, auBord(q, t.B)) + 0.35 * lat + (t.racine === top ? 0 : 0.5 * u) }; })
        .filter(o => o.d < rayon).sort((a, b) => a.s - b.s);
      // deux points de connexion se disputent un texte : il va au plus proche
      const choix = c.find(o => !r || !(S.racine || S).points.some(z => z !== r && auBord(z.p, o.t.B) + 0.5 < o.d) && !formes2D.some(k => k !== S && k.racine === top && k.points.some(z => z !== r && auBord(z.p, o.t.B) + 0.5 < o.d)));
      if (choix) return { borne: choix.t.texte, comment: 'borne écrite près du point, à ' + dixieme(mm(choix.d)) + ' mm', conf: choix.t.racine === top ? 0.97 : 0.93, mot: choix.t };
      const n = ((R && R.i) || top).points.length + (((R && R.i) || top).enfants || []).reduce((k, x) => k + x.points.length, 0);
      if (R && (typeof estMasse === 'function' && estMasse(R.repere))) return { borne: '', comment: 'masse : pas de numéro de borne', conf: 0.98 };
      if (n <= 1) return { borne: '', comment: 'un seul point de connexion : pas de numéro de borne', conf: 0.95 };
      return { borne: '', comment: 'aucun numéro de borne près du point', conf: 0.6 }; }
    // un TERMINAL : une borne d'équipement
    function terminal(S, r, p, comment, conf) { const R = repereDe(S), b = borneDe(S, r, p, R), mots = [R && R.mot, b.mot].filter(Boolean).map(t => t.B || boiteTexte(t)).filter(Boolean);
      return { genre: 'borne', repere: R ? R.repere : '', borne: b.borne, pn: pnDe(R), conf: conf * (R ? R.conf : 0.3) * b.conf, p: r ? r.p : p, forme: S, point: r,
        raisons: [comment + (r ? ' « ' + (r.prompt || r.nom || 'n° ' + (r.rang + 1)) + ' »' : ''), R ? R.comment + ' : ' + R.repere : 'aucun repère pour cette forme', b.comment + (b.borne ? ' : ' + b.borne : '')], mots, devine: R && R.devine }; }
    const pointPres = (p, tol) => { let best = null, bd = tol; GP.chercher(p[0] - tol, p[1] - tol, p[0] + tol, p[1] + tol).forEach(o => { const d = dist(o.r.p, p); if (d < bd) { bd = d; best = o; } }); return best; };
    const plusProche = (S, p, rayon) => { let best = null, bd = rayon; const voir = g => { g.points.forEach(r => { const d = dist(r.p, p); if (d < bd) { bd = d; best = { i: g, r }; } }); g.enfants.forEach(voir); }; voir(S); return best; };
    // la forme dont le bord passe au bout (la plus petite), ou qui le contient s'il est petit
    // (un petit dessin sans texte ni point de connexion — un point de jonction, une flèche — n'est pas une borne)
    const decor = i => !i.texte && !i.points.length && !i.enfants.length && (i.boite.x1 - i.boite.x0) < 2 * u && (i.boite.y1 - i.boite.y0) < 2 * u;
    function formeSous(p) { return GF.chercher(p[0] - TOL, p[1] - TOL, p[0] + TOL, p[1] + TOL).filter(i => !i.user.has('voltaCadre') && !i.user.has('voltaCartouche') && !decor(i) && (Math.abs(auBord(p, i.boite)) < TOL || (auBord(p, i.boite) < 0 && (i.boite.x1 - i.boite.x0) < 4 * u)))
      .filter(i => (i.boite.x1 - i.boite.x0) * (i.boite.y1 - i.boite.y0) < 0.3 * Wpt * Hpt).sort((a, b) => (a.boite.x1 - a.boite.x0) * (a.boite.y1 - a.boite.y0) - (b.boite.x1 - b.boite.x0) * (b.boite.y1 - b.boite.y0))[0] || null; }
    const renvoiPres = p => renvois.find(o => auBord(p, o.boite) < TOL) || null;
    // un autre câble sous le bout (son bout, ou son milieu : un T)
    function filSous(p, w) { let best = null, bd = TOL; fils.forEach(v => { if (v === w) return; for (let k = 1; k < v.pts.length; k++) { const q = proj(p, v.pts[k - 1], v.pts[k]); if (q.d < bd) { bd = q.d; best = { v, k, q }; } } }); return best; }

    /* Les BOUTS de chaque câble */
    const U = unions(), noeuds = [];
    const nouveau = p => { const n = U.ajouter(); noeuds.push({ p, bout: null }); return n; };
    const longueurs = pts => { const L = [0]; for (let k = 1; k < pts.length; k++) L.push(L[k - 1] + dist(pts[k - 1], pts[k])); return L; };
    fils.forEach(w => { w.L = longueurs(w.pts); w.Lt = w.L[w.L.length - 1]; w.na = nouveau(w.a); w.nb = nouveau(w.b); w.att = [{ s: 0, n: w.na }, { s: w.Lt, n: w.nb }]; w.info = infoFil(w); });
    const surFil = (v, k, q) => v.L[k - 1] + q.t * (v.L[k] - v.L[k - 1]);
    const accrocher = (n, v, s) => { if (s < TOL) U.u(n, v.na); else if (v.Lt - s < TOL) U.u(n, v.nb); else v.att.push({ s, n, t: true }); };
    const orphelins = [];
    function resoudre(w, cote) { const n = cote === 'B' ? w.na : w.nb, p = cote === 'B' ? w.a : w.b, g = colles.get(w.i.id + cote), N = noeuds[n];
      if (g) { const T = parId.get(g.vers);
        if (T && estFil.has(T)) { const v = fils.find(x => x.i === T); let best = null; for (let k = 1; k < v.pts.length; k++) { const q = proj(p, v.pts[k - 1], v.pts[k]); if (!best || q.d < best.q.d) best = { k, q }; } accrocher(n, v, surFil(v, best.k, best.q)); N.colle = true; return; }
        if (T && estRenvoiForme(T)) { N.bout = { genre: 'renvoi', renvoi: T, p, conf: 1, raisons: ['câble collé au renvoi ' + (T.texte || T.nomU)], mots: T.bloc ? [boiteTexte(T)] : [] }; return; }
        if (T) { let r = null; const m = /^Connections\.(?:X(\d+)|([A-Za-z_][\w]*)\.X)$/.exec(g.cellule);
          if (m) r = m[1] ? T.points.find(z => z.ix === +m[1] - 1) || T.points[+m[1] - 1] : T.points.find(z => z.nom === m[2]);
          if (!r && g.part != null && g.part >= 100) r = T.points.find(z => z.ix === g.part - 100) || T.points[g.part - 100];
          if (r) { N.bout = terminal(T, r, p, 'câble collé au point de connexion', 0.99); return; }
          const pp = plusProche(T, p, Math.max(6 * u, 0.25 * 72)); if (pp) { N.bout = terminal(pp.i, pp.r, p, 'câble collé à la forme, au point de connexion le plus proche', 0.96); return; }
          N.bout = terminal(T, null, p, 'câble collé à la forme', 0.9); return; } }
      const q = pointPres(p, TOL); if (q) { N.bout = terminal(q.i, q.r, p, 'bout posé sur le point de connexion, sans colle', 0.96); return; }
      const rv = renvoiPres(p); if (rv) { N.bout = { genre: 'renvoi', renvoi: rv, p, conf: 0.95, raisons: ['câble posé sur le renvoi ' + (rv.texte || rv.nomU)], mots: rv.bloc ? [boiteTexte(rv)] : [] }; return; }
      // contre une forme : sa borne, si elle a un nom ; sinon on regarde encore s'il tombe sur un autre câble (un T)
      let faible = null; const S = formeSous(p);
      if (S) { const pp = plusProche(S, p, Math.max(5 * u, 18)), t = pp ? terminal(pp.i, pp.r, p, 'bout posé contre la forme, au point de connexion le plus proche', 0.9) : terminal(S, null, p, 'bout posé contre la forme', 0.9); if (t.repere) { N.bout = t; return; } faible = t; }
      const j = filSous(p, w); if (j) { accrocher(n, j.v, surFil(j.v, j.k, j.q)); return; }
      if (faible) { orphelins.push({ p, raison: 'bout sans repère (' + (faible.borne ? 'borne ' + faible.borne : 'forme sans nom') + ')' }); return; }
      N.orphelin = true; }
    fils.forEach(w => { resoudre(w, 'B'); resoudre(w, 'E'); });
    // les points de jonction : un petit disque plein posé sur des câbles qui se croisent les relie
    infos.filter(i => !i.d1 && !i.texte && !i.points.length && i.chemins.length === 1 && i.chemins[0].ferme && i.chemins[0].courbe && !i.chemins[0].noFill && i.style.fond && i.style.fond !== '#ffffff' && (i.boite.x1 - i.boite.x0) < 1.6 * u)
      .forEach(d => { const c = [(d.boite.x0 + d.boite.x1) / 2, (d.boite.y0 + d.boite.y1) / 2], r = (d.boite.x1 - d.boite.x0) / 2 + TOL, n = nouveau(c);
        fils.forEach(v => { for (let k = 1; k < v.pts.length; k++) { const q = proj(c, v.pts[k - 1], v.pts[k]); if (q.d < r) { accrocher(n, v, surFil(v, k, q)); break; } } }); });
    // les arêtes : chaque câble, coupé à ses jonctions
    const aretes = [];
    fils.forEach(w => { w.att.sort((a, b) => a.s - b.s); for (let k = 1; k < w.att.length; k++) { const x = w.att[k - 1], y = w.att[k]; if (y.s - x.s < 1e-6) { U.u(x.n, y.n); continue; } aretes.push({ a: x.n, b: y.n, L: y.s - x.s, w, s0: x.s, s1: y.s, t: !!(x.t || y.t) }); } });
    const racineDe = n => U.f(n), adj = new Map(); aretes.forEach(e => { const a = racineDe(e.a), b = racineDe(e.b); if (a === b) return; e.ra = a; e.rb = b; (adj.get(a) || adj.set(a, []).get(a)).push(e); (adj.get(b) || adj.set(b, []).get(b)).push(e); });
    // les réseaux : les nœuds réunis par les arêtes
    const R2 = unions(); const idx = new Map(); const id = r => { if (!idx.has(r)) idx.set(r, R2.ajouter()); return idx.get(r); };
    noeuds.forEach((_, n) => id(racineDe(n))); aretes.forEach(e => { if (e.ra != null) R2.u(id(e.ra), id(e.rb)); });
    const reseaux = new Map(); noeuds.forEach((N, n) => { if (!N.bout) return; const r = R2.f(id(racineDe(n))); (reseaux.get(r) || reseaux.set(r, []).get(r)).push({ ...N.bout, n: racineDe(n) }); });
    // un câble dont un bout n'arrive nulle part : un orphelin (s'il touche quelque chose de l'autre côté, ou s'il est un connecteur)
    fils.forEach(w => [[w.na, w.a], [w.nb, w.b]].forEach(([n, p]) => { const N = noeuds[n]; if (!N.orphelin) return;
      const autre = noeuds[n === w.na ? w.nb : w.na]; if (autre.bout || autre.colle || w.i.objType === 2 || /connect/i.test(w.i.maitre + w.i.nomU)) orphelins.push({ p, raison: 'câble qui n’arrive nulle part' + (w.info.cable ? ' (' + w.info.cable + ')' : '') }); }));
    function dijkstra(depart) { const D2 = new Map([[depart, 0]]), prec = new Map(), file = [[0, depart]];
      while (file.length) { let bi = 0; for (let i = 1; i < file.length; i++) if (file[i][0] < file[bi][0]) bi = i; const [d, n] = file.splice(bi, 1)[0]; if (d > D2.get(n)) continue;
        for (const e of adj.get(n) || []) { const m = e.ra === n ? e.rb : e.ra, nd = d + e.L; if (nd < (D2.has(m) ? D2.get(m) : Infinity)) { D2.set(m, nd); prec.set(m, e); file.push([nd, m]); } } }
      return { D: D2, prec }; }
    const morceau = e => { const w = e.w, out = []; let prev = null; const pt = s => { for (let k = 1; k < w.L.length; k++) if (s <= w.L[k] + 1e-9) { const t = (s - w.L[k - 1]) / ((w.L[k] - w.L[k - 1]) || 1); return [w.pts[k - 1][0] + t * (w.pts[k][0] - w.pts[k - 1][0]), w.pts[k - 1][1] + t * (w.pts[k][1] - w.pts[k - 1][1])]; } return w.b; };
      const xs = [e.s0, ...w.L.filter(s => s > e.s0 && s < e.s1), e.s1]; xs.forEach(s => { const p = pt(s); if (prev) out.push([prev, p]); prev = p; }); return out; };
    const liaisons = [], renvoisPage = [];
    reseaux.forEach(B0 => { const vus = new Map(), B = B0.filter(b => { if (b.genre === 'renvoi') return true; const k = b.repere + '\u0001' + b.borne + '\u0001' + b.n; if (vus.has(k)) return false; vus.set(k, b); return true; });
      if (B.length < 2) return; const multi = B.length > 2, T = B.map(b => dijkstra(b.n)), paires = [];
      for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const d = T[i].D.get(B[j].n); if (d != null) paires.push({ i, j, d }); }
      paires.sort((a, b) => a.d - b.d || a.i - b.i || a.j - b.j); const U3 = unions(); B.forEach(() => U3.ajouter());
      for (const q of paires) { if (U3.f(q.i) === U3.f(q.j)) continue; U3.u(q.i, q.j); const x = B[q.i], y = B[q.j];
        const chemin = []; let n = y.n; while (n !== x.n) { const e = T[q.i].prec.get(n); if (!e) break; chemin.push(e); n = e.ra === n ? e.rb : e.ra; }
        const trajet = chemin.flatMap(morceau), ws = [...new Set(chemin.map(e => e.w))];
        if (x.genre === 'renvoi' || y.genre === 'renvoi') { renvoisPage.push({ x, y, trajet }); continue; }
        if (x.repere === y.repere && x.borne === y.borne && x.n === y.n) continue;
        const cable = (ws.find(w => w.info.cable) || { info: {} }).info.cable || '', type = (ws.find(w => w.info.type) || { info: {} }).info.type || '', route = (ws.find(w => w.info.route) || { info: {} }).info.route || '';
        const enT = chemin.some(e => e.t), colle = ws.length === 1 && x.raisons[0].startsWith('câble collé') && y.raisons[0].startsWith('câble collé');
        const conf = Math.min(x.conf, y.conf) * (multi ? 0.97 : 1) * (enT ? 0.95 : 1);
        const [g, d] = (x.p[0] < y.p[0] - 0.5 * u || (Math.abs(x.p[0] - y.p[0]) <= 0.5 * u && x.p[1] <= y.p[1])) ? [x, y] : [y, x];
        liaisons.push({ de: g.repere, borneDe: g.borne, pnDe: g.pn || '', vers: d.repere, borneVers: d.borne, pnVers: d.pn || '', type, cable, route, conf: Math.round(conf * 100) / 100,
          raisons: [colle ? 'câble collé aux deux bouts' : multi ? 'réseau à ' + B.length + ' bouts : relié de proche en proche' : 'câble suivi de bout en bout', ...(enT ? ['jonction en T sur un autre câble'] : []), ...(cable || type ? ['câble ' + [cable, type].filter(Boolean).join(' · ')] : []), ...g.raisons.map(r => 'de : ' + r), ...d.raisons.map(r => 'vers : ' + r)],
          trajet, bouts: [g.p, d.p], mots: [...g.mots, ...d.mots, ...ws.filter(w => w.i.bloc).map(w => boiteTexte(w.i))], colle }); } });
    if (X.replierBarrettesAPoser) X.replierBarrettesAPoser(liaisons);
    // les bornes que rien ne prend : un point de connexion d'un équipement nommé sans câble (seulement s'il porte un nom)
    const pris = new Set(); noeuds.forEach(N => { if (N.bout && N.bout.point) pris.add(N.bout.point); });
    return { rang, page: { w: Wpt, h: Hpt }, nom: Pg.nom, u, infos, fondInfos: fond, mots, champs, zoneCartouche, liaisons, renvois: renvoisPage, orphelins, bornesSeules: [], debug: { fils: fils.length, formes: formes2D.length, colles: colles.size, renvois: renvois.length, textes: textes.length } };

    function infoFil(w) { const i = w.i; let cable = '', type = '', route = '';
      const pc = i.props.get('Cable'), pt = i.props.get('Type'), prt = i.props.get('Route'), toks = i.texte.split(/[\s·;|]+/).filter(Boolean);
      // un câble de Volta dont le texte n'a pas changé : ses données, exactes
      if (i.user.get('voltaCable') && pc && i.texte.replace(/\s+/g, ' ') === [pc.v, pt ? pt.v : ''].filter(Boolean).join(' ')) return { cable: pc.v, type: pt ? pt.v : '', route: prt ? prt.v : '' };
      toks.forEach(t => { if (!type && estType(t)) type = t; else if (!cable && RE_FIL.test(t)) cable = t; });
      const reste = toks.filter(t => t !== type && t !== cable);
      if (!cable && reste.length === 1 && !estRepere(reste[0])) cable = reste[0];
      if (!type && cable && reste.length === 2 && reste[0] === cable) type = reste[1];
      if (i.user.get('voltaCable') && toks.length === 2 && !type && !cable) { cable = toks[0]; type = toks[1]; }
      for (const [k, p] of i.props) { const s = k + ' ' + p.label; if (!p.v) continue; if (!cable && /c[aâ]ble|wire|fil|tag|num[ée]ro/i.test(s) && !/type|t\/g/i.test(s)) cable = p.v; else if (!type && /type|section|gauge|t\/g/i.test(s)) type = p.v; else if (!route && /route|chemin/i.test(s)) route = p.v; }
      // un texte libre posé sur le câble : son numéro, son type
      if (!cable || !type) { const B = boiteDe(w.pts); GT.chercher(B.x0 - u, B.y0 - u, B.x1 + u, B.y1 + u).forEach(t => { if (!libre(t) || t.racine === i) return; const s = t.texte; if (!(RE_FIL.test(s) || estType(s))) return;
        let d = Infinity; for (let k = 1; k < w.pts.length; k++) d = Math.min(d, proj(t.bloc.c, w.pts[k - 1], w.pts[k]).d); if (d > 1.3 * Math.max(u, t.bloc.h)) return;
        if (!type && estType(s)) type = s; else if (!cable && RE_FIL.test(s)) cable = s; }); }
      return { cable, type, route }; }
  }
  // la boîte d'un texte (ses lignes), en points de la page
  function boiteTexte(t) { if (!t || !t.bloc) return null; const pts = []; t.bloc.lignes.forEach(L => { const u = t.bloc.u, n = [u[1], -u[0]], h = L.h;
      [[0, 0.25 * h], [L.w, 0.25 * h], [L.w, -0.8 * h], [0, -0.8 * h]].forEach(([a, b]) => pts.push([L.o[0] + u[0] * a - n[0] * b, L.o[1] + u[1] * a - n[1] * b])); });
    return pts.length ? boiteDe(pts) : null; }

  /* ---- 8. LE DOCUMENT : une page, un folio ; le cartouche donne le FWD ; les renvois relient les pages ------------ */
  function lireVsdx(fichiers) {
    const D = ouvrir(fichiers), avant = D.pages.filter(p => !p.fond), parId = new Map(D.pages.map(p => [p.id, p]));
    const lues = avant.map((p, k) => lirePage(D, p, k, p.arriere ? parId.get(p.arriere) : null));
    return assembler(lues, D); }
  function assembler(lues, D) {
    // une case vide du cartouche s'écrit « — »
    const net = v => /^[\s—–\-.]*$/.test(String(v || '')) ? '' : String(v).trim();
    lues.forEach(r => { r.champs = Object.fromEntries(Object.entries(r.champs || {}).map(([k, v]) => [k, net(v)])); });
    const pris = k => (lues.find(r => r.champs && r.champs[k]) || { champs: {} }).champs[k] || '';
    const numeros = lues.map(r => (r.champs && r.champs.numero) || ''), distincts = new Set(numeros.filter(Boolean)), indice = pris('indice'), harness = pris('harness'), titre = pris('titre');
    const generique = s => /^(page|folio|feuille|sheet)[-\s_]*\d+$/i.test(s) || /^(page|folio|feuille|sheet)$/i.test(s) || !s;
    lues.forEach((r, i) => { const f = (r.champs && r.champs.folioNum) || ((/(\d+)\s*$/.exec(r.nom) || [])[1]) || String(i + 1); r.folio = f;
      const num = numeros[i]; r.plan = num ? (distincts.size > 1 || lues.length === 1 ? num : num + ' F' + f) : !generique(r.nom) ? r.nom : f; });
    const tout = [];
    lues.forEach((r, i) => r.liaisons.forEach(l => tout.push({ ...l, page: i, folio: r.folio, plan: r.plan, fwd: r.plan, harness })));
    // les renvois : un renvoi d'une page répond à un renvoi d'une autre (son lien, ses données, son texte, le folio qu'il nomme)
    const R = []; lues.forEach((r, i) => r.renvois.forEach(q => { const [rv, autre] = q.x.genre === 'renvoi' ? [q.x, q.y] : [q.y, q.x]; if (autre.genre === 'renvoi') return; R.push({ i, o: rv.renvoi, bout: autre, q, p: rv.p, cle: cleRenvoi(rv.renvoi) }); }));
    const pageDe = s => { if (!s) return -1; const t = String(s).split('/')[0].trim().toLowerCase(); return lues.findIndex(r => r.nom.toLowerCase() === t || String(r.folio) === t || String(r.plan).toLowerCase() === t); };
    const vise = a => { for (const L of a.o.liens) { const j = pageDe(L.sous); if (j >= 0) return j; } const t = a.o.texte; const rv = E().renvoiDe ? E().renvoiDe(t) : null; if (rv) { const j = lues.findIndex(r => r.folio === String(rv.folio)); if (j >= 0) return j; } return pageDe(t); };
    const fait = new Set();
    R.sort((a, b) => a.i - b.i || a.p[1] - b.p[1] || a.p[0] - b.p[0]).forEach(a => { if (fait.has(a)) return;
      const c = R.filter(b => !fait.has(b) && b !== a && b.i !== a.i);
      // d'abord ce que Visio écrit du vis-à-vis (ses données OPC), puis la page que chacun vise, puis le même texte (un nom de signal)
      const ja = vise(a), b = c.find(x => a.cle && x.cle === a.cle && (ja < 0 || x.i === ja)) || c.find(x => ja >= 0 && x.i === ja && (vise(x) === a.i || vise(x) < 0) && (!a.o.texte || !x.o.texte || x.o.texte === a.o.texte || vise(x) === a.i))
        || c.find(x => a.o.texte && x.o.texte === a.o.texte && (ja < 0 || x.i === ja)) || null;
      if (!b) return; fait.add(a); fait.add(b);
      const [g, d] = [a.bout, b.bout]; if (g.repere === d.repere && g.borne === d.borne) return;
      tout.push({ de: g.repere, borneDe: g.borne, pnDe: g.pn || '', vers: d.repere, borneVers: d.borne, pnVers: d.pn || '', type: '', cable: '', conf: Math.round(Math.min(g.conf, d.conf) * 0.95 * 100) / 100,
        raisons: ['renvoi : page ' + lues[a.i].nom + ' → page ' + lues[b.i].nom + (a.o.texte ? ' (' + a.o.texte.replace(/\s+/g, ' ') + ')' : ''), ...g.raisons.map(r => 'de : ' + r), ...d.raisons.map(r => 'vers : ' + r)],
        trajet: a.q.trajet, bouts: [g.p, a.p], mots: g.mots, page: a.i, pageVers: b.i, trajetVers: b.q.trajet, boutsVers: [b.p, d.p], folio: lues[a.i].folio, plan: lues[a.i].plan, fwd: lues[a.i].plan, harness }); });
    return { pages: lues, liaisons: tout, scannees: 0, numero: distincts.size === 1 ? [...distincts][0] : '', indice, harness, titre, nPages: lues.length }; }
  // la clé d'un renvoi : ce que Visio écrit de son vis-à-vis (OPCShapeID…), sinon rien
  function cleRenvoi(o) { const s = o.user.get('OPCShapeID') || o.user.get('voltaRenvoi') || ''; return s ? s.replace(/[{}]/g, '') : ''; }

  /* ---- 9. LE RENDU d'une page, en SVG (des points, l'origine en haut à gauche) : la relecture la pose sur papier ---- */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f2 = x => Math.round(x * 100) / 100;
  function svgDePage(r) { let s = '';
    const dessiner = i => { const st = i.style;
      i.chemins.forEach(c => { if (c.pts.length < 2) return; const d = 'M' + c.pts.map(p => f2(p[0]) + ' ' + f2(p[1])).join('L') + (c.ferme ? 'Z' : '');
        const fill = c.ferme && !c.noFill && st.fond ? st.fond : 'none', stroke = !c.noLine && st.trait ? st.trait : 'none'; if (fill === 'none' && stroke === 'none') return;
        s += `<path d="${d}" fill="${fill}" stroke="${stroke}"${stroke !== 'none' ? ` stroke-width="${f2(st.lw)}"${st.tirets ? ` stroke-dasharray="${f2(3 * st.lw + 2)} ${f2(2 * st.lw + 1.5)}"` : ''}` : ''}/>`; }); };
    const ecrire = i => { if (!i.bloc || i.cache) return; const b = i.bloc, a = b.angle;
      b.lignes.forEach(L => { if (!L.s.trim()) return; s += `<text x="${f2(L.o[0])}" y="${f2(L.o[1])}" font-size="${f2(L.h)}" fill="${b.couleur}"${b.gras ? ' font-weight="700"' : ''}${a ? ` transform="rotate(${a} ${f2(L.o[0])} ${f2(L.o[1])})"` : ''} textLength="${f2(L.w)}" lengthAdjust="spacingAndGlyphs">${esc(L.s)}</text>`; }); };
    // l'arrière-plan d'abord, puis chaque forme : sa géométrie, ses formes, son texte
    const voir = i => { dessiner(i); i.enfants.forEach(voir); ecrire(i); };
    (r.fondInfos || []).filter(i => !i.parent).forEach(voir); r.infos.filter(i => !i.parent).forEach(voir);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f2(r.page.w)} ${f2(r.page.h)}" font-family="Arial, Helvetica, sans-serif" stroke-linecap="round" stroke-linejoin="round"><rect width="100%" height="100%" fill="#fff"/>${s}</svg>`; }

  /* ---- 10. ÉCRIRE : les folios de Volta en un paquet Visio ---------------------------------------------------------
     `doc` : { titre, auteur, date, indice, echelle, harness, folios: [{ nom, plan, folio ('1 / 6'), fwd, dessin: { comps
     (chacun avec `svg`, son dessin), fils, bbox } }] }. Les unités du dessin passent en pouces : la feuille de Volta
     (bbox) devient un A3 paysage. */
  const A3 = [420 / 25.4, 297 / 25.4];
  const nb = x => { const v = Math.round(x * 1e6) / 1e6; return Object.is(v, -0) ? '0' : String(v); };
  const xa = s => String(s == null ? '' : s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cel = (N, V, F, U) => `<Cell N="${N}" V="${typeof V === 'number' ? nb(V) : xa(V)}"${U ? ` U="${U}"` : ''}${F ? ` F="${xa(F)}"` : ''}/>`;
  const celS = (N, V) => cel(N, String(V == null ? '' : V), null, 'STR');
  const enTete = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const racineVisio = (n, corps) => `${enTete}<${n} xmlns="${NS}" xmlns:r="${NS_R}" xml:space="preserve">${corps}</${n}>`;
  // une géométrie : des chemins (pts dans le repère de la forme) → des sections
  const sectionGeo = (ix, pts, ferme, noFill, noLine) => `<Section N="Geometry" IX="${ix}">${cel('NoFill', noFill ? 1 : 0)}${cel('NoLine', noLine ? 1 : 0)}${cel('NoShow', 0)}${cel('NoSnap', 0)}${cel('NoQuickDrag', 0)}`
    + pts.map((p, k) => `<Row T="${k ? 'LineTo' : 'MoveTo'}" IX="${k + 1}">${cel('X', p[0])}${cel('Y', p[1])}</Row>`).join('') + (ferme && pts.length > 2 && dist(pts[0], pts[pts.length - 1]) > 1e-9 ? `<Row T="LineTo" IX="${pts.length + 1}">${cel('X', pts[0][0])}${cel('Y', pts[0][1])}</Row>` : '') + '</Section>';
  const couleurHex = c => { if (!c || c === 'none') return null; const m = /^#([0-9a-f]{3})$/i.exec(c); if (m) return '#' + m[1].split('').map(x => x + x).join('').toLowerCase(); return /^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : /^white$/i.test(c) ? '#ffffff' : /^black$/i.test(c) ? '#000000' : null; };
  const ligneUser = (N, v) => `<Row N="${N}">${cel('Value', String(v), null, typeof v === 'number' ? null : 'STR')}${celS('Prompt', '')}</Row>`;
  const ligneProp = (N, label, v) => `<Row N="${N}">${celS('Value', v)}${celS('Prompt', '')}${celS('Label', label)}${celS('Format', '')}${celS('SortKey', '')}${cel('Type', 0)}${cel('Invisible', 0)}${cel('Verify', 0)}${cel('DataLinked', 0)}${cel('Calendar', 0)}</Row>`;
  const sectionCar = (taille, coul, gras, police) => `<Section N="Character"><Row IX="0">${cel('Font', police || 'Arial')}${cel('Color', coul || '#000000')}${cel('Style', gras ? 1 : 0)}${cel('Case', 0)}${cel('Pos', 0)}${cel('FontScale', 1)}${cel('Size', taille, null, 'PT')}</Row></Section>`;
  const sectionPara = ha => `<Section N="Paragraph"><Row IX="0">${cel('IndFirst', 0)}${cel('IndLeft', 0)}${cel('IndRight', 0)}${cel('SpLine', -1.2)}${cel('SpBefore', 0)}${cel('SpAfter', 0)}${cel('HorzAlign', ha)}${cel('Bullet', 0)}${celS('BulletStr', '')}${cel('BulletFont', 0)}${cel('BulletFontSize', -1)}${cel('TextPosAfterBullet', 0)}${cel('Flags', 0)}</Row></Section>`;
  const marges0 = () => cel('LeftMargin', 0, null, 'PT') + cel('RightMargin', 0, null, 'PT') + cel('TopMargin', 0, null, 'PT') + cel('BottomMargin', 0, null, 'PT');
  // une forme de texte seule (une étiquette, un nom) : son centre, sa boîte, son texte
  function formeTexte(id, t, rel, extra) { const w = Math.max(t.w, 0.02), h = Math.max(t.taille * 1.3, 0.02), cx = t.cx - rel[0], cy = t.cy - rel[1];
    return `<Shape ID="${id}" Type="Shape" LineStyle="0" FillStyle="0" TextStyle="0">${cel('PinX', cx)}${cel('PinY', cy)}${cel('Width', w)}${cel('Height', h)}${cel('LocPinX', w / 2)}${cel('LocPinY', h / 2)}${cel('Angle', t.angle || 0)}${cel('FlipX', 0)}${cel('FlipY', 0)}${cel('ResizeMode', 0)}`
      + `${cel('LinePattern', 0)}${cel('FillPattern', 0)}${cel('VerticalAlign', 1)}${marges0()}${sectionCar(t.taille, t.couleur, t.gras, t.police)}${sectionPara(t.ancre)}${extra || ''}<Text>${xa(t.s)}</Text></Shape>`; }

  /* Le dessin d'un bloc (le SVG que Volta dessine) en traits et en textes, dans les unités du dessin : les classes du
     style du folio (06, `styleDessin`) donnent l'épaisseur, la couleur, les tirets ; un arc devient des cordes. */
  let STYLES = null;
  function stylesDuDessin() { if (STYLES) return STYLES; STYLES = new Map(); const css = typeof styleDessin === 'function' ? styleDessin() : '';
    css.replace(/([^{}]+)\{([^}]*)\}/g, (m, sel, corps) => { const p = {}; corps.split(';').forEach(d => { const i = d.indexOf(':'); if (i > 0) p[d.slice(0, i).trim()] = d.slice(i + 1).trim(); });
      sel.split(',').map(s => s.trim()).filter(s => /^\.[\w-]+$/.test(s)).forEach(s => STYLES.set(s.slice(1), { ...(STYLES.get(s.slice(1)) || {}), ...p })); return m; });
    return STYLES; }
  function arcSvg(x1, y1, rx, ry, phi, fa, fs, x2, y2) { // la paramétrisation par le centre (SVG 1.1, F.6.5), en cordes
    if (!rx || !ry) return [[x2, y2]]; const c = Math.cos(phi), s = Math.sin(phi), dx = (x1 - x2) / 2, dy = (y1 - y2) / 2, x1p = c * dx + s * dy, y1p = -s * dx + c * dy;
    rx = Math.abs(rx); ry = Math.abs(ry); const lam = x1p * x1p / (rx * rx) + y1p * y1p / (ry * ry); if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    const num2 = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p, den = rx * rx * y1p * y1p + ry * ry * x1p * x1p, k = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num2 / (den || 1)));
    const cxp = k * rx * y1p / ry, cyp = -k * ry * x1p / rx, cx = c * cxp - s * cyp + (x1 + x2) / 2, cy = s * cxp + c * cyp + (y1 + y2) / 2;
    const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
    const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry); let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
    const n = Math.max(4, Math.ceil(Math.abs(dt) / (Math.PI / 12))), out = [];
    for (let i = 1; i <= n; i++) { const t = t1 + dt * i / n; out.push([cx + rx * Math.cos(t) * c - ry * Math.sin(t) * s, cy + rx * Math.cos(t) * s + ry * Math.sin(t) * c]); } out[out.length - 1] = [x2, y2]; return out; }
  function cheminSvg(d) { const out = []; let cur = null, p = [0, 0], debut = [0, 0]; const toks = String(d).match(/[MmLlHhVvAaCcQqZzSsTt]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || []; let i = 0, cmd = '';
    const n = () => +toks[i++], vers = q => { if (!cur) { cur = { pts: [p], ferme: false }; out.push(cur); } cur.pts.push(q); p = q; };
    while (i < toks.length) { if (/[A-Za-z]/.test(toks[i])) cmd = toks[i++]; const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), o = rel ? p : [0, 0];
      if (C === 'M') { const q = [o[0] + n(), o[1] + n()]; cur = { pts: [q], ferme: false }; out.push(cur); p = debut = q; cmd = rel ? 'l' : 'L'; }
      else if (C === 'L') vers([o[0] + n(), o[1] + n()]); else if (C === 'H') vers([(rel ? p[0] : 0) + n(), p[1]]); else if (C === 'V') vers([p[0], (rel ? p[1] : 0) + n()]);
      else if (C === 'A') { const rx = n(), ry = n(), phi = n() * Math.PI / 180, fa = n(), fs = n(), q = [o[0] + n(), o[1] + n()]; arcSvg(p[0], p[1], rx, ry, phi, fa, fs, q[0], q[1]).forEach(vers); p = q; }
      else if (C === 'C') { const c1 = [o[0] + n(), o[1] + n()], c2 = [o[0] + n(), o[1] + n()], q = [o[0] + n(), o[1] + n()], p0 = p; for (let s = 1; s <= 8; s++) { const t = s / 8, u = 1 - t; vers([u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * q[0], u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * q[1]]); } }
      else if (C === 'Q') { const c1 = [o[0] + n(), o[1] + n()], q = [o[0] + n(), o[1] + n()], p0 = p; for (let s = 1; s <= 8; s++) { const t = s / 8, u = 1 - t; vers([u * u * p0[0] + 2 * u * t * c1[0] + t * t * q[0], u * u * p0[1] + 2 * u * t * c1[1] + t * t * q[1]]); } }
      else if (C === 'S' || C === 'T') { const k = C === 'S' ? 4 : 2; for (let j = 0; j < k - 2; j++) n(); vers([o[0] + n(), o[1] + n()]); }
      else if (C === 'Z') { if (cur) { cur.ferme = true; if (dist(cur.pts[0], p) > 1e-9) cur.pts.push(cur.pts[0]); } p = debut; cur = null; }
      else i++; }
    return out; }
  function primitivesSvg(svg) { const S = stylesDuDessin(), traits = [], textes = [], X = lireXml('<g>' + svg + '</g>');
    const style = e => { const p = {}; String(e.a.class || '').split(/\s+/).filter(Boolean).forEach(k => Object.assign(p, S.get(k) || {})); String(e.a.style || '').split(';').forEach(d => { const i = d.indexOf(':'); if (i > 0) p[d.slice(0, i).trim()] = d.slice(i + 1).trim(); });
      ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'font-size', 'font-weight', 'letter-spacing'].forEach(k => { if (e.a[k] != null) p[k] = e.a[k]; }); return p; };
    const trait = (pts, ferme, p, M) => { const stroke = couleurHex(p.stroke), fill = p['fill-opacity'] === '0' ? null : couleurHex(p.fill === undefined ? '#000000' : p.fill); if (!stroke && !fill) return;
      traits.push({ pts: pts.map(q => app(M, q[0], q[1])), ferme, trait: stroke, epaisseur: stroke ? parseFloat(p['stroke-width'] || '1') : 0, tirets: !!(p['stroke-dasharray'] && p['stroke-dasharray'] !== 'none'), fond: ferme ? fill : null }); };
    const visiter = (e, M) => { if (typeof e !== 'object') return; let m = M; const tr = /translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)/.exec(e.a.transform || ''), sc = /scale\(\s*(-?[\d.]+)/.exec(e.a.transform || '');
      if (tr) m = mul(m, [1, 0, 0, 1, +tr[1], +tr[2]]); if (sc) m = mul(m, [+sc[1], 0, 0, +sc[1], 0, 0]);
      const p = style(e), a = k => parseFloat(e.a[k] || '0');
      if (e.n === 'rect') { const x = a('x'), y = a('y'), w = a('width'), h = a('height'); trait([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], true, p, m); }
      else if (e.n === 'line') trait([[a('x1'), a('y1')], [a('x2'), a('y2')]], false, { ...p, fill: 'none' }, m);
      else if (e.n === 'circle') { const cx = a('cx'), cy = a('cy'), r = a('r'), pts = []; for (let k = 0; k <= 20; k++) { const t = 2 * Math.PI * k / 20; pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); } trait(pts, true, p, m); }
      else if (e.n === 'path') cheminSvg(e.a.d).forEach(c => trait(c.pts, c.ferme, c.ferme ? p : { ...p, fill: 'none' }, m));
      else if (e.n === 'polyline' || e.n === 'polygon') { const xs = nombres(e.a.points), pts = []; for (let k = 0; k + 1 < xs.length; k += 2) pts.push([xs[k], xs[k + 1]]); if (e.n === 'polygon') pts.push(pts[0]); trait(pts, e.n === 'polygon', e.n === 'polygon' ? p : { ...p, fill: 'none' }, m); }
      else if (e.n === 'text') { const s = e.c.filter(x => typeof x === 'string').join('').trim(); if (s) { const o = app(m, a('x'), a('y')), k = Math.hypot(m[0], m[1]) || 1;
          textes.push({ s, x: o[0], y: o[1], taille: parseFloat(p['font-size'] || '8') * k, espace: parseFloat(p['letter-spacing'] || '0') * k, ancre: e.a['text-anchor'] === 'middle' ? 1 : e.a['text-anchor'] === 'end' ? 2 : 0, couleur: couleurHex(p.fill) || '#000000', gras: +(p['font-weight'] || 400) >= 600, classe: String(e.a.class || '') }); } return; }
      e.c.forEach(x => visiter(x, m)); };
    visiter(X, [1, 0, 0, 1, 0, 0]); return { traits, textes }; }

  function ecrireFolios(doc) {
    const fichiers = {}, pages = [], n = doc.folios.length, noms = new Set(), quand = doc.quand || new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    doc.folios.forEach((F, k) => { let nom = F.nom || 'Folio ' + (k + 1); while (noms.has(nom)) nom += ' bis'; noms.add(nom); pages.push({ nom, xml: pageDuFolio(F, doc) }); });
    fichiers['[Content_Types].xml'] = `${enTete}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>`
      + `<Override PartName="/visio/document.xml" ContentType="application/vnd.ms-visio.drawing.main+xml"/><Override PartName="/visio/pages/pages.xml" ContentType="application/vnd.ms-visio.pages+xml"/>`
      + pages.map((p, k) => `<Override PartName="/visio/pages/page${k + 1}.xml" ContentType="application/vnd.ms-visio.page+xml"/>`).join('')
      + `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/><Override PartName="/docProps/custom.xml" ContentType="application/vnd.openxmlformats-officedocument.custom-properties+xml"/></Types>`;
    fichiers['_rels/.rels'] = `${enTete}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>`
      + `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/><Relationship Id="rId3" Type="${REL}document" Target="visio/document.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties" Target="docProps/custom.xml"/></Relationships>`;
    fichiers['docProps/core.xml'] = `${enTete}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`
      + `<dc:title>${xa(doc.titre || '')}</dc:title><dc:creator>${xa(doc.auteur || 'Volta')}</dc:creator><cp:lastModifiedBy>Volta</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${quand}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${quand}</dcterms:modified><dc:language>fr-FR</dc:language></cp:coreProperties>`;
    fichiers['docProps/app.xml'] = `${enTete}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Volta</Application>`
      + `<HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Pages</vt:lpstr></vt:variant><vt:variant><vt:i4>${n}</vt:i4></vt:variant></vt:vector></HeadingPairs>`
      + `<TitlesOfParts><vt:vector size="${n}" baseType="lpstr">${pages.map(p => `<vt:lpstr>${xa(p.nom)}</vt:lpstr>`).join('')}</vt:vector></TitlesOfParts><Company></Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0000</AppVersion></Properties>`;
    fichiers['docProps/custom.xml'] = `${enTete}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">`
      + `<property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2" name="BuildNumberEdited"><vt:i4>268440305</vt:i4></property><property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="3" name="IsMetric"><vt:bool>true</vt:bool></property></Properties>`;
    fichiers['visio/_rels/document.xml.rels'] = `${enTete}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}pages" Target="pages/pages.xml"/></Relationships>`;
    fichiers['visio/document.xml'] = racineVisio('VisioDocument', `<DocumentSettings TopPage="0" DefaultTextStyle="0" DefaultLineStyle="0" DefaultFillStyle="0" DefaultGuideStyle="0"><GlueSettings>9</GlueSettings><SnapSettings>65847</SnapSettings><SnapExtensions>34</SnapExtensions><SnapAngles/><DynamicGridEnabled>1</DynamicGridEnabled><ProtectStyles>0</ProtectStyles><ProtectShapes>0</ProtectShapes><ProtectMasters>0</ProtectMasters><ProtectBkgnds>0</ProtectBkgnds></DocumentSettings>`
      + `<Colors>${PALETTE.map((c, i) => `<ColorEntry IX="${i}" RGB="${c.toUpperCase()}"/>`).join('')}</Colors><FaceNames><FaceName NameU="Arial"/><FaceName NameU="Consolas"/></FaceNames>`
      + `<StyleSheets><StyleSheet ID="0" NameU="No Style" Name="No Style">${cel('EnableLineProps', 1)}${cel('EnableFillProps', 1)}${cel('EnableTextProps', 1)}${cel('HideForApply', 0)}${cel('LineWeight', 0.75 / 72, null, 'PT')}${cel('LineColor', '#000000')}${cel('LinePattern', 1)}${cel('Rounding', 0)}${cel('LineCap', 0)}${cel('BeginArrow', 0)}${cel('EndArrow', 0)}`
      + `${cel('FillForegnd', '#ffffff')}${cel('FillBkgnd', '#ffffff')}${cel('FillPattern', 1)}${cel('ShdwPattern', 0)}${cel('LeftMargin', 4 / 72, null, 'PT')}${cel('RightMargin', 4 / 72, null, 'PT')}${cel('TopMargin', 4 / 72, null, 'PT')}${cel('BottomMargin', 4 / 72, null, 'PT')}${cel('VerticalAlign', 1)}${cel('TextBkgnd', 0)}`
      + `${sectionCar(1 / 6, '#000000', false, 'Arial')}${sectionPara(1)}<Section N="Tabs"><Row IX="0"/></Section></StyleSheet></StyleSheets>`
      + `<DocumentSheet NameU="TheDoc" Name="TheDoc" LineStyle="0" FillStyle="0" TextStyle="0">${cel('DocLangID', 'fr-FR')}${cel('OutputFormat', 0)}${cel('LockPreview', 0)}${cel('AddMarkup', 0)}${cel('ViewMarkup', 0)}</DocumentSheet>`);
    fichiers['visio/pages/_rels/pages.xml.rels'] = `${enTete}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${pages.map((p, k) => `<Relationship Id="rId${k + 1}" Type="${REL}page" Target="page${k + 1}.xml"/>`).join('')}</Relationships>`;
    fichiers['visio/pages/pages.xml'] = racineVisio('Pages', pages.map((p, k) => `<Page ID="${k}" NameU="${xa(p.nom)}" Name="${xa(p.nom)}"><PageSheet LineStyle="0" FillStyle="0" TextStyle="0">${cel('PageWidth', A3[0], null, 'MM')}${cel('PageHeight', A3[1], null, 'MM')}${cel('ShdwOffsetX', 0.1181102362204724, null, 'MM')}${cel('ShdwOffsetY', -0.1181102362204724, null, 'MM')}${cel('PageScale', 0.03937007874015748, null, 'MM')}${cel('DrawingScale', 0.03937007874015748, null, 'MM')}${cel('DrawingSizeType', 0)}${cel('DrawingScaleType', 0)}${cel('InhibitSnap', 0)}${cel('PageLockReplace', 0, null, 'BOOL')}${cel('PageLockDuplicate', 0, null, 'BOOL')}${cel('UIVisibility', 0)}${cel('ShdwType', 0)}${cel('ShdwObliqueAngle', 0)}${cel('ShdwScaleFactor', 1)}${cel('DrawingResizeType', 1)}${cel('PageShapeSplit', 1)}${cel('PrintPageOrientation', 2)}${cel('PaperKind', 8)}</PageSheet><Rel r:id="rId${k + 1}"/></Page>`).join(''));
    pages.forEach((p, k) => { fichiers['visio/pages/page' + (k + 1) + '.xml'] = p.xml; });
    return fichiers; }

  // UN FOLIO, une page : le cadre, les blocs (des groupes), les câbles (des connecteurs collés), le cartouche
  function pageDuFolio(F, doc) {
    const d = F.dessin, bb = d.bbox, s = A3[0] / bb.w, X = x => (x - bb.x) * s, Y = y => A3[1] - (y - bb.y) * s;
    let id = 1; const formes = [], connects = [];
    // le cadre de la feuille, à 10 mm du bord
    const m = 10 / 25.4; formes.push(`<Shape ID="${id++}" NameU="Cadre" Name="Cadre" Type="Shape" LineStyle="0" FillStyle="0" TextStyle="0">${cel('PinX', A3[0] / 2)}${cel('PinY', A3[1] / 2)}${cel('Width', A3[0] - 2 * m)}${cel('Height', A3[1] - 2 * m)}${cel('LocPinX', A3[0] / 2 - m)}${cel('LocPinY', A3[1] / 2 - m)}${cel('Angle', 0)}${cel('LineWeight', 0.6 / 72, null, 'PT')}${cel('LineColor', '#9aa5b1')}${cel('SelectMode', 0)}<Section N="User">${ligneUser('voltaCadre', 1)}</Section>${sectionGeo(0, [[0, 0], [A3[0] - 2 * m, 0], [A3[0] - 2 * m, A3[1] - 2 * m], [0, A3[1] - 2 * m], [0, 0]], true, true, false)}</Shape>`);
    // les bornes de chaque bloc : là où ses câbles le touchent (epA / epB), et ses rangées
    const blocs = d.comps.map((c, k) => ({ c, k, pins: [] }));
    const pinDe = (B, borne, x, y) => { let p = B.pins.find(q => q.borne === borne && Math.abs(q.x - x) < 1 && Math.abs(q.y - y) < 1); if (!p) { p = { borne, x, y, n: B.pins.length + 1 }; B.pins.push(p); } return p; };
    blocs.forEach(B => { const c = B.c, R = c.rangs || {};
      (R.L || []).forEach(q => pinDe(B, String(q.etiq == null ? '' : q.etiq), c.x, q.y)); (R.R || []).forEach(q => pinDe(B, String(q.etiq == null ? '' : q.etiq), c.x + c.w, q.y));
      (R.S || []).forEach(q => { const e = String(q.etiq == null ? '' : q.etiq); if ((q.dir || 0) <= 0) pinDe(B, e, c.x, q.y); if ((q.dir || 0) >= 0) pinDe(B, e, c.x + c.w, q.y); }); });
    const blocDuBout = (nom, ep) => blocs.filter(B => String(B.c.name) === String(nom) && ep.x >= B.c.x - 1 && ep.x <= B.c.x + B.c.w + 1 && ep.y >= B.c.y - 1 && ep.y <= B.c.y + B.c.h + 1)
      .sort((a, b) => Math.min(Math.abs(ep.x - a.c.x), Math.abs(ep.x - a.c.x - a.c.w)) - Math.min(Math.abs(ep.x - b.c.x), Math.abs(ep.x - b.c.x - b.c.w)))[0] || null;
    const cables = [];
    (d.fils || []).forEach(w => { if (w.boucle || !w.epA || !w.epB) return; const A = blocDuBout(w.de, w.epA), Bb = blocDuBout(w.vers, w.epB); if (!A || !Bb) return;
      const pa = pinDe(A, String(w.borneDe || ''), w.epA.x, w.epA.y), pb = pinDe(Bb, String(w.borneVers || ''), w.epB.x, w.epB.y);
      let pts = (w.pts || []).map(q => [q.x, q.y]);
      if (pts.length >= 2 && Math.hypot(pts[0][0] - pb.x, pts[0][1] - pb.y) + 1e-6 < Math.hypot(pts[0][0] - pa.x, pts[0][1] - pa.y)) pts.reverse();
      // le départ d'une barrette à poser : le câble rejoint sa borne par le raccord de la barrette
      const raccorde = (q, p) => { const l = q; if (!l) return [[p.x, p.y]]; if (Math.hypot(l[0] - p.x, l[1] - p.y) < 0.5) return []; return Math.abs(l[1] - p.y) < 0.5 || Math.abs(l[0] - p.x) < 0.5 ? [[p.x, p.y]] : [[p.x, p.y], [l[0], p.y]]; };
      if (!pts.length) pts = [[pa.x, pa.y], [pb.x, pb.y]];
      else { pts = [...raccorde(pts[0], pa), ...pts]; pts = [...pts, ...raccorde(pts[pts.length - 1], pb).reverse()]; }
      pts = pts.filter((q, i) => !i || Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) > 1e-6);
      cables.push({ A, pa, B: Bb, pb, pts, cable: w.cable || '', type: w.type || '', route: w.route || '', couleur: w.couleur || null, shunt: !!w.shunt, etiquette: w.etiquette || null }); });
    // les blocs : un groupe chacun
    blocs.forEach(B => { const c = B.c, x0 = X(c.x), x1 = X(c.x + c.w), y0 = Y(c.y + c.h), y1 = Y(c.y), W = Math.max(x1 - x0, 0.01), H = Math.max(y1 - y0, 0.01), rel = [x0, y0];
      B.id = id++; const P = primitivesSvg(c.svg || ''), sous = [];
      // le repère : le texte du groupe, là où le folio l'écrit
      const nom = String(c.name), estNom = t => t.s === nom || (t.s.endsWith('…') && nom.startsWith(t.s.slice(0, -1)));
      const iRep = P.textes.findIndex(t => estNom(t) && /rep|rname/.test(t.classe)), trep = iRep >= 0 ? P.textes.splice(iRep, 1)[0] : null;
      const tpos = trep ? posTexte(trep, s, X, Y) : { cx: (x0 + x1) / 2, cy: y1 + 0.08, w: 0.12 * nom.length + 0.1, taille: 9 / 72, ancre: 1 };
      // le dessin : un trait par style (une forme, plusieurs géométries)
      const parStyle = new Map(); P.traits.forEach(t => { const k = [t.trait, t.epaisseur, t.tirets, t.fond].join('|'); (parStyle.get(k) || parStyle.set(k, []).get(k)).push(t); });
      parStyle.forEach(ts => { const t0 = ts[0], geo = ts.map((t, g) => sectionGeo(g, t.pts.map(q => [X(q[0]) - x0, Y(q[1]) - y0]), t.ferme, !t.fond, !t.trait)).join('');
        sous.push(`<Shape ID="${id++}" Type="Shape" LineStyle="0" FillStyle="0" TextStyle="0">${cel('PinX', W / 2)}${cel('PinY', H / 2)}${cel('Width', W)}${cel('Height', H)}${cel('LocPinX', W / 2)}${cel('LocPinY', H / 2)}${cel('Angle', 0)}${cel('FlipX', 0)}${cel('FlipY', 0)}`
          + `${cel('LineWeight', Math.max(0.1, (t0.epaisseur || 0) * s * 72) / 72, null, 'PT')}${cel('LineColor', t0.trait || '#000000')}${cel('LinePattern', t0.trait ? (t0.tirets ? 2 : 1) : 0)}${cel('FillForegnd', t0.fond || '#ffffff')}${cel('FillPattern', t0.fond ? 1 : 0)}${cel('SelectMode', 0)}${geo}</Shape>`); });
      // les textes : les étiquettes des bornes (liées à leur point de connexion quand elles disent la borne), la désignation…
      P.textes.forEach(t => { const pos = posTexte(t, s, X, Y), pin = B.pins.find(q => q.borne && q.borne === t.s && Math.abs(q.y - t.y + 0.35 * t.taille) < 4.5 && Math.abs(q.x - t.x) < 40);
        sous.push(formeTexte(id++, { ...pos, s: t.s, couleur: t.couleur, gras: t.gras, police: 'Consolas' }, rel, pin ? `<Section N="User">${ligneUser('voltaBorne', 'B' + pin.n)}</Section>` : '')); });
      const pins = B.pins.map(q => `<Row N="${q.borne ? 'B' + q.n : 'Point' + q.n}" T="Connection">${cel('X', X(q.x) - x0)}${cel('Y', Y(q.y) - y0)}${cel('DirX', 0)}${cel('DirY', 0)}${cel('Type', 0)}${cel('AutoGen', 0)}${celS('Prompt', q.borne)}</Row>`).join('');
      const props = ligneProp('Repere', 'Repère', nom) + (c.pn ? ligneProp('Reference', 'Référence', c.pn) : '') + (c.designation ? ligneProp('Designation', 'Désignation', c.designation) : '');
      formes.push(`<Shape ID="${B.id}" NameU="${xa('Bloc ' + nom + '.' + B.id)}" Name="${xa('Bloc ' + nom + '.' + B.id)}" Type="Group" LineStyle="0" FillStyle="0" TextStyle="0">${cel('PinX', x0 + W / 2)}${cel('PinY', y0 + H / 2)}${cel('Width', W)}${cel('Height', H)}${cel('LocPinX', W / 2)}${cel('LocPinY', H / 2)}${cel('Angle', 0)}${cel('FlipX', 0)}${cel('FlipY', 0)}${cel('ResizeMode', 0)}`
        + `${cel('TxtPinX', tpos.cx - x0)}${cel('TxtPinY', tpos.cy - y0)}${cel('TxtWidth', tpos.w)}${cel('TxtHeight', tpos.taille * 1.3)}${cel('TxtLocPinX', tpos.w / 2)}${cel('TxtLocPinY', tpos.taille * 0.65)}${cel('TxtAngle', 0)}${cel('LinePattern', 0)}${cel('FillPattern', 0)}${cel('VerticalAlign', 1)}${marges0()}${cel('ObjType', 1)}`
        + `<Section N="User">${ligneUser('voltaBloc', 1)}</Section><Section N="Property">${props}</Section>${sectionCar(tpos.taille, '#111b25', false, 'Consolas')}${sectionPara(tpos.ancre)}<Section N="Connection">${pins}</Section>`
        + `<Text>${xa(nom)}</Text><Shapes>${sous.join('')}</Shapes></Shape>`); });
    // les câbles : des connecteurs dynamiques, collés aux deux bornes
    cables.forEach(K => { const pts = K.pts.map(q => [X(q[0]), Y(q[1])]), b = pts[0], e = pts[pts.length - 1], W = e[0] - b[0], H = e[1] - b[1], cid = id++;
      const na = (K.pa.borne ? 'B' : 'Point') + K.pa.n, nbb = (K.pb.borne ? 'B' : 'Point') + K.pb.n;
      const glu = (g, n) => `PAR(PNT(Sheet.${g}!Connections.${n}.X,Sheet.${g}!Connections.${n}.Y))`, texte = [K.cable, K.type].filter(Boolean).join(' ');
      // le texte : là où le folio écrit le numéro (debout sur un vertical) ; un câble sans numéro écrit sur le folio (un pont
      // de barrette) garde son texte, caché ; sinon au milieu du plus long segment
      let best = 0, bk = 1; for (let k = 1; k < pts.length; k++) { const L = dist(pts[k - 1], pts[k]); if (L > best) { best = L; bk = k; } }
      const a = pts[bk - 1], z = pts[bk] || a, et = K.etiquette, vert = et ? et.debout : Math.abs(z[0] - a[0]) < Math.abs(z[1] - a[1]), tc = et ? [X(et.x), Y(et.y)] : [(a[0] + z[0]) / 2, (a[1] + z[1]) / 2], tt = 6.4 * s;
      // le tronçon sous le texte : trop court pour « numéro type » sur une ligne (une masse collée à sa borne), le type passe dessous
      let sous = best; if (et) { sous = 0; for (let k = 1; k < pts.length; k++) { const q = pts[k - 1], r = pts[k], L2 = dist(q, r), t = L2 ? Math.max(0, Math.min(1, ((tc[0] - q[0]) * (r[0] - q[0]) + (tc[1] - q[1]) * (r[1] - q[1])) / (L2 * L2))) : 0;
        if (dist(tc, [q[0] + t * (r[0] - q[0]), q[1] + t * (r[1] - q[1])]) < 0.6 * tt && L2 > sous) sous = L2; } }
      const deux = K.cable && K.type && sous < 0.62 * tt * texte.length + 4 * tt, lignes = deux ? 2 : 1, tw = Math.max(0.1, 0.62 * tt * (deux ? Math.max(K.cable.length, K.type.length) : texte.length) + 0.04);
      const cache = texte && !et && (K.shunt || best < tw);
      const props = ligneProp('Cable', 'Câble', K.cable) + ligneProp('Type', 'Type', K.type) + (K.route ? ligneProp('Route', 'Route', K.route) : '');
      formes.push(`<Shape ID="${cid}" NameU="${xa('Cable' + (K.cable ? ' ' + K.cable : '') + '.' + cid)}" Name="${xa('Câble' + (K.cable ? ' ' + K.cable : '') + '.' + cid)}" Type="Shape" LineStyle="0" FillStyle="0" TextStyle="0">`
        + `${cel('PinX', (b[0] + e[0]) / 2, 'GUARD((BeginX+EndX)/2)')}${cel('PinY', (b[1] + e[1]) / 2, 'GUARD((BeginY+EndY)/2)')}${cel('Width', W, 'GUARD(EndX-BeginX)')}${cel('Height', H, 'GUARD(EndY-BeginY)')}${cel('LocPinX', W / 2, 'GUARD(Width*0.5)')}${cel('LocPinY', H / 2, 'GUARD(Height*0.5)')}${cel('Angle', 0, 'GUARD(0DA)')}${cel('FlipX', 0, 'GUARD(FALSE)')}${cel('FlipY', 0, 'GUARD(FALSE)')}${cel('ResizeMode', 0)}`
        + `${cel('BeginX', b[0], glu(K.A.id, na))}${cel('BeginY', b[1], glu(K.A.id, na))}${cel('EndX', e[0], glu(K.B.id, nbb))}${cel('EndY', e[1], glu(K.B.id, nbb))}`
        + `${cel('BegTrigger', 2, `_XFTRIGGER(Sheet.${K.A.id}!EventXFMod)`)}${cel('EndTrigger', 2, `_XFTRIGGER(Sheet.${K.B.id}!EventXFMod)`)}${cel('TxtPinX', tc[0] - b[0])}${cel('TxtPinY', tc[1] - b[1])}${cel('TxtWidth', tw)}${cel('TxtHeight', tt * 1.25 * lignes + 0.25 * tt)}${cel('TxtLocPinX', tw / 2)}${cel('TxtLocPinY', (tt * 1.25 * lignes + 0.25 * tt) / 2)}${cel('TxtAngle', vert ? Math.PI / 2 : 0)}`
        + `${cel('LineWeight', Math.max(0.5, 0.95 * s * 72) / 72, null, 'PT')}${cel('LineColor', K.couleur || '#26323f')}${cel('LinePattern', 1)}${cel('BeginArrow', 0)}${cel('EndArrow', 0)}${cel('TextBkgnd', '#ffffff')}${cel('VerticalAlign', 1)}${marges0()}${cel('HideText', cache ? 1 : 0)}`
        + `${cel('ObjType', 2)}${cel('ShapeRouteStyle', 1)}${cel('ConFixedCode', 1)}${cel('ConLineRouteExt', 1)}${cel('ShapePlowCode', 0)}${cel('ShapeSplittable', 1)}`
        + `<Section N="User">${ligneUser('voltaCable', 1)}</Section><Section N="Property">${props}</Section>${sectionCar(tt, '#0b0f14', false, 'Consolas')}${sectionPara(1)}${sectionGeo(0, pts.map(q => [q[0] - b[0], q[1] - b[1]]), false, true, false)}`
        + (texte ? `<Text>${xa(deux ? K.cable + '\n' + K.type : texte)}</Text>` : '') + `</Shape>`);
      connects.push(`<Connect FromSheet="${cid}" FromCell="BeginX" FromPart="9" ToSheet="${K.A.id}" ToCell="Connections.${na}.X" ToPart="${100 + K.pa.n - 1}"/>`, `<Connect FromSheet="${cid}" FromCell="EndX" FromPart="12" ToSheet="${K.B.id}" ToCell="Connections.${nbb}.X" ToPart="${100 + K.pb.n - 1}"/>`); });
    // le cartouche : un tableau de texte, en bas à droite du cadre
    formes.push(cartoucheVisio(id, F, doc, A3[0] - m, m)); id += 40;
    return racineVisio('PageContents', `<Shapes>${formes.join('')}</Shapes>` + (connects.length ? `<Connects>${connects.join('')}</Connects>` : '')); }
  // la place d'un texte du dessin, en pouces : son centre, sa boîte, sa taille, son alignement
  function posTexte(t, s, X, Y) { const n = t.s.length, wDu = n * (0.6 * t.taille + (t.espace || 0)), w = wDu * s * 1.08 + 0.02, taille = t.taille * s;
    const x = X(t.x), yb = Y(t.y), cx = t.ancre === 1 ? x : t.ancre === 2 ? x - w / 2 : x + w / 2, cy = yb + 0.33 * taille;
    return { cx, cy, w, taille, ancre: t.ancre }; }
  function cartoucheVisio(id0, F, doc, xd, yb) { let id = id0; const g = id++, mmIn = v => v / 25.4;
    const W = mmIn(200), H = mmIn(26), x0 = xd - W, rh = H / 2;
    // deux rangées : TITRE | N° DE PLAN | FOLIO ; DESSINÉ | DATE | ÉCHELLE | INDICE | HARNESS
    const haut = [['TITRE', doc.titre || '—', 0, 0.5], ['N° DE PLAN', F.fwd || F.plan || '—', 0.5, 0.78], ['FOLIO', F.folio || '1 / 1', 0.78, 1]];
    const bas = [['DESSINÉ', doc.auteur || '—', 0, 0.22], ['DATE', doc.date || '—', 0.22, 0.42], ['ÉCHELLE', doc.echelle || '—', 0.42, 0.56], ['INDICE', doc.indice || '—', 0.56, 0.7], ['HARNESS', doc.harness || '—', 0.7, 1]];
    const lignes = [[[0, 0], [W, 0], [W, H], [0, H], [0, 0]], [[0, rh], [W, rh]], ...haut.slice(1).map(c => [[c[2] * W, rh], [c[2] * W, H]]), ...bas.slice(1).map(c => [[c[2] * W, 0], [c[2] * W, rh]])];
    let sous = `<Shape ID="${id++}" Type="Shape" LineStyle="0" FillStyle="0" TextStyle="0">${cel('PinX', W / 2)}${cel('PinY', H / 2)}${cel('Width', W)}${cel('Height', H)}${cel('LocPinX', W / 2)}${cel('LocPinY', H / 2)}${cel('Angle', 0)}${cel('LineWeight', 0.9 / 72, null, 'PT')}${cel('LineColor', '#1b2430')}${cel('FillForegnd', '#ffffff')}${cel('FillPattern', 1)}`
      + lignes.map((pts, k) => sectionGeo(k, pts, k === 0, k !== 0, false)).join('') + '</Shape>';
    const champ = (lab, val, a, b, yb2, grand) => { const x = a * W + mmIn(2.2), lt = 5.5 / 72, vt = (grand ? 11 : 8.5) / 72;
      sous += formeTexte(id++, { s: lab, cx: x + mmIn(0.2) + 0.6 * lt * lab.length / 2, cy: yb2 + rh - mmIn(3), w: 0.62 * lt * lab.length + 0.05, taille: lt, ancre: 0, couleur: '#5b6670', gras: true, police: 'Arial' }, [0, 0]);
      sous += formeTexte(id++, { s: String(val), cx: x + mmIn(0.2) + Math.min((b - a) * W - mmIn(5), 0.62 * vt * String(val).length + 0.05) / 2, cy: yb2 + mmIn(4), w: Math.min((b - a) * W - mmIn(4), 0.62 * vt * String(val).length + 0.05), taille: vt, ancre: 0, couleur: '#0b1118', gras: true, police: 'Arial' }, [0, 0]); };
    haut.forEach(c => champ(c[0], c[1], c[2], c[3], rh, c[0] === 'FOLIO')); bas.forEach(c => champ(c[0], c[1], c[2], c[3], 0, false));
    return `<Shape ID="${g}" NameU="Cartouche" Name="Cartouche" Type="Group" LineStyle="0" FillStyle="0" TextStyle="0">${cel('PinX', x0 + W / 2)}${cel('PinY', yb + H / 2)}${cel('Width', W)}${cel('Height', H)}${cel('LocPinX', W / 2)}${cel('LocPinY', H / 2)}${cel('Angle', 0)}${cel('LinePattern', 0)}${cel('FillPattern', 0)}`
      + `<Section N="User">${ligneUser('voltaCartouche', 1)}</Section><Shapes>${sous}</Shapes></Shape>`; }

  return { lireVsdx, lireXml, ouvrir, svgDePage, ecrireFolios, primitivesSvg, cheminSvg, boiteTexte, normaliser };
})();
/* Les points d'entrée : un paquet dézippé → la lecture ; les folios → un paquet à zipper. */
function lireSchemaVisio(fichiers) { return SCHEMA_VISIO.lireVsdx(fichiers); }
function ecrireSchemaVisio(doc) { return SCHEMA_VISIO.ecrireFolios(doc); }
