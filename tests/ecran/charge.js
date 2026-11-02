/* Charger index.html : aucune erreur au démarrage, ni à l'ouverture de l'exemple.  node tests/ecran/charge.js */
const { ouvrir, exemple } = require('./commun');
(async () => { const { b, p, erreurs } = await ouvrir(); await exemple(p); await b.close();
  console.log(erreurs.length ? 'ÉCHEC — ' + erreurs.length + ' erreur(s)\n' + erreurs.join('\n') : 'chargée — aucune erreur'); process.exit(erreurs.length ? 1 : 0); })();
