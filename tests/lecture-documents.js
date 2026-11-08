/* ===========================================================================
   CE QUE VOLTA LIT DÉJÀ DES DOCUMENTS D'ENTRÉE — la mesure, sans navigateur (Node seul, une dizaine de secondes)
       node tests/lecture-documents.js [A,B,C,D,E] [--json=chemin] [--exemples=3] [--dossier=v0]
   ---------------------------------------------------------------------------
   Les documents inventés (tests/documents/, fabriqués par
   tests/documents/fabriquer/tout.js) passent dans les lecteurs ACTUELS de
   VOLTA, tels quels, hors navigateur : pdf.js (vendor/, le même que la page)
   donne les textes et les traits de chaque page à src/09-pdf.js
   (`SCHEMA_PDF.lirePage`, puis `assembler`) ; un .vsdx dézippé (fflate) va à
   src/09-visio.js (`lireVsdx`). La VÉRITÉ de chaque document est son CSV au
   format du retest, relu par le lecteur de retest de VOLTA lui-même (02,
   `lireTexte` : « 667VT2 51 » + « B » devient 667VT2:51B, comme pour un vrai
   fichier) ; sa colonne « Dessin » dit comment chaque liaison est dessinée.
   On compte, borne à borne (sans le sens) :
     · les liaisons JUSTES, les FAUSSES (en trop), les MANQUÉES ;
     · les BORNES MAL LUES (les deux bons équipements, une borne fausse : « AB »
       au lieu de « 51B ») et les MAUVAIS BOUTS (un bout juste, l'autre non : un
       renvoi apparié au mauvais vis-à-vis) ;
     · la CONFIANCE annoncée contre la justesse réelle : quand VOLTA dit « sûr »
       (90 % et plus, la pastille verte de la relecture), a-t-il raison ?
     · le cartouche (n° de plan, folio, indice), les pages dites scannées ;
     · le temps passé ;
     · les NUMÉROS DE FIL écrits (une partie des folios) : combien VOLTA en lit
       sur les liaisons justes ;
     · pour un scan, sa BORNE HAUTE (B*, E* : une simulation, dite comme telle) —
       ce que le moteur lirait si un OCR rendait parfaitement les mots et les
       traits de la page scannée, tournée et décalée comme elle l'est (chaque
       page dit sa pose dans documents.json).
   Les documents ont la forme des vrais schémas du lecteur (boîtes pleines,
   symboles dans les boîtes, barrettes en pastilles sur un pointillé, masses à
   trois barres, renvois « F5/C3 », numéros de fil parfois, cartouches en
   français, scans de toute qualité) ; ceux d'avant, d'une autre forme, restent
   dans tests/documents/v0/ (`--dossier=v0`), pour comparer.
   Puis un tableau, et un rapport en mots, par document et par sorte d'erreur.
   Cette mesure ne juge pas : elle dit où VOLTA en est (aucun seuil, toujours
   « vert ») ; elle sert à voir le progrès d'une passe à l'autre.
   ========================================================================= */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const args = process.argv.slice(2), DOSSIER = (args.find(a => a.startsWith('--dossier=')) || '').slice(10);
const DEPOT = path.join(__dirname, '..'), DOCS = path.join(__dirname, 'documents', DOSSIER);
const choix = ((args.find(a => /^[A-Ea-e](,[A-Ea-e])*$/.test(a)) || 'A,B,C,D,E').toUpperCase()).split(',');
const SORTIE_JSON = (args.find(a => a.startsWith('--json=')) || '').slice(7), NB_EX = +((args.find(a => a.startsWith('--exemples=')) || '').slice(11) || 3);
const pct = (a, b) => b ? Math.round(100 * a / b) + ' %' : '—';
const sec = ms => (ms / 1000).toFixed(1).replace('.', ',') + ' s';

/* ---- VOLTA hors navigateur : ses modules de lecture dans un bac à sable ------------------------------------------- */
function moteur() {
  const code = ['01-modele.js', '02-lecture.js', '09-pdf.js', '09-visio.js'].map(f => fs.readFileSync(path.join(DEPOT, 'src', f), 'utf8')).join('\n');
  const bac = { console, TextDecoder, Intl }; vm.createContext(bac);
  vm.runInContext(code + '\nthis.X = { SCHEMA_PDF, SCHEMA_VISIO, liaison, lireTexte, lireRepere };', bac); return bac.X; }
const X = moteur();
const pdfjs = require(path.join(DEPOT, 'vendor', 'pdf.min.js')); pdfjs.GlobalWorkerOptions.workerSrc = path.join(DEPOT, 'vendor', 'pdf.worker.min.js');
const { unzipSync } = require(path.join(DEPOT, 'vendor', 'fflate.min.js'));
// (pdf.js parle des polices standard qu'il ne trouve pas : sans effet sur les textes et les traits lus ; on le fait taire)
const logBrut = console.log; console.log = (...a) => { if (typeof a[0] === 'string' && /^Warning:/.test(a[0])) return; logBrut(...a); };

