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
le diamètre du toron (plus 10 %), le connecteur, le raccord, la gaine,
le manchon, le collier band-it — complété en octobre 2026 par deux
recherches sur les documents publics (R2 : Glenair, HellermannTyton, VG
95343 ; R4 : les dessins TE/Polamco de l'EN 3660, l'index BSI de la série,
iTeh, l'AC 43.13-1B). Le fichier porte sept tables :

| Table | Ce qu'elle dit | Source |
|---|---|---|
| **Gaines** | par famille et référence, le **rôle** — `surblindage` (tresse cuivre HFA DHS754-160 : Ø intérieur, Ø extérieur) ou `protection` (Nomex EN 6049-003, hydrofuge EN 6049-004 : la plage de toron Dmin–Dmax) —, la masse. C'est le rôle qui décide du raccord | HellermannTyton |
| **Colliers** | douze colonnes : les **bandes de reprise de blindage** EN 3660-033 (AF standard 6,22 × 0,48 mm, 360,42 mm à plat, boucle 8,89, Ø serré ≤ 47,8 mm, 10,6 g, outil M81306/1-01 ; CF et DF micro-bandes) et leurs équivalentes Glenair 600-052/-090/-057/-083 (tension de pose 150 lb, 75 lb la micro), les band-it d'atelier **E0805-01** (toron < 15 mm) et **-02**, et les **tyraps NSA935401-03…-13** (largeur, longueur, toron maximal : −03 Ø 22 / 100 mm, −04 Ø 35, −05 Ø 50 / 305 mm) — NSA935401 est un collier, pas un disjoncteur | TE P42936, Glenair, HellermannTyton, Octopart, Arrow |
| **Filetages** | par famille de connecteur et **taille de boîtier** (EN 3645 : 09 à 25, M12x1 à M37x1 ; EN 2997 : 08 à 28, UNEF ; EN 3646 : 08 à 24), le filetage d'accessoire et le Ø du boîtier | EN 3645-002, EN 2997-002, EN 3646-002 |
| **Classes** | par famille, les lettres de **classe du connecteur** lues dans son part number juste après le nom de la famille (EN2997 **SE** 6 28 42 F N ; EN3645 **F** 0 C N 26 M N ; EN3646 **A** 6 08 3A A N — rapport R3), son matériau et son fini, la **lettre de classe EN 3660** du raccord qui va avec (W cadmium ↔ W, nickel ↔ N, inox ↔ K, zinc-nickel ↔ Z — jamais A, anodisé non conducteur), sa température | EN 2997, EN 3646, EN 3645 (R3) ; EN 3660-001 (R4) |
| **Entrées** | les codes d'entrée de câble, par **Système** : `EN 3660` — les codes lettrés **A à M** des raccords à bande EN 3660-064 (et, à confirmer, -063/-065) : ØAA l'alésage (le toron maximal), ØBB la **plateforme de bande** (le band-it serre la tresse dessus), ØCC l'**épaulement** (le manchon vient dessus : la cote C), DD la lèvre, et la plus petite taille de boîtier qui admet le code (08 → D, 10 → F, 12 → H, 14 → J, 16/18 → K, 20 → L, 22 à 28 → M) ; `Glenair` — les codes 03 à 32 du serre-câble série 36 | TE/Polamco P20027 (table 4), Glenair 360A*001 |
| **Raccords** | 145 lignes, par famille, **taille de boîtier**, type (durci = style K, pour manchon = J, serre-câble et tyrap = A, cheminée) et orientation : la partie EN 3660 (-064 / -065 pour l'EN 2997 et, déduit du filetage commun, l'EN 3646 et l'ASNE 0059 ; **-063 / -062 pour l'EN 3645** ; -004 / -005 serre-câble ; -020 / -021 ; -025 / -026 tyraps EN 3646 ; -009, -010, -013…), les cotes A (toron admis : du premier au dernier code d'entrée de la taille, ou l'ouverture M min–max du serre-câble), B (plateforme ØBB du code maximal), C (épaulement ØCC du code maximal), la masse, et le **modèle de désignation** `EN3660-064N12<L><E>` ; le **Statut** : `vérifié (P20027)` cotes lues sur un dessin, `structure` désignation vérifiée sans les cotes de cette taille, `déduit` même filetage mais la norme ne nomme pas la famille, `à confirmer` | TE/Polamco P20027 (-064), TE c-2275010 (-004), iTeh EN 3660-063/-064:2022, prEN 3660-065:2026, index BSI |
| **Manchons** | 82 manchons **VG 95343 T06 / T08 / T18 / T19** par forme — droit à lèvre, coudé (à nervure, séries 1100 et 1150), **coudé à lèvre** (1133 à 1136), sortie longue (130, 170), 45°, transitions en T, 2 / 3 / 4 sorties — : Ha/Hb (côté raccord), Ja/Jb (côté toron), longueurs P, R, la lèvre Jo, la référence HellermannTyton ; T18 et T19 sont **précollés** | HellermannTyton, guide 2024 |

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
(`SANS_RACCORD`, à confirmer) : les lignes -063 / -062 sont dans la table,
prêtes pour le jour où il la retire.

Ce que l'outil en fait (`habillage`), sur la fiche de chaque connecteur et
de chaque côté d'une prise de coupure, la ligne **« autour »** : la **taille
du boîtier** lue dans le part number (EN3646-002-12-08 → 12) et son
filetage ; la **classe** du connecteur (table Classes : `EN2997W…` → W) ;
le **raccord** — son type, sa ligne Raccords, et sa **désignation
construite** : la partie, la classe du connecteur à la place du N (N par
défaut), la taille, `<L>` la longueur de chambre (**A** par défaut, 27,5 mm :
à demander au lecteur ; B 35,5, C 40,5, D 50,5) et `<E>` le **code d'entrée**
que le toron choisit dans la table Entrées EN 3660, borné au code maximal de
la taille — au-delà, « toron trop gros pour ce boîtier » ; un serre-câble
EN 3660-004 n'a pas de code, son ouverture M min–max juge le toron (dessous :
bourrage de ruban silicone) ; le code Glenair ne sert qu'à un serre-câble
dont la ligne n'a pas de plage — ; la **bande** EN 3660-033AF par le Ø
serré, la **plateforme ØBB** du code retenu (sinon le toron), avec l'E0805
d'atelier en équivalent par le toron ; le **tyrap** au toron maximal le plus
serré qui passe, puis le plus court ; la **gaine** par son rôle (un
surblindage dont l'intérieur passe le toron, une protection dont la plage
l'encadre) ; le **manchon** par ce qui sort du raccord — Ja > D > Jb — et
par l'épaulement — Ha > C > Hb, **C = le ØCC du code d'entrée retenu**
(sinon la cote C de la ligne) —, droit ou coudé (à nervure ou à lèvre)
selon l'orientation, les autres formes à la main ; précollé, ou « à coller
(VG 95343 T15) ou T18 précollé » ; et une ligne **« manque »** : la taille
non lue, le toron trop gros, la ligne sans modèle, la cote C absente, le
manchon ou la gaine introuvables. Le statut de la ligne (structure, déduit,
à confirmer) est une pastille sur la fiche et une note dans la nomenclature ;
« vérifié » n'en a pas. « Changer » déplie les quatre choix, gardés avec le
contrat (Ctrl+Z). Le toron est celui de la ligne « faisceau » : Seq, Deq,
plus 10 %, comme la feuille de calcul.

Ce qui manque encore : les cotes des **-063 et -065 par taille** (tables 2
et 4 non lues : le code d'entrée maximal et les ØBB/ØCC sont pris à la
-064), les suffixes de désignation des -005, -009, -010, -020/-021,
-025/-026, la famille des tyraps -013 à -019, tout l'**ASNE 0059** (déduit
de l'EN 3646), la **longueur de chambre** que l'atelier prend, la lettre
**N ou F** de l'alu nickelé (TE/Polamco écrit F), et un manchon droit à
lèvre pour les petits codes d'entrée (A à C : les T06 de la table ont un Hb
de 14 ou un Jb de 6, trop grands pour un épaulement de 12 à 15 mm et un
toron de 4 mm).

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
25 » prend la série d'aéronef qu'elle couvre), filtré par la liste préférée
du lecteur s'il en garde une (hypothèse `calibresPreferes`) ; sans famille,
les sept calibres de son Excel (1, 3, 5, 7,5, 10, 15, 25 A). Le **meilleur
calibre** (R2 § 3.1 ; NASA TM-102179 étapes 3 à 7) est le plus petit de la
gamme qui tient le permanent et les pointes avec la marge (hypothèses
`marge` : 10 % de courant, à 0 % si le profil sort du bilan électrique au
pire cas ; `margeTemps` : au plus 75 % du temps de déclenchement), à la
température max du tableau, et qui reste sélectif 2:1 avec ses voisins ;
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
EN3645 v2, EN3646 v13, EN4165 v49), transcrites ligne à ligne : 428 lignes.
Pour une norme de connecteurs, une **taille** de cavité (22, 20, 16, 12, 8),
un **sexe** (M broche, F douille), un **type de fil** (`*` : tous, ou un code
comme HS, CF, WL, XM…) et une **jauge** (`*` : toutes), le **contact** à
sertir (EN3155-003F2020, M39029/87-476, NSA938172SL1600…) et son
**accessoire** (un manchon thermorétractable d'étanchéité E0718-20-30 sur
l'isolant quand le fil est plus fin que la cavité — c'est pour le joint
arrière, pas un réducteur de fût (recherche R3) —, une bague d'étanchéité
EN4530-004, un 21-33321-5).

