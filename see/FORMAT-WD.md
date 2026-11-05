# La liste de fils XML pour SEE — ce qu'écrit ExporterWD

La macro **ExporterWD** du classeur pilote (module `see/vba/SEE_WD.bas`,
`Alt+F8`) convertit le paquet de l'Atelier (`see/FORMAT-PAQUET.md`) en
**listes de fils XML** que SEE Electrical Expert importe par
*File > Import > Wire List*. Elle ne touche pas SEE : elle lit le paquet et le
disque, écrit des fichiers et des feuilles du classeur, et fait vérifier
chaque fichier par Windows (MSXML 6) contre le schéma livré avec SEE.

Ce document dit ce qui est établi, ce qui est choisi et ce qui est supposé.
On ne change pas une correspondance sans la changer ici d'abord, ni sans
`tests/banc-vba/verifier_wd.py`, qui la recalcule de son côté.

## Ce qui est établi (bureau, 5 novembre 2026)

- SEE refuse de créer des objets par son API (`SeeAutomation.CreateObject` :
  `0x80100000` pour tout) ; sa licence refuse l'import DXF et les imports
  Excel.
- *File > Import > Wire List* importe une liste de fils XML : « Import of wire
  list to project is successful » avec `Essai-WD-3.10.xml`, écrit par la
  macro `EssaiWD`.
- Les schémas sont dans `…\SEE Electrical Expert V4R3\4.8\SEE_Soft\PARAM\XSD\`
  (« IGE-XAO Wiring Diagram 2.18.xsd », puis 3.07 à 3.10). Windows a validé le
  fichier d'essai contre 3.07, 3.08, 3.09 et 3.10. En 3.10, `WiresNumber`
  (WireHarness) et `Class` (Wire) sont refusés.
- Le fichier accepté :

```xml
<IGE-XAO_WIRE_HARNESS EDB_InstanceID="1" XSDversion="3.10" LengthUnit="millimeter">
  <WireHarness Tag="ESSAI_PILOTE">
    <ConnectiveDevicesList>
      <ConnectiveDevice Tag="P1" Type="Connector" ConnectivityType="Plug"><Pin Tag="1"/>…</ConnectiveDevice>…
    </ConnectiveDevicesList>
    <WiresList>
      <Wire Tag="W1" Wire_Type="WIRE" Gauge="22" Length="1000" Length_Status="Manual" Type="Normal" Segregation="1"/>…
    </WiresList>
    <WiresExtremitiesList>
      <WireExtremity ID="W1-1" WireTag="W1" Pin="1" PinParent="P1"/>…
    </WiresExtremitiesList>
  </WireHarness>
</IGE-XAO_WIRE_HARNESS>
```

- Ensuite, *Insert > From Wiring list* ouvre « Component Insertion »
  (onglets Equipment, Connective Equipment, Cables) pour poser chaque
  composant importé. D'après le manuel V4R2 (pas encore vu au bureau), le
  module de câblage (*Process > Cabling > Create and insert trace*) trace
  ensuite les fils importés entre les composants posés.
- **SEE vérifie le fichier contre le même schéma que Windows** : un fichier
  que Windows refuse, SEE le refuse aussi (« Import of wire list to project
  has failed. XML file is not correct. », avec `Essai-WD-plus-3.10.xml`).
  La vérification d'ExporterWD avant l'import prévoit donc le verdict de SEE.
- En 3.10, le `Type` d'un `ConnectiveDevice` est l'un de : `Connector`,
  `TerminalBlock`, `GroundBlock`, `Splice`, `Equipment`, `Shell`,
  `ShellModule`, `TerminalTrack`, `ProductionBreak`, `JunctionBox`,
  `Current Transformer`, `Pressure Seal`, `Busbar` (Windows a refusé `TB`
  et `GB`, les noms de la 2.18, en citant cette liste). `ConnectiveDevice`
  permet `Class`, `ParentTag`, `MatingTag`, `SymbolFamily`, `SymbolName`,
  `Description` ; `WireExtremity` permet `ParentTag` ; `WireDiagram` exige
  `Tag`, `Solution` et `Version` (feuille Essai_WD, même essai).
- Après l'import du fichier simple, *Insert > From Wiring list* ouvre
  « Component Insertion » ; après celui du fichier « plus » (équipements,
  classes, paires, bornier, masse, épissure), la fenêtre ne s'ouvre plus, sans
  message : un de ses morceaux la bloque. `EssaiWD` écrit la série T01 à T10
  (le fichier simple plus une seule chose) pour trouver lequel.

## Les fichiers

- Un dossier **`WD-<nom du paquet>`**, à côté du paquet (un paquet qui n'est
  pas sur le disque : à côté du classeur, sinon dans le dossier TEMP).
- Un fichier par folio, **`WD-<Nom du folio>.xml`** : le `Nom` de la feuille
  `Folios`, sans `\ / : * ? " < > |` ni caractère de contrôle (remplacés par
  `_`), au plus 80 caractères, sans espace ni point au bout ; vide : `F<folio>`.
  Un nom déjà pris dans l'export (sans regarder la casse, comme Windows) prend
  `-F<folio>` ; `TOUT` est réservé.
