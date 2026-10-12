# Ce qui manque à Volta pour être juste et complet

*Octobre 2026. Tu m'as demandé la liste de ce qui me manque. La voici, de la plus utile à la moins utile.*

Pour chaque donnée : ce que c'est, pourquoi Volta en a besoin, ce qu'il fait en attendant, et la forme sous laquelle
me la donner. La forme, c'est un Excel ou un CSV avec **ces en-têtes-là** (l'ordre des colonnes ne compte pas). Tu peux
me l'envoyer, ou le déposer toi-même : ⋮ → Vos fichiers → Normes (Volta montre ce qu'il lit avant de l'adopter). Trois
lignes d'exemple suffisent pour que je voie le format ; donne-moi ensuite le tout. Dans les exemples ci-dessous, les
valeurs montrent la forme, pas des données : « … » marque ce que toi seul connais.

Rien de ce qui suit n'est inventé dans Volta : ce qu'il ne sait pas, il le dit (« à confirmer », « manque »).

---

## Le raccourci : ta base SEE

Tes captures de SEE Electrical Equipment Definition (12 octobre 2026) montrent que la base de ton programme contient
déjà l'essentiel de cette liste : **748 câbles** (Cables and Wires), **7 091 équipements** (Equipments : connecteurs,
disjoncteurs comme le 21708F, barrettes) et **1 297 règles d'end fitting** (End Fitting Rules : quel contact, quel
accessoire pour quel connecteur et quel câble).

- **Ce que ça remplacerait.** Les points 2 (la nomenclature des disjoncteurs), 9, 10 et 13 (les contacts), 12 (la bible
  des connecteurs et des prises) et 22 (les câbles douteux) d'un coup, avec tes références à toi.
- **Ce que j'en ai déjà tiré.** Le DH4 (ECS0844 : 0,27 kg/m, Ø 8,8 mm, −65 / +260 °C), qui n'est pas dans ton Excel.
- **Comment me la donner.** Si SEE sait exporter une grille vers Excel (souvent un clic droit sur la liste, ou un menu
  Exporter), trois exports avec toutes leurs colonnes : Cables and Wires, Equipments (au moins les connecteurs et les
  disjoncteurs), End Fitting Rules. S'il ne sait pas, trois captures de fiches, « General attributes » déroulés, me
  suffisent pour voir les champs : un connecteur, une règle d'end fitting (*ECS0852 par exemple), un disjoncteur.

---

## Priorité 1 — ce qui change les verdicts partout

### 1. La courbe de la norme des disjoncteurs (celle que tu m'as promise)

- **Ce que c'est.** Pour chaque température, le temps de déclenchement selon le courant (en multiples du calibre).
- **Pourquoi.** C'est la courbe qui choisit le calibre et qui dit si le câble est protégé. Tu veux que tout se
  justifie sur elle.
- **En attendant.** Volta prend les quatre courbes de ton Excel (125 °C, 23 °C rapide et lente, −55 °C). La
  recherche les a reconnues : ce sont celles d'un E-T-A 483, à 1-4 % près. Pour un Klixon 2TC, un 6TC, un 7274 ou un
  Crouzet, il prend leurs fiches constructeur.
- **Comment me la donner.** Une ligne par point lu sur la courbe :

  ```
  Famille;Courbe;Température;Multiple;Temps
  MS3320;125 °C;125;1,15;3600
  MS3320;125 °C;125;2;5,2
  ```

### 2. La nomenclature des disjoncteurs

- **Ce que c'est.** Les part numbers que vous posez vraiment (MS3320, Klixon 2TC, E-T-A 483, Crouzet 84 406…), leur
  famille et les calibres que vous achetez.
- **Pourquoi.** La famille donne la gamme, la courbe, ce que le disjoncteur garantit à chaud et sa chute propre. Le
  meilleur calibre se cherche dans cette gamme.
