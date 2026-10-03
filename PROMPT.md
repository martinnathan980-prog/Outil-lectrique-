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
- Le **numéro de fil s'écrit dans le fil**, sur un petit fond blanc, sur son plus long segment horizontal.

### Les équipements et leurs connecteurs
- Le corps est un rectangle, son repère dedans. Les **connecteurs sont des pièces collées hors du corps** : bords carrés côté corps, arrondis côté fil, le numéro de chaque borne dans la pièce, la **lettre du connecteur au-dessus** de la pièce.
- Les bornes d'un connecteur **n'ont pas à garder le même espacement** : elles s'écartent pour être pile en face de l'équipement qu'elles servent, et le fil part droit.
- Un connecteur peut se **couper en morceaux** (sur deux flancs, ou en plusieurs morceaux sur le même flanc), chacun avec sa lettre, si ça rend les fils droits.
- Le **gros équipement** (un calculateur) se met **au centre**, ses partenaires des deux côtés, et il « regarde » le centre. Personne ne s'empile au-dessus ou au-dessous de lui dans sa colonne.
- Un petit boîtier (relais, lampe, interrupteur) reste compact : jamais un interrupteur de trois bornes haut comme la feuille pour redresser un seul fil.

### Les barrettes (VT)
- Une barrette se dessine en **ligne pointillée verticale**. Chaque borne est une **pastille noire avec son numéro en blanc**, avec en bas un point de départ et un petit repère. Le pontage n'est **pas** un trait noir plein.
- Elle se pose **par paquet** de bornes pontées, **là où elle sert**, aussi petite que possible : une barrette de dix bornes n'est pas une colonne de dix bornes.
- Un morceau réduit à une borne et un fil **se colle à sa borne comme une masse**.
- Une même barrette peut **se couper en morceaux de même repère**, comme un connecteur : les bornes qui partent à gauche dans un morceau à gauche, celles qui partent à droite dans un morceau à droite. Le pontage coupé devient un fil dessiné avec son numéro.
- L'ordre des bornes d'un paquet peut s'inverser (on retourne le morceau) si ça évite un croisement.
- Un morceau ne se met **pas au-dessus du gros équipement**, et ne devient pas si grand que tous les autres fils le contournent.
- Une borne de barrette peut porter deux fils (un qui arrive, un qui repart). Dis-le si je pose la question.

### Masses, prises de coupure, repères
- **Masse** : symbole CEI dans l'axe du fil, perpendiculaire, fil très court, le repère en petit dessous.
- **Prise de coupure (VC)** : une embase fine et haute, numérotée, et la fiche mobile collée contre elle, bords carrés, contacts face à face.
- Les repères des barrettes, prises et masses ont **tous la même petite taille**. Pas de « CNT » ni d'ornement inutile.

### La feuille
- **Toutes les pages ont exactement les mêmes dimensions** (A3 paysage), comme dans un outil de dessin : même cadre, mêmes zones (1, 2, 3… / A, B, C…), même cartouche. Pas de portrait, pas de petite ni de grande feuille. Le dessin se cale au centre et la feuille prend l'échelle.

## 5. L'interface

Le plan occupe tout l'écran. **En bas**, la barre de vue : folios (précédent, numéros, suivant), puis ajuster, zoom moins, pourcentage, zoom plus. **À gauche**, le rail des commandes courantes : Base, Rechercher, Annuler, + Liaison, Bible, Ouvrir, Menu. La base des liaisons est éditable cellule par cellule et redessine le plan. Cliquer un bloc ouvre sa carte : connecteurs, ou pour une barrette et une prise, la référence, le dessin de chaque trou avec son fil, le remplissage selon la norme, et une simulation (jauge, intensité, chute de tension). La norme livrée est une **fausse norme d'exemple** (`normes/`), marquée comme telle. Export SVG/PNG, impression en A3 paysage.

## 6. Comment tu travailles

