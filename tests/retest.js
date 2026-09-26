/* ===========================================================================
   LA BASE DE RETEST — identification, contrat de départ, pièces, annulation.
       node tests/retest.js
   Ne tourne que si le module est dans la page (src/09-retest.js) ; il est mis
   de côté dans a-venir/ tant que l'outil se concentre sur le dessin.
   ========================================================================= */
const { chromium } = require('playwright');
const { fichierDemande } = require('./pilote');
const FICHIER = fichierDemande();
let echecs = 0, total = 0;
function ok(nom, cond, mesure) { total++; if (!cond) echecs++; console.log('  ' + (cond ? 'OK    ' : 'ÉCHEC ') + nom + (mesure ? '   — ' + mesure : '')); }
function titre(t) { console.log('\n' + t); }
(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await nav.newPage({ viewport: { width: 1500, height: 980 } }); page.setDefaultTimeout(180000);
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  await page.goto(FICHIER); await page.waitForTimeout(1200);
  if (!(await page.evaluate(() => typeof chargerBase === 'function'))) { console.log('  la base de retest n’est pas dans la page (a-venir/) : rien à contrôler'); await nav.close(); process.exit(0); }
  titre('5. IDENTIFICATION ET CHOIX DU CONTRAT');
  const gros = await page.evaluate(async () => {
    const EN = ['Harness', 'Device1', 'Pin1', 'PN1', 'Description1', 'Cable T/G', 'Cable Tag', 'Route', 'Device2', 'Pin2', 'PN2', 'Description2', 'FWD', 'Cable Length (mm)', 'Appareil', 'Date retest'];
    const aoa = [[''], ['x'], [], EN];
    const add = (ap, d1, p1, pn1, d2, p2, pn2, rt) => aoa.push(['H', d1, p1, pn1 || '', '', 'DR24', 't', rt || '1M', d2, p2, pn2 || '', '', 'SPE', '1200', ap, '']);
    add('IRO AE', '210SP1', '12', '*70', '667VT21', '1', 'ASNE0500-04'); add('IRO AE', '667VT21', '1', 'ASNE0500-04', '667VT21', '2', 'ASNE0500-04');
    add('IRO AE', '667VT21', '2', 'ASNE0500-04', '115CD', '3', 'ABS0864-12'); add('IRO AE', '667VT21', '3', 'ASNE0500-04', '118CD', '3', 'ABS0864-12');
    add('IRO AE', '667VT21', '4', 'ASNE0500-04', '409GH2', '7', 'NSA937802-05'); add('IRO AE', '340AB1', '4', 'EN2997', '512VN', '1', 'E0644G9S');
    add('IRO AE', '340AB1', '4', 'EN2997', '512VN', '2', 'E0644G9S'); add('IRO AE', '340AB1', '1', 'EN2997', '210SP1', '3', '*70');
    add('IRO AE', '340AB2', '1', 'EN2997', '210SP1', '4', '*70'); add('IRO AE', '115CD', '8', 'ABS0864-12', '408VC1A', '1', 'EN3646', '1M');
    add('IRO AE', '408VC1A', '2', 'EN3646', '601RC', '2', 'E0836', '2M'); add('IRO AE', '601RC', '5', 'E0836', '733LE', '1', 'E0644');
    add('IRO AE', '733LE', '4', 'E0644', '409GH2', '2', 'NSA937802-05'); add('IRO AE', '118CD', '8', 'ABS0864-12', '512VN', '5', 'E0644G9S');
    add('IRO AE', '409GH2', '9', 'NSA937802-05', '845VG', '3', 'E0656'); add('IRO AE', '845VG', '1', 'E0656', '601RC', '7', 'E0836');
    add('IRO AD', '210SP1', '5', '*70', '115CD', '9', 'ABS0864-12'); add('IRO AD', '340AB1', '7', 'EN2997', '512VN', '8', 'E0644G9S');
    for (let i = 0; i < 20; i++) add('JCG AA', '77ZZ' + i, '1', 'B', '88YY' + i, '2', 'C');
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Retest');
    const lu = await chargerBase(new File([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], 'r.xlsm'));
    atelier.essai();
    const ident = identifier(); const un = ident.filter(x => x.dev === '340AB1')[0];
    const cls = contratsProches(); const dif = differentiel(cls[0].contrat);
    return { lignesLues: lu.lignes, identifie340: un ? { top: (un.cands[0] || {}).nom, c2: (un.cands[0] || {}).cov2 } : null,
      meilleur: cls[0] ? cls[0].contrat : null, tauxCablage: cls[0] ? cls[0].tauxLiaisons : 0,
      second: cls[1] ? cls[1].contrat + ' ' + cls[1].tauxLiaisons + '%' : '—', pieces: dif ? dif.pieces.map(z => z.nom) : [] };
  });
  ok('la base d’essai est lue', gros.lignesLues > 30, gros.lignesLues + ' lignes');
  ok('340AB1 reconnu malgré ses bornes déplacées', !!gros.identifie340 && gros.identifie340.top === '340AB1', gros.identifie340 ? gros.identifie340.top + ' · bornes déplacées ' + gros.identifie340.c2 + ' %' : '—');
  ok('le bon contrat de départ est désigné', gros.meilleur === 'IRO AE', gros.meilleur + ' à ' + gros.tauxCablage + ' % de câblage commun (second : ' + gros.second + ')');
  ok('la barrette manquante est lue dans le différentiel', gros.pieces.includes('667VT21'), gros.pieces.join(', ') || 'aucune');
  ok('la prise de coupure manquante aussi', gros.pieces.includes('408VC1A'), gros.pieces.join(', ') || 'aucune');

  titre('6. COMPLÉTER LE CONTRAT');
  const ecr = await page.evaluate(() => {
    const empreinte = () => app.contrat.liaisons.map(l => [l.de, l.borneDe, l.vers, l.borneVers].join('|')).sort().join('\n');
    const avant = empreinte(), nAvant = app.contrat.liaisons.length;
    const plan = planPieces(contratsProches()[0].contrat); const r = appliquerPieces(plan);
    const apresN = app.contrat.liaisons.length; const a = atelier.audit();
    const noms = new Set(app.dessin.comps.map(c => String(c.name).toUpperCase()));
    const posees = plan.map(x => x.piece).filter(n => noms.has(n));
    const sansSrc = app.contrat.liaisons.filter(l => l.provenance === undefined).length, avecSrc = app.contrat.liaisons.filter(l => l.provenance).length;
    annulerPieces();
    return { nAvant, apresN, ajoutees: r.ajoutees, retirees: r.retirees, pieces: r.pieces, posees, avecSrc, sansSrc, identique: empreinte() === avant, nApresAnnul: app.contrat.liaisons.length, dessin: { ib: a.filsDansBloc, ch: a.blocsChevauches, b: a.blocs } };
  });
  ok('des pièces sont écrites', ecr.ajoutees > 0, ecr.pieces + ' pièce(s) · +' + ecr.ajoutees + ' liaisons · −' + ecr.retirees + ' remplacées (' + ecr.nAvant + ' → ' + ecr.apresN + ')');
  ok('les pièces apparaissent dans le dessin', ecr.posees.length > 0, ecr.posees.join(', ') || 'aucune · ' + ecr.dessin.b + ' blocs');
  ok('le dessin reste sain après écriture', ecr.dessin.ib === 0 && ecr.dessin.ch === 0, 'filsDansBloc=' + ecr.dessin.ib + ' chevauch=' + ecr.dessin.ch);
  ok('chaque ligne créée porte sa provenance', ecr.sansSrc === ecr.nAvant - ecr.retirees, ecr.avecSrc + ' ligne(s) tracée(s)');
  const vide = await page.evaluate(() => { try { const r = appliquerPieces(null); return { ok: true, n: r.ajoutees }; } catch (e) { return { ok: false, msg: String(e && e.message || e) }; } });
  ok('un plan vide ne casse rien', vide.ok, vide.ok ? 'bilan à zéro' : vide.msg);
  ok('« Annuler » rend l’état EXACT d’avant', ecr.identique, ecr.nApresAnnul + ' liaisons, empreinte ' + (ecr.identique ? 'identique' : 'DIFFÉRENTE'));


  titre('7. LES PIÈGES DÉJÀ TOMBÉS (base de retest)');
  const pieges = await page.evaluate(async () => { const r = {}; const L = (de, bDe, vers, bVers) => liaison({ de, borneDe: bDe, vers, borneVers: bVers });
    // (d) « Annuler » emportait les corrections faites à la main
    await chargerBase(baseExemple()); atelier.essai();
    appliquerPieces(planPieces(contratsProches()[0].contrat));
    app.contrat.liaisons.push(L('CTRL-MAIN', '1', '210SP1', '9')); annulerPieces();
    r.mainSurvit = app.contrat.liaisons.some(l => l.de === 'CTRL-MAIN');
    // (e) charger une 2e base laissait l'outil répondre d'après la 1re
    const EN = ['Harness', 'Device1', 'Pin1', 'PN1', 'Description1', 'Cable T/G', 'Cable Tag', 'Route', 'Device2', 'Pin2', 'PN2', 'Description2', 'FWD', 'Cable Length (mm)', 'Appareil', 'Date retest'];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[''], ['x'], [], EN, ['H', 'AAA', '1', '', '', '', '', '1M', 'BBB', '2', '', '', 'SPE', '1200', 'BASE2', '']]), 'Retest');
    await chargerBase(new File([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], 'b2.xlsm'));
    atelier.essai(); const c2 = contratsProches(); r.contrats2 = [...base.parContrat.keys()]; r.vieuxContrat = c2.some(x => x.contrat === 'IRO AE');
    // (f) un contrat identique au mien sortait premier et n'apprenait rien
    await chargerBase(baseExemple()); atelier.essai();
    const moi = app.contrat.liaisons.map(l => ['H', l.de, l.borneDe, '', '', '', '', '1M', l.vers, l.borneVers, '', '', 'SPE', '1200', 'MON-JUMEAU', '']);
    const src = [[''], ['x'], [], EN]; for (let i = base.entete + 1; i < base.lignes.length; i++) if (base.lignes[i]) src.push(base.lignes[i]);
    const wb2 = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb2, XLSX.utils.aoa_to_sheet(src.concat(moi)), 'Retest');
    await chargerBase(new File([XLSX.write(wb2, { bookType: 'xlsx', type: 'array' })], 'jum.xlsm')); atelier.essai();
    const cls = contratsProches(); r.premier = cls[0] ? cls[0].contrat : '—'; r.apport = cls[0] ? cls[0].piecesApportees : 0;
    r.jumeauApport = (cls.find(x => x.contrat === 'MON-JUMEAU') || {}).piecesApportees;
    return r; });
  ok('« Annuler » épargne une correction manuelle', pieges.mainSurvit, pieges.mainSurvit ? 'la correction survit' : 'CORRECTION PERDUE');
  ok('changer de base jette l’ancien index', !pieges.vieuxContrat, 'contrats vus après rechargement : ' + pieges.contrats2.join(', '));
  ok('un contrat jumeau ne prend pas la tête', pieges.premier !== 'MON-JUMEAU', pieges.premier + ' apporte ' + pieges.apport + ' pièce(s) · le jumeau en apporte ' + (pieges.jumeauApport == null ? '—' : pieges.jumeauApport));
  titre('BILAN');
  ok('aucune erreur console', erreurs.length === 0, erreurs.length ? erreurs.slice(0, 3).join(' | ') : 'aucune');
  console.log('\n  ' + (total - echecs) + ' / ' + total + ' contrôles passés' + (echecs ? '  —  ' + echecs + ' ÉCHEC(S)' : '  —  tout est vert'));
  await nav.close(); process.exit(echecs ? 1 : 0);
})();
