/* ===========================================================================
   LA CONNECTIQUE VÉRIFIÉE (v84) — contrôles sans navigateur.
       node tests/connectique.js
   Les règles du cerveau de la connectique, verrouillées : les groupes d'une
   barrette, le module choisi (celui du fichier quand il loge tout, sinon le
   plus petit qui loge, jamais deux normes), chaque câble dans un contact qui
   admet sa gauge (un vrai appariement, pas un premier venu), le sexe des
   contacts lu dans un part number, le plus petit arrangement d'un connecteur,
   la cheminée comptée, les cas limites, la stabilité et la vitesse.
   ========================================================================= */
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.join(__dirname, '..', 'src'), NORMES = path.join(__dirname, '..', 'normes');
const code = ['01-modele.js', '02-lecture.js', '09-barrettes.js', '09-disjoncteurs.js', '09-raccords.js', '09-chute.js', '09-references.js'].map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
const normes = fs.readdirSync(NORMES).filter(f => /\.csv$/i.test(f)).sort().map(f => fs.readFileSync(path.join(NORMES, f), 'utf8')).join('\n\n');
const bac = { console };
vm.createContext(bac);
vm.runInContext('const NORME_EMBARQUEE = ' + JSON.stringify(normes) + ';\n' + code + '\nthis.X = { normeEmbarquee, bibleDeLOutil, contratExemple, liaison, besoinsDeBarrette, barretteInfos, remplirModules, '
  + 'placerDansGroupe, moduleDeReference, contactAccepte, potentielsDeBarrette, variantesQuiLogent, connecteursEnModules, coupureEnModule, remplirContacts, arrangementsQuiLogent, '
  + 'sexeDuPn, habillage, remplirSelonNorme, physiqueDeBarrette, autreSexe, railsDeBarrette, connecteursDe, connecteurParBorne, moduleDeConnecteur, famillesDeModules, reperesDe, estBornier, estMasse };', bac);
const X = bac.X, NE = X.normeEmbarquee(), BO = X.bibleDeLOutil(), L = X.contratExemple();
let total = 0, echecs = 0;
const ok = (nom, cond, mesure) => { total++; if (!cond) echecs++; console.log('  ' + (cond ? 'OK    ' : 'ÉCHEC ') + nom + (mesure ? '   — ' + mesure : '')); };
// une liaison d'essai : un équipement (numéroté pour rester un équipement) vers une borne de la barrette
const li = (de, bDe, vers, bVers, type, pn) => X.liaison({ de, borneDe: bDe, vers, borneVers: bVers, type, cable: '', pnVers: pn || '' });
const vers = (r, bornes, types, pn) => bornes.map((b, k) => li(String(100 + k) + 'AA1', '1', r, String(b), types[k % types.length], k === 0 ? pn : ''));
const sansFaute = Q => Q.fils.every(x => x.jaugeOk !== false) && new Set(Q.fils.map(x => x.module + '|' + x.contact.lettre)).size === Q.fils.length;

console.log('\n1. LES GROUPES D’UNE BARRETTE : MÊME BORNE, BORNES PONTÉES');
const b668 = X.besoinsDeBarrette('668VT31', L), P668 = X.potentielsDeBarrette(b668);
ok('668VT31 : quatre groupes — 1-2-3 (pontées), 4, 5-6, 8-9-10 ; un shunt n’est pas un câble', P668.map(p => p.bornes.join('-')).sort().join(' ') === '1-2-3 4 5-6 8-9-10' && P668.reduce((n, p) => n + p.fils.length, 0) === 12,
  P668.map(p => p.bornes.join('-') + ':' + p.fils.length).join(' '));
ok('une borne sans câble (seulement des shunts) ne fait pas de groupe', X.potentielsDeBarrette(X.besoinsDeBarrette('700VT1', [li('700VT1', '1', '700VT1', '2', 'DR22')])).length === 0);

