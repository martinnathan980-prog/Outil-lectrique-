/* ===========================================================================
   LA BIBLE DES BARRETTES, LES CONNECTEURS, LA NORME — contrôles sans navigateur.
       node tests/barrettes.js
   Le module 09 ne touche pas à la page : on le charge avec 01 et 02 dans un
   bac à sable et on vérifie la lecture d'une bible, le choix d'une référence,
   la lecture des connecteurs, puis la norme : sa lecture, le remplissage
   trou par trou, la simulation (valeurs connues à la main).
   ========================================================================= */
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.join(__dirname, '..', 'src'), NORMES = path.join(__dirname, '..', 'normes');
const code = ['01-modele.js', '02-lecture.js', '09-barrettes.js'].map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
// la norme embarquée, comme construire.js la met dans la page : tous les CSV de normes/
const normes = fs.readdirSync(NORMES).filter(f => /\.csv$/i.test(f)).sort().map(f => fs.readFileSync(path.join(NORMES, f), 'utf8')).join('\n\n');
const bac = { console };
vm.createContext(bac);
vm.runInContext('const NORME_EMBARQUEE = ' + JSON.stringify(normes) + ';\n' + code + '\nthis.X = { lireBible, bibleExemple, bibleDeLOutil, remplirModules, normeDesModules, moduleDeReference, contactAccepte, variantesQuiLogent, familleDeReference, famillesDeModules, connecteursEnModules, coupureEnModule, moduleDeConnecteur, arrangementsQuiLogent, numeroDeBorne, remplirContacts, pointsDe, besoinsDeBarrette, jaugeDuType, blindeDuType, choisirBarrette, barretteInfos, connecteursDe, connecteurDeBorne, connecteurParBorne, coupureInfos, connecteursInfos, suiviDuContrat, csvDuSuivi, paquetsDeBarrette, physiqueDeBarrette, physiqueDeReference, contratExemple, contratEssai,'
  + ' lireNorme, normeEmbarquee, normeExemple, normeLue, fusionnerNormes, familleDeNorme, typeDuFil, filDeNorme, facteurDeclassement, chuteAdmise, remplirSelonNorme, simulerBornier, liaison };', bac);
const X = bac.X;
/* Une norme et une bible « importées », d'une autre forme que les modules
   E0599 (un module par borne, un peigne de pontage) : la mécanique générique
   — lecture, choix, remplissage trou par trou, simulation — se vérifie sur
   elles, puisque l'outil ne propose plus que la norme ASNE 0599. */
const NORME_IMPORTEE = 'Familles\nNorme;Famille;Nature;Variantes;Pas;Jauge min;Jauge max;Intensité;Résistance;Fils par côté;Ordre;Paquets;Réservés;Masse;Note\n'
  + 'ASNE0500 (exemple);ASNE0500;jonction;2 4 8 12 20;5;26;20;7,5;5;1;croissant;contigus;;;\n'
  + 'ASNE0501 (exemple);ASNE0501;jonction;4 8;7,5;22;16;23;3;1;libre;contigus;1;;grosses sections\n'
  + 'ASNE0502 (exemple);ASNE0502;blindage;4 8;5;26;20;7,5;5;2;libre;contigus;;par paquet;reprise de blindage\n';
const BIB = [...X.lireBible('Référence;Famille;Nature;Bornes;Jauge min;Jauge max;Intensité;Blindage;Note\n'
  + [['ASNE0500', 'jonction', [2, 4, 8, 12, 20], 26, 20, 7.5, 'non'], ['ASNE0501', 'jonction', [4, 8], 22, 16, 23, 'non'], ['ASNE0502', 'blindage', [4, 8], 26, 20, 7.5, 'oui']]
    .flatMap(([fam, nat, ns, jmin, jmax, i, bl]) => ns.map(n => [fam + '-' + String(n).padStart(2, '0'), fam, nat, n, jmin, jmax, String(i).replace('.', ','), bl, 'exemple'].join(';'))).join('\n')).entrees, ...X.bibleExemple()];
let total = 0, echecs = 0;
const ok = (nom, cond, mesure) => { total++; if (!cond) echecs++; console.log('  ' + (cond ? 'OK    ' : 'ÉCHEC ') + nom + (mesure ? '   — ' + mesure : '')); };

console.log('\n1. LA JAUGE ET LE BLINDAGE SE LISENT DANS LE TYPE');
ok('DR24 → 24', X.jaugeDuType('DR24') === 24);
ok('MLB22 → 22, blindé', X.jaugeDuType('MLB22') === 22 && X.blindeDuType('MLB22'));
ok('BN20 → 20, non blindé', X.jaugeDuType('BN20') === 20 && !X.blindeDuType('BN20'));
ok('type vide → jauge inconnue', X.jaugeDuType('') === null);

console.log('\n2. LA BIBLE SE LIT PAR LE NOM DES COLONNES');
const csv = 'Bible barrettes\n\nRéférence;Famille;Nature;Bornes;Jauge min;Jauge max;Intensité;Blindage;Note\n'
  + 'NSA935420-02;NSA935420;jonction;2;26;20;7,5;non;\nNSA935420-06;NSA935420;jonction;6;26;20;7,5;non;\n'
  + 'NSA935421-06;NSA935421;blindage;6;26;20;7,5;oui;reprise\nNSA935430-04;NSA935430;jonction;4;20;12;25;non;grosses sections\n';
const b = X.lireBible(csv);
ok('quatre entrées lues, en-tête en ligne 3', b.entrees.length === 4 && b.entete === 3, b.entrees.length + ' entrées, en-tête ligne ' + b.entete);
ok('la virgule décimale passe', b.entrees[0].intensite === 7.5);
ok('les jauges sont rangées fine → grosse', b.entrees[3].jaugeMin === 20 && b.entrees[3].jaugeMax === 12);
ok('« oui » fait un blindage', b.entrees[2].blindage === true && b.entrees[0].blindage === false);
ok('un tableau sans référence ne fait pas de bible', X.lireBible('a;b\n1;2').entrees.length === 0);

console.log('\n3. LE CHOIX DE LA RÉFÉRENCE');
const L = X.contratExemple();
const vt = X.barretteInfos('667VT21', L, BIB);
ok('667VT21 : 4 bornes, jauge 24, un shunt', vt.nBornes === 4 && vt.jaugeFine === 24 && vt.shunts === 1, vt.nBornes + ' bornes · jauge ' + vt.jaugeFine + ' · ' + vt.shunts + ' shunt');
ok('la plus petite qui loge tout', vt.reference === 'ASNE0500-04', vt.reference + ' — ' + vt.raisons.join(', '));
const gros = X.choisirBarrette({ nBornes: 3, borneMax: 3, jaugeFine: 16, jaugeGrosse: 16, blindes: 0, pn: '' }, BIB);
ok('des fils de 16 vont sur la barrette des grosses sections', gros.choix && gros.choix.reference === 'ASNE0501-04', gros.choix && gros.choix.reference);
const blinde = X.choisirBarrette({ nBornes: 5, borneMax: 5, jaugeFine: 24, jaugeGrosse: 24, blindes: 2, pn: '' }, BIB);
ok('des fils blindés vont sur une barrette de blindage', blinde.choix && blinde.choix.nature === 'blindage' && blinde.choix.bornes === 8, blinde.choix && blinde.choix.reference);
const num = X.choisirBarrette({ nBornes: 2, borneMax: 11, jaugeFine: 24, jaugeGrosse: 24, blindes: 0, pn: '' }, BIB);
ok('la borne 11 exige au moins 11 modules', num.choix && num.choix.bornes >= 11, num.choix && num.choix.reference);
const rien = X.choisirBarrette({ nBornes: 40, borneMax: 40, jaugeFine: 24, jaugeGrosse: 24, blindes: 0, pn: '' }, BIB);
ok('sans référence qui convienne, on le dit', !rien.choix && /aucune/.test(rien.raisons.join(' ')));
const avecBible = X.barretteInfos('667VT21', L, b.entrees);
ok('avec une autre bible, la référence change et on le sait', avecBible.reference === 'NSA935420-06' && avecBible.changee, avecBible.reference);

