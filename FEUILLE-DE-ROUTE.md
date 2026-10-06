# Feuille de route — ce qui vient, et ce qu'il me faut pour le faire

L'outil sait aujourd'hui : dessiner les folios, poser chaque fil d'une
barrette dans un module (ASNE 0599, NSA937901), chaque fil d'un connecteur
ou d'une prise dans un arrangement (EN 4165, EN 2997, EN 3646, EN 3645,
ASNE0059), et juger la jauge par la taille du contact. Ce qui suit se
branche dessus, une couche après l'autre, chacune avec son document.

Principe pour chaque couche : **le document entre tel quel** (PDF transcrit
en CSV dans `normes/`, ou tableau Excel lu par le nom de ses colonnes), une
**règle** le lit, et la **fiche** de chaque bloc dit le résultat en une
ligne (conforme / à voir / problème) et le pourquoi en une phrase.

## 1. Les contacts acceptés, norme par norme

Ce qu'il me faut : pour chaque norme, chaque taille de contact, la liste des
références de contact (EN 3155-xxx…) et pour chacune la plage de jauge, et
le type de fil (cuivre, aluminium) si ça compte.

Format le plus simple : un tableau `Norme ; Taille ; Contact ; Jauge min ;
Jauge max ; Note`. L'outil le lit déjà presque : il remplacera les plages
« usuelles, à confirmer » d'aujourd'hui, et la fiche donnera la référence
du contact à sertir pour chaque fil.

## 2. Le calibre des disjoncteurs

Ce qu'il me faut : la courbe (ou la table) de la norme — courant consommé
→ calibre — et, dans l'Excel du contrat, une colonne « consommation » (A ou
W) par équipement alimenté et le repère du disjoncteur qui l'alimente.

Ce que l'outil fera : pour chaque disjoncteur, la somme de ce qu'il
alimente, le calibre que la courbe donne, et un verdict si le calibre posé
diffère. Puis, en retour, le fil en aval doit supporter ce calibre (§ 4).

## 3. La chute en ligne

Le mécanisme existe déjà (simulation des barrettes : résistance linéique
× longueur + résistance de contact, comparée à la chute admise du réseau).
Ce qu'il me faut : les vraies tables de résistance par type et jauge de fil,
la chute admise par réseau, et une longueur par fil (colonne de l'Excel, ou
une longueur par défaut par route).

## 4. L'intensité admissible

Même mécanisme : intensité du fil seul par type et jauge, facteurs de
déclassement (faisceau, température, altitude…), comparée au courant du
fil — celui de l'équipement, ou le calibre du disjoncteur en amont.
Ce qu'il me faut : la table de la norme de câblage et ses déclassements.

## 5. Raccords, cheminées, colliers d'identification

Ce qu'il me faut : pour chaque famille de connecteur, la table qui donne,
selon la taille du boîtier et le diamètre du faisceau, le raccord arrière,
la cheminée, le collier — les macros Excel aussi : je relirai leur logique
et je la réécrirai dans l'outil.

Ce que l'outil fera : sur la fiche d'un connecteur, une section
« Accessoires » avec chaque référence et la raison de son choix
(« faisceau de 6,2 mm → raccord taille 14 »).

## 6. S'inspirer des anciens contrats (la grande base)

C'est le gros morceau. Ce que je propose, en trois temps.

**a. Ranger l'historique.** Chaque ancienne machine devient un « contrat de
référence » : ses liaisons (de où à où, de pin à pin, fil, type, connecteur),
lues avec le même lecteur que l'Excel du contrat. Rien n'est mélangé : on
garde la machine d'origine sur chaque ligne.

**b. Comparer.** Pour notre contrat, l'outil cherche, équipement par
équipement, les machines où le même équipement (même repère, ou même part
number, ou même nature reliée aux mêmes voisins) existe, et mesure la
ressemblance : mêmes bornes utilisées, mêmes destinations, mêmes types de
fil. Il en sort un classement : « l'installation la plus proche pour
300XC1 est la machine X (92 % des liaisons identiques) ».

**c. Proposer, jamais imposer.** Sur la fiche d'un équipement, une section
« Déjà fait » :
- ce que les machines proches ont fait et que notre contrat ne dit pas
  (un relais en plus, une plaquette éclairante, une boîte) — à ajouter d'un
  clic ;
- ce qui diffère (un autre connecteur, une autre jauge, un autre contact) —
  avec le choix « garder notre contrat » ou « reprendre comme machine X » ;
- et, quoi qu'on reprenne, le passage de toutes les règles (contacts,
  jauges, intensité, chute, raccords) : on se cale sur l'existant, mais
  l'outil vérifie que l'existant est conforme.

Ce qu'il me faut pour commencer : un extrait de cette grande base (quelques
machines, données rendues anonymes si besoin), dans son format réel. Je
construis d'abord la lecture et la comparaison, je te montre le classement
sur un équipement que tu connais bien, et on ajuste les critères de
ressemblance ensemble avant d'aller plus loin.

## Ordre proposé

1. Contacts par norme (petit, débloque la suite).
2. Intensité admissible et chute en ligne (le mécanisme existe).
3. Disjoncteurs.
4. Raccords, cheminées, colliers.
5. L'historique : lecture, comparaison, puis propositions.
