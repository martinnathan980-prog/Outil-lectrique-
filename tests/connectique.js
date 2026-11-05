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
  + 'sexeDuPn, habillage, remplirSelonNorme, physiqueDeBarrette, autreSexe, railsDeBarrette, connecteursDe, connecteurParBorne, moduleDeConnecteur, famillesDeModules, reperesDe, estBornier, estMasse, '
  + 'moduleEtContact, bornesLettrees, choixDesModules, retenirModule, moduleAutomatique, modulesPossibles, lireBorne, casesDuModule, nomenclatureDe, '
  + 'avecBarrettesAPoser, sansBarrettesAPoser, estRaccordAPoser, lettresDeBarretteAPoser, dedoublements, nouveauContrat, numeroDeBorne };', bac);
const X = bac.X, NE = X.normeEmbarquee(), BO = X.bibleDeLOutil(), L = X.contratExemple();
/* (v85) l'exemple écrit ses barrettes comme les fichiers du lecteur (« 667VT2 51 » + « A ») ; les règles d'une barrette
   NUMÉROTÉE (1, 2, 3… : une barrette à poser, un fichier d'une autre forme) se vérifient sur l'ancienne écriture de ses
   barrettes, le même câblage (tests/ancienne-ecriture.js) : LA. La barrette en modules a son paragraphe (§ 13). */
const { ancienne, NOUVELLES } = require('./ancienne-ecriture.js'), LA = ancienne(X, L);
let total = 0, echecs = 0;
const ok = (nom, cond, mesure) => { total++; if (!cond) echecs++; console.log('  ' + (cond ? 'OK    ' : 'ÉCHEC ') + nom + (mesure ? '   — ' + mesure : '')); };
// une liaison d'essai : un équipement (numéroté pour rester un équipement) vers une borne de la barrette
const li = (de, bDe, vers, bVers, type, pn) => X.liaison({ de, borneDe: bDe, vers, borneVers: bVers, type, cable: '', pnVers: pn || '' });
const vers = (r, bornes, types, pn) => bornes.map((b, k) => li(String(100 + k) + 'AA1', '1', r, String(b), types[k % types.length], k === 0 ? pn : ''));
const sansFaute = Q => Q.fils.every(x => x.jaugeOk !== false) && new Set(Q.fils.map(x => x.module + '|' + x.contact.lettre)).size === Q.fils.length;

