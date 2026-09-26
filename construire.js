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
const css  = fs.readFileSync(path.join(SRC, 'style.css'), 'utf8');
const page = fs.readFileSync(path.join(SRC, 'page.html'), 'utf8');
const xlsx = fs.readFileSync(path.join(ICI, 'lib', 'xlsx.min.js'), 'utf8');

const js = modules.map(f => {
  const t = fs.readFileSync(path.join(SRC, f), 'utf8').replace(/^'use strict';\s*$/m, '');
  return `/* ───────── ${f} ───────── */\n${t}`;
}).join('\n');

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Atelier Schéma</title>
<style>
${css}
</style>
</head>
<body>
${page}
<script>
"use strict";
${js}
</script>
<!-- Le lecteur de fichiers Excel (SheetJS) est tout en bas : 624 Ko de
     bibliothèque minifiée, qui n'a rien à faire au milieu du code qu'on relit.
     Embarqué pour que l'outil tienne dans un seul fichier, sans réseau. -->
<script>
${xlsx}
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
console.log('index.html : ' + modules.length + ' modules, ' + Math.round(html.length / 1024) + ' Ko');
