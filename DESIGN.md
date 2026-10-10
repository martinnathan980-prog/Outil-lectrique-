# DESIGN — la direction du site, pour tout le monde (humain ou agent)

Atelier Schéma est un **outil de conception électrique aéronautique**, hors ligne, dans un seul fichier HTML, utilisé
**sur ordinateur** (la tablette et le téléphone ne sont pas des cibles : le code qui les sert reste, on ne le soigne
plus). Le lecteur (ingénieur câblage) veut « quelque chose de fluide, de classe, d'épuré, de beau, de compréhensible —
une très belle expérience utilisateur ; toujours penser à l'utilisateur, ne jamais le perdre, un fil conducteur ; tout
calculé automatiquement, mais tout modifiable ». Il a écarté le style « futuriste IA » (cyan, chrome noir) et choisi
**« Graphite »**. Ce document fixe la direction commune ; chaque domaine la décline dans son propre fichier de style.

## 1. L'idée : « Graphite », un logiciel d'atelier haut de gamme

- **Le plan est l'objet.** Une feuille blanche posée sur une **table noire** — un graphite presque noir, le même dans
  les deux thèmes, semé de points discrets (un tous les 24 px) — par une ombre profonde (le lecteur : « au lieu de le
  mettre blanc, tu pouvais le mettre noir… c'était incroyable »). Ce qui s'écrit à même la table prend l'encre de la
  table (`--t-table`) ; ce qui flotte dessus (le mot qui passe, les bulles) porte un filet clair qui l'en détache.
- **Autour, rien ne brille.** La barre du haut (la marque, la recherche, le menu ⋮ — rien d'autre), le rail de gauche
  et la barre des folios sont du **blanc des panneaux**, séparés de la table par un filet. L'outil pressé se pose dans
  un carré gris ; le folio courant est une pastille à l'encre.
- **Le menu ⋮ tient en six lignes** (le lecteur : « on n'en utilise que 10-20 % ») : Ouvrir un retest · Vos fichiers
  (« retest · contrats déjà faits · bible · normes » écrit dessous : c'est là qu'on dépose la grande base) ·
  Récapitulatif · Nomenclature · Exporter › (SVG, PNG, imprimer, le suivi) · Plus › (coller, l'exemple, la bible, les
  normes, les hypothèses, le cartouche, tout effacer). Un sous-menu s'ouvre **en place** : le menu garde sa largeur, une
  ligne « ‹ » ramène. Chaque ligne a sa bulle courte ; au clavier ↑ ↓, Entrée, → ouvre, ← ou Échap revient.
- **L'interface est à l'encre.** Le texte et les actions sont graphite : le bouton principal est noir, la sélection en
  gris doux, le focus cerclé d'encre. **La couleur ne dit que l'état** : vert ce qui est bon, ambre ce qui est à voir,
  rouge ce qui est un problème. Les routes des fils gardent leurs couleurs (sur le dessin, et pour le trait d'un fil
  dans le récapitulatif) ; c'est la seule autre couleur.
- **Les panneaux** (l'inspecteur, le récapitulatif, les documents) sont des feuilles blanches posées à côté de la
  table, avec une ombre large et légère.
- **L'accueil est un folio** posé sur la table : le cadre gradué, un petit schéma, et peu de mots (« je n'ai pas envie
  de lire »). Votre retest et vos contrats déjà faits **côte à côte, de même taille**, chacun sa zone de dépôt et ce
  qu'il attend en une ligne (la base : un seul Excel, une ligne par liaison — Harness la machine, FWD le dessin,
  Appareil le contrat) ; la bible et les normes, embarquées, en une ligne. L'exemple s'ouvre d'un clic, et un bandeau
  le rappelle tant qu'on le regarde. Tout se retrouve ensuite dans « Vos fichiers ».
- **Le récapitulatif** est le tiroir du bas (B), en moitié ou en page : dix onglets (liaisons, équipements,
  disjoncteurs, barrettes, prises, fils et câbles, contacts, raccords, problèmes, normes). Une liaison s'y lit comme
  une phrase : de → le trait du fil à la couleur de sa route, épais selon sa jauge → vers.

## 2. Les principes

1. **Le fil conducteur.** Chaque fiche a le **même squelette** (la fiche v3, 08-sections.js) : l'en-tête et ses
   tuiles, la barre des problèmes repliée, puis **peu de sections**, des cartes dans un ordre fixe, qui se lisent encore
   fermées (une icône, un titre, une ligne de résumé, une pastille d'état). On ouvre d'office ce qui définit l'objet ;
   « Déjà fait » attend un clic, et l'outil se souvient de ce que l'ingénieur ouvre, par type. Naviguer d'un objet à
   l'autre ne le perd jamais : la barre collée en haut de la fiche (‹ ›, Alt+← / Alt+→, une pile de 30 ; le repère s'y
   écrit quand l'en-tête passe dessous) — plus de fil d'Ariane (le folio se lit en bas, on ne se répète pas) ; ouvrir
   une fiche ne déplace pas le plan si l'objet est déjà en vue.
2. **Un coup d'œil, puis un geste.** Chaque écran dit d'abord l'essentiel (une tuile, un chiffre, un état — « Calibre
   10 A », bordée d'ambre quand le meilleur est ailleurs), puis donne le détail à qui le demande : le pourquoi d'un
   chiffre se lit dans la **bulle du survol**, pas dans des phrases. Les problèmes ne sont jamais déroulés d'office :
   une barre dit combien, sous l'en-tête, et se déplie en place.
3. **Tout est calculé, tout est modifiable.** Un clic sur une valeur l'écrit. L'origine reste discrète : une pastille
   « main » seulement quand la valeur a été changée ici (« hyp. » pour une hypothèse de la simulation) ; « ↺ » (la
   valeur qu'il rend, en petit) rend le calcul ou le fichier. Ctrl+Z défait tout.
4. **Un langage visuel, pas deux.** Mêmes coins (6, 8, 10, 14), mêmes espacements (grille de 4), mêmes couleurs
   d'état, mêmes composants partout.
5. **Calme et net, pas gris.** Pas de dégradé décoratif, pas de lueur, pas de capitales espacées. Les étiquettes ont
   leur majuscule (« Part number », « Emplacement ») et l'encre seconde (`--t-2`, jamais `--t-3` pour ce qu'on doit
   lire) ; les valeurs l'encre (`--t-1`), nettes ; les titres de section affirmés (demi-gras 15 px) ; les groupes
   cadrés (une carte, un filet) et espacés (12 à 16 px). Le demi-gras pour les titres, le gras est rare.
6. **Précis comme un plan.** Les dessins techniques (folios, faces de connecteur et de module, reliefs, courbes) sont
   **sur papier blanc dans les deux thèmes** et gardent leur encre ; à plat, exacts, lisibles à 100 %. Une courbe est
   lisse et monotone ; une légende ne se sépare pas de ce qu'elle nomme. Le numéro d'un fil s'écrit **pile sur son
   fil** — son milieu sur l'axe du trait, qui s'interrompt derrière lui (un fond de papier) —, debout de même sur un
   vertical ; à côté seulement quand la place manque (un fil court, le pointillé d'une barrette).
7. **Réactif.** Survoler montre, cliquer fait, glisser règle. Les transitions durent 120 à 200 ms ; le mouvement
   réduit les coupe.
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

Trois blocs : `:root` (le clair, complet), `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`
et `:root[data-theme="dark"]` (le sombre, les mêmes valeurs). Un composant ne prend jamais une couleur littérale qui
ne vaut que dans un thème ; les seules couleurs littérales sont dans les dessins sur papier. Chaque encre passe l'AA
(4,5:1) sur chaque fond où elle se pose.

| famille | jetons (clair → sombre) |
|---|---|
| la table (la même dans les deux thèmes) | `--s-app` #0f0f11 · `--s-grille` #2b2b31 (les points) · `--t-table` #ececf0 / `--t-table-2` (ce qui s'écrit à même la table : l'attente d'un folio) |
| les surfaces | `--s-surface` #fff → #1c1c1e · `--s-sunken` · `--s-hover` · `--s-line` · `--s-line-2` · `--s-flottant` (menus, listes, bulles) |
| le papier (les deux thèmes) | `--s-papier` #fff · `--s-papier-grille` · `--t-papier` #1d1d1f · `--t-papier-2` ; `.ilot-clair` rend tous les jetons clairs à un îlot |
| l'encre | `--t-1` #1d1d1f → #f2f2f5 · `--t-2` #47474c · `--t-3` #636369 → #96969d · `--t-inverse` |
| l'action (à l'encre) | `--accent` #1d1d1f → #f2f2f5 (le bouton principal, le folio courant, le focus) · `--accent-2` (survol) · `--accent-soft` (fond de ce qui est choisi ou pressé) · `--accent-line` · `--on-accent` |
| les états | `--ok` / `--ok-soft` · `--warn` / `--warn-soft` · `--ko` / `--ko-soft` · `--info` / `--info-soft` (neutre) |
| les barres | `--p-fond` (blanc) · `--p-fond-2` (un champ) · `--p-ligne` · `--p-hover` · `--p-t1` `--p-t2` `--p-t3` · `--p-accent` `--p-ok` `--p-warn` `--p-ko` |
| les courbes | `--courbe-chaud` · `--courbe-tiede` · `--courbe-froid` |
| le reste | `--bulle` / `--bulle-t` / `--sh-bulle` (un filet clair la détache de la table noire) · `--voile` / `--voile-fort` · `--route-a` / `--route-b` · `--route-voile` · `--anneau` (l'anneau d'un champ qui a le clavier) |

Espacements sur une grille de 4 px : `--sp-1` 4 … `--sp-6` 32. Coins : `--r-1` 6 px (puces, champs), `--r-btn` 8 px
(boutons, segments, recherche), `--r-2` 10 px (cartes), `--r-3` 14 px (fenêtres). Ombres : `--sh-1`, `--sh-2`,
`--sh-feuille` (la feuille sur la table noire : profonde, la même dans les deux thèmes — le folio, l'accueil),
`--sh-panneau` (un panneau contre la table). Transitions : `--rapide`
120 ms, `--moyen` 200 ms. Les anciens noms (`--cuivre`, `--papier`, `--encre`…) sont des alias des jetons.

Géométrie de la page (le plan se recadre dans ce qui reste ; les tests la mesurent) : `--entete` 48 px, `--rail` 48 px,
`--pied` 40 px, `--insp-l` 440 px (jusqu'à 560 sur un grand écran, jamais plus de 36vw), `--fiche-l` 400 px (les
normes et la bible : jusqu'à 1040 px, en laissant toujours 320 px au plan), `--base-h` la hauteur du tiroir du bas.

## 5. Les composants communs (noms de classes, à réutiliser tels quels)

- **La fiche v3** (`08-fiche.js`, `style-fiche.css`), de haut en bas, pour toutes les fiches :
  · la **barre** `.fi-nav` (‹ `#fi-prec`, › `#fi-suiv`, `.fi-nav-nom` qui paraît quand `.fi.defile`, × `#in-fermer`) ;
  · l'**en-tête** `.fi-entete` : `.fi-symbole`, `.fi-genre` (le type, la désignation), le repère `input.fi-nom`
  (`#eq-rep` / `#fil-num`, F2) et `#fi-crayon`, puis les **tuiles** `.fi-tuiles > .fi-tuile[.ko|.att][data-aller]`
  (`tuile(étiquette, valeur, { aller, etat, mono })` : une étiquette `.fi-tuile-k`, une valeur forte `.fi-tuile-v`,
  le bord et la valeur de la couleur d'état ; un clic ouvre et allume sa section) ;
  · les **problèmes** `details.fi-alerte#fi-pbs` (repliée : `summary#fi-pb` « 3 problèmes · 7 à voir ») ; dépliée,
  une ligne `.fi-pb-l[data-voir][data-connecteur][data-viser]` par point, la section en petit (`.fi-pb-s`) ;
  · les **sections** (ci-dessous), puis le **pied** `.fi-pied`.
  Dans une section : des **champs** `.fs-champs > .fc` (`.fc-k` l'étiquette, `.fc-v` la valeur ou son champ `.fc-in`
  qui a l'air d'une valeur et s'écrit d'un clic, `.fc-aide` une précision courte, `.fc-o` « main » et ↺), des **groupes**
  `groupeSection(titre, contenu, { droite })` (un petit titre `.fs-st`, un filet au-dessus du suivant), des **tableaux**
  sobres aux en-têtes collés (`.fi-entetes`) : les contacts `.fi-contacts` (Borne · Contact · Jauge ✓/✗, « ″ » pour le
  même contact qu'au-dessus), les fils `.fi-ias` (une ligne `.fi-ia` de ≈ 32 px : numéro, AWG, barre `.fi-barre` de
  l'intensité contre l'admis, chute `.fi-u` en volts de la couleur d'état ; les fils en défaut en tête), les paires
  d'une prise `.fi-paires`, l'habillage `.fi-nomen` (une `.fi-piece[data-role]` par pièce, dans l'ordre de montage du moteur
  `h.pieces` : rôle, référence, quantité, état ; « vérifié » ne s'écrit pas, « à confirmer » en ambre, « manque » en rouge).
  La **bulle** : tout `[data-bulle]` dit son pourquoi au survol (`.fi-bulle`, texte sur plusieurs lignes).
- **La fiche à sections** (`08-sections.js`, `style-sections.css`) : `ficheSections(type, [{ cle, titre?, resume?,
  badge?: { t, etat }, contenu, vide? }])` rend des **cartes** (`details.fs`, une icône `.fs-ico` par section) dans
  l'ordre `ORDRE_SECTIONS` : identité (repère, zone, désignation, emplacement), disjoncteur, connecteur (ou module), de →
  vers (un fil), fils (l'intensité ET la chute), déjà fait ; `OUVERTES_D_OFFICE` par type ; la mémoire par type
  (`atelier.fiche.sections.v3`) ; `ouvrirSection(box, cle)` l'ouvre, l'amène et l'allume (`.fs-allume`). Une section sans
  donnée garde sa place, en pointillé, et dit ce qui manque (`vide`). Plus de « Problèmes » en bas, plus de « Détail du
  calcul », plus de « Chute » ni d'« Habillage » à part. `rafraichirFicheEnPlace()` refait la fiche autour du champ
  qu'on écrit (la main y reste).
- **Le connecteur** d'un équipement : les segments `.fi-segs .seg[data-connecteur]` (A · B · C, le fautif marqué), puis
  pour le montré : le part number (toutes ses liaisons d'un geste), la norme en puce `.fi-norme-puce[data-face]` (un clic
  montre la face ; « Changer » les autres arrangements), les bornes en plages (« A1 à A11 »), les contacts (le sexe en
  puces jointes à droite), l'habillage. Une barrette et une prise : la même section (« Module », « Connecteur »), la
  **face vivante** (survoler un contact allume son fil et sa ligne, un clic le choisit : `.choisi`).
- **La fiche du disjoncteur** (`08-disjoncteurs.js`, `style-dj.css`) : UNE section, `sectionDisjoncteur(nom, d, o,
  probs)` — le part number, la gamme en segments `.dj-chips .dj-chip[data-cal]` (ceux de `d.gamme`, jamais une liste
  écrite ; le retenu pressé, le meilleur étoilé), la ligne du meilleur `.dj-meilleur` quand il diffère ou que des fils
  sont à grossir (Retenir, Changer les fils, « Lesquels » replié, le pourquoi au survol), la courbe, le profil
  (démarrage, transition, permanent, puis les états ajoutés). Chaque groupe dans un `.fi-dj[data-disj][data-part]` que
  `lierDisjonction` retrouve ; ses fils dans la section commune (`lignesFilsDisjoncteur`). Une courbe : Fritsch-Carlson
  en log-log, trois décimales, une seule bande par défaut, chaque trait nommé à son bout.
- **Le récapitulatif** (`08-recap.js`, `style-recap.css`) : `ouvrirBase('moitie'|'page')`, `recapitulatifDe(c)` ; une case
  se corrige au double-clic (Tab pour la suivante, Échap annule) ; une case calculée retouchée passe « main », ↺ la rend.
- **Vos fichiers** (`08-fichiers.js`, `style-fichiers.css`) : `ficheFichiers(focus?)`, une carte par entrée (état, ce qui
  a été reçu, l'action) ; le retest et la base disent en une ligne ce qu'ils attendent (`.vf-une`, la base avec ses trois
  colonnes `.vf-cles`) et gardent leur zone de dépôt (`.vf-zone`) tant qu'ils sont vides ; « Ce que j'attends » (trois
  lignes d'exemple, la suite en une phrase, le modèle) est replié, ouvert sur la carte qu'on vient chercher ; une erreur
  s'écrit dans sa carte.
- **Le menu ⋮** (`page.html`, 08-interface `lierMenu` / `montrerPanneau`, 08-accueil `lierBullesDuMenu`) : des panneaux
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
- **Puce** `.fi-chip` (un choix ; pressée : filet d'encre, fond blanc) ; **segment** `.segment` (le pressé en relief).
- **Carte** `.fi-cadre` ; **tuile** `.fi-tuile` (une étiquette, une valeur forte) ; **étiquette** `.fc-k`, `.fi-tuile-k`
  (Inter 500, `--t-2`, avec sa majuscule) ; `.sur`, `th` ailleurs.
- **Ligne de fil** `.fi-fil` (un contact, une ligne de la comparaison) ou `.fi-ia` (un fil et ses mesures) dans une liste
  `.fi-liste` (colonnes portées par la liste, `subgrid` ; en-têtes `.fi-entetes` collés sous la barre).
- **Boutons** : `.btn.cuivre` (plein, à l'encre : l'action principale, une par écran), `.btn.papier` (secondaire),
  `.btn.lien`, `.fi-bouton` (pied de fiche), `.fi-lien`, `.rd` (icône seule, carré gris quand il est pressé).
- **Bulles** : `.bulle` (le nom d'un outil) ; `data-aide` sur une ligne du menu (ce qu'elle fait, en une ou deux
  phrases, 160 signes au plus).
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