console.log('\n2. CHAQUE CÂBLE DANS UN CONTACT QUI ADMET SA GAUGE : UN APPARIEMENT, PAS LE PREMIER VENU');
const M08 = X.moduleDeReference(NE, 'NSA937901M12-08'), g0 = M08.groupes[0];
const fils = js => js.map((j, k) => ({ cable: 'W-' + k, type: 'DR' + j, jauge: j }));
const A = X.placerDansGroupe(NE, M08, g0, fils([20, 20, 22]));
ok('M12-08, groupe K-C-B-A-H (deux #12, un #16, deux #20) : 20, 20 et 22 AWG se logent — le 22 sur un #20, un 20 sur le #16 (avant : refusé, le premier 20 prenait le second #20)',
  !!A && A.length === 3 && A.every(([f, c]) => X.contactAccepte(NE, 'NSA937901', c.taille, f.jauge)) && A.find(([f]) => f.jauge === 22)[1].taille === '20' && A.some(([, c]) => c.taille === '16'),
  A ? A.map(([f, c]) => f.jauge + '→' + c.lettre + '#' + c.taille).join(' ') : 'refusé');
const A2 = X.placerDansGroupe(NE, M08, g0, fils([12, 20]));
ok('quand le premier choix suffit, il ne change pas : le 12 sur un #12, le 20 sur le premier #20 libre', !!A2 && A2.find(([f]) => f.jauge === 12)[1].taille === '12' && A2.find(([f]) => f.jauge === 20)[1].lettre === 'C', A2 && A2.map(([f, c]) => f.jauge + '→' + c.lettre).join(' '));
ok('trois 22 AWG ne tiennent pas dans deux #20 : refusé, rien d’inventé', X.placerDansGroupe(NE, M08, g0, fils([22, 22, 22])) === null);
const Q08 = X.barretteInfos('720VT1', vers('720VT1', [1, 1, 1], ['DR20', 'DR20', 'DR22']), BO, undefined, 'NSA937901M12-08').plan;
ok('une barrette retenue en M12-08 (20, 20, 22 sur une borne) : posée sans un mot de refus', Q08.places === 1 && !Q08.verdicts.length && sansFaute(Q08), Q08.fils.map(x => x.f.type + '→' + x.contact.lettre).join(' '));

console.log('\n3. LE MODULE : CELUI DU FICHIER QUAND IL LOGE TOUT, SINON LE PLUS PETIT QUI LOGE');
const I667 = X.barretteInfos('667VT21', L, BO), I669 = X.barretteInfos('669VT32', L, BO), I668 = X.barretteInfos('668VT31', L, BO), I674 = X.barretteInfos('674VT22', L, BO);
ok('667VT21 : le fichier dit E0599-1B201Z, qui loge ses trois groupes — VOLTA le garde (il prenait le B209, ni plus petit ni plus léger)', I667.reference === 'E0599-1B201Z' && I667.plan.nomme && !I667.changee && sansFaute(I667.plan) && I667.raisons.some(r => /celui de votre fichier/.test(r)), I667.reference + ' — ' + I667.raisons.join(' · '));
ok('669VT32 : le B204 du fichier loge ses quatre câbles d’un groupe : gardé', I669.reference === 'E0599-1B204Z' && I669.plan.nomme && sansFaute(I669.plan), I669.reference);
ok('668VT31 : l’A101 du fichier (paires de #22) ne loge ni les DR20 ni un groupe de quatre — VOLTA prend le B207, et le dit changé', I668.reference === 'E0599-1B207Z' && !I668.plan.nomme && I668.changee, I668.reference);
ok('674VT22 : le B201 du fichier (paires) ne loge pas trois câbles d’un groupe — le B207', I674.reference === 'E0599-1B207Z' && !I674.plan.nomme, I674.reference);
ok('choisi à la main, un autre module passe devant celui du fichier', X.barretteInfos('667VT21', L, BO, undefined, 'E0599-1B209Z').reference === 'E0599-1B209Z' && X.barretteInfos('667VT21', L, BO, undefined, 'NSA937901').plan.modules.every(M => M.module.famille === 'NSA937901'));
ok('VT21 / VT22, VT31 / VT32, VT41 / VT42 : chaque module de l’exemple loge tout, sans un refus', ['667VT21', '674VT22', '668VT31', '669VT32', '670VT41', '671VT42'].every(r => { const Q = X.barretteInfos(r, L, BO).plan; return Q.places === Q.potentiels && !Q.verdicts.length && sansFaute(Q) && Q.modules.length === 1; }));

