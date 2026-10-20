# Ce qui manque à Volta pour être juste et complet

*Octobre 2026. Tu m'as demandé la liste de ce qui me manque. La voici, de la plus utile à la moins utile.*

Pour chaque donnée : ce que c'est, pourquoi Volta en a besoin, ce qu'il fait en attendant, et la forme sous laquelle
me la donner. La forme, c'est un Excel ou un CSV avec **ces en-têtes-là** (l'ordre des colonnes ne compte pas). Tu peux
me l'envoyer, ou le déposer toi-même : ⋮ → Vos fichiers → Normes (Volta montre ce qu'il lit avant de l'adopter). Trois
lignes d'exemple suffisent pour que je voie le format ; donne-moi ensuite le tout. Dans les exemples ci-dessous, les
valeurs montrent la forme, pas des données : « … » marque ce que toi seul connais.

Rien de ce qui suit n'est inventé dans Volta : ce qu'il ne sait pas, il le dit (« à confirmer », « manque »).

---

## Ce que la version 72 attend de toi (20 octobre 2026, le soir)

Tu m'as demandé : « Tu as pu vérifier si toute notre base SEE est correcte et cohérente ? Elle apporte quoi de plus que
les photos ? Tout est correct ? Les contacts, tyrap… ? Tout ? »

- **Ta base SEE, je ne la vois pas, et c'est voulu : elle reste sur ton PC.** Volta la vérifie donc chez toi. Dépose
  l'Excel de SEE : l'onglet **Cohérence** passe chaque ligne au crible de 36 contrôles (sexe contre la référence,
  taille contre la cavité, câble contre le fût, référence EN 3155 qui existe, faces qui se chevauchent, nombre de
  contacts contre la désignation, câbles plus fins que leur conducteur…). Les lignes impossibles sont écartées, les
  douteuses prises et signalées. **« Copier le rapport de cohérence »** donne un texte qui ne contient que des
  références de catalogue et des comptes : ni ton plan, ni le nom du classeur, les programmes deviennent
  « programme A ». **Envoie-le-moi** : c'est ce qui me permettra de te répondre « tout est correct » ou « voici ce qui
  cloche ».
- **Ce que la base apporte de plus que les photos** : l'onglet le dit, sous « Ce que la base apporte ». Les quatre
  tables de tes photos (EN 2997, 3645, 3646, 4165) y sont comparées ligne par ligne à la base, avec la version de la
  règle dans SEE. Suivent les familles de contacts, les câbles, les faces, les références de connecteurs et
  d'équipements, les paires fiche ↔ embase et les programmes que Volta n'avait pas. Les tyraps sont comptés et
  comparés à la table Colliers ; Volta ne sait pas encore les juger.
- **Les tables de Volta passées aux mêmes contrôles** (les 442 lignes de contacts de tes photos, les 226 câbles) : aucune
  ligne écartée. Seules remarques : 10 noms de contacts courts (KB1600…) que SEE écrit en entier, et 8 clés d'un seul
  sexe.
- **Chaque valeur des tables dit d'où elle vient**, sur la fiche, par un repère de 7 px et sa bulle. Le repère plein
  signale une valeur vérifiée par deux sources ou plus (la bulle les nomme). Le demi-repère signale tes tables. Un anneau
  ambre signale une valeur à confirmer, et la bulle dit pourquoi.

| table | vérifié | déduit | à confirmer | tes tables (sans statut) |
|---|---|---|---|---|
| contacts | 329 | 7 | 130 | 0 |
| câbles | 108 | 0 | 118 | 0 |
| faces des modules | 162 | 0 | 140 | 0 |
| colliers (tyraps) | 16 | 0 | 5 | 0 |
| familles de câbles | 25 | 0 | 16 | 0 |
| familles de disjoncteurs | 9 | 0 | 17 | 0 |
| calibrations | 8 | 3 | 31 | 0 |
| chutes des disjoncteurs | 25 | 0 | 54 | 13 (ton atelier) |
| points de courbe | 0 | 8 | 298 | 189 (tes ETA483) |
| déclassements | 6 | 0 | 49 | 0 |
| fils EN 2853 | 0 | 0 | 14 | 0 |
| protections | 11 | 0 | 0 | 0 |

  Une valeur était fausse et a été corrigée : **6TC et MS14154 vont de 1 à 20 A** (MS14154D, Sensata), pas jusqu'à 35 A.
  Où les sources ne s'accordent pas, le statut le dit. À 2 In, la courbe 2TC −54 °C donne 66 s, alors que sa propre
  table de calibration dit 35 s au plus.

