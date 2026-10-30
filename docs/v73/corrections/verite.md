# Domaine C — La vérité et les exports (Volta v73) — RAPPORT

Branche `worktree-agent-a784472d53fb47dd8`, répertoire `/home/user/Outil-lectrique-/.claude/worktrees/agent-a784472d53fb47dd8`,
partie du socle `66059fc` (le worktree était sur `bf999ca` : remis sur le socle avant tout travail). **Commit `d138b6c`**.
**Reprise « le calibre écrit »** (§ 5, à la fin) : la branche remise sur `claude/schematic-generator-tool-hih0lj`
(`17b0694`, B fusionné), un commit de plus — l'interface change en 0.3, 0.5, 0.6 et gagne 0.8.

## 0. L'INTERFACE EXPOSÉE (pour A2, B, D, E) — lisez-la, ne la doublez pas

Toutes ces fonctions sont globales (un seul script), appelables à tout moment après le chargement.

### 0.1 Le compte des problèmes — UNE source (08-controle.js)
```js
compteProblemes(folio?)   // folio : un nom de folio ; par défaut app.plan
→ { ko, att, mot, parFolio: Map<folio, { ko, att }>, folio: { ko, att } | null }
//  ko  : les problèmes ROUGES de tout le plan ; att : les points À VOIR (ambre) de tout le plan
//  mot : « 4 problèmes · 8 à voir » (« 1 problème », « 1 point à voir », « Rien à reprendre ») — la règle unique
//  parFolio : les mêmes comptes, folio par folio (un point compte sur chaque folio où son repère paraît ;
//             un point du « tableau » n'a pas de folio : il ne compte que dans le plan)
//  folio : le compte du folio demandé (null sur un plan d'un seul folio)
motProblemes(ko, att)     → la même phrase, pour des comptes qu'on a déjà
controleAJour()           → CONTROLE.items, relus si le contrat a changé (sans rien peindre)
```
Déjà branché (mes fonctions) : la pastille du rail (`rendreControle`) montre `ko` en rouge, sinon `att` en ambre, et son
`aria-label` dit « Repères et problèmes (R) — 4 problèmes · 8 à voir ». **P** fait un pas par POINT : « Problème 1 / 4 »
sur les rouges, puis « À voir 1 / 8 » — les nombres de la pastille. La garde du dossier PDF lit la même source.

### 0.2 Les trois mots du verdict — UNE table (09-disjoncteurs.js, le moteur)
```js
VERDICTS_CALIBRE = {
  passe:     { cle: 'passe',     mot: 'passe',     encre: '--ok',   etat: 'ok',  bulle: 'Il ne déclenche pas, avec la marge.' },
  juste:     { cle: 'juste',     mot: 'juste',     encre: '--warn', etat: 'att', bulle: 'Il touche la courbe : il passe, mais sans la marge.' },
  declenche: { cle: 'declenche', mot: 'déclenche', encre: '--ko',   etat: 'ko',  bulle: 'Il déclenche.' } }
verdictDeCalibre(g)              // g : une ligne de d.gamme ({ valide, marge }), ou le verdict d'ensemble d = disjonctionDe(nom)
→ une entrée de VERDICTS_CALIBRE, ou null (pas de profil, pas de courbe : rien ne se juge)
pourquoiDuCalibre(norme, d, cal) → { verdict, phrase } | null
//  « 5 A — déclenche : démarrage et transition, 9,31 A pendant 2,1 min »
//  « 10 A — juste : ses pointes consomment 82 % du temps de déclenchement, 405 % avec 10 % de marge (75 % au plus) »
//  « 15 A — passe : le profil reste sous sa courbe, avec la marge ; des câbles à grossir »
catalogueDeLaFamille(F)          → le catalogue ENTIER de la famille (sans les calibres préférés) : « Tout le catalogue MS3320 (13) »
```

### 0.3 Les problèmes d'un CÂBLE, avec la chaîne de cause (08-controle.js)
```js
problemesDuCable(l)   // l : la liaison (du contrat, ou sa copie d'un folio)
→ [{ niveau: 'ko'|'att', texte, bulle?, section: 'fils', genre, repere, cause?, gestes: [{ mot, aide, faire, principal? }], point? }]
//  texte : la phrase SANS le nom du câble en tête (on est sur sa fiche) : « Démarrage et transition 9,31 A / 2,1 min >
//          6,9 A admis en continu (× 0,6) », « Contact taille 20 supposé (7,5 A) < calibre 10 A du retest — pas protégé
//          en surcharge », « Chute en ligne vers 103RL1:A1 en pointe : 2,33 V … » — (reprise) tout se juge sous le
//          calibre ÉCRIT (0.8) : « du retest » le dit quand l'outil propose un autre calibre sans l'écrire
//  la CAUSE (quand le calibre ÉCRIT au retest de son disjoncteur ne passe pas) — en ambre, même si le câble suit :
//    { niveau: 'att', texte: '102CB1 : le 10 A du retest est juste — Volta propose 15 A, qui demande 3 câbles en DR12',
//      bulle: '10 A — juste : ses pointes consomment … \nIl touche la courbe : il passe, mais sans la marge. Il protège ce câble.',
//      cause: { repere: '102CB1', retest: 10, retenu: 15, verdict, cables: [{ cable, actuel, propose }], mot },
//      gestes: [« Tout régler : 102CB1 en 15 A et 2 câbles en DR12 » (principal), « Voir 102CB1 »] }
plusFinSousLeRetest(l) → { type, calibre, pourquoi } | null   // « Seulement W-012 » : la gauge que protège le calibre ÉCRIT
causeDuDisjoncteur(nom) → la cause ci-dessus, ou null ;  toutRegler(nom) → le geste « Tout régler » (origine Volta)
```
Chaque élément de `CONTROLE.items` qui parle d'un câble porte désormais `cables: [liaison…]` (la charge, la protection, le
contact contre le calibre, la chute d'un chemin, le CCA).