- **En attendant.** Volta reconnaît une vingtaine de familles (table Familles de disjoncteurs) et ta liste « 1, 3, 5,
  7,5, 10, 15, 20, 25 A ». Un part number inconnu prend les courbes E-T-A 483 et la fiche le signale.
- **Comment me la donner.**

  ```
  Famille;Norme;Pôles;Calibres;Courbe;Motifs
  MS3320;MS3320N (Klixon 2TC2);1;1 3 5 7,5 10 15 20 25;MS3320;MS3320
  ETA483;E-T-A 483-G533;1;1 2 3 5 7,5 10 15 20;ETA483;483
  ```

### 3. Les températures du tableau de disjoncteurs et des zones des câbles

- **Ce que c'est.** La température la plus basse et la plus haute de chaque tableau de disjoncteurs, et l'ambiante
  des zones où passent les câbles (cabine, soute, mât, puits de train…).
- **Pourquoi.** La plus haute fait déclencher plus vite (c'est elle qui choisit le calibre) ; la plus basse laisse
  passer plus longtemps (c'est elle qui juge la protection du câble) ; l'ambiante réduit ce qu'un câble admet. Le
  résultat change souvent d'un cran ou deux.
- **En attendant.** −55 / +125 °C pour le tableau (le cas le plus dur des deux côtés) et 95 °C d'ambiante. Tu peux
  les changer dans ⋮ → Plus → Hypothèses, mais ils valent alors pour tout le contrat.
- **Comment me la donner.** La zone, ce sont les chiffres en tête du repère (540 dans 540PM2) :

  ```
  Lieu;Zone;T min (°C);T max (°C)
  Tableau de disjoncteurs cockpit;102;-40;70
  Mât moteur;540;-55;125
  ```

### 4. Les règles du programme (ABD0100)

- **Ce que c'est.** La règle Airbus : la chute de tension admise, le déclassement des câbles en faisceau, la règle
  de protection, la réserve de contacts dans un connecteur.
- **Pourquoi.** Volta suit aujourd'hui la FAA (AC 43.13-1B) et ta règle orale de chute. Le programme peut dire
  autre chose.
- **En attendant.**
  - La chute admise est ta règle : **2 V en continu et en monophasé, 4 V en triphasé**, quelle que soit la tension.
    Ce sont des hypothèses, modifiables (⋮ → Plus → Hypothèses → « chute admise »). Vidées, la table de la FAA
    reprend (1 V sous 28 V, le double pour une pointe de moins de 2 min).
  - Questions sur ta règle : vaut-elle pour le 14 V et le 270 V continu ? Une pointe brève a-t-elle droit à plus ?
    Mesure-t-on depuis le bus amont (le disjoncteur compris, comme aujourd'hui) ou depuis le bus aval ?
  - Le déclassement en faisceau suit la figure 11-5 de la FAA (8 câbles chargés à 60 % → × 0,6).
  - La réserve de contacts n'est pas vérifiée.
- **Comment me la donner.** Le document et son indice, ou les tables :

  ```
  Tension;Nature;Chute max;Chute max intermittent;Note
  28;continu;2;…;ABD0100 indice … § …
  200;alternatif entre phases 400 Hz;4;…;ABD0100 indice … § …
  ```

### 5. Le profil de charge de chaque disjoncteur

- **Ce que c'est.** Ce que tire chaque équipement protégé : le démarrage, la transition et le permanent (un courant
  en A, une durée en s), tirés du bilan électrique.
- **Pourquoi.** Sans profil, Volta ne peut choisir aucun calibre : il le demande sur la fiche.
- **En attendant.** Tu l'écris sur la fiche de chaque disjoncteur. Volta n'invente rien.
- **Comment me le donner.** Un tableau, une ligne par disjoncteur ; sous cette forme, je peux apprendre à Volta à le
  lire d'un coup (aujourd'hui, il ne le lit pas) :

  ```
  Disjoncteur;Démarrage (A);Démarrage (s);Transition (A);Transition (s);Permanent (A)
  102CB1;9,31;5;9,31;120;5
  205CB5;;;;;2
  ```

### 6. La longueur des câbles dans le retest

- **Ce que c'est.** La colonne « Cable length » de tes retests, en mètres ou en mm.
- **Pourquoi.** La chute en ligne se calcule sur la longueur. Sans elle, une chute trop forte reste « à voir » et
  ne devient pas un problème.
- **En attendant.** 5 m par câble (une hypothèse, dite partout « hyp. »). Tu peux écrire une longueur sur la fiche du
  câble.
- **Comment me la donner.** Une colonne de plus dans le retest, que Volta lit déjà :

  ```
  Device1;Pin1;Cable TG;Cable Tag;Device2;Pin2;Cable length (mm)
  102CB1;2;DR20;W-012;103RL1;A1;4200
  102CB1;2;DR24;W-015;395SW1;1;6800
  ```

### 7. La colonne « Install » de la base des contrats déjà faits

- **Ce que c'est.** Pour chaque ligne de ta grande base, l'install à laquelle elle appartient (« Antenne VHF »,
  « Cockpit »…).
- **Pourquoi.** La bibliothèque range les plans par install. Avec cette colonne, chaque harness de la base peut aller
  tout seul dans la bonne install.
- **En attendant.** La base se range par harness et par dessin (FWD) ; les installs se font à la main.
- **Comment me la donner.** Une colonne de plus dans la base (les autres ne changent pas) :

  ```
  Harness;Install;Device1;Pin1;PN1;Cable TG;Cable Tag;Device2;Pin2;PN2;FWD;Appareil
  332A601150-031-B;Antenne VHF;103RL1;A1;E0836IS35-22SA;DR20;W-012;102CB1;2;MS3320-10;MEE256A7815001B;H175
  332A601150-023-D;Cockpit;303RL1;A1;E0836IS35-22SA;DR20;W-212;302CB1;2;MS3320-10;MEE256A7815001A;H160
  ```

---

## Priorité 2 — les contacts et les connecteurs

### 8. La classe de tes EN 2997 en zone feu, et les zones

- **Ce que c'est.** Tes 52 lignes EN 2997 prennent des contacts classe S (200 °C). Un EN 2997 coupe-feu (260 °C)
  demande les EN 3155-004/-005 classe T, et un raccord inox (classe K).
- **Pourquoi.** C'est le point le plus important des contacts : en zone feu, le contact et le raccord changent. Les
  zones décident aussi où un tyrap est interdit (au-dessus de 120 °C, en zone SWAMP).
- **En attendant.** Classe S partout, raccord de la classe lue dans le part number, aucune zone connue.
- **Comment me la donner.**

  ```
  Zone;Nature;T max (°C);Classe EN 2997
  540;feu (mât moteur);260;SE, contacts EN3155-004/-005
  412;SWAMP (puits de train);95;W
  ```

### 9. Les 11 points de tes tables de contacts à relire

- **Ce que c'est.** Onze lignes de tes tables SEE qui ne se répondent pas (une paire broche / douille qui ne
  s'accouple pas, un manchon d'un seul côté, des colonnes peut-être inversées…). Le détail est dans « Tes questions :
  les réponses » (octobre 2026).