console.log('\n4. UNE BARRETTE, UNE NORME : JAMAIS L’ASNE 0599 ET LA NSA937901 MÊLÉES (DEUX RAILS)');
const paires = X.barretteInfos('730VT1', vers('730VT1', Array.from({ length: 40 }, (_, k) => (k >> 1) + 1), ['DR20', 'DR22', 'DR22']), BO);
const meles = X.barretteInfos('731VT1', vers('731VT1', Array.from({ length: 40 }, (_, k) => (k >> 2) + 1), ['DR24', 'DR22', 'DR20', 'DR18']), BO);
ok('20 paires de 22 et 20 AWG : trois modules, tous de la même norme (avant : 2 × E0599-1B201Z + NSA937901M20-09)', paires.plan.places === 20 && new Set(paires.plan.modules.map(M => M.module.famille)).size === 1 && sansFaute(paires.plan), paires.reference);
ok('dix groupes de quatre (24 à 18 AWG) : une seule norme', meles.plan.places === 10 && new Set(meles.plan.modules.map(M => M.module.famille)).size === 1 && sansFaute(meles.plan), meles.reference);
ok('la raison dit la norme des modules posés', new RegExp(paires.plan.modules.length + ' modules ' + (paires.plan.famille === 'E0599' ? 'ASNE 0599' : 'NSA 937901')).test(paires.raisons.join(' · ')), paires.raisons.join(' · '));

console.log('\n5. LES CAS LIMITES');
const rien = X.barretteInfos('700VT1', [li('700VT1', '1', '700VT1', '2', 'DR22')], BO), vide = X.barretteInfos('700VT1', [], BO);
ok('aucun câble (un shunt seul, ou rien) : « aucun câble à loger », pas « aucun module ne convient »', rien.raisons.join() === 'aucun câble à loger' && vide.raisons.join() === 'aucun câble à loger' && !rien.plan.verdicts.length && !rien.reference);
const sansG = X.barretteInfos('701VT1', vers('701VT1', [1, 1], ['']), BO);
ok('un câble sans gauge : posé, sa gauge n’est pas jugée (ni admise ni refusée)', sansG.plan.places === 1 && sansG.plan.fils.every(x => x.jaugeOk === null), sansG.reference);
const hors = X.barretteInfos('702VT1', vers('702VT1', [1, 1], ['DR4']), BO), fin = X.barretteInfos('703VT1', vers('703VT1', [1, 1], ['DR30']), BO);
ok('une gauge hors de toute table (4 ou 30 AWG) : rien n’est posé, la borne et la gauge sont dites', !hors.plan.modules.length && /borne 1 : 2 câbles de gauge 4 — aucun groupe/.test(hors.plan.verdicts[0].texte) && /gauge 30/.test(fin.plan.verdicts[0].texte), hors.plan.verdicts[0].texte);
const g40 = X.barretteInfos('704VT1', vers('704VT1', Array(40).fill(1), ['DR22']), BO);
ok('un groupe de 40 câbles, plus grand que tout groupe de module : dit en un verdict, rien de posé', g40.plan.places === 0 && g40.plan.verdicts.length === 1 && /40 câbles/.test(g40.plan.verdicts[0].texte), g40.plan.verdicts[0].texte);
const inconnu = X.barretteInfos('705VT1', vers('705VT1', [1, 1], ['DR22'], 'XYZ-123'), BO);
ok('une référence inconnue au fichier : les deux normes concourent, le module se pose, le changement se dit', inconnu.plan.places === 1 && inconnu.changee && !inconnu.plan.nomme, inconnu.reference);

