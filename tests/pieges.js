/* ===========================================================================
   LES FICHIERS PIÉGÉS (v77) — préparer le gigatest sans voir un vrai fichier
   ---------------------------------------------------------------------------
       node tests/pieges.js [--fichier=…] [--seul=nom] [--vite]

   Le vrai fichier du lecteur ne quitte jamais son PC : on fabrique ici, depuis
   l'exemple de Volta (rien d'un vrai programme), des installations ABÎMÉES
   comme le sont les vraies — cases vides, doublons, caractères bizarres,
   nombres mal écrits, références inconnues, boucles, en-têtes décalés, un
   classeur à plusieurs feuilles, un plan géant — et on lance sur chacune
   l'AUTOTEST de Volta (08-autotest : chaque folio, chaque fiche et ses
   sections, chaque liste « Changer », chaque onglet, chaque document, chaque
   export). Chaque erreur, chaque fiche vide, chaque export manqué fait échouer
   la batterie, avec l'écran et la pile. `--vite` : sans les listes « Changer ».
   ========================================================================= */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), vm = require('vm');
const { fichierDemande } = require('./pilote');
const FICHIER = fichierDemande();
const SEUL = (process.argv.find(a => a.startsWith('--seul=')) || '').slice(7), VITE = process.argv.includes('--vite');

