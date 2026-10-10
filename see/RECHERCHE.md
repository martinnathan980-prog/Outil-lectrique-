# SEE Electrical Expert : ce que la recherche a établi

Dossier de sources pour le technicien et pour les prochains agents. Octobre 2026.
Tout vient d'une recherche documentaire faite de l'extérieur. **Rien n'a encore été
essayé sur le poste du bureau.**

**Comment lire.** Dans les sections 2 et 3, chaque affirmation porte une étiquette entre
crochets, par exemple `[rn-4.80]`, qui renvoie à une URL de la section 6 ; la section 1
résume ce qui y est sourcé. Trois niveaux de certitude :

- **établi** : lu dans une source de l'éditeur (ou de Microsoft) et revérifié par un
  second agent ; **établi, lecture unique** : lu dans une source de l'éditeur par un
  seul agent, sans seconde vérification (sources marquées « lecture unique » en section 6) ;
- **probable** : déduit de sources solides, ou lu seulement dans le dépôt tiers NSO73
  (noms exacts relevés dans les bibliothèques de SEE, mais origine non documentée) ;
- **à vérifier au bureau** : inconnu, ou impossible à vérifier de l'extérieur.

**Méthode.** Six recherches thématiques, chacune revérifiée par un second agent qui
a corrigé les formulations ; ce dossier n'utilise que les formulations corrigées.
Ensuite, quatre recherches complémentaires (liste de fils XML, chaîne PLM, pilotage
COM, ADG), sans seconde vérification, mais avec le texte exact des sources. Le quota
de recherche web était épuisé : les forums, LinkedIn et les copies de manuels sur des
sites tiers n'ont pas été fouillés. « Aucune source ne dit… » veut donc dire
« nous n'avons rien trouvé », pas « cela n'existe pas ».

## 1. En bref

