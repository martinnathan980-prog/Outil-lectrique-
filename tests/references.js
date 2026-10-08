/* ===========================================================================
   LES CONTRATS DÉJÀ FAITS ET LE FWD — contrôles sans navigateur.
       node tests/references.js
   Le module 09 quinquies ne touche pas à la page : on le charge avec 01, 02 et
   les autres 09 dans un bac à sable, et on vérifie :
     · la lecture du vrai format garde le FWD (le dessin) et les descriptions ;
     · un repère ELEC se décode (zone, nature, ordre, variante) et se dit en mots,
       une borne de barrette aussi (le module et son contact) ;
     · la base s'indexe par harness ET par dessin, avec les équipements, leurs
       voisins, leurs masses ; un candidat dit son dessin ;
     · la comparaison d'un dessin entier et d'un voisinage : les repères se
       correspondent d'un bloc (repère, part number, voisins, code), chaque fil
       est jugé une fois, le bilan par équipement ; la reprise recâble ;
     · la recherche de la bible ; cinquante mille lignes s'indexent vite.
   ========================================================================= */
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.join(__dirname, '..', 'src'), NORMES = path.join(__dirname, '..', 'normes');
const code = ['01-modele.js', '02-lecture.js', '09-barrettes.js', '09-disjoncteurs.js', '09-raccords.js', '09-chute.js', '09-references.js'].map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
const normes = fs.readdirSync(NORMES).filter(f => /\.csv$/i.test(f)).sort().map(f => fs.readFileSync(path.join(NORMES, f), 'utf8')).join('\n\n');
const bac = { console }; vm.createContext(bac);
vm.runInContext('const NORME_EMBARQUEE = ' + JSON.stringify(normes) + ';\n' + code + '\nthis.X = { liaison, lireTexte, contratExemple, CODES, decoderRepere, direRepere, lireBorne, direBorne, fwdDe, indexerReferences, dessinDe, dessinPrincipal, resumeDessin, chercherReferences, candidatsDeReference, flotteDe,'
  + ' correspondre, correspondanceDesReperes, voisinsDe, voisinageDe, differentiel, comparerEnsemble, comparerDessin, comparerVoisinage, liaisonsAReprendre, liaisonsDEnsembleAReprendre, lignesDeRepere, cleRef };', bac);
const X = bac.X;
let total = 0, echecs = 0;
const ok = (nom, cond, mesure) => { total++; if (!cond) echecs++; console.log('  ' + (cond ? 'OK    ' : 'ÉCHEC ') + nom + (mesure ? '   — ' + mesure : '')); };

console.log('\n1. LA LECTURE GARDE LE DESSIN (FWD) ET LES DESCRIPTIONS');
const EN = 'Harness;Device1;Pin1;PN1;Description1;Cable T/G;Cable Tag;Route;Device2;Pin2;PN2;Description2;FWD;Cable length (mm);APPAREIL;Date du retest';
let r = X.lireTexte(EN + '\n332A601150-023-D;677VT2 51;B;NSA937cdk,c;BARRETTE;DR22;2564-1830;2MO;677VCH;1;EN36cdcdc;PRISE;MEE256A7815003A;3670;test;27/10/2025\n'), v = r.liaisons[0] || {};
ok('la ligne du lecteur : fwd = MEE256A7815003A (et le folio aussi), les deux descriptions gardées', v.fwd === 'MEE256A7815003A' && v.plan === 'MEE256A7815003A' && v.descriptionDe === 'BARRETTE' && v.descriptionVers === 'PRISE' && v.harness === '332A601150-023-D', JSON.stringify([v.fwd, v.plan, v.descriptionDe, v.descriptionVers]));
r = X.lireTexte('Device1;Pin1;Device2;Pin2;Dessin\nA;1;B;2;D-7\nC;1;D;2;');
ok('« Dessin » est un alias du FWD ; une ligne sans dessin n’en porte pas, et fwdDe retombe sur le folio', r.liaisons[0].fwd === 'D-7' && r.liaisons[1].fwd === undefined && X.fwdDe(r.liaisons[0]) === 'D-7' && X.fwdDe(X.liaison({ de: 'A', borneDe: '1', vers: 'B', borneVers: '2', plan: '3' })) === '3');
ok('liaison() garde fwd et descriptions au clonage, et les vide quand elles sont vides', X.liaison({ ...v }).fwd === 'MEE256A7815003A' && X.liaison({ de: 'A', vers: 'B', fwd: '  ', descriptionDe: '' }).fwd === undefined);