const bac = { console }; vm.createContext(bac);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', '01-modele.js'), 'utf8') + '\nthis.E = contratExemple();', bac);
const EX = [...bac.E].map(l => ({ ...l }));
const ENT = ['Install', 'ECP', 'Harness', 'Device1', 'Pin1', 'PN1', 'Description1', 'Cable T/G', 'Cable Tag', 'Route', 'Device2', 'Pin2', 'PN2', 'Description2', 'FWD', 'Cable length (mm)', 'Appareil'];
const ligneDe = l => ['Essai', '12345', 'H-ESSAI-01', l.de, l.borneDe, l.pnDe, l.descDe || '', l.type, l.cable, l.route, l.vers, l.borneVers, l.pnVers, l.descVers || '', l.plan, l.lg == null ? '5000' : l.lg, 'APP-1'];
const cellule = v => { v = String(v == null ? '' : v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const csv = (L, o) => { o = o || {}; const sep = o.sep || ';', c = v => { v = String(v == null ? '' : v); return new RegExp('[' + sep + '"\\n]').test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  return [...(o.avant || []), (o.entetes || ENT).map(c).join(sep), ...L.map(l => (o.ligne || ligneDe)(l).map(c).join(sep))].join('\n'); };
// un hasard qui se rejoue (une graine)
let graine = 77; const hasard = () => (graine = (graine * 16807) % 2147483647) / 2147483647;
const parmi = xs => xs[Math.floor(hasard() * xs.length)];

const PIEGES = {
  // des cases vides partout (un sur cinq), y compris le repère, la borne, le type
  vides: () => csv(EX.map(l => { const x = { ...l }; ['de', 'borneDe', 'pnDe', 'vers', 'borneVers', 'pnVers', 'cable', 'type', 'route', 'plan', 'lg'].forEach(k => { if (hasard() < .2) x[k] = ''; }); return x; })),
  // chaque liaison deux fois ; un même numéro de câble sur dix lignes ; un repère avec deux références différentes
  doublons: () => csv([...EX, ...EX.slice(0, 80)].map((l, i) => ({ ...l, cable: i % 20 === 0 ? 'W-777' : l.cable, pnDe: l.de === '300XC1' && i % 2 ? 'EN3645W12-35SN' : l.pnDe }))),
  // des caractères qui piègent : casse, espaces, barres, guillemets, balises, accents, émojis, textes immenses
  caracteres: () => csv(EX.map((l, i) => ({ ...l,
    de: i % 7 === 0 ? ' ' + l.de.toLowerCase() + '  ' : l.de, vers: i % 11 === 0 ? l.vers + '/A' : l.vers,
    cable: parmi([l.cable, l.cable + ' ', 'W#' + i, 'W"' + i + '"', '<b>W' + i + '</b>', 'Wé-' + i, 'W⚡' + i, '']),
    borneDe: parmi([l.borneDe, ' ' + l.borneDe, '0' + l.borneDe, l.borneDe + '.0', l.borneDe]),
    pnDe: i % 9 === 0 ? (l.pnDe || '').replace(/(\d)/, ' $1') : l.pnDe,
    descDe: i % 5 === 0 ? 'Description très longue '.repeat(20) + ' ; avec ; des ; points-virgules' : 'Équipement « ' + i + ' » d’essai',
    route: parmi([l.route, l.route.toLowerCase(), ' ' + l.route, '12A', 'R-12', '0']) }))),
  // des nombres mal écrits : longueur à virgule, en m, négative, texte, puissance, vide
  nombres: () => csv(EX.map((l, i) => ({ ...l, lg: parmi(['5,5', '5500', '5.5', '-3', 'abc', '1e3', '', '0', '99999999', ' 2 500 ']) }))),
  // des types et des références que Volta ne connaît pas ; un disjoncteur sans référence, un autre au calibre absurde
  inconnus: () => csv([...EX.map((l, i) => ({ ...l, type: i % 6 === 0 ? parmi(['DR99X', 'AWG 22', 'XX', '?', '22']) : l.type, pnVers: i % 8 === 0 ? 'XYZ-' + i : l.pnVers })),
    { de: '999CB9', borneDe: '1', pnDe: '', vers: '101BT1', borneVers: '9', pnVers: 'MS3470L14-5P', cable: 'W-991', type: 'DR16', route: 'PUISSANCE', plan: '1' },
    { de: '998CB8', borneDe: '2', pnDe: 'MS3320-999', vers: '101BT1', borneVers: '8', pnVers: 'MS3470L14-5P', cable: 'W-992', type: 'DR20', route: 'PUISSANCE', plan: '1' }]),
  // des boucles : un repère vers lui-même (même borne, autre borne), trente bornes d'un même connecteur, une longue chaîne de barrettes
  boucles: () => csv([...EX, { de: '700EQ1', borneDe: '1', vers: '700EQ1', borneVers: '1', type: 'DR22', cable: 'W-700', route: 'SIGNAL', plan: '2' },
    { de: '700EQ1', borneDe: '2', vers: '700EQ1', borneVers: '3', type: 'DR22', cable: 'W-701', route: 'SIGNAL', plan: '2' },
    ...Array.from({ length: 30 }, (_, k) => ({ de: '710EQ1', borneDe: String(k + 1), pnDe: 'EN3645W24-61SN', vers: '711EQ1', borneVers: String(k + 1), pnVers: 'EN3645W24-61PN', type: 'DR24', cable: 'W-8' + String(k).padStart(2, '0'), route: 'SIGNAL', plan: '2' })),
    ...Array.from({ length: 25 }, (_, k) => ({ de: '720VT' + (k + 1), borneDe: '2', vers: '720VT' + (k + 2), borneVers: '1', type: 'DR20', cable: 'W-9' + String(k).padStart(2, '0'), route: 'PUISSANCE', plan: '4' }))]),
  // les en-têtes : trois lignes de titre avant, en minuscules, en désordre, une colonne en double, des colonnes en trop
  entetes: () => { const ordre = [3, 4, 5, 10, 11, 12, 8, 7, 9, 14, 15, 0, 1, 2, 6, 13, 16], E = ordre.map(i => ENT[i]);
    const H = E.map((h, j) => j % 3 === 0 ? '  ' + h.toLowerCase() + ' ' : h).concat(['Device1', 'Remarque', 'Colonne vide']);
    return csv(EX, { avant: ['INSTALLATION ESSAI;;;;', 'Mémo : ne pas diffuser;;', ''], entetes: H, ligne: l => { const r = ligneDe(l); return ordre.map(i => r[i]).concat(['', 'à voir', '']); } }); },
  // un CSV à virgules, des champs entre guillemets qui portent des virgules et des retours à la ligne
  virgules: () => csv(EX.map((l, i) => ({ ...l, descDe: i % 4 === 0 ? 'Ligne 1, suite\nligne 2' : 'simple' })), { sep: ',' }),
  // un plan géant : l'exemple quinze fois, la zone décalée d'un millier, chaque copie ses folios
  geant: () => { const L = []; for (let k = 0; k < 15; k++) EX.forEach(l => { const z = r => String(r).replace(/^(\d+)/, m => String(+m + 1000 * (k + 1))); L.push({ ...l, de: z(l.de), vers: z(l.vers), cable: l.cable ? l.cable + '-' + k : '', plan: String(k * 6 + (+l.plan || 1)) }); }); return csv(L); },
};

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const R = []; const ok = (n, c, d) => R.push((c ? '  ok   ' : '  KO   ') + n.padEnd(56) + (d || ''));
  const noms = Object.keys(PIEGES).concat(['classeur']).filter(n => !SEUL || n === SEUL);
  for (const nom of noms) {
    const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); p.setDefaultTimeout(900000);
    const e = []; p.on('pageerror', x => e.push(x.message));
    await p.goto(FICHIER); await p.waitForTimeout(1200);
    const t0 = Date.now();
    try {
      if (nom === 'classeur') await p.evaluate(async lignes => { // un classeur : une feuille de garde, puis les données, puis une feuille vide
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Sommaire'], ['Ce classeur est un essai']]), 'Garde');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lignes), 'Installation'); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[]]), 'Vide');
        await ouvrirFichier(new File([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], 'essai.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); }, [ENT, ...EX.map(ligneDe)]);
      else await p.evaluate(async t => { await ouvrirFichier(new File([t], 'essai.csv', { type: 'text/csv' })); }, PIEGES[nom]());
    } catch (x) { e.push('ouverture : ' + x.message); }
    await p.waitForTimeout(2500);
    const lu = await p.evaluate(() => ({ n: verite().length, folios: plans().length }));
    if (!lu.n) { ok(`${nom} : le fichier ne s’ouvre pas (0 liaison)`, false, e.slice(0, 2).join(' · ')); console.log(R[R.length - 1]); await p.context().close(); continue; }
    const budget = nom === 'geant' ? 240000 : 180000;
    await p.evaluate(o => lancerAutotest(o), { listes: !VITE, budget, bilan: false, sauter: nom === 'geant' ? ['dossierpdf', 'png'] : [] });
    await p.waitForFunction(() => typeof AUTOTEST !== 'undefined' && !AUTOTEST.enCours && AUTOTEST.resultat, null, { polling: 500 });
    const A = await p.evaluate(() => { const R = AUTOTEST.resultat; return { erreurs: R.erreurs.map(x => x.ou + ' — ' + x.msg + (x.pile ? ' — ' + x.pile : '') + (x.n > 1 ? ' ×' + x.n : '')), vides: R.vides, coupe: R.coupe,
      fiches: Object.entries(R.genres).filter(([g]) => !/folio|onglet|document|export|contrôle|récap/.test(g)).reduce((s, [, x]) => s + x.n, 0), exports: R.exports.length, duree: Math.round(R.duree / 1000) }; });
    const fautes = [...A.erreurs, ...(A.vides ? [A.vides + ' fiche(s) non rendue(s)'] : []), ...e.filter(m => !A.erreurs.some(x => x.includes(m.slice(0, 40)))).map(m => 'page — ' + m)];
    ok(`${nom} : ${lu.n} liaisons, ${lu.folios} folios, ${A.fiches} fiches, ${A.exports} exports`, lu.n > 0 && !fautes.length, `${A.duree} s${A.coupe ? ' (' + A.coupe + ')' : ''}`);
    fautes.slice(0, 8).forEach(f => R.push('         · ' + f.slice(0, 260)));
    console.log(R.slice(-1 - Math.min(8, fautes.length)).join('\n'));
    await p.context().close();
  }
  const ko = R.filter(x => x.startsWith('  KO')).length;
  console.log('\n  ' + (noms.length - ko) + ' / ' + noms.length + (ko ? '  — ' + ko + ' PROBLÈME(S)' : '  — tout tient'));
  await b.close(); process.exit(ko ? 1 : 0);
})();