- **Visio, dans les deux sens** :
  - « Lire un schéma Visio » (⋮ › Plus) lit les liaisons borne à borne, avec une relecture comme pour le PDF.
  - « Les folios en Visio » (⋮ › Exporter) écrit un .vsdx, une page par folio. Volta le relit à 100 %, et il respecte
    le schéma MS-VSDX.
  - **Ce que je n'ai pas pu faire : l'ouvrir dans le vrai Visio.** Ouvre un .vsdx exporté et dis-moi ce qui ne va pas.
  - Si tu peux, donne-moi un .vsdx de chez vous **sans données réelles** (un folio d'essai), pour voir comment vos
    formes sont faites.
- **PDF ↔ Excel** :
  - PDF → Excel : un PDF de schéma se lit en retest (⋮ › Plus › Lire un PDF de schéma).
  - Excel → PDF : « Le dossier en PDF » (⋮ › Exporter) écrit tous les folios en A3 avec leur cartouche, une page de
    garde et la nomenclature. Volta relit ce PDF à 100 %.
- **Le grand retest de tous les contrats** (mesuré sur 100 068 lignes) :
  - la base est prête en 2,2 s au lieu de 11,6 s, et la page ne se fige plus que 0,13 s au plus ;
  - chercher dans toute la base prend 8 à 15 ms ;
  - un contrat s'ouvre d'un clic en moins d'une seconde ;
  - « Comparer au déjà-fait » (⋮) compare le plan ouvert à toute la base en 0,14 s ;
  - convertir 17 contrats en retests corrigés prend 0,5 s. En dossiers PDF, c'est encore lent : 9 à 11 s par contrat
    de 4 folios.
  - **À essayer sur ta vraie base** : dis-moi les temps que tu vois.

Toujours ouvertes : la masse et la hauteur des modules E0599 de taille 20 (ta table : 17,0 g et 22,5 mm ; Air LB :
8,5 g et 19 mm), et s'il faut une ligne 16 AWG en taille 12 de l'EN 2997 et de l'EN 3646.

---

## Tes réponses du 20 octobre 2026 (version 72)

- **Quand SEE contredit une ligne que les sources ont vérifiée, la source gagne.** Une ligne de Volta « vérifié » (deux
  sources indépendantes, sa colonne Statut et sa note les citent) reste, même base SEE gardée ; la valeur de SEE est
  barrée dans l'onglet Import, avec une pastille verte « la source vérifiée garde Volta · à corriger dans SEE » (sa
  bulle dit d'où vient la valeur de Volta), et la fiche le dit (« SEE dit autre chose… »). Un chiffre de SEE
  **impossible pour sa jauge** ne passe jamais (DR6 à 2,08 g/m). Partout ailleurs, SEE gagne comme avant.
- **La classe Z de l'EN 3645 : zinc-nickel noir**, raccord Z (MIL-DTL-38999 série III et EN 3660-001, deux sources).
- **Tes disjoncteurs sont tous des E-T-A 4120** : un part number inconnu prend la chute de la 4120 (1,1 V à 1 A) ; ses
  courbes sont celles de ton Excel (ETA483) à ±2 %.
- **La règle du programme, c'est 2 V, rien d'autre** : Volta l'applique partout, pointes comprises (voir le point 4).
- **Les profils de charge et les longueurs, c'est toi** : 5 m par défaut tant qu'une longueur manque.
- **La cavité « −1 »** : l'onglet Import la raconte maintenant (ses règles, ses contacts, ses types et gauges de fil,
  comptés). Une photo de ce bloc me suffit pour savoir ce qu'elle veut dire chez vous — rien de ton plan n'y figure.
- **La taille 22 de l'EN 2997** (haute densité) entre dans les contacts : EN3155-078M2222 / -079F2222, 26 à 22 AWG.
- **Le retest pour un premier essai** : colonnes B, C, I, J (Device1, Pin1, Device2, Pin2) suffisent ; avec F (le
  câble), D et K (les références), M (le folio) et N (la longueur en mm), Volta juge tout. En-têtes en ligne 4 comme
  dans tes retests, dans n'importe quel ordre. Le modèle « Modele-retest-Volta.xlsx » montre les seize colonnes A à P.

---

## La passe de corroboration (19 octobre 2026, version 71)

Tu m'as demandé : « regarde sur Internet, avec d'autres sources, et prends la vraie — SEE peut se tromper, Volta aussi ».
Les quelque 300 lignes douteuses de Volta ont été recoupées sur des sources **publiques** (les normes MIL qui reproduisent
les EN, les catalogues Glenair, Amphenol, Souriau, TE, Sensata, E-T-A, Lynxeo/Nexans, Prysmian/Draka, la FAA), deux
sources indépendantes quand il y en avait. Chaque ligne corrigée dit sa source dans sa note. Aucune recherche n'a porté
sur ta base, ton programme ou ton appareil.

