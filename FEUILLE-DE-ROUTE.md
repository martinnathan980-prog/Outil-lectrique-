# Feuille de route — ce qui vient, ce qu'il me faut, et les contrats déjà faits

L'outil sait aujourd'hui :

- dessiner les folios ;
- poser chaque fil d'une barrette dans un module (ASNE 0599, NSA937901) ;
- poser chaque fil d'un connecteur ou d'une prise dans un arrangement (EN 4165,
  EN 2997, EN 3646, EN 3645, ASNE0059) ;
- donner à chaque fil son contact à sertir et son fourreau (tables SEE), et
  juger sa jauge par elles ;
- juger un disjoncteur : son calibre, le profil de charge (démarrage,
  transition, permanent) contre les courbes de disjonction, et chacun de ses
  fils contre ce profil (EN 2853 : l'intensité admissible par durée) ;
- dire le câble de chaque fil (la base des câbles : brins, blindage,
  résistance, diamètre, masse) et le faisceau de chaque connecteur ;
- dire ce qui englobe chaque connecteur (la taille du boîtier et son
  filetage, le raccord et sa norme EN 3660, le code d'entrée, le band-it ou
  le tyrap, le manchon VG 95343, la gaine) par le tutoriel et les tables
  publiques, et la chute en continu, monophasé ou triphasé — avec la
  résistance à 20 °C corrigée par la température du conducteur, le
  déclassement de la FAA (faisceau, altitude), la résistance des contacts
  (AS39029) par prise et par barrette, le réseau de l'AC 43.13-1B ;
- lire le vrai retest (harness, longueur, appareil, date), suivre la chute
  en ligne de la source à l'équipement, comparer chaque équipement aux
  contrats déjà faits à trois échelles (équipement, voisinage, dessin),
  dessiner le FWD d'origine, et reprendre ce qu'on coche ;
- faire de chaque dédoublement une barrette à poser (VT1…), qu'on pose au
  contrat d'un geste ;
- établir la nomenclature du contrat (contacts, modules, connecteurs,
  habillage, câbles) et l'enregistrer en CSV ;
- dire l'état de tout le contrat dans l'en-tête et dans l'index des repères.

Ce qui suit se branche dessus, une couche après l'autre. Chaque couche suit
le même principe :

- **le document entre tel quel** : un PDF transcrit en CSV dans `normes/`, ou
  un tableau Excel lu par le nom de ses colonnes ;
- une **règle** le lit ;
- la **fiche** de chaque bloc et la **pastille de contrôle** disent le résultat
  en une ligne (conforme / à voir / problème), et le pourquoi en une phrase.

---

## 1. Ce qu'il me faut — la liste complète

Rangée par ce que ça débloque, du plus utile au plus lointain. Pour chaque
point : le document, et la forme la plus simple pour moi. Une photo de la
page de norme suffit toujours : je la transcris.

### A. Les contacts, norme par norme (débloque tout le reste)

1. **Les références de contact et leurs jauges.** ✔ Fait pour les
   connecteurs : les tables SEE EN2997, EN3645, EN3646 et EN4165 sont dans
   `normes/contacts.csv` (428 lignes : taille, sexe, type de fil, jauge →
   contact et accessoire). Chaque fil a son contact sur sa fiche, chaque
   connecteur sa nomenclature. Reste :
   - les mêmes tables pour **NSA937901**, **ASNE 0599** et **ASNE0059**
     (l'onglet NSA937901 existe dans SEE : une capture suffit) ;
   - confirmer le **sexe** des contacts : l'outil sertit des femelles face à
     une embase d'équipement, des femelles côté fiche et des mâles côté
     embase d'une prise de coupure (se change sur la fiche) ;
   - deux accessoires lus tronqués (EN3646 KE 20, EN3645 YY 20).
2. **La règle complète de désignation de chaque norme**, avec les valeurs
   que vous prenez par défaut : classe et matériau, finition, position de clé,
   fiche ou embase, type d'embase. L'outil écrit aujourd'hui des désignations
   provisoires (`EN3646-002-12-08`).
3. **Les pages manquantes** : la figure 51 de l'EN 3645, et la page 7 de
   l'ASNE0059.
4. **Vos préférences de norme** :
   - pour une barrette : ASNE 0599 ou NSA937901, et selon quoi (programme,
     client, appareil) ;
   - pour une prise de coupure : quelle famille, quel type d'embase, et la
     partie mobile toujours côté amont ou non.

### B. Les fils : intensité admissible et chute en ligne

5. **La table de la norme de câblage.** ✔ Fait avec l'EN 2853 (tables 1
   et 2) : par jauge, l'intensité continue et par durée (2 s, 10 s, 1 min),
   la chute pour 10 m, la résistance à 20 °C et à 135 °C, le toronnage.
   Valable pour tout câble cuivre. ✔ Et la base des câbles de l'Excel
   (`normes/cables.csv`), vérifiée contre les fiches Lynxeo et complétée
   (masses DRC/DRD, résistances AD, diamètres VN), avec une table des
   familles (norme, conducteur cuivre ou aluminium cuivré, température).
   Reste : relire dans le PDF de l'EN 2853 le 12 AWG (35 A) et le 8 AWG
   (68 A), hors tendance ; les normes des familles AM, YV, DG, DH, BN, DW,
   GPB, XD, YH, LE et des coax WC WG WH WK WP KC XE XF XK, des twinax WF WJ
   XM XS XY HE HJ ; relire DW24, GPB24, MLA12 dans l'Excel (copies
   probables).
