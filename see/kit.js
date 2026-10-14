/* ===========================================================================
   LE KIT DU BUREAU — un seul zip à emporter sur le poste où tourne SEE.
       node see/kit.js [--sortie=Kit-SEE.zip]
   Le zip contient, dans un dossier Kit-SEE/ :
     LIS-MOI-D-ABORD.txt          les étapes, en clair (see/kit/)
     1-Diagnostic/                diagnostic.cmd et diagnostic.ps1
     2-Pilote-Excel/              les trois modules du classeur pilote
     3-Atelier/Atelier-Schema.html  l'Atelier (index.html), avec « Exporter pour SEE »
   Les fichiers sont pris tels quels, octet pour octet (les .bas restent en
   Windows-1252 + CRLF, le .ps1 en UTF-8 avec BOM) ; le zip est « stocké »,
   écrit par zipDe (src/08-dxf.js), sans dépendance.
   ========================================================================= */
'use strict';
const fs = require('fs'), path = require('path');
const { chargerAtelier } = require('./exporter.js');
const RACINE = path.join(__dirname, '..');
const CONTENU = [
  ['LIS-MOI-D-ABORD.txt', 'see/kit/LIS-MOI-D-ABORD.txt'],
  ['1-Diagnostic/diagnostic.cmd', 'see/diagnostic.cmd'],
  ['1-Diagnostic/diagnostic.ps1', 'see/diagnostic.ps1'],
  ['2-Pilote-Excel/SEE_Commun.bas', 'see/vba/SEE_Commun.bas'],
  ['2-Pilote-Excel/SEE_Sonde.bas', 'see/vba/SEE_Sonde.bas'],
  ['2-Pilote-Excel/SEE_Pilote.bas', 'see/vba/SEE_Pilote.bas'],
  ['3-Atelier/Atelier-Schema.html', 'index.html'],
];
function kit() {
  const A = chargerAtelier();
  const fichiers = CONTENU.map(([nom, source]) => ({ nom: 'Kit-SEE/' + nom, octets: new Uint8Array(fs.readFileSync(path.join(RACINE, source))) }));
  return { fichiers, zip: A('zipDe')(fichiers) };
}
if (require.main === module) {
  const arg = process.argv.slice(2).find(a => a.startsWith('--sortie='));
  const sortie = arg ? arg.slice(9) : 'Kit-SEE.zip';
  const { fichiers, zip } = kit();
  fs.writeFileSync(sortie, zip);
  fichiers.forEach(f => console.log(`  ${f.nom.padEnd(44)} ${String(f.octets.length).padStart(9)} octets`));
  console.log(`${sortie} : ${fichiers.length} fichiers, ${zip.length} octets`);
}
module.exports = { kit, CONTENU };