console.log('\n6. LA STABILITÉ ET LA VITESSE');
const empreinte = I => JSON.stringify([I.reference, I.plan.fils.map(x => x.module + x.contact.lettre + ':' + x.f.type)]);
ok('le même fichier donne toujours le même choix (barrettes de l’exemple, deux fois)', ['667VT21', '668VT31', '670VT41', '672VT51'].every(r => empreinte(X.barretteInfos(r, L, BO)) === empreinte(X.barretteInfos(r, L, BO))) && empreinte(meles) === empreinte(X.barretteInfos('731VT1', vers('731VT1', Array.from({ length: 40 }, (_, k) => (k >> 2) + 1), ['DR24', 'DR22', 'DR20', 'DR18']), BO)));
// le meilleur de trois essais : la machine partagée (d'autres batteries tournent) ne doit pas faire mentir la mesure
const temps = f => Math.min(...[0, 1, 2].map(() => { const t = Date.now(); f(); return Date.now() - t; }));
const t40 = Math.max(temps(() => X.barretteInfos('732VT1', vers('732VT1', Array.from({ length: 40 }, (_, k) => k + 1), ['DR22']), BO)),
  temps(() => X.barretteInfos('733VT1', vers('733VT1', Array.from({ length: 40 }, (_, k) => (k >> 1) + 1), ['DR20', 'DR22']), BO)),
  temps(() => X.barretteInfos('734VT1', vers('734VT1', Array.from({ length: 40 }, (_, k) => (k >> 2) + 1), ['DR24', 'DR22', 'DR20', 'DR18']), BO)));
ok('une barrette de 40 câbles se remplit sans faire attendre (moins d’une demi-seconde)', t40 < 500, t40 + ' ms au pire');

console.log('\n7. LE SEXE DES CONTACTS : UNE PARTIE FIXE NOMMÉE PORTE L’AUTRE SEXE');
const pt = [{ borne: '1', num: '1', fils: [{ cable: '', type: 'DR20', jauge: 20, amont: true }] }];
ok('les part numbers se lisent : EN2997…0… une partie fixe à broches, EN2997…6… une partie mobile, E0053…S une partie fixe à douilles', JSON.stringify(X.sexeDuPn('EN2997W00803AN')) === '{"sexe":"M","partie":"embase"}' && X.sexeDuPn('EN2997W60803AN').partie === 'fiche' && JSON.stringify(X.sexeDuPn('E0053R12B10SNF')) === '{"sexe":"F","partie":"embase"}');
const cE = X.remplirContacts(pt, NE, { pn: 'EN2997W00803AN' }), cF = X.remplirContacts(pt, NE, { pn: 'EN2997W60803AN' }), cD = X.remplirContacts(pt, NE, { pn: 'E0053R12B10SNF' });
ok('un connecteur d’équipement à broches (partie fixe nommée) : on sertit des douilles dans la partie mobile (avant : des broches, qui ne s’y branchent pas)', cE.sexe === 'F' && cE.sexeSource === 'part number' && cE.fils.every(x => x.sexe === 'F'), cE.sexe + ' · ' + cE.reference);
ok('une partie mobile nommée à broches : des broches ; une partie fixe à douilles (E0053…S) : des broches', cF.sexe === 'M' && cD.sexe === 'M' && cD.sexeSource === 'part number');
const pE = X.remplirContacts([{ borne: '1', num: '1', fils: [{ cable: '', type: 'DR20', jauge: 20, amont: true }, { cable: '', type: 'DR20', jauge: 20, amont: false }] }], NE, { pn: 'EN2997W00803AN', prise: true });
ok('une prise dont la partie fixe est nommée à broches : la partie mobile en douilles, la partie fixe en broches — un contact de chaque côté', pE.sexe === 'F' && pE.fils.find(x => x.f.amont).sexe === 'F' && pE.fils.find(x => !x.f.amont).sexe === 'M' && pE.fils.length === 2);
ok('sans sexe lisible : des douilles côté partie mobile (l’usage), dit « défaut »', X.remplirContacts(pt, NE, { pn: 'EN4165-2M' }).sexe === 'F' && X.remplirContacts(pt, NE, { pn: 'EN4165-2M' }).sexeSource === 'défaut');
ok('les côtés d’une prise se disent « partie mobile » et « partie fixe » dans les verdicts du remplissage', (P => P.cotes.amont === 'partie mobile' && P.cotes.aval === 'partie fixe')(X.remplirSelonNorme(X.physiqueDeBarrette('408VC1A', L, BO), NE)));

