/* ===========================================================================
   COMPARER DEUX INDICES (09-indices, v90) — le moteur, sans navigateur.

   Le lecteur : « Comparer deux indices, c'est brillant. » La batterie joue l'indice B du plan d'exemple : le même
   fichier (rien n'a changé), des champs changés, un câble écrit dans l'autre sens (la même liaison), une liaison
   ajoutée et une retirée, un bout déplacé (avec et sans numéro de fichier), les barrettes que VOLTA ajoute (qui ne sont
   pas des changements), un part number, et 2 000 liaisons en moins de 200 ms.

       node tests/indices.js
   Rend 1 au premier échec.
   =========================================================================== */
const fs = require('fs'), vm = require('vm'), path = require('path');
const SRC = path.join(__dirname, '..', 'src');
const bac = { console }; vm.createContext(bac);
vm.runInContext(fs.readFileSync(path.join(SRC, '01-modele.js'), 'utf8') + '\n' + fs.readFileSync(path.join(SRC, '09-indices.js'), 'utf8') + ';globalThis.X = { contratExemple, liaison, comparerIndices, motDeLaComparaison, avecBarrettesAPoser };', bac);
const { contratExemple, liaison, comparerIndices, motDeLaComparaison, avecBarrettesAPoser } = bac.X;
let ko = 0; const ok = (nom, c, d) => { if (!c) ko++; console.log('  ' + (c ? 'ok ' : 'KO ') + ' ' + nom + (d ? '   ' + d : '')); };
const A = contratExemple(), copie = () => A.map(l => liaison(l));
// 1. le même fichier
let D = comparerIndices(A, copie());
ok('le même fichier : rien n’a changé', !D.changees.length && !D.ajoutees.length && !D.retirees.length && !D.rebranchees.length && D.identiques === D.total.avant, motDeLaComparaison(D));
// 2. un type changé, une longueur, une route
let B = copie(); B[0].type = 'DR12'; B[3].longueur = 4.2; B[5].route = B[5].route === 'SIGNAL' ? 'PUISSANCE' : 'SIGNAL';
D = comparerIndices(A, B);
ok('trois liaisons changées, chacune son champ', D.changees.length === 3 && D.changees[0].champs[0].champ === 'type' && D.changees[0].champs[0].avant === 'DR16' && D.changees[0].champs[0].apres === 'DR12', motDeLaComparaison(D));
// 3. le sens retourné n'est pas un changement
B = copie(); { const l = B[1]; B[1] = liaison({ ...l, de: l.vers, borneDe: l.borneVers, pnDe: l.pnVers, vers: l.de, borneVers: l.borneDe, pnVers: l.pnDe }); }
D = comparerIndices(A, B);
ok('un câble écrit dans l’autre sens : la même liaison', D.identiques === D.total.avant, motDeLaComparaison(D));
// 4. une liaison ajoutée, une retirée, un équipement nouveau
B = copie(); const retiree = B.splice(7, 1)[0]; B.push(liaison({ de: '102CB1', borneDe: '2', vers: '999XX1', borneVers: '4', type: 'DR20', route: 'PUISSANCE', plan: '1' }));
D = comparerIndices(A, B);
ok('une ajoutée, une retirée', D.ajoutees.length === 1 && D.retirees.length === 1 && D.retirees[0].cable === retiree.cable, motDeLaComparaison(D));
ok('l’équipement nouveau se dit', D.equipements.ajoutes.join() === '999XX1', JSON.stringify(D.equipements));
// 5. un bout déplacé, le numéro du fichier le reconnaît
B = copie(); B[2] = liaison({ ...B[2], borneVers: '9' });
D = comparerIndices(A, B);
ok('rebranchée (même numéro, un bout ailleurs)', D.rebranchees.length === 1 && !D.ajoutees.length && !D.retirees.length && D.rebranchees[0].bouts[0].apres.borne === '9', JSON.stringify(D.rebranchees[0] && D.rebranchees[0].bouts));
// 6. sans numéro : un bout commun et le même type, seul candidat
const sansNum = L => L.map(l => liaison({ ...l, cable: '' }));
B = sansNum(copie()); B[2] = liaison({ ...B[2], borneVers: '9' });
D = comparerIndices(sansNum(A), B);
ok('rebranchée sans numéro (un bout commun, même type)', D.rebranchees.length === 1 && !D.ajoutees.length && !D.retirees.length, motDeLaComparaison(D));
// 7. ce que VOLTA ajoute ne compte pas
D = comparerIndices(avecBarrettesAPoser(A), copie());
ok('les barrettes à poser de VOLTA ne sont pas des changements', D.identiques === D.total.apres && !D.ajoutees.length && !D.retirees.length, motDeLaComparaison(D) + ' ' + JSON.stringify(D.total));
// 8. un part number changé à un bout
B = copie(); B[0].pnVers = 'MS3320-15';
D = comparerIndices(A, B);
ok('un part number changé se dit, avec son repère', D.changees.length >= 1 && D.changees[0].champs[0].champ === 'part number' && D.changees[0].champs[0].de === '102CB1', JSON.stringify(D.changees.map(c => c.champs)));
// 9. la vitesse : 2 000 liaisons
const gros = []; for (let i = 0; i < 2000; i++) gros.push(liaison({ de: 'E' + (i % 300), borneDe: String(i), vers: 'F' + (i % 170), borneVers: String(i), type: 'DR' + (12 + 2 * (i % 5)), plan: String(1 + i % 20) }));
const gros2 = gros.map(l => liaison(l)); gros2[5].type = 'DR8'; gros2.splice(100, 20);
const t0 = Date.now(); D = comparerIndices(gros, gros2); const ms = Date.now() - t0;
ok('2 000 liaisons comparées en moins de 200 ms', ms < 200 && D.changees.length === 1 && D.retirees.length === 20, ms + ' ms · ' + motDeLaComparaison(D));
console.log(ko ? '\n' + ko + ' échec(s)' : '\ntout est vert'); process.exit(ko ? 1 : 0);
