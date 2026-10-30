# Lot N — La Bible, la base unique, « Comment Volta réfléchit » (Volta v74) — RAPPORT

Branche `worktree-agent-ad9e2e069bc9970b1` : le code et les batteries au commit `1780f67`, ce rapport au suivant.
Le worktree était sur `d013772` : remis d'abord sur `816b249` (le commit des briefs v74, avance rapide), puis le travail.

## 0. À l'intégrateur, d'abord

- **Mes fichiers reprennent les retouches v73 de la branche en pause `origin/v73-pause-documents`** (domaine E) sur
  `src/08-normes.js`, `src/08-see.js`, `src/08-see-import.js`, `src/style-normes.css`, `src/style-see.css` (fusion à trois,
  fichier par fichier, sans conflit) : les onglets qui font le titre, la recherche de la Bible (`#bi-q`, « / », « 12-8 »,
  « #16 »), « dont N à confirmer » dit une fois, les sources et le sens d'un domaine sur une ligne avec leur bulle, le « ″ »
  des textes répétés, le verdict de la Cohérence sous le titre et « Comment lire cette page » replié, les entrées
  `@keyframes entre`. Le brief dit que le lot N tient ces fichiers : **à la fusion avec E, prendre ma version de ces cinq
  fichiers** ne perd rien de E.
- **Un défaut de cette branche en pause, corrigé** : elle raccourcissait `nomCourtSEE` (sans `OBJ_`, `LNK_`, `SET_`) pour les
  onglets, mais `nomCourtSEE` reconnaît aussi les feuilles à l'import (`/^OBJ_Wires$/`…) et nomme les liens de la
  cohérence : un classeur SEE n'était plus lu (`tests/see.js` : 4 contacts au lieu de 427, une quarantaine d'échecs).
  `nomCourtSEE` retrouve son sens ; le nom raccourci est `nomOngletSEE`, pour les onglets seulement.
- Fichiers neufs : `src/08-comprendre.js`, `src/style-comprendre.css` (classes `vr-…`, « Volta réfléchit » : le préfixe
  `cp-` est déjà au comparateur des contrats déjà faits). Une ligne dans `src/page.html` (⋮ › Plus › « Prendre en main »),
  et trois mots dans la bulle de « Plus › » qui en dit le contenu (« … le cartouche, comment Volta réfléchit, les
  raccourcis. ») ; `src/08-menu.js` n'a pas eu besoin d'être touché (le geste est posé dans `MENU.actions` par 08-comprendre).
- Deux contrôles d'autres batteries suivent mes changements (dits au § 4) : `tests/interface.js` (la liste du menu Plus)
  et `tests/see.js` (le nom des onglets).
- Mes fichiers se servent de `CROIX_DOC` et `prendreLeClavierDuDoc` (08-interface, domaine E) **quand ils sont là**
  (`croixDuDoc()`, `clavierAuDoc()`, 08-normes) ; sans eux, une croix et un clavier équivalents : ma branche tient seule,
  aucune `pageerror`, avant comme après la fusion.

## 1. Ce que le lecteur a demandé, et ce qui est fait

### La Bible — « propre mais pas organisée de façon fluide ; les références, la nature et les bornes ne sont pas centrées ; le schéma est petit et pas carré ; “quelle norme, ça vient d'où”, pas ce que je veux »

- **Une grille alignée et centrée** (`ficheBible`, `style-normes.css`) : des colonnes de largeur fixe (`colgroup`, table
  `fixed`), chaque valeur AU MILIEU de sa colonne, en-tête compris ; des lignes d'une hauteur (54 px) ; la vignette dans un
  carré de papier de 42 px, la même pour toutes. La note seule reste à gauche (c'est une phrase). À l'étroit, la colonne de
  la note se referme aussi (avant, sa `col` gardait 193 px vides : la table ne prenait pas la largeur).
- **La nature dans les mots de l'atelier** : barrette, barrette de blindage, connecteur, prise (« module de connecteur »
  se coupait).
- **L'origine dite simplement** : une colonne **Origine**, une puce par ligne — *vérifiée* (point vert), *à confirmer*
  (anneau ambre), *vos tables* / *votre bible* (à moitié), *exemple* (gris) —, la source dans sa bulle (la colonne Statut
  de la ligne : « vérifié (MIL-STD-1554A et Souriau 853…) », « à confirmer (une source : Amphenol Air LB…) », « (non
  public : …) »). Sur la Bible de l'outil : 306 puces — 162 vérifiées, 140 à confirmer, 4 exemples. `origineBible(e)`, `puceOrigine(o)`.
