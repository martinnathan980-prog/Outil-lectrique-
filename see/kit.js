/* ===========================================================================
   LE KIT DU BUREAU — un seul zip à emporter sur le poste où tourne SEE.
       node see/kit.js [--sortie=Kit-SEE.zip] [--vba=DOSSIER] [--sans-bouton]
   Le zip contient, dans un dossier Kit-SEE/ :
     Pilote-SEE.xlsm              LE fichier à ouvrir : le classeur pilote, macros
                                  déjà dedans, bouton « TESTER SEE » (écrit à la
                                  volée par see/classeur.js, en tête du zip)
     LIS-MOI-D-ABORD.txt          les étapes, en clair (see/kit/)
     Pour-plus-tard/Atelier-Schema.html
                                  l'Atelier (index.html), avec « Exporter pour SEE »
     Seulement-si-je-te-le-demande/
                                  diagnostic.cmd et diagnostic.ps1 (le relevé du
                                  poste), et modules-VBA/ : les .bas, le repli si
                                  le classeur était refusé (import à la main dans
                                  l'éditeur VBA) ; ce sont les octets mêmes des
                                  modules mis dans le classeur
   Les autres fichiers sont pris tels quels, octet pour octet (les .bas restent
   en Windows-1252 + CRLF, le .ps1 et le LIS-MOI en UTF-8 avec BOM) ; le zip est
   « stocké », écrit par zipDe (src/08-dxf.js), sans dépendance.
   Le kit n'existe que pour le bouton TESTER SEE : si sa macro manque, il est
   REFUSÉ comme le classeur (code de sortie 1, aucun zip écrit). --sans-bouton
   l'écrit quand même, pour un essai ici, jamais pour le bureau. Les modules
   viennent de see/vba, sans regarder VBA_DOSSIER (une copie d'essai ne doit
   pas partir au bureau par mégarde) ; --vba=DOSSIER en prend d'autres, et la
   commande le dit.
   ========================================================================= */
'use strict';
const fs = require('fs'), path = require('path');
const { chargerAtelier } = require('./exporter.js');
const { classeurPilote } = require('./classeur.js');
const RACINE = path.join(__dirname, '..');
const CLASSEUR = 'Pilote-SEE.xlsm';
const SI_DEMANDE = 'Seulement-si-je-te-le-demande/', REPLI_VBA = SI_DEMANDE + 'modules-VBA/';
const CONTENU = [
  ['LIS-MOI-D-ABORD.txt', 'see/kit/LIS-MOI-D-ABORD.txt'],
  ['Pour-plus-tard/Atelier-Schema.html', 'index.html'],
  [SI_DEMANDE + 'diagnostic.cmd', 'see/diagnostic.cmd'],
  [SI_DEMANDE + 'diagnostic.ps1', 'see/diagnostic.ps1'],
];
/* Rend { fichiers (dans l'ordre du zip, le classeur d'abord, les .bas de repli à la fin), zip, dossier (celui des .bas),
   avertissements (ceux du classeur) }. `o.dossierVba` : le dossier des .bas (défaut : see/vba) ; `o.sansBouton` : voir
   classeurPilote. Lève une exception, comme lui, si la macro du bouton manque. */
function kit(o = {}) {
  const A = chargerAtelier(), c = classeurPilote({ dossierVba: o.dossierVba || path.join(RACINE, 'see', 'vba'), sansBouton: o.sansBouton });
  const fichiers = [{ nom: 'Kit-SEE/' + CLASSEUR, octets: c.octets },
    ...CONTENU.map(([nom, source]) => ({ nom: 'Kit-SEE/' + nom, octets: new Uint8Array(fs.readFileSync(path.join(RACINE, source))) })),
    ...c.modules.filter(m => !m.document).map(m => ({ nom: 'Kit-SEE/' + REPLI_VBA + m.nom + '.bas', octets: m.texte }))];
  return { fichiers, zip: A('zipDe')(fichiers), dossier: c.dossier, avertissements: c.avertissements };
}
if (require.main === module) {
  const args = process.argv.slice(2), valeur = cle => { const a = args.find(x => x.startsWith(cle)); return a ? a.slice(cle.length) : ''; };
  const sortie = valeur('--sortie=') || 'Kit-SEE.zip', vba = valeur('--vba=');
  try {
    const { fichiers, zip, dossier, avertissements } = kit({ dossierVba: vba ? path.resolve(vba) : '', sansBouton: args.includes('--sans-bouton') });
    fs.writeFileSync(sortie, zip);
    fichiers.forEach(f => console.log(`  ${f.nom.padEnd(64)} ${String(f.octets.length).padStart(9)} octets`));
    const relatif = path.relative(process.cwd(), dossier), affiche = relatif && !relatif.startsWith('..') && !path.isAbsolute(relatif) ? relatif : dossier;
    console.log(`${sortie} : ${fichiers.length} fichiers, ${zip.length} octets ; modules VBA pris dans ${affiche}`);
    avertissements.forEach(a => console.warn('AVERTISSEMENT : ' + a + ' — CE KIT NE DOIT PAS PARTIR AU BUREAU'));
  } catch (e) {
    console.error('Erreur : ' + ((e && e.message) || e));
    if (fs.existsSync(sortie)) console.error(`(${sortie} n'est pas réécrit : celui qui est là est un ancien, pas à jour.)`);
    process.exit(1);
  }
}
module.exports = { kit, CONTENU, CLASSEUR, REPLI_VBA };