console.log('\n2. LES REPÈRES ELEC : ZONE, NATURE, ORDRE, VARIANTE — EN MOTS');
const d1 = X.decoderRepere('677VT2');
ok('677VT2 : zone 677, VT barrette de jonction, n° 2, sans variante', d1 && d1.zone === '677' && d1.code === 'VT' && d1.nature === 'barrette de jonction' && d1.ordre === 2 && d1.variante === '' && d1.connu, JSON.stringify(d1));
ok('en mots : « barrette de jonction n° 2 · zone 677 »', X.direRepere('677VT2') === 'barrette de jonction n° 2 · zone 677', X.direRepere('677VT2'));
ok('102CB1 : disjoncteur n° 1 · zone 102 ; 300XC1 : connecteur ; 668VT31 : n° 31', X.direRepere('102CB1') === 'disjoncteur n° 1 · zone 102' && X.decoderRepere('300XC1').nature === 'connecteur' && X.decoderRepere('668VT31').ordre === 31, X.direRepere('102CB1'));
const d2 = X.decoderRepere('412VC3B');
ok('412VC3B : prise de coupure n° 3, variante B', d2.nature === 'prise de coupure' && d2.ordre === 3 && d2.variante === 'B' && X.direRepere('412VC3B') === 'prise de coupure n° 3, variante B · zone 412', X.direRepere('412VC3B'));
const d3 = X.decoderRepere('305XX9');
ok('un code inconnu (305XX9) reste un équipement sans nature inventée : « équipement XX n° 9 · zone 305 »', d3 && !d3.connu && d3.nature === '' && X.direRepere('305XX9') === 'équipement XX n° 9 · zone 305', X.direRepere('305XX9'));
ok('904G : masse ; un repère vide ou sans code ne se décode pas', X.decoderRepere('904G').nature === 'masse' && X.decoderRepere('') === null && X.decoderRepere('123') === null);
ok('la table des codes : CB, RL, SW, LP, BT, VT, VC, XC, TB, CP, PM, PL, VL, HT, SP connus ; seules VT, VC, G changent la forme', ['CB', 'RL', 'SW', 'LP', 'BT', 'VT', 'VC', 'XC', 'TB', 'CP', 'PM', 'PL', 'VL', 'HT', 'SP'].every(c => X.CODES[c] && X.CODES[c].nom) && Object.keys(X.CODES).filter(c => X.CODES[c].forme !== 'equipement').sort().join() === 'G,VC,VT');
ok('677VT2:51B — le module 51, contact B ; 51-3 — module 51, contact 3 ; sur un équipement, 1 reste une borne', X.lireBorne('677VT2', '51B').module === '51' && X.lireBorne('677VT2', '51B').contact === 'B' && X.lireBorne('677VT2', '51-3').contact === '3' && !X.lireBorne('102CB1', '1').module && X.direBorne('677VT2', '51B') === 'module 51, contact B' && X.direBorne('102CB1', 'A1') === 'borne A1', X.direBorne('677VT2', '51B'));

console.log('\n3. LA BASE S’INDEXE PAR HARNESS ET PAR DESSIN');
// une autre machine : l'exemple aux repères décalés de deux centaines (les masses gardent leur nom), un dessin par folio
const E = X.contratExemple(), decale = s => /G$/.test(s) ? s : s.replace(/^(\d)(\d\d)([A-Z]+)(\d*)/, (m, a, b, c, e) => String(+a + 2) + b + c + e), F = (p, v) => 'MEE256A78150' + String(p).padStart(2, '0') + v;
const H1 = [...E.map(l => X.liaison({ ...l, de: decale(l.de), vers: decale(l.vers), fwd: F(l.plan, 'A'), harness: 'H-1', appareil: 'H160', retest: '2024-07-08', longueur: 2500 })),
  X.liaison({ de: '302CB1', borneDe: '3', pnDe: 'NSA935401-10', vers: '305XX9', borneVers: '1', pnVers: 'ZZZ', cable: 'W-099', type: 'DR20', plan: '1', fwd: F(1, 'A'), harness: 'H-1', appareil: 'H160' }),
  X.liaison({ de: '305XX9', borneDe: '2', pnDe: 'ZZZ', vers: '901G', borneVers: '', cable: 'W-098', type: 'DR20', plan: '1', fwd: F(1, 'A'), harness: 'H-1', appareil: 'H160' })];