console.log('\n4. LES CONNECTEURS D’UN ÉQUIPEMENT');
const c = X.connecteursDe('210SP1', L);
ok('210SP1 : connecteurs A et B lus dans les bornes', c.map(x => x.nom).join(',') === 'A,B', c.map(x => x.nom + '[' + x.bornes.join(' ') + ']').join(' '));
ok('A porte A3 et A4', c[0].bornes.join(',') === 'A3,A4');
const d = X.connecteursDe('115CD', L);
ok('115CD : un connecteur sans lettre reçoit la lettre A, son PN reste lisible', d.length === 1 && d[0].nom === 'A' && d[0].deduite && d[0].pn === 'ABS0864-12', d.map(x => x.nom + '·' + x.pn).join(','));
const e = X.connecteursDe('103RL1', L);
ok('103RL1 : les bornes A1/A2 font le connecteur A, X1/X2 le connecteur X', e.map(x => x.nom).join(',') === 'A,X', e.map(x => x.nom + '[' + x.bornes.join(' ') + ']').join(' '));
const f = X.connecteurParBorne('210SP1', L);
ok('borne par borne : B12 est sur B', f.get('B12') && f.get('B12').nom === 'B');
ok('une borne sans lettre ni PN n’a pas de connecteur', X.connecteurDeBorne('12', '') === null);
ok('le contrat d’essai (sans PN) n’a aucun connecteur', X.connecteursDe('210SP1', X.contratEssai()).length === 0);

console.log('\n5. LES PRISES DE COUPURE ET LES CONNECTEURS ONT LEUR BIBLE');
const csv2 = 'Référence;Nature;Bornes;Jauge min;Jauge max;Mobile\nEN3646A6083AAN;coupure;3;26;20;\nEN3646A6088AAN;coupure;8;26;20;\nEN2997Y1A08P;connecteur;8;26;20;EN2997Y2A08S\n';
const b2 = X.lireBible(csv2);
ok('la nature et la partie mobile se lisent', b2.entrees.length === 3 && b2.entrees[2].nature === 'connecteur' && b2.entrees[2].mobile === 'EN2997Y2A08S');
const vc = X.coupureInfos('408VC1A', L, X.bibleExemple());
ok('408VC1A : 1 contact → la prise à 3 contacts, celle du fichier', vc.reference === 'EN3646A6083AAN' && !vc.changee, vc.reference + ' — ' + vc.raisons.join(', '));
const vc2 = X.coupureInfos('409VC2A', L, X.bibleExemple());
ok('409VC2A : 3 contacts blindés → une prise, jamais une barrette', vc2.choix && vc2.choix.nature === 'coupure', vc2.reference);
const ci = X.connecteursInfos('340AB1', L, X.bibleExemple());
ok('340AB1 : l’embase du fichier donne la partie mobile à poser', ci.length === 1 && ci[0].mobile === 'EN2997Y2A08S' && ci[0].contacts === 8 && ci[0].libres === 5, ci.map(c => c.nom + '·' + c.pn + '→' + c.mobile + ' ' + c.libres + ' libres').join(' '));
const cj = X.connecteursInfos('601RC', L, X.bibleExemple());
ok('un connecteur inconnu de la bible n’a pas de partie mobile, et on le dit', cj.length === 1 && !cj[0].embase && cj[0].mobile === '');

console.log('\n6. LE SUIVI DU CONTRAT');
const S = X.suiviDuContrat(L, X.bibleDeLOutil(), 'exemple', n => n === '667VT21' ? 'E0599-1B204Z' : '');
const barrettes = S.filter(l => /barrette/.test(l.nature)), prises = S.filter(l => l.nature === 'prise de coupure'), conns = S.filter(l => l.nature === 'connecteur');
ok('une ligne par barrette, par prise, par connecteur', barrettes.length === 6 && prises.length === 5 && conns.length > 20, barrettes.length + ' barrettes · ' + prises.length + ' prises · ' + conns.length + ' connecteurs');
const l667 = S.find(l => l.repere === '667VT21');
ok('la référence retenue à la main l’emporte, celle du fichier reste', l667.reference === 'E0599-1B204Z' && l667.fichier === 'E0599-1B201Z', l667.reference + ' · fichier ' + l667.fichier);
const l668 = S.find(l => l.repere === '668VT31');
ok('sans choix à la main, la référence est celle du remplissage E0599', l668.reference === 'E0599-1B207Z', l668.reference);
ok('bornes dans l’ordre, fils et folios listés', l667.bornes.join(',') === '1,2,3,4' && l667.fils.length === 5 && l667.plans.join('') === '2', l667.bornes.join(',') + ' · ' + l667.fils.join(' ') + ' · folio ' + l667.plans);
ok('la barrette de blindage est dite telle', S.find(l => l.repere === '669VT32').nature === 'barrette de blindage');
const texteSuivi = X.csvDuSuivi(S);
ok('le CSV a un en-tête et une ligne par chose', texteSuivi.split('\n').length === S.length + 1 && /^Contrat;Repère;Nature;Référence retenue/.test(texteSuivi));
ok('les masses ne sont pas suivies', !S.some(l => /G$/.test(l.repere.split(' ')[0]) && l.nature !== 'connecteur' && /^\d+G$/.test(l.repere)));

console.log('\n7. LA BARRETTE PHYSIQUE');
const P = X.physiqueDeBarrette('668VT31', L, BIB);
ok('668VT31 : douze modules de la référence retenue', P.reference === 'ASNE0500-12' && P.modules.length === 12, P.reference + ' · ' + P.modules.length + ' modules');
ok('les paquets pontés : 1-2-3, 5-6, 8-9-10', P.paquets.filter(p => p.ponte).map(p => p.bornes.join('-')).join(' ') === '1-2-3 5-6 8-9-10', P.paquets.map(p => p.bornes.join('-')).join(' '));
ok('la borne 7 et les bornes 11, 12 sont libres', P.libres === 3 && !P.modules[6].utilisee && P.modules[10].paquet === null, P.libres + ' libres');
ok('chaque module dit ses fils : la borne 2 reçoit W-304', P.modules[1].fils.map(f => f.cable).join(',') === 'W-304' && P.modules[1].fils[0].vers === '351PM1', P.modules[1].fils.map(f => f.cable + '→' + f.vers).join(' '));
const Q = X.physiqueDeBarrette('409VC2A', L, X.bibleExemple());
ok('une prise de coupure a la même physique, sans paquet', Q.nature === 'prise de coupure' && Q.modules.length === 3 && Q.paquets.every(p => !p.ponte), Q.reference + ' · ' + Q.modules.length);
ok('chaque fil d’un module dit son sens et sa liaison : W-301 arrive (amont) sur la borne 1', P.modules[0].fils[0].cable === 'W-301' && P.modules[0].fils[0].amont === true && P.modules[0].fils[0].l === L.find(l => l.cable === 'W-301') && P.modules[1].fils[0].amont === false);

console.log('\n8. LA NORME SE LIT PAR LE NOM DES COLONNES, TABLE PAR TABLE');
const csvN = 'Ma norme\n\nFamilles\nNorme;Famille;Nature;Variantes;Pas;Jauge min;Jauge max;Intensité;Résistance;Fils par côté;Ordre;Paquets;Réservés;Masse;Note\n'
  + 'NSA935420;NSA935420;jonction;2 6 10;5 mm;26;20;7,5;4;2;croissant;contigus;;;\nNSA935421;NSA935421;blindage;6;5;26;20;7,5;4;2;libre;contigus;1, 6;par paquet;reprise\n\n'
  + 'Fils\nType;Jauge;Section;Résistance;Intensité\nDR;24;0,24;85;3,5\nDR;22;0,38;55;5\n;20;0,62;34;7,5\n\nCondition;Facteur\nfaisceau;0,8\n\nTension;Chute max\n28;1\n\nRéférence;Famille;Bornes\nNSA935420-02;NSA935420;2\n';