- **`WD-TOUT.xml`** : un `WireHarness` par **harness**, avec le même Tag que
  dans les fichiers des folios, dans l'ordre des folios. Les folios d'un même
  harness y sont réunis (voir « WD-TOUT » plus bas) : un vrai paquet n'a
  qu'un harness (un retest à plusieurs harness en exige un, `--harness=H`),
  donc tous ses folios, quand le retest a la colonne harness.
- Un fichier `WD-*.xml` d'un export précédent qui n'est pas réécrit reste dans
  le dossier : Export_WD le compte (« ne les importe pas »).
- Chaque fichier : la déclaration `<?xml version="1.0" encoding="UTF-8"?>`,
  puis la racine `IGE-XAO_WIRE_HARNESS` avec `EDB_InstanceID="1"`,
  `XSDversion` (la version du schéma retenu) et `LengthUnit="millimeter"`.
  Tout caractère hors ASCII est écrit en référence numérique (`é` : `&#233;`),
  et `& < > " '` sont échappés : le fichier est en ASCII, quelle que soit la
  façon dont il est écrit (sous Excel : `ADODB.Stream`, UTF-8 avec BOM, comme
  le fichier d'essai accepté). Une tabulation ou un retour à la ligne dans une
  valeur devient une espace.

### Le schéma et les attributs

- Le schéma retenu : le « IGE-XAO Wiring Diagram *version*.xsd » de SEE
  Electrical Expert (sous `C:\Program Files (x86)\IGE+XAO` ou
  `C:\Program Files\IGE+XAO`) dont la version commence par `3.` et est la
  plus haute (un nombre décimal : 3.10 après 3.09). Aucun : la version 3.10,
  et les fichiers ne sont pas vérifiés (verdict NON VÉRIFIÉ).
- Les attributs du fichier d'essai accepté au bureau sont toujours écrits :
  `EDB_InstanceID`, `XSDversion`, `LengthUnit` ; `WireHarness.Tag` ;
  `ConnectiveDevice.Tag`, `.Type`, `.ConnectivityType` ; `Pin.Tag` ; les sept
  de `Wire` ; les quatre de `WireExtremity`. Les autres (`ParentTag`,
  `MatingTag`, `PartNumber`, `Description`) ne le sont que si le schéma lu les
  permet (l'attribut, ou un groupe d'attributs ou un type de base qui le
  porte) ; sans schéma, jamais.
- Le `Type` d'un bornier et d'une masse vient aussi du schéma lu :
  `TerminalBlock` et `GroundBlock` (la 3.10 du bureau, et sans schéma) ;
  `TB` et `GB` seulement si ses énumérations n'ont que ceux-là (la 2.18).
  Le haut d'Export_WD dit lesquels sont écrits.
- Chaque valeur est coupée à la longueur maximale de son type dans le schéma
  lu (`maxLength`, en suivant les restrictions de types nommés), sinon à celle
  des photos : `tTag` 128 (Tag d'un fil, d'une broche, d'un harness, ID d'un
  bout), `tExtendedTag` 255 (Tag d'un appareil, PinParent), `tWireType` 50,
  `tGauge` 10, `tSegregation` 255. Une valeur vide n'est écrite que si
  l'attribut est obligatoire.
- Les listes dans l'ordre du schéma (`ConnectiveDevicesList`, `WiresList`,
  `WiresExtremitiesList`), chacune seulement si elle a ce qu'il faut : un
  appareil, un fil, deux bouts (`WireExtremity[2..n]`).
- Windows vérifie chaque fichier (`ValiderXmlParXsd`, `see/vba/SEE_Windows.bas`).
  Verdicts : VALIDE ; REFUSÉ (avec le nombre d'erreurs, les 5 premières dans
  Export_WD) ; NON VÉRIFIÉ (pas de schéma, ou MSXML n'a pas pu lire le
  schéma) ; PAS ÉCRIT (dossier en lecture seule).

## La correspondance

Un **appareil** (`ConnectiveDevice`) est identifié dans le folio par une clé :
le corps d'un repère, un connecteur d'équipement, une moitié de prise. Un
repère posé en plusieurs morceaux (une barrette coupée, une masse à chaque
fil) reste **un** appareil, qui garde le premier PN et la première
description non vides.

| Paquet | XML | Statut |
|---|---|---|
| folio : `Harness`, sinon `Nom`, sinon `F<folio>` | `WireHarness Tag` | choisi |
| folio : `Titre` | `WireHarness Description` | supposé (vu en 2.18 ; le schéma lu décide) |
| bloc `EQUIPEMENT` | `ConnectiveDevice Type="Equipment"`, `Tag` = `Repere`, `Description` ; `PartNumber` = `PN` seulement si aucun de ses connecteurs n'a de `PartNumber` : le `PN` du bloc est celui que portent ses liaisons, celui d'un connecteur (`FORMAT-PAQUET.md`), qui reste sur ce connecteur | choisi |
| pièce de `Connecteurs` d'un équipement | `Type="Connector"`, `Tag` = `Repere-Lettre`, `ParentTag` = le Tag de l'équipement, `PartNumber` = `PN` de la pièce ; plusieurs pièces de même lettre : un seul connecteur | choisi |
| une borne d'équipement dont le connecteur manque à `Connecteurs` | ce connecteur, créé (sans PN) | choisi |
| bloc `PRISE` | deux `Type="Connector"` : `Repere-FICHE` (`ConnectivityType="Plug"`) et `Repere-EMBASE` (`Receptacle`), `MatingTag` de l'un vers l'autre, `PartNumber` = celui de la pièce `FICHE` / `EMBASE`, sinon celui du bloc | choisi |
| bloc `BARRETTE`, `BARRETTE_A_POSER` | `Type="TerminalBlock"` (le nom établi en 3.10 ; `TB` si le schéma ne connaît que lui), `Tag` = `Repere` | choisi |
| bloc `MASSE` | `Type="GroundBlock"` (établi en 3.10 ; `GB` en 2.18), `Tag` = `Repere` | choisi |
| bloc `COLLECTEUR` (une masse dessinée en barre) | `Type="GroundBlock"` | choisi |
| bloc `RAIL` (un potentiel : L1, N, 0V…) | `Type="TerminalBlock"` (une barre de distribution ; la 3.10 a aussi `Busbar`) | choisi, non établi |
| bloc `RENVOI` | rien : un renvoi n'est pas un appareil ; les bouts de fil qui y arrivent sont sautés | choisi |
| borne (`Bornes`) | `Pin` sous son appareil (son connecteur ; sur une prise, sa moitié ; sinon son bloc), une seule fois : les ronds d'une borne de barrette ne font qu'une broche. `Tag` = `Numero` (« 12 » pour « A12 »), sinon `Borne`, sinon `1`. Une masse ou un collecteur n'a qu'un point : sa première broche, où arrivent tous ses fils, quels que soient le nom de leur borne ou le morceau qu'ils citent | choisi |
| `Contact`, `Sexe` (`Bornes`) | rien : à choisir (le `PartNumber` d'un `Pin`, ou `EndFittingPartNumbers` d'un bout de fil, pour le contact ; `Gender` attend une valeur de `tGender`, encore inconnue) ; s'ils s'écrivent un jour, ce sera par `AttrWD`, seulement si le schéma lu les permet | choisi |
| fil (`Fils`) | `Wire Tag` = `Fil` ; un fil sans numéro (à créer) : `F<folio>-<Ordre>` | choisi |
| `Type` | `Wire_Type` (vide permis) | choisi |
| `Jauge` | `Gauge` (vide permis) | choisi |
| `Longueur` (m) | `Length` en mm (× 1000) et `Length_Status="Manual"` ; inconnue ou nulle : `Length="0"`, `Estimation` | choisi |
| `Shunt` = O / sinon | `Type="Shunt"` / `"Normal"` (`Normal` : le type de l'essai accepté au bureau) | choisi |
| `Blinde` = O | rien : le fil reste `Normal`, et Export_WD dit, par folio, « n fils blindés : écrits Normal » ; `Shield` serait la tresse d'un câble (voir plus bas) | choisi |
| `Route`, sinon `1` | `Segregation` | choisi |
| `Couleur` | rien : c'est la couleur de la route sur le plan, pas celle de l'isolant | choisi |
| bouts `De…` / `Vers…` | `WireExtremity` : `ID` = Tag du fil et `-1` / `-2`, `WireTag`, `PinParent` = le Tag de l'appareil de la borne, `Pin` = le Tag de sa broche ; la borne est celle que citent `Bloc`, `Borne` et `Cote` (`FICHE` / `EMBASE` pour une prise) | choisi |

### Tags coupés ou rendus uniques

Un Tag trop long est coupé à la longueur de son type ; un Tag déjà pris (un
appareil dans le folio, une broche dans son appareil, un fil dans le folio)
prend `~2`, `~3`… (coupé d'autant). Une broche dont le `Numero` est déjà
celui d'une autre borne de l'appareil prend l'étiquette `Borne`, puis un
suffixe. Chaque broche dont le Tag n'est pas celui voulu (son `Numero`,
sinon sa `Borne`, sinon `1`) est dite dans Export_WD, comme chaque autre
changement ; de même une borne de masse qui a son propre nom et arrive sur
la broche d'un autre nom.

### WD-TOUT : les folios d'un même harness réunis

Les folios dont le harness a le même Tag (le `Harness` du folio, sinon son
`Nom`, sinon `F<folio>`) forment un seul `WireHarness` :

- un appareil par Tag : le premier folio qui l'écrit donne son `Type` ;
  `ConnectivityType`, `MatingTag`, `ParentTag`, `PartNumber`, `Description`
  vides se remplissent avec ceux d'un folio suivant ; ses broches sont
  réunies, dans l'ordre (395SW1-A, au folio 1 avec les broches 1 et 2 et au
  folio 3 avec 1, 3 et 4 : une fois, avec 1, 2, 3 et 4) ;
- un fil par Tag, un bout de fil par ID : un fil coupé par un renvoi
  retrouve ses deux bouts ;
- un même Tag écrit autrement par deux folios (un appareil d'un autre Type,
  un fil ou un bout aux valeurs différentes) : le premier reste, et Export_WD
  le dit, au folio du second.

Le PartNumber d'un équipement suit la même règle que dans un fichier de
folio, sur le harness réuni.

## Ce qui ne s'écrit pas tel quel

Sauté, et compté dans la dernière partie de la feuille Export_WD (et le
journal) :

- un bloc `RENVOI` (et chaque bout de fil qui y arrive) ;
- un bloc d'une nature inconnue ; une borne dont le bloc manque à `Blocs` ;
  une borne de prise ni `FICHE` ni `EMBASE` ;
- un bout de fil dont la borne n'est pas dans `Bornes` (le fil est écrit avec
  son autre bout) ; un fil dont aucun bout n'a de borne connue (pas écrit) ;
