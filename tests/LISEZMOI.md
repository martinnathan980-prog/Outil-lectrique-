# Contrôle de l'outil

## Lancer

```
node tests/controle.js         les invariants, le contrat d'essai, la base de retest, les pièges déjà tombés
node tests/memoire.js          le travail survit-il à la fermeture de l'onglet
node tests/format-retest.js    les seize colonnes sont lues par leur nom
node tests/banc-placement.js   combien de fils sortent droits, et sur quelle feuille ; les six folios de l'exemple relus
node tests/barrettes.js        la bible des barrettes se lit, la référence se choisit, les connecteurs se lisent ; la norme se lit,
                               chaque fil va dans son trou, la simulation donne des valeurs connues à la main (sans navigateur)
```

Tous acceptent `--fichier=chemin` pour mesurer un autre fichier que
`index.html` (c'est ainsi qu'on a tenu la parité avec l'ancien moteur pendant
la refonte). `controle.js` et `memoire.js` rendent 1 en cas d'échec, pour
qu'un enchaînement s'arrête ; `banc-placement.js` est une MESURE et non un
contrôle — il chiffre, avec `--json` pour comparer deux versions — et ne rend
1 que si un invariant sacré est violé ou qu'un contrôle exact échoue.

Il faut Playwright et un Chromium :

```
NODE_PATH=/opt/node22/lib/node_modules node tests/controle.js
```

`tests/pilote.js` est le seul endroit qui sait parler à la page : trois
verbes (charger, essai, mesurer) sur l'API `atelier` de `src/10-demarrage.js`.

## Le contrat de la refonte

Avant de toucher au moteur, on relance le banc ; après, on le relance. Les
chiffres de référence sur les vingt et une topologies (quinze historiques
et les six folios de l'exemple ; un piquage qui tranche un fil compte
comme un croisement), depuis que plus aucun fil ne fait de marche :

    85,0 % de fils droits · 28 croisements · 0 évitable · 0 violation · 0 cas hors feuille
    contrat d'essai : 66,7 %, 0 croisement
    folio 1 : 75 %, 1 · folio 2 : 63,2 %, 1 · folio 3 : 73,2 %, 10 — paysage (1,33)
    folio 4 : 53,8 %, 7 · folio 5 : 76,3 %, 5 · folio 6 : 81,3 %, 4 — portrait (0,88)
    partout : 0 tour, 0 segment partagé, 0 marche

AUTOUR D'UN HUB, UN BLOC CHANGE DE COLONNE SANS ÊTRE REBÂTI
(`changementsDeColonne`) : il garde la géométrie polie du meilleur (chaque
borne son ordonnée), entre dans sa nouvelle pile par le creux le plus proche
ou en la poussant, et se juge au routage complet ; une colonne qui existe ou
une neuve au bord, jamais entre deux ; à côté d'un partenaire, de son côté du
hub, jamais dans la colonne du hub ; aucun fil droit sacrifié, une
lisibilité strictement meilleure. Avant, le candidat était rebâti de zéro
par le solveur et perdait toujours contre un meilleur poli : le folio 3
gardait deux équipements et un morceau de barrette au-dessus de son
calculateur. Sans hub, l'ancien geste (rebâti) reste : c'est lui qui trouve
le bloc à déplacer sur la boucle et la réglette traversante. Le juge compte
aussi les ESCALIERS (chaque paire d'angles au-delà d'un Z, un croisement
chacune) et les blocs SOUS LE HUB (dans sa colonne, trois chacun). Folio 3
71,4 % / 18 → 73,2 % / 10 (391LP1 à droite de ses relais, 397TB1 devant
ses pompes), folio 6 84,4 % / 4 → 81,3 % / 4 (portrait, les deux
calculateurs face à face, les lampes entre eux) ; l'ensemble 85,0 % / 36 →
85,0 % / 28. Le morceau 668VT31 (8, 9, 10) reste au-dessus du calculateur :
dans la colonne des relais, il fait faire le tour de la feuille à son fil
d'alimentation (contours 7,6, le juge le refuse à raison).