const H2 = E.slice(0, 60).map(l => X.liaison({ ...l, fwd: F(l.plan, 'B'), harness: 'H-2', appareil: 'H175', retest: '2023-01-01' }));
const H3 = E.filter(l => l.plan === '2').map(l => { const m = x => x === '667VT21' ? '677VT2' : x, b = (x, bo) => x === '667VT21' ? '5' + bo + 'B' : bo;
  return X.liaison({ ...l, de: m(l.de), borneDe: b(l.de, l.borneDe), vers: m(l.vers), borneVers: b(l.vers, l.borneVers), fwd: F(2, 'C'), harness: 'H-3', appareil: 'H160', retest: '2025-03-12' }); });
const RB = [...H1, ...H2, ...H3], IR = X.indexerReferences(RB);
ok('trois harness, dix dessins (six de H-1, trois de H-2, un de H-3)', IR.harnais.size === 3 && IR.dessins.size === 10 && IR.harnais.get('H-1').dessins.length === 6 && IR.harnais.get('H-2').dessins.length === 3 && IR.harnais.get('H-3').dessins.length === 1, IR.dessins.size + ' dessins');
ok('H-1 garde ses 65 équipements, son appareil et sa date (comme avant)', IR.harnais.get('H-1').equipements.size === 65 && IR.harnais.get('H-1').appareil === 'H160' && IR.harnais.get('H-1').retest === '2024-07-08');
const D1 = X.dessinDe(IR, 'H-1', F(1, 'A'));
ok('le dessin MEE256A7815001A de H-1 : 6 équipements (le 305XX9 en plus), 10 fils, une masse 901G sur 4 fils', D1 && D1.equipements.size === 6 && D1.fils === 10 && D1.pontages === 0 && D1.masses.get('901G') === 4 && D1.appareil === 'H160', D1 && JSON.stringify([D1.equipements.size, D1.fils, [...D1.masses]]));
const e302 = D1.equipements.get('302CB1');
ok('302CB1 dans ce dessin : disjoncteur, part number NSA935401-10, 4 lignes, voisins 301BT1, 303RL1, 595SW1, 305XX9', e302.nature === 'disjoncteur' && e302.pns.join() === 'NSA935401-10' && e302.lignes.length === 4 && [...e302.voisins.keys()].sort().join() === '301BT1,303RL1,305XX9,595SW1', JSON.stringify([...e302.voisins]));
const D3 = X.dessinDe(IR, 'H-1', F(3, 'A'));
ok('le dessin 3 de H-1 compte ses pontages (5 de 868VT31, 3 de 869VT32, 2 de 597TB1) à part des fils', D3.pontages === 10 && D3.fils === D3.liaisons.length - 10 && D3.equipements.get('868VT31').pontages === 5, D3.pontages + ' pontages');
const R3 = X.resumeDessin(D3);
ok('son résumé : 20 équipements dont 2 barrettes et 2 prises, 3 relais, 3 vannes…, 4 masses', R3.equipements === 20 && R3.barrettes === 2 && R3.coupures === 2 && R3.masses === 4 && R3.natures.find(x => x[0] === 'relais')[1] === 3 && R3.natures.find(x => x[0] === 'vanne')[1] === 3, JSON.stringify(R3.natures));
ok('l’équipement 300XC1 de H-2 est surtout sur le dessin 3 (dessinPrincipal)', X.dessinPrincipal(IR.harnais.get('H-2').equipements.get('300XC1')) === F(3, 'B'));
ok('l’index par part number et par code mène aux mêmes équipements', IR.parPn.get('NSA935401-10').length === 2 && IR.parCode.get('CB').length === 2 && IR.parCode.get('RL').length > 10);