console.log('\n8. LE PLUS PETIT ARRANGEMENT QUI LOGE');
const c351 = X.connecteursEnModules('351PM1', L, NE)[0], c500 = X.connecteursEnModules('500XC3', L, NE).find(c => c.nom === 'A'), c340 = X.connecteursEnModules('340AB2', L, NE)[0];
ok('351PM1 (DR20, DR20, DR16, DR24) : l’EN 2997 14-07, boîtier 14 — plus le 22-39 (boîtier 22, 39 contacts, 35 obturateurs) pour éviter le manchon du DR24 sur un contact 16', c351.plan.reference === 'EN2997-002-14-07' && c351.plan.places === 4 && c351.plan.fils.every(x => x.jaugeOk === true) && c351.plan.fils.find(x => x.f.type === 'DR24').sertir.accessoire === 'E0718-20-30',
  c351.plan.reference + ' · ' + c351.plan.fils.map(x => x.f.type + '→' + x.contact.lettre + '#' + x.taille + (x.sertir && x.sertir.accessoire ? '+' + x.sertir.accessoire : '')).join(' '));
ok('les candidats de la carte suivent le même ordre : le 14-07 d’abord', X.arrangementsQuiLogent(c351.points, NE, 'EN2997', () => 'F')[0].variante === '14-07');
ok('340AB2 (une borne, DR24) : le 08-03 (boîtier 8) avant le 10-02 (boîtier 10, deux contacts)', c340.plan.reference === 'EN2997-002-08-03', c340.plan.reference);
ok('un module EN 4165 (tous prennent la même cavité) : la bonne taille de contact avant le moins de contacts — 500XC3 A, quatre DR20, sur le 12-20 et pas sur le 04-12 (des #12)', c500.plan.reference === 'EN4165-002-12-20', c500.plan.reference);
ok('le part number qui nomme son arrangement l’impose (408VC1A : 08-3A ; 412VC3B : 12-08)', X.coupureEnModule('408VC1A', L, NE).plan.reference === 'EN3646-002-08-3A' && X.coupureEnModule('412VC3B', L, NE).plan.reference === 'EN3646-002-12-08');
const c300B = X.connecteursEnModules('300XC1', L, NE).find(c => c.nom === 'B');
ok('300XC1 B : la borne fautive (B5, un DR12) nommée seule, le plus proche (12-20) loge les cinq autres', c300B.plan.verdicts[0].coupables.map(c => c.borne).join() === 'B5' && c300B.plan.verdicts[0].proche === 'EN4165-002-12-20');

console.log('\n9. LE RACCORD : LE TORON, LA CHEMINÉE COMPTÉE');
const c300A = X.connecteursEnModules('300XC1', L, NE).find(c => c.nom === 'A'), f300 = c300A.points.flatMap(p => p.fils);
const h1 = X.habillage(NE, f300, {}, c300A.pn, c300A.plan.reference, {}, { modules: c300A.plan.modules, plan: c300A.plan }), h2 = X.habillage(NE, f300, {}, c300A.pn, c300A.plan.reference, {}, { modules: 2 });
const q = (h, r) => (h.pieces.find(p => p.role === r) || {}).quantite;
ok('300XC1 A (EN 4165) : une cheminée et un tyrap par module câblé — la liste des modules du plan compte 1 (avant : NaN), un nombre se lit tel quel', q(h1, 'cheminee') === 1 && q(h1, 'tyrap') === 1 && q(h2, 'cheminee') === 2, 'plan : ' + q(h1, 'cheminee') + ' · 2 : ' + q(h2, 'cheminee'));
ok('le toron de 11 câbles : √(Σ Ø²) × 1,15 (TE/Polamco, 7 câbles et plus)', h1.faisceau.n === 11 && Math.abs(h1.toron - h1.deq * 1.15) < 1e-9, h1.toron.toFixed(2) + ' mm');
ok('les cavités libres : un obturateur chacune (12-20, onze contacts pris : un)', (h1.pieces.find(p => p.role === 'obturateur') || {}).quantite === 1);