/* ---- lire un document comme VOLTA le lit ---------------------------------------------------------------------------- */
async function lirePdf(fichier) {
  const t0 = Date.now(), doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(fichier)), isEvalSupported: false, verbosity: 0, disableFontFace: true }).promise;
  const lues = [], tPages = [];
  for (let i = 1; i <= doc.numPages; i++) { const t1 = Date.now(), pg = await doc.getPage(i), vp = pg.getViewport({ scale: 1 }), [tc, ol] = await Promise.all([pg.getTextContent(), pg.getOperatorList()]);
    lues.push(X.SCHEMA_PDF.lirePage({ largeur: vp.width, hauteur: vp.height, vt: vp.transform, items: tc.items, fn: ol.fnArray, args: ol.argsArray, OPS: pdfjs.OPS })); pg.cleanup(); tPages.push(Date.now() - t1); }
  const L = X.SCHEMA_PDF.assembler(lues), n = doc.numPages; await doc.destroy();
  return { n, ms: Date.now() - t0, tPages, liaisons: L.liaisons.map(l => ({ de: l.de, borneDe: l.borneDe, vers: l.vers, borneVers: l.borneVers, type: l.type || '', cable: l.cable || '', conf: l.conf, raisons: l.raisons || [], page: l.page + 1, pageVers: l.pageVers != null ? l.pageVers + 1 : null })),
    pages: L.pages.map(p => ({ scanne: !!p.scanne, champs: p.champs || {}, orphelins: (p.orphelins || []).length, folio: p.folio })) }; }
/* LA BORNE HAUTE D'UN SCAN (une simulation, dite comme telle) : si un OCR et une vectorisation rendaient PARFAITEMENT les mots
   et les traits d'une page scannée, que lirait le moteur de VOLTA ? On prend ceux du PDF vectoriel d'origine, on les tourne et
   on les décale comme le scanner l'a fait pour chaque page (tests/documents/fabriquer/imprimer.js, `scanner`), et on les donne
   à `lirePage` par l'entrée prévue pour un futur module d'OCR (`{ mots, formes, scan: true }`). */
async function simulerOcr(fichierVectoriel, pagesSource, ppp, poses) {
  const t0 = Date.now(), doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(fichierVectoriel)), isEvalSupported: false, verbosity: 0, disableFontFace: true }).promise, lues = [];
  for (let i = 0; i < pagesSource.length; i++) { const pg = await doc.getPage(pagesSource[i]), vp = pg.getViewport({ scale: 1 }), [tc, ol] = await Promise.all([pg.getTextContent(), pg.getOperatorList()]);
    // la pose de la page scannée : celle que le scanner a notée (documents.json), sinon celle des documents d'avant
    const k = (i * 7919 + 13) % 1000 / 1000, P = poses && poses[i], a = (P ? P.angle : (k - 0.45) * 1.6) * Math.PI / 180, dx = P ? P.dx : (k - 0.5) * 18 * 72 / ppp, dy = P ? P.dy : ((k * 3.7) % 1 - 0.5) * 14 * 72 / ppp, cx = vp.width / 2, cy = vp.height / 2, c = Math.cos(a), s = Math.sin(a);
    const R = p => [cx + dx + c * (p[0] - cx) - s * (p[1] - cy), cy + dy + s * (p[0] - cx) + c * (p[1] - cy)], Rv = v => [c * v[0] - s * v[1], s * v[0] + c * v[1]];
    const boite = B => { const q = [[B.x0, B.y0], [B.x1, B.y0], [B.x1, B.y1], [B.x0, B.y1]].map(R); return { x0: Math.min(...q.map(p => p[0])), y0: Math.min(...q.map(p => p[1])), x1: Math.max(...q.map(p => p[0])), y1: Math.max(...q.map(p => p[1])) }; };
    const mots = X.SCHEMA_PDF.motsDesTextes(tc.items, vp.transform).map(m => ({ ...m, o: R(m.o), c: R(m.c), u: Rv(m.u), n: Rv(m.n), B: boite(m.B), angle: m.angle + Math.round(a * 180 / Math.PI) }));
    const { formes } = X.SCHEMA_PDF.formesDesOperateurs(ol.fnArray, ol.argsArray, pdfjs.OPS, vp.transform);
    formes.forEach(F => F.sp.forEach(sp => { sp.pts = sp.pts.map(R); }));
    lues.push(X.SCHEMA_PDF.lirePage({ largeur: vp.width, hauteur: vp.height, mots, formes, scan: true })); pg.cleanup(); }
  const L = X.SCHEMA_PDF.assembler(lues); await doc.destroy();
  return { n: pagesSource.length, ms: Date.now() - t0, tPages: [], liaisons: L.liaisons.map(l => ({ de: l.de, borneDe: l.borneDe, vers: l.vers, borneVers: l.borneVers, type: l.type || '', cable: l.cable || '', conf: l.conf, raisons: l.raisons || [], page: l.page + 1, pageVers: l.pageVers != null ? l.pageVers + 1 : null })),
    pages: L.pages.map(p => ({ scanne: false, champs: p.champs || {}, orphelins: (p.orphelins || []).length, folio: p.folio })) }; }