console.log('\n1. LES GROUPES D’UNE BARRETTE : MÊME BORNE, BORNES PONTÉES');
const b668 = X.besoinsDeBarrette('668VT31', LA), P668 = X.potentielsDeBarrette(b668);
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
const I667 = X.barretteInfos('667VT21', LA, BO), I669 = X.barretteInfos('669VT32', LA, BO), I668 = X.barretteInfos('668VT31', LA, BO), I674 = X.barretteInfos('674VT22', LA, BO);
ok('667VT21 : le fichier dit E0599-1B201Z, qui loge ses trois groupes — VOLTA le garde (il prenait le B209, ni plus petit ni plus léger)', I667.reference === 'E0599-1B201Z' && I667.plan.nomme && !I667.changee && sansFaute(I667.plan) && I667.raisons.some(r => /celui de votre fichier/.test(r)), I667.reference + ' — ' + I667.raisons.join(' · '));
ok('669VT32 : le B204 du fichier loge ses quatre câbles d’un groupe : gardé', I669.reference === 'E0599-1B204Z' && I669.plan.nomme && sansFaute(I669.plan), I669.reference);
ok('668VT31 : l’A101 du fichier (paires de #22) ne loge ni les DR20 ni un groupe de quatre — VOLTA prend le B207, et le dit changé', I668.reference === 'E0599-1B207Z' && !I668.plan.nomme && I668.changee, I668.reference);
ok('674VT22 : le B201 du fichier (paires) ne loge pas trois câbles d’un groupe — le B207', I674.reference === 'E0599-1B207Z' && !I674.plan.nomme, I674.reference);
ok('choisi à la main, un autre module passe devant celui du fichier', X.barretteInfos('667VT21', LA, BO, undefined, 'E0599-1B209Z').reference === 'E0599-1B209Z' && X.barretteInfos('667VT21', LA, BO, undefined, 'NSA937901').plan.modules.every(M => M.module.famille === 'NSA937901'));
ok('VT21 / VT22, VT31 / VT32, VT41 / VT42 : chaque module de l’exemple loge tout, sans un refus', ['667VT21', '674VT22', '668VT31', '669VT32', '670VT41', '671VT42'].every(r => { const Q = X.barretteInfos(r, LA, BO).plan; return Q.places === Q.potentiels && !Q.verdicts.length && sansFaute(Q) && Q.modules.length === 1; }));

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
ok('le même fichier donne toujours le même choix (barrettes de l’exemple, deux fois)', ['667VT21', '668VT31', '670VT41', '672VT51'].every(r => empreinte(X.barretteInfos(r, LA, BO)) === empreinte(X.barretteInfos(r, LA, BO))) && [...NOUVELLES].every(r => empreinte(X.barretteInfos(r, L, BO)) === empreinte(X.barretteInfos(r, L, BO))) && empreinte(meles) === empreinte(X.barretteInfos('731VT1', vers('731VT1', Array.from({ length: 40 }, (_, k) => (k >> 2) + 1), ['DR24', 'DR22', 'DR20', 'DR18']), BO)));
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
// (v85) les deux écritures des barrettes côte à côte : les repères frères d'autrefois (668VT31…) et les barrettes en modules (668VT3…)
const LP = [...LA, ...L.filter(l => NOUVELLES.has(l.de) || NOUVELLES.has(l.vers))], pn = { pnDe: 'EN4165-2M', pnVers: 'EN4165-2M' };
LP.push(X.liaison({ de: '800XC9', borneDe: 'A1', vers: '801RL9', borneVers: '1', type: 'DR20', ...pn, pnVers: '' }));
LP.push(X.liaison({ de: '800XC9', borneDe: 'A2', vers: '800XC9', borneVers: 'A3', type: 'DR22', ...pn, contactVers: 'EN3155-019F2022' }));
LP.push(X.liaison({ de: '800XC9', borneDe: 'A1', vers: '800XC9', borneVers: 'A4', type: 'DR20', ...pn }));
vm.runInContext(fs.readFileSync(path.join(SRC, '08-modules.js'), 'utf8') + '\nthis.P = { sertirDuFil, contactMain, barretteParente, modulesDeLaBarrette, modulesPossiblesDe, choisirModuleDeBarrette, moduleDeBarretteAutomatique };', Object.assign(bac, {}));
vm.runInContext('var app, verite, liaisonsDeRepere, estRenvoi, rangDuParent, histPush, designer, apresEdition;', bac);
const HIST = [];
Object.assign(bac, { app: { norme: NE, bible: BO, contrat: { designations: new Map(), sexes: new Map() } }, verite: () => LP, liaisonsDeRepere: r => LP.filter(l => l.de === r || l.vers === r), estRenvoi: () => false,
  histPush: q => HIST.push(q), designer: (n, d) => { if (d) bac.app.contrat.designations.set(n, d); else bac.app.contrat.designations.delete(n); }, apresEdition: () => {},
  rangDuParent: nom => { const m = /^(\d+)([A-Z]{2,3}\d+)([0-9A-Z])$/.exec(String(nom || '')); return m ? { parent: m[2], rang: m[3] } : null; } });
const P = bac.P;

console.log('\n10. LE RAIL : UN PAR BARRETTE, PAS UN PAR MODULE');
const rail = r => X.railsDeBarrette(NE, r.map(n => X.barretteInfos(n, LP, BO).plan));
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

console.log('\n13. (v85) LA BARRETTE COMME LE FICHIER L’ÉCRIT : UN REPÈRE, DES MODULES, « MODULE + CONTACT »');
// une liaison d'essai vers « repère module » + « lettre », comme le fichier l'écrit (01, `boutLu`)
const lm = (de, bDe, vers, bVers, type, o) => X.liaison({ de, borneDe: bDe, vers, borneVers: bVers, type, cable: '', ...(o || {}) });
const QI = r => X.barretteInfos(r, L, BO), lettreGardee = Q => Q.fils.every(x => { const y = X.moduleEtContact(x.borne); return y && y.module === x.numero && y.contact === x.contact.lettre; });
const w101 = L.find(l => l.cable === 'W-101');
ok('« 667VT2 51 » + « A » se lit 667VT2:51A, le fichier gardé tel qu’il l’écrit ; 51-3 : module 51, contact 3 ; une barrette à poser (1, 2, 3…) n’est pas en modules',
  w101.vers === '667VT2' && w101.borneVers === '51A' && w101.ecrit.vers === '667VT2 51' && w101.ecrit.borneVers === 'A' && X.lireBorne('667VT2', '51-3').contact === '3' && X.bornesLettrees(X.besoinsDeBarrette('667VT2', L)) && !X.bornesLettrees(X.besoinsDeBarrette('VT1', [lm('102CB1', '2', 'VT1', '1', 'DR20')])),
  w101.vers + ':' + w101.borneVers);
