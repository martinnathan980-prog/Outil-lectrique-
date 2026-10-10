// node variante.js <paquet.xlsx> <sortie.xlsx> : les trois modifications à la fois (v_casse.js, v_noms.js, v_long.js : une seule).
// Une variante du paquet d'exemple pour éprouver la reprise du pilote :
//  - casse : deux bornes d'un même bloc deviennent « A » et « a » (contacts d'un connecteur circulaire) ;
//  - noms : le folio 2 porte le même nom que le folio 1 ;
//  - long : un fil porte un numéro dont les chiffres ne tiennent pas dans un Long.
const path = require('path'), XLSX = require(path.join(__dirname, '..', '..', 'lib', 'xlsx.min.js')), fs = require('fs');
const [entree, sortie] = process.argv.slice(2);
const wb = XLSX.read(fs.readFileSync(entree), { type: 'buffer' });
const lire = n => ({ rows: XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: null }), header: XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1 })[0] });
const ecrire = (n, t) => { wb.Sheets[n] = XLSX.utils.json_to_sheet(t.rows, { header: t.header }); };
const B = lire('Bornes'), F = lire('Fils'), FO = lire('Folios');
// casse : un bloc d'équipement du folio 1 dont deux bornes du même connecteur ont chacune un fil tracé
const cites = new Set(F.rows.filter(f => f.Points).flatMap(f => [f.Folio + '|' + f.DeBloc + '|' + f.DeBorne, f.Folio + '|' + f.VersBloc + '|' + f.VersBorne]));
let choix = null;
const parBloc = {};
B.rows.forEach(r => { const k = r.Folio + '|' + r.Bloc + '|' + (r.Connecteur || ''); (parBloc[k] = parBloc[k] || []).push(r); });
for (const k of Object.keys(parBloc)) { const rs = parBloc[k].filter(r => cites.has(r.Folio + '|' + r.Bloc + '|' + r.Borne) && r.Cote !== 'C' && !/^[Aa]$/.test(r.Borne));
  const uniques = rs.filter(r => parBloc[k].filter(x => x.Borne === r.Borne).length === 1);
  if (uniques.length >= 2 && uniques[0].Folio === 1) { choix = uniques.slice(0, 2); break; } }
if (!choix) throw new Error('pas de bloc pour la casse');
const ren = new Map([[choix[0].Borne, 'A'], [choix[1].Borne, 'a']]), bloc = choix[0].Bloc, folio = choix[0].Folio;
console.log('casse : folio', folio, 'bloc', bloc, choix[0].Repere, [...ren].map(x => x.join(' -> ')).join(', '));
B.rows.forEach(r => { if (r.Folio === folio && r.Bloc === bloc && ren.has(String(r.Borne))) { r.Borne = ren.get(String(r.Borne)); r.Numero = r.Borne; } });
F.rows.forEach(f => { if (f.Folio !== folio) return;
  if (f.DeBloc === bloc && ren.has(String(f.DeBorne))) f.DeBorne = ren.get(String(f.DeBorne));
  if (f.VersBloc === bloc && ren.has(String(f.VersBorne))) f.VersBorne = ren.get(String(f.VersBorne)); });
// noms
const n1 = FO.rows.find(r => r.Folio === 1), n2 = FO.rows.find(r => r.Folio === 2);
console.log('noms : folio 2 « ' + n2.Nom + ' » -> « ' + n1.Nom + ' »'); n2.Nom = n1.Nom;
// long
const fl = F.rows.find(f => f.Folio === 1 && f.Fil && f.Points);
console.log('long : fil « ' + fl.Fil + ' » -> « W12345678901 »'); fl.Fil = 'W12345678901';
ecrire('Bornes', B); ecrire('Fils', F); ecrire('Folios', FO);
XLSX.writeFile ? fs.writeFileSync(sortie, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })) : null;