const N = X.lireNorme(csvN);
ok('quatre tables lues, la bible qui suit n’en est pas une', N.tables === 4 && N.familles.length === 2 && N.fils.length === 3 && N.declassements.length === 1 && N.reseau.length === 1, `${N.tables} tables · ${N.familles.length} familles · ${N.fils.length} fils`);
const f0 = N.familles[0], f1 = N.familles[1];
ok('une famille : le pas avec son unité, les jauges fine → grosse, l’intensité à virgule, deux fils par côté', f0.pas === 5 && f0.jaugeMin === 26 && f0.jaugeMax === 20 && f0.intensite === 7.5 && f0.resistance === 4 && f0.filsParCote === 2 && f0.variantes.join(',') === '2,6,10', JSON.stringify(f0));
ok('la règle de remplissage : ordre, paquets, réservés, masse', f0.ordre === 'croissant' && f0.paquets === 'contigus' && f0.reserves.length === 0 && f0.masse === '' && f1.ordre === 'libre' && f1.reserves.join(',') === '1,6' && f1.masse === 'par paquet' && !f0.exemple);
ok('un fil sans type vaut pour tous (« * »)', N.fils[2].type === '*' && N.fils[2].jauge === 20 && N.fils[0].type === 'DR' && N.fils[0].resistance === 85);
ok('un tableau quelconque ne fait pas de norme', !X.normeLue(X.lireNorme('a;b\n1;2')) && !X.normeLue(X.lireNorme('Référence;Famille;Bornes\nX-1;X;2')));
const NE = X.normeEmbarquee();
ok('la norme embarquée (normes/*.csv) : E0599, EN2997, EN4165, la prise EN3646, NSA937901, vingt fils, deux déclassements, deux réseaux, vingt-neuf tailles de contact, 261 modules', NE.familles.map(f => f.famille).join(' ') === 'E0599 EN2997 EN4165 EN3646 NSA937901' && NE.fils.length === 20 && NE.declassements.length === 2 && NE.reseau.length === 2 && NE.tailles.length === 29 && NE.modules.length === 261 && !X.normeExemple(NE), `${NE.familles.map(f => f.famille).join(' ')} · ${NE.fils.length} fils · ${NE.modules.length} modules`);
ok('ASNE 0599 et NSA937901 ne sont pas des exemples ; EN3646 l’est', !NE.familles.find(f => f.famille === 'E0599').exemple && !NE.familles.find(f => f.famille === 'NSA937901').exemple && NE.familles.find(f => f.famille === 'EN3646').exemple);
const NA = X.fusionnerNormes(NE, X.lireNorme(NORME_IMPORTEE));
const NF = X.fusionnerNormes(NA, N);
ok('fusionner : la famille homonyme est remplacée, les autres s’ajoutent ; les modules restent', NA.familles.length === 8 && NF.familles.length === 10 && NF.modules.length === 261 && NF.fils.length === 21 && NF.fils.find(f => f.type === 'DR' && f.jauge === 24) === N.fils[0], `${NF.familles.length} familles · ${NF.fils.length} fils`);
ok('la famille d’une référence : par la bible, sinon par le début de la référence', X.familleDeNorme(NA, 'ASNE0500', '').famille === 'ASNE0500' && X.familleDeNorme(NE, '', 'EN3646A6083AAN').famille === 'EN3646' && X.familleDeNorme(NE, 'NSA935420', 'NSA935420-02') === null);
ok('le fil de la norme : type et jauge exacts, sinon la jauge seule et on le dit', X.typeDuFil('MLB24') === 'MLB' && X.filDeNorme(NE, 'MLB24', 24).intensite === 3 && X.filDeNorme(NE, 'XX24', 24).approx === true && X.filDeNorme(NE, 'DR10', 10) === null && X.filDeNorme(N, 'DR20', 20).type === '*');
ok('le déclassement se multiplie, la chute admise suit la tension', X.facteurDeclassement(NE, ['faisceau']) === 0.8 && Math.abs(X.facteurDeclassement(NE, ['faisceau', 'chaud']) - 0.68) < 1e-9 && X.facteurDeclassement(NE, []) === 1 && X.chuteAdmise(NE, 28).chuteMax === 1 && X.chuteAdmise(NE, 115).chuteMax === 4 && X.chuteAdmise(NE, 24).chuteMax === 1);

console.log('\n9. LE REMPLISSAGE : CHAQUE FIL DANS SON TROU, LA RÈGLE DE LA NORME');
const R = X.remplirSelonNorme(X.physiqueDeBarrette('667VT21', L, BIB), NA);
ok('667VT21 sur ASNE0500 : un trou par côté, W-101 côté amont du module 1, le trou aval libre', R.famille.famille === 'ASNE0500' && R.filsParCote === 1 && R.modules[0].trous.amont[0].cable === 'W-101' && R.modules[0].trous.aval[0] === null, JSON.stringify(R.modules[0].trous.amont.map(f => f && f.cable)));
ok('W-103 côté aval du module 2, l’amont libre ; le pont W-102 n’est dans aucun trou', R.modules[1].trous.aval[0].cable === 'W-103' && R.modules[1].trous.amont[0] === null && !R.modules.some(m => [...m.trous.amont, ...m.trous.aval].some(f => f && f.cable === 'W-102')));
ok('quatre modules pleins dans l’ordre, jauge 24 admise : aucun verdict', R.verdicts.length === 0 && R.modules.every(m => m.fils.every(f => f.jaugeOk === true)), R.verdicts.map(v => v.texte).join(' | '));
const R2 = X.remplirSelonNorme(X.physiqueDeBarrette('668VT31', L, BIB), NA);
ok('668VT31 : le module 7 libre avant le 10 est une remarque (ordre croissant), pas un défaut', R2.verdicts.length === 1 && R2.verdicts[0].niveau === 'attention' && /module 7 libre avant le 10/.test(R2.verdicts[0].texte), R2.verdicts.map(v => v.texte).join(' | '));
const R3 = X.remplirSelonNorme(X.physiqueDeBarrette('669VT32', L, BIB), NA);
ok('669VT32 sur ASNE0502 : deux trous par côté, le paquet 1-2-3-4 se ferme sur la masse 905G, rien à redire', R3.famille.famille === 'ASNE0502' && R3.filsParCote === 2 && R3.modules[0].trous.amont.length === 2 && R3.modules[0].trous.amont[1] === null && R3.verdicts.length === 0, R3.verdicts.map(v => v.texte).join(' | '));
const li = (de, bDe, vers, bVers, cable, type) => X.liaison({ de, borneDe: bDe, pnDe: de.endsWith('VT') ? '' : '', vers, borneVers: bVers, cable, type });
const L4 = [li('A1', '1', '700VT', '1', 'W-1', 'DR24'), li('B1', '1', '700VT', '1', 'W-2', 'DR24'), li('700VT', '1', '700VT', '3', 'W-3', 'DR24'), li('700VT', '3', 'C1', '1', 'W-4', 'DR16')];
const R4 = X.remplirSelonNorme(X.physiqueDeBarrette('700VT', L4, BIB), NA);
const t4 = R4.verdicts.map(v => v.niveau + ':' + v.texte).join(' | ');
ok('deux fils dans un trou : surcharge dite, le second fil marqué', /ko:module 1 : 2 fils côté amont pour 1 trou/.test(t4) && R4.modules[0].surcharge === 1 && R4.modules[0].trous.amont.length === 2, t4);
ok('un pont qui saute le module 2 : le peigne ne saute pas un module', /ko:paquet 1-3 : le peigne de pontage ne saute pas un module/.test(t4));
ok('un DR16 sur un contact 26–20 : jauge hors plage, sur le module dit', /ko:W-4 \(DR16\) : jauge 16 hors de 26–20 AWG sur le module 3/.test(t4) && R4.modules[2].fils[0].jaugeOk === false);
const L5 = [li('A1', '1', '701VT', '1', 'W-1', 'DR16'), li('701VT', '2', 'B1', '1', 'W-2', 'DR16')];
const R5 = X.remplirSelonNorme({ ...X.physiqueDeBarrette('701VT', L5, X.bibleExemple()), reference: 'ASNE0501-04', entree: BIB.find(e => e.reference === 'ASNE0501-04') }, NA);
ok('ASNE0501 : le module 1 réservé par la norme, utilisé → défaut ; DR16 admis sur 22–16', R5.verdicts.length === 1 && /module 1 réservé/.test(R5.verdicts[0].texte) && R5.modules[0].fils[0].jaugeOk === true, R5.verdicts.map(v => v.texte).join(' | '));
const L6 = [li('A1', '1', '702VT', '1', 'W-1', 'MLB24'), li('702VT', '1', '702VT', '2', 'W-2', 'DR24'), li('B1', '1', '702VT', '2', 'W-3', 'MLB24')];
const R6 = X.remplirSelonNorme({ ...X.physiqueDeBarrette('702VT', L6, X.bibleExemple()), reference: 'ASNE0502-04', entree: BIB.find(e => e.reference === 'ASNE0502-04') }, NA);
ok('une barrette de blindage dont le paquet ne va pas à la masse : défaut', R6.verdicts.length === 1 && /paquet 1-2 sans retour de masse/.test(R6.verdicts[0].texte), R6.verdicts.map(v => v.texte).join(' | '));
const R7 = X.remplirSelonNorme(X.physiqueDeBarrette('667VT21', L, X.bibleExemple()), X.lireNorme(''));
ok('sans norme : pas de famille, un trou par côté, aucun verdict, la jauge n’est pas jugée', R7.famille === null && R7.filsParCote === 1 && R7.verdicts.length === 0 && R7.modules[0].fils[0].jaugeOk === null);
const RP = X.remplirSelonNorme(X.physiqueDeBarrette('408VC1A', L, BIB), NE);
ok('408VC1A sur EN3646 : W-130 dans la fiche du contact 1, W-131 dans l’embase ; les contacts 2 et 3 libres des deux côtés', RP.famille.famille === 'EN3646' && RP.cotes.amont === 'fiche' && RP.modules[0].trous.amont[0].cable === 'W-130' && RP.modules[0].trous.aval[0].cable === 'W-131' && RP.modules[1].trous.amont[0] === null && RP.modules[2].trous.aval[0] === null && RP.verdicts.length === 0);
const RR = X.remplirSelonNorme(X.physiqueDeReference(BIB.find(e => e.reference === 'ASNE0502-08')), NA);
ok('une référence de la bible, sans contrat : huit modules, deux trous libres par côté', RR.modules.length === 8 && RR.modules.every(m => m.trous.amont.length === 2 && m.trous.amont.every(t => t === null)));