### 0.4 Les gestes d'un point du contrôle (08-controle.js)
```js
gestesDuPoint(x)      // x : un élément de CONTROLE.items
→ [{ mot, aide, faire, principal? }]
//  deux part numbers : « Unifier sur MS3320-15 », « Unifier sur 4120-F-10A » ; un disjoncteur dont le retest ne passe
//  pas : « Tout régler : 102CB1 en 15 A et 3 câbles en DR12 » ; une barrette à poser : « La poser » ; sinon « Voir 300XC1 »
```
Pour « Ce qu'il faut faire » (E, onglet Problèmes) et la barre des problèmes d'une fiche (B) : le geste concret, jamais
un conseil (« ou un calibre plus petit » est faux pour W-012).

### 0.5 Le retest corrigé : ce qui part (08-export.js)
```js
changementsDuRetest() → { liaisons, cases, ecrits: [{ objet, colonne, colonnes, champ, avant, apres, origine: 'main'|'volta', n, liaisons }],
                          proposes: [{ genre: 'calibre'|'module', repere, retest, retenu, verdictRetest, verdictRetenu, cables, geste, suite, faire }],
                          problemes: { ko, att, mot, … } }
nombreDeChangements() → le nombre de liaisons modifiées (la pilule « 3 changements · Retest corrigé » de A2)
motChangements(n)     → « 3 changements » · « 1 changement » · « aucun changement »
exporterRetestCorrige()    → ouvre LE RELEVÉ (un document, mode 'releve') ; rien ne s'enregistre
enregistrerRetestCorrige() → écrit l'Excel (le bouton plein du relevé) ; rend { wb, liaisons, modifiees, cases }
avecOrigineVolta(faire)    → fait `faire()` et marque chaque case qu'il change « proposition de Volta acceptée »
classeurRetestCorrige(V, nom, { ouvert?, volta? })   // inchangé pour la conversion en lot (A1), deux options en plus
calibresAuFolio(nom)       → { calibre (l'ÉCRIT — reprise), retest (le part number s'il diffère encore du calibre écrit, rare),
                               propose (le calibre que Volta propose sans qu'il soit écrit, sinon null) }
```

### 0.6 La chute affichée — UNE fonction
`chutesDuDisjoncteur(cb)` (08-fiche) : le contrôle la lit désormais (et sa pire pointe par `pireChuteEnPointe`). La fiche du
câble, la fiche du disjoncteur, l'onglet Problèmes et le PDF portent le même nombre. **Reprise** : la chute propre du
disjoncteur est celle du calibre ÉCRIT (`chutesDe`, 08-disjoncteurs) — 2,33 V pour W-012 en pointe, 1,34 V au permanent,
partout (et plus 2,28 V, la chute d'un 15 A qui n'est pas dans le fichier). Le récapitulatif lit la même (`infoDisj`).

### 0.8 Le calibre ÉCRIT (reprise) — 08-disjoncteurs.js, `disjonctionDe`
```js
disjonctionDe(nom).calibreEcrit  // le calibre qui sera MONTÉ : le part number du retest tant que l'outil propose un autre
                                 // calibre sans qu'il soit écrit ; sinon d.calibre (retenu à la main, ou accepté et écrit)
disjonctionDe(nom).filsEcrits    // les câbles jugés sous calibreEcrit (protectionDesFils) — === d.fils quand rien n'attend
calibreAuFolio(nom)              // (08-disjoncteurs) → calibreEcrit : le folio, l'impression, le Visio, le PDF l'écrivent
ecrireLeCalibre(nom, cal)        // (08-controle) écrit SEUL le part number du calibre proposé, origine Volta → bool
```
`d.calibre` reste le calibre que l'outil RETIENT (la proposition, ou l'écrit) : le cadran, le héros « 15 A proposé », la
carte de décision, `deciderCalibre` le lisent. Tout ce qui JUGE le faisceau tel qu'il sera monté lit `calibreEcrit` /
`filsEcrits` : le contrôle, la fiche du câble, la section Câbles du disjoncteur, le récapitulatif, la nomenclature, le PDF.

### 0.7 La relecture d'un retest corrigé (02-lecture.js)
`lectureDuFichier(f)` rend en plus `journaux` (les feuilles « Modifications », reconnues à leur nom ou à leur en-tête
Colonne · Avant · Après : un journal, laissé de côté — et plus compté dans `ignorees`) et `volta` (la feuille cachée
« Volta »). `lireTexte(texte)` rend `volta` et `journaux`, remet sur chaque liaison ses contacts choisis à la main, et
retient le reste (`retenirVolta`) : les profils de charge et les choix des fiches se reprennent d'eux-mêmes au premier rendu
du plan qu'ils accompagnent (`reprendreVoltaEnAttente`, appelé par `rendreControle`), quel que soit le chemin (Ctrl+O, un
dépôt, la bibliothèque dans la même session). `reprendreVolta(volta, journaux)` est aussi appelable à la main.

## 1. Ce qui est fait, point par point (le brief, domaine C)

**Ce que l'écran montre est ce qui part (technicien n° 1) — fait.** La décision tient : Volta n'écrit JAMAIS dans le retest
ce que le lecteur n'a pas demandé.
- `exporterRetestCorrige` (⋮ › Exporter, et la future pilule de A2) ouvre d'abord **le relevé**, un document de la page —
  plus aucun `confirm()`. Il se lit comme un ticket : trois chiffres en tête (les liaisons modifiées, les choix de Volta
  à écrire en ambre, les problèmes qui restent en rouge · à voir), puis :
  - **« Ce qui part »** : une ligne par case changée, groupée par objet (le part number de 102CB1 sur ses trois liaisons
    fait une ligne, « part number · 10 → 15 A · 3 liaisons »), avant barré → après, et son origine (« à la main », ou
    « ★ Volta ») ;
  - **« Choisi par Volta, pas encore écrit »** : « 102CB1 — Volta retient 15 A *passe* · le retest dit ~~10 A~~ *juste* —
    Sans ce geste, l'Excel garde MS3320-10. Le 15 A demande W-011, W-015 en DR12 » et son geste au trait
    **« Écrire 15 A et grossir les 2 câbles »** ; les modules de barrette que Volta retient ensemble, d'un geste
    (« Écrire les 4 modules ») ; un part number dont la famille ne se lit pas le dit (« à reporter à la main »), sans
    bouton ;
  - **« Ce qui reste à reprendre »** : les sortes du contrôle, leur compte, leurs repères, « Tout voir sur le plan R » ;
  - le bouton plein **« Enregistrer l'Excel »** et le nom du fichier. Enregistré, le relevé le dit (« ✓ Enregistré à
    10:42 dans vos Téléchargements · …xlsx ») et le bouton devient « Enregistrer de nouveau ».
  Le relevé suit le plan (un geste, un Ctrl+Z le refont) ; il prend le clavier (son bouton plein).
