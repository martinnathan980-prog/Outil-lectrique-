# Correcteur A1 : la table vivante et l'accueil (Volta v73)

- **Branche** : `worktree-agent-a37203ad1eaa7e6bb`. Partie du socle `66059fc` de `claude/schematic-generator-tool-hih0lj`. Elle a ensuite été remise sur `f96f0cd` (le domaine C fusionné), puis sur `17b0694` (A2 et B fusionnés). À chaque fois, mon commit temporaire a été rejoué dessus, sans conflit, pour livrer **un seul commit** au-dessus de la branche. Après chaque fusion, la page chargée dans Chromium ne montre aucune `pageerror` ni erreur console (`outils/erreurs.js`, clair et sombre).
- **Répertoire** : `/home/user/Outil-lectrique-/.claude/worktrees/agent-a37203ad1eaa7e6bb`.
- **Commit** : voir la fin de ce rapport.
- **Dossier de travail** : `/tmp/claude-0/-home-user-Outil-lectrique-/d44a74ef-5d4e-5d70-aef6-303c6243d2ca/scratchpad/v73/corrections/table-accueil/`. Les chemins ci-dessous partent de ce dossier :
  - `avant/` et `apres/` : les captures, en 1440 × 900 et 1920 × 1080, clair et sombre ;
  - `planches/` : le mouvement image par image ;
  - `outils/` : les scripts de capture, de planches, de coût et de sonde ;
  - `ux-avant.txt`, `ux-apres.txt`, `ux-pleine.txt` : la batterie `tests/ux.js`.

## Les fichiers touchés

- `src/08-table.js` : réécrit.
- `src/style-table.css` : la table.
- `src/08-bibliotheque.js`, `src/style-bibliotheque.css` : l'accueil et la bibliothèque.
- `src/page.html` : **seulement le bloc `#table`**, ses trois nouvelles couches. Le bloc `#bibliotheque` n'a pas changé : tout s'écrit en JS.
- `tests/bibliotheque.js` : des contrôles ajoutés, deux mis à jour.
- `tests/vitesse.js` : le contrôle de la table, devenu obsolète, est réécrit.

Deux règles de mon fichier `style-bibliotheque.css` visent des éléments du domaine A2. Elles ne valent que sur la bibliothèque (voir les Demandes) :
- `body.biblio-accueil #entete` : la barre transparente sur l'accueil ;
- `body.biblio #toast` : le mot qui passe en bas.

Le fichier en avait déjà une du même genre : `body.biblio #recherche`.

---

## 1. La table vivante (designer § 6), faite, mesurée

`08-table.js` suit la maquette `accueil-vivant.html`, au comportement près.

