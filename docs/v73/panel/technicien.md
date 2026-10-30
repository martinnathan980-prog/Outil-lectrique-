# Panel v73 — Karim, le technicien pressé

> 28 ans, technicien câblage en atelier, à l'aise avec Excel, pas informaticien. Il n'a jamais vu Volta.
> Son chef : « ouvre ce retest, trouve pourquoi le W-012 pose problème, corrige-le et renvoie le retest corrigé ».
> Il a 10 minutes et peu de patience.

J'ai tout joué à la vraie souris et au clavier (`page.mouse`, `page.keyboard`), dans un navigateur gardé ouvert,
en regardant chaque capture. Conditions : 1440 × 900 clair (le parcours principal), 1920 × 1080 sombre et clair,
1440 × 900 sombre. Fichiers d'essai, tous inventés : le modèle de retest v72, une grande base de 40 116 lignes
(`tests/fabrique-base.js`), un PDF de schéma (`tests/pdf/schemas.js`), un .vsdx (`tests/visio/fabrique.js`), un
classeur de type SEE fait comme `tests/see.js`. Rien n'a été modifié dans le dépôt.

Les captures sont dans `avant/` : `t*` le parcours de Karim (clair, 1440), `s*` le sombre (1920 puis 1440),
`c*` le clair 1920, `v*` les vérifications. Les retests exportés sont dans `xlsx/`.

---

## 0. Le parcours chronométré (ce que Karim a fait, clic par clic)

| tâche | chemin le plus court trouvé | clics | ce qui l'a fait hésiter |
|---|---|---|---|
| 1. Ouvrir | accueil → carte « Exemple » (ou « Ouvrir un retest… » → fichier) | 1 | rien : l'accueil se comprend en 2 s |
| 2. Trouver W-012 | barre de recherche → « W-012 » → Entrée | 1 + saisie | « w012 » sans tiret ne trouve rien ; à 59 % les numéros du plan sont illisibles |
| 2 bis. Comprendre | « Problèmes » → la ligne du problème | 2 | le correctif est caché sous la ligne ; il parle d'un « 15 A » absent du retest |
| 3. Le disjoncteur | lien « sous 102CB1 » de la fiche | 1 | les crans du cadran ne se cliquent pas (2 clics morts) ; « À la main » n'offre que 15 et 20 : **plus petit impossible** |
| 3 bis. Plus grand | « À la main » → « 20 A », puis « Automatique (15 A) » | 3 | la fiche défile toute seule, le cadran disparaît |
| 4. Corriger, défaire, refaire | « Passer en DR12 », ↶ du rail | 2 | **refaire impossible** ; Ctrl+Maj+Z défait une deuxième fois |
| 5. Récap, à reprendre | rail ▦ → « À reprendre » → « Tout » | 3 | le récap s'ouvre sur « Folio 1 » : 3 lignes au lieu de 4 |
| 6. Exporter | ⋮ → Exporter → « Le retest corrigé (Excel) » | 3 | le bouton « Exporter » le plus visible (celui du récap) sort un **CSV du tableau** |
| 7. Accueil | « Volta » en haut à gauche | 1 | rien (la bulle « Bibliothèque » le dit) ; Échap reprend le plan |

Le premier passage complet lui prend ≈ 6 à 7 minutes, une vingtaine de clics. Il finit dans le temps, **mais avec un
livrable faux s'il a suivi la fiche du câble** (voir le n° 1 ci-dessous).

Mesures (Chromium, machine partagée) : page prête en 1,0 s ; clic sur un bloc → fiche écrite 137 ms ; B → récap
86 ms ; clic sur un folio 79 ms ; marque → bibliothèque 104 ms ; retest corrigé téléchargé en 0,66 s ; dossier PDF
de 10 pages en 19,8 s (avec une barre et « Annuler ») ; base de 40 116 lignes « lue en 1,1 s ».

---

## 1. Mes notes sur 10

| | note | en une phrase (Karim) |
|---|---|---|
| **Beauté** | **8** | « C'est propre et sérieux, la nuit bleue est belle et les fiches blanches respirent. Mais à l'ouverture le folio n'est qu'une poussière de traits, et en sombre le bandeau rouge du disjoncteur est boueux. » |
| **Clarté** | **6** | « Je vois tout de suite "9,31 A sur 6,9 A" en rouge : j'ai compris. Ensuite on me parle d'un 15 A que mon retest n'a pas, le cadran ne se clique pas, et je ne sais pas quel "Exporter" est le bon. » |
| **Fluidité** | **7** | « Tout répond au quart de seconde. Mais pas de "refaire", un Ctrl+Maj+Z qui défait encore, et une fiche qui saute quand je choisis 20 A. » |
| **Plaisir** | **7** | « "Passer en DR12" en un clic, le mot qui confirme, la fiche qui passe au vert : c'est satisfaisant. Le reste du temps je lis beaucoup de petites lignes grises. » |