- La feuille **« Modifications »** gagne la colonne **« Origine »** : « à la main » ou « proposition de Volta acceptée » ;
  le commentaire de chaque case aussi (« Avant : MS3320-10 · proposition de Volta acceptée »). L'origine se garde sur la
  liaison (`l.avant['volta:type']` = la valeur que Volta y a mise), donc dans l'historique et la bibliothèque ; réécrite à
  la main, la case redevient « à la main ».
- La pilule de A2 : `nombreDeChangements()`, `motChangements(n)`.

**Le retest corrigé, rouvert, ne se corrompt plus (ingénieur n° 2) — fait, testé.**
- La lecture laisse de côté la feuille « Modifications » (son nom, ou son en-tête Colonne · Avant · Après) — un journal —
  et le dit (« Retest corrigé par Volta · le profil de charge repris de la feuille « Volta » ; la feuille « Modifications »
  est le journal de Volta : laissée de côté. »).
- L'export ajoute une feuille **cachée « Volta »** (lisible si on la démasque : sorte, clé, valeur en mots, donnée) : les
  profils de charge, les hypothèses, les contacts choisis à la main, les désignations, les sexes, les raccords. La lecture
  la reprend, quel que soit le chemin du fichier ; les hypothèses du fichier ne remplacent jamais les vôtres sans vous (le
  mot qui passe offre « Reprendre ses hypothèses » quand elles diffèrent).
- Le test (tests/format-retest.js, R4) : « Tout régler » sur 102CB1, un contact choisi à la main, le relevé, le bouton plein,
  l'Excel (Retest, Modifications avec Origine, Volta cachée), rouvert par `ouvrirFichier` : **201 liaisons, aucune sans
  type, le profil et le contact repris, le même verdict de 102CB1 (MS3320-15, 15 A, passe)**.

**Deux part numbers sur un même repère (ingénieur n° 3) — fait, testé.** Un disjoncteur qui porte deux part numbers lève un
problème rouge (« 102CB1 porte deux part numbers : MS3320-15 (W-012, W-015) ; 4120-F-10A (W-011) », genre « disjoncteurs à
deux part numbers »), avec les gestes « Unifier sur MS3320-15 » / « Unifier sur 4120-F-10A » (une entrée d'historique, Rétablir).
Limité aux disjoncteurs : un équipement à plusieurs connecteurs porte légitimement plusieurs part numbers.

**Une seule chute affichée (ingénieur n° 4) — fait, testé.** Le contrôle lit la chute des fiches (`chutesDuDisjoncteur`, et
sa pire pointe `pireChuteEnPointe`) au lieu de la recalculer avec le calibre du part number : W-012 vaut **2,28 V partout**
— fiche du câble, ligne de la fiche du disjoncteur, contrôle (onglet Problèmes), garde du PDF (tests/controle.js).

**Les problèmes de protection et de contact rattachés au CÂBLE (ingénieur n° 5, technicien n° 1) — fait côté C, à afficher
par B.** Chaque point du contrôle qui parle d'un câble porte `cables` ; `problemesDuCable(l)` les rend sans le nom en tête,
plus la CAUSE (le calibre ÉCRIT du disjoncteur ne passe pas) en ambre, avec « Tout régler : 102CB1 en 15 A et 2 câbles en
DR12 » et « Voir 102CB1 ». Testé : après « Passer en DR12 » seul, W-012 garde la cause ; « Tout régler » écrit MS3320-15
(origine Volta) et la cause s'en va. `plusFinSousLeRetest(l)` donne le « Seulement W-012 ».

**Le compte des problèmes, une seule source — fait, testé.** `compteProblemes()` (plan, puis folio) ; la pastille du rail
montre les rouges, son nom le dit ; P parcourt « Problème 1 / 5 » puis « À voir 1 / 9 », un pas par point ; la garde du PDF
lit la même source.

**Trois mots de verdict (ingénieur n° 8) — la table est faite, testée ; B et E la portent à l'écran.** `VERDICTS_CALIBRE`,
`verdictDeCalibre`, `pourquoiDuCalibre` (« 5 A — déclenche : démarrage et transition, 9,31 A pendant 2,1 min ») dans le
moteur. Mes écrans (relevé, nomenclature, dossier PDF, cause du câble) les emploient. Le « ? » du calibre lit la gamme de
la famille (« Essaie chaque calibre de la gamme MS3320 (1 · 3 · 5 · 7,5 · 10 · 15 · 20 A — vos calibres préférés parmi les
13 du catalogue MS3320) » ; plus de 25 A). « Ce qu'il faut faire » : `gestesDuPoint` donne le geste concret ; les phrases de
`controleDisjonction` (« ne passe pas : il touche la courbe ») sont dans 08-disjoncteurs (B) : demande B-4.

**La nomenclature et le dossier PDF (ingénieur n° 6 et 9) — fait.**
- Un groupe **« Disjoncteurs »** : repère, part number à COMMANDER (celui du calibre retenu, « construit · à vérifier »
  quand il diffère du retest), calibre retenu, retest barré, état (passe · pas écrit au retest). Le disjoncteur n'est plus
  un « connecteur » (ni contact à sertir, ni tyrap sur ses bornes à vis). Dans le document, le CSV, l'Excel et le PDF.
- Le folio : le PDF passe `{ calibre: 15, retest: 10 }` au dessin ; l'écriture « (retest 10 A) » est dans 06-dessin (D) :
  demande D-1.
- **Un seul compte de repères** : 67 partout (la garde disait 77) — `nombreDeReperes`, la règle du menu.
- **Aucune troncature** dans les pages écrites : une case trop longue passe sur deux à huit lignes (la ligne grandit) ; la
  garde fait de même (les sous-titres, les points de « Ce qui reste à reprendre » sur deux lignes, le reste descend).
  Testé : aucun « … » sur la garde, la page des hypothèses, la nomenclature, les modifications.
- **Pas de colonne vide** : une colonne que ses lignes ne remplissent pas ne s'écrit pas (Fourreau, Valeur de l'outil,
  Autres états…), au PDF comme dans le document.
