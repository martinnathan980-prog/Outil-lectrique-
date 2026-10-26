# Automatiser SEE Electrical Expert — le mode d'emploi

Le but : que les 800 folios sortent de ton retest et entrent dans SEE sans être
redessinés à la main. L'Atelier sait déjà placer et router chaque folio ; il
reste à le **poser dans SEE**. Ce dossier contient tout ce qu'il faut pour
l'essayer au bureau, pas à pas, sans jamais risquer un vrai projet.

**Où on en est.** Tout est construit et vérifié ici, mais rien n'a encore
touché ni SEE ni le poste du bureau. Les noms de l'API de SEE sont connus (voir
plus bas), mais pas encore la façon dont ton poste et ta licence les laissent
utiliser. La première journée au bureau sert à l'apprendre ; elle ne modifie
rien.

## Les trois outils de SEE, et qui fait quoi

| Ce que tu appelles | Ce que c'est | Rôle dans l'automatisation |
|---|---|---|
| **SPM** (SEE Project Manager) | le coffre-fort des projets (check-out, check-in, révisions) | aucun dessin : on sort le projet, le pilote dessine dedans, on le rentre |
| **SEE Electrical Definition** | très probablement **SEE Electrical Equipment Definition** : la base des connecteurs, broches, contacts | les symboles et références que le pilote pose viennent de là ; rien à automatiser dedans |
| l'outil où l'on dessine | **SEE Electrical Expert** (version courante V5R2) | c'est lui que le pilote commande, par son API COM |

Le détail, sources à l'appui, est dans `RECHERCHE.md`.

## Le principe

```
retest (Excel)
   │  l'Atelier lit, place et route chaque folio (ce qu'il fait déjà)
   ▼
paquet SEE (.xlsx)  ← menu « Exporter pour SEE… » : chaque folio en millimètres
   │                   (blocs, connecteurs, bornes, fils et leur tracé)
   ▼
Pilote-SEE.xlsm (le classeur pilote, ses trois modules VBA déjà dedans)
   │  lit le paquet et commande SEE par COM, folio par folio
   ▼
SEE Electrical Expert (projet sorti de SPM)  →  check-in dans SPM
```

Repli si le pilote ne peut pas commander SEE : l'Atelier écrit **un DXF par
folio**, que SEE importe d'un coup (voir plus bas).

## Ce qu'il y a dans ce dossier

| Fichier | À quoi il sert |
|---|---|
| `kit.js` | `node see/kit.js` écrit **Kit-SEE.zip**, le seul fichier à emporter au bureau : `Pilote-SEE.xlsm` en tête, `LIS-MOI-D-ABORD.txt`, l'Atelier « pour plus tard », le diagnostic et les `.bas` « seulement si je te le demande » |
| `kit/LIS-MOI-D-ABORD.txt` | les étapes du bureau, une action par ligne (UTF-8 avec BOM, CRLF : le Bloc-notes l'ouvre tel quel) |
| `classeur.js` | `node see/classeur.js` écrit **Pilote-SEE.xlsm** : le classeur pilote, les trois modules déjà dedans, une feuille « Accueil » et un gros bouton « TESTER SEE » (voir « Le classeur pilote tout prêt ») |
| `vba/SEE_Commun.bas`, `vba/SEE_Sonde.bas`, `vba/SEE_Pilote.bas` | les trois modules du classeur pilote : `classeur.js` les met dans `Pilote-SEE.xlsm` ; en repli, ils s'importent à la main dans Excel |
| `diagnostic.cmd`, `diagnostic.ps1` | le relevé du poste, en lecture seule (double-clic sur le `.cmd`) ; seulement si le test ne passe pas |
| `FORMAT-PAQUET.md` | ce que contient le paquet SEE, colonne par colonne, et la liste des réglages du pilote |
| `FORMAT-DXF.md` | le DXF de repli : calques, noms de blocs, attributs |
| `RECHERCHE.md` | ce que la recherche a établi sur SEE, avec ses sources et son niveau de certitude |
| `exporter.js` | l'export en lot sans navigateur (`node see/exporter.js retest.xlsx`), pour qui a Node |
| `diagnostic-exemple.txt` | la forme du rapport de diagnostic (produit ici, hors Windows) |

## Jour 1 au bureau : un fichier, un bouton (vingt minutes)

Avant de partir : `node see/kit.js` écrit **Kit-SEE.zip** (le classeur pilote y
est fabriqué à la volée depuis `vba/`). C'est le seul fichier à emporter. Au
bureau, tout est dans son `LIS-MOI-D-ABORD.txt`, une action par ligne :

1. **Débloquer le zip, puis l'extraire.** Clic droit sur `Kit-SEE.zip`,
   *Propriétés*, cocher *Débloquer*, OK ; puis *Extraire tout*. Un fichier
   venu d'Internet ou d'un courriel porte la « marque du Web » : Office bloque
   alors ses macros, et les fichiers extraits d'un zip bloqué la reçoivent
   aussi. Débloquer le zip avant d'extraire l'évite.
2. **Dans SEE, un petit plan bidon, dessiné à la main**, sur un projet
   d'essai (jamais un vrai) : deux formes avec leur device, deux ou trois
   traits entre elles, une masse. SEE reste ouvert sur ce folio : c'est sur
   lui que le test apprend comment le bureau dessine.
3. **Ouvrir `Pilote-SEE.xlsm`**, cliquer *Activer le contenu* (la barre
   jaune), puis le gros bouton vert **TESTER SEE**. Attendre le message
   « C'est fini ». `Ctrl+S`, et me renvoyer le fichier (zippé si la
   messagerie refuse un `.xlsm`).