function lireVsdx(fichier) {
  const t0 = Date.now(), z = unzipSync(new Uint8Array(fs.readFileSync(fichier)), { filter: f => /\.(xml|rels)$/i.test(f.name) }), L = X.SCHEMA_VISIO.lireVsdx(z);
  return { n: L.pages.length, ms: Date.now() - t0, tPages: [], liaisons: L.liaisons.map(l => ({ de: l.de, borneDe: l.borneDe, vers: l.vers, borneVers: l.borneVers, type: l.type || '', cable: l.cable || '', conf: l.conf, raisons: l.raisons || [], page: l.page + 1, pageVers: l.pageVers != null ? l.pageVers + 1 : null, colle: !!l.colle })),
    pages: L.pages.map(p => ({ scanne: false, champs: p.champs || {}, orphelins: (p.orphelins || []).length, folio: p.folio })) }; }

/* ---- la vérité : le CSV au format du retest, relu par VOLTA ----------------------------------------------------- */
function lireVerite(D) {
  const r = X.lireTexte(fs.readFileSync(path.join(DOCS, D.verite), 'utf8'));
  if (r.format !== 'retest') throw new Error(D.verite + ' ne se lit pas comme un retest (' + r.format + ')');
  // la page d'une liaison : son FWD (le plan et le folio, ou « p.292 » pour un tableau du gros document)
  const pageDe = fwd => { const m = /^(\S+) F(\d+)$/.exec(fwd || ''), q = /p\.(\d+)$/.exec(fwd || '');
    if (m) { const i = D.pages.findIndex(p => p.numero === m[1] && String(p.folio) === m[2]); return i >= 0 ? i + 1 : null; }
    if (q) { const src = +q[1]; if (D.pagesSource) { const i = D.pagesSource.indexOf(src); return i >= 0 ? i + 1 : null; } return src; } return null; };
  return { harnais: r.harnais, liaisons: r.liaisons.map(l => ({ de: l.de, borneDe: l.borneDe, vers: l.vers, borneVers: l.borneVers, type: l.type || '', cable: l.cable || '', fwd: l.fwd || '', dessin: String((l.autres || {}).Dessin || '').split(/\s*;\s*/).filter(Boolean), page: pageDe(l.fwd) })) }; }

/* ---- comparer ------------------------------------------------------------------------------------------------------ */
const bout = (r, b) => String(r || '').toUpperCase() + ':' + String(b || '').toUpperCase();
const cle = l => { const a = bout(l.de, l.borneDe), b = bout(l.vers, l.borneVers); return a < b ? a + ' | ' + b : b + ' | ' + a; };
const dire = l => `${l.de}${l.borneDe ? ':' + l.borneDe : ''} → ${l.vers}${l.borneVers ? ':' + l.borneVers : ''}`;
const codeDe = r => ((X.lireRepere(r) || {}).code || '');
// ce qu'une borne mal lue a de typique
function sorteDeBorne(vrai, lu) { vrai = String(vrai || '').toUpperCase(); lu = String(lu || '').toUpperCase();
  const m = /^(\d+)([A-Z])$/.exec(vrai);
  if (m && lu === m[2]) return 'barrette : le module oublié (« ' + lu + ' » pour « ' + vrai + ' »)';
  if (m && /^[A-Z]{2}$/.test(lu) && lu[1] === m[2]) return 'barrette : la lettre de la case du dessus collée devant (« ' + lu + ' » pour « ' + vrai + ' »)';
  if (m && /^[A-Z]$/.test(lu)) return 'barrette : une autre lettre, sans le module';
  const c = /^([A-Z])(\d+)$/.exec(vrai); if (c && lu === c[2]) return 'connecteur : la lettre du connecteur oubliée (« ' + lu + ' » pour « ' + vrai + ' »)';
  if (!lu) return 'borne vide';
  return 'une autre borne (« ' + lu + ' » pour « ' + vrai + ' »)'; }