- Une page **« Hypothèses et sources »** juste après la garde, en deux colonnes : les réglages (valeur, valeur de l'outil
  si elle diffère, source : AC 43.13-1B fig. 11-5, R2 règle 13…), les profils de charge par disjoncteur (calibre retenu,
  retest), le statut des tables (vérifiées, déduites, à confirmer, vos tables). La garde dit désormais l'appareil, le
  harness et la date du retest quand le plan les porte.
- La barre du dossier dit le temps restant (« environ 8 s ») passé deux secondes.

**Non fait, et pourquoi**
- Le groupe « Cosses » (une borne de disjoncteur sur goujon) : aucune table de cosses dans les normes — rien n'est inventé.
- Le « contact taille 23 supposé » au bout d'un câble de disjoncteur : c'est l'autre bout (un interrupteur sans plan) que
  le moteur suppose, par prudence ; la règle reste, la glose de B le dit.
- Tout ce qui s'affiche dans les fiches, le récapitulatif, la barre, le folio : demandes B, A2, D, E ci-dessous.

## 2. Les batteries, le juge, les captures

**Batteries** — toutes sur ma branche (index.html reconstruit) :
`node tests/toutes.js` (23 batteries) : **20 vertes du premier coup**, puis :
- `interface` : 1 échec pendant la passe complète (machine partagée) — relancée seule : **tout tient** ;
- `couverture` : 2 échecs, tous deux de mon fait, corrigés et relancés : **75 / 75** — (1) l'étape du « ? » du calibre
  dépassait 120 signes (raccourcie : « Essaie la gamme MS3320, du plus petit au plus grand : 1 · 3 · 5 · 7,5 · 10 · 15 ·
  20 A (7 sur 13 : vos préférés) ») ; (2) la chute de 201CB1 attendue avec le calibre du part number (2,1 V / 2,19 V) :
  le contrôle lit désormais LA chute des fiches, celle du calibre retenu (2,05 V / 2,14 V) — **contrôle mis à jour**, deux
  problèmes toujours ;
- `ux` : 40 échecs · 75 défauts distincts (le panel en comptait 95 sur la v72), **aucun dans le code du domaine C** — ni
  avant ni après ; l'écran « index », où vivent ma liste « à reprendre » et la pastille, compte 20 défauts sur le socle
  66059fc comme sur ma branche (le même `#btnIndex` : l'anneau du focus du rail, A2).
Relancées après les dernières retouches : `controle` 38 / 38, `couverture` 75 / 75, `format-retest` 28 / 28,
`bibliotheque`, `fiche`, `disjoncteur` 83 / 83, `interface`, `parcours` (138, 0 échec), `normes`, `memoire` 9 / 9,
`pdf` 30 / 30 : vertes. Aucune `pageerror` (chaque batterie la compte ; `regarder.js` aussi, en 1440 et 1920, clair et
sombre). Pas de fusion : la branche de base n'a pas bougé depuis 66059fc.

Tests ajoutés ou mis à jour (dit) :
- `tests/controle.js` § 8 (11 contrôles neufs) : un compte, une chute (fiche câble = fiche disjoncteur = contrôle = PDF),
  le PDF (67 repères, la page des hypothèses, aucun « … »), les problèmes du câble et leur cause, « Tout régler » et son
  origine, deux part numbers et « Unifier », les trois mots et le pourquoi chiffré, le « ? » sans 25 A, le groupe
  Disjoncteurs sans colonne vide.
- `tests/format-retest.js` : le contrôle de la feuille Modifications attend la colonne Origine (MIS À JOUR : la feuille a
  une colonne de plus) ; R4 ajouté (le relevé, l'Excel à trois feuilles, la réouverture, 201 liaisons, le même verdict).
- `tests/bibliotheque.js` : « Le retest corrigé » ouvre d'abord le relevé ; le téléchargement vient de son bouton plein
  (MIS À JOUR).
- `tests/pdf.js` : le folio 3 n'est plus la page 4 (la page des hypothèses suit la garde) : on cherche la page qui dit
  « 3 / 6 » (MIS À JOUR).

**Le juge (`tests/ux.js`)** — il n'a aucun écran du domaine C : sur ses écrans, aucun défaut ne touche mon code (ni avant,
ni après). Je l'ai donc fait juger mes deux documents par une COPIE (rien n'est changé dans tests/ux.js) :
`…/verite/outils/ux/ux-c.js` (+ le relevé, + la nomenclature). Avant : la nomenclature ne prenait pas le clavier ;
après : **aucun défaut propre au relevé ni à la nomenclature**, en 1440 et 1920, clair et sombre (contrastes, cibles,
noms, textes coupés, éléments cachés). Restent ceux de la coquille et du chrome : `#fi-fermer` sans bulle et Échap qui
ne rend pas le clavier au ⋮ (E-4), `#q` et `#fo-strip` (A2, D).

**Les captures** (dans `/tmp/claude-0/-home-user-Outil-lectrique-/d44a74ef-5d4e-5d70-aef6-303c6243d2ca/scratchpad/v73/corrections/verite/`) :
- avant : `avant/releve-1440-clair.png` (le mot qui passe, rien à relire), `avant/fil-1440-clair.png` (W-012 vert après
  « DR12 » seul), `avant/pdf-page01.png` (77 repères, un texte coupé), `avant/pdf-page08.png` (MS3320-10 « connecteur »,
  Fourreau vide), `avant/nomen-1440-clair.png` ;