const I2 = QI('667VT2'), M51 = I2.plan.modules[0], M52 = I2.plan.modules[1];
ok('667VT2, deux modules sur deux folios : le 51 garde le B201 du fichier ; le 52 prend le B202 — le B201 sépare A, B et C, que le fichier relie — et le dit',
  M51.numero === '51' && M51.reference === 'E0599-1B201Z' && M51.nomme && M52.numero === '52' && M52.reference === 'E0599-1B202Z' && !M52.nomme && M52.fichier === 'E0599-1B201Z' && /^A, B et C sont reliés, mais pas dans une même zone du B201$/.test(M52.ecart.raison) && I2.changee && !I2.plan.verdicts.length,
  I2.plan.modules.map(M => M.numero + ' ' + M.reference + (M.ecart ? ' (' + M.ecart.raison + ')' : '')).join(' · '));
const I3 = QI('668VT3');
ok('668VT3, trois modules : 51 et 52 en B207, 53 (la reprise de blindage) en B204, tous ceux du fichier ; seize câbles, chacun sur sa lettre', I3.plan.modules.map(M => M.numero + ':' + M.module.variante).join() === '51:B207,52:B207,53:B204' && I3.plan.modules.every(M => M.nomme) && I3.plan.utilises === 16 && lettreGardee(I3.plan) && !I3.changee, I3.reference);
const I4 = QI('670VT4'), I5 = QI('672VT5');
ok('670VT4 en NSA937901 (20-06 et 20-04) : gardés ; 672VT5 : l’A101 du fichier (des paires) ne réunit pas A, B, C et D — l’A102 ; son module 52 garde le B202', I4.plan.famille === 'NSA937901' && I4.plan.modules.every(M => M.nomme)
  && I5.plan.modules[0].reference === 'E0599-1A102Z' && /^A, B, C et D sont reliés/.test(I5.plan.modules[0].ecart.raison) && I5.plan.modules[1].nomme && I5.plan.modules[1].reference === 'E0599-1B202Z', I4.reference + ' · ' + I5.reference);