/* Les deux fonctions de la page (08-modules) : chargées sur le même moteur, avec ce que la page leur donne — le contrat
   (`verite`), la norme et la bible de l'atelier (`app`), et la règle des repères frères de la fiche (`rangDuParent`, 08-fiche :
   668VT31 = la barrette VT3, module 1), recopiée ici. */
const LP = [...L], pn = { pnDe: 'EN4165-2M', pnVers: 'EN4165-2M' };
LP.push(X.liaison({ de: '800XC9', borneDe: 'A1', vers: '801RL9', borneVers: '1', type: 'DR20', ...pn, pnVers: '' }));
LP.push(X.liaison({ de: '800XC9', borneDe: 'A2', vers: '800XC9', borneVers: 'A3', type: 'DR22', ...pn, contactVers: 'EN3155-019F2022' }));
LP.push(X.liaison({ de: '800XC9', borneDe: 'A1', vers: '800XC9', borneVers: 'A4', type: 'DR20', ...pn }));
vm.runInContext(fs.readFileSync(path.join(SRC, '08-modules.js'), 'utf8') + '\nthis.P = { sertirDuFil, contactMain, barretteParente };', Object.assign(bac, {}));
vm.runInContext('var app, verite, liaisonsDeRepere, estRenvoi, rangDuParent;', bac);
Object.assign(bac, { app: { norme: NE, bible: BO, contrat: { designations: new Map(), sexes: new Map() } }, verite: () => LP, liaisonsDeRepere: r => LP.filter(l => l.de === r || l.vers === r), estRenvoi: () => false,
  rangDuParent: nom => { const m = /^(\d+)([A-Z]{2,3}\d+)([0-9A-Z])$/.exec(String(nom || '')); return m ? { parent: m[2], rang: m[3] } : null; } });
const P = bac.P;

console.log('\n10. LE RAIL : UN PAR BARRETTE, PAS UN PAR MODULE');
const rail = r => X.railsDeBarrette(NE, r.map(n => X.barretteInfos(n, L, BO).plan));
const R3 = rail(['668VT31', '669VT32']), R2 = rail(['667VT21']), R4 = rail(['670VT41', '671VT42']), Rm = rail(['667VT21', '670VT41']);
ok('VT3 (668VT31 + 669VT32) : un seul rail de deux modules, 001751 102 00, 28 mm (le pas de 14 mm), quantité 1', R3.length === 1 && R3[0].reference === '001751 102 00' && R3[0].n === 2 && R3[0].longueur === 28 && R3[0].quantite === 1 && R3[0].sous === '2 modules · 28 mm', JSON.stringify(R3.map(r => [r.reference, r.sous])));
ok('un module seul : 001751 101 00, 18 mm (la note du catalogue : 18 mm pour un seul)', R2.length === 1 && R2[0].reference === '001751 101 00' && R2[0].longueur === 18);
ok('VT4 en NSA937901 : le profilé de 2 m NSA937901RB2000, à couper à la longueur des deux modules', R4.length === 1 && R4[0].reference === 'NSA937901RB2000' && R4[0].coupe && R4[0].n === 2 && /à couper/.test(R4[0].sous), R4[0] && R4[0].sous);
ok('des modules de deux normes (deux rails différents) : un rail chacune', Rm.length === 2 && new Set(Rm.map(r => r.famille)).size === 2);
const BP1 = P.barretteParente('668VT31'), BP2 = P.barretteParente('669VT32'), BP5 = P.barretteParente('672VT51');
ok('la barrette parente : VT3, ses deux modules dans l’ordre de leur rang, le rail compté au module 1 (668VT31) — la fiche de 669VT32 renvoie au même rail', BP1.parent === 'VT3' && BP1.freres.join() === '668VT31,669VT32' && BP1.porteur === '668VT31' && BP2.porteur === '668VT31' && BP1.rails.length === 1 && BP1.rails[0].reference === '001751 102 00' && BP2.rails[0].reference === BP1.rails[0].reference,
  BP1.parent + ' : ' + BP1.freres.join(' + ') + ' → ' + BP1.rails.map(r => r.reference + ' (' + r.sous + ')').join());