UN GROS ÉQUIPEMENT S'ÉTIRE À LA HAUTEUR DE SES PARTENAIRES (`etirements`,
HUB_MIN = 8 bornes sur un flanc) : chaque borne prend l'ordonnée de son
partenaire, les connecteurs se rangent d'un seul tenant par la hauteur
moyenne de leurs bornes, le corps se referme dessus, les voisins de la pile
s'écartent ; un tel bloc n'est pas compté « étiré ». C'est ce qu'un câbleur
fait d'un calculateur, et ce que le lecteur a demandé en voyant 300XC1 :
folio 3 60,7 % → 71,4 %, folio 6 37,5 % → 84,4 % (avant : 80,4 % / 35 sur
les vingt et une topologies). Un changement de flanc ne pose plus une borne
DANS un autre connecteur (entre sa première et sa dernière borne).

Le folio 3 se calcule en trois secondes, le folio 6 en une et demie, les
autres en moins d'une seconde et demie (le regard structurel autour d'un
hub a son propre budget : trois cents routages).

Les trois nouveaux folios (01, `contratExemple`) ont des structures que les
trois premiers n'avaient pas : un calculateur avec deux barrettes de
distribution et des sondes à masses, un morceau de barrette seul (folio
4) ; une chaîne de deux prises de coupure entre deux tronçons, des fils qui
traversent une prise ou les deux (folio 5) ; deux équipements de dix bornes
qui se parlent à travers une barrette, un bus ponté, des piquages par
shunt, une borne qui alimente deux relais (folio 6).

LES RÈGLES DURES, tenues par construction et vérifiées par le banc :

- **Deux fils ne se superposent jamais** (`05-routage`, `coutsParPaires`).
  Le partage naît toujours du même motif : à une même hauteur, un fil
  accroché à la paroi gauche d'une goulotte et un fil accroché à la paroi
  droite, la verticale du second à gauche de celle du premier — leurs deux
  horizontales se recouvrent entre les deux coins. Cet ordre coûte
  SUPERPOSE (plus qu'un ordre impossible) : l'ordre des pistes met toujours
  la verticale attachée à gauche à gauche de l'autre, ce qui ne coûte que
  les croisements que l'entrelacement des bouts impose de toute façon (un
  pont est un élément normal). Il n'y a plus de jog. Le seul motif que
  l'ordre ne défait pas : deux fils en X dans une goulotte, chaque bout de
  l'un en face d'un bout de l'autre à la même hauteur (folio 2, W-133 /
  W-136) — un décalage d'un demi-pas n'y peut rien, les bouts sont
  rigidement liés par les pas des connecteurs et les fils droits ; ce qui le
  casse, c'est un pas dans l'ordre d'un connecteur (409GH2 en 2, 7, 9), au
  prix d'un croisement. Le juge paie donc un segment partagé QUATRE fils
  droits (deux croisements), l'estimation voit le X, et la recherche prend
  la permutation. Le banc rend 1 s'il en reste un, sur toutes les topologies.
- **Aucune marche** (`05-routage`, `Z_MIN`, `compterMarches`). Un fil est
  droit, fait UN Z propre (une verticale, deux vrais angles droits), ou un
  U par un couloir ; jamais une petite marche de quelques unités. Une
  marche, c'est un segment de moins de 12 entre deux angles (verticale ou
  horizontale), ou deux verticales d'un même fil à moins de 24. Elles
  venaient de deux endroits : le jog (disparu), et un couloir posé au
  premier y libre sous le fragment qui barre la ligne de la borne — deux à
  seize unités plus loin (folio 3, W-376, W-379, W-375). Un couloir se pose
  maintenant à Z_MIN (16) au moins des deux bornes qu'il relie, jamais à la
  hauteur d'une borne de paroi (deux horizontales sur la même ligne se
  lisent comme un seul fil), et une verticale de détour fait Z_MIN. Le fil
  d'une pastille (22 unités, dans la zone de sa colonne) ne compte plus
  comme barrière sur toute la goulotte : c'est lui qui repoussait le
  couloir juste sous la ligne de la borne. Le juge paie deux fils droits
  chaque fil qui ferait encore une marche (seul le placement peut en
  laisser : deux bornes presque en face, à moins de 12 l'une de l'autre),
  et le banc rend 1 sur toutes les topologies.
