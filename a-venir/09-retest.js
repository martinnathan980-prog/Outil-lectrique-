/* ===========================================================================
   09 — LA BASE DE RETEST
   Le contrat ne déclare que ses liaisons ; les BARRETTES (VT) et les PRISES
   DE COUPURE (VC) qu'elles traversent n'y sont pas. Elles existent dans le
   fichier de retest, parce que les autres contrats les ont écrites. On va
   les y chercher, en quatre gestes :
     charger      lire la base (Excel ou CSV), en mémoire, rien ne sort
     identifier   reconnaître chaque équipement du contrat à son EMPREINTE
                  (ce qu'il touche), à trois finesses
     proches      de quel contrat de la base le mien est-il une variante ?
     pièces       ce que ce contrat a et que je n'ai pas → recopié tel quel,
                  avec sa provenance ; « Annuler » rend l'état exact d'avant
   =========================================================================== */
'use strict';

const base = { lignes: null, col: null, entete: -1, fichier: '', feuille: '', rapport: '',
               index: null, parContrat: null, choisi: null, pose: null, plan: null };
const NR = d => String(d || '').toUpperCase().replace(/\s+/g, '');   // un repère se compare normalisé
const cell = (row, k) => { const i = base.col[k]; if (i == null || row[i] == null) return ''; return String(row[i]).trim(); };
const S1 = '\u0001';
const monContratReel = () => (app.source || app.contrat.liaisons).filter(liaisonComplete);

/* ---- charger ----------------------------------------------------------- */
function lireCSV(texte) {
  const tete = texte.slice(0, 4000), cnt = ch => tete.split(ch).length - 1;
  const sep = [['\t', cnt('\t')], [';', cnt(';')], [',', cnt(',')]].sort((a, b) => b[1] - a[1])[0][0];
  const out = []; let row = [], cur = '', q = false;
  for (let i = 0; i < texte.length; i++) { const ch = texte[i];
    if (q) { if (ch === '"') { if (texte[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; continue; }
    if (ch === '"') { q = true; continue; }
    if (ch === sep) { row.push(cur); cur = ''; continue; }
    if (ch === '\n') { row.push(cur); out.push(row); row = []; cur = ''; continue; }
    if (ch === '\r') continue; cur += ch; }
  if (cur !== '' || row.length) { row.push(cur); out.push(row); }
  return out;
}
async function chargerBase(fichier) {
  const nom = (fichier.name || '').toLowerCase(); let lignes, feuille = '';
  if (/\.xls[xmb]?$/.test(nom) || /sheet|excel/.test(fichier.type || '')) {
    if (typeof XLSX === 'undefined') throw new Error('bibliothèque Excel absente');
    const buf = await fichier.arrayBuffer();
    // on ne décompresse que la feuille utile : le classeur en porte plusieurs
    let noms = []; try { noms = XLSX.read(buf, { type: 'array', bookSheets: true }).SheetNames || []; } catch (_) { }
    feuille = noms.filter(n => /retest/i.test(n))[0] || noms[0] || '';
    const opt = { type: 'array', raw: true, cellFormula: false, cellHTML: false, cellNF: false, cellStyles: false, cellDates: false };
    if (feuille) opt.sheets = feuille;
    const wb = XLSX.read(buf, opt); const ws = wb.Sheets[feuille] || wb.Sheets[wb.SheetNames[0]];
    if (!ws) throw new Error('feuille introuvable dans le classeur'); if (!feuille) feuille = wb.SheetNames[0];
    lignes = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: true, defval: '', raw: true });   // lignes vides gardées : numérotation Excel
  } else { lignes = lireCSV(await fichier.text()); feuille = '(CSV)'; }
  const e = trouverEnteteRetest(lignes);
  if (!e) throw new Error('en-têtes introuvables : il faut au moins Device1, Pin1, Device2 et Pin2 dans les 30 premières lignes');
  oublierBase(false);
  base.lignes = lignes; base.col = e.col; base.entete = e.ligne; base.fichier = fichier.name; base.feuille = feuille;
  return { lignes: lignes.length - e.ligne - 1, colonnes: e.trouvees, entete: e.ligne + 1, feuille };
}
function oublierBase(tout) { if (tout !== false) { base.lignes = null; base.col = null; base.rapport = ''; }
  base.index = null; base.parContrat = null; base.choisi = null; base.pose = null; base.plan = null; }
const chaqueLigne = f => { for (let r = base.entete + 1; r < base.lignes.length; r++) { const row = base.lignes[r]; if (!row) continue;
  const d1 = NR(cell(row, 'device1')), d2 = NR(cell(row, 'device2')); if (!d1 && !d2) continue; f(row, d1, d2, r); } };

/* Reconnaissance : ce que la base contient, en quelques lignes. */
function reconnaissance() {
  if (!base.lignes) throw new Error('charge d’abord la base de retest');
  const contrats = new Map(), equipements = new Set(), codes = new Map(); let n = 0, shunts = 0;
  chaqueLigne((row, d1, d2) => { n++; const ap = cell(row, 'appareil'); if (ap) contrats.set(ap, (contrats.get(ap) || 0) + 1);
    [d1, d2].forEach(d => { if (!d || equipements.has(d)) return; equipements.add(d); const q = lireRepere(d); if (q) codes.set(q.code, (codes.get(q.code) || 0) + 1); });
    if (d1 && d1 === d2) shunts++; });
  const top = (m, k) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, k);
  const vt = [...codes.entries()].filter(([c]) => c.startsWith('VT')).reduce((s, x) => s + x[1], 0);
  const vc = [...codes.entries()].filter(([c]) => c.startsWith('VC')).reduce((s, x) => s + x[1], 0);
  return [
    { t: 'Volumes', l: [['Lignes de données', n, 'feuille ' + base.feuille + ', en-têtes ligne ' + (base.entete + 1)],
                        ['Contrats (Appareil)', contrats.size, top(contrats, 6).map(x => x[0] + ' (' + x[1] + ')').join('   ')],
                        ['Équipements distincts', equipements.size, '']] },
    { t: 'Grammaire des repères', l: [['Codes de type', codes.size, top(codes, 16).map(x => x[0] + ' ×' + x[1]).join('   ')],
                                       ['Barrettes (VT…)', vt, ''], ['Prises de coupure (VC…)', vc, ''],
                                       ['Shunts écrits (Device1 = Device2)', shunts, shunts ? 'le shunt est une ligne à part entière' : 'aucun']] }
  ];
}