console.log('\n4. RECONNAÎTRE, COMME AVANT, AVEC LE DESSIN EN PLUS');
const L = E, CR = X.candidatsDeReference(IR, L, '102CB1', 3);
ok('102CB1 : H-2/102CB1 (même part number, 100 %) puis H-1/302CB1 (75 % : une ligne de plus chez lui), chacun avec son dessin', CR.length === 2 && CR[0].harness === 'H-2' && CR[0].taux === 1 && CR[0].fwd === F(1, 'B') && CR[1].repere === '302CB1' && Math.abs(CR[1].taux - 0.75) < 1e-9 && CR[1].fwd === F(1, 'A') && CR[1].par === 'pn', JSON.stringify(CR.map(c => [c.harness, c.repere, c.taux, c.fwd])));
ok('667VT21 (barrette) se reconnaît en 677VT2 de H-3 par son code, bornes déplacées : taux libre élevé', (() => { const c = X.candidatsDeReference(IR, L, '667VT21', 5).find(x => x.harness === 'H-3'); return c && c.repere === '677VT2' && c.libre >= 0.9 && c.fwd === F(2, 'C'); })());
const DF = X.differentiel(L, '102CB1', IR.harnais.get('H-1').liaisons, '302CB1');
ok('le différentiel de 102CB1 contre 302CB1 : 3 pareilles, 1 manque ; 301BT1 → 101BT1 par le part number ; 305XX9 nouveau', DF.compte.identique === 3 && DF.compte.manque === 1 && DF.compte.differe === 0 && DF.correspondance.get('301BT1').vers === '101BT1' && DF.correspondance.get('301BT1').sur === 'pn' && DF.correspondance.get('305XX9').sur === 'nouveau' && DF.correspondance.get('303RL1').vers === '103RL1', JSON.stringify([...DF.correspondance]));
ok('la flotte de 102CB1 : deux machines, chacune avec son dessin', X.flotteDe(IR, L, '102CB1').length === 2 && X.flotteDe(IR, L, '102CB1').every(x => x.fwd));

