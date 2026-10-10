# Le DXF de l'Atelier — le repli quand le pilote ne peut pas commander SEE

Si le classeur pilote (`see/vba`) ne peut pas commander SEE Electrical Expert au
bureau, il reste l'import DXF. SEE sait importer un **dossier** de DXF d'un
coup, un folio par fichier. Il sait aussi convertir les blocs DXF en symboles
électriques **par leur nom** et importer les lignes comme connexions (voir
`see/RECHERCHE.md` § 3.7). L'Atelier écrit donc un DXF par folio. Ce document
en fixe les noms (fichiers, calques, blocs, attributs). Ils sont **stables** :
le réglage de l'import au bureau s'appuiera dessus. On ne les change pas sans
changer ce document d'abord.

**Rien de ceci n'a été essayé dans SEE.** Le DXF est relu par une lecture
maison (`tests/see.js`) et par ezdxf, une bibliothèque indépendante (audit sans
erreur, comptes par calque, rendu). C'est tout ce qui est établi. Le
paragraphe « L'essai au bureau » dit ce qu'il faut regarder.

Où il se fait :
- dans la page : menu, puis « Exporter pour SEE… », puis la puce
  « DXF · un fichier par folio ». Tous les folios donnent un zip, un seul
  folio donne son `.dxf` ;
