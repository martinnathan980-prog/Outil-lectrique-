# Brief commun — Volta v72 (lis-le en entier avant de toucher à quoi que ce soit)

## Le projet
**Volta** (le dépôt de ton répertoire de travail, une copie de `/home/user/Outil-lectrique-`) : un outil de conception
électrique aéronautique (hélicoptères) HORS LIGNE, un seul fichier `index.html` assemblé par `node construire.js` à partir
de `src/` (modules `NN-*.js` concaténés dans l'ordre : 01–06 et 09-* = le MOTEUR, 08-* et 10-* = l'interface ;
`src/page.html` = la page ; `src/style.css` = les jetons et le site, `src/style-*.css` = un domaine chacune) et de
`normes/*.csv`. Il lit un RETEST Excel (la liste des liaisons d'un harness : Device1/Pin1 ↔ Device2/Pin2, câble, type…),
dessine les folios, et pour chaque élément cliqué ouvre une FICHE (l'inspecteur). Il juge tout contre des normes
embarquées. L'utilisateur est un ingénieur câblage, sur ORDINATEUR (1440 × 900 et 1920 × 1080). Lis `DESIGN.md` (la
direction visuelle actuelle, « Graphite 2027 ») et `CE-QUI-MANQUE.md` (l'état des données).

## Les règles (non négociables)
1. **100 % hors ligne.** Aucune requête réseau à l'exécution : toute bibliothèque est EMBARQUÉE dans `index.html`
   (inline), avec sa licence. Pendant le développement, tu peux télécharger (npm, sites publics).
2. **Confidentialité.** Les fichiers du lecteur (ses retests, ses PDF, sa base « SEE ») ne quittent JAMAIS son PC et ne
   viennent jamais ici : tu travailles sur des données inventées ou publiques. Jamais « SEE » dans une recherche web,
   jamais un nom de programme, d'appareil ou de client.
3. **Français partout** (interface, code, commentaires, commit). Le style du code existant : un commentaire d'en-tête qui
   dit POURQUOI, des lignes denses, des noms français. Les identifiants, classes et attributs que le code et les tests
   utilisent restent (ajouter oui, renommer non — sauf si ton brief le permet, et alors tu mets les tests à jour).
4. **Jamais d'identifiant de modèle d'IA** dans un fichier du dépôt.
5. **Construis et REGARDE ton écran**, avant et après chaque étape : `node construire.js`, puis Playwright
   (`NODE_PATH=/opt/node22/lib/node_modules`, `chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })`, page
   `file://<ton répertoire>/index.html`, attendre `typeof atelier !== 'undefined'`, puis `atelier.exemple()` pour
   l'exemple embarqué : 6 folios). Raccourcis : `allerAuPlan('3'); choisirBloc(app.dessin.comps.find(k => k.name ===
   '300XC1' && k.kind !== 'tag'))` (102CB1 disjoncteur f.1, 300XC1 connecteur f.3, 668VT31 barrette f.3, 412VC3B prise
   f.5) ; un câble `choisirFil(app.dessin.fils.find(w => w.cable === 'W-012'))` ; `basculerIndex()` ;
   `ouvrirBase('moitie')` ; `ficheFichiers()`, `ficheNormes()`, `ficheBible()` ; `montrerBibliotheque('racine')`.
   Lis vraiment chaque capture (Read sur le png), en clair ET en sombre.
6. **Les batteries** : `NODE_PATH=/opt/node22/lib/node_modules node tests/toutes.js` (18 batteries, ~20 min — lance-la en
   arrière-plan) ; une seule : `node tests/<nom>.js`. Elles doivent passer avant que tu rendes. Tu peux AJOUTER des
   contrôles ; tu peux modifier un contrôle quand ton changement le rend obsolète — en le disant dans ton rapport.
7. **À la fin** : `git checkout -- index.html` (le livrable est reconstruit par l'intégrateur), `git add` tes fichiers,
   UN commit en français (un titre d'une ligne, un corps qui dit ce qui a changé et pourquoi), terminé EXACTEMENT par :
   `Co-Authored-By: …` (la ligne de co-auteur demandée par la session)
   `Claude-Session: https://claude.ai/code/session_01SJNARvo3EkMZ1PC61moyNM`
   Puis un RAPPORT court : ta branche et ton répertoire, ce que tu as fait, ce que tu n'as pas pu faire, les batteries
   passées, les chemins de tes captures les plus parlantes.