- après : `apres/releve-1440-clair.png`, `apres/releve-1440-sombre.png`, `apres/releve-1920-clair.png`,
  `apres/releve-bas-1920-sombre.png`, `apres/ecrit-1440-clair.png` et `apres/ecrit-1440-sombre.png` (après « Écrire 15 A » :
  l'origine Volta), `apres/ecrit-fait-1920-sombre.png` (enregistré), `apres/nomen-dj-1440-clair.png`,
  `apres/nomen-dj-1920-sombre.png` (le groupe Disjoncteurs), `apres/pdf-page01.png` (67 repères, rien de coupé),
  `apres/pdf-page02.png` (Hypothèses et sources), `apres/pdf-page10.png` (Disjoncteurs, les listes entières),
  `apres/pdf-page11.png` (Modifications avec Origine). Les outils : `outils/regarder.js`, `outils/nomen-dj.js`.

## 3. DEMANDES AUX AUTRES DOMAINES (le code exact)

### Au domaine B (les fiches)

**B-1 — La fiche du câble montre SES problèmes et la cause** (`src/08-fiche.js`, `ficheFil`, après le calcul de `probs`).
Le contrôle relève déjà, pour le câble, sa charge, sa protection, son contact contre le calibre et la chute de son chemin ;
la fiche les recalcule avec d'autres mots (deux phrases pour un même fait). Remplacer les deux blocs `x.trop.forEach(…)`
et `if (ch.trop) … else if (ch.pointe) …` par :
```js
  // v73 (domaine C) : les problèmes que le contrôle rattache au câble, et la CAUSE quand son disjoncteur ne passe pas — un
  // câble ne passe pas au vert tant que son disjoncteur est rouge ; chacun porte ses gestes (« Tout régler »)
  const deC = !neuf && x.al && typeof problemesDuCable === 'function' ? problemesDuCable(l) : null;
  if (deC) deC.forEach(p => probs.push({ niveau: p.niveau, texte: p.texte, bulle: p.bulle, section: 'fils', gestes: p.gestes, cause: p.cause }));
  else { x.trop.forEach(pt => probs.push({ niveau: 'ko', texte: `${pt.nom} ${amperes(pt.i)}${pt.t === Infinity ? '' : ' pendant ' + secondes(pt.t)} : plus que ce que le câble admet (${amperes(intensiteAdmise(x.fn, pt.t) * x.fac)})`, section: 'fils' }));
    if (ch.trop) probs.push({ niveau: ch.reel ? 'ko' : 'att', texte: `la chute en ligne depuis ${x.al.nom} atteint ${volts(ch.total.dU)} : plus que les ${volts(ch.max)} admis${motSupp}`, section: 'fils' });
    else if (ch.pointe) probs.push({ niveau: ch.reel ? 'ko' : 'att', texte: `la chute en ligne depuis ${x.al.nom} atteint ${volts(ch.pointe.dU)} en pointe (${amperes(ch.pointe.i)}) : plus que les ${volts(ch.pointe.admis)} admis${motSupp}`, section: 'fils' }); }
```
puis, dans `barreProblemes`, sous la ligne d'un point qui a des `gestes`, ses boutons (le principal au trait `.btn.papier.dense`,
les autres en `.btn.lien.dense`) : `p.gestes.map((g, i) => `<button type="button" class="btn ${g.principal ? 'papier' : 'lien'} dense" data-geste-pb="${i}" data-bulle="${escA(g.aide)}">${esc(g.mot)}</button>`)` et
`b.onclick = () => g.faire()`. La tuile Intensité prend l'état `att` quand un point `cause` est là.

**B-2 — « Seulement W-012 »** : à côté de « Tout régler », `plusFinSousLeRetest(l)` donne la gauge que protège le calibre
ÉCRIT (`{ type, pourquoi: 'le plus fin que protège le 10 A de 102CB1, celui du retest' }`) ; « suit » devient « protège ».

**B-3 — L'origine « proposition de Volta »** des gestes de Volta (la colonne Origine de l'Excel) :
```js
// src/08-disjoncteurs.js, lierDisjonction (ligne « const retenir = geste(…) ») :
changerFils = geste(() => avecOrigineVolta(() => changerFilsDuMeilleur(nom))), decider = geste(() => avecOrigineVolta(() => deciderCalibre(nom)));
// src/08-fiche.js, [data-reparer] (« Passer en DR12 ») :
    if (avecOrigineVolta(() => changerLiaison(y, 'type', b.dataset.type, 'type de ' + (y.cable || 'câble') + ' : ' + b.dataset.type))) dire(…);
```
(« Passer en 15 A » est déjà reconnu sans cela : un part number de disjoncteur qui porte le calibre automatique.)

**B-4 — Les trois mots** (`src/08-disjoncteurs.js`) — la table est `VERDICTS_CALIBRE` / `verdictDeCalibre` :
```js
// verdictDuRetenu : 
function verdictDuRetenu(d) { const cal = d.calibre;
  if (d.sansProfil) return { etat: '', mot: 'Profil à écrire', raison: 'Sans profil de charge, rien ne se juge.' };
  if (!(cal > 0)) return { etat: 'ko', mot: 'Aucun ne passe', raison: 'Aucun calibre de la gamme ne tient ce profil.' };
  const v = verdictDeCalibre(d) || VERDICTS_CALIBRE.declenche; return { etat: v.etat, mot: majuscule(v.mot), raison: v.bulle, verdict: v }; }
// motVerdict (un point du profil) :
const motVerdict = p => !p || p.ok == null ? 'pas jugé' : p.ok === false ? VERDICTS_CALIBRE.declenche.mot : p.serre ? VERDICTS_CALIBRE.juste.mot : VERDICTS_CALIBRE.passe.mot;
// controleDisjonction : « ne passe pas : il touche la courbe » → « juste » (la courbe touchée dans la parenthèse) ;
//   « le retest porte un 10 A (MS3320-10) qui ne passe pas » → `le ${amperes(d.pn)} du retest (${pnDuRepere(nom)}) ${verdictDeCalibre(d.gPn).mot === 'juste' ? 'est juste' : 'déclenche'} : l’outil retient le ${amperes(d.calibre)}…`
// carteDecision : titre `Le ${amperes(d.pn)} du retest ${v.mot === 'juste' ? 'est juste' : 'déclenche'}` avec v = verdictDeCalibre(g) ;
//   « touche la courbe » dans la bulle (v.bulle).
```
`classeVerdict` reste (ok/ko) mais `p.serre` prend la classe `att` (ambre) — la couleur du mot « juste ».
Les bulles des crans et des puces de la gamme : `pourquoiDuCalibre(app.norme, d, cal).phrase`. Le lien « Tout le catalogue
MS3320 (13) » : `catalogueDeLaFamille(d.famille)`.

