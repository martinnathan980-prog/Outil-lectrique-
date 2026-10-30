# La sonde PDF — ce que contiennent tes plans, sans jamais les montrer

Tes plans sont des PDF de schémas électriques : des équipements, leurs
connecteurs et leurs broches, les liaisons entre eux, les numéros de fil. Pour
écrire l'outil qui les lira tout seul (PDF → liaisons → paquet SEE → SEE), il
faut savoir **comment ces PDF sont faits** : du texte qu'on peut lire, ou des
textes dessinés en traits ? des traits, des rectangles, des images scannées ?
quelle taille d'écriture, quels angles, quelles formes de repères ?

La sonde répond à ces questions **sans rien laisser sortir de confidentiel**.
Tu la lances au bureau sur quelques plans ; elle écrit, pour chaque plan, un
rapport et un tableau que tu peux me renvoyer : ils ne contiennent **aucun
texte réel** de tes plans, ni le nom des fichiers, ni de nom propre.

**Ce qu'il faut savoir avant d'envoyer** : le tableau (`.elements.tsv`)
contient la **géométrie du dessin** — la place des traits, des rectangles,
des cercles et des textes (réduits à leur forme). Si un texte est dessiné en
traits (une police de DAO, un logo), ses traits ne sont **pas** écrits un par
un : le tableau n'en garde qu'une boîte par mot, on ne peut pas le relire
(jusqu'à 3 cm de haut ; au-delà, ou s'il touche un fil ou un cadre, il reste
écrit trait par trait).
Le rapport (`.rapport.txt`) ne contient que des comptes et des formes. Si tu
hésites, commence par m'envoyer seulement le `.rapport.txt`.

## Pour toi : comment t'en servir

Tout arrive dans **`Kit-PDF.zip`**, par courriel : deux fichiers,
`sonde_pdf.py` et `LIS-MOI-D-ABORD.txt`, et un dossier vide, `PDF-A-LIRE`.
Le `LIS-MOI-D-ABORD.txt` dit tout, une action par ligne ; en bref :

1. **Débloquer le zip** (clic droit, *Propriétés*, *Débloquer*), puis
   *Extraire tout*.
2. **Vérifier Python** : touche Windows, `cmd`, puis `py --version` (ou
   `python --version`) : il faut Python 3.8 ou plus récent.
3. **Mettre 2 ou 3 plans** représentatifs dans `PDF-A-LIRE` : un simple, un
   chargé, un avec des connecteurs (ou le laisser vide : une fenêtre les
   demandera).
4. **Double-cliquer sur `sonde_pdf.py`.** Une fenêtre noire lit les plans
   (de quelques secondes à deux minutes par plan), puis ouvre le dossier
   **`rapports`** ; elle attend Entrée avant de se fermer. S'il s'ouvre dans
   un éditeur : clic droit, *Ouvrir avec*, *Python* ; sinon, dans la barre
   d'adresse du dossier, `cmd`, puis `py sonde_pdf.py`.
5. **Relire chaque `.rapport.txt`** dans le Bloc-notes : aucun vrai texte de
   plan ne doit y être. Au moindre doute, le montrer d'abord à ton
   responsable.
6. **M'envoyer les `.rapport.txt` seuls**, zippés (clic droit, *Envoyer
   vers*, *Dossier compressé*). Les `.elements.tsv` seulement si ton
   responsable est d'accord ; jamais un fichier `EN-CLAIR`.

Il faut Python 3.8 ou plus récent. **Rien à installer** : pas de `pip`, pas
d'Internet. Si PyMuPDF est installé, la sonde s'en sert pour se vérifier
(elle compare ses deux façons de lire) ; sinon elle lit les PDF toute seule.

Commence par **deux ou trois plans représentatifs**, pas par les centaines :
c'est pour comprendre leur forme, pas pour les saisir.

### Le double-clic, en détail

Lancée **sans aucun chemin** (un double-clic dans l'Explorateur, ou
`py sonde_pdf.py` tout court), la sonde :

1. lit les PDF du dossier **`PDF-A-LIRE`**, à côté d'elle (sous-dossiers
   compris ; ils y restent : pour en lire d'autres, les remplacer) ;
2. s'il n'y en a pas, et si `tkinter` est là (il vient avec le Python de
   python.org), ouvre une fenêtre **« Ouvrir »** pour choisir un ou plusieurs
   PDF (Ctrl enfoncé) ; elle peut s'ouvrir derrière la fenêtre noire, l'écran
   le dit ;
3. sinon, ou si l'on annule : crée `PDF-A-LIRE`, l'ouvre dans l'Explorateur et
   dit quoi faire (y copier 2 ou 3 plans, relancer) ; code de sortie 1.

