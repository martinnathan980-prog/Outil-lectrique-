# Volta v73 — domaine B « Les fiches » : rapport du correcteur

## Branche et commit

- **Branche** : `worktree-agent-a347dcfff985784f2`, dans le worktree `.claude/worktrees/agent-a347dcfff985784f2`.
- **Point de départ** : `claude/schematic-generator-tool-hih0lj`, au socle 66059fc.
- **Fusion du domaine C** : la branche de base a été fusionnée à **f96f0cd**.
- **Commit** : **un seul commit**, **`0fcba18`**, posé sur f96f0cd. Le commit temporaire et la fusion ont été repliés
  dedans.
- **`index.html`** : rendu à son état de f96f0cd. Il n'est pas dans le commit.

Après la fusion, j'ai chargé la page dans Chromium et ouvert cinq fiches et un câble : **aucune `pageerror`**
(`sonde-fusion.txt`). J'ai trouvé deux collisions de noms et je les ai évitées :

- **`pourquoiDuCalibre`** : la fiche avait sa propre fonction de ce nom. Elle masquait celle du moteur, et
  `causeDuDisjoncteur` recevait alors `null`. La mienne s'appelle maintenant `raisonDuCalibre`.
- **`volta`** : c'était un nom déjà pris (`10-demarrage.js`). L'enveloppe d'origine s'appelle `parVolta`.

Fichiers touchés, tous du domaine B :

- `src/08-fiche.js` ;
- `src/08-disjoncteurs.js` et `src/08-courbe-dj.js` ;
- `src/08-sections.js` et `src/08-carte.js` ;
- `src/style-fiche.css`, `src/style-sections.css`, `src/style-carte.css` ;
- `src/style-dj.css` et `src/style-courbe.css`, les feuilles de `08-disjoncteurs.js` et de `08-courbe-dj.js`. Elles ne
  sont pas citées dans le brief, mais aucun autre domaine ne les a, et l'historique les range dans les commits
  « Fiches ».

Tests mis à jour ou ajoutés : `tests/fiche.js`, `tests/disjoncteur.js`, `tests/interface.js`, `tests/couverture.js`,
`tests/parcours.js`. `tests/ux.js` n'a pas été touché.

Les captures, les planches et les outils sont rangés dans
`/tmp/claude-0/-home-user-Outil-lectrique-/d44a74ef-5d4e-5d70-aef6-303c6243d2ca/scratchpad/v73/corrections/fiches/` :

- `avant/` et `apres/` : 15 écrans × 1440 / 1920 × clair / sombre ;
- `planches/` : les planches image par image ;
- `essai2/` : les essais ciblés ;
- `ux-avant.txt`, `ux-1.txt`, `ux-apres.txt`, `ux-apres2.txt` : les passes du juge ;
- `toutes.txt` : la batterie complète ;
- `outils/` : les scripts.

---

## 1. Les batteries

`node tests/toutes.js`, lancée à la fin sur le commit : **voir § 1 bis** (le résultat y est recopié).

Ces batteries ont été rejouées une à une pendant le travail, puis **toutes vertes après la fusion du domaine C** :

| batterie | avant mes mises à jour | après la fusion |
|---|---|---|
| `disjoncteur` | 2 KO, puis plantage (`.dj-arc-n` disparu) | **0 échec** (30 s) |
| `fiche` | 8 KO | **0 échec** (121 s) |
| `interface` | 3 KO, puis plantage (`.dj-h-ko` disparu) | **0 échec** (191 s) |
| `controle` | — | **0 échec** |
| `couverture` | — | **0 échec** |

### Les tests rendus obsolètes, mis à jour

Chaque message de test le dit (« test v72 mis à jour : … »).

- **`disjoncteur.js`**
  - « Calibre » est ouvert d'office. Son résumé dit « 10 A juste · retest → 15 A proposé ».
  - La clé du cadran est en trois mots.
  - Le cadran est fait de **boutons** : il n'y a plus de `text.dj-arc-n`.
  - « À la main » donne **toute** la gamme.
  - Le 10 A retenu est **juste** (ambre), plus « ne passe pas » (rouge).
  - La marche du démarrage et les pastilles du profil sont ambre.
  - La bulle de la courbe dit « juste : touche la courbe ».
  - « Changer les câbles », sous le 10 A retenu, met W-012 et W-015 en **DR16** : la ligne suit le calibre retenu.
  - Le 9,5 A permanent se lit sur la ligne du verdict (« 10 A déclenche — il ne garantit que 8 A… »).
