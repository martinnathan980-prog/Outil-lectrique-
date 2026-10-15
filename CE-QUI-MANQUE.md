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
- **Ce qu'elle ne remplacera pas.** Les courbes des disjoncteurs, les profils de charge, les températures des zones,
  les longueurs des câbles et ta règle des 2 V : ils restent dans tes Excel et tes retests.
- **Le pont qui marche (octobre 2026) : Excel lit la base SEE directement.** SEE Equipment Definition se connecte à une
  base SQL Server (son fichier `SEE_EED.UDL`, ouvert au Bloc-notes, donne le serveur et la base). Avec l'accord de ta
  hiérarchie :
  1. *Excel → Données → Obtenir des données → À partir d'une base de données → SQL Server* : le serveur et la base du
     `.UDL`, mode Importer, authentification Windows (« mes informations d'identification actuelles ») ; s'il dit qu'il
     ne peut pas chiffrer, OK. Excel ne fait que lire.
  2. Dans le Navigateur, « Sélectionner plusieurs éléments », les six vues : **EED_ViewEndFittingRules**,
     **EED_ViewCablesAndWires**, **EED_ViewConnectiveEquipments**, **EED_ViewContactLayouts**, **EED_ViewAccessories**,
     **EED_ViewEquipments** ; Charger ; enregistrer le classeur sur ton PC. Pas les « fx » (des fonctions, une pièce à
     la fois), pas « Sélectionner les tables associées ».
  3. Ce classeur se dépose dans Volta (n'importe où, ou ⋮ → Vos fichiers → Normes → « Lire la base SEE… ») : Volta le
     reconnaît à ses feuilles EED_View…, le lit sur place sans rien en garder, et montre une feuille par écran — ses
     lignes, ses colonnes remplies (taux, deux exemples, masquables), les vides à part. **Une photo par feuille** me
     suffit pour apprendre à Volta à prendre ces colonnes ; « Copier le résumé » le donne aussi en texte.
  4. Quand la base SEE bouge : Données → Actualiser tout dans l'Excel, et le redéposer.
  5. *Ce que les tables apportent (octobre 2026).* Les vues ne sont que l'onglet « Attributes » de chaque pièce ; le
     reste est dans des tables reliées par des identifiants (GUID) : **EED_OBJ_END_Fitting_Rules_Contact** (le contact à
     sertir par sexe, taille de cavité, type de câble et gauge), **EED_OBJ_PlugMapPin** (les broches des arrangements :
     nom, X/Y en mètres, taille, coax), **EED_OBJ_Wires** (les conducteurs, leur résistance en Ω/m),
     **EED_LNK_Equi_Mating** (fiche ↔ embase). SEE écrit en unités SI : gauge et taille de cavité en mm² (0,5179 = 20),
     diamètres en m, masses en kg/m. Depuis la version 65, Volta lit chaque feuille en entier, relie lui-même les
     identifiants d'une feuille à l'autre (onglet « Liens ») et liste les codes (onglet « Codes », avec le plan ouvert
     confronté à SEE) : c'est ce qu'il faut pour écrire l'import.
- **Les autres voies, si celle-ci est fermée.** *Copier la grille* de SEE (Ctrl+A, Ctrl+C, coller dans le Bloc-notes
  pour voir si le texte suit) ; *le référent SEE*, qui peut tirer les mêmes vues en Excel. *Pas en photos* des lignes
  elles-mêmes : des milliers de lignes en photo, ce sont des erreurs de lecture et des jours de travail.
- **Où la mettre.** Jamais dans le dépôt GitHub, même passé en privé : c'est la base de ton programme. L'export reste sur ton PC, et tu le déposes dans
  Volta (⋮ → Vos fichiers → Normes) : Volta le lit sur place, hors ligne, rien ne sort. Demande d'abord à ta hiérarchie
  si tu as le droit d'en faire un export : c'est la base de ton programme.
- **Tu peux le faire tout de suite, sans moi (version 61).** Dans SEE, tout sélectionner dans la liste (Ctrl+A), copier
  (Ctrl+C) ; dans Volta, ⋮ → Vos fichiers → Normes → « Coller des lignes », coller, « Lire ». Volta ne connaît pas les
  en-têtes de SEE : il te demande UNE fois quelle table c'est (Contacts pour les End Fitting Rules, Câbles pour les
  Cables and Wires) et ce que dit chaque colonne (« Gender » → Sexe, « Cavity » → Taille…), te montre ce qu'il lit,
  et tu adoptes. Il retient cette correspondance dans ton navigateur : la fois suivante, le même export se lit d'un
  coup (« correspondance retenue »). Rien ne sort de ton PC.
- **Ce qu'il me faut pour les Equipments.** Volta n'a pas encore de table où ranger tes connecteurs et tes
  disjoncteurs (la référence, la famille, le nombre de contacts) : pour la construire, la photo de la feuille
  EED_ViewEquipments dans « Lire la base SEE » (ci-dessus) suffit.

---

## Ce que la version 63 attend de toi

- **La référence du rail des barrettes ASNE 0599.** Chaque barrette dit maintenant la référence de chacun de ses modules
  et celle du rail qui les porte. Pour la NSA937901, c'est sourcé : **NSA937901RB2000**, rail aluminium de 2 m à couper
  à la longueur (équivalent Souriau 8559RB2000A, catalogue 8559 p. 184 ; Amphenol 001101 042 10), un étrier
  NSA937901S à chaque bout. Pour l'ASNE 0599, je n'ai pas la norme sur ce point : Volta prend en attendant le rail du
  catalogue Amphenol Air LB des modules au pas de 14 mm, **001751 1NN 00** (NN = le nombre de modules, 00 = anodisé ;
  catalogue 05/12 p. 97). Donne-moi la référence que ton atelier commande, ou dépose la ligne dans la table
  Accessoires (Famille, Référence, Équivalent, Rôle — un rôle qui commence par « rail »).
- **Les autres équipements : relais, prolongateurs, voyants…** Chacun a sa norme. Plutôt que de tous les faire d'un coup,
  Volta les traitera comme les connecteurs : une famille (le préfixe de la référence), sa norme, son arrangement de
  contacts. La voie la plus courte reste la table Equipments de SEE (sa ligne d'en-têtes et deux ou trois lignes) :
  je construirai la table « Familles d'équipements » sur ses colonnes.
- **L'ECP de chaque installation.** Volta range maintenant les installations par leur numéro d'ECP (cinq chiffres). Une
  base des contrats déjà faits qui porte une colonne ECP (ou des installations nommées « 40217 … ») les numérote d'elle-même.

---

## Priorité 1 — ce qui change les verdicts partout

### 1. La courbe de la norme des disjoncteurs

- **Ce que tu m'as envoyé.** La fiche E-T-A 4120 (homologuée MS 3320, EN 2495, EN 2995, EN 3773), en photo d'écran :
  trois courbes (125 °C, 23 °C en bande, −55 °C), la même forme que les quatre courbes de ton Excel. Posées l'une sur
  l'autre, elles se suivent ; sur une photo d'écran, je ne peux pas relire la fiche au point près (±15 %).
- **Ce que Volta en fait.** La famille ETA4120 existe (sa gamme 1-25 A, −55/+125 °C, ses chutes typiques) ; ses
  courbes sont celles de ton Excel en attendant.
- **Ton Excel « 01 - Calibre disjoncteur »** (feuille Base_de_données), relu sur tes photos : ses 189 points sont ceux
  de Volta, au chiffre près. C'est un relevé à la main d'une courbe E-T-A : trois points où le multiple recule (lignes
  4 et 8 de la 125 °C, ligne 5 de la −55 °C), sans effet. Dans la partie verticale, un pixel de relevé vaut 2 % de
  multiple : la bande 23 °C y déclenche dès 1,05 In, là où une MS 3320 tient 1,15 In une heure. Sans effet non plus :
  Volta juge sur la 125 °C, plus rapide.
- **Ce qui reste.** L'onglet **Programme** du même Excel, en photo : sur quelle courbe choisissez-vous le calibre ?
  Volta prend la plus rapide (125 °C). Et tes disjoncteurs sont-ils tous des 4120 ? Si oui, la 4120 devient la famille
  par défaut (à 1 A : 1,1 V au lieu des 0,75 V de la 483).
- **Comment me la donner.** Le PDF de la fiche 4120 (la courbe est vectorielle : je la relis au point près), ou une
  ligne par point lu :

  ```
  Famille;Courbe;Température;Multiple;Temps
  ETA4120;125 °C;125;1,15;3600
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

- **Ce que tu m'as envoyé.** Ton guide (« Définir le type de câble pour garantir une chute en ligne max de 2 V ; la
  résistance de ligne est fonction du type de câble, de la taille des contacts, des composants électriques »), ta
  table des chutes (disjoncteurs « Du max », contacteur, diode, relais) et ta table des contacts par gauge. Volta les
  applique : la chute du disjoncteur est celle de ta table, comptée entière ; chaque contact traversé, celle de sa
  gauge ; la génération est négligée (elle garantit 28 V en sortie des panneaux).
- **Ce qui reste.**
  - Une **pointe brève** (60 A pendant 3 s) a-t-elle droit à plus que 2 V ? Aujourd'hui, non : 207CB7 dépasse en pointe.
  - Les **composants traversés** (relais, contacteur, diode) : Volta a leur chute, mais ne sait pas quand le courant
    les traverse. Il lui faut, pour chaque équipement de puissance, les bornes du contact (A1 → A2 ?).
  - Ta table **« Du max »** est plus basse que la chute *typique* de la fiche E-T-A 4120, et plus encore que la chute
    *maximale* de la MS 3320. Un maximum sous le typique, c'est un maximum qui n'en est pas un. Volta prend ta table ;
    l'écart est de 0,01 à 0,09 V par disjoncteur (0,20 V à 3 A contre la MS 3320). D'où vient-elle ?

    | Calibre (A) | 3 | 5 | 7,5 | 10 | 15 | 20 | 25 |
    |---|---|---|---|---|---|---|---|
    | Ta table « Du max » (V) | 0,35 | 0,25 | 0,20 | 0,20 | 0,15 | 0,15 | 0,15 |
    | E-T-A 4120, typique (V) | 0,44 | 0,26 | 0,25 | 0,23 | 0,20 | 0,19 | 0,19 |
    | MS 3320, maximum (V) | 0,55 | 0,35 | 0,30 | 0,28 | 0,25 | 0,25 | 0,20 |

    Elle n'a pas non plus de 1 A, le calibre qui chute le plus : 1,1 V, la moitié de tes 2 V.
  - Les **calibres 30 et 35 A** sont dans ta table des chutes, pas dans ta gamme (1 à 25 A) ni dans celle de la 4120 :
    quel disjoncteur est-ce ? Les ajoute-t-on ?
  - Ta règle des **2 V** en 28 V continu est le double de la FAA en service continu (AC 43.13-1B, table 11-6 : 1 V,
    2 V en intermittent de moins de 2 min) ; en triphasé, tes 4 V sont plus stricts que ses 7 V. Ta règle prime :
    Volta la garde. C'est à savoir si un client vous oppose la FAA.
  - Ta règle vaut-elle pour le 14 V et le 270 V continu ? Le déclassement en faisceau suit la FAA (8 câbles à 60 %
    → × 0,6) ; la réserve de contacts n'est pas vérifiée.

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

### 14. Le sexe des contacts

- **Réglé en grande partie.** Ta codification des connecteurs : Volta lit le sexe dans le part number (A mâle, B
  femelle pour l'EN 2997, l'EN 3645 et l'EN 3646 ; P mâle, S femelle pour l'E0053/E0052) et, pour une prise, sa
  partie (0 embase carrée, 6 prise mobile). Sur l'exemple, la prise 408VC1A (EN3646A6083AAN) devient une fiche mâle.
- **En attendant, pour un part number qui ne le dit pas.** Des douilles face à une embase d'équipement, la fiche
  femelle d'une prise ; « Fiche mâle / femelle » l'inverse sur la fiche.

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

- **Réglé.** Ton guide : l'E0805-01 quand le toron fait moins de 15 mm, l'E0805-02 au-delà. C'est le band-it par
  défaut ; la bande normalisée qui serre la plateforme (EN3660-033AF) est donnée en équivalent.
- **Ce qui reste.** Les cotes de l'E0805 (largeur, longueur), pour la nomenclature et la masse.

### 18. Ta table CHOIX : ce qui reste à préciser

Tes photos de l'onglet Raccord sont dans Volta (octobre 2026) : la table CHOIX décide maintenant du raccord de
l'EN 3645, de l'EN 2997 et de l'EN 3646, avec tes lettres de matériau (F pour le nickelé des -062 à -065), ta table
de compatibilité, les cotes de l'IC1320 et de l'E0120, ta gamme de manchons T18. L'EN 3645 n'est plus « sans
raccord ». Les tresses HFA et les gaines Nomex étaient déjà celles de ton Excel, à l'identique.

- **Le « serre-câble (A) » de l'EN 3646** (NSA938150-03 droit, -01 coudé) : à quoi sert-il, à côté du serre-câble
  EN 3660-004/-005 ? *En attendant : Volta prend l'EN 3660-004/-005, comme pour l'EN 2997.*
- **L'EN 2997 sans raccord à collier ni raccord pour manchon** dans ta table : Volta prend alors le serre-câble, ou
  le durci et son manchon. Est-ce votre pratique ?
- **Les références complètes** : E0617B, E0618B, E0080-01 et -02 (une taille à ajouter ?), l'E0120 (ta table écrit
  « E0120- » : Volta écrit E0120-12 pour un boîtier 12), l'IC1320 (comment s'écrivent la taille avant, la taille
  arrière et la lettre C ou B ?). *En attendant : « référence complète à confirmer » sur la pièce.*
- **Les cotes de l'E0120** : Volta lit A comme l'avant, B comme le passage du toron et C comme l'épaulement du
  manchon. C'est bien ça ?
- **L'usage des matériaux** : ta table de compatibilité dit « cargo only » pour l'anodisé noir, ta codification des
  connecteurs dit « cargo + extérieur ». Lequel est juste ?
- **Trois cotes de manchon** diffèrent de 0,5 à 1 mm entre ta table et le guide HellermannTyton (B003A : 14,5 contre
  14 ; C001A : 28,5 contre 28 ; D002A : 14,5 contre 15,5). Volta garde celles du guide.
- **Comment me les donner.** Une réponse par ligne suffit.

### 19. Les questions de raccord qui restent

- **La chambre des raccords (A, B, C, D).** *En attendant : A par défaut, et un conseil « B ou plus » quand on reprend
  des blindages un à un.* Dis-moi votre pratique.
- **Un manchon pour un petit toron** : sous 6 mm, aucun manchon de ta gamme T18 ne serre (leur petit bout rétreint
  fait 6 mm ou plus) ; Volta prend alors un manchon du guide, et sur l'épaulement du code A (12,2 mm) aucun ne va.
  *En attendant : « manque » sur la fiche.*
- **Les obturateurs de cavité de l'EN 2997, de l'EN 3646 et de l'EN 4165.** *En attendant : « manque » dans la liste des
  pièces.*
- **La marge du toron** : ton tutoriel dit 10 %, ton guide 20 %, et Volta prend le facteur TE (1,15 dès sept câbles,
  plus pour deux à six). Lequel retient-on ? *En attendant : TE ; « comme le tutoriel » et « comme le guide » sont
  dans les hypothèses.*
- **Le raccord simple en boîte** : ton tutoriel (« SIMPLE droit, souvent dans boîte, sauf l'EN 3645 qui s'utilise
  sans raccord »). Volta a l'option « dans une boîte » ; il y met, pour l'EN 3646, le « serre-câble (A) » de ta table
  CHOIX (NSA938150-03 droit, -01 coudé) : est-ce bien lui ? Et pour l'EN 2997 ?
- **Le Z de l'EN 3645** : ta codification dit aluminium nickelé ; chez Amphenol, Z est un zinc-nickel noir.
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

### 24. L'atténuation des lignes coaxiales

- **Ce que c'est.** Ton guide : « Définir le type de câble d'une ligne coaxiale qui garantisse une atténuation
  inférieure à la valeur donnée pour l'équipement — la somme des atténuations en dB de chaque élément de la ligne
  (coupures, connecteurs, composants) à la fréquence d'utilisation de l'équipement ».
- **Pourquoi.** Volta ne le calcule pas encore : il lui manque les données.
- **Comment me les donner.** L'atténuation de chaque câble coaxial par fréquence (dB/m), celle d'une coupure et d'un
  connecteur (dB), et pour chaque équipement sa fréquence et l'atténuation maximale :

  ```
  Câble;Fréquence (MHz);Atténuation (dB/m)
  KX;400;0,25
  Équipement;Fréquence (MHz);Atténuation max (dB)
  110AN1;118;3
  ```

---

*Ce document est aussi dans le dépôt : `CE-QUI-MANQUE.md`. Chaque donnée reçue fait disparaître une ligne « à
confirmer » ou « manque » dans les fiches.*