4. **Si ça bloque** (barre rouge « Microsoft a bloqué l'exécution des
   macros », un refus, une erreur) : une photo de l'écran, et me l'envoyer.
   Ne rien forcer : selon le message, c'est le déblocage du fichier, une
   stratégie de l'informatique (macros interdites, ou permises seulement si
   elles sont signées, ou seulement depuis un emplacement approuvé), ou le
   repli DXF.

Le bouton lance la macro **`TesterSEE`** (module `SEE_Sonde`) ; si le bouton
ne fait rien, `Alt+F8`, `TesterSEE`, *Exécuter*. Les autres macros sont dans
le même classeur et se lancent par `Alt+F8`, seulement si je le demande :

- **InitialiserClasseur** crée les feuilles `Reglages` (chaque réglage a sa
  ligne d'aide) et `Journal` ;
- les sondes, en **lecture seule** (elles n'écrivent jamais dans SEE) :
  **SondeApplication** (comment Excel a pu joindre SEE, la version, l'unité
  des coordonnées, les cartouches), **SondeSymboles** (toutes les familles et
  tous les symboles de l'environnement), **SondeFolio** (le folio dessiné à la
  main, objet par objet : positions, repères, points de connexion, type des
  connexions), **SondeSelection** (la même chose pour ce qui est sélectionné
  dans SEE), **SondeMethodes** (les réglages de méthode de SEE, en XML à côté
  du classeur).

**Seulement si je le demande :**

- **le diagnostic du poste** (`Seulement-si-je-te-le-demande/diagnostic.cmd`,
  double-clic) : en lecture seule, anonymisé, il dit la version de SEE, si SEE
  s'est inscrit comme serveur COM, si Excel est en 32 ou 64 bits et ce qu'il
  permet pour les macros. Si Windows refuse le script : ne rien forcer ;
- **le repli à la main**, si Excel refusait le classeur tout prêt mais
  permettait les macros : un classeur neuf, `Alt+F11`, *Fichier > Importer un
  fichier* les trois `.bas` de `Seulement-si-je-te-le-demande/modules-VBA`,
  enregistrer en « Classeur Excel (prenant en charge les macros) ».

Ce qui revient du bureau (le classeur enregistré après le test) ne contient
que ce que les macros y ont écrit : ce qu'elles ont lu dans SEE et sur le
poste, avec le projet d'essai pour seul dessin. J'en tire les
réglages : l'unité, l'origine et le sens des axes, les symboles du bureau, la
chaîne de type de connexion, la façon d'écrire un repère. Si SEE n'a pas pu
être joint, le `Journal` dit chaque essai et son erreur ; selon la réponse :
un ProgID à mettre dans les réglages, une question à l'informatique ou à
ETAP, ou le repli DXF.

## Jour 2 : un folio d'essai

1. Dans l'Atelier, sur l'exemple embarqué (ou un retest non confidentiel) :
   menu, **Exporter pour SEE…**, « Ce folio », Exporter : tu obtiens
   `paquet-see-….xlsx`.
2. Dans `Pilote-SEE.xlsm`, laisse `Simulation = O` (le défaut) et lance
   **DessinerPaquet** : il lit le paquet et écrit dans le `Journal` tout ce
   qu'il ferait, sans rien écrire dans SEE.
3. `Simulation = N`, **sur le projet d'essai** : **EssaiDessin** pose un
   rectangle aux coins de la zone de travail, une ligne et des textes. Regarde
   où ils tombent dans SEE et corrige `Mode`, `OrigineX`, `OrigineY`, `SensY`,
   `Echelle` jusqu'à ce que ce soit juste.
4. Choisis les symboles (feuille `Sonde_Symboles`) dans les réglages de
   chaque nature : `EQUIPEMENT.Mode = BROCHE`, `EQUIPEMENT.BrocheFamille` et
   `EQUIPEMENT.BrocheSymbole`, `MASSE.Mode = SYMBOLE`, etc. Mets dans
   `TypeConnexion` la valeur lue par la sonde (sinon les fils restent des
   traits). **EssaiSymboles** pose une boîte, deux broches et un fil.
5. **DessinerPaquet** avec `Folios = 1` et `PasAPas = O` : le folio se dessine
   étape par étape. Compare-le à l'Atelier.

Tant qu'un symbole n'est pas réglé, sa nature reste en `DESSIN` : traits,
rectangles et textes. Le folio est lisible, mais pas « intelligent » dans SEE.

## Ensuite : les 800

- Sors le projet de SPM (check-out) et ouvre-le dans SEE.
- Dans l'Atelier : **Exporter pour SEE…**, « Tous les folios » (un harness à
  la fois, si ton retest en a plusieurs). Avec Node sur un poste, le lot :
  `node see/exporter.js retest.xlsx --sortie=paquet.xlsx` (`--taches=4` pour
  aller plus vite).
- Dans les réglages : `Folios = *` (ou une plage : `1-50`), `PasAPas = N`,
  `Journal = NORMAL`, `SauverTous = 10`.
- **DessinerPaquet.** Un folio prend un nom provisoire tant qu'il n'est pas
  fini. Après une coupure, relance : les folios finis sont sautés, celui qui
  était en cours est refait. La feuille `Bilan` dit l'état de chaque folio.
- Avance **par lots** (cinquante folios, par exemple), regarde chaque lot dans
  SEE, puis rentre le projet dans SPM.

## Le repli : le DXF

Si le pilote ne peut pas commander SEE (pas d'accès COM, macros interdites) :
**Exporter pour SEE…**, puce « DXF · un fichier par folio ». Tous les folios
donnent un zip : un fichier par folio, `01.<folio>.dxf`, `02.…`. Dans SEE,
l'import DXF/DWG prend un dossier entier, un folio par fichier (le nom exact
qu'il donne au folio reste à voir). Les bornes, masses et pastilles sont des blocs aux noms stables
(`SEE_BORNE_G`, `SEE_MASSE_D`…) que SEE sait changer en symboles par leur nom ;
les fils sont des lignes. Essaie d'abord **un seul** fichier : le réglage de
l'import est décrit dans `FORMAT-DXF.md`, § « L'essai au bureau ».

## Le classeur pilote tout prêt (`Pilote-SEE.xlsm`)

Importer trois `.bas` dans l'éditeur VBA est trop demander au bureau. `node
see/classeur.js [--sortie=Pilote-SEE.xlsm]` écrit donc le classeur avec ses
macros déjà dedans, sans Excel et sans dépendance, à partir des `.bas` tels
qu'ils sont au moment où on le lance (`VBA_DOSSIER=…` pour d'autres). Il
contient :

- **une feuille « Accueil »** : un titre, quatre consignes numérotées (ouvrir
  le petit plan d'essai dans SEE, cliquer, attendre « C'est fini », `Ctrl+S`
  et renvoyer), un gros bouton vert **TESTER SEE**, et en petit : *Activer le
  contenu*, `Alt+F8` si le bouton ne fait rien, *Débloquer* si la barre rouge
  apparaît. Le bouton est une forme dessinée dont l'attribut
  `macro="[0]!TesterSEE"` est ce qu'Excel écrit pour une forme affectée à
  une macro du classeur ;
- **le projet VBA** (`xl/vbaProject.bin`), construit selon la spécification
  de Microsoft [MS-OVBA] dans un fichier composé [MS-CFB] : `ThisWorkbook` et
  `Feuil1` (modules de document, vides, comme Excel les écrit), puis
  `SEE_Commun`, `SEE_Sonde`, `SEE_Pilote`, leur texte **exact**, octet pour
  octet. Le projet ne porte **aucun code compilé** : son en-tête
  (`_VBA_PROJECT`, version `0xFFFF`) dit à Office de tout recompiler depuis
  le texte, ce que la spécification demande à qui écrit un projet. Non
  protégé, sans mot de passe, visible ;
- **rien qui se lance à l'ouverture** (ni `Workbook_Open`, ni `Auto_Open` :
  le générateur refuse un module qui en aurait).

La macro `TesterSEE` est écrite à part (module `SEE_Sonde`). Tant qu'elle
manque, `classeur.js` et `kit.js` l'annoncent (« AVERTISSEMENT ») et le
contrôle du bouton reste en échec dans `tests/classeur.js`.

**Comment on sait qu'il est juste, sans Excel.** Excel ne tourne pas ici :
c'est la limite. À sa place :

- `node tests/classeur.js` relit tout avec des lecteurs écrits pour le test
  (zip, OOXML, fichier composé, décompresseur) : 65 contrôles, dont les 63
  enregistrements de `VBA/dir` un par un, le texte de chaque module comparé
  octet pour octet aux `.bas`, les exemples de compression et de chiffrement
  de la spécification au bit près, et seize fautes injectées qu'il doit
  attraper ;
- **oletools** (`olevba`, un outil courant d'analyse des macros Office)
  lit le projet sans erreur, liste les cinq modules et rend le texte
  des trois modules identique aux `.bas` ;
- **LibreOffice** (24.2) ouvre le classeur, montre la feuille « Accueil » et
  le bouton, range les cinq modules dans sa bibliothèque `VBAProject`
  (`ThisWorkbook` et `Feuil1` en modules de document, liés au classeur et à
  la feuille), exécute une macro par UNO, et relie le clic du bouton à
  `VBAProject.SEE_Sonde.TesterSEE` (essayé avec une `TesterSEE` factice,
  hors du dépôt : le clic l'exécute) ;
- **la comparaison avec Excel** : des `vbaProject.bin` écrits par Excel 2007
  et Excel 2010 (les fichiers de test du projet XlsxWriter, sur GitHub) ont
  été relus enregistrement par enregistrement à côté du nôtre. Mêmes
  enregistrements, dans le même ordre, mêmes valeurs (plateforme, langue
  0x409, page de code 1252, nom, références stdole et Office au caractère
  près, chaque champ de chaque module), même texte pour les modules de
  document. Les seuls écarts, chacun voulu par la spécification :

  | Écart | Excel | Ici | Pourquoi |
  |---|---|---|---|
  | en-tête `_VBA_PROJECT` | sa version (0x85, 0x97) suivie de son code compilé | `0xFFFF`, sept octets | [MS-OVBA] § 2.3.4.1 : *Version MUST be 0xFFFF on write*, *PerformanceCache MUST NOT be present on write* : Office recompile depuis le texte |
  | flux `__SRP_…` | présents | absents | § 2.2.2 : facultatifs ; § 2.3.4 : *MUST be ignored* |
  | `MODULEOFFSET` | après le code compilé | 0 : le texte commence le flux | § 2.3.4.3 : il vaut la taille du code compilé, absent ici |
  | `PROJECTCOOKIE`, `MODULECOOKIE` | valeurs quelconques | `0xFFFF` | § 2.3.4.2.3.1 et .2.7 : *MUST be 0xFFFF on write* |
  | `PROJECTVERSION` | une date | celle de l'exemple de la spécification | aucune contrainte (§ 2.3.4.2.1.11) |
  | `ID`, `CMG`, `DPB`, `GC` | tirés au hasard | tirés de l'empreinte des modules (sortie déterministe) | § 2.4.3 : graine et octets ignorés libres ; déchiffrés, ils disent la même chose : non protégé, sans mot de passe, visible |
  | `[Workspace]` | position de la fenêtre d'un module ouvert | toutes les fenêtres fermées | § 2.3.1.19 : facultatif |
  | arbre du répertoire | nœuds rouges et noirs | tous noirs | [MS-CFB] § 2.6.4 : *the simplest implementation … mark every node as black* |

  Le `LCID` vaut 0x409 (et non 0x40C, le français) : § 2.3.4.2.1.3 l'exige,
  et Excel l'écrit ainsi ;
- **LibreOffice sait aussi écrire un projet VBA** (son filtre « Calc MS Excel
  2007 VBA XML », à condition de nommer la bibliothèque `VBAProject`). Essayé :
  ses flux de modules sont identiques **octet pour octet** aux nôtres (la même
  compression, celle de la spécification), mais il écrit une page de code
  `0` (elle dépend de la langue du système, hors de la spécification), un
  en-tête `_VBA_PROJECT` à `0x0000` là où Excel et la spécification mettent
  `0x0001`, et pas de modules de document. Il demanderait aussi LibreOffice
  pour fabriquer le classeur. Une seule voie est gardée : `classeur.js`.

Ce qui reste à voir au bureau : qu'Excel ouvre le classeur sans le
« réparer », recompile les modules sans erreur, et laisse le poste exécuter
des macros non signées venues d'ailleurs. Si l'informatique n'accepte que des
macros signées ou un emplacement approuvé, le classeur ne suffit pas : la
photo de l'écran le dira.

## Ce qui est établi, et ce qui ne l'est pas

Établi par la recherche (détail et sources dans `RECHERCHE.md`) :
- SEE Electrical Expert a une API COM ; ses objets (Application, Project,
  Group, Sheet, Symbol, Connector, Pin, Cable…) et leurs méthodes (créer un
  folio, poser un symbole, une broche, un fil) sont connus. Leurs noms
  exacts viennent d'un relevé publié sur GitHub par un tiers (dépôt
  NSO73/see-electrical-expert-references), sans documentation officielle ;
- en V4, le VBA tournait dans SEE ; en V5, il semble retiré de SEE : le pilote
  tourne donc dans Excel, hors de SEE ;
- les modules de l'éditeur (Automatic Diagram Generation, liste de câbles
  XML, Open Data, Generative View) existent. Aucun n'est prouvé pour
  transformer seul un retest en folios dessinés.

Pas encore établi (le jour 1 le dira) : qu'Excel ouvre `Pilote-SEE.xlsm` et
en exécute les macros sur ton poste ; qu'Excel puisse y joindre SEE ; l'unité, l'origine et le sens des coordonnées ; la chaîne qui donne le
type d'une connexion ; la façon d'écrire un repère ; ce que ta licence permet.

Vérifié ici :
- le paquet (`tests/see.js`, 112 contrôles avec le navigateur) : sur les six
  folios de l'exemple, des câblages du banc, et une fois sur les
  soixante-douze. Chaque fil part de sa borne et y arrive au centième de
  millimètre, et le paquet de la page est identique à celui du lot. Le dessin
  de l'Atelier n'a pas changé d'un caractère ;
- le DXF : relu par une lecture maison et par une bibliothèque indépendante
  (ezdxf : aucune erreur d'audit) ;
- le pilote : 91 contrôles statiques (`tests/vba.js`). Il a aussi été exécuté
  dans LibreOffice contre un **faux SEE** qui imite l'API (banc :
  `tests/banc-vba/`) : 210 fils posés sur 210 et 309 broches recalées sur leur
  contact, sans bout faux ni segment de travers. Il s'arrête et reprend
  proprement, et la simulation n'écrit rien. Ce banc prouve la cohérence du
  code, **pas** le comportement du vrai SEE ;
- le classeur pilote tout prêt : 65 contrôles (`tests/classeur.js`), relu
  par oletools et par LibreOffice, comparé enregistrement par enregistrement
  aux projets écrits par Excel 2007 et 2010 (voir plus haut). **Pas** par
  Excel lui-même.

## Ce qu'il faut demander

- **À l'informatique** : l'automatisation COM de SEE depuis Excel est-elle
  permise ? Les macros dans un classeur à soi ? Un emplacement approuvé ?
- **À qui gère SEE au bureau** : la version et le service pack, le bundle
  (Launch, Grow, Scale), le type de projet (« Wire Connectivity » ou standard),
  les symboles et le cartouche de l'environnement.
- **À ETAP** (le support de SEE, via le portail client) : la documentation de
  l'API et du VBA de la V5R2 ; la XSD de la liste de câbles XML (« WD ») ;
  SEE Generative View existe-t-il encore et pour quelle version ? La liste
  complète est dans `RECHERCHE.md`, sections 4 et 5.

## La confidentialité

Ton vrai retest ne sort jamais du bureau : le paquet se fabrique au bureau,
dans l'Atelier, et le pilote le dessine au bureau. Ce qui m'est utile ne
contient rien de confidentiel : le diagnostic (anonymisé) et les sondes d'un
projet d'essai.
