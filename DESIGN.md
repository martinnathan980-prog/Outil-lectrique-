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

1. **Le fil conducteur.** Chaque fiche a le **même squelette** (08-sections.js) : l'en-tête, puis des sections dans
   un ordre fixe, qui se lisent encore fermées (un titre, une ligne de résumé, une pastille d'état). On ouvre d'office
   ce qui définit l'objet ; le reste attend un clic, et l'outil se souvient de ce que l'ingénieur ouvre, par type.
   Naviguer d'un objet à l'autre ne le perd jamais : la barre collée en haut de la fiche (‹ ›, Alt+← / Alt+→, une pile
   de 30) et le fil d'Ariane (Contrat › Folio › Repère › connecteur › Fil) ; ouvrir une fiche ne déplace pas le plan
   si l'objet est déjà en vue.
2. **Un coup d'œil, puis un geste.** Chaque écran dit d'abord l'essentiel (une ligne, un chiffre, un état — « le
   meilleur calibre : 15 A »), puis donne le détail à qui le demande. Les problèmes ne sont jamais déroulés d'office :
   une pastille dit combien.
3. **Tout est calculé, tout est modifiable.** Une valeur porte son **origine** (auto, retest, main, hyp., norme) ;
   forcée à la main, « ↺ automatique (la valeur calculée) » la rend. Ctrl+Z défait tout.
4. **Un langage visuel, pas deux.** Mêmes coins (6, 8, 10, 14), mêmes espacements (grille de 4), mêmes couleurs
   d'état, mêmes composants partout.
5. **Calme et net.** Pas de dégradé décoratif, pas de lueur, pas de capitales espacées : les étiquettes sont des mots
   en minuscules, comme une phrase. Le demi-gras pour les titres, le gras est rare.
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
| `--sans` (et `--titre`, son alias) | **Inter** (400, 500, 600, 700, 400 italique) | tout le texte : titres en 600 serrés (`letter-spacing:-.01em` à `-.02em`), étiquettes en 500 12 px `--t-3`, valeurs, chiffres tabulaires |
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

- **La fiche à sections** (`08-sections.js`, `style-sections.css`) : `ficheSections(type, [{ cle, titre?, resume?,
  badge?: { t, etat }, contenu, vide? }])` rend les sections dans l'ordre `ORDRE_SECTIONS` (identité, meilleur
  calibre, courbe, profil, connecteur, contacts, fils et intensité, chute, habillage, déjà fait, détail du calcul,
  problèmes) ; `OUVERTES_D_OFFICE` par type ; la mémoire par type (`atelier.fiche.sections`) ; `ouvrirSection(box,
  cle)` pour un lien « voir ». Une section sans donnée garde sa place, grise, et dit ce qui manque (`vide`).
- **La fiche du disjoncteur** (`08-disjoncteurs.js`, `style-dj.css`) : `sectionsDisjoncteur(nom, vt)` rend ses sections
  (le meilleur calibre, la courbe, le profil, les fils, la chute, le détail), que la fiche insère parmi les communes ;
  chaque contenu dans un `.fi-dj[data-disj][data-part]` que `lierDisjonction` retrouve. Une courbe : Fritsch-Carlson en
  log-log, trois décimales, une seule bande par défaut, chaque trait nommé à son bout.
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
  entrée d'historique, `l.avant` garde ce que portait le fichier. Le contact à sertir choisi à la main vit sur la
  liaison (`contactDe`, `contactVers`) ; la fiche, le récapitulatif, la nomenclature et le contrôle le lisent par
  `contactMain` (08-modules).
- **L'origine d'une valeur** : `origine('auto'|'retest'|'main'|'hyp'|'norme')` ; **le retour au calcul** :
  `retourAuto(cle, valeurAuto)` → `button.fs-auto[data-auto]`.
- **État** `.fi-etat.ok|.att|.ko` : un point de sa couleur et un mot ; une carte d'état repliée en tête de fiche.
  La **route** d'un fil est un trait de sa couleur (`.fi-puce`, `.fi-route`).
- **Puce** `.fi-chip` (un choix ; pressée : filet d'encre, fond blanc) ; **segment** `.segment` (le pressé en relief).
- **Carte** `.fi-cadre` ; **tuile** `.fi-tuile` (un chiffre, ce qu'il compte) ; **étiquette** `.sur`, `th` (Inter 500
  12 px, `--t-3`, en minuscules).
- **Faits** `.fi-faits` (`dl` : clé en étiquette, valeur en linéale, identifiants en chasse fixe).
- **Ligne de fil** `.fi-fil` dans une liste `.fi-liste` (colonnes portées par la liste, `subgrid`).
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
