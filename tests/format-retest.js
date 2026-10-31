/* ===========================================================================
   LE LECTEUR DU FORMAT RETEST — les seize colonnes, lues par leur nom
   ---------------------------------------------------------------------------
       node tests/format-retest.js

     · les en-têtes sont trouvés même en ligne 4, sous une date et un mémo,
       et le numéro annoncé est celui d'Excel — lignes vides comprises ;
     · chaque colonne va au bon endroit ;
     · l'ordre des colonnes n'a aucune importance, on lit par le nom ;
     · un tableau qui n'est PAS du retest passe encore par le rattrapage ;
     · un retest incomplet ne produit PAS un faux positif ;
     · un classeur à plusieurs feuilles (une par harness) se lit feuille par
       feuille : chaque feuille qui porte les en-têtes, dans son ordre de
       colonnes à elle ; les autres sont ignorées et nommées (`lireFichier`).
   ========================================================================= */
const { chromium } = require('playwright');
const { fichierDemande } = require('./pilote');
const XLSX = require('../lib/xlsx.min.js');
const FICHIER = fichierDemande();
// deux classeurs fabriqués ici : un extrait de base (H-A, une feuille de notes, H-B aux colonnes dans un autre ordre, une
// feuille vide) et un classeur sans retest (un tableau libre, une autre feuille)
const classeur = feuilles => { const wb = XLSX.utils.book_new(); feuilles.forEach(([nom, lignes]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lignes), nom)); return XLSX.write(wb, { bookType: 'xlsx', type: 'base64' }); };
const EN16 = ['Harness', 'Device1', 'Pin1', 'PN1', 'Description1', 'Cable T/G', 'Cable Tag', 'Route', 'Device2', 'Pin2', 'PN2', 'Description2', 'FWD', 'Cable length (mm)', 'Appareil', 'Date retest'];
const ligne16 = (h, d1, p1, d2, p2, tag, tg, fwd) => [h, d1, p1, 'PN-A', '', tg, tag, '1M', d2, p2, 'PN-B', '', fwd, 1200, 'H160', '09/10/2026'];
const B64 = classeur([['H-A', [['Retest du 09/10/2026'], ['Mémo'], [], EN16, ligne16('H-A', '101BT1', '1', '102CB1', '1', 'W-011', 'DR16', 'D1'), ligne16('H-A', '102CB1', '2', '103RL1', 'A1', 'W-012', 'DR20', 'D1')]],
  ['Notes', [['Ce que le technicien a noté'], ['rien à lire ici', 'ni là']]],
  ['H-B', [['Retest'], [], [], ['Device2', 'Pin2', 'Harness', 'Device1', 'Pin1', 'Cable Tag', 'FWD'], ['104LP1', '1', 'H-B', '103RL1', 'A2', 'W-013', 'D2']]],
  ['Feuil4', [[]]]]);
