# Lot A (v74) : l'accueil et la table vivante

Le lecteur (oct. 2026) : « Le fond est statique : ça doit un petit peu bouger. » « Comme l'écran d'accueil d'un
iPhone. » « La beauté d'abord. »

- **Branche** : `worktree-agent-a78bc6f3c248e946c`, partie de `816b249` (la branche principale avec les briefs v74).
- **Fusion** : `origin/v73-pause-accueil` (`504fbd2`, le travail v73 du domaine A1, « non fini, non vérifié »).
- **Dossier de travail** (captures, planches, bancs, sorties des batteries) :
  `/tmp/claude-0/-home-user-Outil-lectrique-/d44a74ef-5d4e-5d70-aef6-303c6243d2ca/scratchpad/v74A/`. Les chemins
  ci-dessous partent de ce dossier.

## 1. La fusion de la branche en pause

Deux fichiers en conflit, résolus en gardant TOUT ce que la v74 a fait :

- `src/08-bibliotheque.js` (cinq blocs) :
  - le code de la pause (l'accueil en vitrine, le dock, « Reprendre » en verre, la cascade d'arrivée, le FLIP des cartes,
    les filtres de la recherche dans la base, la feuille « Volta » qui suit le plan déposé) ;
  - les mots de la v74 : « installation » partout où le lecteur lit « retest ». L'accueil dit donc **« Ouvrez votre
    installation »** et **« Ouvrir une installation… »** ; « Déposez vos installations », « Aucun plan : un clic, puis
    déposez vos installations », « installation du 05/06/2019 » (la date d'un contrat de la base), « Installation
    corrigée (Excel) » dans le lot. La bulle de la base ne dit plus « le retest de tous vos contrats » mais « Un seul
    Excel qui porte tous vos contrats (Harness rempli)… ».
  - les identifiants restent (`-retest-corrige.xlsx`, `classeurRetestCorrige`, `p.retest`…), comme le veut le brief.
- `tests/bibliotheque.js` (deux blocs) : les contrôles de la pause (la vitrine, la table vivante, la veille, le mot en
  bas), avec les mots de la v74 (« Ouvrez votre installation »).

`src/page.html` (le bloc `#table`), `src/08-table.js`, `src/style-table.css`, `src/style-bibliotheque.css` et
`tests/vitesse.js` se sont fusionnés seuls. Après la fusion, la page se charge **sans aucune `pageerror` ni erreur
console**, en 1440 et 1920, clair et sombre (`outils/ecrans.js`).

## 2. Ce que j'ai fini, vérifié ou changé après la fusion

### Le fond qui vit à peine (« ça doit un petit peu bouger »)

La table vivante de la pause (spécification du designer v73, § 6) est là et **vérifiée dans la vraie page** :

- deux nappes de lumière qui dérivent, en translation seule, sur 47 s et 61 s (±4 vw, ±3 vh : 7,7 px/s au plus à
  1440) ; la seconde respire en opacité (24 s) ;
- la lueur sur un ressort (ω = 9 rad/s), qui révèle la grille sous la main, jamais sous ce qu'on lit ;
- le courant, un éclat de glace sur une rangée de points toutes les 14 à 22 s, seulement sur la bibliothèque, dans une
  bande libre ;
- la veille à 90 s sans la main (la dérive ralentit jusqu'à l'arrêt, plus rien ne tourne), le réveil au premier geste,
  la page cachée qui arrête tout, l'attente pendant un geste ou un long travail ;
- **le mouvement réduit** : les nappes posées une fois, ni lueur, ni courant, aucune animation.

**La planche** `derive/planche-derive.png` : la table seule, une image toutes les 6 s sur 42 s. Les flaques de lumière se
déplacent d'une image à l'autre ; l'écart moyen entre deux images voisines est de 1,3 à 2,2 sur 255 (`outils/derive.js`) :
ça bouge, lentement, sans jamais attirer l'œil.

**Changé : la dérive s'écrit à 10 Hz au lieu de 15.** À 7,7 px/s au plus, un pas fait un pixel au plus sur une lumière
très floue : aucune marche visible. Le banc `outils/banc-hz.js` alterne 15 et 10 Hz dans la même page (la charge de la
machine pèse pareil sur les deux) : le fil principal, souris immobile, table éveillée, passe de **4,1 % à 0,8 %**
(médianes de quatre mesures de 5 s, à une charge de 20 à 24 sur 4 cœurs). Le rapport v73 le proposait déjà pour un PC
sans accélération graphique. La fréquence est maintenant `TABLE.hz` (pour un banc), `TABLE_HZ` restant la constante.

**Le coût** (`outils/cout.js`, comme le designer : CDP `TaskDuration` et la cadence rAF, 1440 × 900, rendu logiciel,
machine partagée à une charge de 24 à 28) — à 15 Hz, avant le changement :

| écran | éveillée | endormie | image médiane |
|---|---|---|---|
| accueil | 3,5 % | 0 % (plus de minuterie) | 16,7 ms |
| bibliothèque pleine | 2,3 % | 0 % | 16,7 ms |
| plan (folio 1) | 7,3 % | 2,7 % (le plan, pas la table) | 16,7 ms |

À 10 Hz, la table éveillée tombe sous les 2,5 % demandés (0,8 % au banc). 60 images/s en médiane partout.
`tests/vitesse.js` (le navigateur entier) : **28 % d'un cœur éveillée, 4 % endormie**, à une charge de 24.

### L'accueil (« comme l'écran d'accueil d'un iPhone »)

La vitrine de la pause : la pile de trois feuilles et sa flaque de lumière, le titre en affiche, une phrase, deux gestes
(« Ouvrir une installation… » clair et ses deux touches `Ctrl` `O` ; « Nouvelle installation » au verre), une ligne
pour le dépôt, le dock de verre en bas (l'Exemple, la base des contrats, « Reprendre » quand un plan est resté sur la
table). Elle se pose en cascade une fois, puis les deux câbles de la vignette se tracent.

Ce que j'ai corrigé en la regardant :
- **le titre se cassait en deux à 1920** : « Ouvrez votre installation » (v74) est plus long que « Ouvrez votre
  retest », et l'affiche était bornée à 18 caractères. Il tient maintenant sur une ligne à 1440 (42 px) comme à 1920
  (52 px), et ne passe à la ligne, équilibré, que dans une fenêtre étroite (`.bi-titre.bi-affiche`, la colonne à 760 px) ;
- **la phrase suit l'affiche** : 15 px à 1440, 17 px à 1920 (`clamp`), au lieu de 15 px partout.

Captures : `apres/accueil-clair-1440.png`, `apres/accueil-sombre-1920.png` (avant : `avant/accueil-*.png`, la v74 sans
la vitrine) ; `etats/e-accueil-reprendre-clair-1440.png` (le dock avec « Reprendre »),
`etats/e-bulle-base-clair-1440.png` (la phrase de la base dans sa bulle) ; gros plans ×2 dans `zoom/`.

### La bibliothèque

« Reprendre » en verre et ses folios en puces, l'intertitre au filet et le rangement à droite, les cartes en vraies piles
qui s'éventent au survol, l'Exemple au trait, le mot qui passe en bas (jamais sur le titre), les cartes qui glissent à
leur place (FLIP). Vérifiés en 1440 et 1920, clair et sombre : `apres/pleine-*.png`, `apres/survol-carte-*.png`,
`apres/installation-*.png`, `etats/e-focus-reprendre-clair-1440.png` (l'anneau de glace).

Corrigé :
- la tête disait « 1 installation · 0 plan » quand la carte dit « aucun plan » ; elle dit maintenant « aucun plan » elle
  aussi (`nPlans`) ;
- **le fil de la barre du haut** (`#en-install`, sur le plan) : depuis la pause, c'est son nom seul qui s'élide et sa
  bulle déborde du bouton ; mais le bouton gardait le `text-overflow:ellipsis` du chrome, si bien que `tests/ux.js` le
  lisait comme un texte rogné sans bulle (« ExempleExemple : ses plans », un défaut NOUVEAU de la fusion). Le bouton ne
  coupe plus rien (`text-overflow:clip`, dans mon fichier, sur `#en-install` seulement).

## 3. Les demandes du lecteur, et leur réponse

| le lecteur | la réponse |
|---|---|
| « Le fond est statique : ça doit un petit peu bouger. » | Deux nappes de lumière dérivent sans cesse tant qu'on est là (47 et 61 s), la lueur révèle la grille sous la main, un courant passe de temps en temps. Lent et calme ; le mouvement réduit fige tout ; 90 s sans la main, elle s'endort. |
| « Comme l'écran d'accueil d'un iPhone. » | Une composition au centre optique (la pile, l'affiche, deux gestes) et un dock de verre en bas, avec ses tuiles comme des applications. |
| « La beauté d'abord. » | L'affiche sur une ligne à 1440 et 1920, la phrase à la taille de l'écran, les gros plans ×2 regardés un par un (pile, dock, gestes, carte, « Reprendre », éventail). |

## 4. Les batteries

La machine était partagée avec les autres lots : une charge de 16 à 28 sur 4 cœurs pendant tout le travail.

- **`tests/bibliotheque.js`** : **72 contrôles, tout tient** (sur la version finale, et avant elle sur la fusion). Le
  premier passage avait expiré sur la conversion en lot (l'attente du zip, 120 s, à une charge de 28) — le passage
  « final » de la v73 avait expiré au même endroit : c'est ce qui la laissait « non vérifiée ». L'attente est portée à
  300 s ; le contrôle juge ce qui sort, pas la vitesse d'une machine prêtée. Deux accords de libellés corrigés (« une
  installation corrigée (Excel, relue) », « une installation glissée »).
- **`tests/vitesse.js`** : **11 contrôles, tout tient** (l'outil prêt en 1,3 s ; la table éveillée 28 % d'un cœur pour
  tout le navigateur, endormie 4 %, à une charge de 24).
- **`tests/ux.js`** (le juge de l'ergonome), complet, quatre passes et le mouvement réduit :

  | | avant (816b249, la v74 sans la pause) | après (la fusion finie) |
  |---|---|---|
  | défauts distincts | **41** | **38**, dont `#en-install`, corrigé depuis (revérifié sur les écrans où il paraît) |
  | contrôles passés | 50 / 88 | 53 / 88 |
  | défauts de MON domaine | **4** : la touche Ctrl+O à 1,47:1 (accueil, bibliothèque) ; « 1 problème » de l'Exemple en `--ko` sur la nuit, 3,1:1 ; le « ⋯ » de la tête d'une installation sans bulle ; l'anneau de « Reprendre » à 1,02:1 | **0** (le défaut nouveau de la fusion, `#en-install`, corrigé et revérifié : `ux-apres-t3.txt`) |

  Sur les écrans accueil, bibliothèque, installation (et le plan, où paraît le fil), il ne reste que les 14 défauts
  « lecture » du folio à 100 % (lot D). Un `#btnMenu` « aucune bulle au survol (470 ms) » a paru une fois sur l'accueil,
  à la première passe, sous une charge de 20 ; rejoué seul, il passe (la bulle du chrome attend 400 ms).
  Les défauts qui restent appartiennent aux autres lots : le folio à 100 % (D), le récapitulatif et ses liens à 21 px,
  `#ba-filtre` (E), les documents qui ne rendent pas le clavier au ⋮ (Vos fichiers, Normes, Bible, Hypothèses), les
  sources coupées des Normes (N), la ligne « Exporter » rognée du menu (le chrome).
- **`tests/toutes.js`** (sur la fusion, avant le correctif de `#en-install`) : **22 batteries sur 23** — barrettes 258/258,
  references 64/64, format-retest 28/28, disjoncteur 86/86, interface, chrome 43/43, bibliotheque, controle 38/38,
  fiche, fwd, memoire 9/9, retouche, dessin, affinage, couverture 75/75, normes, see 74/74, placement, vitesse, parcours
  (137 contrôles, 0 échec), pdf 30/30, visio 30/30 ; **`ux` en échec, comme attendu**, sur les défauts des autres lots
  (34 échecs · 38 défauts distincts · 54 contrôles passés sur 88). Après le correctif, les batteries qui lisent
  `#en-install` ont été rejouées sur la version finale : bibliotheque (72, tout tient), interface (tout tient), parcours
  (137 contrôles, 0 échec), chrome (43/43) — `toutes-t3.txt`.

Les sorties sont dans `ux-avant.txt`, `ux-apres.txt`, `ux-apres-t3.txt`, `biblio-t2.txt`, `biblio-t3.txt`,
`toutes.txt`.

## 5. Ce qui reste

- **La veille à 90 s** est gardée (la spécification) : un lecteur qui lit un folio deux minutes sans toucher la souris
  retrouve une table immobile ; le premier geste la relance en 1,2 s. Si le lecteur trouve que « ça s'arrête », on peut
  allonger `TABLE.veilleApres` (le coût éveillé est maintenant faible, 0,8 % au banc), ou garder une dérive à quart de
  vitesse au lieu de l'arrêt.
- **La sortie de la bibliothèque vers le plan** reste une coupe franche (non spécifiée ; plusieurs batteries lisent
  l'état `hidden` tout de suite).
- **Le mot « installation »** (v74) sert maintenant à deux choses sur ces écrans : le fichier du lecteur (« Ouvrez votre
  installation », « Glissez vos installations ici ») et le classement par ECP (« Nouvelle installation », les cartes).
  C'est la décision de la v74, gardée telle quelle ; dans une installation, « Ajouter un plan » puis « Glissez vos
  installations ici » se lit un peu en double. À trancher avec le lecteur.
- **Demandes aux autres domaines**, encore ouvertes depuis la v73 (aucun lot v74 ne tient ces fichiers) :
  1. `src/style.css` (le chrome) : le souffle est mort — `#table .ta-souffle{…}`, `@keyframes ta-respire`, le jeton
     `--table-souffle` et, dans le mouvement réduit, `#table .ta-souffle{opacity:.75}` ne servent plus (aucune div
     `.ta-souffle` dans la page). Inoffensifs ; à retirer par qui tiendra le chrome.
  2. `src/08-references.js` (`importerReferences`, l. 247) : une base déposée depuis la bibliothèque ouvre encore « Vos
     fichiers » par-dessus (l'ergonome v73, P2) ; la bibliothèque montre déjà les installations créées. Proposé :
     `if (!(typeof bibliothequeOuverte === 'function' && bibliothequeOuverte())) ficheFichiers('base');`
  3. `src/08-interface.js` (`couleursDesRoutes`, lot D) : la couleur d'une route par son nom (PUISSANCE violette partout),
     le code est dans `docs/v73/corrections/table-accueil.md`, § 7.

## 6. Fonctions exposées aux autres domaines

- `rangeesLibres()` (08-table) : les rangées de points que rien ne couvre (le courant y passe).
- `tableOccupee()`, `tableCouverte()` (08-table) : la table attend pendant un long travail, se fige sous une feuille
  pleine page. Un nouveau long travail (un autre lot, un autre export) peut s'y ajouter d'une ligne.
- `TABLE.hz`, `TABLE.veilleApres` (08-table) : la fréquence de la dérive et le délai de la veille, pour un banc.
- `body.biblio-accueil` (posée par `rendreBibliotheque`) : la barre du haut transparente sur l'accueil.