**Où SEE se trompe (les sources le prouvent)**
- **Les noms des contacts** : SEE perd la casse (C et c). MIL-STD-1560 / 1669 les distinguent — Volta 70 les remet.
- **Le DR6 à 2,08 g/m** : c'est la masse du DR26 ; le cuivre seul d'un 6 AWG pèse 118 g/m. 135 g/m (Lynxeo et Prysmian).
- **Un contact taille 20 dans une cavité 22** (EN 4165, câble YYBKW) : il n'y entre pas — EN3155-008M2222.
- **La douille M39029/27-210 face à la broche /28-409** (KC, EN 4165) : elles ne s'accouplent pas ; la paire est /27-402.
- **L'EN 3155-066** (douille taille 8, fût 10) est **retirée**, remplacée par l'EN 3155-083 (EN3155-083F0810).

**Où Volta se trompait (corrigé en version 71)**
- **Les faces** : relues sur les tables X/Y de MIL-STD-1560C (EN 3645), 1669A (EN 3646, ASNE 0059) et 1554A
  (EN 2997) — 72 lignes. La 25-7 a 99 contacts (1 à 99, les taille 8 en 25 et 75) ; la 25-4 va jusqu'à LL ; l'EN 2997 est
  numérotée comme MIL-STD-1554 (14-12 : les #16 en 4, 7, 10 ; 20-28 : les #12 en 15, 19, 23, 27…) ; l'EN 4165 99-10 a
  8 contacts taille 20 (pas 22) et 2 taille 16.
- **Les câbles** : DW24 / DW22, GPB24 / GPB22 (des copies de jauge), MLA12, AD6, DG6, DG00, YV3, les ADB à ADD et VNB à
  VND (1,03 × AD), WS, XE, XF, XK, WH, KC blindés (une tresse), XY est un **coaxial** 75 Ω (RG 179), WL, WM, WN, WF, WW,
  HE, KD, KL. La colonne Note de la base des câbles n'était pas lue : elle l'est.
- **Les disjoncteurs** : la fiche E-T-A 4120 (enfin trouvée, PDF vectoriel) confirme les courbes ETA483 à ±2 % ; la ligne
  4120 était rangée dans la mauvaise table ; le MS3320 s'arrête à 20 A (pas 25) ; les masses Sensata ; deux familles
  ajoutées (MS25244 non compensé, jugé sur l'enveloppe de sa feuille MS, et 7277) ; une courbe partielle ne se
  prolonge plus au-delà de ses points (la 7274 à 71 °C déclenchait en 0,27 s à 2 In).
- **Les contacts** : les EN 2997 -018/-019 sont vérifiés (Souriau, TE), la taille 23 est publiée (EN 3155-003 et
  -008:2026), l'outillage et les obturateurs EN 2997 / EN 3646 / EN 4165 sont renseignés (TE).
- **Les raccords** : la cheminée EN 4165-015 a son passage (Ø 9,45 mm, TE) — Volta juge le toron ; les plages Glenair
  série 36 et les cotes M85049/38 sont vérifiées ; « Dmax boîtier » est le Ø de l'écrou Glenair, pas du boîtier.
- **111 lignes** perdaient la fin de leur note (un « ; » la coupait) : recollées, et un contrôle l'empêche désormais.

**Ce que Volta fait de plus à l'import SEE** : un écart **impossible pour la jauge** (sous le métal seul, sous un cuivre
pur) se signale même sur un câble que Volta ne connaît pas, et ne passe jamais ; une face qui change la **taille d'un
contact** le dit contact par contact. Depuis la version 72, une ligne que **deux sources ont vérifiée** reste celle de
Volta (la source gagne, à corriger dans SEE) ; partout ailleurs, SEE gagne.

**Ce qui reste ouvert (aucune source publique)** : les références Airbus et Airbus Helicopters (ASNE 0613 KB/LB/KC/LC,
E0546/E0547, E0824/E0825, E0848, ECS…, ABS1496, NSA938171/172), les familles de câbles AM, LE, WC, WG, WK, WP, XD, KQ,
KR, ADE, BN, DH ; les faces propres aux EN (EN 3645 09-01, 11-12, 13-26, 17-20, 19-12, 21-12 ; EN 3646 10-02, 16-21,
20-34, 22-36 ; EN 2997 08-06, 10-12, 12-21, 22-30) ; les paliers 2 s / 10 s / 1 min de l'EN 2853 ; la famille de
connecteurs des EN 3660-009 à -023 ; les NSA935401 (sauf le -10, vérifié en deuxième passe).

**La deuxième passe (20 octobre 2026, version 72).** Tu as demandé : « Tout est correct ? Les contacts, tyrap… ? Tout ? »
Chaque ligne qui n'avait pas de statut en a un maintenant, et il dit lequel des trois cas : **vérifié (deux sources : …)**,
**à confirmer (une source : …)** ou **à confirmer (non public : …)**. La note ou la colonne Source de la ligne nomme le
document. Aucune recherche n'a porté sur ta base, ton programme ou ton appareil.
- **Les contacts de tes tables (309 lignes sans statut)** : les 309 passent le contrôle (le sexe de la partie EN 3155, la
  taille, le fût contre la jauge du fil ou de sa famille de câble, l'alliage d'un thermocouple contre son fil).
  - **238 sont vérifiées** : la référence est citée par deux à quatre catalogues (Souriau 2014, TE, Tri-Star, Amphenol).
  - **67 n'ont qu'une source** : les coaxiaux et triaxiaux soudés (le titre EN dit la nature, la référence complète et
    son câble ne sont publiés nulle part), -018M1218 / -019F1218 (Souriau seul), -009F2022 (Amphenol seul), -065M0810**A**
    (le « A » final n'est dans aucun catalogue), les thermocouples M39029/89-495 et -496.
  - **4 sont non publiques** : les douilles thermocouples M39029/89-499 et -500, introuvables.
  - **Une erreur de catalogue, pas de Volta** : la table Amphenol p.13 inverse alumel et chromel sur les douilles
    M39029/88. Souriau 8D, Glenair 850-024 et WireMasters disent -483 et -487 alumel, -484 et -488 chromel, comme tes tables.
  - Les 59 références Airbus disent maintenant « (non public : …) ». Le manchon E0718, une pièce Airbus, n'est jamais
    public : la ligne le dit.
- **Les tyraps** : l'équivalent public de la NSA935401 est la **MS3367** (SAE AS33681). Ses plages sont écrites dans le
  titre de la table Colliers, par deux sources. Aucune source ne dit quelle NSA935401 répond à quelle MS3367 ; la note de
  chaque tyrap donne la classe la plus proche. **Le NSA935401-10 est vérifié** : 7,6 × 365 mm (Aviatec, RS), Ø max
  100 mm, 670 N (la HellermannTyton T150R). Volta le prend désormais pour un toron de 50 à 100 mm, avant le -08.
- **Les câbles** : les MLA, MLB et MLD (25 lignes) sont vérifiés, identiques chez Prysmian (FT 403) et dans le
  catalogue Nexans 2013 p. 42-43. Les familles Lynxeo / Nexans gardent une source : Prysmian n'en publie que la composition
  et la gamme. Les 34 câbles sans statut sont des familles non publiques.
- **Les faces** :
  - EN 2997 08-98, 10-05, 12-03, 14-07 sont vérifiées (MIL-STD-1554A et Souriau 853).
  - Les modules NSA937901 (22, 20, 16, 12, masse) sont identiques au dessin Air LB p. 38-39, qui est une seule source
    publique.
  - E0599 : les modules 1750 Air LB de taille 16 et 12 ont les mêmes groupes, la même masse et la même hauteur. **En
    taille 20, Air LB dit 8,5 g et 19 mm, ta table 17,0 g et 22,5 mm** : à relire dans l'ASNE 0599.
- **Deux corrections** :
  - La taille 12 de l'EN 2997 et de l'EN 3646 reçoit **16 à 12 AWG**, pas 14 à 12 : le contact standard
    EN3155-018M1212 / -019F1212, chez Souriau 853 et chez TE.
  - La taille 20 de l'EN 3545 reçoit **26 à 18 AWG**, car son fût 22 existe (Souriau, Tri-Star).
  - Tes tables de contacts n'ont pas de ligne 16 AWG sur un EN 2997 ou un EN 3646 de taille 12 : Volta le refuse
    encore. Ajoute la ligne si l'atelier le pose.
- **Vérifiés aussi** :
  - Les joints arrière EN 2997 16 et 12 (TE, guide lu en entier, et Souriau 853).
  - Onze courants de contact (Amphenol et TE).
  - L'EN 4165-014 (titres BSI et SIS).
  - Le rail NSA937901RB2000 (Souriau 8559 et Air LB).
- **La troisième passe (20 octobre 2026)** : les tables de disjoncteurs (courbes, calibrations, familles, chutes), les
  familles de câbles, les fils EN 2853 et les déclassements ont maintenant leur Source et leur Statut, que Volta lit.
  - **Restent « vos tables », sans statut** : les quatre courbes ETA483 (ta feuille Base_de_données, recoupée sur les
    fiches E-T-A 4120 et 483 à ±2 %) et les chutes de ton Excel (ATELIER, contacteur, diode, relais).
  - **Vérifiés par deux sources** :
    - 25 chutes de disjoncteur (MS3320N et Sensata 2TC, MS22073M et Sensata 7274) ;
    - 8 calibrations (Sensata 6TC et 7274 contre leurs feuilles MS) ;
    - 9 familles de disjoncteurs, dont l'AS33201 (½ à 25 A depuis la révision B) ;
    - 25 familles de câbles ;
    - 6 points de déclassement (les exemples écrits à la fois dans l'AC 43.13-1B et dans la MIL-W-5088L).
  - **Une seule source** : les autres points de courbe sont des tracés Sensata ou Crouzet, et les autres déclassements
    sont lus sur une figure de l'AC. Les paliers 2 s, 10 s et 1 min de l'EN 2853 n'ont aucune source publique.
  - **Corrigé** : les familles 6TC et MS14154 vont de 1 à 20 A (MS14154D, Sensata), pas jusqu'à 35 A, qui est la gamme
    du 9TC.
  - **Trois écarts entre sources, à garder en tête** :
    - à 2 A, 2,5 A et 3 A, la MS3320N et Sensata 2TC ne donnent pas la même chute ; Volta garde la valeur de la norme ;
    - à 2 In, la courbe 2TC −54 °C est plus lente que sa propre table de calibration ;
    - la table Sensata 6TC donne à 71 °C les valeurs que la ligne attribue à 90 °C et 121 °C.

**Ce que toi seul peux trancher** : la famille LE (fibre, pas coaxial à 2,84 g/m) ; si tes retests écrivent C et c
différemment ; la masse et la hauteur des modules E0599 de taille 20 ; s'il faut une ligne de contact 16 AWG en taille 12
pour l'EN 2997 et l'EN 3646. (Le sens de la cavité « −1 » : l'onglet Import le montre maintenant ; une ligne vérifiée
contre SEE : la source gagne, tu l'as dit le 20 octobre.)

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
  6. *Ce que le vrai classeur a dit (version 65, 22 feuilles).* Se relient d'eux-mêmes, à 100 % : les contacts à leur
     règle (le contact à sertir est PartNo1), les broches et les arrangements (un arrangement de SEE est un
     ContactLayout), le câble à ses conducteurs (EED_LNK_Wires_Equi), la fiche à son embase, les accessoires et les
     additifs à leur pièce. Trois surprises : le renvoi d'un connecteur vers son arrangement (IDPlugMap) n'est rempli
     que sur moins de 1 % des connecteurs — Volta le retrouvera par la référence (sa codification) et par Capacity
     (« 61#0.518 » : 61 cavités de taille 20) ; les calibres des disjoncteurs ne sont pas dans SEE (Intensity_Nominal
     sur trois équipements) — la gamme et les courbes restent celles de Volta ; IDConnector d'EED_LNK_Connector_Additive
     ne mène à aucune feuille — une table manque. La version 66 montre les tables LNK_ et SET_ colonne par colonne sous
     les liens, une cible par feuille, la gauge AWG des sections en mm², et fond en une les deux écritures d'un même
     flottant (0.32574322630000002 = 0.3257432).
  7. *Ce que les feuilles une à une ont dit.* Les « ProductFamilies » de SEE sont les programmes (NH90COTS, EC225… :
     19 lignes), pas des familles de connecteurs : EED_LNK_EndFitting_ProductFamilies (ID, IDEquipment, une colonne
     vide) dit quelle pièce sert quel programme, comme la colonne EPFList des vues. Aucun identifiant ne relie une règle
     de contacts à ses connecteurs : c'est le NOM qui les relie — la règle porte la norme du connecteur
     (« E0710 - Plug/Square Receptacle », ASNE…), le connecteur la porte en tête de sa référence (EN2997SE62041AN). De
     même un connecteur rejoint son arrangement par sa codification (EN2997SE62041AN → l'arrangement EN2997 20-41 ;
     les ContactLayouts s'appellent EN3645_23N55, EN3646_18-11), que Volta sait déjà lire. Les calibres des
     disjoncteurs ne sont pas dans SEE (Intensity_Nominal et Intensity_Maximum sur moins de 1 % des équipements) ; les
     câbles portent Alpha (0,004 : le coefficient de température de la résistance) et leurs conducteurs Resistivity
     (Ω/m) et SectionInMM (en m²). L'import est donc écrivable ; il ne reste qu'à décider où Volta range ce qu'il
     prend (voir la question de la hiérarchie).
  8. *Le plan de l'import, table par table (colonnes vues sur le vrai classeur).*
     - Contacts : une ligne d'EED_OBJ_END_Fitting_Rules_Contact = IDEquipment (la règle) · ContactType (Male/Female) ·
       ContactGauge (la cavité, en mm²) · WireType (« * » = tout type) · WireGauge (en mm² ; −1 = toute gauge) ·
       PartNo1 (le contact, EN3155-…) et sa Quantity1 · PartNo2 à 5 (ce qui va avec) et leurs quantités. La règle
       (EED_ViewEndFittingRules) donne PartNo (la norme du connecteur), ClassName, CableTypeList, LCStatusName.
     - Faces : EED_OBJ_PlugMapPin = IDPlugMap (l'arrangement) · Name · X, Y (en m) · ContactGauge · ContactFamily
       (Standard/Coax/Triax) · CablingOrder ; EED_OBJ_DEF_PlugMap = Type, View, DesiredPinsCount ; le nom de
       l'arrangement est le PartNo d'EED_ViewContactLayouts (EN3645_23N55).
     - Câbles : EED_ViewCablesAndWires = PartNo · Type · Wire_Type · Gauge · ExternalMaxDiameter (m) · LineicWeight ·
       Shield · Twisted · TotalNumberOfWires · Alpha · TemperatureMini/Maxi ; leurs conducteurs par EED_LNK_Wires_Equi
       (IDEquipment → IDWire ; l'IDCable d'EED_OBJ_Wires n'est rempli qu'à 6 %) : Gauge · SectionInMM · Resistivity ·
       Color · WirePosition.
     - Connecteurs : EED_ViewConnectiveEquipments = PartNo · PartNoStandard1 · ConnectivityType (Plug/Receptacle) ·
       Gender · Type · ModularType · DesiredPinsCount · Capacity · SuppliedWithContact · ShuntCount ·
       TemperatureMini/Maxi ; la paire fiche ↔ embase par EED_LNK_Equi_Mating (IDSemiEqu, IDConnectedSemiEqu, Prefered).
     - Accessoires : EED_ViewAccessories = PartNo · AccessoriesType · AccessoriesSubcategory · BackshellType ·
       BackshellSize · Material · SurfaceTreatment : le catalogue y est ; le lien à un connecteur précis est rare
       (26 lignes d'EED_LNK_Equi_AccessoryMating).
     - Jamais pris : qui a fait quoi (CreatorUser, LastUser, …Workstation, …Role, …By), les dates.
- **Les autres voies, si celle-ci est fermée.** *Copier la grille* de SEE (Ctrl+A, Ctrl+C, coller dans le Bloc-notes
  pour voir si le texte suit) ; *le référent SEE*, qui peut tirer les mêmes vues en Excel. *Pas en photos* des lignes
  elles-mêmes : des milliers de lignes en photo, ce sont des erreurs de lecture et des jours de travail.
- **Où la mettre.** Jamais dans le dépôt GitHub, même passé en privé : c'est la base de ton programme. L'export reste sur ton PC, et tu le déposes dans
  Volta (⋮ → Vos fichiers → Normes) : Volta le lit sur place, hors ligne, rien ne sort. Demande d'abord à ta hiérarchie
  si tu as le droit d'en faire un export : c'est la base de ton programme.
- **Fait (version 67) : l'import.** Dépose l'Excel de SEE (n'importe où dans Volta, ou ⋮ → Vos fichiers → Normes →
  « Lire la base SEE… ») : l'onglet **Import** s'ouvre et dit ce que Volta prend — les contacts des règles validées
  (celles « In Work » à confirmer, les obsolètes ignorées), les câbles et la résistance de leurs conducteurs, les faces
  des arrangements à l'échelle, chaque référence de connecteur et d'équipement (désignation, fiche ou embase, ce qui
  s'y accouple, programmes, statut) —, puis **ce qui change dans Volta**, ligne par ligne (ce que disait Volta barré, ce
  que dit SEE en gras), ce qui n'est pas pris et pourquoi, et le plan ouvert face à la base (par famille, en nombre).
  « **Garder dans Volta** » la garde sur ce PC ; elle revient à chaque ouverture ; « Oublier la base SEE » l'efface.
  **Mon programme** (EC225, NH90…, ou tous) : la fiche d'un équipement dit ce que SEE sait de sa référence, et si elle
  est absente de SEE, obsolète, ou pas déclarée pour ton programme ; un contact ou un câble que SEE a changé porte la
  marque « SEE » et, dans sa bulle, ce que disait Volta. **La première fois sur ta vraie base, photographie l'onglet
  Import** : c'est lui qui dira si les familles des règles et les noms des arrangements se rattachent bien.
- **Lu sur ta vraie base (19 octobre 2026, tes photos de l'onglet Import, v68).** Les rattachements tiennent : 4 216
  contacts (278 familles, 439 règles validées, 24 en cours), 615 câbles, 225 faces (7 familles), 13 042 références
  (5 950 connecteurs, 7 092 équipements, 5 803 paires fiche ↔ embase) ; 808 règles obsolètes écartées. Ce qui change
  dans Volta est sain pour les contacts (34 lignes : des révisions EN3155-…AB → …AC, des noms écrits en entier
  KB0800 → E0613KB0800, et ce qui va avec que Volta n'avait pas : E0718-20-30, EN4530-004S/L). Quatre défauts de
  l'import, **corrigés en version 69** :
  · **une case vide de SEE effaçait Volta** — « nature : torsadé → — » sur des dizaines de câbles (SEE ne nomme la
    nature que d'un coaxial, d'un twinax, d'une fibre) ; de même les brins d'un câble sans conducteur relié (31 dans
    ta base), le blindage quand la colonne est vide. Désormais SEE gagne sur ce qu'il dit, et ce qu'il laisse vide,
    Volta le garde (la note de la ligne le dit) ;
  · **un écart d'un facteur 2 ou plus se voit en tête, en ambre** (« 65 fois moins · à vérifier dans SEE ») :
    **DR6 : 135 g/m chez Volta (vérifié sur la fiche Lynxeo), 2,08 g/m dans SEE** — c'est la masse d'un 26 AWG, pas
    d'un 6 : une erreur de saisie dans SEE, à faire corriger par ton référent. SEE gagne quand même ;
  · **les faces** : « relevée sur la figure → à l'échelle de SEE » s'écrivait sur les 145 lignes ; c'est vrai de toutes,
    c'est dit une fois (« redessinée à l'échelle, mêmes contacts »). Restent les vraies différences : le compte (EN 3645
    25N07 : 89 → 99 contacts), les tailles (EN 2997 20-28 : + #22), et surtout **les noms des contacts des EN 3645 et
    EN 3646**, qui diffèrent sur presque toutes leurs faces (pas sur les EN 2997, numérotées) : l'onglet montre
    maintenant LESQUELS (ceux que seul Volta a → ceux que seul SEE a). **Re-photographie cette partie** : si SEE
    écrit autrement les minuscules (a, b… de la 38999) ou saute d'autres lettres, c'est lui qui a raison, et c'est ce
    que tes retests écrivent ;
  · **431 lignes « à taille de cavité ou sexe illisible »** : Volta lit maintenant aussi « Pin » (mâle) et « Socket »
    (femelle), et montre les valeurs qu'il ne lit pas, les six plus fréquentes. **Re-photographie cette ligne** de
    « Ce qui n'est pas pris » : je saurai quoi lire.
  **Relu sur la v69 (19 octobre 2026, tes photos) — corrigé en version 70.** Les noms : **SEE écrit un nom de contact
  sans sa casse, la même pour toute la base — c, e, f, k, m, w, z en minuscules, toutes les autres lettres en
  majuscules** (EN 3646 18-11 : « A B c D e f G H J k L » pour A…L ; sur une 23N55, C et c portent tous deux « c »).
  SEE ne distingue donc pas C de c : Volta reprend les noms de la norme, aux places de SEE, et quand deux contacts
  partagent la lettre (C et c), c'est la place qui tranche (C au bord, c au milieu). Une face où deux contacts gardent
  quand même un même nom reste celle de Volta (dit dans l'onglet). Les vraies différences restent : EN 3645 25N07, 99
  contacts numérotés 1 à 99 dans SEE (89 chez Volta, relevés sur la figure, avec A et B) ; 25N04 : KK et LL ; EN 2997
  20-28 : des #22. Les tailles : **les 431 lignes « illisibles » ont toutes une cavité −1** — comme la gauge −1 (toute
  gauge), c'est **toute taille** : la règle vaut pour chaque cavité de la famille, après celles de la taille exacte.
  **Une question pour toi** : sur un de tes retests réels, un connecteur EN 3645 ou EN 3646 — la broche C est-elle
  écrite « C » ou « c » ? Volta suit la norme (C) ; si tes retests suivent SEE (c), dis-le moi, il les lira tels
  quels.
  Et une question tranchée par SEE : **LE** est un **coaxial** (ton Excel le donnait deux fois, fibre optique puis
  coaxial ; Volta avait gardé fibre optique, à confirmer). **Ne clique « Garder dans Volta » que dans la v70** :
  ouvre-la, redépose le classeur, relis l'onglet Import, puis garde-le.
- **Décidé (octobre 2026).** Volta peut garder la base SEE sur le PC (dans ce navigateur, jamais ailleurs, avec un
  bouton pour l'oublier). SEE gagne toujours sur les tables de Volta, et chaque différence se voit : ce que disait
  Volta, ce que dit SEE, côte à côte. Les tables tirées des photos (contacts EN2997, EN3645, EN3646, EN4165) et
  cables.csv restent en secours quand aucune base SEE n'est déposée.
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

- **Réglé en octobre 2026 (version 71).** La fiche E-T-A 4120 a été trouvée en PDF vectoriel (Issue C) : ses courbes
  sont celles de ton Excel (ETA483) à ±2 %. Les éditions récentes de la 4120 et de la 483 mettent l'asymptote à 125 °C
  à 1,00 In au lieu de 0,93 : Volta garde 0,93, plus prudent pour le déclenchement intempestif.
- **Réglé le 20 octobre 2026 (version 72).** Tes disjoncteurs sont tous des 4120 : la 4120 est la famille par défaut
  (à 1 A : 1,1 V de chute au lieu des 0,75 V de la 483). Volta choisit le calibre sur la courbe la plus rapide (125 °C),
  la plus prudente pour le déclenchement intempestif — si ton Excel « 01 - Calibre disjoncteur » en prend une autre
  (onglet Programme), une photo suffit.

### 2. La nomenclature des disjoncteurs

- **Ce que c'est.** Les part numbers que vous posez vraiment (MS3320, Klixon 2TC, E-T-A 483, Crouzet 84 406…), leur
  famille et les calibres que vous achetez.
- **Pourquoi.** La famille donne la gamme, la courbe, ce que le disjoncteur garantit à chaud et sa chute propre. Le
  meilleur calibre se cherche dans cette gamme.
- **Réglé le 20 octobre 2026 : tous des E-T-A 4120.** Volta reconnaît une vingtaine de familles (table Familles de
  disjoncteurs) et ta liste « 1, 3, 5, 7,5, 10, 15, 20, 25 A » ; un part number inconnu est une 4120 (sa chute, ses
  courbes). Le tableau ci-dessous ne sert que si un jour vous en posez d'autres.
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
- **Tranché le 20 octobre 2026 : « c'est 2 volts, c'est tout ce que je sais ».** Volta garde 2 V partout (4 V en
  triphasé), pointes comprises, et ses choix prudents ci-dessous ; ce qui suit n'est plus une question, seulement ce
  qu'il faut savoir si un jour quelqu'un vous le demande.
  - Une **pointe brève** (60 A pendant 3 s) n'a pas droit à plus que 2 V : 207CB7 dépasse en pointe.
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
- **En attendant.** 5 m par câble (une hypothèse, dite partout « hyp. » — tu l'as validée le 20 octobre 2026). Tu peux écrire une longueur sur la fiche du
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

- **Tranchés par les sources (version 71)**, chacun avec sa source dans sa note — et depuis la version 72, la source
  gagne aussi contre ta base SEE gardée : 1 (YYBKW : un contact taille 20 n'entre pas dans une cavité 22 → EN3155-008M2222), 2 (le manchon du WW 20 des
  deux côtés), 3 (KC : la douille de la broche /28-409 est la /27-402), 4 et 5 (l'EN 3155-066 est retirée → EN3155-083F0810),
  7 (la douille d'un YY 22 vient de la ligne F 20 * 22), 10 (EN 2997 classe S : juste pour un 200 °C ; un 260 °C prend
  les -004/-005).
- **Ce qui reste, à toi** : 6 (les quadrax ECS0754 : un choix du programme — l'équivalent EN public est l'EN3155-074 /
  -075), 8 (EN 3646, une douille taille 12 en 10 AWG, ECS0746F1210, sans broche en face), 9 (E0848 : le contact à
  sertir est-il l'EN 3155 de la colonne Accessoire ?), 11 (quel contact pour le câble aluminium ?).
- **Comment me les donner.** Une ligne par point : `Point;Réponse`.

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

- **Réglé en octobre 2026 (version 71)** par le catalogue TE DMC-M (la norme reste payante) : la ronde EN 4165-015
  (EN4165F15 / W15) a un passage de Ø 9,45 mm au moins — Volta juge le toron de chaque module. La double ovale -016
  (largeur intérieure 8,87 mm) et l'obturateur -017 sont dans la note de la ligne ; Volta pose une ronde par module.

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
- **Les obturateurs de cavité de l'EN 2997, de l'EN 3646 et de l'EN 4165** : réglé en version 71 avec les références
  TE (006-0893-20 rouge, -16 bleu, 006-0892-12 jaune ; 028-0102-22 pour l'EN 4165). Reste à savoir si ton atelier pose
  ceux-là ou une référence EN 4529.
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

- **Recoupé en octobre 2026 (version 71).** Tes intensités continues tiennent face à la FAA (AC 43.13-1B fig. 11-4, à
  ±10 %) et aux exemples chiffrés du MIL-W-5088L (±8 %) ; le 12 AWG à 35 A et le 8 AWG à 68 A sont dans la tolérance.
- **Ce qui reste.** Les paliers **2 s, 10 s et 1 min** (table 1) n'ont aucune source publique : une photo des pages 14 et
  16 de ton EN 2853 suffit.

### 22. Les lignes douteuses de la base des câbles

- **Corrigé en octobre 2026 (version 71)**, la source dans chaque note : DW24 et DW22, GPB24 et GPB22, MLA12, AD6, DG6,
  DG00, YV3, les ADB à ADD et VNB à VND, les coaxiaux blindés, XY (un coaxial). YV est confirmé ligne à ligne.
- **Ce qui reste, sans source publique** : AM (une norme ?), LE (une fibre, pas un coaxial à 2,84 g/m — laquelle ?),
  KQ24 (sa résistance de 145 mΩ/m est trop haute pour un 24 AWG cuivre : jauge ou matière ?), KR24 (un octax : quelle
  norme ?), WC, WG, WK, WP, XD, ADE (absent de l'ABS 1354), BN (Ø et résistance), DH (la fiche ECS 0844). Et les
  familles **DK, DL et DM** que SEE connaît et pas ton Excel.
- **Comment me les donner.** L'export Cables and Wires de SEE (Volta le juge à l'import), ou la fiche du câble.

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