---

## 2. Les 10 choses qui me gênent le plus (dans l'ordre)

### n° 1 — P1 · Ce que je vois n'est pas ce que j'envoie
`avant/t3-03-fiche-102CB1-clair-1440.png`, `avant/t2-14-clic-ligne-pb-clair-1440.png`,
`avant/v1-102CB1-apres-DR12-seul-clair-1440.png`, `xlsx/verif-DR12-seul.xlsx`

Le cadran de 102CB1 affiche **15 A** en grand, « le retenu », et « retest ~~10 A~~ » barré : pour moi le 15 A est
appliqué. La fiche de W-012 me propose « Le plus fin qui suit le 15 A de 102CB1 : DR12 → Passer en DR12 ». Je clique :
W-012 passe au vert, la pastille du rail descend de 5 à 4, je suis content, j'exporte. **Le retest corrigé garde
`MS3320-10` sur 102CB1** (vérifié dans l'Excel : seule la case Cable T/G de W-012 a changé), et la fiche de 102CB1 dit
toujours « Le 10 A du retest touche la courbe ». J'ai envoyé à mon chef un câble DR12 dimensionné pour un 15 A qui n'est
pas dans le fichier, et la vraie cause (le 10 A déclenche au démarrage) n'est pas corrigée. Le seul geste qui règle tout
(« Passer en 15 A et grossir les 3 câbles », qui écrit bien `MS3320-15` : `xlsx/verif-15A.xlsx`) n'existe que sur la
fiche du disjoncteur.

**Correction :**
1. **Un câble ne passe pas au vert tant que son disjoncteur est rouge.** Sur W-012, après « Passer en DR12 », le point
   d'état reste ambre (`--warn`) avec, dans « Problèmes », une ligne « 102CB1 : le 10 A du retest touche la courbe
   (il protège ce câble) → Voir 102CB1 ».
2. **La fiche du câble dit la chaîne de cause** dans sa ligne de problème, en une phrase :
   « 9,31 A pendant 2,1 min : trop pour DR20 (6,9 A). Et le 10 A de 102CB1 déclencherait : Volta propose 15 A, ce qui
   demande DR12. » Dessous, deux boutons : plein `.btn.cuivre` **« Tout régler : 102CB1 en 15 A et 3 câbles en DR12 »**
   (le même geste que sur le disjoncteur), au trait `.btn.papier` « Seulement W-012 » qui propose le plus fin qui
   tient **sous le calibre du retest** (j'ai essayé DR16 à la main : la fiche le dit bon, 9,31 A sur 11,7 A, chute
   0,63 V), pas sous un 15 A qui n'est pas écrit.
3. **L'export écrit ce que Volta retient**, choix automatiques compris : `PN1/PN2 = MS3320-15`, le commentaire de la
   case « Avant : MS3320-10 · choix automatique de Volta », une colonne « Origine » (à la main / automatique) dans la
   feuille Modifications. Sinon (si le lecteur veut que l'automatique ne parte pas), le cadran doit montrer la valeur
   du retest comme valeur courante (« 10 A · ne passe pas » en `--ko`, l'automatique en anneau pointillé `--ok`
   « Volta propose 15 A »), et jamais « le retenu » sur une valeur qui ne partira pas.
4. Avant d'enregistrer, une feuille de 3 lignes : « Ce qui part dans le retest corrigé : 102CB1 10 A → 15 A ·
   W-011, W-012, W-015 → DR12 · 1 problème reste (300XC1) » et le bouton plein « Enregistrer l'Excel ».

### n° 2 — P1 · Le cadran ne se manipule pas, et je ne peux pas choisir plus petit
`avant/t3-04-survol-cran-10-clair-1440.png`, `avant/t3-07-a-la-main-ouvert-clair-1440.png`,
`avant/t3-14-garder-10-clair-1440.png`

Je clique sur « 10 », puis sur « 5 » du cadran : rien (curseur flèche, pas de survol, 2 clics morts). « À la main »
n'ouvre que **15 A** et **20 A**. « Garder le 10 A… » explique et propose « Retenir le 10 A quand même », mais 5 A ou
7,5 A ? Impossible. Je voulais voir *pourquoi* un plus petit ne passe pas : l'outil me le cache.

**Correction :**
- Chaque cran `.dj-arc-n` devient un bouton : zone de clic ≥ 28 × 28 px, `cursor:pointer`, au survol un anneau 2 px
  `--accent-line` et le segment d'arc correspondant s'éclaire (`--rapide`, `--courbe`), bulle « 5 A — déclencherait au
  démarrage (9,31 A pendant 2,1 min). Un clic pour l'essayer. »
- Un clic **essaie** le calibre : l'index glisse jusqu'au cran (300 ms, `--courbe`), le nombre du centre roule
  (10 → 5, 200 ms), passe en `--ko` avec « ne passe pas — déclenche en ≈ 4 s au démarrage » ; la courbe de
  déclenchement dessous se redessine ; deux gestes : « Retenir 5 A quand même » (au trait `.danger`) et « Revenir à
  l'automatique (15 A) » (`.btn.lien`).
- « À la main » montre **toute la gamme** (1 · 3 · 5 · 7,5 · 10 · 15 · 20) : les crans qui ne passent pas au trait
  `--ko` avec un petit ✕, le serré en `--warn`, ceux qui passent en `--ok`, l'automatique étoilé.
- Au clavier, ← → parcourent les crans quand le cadran a le focus.

### n° 3 — P1 · Défaire oui, refaire non — et Ctrl+Maj+Z défait encore
`avant/t4-07-annule-clair-1440.png`, `avant/t4-08-ctrl-y-clair-1440.png`, `avant/t4-09-ctrl-maj-z-clair-1440.png`,
`avant/t4-17-102CB1-haut-apres-melee-clair-1440.png`

↶ défait « Passer en DR12 », très bien. Pour refaire : pas de bouton ; Ctrl+Y ne fait rien ; **Ctrl+Maj+Z défait un
deuxième geste** (« Annulé : calibre de 102CB1 : automatique. ») : sans le savoir, j'ai remis 102CB1 à 20 A à la main.
La phrase elle-même m'a trompé : j'ai lu « le calibre est revenu en automatique », c'est l'inverse.

**Correction :** une pile « refaire » ; Ctrl+Y et Ctrl+Maj+Z (⌘⇧Z) refont, **jamais** ne défont ; un ↷ à côté du ↶
dans le rail (même palet, éteint quand la pile est vide). Le mot qui passe dit **l'état d'arrivée**, pas le nom du
geste défait : « Défait : W-012 revient en DR20 » avec le geste **« Refaire »** (`.toast-voir`, 8 s) ; « Défait :
102CB1 revient à 20 A à la main ». Même règle pour la bulle du ↶ : « Défaire : W-012 en DR12 ».

### n° 4 — P1 · Le mauvais « Exporter » est le plus visible
`avant/t6-01-survol-exporter-recap-clair-1440.png`, `avant/v3-survol-exporter-recap-clair-1440.png`,
`avant/t6-04-sous-menu-exporter-clair-1440.png`

Dans le récapitulatif, le bouton « ⤓ Exporter 4 liaisons · filtrées » est juste sous mes yeux : il sort
`Contrat-d-exemple-liaisons.csv`, un tableau, pas mon retest. Le vrai livrable est ⋮ → Exporter → **6ᵉ ligne sur 8**,
entre « Visio » et « Suivi de fabrication ».

**Correction :**
- Dans la tête du récapitulatif, le bouton devient « Tableau en CSV » (au trait, `.dense`, icône tableau), sa bulle
  ajoute « — pas le retest corrigé : ⋮ → Exporter ».
- Dès qu'un plan venu d'un retest porte un changement, la barre du haut montre une petite pilule de verre à droite de la
  recherche : « 3 changements · **Retest corrigé** » (34 px, `--r-btn`, l'encre de l'îlot) : un clic l'enregistre
  (avec la feuille de contrôle du n° 1).
- Dans ⋮ → Exporter, « Le retest corrigé (Excel) » en **première** ligne, son compte dessous en `small`
  (« 3 liaisons modifiées »), séparé des formats de dessin par un filet.

### n° 5 — P2 · Les nombres de problèmes ne se ressemblent jamais
`avant/t8-14-problemes-P-clair-1440.png`, `avant/t8-13-index-R-clair-1440.png`, `avant/t5-04-a-reprendre-clair-1440.png`,
`avant/s4-04-biblio-sombre-1440.png`

Pastille du rail « 5 » puis « 4 » ; Repères « 4 problèmes · 8 à voir » ; onglet du récap « Problèmes 4 · 8 » ; la
touche P : « Problème 1 / **10** » ; « À reprendre **3** » (le folio) ; la bibliothèque « 5 problèmes dans 1 plan ».
Je ne sais plus combien il m'en reste, donc je ne sais pas quand j'ai fini.

**Correction :** une seule règle partout — « problème » = rouge seulement, « à voir » = ambre, toujours séparés par
« · ». P parcourt d'abord les problèmes (« Problème 1 / 4 ») puis les points à voir (« À voir 1 / 8 »). « À reprendre »
compte tout le plan et dit le folio en second : « À reprendre 4 · 3 sur ce folio ». La pastille du rail = les
problèmes rouges du plan, sa bulle le dit (« 4 problèmes, 8 à voir »).

### n° 6 — P2 · Les icônes du rail ne parlent pas sans leur bulle
`avant/t2-01-rail-bulles-clair-1440.png`

▦ (récap) et 🔍 vont ; la liste à puces avec une pastille rouge, je la prends pour des notifications ; le « ⊸+ »
(Ajouter une liaison) ressemble à un curseur de réglage ; le livre (Bible des barrettes), je pense « aide » ou « normes ».

**Correction :** le rail **se déplie** au survol prolongé (250 ms) : 44 → 176 px, chaque icône suivie de son mot et
de sa touche (`--f-13` 500, la touche en puce `--f-11`), ouverture 220 ms `--courbe`, repli 140 ms à la sortie ; replié
dès qu'on clique. Icônes : « Ajouter une liaison » = deux bornes reliées et un « + » (le symbole du câble de la fiche,
plus un plus) ; « Bible » = le symbole de la barrette (trois contacts reliés), pas un livre. « Repères » s'appelle
« Repères et problèmes » dans la bulle, puisque c'est là que vit la pastille.

### n° 7 — P2 · À l'ouverture, le plan est illisible
`avant/t1-09-exemple-1300ms-clair-1440.png`, `avant/t2-06-folio1-detail-59pct-clair-1440.png`,
`avant/t8-03-folio3-clair-1440.png`

À 59 % (la feuille entière), les numéros de câble font ≈ 5 px : « W-012 » ne se lit pas, je dois zoomer ou chercher. Sur
le folio 3, c'est une toile d'araignée.

**Correction :** ouvrir cadré sur **le dessin**, pas sur la feuille (le cartouche se voit en défilant) ; ou un zoom
sémantique : sous 80 %, les numéros de câble et les repères gardent au moins 9 px à l'écran (fond papier derrière,
comme aujourd'hui). Et quand la recherche amène un objet, il pulse deux fois (anneau `--glace` 2 px, 2 × 300 ms) pour
que l'œil le trouve.

### n° 8 — P2 · La fiche bouge sous ma souris
`avant/t3-09-20A-retenu-clair-1440.png`, `avant/t3-04-survol-cran-10-clair-1440.png`,
`avant/v2-102CB1-apres-passer-15A-clair-1440.png`

Je clique « 20 A » : la fiche défile toute seule, le cadran sort de l'écran, je vois la courbe à la place. Et après
chaque clic, une bulle (« Il ne déclenche pas, avec la marge. ») surgit sous ma souris **immobile** et cache
« Automatique ». Ensuite, « ⚠ 3 câbles à grossir **avec le 15 A** » reste écrit alors que j'ai pris 20 A.

**Correction :** après un geste dans la fiche, garder l'élément cliqué à la même hauteur d'écran (mesurer son `top`
avant le rendu, corriger `scrollTop` après). Une bulle ne s'ouvre qu'après un vrai mouvement de la souris (≥ 3 px)
**après** le rendu, jamais parce que le contenu a glissé sous elle. La ligne des câbles suit le calibre retenu :
« avec le 20 A ».

### n° 9 — P2 · La recherche ne pardonne pas
`avant/t2-17-recherche-w012-sans-tiret-clair-1440.png`, `avant/t2-19-recherche-disjoncteur-clair-1440.png`

« w-012 » et « 012 » trouvent ; « **w012** », « W 012 », « w12 », « disjoncteur » : « Rien qui corresponde ». À
l'atelier on écrit W012 sur les étiquettes.

**Correction :** comparer sans casse, sans espace ni tiret, zéros de tête facultatifs (« w12 » = W-012) ; chercher aussi
la nature (« disjoncteur » → 102CB1) ; à défaut, « Vouliez-vous dire **W-012** ? » cliquable.

### n° 10 — P2 · La fiche du câble parle du disjoncteur sans le dire
`avant/t4-11-w012-retest-changement-clair-1440.png`

Dans la fiche de W-012, « Retest · 1 changement écrit ici » contient « référence MS3320-10 → MS3320-20 » : je n'ai pas
touché ce câble ! (c'est la référence de 102CB1, portée par la ligne du retest). Et « écrit ici » ne veut rien dire pour
moi.

**Correction :** « Par rapport au retest · 1 modification » ; chaque ligne dit sa colonne et son objet :
« PN1 (102CB1) : MS3320-10 → MS3320-20 ↺ ».

---

## 3. Tous les points, écran par écran

Légende : **P1** bloque, perd ou fait mal aux yeux · **P2** gêne nettement · **P3** finition.

### A. L'accueil et la bibliothèque
- **(bien)** Accueil vide (`t1-01`, `s1-01`) : « Ouvrez votre retest », une phrase, un bouton plein, « glissez-le
  n'importe où ». Compris en 2 s. L'Exemple discret sous « Pour essayer » : juste.
- **P3** · `t1-02` Le raccourci « Ctrl+O » est écrit **dans** le bouton plein, en gris sur blanc : on dirait un champ.
  → le sortir à droite du bouton en puce `--f-11` `--t-table-2`, ou le laisser à la bulle.
- **P3** · Avec la grande base (61 installations, `t8-26`, `t8-28`), l'Exemple est tout en bas après deux écrans
  de cartes. Pour Karim c'est bien ainsi, mais l'ordre par défaut « N° ECP » ne lui dit rien : il ne connaît pas les
  ECP. → ordre par défaut « Récentes ».
- **P3** · « Nouvelle installation » (`t8-39`, `t8-41`) : la carte qui s'écrit sur place avec « Entrée la crée ·
  Échap renonce » est très bien ; mais « ECP **à saisir** » en ambre dans l'installation créée inquiète (« j'ai oublié
  quelque chose ? »). → « N° ECP (facultatif) » en `--t-table-2`.
- **P3** · Le ⋯ d'une ligne de plan est invisible tant qu'on ne survole pas la ligne (`t8-43`) : je ne savais pas
  qu'on pouvait renommer. → le montrer à 40 % d'opacité au repos.
- **(bien)** « Reprendre · Échap » en tête de la bibliothèque (`t7-06`) : je reviens à mon plan d'une touche.

### B. Ouvrir un retest
- **P3** · Le mot qui passe « 3 liaisons · **1 feuille ignorée**. Voir » (`t1-07`) m'inquiète : quelle feuille ?
  → « 3 liaisons lues · la feuille « Colonnes » (une notice) est laissée de côté ».
- **P2** · Les couleurs des routes changent d'un plan à l'autre : PUISSANCE est violette dans l'Exemple, **bleue** dans
  mon retest (où le violet est SIGNAL) (`t1-07` contre `t1-09`). À l'atelier la couleur, c'est un sens. → attribuer la
  couleur par le nom de la route (une table stable : PUISSANCE violet, SIGNAL sarcelle, BLINDÉ bleu…), l'ordre
  d'apparition seulement pour les noms inconnus.
- **P3** · Le repère « Disjoncte… » tronqué sous 102CB1 sur le folio (`t1-07`, `t8-35`) fait inachevé. → écrire la
  désignation en entier sur deux lignes ou la réduire à `--f-11` avant de tronquer.

### C. Le plan
- **P2** · Lisibilité à l'ouverture : voir le n° 7.
- **(bien)** Le survol d'un câble (`t2-07`) : la bulle « W-012 · 102CB1:2 → 103RL1:A1 · PUISSANCE · DR20 » est
  superbe, le reste s'estompe. C'est le meilleur moment du plan.
- **P3** · Le curseur « déplacer » (✥) sur un bloc (`c2-01`) laisse croire qu'un clic va le bouger ; c'est un clic qui
  ouvre la fiche. → curseur main (`pointer`) au repos, ✥ seulement après 4 px de glisser.
- **(bien)** Glisser un bloc (`c2-03`) : « 103RL1 déplacé · Ctrl+Z pour défaire » et la pilule « Dessin retouché ·
  revenir au dessin automatique » : rassurant.
- **P3** · Le fil de la carte (`c1-03`) passe à travers le bloc 103RL1 : on dirait une connexion. → le faire passer
  au-dessus d'un fond papier 3 px (comme les numéros de câble) ou l'arrêter au bord du bloc.
- **P3** · La recherche a zoomé le plan à 153 % et la carte couvre 104LP1 (`c1-03`) ; à 1440 la carte de 300XC1 couvre
  les blocs de gauche (`t8-07`). Acceptable, mais au clic sur une ligne de problème, recentrer l'objet dans la partie
  libre.
- **P3** · Le fond (`s1-02`, `s1-03`) : la lueur suit la souris, c'est joli ; souris immobile 4 s, **0 pixel ne
  change**. Karim ne le remarque pas, mais un fond qui respire à peine dit « l'outil est vivant, il n'est pas planté ».
  → voir « moments wow ».

### D. La fiche du câble W-012
- **(bien)** La tuile « Intensité **9,31 A** sur 6,9 A » en rouge (`t2-10`) : en un coup d'œil j'ai compris. Le « ? »
  de l'intensité (`t2-16`) avec ses cases EN 2853 · facteur · faisceau · ambiante est clair, même pour moi.
- **P1** · La chaîne de cause et le « 15 A » fantôme : voir le n° 1.
- **P2** · La barre fermée « 1 problème · 1 point à voir — démarra… » coupe justement la cause (`t2-10`). → une
  deuxième ligne courte, toujours visible : « 9,31 A > 6,9 A admis ».
- **P2** · Le correctif n'apparaît qu'après **deux** clics (Problèmes, puis la ligne), et à moitié sous la ligne de flottaison
  (`t2-14`, `t4-02`). → sous la barre des problèmes dépliée, le geste principal directement : « Passer en DR12 »
  (ou « Tout régler », n° 1).
- **P2** · « Le plus fin qui **suit** le 15 A de 102CB1 » : « suit » ne veut rien dire pour moi. → « Le plus fin que
  protège le 15 A de 102CB1 : DR12 ».
- **P2** · « Retest · 1 changement écrit ici » : voir le n° 10.
- **P3** · Le lien « sous 102CB1 » est un petit texte souligné de 11 px sous « Intensité » (`t3-01`) : c'est pourtant
  la porte vers la vraie cause. → une puce cliquable `.fi-ct-puce` « 102CB1 · 10 A ⚠ ».
- **P3** · La gauge se change par une liste déroulante de 26 à 6 (`t4-14`) : bien, mais rien n'indique quelles gauges
  passent. → griser (sans désactiver) celles qui ne tiennent pas 9,31 A, ✓ à côté des autres.

### E. La fiche du disjoncteur 102CB1
- **(bien)** Le bandeau rouge « Le 10 A du retest touche la courbe » avec ses trois câbles avant → après et « Passer en
  15 A et grossir les 3 câbles » (`t3-12`) : c'est exactement ce qu'il me faut. Il devrait être *aussi* sur la fiche du
  câble (n° 1).
- **P1** · Cadran non cliquable, « À la main » limité aux calibres qui passent : n° 2.
- **P1** · « 15 A » affiché comme retenu mais non exporté : n° 1.
- **P2** · La fiche défile toute seule après « 20 A », la bulle sous la souris, « avec le 15 A » : n° 8.
- **P2** · La légende sous le cadran (« passe · juste, sans la marge · la charge · le retenu », `t3-03`) en 11 px
  gris : je ne fais pas le lien avec l'arc. → mettre les mots **sur** l'arc (« passe » le long du vert, « charge » au
  bout du bleu) ou au survol de l'arc, et retirer la légende.
- **P3** · « Gamme MS3320 ? » à côté de « 5 A permanent · 9,31 A en pointe » : bien rangé. Mais « en pointe » pour
  « démarrage et transition », deux mots pour la même chose (fiche du câble : « démarrage et transition »). → un seul
  mot partout : « au démarrage ».
- **P3** · En sombre (`s3-04`), le bandeau rouge est un brun boueux. → fond `--ko-soft` à 10 % sur la surface de la
  carte, filet gauche 3 px `--ko`, titre `--ko` ; pas d'aplat brun.
- **P3** · « Garder le 10 A… » ouvre une explication et « Retenir le 10 A quand même » / « Écrire le profil »
  (`t3-14`) : clair. Mais « Écrire le profil » ne me dit rien. → « Corriger le profil de charge ».

### F. Les autres fiches (survol de technicien)
- **(bien)** 300XC1 (`t8-07`, `t8-14`) : « Aucun ne loge B5 · W-370 (DR12) trop gros pour le contact 5 » et le bouton
  « W-370 en DR18 » : problème + correctif dans la même phrase. C'est le modèle à suivre pour W-012.
- **P3** · 300XC1 : les bulles A · B · C du connecteur, B en rouge plein : on comprend. Le « 1 » rouge en bout de ligne
  répète l'info. → retirer le compte quand le connecteur fautif est déjà marqué.
- **(bien)** 668VT31, 412VC3B (`t8-10`, `t8-11`) : « 12 câbles · tous tiennent · au plus 39 % de l'admis ✓ » : je
  n'ai rien à lire de plus. Parfait.
- **P3** · 901G (`t8-12`) : « Masse ? · folio 1 » puis « 3 câbles », la carte paraît vide. → ouvrir la liste des 3
  câbles d'office (elle est courte).
- **P3** · 668VT31 est marquée à trois endroits du folio par des crochets : je ne sais pas laquelle est « elle ».
  → crochets pleins sur l'occurrence cliquée, pointillés sur les autres.

### G. Défaire, refaire
- **P1** · Pas de refaire, Ctrl+Maj+Z défait, phrase trompeuse : n° 3.
- **(bien)** Chaque mot qui passe dit « Ctrl+Z le rend » / « Ctrl+Z défait le tout » (`t4-05`, `v2`) : je sais que je
  peux revenir en arrière. Et « Passer en 15 A… » se défait en **un** Ctrl+Z.

### H. Le récapitulatif
- **P2** · Il s'ouvre sur « Folio 1 » : « À reprendre 3 » alors qu'il y en a 4 (`t5-04`, `t5-06`). → compter le plan
  entier (n° 5) ; « Folio 1 · Tout » devient « Ce folio · Tout le plan » pour qu'on comprenne le segment.
- **P1** · Le bouton « Exporter … filtrées » (CSV) : n° 4.
- **P3** · Dans une ligne, « DR16 ↺ (16) » (`t5-04`) : le « ↺ » (rendre la valeur du fichier) et la pastille de gauge
  noire pleine pour 16 / au trait pour 22-24 ne s'expliquent pas. → la pastille « main » de la règle (« modifié ») au
  lieu du ↺, le ↺ seulement au survol ; la gauge en simple nombre, le fond plein réservé à ce qui est choisi.
- **(bien)** Un clic sur une ligne range la fiche en volet à droite et recadre le plan (`t5-08`) : élégant, je ne perds
  rien.
- **P3** · En moitié, la tête du récap coupe le titre (« 201 liaisons · 67 repères ·… ») quand la fiche est épinglée.
  Acceptable.

### I. Problèmes (P), Repères (R), Recherche (/), raccourcis (?)
- **P2** · Les comptes : n° 5.
- **P3** · Le mot « Problème 1 / 10 · … — P : le suivant » se pose sur les flèches ‹ › de la carte (`t8-14`). → le
  poser au centre de la partie libre du plan, ou sous la barre si une carte est à droite.
- **P3** · La bulle « Rep… » du rail passe **sous** le panneau Repères ouvert (`t2-05`). → bulles du rail au-dessus
  des panneaux, ou muettes quand le panneau de ce bouton est ouvert.
- **P2** · La recherche : n° 9.
- **(bien)** La feuille des raccourcis (`t8-15`) : rangée par ce qu'on fait (« Se repérer », « Lire en tableaux »…).
  Je la lirai plus tard.

### J. Le menu ⋮
- **(bien)** Sept lignes, une tête qui dit le plan et « enregistré 20:47 » avec un point vert (`t6-02`) : rassurant.
- **P2** · Le retest corrigé est la 6ᵉ ligne d'un sous-menu : n° 4.
- **P3** · « Comparer au déjà-fait » en ligne principale ne me dit rien (et rien n'est chargé). → l'éteindre (au
  gris lisible) tant qu'aucune base n'est déposée, sa bulle dit pourquoi.

### K. Les exports
- **(bien)** Le retest corrigé (`xlsx/Contrat-d-exemple-retest-corrige.xlsx`) : seize colonnes, la case changée
  commentée « Avant : DR20 », une 17ᵉ colonne « Modifié par Volta », une feuille « Modifications ». Mon chef verra tout.
- **P1** · L'automatique n'y est pas : n° 1.
- **P3** · Le mot « Le retest corrigé est enregistré : 201 liaisons, 1 liaison modifiée (1 case commentée, la feuille
  Modifications les liste). » tient sur deux lignes et s'efface en 2,8 s : je n'ai pas le temps de lire le nom du
  fichier. → 5 s pour un mot de deux lignes, et le nom du fichier : « Enregistré dans vos Téléchargements :
  Contrat-d-exemple-retest-corrige.xlsx ».
- **(bien)** Le dossier PDF (`v6`) : 20 s, mais une barre, l'étape en cours (« folio 2, folio 3… en calcul ») et
  « Annuler ». On attend sans s'inquiéter.

### L. Les documents (survol)
- **(bien)** Vos fichiers (`t8-16`) : « l'exemple embarqué est ouvert — **pas votre contrat** » : précieux.
- **P3** · Vos fichiers : deux façons d'ouvrir le retest l'une sous l'autre (bouton plein + zone pointillée), plus « Un
  schéma en PDF ? Le lire… ». → garder la zone, le bouton devient un lien dans la zone (« ou cliquez »).
- **P3** · Normes (`t8-18`) : des badges ambre « 74 à confirmer », « 67 à confirmer » sur presque chaque table. Pour un
  technicien, ça dit « l'outil n'est pas sûr de lui ». → un seul compte dans la tête de la feuille (« N lignes à
  confirmer »), les badges au survol ou dans la table ouverte.
- **P3** · Bible (`t8-19`) : la colonne « Intensité » est vide sur toutes les lignes montrées (la règle dit qu'elle ne
  s'écrit pas). Titre « Bible des barrettes » mais sur-titre « Barrettes et connecteurs ».
- **(bien)** Hypothèses (`t8-20`) et Cartouche (`t8-21`) : comme des réglages de téléphone, un libellé, une valeur
  alignée, une phrase. Le cartouche se voit d'abord sur papier : très bien.
- **(bien)** Nomenclature (`t8-22`) : six chiffres en tête (192 contacts, 179 câbles, 895 m, 4,8 kg…) : c'est ce que
  le magasin me demandera.
- **P2** · Base SEE (`s5-02`, `s5-03`) : beaucoup de paragraphes avant le premier chiffre ; pas pour moi, mais je m'y
  noie. → la ligne « 1 contrôle en erreur · 2 à voir » en premier, le chapeau replié en « Comment lire cette page ».
- **(bien)** Lecteurs PDF et Visio (`t8-37`, `t8-38`) : la page à gauche, les liaisons à droite avec la confiance en
  pastille, « Ouvrir comme plan » en plein. Clair.
- **(bien)** Grande base (`t8-25` → `t8-31`) : 40 116 lignes → 61 installations rangées ; l'installation ouverte liste
  ses plans comme une boîte mail. « Convertir… » ouvre des cases et une barre en bas (`t8-33`) : on comprend.

### M. Les mouvements
- **(bien)** La carte qui naît du bloc et la feuille qui glisse : vives, jamais lentes (tout sous 150 ms à l'écran).
- **P2** · La fiche qui défile toute seule et la bulle qui surgit : n° 8.
- **P3** · Après « Passer en DR12 », rien ne se voit **sur le plan** (tous les câbles ont le même trait, `.cab`
  0,95 quelle que soit la gauge — c'est la convention du dessin, à garder). → un accusé visuel bref : le trait corrigé
  s'allume d'un halo `--ok` (2 × 300 ms, `--courbe`) au moment du geste ; je vois où ma correction est tombée.

### N. Sombre et 1920
- **(bien)** En 1920 sombre (`s2-03`, `s3-04`), la carte bleu nuit sur la table, le papier blanc : très beau, lisible.
- **P3** · En 1920, la carte de 420 px paraît petite à côté d'une feuille de 1440 px ; les numéros du folio restent
  petits (zoom 86 %). → la carte à 440 px dès 1800 (la règle le dit déjà) et le zoom d'ouverture qui vise 9 px.
- **P3** · Bandeau rouge brun en sombre : voir E.

---

## 4. Les « moments wow » que je propose

1. **Le cadran devient un bouton qu'on tourne.** On saisit l'index et on le glisse d'un cran à l'autre ; il s'accroche
   à chaque calibre (un petit arrêt de 120 ms, `--courbe`), l'arc se colore en direct (rouge, ambre, vert), la courbe
   de déclenchement dessous se redessine, et le nombre au centre roule comme un compteur. Je comprends en 3 secondes
   pourquoi 5 A ne passe pas et pourquoi 15 A passe. *« C'est malin. »*
2. **« Tout régler » avec un aperçu.** Au survol du bouton plein, le plan montre ce qui va changer : les traits des
   câbles concernés s'épaississent en fantôme, « 10 A » sous 102CB1 devient « 15 A » en pointillé. Au clic, ça se pose
   (300 ms) et le mot qui passe dit « 102CB1 en 15 A, 3 câbles en DR12 · Défaire ».
3. **La ligne d'arrivée.** Une pilule dans la barre du haut : « 4 à reprendre ». Chaque correction la décompte (le
   chiffre roule, 200 ms). À zéro, elle passe au vert (600 ms, une seule fois, sans rebond) et devient le bouton
   « Retest corrigé prêt — l'enregistrer ». Je sais que j'ai fini, et je sais quoi faire ensuite.
4. **Le relevé avant envoi.** Avant d'enregistrer, une feuille courte, belle comme un ticket : « Ce que vous envoyez :
   102CB1 10 A → 15 A · W-011, W-012, W-015 → DR12 · reste : 300XC1 B5 ». Je la montre à mon chef, je suis couvert.
5. **Une table qui respire, même quand je lis.** Le souffle de 16 s continue au repos à mi-amplitude (opacité
   .55 ↔ .80, rien d'autre : une couche déjà composée, coût nul) ; la lueur, quand la souris s'arrête, ne se fige pas :
   elle repart doucement en 4 s vers le coin haut-droit, d'où vient la lumière. Après une correction, une onde de lumière
   froide très légère part de l'objet corrigé (opacité 0 → .12 → 0, 900 ms). Coupé par le mouvement réduit.
6. **L'accueil qui se dessine.** À la première ouverture, les deux câbles de la vignette se tracent (1,2 s, de gauche à
   droite) puis le titre apparaît : on comprend sans lire que « ça dessine des plans ».

---

## 5. Ce qui est déjà bien (à ne pas casser)

- L'accueil « Ouvrez votre retest » : une seule action, glisser n'importe où, l'Exemple discret.
- La vitesse : chaque clic répond en moins de 150 ms.
- La recherche « / » + Entrée qui ouvre la fiche directement.
- La tuile rouge « 9,31 A sur 6,9 A » : l'essentiel en un coup d'œil.
- La bulle de survol d'un câble sur le plan (de → vers, route, type).
- Le bandeau du disjoncteur : verdict, tableau avant → après des câbles, un bouton qui fait tout, défait en un Ctrl+Z.
- 300XC1 : le problème et son correctif dans la même phrase (« W-370 en DR18 »).
- Les ‹ › de la carte : je reviens de 102CB1 à W-012 d'un clic.
- Le récapitulatif qui range la fiche en volet et recadre le plan au clic sur une ligne.
- Les mots qui passent qui disent ce qui s'est passé et comment le défaire.
- Le retest corrigé : cases commentées « Avant : … », colonne « Modifié par Volta », feuille Modifications.
- Le dossier PDF avec sa barre et « Annuler ».
- « Reprendre · Échap » et la marque « Volta » qui ramène à la bibliothèque.
- Les fiches vertes qui ne disent rien de trop (« 12 câbles · tous tiennent · au plus 39 % de l'admis ✓ »).
- Le sombre : la carte bleu nuit sur la table, le papier blanc ; c'est beau.
