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
- **Le placement, réécrit, et le routeur, réécrit** : le placement est un
  moteur par étapes nommées — modèle, niveaux par flux, rangées et flancs,
  ordonnées exactes, ordre des blocs et des bornes, assemblage, juge
  (sain, tient, droits − croisements, muets, encombrement), estimation
  rapide et recherche locale confirmée au routage réel, concours. Les
  masses sont des pastilles collées à leur borne. Le routeur donne à chaque
  fil la forme la moins chère, met les piquages en retrait, ordonne les
  pistes de chaque goulotte exactement jusqu'à douze ; la mesure des fils
  droits est honnête et les croisements évitables valent zéro.
- **Deuxième départ du placement** (avant la réécriture) : une masse par
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
  le plan est l'écran, posé sur une table ; un rail de commandes à gauche
  (base, recherche, annuler, folios, cadrage, zoom, liaison, bible, ouvrir,
  menu), réglette de folios en bas, rien dans la page qui ne se presse pas ;
  recherche par repère ou numéro de fil
  qui change de folio ; le cuivre du fil pour seul accent ; aucune police ni
  image extérieure. **La base à côté du plan** : un panneau (droite, ou
  tiroir bas sur téléphone) montre les liaisons, éditables cellule par
  cellule, et c'est la base qui redessine le plan ; cliquer un bloc la filtre
  sur lui, survoler une ligne allume le fil. Ouvrir est dans le menu (et
  Ctrl+O, et le dépôt) : on ne le fait qu'une fois.
- **Le dessin parle fil** : un croisement se lit par un pont sur le fil
  horizontal ; un piquage se dessine comme la barrette qu'il faudra poser
  (pointillé, points, numéros) ; les bornes d'un équipement sont dans une
  pièce de connecteur hors du corps, sa lettre au-dessus.
- **La bible et le suivi** (`09-barrettes`) : une seule table, lue dans un
  Excel ou un CSV de l'atelier par le nom des colonnes (Référence, Bornes,
  puis Famille, Nature, Jauge min, Jauge max, Intensité, Blindage, Mobile,
  Note) ; la Nature dit barrette (jonction, blindage), prise de coupure ou
  connecteur (l'embase, avec sa partie mobile). Une barrette et une prise
  reçoivent la référence la plus logique (bornes à loger, jauge des fils lue
  dans le type, blindage, famille déjà employée), qui se lit dans leur
  carte, pas sur le plan ; un connecteur d'équipement dit la partie mobile
  à poser. Le suivi
  du contrat liste tout ce qu'on pose et s'exporte en CSV. La bible embarquée
  n'est qu'un exemple, sans valeur normative.
- **Les connecteurs** : une borne « A12 » est la borne 12 du connecteur A,
  sinon le connecteur est le part number porté par le retest et reçoit une
  lettre ; une borne sans chiffre (CNT) n'est d'aucun connecteur. Le dessin
  pose les bornes d'un connecteur dans une pièce fine hors du corps, sa
  lettre au-dessus ; un connecteur peut se couper sur deux flancs quand
  chaque borne regarde ainsi vers son partenaire. La prise de coupure se
  dessine en deux rectangles collés, angles vifs : l'embase, la plus fine,
  plus haute, numérotée, et la partie mobile, plus large et moins haute. La barrette est une
  ligne pointillée, un point par fil, tous les numéros du même côté, un
  point de départ en bas avec le repère, chaque borne une pastille avec son
  numéro dedans, le pont en trait plein aussi fin que le pointillé. La masse
  est collée à sa borne, dans l'axe du fil, perpendiculaire à l'équipement,
  le fil juste assez long pour son numéro, son repère petit sous les barres.
- **La barrette physique** (`physiqueDeBarrette` dans `09`, le dessin dans
  `08`) : la carte d'une barrette ou d'une prise de coupure est d'abord un
  DESSIN, de face — tous les modules de la référence retenue, numérotés au
  pas, les libres hachurés, chaque paquet de bornes réunies par un shunt
  dessiné en peigne de cuivre sur ses modules, et sous chaque module ses
  fils de tous les folios réunis (n° de câble, folio en badge, « repère:borne »
  d'en face) : ce qui arrive (amont) au-dessus, ce qui repart (aval) en
  dessous. La réglette passe à la ligne sans couper un paquet quand elle ne
  tient pas en largeur. Survoler un module allume ses fils sur le plan et
  marque ses lignes dans la table ; cliquer un fil le cadre, même sur un
  autre folio, la barrette restant choisie. La prise se dessine éclatée :
  partie mobile (fiche) en haut où arrivent les fils d'amont, partie fixe
  (embase) en bas d'où repartent ceux d'aval, contacts face à face. La table
  sous le dessin est la base filtrée sur le repère ; le choix de la
  référence (raisons, candidates) est replié dessous. La bible porte un
  pictogramme par référence et dessine celle qu'on clique en grand.
- **L'exemple en trois folios** : facile, moyen, très chargé (66 liaisons).
- **Le juge voit ce que l'œil voit** (`04-placement`, banc) : un corps
  étiré, un segment partagé par deux fils, un fil qui fait le tour de son
  bloc coûtent des croisements (1,5 ; 2 ; 1,5) ; une borne peut changer de
  flanc, les replis concourent, la passe finale converge sur le meilleur.
  Le banc rejoue a posteriori les gestes évidents (échange, flanc,
  glissement) au même barème, et rend 1 s'il en manque un.
- **Un croisement vaut deux fils droits, une barrette se pose par paquet**
  (`03-graphe`, `04-placement`) : un croisement pour rien se voit avant un
  fil plié, donc un échange de bornes qui ôte un croisement en pliant un
  fil se fait ; les bornes pontées ensemble d'une barrette font un module
  dessiné là où il sert, petit ; les finalistes du concours se comparent sur
  la géométrie resserrée. 86,0 %, 13 croisements, 0 évitable sur dix-huit
  topologies ; le folio chargé ne converge pas encore dans son budget (le
  banc le dit).
- **Base de retest** : mise de côté dans `a-venir/09-retest.js` avec ses
  contrôles (`tests/retest.js` se passe si elle n'est pas dans la page).
- **Contrôles** sur l'API `atelier` : 17 + 5 + 13, banc de 15 topologies, 39 sans navigateur pour la bible, les connecteurs, le suivi et la barrette physique.

Le compte : **6 685 lignes en un fichier → 2 600 lignes en neuf modules**, dont
moins d'un cinquième de commentaires, tous au présent.

Ce qui attend tes tables (le modèle les prévoit, le code ne les invente pas) :
la vraie bible des barrettes (l'outil sait la lire, il ne la connaît pas),
la table des types de câble (jauge, conducteurs, blindage — aujourd'hui lue
dans le code du type : DR24 → 24, ML… → blindé), les normes de connecteur,
sections et intensités, calibres, fichier de localisation pour les règles de
coupure (`a-venir/regles-de-coupure.js`).
