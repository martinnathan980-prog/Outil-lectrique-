/* ===========================================================================
   LE LECTEUR DU FORMAT RETEST — les seize colonnes, lues par leur nom
   ---------------------------------------------------------------------------
       node tests/format-retest.js

     · les en-têtes sont trouvés même en ligne 4, sous une date et un mémo,
       et le numéro annoncé est celui d'Excel — lignes vides comprises ;
     · chaque colonne va au bon endroit ;
     · l'ordre des colonnes n'a aucune importance, on lit par le nom ;
     · un tableau qui n'est PAS du retest passe encore par le rattrapage ;
     · un retest incomplet ne produit PAS un faux positif.
   ========================================================================= */
const { chromium } = require('playwright');
const { fichierDemande } = require('./pilote');
const FICHIER = fichierDemande();
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
    r = lireTexte('De;Borne;Vers;Borne\nA;1;B;2\nC;3;D;4');
    ok('un tableau libre passe encore', r.liaisons.length === 2, 'format=' + r.format + ' · ' + r.liaisons.length + ' liaisons');
    r = lireTexte('A;1;;B;2;;;;;\nC;1;;D;2;;;;;');
    ok('sans en-tête, l’ordre par défaut tient', r.liaisons.length === 2, 'format=' + r.format + ' · ' + r.liaisons.length + ' liaisons');
    r = lireTexte('Device1;Pin1;Device2\nA;1;B');
    ok('retest incomplet → pas de faux positif', r.format !== 'retest', 'format=' + r.format);
    return out;
  });
  R.forEach(x => console.log(x));
  const ko = R.filter(x => x.startsWith('  KO')).length;
  console.log('\n  ' + (R.length - ko) + ' / ' + R.length + (ko ? '  — ' + ko + ' PROBLÈME(S)' : '  — tout tient'));
  console.log('  erreurs :', e.length ? e.slice(0, 3) : 'aucune');
  await b.close(); process.exit(ko ? 1 : 0);
})();
