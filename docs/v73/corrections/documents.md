# Volta v73 — domaine E « Les documents et le récapitulatif » : rapport du correcteur

## Branche et commit

- Branche : `correction-v73-documents`, partie de `claude/schematic-generator-tool-hih0lj` à 4300387, puis fusionnée
  avec elle à 17b0694 (les fiches de B), comme demandé : commit temporaire, fusion, puis un seul commit sur 17b0694.
- Commit : `@@COMMIT@@` — « Volta v73, domaine E : les documents et le récapitulatif… ».
- Après la fusion : la page chargée dans Chromium, **aucune `pageerror`** (ni déclaration en double).
- `index.html` remis comme sur la branche (`git checkout -- index.html`) avant le commit.

## 1. Les batteries

@@BATTERIES@@

### Les tests rendus obsolètes, mis à jour (`tests/interface.js`, chaque fois marqué « MIS À JOUR »)

- **Disjoncteurs** : les en-têtes deviennent `Repère · Calibre · Retest · Verdict · Problèmes` (le retest d'office,
  « Meilleur » passe en colonne au choix) ; le verdict attendu est `verdictDeCalibre(d).mot` (passe, juste, déclenche),
  plus « tient / touche la courbe ».
- **Changer le calibre** : plus de `<select>` du navigateur ; la case ouvre la gamme (`#rc-gamme`), on clique un calibre.
- **L'export** : `#ba-csv` ouvre un menu ; le test clique « Ce qui est montré » (`#ba-csv-vu`), puis « Tout l'onglet »
  (`#ba-csv-tout`), et attend `Ce qui est montré 8 liaisons · folio 1`, `Tout l'onglet Liaisons 201 liaisons, sans
  folio ni filtre`, et le retest corrigé au bas.
- **Vos fichiers** : une seule zone de dépôt, celle du retest (`VF.zones === 'retest'`, plus `'retest base'`).

### Le test ajouté : `tests/documents.js` (31 contrôles, ajouté à `toutes.js` et à `LISEZMOI.md`)

À la vraie souris et au clavier, sur l'exemple : le menu « Tableau en CSV » (ses trois lignes, le clavier sur la
première, Échap rend le bouton) ; « Ce folio · Tout le plan » ; « À reprendre 4 · 3 sur ce folio » ; le dessin dans la
place libre en moitié ; le filet de la recherche à 3:1, le jour et le soir, en couleur écrite ; Disjoncteurs (le retest
barré avec son unité, trois mots) ; l'anneau de la case Calibre autour du nombre ET de son unité ; la gamme =
`choixDuCalibre` (mêmes calibres, mêmes mots), ↑↑↑ Entrée retient 5 A « déclenche », Ctrl+Z, « Tout le catalogue
MS3320 (13) », Échap rend la case ; écrire (premier clic = choisir et donner le clavier, une touche ouvre le champ,
un clic sur la ligne choisie écrit, Ctrl+Maj+Z refait) ; « Ce qu'il faut faire » en gestes, liens à 28 px ; Vos
fichiers, Normes, Bible, Hypothèses ouverts par le ⋮ prennent le clavier, Échap les ferme et le rend au ⋮ sans sa
bulle (le clavier parti de la page, comme le juge) ; Normes (croix « Fermer · Échap », onglets-titre, bulles des
sources et des domaines) ; → vers la Bible, « / », « 12-8 », Échap ×3 ; une zone dans Vos fichiers ; les
Hypothèses ; le schéma Visio prend et rend le clavier.

### Une correction du juge (`tests/ux.js`, un faux positif prouvé)

`ux.js` saute déjà tout élément dans un `svg` (ligne 209 : `e.closest('svg')`) — un dessin n'est pas un texte d'interface.
Mais la marche des nœuds texte partie de `#planche` (qui coupe, `overflow:hidden`) redescendait dans le dessin du
folio : dès que le dessin dépasse la planche — le récapitulatif en moitié qui glisse le dessin au-dessus du tiroir,
mais aussi tout zoom du plan —, le cadre de la feuille était « texte rogné en haut ». Une condition :
`n.parentElement.closest('svg')` dans la marche (ligne 222), commentée. Rien d'autre n'a bougé dans le juge.

## 2. Le juge `tests/ux.js` sur le domaine

