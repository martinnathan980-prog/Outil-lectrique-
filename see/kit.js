/* ===========================================================================
   LES KITS DU BUREAU — chacun un seul zip, qui voyage par courriel.
       node see/kit.js [--sortie=Kit-SEE.zip] [--vba=DOSSIER] [--sans-bouton]
       node see/kit.js --pdf [--sortie=Kit-PDF.zip]
   KIT SEE. Le zip contient, dans un dossier Kit-SEE/, DEUX fichiers :
     Pilote-SEE.xlsm              LE fichier à ouvrir : le classeur pilote, macros
                                  déjà dedans, boutons « 1. TESTER SEE »,
                                  « 2. SEE DESSINE » et « 3. SEE FERMÉ » (écrit
                                  à la volée par see/classeur.js, en tête du zip)
     LIS-MOI-D-ABORD.txt          les étapes, en clair (see/kit/)
   KIT PDF (--pdf). Le zip contient, dans un dossier Kit-PDF/, DEUX fichiers et
   un dossier vide :
     sonde_pdf.py                 la sonde PDF (see/pdf/), qui se lance d'un
                                  double-clic : elle lit le dossier PDF-A-LIRE
     LIS-MOI-D-ABORD.txt          les étapes, en clair (see/pdf/kit/)
     PDF-A-LIRE/                  vide : on y copie les 2 ou 3 plans à relever
   Pas de sonde-pdf.bat : la messagerie le refuserait ; il reste dans le dépôt
   pour une sonde qui arrive autrement (clé USB, partage réseau).
   Les kits voyagent par courriel, jusqu'à une messagerie d'entreprise : rien
   dedans qu'elle refuse, même dans un zip (ni .cmd, ni .bat, ni .ps1, ni .js,
   ni .vbs, ni le reste de la liste de Gmail : REFUSES_PAR_COURRIEL ; kit() et
   kitPdf() le vérifient), et rien de plus que ce qui sert ce jour-là : un zip
   d'un .xlsm et d'un .txt est déjà passé ; le .py n'est pas sur la liste de
   Gmail. Le reste s'envoie à part, seulement s'il le faut : le diagnostic du
   poste (see/diagnostic.cmd et .ps1), les .bas du repli à la main (see/vba),
   l'Atelier (index.html, une page HTML qu'une messagerie d'entreprise peut
   retenir).
   Les LIS-MOI et la sonde sont pris tels quels, octet pour octet (UTF-8 avec
   BOM, CRLF pour les LIS-MOI) ; le zip est « stocké », écrit par zipDe
   (src/08-dxf.js), sans dépendance.
   Le kit SEE n'existe que pour les boutons du classeur : si une de leurs macros
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
/* Le kit PDF : la sonde, puis son LIS-MOI ; et le dossier vide que la sonde lit d'un double-clic (DOSSIER_A_LIRE de
   sonde_pdf.py, le même nom). */
const CONTENU_PDF = [
  ['sonde_pdf.py', 'see/pdf/sonde_pdf.py'],
  ['LIS-MOI-D-ABORD.txt', 'see/pdf/kit/LIS-MOI-D-ABORD.txt'],
];
const DOSSIER_A_LIRE = 'PDF-A-LIRE';
/* Ce que les messageries refusent, même dans un zip (Gmail : la liste de ses types bloqués) : aucun kit n'en a. */
const REFUSES_PAR_COURRIEL = /\.(ade|adp|apk|appx|appxbundle|bat|cab|chm|cmd|com|cpl|diagcab|diagcfg|diagpack|dll|dmg|ex_|exe|hta|img|ins|isp|iso|jar|jnlp|js|jse|lib|lnk|mde|msc|msi|msix|msixbundle|msp|mst|nsh|pif|ps1|scr|sct|shb|sys|vb|vbe|vbs|vhd|vxd|wsc|wsf|wsh|xll)$/i;
/* Lève une exception (rien n'est écrit) si un fichier est d'un type que la messagerie refuse. */
function refuserCourriel(fichiers, kitNom) {
  const refuses = fichiers.filter(f => REFUSES_PAR_COURRIEL.test(f.nom)).map(f => f.nom);
  if (refuses.length) throw new Error(refuses.join(', ') + ' : la messagerie refuserait ' + kitNom + ' (même zippé) ; rien n\'est écrit'); }