La ligne la plus précise gagne : le type de fil exact avant `*`, la jauge
exacte avant `*`. Le type d'un fil est en tête de son code (DR24 → DR, HS22
→ HS) ; un type que la table ne nomme pas prend les lignes `*`. Quand la
table connaît la taille, **c'est elle qui juge la jauge** : un fil sans ligne
est refusé, et la fiche dit « aucun contact femelle de taille 16 pour ce
fil ». Les tables **Tailles** des normes ne servent plus qu'aux tailles
qu'elle ignore (EN 3645 : 10, 8T).

Le **sexe** des contacts qu'on sertit est une hypothèse de l'outil, à
confirmer : **femelles** (douilles) face à une embase d'équipement à broches,
**femelles côté fiche** (ce qui arrive) et **mâles côté embase** d'une prise
de coupure. Chaque fiche permet de l'inverser (« Changer »), et le choix se
garde avec le contrat. Entre deux arrangements qui logent tout, l'outil
préfère celui qui **accommode le moins** : pas de manchon, pas de ligne
`* *` (le contact par défaut d'une taille) — un 24 AWG va sur un contact 20,
pas sur un 12 avec manchon.

Deux accessoires sont lus tronqués sur les captures (EN3646 KE 20, EN3645 YY
20 : « EN3155-019F… », « EN3155-008M… ») ; la note le dit, 2020 supposé.
Manquent encore : les contacts des barrettes NSA937901 et ASNE 0599, et de
l'ASNE0059 (l'onglet NSA937901 existe dans SEE).