ok('VT5 (672VT51 A102 + 673VT52 B207) : deux modules ASNE 0599, un rail 001751 102 00', BP5.freres.join() === '672VT51,673VT52' && BP5.rails.length === 1 && BP5.rails[0].reference === '001751 102 00');
ok('une barrette à poser (VT1, sans parent) est sa propre barrette', P.barretteParente('VT1').freres.join() === 'VT1' && P.barretteParente('VT1').porteur === 'VT1');

console.log('\n11. LE PONT DANS UN CONNECTEUR D’ÉQUIPEMENT : SES DEUX CONTACTS SERTIS ET JUGÉS');
const C9 = X.connecteursEnModules('800XC9', LP, NE)[0], Q9 = C9.plan, bouts = Q9.fils.filter(x => x.f.pont);
ok('800XC9 A : le pont A2 → A3 (DR22) donne deux contacts, 2 et 3, chacun serti (sa référence de la table) et sa gauge admise', bouts.length === 4 && ['2', '3'].every(n => bouts.some(x => x.contact.lettre === n && x.sertir && /^EN3155/.test(x.sertir.reference) && x.jaugeOk === true)) && Q9.reference === 'EN4165-002-12-20',
  Q9.reference + ' · ' + bouts.map(x => x.borne + '→' + x.contact.lettre + ' ' + (x.sertir ? x.sertir.reference : '?')).join(' '));
ok('chaque bout connaît sa borne et l’autre bout (A2 ↔ A3)', bouts.find(x => x.borne === 'A2' && x.f.type === 'DR22').f.borne === 'A3' && bouts.find(x => x.borne === 'A3').f.borne === 'A2');
ok('une borne qui reçoit un câble ET un bout de pont (A1 : le DR20 vers 801RL9 et le pont vers A4) : « 2 câbles — un contact reçoit un câble »', Q9.verdicts.some(v => v.niveau === 'attention' && /contact 1 : 2 câbles/.test(v.texte)), Q9.verdicts.map(v => v.texte).join(' | '));
const LP12 = LP.map(l => l.de === '800XC9' && l.borneDe === 'A2' ? X.liaison({ ...l, type: 'DR12' }) : l), Q12 = X.connecteursEnModules('800XC9', LP12, NE, () => 'EN4165-002-12-20')[0].plan;
ok('un pont trop gros (DR12 sur des contacts 20) : ses deux bouts refusés, chacun sur sa borne', Q12.fils.filter(x => x.f.pont && x.f.type === 'DR12' && x.jaugeOk === false).length === 2 && Q12.verdicts.filter(v => v.niveau === 'ko' && /DR12/.test(v.texte)).map(v => v.bornes[0]).sort().join() === 'A2,A3',
  Q12.verdicts.filter(v => v.niveau === 'ko').map(v => v.texte).join(' | '));
const h9 = X.habillage(NE, C9.points.flatMap(p => p.fils), {}, C9.pn, Q9.reference, {}, { modules: Q9.modules, plan: Q9 });
ok('le pont reste derrière la face : le toron ne compte que le câble qui sort (1)', h9.faisceau.n === 1, h9.faisceau.n + ' câble');
const lp = LP.find(l => l.de === '800XC9' && l.borneDe === 'A2'), sd = P.sertirDuFil(lp);
ok('les deux bouts d’un pont, vus du câble (le récapitulatif, la LPA) : chacun son contact, 2 et 3 — plus le même deux fois', sd.de && sd.vers && sd.de.contact.lettre === '2' && sd.vers.contact.lettre === '3', sd.de && sd.vers ? sd.de.contact.lettre + ' / ' + sd.vers.contact.lettre : 'rien');
ok('le contact écrit à la main sur un bout du pont ne vaut que pour ce bout (A3, pas A2)', P.contactMain(lp, '800XC9', 'A3') === 'EN3155-019F2022' && P.contactMain(lp, '800XC9', 'A2') === '' && sd.vers.main && !sd.de.main);
ok('les connecteurs sans pont ne bougent pas (300XC1 A : 11 contacts, aucun bout de pont)', (Q => Q.fils.length === 11 && !Q.fils.some(x => x.f.pont))(X.connecteursEnModules('300XC1', L, NE).find(c => c.nom === 'A').plan));

