# DESIGN — la direction du site, pour tout le monde (humain ou agent)

Atelier Schéma est un **outil de conception électrique aéronautique de 2027**, hors ligne, dans un seul fichier HTML.
Le lecteur (ingénieur câblage) veut « un vrai outil ELEC, la plus belle expérience utilisateur, les boutons les plus
pertinents, que ça glisse sur les yeux, qu'un BD comprenne tout de suite, que tout soit logique du fil au contact, à la
barrette, au raccord ». Ce document fixe la direction commune ; chaque domaine (le site, les fiches, le disjoncteur,
les contrats déjà faits) la décline dans son propre fichier de style.

## 1. Les principes

1. **Le plan est l'objet.** Tout le reste est un instrument autour de lui : discret, net, jamais devant.
2. **Un coup d'œil, puis un geste.** Chaque écran dit d'abord l'essentiel (une ligne, un chiffre, un état), puis donne
   le détail à qui le demande (déplier, survoler, onglet). Pas de phrase quand un chiffre ou un dessin suffit.
3. **Un langage visuel, pas deux.** Mêmes rayons, mêmes espacements, mêmes couleurs d'état, mêmes composants
   (puce, pastille, carte, liste, onglets, segment) partout. Une donnée (repère, référence, numéro) est en chasse
   fixe ; le langage est en linéale.
4. **Calme.** Une palette de neutres froids, un seul accent (le cuivre du fil), trois couleurs d'état. Pas de dégradé
   décoratif, pas de verre fumé, pas d'ombre lourde. La profondeur vient d'un filet d'un pixel et d'une ombre courte.
5. **Précis comme un plan.** Les dessins techniques (faces de connecteur, modules, courbes) sont à plat, exacts,
   lisibles à 100 % : traits de 1 à 1,5 px, texte avec halo, pas de relief ni de « photo ».
6. **Réactif.** Survoler montre, cliquer fait, glisser règle ; chaque changement se voit tout de suite ; Ctrl+Z défait
   tout. Les transitions durent 120 à 200 ms, jamais plus.
7. **Tout est faisable à la main**, et tout ce que l'outil propose est un choix par défaut qu'on peut remplacer.

## 2. Les jetons (dans `src/style.css`, `:root`) — on les utilise, on ne les redéfinit pas ailleurs

Surfaces et texte (thème clair, le plan blanc sur une table gris très clair) :
```
--s-app      #eef1f5   la table, le fond de l'application
--s-surface  #ffffff   les panneaux, les cartes
--s-sunken   #f5f7fa   une surface en retrait (champs, onglets au repos, en-têtes)
--s-hover    #eceff3   le survol d'une surface
--s-line     #e2e6eb   le filet courant        --s-line-2  #c8cfd8  un filet appuyé
--t-1        #111827   le texte                --t-2  #4b5563  le texte secondaire   --t-3  #8a93a0  le texte effacé
--accent     #b5541c   le cuivre (actions, sélection)   --accent-2 #9a4617 (pressé)   --accent-soft #fbeee4 (fond)
--ok #1a7f4b  --ok-soft #e8f5ee  ·  --warn #b45309  --warn-soft #fdf3e4  ·  --ko #c62828  --ko-soft #fdecec
--info #1f5fbf  --info-soft #e9f0fb
```
Typographie : `--sans` (Inter si présent, sinon Segoe UI / SF / system-ui), `--mono` (JetBrains Mono, SF Mono,
Consolas…). Corps : `--f-11 --f-12 --f-13 --f-14 --f-16 --f-20 --f-28`. Les chiffres sont tabulaires
(`font-variant-numeric: tabular-nums`) partout où ils s'alignent.

Espacements sur une grille de 4 px : `--sp-1` 4, `--sp-2` 8, `--sp-3` 12, `--sp-4` 16, `--sp-5` 24, `--sp-6` 32.
Rayons : `--r-1` 6 px (puces, champs), `--r-2` 10 px (cartes), `--r-3` 14 px (panneaux). Ombres : `--sh-1` (courte,
pour une carte), `--sh-2` (un panneau flottant). Transitions : `--rapide` 120 ms, `--moyen` 200 ms.

Géométrie de la page (le plan se recadre dans ce qui reste) : `--rail` largeur du rail de gauche, `--entete` hauteur
de la barre du haut (0 s'il n'y en a pas), `--insp-l` largeur de l'inspecteur à droite, `--base-h` hauteur du tiroir du
tableau, `--fiche-l` largeur des documents (bible, cartouche).

## 3. Les composants communs (noms de classes, à réutiliser tels quels)

- **Pastille d'état** `.fi-etat.ok|.att|.ko` : ronde, 14 px, avec un symbole ; c'est le seul usage du vert/ambre/rouge
  sur fond pâle. La **route** d'un fil est un trait de 14 × 3 px (`.fi-puce`, `.fi-route`), jamais une pastille ronde.
- **Puce** `.fi-chip` (choix, 30 px de haut) ; **segment** `.dj-chip` (une valeur parmi une gamme, jugée).
- **Carte** `.fi-cadre` (filet 1 px, rayon `--r-2`, rembourrage 12 px) ; **titre de section** `.fi-nomen-t`
  (10 px, capitales espacées, `--t-2`).
- **Faits** `.fi-faits` (`dl` : clé en petites capitales, valeur en linéale, identifiants en chasse fixe).
- **Ligne de fil** `.fi-fil` (grille : contact · route · type · contact à sertir · destination · numéro en retrait).
- **Boutons** : `.btn` (plein, cuivre : l'action principale, un seul par écran), `.btn.papier` (secondaire),
  `.fi-bouton` (dans un pied de fiche), `.fi-lien` (texte, cuivre), `.rd` (rond, icône seule, dans le rail).
- **Icônes** : SVG 24 × 24 en traits de 1,5 px, `stroke: currentColor`, dans `ICONES` (08-fiche) ou en ligne.

## 4. Les règles de fabrication

- Français partout (interface, code, commentaires, commits). Aucune dépendance, aucune police ni ressource réseau.
- Les identifiants et classes que le code et les tests utilisent restent (`#rail`, `#folios`, `#inspecteur`, `#base`,
  `#fiche`, `#relief`, `#toast`, `#q`, `#menu`, `.fi-*`, `.dj-*`, `.cp-*`, `.ix-*`…). On peut ajouter, pas renommer.
- `node construire.js` assemble ; `node construire.js --verif` vérifie ; les batteries sont dans `tests/` (LISEZMOI).
- On regarde son écran avant de livrer : Playwright est là (`NODE_PATH=/opt/node22/lib/node_modules`, chromium
  `/opt/pw-browsers/chromium`) ; `scratchpad/visite2.js` prend une capture par étape.
- On réécrit proprement plutôt que d'empiler ; un fichier se relit de haut en bas, avec un en-tête qui dit pourquoi.