const B64_LIBRE = classeur([['Libre', [['De', 'Borne', 'Vers', 'Borne'], ['A', '1', 'B', '2']]], ['Autre', [['x', 'y'], ['1', '2']]]]);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.setDefaultTimeout(120000);
  const e = []; p.on('pageerror', x => e.push(x.message));
  await p.goto(FICHIER); await p.waitForTimeout(1500);
  const R = await p.evaluate(() => {
    const out = []; const ok = (n, c, d) => out.push((c ? '  ok   ' : '  KO   ') + n.padEnd(52) + (d || ''));
    const EN = 'Harness;Device1;Pin1;PN1;Description;Cable T/G;Cable Tag;Route;Device2;Pin2;PN2;Description;FWD;Cable Length (mm);Appareil;Date retest';
    const L = (d1, p1, pn1, d2, p2, pn2, tag, tg, rt, fwd) => ['H', d1, p1, pn1, '', tg || 'DR24', tag || 'W-1', rt || '1M', d2, p2, pn2, '', fwd || '3', '1200', 'IRO AE', '2024-01-01'].join(';');
    let t = 'date du jour\nmemo en rouge\n\n' + EN + '\n' + L('210SP1', '12', '*704A4', '667VT21', '1', 'ASNE05', 'W-101', 'DR24', '1M', '3') + '\n' + L('667VT21', '2', 'ASNE05', '115CD', '3', 'ABS0864', 'W-102', 'DR22', '2M', '3') + '\n';
    let r = lireTexte(t);
    ok('en-têtes en ligne 4, format reconnu', r.format === 'retest' && r.entete === 4, 'format=' + r.format + ' entête ligne ' + r.entete + ' · ' + r.colonnes + ' colonnes');
    ok('les deux liaisons sont lues', r.liaisons.length === 2, r.liaisons.length + ' liaisons');
    const a = r.liaisons[0] || {};
    ok('Device1/Pin1 → de/borneDe', a.de === '210SP1' && a.borneDe === '12', a.de + '·' + a.borneDe);
    ok('Device2/Pin2 → vers/borneVers', a.vers === '667VT21' && a.borneVers === '1', a.vers + '·' + a.borneVers);
    ok('PN1 et PN2 lus', a.pnDe === '*704A4' && a.pnVers === 'ASNE05', a.pnDe + ' / ' + a.pnVers);
    ok('Cable Tag → n° de fil', a.cable === 'W-101', a.cable);
    ok('Cable T/G → type', a.type === 'DR24', a.type);
    ok('Route lue', a.route === '1M', a.route);
    ok('FWD → le folio', a.plan === '3', a.plan);
    t = 'Pin2;Device2;Cable Tag;Device1;Pin1;FWD;PN1;PN2;Route;Cable T/G\n' + ['7', '409GH2', 'W-999', '210SP1', '12', '5', 'PNA', 'PNB', '3M', 'DR20'].join(';');
    r = lireTexte(t); const m = r.liaisons[0] || {};
    ok('colonnes dans le désordre', r.format === 'retest' && m.de === '210SP1' && m.vers === '409GH2' && m.borneVers === '7' && m.plan === '5', m.de + '·' + m.borneDe + ' → ' + m.vers + '·' + m.borneVers + ' folio ' + m.plan);
    // le vrai format : la ligne d'exemple du lecteur, les seize colonnes, le « repère module », la longueur en mm
    t = 'Harness;Device1;Pin1;PN1;Description1;Cable T/G;Cable Tag;Route;Device2;Pin2;PN2;Description2;FWD;Cable length (mm);APPAREIL;Date du retest\n332A601150-023-D;677VT2 51;B;NSA937cdk,c;;DR22;2564-1830;2MO;677VCH;1;EN36cdcdc;;MEE256A7815003A;3670;test;27/10/2025\n';
    r = lireTexte(t); const v = r.liaisons[0] || {};
    ok('la ligne du lecteur : harness, appareil, date gardés ; 3670 mm → 3,67 m', r.format === 'retest' && v.harness === '332A601150-023-D' && v.appareil === 'test' && v.retest === '27/10/2025' && v.longueur === 3.67 && r.harnais.join() === '332A601150-023-D', JSON.stringify([v.harness, v.appareil, v.retest, v.longueur]));
    ok('« 677VT2 51 » + « B » → repère 677VT2, borne 51B (le module et son contact) ; 677VCH:1 tel quel', v.de === '677VT2' && v.borneDe === '51B' && v.vers === '677VCH' && v.borneVers === '1' && v.pnDe === 'NSA937cdk,c' && v.plan === 'MEE256A7815003A', v.de + ':' + v.borneDe);
    r = lireTexte('Device1;Pin1;Device2;Pin2;Longueur\nA;1;B;2;2,5\nC;1;D;2;180');
    ok('une longueur sans unité : des mètres sous 100 (2,5 m), des mm au-delà (180 → 0,18 m)', r.liaisons[0].longueur === 2.5 && r.liaisons[1].longueur === 0.18, r.liaisons.map(l => l.longueur).join(' '));
    r = lireTexte('De;Borne;Vers;Borne\nA;1;B;2\nC;3;D;4');
    ok('un tableau libre passe encore', r.liaisons.length === 2, 'format=' + r.format + ' · ' + r.liaisons.length + ' liaisons');
    r = lireTexte('A;1;;B;2;;;;;\nC;1;;D;2;;;;;');
    ok('sans en-tête, l’ordre par défaut tient', r.liaisons.length === 2, 'format=' + r.format + ' · ' + r.liaisons.length + ' liaisons');
    r = lireTexte('Device1;Pin1;Device2\nA;1;B');
    ok('installation incomplet → pas de faux positif', r.format !== 'retest', 'format=' + r.format);
    // deux feuilles enchaînées (ou deux extraits collés) : la seconde ligne d'en-tête, dans un autre ordre, prend le relais
    t = 'date\nmemo\n\n' + EN + '\n' + L('101BT1', '1', 'P1', '102CB1', '1', 'P2', 'W-011', 'DR16', '1M', '1').replace(/^H;/, 'H-A;') + '\n\ndate\nmemo\n\nDevice2;Pin2;Harness;Device1;Pin1;Cable Tag;FWD;Cable length (mm)\n' + ['103RL1', 'A1', 'H-B', '102CB1', '2', 'W-012', '2', '3670'].join(';') + '\n';
    r = lireTexte(t); const b = r.liaisons[1] || {};
    ok('deux en-têtes à la suite : 2 liaisons, 2 harness, les colonnes reprises', r.liaisons.length === 2 && r.entetes === 2 && r.harnais.join() === 'H-A,H-B' && b.de === '102CB1' && b.vers === '103RL1' && b.cable === 'W-012' && b.plan === '2' && b.longueur === 3.67, 'entêtes=' + r.entetes + ' · ' + r.harnais.join() + ' · ' + b.de + '→' + b.vers + ' ' + b.longueur + ' m');
    return out;
  });
  // un vrai classeur Excel (fabriqué ici, lu par la page) : feuille par feuille
  const R2 = await p.evaluate(async ([b64, b64Libre]) => {
    const out = []; const ok = (n, c, d) => out.push((c ? '  ok   ' : '  KO   ') + n.padEnd(52) + (d || ''));
    const fichier = (b, nom) => new File([Uint8Array.from(atob(b), c => c.charCodeAt(0))], nom);
    const r = await lireFichier(fichier(b64, 'deux-feuilles.xlsx'));
    ok('un classeur : H-A et H-B lues, Notes et Feuil4 ignorées', r.lues.join() === 'H-A,H-B' && r.ignorees.join() === 'Notes,Feuil4' && r.feuilles.length === 4 && r.feuilles[0].retest === true && r.feuilles[1].retest === false, 'lues ' + r.lues.join() + ' · ignorées ' + r.ignorees.join());
    const c = r.liaisons[2] || {};
    ok('3 liaisons de 2 harness ; H-B relue dans son ordre à elle ; 1200 mm → 1,2 m', r.liaisons.length === 3 && r.harnais.join() === 'H-A,H-B' && r.entetes === 2 && c.de === '103RL1' && c.vers === '104LP1' && c.harness === 'H-B' && c.plan === 'D2' && r.liaisons[0].longueur === 1.2, r.liaisons.length + ' liaisons · ' + c.de + '→' + c.vers + ' (' + c.harness + ')');
    const t = await texteDuFichier(fichier(b64, 'deux-feuilles.xlsx'));
    ok('texteDuFichier rend un texte (les feuilles d’installation), sans les notes', typeof t === 'string' && lireTexte(t).liaisons.length === 3 && !/rien à lire ici/.test(t));
    const l = await lireFichier(fichier(b64Libre, 'libre.xlsx'));
    ok('sans feuille d’installation : la première seule, comme avant (libre)', l.format === 'libre' && l.liaisons.length === 1 && l.lues.join() === 'Libre' && l.ignorees.join() === 'Autre', l.format + ' · lues ' + l.lues.join() + ' · ignorées ' + l.ignorees.join());
    return out;
  }, [B64, B64_LIBRE]);
  R.push(...R2);
  // le retest corrigé (audit v72 : « rien ne rend le livrable ») : les seize colonnes, les cases changées commentées, la
  // feuille Modifications, et Volta le relit à l'identique
  const R3 = await p.evaluate(async () => {
    const out = []; const ok = (n, c, d) => out.push((c ? '  ok   ' : '  KO   ') + n.padEnd(52) + (d || ''));
    // (l'exemple tel que la v73 l'ouvrait : la feuille Modifications n'y compte que les deux écritures à la main)
    atelier.exempleSansCalibreAuto(); await new Promise(r => setTimeout(r, 500));
    changerLiaison(verite().find(x => x.cable === 'W-012'), 'type', 'DR16', 'essai'); changerLiaison(verite().find(x => x.cable === 'W-013'), 'longueur', 3.25, 'essai');
    const R = classeurRetestCorrige(verite(), app.nom), ws = R.wb.Sheets.Installation, rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }), i = rows.findIndex(x => x[6] === 'W-012');
    const com = (ws[XLSX.utils.encode_cell({ r: i, c: 5 })].c || [])[0], M = XLSX.utils.sheet_to_json(R.wb.Sheets.Modifications, { header: 1 }).slice(1).map(x => x.join('|'));
    ok('l’installation corrigée : les seize colonnes (en-têtes en ligne 4), la case changée commentée de ce qu’elle disait', rows[3].slice(0, 16).join('|') === 'Harness|Device1|Pin1|PN1|Description1|Cable T/G|Cable Tag|Route|Device2|Pin2|PN2|Description2|FWD|Cable length (mm)|Appareil|Date retest' && rows[i][5] === 'DR16' && com && com.t === 'Avant : DR20' && rows[i][16] === 'Cable T/G', rows[i].join('|'));
    // (v73 : la feuille dit aussi l'ORIGINE de chaque case — ici deux écritures à la main)
    ok('la feuille Modifications : une ligne par case changée (le type, la longueur en mm) et son origine', M.join(' / ') === '|W-012|102CB1|2|103RL1|A1|Cable T/G|DR20|DR16|à la main / |W-013|103RL1|A2|104LP1|1|Cable length (mm)|vide|3250 mm|à la main' && R.modifiees === 2, M.join(' / '));
    const lu = lireTexte(XLSX.utils.sheet_to_csv(XLSX.read(XLSX.write(R.wb, { type: 'array', bookType: 'xlsx' })).Sheets.Installation, { FS: ';' }));
    ok('Volta le relit : le format installation, les 201 liaisons, les valeurs corrigées', lu.format === 'retest' && lu.liaisons.length === 201 && lu.liaisons.find(x => x.cable === 'W-012').type === 'DR16' && lu.liaisons.find(x => x.cable === 'W-013').longueur === 3.25, lu.format + ' · ' + lu.liaisons.length);
    return out;
  });
  R.push(...R3);
  /* v73 — LE RETEST CORRIGÉ ROUVERT NE SE CORROMPT PLUS (l'ingénieur, n° 2 : « 207 liaisons au lieu de 201, le profil
     perdu ») : « Passer en 15 A et grossir les câbles » (une proposition de Volta), un contact choisi à la main ; on
     enregistre (le bouton du relevé), on rouvre le fichier comme Ctrl+O le rouvre : 201 liaisons, la feuille
     Modifications laissée de côté (et dite), la feuille cachée « Volta » reprise — le profil, le contact —, et le même
     verdict pour 102CB1. */
  const R4 = await p.evaluate(async () => {
    const out = []; const ok = (n, c, d) => out.push((c ? '  ok   ' : '  KO   ') + n.padEnd(52) + (d || ''));
    atelier.exemple(); await new Promise(r => setTimeout(r, 500));
    const avantD = disjonctionDe('102CB1'), avant = { pn: pnDuRepere('102CB1'), calibre: avantD.calibre, verdict: (verdictDeCalibre(avantD) || {}).cle };
    toutRegler('102CB1');
    const l = verite().find(x => x.cable === 'W-013'); changerLiaison(l, 'contactDe', 'EN3155-016M2018', 'un contact choisi à la main');
    const D0 = disjonctionDe('102CB1'), v0 = { pn: pnDuRepere('102CB1'), calibre: D0.calibre, verdict: (verdictDeCalibre(D0) || {}).cle, profil: JSON.stringify(chargeDe('102CB1')) };
    // l'enregistrement : le bouton plein du relevé
    let blob = null; const tel = telecharger; telecharger = b => { blob = b; };
    exporterRetestCorrige(); const releve = !!document.querySelector('#fiche[data-mode="releve"] #rv-enregistrer') && !blob;
    document.getElementById('rv-enregistrer').click(); telecharger = tel; fermerFiche();
    const wb = XLSX.read(new Uint8Array(await blob.arrayBuffer()), { type: 'array' }), M = XLSX.utils.sheet_to_json(wb.Sheets.Modifications, { header: 1 });
    const origines = [...new Set(M.slice(1).filter(r => r[1] !== 'W-013').map(r => r[9]))].join(','), cachee = ((wb.Workbook || {}).Sheets || [])[2] || {};
    ok('le relevé d’abord (rien ne part), puis l’Excel : Installation, Modifications (avec Origine), la feuille « Volta » cachée', releve && wb.SheetNames.join() === 'Installation,Modifications,Volta' && cachee.Hidden === 1 && M[0][9] === 'Origine' && /^proposition de volta acceptée$/i.test(origines), wb.SheetNames.join() + ' · cachée ' + cachee.Hidden + ' · ' + origines);
    // rouvrir comme Ctrl+O : un fichier, le plan neuf
    const f = new File([blob], 'Contrat-d-exemple-retest-corrige.xlsx', { type: blob.type }), lu = await lectureDuFichier(f);
    await ouvrirFichier(f); await new Promise(r => setTimeout(r, 900));
    const D1 = disjonctionDe('102CB1'), v1 = { pn: pnDuRepere('102CB1'), calibre: D1.calibre, verdict: (verdictDeCalibre(D1) || {}).cle, profil: JSON.stringify(chargeDe('102CB1')) };
    const l1 = verite().find(x => x.cable === 'W-013'), toast = document.getElementById('toast').textContent;
    ok('la feuille Modifications est un journal, laissée de côté : 201 liaisons, aucune sans type', lu.journaux.join() === 'Modifications' && !lu.ignorees.includes('Modifications') && verite().length === 201 && !verite().some(x => liaisonComplete(x) && !x.type), lu.journaux.join() + ' · ' + verite().length + ' liaisons');
    ok('la feuille « Volta » reprise : le profil de charge de 102CB1, le contact choisi à la main ; le mot qui passe le dit', v1.profil === v0.profil && v1.profil !== 'null' && l1 && l1.contactDe === 'EN3155-016M2018' && /feuille «\s*volta\s*»/i.test(toast) && /journal/.test(toast), toast.slice(0, 160) + ' · contact ' + (l1 && l1.contactDe) + ' · profil ' + (v1.profil === v0.profil ? 'le même' : v0.profil + ' ≠ ' + v1.profil));
    ok('le même verdict pour 102CB1 : le part number écrit, le calibre, « passe »', v1.pn === v0.pn && v1.calibre === v0.calibre && v1.verdict === v0.verdict && v0.verdict === 'passe' && avant.pn === 'MS3320-15' /* v74 : Volta l'écrit dès l'ouverture — le 10 A touche la courbe */, `avant ${avant.pn} ${avant.calibre} A ${avant.verdict} → écrit ${v0.pn} ${v0.calibre} A ${v0.verdict} → rouvert ${v1.pn} ${v1.calibre} A ${v1.verdict}`);
    return out;
  });
  R.push(...R4);
  R.forEach(x => console.log(x));
  const ko = R.filter(x => x.startsWith('  KO')).length;
  console.log('\n  ' + (R.length - ko) + ' / ' + R.length + (ko ? '  — ' + ko + ' PROBLÈME(S)' : '  — tout tient'));
  console.log('  erreurs :', e.length ? e.slice(0, 3) : 'aucune');
  await b.close(); process.exit(ko ? 1 : 0);
})();
