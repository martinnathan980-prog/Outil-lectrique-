/* ===========================================================================
   LES NORMES : IMPORTER, CLASSER, MODIFIER — contrôles sans navigateur, puis à la vraie souris.
       NODE_PATH=/opt/node22/lib/node_modules node tests/normes.js [--fichier=chemin] [--sans-navigateur]

   Sans navigateur (le moteur, 09) : les cellules (guillemets, séparateurs), les nombres d'atelier (« −55 »,
   « 10 000 ft »), les blocs d'un texte (titres libres, en-têtes avec unité, l'hésitation entre deux tables, une feuille
   Excel en tabulations), la clé de fusion et la comparaison (nouvelles, remplacées, identiques), la couche des apports
   (remplacer, ajouter, masquer, revenir), les colonnes documentées, le gabarit de chacune des vingt tables qui se
   relit comme sa table, et l'aller-retour export → import de chaque table embarquée.
   Avec navigateur (la page, 08 octies) : la page par domaines, une table dépliée, filtrée, triée ; une ligne modifiée
   (double-clic, Entrée), reprise par le moteur, défaite (Ctrl+Z), gardée après rechargement ; une ligne ajoutée,
   une ligne masquée puis rétablie ; l'import d'un CSV collé et d'un Excel généré, prévisualisés puis adoptés ; l'export
   d'une table et d'un gabarit ; la recherche dans toutes les tables ; le retour à l'embarquée ; le téléphone.
   Rend 1 au premier échec.
   =========================================================================== */
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.join(__dirname, '..', 'src'), NORMES = path.join(__dirname, '..', 'normes');
const code = ['01-modele.js', '02-lecture.js', '09-barrettes.js', '09-disjoncteurs.js', '09-raccords.js', '09-chute.js', '09-references.js'].map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
const normes = fs.readdirSync(NORMES).filter(f => /\.csv$/i.test(f)).sort().map(f => fs.readFileSync(path.join(NORMES, f), 'utf8')).join('\n\n');
const bac = { console }; vm.createContext(bac);
vm.runInContext('const NORME_EMBARQUEE = ' + JSON.stringify(normes) + ';\n' + code + '\nthis.X = { cellulesDeNorme, NUMERO, decouperTables, reconnaitreEntete, colonnesDEntete, lireBloc, lireNorme, normeEmbarquee, normeLue, fusionnerNormes, CLE_FUSION, cleDeLigne, comparerTable, comparerNormes, apportsVides, normeDesApports, normeAvecApports, memeLigne, colonnesDeTable, csvDeTable, gabaritCsv, brutDe, TABLES_NORME, TITRES_NORME, LIBELLES_NORME, SENS_NORME, OBLIGATOIRES_NORME, EXEMPLES_NORME, COLONNES_NORME, ENTREE_NORME, filDeNorme, NORMA };', bac);
const X = bac.X;
let total = 0, echecs = 0;
const ok = (nom, cond, mesure) => { total++; if (!cond) echecs++; console.log('  ' + (cond ? 'OK    ' : 'ÉCHEC ') + nom + (mesure ? '   — ' + mesure : '')); };

console.log('\n1. LES CELLULES ET LES NOMBRES D’ATELIER');
ok('point-virgule, virgule, tabulation : le premier présent hors guillemets', X.cellulesDeNorme('a;b;c').join('|') === 'a|b|c' && X.cellulesDeNorme('a,b,c').join('|') === 'a|b|c' && X.cellulesDeNorme('a\tb;c').join('|') === 'a|b;c');
ok('un champ entre guillemets garde son séparateur, "" est un guillemet', X.cellulesDeNorme('"a;b";c;"d ""e"" f"').join('|') === 'a;b|c|d "e" f' && X.cellulesDeNorme('8" x;y').join('|') === '8" x|y');
ok('« −55 » (moins typographique), « 10 000 ft », « 7,5A », « 1.5 », « 5 mm »', X.NUMERO('−55 °C') === -55 && X.NUMERO('10 000 ft') === 10000 && X.NUMERO('7,5A') === 7.5 && X.NUMERO('1.5') === 1.5 && X.NUMERO('5 mm') === 5 && X.NUMERO('') === null && X.NUMERO('abc') === null);

