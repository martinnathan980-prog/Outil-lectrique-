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

## `en2853.csv` : l'intensité admissible des câbles, et leur chute

L'**EN 2853:2005**, tables 1 et 2 (pages 14 et 16) : pour chaque jauge de
26 à 0 AWG, le code (001 à 530), l'**intensité admissible en continu** et
**par durée** (2 s, 10 s, 1 min — les « duty cycle ratings ») d'un câble
cuivre seul à l'air libre, échauffé de 40 °C depuis une ambiante de 95 °C
jusqu'à 135 °C ; et la **chute de tension pour 10 m** au courant continu.
La résistance (Ω/km à 135 °C) s'en déduit ; la section est la section
nominale de la jauge, indicative. Le type est `*` : ces valeurs valent pour
tout câble cuivre, tant qu'une norme ne distingue pas les types (DR, MLB…).
Les fils inventés de la norme d'exemple sont partis.

La **simulation** d'une barrette ou d'une prise lit ces lignes (intensité,
résistance), avec une hypothèse de plus, l'**ambiante** (note 2 de la norme :
I₂ = I₁ × √((135 − Tu)/40), 95 °C → ×1). La **fiche d'un disjoncteur** juge
chacun de ses fils contre son profil : à chaque phase, le courant doit rester
sous ce que le fil admet pour cette durée (le palier juste au-dessus : 2 s,
10 s, 1 min, sinon le continu), déclassé comme la simulation ; et le calibre
ne devrait pas dépasser ce que le fil admet en continu, sinon le fil n'est
pas protégé en surcharge. Un dédoublement se partage on ne sait comment :
chaque fil doit tenir tout. La fiche d'un fil dit ce qu'il admet en continu.

Restent d'exemple : les **déclassements** (faisceau × 0,8, zone chaude
× 0,85) et le **réseau** (la chute admise) ; vos vraies tables remplacent
celles de `norme-exemple.csv`.

## `disjoncteurs.csv` : les courbes de disjonction

L'Excel du lecteur (feuille Base_de_données), transcrit point par point :
quatre **courbes de disjonction à tension nominale** d'un disjoncteur
thermique — le temps de déclenchement en secondes selon le **multiple du
courant nominal In** — à **125 °C** (46 points), **23 °C** la plus rapide
(51) et la plus lente (45), **−55 °C** (47). La famille `disjoncteur` vaut
pour tous les calibres, la courbe étant en multiples de In ; une autre
famille s'ajoute avec son nom.

Ce que l'outil en fait, sur la fiche de chaque disjoncteur (code CB) : le
**calibre** (lu en queue du part number, NSA935401-10 → 10 A, ou écrit), le
**profil de charge** de ce qu'il protège — démarrage, transition (un courant
pendant une durée), permanent — et le graphique log-log de l'Excel : les
quatre courbes, la zone verte où tout tient, le profil en escalier. Le
profil se lit en **points cumulés** : chaque phase dure, pour la courbe,
autant que toutes les phases au moins aussi fortes qu'elle ; le permanent
dure toujours et doit rester sous le premier multiple de la courbe, là où le
disjoncteur ne déclenche jamais. Le verdict se prend sur la **courbe la plus
rapide** (125 °C) ; les autres disent la marge. Entre deux points, l'outil
interpole en log-log, et il tient la courbe en **enveloppe** (le temps ne
remonte jamais avec le courant : les points lus sur une figure tremblent).
La fiche dit « Tient » ou « Déclenche », la marge en une phrase, et le plus
petit calibre de la gamme (1, 2, 2,5, 3, 4, 5, 7,5, 10, 15, 20, 25, 30, 35,
50 A) qui tiendrait. Le profil se garde avec le contrat ; la pastille de
contrôle relève chaque disjoncteur qui déclenche, sans calibre ou sans
profil.

À confirmer : de quel disjoncteur sont ces courbes (une seule famille pour
l'instant), la gamme des calibres, et la marge qu'on s'impose (l'outil
demande seulement que le disjoncteur tienne plus longtemps que la phase).
Il manque encore, pour la protection du fil, l'intensité admissible et le
I²t des fils (§ B de la feuille de route).

## `contacts.csv` : le contact à sertir sur chaque fil

Les quatre tables **SEE Electrical Equipment Definition** (EN2997 v6,
EN3645 v2, EN3646 v13, EN4165 v49), transcrites ligne à ligne : 428 lignes.
Pour une norme de connecteurs, une **taille** de cavité (22, 20, 16, 12, 8),
un **sexe** (M broche, F douille), un **type de fil** (`*` : tous, ou un code
comme HS, CF, WL, XM…) et une **jauge** (`*` : toutes), le **contact** à
sertir (EN3155-003F2020, M39029/87-476, NSA938172SL1600…) et son
**accessoire** (un fourreau de réduction E0718-20-30 quand le fil est plus
fin que le contact, une bague EN4530-004, un 21-33321-5).

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
préfère celui qui **accommode le moins** : pas de fourreau, pas de ligne
`* *` (le contact par défaut d'une taille) — un 24 AWG va sur un contact 20,
pas sur un 12 avec fourreau.

Deux accessoires sont lus tronqués sur les captures (EN3646 KE 20, EN3645 YY
20 : « EN3155-019F… », « EN3155-008M… ») ; la note le dit, 2020 supposé.
Manquent encore : les contacts des barrettes NSA937901 et ASNE 0599, et de
l'ASNE0059 (l'onglet NSA937901 existe dans SEE).

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
contacts, codes 03 à 06 et 12 ; les mixtes M12-02, 07, 08, 09, 10, 11. Les
codes marqués (*) par la norme sont d'**usage normal** : le remplissage les
préfère. Les codes A350 (AD12) et M12-07 (liaisons internes illisibles sur
la figure) ne sont jamais choisis seuls. La règle de désignation n'était pas
sur les pages lues : l'outil écrit `NSA937901-<taille>-<code>`
(`NSA937901-20-04`) en attendant.

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

