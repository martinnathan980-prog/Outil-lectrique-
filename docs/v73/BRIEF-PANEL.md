# Brief du panel v73 — juger Volta comme des humains, écran par écran (lis-le en entier)

## Pourquoi
Le lecteur (ingénieur câblage aéronautique, l'utilisateur de Volta), le 29 octobre 2026, mot pour mot :

> « Ce que je te propose maintenant, c'est de regarder toute l'expérience utilisateur. De regarder l'esthétisme, tous
> les boutons, le clic, etc. Tout bête, par exemple, mais il faut être dans l'ultra détail, plus que ce qu'était Steve
> Jobs pour Apple. Par exemple, quand je regarde le fond, quand je bouge la souris, il y a la lumière bleue qui est bien,
> mais sinon, le fond est statique. Ben là, pareil, l'expérience utilisateur va te dire que ça doit un petit peu bouger.
> Quand je regarde les disjoncteurs, il me semble que je peux sélectionner que ceux au-dessus, pas en dessous. Je dois
> tout pouvoir sélectionner. Ça doit être ultra compréhensible. […] Il va falloir faire une batterie de test pour que tu
> repasses tout et tu te dises à la place d'un humain, à la place d'un panel d'humains : est-ce que ça c'est bien ?
> Est-ce que ça marche ? Est-ce que ça c'est pas trop ? Est-ce que c'est facile d'accès ? Est-ce que c'est hyper beau ?
> C'est compréhensible ? C'est le chemin le plus simple ? […] Je comprends, c'est facile d'accès, c'est compréhensible,
> c'est fluide, ça marche comme ça, voilà comment c'est relié, je ne me pose pas de questions. Et je mets un très très
> gros accent, voire la priorité, sur la beauté. […] Apple, les iPhones, tout le monde dit c'est beau, l'écran d'accueil,
> c'est stylisé, c'est travaillé. Il faut faire exactement pareil sur ce site. »

Il a choisi : **on garde l'identité « Nuit bleue »** (la table bleu nuit, les palets de verre, les cartes blanches
flottantes, le calibre en cadran — `DESIGN.md` la décrit) **et on la sublime**, sans compter l'effort.

Le défaut des disjoncteurs est confirmé. Sur la fiche d'un disjoncteur, section Calibre, les crans du cadran
(1, 3, 5, 7,5, 10…) se lisent mais ne se cliquent pas. « À la main » ne propose que les calibres qui passent (15, 20).
On ne peut donc pas choisir un calibre plus petit pour voir pourquoi il ne passe pas.