**Glisser** des PDF (ou un dossier) sur `sonde_pdf.py` marche aussi : le
lanceur `py` de Windows les passe en arguments. À la fin, sous Windows, le
dossier des rapports s'ouvre et l'écran redit l'avertissement : rapports
anonymisés, le `.elements.tsv` porte la géométrie, le `.rapport.txt` seul
suffit pour commencer (et un `ATTENTION` s'il traîne un fichier `EN-CLAIR`).

La fenêtre **attend Entrée** seulement quand elle a été ouverte pour la
sonde : `GetConsoleProcessList` (kernel32, par `ctypes`) donne les processus
attachés à la console ; la sonde attend si aucun autre n'y est que Python
lui-même (`py.exe`, le lanceur du double-clic ; `python.exe`, celui d'un
venv). Une invite de commandes (`cmd.exe`, donc aussi `sonde-pdf.bat`),
PowerShell ou un nom illisible : pas d'attente (la fenêtre reste ouverte
d'elle-même, ou le `.bat` fait sa pause). Le seul compte des processus ne
suffit pas : `cmd.exe` + `python.exe` font deux, comme `py.exe` +
`python.exe`. Jamais d'attente hors de Windows ; une entrée fermée ou en fin
de fichier ne bloque pas.

**Aucun traceback** : une exception imprévue (même `MemoryError`) ne montre
que sa classe et un message en français (code de sortie 3) ; un
avertissement de Python, une exception dans un fil ou hors du programme non
plus. Un traceback ou un avertissement montrent le chemin du script, donc
l'identifiant Windows (`C:\Users\…`).

`SONDE_SANS_FENETRE=1` (variable d'environnement) : ni fenêtre de choix, ni
Explorateur, ni attente — pour les tests, ou un lancement par un autre
programme.

### Le Kit-PDF, et le `.bat` qui n'y est pas

`node see/kit.js --pdf` écrit **`Kit-PDF.zip`** (`--sortie=…` pour un autre
nom) : `Kit-PDF/sonde_pdf.py` (copié octet pour octet), puis
`Kit-PDF/LIS-MOI-D-ABORD.txt` (`see/pdf/kit/`, UTF-8 avec BOM, CRLF : le
Bloc-notes l'ouvre tel quel), et le dossier vide `Kit-PDF/PDF-A-LIRE/`.
Gmail refuse `.bat`, `.cmd`, `.ps1`, `.js`, `.vbs`… **même dans un zip** ;
le `.py` n'est pas sur sa liste. `kit.js` vérifie chaque fichier contre cette
liste (`REFUSES_PAR_COURRIEL`, complétée : `.appx`, `.iso`, `.msix`, `.vhd`,
`.xll`…) et refuse d'écrire un kit qui en porterait un. Le zip produit ne va
pas dans le dépôt (`.gitignore`). Si la messagerie de l'entreprise retenait
quand même le `.py` : le renommer en `.txt` avant de zipper, et lui rendre
son nom au bureau (une étape de plus, à guider à part).

**`sonde-pdf.bat`** reste dans le dépôt, hors du kit : pour une sonde qui
arrive autrement (clé USB, partage réseau), posé à côté de `sonde_pdf.py`.
On glisse des PDF (ou un dossier) dessus, ou on le double-clique (la sonde lit
alors `PDF-A-LIRE`) ; il trouve Python (`py -3`, puis `python`, puis
`python3`), lance la sonde et fait sa pause ; l'avertissement final et
l'Explorateur, c'est la sonde qui les fait (une seule fois). Si Windows le
bloque (« Windows a protégé votre ordinateur ») : clic droit >
Propriétés > coche **Débloquer** > OK.

Dans une invite de commandes, avec des chemins :

```
py sonde_pdf.py "C:\chemin\vers\plan.pdf"
py sonde_pdf.py "C:\chemin\vers\un\dossier"
```

### Si ça coince sous Windows

- Un nom de fichier ou de dossier avec **`&`** ou **`^`** sans espace
  (`R&D`, `E&S`) casse la ligne de commande du `.bat` **avant** que la sonde
  démarre : renomme-le, mets le plan dans `PDF-A-LIRE`, ou passe par
  l'invite de commandes avec des guillemets
  (`py sonde_pdf.py "C:\R&D\plan.pdf"`).
- Les dossiers très profonds (plus de 260 caractères, fréquent sur un partage
  réseau) sont lus quand même ; un dossier que tu n'as pas le droit de lire
  est compté et dit à l'écran.

### Ce qu'elle écrit

Pour chaque PDF, deux fichiers, nommés d'après un **numéro** et une
**empreinte** du contenu (par exemple `03-4f1c9a2e`), jamais d'après le nom du
PDF :

- `03-4f1c9a2e.rapport.txt` : le rapport, en français ;
- `03-4f1c9a2e.elements.tsv` : la liste des éléments dessinés (un tableau que
  l'on peut ouvrir dans Excel).

Un second passage continue la numérotation (04, 05…) : rien n'est écrasé.
L'écran ne montre ni le nom des fichiers ni le chemin des dossiers.

### Ce qu'elle n'écrit JAMAIS (par défaut)

- aucun texte de tes plans : chaque texte est remplacé par sa **forme** —
  majuscule → `A`, minuscule → `a`, chiffre → `9`, les autres signes gardés.
  `601RC1` devient `999AA9`, `W-1234-22` devient `A-9999-99` ; la longueur
  d'un texte dans le tableau est conventionnelle (elle ne suit pas la largeur
  des lettres, qui laisserait deviner le mot) ; mais ce qui épouse un texte
  et qui est dessiné (un cadre, un soulignement, un masque) ou le rectangle
  d'un lien ou d'un surlignage garde sa vraie largeur, comme toute la
  géométrie ;
- aucun texte dessiné en traits : ses traits sont groupés, une boîte par mot
  (jusqu'à 3 cm de haut) ;
- aucun nom de fichier, aucun nom de dossier ;
- aucun nom propre : un calque, une police maison, une étiquette ou une clé
  ajoutée par un logiciel est donné par un **code et sa forme** (`P1
  (Aaaaaaa-Aaaa)`) ; seuls les noms du commerce (Arial, Helvetica…), de la
  norme PDF ou faits de mots ordinaires (`PartNumber`, `Norme`) sont écrits ;
- ni l'auteur, ni le titre, ni le sujet du PDF (seulement « présent ») ;
- dans le nom du logiciel qui a fait le PDF (« Producer », « Creator »), elle
  garde le nom d'un logiciel connu (SEE Electrical, AutoCAD, Adobe…) et sa
  version, et masque le reste (un nom de société, de personne, de projet, un
  numéro de projet ou d'ordre de travail, un chemin).

Si un plan **peut** être montré (un plan sans secret), l'option `--clair`
écrit aussi les vrais textes et toute la géométrie. Les fichiers portent
alors `EN-CLAIR` dans leur nom (`03-4f1c9a2e.EN-CLAIR.rapport.txt`), vont
dans un dossier à part (`rapports-EN-CLAIR`), et l'écran le répète :

```
python sonde_pdf.py --clair "C:\chemin\vers\plan-public.pdf"
```

Un PDF protégé par un mot de passe : `--mot-de-passe=XXX` (celui
d'ouverture ou celui du propriétaire ; les PDF sans mot de passe du même
dossier se lisent toujours).

### Ce que dit le rapport

- le logiciel qui a fait le PDF, la version du PDF, s'il est chiffré (et
  avec quel mot de passe il s'est ouvert), s'il a des calques, des
  annotations, des pièces jointes ;
- le **verdict** : *vectoriel avec texte* (le meilleur cas : les traits et les
  textes se lisent directement), *vectoriel sans texte* (les textes sont
  dessinés en traits : il faudra les reconnaître), *scanné* (une image : il
  faudra une reconnaissance d'image), *mixte* ; et pourquoi ; il signale aussi
  les **groupes de petits traits** qui ressemblent à du texte dessiné en traits ;
- page par page : le format (A3 paysage…), le nombre de textes visibles et
  **invisibles** (et pourquoi ils sont invisibles : texte caché, hors de la
  page, hors de sa découpe, blanc sur blanc, de la couleur du fond, calque
  masqué, recouvert, trop petit), de segments (horizontaux, verticaux,
  obliques), de rectangles, de courbes, de cercles, d'images ;
- ce que les textes ont en commun (tailles, angles, polices, couleurs) et
  ce que les traits ont en commun (épaisseurs, couleurs, rectangles et cercles
  qui reviennent souvent : les connecteurs, les broches) ;
- le **dictionnaire des motifs** : chaque forme de texte et son nombre
  (`999AA9` : 312 fois, `A99` : 290 fois…). C'est lui qui dira comment
  reconnaître un repère, une broche, un numéro de fil ;
- les **symboles** que le logiciel a posés comme des tampons (le même dessin
  posé plusieurs fois), comment les traits se touchent (bouts libres,
  piquages en T, bouts sur une broche, points de jonction) et **où se posent
  les textes** de chaque forme (sur un fil, le long d'un fil, dans un
  rectangle, au bout d'un trait — les textes tournés à part) : c'est ce qui
  dira quel texte est un numéro de fil, une broche, un repère ;
- les textes **cachés** qui ne se dessinent pas : annotations, « contenu
  marqué », et les **données non dessinées** (clés ajoutées aux propriétés
  du PDF ou des pages, propriétés XMP, arbre de structure) : si tes normes et
  références sont dans le PDF sans se voir, c'est là qu'elles apparaîtront
  (en motifs) ;
- ce que la sonde n'a pas su lire.

## Pour les agents : le format

### Le programme

`sonde_pdf.py` : un seul fichier, **bibliothèque standard de Python seule**
(3.8 à 3.13 ; vérifié par vermin, exécuté sous 3.8.20 et 3.13). Le lecteur
écrit ici (« standard ») lit chaque page : il est exact partout où on l'a
mesuré, et c'est lui qui dit le contenu marqué, l'état par défaut des
calques, les découpes, la colonne `bloc`. Si PyMuPDF est importable
(`import pymupdf`, puis `import fitz`), il **relit** chaque page pour comparer
(section « LES DEUX LECTEURS »), complète les caractères que le lecteur
standard ne connaît pas (`¤` : police composite sans `ToUnicode`, dont seul le
programme de la police dit les caractères ; même place à 0,1 mm, même
longueur ; un `¤` n'est complété que par une lettre ou un chiffre, tout autre
signe, une espace comprise, le laisse `¤` : faute de nom de glyphe connu,
PyMuPDF rend le code brut, 33, 34… dans l'ordre d'apparition, et `KESTREL`
deviendrait `!"#$%"&`, un chiffre par substitution), et prend une
page à son compte si le lecteur standard échoue
dessus (ou le fichier entier s'il ne l'ouvre pas). `--lecteur=pymupdf` le met
devant (essais) ; `--lecteur=standard` s'en passe. Avant PyMuPDF 1.23, ses
tracés diffèrent sur des cas connus (fermeture des chemins, couleurs) : le
rapport le dit. Ses coordonnées sont recalculées sur CropBox ∩ MediaBox (la
page vue de la norme : MuPDF avant 1.24 et la `rotation_matrix` de PyMuPDF
partent de la CropBox brute, fausse quand elle déborde). MuPDF et PyMuPDF
n'écrivent rien à l'écran (`faire_taire()` : `mupdf_display_errors`,
`mupdf_display_warnings`, `set_messages` et `set_log` vers un flux muet) :
leurs messages recopient le nom d'une police maison, d'une ressource, d'une
CMap, les mots d'un flux abîmé ; un paquet voisin (`pymupdf4llm`) les coupe à
son import, on ne compte pas sur lui. La réserve de leurs messages est vidée
avant chaque PDF et chaque page (`Page.bound()` en recopie le dernier à
l'écran pour une page « infinie », même affichage coupé).

Les limites qui protègent le poste (mesurées sur des PDF fabriqués) :

- **500 000 éléments** par PDF : au-delà, la lecture s'arrête, même au milieu
  d'une page, et le rapport le dit (page « INCOMPLÈTE », pages non lues). Un
  A0 de 20 000 segments : 3,6 s et 242 Mo ; 250 000 textes : 32 s et 860 Mo ;
  une page d'un million de segments : arrêtée à 376 000 éléments, 45 s et
  1,3 Go (avant : 115 s et 3,3 Go) ; 8 pages de 200 000 : 4 pages lues, 49 s
  et 1,0 Go (avant : 164 s et 3,2 Go) ;
- **120 s par PDF** (`--delai=`) : au-delà, la page en cours s'arrête, les
  suivantes ne sont pas lues, le rapport le dit, et l'on passe au PDF suivant ;
- par page : 5 millions d'opérations, 100 000 formulaires posés (des
  formulaires en éventail sur 24 niveaux en demanderaient 16 millions) ;
- PyMuPDF ne relit pas une page de plus de 150 000 tracés, ni une page qui a
  arrêté le lecteur standard (MuPDF peut y passer des minutes, ou s'y planter) ;
- une boîte démesurée (un texte de 10^9 mm, un aplat géant) ne compte que pour
  la page (et 10 mm autour) dans les recherches de voisins (les amas, eux, se
  cherchent partout : leurs traits font 30 mm au plus) ; des milliers
  d'éléments empilés à l'identique ne rendent pas les analyses quadratiques ;
  un arbre de noms ou une expression de calques qui se contient elle-même, un
  flux xref aux largeurs nulles ou au `/Size` de deux milliards, un
  prédicteur aux colonnes impossibles ne font plus boucler ni exploser la
  mémoire.

Options : `--clair`, `--sortie=DOSSIER`, `--pages=1-3,7`,
`--mot-de-passe=XXX`, `--lecteur=…`, `--delai=120`, `--aide`. Sans aucun
chemin (seulement des options, ou rien : le double-clic), la sonde lit
`PDF-A-LIRE`, à côté d'elle (voir « Le double-clic, en détail »). Code de
sortie 0 si au moins un rapport est écrit, 1 sinon, 2 pour une option
inconnue (seul son nom est répété à l'écran : la valeur peut être un mot de
passe mal tapé), 3 pour une erreur imprévue (sa classe et la dernière ligne
du script par où elle est passée, jamais un chemin), 130 si l'on
interrompt (Ctrl+C). Le point d'entrée est `lancer()` : il installe les
crochets qui gardent l'écran sans chemin (`sys.excepthook`,
`threading.excepthook`, `sys.unraisablehook`, `warnings.showwarning`),
appelle `principal()`, puis attend Entrée si `doit_attendre()`.
L'écran ne reçoit que de l'ASCII (console Windows cp850/cp1252), jamais le nom
d'un PDF ni le chemin d'un dossier (seulement « rapports, à côté de la
sonde »). Le dossier `rapports` (`rapports-EN-CLAIR` avec `--clair`) est à
côté du script ; s'il n'est pas modifiable : `Documents\sonde-pdf-rapports`, à
défaut le dossier temporaire (l'écran le dit). Chemins de plus de 240
caractères : préfixe `\\?\` sous Windows ; le parcours d'un dossier le prend
toujours (sinon `os.walk` saute en silence un sous-dossier de plus de 260
caractères) et compte les dossiers illisibles.

**Ce qui sort, et sous quelle forme** (relevé anonymisé) : un texte, une
valeur cachée, un nom de calque → son **motif** (`motif()` : toute lettre →
`A`/`a`, tout chiffre ou nombre → `9`, y compris lettres cerclées ou
encadrées, chiffres romains, nombres cerclés, fractions, accents décomposés ;
les autres signes gardés) ; un **nom** lu dans le PDF (police, étiquette ou
clé du contenu marqué, sorte d'annotation, clé hors norme, propriété XMP,
rôle de structure, encodage) → en clair s'il est de la norme PDF (pour une
CMap prédéfinie, seulement un nom de la norme : `Identity-H`,
`UniJIS-UCS2-H`… ; `Identity-NOM-H` n'en est pas un), une famille
de polices du commerce, ou fait de mots ordinaires (anglais et français
techniques, `nom_ordinaire()`), sinon un **code stable et sa forme** (`P1
(Aaaaaaa-Aaaa)`, `K2 (AaaaAaaaa)`, `E1`, `S1`, `R1`, `N1`) ; un filtre, un
espace de couleur, un gestionnaire de sécurité hors norme → « autre » /
« maison » (jamais le nom d'une encre ni la description d'un profil ICC) ; une
erreur Python → sa seule classe (`ValueError`), jamais son message (qui
recopie parfois un morceau du PDF) ; Producer/Creator → `masquer_logiciel()`.

Le lecteur standard gère : table xref classique, flux xref (PDF 1.5) et
hybrides, flux d'objets, mises à jour incrémentales (`/Prev`), reconstruction
en parcourant le fichier (xref fausse, décalée, absente, fichier tronqué) ;
filtres FlateDecode (prédicteurs PNG et TIFF), LZW (`EarlyChange`),
ASCIIHex, ASCII85, RunLength, Crypt ; les filtres d'image (DCT, JPX, CCITT,
JBIG2) ne sont pas décodés (inutile : on ne relève que la place de l'image) ;
chiffrement standard RC4 40 et 128 bits, AES-128, AES-256 (R5 et R6, AES écrit
en Python pur) : le mot de passe vide d'abord, puis celui qui est donné, comme
mot de passe utilisateur puis propriétaire (algorithme 7 pour R2 à R4, contrôle
de `/O` et `/OE` pour R5 et R6), le rapport dit lequel a ouvert ; pages héritées
(`Resources`, `MediaBox`, `CropBox`, `Rotate`, `UserUnit`) ; formulaires
imbriqués (avec `Matrix`, `/OC`, garde contre les boucles) ; matrices `cm`,
`Tm`, `Td`, `TD`, `T*`, `TL`, `Tz`, `Ts`, `Tc`, `Tw`, `TJ`/`Tj`/`'`/`"` ;
états graphiques `q`/`Q`, `gs` (`LW`, `CA`, `ca`, `Font`, `D`) ; chemins `m l
c v y h re` et leur peinture `S s f F f* B B* b b* n` ; découpes
rectangulaires (`re W n`, `BBox` d'un formulaire) ; images (`Do`,
`BI…ID…EI`) ; contenu facultatif (`BDC /OC`, OCG et OCMD avec `/P` et `/VE`,
état par défaut de `/OCProperties /D`) ; modes de rendu `Tr` ; couleurs
(gris, RGB, CMYK, ICC, Lab, Indexed, Separation/DeviceN par fonction
exponentielle, motifs) ; polices simples (WinAnsi, MacRoman, Standard,
`Differences`, `ToUnicode`, les 14 polices standard et leurs largeurs AFM),
Type3 (`Widths` × `FontMatrix`), composites Type0 Identity-H/V, CMap intégrée
(`codespacerange`, `cidrange`, `cidchar`), CMap UCS2/UTF16, `ToUnicode`
(`bfchar`, `bfrange` simple et en tableau), largeurs `W`/`DW`.

### Le TSV `NN-xxxxxxxx.elements.tsv`

UTF-8 avec BOM, fin de ligne CRLF, séparateur tabulation, point décimal, une
ligne d'en-tête (ASCII). Une ligne par élément, dans l'ordre où la page les
peint. **Coordonnées en millimètres, origine en HAUT À GAUCHE de la page vue,
x vers la droite, y vers le bas** (comme `see/FORMAT-PAQUET.md`), après la
rotation de la page (`/Rotate`) et le recadrage (`CropBox`).

| Colonne | Contenu |
|---|---|
| `page` | rang de la page (1…) |
| `n` | rang de la ligne dans la page, dans l'ordre de peinture ; relevé anonymisé : les lignes se suivent (1, 2, 3…), un amas compte pour une, à la place de son premier trait (le rang des éléments dirait, d'un amas au suivant, combien de traits a chacun) ; avec `--clair`, le rang de chaque élément |
| `type` | `texte`, `segment`, `rectangle`, `courbe`, `cercle`, `image`, `annotation`, `amas` (relevé anonymisé : un groupe de petits traits, voir plus bas) |
| `x1`, `y1`, `x2`, `y2` | mm, au centième. **segment** et **courbe** : les deux extrémités, dans le sens du tracé. **texte** : la ligne de base, du début du premier caractère ; la fin (`x2`, `y2`) est **conventionnelle** dans le relevé anonymisé (nombre de caractères × 0,6 corps : la vraie longueur suit la largeur des lettres et laisserait deviner le texte), réelle avec `--clair`. **rectangle**, **cercle**, **image**, **annotation**, **amas** : la boîte (coin haut gauche, coin bas droit) |
| `angle` | degrés, sens trigonométrique tel qu'on le voit (0 = vers la droite, 90 = vers le haut), dans [0 ; 360) ; vide pour un rectangle, un cercle, une annotation. Texte : le sens de lecture (90 = se lit de bas en haut) |
| `epaisseur` | épaisseur du trait (mm, au millième) ; vide si l'élément n'est pas tracé |
| `taille` | texte seulement : le corps en points sur la page (corps × échelle × compression `Tz`, comme PyMuPDF) ; la hauteur d'une capitale est d'environ 0,7 corps |
| `couleur` | `#rrggbb` du trait (ou du texte) ; `motif` pour un motif ; vide si non tracé |
| `fond` | `#rrggbb` du remplissage ; vide si non rempli |
| `visible` | `O` ou `N` |
| `raison` | si `N` : `mode3` (texte rendu invisible, Tr 3), `mode7` (texte qui ne sert qu'à découper, Tr 7), `horspage`, `decoupe` (entièrement hors de sa découpe rectangulaire), `blanc` (blanc sur la page ou sur un aplat blanc), `fond` (texte de la couleur de l'aplat sur lequel il est peint), `calque` (calque masqué par défaut), `transparent` (opacité nulle), `minuscule` (corps < 1 pt), `recouvert` (entièrement sous un rectangle plein et opaque peint après lui), et pour une annotation `cachee`, `sansapparence` ; plusieurs raisons séparées par des virgules |
| `calque` | `C1`, `C2`… (dans l'ordre des numéros d'objet des calques ; le rapport donne pour chacun la forme de son nom et son état par défaut) ; vide hors calque |
| `chemin` | numéro du chemin dans la page : les segments d'une même polyligne ou d'un même chemin le partagent |
| `bloc` | l'élément vient d'un formulaire (XObject) posé dans la page : `X3.12` = le formulaire `X3` (numérotés dans l'ordre de leur première pose dans le document), sa 12e pose de premier niveau dans la page ; un symbole posé plusieurs fois se reconnaît là ; vide sinon, et toujours vide sur une ligne `amas` (des lettres posées chacune comme un formulaire donneraient sinon un chiffre par substitution : `X1.1 X2.1 X3.1 X4.1 X5.1 X2.2 X6.1` = KESTREL) |
| `motif` | texte ou annotation : le texte réduit à sa forme (`A`, `a`, `9`, signes gardés, espaces gardés ; `¤` = glyphe sans caractère connu) |
| `police` | texte : une famille du commerce (Arial, Helvetica, ISOCPEUR…) par son nom, sans le préfixe de sous-ensemble (`ABCDEF+`) ; une police maison par un code et sa forme (`P1 (Aaaaaaa-Aaaa)`) ; `Type3` |
| `details` | courbe : les deux points de contrôle (`x y x y`, mm) ; image : `LxH px, filtre, espace, bits`, `dans un motif` (filtre et espace : leur famille de la norme, sinon `autre`) ; texte : nombre de caractères, `(texte en contour)` ; annotation : sa sorte (norme, sinon code et forme) et la source de son texte (`Contents`, `V`, `TU`, `T`, `URI`) ; amas : l'ordre de grandeur de son nombre de traits (`moins de 10 traits`, `10 a 50 traits`, `plus de 50 traits`), et `peut-etre du texte dessine en traits` (à partir de 10 traits) ; `tirets` pour un trait pointillé ; `amas N` (avec `--clair`) pour un trait d'un amas |
| `texte_EN_CLAIR` | **seulement avec `--clair`** : le texte réel |

**Les amas** (relevé anonymisé). Un texte dessiné en traits (police SHX
d'AutoCAD, police « bâton » de CATIA, texte vectorisé en contours pleins, logo)
se relirait en retraçant les segments du TSV. Trois passes le regroupent
(`amas_de_petits_traits()`) :

1. les **petits traits** (segments, courbes, rectangles, cercles de moins de
   10 mm ; un segment prolongé bout à bout dans le même sens compte pour sa
   longueur totale, si bien qu'un fil coupé à chaque piquage n'est pas un
   petit trait) **proches** les uns des autres (à moins de 0,6 fois la taille
   du plus grand des deux, 2 mm au plus) forment un amas ;
2. de même avec les traits de **30 mm au plus** : un groupe qui contient un
   trait de plus de 10 mm devient un amas (à la place des amas de la
   première passe qu'il contient) s'il n'a pas plus de 30 mm de haut ou de
   large, s'il ne **touche aucun trait plus long** (à 0,3 mm près, par la
   vraie distance entre les traits, pas par leurs boîtes ; un rectangle
   compte pour ses quatre côtés), et s'il n'est pas un **symbole qui porte
   son repère** (un dessin où les rectangles trapus et les cercles font plus
   d'un élément sur cinq, avec un texte réel à moins de 2 mm) : les grandes
   lettres d'un cartouche, un titre, un logo, un `0` en rectangle barré. Un
   symbole raccordé à un fil, ou qui porte son repère, reste de la
   géométrie ;
3. les **lettres d'un mot** : deux amas de même hauteur (à 20 % près),
   alignés en haut et en bas (à 10 % de la hauteur près) et séparés de moins
   de 0,6 fois leur hauteur s'unissent. Une police SHX espace ses lettres
   d'un tiers de leur hauteur : au-delà de 6 mm, chaque lettre ferait sinon
   son propre amas.

Les grilles de ces recherches n'ont pas de bornes : un cartouche hors de la
page vue (page recadrée par une CropBox, plan imprimé « taille réelle » sur
un format plus petit) se regroupe aussi. Un amas d'au moins deux traits est
écrit en **une ligne** (`amas`) : sa boîte, l'ordre de grandeur de son nombre
de traits, l'épaisseur et la couleur les plus fréquentes. Ni la place des
traits, ni leur nombre par sorte, ni leur taille, ni le formulaire d'où ils
viennent : pour un amas d'une lettre, ce serait sa signature, et l'alphabet
de la police relirait le texte. Un amas de moins de 10 traits plus haut que
large est élargi à 0,6 fois sa hauteur (un `1` étroit ne se distingue pas
d'une autre lettre ; les amas couchés ne sont pas élargis, ce qui déformerait
trois fois plus de symboles). Des symboles (masse, blindage, flèches, broche
et son amorce) deviennent aussi des amas, comme un petit dessin isolé
(moins de 30 mm de haut ou de large, sans contact avec un trait plus long ni
repère à côté : un bout de fil seul, un symbole posé seul). Ce qui reste
écrit trait par trait : les traits longs (fils, cadres, boîtes), ce qui les
touche, les petits traits isolés (un tiret seul, une amorce loin de tout).
Dans le rapport, un
formulaire fait seulement de traits d'amas (une lettre posée comme un
formulaire) n'est pas détaillé (section FORMULAIRES) : la liste, numérotée
dans l'ordre des premières poses, avec la fréquence et le contenu de chacun,
donnerait l'alphabet du texte. Avec `--clair`, tout est écrit, et chaque
trait d'un amas porte `amas N` dans `details`. Mesuré : un schéma au texte en
traits (« KESTREL 350A41-1234-00 », 111 traits) et un schéma au texte
vectorisé en contours (DejaVu, 1 359 traits et courbes) ne laissent dans le
TSV que leurs fils, leur boîte et deux tirets isolés ; « KESTREL
350A41-1234 » en traits de 7, 12 et 20 mm, ou en contours pleins de 14 mm :
3 ou 4 amas par ligne, aucun trait de lettre, de même hors de la CropBox ou
de la MediaBox ; sur les six folios de l'Atelier, les trois passes ne
changent aucun trait (cinq boîtes d'amas au plus par folio, élargies
autrement) ; sur le schéma du corpus, une polyligne seule et deux petits
symboles sans fil ni repère passent en amas.

Règles de construction (les mêmes pour les deux lecteurs) :

- un chemin est d'abord **normalisé** : un trait de moins de 0,01 pt, une
  courbe dont les points se confondent sont jetés (comptés « points ») ; une
  courbe droite (p0 = p1 et p2 = p3, ou trois points confondus) devient un
  trait ; puis il est coupé en **chaînes** contiguës ; une chaîne de quatre segments
  fermée, horizontaux et verticaux en alternance (un `re`, ou `m l l l h`) est
  un **rectangle** ; une chaîne fermée de courbes de Bézier qui tient sur un
  cercle (à 3 % près) est un **cercle** ; tout le reste est décomposé en
  **segments** (droites) et **courbes** (Bézier cubiques) ; un trait plus
  court que 0,01 pt est compté comme « point » dans le rapport, pas écrit ;
- un remplissage suivi du trait du même chemin donne **un** élément (`couleur`
  et `fond`) ; une surface peinte par un **motif** (`Pattern` : hachures,
  dégradé, trame) n'est pas un élément (comme dans MuPDF : c'est une découpe
  puis le motif) : seul son trait reste ; le rapport compte ces surfaces page
  par page ;
- les glyphes se regroupent en **textes** : même police, même corps, même
  sens, même couleur, même calque, sur la même ligne de base (à 0,05 corps),
  à moins d'un corps l'un de l'autre (un texte espacé lettre à lettre reste
  un texte : en morceaux, le début de chacun dirait la largeur des lettres) ;
  un écart de plus de 0,12 corps
  au-delà de l'écart ordinaire du texte (pour un texte espacé lettre à
  lettre) devient une espace ; les espaces de bout sont retirées ; les
  ligatures (ﬀ, ﬁ, ﬂ, ﬃ, ﬄ, ﬅ, ﬆ) sont écrites en lettres ;
- un trait qui revient exactement sur le précédent (aller-retour : un `re`
  sans hauteur, une polyligne qui revient sur ses pas) n'est écrit qu'une fois
  (compté « traits doublés ») ; un `re` sans largeur ou sans hauteur est un
  **segment** pour les deux lecteurs ; des coordonnées infinies sont jetées ;
- la **boîte** d'un texte (pour hors page, blanc, recouvert) est
  conventionnelle : de la ligne de base, 0,8 corps au-dessus, 0,2 au-dessous ;
- une **découpe** rectangulaire (`re W n`, la `BBox` d'un formulaire) est
  suivie : un élément entièrement hors d'elle est invisible (`decoupe`) ; un
  élément en partie découpé est relevé en entier ; une découpe d'une autre
  forme n'est pas appliquée (le rapport le dit) ;
- une police absente ou illisible : le texte est lu en Helvetica (comme
  MuPDF), ses glyphes comptés dans le rapport ;
- horizontal, vertical : à 0,5° près.

### Le rapport `NN-xxxxxxxx.rapport.txt`

UTF-8 avec BOM, CRLF. Première ligne : `SONDE PDF -- relevé ANONYMISÉ` ou
`SONDE PDF -- relevé EN CLAIR` (le relevé anonymisé rappelle ensuite que le TSV
contient la géométrie du dessin). Sections, dans l'ordre : en-tête (version de
la sonde, Python et système, bibliothèques présentes, numéro et empreinte du
fichier, lecteur utilisé), `LE DOCUMENT`, `VERDICT`, `PAGE PAR PAGE`,
`CE QUE LES TEXTES ONT EN COMMUN`, `CE QUE LES TRAITS ONT EN COMMUN`,
`DICTIONNAIRE DES MOTIFS` (motif, occurrences, corps le plus fréquent, angles,
invisibles ; tabulations ; 3 000 motifs au plus, tous sont dans le TSV),
`FORMULAIRES (XObject) : DES SYMBOLES PROBABLES` (chaque formulaire posé :
poses, éléments et contenu d'une pose, taille, motifs des textes dedans),
`COMMENT LES TRAITS SE TOUCHENT` (extrémités seules ou partagées, piquages en
T, bouts sur le bord d'un petit rectangle, au centre ou sur le bord d'un petit
cercle, petits cercles pleins), `OÙ SE POSENT LES TEXTES` (par motif : dans un
rectangle de moins d'une demi-page ; sur un trait = un segment parallèle au
texte, quel que soit son angle, sous le texte ou le traversant à 2 mm au plus
de la ligne de base ; le long d'un trait = de 2 à 5 mm à côté ; près d'un bout
de segment ; puis le même tableau pour les seuls textes tournés),
`ANNOTATIONS`, `CONTENU MARQUÉ (BDC / BMC)` (étiquettes, clés des propriétés,
motifs des textes cachés : `ActualText`, `Alt`, `E` et clés propres d'un
logiciel), `DONNÉES NON DESSINÉES` (clés hors norme de `/Info`, du catalogue
et des pages, `/PieceInfo` du catalogue, des pages et des formulaires,
propriétés XMP du document, des pages et des formulaires, arbre de structure :
types, `/Alt`, `/ActualText`, `/E`, `/T`, attributs ; chaque nom en clair ou en
code, chaque valeur en motif), `POLICES`, `LES DEUX LECTEURS` (si PyMuPDF a
relu), `CE QUI N'EST PAS GÉRÉ`.

### Ce qui n'est pas géré (et se dit dans le rapport)

- seules les découpes rectangulaires sont appliquées, et un élément en partie
  découpé est relevé en entier ;
- le contenu d'un **motif** (`Pattern` : hachures, quadrillage, image
  tramée) n'est pas parcouru ; une image dans un motif à pavé est relevée sur
  la boîte de la surface peinte (approché) ; les dégradés (`sh`) sont comptés,
  pas relevés ; les masques doux (`SMask`) sont ignorés ;
- les apparences des annotations ne sont pas lues (leur rectangle et leur
  texte, oui) ;
- les programmes de police (TrueType, CFF) ne sont pas lus : une police
  simple sans `/Widths` hors des 14 standard prend une largeur estimée, une
  police composite sans `ToUnicode` donne des `¤` (que PyMuPDF complète s'il
  est installé) ; une CMap prédéfinie autre
  qu'Identity et UCS2/UTF16 est lue sur deux octets ; l'écriture verticale est
  placée comme horizontale ;
- couleurs : Separation/DeviceN par une fonction autre qu'exponentielle →
  gris ; CMYK converti sans profil ;
- chiffrement : seul le gestionnaire standard ; un PDF à mot de passe
  d'ouverture inconnu donne un rapport « illisible » (`--mot-de-passe=`) ;
- `/AS` des calques (états automatiques) ignoré : l'état par défaut fait foi ;
- ce qui reste approché dans l'anonymisation : un caractère isolé d'un seul
  trait (un tiret, un `I`) reste un segment ; un texte dessiné en traits de
  plus de 3 cm de haut (titre, logo), ou qui touche un trait plus long (un
  fil, un cadre), reste écrit trait par trait ; un texte en traits tourné
  (qui se lit de bas en haut) de plus de 6 mm garde une boîte par lettre (les
  lettres d'un mot ne sont réunies qu'à l'horizontale), étroite pour un `1` ;
  un texte écrit lettre à lettre espacé de plus d'un corps (chaque
  lettre un élément) laisse l'écart entre deux lettres, donc à peu près leur
  largeur ; ce qui épouse un texte et qui est dessiné (un cadre, un
  soulignement, un masque) ou le rectangle d'une annotation (un lien, un
  surlignage) garde la vraie largeur du texte, que la longueur
  conventionnelle cache ; un `ToUnicode` fabriqué qui envoie des lettres
  vers des signes (`▲`, `✓`) les laisse tels quels (`motif()` réduit les
  lettres, les chiffres, le braille, pas les autres signes) ; la liste des
  logiciels connus et celle des mots ordinaires sont des listes blanches (un
  nom absent est masqué, jamais montré).

### Les deux lecteurs, mesurés

Sur le corpus d'essai et les PDF fabriqués par le test, le lecteur standard
et PyMuPDF (1.23.26 sous Python 3.8, 2.0 sous Python 3.13) donnent les mêmes
éléments à 0,1 mm près (écart maximal mesuré : 0,000 mm). Sur 36 géométries de
page (deux origines de MediaBox, trois CropBox dont une qui déborde, Rotate 0,
90, 180, 270, −90 et 450, `cm` et formulaires imbriqués avec `Matrix`), les
deux lecteurs sont exacts (864 contrôles, écart maximal 0,0002 mm) ; PyMuPDF
1.19 y perd un côté d'un rectangle plein tourné dans chaque configuration (il
ne sert qu'à comparer). MuPDF dessine les apparences des annotations, pas le
lecteur standard : sur un PDF annoté, PyMuPDF compte des traits de plus. Sur 34 PDF réels
variés (Word, InDesign/Adobe PDF Library, Skia, iLovePDF, PDFCreator,
StarOffice ; 6 premières pages), 30 sont identiques ; les 4 autres diffèrent
d'un texte chacun : une ligature `f_t` que MuPDF lit `f` et le lecteur
standard `ft`. Avec PyMuPDF 1.23 (avant 1.24, PyMuPDF ne donne pas le trait de
fermeture `h` d'un chemin, seulement un drapeau `closePath` pour tout le
chemin : la sonde ferme chaque chaîne ouverte), 25 sur 34 sont identiques ;
les autres diffèrent de quelques segments sur des milliers (sous-chemins
ouverts et fermés mêlés). Toutes les pages des 34 en ligne de commande : 29 s avec le
lecteur standard seul, 50 s quand PyMuPDF relit pour comparer. La comparaison ne retient pas les traits et courbes de moins
de 0,05 mm (MuPDF, en simple précision, garde ou jette autrement les cas
dégénérés) ni les textes de découpe (Tr 7, que PyMuPDF ne rend pas).

### Les tests

```
python tests/sonde-pdf.py                       des PDF fabriqués à la main par le test
python tests/sonde-pdf.py --corpus=DOSSIER      et le corpus d'essai (hors du dépôt)
node tests/kit-pdf.js                           le Kit-PDF (see/kit.js --pdf), sans Python
```

`tests/sonde-pdf.py` lance aussi la sonde comme d'un double-clic, sur une
copie (`SONDE_SANS_FENETRE=1`, entrée vide ou fermée) : `PDF-A-LIRE` créé
quand il n'y a rien à lire, ses PDF lus (sous-dossiers compris), sans
fenêtre possible (sans écran, `tkinter` présent ou absent) on retombe sur
le dossier sans bloquer, l'avertissement de la fin, des PDF glissés en
argument ; la décision d'attendre (`console_a_soi`) sur les cas de Windows
(python seul, `py.exe`, venv, `cmd.exe`, le `.bat`, PowerShell, un nom
illisible) ; `attendre_entree()` sur une entrée vide, absente ou fermée ;
une exception forcée (`ValueError`, `MemoryError`, `KeyboardInterrupt`),
un avertissement, une exception dans un fil : ni traceback ni chemin.
`tests/kit-pdf.js` relit le zip (lecteur écrit pour le test) : deux
fichiers et le dossier vide, la sonde octet pour octet, le LIS-MOI (BOM,
CRLF, étapes A à F, `PDF-A-LIRE`, `.rapport.txt`, le responsable, jamais
`--clair`), aucun type refusé par Gmail, le refus d'un `.bat`, la ligne de
commande, et le contrôleur éprouvé par des fautes injectées. Ce qui reste
propre à Windows (`GetConsoleProcessList`, `os.startfile`, la fenêtre
« Ouvrir », l'association des `.py`, l'extraction du zip) n'a **pas** été
essayé sous Windows.

Le corpus se fabrique hors du dépôt (`tests/sonde-pdf-corpus.py` demande
reportlab, PyMuPDF, pikepdf, Pillow ; `tests/sonde-pdf-folios.js` imprime les
six folios de l'Atelier avec Chromium) ; voir `tests/LISEZMOI.md`.