- **Le schéma grand et carré** : la référence dépliée a sa propre planche (`zoomBible`, plus `zoomModule` de 08-modules) —
  à gauche un **carré de papier** de 250 à 420 px (40 % de la page), la face dans un repère carré (170 unités au moins : un
  petit module ne grossit pas jusqu'à écrire ses lettres en titre), « vue de face · à l'échelle de la norme » ; à droite la
  référence, ses puces (l'origine, l'usage : « usage normal » ou « jamais choisi seul »), puis ses faits sur deux colonnes
  alignées sur un axe (le nom à droite, la valeur à gauche). Plus de « norme · NSA 937901 · mars 2021 », plus de paragraphe
  sur la désignation provisoire : c'est dans la bulle de l'origine et sur la ligne « Désignation ». Une prise ou un
  connecteur d'exemple : ses bandes dans le même carré.
- **Les aplats noirs** : la suppression du relief (v74, lot 1) avait emporté `style-relief.css`, qui portait les styles des
  faces et des pictos de modules ; dans la Bible, chaque vignette et chaque face étaient un aplat noir. Rétablis, pour la
  Bible seulement (`.bible .picto.mj-picto …`, `.bi-carre .mj …`, dans `style-normes.css`). Voir la demande F-2.
- Le clavier entre dans les Normes et la Bible à leur ouverture (leur onglet choisi) ; la croix a sa bulle ; le champ de
  recherche des deux pages a un filet à 3:1.

### La base unique — « un seul fichier propre : la base SEE comme seule source des pièces, si elle couvre tout »

- **« Seul Volta » se clique** (onglet Cohérence, « Les quatre tables de vos photos, face à la base ») : chaque nombre est
  un bouton (et le total, 15, en pied de table) ; il déplie **« Ce que seul Volta a »** sous les deux colonnes : une puce par
  famille (ou toutes), une ligne par contact — la clé (sexe, taille, câble, gauge), le contact de Volta, **d'où elle vient**
  (*de vos photos* : la base ne l'a plus ; *ajoutée par Volta* : de ses sources, nommées ; *ajoutée ici* : un import ou la
  main), **ce que dit la base** autour (aucun contact de cette taille, seulement l'autre sexe, pas ce câble, pas cette
  gauge) et **ce que donnerait la base seule** : *couverte* (une ligne plus large de la base — tout câble, toute gauge,
  toute taille — donne un contact) ou *sans équivalent* (ce câble n'aurait plus de contact). `seulVoltaSEE(I, famille)`.
- **Le cas du lecteur reproduit** (`tests/see.js`) : une base faite des quatre tables des photos, moins les lignes que
  `normes/contacts.csv` range en fin de table (ajoutées par la recherche R1) et moins une ligne EN 4165, donne exactement
  **6 · 2 · 0 · 7**. Les 14 lignes ajoutées par Volta sont la taille 22 de l'EN 2997 (EN 3155-078/-079, 6 lignes), la taille
  10 de l'EN 3645 (Carlisle / Tri-Star, 2), la taille 23 de l'EN 4165 (TE DMC-M, 6) : la base n'a aucune cavité de ces
  tailles. Sur la vraie base, la septième EN 4165 se lira avec sa raison.
- **L'option, préparée et décochée : « Ne prendre les pièces que dans la base SEE gardée »** (`caseSeuleBaseSEE`) — dans
  la Cohérence (sous la table, et au pied de la liste) et sur la page Normes (sous la recherche), dès qu'une base est gardée.
  Décochée (d'office), rien ne change. Cochée : pour chaque famille que la base connaît, les lignes de contacts, de câbles et
  de faces qu'elle n'a pas ne servent plus ; une famille qu'elle ignore (les barrettes NSA937901, E0599…) garde celles de
  Volta, sinon plus rien ne se sertit ; la source vérifiée qui contredit la base reste (votre règle du 20 octobre) ; ce que
  vous corrigez à la main passe toujours devant. La phrase sous la case dit ce qu'elle ferait (« Cochée, 15 lignes ne
  serviraient plus, dont 15 sans équivalent dans la base »). Gardée sur ce PC (`atelier.see.seule`), le mot qui passe offre
  « Rétablir ». `seuleBaseSEE()`, `choisirSeuleBaseSEE(oui)`, effet dans `avecBaseSEE`.
- Le rapport de cohérence (texte copié) dit aussi ces lignes une par une (des références de catalogue seulement) et si la
  base est seule source.

### « Comment Volta réfléchit » — « explique-moi comme à un enfant de quatre ans » ; « même le BE doit comprendre comment c'est fait, et pourquoi »

`ficheComprendre(chapitre)` (nouveau `src/08-comprendre.js`, `src/style-comprendre.css`) : une page entière, qui se lit
comme un livre — le sommaire à gauche qui suit la lecture, six chapitres, chacun un numéro, un titre, **une phrase pour
tout le monde**, **un schéma** (SVG en ligne, sur le papier blanc des dessins de l'outil dans les deux thèmes, un `<title>`
chacun ; aucun fichier externe), trois ou quatre points, et, replié, **« Pour le bureau d'études : la règle exacte »** :

1. **Volta est un cuisinier** — l'installation est la commande, la base SEE le catalogue, la physique les recettes ; le
   plat (folios, fiches, nomenclature, installation corrigée) ; une pièce absente : « manque ». L'ordre exact des tables
   (vos corrections, la base, les tables de Volta), la source vérifiée qui gagne, « Seul Volta » et l'option ; sur ce PC,
   un encart dit ce que la base gardée change, et mène à ses lignes.
2. **La chaîne d'un connecteur** — référence → famille → face → cavité → câble → contact, sur 340AB1 de l'installation
   livrée (EN2997Y1A08P → EN 2997 → 16-24 → taille 20 → DR24, 24 AWG → EN3155-019F2020, relevé sur les tables).
3. **La chaîne d'un disjoncteur** — consommation → profil → courbe → calibre → câbles → chute, sur 102CB1 (9,31 A pendant
   2 min puis 5 A ; le 10 A « juste », le 15 A passe ; ses trois câbles en DR12 ; 2 V au plus) ; et, en schéma, la courbe du
   10 A qui frôle le profil, celle du 15 A loin à droite.
4. **Les routes** — impair à gauche, pair à droite (l'appareil vu de dessus) ; un connecteur qui mêle les deux côtés :
   « branchement en chaîne », à voir ; une prise de coupure qui change de route : chaque côté se juge à part.
5. **Ce que veut dire « manque »** — une chaîne de raccord qui s'arrête ; les quatre mots de l'outil : vérifié, à confirmer,
   hypothèse, manque — et comment combler un manque.
6. **Comment vérifier** — « D'où vient chaque pièce », les points de couleur et leur bulle, le « ? », la Bible, les
   Normes, la Cohérence ; liens vers les Normes et la Bible.

Elle s'ouvre : du **menu ⋮ › Plus** (« Comment Volta réfléchit », bloc « Prendre en main », une ligne dans `page.html`, son
geste posé dans `MENU.actions` par 08-comprendre) ; de **chaque « ? »** (« Comprendre → », à droite du titre de sa bulle —
« Comment Volta réfléchit » et le chapitre dans sa bulle — mène au chapitre de cette valeur : le calibre à la chaîne d'un
disjoncteur, le contact à celle d'un connecteur… — `explication(cle).chapitre`, 08-explications ; dans la ligne du titre
et non au pied, pour que la bulle garde sa hauteur, donc sa place : plus haute, elle se retournait au-dessus du « ? » et
couvrait le cadran du calibre, ce que le juge relevait) ; du « ··· » des Normes et de la Bible ; de la Cohérence (sous la case de la base unique). Au clavier, le
sommaire a la main ; un chapitre demandé vient sous les yeux et son numéro s'allume une fois (rien sous le mouvement réduit).

## 2. Les fonctions exposées

```js
ficheComprendre(chapitre?)   // 'cuisinier' | 'connecteur' | 'disjoncteur' | 'routes' | 'manque' | 'verifier' — la palette Ctrl+K (D) l'appelle
CHAPITRES_COMPRENDRE         // [[id, titre]] ×6 ; allerAuChapitre(id)
chapitreDeLExplication(cle)  // le chapitre d'un « ? » ; explication(cle, ctx).chapitre (08-explications)
seulVoltaSEE(I, famille?)    // [{ famille, nom, x, origine: { genre: 'photo'|'ajoutee'|'ici', mot, source }, base: { genre, mot }, couverte }]
seuleBaseSEE() · choisirSeuleBaseSEE(oui) · caseSeuleBaseSEE(id)   // l'option « Ne prendre les pièces que dans la base SEE gardée »
montrerSeulVoltaSEE(famille?)  // la Cohérence de la base gardée, la liste dépliée
origineBible(e) → { niveau: 'v'|'c'|'l'|'x', mot, bulle } · puceOrigine(o)   // l'origine d'une référence de la Bible
clavierAuDoc() · croixDuDoc() · nomOngletSEE(nom)
```

## 3. Demandes aux autres domaines

- **D (la palette Ctrl+K)** : l'action « Comment Volta réfléchit » → `ficheComprendre()` (la fonction existe désormais).
- **F (les fiches)** :
  - F-1 : la bulle du « ? » (`bulleAideHtml`, 08-sections) peut écrire elle-même son lien, à la fin de `.q-tete` :
    `e.chapitre ? '<button type="button" class="btn lien dense q-comprendre" data-comprendre="' + e.chapitre + '" data-bulle="Comment Volta réfléchit — …">Comprendre<span aria-hidden="true"> →</span></button>' : ''`
    (et `explicationDe` garder `chapitre: e && e.chapitre`). Aujourd'hui, 08-comprendre l'ajoute en regardant la bulle se
    remplir (un `MutationObserver`) : sans toucher à 08-sections ; si F l'écrit, l'observateur ne double pas (il cherche
    `.q-comprendre`). Le style (`style-comprendre.css`) le tient dans la ligne du titre sans la grandir.
  - F-2 : `style-relief.css` (retiré en v74, lot 1) portait aussi les styles génériques des faces `.mj …` et des pictos
    `.picto.mj-picto …` (`.p-corps`, `.p-groupe`, `.p-contact`), et `.cand[aria-pressed="true"] .picto.mj-picto .p-corps`. Je
    les ai rétablis pour la Bible seulement ; les vignettes des candidats d'une fiche (`.cand svg.picto`) sont sans doute
    noires elles aussi : les règles sont dans `git show 1d22b57^:src/style-relief.css`, lignes 100 à 135.
- **E (la coquille des documents)** : Échap qui rend le clavier au ⋮ en fermant un document (le juge le relève sur les
  Normes et la Bible) vient avec votre `fermerFiche` / `rendreLeClavier` ; mes pages s'en serviront telles quelles.

## 4. Les batteries

- **`tests/normes.js`** : 26 / 26 sans navigateur, puis « tout tient » — dont **9 contrôles neufs** : la grille (une `col`
  par valeur, chaque valeur centrée, en-tête compris), la colonne Origine (306 puces, leur bulle), la référence en grand
  (un carré de papier de 250 px au moins, un repère carré, plus d'aplat noir), l'origine dite simplement et les faits
  alignés (plus de « mars 2021 ») ; la ligne du menu ⋮ › Plus ; la page (six chapitres, six schémas SVG en ligne avec leur
  titre, aucun fichier externe, la règle exacte repliée, le clavier qui entre) ; le sommaire ; la bulle du « ? » du calibre
  qui mène à la chaîne d'un disjoncteur (le lien dans la ligne du titre, qui ne la grandit pas), et le clic qui ouvre ce
  chapitre.
- **`tests/see.js`** : **82 / 82** — dont **9 contrôles neufs** (la base unique : 6 · 2 · 0 · 7, les 14 lignes ajoutées par
  Volta et la ligne de vos photos, chacune sa raison ; les nombres qui se pressent ; la liste d'une famille, puis toutes ;
  la case décochée ; cochée : plus de taille 22 EN 2997 ni de 23 EN 4165, la NSA937901 garde ses lignes, « Rétablir » ;
  décochée : tout revient ; le rapport de cohérence ; la case sur la page Normes) et **un contrôle mis à jour** : les onglets
  des feuilles portent le nom court sans `OBJ_`, `LNK_`, `SET_` (la retouche v73 de E reprise ici).
- **`tests/ux.js`** (le juge, `--ecrans=normes,bible,fiche-aide,menu-plus --sans-mouvement`, quatre passes) : **avant
  26 échecs · 24 défauts distincts ; après 7 échecs · 18 défauts**. Sur mes écrans, **10 défauts → 2** : le bord du champ
  `#nm-q` (1,46:1 → 3:1), la cible `.ref-btn` (23 → 28 px), la croix sans bulle, les trois sources coupées sans bulle, le
  clavier qui n'entrait pas dans les Normes et la Bible : réglés ; restent « Échap rend le clavier au ⋮ » sur les Normes et
  la Bible (la coquille, E). Les 14 défauts de l'écriture du folio sont du domaine D (inchangés) ; une bulle du rail
  (`#btnCherche`, `#btnLiaison` ou `#btnBible`, selon le passage) qui tarde au-delà de 470 ms sur le plan en 1920 est du
  chrome (A2) et varie avec la charge de la machine. `tests/ux.js` n'est pas touché.
- **Le juge sur mes écrans neufs** (une copie dans le scratchpad, `ux-n.js`, qui ajoute « Comment Volta réfléchit », sa
  règle exacte dépliée, et la liste « Seul Volta ») : après corrections (la barre des folios qui transparaissait sous la
  page, l'anneau de focus doux que j'avais posé sur le sommaire et les nombres), **un seul défaut, Échap (la coquille)** ;
  le mouvement réduit : aucun défaut.
- **Le juge entier** (`tests/ux.js` sans option, sur une copie ; avant = la construction de `816b249`) : **avant 38 échecs ·
  40 défauts distincts ; après 34 échecs · 33 défauts**. Sept défauts en moins, tous des miens (le bord de `#nm-q` en clair
  et en sombre, les trois sources coupées des Normes, le clavier qui n'entrait ni dans les Normes ni dans la Bible) ;
  **aucun défaut neuf**. Une première passe en avait un : la bulle du « ? », grandie par mon lien au pied, se retournait
  au-dessus et son ombre tombait sur le « 23 °C » du cadran du calibre (relevé seulement après « À la main ») ; le lien
  est passé dans la ligne du titre, la bulle a retrouvé sa hauteur et sa place, le juge sur ces écrans redit exactement
  les défauts d'avant.
- **`tests/interface.js`** : **un contrôle mis à jour** — la liste des lignes du menu Plus (`M.plus`) attend désormais
  `…,cartouche,comprendre,raccourcis` (ma ligne, juste avant les raccourcis, qui restent en dernier). Puis « tout tient »
  (154 contrôles). Deux contrôles y sont fragiles sous la charge, avant comme après mon lot : la bulle de « Ouvrir
  l'exemple » au survol de Plus (une sonde de trois essais la manque une fois sur trois sur la construction d'avant aussi)
  et « Échap ferme la carte » (le double qui se résorbe, regardé 40 ms après).
- **`tests/toutes.js`** (sur la construction d'avant les deux dernières retouches — le lien du « ? » et un cache de
  « Seul Volta ») : **20 batteries sur 23** ; en échec : `interface` (1 : la liste du menu Plus, mise à jour depuis),
  `bibliotheque` (un `TimeoutError` : seule, sur la construction finale, « tout tient ») et `ux` (le juge, voir plus haut ;
  il n'est jamais vert). Toutes les autres vertes : barrettes 258/258, references 64/64, format-retest 28/28, disjoncteur
  86/86, chrome 43/43, controle 38/38, fiche, fwd, memoire 9/9, retouche, dessin, affinage, couverture 75/75, normes, see
  82/82, placement, vitesse, parcours (137 · 0 échec · 17 frottements connus), pdf 30/30, visio 30/30. Sur la construction
  finale, rejouées seules : normes « tout tient », see 82/82, interface « tout tient », bibliotheque « tout tient ».
- Aucune `pageerror` au chargement (un script de chargement, et chaque batterie la compte).

**Les captures** (scratchpad de la session, `…/scratchpad/v74n/`, 1440 et 1920, clair et sombre) : `avant/bible-1440-clair.png`
et `avant/bible-module-1440-clair.png` (les vignettes et la face en aplats noirs, la référence et la nature à gauche, les
bornes à droite) ; `apres/bible-1440-clair.png`, `apres/bible-module-1440-sombre.png`, `apres/bible-module-1920-clair.png`
(la grille centrée, l'origine en puce, le carré) ; `apres/coherence-1440-clair.png` (les nombres qui se pressent, la case
décochée), `apres/coherence-seul-1920-sombre.png` (la liste et ses raisons) ; `apres/comprendre-1440-clair.png`,
`apres/ch-disjoncteur-1440-clair.png`, `apres/ch-routes-1440-sombre.png`, `final/ch-manque-1440-sombre.png`,
`final/ch-verifier-1920-clair.png`, `final/ch-be-1440-sombre.png` (la page) ; `qb-final/q-bulle-1440-sombre.png` et
`qb-final/q-bulle-1920-clair.png` (« Comprendre → » dans la ligne du titre du « ? », la bulle à sa place d'avant). Les
outils : `regarder.js`, `charger.js`, `sonde.js`, `sonde-qb.js`, `sonde-plus.js`, `ux-n.js`, `comparer-ux.js`.

## 5. Ce qui reste

- La vraie base du lecteur : la septième ligne EN 4165 « seulement dans Volta » se lira avec sa raison ; si une base
  écrit ses règles « toute gauge » (gauge −1), des lignes deviendront *couvertes* : la liste le dira.
- L'option ne touche que les contacts, les câbles et les faces (ce que la base porte) ; les courbes, les intensités, les
  raccords restent ceux de Volta (la base n'en a pas).
- Les chiffres de la page « Comment Volta réfléchit » sont ceux de l'installation livrée (340AB1, 102CB1) : un exemple, dit
  tel ; la courbe du disjoncteur est un schéma (sa forme à 125 °C), dit tel.
