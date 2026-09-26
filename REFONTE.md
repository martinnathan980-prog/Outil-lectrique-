# Refonte — ce que le code fait, ce qu'on garde, ce qu'on rebâtit

## 1. Recensement de l'existant (`index.html`, 6 685 lignes)

| région | lignes | verdict |
|---|---|---|
| HTML + CSS (enveloppe) | 655 | refaite la semaine dernière, direction « atelier » — à reprendre proprement |
| référentiel des repères | 82 | **vivant** : grammaire `<numéro><CODE><suffixe>`, VT / VC / G |
| placement (`computeLayoutWith`) | **1 947 dans une seule fonction** | le cœur — à porter étape par étape, mesuré |
| concours de graines (`computeLayout`) | 149 | à réduire : voir la mesure ci-dessous |
| routage (`routeAll`) | 386 | **vivant**, à porter |
| rendu SVG | 1 194 | feuille, cartouche, symboles, repères de fil — bon, à nettoyer |
| lecture Excel / CSV | 100 | **vivant** : lecteur exact des 16 colonnes du retest |
| folios | 130 | vivant |
| base de retest (RB, IDENT, PROCHE, APPLI) | 1 240 | **vivant**, validé par 43 contrôles — à porter tel quel, nettoyé |
| interface, export, persistance, historique | 570 | à refaire avec l'enveloppe |
| SheetJS (lecteur Excel) | 624 Ko | bibliothèque, ne se relit pas |

**32 % du texte est du commentaire** : 1 848 lignes, dont 912 en blocs narratifs
et 25 blocs qui racontent une mesure ou un essai abandonné. Ce journal a été
utile pour décider ; il n'a rien à faire dans le code qu'on relit. Il est dans
`git log`, où est sa place.

**Sept drapeaux de candidat ne sont jamais activés** (SPREAD_LEAF, SEG_STRIP,
TAP_GROUP, PIN_SWAP, SIDE_FREE, PF_OPT, OPT_NOGROW) : dix-sept branches
gardées par `typeof X!=='undefined'&&X` qui ne s'exécutent jamais.

**Restes de fonctions retirées** : mode anonyme (`anonMode`, `topoRail`,
`topoStrip` — pour la base anonymisée, partie), verrous d'exploration (`ORDH`,
`OVR` — l'exploration est partie), `folioBackup`.

## 2. La mesure qui décide de la forme du nouveau moteur

Le concours essayait 7 graines × 4 regroupements × 2 (éclatement), puis un
resserrage et une condensation : jusqu'à **22 rendus complets** par dessin.
Ablation sur les 14 topologies du banc plus le contrat réel :

| ce qu'on essaie | fils droits | croisements | contrat réel | temps |
|---|---|---|---|---|
| tout (référence) | 96,1 % | 8 | 83 % / 6 | 4 318 ms |
| **7 graines seules** | **96,1 %** | **8** | **83 % / 6** | **1 688 ms** |
| une seule graine | 95,3 % | 26 | 72 % / 24 | 414 ms |
| + regroupement, + éclatement, + resserrage, + condensation | 96,1 % | 8 | 83 % / 6 | 4 065–4 363 ms |

**Les graines font tout le travail. Le reste ne change pas un pixel** et coûte
2,6 secondes par rendu. Le nouveau moteur, c'est donc : **un pipeline de
placement, sept graines, le serpentin en secours.** Rien d'autre.

## 3. Ce qu'on garde — parce que c'est mesuré

- les deux invariants sacrés : aucun fil à travers un bloc, aucun chevauchement ;
- le critère : **le nombre de fils parfaitement droits**, croisements en départage ;
- le solveur exact d'ordonnées (union des nets + plus-long-chemin + détente) — c'est
  lui qui rend les fils droits ; le tri barycentre (Sugiyama) autour ;
- bornier entier (pas fragmenté) sous 60 repères ;
- le serpentin pour les rubans (34:1 → 0,85:1) ;
- le lecteur exact des 16 colonnes du retest ;
- le langage du dessin : une encre, une échelle de traits, masse IEC, réglette VT,
  prise VC en deux demi-corps, repères de fil qui glissent le long du segment ;
- la base de retest : empreinte, contrats proches, différentiel, écriture / annulation ;
- le banc de placement et les contrôles : **ce sont eux qui jugent la refonte**.
  Cible de parité : 96,1 % · 8 croisements · 0 violation · contrat 83 % / 6
  (chiffres de la parité ; ceux d'aujourd'hui sont dans `tests/LISEZMOI.md`).

## 4. Ce qu'on rebâtit, et comment

### Structure
```
src/
  01-modele.js      le contrat : liaisons, équipements, cartouche ; grammaire des repères
  02-lecture.js     Excel / CSV → contrat (retest exact, puis repli libre)
  03-graphe.js      nœuds, broches, partenaires, composantes, niveaux
  04-placement.js   colonnes, voies, serpentin, ordonnées (solveur exact), format de page
  05-routage.js     goulottes, pistes, peignes
  06-dessin.js      feuille, cartouche, symboles, fils, repères de fil
  07-folios.js      découpe en folios
  08-interface.js   planche, fiches, recherche, folios, historique, persistance
  10-demarrage.js
  page.html, style.css
a-venir/09-retest.js  base de retest : identification, proches, différentiel, pièces
lib/xlsx.min.js     SheetJS, inchangé
construire.js       concatène src/ + lib/ → index.html   (node, zéro dépendance)
tests/              banc-placement (l'arbitre), controle, memoire, format-retest
```
Le livrable reste **un seul fichier `index.html`, hors ligne, sans réseau**.
On développe en modules parce qu'un fichier de 6 000 lignes ne se relit pas ;
on livre un fichier parce que c'est comme ça qu'on s'en sert.