- en lot : `node see/exporter.js <retest.xlsx | --exemple> --dxf=dossier/`, un
  fichier par folio dans le dossier (voir l'en-tête de `see/exporter.js`) ;
- le code : `src/08-dxf.js` (`dxfDuFolio`, `zipDe`).

## Le fichier

- **DXF ASCII R12** (`$ACADVER` = `AC1009`), le plus ancien et le plus lu.
  Fins de ligne CRLF, pas de handles (R12 n'en exige pas).
- **Textes en Windows-1252** (`$DWGCODEPAGE` = `ANSI_1252`, la page de code d'un
  Windows français). Les accents passent tels quels. Quelques signes de
  l'Atelier s'écrivent en ASCII : `▷F3` (un renvoi) devient `>F3`, `Ω` devient
  `Ohm`. Une autre lettre hors de la page perd son accent, sinon elle devient
  `?`. Un texte tient sur une ligne, en 250 caractères au plus.
- **En millimètres, Y vers le HAUT.** L'origine est le coin bas gauche de la
  feuille A3 paysage de l'Atelier (420 × 297 mm). Pour tout point du paquet :
  `x_dxf = x`, `y_dxf = 297 − y` (le paquet a y vers le bas). `$EXTMIN`,
  `$EXTMAX`, `$LIMMIN` et `$LIMMAX` donnent la feuille.
- C'est le dessin de l'Atelier, lu dans le modèle du paquet (`modeleSEE`) :
  mêmes positions au centième de millimètre que le paquet, rien n'est
  recalculé.

### Les noms de fichier

`NN.<nom du folio>.dxf`. SEE nomme le folio d'après le fichier quand son nom
contient un point (« 01.Power.DWG »).

- `NN` est le **rang du folio dans le contrat** (l'ordre de l'Atelier). Il a au
  moins deux chiffres, autant que le total (`007.` pour 800 folios). Le même
  folio garde ainsi le même nom d'un export à l'autre, qu'on exporte tout ou
  une partie.
- `<nom du folio>` est le `Nom` du paquet (le plan FWD nettoyé), réduit à
  l'ASCII (lettres, chiffres, `_`, `-`) et **sans point** : un point du plan
  devient `-`, pour que le seul point sépare le rang du nom.

Plusieurs folios partent dans un zip, `dxf-see-<contrat>.zip`. C'est un zip
« stocké » (sans compression), écrit à la main, CRC-32 compris. Il contient un
fichier par folio, sans dossier.

## Les calques

| Calque | Couleur | Ce qu'il porte |
|---|---|---|
| `0` | 7 | rien (le calque des traits *dans* les blocs) |
| `CADRE` | 8 | le cadre, ses zones (1… / A…), le cartouche et la légende des routes |
| `EQUIPEMENTS` | 7 | le corps des équipements, renvois et rails (polylignes fermées) |
| `CONNECTEURS` | 7 | les pièces de connecteur (angles vifs contre le corps, arrondis côté fil) et leurs lettres |
| `BORNES` | 7 | les bornes des équipements, renvois et rails (blocs `SEE_BORNE_G` / `_D`) ; les pontages d'un équipement (un trait fin et un point par borne pontée : un dessin) |
| `FILS` | 7 | les fils (`LINE`) et les points de jonction (`SEE_JONCTION`) |
| `REPERES` | 7 | les repères des blocs (le repère d'un équipement très haut est rappelé en pied) |
| `NUMEROS` | 7 | les numéros de fil |
| `MASSES` | 7 | les masses (`SEE_MASSE_G` / `_D`) ; le collecteur de masse (son dessin, ses bornes) |
| `BARRETTES` | 7 | les barrettes : la ligne pointillée (coupée à chaque pastille), le point de départ, les pastilles (`SEE_PASTILLE…`) |
| `PRISES` | 7 | les prises de coupure : la fiche, l'embase, les contacts (`SEE_CONTACT_FICHE` / `_EMBASE`) |

Types de trait :
- `CONTINUOUS` ;
- `POINTILLE` : 0,75 mm plein, 0,55 mm vide à k = 1, mis à l'échelle du folio
  par `$LTSCALE` = 1/k.

Style de texte : `STANDARD`, police `txt`. La hauteur d'un texte est celle
d'une capitale : 0,7 × le corps du texte de l'Atelier.

## Les fils

- Un fil est une suite de `LINE` sur `FILS`, **un segment droit par LINE**,
  horizontal ou vertical. Les points alignés sont fondus.
- Sa couleur est l'**index ACI le plus proche** de la couleur de sa route
  (distance « redmean », hors 7, 8, 9 et des gris). Deux routes d'un même
  folio n'ont jamais le même index : la seconde prend le plus proche qui
  reste. Un fil sans route est en `BYLAYER`. La légende du cartouche emploie
  les mêmes index.
- **Le fil va jusqu'au contact.** Dans l'Atelier, le bout de fil qui entre dans
  un bloc *est* du fil : le raccord jusqu'à la pièce de connecteur, l'amorce
  d'une masse, d'un rond de barrette, d'une prise. Le fil du DXF est donc le
  tracé du paquet (`Points`) prolongé de cette amorce, dans l'axe, jusqu'au
  **contact** de la borne, les colonnes `CX`, `CY` du paquet, où le bloc de
  la borne est inséré (voir plus bas). Sur une pastille de barrette à poser,
  où le paquet fait arriver le fil au centre, il s'arrête au bord de la
  pastille. Chaque fil commence ainsi exactement sur l'insertion de sa borne
  de départ et finit exactement sur celle d'arrivée.
- Un **pontage** (`Shunt = O` dans le paquet) n'a pas de LINE. Celui d'un
  équipement est dessiné sur `BORNES`, comme dans l'Atelier. Celui d'une
  barrette ne se dessine pas : la barrette est pontée par construction.
- Un **croisement** n'a pas de petit pont : les fils restent des segments
  droits, pour pouvoir devenir des connexions.
- Le **numéro** d'un fil est un `TEXT` sur `NUMEROS`. Il ne tient pas au fil
  (une LINE de R12 ne porte pas d'attribut). L'Atelier l'écrit *dans* le fil,
  sur un fond blanc qui coupe le trait ; R12 n'a pas de masque. Le DXF le pose
  donc juste au-dessus, la ligne de base à 1,5 unité de l'Atelier du trait. Un
  numéro debout reste le long de son vertical (`NumeroAngle` = 90, rotation
  90°).

## Les blocs

Chaque borne du paquet (chaque ligne de la feuille `Bornes`) est un `INSERT`.
Le bloc porte quatre attributs, dans cet ordre :

| Attribut | Valeur |
|---|---|
| `REPERE` | le repère du bloc (`Repere` du paquet) |
| `CONNECTEUR` | la lettre du connecteur, `FICHE` ou `EMBASE` pour une prise, vide sinon |
| `BORNE` | l'étiquette du retest (`Borne`, ex. `A12`) |
| `NUMERO` | ce qui s'écrit dans la pièce (`Numero`, ex. `12`) |

Seul `NUMERO` se voit, et seulement là où l'Atelier écrit le numéro : dans la
pièce de connecteur, dans le corps d'un équipement sans connecteur, dans la
fiche d'une prise, dans une pastille. Les trois autres attributs sont cachés
(drapeau 1) mais présents, avec leur valeur.

**Le point d'insertion est le contact** du paquet (`CX`, `CY`, voir
`FORMAT-PAQUET.md`, « Accroche, amorce, contact ») : le bout du fil, là où un
symbole SEE dont le point de connexion est à l'origine se brancherait. Le DXF
ne le recalcule pas : le paquet et le DXF désignent le même point, à un
détail près pour une pastille (voir « Le lien avec le paquet »).

| Bloc | Pour | Point d'insertion | Ce qu'il dessine |
|---|---|---|---|
| `SEE_BORNE_G` | borne d'équipement, de renvoi ou de rail, flanc gauche (le fil part à gauche) | le bord extérieur de sa pièce de connecteur ; sans connecteur, le bord du corps | un `POINT` à l'origine |
| `SEE_BORNE_D` | idem, flanc droit | idem | un `POINT` |
| `SEE_CONTACT_FICHE` | contact de prise, côté fiche (amont, fil à gauche) | le bord gauche de la fiche | un `POINT` ; le numéro dans la fiche |
| `SEE_CONTACT_EMBASE` | contact de prise, côté embase (aval, fil à droite) | le bord droit de l'embase | un `POINT` ; numéro caché |
| `SEE_PASTILLE_G` | pastille de barrette, le fil arrive par la gauche | le bord gauche de la pastille | un cercle de rayon 4 unités (1 mm à k = 1), centré à 4 unités à droite ; le numéro dedans |
| `SEE_PASTILLE_D` | idem, le fil arrive par la droite | le bord droit de la pastille | le même cercle, à gauche |
| `SEE_PASTILLE` | pastille où le fil n'arrive pas à l'horizontale (rare) | le centre | le cercle, centré |
| `SEE_MASSE_G` | masse, le fil arrive par la gauche | le premier trait du symbole | trois traits verticaux décroissants vers la droite (CEI 60617) |
| `SEE_MASSE_D` | masse, le fil arrive par la droite | idem | les mêmes, vers la gauche |
| `SEE_JONCTION` | point de jonction (pas une borne, sans attribut) | le point | un disque plein |

Le calque d'un INSERT de borne dit la nature du bloc :
- `BORNES` pour un équipement, un renvoi, un rail ;
- `MASSES` pour une masse ou un collecteur ;
- `BARRETTES` pour une barrette, une barrette à poser ou un morceau ;
- `PRISES` pour une prise.

Les traits d'un bloc sont sur le calque `0`, en `BYLAYER` : ils prennent le
calque de l'insertion.

**L'échelle.** Un folio chargé est dessiné plus petit : c'est l'échelle k de
l'Atelier, la colonne `Echelle` du paquet. Les blocs sont définis une fois pour
toutes à k = 1 (une unité de l'Atelier vaut 0,25 mm). Ils sont identiques
dans tous les fichiers, et chaque INSERT porte l'échelle du folio
(41 = 42 = 43 = 1/k : au plus 1,82, de 1,02 à 1,82 sur l'exemple, moins de 1
pour un folio très chargé). Un bloc de même nom a donc
la même définition d'un fichier à l'autre, si SEE les fusionne. Ce que SEE
fait de l'échelle d'une insertion n'est pas établi. Le réglage
`blocs: 'folio'` (`--dxf-blocs=folio`) dessine les blocs à l'échelle de chaque
folio et les insère à l'échelle 1, mais deux fichiers ont alors des blocs de
même nom et de taille différente.

Les noms `SEE_*` se prêtent aux jokers de l'attribut « DXF/DWG Block Name » :
- `SEE_BORNE_G` pour les seules bornes de flanc gauche ;
- `SEE_PASTILLE*` pour toutes les pastilles ;
- `SEE_MASSE_*` pour les deux masses, etc. (seul le joker `*` est attesté).

## Le reste du dessin

Tout est en millimètres, Y vers le haut.

| Paquet | DXF |
|---|---|
| `Blocs` d'un équipement, d'un renvoi : `X Y L H` | une polyligne fermée sur `EQUIPEMENTS` |
| un rail en pastille | une polyligne aux bouts ronds (renflement 1) sur `EQUIPEMENTS` |
| `Connecteurs` (une pièce) | une polyligne fermée sur `CONNECTEURS`, coins arrondis de 1,8 unité côté fil (renflement tan 22,5°) ; la lettre en `TEXT` à `LettreX LettreY` (centrée, sur la ligne de base) |
| `Connecteurs` `FICHE` / `EMBASE` | deux rectangles sur `PRISES` |
| `Blocs` d'une barrette | la ligne pointillée de la colonne, coupée à chaque pastille, et le point de départ en bas (un disque) sur `BARRETTES` |
| `Blocs` d'un collecteur | ses traits (borne → axe, l'axe, trois barres) sur `MASSES` |
| `RepereX RepereY` | un `TEXT` centré sur la ligne de base, sur `REPERES` (le corps de texte de l'Atelier selon la nature) |
| `Jonctions` | des `SEE_JONCTION` sur `FILS` |
| `Legende` | dans le cartouche : un trait épais (polyligne de 0,8 mm) à l'index ACI de la route, son nom, son nombre de fils |
| `Folios` (cartouche) | sur `CADRE` : FOLIO (`plan / total`), TITRE, DESSINÉ, DATE, ÉCHELLE, INDICE, comme l'Atelier |

## Les réglages

Ils sont écrits dans `dxfDuFolio(modele, options)`. Le lot les passe par ses
arguments. La page prend les défauts.

| Option | Défaut | Autre valeur | Lot |
|---|---|---|---|
| `cadre` | `true` | `false` : ni cadre ni cartouche (SEE a les siens) | `--dxf-cadre=N` |
| `couleurs` | `true` | `false` : les fils en `BYLAYER` | `--dxf-couleurs=N` |
| `blocs` | `'echelle'` | `'folio'` (voir L'échelle) | `--dxf-blocs=folio` |
| `numeros` | `'dessus'` | `'dedans'` : là où l'Atelier les écrit, barrés par le trait | `--dxf-numeros=dedans` |

## Le lien avec le paquet

Les deux fichiers décrivent le même dessin. Pour une ligne de `Bornes`, le
paquet donne le point d'accroche (`X`, `Y`, le bout du tracé `Points`), le
contact (`CX`, `CY`) et le centre de la borne dessinée (`PX`, `PY`). Le DXF
insère la borne **au contact** (`x_dxf = CX`, `y_dxf = 297 − CY`) ; son fil est
`Points` prolongé de l'amorce, de `X, Y` au contact (raccourci sur une
pastille de barrette à poser, où `Points` finit au centre). L'amorce va d'un
millimètre (une masse) à une dizaine (une prise, une barrette dont la colonne
est loin du fil) ; un rail en pastille et un collecteur n'en ont pas.

Le détail : les pastilles de l'Atelier ont un rayon de 3,4 à 4,6 unités selon
leur numéro, et le contact du paquet est au bord de celle-là. Le cercle du
bloc DXF a un rayon fixe de 4 unités et reste centré sur `PX`, sur la ligne
de la barrette, comme dans l'Atelier : une pastille s'insère au bord de ce
cercle, du côté du contact, à 0,6 unité au plus de `CX` (0,15 mm à k = 1).

Les attributs `REPERE` et `BORNE` d'un INSERT retrouvent la ligne du paquet.
Pour une barrette dont une borne a plusieurs ronds (la colonne `Rond` du
paquet, que le DXF ne porte pas), il faut aussi la hauteur.

## L'essai au bureau (ce qui reste à établir)

1. **L'import d'un dossier.** Le module « DXF / DWG Import » est-il là ? Le
   dossier des six DXF de l'exemple (`node see/exporter.js --exemple
   --dxf=essai/`) s'importe-t-il d'un coup ? Quel nom SEE donne-t-il au folio
   de `01.1.dxf` : `01`, `1` ou `01.1` ?
2. **La feuille.** Le cadre de l'Atelier tombe-t-il sur celui du folio SEE
   (taille, origine) ? Sinon, essayer `--dxf-cadre=N`, et régler l'origine ou
   l'échelle de l'import.
3. **Les lignes en connexions.** Le correctif V4R3 SP3 en parle. Où est le
   réglage ? Les LINE de `FILS` deviennent-elles des connexions, et les
   autres calques restent-ils des dessins ? Une connexion s'arrête-t-elle sur
   l'insertion d'une borne ?
4. **Les blocs en symboles.** Sans réglage, SEE en fait des symboles
   « Slave/Other » ou « Black Box/Other », attributs repris. Mettre
   `SEE_BORNE_G` (puis les autres) dans l'attribut « DXF/DWG Block Name »
   d'un symbole de borne SEE. Le symbole se pose-t-il au contact ? À quelle
   taille, l'INSERT étant à l'échelle 1/k ? Sinon, essayer
   `--dxf-blocs=folio`. Les attributs REPERE, CONNECTEUR, BORNE et NUMERO
   remplissent-ils ceux du symbole (« $Tag » en mode avancé) ?
5. **Les textes.** Les accents passent-ils ? La police `txt` est-elle
   remplacée par une police de SEE ?
6. **Ce qu'on rapporte** : une capture d'un folio importé, le nom du folio, la
   liste des réglages de l'import, ce qui est devenu connexion ou symbole.