ok('les minuscules de l’ASNE 0599 sont d’autres contacts : 51a et 51A, deux câbles, deux contacts', (Q => Q.fils.some(x => x.borne === '51a' && x.contact.lettre === 'a') && Q.fils.some(x => x.borne === '51A' && x.contact.lettre === 'A'))(I5.plan));
ok('VOLTA ne change jamais un module ni une lettre : dans les quatre barrettes de l’exemple, chaque câble est sur le contact que sa borne écrit', [I2, I3, I4, I5].every(I => lettreGardee(I.plan) && I.plan.places === I.plan.potentiels));
// les zones : ce que le fichier relie (un pontage, ou la zone du module qu'il nomme) va dans une même zone ; le reste jamais
const sansP = X.barretteInfos('740VT1', [lm('100AA1', '1', '740VT1 51', 'A', 'DR22'), lm('101AA1', '1', '740VT1 51', 'B', 'DR22')], BO).plan;
const ponte = X.barretteInfos('741VT1', [lm('100AA1', '1', '741VT1 51', 'A', 'DR22'), lm('101AA1', '1', '741VT1 51', 'B', 'DR22'), lm('741VT1 51', 'A', '741VT1 51', 'B', 'DR22')], BO).plan;
const zoneA = (Q, a, b) => { const m = Q.modules[0].module, g = l => m.contacts.find(c => c.lettre === l).groupe; return g(a) === g(b); };
ok('A et B, ni pontés ni reliés par le fichier : un module où ils sont dans deux zones (jamais un court-circuit) ; pontés : un module où une zone les réunit', !zoneA(sansP, 'A', 'B') && sansP.potentiels === 2 && !sansP.verdicts.length && zoneA(ponte, 'A', 'B') && ponte.potentiels === 1 && !ponte.verdicts.length, sansP.reference + ' · ' + ponte.reference);
const parZone = X.barretteInfos('742VT1', [lm('100AA1', '1', '742VT1 51', 'A', 'DR22', { pnVers: 'E0599-1B201Z' }), lm('101AA1', '1', '742VT1 51', 'D', 'DR22', { pnVers: 'E0599-1B201Z' })], BO).plan;
ok('la zone du module que le fichier nomme relie aussi : A et D d’un B201 (sans pontage) sont un même groupe — le B201 est gardé', parZone.potentiels === 1 && parZone.modules[0].nomme && parZone.reference === 'E0599-1B201Z', parZone.reference);
const sansZ = X.barretteInfos('743VT1', [lm('100AA1', '1', '743VT1 51', 'Z', 'DR22')], BO).plan;
ok('une lettre qu’aucun module n’a (Z) : le câble ne se pose pas, et c’est dit', sansZ.restants.length === 1 && /module 51 : aucun module (ASNE 0599|NSA937901|NSA 937901) n’a de contact Z/.test(sansZ.verdicts.map(v => v.texte).join()), sansZ.verdicts.map(v => v.texte).join(' | '));
const gros16 = X.barretteInfos('744VT1', [lm('100AA1', '1', '744VT1 51', 'A', 'DR16'), lm('101AA1', '1', '744VT1 51', 'C', 'DR16')], BO, undefined, 'E0599').plan;
ok('deux DR16 sur A et C, séparés : un module #16 où A et C sont dans deux zones (le C302), aucun refus', gros16.modules[0].module.contacts.every(c => c.taille === '16') && !zoneA(gros16, 'A', 'C') && gros16.fils.every(x => x.jaugeOk === true), gros16.reference);
const pontM = X.barretteInfos('745VT1', [lm('100AA1', '1', '745VT1 51', 'A', 'DR22'), lm('745VT1 51', 'A', '745VT1 51', 'D', 'DR22'), lm('745VT1 51', 'D', '745VT1 52', 'A', 'DR22'), lm('745VT1 52', 'A', '745VT1 52', 'B', 'DR22'), lm('745VT1 52', 'B', '101AA1', '1', 'DR22')], BO).plan;
ok('un pontage d’un module à l’autre (51D → 52A) est un câble : un contact serti à chaque bout, sa gauge jugée ; le potentiel court sur les deux modules', pontM.potentiels === 1 && pontM.modules.length === 2 && pontM.fils.filter(x => x.f.pont).map(x => x.borne).sort().join() === '51D,52A' && pontM.fils.filter(x => x.f.pont).every(x => x.sertir && x.jaugeOk === true) && !pontM.verdicts.length, pontM.fils.map(x => x.borne + (x.f.pont ? '(pont)' : '')).join(' '));
ok('une barrette, une norme : sans part number, tous ses modules de la même', new Set(pontM.modules.map(M => M.module.famille)).size === 1 && new Set(sansP.modules.concat(ponte.modules).map(M => M.module.famille)).size === 1);
// le choix à la main, module par module : gardé dans la désignation de la barrette
ok('le choix se garde dans la désignation : « NSA937901 ; 51=E0599-1A102Z » — retenir le 52, puis le rendre à VOLTA', (C => C.global === 'NSA937901' && C.parModule.get('51') === 'E0599-1A102Z')(X.choixDesModules('NSA937901 ; 51=E0599-1A102Z'))
  && X.retenirModule('', '52', 'E0599-1B204Z') === '52=E0599-1B204Z' && X.retenirModule('NSA937901 ; 52=E0599-1B204Z', '51', 'X') === 'NSA937901 ; 51=X ; 52=E0599-1B204Z' && X.moduleAutomatique('52=E0599-1B204Z', '52') === '');
const Imain = X.barretteInfos('667VT2', L, BO, undefined, '52=E0599-1B204Z').plan, Ik = X.barretteInfos('667VT2', L, BO, undefined, '52=E0599-1B201Z').plan;
ok('retenu à la main, un module passe devant (le B204 pour le 52, le 51 reste celui du fichier) ; un module qui ne convient pas reste retenu, et son défaut se dit', Imain.modules[1].reference === 'E0599-1B204Z' && Imain.modules[1].main && Imain.modules[0].nomme && !Imain.verdicts.length
  && Ik.modules[1].main && Ik.verdicts.some(v => v.niveau === 'ko' && /^module 52 : A, B et C sont reliés/.test(v.texte)), Ik.verdicts.map(v => v.texte).join(' | '));
