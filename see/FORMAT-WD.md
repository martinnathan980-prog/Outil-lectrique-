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

## Les fichiers

- Un dossier **`WD-<nom du paquet>`**, à côté du paquet (un paquet qui n'est
  pas sur le disque : à côté du classeur, sinon dans le dossier TEMP).
- Un fichier par folio, **`WD-<Nom du folio>.xml`** : le `Nom` de la feuille
  `Folios`, sans `\ / : * ? " < > |` ni caractère de contrôle (remplacés par
  `_`), au plus 80 caractères, sans espace ni point au bout ; vide : `F<folio>`.
  Un nom déjà pris dans l'export (sans regarder la casse, comme Windows) prend
  `-F<folio>` ; `TOUT` est réservé.
- **`WD-TOUT.xml`** : un `WireHarness` par folio, dans l'ordre des folios. Un
  Tag de harness déjà pris dans ce fichier y prend `~2`, `~3`…
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
| bloc `EQUIPEMENT` | `ConnectiveDevice Type="Equipment"`, `Tag` = `Repere`, `PartNumber` = `PN`, `Description` | choisi |
| pièce de `Connecteurs` d'un équipement | `Type="Connector"`, `Tag` = `Repere-Lettre`, `ParentTag` = le Tag de l'équipement, `PartNumber` = `PN` de la pièce ; plusieurs pièces de même lettre : un seul connecteur | choisi |
| une borne d'équipement dont le connecteur manque à `Connecteurs` | ce connecteur, créé (sans PN) | choisi |
| bloc `PRISE` | deux `Type="Connector"` : `Repere-FICHE` (`ConnectivityType="Plug"`) et `Repere-EMBASE` (`Receptacle`), `MatingTag` de l'un vers l'autre, `PartNumber` = celui de la pièce `FICHE` / `EMBASE`, sinon celui du bloc | choisi |
| bloc `BARRETTE`, `BARRETTE_A_POSER` | `Type="TB"`, `Tag` = `Repere` | choisi |
| bloc `MASSE` | `Type="GB"`, `Tag` = `Repere` | choisi |
| bloc `COLLECTEUR` (une masse dessinée en barre) | `Type="GB"` | choisi |
| bloc `RAIL` (un potentiel : L1, N, 0V…) | `Type="TB"` (une barre de distribution) | choisi, non établi |
| bloc `RENVOI` | rien : un renvoi n'est pas un appareil ; les bouts de fil qui y arrivent sont sautés | choisi |
| borne (`Bornes`) | `Pin` sous son appareil (son connecteur ; sur une prise, sa moitié ; sinon son bloc), une seule fois : les ronds d'une borne de barrette, les morceaux d'une masse ne font qu'une broche. `Tag` = `Numero` (« 12 » pour « A12 »), sinon `Borne`, sinon `1` (une masse : un seul point, tous ses fils dessus) | choisi |
| fil (`Fils`) | `Wire Tag` = `Fil` ; un fil sans numéro (à créer) : `F<folio>-<Ordre>` | choisi |
| `Type` | `Wire_Type` (vide permis) | choisi |
| `Jauge` | `Gauge` (vide permis) | choisi |
| `Longueur` (m) | `Length` en mm (× 1000) et `Length_Status="Manual"` ; inconnue ou nulle : `Length="0"`, `Estimation` | choisi |
| `Shunt` = O / `Blinde` = O / sinon | `Type="Shunt"` / `"Shield"` / `"Normal"` | supposé (le sens de Shield dans SEE n'est pas établi : voir plus bas) |
| `Route`, sinon `1` | `Segregation` | choisi |
| `Couleur` | rien : c'est la couleur de la route sur le plan, pas celle de l'isolant | choisi |
| bouts `De…` / `Vers…` | `WireExtremity` : `ID` = Tag du fil et `-1` / `-2`, `WireTag`, `PinParent` = le Tag de l'appareil de la borne, `Pin` = le Tag de sa broche ; la borne est celle que citent `Bloc`, `Borne` et `Cote` (`FICHE` / `EMBASE` pour une prise) | choisi |

### Tags coupés ou rendus uniques

Un Tag trop long est coupé à la longueur de son type ; un Tag déjà pris (un
appareil dans le folio, une broche dans son appareil, un fil dans le folio)
prend `~2`, `~3`… (coupé d'autant). Une broche dont le `Numero` est déjà
celui d'une autre borne de l'appareil prend l'étiquette `Borne`, puis un
suffixe. Chaque changement est dit dans Export_WD.

## Ce qui ne s'écrit pas tel quel

Sauté, et compté dans la dernière partie de la feuille Export_WD (et le
journal) :

- un bloc `RENVOI` (et chaque bout de fil qui y arrive) ;
- un bloc d'une nature inconnue ; une borne dont le bloc manque à `Blocs` ;
  une borne de prise ni `FICHE` ni `EMBASE` ;
- un bout de fil dont la borne n'est pas dans `Bornes` (le fil est écrit avec
  son autre bout) ; un fil dont aucun bout n'a de borne connue (pas écrit) ;
- le seul bout de fil d'un folio (la liste en demande deux) ;
- un Tag coupé ou rendu unique, un nom de fichier déjà pris, un harness en
  double dans WD-TOUT.

## Ce qui est supposé, à voir au bureau

- **L'import des attributs en plus de l'essai.** `ParentTag`, `MatingTag`,
  `PartNumber` et `Description` sont permis par le schéma (2.18 photographié ;
  3.10 décidé par le schéma lu), mais aucun fichier qui les porte n'a encore
  été importé.
- **`Type="Shield"`.** Dans le modèle d'IGE+XAO, `Shield` pourrait désigner la
  tresse d'un câble blindé (dans un `WireGroup`) plutôt qu'un fil blindé. Si
  SEE en fait autre chose qu'un fil, il faudra écrire `Normal` et porter le
  blindage autrement.
- **`Type="Shunt"`** pour un pontage de barrette : le schéma a aussi un élément
  `Shunt` sous l'appareil, et un attribut `ShuntTag` sur un bout ; on écrit le
  plus simple, un fil de type Shunt.
- **Une masse, une broche.** Tous les fils d'une masse arrivent sur sa broche
  `1` ; un bloc de masse à plusieurs positions en aurait une par fil.
- **Une prise, deux connecteurs.** Le schéma connaît aussi `ProductionBreak`,
  qui pourrait mieux dire une prise de coupure.
- **Un même repère sur plusieurs folios** (un équipement dessiné sur deux
  plans) : il est dans chaque fichier, et deux fois dans WD-TOUT (un par
  harness). Ce que SEE en fait à l'import (un composant, ou deux) n'est pas
  établi. Si le vrai schéma imposait des Tags uniques sur tout le fichier,
  Windows refuserait WD-TOUT et accepterait les fichiers des folios.
- **Le rail en `TB`, le collecteur en `GB`** : choisis, sans exemple dans le
  paquet d'exemple.

## La feuille Export_WD

- En haut, sur fond jaune (la photo) : le nombre de fichiers et leurs
  verdicts ; le dossier, par son **nom** seulement (jamais le chemin entier :
  `MasquerChemins`) ; le schéma retenu ; combien d'éléments ne sont pas
  écrits tel quel ; quoi faire ensuite (dans SEE, sur le projet d'essai
  TEST_… : *File > Import > Wire List*, le premier fichier valide, *Open* ;
  puis *Insert > From Wiring list*).
- Puis une ligne par fichier : folio, harness, équipements, connecteurs,
  barrettes, masses, broches, fils, bouts de fil, verdict ; sous un fichier
  refusé, ses 5 premières erreurs.
- Enfin, ce qui n'est pas écrit tel quel : folio, quoi, détail.
- La boîte de fin, courte, redit le nombre de fichiers valides, le dossier,
  et « importe d'abord WD-… .xml dans ton projet d'essai ».

## Le banc

Le scénario « exporter WD » de `tests/banc-vba` (LibreOffice) lance ExporterWD
sur le paquet d'exemple, sur la variante `v_wd.js` (valeurs à échapper, noms
de fichier, natures, longueurs maximales, numéros en double, bornes absentes),
puis avec un refus de Windows simulé, sans schéma, et sur un paquet illisible.
`verifier_wd.py` vérifie chaque fichier avec xmllint contre
`tests/banc-vba/wd-3.10-reconstitution.xsd` — une **reconstitution partielle
d'après photos, pas le schéma d'IGE+XAO** — et recalcule depuis le paquet,
à part du VBA, tout ce qui doit être écrit.