Écrans : recapitulatif, recap-equipements, -disjoncteurs, -barrettes, -prises, -cables, -raccords, -problemes,
-normes, recap-page, vos-fichiers, normes, bible, hypotheses ; 4 passes (1440 et 1920, clair et sombre).

| sorte | avant | après |
|---|---|---|
| contrastes | 2 (`#ba-filtre`, `#nm-q` : bord à 1,46:1 le jour, 1,81:1 le soir) | **0** |
| cibles | 5 (« Voir les câbles », « Voir », « Aller », « Voir les disjoncteurs » à 21 px ; `.ref-btn` de la bible à 23 px) | **0** |
| noms / bulles | 1 (`#fi-fermer`, une icône seule sans bulle, sur 4 écrans) | **0** |
| coupes | 3 (`.nm-t-source` en points de suspension sans bulle) | **0** |
| Échap | 8 (4 documents : le clavier n'entrait pas, et Échap le rendait à `body`) | **0** |
| focus, cachés, erreurs | 0 | 0 |
| **total du domaine** | **19** | **0** |

Reste `lecture` (14, « à 100 %, chaque écriture du folio fait au moins 9 px ») : c'est l'écran `plan`, que le juge
ajoute toujours — le dessin du folio, domaine D.

Les relevés : `…/corrections/documents/ux-avant.txt` et `ux-apres.txt` ; les captures du juge dans `ux-avant/` et
`ux-apres/`.

## 3. Point par point

### 3.1 « Exporter » devient « Tableau en CSV » (`08-recap.js`, `page.html`, `style-recap.css`)

Le bouton dit ce qu'il fait — « Tableau en CSV », l'icône d'une table — et ouvre un petit menu de verre
(`details.doc-menu`, le patron des menus de documents, `lierMenusDoc`) qui dit ce qu'il sort :
« **Ce qui est montré** — 8 liaisons · folio 1 », « **Tout l'onglet Liaisons** — 201 liaisons, sans folio ni filtre »
(seulement quand on n'en montre qu'une partie), un filet, « **Le retest corrigé (Excel)** » (celui que le technicien
cherchait : il est là, et dans ⋮ › Exporter). La bulle du bouton le dit : « le tableau de cet onglet, en CSV — pas le
retest corrigé ». Le clavier entre sur la première ligne ; Échap rend le bouton.

### 3.2 Les deux « Tout » ne se confondent plus

La portée dit « **Ce folio** · **Tout le plan** » (avec leurs bulles) ; l'export dit « Tout l'onglet Liaisons ». Plus
aucun « Tout » seul.

### 3.3 « À reprendre 4 · 3 sur ce folio »

La puce compte le plan entier (le même compte que le rail et l'onglet Problèmes), le folio en second, en petit
(`lignesDe(O, sansPuces, sansPortee)`). Si les deux sont égaux, un seul nombre.

### 3.4 Les cibles à 28 px

`.rc-lien` (Voir, Voir le premier, Voir les disjoncteurs…) à 28 px de haut sans bouger la ligne (marges négatives) ;
segments, filtre et sa croix, `.rc-f`, « Poser », `.ref-btn` de la bible, `.nm-g`, le « Comment lire » de SEE à 28 px ;
le « ? » des hypothèses fait 18 px à l'œil et 28 px à la main (`::before`).

### 3.5 Les champs se voient, un même geste pour écrire, partout

- **Le filet** : `--filet-champ` (`--t-3` à 74 % sur la feuille, **3,3:1 le jour, 3,9:1 le soir**), écrit en clair dans
  `style-documents.css` pour la feuille ET le récapitulatif — la recherche, le cartouche, le collage, les hypothèses,
  les champs des normes. (Un `color-mix` se lit `color(srgb …)` : le juge n'y voyait « pas de bord ».)
- **Le patron de la fiche (B)** dans la table : sur la ligne survolée ou choisie, un pointillé sous ce qui s'écrit ;
  sous le pointeur, le cadre du champ ; au clavier, l'anneau commun. **Sur la ligne choisie, un clic écrit** (comme
  dans la fiche) ; ailleurs, le premier clic choisit la ligne et lui donne le clavier ; **une touche** sur une valeur qui
  a le clavier ouvre son champ et la reçoit ; Entrée, F2, double-clic restent.
- **Ctrl+Z défait ; Ctrl+Y et Ctrl+Maj+Z refont** dans une case (la demande E-1 d'A2, `refaireEtDire`).
- **Les hypothèses** : champs de 34 px au coin du bouton, la liste « Retour » sans l'apparence du navigateur, son
  chevron au trait.
- **Le calibre est un choix, pas un texte** : l'anneau et le cadre prennent le nombre et son unité (plus « [15] A »).

### 3.6 Le récapitulatif en moitié ne cache plus le dessin (`laisserLePlan`)

Sans rien de choisi, le dessin vient au milieu de la place libre au-dessus du tiroir (`placeDuPlan`, `boiteDuDessin`),
à l'échelle d'avant — ou au moins celle de la feuille entière dans la place libre, si le plan revenait d'une page à
7 %. Avant : on voyait le haut blanc de la feuille. Fermé, la vue d'avant revient (inchangé).

### 3.7 Les documents prennent le clavier ; Échap rend au ⋮ ; chaque × a sa bulle (`08-interface.js`, `08-pdf.js`, `08-visio.js`, `08-references.js`)

- **Ouvrir** (`ouvrirFiche`) retient l'ouvreur (`ouvreurDuDoc` : le ⋮ pour une entrée du menu) et donne le clavier au
  document (`prendreLeClavierDuDoc` : l'élément `[data-clavier]` — l'onglet choisi des Normes et de la Bible — ou le
  titre, sans anneau : une place, pas un geste).
- **Fermer** (`fermerFiche(true)`, Échap ou la croix) rend le clavier à l'ouvreur par `rendreLeClavier` d'A2 — sans sa
  bulle (elle couvrait la croix) —, même si le titre caché garde le focus jusqu'à l'image suivante, et même si la carte
  que le document avait remplacée revient et prend le clavier en naissant.
- **Le PDF et le schéma Visio** font de même (`ouvreurDePiece`, `rendreClavierDePiece`).
- **Chaque croix** a sa bulle du chrome « Fermer `Échap` » : `#fi-fermer` (un seul gabarit, `CROIX_DOC`, pour tous les
  documents et les normes), `#bz-fermer` (« Replier la référence »), `#pdf-fermer`, `#visio-fermer`, `#fw-fermer`, la
  croix de la carte de lecture d'un contrat (`.lb-x`, « Fermer la carte »).

### 3.8 Normes et Bible

- Les onglets **font le titre** (« Normes » s'écrivait trois fois) : sur-titre « Ce que l'outil vérifie », onglets
  « Normes · Bible des barrettes » à 15 px, le titre reste pour les lecteurs d'écran ; ← → passent de l'un à l'autre.
- « à confirmer » se dit **une fois**, en haut (« dont N à confirmer », sa bulle dit ce que c'est) et dans la table dépliée — plus un badge ambre
  sur presque chaque table fermée.
- Une source trop longue tient sur une ligne, sa bulle la donne entière ; le sens d'un domaine, une ligne et sa bulle.
- Dans une table, un long texte qui se répète d'une ligne à l'autre s'écrit une fois : « ″ » dessous, sa bulle le redit.
- **La Bible a une recherche** (`#bi-q`) : référence, nature, famille, bornes, gauge (« 12-8 » trouve ASNE0059-12-8,
  « #16 » une gauge admise) ; « / » y met le clavier ; Échap la vide, puis la quitte. L'état tient en une ligne ; les
  colonnes « Intensité » et « Blindé » ne paraissent que si un quart des lignes montrées les remplissent.

### 3.9 « Vos fichiers » allégé (`08-fichiers.js`)

Une seule zone de dépôt — l'entrée qu'on vient chercher (la première qui manque) — et elle EST son geste (« Glissez
le retest ici ou cliquez ») : plus de bouton « Ouvrir un retest… » au-dessus d'elle. Les autres entrées gardent leur
bouton au trait et reçoivent toujours un fichier qu'on y glisse. Trois zones pointillées → une.

### 3.10 Les Hypothèses (`08-interface.js`, « LES HYPOTHÈSES »)

Le chapeau : « Ce que le retest ne porte pas, Volta le suppose ; chaque fiche qui s'en sert le dit (**hypothèse**).
**Ces réglages sont écrits dans chaque export** — la page « Hypothèses et sources » du dossier PDF, la feuille « Volta »
du retest corrigé. » Chaque réglage : une phrase d'une ligne (`COURT_HYPOTHESES`) et son « ? » qui donne le paragraphe
entier en bulle (data-bulle, plus de `title`). 232 mots → 141 sur l'écran.

### 3.11 L'onglet Disjoncteurs et le choix du calibre (C E-2, B)

- Colonnes d'office : **Repère · Calibre · Retest · Verdict · Problèmes** ; « Meilleur », le part number, le permanent,
  les câbles protégés, la pire chute, la courbe, le folio au choix.
- **Le retest** : le calibre que le retest porte, **barré avec son unité** quand Volta en retient un autre (sa bulle :
  « Le retest porte MS3320-10 : 10 A — Volta retient 15 A ») ; « proposé » à côté du calibre quand il n'est pas encore
  écrit (`propositionNonEcrite`).
- **Le verdict en trois mots** (`verdictDeCalibre`) : passe, juste, déclenche ; la bulle dit pourquoi
  (`pourquoiDuCalibre`).
- **La gamme** : la case ouvre une liste de verre, **le composant de la fiche** — `choixDuCalibre(nom, tout)` de B : les
  mêmes calibres, les mêmes trois mots, la même marque (coche, vague, croix), la raison sous chacun (`raisonDuCalibre`),
  les étiquettes « retest », « ★ proposé », « automatique », « hors préférés » ; au pied « Tout le catalogue MS3320
  (13) » / « Seulement vos calibres préférés (7) » et « Rendre l'automatique ». Au clavier : ↑ ↓ Début Fin, Entrée
  retient (même un calibre qui déclenche : il se retient, la ligne le dit en rouge), Échap et Tab la ferment et rendent
  la case ; Ctrl+Z rend le calibre d'avant.

### 3.12 « Ce qu'il faut faire » (C E-1)

L'onglet Problèmes porte les gestes du contrôle (`gestesDuPoint`) : le principal en bouton au trait dense (« Tout
régler : 102CB1 en 15 A et 3 câbles en DR12 »), les autres en lien (« Voir 102CB1 ») ; la phrase du remède seulement
quand aucun geste ne règle ; « ou un calibre plus petit » a disparu ; la colonne « Aller » aussi (les gestes la
portent). Le compte de l'onglet est `compteProblemes()`, le même que le rail.

### 3.13 Les autres demandes reçues

- C E-3 : `ouvrirFichier` nomme la feuille laissée de côté (« N liaisons lues · la feuille « Notes » est laissée de
  côté (pas les en-têtes du retest) » ; plusieurs : « 2 feuilles laissées de côté : « Notes », « Feuil4 » »), plus
  « 1 feuille ignorée ».
- C E-4, A2 E-3 : la croix « Fermer · Échap », Échap rend au ⋮ (3.7).
- C E-5 : le texte des Hypothèses (3.10).
- A2 E-2 : Visio rangé dans Exporter, `avant: 'suivi'`.
- A2 E-4 : `#base.page { top: calc(var(--entete) + var(--jeu) + var(--sur-h)) }`.
- A2 : chaque entrée suit `@keyframes entre` (`--entre-x`, `--entre-y`) : `doc-fondu`, `rc-tombe`, `rc-parait`,
  `see-entre`, `pdf-entre`, `cp-ouvre`, `nm-*` retirés (et la `.fwd` de `style-ref.css`, qui lisait `doc-fondu`).

### 3.14 SEE, PDF, Visio, cartouche

- **Base SEE** : le verdict de la cohérence d'abord, sous le titre ; « Comment lire cette page » replié ; un sous-titre
  « Feuilles du classeur » après le filet des onglets ; les noms `OBJ_`, `LNK_`, `SET_` raccourcis ; le mot qui passe en
  bas (il couvrait le titre et la croix).
- **PDF** : le panneau de relecture s'aligne sur le jeu des autres surfaces ; le mot qui passe en bas, au-dessus des
  outils ; le clavier entre et revient.
- **Cartouche, collage** : le filet des champs (3.5) ; rien d'autre à reprendre.

### 3.15 Ce qui n'a pas été fait (assumé)

- La rangée des puces du récapitulatif défile en 1440 (« Sans contact » sous le fondu) : elle était faite pour, la
  portée et « À reprendre » sont plus longs qu'avant. En 1920, tout tient.
- Les gestes « Tout régler » se répètent ligne à ligne dans l'onglet Problèmes : c'est le geste de chaque point (C) ;
  un regroupement par repère serait un autre chantier.

## 4. Demandes aux autres domaines

**B — `src/08-carte.js` (urgent, vu en vérifiant Échap).** `function rendreLeClavier()` (ligne 274) porte le même nom
que `function rendreLeClavier(el)` d'A2 (`08-menu.js`, ligne 26). Les modules sont concaténés dans un seul script : la
dernière déclaration gagne, celle d'A2. Appelée sans argument par l'observateur de la carte (ligne 284), elle sort tout
de suite : **la carte fermée ne rend plus le clavier à son ouvreur**. Renommer celle de la carte :

```js
function rendreLeClavierDeLaCarte() { const o = CARTE.ouvreur; CARTE.ouvreur = null; const a = document.activeElement;
// …
new MutationObserver(() => { if (el.hidden) rendreLeClavierDeLaCarte(); })
```

**B — `src/08-carte.js` / `08-fiche.js`.** Après Ctrl+Z d'un calibre retenu dans le récapitulatif, la carte du bloc se
rouvre et prend le clavier (`prendreLeClavier`) : la table le perd. Quand l'annulation vient du récapitulatif ouvert
(`!$('base').hidden && $('base').contains(document.activeElement)`), la carte peut se rouvrir sans prendre le clavier.

**A2 — `src/style.css`.**

- Monter `--filet-champ` dans le socle, sous un nom commun (`--l-champ` : `#898e97` le jour, `#7282a0` le soir), et
  le donner à `.filtre`, `.champ input` partout ; `style-documents.css` le définit aujourd'hui sur `:root`.
- Ranger la section « LES DOCUMENTS » de `style.css` (la coquille commune `#fiche`) dans `style-documents.css`, qui
  la complète désormais.
- `#q`, le bord à 1,47:1 (déjà demandé par B).

**Le propriétaire de `tests/ux.js`.** Le relevé des couleurs (`rgba()`, ligne 101) ne lit que `rgb(…)` : un
`color-mix` rendu `color(srgb …)` passe pour « sans bord ». Lire aussi `color(srgb r g b / a)` (valeurs 0–1) éviterait
d'écrire les couleurs en dur.

**D — `src/06-dessin.js`, `style.css`.** Les 14 sortes d'écriture du folio sous 9 px à 100 % (`lecture`, écran `plan`).

**DESIGN.md (le socle).** À reporter : un document prend le clavier (l'onglet choisi ou son titre) et Échap le rend à
l'ouvreur ; la croix dit « Fermer · Échap » ; un export dit ce qu'il sort (« Tableau en CSV », « Ce qui est montré »,
« Tout l'onglet ») ; la gamme du récapitulatif est le composant de la fiche ; le filet d'un champ à 3:1.

## 5. Les captures qui le disent

Dans `…/corrections/documents/avant/` et `apres/` (1440 et 1920, clair et sombre) :

- `recap-moitie-1440-clair.png` : avant, le haut blanc de la feuille au-dessus du tiroir ; après, le dessin entier, et
  « Tableau en CSV », « Ce folio · Tout le plan », « À reprendre 4 · 3 sur ce folio ».
- `recap-disj-calibre-1440-clair.png` : avant, une liste du navigateur « 15 A ★ le meilleur — tient » ; après, toute la
  gamme en trois mots, la raison sous chaque calibre, « retest », « ★ proposé », et le 10 A du retest barré.
- `recap-problemes-1440-clair.png` : « Ce qu'il faut faire » en gestes.
- `fichiers-1440-clair.png` : trois zones pointillées et deux boutons en double → une zone.
- `see-1440-clair.png`, `pdf-1440-clair.png` : le mot qui passe ne couvre plus le titre ; la cohérence d'abord.
- `hypotheses-1440-sombre.png`, `bible-1440-sombre.png` : une phrase et son « ? » ; la recherche de la bible.
