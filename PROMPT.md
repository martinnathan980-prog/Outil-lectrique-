# Atelier Schéma — ce que je veux, pour l'IA qui reprend l'outil

Tu reprends **Atelier Schéma**, mon outil de schémas électriques aéronautiques. Lis ce texte en entier avant de toucher au code. Il dit ce que je veux, comment je juge ton travail et comment me le livrer. Tu me tutoies, tu me parles en français, simplement : je connais le câblage avion, pas forcément le code.

## 1. L'outil en une phrase

Un tableau Excel de retest entre, de **beaux schémas de câblage** sortent : un folio par plan, chaque équipement avec ses connecteurs et ses bornes, chaque fil tracé et numéroté, comme un câbleur expérimenté les dessinerait à la main. Le **placement des équipements et des fils est le cœur du système** : il doit être clair, net, précis, propre et fluide, sur un plan simple comme sur un plan très chargé.

## 2. Contraintes absolues (jamais négociables)

- **100 % hors ligne** : un seul fichier `index.html`, aucun appel réseau, aucune police ni image extérieure, polices système seulement.
- **Aucune dépendance nouvelle.** Seule `lib/xlsx.min.js` est embarquée.
- **Mon vrai fichier est confidentiel** : je ne te le donnerai jamais. Tu travailles sur le contrat d'exemple (`contratExemple()`, six folios) et sur le banc de test. Tout ce que tu fais doit marcher sur un fichier que tu n'as pas vu.
- **Tout en français** : interface, code, commentaires, messages de commit.
- Le fichier `index.html` se construit avec `node construire.js` à partir de `src/NN-*.js`, `src/page.html`, `src/style.css`, `lib/` et `normes/*.csv`. Ne modifie jamais `index.html` à la main.

## 3. Les données d'entrée

Le format qui compte est le **RETEST** Excel : seize colonnes nommées, en-têtes vers la ligne 4 sous une date et un mémo : Harness, Device1, Pin1, PN1, Description1, Cable T/G, Cable tag, Route, Device2, Pin2, PN2, Description2, FWD (le plan, donc le folio), Cable length, Appareil, Date retest. Une ligne = un fil entre deux bornes. Les repères parlent : `…XC…` un calculateur ou bornier, `…VT…` une barrette, `…VC…` une prise de coupure, `…G` une masse (ex. 904G), `RL` relais, `LP` lampe, `SW` interrupteur, `PM` pompe, `VL` vanne, `CP` capteur, `ST` sonde. Une liaison d'une barrette à elle-même (ex. 668VT31:1 → 668VT31:2) est un **pontage** (shunt) : un vrai fil avec son numéro.

## 4. Ce que « bien dessiné » veut dire — les règles que je vérifie à l'œil

### Les fils
- Un fil est **droit** (horizontal, d'une borne à l'autre) chaque fois que c'est possible. Sinon il fait **un seul Z**. Jamais d'escalier (plusieurs marches), jamais de fil qui fait le tour d'un équipement ou de la feuille, jamais de détour inutile.
- **Aucun croisement évitable.** Si intervertir deux bornes, deux fils, retourner un morceau de barrette ou déplacer un bloc supprime un croisement, ne pas l'avoir fait est une faute. Exemples que j'ai déjà dû signaler : 210SP1 bornes 3 et 4, 601RC bornes 7 et 11, 610LP3 bornes 1 et 2.
- **Deux fils ne se chevauchent jamais** (aucun segment partagé). **Rien ne s'écrit sur rien** : textes, numéros, repères, symboles.
- Un croisement inévitable se dessine par un **petit pont** sur le fil horizontal.
- Le **numéro de fil s'écrit dans le fil**, sur un petit fond blanc, sur son plus long segment horizontal (ou le suivant, ou debout le long d'un vertical, s'il n'y a pas la place).
- Un fil prend la **couleur de sa route** (colonne « route » ou « cheminement ») **sur toute sa longueur**, jusqu'à la borne : le raccord dans le connecteur, l'amorce d'une masse, d'un rond de barrette, d'une prise sont du fil. Son **numéro s'écrit en noir**. La **légende des routes** est dans le cartouche. Sans route, il reste à l'encre. Les routes de l'exemple sont provisoires (tirées du type de fil) : je donnerai les vraies.
- Un fil ne **frôle** pas un équipement qui n'est pas le sien (moins d'un pas de borne de son bord) : on croirait qu'il y entre.