**B-5 — « Par rapport au retest »** (technicien n° 10) : la colonne de l'Excel et l'objet viennent de `changementsDuRetest()`
(`objet`, `colonne`, `colonnes`, `calibres`, `origine`), ou de `MOTS_COLONNES` si la fiche garde son propre calcul.

### Au domaine A2 (le chrome)

**A2-1 — La pilule « 3 changements · Retest corrigé »** (`synchroniser`, ou là où la barre se refait) :
```js
const n = typeof nombreDeChangements === 'function' ? nombreDeChangements() : 0;   // les liaisons modifiées
pilule.hidden = !n; pilule.querySelector('.pl-n').textContent = motChangements(n); pilule.onclick = () => exporterRetestCorrige();
```
**A2-2 — ⋮ › Exporter, première ligne** : sous « Le retest corrigé (Excel) », `<small>` =
`n ? plurielLie(n, 'liaison') + ' modifiée' + (n > 1 ? 's' : '') : 'aucune modification'` ; son `data-aide` :
« Ce qui part dans votre retest, relu avant d’enregistrer : chaque case changée dit ce qu’elle portait, et si c’est vous ou
une proposition de Volta. » L'action `retestcorrige` reste `exporterRetestCorrige` (elle ouvre le relevé).
**A2-3 — La pastille et sa bulle** : la pastille est posée par `rendreControle` (08-controle) ; la bulle du bouton lit
`compteProblemes().mot` (« 4 problèmes · 8 à voir ») — ne pas recompter.
**A2-4 — Le toast** : `enregistrerRetestCorrige` dit « Enregistré dans vos Téléchargements : <fichier> — 3 liaisons
modifiées. » (deux lignes) ; le relevé garde « Enregistré à 10:42 » : 2,8 s suffisent, 5 s seraient mieux pour un mot de
deux lignes (technicien § K).

### Au domaine D (le folio)

**D-1 — (remplacé par la reprise, § 5)** Le folio écrit désormais le calibre ÉCRIT (`calibreAuFolio` → `calibreEcrit` :
« 10 A » pour 102CB1, celui que la nomenclature commande) ; rien à faire pour qu'il soit juste. En option, la proposition
en petit : `info.propose` (en A) quand l'outil propose un autre calibre sans qu'il soit écrit — sous « 10 A », en
`font-size` 6 (la classe `cb-cal` plus petite), à l'encre seconde : `(15 A proposé)`. Le dossier PDF le passe déjà
(`calibresAuFolio`). À l'écran et à
l'impression (`src/08-interface.js`, `peindre` l. 673, l. 1326, `svgDuFolio`, `imprimer` ; `src/08-visio.js` l. 184) :
remplacer `n => ({ calibre: calibreAuFolio(n) })` par `n => calibresAuFolio(n)` (et compter `propose` dans la clé du
cache `cal` de `peindre`).

### Au domaine E (les documents, le récapitulatif)

**E-1 — « Ce qu'il faut faire »** (`src/08-recap.js`, l'onglet Problèmes) : un bouton par ligne, `gestesDuPoint(x)` — le
principal au trait dense, les autres en lien ; `remede(x)` ne garde que la phrase pour ce qui n'a pas de geste (et perd
« ou un calibre plus petit »). Ses expressions sur « touche la courbe » suivront les mots de B-4 : `gestesDuPoint` n'en a pas
besoin.
**E-2 — L'onglet Disjoncteurs** : le verdict en trois mots (`verdictDeCalibre(g)` → `etatHtml(v.etat, v.mot, v.bulle)`),
une colonne Retest d'office (`d.pn` barré quand `d.pn !== d.calibre`).
**E-3 — L'ouverture d'un fichier** (`src/08-fichiers.js`, `ouvrirFichier`) : les journaux ne sont plus dans `ignorees` ;
le mot « 1 feuille ignorée » peut nommer la feuille (« la feuille « Notes » est laissée de côté »). Le retest corrigé rouvert
le dit de lui-même (« Retest corrigé par Volta · le profil de charge repris de la feuille « Volta » ; la feuille
« Modifications » est le journal de Volta : laissée de côté »).
**E-4 — La coquille des documents** (le relevé, la nomenclature en profitent) : Échap rend le clavier au bouton qui avait
ouvert (le ⋮), `#fi-fermer` a sa bulle (« Fermer · Échap »). La copie du juge le relève sur mes deux documents.
**E-5 — Les Hypothèses** : « ces réglages sont écrits dans chaque export » est maintenant vrai — la page « Hypothèses et
sources » du dossier PDF, la feuille « Volta » du retest corrigé.

### Au domaine A1 (la bibliothèque)

**A1-1 — Un retest corrigé déposé, rouvert un autre jour** : `plansDuFichier` garde `r.volta` dans le plan qu'il crée
(`{ nom, liaisons, volta: r.volta }`), et `ouvrirPlan` (branche `o.neuf`) appelle, après `chargerContrat` :
`if (o.volta && typeof reprendreVolta === 'function') { const dit = reprendreVolta(o.volta, []); if (dit) dire(dit.msg, false, dit.geste ? { geste: dit.geste, faire: dit.faire } : null); }`.
Dans la même session, la reprise est déjà automatique.
**A1-2 — Le compte d'un plan** (« 5 problèmes dans 1 plan ») : `compteProblemes()` au moment de garder le plan.

### Pour l'intégrateur : DESIGN.md (un paragraphe à ajouter au § 5)
« **Le relevé du retest corrigé** (`08-export.js`, `style-export.css`) : ⋮ › Exporter › « Le retest corrigé » et la pilule
de la barre ouvrent d'abord un document (`mode 'releve'`) — un ticket de trois chiffres (`.rv-ticket`), « Ce qui part »
(`.rv-l` : l'objet, la colonne, avant → après, l'origine `.rv-orig.main|.volta`), « Choisi par Volta, pas encore écrit »
(`.rv-p`, un trait ambre dans la marge, son geste au trait), « Ce qui reste à reprendre » (`.rv-g`), puis le bouton plein
« Enregistrer l'Excel ». Volta n'écrit jamais dans le retest ce que le lecteur n'a pas demandé. »

## 4. Les fichiers touchés
- Du domaine : `src/02-lecture.js`, `src/08-controle.js`, `src/08-export.js`, `src/08-nomenclature.js`,
  `src/08-pdf-dossier.js`, `src/09-disjoncteurs.js` ; `src/style-nomen.css` (la feuille de 08-nomenclature).
