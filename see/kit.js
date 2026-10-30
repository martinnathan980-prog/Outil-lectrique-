/* ===========================================================================
   LE KIT DU BUREAU — un seul zip à emporter sur le poste où tourne SEE.
       node see/kit.js [--sortie=Kit-SEE.zip] [--vba=DOSSIER] [--sans-bouton]
   Le zip contient, dans un dossier Kit-SEE/, DEUX fichiers :
     Pilote-SEE.xlsm              LE fichier à ouvrir : le classeur pilote, macros
                                  déjà dedans, boutons « 1. TESTER SEE » et
                                  « 2. SEE DESSINE » (écrit à la volée par
                                  see/classeur.js, en tête du zip)
     LIS-MOI-D-ABORD.txt          les étapes, en clair (see/kit/)
   Le kit voyage par courriel, jusqu'à une messagerie d'entreprise : rien dedans
   qu'elle refuse, même dans un zip (ni .cmd, ni .bat, ni .ps1, ni .js, ni .vbs ;
   kit() le vérifie), et rien de plus que ce qui sert ce jour-là : un zip de ces
   deux fichiers est déjà passé. Le reste s'envoie à part, seulement s'il le
   faut : le diagnostic du poste (see/diagnostic.cmd et .ps1), les .bas du
   repli à la main (see/vba), l'Atelier (index.html, une page HTML qu'une
   messagerie d'entreprise peut retenir).
   Le LIS-MOI est pris tel quel, octet pour octet (UTF-8 avec BOM, CRLF) ; le
   zip est « stocké », écrit par zipDe (src/08-dxf.js), sans dépendance.
   Le kit n'existe que pour les boutons du classeur : si une de leurs macros
   manque, il est REFUSÉ comme le classeur (code de sortie 1, aucun zip écrit). --sans-bouton
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
const CONTENU = [
  ['LIS-MOI-D-ABORD.txt', 'see/kit/LIS-MOI-D-ABORD.txt'],
];
/* Ce que les messageries refusent, même dans un zip (Gmail : la liste de ses types bloqués) : le kit n'en a aucun. */
const REFUSES_PAR_COURRIEL = /\.(ade|adp|apk|bat|cab|chm|cmd|com|cpl|dll|exe|hta|ins|isp|jar|jnlp|js|jse|lib|lnk|mde|msc|msi|msp|mst|nsh|pif|ps1|scr|sct|shb|sys|vb|vbe|vbs|vxd|wsc|wsf|wsh)$/i;
/* Rend { fichiers (dans l'ordre du zip, le classeur d'abord), zip, dossier (celui des .bas),
   avertissements (ceux du classeur) }. `o.dossierVba` : le dossier des .bas (défaut : see/vba) ; `o.sansBouton` : voir
   classeurPilote. Lève une exception, comme lui, si la macro du bouton manque. */
function kit(o = {}) {
  const A = chargerAtelier(), c = classeurPilote({ dossierVba: o.dossierVba || path.join(RACINE, 'see', 'vba'), sansBouton: o.sansBouton });
  const fichiers = [{ nom: 'Kit-SEE/' + CLASSEUR, octets: c.octets },
    ...CONTENU.map(([nom, source]) => ({ nom: 'Kit-SEE/' + nom, octets: new Uint8Array(fs.readFileSync(path.join(RACINE, source))) }))];
  const refuses = fichiers.filter(f => REFUSES_PAR_COURRIEL.test(f.nom)).map(f => f.nom);
  if (refuses.length) throw new Error(refuses.join(', ') + ' : la messagerie refuserait le kit (même zippé) ; rien n\'est écrit');
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
module.exports = { kit, CONTENU, CLASSEUR, REFUSES_PAR_COURRIEL };