1. **SPM (SEE Project Manager)** : le coffre-fort des projets (base SQL Server, check-out / check-in, révisions). Il ne dessine rien. *(établi)*
2. **Equipment Definition** (« SEE Electrical Definition » au bureau, sans doute « SEE Electrical Equipment Definition ») : la base des composants (connecteurs, broches, contacts, fils), vendue dans la gamme SEE Electrical PLM. *(établi ; le nom exact au bureau : à vérifier)*
3. **SEE Electrical Expert** : l'outil de dessin des folios. Version courante V5R2 (numéros 5.2x), en 64 bits, mais les notes V5R1 SP7 signalent aussi une version 32 bits spécifique ; V4R3 (4.8x) en 32 bits *(probable : inventaire NSO73)* ; une 6.0 est annoncée fin octobre 2026. À ne pas confondre avec SEE Electrical, la gamme d'entrée (V8Rx) ; SPM porte lui aussi des numéros V8Rx (V8R2 à V8R8) : un V8Rx lu dans SPM ne désigne pas SEE Electrical. *(établi, sauf mention)*
4. **L'éditeur** : IGE+XAO, contrôlé par Schneider Electric depuis 2018 et intégré à ETAP depuis avril 2023. Pas Dassault Systèmes. Support et documentation passent par ETAP. *(établi)*
5. **Les voies qui existent** : API COM, VBA, plugins, Automatic Diagram Generation (ADG), liste de câbles XML (WD), Open Data (Excel), import DXF/DWG, SEE Generative View (SGV, après import d'un XML WD) et pilotage de l'interface.
6. **Aucune n'est prouvée pour transformer seule un retest en 800 folios dessinés.** ADG pense en blocs de machines répétitives. Open Data ne dessine pas, l'import XML WD seul non plus. Suivi de SGV, cet import a généré des folios en V4R2 ; SGV n'est plus au catalogue, mais si sa commande est active au bureau, l'essai est à faire, même sans serveur PLM (3.8 ; section 4, question 21). *(probable)*
7. **On prend l'API COM, pilotée depuis Excel** (du VBA hors de SEE). Le pilote lit le paquet SEE et pose chaque folio déjà placé et routé par l'Atelier.
8. **Repli** : un DXF par folio, importé d'un coup (un dossier entier).
9. **Limite** : les noms de l'API viennent d'un dépôt tiers (NSO73). Rien n'est essayé. D'abord un prototype d'un seul folio.
10. **Avant tout achat** (Scale, ADG) : relever la version et la licence au bureau (section 4).

## 2. Les outils

### 2.1 L'éditeur *(établi)*

- Schneider Electric Industries SAS a pris le contrôle d'IGE+XAO par une OPA close début 2018 : 70,57 % du capital, puis 70,69 % après la réouverture `[amf-2018-01]` `[amf-2018-02]`. Après l'offre simplifiée de 2021 : 83,93 % du capital et 87,68 % des droits de vote `[amf-2021-11]`. Un traité de fusion-absorption a été publié le 17/02/2022 `[se-opa]` ; sa réalisation n'a pas été vérifiée.
- Schneider contrôle ETAP depuis le 28/06/2021 `[se-etap]`. Le 06/04/2023, ETAP annonce « ALPI, IGE+XAO, and BIM Electric join ETAP » `[etap-2023]`. LinkedIn affiche « Part of ETAP » `[linkedin]`.
- Dassault Systèmes n'est qu'un partenaire : « CAAV5 Gold Partner », traducteur XML CATIA V5, intégration SmarTeam (brochure de 2014) `[harness-us]`.
- Le support se fait sur le « Caneco & SEE Customer Portal », réservé aux clients sous abonnement ou licence valide. L'ancien portail igexao.my.site.com redirige vers customerportal.etap.com `[support]` `[portail]`. Aucun manuel V5 ni guide de l'API n'a été trouvé en accès libre ; la page de téléchargement d'ETAP n'offre qu'un guide d'installation de SEE Electrical V8R5 `[demo]`. En revanche, les PDF déposés sur ige-xao.com restent servis : le manuel officiel d'Expert V4R2 (polonais, environ 1 300 pages : chapitres VBA, import XML, SGV, Open Data, mode batch) `[manuel-v4r2-pl]`, le tutoriel V4R3 en français `[tuto-v4r3]`, les notes de version et les fiches techniques citées ici.

### 2.2 La gamme

| Produit | Ce que c'est | Pour nous |
|---|---|---|
| **SEE Electrical Expert** | CAO de schémas électriques. « A project designed with SEE Electrical Export [sic] is a relational database of all electrical and mechanical devices » `[flyer-v5r2]`. Option harnais : hier « Harness Package » (signaux, fils, câbles, connecteurs, bibliothèques ATA, BNAE, DOD-STD-863B) `[harness-us]` `[broch-v4r2-fr]`, aujourd'hui l'add-on « Harness Engineering » (Harness Documentation + Jigboard + End Fitting), en Grow et Scale `[harness-2025]`. *(établi)* | Très probablement l'outil du poste. *(probable)* |
| **SEE Electrical** | Gamme d'entrée, V8R4 en abonnement `[etap-see]` `[see-v8r4]`. Autre logiciel, autre API. *(établi)* | Ne rien transposer à Expert. |
| **SEE Project Manager (SPM)** | PDM : coffre dans une base MS SQL Server, check-in / check-out, cycle de vie « In work, To validate, Published, Obsolete ». Niveaux LT (coffre limité à 5 Go) et Standard `[etap-spm]`. Pour Expert seulement, il synchronise l'environnement local (symboles, références, méthodes) avec un environnement de référence sur serveur ; les ajouts locaux peuvent remonter à l'administrateur pour validation `[spm-lt]`. *(établi)* | Ne dessine pas. On extrait le projet, on le modifie dans Expert, on le réintègre `[spm-lt]`. Une ancienne page parle d'une API SPM ; aucune documentation trouvée `[spm-es]`. |
| **SEE Electrical Equipment Definition** | « The database of electrical components definitions », triée par PN : nombre de broches, type d'embout, type de câble ; « These symbols are linked to references » `[etap-eed]`. Vendue dans la gamme SEE Electrical PLM `[etap-plm]` `[etap-devis]`. *(établi)* Rubriques : Equipments, Connective Equipments, Cables and Wires, Interconnection Devices, Accessories, Contact Layouts, End Fitting Rules ; une capture montre un dossier « EN4165 » `[eed-capture]`. *(établi, lecture unique)* | Format de stockage et import en masse : non documentés `[etap-eed]`. L'avoir ne prouve pas que toute la chaîne PLM est installée `[corpo-2020]`. |
| **SEE Electrical PLM** | Package EWIS : Equipment Definition, Harness Design, Harness Manufacturing, Gen eDoc `[etap-plm]` `[etap-devis]`. Annonce « generative diagramming » et « from block diagrams to wiring diagrams » ; ETAP le dit aujourd'hui « cloud-based », par navigateur `[etap-plm]`. *(établi)* Probablement l'ancien « SEE Electrical Harness PLM », acheté par Airbus en 2008 (près de 5 M€) `[airbus-2008]` : continuité forte (service COM+ « SEE ELECTRICAL HARNESS PLM HUB », section « SEE Electrical Harness PLM » de la configuration d'Expert) `[plm-faq-hub]` `[rn-4.80]`, mais aucun changement de nom annoncé n'a été lu. *(probable)* | Voir 3.8. |
| **SEE Generative View (SGV)** | Package additionnel : « Equipment cabling schematics generation from logical harnesses data » `[broch-v4r3-uk]`. Absent de l'offre 2026 `[etap-expert]` `[etap-devis]`. *(établi)* | Voir 3.8. |
| **SEE Gen eDoc** | Service web : génération à la demande de vues de câblage « from any selected Pin, Wire, Device, Harness, System, or Circuit », export PDF et Excel `[etap-gendoc]`. *(établi)* | Documentation et dépannage, pas des folios Expert. *(probable)* |
| **SEE System Design** | Conception système (amont), « Native integration with SEE Electrical Expert, SEE Equipment Definition and SEE Net Manager » `[etap-ssd]`. | Hors sujet. |

### 2.3 Les versions

| Version | Ce qu'on sait | Certitude |
|---|---|---|
| Expert V4R2 | Builds 4.4x ; SP10 = 4.49/C « final version » `[rn-v4r2-sp8]` `[rn-v4r2-sp10]`. | établi |
| Expert V4R3 | Builds 4.8x (4.80/A à SP7 4.87/B) `[rn-4.80]` `[rn-4.87b]`. 32 bits d'après l'inventaire NSO73 seulement : SEE.exe x86 sous C:\Program Files (x86)\IGE+XAO\SEE Electrical Expert V4R3\4.8\ `[nso-v4r3-inv]` ; cohérent avec l'exigence de VBA 7.1 32 bits pour les macros `[rn-4.83]`. | établi (32 bits et chemin : probable) |
| Expert V5R1 | Nouvelle ergonomie `[formation-2026]`. SP7 = 5.17.3 : « la version actuelle est 64 bits », Office 64 bits recommandé ; les mêmes notes signalent une version 32 bits spécifique `[rn-v5r1-sp7]`. | établi |
| Expert V5R2 | Version courante (flyer et brochure V5R2, formation 2026) `[etap-expert]` `[formation-2026]`. SP4 = 5.24.x (janvier 2024), SP5 à SP7 en 2024 `[rn-v5r2-sp4]` `[rn-v5r2-sp7]`. Un formateur cite un SP8 `[joessel-yt]`. SEE.exe x64 sous C:\Program Files\IGE+XAO\SEE Electrical Expert V5R2\5.2\SEE_Soft\Exe `[nso-inv]`. | établi (SP4 à SP7 : lecture unique ; SP8, x64 et chemin : probable) |
| Expert 6.0 | Webinaires les 28 et 29 octobre 2026 `[linkedin]` `[etap-6.0]` ; sept nouveautés, dont « Connectivity Management » (broches au niveau de la référence) et « Plugin Architecture and Customization Framework ». Aucune note de version trouvée `[etap-6.0]`. | établi (annonce seulement ; les nouveautés : lecture unique) |
| SPM | Compatibilités publiées : Expert V4R3 SP6 avec SPM V8R2 SP7 Patch K ou L et V8R3 Patch C `[rn-4.86-fr]` ; V5R1 SP7 avec SPM V8R4 SP1 `[rn-v5r1-sp7]` ; V5R2 SP4 à SP7 avec SPM V8R2 SP7 Patch 37 (base SQL seulement), V8R4 SP1 et V8R8 SP7 `[rn-v5r2-sp4]`. SPM est donc numéroté en V8Rx, comme SEE Electrical : un V8Rx lu dans SPM ne dit rien de l'outil de dessin. | établi (V5R2 : lecture unique) |

### 2.4 L'architecture des données

- **Le catalogue matériel d'Expert** est historiquement une base Access (MDB). Il peut être sur SQL Server 2008, 2012 ou 2014 avec la licence « Part List Manager » `[rn-4.86-fr]` ; la fiche 5847 décrit la création d'un catalogue SQL en V5R2 (environnement « Serveur ») `[fiche-5847]`. Références importables depuis CSV, XML, ASCII formaté et dBase `[rn-4.86-fr]` `[rn-v5r1-sp7]`. *(établi)*
- **Le multi-utilisateur** (Concurrent Engineering) stocke les projets dans SQL Server (2012 et 2014 en V4R3, 2012 à 2019 en V5R1 SP7) et demande SEE Access Control / User Access `[rn-4.83]` `[rn-v5r1-sp7]`. *(établi)*
- **Les environnements** (symboles, méthodes, catalogue) sont rangés dans un dossier « See_Env » `[rn-v4r2-sp6]` ; les espaces de travail s'exportent en fichiers SWS `[rn-4.83]`. *(établi)* Les XSD sont dans ..\See_Soft\Param\XSD\ `[manuel-v4r2-pl]`. *(établi, lecture unique)*
- **Deux types de projet** : « Standard » (connectivité logique, « Connection Mode ») et « Wire Connectivity » (« Creates project with wiring schematic connectivity », « Wire Mode ») `[nso-cmd]` `[new-v4r3]`. En Wire Connectivity, les broches se créent seules quand on pose des fils sur un connecteur `[rn-4.80]`. *(établi ; libellés cités : NSO73, probable, et What's new V4R3, lecture unique)*
- **Dans le package Harness**, la référence d'un connecteur pilote ses broches : numérotation automatique selon la référence, contrôle des doublons et du dépassement de capacité `[harness-corpo]`. Un attribut système décrit chaque extrémité de fil (type, numéro de cosse, référence matériel) ; le module End Fitting y affecte les références automatiquement `[news-v4r2-fr]`. Y ranger les contacts à sertir du retest : *à vérifier au bureau*.
- **La suite PLM V4R7 (2017)** : SQL Server (bases SEE_EDB, SEE_EED, SEE_SPM, SAC), serveur d'application COM+ « SEE ELECTRICAL HARNESS PLM HUB », clients Topology, Device Manager, Administration Tool `[plm-v4r7]` `[plm-faq-hub]`. SEE_EED = Equipment Definition est une déduction. ETAP la décrit aujourd'hui « cloud-based » `[etap-plm]` : le poste peut être différent. *(établi pour 2017)*

### 2.5 Les licences Launch, Grow, Scale *(établi, sauf mention)*

| Fonction | Launch | Grow | Scale | Source |
|---|---|---|---|---|
| Repérage automatique, numérotation des fils, renvois | oui | oui | oui | `[abo-v5r2]` |
| Création et mise à jour automatiques des fils | – | oui | oui | `[abo-v5r2]` |
| Base matériel sur MS SQL Server | – | oui (création) | oui (catalogue partagé) | `[abo-2023]` `[etap-expert]` |
| Add-on Harness Engineering | – | oui | oui | `[harness-2025]` |
| Import / export Excel de toutes les données du projet (Open Data) | – | – | oui | `[flyer-v5r2]` `[abo-v5r2]` |
| Import d'une liste de matériel et du Web Catalogue par Excel | – | – | oui | `[abo-v5r2]` |
| Import d'une liste de câblage XML (WD) | – | – | oui (avant V5R2 : module « WD ASSISTANT ») | `[fiche-5829]` (lecture unique) |
| Add-on ADG (en plus, abonnement annuel) | – | – | oui | `[etap-adg]` `[abo-v5r2]` |
| API COM / VBA en V5 | ? | ? | ? | aucune source `[etap-expert]` *(à vérifier)* |

Launch comprend déjà l'éditeur de catalogue et l'« Exchange of project data by XML, XLS, and others » `[etap-expert]`.
Avant ETAP, les packages s'appelaient Essential, Premium, Enterprise `[broch-v4r3-uk]` ; la fiche 5834 fait correspondre une licence LAUNCH / GROW / SCALE à « ENTERPRISE » pour V4R3 et V5R1 `[fiche-5834]` *(lecture unique)*. En V4, le VBA était un module sous licence : « VBA 7.1 protection module » dans les notes 4.80 `[rn-4.80]`, « VBA Developer » dans le manuel V4R2 `[manuel-v4r2-pl]` *(lecture unique)*. Un bouton « Informations sur le package » (Configuration > Protection / Licence) a été ajouté en V5R2 (SP4 ou SP5 selon les lectures) `[rn-v5r2-sp4]` `[rn-v5r2-sp5]` *(lecture unique)*.

### 2.6 Ce qui est faux ou exagéré (corrigé par la vérification)

- « IGE+XAO a été racheté par Dassault Systèmes » : faux, c'est Schneider Electric `[amf-2018-02]` `[amf-2021-11]`.
- « Il n'existe aucune référence publique de l'API, ni rien sur GitHub » : faux depuis juillet 2026, le dépôt tiers NSO73 en donne des milliers de noms `[nso73]`.
- « Le catalogue de formation 2026 n'a aucun module d'automatisation » : faux, il liste « Generation auto. de folios (ADG) – SEE – 5FR – 2 jours », sans fiche détaillée `[formation-2026]`.
- « SPM a disparu du catalogue ETAP » : faux, la page existe (LT et Standard) `[etap-spm]`.
- « Un plugin peut ajouter des contrôles d'interface » : non, les « Control(s) » sont des vérifications affichées dans la fenêtre « Control Process » `[rn-4.80]`.
- « Open Data n'accepte qu'Excel 32 bits » et « les macros exigent VBA 7.1 32 bits » : vrai en V4R3, plus repris en V5 (Open Data : Excel 64 bits seulement) `[rn-4.83]` `[rn-v5r1-sp7]`.
- « Generative View transforme un Excel retest en folios » : rien ne montre que SGV lise un Excel ; son entrée documentée dans Expert est un XML WD importé `[manuel-v4r2-pl]` `[faq-wd]` (voir 3.8).

## 3. Les voies d'automatisation, une par une

### 3.1 L'API COM — la voie retenue

**D'où on le sait.** Les notes de version officielles prouvent qu'une API existe :
méthodes « for retrieving elements (Symbols, Connectors, Cables, Terminal Strips) by
tag » `[rn-4.87a]`, insertion de bloc, export JSON « via a VBA API » `[rn-4.81]`,
méthode « AddSheet » corrigée en V4R1 `[rn-v4r1-sp6a]`. Une macro VBA officielle de
2019 appelle `Application.GetProject`, `project.Process.WireNumbering`,
`GetFromToXML` et `Update` `[faq-vba]`. *(établi ; la macro : lecture unique)* Mais
aucun guide officiel de l'API n'est public `[demo]`. **Tous les noms ci-dessous viennent du dépôt tiers NSO73** : un seul
commit (05/07/2026), aucune origine ni licence déclarée, extraction des bibliothèques
de types de SEE.exe — SEEExpert 5.20 (392 types) en V5R2, 4.8 (378 types) en V4R3
`[nso73]` `[nso-libs]`. Leur existence dans ce dépôt est vérifiée ; leur existence et
leur comportement sur le poste restent **probables**.

**Se brancher.** Coclasses `Application` et `SeeAutomation` : CLSID
{829E4B3B-B128-4999-A66A-6E76F0B4B22F} et {29E25405-2755-42DA-A17D-C07EC1A16CCB} en
V5R2, {A55015A3-0E82-4694-87D9-DB82B6620532} et {B0B9DD73-EE81-473F-9C3C-D8910C7E2D59}
en V4R3 `[nso-types]` `[nso-v4r3-types]`. Bibliothèque V5R2 :
{9956A56F-B14C-4007-B6CF-B89B4A7CD08D} `[nso-libs]`. Les interfaces sont duales, donc
appelables en liaison tardive *(probable)*. **Aucun ProgID, aucun LocalServer32 ne
figure dans le dépôt** : *à vérifier au bureau* (registre). SEE.exe semble être un
serveur hors processus : un client d'une autre architecture (32 / 64 bits) peut en
principe le piloter ; les DLL chargées dans le processus (SeeWDExchange.dll) imposent
la même architecture `[nso-inv]` *(déduction technique)*.

**Les objets et méthodes clés (V5R2)** `[nso-index]` `[nso-comnet]` `[nso-enums]` :

| Objet | Membres utiles |
|---|---|
| IDualApplication | GetProject(), OpenProject(A_Path, A_Password, A_ReadOnly), CloseProject, GetEnvironment(), CreateObject(A_ObjectType), ApplicationVersion, Protection |
| ISeeAutomation | OpenProject(A_Path, A_Password), Login(A_SACUser, A_SACPassword) (SEE Access Control, probable) |
| ISEEEnvironment | CreateProjectFromTemplate(…), CreateWireProjectFromTemplate(…), GetShape(A_Family, A_Name), GetTitleBlockByName(A_Name) |
| ISEEProject | GetMainGroup(), AddConnector(A_Object, A_Tag, A_PinsToCreate), Process (Cabling, WireNumbering), ImportWireList, ImportData / ExtractData, ExecuteADGGenerationFile, OpenDataExport / OpenDataImport, Save(), SaveCopyAs |
| ISEEGroup | CreateSubGroup(A_Name), GetSubGroupByName, AddSheet(A_Object), GetSheetByName, GetNextSheetNumber() |
| ISEESheet | Type, Rename(A_Name), SetTitleBlock, AddSymbol(A_Object, A_Tag), InsertBlock(A_Block, A_BlockParameters, A_UserParameters, A_InsertionPoint), AddPinSymbol(A_Symbol, A_Connector, A_PinName), AddWireConnection(A_InsertionPoints, A_TypeConnection, A_Tag, A_Cable), AddConnectionSegment, AddGraphicObject |
| ISEESymbol, ISEEPoint, ISEETag | SetShape, SetPosition(SEEPoint[, SEEPoint]), Angle, GetConnectionPointCollection() ; X, Y ; SetManual(A_Entity, A_Label, A_Root, A_Order) |
| ISEEStrand, ISEECable | ChangeName, Gauge, GetWireExtremityFrom / To (ContactNumber…) ; Gauge, Length, SegregationCode |
| Énumérations | SEEDynamicObjectTypes : Symbol 0, Collection 1, Equipment 2, Tag 4, Sheet 9, Block 10, Point 12, Name 14, Pin 16, Connector 29, Cable 31, Group 42, TitleBlock 43 ; SEESheetType : Diagram 9, Synoptic 16, Harness 18 ; SEEUnitType : mm 0, pouces 1, cartouche 2 |

Il y a aussi 133 événements (SheetAfterCreate, CablingAfterExecute…) `[nso-index]`.

**La chaîne d'appels reconstituée** *(probable, jamais essayée)* `[nso-index]` `[nso-comnet]` :
GetEnvironment → OpenProject → GetMainGroup / CreateSubGroup → CreateObject(Sheet = 9)
→ AddSheet → Rename, SetTitleBlock → GetShape(famille, nom) → SetShape → SetPosition →
AddSymbol → AddConnector, AddPinSymbol → AddWireConnection → Save.

**Ce qu'on ne sait pas** *(à vérifier au bureau ; chaque point est un réglage du pilote, voir FORMAT-PAQUET.md)* :
- la chaîne attendue par `A_TypeConnection` (une chaîne, pas une énumération) → réglage `TypeConnexion` ;
- l'unité et l'origine des coordonnées de SEEPoint → réglages `Mode`, `Echelle`, `OrigineX`, `OrigineY`, `SensY` ;
- ce que contient `A_InsertionPoints` (points de connexion seuls, ou coudes aussi) ;
- l'ordre des appels pour créer un folio (Type et Rename avant ou après AddSheet ?) ;
- le sens de `SetManual` (A_Entity = l'objet à repérer ?) ;
- le moyen de s'attacher à SEE → réglages `ProgID`, `CLSID_Application`, `CLSID_Automation` ;
- la licence de l'API en V5 : `Protection.CheckLicense` existe, ses valeurs sont inconnues `[nso-index]`.

**V4R3 et V5R2 ne parlent pas pareil** *(probable)* `[nso-comnet]` `[nso-v4r3-cn]` :
- V4R3 rend les objets par paramètre de sortie (`OpenProject(A_Path, A_Password, out A_Project, A_ReadOnly)`), V5R2 par valeur de retour ;
- `AddPin` : l'ordre des paramètres est inversé ; `AddConnectionSegment` change ; `AddWireConnection` V4R3 a un paramètre de sortie `A_Strand` ;
- les valeurs 45 et 61 à 63 de SEEDynamicObjectTypes sont renumérotées : lire les constantes dans la bibliothèque, ne pas les coder en dur ;
- `VBE` et `VBAVersion` n'existent qu'en V4R3 ; `OpenDataImport`, `OpenDataExport`, `ChangeBlocksToMacros` qu'en V5R2.

Un outil de l'éditeur pilote déjà SEE par COM depuis .NET : `Interop.SEEExpert_480.dll`,
dans « Project creation from image files » (V4R3) `[nso-v4r3-inv]` *(probable)*.

**Verdict pour 800 folios.** C'est la seule voie qui pose exactement le dessin de
l'Atelier : positions, fils, numéros. Faisable sur le papier ; à valider par un
prototype d'un seul folio avant les 800. *(probable)*

### 3.2 VBA — dans SEE en V4, hors de SEE en V5

- **V4 (dans SEE)** *(établi ; le manuel : lecture unique ; les commandes V4R3 : NSO73, probable)*. Le manuel V4R2 a un chapitre VBA « SEE z modułem VBA Developer » (un module de licence) : objet global « SEEExpert », menu Outils > Macro > Macros / Visual Basic Editor, fichier auto_mac.ini (macros au démarrage), module SEE_Events, aide SEEapp.chm dans \Doc\VBAHelp\ `[manuel-v4r2-pl]`. Il faut VBA 7.1 **32 bits** `[rn-v4r2-sp9]` `[rn-4.83]`. Commandes V4R3 : Open VBA Editor, Run Macro, Macros Explorer, Execute VBA Events `[nso-v4r3-cmd]`. Des environnements clients livrent des macros (« SplitLabel_V4 » de l'environnement « ATA_PD ») `[rn-4.87b]`.
- **V5 (hors de SEE)**. V5 est en 64 bits (une version 32 bits spécifique existe aussi `[rn-v5r1-sp7]`) et ses notes n'exigent plus VBA `[rn-v5r1-sp7]` `[rn-v5r2-sp7]`. `VBE`, `VBAVersion` et les commandes VBA manquent dans l'extraction V5R2 `[nso-index]` `[nso-cmd]` ; mais SeeMacrosManager.exe et le message « To be able to use VBA environment… » y restent `[nso-inv]` `[nso-cmd]`. On ne peut pas conclure : *à vérifier au bureau* (menu Outils > Macro). IronPython est livré dans SEE_Soft\Exe en V5R2, sans usage documenté `[nso-inv]`.
- **Donc** : en V5, la macro tourne dans Excel et pilote SEE par COM. Office 64 bits est recommandé avec V5 `[rn-v5r1-sp7]`. La bibliothèque de SEE peut se parcourir depuis l'éditeur VBA d'Excel (Références > SEE.exe, puis F2) *(à essayer)*.
- **Verdict.** C'est le langage du pilote : Excel est déjà sur le poste. Il faut que la DSI autorise les macros *(à vérifier)*.

### 3.3 Les plugins

- **Ce qu'ils font** *(établi)* : activés dans la section « Plugins Manager » de la configuration `[rn-4.82-fr]`, certains installés seulement en mode personnalisé `[rn-v4r1-sp6a]`. Ils réagissent à des événements (plusieurs plugins sur le même), ajoutent menus, icônes et commandes de barre d'outils `[new-v4r3-sp1]` `[rn-4.80]`. Il existe des plugins propres à un client (Stadler Rail) `[rn-4.85c-fr]`.
- **Comment** *(probable)* : DLL surtout .NET sous C:\Program Files\IGE+XAO\Common\Plugins\SEE\5.20\, interface IPluginRoot (Execute(A_ID, Root), Name, Version…) `[nso-inv]` `[nso-index]`. Aucun SDK officiel distribué n'est prouvé `[nso-inv]`. La 6.0 annonce une nouvelle architecture de plugins `[etap-6.0]`.
- **Verdict.** Possible plus tard (C# ou VB.NET, installation par l'administrateur). Pas pour le premier essai.

### 3.4 Automatic Diagram Generation (ADG)

- **Ce qu'il fait** *(établi)* : « The user can declare which electrical block or macro to use and in which diagram. The location of the blocks and all electrical parameters of the associated symbols should also be provided in the Excel spreadsheet. » Les blocs viennent de la bibliothèque de l'environnement ; la configuration couvre localisations, fonctions, borniers, câbles et connecteurs `[etap-adg]`.
- **Le classeur** *(probable, lecture d'une image floue)* : cinq onglets, PROJECT, PROJECT ATTRIBUTES, GROUP ATTRIBUTES, SHEETS, BLKS-SSD `[adg-png]` `[joessel]`. Un classeur de formateur montre des colonnes « Point d'option », « Position X », « Position Y », « Attribut variable n » `[joessel-yt3]`. Derrière : le plugin SEEXmlSheetGeneratorPlugin (`IExcelEntry.Generation(…)`), un XML intermédiaire, le mode batch (Tools\Xml Batch Mode Generator\SEEBatchModeGenerator.exe), `ExecuteADGGenerationFile` et la commande « Import: XML by ADG. » `[nso-index]` `[nso-cmd]` `[nso-inv]`. Le schéma du XML n'est publié nulle part.
- **Ce qu'il demande** *(établi)* : le niveau Scale **plus** l'add-on ADG, sous licence propre `[etap-adg]` `[rn-v5r2-sp7]` ; MS Excel (64 bits en V5R1 et V5R2 `[rn-v5r2-sp7]`, lecture unique ; 32 ou 64 bits en V4R3 `[rn-4.83]`). Installé avec Expert depuis V5R1, avant par un installeur séparé `[rn-v5r1-sp7]`. Formation SEE-5FR, 2 jours `[formation-2026]`.
- **Ce qu'il ne fait pas** : il vise des machines répétitives découpées en options et variantes ; industries citées : machinerie, procédés, énergie `[flyer-adg]` *(établi)*. Aucune source ne montre un fil déclaré entre la broche d'un bloc et celle d'un autre *(à vérifier)*. On ne peut pas ajouter de variables aux blocs créés depuis un dessin de harnais ou une implantation d'armoire, encore en V5R2 SP7 `[rn-v5r2-sp7]` ; cela vise a priori les feuilles Harness, pas les schémas *(probable)*. « Projet neuf depuis un modèle vide seulement » : invérifiable, la page est redirigée `[adg-sp20]` ; l'ajout à un projet existant reste inconnu.
- **Verdict.** Probablement inadapté tel quel à 800 folios tous différents. Ne rien acheter avant un essai.

### 3.5 La liste de câbles XML (WD)

- **Ce qu'elle fait** *(établi, lecture unique : fiche 5829 pour V5R1 / V5R2, manuel V4R2)* : « FICHIER/IMPORTER/LISTE DE CABLES » range le XML dans le projet ; puis « INSERTION/A PARTIR DE LISTE DE CABLAGE » : « Il suffit de cliquer sur un éléments pour pouvoir l'insérer dans la schématique » `[fiche-5829]`. Le manuel V4R2 détaille : on pose chaque équipement, connecteur et câble depuis une fenêtre à onglets ; on trace les liaisons à la main (Insérer > Connexion), avec un aperçu des liens ; ensuite Traitement > Gestion du câblage > Créer peut créer câbles et fils d'après le XML. Que des traits soient dessinés : *à vérifier* `[manuel-v4r2-pl]`.
- **Le format** : WD = Wiring Diagram, une des quatre extractions XML (WD, FD, GH, RH) `[manuel-v4r2-pl]`. XML validé par une XSD livrée dans ..\See_Soft\Param\XSD\ `[manuel-v4r2-pl]` ; XML et XSD dans le même dossier `[fiche-5829]`. Seul un fragment a été trouvé : `<Wire Tag="WB08350" … Length="2960" … Segregation="4" TemperatureZone="20" Net="61A1_018" …>` `[faq-wd]`. La bibliothèque SeeWDExchange lit ce XML (Harness, Equipment, Connector, Pin, Wire, Cable, Splice, Shunt ; IWDWire.Tag, Gauge, Length, Net, ExternalWiringDiagram…) `[nso-index]` *(probable)*. API : `ImportWireList(A_pXMLFileObject, A_Overwrite, A_Update)` ; les contrôles du projet comparent ensuite la liste importée aux folios (équipement, câble, fil manquants) `[nso-index]` `[nso-enums]` *(probable)*.
- **Ce qu'elle demande** : V5R2 Scale ; avant, le module « WD ASSISTANT » `[fiche-5829]` *(lecture unique)*.
- **Ce qu'elle ne fait pas** : l'import seul ne dessine pas de folio. Suivi de SEE Generative View, il en a généré en V4R2 (voir 3.8) ; la note V4R3 SP2 corrige d'ailleurs un « Message d'erreur lors de la création des folios SEE Electrical Expert » à l'« Importation d'une liste de câbles » (BM23523) `[rn-4.82-fr]`. Ni Excel ni CSV ne servent à importer des fils `[manuel-v4r2-pl]`. Aucune XSD ni XML complet trouvé. Voisin : le module Synoptic importe des « listes de câblage inter-enveloppes », format non public `[broch-v4r2-fr]`.
- **Verdict.** Seul, pas une génération de folios : utile pour **contrôler** le résultat (liste du retest contre folios dessinés), une fois la XSD récupérée. C'est aussi l'entrée de SGV : si SGV est actif au bureau, un XML WD tiré du retest devient un essai de génération native (3.8 ; section 4, questions 20 et 21).

### 3.6 Open Data (import et export Excel)

- **Ce qu'il fait** *(établi)* : « export des données électriques au format Excel … ; réimport avec contrôle de cohérence » `[broch-v4r2-fr]`, pour tous les attributs des symboles, câbles, connecteurs, broches, bornes, esclaves et équipotentielles (pas les notes) `[new-v4r3-sp5]` ; numéros de broches avec contrôle d'unicité, références matériel, fichier Export_Attributes.ini `[news-v4r2-fr]`. En V5R2 *(lecture unique)* : création de localisations (SP6), attributs de folio (SP7) `[rn-v5r2-sp6]` `[rn-v5r2-sp7]`. Commandes « Import data from Excel », « Import predefined list from Excel » (localisations, fonctions, borniers, connecteurs) ; API `OpenDataExport`, `OpenDataImport` `[nso-cmd]` `[nso-index]` *(NSO73, probable)*.
- **Ce qu'il demande** : Scale `[flyer-v5r2]` ; Excel 32 bits seulement en V4R3, 64 bits seulement en V5R1 `[rn-4.83]` `[rn-v5r1-sp7]`.
- **Ce qu'il ne fait pas** : aucune source ne dit qu'il crée des symboles graphiques *(probable : il ne dessine pas)*.
- **Verdict.** Après le dessin, pour remplir ou contrôler en masse PN, longueurs et attributs.

### 3.7 L'import DXF / DWG — le repli

- **Ce qu'il fait** *(établi)* : import d'un dossier entier de DXF, DWG ou SLF « in one shot » ; folio nommé d'après le fichier si le nom contient un point (« 01.Power.DWG ») ; blocs importés comme symboles électriques (« Slave/Other » ou « Black Box/Other » par défaut), attributs conservés `[rn-v4r2-sp6]`. L'attribut de symbole « DXF/DWG Block Name » accepte plusieurs valeurs et le joker « * » `[rn-4.83]`. Textes AcDbAttributeDefinition repris `[news-v4r2-fr]`. Le bug BM23572 « DWG lines are imported as Drawings instead of being imported as Connections » est corrigé en V4R3 SP3 : les lignes peuvent donc devenir des connexions `[rn-4.83]`.
- **Ce qu'il demande** : le module « DXF / DWG Import » (Essential, Premium, Enterprise en 2019) `[broch-v4r3-uk]` ; son niveau actuel n'est pas établi. Des noms de blocs DXF égaux à l'attribut « DXF/DWG Block Name » des symboles SEE.
- **Ce qu'on ne sait pas** : le réglage exact qui transforme les lignes en connexions, et si les broches se rattachent aux connecteurs *(à vérifier au bureau)*.
- **Verdict.** Le repli le plus simple à essayer. Risque : un folio qui n'est qu'un dessin.

### 3.8 SEE Generative View et SEE Electrical PLM

- **Ce qu'ils font.** SGV est la seule voie native documentée trouvée vers des folios **dessinés automatiquement**. Dans le manuel V4R2, l'import d'un XML WD lance SGV, qui affiche deux onglets : Layout (graphe des équipements et faisceaux) et Diagram (boîtes noires, connecteurs, fils). On rattache le graphe à une page (« Attach to page > New page »), on lance « Generate diagram by page », puis « Export to XML » génère le schéma dans Expert `[manuel-v4r2-pl]`. Une FAQ SEE Electrical PLM de 2017 montre un journal « SGV diagram importing » avec « Sheet number 1 », après l'import d'un XML WD « using SEE Generative View » `[faq-wd]`. Une capture officielle montre mise en page, aperçu et folio Expert `[sgv-capture]`. *(établi pour V4R2, lecture unique)*
- **Ce qu'ils demandent.** Une licence SGV ; dans Expert, la méthode « Import XML » de l'environnement et un cartouche d'au moins A1 `[manuel-v4r2-pl]` *(établi pour V4R2, lecture unique)*. L'entrée documentée est un XML WD importé dans Expert `[manuel-v4r2-pl]` `[faq-wd]`. La FAQ décrit un flux de la chaîne PLM (« WD xml generated by the Topology module », puis « Import the WD xml file in SEE XP using SEE Generative View ») ; le manuel V4R2 demande seulement un XML conforme à la XSD livrée. La brochure parle de « logical harnesses data » `[broch-v4r3-uk]`, et le glossaire PLM définit le harnais logique comme « a harness composed of empty branches without cables and connectors », où l'on route des « nets » `[plm-glossaire]`. En conclure qu'il faut un serveur PLM (alimenté par Topology et Device Manager) n'est qu'une déduction de confiance moyenne. Qu'un XML WD écrit depuis le retest passe dans SGV : *à vérifier au bureau*. Expert a aussi une section « SEE Electrical Harness PLM » (pin booking, broches de réserve depuis le serveur PLM) `[rn-4.80]`.
- **Ce qu'ils ne font pas.** Rien ne montre que SGV lise un Excel from-to. SGV a disparu de l'offre 2026 (page Expert, formulaire de devis, notes V5R2 SP4 à SP7, catalogue de formation) `[etap-expert]` `[etap-devis]` `[rn-v5r2-sp7]` `[formation-2026]`, mais la commande « SEE Generative View » et `LaunchSGV` sont encore dans V5R2 `[nso-cmd]` `[nso-index]`. Aucun binaire SGV ne figure en revanche dans l'inventaire V5R2 de NSO73 `[nso-inv]` : SGV s'installe sans doute à part, et la commande peut exister sans lui *(déduction)*. SGV calcule sa propre mise en page `[sgv-capture]` : ses folios ne seraient pas ceux placés par l'Atelier *(déduction)*.
- **Verdict.** Si la commande « SEE Generative View » est active au bureau (licence SGV), l'essayer après l'import d'un petit XML WD (section 4, questions 20 et 21), même sans serveur PLM : c'est le seul chemin documenté vers des folios générés nativement. Si elle est absente ou grisée, la voie reste fermée tant qu'ETAP n'a pas dit si SGV est encore vendu (section 5).

### 3.9 Le pilotage par l'interface — dernier recours

- **Clavier** *(établi)* : dans le tutoriel, la touche P (saisie de coordonnées) n'apparaît que dans l'éditeur d'implantation ; en schéma, il fait placer la souris sur des coordonnées affichées `[tuto-v4r3]`. Q fait pivoter un symbole de 90° ; raccourcis dans Customize > Keyboard `[rn-4.80]`.
- **Citrix ou RDP** *(établi)* : un outil lancé sur le poste local ne voit que l'image du bureau distant `[ms-vdi]` ; l'agent Power Automate pour bureaux virtuels s'installe en administrateur `[ms-pad-vd]`. Power Automate for desktop marche sans licence Premium en local `[nordflux]`, mais demande un compte et Internet, et stocke les flux dans OneDrive ou Dataverse `[ms-pad-setup]`.
- **Outils** *(établi)* : pywinauto (backends win32 et uia) `[pywinauto]` ; Inspect.exe est ancien, Microsoft recommande Accessibility Insights `[ms-inspect]` `[accinsights]` ; SendKeys n'envoie qu'à la fenêtre active `[ms-sendkeys]` ; AutoHotkey et AutoIt sont classés MITRE ATT&CK T1059.010 `[mitre]`.
- **PowerShell sur poste verrouillé** *(établi)* : sous App Control, les scripts non approuvés tournent en ConstrainedLanguage ; seuls trois objets COM y sont permis (Scripting.Dictionary, Scripting.FileSystemObject, VBScript.RegExp) `[ms-appctl]` `[ms-langmodes]`. Pour diagnostic.ps1 : ne pas compter sur COM, lire le registre et les fichiers.
- **Verdict.** Fragile (focus, délais, échelle d'écran), lent et sans contrôle du résultat.

### 3.10 Les fonctions natives qui évitent de la saisie *(établi)*

- Les blocs : « la sauvegarde d'une partie de schéma », indépendante du dossier, posée par Insertion > Bloc… `[tuto-v4r3]` ; blocs « Macro » à variables en V5R2 `[formation-2026]` `[rn-v5r2-sp4]`.
- « Copy Sheets — Copy sheets from another project » `[nso-cmd]` *(NSO73, probable)* ; Rechercher > Remplacer sur les attributs `[news-v4r2-fr]`.
- La génération des folios bornier, connecteur, câble et liste, et leur mise à jour `[news-v4r2-fr]`.

### 3.11 Récapitulatif

| Voie | Dessine les folios ? | Licence | Verdict |
|---|---|---|---|
| API COM (pilote Excel) | oui, tel que l'Atelier les a placés *(probable)* | inconnue en V5 | **retenue** ; prototype d'un folio d'abord |
| VBA dans SEE (V4) | oui, par l'API | module VBA (V4) | seulement si le poste est en V4R3 |
| Plugins | oui, par l'API | ? | plus tard |
| ADG | oui, par blocs de machines | Scale + add-on | probablement inadapté ; essai avant achat |
| Liste de câbles XML (WD) | non, seule (insertion clic par clic) | Scale | contrôle de cohérence ; entrée de SGV |
| Open Data | non | Scale | attributs en masse, après le dessin |
| Import DXF/DWG | oui, géométrie ; connexions à tester | module DXF/DWG | **repli** |
| SGV (après import XML WD) | oui, avec sa propre mise en page (V4R2) | SGV (serveur PLM : déduction) | essai si la commande est active |
| Interface | oui, très lentement | aucune | dernier recours |

## 4. Ce qu'il faut vérifier au bureau

Classé par ce que la réponse débloque. Une partie se relève par `see/diagnostic.ps1`
(registre, fichiers) ; le reste se fait à l'écran.

**A. Ce qui décide de tout**

| # | Question | Où regarder | Débloque |
|---|---|---|---|
| 1 | Nom, version et SP exacts de l'outil de dessin (V5R2 SPx = 5.2x, V4R3 = 4.8x), lus dans SEE Electrical Expert et non dans SPM (numéroté V8Rx) ; 32 ou 64 bits, relevé à part : Program Files ou Program Files (x86) ne dit pas la version, une V5 en 32 bits existe | Aide > À propos de l'outil de dessin ; dossier IGE+XAO sous Program Files ou Program Files (x86) | toutes les voies |
| 2 | Bundle (Launch, Grow, Scale ; ou Essential, Premium, Enterprise) et add-ons (ADG, Harness, Concurrent Engineering, SGV) | Configuration > Protection / Licence, « Informations sur le package » | ADG, XML WD, Open Data, SGV |
| 3 | SEE tourne-t-il sur le poste, ou par Citrix / RemoteApp ? | informatique | où tourne le pilote |
| 4 | Excel 32 ou 64 bits ; macros autorisées ; accès au modèle objet VBA | Excel (À propos, options de sécurité des macros) | le pilote |
| 5 | Mode de PowerShell : `$ExecutionContext.SessionState.LanguageMode` | console PowerShell | ce que peut faire diagnostic.ps1 |

**B. Brancher le pilote COM**

| # | Question | Où regarder | Débloque |
|---|---|---|---|
| 6 | Le registre connaît-il `HKCR\CLSID\{829E4B3B-B128-4999-A66A-6E76F0B4B22F}`, `{29E25405-2755-42DA-A17D-C07EC1A16CCB}`, `HKCR\TypeLib\{9956A56F-B14C-4007-B6CF-B89B4A7CD08D}` (V5R2 ; CLSID V4R3 en 3.1) ? ProgID ? LocalServer32 ? | `reg query … /s`, diagnostic.ps1 | réglages ProgID, CLSID_* |
| 7 | Un SEE ouvert est-il trouvé par GetObject ? | sonde du pilote | s'attacher à SEE |
| 8 | L'Explorateur d'objets confirme-t-il les signatures (valeurs de retour, énumérations) ? | Excel > VBE > Références > SEE.exe, F2 | confiance dans NSO73 |
| 9 | Une aide API est-elle installée (en V4R2 : \Doc\VBAHelp\SEEapp.chm), des .tlb, un dossier Plugins ? (En attendant : le chapitre VBA du manuel V4R2, en accès libre, voir 2.1.) | dossier d'installation | doc officielle |
| 10 | Unité et origine des coordonnées : poser un symbole à la main à un endroit connu, relire sa position | sonde | Mode, Echelle, OrigineX/Y, SensY |
| 11 | Chaîne de `AddWireConnection` : tracer un fil à la main, relire le type de son segment | sonde | TypeConnexion |
| 12 | Familles et noms des symboles de l'environnement : boîte noire, connecteur, broche, masse, barrette, épissure | explorateur de symboles | réglages Symboles |
| 13 | Type de projet (Standard ou Wire Connectivity) et type de folio (schéma = 9, harnais = 18) | propriétés du projet | TypeFolio ; limite ADG |
| 14 | Faut-il un login SEE Access Control ? Projet en multi-utilisateur (SQL Server) ? | administrateur | ouverture du projet |
| 15 | Check-out SPM par projet ou par document ? Qui administre l'environnement de référence ? | administrateur SPM | où le pilote écrit ; nouvelles références |

**C. Le repli DXF**

| # | Question | Où regarder | Débloque |
|---|---|---|---|
| 16 | L'import d'un dossier DXF/DWG est-il actif ? | menu Fichier > Importation | le repli |
| 17 | Essai : un DXF dont les blocs portent le nom de l'attribut « DXF/DWG Block Name » : symboles ? lignes en connexions ? nom du folio ? | projet de test | folio « vivant » ou simple dessin |

**D. La liste XML (WD) et Generative View**

| # | Question | Où regarder | Débloque |
|---|---|---|---|
| 18 | Copier la XSD du Wiring Diagram (…\SEE_Soft\Param\XSD\) et SeeExtractor_WDStandardExtraction.xml (…\SEE_Soft\Param\SeeExtractor) | dossier d'installation | écrire un XML WD |
| 19 | « Importer > Liste de câbles » et « Insertion > À partir de liste de câblage » : actifs ou grisés ? | menus | licence Scale ou WD Assistant |
| 20 | Extraire le XML WD d'un petit projet (2 connecteurs, 2 fils, 1 câble), le réimporter dans un projet vierge : que crée-t-il ? | projet de test | format réel ; contrôle ; entrée de SGV |
| 21 | Juste après cet import : la commande « SEE Generative View » existe-t-elle, active ou grisée ? Si active : « Attach to page > New page », « Generate diagram by page », puis « Export to XML » : un folio est-il créé ? (En V4R2 : méthode « Import XML » et cartouche d'au moins A1.) | menus de SEE ; projet de test | génération native (3.8) |

**E. Avant tout achat d'ADG**

| # | Question | Où regarder | Débloque |
|---|---|---|---|
| 22 | ADG présent ? Colonnes des onglets SHEETS et BLKS-SSD du classeur livré ; un fil entre deux blocs ? ajout à un projet existant ? | près de …\Plugins\SEE\5.20\SEEXMLSHEETGENERATORPLUGIN ; essai | ADG oui ou non |

**F. La chaîne PLM et Equipment Definition**

| # | Question | Où regarder | Débloque |
|---|---|---|---|
| 23 | Un serveur SEE Electrical PLM existe-t-il (service COM+ « SEE ELECTRICAL HARNESS PLM HUB », bases SEE_EDB, SEE_EED, SEE_SPM, clients Topology, Device Manager) ? Ce n'est pas un préalable à l'essai de la question 21. | administrateur | origine des données ; XML WD amont (question 27) |
| 24 | « SEE Electrical Definition » : titre exact de la fenêtre, version, base locale ou SQL ; les onglets EN… sont-ils des dossiers ; export possible ? | Equipment Definition | PN, broches, contacts |

**G. Les données et l'organisation**

| # | Question | Où regarder | Débloque |
|---|---|---|---|
| 25 | Pour un PN du retest, la référence existe-t-elle au catalogue avec ses broches ? Poser ce connecteur numérote-t-il ses broches ? | catalogue | nommage des broches |
| 26 | Où se saisit le contact à sertir : attribut de broche, extrémité de fil (End Fitting) ? | un folio existant | colonne Contact du paquet |
| 27 | D'où vient le retest (PLM, Harness Manufacturing, outil du donneur d'ordre) ? Un XML WD amont existe-t-il ? | équipe méthodes | éviter une conversion |
| 28 | Folio type imposé (cartouche, renvois, numérotation) ; FWD = un folio ? | équipe méthodes | Cartouche, NomFolio |
| 29 | Macros ou plugins déjà livrés dans l'environnement du bureau ? | Configuration > Plugins ; Outils > Macro | réutiliser l'existant |
| 30 | Le bureau a-t-il un accès au portail client ETAP ? | responsable des outils | doc API, XSD, notes |

## 5. Ce qu'il faut demander à ETAP / au support

Par le « Caneco & SEE Customer Portal » `[portail]` `[support]`. Formations sur mesure : 05 62 74 36 36 `[formation-2026]`.

1. **L'API** : le guide de l'API COM et VBA d'Expert V5R2 (et 6.0) ; le ProgID officiel et la façon de s'attacher à un SEE ouvert ; la licence nécessaire pour piloter SEE depuis Excel (Launch, Grow ou Scale ?) ; le module « VBA Developer » existe-t-il encore en V5 ?
2. **Les inconnues du dessin** : les valeurs admises de `A_TypeConnection` ; l'unité de SEEPoint ; l'ordre des appels pour créer un folio et y poser un symbole ; un exemple de code.
3. **Le XML WD** : la XSD et le XML d'exemple joint à la fiche 5829 `[fiche-5829]` (et « schemat_wiazek_przyklad.xml » cité par le manuel polonais `[manuel-v4r2-pl]`) ; ce qu'est un dossier « Embedded Project » ; un outil tiers peut-il écrire ce XML ?
4. **L'import from-to** : existe-t-il un import de liste de fils qui crée connexions et folios ? « Insertion à partir de liste de câblage » peut-elle s'automatiser ?
5. **SEE Generative View** : encore vendu et maintenu en 2026 ? compatible V5R2 ? remplacé par un autre produit ? accepte-t-il un XML WD écrit par un outil tiers, hors chaîne PLM ? que fait `ImportData` avec le type `eSEEExternalDocType_SGV` (= 2, présent en V5R2 `[nso-enums]`) ?
6. **ADG** : le prix en plus de Scale ; la documentation du classeur (SHEETS, BLKS-SSD) ; peut-on déclarer un fil entre deux blocs ; peut-on générer dans un projet existant ; le programme du module SEE-5FR.
7. **Les notes de version** V5R2 (base à SP3, SP8 et suivants) et 6.0, réservées à l'espace client `[rn-v5r2-info]`.
8. **Equipment Definition** : comment ses références alimentent le catalogue d'Expert ; existe-t-il un import en masse ?
9. **Synoptic** : le format des « listes de câblage inter-enveloppes ».

## 6. Sources

« Lecture unique » : source lue par un seul agent (recherches complémentaires), sans
seconde vérification.

**Éditeur et propriété**
- `amf-2018-01` <https://echanges.dila.gouv.fr/OPENDATA/AMF/ECO/2018/01/FCECO045711_20180125.pdf>
- `amf-2018-02` <https://echanges.dila.gouv.fr/OPENDATA/AMF/ECO/2018/02/FCECO045955_20180219.pdf>
- `amf-2021-11` <https://echanges.dila.gouv.fr/OPENDATA/AMF/ECO/2021/11/FCECO060954_20211129.pdf>
- `se-opa` <https://www.se.com/ww/fr/about-us/investor-relations/regulatory-information/opa-ige-xao>
- `se-etap` <https://www.se.com/ww/en/about-us/newsroom/news/press-releases/schneider-electric-completes-investment-in-operation-technology-inc-%E2%80%9Cetap%E2%80%9D-to-spearhead-smart-and-green-electrification-60d9796ab3d8af4e085f0fa9/>
- `etap-2023` <https://etap.com/company/news/corporate-news/2023/04/05/etap-joins-forces-with-alpi-and-ige-xao-to-become-the-leader-in-electrical-software-solutions>
- `linkedin` <https://www.linkedin.com/company/ige-xao>
- `support` <https://etap.com/support/technical-support>
- `portail` <https://customerportal.etap.com/s/login/?language=fr>
- `demo` <https://etap.com/demo-download>
- `airbus-2008` <https://www.zoneindustrie.com/actualite/IGE-XAO-signe-un-contrat-majeur-avec-AIRBUS-6317.html>

**Pages produit ETAP**
- `etap-expert` <https://etap.com/product/see-electrical-expert>
- `etap-see` <https://etap.com/product/see-electrical>
- `etap-spm` <https://etap.com/product/see-project-manager>
- `etap-eed` <https://etap.com/product/see-electrical-equipment-definition>
- `etap-plm` <https://etap.com/product/see-electrical-plm>
- `etap-adg` <https://etap.com/product/see-automatic-diagram-generation>
- `etap-gendoc` <https://etap.com/product/see-gen-edoc>
- `etap-ssd` <https://etap.com/product/see-system-design>
- `etap-devis` <https://etap.com/request-pricing-subscription?formId=f4614d46-0c28-6c02-8629-ff08005ae238&product-range=SEE-Electrical-PLM> (lecture unique)
- `etap-6.0` <https://etap.com/singleevent/2026/10/28/webinar/discover-what's-new-in-see-electrical-expert-for-complex-electrical-schematic-cad-projects---webinar-102826> (lecture unique)

**Brochures, flyers, formation**
- `flyer-v5r2` <https://etap.com/docs/default-source/see/see-electrical-expert-v5r2-etap-flyer.pdf?sfvrsn=dbe3447c_15>
- `abo-v5r2` <https://etap.com/docs/default-source/see/see-electrical-expert-v5r2-etap-subscription.pdf>
- `abo-2023` <https://www.ige-xao.com/wp-content/uploads/ENG-subscription-etap-SEE-Electrical-Expert.pdf>
- `harness-2025` <https://etap.com/docs/default-source/see/en-see-eelectrical-expert-harness-engineering.pdf?sfvrsn=d0c0577c_16>
- `see-v8r4` <https://etap.com/docs/default-source/see/eng-subscription-etap-see-electrical_v8r4.pdf?sfvrsn=d5227c_24>
- `harness-us` <https://www.ige-xao.com/images/en/us/pdf/products/see-electrical-harness/DOC-see-electrical-expert-harness-package-us.pdf>
- `harness-corpo` <https://www.ige-xao.com/wp-content/uploads/DOC-see-electrical-expert-harness-package-corpo-en.pdf>
- `broch-v4r2-fr` <https://www.ige-xao.com/images/client_area/patch/fr/DOC_SEE_Electrical_Expert_V4R2_FR_0216_screen.pdf>
- `broch-v4r3-uk` <https://www.ige-xao.com/wp-content/uploads/documentation/en/SXP/SEE-Electrical-Expert-V4R3-UK-201905-Screen.pdf>
- `corpo-2020` <https://www.ige-xao.com/wp-content/uploads/documentation_corporate_en-6-1.pdf>
- `flyer-adg` <https://www.ige-xao.com/wp-content/uploads/Flyer-Automatic-Diagram-Generation.pdf>
- `adg-png` <https://www.ige-xao.com/wp-content/uploads/automatic-diagram-generation-add-on.png> (lecture unique)
- `spm-lt` <https://www.ige-xao.com/wp-content/uploads/SEE-Project-Manager-LT-EN.pdf>
- `spm-es` <https://www.ige-xao.com/es/shop/see-project-manager/>
- `eed-capture` <https://www.ige-xao.com/wp-content/uploads/eed_2.png> (lecture unique)
- `sgv-capture` <https://www.ige-xao.com/wp-content/uploads/en/i/see-electical-harness-plm/see-electrical-harness-plm-13.png> (lecture unique)
- `formation-2026` <https://www.ige-xao.com/wp-content/uploads/catalogue-formation-etap.pdf>
- `joessel` <https://www.patrick-joessel.com/astuces-see-electrical-expert/>
- `joessel-yt` <https://www.youtube.com/@patrickjoessel/videos> (lecture unique)
- `joessel-yt3` <https://www.youtube.com/watch?v=BsiTnZAJMcs> (lecture unique)

**Notes de version et nouveautés**
- `rn-v4r1-sp6a` <https://www.ige-xao.com/images/client_area/patch/fr/Release_notes_V4R1SP416A-FR.pdf>
- `news-v4r2-fr` <https://www.ige-xao.com/images/client_area/patch/fr/News_SEE_Electrical_Expert_V4R2_FR.pdf>
- `rn-v4r2-sp6` <https://www.ige-xao.com/wp-content/uploads/Release_Notes_SEE_Electrical_Expert_V4R2_Service_Pack_6_4_46_A_EN.pdf>
- `rn-v4r2-sp8` <https://www.ige-xao.com/wp-content/uploads/Release_Notes_SEE_Electrical_Expert_V4R2_Service_Pack_8_4_48_EN.pdf>
- `rn-v4r2-sp9` <https://www.ige-xao.com/wp-content/uploads/Release_Notes_SEE_Electrical_Expert_V4R2_Service_Pack_9_4_49_A_EN.pdf>
- `rn-v4r2-sp10` <https://www.ige-xao.com/wp-content/uploads/Release_Notes_SEE_Electrical_Expert_V4R2_Service_Pack_10_4_49C_EN.pdf>
- `new-v4r3` <https://www.ige-xao.com/wp-content/uploads/What_is_new_in_SEE_Electrical_Expert_V4R3_En-1-1.pdf> (lecture unique)
- `rn-4.80` <https://www.ige-xao.com/wp-content/uploads/Release_Notes_SEE_Electrical_Expert_V4R3_4_80_A_EN.pdf>
- `rn-4.81` <https://www.ige-xao.com/wp-content/uploads/Release_Notes_SEE_Electrical_Expert_V4R3_4_81_A_EN.pdf>
- `new-v4r3-sp1` <https://www.ige-xao.com/wp-content/uploads/What_is_new_in_SEE_Electrical_Expert_V4R3_Service_Pack_1_EN.pdf>
- `rn-4.82-fr` <https://www.ige-xao.com/wp-content/uploads/Release_Notes_SEE_Electrical_Expert_V4R3_Service_Pack_2_4_82_A_FR.pdf>
- `rn-4.83` <https://www.ige-xao.com/wp-content/uploads/Release_Notes_SEE_Electrical_Expert_V4R3_Service_Pack_3_4_83_A_EN-3.pdf>
- `new-v4r3-sp5` <https://www.ige-xao.com/wp-content/uploads/What_is_New_in_SEE_Electrical_Expert_V4R3_SP5_FR.pdf>
- `rn-4.85c-fr` <https://www.ige-xao.com/wp-content/uploads/Release_Notes_SEE_Electrical_Expert_V4R3_Service_Pack_5_4_85_C_FR.pdf>
- `rn-4.86-fr` <https://www.ige-xao.com/wp-content/uploads/Release_Notes_SEE_Electrical_Expert_V4R3_Service_Pack_6_4_86_A_FR.pdf>
- `rn-4.87a` <https://ige-xao.com/images/client_area/patch/pl/Release_Notes_SEE_Electrical_Expert_V4R3_Service_Pack_7_4_87_A_PL.pdf>
- `rn-4.87b` <https://ige-xao.com/images/client_area/patch/pl/Release_Notes_SEE_Electrical_Expert_V4R3_Service_Pack_7_4_87_B_PL.pdf>
- `rn-v5r1-sp7` <https://www.ige-xao.com/wp-content/uploads/Release-Notes-SEE-Electrical-Expert-V5R1-Service-Pack-7_5.17.3_PL.pdf>
- `rn-v5r2-sp4` <https://www.ige-xao.com/wp-content/uploads/Release-Notes-SEE-Electrical-Expert-V5R2-Service-Pack-4_PL.pdf> (lecture unique)
- `rn-v5r2-sp5` <https://www.ige-xao.com/wp-content/uploads/Release-Notes-SEE-Electrical-Expert-V5R2-Service-Pack-5_PL.pdf> (lecture unique)
- `rn-v5r2-sp6` <https://www.ige-xao.com/wp-content/uploads/Release-Notes-SEE-Electrical-Expert-V5R2-Service-Pack-6_PL.pdf> (lecture unique)
- `rn-v5r2-sp7` <https://www.ige-xao.com/wp-content/uploads/Release-Notes-SEE-Electrical-Expert-V5R2-Service-Pack-7_PL.pdf> (lecture unique)
- `rn-v5r2-info` <https://www.ige-xao.com/en/my-account/release-note/software-release-info-see-electrical-expert-v5r2/> (lecture unique)
- `adg-sp20` <https://www.ige-xao.com/en/release/adg-v4r3-sp20-a/>

**Fiches techniques, FAQ, manuels**
- `fiche-5829` <https://www.ige-xao.com/wp-content/uploads/Fiche_5829_Comment-importer-une-liste-de-cables_XML.pdf> (lecture unique)
- `fiche-5834` <https://www.ige-xao.com/wp-content/uploads/Fiche_5834_Configurer-la-V4R3-et-la-V5R1-lors-de-laquisition-dune-licence-LSB-LAUNCH-GROW-ou-SCALE-en-V5R2.pdf> (lecture unique)
- `fiche-5847` <https://www.ige-xao.com/wp-content/uploads/Fiche_5847_Creation-dune-base-materiel-sous-SQL-pour-SEE-V5R2-1.pdf>
- `manuel-v4r2-pl` <https://www.ige-xao.com/wp-content/uploads/Dokumentacja_programu_SEE_Electrical_EXPERT_V4R2.pdf> (lecture unique)
- `faq-wd` <https://www.ige-xao.com/wp-content/uploads/FAQ-How-to-get-Signal-names-in-the-output-WD-for-the-8-process.pdf> (lecture unique)
- `faq-vba` <https://www.ige-xao.com/wp-content/uploads/FAQ-How-to-trace-the-Wires-Numbering-Service-from-SEE-Electrical-Expert.pdf> (lecture unique)
- `tuto-v4r3` <https://www.ige-xao.com/images/client_area/patch/fr/Tutorial_SeeExpert_Educ_FR_V4R3.pdf>
- `plm-v4r7` <https://www.ige-xao.com/wp-content/uploads/SEE_Electrical_PLM_V4R7_-_Installation_Guide-SPLM.pdf>
- `plm-faq-hub` <https://www.ige-xao.com/wp-content/uploads/How-to-analyze-SEE-Electrical-PLM-V4-service-interruptions.pdf>
- `plm-glossaire` <https://ige-xao.com/images/client_area/pdf/faq/11644_SEE_Electrical_PLM_Glossary.pdf> (lecture unique)

**Dépôt tiers NSO73 (non officiel)**
- `nso73` <https://github.com/NSO73/see-electrical-expert-references>
- `nso-index` <https://raw.githubusercontent.com/NSO73/see-electrical-expert-references/main/index.jsonl>
- `nso-comnet` <https://raw.githubusercontent.com/NSO73/see-electrical-expert-references/main/com-net.jsonl>
- `nso-enums` <https://raw.githubusercontent.com/NSO73/see-electrical-expert-references/main/enums.jsonl>
- `nso-types` <https://raw.githubusercontent.com/NSO73/see-electrical-expert-references/main/types.jsonl>
- `nso-libs` <https://raw.githubusercontent.com/NSO73/see-electrical-expert-references/main/libs.jsonl>
- `nso-cmd` <https://raw.githubusercontent.com/NSO73/see-electrical-expert-references/main/commands.jsonl>
- `nso-inv` <https://raw.githubusercontent.com/NSO73/see-electrical-expert-references/main/inventory.jsonl>
- `nso-v4r3-cn` <https://raw.githubusercontent.com/NSO73/see-electrical-expert-references/main/v4r3/com-net.jsonl> (lecture unique)
- `nso-v4r3-types` <https://raw.githubusercontent.com/NSO73/see-electrical-expert-references/main/v4r3/types.jsonl> (lecture unique)
- `nso-v4r3-cmd` <https://raw.githubusercontent.com/NSO73/see-electrical-expert-references/main/v4r3/commands.jsonl>
- `nso-v4r3-inv` <https://raw.githubusercontent.com/NSO73/see-electrical-expert-references/main/v4r3/inventory.jsonl>

**Microsoft et outils d'automatisation**
- `ms-vdi` <https://learn.microsoft.com/en-us/troubleshoot/power-platform/power-automate/desktop-flows/cannot-record-in-vdi-environments>
- `ms-pad-vd` <https://learn.microsoft.com/en-us/power-automate/desktop-flows/virtual-desktops>
- `ms-pad-setup` <https://learn.microsoft.com/en-us/power-automate/desktop-flows/setup>
- `ms-appctl` <https://learn.microsoft.com/powershell/scripting/learn/application-control>
- `ms-langmodes` <https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_language_modes>
- `ms-sendkeys` <https://learn.microsoft.com/en-us/office/vba/language/reference/user-interface-help/sendkeys-statement>
- `ms-inspect` <https://learn.microsoft.com/en-us/windows/win32/winauto/inspect-objects>
- `accinsights` <https://www.accessibilityinsights.io/docs/windows/overview>
- `nordflux` <https://nordflux.de/en/guides/pad-is-almost-free-what-the-windows-license-gets-you>
- `pywinauto` <https://pywinauto.readthedocs.io/en/latest/getting_started.html>
- `mitre` <https://attack.mitre.org/techniques/T1059/010/>