- **Pourquoi.** Volta les applique telles quelles, marquées « à confirmer ».
- **En attendant.** Aucune n'est corrigée sans toi.
- **Comment me les donner.** Une ligne par point :

  ```
  Point;Réponse
  1;EN 4165, broche 22, YYBKW : EN3155-008M2222
  4;douille taille 8 jauge 10 : EN3155-083F0810
  ```

### 10. Les contacts des barrettes (NSA937901, ASNE 0599) et de l'ASNE 0059

- **Ce que c'est.** La capture des onglets SEE de ces trois normes.
- **Pourquoi.** Les broches des barrettes viennent du catalogue Air LB (EN 3155-016), pas de tes tables. Le choix
  entre EN3155-016M2018 et -M2020 en taille 20 est à confirmer. L'ASNE 0059 n'a aucun contact.
- **En attendant.** Les broches EN 3155-016 « à confirmer » ; un ASNE 0059 juge la gauge par la taille seulement, sans
  contact à sertir.
- **Comment me les donner.** Comme tes autres tables SEE :

  ```
  Norme;Sexe;Taille;Type de fil;Jauge;Contact;Accessoire
  NSA937901;M;20;*;*;EN3155-016M2018;
  ASNE0059;F;20;*;*;EN3155-019F2020;
  ```

