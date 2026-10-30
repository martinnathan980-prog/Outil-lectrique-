# Domaine A2 — Le chrome et les gestes communs (Volta v73) — RAPPORT

Branche `worktree-agent-af3e0153fee7ecb93`, répertoire `/home/user/Outil-lectrique-/.claude/worktrees/agent-af3e0153fee7ecb93`,
parti du socle `66059fc` (le worktree était sur `bf999ca` : avancé sur le socle avant tout travail). Commit : `575187f`, posé sur la branche `claude/schematic-generator-tool-hih0lj` après la fusion de C (f96f0cd) — un seul commit, index.html non compris (l'intégrateur le reconstruit).

Fichiers touchés (tous de mon domaine) : `src/style.css`, `src/08-menu.js`, `src/page.html` (la barre du haut, le rail, le menu
⋮), `src/08-interface.js` (« l'ATTENTE », « historique et enregistrement », « ce que le menu et le rail affichent », « le menu
⋮ », « LA FEUILLE DES RACCOURCIS », « tout relier », `dire()` et le toast). Tests : `tests/chrome.js` (nouveau, 43 contrôles),
`tests/interface.js` (4 contrôles mis à jour, voir § Tests), `tests/toutes.js` et `tests/LISEZMOI.md` (la batterie inscrite).

## 1. Ce qui est fait, point par point

### Refaire (technicien n° 3, ingénieur § 10)
- **Une vraie pile refaire** (`08-interface`, « historique ») : défaire photographie ce qu'il quitte sur une seconde pile ;
  refaire la reprend. Un geste neuf la vide. Elle suit l'historique qu'elle double : un plan qu'on ouvre (`app.hist = []`,
  08-bibliotheque) lui en donne une neuve, sans toucher au code de A1.