/* ---- identifier : l'empreinte d'un équipement, c'est ce qu'il touche ----
   Trois finesses, du strict au tolérant :
     n1  ma borne + le partenaire + sa borne   → identique
     n2  le partenaire + sa borne               → mes bornes ont bougé
     n3  le partenaire seul                     → même voisinage             */
const cles = (pin, autre, pinAutre) => { const P = String(pin || '').toUpperCase().trim(), A = NR(autre), Q = String(pinAutre || '').toUpperCase().trim();
  return [P + S1 + A + S1 + Q, A + S1 + Q, A]; };
function indexerBase() {
  if (!base.lignes) throw new Error('charge d’abord la base de retest');
  const idx = new Map();
  const add = (dev, pin, autre, pinAutre, pn, ap) => { if (!dev) return;
    const o = idx.get(dev) || idx.set(dev, { n1: new Set(), n2: new Set(), n3: new Set(), pn: new Map(), app: new Set(), n: 0 }).get(dev);
    o.n++; const k = cles(pin, autre, pinAutre); o.n1.add(k[0]); o.n2.add(k[1]); o.n3.add(k[2]);
    if (pn) o.pn.set(pn, (o.pn.get(pn) || 0) + 1); if (ap && o.app.size < 12) o.app.add(ap); };
  chaqueLigne((row, d1, d2) => { const p1 = cell(row, 'pin1'), p2 = cell(row, 'pin2'), ap = cell(row, 'appareil');
    if (d1) add(d1, p1, d2, p2, cell(row, 'pn1'), ap); if (d2) add(d2, p2, d1, p1, cell(row, 'pn2'), ap); });
  base.index = idx; return idx.size;
}
function empreinteDuContrat() { const emp = new Map();
  const add = (dev, pin, autre, pinAutre) => { if (!dev) return;
    const o = emp.get(dev) || emp.set(dev, { n1: new Set(), n2: new Set(), n3: new Set(), n: 0 }).get(dev);
    o.n++; const k = cles(pin, autre, pinAutre); o.n1.add(k[0]); o.n2.add(k[1]); o.n3.add(k[2]); };
  monContratReel().forEach(l => { const a = NR(l.de), b = NR(l.vers); add(a, l.borneDe, b, l.borneVers); add(b, l.borneVers, a, l.borneDe); });
  return emp; }