console.log('\n10. LA SIMULATION : DES VALEURS CONNUES À LA MAIN');
const SI = X.simulerBornier(R, NA, { longueur: 5, courant: 2, tension: 28, conditions: ["faisceau"] });
ok('667VT21 : quatre fils simulés, aucun pont, les hypothèses reprises', SI.lignes.length === 4 && SI.hyp.longueur === 5 && SI.hyp.courant === 2 && SI.facteur === 0.8 && SI.chute.chuteMax === 1 && !SI.sansNorme, SI.lignes.map(x => x.cable).join(' '));
const w101 = SI.lignes.find(x => x.cable === 'W-101');
ok('W-101 (DR24, 5 m, 2 A) : R = 85/1000×5 + 5/1000 = 0,43 Ω, ΔU = 0,86 V = 3,07 % de 28 V', w101 && Math.abs(w101.rFil - 0.425) < 1e-9 && Math.abs(w101.rContact - 0.005) < 1e-9 && Math.abs(w101.R - 0.43) < 1e-9 && Math.abs(w101.dU - 0.86) < 1e-9 && Math.abs(w101.pct - 3.0714) < 1e-3, JSON.stringify({ R: w101 && w101.R, dU: w101 && w101.dU, pct: w101 && w101.pct }));
ok('…le fil admet 3,5 × 0,8 = 2,8 A, le contact 7,5 A, la jauge est admise : ok', Math.abs(w101.iFil - 2.8) < 1e-9 && w101.iContact === 7.5 && w101.jaugeOk === true && w101.verdict === 'ok' && w101.sens === 'amont' && w101.borne === "1" && SI.compte.ok === 4);
const S2 = X.simulerBornier(R, NA, { courant: 3 });
ok('à 3 A en faisceau, le courant dépasse le fil (2,8 A)', S2.lignes.every(x => x.verdict === 'fil'));
const S3 = X.simulerBornier(R, NA, { courant: 3, conditions: [] });
ok('à 3 A hors faisceau, le fil admet 3,5 A : la chute (1,29 V) dépasse le volt admis', S3.facteur === 1 && S3.lignes[0].iFil === 3.5 && Math.abs(S3.lignes[0].dU - 1.29) < 1e-9 && S3.lignes.every(x => x.verdict === 'chute'), S3.lignes[0].dU);
const S4 = X.simulerBornier(R, NA, { courant: 10, conditions: [] });
ok('à 10 A, c’est le contact (7,5 A) qui parle avant la chute', S4.lignes.every(x => x.verdict === 'fil') && X.simulerBornier(R, X.fusionnerNormes(NA, X.lireNorme('Type;Jauge;Résistance;Intensité\nDR;24;85;12')), { courant: 10, conditions: [] }).lignes[0].verdict === 'contact');
const S5 = X.simulerBornier(R, NA, { longueur: 10, courant: 1, tension: 115 });
ok('sur 115 V la chute admise est de 4 V : 0,855 V, soit 0,74 %, ok', S5.chute.chuteMax === 4 && Math.abs(S5.lignes[0].dU - 0.855) < 1e-9 && Math.abs(S5.lignes[0].pct - 0.7435) < 1e-3 && S5.lignes[0].verdict === 'ok');
const S6 = X.simulerBornier(R4, NA, {});
const w4 = S6.lignes.find(x => x.cable === 'W-4'), w2 = S6.lignes.find(x => x.cable === 'W-2');
ok('une jauge hors plage l’emporte sur tout ; un fil en surcharge est dit tel', w4.verdict === 'jauge' && w4.fil && w4.fil.intensite === 13 && w2.surcharge === true && w2.trou === 2, JSON.stringify({ v: w4.verdict, trou: w2.trou }));
const S7 = X.simulerBornier(X.remplirSelonNorme(X.physiqueDeBarrette('667VT21', L.map(l => ({ ...l, type: 'XX24' })), BIB), NA), NA, {});
ok('un type inconnu de la norme : la jauge seule sert, et c’est dit (approx)', S7.lignes.every(x => x.approx && x.verdict === 'ok' && x.fil.jauge === 24));
const S8 = X.simulerBornier(X.remplirSelonNorme(X.physiqueDeBarrette('667VT21', L.map(l => ({ ...l, type: 'DR10' })), BIB), NA), NA, {});
ok('une jauge que la norme ne connaît pas : fil inconnu, rien d’inventé', S8.lignes.every(x => x.verdict === 'jauge' || x.verdict === 'inconnu') && S8.lignes[0].dU === null);
const S9 = X.simulerBornier(R7, X.lireNorme(''), {});
ok('sans norme : la simulation le dit, sans une ligne calculée', S9.sansNorme && S9.lignes.every(x => x.dU === null && x.verdict === 'inconnu'));
const SP = X.simulerBornier(RP, NE, {});
ok('la prise 408VC1A : deux fils MLB24 (3 × 0,8 = 2,4 A), contact EN3646 à 8 mΩ : ΔU = (0,425 + 0,008) × 2 = 0,866 V, ok', SP.lignes.length === 2 && Math.abs(SP.lignes[0].iFil - 2.4) < 1e-9 && Math.abs(SP.lignes[0].dU - 0.866) < 1e-9 && SP.lignes.every(x => x.verdict === 'ok') && SP.lignes[0].sens === 'amont' && SP.lignes[1].sens === 'aval');