### Les équipements et leurs connecteurs
- Le corps est un rectangle, son repère dedans. Les **connecteurs sont des pièces collées hors du corps** : bords carrés côté corps, arrondis côté fil, le numéro de chaque borne dans la pièce, la **lettre du connecteur au-dessus** de la pièce.
- Les bornes d'un connecteur **n'ont pas à garder le même espacement** : elles s'écartent pour être pile en face de l'équipement qu'elles servent, et le fil part droit.
- Un connecteur peut se **couper en morceaux** (sur deux flancs, ou en plusieurs morceaux sur le même flanc), chacun avec sa lettre, si ça rend les fils droits.
- Le **gros équipement** (un calculateur) se met **au centre**, ses partenaires des deux côtés, et il « regarde » le centre. Personne ne s'empile au-dessus ou au-dessous de lui dans sa colonne.
- Le dessin est **serré, à la forme de la feuille** : jamais une longue rangée « dans la longueur » où l'œil se perd, jamais un bloc rejeté au bout de la feuille loin de ce qu'il sert, jamais un fil qui traverse toute la carte.
- Les **contacts d'une prise de coupure** se rangent dans l'ordre qui ôte les croisements, comme les bornes d'un connecteur ; l'amont entre toujours d'un côté, l'aval sort de l'autre.
- Un petit boîtier (relais, lampe, interrupteur) reste compact : jamais un interrupteur de trois bornes haut comme la feuille pour redresser un seul fil.

### Les barrettes (VT)
- Une barrette se dessine en **ligne pointillée verticale**. Chaque borne est une **pastille noire avec son numéro en blanc**, avec en bas un point de départ et un petit repère. Le pontage n'est **pas** un trait noir plein.
- Elle se pose **par paquet** de bornes pontées, **là où elle sert**, aussi petite que possible : une barrette de dix bornes n'est pas une colonne de dix bornes.
- Un morceau réduit à une borne et un fil **se colle à sa borne comme une masse**.
- Une même barrette peut **se couper en morceaux de même repère**, comme un connecteur : les bornes qui partent à gauche dans un morceau à gauche, celles qui partent à droite dans un morceau à droite. Le pontage coupé devient un fil dessiné avec son numéro.
- Les ronds d'un paquet se rangent dans n'importe quel ordre (on retourne le morceau, ou mieux) : le fil qui descend vers un bloc du dessous prend le rond du bas.
- Un morceau ne se met **pas au-dessus du gros équipement**, et ne devient pas si grand que tous les autres fils le contournent.
- Une borne de barrette peut porter deux fils (un qui arrive, un qui repart) : **chaque fil a son rond**, les deux ronds pontés — jamais deux fils sur un même rond.

### Masses, prises de coupure, repères
- **Masse** : symbole CEI dans l'axe du fil, perpendiculaire, fil très court, le repère en petit dessous.
- **Prise de coupure (VC)** : une embase fine et haute, numérotée, et la fiche mobile collée contre elle, bords carrés, contacts face à face.
- Les repères des barrettes, prises et masses ont **tous la même petite taille**. Pas de « CNT » ni d'ornement inutile.

### La feuille
- **Toutes les pages ont exactement les mêmes dimensions** (A3 paysage), comme dans un outil de dessin : même cadre, mêmes zones (1, 2, 3… / A, B, C…), même cartouche. Pas de portrait, pas de petite ni de grande feuille. Le dessin se cale au centre et la feuille prend l'échelle.
- Le **cartouche** est un bandeau d'un seul tenant en bas à droite, au trait d'encre : le folio en grand et l'indice ; le titre et la marque ; dessiné, date, échelle ; la légende des routes à sa gauche (un trait épais de la couleur de chaque route, son nom, son nombre de fils sur le folio).

## 5. L'interface

Le plan occupe tout l'écran. **En bas**, la barre de vue : folios (précédent, numéros, suivant), puis ajuster, zoom moins, pourcentage, zoom plus. **À gauche**, le rail des commandes courantes : Base, Rechercher, Annuler, + Liaison, Bible, Ouvrir, Menu. La base des liaisons est éditable cellule par cellule et redessine le plan. Cliquer un bloc ouvre sa carte : connecteurs, ou pour une barrette et une prise, la référence, le dessin de chaque trou avec son fil, le remplissage selon la norme, et une simulation (jauge, intensité, chute de tension). La norme livrée est une **fausse norme d'exemple** (`normes/`), marquée comme telle. Export SVG/PNG, impression en A3 paysage.

