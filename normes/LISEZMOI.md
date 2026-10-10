# Les normes

Ce dossier porte ce qu'une norme de matériel dit et que ni le retest ni la
bible ne portent : pour une **famille** de barrettes ou de prises de coupure,
le pas, ce que chaque contact admet (jauges, intensité, résistance), combien
de fils par côté, la règle de remplissage ; pour les **fils**, par type et
jauge, la section, la résistance et l'intensité admissible ; les
**déclassements** ; le **réseau** (la chute de tension admise).

Avec une norme, la carte d'une barrette ou d'une prise (clic sur le bloc)
dessine chaque **trou** et le fil qui y est placé, juge le remplissage, et
**simule** fil par fil la jauge admise, le courant admissible et la chute en
ligne — sur des hypothèses dites et modifiables.

## `raccords.csv` : ce qui englobe un connecteur

Le **tutoriel Raccords** de l'Excel du lecteur, en sept pas : le matériau,
le diamètre du toron, le connecteur, le raccord, la gaine, le manchon, le
collier band-it — complété en octobre 2026 par les recherches sur les
documents publics (R2 : Glenair, HellermannTyton, VG 95343 ; R4 : les
dessins TE/Polamco de l'EN 3660, l'index BSI de la série, iTeh, l'AC
43.13-1B ; **R3** : les aperçus iTeh des EN 3660-005, -017/-018, -025 à
-027, -062 à -065, l'EN 3660-033, le guide HellermannTyton 2024, les titres
EN 4165 ; **vérification D** : chaque ligne relue contre ces documents
et l'index EN 3660-002:2016, les fiches Glenair des bandes, la fiche
HellermannTyton HEGMAN, les tableaux de cotes du guide HellermannTyton
2024 ligne à ligne). **Chaque ligne** des tables d'habillage a désormais
sa **Source** et son **Statut** (vérifié, déduit, à confirmer) — les
Gaines et les Classes ont gagné ces deux colonnes. Le fichier porte dix
tables :