console.log('\n11. LES MODULES DE JONCTION ASNE 0599 : LE CATALOGUE');
const MS = NE.modules.filter(m => m.famille === 'E0599'), mv = v => MS.find(m => m.variante === v);
ok('29 variantes : A101–A106, B201–B209, C301–C306, D401–D403, D501–D504, E601', MS.map(m => m.variante).join(' ') === 'A101 A102 A103 A104 A105 A106 B201 B202 B203 B204 B205 B206 B207 B208 B209 C301 C302 C303 C304 C305 C306 D401 D402 D403 D501 D502 D503 D504 E601', MS.map(m => m.variante).join(' '));
const parType = { 1: 36, 2: 18, 3: 10, 4: 8 };
ok('36 contacts #22 au type 1, 18 #20 au type 2, 10 #16 au type 3, 8 #12 au type 4', MS.filter(m => parType[m.type]).every(m => m.contacts.length === parType[m.type] && m.contacts.every(c => c.taille === { 1: '22', 2: '20', 3: '16', 4: '12' }[m.type])),
  MS.filter(m => parType[m.type] && m.contacts.length !== parType[m.type]).map(m => m.variante + ':' + m.contacts.length).join(' '));
ok('chaque contact est sur la face, une seule fois, dans un seul groupe', MS.every(m => new Set(m.contacts.map(c => c.lettre)).size === m.contacts.length && m.contacts.every(c => c.r < m.rangs && c.c < m.colonnes) && new Set(m.contacts.map(c => c.r + ',' + c.c)).size === m.contacts.length));
ok('les groupes : A101 18 × 2, B204 3 × 6, C304 4-4-2, D501 un groupe de 6 #16 et 2 #12', mv('A101').groupes.length === 18 && mv('A101').groupes.every(g => g.contacts.length === 2) && mv('B204').groupes.map(g => g.contacts.length).join() === '6,6,6'
  && mv('C304').groupes.map(g => g.contacts.length).join() === '4,4,2' && mv('D501').contacts.filter(c => c.taille === '12').map(c => c.lettre).join() === 'C,F' && mv('D501').groupes.length === 1);
ok('le module à diodes : trois diodes S1→S2, S3→S4, S5→S6', mv('E601').aDiodes && mv('E601').diodes.map(d => d.join('>')).join(' ') === 'S1>S2 S3>S4 S5>S6');
const mB = X.moduleDeReference(NE, 'E0599-1B204Z');
ok('la désignation E0599-1B204Z désigne la variante B204 ; une référence d’ailleurs, aucune', mB && mB.variante === 'B204' && mB.reference === 'E0599-1B204Z' && X.moduleDeReference(NE, 'NSA935420-06') === null);
const acc = (t, j) => X.contactAccepte(NE, 'E0599', t, j);
ok('la taille d’un contact dit les jauges qu’il reçoit : #22 26–22, #20 24–20, #16 20–16, #12 14–12', acc('22', 24) && !acc('22', 20) && acc('20', 20) && !acc('20', 26) && !acc('20', 18) && acc('16', 16) && !acc('12', 16) && acc('12', 12));
const BO = X.bibleDeLOutil();
ok('la bible de l’outil : les 261 modules d’abord (29 ASNE 0599, 35 EN 2997-002, 93 EN 3645-002, 31 EN 3646-002, 30 EN 4165-002, 43 NSA937901), puis les coupures et connecteurs d’exemple, aucune barrette d’ailleurs', BO.filter(e => e.module).length === 261 && BO.slice(0, 261).every(e => e.module) && BO.filter(e => e.famille === 'NSA937901').length === 43 && BO.filter(e => e.famille === 'EN4165').every(e => e.nature === 'module de connecteur') && !BO.some(e => /^ASNE05/.test(e.reference)) && BO.find(e => e.reference === 'E0599-1C302Z').jaugeMin === 20, BO.length + ' références');

console.log('\n12. LE REMPLISSAGE AUTOMATIQUE DES MODULES');
const attendu = { '667VT21': ['E0599-1B209Z', 3], '668VT31': ['E0599-1B207Z', 4], '669VT32': ['E0599-1B208Z', 1], '670VT41': ['NSA937901-20-06', 3], '671VT42': ['NSA937901-20-04', 1], '672VT51': ['E0599-1A102Z', 7] };
Object.entries(attendu).forEach(([r, [ref, n]]) => { const I = X.barretteInfos(r, L, BO), Q = I.plan;
  const unGroupe = Q.potentiels && Q.modules.every(M => M.places.every(pl => pl.fils.every(([, c]) => pl.groupe.contacts.includes(c))));
  const contacts = Q.fils.map(x => x.module + '|' + x.contact.lettre);
  ok(`${r} : ${ref}, ${n} potentiel${n > 1 ? 's' : ''} tous placés, chaque fil sur un contact de son groupe qui admet sa jauge, aucun contact deux fois`,
    I.reference === ref && Q.places === n && Q.potentiels === n && !Q.verdicts.length && unGroupe && new Set(contacts).size === contacts.length && Q.fils.every(x => x.jaugeOk !== false),
    `${I.reference} · ${Q.places}/${Q.potentiels} · ${Q.utilises}/${Q.contacts} contacts`); });
const I72 = X.barretteInfos('672VT51', L, BO);
ok('672VT51 : 19 fils sur 36 contacts, deux potentiels ne partagent jamais un groupe', I72.plan.utilises === 19 && I72.plan.contacts === 36 && new Set(I72.plan.modules[0].places.map(p => p.groupe.k)).size === I72.plan.modules[0].places.length);
ok('les candidates d’un seul module se rangent de la mieux taillée à la moins bien', I72.candidats.length > 0 && I72.candidats[0].reference === 'E0599-1A102Z', I72.candidats.slice(0, 4).map(e => e.reference).join(' '));
const essai = (r, fils) => fils.map(([b, cable, type], k) => li('S' + k, '1', r, b, cable, type));
const Ig = X.barretteInfos('710VT', essai('710VT', [['1', 'W-1', 'DR12'], ['1', 'W-2', 'DR12'], ['2', 'W-3', 'DR12']]), BO, undefined, 'E0599');
ok('des fils de jauge 12 vont sur un module #12 (type 4)', /^E0599-1D40\d/.test(Ig.reference) && Ig.plan.places === 2, Ig.reference);
const Im = X.barretteInfos('711VT', essai('711VT', [['1', 'W-1', 'DR16'], ['1', 'W-2', 'DR24'], ['2', 'W-3', 'DR24']]), BO, undefined, 'E0599');
ok('un potentiel qui mêle 16 et 24 : aucun contact ne reçoit les deux tailles dans un même groupe — dit, pas inventé', Im.plan.restants.length === 1 && Im.plan.verdicts.length === 1 && /borne 1 : 2 fils de jauge 16, 24 — aucun groupe de la norme ASNE 0599/.test(Im.plan.verdicts[0].texte), Im.plan.verdicts.map(v => v.texte).join(' | '));
const Ib = X.barretteInfos('712VT', essai('712VT', Array.from({ length: 20 }, (_, k) => [String(k + 1), 'W-' + (k + 1), 'DR22'])), BO, undefined, 'E0599');
ok('vingt potentiels d’un fil de 22 : plus qu’un module n’en loge, deux modules', Ib.plan.modules.length === 2 && Ib.plan.places === 20 && /^2 × |\+/.test(Ib.plan.reference), Ib.plan.reference);
const Q16 = X.remplirModules({ bornes: ['1'], ponts: [], parBorne: new Map([['1', [{ cable: 'W-1', type: 'DR16' }]]]) }, NE, 'E0599-1A101Z');
ok('une variante retenue à la main dont les contacts refusent la jauge : le fil n’est pas posé, on le dit', Q16.places === 0 && /aucun groupe de A101/.test(Q16.verdicts[0].texte), Q16.verdicts.map(v => v.texte).join(' | '));
ok('le module à diodes n’est jamais choisi seul', Object.keys(attendu).every(r => !X.barretteInfos(r, L, BO).plan.modules.some(M => M.module.aDiodes)));

