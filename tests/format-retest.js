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
    ok('Volta le relit : le format installation, les 209 liaisons, les valeurs corrigées', lu.format === 'retest' && lu.liaisons.length === 209 && lu.liaisons.find(x => x.cable === 'W-012').type === 'DR16' && lu.liaisons.find(x => x.cable === 'W-013').longueur === 3.25, lu.format + ' · ' + lu.liaisons.length);
    return out;
  });
  R.push(...R3);
  /* v73 — LE RETEST CORRIGÉ ROUVERT NE SE CORROMPT PLUS (l'ingénieur, n° 2 : « 207 liaisons au lieu de 201, le profil
     perdu ») : « Passer en 15 A et grossir les câbles » (une proposition de Volta), un contact choisi à la main ; on
     enregistre (le bouton du relevé), on rouvre le fichier comme Ctrl+O le rouvre : 209 liaisons, la feuille
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
    ok('la feuille Modifications est un journal, laissée de côté : 209 liaisons, aucune sans type', lu.journaux.join() === 'Modifications' && !lu.ignorees.includes('Modifications') && verite().length === 209 && !verite().some(x => liaisonComplete(x) && !x.type), lu.journaux.join() + ' · ' + verite().length + ' liaisons');
    ok('la feuille « Volta » reprise : le profil de charge de 102CB1, le contact choisi à la main ; le mot qui passe le dit', v1.profil === v0.profil && v1.profil !== 'null' && l1 && l1.contactDe === 'EN3155-016M2018' && /feuille «\s*volta\s*»/i.test(toast) && /journal/.test(toast), toast.slice(0, 160) + ' · contact ' + (l1 && l1.contactDe) + ' · profil ' + (v1.profil === v0.profil ? 'le même' : v0.profil + ' ≠ ' + v1.profil));
    ok('le même verdict pour 102CB1 : le part number écrit, le calibre, « passe »', v1.pn === v0.pn && v1.calibre === v0.calibre && v1.verdict === v0.verdict && v0.verdict === 'passe' && avant.pn === 'MS3320-10' /* v80 : valide ou pas valide, sans réserve — le 10 A du fichier ne disjoncte pas, VOLTA le garde */, `avant ${avant.pn} ${avant.calibre} A ${avant.verdict} → écrit ${v0.pn} ${v0.calibre} A ${v0.verdict} → rouvert ${v1.pn} ${v1.calibre} A ${v1.verdict}`);
    return out;
  });
  R.push(...R4);
  /* v84 — LIRE EXACTEMENT, RENDRE INTACT (les fichiers piégés, la relecture de 02 et de 08-export) : une case date, une
     description sur deux lignes (Alt+Entrée), un CSV de l'Excel français (Windows-1252), un CSV à virgules dont une
     description porte un « ; », une longueur « 2 500 », des en-têtes en français ; les lignes à un bout vide gardées, les
     lignes vides de tout dites ; puis l'aller-retour : lire → l'installation corrigée → relire rend les MÊMES liaisons et
     les MÊMES cases (« 677VT2 51 » + « B », l'installation et l'ECP, une colonne « Remarque », une longueur illisible). */
  const R5 = await p.evaluate(async () => {
    const out = []; const ok = (n, c, d) => out.push((c ? '  ok   ' : '  KO   ') + n.padEnd(52) + (d || ''));
    const classeur = lignes => { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lignes, { cellDates: false }), 'Installation'); return new File([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], 'essai.xlsx'); };
    let f = classeur([['Device1', 'Pin1', 'Description1', 'Device2', 'Pin2', 'Cable T/G', 'Date retest'], ['101BT1', '1', 'BATTERIE\nPRINCIPALE', '102CB1', '1', 'DR16', new Date(Date.UTC(2025, 9, 27))], ['102CB1', '2', 'CB "10 A"', '103RL1', 'A1', 'DR20', new Date(Date.UTC(2025, 9, 28))]]);
    let r = await lireFichier(f); const a = r.liaisons[0] || {}, b = r.liaisons[1] || {};
    ok('une case date d’Excel se lit jj/mm/aaaa (pas « 45957 »)', a.retest === '27/10/2025' && b.retest === '28/10/2025', a.retest + ' · ' + b.retest);
    ok('une description sur deux lignes, un guillemet : la ligne reste entière', r.liaisons.length === 2 && a.descriptionDe === 'BATTERIE\nPRINCIPALE' && a.vers === '102CB1' && a.type === 'DR16' && b.descriptionDe === 'CB "10 A"' && b.vers === '103RL1', r.liaisons.length + ' liaisons · ' + JSON.stringify(a.descriptionDe) + ' → ' + a.vers + ' ' + a.type);
    { const wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet([['Device1', 'Pin1', 'Device2', 'Pin2', 'FWD'], ['A1X', '1', 'B1X', '1', 'D-7'], ['A1X', '2', 'B1X', '2', ''], ['A1X', '3', 'B1X', '3', '']]);
      ws['!merges'] = [{ s: { r: 1, c: 4 }, e: { r: 3, c: 4 } }]; XLSX.utils.book_append_sheet(wb, ws, 'F');
      const rf = await lireFichier(new File([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], 'fusion.xlsx'));
      ok('un FWD fusionné sur trois lignes : chacune a son folio', rf.liaisons.length === 3 && rf.liaisons.every(l => l.plan === 'D-7'), rf.liaisons.map(l => l.plan || 'vide').join(' · ')); }
    const w1252 = Uint8Array.from([...'Device1;Pin1;Description1;Device2;Pin2\r\n101BT1;1;'].map(c => c.charCodeAt(0)).concat([0xC9, 0x71, 0x75, 0x69, 0x70, 0x2E, 0x20, 0xE0, 0x20, 0x6D, 0xEA, 0x6D, 0x65]).concat([...';102CB1;1\r\n'].map(c => c.charCodeAt(0))));
    r = await lireFichier(new File([w1252], 'francais.csv', { type: 'text/csv' }));
    ok('un CSV de l’Excel français (Windows-1252) : les accents lus', (r.liaisons[0] || {}).descriptionDe === 'Équip. à même', JSON.stringify((r.liaisons[0] || {}).descriptionDe));
    r = lireTexte('Device1,Pin1,Description1,Device2,Pin2,Cable T/G\n101BT1,1,LAMPE; ROUGE,102CB1,1,DR16\n102CB1,2,,103RL1,A1,DR20');
    ok('un CSV à virgules, un « ; » dans une description : les colonnes tiennent', r.liaisons.length === 2 && r.liaisons[0].vers === '102CB1' && r.liaisons[0].descriptionDe === 'LAMPE; ROUGE' && r.liaisons[0].type === 'DR16', r.liaisons.map(l => l.de + '→' + l.vers + ' ' + l.type).join(' · '));
    r = lireTexte('Device1;Pin1;Device2;Pin2;Cable length (mm)\nA1X;1;B1X;2;2 500\nC1X;1;D1X;2;1e3\nE1X;1;F1X;2;3670,5\nG1X;1;H1X;2;2 500\nJ1X;1;K1X;2;2 500\nL1X;1;M1X;2;2.500,5\nN1X;1;P1X;2;"2,500.5"\nQ1X;1;R1X;2;1,2E3');
    ok('mm : « 2 500 » (espace, insécable, fine) → 2,5 m ; « 1e3 », « 1,2E3 » ; « 3670,5 » ; « 2.500,5 » et « 2,500.5 » → 2,5005 m', r.liaisons.map(l => l.longueur).join(' ') === '2.5 1 3.6705 2.5 2.5 2.5005 2.5005 1.2', r.liaisons.map(l => l.longueur).join(' '));
    r = lireTexte('Device1;Pin1;Device2;Pin2;Longueur (m)\nA1X;1;B1X;2;3,67\nC1X;1;D1X;2;12\nE1X;1;F1X;2;2 m\nG1X;1;H1X;2;850 mm');
    ok('m : « 3,67 » → 3,67 m ; « 12 » → 12 m ; « 2 m » ; « 850 mm » écrit dans la case → 0,85 m', r.liaisons.map(l => l.longueur).join(' ') === '3.67 12 2 0.85', r.liaisons.map(l => l.longueur).join(' '));
    r = lireTexte('Équipement 1;Borne 1;Équipement 2;Borne 2;Type de câble;Longueur (mm)\n101BT1;1;102CB1;1;DR16;900');
    ok('des en-têtes en français (« Équipement 1 », « Longueur (mm) ») : lu comme une installation', r.format === 'retest' && r.liaisons.length === 1 && r.liaisons[0].type === 'DR16' && r.liaisons[0].longueur === 0.9, r.format + ' · ' + JSON.stringify(r.liaisons[0] || {}));
    r = lireTexte('Device1;Pin1;Device2;Pin2;Cable Tag;Harness\n101BT1;1;;;W-1;H\n;;102CB1;2;W-2;H\n;;;;;H\n;;;;;Total : 3\n103RL1;A1;104LP1;1;W-3;H');
    ok('un bout vide : la liaison gardée (incomplète) ; une ligne sans rien : dite', r.liaisons.length === 1 && r.toutes.length === 3 && r.incompletes === 2 && r.laissees.join() === '4,5', `${r.liaisons.length} entière · ${r.toutes.length} gardées · ${r.incompletes} incomplètes · lignes laissées ${r.laissees.join()}`);
    // l'aller-retour
    const T = 'Install;ECP;Harness;Device1;Pin1;PN1;Cable T/G;Cable Tag;Device2;Pin2;Remarque;Cable length (mm);Date retest\n'
      + 'Antenne;12345;H-1;677VT2 51;B;NSA937;DR22;2564-1830;677VCH;1;à voir;3670,5;27/10/2025\n'
      + 'Antenne;12345;H-1;101BT1;1;MS3470;DR16;W-1;102CB1;1;;abc;\n'
      + 'Antenne;12345;H-1;102CB1;2;;DR20;W-2;;;bout manquant;;\n';
    const r1 = lireTexte(T), C = classeurRetestCorrige(r1.toutes, 'essai'), buf = XLSX.write(C.wb, { type: 'array', bookType: 'xlsx' });
    const rows = XLSX.utils.sheet_to_json(XLSX.read(buf, { type: 'array' }).Sheets.Installation, { header: 1, defval: '' }), h = rows[3], L1 = rows[4] || [], L2 = rows[5] || [];
    const cell = (row, nom) => row[h.indexOf(nom)];
    ok('l’installation corrigée rend Install, ECP, « Remarque », et la ligne incomplète', h[0] === 'Install' && h[1] === 'ECP' && h.includes('Remarque') && rows.length === 7 && cell(L1, 'Install') === 'Antenne' && String(cell(L1, 'ECP')) === '12345' && cell(L1, 'Remarque') === 'à voir', h.join('|') + ' · ' + (rows.length - 4) + ' lignes');
    ok('les cases telles que le fichier les écrivait : « 677VT2 51 » + « B », 3670,5 mm, « abc »', cell(L1, 'Device1') === '677VT2 51' && cell(L1, 'Pin1') === 'B' && +cell(L1, 'Cable length (mm)') === 3670.5 && cell(L2, 'Cable length (mm)') === 'abc', [cell(L1, 'Device1'), cell(L1, 'Pin1'), cell(L1, 'Cable length (mm)'), cell(L2, 'Cable length (mm)')].join(' · '));
    const r2 = await lireFichier(new File([buf], 'essai-corrige.xlsx')), sans = l => JSON.stringify(l, Object.keys(l).sort());
    const memes = r2.toutes.length === r1.toutes.length && r2.toutes.every((l, i) => sans(l) === sans(r1.toutes[i]));
    ok('lire → exporter → relire : les mêmes liaisons, champ pour champ', memes, memes ? r2.toutes.length + ' liaisons identiques' : r1.toutes.map(sans).join(' / ') + ' ≠ ' + r2.toutes.map(sans).join(' / '));
    const C2 = classeurRetestCorrige(r2.toutes, 'essai'), rows2 = XLSX.utils.sheet_to_json(XLSX.read(XLSX.write(C2.wb, { type: 'array', bookType: 'xlsx' }), { type: 'array' }).Sheets.Installation, { header: 1, defval: '' });
    ok('et la seconde installation corrigée a les mêmes cases que la première', JSON.stringify(rows2.slice(3)) === JSON.stringify(rows.slice(3)), rows2[3].join('|'));
    return out;
  });
  R.push(...R5);
  /* v84 — LE GROS FICHIER LU PAR LE WORKER, EXACTEMENT COMME UN PETIT : un même classeur (titre, en-têtes en ligne 4, une
     date, un FWD fusionné, une description sur deux lignes, « 677VT2 51 » + « B », Install, ECP, « Remarque », une ligne à un
     bout vide, une ligne vide de tout, une feuille de notes) et l'installation corrigée de l'exemple (son journal, sa feuille
     « Volta ») lus par les deux chemins — `lireFichier` (SheetJS) et `lireLaBase(…, { plan })` (la lecture au fil de l'eau
     du Worker) — rendent les mêmes liaisons, champ pour champ ; puis un vrai CSV de plus de 1,5 Mo ouvert comme Ctrl+O
     l'ouvre passe par le Worker et donne le même plan que sa lecture directe. */
  const R6 = await p.evaluate(async () => {
    const out = []; const ok = (n, c, d) => out.push((c ? '  ok   ' : '  KO   ') + n.padEnd(52) + (d || ''));
    const cle = l => JSON.stringify(Object.keys(l).filter(k => l[k] !== undefined).sort().map(k => [k, l[k]]));
    const comparer = (A, B) => { const ea = (A.toutes || []).map(cle), eb = (B && B.toutes || []).map(cle), i = ea.findIndex((x, k) => x !== eb[k]);
      return { memes: ea.length === eb.length && i < 0 && JSON.stringify([A.incompletes, A.laissees, A.entete, A.entetes, A.ignorees, A.journaux, !!A.volta]) === JSON.stringify([B.incompletes, B.laissees, B.entete, B.entetes, B.ignorees, B.journaux, !!B.volta]),
        dit: ea.length + ' / ' + eb.length + ' liaisons' + (i >= 0 ? ' · écart au rang ' + i + ' : ' + ea[i] + ' ≠ ' + eb[i] : '') + ' · ' + JSON.stringify([A.incompletes, A.laissees, A.entete, A.ignorees, A.journaux]) + ' / ' + JSON.stringify([B.incompletes, B.laissees, B.entete, B.ignorees, B.journaux]) }; };
    const wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet([['Installation d’essai'], ['Mémo'], [], ['Install', 'ECP', 'Harness', 'Device1', 'Pin1', 'Description1', 'Cable T/G', 'Device2', 'Pin2', 'FWD', 'Cable length (mm)', 'Date retest', 'Remarque'],
      ['Antenne', 12345, 'H-1', '677VT2 51', 'B', 'BARRETTE\n« fine »', 'DR22', '677VCH', 1, 'D-7', 3670.5, new Date(Date.UTC(2025, 9, 27)), 'à voir'],
      ['Antenne', 12345, 'H-1', '101BT1', 1, 'BATTERIE "12 V"', 'DR16', '102CB1', 1, '', 1200, new Date(Date.UTC(2025, 9, 28)), ''],
      ['Antenne', 12345, 'H-1', '102CB1', 2, '', 'DR20', '', '', '', 'abc', '', 'bout manquant'], [], ['', '', 'Total : 3'], ['Antenne', 12345, 'H-1', '103RL1', 'A2', '', 'DR22', '104LP1', 1, 'D-8', '2 500', '', '']], { cellDates: false });
    ws['!merges'] = [{ s: { r: 4, c: 9 }, e: { r: 6, c: 9 } }]; XLSX.utils.book_append_sheet(wb, ws, 'Installation'); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Notes'], ['rien à lire']]), 'Notes');
    const f1 = new File([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], 'essai.xlsx');
    let A = await lireFichier(f1), B = (await lireLaBase(f1, null, { plan: true })).plan, c = comparer(A, B);
    ok('un classeur abîmé : le Worker lit comme la page (liaisons, incomplètes, lignes vides de tout)', c.memes && A.toutes.length === 4 && A.toutes[1].plan === 'D-7', c.dit);
    atelier.exemple(); await new Promise(r => setTimeout(r, 300)); changerLiaison(verite().find(x => x.cable === 'W-012'), 'type', 'DR16', 'essai');
    const C = classeurRetestCorrige(verite(), 'essai', { ouvert: true, volta: voltaDuPlan() }), f2 = new File([XLSX.write(C.wb, { type: 'array', bookType: 'xlsx' })], 'corrige.xlsx');
    A = await lireFichier(f2); const lu = await lectureDuFichier(f2); A.journaux = lu.journaux; A.volta = lu.volta; B = (await lireLaBase(f2, null, { plan: true })).plan; c = comparer({ ...A, journaux: A.journaux }, B);
    ok('l’installation corrigée (journal, feuille « Volta ») : les deux lectures pareilles', c.memes && A.toutes.length === 209 && !!B.volta, c.dit);
    // un vrai gros fichier : un CSV de plus de 1,5 Mo, ouvert comme Ctrl+O l'ouvre (le Worker), contre sa lecture directe
    const E = contratExemple(), ent = 'Harness;Device1;Pin1;PN1;Description1;Cable T/G;Cable Tag;Route;Device2;Pin2;PN2;FWD;Cable length (mm);Remarque', lignes = [ent];
    for (let k = 0; k < 50; k++) E.forEach((l, i) => { const z = r => String(r).replace(/^(\d+)/, m => String(+m + 1000 * (k + 1)));
      lignes.push(['H-GROS', i % 97 === 0 ? '' : z(l.de), l.borneDe, l.pnDe, 'Équipement d’essai ' + k + '-' + i + ', une description longue comme celles du vrai fichier', l.type, (l.cable || '') + '-' + k, l.route, z(l.vers), l.borneVers, l.pnVers, String(k * 6 + (+l.plan || 1)), i % 13 === 0 ? '2 500' : '4000', i % 7 === 0 ? 'repère « ' + i + ' » ; à voir' : ''].map(v => /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v).join(';')); });
    const texte = lignes.join('\r\n'), gros = new File([texte], 'gros.csv', { type: 'text/csv' }), direct = lireTexte(texte);
    await ouvrirFichier(gros); const t0 = Date.now(); while ((app.nom !== 'gros.csv' || BASE.lecture) && Date.now() - t0 < 120000) await new Promise(r => setTimeout(r, 200));
    const V = verite(), D = direct.toutes.map(liaison), iv = V.findIndex((l, i) => !D[i] || cle(l) !== cle(D[i]));
    ok(`un CSV de ${Math.round(gros.size / 1e5) / 10} Mo ouvert : par le Worker, le même plan que lu directement`, gros.size > 1.5e6 && app.nom === 'gros.csv' && V.length === D.length && iv < 0 && V.some(l => l.autres) && V.some(l => !liaisonComplete(l)),
      V.length + ' / ' + D.length + ' liaisons' + (iv >= 0 ? ' · écart au rang ' + iv + ' : ' + cle(V[iv]) + ' ≠ ' + (D[iv] ? cle(D[iv]) : 'absente') : ' · ' + V.filter(l => !liaisonComplete(l)).length + ' incomplètes, ' + V.filter(l => l.autres).length + ' « Remarque »'));
    return out;
  });
  R.push(...R6);
  R.forEach(x => console.log(x));
  const ko = R.filter(x => x.startsWith('  KO')).length;
  console.log('\n  ' + (R.length - ko) + ' / ' + R.length + (ko ? '  — ' + ko + ' PROBLÈME(S)' : '  — tout tient'));
  console.log('  erreurs :', e.length ? e.slice(0, 3) : 'aucune');
  await b.close(); process.exit(ko ? 1 : 0);
})();