console.log('\n2. LES BLOCS D’UN TEXTE : TITRES, EN-TÊTES, HÉSITATION, FEUILLE EXCEL');
const T1 = 'Ma norme de fils\nType;Jauge (AWG);Section (mm²);Résistance 20;Intensité (A)\nDR;24;0,24;85;3,5\nDR;22;0,38;55;5\n\nTailles — ce que reçoit un contact\nFamille;Taille;Jauge min;Jauge max\nE0599;20;24;20\n';
const B1 = X.decouperTables(T1);
ok('deux blocs : le titre libre qui précède, la ligne d’en-tête, les lignes', B1.length === 2 && B1[0].titre === 'Ma norme de fils' && B1[0].table === 'fils' && B1[0].lignes.length === 2 && B1[1].titre === 'Tailles — ce que reçoit un contact' && B1[1].table === 'tailles' && B1[1].lignes.length === 1, B1.map(b => b.table + ':' + b.lignes.length).join(' '));
ok('un en-tête avec l’unité entre parenthèses se lit : « Jauge (AWG) », « Section (mm²) », « Intensité (A) »', B1[0].col.jauge === 1 && B1[0].col.section === 2 && B1[0].col.intensite === 4 && B1[0].inconnues.length === 0, JSON.stringify(B1[0].col));
ok('une table de tailles n’hésite pas (elle reconnaît plus de colonnes que la table de familles)', B1[1].hesite === false && B1[1].candidats.map(c => c.nom).join(',') === 'tailles,familles', B1[1].candidats.map(c => c.nom + ':' + c.n).join(' '));
const B2 = X.decouperTables('Feuille Fils\nType\tJauge\tSection\tRésistance\tIntensité\nDR\t24\t0.24\t85\t3.5\n\t\t\t\t\nFeuille Reseau\nTension\tChute max\n28\t1\n');
ok('les feuilles d’un Excel : en tabulations, le nom de la feuille en titre, une ligne de tabulations vides finit la table, le point décimal', B2.length === 2 && B2[0].titre === 'Feuille Fils' && B2[1].table === 'reseau' && X.lireBloc(B2[0]).lues[0].section === 0.24, B2.map(b => b.titre + '/' + b.table).join(' ; '));
const B3 = X.decouperTables('Type;Jauge;Intensité\nDR;24;3,5\nUn titre au milieu\nDR;22;5\n');
ok('un titre libre (une seule cellule) ferme la table ; la ligne qui suit n’est pas lue', B3.length === 1 && B3[0].lignes.length === 1);
const L1 = X.lireBloc(B1[0]);
ok('lire un bloc : chaque entrée garde ses cellules telles quelles (brut), une ligne incomplète est rejetée', L1.lues.length === 2 && L1.lues[0].brut.jauge === '24' && L1.lues[0].resistance20 === 85 && X.lireBloc({ lignes: [['', '', '', '', ''], ['DR', 'x', '', '', '']], col: B1[0].col }, 'fils').rejets.length === 1);
ok('un bloc se relit comme une autre table si on le demande (Tailles lu comme Familles)', X.lireBloc(B1[1], 'familles', X.colonnesDEntete('familles', B1[1].entete).col).lues[0].famille === 'E0599');
const N1 = X.lireNorme(T1);
ok('lireNorme : les mêmes tables qu’avant (N.tables, les entrées), avec brut en plus', N1.tables === 2 && N1.fils.length === 2 && N1.tailles.length === 1 && N1.fils[1].brut.type === 'DR');
const NE = X.normeEmbarquee();
ok('la norme embarquée se lit comme avant : 302 modules, 428 contacts, 14 fils, 55 déclassements, 4 réseaux, 223 câbles, 39 manchons', NE.modules.length === 302 && NE.contacts.length === 428 && NE.fils.length === 14 && NE.declassements.length === 55 && NE.reseau.length === 4 && NE.cables.length === 223 && NE.manchons.length === 39 && NE.modules.every(m => m.brut), `${NE.modules.length} modules · ${NE.contacts.length} contacts · ${NE.cables.length} câbles`);

console.log('\n3. LA CLÉ DE FUSION ET LA COMPARAISON');
ok('chaque table a sa clé, et fusionnerNormes s’en sert', X.TABLES_NORME.every(t => typeof X.CLE_FUSION[t] === 'function') && X.cleDeLigne('fils', NE.fils[0]) === '*/26' && X.cleDeLigne('contacts', NE.contacts[0]).split('/').length === 6);
// la ligne 26 AWG de l'EN 2853 telle quelle, la ligne 24 AWG avec une autre intensité, une ligne DR 22 que l'embarquée n'a pas
const N2 = X.lireNorme(X.csvDeTable('fils', [NE.fils[0], { brut: { ...NE.fils[1].brut, intensite: '9' } }, { brut: { type: 'DR', jauge: '22', section: '0,38', resistance20: '55', intensite: '5' } }]));
const C2 = X.comparerTable('fils', NE.fils, N2.fils);
ok('comparer à l’embarquée : une ligne de même clé et de même contenu est identique, une autre remplace (avant → après), une nouvelle s’ajoute', C2.identiques.length === 1 && C2.remplacees.length === 1 && C2.nouvelles.length === 1 && C2.remplacees[0].avant.intensite !== 9 && C2.remplacees[0].apres.intensite === 9 && C2.parLigne.get(N2.fils[2]) === 'ajoutée', `${C2.identiques.length} identique · ${C2.remplacees.length} remplacée · ${C2.nouvelles.length} nouvelle`);
ok('« 7,5 » et « 7.5 » disent la même chose : la comparaison lit ce que le moteur lit', X.memeLigne(X.lireNorme('Tension;Chute max\n28;1,0\n').reseau[0], X.lireNorme('Tension;Chute max\n28;1.0\n').reseau[0]));
ok('comparerNormes : une table par table lue', Object.keys(X.comparerNormes(NE, N2)).join(',') === 'fils');

