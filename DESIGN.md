# DESIGN — la direction du site, pour tout le monde (humain ou agent)

Atelier Schéma est un **outil de conception électrique aéronautique**, hors ligne, dans un seul fichier HTML.
Le lecteur (ingénieur câblage) veut « un vrai outil ELEC, la plus belle expérience utilisateur, les boutons les plus
pertinents, que ça glisse sur les yeux, qu'un BD comprenne tout de suite, que tout soit logique du fil au contact, à la
barrette, au raccord ». Ce document fixe la direction commune ; chaque domaine (le site, les fiches, le disjoncteur,
les contrats déjà faits, le relief, les normes) la décline dans son propre fichier de style.

## 1. L'idée : un calque sur la table lumineuse, une planche de bord autour

- **Le plan est l'objet.** Une feuille blanche posée sur une table quadrillée comme un papier millimétré (des carrés
  de 24 px, un trait plus appuyé tous les 120 px).
- **La planche de bord** — la barre du haut, le rail de gauche, la barre des folios en bas — est **sombre dans les deux
  thèmes**, comme l'auvent d'un cockpit : elle cadre la table et s'efface. Les outils y sont à l'encre claire ; l'outil
  pressé passe en cyan avec un trait contre le bord ; l'état du contrat s'y allume comme un **voyant** (un carré qui
  luit, un mot en capitales, un filet de sa couleur).