### 11. Les 59 références non publiques

- **Ce que c'est.** Des contacts Airbus (E08xx, NSA938…), Airbus Helicopters (ECS…) ou fournisseurs (KB, LB…) qu'aucune
  source publique ne permet de vérifier.
- **Pourquoi.** Ce sont des choix de ton programme : toi seul peux dire qu'ils sont bons.
- **En attendant.** Utilisées, marquées « à confirmer : non publique ».
- **Comment me les donner.** Un mot par référence suffit :

  ```
  Contact;Statut
  NSA938172SL1600;vérifié
  ECS0754;remplacé par EN3155-074
  ```

### 12. Ta bible de prises de coupure et de connecteurs

- **Ce que c'est.** La liste des références que l'atelier pose (prises de coupure, embases et leur fiche), avec leur
  nombre de contacts et les gauges admises. Et la vraie norme de la prise EN 3646 : l'intensité et la résistance de
  ses contacts.
- **Pourquoi.** La bible embarquée n'est qu'un exemple ; la famille EN 3646 « (exemple) » a des valeurs inventées
  (7,5 A, 8 mΩ par contact), qui entrent dans la chute en ligne.
- **En attendant.** Les barrettes viennent des vraies normes (ASNE 0599, NSA937901) ; les prises et les connecteurs
  prennent les arrangements des normes EN, et la bible d'exemple pour le reste, dite telle.
- **Comment me la donner.**

  ```
  Référence;Famille;Nature;Bornes;Jauge min;Jauge max;Intensité;Mobile
  EN3646A61208FN;EN3646;coupure;8;26;20;7,5;
  EN2997Y1A08P;EN2997;connecteur;8;26;20;7,5;EN2997Y2A08S
  ```

### 13. Les contacts qui n'ont pas encore de ligne

- **Ce que c'est.** La taille 22 haute densité de l'EN 2997 (EN 3155-078/-079 : la référence complète n'est pas
  publique), et les plages de gauge de l'EN 3155-002 (qui valideraient celles de l'EN 4165 et les fûts officiels).
- **Pourquoi.** Sans eux, les arrangements EN 2997 à contacts 22 (08-06, 10-12, 12-21) reçoivent un câble sans contact
  à sertir, et la gauge admise par un module EN 4165 reste une plage usuelle.
- **En attendant.** Les plages usuelles des contacts EN 3155, « à confirmer ».
- **Comment me les donner.**

  ```
  Norme;Sexe;Taille;Type de fil;Jauge;Contact
  EN2997;M;22;*;24;EN3155-078M22…
  EN2997;F;22;*;24;EN3155-079F22…
  ```

### 14. Le sexe des contacts côté source

- **Ce que c'est.** Quel côté prend les douilles : Volta suppose des douilles face à une embase d'équipement, la
  fiche d'une prise femelle et son embase mâle.
- **Pourquoi.** Le sexe choisit le contact à sertir de chaque câble.
- **En attendant.** Cette hypothèse ; « Changer » l'inverse sur chaque fiche.
- **Comment me le donner.** Une phrase suffit : « côté sous tension, toujours des douilles », ou la règle du programme.

---

## Priorité 3 — le raccord et ce qui l'entoure

### 15. Les cotes des cheminées EN 4165