- **`fiche.js`**
  - « Par rapport au retest · N modifications » remplace « N changements écrits ici », et le PN apparaît avec sa colonne
    (« PN1 (102CB1) »).
  - 3 problèmes au lieu de 4 : le 10 A juste est « à voir ».
  - La carte de décision est ambre et compacte (« Les 3 câbles » replié, plus de « et N autres points »).
  - La gamme reste ouverte après un choix.
  - La pastille rouge du connecteur ne double plus la bulle B.
  - La fiche du câble porte la CAUSE (« Tout régler », « Seulement W-012 : DR16 ») à la place de « Le plus fin qui suit
    le 15 A : DR12 ».
- **`interface.js`**
  - Les genres de l'index : `att|calibre` au lieu de `ko|calibre`.
  - Toute la gamme.
  - La ligne du verdict à la place de `.dj-h-ko`.
  - La puce « 102CB1 · 10 A » à la place du lien « sous 102CB1 ».
  - Le contrôle peut encore dire « juste — il touche la courbe » du retest.
- **`couverture.js`** : 3 problèmes rouges et un « 10 A juste : il touche la courbe » à voir, sous le 10 A retenu.
- **`parcours.js`** : « 4 problèmes · n à voir » au départ, puis 2 après W-015 en DR12. Le contrôle dit « juste — il
  touche la courbe ».

### Les tests ajoutés (`fiche.js`, bloc « v73 »)

1. **Un vrai clic sur le cran 5**, qui déclenche, le retient. Le héros passe au rouge, la ligne du verdict dit
   « 5 A déclenche » et pourquoi, le contrôle le relève. Le cran ne bouge pas sous la souris (± 2 px à 1,3 s).
2. **Le cadran au clavier.**
   - **←** met le 10 en aperçu, sans rien écrire.
   - **Échap** revient au 15 sans fermer la carte, et le clavier reste sur le cran.
   - **→ puis Entrée** retient le 20 (MS3320-20), et le clavier reste sur son cran.
3. **« Tout le catalogue MS3320 (13) ».** Les 6 calibres hors des préférés sont marqués et dits dans leur bulle. L'un
   d'eux se retient d'un clic.
4. **La règle des bulles.**
   - Avant 400 ms, aucune bulle. Après un vrai mouvement, celle d'« À la main » paraît.
   - Le clic l'éteint, et elle ne revient pas sur la gamme ouverte tant que la souris ne bouge pas.
   - Au clavier, celle de × paraît tout de suite.
5. **Le clavier de la carte.** Ouverte d'un clic sur le plan, la carte prend le clavier et Tab commence dedans. Échap
   la ferme et rend le clavier.
6. **La galerie de 668VT31.** Les 2 modules qui logent sont dessinés, les 27 autres suivent, chacun avec « loge n / 4 »
   et sa raison. Un module qui ne loge pas se retient : il est marqué « main » et rouge, et les problèmes le disent.
7. **300XC1 B.** « Changer » est là. La liste couvre toute l'EN 4165-002 (30 arrangements), « loge 5 / 6 — B5 : DR12
   trop gros pour un #16 » en tête, avec un filtre.
8. **Le contact à sertir.** « Automatique » ne paraît qu'une fois. Les autres contacts de la taille suivent, chacun
   avec ✓ ou ✕.

Le geste « Tout régler » et la protection jugée sous le calibre écrit ont été vérifiés par
`outils/cable-essai.js`. Les sorties sont recopiées au § 3.10.

### 1 bis. `tests/toutes.js` à la fin

La passe complète a tourné sur le commit `0fcba18`, avec `index.html` reconstruit (`toutes.txt`). Résultat : **22
batteries sur 23 vertes**.

- **Vertes** :
  - barrettes 258 / 258, references 64 / 64, format-retest 28 / 28, disjoncteur 83 / 83 ;
  - interface, bibliotheque, controle 38 / 38, fiche, fwd, memoire 9 / 9 ;
  - relief, retouche, dessin, affinage, couverture 75 / 75, normes, see 74 / 74 ;
  - placement, vitesse, parcours (138 contrôles, 0 échec, 16 frottements connus), pdf 30 / 30, visio 30 / 30.