console.log('\n4. LA COUCHE DES APPORTS : REMPLACER, AJOUTER, MASQUER, REVENIR');
const A = X.apportsVides(); A.tables.fils = { lignes: [{ brut: { type: '', jauge: '24', section: '0,24', resistance20: '85', intensite: '9' }, source: 'essai.csv', t: 1 }, { brut: { type: 'ZZ', jauge: '20', intensite: '7' }, source: 'main', t: 2 }], supprimees: ['*/26'] };
const NA = X.normeAvecApports(NE, A);
ok('la norme active : l’embarquée, moins la ligne masquée (26), plus la ligne qui remplace (24 → 9 A) et la ligne ajoutée (ZZ 20)', !NA.fils.some(f => f.jauge === 26) && X.filDeNorme(NA, 'DR24', 24).intensite === 9 && X.filDeNorme(NA, 'ZZ20', 20).intensite === 7 && NA.fils.length === NE.fils.length && NA.modules.length === 302, NA.fils.length + ' fils');
ok('chaque apport sait d’où il vient (source) ; l’embarqué non', NA.fils.find(f => f.jauge === 24).source === 'essai.csv' && NA.fils.find(f => f.type === 'ZZ').source === 'main' && NA.fils.find(f => f.jauge === 22).source == null);
ok('sans apports, la norme active est l’embarquée telle quelle', X.normeAvecApports(NE, X.apportsVides()).fils.length === NE.fils.length && X.normeAvecApports(NE, null).contacts.length === 428);

console.log('\n5. LES COLONNES DOCUMENTÉES, LES GABARITS, L’ALLER-RETOUR DE CHAQUE TABLE');
ok('chaque table a un titre, ses colonnes avec libellé, sens, alias, obligatoire', X.TABLES_NORME.every(t => X.TITRES_NORME[t] && X.colonnesDeTable(t).length >= 4 && X.colonnesDeTable(t).every(c => c.libelle && c.sens && Array.isArray(c.alias) && typeof c.obligatoire === 'boolean')), X.TABLES_NORME.map(t => t + ':' + X.colonnesDeTable(t).length).join(' '));
ok('le libellé de chaque colonne est l’un des alias de son champ (un gabarit se relit tel quel)', X.TABLES_NORME.every(t => X.COLONNES_NORME[t].every(([champ, alias]) => !X.LIBELLES_NORME[t][champ] || alias.includes(X.NORMA(X.LIBELLES_NORME[t][champ])))));
const gabarits = X.TABLES_NORME.map(t => { const g = X.gabaritCsv(t), B = X.decouperTables(g), N = X.lireNorme(g); return { t, lu: B.length === 1 ? B[0].table : '?', n: B.length === 1 ? (N[B[0].table] || []).length : 0, hesite: B.length === 1 ? B[0].hesite : true }; });
ok('le gabarit de chacune des vingt-trois tables se relit comme sa table, sans hésiter, avec sa ligne d’exemple', gabarits.every(g => g.lu === g.t && g.n === 1 && !g.hesite), gabarits.filter(g => !(g.lu === g.t && g.n === 1 && !g.hesite)).map(g => g.t + '→' + g.lu + ':' + g.n + (g.hesite ? ' hésite' : '')).join(' ') || 'tous');
const allers = X.TABLES_NORME.map(t => { const csv = X.csvDeTable(t, NE[t], 'Aller-retour ' + t), N = X.lireNorme(csv); const cles = xs => xs.map(x => X.cleDeLigne(t, x)).sort().join('\n');
  return { t, n0: NE[t].length, n1: (N[t] || []).length, memes: cles(NE[t]) === cles(N[t] || []), contenu: NE[t].every((x, i) => (N[t] || []).some(y => X.memeLigne(x, y))) }; });
