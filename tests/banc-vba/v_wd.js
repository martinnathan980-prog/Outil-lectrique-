// node v_wd.js <paquet.xlsx> <sortie.xlsx> : une variante du paquet d'exemple pour éprouver ExporterWD (la liste de
// fils XML, scénario « exporter WD »). Ce qui change, et ce que l'export doit en faire (see/FORMAT-WD.md) :
//  - à échapper : le Titre du folio 1, la Description d'un équipement du folio 1, la Route d'un fil du folio 1, le
//    Numero d'une borne d'équipement du folio 1 (les fils qui la citent aussi), le PN d'un équipement du folio 4,
//    celui d'une pièce de connecteur du folio 2, le Harness du folio 2 (& < > " ' é) ;
//  - les noms de fichier : folio 2 « 2/B:"x" » (caractères interdits), folio 4 sans Nom ni Harness, folio 5 nommé
//    comme le folio 1 (un nom déjà pris, et un harness en double dans WD-TOUT), folio 6 nommé « tout » ;
//  - les natures : un morceau de masse du folio 1 devient un RENVOI (ses bouts de fil sautés), la masse 905G du
//    folio 3 un COLLECTEUR (GB), la barrette VT2 du folio 2 un RAIL (TB) ;
//  - les longueurs maximales : un équipement du folio 3 au repère de 300 caractères (son Tag coupé, ses connecteurs
//    rendus uniques), un Type de fil de 60 caractères et une Jauge de 16 (folio 2) ;
//  - les fils : un numéro en double (folio 1), une longueur connue (folio 3, 1,234 m), un fil dont aucun bout n'a de
//    borne (folio 6) ; une borne de prise sans côté (folio 2 : son bout de fil sauté) ; une borne dont le bloc
//    n'est pas dans Blocs (folio 6).
const path = require('path'), XLSX = require(path.join(__dirname, '..', '..', 'lib', 'xlsx.min.js')), fs = require('fs');
const [entree, sortie] = process.argv.slice(2);
const wb = XLSX.read(fs.readFileSync(entree), { type: 'buffer' });
const lire = n => ({ rows: XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: null }), header: XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1 })[0] });
const ecrire = (n, t) => { wb.Sheets[n] = XLSX.utils.json_to_sheet(t.rows, { header: t.header }); };
const FO = lire('Folios'), BL = lire('Blocs'), C = lire('Connecteurs'), BO = lire('Bornes'), F = lire('Fils');
const dire = s => console.log('v_wd : ' + s);
const un = (liste, quoi) => { if (!liste) throw new Error('v_wd : introuvable : ' + quoi); return liste; };
const folio = n => un(FO.rows.find(r => r.Folio === n), 'folio ' + n);
// --- les folios : à échapper, noms de fichier
folio(1).Titre = 'Contrat "C&D" <câblage> \'é\'';
folio(2).Nom = '2/B:"x"';
folio(2).Harness = 'H&<2>';
folio(4).Nom = null; folio(4).Harness = null;
folio(5).Nom = '1'; folio(5).Harness = null;
folio(6).Nom = 'tout'; folio(6).Harness = null;
dire('folios : titre 1 à échapper, noms « 2/B:"x" », (vide), « 1 », « tout », harness 2 « H&<2> »');
// --- les blocs
const eq1 = un(BL.rows.find(r => r.Folio === 1 && r.Nature === 'EQUIPEMENT'), 'équipement du folio 1');
eq1.Description = 'Relais "K1" <28V> & \'test\' é';
const masse1 = un(BL.rows.find(r => r.Folio === 1 && r.Nature === 'MASSE'), 'masse du folio 1');
masse1.Nature = 'RENVOI'; masse1.Repere = '▷F3';
BL.rows.filter(r => r.Folio === 3 && r.Repere === '905G').forEach(r => { r.Nature = 'COLLECTEUR'; });
BL.rows.filter(r => r.Folio === 2 && r.Repere === 'VT2').forEach(r => { r.Nature = 'RAIL'; });
const longs = BL.rows.filter(r => r.Folio === 3 && r.Nature === 'EQUIPEMENT');
const eqLong = un(longs.find(r => C.rows.filter(c => c.Folio === 3 && c.Bloc === r.Bloc).length >= 1), 'équipement à connecteur du folio 3');
eqLong.Repere = 'L'.repeat(290) + eqLong.Repere.slice(0, 10).padEnd(10, 'X');
const eq4 = un(BL.rows.find(r => r.Folio === 4 && r.Nature === 'EQUIPEMENT' && r.PN), 'équipement à PN du folio 4');
eq4.PN = 'PN<&>"\'';
dire(`blocs : ${eq1.Bloc} (folio 1) description à échapper ; ${masse1.Bloc} (folio 1) RENVOI « ▷F3 » ; 905G (folio 3) COLLECTEUR ; ` +
  `VT2 (folio 2) RAIL ; ${eqLong.Bloc} (folio 3) repère de ${eqLong.Repere.length} caractères ; ${eq4.Bloc} (folio 4) PN à échapper`);