- **En échec : `ux` seul** (38 échecs, 47 défauts distincts, sur tous les écrans de l'outil). C'est le juge commun.
  Sur la v72, le panel comptait 95 défauts ; le domaine C en relevait 75 sur sa branche. **Aucun de ces défauts n'est
  dans les fiches** : les 9 écrans des fiches ne gardent que `#q`, `#fo-strip` et les écritures du folio (§ 2).
  J'ai relancé le juge seul, sur tous les écrans (`ux-complet.txt`, même total). Aucun défaut ne touche `#ba-equip`,
  `#inspecteur` ni une classe des fiches. Ceux qui en ont l'air sont ailleurs :
  - la méta « 4 problèmes dans 1 plan » de la bibliothèque, à 3,1:1 (A1) ;
  - `#fi-fermer`, la croix des documents (Vos fichiers, normes, bible, hypothèses), sans bulle (E).

---

## 2. Le juge `tests/ux.js` sur le domaine

Écrans :

- `fiche-disjoncteur`, `fiche-calibre-a-la-main`, `fiche-aide`, `fiche-plus` ;
- `fiche-connecteur`, `fiche-barrette`, `fiche-prise` ;
- `fiche-cable`, `fiche-masse`.

Passes : 1440 et 1920, clair et sombre, `--sans-mouvement`.

| | avant (`ux-avant.txt`) | après la fusion (`ux-apres-fusion.txt`) |
|---|---|---|
| total | 22 échecs · 43 défauts distincts | 10 échecs · 16 défauts distincts |
| **défauts du domaine B** | **27** | **0** |

Les 27 défauts du domaine B :

- **contrastes (8)** : `#eq-rep`, `#fil-num` et 3 champs des tuiles du câble, sans bord ; 3 « ? » à 2,3:1 ;
- **cibles (5)** : 4 « ? » de 15 à 17 px, « supposée » à 63 × 15 ;
- **noms (4)** : l'épingle, ×, le crayon et « ⋯ », sans bulle au clavier ;
- **coupes (1)** : la barre des problèmes rognée sans bulle ;
- **focus (7)** :
  - « À la main », « Changer les câbles » et un « ? » sous la bulle d'un « ? » restée ouverte ;
  - « Copier la fiche » et « Supprimer », dont seul le fond changeait ;
  - deux champs de tuile, avec un anneau à 1,2:1 ;
- **choix (2)** : les crans ne se cliquaient pas, et « À la main » montrait 2 calibres sur 7.

Une marque de la courbe, en sombre (`text.dj-grad.in`, 4,10:1), a été vue dans `ux-1.txt` puis corrigée.

Ce qui reste n'est pas au domaine B :

- `#q`, le champ de la recherche : 1,47:1 (A2 / D) ;
- `#fo-strip button.chip`, l'anneau du focus : 1,4 à 1,6:1 (A2, la barre des folios) ;
- `#svg text.*`, les écritures du folio à 100 % : 14 défauts (D).

---

## 3. Point par point

### 3.1 Le calibre, moment signature n° 2 (`08-disjoncteurs.js`, `style-dj.css`)

- **Chaque cran est un bouton** de 30 × 30, qui a la touche et l'anneau du focus. Sa bulle dit son mot et son pourquoi
  chiffré (« 5 A — déclenche : il ne garantit que 4 A en permanence, il en faut 5 A », « 7,5 A — déclenche : 9,31 A au
  démarrage pendant 2,1 min… »). Le cran du retest porte un anneau en pointillé.
- **Un clic retient** le calibre, même s'il ne passe pas. Tout suit :
  - l'index longe l'arc (rAF, 120 ms par cran, 420 ms au plus, courbe qui glisse) ;
  - le chiffre roule ;
  - la ligne du verdict s'écrit dans sa couleur (« 5 A déclenche — il ne garantit que 4 A… ») ;
  - la bande de la courbe glisse (300 ms, `--courbe-glisse`, au lieu de 220 ms).

  Ctrl+Z défait. Planches `planches/S2-cadran-tourne-light.png` et `-dark.png` : de 15 à 5, le chiffre passe par 10 et
  7,5, et l'index rouge descend l'arc.
- **« À la main » propose TOUTE la gamme.** Les calibres qui déclenchent ont un trait rouge et ✕, le juste est en
  ambre, ceux qui passent ont ✓. Tous se cliquent. La gamme reste ouverte : on essaie, on compare.
- **« Tout le catalogue MS3320 (13) »** montre les 6 calibres hors des « calibres préférés », et le dit : leur bulle
  le précise, et la ligne « vos calibres préférés : 1 · 3 · 5 · 7,5 · 10 · 15 · 20 A » est sous la gamme.
- **Au clavier.**
  - ← → (et ↑ ↓) mènent l'index en aperçu, rien n'est écrit (« Aperçu — Entrée le retient »).
  - Début va à l'automatique, Fin au plus gros.
  - Entrée retient, et le clavier reste sur le cran.
  - Échap revient au calibre retenu sans fermer la carte.

  L'index roving se fait avec `tabindex`. Un écouteur en capture arrête les flèches avant celles du plan, qui
  poussaient le bloc 102CB1 (voir la demande à D).
- **Un calibre qui ne passe pas, retenu, est rouge partout** : le héros, la ligne du verdict, le cran, le résumé de la
  section, le contrôle, la fiche du câble.
- **La proposition non écrite se dit partout.** Le résumé de « Calibre » donne « 10 A juste · retest → 15 A
  proposé ». Le héros dit « 15 A proposé ». La ligne du verdict dit « Proposé : pas encore écrit dans le retest ».
  C'est la réponse au technicien (n° 1) et à l'ergonome : « est-il à 10 ou à 15 ? ».
- **La carte de décision** est sur la surface, avec un filet de 3 px de son état et le titre en couleur. Elle tient
  dans environ 180 px : « Les 3 câbles » est replié, « Garder le 10 A… » est un lien. La section « Calibre » est
  ouverte d'office, et le cadran se voit dans la carte (`apres/disjoncteur-1440-clair.png`).
- **La ligne « câbles à grossir »** suit le calibre retenu (« 2 câbles à grossir avec le 10 A » : DR16). « Changer les
  câbles » applique ce qu'elle dit.
- **Un composant commun pour le récapitulatif.** `choixDuCalibre(nom, tout)` rend les crans et la gamme, chacun avec
  `{ calibre, cle, mot, etat, raison, retenu, auto, retest, hors, bulle }`. Voir la demande à E.

### 3.2 Les trois mots, partout

Le fiche, le cadran, la gamme, la bulle de la courbe (`08-courbe-dj.js`), le contrôle (`controleDisjonction`), la carte
de décision (« Gardé tel quel, il se dira « juste » ») et la fiche du câble disent tous « passe », « juste » ou
« déclenche ». Juste veut dire « il touche la courbe, sans la marge », et c'est un point **à voir**, en ambre.

**Branché sur le domaine C (fusionné).**

- `motsVerdict()` lit `VERDICTS_CALIBRE`, et `cleDuVerdict(g)` lit `verdictDeCalibre(g)`.
- La bulle de chaque cran et de chaque puce de la gamme est **la phrase du moteur**, `pourquoiDuCalibre(app.norme, d,
  cal)` (« 5 A — déclenche : démarrage et transition, 9,31 A pendant 2,1 min »). La ligne détaillée du verdict, sous le
  cadran, garde la nôtre (`raisonDuCalibre`, le temps où il coupe).
- `MOTS_VERDICT_FICHE` ne sert plus que de repli si la table manque.
- « Changer les câbles », « Passer en 15 A… » et « Passer en DR12 » passent par `avecOrigineVolta` : la colonne Origine
  du retest corrigé les marque « proposition de Volta acceptée ».

### 3.3 Le même patron pour tous les choix (`08-fiche.js`)

Un composant commun, `ligneCandidat` et `autresCandidats`, sert à la fois aux modules et aux arrangements. Chaque
ligne porte :

- une marque : ✕ en rouge (il ne loge pas tout), ! en ambre (il loge, mais à plusieurs ou hors du choix d'office) ;
- son nom et « loge n / N » ;
- sa raison sur une ligne de 12 px.

Les lignes vont du plus proche au plus loin, et toutes se cliquent. Le candidat retenu à la main est pressé, marqué
« main », et rouge s'il ne loge pas.

- **Les modules de barrette** (`galerieModules`, `raisonDuModule`).
  - La galerie montre toute la norme : « 2 sur 29 logent ces 4 potentiels d'un seul module ». Les 2 qui logent sont
    dessinés, puis viennent les 27 autres.
  - La raison est calculée par le moteur (`placerDansModule`, `remplirModules`) : « bornes 8-9-10 : 4 câbles, ses
    groupes en reçoivent 3 au plus », « aucun de ses contacts n'admet DR20 (W-301) », « 3 groupes pour 4 potentiels
    — il en faudrait 2 ».
  - L'onglet NSA 937901, qui disait « aucun », montre ses 45 modules avec leur raison.
  - La puce du module se marque main et rouge quand un module forcé ne loge pas.
  - « Le retest dit E0599-1A101Z » donne maintenant pourquoi l'outil l'écarte.
  - La galerie n'est calculée qu'à l'ouverture.
- **Les arrangements** (`listeArrangements`, `autresArrangements`).
  - **« Changer » ne disparaît jamais**, même sur 300XC1 B qu'aucun arrangement ne loge.
  - La liste couvre toute l'EN 4165-002 : « Automatique », ceux qui logent, puis les 30 autres (« 99-10 · loge 5 / 6 ·
    B5 : DR12 trop gros pour un #16 », « pas de contact 7, 8 »…), avec un filtre.
  - La prise de coupure suit le même patron.
- **Les contacts à sertir** (`choixSertir`).
  - « Automatique » ne paraît qu'une fois : sa référence n'est plus répétée dessous.
  - Suivent TOUS les contacts de la table de la norme pour cette taille et ce sexe, chacun avec ✓ (il admet le type et
    la gauge du câble) ou ✕ (avec, dans sa bulle, ce pour quoi il est fait). Ceux qui admettent le câble passent
    d'abord, et tous se cliquent.
  - Un contact forcé qui n'admet pas le câble se marque rouge dans la table des contacts (`contactForce`).

### 3.4 La carte se déplie du bloc, moment signature n° 1 (`08-carte.js`)

Ce travail vient de la première partie de la session (`naitreCarte`, `resorberCarte`, `serrerLeViseur`,
`echelleDuBloc`). Il a été revu en sombre :

- `planches/S1-carte-deplie-dark.png` : la carte se déplie à échelle uniforme en 340 ms, sur la courbe d'entrée. Le
  contenu se lit dès 20 ms, sans dalle vide sur les voisins.
- `planches/S1b-carte-resorbe-dark.png` : la carte se résorbe en 240 ms, sur la courbe de sortie, vers le centre du bloc.
  Elle est éteinte dès 70 %.

Le placement a été corrigé aussi (`placerPres`). Le cas venait de la galerie d'une barrette ouverte : la carte grandissait
alors jusque **sur la barre des folios** (vu dans `essai2/barrette-galerie-1440-clair.png`).

- La barre du bas plafonne maintenant la hauteur d'une place.
- Une place trop basse pour la carte remonte d'autant : la carte reste entière et ne couvre jamais les folios.
- Les petits éléments de la barre, comme la pastille et les traits de 0 px, ne comptent plus.

`interface.js`, « la carte … se lit entière » : vert, à 1440 comme à 1920.

### 3.5 La fiche ne bouge plus sous la souris (`08-fiche.js`)

L'ancre reprend ce que la main ou le clavier vient de toucher : un bouton par son empreinte (sans sa bulle), une
section, une ligne. Après le rendu, elle revient à la même hauteur d'écran.

Quand la fiche est déjà en haut et que ce qui est au-dessus rétrécit (une carte de décision qui s'en va), une **cale**
tient l'élément en place **tant que la main est sur la carte**. Elle se referme en glissant (300 ms) quand la main sort
ou fait défiler la fiche. Avant, elle se refermait seule au bout de 900 ms et l'élément remontait sous la souris : le
test du cran 5 l'a montré, à −14 px.

### 3.6 La règle unique des bulles (`08-fiche.js`, `montrerBulle` / `lierBulles`)

- Une bulle ne paraît qu'après un **vrai mouvement** de la souris (3 px) **après le rendu** de sa boîte.
  - La première attend 400 ms (`--bulle-delai`).
  - Les suivantes paraissent tout de suite pendant `--bulle-chaude`.
- **Au clavier** (`:focus-visible`), la bulle paraît tout de suite et part avec le focus. L'épingle, ×, le crayon et
  « ⋯ » l'ont maintenant. Quand Tab fait défiler la boîte, la bulle du clavier suit son élément.
- **L'appui l'éteint.** L'élément appuyé reste muet tant que la main ne l'a pas quitté, et même si le focus y revient
  après un rendu. Planches `S2` refaites pour le vérifier.
- La bulle **ne couvre jamais ce que le clic vient d'ouvrir**, comme la gamme d'« À la main ».
- Elle reste dans sa carte, à 12 px des bords de l'écran au moins.
- Elle prend la matière commune (`.bulle-texte`). `.fi-bulle` ne garde que son entrée.

### 3.7 Les « ? » et les champs (`style-sections.css`, `style-fiche.css`, `08-sections.js`)

- **Les « ? »**
  - Ils sont dessinés à 18 px, à l'encre `--t-2` sur un cercle `--t-3`.
  - Leur zone de clic fait 28 px : un `::before` invisible, et 16 + 12 px dans les en-têtes de tableau.
  - Plus d'opacité 0,55.
  - Leur bulle se ferme quand le clavier s'en va ailleurs (`focusin`) : plus de bulle ouverte au-dessus de « À la
    main ».
- **Ce qui s'écrit se voit comme un champ.** La règle vaut pour le repère, le numéro du câble, la référence, les cases
  du tableau, les tuiles et le profil :
  - au repos, un pointillé de 1 px `--t-3` dessous, sans fond : c'est l'allure d'une valeur ;
  - au survol, le cadre du champ ;
  - à l'écriture, l'anneau commun, opaque (2 px `--anneau-c`).

  Un numéro qui manque garde son ambre.
- Le reste :
  - « supposée » fait 24 px de haut ;
  - « › » ouvre la fiche d'un câble, en 28 × 28 avec sa bulle ;
  - ‹ › font 32 px avec une icône de 18 px ;
  - la chasse du repère passe à −0,01 em ;
  - « Copier la fiche » et « Supprimer » ont l'anneau commun au clavier.

### 3.8 Aucun texte coupé sans bulle

- La barre des problèmes passe sur deux lignes, et sa bulle donne le texte entier.
- L'intensité « 9,31 / 11,7 A » ne se coupe plus : la colonne prend la largeur du nombre.
- La ligne « Par rapport au retest » et chaque modification ont leur bulle.

### 3.9 Le focus (`08-carte.js`, `prendreLeClavier` / `rendreLeClavier`)

Une carte qui s'ouvre prend le clavier, et Tab commence dedans. Fermée, elle le rend au bouton qui l'avait ouverte ou à
la ligne du récapitulatif, sinon à la page. Le test ajouté (n° 5) est au vert.

### 3.10 La fiche du câble (`08-fiche.js`, `protectionDuCable`, `causeDuCable`, `blocRetest`)

- **Ses PROPRES problèmes, branchés sur le domaine C** (`problemesDuCable(l)`). Ce sont ceux que le contrôle rattache au
  câble, dans ses mots, et chacun n'est dit qu'une fois :
  - la charge ;
  - la protection, par exemple « 14,4 A admis en continu (× 0,6) < calibre 15 A — pas protégé en surcharge », le cas de
    l'ingénieur avec W-012 en DR14 ;
  - le contact contre le calibre ;
  - la chute de son chemin ;
  - la cause.

  La fiche ne refait plus le calcul de la charge ni de la chute. Sans le domaine C, son repli `protectionDuCable` juge
  sous le calibre ÉCRIT. Les **gestes** de chaque point (`gestesDuPoint`) sont sous sa ligne dans la barre des problèmes,
  chacun une fois, sauf ceux que la cause montre déjà. La tuile Intensité passe en ambre.
- **La chaîne de cause**, en tête de la fiche quand le disjoncteur en est la cause : « 102CB1 : le 10 A du retest est
  juste, et il protège W-012. Volta propose 15 A, ce qui demande DR12 ici. »
  Les données viennent du domaine C (`causeDuDisjoncteur`).
- Trois gestes suivent :
  - **« Tout régler : 102CB1 en 15 A et 3 câbles en DR12 »**, par `toutRegler`, avec l'origine Volta, en une entrée
    d'historique ;
  - **« Seulement W-012 : DR16 »**, par `plusFinSousLeRetest` : le plus fin que protège le 10 A *du retest*, et non le
    15 A fantôme ;
  - **« Voir 102CB1 »**.
- **La fiche du câble ne passe pas au vert tant que son disjoncteur est la cause.** Après « Seulement W-012 », elle
  reste ambre. Après « Tout régler », elle est verte, et les liaisons de 102CB1 portent MS3320-15 : c'est ce que le
  retest corrigé écrira (`cable-essai.js`).
- **Son disjoncteur en puce** sous « Intensité » : « 102CB1 · 10 A ⚠ ». Le libellé dit maintenant « le plus fin que
  protège le … ».
- **« Par rapport au retest · 1 modification »** : chaque ligne dit sa **colonne** et son **objet**, et a sa bulle.
  - « Cable T/G (W-012) DR20 → DR16 ↺ ».
  - « PN1 (102CB1) MS3320-10 → MS3320-15 ↺ ».

  Les colonnes sont lues dans `COLONNES_RETEST` (08-export), sinon dans une table identique. Le module d'une barrette
  donne « PN1 · PN2 (668VT31) ».
- **Raccord** : la bulle du « toron Ø » dit d'où vient le diamètre (le nombre de câbles et la règle de foisonnement).
- Une bulle de connecteur (A · B · C) ouvre la section, sur place et allumée. Le « 1 » rouge se tait quand la bulle
  rouge le dit déjà.
- **La masse** : la liste de ses câbles est ouverte d'office.

### 3.11 Ce qui n'a pas été fait (assumé)

- Ingénieur 3.1 P2, la courbe : la feuille 760 × 540 au clic, la bascule A / × In, le réticule en ampères, le repère de
  confiance de la courbe.
- Ingénieur 3.1 P2 : grouper par câble les problèmes du disjoncteur.
- Ingénieur 3.4 P3 : le type « DR20 » en un seul champ.
- Technicien D P3 : griser les gauges qui ne tiennent pas dans la liste.
- Technicien E P2 : les mots de la clé posés sur l'arc. La clé est restée dessous, en trois mots.

---

## 4. Demandes aux autres domaines

**D — `src/08-interface.js`, section « la planche », l'écouteur `keydown` des flèches (vers la ligne 1166).** Les
flèches poussaient le bloc choisi même quand le clavier était dans la carte : un cran du cadran déplaçait 102CB1. La
fiche s'en protège (écouteur en capture et `stopImmediatePropagation` sur `.dj-crans`), mais la règle doit être celle
du plan :

```js
const t = e.target; if (t && t.closest && t.closest('input,textarea,select,[contenteditable],[role="listbox"],[role="menu"],#menu,#inspecteur,#fiche,#base')) return;
```

**C — `09-disjoncteurs.js` et `08-controle.js`.** Ses demandes B-1 à B-4 sont branchées : `problemesDuCable`,
`gestesDuPoint`, `causeDuDisjoncteur`, `toutRegler`, `plusFinSousLeRetest`, `VERDICTS_CALIBRE`, `verdictDeCalibre`,
`pourquoiDuCalibre`, `avecOrigineVolta`.

Pour B-5, « Par rapport au retest » garde son propre calcul, avec les colonnes de `COLONNES_RETEST`, comme C le permet.

Il reste trois points.

1. **Remarque.** Le contrôle juge la protection d'un câble sous le calibre que l'outil PROPOSE, même non écrit : il dit
   « 11,7 A admis < calibre 15 A » après « Seulement W-012 : DR16 », alors que le retest garde son 10 A. Le technicien
   (n° 1) demande de juger sous le calibre écrit tant que la proposition ne l'est pas. Dans `controleDisjonction`
   (08-disjoncteurs, domaine B), la protection de chaque câble est lue dans `d.fils`, qui est calculé sous `d.calibre`.
   Je propose que C fournisse `d.filsEcrits`, la protection sous `d.pn` quand `propositionNonEcrite(d)`, et que la fiche
   et le contrôle lisent ce champ. Je ne l'ai pas changé seul : le compte des problèmes est sa source.
2. **Le niveau de « juste »** (fait des deux côtés). `controleDisjonction` écrit « juste » en **à voir**, comme
   `VERDICTS_CALIBRE.juste.etat` : l'exemple fait « 4 problèmes ». La fusion de `couverture.js` s'est faite sans conflit.
3. **Le contact supposé d'une borne de disjoncteur** (l'ingénieur, 3.1 P2 : « taille 23 supposé » sur un MS3320).
   - Dans `protegerFil` (09-disjoncteurs), un fil sans contact connu par un plan prend la taille usuelle de sa jauge,
     alors que la borne d'un disjoncteur se raccorde par cosse.
   - Proposition : `08-disjoncteurs` passe déjà `taille` et `contactRepere` quand un plan le connaît. Que le moteur
     **taise le contact quand aucun n'est connu et qu'un bout est un disjoncteur** :

     ```js
     const taille = f.taille || (f.borneDeDisjoncteur ? '' : (protection && protection.tailleContact) || tailleDeJauge(norme, f.famille || '', jauge)), ic = taille ? intensiteDeContact(norme, taille, jauge, null, f.fut != null ? f.fut : null) : null;
     ```

     Je poserai `borneDeDisjoncteur: true` dans `d.contexte.fils` (08-disjoncteurs) dès que C l'accepte.

**E — `src/08-recap.js`.** La liste des calibres au double-clic devrait lire `choixDuCalibre(nom, tout)`
(08-disjoncteurs), le même composant que le cadran et la gamme de la fiche. Ce composant rend
`[{ calibre, cle, mot, etat, raison, retenu, auto, retest, hors, bulle }]`, avec le catalogue entier si `tout`.

**Le propriétaire de `src/08-explications.js`.** Le « ? » de la gamme est déjà corrigé par C. Celui de la masse doit
dire la règle : un câble par goujon ou par cosse, la gauge maximale, la chute de retour (ingénieur, 3.4 P3).

**D — `src/06-dessin.js`.** Mettre des crochets pleins sur l'occurrence cliquée d'un repère dessiné plusieurs fois, et
des pointillés sur les autres (668VT31 ; technicien, F P3).

**A2 — `src/style.css`.**

- L'anneau du focus des puces de `#fo-strip` est à 1,4 à 1,6:1.
- Le bord de `#q` est à 1,47:1.

Le juge les relève sur tous les écrans des fiches.

**DESIGN.md (le socle).** À reporter dans le document :

- la carte fait 420 px, 500 px à partir de 1800 px de large, et 680 px de haut au plus ;
- les trois mots du verdict ;
- la règle unique des bulles ;
- les champs au pointillé ;
- les « ? » à 28 px.

---

## 5. Les captures qui le disent

- `avant/a-la-main-1440-clair.png` → `apres/a-la-main-1440-clair.png`, et `apres/a-la-main-1920-sombre.png` : la gamme
  passe de 2 puces à 7 calibres avec leur mot, le catalogue et les préférés.
- `avant/disjoncteur-1440-clair.png` → `apres/disjoncteur-1440-clair.png` :
  - la carte de décision rouge de 320 px devient une carte ambre et compacte ;
  - le cadran est visible dans la carte ;
  - le cadran affiche « 15 A proposé ».
- `avant/connecteur-b-1440-clair.png` → `apres/connecteur-b-1440-clair.png` (« Changer » présent) et
  `apres/connecteur-b-changer-*.png` (toute la norme).
- `avant/barrette-galerie-*.png` → `apres/barrette-galerie-autres-1440-sombre.png` et
  `apres/barrette-galerie-nsa-*.png` (les 27 et les 45 autres modules, avec leur raison).
- `avant/contact-a-sertir-*.png` → `apres/contact-a-sertir-*.png` : plus d'Automatique en double, et ✓ / ✕ sur chaque
  contact.
- `avant/cable-*.png` → `apres/cable-1920-sombre.png` : la cause, « Tout régler », « Seulement W-012 : DR16 », et les
  champs au pointillé.
- `apres/masse-1440-clair.png` : les trois câbles sont visibles d'office.
- Planches :
  - `planches/S1-carte-deplie-{light,dark}.png` ;
  - `planches/S1b-carte-resorbe-{light,dark}.png` ;
  - `planches/S2-cadran-tourne-{light,dark}.png`.