const inter = (A, B) => { let n = 0; A.forEach(x => { if (B.has(x)) n++; }); return n; };
function identifier() {
  if (!base.index) indexerBase();
  const idx = base.index, emp = empreinteDuContrat();
  const parVoisin = new Map();                       // seuls les équipements qui touchent un de mes voisins sont candidats
  idx.forEach((o, d) => o.n3.forEach(v => (parVoisin.get(v) || parVoisin.set(v, []).get(v)).push(d)));
  const res = [];
  emp.forEach((me, dev) => { const vus = new Set(); me.n3.forEach(v => (parVoisin.get(v) || []).forEach(d => vus.add(d)));
    const cands = [];
    vus.forEach(d => { const o = idx.get(d); if (!o) return;
      const c1 = inter(me.n1, o.n1), c2 = inter(me.n2, o.n2), c3 = inter(me.n3, o.n3); if (!c3) return;
      const t = me.n1.size || 1, memeNom = d === dev;
      if (!memeNom && !c2 && c3 < 2) return;          // un seul voisin commun n'est pas un candidat
      // le nom est une preuve quand il colle ; le score privilégie l'identique mais reconnaît l'équipement modifié
      const sc = (c1 / t) * 100 + (c2 / t) * 35 + (c3 / (me.n3.size || 1)) * 15 + (memeNom ? 60 : 0);
      cands.push({ nom: d, sc: +sc.toFixed(1), memeNom, cov1: Math.round(100 * c1 / t), cov2: Math.round(100 * c2 / t), cov3: Math.round(100 * c3 / (me.n3.size || 1)),
        enPlus: Math.max(0, o.n1.size - c1), pn: ([...o.pn.entries()].sort((a, b) => b[1] - a[1])[0] || [''])[0], app: [...o.app].slice(0, 2).join(', ') }); });
    cands.sort((a, b) => b.sc - a.sc); const top = cands.slice(0, 4), b = top[0];
    let verdict;
    if (!b) verdict = { t: 'neuf', txt: 'aucun équipement de la base ne lui ressemble : à créer' };
    else if (b.memeNom && b.cov1 >= 90) verdict = { t: 'sur', txt: 'même repère, câblage identique' };
    else if (b.memeNom) verdict = { t: 'sur', txt: 'même repère dans la base — le câblage diffère, à comparer' };
    else if (b.cov1 >= 90) verdict = { t: 'sur', txt: 'c’est lui, à l’identique' };
    else if (b.cov2 >= 90) verdict = { t: 'modif', txt: 'c’est lui, avec des bornes réaffectées' };
    else if (b.cov2 >= 60) verdict = { t: 'proche', txt: 'très probablement lui, à vérifier' };
    else if (b.cov3 >= 60) verdict = { t: 'flou', txt: 'même voisinage, mais les bornes ne collent pas' };
    else verdict = { t: 'neuf', txt: 'rien de convaincant : à créer' };
    res.push({ dev, liaisons: me.n1.size, cands: top, verdict }); });
  res.sort((a, b) => b.liaisons - a.liaisons); return res;
}

/* ---- proches : de quel contrat partir ? ------------------------------- */
const cleLiaison = (a, pa, b, pb) => { const A = NR(a), B = NR(b), P = String(pa || '').toUpperCase().trim(), Q = String(pb || '').toUpperCase().trim();
  return (A < B || (A === B && P <= Q)) ? A + S1 + P + S1 + B + S1 + Q : B + S1 + Q + S1 + A + S1 + P; };
const estPieceInter = d => { const q = lireRepere(d); return !!q && (q.code.startsWith('VT') || q.code.startsWith('VC')); };
function indexerContrats() {
  if (!base.lignes) throw new Error('charge d’abord la base de retest');
  const M = new Map();
  chaqueLigne((row, d1, d2, r) => { const ap = cell(row, 'appareil') || '(sans contrat)';
    const o = M.get(ap) || M.set(ap, { liaisons: new Map(), devices: new Set(), pieces: new Map(), n: 0 }).get(ap);
    o.n++; if (d1) o.devices.add(d1); if (d2) o.devices.add(d2);
    if (d1 && d2) { o.liaisons.set(cleLiaison(d1, cell(row, 'pin1'), d2, cell(row, 'pin2')), r);
      if (estPieceInter(d1)) (o.pieces.get(d1) || o.pieces.set(d1, new Set()).get(d1)).add(d2);
      if (estPieceInter(d2)) (o.pieces.get(d2) || o.pieces.set(d2, new Set()).get(d2)).add(d1); } });
  base.parContrat = M; return M.size;
}
function monContrat() { const L = new Set(), D = new Set();
  monContratReel().forEach(l => { const a = NR(l.de), b = NR(l.vers); D.add(a); D.add(b); L.add(cleLiaison(a, l.borneDe, b, l.borneVers)); });
  return { liaisons: L, devices: D }; }
/* Trois mesures séparées : le câblage commun, le matériel commun, et ce que
   le contrat APPORTE — un contrat identique au mien ressemble beaucoup et
   n'apprend rien, il passe donc derrière. */
