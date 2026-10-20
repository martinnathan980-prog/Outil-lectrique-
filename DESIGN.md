# DESIGN — la direction du site, pour tout le monde (humain ou agent)

**Volta** (deux syllabes : le volt, l'électricité) est un **outil de conception électrique aéronautique**, hors ligne, dans un seul fichier HTML, utilisé
**sur ordinateur** (la tablette et le téléphone ne sont pas des cibles : le code qui les sert reste, on ne le soigne
plus). Le lecteur (ingénieur câblage) veut « quelque chose de fluide, de classe, d'épuré, de beau, de compréhensible —
une très belle expérience utilisateur ; toujours penser à l'utilisateur, ne jamais le perdre, un fil conducteur ; tout
calculé automatiquement, mais tout modifiable ». Il a écarté le style « futuriste IA » (cyan, chrome noir) et choisi
**« Graphite »**, puis (v68) **« Graphite 2027 : l'atelier »**, puis (v72) **« Nuit bleue »** — le lecteur : « c'est très
bien comme c'est, mais il y a beaucoup de sombre ; les menus, ils sont noirs sur fond noir ; pourquoi pas un fond pas que
noir, un peu dégradé, un petit peu interactif, qui bouge comme une application un peu futuriste — mais pas trop, pas
m'as-tu-vu : classe, propre, interactif ; quand tu cliques, ça s'ouvre à partir de là où tu cliques, une pop-up que tu
peux bouger ». Il l'a choisie parmi trois prototypes (Aube, Nuit bleue, Ardoise). Ce document fixe la direction
commune ; chaque domaine la décline dans son propre fichier de style.

## 1. L'idée : « Nuit bleue » — tout est posé sur la table, la nuit

- **Le plan est l'objet.** Une feuille blanche posée sur une **table bleu nuit** — une encre dégradée, la même dans les
  deux thèmes, une lumière froide qui tombe du coin haut-droit, une autre qui respire au coin bas-gauche, semée de points
  discrets (un tous les 24 px) — par une ombre profonde. Ce qui s'écrit à même la table prend l'encre de la table
  (`--t-table`) ; ce qui flotte dessus (le mot qui passe, les bulles) porte un filet qui l'en détache.
- **La table vit, à peine** (page.html `#table`, `08-table.js`) : quatre couches sous tout, fixées à l'écran — le fond,
  le souffle (16 s), les points, la **lueur** froide qui suit la souris de loin et s'arrête quand la main s'arrête. Quand
  on déplace le plan, les points glissent d'un dixième : la feuille paraît posée au-dessus. Pas de néon, rien ne
  clignote ; le mouvement réduit fige tout. La **barre du haut** est un voile de nuit sur la table (la marque « Volta »,
  qui mène à la bibliothèque, un **fil discret** — l'installation, le plan —, la recherche de verre, le menu ⋮ — rien
  d'autre), un filet de lumière dessous.
- **Les outils sont des PALETS DE VERRE** : de petites pièces arrondies d'un bleu plus pâle que la nuit, floutées, un
  filet de lumière en haut — **plus rien de noir sur noir** —, assez denses pour se lire aussi sur le papier, **les mêmes
  dans les deux thèmes** (l'**îlot de verre** : `#entete`, `#rail`, `#folios`, `#toast`, `.ilot-sombre` prennent l'encre
  claire de la nuit). Le **rail** flotte à gauche (44 px, à 10 px du bord) ; en bas, le palet des **folios** (‹, la
  bande, ›, le compte) à gauche et celui de la **vue** (cadrer, zoomer) à droite ; l'affinage en cours et le folio
  retouché, chacun sa petite pilule au milieu. Un outil pressé s'allume d'un voile de glace ; le folio courant est une
  pièce de verre dépoli presque blanche. Le **menu ⋮** et la liste de la recherche tombent de la barre : un verre de nuit
  dense, un filet de lumière ; leurs **bulles** sont claires.
- **Le menu ⋮ tient en sept lignes** (le lecteur : « on n'en utilise que 10-20 % ») : Bibliothèque (l'entrée
  principale) · Ouvrir un retest (il devient un plan de l'install ouverte) · Vos fichiers (« retests · contrats déjà
  faits · bible · normes » écrit dessous : c'est là qu'on dépose la grande base) · Récapitulatif · Nomenclature ·
  Exporter › (SVG, PNG, imprimer, le suivi) · Plus › (coller, l'exemple, la bible, les normes, les hypothèses, le
  cartouche). Plus de « Tout effacer » : on supprime un plan dans la bibliothèque. Un sous-menu s'ouvre **en place** :
  le menu garde sa largeur, une ligne « ‹ » ramène. Chaque ligne a sa bulle courte ; au clavier ↑ ↓, Entrée, → ouvre,
  ← ou Échap revient. Ce qui porte sur le plan (le récapitulatif, les exports…) le remet sur la table.
- **L'interface est à l'encre.** Le texte et les actions sont graphite : le bouton principal est noir, la sélection en
  gris doux, le focus cerclé d'encre. **La couleur ne dit que l'état** : vert ce qui est bon, ambre ce qui est à voir,
  rouge ce qui est un problème. Les routes des fils gardent leurs couleurs (sur le dessin, et pour le trait d'un fil
  dans le récapitulatif) ; c'est la seule autre couleur — et jamais le rouge ni le vert des états en tête de leur palette
  (`PALETTE_ROUTES`, 08-interface : le bleu, le violet, la sarcelle, le brun, l'ardoise, l'olive, le magenta ; l'orange,
  le rouge, le vert en dernier) : une prise saine ne montre pas de contacts rouges.
- **La fiche est une CARTE qui naît du clic** (`08-carte.js`) : un clic sur un bloc la fait grandir depuis la boîte même
  du bloc (280 ms, vive puis freinée) ; elle se pose **là où elle cache le moins** (`placerPres`, `zonesAProteger`) : le
  bloc jamais, le départ de ses câbles presque jamais — elle passe du côté qui n'en a pas —, puis le reste de ses câbles,
  ce qui est dessiné d'autre, la feuille blanche ; la table libre à côté de la feuille d'abord quand elle en a la place ;
  à droite du bloc de préférence, à gauche, dessous, dessus, plus courte s'il le faut. Un **fil** de glace l'y relie et le
  suit ; on la **tient par sa barre** (la poignée en haut) ou son symbole ;
  l'**épingle** de sa barre — ou la porter au bord droit, où le quai se dessine — en fait le **volet** de droite, qui
  recadre le plan à côté ; Échap ou un clic dehors la **rendent au bloc**, où elle se résorbe. Le plan n'est plus rétréci
  par elle ; s'il se centre de lui-même et amène le bloc dessous, elle s'écarte. Blanche le jour, encre bleue le soir.
  Échap ferme d'abord ce qui est ouvert dessus (le « ⋯ » du pied, une liste), puis la carte ; la bulle d'un « ? » reste
  dans sa boîte (sous le « ? », retournée au-dessus), jamais sur le plan.
  Le **récapitulatif ouvert**, on travaille en tableaux : la fiche se range d'elle-même en volet et le tableau s'arrête
  à côté d'elle (une carte posée dessus en cacherait les boutons) ; il se ferme, elle redevient une carte près de son
  bloc. Au téléphone, c'est le tiroir.
- **Ce qu'on lit d'autre est une FEUILLE** (le récapitulatif, les documents) : posée sur la table, détachée des bords
  par le même **jeu de 10 px** (`--jeu`), arrondie (16 px), une ombre longue — blanche le jour ; le soir, elle prend la
  matière des palets (`#1a2640`, plus clair que la table), un anneau de lumière et un filet clair en haut : on voit où elle
  commence. Elle entre en glissant d'un rien et se pose (`--lent`). Un document **large** (les normes, la bible) laisse
  40 % de l'écran au plan (la barre des folios devient « ‹ › 3 / 6 ») — les normes et la bible sont les deux **onglets**
  d'un même document, sous son titre ; la **base SEE** prend la page (la barre attend dessous, le toast se pose au milieu
  de la feuille ; au téléphone, en bas). Une table de feuille (le récapitulatif) a la largeur de sa feuille :
  trop étroite, elle défile de côté juste de ce qui dépasse, jamais dans le vide.
- **L'ouverture est la bibliothèque**, posée sur la table bleu nuit (le lecteur : « on choisit notre install et on a
  directement ses plans » ; plus de page d'exemple qui explique). Une **install** (une installation : telle antenne,
  tel cockpit) est une **pile de feuilles** — du **papier**, dans les deux thèmes, comme le folio : ce qu'on choisit est
  une feuille blanche posée sur la nuit (« Reprendre » aussi) — son nom, combien de plans, sa dernière ouverture, ses
  premiers plans ;
  ses **plans** (un plan = un retest) se lisent sur une feuille, une ligne chacun (nom, harness et dessins, liaisons,
  folios, dernière ouverture) ; un clic ouvre le plan sur la table, avec ses folios. Le plan resté sur la table se
  reprend d'un clic (« Reprendre », Échap). Rien encore : ce qu'est une install en une phrase, « Nouvelle install »,
  « Déposer la base des contrats déjà faits » (une colonne Install range chaque install et ses plans). L'**Exemple** est
  une install de démonstration, discrète (un cadre de lumière au trait, sur la table), en dernier. Renommer sur place,
  supprimer avec une

  **confirmation écrite dans la carte** (jamais une boîte du navigateur) puis « Rétablir », déplacer un plan : le « ⋯ ».
  Tout reste dans le navigateur (IndexedDB). Le reste des fichiers se retrouve dans « Vos fichiers ».