const MP = X.modulesPossibles(X.besoinsDeBarrette('667VT2', L), NE, '52', '');
ok('les modules possibles pour le 52 de 667VT2 : le B202 d’abord (le mieux taillé, celui de VOLTA, retenu), puis ceux qui conviennent, puis les autres et pourquoi — le B201 du fichier : « A, B et C sont reliés… »', MP.retenu === 'E0599-1B202Z' && MP.auto === 'E0599-1B202Z' && MP.fichier === 'E0599-1B201Z' && MP.candidats[0].reference === 'E0599-1B202Z' && MP.candidats[0].mieux && MP.candidats[0].convient
  && MP.candidats.every(c => c.m.famille === 'E0599') && (c => c && !c.convient && c.fichier && /A, B et C sont reliés/.test(c.raisons[0]))(MP.candidats.find(c => c.reference === 'E0599-1B201Z')) && X.modulesPossibles(X.besoinsDeBarrette('667VT2', L), NE, '99', '') === null,
  MP.candidats.slice(0, 5).map(c => c.variante + (c.convient ? '' : '✗')).join(' '));
ok('chaque possible dit ce qu’il loge : le B202, « 1 / 1 groupe » ; le B201 du fichier, « 0 / 1 »', (c => c.loge === 1 && c.groupes === 1)(MP.candidats[0]) && (c => c.loge === 0 && c.groupes === 1)(MP.candidats.find(c => c.reference === 'E0599-1B201Z')));
const C52 = X.casesDuModule('667VT2', L, '52');
ok('les cases du fichier du module 52 de 667VT2 (où l’installation corrigée écrit son B202) : les PN de ses seules bornes (sept bouts, pontages compris), au folio 5 — le module 51 garde les siens', C52.length === 7 && C52.every(([l, ch]) => l.plan === '5' && /^52/.test(ch === 'pnDe' ? l.borneDe : l.borneVers)), C52.map(([l, ch]) => (ch === 'pnDe' ? l.borneDe : l.borneVers) + '·' + ch).join(' '));
const LE = L.map(l => l.cable === 'W-550' ? X.liaison({ ...l, contactVers: 'EN3155-019F2018' }) : l), QE = X.barretteInfos('667VT2', LE, BO).plan, xE = QE.fils.find(x => x.f.l && x.f.l.cable === 'W-550');
ok('le contact écrit sur la liaison (contactVers, le récapitulatif) se lit au bon bout : 52A porte EN3155-019F2018 à côté de celui de la table ; la LPA du plan le compte', xE.ecrit === 'EN3155-019F2018' && xE.sertir.reference === 'EN3155-016M2018' && QE.fils.filter(x => x.ecrit).length === 1 && X.nomenclatureDe(QE.fils).some(n => n.reference === 'EN3155-019F2018' && n.n === 1), xE.borne + ' · ' + xE.ecrit);
// le rail, une fois par barrette : tous ses modules
const BP3 = P.barretteParente('668VT3'), BP4 = P.barretteParente('670VT4');
ok('668VT3 : sa propre barrette, un rail de trois modules (001751 103 00, 42 mm) ; 670VT4 : le profilé NSA937901RB2000 pour ses deux modules', BP3.freres.join() === '668VT3' && BP3.porteur === '668VT3' && BP3.rails.length === 1 && BP3.rails[0].reference === '001751 103 00' && BP3.rails[0].longueur === 42 && BP4.rails[0].reference === 'NSA937901RB2000' && BP4.rails[0].n === 2,
  BP3.rails.map(r => r.reference + ' (' + r.sous + ')').join());
// les fonctions de la page (08-modules) : ce que l'onglet Modifier appelle
const MD = P.modulesDeLaBarrette('667VT2');
ok('modulesDeLaBarrette : 51 (celui du fichier) et 52 (le B202, celui du fichier écarté : pourquoi) ; une barrette d’autrefois (668VT31) : aucun', MD.length === 2 && MD[0].nomme && MD[1].ecart && MD[1].ecart.reference === 'E0599-1B201Z' && MD[1].variante === 'B202' && P.modulesDeLaBarrette('668VT31').length === 0);
const DES = bac.app.contrat.designations, fait = P.choisirModuleDeBarrette('667VT2', '52', 'E0599-1B204Z'), d1 = DES.get('667VT2'), pris = P.modulesDeLaBarrette('667VT2')[1];
P.moduleDeBarretteAutomatique('667VT2', '52');
ok('choisirModuleDeBarrette retient le module (une entrée d’historique), moduleDeBarretteAutomatique le rend à VOLTA', fait && d1 === '52=E0599-1B204Z' && pris.main && pris.reference === 'E0599-1B204Z' && !DES.has('667VT2') && HIST.length === 2 && P.modulesPossiblesDe('667VT2', '52').retenu === 'E0599-1B202Z', HIST.join(' · '));