- **Retouche** : un bloc (équipement, barrette, prise) se prend à la souris et glisse dans sa colonne ; ses masses suivent, ses fils se reroutent en direct, il s'aimante à la hauteur qui rend un fil droit. Le folio retouché se garde ; Ctrl+Z défait ; le bouton « automatique » rend le dessin du moteur. Au doigt, un appui long prend le bloc.
- **Affinage** : le dessin s'affiche tout de suite, puis la recherche profonde l'améliore en arrière-plan (un point qui respire dans la barre du bas) ; chaque mieux trouvé remplace le dessin ; le résultat se garde dans le navigateur. Le temps de calcul n'est pas un souci : la qualité d'abord.
- **Vue en relief** : « Voir en relief » dans la carte d'une barrette ou d'une prise, ou un double-clic sur elle — la pièce en perspective, qu'on tourne à la main, chaque fil dans son trou à la couleur de sa route, et dessous le tableau trou par trou ; survoler un fil l'allume sur le plan.

## 6. Comment tu travailles

1. **Lis d'abord** `REFONTE.md`, `tests/LISEZMOI.md` et les modules de `src/` (01 modèle, 02 lecture, 03 graphe, 04 placement, 05 routage, 06 dessin, 07 folios, 08 interface, 09 barrettes, 10 démarrage). Comprends le pipeline : graphe → placement (concours de mises en niveaux, recherche locale par gestes, juge) → routage → dessin.
2. **Regarde ton propre écran avant de me livrer quoi que ce soit.** Avec Chromium et Playwright, capture les six folios de l'exemple en entier, puis zoome sur chaque zone que tu as touchée. Compare avant / après, côte à côte. Si ce n'est pas mieux **à l'œil**, ce n'est pas mieux, même si les chiffres montent.
3. **Mesure, mais ne te cache pas derrière les mesures.** `node tests/banc-placement.js` (21 topologies, fils droits, croisements, marches, partages, gestes évidents), `node tests/banc-corpus.js` (24 câblages que les réglages n'ont jamais vus : les six folios ne sont que des exemples), et les batteries `tests/controle.js`, `tests/barrettes.js`, `tests/memoire.js`, `tests/format-retest.js`. Tout doit rester vert.
4. **Quand je pointe un défaut**, trouve la cause dans l'algorithme et corrige la **règle générale**, pas le cas particulier. Puis ajoute au banc un contrôle qui l'aurait vu : si je le trouve avant tes tests, tes tests ne sont pas assez bons.
5. **Ne régresse jamais un folio que j'ai validé.** À chaque changement du placement, revérifie les six folios ; si un folio que j'avais validé change, montre-le-moi avant / après et dis pourquoi c'est mieux. Le placement est sensible : un petit réglage du juge peut bouleverser un dessin. Rends la recherche robuste plutôt que de régler au hasard.
6. **Pas de couches sur des couches.** Si une partie est mal conçue, reprends-la proprement, au besoin de zéro, plutôt que d'empiler des rustines. Supprime ce qui ne sert plus.
7. **Garde le calcul raisonnable** : un folio chargé s'affiche en quelques secondes au plus, un folio déjà vu revient aussitôt.
8. Si tu utilises des agents, **un ou deux au plus** par tour, et tu relis toi-même leur travail à l'écran avant de le fusionner.

## 7. Comment tu me livres

- Commit en français, message clair qui dit ce qui change et les chiffres du banc avant / après. Pousse sur la branche de travail **et** sur `main`.
- Reconstruis `index.html`, vérifie qu'il est à jour (`node construire.js --verif`), republie le site.
- Envoie-moi les **captures** des folios touchés, et un zoom sur chaque défaut que je t'avais signalé.
- Ton compte rendu est **honnête et court** : ce qui est réglé, ce qui ne l'est pas et pourquoi, ce que tu as essayé et abandonné. Réponds à chacune de mes questions. Ne me dis pas « parfait » si ce n'est pas parfait.

## 8. Où en est l'outil (à corriger en priorité)

Fait à la dernière passe : le PLACEMENT est redevenu celui que le lecteur trouvait « très, très bien » — le moteur (03, `sansBarrettesAPoser`) place le folio comme si les fils d'un dédoublement partaient encore de la borne, et c'est le ROUTAGE (05, `formerLesPiquages`) qui pose la barrette à poser au ras de la borne : une colonne pointillée, une borne par fil, chacune à sa hauteur (les fils qui peuvent partir droit partent de la barrette ; les autres prennent une borne à un pas et une verticale à eux), numérotées comme la fiche (1 = le fil à créer), le repère VTn à côté (06, `poserReperesVT`). Un fil qui part droit d'une borne de barrette compte droit au juge. Les VT se numérotent d'un bout à l'autre du contrat (un seul VT1). La FICHE (08 bis) est épurée : le repère, dessous une pastille d'état (le détail se déplie) et une ligne (ce qu'elle est, combien de fils), un cadre par connecteur ou module (la référence et sa norme, « Changer », la face), une ligne par fil (borne, numéro, type en retrait, où il va), un pied (Tableau, Relief, « ··· » pour renommer, désigner, supprimer). Rien d'autre : pas de carré de code, pas de « équipement », pas de désignation quand elle est vide. L'INDEX DES REPÈRES (08, `rendreIndex`, touche R, bouton du rail) remplace la fiche quand rien n'est choisi : équipements, barrettes, prises de coupure, chacun avec son état, sa désignation et son folio, un filtre en tête ; un clic y va, la flèche de la fiche y revient. La pastille de contrôle (08 quater) mène aussi aux barrettes à poser. Écrire son vrai repère en tête de la fiche d'une VT la POSE au contrat (Ctrl+Z la reprend). La liste des questions et la méthode pour les contrats déjà faits sont dans FEUILLE-DE-ROUTE.md.

Passe d'avant : un DÉDOUBLEMENT était dessiné en barrette à pastilles côte à côte (refusé par le lecteur : deux fils au même niveau) ; l'interface refaite autour du plan : l'INSPECTEUR (étroit, à droite) montre la fiche de ce qu'on clique ; le TABLEAU des liaisons est un tiroir en bas, ouvert à la demande (B) ; la feuille se recadre toujours dans la place libre, rien ne la recouvre (tests/interface.js).

Passe d'avant (retours du lecteur) : un piquage (deux fils sur une même borne) se dessine en fil plein, sans pastilles numérotées qui se lisaient comme une barrette sans repère ; la fiche l'explique (« double sertissage, ou une barrette à poser »). Les numéros d'une prise de coupure sont dans la fiche (partie mobile). Un bloc se déplace librement à la souris, d'une colonne à l'autre, sans jamais chevaucher un voisin ; un folio retouché le reste. La fiche d'un bloc est refaite : qui, est-ce conforme, ce qu'on a choisi et pourquoi en une phrase, la face (pour une prise : fiche et embase), les fils ; le reste replié ; un onglet Liaisons. Le relief d'une prise montre la fiche et l'embase. La suite est dans FEUILLE-DE-ROUTE.md.

Passe d'avant : l'**ASNE0059** (31 arrangements, ceux de l'EN 3646 sous les noms Airbus, `normes/asne0059.csv`), cinquième norme de connecteurs. Avant : l'**EN 3645-002** (99 arrangements des figures 1 à 68 sauf 51, `normes/en3645.csv`) — N, G, Q, L ; contacts numérotés, lettrés ou mêlés ; triaxiaux et quadrax qui refusent un fil ordinaire ; quatrième norme de connecteurs en concurrence pour les prises. Manque la figure 51.

Passe d'avant : l'**EN 3646-002** (31 inserts circulaires à contacts lettrés, `normes/en3646.csv`) — une borne numérotée prend la lettre de même rang, le part number nomme l'arrangement (EN3646A6083AAN → 08-3A), une prise de coupure met les trois normes de connecteurs en concurrence. À confirmer : la place des lettres des grands inserts et des lettres intérieures de 20-34, 20-39, 22-41, la correspondance numéro → lettre (rang) avec ton vrai fichier.

Passe d'avant : l'**EN 2997-002** (35 inserts circulaires, `normes/en2997.csv`) — les connecteurs `EN2997…` des équipements prennent le plus petit insert qui loge leurs bornes avec leurs jauges ; une prise de coupure met EN 2997 et EN 4165 en concurrence, ou l'une d'un clic ; face ronde à clé, relief en cylindre. À confirmer : la place exacte des numéros des grands inserts, les contacts #16 de 20-39, la désignation.

Passe d'avant : l'**EN 4165-002** (30 arrangements de modules, `normes/en4165.csv`) pour les connecteurs et les prises de coupure — une cavité de connecteur EN 4165 reçoit un module, chaque borne sur le contact de même numéro, la jauge jugée par la taille du contact ; l'arrangement nommé par le part number, sinon le plus petit qui loge tout, un autre d'un clic ; une prise de coupure est un module, un fil de fiche et un fil d'embase par contact ; cartes, relief (les cavités côte à côte), bible. À confirmer : les plages de jauge des contacts EN 3155, la désignation, les tailles des mixtes 99-01 et 99-10, les places pointillées du 30R23. À venir : le document des connecteurs de chaque équipement (dans l'Excel) pour le matching.

Passe d'avant : la seconde norme de barrettes, **NSA937901** (43 codes d'arrangement, `normes/nsa937901.csv`) ; une barrette prend la norme de son part number, sinon la mieux taillée des deux, et la carte en change d'un clic ; les tailles de contact sont propres à chaque norme ; les faces NSA937901 se dessinent comme la norme (bouts ronds, contours des shunts, modules étanches à plaque d'extrémité, mixtes contact par contact) ; la bible se filtre par norme. À confirmer : la règle de désignation NSA937901 (provisoire), les liaisons de M12-07, la place exacte des lettres des mixtes M12-08 à 11.

