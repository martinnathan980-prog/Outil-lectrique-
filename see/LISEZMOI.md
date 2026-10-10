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
classeur pilote (Excel + 3 modules VBA)
   │  lit le paquet et commande SEE par COM, folio par folio
   ▼
SEE Electrical Expert (projet sorti de SPM)  →  check-in dans SPM
```

Repli si le pilote ne peut pas commander SEE : l'Atelier écrit **un DXF par
folio**, que SEE importe d'un coup (voir plus bas).

## Ce qu'il y a dans ce dossier

| Fichier | À quoi il sert |
|---|---|
| `diagnostic.cmd`, `diagnostic.ps1` | le relevé du poste, en lecture seule (double-clic sur le `.cmd`) |
| `vba/SEE_Commun.bas`, `vba/SEE_Sonde.bas`, `vba/SEE_Pilote.bas` | les trois modules du classeur pilote, à importer dans Excel |
| `FORMAT-PAQUET.md` | ce que contient le paquet SEE, colonne par colonne, et la liste des réglages du pilote |
| `FORMAT-DXF.md` | le DXF de repli : calques, noms de blocs, attributs |
| `RECHERCHE.md` | ce que la recherche a établi sur SEE, avec ses sources et son niveau de certitude |
| `exporter.js` | l'export en lot sans navigateur (`node see/exporter.js retest.xlsx`), pour qui a Node |
| `diagnostic-exemple.txt` | la forme du rapport de diagnostic (produit ici, hors Windows) |

## Jour 1 au bureau : apprendre le poste (une heure, rien n'est modifié)

1. **Le diagnostic.** Copie le dossier `see` sur le poste, double-clique sur
   `diagnostic.cmd`. Une à deux minutes plus tard, le Bloc-notes s'ouvre sur
   `diagnostic-see.txt`. Il est anonymisé (ni ton nom, ni la machine, ni les
   projets). Relis-le, puis renvoie-le-moi. Il dit : la version de SEE, si SEE
   s'est inscrit comme serveur COM (la clé de tout), si Excel est en 32 ou
   64 bits et ce qu'il permet pour les macros, si Python existe.
   Si Windows refuse le script : ne force rien, montre le message au service
   informatique.
2. **Dans SEE** : note ce que dit *Aide > À propos* (version et service pack),
   et la licence (bundle Launch, Grow ou Scale) si tu sais où la lire.
3. **Un projet d'essai, jamais un vrai.** Dans SEE, crée un projet bidon (ou
   une copie hors SPM) et dessine **à la main**, comme le bureau le fait, un
   petit folio : deux équipements avec un connecteur chacun, deux broches, un
   fil numéroté entre elles, une masse, et une barrette si tu peux. C'est sur
   lui que la sonde apprend comment le bureau dessine.
4. **Le classeur pilote.** Dans Excel : un classeur neuf, `Alt+F11`,
   *Fichier > Importer un fichier* les trois `.bas` du dossier `vba`, puis
   enregistre-le sous « Pilote SEE.xlsm » (classeur prenant en charge les
   macros). `Alt+F8`, lance **InitialiserClasseur** : il crée les feuilles
   `Reglages` (chaque réglage a sa ligne d'aide) et `Journal`. Si Excel bloque
   les macros, le diagnostic dit pourquoi (emplacement approuvé, stratégie) ;
   c'est une question pour l'informatique.
5. **Les sondes (lecture seule : elles n'écrivent jamais dans SEE).** SEE
   ouvert sur le projet d'essai :
   - **SondeApplication** : comment Excel a pu joindre SEE, la version, l'unité
     des coordonnées, les cartouches ;
   - **SondeSymboles** : toutes les familles et tous les symboles de ton
     environnement (c'est là qu'on choisira la boîte, la broche, la masse…) ;
   - **SondeFolio** : ton folio dessiné à la main, objet par objet (positions,
     repères, points de connexion, type des connexions) ;
   - **SondeSelection** : la même chose pour ce que tu as sélectionné dans SEE
     (sélectionne une broche et un fil, puis lance-la) ;
   - **SondeMethodes** : les réglages de méthode de SEE, écrits en XML à côté
     du classeur.
6. **Renvoie-moi** le diagnostic et les feuilles `Sonde_…` (elles ne
   contiennent que ton projet d'essai). J'en tire les réglages : l'unité,
   l'origine et le sens des axes, les symboles du bureau, la chaîne de type de
   connexion, la façon d'écrire un repère.

Si **SondeApplication** ne joint pas SEE, le journal dit chaque essai et son
erreur : renvoie-le aussi. Selon la réponse : un ProgID à mettre dans les
réglages, une question à l'informatique ou à ETAP, ou le repli DXF.

## Jour 2 : un folio d'essai

1. Dans l'Atelier, sur l'exemple embarqué (ou un retest non confidentiel) :
   menu, **Exporter pour SEE…**, « Ce folio », Exporter : tu obtiens
   `paquet-see-….xlsx`.
2. Dans le classeur pilote, laisse `Simulation = O` (le défaut) et lance
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

Pas encore établi (le jour 1 le dira) : qu'Excel puisse joindre SEE sur ton
poste ; l'unité, l'origine et le sens des coordonnées ; la chaîne qui donne le
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
  code, **pas** le comportement du vrai SEE.

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