- **Ctrl+Y et Ctrl+Maj+Z (⌘⇧Z) REFONT, jamais ne défont** (le bogue : `e.key.toLowerCase() === 'z'` attrapait la Maj).
- **↷ dans le rail**, sous ↶, éteint quand la pile est vide (`#btnRedo`).
- **Le mot dit l'état d'arrivée** et offre le geste inverse : « Défait : W-012 revient en DR20. [Refaire] », « Refait :
  W-012 passe en DR12. [Défaire] ». `recitDuGeste` compare deux états du contrat (photo contre photo, ou photo contre la
  table) et dit ce qui change comme on le lit sur le plan :
  - « Défait : 102CB1 revient à 10 A (MS3320-10) · W-011, W-012 et W-015 reviennent en DR16, DR20 et DR24. » (le grand
    geste du disjoncteur ; le part number d'un disjoncteur se dit par son calibre, `calibreDuPn`) ;
  - « Défait : 102CB1 revient au calibre automatique, 15 A. » (le cas qui trompait Karim) ;
  - une liaison ajoutée/supprimée, un numéro de câble, une longueur, un contact, une désignation, une nature, un raccord ;
  - une retouche du dessin (« 103RL1 revient à sa place ») ; un autre plan (« « Contrat d'exemple » revient sur la table ») ;
  - au-delà de trois phrases, le compte (« … et 2 autres changements »).
- **La bulle de ↶ dit ce qu'il déferait** (« Défaire : W-012 en DR12 »), celle de ↷ ce qu'il referait ; elles s'écrivent
  quand elles paraissent (l'événement `bulle`), pas à chaque geste.
- La fiche ouverte se rouvre sur le même objet après défaire ET refaire (`garderLaFiche`, 08-fiche, appelée par `defaire`
  et `refaireEtDire` : Ctrl+Y et le geste du mot en ont besoin).

### Le rail se déplie (technicien n° 6)
- Au survol prolongé (**250 ms**, une main qui passe ne l'ouvre pas) : **44 → 176 px** en 220 ms `--courbe-entree` ; les
  mots et les touches entrent quand la place est faite (+40/60 ms) ; il se replie en 140 ms `--courbe-sortie` (les mots
  partent d'abord, en 50 ms, le palet attend 20 ms : la planche du repli montrait « RécapitulatifB » à 60 ms, corrigé),
  **dès qu'on clique** (et ne se rouvre pas sous la main restée là), dès qu'on le quitte. Au doigt, jamais. Au clavier il
  reste plié : sa bulle dit le nom, la touche et l'état, tout de suite (je l'avais d'abord déplié au clavier ; un palet qui
  s'élargit à chaque Tab couvre ce qu'on lit à côté — et le juge l'a vu : retiré).
- L'icône ne bouge pas d'un pixel entre plié et déplié ; la pastille reste accrochée à l'icône ; le palet passe au-dessus
  du plan (et d'une carte voisine, `z-index` 32 déplié), il ne le pousse pas.
- Chaque ligne : l'icône, le mot (13 px / 500), la touche en puce mono 11 px (`B`, `R`, `/`, `Ctrl Z`, `Ctrl Y`).
- Déplié, la bulle dit **ce que l'outil fait** (« Tout le plan en tableaux, corrigé sur place. Maj+B le met en page. »),
  posée à droite du palet déplié (à sa place finale : elle ne suit pas le bord qui s'élargit) ; sur le rail replié, la bulle
  attend toujours que le rail soit déplié (sinon elle changerait de texte sous les yeux).
- Nouvelles icônes : **« Ajouter une liaison »** = deux bornes reliées et un + (le câble de la fiche) ; **« Bible »** = le
  symbole de la barrette (trois contacts reliés, celui de sa fiche).
- La pastille : sa bulle dit « Repères et problèmes · 5 problèmes · 9 à voir » ; le bouton s'appelle « Repères et problèmes ».
- Le rail se pose à **un jeu sous la barre du haut** (top 62, comme la carte) — le designer : collé au filet, il était à
  0 px d'elle et à 10 px des autres bords.

### Les compteurs (technicien n° 5)
- **Une règle** : « problème » = rouge seulement, « à voir » = ambre, séparés par « · ». La source est celle de C, fusionnée
  pendant mon travail (f96f0cd) : `compteProblemes()` et son `mot` — je ne recompte rien.
- **La pastille = les problèmes rouges du PLAN** : C la pose (`rendreControle`) ; à moi ses encres (`--pastille-ko`, 4,3:1,
  chiffre `--pastille-ko-t`, l'anneau de la couleur du palet), sa place (accrochée à l'icône, elle ne suit pas le palet qui
  se déplie) et **sa bulle** (`bulleDesReperes`) : replié « Repères et problèmes R » et dessous « 5 problèmes · 9 à voir »,
  déplié « Repères et problèmes · 5 problèmes · 9 à voir ». J'avais d'abord posé un point ambre sans chiffre quand il n'y a
  aucun problème rouge ; C montre alors le compte « à voir » en ambre : une seule main, la sienne, j'ai retiré la mienne.
- **P** parcourt d'abord les problèmes (« Problème 1 / 5 »), puis ce qui est à voir (« À voir 1 / 9 ») : c'est le
  `problemeSuivant` de C (point par point), que la touche P appelle. J'avais écrit le même parcours avant sa fusion ; je
  l'ai retiré, et je propose à C deux finitions qu'il avait (C-2).
- L'attente d'un folio compte de même (« Les 5 problèmes · 9 à voir »).

### Le retest corrigé mis en avant (technicien n° 4)
- **⋮ › Exporter : en PREMIÈRE ligne**, seul dans son groupe (« Le livrable »), son compte dessous (« 3 liaisons
  modifiées », « aucune modification pour l'instant »), son icône en glace, **un filet** avant les formats de dessin. La
  ligne « Exporter » du menu le dit en petit dès qu'il y a un changement (« le retest corrigé · 3 changements »).
- **La pilule de verre** dans la barre du haut, à gauche du ⋮ : « 3 changements · Retest corrigé » (34 px, `--r-btn`,
  l'encre de l'îlot, l'icône en glace). Elle paraît au premier changement (elle tombe de 4 px, `.entre-v`), s'en va quand
  il n'y en a plus, se tait sur la bibliothèque ; un clic appelle `exporterRetestCorrige`, qui ouvre le relevé de C (« Ce
  qui part dans l'Excel ») — vu à l'écran après la fusion (`apres/pilule-releve-*.png`). Le compte et ses mots viennent de
  `nombreDeChangements()` / `motChangements()` (C) ; la bulle de la ligne du menu reprend la phrase que C propose.

### Les bulles du chrome (designer § 5.4, ergonome n° 9-10)
`08-menu.js` devient « les bulles du chrome » : UNE règle du temps pour toute bulle portée par un bouton (`.bulle` enfant :
le rail, la barre du haut, les folios, la visionneuse, la feuille des raccourcis), montrée par une classe (`.bulle-on`) :
- la première après **400 ms** ; les suivantes **tout de suite** pendant `--bulle-chaude` (1,2 s) — on balaie le rail,
  les noms se suivent ;
- **au clavier**, tout de suite ; mais le clavier RENDU par programme (Échap ferme le menu → le ⋮) ne la fait pas
  paraître (`rendreLeClavier`) — elle couvrait la croix du document ;
- **éteinte au `pointerdown`**, muette tant que la main reste sur le bouton ;
- elle glisse de 3 px en 220 ms `--courbe-entree`, part en 90 ms `--courbe-sortie`.
- La bulle des folios (`fo-bulle`) et celle du menu ⋮ suivent la même règle (chaude, éteinte à l'appui).
- **La bulle « Bibliothèque » de la marque ne tombe plus sur le rail** : posée à droite de la colonne du rail, sur le nom.
  La marque elle-même se centre sur la colonne du rail (32 px du bord ; elle était à 29).
- Le ⋮ au bord droit : sa bulle s'aligne sur lui au lieu de déborder.

### Les mouvements du chrome (designer § 5.4)
- **Le menu tombe de son bouton** : 200 ms `--courbe-entree`, Y −4 px, échelle .96 dont l'origine est le ⋮ lui-même
  (`calc(100% - 18px) -26px`). **Il se ferme en 120 ms** : le vrai est fermé tout de suite (le clavier, les tests et le
  geste choisi n'attendent pas) ; c'est son DOUBLE (`.menu-part` : sans identifiants, sans rôles, inerte, `aria-hidden`)
  qui s'efface — sauf sous le mouvement réduit. Une ligne pressée s'enfonce (`scale(.985)`).
- **Le mot qui passe entre en 340 ms** (`--courbe-entree`, 8 px plus haut, échelle .98) **et sort en 200 ms**
  (`--courbe-sortie`). Sa durée suit sa longueur (2,8 s une ligne, jusqu'à 6 s pour deux ; 8 s avec un geste).
- **Un bouton pressé** : `scale(var(--presse))` en 90 ms, relâché en 140 ms `--courbe` — une règle pour `.btn`, `.rond`,
  `.rd`, la puce du folio, la pilule, la marque (elle remplace `.98` et `.94`).
- **Le rail** : voir plus haut. **La feuille des raccourcis** se pose par la règle d'entrée commune (`.entre-v`).
- Planches image par image (animations figées à des instants exacts) : `mouvement/planche-*.png` (§ 4).

### La feuille des raccourcis (ingénieur § 10, ergonome § 3.5)
- Elle dit **tout** : refaire (Ctrl+Y, Ctrl+Maj+Z), **la palette Ctrl+K** (domaine D), et un groupe « Dans une fiche » :
  Alt+← →, F2, le calibre sur son cadran (← →, Entrée, Échap — domaine B), fermer la fiche. P dit « les problèmes, puis ce
  qui est à voir ». Une touche qui ne vaut qu'à un endroit le dit sous sa ligne (« sur le cadran »).
- **Tab n'en sort plus**, d'où que parte le clavier (la page derrière comprise) ; la croix a sa bulle (« Fermer · Échap »)
  au survol et au clavier ; Échap rend le clavier à ce qui l'avait ouvert, sans bulle.
- Cinq groupes en deux colonnes équilibrées (CSS `columns`), qui tiennent dans 900 px de haut.

### Les points des rapports sur la barre, les folios, le menu, le toast
- **La recherche se voit comme un champ** : son filet passe de 1,45:1 à ≈ 3,4:1 sur la nuit (ergonome n° 6) ; la liste,
  plus large que le champ, se centre dessous (designer).
- **Le folio courant** : l'anneau du focus prend l'encre, en dedans (1,58:1 → 14:1).
- **Une seule marge gauche** : le palet des folios s'aligne sous le rail (`left: --jeu`).
- **Les feuilles à droite** (le volet épinglé, les documents, le quai) se posent à un jeu sous la barre, comme le rail et la
  carte (designer § 3).
- **« Vos fichiers »** : « retests · base · bible · normes » (plus coupé).
- **« Comparer au déjà-fait »** sans base déposée : éteint au gris lisible, sa bulle dit pourquoi et où la déposer.
- **Le mot qui passe évite la carte** : une carte flottante sous lui (« Problème 1 / 10 » sur ses flèches ‹ ›), il se pose
  dans la plus grande place libre à côté d'elle (`placerToast`) ; la liste de la recherche ouverte, il se tait.
- **Le rail passe au-dessus d'une carte voisine** quand il est déplié ou montre une bulle (la bulle « Rep… » passait sous
  le panneau Repères).

## 2. Ce qui n'est pas fait, et pourquoi
- **Les documents qui prennent le clavier et Échap qui le rend au ⋮** (ergonome P1) : `ouvrirFiche` / `fermerFiche` ne sont
  pas dans mes sections (domaine E) ; j'ai exposé `rendreLeClavier(el)` pour qu'Échap rende le clavier au ⋮ sans bulle.
- **La barre du haut transparente sur l'accueil** (designer § 5.5) : l'état « accueil » est celui de A1 ; la règle CSS
  proposée est en Demandes (A1-2).
- **Le changement de folio qui glisse, la pastille du folio qui glisse** : domaine D (« les folios »).
- **« La barre des folios ne doit jamais refuser un clic » pendant le premier calcul d'un folio** (ingénieur § 3.10) : sous
  Playwright, l'outil place les folios en synchrone (le « pilote automatique ») ; un lecteur a le Worker. Rien à corriger
  dans le chrome.
- **DESIGN.md** n'est pas dans mes fichiers : le texte à mettre à jour est en Demandes (DESIGN-1).

## 3. Les batteries
**`node tests/toutes.js`, sur la branche fusionnée avec C (f96f0cd) : 23 batteries sur 24 passent** (24 : `chrome` est
nouvelle). `chrome` 43 / 43, `interface` tient (154 contrôles), `controle` 38 / 38 (celle de C : P et la pastille),
`parcours` 138 · 0 échec, et toutes les autres. Aucune `pageerror` après la fusion (vérifié dans Chromium). Sortie :
`corrections/chrome/toutes-final.txt`.

**`ux`** échoue, comme prévu, sur les défauts des AUTRES domaines : 67 défauts distincts (sortie entière :
`corrections/chrome/ux-complet-final.txt`). **Dans le chrome : aucun.**
- **Avant** (mes écrans — plan, menu, Exporter, Plus, raccourcis — après le socle ; `ux-avant.txt`) : 4 défauts du chrome —
  le filet de la recherche `#q` à 1,45:1 (les 4 passes), la croix des raccourcis sans bulle, l'anneau du folio courant à
  1,58:1, Tab qui sortait de la feuille des raccourcis (vers `#en-biblio`).
- **Après** : 0. (En chemin, le juge a vu deux défauts que j'avais créés — l'anneau du rail mesuré sur le palet déplié au
  clavier, et l'anneau d'un outil pressé à 2,8:1 — corrigés : le rail ne se déplie plus au clavier, l'anneau est posé sur le
  bord du bouton. `ux-verif2.txt`.) Le mouvement réduit : 0 (le double du menu ne naît pas sous `reduce`).
- **Ce qui reste, par domaine** : B — les fiches (`#eq-rep`, `#fil-num`, `.fc-in` sans bord, les « ? » `.fi-q`, `#fi-menu`,
  `#fi-crayon`, `#fi-epingle`, `#in-fermer` au clavier, `.dj-chips` et `.dj-arc-n` du cadran, `#fi-pb` coupé,
  `#dj-fils-changer`, `#eq-del`, `#fi-copier`) ; D — la lecture du folio à 100 % (14 sortes d'écriture `#svg text.*`) et
  l'index (`#fi-prec`, `#ix-plus`) ; E — le récapitulatif (`#ba-filtre`, `.rc-lien` de 21 px), la bible (`.ref-btn`), les
  normes (`#nm-q`, `.nm-t-source` coupées), la croix des documents (`#fi-fermer`) et Échap qui rend le clavier à `body`
  dans Vos fichiers, Normes, Bible, Hypothèses ; A1 — `#bi-reprendre` (anneau 1,02:1), la touche Ctrl+O de l'accueil, « 5
  problèmes » de l'Exemple sur la table, le ⋯ d'une installation sans bulle.

## 4. Les captures (`corrections/chrome/`)
Chaque scène en 1440 et 1920, clair et sombre (`avant/`, `apres/`, nommées `<scène>-<largeur>-<thème>.png`). Les plus
parlantes :
- le rail : `avant/rail-pastille-1440-clair.png` → `apres/rail-deplie-defaire-1440-clair.png` (déplié, « Défaire : W-012
  en DR12 »), `apres/rail-pastille-1440-clair.png` (« Repères et problèmes · 5 problèmes · 9 à voir »),
  `apres/rail-clavier-1920-sombre.png` (au clavier : plié, l'anneau, la bulle) ;
- défaire : `avant/toast-defait-1440-clair.png` (« Annulé : type de W-012 ») → `apres/toast-defait-1440-clair.png`
  (« Défait : W-012 revient en DR20. [Refaire] ») et `apres/toast-refait-1440-sombre.png` ;
- le retest corrigé : `avant/menu-exporter-change-1440-sombre.png` (6ᵉ ligne) → `apres/menu-exporter-change-1440-clair.png`
  (en tête, « 1 liaison modifiée »), `apres/barre-change-1920-sombre.png` (la pilule), `apres/pilule-releve-1440-clair.png`
  (un clic : le relevé de C) ;
- la marque : `avant/marque-bulle-1440-clair.png` (la bulle sur le rail) → `apres/marque-bulle-1440-clair.png` ;
- les raccourcis : `avant/raccourcis-1440-clair.png` → `apres/raccourcis-tab-1440-clair.png` (trois Tab : le clavier reste
  sur la croix, sa bulle) ;
- le mot qui évite la carte : `apres/carte-gauche-mot-1440-clair.png` ; P : `apres/p-carte-1440-clair.png` ;
- la géométrie : `apres/volet-1920-sombre.png` (le volet, le rail, les folios : un seul jeu) ;
- le focus du folio courant : `apres/folio-focus-1440-sombre.png`.

Le mouvement, image par image (toutes les animations figées à des instants exacts), en clair et en sombre :
`mouvement/planche-rail-deplie-*.png`, `planche-rail-replie-*.png`, `planche-menu-tombe-*.png`, `planche-menu-part-*.png`,
`planche-mot-entre-*.png`, `planche-mot-sort-*.png`, `planche-pilule-paraît-*.png`. Les outils : `outils/scenes.js`,
`outils/planche.js`, `outils/sonde.js`.

## 5. Demandes aux autres domaines

La branche de C (f96f0cd) est fusionnée dans la mienne : je me branche directement sur son interface (`compteProblemes`,
`problemeSuivant`, `nombreDeChangements`, `motChangements`, `exporterRetestCorrige` qui ouvre le relevé) ; ce que j'avais
écrit en double avant sa fusion (une pastille, un parcours P) est retiré — une seule main sur chaque chose.

**C-1 — Deux finitions de P** (`src/08-controle.js`, `problemeSuivant` / `allerAuPoint`), que mon parcours avait :
deux points d'un même repère se distinguent par leur câble (« Problème 4 / 5 · Câble mal protégé · 102CB1 · W-012 » — sinon
deux mots identiques de suite) ; le tour à l'envers dit « De nouveau à la fin ». Dans `problemeSuivant`, passer le sens du
tour : `allerAuPoint(…, X, j >= X.length ? 'debut' : j < 0 ? 'fin' : '')` ; dans `allerAuPoint` :
```js
  const memes = X.filter(y => y.niveau === x.niveau && y.genre === x.genre && y.nom === x.nom).length > 1,
        m = memes ? /^(\S+) \(/.exec(x.texte) || /(vers \S+)/.exec(x.texte) : null;
  dire(`${tour === 'fin' ? 'De nouveau à la fin · ' : tour ? 'De nouveau au début · ' : ''}${x.niveau === 'ko' ? 'Problème' : 'À voir'} ${rang} / ${total} · ${majuscule(motDuGenre(x.genre, 1))}${x.nom ? ' · ' + x.nom : ''}${m ? ' · ' + m[1] : ''} — P : le suivant`);
```
**C-2 — La pastille quand rien n'est rouge** : vous montrez le compte « à voir » en ambre ; le brief de A2 disait « la
pastille = les problèmes rouges du plan ». J'ai laissé votre règle (une seule main), sa bulle dit tout. Si le lecteur
veut que le chiffre ne soit jamais qu'un problème : `p.textContent = C.ko ? String(C.ko) : ''` dans `rendreControle`, et
dans style.css `.rd-point.att:empty{min-width:0;width:9px;height:9px;padding:0;top:1px;left:24px}` (un point ambre).

**B-1 — Rouvrir la fiche après défaire / refaire** (`src/08-fiche.js` l. 1349-1350). `defaire()` et `refaireEtDire()` (A2)
appellent eux-mêmes `garderLaFiche()` (Ctrl+Y, ↷ et le geste « Refaire » du mot en ont besoin) : l'écouteur clavier
(Ctrl+Z) et l'écouteur du clic sur `#btnUndo` font double emploi (sans dommage : le second appel ne fait rien). Les retirer.
**B-2 — Code mort** (`src/style-carte.css` l. 51-52 et 64) : `.raccourcis.entre .rk-feuille{animation:rk-entre…}`,
`@keyframes rk-entre` et sa ligne de mouvement réduit — la feuille se pose par `.entre-v` ; la grille de `.rk-groupes`
est remplacée par deux colonnes CSS dans style.css (`.raccourcis .rk-groupes`).
**B-3 — La même règle de temps pour les bulles `data-bulle`** (`lierBulles`, 08-fiche) : `bulleChaude()` (0 ms si une bulle
vient de s'éteindre) et `bulleEteinte()` (à appeler quand une bulle s'éteint) sont exposées par 08-menu.js ; le brief de B
dit déjà « éteinte au clic ».
**B-4 — Les touches du cadran** sont écrites dans la feuille des raccourcis telles que le brief de B les décrit (← → les
crans, Entrée retient, Échap rend l'automatique, « sur le cadran ») : si elles changent, me le dire (ou corriger
`RACCOURCIS`, 08-interface).

**D-1 — Ctrl+K** : « tout relier » appelle `ouvrirPalette()` si elle existe (et empêche la touche du navigateur). Nommer la
palette `ouvrirPalette`, ou changer ce nom dans `lierPanneau` ; ne pas lier Ctrl+K une seconde fois dans `lierRecherche`.
La palette peut offrir « Défaire », « Refaire » (`defaire`, `refaireEtDire`) et « Le retest corrigé »
(`exporterRetestCorrige`).
**D-2 — L'en-tête de l'index** (`rendreIndex`, « l'INDEX ») compte encore par `CONTROLE.items` : lire `compteProblemes().mot`.
**D-3 — La liste de la recherche** se centre maintenant sous le champ (`.q-liste`, style.css) ; une palette qui la reprend
hérite de ce placement.

**E-1 — Ctrl+Maj+Z dans une case du récapitulatif** (`src/08-recap.js` l. 1121) défait encore (`e.key.toLowerCase() ===
'z'` attrape la Maj) :
```js
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && (ed.inp.value === ed.avant || ed.avant == null)) { e.preventDefault(); e.stopPropagation(); finirEdition('annule', null); defaire(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || e.key.toLowerCase() === 'z' && e.shiftKey) && (ed.inp.value === ed.avant || ed.avant == null)) { e.preventDefault(); e.stopPropagation(); finirEdition('annule', null); refaireEtDire(); }
```
**E-2 — Visio dans Exporter** (`src/08-visio.js` l. 283) : `avant: 'retestcorrige'` → `avant: 'suivi'` (le retest corrigé a
son propre groupe en tête ; sans ce changement, « Les folios en Visio » se range en dernier du plan entier).
**E-3 — Échap dans un document rend le clavier au ⋮** : `rendreLeClavier($('btnMenu'))` (08-menu) le rend sans faire paraître
sa bulle (elle couvrait la croix du document).
**E-4 — Le récapitulatif en page** (`src/style-recap.css` l. 18 et 368) : `top: calc(var(--entete) + var(--jeu) +
var(--sur-h))`, comme le volet et les documents désormais.

**A1-1 — `#en-install` porte `title=`** (`synchroniserFil`, 08-bibliotheque) : la règle est une bulle. Écrire dans le bouton
`<span class="bulle" aria-hidden="true">${lies([...])} : ses plans</span>` (et `.en-install{position:relative}`) : elle
suit d'elle-même la règle des bulles du chrome.
**A1-2 — La barre du haut transparente sur l'accueil vide** (designer § 5.5) : `#entete` est à moi, l'état « accueil » à
vous ; dans style-bibliotheque.css, sur la classe qui marque l'accueil vide :
```css
body.biblio.accueil-vide #entete{background:none;box-shadow:none}
#entete{transition:background var(--moyen),box-shadow var(--moyen)}
```

**DESIGN-1 — DESIGN.md** (hors de mes fichiers), le texte à mettre à jour :
- § 1, la table : « Le **rail** flotte à gauche (44 px, à 10 px du bord) » → « Le **rail** flotte à gauche, à un jeu de la
  barre et du bord (44 px) ; au survol prolongé (250 ms) ou au clavier il se déplie (176 px), chaque icône suivie de son mot
  et de sa touche, et se replie dès qu'on clique. Défaire ↶ et refaire ↷ l'un sous l'autre. » ; « le palet des folios … à
  gauche » → « à gauche, sous le rail (une seule marge) » ; la barre du haut : « … la recherche de verre, le menu ⋮ » → « …,
  la pilule « N changements · Retest corrigé » dès que le plan porte un changement, le menu ⋮ ».
- § 1, le menu : « Exporter › (SVG, PNG, imprimer, le suivi) » → « Exporter › (le retest corrigé d'abord, le livrable, son
  compte dessous ; puis le folio : SVG, PNG, imprimer ; le plan : le dossier PDF, le suivi, la nomenclature, Visio) ».
- § 2.3 : « Ctrl+Z défait tout. » → « Ctrl+Z défait, Ctrl+Y (ou Ctrl+Maj+Z) refait ; le mot qui passe dit l'état
  d'arrivée (« Défait : W-012 revient en DR20 ») et offre le geste inverse. »
- § 2.7 : « Un bouton pressé s'enfonce à peine (`scale(.98)`) » → « (`scale(var(--presse))`, en 90 ms) » ; « `--moyen`
  220 ms (un menu qui tombe…) » → « un menu tombe de son bouton en 200 ms (`--courbe-entree`, échelle .96 depuis le
  bouton) et se ferme en 120 ms ; le mot qui passe entre en 340 ms et sort en 200 ms ».
- § 4, la Bulle : « après 400 ms de survol (tout de suite au clavier) » → « la première après 400 ms de survol, les
  suivantes tout de suite pendant `--bulle-chaude`, tout de suite au clavier (pas quand Échap rend le clavier), éteinte au
  premier appui » ; le Mot qui passe : « (2,8 s) » → « (2,8 s une ligne, jusqu'à 6 s) ; une carte flottante sous lui, il se
  pose à côté d'elle ».
- § 4, la géométrie : « Une feuille à droite : `top: --entete` » → « `top: --entete + --jeu` ».