**Les couches** :
- le fond ;
- `.ta-nappe-a` et `.ta-nappe-b` : deux ellipses de 120 × 90 et 110 × 80 vmax. Elles dérivent en `translate3d` seul, sur des Lissajous de 47 s et 61 s, ±4 vw et ±3 vh. La nappe B respire en opacité (.55 ↔ 1, 24 s) et remplace le souffle d'avant ;
- `.ta-points` : les points à 16 %, estompés en vignette. La parallaxe d'un dixième est gardée ;
- `.ta-lueur` : 760 px, sur un **ressort amorti critique** (ω = 9 rad/s, au lieu d'un cinquième du chemin par image) ;
- `.ta-revele` : les mêmes points à 55 % dans un disque de 420 px. Ils sont recalés sur la grille, **parallaxe comprise** (la maquette n'en avait pas) ;
- `.ta-courant` : un éclat de glace de 150 × 1,5 px. Il court une rangée de points en 1,8 s, toutes les 14 à 22 s.

**La conduite** :
- la dérive s'écrit à **15 Hz** (`setInterval`). Un pas qui déplace les nappes de moins d'un tiers de pixel ne s'écrit pas : aucune image n'est produite pour rien ;
- **la veille** : à 90 s sans la main (`TABLE.veilleApres`), la vitesse tombe à 0 en environ 2 s et la minuterie s'arrête. Plus rien ne tourne (`#table.dort`). Un geste la relance en 1,2 s ;
- **page cachée** : tout s'arrête ;
- **pendant un geste** (glisser, molette, tenir un bloc) : elle attend ;
- **sous une feuille pleine page** (le récapitulatif en page, la base SEE) : elle est figée, la lueur, la révélation et le courant sont éteints ;
- **un ajout, mesuré** : pendant un long travail (conversion en lot, dossier PDF, placement d'un folio au loin), la dérive attend aussi (`tableOccupee`). En rendu logiciel, chaque pas recompose l'écran. La conversion en lot de `tests/bibliotheque.js` passait de 90 s à 105–138 s. Avec l'attente, elle revient au niveau d'avant (116 s avant, 119 s après, à la même charge).

**`prefers-reduced-motion`** : les nappes sont posées une fois à t = 0, la nappe B à .75. Ni minuterie, ni lueur, ni révélation, ni courant. La passe « mouvement réduit » de `ux.js` ne relève aucun mouvement.

**Deux choix, et pourquoi** :
- **Le courant ne court que sur la bibliothèque.** Il passe dans une rangée libre, calculée sur les rectangles de ce qu'on lit (`rangeesLibres`) : jamais sous la composition, jamais deux à la fois. Sur le plan, on travaille, et un éclat à la lisière de la feuille distrairait. La dérive et la lueur y restent.
- **La grille ne se révèle pas sous ce qu'on lit** (la composition, les cartes, une feuille, les palets). Sur la capture du survol d'« Ouvrir un retest… », les points à 55 % passaient entre les lettres de la phrase. La lampe éclaire donc la table, pas le texte (`#table.sur-lu`, fondu de 0,35 s). La lueur, elle, reste.

### Le coût

Mesuré comme le designer (`outils/cout.js`, CDP `Performance.getMetrics` et la cadence rAF), à 1440 × 900, en rendu logiciel. La machine était partagée : 4 cœurs, charge de 7 à 13 (fichier `cout-final.txt`).

| fil principal (avec la sonde rAF) | avant, repos | après, éveillée | après, endormie (= la sonde seule) | image médiane |
|---|---|---|---|---|
| accueil | 2,0 % | **2,3 %** | 1,3 % | 16,7 ms |
| bibliothèque pleine | 2,5 % | **2,7 %** | 1,7 % | 16,7 ms |
| plan (folio 1) | 1,9 % | **3,1 %** | 1,5 % | 16,7 ms |

- La sonde rAF coûte ici 1,3 à 1,7 %. Chez le designer, elle coûtait 0,6 %.
- **La table seule** (sans sonde, `outils/banc.js`, trois mesures de 4 s) : accueil 1,5–2,8 %, bibliothèque pleine 1,1–1,3 %, plan 1,7–2,1 %. **Endormie : 0,0 %.** C'est sous les 2,5 % demandés.
- **60 images/s** : la médiane est de 16,7 ms partout, avant comme après. Des p95 à 33 ms paraissent dans les deux versions : c'est la machine.

Le processeur de **tout le navigateur**, compté comme le fait `tests/vitesse.js` (`outils/cpu.js`) :
- accueil, la table éveillée : **67–71 % d'un cœur avant** (le souffle à 60 images/s pendant 6 s), **30–32 % après** (la dérive à 15 Hz) ;
- plan : **93–95 % avant**, **38–45 % après** ;
- endormie : 2 à 4 %.

La table vivante coûte donc deux fois moins que l'ancien souffle tant qu'elle est éveillée. Elle reste éveillée plus longtemps : 90 s au lieu de 6 s.

**Le ressort**, pas à pas (`planches/G-lueur.png`). La lueur fait 31 % du chemin à 100 ms, 77 % à 300 ms, 93 % à 500 ms et 99 % à 800 ms, sans jamais dépasser.

### Les planches (image par image, animations figées puis posées à l'instant exact)

- `planches/F-derive.png` : la table seule, t = 0 → 42 s.
- `planches/G-lueur.png` et `planches/G-lueur-grille-revelee.png` : le ressort, la grille révélée en gros plan.
- `planches/H-courant.png` (0 → 1800 ms) et `planches/H-courant-ecran.png` : le courant, dans la bande libre du haut.

---

## 2. L'accueil (designer § 5.5) : la vitrine

Avant : `avant/accueil-clair-1440.png`. Après : `apres/accueil-clair-1440.png`, `apres/accueil-sombre-1920.png`.

**La composition**, au centre optique de la table :
- **la pile** : trois vraies feuilles (#c9d3e6 à −3,4°, #dfe6f3 à 2,2°, la vignette blanche). Elle fait 236 × 167 à 1440 et 300 × 212 à 1920 (`clamp`), avec une flaque de lumière dessous ;
- **le titre** « Ouvrez votre retest » en affiche (`--f-44` : 42 px à 1440, 52 px à 1920) ;
- **le chapeau** de 15 px : « Une ligne par câble, en Excel ou en CSV. Volta dessine les folios et vérifie chaque calibre, chaque contact, chaque câble. » ;
- **les deux gestes** à 44 px :
  - « Ouvrir un retest… » est clair. Ses **deux touches `Ctrl` `O`** sont en `--kbd-clair-t` sur `--kbd-clair-fond` (8:1 ; c'était 1,47:1). Le « + » se lit aux lecteurs d'écran sans se voir. Au survol, le bouton monte d'un pixel dans `--halo-geste` ; pressé, il prend `scale(--presse)` en 90 ms ;
  - « Nouvelle installation » est au verre ;
- **la ligne** « ou glissez-le n'importe où dans la fenêtre », avec son icône.

**Le dock de verre**, à 28 px du bas, porte :
- l'**Exemple** (vignette, « démonstration · 6 folios », ses problèmes en `--t-table-ko`) ;
- la **Base des contrats** (« déposer les contrats déjà faits »). La phrase des 300 000 lignes est dans sa **bulle**, qui paraît au survol et au clavier (`apres/accueil-bulle-base-clair-1440.png`) ;
- « Reprendre », quand un plan est resté sur la table (`apres/accueil-reprendre-clair-1440.png`).

**Ce qui part** : l'encadré pointillé, l'intertitre « Pour essayer » et la phrase de la base.

**La barre du haut** est transparente sur l'accueil : la marque et ⋮ flottent. Elle reprend sa bande ailleurs.

**L'arrivée**, une fois par session (`planches/A-accueil-se-pose.png`) :
- la règle commune `.entre-v`, posée élément par élément (`--k` de 0 à 5, +40 ms) : la pile, le titre, la phrase, les gestes, la ligne, le dock ;
- puis **les deux câbles de la vignette se tracent** : violet à +260 ms, sarcelle à +380 ms, en 640 ms ; le nœud paraît à +380 ms (`planches/A-cables-se-tracent.png`) ;
- ensuite (retour du plan, une autre vue), un **fondu de 220 ms** et rien ne bouge (`planches/C-retour-du-plan.png`).

**Charge** (`ux.js`) : l'accueil passe de 84 à 52 mots.

## 3. La bibliothèque pleine (designer § 5.6)

Avant : `avant/bibliotheque-clair-1440.png`. Après : `apres/bibliotheque-clair-1440.png`, `apres/bibliotheque-sombre-1920.png`. Voir aussi `planches/B-pleine-se-pose.png`.

- **La tête** : « Bibliothèque » en `--f-34`. La recherche fait 300 × 38, coin 12. Son bord est à `.6` de glace, soit 3,4:1 sur la nuit (une copie de `ux.js` le mesurait à 2,8:1 à `.42`). « Nouvelle installation » fait 38 px. Quand un document est ouvert à côté, la tête passe à la ligne : le titre ne se coupe plus en « Bibliothèqu ».
- **« Reprendre » en verre**, 76 px, coin 18. Il porte la vignette, « Reprendre où vous en étiez », le nom et son installation, les **folios en puces** (le courant presque blanc) et `Échap`. Son anneau au clavier est la glace : `apres/focus-reprendre-sombre-1440.png` (c'était 1,02:1).
- **L'intertitre** « Installations, par n° ECP » au filet, le segment de rangement à droite.
- **Les cartes** :
  - une grille de **quatre colonnes**, écart 36 × 28, coin 14, au moins 200 px ;
  - une **vraie pile** : `.bi-f2` et `.bi-f3` sont de vraies feuilles, chacune avec son filet ;
  - au **survol**, la face monte de 4 px et les feuilles **s'éventent** (2°, −3°, 420 ms, `--courbe-entree`) : `planches/D-pile-s-evente.png` ;
  - l'état en **pastille** en haut à droite (« 2 problèmes », en rouge seulement) ;
  - les plans **en mots** (Inter 12/500, une mini-feuille devant). Le nom fait 17 px ;
  - un ECP absent s'écrit « — », au lieu de « à saisir » en ambre.
- **L'Exemple** est au trait, en dernier. « 5 problèmes » est en `--t-table-ko` (c'était 3,13:1). Depuis la fusion de C, le compte unique y dit « 4 problèmes ».
- **Nouvelle installation** : les cartes **glissent** à leur nouvelle place (FLIP, 300 ms, `--courbe-glisse`) et la neuve paraît (`planches/E-nouvelle-installation.png`). La recherche resserre la grille de la même façon. Les touches « Entrée la crée · Échap renonce » se posent juste sous les champs, sans bande vide au milieu (ergonome).
- **Une installation** (`apres/installation-sombre-1920.png`) :
  - dans la tête, « N° ECP (facultatif) » à l'encre seconde, une invitation et non une alerte (technicien) ;
  - le « ⋯ » de la tête a sa bulle ;
  - le « ⋯ » de chaque ligne de plan **se voit au repos** en `--t-3`, à 5,7:1 (technicien : on ne savait pas qu'on pouvait renommer ; une copie de `ux.js` relevait 2,17:1 avec une opacité de 45 %) ;
  - le rail écrit « — » au lieu de « ····· ».
- **Le mot de la base sur le titre** (ergonome, point 10). Sur la bibliothèque, le mot qui passe se pose **en bas**, centré dans la place libre (au-dessus du dock sur l'accueil). Avant : `avant/base-deposee-clair-1440.png`, le titre couvert. Après : `apres/base-deposee-clair-1440.png`.
- **Échap**, d'une installation, remonte à la racine et rend le clavier **à sa carte**.
- **Chercher dans la grande base** (ingénieur 3.9, P3) :
  - les résultats se **filtrent** par installation, appareil et année du retest. Ce sont les puces communes, à facettes ;
  - « Convertir ces N contrats » prend ce qui est montré ;
  - captures : `apres/recherche-base-filtree-sombre-1440.png`.
- **L'encre** de la bibliothèque devient #1b1f27, la même que partout (designer P3).
- **Le rail** d'une installation : le nom entier d'une ligne tronquée (« Cockpit, table… ») est dans une `data-bulle`, plus dans un `title=` (la règle commune).
- **Charge** (`ux.js`) : la bibliothèque passe de 97 à 59 mots.

### La demande du domaine C (§ 3 de son rapport), faite après la fusion

- **A1-1, la feuille cachée « Volta » d'un retest corrigé déposé dans la bibliothèque** :
  - `plansDuFichier` garde `r.volta` dans chaque plan qu'il donne (un par harness s'il y en a plusieurs) ;
  - `creerPlan(…, { volta })` l'écrit dans le contrat « neuf » du plan ;
  - `ouvrirPlan`, branche `o.neuf`, la reprend après `chargerContrat` : `reprendreVolta(o.volta, [])`, son mot et son geste « Reprendre ses hypothèses ».
  - Un ajout au code proposé : le même jour, la reprise de la lecture attend encore (`VOLTA.attente`). Sans précaution, le mot passait **deux fois**, la seconde un instant après. L'ouverture vide donc l'attente avant de reprendre : un seul mot.
  - Le contrôle (`tests/bibliotheque.js`) : un retest corrigé de l'Exemple (15 A sur 102CB1, un contact choisi à la main) est déposé dans deux installations. L'un s'ouvre le jour même, l'autre **après rechargement**. Les deux retrouvent le profil de charge et le contact, et le mot passe **une fois**. Le témoin (`outils/volta.js`, `volta-temoin.txt`) : avec la reprise débranchée, le profil est perdu (`null`), donc le contrôle distingue bien.
- **A1-2, le compte d'un plan gardé** : `garderLePlan` lit `compteProblemes()` (08-controle), la source unique de la pastille du rail, au lieu de recompter `CONTROLE.items`.

### Les demandes du domaine A2 (§ Demandes de son rapport), faites après la fusion de A2 et B (`17b0694`)

- **A1-1, `#en-install` portait `title=`** :
  - le bouton du fil porte maintenant une `.bulle`, sous la règle des bulles du chrome (400 ms au survol, tout de suite au clavier, éteinte au clic) : « ECP 41388 · Cockpit, tableau central… : ses plans » (`apres/bulle-fil-sombre-1440.png`) ;
  - la bulle **s'écrit quand elle paraît** (l'événement `bulle` de 08-menu, comme ↶ et ↷). Ainsi le texte du bouton reste « 41388Cockpit… » pour les batteries qui le lisent (`interface`, `parcours`, `bibliotheque`), et aucun test d'un autre domaine n'a eu à changer ;
  - `.en-install` élidait le nom par `overflow:hidden`, ce qui aurait coupé sa bulle. Dans mon fichier : `#en-install{position:relative;overflow:visible;display:inline-flex}`, et c'est le **nom seul** qui s'élide ;
  - le `title=` de `page.html` est retiré par `synchroniserFil` (`removeAttribute`).
- **A1-2, la barre transparente sur l'accueil** : déjà faite, sur `body.biblio-accueil` (voir les Demandes, point 3).
- **Mes bulles, mises à la règle du chrome** : après la fusion, `.bulle` est `visibility:hidden` jusqu'à `.bulle-on`. Mes règles `:hover` (le ⋯ des cartes, la tuile de la base) attendaient donc deux fois (800 ms). Elles ne gardent que leur place et leur glissé (`.bi-plus.bulle-on>.bulle`, `.bi-tuile.bulle-on>.bi-bulle-haut`). La sonde `outils/bulles.js` le vérifie : rien à 150 ms, la bulle entière à l'écran à 800 ms, en clair et en sombre (`apres/bulle-base-clair-1440.png`, `apres/bulle-plus-carte-sombre-1440.png`).

## 4. `tests/ux.js` sur mon domaine

Écrans accueil, bibliotheque et installation, quatre passes, mouvement réduit compris.

| | avant (`ux-avant.txt`) | après (`ux-apres.txt`) |
|---|---|---|
| `bi-btn-ouvrir kbd` (Ctrl+O, 1,47:1) | KO | ok |
| `bi-carte-pb` (« 5 problèmes », 3,13:1) | KO | ok |
| `bi-plus-tete` (icône sans bulle) | KO | ok |
| `#bi-reprendre` (anneau 1,02:1) | KO | ok |
| mouvement réduit | (non passé) | ok, zéro mouvement |

Il ne reste aucun défaut de mon domaine.

Les défauts qui restent sur ces écrans sont ceux des **autres domaines** :
- `#q`, le bord de la recherche de la barre (1,48:1) : A2 ;
- `#fo-strip .chip`, l'anneau du folio courant (1,58:1) : A2 / D ;
- « à 100 %, chaque écriture du folio… », 14 défauts : D.

La batterie ne voit pas la bibliothèque **pleine** ni une installation **remplie**. Je les ai passées dans une **copie** de `ux.js` placée dans mon dossier de travail, avec deux écrans ajoutés (`outils/ux-copie/`, `ux-pleine.txt`). La copie a trouvé trois défauts de mon domaine, tous corrigés :
- le bord de `#bi-q` ;
- le « ⋯ » des lignes ;
- la cible `bi-ecp-tete` (22 px, portée à 28).

Il ne reste là aussi que `#q` et `fo-strip`. Le `ux.js` du dépôt n'est pas modifié.

## 5. Les batteries

- `tests/bibliotheque.js` : **69 ok, 1 KO** au dernier passage complet, puis corrigé. Le KO venait de mon propre test : l'opacité s'écrit « 0.75 » et non « .75 ». Les ajouts :
  - l'accueil en vitrine (titre ≥ 36 px, deux gestes, deux touches, le dock, la barre effacée, la bulle de la base) ;
  - **la table vivante** : couches, dérive, rangées libres du courant ;
  - **la veille, le réveil, la page cachée** ;
  - **la bibliothèque pleine** (« Reprendre » en verre et ses folios, l'intertitre, la pile de deux feuilles, les plans en mots, la barre) ;
  - l'**éventail** au survol ;
  - le **mot qui passe en bas** ;
  - le **mouvement réduit** (un contexte `reducedMotion: 'reduce'`).
- Mis à jour parce que rendus obsolètes :
  - les gestes de l'accueil (`ouvrir,nouvelle,base` devient les gestes `ouvrir,nouvelle` plus le dock `exemple,base`) ;
  - « ECP à saisir » devient « N° ECP (facultatif) ».
- `tests/vitesse.js` : « le souffle respire… se fige » devient « la table dérive quand on est là, et s'endort au repos ». J'ai ajouté une borne sur le processeur, la table éveillée. Résultat : **tout tient**, éveillée 45 % d'un cœur à une charge de 13, endormie 4 %.
- `node tests/toutes.js` : voir la fin du rapport.

---

## 6. Les points des quatre rapports (accueil, bibliothèque, installation, ouverture d'un retest)

| rapport | point | fait ? |
|---|---|---|
| designer | P1 la table dort | **fait** (§ 1) |
| designer | P2 l'accueil n'est pas une vitrine | **fait** (§ 2) |
| designer | P2 Ctrl+O 1,72:1 ; survol invisible | **fait** (deux touches 8:1 ; `--halo-geste`) |
| designer | P2 encadré pointillé ; P3 phrase de la base ; « Pour essayer » | **faits** (le dock, la bulle) |
| designer | P3 barre du haut sur l'accueil | **fait** (transparente) |
| designer | P3 l'arrivée muette | **fait** (cascade et tracé, une fois ; fondu ensuite) |
| designer | P2 la pile en barres grises ; « Reprendre » en papier | **faits** |
| designer | P2 « 5 problèmes » 2,94:1 | **fait** (`--t-table-ko`) |
| designer | P3 noms des plans en chasse fixe ; état en ligne rouge ; 90 px de blanc | **faits** (Inter ; pastille ; carte de 200 px, listes alignées) |
| designer | P3 « Rangées par » flottant | **fait** (intertitre au filet) |
| designer | P3 la carte neuve saute | **fait** (FLIP 300 ms) |
| designer | P3 « ····· » | **fait** (« — ») |
| designer | P3 la lueur d'un cinquième | **fait** (ressort ω = 9) ; DESIGN à corriger (Demandes) |
| designer | P3 deux encres d'interface | **fait** pour la bibliothèque (#1b1f27) |
| ergonome | P2 Ctrl+O 1,47:1 ; « 5 problèmes » 3,13:1 ; anneau de « Reprendre » 1,02:1 ; « ⋯ » sans bulle | **faits** (`ux.js` le confirme) |
| ergonome | P2 base déposée : le titre coupé, le compte sur trois lignes, le mot sur le titre | **fait** de mon côté (la tête passe à la ligne, le mot en bas) ; ne plus ouvrir « Vos fichiers » : **Demande E** |
| ergonome | P3 nouvelle installation : l'ECP avant le nom ; une bande vide | **bande vide faite**. **L'ordre est gardé** : le lecteur range ses installations par ECP, et des lettres tapées dans l'ECP vont seules au nom. Celui qui ne connaît pas l'ECP n'a donc aucun geste en plus. |
| ergonome | P3 installation d'un plan : « s'ouvre d'un clic » | sans objet : seule l'Exemple s'ouvre d'un clic (elle le dit d'une flèche au survol) |
| technicien | A P3 Ctrl+O | **fait** |
| technicien | A P3 ordre « Récentes » par défaut | **pas fait, exprès** : le lecteur a demandé de trier « bien proprement » par ECP ; « Récentes » reste à un clic et le choix se garde |
| technicien | A P3 « ECP à saisir » inquiète | **fait** (« N° ECP (facultatif) », « — » sur la carte) |
| technicien | A P3 « ⋯ » des lignes invisible | **fait** (visible au repos) |
| technicien | B P3 « 1 feuille ignorée » | **Demande E** (08-fichiers) |
| technicien | B P2 la couleur des routes change d'un plan à l'autre | **Demande D** (08-interface, `couleursDesRoutes`) |
| technicien | B P3 « Disjoncte… » tronqué | **Demande D** (le dessin) |
| technicien | C P3 le fond immobile ; moments n° 5 et n° 6 | **faits** (la table qui vit ; l'accueil qui se dessine) |
| ingénieur | 3.9 P3 la recherche dans la base ne se filtre pas | **fait** (puces installation, appareil, année) |
| ingénieur | 3.9 P2 « Déjà fait » propose le contrat ouvert lui-même | **Demande E** (08-references) |

---

## 7. Demandes aux autres domaines

### A2 : `src/style.css` (le chrome)

1. **Le souffle est mort.**
   - Ces règles ne servent plus :
     - `#table .ta-souffle{…}` ;
     - `@keyframes ta-respire` ;
     - dans `@media (prefers-reduced-motion)`, `#table .ta-souffle{opacity:.75}` ;
     - le jeton `--table-souffle` (plus personne ne le lit).
   - Le commentaire « LA TABLE … quatre couches » est à mettre à jour.
   - `#table>div{position:absolute;inset:0}` reste : mes couches le surchargent.
2. **Pour information, le mot qui passe sur la bibliothèque** (fait dans mon fichier, seulement sur la bibliothèque) :
   - `body.biblio #toast{top:auto;left:50%;bottom:calc(var(--jeu) + 22px)}` ;
   - `body.biblio.fiche-ouverte #toast{left:calc((100vw - var(--fiche-l) - var(--jeu)) / 2)}` ;
   - `body.biblio-accueil #toast{bottom:calc(var(--jeu) + 112px)}` ;
   - posé en bas, il **monte** en paraissant, puisque le toast du chrome descend de 8 px : `body.biblio #toast:not(.on){transform:translateX(-50%) translateY(8px) scale(.98)}`.
3. **Pour information, la barre du haut sur l'accueil.** C'était votre demande A1-2, déjà faite dans mon fichier, sur ma classe :
   - `body.biblio-accueil #entete{background:transparent;box-shadow:none}` et `body.biblio #entete{transition:…}` ;
   - la classe `body.biblio-accueil` est posée par `rendreBibliotheque` et retirée par `montrerLePlan` ;
   - vérifié après la fusion : la barre est effacée sur l'accueil (`apres/accueil-clair-1440.png`) ;
   - si `#entete` prend un jour un `backdrop-filter`, l'ajouter à cette règle (`backdrop-filter:none`).

### E : `src/08-references.js` (son interface) et `src/08-fichiers.js`

4. **Ne pas ouvrir « Vos fichiers » après un dépôt de la base fait depuis la bibliothèque** (ergonome P2). La bibliothèque montre déjà les installations créées, et le mot qui passe le dit. Dans `importerReferences` :
   ```js
   baseRecue(nom, …, G); if (!(typeof bibliothequeOuverte === 'function' && bibliothequeOuverte())) ficheFichiers('base');
   ```
5. **« 1 feuille ignorée »** (technicien B, P3). Dans `08-fichiers.js`, le message de l'ouverture d'un retest :
   ```js
   const msg = pluriel(r.liaisons.length, 'liaison') + ' lues' + (plans().length > 1 ? ' · ' + plans().length + ' folios' : '')
     + (ig.length ? ' · ' + (ig.length > 1 ? 'les feuilles ' : 'la feuille ') + ig.join(', ') + (ig.length > 1 ? ' sont laissées' : ' est laissée') + ' de côté (pas les en-têtes du retest)' : '') + '.';
   ```
6. **« Déjà fait » d'un contrat de la base** (ingénieur 3.9, P2) : exclure le plan ouvert (`app.planId`, son `contrat`) des candidats, comme `ficheDejaFaitContrat` le fait déjà.

### D : `src/08-interface.js` « le dessin »

7. **La couleur d'une route par son nom** (technicien B, P2). PUISSANCE est violette dans l'Exemple et bleue ailleurs. La proposition :
   ```js
   const COULEURS_NOMMEES = { PUISSANCE: '#7d3c98', SIGNAL: '#117a8b', BLINDE: '#1f5fbf' };
   const cleRoute = r => String(r).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
   function couleursDesRoutes() { const choisies = app.contrat.couleursRoutes || {}, m = new Map(), prises = new Set();
     const R = [...new Set(app.contrat.liaisons.map(l => l.route).filter(Boolean))].sort(triNaturel);
     R.forEach(r => { const c = choisies[r] || COULEURS_NOMMEES[cleRoute(r)]; if (c) { m.set(r, c); prises.add(c); } });
     const libres = PALETTE_ROUTES.filter(c => !prises.has(c)); let k = 0;
     R.forEach(r => { if (!m.has(r)) m.set(r, libres.length ? libres[k++ % libres.length] : PALETTE_ROUTES[k++ % PALETTE_ROUTES.length]); });
     return m; }
   ```
8. **« Disjoncte… » tronqué sous 102CB1 sur le folio** (technicien B, P3) : la désignation sur deux lignes, ou à `--f-11`, avant de tronquer.

### DESIGN.md (aucun domaine)

9. Le texte de remplacement des paragraphes sur la table, l'accueil et la bibliothèque est dans `DESIGN-propose.md`, à côté de ce rapport.

---

## 8. Ce que je n'ai pas fait

- **L'ordre « Récentes » par défaut** (technicien) et **le nom avant l'ECP** (ergonome) : voir le § 6. Les deux contredisent une demande explicite du lecteur.
- **La sortie de la bibliothèque vers le plan** reste une coupe franche. Le designer ne l'a pas spécifiée. Un fondu demanderait de retarder `hidden`, et plusieurs batteries lisent cet état tout de suite.
- **La dérive à 15 Hz** a été gardée telle que spécifiée. À 10 Hz, le processeur du navigateur baisse encore d'un tiers en rendu logiciel (`outils/cpu.js hz10` : 17–26 % au lieu de 30–32 %), sans différence à l'œil sur un dégradé de cette taille. C'est le réglage à prendre si le lecteur travaille sans accélération graphique : la constante `TABLE_HZ` (08-table).