- **Ce que c'est.** Le Ø intérieur des cheminées EN 4165-015 (ronde) et -016 (double ovale).
- **Pourquoi.** Pour savoir si le toron d'un module passe dans sa cheminée.
- **En attendant.** Une cheminée par module câblé ; le passage du toron est « à confirmer » sur chaque fiche (les
  normes EN 4165-014 à -016 sont payantes).
- **Comment me les donner.**

  ```
  Famille;Type;Orientation;Norme;Amax;Référence;Note
  EN4165;cheminée;droit;EN4165-015;…;EN4165-015…;Ø intérieur (catalogue …)
  EN4165;cheminée;droit;EN4165-016;…;EN4165-016…;double ovale, deux modules
  ```

### 16. Les tyraps NSA935401

- **Ce que c'est.** La largeur, la longueur et le Ø maximal de toron des NSA935401-03, -04, -05, -08, -10, -12.
- **Pourquoi.** Volta prend le tyrap le plus serré qui passe le toron. Seuls le -06 et le -13 sont vérifiés ; le -05
  disait 305 mm de long pour un Ø de 50, ce qui ne tient pas (corrigé à 200 mm, à confirmer).
- **En attendant.** Les valeurs de ton Excel et des équivalents HellermannTyton, « à confirmer ».
- **Comment me les donner.**

  ```
  Référence;Type;Largeur;Longueur;Dmax
  NSA935401-03;tyrap;2,5;100;22
  NSA935401-05;tyrap;4,6;200;50
  ```

### 17. Ton band-it réel

- **Ce que c'est.** La bande que l'atelier pose vraiment : l'EN3660-033AF (la bande normalisée) ou l'E0805-01
  d'Airbus Helicopters ? Et les cotes de l'E0805 (largeur, longueur, Ø maximal).
- **Pourquoi.** Volta prend une bande « par défaut » partout où elle serre.
- **En attendant.** L'EN3660-033AF par défaut, l'E0805 en équivalent.
- **Comment me le donner.** La colonne « Défaut » dit laquelle est la vôtre :

  ```
  Référence;Type;Largeur;Épaisseur;Longueur;Dmax;Défaut
  E0805-01;band-it;…;…;…;15;oui
  EN3660-033AF;bande standard plate;6,22;0,48;361;47,8;
  ```

### 18. La tresse HFA DHS754-160

- **Ce que c'est.** Le Ø intérieur et extérieur de chaque taille de la tresse de surblindage DHS754-160.
- **Pourquoi.** La tresse choisie dépend du toron qu'elle doit couvrir.
- **En attendant.** Les valeurs de ton Excel, « à confirmer » (aucune donnée publique).
- **Comment me la donner.**

  ```
  Famille;Référence;Rôle;Dint;Dext;Masse
  HFA;DHS754-160.10;surblindage;4;4,5;15
  HFA;DHS754-160.20;surblindage;6;6,5;22
  ```

### 19. Les questions de raccord qui restent

- **Le raccord à collier de l'EN 2997.** L'EN 3660-013 existe mais ne nomme pas sa famille ; l'EN 3660-025 (faite pour
  l'EN 3646) irait physiquement. Lequel prenez-vous ? *En attendant : l'EN 3660-013, sans désignation.*