- le seul bout de fil d'un folio (la liste en demande deux) ;
- un Tag coupé ou rendu unique, une broche qui n'a pas le Tag voulu, un nom
  de fichier déjà pris ;
- les fils blindés de chaque folio, écrits `Normal` ;
- dans WD-TOUT, un appareil, un fil ou un bout de fil qu'un autre folio du
  même harness a déjà écrit autrement (le premier reste).

## Ce qui est supposé, à voir au bureau

- **L'import des attributs en plus de l'essai.** `ParentTag`, `MatingTag`,
  `PartNumber` et `Description` sont permis par le schéma (2.18 photographié ;
  en 3.10, Windows a validé tout l'essai « plus » sauf `TB` et `GB`), mais
  aucun fichier qui les porte n'a encore été importé.
- **Ce qui bloque « Component Insertion ».** ExporterWD écrit plusieurs des
  morceaux du fichier « plus » : des équipements et leurs connecteurs
  (`ParentTag`), des prises (`MatingTag`), `PartNumber`, `Description`,
  `TerminalBlock`, `GroundBlock`. Celui que la série T01 à T10 désignera ne
  devra plus s'écrire, ou autrement ; d'ici là, un fichier d'ExporterWD peut
  s'importer sans que la fenêtre s'ouvre (LIS-MOI, « CETTE FOIS », point 10).
- **Un 2e fichier du même harness.** Importé après le 1er dans le même
  projet, s'ajoute-t-il au harness, ou le remplace-t-il ? À voir sur le
  projet d'essai, avant tout import en série (LIS-MOI, « CETTE FOIS », point
  11). WD-TOUT, où tout le harness est un seul `WireHarness`, ne pose pas la
  question.