/* Rend { fichiers (dans l'ordre du zip, le classeur d'abord), zip, dossier (celui des .bas),
   avertissements (ceux du classeur) }. `o.dossierVba` : le dossier des .bas (défaut : see/vba) ; `o.sansBouton` : voir
   classeurPilote. Lève une exception, comme lui, si la macro du bouton manque. */
function kit(o = {}) {
  const A = chargerAtelier(), c = classeurPilote({ dossierVba: o.dossierVba || path.join(RACINE, 'see', 'vba'), sansBouton: o.sansBouton });
  const fichiers = [{ nom: 'Kit-SEE/' + CLASSEUR, octets: c.octets },
    ...CONTENU.map(([nom, source]) => ({ nom: 'Kit-SEE/' + nom, octets: new Uint8Array(fs.readFileSync(path.join(RACINE, source))) }))];
  refuserCourriel(fichiers, 'le kit');
  return { fichiers, zip: A('zipDe')(fichiers), dossier: c.dossier, avertissements: c.avertissements };
}
/* Le kit PDF : rend { fichiers (dans l'ordre du zip), dossiers (le dossier vide, en dernier dans le zip), zip }.
   `o.contenu` : une autre liste [nom, source] (les tests y glissent un .bat, qui doit être refusé). Lève une exception
   si un fichier est d'un type refusé par courriel. */
function kitPdf(o = {}) {
  const A = chargerAtelier();
  const fichiers = (o.contenu || CONTENU_PDF).map(([nom, source]) => ({ nom: 'Kit-PDF/' + nom, octets: new Uint8Array(fs.readFileSync(path.join(RACINE, source))) }));
  refuserCourriel(fichiers, 'le kit PDF');
  const dossiers = ['Kit-PDF/' + DOSSIER_A_LIRE + '/'];
  return { fichiers, dossiers, zip: A('zipDe')([...fichiers, ...dossiers.map(nom => ({ nom, octets: new Uint8Array(0) }))]) };
}
if (require.main === module) {
  const args = process.argv.slice(2), valeur = cle => { const a = args.find(x => x.startsWith(cle)); return a ? a.slice(cle.length) : ''; };
  const pdf = args.includes('--pdf'), sortie = valeur('--sortie=') || (pdf ? 'Kit-PDF.zip' : 'Kit-SEE.zip'), vba = valeur('--vba=');
  try {
    if (pdf) {
      if (vba || args.includes('--sans-bouton')) throw new Error('--vba= et --sans-bouton ne servent qu\'au kit SEE, pas au kit PDF (--pdf)');
      const { fichiers, dossiers, zip } = kitPdf();
      fs.writeFileSync(sortie, zip);
      fichiers.forEach(f => console.log(`  ${f.nom.padEnd(64)} ${String(f.octets.length).padStart(9)} octets`));
      dossiers.forEach(d => console.log(`  ${d.padEnd(64)} (dossier vide)`));
      console.log(`${sortie} : ${fichiers.length} fichiers et le dossier ${DOSSIER_A_LIRE}, ${zip.length} octets`);
    } else {
      const { fichiers, zip, dossier, avertissements } = kit({ dossierVba: vba ? path.resolve(vba) : '', sansBouton: args.includes('--sans-bouton') });
      fs.writeFileSync(sortie, zip);
      fichiers.forEach(f => console.log(`  ${f.nom.padEnd(64)} ${String(f.octets.length).padStart(9)} octets`));
      const relatif = path.relative(process.cwd(), dossier), affiche = relatif && !relatif.startsWith('..') && !path.isAbsolute(relatif) ? relatif : dossier;
      console.log(`${sortie} : ${fichiers.length} fichiers, ${zip.length} octets ; modules VBA pris dans ${affiche}`);
      avertissements.forEach(a => console.warn('AVERTISSEMENT : ' + a + ' — CE KIT NE DOIT PAS PARTIR AU BUREAU'));
    }
  } catch (e) {
    console.error('Erreur : ' + ((e && e.message) || e));
    if (fs.existsSync(sortie)) console.error(`(${sortie} n'est pas réécrit : celui qui est là est un ancien, pas à jour.)`);
    process.exit(1);
  }
}
module.exports = { kit, kitPdf, CONTENU, CONTENU_PDF, DOSSIER_A_LIRE, CLASSEUR, REFUSES_PAR_COURRIEL };
