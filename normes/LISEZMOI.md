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

## `asne0599.csv` : les barrettes, ce sont les modules ASNE 0599

Les barrettes ne se proposent plus qu'en **modules de jonction ASNE 0599**
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