- **Le blindage.** Dans `cWire.Type`, `Shield` voisine `PickUpShielding`,
  `ShieldingDaisyChain` et `Overshielding` : des rôles de conducteurs de
  blindage. `Shield` serait donc la tresse d'un câble, et le blindage d'un
  câble se dit dans `WireGroup.Type` (`Cable Shielded`, `Cable Twisted
  Shielded`, `Coaxial`…). Un fil blindé est écrit `Normal`, comme l'essai
  accepté ; un `WireGroup Type="Cable Shielded"` ne s'écrira qu'après un
  essai au bureau qui l'établit (un `Type` mal compris ne donne aucun message
  à l'import : rien ne se verrait sur les photos), et quand le paquet dira
  quels fils sont d'un même câble.
- **`Type="Shunt"`** pour un pontage de barrette : le schéma a aussi un élément
  `Shunt` sous l'appareil, et un attribut `ShuntTag` sur un bout ; on écrit le
  plus simple, un fil de type Shunt.
- **Une masse, une broche.** Tous les fils d'une masse arrivent sur sa
  première broche ; un bloc de masse à plusieurs positions en aurait une par
  fil.
- **Une prise, deux connecteurs.** Le schéma connaît aussi `ProductionBreak`,
  qui pourrait mieux dire une prise de coupure.