console.log('\n14. (v86) UN CONTACT, UN NOM : LES BARRETTES À POSER NOMMÉES COMME LEUR FACE, LES PRISES PAR LEURS LETTRES');
/* L'audit B2 : VT2 portait 1, 2, 3 sur le plan et H, J, K sur sa fiche ; 408VC1A « 1 » sur le plan, « A » sur sa face. VOLTA crée
   la barrette à poser : il nomme ses bornes comme sa face (« 51H » : le module 51, la lettre du contact). Le câble à créer se
   reconnaît à sa marque (01, `estRaccordAPoser`), plus à sa borne 1 — sauf une liaison d'avant, sans marque. */
const folio = p => L.filter(l => l.plan === p), vtDe = (Lf, v) => Lf.filter(l => l.de === v || l.vers === v), bout = l => l.de + ':' + l.borneDe + '→' + l.vers + ':' + l.borneVers;
const F1 = X.avecBarrettesAPoser(folio('1'), 0), V1 = vtDe(F1, 'VT1'), R1 = V1.filter(l => X.estRaccordAPoser(l));
ok('VT1 (102CB1:2) : le câble à créer sur 51H, le DR20 vers 103RL1:A1 sur 51J, le DR24 de 395SW1 sur 51K, les shunts 51H-51J et 51J-51K — les lettres de sa face',
  R1.length === 1 && bout(R1[0]) === '102CB1:2→VT1:51H' && R1[0].aCreer === true && V1.some(l => bout(l) === 'VT1:51J→103RL1:A1') && V1.some(l => bout(l) === '395SW1:1→VT1:51K')
  && V1.filter(l => l.de === 'VT1' && l.vers === 'VT1').map(bout).join() === 'VT1:51H→VT1:51J,VT1:51J→VT1:51K', V1.map(bout).join(' | '));
const Q1 = X.remplirModules(X.besoinsDeBarrette('VT1', V1), NE, '');
ok('sa fiche lit la même chose : une barrette en modules, le module 51 sur le NSA937901M20-11 (celui que VOLTA avait choisi), H, J et K dans une même zone, rien à redire',
  Q1.lettres === true && Q1.reference === 'NSA937901M20-11' && Q1.fils.map(x => x.borne + '=' + x.contact.lettre).sort().join() === '51H=H,51J=J,51K=K' && !Q1.verdicts.length, Q1.reference + ' · ' + Q1.verdicts.map(v => v.texte).join(' | '));
ok('les trois barrettes à poser de l’exemple (VT1, VT2, VT3) : 51H, 51J et 51K ; le câble à créer seul porte la marque, les câbles du contrat gardent leur `origine`',
  [['1', 0, 'VT1'], ['2', 1, 'VT2'], ['6', 2, 'VT3']].every(([p, d, v]) => { const xs = vtDe(X.avecBarrettesAPoser(folio(p), d), v);
    return [...new Set(xs.flatMap(l => [l.de === v ? l.borneDe : null, l.vers === v ? l.borneVers : null]).filter(Boolean))].sort().join() === '51H,51J,51K' && xs.filter(l => l.aCreer).length === 1 && xs.filter(l => l.origine).length === 2; }));
const S1 = X.sansBarrettesAPoser(F1), SW = X.sansBarrettesAPoser(F1.map(({ origine, ...l }) => l));
ok('le moteur (03) la retire comme avant : chaque câble revient sur 102CB1:2 ; sans `origine` (ce que reçoit le Worker), la marque suffit',
  S1.filter(l => l.aPoser === 'VT1').every(l => (l.de === '102CB1' && l.borneDe === '2') || (l.vers === '102CB1' && l.borneVers === '2')) && !S1.some(l => l.de === 'VT1' || l.vers === 'VT1') && !SW.some(l => l.de === 'VT1' || l.vers === 'VT1'));