6. **Les déclassements.** ✔ Les points publics de l'AC 43.13-1B (faisceau
   selon le nombre de fils et la charge, altitude) sont dans l'outil, en
   attendant les courbes du programme (ABD0100.1.x ?) : si vous les avez,
   les mêmes colonnes (Condition ; Fils ; Charge ; Altitude ; Facteur).
   Reste : la température par zone (cabine, soute, case train, mât) à la
   place d'une ambiante globale.
7. **La chute de tension admise.** ✔ La table 11-6 de l'AC 43.13-1B (14,
   28, 115, 200 V ; continu et intermittent) est dans l'outil. Reste : la
   règle Airbus (quel document, quel indice, continu / intermittent,
   puissance / signal), qui la remplacera.
8. **Les longueurs de fil.** ✔ La colonne « Cable length (mm) » du retest
   est lue : la chute d'un fil se calcule sur sa longueur, et la fiche d'un
   disjoncteur suit chaque chemin jusqu'à l'équipement, à travers les
   prises de coupure et les barrettes, comme la feuille Chute_en_ligne.
   Sans longueur, l'hypothèse de la simulation sert, et c'est dit. ✔ La
   résistance des contacts (AS39029, par taille) compte pour chaque prise
   et deux fois par barrette. Les 0,90 V et 2,10 V « par prise » de votre
   feuille sont vos propres calculs d'après vos exemples (votre réponse) :
   l'outil ne les reprend pas et on n'en parle plus.

### C. Les disjoncteurs