- **Le récapitulatif** est le tiroir du bas (B), en moitié ou en page : neuf onglets, chaque objet dans un seul
  (liaisons, équipements, disjoncteurs, barrettes, prises, câbles, raccords, problèmes, normes), peu de colonnes
  d'office — celles du quotidien —, le reste dans « Colonnes ». Une liaison s'y lit comme une phrase : de → le câble
  (numéro, type, gauge, une flèche à la couleur de sa route) → vers, sa longueur, un état (un point et un mot).

## 2. Les principes

1. **Le fil conducteur.** Chaque fiche a le **même squelette** (la fiche v4, 08-sections.js) : l'en-tête (le type et
   le repère, sans tuiles — sauf un câble), la barre des problèmes repliée, puis **peu de sections**, des cartes dans un
   ordre fixe, qui se lisent encore
   fermées (une icône, un titre, une ligne de résumé, une pastille d'état). On ouvre d'office ce qui définit l'objet ;
   « Déjà fait » attend un clic, et l'outil se souvient de ce que l'ingénieur ouvre, par type. Naviguer d'un objet à
   l'autre ne le perd jamais : la barre collée en haut de la fiche (‹ ›, Alt+← / Alt+→, une pile de 30 ; le repère s'y
   écrit quand l'en-tête passe dessous) — plus de fil d'Ariane (le folio se lit en bas, on ne se répète pas) ; ouvrir
   une fiche ne déplace pas le plan si l'objet est déjà en vue.
2. **Un coup d'œil, puis un geste.** Chaque écran dit d'abord l'essentiel (un chiffre et son état — le calibre retenu
   en grand, sa pastille verte, ambre ou rouge), puis donne le détail à qui le demande : le pourquoi d'un chiffre se lit
   dans la **bulle du survol**, pas dans des phrases ; comment l'outil a choisi une valeur, dans son **« ? »** (une
   bulle de deux ou trois phrases, au clic). Les problèmes ne sont jamais déroulés d'office : une barre dit combien,
   sous l'en-tête, et se déplie en place. Les mots sont ceux du lecteur : « câble » (jamais « fil » à l'écran),
   « gauge », « raccord ».
3. **Tout est calculé, tout est modifiable.** Un clic sur une valeur l'écrit. L'origine reste discrète : une pastille
   « main » seulement quand la valeur a été changée ici (« hyp. » pour une hypothèse de la simulation) ; « ↺ » (la
   valeur qu'il rend, en petit) rend le calcul ou le fichier. Ctrl+Z défait tout.
4. **Un langage visuel, pas deux.** Mêmes coins (6 une puce, 10 un bouton ou un champ, 12 un groupe, 16 une feuille,
   14 un palet), mêmes espacements (grille de 4), mêmes couleurs d'état, mêmes composants partout. **Pas de carte dans
   une carte** : dans une feuille, on groupe par l'espace et un filet, on ne recadre pas ; un cadre se réserve à ce
   qu'on prend en main (une ligne qu'on clique, une zone où l'on dépose). **Une action principale par écran** (pleine),
   le reste en feuille au filet ou en lien.
5. **Calme et net, pas gris.** Pas de dégradé ni de lueur dans ce qu'on lit (la table seule a les siens), pas de
   capitales espacées. Les étiquettes ont
   leur majuscule (« Part number », « Emplacement ») et l'encre seconde (`--t-2`, jamais `--t-3` pour ce qu'on doit
   lire) ; les valeurs l'encre (`--t-1`), nettes ; les titres de section affirmés (demi-gras 15 px) ; les groupes
   espacés (16 à 24 px) et séparés d'un filet, pas recadrés. Le demi-gras pour les titres, le gras est rare.
