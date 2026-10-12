# DESIGN — la direction du site, pour tout le monde (humain ou agent)

**Volta** (deux syllabes : le volt, l'électricité) est un **outil de conception électrique aéronautique**, hors ligne, dans un seul fichier HTML, utilisé
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
- **Autour, rien ne brille.** La barre du haut (la marque « Volta », qui mène à la bibliothèque, et à côté un **fil
  discret** — l'install, le plan —, la recherche, le menu ⋮ — rien d'autre), le rail de gauche et la barre des folios
  sont du **blanc des panneaux**, séparés de la table par un filet. L'outil pressé se pose dans un carré gris ; le folio
  courant est une pastille à l'encre.
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
  dans le récapitulatif) ; c'est la seule autre couleur.
- **Les panneaux** (l'inspecteur, le récapitulatif, les documents) sont des feuilles blanches posées à côté de la
  table, avec une ombre large et légère.
- **L'ouverture est la bibliothèque**, posée sur la table noire (le lecteur : « on choisit notre install et on a
  directement ses plans » ; plus de page d'exemple qui explique). Une **install** (une installation : telle antenne,
  tel cockpit) est une **pile de feuilles** — son nom, combien de plans, sa dernière ouverture, ses premiers plans ;
  ses **plans** (un plan = un retest) se lisent sur une feuille, une ligne chacun (nom, harness et dessins, liaisons,
  folios, dernière ouverture) ; un clic ouvre le plan sur la table, avec ses folios. Le plan resté sur la table se
  reprend d'un clic (« Reprendre », Échap). Rien encore : ce qu'est une install en une phrase, « Nouvelle install »,
  « Déposer la base des contrats déjà faits » (une colonne Install range chaque install et ses plans). L'**Exemple** est
  une install de démonstration, discrète (un cadre au trait), en dernier. Renommer sur place, supprimer avec une
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
| la table (la même dans les deux thèmes) | `--s-app` #0f0f11 · `--s-grille` #2b2b31 (les points) · `--t-table` #ececf0 / `--t-table-2` / `--t-table-warn` (ce qui s'écrit à même la table : l'attente d'un folio, la bibliothèque) · `--l-table` / `--l-table-2` (ses filets) · `--s-table-champ` / `--s-table-survol` (un champ, un survol posés sur elle) |
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
`--sh-feuille` (la feuille sur la table noire : profonde, la même dans les deux thèmes — le folio, la feuille des plans),
`--sh-panneau` (un panneau contre la table). Transitions : `--rapide`
120 ms, `--moyen` 200 ms. Les anciens noms (`--cuivre`, `--papier`, `--encre`…) sont des alias des jetons.

Géométrie de la page (le plan se recadre dans ce qui reste ; les tests la mesurent) : `--entete` 48 px, `--rail` 48 px,
`--pied` 40 px, `--insp-l` 440 px (jusqu'à 560 sur un grand écran, jamais plus de 36vw), `--fiche-l` 400 px (les
normes et la bible : jusqu'à 1040 px, en laissant toujours 320 px au plan), `--base-h` la hauteur du tiroir du bas.

## 5. Les composants communs (noms de classes, à réutiliser tels quels)

- **La fiche v4** (`08-fiche.js`, `style-fiche.css`), de haut en bas, pour toutes les fiches :
  · la **barre** `.fi-nav` (‹ `#fi-prec`, › `#fi-suiv`, `.fi-nav-nom` qui paraît quand `.fi.defile`, × `#in-fermer`) ;
  · l'**en-tête** `.fi-entete` : `.fi-symbole`, `.fi-genre` — le type (`#eq-nature`, une liste qui a l'air d'un mot :
  celui du code du repère, une autre nature à la main, ↺ ; la même que la colonne Nature du récapitulatif) et la
  désignation (`#eq-des`, invisible vide hors du survol) —, le repère `input.fi-nom` (`#eq-rep` / `#fil-num`, F2) et
  `#fi-crayon`. **Plus de tuiles ni d'identité**, sauf pour un câble : ses tuiles `.fi-tuiles > .fi-tuile[.edit][.ko|.att]`
  (`tuile(étiquette, valeur, { etat, mono, edit })`) portent le type et la longueur — qui s'y écrivent —, la gauge,
  l'intensité ;
  · les **problèmes** `details.fi-alerte#fi-pbs` (repliée : `summary#fi-pb` « 3 problèmes · 7 à voir ») ; dépliée,
  une ligne `.fi-pb-l[data-voir][data-connecteur][data-viser]` par point, la section en petit (`.fi-pb-s`) ; une
  barrette à poser met dessous `.fi-poser` (« Poser au contrat sous 102VT1 ») ;
  · les **sections** (ci-dessous), puis le **pied** `.fi-pied` (Récapitulatif → `recapitulatifDe(cible)`, « + Câble »,
  Relief, « ··· »).
  Dans une section : des **champs** `.fs-champs > .fc` (`.fc-k` l'étiquette, `.fc-v` la valeur ou son champ `.fc-in`
  qui a l'air d'une valeur et s'écrit d'un clic, `.fc-sous` une valeur seconde en petit, `.fc-o` « main » et ↺), des
  **groupes** `groupeSection(titre, contenu, { droite, aide })` (un petit titre `.fs-st` et son « ? », un filet
  au-dessus du suivant), des **tableaux** sobres aux en-têtes collés (`.fi-entetes`, avec leur « ? ») : les contacts
  `.fi-contacts` (Borne · Contact · Gauge ✓/✗ · Câble en petit `.fi-cab-n`, « ″ » pour le même contact qu'au-dessus),
  les **câbles** `.fi-ias.fi-cables` (une ligne `.fi-ia` sur deux rangs : en haut le numéro `.fi-num-b` qui ouvre sa
  fiche, la barre `.fi-barre` de l'intensité contre l'admis — elle se remplit à l'entrée —, la chute `.fi-u` de la couleur
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
  badge?: { t, etat }, contenu, vide? }])` rend des **cartes** (`details.fs`, une icône `.fs-ico` par section) dans
  l'ordre `ORDRE_SECTIONS` : Calibre (`disjoncteur`), Connecteur ou Module (`connecteur`), Raccord (`raccord`), De →
  vers (`trajet`, un câble), Câbles (`fils` : l'intensité ET la chute), Déjà fait — plus d'Identité ;
  `OUVERTES_D_OFFICE` par type (`equipement`, `disjoncteur`, `barrette`, `prise`, `masse`, `fil`) ; la mémoire par type
  (`atelier.fiche.sections.v4`) ; `ouvrirSection(box, cle)` l'ouvre, l'amène et l'allume (`.fs-allume`). Une section sans
  donnée garde sa place, en pointillé, et dit ce qui manque (`vide`). `rafraichirFicheEnPlace()` refait la fiche autour
  du champ qu'on écrit (la main y reste).
- **Le connecteur** d'un équipement : les segments `.fi-segs .seg[data-connecteur]` (A · B · C, le fautif marqué), puis
  pour le montré : la **norme d'abord** — l'arrangement en puce `.fi-norme-puce[data-face]` (un clic montre la face ;
  « Changer » les autres arrangements ; son « ? ») —, dessous en petit la famille `.fi-fam` et le part number `.fi-pn`
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
  d, o, probs)` — le calibre retenu en grand `.dj-heros` (`.dj-h-cal`, sa pastille `.dj-verdict-pastille.ok|.att|.ko` :
  « Valide — ne déclenche pas », « Juste — touche la courbe », « Déclenche » ; d'où il vient — automatique (le meilleur),
  à la main (↺ `[data-dj-geste="rendre"]`, le retest), le retest — ; le meilleur `.dj-m-mot`, son pourquoi au survol),
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
  au survol, se corrige au double-clic (Tab pour la suivante, Échap annule) ; retouchée, elle passe « main », ↺ la rend.