- **« L'EN 3645 s'utilise sans raccord » tient-il toujours ?** *En attendant : oui (ta règle d'atelier) ; les
  EN 3660-063 et -062 sont prêts dans la table.*
- **La chambre des raccords (A, B, C, D).** *En attendant : A par défaut, et un conseil « B ou plus » quand on reprend
  des blindages un à un.* Dis-moi votre pratique.
- **Un manchon droit pour le code d'entrée A** (épaulement Ø 12,2 mm) : aucun manchon droit de la table n'y va.
  *En attendant : « manque » sur la fiche.*
- **Les obturateurs de cavité de l'EN 2997, de l'EN 3646 et de l'EN 4165.** *En attendant : « manque » dans la liste des
  pièces.*
- **Comment me les donner.** Une réponse par ligne, ou les lignes des tables :

  ```
  Famille;Taille;Obturateur;Équivalent;Couleur
  EN2997;20;…;…;rouge
  EN4165;22;…;…;noir
  ```

### 20. Les désignations des raccords à compléter

- **Ce que c'est.** La façon d'écrire la référence complète des EN 3660-005, -017/-018, -020/-021 et -025 à -027 (la
  clause est après l'aperçu public de ces normes).
- **Pourquoi.** Volta construit ces références sur un modèle : les suffixes sont « à confirmer ».
- **En attendant.** La référence construite, dite « modèle ».
- **Comment me les donner.** Une référence réelle par partie suffit à retrouver la règle :

  ```
  Norme;Référence réelle;Connecteur
  EN3660-025;EN3660-025N12…;EN3646A61208FN
  EN3660-005;EN3660-005N12…;EN2997W61208FN
  ```

---

## Priorité 4 — les câbles

### 21. Deux pages de ton EN 2853

- **Ce que c'est.** La page 14 : le 12 AWG fait-il bien 35 A, et le 8 AWG 68 A ?
- **Pourquoi.** Le 12 AWG est 7 % au-dessus de la FAA ; le 8 AWG sort de la tendance des autres jauges.
- **En attendant.** Tes valeurs, telles quelles.
- **Comment me la donner.** Une photo de la page, ou :

  ```
  Type;Jauge;Intensité;Intensité 2 s;Intensité 10 s;Intensité 1 min
  *;12;35;…;…;…
  *;8;68;…;…;…
  ```

### 22. Les lignes douteuses de la base des câbles

- **Ce que c'est.** Relues sur tes photos de l'Excel : elles y sont bien telles quelles, ce sont des copies dans
  l'Excel. DW24 (masse et résistance du DW22), GPB24 (du GPB22), MLA12 (même Ø que le MLA14), AM et YV (mêmes
  résistances et masses), LE (fibre ou coaxial ?). S'y ajoutent les deux lignes qui manquaient à Volta et qu'il a
  maintenant : **KQ24** (un twinax noté sans blindage, sans nombre de liaisons — est-ce juste ?) et **KR24** (un octax :
  quelle norme ?). Et le **DH4** de SEE, sans résistance.
- **Pourquoi.** Leur résistance et leur Ø entrent dans la chute et dans le toron.
- **En attendant.** Tes valeurs, telles quelles. Les familles **DK, DL et DM** que SEE connaît ne sont pas dans ton
  Excel : un retest qui en porte un est signalé « type de câble inconnu ».
- **Comment me les donner.** L'export Cables and Wires de SEE (voir « Le raccourci »), ou :

  ```
  Câble;Brins;Blindage;Résistance;Diamètre;Masse
  DW24;1;0;…;…;…
  KQ24;2;…;145;3,56;21
  DH4;1;0;…;8,8;270
  ```

### 23. Ce qui manque pour l'aluminium et le réseau

- **Les câbles 180 °C (AD, VN, aluminium cuivré) en court terme** : ce qu'ils supportent avant de s'abîmer (ABS 0949,
  EN 4681, payantes). *En attendant : leur protection se juge sur leurs intensités de service, plus sévères.*
- **Le contact qualifié pour l'aluminium** (ABS1493, ABS1380 ou EN 3155-070/-071 ?). *En attendant : « qualification
  CCA à confirmer » sur chaque AD serti sur un contact cuivre.*
- **Le retour sur un fuselage composite** : par la structure (l'aller seul compte) ou par un câble ?
  *En attendant : par la structure ; l'hypothèse « retour » le change.*
- **Le 270 V continu et le 230 V** : aucune règle de chute publique par circuit. *En attendant : ta règle, 2 V (4 V en
  triphasé), quelle que soit la tension.*
- **Comment me les donner.** Une phrase par point, ou le document.

---

*Ce document est aussi dans le dépôt : `CE-QUI-MANQUE.md`. Chaque donnée reçue fait disparaître une ligne « à
confirmer » ou « manque » dans les fiches.*