function comparer(V, L, D) {
  const restantsV = new Map(); V.forEach((v, i) => { const k = cle(v); (restantsV.get(k) || restantsV.set(k, []).get(k)).push(i); });
  const etatV = V.map(() => null), etatL = L.map(() => null);
  // 1. les justes
  L.forEach((l, j) => { const q = restantsV.get(cle(l)); if (q && q.length) { const i = q.shift(); etatV[i] = { sorte: 'juste', j }; etatL[j] = { sorte: 'juste', i }; } });
  // 2. les presque : les deux bons équipements (une borne fausse), ou un bout juste (l'autre ailleurs)
  const parRep = new Map(); V.forEach((v, i) => { if (etatV[i]) return; [v.de, v.vers].forEach(r => { const k = String(r).toUpperCase(); (parRep.get(k) || parRep.set(k, new Set()).get(k)).add(i); }); });
  const paires = [];
  // la ressemblance de deux bornes : « B » pour « 51B » (le module oublié), « AB » pour « 51B », « 12 » pour « A12 »
  const ressemble = (vrai, lu) => { vrai = String(vrai || '').toUpperCase(); lu = String(lu || '').toUpperCase(); if (vrai === lu) return 1; if (lu && vrai.endsWith(lu)) return 0.8;
    if (lu.length === 2 && vrai && lu[1] === vrai[vrai.length - 1]) return 0.6; return 0; };
  const renvoiLu = l => /^renvoi/.test((l.raisons || [])[0] || '');
  L.forEach((l, j) => { if (etatL[j]) return; const cand = new Set([...(parRep.get(String(l.de).toUpperCase()) || []), ...(parRep.get(String(l.vers).toUpperCase()) || [])]);
    cand.forEach(i => { const v = V[i], A = [bout(v.de, v.borneDe), bout(v.vers, v.borneVers)], B = [bout(l.de, l.borneDe), bout(l.vers, l.borneVers)], rv = [v.de, v.vers].map(s => String(s).toUpperCase()), rl = [l.de, l.vers].map(s => String(s).toUpperCase());
      const sens = rv[0] === rl[0] && rv[1] === rl[1], inverse = rv[0] === rl[1] && rv[1] === rl[0], unBout = A.some(a => B.includes(a)), page = l.page === v.page ? 0.3 : 0;
      // un renvoi lu de part et d'autre, mal apparié : c'est un mauvais vis-à-vis, même si les deux équipements sont les bons
      if (v.dessin.includes('renvoi') && renvoiLu(l) && (unBout || sens || inverse)) { paires.push({ i, j, s: 2.6 + page + (unBout ? 0.3 : 0), sorte: 'bout' }); return; }
      if (sens || inverse) { const r = Math.max(sens ? ressemble(v.borneDe, l.borneDe) + ressemble(v.borneVers, l.borneVers) : 0, inverse ? ressemble(v.borneDe, l.borneVers) + ressemble(v.borneVers, l.borneDe) : 0);
        paires.push({ i, j, s: 3 + r + page, sorte: 'borne' }); }
      else if (unBout) paires.push({ i, j, s: 2 + page, sorte: 'bout' }); }); });
  paires.sort((a, b) => b.s - a.s || a.i - b.i || a.j - b.j);
  paires.forEach(p => { if (etatV[p.i] || etatL[p.j]) return; etatV[p.i] = { sorte: p.sorte, j: p.j }; etatL[p.j] = { sorte: p.sorte, i: p.i }; });
  // 3. le reste : en trop (une cause devinée), manquées (la cause écrite dans « Dessin »)
  const repsVrais = new Set(V.flatMap(v => [String(v.de).toUpperCase(), String(v.vers).toUpperCase()]));
  const pageSorte = p => (D.pages[(p || 1) - 1] || {}).sorte || '';
  L.forEach((l, j) => { if (etatL[j]) return; const a = String(l.de).toUpperCase(), b = String(l.vers).toUpperCase(), c = codeDe(l.de);
    const cause = pageSorte(l.page) && pageSorte(l.page) !== 'schéma' ? 'lue sur une page qui n’est pas un schéma (' + pageSorte(l.page) + ')'
      : a === b ? (/^(RL|CT)$/.test(c) ? 'le symbole d’un relais (sa bobine, son contact) lu comme un fil' : c === 'CB' ? 'l’arc du disjoncteur lu comme un fil, d’une borne à l’autre' : c === 'VT' ? 'barrette : un pontage qui n’existe pas' : 'deux bornes d’un même équipement reliées')
      : !repsVrais.has(a) || !repsVrais.has(b) ? 'un repère pris dans un texte qui n’est pas l’équipement (' + (!repsVrais.has(a) ? l.de : l.vers) + ')'
      : 'deux vrais équipements reliés à tort';
    etatL[j] = { sorte: 'trop', cause }; });
  /* une manquée : le bout que VOLTA n'a vu dans aucune liaison dit la cause (une masse en râteau, une barrette, un relais
     en tirets…) ; les deux bouts vus ailleurs : un appariement raté (un renvoi, le plus souvent) */
  const vus = new Set(L.flatMap(l => [bout(l.de, l.borneDe), bout(l.vers, l.borneVers)]));
  const NATURE_CODE = { CB: 'disjoncteur', RL: 'relais', CT: 'relais', VT: 'barrette', VC: 'prise de coupure', G: 'masse', LP: 'voyant', SW: 'interrupteur', PB: 'interrupteur', DI: 'diode', TB: 'bornier', CP: 'calculateur à connecteurs lettrés' };
  const style = v => ((v.dessin.find(t => /^style /.test(t)) || '').slice(6));
  // (les documents d'avant avaient leurs pièges de forme : la masse en râteau, les boîtes en tirets, les cases « 51A »)
  const v1 = D.forme === 'v1', precision = (n, v) => v1 ? n : n === 'masse' && style(v) === 'B' ? 'masse dessinée en râteau' : n === 'relais' && style(v) === 'C' ? 'relais dessiné en tirets' : n === 'boîte' && style(v) === 'C' ? 'boîte dessinée en tirets' : n === 'barrette' && style(v) === 'B' ? 'barrette aux cases « 51A »' : n;
  const premierPlan = (D.pages.find(p => p.sorte === 'schéma') || {}).numero, planDe = v => (D.pages[(v.page || 1) - 1] || {}).numero;
  V.forEach((v, i) => { if (etatV[i]) return; let t;
    if (D.scan) t = 'page scannée'; else if (v.dessin.includes('tableau')) t = 'liaison donnée en tableau'; else if (v.dessin.includes('texte')) t = 'liaison écrite dans une phrase';
    else { const nonVus = [[v.de, v.borneDe], [v.vers, v.borneVers]].filter(([r, b]) => !vus.has(bout(r, b))).map(([r]) => NATURE_CODE[codeDe(r)] || 'boîte');
      // un renvoi qui ne s'apparie pas ne donne aucune liaison : ses deux bouts restent « jamais lus » — c'est le renvoi qui manque
      const autrePlan = v.dessin.filter(x => /^style/.test(x)).length > 1;
      t = v.dessin.includes('renvoi') && (v1 || !(style(v) === 'B' && nonVus.includes('masse'))) ? 'renvoi ' + (v1 ? (autrePlan ? 'vers un autre plan (« SC-… F12/B4 »)' : planDe(v) !== premierPlan ? '« F12/B4 » d’un plan qui n’est pas le premier (le folio y recommence à 1)' : '« F5/C3 » non apparié')
          : style(v) === 'C' ? '« 245-C3 » (la page du dossier) : non compris' : style(v) === 'B' ? '« F°12 — B4 » : pris pour le folio 12 du premier chapitre' : autrePlan ? 'vers un autre chapitre (son numéro de plan)' : 'non apparié')
        : nonVus.length ? 'bout jamais lu : ' + precision(nonVus.sort((a, b) => (a === 'masse' ? -1 : 0) - (b === 'masse' ? -1 : 0))[0], v) : 'deux bouts lus ailleurs, jamais ensemble'; }
    etatV[i] = { sorte: 'manquee', cause: t }; });
  return { etatV, etatL }; }

