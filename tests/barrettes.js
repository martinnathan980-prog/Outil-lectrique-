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
vm.runInContext(code + '\nthis.X = { lireBible, bibleExemple, jaugeDuType, blindeDuType, besoinsDeBarrette, choisirBarrette, barretteInfos, connecteursDe, connecteurDeBorne, contratExemple, contratEssai };', bac);
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
ok('115CD : un connecteur, nommé par son part number', d.length === 1 && d[0].nom === 'ABS0864-12', d.map(x => x.nom).join(','));
ok('une borne sans lettre ni PN n’a pas de connecteur', X.connecteurDeBorne('12', '') === null);
ok('le contrat d’essai (sans PN) n’a aucun connecteur', X.connecteursDe('210SP1', X.contratEssai()).every(g => !g.nom));

console.log('\n  ' + (total - echecs) + ' / ' + total + ' contrôles passés' + (echecs ? '  —  ' + echecs + ' ÉCHEC(S)' : '  —  tout est vert'));
process.exit(echecs ? 1 : 0);