| Table | Ce qu'elle dit | Source |
|---|---|---|
| **Toron** | le diamètre d'un toron : Ø = facteur × √(Σ Ø²), le **facteur TE/Polamco selon le nombre de câbles** (1 ; 1,415 pour deux ; 1,242 ; 1,205 ; 1,208 ; 1,225 pour six ; **1,15 dès sept** — l'empilement exact de cercles égaux), la ligne « Excel » (+ 10 % quel que soit le nombre, un remplissage de 83 %), la table Glenair (× le Ø moyen) gardée pour contrôle, et la règle de remplissage Micro-D | TE/Polamco « Circular Backshells » p. 11 (vérifié), Glenair (R3) |
| **Gaines** | par famille et référence, le **rôle** — `surblindage` (tresse cuivre HFA DHS754-160 : Ø intérieur, Ø extérieur) ou `protection` (Nomex EN 6049-003, hydrofuge EN 6049-004 : la plage de toron Dmin–Dmax) —, la masse. C'est le rôle qui décide du raccord. Les plages Nomex sont **toutes vérifiées** sur la fiche HellermannTyton HEGMAN / HEGMANWO (02/2010, qui écrit EN6049-003-04-**5**) ; cinq masses -003 de l'Excel diffèrent de 0,3 à 1,5 g/m (dites au statut) ; la tresse HFA DHS754-160 (Airbus Helicopters) n'a aucune donnée publique : à confirmer | HellermannTyton HEGMAN 2010 |
| **Colliers** | **le band-it par défaut**, dit une fois (colonne **Défaut** : « oui ») : l'**EN3660-033AF**, la bande standard plate de 6,22 mm posée en double tour, Ø serré ≤ 47,8 mm — toutes les plateformes ØBB des codes A à M (7,7 à 34,7 mm) —, outil normalisé **EN 3660-038** (manuel, style Z), équivalents Glenair 600-052 (outil 600-058 réglé à 150 ± 5 lb), M81306/1-01 ; l'outil la prend tant qu'elle serre, puis la BF ; le « Band-It Jr. » n'en est pas un (un collier préformé du commerce). Puis les **bandes de reprise de blindage EN 3660-033** — AF standard 6,22 × 0,48 mm (9 g), **BF** longue (442 mm, Ø serré ≤ 63,5 mm, 11,5 g), CF et DF micro-bandes, **EF**, **FF** (R3 : variantes manquantes ajoutées, masses corrigées) — et leurs équivalentes Glenair 600-052/-090/-057/-083 (tension de pose 150 lb, 75 lb la micro), les band-it d'atelier **E0805-01** (toron < 15 mm) et **-02**, et les **tyraps NSA935401-03…-13** (largeur, longueur, toron maximal : −03 Ø 22 / 100 mm, −04 Ø 35, **−05 Ø 50 / 200 mm** — la table disait 305 mm, ce qui ne tient pas avec Ø 50 : corrigé sur l'équivalent T50R, **à confirmer**) — NSA935401 est un collier, pas un disjoncteur ; les Glenair sont relues sur leurs fiches (H-52, F-20 : 6,10 × 0,5 mm, 362,1 / 457,2 mm), les -06 et -13 chez Aviatec et Boeing ; les E0805 et les autres NSA935401 n'ont aucune donnée publique | TE P42936, EN 3660-033 (R3), Glenair H-52 / F-20, HellermannTyton, Aviatec, Boeing Distribution |
| **Filetages** | par famille de connecteur et **taille de boîtier** (EN 3645 : 09 à 25, M12x1 à M37x1 ; EN 2997 : 08 à 28, UNEF ; EN 3646 : 08 à 24), le filetage d'accessoire et le Ø du boîtier, et la **lettre** de taille de l'EN 3645 (A = 09 … J = 25 : c'est elle que son part number porte, EN3645 F 0 **C** N 26 M N → 13) ; le Dmax boîtier de l'EN 2997 (Glenair) a un pas irrégulier : à confirmer | EN 3660-063/-064/-005 (R3), Glenair |
| **Classes** | par famille, les lettres de **classe du connecteur** lues dans son part number juste après le nom de la famille (EN2997 **SE** 6 28 42 F N ; EN3645 **F** 0 C N 26 M N ; EN3646 **A** 6 08 3A A N — rapport R3), son matériau et son fini, la **lettre de classe EN 3660** du raccord qui va avec (W cadmium ↔ W, **nickel ↔ N** — la lettre de l'EN 3660-001:2019, qui ne liste plus F ; TE/Polamco imprime encore F sur ses références vendues —, inox ↔ K, zinc-nickel ↔ Z — jamais A, anodisé non conducteur), sa température, sa **Source** et son **Statut** (EN 2997 : TE/Deutsch ; EN 3646 A, WS, RS, Y : Souriau, les autres déduites ; EN 3645 : Amphenol, Z à confirmer) | EN 2997, EN 3646, EN 3645 (R3) ; EN 3660-001:2019 tableau 2 |
| **Entrées** | les codes d'entrée de câble, par **Système** : `EN 3660` — les codes lettrés **A à M** des raccords à bande EN 3660-062 à -065 : **Dmin–Dmax la plage de toron** que la norme donne pour chaque code (A 2–4 … D 7,4–9 … M 28,4–31 : « the cable entry shall be selected in accordance with the maximum diameter of the cable bundle », R3 — avant, l'alésage ØAA servait de maximum, optimiste de 0,4 à 0,9 mm), ØAA l'alésage, ØBB la **plateforme de bande**, ØCC l'**épaulement** (la cote C du manchon), DD la lèvre, et la plus petite taille de boîtier qui admet le code ; `Glenair` — les codes 03 à 32 du serre-câble série 36 (maxima recoupés sur la fiche 360-001, minimums à confirmer) | TE/Polamco P20027 (table 4), EN 3660-062/-065:2022 (R3), Glenair 360-001 |
| **Raccords** | 175 lignes, par famille, **taille de boîtier**, type (durci = style K, pour manchon = J, serre-câble et tyrap = A, **cheminée** de l'EN 4165) et orientation : la partie EN 3660 — -064 / -065 pour l'EN 2997 et (déduit du filetage commun) l'EN 3646 et l'ASNE 0059 ; **-063 / -062 pour l'EN 3645** ; **-004 / -005** serre-câble ; -020 / -021 ; **-017 / -018** tyraps de l'EN 3645 (déduit : la norme ne nomme pas la famille, filetage et interface sont ceux de l'EN 3645) ; **-025 / -026 / -027** tyraps de l'EN 2997 et l'EN 3646 ; -009, -010, -011, -013… —, les cotes A (toron admis), B, C, la masse, le **couple de pose** (N·m : les -017/-018, -025 à -027), et le **modèle de désignation** `EN3660-064N12<L><E>`, les **Classes** dans lesquelles la partie existe (vérification D, lues dans le domaine des aperçus : -004/-005 A K N T W Z, -017/-018 et -025 à -027 **A N W** seulement, -062 à -065 K N T W Z — un EN 3646 inox, classe K, sur un -025 : la fiche le dit) ; les titres des -009 à -014 et -020 à -023 vérifiés dans l'index EN 3660-002:2016 (le -020/-021 « for EN 3645 » ; les autres sans famille nommée) ; une ligne **EN4165-015** (cheminée, à confirmer) ; le **Statut** : `vérifié` (cotes lues sur un dessin ou un aperçu de la norme), `structure`, `déduit`, `à confirmer` | TE/Polamco P20027 (-064), TE c-2275010 (-004), iTeh EN 3660-005, -017/-018, -025 à -027, -062 à -065 (R3), index BSI |
| **Chambres** | la longueur de chambre des raccords droits à bande, par partie et code (le `<L>` de la désignation) : -064 A 27,5 · B 35,5 · C 40,5 · D 50,5 mm ; -063 A 27,1 · B 35,1 · C 40,1 · D 50,1 mm | EN 3660-063/-064:2022 tableaux 1 à 4 (R3) |
| **Masses des raccords** | 1 384 masses nominales (g) des raccords à bande EN 3660-062, -063, -064 et -065, par taille, chambre (les droits) et code d'entrée, pour les classes N W T Z ensemble et K (l'inox) à part ; deux coquilles de la norme laissées « à confirmer » | aperçus iTeh EN 3660-062 à -065:2022 (R3) |
| **Manchons** | 112 manchons **VG 95343 T06 / T08 / T18 / T19** par forme — droit à lèvre, coudé (à nervure, séries 1100 et 1150), **coudé à lèvre** (1133 à 1136), sortie longue (130, 170), 45°, transitions en T, 2 / 3 / 4 sorties — : Ha/Hb (côté raccord), Ja/Jb (côté toron), longueurs P, R, la lèvre Jo, la référence HellermannTyton ; T18 et T19 sont **précollés** — R3 : la T18 est la même pièce que la T06, précollée (29 T18 ajoutées), et **T18 C 003 A = HT 159-43-GW24** (159-43-G est la T06 C 003 A, sans colle). **Les 112 lignes relues** contre les tableaux de cotes du guide 2024 : 108 aux cotes identiques, la **T19 B 011 A est la 1307-1-GW24** (précollée ; la table disait 1307-1-G), la T18 H 001 A reste à trancher (le guide se contredit), les 157-41 et 158-42 ne sont que dans son index : déduites | HellermannTyton, guide 2024 (R3, vérification D) |

La **table de décision**, corrigée par R4, est dans l'outil (09 ter,
`regleRaccord`) : reprise de blindage (GND sur le corps, BLI par cosse, NO,
CONTACT) × étanchéité × **le rôle de la gaine**. Une tresse de
**surblindage** (HFA) demande un raccord blindé (durci) et un band-it,
obligatoires, + un manchon si étanche — comme une reprise sur le corps. Une
gaine de **protection** (Nomex) ne demande rien de plus : elle finit sous le
manchon ou par un collier sur le raccord. Sans tresse : étanche → droit un
raccord pour manchon + son manchon, coudé un durci + un manchon ; sinon un
tyrap (un raccord à collier, style A), ou un serre-câble pour une reprise par
cosse (les cosses sous ses deux vis, au plus 4). L'étanchéité demande un
manchon **précollé** (T18/T19), ou un T06 collé (VG 95343 T15, V9500).
« L'EN 3645 s'utilise sans raccord » reste la règle d'atelier du lecteur
(`SANS_RACCORD`, à confirmer) : les lignes -063 / -062 / -017 / -018 sont
dans la table, prêtes pour le jour où il la retire. L'**EN 4165** n'est plus
« sans raccord » : il prend une **cheminée** (R3) — une ronde EN 4165-015
par module câblé (une double ovale -016 pour deux modules voisins, un
obturateur -017 sur une cavité vide), le toron tenu par un tyrap, ou par un
manchon s'il faut l'étanchéité ; son Ø intérieur n'est pas public
(EN 4165-014 à -016, payantes) : le passage du toron est **à confirmer**, et
la cheminée n'a pas de classe EN 3660.

Ce que l'outil en fait (`habillage`), sur la fiche de chaque connecteur et
de chaque côté d'une prise de coupure, la ligne **« autour »**, et dans la
nomenclature :

- le **toron** (`toronDe`) : √(Σ Ø²) × le facteur TE du nombre de câbles —
  c'est la règle de l'outil ; l'hypothèse `toron` de la simulation
  (`HYPOTHESES.toron`, « TE » par défaut) le remet **« comme l'Excel »**
  (`Excel` : + 10 %) ; sans table Toron, + 10 % et c'est dit. Le résultat
  porte sa règle en mots (`foisonnement.regle`) ;
- la **taille du boîtier** lue dans le part number (EN3646-002-12-08 → 12 ;
  la lettre pour l'EN 3645 : EN3645F0**G**N11MN → 21, pas 11), son
  filetage ; la **classe** du connecteur (`EN2997W…` → W) ;
- le **raccord** : son type, sa ligne Raccords, et sa **désignation
  construite** — la partie, la classe du connecteur (N par défaut), la
  taille, `<L>` la **longueur de chambre** et `<E>` le **code d'entrée** :
  le plus petit code dont la **plage de toron** passe le toron, borné au
  code maximal de la taille (au-delà, « toron trop gros pour ce boîtier ») ;
  un toron sous la plage du code retenu (dans un des trous entre deux
  plages, ou sous le code A) : **bourrage** de ruban silicone. Un
  serre-câble n'a pas de code : ses cotes **M** sont les limites de son
  collier (EN 3660-005, note b), **pas une plage de toron** — au-delà il ne
  s'ouvre pas, en deçà bourrage. La **chambre** : celle choisie sur la
  fiche, sinon l'hypothèse `chambre` (**A par défaut**, comme avant) ; la
  pratique que R3 propose — A pour une tresse globale seule, **B ou plus**
  quand on reprend des blindages individuels dans la chambre ou avec des
  contacts taille 8 à botte d'étanchéité — est **déduite, à confirmer par
  l'atelier** : l'outil la donne en conseil (`chambreConseil`), il ne change
  pas la chambre ;
- la **masse** de la pièce désignée (table Masses des raccords) et le
  **couple de pose** quand la ligne le donne ;
- la **bande** : le **band-it par défaut** de la table (l'EN3660-033AF)
  tant qu'il serre la plateforme ØBB du code retenu (sinon le toron), puis
  la bande EN 3660-033 qui serre (la BF au-delà de 47,8 mm), avec l'E0805
  d'atelier en équivalent ; le **tyrap** au toron maximal le plus serré qui
  passe, puis le plus court ; la **gaine** par son rôle ; le **manchon** par
  ce qui sort du raccord — Ja > D > Jb — et par l'épaulement — Ha > C > Hb,
  C = le ØCC du code retenu —, droit d'abord (la sortie longue quand aucun
  droit ne va) ; **droit sur un raccord coudé** (-065, -062 : il fait déjà
  l'angle), **coudé** seulement pour donner l'angle à un raccord droit ou à
  une cheminée (AC 43.13-1B § 11-138 — avant, un raccord coudé recevait un
  manchon coudé, un second angle) ; le **précollé** d'abord à cotes égales ;
- un **raccord à collier** de la table se juge comme les autres : sa
  désignation (l'EN3660-013 de l'EN 2997 n'en a pas : sa famille n'est pas
  nommée) et son **passage** — un toron plus gros que l'alésage de
  l'EN 3660-025 / -026 « ne passe pas » ; et pour tout raccord, la
  **classe** que le connecteur demande doit exister pour la partie
  (colonne Classes), sinon c'est dit et la pièce reste à confirmer ;
- une ligne **« manque »** : la taille non lue, le toron trop gros, le
  bourrage, la ligne sans modèle, la clause de désignation non lue (les
  -005, -017/-018, -025 à -027 : la référence construite est un modèle), la
  cote C absente, le Ø de la cheminée, le manchon ou la gaine introuvables ;
- **la nomenclature d'habillage** (`pieces`) : une ligne par pièce à
  commander pour ce connecteur, de la face vers le toron — le raccord (ou
  la cheminée, une par module câblé, ou « Aucun raccord » pour l'EN 3645),
  la bande, le manchon, le tyrap, la gaine (au mètre), le bourrage, les
  obturateurs des cavités libres (quand le plan de contacts est donné) —,
  chacune `{ role, libelle, reference, quantite, statut, note }` : le
  statut vaut « vérifié » (la ligne est lue sur le document et la
  référence est entière), « à confirmer » (déduite, modèle, donnée non
  relue) ou « manque » (la pièce est due, l'outil ne sait pas laquelle :
  la note dit pourquoi). La fiche du connecteur l'affiche telle quelle.

Le statut de la ligne (structure, déduit, à confirmer) est une pastille sur
la fiche et une note dans la nomenclature ; « vérifié » n'en a pas. La
nomenclature dit aussi la chambre quand elle n'est pas choisie, le conseil
de chambre, la masse, le couple, et compte **une cheminée par module
câblé**. « Changer » déplie les quatre choix, gardés avec le contrat
(Ctrl+Z).

Ce qui manque encore : les clauses de désignation des -005, -009, -010,
-017/-018, -020/-021, -025 à -027 (les suffixes construits sont des
modèles), la famille des tyraps -013 et -014, tout l'**ASNE 0059** (déduit
de l'EN 3646), le Ø intérieur des **cheminées EN 4165**, la **longueur de
chambre** que l'atelier prend vraiment, l'épaisseur de tresse et de gaine
qu'un serre-câble ou un tyrap serrent en plus du toron (TE l'ajoute), un
manchon droit à lèvre pour les petits codes d'entrée (A à C), les cotes
des E0805, DHS754-160 et de la plupart des NSA935401 (normes Airbus non
publiées), les obturateurs de l'EN 2997, de l'EN 3646 et de l'EN 4165, et
les classes des parties dont l'aperçu ne les donne pas (-009 à -014,
-020 à -023). Le détail, ligne à ligne, est dans le rapport de la
vérification D.

## `cables.csv` : la base des câbles

L'onglet **Câbles** de l'Excel du lecteur, transcrit : 223 câbles de 55
familles (AD, ADB…, AM, BN, DG, DH, DR, DRB…, DW, GPB, HE, HJ, KC, KD, KL,
KW, KX, LE, MLA, MLB, MLC, MLD, VNA…VND, WC…WX, XD…XY, YH, YV). Pour chaque
**type de câble tel que le retest l'écrit** (DR24, MLB22, KD24, WC…) : sa
famille, sa jauge, ses **brins**, s'il est **blindé**, sa **nature**
(torsadé, blindé, torsadé blindé, twinax, coaxial, quadrax, fibre optique),
sa **masse** (g/m, valeur max), les **liaisons** qu'il porte (les brins,
plus le blindage), sa **résistance à 20 °C** (mΩ/m, soit des Ω/km ; valeur
max des fiches), son **diamètre extérieur** (mm) et sa **section hors-tout**
(mm², π Ø²/4 : isolant, gaine et blindage compris — c'est la section du
toron, pas celle du cuivre, qui est dans `en2853.csv`). HJ et LE y étaient
en double ; LE (« fibre optique » puis « coaxial ») est gardé en fibre
optique, à confirmer.

Vérifié en octobre 2026 contre les fiches Lynxeo : DR 26→6 identiques, DRB
à ±0,5 %, MLC, AD, VN identiques. Complété : les masses DRC/DRD, les
**résistances AD** (aluminium cuivré, 27 à 65 % de plus que le DR cuivre),
les diamètres manquants ; ADB…ADE et VNA…VND prennent la résistance de l'AD
de même jauge (hypothèse : les conducteurs VN sont des ABS 0949 AD). Douteux,
à relire dans l'Excel : DW24 (= DW22), GPB24 (= GPB22), MLA12 (Ø = MLA14),
AM et YV (mêmes R et masses).

Une seconde table, **Familles de câbles** : par famille, la norme (EN
2267-010 pour DR, EN 2714-013 pour MLx, ABS 0949 pour AD, ABS 1356 pour VN,
EN 3375 pour KD/KL/Wx, EN 4604 pour les coax), le **conducteur** (cuivre,
CCA = aluminium cuivré nickelé, aluminium), le placage, la température
admise (DR : −55 à 260 °C ; AD/VN : 180 °C), la tension, l'isolant, le
blindage, le rayon de courbure, le marquage. C'est là que l'outil lit si un
câble est en cuivre.

Ce que l'outil en fait :
- la **fiche d'un fil** dit son câble en une ligne (brins, nature, Ø,
  section, résistance, masse) ;
