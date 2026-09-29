/* ===========================================================================
   LA BIBLE DES BARRETTES ET LES CONNECTEURS — contrôles sans navigateur.
       node tests/barrettes.js
   Le module 09 ne touche pas à la page : on le charge avec 01 et 02 dans un
   bac à sable et on vérifie la lecture d'une bible, le choix d'une référence
   et la lecture des connecteurs.
   ========================================================================= */
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.join(__dirname, '..', 'src');
const code = ['01-modele.js', '02-lecture.js', '09-barrettes.js'].map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
const bac = { console };
vm.createContext(bac);
vm.runInContext(code + '\nthis.X = { lireBible, bibleExemple, jaugeDuType, blindeDuType, besoinsDeBarrette, choisirBarrette, barretteInfos, connecteursDe, connecteurDeBorne, connecteurParBorne, coupureInfos, connecteursInfos, suiviDuContrat, csvDuSuivi, paquetsDeBarrette, physiqueDeBarrette, contratExemple, contratEssai };', bac);
const X = bac.X;
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
const vt = X.barretteInfos('667VT21', L, X.bibleExemple());
ok('667VT21 : 4 bornes, jauge 24, un shunt', vt.nBornes === 4 && vt.jaugeFine === 24 && vt.shunts === 1, vt.nBornes + ' bornes · jauge ' + vt.jaugeFine + ' · ' + vt.shunts + ' shunt');
ok('la plus petite qui loge tout, dans la famille du fichier', vt.reference === 'ASNE0500-04', vt.reference + ' — ' + vt.raisons.join(', '));
const gros = X.choisirBarrette({ nBornes: 3, borneMax: 3, jaugeFine: 16, jaugeGrosse: 16, blindes: 0, pn: '' }, X.bibleExemple());
ok('des fils de 16 vont sur la barrette des grosses sections', gros.choix && gros.choix.reference === 'ASNE0501-04', gros.choix && gros.choix.reference);
const blinde = X.choisirBarrette({ nBornes: 5, borneMax: 5, jaugeFine: 24, jaugeGrosse: 24, blindes: 2, pn: '' }, X.bibleExemple());
ok('des fils blindés vont sur une barrette de blindage', blinde.choix && blinde.choix.nature === 'blindage' && blinde.choix.bornes === 8, blinde.choix && blinde.choix.reference);
const num = X.choisirBarrette({ nBornes: 2, borneMax: 11, jaugeFine: 24, jaugeGrosse: 24, blindes: 0, pn: '' }, X.bibleExemple());
ok('la borne 11 exige au moins 11 modules', num.choix && num.choix.bornes >= 11, num.choix && num.choix.reference);
const rien = X.choisirBarrette({ nBornes: 40, borneMax: 40, jaugeFine: 24, jaugeGrosse: 24, blindes: 0, pn: '' }, X.bibleExemple());
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
const S = X.suiviDuContrat(L, X.bibleExemple(), 'exemple', n => n === '667VT21' ? 'ASNE0500-08' : '');
const barrettes = S.filter(l => /barrette/.test(l.nature)), prises = S.filter(l => l.nature === 'prise de coupure'), conns = S.filter(l => l.nature === 'connecteur');
ok('une ligne par barrette, par prise, par connecteur', barrettes.length === 6 && prises.length === 5 && conns.length > 20, barrettes.length + ' barrettes · ' + prises.length + ' prises · ' + conns.length + ' connecteurs');
const l667 = S.find(l => l.repere === '667VT21');
ok('la référence retenue à la main l’emporte, celle du fichier reste', l667.reference === 'ASNE0500-08' && l667.fichier === 'ASNE0500-04');
ok('bornes dans l’ordre, fils et folios listés', l667.bornes.join(',') === '1,2,3,4' && l667.fils.length === 5 && l667.plans.join('') === '2', l667.bornes.join(',') + ' · ' + l667.fils.join(' ') + ' · folio ' + l667.plans);
ok('la barrette de blindage est dite telle', S.find(l => l.repere === '669VT32').nature === 'barrette de blindage');
const texteSuivi = X.csvDuSuivi(S);
ok('le CSV a un en-tête et une ligne par chose', texteSuivi.split('\n').length === S.length + 1 && /^Contrat;Repère;Nature;Référence retenue/.test(texteSuivi));
ok('les masses ne sont pas suivies', !S.some(l => /G$/.test(l.repere.split(' ')[0]) && l.nature !== 'connecteur' && /^\d+G$/.test(l.repere)));

console.log('\n7. LA BARRETTE PHYSIQUE');
const P = X.physiqueDeBarrette('668VT31', L, X.bibleExemple());
ok('668VT31 : douze modules de la référence retenue', P.reference === 'ASNE0500-12' && P.modules.length === 12, P.reference + ' · ' + P.modules.length + ' modules');
ok('les paquets pontés : 1-2-3, 5-6, 8-9-10', P.paquets.filter(p => p.ponte).map(p => p.bornes.join('-')).join(' ') === '1-2-3 5-6 8-9-10', P.paquets.map(p => p.bornes.join('-')).join(' '));
ok('la borne 7 et les bornes 11, 12 sont libres', P.libres === 3 && !P.modules[6].utilisee && P.modules[10].paquet === null, P.libres + ' libres');
ok('chaque module dit ses fils : la borne 2 reçoit W-304', P.modules[1].fils.map(f => f.cable).join(',') === 'W-304' && P.modules[1].fils[0].vers === '351PM1', P.modules[1].fils.map(f => f.cable + '→' + f.vers).join(' '));
const Q = X.physiqueDeBarrette('409VC2A', L, X.bibleExemple());
ok('une prise de coupure a la même physique, sans paquet', Q.nature === 'prise de coupure' && Q.modules.length === 3 && Q.paquets.every(p => !p.ponte), Q.reference + ' · ' + Q.modules.length);

console.log('\n  ' + (total - echecs) + ' / ' + total + ' contrôles passés' + (echecs ? '  —  ' + echecs + ' ÉCHEC(S)' : '  —  tout est vert'));
process.exit(echecs ? 1 : 0);