### Règles du nouveau code
- une fonction fait une chose ; aucune ne dépasse 150 lignes ;
- un commentaire dit **pourquoi**, jamais l'histoire ; les mesures vont dans `git log` ;
- pas de drapeau global : les options sont des paramètres ;
- pas de code « au cas où » : ce qui n'a pas de test ni d'usage n'entre pas ;
- français partout, noms métier (liaison, borne, repère, bornier, folio).

### Ordre
1. **Fondation** — modèle, lecture, `construire.js`, banc adapté ; l'ancien fichier
   devient `ancien/index.html`, oracle des mesures pendant la transition.
2. **Moteur** — graphe → placement → routage, porté étape par étape, chaque étape
   mesurée au banc contre l'oracle. Parité exigée avant de passer à la suite.
3. **Dessin, folios, interface** — direction « atelier », propre.
4. **Base de retest** — portée, ses 43 contrôles avec.
5. **Bascule** — le nouveau `index.html` remplace l'ancien quand il fait au moins
   aussi bien sur chaque banc ; `ancien/` disparaît.

### Les couches à venir (déjà prévues dans le modèle)
Chaque liaison porte un `pnDe` / `pnVers` (le part number du connecteur) et un
`cable` : c'est par là qu'arriveront les normes de connecteur, le nombre de
modules, la section, l'intensité, la chute en ligne et le calibre. Le modèle
les attend ; les tables viendront de toi.

## 5. Où on en est

Fait, mesuré, en place :

- **Fondation** : `src/01-modele`, `02-lecture`, `construire.js`, `lib/xlsx.min.js`.
- **Moteur** : `03-graphe`, `04-placement`, `05-routage` — parité EXACTE au banc
  avec l'ancien moteur (mêmes surfaces, mêmes formats, 96,1 %, 8 croisements,
  contrat 83,3 %/6) en 2,5 fois moins de temps. Sept graines, resserrage des
  goulottes, condensation par glissement de broches, serpentin. Aucun drapeau.
  Deux de ces trois passes avaient été jugées « sans effet » par l'ablation de
  la section 2, qui ne mesurait que la droiture : elles agissent sur la
  densité et sur la compacité des blocs. Vérifié bloc par bloc sur le contrat
  d'essai : les douze blocs sortent aux mêmes coordonnées qu'avant.
- **Deuxième départ du placement** (après la parité) : une masse par
  équipement desservi, un shunt de réglette porté en pont et non routé, la
  barrette VT en réglette, les feuilles d'un bloc réparties des deux côtés,
  plus d'étirement pour remplir la feuille. Banc à métrique durcie (une
  barrette qui tranche un fil est un croisement) : 96,0 %, 14 croisements,
  3 cas hors feuille au lieu de 7, surface totale 6060 → 5130 ; contrat
  d'essai 83,3 % / 6 → 88,9 % / 2, densité 29,4 → 37,8 %.
- **Troisième départ du placement** : un seul juge pour tout le concours
  (sain, tient sur la feuille, fils droits, croisements, encombrement sur
  la feuille, emprise, barrettes) ; une borne qui parle des deux côtés se
  dédouble sur les deux flancs ; les fils servis par une barrette sortent du
  solveur d'ordonnées ; un fil qui enjambe une colonne passe entre deux
  blocs (contraintes de couloir) et le routeur le trace droit ; les feuilles
  d'un hub se rangent sur deux colonnes quand elles sont nombreuses ; le
  serpentin replie chaque composante sur ses rangées et emboîte ses fils de
  retour. Banc : 96,7 %, 4 croisements, 0 cas hors feuille, surface totale
  5287 ; contrat d'essai 18 fils droits sur 18, 3 croisements, format 1,85.
- **Langage du dessin** (`06-dessin`) : prise de coupure en deux colonnes de
  cellules numérotées des deux côtés, fiche dans embase ; réglette à cellules
  d'un pas, shunt en pont ; masse CEI sous un collecteur ponctué.
- **Le site, reparti de zéro** (`page.html`, `style.css`, `08-interface`) :
  le plan est l'écran, posé sur une table sombre ; commandes flottantes en
  deux coins, réglette de folios en bas ; une seule fiche à la fois
  (équipement, fil, table, cartouche, collage), en tiroir bas sur téléphone ;
  recherche par repère ou numéro de fil qui change de folio ; le cuivre du
  fil pour seul accent ; aucune police ni image extérieure.
- **Base de retest** : mise de côté dans `a-venir/09-retest.js` avec ses
  contrôles (`tests/retest.js` se passe si elle n'est pas dans la page).
- **Contrôles** sur l'API `atelier` : 17 + 5 + 13, banc de 15 topologies.

Le compte : **6 685 lignes en un fichier → 2 600 lignes en neuf modules**, dont
moins d'un cinquième de commentaires, tous au présent.

Ce qui attend tes tables (le modèle les prévoit, le code ne les invente pas) :
normes de connecteur (`pnDe` / `pnVers`), sections et intensités, calibres,
bibles de barrettes et de prises de coupure, fichier de localisation pour les
règles de coupure (`a-venir/regles-de-coupure.js`).
