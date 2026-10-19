/* ===========================================================================
   LA BASE SEE — l'Excel des vues de SEE se lit-il sur place, une feuille par écran ?
   ---------------------------------------------------------------------------
       node tests/see.js                (CAPTURES=dossier pour garder les écrans)

   Le lecteur a tiré la base SEE dans Excel (Données → SQL Server) : des vues
   EED_View… de 200 colonnes et jusqu'à 7 000 lignes, des tables EED_OBJ_… et
   EED_LNK_… qui les relient par des GUID, un fichier qui ne quitte pas son poste. La batterie fabrique un tel classeur DANS la page
   (SheetJS), le dépose comme un fichier, et vérifie :
     1. il est reconnu à ses noms de feuilles, d'où qu'il arrive (la fenêtre, une
        norme), un Excel ordinaire non ; il est lu EN ENTIER, feuille à feuille ;
     2. LIENS : les identifiants d'une feuille retrouvés dans une autre (ou dans
        une autre ligne de la sienne), la part retrouvée, une cible par feuille,
        quatre au plus ; ce qui ne se relie à rien ; les tables LNK_ et SET_
        colonne par colonne ;
     3. CODES : le plan ouvert face à SEE (ses types, ses familles ; ses références
        en compte seulement) ; les valeurs des colonnes de codes, les listes à
        virgules valeur par valeur ; deux écritures d'un même flottant n'en font
        qu'une ; la gauge AWG des sections en mm² ; jamais qui a fait quoi ;
     4. une feuille : toutes ses lignes, les remplies, les vides ; les exemples se
        masquent ; un calibre rempli après la ligne 5 000 se voit ;
     5. le résumé en texte porte tout ; rien n'est gardé, aucune erreur.
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
  // le faux classeur, comme celui du lecteur : six vues (des GUID en ID et IDEquipment, propres à chaque feuille), quatre
  // tables qui les relient (les contacts des règles, les broches des arrangements, les conducteurs, les paires fiche ↔
  // embase), des traductions vides, un utilisateur, un calibre rempli seulement au-delà de la ligne 5 000 ; puis les
  // catégories (qui se désignent entre elles), une table de familles partagée entre connecteurs, équipements et règles,
  // et des flottants écrits de deux façons (0.32574322630000002 en texte, 0.0099999998 d'un réel simple)
  await p.evaluate(() => {
    const langues = ['Turkish', 'Slovenian', 'Russian', 'Romanian', 'Polish', 'Dutch', 'Italian', 'Greek', 'German', 'French', 'Spanish', 'English', 'Danish', 'Czech', 'Chinese', 'Bulgarian'];
    const guid = (i, f) => ('00000000' + ((i + 1) * 2654435761 >>> 0).toString(16)).slice(-8).toUpperCase() + '-E60A-4C1B-' + String(1000 + f).slice(-4) + '-' + String(100000000000 + i).slice(-12);
    const feuille = (n, cols, ligne, traductions) => { const tete = [...cols, ...(traductions ? langues.map(l => 'Description_' + l.slice(0, 2).toUpperCase()) : [])];
      const rows = [tete]; for (let i = 0; i < n; i++) { const r = ligne(i); rows.push(tete.map((_, j) => j < r.length && r[j] !== '' && r[j] != null ? r[j] : undefined)); } return XLSX.utils.aoa_to_sheet(rows); };
    const wb = XLSX.utils.book_new(), ajoute = (ws, nom) => XLSX.utils.book_append_sheet(wb, ws, nom), fam = ['DR', 'DM', 'DK', 'MLB', 'KD'];
    ajoute(feuille(1297, ['ID', 'IDEquipment', 'PartNo', 'CategoryFullPath', 'ClassName', 'CableTypeList', 'CreatorUser', 'LCStatusName', 'Released'],
      i => [guid(i, 1), guid(i, 2), 'E07' + (10 + i % 30) + ' - Plug/Square Receptacle', i % 7 ? 'Contact' : 'shielded wire termination', i % 7 ? 'Contact' : 'ShieldingWireTermination', 'DR,DM,' + (i % 2 ? 'MLB' : 'KD'), 'x4590' + (i % 7), i % 5 ? 'Release' : 'Obsolete', true], true), 'EED_ViewEndFittingRules');
    ajoute(feuille(748, ['ID', 'IDEquipment', 'PartNo', 'Type', 'Gauge', 'ExternalMaxDiameter', 'LineicWeight', 'Shield'],
      i => [guid(i, 3), guid(i, 4), fam[i % 5] + (20 + (i % 30 < 6 ? i % 6 : i % 6) * 2), fam[i % 5], [0.3257, 0.5179, 1.3095][i % 3], 0.0012 + i % 9 / 10000, 0.006 + i % 7 / 1000, i % 3 === 2 ? 'SHIELDED' : 'UNSHIELDED'], true), 'EED_ViewCablesAndWires');
    ajoute(feuille(2310, ['ID', 'IDEquipment', 'PartNo', 'ConnectivityType', 'Gender', 'IDPlugMap', 'Form_Type', 'Resistance'], i => [guid(i, 5), guid(i, 6), 'EN2997Y' + i, i % 2 ? 'Plug' : 'Receptacle', i % 2 ? 'Socket' : 'Pin', guid(i % 229, 8), i % 2 ? 'Circular' : 'Rectangular', [0, 0.01, 0.0099999998][i % 3]], true), 'EED_ViewConnectiveEquipments');
    ajoute(feuille(229, ['ID', 'IDEquipment', 'PartNo', 'DesiredPinsCount', 'Type', 'TypeOfContactLayout', 'View'], i => [guid(i, 8), guid(i, 8), 'EN2997_' + String(8 + i % 20).padStart(2, '0') + '-' + String(i % 99).padStart(2, '0'), 3 + i % 40, 'Circular', 'Male', i % 2 ? 'Front' : 'Rear'], true), 'EED_ViewContactLayouts');
    ajoute(feuille(1104, ['ID', 'IDEquipment', 'IDCategory', 'PartNo', 'AccessoriesType', 'Weight'], i => [guid(i, 9), guid(i, 10), guid(i % 7, 99), 'EN3660-' + i, i % 2 ? 'Connector Accessories' : 'Terminal', 0.012], true), 'EED_ViewAccessories');
    ajoute(feuille(7091, ['ID', 'IDEquipment', 'PartNo', 'ClassName', 'TypeOfRelay', 'Intensity_Nominal'], i => [guid(i, 11), guid(i, 12), i % 3 ? '21708F' + i : 'MS3320-' + (5 + i % 4 * 5), i % 3 ? 'relays' : 'Circuit breaker', i % 3 ? 'Bistable' : '', i >= 5000 ? 10 : ''], true), 'EED_ViewEquipments');
    ajoute(feuille(6000, ['ID', 'IDEquipment', 'RuleNum', 'ContactType', 'ContactGauge', 'WireType', 'WireGauge', 'PartNo1', 'Quantity1', 'Unit1'], i => [guid(i, 13), guid(i % 1297, 2), 100 + i % 8, i % 2 ? 'Male' : 'Female', [0.3257432263, 0.5179520182, 1.3095370853][i % 3], ['DR', 'DM', 'YYXE', 'WX'][i % 4], [-1, 0.3257432263, '0.32574322630000002'][i % 3], 'EN3155-00' + (i % 2 ? '8M' : '9F') + '2222', 1, 'Each']), 'EED_OBJ_END_Fitting_Rules_Conta');   // 31 caractères au plus : Excel tronque comme chez le lecteur
    ajoute(feuille(3000, ['ID', 'IDPlugMap', 'Name', 'X', 'Y', 'ContactGauge', 'ContactFamily'], i => [guid(i, 14), guid(i % 229, 8), String(1 + i % 19), (i % 7) / 1000, -(i % 5) / 1000, [0.5179520182, 1.3095370853][i % 2], i % 50 ? 'Standard' : 'Coax']), 'EED_OBJ_PlugMapPin');
    ajoute(feuille(1492, ['ID', 'IDCable', 'WirePosition', 'Type', 'Gauge', 'Resistivity'], i => [guid(i, 15), i % 16 ? '' : guid(i % 748, 4), 1 + i % 4, fam[i % 5], 1.3095, 0.0149]), 'EED_OBJ_Wires');
    ajoute(feuille(500, ['ID', 'IDSemiEqu', 'IDConnectedSemiEqu', 'Prefered'], i => [guid(i, 16), guid(i, 6), guid(i + 1000, 6), 1]), 'EED_LNK_Equi_Mating');
    ajoute(feuille(50, ['ID', 'IDParentCategory', 'Level1'], i => [guid(i, 20), i ? guid(Math.floor((i - 1) / 3), 20) : '', 'Cat' + i % 5]), 'EED_OBJ_Categories');
    ajoute(feuille(3000, ['ID', 'IDEquipment', 'ProductFamily', 'Quantity', 'Comment'], i => [guid(i, 21), i % 10 < 6 ? guid(i % 2310, 6) : i % 10 < 9 ? guid(i % 7091, 12) : guid(i % 1297, 2), ['EN3645', 'EN2997', 'EN4165'][i % 3], 1, '']), 'EED_LNK_EndFitting_ProductFamil');
    ajoute(feuille(3, ['ID', 'Name'], i => [guid(i, 22), ['EN3645', 'EN2997', 'EN4165'][i]]), 'EED_SET_ProductFamilies');
    const type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    window.__see = new File([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], 'base-SEE.xlsx', { type });
    const w2 = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(w2, XLSX.utils.aoa_to_sheet([['Device1', 'Pin1', 'Cable', 'Device2', 'Pin2'], ['101BT1', '1', 'W-001', '102CB1', '1']]), 'Feuil1');
    window.__ordinaire = new File([XLSX.write(w2, { type: 'array', bookType: 'xlsx' })], 'retest.xlsx', { type }); });
  const taille = await p.evaluate(() => window.__see.size);

  // 1. reconnu à ses noms de feuilles, d'où qu'il arrive ; un Excel ordinaire, non ; lu EN ENTIER
  ok('un Excel ordinaire (une feuille Feuil1) n’est pas pris pour la base SEE', !(await p.evaluate(() => routerBaseSEE(window.__ordinaire))));
  const t0 = Date.now(); await p.evaluate(() => ouvrirFichier(window.__see)); await p.waitForFunction(() => app.fiche && app.fiche.mode === 'see'); const ms = Date.now() - t0;
  ok('déposé comme un retest (ouvrirFichier), il est reconnu à ses feuilles EED_… et résumé, sans toucher au contrat ouvert', await p.evaluate(n0 => app.contrat.liaisons.length === n0 && app.nom === 'Contrat d’exemple', n0), Math.round(taille / 1024) + ' Ko lus en ' + ms + ' ms');
  ok('treize feuilles lues en entier (une à la fois), en moins de 20 s', ms < 20000 && await p.evaluate(() => SEE.lu.feuilles.length === 13 && SEE.lu.feuilles.find(f => f.nom === 'EED_ViewEquipments').lignes === 7091 && SEE.lu.feuilles.find(f => f.nom === 'EED_OBJ_END_Fitting_Rules_Conta').lignes === 6000), ms + ' ms');

  const sp = t => t == null ? t : String(t).replace(/[  ]/g, ' ');
  const P = () => p.evaluate(() => { const c = $('fiche-corps'), q = s => c.querySelector(s), qa = s => [...c.querySelectorAll(s)];
    return { onglets: qa('[data-see-vue]').map(x => x.querySelector('b').textContent + (x.querySelector('span') ? '=' + x.querySelector('span').textContent : '')).join(' | '), choisi: (q('[data-see-vue][aria-selected="true"] b') || {}).textContent,
      nom: (q('.see-nom') || {}).textContent, compte: (q('.see-compte') || {}).textContent, cols: qa('.see-cols .see-col .see-c').map(x => x.textContent),
      ex: Object.fromEntries(qa('.see-cols .see-col').map(li => [li.querySelector('.see-c').textContent, li.querySelector('.see-e').textContent + ' · ' + li.querySelector('.see-t').textContent])),
      petites: qa('.see-petite').map(g => g.querySelector('h4').textContent.replace(/\s+/g, ' ').trim() + ' : ' + [...g.querySelectorAll('.see-col')].map(li => li.querySelector('.see-c').textContent + ' = ' + (li.querySelector('.see-e') || li.querySelector('.see-t')).textContent).join(' | ')),
      liens: qa('.see-groupe').map(g => g.querySelector('h4').textContent + ' : ' + [...g.querySelectorAll('.see-lien')].map(l => l.textContent.replace(/\s+/g, ' ').trim()).join(' / ')),
      plan: (q('.see-plan') || {}).textContent || '', codes: Object.fromEntries(qa('.see-code').map(x => [x.querySelector('.see-code-t b').textContent, x.querySelector('p').textContent])),
      vides: (q('.see-vides summary') || {}).textContent, pos: (q('.see-pos') || {}).textContent, largeur: Math.round($('fiche').getBoundingClientRect().width), deborde: c.scrollWidth > c.clientWidth + 1 }; });
  let S = await P();
  const S0 = S; await p.click('[data-see-vue="liens"]'); S = await P();

  // 2. les liens, l'onglet d'office
  const L = S.liens.map(sp).join(' || ').replace(/\s*→\s*/g, ' → ');
  ok('l’écran s’ouvre sur « Import », puis « Liens », « Codes », un onglet par feuille (son nom court, toutes ses lignes)', S0.choisi === 'Import' && S.choisi === 'Liens' && sp(S.onglets) === 'Import | Liens=8 | Codes | EndFittingRules=1 297 | CablesAndWires=748 | ConnectiveEquipments=2 310 | ContactLayouts=229 | Accessories=1 104 | Equipments=7 091 | OBJ_END_Fitting_Rules_Conta=6 000 | OBJ_PlugMapPin=3 000 | OBJ_Wires=1 492 | LNK_Equi_Mating=500 | OBJ_Categories=50 | LNK_EndFitting_ProductFamil=3 000 | SET_ProductFamilies=3', sp(S.onglets));
  ok('les identifiants se relient d’eux-mêmes : les contacts à leur règle, les broches et les connecteurs à leur arrangement, les paires fiche ↔ embase à leurs connecteurs — chaque fois la part retrouvée', [
      'OBJ_END_Fitting_Rules_Conta : IDEquipment → EndFittingRules.IDEquipment 1 297 / 1 297 (100 %)',
      'OBJ_PlugMapPin : IDPlugMap → ContactLayouts.ID 229 / 229 (100 %)',
      'ConnectiveEquipments : IDPlugMap → ContactLayouts.ID 229 / 229 (100 %)',
      'LNK_Equi_Mating : IDSemiEqu → ConnectiveEquipments.IDEquipment 500 / 500 (100 %) / IDConnectedSemiEqu → ConnectiveEquipments.IDEquipment 500 / 500 (100 %)',
      'OBJ_Wires : IDCable 6 % → CablesAndWires.IDEquipment 94 / 94 (100 %)'].every(x => L.includes(x)), L);
  ok('une cible par feuille (l’ID et l’IDEquipment d’une vue sont la même pièce), jusqu’à quatre : la table des familles mène aux connecteurs, aux équipements ET aux règles', !L.includes('ContactLayouts.IDEquipment') && /LNK_EndFitting_ProductFamil : IDEquipment → ConnectiveEquipments\.IDEquipment 1 386 \/ 2 586 \(54 %\)\s*Equipments\.IDEquipment 900 \/ 2 586 \(35 %\)\s*EndFittingRules\.IDEquipment 300 \/ 2 586 \(12 %\)/.test(L), L.slice(L.indexOf('LNK_EndFitting'), L.indexOf('LNK_EndFitting') + 220));
  ok('un renvoi vers sa propre feuille se relie (IDParentCategory : une autre catégorie), son taux dit qu’il manque une ligne', L.includes('OBJ_Categories : IDParentCategory 98 % → OBJ_Categories.ID 17 / 17 (100 %) · sa propre feuille'), L.slice(L.indexOf('OBJ_Categories'), L.indexOf('OBJ_Categories') + 120));
  const Pt = S.petites.map(sp).join(' || ');
  ok('sous les liens, les tables LNK_ et SET_ colonne par colonne : où mènent leurs identifiants, ce qu’elles portent à côté, leurs colonnes vides', S.petites.length === 3 && /^LNK_Equi_Mating 500 lignes : ID = identifiant \| IDSemiEqu = identifiant → ConnectiveEquipments \| IDConnectedSemiEqu = identifiant → ConnectiveEquipments \| Prefered = 1/.test(sp(S.petites[0]))
    && /^LNK_EndFitting_ProductFamil 3 000 lignes : ID = identifiant \| IDEquipment = identifiant → ConnectiveEquipments, Equipments, EndFittingRules \| ProductFamily = EN3645 · EN2997 \| Quantity = 1 \| Comment = vide$/.test(sp(S.petites[1])) && /^SET_ProductFamilies 3 lignes : ID = identifiant \| Name = EN3645 · EN2997$/.test(sp(S.petites[2])) && !/OBJ_Wires/.test(Pt), Pt.slice(0, 400));
  ok('un renvoi qui ne se relie à rien le dit (la table qui le porte manque) ; les clés (ID, l’IDEquipment d’une vue) ne sont pas des lignes', L.includes('Accessories : IDCategory → ne se relie à aucune feuille 7 valeurs') && !/(^|: | \/ )(ID|IDEquipment) → /.test(L.replace(/(OBJ_END_Fitting_Rules_Conta|LNK_EndFitting_ProductFamil) : IDEquipment/g, '')) && sp(S.compte) === '9 renvois d’une feuille à l’autre · 8 reliés, 1 sans cible', sp(S.compte) + ' · ' + L.slice(0, 120));
  ok('la page est large (elle se photographie) et ne déborde pas de côté', S.largeur >= 1100 && !S.deborde, S.largeur + ' px');
  if (CAPTURES) await p.screenshot({ path: CAPTURES + '/see-1-liens.png' });

  // 3. les codes, et le plan ouvert face à SEE
  await p.click('#see-suiv'); S = await P();
  const pl = sp(S.plan);
  ok('« Suivant » : les Codes, et d’abord le plan ouvert face à SEE — ses types de câble (DR16 et BN24 manquent), ses familles (BN manque)', S.choisi === 'Codes'
    && /Types de câble 4 \/ 6 \(67 %\) retrouvés — dans CablesAndWires\.PartNo \(4\)/.test(pl) && /pas trouvés : BN24 · DR16/.test(pl) && /Familles de câble 2 \/ 3 \(67 %\) retrouvés/.test(pl) && /pas trouvés : BN(?![0-9])/.test(pl), pl.slice(0, 260));
  ok('des références du plan, seulement le compte et les colonnes : aucune ne s’affiche', /Références des équipements 1 \/ 24 \(4 %\) retrouvé — dans Equipments\.PartNo \(1\)/.test(pl) && !/MS3320|EN2997Y1|E0599|NSA93/.test(pl), pl.slice(pl.indexOf('Références'), pl.indexOf('Références') + 120));
  ok('les codes : les valeurs et leur nombre de lignes (WireType des contacts, la liste CableTypeList valeur par valeur, ContactGauge, Gender…)', /^DM\(1 500\) · DR\(1 500\) · WX\(1 500\) · YYXE\(1 500\)$/.test(sp(S.codes['OBJ_END_Fitting_Rules_Conta · WireType'] || '')) && /^DM\(1 297\) · DR\(1 297\) · KD\(649\) · MLB\(648\)$/.test(sp(S.codes['EndFittingRules · CableTypeList'] || '')) && /^0\.3257432 AWG 22\(2 000\) · 0\.517952 AWG 20\(2 000\) · 1\.309537 AWG 16\(2 000\)$/.test(sp(S.codes['OBJ_END_Fitting_Rules_Conta · ContactGauge'] || '')) && !!S.codes['ConnectiveEquipments · Gender'], JSON.stringify([S.codes['OBJ_END_Fitting_Rules_Conta · ContactGauge'], S.codes['EndFittingRules · CableTypeList']]));
  ok('deux écritures d’un même flottant ne font qu’un code (0.32574322630000002 en texte = 0.3257432263 ; 0.0099999998 = 0.01), et la gauge AWG d’une section se lit à côté', sp(S.codes['OBJ_END_Fitting_Rules_Conta · WireGauge']) === '0.3257432 AWG 22(4 000) · -1(2 000)' && sp(S.codes['ConnectiveEquipments · Resistance']) === '0.01(1 540) · 0(770)' && !/AWG/.test(S.codes['ConnectiveEquipments · Resistance']), JSON.stringify([S.codes['OBJ_END_Fitting_Rules_Conta · WireGauge'], S.codes['ConnectiveEquipments · Resistance']]));
  ok('qui a fait quoi (CreatorUser…) n’est jamais un code', !Object.keys(S.codes).some(k => /Creator|User/.test(k)), Object.keys(S.codes).join(', ').slice(0, 200));
  if (CAPTURES) await p.screenshot({ path: CAPTURES + '/see-2-codes.png' });

  // 4. une feuille : toutes ses lignes, ses remplies, ses vides ; les exemples se masquent ; l'utilisateur ne se montre pas
  await p.click('#see-suiv'); S = await P();
  ok('« Suivant » : la première feuille, 1 297 lignes, ses colonnes remplies dans l’ordre du fichier, les seize traductions vides à part', S.choisi === 'EndFittingRules' && sp(S.compte) === '1 297 lignes · 25 colonnes : 9 remplies, 16 vides' && S.cols.join() === 'ID,IDEquipment,PartNo,CategoryFullPath,ClassName,CableTypeList,CreatorUser,LCStatusName,Released' && sp(S.vides) === '16 colonnes vides sur toutes les lignes' && S.pos === 'feuille 1 / 13', sp(S.compte));
  ok('chaque colonne : son taux et deux exemples ; les GUID disent « identifiant » ; l’utilisateur, ni exemple ni code', /^E0710 - Plug\/Square Receptacle · E0711 - Plug\/Square Rece/.test(S.ex.PartNo) && /^identifiant · 100 %$/.test(sp(S.ex.ID)) && /^ · 100 %$/.test(sp(S.ex.CreatorUser)), JSON.stringify([S.ex.PartNo, S.ex.CreatorUser]));
  await p.click('#see-ex'); S = await P();
  ok('« Exemples de valeurs » décoché : plus aucune valeur, seulement les noms, les taux et le genre', !Object.values(S.ex).some(v => /E07|Contact ·|Release/.test(v)) && /^oui\/non · 100 %$/.test(sp(S.ex.Released)), JSON.stringify([S.ex.PartNo, S.ex.Released]));
  await p.click('#see-ex');
  await p.click('[data-see-vue="1"]'); S = await P();
  ok('une gauge en mm² montre sa gauge AWG dans les exemples', /^0\.3257 = AWG 22 · 0\.5179 = AWG 20 · 100 %$/.test(sp(S.ex.Gauge)), S.ex.Gauge);
  await p.click('[data-see-vue="5"]'); S = await P();
  ok('Equipments lue en entier : le calibre, rempli seulement après la ligne 5 000, est une colonne remplie (29 %), pas une vide', S.choisi === 'Equipments' && S.cols.includes('Intensity_Nominal') && /^10 · 29 %$/.test(sp(S.ex.Intensity_Nominal)), S.ex.Intensity_Nominal);
  await p.click('[data-see-vue="12"]');
  ok('au dernier onglet, « Suivant » est éteint', await p.evaluate(() => $('see-suiv').disabled && !$('see-prec').disabled));
  if (CAPTURES) await p.screenshot({ path: CAPTURES + '/see-3-feuille.png' });

  // 5. le résumé en texte
  const txt = await p.evaluate(() => resumeSEE());
  ok('le résumé en texte : les liens, le plan face à SEE, les codes, puis chaque feuille', ['== Liens entre feuilles ==', 'OBJ_PlugMapPin.IDPlugMap → ContactLayouts.ID 229/229', 'OBJ_Categories.IDParentCategory → OBJ_Categories.ID 17/17 (sa propre feuille) — rempli sur 49 des 50 lignes', 'OBJ_END_Fitting_Rules_Conta.WireGauge : 0.3257432 (AWG 22) 4000 · -1 2000', 'Accessories.IDCategory → aucune feuille (7 valeurs)', '== Le plan ouvert face à SEE : Contrat d’exemple ==', 'Types de câble : 4/6 retrouvés', 'pas trouvés : BN24, DR16', '== Codes ==', 'OBJ_END_Fitting_Rules_Conta.WireType : DM 1500 · DR 1500 · WX 1500 · YYXE 1500', 'EED_ViewEndFittingRules — 1297 lignes — 25 colonnes, 9 remplies'].every(s => txt.includes(s)) && !/MS3320-10|x45900/.test(txt), txt.split('\n').slice(0, 3).join(' / '));

  // 6. rien n'est gardé ; aussi par la page des normes ; au téléphone ; aucune erreur
  ok('rien de la base n’est gardé dans le navigateur', await p.evaluate(() => { let s = ''; try { for (let i = 0; i < localStorage.length; i++) s += localStorage.getItem(localStorage.key(i)); } catch (_) { } return !/PartNo1|EED_View|IDPlugMap/.test(s); }));
  await p.evaluate(() => { fermerFiche(true); ficheNormes(); }); await p.waitForTimeout(300);
  ok('la page des normes porte « Lire la base SEE »', await p.evaluate(() => !!$('nm-see') && /Lire la base SEE/.test($('nm-see').textContent)));
  await p.evaluate(() => importerNorme(window.__see)); await p.waitForFunction(() => app.fiche && app.fiche.mode === 'see');
  ok('déposé comme une norme, il est résumé aussi — rien n’est importé dans les normes', await p.evaluate(() => !NORMES.import && SEE.vue === 'import' && !BASE_SEE.base));
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400); S = await P();
  ok('au téléphone, la page ne déborde pas de côté', !S.deborde && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  ok('aucune erreur dans la page', !e.length, e.slice(0, 2).join(' | '));


  // 7. L'IMPORT : un petit classeur comme celui du lecteur — des règles (une validée, une obsolète, une en cours, une de
  // cosses), leurs contacts (un qui change Volta, un pareil, un nouveau, un sans fil), deux câbles et leurs conducteurs,
  // deux faces (une EN 2997 que Volta connaît, une EN 3545 qu'il ne connaît pas), des connecteurs du plan ouvert, une paire
  // fiche ↔ embase. Garder, voir la différence, la fiche, le programme, recharger la page, oublier.
  await p.setViewportSize({ width: 1600, height: 1000 }); await p.evaluate(() => { fermerFiche(true); atelier.exemple(); }); await p.waitForTimeout(400);
  const avant = await p.evaluate(() => ({ c: contactDuFil(app.norme, 'EN2997', '20', 'M', 'DR24', 24).reference, k: cableDuType(app.norme, 'DR24').diametre, m: moduleDeReference(app.norme, 'EN2997-002-14-12').note }));
  await p.evaluate(() => {
    const G = s => s + '-0000-4000-8000-000000000000', wb = XLSX.utils.book_new(), f = (rows, nom) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), nom);
    f([['ID', 'IDEquipment', 'PartNo', 'ClassName', 'LCStatusName', 'Version', 'CreatorUser'], [G('A0000001'), G('A0000001'), 'EN2997', 'Contact', 'Release', 7, 'x1'], [G('A0000002'), G('A0000002'), 'EN2997', 'Contact', 'Obsolete', 5, 'x1'],
      [G('A0000003'), G('A0000003'), 'EN3545 - Rectangular', 'Contact', 'In Work', 1, 'x1'], [G('A0000004'), G('A0000004'), 'E0710 - Plug/Square Receptacle', 'Lug_WiresCombination', 'Release', 1, 'x1'],
      [G('A0000005'), G('A0000005'), 'EN3645', 'Contact', 'Release', 2, 'x1']], 'EED_ViewEndFittingRules');
    f([['ID', 'IDEquipment', 'RuleNum', 'ContactType', 'ContactGauge', 'WireType', 'WireGauge', 'PartNo1', 'Quantity1', 'PartNo2', 'Quantity2'],
      [G('C0000001'), G('A0000001'), 100, 'Male', 0.5179520182, '*', 0.2048, 'EN3155-099M2020', 1],
      [G('C0000002'), G('A0000001'), 100, 'Male', 0.5179520182, '*', '0.32574322630000002', 'EN3155-018M2020', 1],
      [G('C0000003'), G('A0000002'), 100, 'Male', 0.5179520182, '*', 0.2048, 'EN3155-777M2020', 1],
      [G('C0000004'), G('A0000001'), 101, 'Female', 0.5179520182, 'DR', 0.5179520182, 'EN3155-019F2020', 1, 'E0718-20-30', 1],
      [G('C0000005'), G('A0000001'), 100, 'Female', 0.5179520182, '*', -2, 'EN3155-050F2020', 1],
      [G('C0000006'), G('A0000003'), 100, 'Male', 0.5179520182, '*', -1, 'EN3155-016M2020', 1],
      [G('C0000007'), G('A0000004'), 100, 'Male', 3.3109, '*', -1, 'NSA936501TA1204', 1],
      [G('C0000008'), G('A0000001'), 102, 'Pin', 0.5179520182, 'DM', 0.2048, 'EN3155-099M2020', 1],
      [G('C0000009'), G('A0000001'), 103, 'Male', 0.4, '*', -1, 'EN3155-001M2020', 1],
      [G('C0000010'), G('A0000005'), 100, 'Male', 8.3656, 'WH', -1, 'E0613KB0800', 1]], 'EED_OBJ_END_Fitting_Rules_Conta');
    f([['ID', 'IDEquipment', 'PartNo', 'Type', 'Gauge', 'ExternalMaxDiameter', 'LineicWeight', 'Shield', 'CableFamily', 'LCStatusName', 'Version', 'EPFList'],
      [G('K0000001'), G('K0000001'), 'DR24', 'DR', 0.2048, 0.0011, 0.00175, 'UNSHIELDED', 'Wire', 'Release', 2, 'EC225,NH90'],
      [G('K0000002'), G('K0000002'), 'ZZ20', 'ZZ', 0.5179520182, 0.0042, 0.0251, 'SHIELDED', 'Cable', 'Release', 1, 'EC225'],
      [G('K0000003'), G('K0000003'), 'DRB8', 'DRB', '', 0.0088, 0.1854, '', '', 'Release', 1, 'EC225'],
      [G('K0000004'), G('K0000004'), 'DR6', 'DR', 13.3, 0.0057, 2.08, 'UNSHIELDED', 'Wire', 'Release', 1, 'EC225']], 'EED_ViewCablesAndWires');
    f([['ID', 'IDCable', 'Gauge', 'SectionInMM', 'Resistivity', 'CreatorUser'], [G('W0000001'), '', 0.2048, 0.0000002, 0.0912, 'x'], [G('W0000002'), '', 0.5179, 0.0000005, 0.0349, 'x'], [G('W0000003'), '', 0.5179, 0.0000005, 0.0351, 'x']], 'EED_OBJ_Wires');
    f([['ID', 'IDEquipment', 'IDWire'], [G('B0000001'), G('K0000001'), G('W0000001')], [G('B0000002'), G('K0000002'), G('W0000002')], [G('B0000003'), G('K0000002'), G('W0000003')]], 'EED_LNK_Wires_Equi');
    f([['ID', 'IDEquipment', 'PartNo', 'Type', 'View', 'LCStatusName', 'CategoryFullPath'], [G('L0000001'), G('L0000001'), 'EN2997_14-12', 'Circular', 'Front', 'Release', 'prEN2997-001P2'], [G('L0000002'), G('L0000002'), 'EN3545_A10', 'Rectangular', 'Front', 'Release', 'prEN3545-001P2'],
      [G('L0000003'), G('L0000003'), 'EN2997_08-03', 'Circular', 'Front', 'Release', 'prEN2997-001P2']], 'EED_ViewContactLayouts');
    const pins = [['ID', 'IDPlugMap', 'Name', 'X', 'Y', 'ContactGauge', 'ContactFamily', 'CablingOrder']];
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; pins.push([G('P' + String(i).padStart(7, '0')), G('L0000001'), String(i + 1), i < 3 ? 0.0012 * Math.sin(a * 4) : 0.004 * Math.sin(a), i < 3 ? 0.0012 * Math.cos(a * 4) : 0.004 * Math.cos(a), i < 3 ? 1.3095370853 : 0.5179520182, 'Standard', i + 1]); }
    for (let i = 0; i < 10; i++) pins.push([G('Q' + String(i).padStart(7, '0')), G('L0000002'), String(i + 1), (i % 5) * 0.0025, i < 5 ? 0 : -0.0025, 0.5179520182, 'Standard', i + 1]);
    ['A', 'B', 'C'].forEach((n, i) => pins.push([G('R' + String(i).padStart(7, '0')), G('L0000003'), n, 0.0012 * Math.sin(i * 2.1), 0.0012 * Math.cos(i * 2.1), 0.5179520182, 'Standard', i + 1]));
    f(pins, 'EED_OBJ_PlugMapPin');
    const V = verite(), pn = r => (V.find(l => l.pnDe && l.pnDe.startsWith(r)) || V.find(l => l.pnVers && l.pnVers.startsWith(r)) || {}).pnDe || r;
    window.__pns = ['MS3470L14-5P', 'EN2997Y1A08P', 'EN3646A6083AAN'];
    f([['ID', 'IDEquipment', 'PartNo', 'Description', 'ConnectivityType', 'Gender', 'DesiredPinsCount', 'EPFList', 'LCStatusName', 'PartNoStandard1', 'CategoryFullPath', 'CreatorUser'],
      [G('E0000001'), G('E0000001'), 'MS3470L14-5P', 'Plug MS 14-5', 'Plug', 'Pin', 5, 'EC225,NH90', 'Release', '', '01. Connectors \\ MIL-C-26482', 'x'],
      [G('E0000002'), G('E0000002'), 'EN2997Y1A08P', 'Receptacle EN 2997', 'Receptacle', 'Pin', 3, 'NH90', 'Release', '', '01. Connectors \\ EN2997', 'x'],
      [G('E0000003'), G('E0000003'), 'EN3646A6083AAN', 'Plug EN 3646', 'Plug', 'Socket', 3, 'EC225', 'Obsolete', '', '01. Connectors \\ EN3646', 'x'],
      [G('E0000004'), G('E0000004'), 'MS3476L14-5S', 'Receptacle MS 14-5', 'Receptacle', 'Socket', 5, 'EC225', 'Release', '', '01. Connectors \\ MIL-C-26482', 'x']], 'EED_ViewConnectiveEquipments');
    f([['ID', 'IDEquipment', 'PartNo', 'Description', 'EquipmentType', 'EPFList', 'LCStatusName'], [G('F0000001'), G('F0000001'), 'MS3320-10', 'Circuit breaker 10 A', 'Circuit Breaker', 'EC225', 'Release']], 'EED_ViewEquipments');
    f([['ID', 'IDSemiEqu', 'IDConnectedSemiEqu', 'Prefered'], [G('M0000001'), G('E0000001'), G('E0000004'), 1]], 'EED_LNK_Equi_Mating');
    window.__see2 = new File([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], 'base-SEE-2.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); });
  await p.evaluate(() => ouvrirFichier(window.__see2)); await p.waitForFunction(() => app.fiche && app.fiche.mode === 'see' && SEE.import && SEE.import.nom === 'base-SEE-2.xlsx');
  const I = await p.evaluate(() => { const I = SEE.import, C = comparaisonSEE(I), c = $('fiche-corps');
    return { contacts: I.contacts.map(x => [x.famille, x.sexe, x.taille, x.typeFil, x.jauge, x.reference, x.accessoire, x.statut].join('/')), cables: I.cables.map(x => [x.cable, x.diametre, x.masse, x.resistance, x.brins, x.blindage, x.liaisons].join('/')),
      modules: I.modules.map(x => x.famille + '/' + x.variante + '/' + x.taille + '/' + x.groupes.split('|').length + '/' + x.corps), eq: I.equipements.length, b: I.bilan.contacts, prog: I.programmes.map(x => x.join(' ')).join(', '),
      diff: { c: [C.contacts.remplacees.length, C.contacts.nouvelles.length, C.contacts.identiques.length], k: [C.cables.remplacees.length, C.cables.nouvelles.length, C.cables.identiques.length], m: [C.modules.remplacees.length, C.modules.redessinees.length, C.modules.nouvelles.length] },
      premiers: { k: C.cables.remplacees.map(r => r.apres.cable).join(','), c: C.contacts.remplacees.map(r => r.apres.reference).join(',') }, ill: I.bilan.contacts.illisibles,
      vue: SEE.vue, texte: c.querySelector('.see-import') ? c.querySelector('.see-import').textContent.replace(/\s+/g, ' ') : '', garder: !!$('see-garder'), base: !!BASE_SEE.base }; });
  ok('l’import prend les contacts des règles validées (la gauge en mm² lue en AWG, « * » et −1 : tout), « à confirmer » celles en cours ; ni l’obsolète, ni la règle de cosses, ni la ligne sans fil',
    I.contacts.join('|') === 'EN2997/M/20/*/24/EN3155-099M2020//|EN2997/M/20/*/22/EN3155-018M2020//|EN2997/F/20/DR/20/EN3155-019F2020/E0718-20-30/|EN3545/M/20/*/*/EN3155-016M2020//à confirmer|EN2997/M/20/DM/24/EN3155-099M2020//|EN3645/M/8/WH/*/E0613KB0800//'
    && I.b.obsoletes === 1 && I.b.autres.Lug_WiresCombination === 1 && I.b.sansFil === 1, I.contacts.join(' | ') + ' · ' + JSON.stringify(I.b));
  ok('les câbles : Ø et masse en mm et g/m, la résistance de leurs conducteurs reliés (mΩ/m), les brins, le blindage', I.cables.join('|') === 'DR24/1.1/1.75/91.2/1/0/1|ZZ20/4.2/25.1/35.1/2/1/3|DRB8/8.8/185.4////1|DR6/5.7/2.08///0/1', I.cables.join(' | '));
  ok('les faces : l’EN 2997 14-12 (douze contacts, trois de taille 16, ronde) et l’EN 3545 A10 que Volta ne connaissait pas (rectangulaire)', I.modules.join('|') === 'EN2997/14-12/20/12/circulaire|EN3545/A10/20/10/rectangle|EN2997/08-03/20/3/circulaire', I.modules.join(' | '));
  ok('les équipements et les programmes de SEE', I.eq === 5 && I.prog === 'EC225 4, NH90 2', I.eq + ' · ' + I.prog);
  ok('la différence avec Volta : deux contacts remplacent les leurs, un pareil, trois nouveaux ; deux câbles remplacent, un nouveau, un pareil ; une face remplace, une redessinée, une nouvelle', JSON.stringify(I.diff) === '{"c":[2,3,1],"k":[2,1,1],"m":[1,1,1]}', JSON.stringify(I.diff));
  // la vraie base du lecteur (octobre 2026) : « nature : torsadé → — » sur des dizaines de câbles, une masse divisée par 65
  ok('ce que SEE laisse vide, Volta le garde : DRB8 (ni conducteur, ni blindage, ni nature dans SEE) reste torsadé à deux brins — identique', I.premiers.k.split(',').indexOf('DRB8') < 0 && !/DRB8/.test(I.texte), I.premiers.k);
  ok('un écart d’un facteur 2 ou plus se voit en tête, à vérifier dans SEE (DR6 : 135 g/m → 2,08 g/m)', I.premiers.k.split(',')[0] === 'DR6' && /1 écart à vérifier/.test(sp(I.texte)) && /DR6\s*masse\s*135 g\/m\s*→\s*2,08 g\/m\s*65 fois moins · à vérifier dans SEE/.test(sp(I.texte)), I.premiers.k + ' · ' + (sp(I.texte).match(/Câbles.{0,200}/) || [''])[0]);
  ok('un nom écrit en entier par SEE (KB0800 → E0613KB0800) se dit tel, à la fin', I.premiers.c === 'EN3155-099M2020,E0613KB0800' && /dont 1 nom écrit en entier/.test(sp(I.texte)) && /nom complet\s*KB0800\s*→\s*E0613KB0800/.test(sp(I.texte)), I.premiers.c);
  ok('les faces : le dessin ne compte plus (toute face de SEE est à l’échelle) ; les noms qui diffèrent se montrent', /1 face redessinée à l’échelle, mêmes contacts/.test(sp(I.texte)) && /08-03\s*noms\s*1 2 3\s*→\s*A B C/.test(sp(I.texte)) && !/relevée sur la figure/.test(I.texte), (sp(I.texte).match(/Faces des connecteurs.{0,160}/) || [''])[0]);
  ok('« Pin » se lit mâle ; une cavité illisible se montre par sa valeur', I.contacts.includes('EN2997/M/20/DM/24/EN3155-099M2020//') && JSON.stringify(I.ill) === '{"cavité 0,4 mm²":1}' && /cavité 0,4 mm² \(1\)/.test(sp(I.texte)), JSON.stringify(I.ill));
  ok('l’onglet Import s’ouvre d’office : il dit ce que Volta prend, barre ce que disait Volta, propose « Garder dans Volta » — rien n’est encore gardé',
    I.vue === 'import' && I.garder && !I.base && /EN3155-018M2020\s*→\s*EN3155-099M2020/.test(I.texte) && /0,96 mm\s*→\s*1,1 mm/.test(sp(I.texte)) && /1 règle obsolète ignorée/.test(sp(I.texte)) && /Lug_WiresCombination/.test(I.texte), sp(I.texte).slice(300, 900));
  ok('tant qu’elle n’est pas gardée, Volta ne s’en sert pas', await p.evaluate(a => contactDuFil(app.norme, 'EN2997', '20', 'M', 'DR24', 24).reference === a, avant.c));
  if (CAPTURES) await p.screenshot({ path: CAPTURES + '/see-4-import.png' });
  await p.click('#see-garder'); await p.waitForFunction(() => !!BASE_SEE.base);
  const A = await p.evaluate(() => { const c = contactDuFil(app.norme, 'EN2997', '20', 'M', 'DR24', 24), k = cableDuType(app.norme, 'DR24'), m = moduleDeReference(app.norme, 'EN2997-002-14-12');
    return { c: c.reference, cs: c.source, dc: differenceSEEMots('contacts', c), k: k.diametre, dk: differenceSEEMots('cables', k), m: m && [m.reference, m.contacts.length, m.note.slice(0, 40), m.contacts.filter(x => x.taille === '16').length], n3545: normeDesModules(app.norme).modules.filter(x => x.famille === 'EN3545').length,
      z: !!cableDuType(app.norme, 'ZZ20'), drb8: (x => x && [x.nature, x.brins, x.resistance, x.blindage, /de Volta : brins, nature, resistance/.test(x.note)].join('/'))(cableDuType(app.norme, 'DRB8')), dr6: cableDuType(app.norme, 'DR6').masse, etat: ($('fiche-corps').querySelector('.see-etat') || {}).textContent || '', oublier: !!$('see-oublier') }; });
  ok('gardée : SEE passe devant Volta — le contact, le câble, la face (qui garde la désignation de Volta), la famille nouvelle', A.c === 'EN3155-099M2020' && A.cs === 'SEE' && A.k === 1.1 && A.m[0] === 'EN2997-002-14-12' && A.m[1] === 12 && /^face SEE EN2997_14-12/.test(A.m[2]) && A.m[3] === 3 && A.n3545 === 1 && A.z && /Gardée sur ce PC/.test(A.etat) && A.oublier, JSON.stringify(A));
  ok('gardée : la case vide de SEE prend la valeur de Volta (DRB8 torsadé, deux brins, sa résistance, la note le dit) ; l’écart suspect passe quand même (SEE gagne)', A.drb8 === 'torsadé/2/2.37/false/true' && A.dr6 === 2.08, A.drb8 + ' · ' + A.dr6);
  ok('ce que disait Volta reste dit, ligne par ligne (la fiche le montre en bulle)', /contact EN3155-018M2020 → EN3155-099M2020/.test(A.dc) && /Ø 0,96 → 1,1/.test(A.dk.replace(/ mm/g, '')), A.dc + ' · ' + A.dk);
  // le programme : EC225 ; le connecteur NH90 seul est « pas déclaré pour EC225 », l'obsolète l'est dit, l'absent aussi
  await p.selectOption('#see-prog', 'EC225'); await p.waitForTimeout(200);
  const Pg = await p.evaluate(() => ({ p: programmeSEE(), t: ($('fiche-corps').querySelector('.see-table') || {}).textContent || '', a: ['EN2997Y1A08P', 'EN3646A6083AAN', 'MS3470L14-5P', 'E0644D9S'].map(x => alertesSEE(equipementSEE(x), x).map(y => y.texte).join('+') || 'rien') }));
  ok('le programme se choisit (EC225) : ce qui n’y est pas déclaré, ce qui est obsolète, ce qui manque à SEE se dit', Pg.p === 'EC225' && /Hors EC225/.test(Pg.t) && Pg.a.join(' | ') === 'pas déclarée pour EC225 dans SEE | obsolète dans SEE | rien | absente de la base SEE', Pg.a.join(' | '));
  // la fiche d'un équipement : la ligne SEE de la référence de son connecteur, ce qui s'y accouple
  const Fi = await p.evaluate(() => { fermerFiche(true); const d = document.createElement('div'); d.innerHTML = ficheEquipement('101BT1'); const s = d.querySelector('.fi-see'); return s ? s.textContent.replace(/\s+/g, ' ') : ''; });
  ok('la fiche d’un équipement dit ce que SEE sait de la référence de son connecteur : la désignation, fiche ou embase, ce qui s’y accouple', /Plug MS 14-5/.test(Fi) && /fiche \(prise mobile\)/.test(Fi) && /broches/.test(Fi) && /se monte avec MS3476L14-5S/.test(Fi), Fi);
  // recharger la page : la base revient d'elle-même ; puis l'oublier
  await p.reload(); await p.waitForFunction(() => typeof atelier !== 'undefined'); await p.waitForFunction(() => BASE_SEE.charge); await p.evaluate(() => atelier.exemple()); await p.waitForTimeout(300);
  ok('la page rechargée : la base SEE gardée revient et passe devant Volta, le programme aussi', await p.evaluate(() => !!BASE_SEE.base && contactDuFil(app.norme, 'EN2997', '20', 'M', 'DR24', 24).reference === 'EN3155-099M2020' && programmeSEE() === 'EC225'));
  await p.evaluate(() => ficheBaseSEE()); await p.waitForFunction(() => app.fiche && app.fiche.mode === 'see');
  const G0 = await p.evaluate(() => ({ onglets: [...$('fiche-corps').querySelectorAll('[data-see-vue]')].map(b => b.textContent).join(','), t: ($('fiche-corps').querySelector('.see-etat') || {}).textContent || '' }));
  ok('sans classeur lu, la base gardée se montre seule (l’onglet Import)', G0.onglets === 'Import' && /Gardée sur ce PC/.test(G0.t), JSON.stringify(G0));
  if (CAPTURES) await p.screenshot({ path: CAPTURES + '/see-5-gardee.png' });
  await p.click('#see-oublier'); await p.waitForFunction(() => !BASE_SEE.base);
  ok('« Oublier la base SEE » : Volta revient à ses tables, la page se ferme, rien ne reste', await p.evaluate(a => contactDuFil(app.norme, 'EN2997', '20', 'M', 'DR24', 24).reference === a && !(app.fiche && app.fiche.mode === 'see'), avant.c)
    && await p.evaluate(async () => !(await idbSEEFaire('readonly', s => s.get('base')))));
  ok('aucune erreur dans la page, après l’import', !e.length, e.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x));
  const ko = R.filter(x => x.startsWith('  KO')).length;
  console.log('\n  ' + (R.length - ko) + ' / ' + R.length + (ko ? '  — ' + ko + ' PROBLÈME(S)' : '  — tout tient'));
  await b.close(); process.exit(ko ? 1 : 0);
})();