9. **La courbe ou la table de la norme.** ✔ Fait : les quatre courbes de
   l'Excel (125 °C, 23 °C min et max, −55 °C) sont dans
   `normes/disjoncteurs.csv`, avec les points de calibration publics
   (Sensata 2TC/3TC/7274, Safran 170), les familles (MS3320 / 2TC, 3TC, 6TC,
   9TC, 7274, EN 2495 / EN 2995, EN 3661, EN 2592 / EN 2996, EN 3662) et la
   protection par jauge (AC 43.13-1B). La fiche de chaque CB porte la gamme
   en segments (1, 3, 5, 7,5, 10, 15, 25 A — la vôtre), chacun jugé sur le
   profil par la somme des fractions de temps de déclenchement, l'idéal
   étoilé (le plus petit avec marge — 10 % de courant, 75 % du temps —, qui
   protège les fils sur la courbe lente et reste à 2:1 des voisins), le
   graphique d'ingénieur qu'on survole et qu'on glisse, les états du profil.
   Reste à confirmer : de quelle famille sont vos courbes (l'outil suppose
   un disjoncteur compensé type EN 2495 / MS3320), vos part numbers réels
   (NSA935401 est un collier, pas un disjoncteur : l'exemple dit MS3320-10)
   et la marge que vous vous imposez.
10. **Pour chaque équipement alimenté** (c'est ce qui remplira les profils
    de charge, aujourd'hui écrits à la main sur la fiche du disjoncteur) :
    - sa consommation, en A ou en W, et sous quelle tension ;
    - permanent ou intermittent ;
    - son courant d'appel, s'il compte ;
    - le repère du disjoncteur qui l'alimente.

    Le plus simple : deux colonnes de plus dans l'Excel, ou un petit tableau à
    part `Équipement ; Consommation ; Disjoncteur`.

### D. Raccords arrière, cheminées, colliers d'identification

11. ✔ Le tutoriel Raccords, les gaines et les colliers sont dans l'outil :
    chaque connecteur dit sa taille de boîtier et son filetage (lus dans le
    part number), son raccord (durci, pour manchon, serre-câble avec son
    code d'entrée, tyrap NSA935401) avec la norme EN 3660 du style, son
    band-it, son manchon VG 95343 (choisi par ce qui sort du raccord) et sa
    gaine (surblindage HFA ou protection Nomex) selon la reprise de
    blindage, l'étanchéité et la gaine choisies ; le toron suit la feuille
    de calcul (Seq, Deq, + 10 %). Reste **les désignations complètes des
    raccords** (la table dit EN3660-064 « à confirmer », pas la référence
    commandable) et leurs **cotes A, B, C, D** (sans C, le manchon est pris
    par le toron seul), et ce que changent l'overshielding et le matériau.
12. **Les macros Excel actuelles**, telles quelles : je relis leur logique et
    je la réécris dans l'outil. Il les fera seul, avec le pourquoi
    (« faisceau de 6,2 mm → raccord taille 14 »).

### E. Ce qui sort de l'outil

13. **La liste des documents à produire** (folios PDF, liste de fils,
    nomenclature, tableau de raccordement, fiches barrette…) et **un exemple
    rendu anonyme de chacun** : le cartouche officiel, le format, les indices
    de révision.
14. **Vos règles maison** :
    - qui donne le numéro d'un fil à créer (le fil d'une barrette à poser), et
      dans quelle plage ;
    - comment se choisit le repère d'une nouvelle barrette ;
    - le sens de lecture des folios ;
    - ce qui va sur quel folio.

### F. Les contrats déjà faits (voir § 2)

15. **Un extrait de la grande base**, dans son format réel : deux ou trois
    machines suffisent pour commencer, rendues anonymes si besoin (le nom du
    client et le numéro de série remplacés par un code). Rien ne sort de
    l'outil : il tourne dans le navigateur, sans réseau.
16. **Ce que « semblable » veut dire pour vous** : même appareil (H160,
    H175…), même client, même équipement (part number), même chaîne
    fonctionnelle. Je propose un classement, vous le corrigez.
17. **Ce qui a changé depuis** : les normes révisées depuis les anciennes
    machines. Une installation reprise doit passer les règles d'aujourd'hui.

---

## 2. Les contrats qui se ressemblent : ni zéro, ni copier-coller à l'aveugle

**On ne repart jamais de zéro**, et **on ne colle jamais un contrat entier**.
On part du contrat qu'on a, et l'outil propose, **installation par
installation**, ce que les machines semblables ont déjà fait. Rien ne change
sans un clic, tout se défait (Ctrl+Z), et tout passe les règles
d'aujourd'hui. Quatre temps.

✔ Les quatre temps sont dans l'outil : on dépose la grande base (un retest
de plusieurs harness, déposé sur la table ou par la bible), elle se garde
dans le navigateur ; la fiche de chaque équipement dit « Déjà fait » (les
trois machines les plus proches, même part number sinon même code, le taux
de lignes communes) ; un clic ouvre la comparaison (manque, diffère, pareil,
en plus ; les repères de la machine lus avec les nôtres) ; on coche, on
reprend, Ctrl+Z défait ; ce qui est repris passe les mêmes contrôles. ✔ Et
depuis, le **FWD** : chaque ligne de la base porte son dessin d'origine,
l'outil l'ouvre (le calque FWD le dessine avec son propre moteur de
placement), le compare à trois échelles (l'équipement, son voisinage à un ou
deux pas, le dessin entier), décode les repères en mots (« 412VC3B : prise
de coupure n° 3, variante B, zone 412 » ; « 677VT2 51B : module 51, contact
B » — merci pour la réponse) et propose les repères manquants. Reste à
régler avec vous : le numéro des fils repris, la correspondance des repères
quand le part number ne suffit pas, et les codes d'équipement que l'outil
ne connaît pas encore (il en connaît 24).

### a. Ranger (une fois)

Chaque ancienne machine devient un **contrat de référence** : son retest, lu
par le même lecteur que celui du contrat en cours (les seize colonnes, par
leur nom). Chaque ligne garde sa machine d'origine, rien n'est mélangé. On
dépose les fichiers une fois ; l'outil les garde dans ce navigateur, ou dans
un dossier partagé si vous préférez travailler à plusieurs.

### b. Reconnaître (tout seul, à l'ouverture d'un contrat)

Pour chaque équipement du contrat, l'outil cherche le même équipement dans
les références :

- même part number d'abord ;
- sinon même code (XC, RL, SW…) relié aux mêmes voisins.

Il compare les deux installations : bornes utilisées, destinations, types de
fil, connecteurs, barrettes, prises. Il en tire **un taux de ressemblance**
(« 300XC1 : machine X, 92 % des liaisons identiques »). Sur la fiche de
l'équipement, une section **« Déjà fait »** donne les trois plus proches.

### c. Reprendre (bloc par bloc, jamais à l'aveugle)

Un clic **« Reprendre comme machine X »** sur un équipement montre d'abord la
différence, ligne par ligne :

- **en vert**, ce que X a et que notre contrat n'a pas (un relais, une
  barrette, une plaquette éclairante) ;