ok('chaque table embarquée exportée en CSV se relit à l’identique (mêmes lignes, mêmes clés, même contenu lu)', allers.every(a => a.n0 === a.n1 && a.memes && a.contenu), allers.filter(a => !(a.n0 === a.n1 && a.memes && a.contenu)).map(a => a.t + ' ' + a.n0 + '→' + a.n1 + (a.memes ? '' : ' clés≠') + (a.contenu ? '' : ' contenu≠')).join(' ; ') || X.TABLES_NORME.length + ' tables');
ok('une cellule avec un point-virgule s’exporte entre guillemets et se relit', (() => { const csv = X.csvDeTable('fils', [{ brut: { type: 'DR', jauge: '24', intensite: '3', note: 'a;b "c"' } }]); return /"a;b ""c"""/.test(csv) && X.lireNorme(csv).fils[0].note === 'a;b "c"'; })());
ok('brutDe sans brut : ce que le moteur a lu, remis en mots', X.brutDe('reseau', { tension: 28, nature: 'continu', chuteMax: 1.5, chuteInter: null, chutePct: null, note: '' }).chuteMax === '1,5');

console.log(`\n  ${total - echecs} / ${total} contrôles passés sans navigateur${echecs ? '  —  ' + echecs + ' ÉCHEC(S)' : ''}`);
if (process.argv.includes('--sans-navigateur')) process.exit(echecs ? 1 : 0);