## `norme-exemple.csv` est une FAUSSE norme

Il ne porte plus que la prise de coupure EN3646, les fils, les déclassements
et le réseau. Tous ses chiffres sont inventés pour montrer le mécanisme : ils n'ont
**aucune valeur normative**. Chaque famille y est nommée « (exemple) » et
l'outil le répète partout où il s'en sert (carte, fiche de la bible).
Remplace ce fichier par les tables de tes normes ; tant qu'il est là, il
reste marqué exemple.

## Comment l'outil lit une norme

Un CSV (`;`, virgule ou point décimal) ou un Excel (une table par feuille,
ou plusieurs à la suite). Chaque table se reconnaît à **sa ligne d'en-tête**,
par le nom de ses colonnes, dans n'importe quel ordre ; un titre libre peut
la précéder ; une ligne vide la termine. Quatre tables, dont aucune n'est
obligatoire seule, mais sans Familles il n'y a ni trous ni règle, et sans
Fils il n'y a pas de simulation.

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
| Section | non | mm² |
| Résistance | non | Ω/km à 20 °C — la chute en ligne se calcule avec |
| Intensité | non | ampères admissibles du fil seul, avant déclassement |
| Note | non | libre |

Quand le type du fil n'est pas dans la table mais sa jauge l'est, la ligne
de la jauge sert, et la simulation le dit (« jauge seule »).

### Déclassement — une ligne par condition

| colonne | obligatoire | sens |
|---|---|---|
| Condition | oui | un mot (`faisceau`, `chaud`) : chaque condition devient une case à cocher dans la simulation |
| Facteur | oui | multiplie l'intensité admissible du fil (0,8) ; plusieurs conditions cochées se multiplient |

### Réseau — une ligne par tension

| colonne | obligatoire | sens |
|---|---|---|
| Tension | oui | volts (28, 115) ; la simulation prend la ligne de la tension d'hypothèse, sinon la plus proche |
| Chute max | oui | la chute de tension admise en ligne, en V |
| Chute max % | non | la même, en % (informatif) |

## Ce que la simulation calcule, fil par fil

Les hypothèses (longueur du fil, courant, tension, conditions de
déclassement) sont affichées dans la carte et se changent sur place : le
retest ne porte ni longueur ni courant, l'outil ne les invente pas.

    I fil     = intensité du fil (table Fils) × facteur de déclassement
    I contact = intensité du contact (table Familles)
    R         = Résistance du fil (Ω/km) / 1000 × longueur (m) + Résistance du contact (mΩ) / 1000
    ΔU        = R × courant, en V et en % de la tension

Le verdict, dans l'ordre : jauge hors plage · le courant dépasse le fil ·
dépasse le contact · la chute dépasse ce que le réseau admet · fil inconnu
de la norme · ok. Les ponts (shunts) ne sont pas des fils dans un trou : ils
ne sont pas simulés.

## Déposer une vraie norme

1. Garde le PDF de la norme ici (`normes/ASNE0599.pdf`, par exemple) : il
   n'est pas embarqué, c'est la référence.
2. Transcris ses tables dans un CSV à côté (`normes/ASNE0599.csv`), avec les
   en-têtes ci-dessus. Une norme de barrettes porte surtout la table
   Familles ; une norme de fils, la table Fils ; les déclassements et le
   réseau viennent souvent d'un troisième document. Un fichier par norme
   convient : ils se lisent tous.
3. Soit `node construire.js` : tous les CSV de ce dossier sont **embarqués**
   dans `index.html` (retire `norme-exemple.csv`, ou garde-le, il reste
   marqué exemple). Soit, sans reconstruire, **Importer une norme** dans la
   fiche « Bible des barrettes », ou déposer le fichier sur la table : la
   première norme importée efface l'exemple, les suivantes se fondent avec
   elle (une famille, un type+jauge, une condition, une tension de même nom
   remplace la précédente). La norme importée est gardée dans le navigateur ;
   « Revenir à la norme embarquée » l'oublie.

Ce qu'il faudra dans les vraies normes pour remplacer la fausse : par
famille, le pas, la plage de jauges, l'intensité et la résistance de contact,
le nombre de fils par côté, la règle de remplissage (ordre, pontage,
modules réservés, masse) ; par fil, la résistance linéique et l'intensité
admissible par jauge et par type ; les facteurs de déclassement ; la chute
admise par tension. Ce que la norme ne dit pas reste vide et la carte le dit
(« — », « fil inconnu de la norme ») : rien n'est inventé.
