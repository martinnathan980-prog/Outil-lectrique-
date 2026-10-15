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

  // 2. les liens, l'onglet d'office
  const L = S.liens.map(sp).join(' || ').replace(/\s*→\s*/g, ' → ');
  ok('l’écran s’ouvre sur « Liens », puis « Codes », puis un onglet par feuille (son nom court, toutes ses lignes)', S.choisi === 'Liens' && sp(S.onglets) === 'Liens=8 | Codes | EndFittingRules=1 297 | CablesAndWires=748 | ConnectiveEquipments=2 310 | ContactLayouts=229 | Accessories=1 104 | Equipments=7 091 | OBJ_END_Fitting_Rules_Conta=6 000 | OBJ_PlugMapPin=3 000 | OBJ_Wires=1 492 | LNK_Equi_Mating=500 | OBJ_Categories=50 | LNK_EndFitting_ProductFamil=3 000 | SET_ProductFamilies=3', sp(S.onglets));
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
  ok('déposé comme une norme, il est résumé aussi — rien n’est importé dans les normes', await p.evaluate(() => !NORMES.import && SEE.vue === 'liens'));
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400); S = await P();
  ok('au téléphone, la page ne déborde pas de côté', !S.deborde && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  ok('aucune erreur dans la page', !e.length, e.slice(0, 2).join(' | '));

  R.forEach(x => console.log(x));
  const ko = R.filter(x => x.startsWith('  KO')).length;
  console.log('\n  ' + (R.length - ko) + ' / ' + R.length + (ko ? '  — ' + ko + ' PROBLÈME(S)' : '  — tout tient'));
  await b.close(); process.exit(ko ? 1 : 0);
})();