1. **Lis d'abord** `REFONTE.md`, `tests/LISEZMOI.md` et les modules de `src/` (01 modèle, 02 lecture, 03 graphe, 04 placement, 05 routage, 06 dessin, 07 folios, 08 interface, 09 barrettes, 10 démarrage). Comprends le pipeline : graphe → placement (concours de mises en niveaux, recherche locale par gestes, juge) → routage → dessin.
2. **Regarde ton propre écran avant de me livrer quoi que ce soit.** Avec Chromium et Playwright, capture les six folios de l'exemple en entier, puis zoome sur chaque zone que tu as touchée. Compare avant / après, côte à côte. Si ce n'est pas mieux **à l'œil**, ce n'est pas mieux, même si les chiffres montent.
3. **Mesure, mais ne te cache pas derrière les mesures.** `node tests/banc-placement.js` (21 topologies, fils droits, croisements, marches, partages, gestes évidents), et les batteries `tests/controle.js`, `tests/barrettes.js`, `tests/memoire.js`, `tests/format-retest.js`. Tout doit rester vert.
4. **Quand je pointe un défaut**, trouve la cause dans l'algorithme et corrige la **règle générale**, pas le cas particulier. Puis ajoute au banc un contrôle qui l'aurait vu : si je le trouve avant tes tests, tes tests ne sont pas assez bons.
5. **Ne régresse jamais un folio que j'ai validé.** Aujourd'hui les folios 1, 2 et 5 sont bons. À chaque changement du placement, revérifie les six folios. Le placement est sensible : un petit réglage du juge peut bouleverser un dessin. Rends la recherche robuste plutôt que de régler au hasard.
6. **Pas de couches sur des couches.** Si une partie est mal conçue, reprends-la proprement, au besoin de zéro, plutôt que d'empiler des rustines. Supprime ce qui ne sert plus.
7. **Garde le calcul raisonnable** : un folio chargé s'affiche en quelques secondes au plus, un folio déjà vu revient aussitôt.
8. Si tu utilises des agents, **un ou deux au plus** par tour, et tu relis toi-même leur travail à l'écran avant de le fusionner.

## 7. Comment tu me livres

- Commit en français, message clair qui dit ce qui change et les chiffres du banc avant / après. Pousse sur la branche de travail **et** sur `main`.
- Reconstruis `index.html`, vérifie qu'il est à jour (`node construire.js --verif`), republie le site.
- Envoie-moi les **captures** des folios touchés, et un zoom sur chaque défaut que je t'avais signalé.
- Ton compte rendu est **honnête et court** : ce qui est réglé, ce qui ne l'est pas et pourquoi, ce que tu as essayé et abandonné. Réponds à chacune de mes questions. Ne me dis pas « parfait » si ce n'est pas parfait.

## 8. Où en est l'outil (à corriger en priorité)

- **Folio 3** (le plus chargé) : le morceau de barrette 668VT31 (8, 9, 10) est encore au-dessus du calculateur 300XC1. Le morceau (1, 2, 3) est tout à gauche des pompes, avec un long fil W-301. Je veux chaque morceau entre le calculateur et ce qu'il sert, fils droits.
- **Folio 4** : la barrette 670VT41 est compacte mais rejetée tout à gauche, avec deux longs fils W-401 et W-405. 421ST1 est sous le calculateur.
- **Folio 6** : zéro croisement, mais 620SW4 est sous le gros connecteur au lieu d'être au milieu, sous son morceau de barrette comme les lampes.
- **Folio 5** : les quatre ponts près de 550SW3 viennent de l'ordre des contacts des deux prises. Si une disposition les supprime, prends-la.
- Le placement doit rester **stable** : le même contrat donne le même dessin, et un petit changement ne doit pas tout bouleverser.

Le but final : que n'importe quel folio, simple ou complexe, sorte du premier coup comme un dessin de câbleur — propre, droit, lisible, sans que j'aie à te montrer un seul défaut.