- la **chute en ligne** prend la résistance de ce câble-là (DR24 : 114
  mΩ/m, MLB24 : 117), à 20 °C, corrigée par l'hypothèse **température du
  conducteur** (× (234,5 + T)/254,5 pour le cuivre, AC 43.13-1B § 11-66 :
  70 °C → × 1,20, 135 °C → × 1,45) ; sinon celle de la jauge seule (EN
  2853, elle aussi à 20 °C) — jamais pour un conducteur **CCA ou aluminium**
  (AD, VN, AM, YV), dont l'intensité se déclasse encore de √(R cuivre / R
  câble) quand c'est la ligne cuivre de l'EN 2853 qui la donne ; une ligne
  Fils d'une norme importée qui distingue les types passe devant ;
- chaque **connecteur** (et chaque côté d'une prise de coupure) a son
  **faisceau** : ses câbles — un câble à plusieurs brins compte une fois,
  par son numéro —, le **diamètre équivalent** (un rond de la section
  hors-tout cumulée, plus 10 % : la marge du tutoriel Raccords) et la masse
  au mètre ;
- la **pastille de contrôle** relève les types de fil que la base ne
  connaît pas (une faute de frappe, un câble à ajouter).

Un type s'y retrouve tel quel, sinon par sa famille et sa jauge (« dr 24 »
→ DR24). Une autre base, aux en-têtes de l'Excel (Cable, WireType, Gauge,
Brins, BrinShield, Type, g/m, Liaisons, R (mΩ/m), Dext (mm), S (mm²)), se
lit telle quelle.

## `en2853.csv` : l'intensité admissible des câbles, et leur chute

L'**EN 2853:2005**, tables 1 et 2 (pages 14 et 16) : pour chaque jauge de
26 à 0 AWG, le code EN 2083 du conducteur (001 à 530), son **toronnage** et
la **section du toron** de cuivre, l'**intensité admissible en continu** et
**par durée** (2 s, 10 s, 1 min — les « duty cycle ratings ») d'un câble
cuivre seul à l'air libre, échauffé de 40 °C depuis une ambiante de 95 °C
jusqu'à 135 °C — la température du **conducteur** dans la table, pas la
tenue du câble (DR : 260 °C) — ; la **chute de tension pour 10 m** au
courant continu ; deux résistances, **à 20 °C** (EN 2267-010, la même que la
base des câbles : la chute en ligne la prend) et à 135 °C (déduite de la
chute). Le type est `*` : ces valeurs valent pour tout câble cuivre, tant
qu'une norme ne distingue pas les types (DR, MLB…). Vérifié contre la
physique (I ∝ √section) : le 12 AWG (35 A) et le 8 AWG (68 A) sortent de
11-12 % de la tendance, à relire dans le PDF.

La **simulation** d'une barrette ou d'une prise lit ces lignes (intensité,
résistance), avec deux hypothèses de plus : l'**ambiante** (note 2 de la
norme : I₂ = I₁ × √((135 − Tu)/40), 95 °C → ×1 — sur le continu seulement,
les paliers courts sont adiabatiques) et la **température du conducteur**.
Par défaut (recherche R2, règle 6) le conducteur est **à la température que
son courant lui donne** : T2 = Tu + (135 − Tu) × (I / I admise)², soit
Tu + 40 × (I / I EN 2853 déclassée)² (AC 43.13-1B § 11-66 d(4) à d(6) — un
DR20 à 5 A sous 8 fils à 60 % et 95 °C monte à 116 °C : × 1,38 sur sa
résistance) ; l'hypothèse `chuteConducteur` = « fixe » reprend la
température de l'hypothèse « conducteur » (20 °C, comme l'Excel et les
fiches ; 135 °C, la table, est le cas le plus défavorable). La **fiche d'un
disjoncteur** juge chacun de ses fils contre son profil : à chaque phase, le
courant doit rester sous ce que le fil admet pour cette durée (le palier
juste au-dessus : 2 s, 10 s, 1 min, sinon le continu), déclassé comme la
simulation ; le calibre doit rester sous ce que le fil admet en service
continu (un verdict à part) ; et ce que le disjoncteur laisse passer sur sa
courbe lente (−55 °C) doit rester sous la **courbe de dommage** du fil
(`dommage-fils.csv`, ci-dessous), sinon le fil n'est pas protégé. Un
dédoublement se partage on ne sait comment : chaque fil doit tenir tout. La
fiche d'un fil dit ce qu'il admet.

## `dommage-fils.csv` : ce qu'un fil supporte avant de s'abîmer

La table **Dommage des fils** (recherche R2, octobre 2026) : pour chaque
jauge cuivre de 26 à 0 AWG et chaque tenue de câble (260 °C : DR, MLx, DW,
GPB, DG, DH ; 200 °C : WF, WJ, WW, WV, XM, HJ, coaxiaux ; 150 °C : BN), l'**I²t
admis** de 135 °C (le fil à sa température de service quand la surcharge
arrive) jusqu'à la tenue — l'adiabatique de la CEI 60949 (K = 226 A·s½/mm²,
β = 234,5), corrigé de la résistivité réelle du toron de l'EN 2853 —, ce
qu'il en reste à 2 s et 10 s, et le facteur du continu à 95 °C (informatif).
Le moteur prend la ligne de la jauge dont la tenue est la plus haute sans
dépasser la T max de la famille du câble (table Familles de câbles) ; en t
secondes le fil supporte le plus grand de √(I²t / t) et du continu porté à
la tenue — l'EN 2853 déclassée (faisceau, altitude) × √((T tenue −
ambiante)/40) : l'AC 43.13-1B (§ 11-67 b-c) et le MIL-W-5088L (§ 6.7)
classent un fil sur ΔT = tenue − ambiante. Le disjoncteur **protège** le fil
quand ce qu'il laisse passer sur sa courbe lente reste dessous aux quatre
paliers de l'EN 2853 (2 s, 10 s, 1 min, continu ; entre deux paliers, le
plus grand des deux sous-estime ce que le fil supporte : l'adiabatique
ignore le refroidissement). Validée : dans les conditions de la table 11-3
de la FAA (57 °C, 15 fils à 20 %, 30 000 ft, disjoncteur à 23 °C), la
méthode retrouve exactement ses calibres de 22 à 16 AWG et en 8 AWG, un cran
en dessous ailleurs, jamais au-dessus (`tests/couverture.js`) ; l'ancienne
règle — les intensités de service — en acceptait à peu près la moitié.
Rien pour le CCA (AD, VN) ni l'aluminium (AM, YV : K et β non trouvés) : leur
protection se juge encore sur les intensités de service, plus sévères. Le 26
et le 24 AWG sont en alliage de cuivre : la correction de résistivité couvre
l'alliage, pas sa chaleur massique — à confirmer. Statut : déduit.

