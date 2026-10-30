# Volta v74 — lot E « Le récapitulatif et les documents » : rapport

## Branche et commits

- Branche `worktree-agent-a331af4a1c4ccf6c0`, partie de `claude/schematic-generator-tool-hih0lj` à 816b249 (les briefs).
- `533ed1c` — la **fusion** de `origin/v73-pause-documents` (le domaine E de la v73, commencé, non fini, non vérifié),
  conflits résolus en gardant tout ce que la v74 a fait. Il ne porte que la résolution et l'accord avec la v74 (§ 1),
  pas le travail du lot : on le relit seul.
- `5ebd8e4` — **le récapitulatif repensé pour l'œil**, la nomenclature, les batteries.
- `2173b7b` — **deux régressions de la branche en pause**, trouvées par `toutes.js` (la cohérence de la base SEE, la
  touche « b » dans le récapitulatif ; § 1).
- Le commit de ce rapport.
- `index.html` n'est pas commité (l'intégrateur le reconstruit) ; après la fusion comme à la fin, la page chargée dans
  Chromium ne lève **aucune `pageerror`** ni erreur de console, sur les neuf onglets.

## 1. La fusion de la branche en pause (`533ed1c`)

Six fichiers en conflit : `src/08-fichiers.js`, `src/08-interface.js`, `src/08-recap.js`, `src/page.html`,
`tests/interface.js`, `tests/toutes.js`. Gardé de la v74 :

- **« installation », plus « retest »**, aussi dans le texte que la branche en pause AJOUTAIT sans conflit : la colonne
  « Installation » de l'onglet Disjoncteurs (la clé `retest` reste), sa bulle « L'installation porte MS3320-10 : 10 A —
  Volta retient 15 A », l'étiquette « installation » de la gamme, « Proposé par Volta, pas encore écrit dans
  l'installation », la dernière ligne du menu « Tableau en CSV » (« L'installation corrigée (Excel) »), le chapeau des
  Hypothèses (« Ce que l'installation ne porte pas, Volta le suppose… la feuille « Volta » de l'installation
  corrigée »), la feuille laissée de côté à l'ouverture (« pas les en-têtes d'une installation »), « Vos installations
  suffisent pour commencer ». Les vrais mots des fichiers (« Date retest ») et les identifiants ne bougent pas.
- **La croix `#ba-x`** du récapitulatif, à côté du nouveau menu « Tableau en CSV ».
- **« ajoutée par Volta · repère provisoire »** pour la barrette ; la règle du calibre : le contrôle « Tout régler :
  102CB1 en 15 A… » de `tests/documents.js` se juge sur `atelier.exempleSansCalibreAuto()` (dans l'exemple v74, le 15 A
  est déjà écrit : il n'y a plus de geste à proposer).
- `tests/toutes.js` : `relief` reste retiré (le relief est supprimé), `documents` entre.
- La case des Hypothèses « Volta écrit lui-même le calibre qui passe » (v74) n'avait pas de phrase courte : la page
  écrivait son paragraphe entier (le contrôle « une phrase et son « ? » par réglage » tombait). Ajout commenté dans
  `COURT_HYPOTHESES` (`08-interface.js`, section des Hypothèses, que le domaine E tenait en v73).
- Les retouches de la branche en pause à `style-normes.css`, `style-see.css`, `style-ref.css` sont gardées telles
  quelles ; je n'y ai rien ajouté (le lot N les tient).

Deux régressions que la branche en pause apportait (non vérifiée), trouvées par `toutes.js` et corrigées (`2173b7b`) —
chaque fois la batterie passait sur la base v74 (816b249) et tombait dès la fusion :

- **La cohérence de la base SEE** (`tests/see.js` expirait sur « c-taille ») : la v73 ôtait `OBJ_`, `LNK_`, `SET_` dans
  `nomCourtSEE` pour raccourcir les onglets des feuilles ; or la même fonction reconnaît les feuilles à l'import et dans
  la cohérence (« OBJ_END_Fitting_Rules… ») — le contrôle de taille perdait ses exemples. `nomCourtSEE` est rendue telle
  que la v74 l'avait (une ligne, commentée, dans `08-see.js` du lot N) ; les onglets gardent donc leur préfixe, comme
  `see.js` l'attend. Si le lot N veut des onglets plus courts, une fonction à part pour l'affichage seulement.
- **La touche « b »** (`tests/parcours.js`, « Ctrl+Z : l'en-tête redit l'état du départ ») : « une touche sur une case
  qui a le clavier ouvre son champ » (v73) écrivait aussi les touches de l'outil — après Entrée, la case du dessous a le
  clavier, et « b » écrivait un « b » dans le câble suivant au lieu de fermer le récapitulatif. Les touches seules de
  l'outil (b, p, P, r, n, f, « / », « ? ») gardent leur sens ; les autres ouvrent toujours le champ (comme un tableur),
  Entrée et F2 aussi.

## 2. Le récapitulatif repensé pour l'œil (`5ebd8e4`)

> « Le récapitulatif : trop de données, l'œil se perd. Garde UNE place avec toutes les données — la base commune, le
> cœur du process — mais mieux organisée, plus simple, plus fluide. Le rail de gauche, c'est bien. »

Une seule place, quatre zones qui se lisent d'un regard : **la tête** en haut ; **le rail** des onglets à gauche ; **la
barre** des filtres ; **la table**. Rien n'est perdu : chaque donnée reste dans la table, derrière « Colonnes » ou
« Filtrer », ou dans une bulle — et tout ce qui s'écrivait s'écrit encore, du même geste.

### 2.1 Le rail (« le rail de gauche, c'est bien »)

- Les neuf onglets ne sont plus une bande qui défile au-dessus de la table : ils se rangent **à gauche**, comme le rail
  de l'outil, en **trois groupes titrés** — **Câblage** (Liaisons, Câbles) · **Matériel** (Équipements, Disjoncteurs,
  Barrettes, Prises, Raccords) · **Contrôle** (Problèmes, Normes). Les Câbles rejoignent les Liaisons (c'est le même
  câblage, compté par type).
