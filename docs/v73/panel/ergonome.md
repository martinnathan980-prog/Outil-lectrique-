# Panel v73 — l'ergonome

> Spécialiste de l'utilisabilité et de l'accessibilité des outils professionnels. Je juge avec des chiffres et des règles
> (WCAG 2.2 AA, plus deux règles maison : 32 px de cible sur ordinateur, 9 px pour une écriture qu'on doit lire).
> Tout ce qui suit a été **mesuré dans la page** (Playwright, Chromium), en **1440 × 900 et 1920 × 1080**, en **clair et en
> sombre**, à la vraie souris et au clavier — et la plupart des mesures sont maintenant une batterie, `tests/ux.js`, qui
> rejouera le même jugement après les corrections (§ 6).

Captures : `avant/` — mes captures nommées par écran, thème, largeur (`…-clair-1440.png`), et `avant/ux/` celles de la
batterie, une par écran et par passe (`menu-1440-sombre.png`). Les sorties brutes de la batterie : `ux-sortie.txt`.

---

## 1. Mes notes sur 10

| | note | en une phrase |
|---|---|---|
| **Beauté** | **7** | La nuit bleue, les palets de verre et les cartes sont classes et cohérents ; mais le détail trahit : des « ? » gris pâle de 17 px, des anneaux de focus invisibles, des champs sans bord, du 11 px partout dans les fiches. |
| **Clarté** | **6** | Chaque écran dit l'essentiel, mais le plan lui-même ne se lit pas à l'écran (numéros de câble de **3,8 px** cadré, **6,5 px** à « 100 % »), et le cadran du calibre montre sept calibres dont aucun ne se choisit. |
| **Fluidité** | **7** | Un clic → la carte posée en **455 ms**, des durées d'animation justes, le mouvement réduit **parfaitement** respecté ; mais au clavier le fil casse : la carte ouverte par la recherche ne prend pas le clavier (8 Tab plus tard, on est encore dans la barre des folios). |
| **Plaisir** | **6** | Agréable à la souris ; frustrant dès qu'on cherche une valeur précise (zoomer pour lire), qu'on veut un calibre plus petit, ou qu'on travaille au clavier. |

---

## 2. Les 10 choses qui me gênent le plus

1. **Le folio ne se lit pas à l'écran — P1.** Mesuré sur le folio 3 (le plus chargé) : **cadré (59 %)**, numéros de câble
   **3,8 px**, bornes **3,4 px**, numéros de barrette **2,4 px** ; à **« 100 % »** (la touche 1), numéros de câble
   **6,5 px**, bornes **5,7 px**, repères de connecteur **6,6 px**, numéros de barrette **4,1 px**. Seuls les noms de bloc
   (10,7 px) passent. DESIGN.md promet « lisibles à 100 % » : il faut 200 % pour lire un numéro, et l'on perd alors la
   vue d'ensemble. → `avant/zoom-100-clair-1440.png`, `avant/02-plan-light-1440.png`.
2. **Au clavier, on perd le fil — P1.** `/ 102CB1 Entrée` ouvre la carte, mais le clavier reste sur la page : Tab part dans
   la barre du haut, le rail, la barre des folios (8 Tab : toujours pas dans la carte). Les quatre documents ouverts par
   le menu (Vos fichiers, Normes, Bible, Hypothèses) ne prennent pas le clavier, et Échap le rend à `body`, pas au ⋮.
   La feuille des raccourcis est `aria-modal` mais Tab en sort. L'index (R) : ↓ dans sa recherche ne descend pas dans la
   liste. → `avant/clavier-apres-recherche-clair-1440.png`.
3. **Le focus ne se voit pas là où il compte — P1.** Le folio courant : anneau glace sur une pièce presque blanche,
   **1,03:1** ; « Reprendre » sur la bibliothèque : anneau d'encre sur la nuit, **1,02:1** ; les 27 lignes du menu ⋮ et
   de ses sous-menus : seul un voile de 11 % (ni contour ni ombre) ; « Copier la fiche », « Supprimer » : seul le fond ;
   les champs « qui ont l'air d'une valeur » : un anneau à **1,19:1** (clair) et **1,58:1** (sombre).
   → `avant/focus-folio-courant-clair-1440.png`, `avant/focus-reprendre-clair-1440.png`.
4. **Les « ? » — P1.** C'est la promesse du principe 2 (« comment l'outil a choisi une valeur, dans son « ? » ») et c'est
   l'élément le moins visible de l'outil : **17 × 17 px** (15 × 15 dans un en-tête de liste), encre **2,30:1** en clair
   (#a7abb1 sur blanc), **2,78:1** en sombre (#5b6a88 sur #1a2640). → `avant/04-calibre-light-1440.png`.
5. **Le calibre : sept crans, aucun ne se clique ; « À la main » n'en propose que 2 sur 7 — P1** (le défaut confirmé du
   lecteur). Et au clic sur « À la main », sa bulle (« Retenir à la main un autre calibre… ») se pose **sur** la gamme
   qu'il vient d'ouvrir et cache le 20 A. → `avant/disjoncteur-a-la-main-clair-1440.png`.