La simulation connaît trois **régimes** (la notice du calculateur de
chute triphasé) : continu (ΔU = R × I), alternatif monophasé (ΔU = I × (R
cos φ + X sin φ)) et triphasé (ΔU composée, entre deux phases : √3 × I ×
(R cos φ + X sin φ), I par phase, jamais la somme des phases, L la distance
simple — comparée à la ligne **200 V** du réseau, pas à la ligne 115 V
phase-neutre). cos φ vaut 0,8 en régime permanent, 0,35 au démarrage d'un
moteur ; la réactance X est négligée sous **10 mm² de cuivre** et à saisir
au-delà (à 400 Hz, X vaut l'ordre de R dès le 6–8 AWG pour un fil seul ; le
calcul est suspendu, comme dans l'Excel).

Le **déclassement** et le **réseau** de `norme-exemple.csv` sont les points
publics de l'**AC 43.13-1B** (FAA, chapitre 11), en attendant les règles du
programme (ABD0100, non public) : le faisceau par points « fils × charge »
(fig. 11-5 : 8 fils à 60 % → × 0,60, 12 à 100 % → × 0,43, 35 à 20 % →
× 0,52 ; l'outil prend le point le plus proche du faisceau simulé),
l'altitude interpolée (fig. 11-6 : 20 000 ft → 0,91, 60 000 → 0,79) ; la
chute admise du bus à la masse de l'équipement (table 11-6 : 14 V 0,5 V,
28 V 1 V, 115 V 4 V, 200 V 7 V ; le double en intermittent ≤ 2 min).

## `disjoncteurs.csv` : les courbes de disjonction

L'Excel du lecteur (feuille Base_de_données), transcrit point par point :
quatre **courbes de disjonction à tension nominale** d'un disjoncteur
thermique — le temps de déclenchement en secondes selon le **multiple du
courant nominal In** — à **125 °C** (46 points), **23 °C** la plus rapide
(51) et la plus lente (45), **−55 °C** (47). La recherche R5 (octobre 2026)
les a identifiées : ce sont, à 1-4 % près, les courbes typiques du
disjoncteur **E-T-A 483** (monopolaire compensé −55/+125 °C, approuvé
MS 3320 / prEN 2995) — la famille s'appelle donc **ETA483**. Cinq familles
de plus viennent des tracés vectoriels des fiches constructeur (±3 % sur le
multiple, ±5 % sur le temps) : **2TC** (Klixon 2TC / 3TC : MS3320, MS14105),
**6TC** (6TC / 9TC tripolaires : MS14154, MS14153), **5TC** (20-50 A),
**7274** (non compensé : MS22073, MS26574) et **EN2495** (Crouzet 84 406 /
84 417 : EN 2495, EN 2995, EN 2592, EN 2996). La courbe est en multiples de
In : une famille vaut pour tous ses calibres.

Quatre tables de plus : la **Calibration** (les points normalisés par
famille et par ambiante : ce qu'un disjoncteur tient une heure, ce qui le
déclenche, les temps à 200, 500 et 1000 % de In — les fiches Sensata, et
les feuilles militaires MS3320N, MS22073M, MS14153C / MS14154D, qui sont les
valeurs contractuelles ; la ligne « préchargé à 60 % » dit ce que le
préchauffage fait : le temps divisé par 1,6 à 3,7), les **Familles de
disjoncteurs** (MS3320, 2TC, AS33201, 3TC, MS14105, 6TC, 9TC, 5TC, 7274,
ETA483, EN 2495 / 2995, MS33201, EN 3773, EN 3661, EN 2794, EN 2592 / 2996,
EN 3774, EN 3662, Safran 170 : norme, pôles, gamme de calibres, tension,
compensation, ambiante admise, masse, **la courbe à prendre** et les
**motifs** de part number qui nomment la famille — c'est cette table que le
moteur lit : `MS3320` reconnaît MS3320-10 et MS3320L-5, `2TC` reconnaît
2TC2-10 ; le calibre se lit en queue s'il est de la gamme ; un part number
inconnu prend les courbes ETA483), la **Protection** par jauge de fil
(AC 43.13-1B table 11-3, relue par R2 : le calibre maximal du disjoncteur et
du fusible — rien en 1 et 0 AWG pour le disjoncteur —, la taille de contact
et son courant — les 80 A et 150 A des tailles 4 et 0, écrits de mémoire,
sont retirés : non trouvés, l'outil prend la taille connue la plus proche,
8 : 46 A, ce qui est prudent ; la fiche et le contrôle d'un disjoncteur la
confrontent à chaque fil nourri) et la **Chute disjoncteur** (la chute
propre aux bornes à In : 1,1 V à 1 A, 0,25 V à 15-25 A — COMPTÉE dans la
chute en ligne depuis R2 (règle 7), à I / In de sa chute à In, parce que
l'AC 43.13-1B mesure la chute « entre le bus et la masse de l'équipement » ;
l'hypothèse `chuteDisjoncteur` l'ôte si la règle du programme part du bus
aval, à confirmer avec l'ABD0100 ; un calibre écrit « 2,5 » est un calibre,
pas la liste 2 et 5). Les MS3320 /
AS33201 prennent les courbes ETA483 parce que la feuille du lecteur les
trace ainsi — un Klixon 2TC2 prendrait 2TC (plus lent à −54 °C) : à
confirmer. NSA935401-10 reste un collier.

Ce que l'outil en fait, sur la fiche de chaque disjoncteur (code CB) : le
**calibre** (lu en queue du part number d'une famille connue, ou écrit), le
**profil de charge** de ce qu'il protège — démarrage, transition (un courant
pendant une durée), permanent — et le graphique log-log de l'Excel : les
quatre courbes, la zone verte où tout tient, le profil en escalier. Le
profil se lit en **points cumulés** : chaque phase dure, pour la courbe,
autant que toutes les phases au moins aussi fortes qu'elle ; le permanent
dure toujours et doit rester sous le premier multiple de la courbe, là où le
disjoncteur ne déclenche jamais — et sous ce que la famille **garantit** de
tenir à la température max du tableau (table Calibration, « Tient »,
interpolée en température : la feuille MS3320N ne garantit que 0,80 In à
121 °C, le Klixon 2TC 0,85 In ; la courbe typique dirait 0,92 In). Le
verdict se prend sur la **courbe la plus rapide** (125 °C) ; les autres
disent la marge. Entre deux températures du tableau, la courbe qui juge est
**interpolée** (le multiple admis à chaque durée, linéaire en température).
Un état qui survient en service (après le permanent) trouve le bilame chaud :
son temps de déclenchement se divise par le facteur de **préchauffage**
(MS3320N table VII : ÷ 1,6 à 3,7 préchargé à 60 % ; l'outil prend 1,6, en
plein dès 60 % de In, en proportion du carré au-dessous). Entre deux points,
l'outil interpole en log-log, et il tient la courbe en **enveloppe** (le
temps ne remonte jamais avec le courant : les points lus sur une figure
tremblent).

La **gamme** est le catalogue de la famille du part number (colonne Calibres
de la table Familles de disjoncteurs : MS3320 de ½ à 25 A ; une plage « 1 à
25 » prend la série d'aéronef qu'elle couvre), filtré par les calibres que
le lecteur pose (hypothèse `calibresPreferes` : 1, 3, 5, 7,5, 10, 15, 20,
25 A par défaut — « 0,5, 0,75 n'existent pas » ; au-delà de 25 A, la famille
garde les siens : un 3TC propose encore 30 et 35 A) ; sans famille, ces
mêmes huit calibres. Un part number hors de la liste reste jugé et montré.
Le **meilleur calibre** (R2 § 3.1 ; NASA TM-102179 étapes 3 à 7) est le plus
petit de la gamme qui tient le permanent et les pointes avec la marge
(hypothèses `marge` : 10 % de courant, à 0 % si le profil sort du bilan
électrique au pire cas ; `margeTemps` : au plus 75 % du temps de
déclenchement), à la température max du tableau, et qui reste sélectif 2:1
avec ses voisins — du même côté d'eux que le plus petit calibre qui tient
(sous un 5 A, une charge de 1,5 A ne passe pas au 10 A pour être à 2:1) ;
puis, pour chaque fil qui ne le suit pas (la charge, le service, la table
11-3, le contact, la courbe de dommage), la plus petite jauge de sa famille
dans la base des câbles qui le suit — on ne monte **jamais** le calibre pour
sauver un fil — et les contacts que cette jauge change de taille. Exemple,
102CB1 (5 A permanents, 9,31 A pendant 125 s) : avec 10 % de marge au
tableau à 125 °C, 15 A et ses trois fils en DR12 ; sans marge, 10 A et
W-012, W-015 en DR16. Le profil se garde avec le contrat ; la pastille de
contrôle relève chaque disjoncteur qui déclenche, sans calibre ou sans
profil.

À confirmer : la référence réelle des disjoncteurs du lecteur (E-T-A 483,
Klixon 2TC2 ou Crouzet 84 406 : les courbes à −55 °C diffèrent, de 23 à
66 s à 2 In), l'ambiante du tableau et des zones des fils (hypothèses
« tableau min / max », « ambiante »), la marge qu'on s'impose (10 % par
défaut), le préchauffage (quels états), et où commence le « bus » de sa règle
de chute (la chute propre du disjoncteur, comptée par défaut).

## `contacts.csv` : le contact à sertir sur chaque fil

Les quatre tables **SEE Electrical Equipment Definition** (EN2997 v6,
EN3645 v2, EN3646 v13, EN4165 v49), transcrites ligne à ligne, **relues par
la recherche R1** (octobre 2026), plus ce que R1 ajoute : 460 lignes. Pour
une norme de connecteurs (ou de barrettes), une **taille** de cavité (23,
22, 20, 16, 12, 10, 8), un **sexe** (M broche, F douille), un **type de
fil** (`*` : tous, ou un code comme HS, CF, WL, XM…) et une **jauge** (`*` :
toutes), le **contact** à sertir (EN3155-003F2020, M39029/87-476,
NSA938172SL1600…) et son **accessoire** (un manchon thermorétractable
d'étanchéité E0718-20-30 sur l'isolant quand le fil est plus fin que la
plage du **joint arrière** — pas un réducteur de fût (R3, R1) —, une bague
d'étanchéité EN4530-004, un 21-33321-5), la **Source** et le **Statut** de
la ligne.

Ce que R1 a changé :

- les **contacts des barrettes** : les broches **EN 3155-016** des modules
  NSA937901 et E0599 (M2222, M2018, M2020, M1616, M1212 : Air LB 01/19
  p. 80), branchées dans le moteur — chaque fil d'une barrette a son contact
  à sertir, qui sort dans la nomenclature ;
- la **taille 23** de l'EN 4165 (EN3155-008M2322 / -003F2322, 26–22 AWG :
  TE DMC-M) et la **taille 10** de l'EN 3645 ; la table Tailles corrigée
  (EN 4165 23 : 26–22, E0599 20 : 24–18) ;