console.log('\n13. LA NORME NSA937901');
const NS = NE.modules.filter(m => m.famille === 'NSA937901'), nv = v => NS.find(m => m.variante === v);
ok('43 codes d’arrangement : 22D-01…07, 22-01…07, 20-01…12, 16-01…06, 12-03…06 et 12-12, M12-02, 07, 08, 09, 10, 11', NS.length === 43 && ['22D', '22', '20', '16', '12'].map(t => NS.filter(m => m.type.toUpperCase() === t).length).join() === '7,7,12,6,5' && NS.filter(m => m.type === 'mixte').map(m => m.variante).join(' ') === 'M12-02 M12-07 M12-08 M12-09 M12-10 M12-11', NS.map(m => m.variante).join(' '));
ok('les faces : 21 contacts R…Y / H…P / A…G, 10 contacts F…K / A…E, 8 contacts E…H / A…D, 6 contacts D E F / A B C', NS.every(m => m.contacts.length === { '22D': 21, '22': 21, '20': 10, '16': 8, '12': 6 }[m.type.toUpperCase()] || m.type === 'mixte')
  && nv('22D-01').contacts.find(c => c.lettre === 'Y').c === 6 && nv('20-04').contacts.find(c => c.lettre === 'F').r === 0 && nv('12-03').contacts.find(c => c.lettre === 'A').r === 1);
ok('les groupes : 22D-01 9 × 2 + 3 (Y-P-G), 22D-02 7 colonnes de 3, 20-04 A-B-F-G et C-D-E-H-J-K, 16-06 E-F-G | A-B-C | D-H, 22D-07 21 contacts seuls',
  nv('22D-01').groupes.length === 10 && nv('22D-01').groupes[9].contacts.map(c => c.lettre).join('') === 'YPG' && nv('22D-02').groupes.every(g => g.contacts.length === 3)
  && nv('20-04').groupes.map(g => g.contacts.map(c => c.lettre).join('')).join(' ') === 'ABFG CDEHJK' && nv('16-06').groupes.map(g => g.contacts.map(c => c.lettre).join('')).join(' ') === 'EFG ABC DH' && nv('22D-07').groupes.length === 21);
ok('les mixtes : M12-08 deux groupes de 2 #12, 1 #16, 2 #20 ; M12-02 8 #20 et 2 #12 ; M12-07 2 #12, 4 #16, 12 #20', ['K', 'H', 'J', 'G'].every(l => nv('M12-08').contacts.find(c => c.lettre === l).taille === '12') && nv('M12-08').groupes.every(g => g.contacts.length === 5)
  && nv('M12-02').contacts.filter(c => c.taille === '12').length === 2 && ['12', '16', '20'].map(t => nv('M12-07').contacts.filter(c => c.taille === t).length).join() === '2,4,12');
ok('l’usage : 22D-01 normal, 22D-05 possible, 12-12 et M12-10 A350, M12-07 à confirmer — ni A350 ni « à confirmer » ne sont choisis seuls', nv('22D-01').usage === 'normal' && nv('22D-05').usage === 'possible' && nv('12-12').usage === 'A350' && nv('M12-10').usage === 'A350' && nv('M12-07').usage === 'à confirmer' && !nv('12-12').auto && !nv('M12-07').auto && nv('22D-01').auto);
ok('le corps : 22D-06, 22D-07, 20-12 et les mixtes étanches ; 22D-01 ovale ; 16-01 rectangle', ['22D-06', '22D-07', '20-12', 'M12-02', 'M12-08'].every(v => nv(v).corps === 'étanche') && nv('22D-01').corps === 'ovale' && nv('16-01').corps === 'rectangle');
const accN = (t, j) => X.contactAccepte(NE, 'NSA937901', t, j);
ok('chaque norme ses jauges : un contact 20 NSA937901 prend du 24 au 18, un #20 ASNE 0599 du 24 au 20 ; 22D du 26 au 22, 22 (ABS) du 24 au 22', accN('20', 18) && !acc('20', 18) && accN('22D', 26) && !accN('22', 26) && accN('22', 24) && accN('16', 20) && accN('12', 14) && !accN('12', 16));
ok('une désignation se lit écrite autrement ; la norme d’un part number se reconnaît', X.moduleDeReference(NE, 'NSA937901 20-04').variante === '20-04' && X.moduleDeReference(NE, 'nsa937901-m12-08').variante === 'M12-08' && X.familleDeReference(NE, 'NSA937901-20-06') === 'NSA937901' && X.familleDeReference(NE, 'E0599-1B201Z') === 'E0599' && X.familleDeReference(NE, 'NSA935420-06') === '' && X.famillesDeModules(NE).join() === 'E0599,NSA937901');
const b672 = X.besoinsDeBarrette('672VT51', L), QN = X.remplirModules(b672, NE, 'NSA937901');
ok('672VT51 en NSA937901 : les DR24 sur un 22D, les DR22 qui dépassent sur un 20 — deux modules, tout placé', QN.modules.length === 2 && QN.modules.every(M => M.module.famille === 'NSA937901') && QN.places === 7 && QN.fils.every(x => x.jaugeOk === true), QN.reference);
ok('le part number du fichier dit la norme : 670VT41 (NSA937901-20-06) reste en NSA937901, 668VT31 (E0599) en ASNE 0599', X.barretteInfos('670VT41', L, BO).plan.famille === 'NSA937901' && X.barretteInfos('668VT31', L, BO).plan.famille === 'E0599');
ok('la norme retenue à la main l’emporte sur le fichier ; une variante retenue aussi', X.barretteInfos('668VT31', L, BO, undefined, 'NSA937901').plan.modules.every(M => M.module.famille === 'NSA937901') && X.barretteInfos('670VT41', L, BO, undefined, 'E0599-1B207Z').reference === 'E0599-1B207Z');
const I18 = X.barretteInfos('713VT', essai('713VT', [['1', 'W-1', 'DR18'], ['1', 'W-2', 'DR24'], ['2', 'W-3', 'DR24']]), BO);
ok('sans part number, les deux normes concourent : un potentiel 18 + 24 que seule la NSA937901 reçoit (contacts 20 : 24–18)', I18.plan.places === 2 && I18.plan.modules[0].module.famille === 'NSA937901' && !I18.plan.verdicts.length, I18.reference);
ok('les candidates d’un seul module, par norme', X.variantesQuiLogent(b672, NE, 'E0599').every(m => m.famille === 'E0599') && X.variantesQuiLogent(X.besoinsDeBarrette('671VT42', L), NE, 'NSA937901')[0].usage === 'normal');

console.log('\n14. EN 4165-002 : LES MODULES DES CONNECTEURS ET DES PRISES DE COUPURE');
const EN = NE.modules.filter(m => m.famille === 'EN4165'), ev = v => EN.find(m => m.variante === v);
ok('30 arrangements, tous d’emploi connecteur, jamais proposés pour une barrette', EN.length === 30 && EN.every(m => m.emploi === 'connecteur') && X.famillesDeModules(NE).join() === 'E0599,NSA937901' && X.famillesDeModules(NE, 'connecteur').join() === 'EN2997,EN3645,EN3646,EN4165'
  && !X.remplirModules(X.besoinsDeBarrette('668VT31', L), NE).modules.some(M => M.module.famille === 'EN4165'));
ok('les faces : 20-22 4 × 5 numérotés de 1 à 20, 12-20 3 × 4, 08-16 en quinconce 3-2-3, 04-12 2 × 2, 01-08 un contact, N sans contact', ev('20-22').contacts.length === 20 && ev('20-22').contacts.find(c => c.lettre === '16').r === 3 && ev('12-20').contacts.length === 12
  && ev('08-16').contacts.find(c => c.lettre === '4').c === 0.5 && ev('04-12').contacts.every(c => c.taille === '12') && ev('01-08').contacts[0].taille === '8' && ev('N').contacts.length === 0 && !ev('N').auto);
