# Contrôle de l'outil

## Lancer

```
node tests/controle.js         les invariants, le contrat d'essai, la base de retest, les pièges déjà tombés
node tests/memoire.js          le travail survit-il à la fermeture de l'onglet
node tests/format-retest.js    les seize colonnes sont lues par leur nom
node tests/banc-placement.js   combien de fils sortent droits, et sur quelle feuille ; les six folios de l'exemple relus
node tests/banc-corpus.js      soixante-douze câblages qu'aucun réglage n'a vus (tests/corpus.js, dix-huit profils, du plus simple
                               au plus complexe), relus par les mêmes contrôles exacts ; --cas=deux,trois pour des profils,
                               --images=dossier pour une capture de chacun, --profond=12 après la recherche profonde (lent)
node tests/affinage.js         la recherche profonde tourne en arrière-plan (Worker), sans erreur, et son dessin se garde
node tests/retouche.js         un bloc se déplace à la vraie souris, tout suit, Ctrl+Z, « automatique », et ça se garde
node tests/relief.js           la vue en relief de chaque barrette (modules E0599) et prise de l'exemple : un fil par contact pris, aucune étiquette
                               sur une autre, tourner, survoler, Échap, double-clic
node tests/interface.js        à la vraie souris (grand écran, téléphone) : la fiche dans l'inspecteur, le tableau en tiroir,
                               la feuille jamais recouverte ; chaque dédoublement est une barrette, une pastille par fil
node tests/barrettes.js        la bible des barrettes se lit, la référence se choisit, les connecteurs se lisent ; la norme se lit,
                               chaque fil va dans son trou, la simulation donne des valeurs connues à la main ; les catalogues ASNE 0599
                               (29 variantes) et NSA937901 (43 codes), les jauges de chaque norme, le choix de la norme et le
                               remplissage automatique des modules ; l'EN 4165-002 (30 arrangements) et l'EN 2997-002 (35 inserts circulaires), l'EN 3646-002 (31 inserts à contacts lettrés), l'EN 3645-002 (99 arrangements), l'ASNE0059 (31) pour les cavités des
                               connecteurs et les prises de coupure (sans navigateur)
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
comme un croisement) :

    92,3 % de fils droits · 4 croisements · 0 évitable · 0 violation · 0 cas hors feuille
    contrat d'essai : 77,8 %, 1 croisement · deux borniers en cascade : 100 %, 0
    folio 1 : 75,0 %, 0 · folio 2 : 78,9 %, 0 · folio 3 : 89,3 %, 1
    folio 4 : 92,3 %, 1 · folio 5 : 89,5 %, 1 · folio 6 : 87,5 %, 0
    partout : 0 tour, 0 segment partagé, 0 marche, 0 borne sur une autre, 0 fil rompu,
    0 bloc collé à un autre

et sur le CORPUS (`banc-corpus.js`, soixante-douze câblages, dix-huit profils) :

    89,6 % de fils droits · 81 croisements · 11 défauts de lisibilité · 0 cas faux

(Avant cette passe : 92,3 % et 6 croisements sur le banc ; sur les mêmes
soixante-douze câblages, 90,1 %, 84 croisements, 6 défauts. Le dessin est
plus serré, ne frôle plus les équipements et ne retourne plus une prise :
un demi-point de fils droits s'y est perdu, sur huit cas — vus à l'œil,
mieux dessinés pour cinq. Le banc mesure le dessin du CONCOURS, celui
qu'on voit d'abord ; la recherche profonde le remplace ensuite dans l'outil.)

LA RECHERCHE PROFONDE, sur les six folios (48 tours, ce que fait l'outil) :
folio 1 : 6 droits sur 8, 0 croisement · folio 2 : 15 / 19, 0 · folio 3 :
49 / 56, 1 · folio 4 : 24 / 26, 1 · folio 5 : 34 / 38, 0 · folio 6 :
30 / 32, 0 ; de trois secondes (folio 1) à cinq minutes (folio 3).

Sur les seize cas les plus complexes (deux et trois calculateurs, les
géants à deux calculateurs, le mélange), douze tours de RECHERCHE PROFONDE
(`--profond=12`) : 88,0 % → 90,2 % de fils droits, 56 → 30 croisements
(un géant de cent neuf fils, 17 → 7 ; l'outil en fait vingt-quatre tours).
De dix secondes à une minute et demie par cas : c'est ce que l'affinage
fait en arrière-plan, une fois pour toutes.

CE QUE LE LECTEUR A VU SUR LE DESSIN AFFINÉ, et ce qui l'a réglé — pour
tout fichier, pas seulement pour ces folios :
- « C'EST VACHEMENT DANS LA LONGUEUR, L'ŒIL SE PERD » (folios 1 et 2,
  onze et neuf fois plus larges que hauts) : les DESCENTES n'aiment rien
  tant qu'une rangée, et rien ne les retenait. Le juge paie l'ALLONGEMENT
  au-delà de trois fois et demie plus large que haut (`coutDeForme`) ;
- « IL FRÔLE QUAND MÊME 300XC1 », « IL COLLE VRAIMENT À 431PR1 » : un
  FRÔLEMENT (un fil à moins de seize unités d'un équipement qui n'est pas
  le sien, `compterFrolements`) coûte un demi fil droit. Le routeur ne
  s'en mêle pas : poser ses corridors plus loin lui faisait réserver
  d'autres places, et croiser davantage (un cas à trois calculateurs :
  2 croisements → 8) ;
- 351PM1 ET 397TB1 « UN PEU TROP EXCENTRÉS », 423ST3 de même : la recherche
  profonde déplaçait un ou deux blocs au hasard ; elle essaie d'abord,
  systématiquement, chaque GRAPPE (des blocs liés dans une même colonne)
  dans chaque colonne voisine ou d'à côté d'un partenaire, et repart d'une
  ÉLITE de trois dessins, pas d'un seul (`placementProfond`) ;
- « POURQUOI LES BORNES 1 ET 2 DE 550SW3 NE SONT PAS ÉCHANGÉES ? » : les
  contacts d'une PRISE se rangent comme les bornes d'un connecteur
  (`groupesDeBornes`), et deux fils PARALLÈLES s'échangent par leurs deux
  bouts à la fois (`echangesLies`) : folio 5, 411VC3A 7↔8, 412VC3B 5↔6,
  550SW3 1↔2, plus aucun croisement. Une prise dont l'amont et l'aval
  sortent du même côté vaut quatre tours (à deux, un bloc mieux rangé la
  payait encore) ;
- W-408 « IL POURRAIT ÊTRE DROIT » : la passe EXACTE qui finit la recherche
  profonde route chaque geste pour de vrai, sans tamis, et y ajoute les
  ÉCHANGES LIÉS (un échange qui redresse un fil et en plie un autre, puis
  celui qui redresse l'autre chez son partenaire).
- LE JUGE A TROIS NIVEAUX (`NIVEAU_JUGE`) : la structure se cherche aux fils
  droits, croisements et descentes ; la passe finale y ajoute les
  frôlements ; le choix entre dessins finis, la forme et les fils muets.
  Ajoutés dès la structure, ces termes égaraient la recherche (folio 4 :
  vingt fils droits au lieu de vingt-quatre) ; ajoutés à la passe finale,
  la forme en barrait le premier pas.
- UN FIL MUET (sans la place de son numéro) coûte un fil droit au choix,
  compté comme le dessin le pose, corps et repères compris.

LA GRANDE BATTERIE (`banc-corpus.js`, dix-huit profils de `tests/corpus.js`,
du minimal — deux équipements, un fil — au géant — deux calculateurs, cent
dix fils —, en passant par la série, l'étoile, les connecteurs multiples,
les piquages, les rails, la barrette longue, trois calculateurs, les prises
en chaîne) a été regardée à l'œil, cas par cas. Ce qui allait : les cas
simples (minimal, étoile, rails, connecteurs, barrette longue) sortent à
95-100 %, sans croisement. Ce qui n'allait pas, et ce qui l'a réglé :
- un PONT de barrette coupée comptait comme un fil droit gagné (05,
  `estPont`) : le juge coupait un bus de six bornes en quatre morceaux
  reliés par cinq ponts. Il ne compte plus : un seul morceau, tout droit ;
- un corps TASSÉ emmène ses FEUILLES (`compactions`, `avecSesFeuilles`) :
  un relais de quatre bornes restait haut de 345 unités pour garder droit
  le fil de sa lampe ; la lampe descend maintenant avec sa borne ;
- un fil plié d'un pas sous la lettre d'un connecteur se REDRESSE en
  allongeant le petit bloc d'en face (`redressements` : les hauteurs exactes
  des deux bouts sont candidates, et le geste passe aussi, en premier, sur
  la géométrie resserrée) ; le banc a un contrôle de plus, les REDRESSEMENTS
  ÉVIDENTS, qui l'aurait vu ;
- un corps ÉTIRÉ paie sa hauteur en trop comme une descente
  (`excesDesEtires`) : au forfait seul, une lampe de trois bornes montait
  sur trois cents unités pour un fil droit (folio 3, 392LP2) ;
- le banc note comme le juge : descentes et corps étirés compris ;
- les cas les plus complexes (deux ou trois calculateurs, plus de quatre-
  vingts fils) restaient emmêlés : c'est la RECHERCHE PROFONDE qui les
  démêle (04, `placementProfond` : des perturbations — un bloc change de
  colonne, un sous-ensemble passe de l'autre côté du calculateur —, chacune
  repolie et jugée ; un cas de cent neuf fils passe de 23 croisements à 3).
  Le temps n'est pas un souci : elle tourne en arrière-plan (08,
  `affinage`, un Worker refait du moteur), le dessin s'améliore sous les
  yeux, et le résultat se garde dans le navigateur.

LES SIX FOLIOS SONT DES EXEMPLES : ce qu'on corrige doit valoir pour
n'importe quel fichier. Le CORPUS (`tests/corpus.js`) fabrique, d'une graine
et d'un profil, des câblages réalistes qu'aucun réglage n'a vus — un ou deux
calculateurs, barrettes de distribution, prises de coupure en paires,
relais et lampes, sondes blindées, sans calculateur — et `banc-corpus.js`
les relit par les mêmes contrôles exacts que les folios. Il ne rend 1 que
sur un invariant violé ou une erreur ; les défauts de lisibilité se lisent
dans le rapport. Ce qu'il a appris :

- UNE BORNE DE BARRETTE A UN ROND PAR FIL (`03-graphe`, `ROND`) : un module
  a un contact de chaque côté, le fil qui arrive et celui qui repart n'ont
  pas le même trou ; deux fils sur un seul rond se lisaient comme un fil qui
  traverse (le lecteur : « ils ne vont pas avoir la même borne »). Les ronds
  d'une borne sont pontés : ils sont du même paquet.
- LES RONDS D'UN MORCEAU DE BARRETTE SE RANGENT DANS N'IMPORTE QUEL ORDRE
  (`permutationsDeBornes`) : le fil qui descend vers un bloc du dessous prend
  le rond du bas (folio 3, 669VT32 : le fil de 372CP2 en bas, celui du
  calculateur et la masse au-dessus). Le retournement d'un morceau n'est
  plus qu'une de ces permutations.
- UN BLOC QUI GLISSE POUSSE SES VOISINS (`glissements`) : mieux vaut trois
  fils droits et un plié que l'inverse (folio 3, 371CP1 remonte, ses trois
  fils vers 409VC2A sont droits).
- LES GROS ÉQUIPEMENTS SONT ÉLASTIQUES (`rechercheLocale`, `suivreLesGros`,
  geste « en face ») : un geste qui déplace le partenaire d'un calculateur
  emmène sa borne en face de lui si la place est libre sur le flanc ; et
  chaque borne d'un calculateur va en face de son partenaire, toutes
  ensemble puis une à une. Un second calculateur aussi : sur le corpus, un
  fil remontait quatre cents unités le long de son flanc en croisant trois
  fils (deux calculateurs : 9 croisements → 3).
- LE JUGE COMPTE LES DESCENTES (`DESCENTE`, `compterDescentes`) : ce que les
  fils pliés descendent d'une borne à l'autre, cent vingt-cinq unités pour
  un fil droit. Un fil qui plonge de trois cents unités se suit mal, même
  sans croiser personne ; sans ce terme, le folio 3 étalait trois blocs
  au bas de la feuille pour un fil droit de plus. Le dessin est serré, et la
  recherche, mieux guidée, trouve aussi plus de fils droits.
- LA HAUTEUR EN TROP D'UN CORPS DÉPARTAGE (`hauteurEnTrop`), et un corps se
  TASSE AUTOUR D'UNE BORNE DONT LE FIL EST DROIT (`compactions`) : serré par
  un bout, il cassait son seul fil droit (folio 4, 431PR1). Dans la
  lisibilité, ce terme changeait le choix des finalistes : il ne fait que
  départager.
- AUCUN BLOC COLLÉ À UN AUTRE : huit unités au moins entre deux blocs d'une
  colonne (`GARDE`), au juge (un chevauchement) et au banc.
- UN CONTACT DE PRISE DONT TOUS LES FILS ARRIVENT DU MÊME CÔTÉ ne se dessine
  que de ce côté (`sensDeContact`) : un départ pendait dans le vide.
- UN NUMÉRO DE FIL ESSAIE TOUS LES SEGMENTS (06, `reperesDeFil`) : le plus
  long segment seul laissait muet un fil dont l'horizontale passait sous une
  masse et la verticale entre deux ponts.
- LE BUDGET A DOUBLÉ : la recherche tombe dans un creux ou un autre selon son
  chemin ; plus large, elle sort des mauvais. Le folio 3 se calcule en sept
  secondes et demie, le plus gros cas du corpus en quatorze.

AUTOUR D'UN CALCULATEUR, LE CALCULATEUR EST AU CENTRE (`concours`,
`couchesAutourDuHub`). Quand le folio a un hub (huit bornes, six voisins),
ses mises en niveaux « hub au centre » sont les SEULES finalistes. Jugées
au départ, elles perdaient sur un format que leurs goulottes taillées large
exagèrent : le folio 3 gardait un morceau de 668VT31 au-dessus de 300XC1,
le folio 4 rejetait 670VT41 au bord et posait 421ST1 sous 400XC2. Quatre
règles les tiennent :
- la colonne contre le hub est celle de ce qui DISTRIBUE (morceaux de
  barrette, prises) quand un côté en a ; ses équipements vont à la suivante ;
- un fil qui enjambe une colonne de morceaux seuls n'est pas plus long (il
  y passe droit), si bien que ce que le morceau sert ne vient pas s'empiler
  avec lui ;
- un morceau que le hub alimente reste ENTRE le hub et ce qu'il sert, jamais
  derrière (le geste de colonne ne l'y envoie plus : folio 3, 668VT31 borne 4
  derrière sa vanne, W-310 par-dessus elle) ;
- une troisième répartition, par le FLUX, quand chaque sous-ensemble est
  franchement en amont ou en aval : deux borniers en cascade se lisent
  BORN1, BORN2, puis ses départs (80 % → 100 %).
Le banc vérifie, sur chaque folio qui a un hub, qu'il est seul dans sa
colonne, au centre dès qu'il a deux sous-ensembles, et chacun de ses
morceaux entre lui et ce qu'il sert (`calculateurDansLaPage`) : ce contrôle
relève, sur le dessin d'avant, 668VT31 au-dessus de 300XC1, 421ST1 sous
400XC2, 670VT41 derrière ses sondes et 620SW4 sous 600XC4.

LA FEUILLE EST UN A3 PAYSAGE, POUR TOUS : un dessin qui tient à l'échelle
1 dans sa zone utile tient, quelle que soit sa forme (`tientALEchelle`). La
règle d'avant (pas plus de 2,2 fois plus large que haut) datait de la
feuille qui suivait le dessin ; elle rejetait le folio 4 au calculateur
centré, plus large que haut. Les dessins trop grands pour l'A3 gardent la
règle et se replient.

SANS HUB, UN BLOC SE POSE ENTRE CE QU'IL RELIE (`changementsDeColonne`) :
une colonne neuve entre deux colonnes qui portent toutes deux ses
partenaires. Folio 5 : 540VL5, que la première prise alimente et qui
repart vers la seconde, se pose entre les deux prises ; sous la seconde,
ses deux fils croisaient les deux qui la traversent (5 croisements → 3, les
deux qui restent sont imposés par l'ordre des contacts).

UN FIL SE REDRESSE (`redressements`) : ses deux bouts vont ensemble à une
même hauteur, chacun dans son flanc, sans passer une borne voisine ; un
équipement grandit au besoin, un morceau de barrette ou une prise jamais
(tiré sur la pile de ses relais, 668VT31 se faisait contourner). Folio 1 :
W-015 droit, plus aucun fil autour du disjoncteur.

DEUX DESSINS FAUX, invisibles jusqu'ici, sont maintenant des invariants (le
juge les refuse, le banc rend 1) :
- deux BORNES L'UNE SUR L'AUTRE (`bornesSuperposees`) : un connecteur
  dessiné en morceaux restait rigide d'un seul tenant au solveur, et un
  bloc qui change de colonne gardait deux bornes face à face sur le même
  flanc. Les pièces d'un connecteur sont maintenant ses morceaux, chacun
  rigide ; un bloc qui change de colonne écarte ses bornes (`espacer`) ;
- un FIL ROMPU (`filsRompus`) : un bout qui n'arrive pas à sa borne. Le
  routeur prenait l'étiquette d'un bout pour celle de l'autre quand un fil
  droit passait par la jonction d'un piquage dans le sens inverse ; le
  tronçon jusqu'à l'autre borne n'était pas dessiné.

LE DERNIER MOT (`tasserLesEtires`) : un corps resté étiré que sa version
tassée bat au juge se tasse — la passe finale, à court de budget, ne le
regardait plus.

LA RECHERCHE EST MOINS SENSIBLE AU HASARD DE SON CHEMIN. Elle tombait dans
un creux ou un autre selon l'ordre des gestes, et le moindre réglage du
juge changeait un folio du tout au tout (le folio 3 perdait seize fils
droits pour une marge de barrette). Désormais : les finalistes du concours
sont divers (le meilleur du flux et le meilleur du hub au centre) ; chacun
est cherché deux fois, les gestes dans deux ordres ; la passe finale passe
sur tous (celui qui gagne avant elle n'est pas celui qui gagne après) ; et
l'étirement du hub, qui redresse plusieurs fils d'un coup en apportant
d'abord des croisements, se juge après un court polissage. Le folio chargé
prend cinq secondes au lieu de trois ; un folio déjà calculé se garde
(08, `placementDe`) et revient aussitôt.

UN CONNECTEUR DU HUB PEUT SE DESSINER EN PLUSIEURS MORCEAUX SUR UN FLANC
(`etirements`, second essai) : chaque borne en face de son partenaire,
quitte à intercaler A et B, chaque morceau sous sa lettre — comme on coupe
un connecteur entre deux flancs. Folio 3 : 12 croisements → 4.

UNE BARRETTE SE COUPE (`coupesParCote`, 03 `coupes`) : dans un premier
placement, un morceau étiré dont trois bornes au moins partent d'un côté et
d'autres de l'autre se coupe entre les deux ; le pontage coupé devient un
fil dessiné, avec son numéro ; le dessin coupé concourt à demi-budget
contre l'entier, le juge tranche. Sur l'exemple, l'entier gagne partout
aujourd'hui (le folio 4 a gagné, coupé, à un moment de la mise au point).

TROIS GESTES DE PLUS : la BANDE (un petit bloc va se poser contre son
partenaire de colonne, tout ce qui est dessous descend — folio 6, les
lampes sous leurs morceaux de barrette), le TASSEMENT (une tranche vide
se referme, les fils droits le restent) et le RETOURNEMENT d'un morceau de
barrette (ses bornes pontées dans l'ordre inverse — aujourd'hui une des
permutations de ses ronds). Un morceau de barrette
DESSINÉ est serré sur ses pastilles (neuf), sa place réservée reste douze :
le fil suivant d'un connecteur au pas passe dessous (folio 6, W-627 droit).
Un équipement de six bornes au moins s'étire (plus seulement le hub), et un
corps allongé dont les trois quarts des fils sont droits n'est plus compté
étiré — un boîtier de moins de six bornes l'est toujours.

LA FEUILLE EST LA MÊME POUR TOUS LES FOLIOS (06, `pageDe`) : A3 paysage,
1680 × 1188, le dessin calé au centre de la zone utile ; la feuille prend
l'échelle, jamais plus de 1 / 0,55 pour un petit folio ; le zoom affiché est
rapporté à la feuille (le même sur tous les folios, cadrés).

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

Le folio 3 se calcule en cinq secondes et demie, le folio 5 en moins de
trois, les autres en deux au plus (le regard structurel autour d'un hub a
son propre budget : trois cents routages ; il estime tous ses candidats et
n'en route que les douze meilleurs).

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
juge : croisements, partages, marches, contours, descentes, fils dans leur
propre bloc ; un tour de plus n'est jamais « mieux », et un gain de moins
d'un pas de descente ne se voit pas). Et que le dessin n'a
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

Folio 3 : un croisement, W-312 sur W-321 — trois relais reçoivent chacun
un fil du calculateur et un fil du même morceau de barrette, posé entre
eux et lui ; au mieux, un de ces fils en croise un autre.

Folio 4 : W-430 croise W-421 (les deux bus de barrette vers les trois
sondes s'entrelacent).

Folio 5 : un croisement au dessin du concours, aucun après la recherche
profonde (les contacts des prises se rangent).

Corpus : onze défauts de lisibilité, presque tous des REDRESSEMENTS que la
passe finale manque sur un gros cas, son budget épuisé (un fil droit de
plus en allongeant un bloc). La recherche profonde finit par une passe
exacte, sans tamis, faite pour eux — pas encore mesurée sur le corpus
(`--profond`, très lent depuis les grappes systématiques).

Corpus : le cas le plus chargé (29 blocs, 63 fils) se calcule en quatorze
secondes — les estimations et les assemblages, que le budget ne compte
pas, en prennent le tiers ; les prises entrelacées d'un calculateur à deux
connecteurs gardent deux croisements ; un corps étiré pour un fil droit
reste haut quand le tasser ferait plonger ce fil de plus de soixante unités
(le juge le préfère ainsi) ; un changement de flanc qui ôterait un petit
contour reste manqué (simple-1303).

La recherche reste sensible à son chemin : un réglage du juge peut faire
passer un folio d'une disposition à une autre, de qualité voisine au juge
mais pas toujours à l'œil. Les deux ordres de gestes et le budget doublé
l'atténuent ; on regarde les captures à chaque passe.

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