- **La bibliothèque** (`08-bibliotheque.js`, `style-bibliotheque.css`) : `#bibliotheque` couvre la table, le rail et les
  folios (le plan reste dessous) ; un document s'ouvre à côté. `BIB.vue` dit ce qu'on voit (`'racine'`, `'install'`,
  `'plan'`) ; `montrerBibliotheque(vue, id)`, `montrerLePlan()`, `ouvrirPlan(id)`, `ajouterPlans(fichiers)`. Une carte
  `.bi-carte[data-install]` (`.pile-2`, `.pile-3` : les feuilles dessous ; `.bi-demo` : l'Exemple), une ligne
  `.bi-plan[data-plan]` (`.sur-table`, `.nouveau`), le « ⋯ » `.bi-plus` et sa liste `.bi-pop`, la confirmation
  `.bi-confirme`, le nom qu'on écrit `.bi-nommer`, la zone de dépôt `.bi-zone`, le geste clair sur la table `.bi-btn`
  (`.bi-btn-2` au trait). Le fil de la barre du haut : `#en-biblio` (la marque), `#en-install`, `#en-plan`. Chaque plan
  garde son contrat (`etatDuContrat`, 08-interface) dans IndexedDB (`volta-bibliotheque`) ; `chargerContrat(…, { nouveau
  | planId })` dit quel plan devient le contrat chargé. `atelier.exemple()`, `atelier.bibliotheque()`,
  `atelier.reprendre()`.
- **Vos fichiers** (`08-fichiers.js`, `style-fichiers.css`) : `ficheFichiers(focus?)`, une carte par entrée (état, ce qui
  a été reçu, l'action), la bibliothèque en tête ; elle, le retest et la base disent en une ligne ce qu'ils attendent
  (`.vf-une`, la base avec ses trois colonnes `.vf-cles`) et gardent leur zone de dépôt (`.vf-zone`) tant qu'ils sont
  vides ; « Ce que j'attends » (trois lignes d'exemple, la suite en une phrase, le modèle) est replié, ouvert sur la
  carte qu'on vient chercher ; une erreur s'écrit dans sa carte, une confirmation aussi (« Oublier la base »).
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
- **Puce** `.fi-chip` (un choix ; pressée : filet d'encre, fond blanc) ; **segment** `.segment` (le pressé en relief).
- **Carte** `.fi-cadre` ; **tuile** `.fi-tuile` (une étiquette, une valeur forte ; le câble seulement) ; **étiquette** `.fc-k`, `.fi-tuile-k`
  (Inter 500, `--t-2`, avec sa majuscule) ; `.sur`, `th` ailleurs.
- **Ligne de câble** `.fi-fil` (un contact, une ligne de la comparaison, un câble d'une masse) ou `.fi-ia` (un câble et ses mesures) dans une liste
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