Passe d'avant : la norme **ASNE 0599** (modules de jonction) est la seule proposée pour une barrette — 29 variantes dans `normes/asne0599.csv`, chaque contact lettré, ses groupes, sa taille et les jauges qu'elle reçoit ; le remplissage est automatique (un potentiel par groupe, un fil par contact qui admet sa jauge, plusieurs modules s'il le faut) ; la carte dessine la face du module en relief, la bible la montre comme le dessin de la norme, la vue en relief pose les modules sur leur rail. À confirmer sur le papier : les minuscules du module 36 contacts (photo floue), certains groupes déduits (A103, A104, B201, C304…), les plages AWG par taille de contact, le code fluide Z, D401 « 2 X 8 » lu 2 × 4, les noms des contacts du module à diodes.

Passe d'avant : le dessin AFFINÉ (celui que la recherche profonde laisse, celui que tu vois) relu folio par folio. Le juge paie un dessin « dans la longueur » et un fil qui frôle un équipement étranger ; il a trois niveaux pour que ces termes ne détournent pas la recherche. Les contacts d'une prise se rangent comme des bornes (folio 5 : 550SW3 1↔2 avec les deux prises, plus aucun croisement). La recherche profonde essaie chaque grappe de blocs dans chaque colonne utile (351PM1 et 397TB1, 423ST3 ne restent plus au bout de la feuille), garde le calculateur au centre et finit par une passe exacte. Fils de la couleur de leur route jusqu'à la borne, numéros en noir, cartouche refait avec la légende. Banc : 92,3 % de fils droits, 4 croisements ; corpus : 89,6 % et 81 croisements (90,1 % et 84 avant : un demi-point perdu pour un dessin plus serré, sans frôlement).

- **Retouche** : un bloc ne change pas encore de colonne à la souris, une borne ne se déplace pas encore dans son flanc, un fil ne se déplace pas à la main ; une retouche est perdue si les liaisons du folio changent (elle ne se recolle pas encore par repère).
- **Relief** : la disposition des contacts d'une prise est indicative tant que la bible ne donne pas l'arrangement de l'insert.
- **Routes** : celles de l'exemple sont provisoires ; les vraies viendront de mon fichier, avec leurs couleurs.
- **Folio 2** : la recherche profonde trouve un fil droit de plus en étalant le dessin en escalier d'un coin à l'autre ; le juge préfère le dessin serré (15 droits sur 19). Si un dessin serré à 16 existe, prends-le.
- **Corpus** : onze défauts de lisibilité au dessin du concours, presque tous un fil qu'on redresserait en allongeant un bloc, manqués sur les gros cas quand le budget s'épuise.
- **Corpus** : trois calculateurs reliés deux à deux gardent quelques croisements même après la recherche profonde ; regarde-les.
- Le placement doit rester **stable** et **déterministe** : le même contrat donne le même dessin, recherche profonde comprise.

Le but final : que n'importe quel folio, simple ou complexe, sorte du premier coup comme un dessin de câbleur — propre, droit, lisible, sans que j'aie à te montrer un seul défaut.
