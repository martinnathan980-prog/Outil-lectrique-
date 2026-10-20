#!/usr/bin/env node
/* ===========================================================================
   CONSTRUIRE — assemble index.html à partir de src/ et lib/.

       node construire.js            écrit index.html
       node construire.js --verif    vérifie seulement que index.html est à jour

   Aucune dépendance : on concatène, dans l'ordre des noms de fichiers.
   Le livrable reste UN fichier hors ligne ; on développe en modules parce
   qu'un fichier de six mille lignes ne se relit pas.
   =========================================================================== */
const fs = require('fs');
const path = require('path');

const ICI = __dirname;
const SRC = path.join(ICI, 'src');
const modules = fs.readdirSync(SRC).filter(f => /^\d\d-.*\.js$/.test(f)).sort();
// les feuilles de style : style.css (les jetons et le site) d'abord, puis style-*.css (un domaine chacune), dans l'ordre des noms
const css  = ['style.css', ...fs.readdirSync(SRC).filter(f => /^style-.*\.css$/.test(f)).sort()].map(f => `/* ───────── ${f} ───────── */\n` + fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
const page = fs.readFileSync(path.join(SRC, 'page.html'), 'utf8');
/* LES POLICES, embarquées : polices/<famille>-<sous-ensemble>-<graisse>-<style>.woff2 devient une @font-face en data:
   URI — aucune police réseau, l'outil reste un fichier hors ligne (polices/LISEZMOI.md). Inter pour le texte et les
   titres, JetBrains Mono pour les identifiants. Le sous-ensemble « latin » porte le texte ; « grec » (Ω Δ φ ρ…) ne se
   charge que pour ses caractères (unicode-range) : un mΩ/m reste dans la police de la phrase ; les flèches et les
   signes (→ ⇄ √ ≤ ≥ ≈ ∞ ✓), qu'Inter et JetBrains Mono n'ont pas dans ces sous-ensembles, viennent du sous-ensemble
   « symboles » d'IBM Plex, la police suivante de la pile. */
const POLICES = path.join(ICI, 'polices'), FAMILLES = { 'inter': 'Inter', 'jetbrains-mono': 'JetBrains Mono', 'ibm-plex-sans': 'IBM Plex Sans', 'ibm-plex-mono': 'IBM Plex Mono' };
const PLAGES = { latin: '', symboles: 'U+2190-2194,U+21B6,U+21C4,U+2212,U+221A,U+221E,U+2248,U+2260,U+2264-2265,U+2713', grec: 'U+0394,U+03A3,U+03A6,U+03A9,U+03BB,U+03C0,U+03C1,U+03C6' };
const polices = fs.existsSync(POLICES) ? fs.readdirSync(POLICES).filter(f => /\.woff2$/.test(f)).sort().map(f => {
  const m = /^(.+)-(latin|symboles|grec)-(\d{3})-(normal|italic)\.woff2$/.exec(f); if (!m || !FAMILLES[m[1]]) return '';
  return `@font-face{font-family:"${FAMILLES[m[1]]}";font-style:${m[4]};font-weight:${m[3]};font-display:swap;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(POLICES, f)).toString('base64')}) format("woff2")${PLAGES[m[2]] ? ';unicode-range:' + PLAGES[m[2]] : ''}}`;
}).filter(Boolean).join('\n') : '';
const xlsx = fs.readFileSync(path.join(ICI, 'lib', 'xlsx.min.js'), 'utf8');
/* LES BIBLIOTHÈQUES DE vendor/, embarquées avec leur licence (vendor/LICENCE-*.txt) : pdf.js (Mozilla, Apache-2.0 —
   pdfjs-dist 3.11.174, build UMD) lit les PDF de schéma (08-pdf, 09-pdf). Son « worker » est rangé en TEXTE, dans un
   <script type="text/plain"> que rien n'exécute : la page en fait une Blob URL au premier PDF ouvert — aucun fichier à
   côté, aucune requête. Un « </script » dans une bibliothèque fermerait sa balise : il s'échappe. */
const VENDOR = path.join(ICI, 'vendor');
const vendor = f => fs.existsSync(path.join(VENDOR, f)) ? fs.readFileSync(path.join(VENDOR, f), 'utf8').replace(/<\/script/gi, '<\\/script') : '';
const pdfjs = vendor('pdf.min.js'), pdfjsWorker = vendor('pdf.worker.min.js');
/* fflate (MIT, vendor/LICENCE-fflate.txt — 0.8.2, build UMD) ouvre et écrit les fichiers Visio (.vsdx : un zip d'XML ;
   08-visio, 09-visio), en synchrone : 33 Ko, aucun Worker. */
const fflate = vendor('fflate.min.js');
// les normes embarquées : tous les CSV de normes/, à la suite — la norme livrée est un exemple (normes/LISEZMOI.md)
const NORMES = path.join(ICI, 'normes');
const normes = fs.existsSync(NORMES) ? fs.readdirSync(NORMES).filter(f => /\.csv$/i.test(f)).sort().map(f => fs.readFileSync(path.join(NORMES, f), 'utf8')).join('\n\n') : '';

const lire = f => `/* ───────── ${f} ───────── */\n` + fs.readFileSync(path.join(SRC, f), 'utf8').replace(/^'use strict';\s*$/m, '');
/* Le MOTEUR (01 à 06 : modèle, lecture, graphe, placement, routage, dessin ; 09 : barrettes et connecteurs, que le
   modèle lit) a son propre <script id="moteur"> : la page en refait un Worker pour la recherche profonde, en arrière-plan
   (08, `affinage`). Sa version — une empreinte de son code — dit si un dessin gardé d'une session précédente vient de ce
   moteur-ci. Rien de ce qu'il contient ne touche à la page. */
const DU_MOTEUR = /^0[1-69]-/;
const moteur = modules.filter(f => DU_MOTEUR.test(f)).map(lire).join('\n');
const interfaceJs = modules.filter(f => !DU_MOTEUR.test(f)).map(lire).join('\n');
const VERSION = require('crypto').createHash('sha1').update(moteur).digest('hex').slice(0, 12);

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Volta</title>
<style>
/* ───────── polices/ (embarquées) ───────── */
${polices}
${css}
</style>
</head>
<body>
${page}
<script id="moteur">
"use strict";
const VERSION_MOTEUR = '${VERSION}';
${moteur}
</script>
<script>
"use strict";
const NORME_EMBARQUEE = ${JSON.stringify(normes)};
${interfaceJs}
</script>
<!-- Le lecteur de fichiers Excel (SheetJS) est tout en bas : 624 Ko de
     bibliothèque minifiée, qui n'a rien à faire au milieu du code qu'on relit.
     Embarqué pour que l'outil tienne dans un seul fichier, sans réseau. -->
<script>
${xlsx}
</script>
<!-- Le lecteur de PDF (pdf.js, Mozilla, Apache-2.0 : vendor/LICENCE-pdfjs.txt), en bas lui aussi ; son worker est du
     texte, que 08-pdf lance d'une Blob URL quand un PDF s'ouvre. -->
<script>
${pdfjs}
</script>
<script type="text/plain" id="pdfjs-worker">
${pdfjsWorker}
</script>
<!-- Le zip des fichiers Visio (fflate, MIT : vendor/LICENCE-fflate.txt) : 08-visio ouvre un .vsdx et en écrit un. -->
<script>
${fflate}
</script>
</body>
</html>
`;

const cible = path.join(ICI, 'index.html');
if (process.argv.includes('--verif')) {
  const actuel = fs.existsSync(cible) ? fs.readFileSync(cible, 'utf8') : '';
  if (actuel !== html) { console.error('index.html n’est pas à jour : lance `node construire.js`'); process.exit(1); }
  console.log('index.html à jour'); process.exit(0);
}
fs.writeFileSync(cible, html);
console.log('index.html : ' + modules.length + ' modules, ' + Math.round(html.length / 1024) + ' Ko' + (normes ? ', normes embarquées' : ''));