function contratsProches() {
  if (!base.parContrat) indexerContrats();
  const moi = monContrat(), res = [];
  base.parContrat.forEach((o, ap) => { let cl = 0, cd = 0;
    moi.liaisons.forEach(k => { if (o.liaisons.has(k)) cl++; }); moi.devices.forEach(d => { if (o.devices.has(d)) cd++; });
    if (!cd) return;
    let apporte = 0; const quoi = [];
    o.pieces.forEach((vois, nom) => { if (moi.devices.has(nom)) return; let touche = false; vois.forEach(v => { if (moi.devices.has(v)) touche = true; });
      if (touche) { apporte++; if (quoi.length < 6) quoi.push(nom); } });
    res.push({ contrat: ap, lignes: o.n, liaisonsCommunes: cl, tauxLiaisons: Math.round(100 * cl / Math.max(1, moi.liaisons.size)),
      devicesCommuns: cd, tauxDevices: Math.round(100 * cd / Math.max(1, moi.devices.size)), sesLiaisons: o.liaisons.size, piecesApportees: apporte, exemples: quoi }); });
  res.sort((a, b) => (b.piecesApportees > 0) - (a.piecesApportees > 0) || b.tauxLiaisons - a.tauxLiaisons || b.tauxDevices - a.tauxDevices);
  base.proches = { moi, res }; return res;
}
/* Ce qu'un contrat a et que je n'ai pas, entre des équipements que je possède. */
function differentiel(ap) {
  if (!base.parContrat) indexerContrats();
  const o = base.parContrat.get(ap); if (!o) return null;
  const moi = monContrat(); const viaPiece = [], entreConnus = [], sesPieces = new Map();
  o.liaisons.forEach((r, k) => { if (moi.liaisons.has(k)) return; const row = base.lignes[r]; if (!row) return;
    const d1 = NR(cell(row, 'device1')), d2 = NR(cell(row, 'device2')); const p1 = estPieceInter(d1), p2 = estPieceInter(d2);
    const item = { de: d1, pinDe: cell(row, 'pin1'), vers: d2, pinVers: cell(row, 'pin2'), pn1: cell(row, 'pn1'), pn2: cell(row, 'pn2'), route: cell(row, 'route'), cable: cell(row, 'cabletg'), ligne: r + 1 };
    if (p1 || p2) { const autre = p1 ? d2 : d1, piece = p1 ? d1 : d2; if (!moi.devices.has(autre)) return;
      viaPiece.push(item); const z = sesPieces.get(piece) || sesPieces.set(piece, { nom: piece, pn: p1 ? item.pn1 : item.pn2, vers: [], route: item.route }).get(piece);
      z.vers.push(autre + '·' + (p1 ? item.pinVers : item.pinDe)); }
    else if (moi.devices.has(d1) && moi.devices.has(d2)) entreConnus.push(item); });
  let enPlus = 0; moi.liaisons.forEach(k => { if (!o.liaisons.has(k)) enPlus++; });
  return { contrat: ap, pieces: [...sesPieces.values()].sort((a, b) => b.vers.length - a.vers.length), viaPiece, entreConnus, enPlus, sesLignes: o.n };
}

/* ---- pièces : recopier, jamais reconstruire --------------------------- */
function lignesDeLaPiece(ap, piece) { const o = base.parContrat.get(ap); if (!o) return []; const moi = monContrat(); const out = [];
  o.liaisons.forEach(r => { const row = base.lignes[r]; if (!row) return; const d1 = NR(cell(row, 'device1')), d2 = NR(cell(row, 'device2'));
    if (d1 !== piece && d2 !== piece) return; const autre = d1 === piece ? d2 : d1;
    if (autre !== piece && !moi.devices.has(autre)) return;       // le reste appartient à l'autre appareil
    const l = liaison({ de: d1, borneDe: cell(row, 'pin1'), vers: d2, borneVers: cell(row, 'pin2'), cable: cell(row, 'cabletag'), type: cell(row, 'cabletg'), route: cell(row, 'route'), pnDe: cell(row, 'pn1'), pnVers: cell(row, 'pn2') });
    l.provenance = ap + ' ligne ' + (r + 1); out.push(l); });
  return out; }
/* Mes liaisons rendues caduques : celles dont les DEUX bouts sont raccordés à la pièce dans la référence. */
function caduquesPar(piece, lignes) { const sur = new Set();
  lignes.forEach(l => { const a = NR(l.de), b = NR(l.vers);
    if (a === piece && b !== piece) sur.add(b + S1 + String(l.borneVers).toUpperCase()); if (b === piece && a !== piece) sur.add(a + S1 + String(l.borneDe).toUpperCase()); });
  const out = []; monContratReel().forEach((l, i) => { if (sur.has(NR(l.de) + S1 + String(l.borneDe).toUpperCase()) && sur.has(NR(l.vers) + S1 + String(l.borneVers).toUpperCase())) out.push(i); });
  return out; }
function planPieces(ap) { const d = differentiel(ap); if (!d) return null;
  return d.pieces.map(z => { const ajoute = lignesDeLaPiece(ap, z.nom); const retire = caduquesPar(z.nom, ajoute);
    return { piece: z.nom, pn: z.pn, route: z.route, ajoute, retire, shunts: ajoute.filter(l => NR(l.de) === NR(l.vers)).length, vers: z.vers, retenu: true }; }).filter(x => x.ajoute.length); }
/* L'écriture. « Annuler » ne défait que cette écriture-là : on garde les
   lignes retirées avec leur place, et les objets insérés — reconnus à
   l'identité, donc retrouvés même après édition. */
function appliquerPieces(plan) {
  if (!plan || !plan.length) return { pieces: 0, ajoutees: 0, retirees: 0 };
  if (app.nFolios) derouler();
  const retirer = new Set(), ajouter = [];
  plan.forEach(x => { if (!x.retenu) return; x.retire.forEach(i => retirer.add(i)); x.ajoute.forEach(l => ajouter.push({ ...l })); });
  base.pose = { retires: [...retirer].sort((a, b) => a - b).map(i => ({ i, l: { ...app.contrat.liaisons[i] } })), ajouts: ajouter,
                bilan: { pieces: plan.filter(x => x.retenu).length, ajoutees: ajouter.length, retirees: retirer.size } };
  app.contrat.liaisons = app.contrat.liaisons.filter((l, i) => !retirer.has(i)).concat(ajouter);
  app.choisi = null; redessiner(); ajuster(); sauver(); return base.pose.bilan;
}
function annulerPieces() { const p = base.pose; if (!p) return false;
  if (app.nFolios) derouler();
  const nes = new Set(p.ajouts); const arr = app.contrat.liaisons.filter(l => !nes.has(l));
  p.retires.forEach(o => arr.splice(Math.min(o.i, arr.length), 0, { ...o.l }));
  app.contrat.liaisons = arr; base.pose = null; app.choisi = null; redessiner(); ajuster(); sauver(); return true; }

