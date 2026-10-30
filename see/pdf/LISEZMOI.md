# La sonde PDF — ce que contiennent tes plans, sans jamais les montrer

Tes plans sont des PDF de schémas électriques : des équipements, leurs
connecteurs et leurs broches, les liaisons entre eux, les numéros de fil. Pour
écrire l'outil qui les lira tout seul (PDF → liaisons → paquet SEE → SEE), il
faut savoir **comment ces PDF sont faits** : du texte qu'on peut lire, ou des
textes dessinés en traits ? des traits, des rectangles, des images scannées ?
quelle taille d'écriture, quels angles, quelles formes de repères ?

La sonde répond à ces questions **sans rien laisser sortir de confidentiel**.
Tu la lances au bureau sur quelques plans ; elle écrit un rapport que tu peux
me renvoyer : il ne contient **aucun texte réel** de tes plans.

## Pour toi : comment t'en servir

1. Copie le dossier `pdf` (les deux fichiers `sonde-pdf.bat` et
   `sonde_pdf.py`, ensemble) où tu veux sur ton PC, par exemple sur le Bureau.
2. **Glisse** un PDF, plusieurs PDF ou un dossier de PDF **sur
   `sonde-pdf.bat`** et lâche.
3. Une fenêtre noire s'ouvre, lit les PDF (de quelques secondes à quelques
   minutes pour un gros dossier), puis ouvre le dossier **`rapports`** à côté
   de la sonde. Appuie sur une touche pour fermer la fenêtre.
