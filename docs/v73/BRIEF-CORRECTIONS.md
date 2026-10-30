# Brief des corrections v73 — sublimer Nuit bleue (lis-le en entier, puis le brief commun v72 qu'il complète)

## Le contexte en une page
Le lecteur (ingénieur câblage aéronautique) a demandé le 29 octobre 2026 de « regarder toute l'expérience
utilisateur, dans l'ultra détail, plus que Steve Jobs pour Apple ». Il met la priorité sur la BEAUTÉ (« comme l'écran
d'accueil d'un iPhone, stylisé, travaillé »). Il veut aussi que tout soit compréhensible, fluide, accessible, sans
question à se poser. Il a choisi :
- **on garde l'identité « Nuit bleue » et on la sublime** ;
- **sans compter l'effort**.

Ses deux exemples :
- le fond est statique, sauf la lumière qui suit la souris : il doit bouger un peu ;
- sur un disjoncteur, il ne peut choisir que les calibres du dessus, pas ceux du dessous : il doit TOUT pouvoir
  sélectionner.

Un panel de quatre personas a joué tout l'outil. Leurs rapports, à lire en entier pour ton domaine, sont dans
`/tmp/claude-0/-home-user-Outil-lectrique-/d44a74ef-5d4e-5d70-aef6-303c6243d2ca/scratchpad/v73/panel/` :
- `technicien/RAPPORT.md` : Karim, novice pressé ;
- `ingenieur/RAPPORT.md` : l'expert exigeant, c'est le lecteur ;
- `designer/RAPPORT.md` : les spécifications prêtes à coder (§ 5), le fond vivant (§ 6), les trois moments signature
  (§ 4) ; ses maquettes et planches sont dans `designer/maquettes/` et `designer/planches/` ;
- `ergonome/RAPPORT.md` : les chiffres, avec la batterie `tests/ux.js` dans le dépôt.

Leurs notes d'aujourd'hui :

| | beauté | clarté | fluidité | plaisir |
|---|---|---|---|---|
| technicien | 8 | 6 | 7 | 7 |
| ingénieur | 7,5 | 6 | 7 | 6,5 (confiance 5,5) |
| designer | 6,5 | 7 | 7 | 5 |
| ergonome | 7 | 6 | 7 | 6 |

**Le but : 9 partout.** Le panel rejugera après tes corrections.

## Le socle déjà posé (commits 2ae0629 et 66059fc, sur la branche)
Dans `src/style.css`, à utiliser, ne pas redéfinir :
- les courbes `--courbe-entree`, `--courbe-sortie`, `--courbe-glisse` et les durées `--d-instant` … `--d-trace` ;
- `--decale`, `--monte`, `--glisse`, `--presse`, `--bulle-chaude`, et les tailles `--f-15`, `--f-34`, `--f-44` ;
- les encres de la table : `--t-table-ko`, `--pastille-ko`, `--pastille-ko-t`, `--kbd-clair-t`, `--kbd-clair-fond`,
  `--halo-geste` ;
- l'anneau de focus unique `--anneau-c` (encre sur le clair, glace sur la nuit) ;
- les chiffres tabulaires réservés aux colonnes ;
- UNE règle d'entrée : `@keyframes entre` et `.entre-v` (avec `--k`, `--entre-x`, `--entre-y`). Remplace par elle les
  `@keyframes` d'entrée de tes fichiers quand c'est possible.

## Les règles du brief commun v72 tiennent toutes
`/tmp/claude-0/-home-user-Outil-lectrique-/d44a74ef-5d4e-5d70-aef6-303c6243d2ca/scratchpad/v72/BRIEF-COMMUN.md` :
- hors ligne ;
- confidentialité ;
- français partout, et l'outil VOUVOIE ;
- pas d'identifiant de modèle d'IA dans le dépôt ;
- construire et REGARDER chaque écran, en 1440 et 1920, en clair et en sombre ;
- les batteries ;
- le commit signé.

Et de l'audit v72 :
- à l'écran on dit « câble », jamais « fil » ;
- pas de `confirm()` ni d'`alert()` : on fait, puis « Rétablir » ;
- `data-bulle`, pas `title=`.