// --- les connecteurs : un PN à échapper (folio 2)
const c2 = un(C.rows.find(r => r.Folio === 2 && r.PN && !/FICHE|EMBASE/.test(r.Lettre || '')), 'pièce à PN du folio 2');
C.rows.filter(r => r.Folio === 2 && r.Bloc === c2.Bloc && r.Lettre === c2.Lettre).forEach(r => { r.PN = 'CON"1"'; });
// --- les bornes : un Numero à échapper (folio 1, une borne d'équipement citée par un fil) ; une borne de prise sans côté
// (folio 2) ; une borne d'un bloc absent de Blocs (folio 6)
const cite = (f, b) => F.rows.some(x => x.Folio === f && ((x.DeBloc === b.Bloc && x.DeBorne === b.Borne) || (x.VersBloc === b.Bloc && x.VersBorne === b.Borne)));
const b1 = un(BO.rows.find(r => r.Folio === 1 && r.Connecteur && r.Bloc !== eq1.Bloc && cite(1, r)), 'borne d\'équipement citée du folio 1');
b1.Numero = '2&<"\'>';
const prises2 = new Set(BL.rows.filter(r => r.Folio === 2 && r.Nature === 'PRISE').map(r => r.Bloc));
const bp = un(BO.rows.find(r => r.Folio === 2 && prises2.has(r.Bloc) && r.Connecteur === 'FICHE' && cite(2, r)), 'borne de prise citée du folio 2');
bp.Connecteur = null;
BO.rows.push({ ...BO.rows.find(r => r.Folio === 6), Bloc: 'B99', Repere: 'FANTOME', Connecteur: null, Borne: '1', Numero: '1', Rond: null });
dire(`bornes : ${b1.Bloc} ${b1.Borne} (folio 1) Numero « ${b1.Numero} » ; ${bp.Bloc} ${bp.Borne} (folio 2, prise) sans côté ; B99 (folio 6) hors de Blocs`);
// --- les fils
const f1 = F.rows.filter(r => r.Folio === 1 && r.Fil && r.Shunt !== 'O');
un(f1[2], 'troisième fil numéroté du folio 1').Fil = f1[0].Fil;
f1[1].Route = 'R<&>"\'';
const f2 = un(F.rows.find(r => r.Folio === 2 && r.Fil && r.Shunt !== 'O'), 'fil du folio 2');
f2.Type = 'T'.repeat(60); f2.Jauge = 'AWG22-LONGUEUR';
const f3 = un(F.rows.find(r => r.Folio === 3 && r.Fil && r.Shunt !== 'O'), 'fil du folio 3');
f3.Longueur = 1.234;
const f6 = un(F.rows.find(r => r.Folio === 6 && r.Fil && r.Shunt !== 'O'), 'fil du folio 6');
f6.DeBloc = 'B98'; f6.VersBloc = 'B98';
dire(`fils : ${f1[2].Fil} en double (folio 1) ; route à échapper (${f1[1].Fil}) ; ${f2.Fil} (folio 2) type de 60 et jauge de 14 ; ` +
  `${f3.Fil} (folio 3) 1,234 m ; ${f6.Fil} (folio 6) sans aucune borne`);
ecrire('Folios', FO); ecrire('Blocs', BL); ecrire('Connecteurs', C); ecrire('Bornes', BO); ecrire('Fils', F);
fs.writeFileSync(sortie, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
