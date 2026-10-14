/* ===========================================================================
   LA BASE SEE — l'Excel des vues de SEE se lit-il sur place, une feuille par écran ?
   ---------------------------------------------------------------------------
       node tests/see.js                (CAPTURES=dossier pour garder les écrans)

   Le lecteur a tiré les vues de la base SEE dans Excel (Données → SQL Server) :
   six feuilles EED_View…, 200 colonnes chacune, jusqu'à 7 000 lignes, un fichier
   qui ne quitte pas son poste. La batterie fabrique un tel classeur DANS la page
   (SheetJS), le dépose comme un fichier, et vérifie :
     1. il est reconnu à ses noms de feuilles, d'où qu'il arrive (la fenêtre, une
        norme), un Excel ordinaire non ;
     2. la page : un onglet par feuille, le nombre de lignes de TOUTE la feuille,
        les colonnes remplies seulement (taux, exemples, « identifiant » pour les
        GUID), les vides repliées à part ;
     3. les exemples se masquent ; on passe d'une feuille à l'autre ;
     4. le résumé en texte porte toutes les feuilles ;
     5. rien n'est gardé, le contrat ouvert ne bouge pas, aucune erreur.
   ========================================================================= */
const { chromium } = require('playwright');
const { fichierDemande } = require('./pilote');
const FICHIER = fichierDemande(), CAPTURES = process.env.CAPTURES || '';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 } }); p.setDefaultTimeout(120000);
  const e = []; p.on('pageerror', x => e.push(x.message));
  const R = []; const ok = (n, c, d) => R.push((c ? '  ok   ' : '  KO   ') + n + (d ? '   ' + d : ''));
  await p.goto(FICHIER); await p.waitForFunction(() => typeof atelier !== 'undefined'); await p.evaluate(() => atelier.exemple()); await p.waitForTimeout(600);
  const n0 = await p.evaluate(() => app.contrat.liaisons.length);
  // le faux classeur : six vues, 200 colonnes (les vraies, seize traductions vides, des attributs vides — le dernier rempli
  // une ligne sur cinquante), des GUID en ID
  await p.evaluate(() => {
    const langues = ['Turkish', 'Slovenian', 'Russian', 'Romanian', 'Polish', 'Dutch', 'Italian', 'Greek', 'German', 'French', 'Spanish', 'English', 'Danish', 'Czech', 'Chinese', 'Bulgarian'];
    const guid = i => ('00000000' + (i * 2654435761 >>> 0).toString(16)).slice(-8).toUpperCase() + '-E60A-4C1B-9F2D-' + String(100000000000 + i).slice(-12);
    const feuille = (n, cols, ligne) => { const tete = [...cols, ...langues.map(l => l + ' description'), ...Array.from({ length: 200 - cols.length - langues.length }, (_, i) => 'UserAttribute' + (i + 1))];
      const rows = [tete]; for (let i = 0; i < n; i++) { const r = ligne(i); rows.push(tete.map((_, j) => j < r.length ? (r[j] === '' ? undefined : r[j]) : (j === tete.length - 1 && i % 50 === 0 ? 'x' : undefined))); } return XLSX.utils.aoa_to_sheet(rows); };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, feuille(1297, ['ID', 'PartNumber', 'Version', 'CategoryFullPath', 'ConnectorPartNumber', 'ContactSize', 'Gender', 'WireType', 'GaugeMin', 'GaugeMax', 'ContactPartNumber', 'FillerPlug', 'Tool', 'Released'],
      i => [guid(i), '*ECS0' + (800 + i % 90), 1, i % 7 ? 'Contact' : 'shielded wire termination', 'EN2997', [20, 16, 12, 22][i % 4], i % 2 ? 'Male' : 'Female', ['DR', 'DM', 'DK'][i % 3], 24, 20, 'EN3155-016M' + (2018 + i % 4), 'EN3545-' + (i % 5), 'M22520/1-01', true]), 'EED_ViewEndFittingRules');
    XLSX.utils.book_append_sheet(wb, feuille(748, ['ID', 'PartNumber', 'Version', 'Description', 'Gauge', 'Diameter', 'Weight', 'Resistance', 'NumberOfWires', 'Shielded', 'TemperatureMax', 'Manufacturer'],
      i => [guid(i), ['DR', 'DM', 'DK', 'KT', 'HN'][i % 5] + (20 + i % 6 * 2), 1, 'Câble ' + i, 20 + i % 6 * 2, 1.2 + i % 9 / 10, 6.85 + i % 7, 33.2, 1 + i % 3, i % 3 === 2, 260, 'NEXANS']), 'EED_ViewCablesAndWires');
    XLSX.utils.book_append_sheet(wb, feuille(2310, ['ID', 'PartNumber', 'Version', 'Category', 'ContactLayout', 'Form_Type', 'ShellSize', 'Coupling', 'Gender'], i => [guid(i), 'EN2997Y' + i, 1, 'prEN2997', 'EN2997_10-06', i % 2 ? 'Circular' : 'Rectangular', 10 + i % 14, 'Bayonet', i % 2 ? 'Male' : 'Female']), 'EED_ViewConnectiveEquipments');
    XLSX.utils.book_append_sheet(wb, feuille(229, ['ID', 'PartNumber', 'Version', 'Category', 'View', 'TypeOfContact', 'ConnectorType', 'NumberOfPins'], i => [guid(i), 'EN2997_' + String(8 + i % 20).padStart(2, '0') + '-' + String(i % 99).padStart(2, '0'), 1, 'prEN2997-001P2', 'Front', 'Male', 'Circular', 3 + i % 40]), 'EED_ViewContactLayouts');
    XLSX.utils.book_append_sheet(wb, feuille(1104, ['ID', 'PartNumber', 'Version', 'Category', 'Description', 'Weight'], i => [guid(i), 'EN3660-' + i, 1, 'Backshell', 'Raccord droit', 12.5]), 'EED_ViewAccessories');
    XLSX.utils.book_append_sheet(wb, feuille(7091, ['ID', 'PartNumber', 'Version', 'Category', 'Description', 'Manufacturer', 'Weight', 'Power'], i => [guid(i), i % 3 ? '21708F' + i : 'MS3320-' + (5 + i % 4 * 5), 1, i % 3 ? 'Relay' : 'Circuit breaker', 'Équipement ' + i, 'Leach', 0.12, i % 5 ? '' : 28]), 'EED_ViewEquipments');
    const type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    window.__see = new File([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], 'base-SEE.xlsx', { type });
    const w2 = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(w2, XLSX.utils.aoa_to_sheet([['Device1', 'Pin1', 'Cable', 'Device2', 'Pin2'], ['101BT1', '1', 'W-001', '102CB1', '1']]), 'Feuil1');
    window.__ordinaire = new File([XLSX.write(w2, { type: 'array', bookType: 'xlsx' })], 'retest.xlsx', { type }); });
  const taille = await p.evaluate(() => window.__see.size);

  // 1. reconnu à ses noms de feuilles, d'où qu'il arrive ; un Excel ordinaire, non
  ok('un Excel ordinaire (une feuille Feuil1) n’est pas pris pour la base SEE', !(await p.evaluate(() => routerBaseSEE(window.__ordinaire))));
  const t0 = Date.now(); await p.evaluate(() => ouvrirFichier(window.__see)); await p.waitForFunction(() => app.fiche && app.fiche.mode === 'see'); const ms = Date.now() - t0;
  ok('déposé comme un retest (ouvrirFichier), il est reconnu à ses feuilles EED_View… et résumé, sans toucher au contrat ouvert', await p.evaluate(n0 => app.contrat.liaisons.length === n0 && app.nom === 'Contrat d’exemple', n0), Math.round(taille / 1024) + ' Ko lus en ' + ms + ' ms');
  ok('six feuilles lues, en moins de 20 s', ms < 20000 && await p.evaluate(() => SEE.lu.feuilles.length === 6), ms + ' ms');

  // 2. la page
  const P = () => p.evaluate(() => { const c = $('fiche-corps'), q = s => c.querySelector(s), qa = s => [...c.querySelectorAll(s)], sp = t => t == null ? t : String(t).replace(/[\u00a0\u202f]/g, ' ');
    return { onglets: sp(qa('[data-see-feuille]').map(x => x.querySelector('b').textContent + '=' + x.querySelector('span').textContent).join(' | ')), choisi: (q('[data-see-feuille][aria-selected="true"] b') || {}).textContent,
      nom: (q('.see-nom') || {}).textContent, compte: sp((q('.see-compte') || {}).textContent), cols: qa('.see-col .see-c').map(x => x.textContent), rare: qa('.see-col.rare .see-c').map(x => x.textContent),
      ex: Object.fromEntries(qa('.see-col').map(li => [li.querySelector('.see-c').textContent, li.querySelector('.see-e').textContent + ' · ' + li.querySelector('.see-t').textContent])),
      vides: sp((q('.see-vides summary') || {}).textContent), pos: (q('.see-pos') || {}).textContent, largeur: Math.round($('fiche').getBoundingClientRect().width), deborde: c.scrollWidth > c.clientWidth + 1 }; });
  let S = await P();
  ok('un onglet par feuille, son nom court et son nombre de lignes (toute la feuille, pas seulement les 2 000 sondées)', S.onglets === 'EndFittingRules=1 297 | CablesAndWires=748 | ConnectiveEquipments=2 310 | ContactLayouts=229 | Accessories=1 104 | Equipments=7 091'.replace(/ (?=\d{3}\b)/g, ' '), S.onglets);
  ok('la première feuille : son nom entier, 1 297 lignes, 200 colonnes dont 15 remplies, 185 vides', S.nom === 'EED_ViewEndFittingRules' && /^1 297 lignes · 200 colonnes : 15 remplies, 185 vides$/.test(S.compte) && S.pos === 'feuille 1 / 6', S.compte);
  ok('seules les colonnes remplies sont listées, dans l’ordre du fichier (les traductions et attributs vides n’y sont pas)', S.cols.length === 15 && S.cols[0] === 'ID' && S.cols[10] === 'ContactPartNumber' && S.cols[14] === 'UserAttribute170' && !S.cols.some(c => /description/.test(c)), S.cols.join(', '));
  ok('chaque colonne : son taux et deux exemples ; l’ID (des GUID) dit « identifiant » ; une colonne presque vide est en retrait', /^EN3155-016M2018 · EN3155-016M2019 · 100 %$/.test(S.ex.ContactPartNumber) && /^identifiant · 100 %$/.test(S.ex.ID) && /^x · 2 %$/.test(S.ex.UserAttribute170) && S.rare.join() === 'UserAttribute170', JSON.stringify([S.ex.ContactPartNumber, S.ex.ID, S.ex.UserAttribute170]));
  ok('les vides repliées à part, comptées', /^185 colonnes vides dans les 1 297 premières lignes$/.test(S.vides), S.vides);
  ok('la page est large (elle se photographie) et ne déborde pas de côté', S.largeur >= 1100 && !S.deborde, S.largeur + ' px');
  if (CAPTURES) await p.screenshot({ path: CAPTURES + '/see-1-regles.png' });

  // 3. les exemples se masquent ; on passe d'une feuille à l'autre
  await p.click('#see-ex'); S = await P();
  ok('« Exemples de valeurs » décoché : plus aucune valeur, seulement les noms, les taux et le genre (nombre, oui/non, identifiant)', !Object.values(S.ex).some(v => /EN3155|EN2997|ECS0|M22520/.test(v)) && /^nombre · 100 %$/.test(S.ex.ContactSize) && /^oui\/non · 100 %$/.test(S.ex.Released), JSON.stringify([S.ex.ContactSize, S.ex.Released, S.ex.PartNumber]));
  await p.click('#see-ex');
  await p.click('#see-suiv'); S = await P();
  ok('« Feuille suivante » : les câbles, 748 lignes', S.choisi === 'CablesAndWires' && /^748 lignes · 200 colonnes : 13 remplies/.test(S.compte) && S.pos === 'feuille 2 / 6', S.compte);
  await p.click('[data-see-feuille="5"]'); S = await P();
  ok('un clic sur l’onglet Equipments : 7 091 lignes (2 000 sondées pour les colonnes)', S.choisi === 'Equipments' && /^7 091 lignes/.test(S.compte) && S.cols.includes('Power') && /^28 · 2[01] %$/.test(S.ex.Power), S.compte + ' · Power ' + S.ex.Power);
  ok('à la dernière feuille, « Feuille suivante » est éteinte', await p.evaluate(() => $('see-suiv').disabled && !$('see-prec').disabled));
  if (CAPTURES) await p.screenshot({ path: CAPTURES + '/see-2-equipements.png' });

  // 4. le résumé en texte
  const txt = await p.evaluate(() => resumeSEE());
  ok('le résumé en texte : les six feuilles, leurs colonnes remplies (avec exemples), leurs vides', ['EED_ViewEndFittingRules — 1297 lignes — 200 colonnes, 15 remplies', 'EED_ViewEquipments — 7091 lignes', 'ContactPartNumber | 100 % | EN3155-016M2018 ; EN3155-016M2019', 'ID | 100 % | identifiant', 'Colonnes vides : Turkish description'].every(s => txt.includes(s)) && (txt.match(/^== /gm) || []).length === 6, txt.split('\n').slice(0, 4).join(' / '));

  // 5. rien n'est gardé ; aussi par la page des normes ; aucune erreur
  ok('rien de la base n’est gardé dans le navigateur', await p.evaluate(() => { let s = ''; try { for (let i = 0; i < localStorage.length; i++) s += localStorage.getItem(localStorage.key(i)); } catch (_) { } return !/ContactPartNumber|EED_View/.test(s); }));
  await p.evaluate(() => { fermerFiche(true); ficheNormes(); }); await p.waitForTimeout(300);
  ok('la page des normes porte « Lire la base SEE »', await p.evaluate(() => !!$('nm-see') && /Lire la base SEE/.test($('nm-see').textContent)));
  await p.evaluate(() => importerNorme(window.__see)); await p.waitForFunction(() => app.fiche && app.fiche.mode === 'see');
  ok('déposé comme une norme, il est résumé aussi — rien n’est importé dans les normes', await p.evaluate(() => !NORMES.import && SEE.feuille === 0));
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400); S = await P();
  ok('au téléphone, la page ne déborde pas de côté', !S.deborde && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  ok('aucune erreur dans la page', !e.length, e.slice(0, 2).join(' | '));

  R.forEach(x => console.log(x));
  const ko = R.filter(x => x.startsWith('  KO')).length;
  console.log('\n  ' + (R.length - ko) + ' / ' + R.length + (ko ? '  — ' + ko + ' PROBLÈME(S)' : '  — tout tient'));
  await b.close(); process.exit(ko ? 1 : 0);
})();