## Ton rôle : UN membre du panel (ton brief te dit lequel)
Tu ne CORRIGES RIEN dans `src/` (sauf l'agent « ergonomie et accessibilité », qui écrit une batterie de tests, voir son
brief). Tu joues ton personnage, honnêtement, sans complaisance : tu utilises l'outil comme lui, tu dis ce qu'il ressent,
ce qui le gêne, ce qui le perd, ce qui est laid, trop chargé, mal aligné, lent, incompréhensible. Puis tu proposes, pour
chaque point, une correction CONCRÈTE (où, quoi, comment — en mots et, pour le design, en valeurs : tailles, couleurs en
jetons, durées et courbes d'animation).

## Ce que tu dois couvrir — TOUT l'outil
Sur ordinateur, en 1440 × 900 ET 1920 × 1080, en clair ET en sombre (`document.documentElement.dataset.theme = 'light'
| 'dark'`). Le téléphone n'est pas une cible.
1. L'accueil (la bibliothèque vide, puis avec installations et plans), une installation, l'ouverture d'un retest
   (glisser un fichier, « Ouvrir un retest… »), « Nouvelle installation ».
2. Le plan : la table, le fond (et la lumière qui suit la souris), le folio (papier, cartouche, routes, renvois), la
   barre du haut, le rail de gauche (ses icônes : les comprend-on sans bulle ?), la barre des folios, le zoom, le survol
   et le choix d'un bloc, d'un câble, le glisser d'un bloc.
3. Chaque fiche (la carte flottante, épinglée en volet) :
   - disjoncteur 102CB1, folio 1 : le cadran, « Automatique │ À la main », la courbe, les câbles à grossir ;
   - connecteur 300XC1, folio 3 : la face, les contacts, le raccord ;
   - barrette 668VT31 (f. 3), prise 412VC3B (f. 5) ;
   - un câble W-012, une masse ;
   - les « ? », les bulles, l'édition d'un champ, « Rétablir ».
4. Le récapitulatif (B) et ses onglets, l'index des repères (R), la recherche (/), les problèmes (P), le menu ⋮ et ses
   sous-menus Exporter et Plus, la feuille des raccourcis (?).
5. Les documents : Vos fichiers, Normes, Bible des barrettes, Hypothèses, Cartouche, la nomenclature, la base SEE
   (onglets Import et Cohérence), le lecteur de PDF, le lecteur Visio, la base des contrats déjà faits (le grand retest :
   recherche, comparer au déjà-fait, conversion en lot), les exports (dossier PDF, .vsdx, retest corrigé).
6. Les mouvements : ouvertures, fermetures, transitions de vue, apparitions des cartes, le toast, les attentes.

## Comment faire
- Le projet : `/home/user/Outil-lectrique-` (lecture seule pour toi, sauf brief contraire). La page : `index.html`, déjà
  construite. Lis `DESIGN.md` d'abord.
- Playwright : `NODE_PATH=/opt/node22/lib/node_modules`, `chromium.launch()` (Chromium est déjà là), page
  `file:///home/user/Outil-lectrique-/index.html`, attendre `typeof atelier !== 'undefined'`.
- Le parcours : l'outil s'ouvre sur la bibliothèque, `atelier.exemple()` ouvre l'exemple (6 folios). Il existe un
  script de tour à adapter : `/tmp/claude-0/-home-user-Outil-lectrique-/d44a74ef-5d4e-5d70-aef6-303c6243d2ca/scratchpad/outils/tour.js`.
- Joue AUSSI à la vraie souris et au clavier (`page.mouse`, `page.keyboard`, `page.hover`, `page.click`) : un humain ne
  tape pas `montrerBloc()`. Mesure ce qui se mesure (temps d'un clic à l'image, nombre de clics pour une tâche).
- Fonctions utiles :
  - `montrerBloc('102CB1')`, `montrerFil(verite().find(l => l.cable === 'W-012'))` ;
  - `ouvrirSection(document.querySelector('#ba-equip'), 'disjoncteur')` ;
  - `basculerBase()`, `basculerIndex()`, `ouvrirMenu()`, `ficheFichiers()`, `ficheNormes()`, `ficheBible()`,
    `ficheHypotheses()`, `montrerBibliotheque('racine')`.
- Les fichiers d'essai, tous inventés :
  - `tests/fabrique-base.js` fabrique une grande base de contrats ;
  - `tests/pdf/schemas.js` fabrique des PDF de schéma ;
  - `tests/visio/fabrique.js` et `tests/visio/schema` donnent des .vsdx ;
  - `tests/see.js` montre comment fabriquer un classeur SEE ;
  - le modèle de retest est dans
    `/tmp/claude-0/-home-user-Outil-lectrique-/d44a74ef-5d4e-5d70-aef6-303c6243d2ca/scratchpad/v72/Modele-retest-Volta.xlsx`.
- REGARDE chaque capture (Read sur le png). Ne juge jamais un écran que tu n'as pas vu.
- La machine est partagée avec trois autres membres du panel : ne lance pas `tests/toutes.js`.
- Règles :
  - les données du lecteur ne viennent jamais ici ;
  - jamais « SEE », un nom de programme, d'appareil ou de client dans une recherche web ;
  - tout en français ;
  - aucun identifiant de modèle d'IA dans un fichier du dépôt.

## Ce que tu rends
Dans `/tmp/claude-0/-home-user-Outil-lectrique-/d44a74ef-5d4e-5d70-aef6-303c6243d2ca/scratchpad/v73/panel/<ton-nom>/` :
`RAPPORT.md` et tes captures (`avant/…png`, nommées par écran, thème, largeur). Le rapport :
1. **Tes notes sur 10** : beauté, clarté (je comprends sans me poser de question), fluidité, plaisir, et une phrase
   pour chacune.
2. **Les 10 choses qui te gênent le plus**, dans l'ordre, chacune avec sa capture.
3. **Tous les points**, écran par écran : P1 (bloque, perd ou fait mal aux yeux), P2 (gêne nettement), P3 (finition).
   Pour chacun : où (écran, élément), ce qui ne va pas (ce que ton personnage ressent), la correction proposée (précise).
4. **Les « moments wow »** que tu proposes : ce qui ferait dire « c'est beau » ou « c'est malin » (le fond vivant, l'écran
   d'accueil, une transition, un détail).
5. **Ce qui est déjà bien** et qu'il ne faut pas casser.
Ta réponse finale : le chemin du rapport et tes 5 points les plus importants, en quelques lignes.