- **Un même repère sur plusieurs folios** (un équipement dessiné sur deux
  plans) : il est dans chaque fichier ; dans WD-TOUT, une seule fois si les
  deux folios sont du même harness, sinon une fois par harness. Ce que SEE
  fait d'un même Tag dans deux harness (un composant, ou deux) n'est pas
  établi. Si le vrai schéma imposait des Tags uniques sur tout le fichier,
  Windows refuserait WD-TOUT et accepterait les fichiers des folios.
- **Le rail en `TerminalBlock`, le collecteur en `GroundBlock`** : choisis,
  sans exemple dans le paquet d'exemple (la 3.10 a aussi `Busbar`, à essayer
  pour un rail si SEE le range mieux).

## La feuille Export_WD

- En haut, sur fond jaune (la photo) : le nombre de fichiers et leurs
  verdicts ; le dossier, par son **nom** seulement (jamais le chemin entier :
  `MasquerChemins`) ; le schéma retenu ; combien d'éléments ne sont pas
  écrits tel quel ; quoi faire ensuite (dans SEE, sur le projet d'essai
  TEST_… : *File > Import > Wire List*, le premier fichier valide, *Open* ;
  puis *Insert > From Wiring list*).
- Puis une ligne par fichier : folio, harness, équipements, connecteurs,
  barrettes, masses, broches, fils, bouts de fil, verdict ; sous un fichier
  refusé, ses 5 premières erreurs, chacune coupée aux espaces en morceaux de
  100 caractères au plus (« erreur », puis « (suite) ») : un message de
  Windows se lit en entier sur une photo. WD-TOUT dit son nombre de harness.
- Enfin, ce qui n'est pas écrit tel quel : le folio, puis « quoi : détail »,
  coupé de même.
- La boîte de fin, courte, redit le nombre de fichiers valides, le dossier,
  et « importe d'abord WD-… .xml dans ton projet d'essai ».

## Le banc

Le scénario « exporter WD » de `tests/banc-vba` (LibreOffice) lance ExporterWD
sur le paquet d'exemple, sur la variante `v_wd.js` (valeurs à échapper, noms
de fichier, natures, longueurs maximales, numéros en double, bornes absentes),
sur la variante `v_wd_h.js` (un seul harness pour les six folios, une masse
dont une borne a un nom et les autres non, des Tag écrits autrement d'un
folio à l'autre), puis avec un refus de Windows simulé, sans schéma, et sur
un paquet illisible. `verifier_wd.py` vérifie chaque fichier avec xmllint
contre `tests/banc-vba/wd-3.10-reconstitution.xsd` — une **reconstitution
partielle d'après photos, pas le schéma d'IGE+XAO**, dont l'énumération des
types est celle que Windows a citée au bureau — et recalcule depuis le
paquet, à part du VBA, tout ce qui doit être écrit (WD-TOUT réuni, le
PartNumber des équipements, les types, la broche des masses).