/* ---- mesurer un document ------------------------------------------------------------------------------------------- */
async function mesurer(lettre, D, simulation) {
  const fichier = path.join(DOCS, D.fichier); if (!fs.existsSync(fichier)) throw new Error(fichier + ' manque : lancez tests/documents/fabriquer/tout.js');
  const V = lireVerite(D), R = simulation ? await simulerOcr(path.join(DOCS, simulation.source), simulation.pages, simulation.ppp, simulation.poses) : D.sorte === 'vsdx' ? lireVsdx(fichier) : await lirePdf(fichier);
  if (simulation) D = { ...D, scan: false };
  const L = R.liaisons.map(l => { const n = X.liaison({ de: l.de, borneDe: l.borneDe, vers: l.vers, borneVers: l.borneVers }); return { ...l, de: n.de, borneDe: n.borneDe, vers: n.vers, borneVers: n.borneVers }; });
  const { etatV, etatL } = comparer(V.liaisons, L, D);
  const compte = (E, s) => E.filter(e => e.sorte === s).length;
  const justes = compte(etatV, 'juste'), bornes = compte(etatV, 'borne'), bouts = compte(etatV, 'bout'), manquees = compte(etatV, 'manquee'), trop = compte(etatL, 'trop');
  // la confiance contre la justesse
  const tranches = [['sûr', c => c >= 0.9], ['à revoir', c => c >= 0.6 && c < 0.9], ['douteux', c => c < 0.6]].map(([nom, f]) => { const ls = L.map((l, j) => [l, etatL[j]]).filter(([l]) => f(l.conf)); return { nom, n: ls.length, justes: ls.filter(([, e]) => e.sorte === 'juste').length }; });
  /* chaque BOUT, selon sa nature (la borne d'un disjoncteur, d'un relais, d'une barrette…) : lu juste ou non — une liaison
     presque juste a un bout juste et un bout faux ; une manquée, deux bouts manqués */
  const NATURE = { CB: 'disjoncteur', RL: 'relais', CT: 'relais', VT: 'barrette', VC: 'prise de coupure', G: 'masse', LP: 'voyant', SW: 'interrupteur', PB: 'interrupteur', DI: 'diode', TB: 'bornier' };
  const natureDe = (r, b) => NATURE[codeDe(r)] || (/^[A-Z]\d+$/.test(String(b)) && codeDe(r) === 'CP' ? 'connecteur lettré' : 'boîte (broche numérotée)');
  const parEtiquette = new Map(), noter = (t, ok) => { const o = parEtiquette.get(t) || { n: 0, justes: 0 }; o.n++; if (ok) o.justes++; parEtiquette.set(t, o); };
  V.liaisons.forEach((v, i) => { const e = etatV[i], l = e.j != null ? L[e.j] : null;
    [[v.de, v.borneDe], [v.vers, v.borneVers]].forEach(([r, b]) => { const ok = e.sorte === 'juste' || (l && [bout(l.de, l.borneDe), bout(l.vers, l.borneVers)].includes(bout(r, b)));
      const n = natureDe(r, b); noter((/^[aeiouyéèh]/i.test(n) ? 'borne d’' : 'borne de ') + n, ok); });
    ['renvoi', 'jonction', 'blindé', 'pontage', 'tableau', 'texte'].forEach(t => { if (v.dessin.includes(t)) noter('liaison ' + (t === 'blindé' ? 'en câble blindé' : t === 'renvoi' ? 'à renvoi' : t === 'jonction' ? 'avec un T' : t === 'pontage' ? 'pontage de barrette' : t === 'tableau' ? 'en tableau' : 'écrite en texte'), e.sorte === 'juste'); }); });
  // par page : sa nature, son style
  const parPage = new Map(); const sortePage = p => { const q = D.pages[(p || 1) - 1] || {}; return q.sorte === 'schéma' ? 'schéma ' + q.style : q.sorte || '?'; };
  V.liaisons.forEach((v, i) => { const k = sortePage(v.page), o = parPage.get(k) || { pages: 0, n: 0, justes: 0, trop: 0, trouvees: 0 }; o.n++; if (etatV[i].sorte === 'juste') o.justes++; parPage.set(k, o); });
  L.forEach((l, j) => { const k = sortePage(l.page), o = parPage.get(k) || { pages: 0, n: 0, justes: 0, trop: 0, trouvees: 0 }; o.trouvees++; if (etatL[j].sorte === 'trop') o.trop++; parPage.set(k, o); });
  D.pages.forEach(p => { const k = p.sorte === 'schéma' ? 'schéma ' + p.style : p.sorte, o = parPage.get(k) || { pages: 0, n: 0, justes: 0, trop: 0, trouvees: 0 }; o.pages++; parPage.set(k, o); });
  // le cartouche de chaque folio
  const cart = { folios: 0, numero: 0, folio: 0, indice: 0 };
  R.pages.forEach((p, i) => { const q = D.pages[i]; if (!q || q.sorte !== 'schéma') return; cart.folios++; const c = p.champs || {};
    if (c.numero === q.numero) cart.numero++; if (String(c.folioNum) === String(q.folio)) cart.folio++; if (c.indice === q.indice) cart.indice++; });
  const scannees = R.pages.filter(p => p.scanne).length, orphelins = R.pages.reduce((k, p) => k + p.orphelins, 0);
  // les numéros de fil écrits (une partie des folios) : lus sur les liaisons justes ?
  const numeros = { ecrits: 0, justes: 0, lus: 0, faux: 0 }; V.liaisons.forEach((v, i) => { if (!v.cable) return; numeros.ecrits++; const e = etatV[i]; if (e.sorte !== 'juste') return; numeros.justes++;
    const c = String(L[e.j].cable || '').toUpperCase(); if (c === String(v.cable).toUpperCase()) numeros.lus++; else if (c) numeros.faux++; });
  const qualites = (D.poses || []).reduce((o, p) => { o[p.qualite] = (o[p.qualite] || 0) + 1; return o; }, {});
  // les causes, et des exemples
  const causes = new Map(), ajouter = (k, ex) => { const o = causes.get(k) || { n: 0, ex: [] }; o.n++; if (o.ex.length < NB_EX) o.ex.push(ex); causes.set(k, o); };
  V.liaisons.forEach((v, i) => { const e = etatV[i];
    if (e.sorte === 'manquee') ajouter('manquée — ' + e.cause, dire(v) + (v.page ? ' (p. ' + v.page + ')' : ''));
    else if (e.sorte === 'borne') { const l = L[e.j], memeSens = String(l.de).toUpperCase() === String(v.de).toUpperCase(); const [b1, b2] = memeSens ? [l.borneDe, l.borneVers] : [l.borneVers, l.borneDe];
      const fautes = [...new Set([[v.borneDe, b1], [v.borneVers, b2]].filter(([a, b]) => String(a).toUpperCase() !== String(b).toUpperCase()).map(([a, b]) => sorteDeBorne(a, b).replace(/ \(« .*$/, '')))];
      ajouter('borne mal lue — ' + fautes.join(' ; '), dire(v) + ' lue ' + dire(l)); }
    else if (e.sorte === 'bout') { const l = L[e.j], juste = [bout(v.de, v.borneDe), bout(v.vers, v.borneVers)], cote = juste.includes(bout(l.de, l.borneDe)) ? 'vers' : 'de';
      // ce que VOLTA dit du bout faux (« repère le plus proche » : la boîte n'a pas été vue)
      const dit = (l.raisons || []).filter(x => x.startsWith(cote + ' : ')).join(' ');
      const pourquoi = /^renvoi/.test((l.raisons || [])[0] || '') ? 'un renvoi apparié au mauvais vis-à-vis' : /repère le plus proche/.test(dit) ? 'le bout prend le repère le plus proche (la boîte n’est pas vue comme un cadre)' : /deviné/.test(dit) ? 'le bout prend un repère deviné' : 'un bout relié au mauvais équipement';
      ajouter('mauvais bout — ' + pourquoi, dire(v) + ' lue ' + dire(l)); } });
  L.forEach((l, j) => { const e = etatL[j]; if (e.sorte === 'trop') ajouter('en trop — ' + e.cause, dire(l) + ' (p. ' + l.page + ', confiance ' + Math.round(100 * l.conf) + ' %)'); });
  // quand VOLTA se dit sûr et se trompe : de quoi il s'agit
  const surFaux = new Map(); L.forEach((l, j) => { const e = etatL[j]; if (l.conf < 0.9 || e.sorte === 'juste') return; let k;
    if (e.sorte === 'trop') k = e.cause; else if (e.sorte === 'bout') k = /^renvoi/.test((l.raisons || [])[0] || '') ? 'un renvoi mal apparié' : 'un bout au mauvais équipement';
    else { const v = V.liaisons[e.i], memeSens = String(l.de).toUpperCase() === String(v.de).toUpperCase(), [b1, b2] = memeSens ? [l.borneDe, l.borneVers] : [l.borneVers, l.borneDe];
      const f = [[v.borneDe, b1], [v.borneVers, b2]].find(([a, b]) => String(a).toUpperCase() !== String(b).toUpperCase()); k = 'borne mal lue — ' + (f ? sorteDeBorne(f[0], f[1]).replace(/ \(« .*$/, '') : ''); }
    surFaux.set(k, (surFaux.get(k) || 0) + 1); });
  // l'IA interne : les questions qu'il faudrait lui poser
  const douteuses = L.filter(l => l.conf < 0.9), pagesDoute = new Set([...douteuses.map(l => l.page), ...R.pages.map((p, i) => p.orphelins ? i + 1 : null).filter(Boolean)]);
  const pagesTableau = D.pages.filter(p => p.sorte === 'tableau').length, pagesTexte = D.pages.filter(p => /NOTES/.test(p.sorte || '')).length;
  const tuiles = D.scan ? D.pages.reduce((k, p) => k + (p.taille === 'A3' || p.sorte === 'schéma' ? 12 : 4), 0) : 0;
  const ia = { douteuses: douteuses.length, orphelins, pagesDoute: pagesDoute.size, appels: pagesDoute.size + pagesTableau + pagesTexte + 3 + tuiles, tuiles, pagesTableau, pagesTexte };
  return { lettre, nom: D.nom, fichier: D.fichier, sorte: D.sorte, scan: !!D.scan, pages: R.n, verite: V.liaisons.length, trouvees: L.length, justes, bornes, bouts, manquees, trop, tranches, parEtiquette: [...parEtiquette], parPage: [...parPage], cart, scannees, orphelins, ms: R.ms, tPages: R.tPages,
    causes: [...causes].sort((a, b) => b[1].n - a[1].n), ia, collees: L.filter(l => l.colle).length, surFaux: [...surFaux].sort((a, b) => b[1] - a[1]), numeros, qualites }; }

/* ---- le rapport ------------------------------------------------------------------------------------------------------ */
function tableau(res) {
  const col = [['', 3], ['Document', 34], ['pages', 6], ['vérité', 7], ['trouvées', 9], ['justes', 7], ['rappel', 7], ['précision', 10], ['bornes', 7], ['bouts', 6], ['en trop', 8], ['manquées', 9], ['« sûr » juste', 14], ['temps', 8]];
  const ligne = vals => '  ' + vals.map((v, k) => k < 2 ? String(v).padEnd(col[k][1]) : String(v).padStart(col[k][1])).join(' ');
  const out = [ligne(col.map(c => c[0])), '  ' + '─'.repeat(col.reduce((a, c) => a + c[1] + 1, 0))];
  res.forEach(r => { const sur = r.tranches[0]; out.push(ligne([r.lettre, r.nom.slice(0, 34), r.pages, r.verite, r.trouvees, r.justes, pct(r.justes, r.verite), pct(r.justes, r.trouvees), r.bornes, r.bouts, r.trop, r.manquees, sur.n ? pct(sur.justes, sur.n) + ' (' + sur.n + ')' : '—', sec(r.ms)])); });
  return out.join('\n'); }
function rapport(r) {
  const o = [], sur = r.tranches[0], revoir = r.tranches[1];
  o.push(`\n${r.lettre} — ${r.nom} (${r.fichier}, ${r.pages} pages, lu en ${sec(r.ms)}${r.tPages.length ? ', ' + Math.round(r.ms / r.pages) + ' ms par page' : ''})`);
  if (r.simulation) o.push('  SIMULATION — ce n’est pas ce que VOLTA lit aujourd’hui : les mots et les traits exacts du PDF vectoriel, tournés et décalés comme chaque page scannée, donnés au moteur par son entrée « scan » (celle qu’un module d’OCR emprunterait). La borne haute d’un OCR parfait.');
  if (r.scan) { const q = Object.entries(r.qualites || {}).map(([k, n]) => n + ' ' + (k === 'net' ? 'nette' + (n > 1 ? 's' : '') : k === 'gris' ? 'grise' + (n > 1 ? 's' : '') : 'photocopie' + (n > 1 ? 's' : ''))).join(', ');
    o.push(`  VOLTA dit ${r.scannees} page${r.scannees > 1 ? 's' : ''} sur ${r.pages} « scannée${r.scannees > 1 ? 's' : ''} »${q ? ' (' + q + ')' : ''} : il le voit bien, mais il n’a pas d’OCR — aucune liaison lue, les ${r.verite} sont à relier à la main.`); }
  else {
    o.push(`  ${r.justes} liaisons justes sur ${r.verite} (${pct(r.justes, r.verite)}), ${r.trouvees} trouvées : ${r.bornes} aux deux bons équipements mais une borne fausse, ${r.bouts} avec un bout au mauvais endroit, ${r.trop} en trop ; ${r.manquees} manquées.`);
    o.push(`  Quand VOLTA dit « sûr » (90 % et plus), il a raison ${sur.justes} fois sur ${sur.n} (${pct(sur.justes, sur.n)}) ; « à revoir » : ${revoir.justes} justes sur ${revoir.n}.` + (r.sorte === 'vsdx' ? ` ${r.collees} liaisons lues comme « collées aux deux bouts ».` : ''));
    if (r.surFaux.length) o.push('  Sûr, mais faux : ' + r.surFaux.slice(0, 4).map(([k, n]) => `${n} × ${k}`).join(' · ') + '.');
    if (r.numeros && r.numeros.ecrits) o.push(`  Numéros de fil : ${r.numeros.ecrits} liaisons en portent un ; sur les ${r.numeros.justes} lues justes, VOLTA en lit ${r.numeros.lus}${r.numeros.faux ? ' (' + r.numeros.faux + ' faux)' : ''}.`);
    if (r.cart.folios) o.push(`  Cartouche : le n° de plan lu sur ${r.cart.numero} folios sur ${r.cart.folios}, le folio sur ${r.cart.folio}, l’indice sur ${r.cart.indice}.`);
    const tri = r.parEtiquette.slice().sort((a, b) => b[1].justes / b[1].n - a[1].justes / a[1].n || b[1].n - a[1].n);
    const bien = tri.filter(([, x]) => x.n >= 3 && x.justes / x.n >= 0.85).map(([t, x]) => `${t} ${x.justes}/${x.n}`), mal = tri.filter(([, x]) => x.n >= 3 && x.justes / x.n < 0.6).map(([t, x]) => `${t} ${x.justes}/${x.n}`);
    if (bien.length) o.push(`  Lu bien : ${bien.join(' · ')}.`); if (mal.length) o.push(`  Lu mal : ${mal.join(' · ')}.`);
    if (r.parPage.length > 2) o.push('  Par sorte de page : ' + r.parPage.filter(([, x]) => x.pages).map(([k, x]) => `${k} (${x.pages} p.) ${x.n ? x.justes + '/' + x.n + ' justes' : 'aucune liaison à lire'}${x.trop ? ', ' + x.trop + ' en trop' : ''}`).join(' · ') + '.'); }
  r.causes.forEach(([k, x]) => { o.push(`    ${String(x.n).padStart(4)}  ${k}`); x.ex.forEach(e => o.push(`            ex. ${e}`)); });
  o.push(`  L’IA interne : ${r.ia.douteuses} liaisons sous 90 %, ${r.ia.orphelins} bouts orphelins, sur ${r.ia.pagesDoute} pages — environ ${r.ia.appels} appels (une question par page qui doute${r.ia.pagesTableau ? ', une par page de tableau' : ''}${r.ia.pagesTexte ? ', une par page de notes' : ''}${r.ia.tuiles ? ', ' + r.ia.tuiles + ' vignettes d’image à lire' : ''}, trois sur les conventions du document).`);
  return o.join('\n'); }

(async () => {
  const M = JSON.parse(fs.readFileSync(path.join(DOCS, 'documents.json'), 'utf8')), res = [];
  logBrut(`\n  CE QUE VOLTA LIT DES DOCUMENTS INVENTÉS — tests/documents${DOSSIER ? '/' + DOSSIER + ' (les documents d’avant)' : ''} (fabriqués le ${M.fabrique})\n`);
  for (const lettre of choix) { const D = M.documents[lettre]; if (!D) { logBrut('  — ' + lettre + ' : pas dans documents.json'); continue; } D.forme = D.forme || M.forme || ''; res.push(await mesurer(lettre, D));
    // un scan : sa borne haute, si un OCR lisait parfaitement ses mots et ses traits (une simulation)
    if (D.scan) { const source = lettre === 'B' ? M.documents.A : M.documents.D; if (!source) continue;
      const pages = D.pagesSource || D.pages.map((_, i) => i + 1), r = await mesurer(lettre + '*', D, { source: source.fichier, pages, ppp: lettre === 'B' ? 150 : 110, poses: D.poses });
      r.nom = 'si un OCR lisait parfaitement ' + lettre; r.simulation = true; res.push(r); } }
  logBrut(tableau(res)); res.forEach(r => logBrut(rapport(r)));
  const tot = res.filter(r => !r.scan && !r.simulation).reduce((a, r) => ({ v: a.v + r.verite, j: a.j + r.justes }), { v: 0, j: 0 });
  logBrut(`\n  En tout (hors scans et simulations) : ${tot.j} liaisons justes sur ${tot.v} (${pct(tot.j, tot.v)}).`);
  if (SORTIE_JSON) { fs.writeFileSync(SORTIE_JSON, JSON.stringify(res, null, 1)); logBrut('  Détail : ' + SORTIE_JSON); }
  logBrut('\n  mesure faite — tout est vert (cette batterie mesure, elle ne juge pas)');
})().catch(e => { console.error('ÉCHEC', e); process.exit(1); });