Une table de plus, **Résistance des contacts**, par taille (22D, 22, 20, 16,
12, 10, 8) : le courant nominal, la chute max aux bornes (mV) et la
**résistance max à neuf** d'une paire sertie et accouplée (AS39029 /
MIL-DTL-39029 : 22 → 14,6 mΩ, 20 → 7,3, 16 → 3,8, 12 → 1,8, 10 → 1,0 ; la
limite EN 3155 n'a pas été lue), et une résistance de conception (× 1,5,
hypothèse de fin de vie). La **chute en ligne** la compte pour chaque prise
de coupure traversée (la paire, une fois) quand sa famille ne donne pas sa
résistance, et **deux fois pour une barrette** (deux sertissages et la
barre) ; la taille vient de la jauge du fil (la plus petite qui l'admet dans
la famille, sinon la table Protection).

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
« 10 000 ft ». Vingt-cinq tables (`TABLES_NORME`), reconnues par ce que leur
en-tête doit nommer (`OBLIGATOIRES_NORME[table].entete`) ; quand deux tables
reconnaissent autant de colonnes d'un même en-tête, l'outil **hésite** et
la page d'import demande laquelle (`reconnaitreEntete`, `hesite`). Chaque
ligne lue garde ses cellules telles quelles (`brut`) : c'est ce que la page
montre, modifie et exporte ; le moteur, lui, lit l'entrée (`ENTREE_NORME`).

Une ligne **remplace** une ligne de même **clé de fusion** (`CLE_FUSION` :
une famille, un type + une jauge, une condition et son point, une tension,
une variante de module, un contact par ses cinq critères, un câble par son
type…) ; les autres s'ajoutent (`fusionnerNormes`). `comparerTable` dit,
pour des lignes importées, lesquelles sont nouvelles, lesquelles remplacent
une ligne (avant → après) et lesquelles sont identiques à ce que l'outil a
déjà. `colonnesDeTable(table)` rend les colonnes d'une table (libellé,
alias, obligatoire, sens) ; `gabaritCsv(table)` un gabarit (titre, en-tête,
une ligne d'exemple) ; `csvDeTable(table, lignes)` l'export, qui se relit
tel quel (chaque table embarquée fait l'aller-retour, `tests/normes.js`).

Les tables ci-dessous sont celles de la simulation d'une barrette ; les
autres (Contacts, Modules, Tailles, Câbles, Familles de câbles, Courbes de
disjonction, Calibration, Familles de disjoncteurs, Protection, Dommage des fils, Raccords,
Gaines, Colliers, Filetages, Entrées, Manchons, Résistance des contacts)
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
| Taille | oui | 22D, 22, 20, 16, 12, 10, 8 |
| Résistance | oui | mΩ, la paire sertie et accouplée, à neuf |
| Emploi | non | `connecteur` (prises, connecteurs : les limites AS39029) ou `jonction` (les modules des barrettes : les valeurs Amphenol Air LB, 5 / 4 / 3 / 2 mΩ) ; vide = vaut pour les deux. L'outil prend la ligne de l'emploi, sinon la première de la taille |
| Intensité, Chute max, Résistance fin de vie, Note | non | le courant nominal, la chute max aux bornes (mV), la résistance de conception |

### Courant des contacts — une ligne par couple (fût, jauge)

| colonne | obligatoire | sens |
|---|---|---|
| Taille, Jauge, Intensité | oui | le contact, la jauge du fil serti, ce qu'il porte avec ce fil (A) : un 24 AWG dans un contact 20 porte 3 A, pas 7,5 — I contact = min(nominal de la taille, ligne (fût, jauge)) |
| Fût, Intensité hermétique, Note | non | le fût de sertissage (AWG), la version hermétique, la source |

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
norme » sur la carte d'une barrette, `ficheNormes()`) classe les vingt
tables par domaine — barrettes et modules de jonction · prises de coupure
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
