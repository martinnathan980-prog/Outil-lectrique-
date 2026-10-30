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
     5. le résumé en texte porte tout ; rien n'est gardé, aucune erreur ;
     6-7. l'IMPORT d'un petit classeur : ce que Volta prend, la différence, la
        source vérifiée qui gagne, garder, recharger, oublier ;
     8. la COHÉRENCE (le lecteur, 20 octobre 2026 : « Tout est correct ? ») : un
        classeur de lignes saines et d'un défaut planté par contrôle — chacun
        trouvé, compté juste, avec sa référence ; aucune ligne saine en exemple ;
        ce qui se contredit écarté ; l'onglet, ses exemples, le rapport en texte
        (ni le plan, ni le classeur, ni les programmes) ; gardée, la cohérence
        revient ; et les tables de Volta passées comme des lignes de SEE : rien.
   ========================================================================= */
const { chromium } = require('playwright');
const { fichierDemande } = require('./pilote');
const FICHIER = fichierDemande(), CAPTURES = process.env.CAPTURES || '';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 } }); p.setDefaultTimeout(120000);
  const e = []; p.on('pageerror', x => e.push(x.message));
  const R = []; const ok = (n, c, d) => R.push((c ? '  ok   ' : '  KO   ') + n + (d ? '   ' + d : ''));
  await p.goto(FICHIER); await p.waitForFunction(() => typeof atelier !== 'undefined'); await p.evaluate(() => atelier.exempleSansCalibreAuto()); await p.waitForTimeout(600);
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
  ok('déposé comme une installation (ouvrirFichier), il est reconnu à ses feuilles EED_… et résumé, sans toucher au contrat ouvert', await p.evaluate(n0 => app.contrat.liaisons.length === n0 && app.nom === 'Contrat d’exemple', n0), Math.round(taille / 1024) + ' Ko lus en ' + ms + ' ms');
  ok('treize feuilles lues en entier (une à la fois) et vérifiées ligne par ligne, en moins de 30 s (SheetJS seul en prend 8 à 13 sur une machine partagée)', ms < 30000 && await p.evaluate(() => SEE.lu.feuilles.length === 13 && SEE.lu.feuilles.find(f => f.nom === 'EED_ViewEquipments').lignes === 7091 && SEE.lu.feuilles.find(f => f.nom === 'EED_OBJ_END_Fitting_Rules_Conta').lignes === 6000), ms + ' ms');

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
  ok('l’écran s’ouvre sur « Import », puis « Cohérence » (ses contrôles à reprendre), « Liens », « Codes », un onglet par feuille (son nom court, toutes ses lignes)', S0.choisi === 'Import' && S.choisi === 'Liens' && sp(S.onglets) === 'Import | Cohérence=11 | Liens=8 | Codes | EndFittingRules=1 297 | CablesAndWires=748 | ConnectiveEquipments=2 310 | ContactLayouts=229 | Accessories=1 104 | Equipments=7 091 | OBJ_END_Fitting_Rules_Conta=6 000 | OBJ_PlugMapPin=3 000 | OBJ_Wires=1 492 | LNK_Equi_Mating=500 | OBJ_Categories=50 | LNK_EndFitting_ProductFamil=3 000 | SET_ProductFamilies=3', sp(S.onglets));
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
  ok('« Suivant » : les Codes, et d’abord le plan ouvert face à SEE — ses types de câble (DR12, DR16 et BN24 manquent), ses familles (BN manque)', S.choisi === 'Codes'
    && /Types de câble 4 \/ 7 \(57 %\) retrouvés — dans CablesAndWires\.PartNo \(4\)/.test(pl) && /pas trouvés : BN24 · DR12 · DR16/.test(pl) && /Familles de câble 2 \/ 3 \(67 %\) retrouvés/.test(pl) && /pas trouvés : BN(?![0-9])/.test(pl), pl.slice(0, 260));
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
  ok('le résumé en texte : les liens, le plan face à SEE, les codes, puis chaque feuille', ['== Liens entre feuilles ==', 'OBJ_PlugMapPin.IDPlugMap → ContactLayouts.ID 229/229', 'OBJ_Categories.IDParentCategory → OBJ_Categories.ID 17/17 (sa propre feuille) — rempli sur 49 des 50 lignes', 'OBJ_END_Fitting_Rules_Conta.WireGauge : 0.3257432 (AWG 22) 4000 · -1 2000', 'Accessories.IDCategory → aucune feuille (7 valeurs)', '== Le plan ouvert face à SEE : Contrat d’exemple ==', 'Types de câble : 4/7 retrouvés', 'pas trouvés : BN24, DR12, DR16', '== Codes ==', 'OBJ_END_Fitting_Rules_Conta.WireType : DM 1500 · DR 1500 · WX 1500 · YYXE 1500', 'EED_ViewEndFittingRules — 1297 lignes — 25 colonnes, 9 remplies'].every(s => txt.includes(s)) && !/MS3320-10|x45900/.test(txt), txt.split('\n').slice(0, 3).join(' / '));

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
  await p.setViewportSize({ width: 1600, height: 1000 }); await p.evaluate(() => { fermerFiche(true); atelier.exempleSansCalibreAuto(); }); await p.waitForTimeout(400);
  const avant = await p.evaluate(() => ({ c: contactDuFil(app.norme, 'EN2997', '20', 'M', 'DR24', 24).reference, c16: contactDuFil(app.norme, 'EN3645', '16', 'M', 'XE16', 16).reference, k: cableDuType(app.norme, 'DR24').diametre, m: moduleDeReference(app.norme, 'EN2997-002-14-12').note }));
  await p.evaluate(() => {
    const G = s => s + '-0000-4000-8000-000000000000', wb = XLSX.utils.book_new(), f = (rows, nom) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), nom);
    f([['ID', 'IDEquipment', 'PartNo', 'ClassName', 'LCStatusName', 'Version', 'CreatorUser'], [G('A0000001'), G('A0000001'), 'EN2997', 'Contact', 'Release', 7, 'x1'], [G('A0000002'), G('A0000002'), 'EN2997', 'Contact', 'Obsolete', 5, 'x1'],
      [G('A0000003'), G('A0000003'), 'EN3545 - Rectangular', 'Contact', 'In Work', 1, 'x1'], [G('A0000004'), G('A0000004'), 'E0710 - Plug/Square Receptacle', 'Lug_WiresCombination', 'Release', 1, 'x1'],
      [G('A0000005'), G('A0000005'), 'EN3645', 'Contact', 'Release', 2, 'x1'], [G('A0000006'), G('A0000006'), 'E0710 - Plug/Square Receptacle', 'Contact', 'Release', 1, 'x1']], 'EED_ViewEndFittingRules');
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
      [G('C0000010'), G('A0000005'), 100, 'Male', 8.3656, 'WH', -1, 'E0613KB0800', 1],
      [G('C0000012'), G('A0000005'), 100, 'Male', 1.3095370853, 'XE', -1, 'ECS0000M1600', 1],
      [G('C0000011'), G('A0000006'), 100, 'Female', -1, '*', -1, 'E0711-20XX', 1],
      // la deuxième passe de corroboration : un autre contact qui convient aussi (fût 18 pour un 20 AWG), un manchon E0718 en moins — SEE gagne
      [G('C0000013'), G('A0000001'), 104, 'Male', 0.5179520182, '*', 0.5179520182, 'EN3155-018M2018', 1], [G('C0000014'), G('A0000001'), 105, 'Female', 0.5179520182, '*', 0.1287, 'EN3155-019F2022', 1]], 'EED_OBJ_END_Fitting_Rules_Conta');
    f([['ID', 'IDEquipment', 'PartNo', 'Type', 'Gauge', 'ExternalMaxDiameter', 'LineicWeight', 'Shield', 'CableFamily', 'LCStatusName', 'Version', 'EPFList'],
      [G('K0000001'), G('K0000001'), 'DR24', 'DR', 0.2048, 0.0011, 0.00175, 'UNSHIELDED', 'Wire', 'Release', 2, 'EC225,NH90'],
      [G('K0000002'), G('K0000002'), 'ZZ20', 'ZZ', 0.5179520182, 0.0042, 0.0251, 'SHIELDED', 'Cable', 'Release', 1, 'EC225'],
      [G('K0000003'), G('K0000003'), 'DRB8', 'DRB', '', 0.0088, 0.1854, '', '', 'Release', 1, 'EC225'],
      [G('K0000004'), G('K0000004'), 'DR6', 'DR', 13.3, 0.0057, 2.08, 'UNSHIELDED', 'Wire', 'Release', 1, 'EC225']], 'EED_ViewCablesAndWires');
    f([['ID', 'IDCable', 'Gauge', 'SectionInMM', 'Resistivity', 'CreatorUser'], [G('W0000001'), '', 0.2048, 0.0000002, 0.0912, 'x'], [G('W0000002'), '', 0.5179, 0.0000005, 0.0349, 'x'], [G('W0000003'), '', 0.5179, 0.0000005, 0.0351, 'x']], 'EED_OBJ_Wires');
    f([['ID', 'IDEquipment', 'IDWire'], [G('B0000001'), G('K0000001'), G('W0000001')], [G('B0000002'), G('K0000002'), G('W0000002')], [G('B0000003'), G('K0000002'), G('W0000003')]], 'EED_LNK_Wires_Equi');
    f([['ID', 'IDEquipment', 'PartNo', 'Type', 'View', 'LCStatusName', 'CategoryFullPath'], [G('L0000001'), G('L0000001'), 'EN2997_14-12', 'Circular', 'Front', 'Release', 'prEN2997-001P2'], [G('L0000002'), G('L0000002'), 'EN3545_A10', 'Rectangular', 'Front', 'Release', 'prEN3545-001P2'],
      [G('L0000003'), G('L0000003'), 'EN2997_08-03', 'Circular', 'Front', 'Release', 'prEN2997-001P2'], [G('L0000004'), G('L0000004'), 'EN3646_18-11', 'Circular', 'Front', 'Release', 'prEN3646-001P2'],
      [G('L0000005'), G('L0000005'), 'EN3645_23N55', 'Circular', 'Front', 'Release', 'prEN3645-001P2'], [G('L0000006'), G('L0000006'), 'EN2997_10-02', 'Circular', 'Front', 'Release', 'prEN2997-001P2']], 'EED_ViewContactLayouts');
    const pins = [['ID', 'IDPlugMap', 'Name', 'X', 'Y', 'ContactGauge', 'ContactFamily', 'CablingOrder']];
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; pins.push([G('P' + String(i).padStart(7, '0')), G('L0000001'), String(i + 1), i < 3 ? 0.0012 * Math.sin(a * 4) : 0.004 * Math.sin(a), i < 3 ? 0.0012 * Math.cos(a * 4) : 0.004 * Math.cos(a), i < 3 ? 1.3095370853 : 0.5179520182, 'Standard', i + 1]); }
    for (let i = 0; i < 10; i++) pins.push([G('Q' + String(i).padStart(7, '0')), G('L0000002'), String(i + 1), (i % 5) * 0.0025, i < 5 ? 0 : -0.0025, 0.5179520182, 'Standard', i + 1]);
    ['A', 'B', 'C'].forEach((n, i) => pins.push([G('R' + String(i).padStart(7, '0')), G('L0000003'), n, 0.0012 * Math.sin(i * 2.1), 0.0012 * Math.cos(i * 2.1), 0.5179520182, 'Standard', i + 1]));
    // la casse de SEE (la vraie base) : c e f k m w z en minuscules, le reste en majuscules — une 18-11 et une 23N55 aux places
    // de la norme ; une 10-02 où deux broches portent le même nom
    const casseSEE = l => /^[cefkmwz]$/i.test(l) ? l.toLowerCase() : l.toUpperCase(), mm2 = { 20: 0.5179520182, 16: 1.3095370853, 12: 3.3087, 22: 0.3243 }; let np = 0;
    [['L0000004', 'EN3646', '18-11'], ['L0000005', 'EN3645', '23N55']].forEach(([id, fam, v]) => normeDesModules(app.norme).modules.find(m => m.famille === fam && m.variante === v).contacts.forEach((c, i) =>
      pins.push([G('T' + String(np++).padStart(7, '0')), G(id), casseSEE(c.lettre), (c.c + 0.5) / 1000, -(c.r + 0.5) / 1000, mm2[c.taille] || 0.5179520182, 'Standard', i + 1])));
    [[-0.001, 0], [0.001, 0]].forEach(([x, y], i) => pins.push([G('U' + String(i).padStart(7, '0')), G('L0000006'), '1', x, y, 0.5179520182, 'Standard', i + 1]));
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
      diff: { c: [C.contacts.remplacees.length, C.contacts.nouvelles.length, C.contacts.identiques.length, C.contacts.verifiees.length], k: [C.cables.remplacees.length, C.cables.nouvelles.length, C.cables.identiques.length, C.cables.verifiees.length], m: [C.modules.remplacees.length, C.modules.redessinees.length, C.modules.nouvelles.length, C.modules.verifiees.length] },
      premiers: { k: C.cables.remplacees.map(r => r.apres.cable).join(','), c: C.contacts.remplacees.map(r => r.apres.reference).join(','), v: ['contacts', 'cables', 'modules'].map(t => C[t].verifiees.map(r => titreLigneSEE(t, r.avant)).join(',')).join(' / ') }, ill: I.bilan.contacts.illisibles,
      casse: [C.modules.casse, C.modules.gardees.join(','), C.modules.doublons].join('/'), toute: I.bilan.contacts.touteTaille,
      vue: SEE.vue, texte: c.querySelector('.see-import') ? c.querySelector('.see-import').textContent.replace(/\s+/g, ' ') : '', bulles: [...c.querySelectorAll('.see-import .see-suspect, .see-import .see-garde')].map(x => x.title).join(' | '), garder: !!$('see-garder'), base: !!BASE_SEE.base }; });
  ok('l’import prend les contacts des règles validées (la gauge en mm² lue en AWG, « * » et −1 : tout), « à confirmer » celles en cours ; ni l’obsolète, ni la règle de cosses, ni la ligne sans fil',
    I.contacts.join('|') === 'EN2997/M/20/*/24/EN3155-099M2020//|EN2997/M/20/*/22/EN3155-018M2020//|EN2997/F/20/DR/20/EN3155-019F2020/E0718-20-30/|EN3545/M/20/*/*/EN3155-016M2020//à confirmer|EN2997/M/20/DM/24/EN3155-099M2020//|EN3645/M/8/WH/*/E0613KB0800//|EN3645/M/16/XE/*/ECS0000M1600//|E0710/F/*/*/*/E0711-20XX//|EN2997/M/20/*/20/EN3155-018M2018//|EN2997/F/20/*/26/EN3155-019F2022//'
    && I.b.obsoletes === 1 && I.b.autres.Lug_WiresCombination === 1 && I.b.sansFil === 1, I.contacts.join(' | ') + ' · ' + JSON.stringify(I.b));
  ok('les câbles : Ø et masse en mm et g/m, la résistance de leurs conducteurs reliés (mΩ/m), les brins, le blindage', I.cables.join('|') === 'DR24/1.1/1.75/91.2/1/0/1|ZZ20/4.2/25.1/35.1/2/1/3|DRB8/8.8/185.4////1|DR6/5.7/2.08///0/1', I.cables.join(' | '));
  ok('les faces : l’EN 2997 14-12 (douze contacts, trois de taille 16, ronde) et l’EN 3545 A10 que Volta ne connaissait pas (rectangulaire)', I.modules.join('|') === 'EN2997/14-12/20/12/circulaire|EN3545/A10/20/10/rectangle|EN2997/08-03/20/3/circulaire|EN3646/18-11/16/11/circulaire|EN3645/23N55/20/55/circulaire|EN2997/10-02/20/2/circulaire', I.modules.join(' | '));
  ok('les équipements et les programmes de SEE', I.eq === 5 && I.prog === 'EC225 4, NH90 2', I.eq + ' · ' + I.prog);
  // la source vérifiée gagne (le lecteur, 20 octobre 2026 : « quand SEE contredit une ligne avec des sources vérifiées, on
  // prend les sources vérifiées ») : le contact EN 2997 et les câbles DR (deux sources), les faces EN 2997 (MIL-STD-1554A)
  ok('la différence avec Volta : quatre contacts remplacent les leurs (KB1600, « à confirmer » ; KB0800 écrit en entier ; un autre contact qui convient aussi et un manchon en moins, contre des lignes vérifiées), quatre nouveaux, un pareil, un que la source vérifiée garde (sa partie -099 n’existe pas) ; aucun câble ne remplace (DR24 vérifié, DR6 impossible), un nouveau, un pareil ; aucune face ne remplace (08-03 et 14-12 : la norme les vérifie), deux redessinées, une nouvelle',
    JSON.stringify(I.diff) === '{"c":[4,4,1,1],"k":[0,1,1,2],"m":[0,2,1,2]}' && I.premiers.v === 'EN 2997-002 · mâle · taille 20 · tout câble · 24 AWG / DR24,DR6 / EN 2997-002 · 14-12,EN 2997-002 · 08-03', JSON.stringify(I.diff) + ' · ' + I.premiers.v);
  // la vraie base du lecteur (octobre 2026) : « nature : torsadé → — » sur des dizaines de câbles, une masse divisée par 65
  ok('ce que SEE laisse vide, Volta le garde : DRB8 (ni conducteur, ni blindage, ni nature dans SEE) reste torsadé à deux brins — identique', I.premiers.k.split(',').indexOf('DRB8') < 0 && !/DRB8/.test(I.texte), I.premiers.k);
  ok('un chiffre de SEE impossible pour sa jauge ne passe pas : DR6 garde sa masse, celle de SEE barrée (2,08 g/m → 135 g/m, « 65 fois moins dans SEE — impossible pour sa jauge »)', !I.premiers.k && /Câbles rien ne remplace Volta · 2 lignes où la source vérifiée garde Volta/.test(sp(I.texte)) && /DR6\s*masse\s*2,08 g\/m\s*→\s*135 g\/m\s*65 fois moins dans SEE — impossible pour sa jauge · à corriger dans SEE/.test(sp(I.texte)), (sp(I.texte).match(/Câbles.{0,600}/) || [''])[0]);
  ok('la physique juge SEE même sans Volta : la masse du DR6 (2,08 g/m) est sous celle de son cuivre seul (118 g/m) — la bulle le dit', /moins que le cuivre seul de son conducteur de 6 AWG \(118 g\/m\)/.test(I.bulles), I.bulles.slice(0, 200));
  ok('un contact que Volta a vérifié (EN 2997 : EN3155-018M2020, Souriau et TE) et que SEE contredit (-099M2020) reste : celui de SEE barré, « la source vérifiée garde Volta · à corriger dans SEE », la source dans la bulle', /EN3155-099M2020\s*→\s*EN3155-018M2020\s*la source vérifiée garde Volta · à corriger dans SEE/.test(sp(I.texte)) && /Souriau, EN3155 Qualified Contacts/.test(I.bulles), (sp(I.texte).match(/Contacts à sertir.{0,500}/) || [''])[0]);
  ok('un nom écrit en entier par SEE (KB0800 → E0613KB0800) se dit tel, à la fin ; une ligne « à confirmer » de Volta, SEE la remplace (KB1600 → ECS0000M1600)', I.premiers.c === 'ECS0000M1600,EN3155-018M2018,EN3155-019F2022,E0613KB0800' && /KB1600\s*→\s*ECS0000M1600/.test(sp(I.texte)) && /dont 1 nom écrit en entier/.test(sp(I.texte)) && /nom complet\s*KB0800\s*→\s*E0613KB0800/.test(sp(I.texte)), I.premiers.c);
  ok('les faces : le dessin ne compte plus (toute face de SEE est à l’échelle) ; les noms qui diffèrent se montrent', /2 faces redessinées à l’échelle, mêmes contacts/.test(sp(I.texte)) && /08-03\s*noms\s*A B C\s*→\s*1 2 3\s*la source vérifiée garde Volta/.test(sp(I.texte)) && !/relevée sur la figure/.test(I.texte), (sp(I.texte).match(/Faces des connecteurs.{0,160}/) || [''])[0]);
  ok('à compte égal, la taille de chaque contact : l’EN 2997 14-12 de SEE met ses #16 en 1, 2, 3, la norme (MIL-STD-1554A, vérifiée) en 4, 7, 10 — la norme reste : « 1 2 3 #16 · 4 7 10 #20 → 1 2 3 #20 · 4 7 10 #16 »', /14-12\s*tailles\s*1 2 3 #16 · 4 7 10 #20\s*→\s*1 2 3 #20 · 4 7 10 #16\s*la source vérifiée garde Volta/.test(sp(I.texte)), (sp(I.texte).match(/14-12.{0,120}/) || [''])[0]);
  // la vraie base (octobre 2026, photos v69) : C et c y portent le même nom ; la cavité −1 de 431 lignes
  ok('SEE perd la casse des noms (c pour C) : Volta reprend ceux de la norme, aux places de SEE — la 18-11 et la 23N55 ne sont plus que redessinées ; la 10-02, où deux broches gardent le même nom, reste celle de Volta',
    I.casse === '2/EN 2997-002 · 10-02/0' && /2 faces aux noms remis à la casse de la norme/.test(sp(I.texte)) && /1 face reste celle de Volta : SEE y laisse deux contacts du même nom \(EN 2997-002 · 10-02\)/.test(sp(I.texte)), I.casse + ' · ' + (sp(I.texte).match(/Faces des connecteurs.{0,420}/) || [''])[0]);
  ok('une cavité −1 se lit « toute taille », comme la gauge −1', I.toute === 1 && /E0710 · femelle · toute taille|toute taille/.test(sp(I.texte)), String(I.toute));
  ok('la cavité −1 se raconte (le lecteur ne sait pas ce qu’elle veut dire) : ses règles, ses contacts, ses types et gauges de câble, comptés', /La cavité « −1 » 1 ligne de contact sans taille de cavité/.test(sp(I.texte)) && /Leurs règles\s*E0710 - Plug\/Square Receptacle\s*1\s*Leurs contacts\s*E0711-20XX\s*1\s*Leurs types de câble\s*\*\s*1\s*Leurs gauges de câble\s*toute gauge \(−1\)\s*1/.test(sp(I.texte)), (sp(I.texte).match(/La cavité.{0,400}/) || [''])[0]);
  ok('« Pin » se lit mâle ; une cavité illisible se montre par sa valeur', I.contacts.includes('EN2997/M/20/DM/24/EN3155-099M2020//') && JSON.stringify(I.ill) === '{"cavité 0,4 mm²":1}' && /cavité 0,4 mm² \(1\)/.test(sp(I.texte)), JSON.stringify(I.ill));
  ok('l’onglet Import s’ouvre d’office : il dit ce que Volta prend, barre ce qu’il écarte, propose « Garder dans Volta » — rien n’est encore gardé',
    I.vue === 'import' && I.garder && !I.base && /SEE gagne, sauf contre une ligne que deux sources ont vérifiée/.test(I.texte) && /EN3155-099M2020\s*→\s*EN3155-018M2020/.test(I.texte) && /1,1 mm\s*→\s*0,96 mm/.test(sp(I.texte)) && /1 règle obsolète ignorée/.test(sp(I.texte)) && /Lug_WiresCombination/.test(I.texte), sp(I.texte).slice(300, 900));
  ok('tant qu’elle n’est pas gardée, Volta ne s’en sert pas', await p.evaluate(a => contactDuFil(app.norme, 'EN3645', '16', 'M', 'XE16', 16).reference === a, avant.c16), avant.c16);
  if (CAPTURES) await p.screenshot({ path: CAPTURES + '/see-4-import.png' });
  await p.click('#see-garder'); await p.waitForFunction(() => !!BASE_SEE.base);
  const A = await p.evaluate(() => { const c = contactDuFil(app.norme, 'EN2997', '20', 'M', 'DR24', 24), c16 = contactDuFil(app.norme, 'EN3645', '16', 'M', 'XE16', 16), k = cableDuType(app.norme, 'DR24'), m = moduleDeReference(app.norme, 'EN2997-002-14-12');
    return { c: c.reference, cs: c.source, dc: differenceSEEMots('contacts', c), c16: c16.reference, cs16: c16.source, dc16: differenceSEEMots('contacts', c16), k: k.diametre, dr6m: differenceSEEMots('cables', cableDuType(app.norme, 'DR6')), dk: differenceSEEMots('cables', k), m: m && [m.reference, m.contacts.length, m.note.slice(0, 40), m.contacts.filter(x => x.taille === '16').length], n3545: normeDesModules(app.norme).modules.filter(x => x.famille === 'EN3545').length,
      z: !!cableDuType(app.norme, 'ZZ20'), f1811: (m => m && [m.contacts.map(c => c.lettre).join(''), /casse de la norme/.test(m.note)].join('/'))(moduleDeReference(app.norme, 'EN3646-002-18-11')),
      f2355: (m => m && [m.contacts.length, ['C', 'c', 'E', 'e', 'a', 'A'].every(l => m.contacts.some(c => c.lettre === l)), new Set(m.contacts.map(c => c.lettre)).size].join('/'))(moduleDeReference(app.norme, 'EN3645-002-23N55')),
      f1002: (m => m && /^face SEE/.test(m.note))(moduleDeReference(app.norme, 'EN2997-002-10-02')), tout: (c => c && c.reference)(contactDuFil(app.norme, 'E0710', '20', 'F', 'DR20', 20)), drb8: (x => x && [x.nature, x.brins, x.resistance, x.blindage, /de Volta : brins, nature, resistance/.test(x.note)].join('/'))(cableDuType(app.norme, 'DRB8')), dr6: cableDuType(app.norme, 'DR6').masse, etat: ($('fiche-corps').querySelector('.see-etat') || {}).textContent || '', oublier: !!$('see-oublier') }; });
  ok('gardée : SEE passe devant Volta là où Volta n’a qu’une ligne « à confirmer » (KB1600 → ECS0000M1600), apporte ses nouveautés (EN 3545, ZZ20) ; la source vérifiée reste (le contact EN 2997, le Ø du DR24, la face 14-12 de la norme)',
    A.c16 === 'ECS0000M1600' && A.cs16 === 'SEE' && A.c === 'EN3155-018M2020' && A.cs !== 'SEE' && A.k === 0.96 && A.m[0] === 'EN2997-002-14-12' && A.m[1] === 12 && !/^face SEE/.test(A.m[2]) && A.m[3] === 3 && A.n3545 === 1 && A.z && /Gardée sur ce PC/.test(A.etat) && A.oublier, JSON.stringify(A));
  ok('gardée : les faces de SEE aux noms de la norme (18-11 : A…L, la 23N55 : C et c, 55 noms distincts), la 10-02 ambiguë reste celle de Volta ; le contact « toute taille » sert une cavité 20 que rien d’autre ne sert',
    A.f1811 === 'ABCDEFGHJKL/true' && A.f2355 === '55/true/55' && A.f1002 === false && A.tout === 'E0711-20XX', [A.f1811, A.f2355, A.f1002, A.tout].join(' · '));
  ok('gardée : la case vide de SEE prend la valeur de Volta (DRB8 torsadé, deux brins, sa résistance, la note le dit) ; la masse impossible du DR6 ne passe pas (135 g/m)', A.drb8 === 'torsadé/2/2.37/false/true' && A.dr6 === 135, A.drb8 + ' · ' + A.dr6);
  ok('la fiche dit, ligne par ligne, ce que SEE remplace (KB1600 → ECS0000M1600) et ce qu’il contredit sans passer (« SEE dit autre chose : contact EN3155-099M2020 (Volta : EN3155-018M2020) — Volta garde ce que deux sources ont vérifié »)',
    /contact KB1600 → ECS0000M1600/.test(A.dc16) && /^SEE dit autre chose : contact EN3155-099M2020 \(Volta : EN3155-018M2020\) — partie -099 que l’EN 3155 n’a pas : Volta garde ce que deux sources ont vérifié : à corriger dans SEE$/.test(A.dc) && /Ø 1,1 \(Volta : 0,96\)/.test(A.dk.replace(/ mm/g, '')) && /masse 2,08 g\/m \(Volta : 135 g\/m\)/.test(A.dr6m), [A.dc16, A.dc, A.dk, A.dr6m].join(' · '));
  // la deuxième passe de corroboration (20 octobre 2026) : la source vérifiée ne gagne que contre un contact FAUX ; un autre
  // contact qui convient aussi (EN3155-018M2018 : fût 18, du 18 au 24 AWG) et un manchon E0718 en moins, SEE les donne
  const Va = await p.evaluate(() => { const a = contactDuFil(app.norme, 'EN2997', '20', 'M', 'DR20', 20), b = contactDuFil(app.norme, 'EN2997', '20', 'F', 'DR26', 26);
    return { a: a.reference + '/' + a.source + '/' + differenceSEEMots('contacts', a), b: b.reference + '/' + (b.accessoire || 'rien') + '/' + b.source + '/' + differenceSEEMots('contacts', b) }; });
  ok('un autre contact qui convient aussi (EN3155-018M2018 au lieu de -018M2020 pour un 20 AWG) et un manchon E0718 en moins ne contredisent pas la source vérifiée : SEE gagne, la fiche dit ce qu’il remplace',
    Va.a === 'EN3155-018M2018/SEE/SEE a remplacé ce que disait Volta : contact EN3155-018M2020 → EN3155-018M2018' && Va.b === 'EN3155-019F2022/rien/SEE/SEE a remplacé ce que disait Volta : avec E0718-20-30 → rien', Va.a + ' · ' + Va.b);
  // le programme : EC225 ; le connecteur NH90 seul est « pas déclaré pour EC225 », l'obsolète l'est dit, l'absent aussi
  await p.selectOption('#see-prog', 'EC225'); await p.waitForTimeout(200);
  const Pg = await p.evaluate(() => ({ p: programmeSEE(), t: ($('fiche-corps').querySelector('.see-table') || {}).textContent || '', a: ['EN2997Y1A08P', 'EN3646A6083AAN', 'MS3470L14-5P', 'E0644D9S'].map(x => alertesSEE(equipementSEE(x), x).map(y => y.texte).join('+') || 'rien') }));
  ok('le programme se choisit (EC225) : ce qui n’y est pas déclaré, ce qui est obsolète, ce qui manque à SEE se dit', Pg.p === 'EC225' && /Hors EC225/.test(Pg.t) && Pg.a.join(' | ') === 'pas déclarée pour EC225 dans SEE | obsolète dans SEE | rien | absente de la base SEE', Pg.a.join(' | '));
  // la fiche d'un équipement : la ligne SEE de la référence de son connecteur, ce qui s'y accouple
  const Fi = await p.evaluate(() => { fermerFiche(true); const d = document.createElement('div'); d.innerHTML = ficheEquipement('101BT1'); const s = d.querySelector('.fi-see'); return s ? s.textContent.replace(/\s+/g, ' ') : ''; });
  ok('la fiche d’un équipement dit ce que SEE sait de la référence de son connecteur : la désignation, fiche ou embase, ce qui s’y accouple', /Plug MS 14-5/.test(Fi) && /fiche \(prise mobile\)/.test(Fi) && /broches/.test(Fi) && /se monte avec MS3476L14-5S/.test(Fi), Fi);
  // recharger la page : la base revient d'elle-même ; puis l'oublier
  await p.reload(); await p.waitForFunction(() => typeof atelier !== 'undefined'); await p.waitForFunction(() => BASE_SEE.charge); await p.evaluate(() => atelier.exempleSansCalibreAuto()); await p.waitForTimeout(300);
  ok('la page rechargée : la base SEE gardée revient et passe devant Volta (sauf la source vérifiée), le programme aussi', await p.evaluate(() => !!BASE_SEE.base && contactDuFil(app.norme, 'EN3645', '16', 'M', 'XE16', 16).reference === 'ECS0000M1600' && contactDuFil(app.norme, 'EN2997', '20', 'M', 'DR24', 24).reference === 'EN3155-018M2020' && programmeSEE() === 'EC225'));
  await p.evaluate(() => ficheBaseSEE()); await p.waitForFunction(() => app.fiche && app.fiche.mode === 'see');
  const G0 = await p.evaluate(() => ({ onglets: [...$('fiche-corps').querySelectorAll('[data-see-vue]')].map(b => b.textContent).join(','), t: ($('fiche-corps').querySelector('.see-etat') || {}).textContent || '' }));
  ok('sans classeur lu, la base gardée se montre seule (l’Import, et la Cohérence gardée avec elle)', /^Import,Cohérence\d+$/.test(G0.onglets) && /Gardée sur ce PC/.test(G0.t), JSON.stringify(G0));
  if (CAPTURES) await p.screenshot({ path: CAPTURES + '/see-5-gardee.png' });
  await p.click('#see-oublier'); await p.waitForFunction(() => !BASE_SEE.base);
  ok('« Oublier la base SEE » : Volta revient à ses tables, la page se ferme, rien ne reste', await p.evaluate(a => contactDuFil(app.norme, 'EN3645', '16', 'M', 'XE16', 16).reference === a.c16 && contactDuFil(app.norme, 'EN2997', '20', 'M', 'DR24', 24).reference === a.c && !(app.fiche && app.fiche.mode === 'see'), avant)
    && await p.evaluate(async () => !(await idbSEEFaire('readonly', s => s.get('base')))));
  ok('aucune erreur dans la page, après l’import', !e.length, e.slice(0, 2).join(' | '));

  // 8. LA COHÉRENCE (le lecteur, 20 octobre 2026 : « Tu as pu vérifier si toute notre base de SEE est correcte et
  // cohérente ? Elle apporte quoi de plus que les photos ? … Tout ? ») : un classeur de lignes saines et d'UN défaut planté
  // par contrôle (deux pour le fût trop fin : la broche et la douille). Chaque défaut se trouve, compté juste, avec sa
  // référence ; aucune ligne saine n'est dans un exemple ; ce qui se contredit est écarté ; le rapport en texte ne dit que
  // des références de catalogue et des comptes. Puis les tables de Volta elles-mêmes, passées comme des lignes de SEE : rien.
  await p.evaluate(() => { fermerFiche(true); atelier.exempleSansCalibreAuto(); }); await p.waitForTimeout(300);
  await p.evaluate(() => {
    const G = (k, i) => k + String(i).padStart(7, '0') + '-0000-4000-8000-000000000000', wb = XLSX.utils.book_new(), f = (rows, nom) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), nom);
    const sains = [], sain = (feuille, rows) => sains.push(feuille + ' ' + (rows.length + 1));   // la ligne Excel de la ligne qu'on va poser (l'en-tête est la ligne 1)
    // les règles : EN 2997 validée v7 et son ancienne v6 (obsolète, remplacée), EN 3646 validée, EN 3645 en cours, EN 4165 obsolète sans version validée, une seconde règle EN 2997 validée
    f([['ID', 'IDEquipment', 'PartNo', 'ClassName', 'LCStatusName', 'Version'], [G('A', 1), G('A', 1), 'EN2997', 'Contact', 'Release', 7], [G('A', 2), G('A', 2), 'EN2997', 'Contact', 'Obsolete', 6], [G('A', 3), G('A', 3), 'EN3646', 'Contact', 'Release', 3],
      [G('A', 4), G('A', 4), 'EN3645', 'Contact', 'In Work', 2], [G('A', 5), G('A', 5), 'EN4165', 'Contact', 'Obsolete', 4], [G('A', 6), G('A', 6), 'EN2997 - Plug', 'Contact', 'Release', 1]], 'EED_ViewEndFittingRules');
    // les contacts : la cavité et la gauge en mm² comme SEE les écrit ; « s » une ligne saine
    const C = [['ID', 'IDEquipment', 'RuleNum', 'ContactType', 'ContactGauge', 'WireType', 'WireGauge', 'PartNo1', 'Quantity1', 'PartNo2', 'Quantity2']]; let nc = 0;
    const ct = (s, regle, sexe, cav, type, jauge, ref, acc) => { if (s) sain('OBJ_END_Fitting_Rules_Conta', C); C.push([G('C', ++nc), G('A', regle), 100 + nc, sexe, cav < 1 ? cav : sectionAwg(cav), type, jauge < 0 ? jauge : sectionAwg(jauge), ref, 1, acc || '', acc ? 1 : '']); };
    [[20, '*', 24, '2020'], [20, '*', 22, '2020'], [16, '*', 20, '1616'], [12, '*', 12, '1212'], [20, 'DM', 20, '2020', 'E0718-20-30']].forEach(([t, ty, j, fu, acc]) => { ct(1, 1, 'Male', t, ty, j, 'EN3155-018M' + fu, acc); ct(1, 1, 'Female', t, ty, j, 'EN3155-019F' + fu); });
    ct(0, 1, 'Male', 20, '*', 20, 'EN3155-019F2020');                 // c-sexe : une douille sur une ligne mâle
    ct(0, 1, 'Female', 16, '*', 18, 'EN3155-019F2018');               // c-taille : une taille 20 dans une cavité 16
    ct(0, 1, 'Male', 20, '*', 16, 'EN3155-018M2020');                 // c-fut-gros : un 16 AWG dans un fût 20
    ct(0, 1, 'Male', 20, 'DR', 26, 'EN3155-018M2020'); ct(0, 1, 'Female', 20, 'DR', 26, 'EN3155-019F2020');   // c-fut-fin : un 26 AWG dans un fût 20, broche et douille
    ct(0, 1, 'Male', 12, 'DM', 14, 'XYZ-12'); ct(1, 1, 'Female', 12, 'DM', 14, 'EN3155-019F1212');             // c-forme
    ct(0, 1, 'Male', 16, 'DM', 18, 'EN3155-099M1616'); ct(1, 1, 'Female', 16, 'DM', 18, 'EN3155-019F1616');    // c-partie : la partie -099 n'existe pas
    ct(0, 1, 'Male', 16, 'DM', 16, 'EN3155-018M1616'); ct(0, 1, 'Female', 16, 'DM', 16, 'EN3155-019F1614');    // c-paire : fût 16 d'un côté, 14 de l'autre
    ct(0, 1, 'Male', 20, 'YY', 22, 'EN3155-018M2020');                // c-seul : la broche sans sa douille
    ct(0, 1, 'Male', 0.4, '*', 24, 'EN3155-018M2020');                // c-illisible : une cavité de 0,4 mm²
    ct(0, 1, 'Male', 22, 'WX', 24, 'EN3155-008M2222', 'E9999-01'); ct(1, 1, 'Female', 22, 'WX', 24, 'EN3155-009F2222');   // l-références : un accessoire qu'aucune feuille ne définit
    ct(1, 2, 'Male', 20, '*', 24, 'EN3155-777M2020');                 // l'ancienne règle obsolète, remplacée : ignorée sans bruit
    ct(1, 3, 'Male', 20, '*', 20, 'EN3155-018M2020'); ct(1, 3, 'Female', 20, '*', 20, 'EN3155-019F2020');
    ct(1, 4, 'Male', 22, '*', 24, 'EN3155-008M2222'); ct(1, 4, 'Female', 22, '*', 24, 'EN3155-009F2222');      // c-encours : la règle EN 3645 en cours
    ct(1, 5, 'Male', 22, '*', 24, 'EN3155-008M2222');                 // c-obsolete : la règle EN 4165 obsolète, sans version validée
    ct(0, 6, 'Male', 16, '*', 20, 'EN3155-018M1618');                 // c-conflit : la seconde règle validée dit un autre contact
    f(C, 'EED_OBJ_END_Fitting_Rules_Conta');
    // les câbles : deux familles saines (TT, SS : le Ø, la masse, la résistance montent avec la gauge), le DR24 de Volta (vérifié) avec un autre Ø, l'ADB24 (à confirmer) deux fois plus lourd
    const K = [['ID', 'IDEquipment', 'PartNo', 'Type', 'Gauge', 'ExternalMaxDiameter', 'LineicWeight', 'Shield', 'CableFamily', 'LCStatusName', 'Version']], W = [['ID', 'IDCable', 'Gauge', 'Resistivity']]; let nk = 0;
    const cab = (s, pn, ty, j, d, m, r, sh, brins) => { nk++; if (s) sain('CablesAndWires', K); K.push([G('B', nk), G('B', nk), pn, ty, j == null ? '' : sectionAwg(j), d === '' ? '' : d / 1000, m === '' ? '' : m / 1000, sh, 'Wire', 'Release', 1]);
      if (r !== '') for (let i = 0; i < (brins || 1); i++) W.push([G('D', nk * 10 + i), G('B', nk), sectionAwg(j), r / 1000]); };
    cab(1, 'TT24', 'TT', 24, 0.9, 2.0, 90, 'UNSHIELDED'); cab(1, 'TT22', 'TT', 22, 1.1, 3.0, 57, 'UNSHIELDED'); cab(1, 'TT20', 'TT', 20, 1.3, 4.5, 36, 'UNSHIELDED');
    cab(1, 'SS24', 'SS', 24, 0.95, 2.1, 92, 'UNSHIELDED'); cab(0, 'SS22', 'SS', 22, 1.6, 3.0, 57, 'UNSHIELDED'); cab(1, 'SS20', 'SS', 20, 1.35, 4.6, 37, 'UNSHIELDED');   // k-soeurs : SS22 plus gros que SS20
    cab(0, 'QQ16', 'QQ', 16, 1.6, 0.5, 15, 'UNSHIELDED');            // k-physique : 0,5 g/m pour un 16 AWG
    cab(0, 'QR20', 'QR', 20, 0.5, 4, 35, 'UNSHIELDED');              // k-diametre : 0,5 mm, sous le conducteur nu
    cab(0, 'QS24', 'QS', 24, 12, 2, 90, 'UNSHIELDED');               // k-diametre-gros : 12 mm pour un 24 AWG
    cab(0, 'QV22', 'QV', 22, '', '', '', '');                        // k-vides
    cab(0, 'DR24', 'DR', 24, 1.3, 2.72, 114, 'UNSHIELDED');          // s-verifiees : Volta dit 0,96 mm, vérifié
    cab(0, 'ADB24', 'ADB', 24, 1.9, 8.0, 149.4, 'UNSHIELDED', 2);    // s-ecarts et s-remplace : 3,70 g/m chez Volta (à confirmer)
    f(K, 'EED_ViewCablesAndWires'); f(W, 'EED_OBJ_Wires');
    // les faces : la 10-02 de l'EN 2997 et une A04 rectangulaire, saines ; la 18-11 de l'EN 3646 à la casse de SEE ; puis un compte, un doublon, un chevauchement, une taille
    const A = [['ID', 'IDEquipment', 'PartNo', 'Type', 'View', 'LCStatusName', 'DesiredPinsCount', 'IDCategory']], P = [['ID', 'IDPlugMap', 'Name', 'X', 'Y', 'ContactGauge', 'ContactFamily', 'CablingOrder']]; let na = 0, np = 0;
    const face = (s, pn, type, n, pins) => { na++; if (s) sain('ContactLayouts', A); A.push([G('F', na), G('F', na), pn, type, 'Front', 'Release', n || '', G('E', 900 + na)]);
      pins.forEach(([nom, x, y, t], i) => { if (s) sain('OBJ_PlugMapPin', P); P.push([G('1', ++np), G('F', na), nom, x / 1000, y / 1000, sectionAwg(t || 20), 'Standard', i + 1]); }); };
    face(1, 'EN2997_10-02', 'Circular', 0, [['1', 0, 1.5], ['2', 0, -1.5]]);
    face(1, 'EN3545_A04', 'Rectangular', 4, [['1', 0, 0], ['2', 2.5, 0], ['3', 0, -2.5], ['4', 2.5, -2.5]]);
    const casseSEE = l => /^[cefkmwz]$/i.test(l) ? l.toLowerCase() : l.toUpperCase();
    face(0, 'EN3646_18-11', 'Circular', 0, normeDesModules(app.norme).modules.find(m => m.famille === 'EN3646' && m.variante === '18-11').contacts.map(c => [casseSEE(c.lettre), (c.c + 0.5) * 2.5, -(c.r + 0.5) * 2.5, +c.taille]));   // f-casse
    face(0, 'EN2997_26-03', 'Circular', 0, [['1', -2, 0], ['2', 2, 0]]);                          // f-compte : 26-03, deux contacts
    face(0, 'EN3545_B03', 'Rectangular', 0, [['1', 0, 0], ['1', 2.5, 0], ['2', 5, 0]]);          // f-doublons
    face(0, 'EN3545_C02', 'Rectangular', 0, [['1', 0, 0], ['2', 0.5, 0]]);                        // f-chevauche : 0,5 mm entre deux contacts 20
    face(0, 'EN2997_28-02', 'Circular', 0, [['1', -5, 0, 8], ['2', 5, 0, 8]]);                    // f-tailles : une taille 8 que l'EN 2997 n'a pas
    f(A, 'EED_ViewContactLayouts'); f(P, 'EED_OBJ_PlugMapPin');
    // les connecteurs : cinq paires (une saine, une déclarée d'un seul côté, deux fiches, deux mêmes sexes, deux comptes), un connecteur dont l'arrangement n'a pas son compte, un obsolète encore déclaré
    const E = [['ID', 'IDEquipment', 'PartNo', 'Description', 'ConnectivityType', 'Gender', 'DesiredPinsCount', 'EPFList', 'LCStatusName', 'IDPlugMap']]; let ne = 0; const id = {};
    const eq = (pn, cx, g, n, st, pm) => { id[pn] = G('2', ++ne); E.push([id[pn], id[pn], pn, '', cx, g, n, 'EC225', st || 'Release', pm || '']); };
    eq('AB1001P', 'Plug', 'Pin', 5); eq('AB1001S', 'Receptacle', 'Socket', 5); eq('AB1002P', 'Plug', 'Pin', 13); eq('AB1002S', 'Receptacle', 'Socket', 13);
    eq('AB1003P', 'Plug', 'Pin', 3); eq('AB1003Q', 'Plug', 'Socket', 3); eq('AB1004S', 'Plug', 'Socket', 3); eq('AB1004T', 'Receptacle', 'Socket', 3); eq('AB1005P', 'Plug', 'Pin', 8); eq('AB1005S', 'Receptacle', 'Socket', 10);
    eq('EN3545A04P', 'Plug', 'Pin', 3, 'Release', G('F', 1)); eq('EN3545A04S', 'Receptacle', 'Socket', 4, 'Release', G('F', 2)); eq('AB1009P', 'Plug', 'Pin', 3, 'Obsolete');
    f(E, 'EED_ViewConnectiveEquipments');
    f([['ID', 'IDEquipment', 'PartNo', 'Description', 'EquipmentType', 'EPFList', 'LCStatusName'], [G('3', 1), G('3', 1), 'MS3320-5', '', 'Circuit Breaker', 'EC225', 'Release'], [G('3', 2), G('3', 2), 'MS3320-10', '', 'Circuit Breaker', 'EC 225', 'Release'], [G('3', 3), G('3', 3), 'MS3320-15', '', 'Circuit Breaker', '', 'Release']], 'EED_ViewEquipments');
    const M = [['ID', 'IDSemiEqu', 'IDConnectedSemiEqu', 'Prefered']]; let nm = 0; const accouple = (a, c) => M.push([G('4', ++nm), id[a] || G('2', 999), id[c], 1]);
    accouple('AB1001P', 'AB1001S'); accouple('AB1001S', 'AB1001P'); accouple('AB1002P', 'AB1002S');   // e-sens : AB1002 d'un seul côté
    [['AB1003P', 'AB1003Q'], ['AB1004S', 'AB1004T'], ['AB1005P', 'AB1005S']].forEach(([a, c]) => { accouple(a, c); accouple(c, a); });   // e-nature, e-sexe, e-contacts
    accouple('AB1099P', 'AB1001S');                                                                   // l-orphelins : AB1099P n'est dans aucune feuille
    f(M, 'EED_LNK_Equi_Mating');
    // les pièces : chaque contact et accessoire cité, sauf E9999-01 ; trois tyraps, dont deux de la table Colliers de Volta
    const pieces = ['EN3155-018M2020', 'EN3155-019F2020', 'EN3155-018M1616', 'EN3155-019F1616', 'EN3155-018M1212', 'EN3155-019F1212', 'EN3155-019F2018', 'XYZ-12', 'EN3155-099M1616', 'EN3155-019F1614', 'EN3155-008M2222', 'EN3155-009F2222', 'EN3155-018M1618', 'E0718-20-30'];
    f([['ID', 'IDEquipment', 'PartNo', 'AccessoriesType'], ...pieces.map((x, i) => [G('5', i + 1), G('5', i + 1), x, /^E07/.test(x) ? 'Sleeve' : 'Contact']), ...['NSA935401-05', 'NSA935401-06', 'T18R'].map((x, i) => [G('5', 50 + i), G('5', 50 + i), x, 'Cable tie'])], 'EED_ViewAccessories');
    window.__sains3 = sains;
    window.__see3 = new File([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], 'base-SEE-3.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); });
  await p.evaluate(() => ouvrirFichier(window.__see3)); await p.waitForFunction(() => app.fiche && app.fiche.mode === 'see' && SEE.import && SEE.import.nom === 'base-SEE-3.xlsx');
  const Co = await p.evaluate(() => { const X = controlesSEE(SEE.import), sains = new Set(window.__sains3);
    return { X: Object.fromEntries(X.map(x => [x.cle, { n: x.n, g: x.gravite, refs: x.ex.map(y => y.r), textes: x.ex.map(y => y.r + ' — ' + y.d), na: x.na, faux: x.ex.filter(y => y.l && sains.has((y.f || x.f) + ' ' + y.l)).map(y => y.r + ' l. ' + y.l) }])),
      contacts: SEE.import.contacts.map(c => [c.famille, c.sexe, c.taille, c.typeFil, c.jauge, c.reference].join('/')), b: SEE.import.bilan.contacts, plus: (SEE.import.coherence.c['c-obsolete'] || {}).plus, acc: SEE.import.coherence.accessoires, k: SEE.import.coherence.sur }; });
  const PLANTES = { 'c-sexe': ['EN3155-019F2020', 1], 'c-taille': ['EN3155-019F2018', 1], 'c-fut-gros': ['EN3155-018M2020', 1], 'c-fut-fin': ['EN3155-019F2020', 2], 'c-forme': ['XYZ-12', 1], 'c-partie': ['EN3155-099M1616', 1],
    'c-paire': ['EN3155-018M1616 / EN3155-019F1614', 1], 'c-conflit': ['EN3155-018M1616 / EN3155-018M1618', 1], 'c-encours': ['EN3645', 1], 'c-obsolete': ['EN4165', 1], 'c-illisible': ['EN3155-018M2020', 1], 'c-seul': ['EN3155-018M2020', 1],
    'k-physique': ['QQ16', 1], 'k-diametre': ['QR20', 1], 'k-diametre-gros': ['QS24', 1], 'k-soeurs': ['SS22', 1], 'k-vides': ['QV22', 1],
    'f-doublons': ['EN3545_B03', 1], 'f-chevauche': ['EN3545_C02', 1], 'f-compte': ['EN2997_26-03', 1], 'f-tailles': ['EN2997_28-02', 1], 'f-casse': ['EN3646_18-11', 1],
    'e-nature': ['AB1003P ↔ AB1003Q', 1], 'e-sexe': ['AB1004S ↔ AB1004T', 1], 'e-contacts': ['AB1005P ↔ AB1005S', 1], 'e-compte': ['EN3545A04P', 1], 'e-obsolete': ['AB1009P', 1], 'e-programmes': ['EC225 · EC 225', 1], 'e-sens': ['AB1002P ↔ AB1002S', 1], 'e-sans-programme': ['MS3320-15', 1],
    'l-orphelins': [/^\{20000999-0000-4000-8000-000000000000\} — LNK_Equi_Mating\.IDSemiEqu : ne mène à aucune ligne de ConnectiveEquipments$/, 1], 'l-sans-table': ['ContactLayouts.IDCategory', 1], 'l-references': ['E9999-01', 1], 's-verifiees': ['DR24', 1], 's-ecarts': ['ADB24', 1], 's-remplace': ['ADB24', 1] };
  const trouve = (x, r) => r instanceof RegExp ? x.textes.some(t => r.test(t)) : x.refs.includes(r);
  const rate = Object.entries(PLANTES).filter(([k, [r, n]]) => !Co.X[k] || Co.X[k].n !== n || !trouve(Co.X[k], r)).map(([k, [r, n]]) => k + ' : ' + (Co.X[k] ? Co.X[k].n + ' ' + Co.X[k].textes.join(', ') : 'absent') + ' (attendu ' + n + ' ' + r + ')');
  ok('la cohérence : trente-six contrôles, chaque défaut planté trouvé et compté juste, avec sa référence de catalogue', Object.keys(Co.X).length === 36 && !rate.length && Object.keys(PLANTES).length === 36, rate.join(' | ') || Object.keys(Co.X).length + ' contrôles');
  ok('rien de faux sur les lignes saines : aucune ligne saine (contacts, câbles, faces, broches) n’est un exemple', Object.values(Co.X).every(x => !x.faux.length), Object.entries(Co.X).filter(([, x]) => x.faux.length).map(([k, x]) => k + ' : ' + x.faux.join(', ')).join(' | '));
  ok('les gravités : la ligne qui se contredit est une erreur, l’écart à voir, le reste pour information', ['c-sexe', 'c-taille', 'c-fut-gros', 'k-physique', 'k-diametre', 'f-doublons', 'f-chevauche', 'e-nature', 'e-sexe'].every(k => Co.X[k].g === 'ko') && ['c-seul', 'k-vides', 'f-casse', 'e-sens', 'e-sans-programme', 'l-sans-table', 'l-references', 's-remplace'].every(k => Co.X[k].g === 'info'));
  ok('ce qui se contredit ne passe pas : la douille d’une ligne mâle, la taille 20 d’une cavité 16, le 16 AWG d’un fût 20 sont écartés ; le fût trop fin, la forme inconnue, la partie inconnue sont pris', Co.b.incoherentes === 3 && !Co.contacts.some(c => /\/M\/20\/\*\/20\/EN3155-019F2020|EN3155-019F2018|\/M\/20\/\*\/16\//.test(c))
    && ['EN2997/M/20/DR/26/EN3155-018M2020', 'EN2997/M/12/DM/14/XYZ-12', 'EN2997/M/16/DM/18/EN3155-099M1616'].every(c => Co.contacts.includes(c)), Co.b.incoherentes + ' · ' + Co.contacts.filter(c => /DR\/26|DM\/1[48]/.test(c)).join(' | '));
  ok('la règle EN 2997 obsolète remplacée par sa v7 ne fait pas de bruit, elle se compte à part ; les tyraps de la base face à la table Colliers de Volta', JSON.stringify(Co.plus) === '{"remplacées":1}' && Co.acc && Co.acc.tyraps === 3 && Co.acc.tyrapsDansSEE === 2 && Co.acc.tyrapsVolta >= 2, JSON.stringify([Co.plus, Co.acc]));
  // l'onglet : le verdict, chaque contrôle sa ligne, ses exemples d'un clic
  await p.click('[data-see-vue="coherence"]'); await p.mouse.move(5, 5); await p.waitForTimeout(300);
  const Vu = await p.evaluate(() => { const c = $('fiche-corps'), q = s => c.querySelector(s), qa = s => [...c.querySelectorAll(s)];
    return { onglet: (q('[data-see-vue="coherence"] span') || {}).textContent, verdict: qa('.see-v').map(v => v.className.replace('see-v ', '') + '=' + v.querySelector('b').textContent).join(' '), lignes: qa('.see-ctl').length,
      sexe: (x => x && [x.className, x.querySelector('.see-ctl-n').textContent, x.querySelector('.see-ctl-g').textContent].join('/'))(q('[data-ctl="c-sexe"]')), ouverts: qa('.see-ctl details[open]').length, pied: ($('fiche-pied').textContent || '').replace(/\s+/g, ' '),
      apporte: (q('.see-apporte') || {}).textContent || '', groupes: qa('.see-groupe-c h3').map(h => h.firstChild.textContent.trim()).join(' | '), deborde: c.scrollWidth > c.clientWidth + 1 }; });
  ok('l’onglet Cohérence suit l’Import ; son compte dit les contrôles à reprendre ; le verdict d’un coup d’œil (9 en erreur, 19 à voir, 8 pour information, aucun sans défaut)', Vu.onglet === '28' && Vu.verdict === 'ko=9 att=19 info=8 ok zero=0' && Vu.lignes === 36, Vu.onglet + ' · ' + Vu.verdict + ' · ' + Vu.lignes);
  ok('chaque contrôle, par domaine : son point d’état, son titre, ce que Volta en fait, son compte, sa gravité', Vu.sexe === 'see-ctl ko/1/erreur' && Vu.groupes === 'Contacts à sertir | Câbles | Faces des connecteurs | Connecteurs et équipements | Liens entre feuilles | Face aux sources vérifiées de Volta' && !Vu.deborde, Vu.sexe + ' · ' + Vu.groupes);
  await p.click('[data-ctl="c-taille"] summary'); await p.waitForTimeout(150);
  const Ex = await p.evaluate(() => { const d = $('fiche-corps').querySelector('[data-ctl="c-taille"] details'); return d.open ? [...d.querySelectorAll('.see-exs li')].map(li => li.textContent.replace(/\s+/g, ' ')).join(' | ') + ' · ' + (d.querySelector('.see-ex-f') || {}).textContent : ''; }).then(sp);
  ok('un clic déplie les exemples : la référence, ce qui cloche, la ligne Excel (la feuille dite au-dessus)', /EN3155-019F2018\s*taille 20 pour une cavité 16 — règle EN2997 v7\s*l\. \d+/.test(Ex) && /Les lignes de la feuille OBJ_END_Fitting_Rules_Conta/.test(Ex), Ex);
  await p.click('#see-deplier'); await p.waitForTimeout(150);
  ok('« Déplier les exemples » les ouvre tous', await p.evaluate(() => [...$('fiche-corps').querySelectorAll('.see-ctl details')].every(d => d.open) && $('see-deplier').textContent === 'Replier les exemples'));
  ok('ce que la base apporte, à côté des quatre tables des photos (EN 2997 v6 → v7 dans SEE) ; le pied copie le rapport de cohérence', /Les quatre tables de vos photos/.test(Vu.apporte) && /EN 2997-002\s*v6\s*v7/.test(Vu.apporte) && /Ce que Volta n’avait pas/.test(Vu.apporte) && /Copier le rapport de cohérence/.test(Vu.pied), Vu.apporte.slice(0, 300));
  if (CAPTURES) await p.screenshot({ path: CAPTURES + '/see-6-coherence.png' });
  // le rapport en texte : des références de catalogue et des comptes ; ni le plan, ni le classeur, ni les programmes
  const Ra = await p.evaluate(() => { const t = rapportCoherenceSEE(SEE.import, true), V = verite(), plan = [...new Set(V.flatMap(l => [l.pnDe, l.pnVers, l.de, l.vers]).filter(Boolean))];
    return { t, plan: plan.filter(x => String(x).length > 3 && t.includes(x)) }; });
  await p.click('#see-copier-coh'); await p.waitForFunction(() => /Rapport de cohérence copié|La copie est refusée/.test($('toast').textContent)); Ra.toast = await p.evaluate(() => $('toast').textContent);
  ok('« Copier le rapport de cohérence » : chaque contrôle, son compte, ses exemples (la référence, la ligne) — sans le plan, ni le nom du classeur, ni celui des programmes', /^Rapport de cohérence de la base SEE/.test(Ra.t) && /\[erreur\] Sexe contre la référence : 1 — Écartée/.test(Ra.t) && /EN3155-019F2020 — femelle \(F\) sur une ligne Male — règle EN2997 v7 — OBJ_END_Fitting_Rules_Conta l\. \d+/.test(Ra.t)
    && /programme A \(2 écritures\)/.test(Ra.t) && !/EC ?225|base-SEE-3/.test(Ra.t) && !Ra.plan.length && /== Ce que la base apporte ==/.test(Ra.t) && /Rapport de cohérence copié|La copie est refusée/.test(Ra.toast), Ra.plan.join(', ') + ' · ' + Ra.toast);
  // l'Import y mène ; gardée, la base garde sa cohérence, et les valeurs écartées ne passent pas
  await p.click('[data-see-vue="import"]'); await p.waitForTimeout(150);
  ok('l’Import dit la cohérence en une ligne et y mène', /Volta a vérifié la base ligne par ligne : 9 contrôles en erreur, 19 contrôles à voir/.test(sp(await p.evaluate(() => ($('fiche-corps').querySelector('.see-coh-l') || {}).textContent || ''))));
  await p.click('#see-voir-coh'); await p.waitForTimeout(150);
  ok('« Voir la cohérence » ouvre l’onglet', await p.evaluate(() => SEE.vue === 'coherence'));
  await p.click('[data-see-vue="import"]'); await p.click('#see-garder'); await p.waitForFunction(() => !!BASE_SEE.base);
  ok('gardée : la masse impossible du QQ16 et le Ø du QR20 (sous leur conducteur) sont écartés — la case reste vide', await p.evaluate(() => { const a = cableDuType(app.norme, 'QQ16'), b = cableDuType(app.norme, 'QR20'); return a && a.masse == null && b && b.diametre == null && b.masse === 4; }));
  await p.reload(); await p.waitForFunction(() => typeof atelier !== 'undefined'); await p.waitForFunction(() => BASE_SEE.charge); await p.evaluate(() => atelier.exempleSansCalibreAuto()); await p.waitForTimeout(300);
  await p.evaluate(() => ficheBaseSEE()); await p.waitForFunction(() => app.fiche && app.fiche.mode === 'see');
  const Ga = await p.evaluate(() => ({ onglets: [...$('fiche-corps').querySelectorAll('[data-see-vue]')].map(b => b.querySelector('b').textContent).join(','), n: controlesSEE(BASE_SEE.base).filter(x => x.n).length, liens: (BASE_SEE.base.coherence.c['l-orphelins'] || {}).n }));
  await p.click('[data-see-vue="coherence"]'); await p.waitForTimeout(200);
  ok('la page rechargée : la base gardée garde sa cohérence (l’onglet, les liens comptés à la lecture), sans le classeur', Ga.onglets === 'Import,Cohérence' && Ga.n === 36 && Ga.liens === 1 && await p.evaluate(() => !!$('fiche-corps').querySelector('.see-coherence .see-verdict') && /Copier le rapport de cohérence/.test($('fiche-pied').textContent)), JSON.stringify(Ga));
  await p.click('[data-see-vue="import"]'); await p.click('#see-oublier'); await p.waitForFunction(() => !BASE_SEE.base);
  // oublier se fait d'abord et se rattrape dans le mot qui passe (« Rétablir ») — jamais une boîte du navigateur
  await p.click('#toast .toast-geste'); await p.waitForFunction(() => !!BASE_SEE.base);
  ok('« Oublier la base SEE » se rattrape : « Rétablir » dans le mot qui passe la garde de nouveau, sa cohérence avec elle', await p.evaluate(async () => { const b = await idbSEEFaire('readonly', s => s.get('base')); return !!b && b.nom === 'base-SEE-3.xlsx' && !!b.coherence && controlesSEE(BASE_SEE.base).filter(x => x.n).length === 36; }));
  await p.evaluate(() => oublierBaseSEE()); await p.waitForFunction(() => !BASE_SEE.base);
  // les tables de Volta (des photos des tables de SEE, relues par deux sources) passées comme des lignes de SEE : aucun contrôle des contacts ni des câbles ne s'y trompe
  const Sa = await p.evaluate(() => { const G = i => ('00000000' + i.toString(16)).slice(-8).toUpperCase() + '-0000-4000-8000-000000000000', fams = ['EN2997', 'EN3645', 'EN3646', 'EN4165'], N = normeEmbarqueeLue();
    const regles = [['ID', 'IDEquipment', 'PartNo', 'ClassName', 'LCStatusName', 'Version'], ...fams.map((f, i) => [G(1 + i), G(1 + i), f, 'Contact', 'Release', 1])], contacts = [['ID', 'IDEquipment', 'RuleNum', 'ContactType', 'ContactGauge', 'WireType', 'WireGauge', 'PartNo1', 'Quantity1', 'PartNo2', 'Quantity2']];
    N.contacts.filter(c => fams.includes(c.famille)).forEach((c, n) => contacts.push([G(1000 + n), G(1 + fams.indexOf(c.famille)), 100, c.sexe === 'M' ? 'Male' : 'Female', sectionAwg(parseFloat(c.taille)), c.typeFil, c.jauge == null ? -1 : sectionAwg(c.jauge), c.reference, 1, c.accessoire || '', c.accessoire ? 1 : '']));
    const cables = [['ID', 'IDEquipment', 'PartNo', 'Type', 'Gauge', 'ExternalMaxDiameter', 'LineicWeight', 'Shield', 'CableFamily', 'LCStatusName', 'Version']], fils = [['ID', 'IDCable', 'Gauge', 'Resistivity']];
    N.cables.forEach((c, i) => { const id = G(50000 + i); cables.push([id, id, c.cable, c.famille, c.jauge == null ? '' : sectionAwg(c.jauge), c.diametre == null ? '' : c.diametre / 1000, c.masse == null ? '' : c.masse / 1000, c.blindage ? 'SHIELDED' : 'UNSHIELDED', /coax/i.test(c.nature) ? 'Coaxial' : 'Wire', 'Release', 1]);
      for (let k = 0; k < (c.brins || 1); k++) fils.push([G(90000 + i * 10 + k), id, c.jauge == null ? '' : sectionAwg(c.jauge), c.resistance == null ? '' : c.resistance / 1000]); });
    const I = importerSEE({ regles, contacts, cables, fils }, 'tables de Volta'), K = I.coherence.c, n = k => (K[k] || {}).n || 0;
    return { lignes: contacts.length - 1, cables: cables.length - 1, retenus: I.contacts.length, ecartees: I.bilan.contacts.incoherentes, zero: ['c-sexe', 'c-taille', 'c-fut-gros', 'c-fut-fin', 'c-partie', 'c-paire', 'c-conflit', 'k-physique', 'k-diametre', 'k-diametre-gros', 'k-soeurs'].filter(k => n(k)).map(k => k + ' ' + n(k) + ' ' + K[k].ex.slice(0, 2).map(x => x.r + ' : ' + x.d).join(' ; ')),
      formes: [...new Set((K['c-forme'] || { ex: [] }).ex.map(x => x.r))].join(' ') }; });
  ok('les tables de Volta passées comme des lignes de SEE (442 contacts EN 2997, 3645, 3646, 4165 ; 226 câbles) : aucune ligne écartée, aucun sexe, taille, fût, paire, conflit, physique, Ø ou sœur en défaut — seuls ses noms courts (KB1600…) sont d’une forme inconnue',
    Sa.lignes === 442 && Sa.retenus === 442 && Sa.ecartees === 0 && Sa.cables === 226 && !Sa.zero.length && /^[KL][BC]\d{4}( [KL][BC]\d{4})*$/.test(Sa.formes), Sa.zero.join(' | ') + ' · ' + Sa.formes);
  ok('aucune erreur dans la page, après la cohérence', !e.length, e.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x));
  const ko = R.filter(x => x.startsWith('  KO')).length;
  console.log('\n  ' + (R.length - ko) + ' / ' + R.length + (ko ? '  — ' + ko + ' PROBLÈME(S)' : '  — tout tient'));
  await b.close(); process.exit(ko ? 1 : 0);
})();