6. **Précis comme un plan.** Les dessins techniques (folios, faces de connecteur et de module, reliefs, courbes) sont
   **sur papier blanc dans les deux thèmes** et gardent leur encre ; à plat, exacts, lisibles à 100 %. Une courbe est
   lisse et monotone ; une légende ne se sépare pas de ce qu'elle nomme. Le numéro d'un fil s'écrit **pile sur son
   fil** — son milieu sur l'axe du trait, qui s'interrompt derrière lui (un fond de papier) —, debout de même sur un
   vertical ; à côté seulement quand la place manque (un fil court, le pointillé d'une barrette).
7. **Réactif et fluide.** Survoler montre, cliquer fait, glisser règle. Le mouvement est vif au départ et freine en
   arrivant (`--courbe`, cubic-bezier(.2,.8,.2,1)) : `--rapide` 140 ms (un survol, une couleur), `--moyen` 220 ms (un menu
   qui tombe, un panneau de menu qui glisse), `--lent` 340 ms (une feuille qui entre). La **carte** naît de son bloc en
   280 ms (son contenu paraît dans la seconde moitié : on ne lit jamais un texte écrasé), glisse en 300 ms d'un bloc à
   l'autre, se résorbe en 250 ms ; son fil se trace en 220 ms. La **table** vit lentement : un souffle de 16 s, une lueur
   qui rattrape la souris d'un quinzième du chemin par image puis s'arrête, des points qui glissent d'un dixième du plan.
   Un bouton pressé s'enfonce à peine (`scale(.98)`), une bulle glisse de 3 px en paraissant. Rien ne rebondit, rien ne
   clignote, rien ne tourne quand la main ne bouge pas ; le mouvement réduit coupe tout (la carte paraît à sa place, la
   table se fige).
8. **Prendre la main, en peu de mots.** Chaque import dit ce qu'il attend en une ligne (les colonnes qui comptent),
   montre trois lignes d'exemple à qui les demande, dit ce qui se passe ensuite en une phrase ; une erreur se dit en
   clair, dans sa carte. Chaque ligne du menu a sa bulle, une ou deux phrases. On n'écrit que l'utile.

## 3. La typographie (polices embarquées : `polices/`, lues par `construire.js`)

| jeton | police | pour |
|---|---|---|
| `--sans` (et `--titre`, son alias) | **Inter** (400, 500, 600, 700, 400 italique) | tout le texte : titres en 600 serrés (`letter-spacing:-.01em` à `-.02em`), étiquettes en 500 12-13 px `--t-2`, avec leur majuscule, valeurs, chiffres tabulaires |
| `--mono` | **JetBrains Mono** (400, 500, 600) | les identifiants : repères, numéros de fil, part numbers, types de câble ; dans une phrase, un identifiant porte la classe `.id` |

Le grec (Ω Δ φ…) vient des sous-ensembles grecs d'Inter et de JetBrains Mono ; les flèches et les signes (→ ⇄ √ ∞ ≤ ✓)
du sous-ensemble « symboles » d'IBM Plex, la police suivante de la pile (`unicode-range`). Corps : `--f-11 --f-12
--f-13 --f-14 --f-16 --f-20 --f-24 --f-28`. La typographie française est posée une fois pour toutes sur le texte
affiché (`typographieVivante()`, 08-interface) : espace insécable avant `: ; ? ! »` et après `«`, apostrophe courbe —
jamais dans le dessin des folios (svg) ni dans un champ ; `insecable()` (08-fiche) lie en plus un nombre à son unité.

## 4. Les jetons (dans `src/style.css`, `:root`) — on les utilise, on ne les redéfinit pas ailleurs

Quatre blocs : `:root` (le clair, complet), `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`
et `:root[data-theme="dark"]` (le sombre, les mêmes valeurs), puis **l'îlot de verre** (`#entete,#rail,#folios,#toast,
.ilot-sombre` : l'encre claire de la nuit, dans les deux thèmes). Un composant ne prend jamais une couleur littérale qui
ne vaut que dans un thème ; les seules couleurs littérales sont dans les dessins sur papier et dans les pièces de verre
de la barre du haut (la marque, la recherche, le folio courant). Chaque encre passe l'AA (4,5:1) sur chaque fond où
elle se pose — l'encre des palets aussi quand un palet passe sur le papier. **Ces noms sont stables** : les autres
feuilles (et les modules à venir, le lecteur de PDF compris) les lisent ; on change une valeur, jamais un nom.

| famille | jetons (clair → sombre) |
|---|---|
| la table (la même dans les deux thèmes) | `--s-app` #0e1626 (sa couleur moyenne) · ses couches : `--table-fond` (l'encre dégradée, la lumière du coin haut-droit), `--table-souffle` (la lumière qui respire), `--table-lueur` (ce qui suit la souris) · `--s-grille` (les points, un bleu à 22 %) · `--points` (le motif, 24 px) · `--t-table` #e9eef9 / `--t-table-2` #a9b8d4 / `--t-table-warn` (ce qui s'écrit à même la table : l'attente d'un folio, la bibliothèque) · `--l-table` / `--l-table-2` (ses filets) · `--s-table-champ` / `--s-table-survol` (un champ, un survol posés sur elle) · `--glace` #9fc2ff (l'accent froid, rare) |
| les surfaces | `--s-surface` #fff → #1a2640 · `--s-sunken` · `--s-hover` · `--s-line` · `--s-line-2` · `--s-flottant` (menus, listes, bulles de graphique) |
| le papier (les deux thèmes) | `--s-papier` #fff · `--s-papier-grille` · `--t-papier` #1d1d1f · `--t-papier-2` ; `.ilot-clair` rend tous les jetons clairs à un îlot |
| l'encre | `--t-1` #1b1f27 → #eef3fd · `--t-2` #454b57 → #b6c4de · `--t-3` #5f6672 → #91a2c2 · `--t-inverse` |
| l'action (à l'encre) | `--accent` #1b1f27 → #eef3fd (le bouton principal, le focus) · `--accent-2` (survol) · `--accent-soft` (fond de ce qui est choisi ou pressé) · `--accent-line` · `--on-accent` |
| les états | `--ok` / `--ok-soft` · `--warn` / `--warn-soft` · `--ko` / `--ko-soft` · `--info` / `--info-soft` (neutre) |
| les palets (les mêmes dans les deux thèmes) | `--palet` (un verre bleu presque opaque, 97 % : la feuille blanche passe dessous quand on zoome) · `--palet-2` (survol) · `--palet-flou` (`none` : à 97 % le flou ne se voyait pas et se recalculait à chaque image d'un déplacement du plan) · `--sh-palet` (le filet de lumière, l'ombre) · les voiles de glace posés dessus `--voile-1` 6 % · `--voile-2` 11 % · `--voile-3` 17 % · `--voile-4` 25 % ; les anciens `--p-*` en sont les alias. Dans l'îlot de verre, les jetons ordinaires (`--t-1` #eef3fd, `--t-2` #cdd8eb, `--t-3` #b8c6e0, `--s-hover`, `--accent`…) sont ceux de la nuit |
| la carte | `--sh-carte` / `--sh-carte-tenue` (posée, tenue : un filet de glace, une lueur froide) · `--r-carte` 18 px · `--lien` (son fil) ; sa place, posée par 08-carte sur `#inspecteur` : `--carte-x`, `--carte-y`, `--carte-l`, `--carte-hmax` |
| les courbes | `--courbe-chaud` · `--courbe-tiede` · `--courbe-froid` · `--charge` (la charge d'un disjoncteur sur son cadran) |
| le reste | `--bulle` #eef3fd / `--bulle-t` / `--sh-bulle` (claires sur la nuit, un filet qui les détache aussi du papier) · `--voile` / `--voile-fort` · `--route-a` / `--route-b` (la vignette d'un plan : violet et sarcelle) · `--route-voile` · `--anneau` (l'anneau d'un champ qui a le clavier) |

Espacements sur une grille de 4 px : `--sp-1` 4 … `--sp-6` 32. Coins : `--r-1` 6 px (puces), `--r-btn` 10 px
(boutons, champs, segments, recherche), `--r-2` 12 px (groupes, lignes cliquables), `--r-3` 16 px (feuilles,
fenêtres), `--r-palet` 14 px (palets, et tout menu qui tombe d'un bouton), `--r-bulle` 8 px (les bulles). Les mesures des
composants : `--h-btn` 34 / `--h-btn-dense` 30, `--h-onglet` 40, `--h-champ` 34 / `--h-champ-cellule` 28, `--h-puce` 28,
`--h-badge` 20, `--h-ligne-dense` 32 / `--h-ligne` 44 / `--h-ligne-riche` 56, `--h-tete-table` 32, `--h-menu-ligne` 34 ;
`--bulle-delai` 400 ms, `--menu-flou`. Le filet `--s-line` se voit (en clair `#dfe3ea`, 1,3:1 sur le blanc). Ombres : `--sh-1`, `--sh-2` (ce qui flotte au-dessus d'une feuille),
`--sh-feuille` (le folio sur la table : profonde, la même dans les deux thèmes), `--sh-panneau` (une feuille posée sur
la table : son bord net, une ombre longue), `--sh-palet`. Mouvement : `--courbe`, `--rapide` 140 ms, `--moyen` 220 ms,
`--lent` 340 ms. Les anciens noms (`--cuivre`, `--papier`, `--encre`…) sont des alias des jetons.

Géométrie de la page (le plan se recadre dans ce qui reste ; les tests la mesurent) : `--jeu` 10 px (l'écart des palets
et des feuilles aux bords et entre eux), `--entete` 52 px, `--rail` 64 px (le palet de 44 px et ses deux jeux),
`--pied` 50 px (les palets du bas, 40 px, et leur jeu), `--insp-l` 440 px (le volet ÉPINGLÉ : jusqu'à 560 sur un grand
écran, jamais plus de 36vw ; la carte flottante fait 420 px, 440 à partir de 1800, au plus 620 de haut),
`--fiche-l` 400 px (les normes et la bible : jusqu'à 1040 px, en laissant toujours 320 px au plan),
`--base-h` la hauteur du récapitulatif en moitié. Une feuille à droite : `top: --entete`, `right` et `bottom: --jeu` ;
ce qui doit lui laisser la place s'arrête à `largeur + 2 × --jeu` du bord (`body.insp-epingle`, `body.fiche-ouverte`) ;
la carte flottante (`body.insp-flotte`) ne prend aucune place.

### Les composants communs : UNE règle chacun (v72, l'audit des pages)

L'audit a compté ~20 formes de bouton, 2 styles d'onglets, 3 matières de menu, 2 systèmes de bulles et 3 façons de
confirmer. La règle ci-dessous est posée dans `src/style.css` (« LES COMPOSANTS COMMUNS ») : un domaine **emploie ces
classes** (ou, pour une forme qui lui est propre, leurs jetons `--h-*`, `--r-*`) ; il ne redessine pas un bouton, un
onglet ou une bulle. **Une même action a la même forme partout** (« Exporter CSV » est au trait sur toutes les pages).

| composant | la règle | les classes (style.css) |
|---|---|---|
| **Bouton** | Trois rôles : **plein** à l'encre (l'action principale, une par écran), **au trait** (le secondaire), **lien** (le tertiaire, sans soulignement au repos ; il se souligne au survol — dans une phrase, il garde un trait discret). Deux hauteurs : 34 (une feuille, la table) et 30 (une barre d'outils dense). Toujours 13 px / 500, icône 16, coin 10. **Danger** : au trait rouge ; plein rouge seulement dans la confirmation de ce qui ne se rattrape pas. Éteint : à plat, gris, lisible (4,5:1), jamais un fantôme à 45 %. | `.btn` + `.cuivre` (plein) · `.papier` (au trait) · `.lien` ; `.dense` ; `.danger`, `.cuivre.danger` ; `.rond`, `.rd` (icône seule) |
| **Onglet** | **Souligné**, 40 px, 13 px / 500 (600 choisi), son compte à l'encre seconde sans pastille. Une rangée trop longue défile et s'estompe au bord qui cache un onglet. Ce qui change de page est un onglet (Normes · Bible des barrettes, les feuilles de la base SEE, les onglets du récapitulatif). | `.onglets` > `button.onglet[role=tab][aria-selected]`, `.onglet-n` |
| **Segment** | Seulement pour **2–3 modes exclusifs d'une même vue** (une taille, une portée, un tri). | `.segment` > `button[aria-pressed]` |
| **Puce** | Pour **filtrer** : 28 px, coin 6, au trait au repos ; pressée, le fond doux de l'action et son filet (`--accent-soft`, `--accent-line`), jamais noir plein ; son compte à l'encre seconde. | `.puce[aria-pressed]`, `.puce-n` |
| **Badge** | Un **état** (à confirmer, modifiée, ajoutée) : une pilule de 20 px, le fond doux de l'état, pas cliquable. | `.badge` + `.ok` / `.att` / `.ko` |
| **Champ** | 34 px, coin 10, filet `--s-line-2`, `--anneau` au clavier ; dans une ligne de tableau, 28 px, coin 6. Une recherche a toujours sa loupe à gauche et × pour la vider. | `.filtre` (+ `.vider`), `.champ` |
| **Tableau** | Trois densités : **dense 32** (les normes, SEE, les aperçus), **normale 44** (le récapitulatif, les plans, la nomenclature), **riche 56** (une ligne qui porte un dessin : la bible). En-tête 32 px, collé, 12 px / 500 à l'encre seconde. Identifiants en chasse fixe à gauche, nombres à droite en chiffres tabulaires à décimales fixes, texte en Inter. Un filet `--s-line` entre les lignes. Une colonne que les lignes montrées ne remplissent pas ne s'écrit pas. | `table.tableau` (+ `.normal`, `.riche`) ; `td.id`, `.d`, `td.texte` |
| **Bulle** | **Une seule** : claire (`--bulle`, `--bulle-t`), 12 px / 400, coin 8, un anneau d'encre et une ombre (`--sh-bulle` : elle se détache aussi du papier blanc), après 400 ms de survol (tout de suite au clavier), 160 signes au plus. **Plus de `title=`** sur un contrôle visible : `data-bulle` et `lierBulles(boîte)` (08-fiche) ; `title=` seulement sur ce qui est tronqué, pour le nom entier. | `.bulle` (le nom d'un outil), `.bulle-texte` (le pourquoi : `data-bulle`), `.menu-bulle` (une ligne du menu ⋮) |
| **Menu** | Tout ce qui tombe d'un bouton est **le même menu** : le verre dense de la nuit (l'encre claire de l'îlot), coin 14, lignes de 34 px, une icône de 16 au trait, le raccourci à droite ; qu'il tombe sur la table ou sur une feuille blanche. | `.menu-verre` (et `.menu`, `.q-liste`, `.doc-menu-l`, qui la portent déjà) |
| **Mot qui passe** | L'**info** : du verre, une ligne, elle s'efface d'elle-même (2,8 s). L'**erreur** : le verre teinté de rouge et un filet rouge (pas seulement un point), elle reste jusqu'au clic et offre le geste qui répare. Une suppression offre « Rétablir » (8 s). Au téléphone, il se pose en bas, sous le pouce. | `#toast`, `#toast.erreur`, `.toast-voir` |
| **Confirmation** | **Faire, puis « Rétablir »** (le mot qui passe et son geste) pour tout ce qui se défait ; une confirmation **écrite dans la carte** seulement pour ce qui ne se rattrape pas (supprimer une installation, oublier la base), son bouton en plein rouge. **Jamais** `confirm()` ni `alert()` du navigateur. | `.btn.cuivre.danger` dans la carte |

## 5. Les composants communs (noms de classes, à réutiliser tels quels)

- **La carte** (`08-carte.js` ; style.css « la carte ») : l'inspecteur `#inspecteur`, flottant (`body.insp-flotte`) ou
  épinglé (`body.insp-epingle`, le volet). `CARTE` dit son état (`epingle`, gardée dans `volta.fiche.epinglee` ;
  `origine` : le bloc, le point cliqué, ou le bouton des repères) ; `carteFlottante()`, `poserLaCarte()` (appelée par
  `ouvrirInspecteur` : naître, glisser, rester), `resorberCarte()` (par `fermerInspecteur` : un double `.carte-double`,
  sans identifiants, `aria-hidden`), `epinglerCarte(oui)` (le bouton `#fi-epingle` de la barre, `boutonEpingle()`),
  `placerPres()`, `poserCarte(x, y)`, `eviterLeBloc()` (après `animerVue`, `planifierEcart`), le fil `#carte-lien`
  (`dessinerLien()`, à chaque `appliquerVue`), le quai `#carte-quai` (`body.carte-quai`), la tenue `body.carte-tenue`.
  La table : `08-table.js`, `#table` (`.ta-fond`, `.ta-souffle`, `.ta-points`, `.ta-lueur`), `lierTable()`,
  `parallaxeTable()`.
- **La fiche v4** (`08-fiche.js`, `style-fiche.css`), de haut en bas, pour toutes les fiches :
  · la **barre** `.fi-nav` (‹ `#fi-prec`, › `#fi-suiv`, `.fi-nav-nom` qui paraît quand `.fi.defile`, l'épingle
  `#fi-epingle`, × `#in-fermer` ; toute la barre se tient : on y déplace la carte) ;
  · l'**en-tête** `.fi-entete` : `.fi-symbole` (son icône dans un carré doux ; `[data-etat]` pose à son angle un point de
  l'état de l'objet, `etatDesProblemes`), `.fi-genre` — le type (`#eq-nature`, une liste qui a l'air d'un mot :
  celui du code du repère, une autre nature à la main, ↺ ; la même que la colonne Nature du récapitulatif) et la
  désignation (`#eq-des`, invisible vide hors du survol) —, le repère `input.fi-nom` (`#eq-rep` / `#fil-num`, F2) et
  `#fi-crayon`. **Plus de tuiles ni d'identité**, sauf pour un câble : ses tuiles `.fi-tuiles > .fi-tuile[.edit][.ko|.att]`
  (`tuile(étiquette, valeur, { etat, mono, edit })`) portent le type et la longueur — qui s'y écrivent —, la gauge,
  l'intensité ;
  · les **problèmes** `details.fi-alerte#fi-pbs` (repliée : `summary#fi-pb` « 3 problèmes · 7 à voir ») ; dépliée,
  une ligne `.fi-pb-l[data-voir][data-connecteur][data-viser]` par point, la section en petit (`.fi-pb-s`) ; une
  barrette à poser met dessous `.fi-poser` (« Poser au contrat sous 102VT1 ») ;
  · les **sections** (ci-dessous), puis le **pied** `.fi-pied` (Récapitulatif → `recapitulatifDe(cible)` au filet, le
  geste principal ; « + Câble », Relief en clair `.fi-bouton.fantome` ; « ··· »).
  Une fiche entre en fondu (`.fondu`, retiré après) ; une section qui s'ouvre aussi (`.fs-entre`) : jamais à chaque
  rendu, pas à chaque frappe.
  Dans une section : des **champs** `.fs-champs > .fc` (`.fc-k` l'étiquette, `.fc-v` la valeur ou son champ `.fc-in`
  qui a l'air d'une valeur et s'écrit d'un clic, `.fc-sous` une valeur seconde en petit, `.fc-o` « main » et ↺), des
  **groupes** `groupeSection(titre, contenu, { droite, aide })` (un petit titre `.fs-st` et son « ? », un filet
  au-dessus du suivant), des **tableaux** sobres aux en-têtes collés (`.fi-entetes`, avec leur « ? ») : les contacts
  `.fi-contacts` (Borne · Contact · Gauge ✓/✗ · Câble en petit `.fi-cab-n`, « ″ » pour le même contact qu'au-dessus),
  les **câbles** `.fi-ias.fi-cables` (une ligne `.fi-ia` au filet, sans carte, sur deux rangs ; un câble en défaut porte un
  trait de son état dans la marge : en haut le numéro qui ouvre sa fiche, la barre `.fi-barre` de l'intensité contre l'admis — elle se remplit à l'entrée —, la chute `.fi-u` de la couleur
  d'état, son seuil — celui que le moteur rend, `chuteAdmise(…, H)` — une fois dans l'en-tête ; en bas `.fi-cab-ed` ce
  qui s'écrit DANS la ligne : le type `[data-cable][data-champ=type]` (la liste `#fi-cables` de la base), la longueur
  (« hyp. » tant que le retest ne la porte pas), « → » le bout où il arrive et son contact en puce `.fi-ct-puce[data-sertir]`
  — « ↺ » `[data-auto="cable:…"]` rend le fichier), les paires d'une prise `.fi-paires`, le raccord `.fi-nomen` (une
  `.fi-piece[data-role]` par pièce sur deux rangs — son rôle et son « ? », sa référence ; « vérifié » ne s'écrit pas,
  « à confirmer » en ambre, « manque » en rouge ; ce qu'on ne sait pas ne s'écrit pas).
  La **bulle** : tout `[data-bulle]` dit son pourquoi au survol (`.fi-bulle`, texte sur plusieurs lignes) — pas sur ce
  qu'on écrit (un champ, une puce de contact).
- **Le « ? »** (`08-sections`, `aide(cle, contexte)`) : un rond `.fi-q[data-q]` de 17 px à côté de chaque valeur que
  l'outil choisit (calibre, courbe, profil, module, arrangement, prise, contact, gauge, raccord, bande, manchon, tyrap,
  cheminée, toron, intensité, chute, masse) ; un clic ou Entrée ouvre sa bulle `#fi-q-bulle.fi-q-bulle` (un titre, deux
  ou trois phrases : comment l'outil choisit, d'où vient la donnée), une seule à la fois ; Échap la ferme et rend le
  clavier au « ? », un clic ailleurs aussi. Les textes : `explication(cle, contexte)` (08-explications) ; le contexte
  (les objets du moteur : le verdict d'un disjoncteur, le plan d'un module, l'habillage d'un connecteur) se garde le
  temps d'un rendu sous `data-q-id`.
- **La fiche à sections** (`08-sections.js`, `style-sections.css`) : `ficheSections(type, [{ cle, titre?, resume?,
  badge?: { t, etat }, contenu, vide? }])` rend des **sections au filet** — pas des cartes : de l'espace et un filet entre
  elles, toute leur tête réagit au survol, un simple compte s'écrit sans pastille (`details.fs`, une icône `.fs-ico` par
  section, en pointillé quand elle est vide) dans
  l'ordre `ORDRE_SECTIONS` : Calibre (`disjoncteur`), Connecteur ou Module (`connecteur`), Raccord (`raccord`), De →
  vers (`trajet`, un câble), Câbles (`fils` : l'intensité ET la chute), Déjà fait — plus d'Identité ;
  `OUVERTES_D_OFFICE` par type (`equipement`, `disjoncteur`, `barrette`, `prise`, `masse`, `fil`) ; la mémoire par type
  (`atelier.fiche.sections.v4`) ; `ouvrirSection(box, cle)` l'ouvre, l'amène et l'allume (`.fs-allume`). Une section sans
  donnée garde sa place, en pointillé, et dit ce qui manque (`vide`). `rafraichirFicheEnPlace()` refait la fiche autour
  du champ qu'on écrit (la main y reste).
- **Le connecteur** d'un équipement : les bulles `.seg.ct-bulle[data-connecteur]` (A · B · C, le fautif marqué), puis
  pour le montré : la **norme d'abord** — l'arrangement en puce `.fi-norme-puce[data-face]` (un clic montre la face ;
  « Changer » les autres arrangements ; son « ? ») —, dessous en petit le part number `.fi-pn`
  (modifiable : toutes ses liaisons d'un geste) ; plus de « Bornes 1 à 2 » ; les contacts (le sexe en puces jointes à
  droite). Le **Raccord** du connecteur montré a sa carte. Une **barrette** : le module (sa référence et son « ? »), sa
  norme en puce `.fi-norme-gal[data-changer="bar|…"]` qui ouvre sous elle la **galerie** `.fi-galerie` des assemblages de
  la norme (`.cand.cand-g` : chaque variante dessinée avec ses contacts pris, ce qu'elle laisse de libre, la retenue
  pressée, la mieux taillée étoilée ; un onglet par norme `[data-gal-famille]`, « Automatique » `.fi-gal-auto`), la
  **face vivante** (survoler un contact allume son câble et sa ligne, un clic le choisit : `.choisi`), les contacts par
  potentiel. Une **prise** : la norme, **une seule face** `.fi-faces[data-face-montree]` (la fiche, ou celle qui porte le
  problème ; l'autre d'un clic, `[data-voir-face]`), les paires, un raccord par côté. Une **masse** : une seule carte,
  ses câbles `.fi-masse` (le numéro, d'où il vient, la gauge ; leur nombre dans le titre). Un **câble** : ses tuiles, De →
  vers (deux cartes `.fi-bout` : `[data-bout]` ouvre l'équipement le contact allumé, le contact du bout en puce ; la
  route dessous), l'intensité et la chute (`.fi-mes`, leur « ? »).
- **La fiche du disjoncteur** (`08-disjoncteurs.js`, `style-dj.css`) : UNE section, « Calibre », `sectionDisjoncteur(nom,
  d, o, probs)` — le calibre retenu sur son **cadran** `.dj-heros.ok|ko` (`cadranCalibre(d)` : la gamme sur un arc
  `svg.dj-arc`, la part qui passe en vert `.dj-arc-passe`, le serré `.dj-arc-serre`, la charge dedans `.dj-arc-perm` /
  `.dj-arc-pointe` à la couleur `--charge`, l'index du retenu `.dj-arc-index` ; le nombre au centre `.dj-h-cal`, l'unité
  à sa taille `.dj-h-u` ; ni pastille ni mot quand il passe, `.dj-h-ko` « ne passe pas — … » sinon ; à côté `.dj-h-cote`,
  la charge en chiffres `.dj-stats` et la gamme, son « ? » `.dj-h-pied`),

  « Automatique (15 A) » `#dj-retenir` quand il est ailleurs, « Autre calibre » `[data-changer="dj|…"]` qui ouvre la gamme
  `.dj-chips .dj-chip[data-cal]` (ceux de `d.gamme` ; le retenu pressé, le meilleur étoilé) ; le part number suit
  (`retenirCalibre` / `rendreCalibre`), il ne s'affiche plus ; en une ligne `.dj-grossir` les câbles que le meilleur
  demande (« Lesquels » replié, « Changer les câbles » `#dj-fils-changer`) ; puis la courbe (08-courbe-dj, sans
  bascule), puis le profil `.dj-etats` (les unités dans l'en-tête ; chaque état, démarrage, transition et permanent
  compris, a son × `.dj-x` — supprimé, il vaut `null` au profil ; « + État » `#dj-plus` en ajoute, ou rend l'un des
  trois). Chaque groupe dans un `.fi-dj[data-disj][data-part]` que `lierDisjonction` retrouve ; ses câbles dans la
  section commune (`lignesFilsDisjoncteur`).
- **Le récapitulatif** (`08-recap.js`, `style-recap.css`) : `ouvrirBase('moitie'|'page')`, `recapitulatifDe(c)` (l'onglet
  de l'objet, filtré sur lui) ; une colonne `{ k, t, html, tri, texte, option }` (`option` : au choix, pas d'office) ;
  l'état `etatHtml(niveau, mot, bulle)` (`.rc-etat.ok|.att|.ko`) ; une case modifiable `.rc-v[data-f]` a l'air d'un champ
  au survol, se corrige au double-clic — le champ flotte sur la case, la colonne ne saute pas (Tab pour la suivante,
  Échap annule) ; retouchée, elle passe « main », ↺ la rend. Une colonne peut fixer sa largeur (`w`). La barre des
  filtres tient sur une hauteur : les puces d'une même famille se joignent (`.rc-puces-g` : les routes ; problèmes et à
  voir), une puce à zéro s'efface (`.zero`), la rangée qui déborde défile et s'estompe à ses bords. Les lignes d'un repère
  choisi sur le plan gardent un trait à gauche et son nom surligné (`.lie`, `.ici`), pas de fond lourd ; un onglet vide
  a son état vide (`#ba-vide`).
- **La bibliothèque** (`08-bibliotheque.js`, `style-bibliotheque.css`) : `#bibliotheque` couvre la table, le rail et les
  folios (le plan reste dessous, invisible ; les palets s'effacent) ; un document s'ouvre à côté. Au premier lancement,
  l'accueil `.bi-accueil` est UNE composition au centre de la table : la vignette d'un plan `.bi-folio` (une petite
  feuille, son cadre, son cartouche, deux fils aux couleurs des routes — la même sur l'Exemple et « Reprendre ») posée
  sur sa pile, le titre, une phrase, deux gestes, puis l'Exemple sous « Pour essayer » (`.bi-essai`). Une carte
  d'installation se soulève de 3 px au survol, ses feuilles s'écartent. `BIB.vue` dit ce qu'on voit (`'racine'`, `'install'`,
  `'plan'`) ; `montrerBibliotheque(vue, id)`, `montrerLePlan()`, `ouvrirPlan(id)`, `ajouterPlans(fichiers)`. Une carte
  `.bi-carte[data-install]` (`.pile-2`, `.pile-3` : les feuilles dessous ; `.bi-demo` : l'Exemple), une ligne
  `.bi-plan[data-plan]` (`.sur-table`, `.nouveau`), le « ⋯ » `.bi-plus` et sa liste `.bi-pop`, la confirmation
  `.bi-confirme`, le nom qu'on écrit `.bi-nommer`, la zone de dépôt `.bi-zone`, le geste clair sur la table `.bi-btn`
  (`.bi-btn-2` au trait). Le fil de la barre du haut : `#en-biblio` (la marque), `#en-install`, `#en-plan`. Chaque plan
  garde son contrat (`etatDuContrat`, 08-interface) dans IndexedDB (`volta-bibliotheque`) ; `chargerContrat(…, { nouveau
  | planId })` dit quel plan devient le contrat chargé. `atelier.exemple()`, `atelier.bibliotheque()`,
  `atelier.reprendre()`.
- **Vos fichiers** (`08-fichiers.js`, `style-fichiers.css`) : `ficheFichiers(focus?)`, un groupe au filet par entrée
  (`.vf-groupe` ; la bible, les normes et les hypothèses sous l'intertitre « Facultatif ») (état, ce qui
  a été reçu, l'action), la bibliothèque en tête ; elle, le retest et la base disent en une ligne ce qu'ils attendent
  (`.vf-une`, la base avec ses trois colonnes `.vf-cles`) et gardent leur zone de dépôt (`.vf-zone`) tant qu'ils sont
  vides ; « Ce que j'attends » (trois lignes d'exemple, la suite en une phrase, le modèle) est replié, ouvert sur la
  carte qu'on vient chercher ; une erreur s'écrit dans sa carte, une confirmation aussi (« Oublier la base »).
- **La coquille d'un document** (`ouvrirFiche`, 08-interface ; style.css « LES DOCUMENTS ») : la tête reste collée en
  haut quand on défile (un sur-titre, le titre, la croix ; un filet paraît dessous, `#fiche.defile` ; sa hauteur mesurée,
  `--fi-tete`, colle dessous les en-têtes des tables), le premier paragraphe en chapeau 13 px, le pied qui porte UNE
  action pleine ; les gestes secondaires dans un « ··· » `.doc-menu` (Échap, clic ailleurs, ↑ ↓). Les **hypothèses** se
  règlent comme des réglages (un libellé, son champ aligné à droite avec son unité, ce qu'il fait en petit ; une valeur
  changée montre « ↺ » et la valeur de l'outil) ; le **cartouche** se voit d'abord, sur papier, et suit la frappe.
- **Le menu ⋮** (`page.html`, 08-interface `lierMenu` / `montrerPanneau`, 08-menu `lierBullesDuMenu`) : des panneaux
  `.menu-panneau` (`#mp-principal`, `#mp-exporter`, `#mp-plus`) ; une ligne `button[role=menuitem]` porte `data-act`
  (une action) ou `data-sous` (un sous-menu, ouvert en place), une icône au trait, `.menu-l` (son mot ; `small` dessous),
  `.raccourci` ; `[data-retour]` ramène au menu.
- **Une valeur écrite à la main sur une liaison** passe par `changerLiaison` / `changerLiaisons` (08-sections) : une
  entrée d'historique, `l.avant` garde ce que portait le fichier. Le contact choisi à la main vit sur la liaison
  (`contactDe`, `contactVers`) ; la fiche, le récapitulatif, la nomenclature et le contrôle le lisent par
  `contactMain` (08-modules). L'emplacement d'un repère se garde dans les désignations (« repère|emplacement »).
- **L'origine d'une valeur** : `origine('main'|'hyp')` (la fiche ne pose que celles-là) ; **le retour au calcul** :
  `retourAuto(cle, valeurAuto)` → `button.fs-auto[data-auto]` (« ↺ » et la valeur rendue).
- **État** `.fi-etat.ok|.att|.ko` : un point de sa couleur et un mot (l'index, la comparaison).
  La **route** d'un fil est un trait de sa couleur (`.fi-puce`, `.fi-route`).
- **Puce** `.puce` (un filtre ; pressée : le fond doux de l'action, § 4) — `.fi-chip` dans une fiche (un choix ; pressée :
  filet d'encre, fond blanc) ; **segment** `.segment` (le pressé en relief) ; **onglet** `.onglets` > `.onglet` ; **badge**
  `.badge` (un état, en pilule).
- **Carte** `.fi-cadre` ; **tuile** `.fi-tuile` (une étiquette, une valeur forte ; le câble seulement) ; **étiquette** `.fc-k`, `.fi-tuile-k`
  (Inter 500, `--t-2`, avec sa majuscule) ; `.sur`, `th` ailleurs.
- **Ligne de câble** `.fi-fil` (un contact, une ligne de la comparaison, un câble d'une masse) ou `.fi-ia` (un câble et ses mesures) dans une liste
  `.fi-liste` (colonnes portées par la liste, `subgrid` ; en-têtes `.fi-entetes` collés sous la barre).
- **Boutons** : `.btn.cuivre` (plein, à l'encre : l'action principale, une par écran), `.btn.papier` (au trait :
  secondaire), `.btn.lien` (tertiaire, sans soulignement au repos), `.dense` (30 px), `.danger` ; `.fi-bouton` (pied de
  fiche), `.rd` (icône seule, carré gris quand il est pressé). Un lien de document est un `.btn.lien` (plus de `.fi-lien`
  hors d'une fiche).
- **Bulles** : `.bulle` (le nom d'un outil) ; `data-aide` sur une ligne du menu (ce qu'elle fait, en une ou deux
  phrases, 160 signes au plus) ; `data-bulle` partout ailleurs (le pourquoi d'un geste ou d'une valeur — la page des
  normes, la bible, la nomenclature : `lierBullesDoc()`, 08-normes). Jamais `title=` sur un contrôle visible.
- **Le menu « ··· » d'un document** (`menuDoc`, `lierMenusDoc`, 08-normes) : le verre dense des menus ; ouvert, la bulle
  de son bouton se tait.
- **Icônes** : SVG 24 × 24 en traits de 1,5 px, `stroke: currentColor`, dans `ICONES` (08-fiche) ou en ligne.

## 6. Les règles de fabrication

- Français partout (interface, code, commentaires, commits). Aucune dépendance, aucune ressource réseau : les polices
  sont embarquées en data: URI.
- Les identifiants et classes que le code et les tests utilisent restent (`#rail`, `#folios`, `#inspecteur`, `#base`,
  `#fiche`, `#relief`, `#toast`, `#q`, `#menu`, `#vd-*`, `.fi-*`, `.dj-*`, `.cp-*`, `.ix-*`…). On peut ajouter, pas
  renommer sans adapter les tests.
- `node construire.js` assemble ; les batteries sont dans `tests/` (LISEZMOI), `node tests/toutes.js` les passe toutes.
- On regarde son écran avant de livrer, **sur ordinateur (1440 × 900 et 1920 × 1080), dans les deux thèmes** :
  Playwright est là (`NODE_PATH=/opt/node22/lib/node_modules`, chromium `/opt/pw-browsers/chromium`, `colorScheme:
  'dark'` pour le sombre).
- On réécrit proprement plutôt que d'empiler ; un fichier se relit de haut en bas, avec un en-tête qui dit pourquoi.