## Les fichiers : chacun les siens
Tu travailles dans ton worktree. Ta base est la branche `claude/schematic-generator-tool-hih0lj` à jour. **Tu ne
modifies que les fichiers et les fonctions de ton domaine** : la liste est plus bas. Un changement ailleurs va dans ton
rapport, section « Demandes aux autres domaines », avec le fichier, la fonction et le code exact proposé. Les tests :
tu mets à jour ceux que ton changement rend obsolètes, en le disant, et tu en AJOUTES pour ce que tu crées.
`tests/ux.js` est le juge commun. Tu n'y touches que pour corriger un faux positif prouvé (dis-le). Lance-la sur ton
domaine (lis son en-tête pour ses options) : chaque défaut de ton domaine qu'elle relève doit disparaître.

### A1 — La table vivante et l'accueil
- **Fichiers** : `src/08-table.js`, `src/style-table.css`, `src/08-bibliotheque.js`, `src/style-bibliotheque.css` ;
  dans `src/page.html`, seulement le bloc de la bibliothèque et de l'accueil.
- **À faire** :
  - La table vivante, spécification du designer § 6, codée et mesurée dans `designer/maquettes/accueil-vivant.html` :
    - deux nappes qui dérivent (47 s et 61 s, translation seule) ;
    - la lueur sur ressort, qui révèle la grille ;
    - le courant ;
    - la veille à 90 s, la page cachée qui arrête tout, l'attente pendant un geste ;
    - `prefers-reduced-motion` : tout figé.

    Mesure le coût, comme le designer : moins de 2,5 % au repos, 60 images/s.
  - L'accueil (§ 5.5) : la vitrine. Pile, titre, chapeau, deux gestes, une ligne, et le dock de verre. Il se pose en
    cascade (`.entre-v`), puis les fils de la vignette se tracent. On retire l'encadré pointillé, l'intertitre
    « Pour essayer » et la phrase de la base (elle part dans la bulle de sa tuile).
  - La bibliothèque pleine (§ 5.6) : la tête, « Reprendre » en verre, les cartes en grille, la pile qui s'évente au
    survol.
  - Les encres à même la table : « 5 problèmes » en `--t-table-ko`, la touche Ctrl+O lisible, le survol du geste clair
    (`--halo-geste`).
  - Le mot de la base qui se pose sur le titre (l'ergonome, point 10).
  - Les points P1, P2 et P3 des quatre rapports sur l'accueil, la bibliothèque, une installation et l'ouverture d'un
    retest.

### A2 — Le chrome et les gestes communs
- **Fichiers** :
  - `src/style.css` (hors des jetons du socle, que tu peux compléter) et `src/08-menu.js` ;
  - dans `src/page.html` : la barre du haut, le rail, la barre des folios, le menu ⋮ et la feuille des raccourcis ;
  - dans `src/08-interface.js`, ces sections seulement :
    - « l'ATTENTE » ;
    - « historique et enregistrement » ;
    - « ce que le menu et le rail affichent » ;
    - « le menu ⋮ » ;
    - « LA FEUILLE DES RACCOURCIS » ;
    - « tout relier », sauf la recherche ;
    - `dire()` et le toast.
- **À faire** :
  - **Refaire** :
    - une vraie pile refaire ;
    - Ctrl+Y et Ctrl+Maj+Z REFONT, jamais ne défont ;
    - un ↷ dans le rail, à côté du ↶, éteint quand la pile est vide ;
    - le mot qui passe dit l'état d'arrivée (« Défait : W-012 revient en DR20 ») et offre « Refaire ».

    Le technicien, point 3.
  - **Le rail** se déplie au survol prolongé (250 ms) : 44 → 176 px, chaque icône suivie de son mot et de sa touche ; il
    se replie dès qu'on clique. De nouvelles icônes : « Ajouter une liaison » (deux bornes reliées et un +) et « Bible »
    (le symbole de la barrette). La bulle de la pastille dit « 4 problèmes · 8 à voir ». Technicien, point 6.
  - **Les compteurs de problèmes**, une seule règle partout :
    - « problème » = rouge seulement, « à voir » = ambre, séparés par « · » ;
    - la pastille du rail = les problèmes rouges du PLAN ;
    - P parcourt d'abord les problèmes (« Problème 1 / 4 ») puis les points à voir (« À voir 1 / 8 »).

    Technicien, point 5. La source unique du compte est dans 08-controle (domaine C) : lis-la, ne la double pas.
  - **Le retest corrigé, le vrai livrable, devient visible** :
    - dans ⋮ › Exporter, il passe en PREMIÈRE ligne avec son compte (« 3 liaisons modifiées »), séparé des formats de
      dessin par un filet ;
    - dès qu'un plan venu d'un retest porte un changement, une pilule de verre dans la barre du haut : « 3 changements ·
      Retest corrigé ».

    Le relevé avant l'enregistrement est du domaine C (`exporterRetestCorrige`) : la pilule l'appelle. Technicien,
    point 4.
  - **Les bulles du chrome** (rail, barre, folios, menu) :
    - la première paraît après 400 ms, les suivantes tout de suite pendant `--bulle-chaude` ;
    - elles paraissent AU CLAVIER ;
    - elles s'éteignent au `pointerdown` ;
    - la bulle « Bibliothèque » de la marque ne tombe plus sur le rail.
  - **Les mouvements du chrome**, designer § 5.4 :
    - le menu tombe de son bouton (200 ms) et se ferme en 120 ms ;
    - le toast entre en 340 ms et sort en 200 ms ;
    - un bouton pressé : `scale(var(--presse))` 90 ms.
  - **La feuille des raccourcis** dit tout : refaire, Ctrl+K (la palette du domaine D), les touches de la fiche s'il y en
    a. Tab ne doit plus en sortir.
  - Tous les points des quatre rapports et de `tests/ux.js` sur la barre du haut, le rail, la barre des folios, le menu,
    les raccourcis, le toast et les attentes.

### B — Les fiches (la carte flottante et le volet)
- **Fichiers** :
  - `src/08-fiche.js`, avec le système de bulles `montrerBulle` / `lierBulles` qu'il héberge pour tout l'outil ;
  - `src/08-disjoncteurs.js`, `src/08-sections.js`, `src/08-carte.js`, `src/08-courbe-dj.js`, `src/08-modules.js`,
    `src/08-relief.js` ;
  - `src/style-fiche.css`, `src/style-sections.css`, `src/style-carte.css`, `src/style-relief.css`.
- **À faire** :
  - **Le calibre, le défaut du lecteur, moment signature n° 2.** Chaque cran du cadran est un bouton, de 28 px au moins.
    Sa bulle dit son verdict et son pourquoi chiffré (« 5 A — déclencherait au démarrage : 9,31 A pendant 2,1 min »).
    - Un clic retient ce calibre : l'index voyage le long de l'arc, le chiffre roule, le verdict s'écrit en une ligne
      dans sa couleur, et la courbe suit.
    - « À la main » propose TOUTE la gamme. Les calibres qui ne passent pas sont au trait rouge avec ✕, le juste en
      ambre, et tous restent cliquables.
    - Un lien « Tout le catalogue MS3320 (13) » montre les calibres hors des « calibres préférés » des hypothèses, et le
      dit.
    - Au clavier, ← → parcourent les crans, Entrée retient, Échap rend l'automatique.
    - Retenir un calibre qui ne passe pas le montre rouge partout, avec la raison.
    - Le récapitulatif a déjà une liste des 7 calibres avec leur verdict, au double-clic : vise UN composant commun.
      Propose-le au domaine E s'il vit dans 08-recap.
  - **Le même patron pour tous les choix** (ingénieur, point 7) : on montre tous les candidats de la norme, ceux qui
    passent d'abord, les autres avec leur raison sur une ligne. Tous restent cliquables, un choix forcé est marqué.
    - modules de barrette : 2 sur 29 montrés aujourd'hui ;
    - arrangements : le bouton « Changer » ne disparaît JAMAIS (300XC1 B) ;
    - contacts à sertir : pas d'« Automatique » en double, les autres EN 3155 de la taille, avec ✓ / ✕ de gauge.
  - **La carte se déplie du bloc, moment signature n° 1.** Échelle uniforme, contenu lisible dès la première image, plus
    de dalle blanche vide qui couvre les voisins. Spécification et maquette : designer § 4.
  - **La fiche ne bouge plus sous la souris** : après un geste dans la fiche, l'élément cliqué garde sa hauteur d'écran.
  - **La règle unique des bulles** : une bulle ne paraît qu'après un vrai mouvement de la souris APRÈS le rendu, s'éteint
    au clic, et ne couvre jamais ce que le clic vient d'ouvrir. Exemple : la bulle d'« À la main » sur la gamme.
  - **Les « ? »** : encre `--t-2`, zone de clic de 28 px. Ils portent tout le « pourquoi ».
  - **Ce qui s'écrit se voit comme un champ** : un filet au repos, l'anneau au focus.
  - **Aucun texte coupé sans bulle** : la barre des problèmes passe sur deux lignes, l'intensité « 9,31 / 11,7 A » n'est
    jamais coupée.
  - **La ligne « câbles à grossir »** suit le calibre retenu (« avec le 20 A »).
  - **La fiche du câble** :
    - elle montre ses PROPRES problèmes : protection, contact contre calibre, et la chaîne de cause quand c'est le
      disjoncteur. Ces données viennent du domaine C (08-controle), il les rattache au câble ; affiche-les.
    - elle offre « Tout régler » quand la cause est le disjoncteur (technicien, point 1 ; ingénieur, point 5) ;
    - le bloc « Par rapport au retest · 1 modification » dit la colonne et l'objet de chaque ligne (« PN1 (102CB1) :
      MS3320-10 → MS3320-20 ») (technicien, point 10).
  - **Le focus** : une carte ouverte (par un clic, par la recherche, par P) prend le clavier ; l'ordre de Tab commence
    dans la carte ; Échap la ferme et rend le clavier d'où il venait.
  - **Le verdict s'écrit avec trois mots, partout** : passe, juste, déclenche. Ils viennent de la table unique du domaine
    C.
  - Tous les points des quatre rapports et de `tests/ux.js` sur les fiches.