ok('les mixtes : 99-01 six #16 et cinq #22, 99-10 huit #22 et deux #16 (5, 6)', ['16', '22'].map(t => ev('99-01').contacts.filter(c => c.taille === t).length).join() === '6,5' && ev('99-10').contacts.filter(c => c.taille === '16').map(c => c.lettre).join() === '5,6');
ok('les modules shuntés Y et Z : 20Y22 cinq colonnes de 4, 2AY22 trois colonnes et quatre paires, 2BZ22 dix paires — jamais choisis seuls ; Y numéroté de droite à gauche',
  ev('20Y22').groupes.length === 5 && ev('2AY22').groupes.map(g => g.contacts.length).sort().join() === '2,2,2,2,4,4,4' && ev('2BZ22').groupes.every(g => g.contacts.length === 2) && !ev('20Z22').auto
  && ev('20Y22').contacts.find(c => c.lettre === '1').c === 4 && ev('20Z22').contacts.find(c => c.lettre === '1').c === 0);
ok('les contacts EN 3155 : 22 de 26 à 22, 20 de 24 à 20, 16 de 20 à 16, 12 de 14 à 12, 8 de 10 à 8', X.contactAccepte(NE, 'EN4165', '22', 26) && !X.contactAccepte(NE, 'EN4165', '22', 20) && X.contactAccepte(NE, 'EN4165', '20', 20) && !X.contactAccepte(NE, 'EN4165', '20', 18) && X.contactAccepte(NE, 'EN4165', '8', 8) && !X.contactAccepte(NE, 'EN4165', '12', 16));
ok('le numéro de contact d’une borne : A11 → 11, 7 → 7', X.numeroDeBorne('A11') === '11' && X.numeroDeBorne('7') === '7' && X.numeroDeBorne('B10') === '10');
ok('le part number nomme l’arrangement : EN4165-002-08W16, « EN4165 12-20 » ; EN4165-2M n’en nomme aucun', X.moduleDeConnecteur(NE, 'EN4165-002-08W16').variante === '08W16' && X.moduleDeConnecteur(NE, 'EN4165 12-20').variante === '12-20' && X.moduleDeConnecteur(NE, 'EN4165-2M') === null && X.moduleDeConnecteur(NE, 'ABS0864-12') === null);
const C300 = X.connecteursEnModules('300XC1', L, NE), cA = C300.find(c => c.nom === 'A'), cB = C300.find(c => c.nom === 'B');
ok('300XC1 : trois cavités EN 4165 ; A (11 bornes, DR24/22) sur un 12-20, chaque borne sur son contact, rien à redire', C300.length === 3 && cA.plan.reference === 'EN4165-002-12-20' && cA.plan.places === 11 && !cA.plan.verdicts.length && cA.plan.fils.every(x => x.contact.lettre === X.numeroDeBorne(x.potentiel.bornes[0]) && x.jaugeOk === true));
ok('300XC1 B : un DR16 en B5 parmi des DR20/DR22 — aucun arrangement ne loge tout, c’est dit, rien n’est inventé', cB.plan.modules.length === 0 && /aucun arrangement EN 4165-002 ne loge/.test(cB.plan.verdicts[0].texte));
const cB2 = X.remplirContacts(cB.points, NE, { choix: 'EN4165-002-99-10' });
ok('retenu à la main, le 99-10 dit ce qu’il refuse : les DR20 sur ses contacts 22, le contact 10 aussi', cB2.reference === 'EN4165-002-99-10' && cB2.main && cB2.fils.filter(x => x.jaugeOk === false).length === 2 && cB2.verdicts.filter(v => v.niveau === 'ko').length === 2, cB2.verdicts.map(v => v.texte).join(' | '));
const C600 = X.connecteursEnModules('600XC4', L, NE)[0];
ok('600XC4 A : douze bornes jusqu’à A15 sur un 20-22 ; deux fils sur le contact 11 sont signalés', C600.plan.reference === 'EN4165-002-20-22' && C600.plan.verdicts.some(v => v.niveau === 'attention' && /contact 11 : 2 fils/.test(v.texte)));
const VC = X.coupureEnModule('411VC3A', L, NE, 'EN4165').plan;
ok('411VC3A en prise de coupure EN 4165 (retenue à la main) : 8 contacts sur un 12-20, deux fils par contact (fiche et embase), jauges admises', VC.reference === 'EN4165-002-12-20' && VC.places === 8 && VC.fils.length === 16 && VC.fils.every(x => x.jaugeOk === true) && !VC.verdicts.length);
ok('408VC1A (EN3646A6083AAN) : le part number nomme la norme EN 3646 et l’arrangement 08-3A ; retenue en EN 2997, le plus petit qui l’admet (10-02)', X.coupureEnModule('408VC1A', L, NE).plan.reference === 'EN3646-002-08-3A' && X.coupureEnModule('408VC1A', L, NE, 'EN2997').plan.reference === 'EN2997-002-10-02' && X.coupureEnModule('408VC1A', L, NE, 'EN4165').plan.reference === 'EN4165-002-12-20');
const P8 = X.remplirContacts([{ borne: '1', num: '1', fils: [{ cable: 'W-9', type: 'DR8', jauge: 8 }] }], NE, {});
ok('un fil de jauge 8 va sur le 01-08 (un contact taille 8)', P8.reference === 'EN4165-002-01-08', P8.reference);
ok('les arrangements qui conviennent : l’usage normal d’abord, le plus petit d’abord', X.arrangementsQuiLogent(cA.points, NE, 'EN4165').map(m => m.variante).slice(0, 2).join() === '12-20,20-22');

console.log('\n15. EN 2997-002 : LES CONNECTEURS CIRCULAIRES');
const C9 = NE.modules.filter(m => m.famille === 'EN2997'), cv = v => C9.find(m => m.variante === v);
ok('35 arrangements des figures 1 à 35, d’emploi connecteur, corps circulaire, contacts numérotés de 1 à N', C9.length === 35 && C9.every(m => m.emploi === 'connecteur' && m.corps === 'circulaire' && m.contacts.length === Math.max(...m.contacts.map(c => +c.lettre))));
const nb = v => ['22', '20', '16', '12'].map(t => cv(v).contacts.filter(c => c.taille === t).length).join('/');
ok('les tailles comptées comme la norme : 14-12 9 #20 + 3 #16, 20-25 19 #20 + 6 #12, 22-39 27 #20 + 12 #16, 24-43 23 #20 + 20 #16, 24-57 55 #20 + 2 #12, 28-42 42 #16, 10-12 12 #22',
  nb('14-12') === '0/9/3/0' && nb('20-25') === '0/19/0/6' && nb('22-39') === '0/27/12/0' && nb('24-43') === '0/23/20/0' && nb('24-57') === '0/55/0/2' && nb('28-42') === '0/0/42/0' && nb('10-12') === '12/0/0/0' && nb('24-61') === '0/61/0/0');
ok('22-30 et 22-32 « pas pour une nouvelle conception » : jamais choisis seuls', cv('22-30').usage === 'ancien' && !cv('22-32').auto && cv('14-12').auto);
ok('aucun contact ne se chevauche sur une face', C9.every(m => m.contacts.every((a, i) => m.contacts.every((b, j) => j <= i || Math.hypot(a.r - b.r, a.c - b.c) > 0.55))), C9.filter(m => !m.contacts.every((a, i) => m.contacts.every((b, j) => j <= i || Math.hypot(a.r - b.r, a.c - b.c) > 0.55))).map(m => m.variante).join(' '));
const E340 = X.connecteursEnModules('340AB1', L, NE)[0], E421 = X.connecteursEnModules('421ST1', L, NE)[0];
ok('le part number EN2997… dit la norme : 421ST1 (4 bornes, DR22/24) sur un 10-05, 340AB1 (bornes 1, 4, 20) sur un 16-24', E421.plan.famille === 'EN2997' && E421.plan.reference === 'EN2997-002-10-05' && E340.plan.reference === 'EN2997-002-16-24', E421.plan.reference + ' · ' + E340.plan.reference);
const P12 = X.remplirContacts([1, 2, 3].map(n => ({ borne: String(n), num: String(n), fils: [{ cable: 'W-' + n, type: 'DR12', jauge: 12 }] })), NE, { pn: 'EN2997Y1' });
ok('trois fils de jauge 12 en EN 2997 : le 14-04 (4 contacts #12)', P12.reference === 'EN2997-002-14-04', P12.reference);
ok('une prise de coupure retenue en EN 2997 : les arrangements EN 2997 seuls', X.coupureEnModule('411VC3A', L, NE, 'EN2997').plan.reference.startsWith('EN2997-002-') && X.coupureEnModule('411VC3A', L, NE, 'EN2997').plan.visee === 'EN2997');