console.log('\n12. LA VITESSE SUR UN GROS FICHIER : UN INDEX DES LIAISONS, LES MÊMES RÉSULTATS');
// un gros fichier : l'exemple quinze fois, la zone décalée d'un millier (le piège « géant » de tests/pieges.js, 3135 liaisons)
const G = []; for (let k = 0; k < 15; k++) L.forEach(l => { const z = r => String(r).replace(/^(\d+)/, m => String(+m + 1000 * (k + 1))); G.push(X.liaison({ ...l, de: z(l.de), vers: z(l.vers), cable: l.cable ? l.cable + '-' + k : '', plan: String(k * 6 + (+l.plan || 1)) })); });
const eqG = X.reperesDe(G).filter(r => !X.estBornier(r) && !X.estMasse(r)), seul = r => G.filter(l => l.de === r || l.vers === r);   // la liste d'un repère seul : lue sans index
const vu = (r, LL) => JSON.stringify([X.connecteursDe(r, LL), X.besoinsDeBarrette(r, LL).bornes, X.connecteursEnModules(r, LL, NE).map(c => [c.nom, c.plan.reference, c.plan.fils.map(x => x.contact.lettre)])]);
ok(G.length + ' liaisons : pour chaque équipement, l’index rend exactement ce que rend sa seule liste (connecteurs, bornes, plans de contacts)', G.length > 3000 && eqG.every(r => vu(r, G) === vu(r, seul(r))), eqG.length + ' équipements');
const tG = temps(() => eqG.forEach(r => X.connecteursDe(r, G)));
ok('connecteursDe pour tous les équipements du gros fichier : moins de 100 ms (avant l’index : ~140 ms en node, ~150 ms dans la page, sans compter le reste)', tG < 100, tG + ' ms');
const r0 = '1300XC1', l0 = G.find(l => l.de === r0 && l.borneDe === 'A1');
l0.de = '1999XC9'; const apres = X.connecteursDe('1999XC9', G), avant0 = X.connecteursDe(r0, G).find(c => c.nom === 'A');
ok('une liaison dont le bout est réécrit sur place : l’index se refait — le nouveau repère la voit, l’ancien plus', apres.length === 1 && apres[0].bornes.join() === 'A1' && !avant0.bornes.includes('A1'), JSON.stringify(apres.map(c => c.nom + ':' + c.bornes)));
l0.de = r0; G.push(X.liaison({ de: '1999XC9', borneDe: 'B7', vers: '1998RL9', borneVers: '1', type: 'DR22', pnDe: 'EN4165-2M' }));
ok('une liaison ajoutée à la liste : vue aussitôt', X.connecteursDe('1999XC9', G).map(c => c.nom + ':' + c.bornes).join() === 'B:B7');
G[G.length - 1] = X.liaison({ de: '1999XC9', borneDe: 'C2', vers: '1998RL9', borneVers: '1', type: 'DR22', pnDe: 'EN4165-2M' });
ok('une liaison remplacée dans la liste : vue aussitôt', X.connecteursDe('1999XC9', G).map(c => c.nom + ':' + c.bornes).join() === 'C:C2');
ok('les modules d’une norme se trouvent par leur désignation, écrite autrement, comme avant (index des modules)', X.moduleDeReference(NE, 'NSA937901 20-04').variante === '20-04' && X.moduleDeConnecteur(NE, 'EN4165-002-08W16').variante === '08W16' && X.moduleDeConnecteur(NE, 'EN4165-2M') === null && X.famillesDeModules(NE, 'connecteur').join() === 'ASNE0059,EN2997,EN3645,EN3646,EN4165');

console.log('\n  ' + (total - echecs) + ' / ' + total + ' contrôles passés' + (echecs ? '  —  ' + echecs + ' ÉCHEC(S)' : '  —  tout est vert'));
process.exit(echecs ? 1 : 0);