console.log('\n5. LA CORRESPONDANCE D’UN BLOC : REPÈRE, PART NUMBER, VOISINS, CODE, NOUVEAU');
const CD = X.comparerDessin(L, D3, '500XC1', '300XC1');
ok('le dessin 3 de H-1 (repères décalés) se correspond entièrement aux nôtres : 20 sur 20, aucun nouveau, aucun proposé par le seul code', CD.chezNous === 20 && CD.manquent.length === 0 && CD.proposes.length === 0, JSON.stringify(CD.equipements.filter(e => e.sur !== 'pn' && e.sur !== 'cible').map(e => [e.repere, e.vers, e.sur])));
ok('les neuf relais de même part number ne se mélangent pas : 581RL1 → 381RL1, 582RL2 → 382RL2, 583RL3 → 383RL3 (par les voisins, l’ordre départage) ; les prises 609VC2A → 409VC2A, 610VC2B → 410VC2B', ['581RL1', '582RL2', '583RL3', '609VC2A', '610VC2B'].every(r => CD.correspondance.get(r).vers === r.replace(/^(\d)/, d => String(+d - 2))) && CD.correspondance.get('581RL1').sur === 'pn', JSON.stringify(['581RL1', '582RL2', '583RL3', '609VC2A', '610VC2B'].map(r => CD.correspondance.get(r))));
ok('tous ses fils sont identiques chez nous : 67 lignes jugées, 0 qui diffère, 0 qui manque — taux 100 % ; en plus chez nous, les 2 fils de 395SW1 sur le folio 1', CD.compte.identique === D3.liaisons.length && CD.compte.differe === 0 && CD.compte.manque === 0 && CD.compte.enplus === 2 && CD.taux === 1, JSON.stringify(CD.compte));
const C1 = X.comparerDessin(L, D1, '302CB1', '102CB1');
ok('le dessin 1 : 6 équipements, 5 chez nous, il manque 305XX9 (équipement XX) ; 8 fils pareils, 2 manquent, 3 en plus (395SW1 sur le folio 3)', C1.nEquipements === 6 && C1.chezNous === 5 && C1.manquent.length === 1 && C1.manquent[0].repere === '305XX9' && C1.compte.identique === 8 && C1.compte.manque === 2 && C1.compte.enplus === 3 && Math.abs(C1.taux - 0.8) < 1e-9, JSON.stringify(C1.compte));
const q302 = C1.equipements.find(e => e.repere === '302CB1');
ok('le bilan de 302CB1 : cible → 102CB1, disjoncteur, 4 voisins, ses 4 lignes (3 pareilles, 1 manque)', q302.sur === 'cible' && q302.vers === '102CB1' && q302.nature === 'disjoncteur' && q302.voisins.length === 4 && q302.lignes.length === 4 && q302.compte.identique === 3 && q302.compte.manque === 1 && q302.lignes.every(x => x.ref.de === '302CB1' || x.ref.vers === '302CB1'), JSON.stringify(q302.compte));
ok('chaque fil du dessin est jugé une fois dans le compte de l’ensemble', C1.lignes.filter(x => x.etat !== 'enplus').length === D1.liaisons.length && new Set(C1.lignes.filter(x => x.k).map(x => x.k)).size === D1.liaisons.length);
const LM = L.map(l => l.cable === 'W-012' ? X.liaison({ ...l, type: 'DR16' }) : l).filter(l => l.cable !== 'W-016'), C2 = X.comparerDessin(LM, D1, '302CB1', '102CB1');
ok('W-012 en DR16 chez nous et W-016 supprimé : 1 fil diffère, 3 manquent (W-016 en plus des deux de 305XX9), 6 pareils ; une masse ne fait jamais « différer »', C2.compte.differe === 1 && C2.compte.manque === 3 && C2.compte.identique === 6 && C2.lignes.find(x => x.etat === 'differe').notre.type === 'DR16' && C2.lignes.find(x => x.ref && x.ref.cable === 'W-016').etat === 'manque', JSON.stringify(C2.compte));
const LP = [...L, X.liaison({ de: '102CB1', borneDe: '4', vers: '109LP5', borneVers: '1', cable: 'W-777', type: 'DR22', plan: '1' })], C3 = X.comparerDessin(LP, D1, '302CB1', '102CB1');
ok('un fil de plus chez nous sur 102CB1 (vers 109LP5) : « en plus », rangé sous 302CB1', C3.compte.enplus === 4 && C3.lignes.some(x => x.etat === 'enplus' && x.chez === '302CB1' && x.notre.cable === 'W-777'));
const V1 = X.voisinageDe(D1.liaisons, '302CB1', 1), V2 = X.voisinageDe(D1.liaisons, '302CB1', 2);
ok('le voisinage de 302CB1 à un pas : 301BT1, 303RL1, 595SW1, 305XX9 (pas la masse) ; à deux pas, 304LP1 en plus', V1.length === 5 && !V1.includes('304LP1') && !V1.includes('901G') && V2.length === 6 && V2.includes('304LP1'), V1.join() + ' / ' + V2.join());
const CV = X.comparerVoisinage(L, D1, '302CB1', '102CB1', 1);
ok('la comparaison du voisinage : 5 équipements, 4 chez nous, 305XX9 manque ; ses lignes seulement (les fils de 304LP1 non)', CV.nEquipements === 5 && CV.chezNous === 4 && CV.manquent[0].repere === '305XX9' && !CV.lignes.some(x => x.ref && x.ref.de === '304LP1' && x.ref.vers === '901G'), JSON.stringify(CV.compte));
// un relais sans part number, relié au même disjoncteur que le nôtre : proposé par ses voisins ; un autre sans rien : par son code
const Mn = [X.liaison({ de: '1CB1', borneDe: '1', pnDe: 'P-CB', vers: '1RL1', borneVers: 'A1', pnVers: 'P-RL', cable: 'W-1', type: 'DR20' }), X.liaison({ de: '1CB1', borneDe: '2', pnDe: 'P-CB', vers: '9RL4', borneVers: 'A1', cable: 'W-2', type: 'DR20' })];
const Mr = [X.liaison({ de: '2CB1', borneDe: '1', pnDe: 'P-CB', vers: '2RL7', borneVers: 'A1', cable: 'W-1', type: 'DR20' }), X.liaison({ de: '5LP1', borneDe: '1', vers: '8RL1', borneVers: '1', cable: 'W-3', type: 'DR22' })];
const CM = X.correspondre(Mn, Mr, ['2CB1', '2RL7', '8RL1', '5LP1'], new Map());
ok('2CB1 → 1CB1 (part number) ; 2RL7 sans part number → 1RL1 par les voisins (proposé) ; 8RL1 → 9RL4 par le seul code (à confirmer) ; 5LP1 nouveau', CM.get('2CB1').vers === '1CB1' && CM.get('2CB1').sur === 'pn' && CM.get('2RL7').vers === '1RL1' && CM.get('2RL7').sur === 'voisins' && CM.get('8RL1').vers === '9RL4' && CM.get('8RL1').sur === 'code' && CM.get('5LP1').sur === 'nouveau', JSON.stringify([...CM]));
ok('la correspondance à l’échelle de l’équipement rend les mêmes verdicts qu’avant (cible, repère, pn, code, nouveau)', (() => { const B = X.lignesDeRepere(Mr, '2CB1'), c = X.correspondanceDesReperes(Mn, B, '2CB1', '1CB1'); return c.get('2CB1').sur === 'cible' && c.get('2RL7').vers === '1RL1'; })());