6. **Ce qui s'écrit ne se voit pas comme un champ — P2.** La recherche de la barre : son cadre fait **1,45:1** sur la
   nuit ; le filtre du récapitulatif et la recherche des normes **1,46:1** (clair) / **1,81:1** (sombre) ; les champs en
   ligne des fiches (repère, numéro, type, longueur, profil du disjoncteur) **1,00:1** : rien ne dit qu'ils s'écrivent.
   Et l'on écrit d'**un clic** dans la fiche, d'un **double-clic** dans le récapitulatif : deux gestes pour la même valeur.
7. **Des textes coupés sans bulle — P2.** La barre des problèmes de chaque fiche (« 4 problèmes · 7 à voir — W-012
   (DR2… »), l'intensité d'un câble **coupée au milieu d'un nombre** (« 9,31 / 11,7 A » → « 9,31 / 1… »), le pourquoi
   d'un câble à grossir, la liste des sources des normes. → `avant/carte-disjoncteur-clair-1440.png`.
8. **Des cibles trop petites — P2.** « supposée » **63 × 15 px**, « Aller » / « Voir » / « Voir les câbles » du
   récapitulatif **21 px** de haut, « Ouvrir la fiche du câble » **18 × 26**, les références de la bible **23 px** ; et sur
   chaque fiche 9 à 14 cibles entre 24 et 32 px (le récapitulatif : 13 à 21). → `avant/recap-page-clair-1440.png`.
9. **Les bulles des icônes : seulement à la souris, et pas partout — P2.** Épingle, ×, crayon, « ⋯ » de la carte, ‹ de la
   pile, + de l'index : leur bulle (`data-bulle`) ne paraît jamais au clavier (DESIGN : « tout de suite au clavier »).
   Le × des documents, de la feuille des raccourcis et de l'index n'a **aucune** bulle — alors que le × de la carte en a
   une : le même geste, deux comportements. Idem le « ⋯ » d'une installation. → `avant/10-fichiers-light-1440.png`.
10. **Des choses qui se marchent dessus — P2.** Le mot qui passe (« Problème 1 / 5… P pour le suivant ») reste sous la
    liste de la recherche ; le mot de la base posé sur le titre « Bibliothèque » ; la bulle « Bibliothèque » de la marque
    tombe sur le premier bouton du rail ; le récapitulatif en moitié glisse **sur le dessin** : au-dessus, on ne voit que
    le haut blanc de la feuille. → `avant/recherche-clair-1440.png`, `avant/bibliotheque-base-clair-1440.png`,
    `avant/07-recap-light-1440.png`.

---

## 3. Tous les points, écran par écran

Légende : **P1** bloque, perd ou fait mal aux yeux · **P2** gêne nettement · **P3** finition. Les ratios sont lus à
l'écran (le fond réel derrière chaque lettre, dégradés et verres compris), les tailles au clic.

### 3.1 L'accueil et la bibliothèque

| | où | ce qui ne va pas | la correction |
|---|---|---|---|
| P2 | Accueil, bouton « Ouvrir un retest… », la touche « Ctrl+O » | **1,47:1** (#a9b8d4 sur #d7dde9, 11 px) : la touche est un fantôme dans le bouton principal. | `.bi-btn-ouvrir kbd { color: var(--t-2) /* #454b57 */; background: rgba(27,31,39,.06); border-color: rgba(27,31,39,.14) }` → 7,8:1. |
| P2 | Bibliothèque, carte de l'Exemple, « 5 problèmes dans 1 plan » | Rouge d'état #c3271f posé **sur la nuit** : **3,13:1**. | Sur la table, l'état prend l'encre de la table : `--t-table-ko: #ff8f87` (≈ 7,4:1 sur #0d1625), et un point rouge plein devant pour l'état. |
| P2 | Bibliothèque, « Reprendre » | Anneau de focus à l'encre (#141c2c) **dehors** de la feuille blanche, donc sur la nuit : **1,02:1**. | Tout ce qui est posé sur la table : `outline-color: var(--glace)` (#9fc2ff, 9:1 sur la nuit). |
| P2 | Installation, « ⋯ » de l'en-tête (`.bi-plus-tete`) | Une icône seule sans bulle. | `data-bulle="Renommer, déplacer, supprimer l’installation"`. |
| P2 | Bibliothèque + base déposée | « Vos fichiers » s'ouvre par-dessus : le titre est coupé (« Bibliothèqu »), le compte passe sur trois lignes, le mot de la base se pose sur le titre. | Après le dépôt, ne pas ouvrir le document : la carte de lecture suffit ; ou décaler `#toast` à `top: calc(var(--entete) + 12px)` et le centrer dans la zone libre (pas dans la fenêtre). |
| P3 | Nouvelle installation | Le clavier va au champ ECP (« 5 chiffres ») avant le nom ; une bande vide de ~50 px au milieu de la carte. | Le nom d'abord (c'est lui qu'on sait), l'ECP ensuite ; resserrer `gap` à 12 px. |
| P3 | Une installation d'un seul plan | Un clic sur sa carte ouvre le plan directement : on ne voit jamais la page de l'installation (ni ses gestes). | Garder ce raccourci, mais le dire : « 1 plan · s'ouvre d'un clic » sous le nom. |

### 3.2 Le plan (la table, le folio, les palets)

| | où | ce qui ne va pas | la correction |
|---|---|---|---|
| **P1** | Le folio, cadré et à « 100 % » | Voir § 2-1 : numéros de câble 3,8 px cadré, 6,5 px à 100 %, numéros de barrette 4,1 px à 100 %. | **Le 100 % lisible** : un numéro de câble fait **11 px** à « 100 % » (les autres en proportion : borne 10, barrette 9, repère 14) — soit `--zoom-100 = 1,7 ×` l'échelle actuelle ; et **un plancher à l'écran** : sous 7 px, un numéro de câble se tait (son trait reste), sauf celui qu'on survole ou qu'on a choisi — le dessin cadré se lit comme une carte, le détail vient en zoomant. |
| P1 | Barre des folios, le folio courant | Anneau de focus invisible : **1,03:1** (glace sur une pièce #e9f0fd, `outline-offset:-2px`). | `.chip.on:focus-visible { outline: 2px solid #1b1f27; outline-offset: -4px }` — l'encre sur le verre presque blanc (14:1), le même anneau sur toutes les pièces claires. |
| P2 | Barre du haut, la recherche | Son cadre (bord à 17 % de glace) : **1,45:1** sur la nuit. | `.recherche { border-color: rgba(170,200,255,.42) }` → ≈ 3,1:1, et `:hover` à .55. |
| P2 | Rail : les icônes sans bulle | On ne devine pas « Ajouter une liaison » (un trait, un rond, un +) ni « Bible » (un livre) ; le « 5 » rouge sur « Repères » ne dit pas « 5 problèmes ». | Le « 5 » : `aria-label` et bulle « Repères · 5 problèmes (R) » ; l'icône de liaison : deux bornes et un trait (le vocabulaire du folio). |
| P2 | La marque « Volta » | Sa bulle « Bibliothèque » tombe sur le premier bouton du rail (elle le cache au survol et au focus). | Poser la bulle **à droite** de la marque (`left: calc(100% + 8px); top: 50%`). |
| P3 | Survol d'un bloc | Très bien (le bloc et ses câbles s'allument, une bulle « 103RL1 · 4 câbles sur ce folio »). | Ne rien casser. |
| P3 | Le récapitulatif en moitié | Le plan garde son échelle et le tiroir glisse **sur le dessin** : on voit la marge blanche du haut. | Garder l'échelle, mais **déplacer** la vue pour que le centre du dessin soit au centre de la place libre (`animerVue` en translation seule, 220 ms). |

### 3.3 La fiche (la carte flottante, le volet)

| | où | ce qui ne va pas | la correction |
|---|---|---|---|
| **P1** | Toutes les fiches, les « ? » (`.fi-q`) | 17 × 17 (15 × 15 dans `.cb-entete`), **2,30:1** / **2,78:1**. | Visuel 18 px, **zone de clic 28 px** (`.fi-q::before { content:''; position:absolute; inset:-5px }`), encre `--t-2` (9:1 en clair, 8,9:1 en sombre), cercle `--s-line-2`. |
| **P1** | Disjoncteur, le cadran | 7 crans, 0 cliquable ; « À la main » : 15 A, 20 A (2 sur 7). | **Chaque cran est un bouton** (une zone de 32 × 32 px posée sur le nombre, `role=button`, Tab, ← → d'un cran à l'autre), avec sa bulle (« 7,5 A — ne passe pas : 9,31 A pendant 2,1 min touche la courbe ») ; un clic le **retient** même s'il ne passe pas (la carte passe rouge, dit pourquoi, Ctrl+Z). « À la main » montre **toute la gamme** : ceux qui passent en vert, le serré en ambre, ceux qui ne passent pas en rouge avec leur raison en petit. |
| P2 | Disjoncteur, « À la main » | Sa bulle reste et recouvre la gamme ouverte. | Une bulle se tait au clic et ne revient qu'après `mouseleave` (`BULLE.muette = cible` dans `lierBulles`). |
| P2 | Disjoncteur, en-tête et carte rouge | Le titre de section dit « Calibre **15 A** » pendant que la carte rouge demande « Passer en 15 A ? » : est-il à 10 ou à 15 ? | Tant que la décision n'est pas prise, la section dit « 10 A (retest) → 15 A proposé ». |
| P2 | Toutes les fiches, la barre des problèmes | Rognée (« … W-012 (DR2… ») sans bulle. | `data-bulle` = le texte entier ; ou deux lignes (`-webkit-line-clamp: 2`). |
| P2 | Câble, l'intensité d'une ligne (`.cb-i-v`) | « 9,31 / 11,7 A » coupé au milieu d'un nombre. | Un nombre ne se coupe jamais : `white-space:nowrap; flex: none; min-width: max-content`, c'est le texte voisin qui cède. |
| P2 | Champs en ligne (`.fc-in`, `#eq-rep`, `#fil-num`, profil du disjoncteur) | Aucun bord, aucun fond : **1,00:1** ; l'anneau au clavier à **1,19:1** / **1,58:1**. | Au repos un soulignement pointillé 1 px `--t-3` (« ça s'écrit ») ; au survol le cadre du champ ; au clavier `box-shadow: 0 0 0 2px var(--accent)` (opaque). |
| P2 | Câble, « supposée » (`.orig-hyp`) | 63 × 15 px. | `min-height: 24px; padding: 3px 8px`. |
| P2 | Câbles d'un disjoncteur, « ouvrir la fiche du câble » (`.cb-ouvrir`) | 18 × 26 px, une icône sans bulle. | 28 × 28, `data-bulle="Ouvrir la fiche de W-012"`. |
| P2 | Barre de la carte : épingle, ×, crayon, « ⋯ », ‹ › | Bulles à la souris seulement. | `lierBulles` : aussi sur `focusin` quand `:focus-visible` (tout de suite), `focusout` la cache. |
| P2 | Pied, « Copier la fiche », « Supprimer » | Au clavier, seul le fond change. | L’anneau commun (§ 3.8). |
| P2 | La bulle d'un « ? » ouverte | Tab continue dessous : « À la main », « Changer les câbles » reçoivent le clavier sous la bulle. | La bulle se ferme quand le clavier quitte le « ? » (`focusout`), ou prend le clavier (son titre). |
| P3 | Carte à 1440 | Elle se pose au bord droit, à 264 px du clic, sur la droite du folio (104LP1 à moitié dessous). | Correct au regard de `placerPres` ; à 1440, réduire à 400 px de large quand le folio occupe plus de 70 % de l'écran. |

### 3.4 Le récapitulatif, l'index, la recherche

| | où | ce qui ne va pas | la correction |
|---|---|---|---|
| P2 | Récapitulatif, la recherche `#ba-filtre` | Bord #d2d6df sur blanc : **1,46:1** (sombre : **1,81:1**). | `.filtre { border-color: #8a919e }` (3,2:1) ; sombre `#6b80a8` (3,1:1 sur #1a2640). C'est `--s-line-2` qui est trop pâle pour un champ : un jeton `--l-champ` à part. |
| P2 | Récapitulatif, « Aller », « Voir », « Voir les câbles », « Ouvrir la table » | 21 px de haut dans des lignes de 44. | `.rc-lien { min-height: 28px; padding: 4px 6px }`. |
| P2 | Récapitulatif | On corrige au **double-clic** ; dans la fiche, d'un **clic**. | Un geste : un clic sur une case modifiable l'ouvre (comme la fiche), le double-clic reste. |
| P2 | Récapitulatif, onglet vide | « Exporter 0 prise · folio 1 » reste actif ; « Tout (5) » à droite double le segment « Tout 5 ». | Éteindre l'export à zéro (lisible, 4,5:1) ; ôter « Tout (n) » de l'en-tête. |
| P2 | Index (R) | ↓ dans sa recherche ne descend pas dans la liste ; Tab va aux problèmes, puis repère par repère. Son × n'a pas de bulle (celui de la carte en a une). | ↑ ↓ parcourent la liste (`aria-activedescendant`), Entrée ouvre ; `data-bulle="Fermer · Échap"`. |
| P2 | Recherche + P | Le mot qui passe du problème reste au milieu en haut, **sous** la liste de la recherche. | `body.cherche #toast { opacity: 0 }` ; ou le mot qui passe se pose en bas, au-dessus de la barre des folios. |
| P3 | Recherche, « Rien qui corresponde » | Bien : la phrase dit quoi chercher. | Garder. |

### 3.5 Le menu ⋮, les raccourcis, les documents

| | où | ce qui ne va pas | la correction |
|---|---|---|---|
| P1 | Menu ⋮, Exporter ›, Plus › (27 lignes) | Au clavier, seul un voile de 11 % : ni contour ni ombre. | `.menu button:focus-visible { box-shadow: inset 0 0 0 2px var(--glace) }` (en plus du voile). |
| P2 | Menu, « Vos fichiers » | Son sous-titre coupé (« … bible · nor… ») — la bulle à gauche le redit en entier, c'est déjà bien. | Raccourcir : « retests · base · bible · normes ». |
| P1 | Raccourcis (?) | `aria-modal="true"` mais Tab sort de la feuille et va derrière (la barre, le rail, les folios). Son × n'a pas de bulle. | Boucler Tab dans `.rk-feuille` (premier ↔ dernier) ; `data-bulle="Fermer · Échap"`. |
| P1 | Vos fichiers, Normes, Bible, Hypothèses | Ouverts par le menu, ils ne prennent pas le clavier ; Échap le rend à `body`. Leur × sans bulle. | `ouvrirFiche` : `focus()` sur le titre (`tabindex=-1`), garder l'ouvreur ; `fermerFiche` : le rendre (ou `#btnMenu`). |
| P2 | Normes, la source de chaque table | Coupée (« ASNE 0599 (p. 8-11), NSA937901… ») sans bulle. | `title` = la liste entière. |
| P2 | Bible, les références | 23 px de haut. | `min-height: 28px`. |
| P3 | Hypothèses | 232 mots à lire : chaque réglage porte un paragraphe. | Une phrase sous le libellé, le reste dans son « ? ». |
| P3 | Normes | 342 mots sur un écran. | La description de chaque table sur une ligne, dépliée au survol. |

### 3.6 Le mouvement, les états, les erreurs, la charge

- **Le mouvement réduit : rien à redire.** Sous `prefers-reduced-motion: reduce`, sur 33 écrans, **zéro** animation,
  transition, `el.animate()`, défilement doux ni glissement de vue ; la lueur s'éteint, la table se fige. Le même
  enregistreur, sans `reduce`, en relève plus de cent (la carte 280 ms, le menu 220 ms, la table 16 s…) : il voit bien.
- **Les durées** : clic → carte posée **455 ms** (280 ms d'élan + le rendu) — juste au-dessous de la demi-seconde ; je
  ne raccourcirais pas l'élan, je ferais paraître le contenu plus tôt.
- **Les états vides** sont soignés (« Ce plan est vide » et ses trois gestes, « Rien sur ce folio · Voir tout le
  contrat », « Rien qui corresponde »).
- **Échap** : 19 sur 23 ouvertures se ferment en un appui, sans fermer ce qui est dessous ; le sous-menu revient au menu
  et rend le clavier à sa ligne, le « ? » rend le clavier au « ? ». Les 4 qui échouent sont les documents (§ 3.5).
- **Aucune erreur** de page sur tout le parcours, dans les quatre passes.
- **La charge** (mots lisibles · cibles, en 1440 clair, mesurée par la batterie) : accueil 84 · 6 ; plan 17 · 20 ;
  fiche disjoncteur 128 · 35 ; connecteur 80 · 40 ; câble 103 · 36 ; récapitulatif 156 · 50 (en page 220 · 52, l'onglet
  Problèmes 198 · 52) ; index 66 · 35 ; menu 60 · 28 ; raccourcis 178 · 21 ; Vos fichiers 186 · 31 ; Normes 342 · 27 ;
  Bible 162 · 45 ; Hypothèses 232 · 21. Les fiches sont raisonnables ; Normes et Hypothèses lisent comme des notices.
  Sur chaque fiche, 9 à 14 cibles font moins de 32 px ; dans le récapitulatif, 13 à 21.
- **Les petites écritures de l'interface** : dans la fiche du disjoncteur, 33 textes en 11 px et 20 en 12 px ; dans le
  récapitulatif, 41 en 11 px. Règle proposée : **12 px au moins** pour ce qu'on lit, 11 px seulement pour une étiquette
  d'axe ou une unité.

### 3.7 Les lecteurs et la base (regardés à l'œil, hors de la batterie)

| | où | ce qui ne va pas | la correction |
|---|---|---|---|
| P3 | Lecteur de PDF (le dossier du plan relu) | Clair : vignettes, page, table « Toutes · À revoir · Cette page », un geste plein. Le mot qui passe (« 201 liaisons lues… ») se pose sur le haut de la page. | Le poser dans la zone libre, au-dessus de la barre du bas. → `avant/lecteur-pdf-clair-1440.png` |
| P2 | Base déposée : la bibliothèque + Vos fichiers | Le document s'ouvre sur la bibliothèque et la serre (voir § 3.1). La recherche « partout » marche bien (surlignage, « Convertir ces 29 contrats… »). | Ne pas ouvrir Vos fichiers après le dépôt. → `avant/bibliotheque-recherche-clair-1440.png` |
| P3 | Déjà fait (comparer au déjà-fait) | Lisible : le pourcentage, la barre, « diffère » en ambre. Les pourcentages des candidats en brun (#a0…) passent, de peu. | Garder ; le meilleur candidat déjà encadré, c'est bien. → `avant/comparer-deja-fait-clair-1440.png` |
| P3 | Nomenclature | Six chiffres en tuiles, puis la table : très lisible. « Le suivi (barrettes, prises) » en lien à droite du pied se perd. | Au trait, à côté d'« Exporter CSV ». → `avant/nomenclature-clair-1440.png` |

### 3.8 L'anneau commun (la correction qui en règle vingt)

Un seul anneau, partout, qui se voit sur les deux matières :
```css
:root { --anneau-c: #1b1f27; }                         /* sur papier et surfaces claires */
#entete, #rail, #folios, .ilot-sombre, #bibliotheque, :root[data-theme="dark"] { --anneau-c: #9fc2ff; }   /* sur la nuit */
:focus-visible { outline: 2px solid var(--anneau-c); outline-offset: 2px; }
.menu button:focus-visible, .doc-menu-l button:focus-visible { box-shadow: inset 0 0 0 2px var(--glace); }
.chip.on:focus-visible { outline-color: #1b1f27; outline-offset: -4px; }
```
Avec `prefers-reduced-motion` respecté, l'anneau peut **glisser** d'un élément à l'autre en 140 ms (§ 4).

---

## 4. Les « moments wow » que je propose

1. **Le plan qui se lit à toute échelle** (zoom sémantique) : les numéros de câble gardent 11 px à l'écran ; cadré, la
   feuille montre les blocs, les routes et les états ; on zoome, les numéros se lèvent (fondu 140 ms). On n'a plus jamais
   à plisser les yeux — c'est la qualité qu'on remarque sans savoir la nommer.
2. **Le cadran qui répond** : chaque cran se survole (« 7,5 A — 9,31 A pendant 2,1 min touche la courbe ») et se clique ;
   l'index glisse sur l'arc en 220 ms (`--courbe`), l'arc vire au rouge si le calibre ne passe pas, et la courbe se
   redessine dessous. On comprend en jouant : c'est exactement ce que le lecteur a demandé.
3. **Le plan au clavier** : Tab entre dans le dessin, ← → ↑ ↓ sautent de bloc en bloc **le long des câbles**, Entrée
   ouvre la carte qui prend le clavier, Échap rend le clavier au bloc. Un outil de CAO qu'on pilote sans souris, ça fait
   « malin ».
4. **Un anneau de glace qui voyage** : le focus glisse d'un contrôle au suivant (140 ms, `--courbe`), comme sur une
   télévision Apple ; coupé net sous le mouvement réduit.
5. **La palette Ctrl+K** : toutes les actions du menu et des fiches, cherchables, avec leur raccourci à droite — elle
   enseigne les touches en passant.
6. **La touche apprise** : la première fois qu'on fait à la souris un geste qui a sa touche, le mot qui passe le dit une
   fois (« Astuce : B ouvre le récapitulatif ») — jamais deux fois le même.

---

## 5. Ce qui est déjà bien (à ne pas casser)

- Le **mouvement réduit**, intégralement respecté (CSS, Web Animations, vue du plan, table) — rare, et parfait.
- La **discipline d'Échap** : une couche à la fois, le menu et son sous-menu, le « ? », le « ⋯ » du pied.
- **Tous les boutons ont un nom** (aria-label partout, même sur les icônes) ; **aucun** élément interactif caché sous
  un autre au point de clic, sur 33 écrans et 4 passes.
- Le **menu ⋮** au clavier (↑ ↓ → ← Échap) et ses bulles d'une phrase ; la **feuille des raccourcis**.
- Le **texte courant** est bien contrasté (étiquettes `--t-2` 9:1 sur blanc, encre de la nuit 13:1 sur le verre).
- Le **survol** d'un bloc (ses câbles allumés, sa bulle), la **carte qui ne cache jamais son bloc** et son fil de glace.
- Les **états vides** qui proposent le geste suivant ; la **recherche** qui dit quoi chercher.

---

## 6. La batterie `tests/ux.js` — ce qu'elle trouve aujourd'hui

Commit `63a0233` sur la branche `worktree-agent-af59b40b4bb12e653` (tests/ux.js, une ligne dans tests/LISEZMOI.md et
dans tests/toutes.js ; rien dans `src/`).

`NODE_PATH=/opt/node22/lib/node_modules node tests/ux.js` — **11 min** pour les quatre passes et le mouvement réduit
(`--passes=1440-clair`, `--ecrans=plan,menu`, `--captures=dossier`, `--fonds=dossier`, `--court`). Elle **échoue**
aujourd'hui, honnêtement, et rend 1 ; chaque défaut est écrit avec son écran et son sélecteur (sortie complète :
`ux-sortie.txt`). Le dernier passage complet :

```
      13  contrastes   les contrastes
      10  cibles       les cibles cliquables visibles font au moins 24 × 24 px
      10  noms         chaque bouton, lien, onglet, champ a un nom ; chaque icône seule a sa bulle
       4  coupes       aucun texte coupé sans bulle qui le donne en entier
       0  cachees      —
      34  focus        le focus se voit partout (contour ou ombre ≥ 3:1)
      14  lecture      à 100 %, chaque écriture du folio fait au moins 9 px à l'écran
       2  choix        ce qui se lit comme un choix se choisit (chaque calibre du cadran)
       8  echap        Échap ferme ce qui s'ouvre … et rend le clavier à ce qui l'avait ouvert
       0  erreurs      —
       0  mouvement    —

  40 échec(s) · 95 défaut(s) distinct(s) · 48 contrôles passés sur 88
```

**Comment elle juge** (pour qu'on lui fasse confiance) :
- **Les contrastes** ne sont pas devinés depuis le CSS : la batterie relève l'encre de chaque nœud texte (opacités
  cumulées comprises), puis prend une capture où **tout texte et toute icône sont transparents** et y lit, pixel par
  pixel, le fond réel derrière chaque lettre (le dégradé de la table, le verre, le papier) ; la médiane de neuf points
  par ligne. Un texte recouvert (sous une carte, sous un voile) n'est pas jugé.
- **Les cibles** sont mesurées **au clic** : une zone agrandie par un pseudo-élément compte (elementFromPoint à
  ±11,5 px) ; un lien dans une phrase est exempté (WCAG 2.5.8).
- **Le focus** : chaque élément focalisable est focalisé en modalité clavier, on compare ses styles avant / après (lui,
  ses pseudo-éléments, son parent, ses enfants s'il est en SVG), et l'anneau est mesuré contre le fond lu à l'écran.
- **Ce qui couvre par dessein** (une feuille modale, un menu ou une bulle que la main a ouverts, un en-tête collé) n'est
  pas compté comme « caché » ; mais si **Tab** y emmène le clavier, c'est un défaut.
- **Le mouvement réduit** est jugé par un enregistreur posé avant le chargement (toute animation de plus de 10 ms, tout
  `animate()`, tout défilement doux, la vue du plan qui change plusieurs images de suite). Témoin : sans `reduce`, il en
  relève **plus de cent** sortes — avec, **zéro**.
- Ce qui ne dépend pas du thème (les bulles qui paraissent, Tab, Échap, le folio à 100 %, les calibres) se juge une fois
  par largeur ; les encres et les anneaux, à chaque passe.

**Ce qu'elle ne juge pas** (à l'œil, dans ce rapport) : la beauté, la charge (elle la **mesure** et l'écrit, sans
échouer), les cibles entre 24 et 32 px (comptées), les lecteurs de PDF et de Visio, la base SEE.