ok('estRaccordAPoser : le câble à créer marqué (51H) ; une liaison d’avant, sans marque, à sa borne 1 ; jamais un câble du contrat (51J, 51K), un shunt, ni une barrette posée',
  X.estRaccordAPoser({ de: '102CB1', borneDe: '2', vers: 'VT1', borneVers: '51H', aCreer: true }) && X.estRaccordAPoser({ de: '102CB1', borneDe: '2', vers: 'VT1', borneVers: '1' })
  && !X.estRaccordAPoser({ de: 'VT1', borneDe: '51J', vers: '103RL1', borneVers: 'A1' }) && !X.estRaccordAPoser({ de: '395SW1', borneDe: '1', vers: 'VT1', borneVers: '51K' })
  && !X.estRaccordAPoser({ de: 'VT1', borneDe: '51H', vers: 'VT1', borneVers: '51J', aCreer: true }) && !X.estRaccordAPoser({ de: '102CB1', borneDe: '2', vers: '102VT9', borneVers: '51H', aCreer: true }) && !X.estRaccordAPoser(null));
// une barrette qu'aucun module ne loge garde ses numéros (et le câble à créer reste reconnu) : 36 câbles et le câble à créer,
// quand la plus grande zone de la norme (E0599-1A106Z) en a 36
const tant = []; for (let k = 0; k < 36; k++) tant.push(X.liaison({ de: '800XC1', borneDe: 'A1', vers: '8' + String(k).padStart(2, '0') + 'LP1', borneVers: '1', cable: 'W-8' + k, type: 'DR22', plan: '9' }));
const FT = X.avecBarrettesAPoser(tant, 0), VT = [...new Set(FT.filter(l => l.aPoser).map(l => l.aPoser))][0], RT = FT.filter(l => X.estRaccordAPoser(l));
ok('trente-six câbles sur une borne, qu’aucune zone ne loge : la barrette garde ses numéros (1 pour le câble à créer), et le moteur la retrouve',
  X.lettresDeBarretteAPoser(VT, vtDe(FT, VT)) === null && RT.length === 1 && RT[0].borneVers === '1' && !X.sansBarrettesAPoser(FT).some(l => l.de === VT || l.vers === VT), VT + ' · ' + RT.map(bout).join());
// posée au contrat (08-interface, `poserBarrette` : `liaison({ ...l, de, vers })`) : le câble créé garde sa marque, les bornes leurs lettres
const pose = V1.map(l => X.liaison({ ...l, de: l.de === 'VT1' ? '102VT9' : l.de, vers: l.vers === 'VT1' ? '102VT9' : l.vers })), cree = pose.find(l => l.aCreer);
ok('posée au contrat sous 102VT9, elle garde ses lettres (102VT9:51H) et le câble créé sa marque : une barrette en modules, que VOLTA vérifie sans rien changer',
  cree && bout(cree) === '102CB1:2→102VT9:51H' && !X.estRaccordAPoser(cree) && X.bornesLettrees(X.besoinsDeBarrette('102VT9', pose))
  && (Q => Q.fils.map(x => x.borne + '=' + x.contact.lettre).sort().join() === '51H=H,51J=J,51K=K' && !Q.verdicts.length)(X.remplirModules(X.besoinsDeBarrette('102VT9', pose), NE, '')));
// les prises de l'exemple : leurs bornes sont les lettres de leur face
ok('les prises de l’exemple s’écrivent comme leur face : 408VC1A A ; 409VC2A A, B, C ; 410VC2B A, B ; 411VC3A A…H ; 412VC3B A…G — chaque borne sur sa lettre, rien à redire',
  [['408VC1A', 'A'], ['409VC2A', 'ABC'], ['410VC2B', 'AB'], ['411VC3A', 'ABCDEFGH'], ['412VC3B', 'ABCDEFG']].every(([r, ls]) => { const c = X.coupureEnModule(r, L, NE);
    return X.besoinsDeBarrette(r, L).bornes.slice().sort().join('') === ls && c.plan.fils.every(x => x.contact.lettre === x.borne) && !c.plan.verdicts.length; }));

console.log('\n  ' + (total - echecs) + ' / ' + total + ' contrôles passés' + (echecs ? '  —  ' + echecs + ' ÉCHEC(S)' : '  —  tout est vert'));
process.exit(echecs ? 1 : 0);
