/* ===========================================================================
   LE KIT DU BUREAU — un seul zip à emporter sur le poste où tourne SEE.
       node see/kit.js [--sortie=Kit-SEE.zip]
   Le zip contient, dans un dossier Kit-SEE/ :
     Pilote-SEE.xlsm              LE fichier à ouvrir : le classeur pilote, macros
                                  déjà dedans, bouton « TESTER SEE » (écrit à la
                                  volée par see/classeur.js, en tête du zip)
     LIS-MOI-D-ABORD.txt          les étapes, en clair (see/kit/)
     Pour-plus-tard/Atelier-Schema.html
                                  l'Atelier (index.html), avec « Exporter pour SEE »
     Seulement-si-je-te-le-demande/
                                  diagnostic.cmd et diagnostic.ps1 (le relevé du
                                  poste), et modules-VBA/ : les trois .bas, le
                                  repli si le classeur était refusé (import à la
                                  main dans l'éditeur VBA)
   Les autres fichiers sont pris tels quels, octet pour octet (les .bas restent
   en Windows-1252 + CRLF, le .ps1 et le LIS-MOI en UTF-8 avec BOM) ; le zip est
   « stocké », écrit par zipDe (src/08-dxf.js), sans dépendance.
   ========================================================================= */
'use strict';
const fs = require('fs'), path = require('path');
const { chargerAtelier } = require('./exporter.js');
const { classeurPilote } = require('./classeur.js');
const RACINE = path.join(__dirname, '..');
const CLASSEUR = 'Pilote-SEE.xlsm';
const SI_DEMANDE = 'Seulement-si-je-te-le-demande/';
const CONTENU = [
  ['LIS-MOI-D-ABORD.txt', 'see/kit/LIS-MOI-D-ABORD.txt'],
  ['Pour-plus-tard/Atelier-Schema.html', 'index.html'],
  [SI_DEMANDE + 'diagnostic.cmd', 'see/diagnostic.cmd'],
  [SI_DEMANDE + 'diagnostic.ps1', 'see/diagnostic.ps1'],
  [SI_DEMANDE + 'modules-VBA/SEE_Commun.bas', 'see/vba/SEE_Commun.bas'],
  [SI_DEMANDE + 'modules-VBA/SEE_Sonde.bas', 'see/vba/SEE_Sonde.bas'],
  [SI_DEMANDE + 'modules-VBA/SEE_Pilote.bas', 'see/vba/SEE_Pilote.bas'],
];
/* Rend { fichiers (dans l'ordre du zip, le classeur d'abord), zip, avertissements (ceux du classeur) }. */
function kit() {
  const A = chargerAtelier(), c = classeurPilote({ dossierVba: path.join(RACINE, 'see', 'vba') });
  const fichiers = [{ nom: 'Kit-SEE/' + CLASSEUR, octets: c.octets },
    ...CONTENU.map(([nom, source]) => ({ nom: 'Kit-SEE/' + nom, octets: new Uint8Array(fs.readFileSync(path.join(RACINE, source))) }))];
  return { fichiers, zip: A('zipDe')(fichiers), avertissements: c.avertissements };
}
if (require.main === module) {
  const arg = process.argv.slice(2).find(a => a.startsWith('--sortie='));
  const sortie = arg ? arg.slice(9) : 'Kit-SEE.zip';
  try {
    const { fichiers, zip, avertissements } = kit();
    fs.writeFileSync(sortie, zip);
    fichiers.forEach(f => console.log(`  ${f.nom.padEnd(64)} ${String(f.octets.length).padStart(9)} octets`));
    console.log(`${sortie} : ${fichiers.length} fichiers, ${zip.length} octets`);
    avertissements.forEach(a => console.warn('AVERTISSEMENT : ' + a));
  } catch (e) { console.error('Erreur : ' + ((e && e.message) || e)); process.exit(1); }
}
module.exports = { kit, CONTENU, CLASSEUR };