### C — La vérité et les exports
- **Fichiers** : `src/02-lecture.js`, `src/08-export.js`, `src/08-controle.js`, `src/09-chute.js`,
  `src/09-disjoncteurs.js`, `src/08-nomenclature.js`, `src/08-pdf-dossier.js`, et le moteur `src/09-*` si nécessaire.
- **À faire** :
  - **Ce que l'écran montre est ce qui part** (technicien, point 1). La décision : on n'écrit JAMAIS dans le retest un
    changement que le lecteur n'a pas demandé. Un calibre automatique écrit sans grossir ses câbles serait dangereux.
    - `exporterRetestCorrige` ouvre d'abord un RELEVÉ dans la page, pas un `confirm()`. Il montre :
      - ce qui part (les changements écrits) ;
      - les choix automatiques de Volta pas encore écrits, chacun avec son geste (« 102CB1 : Volta retient 15 A, le
        retest dit 10 A — [Écrire 15 A et grossir les 3 câbles] ») ;
      - les problèmes qui restent ;
      - le bouton plein « Enregistrer l'Excel ».
    - La feuille « Modifications » gagne une colonne « Origine » : à la main, ou proposition de Volta acceptée.
    - Expose une fonction pour la pilule « N changements » du domaine A2.
  - **Le retest corrigé, rouvert, ne se corrompt plus** (ingénieur, point 2) :
    - la lecture ignore la feuille « Modifications » (son nom, ou son en-tête Colonne / Avant / Après), et le dit ;
    - l'export ajoute une feuille cachée « Volta » (profils de charge, hypothèses, contacts choisis à la main), que la
      lecture reprend ;
    - un test : exporter, rouvrir, retrouver 201 liaisons et le même verdict de 102CB1.
  - **Deux part numbers sur un même repère** lèvent un problème, avec le geste « Unifier sur… » (ingénieur, point 3).
  - **Une seule chute affichée** (ingénieur, point 4) : une seule fonction rend la chute, et un test vérifie que la fiche
    du câble, la fiche du disjoncteur, l'onglet Problèmes et le PDF portent le même nombre.
  - **Les problèmes de protection et de contact contre calibre sont rattachés au CÂBLE**, autant qu'au disjoncteur, avec
    la chaîne de cause. La fiche (domaine B) les affiche.
  - **Le compte des problèmes, une seule source** : problèmes rouges et à voir ambre, sur tout le plan, et par folio en
    second. Domaines A2, B et E l'emploient.
  - **Trois mots de verdict partout** (ingénieur, point 8) : **passe** (`--ok`), **juste** (`--warn` : sans la marge),
    **déclenche** (`--ko`), dans une table unique exportée. « Touche la courbe » et « sans la marge » vont dans la
    bulle. Le « ? » de la gamme lit la gamme de la famille, pas la liste préférée. « Ce qu'il faut faire » donne le
    geste concret, jamais un conseil faux.
  - **La nomenclature et le dossier PDF** (ingénieur, points 6 et 9) :
    - un groupe « Disjoncteurs » (repère, part number à commander, calibre retenu, retest barré s'il diffère, état) ;
    - le folio écrit « 15 A » et « (retest 10 A) » s'il diffère ;
    - un seul compte de repères ;
    - aucune troncature (deux lignes) ;
    - pas de colonne vide ;
    - une page « Hypothèses et sources » après la garde : réglages, profils de charge, statut des tables.
  - Tous les points des rapports sur les exports, les comptes et les verdicts.

### D — Le folio et la recherche (deuxième vague)
- **Fichiers** :
  - `src/06-dessin.js`, `src/style-dessin.css` ;
  - dans `src/08-interface.js` : « le dessin », « la vue », « la surbrillance », « la planche », « l'INDEX »,
    « les folios », « aller à un repère », « la recherche ».
- **À faire** :
  - un folio LISIBLE à l'écran : numéros de câble ≥ 9 à 11 px à 100 %, un zoom sémantique qui tait les petites écritures
    sauf celle survolée ou choisie, l'ouverture cadrée sur le dessin (ergonome, point 1 ; technicien, point 7) ;
  - le dessin se range de l'esquisse au définitif, sans double image (moment n° 3) ;
  - le changement de folio glisse, la pastille aussi ;
  - la recherche pardonne : « w012 », « W 012 », « w12 » trouvent W-012, « disjoncteur » trouve les disjoncteurs,
    « Vouliez-vous dire… » ;
  - l'objet trouvé pulse deux fois ;
  - **Ctrl+K**, une palette qui cherche les objets ET les actions (« Exporter le dossier PDF », « Hypothèses »…) ;
  - l'index (R) se parcourt au clavier ;
  - tous les points des rapports et de `tests/ux.js` sur le plan, la recherche et l'index.

### E — Les documents et le récapitulatif (deuxième vague)
- **Fichiers** : `src/08-recap.js`, `src/style-recap.css`, `src/08-fichiers.js`, `src/style-fichiers.css`,
  `src/08-normes.js`, `src/08-see.js`, `src/08-see-import.js`, `src/style-see.css`, `src/08-pdf.js`, `src/08-visio.js`,
  leurs CSS, et l'interface de `src/08-references.js`.
- **À faire** :
  - le bouton « Exporter » du récapitulatif devient « Tableau en CSV » ;
  - les deux « Tout » ne se confondent plus ;
  - « À reprendre 4 · 3 sur ce folio » ;
  - les cibles font au moins 28 px ;
  - les champs se voient, avec un même geste pour écrire, partout ;
  - le récapitulatif en moitié ne cache plus le dessin ;
  - les documents prennent le clavier, Échap rend au ⋮, chaque × a sa bulle ;
  - « Vos fichiers » est allégé ;
  - les Hypothèses disent « ces réglages sont écrits dans chaque export » ;
  - tous les points des rapports et de `tests/ux.js` sur ces écrans.

## Les batteries
Pendant le travail : les tiennes, et `tests/ux.js` sur ton domaine. À la fin : `node tests/toutes.js` en arrière-plan.
Elle compte 23 batteries, ux comprise. Toutes doivent passer, sauf `ux` sur les défauts des AUTRES domaines : dis
lesquels restent. La machine est partagée : une batterie qui expire par lenteur se relance avant de conclure. Après
toute fusion de la branche dans la tienne, charge la page dans Chromium et vérifie qu'il n'y a aucune `pageerror` :
deux déclarations en double sont déjà arrivées par une fusion.

## À la fin
- `git checkout -- index.html`, puis UN commit en français signé, comme dans le brief commun.
- Ton rapport court dans `…/scratchpad/v73/corrections/<domaine>/RAPPORT.md`. Point par point, ce qui est fait ou non
  et pourquoi : les batteries, `ux` avant et après sur ton domaine, les captures avant et après les plus parlantes,
  les « Demandes aux autres domaines ».
- Dans ta réponse : ta branche, ton commit, l'état des batteries.