- **Un morceau de barrette seul se colle à sa borne** (`03-graphe`,
  `pastille`). Un paquet réduit à une borne et un fil vers un bloc n'a rien
  après lui : c'est une pastille, comme une masse, collée au flanc de la
  borne qu'elle sert (folio 2 : 667VT21 borne 3 sur 118CD:3, borne 4 sur
  409GH2:7), dessinée en petit morceau de barrette dans l'axe du fil — le
  pointillé, la borne en point noir numéroté, le point de départ, le
  repère `rep-petit` dessous, dans le pas des bornes. À plusieurs bornes
  ou plusieurs partenaires, le morceau reste un bloc. Le banc vérifie que
  ces morceaux sont collés, avec les masses.
- **Une prise de coupure se pose entre ses partenaires** (`04-placement`,
  `compterTours`, `flancs`). L'amont d'une borne entre d'un côté, l'aval
  ressort de l'autre ; ses fils d'une borne qui sortent tous du même côté
  (un piquage sur une prise de coupure : le dessin ment sur le tronçon)
  comptent DEUX tours au juge — aller et retour autour de la prise, deux
  croisements valent mieux (folio 5, 540VL5:4 → 412VC3B:7). C'est le côté
  de sortie qui compte, pas la colonne : un partenaire de la même colonne
  choisit sa goulotte, et vers une borne de prise, c'est le côté opposé
  aux autres partenaires de cette borne. Au juge seulement : chargée aussi
  dans la mise en niveaux, la règle déviait l'exploration et le folio
  chargé perdait sa meilleure mise en niveaux (21 croisements au lieu de 17).
- **Une réglette s'étire comme un équipement, et un corps étiré se tasse
  sur place** (`corpsEtire`, `compactions`). Un paquet de barrette se
  dessine aussi petit que possible : tiré sur quatre cents unités pour
  redresser trois fils, il devient un mur que les autres fils contournent
  (folio 4, 670VT41). Le juge compte donc les réglettes étirées avec les
  équipements (une fois et demie la hauteur naturelle, à un pas près), et
  la recherche sait TASSER un corps étiré sur place — ses bornes au pas
  depuis la première ou jusqu'à la dernière, rien d'autre ne bouge — parce
  que lui refuser un fil droit (renoncement) fait tout réaligner au
  solveur, qui crée ailleurs les croisements qu'on voulait éviter. Gardé
  si le juge préfère ; le banc vérifie qu'aucun corps étiré ne perd
  contre sa version tassée, au barème du juge (croisements compris : un
  paquet étiré qui ôte trois croisements reste étiré, 668VT31).
- **Aucun fil ne fait le tour de son bloc** (`04-placement`, `flancs`). Un
  connecteur dont les bornes servent les deux côtés se coupe en deux pièces,
  chaque paquet de bornes pontées regardant ses partenaires ; aucun geste
  de la recherche ne fait tourner le dos à un partenaire. Un tour se compte
  par colonne (un partenaire de la même colonne n'est d'aucun côté) et
  coûte trois fils droits au juge, six à la mise en niveaux — pour qu'elle
  préfère un fil qui enjambe une colonne. Seule une borne de connecteur qui
  sert les deux côtés fait encore tourner un fil, quoi qu'on fasse ; il n'y
  en a pas dans l'exemple.
- **Le gros équipement se dessine au centre** (`couchesAutourDuHub`). Un
  hub (huit bornes, six voisins) se pose au milieu ; sans lui, le graphe se
  défait en sous-ensembles (une pompe et sa barrette, un relais, sa lampe et
  son interrupteur), répartis des deux côtés — par la hauteur, ou dans
  l'ordre des bornes du hub — et étagés depuis lui par le flux : ce qu'il
  alimente à une colonne, ce que cela sert à la suivante, trois colonnes au
  plus. La descente n'y règle que la profondeur, jamais le côté ni la
  colonne du hub. Le flux rayonne alors du hub (`contresens`). Le meilleur
  de ces candidats est finaliste d'office s'il tient sur la feuille.
- **Un fil qui enjambe une colonne paie ce qu'elle obstrue** (`TRAVERSEE`) :
  un équipement enjambé, ou un quart pour un fragment de barrette — les
  couloirs restent aux fragments, et un équipement ne vient pas se poser
  entre le hub et ce qu'il alimente.
