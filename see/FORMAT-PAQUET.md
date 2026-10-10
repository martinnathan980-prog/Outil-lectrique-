# Le paquet SEE — le contrat entre l'Atelier et le pilote

L'Atelier Schéma sait placer et router chaque folio. Le **pilote** (macros Excel
`see/vba/*.bas`) sait commander SEE Electrical Expert. Entre les deux, un seul
fichier : le **paquet SEE**, un classeur Excel `.xlsx` qui décrit chaque folio
déjà dessiné, en millimètres sur la feuille. L'Atelier l'écrit (menu « Exporter
pour SEE », ou `node see/exporter.js` en lot), le pilote le lit et le dessine
dans SEE. Ce document est la référence des deux côtés : on ne change pas une
colonne sans le changer ici d'abord.

Format : `paquet-see/1`.

## Conventions

- **Unité** : le millimètre, sur la feuille A3 paysage de l'Atelier
  (420 × 297 mm), arrondi au centième.
- **Origine** : le coin **haut gauche** de la feuille ; **x vers la droite,
  y vers le bas** (comme l'écran). Le pilote convertit vers le repère de SEE par
  ses réglages (origine, sens de y, échelle) ; rien de propre à SEE n'est écrit
  dans le paquet.
- **En-têtes** : la première ligne de chaque feuille, en ASCII, sans accent
  (`Repere`, pas `Repère`), pour que les macros les retrouvent sans souci
  d'encodage. Le pilote retrouve une colonne **par son nom**, jamais par sa
  place : on peut en ajouter à droite sans rien casser.
- **Nombres** : de vrais nombres Excel (pas du texte), sauf la colonne `Points`
  des fils, qui est un texte au format ci-dessous.
- **Vide** : une cellule vide veut dire « inconnu » ou « sans objet ».
- **O / N** pour les booléens.
- **Identifiants** : `Folio` est le rang du folio (1, 2, 3…), dans l'ordre de
  l'Atelier. `Bloc` est unique **dans un folio** (`B1`, `B2`…) : un même repère
  peut avoir plusieurs blocs (une barrette coupée en morceaux, une masse posée
  à chaque fil).

## Feuille `Paquet` — l'en-tête

Deux colonnes, `Cle` et `Valeur`.

| Cle | Valeur |
|---|---|
| `format` | `paquet-see/1` |
| `outil` | `Atelier Schéma` |
| `version_moteur` | la version du moteur de placement (`VERSION_MOTEUR`) |
| `date` | date et heure de l'export, ISO 8601 |
| `fichier` | le nom du retest d'origine |
| `contrat` | le titre du cartouche |
| `folios` | le nombre de folios du paquet |
| `unite` | `mm` |
| `origine` | `haut-gauche` |
| `axe_y` | `bas` |
| `feuille_l` | `420` |
| `feuille_h` | `297` |

## Feuille `Folios` — une ligne par folio

| Colonne | Contenu |
|---|---|
| `Folio` | rang du folio dans le paquet (1…n) |
| `Plan` | la valeur FWD du retest, telle quelle |
| `Nom` | le nom proposé pour le folio dans SEE (le plan, nettoyé : pas de `\ / : * ? " < > \|`) |
| `Harness` | le harness des liaisons du folio (s'il est unique) |
| `Titre`, `Indice`, `Dessine`, `Date` | le cartouche de l'Atelier |
| `Echelle` | `k` de l'Atelier : unités du dessin par unité de feuille (un folio chargé a un grand `k`) |
| `Pas` | l'écart entre deux bornes voisines, en mm, à cette échelle |
| `CadreX`, `CadreY`, `CadreL`, `CadreH` | la zone utile de la feuille (cadre moins marges moins cartouche), en mm |
| `NbBlocs`, `NbBornes`, `NbFils` | les comptes du folio |
| `Droits`, `Croisements` | le jugement du placement (fils droits, croisements) |
| `Remarque` | ce que l'export a dû simplifier sur ce folio, sinon vide |

## Feuille `Blocs` — ce qui est posé sur le folio

| Colonne | Contenu |
|---|---|
| `Folio`, `Bloc` | l'identifiant |
| `Repere` | le repère (`601RC`, `668VT31`, `904G`, `VT1`…) |
| `Nature` | `EQUIPEMENT`, `BARRETTE`, `BARRETTE_A_POSER`, `PRISE`, `MASSE`, `RAIL`, `COLLECTEUR`, `RENVOI` |
| `Code` | le code du repère (`RC`, `CB`, `VT`, `VC`, `G`…), celui de l'Atelier (`CODES`) |
| `PN` | le part number de l'équipement s'il est unique, sinon vide (ceux des connecteurs sont dans `Connecteurs`) |
| `Description` | la désignation (Description1/2 du retest, ou celle saisie dans l'Atelier) |
| `X`, `Y`, `L`, `H` | le **corps** du bloc : rectangle, coin haut gauche, largeur, hauteur (mm). Pour un équipement, le corps sans les pièces de connecteur ; pour une barrette, la colonne pointillée ; pour une masse, le symbole |
| `RepereX`, `RepereY` | où l'Atelier écrit le repère (le point d'ancrage du texte, centré) |
| `Sens` | pour une `MASSE` ou un `RAIL` : le côté d'où arrive son fil, `G`, `D`, `H` ou `B` ; sinon vide |
| `Morceau` | pour un repère posé en plusieurs morceaux : 1, 2…, sinon vide |

Natures :
- `EQUIPEMENT` : un calculateur, un relais, un disjoncteur… ses bornes sont
  groupées en connecteurs (feuille `Connecteurs`).
- `BARRETTE` : une barrette (VT) du retest, ou un de ses morceaux ; ses bornes
  sont des pastilles, les pontages sont des fils `Shunt = O`.
- `BARRETTE_A_POSER` : une barrette que l'Atelier propose de poser
  (dédoublement d'une borne), repère provisoire `VTn` ; le fil qui la relie à la
  borne d'origine est un fil sans numéro (`Fil` vide, « à créer »).
- `PRISE` : une prise de coupure (VC) : la fiche (amont, à gauche) et l'embase
  (aval, à droite), contact face à contact.
- `MASSE` : une masse (`…G`), posée au bout de son fil.
- `RAIL` : un rail d'alimentation (`L1`, `N`, `PE`…), posé comme une masse.
- `COLLECTEUR` : une masse reliée à plusieurs blocs, dessinée en barre.
- `RENVOI` : un renvoi vers un autre folio (`▷F3`), quand l'Atelier a découpé
  un plan.

## Feuille `Connecteurs` — les pièces de connecteur d'un équipement

| Colonne | Contenu |
|---|---|
| `Folio`, `Bloc`, `Repere` | à qui il est |
| `Lettre` | la lettre du connecteur (`A`, `B`…) ; pour une prise : `FICHE` ou `EMBASE` |
| `PN` | son part number, s'il est connu |
| `Cote` | `G` (flanc gauche) ou `D` (flanc droit) |
| `X0`, `X1`, `Haut`, `Bas` | le rectangle de la pièce (mm) ; un connecteur coupé en plusieurs pièces a une ligne par pièce |
| `LettreX`, `LettreY` | où l'Atelier écrit sa lettre |

## Feuille `Bornes` — chaque point où arrive un fil

| Colonne | Contenu |
|---|---|
| `Folio`, `Bloc`, `Repere` | à qui elle est |
| `Connecteur` | la lettre de son connecteur (vide pour une borne hors connecteur ; `FICHE` / `EMBASE` pour une prise) |
| `Borne` | l'étiquette telle que dans le retest (`A12`, `51B`, `3`) — c'est la clé que les fils citent |
| `Numero` | ce qui s'écrit dans la pièce (`12` pour `A12`) |
| `Cote` | `G`, `D`, ou `C` (centrée : une pastille de barrette, une masse) |
| `X`, `Y` | le **point d'accroche du fil** (mm) : le bout exact où le tracé du fil commence ou finit |
| `PX`, `PY` | le centre de la borne dessinée (la pastille d'une barrette, le numéro dans la pièce) |
| `Contact` | le contact à sertir que donne l'Atelier, s'il est connu |
| `Sexe` | `F` ou `M`, s'il est connu |

Une borne de prise a deux lignes : son côté `FICHE` (accroche à gauche) et son
côté `EMBASE` (accroche à droite), même `Borne`.

## Feuille `Fils` — chaque fil, avec son tracé

| Colonne | Contenu |
|---|---|
| `Folio`, `Ordre` | le folio et le rang du fil dans le folio (1…n) |
| `Fil` | le numéro du fil (Cable tag) ; **vide** pour un fil à créer (raccord d'une barrette à poser) |
| `DeBloc`, `DeRepere`, `DeBorne` | le bout de départ (`DeBorne` = la colonne `Borne` de `Bornes`) |
| `VersBloc`, `VersRepere`, `VersBorne` | le bout d'arrivée |
| `DeCote`, `VersCote` | pour un bout sur une prise : `FICHE` ou `EMBASE` ; sinon vide |
| `Type` | Cable T/G (`DR22`) |
| `Jauge` | la jauge AWG lue dans le type (`22`), si elle se lit |
| `Blinde` | `O` / `N` |
| `Route` | la route (cheminement) |
| `Couleur` | la couleur de la route sur le plan de l'Atelier, `#rrggbb` |
| `Longueur` | la longueur du retest, en m |
| `Shunt` | `O` pour un pontage de barrette (pas de tracé) |
| `Points` | le tracé, du départ à l'arrivée : `x y` séparés par `\|` (ex. `40.5 120|80 120|80 96.25|130 96.25`), point décimal, au moins deux points sauf un shunt ; segments horizontaux ou verticaux |
| `NumeroX`, `NumeroY`, `NumeroAngle` | où l'Atelier écrit le numéro (centre du texte ; angle 0 ou 90) |

Invariants (vérifiés par `tests/see.js`) : le premier point d'un fil est le
point d'accroche `X, Y` de `DeBorne` dans `DeBloc`, le dernier celui de
`VersBorne` dans `VersBloc` (à 0,01 mm) ; chaque segment est horizontal ou
vertical ; tout est dans la feuille ; chaque liaison du retest d'un folio est un
fil du paquet.

## Feuille `Jonctions`

`Folio`, `X`, `Y` : les points de jonction dessinés (un point noir où un fil
se partage).

## Feuille `Legende`

`Folio`, `Route`, `Couleur`, `NbFils` : la légende des routes du cartouche.

## Le pilote : ses réglages (feuille `Reglages` du classeur pilote)

Le paquet ne dit rien de SEE ; c'est le classeur pilote qui sait comment le
bureau dessine. Ses réglages (une ligne `Cle` / `Valeur` / `Aide`, remplis une
fois au bureau, après la sonde) :

- **Connexion** : `ProgID` (candidats séparés par `;`), `CLSID_Application`,
  `CLSID_Automation`, `VersionAPI` (`auto`, `V5`, `V4`), `Projet` (chemin du
  projet, vide = celui ouvert dans SEE), `MotDePasse`.
- **Où écrire** : `Groupe` (vide = le groupe principal), `TypeFolio` (9 =
  schéma), `Cartouche` (nom du cartouche SEE), `NomFolio` (modèle, par défaut
  `{Nom}`), `Remplacer` (`N` : un folio qui existe déjà est sauté), `SauverTous`
  (sauver le projet tous les n folios).
- **Coordonnées** : `Mode` (`AJUSTER` : la feuille de l'Atelier sur la zone du
  cartouche SEE ; `ECHELLE` : x' = OrigineX + Echelle·x, y' = OrigineY +
  SensY·Echelle·y), `Echelle`, `OrigineX`, `OrigineY`, `SensY`, `Grille` (mm,
  0 = aucune).
- **Symboles**, une ligne par nature et par rôle : `Mode` (`BOITE`, `BROCHE`,
  `BORNIER`, `SYMBOLE`, `DESSIN`, `IGNORER`), `Famille`, `Symbole`, et le modèle
  de repère d'un connecteur (`{Repere}-{Lettre}`).
- **Fils** : `TypeConnexion` (la chaîne attendue par `AddWireConnection`),
  `Cable` (`O` / `N`), `Jauge` (`O` / `N`).
- **Essai** : `Folios` (liste ou plage : `1`, `1-5`, `3;7`), `PasAPas` (`O` / `N`),
  `Simulation` (`O` : rien n'est écrit dans SEE, le journal dit ce qui serait fait).

Le mode `DESSIN` ne pose que des traits, des rectangles et des textes : il sert
à valider l'échelle et l'origine avant de choisir les symboles, et de repli si
un symbole manque.