- Nouveau : `src/style-export.css` (la feuille du relevé, 08-export ; aucun autre domaine ne la porte).
- Hors liste, une fonction : `src/08-explications.js`, `EXPLICATIONS.calibre` seulement — le brief demande que « le « ? »
  de la gamme lise la gamme de la famille », et ce texte vit là (le fichier n'est à aucun domaine).
- Tests : `tests/controle.js`, `tests/format-retest.js` (ajouts) ; `tests/bibliotheque.js`, `tests/pdf.js`,
  `tests/couverture.js` (mis à jour, dit plus haut). `tests/ux.js` n'est pas touché.

## 5. Reprise : le calibre écrit

**Le désaccord (B, `fiches/RAPPORT.md` § 4, C-1).** Le contrôle jugeait la protection d'un câble, et son contact contre le
calibre, sous le calibre que Volta PROPOSE même quand il n'est pas écrit. 102CB1 : retest 10 A (MS3320-10), Volta retient
15 A d'office. Après « Seulement W-012 : DR16 », la fiche du câble disait « 11,7 A admis < calibre 15 A — pas protégé en
surcharge » — or le retest garde 10 A, et 11,7 A > 10 A : le câble EST protégé par ce qui sera monté. Notre règle : ce que
l'écran montre est ce qui part, rien n'est écrit sans le lecteur.

**La règle, une fois, dans le moteur de la fiche** (`08-disjoncteurs.js`, `disjonctionDe`) : le nom de B est pris.
`d.calibreEcrit` = le calibre qui sera MONTÉ — le part number du retest tant que l'outil propose un autre calibre sans
qu'il soit écrit ; sinon `d.calibre` (retenu à la main, ou accepté : « Passer en 15 A », « Tout régler », « Écrire »).
`d.filsEcrits` = les câbles jugés sous lui. `d.calibre` reste la proposition : le cadran, le héros « 15 A proposé », la
carte de décision la lisent, inchangés.

**Ce qui suit la règle** (tout ce qui juge le faisceau tel qu'il sera monté) :
- **Le contrôle** (`08-controle.js`) : `controleDisjonction` (ses câbles directs, `filsEcrits`) et `controleProtection`
  (les câbles au-delà des prises et des barrettes, la table 11-3, le contact contre le calibre) jugent sous `calibreEcrit`
  et le disent : « contact taille 20 supposé (7,5 A) < calibre 10 A du retest — pas protégé en surcharge ». La proposition
  reste dite à part, par le DISJONCTEUR : « le retest porte un 10 A (MS3320-10), juste — il touche la courbe : l'outil
  retient le 15 A (MS3320-15) », et par la cause sur ses câbles (`causeDuDisjoncteur` : « 102CB1 : le 10 A du retest est
  juste — Volta propose 15 A, qui demande 3 câbles en DR12 », avec « Tout régler »).
- **Le compte** (`compteProblemes`) suit le contrôle : l'exemple passe de « 4 problèmes · 10 à voir » à « 4 problèmes · 8 à
  voir » (W-011 n'est plus « pas protégé » par un 15 A qui n'est pas dans le fichier) ; après « Seulement W-012 : DR16 »,
  « 3 problèmes · 5 à voir ». La pastille, P, le récapitulatif, le relevé et la garde du PDF le lisent.
- **Les gestes** : `plusFinSousLeRetest(l)` cherche sous `calibreEcrit` ; `toutRegler(nom)` écrit la proposition entière
  (inchangé) ; `ecrireLeCalibre(nom, cal)` (nouveau) écrit SEUL le part number du calibre proposé, origine Volta.
- **La chute** : la chute propre du disjoncteur MONTÉ (`chutesDe` → `calibreEcrit`) — 1,34 V et 2,33 V en pointe pour
  W-012, partout (fiche du câble, fiche du disjoncteur, contrôle, PDF, récapitulatif) ; c'était 1,29 V et 2,28 V, ceux
  d'un 15 A qui n'est pas dans le fichier.
- **La fiche du câble** (`08-fiche.js`, B) : `infosDisjoncteur` donne le calibre écrit (la bulle « sous 102CB1 (10 A) »),
  `plusFinQuiTient` cherche sous lui par défaut. La fiche de 102CB1, section Câbles (`lignesFilsDisjoncteur`) : W-011 et
  W-012 en DR16 sont verts sous le 10 A (ils étaient « admet 11,7 A, moins que le 15 A : pas protégé »).
- **Le récapitulatif** (`08-recap.js`, E — quelques lignes, à reprendre par E s'il le veut) : l'onglet Disjoncteurs montre
  le calibre écrit « 10 A », dessous « → 15 A proposé » (sa bulle dit pourquoi) ; le verdict de l'écrit en trois mots
  (« juste », la bulle `pourquoiDuCalibre`) ; « Câbles protégés » sous l'écrit (`filsEcrits`) ; la pire chute est celle des
  fiches ; sous « ★ 15 A », « Écrire » (et le 15 A choisi dans la gamme au double-clic) l'écrit au retest par
  `ecrireLeCalibre` — avant, choisir l'automatique ne faisait rien. C'était la demande E-2.
- **Le folio** (`calibreAuFolio`, 08-disjoncteurs) écrit le calibre ÉCRIT : « 10 A » à côté de 102CB1, à l'écran, à
  l'impression, dans le Visio et le PDF — et la nomenclature commande le même. (L'ingénieur, n° 6 : « le folio écrit 15 A,
  la nomenclature commande un MS3320-10 ». Ma première réponse faisait commander MS3320-15 — un part number que le retest
  corrigé n'aurait pas porté : contraire à la règle.)
- **La nomenclature** (`08-nomenclature.js`) : on commande le part number ÉCRIT (MS3320-10), à son calibre, « juste », et
  « Volta propose 15 A, pas écrit » dessous, en ambre (sa bulle dit que la fiche l'écrit d'un geste) ; la colonne Retest
  barre le part number du FICHIER quand vous l'avez changé ici. Excel, CSV et PDF de même.
- **Le PDF** : les problèmes et le compte suivent le contrôle ; la page « Hypothèses et sources » dit le calibre écrit
  et, à côté, « Proposé » (15 A).
- **Le relevé** dit « Volta propose » (et plus « Volta retient ») pour ce qui n'est pas écrit.

**Ce qui ne change pas, et pourquoi.** La sélectivité se juge sur les calibres que l'outil retient (le sien et ceux des
voisins) : c'est elle qui fait la proposition (205CB5 : « le retest porte un 5 A : l'outil retient le 7,5 A, sélectivité
avec le voisin ») — elle porte le problème du disjoncteur, comme la règle le veut. Un disjoncteur sans part number lisible
(202CB2, ABC-15) n'a rien d'écrit : il se juge sous le calibre que l'outil retient, comme avant (le contrôle dit « famille
inconnue… retenu »).