console.log('\n16. EN 3646-002 : LES CONNECTEURS CIRCULAIRES À CONTACTS LETTRÉS');
const C6 = NE.modules.filter(m => m.famille === 'EN3646'), dv = v => C6.find(m => m.variante === v);
const nb6 = v => ['20', '16', '12'].map(t => dv(v).contacts.filter(c => c.taille === t).length).join('/');
ok('31 arrangements des figures 1 à 31, contacts lettrés dans l’ordre de la norme (A… puis a… puis AA…)', C6.length === 31 && C6.every(m => m.corps === 'circulaire' && m.emploi === 'connecteur') && dv('12-08').contacts.map(c => c.lettre).join('') === 'ABCDEFGH' && dv('24-61').contacts[23].lettre === 'a' && dv('24-61').contacts[47].lettre === 'AA');
ok('les comptes de la norme : 14-12 8 #20 + 4 #16, 16-21 16 #20 + 5 #16, 20-34 26 #20 + 8 #16, 22-41 27 #20 + 14 #16, 24-19 19 #12, 22-55 55 #20',
  nb6('14-12') === '8/4/0' && nb6('16-21') === '16/5/0' && nb6('20-34') === '26/8/0' && nb6('22-41') === '27/14/0' && nb6('24-19') === '0/0/19' && nb6('22-55') === '55/0/0' && nb6('20-39') === '37/2/0');
ok('aucun contact ne se chevauche sur une face', C6.every(m => m.contacts.every((a, i) => m.contacts.every((b, j) => j <= i || Math.hypot(a.r - b.r, a.c - b.c) > 0.55))), C6.filter(m => !m.contacts.every((a, i) => m.contacts.every((b, j) => j <= i || Math.hypot(a.r - b.r, a.c - b.c) > 0.55))).map(m => m.variante).join(' '));
const V11 = X.coupureEnModule('411VC3A', L, NE).plan;
ok('411VC3A (EN3646A6088AAN, 8 bornes numérotées) : un 12-08, la borne n sur la lettre de rang n, et c’est dit', V11.reference === 'EN3646-002-12-08' && V11.fils.every(x => x.contact.lettre === 'ABCDEFGH'[+x.potentiel.bornes[0] - 1]) && V11.verdicts.some(v => v.niveau === 'info' && /1 → A/.test(v.texte)) && !V11.verdicts.some(v => v.niveau === 'ko'));
const LA = X.remplirContacts([{ borne: 'C', num: 'C', fils: [{ cable: 'W-1', type: 'DR16', jauge: 16 }] }, { borne: 'A', num: 'A', fils: [{ cable: 'W-2', type: 'DR18', jauge: 18 }] }], NE, { pn: 'EN3646' });
ok('des bornes lettrées vont sur leur lettre ; un DR16 en C et un DR18 en A demandent des contacts #16 : le 12-03', LA.reference === 'EN3646-002-12-03' && LA.fils.find(x => x.f.cable === 'W-1').contact.lettre === 'C', LA.reference);

console.log('\n17. EN 3645-002 : CONNECTEURS CIRCULAIRES, CONTACTS NUMÉROTÉS OU LETTRÉS, TRIAXIAUX');
const C5 = NE.modules.filter(m => m.famille === 'EN3645'), fv = v => C5.find(m => m.variante === v);
const nb5 = v => ['22', '20', '16', '12', '8', '8T'].map(t => fv(v).contacts.filter(c => c.taille === t).length).join('/');
ok('93 arrangements des figures 1 à 63 (N, G, Q, L, R), circulaires, d’emploi connecteur', C5.length === 93 && C5.every(m => m.corps === 'circulaire' && m.emploi === 'connecteur') && fv('17G08') && fv('11L01'));
ok('les comptes de la norme : 13N26 6 #22 + 2 #12, 15N15 14 #20 + 1 #16, 15N97 8 #20 + 4 #16, 17N02 38 #22 + 1 triaxial, 17N20 16 #22 + 4 #12, 17N35 55 #22, 19N12 6 #20 + 4 #16 + 2 #8',
  nb5('13N26') === '6/0/0/2/0/0' && nb5('15N15') === '0/14/1/0/0/0' && nb5('15N97') === '0/8/4/0/0/0' && nb5('17N02') === '38/0/0/0/0/1' && nb5('17N20') === '16/0/0/4/0/0' && nb5('17N35') === '55/0/0/0/0/0' && nb5('19N12') === '0/6/4/0/2/0' && nb5('15N35') === '37/0/0/0/0/0');
ok('les figures 34 à 63 : 19N35 66 #22, 21N35 79 #22, 23N35 100 #22, 23N54 40 #22 + 9 #16 + 4 #12, 25N20 10 #20 + 13 #16 + 4 #12 + 3 triaxiaux, 25N11 9 contacts taille 10 + 2 #20',
  nb5('19N35') === '66/0/0/0/0/0' && nb5('21N35') === '79/0/0/0/0/0' && nb5('23N35') === '100/0/0/0/0/0' && nb5('23N54') === '40/0/9/4/0/0' && nb5('25N20') === '0/10/13/4/0/3' && fv('25N11').contacts.filter(c => c.taille === '10').length === 9 && X.contactAccepte(NE, 'EN3645', '10', 10));
ok('triaxiaux et quadrax jamais choisis seuls ; la version G possible, N normale', !fv('09G01').auto && !fv('17Q22').auto && !fv('17N75').auto && fv('13G04').usage === 'possible' && fv('13N04').usage === 'normal');
ok('un contact triaxial refuse un fil ordinaire ; un contact taille 8 prend du 10 au 8', !X.contactAccepte(NE, 'EN3645', '8T', 22) && X.contactAccepte(NE, 'EN3645', '8', 8) && !X.contactAccepte(NE, 'EN3645', '8', 12));
ok('aucun contact ne se chevauche sur une face', C5.every(m => m.contacts.every((a, i) => m.contacts.every((b, j) => j <= i || Math.hypot(a.r - b.r, a.c - b.c) > 0.55))), C5.filter(m => !m.contacts.every((a, i) => m.contacts.every((b, j) => j <= i || Math.hypot(a.r - b.r, a.c - b.c) > 0.55))).map(m => m.variante).join(' '));
const P35 = X.remplirContacts([3, 9, 12].map(n => ({ borne: String(n), num: String(n), fils: [{ cable: 'W-' + n, type: 'DR24', jauge: 24 }] })), NE, { pn: 'EN3645' });
ok('des bornes 3, 9, 12 en DR24 : un insert à contacts numérotés taille 22 qui a ces numéros, chaque borne sur son numéro', P35.famille === 'EN3645' && P35.places === 3 && P35.fils.every(x => x.contact.lettre === x.potentiel.bornes[0]) && P35.fils.every(x => x.jaugeOk), P35.reference);
const P13 = X.remplirContacts([{ borne: '1', num: '1', fils: [{ cable: 'W-1', type: 'DR12', jauge: 12 }] }, { borne: 'A', num: 'A', fils: [{ cable: 'W-2', type: 'DR24', jauge: 24 }] }], NE, { pn: 'EN3645' });
ok('un insert à numéros et lettres mêlés : la borne 1 (DR12) sur le contact 1 #12, la borne A (DR24) sur A #22 — le 13N26', P13.reference === 'EN3645-002-13N26' && !P13.verdicts.some(v => v.niveau === 'ko'), P13.reference);

console.log('\n  ' + (total - echecs) + ' / ' + total + ' contrôles passés' + (echecs ? '  —  ' + echecs + ' ÉCHEC(S)' : '  —  tout est vert'));
process.exit(echecs ? 1 : 0);