- **311 lignes** désignent un contact EN 3155 ou M39029 qui existe, et les
  187 lignes EN 3155 à jauge précise tombent dans la plage du fût ; **59 références** qu'aucune source publique
  ne vérifie (normes Airbus NSA, E0…, ABS, Airbus Helicopters ECS,
  fournisseurs KB/LB/KC/LC) et les lignes des **11 points à relire** de R1
  restent telles que SEE les donne, avec « à confirmer » et la raison dans la
  colonne Statut (« R1, point n ») : rien n'est corrigé sans le lecteur ;
- la **clé** d'une ligne Contacts est désormais ses cinq critères (norme,
  sexe, taille, type de fil, jauge), **sans la référence** : une ligne
  corrigée importée **remplace** l'ancienne, plus de doublon à masquer.

La ligne la plus précise gagne : le type de fil exact avant `*`, la jauge
exacte avant `*`. Le type d'un fil est en tête de son code (DR24 → DR, HS22
→ HS) ; un type que la table ne nomme pas prend les lignes `*`. Quand la
table connaît la taille, **c'est elle qui juge la jauge** : un fil sans ligne
est refusé, et la fiche dit « aucun contact femelle de taille 16 pour ce
fil ». Les tables **Tailles** des normes ne servent plus qu'aux tailles
qu'elle ignore (EN 3645 8T, NSA937901 22 aluminium).

Le **sexe** des contacts qu'on sertit est une hypothèse de l'outil, à
confirmer : **femelles** (douilles) face à une embase d'équipement à broches,
**femelles côté fiche** (ce qui arrive) et **mâles côté embase** d'une prise
de coupure ; une barrette prend ses broches. Chaque fiche permet de
l'inverser (« Changer »), et le choix se garde avec le contrat. Entre deux
arrangements qui logent tout, l'outil préfère celui qui **accommode le
moins** : pas de manchon, pas de ligne `* *` (le contact par défaut d'une
taille) — un 24 AWG va sur un contact 20, pas sur un 12 avec manchon.

Le fichier porte aussi, depuis R1 :

| Table | Ce qu'elle dit | Source |
|---|---|---|
| **Résistance des contacts** | par taille (et par emploi), le courant nominal, la chute max aux bornes et la **résistance max à neuf** d'une paire sertie et accouplée : 22 → 14,6 mΩ, 20 → 7,3, 16 → 3,8, 12 → 1,8, 10 → 1,0, **8 → 0,57** (26 mV / 46 A : l'ancienne valeur 0,7 était extrapolée), et **23 (14,6), 4 (0,29), 0 (0,14)** ajoutées ; les lignes « jonction » des modules de barrettes (Air LB) | AS39029, Amphenol 38999 p. 18 (R1), Amphenol Air LB |
| **Courant des contacts** | ce qu'un contact porte avec la **jauge** du fil serti, et par **fût** quand il compte : un 26 AWG sur un contact 20 porte **2 A** ; un contact 16 à fût 18 avec du 22 ou du 24 AWG, 5 et 3 A ; un contact 12 à fût 18 (EN 2997) avec du 18 AWG **7,5 A**, à fût 14 (EN 3645) **10 A** — le « 5 A hermétique » est remis sur la taille 20 | Amphenol p. 7 et 9, Milnec (R1) |
| **Joints arrière** | par famille, taille (et fût), la plage de Ø d'isolant que le joint arrière serre : un fil plus fin demande son manchon E0718 (la table Contacts le porte déjà), un fil plus gros n'entre pas | Souriau 8D p. 65, Milnec, TE 983 (R1 ; la plage EN 2997 « à confirmer ») |
| **Outillages** | par contact EN 3155 (et les familles qui le prennent) : la pince M22520, le positionneur, l'outil d'insertion et d'extraction M81969, la longueur de dénudage, les bagues de couleur | Amphenol p. 10, Souriau 8D p. 69-71, TE DMC-M, Air LB (R1) |
| **Obturateurs** | par famille et taille, l'obturateur d'une cavité non câblée (MS27488-22-2…, Air LB 001109…) et sa couleur | Souriau 8D p. 68, Amphenol, Air LB (R1) |
| **Parties de l'EN 3155** | les 43 parties de la série : titre, type, sexe, taille, terminaison, classe, emploi, et si l'outil a leurs lignes | catalogue en-standard.eu, DIN (R1) |

Ce que l'outil en fait : le contact à sertir de chaque fil (`contactDuFil`,
`sertirDe` : référence, accessoire, statut, **fût** lu dans la référence
EN 3155 — EN3155-018M1218 → fût 18 —, outillage), le **joint arrière**
contre le Ø d'isolant du fil (`filContreJoint` : dans, sous — le manchon de
la ligne le rattrape —, dessus ; une attention sur la fiche quand le fil
est trop gros, ou trop fin sans manchon), le **courant du contact posé**
(`intensiteDuContactPose` : la taille, la jauge, le fût), l'**outillage**
(`outillageDuContact`), l'**obturateur** d'une cavité vide
(`obturateurDe`), la **partie** de l'EN 3155 (`partieDuContact`). La
**chute en ligne** compte la résistance d'une paire pour chaque prise de
coupure traversée quand sa famille ne la donne pas, et **deux fois pour
une barrette** ; la taille vient de la jauge du fil (la plus petite qui
l'admet dans la famille, sinon la table Protection).

Restent à relire (la liste, une phrase par point : `phase5/H/a-relire.md`
de la recherche) : les 11 points de R1 (YYBKW en cavité 22, WW 20 sans
manchon côté broche, la paire coaxiale KC, la douille 8 -066 ou -083, les
quadrax ECS, les paires orphelines, les colonnes E0848 peut-être inversées,
la classe S des EN 2997 en zone feu, le contact aluminium de l'EN 4165) et
les 59 références non publiques. Manquent : la taille 22 haute densité de
l'EN 2997 (EN 3155-078/-079 : la référence complète n'est pas publique), les
contacts de l'ASNE0059 (probablement ceux de l'EN 3646, non proposés sans la
capture SEE).

## `asne0059.csv` : les connecteurs circulaires Airbus

L'**ASNE0059 indice R** (pages 2 à 6) : 31 arrangements, les mêmes que
l'EN 3646 (mêmes codes, mêmes lettres, mêmes tailles), écrits à la façon
de la norme (8-3A, 12-8, 14-4…). Les faces sont reprises de l'EN 3646 ;
celle de l'isolant pour douilles est la symétrique de celle des broches.
Les arrangements marqués * renvoient à la page 7, non fournie.

## `en3645.csv` : les connecteurs circulaires EN 3645

L'**EN 3645-002:2024**, figures 1 à 68 (la figure 51 manque) : 99 arrangements, désignés taille de
boîtier + N (normal), G (mise à la masse, même face), Q ou L (quadrax) +
arrangement, de 09G01 à 25N61 ; R pour un insert de contacts d'alimentation (21R48), taille 10 comprise. Contacts numérotés, lettrés ou les deux
(13N26 : 1, 2 et A à F) ; une borne numérotée va sur son numéro, sinon sur
la lettre de même rang. Les contacts triaxiaux et quadrax (taille `8T`) ne
reçoivent pas un fil ordinaire, et leurs arrangements ne sont jamais
choisis seuls. La classe de tension (I, II, M, N) est dans la note.

## `en3646.csv` : les connecteurs circulaires à contacts lettrés

Le **prEN 3646-002:2005**, transcrit des figures 1 à 31 : 31 arrangements
d'insert, de 08-3A (3 contacts taille 20, aussi 08-98) à 24-61, mixtes
compris (14-12, 14-15, 16-21, 16-23, 20-34, 20-39, 22-41). Les contacts sont
des **lettres** (A, B… sans I ni O ; puis a, b… ; puis AA, BB…), rangées
dans l'ordre de la norme : une borne numérotée du contrat (1, 2, 3…) prend
la lettre de même rang, et la carte le dit ; une borne lettrée va sur sa
lettre. Le part number nomme souvent l'arrangement (`EN3646A6083AAN` → 08-3A).
La place des lettres est relevée en cercles dans le sens horaire des
figures, approchée pour les grands inserts. La famille EN3646 de
`norme-exemple.csv` (exemple, pour la simulation) reste distincte.

## `en2997.csv` : les connecteurs circulaires

L'**EN 2997-002:2023**, transcrite des figures 1 à 35 : 35 arrangements
d'insert, de 08-03 (3 contacts taille 20) à 28-42 (42 contacts taille 16),
mixtes compris (14-12, 20-25, 20-28, 20-39, 22-39, 24-43, 24-57). 22-30 et
22-32 ne sont « pas disponibles pour une nouvelle conception » : jamais
choisis seuls. Corps `circulaire`, emploi `connecteur`. La face est relevée
en cercles successifs numérotés dans le sens des figures ; la place exacte
de chaque numéro est approchée pour les grands inserts (22-39, 24-30 et
28-42 suivent les numéros lus). `centre@x:y` donne le centre du cercle.

Un connecteur dont le part number commence par `EN2997` prend ces
arrangements ; une prise de coupure dont le part number ne nomme aucune
norme les met en concurrence avec ceux de l'EN 4165 — ou l'une des deux
d'un clic sur sa carte.

## `en4165.csv` : les modules des connecteurs et des prises de coupure