console.log('\n6. REPRENDRE UN ENSEMBLE, CHERCHER DANS LA BASE');
const NV = X.liaisonsDEnsembleAReprendre(C1, C1.lignes.filter(x => x.etat === 'manque'), L, '1');
ok('les deux lignes manquantes reprises : 102CB1:3 → 305XX9:1 avec notre part number, 305XX9:2 → 901G ; sans numéro, folio 1', NV.length === 2 && NV[0].de === '102CB1' && NV[0].borneDe === '3' && NV[0].pnDe === 'NSA935401-10' && NV[0].vers === '305XX9' && NV[0].pnVers === 'ZZZ' && NV[0].cable === '' && NV[0].plan === '1' && NV[1].de === '305XX9' && NV[1].vers === '901G', JSON.stringify(NV));
const NA = X.liaisonsAReprendre(DF, '102CB1', DF.lignes.filter(x => x.etat === 'manque'), '1');
ok('la reprise à l’échelle de l’équipement tient toujours : 102CB1:3 → 305XX9:1, DR20, nos part numbers', NA.length === 1 && NA[0].de === '102CB1' && NA[0].vers === '305XX9' && NA[0].type === 'DR20' && NA[0].pnDe === 'NSA935401-10');
const Q1 = X.chercherReferences(IR, '677VT'), Q2 = X.chercherReferences(IR, 'H175'), Q3 = X.chercherReferences(IR, '');
ok('chercher « 677VT » : l’équipement 677VT2 de H-3, sur son dessin ; « H175 » : le harness H-2 et ses trois dessins ; rien : tout', Q1.equipements.length === 1 && Q1.equipements[0].e.repere === '677VT2' && Q1.equipements[0].fwd === F(2, 'C') && Q2.harnais.length === 1 && Q2.dessins.length === 3 && Q3.harnais.length === 3 && Q3.dessins.length === 10 && Q3.equipements.length === 0, JSON.stringify([Q1.total, Q2.total, Q3.total]));

console.log('\n7. CINQUANTE MILLE LIGNES');
// deux cent cinquante machines : l'exemple, la zone de chaque repère décalée d'un millier par machine (les masses gardent leur nom)
const GROS = [], zone = (r, k) => /G$/.test(r) ? r : r.replace(/^(\d+)/, d => String(+d + 1000 * (k + 1)));
for (let k = 0; k < 250; k++) E.forEach(l => GROS.push(X.liaison({ ...l, de: zone(l.de, k), vers: zone(l.vers, k), harness: 'HX-' + k, fwd: 'FWD-' + k + '-' + l.plan, appareil: k % 2 ? 'H160' : 'H175' })));
let t0 = Date.now(); const IG = X.indexerReferences(GROS); const tIndex = Date.now() - t0;
t0 = Date.now(); const CG = X.candidatsDeReference(IG, L, '102CB1', 3); const tCand = Date.now() - t0;
t0 = Date.now(); const CDG = X.comparerDessin(L, X.dessinDe(IG, 'HX-7', 'FWD-7-3'), '8300XC1', '300XC1'); const tCmp = Date.now() - t0;
t0 = Date.now(); const QG = X.chercherReferences(IG, 'HX-12'); const tQ = Date.now() - t0;
ok(GROS.length + ' liaisons, 250 harness, 1500 dessins indexés en moins d’une seconde et demie', IG.harnais.size === 250 && IG.dessins.size === 1500 && tIndex < 1500, tIndex + ' ms');
ok('reconnaître 102CB1 parmi 250 machines : les trois meilleurs en moins de 100 ms', CG.length === 3 && tCand < 100, tCand + ' ms');
ok('comparer un dessin entier (67 fils, 20 équipements) en moins de 100 ms ; chercher en moins de 100 ms', CDG.nEquipements === 20 && tCmp < 100 && QG.harnais.some(h => h.harness === 'HX-12') && tQ < 100, tCmp + ' ms / ' + tQ + ' ms');

console.log('\n  ' + (total - echecs) + ' / ' + total + ' contrôles passés' + (echecs ? '  —  ' + echecs + ' ÉCHEC(S)' : '  —  tout est vert'));
process.exit(echecs ? 1 : 0);
