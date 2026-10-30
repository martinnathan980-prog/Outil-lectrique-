# v74 — Lot D : le folio, la recherche, Ctrl+K

Branche `worktree-agent-a66e63cf7b9eca085` (worktree `.claude/worktrees/agent-a66e63cf7b9eca085`), partie de `816b249`.
Trois commits : `efd64da` la fusion de `origin/v73-pause-folio` (conflits résolus, rien d'autre), `5623dfe` la fin du
lot, puis ce rapport. `index.html` n'est pas commité (l'intégrateur le reconstruit).

Fichiers touchés : `src/06-dessin.js`, `src/style-palette.css`, les sections « la planche » (les flèches), « les folios »,
« la recherche », « la palette » et « aller à un repère » de `src/08-interface.js`, plus **une ligne commentée** dans
« tout relier » (la touche ← →, voir § 1.5) ; `tests/dessin.js`, `tests/retouche.js`. La fusion apporte en plus ce que
la branche en pause avait déjà touché : `src/style-dessin.css`, `tests/placement.js`, `tests/interface.js`,
`tests/parcours.js`, `tests/ux.js` (un faux positif, déjà dit en v73).

## 1. Ce que le brief demandait, et ce qui est fait

### 1.1 La fusion de la branche en pause

`git merge origin/v73-pause-folio` : deux conflits dans `src/08-interface.js`, deux dans `tests/interface.js`.
Résolus en gardant tout ce que la v74 a fait :

| Conflit | Gardé |
|---|---|
| les flèches qui poussent le bloc choisi (la planche) | la garde des panneaux de la v73 (carte, fiche, récapitulatif, palette) **sans** `!$('relief').hidden` : le relief est supprimé, il ne revient pas |
| l'en-tête de l'index | le bouton ⤢ de la v74 (`boutonTaille()`) **et** la bulle « Fermer · Échap » de la v73 sur la croix |
| `tests/interface.js` (deux mises en place) | `atelier.exempleSansCalibreAuto()` (v74) **et** `VUE.cadrage = 'feuille'` (v73) |

Rien d'autre de la v74 n'était touché par la branche (les mots « installation », « ajoutée par Volta », la croix du
récapitulatif, la consommation, les routes sont dans d'autres fichiers). La page fusionnée se charge sans `pageerror`
(vérifié avant le commit de fusion, puis à chaque construction).

La branche en pause était « non finie, non vérifiée » : tout ce qu'elle annonçait (rapport v73,
`docs/v73/corrections/folio.md`) a été rejoué — batteries et captures — sur la v74. Il tient, avec les retouches
ci-dessous.

### 1.2 Le folio lisible

Venu de la v73, vérifié : « 100 % » est l'écriture à sa taille (un numéro de câble à **11 px** d'écran, `S100`) ;
aucune écriture du folio sous 9 px à 100 % ; trois paliers de zoom sémantique (sous 7 px, les petites écritures se
taisent, ce qui est allumé parle) ; la loupe (le câble survolé ou choisi lève son numéro à 11 px) ; le plan s'ouvre
cadré sur son dessin (au plus 100 %) ; le dessin se range de l'esquisse au définitif ; le folio et sa pastille glissent.

**v74 — le mot du lecteur sur le folio.** Le calibre retenu d'un disjoncteur s'écrivait « 15 A » et, dessous,
« (retest 10 A) ». Le folio dit maintenant **« (installation 10 A) »** ; quand la place manque à côté du symbole (le cas
de 102CB1), le mot entier passe sur deux lignes, « installation » puis « 10 A » ; l'abrégé « install. 10 A » ne vient
qu'en dernier, et sans place du tout la ligne se tait (le symbole passe avant). Même chose dans la bulle du bloc. Avec la
règle du calibre (v74), l'exemple a déjà MS3320-15 écrit : le folio n'écrit alors que « 15 A ». À l'écran, à
l'impression, au SVG, au PNG, au dossier PDF (`calibresDuFolio` → `calibresAuFolio`, 08-export).

### 1.3 L'objet trouvé qui pulse ; la recherche qui pardonne