L'**EN 4165-002:2023** (connecteurs rectangulaires modulaires), transcrite des
figures 1 à 12 : 30 arrangements de contacts — 20-22 et 20A22 (20 contacts
taille 22), 30R23, 12-20, 08-16 / 08W16 / 08G16, 04-12 / 04G12 / 04W12,
01-08 / 01G08 / 01W08, les modules neutres N et NL, les contacts spéciaux à
clé (01Q18… 01V28), les mixtes 99-01, 99A01, 99-10, et les modules
shuntés Y (à broches) et Z (à douilles) 20Y22, 2AY22, 2BY22, 20Z22, 2AZ22,
2BZ22. Leur colonne **Emploi** vaut `connecteur` : ils ne sont jamais
proposés pour une barrette.

Deux usages :

- **Les connecteurs d'un équipement.** Un connecteur EN 4165 (part number
  `EN4165…`) reçoit un module par cavité : le connecteur A, B… de
  l'équipement. La borne A7 est le contact 7 du module de la cavité A. Le
  module retenu est celui que le part number nomme (`EN4165-002-08W16`),
  sinon le plus petit arrangement de base qui a tous les numéros et dont
  chaque contact admet la jauge de son fil ; un autre se retient d'un clic.
- **Les prises de coupure.** Une prise se fait d'un module EN 4165 (fiche
  et embase) : chaque contact reçoit un fil de chaque côté.

Les plages de jauge par taille de contact sont celles, usuelles, des
contacts EN 3155 (l'EN 3155-002 n'a pas été fournie) : à confirmer. La
désignation `EN4165-002-<arrangement>` est provisoire.

## `nsa937901.csv` : la seconde norme de barrettes

