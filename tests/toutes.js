/* ===========================================================================
   TOUTES LES BATTERIES, d'une commande — le verdict de chacune sur une ligne.
       NODE_PATH=/opt/node22/lib/node_modules node tests/toutes.js [moteur|navigateur|nom…]
   Sans argument : tout, le moteur d'abord (sans navigateur), puis les
   batteries à la souris. Avec des noms : celles-là. Le code de sortie est le
   nombre de batteries en échec. Chaque batterie tourne dans son propre
   processus, avec un délai au-delà duquel elle est comptée en échec.
   ========================================================================= */
const { spawnSync } = require('child_process'), path = require('path');
const MOTEUR = ['barrettes', 'references', 'format-retest'];
const NAVIGATEUR = ['disjoncteur', 'interface', 'controle', 'fiche', 'fwd', 'memoire', 'relief', 'retouche', 'affinage', 'couverture', 'normes', 'placement', 'parcours'];
const args = process.argv.slice(2), fs = require('fs');
const voulues = !args.length ? [...MOTEUR, ...NAVIGATEUR] : args.flatMap(a => a === 'moteur' ? MOTEUR : a === 'navigateur' ? NAVIGATEUR : [a]);
const existe = n => fs.existsSync(path.join(__dirname, n + '.js'));
let echecs = 0;
for (const nom of voulues) { if (!existe(nom)) { console.log(`  —      ${nom.padEnd(14)} (pas de fichier)`); continue; }
  const t0 = Date.now(), r = spawnSync(process.execPath, [path.join(__dirname, nom + '.js')], { encoding: 'utf8', timeout: 20 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 });
  const sortie = (r.stdout || '') + (r.stderr || ''), lignes = sortie.trim().split('\n');
  // le verdict : la dernière ligne qui compte (« 222 / 222 contrôles passés », « tout tient », « 2 échec(s) »), sinon le code de sortie
  const bilan = [...lignes].reverse().find(l => /contrôles passés|tout tient|tout est vert|échec|KO|ÉCHEC|Error/.test(l)) || lignes[lignes.length - 1] || '';
  const ko = r.status !== 0 || r.signal || /échec\(s\)|ÉCHEC|\bKO\b|Error/.test(bilan) && !/0 échec|0 KO|tout tient|tout est vert/.test(bilan);
  if (ko) echecs++;
  console.log(`  ${ko ? 'ÉCHEC ' : 'ok    '} ${nom.padEnd(14)} ${String(Math.round((Date.now() - t0) / 1000)).padStart(4)} s   ${bilan.trim().slice(0, 110)}${r.signal ? ' (' + r.signal + ')' : ''}`); }
console.log(`\n  ${voulues.length - echecs} batterie(s) sur ${voulues.length} ${echecs ? '— ' + echecs + ' en échec' : '— tout est vert'}`);
process.exit(echecs);