**Les batteries mises à jour, et pourquoi** (chaque contrôle changé le dit dans son texte) :
- `couverture` : 201CB1, la chute propre du 10 A écrit (2,1 V et 2,19 V, et plus 2,05 V et 2,14 V) ; 205CB5, W-A25 se
  juge sous le 5 A du retest — protégé en continu (5,1 A admis), plus « < calibre 7,5 A » ; reste la surcharge brève.
- `controle` : la nomenclature commande MS3320-10 (« Volta propose 15 A, pas écrit ») ; **§ 9 ajouté, le cas exact de
  B** (six contrôles) : au départ W-011 est protégé sous le 10 A, plus aucune ligne « < calibre 15 A » ; le disjoncteur dit
  toujours la proposition ; « Seulement W-012 : DR16 » d'un clic dans la fiche du câble ; après lui, W-012 n'est plus
  « pas protégé » — ni dans ses problèmes, ni dans le contrôle, ni sur sa fiche — et ne garde que la cause, avec « Tout
  régler » ; le folio écrit 10 A, la nomenclature commande MS3320-10 ; « Tout régler » écrit le 15 A et les DR12, et tout
  se juge alors sous lui (aucun câble « pas protégé », plus de cause, le folio écrit 15 A).
- `disjoncteur` : le folio écrit « 10 A » (trois contrôles : au départ, après « Automatique », le 20 A puis Ctrl+Z) ; après
  « Automatique », le contrôle ne dit plus le DR16 « pas protégé » par le 15 A non écrit.
- `fiche` : la même chute partout, 1,34 V et 2,33 V en pointe (le 10 A écrit).
- `interface` : W-011 (DR16) est « ok » dans l'onglet Liaisons — protégé par le 10 A écrit (il était « à voir » sous le
  15 A proposé).
- `interface` : l'onglet Disjoncteurs montre le calibre écrit (10 A), « → 15 A proposé », « juste », et « Écrire » qui
  l'écrit au retest (MS3320-15) — Ctrl+Z le rend.

**Les batteries ciblées** (trois autres agents tournaient : pas de `toutes.js` entier) — `node tests/toutes.js
format-retest controle disjoncteur fiche couverture interface chrome pdf parcours` : **8 sur 9 du premier coup** —
format-retest 28 / 28, **controle 44 / 44** (38 + les 6 du § 9), disjoncteur 83 / 83, fiche « tout tient », couverture
75 / 75, chrome 43 / 43, pdf 30 / 30, parcours 138 contrôles · 0 échec. `interface` : 1 échec, le mien (l'onglet
Disjoncteurs attendait le 15 A « tient ») — contrôle mis à jour (ci-dessus), relancée seule : **tout tient**. Aucune
`pageerror` (chaque batterie la compte ; `regarder-reprise.js` aussi, sur les quatre passes).

**Le juge** (`tests/ux.js --ecrans=recap-disjoncteurs,fiche-cable,fiche-disjoncteur --sans-mouvement`, quatre passes) :
avant (le socle `17b0694`) 6 échecs · 15 défauts ; après **6 échecs · 15 défauts, les mêmes** — `#ba-filtre` (le bord du
champ, A2 / E) et les écritures du folio à 100 % (D). Une première passe en relevait un de plus, le mien : « Écrire »
(`.rc-mesure .rc-lien`) à 45 × 21 px — la règle prend 24 px de haut (`style-recap.css`, une ligne).

**Les captures** (`reprise/avant/` sur le socle, `reprise/apres/`, en 1440 et 1920, clair et sombre) :
- `cable-apres-*` : après « Seulement W-012 : DR16 », la fiche de W-012 ne dit plus que « 1 point à voir — 102CB1 : le
  10 A du retest est juste — Volta propose 15 A… », la cause et « Tout régler » (avant : « 3 à voir — 11,7 A admis en
  continu (× 0,6) < calibre 15 A — pas protégé en surcharge »).
- `dj-cables-*` : la section Câbles de 102CB1 — W-011 et W-012 en DR16 verts (avant : « admet 11,7 A en continu, moins
  que le 15 A : pas protégé en surcharge » sur les deux).
- `recap-dj-*` : « 10 A → 15 A proposé · juste · ★ 15 A Écrire » (avant : « 15 A · tient »).
- `nomen-*` : « 102CB1 · MS3320-10 · 10 A · juste · Volta propose 15 A, pas écrit » (avant : MS3320-15 à commander).
- `folio-*`, `cable-avant-1920-sombre` : « 102CB1 10 A » au folio (avant : « 15 A »).
- `pdf-page02` : les profils — Calibre 10 A, Proposé 15 A ; `pdf-page10` : la nomenclature, MS3320-10 et la proposition.

**Les fichiers de la reprise** : `src/08-disjoncteurs.js` (`disjonctionDe`, `controleDisjonction`, `chutesDe`,
`lignesFilsDisjoncteur`, `calibreAuFolio` — B), `src/08-controle.js`, `src/08-export.js`, `src/08-nomenclature.js`,
`src/08-pdf-dossier.js` (C), `src/08-fiche.js` (deux lignes — B), `src/08-recap.js` et `src/style-recap.css` (E : quelques
lignes, dites plus haut ; E peut les reprendre à sa main) ; tests `controle`, `couverture`, `disjoncteur`, `fiche`,
`interface`. `tests/ux.js` n'est pas touché. Outils : `reprise/sonde.js`, `reprise/ecrire.js`,
`reprise/regarder-reprise.js`.