Les modules de jonction à contacts **NSA937901** (mars 2021), transcrits des
figures 13 à 15 : 43 codes d'arrangement — taille 22D (EN 3155, câble
cuivre 26–22) et taille 22 (ABS1493/ABS1380, 24–22, aluminium) en 21
contacts, codes 01 à 07 ; taille 20 (24–18) en 10 contacts, codes 01 à 12 ;
taille 16 (20–16) en 8 contacts, codes 01 à 06 ; taille 12 (14–12) en 6
contacts, codes 03 à 06 et 12 ; les mixtes M12-02, 07, 08, 09, 10, 11 ; et
deux **modules de masse** NSA937916-20 / -16 (10 contacts #20, 8 contacts
#16 reliés à la masse par l'étrier ; usage « masse » : jamais choisis
d'office). Les codes marqués (*) par la norme sont d'**usage normal** : le
remplissage les préfère. Les codes A350 (AD12) et M12-07 (liaisons internes
illisibles sur la figure) ne sont jamais choisis seuls. La désignation
réelle est **`NSA937901M<taille>-<code>`** (`NSA937901M20-04` — vérifiée au
catalogue Amphenol Air LB et chez Boeing, recherche R3) ; l'outil relit
encore l'ancienne forme `NSA937901-20-04`. La table **Accessoires** donne
les références annexes (butées SC/SD, séparateurs, bloc à tige, shunt SH05,
étiquettes, étriers NSA937915) et leur équivalent Air LB — informatives.

Une barrette prend la norme de son part number (le fichier dit
`E0599-…` ou `NSA937901-…`), sinon la mieux taillée des deux ; la carte
d'une barrette change de norme d'un clic.

Les deux tables propres aux modules ont, en plus, une colonne **Famille**
(une taille de contact n'admet pas les mêmes jauges dans les deux normes),
et la table Modules les colonnes **Désignation**, **Usage** et **Corps**
(rectangle, ovale, étanche). Une face irrégulière s'écrit contact par
contact : `K@0.7:0.75` (colonne 0,7, rangée 0,75, en pas).

## `asne0599.csv` : les modules ASNE 0599

Les barrettes se proposent en **modules de jonction ASNE 0599** ou NSA937901
(NF L 53-105), transcrits des pages de la norme : les 29 variantes
d'interconnexion (A101–A106 à 36 contacts #22, B201–B209 à 18 contacts #20,
C301–C306 à 10 contacts #16, D401–D403 à 8 contacts #12, les mixtes
D501–D504, le module à diodes E601), avec pour chacune la face (la place de
chaque contact lettré), les **groupes** de contacts reliés dans le module, la
masse et la hauteur. Désignation : `E0599-1<variante>Z` (Z, la tenue aux
fluides de l'exemple de la norme, à confirmer).

Deux tables de plus que les autres normes :

| Table | Colonnes | Ce qu'elle dit |
|---|---|---|
| **Tailles** | Taille, Jauge min, Jauge max, Note | les jauges AWG qu'un contact de cette taille reçoit (plages usuelles, **à confirmer** avec la norme) |
| **Modules** | Variante, Type, Taille, Disposition, Groupes, Masse, Hauteur, Diodes, Note | une variante par ligne ; Disposition : les rangées séparées par `/`, `.` une place vide ; Groupes : séparés par `|`, contacts par `,` ; `C#12` un contact d'une autre taille |

Le **remplissage** est automatique : chaque potentiel de la barrette (une
borne, ou les bornes que des shunts relient) prend un groupe, chaque fil un
contact du groupe dont la taille admet sa jauge ; le module retenu est celui
qui loge le plus de potentiels en perdant le moins de contacts ; s'il n'y
suffit pas, un deuxième module. Ce qui ne passe pas est dit, jamais forcé.
Le module à diodes n'est jamais choisi seul.

## `norme-exemple.csv` : la prise d'exemple, le déclassement et le réseau

Il porte la prise de coupure EN3646 **d'exemple** (ses 7,5 A et 8 mΩ par
contact sont du bon ordre pour une taille 20, mais inventés : la famille est
nommée « (exemple) » et l'outil le répète partout où il s'en sert), et deux
tables qui ne sont plus inventées : le **déclassement** et le **réseau**,
pris dans l'AC 43.13-1B (FAA, chapitre 11) — voir `en2853.csv` ci-dessus.
Les règles du programme (ABD0100, les courbes Airbus) les remplaceront quand
le lecteur les donnera : mêmes colonnes.

## Comment l'outil lit une norme

Un CSV (`;`, `,` ou tabulation ; virgule ou point décimal ; un champ entre
guillemets garde ses séparateurs), un texte collé, ou un Excel (chaque
feuille est lue, sous son nom ; une feuille porte une table ou plusieurs à
la suite). Le texte est découpé en **blocs** (`decouperTables`, 09) : chaque
table se reconnaît à **sa ligne d'en-tête**, par le nom de ses colonnes,
dans n'importe quel ordre, sous leurs alias (« Jauge », « AWG », « Gauge »,
« Jauge (AWG) » : l'unité entre parenthèses est ignorée) ; un titre libre
(une ligne sans séparateur) peut la précéder, c'est lui qui la nomme dans la
prévisualisation ; une ligne vide ou un titre la termine. Les nombres sont
lus comme un atelier les écrit : « 7,5 », « 7.5 », « 5 mm », « −55 °C »,
« 10 000 ft ». Trente-deux tables (`TABLES_NORME`), reconnues par ce que leur
en-tête doit nommer (`OBLIGATOIRES_NORME[table].entete`) ; quand deux tables
reconnaissent autant de colonnes d'un même en-tête, l'outil **hésite** et
la page d'import demande laquelle (`reconnaitreEntete`, `hesite`). Chaque
ligne lue garde ses cellules telles quelles (`brut`) : c'est ce que la page
montre, modifie et exporte ; le moteur, lui, lit l'entrée (`ENTREE_NORME`).

Une ligne **remplace** une ligne de même **clé de fusion** (`CLE_FUSION` :
une famille, un type + une jauge, une condition et son point, une tension,
une variante de module, un contact par ses cinq critères — norme, sexe,
taille, type de fil, jauge, sans la référence —, un câble par son type, un
outillage par sa référence, une masse de raccord par partie, taille,
chambre, code et classes…) ; les autres s'ajoutent (`fusionnerNormes`). `comparerTable` dit,
pour des lignes importées, lesquelles sont nouvelles, lesquelles remplacent
une ligne (avant → après) et lesquelles sont identiques à ce que l'outil a
déjà. `colonnesDeTable(table)` rend les colonnes d'une table (libellé,
alias, obligatoire, sens) ; `gabaritCsv(table)` un gabarit (titre, en-tête,
une ligne d'exemple) ; `csvDeTable(table, lignes)` l'export, qui se relit
tel quel (chaque table embarquée fait l'aller-retour, `tests/normes.js`).

Les tables ci-dessous sont celles de la simulation d'une barrette ; les
autres (Contacts, Modules, Tailles, Câbles, Familles de câbles, Courbes de
disjonction, Calibration, Familles de disjoncteurs, Protection, Dommage des fils, Raccords,
Toron, Chambres, Masses des raccords, Gaines, Colliers, Filetages, Entrées,
Manchons, Joints arrière, Outillages, Obturateurs, Parties de l'EN 3155)
sont décrites plus haut, fichier par fichier, et dans la page **Normes** de
l'outil, colonne par colonne (le même texte : `SENS_NORME`, 09).

### Familles — une ligne par famille (ASNE0500, EN3646…)

| colonne | obligatoire | sens |
|---|---|---|
| Famille | oui | le début commun des références de la bible (`ASNE0500` pour `ASNE0500-04`) ; c'est par là que la carte retrouve sa norme |
| Norme | non | le nom du document (« ASNE 0599 ») ; s'il contient « exemple », la famille est marquée telle |
| Nature | non | `jonction`, `blindage` (barrettes), `coupure` (prises) |
| Variantes | non | les nombres de modules/contacts des références de la famille (« 2 4 8 12 20 ») — informatif |
| Pas | non | le pas des modules ou des contacts, en mm |
| Jauge min / Jauge max | non | la plus fine et la plus grosse jauge AWG qu'un contact admet ; un fil hors plage est refusé |
| Intensité | non | ampères admissibles par contact |
| Résistance | non | résistance d'un contact, en mΩ (entre dans la chute de tension) |
| Fils par côté | non (1) | combien de fils un module reçoit de chaque côté (amont / aval), ou un contact de prise de chaque partie (fiche / embase) : c'est le nombre de **trous** dessinés ; au-delà, c'est une surcharge |
| Ordre | non | `croissant` : les modules se prennent dans l'ordre, un module libre avant un module utilisé est signalé (remarque) ; `libre` sinon |
| Paquets | non | `contigus` : un paquet de bornes pontées occupe des modules voisins (un peigne de pontage ne saute pas un module) ; `libres` sinon |
| Réservés | non | les modules que la norme réserve (« 1 », « 1 12 ») : utilisés, c'est un défaut |
| Masse | non | `par paquet` : chaque paquet doit se fermer sur une masse (barrettes de blindage) |
| Note | non | libre |

Une ligne dont la colonne **Référence** existe n'est pas une famille : c'est
une bible (`modeles/bible-barrettes.csv`).

### Fils — une ligne par type et par jauge

| colonne | obligatoire | sens |
|---|---|---|
| Jauge | oui | AWG |
| Type | non | le début du code du retest (`DR` pour DR24, `MLB` pour MLB24) ; vide : vaut pour tous les types de cette jauge |
| Code | non | le code EN 2083 du conducteur |
| Brins | non | le toronnage (« 19 × 0,20 ») |
| Section | non | mm² du conducteur (le toron de cuivre) |
| Résistance 20 | non | Ω/km à 20 °C — la chute en ligne se calcule avec, corrigée par la température du conducteur |
| Résistance | non | Ω/km à la température du conducteur de la table (T conducteur) ; sans Résistance 20, l'outil la ramène à 20 °C |
| Intensité, Intensité 2 s, Intensité 10 s, Intensité 1 min | non | ampères admissibles du fil seul, avant déclassement, en continu et par durée |
| Chute 10 m | non | la chute pour 10 m au courant continu (informatif) |
| T conducteur | non | la température du conducteur de la table (135 °C) : l'ambiante se compte depuis elle |
| Note | non | libre |

Quand le type du fil n'est pas dans la table mais sa jauge l'est, la ligne
de la jauge sert, et la simulation le dit (« jauge seule ») — jamais pour un
conducteur qui n'est pas du cuivre (table Familles de câbles).

### Déclassement — une ligne par condition, ou par point d'une condition

| colonne | obligatoire | sens |
|---|---|---|
| Condition | oui | un mot (`faisceau`, `altitude`) : chaque condition devient une case à cocher dans la simulation |
| Fils, Charge | non | le point d'une courbe de faisceau : le nombre de fils et la charge en % ; l'outil prend la colonne de charge la plus proche de l'hypothèse, puis le point exact du nombre de fils, sinon interpole en log(fils) entre les deux points qui l'encadrent (un fil vaut 1,0) — les 43 points de la figure 11-5 de l'AC sont dans `norme-exemple.csv` |
| Altitude | non | le point d'une courbe d'altitude (pieds) ; l'outil interpole |
| Facteur | oui | multiplie l'intensité admissible du fil ; plusieurs conditions cochées se multiplient |

### Réseau — une ligne par tension

| colonne | obligatoire | sens |
|---|---|---|
| Tension | oui | volts (14, 28, 115, 200) ; la simulation prend la ligne de la tension d'hypothèse, sinon la plus proche ; en triphasé, celle de la tension composée (115 → 200) |
| Nature | non | continu, alternatif phase-neutre, entre phases |
| Chute max | oui | la chute de tension admise en ligne, en V, en continu |
| Chute max intermittent | non | la même pour une charge intermittente (≤ 2 min) |
| Chute max en % | non | la même, en % (informatif) |

### Familles de câbles — une ligne par famille (ou groupe de familles)

| colonne | obligatoire | sens |
|---|---|---|
| Famille | oui | les familles couvertes (« DRB DRC DRD ») |
| Conducteur | oui | cuivre, CCA (aluminium cuivré), aluminium : décide si la ligne cuivre de l'EN 2853 vaut |
| Norme, Placage, T min, T max, Tension, Fréquence max, Isolant, Blindage, Rayon de courbure, Marquage, Note | non | informatif (la fiche d'un fil les dira) |

### Résistance des contacts — une ligne par taille (et par emploi)

| colonne | obligatoire | sens |
|---|---|---|
| Taille | oui | 23, 22D, 22, 20, 16, 12, 10, 8, 4, 0 |
| Résistance | oui | mΩ, la paire sertie et accouplée, à neuf |
| Emploi | non | `connecteur` (prises, connecteurs : les limites AS39029) ou `jonction` (les modules des barrettes : les valeurs Amphenol Air LB, 5 / 4 / 3 / 2 mΩ) ; vide = vaut pour les deux. L'outil prend la ligne de l'emploi, sinon la première de la taille |
| Intensité, Chute max, Résistance fin de vie, Note | non | le courant nominal, la chute max aux bornes (mV), la résistance de conception |
| Source, Statut | non | d'où vient la ligne, et vérifié / déduit / à confirmer (comme dans toutes les tables qu'octobre 2026 a touchées) |

### Courant des contacts — une ligne par couple (fût, jauge)

| colonne | obligatoire | sens |
|---|---|---|
| Taille, Jauge, Intensité | oui | le contact, la jauge du fil serti, ce qu'il porte avec ce fil (A) : un 24 AWG dans un contact 20 porte 3 A, pas 7,5 — I contact = min(nominal de la taille, ligne (fût, jauge)) |
| Fût, Intensité hermétique, Note, Source, Statut | non | le fût de sertissage (AWG), la version hermétique, la source — sans fût connu, la ligne la plus prudente de la taille et de la jauge ; le fût se lit dans la référence EN 3155 du contact posé |

### Chute disjoncteur — une ligne par famille et calibre(s)

| colonne | obligatoire | sens |
|---|---|---|
| Famille, Calibre, Chute max | oui | la famille (MS3320, 2TC, ETA483…), le calibre (« 2,5 » est un calibre) ou une liste (« 15 20 25 ») qui vaut pour chacun, la chute aux bornes à In (V) — comptée dans la chute en ligne à I / In |

### Dommage des fils — une ligne par jauge et par tenue

| colonne | obligatoire | sens |
|---|---|---|
| Fil AWG, T tenue, I2t admis | oui | la jauge, la tenue du câble (°C), l'I²t (A²s) que le fil encaisse de T avant défaut à T tenue |
| Conducteur | non | cuivre (la table ne vaut que pour lui) |
| Toron mm2, R20 ohm par km, T avant défaut, Dommage 2 s, Dommage 10 s, Facteur continu dommage, Note, Source, Statut | non | informatifs : le moteur refait le continu à l'ambiante de l'hypothèse |

### Accessoires — une ligne par référence annexe

| colonne | obligatoire | sens |
|---|---|---|
| Famille, Référence, Équivalent, Rôle | oui | la famille (NSA937901), la référence de la norme, l'équivalent catalogue, à quoi il sert |
| Masse, Note | non | g, la page |

### Toron — une ligne par méthode et nombre de câbles

| colonne | obligatoire | sens |
|---|---|---|
| Méthode | oui | `TE/Polamco` (la règle de l'outil), `Excel (tutoriel)` (l'hypothèse « comme l'Excel », + 10 %), `Glenair` (contrôle) |
| Nombre de fils, Facteur | non (le Facteur est dans l'en-tête) | le nombre de câbles (« 7 et plus » vaut au-delà, « tous » pour tout nombre) ; ce par quoi on multiplie √(Σ Ø²) |
| k équivalent, Formule, Ajout, Note, Source, Statut | non | pour comparer les méthodes, la formule en mots, ce qu'on ajoute (tresse, gaine) |

### Chambres — une ligne par partie et code de longueur

| colonne | obligatoire | sens |
|---|---|---|
| Norme, Code | oui | la partie EN 3660 (-063, -064), le code `<L>` (A à D) |
| H max | non (dans l'en-tête) | la longueur maximale de chambre (mm) |
| J, Longueur derrière la face, Note, Source, Statut | non | la partie cylindrique libre, l'encombrement derrière la face d'accouplement (déduit de la figure) |

### Masses des raccords — une ligne par pièce désignée

| colonne | obligatoire | sens |
|---|---|---|
| Norme, Taille, Code, Masse | oui | la partie EN 3660, la taille de boîtier, le code d'entrée, la masse nominale (g) |
| Longueur, Classes, Note, Source, Statut | non | le code de chambre (les droits ; vide pour un coudé), les classes couvertes (« N T W Z », « K ») |

### Joints arrière — une ligne par famille et taille (et fût)

| colonne | obligatoire | sens |
|---|---|---|
| Famille, Taille | oui | la famille de connecteurs (ou de barrettes), la taille du contact |
| Ø isolant min, Ø isolant max | non (dans l'en-tête) | la plage de Ø sur isolant (mm) que le trou du joint serre : dessous, l'eau passe (manchon E0718) ; dessus, le fil n'entre pas |
| Fût, Note, Source, Statut | non | le fût quand la plage en dépend (EN 4165 16 : fût 16 ou 14) |

### Outillages — une ligne par contact

| colonne | obligatoire | sens |
|---|---|---|
| Référence du contact | oui | le contact EN 3155, comme le catalogue l'écrit (« EN3155-008M / -003F / -009F 2018 » vaut pour les trois) |
| Pince | non (dans l'en-tête) | la pince à sertir (M22520/…) |
| Famille, Sexe, Taille, Fût, Jauges, Ø isolant min/max, Positionneur, Insertion, Extraction, Dénudage, Bagues couleur, Note, Source, Statut | non | ce qui va avec |

### Obturateurs — une ligne par famille et taille

| colonne | obligatoire | sens |
|---|---|---|
| Famille | oui | la famille (ou les familles) de connecteurs |
| Taille, Obturateur | non (l'Obturateur est dans l'en-tête) | la taille (plusieurs séparées par une espace), la référence de l'obturateur d'une cavité non câblée |
| Équivalent, Couleur, Note, Source, Statut | non | l'équivalent catalogue, la couleur |

### Parties de l'EN 3155 — une ligne par partie

| colonne | obligatoire | sens |
|---|---|---|
| Partie | oui | EN 3155-016 |
| Titre | non (dans l'en-tête) | son titre officiel |
| Type, Sexe, Taille, Terminaison, Classe, Employé pour, Dans la table Contacts, Source, Statut | non | ce que le titre dit, et si l'outil a ses lignes |

### Familles de disjoncteurs — la colonne Motifs

`Motifs` : les débuts de part number qui nomment la famille, séparés par des
espaces (« MS3320 », « 2TC », « 483 ETA483 ») ; vide = le nom de la famille.
Un motif qui finit par un chiffre admet une lettre de variante (MS3320L),
un motif qui finit par une lettre admet des chiffres (2TC27). `Calibres` :
une liste (« 1 2 2,5 3 5 ») ou une plage (« 1 à 25 »). `Courbe` : la famille
de la table Courbes à prendre.

## Ce que la simulation calcule, fil par fil

Les hypothèses (longueur du fil, courant, tension, ambiante, température du
conducteur, retour par la structure ou par un fil identique, régime, cos φ,
réactance, conditions de déclassement, charge du faisceau, altitude,
ambiante du tableau de disjoncteurs min / max) se changent dans la fiche
Hypothèses (le menu, ou le mot « hypothèse » d'une fiche) : le retest ne
porte ni longueur ni courant, l'outil ne les invente pas. Chaque ligne dit
en plus si le câble tient l'ambiante (T max de sa famille contre Tu + 40 °C)
et, quand X est à saisir, une estimation (fil seul à 20 mm de la structure).

    I fil     = intensité du fil (table Fils) × déclassement (faisceau, altitude) × √((T conducteur − ambiante)/40) × √(R cuivre / R câble) si le conducteur n'est pas du cuivre (l'aluminium : 0,80 au plus, MIL-W-5088L § 3.8.8.1.1)
    I contact = intensité du contact (table Familles, sinon Résistance des contacts par emploi, bornée par la ligne (fût, jauge) de Courant des contacts)
    T         = ambiante + 40 × (courant / I EN 2853 déclassée)², bornée par la T max du câble (AC 43.13-1B § 11-66 d(6)) — ou l'hypothèse « conducteur » (20 °C) en mode « fixe »
    ρ(T)      = Résistance 20 (Ω/km) × (234,5 + T)/254,5   (aluminium : (238,1 + T)/258,1)
    R         = (ρ(T) / 1000 × longueur (m) + Résistance du contact (mΩ) / 1000) × 2 si le retour se fait par un fil identique, sauf en triphasé (aucun courant ne revient)   (la résistance de contact : la famille, sinon la taille du contact et l'emploi — jonction sur une barrette, deux fois ; connecteur sur une prise)
    ΔU        = R × courant, en V et en % de la tension (mono : I (R cos φ + X sin φ) ; tri : √3 × …, comparée à la ligne 200 V ; X saisie à 400 Hz, × fréquence / 400 — 800 Hz en fréquence variable, MIL-STD-704F)

La **chute en ligne** depuis un disjoncteur ajoute, en tête, sa chute propre
(table Chute disjoncteur, × courant / In) ; une pointe du profil y prend la
résistance du permanent (un état court ne chauffe pas le fil plus que lui).

Le verdict, dans l'ordre : jauge hors plage · le courant dépasse le fil ·
dépasse le contact · la chute dépasse ce que le réseau admet · fil inconnu
de la norme · ok. Les ponts (shunts) ne sont pas des fils dans un trou : ils
ne sont pas simulés.

## Déposer une vraie norme

1. Garde le PDF de la norme ici (`normes/ASNE0599.pdf`, par exemple) : il
   n'est pas embarqué, c'est la référence.
2. Transcris ses tables dans un CSV à côté (`normes/ASNE0599.csv`), avec les
   en-têtes de l'outil — la page **Normes** donne un **gabarit** par table
   (« Ajouter une norme, les gabarits » : l'en-tête et une ligne d'exemple),
   et dit, cas par cas, par quelles tables entre ce que l'outil ne connaît
   pas encore : une nouvelle norme de barrette (Familles, Tailles, Modules,
   Contacts), une famille de prise ou de connecteur (Familles, Tailles,
   Modules à emploi connecteur, Contacts, Filetages, Raccords), un câble
   (Câbles, Familles de câbles), les règles du programme (Réseau,
   Déclassement, Fils par type), un disjoncteur (Courbes de disjonction,
   Familles de disjoncteurs, Calibration), un raccord, un manchon, une
   gaine, un collier, une entrée (leur table). Un fichier par norme
   convient : ils se lisent tous. Une photo de norme n'est pas encore lue :
   on la transcrit dans un gabarit.
3. Soit `node construire.js` : tous les CSV de ce dossier sont **embarqués**
   dans `index.html` (retire `norme-exemple.csv`, ou garde-le, il reste
   marqué exemple). Soit, sans reconstruire, dans l'outil : **Importer un
   fichier** ou **Coller des lignes** dans la page Normes (ou « Importer une
   norme » dans la bible, ou déposer le fichier sur la table) : chaque table
   reconnue est **prévisualisée** avant d'être adoptée — la table cible (à
   changer quand l'outil hésite, ou pour lire un bloc autrement), les
   colonnes reconnues et celles qui ne le sont pas (qu'on peut attribuer à
   une colonne de l'outil), combien de lignes sont lues, nouvelles,
   remplacent une ligne, sont identiques, sont rejetées (incomplètes), et
   les premières lignes. **Adopter** les pose dans la couche du navigateur
   (voir ci-dessous) : les fiches, le plan et le contrôle suivent aussitôt.

## Modifier une norme dans l'outil

La page **Normes** (bouton « Voir les normes » dans la bible, « Voir la
norme » sur la carte d'une barrette, `ficheNormes()`) classe les trente et
une tables par domaine — barrettes et modules de jonction · prises de coupure
et connecteurs · contacts à sertir · câbles et fils · chute, réseau et
déclassement · disjoncteurs · raccords, gaines, colliers, manchons ·
contrats déjà faits — et pour chaque table dit **à quoi elle sert**, **qui
la lit** (quelle fiche, quel contrôle), **comment une ligne se choisit**
(automatique, et le geste manuel qui passe devant : « Changer » sur la
fiche, le sexe des contacts, les hypothèses de la simulation), ce qui
**manque**, et ses **colonnes** expliquées. Une recherche en tête cherche
dans toutes les tables (une référence, un part number, une jauge).

Chaque table se déplie, se **filtre** et se **trie** (un clic sur l'en-tête)
et se modifie sur place : un **double-clic** (ou le crayon au bout de la
ligne) fait de chaque cellule un champ, **Entrée** valide, **Échap**
annule ; « Ligne » en ajoute une, le bouton dupliquer en copie une, la croix
en retire une (une ligne embarquée se **masque** : elle se montre barrée sur
demande et se **rétablit**). Une ligne incomplète est refusée en disant ce
qui manque. Une ligne modifiée ou ajoutée est **marquée**, la table aussi
(« 1 modifiée », « 2 ajoutées », « 1 masquée »), avec le fichier d'où elle
vient. **Ctrl+Z** défait (tant que la page a le focus : c'est l'historique
des normes, pas celui du contrat ; « Défaire » au pied fait pareil).

Rien de tout cela ne touche aux fichiers embarqués : ce qui est importé ou
modifié est une **couche** (`NORMES.apports`, 08 octies : par table, les
lignes brutes avec leur source, et les clés des lignes embarquées
masquées), gardée dans ce navigateur (`localStorage`, clé
`atelier.normes.v2`), et la **norme active** (`app.norme`) est l'embarquée,
moins les lignes masquées, fusionnée avec les apports (`normeAvecApports`,
09) — dans cet ordre : ce qui est importé ou modifié passe devant. Chaque
changement est repris aussitôt par les fiches, le plan, le tableau, le
contrôle et la bible (ses modules). « Revenir à l'embarquée » vide la
couche d'une table ; « Revenir à la norme embarquée » (au pied) vide tout.
L'ancien mécanisme (une norme importée qui **remplaçait** l'embarquée, clé
`atelier.norme.v1`) n'est plus lu : une norme ainsi gardée se réimporte,
et se voit alors ligne par ligne.

**Exporter CSV** enregistre n'importe quelle table telle que l'outil la lit
(lignes importées et modifiées comprises), aux en-têtes de l'outil ; elle se
relit telle quelle, et se dépose dans `normes/` pour devenir embarquée.
**Exporter mes modifications** enregistre en un seul fichier tout ce que le
navigateur a ajouté ou changé (un bloc par table, et les clés masquées) :
c'est ce fichier qu'on renvoie pour que l'embarqué en profite.

Ce qu'il faudra dans les vraies normes pour remplacer la fausse : par
famille, le pas, la plage de jauges, l'intensité et la résistance de contact,
le nombre de fils par côté, la règle de remplissage (ordre, pontage,
modules réservés, masse) ; par fil, la résistance linéique et l'intensité
admissible par jauge et par type ; les facteurs de déclassement ; la chute
admise par tension. Ce que la norme ne dit pas reste vide et la carte le dit
(« — », « fil inconnu de la norme ») : rien n'est inventé.