4. Renvoie-moi les fichiers du dossier `rapports` (ou colle-moi le contenu
   d'un `.rapport.txt`).

Il faut Python 3.8 ou plus récent (tu l'as). **Rien à installer** : pas de
`pip`, pas d'Internet. Si PyMuPDF est installé, la sonde s'en sert en plus
(elle compare alors ses deux façons de lire) ; sinon elle lit les PDF toute
seule.

Sans le `.bat`, dans une invite de commandes :

```
python sonde_pdf.py "C:\chemin\vers\plan.pdf"
python sonde_pdf.py "C:\chemin\vers\un\dossier"
```

Commence par **deux ou trois plans représentatifs** (un simple, un chargé), pas
par les centaines : c'est pour comprendre leur forme, pas pour les saisir.

### Ce qu'elle écrit

Pour chaque PDF, deux fichiers, nommés d'après un **numéro** et une
**empreinte** du contenu (par exemple `03-4f1c9a2e`), jamais d'après le nom du
PDF :

- `03-4f1c9a2e.rapport.txt` : le rapport, en français ;
- `03-4f1c9a2e.elements.tsv` : la liste des éléments dessinés (un tableau que
  l'on peut ouvrir dans Excel).

Un second passage continue la numérotation (04, 05…) : rien n'est écrasé.

### Ce qu'elle n'écrit JAMAIS (par défaut)

- aucun texte de tes plans : chaque texte est remplacé par sa **forme** —
  majuscule → `A`, minuscule → `a`, chiffre → `9`, les autres signes gardés.
  `601RC1` devient `999AA9`, `W-1234-22` devient `A-9999-99` ;
- aucun nom de fichier, aucun nom de dossier ;
- aucun nom de calque (seulement sa forme, `Aaaaa aaa` par exemple) ;
- ni l'auteur, ni le titre, ni le sujet du PDF (seulement « présent ») ;
- dans le nom du logiciel qui a fait le PDF (« Producer », « Creator »), elle
  garde le nom d'un logiciel connu (SEE Electrical, AutoCAD, Adobe…) et sa
  version, et masque le reste (un nom de société, de personne, de projet, un
  chemin).

Si un plan **peut** être montré (un plan sans secret), l'option `--clair`
écrit aussi les vrais textes ; le rapport le dit alors sur sa première ligne
(« EN CLAIR » au lieu de « ANONYMISÉ ») :

```
python sonde_pdf.py --clair "C:\chemin\vers\plan-public.pdf"
```

### Ce que dit le rapport

- le logiciel qui a fait le PDF, la version du PDF, s'il est chiffré, s'il a
  des calques, des annotations, des pièces jointes ;
- le **verdict** : *vectoriel avec texte* (le meilleur cas : les traits et les
  textes se lisent directement), *vectoriel sans texte* (les textes sont
  dessinés en traits : il faudra les reconnaître), *scanné* (une image : il
  faudra une reconnaissance d'image), *mixte* ; et pourquoi ;
- page par page : le format (A3 paysage…), le nombre de textes visibles et
  **invisibles** (et pourquoi ils sont invisibles : texte caché, hors de la
  page, blanc sur blanc, calque masqué, recouvert, trop petit), de segments
  (horizontaux, verticaux, obliques), de rectangles, de courbes, de cercles,
  d'images ;
- ce que les textes ont en commun (tailles, angles, polices, couleurs) et
  ce que les traits ont en commun (épaisseurs, couleurs, rectangles et cercles
  qui reviennent souvent : les connecteurs, les broches) ;
- le **dictionnaire des motifs** : chaque forme de texte et son nombre
  (`999AA9` : 312 fois, `A99` : 290 fois…). C'est lui qui dira comment
  reconnaître un repère, une broche, un numéro de fil ;
- les textes **cachés** qui ne se dessinent pas (dans les annotations ou dans
  le « contenu marqué » du PDF) : si tes normes et références sont dans le PDF
  sans se voir, c'est là qu'elles apparaîtront (en motifs) ;
- ce que la sonde n'a pas su lire.

## Pour les agents : le format

### Le programme

`sonde_pdf.py` : un seul fichier, **bibliothèque standard de Python seule**
(3.8 à 3.13 ; vérifié par vermin, exécuté sous 3.8.20 et 3.13). Lecteur au
choix : PyMuPDF (`import pymupdf`, puis `import fitz`) s'il est importable,
sinon le lecteur écrit ici. `--lecteur=standard|pymupdf|auto`. Quand PyMuPDF
lit, le lecteur standard relit aussi chaque page : le rapport dit alors si les
deux sont d'accord (section « LES DEUX LECTEURS ») et le contenu marqué vient
du lecteur standard.

Options : `--clair`, `--sortie=DOSSIER`, `--pages=1-3,7`,
`--mot-de-passe=XXX`, `--lecteur=…`, `--aide`. Code de sortie 0 si au moins
un rapport est écrit, 1 sinon. L'écran ne reçoit que de l'ASCII (console
Windows cp850/cp1252). Le dossier `rapports` est à côté du script ; s'il n'est
pas modifiable : `Documents\sonde-pdf-rapports`, à défaut le dossier
temporaire (l'écran le dit). Chemins de plus de 240 caractères : préfixe
`\\?\` sous Windows.

Le lecteur standard gère : table xref classique, flux xref (PDF 1.5) et
hybrides, flux d'objets, mises à jour incrémentales (`/Prev`), reconstruction
en parcourant le fichier (xref fausse, décalée, absente, fichier tronqué) ;
filtres FlateDecode (prédicteurs PNG et TIFF), LZW (`EarlyChange`),
ASCIIHex, ASCII85, RunLength, Crypt ; les filtres d'image (DCT, JPX, CCITT,
JBIG2) ne sont pas décodés (inutile : on ne relève que la place de l'image) ;
chiffrement standard RC4 40 et 128 bits, AES-128, AES-256 (R5 et R6, AES écrit
en Python pur), mot de passe utilisateur vide ou donné ; pages héritées
(`Resources`, `MediaBox`, `CropBox`, `Rotate`, `UserUnit`) ; formulaires
imbriqués (avec `Matrix`, `/OC`, garde contre les boucles) ; matrices `cm`,
`Tm`, `Td`, `TD`, `T*`, `TL`, `Tz`, `Ts`, `Tc`, `Tw`, `TJ`/`Tj`/`'`/`"` ;
états graphiques `q`/`Q`, `gs` (`LW`, `CA`, `ca`, `Font`, `D`) ; chemins `m l
c v y h re` et leur peinture `S s f F f* B B* b b* n` ; images (`Do`,
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
| `n` | rang de l'élément dans la page (ordre de peinture) |
| `type` | `texte`, `segment`, `rectangle`, `courbe`, `cercle`, `image`, `annotation` |
| `x1`, `y1`, `x2`, `y2` | mm, au centième. **segment** et **courbe** : les deux extrémités, dans le sens du tracé. **texte** : la ligne de base, du début du premier caractère à la fin du dernier. **rectangle**, **cercle**, **image**, **annotation** : la boîte (coin haut gauche, coin bas droit) |
| `angle` | degrés, sens trigonométrique tel qu'on le voit (0 = vers la droite, 90 = vers le haut), dans [0 ; 360) ; vide pour un rectangle, un cercle, une annotation. Texte : le sens de lecture (90 = se lit de bas en haut) |
| `epaisseur` | épaisseur du trait (mm, au millième) ; vide si l'élément n'est pas tracé |
| `taille` | texte seulement : le corps en points sur la page (corps × échelle × compression `Tz`, comme PyMuPDF) ; la hauteur d'une capitale est d'environ 0,7 corps |
| `couleur` | `#rrggbb` du trait (ou du texte) ; `motif` pour un motif ; vide si non tracé |
| `fond` | `#rrggbb` du remplissage ; vide si non rempli |
| `visible` | `O` ou `N` |
| `raison` | si `N` : `mode3` (texte rendu invisible, Tr 3 ou 7), `horspage`, `blanc` (blanc sans fond coloré dessous), `calque` (calque masqué par défaut), `transparent` (opacité nulle), `minuscule` (corps < 1 pt), `recouvert` (entièrement sous un rectangle plein et opaque peint après lui), et pour une annotation `cachee`, `sansapparence` ; plusieurs raisons séparées par des virgules |
| `calque` | `C1`, `C2`… (dans l'ordre des numéros d'objet des calques ; le rapport donne pour chacun la forme de son nom et son état par défaut) ; vide hors calque |
| `chemin` | numéro du chemin dans la page : les segments d'une même polyligne ou d'un même chemin le partagent |
| `motif` | texte ou annotation : le texte réduit à sa forme (`A`, `a`, `9`, signes gardés, espaces gardés ; `¤` = glyphe sans caractère connu) |
| `police` | texte : le nom de la police, sans le préfixe de sous-ensemble (`ABCDEF+`) |
| `details` | courbe : les deux points de contrôle (`x y x y`, mm) ; image : `LxH px, filtre, espace, bits`, `dans un motif` ; texte : nombre de caractères, `(texte en contour)` ; annotation : sa sorte et la source de son texte (`Contents`, `V`, `TU`, `T`, `URI`) ; `tirets` pour un trait pointillé |
| `texte` | **seulement avec `--clair`** : le texte réel |

Règles de construction (les mêmes pour les deux lecteurs) :

- un chemin est coupé en **chaînes** contiguës ; une chaîne de quatre segments
  fermée, horizontaux et verticaux en alternance (un `re`, ou `m l l l h`) est
  un **rectangle** ; une chaîne fermée de courbes de Bézier qui tient sur un
  cercle (à 3 % près) est un **cercle** ; tout le reste est décomposé en
  **segments** (droites) et **courbes** (Bézier cubiques) ; un trait plus
  court que 0,01 pt est compté comme « point » dans le rapport, pas écrit ;
- un remplissage suivi du trait du même chemin donne **un** élément (`couleur`
  et `fond`) ;
- les glyphes se regroupent en **textes** : même police, même corps, même
  sens, même couleur, même calque, sur la même ligne de base (à 0,05 corps),
  à moins d'un demi-corps l'un de l'autre ; un écart de plus de 0,12 corps
  au-delà de l'écart ordinaire du texte (pour un texte espacé lettre à
  lettre) devient une espace ; les espaces de bout sont retirées ;
- la **boîte** d'un texte (pour hors page, blanc, recouvert) est
  conventionnelle : de la ligne de base, 0,8 corps au-dessus, 0,2 au-dessous ;
- horizontal, vertical : à 0,5° près.

### Le rapport `NN-xxxxxxxx.rapport.txt`

UTF-8 avec BOM, CRLF. Première ligne : `SONDE PDF -- relevé ANONYMISÉ` ou
`SONDE PDF -- relevé EN CLAIR`. Sections, dans l'ordre : en-tête (version de
la sonde, Python et système, bibliothèques présentes, numéro et empreinte du
fichier, lecteur utilisé), `LE DOCUMENT`, `VERDICT`, `PAGE PAR PAGE`,
`CE QUE LES TEXTES ONT EN COMMUN`, `CE QUE LES TRAITS ONT EN COMMUN`,
`DICTIONNAIRE DES MOTIFS` (motif, occurrences, corps le plus fréquent, angles,
invisibles ; tabulations ; 3 000 motifs au plus, tous sont dans le TSV),
`ANNOTATIONS`, `CONTENU MARQUÉ (BDC / BMC)` (étiquettes, clés des propriétés,
motifs des textes cachés : `ActualText`, `Alt`, `E` et clés propres d'un
logiciel), `POLICES`, `LES DEUX LECTEURS` (si PyMuPDF a lu), `CE QUI N'EST
PAS GÉRÉ`.

### Ce qui n'est pas géré (et se dit dans le rapport)

- les zones de découpe (`W`, `W*`, `BBox` des formulaires) ne sont pas
  appliquées : un élément découpé est relevé en entier ;
- le contenu d'un **motif** (`Pattern` : hachures, quadrillage, image
  tramée) n'est pas parcouru ; une image dans un motif à pavé est relevée sur
  la boîte de la surface peinte (approché) ; les dégradés (`sh`) sont comptés,
  pas relevés ;
- les apparences des annotations ne sont pas lues (leur rectangle et leur
  texte, oui) ;
- les programmes de police (TrueType, CFF) ne sont pas lus : une police
  simple sans `/Widths` hors des 14 standard prend une largeur estimée, une
  police composite sans `ToUnicode` donne des `¤` ; une CMap prédéfinie autre
  qu'Identity et UCS2/UTF16 est lue sur deux octets ; l'écriture verticale est
  placée comme horizontale ;
- couleurs : Separation/DeviceN par une fonction autre qu'exponentielle →
  gris ; CMYK converti sans profil ;
- chiffrement : seul le gestionnaire standard ; un PDF à mot de passe
  d'ouverture inconnu donne un rapport « illisible » (`--mot-de-passe=`) ;
- `/AS` des calques (états automatiques) ignoré : l'état par défaut fait foi.

### Les tests

```
python tests/sonde-pdf.py                       des PDF fabriqués à la main par le test
python tests/sonde-pdf.py --corpus=DOSSIER      et le corpus d'essai (hors du dépôt)
```

Le corpus se fabrique hors du dépôt (`tests/sonde-pdf-corpus.py` demande
reportlab, PyMuPDF, pikepdf, Pillow ; `tests/sonde-pdf-folios.js` imprime les
six folios de l'Atelier avec Chromium) ; voir `tests/LISEZMOI.md`.
