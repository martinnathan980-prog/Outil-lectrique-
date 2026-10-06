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
vm.runInContext('const NORME_EMBARQUEE = ' + JSON.stringify(normes) + ';\n' + code + '\nthis.X = { lireBible, bibleExemple, bibleDeLOutil, remplirModules, normeDesModules, moduleDeReference, contactAccepte, variantesQuiLogent, besoinsDeBarrette, jaugeDuType, blindeDuType, choisirBarrette, barretteInfos, connecteursDe, connecteurDeBorne, connecteurParBorne, coupureInfos, connecteursInfos, suiviDuContrat, csvDuSuivi, paquetsDeBarrette, physiqueDeBarrette, physiqueDeReference, contratExemple, contratEssai,'
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
ok('la norme embarquée (normes/*.csv) : E0599 et la prise EN3646, vingt fils, deux déclassements, deux réseaux, quatre tailles de contact, 29 modules', NE.familles.map(f => f.famille).join(' ') === 'E0599 EN3646' && NE.fils.length === 20 && NE.declassements.length === 2 && NE.reseau.length === 2 && NE.tailles.length === 4 && NE.modules.length === 29 && !X.normeExemple(NE), `${NE.familles.map(f => f.famille).join(' ')} · ${NE.fils.length} fils · ${NE.modules.length} modules`);
ok('ASNE 0599 n’est pas un exemple ; EN3646 l’est', !NE.familles.find(f => f.famille === 'E0599').exemple && NE.familles.find(f => f.famille === 'EN3646').exemple);
const NA = X.fusionnerNormes(NE, X.lireNorme(NORME_IMPORTEE));
const NF = X.fusionnerNormes(NA, N);
ok('fusionner : la famille homonyme est remplacée, les autres s’ajoutent ; les modules restent', NA.familles.length === 5 && NF.familles.length === 7 && NF.modules.length === 29 && NF.fils.length === 21 && NF.fils.find(f => f.type === 'DR' && f.jauge === 24) === N.fils[0], `${NF.familles.length} familles · ${NF.fils.length} fils`);
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
const MS = NE.modules, mv = v => MS.find(m => m.variante === v);
ok('29 variantes : A101–A106, B201–B209, C301–C306, D401–D403, D501–D504, E601', MS.map(m => m.variante).join(' ') === 'A101 A102 A103 A104 A105 A106 B201 B202 B203 B204 B205 B206 B207 B208 B209 C301 C302 C303 C304 C305 C306 D401 D402 D403 D501 D502 D503 D504 E601', MS.map(m => m.variante).join(' '));
const parType = { 1: 36, 2: 18, 3: 10, 4: 8 };
ok('36 contacts #22 au type 1, 18 #20 au type 2, 10 #16 au type 3, 8 #12 au type 4', MS.filter(m => parType[m.type]).every(m => m.contacts.length === parType[m.type] && m.contacts.every(c => c.taille === { 1: 22, 2: 20, 3: 16, 4: 12 }[m.type])),
  MS.filter(m => parType[m.type] && m.contacts.length !== parType[m.type]).map(m => m.variante + ':' + m.contacts.length).join(' '));
ok('chaque contact est sur la face, une seule fois, dans un seul groupe', MS.every(m => new Set(m.contacts.map(c => c.lettre)).size === m.contacts.length && m.contacts.every(c => c.r < m.rangs && c.c < m.colonnes) && new Set(m.contacts.map(c => c.r + ',' + c.c)).size === m.contacts.length));
ok('les groupes : A101 18 × 2, B204 3 × 6, C304 4-4-2, D501 un groupe de 6 #16 et 2 #12', mv('A101').groupes.length === 18 && mv('A101').groupes.every(g => g.contacts.length === 2) && mv('B204').groupes.map(g => g.contacts.length).join() === '6,6,6'
  && mv('C304').groupes.map(g => g.contacts.length).join() === '4,4,2' && mv('D501').contacts.filter(c => c.taille === 12).map(c => c.lettre).join() === 'C,F' && mv('D501').groupes.length === 1);
ok('le module à diodes : trois diodes S1→S2, S3→S4, S5→S6', mv('E601').aDiodes && mv('E601').diodes.map(d => d.join('>')).join(' ') === 'S1>S2 S3>S4 S5>S6');
const mB = X.moduleDeReference(NE, 'E0599-1B204Z');
ok('la désignation E0599-1B204Z désigne la variante B204 ; une référence d’ailleurs, aucune', mB && mB.variante === 'B204' && mB.reference === 'E0599-1B204Z' && X.moduleDeReference(NE, 'NSA935420-06') === null);
ok('la taille d’un contact dit les jauges qu’il reçoit : #22 26–22, #20 24–20, #16 20–16, #12 14–12', X.contactAccepte(NE, 22, 24) && !X.contactAccepte(NE, 22, 20) && X.contactAccepte(NE, 20, 20) && !X.contactAccepte(NE, 20, 26) && X.contactAccepte(NE, 16, 16) && !X.contactAccepte(NE, 12, 16) && X.contactAccepte(NE, 12, 12));
const BO = X.bibleDeLOutil();
ok('la bible de l’outil : les 29 modules d’abord, puis les coupures et connecteurs d’exemple, aucune barrette d’ailleurs', BO.filter(e => e.module).length === 29 && BO.slice(0, 29).every(e => e.module) && !BO.some(e => /^ASNE05/.test(e.reference)) && BO.find(e => e.reference === 'E0599-1C302Z').jaugeMin === 20, BO.length + ' références');

console.log('\n12. LE REMPLISSAGE AUTOMATIQUE DES MODULES');
const attendu = { '667VT21': ['E0599-1B209Z', 3], '668VT31': ['E0599-1B207Z', 4], '669VT32': ['E0599-1B208Z', 1], '670VT41': ['E0599-1B207Z', 3], '671VT42': ['E0599-1B208Z', 1], '672VT51': ['E0599-1A102Z', 7] };
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
const Ig = X.barretteInfos('710VT', essai('710VT', [['1', 'W-1', 'DR12'], ['1', 'W-2', 'DR12'], ['2', 'W-3', 'DR12']]), BO);
ok('des fils de jauge 12 vont sur un module #12 (type 4)', /^E0599-1D40\d/.test(Ig.reference) && Ig.plan.places === 2, Ig.reference);
const Im = X.barretteInfos('711VT', essai('711VT', [['1', 'W-1', 'DR16'], ['1', 'W-2', 'DR24'], ['2', 'W-3', 'DR24']]), BO);
ok('un potentiel qui mêle 16 et 24 : aucun contact ne reçoit les deux tailles dans un même groupe — dit, pas inventé', Im.plan.restants.length === 1 && Im.plan.verdicts.length === 1 && /borne 1 : 2 fils de jauge 16, 24/.test(Im.plan.verdicts[0].texte), Im.plan.verdicts.map(v => v.texte).join(' | '));
const Ib = X.barretteInfos('712VT', essai('712VT', Array.from({ length: 20 }, (_, k) => [String(k + 1), 'W-' + (k + 1), 'DR22'])), BO);
ok('vingt potentiels d’un fil de 22 : plus qu’un module n’en loge, deux modules', Ib.plan.modules.length === 2 && Ib.plan.places === 20 && /^2 × |\+/.test(Ib.plan.reference), Ib.plan.reference);
const Q16 = X.remplirModules({ bornes: ['1'], ponts: [], parBorne: new Map([['1', [{ cable: 'W-1', type: 'DR16' }]]]) }, NE, 'A101');
ok('une variante retenue à la main dont les contacts refusent la jauge : le fil n’est pas posé, on le dit', Q16.places === 0 && /aucun groupe de A101/.test(Q16.verdicts[0].texte), Q16.verdicts.map(v => v.texte).join(' | '));
ok('le module à diodes n’est jamais choisi seul', Object.keys(attendu).every(r => !X.barretteInfos(r, L, BO).plan.modules.some(M => M.module.aDiodes)));

console.log('\n  ' + (total - echecs) + ' / ' + total + ' contrôles passés' + (echecs ? '  —  ' + echecs + ' ÉCHEC(S)' : '  —  tout est vert'));
process.exit(echecs ? 1 : 0);
