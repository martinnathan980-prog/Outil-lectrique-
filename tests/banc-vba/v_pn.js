// node v_pn.js <paquet.xlsx> <sortie.xlsx> : une variante du paquet d'exemple pour éprouver le MATÉRIEL
// (le « device » associé) du pilote. La géométrie ne change pas ; seuls des PN changent :
//  - corps : le premier équipement du folio 1 et celui du folio 2 perdent leur PN (feuille Blocs) ;
//  - connecteur : sur un équipement du folio 1 qui a au moins deux connecteurs, le premier perd son PN
//    (toutes ses pièces de la feuille Connecteurs), l'autre le garde ;
//  - un même connecteur sur deux folios : s'il en existe un, son PN change sur le second folio (le pilote
//    garde le premier, et le dit).
const path = require('path'), XLSX = require(path.join(__dirname, '..', '..', 'lib', 'xlsx.min.js')), fs = require('fs');
const [entree, sortie] = process.argv.slice(2);
const wb = XLSX.read(fs.readFileSync(entree), { type: 'buffer' });
const lire = n => ({ rows: XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: null }), header: XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1 })[0] });
const ecrire = (n, t) => { wb.Sheets[n] = XLSX.utils.json_to_sheet(t.rows, { header: t.header }); };
const BL = lire('Blocs'), C = lire('Connecteurs'), BO = lire('Bornes');
// les corps
for (const f of [1, 2]) {
  const b = BL.rows.find(r => r.Folio === f && r.Nature === 'EQUIPEMENT' && r.PN);
  if (!b) throw new Error('pas d\'équipement à PN sur le folio ' + f);
  console.log(`corps : folio ${f}, bloc ${b.Bloc} ${b.Repere} : PN « ${b.PN} » retiré`);
  b.PN = null;
}
// un connecteur sans PN : les lettres servies (feuille Bornes) d'un équipement du folio 1, au moins deux
const servies = (f, bloc) => [...new Set(BO.rows.filter(r => r.Folio === f && r.Bloc === bloc).map(r => r.Connecteur || ''))];
const eq = BL.rows.find(r => r.Folio === 1 && r.Nature === 'EQUIPEMENT' && servies(1, r.Bloc).filter(Boolean).length >= 2);
if (!eq) throw new Error('pas d\'équipement à deux connecteurs sur le folio 1');
const lettre = servies(1, eq.Bloc).filter(Boolean)[0];
const pieces = C.rows.filter(r => r.Folio === 1 && r.Bloc === eq.Bloc && (r.Lettre || '') === lettre);
console.log(`connecteur : folio 1, bloc ${eq.Bloc} ${eq.Repere}, lettre ${lettre} : PN retiré (${pieces.length} pièce(s)) ; ` +
  `l'autre connecteur (${servies(1, eq.Bloc).filter(Boolean)[1]}) garde le sien`);
pieces.forEach(r => { r.PN = null; });
// un même connecteur (repère, lettre) servi sur deux folios : un autre PN sur le second
const vus = new Map();
let change = null;
for (const r of C.rows) {
  if (!r.PN) continue;
  const b = BL.rows.find(x => x.Folio === r.Folio && x.Bloc === r.Bloc);
  if (!b || b.Nature !== 'EQUIPEMENT' || !servies(r.Folio, r.Bloc).includes(r.Lettre || '')) continue;
  const tag = b.Repere + '-' + (r.Lettre || '');
  if (vus.has(tag) && vus.get(tag) !== r.Folio) { change = { tag, folio: r.Folio, bloc: r.Bloc, lettre: r.Lettre }; break; }
  if (!vus.has(tag)) vus.set(tag, r.Folio);
}
if (change) {
  C.rows.filter(r => r.Folio === change.folio && r.Bloc === change.bloc && r.Lettre === change.lettre).forEach(r => { r.PN = 'AUTRE-' + r.PN; });
  console.log(`même connecteur : « ${change.tag} » sur le folio ${change.folio} : PN préfixé « AUTRE- »`);
} else console.log('même connecteur : aucun connecteur servi sur deux folios (rien de changé)');
ecrire('Blocs', BL); ecrire('Connecteurs', C);
fs.writeFileSync(sortie, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