- **Un fil qui contourne des blocs coûte en lisibilité** (`compterContours`) :
  ce qu'un détour dépasse de 120 unités se compte en fils droits, un par
  150. Sans quoi le juge préférait faire faire à un fil le tour entier de
  la feuille pour ôter deux croisements.

UN CROISEMENT VAUT DEUX FILS DROITS. Un lecteur a montré, deux fois sur la
même feuille (210SP1, 601RC), un croisement pour rien qu'un échange de deux
bornes ôtait en pliant un fil : c'est l'échange qu'il voulait. Le juge
précédent (un croisement = un fil droit) préférait le fil droit à égalité.
Le tamis de l'estimation se compte en croisements (un ; deux dans la passe
finale, où l'estimation se trompe d'un ou deux croisements sur un changement
de flanc). Une borne peut changer de flanc au-dessus ou au-dessous du corps,
qui grandit d'autant ; un échange de bornes à hauteurs fixes qui plie un
fil se rejoue au solveur, où le partenaire glisse et le garde droit — mais
seulement s'il n'a perdu qu'un fil droit à l'estimation. Les finalistes du
concours se comparent sur la géométrie qu'on dessinera (resserrée, étirée
au format), et le choix des finalistes admet un tiers de trop en largeur :
la géométrie initiale a ses goulottes taillées large. Dans la passe finale,
le flanc d'une borne se juge au routage complet directement (ni
l'estimation ni le routage rapide ne voient le détour qui, seul, ôte
parfois les croisements du changement), et toutes ses hauteurs se routent.

LE BUDGET est en unités de routage, honnêtement mesurées sur le folio
chargé : un routage rapide vaut 1, un routage complet 2, un solveur
d'ordonnées 2. Le même contrat donne le même dessin sur toute machine.
L'ordre exact des pistes se calcule en n·2ⁿ ; le solveur porte ses
contraintes sur les nets une fois et ne retouche que le net qui fond ; le
tri topologique travaille sur des tableaux ; un balayage de corridors saute
d'une bande de blocs à l'autre.

LES BARRETTES SE POSENT PAR PAQUET (`03-graphe`) : les bornes pontées
ensemble font un module, dessiné là où il sert, aussi petit que possible ;
une barrette de dix bornes n'est plus une colonne de dix bornes que tous
les fils contournent.

Avant que les marches disparaissent, c'était 86,3 % et 20 croisements, avec
un jog sur le folio 2 (W-133 / W-136, un X caché dans une marche) et trois
marches de couloir sur le folio 3. Avant le hub au centre, c'était 86,0 %
et 13 croisements, mais le folio 3 sortait en portrait (0,77), avec 7
tours, 2 segments partagés, la recherche qui n'y convergeait pas, et 12
croisements dont plusieurs cachés dans des fils superposés. Avant ce
barème et les paquets, c'était 82,7 % et 45 croisements.

La mesure des fils droits est HONNÊTE depuis ce routeur : un fil qui passe
par le raccord et la verticale d'un piquage n'est pas droit, même si son
dernier segment l'est. L'ancien routeur les comptait droits : ses 88,3 %
valaient 79,6 % à cette mesure (285 fils sur 358, à placement fixé), pour
86 croisements dont plusieurs barrettes superposées comptées chacune.

Les CROISEMENTS ÉVITABLES : à placement fixé, un croisement est évitable
si un autre ordre des verticales de sa goulotte le supprime sans en créer.
C'est la part du routeur, mesurée sur les tracés (pas dans le routeur), et
elle vaut 0 ; sinon le banc rend 1.

Quand borniers et connecteurs étaient rigides (ordre naturel, au pas),
c'était 73,7 %, 122 croisements, folio 2 : 50 % / 5, folio 3 : 46,4 % / 80
(mesure gonflée). Avant la rigidité, les quinze historiques donnaient
96,7 % et 4 croisements : c'est le prix, mesuré, d'objets qui ressemblent
au matériel.