/* ---- avec navigateur ---------------------------------------------------- */
const { chromium } = require('playwright');
const P = require('./pilote');
const FICHIER = P.fichierDemande();
const XLSX = require(path.join(__dirname, '..', 'lib', 'xlsx.min.js'));
const SCRATCH = fs.mkdtempSync(path.join(require('os').tmpdir(), 'normes-'));
// un Excel d'essai : deux feuilles, l'une avec deux tables à la suite, aux en-têtes d'un document (unités, Excel)
function excelEssai() { const wb = XLSX.utils.book_new();
  const f1 = [['Mes fils'], ['Type', 'Jauge (AWG)', 'Section (mm²)', 'Résistance 20', 'Intensité (A)'], ['XL', 24, 0.24, 85, 4], ['XL', 22, 0.38, 55, 6], [], ['Chute admise'], ['Tension', 'Chute max', 'Note'], [28, 1.2, 'essai xlsx']];
  const f2 = [['Collier', 'Type', 'Dmax'], ['ESSAI-COL-1', 'band-it', 12], ['ESSAI-COL-2', 'band-it', 30]];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(f1), 'Fils et réseau'); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(f2), 'Colliers');
  const f = path.join(SCRATCH, 'essai.xlsx'); fs.writeFileSync(f, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })); return f; }

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await nav.newPage({ viewport: { width: 1600, height: 950 }, acceptDownloads: true }); page.setDefaultTimeout(120000);
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  let ko = 0; const okp = (c, nom, detail) => { if (!c) ko++; console.log('  ' + (c ? 'ok ' : 'KO ') + ' ' + nom + (detail ? '   ' + detail : '')); };
  const q = (sel, fn) => page.evaluate(([sel, fn]) => { const xs = [...document.querySelectorAll('#fiche ' + sel)]; return new Function('xs', 'return (' + fn + ')(xs)')(xs); }, [sel, fn || 'xs => xs.length']);
  const texte = sel => page.evaluate(sel => { const e = document.querySelector('#fiche ' + sel); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
  const telechargement = async (action) => { const [d] = await Promise.all([page.waitForEvent('download'), action()]); const f = path.join(SCRATCH, d.suggestedFilename()); await d.saveAs(f); return { nom: d.suggestedFilename(), texte: fs.readFileSync(f, 'utf8') }; };
  await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined');
  await page.evaluate(() => { localStorage.removeItem('atelier.normes.v2'); });

  console.log('\nla page des normes');
  await page.evaluate(() => ficheNormes()); await page.waitForTimeout(500);
  okp(await page.evaluate(() => app.fiche && app.fiche.mode === 'normes') && await q('.nm-dom') === 8 && await q('.nm-table[data-vue]') === 26 && await q('.nm-table.nm-contrats') === 1, 'huit domaines, vingt-six vues des vingt-trois tables (modules, tailles et familles coupées entre barrettes et connecteurs), la carte des contrats déjà faits', (await q('.nm-dom')) + ' domaines · ' + (await q('.nm-table[data-vue]')) + ' vues');
  okp(/23 tables/.test(await texte('.nm-etat')) && /rien d’importé/.test(await texte('.nm-etat')), 'l’état : vingt-trois tables, rien d’importé ni de modifié', await texte('.nm-etat'));
  okp(await page.evaluate(() => { const f = document.getElementById('fiche'); return f.offsetWidth > 800 && !f.hidden; }), 'la page est plus large que la bible (les tables ont jusqu’à seize colonnes)', await page.evaluate(() => document.getElementById('fiche').offsetWidth + ' px'));
  await page.click('#fiche .nm-table[data-vue="contacts"] .nm-t-tete'); await page.waitForTimeout(400);
  okp(await q('.nm-table[data-vue="contacts"] .nm-doc dt') === 4 && /juge la jauge/.test(await texte('.nm-table[data-vue="contacts"] .nm-doc')) && /Changer/.test(await texte('.nm-table[data-vue="contacts"] .nm-doc')), 'la table dépliée dit ce qu’elle sert, qui la lit, comment une ligne se choisit (automatique, et « Changer »)');
  okp(await q('.nm-table[data-vue="contacts"] tbody tr[data-cle]') === 120 && /308 lignes restantes/.test(await texte('.nm-table[data-vue="contacts"] .nm-plus')), 'les 120 premières lignes, et les 308 restantes sur demande');
  await page.click('#fiche .nm-table[data-vue="contacts"] .nm-voir-cols'); await page.waitForTimeout(300);
  okp(await q('.nm-table[data-vue="contacts"] .nm-cols dt') === 8 && /obligatoire/.test(await texte('.nm-table[data-vue="contacts"] .nm-note')), 'les colonnes expliquées : huit, les obligatoires marquées');
  await page.fill('#fiche .nm-table[data-vue="contacts"] input[data-filtre]', 'EN3155-003F2020'); await page.waitForTimeout(400);
  const nFiltre = await q('.nm-table[data-vue="contacts"] tbody tr[data-cle]');
  okp(nFiltre > 0 && nFiltre < 20 && await q('.nm-table[data-vue="contacts"] tbody tr[data-cle]', 'xs => xs.every(tr => /EN3155-003F2020/.test(tr.textContent))'), 'le filtre d’une table', nFiltre + ' lignes');
  await page.fill('#fiche .nm-table[data-vue="contacts"] input[data-filtre]', ''); await page.waitForTimeout(400);
  await page.click('#fiche .nm-table[data-vue="contacts"] th[data-tri="jauge"]'); await page.waitForTimeout(400);
  okp(await q('.nm-table[data-vue="contacts"] th[data-tri="jauge"]', 'xs => xs[0].getAttribute("aria-sort")') === 'ascending' && await q('.nm-table[data-vue="contacts"] tbody tr[data-cle] td:nth-child(6)', 'xs => { const v = xs.map(x => parseFloat(x.textContent)).filter(n => !isNaN(n)); return v.every((n, i) => !i || n >= v[i - 1]); }'), 'le tri par une colonne (la jauge, croissante)');
  await page.click('#fiche .nm-table[data-vue="contacts"] th[data-tri="jauge"]'); await page.click('#fiche .nm-table[data-vue="contacts"] th[data-tri="jauge"]'); await page.waitForTimeout(300);

  console.log('\nmodifier une ligne');
  const cle0 = await q('.nm-table[data-vue="contacts"] tbody tr[data-cle]', 'xs => xs[0].dataset.cle');
  await page.dblclick('#fiche .nm-table[data-vue="contacts"] tbody tr[data-cle]'); await page.waitForTimeout(400);
  okp(await q('.nm-table[data-vue="contacts"] tr.nm-edition') === 1 && await q('.nm-table[data-vue="contacts"] tr.nm-edition input.nm-champ') === 8 && await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('nm-champ')), 'double-clic : la ligne devient huit champs, le premier a le focus');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  okp(await q('.nm-table[data-vue="contacts"] tr.nm-edition') === 0 && await page.evaluate(() => app.fiche && app.fiche.mode === 'normes'), 'Échap annule sans fermer la page');
  await page.dblclick('#fiche .nm-table[data-vue="contacts"] tbody tr[data-cle]'); await page.waitForTimeout(300);
  await page.fill('#fiche tr.nm-edition input[data-champ="accessoire"]', 'ESSAI-ACC'); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  okp(await q('.nm-table[data-vue="contacts"] tr.nm-mod') === 1 && /modifiée/.test(await texte('.nm-table[data-vue="contacts"] .nm-t-badges')) && await page.evaluate(() => app.norme.contacts.some(c => c.accessoire === 'ESSAI-ACC') && app.normeNom === 'modifiée ici'), 'Entrée valide : la ligne est marquée modifiée, la table aussi, et le moteur la lit (app.norme)');
  okp(await page.evaluate(() => { const o = JSON.parse(localStorage.getItem('atelier.normes.v2') || 'null'); return !!(o && o.tables.contacts && o.tables.contacts.lignes.length === 1 && o.tables.contacts.lignes[0].brut.accessoire === 'ESSAI-ACC'); }), 'la modification est gardée dans le navigateur (une ligne, pas la norme entière)');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(500);
  okp(await page.evaluate(() => !app.norme.contacts.some(c => c.accessoire === 'ESSAI-ACC') && app.normeNom === '' && !localStorage.getItem('atelier.normes.v2')) && await q('.nm-table[data-vue="contacts"] tr.nm-mod') === 0, 'Ctrl+Z dans la page défait la modification (et le contrat n’a pas bougé)');
  await page.evaluate(k => { modifierLigneNorme('contacts', k); }, cle0); await page.waitForTimeout(300);
  await page.fill('#fiche tr.nm-edition input[data-champ="accessoire"]', 'ESSAI-ACC'); await page.click('#fiche #nm-ok'); await page.waitForTimeout(500);
  await page.reload(); await page.waitForFunction(() => typeof atelier !== 'undefined'); await page.waitForTimeout(400);
  okp(await page.evaluate(() => app.norme.contacts.some(c => c.accessoire === 'ESSAI-ACC') && app.normeNom === 'modifiée ici'), 'après rechargement, la ligne modifiée est toujours là, et le moteur la lit');
  await page.evaluate(() => ficheNormes({ table: 'fils' })); await page.waitForTimeout(500);
  okp(await q('.nm-table[data-vue="contacts"]', 'xs => xs[0].classList.contains("modifiee")') && /1 modifiée/.test(await texte('.nm-table[data-vue="contacts"] .nm-t-badges')) && /1 table modifiée/.test(await texte('.nm-etat')), 'la page le montre : la table est marquée modifiée, l’état aussi');

  console.log('\najouter, masquer, rétablir');
  await page.click('#fiche .nm-table[data-vue="fils"] [data-ajouter="fils"]'); await page.waitForTimeout(300);
  okp(await q('.nm-table[data-vue="fils"] tr.nm-edition') === 1, '« Ligne » ouvre une ligne neuve en édition');
  await page.fill('#fiche tr.nm-edition input[data-champ="type"]', 'ZZ'); await page.fill('#fiche tr.nm-edition input[data-champ="jauge"]', ''); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  okp(await q('.nm-table[data-vue="fils"] tr.nm-edition') === 1 && /incomplète/.test(await page.evaluate(() => document.getElementById('toast').textContent)), 'une ligne sans jauge est refusée, et on reste en édition');
  await page.fill('#fiche tr.nm-edition input[data-champ="jauge"]', '20'); await page.fill('#fiche tr.nm-edition input[data-champ="intensite"]', '9'); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  okp(await q('.nm-table[data-vue="fils"] tr.nm-ajo') === 1 && await page.evaluate(() => filDeNorme(app.norme, 'ZZ20', 20).intensite === 9 && filDeNorme(app.norme, 'ZZ20', 20).type === 'ZZ'), 'la ligne ajoutée est marquée, et le moteur la trouve (filDeNorme ZZ20 → 9 A)');
  const nFils = await page.evaluate(() => app.norme.fils.length);
  await page.evaluate(() => { const tr = document.querySelector('#fiche .nm-table[data-vue="fils"] tbody tr.nm-emb'); tr.querySelector('[data-supprimer]').click(); }); await page.waitForTimeout(500);
  okp(await page.evaluate(n => app.norme.fils.length === n - 1, nFils) && /1 masquée/.test(await texte('.nm-table[data-vue="fils"] .nm-t-badges')) && await q('.nm-table[data-vue="fils"] [data-masquees]') === 1, 'supprimer une ligne embarquée la masque : le moteur ne la voit plus, la table le dit');
  await page.click('#fiche .nm-table[data-vue="fils"] [data-masquees]'); await page.waitForTimeout(300);
  okp(await q('.nm-table[data-vue="fils"] tr.nm-masquee') === 1, 'les lignes masquées se montrent sur demande, barrées');
  await page.click('#fiche .nm-table[data-vue="fils"] tr.nm-masquee [data-retablir]'); await page.waitForTimeout(400);
  okp(await page.evaluate(n => app.norme.fils.length === n, nFils) && await q('.nm-table[data-vue="fils"] tr.nm-masquee') === 0, '« rétablir » la ramène');
  await page.evaluate(() => { const tr = document.querySelector('#fiche .nm-table[data-vue="fils"] tbody tr.nm-ajo'); tr.querySelector('[data-dupliquer]').click(); }); await page.waitForTimeout(300);
  okp(await q('.nm-table[data-vue="fils"] tr.nm-edition input[data-champ="type"]', 'xs => xs[0].value') === 'ZZ', 'dupliquer ouvre une ligne neuve préremplie');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);

  console.log('\nimporter : un CSV collé, un Excel');
  // la ligne 26 AWG telle quelle (identique), la ligne 24 AWG à 9 A (elle remplace), YY 20 (nouvelle), une ligne sans jauge (rejetée) ; puis une seconde table
  await page.evaluate(() => { const l26 = app.norme.fils.find(f => f.type === '*' && f.jauge === 26), b24 = { ...app.norme.fils.find(f => f.type === '*' && f.jauge === 24).brut, intensite: '9' };
    importerNormeTexte('Mes fils\n' + csvDeTable('fils', [l26, { brut: b24 }, { brut: { type: 'YY', jauge: '20', section: '0,62', resistance20: '34', intensite: '7,5' } }, { brut: { type: 'mauvaise' } }]) + '\nUne table ambiguë\nTaille;Intensité;Résistance;Note\n22;5;99;essai\n', 'colle.csv'); }); await page.waitForTimeout(600);
  okp(await q('#nm-import .nm-bloc') === 2 && /2 tables reconnues/.test(await texte('#nm-import .nm-imp-tete')), 'deux blocs prévisualisés, nommés par leur titre', await texte('#nm-import .nm-imp-tete'));
  okp(/3 lignes lues/.test(await texte('#nm-import .nm-bloc[data-bloc="0"] .nm-bloc-compte')) && /1 nouvelle/.test(await texte('#nm-import .nm-bloc[data-bloc="0"] .nm-bloc-compte')) && /1 remplace/.test(await texte('#nm-import .nm-bloc[data-bloc="0"] .nm-bloc-compte')) && /1 identique/.test(await texte('#nm-import .nm-bloc[data-bloc="0"] .nm-bloc-compte')) && /1 rejetée/.test(await texte('#nm-import .nm-bloc[data-bloc="0"] .nm-bloc-compte')), 'le compte d’un bloc : lues, nouvelle, remplace, identique, rejetée', await texte('#nm-import .nm-bloc[data-bloc="0"] .nm-bloc-compte'));
  okp(await q('#nm-import .nm-bloc[data-bloc="1"] select[data-cible]', 'xs => xs[0].value') === 'resistancesContacts', 'le second bloc est reconnu comme Résistance des contacts');
  await page.selectOption('#fiche #nm-import .nm-bloc[data-bloc="1"] select[data-cible]', ''); await page.waitForTimeout(400);
  okp(/ignorée/.test(await texte('#nm-import .nm-bloc[data-bloc="1"] .nm-bloc-compte')) && /Adopter 1 table/.test(await texte('#nm-adopter')), 'on peut ne pas importer un bloc : il est ignoré, le bouton compte');
  await page.click('#fiche #nm-adopter'); await page.waitForTimeout(600);
  okp(await page.evaluate(() => !document.getElementById('nm-import') && filDeNorme(app.norme, 'YY20', 20).intensite === 7.5 && filDeNorme(app.norme, 'DR24', 24).intensite === 9 && app.norme.resistancesContacts.find(r => r.taille === '22').resistance === 14.6 && /colle\.csv/.test(app.normeNom)), 'adopter : les lignes sont dans la norme active (la ligne 24 AWG remplacée à 9 A), sous le nom du fichier ; la ligne de la table ignorée n’y est pas');
  okp(await q('.nm-table[data-vue="fils"] tr.nm-ajo') >= 2 && /colle\.csv/.test(await texte('.nm-table[data-vue="fils"] .nm-t-tete')), 'la table Fils montre les lignes importées et d’où elles viennent');
  const xlsx = excelEssai();
  await page.setInputFiles('#fiche #fichier-norme', xlsx); await page.waitForTimeout(1200);
  okp(await q('#nm-import .nm-bloc') === 3 && await q('#nm-import .nm-bloc select[data-cible]', 'xs => xs.map(s => s.value).join(",")') === 'fils,reseau,colliers' && /Feuille Colliers/.test(await texte('#nm-import .nm-bloc[data-bloc="2"] b')), 'un Excel : deux feuilles, trois tables reconnues (une feuille en porte deux), nommées par leur titre ou leur feuille', await q('#nm-import .nm-bloc select[data-cible]', 'xs => xs.map(s => s.value).join(",")'));
  okp(/Jauge \(AWG\) → Jauge/.test(await texte('#nm-import .nm-bloc[data-bloc="0"] .nm-bloc-cols')), 'les en-têtes de l’Excel, avec leurs unités, sont lus comme les colonnes de l’outil');
  await page.click('#fiche #nm-adopter'); await page.waitForTimeout(600);
  okp(await page.evaluate(() => filDeNorme(app.norme, 'XL24', 24).intensite === 4 && app.norme.colliers.some(c => c.reference === 'ESSAI-COL-2' && c.dmax === 30) && chuteAdmise(app.norme, 28).chuteMax === 1.2), 'l’Excel adopté : le fil XL24 (4 A), le collier ESSAI-COL-2, la chute admise à 28 V (1,2 V) sont lus par le moteur');

  console.log('\nexporter, chercher, revenir');
  const ex = await telechargement(() => page.click('#fiche .nm-table[data-vue="fils"] [data-exporter="fils"]'));
  okp(ex.nom === 'normes-Fils.csv' && /\nType;Jauge;Code;Brins;Section;Résistance 20;/.test(ex.texte) && /XL;24;/.test(ex.texte) && /ZZ;20;/.test(ex.texte), 'exporter une table : un CSV aux en-têtes de l’outil (un nom ASCII : file:// refuse les accents), lignes importées et ajoutées comprises', ex.nom);
  const gab = await telechargement(() => page.click('#fiche .nm-table[data-vue="fils"] [data-gabarit="fils"]'));
  okp(gab.nom === 'gabarit-Fils.csv' && gab.texte.split('\n').filter(Boolean).length === 3, 'le gabarit : un titre, l’en-tête, une ligne d’exemple', gab.nom);
  const tout = await telechargement(() => page.click('#fiche #nm-exporter-tout'));
  okp(tout.nom === 'normes-mes-modifications.csv' && /ESSAI-ACC/.test(tout.texte) && /XL;24/.test(tout.texte) && /ESSAI-COL-2/.test(tout.texte), 'exporter mes modifications : tout ce que le navigateur a ajouté ou changé, en un fichier', tout.nom);
  await page.fill('#fiche #nm-q', 'EN3646'); await page.waitForTimeout(600);
  okp(await q('.nm-resultats .nm-hit') >= 4 && /Contacts/.test(await texte('.nm-resultats')) && /Filetages/.test(await texte('.nm-resultats')) && /Arrangements de connecteur/.test(await texte('.nm-resultats')), 'la recherche dans toutes les tables : EN3646 est dans les arrangements, les contacts, les filetages, les raccords…', await q('.nm-resultats .nm-hit') + ' tables');
  await page.click('#fiche .nm-resultats .nm-hit [data-voir-table="contacts"]'); await page.waitForTimeout(500);
  okp(await q('.nm-table[data-vue="contacts"].ouvert') === 1 && await q('.nm-table[data-vue="contacts"] input[data-filtre]', 'xs => xs[0].value') === 'EN3646' && await q('.nm-table[data-vue="contacts"] tbody tr[data-cle]', 'xs => xs.length > 10 && xs.every(tr => /EN3646/.test(tr.textContent))'), '« Voir dans la table » déplie la table, filtrée');
  await page.fill('#fiche .nm-table[data-vue="contacts"] input[data-filtre]', ''); await page.waitForTimeout(300);
  await page.click('#fiche .nm-table[data-vue="fils"] [data-embarquee="fils"]'); await page.waitForTimeout(500);
  okp(await page.evaluate(() => app.norme.fils.length === 14 && filDeNorme(app.norme, 'DR24', 24).intensite !== 3.5 && app.norme.contacts.some(c => c.accessoire === 'ESSAI-ACC')), '« Revenir à l’embarquée » sur Fils seulement : les contacts gardent leur ligne modifiée');
  await page.click('#fiche #no-embarquee'); await page.waitForTimeout(500);
  okp(await page.evaluate(() => app.normeNom === '' && !app.norme.contacts.some(c => c.accessoire === 'ESSAI-ACC') && !app.norme.colliers.some(c => c.reference === 'ESSAI-COL-2') && !localStorage.getItem('atelier.normes.v2')), '« Revenir à la norme embarquée » oublie tout, et le navigateur aussi');
  await page.click('#fiche [data-nm-vue="bible"]'); await page.waitForTimeout(500);
  okp(await page.evaluate(() => app.fiche && app.fiche.mode === 'bible' && !!document.querySelector('#fiche-corps table.bible') && /contrats déjà faits/i.test(document.querySelector('#fiche-corps').textContent)), 'la bible des barrettes s’ouvre depuis la page, avec les contrats déjà faits');
  await page.click('#fiche #bi-normes'); await page.waitForTimeout(500);
  okp(await page.evaluate(() => app.fiche && app.fiche.mode === 'normes'), '« Voir les normes » depuis la bible ramène à la page');
  await page.evaluate(() => ficheNormes({ table: 'familles:barrette', filtre: 'E0599' })); await page.waitForTimeout(400);
  okp(await q('.nm-table[data-vue="familles:barrette"].ouvert') === 1 && await q('.nm-table[data-vue="familles:barrette"] tbody tr[data-cle]') === 1, 'ouvrir la page sur une table, filtrée (ce que « Voir la norme » fait depuis une carte)');

  console.log('\nau téléphone');
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
  await page.evaluate(() => { fermerFiche(true); ficheNormes({ table: 'contacts' }); }); await page.waitForTimeout(600);
  okp(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && !document.getElementById('fiche').hidden && document.querySelectorAll('#fiche .nm-table').length === 27), 'la page tient dans la largeur du téléphone, en tiroir');
  okp(await page.evaluate(() => { const z = document.querySelector('#fiche .nm-table[data-vue="contacts"] .nm-defile'); return !!z && z.scrollWidth > z.clientWidth && getComputedStyle(z).overflowX === 'auto'; }), 'une table large défile de côté, sans écraser une valeur');
  okp(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
  console.log('\n  ' + (ko || echecs ? (ko + echecs) + ' échec(s)' : 'tout tient'));
  await nav.close(); process.exit(ko || echecs ? 1 : 0);
})();