- Une ligne de 32 px par onglet, son mot, **son compte aligné à droite** en chiffres tabulaires, et **un point rouge
  seulement** là où il y a un problème : l'ambre « à voir » ne sème plus de points sur toute la bande (il se lit dans
  Problèmes). Le choisi est une pièce douce, à l'encre, en gras ; rien ne souligne, rien ne bouge.
- Au clavier : ↑ ↓ (et ← →), Début, Fin ; `aria-orientation` suit la forme.
- **La fiche épinglée** (un clic sur une ligne, en 1440) serre la feuille à 916 px : le rail **s'amincit** (184 → 164 px)
  sans changer de forme — il ne saute pas sous la main ; la barre range les mots de ses boutons (leurs icônes restent,
  la bulle et le lecteur d'écran gardent le mot) et tient sur sa ligne. **Une feuille étroite** (< 820 px, un petit
  écran, le téléphone) remet le rail en bande d'onglets soulignés au-dessus de la barre, un filet entre les groupes.
- En moitié à 1440 × 900, le rail tient juste (392 px pour 392) ; une moitié réduite à la poignée : il défile, seul.

### 2.2 La tête

- « Récapitulatif » et **le nom du plan**, seulement : les comptes (« 201 liaisons · 67 repères · 6 folios ») sont au
  rail, chacun devant son onglet, et dans la bulle du nom. La ligne se coupait sous la fiche épinglée (le technicien).
- **« Moitié · Page »** et la croix : « Plan » fermait aussi — il doublait la croix (v74) ; il reste au téléphone, où
  la batterie `parcours` le touche.

### 2.3 La barre : l'essentiel d'abord, le reste derrière « Filtrer »