- **en orange**, ce qui diffère (un autre connecteur, une autre jauge) ;
- **en gris**, ce qui est déjà identique.

Les repères diffèrent d'une machine à l'autre (102CB1 chez X, 205CB3 chez
nous) : l'outil propose la correspondance par part number et par voisins, et
vous la validez. Les numéros de fil neufs se prennent dans votre plage. On
coche ce qu'on garde, puis **« Appliquer »** : une seule action, qui se défait
d'un Ctrl+Z.

C'est ça, le copier-coller propre : **une installation, avec ses fils, ses
barrettes, ses prises**, recâblée sur nos repères. Ce n'est ni une ligne
d'Excel, ni un contrat entier.

### d. Revérifier (toujours)

Ce qui est repris passe les mêmes règles que le reste : contacts, jauges,
intensité, chute, disjoncteurs, raccords. La pastille de contrôle dit tout de
suite ce qui ne passe plus (une norme révisée depuis, un contact retiré). On
se cale sur l'existant, mais l'outil vérifie que l'existant est conforme.

### Et à l'échelle de la flotte

Pour un équipement, la liste de toutes les machines où il apparaît, avec
leurs variantes (connecteur, module de barrette, jauge). On voit tout de
suite la façon habituelle (« 8 machines sur 10 font comme ça ») et les
exceptions, qui méritent une question.

### Pour commencer

1. Envoyez-moi deux ou trois anciens retests rendus anonymes.
2. Je construis la lecture et la comparaison.
3. Je vous montre le classement sur un équipement que vous connaissez bien.
4. On ajuste ensemble les critères de ressemblance avant d'aller plus loin.

---

## 3. L'ordre proposé

1. Les contacts par norme : un petit travail, qui débloque la suite (§ 1 A).
2. L'intensité admissible et la chute en ligne : le mécanisme existe déjà
   (§ 1 B).
3. Les disjoncteurs (§ 1 C).
4. Les raccords, cheminées et colliers (§ 1 D).
5. L'historique : ranger, reconnaître, reprendre, revérifier (§ 2).
6. Les documents de sortie au gabarit maison (§ 1 E).