Le banc vérifie aussi, sur chaque folio de l'exemple, que **les gestes
évidents sont trouvés** : aucun échange de deux bornes d'un connecteur,
aucun changement de flanc d'une borne, aucun glissement d'un bloc (ses
pastilles avec lui ; jamais à moins de dix unités d'un autre bloc de sa
colonne, la garde que la recherche s'impose) ne fait mieux — moins de
croisements sans moins de fils droits, ou l'inverse (vérification exacte,
a posteriori, au routage réel, sur la géométrie resserrée, au barème du
juge : croisements, partages, marches, contours, fils dans leur propre
bloc ; un tour de plus n'est jamais « mieux »). Et que le dessin n'a
**aucun segment partagé** par deux fils de nets différents, **aucune
marche**, **aucun corps étiré** (équipement ou réglette) que sa version
tassée ne bat au juge (on le tasse et on reroute), les masses et les
morceaux de barrette seuls collés à leur borne, **tous les équipements
lisibles** (aucune borne ne tourne le dos à la colonne de son partenaire —
une borne pontée à une borne de son flanc qui regarde bien est excusée, un
pont ne se dessine pas entre deux flancs —, aucun fil étranger dans leur
voisinage), et le cas montré du doigt
(W-120). Un manqué fait rendre 1.

Un changement qui fait baisser le premier chiffre doit dire pourquoi, dans son
message de commit, mesure à l'appui.

## Ce qui reste imparfait, mesuré

Sur le folio 3, 17 croisements restent, presque tous du même ordre : les
bornes d'un connecteur forment un peigne rigide (au pas de 14) alors que
ses partenaires sont des blocs de cent de haut ; les fils d'un peigne vers
une pile de blocs sont donc des Z, et un fil droit qui traverse leur
goulotte (une barrette vers un relais) en croise plusieurs. Les défaire
demanderait de couper un connecteur en plusieurs pièces sur un même flanc,
ce qu'on n'a pas voulu : la pièce ressemble au matériel.

Sur le folio 6 (deux connecteurs de dix bornes à travers une barrette),
37,5 % seulement : la barrette se pose par paquets, chaque paquet est un
bloc avec ses marges, et une pile de paquets ne peut pas suivre le pas du
connecteur d'en face (deux paquets consécutifs mettent 38 entre leurs
bornes voisines, le connecteur 14). Un dessinateur tracerait la barrette
d'un seul tenant entre les deux connecteurs, tout droit ; il faudrait
pour cela recoller les paquets consécutifs quand ils servent les mêmes
blocs. Sur le folio 4, W-408 fait le tour du calculateur par le haut (le
connecteur B sert les deux côtés : un croisement de moins que de le
couper), et le paquet 670VT41 (1-4) reste étiré : le juge le préfère aux
deux fils qu'un paquet compact plierait, et il a raison au barème, même
si deux fils le contournent.

## Ce que `controle.js` vérifie

| # | Contrôle | Pourquoi c'est là |
|---|---|---|
| 1 | Le fichier se charge seul, bibliothèque Excel comprise | `index.html` doit marcher **sans aucun fichier à côté**. |
| 2 | Le dessin reste sain sur les formes qui font mal, sans croisement évitable | **Aucun fil ne traverse un bloc, aucun bloc n'en chevauche un autre.** La chaîne doit en plus tenir sur une feuille ; le maillage, qui croise beaucoup, ne croise que l'inévitable. |
| 3 | Le contrat d'essai : barrettes repérées, aucun croisement évitable, numéros de fil écrits sans se marcher dessus | Le numéro de fil est l'information numéro un d'un câbleur. |
| 5 | Identification par empreinte, choix du contrat de départ, différentiel | Qu'un équipement aux bornes déplacées soit reconnu, que le bon contrat sorte premier, que les pièces manquantes remontent. |
| 6 | Écriture des pièces, provenance, annulation exacte | On recopie, on ne reconstruit pas ; « Annuler » rend l'état d'avant. |
| 7 | Les pièges déjà tombés | Chaque défaut trouvé un jour a son contrôle, pour ne pas revenir. |

## Ce qu'il ne vérifie pas

- **L'esthétique.** Elle se juge à l'œil, sur des captures.
- **Les gros volumes.** La vraie base fait des centaines de milliers de
  lignes ; les contrôles travaillent sur quelques dizaines. Un changement à
  la lecture Excel s'essaie à la main sur le vrai fichier.
- **Le fichier de localisation.** Il n'existe pas encore ; les règles de
  coupure attendent dans `a-venir/`.