- La première sorte de puces de l'onglet reste dans la barre (**« À reprendre 4 · 3 sur ce folio »**, le niveau des
  problèmes) ; les autres — **les routes, ce qui manque** (sans longueur, sans contact) — attendent dans **« Filtrer »**,
  un menu de verre rangé par rubrique, une ligne par puce (sa coche, son trait, son mot, son compte). Le menu reste ouvert
  d'une coche à l'autre ; une puce cochée **paraît, pressée, dans la barre** (on voit ce qui filtre, on l'ôte d'un
  clic) et « Filtrer » porte leur nombre. Un onglet qui n'a que deux puces les garde toutes deux. Avant : la rangée
  défilait sous un fondu, « Sans co… » coupé à 1440 (l'écart assumé de la v73, 3.15).
- **« + Liaison » au trait**, comme « Colonnes » : le bloc plein attirait l'œil sur un geste rare.
- « Colonnes » prend son icône (trois colonnes) ; serré, l'icône reste.

### 2.4 La table : ce qui va bien se tait, l'exception se voit

- **« ok » se tait** : son point vert suffit (le mot reste pour le lecteur d'écran, `.sr`, et dans le CSV) ; « à voir »
  et « problème » gardent leur mot et sortent du lot. Deux cents « ok » en moins sur l'onglet Liaisons.
- **« supposée » une fois** : quand toutes les longueurs montrées sont supposées, l'en-tête le dit (« Longueur
  supposée », sa bulle : « chaque câble compte 5,00 m, l'hypothèse de la simulation… ») et les lignes se taisent ;
  sinon, seule la ligne supposée le dit. Le même patron dans Câbles (« Longueur totale en partie supposée »). Un
  mécanisme général : la **note d'une colonne** (`note: L => [mot, bulle]`), calculée une fois par rendu.
- **La gauge, une fois** : plus de disque (plein, cerclé, pâle — le designer : « trois styles sans légende ») ; dans la
  case du câble, seulement quand le type ne la dit pas déjà (DR12 dit 12) ; un nombre à l'encre seconde sinon. Câbles :
  la colonne Gauge passe au choix (le type la dit).
- **La flèche** du câble s'amincit (1,5 à 3 px au lieu de 1,5 à 7) : elle dit la route, elle ne crie plus.
- **↺** (rendre la valeur de l'installation) : une marque discrète, plus un disque gris sur chaque ligne changée ; un
  bouton au survol, 26 px au clic (v74).
- **La hiérarchie** : le numéro du câble reste le plus fort ; les repères des bouts en demi-gras, la borne à l'encre
  seconde ; le type à l'encre seconde.
- **Raccords** : un choix laissé par défaut (droit · sans reprise · pas étanche · sans gaine) s'écrit à l'encre
  seconde, celui qu'on a fait à l'encre — l'œil va aux choix.
- **Prises** : le part number de la prise, au choix, et il s'écrit (l'ingénieur v73 : « le récapitulatif Prises ne
  l'a pas »).
- **Problèmes**, rangé par genre : l'intercalaire dit déjà le niveau (son compte, à sa couleur) — chaque ligne n'en
  garde que le point ; **un geste répété** d'une ligne à la suivante (« Tout régler : 102CB1 en 15 A et 3 câbles en
  DR12 » cinq fois de suite) **s'écrit une fois**, puis « ″ » dessous, sa bulle le redit (le patron des Normes) — l'écart
  assumé de la v73 (3.15).
- Aucune italique ajoutée ; « supposée » et les champs vides ne sont plus en italique.

### 2.5 Le reste derrière « Colonnes »

- D'office, puis les colonnes en plus **rangées par rubrique** — Liaisons : *le câble* (gauge, route, intensité, chute,
  résistance, masse), *les deux bouts* (contacts, part numbers, descriptions), *le dossier* (folio, harness, FWD) ;
  Équipements : *ce qu'il est*, *ce qu'il porte* — **sur deux colonnes** à partir de dix (l'ingénieur : « le menu
  défile, je ne vois pas toutes les colonnes d'un coup »). Le menu se tient dans la feuille (sa hauteur suit la place).

### 2.6 Ce qui n'a pas changé (exprès)

Les neuf onglets et leurs colonnes d'office (sauf la Gauge des Câbles, passée au choix), le choix du calibre dans la
gamme (le composant de la fiche), écrire d'un clic sur la ligne choisie ou d'une touche, Tab, Ctrl+Z / Ctrl+Y, la table
virtuelle au-delà de 300 lignes, les intercalaires par folio, la portée « Ce folio · Tout le plan », « Tableau en CSV »,
le CSV des colonnes affichées (« ok » et « supposée » y restent écrits), la mémoire de ce navigateur (`atelier.recap.v2`).

## 3. Les documents : la fin du domaine E de la v73

Ce que la branche en pause avait fait est vérifié par `tests/documents.js` (tout passe) : « Tableau en CSV » qui dit ce
qu'il sort, « Ce folio · Tout le plan », « À reprendre 4 · 3 sur ce folio », le dessin dans la place libre en moitié, le
filet des champs à 3:1, la gamme du calibre (le composant de la fiche), écrire d'un clic, « Ce qu'il faut faire » en
gestes, les documents qui prennent le clavier et le rendent au ⋮, la croix « Fermer · Échap », Normes et Bible, Vos
fichiers allégé, les Hypothèses « écrites dans chaque export » (la feuille « Volta » et la page « Hypothèses et
sources » existent bien : `08-export.js`, `08-pdf-dossier.js`), le schéma Visio. Ajouté :

- **La nomenclature** : « +11 » est un bouton — un clic déplie les repères **en place**, « moins » les replie
  (l'ingénieur v73 : « impossible de voir la liste complète sans exporter ») ; « Le suivi (barrettes, prises) » passe
  au trait, **à côté d'« Exporter CSV »** (l'ergonome : « en lien à droite du pied, il se perd »).
- Déjà là, vérifié : le temps restant du dossier PDF (« environ 8 s »), le mot de l'export qui nomme le fichier dans
  vos Téléchargements.

## 4. Les batteries

Sur la version finale (`2173b7b`, `index.html` reconstruit, `NODE_PATH=/opt/node22/lib/node_modules`) :

| batterie | résultat |
|---|---|
| `tests/documents.js` | **41 / 41** — tout tient (31 dans la branche en pause : 29 / 31 à la fusion) |
| `tests/interface.js` | **tout tient** (154 contrôles) |
| `tests/pdf.js` | **30 / 30** |
| `tests/format-retest.js` | **28 / 28** |
| `tests/ux.js` | 21 défauts (avant : 21) — aucun de mon domaine, § 5 |
| `tests/toutes.js` | **23 batteries sur 24** ; la seule en échec est `ux` (le juge rend 1 tant qu'il reste un défaut, d'où qu'il vienne) |

`toutes.js` en entier : barrettes 258/258, references 64/64, format-retest 28/28, disjoncteur 86/86, interface,
chrome 43/43, documents 41/41, bibliotheque, controle 38/38, fiche, fwd, memoire 9/9, retouche, dessin, affinage,
couverture 75/75, normes, see 74/74, placement, vitesse, parcours (137, 0 échec), pdf 30/30, visio 30/30 — vertes.
Un premier passage, la machine chargée par mes captures, avait vu `bibliotheque` et `see` expirer et `parcours`
échouer : `bibliotheque` passe seule (une expiration) ; `see` et `parcours` étaient les deux régressions de la fusion
(§ 1), corrigées.

### Les contrôles mis à jour (marqués « MIS À JOUR »)

- `tests/interface.js` (la partie récapitulatif) : l'ordre des onglets (Liaisons · Câbles · Équipements · …, le rail en
  trois groupes) ; l'en-tête « Installation » de l'onglet Disjoncteurs (v74).
- `tests/documents.js` : l'en-tête « Installation » ; « Tout régler » jugé sur `exempleSansCalibreAuto()`.

### Les contrôles ajoutés (`tests/documents.js`, 31 → 41)

Le rail (trois groupes, à gauche de la table, un point rouge seulement, la tête au nom du plan, « Plan » rangé) ; ↓ ↑
dans le rail ; « ok » qui se tait, « supposée » dans l'en-tête, la gauge que le type dit ; « Filtrer » (la barre garde
« À reprendre », le menu par rubrique, une route cochée filtre et paraît dans la barre, le menu reste ouvert, Échap) ;
« Colonnes » par rubrique sur deux colonnes, tenu dans la feuille ; la fiche épinglée (le rail s'amincit, la barre tient
sur sa ligne) ; la feuille étroite (860 px : le rail en bande, puis il revient) ; Problèmes (le niveau en point, « ″ ») ;
la nomenclature (« +N » se déplie et se replie, le suivi à côté du CSV) ; « b » sur une case qui a le clavier ferme le
récapitulatif (il ne s'écrit pas).

## 5. Le juge `tests/ux.js`

**Sur mon domaine** (14 écrans : le récapitulatif et ses neuf onglets, en moitié et en page, Vos fichiers, Normes,
Bible, Hypothèses ; 4 passes, 1440 et 1920, clair et sombre) : **0 défaut avant, 0 après** — contrastes, cibles, noms,
textes coupés, cachés, focus, Échap, erreurs. Le juge ajoute toujours l'écran `plan` : ses 14 défauts `lecture` (le
folio sous 9 px à 100 %) sont ceux du lot D, avant comme après.

**Le juge entier** (tous les écrans, 4 passes) : **21 défauts avant** (l'état « fusion seule », `533ed1c`) **→ 21
après** (dans `toutes.js`). Aucun n'est de mon domaine : `lecture` × 14 (plan, lot D) ; l'accueil et la bibliothèque
(la touche « Ctrl+O » à 1,47:1, « 1 problème dans 1 plan » à 3,1:1, l'anneau de « Reprendre » à 1,02:1, le « ⋯ » d'une
installation sans bulle — lot A) ; `#in-fermer` de l'index sans bulle (lot D) ; le « ? » de la courbe à 18 px (lot F) ;
la ligne « Exporter · l'installation corrigée · 3 changements » du menu ⋮, rognée sans bulle (le chrome). Un passage
isolé a montré deux défauts de plus, hors domaine aussi (la bulle de `#fo-prev` à 470 ms, un élément de `#q-liste`
dans la recherche) ; le passage de `toutes.js` ne les a pas : des mesures sensibles à la charge de la machine.

**La charge** — ce que le juge mesure de « trop de données » (1440 clair : mots lisibles · cibles · dont sous 32 px) :

| écran | avant | après |
|---|---|---|
| récapitulatif (Liaisons, moitié) | 163 · 54 · 24 | **136 · 49 · 19** |
| Équipements | 98 · 45 · 16 | **87 · 44 · 15** |
| Disjoncteurs | 86 · 47 · 17 | **78 · 46 · 16** |
| Barrettes | 102 · 47 · 17 | **95 · 46 · 16** |
| Prises | 94 · 46 · 16 | **87 · 45 · 15** |
| Câbles | 158 · 50 · 19 | **129 · 49 · 19** |
| Raccords | 173 · 45 · 15 | **160 · 44 · 14** |
| Problèmes | 119 · 49 · 20 | **110 · 48 · 19** |
| Normes (moitié) | 163 · 48 · 19 | 178 · 47 · 18 |
| en page (l'onglet Normes) | 220 · 54 · 24 | 228 · 54 · 24 |

Moins de mots sur chaque onglet de données (−17 % sur Liaisons, −18 % sur Câbles), moins de cibles, moins de petites
cibles (le rail : 32 px par onglet). Normes monte d'une ligne : la bande d'onglets partie au rail, la moitié montre une
ligne de table de plus (plus de place, pas plus de bruit) ; ses trois titres de groupe s'ajoutent.

## 6. Ce qui reste

- **`lecture`** (14 défauts, écran `plan`) : les écritures du folio sous 9 px à 100 % — le dessin, lot D.
- **La collision `rendreLeClavier`** signalée par la v73 est toujours là : `function rendreLeClavier()` de
  `src/08-carte.js` (ligne 291) et `function rendreLeClavier(el)` de `src/08-menu.js` (ligne 26) ; la dernière déclarée
  gagne, la carte fermée ne rend pas le clavier à son ouvreur. Lot F (les fiches) : renommer celle de la carte
  `rendreLeClavierDeLaCarte` (le code exact est dans `docs/v73/corrections/documents.md`, § 4).
- **DESIGN.md** : le récapitulatif y est « des onglets soulignés » ; à reporter (le socle) : le rail des onglets en trois
  groupes, la note d'une colonne (« supposée » une fois), « ok » qui se tait, « Filtrer », le « ″ » d'un geste répété.
- La largeur à 1920 en page : la table reste serrée à gauche, la droite est libre (la ligne et son filet vont jusqu'au
  bord). Un plafond à 1280 px a été pesé et écarté : le rail et la table se seraient éloignés.

## 7. Ce que d'autres domaines peuvent employer

- `GROUPES_ONGLETS` (08-recap) : les groupes du rail ; `ONGLETS` garde son nom, son ordre a changé (Câbles après
  Liaisons). `changerOnglet(k)`, `ouvrirBase('moitie'|'page')`, `recapitulatifDe(c)` : inchangés.
- Une colonne d'onglet peut porter `note: L => [mot, bulle] | null` (la note de l'en-tête) et `g` (sa rubrique dans
  « Colonnes ») ; une puce, une 8ᵉ case : sa rubrique dans « Filtrer ».
- `basculerPuce(k)` : basculer une puce de l'onglet ouvert (de la barre comme du menu).

## 8. Les captures

Dans `/tmp/claude-0/-home-user-Outil-lectrique-/d44a74ef-5d4e-5d70-aef6-303c6243d2ca/scratchpad/e/` :
`avant/` (la fusion, avant le travail) et `apres/` (chaque onglet, en moitié et en page, 1440 et 1920, clair et
sombre) ; `v4g/` (les gestes : tout le plan, « Filtrer » ouvert et coché, « Colonnes », la ligne choisie, la gamme) ;
`problemes2-1440.png` (le « ″ »), `tel.png` (le téléphone). Les plus parlantes :
`avant/moitie-liaisons-1440-light.png` contre `apres/moitie-liaisons-1440-light.png`, `v4g/ligne-choisie-1440-light.png`,
`v4g/filtrer-coche-1920-dark.png`, `apres/page-liaisons-1920-dark.png`.
