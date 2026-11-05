// node v_wd_h.js <paquet.xlsx> <sortie.xlsx> : une variante du paquet d'exemple pour éprouver ExporterWD sur un paquet
// d'un seul harness, comme un vrai retest qui a la colonne harness (scénario « exporter WD », see/FORMAT-WD.md) :
//  - les six folios ont le Harness « H1 » : chaque fichier de folio a WireHarness Tag="H1", et WD-TOUT n'a qu'un
//    WireHarness « H1 », où les folios sont réunis (395SW1 et son connecteur 395SW1-A, dessinés aux folios 1 et 3,
//    n'y sont qu'une fois, avec toutes leurs broches) ;
//  - folio 1 : la masse 901G a une borne « 1 » (son morceau B6, le fil W-016) et deux bornes vides : une seule
//    broche, tous ses fils dessus ;
//  - folio 4 : la masse 910G prend le repère de la barrette 667VT21 du folio 2 (dans WD-TOUT, un même Tag d'un autre
//    Type : le premier reste, et c'est dit), et un fil prend le numéro W-101 du folio 2, avec une longueur (un même
//    fil autrement écrit, ses deux bouts aussi : le premier reste, et c'est dit).
const path = require('path'), XLSX = require(path.join(__dirname, '..', '..', 'lib', 'xlsx.min.js')), fs = require('fs');
const [entree, sortie] = process.argv.slice(2);
const wb = XLSX.read(fs.readFileSync(entree), { type: 'buffer' });
const lire = n => ({ rows: XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: null }), header: XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1 })[0] });
const ecrire = (n, t) => { wb.Sheets[n] = XLSX.utils.json_to_sheet(t.rows, { header: t.header }); };
const FO = lire('Folios'), BL = lire('Blocs'), BO = lire('Bornes'), F = lire('Fils');
const un = (x, quoi) => { if (!x || (Array.isArray(x) && !x.length)) throw new Error('v_wd_h : introuvable : ' + quoi); return x; };
FO.rows.forEach(r => { r.Harness = 'H1'; });
// folio 1 : la masse 901G, une borne « 1 » et des bornes vides
const m1 = un(BO.rows.find(r => r.Folio === 1 && r.Repere === '901G' && r.Bloc === 'B6'), 'borne de 901G (B6) du folio 1');
m1.Borne = '1'; m1.Numero = '1';
const f1 = un(F.rows.find(r => r.Folio === 1 && ((r.DeBloc === 'B6' && !r.DeBorne) || (r.VersBloc === 'B6' && !r.VersBorne))), 'fil de B6 au folio 1');
if (f1.DeBloc === 'B6') f1.DeBorne = '1'; else f1.VersBorne = '1';
// folio 4 : 910G prend le repère 667VT21 (une barrette du folio 2) ; un fil prend le numéro W-101 (folio 2)
un(BL.rows.find(r => r.Folio === 2 && r.Repere === '667VT21'), 'barrette 667VT21 du folio 2');
const m4 = un(BL.rows.filter(r => r.Folio === 4 && r.Repere === '910G'), 'masse 910G du folio 4');
m4.forEach(r => { r.Repere = '667VT21'; });
BO.rows.filter(r => r.Folio === 4 && r.Repere === '910G').forEach(r => { r.Repere = '667VT21'; });
un(F.rows.find(r => r.Folio === 2 && r.Fil === 'W-101'), 'fil W-101 du folio 2');
const f4 = un(F.rows.find(r => r.Folio === 4 && r.Fil && r.Shunt !== 'O'), 'fil numéroté du folio 4');
const ancien = f4.Fil;
f4.Fil = 'W-101'; f4.Longueur = 2.5;
console.log(`v_wd_h : harness « H1 » aux six folios ; 901G (folio 1) borne « 1 » (${f1.Fil}) ; 910G (folio 4) devient 667VT21 ; ${ancien} (folio 4) devient W-101, 2,5 m`);
ecrire('Folios', FO); ecrire('Blocs', BL); ecrire('Bornes', BO); ecrire('Fils', F);
fs.writeFileSync(sortie, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