Venus de la v73, vérifiés : un anneau de glace autour du bloc (le long du câble) s'élargit et s'efface deux fois
(2 × 300 ms) après le glissement de la vue — recherche, index, renvois, palette ; le mouvement réduit s'en passe.
« w012 », « W 012 », « w12 » → W-012 ; « disjoncteur » → la ligne « Disjoncteurs » (l'onglet du récapitulatif) puis
chacun ; « 300xc1b5 » → la borne ; « W-0122 » → « Vouliez-vous dire W-012 ? ».

**v74** :
- un repère sans désignation ni description (102CB1) ne laisse plus une ligne vide (« repère · ») : il dit sa nature, et
  son calibre pour un disjoncteur (« disjoncteur · 15 A »), dans la recherche comme dans la palette ;
- **Tab dans la recherche** (relevé par ux sur la construction fusionnée : « `#q-opt-2` — Tab y mène, mais on ne le voit
  pas ») : les lignes de la liste étaient des boutons atteints par Tab ; le champ perdait le clavier, la recherche se
  fermait 120 ms plus tard et le clavier restait sur une ligne cachée (« avant » passait selon la vitesse de la machine).
  Les lignes ne prennent plus Tab (`tabindex="-1"`, le patron d'une liste déroulante) : ↓ ↑ les choisissent depuis le
  champ (`aria-activedescendant`), un clic les prend, Tab quitte la recherche.

### 1.4 La palette Ctrl+K et « Comment Volta réfléchit »

Venue de la v73, vérifiée : `ouvrirPalette()` (le raccourci global l'appelle), un verre de nuit au centre ; les
actions d'abord (lues sur le menu ⋮, avec leur touche), « À reprendre » (les gestes du contrôle), les folios, puis
« Sur le plan » (la recherche qui pardonne) ; ↑ ↓, Entrée, Échap, Tab qui reste dedans, le clavier rendu d'où il venait.

**v74** :
- **« Comment Volta réfléchit »** : la palette l'offre dès que `ficheComprendre` existe (`typeof ficheComprendre ===
  'function'`), avec ou sans plan, parmi les premières actions (palette vide) et à « comment », « comprendre »,
  « pourquoi », « aide », « cuisinier »… ; Entrée appelle `ficheComprendre()`. Si le lot N met aussi une ligne dans ⋮ ›
  Plus (son mot contient « Comment Volta réfléchit »), la palette garde **celle du menu** (une seule ligne, sous la clé
  `comprendre`), avec ses mots.
- Les mots d'atelier des actions disent « installation » (« installation corrigée », « charger une installation ») ; les
  anciens mots (« retest ») trouvent toujours.
- La ligne qui explique (le pourquoi d'un point à reprendre) passe sur deux lignes au lieu d'être coupée au milieu d'une
  phrase ; au-delà, une bulle (`data-bulle`, plus de `title=`) la donne entière.

### 1.5 Les flèches

Venu de la v73, vérifié : un bloc choisi se pousse aux flèches (un carreau, cinq avec Maj), même quand la carte vient
de prendre le clavier sur elle-même ; ses contrôles (cadran, champs, listes) gardent les leurs ; rien de choisi, ← →
changent de folio.

**v74 — un défaut trouvé et corrigé** : ← → changeaient de folio même quand le clavier était sur un **bouton** de la
carte, du récapitulatif, de l'index, de la palette ou du menu — la carte se fermait sous la main. `flechesAuFolio(t)`
(« les folios ») dit si la flèche peut aller au folio voisin ; la touche globale (« tout relier ») l'appelle — une ligne,
commentée. La carte qui tient le clavier sur elle-même laisse toujours les flèches au plan.

### 1.6 Petites remises en ordre

Quatre commentaires de la branche en pause disaient « GLISSE_FOLIO » (un remplacement trop large) : rendus à « GLISSE ».

## 2. Les batteries

`NODE_PATH=/opt/node22/lib/node_modules`, sur une copie de l'`index.html` construit (la machine est partagée).

| Batterie | Résultat |
|---|---|
| `tests/dessin.js` | **66 / 66**, tout tient (4 contrôles ajoutés ou mis à jour, ci-dessous) |
| `tests/placement.js` | **28 / 28**, tout tient |
| `tests/retouche.js` | **78 / 78**, tout tient (1 contrôle ajouté) |
| `tests/interface.js` | **154 / 154**, tout tient (sur la construction qui précède la dernière retouche, `tabindex` des lignes de la recherche) ; rejouée sur la finale : 153 / 154, voir ci-dessous |
| `tests/ux.js` | mon domaine : **0 défaut** (plan, index, recherche ; quatre passes) — voir « ux, avant / après » |
| `tests/toutes.js` | **19 / 23** sur la construction finale ; les 4 échecs ne viennent pas du lot (ci-dessous) |

`tests/toutes.js`, construction finale, machine partagée (charge de 16 à 30 sur 4 cœurs pendant le passage) :
barrettes 258/258, references 64/64, format-retest 28/28, disjoncteur 86/86, controle 38/38, fiche, fwd, memoire 9/9,
**retouche**, **dessin**, affinage, couverture 75/75, normes, see 74/74, **placement**, vitesse, parcours (137, 0 échec),
pdf 30/30, visio 30/30 : verts. Les quatre échecs, rejoués un par un :
- **chrome** (42/43 dans `toutes`, 41/43 rejouée) : « un bouton pressé s'enfonce de --presse (.97) » et « le double du
  menu s'efface en 120 ms, puis s'en va » (encore là après 400 ms). Deux mesures de temps du menu ⋮ ; la construction
  d'**avant la fusion échoue aussi** (« bouton pressé », 42/43, même charge). Rien du lot ne touche au menu.
- **interface** (1 échec) : « survoler un fil de la fiche l'allume sur le plan » — la ligne est mesurée, puis survolée ;
  entre les deux la carte bougeait encore (`anims: 1`) et la souris est tombée sur le plan (`sous: rep-big`). Le même
  contrôle passait sur la construction précédente, identique pour ce chemin (154/154). La charge.
- **bibliotheque** (délai dépassé) : la conversion en lot de six contrats ne rend pas son zip en 120 s ; la construction
  d'**avant la fusion s'arrête au même endroit** (57 contrôles passés, puis le même délai). Lot A / la charge.
- **ux** : le juge de l'ergonome ; il échoue tant qu'il reste un défaut, où que ce soit (voir plus bas).

Contrôles **mis à jour** (`tests/dessin.js`) : « (retest 10 A) » → le calibre que la règle a écrit n'a rien dessous
(l'exemple v74), et, sur `atelier.exempleSansCalibreAuto()`, « installation 10 A » sous « 15 A », à l'écran et à
l'export, et jamais « retest ». **Ajoutés** : la palette offre « Comment Volta réfléchit » et l'appelle (une page de
remplacement le temps du contrôle tant que le lot N n'est pas fusionné ; absente sans elle) ; la recherche au clavier
(↓ choisit une ligne sans quitter le champ, Tab quitte la recherche et la liste se ferme) ; `tests/retouche.js` : le
clavier sur la croix de la carte, → ne change pas de folio, la carte reste, le bloc ne bouge pas.

### ux, avant / après

| | toutes passes, tous écrans | dont mon domaine (plan, index, recherche) |
|---|---|---|
| **avant** (`816b249`, la v74 sans la fusion) | **40** défauts distincts, 50 contrôles passés sur 88 | **15** : 14 « lecture » (à 100 %, `filnum` 6,5 px, `connpin` 5,7, `bpnum` 4,1, le cartouche 6 à 8,5…), 1 nom (`#in-fermer`, la croix de l'index sans bulle) |
| fusion + lot, construction intermédiaire | **27** défauts distincts, 52 / 88 | **2** : `#q-opt-0`, `#q-opt-2` — Tab menait à une ligne cachée de la recherche (corrigé ensuite, § 1.3) |
| **après** (construction finale, `--ecrans=plan,index,recherche`) | — | **0** — « tout tient » sur les quatre passes |
| **après** (construction finale, complet ; le même dans `toutes`) | **26** défauts distincts, 52 / 88 | 0 du lot ; 1 de plus qu'à la construction intermédiaire : `#btnBible` (la bulle du rail n'a pas paru en 470 ms, écran « plan », 1440 clair seulement) — le passage limité aux écrans du plan, sur la même construction, ne le relève pas : une mesure de temps sous charge, au chrome |

Les 25 autres défauts qui restent sont tous hors de mon domaine : le récapitulatif (`#ba-filtre` 1,46:1 et
1,81:1, « Voir », « Aller », « Voir les câbles » à 21 px — lot E), la bibliothèque et l'accueil (« Ctrl+O » 1,47:1,
« 1 problème dans 1 plan » 3,1:1, l'anneau de « Reprendre » 1,02:1, le « ⋯ » d'une installation sans bulle — lot A), les
documents (`#fi-fermer` sans bulle, `#nm-q`, les sources des normes coupées, la Bible à 23 px, Échap et le clavier
des quatre documents — N et E), la fiche (le « ? » de la courbe à 18 px — F), le menu (« Exporter · l'installation
corrigée · 3 chang… » coupé depuis que le mot s'allonge — le chrome).

## 3. Captures regardées

Dans `/tmp/claude-0/-home-user-Outil-lectrique-/d44a74ef-5d4e-5d70-aef6-303c6243d2ca/scratchpad/v74D/` (hors dépôt) :
`cap1/` (ouverture, folio 3 en carte, 100 %, recherche « w12 », trouvé, « Vouliez-vous dire », palette, index — 1440 et
1920, clair et sombre), `cb/` (102CB1 et « installation / 10 A »), `pal/` (la palette : vide avec « Comment Volta
réfléchit », « comment », « 102 », « regler »), `lp/` (la loupe sur la carte du folio 3), `gl/` (le folio qui glisse,
image par image).

## 4. Ce qui reste

- La vue d'ensemble d'un grand folio (le 3, cadré à 49 %) : les repères des blocs y font 8,8 px — lisibles, mais sous la
  règle des 9 px de l'ergonome (qui ne la pose qu'à 100 %). Les lever d'un cran en carte demanderait de redimensionner
  les boîtes : pas fait.
- Le « moment wow » n° 3 de l'ergonome (Tab entre dans le dessin, ← → ↑ ↓ de bloc en bloc le long des câbles) : pas fait.

## 5. Fonctions exposées aux autres domaines

- `ouvrirPalette()`, `fermerPalette(rendre)`, `paletteOuverte()` — la palette (A2 l'ouvre sur Ctrl+K).
- `ficheComprendre()` — **attendue du lot N** ; la palette la teste (`typeof … === 'function'`). Une ligne de menu dont
  le mot contient « Comment Volta réfléchit » est reprise telle quelle.
- `pulser({ type: 'bloc', nom })` / `pulser({ type: 'fil', f })` — l'objet qui pulse deux fois (« aller à un repère »).
- `flechesAuFolio(cible)` — vrai si ← → peuvent changer de folio (le clavier n'est pas sur un contrôle d'un panneau).
- `calibresDuFolio(nom)` — `{ calibre, retest }`, le calibre que le folio écrit et celui de l'installation s'il diffère.
- `candidats(q)` — la recherche qui pardonne (la palette et la barre s'en servent).

## 6. Demandes aux autres domaines

- **`src/08-visio.js`** (aucun lot v74 ne l'a ; à l'intégrateur) — la demande v73 tient : la regex de `dessinPourVisio`
  ne connaît toujours pas le `data-i` que `06-dessin.js` pose sur `text.filnum` (relu dans le code v74 ; la v73 avait
  mesuré 0 place retrouvée sur 8 au folio 1). Remplacer par :
  ```js
  /<text class="filnum"(?: data-i="[^"]*")?(?: transform="rotate\(-90 [^)]*\)")? x="(-?[\d.]+)" y="(-?[\d.]+)"[^>]*>([^<]*)<\/text>/g
  ```
  et, pour que Visio écrive aussi le calibre de l'installation comme le folio :
  `const disj = n => typeof calibresAuFolio === 'function' ? calibresAuFolio(n) : { calibre: calibreAuFolio(n) };`
- **A — `src/style-table.css`** : la règle `.dessin-fondu` est morte (le fondu n'existe plus, le dessin se range) ;
  elle peut partir.
- **F — la fiche, après « Passer en DR12 » / « Changer les câbles »** : appeler
  `pulser({ type: 'fil', f: app.dessin.fils.find(w => w.cable === cable) })` pour chaque câble touché du folio — le plan
  montre où la correction est tombée (technicien v73, M, P3).
- **N — `ficheComprendre()`** : rien à faire de plus pour la palette ; si la page a une ligne dans ⋮ › Plus, garder
  « Comment Volta réfléchit » dans son mot.