/* ---- les rapports ------------------------------------------------------ */
const e2 = t => String(t == null ? '' : t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function montrerRapport(html, txt) { base.rapport = txt; $('rb-body').innerHTML = html; $('rmodal').style.display = 'flex'; }
function rapportReconnaissance() { const S = reconnaissance(); let html = '', txt = 'RECONNAISSANCE DE LA BASE DE RETEST\n' + base.fichier + '\n';
  S.forEach(sec => { html += '<section><h4>' + e2(sec.t) + '</h4><table><tbody>'; txt += '\n== ' + sec.t + ' ==\n';
    sec.l.forEach(li => { html += '<tr><td>' + e2(li[0]) + '</td><td class="n">' + e2(li[1]) + '</td><td class="ex">' + e2(li[2] || '') + '</td></tr>'; txt += '  ' + li[0] + ' : ' + li[1] + (li[2] ? '   [' + li[2] + ']' : '') + '\n'; });
    html += '</tbody></table></section>'; });
  montrerRapport(html, txt); }
const COUL = { sur: 'v-ok', modif: 'v-ok', proche: 'v-hm', flou: 'v-hm', neuf: 'v-no' };
const TITRE = { sur: 'à l’identique', modif: 'bornes réaffectées', proche: 'à vérifier', flou: 'incertain', neuf: 'à créer' };
function rapportIdentification(res) { const par = {}; res.forEach(r => { par[r.verdict.t] = (par[r.verdict.t] || 0) + 1; });
  let html = '<section><h4>Bilan</h4><table><tbody>', txt = 'IDENTIFICATION DES ÉQUIPEMENTS\n\n';
  ['sur', 'modif', 'proche', 'flou', 'neuf'].forEach(k => { if (!par[k]) return; const pct = Math.round(1000 * par[k] / res.length) / 10 + ' %';
    html += '<tr><td>' + TITRE[k] + '</td><td class="n">' + par[k] + '</td><td class="ex">' + pct + ' des équipements</td></tr>'; txt += '  ' + TITRE[k] + ' : ' + par[k] + ' (' + pct + ')\n'; });
  html += '</tbody></table></section>';
  res.forEach(r => { html += '<section><h4>' + e2(r.dev) + ' — ' + r.liaisons + ' liaison(s)</h4><p class="verdict ' + COUL[r.verdict.t] + '">' + e2(r.verdict.txt) + '</p>';
    txt += '\n== ' + r.dev + ' (' + r.liaisons + ' liaisons) : ' + r.verdict.txt + '\n';
    if (r.cands.length) { html += '<table><thead><tr><th>Candidat</th><th>identique</th><th>bornes déplacées</th><th>voisinage</th><th>en plus</th><th>part number</th><th>contrat</th></tr></thead><tbody>';
      r.cands.forEach(c => { html += '<tr><td><b>' + e2(c.nom) + '</b>' + (c.memeNom ? ' <span class="verdict v-ok">= repère</span>' : '') + '</td><td class="n">' + c.cov1 + ' %</td><td class="n">' + c.cov2 + ' %</td><td class="n">' + c.cov3 + ' %</td><td class="n">' + c.enPlus + '</td><td class="ex">' + e2(c.pn) + '</td><td class="ex">' + e2(c.app) + '</td></tr>';
        txt += '   ' + c.nom + '  identique ' + c.cov1 + '% · bornes déplacées ' + c.cov2 + '% · voisinage ' + c.cov3 + '% · ' + c.enPlus + ' en plus · ' + c.pn + '  [' + c.app + ']\n'; });
      html += '</tbody></table>'; }
    html += '</section>'; });
  montrerRapport(html, txt); }
function rapportProches() { const res = contratsProches(); const moi = base.proches.moi;
  let html = '<section><h4>Mon contrat</h4><table><tbody><tr><td>Équipements</td><td class="n">' + moi.devices.size + '</td><td class="ex"></td></tr><tr><td>Liaisons</td><td class="n">' + moi.liaisons.size + '</td><td class="ex"></td></tr><tr><td>Contrats confrontés</td><td class="n">' + res.length + '</td><td class="ex">sur ' + base.parContrat.size + ' dans la base</td></tr></tbody></table></section>';
  let txt = 'DE QUEL CONTRAT PARTIR ?\n\nmes équipements : ' + moi.devices.size + ' | mes liaisons : ' + moi.liaisons.size + '\n\n';
  if (!res.length) html += '<section><p class="verdict v-no">Aucun contrat de la base ne partage un seul équipement avec le tien.</p></section>';
  else { html += '<section><h4>Classement</h4><p class="rnote">Trois mesures séparées à dessein : le <b>câblage</b> commun, le <b>matériel</b> commun, et ce que le contrat <b>apporte</b> — les barrettes et prises de coupure qu’il a et que tu n’as pas.</p><table><thead><tr><th>Contrat</th><th>apporte</th><th>câblage commun</th><th>matériel commun</th><th>ses liaisons</th></tr></thead><tbody>';
    res.slice(0, 10).forEach((x, i) => { html += '<tr><td>' + (i === 0 ? '<b>' + e2(x.contrat) + '</b>' : e2(x.contrat)) + '</td><td class="n">' + (x.piecesApportees || '—') + (x.exemples.length ? ' <span class="ex">' + e2(x.exemples.slice(0, 3).join(' ')) + '</span>' : '') + '</td><td class="n">' + x.tauxLiaisons + ' % <span class="ex">(' + x.liaisonsCommunes + ')</span></td><td class="n">' + x.tauxDevices + ' % <span class="ex">(' + x.devicesCommuns + ')</span></td><td class="n">' + x.sesLiaisons + '</td></tr>';
      txt += '  ' + x.contrat + ' : apporte ' + x.piecesApportees + ' pièce(s) · câblage ' + x.tauxLiaisons + '% (' + x.liaisonsCommunes + ') · matériel ' + x.tauxDevices + '%\n'; });
    html += '</tbody></table>';
    const b = res[0];
    const v = !b.piecesApportees ? ['v-hm', '<b>' + e2(b.contrat) + '</b> est le plus proche (' + b.tauxLiaisons + ' % du câblage) mais n’apporte aucune barrette ni prise de coupure que tu n’aies déjà.']
      : b.tauxLiaisons >= 70 ? ['v-ok', 'Ton contrat est très probablement une variante de <b>' + e2(b.contrat) + '</b> : ' + b.tauxLiaisons + ' % de ton câblage y existe déjà, et il porte ' + b.piecesApportees + ' pièce(s) que tu n’as pas.']
      : b.tauxLiaisons >= 30 ? ['v-hm', '<b>' + e2(b.contrat) + '</b> est le plus proche (' + b.tauxLiaisons + ' % du câblage), mais c’est loin d’être une copie.']
      : b.tauxDevices >= 50 ? ['v-hm', 'Aucun contrat ne partage vraiment ton câblage, mais <b>' + e2(b.contrat) + '</b> a ' + b.tauxDevices + ' % de ton matériel.']
      : ['v-no', 'Rien de proche : ton contrat est une architecture nouvelle.'];
    html += '<p class="verdict ' + v[0] + '">' + v[1] + '</p></section>'; txt += '\n>> ' + v[1].replace(/<[^>]+>/g, '') + '\n';
    const d = differentiel(b.contrat); base.choisi = b.contrat;
    if (d) { html += '<section><h4>Ce que ' + e2(b.contrat) + ' a et que tu n’as pas</h4><table><tbody><tr><td>Pièces intermédiaires à reprendre</td><td class="n">' + d.pieces.length + '</td><td class="ex">barrettes et prises de coupure</td></tr><tr><td>Liaisons passant par elles</td><td class="n">' + d.viaPiece.length + '</td><td class="ex"></td></tr><tr><td>Liaisons directes en écart</td><td class="n">' + d.entreConnus.length + '</td><td class="ex">à vérifier</td></tr><tr><td>Liaisons à toi qu’il n’a pas</td><td class="n">' + d.enPlus + '</td><td class="ex"></td></tr></tbody></table></section>';
      d.pieces.slice(0, 25).forEach(z => { html += '<section><h4>' + e2(z.nom) + '</h4><table><tbody><tr><td>Part number</td><td class="ex">' + e2(z.pn || '—') + '</td></tr><tr><td>Route</td><td class="ex">' + e2(z.route || '—') + '</td></tr><tr><td>Se raccorde à</td><td class="ex">' + e2(z.vers.join('   ')) + '</td></tr></tbody></table></section>';
        txt += '  ' + z.nom + '  PN ' + (z.pn || '-') + '  route ' + (z.route || '-') + '  -> ' + z.vers.join(' ') + '\n'; }); } }
  montrerRapport(html, txt); }
function rapportPlan(ap) { const plan = planPieces(ap); base.plan = plan;
  if (!plan || !plan.length) { montrerRapport('<section><p class="verdict v-ok">Rien à ajouter : ton contrat a déjà toutes les pièces intermédiaires de ' + e2(ap) + '.</p></section>', 'rien à ajouter'); return; }
  const nAj = plan.reduce((s, x) => s + x.ajoute.length, 0); const nRe = new Set(); plan.forEach(x => x.retire.forEach(i => nRe.add(i)));
  let html = '<section><h4>Ce qui va être écrit</h4><p class="rnote">Tout est coché. Décoche ce que tu refuses, puis applique. Les lignes sont <b>recopiées</b> de ' + e2(ap) + ' — bornes, part number et route d’origine — jamais reconstruites.</p><table><tbody><tr><td>Pièces proposées</td><td class="n">' + plan.length + '</td><td class="ex"></td></tr><tr><td>Liaisons ajoutées</td><td class="n">' + nAj + '</td><td class="ex"></td></tr><tr><td>Liaisons directes remplacées</td><td class="n">' + nRe.size + '</td><td class="ex">leurs deux bouts passent par la pièce</td></tr></tbody></table><div class="actions" style="margin-top:10px"><button class="primary" id="pl-go">Appliquer les pièces retenues</button><button class="ghost" id="pl-undo">Annuler la dernière application</button></div><div id="pl-stat" class="rnote" style="margin-top:8px"></div></section>';
  let txt = 'PIÈCES À AJOUTER — d’après ' + ap + '\n\n' + plan.length + ' pièces · ' + nAj + ' liaisons ajoutées · ' + nRe.size + ' remplacées\n';
  plan.forEach((x, i) => { html += '<section><h4><label><input type="checkbox" class="pl-ck" data-i="' + i + '" checked> ' + e2(x.piece) + '</label></h4><table><tbody><tr><td>Part number</td><td class="ex">' + e2(x.pn || '—') + '</td></tr><tr><td>Route</td><td class="ex">' + e2(x.route || '—') + '</td></tr><tr><td>Se raccorde à</td><td class="ex">' + e2(x.vers.join('   ')) + '</td></tr><tr><td>Lignes ajoutées</td><td class="n">' + x.ajoute.length + '</td></tr><tr><td>…dont shunts</td><td class="n">' + x.shunts + '</td></tr><tr><td>Liaisons remplacées</td><td class="n">' + x.retire.length + '</td></tr></tbody></table><table style="margin-top:6px"><thead><tr><th>de</th><th>b.</th><th>vers</th><th>b.</th><th>route</th><th>provenance</th></tr></thead><tbody>';
    x.ajoute.slice(0, 12).forEach(l => { html += '<tr><td>' + e2(l.de) + '</td><td class="n">' + e2(l.borneDe) + '</td><td>' + e2(l.vers) + '</td><td class="n">' + e2(l.borneVers) + '</td><td class="ex">' + e2(l.route) + '</td><td class="ex">' + e2(l.provenance) + '</td></tr>'; txt += '  ' + l.de + '·' + l.borneDe + ' -> ' + l.vers + '·' + l.borneVers + '   [' + l.provenance + ']\n'; });
    if (x.ajoute.length > 12) html += '<tr><td class="ex" colspan="6">… et ' + (x.ajoute.length - 12) + ' autres</td></tr>';
    html += '</tbody></table></section>'; });
  montrerRapport(html, txt);
  const body = $('rb-body'); body.querySelectorAll('.pl-ck').forEach(ck => ck.onchange = () => { plan[+ck.dataset.i].retenu = ck.checked; });
  const st = $('pl-stat');
  $('pl-go').onclick = () => { const r = appliquerPieces(plan); st.textContent = '✓ ' + r.pieces + ' pièce(s) écrite(s) : ' + r.ajoutees + ' liaison(s) ajoutée(s), ' + r.retirees + ' remplacée(s). Le schéma est redessiné.'; synchroniserRetest(); };
  $('pl-undo').onclick = () => { st.textContent = annulerPieces() ? '↩ état précédent rétabli.' : 'rien à annuler.'; synchroniserRetest(); }; }

/* ---- la base de démonstration (sert aux contrôles) ---------------------- */
function baseExemple() {
  const EN = ['Harness', 'Device1', 'Pin1', 'PN1', 'Description1', 'Cable T/G', 'Cable Tag', 'Route', 'Device2', 'Pin2', 'PN2', 'Description2', 'FWD', 'Cable Length (mm)', 'Appareil', 'Date retest'];
  const aoa = [[''], ['exemple'], [], EN];
  const add = (ap, d1, p1, pn1, d2, p2, pn2, rt) => aoa.push(['332A601794-040-H', d1, p1, pn1 || '', '', 'DR24', 'W' + aoa.length, rt || '1M', d2, p2, pn2 || '', '', 'SPE993A4676001B', '1200', ap, '']);
  add('IRO AE', '210SP1', '12', '*704A46220028', '667VT21', '1', 'ASNE0500-04'); add('IRO AE', '667VT21', '1', 'ASNE0500-04', '667VT21', '2', 'ASNE0500-04');
  add('IRO AE', '667VT21', '2', 'ASNE0500-04', '115CD', '3', 'ABS0864-12'); add('IRO AE', '667VT21', '3', 'ASNE0500-04', '118CD', '3', 'ABS0864-12');
  add('IRO AE', '667VT21', '4', 'ASNE0500-04', '409GH2', '7', 'NSA937802-05'); add('IRO AE', '340AB1', '4', 'EN2997Y1A08P', '512VN', '1', 'E0644G9S');
  add('IRO AE', '340AB1', '4', 'EN2997Y1A08P', '512VN', '2', 'E0644G9S'); add('IRO AE', '340AB1', '1', 'EN2997Y1A08P', '210SP1', '3', '*704A46220028');
  add('IRO AE', '340AB2', '1', 'EN2997Y1A08P', '210SP1', '4', '*704A46220028'); add('IRO AE', '115CD', '8', 'ABS0864-12', '408VC1A', '1', 'EN3646A6083AAN', '1M');
  add('IRO AE', '408VC1A', '2', 'EN3646A6083AAN', '601RC', '2', 'E0836IS35-22SA', '2M'); add('IRO AE', '601RC', '5', 'E0836IS35-22SA', '733LE', '1', 'E0644D9S');
  add('IRO AE', '733LE', '4', 'E0644D9S', '409GH2', '2', 'NSA937802-05'); add('IRO AE', '118CD', '8', 'ABS0864-12', '512VN', '5', 'E0644G9S');
  add('IRO AE', '409GH2', '9', 'NSA937802-05', '845VG', '3', 'E0656A01N1S0'); add('IRO AE', '845VG', '1', 'E0656A01N1S0', '601RC', '7', 'E0836IS35-22SA');
  add('IRO AE', '210SP1', '20', '*704A46220028', '904G', '', ''); add('IRO AE', '115CD', '20', 'ABS0864-12', '907G', '', '');
  add('IRO AD', '210SP1', '5', '*704A46220028', '115CD', '9', 'ABS0864-12'); add('IRO AD', '340AB1', '7', 'EN2997Y1A08P', '512VN', '8', 'E0644G9S');
  add('IRO AD', '601RC', '3', 'E0836IS35-22SA', '733LE', '9', 'E0644D9S');
  for (let i = 0; i < 20; i++) add('JCG AA', '77ZZ' + i, '1', 'ABS0000-1', '88YY' + i, '2', 'ABS0000-2');
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Retest');
  return new File([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], 'retest — exemple.xlsm', { type: 'application/vnd.ms-excel.sheet.macroEnabled.12' });
}

/* ---- l'onglet « Compléter » ------------------------------------------- */
function statutRetest(msg) { $('rb-stat').textContent = msg || ''; }
function synchroniserRetest() { const m = (id, fait) => $(id).classList.toggle('faite', !!fait);
  m('et-1', !!base.lignes); m('et-2', !!base.choisi); m('et-3', !!base.pose);
  $('rb-report').style.display = base.lignes ? '' : 'none'; $('rb-forget').style.display = base.lignes ? '' : 'none';
  $('cnt-rb').textContent = base.lignes ? String(base.lignes.length - base.entete - 1) : '—'; }
function lierRetest() {
  const essayer = (avant, f) => () => { try { if (!base.lignes) throw new Error('charge d’abord la base de retest');
      if (!monContratReel().length) throw new Error('charge d’abord un contrat'); statutRetest(avant);
      setTimeout(() => { try { statutRetest(f()); synchroniserRetest(); } catch (e) { statutRetest('Erreur : ' + (e && e.message || e)); } }, 20);
    } catch (e) { statutRetest('Erreur : ' + (e && e.message || e)); } };
  $('rb-browse').onclick = () => $('rb-file').click();
  $('rb-file').onchange = async e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
    try { statutRetest('Lecture de « ' + f.name + ' »…'); const r = await chargerBase(f);
      statutRetest('✓ « ' + f.name + ' » — feuille ' + r.feuille + ', ' + r.colonnes + ' colonnes reconnues, en-têtes ligne ' + r.entete + '.');
      synchroniserRetest(); rapportReconnaissance(); }
    catch (err) { oublierBase(); statutRetest('Erreur : ' + (err && err.message || err)); synchroniserRetest(); } };
  $('rb-ident').onclick = essayer('Identification en cours…', () => { const r = identifier(); rapportIdentification(r); return '✓ ' + r.length + ' équipement(s) confrontés à la base.'; });
  $('rb-proche').onclick = essayer('Comparaison aux contrats de la base…', () => { rapportProches(); return '✓ contrats classés.'; });
  $('rb-appl').onclick = essayer('Recherche du contrat de référence…', () => { const cls = contratsProches();
    if (!cls.length) throw new Error('aucun contrat de la base ne partage un équipement avec le tien'); rapportPlan(cls[0].contrat); return '✓ proposition établie d’après ' + cls[0].contrat + '.'; });
  $('rb-report').onclick = rapportReconnaissance;
  $('rb-forget').onclick = () => { oublierBase(); synchroniserRetest(); $('rb-body').innerHTML = ''; statutRetest('Base oubliée. Rien n’a été conservé.'); };
  $('rb-close').onclick = () => { $('rmodal').style.display = 'none'; };
  $('rmodal').addEventListener('click', e => { if (e.target.id === 'rmodal') $('rmodal').style.display = 'none'; });
  $('rb-copy').onclick = async () => { const cp = $('rb-copy'); try { await navigator.clipboard.writeText(base.rapport || ''); cp.textContent = 'Copié ✓'; setTimeout(() => { cp.textContent = 'Copier le rapport'; }, 1500); } catch (_) { cp.textContent = 'Copie refusée'; } };
  window.addEventListener('keydown', e => { if (e.key === 'Escape') $('rmodal').style.display = 'none'; });
}