- **Les panneaux** (l'inspecteur, le tableau, les documents) sont des feuilles posées à côté de la table, séparées
  d'elle par un filet d'un pixel.
- **L'accueil est un folio** : le cadre gradué (1 à 6, A à D), un petit schéma qui se trace à l'ouverture, les trois
  gestes, et le cartouche collé au coin bas-droit (les routes, le réseau, le format, le folio).

## 2. Les principes

1. **Un coup d'œil, puis un geste.** Chaque écran dit d'abord l'essentiel (une ligne, un chiffre, un état), puis donne
   le détail à qui le demande (déplier, survoler, onglet). Pas de phrase quand un chiffre ou un dessin suffit.
2. **Un langage visuel, pas deux.** Mêmes rayons, mêmes espacements, mêmes couleurs d'état, mêmes composants partout.
3. **La logique des écrans d'alarme.** Le **cyan** dit ce qu'on peut faire (actions, sélection, focus, la sélection sur
   le plan) ; l'**ambre** ce qui est à voir ; le **rouge** ce qui est un problème ; le **vert** ce qui est bon. Pas
   d'autre couleur dans l'interface (les routes des fils gardent les leurs, sur le dessin).
4. **Calme et net.** Pas de dégradé décoratif, pas de verre fumé, des ombres courtes ; des rayons serrés (4, 8, 12) ;
   le gras est rare. La profondeur vient d'un filet d'un pixel.
5. **Précis comme un plan.** Les dessins techniques (faces de connecteur et de module, vue en relief, folios, dessins
   des contrats faits) sont **sur papier quadrillé dans les deux thèmes** et gardent leur encre ; à plat, exacts,
   lisibles à 100 %.
6. **Réactif.** Survoler montre, cliquer fait, glisser règle ; Ctrl+Z défait tout. Les transitions durent 120 à
   200 ms ; le mouvement réduit les coupe.
7. **Tout est faisable à la main**, et tout ce que l'outil propose est un choix par défaut qu'on peut remplacer.

## 3. La typographie (polices embarquées : `polices/`, lues par `construire.js`)

| jeton | police | pour |
|---|---|---|
| `--titre` | **B612** (400, 700) — la police des écrans de cockpit Airbus | les titres (repère d'une fiche, nom d'un document), les étiquettes en petites capitales espacées (10 px, `.12em`, `--t-3`), les lectures chiffrées d'instrument (calibre, admissible, chute, tuiles) |
| `--sans` | **IBM Plex Sans** (400, 500, 600, 400 italique) | le texte courant, les valeurs dans une phrase (chiffres tabulaires) |
| `--mono` | **IBM Plex Mono** (400, 500, 600) | les identifiants : repères, numéros de fil, part numbers, types de câble, cellules du tableau |

Le dessin des folios garde sa propre police à chasse fixe (celle du système), indépendante de ces jetons.
Corps : `--f-11 --f-12 --f-13 --f-14 --f-16 --f-20 --f-28` ; les chiffres sont tabulaires partout où ils s'alignent.

## 4. Les jetons (dans `src/style.css`, `:root`) — on les utilise, on ne les redéfinit pas ailleurs

Trois blocs : `:root` (le clair, complet), `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`
et `:root[data-theme="dark"]` (le sombre, les mêmes valeurs). Un composant ne prend jamais une couleur littérale qui
ne vaut que dans un thème ; les seules couleurs littérales sont dans les dessins sur papier.

| famille | jetons (clair → sombre) |
|---|---|
| la table | `--s-app` #e6ebef → #0b1016 · `--s-grille` / `--s-grille-2` (les deux traits du quadrillage) |
| les surfaces | `--s-surface` #fff → #121920 · `--s-sunken` · `--s-hover` · `--s-line` · `--s-line-2` |
| le papier (les deux thèmes) | `--s-papier` #fff · `--s-papier-grille` #eef2f5 · `--t-papier` #0e1621 |
| l'encre | `--t-1` #0e1621 → #e6ecf2 · `--t-2` · `--t-3` · `--t-inverse` |
| l'accent cyan | `--accent` #08798f → #34c6dc · `--accent-2` (pressé, texte) · `--accent-soft` (fond) · `--accent-line` (filet) · `--on-accent` (texte sur l'accent) |
| les états | `--ok` / `--ok-soft` · `--warn` / `--warn-soft` · `--ko` / `--ko-soft` · `--info` / `--info-soft` |
| la planche de bord | `--p-fond` #101922 → #070b10 · `--p-fond-2` (un champ creusé) · `--p-ligne` · `--p-hover` · `--p-t1` `--p-t2` `--p-t3` · les voyants `--p-accent` `--p-ok` `--p-warn` `--p-ko` |
| le reste | `--bulle` / `--bulle-t` (bulles et mot qui passe) · `--voile` / `--voile-fort` (derrière un calque, une fenêtre) · `--route-a` / `--route-b` (deux routes hors du papier, sur l'accueil) |

Espacements sur une grille de 4 px : `--sp-1` 4 … `--sp-6` 32. Rayons : `--r-1` 4 px (puces, champs, boutons),
`--r-2` 8 px (cartes), `--r-3` 12 px (fenêtres). Ombres : `--sh-1`, `--sh-2`. Transitions : `--rapide` 120 ms,
`--moyen` 200 ms. Les anciens noms (`--cuivre`, `--papier`, `--encre`…) sont des alias des jetons, gardés pour les
feuilles qui les lisent encore.

Géométrie de la page (le plan se recadre dans ce qui reste ; les tests la mesurent) : `--entete` 48 px, `--rail` 48 px
(0 au téléphone, où le rail passe en bas), `--pied` 40 px, `--insp-l` min(440 px, 36vw), `--fiche-l` 400 px,
`--base-h` la hauteur du tiroir du tableau.

## 5. Les composants communs (noms de classes, à réutiliser tels quels)

- **État** `.fi-etat.ok|.att|.ko` : un voyant carré de 8 px et un mot. Sur la fiche, la carte d'état (`details.fi-etat`)
  est une feuille avec un trait de 3 px de sa couleur à gauche ; sur la planche de bord, un voyant allumé. La **route**
  d'un fil est un trait de 14 × 3 px (`.fi-puce`, `.fi-route`).
- **Puce** `.fi-chip` (un choix) ; **sélecteur** `.dj-chips` (une valeur parmi une gamme, sept crans jugés : le cran
  retenu à l'encre, sous chaque chiffre son voyant).
- **Carte** `.fi-cadre` (filet 1 px, rayon `--r-2`) ; **tuile** `.fi-tuile` (un chiffre en B612, ce qu'il compte) ;
  **étiquette** `.fi-nomen-t`, `.sur`, `th` (B612, 10 px, capitales espacées, `--t-3`).
- **Faits** `.fi-faits` (`dl` : clé en étiquette, valeur en linéale, identifiants en chasse fixe).
- **Ligne de fil** `.fi-fil` (grille : contact · route · type · contact à sertir · destination · numéro en retrait).
- **Boutons** : `.btn.cuivre` (plein, cyan : l'action principale, une par écran), `.btn.papier` (secondaire), `.btn.lien`,
  `.fi-bouton` (pied de fiche), `.fi-lien` (texte, cyan), `.rd` (icône seule ; sur la planche de bord, encre claire).
- **Icônes** : SVG 24 × 24 en traits de 1,5 px, `stroke: currentColor`, dans `ICONES` (08-fiche) ou en ligne.

## 6. Les règles de fabrication

- Français partout (interface, code, commentaires, commits). Aucune dépendance, aucune ressource réseau : les polices
  sont embarquées en data: URI.
- Les identifiants et classes que le code et les tests utilisent restent (`#rail`, `#folios`, `#inspecteur`, `#base`,
  `#fiche`, `#relief`, `#toast`, `#q`, `#menu`, `#vd-*`, `.fi-*`, `.dj-*`, `.cp-*`, `.ix-*`…). On peut ajouter, pas
  renommer.
- `node construire.js` assemble ; les batteries sont dans `tests/` (LISEZMOI), `node tests/toutes.js` les passe toutes.
- On regarde son écran avant de livrer, **dans les deux thèmes et au téléphone** : Playwright est là
  (`NODE_PATH=/opt/node22/lib/node_modules`, chromium `/opt/pw-browsers/chromium`, `colorScheme: 'dark'` pour le
  sombre).
- On réécrit proprement plutôt que d'empiler ; un fichier se relit de haut en bas, avec un en-tête qui dit pourquoi.
