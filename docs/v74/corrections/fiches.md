# Volta v74 — lot F « Les fiches » : rapport

## Branche et commits

- **Branche** : `worktree-agent-a2a0ab94b13efda01`, dans le worktree `.claude/worktrees/agent-a2a0ab94b13efda01`.
- **Point de départ** : `claude/schematic-generator-tool-hih0lj` au commit **816b249** (les briefs v74). Le worktree
  était sur d013772 : il a été avancé en avance rapide sur 816b249 avant tout travail.
- **Commit du code** : **51c773c**. **Second commit** : ce rapport, et une règle de `style-fiche.css` posée après la
  passe de `toutes` (`.fi :is(em,i){font-style:normal}` : plus aucun `<em>` ni `<i>` penché dans une fiche).
- **`index.html`** n'est pas dans les commits (l'intégrateur le reconstruit).

Fichiers touchés, tous du lot F :

- `src/08-fiche.js`, `src/08-sections.js` ;
- `src/style-fiche.css`, `src/style-sections.css` ;
- `src/09-barrettes.js` : un **ajout commenté** en fin de fichier, rien de réécrit ;
- `tests/fiche.js`, `tests/barrettes.js` ;
- `tests/disjoncteur.js` : **un seul contrôle** rendu obsolète (l'italique), mis à jour et commenté.

`src/08-modules.js`, `src/08-carte.js`, `src/style-carte.css`, `src/09-raccords.js` n'ont pas eu besoin d'être touchés.

Captures, sondes et passes du juge :
`/tmp/claude-0/-home-user-Outil-lectrique-/d44a74ef-5d4e-5d70-aef6-303c6243d2ca/scratchpad/v74F/` (`avant/`, `apres/`,
`outils/`, `ux-avant.txt`, `ux-apres*.txt`, `toutes.txt`).

---

## 1. Chaque demande du lecteur, et sa réponse

### 1.1 La prise de coupure

> « Le bordel total (EN 2997, puis EN 3646) : il faut organiser. Changer la référence marche mais pas fluide : je veux
> des RECOMMANDATIONS, les mêmes types, les contacts admissibles, ultra pensé pour un novice. Fiche mâle / femelle et
> raccord : très bien. Je veux le POURQUOI : pourquoi ce choix et pas les autres. »

**La fiche se range** (`ficheCoupure`) :

- **Sous la référence, le pourquoi**, en clair : « La référence de l'installation, EN3646A61208FN, nomme cet arrangement
  (12-08) de l'EN 3646-002. » Les autres cas ont leur phrase : choisi à la main, norme choisie ici, une référence qui ne
  nomme pas d'arrangement, une référence qui ne dit pas la norme. Dessous, **« Pourquoi cette norme »** ouvre le récit
  (§ 1.4).
- **Une norme à la fois** : l'identité ne dit plus qu'une référence (« Prise de coupure · EN3646A61208FN · folio 5 ») ;
  l'arrangement est sur la ligne Référence.
- **La partie mobile et la fixe** : « Fiche · ce qui arrive — la partie mobile », « Embase · ce qui repart — la partie
  fixe ».
- **Le sexe et son pourquoi**, en une ligne au-dessus des paires : « Fiche en douilles (femelles), embase en broches
  (mâles) : la référence ne le dit pas, Volta met d'office des douilles côté fiche — l'usage : le côté qui amène le
  courant porte les douilles. » (ou « la référence de l'installation le dit », ou « choisi ici »). Les puces Fiche femelle
  / Fiche mâle, que le lecteur aime, ne bougent pas.

**« Changer », rangé et recommandé** :

1. **La norme en tête, une seule** : « Norme EN 3646-002 — celle de la référence de l'installation, EN3646A61208FN ».
   La rangée « automatique · ASNE 0059 · EN 2997-002 · EN 3645-002 · EN 3646-002 · EN 4165-002 » a disparu.
2. **Automatique**, comme avant.
3. **Les RECOMMANDÉS** (quatre au plus), chacun **dessiné** (sa face, les contacts que ces câbles prennent, à la couleur
   de leur route), avec **sa raison** et **ses contacts admissibles** :
   - « 12-08 · retenu par Volta — Celui de l'installation : sa référence le nomme · 1 contact libre (un obturateur) —
     Fiche · douilles EN3155-019F2020 × 7 — Embase · broches EN3155-018M2020 × 7 » ;
   - « 12-10 — Même boîtier (taille 12) : le même raccord · les mêmes contacts à sertir · 3 contacts libres » ;
   - « 14-12 — Boîtier 14 au lieu de 12 : un autre raccord · les mêmes contacts à sertir · 5 contacts libres » ; …

   Un clic retient (une entrée d'historique, Ctrl+Z).
4. **Repliés, chacun avec sa raison** :
   - « Ceux qui logent aussi, moins proches » (20) ;
   - « Ceux qui ne logent pas ces câbles — et pourquoi » (« pas de contact 6, 7 »…) ;
   - « Les autres normes — et pourquoi pas elles » : « La référence de l'installation (EN3646A61208FN) est une
     EN 3646-002 : changer de norme change toute la prise — le boîtier, le raccord, les contacts. Volta ne le fait jamais
     d'office. » Puis une ligne par norme (« connecteurs circulaires · 23 arrangements logeraient ces 7 contacts ») et
     « Passer en EN 2997-002 » ; une norme choisie ici se rend d'un « revenir à EN 3646-002 ».

**Le moteur** (`09-barrettes.js`, ajout commenté) : `arrangementsRecommandes(points, norme, famille, opts)` rend, dans une
norme, les arrangements qui logent tout, du plus proche au plus loin — le retenu, le même **boîtier** (les chiffres de tête
d'un insert circulaire : le raccord ne change pas), les mêmes **contacts à sertir**, le moins de libres. Chacun porte ses
contacts admissibles par côté (`contactsAdmissibles`) et ses raisons en mots courts.

### 1.2 Le câble

> « Un peu compliqué (“Tous tiennent”, l'italique, l'hypothèse 5 m). Câble et type, c'est bien. Intensité et chute,
> c'est bien mais pas présenté de façon fluide. »

- **Plus d'italique**, nulle part dans les fiches : ni la valeur supposée d'une longueur, ni une chute sur des longueurs
  supposées, ni la pastille « supposé », ni « à écrire ». Un contrôle de `fiche.js` le vérifie sur toute la fiche du câble.
- **L'hypothèse dite une fois, en clair**, sous les tuiles : « **Longueur supposée : 5 m**, à écrire dans l'installation
  — la chute en dépend. » et son lien « Hypothèses ». La case Longueur reste vide, la valeur supposée en gris.
- **Trois tuiles** (Type, Gauge, Longueur) : l'intensité n'est plus une tuile — elle n'a plus qu'une place.
- **« Intensité et chute » ouverte d'office** (`OUVERTES_D_OFFICE.fil`), chaque mesure une phrase :
  - « **Intensité** — **9,31 A** sur 21 A admis », la barre, puis « Au pire, démarrage et transition pendant 2,1 min.
    En continu : 5 A sur 21 A. Le courant vient de [102CB1 · 15 A]. » ;
  - « **Chute** — **0,37 V** sur 2 V admis », la barre, puis « De 102CB1 jusqu'à 103RL1:A1, tout le chemin ; ce câble
    en fait 0,17 V. » et, quand elle dépasse, « En pointe : 2,28 V à 9,31 A, plus que les 2 V admis. » de la couleur de
    sa mesure.

  Le résumé, section pliée, dit les deux valeurs : « 9,31 A sur 21 A · chute 0,37 V sur 2 V ». Les bulles gardent le
  détail du calcul.
- **« Tous tiennent » devient** « 2 câbles · aucun problème · le plus chargé, W-011, porte 44 % de ce qu'il admet ».
- **La note des tableaux de câbles** (équipement, barrette, prise, disjoncteur), dite en clair : « Longueur supposée : 5 m
  pour les 12 câbles, à écrire dans l'installation (ou dans la colonne m). Courant supposé : 2 A pour les 12 câbles,
  sans disjoncteur en amont. Ce sont des hypothèses. » (`noteSupposes`).

### 1.3 La gauge (et le contact) d'une ligne de contacts

> « Cliquer sur la gauge doit aller au contact et à sa norme. »

Un clic sur la **gauge** ou le **contact** d'une ligne — un connecteur, une barrette, chaque côté d'une prise, le bout d'un
câble — ouvre **sous la ligne la carte du contact** (`carteContact`) :

| | 300XC1 A, borne A1 |
|---|---|
| Ce qu'il est | Douille taille 20, fût 20 (24 à 20 AWG), pour EN 4165, EN 3545 |
| Sa norme | EN 3155-003 — contact femelle type A serti classe S. *La norme du contact, pas celle du connecteur (EN 4165-002).* |
| Sa table | la table des contacts de Volta — sa ligne : EN 4165-002 · taille 20 · femelle · tout type · 24 AWG → EN3155-003F2020 |
| Sa source | ● Vérifié par trois sources : TE Solid Contacts, Tri-Star, Amphenol p.9 |
| Ce câble | DR24 · 24 AWG ✓ admis — la taille 20 admet de 24 à 20 AWG (table des tailles) |
| Sa place | contact 1 de l'arrangement 12-20 (table des faces) |
| Outillage | pince, positionneur, insertion, dénudage |

Dessous : « Sa ligne dans les normes » (la table des contacts, filtrée sur lui) et, pour un connecteur, « Toute la chaîne
du connecteur » (déplie « D'où vient chaque pièce »). Quand le contact se change (un connecteur, un bout de câble), les
autres contacts de la taille suivent, chacun ✓ / ✕ comme en v73. Une barrette et une prise montrent la carte seule. Échap
ou un clic dehors la referment.

### 1.4 La référence d'un connecteur

> « Un clic dessus doit ouvrir une fenêtre : la norme, pourquoi cette norme, où on l'a trouvée par rapport aux autres —
> quelqu'un de perdu doit tout retrouver. »

À côté du champ, **« Pourquoi cette norme »** ouvre le récit en cinq pas (`recitReference`) :

1. **La référence** et d'où elle vient (« lue dans le fichier d'installation : colonne PN1 et PN2, sur 11 liaisons », ou
   « écrite ici — le fichier portait … ») ;
2. **Sa norme**, et comment Volta la lit (« « EN4165-2… » commence par « EN4165 », celui de l'EN 4165-002 », avec la note
   de la famille) ;
3. **Où Volta l'a trouvée** : ses tables, le statut de l'arrangement (« à confirmer (une source : TE DMC-M) »), et la base
   SEE gardée sur ce PC (elle la connaît, ne la connaît pas, ou il n'y en a pas) ;
4. **Les voisines écartées**, les plus proches d'abord, chacune sa raison : « EN 4644 — Rectangulaire modulaire à inserts.
   Ses références commencent par « EN4644 » ; celle-ci, par « EN4165 » — et Volta n'a pas ses arrangements. » ;
5. **Ce que la norme donne ensuite** : l'arrangement, la taille de chaque cavité, le contact — « sous une autre norme :
   l'EN 3155 » — et « câble par câble › » (la chaîne de `traceConnecteur`, désormais partagée : `chaineConnecteur`).

Une référence qu'aucune famille ne nomme (550SW3, NSA937802-03 ; 101BT1, MS3470L14-5P) le dit, nomme les plus proches
(« NSA 937901 — module de jonction à contacts… et ce n'est pas une famille de connecteurs ») et ce qu'on peut faire
(vérifier la référence, envoyer la table de sa norme, la base SEE). La prise a le même récit, sous sa référence.

### 1.5 Le raccord « manque »

> « Dis pourquoi (« aucune ligne de la table des raccords pour cette famille et cette classe ; la base SEE gardée sur ce
> PC la donne peut-être »), jamais un « manque » muet. »

Sous chaque pièce qui manque (raccord, cheminée, bande, manchon, tyrap, gaine, obturateur), une ligne visible
(`pourquoiManque`). Vu sur 101BT1 (reprise de blindage « sur le corps ») : « **Pourquoi :** Aucune ligne de la table des
raccords pour ce connecteur : sa référence (MS3470L14-5P) n'est d'aucune famille que Volta connaît ; une base SEE gardée
sur ce PC (Vos fichiers) la donnerait peut-être. » Pour une famille connue sans ligne, la phrase nomme le type, la norme,
la classe et le boîtier (« aucune ligne de la table des raccords pour un raccord <type> de l'<norme>, classe <x>, boîtier
<t> »). Les autres pièces reprennent la phrase du moteur (vu sur 412VC3B étanche : « aucun manchon droit de la table ne va
à Ø 5,3 mm sur un épaulement Ø 14 mm (lèvre 1,1 mm) »). Quand la base SEE gardée connaît la référence et ce qui s'y monte,
elle est citée (« la base SEE gardée sur ce PC dit qu'il se monte avec … : à vérifier »).

---

## 2. Fonctions exposées aux autres lots

| fonction | fichier | rôle |
|---|---|---|
| `arrangementsRecommandes(points, norme, famille, opts)` | 09-barrettes | les arrangements d'une norme qui logent tout, rangés, avec contacts admissibles et raisons |
| `contactsAdmissibles(norme, m, points, sexeFil, prise)` | 09-barrettes | les contacts de la table pour ces câbles dans un arrangement, par côté, comptés |
| `boitierDe(m)` | 09-barrettes | la taille de boîtier d'un insert circulaire (« 12 » de 12-08) |
| `carteContact(o)` | 08-fiche | la carte d'un contact : norme, table, ligne, source, câble, place, outillage |
| `recitReference(o)`, `famillesVoisines(pn, retenue)` | 08-fiche | le récit « Pourquoi cette norme », les familles voisines et leur proximité |
| `chaineConnecteur(c, Q, M, xs)` | 08-fiche | la chaîne de « D'où vient chaque pièce », partagée |
| `pourquoiManque(p, h, it)` | 08-fiche | la phrase d'une pièce qui manque |
| `noteSupposes(nDj, nL, n, H)` | 08-fiche | ce qui est supposé, dit une fois |

Pour le lot N (« Comment Volta réfléchit ») : `recitReference` dit la chaîne d'un connecteur pour UNE référence ; la page
peut y renvoyer. Pour le lot E : la note `noteSupposes` et le mot « aucun problème · le plus chargé … » valent aussi pour
le récapitulatif s'il veut le même vocabulaire.

---

## 3. Les batteries

| batterie | résultat |
|---|---|
| `fiche` | **179 contrôles, tout tient** (dont 20 nouveaux « v74 ») — rejouée sur le livrable final |
| `barrettes` | **263 / 263** (dont 5 nouveaux : les recommandés) |
| `controle` | **38 / 38** |
| `disjoncteur` | **86 / 86** |
| `ux` | **40 défauts distincts avant, 40 après** (voir § 4) |
| `toutes` | **21 batteries sur 23** : `ux` (un juge, toujours en échec) et `bibliotheque` (un délai dépassé sous la charge ; rejouée seule : tout tient) |

### Les contrôles rendus obsolètes, mis à jour (chacun le dit dans son message)

- `fiche.js` : les tuiles du câble (quatre → trois ; plus de « supposée » ni d'intensité dedans) ; « la longueur
  d'hypothèse le dit sur la valeur » → la ligne « Longueur supposée » sous les tuiles ; la chute « 1,29 V / 2 V » →
  « 1,29 V sur 2 V admis », la pointe dans la phrase dessous, plus d'italique ; le lien aux hypothèses (`.fi-hyp-l .fi-hyp`
  au lieu de `.fi-tuile .fi-hyp`).
- `disjoncteur.js` : la chute de W-015 « en italique » → `fontStyle !== 'italic'`.

### Les contrôles ajoutés

- `fiche.js`, bloc « v74, lot F » : le pourquoi sous la référence de la prise et son identité ; la partie mobile et la
  fixe, le sexe et son pourquoi ; « Changer » rangé (une norme, quatre recommandés dessinés, leurs raisons, leurs contacts
  admissibles) ; les trois plis et leur raison ; un recommandé retenu d'un clic ; le récit de la prise ; la carte du
  contact d'une prise, d'une barrette, d'un connecteur (et « Toute la chaîne ») ; Échap la referme ; le récit de 300XC1 A
  et celui d'une référence inconnue (550SW3) ; le « manque » qui dit pourquoi ; « aucun problème · le plus chargé… » et
  la note en clair ; plus d'italique ; « Intensité et chute » ouverte d'office et dite en phrases.
- `barrettes.js`, section 18 : les recommandés de 412VC3B (ordre, boîtier, contacts), leurs contacts admissibles, leurs
  raisons, le boîtier d'un insert circulaire et pas d'un module EN 4165, un connecteur (300XC1 A) sans côté.

### 3 bis. `tests/toutes.js` à la fin

Sur le livrable du commit 51c773c (`toutes.txt`) :

```
  ok     barrettes         2 s   263 / 263 contrôles passés  —  tout est vert
  ok     references       10 s   64 / 64 contrôles passés  —  tout est vert
  ok     format-retest     7 s   28 / 28  — tout tient
  ok     disjoncteur      40 s   86 / 86 contrôles passés — tout est vert
  ok     interface       254 s   tout tient
  ok     chrome           87 s   43 / 43 contrôles passés — tout tient
  ÉCHEC  bibliotheque    166 s   name: 'TimeoutError'
  ok     controle        107 s   38 / 38 contrôles passés  —  tout est vert
  ok     fiche           149 s   tout tient
  ok     fwd              34 s   tout tient
  ok     memoire          17 s   9 / 9  — tout tient
  ok     retouche         80 s   tout tient
  ok     dessin           56 s   tout tient
  ok     affinage         39 s   tout tient
  ok     couverture        9 s   75 / 75 contrôles passés  —  tout est vert
  ok     normes           47 s   tout tient
  ok     see              21 s   74 / 74  — tout tient
  ok     placement        36 s   tout tient
  ok     vitesse          45 s   tout tient
  ok     parcours        288 s   137 contrôles tiennent · 0 échec(s) · 17 frottement(s) connu(s) — la batterie passe
  ok     pdf              92 s   30 / 30 contrôles passés
  ok     visio            54 s   30 / 30 contrôles passés
  ÉCHEC  ux              570 s   38 échec(s) · 40 défaut(s) distinct(s) · 50 contrôles passés sur 88
```

`bibliotheque` ne touche à aucune fiche ; rejouée seule sur le livrable final, elle passe (« tout tient »,
`bibliotheque-apres.txt`). Après `toutes`, une seule retouche : la règle `.fi :is(em,i){font-style:normal}` (plus aucun
`<em>` ni `<i>` penché dans une fiche) — `fiche.js` rejouée dessus : tout tient ; aucune `pageerror` au chargement.

---

## 4. Le juge `tests/ux.js` : avant / après

| | avant (816b249) | après (51c773c) |
|---|---|---|
| total | 38 échecs · **40 défauts distincts** | 38 échecs · **40 défauts distincts** |
| défauts dans les fiches | 1 (`#ba-equip .fi-q[data-q="courbe"]`, 18 × 18 px, écran « fiche-aide » à 1920) | le même, et lui seul |

Même total. Ils sont ailleurs que dans les fiches, sauf ce « ? » : le folio à 100 % (14, lot D), le récapitulatif et ses
champs, la bibliothèque, Échap dans les documents, les notes des Normes. Les écrans des fiches, passés seuls après le
travail (`ux-fiches-1.txt`), ne relèvent que ce « ? » ; les trois écrans où une première passe en relevait cinq de plus
(récapitulatif, recherche : § ci-dessous) donnent, rejoués après correction, 16 défauts — comme le livrable d'avant.

Sur les neuf écrans des fiches, la passe du lot F n'ajoute **aucun** défaut. Le seul qui reste est d'avant : sur l'écran
« fiche-aide » à 1920, la bulle ouverte du premier « ? » et le pied collant de la carte recouvrent en partie le « ? » de la
courbe, qui est au bas de la carte — ce n'est pas un défaut de taille du bouton.

**Un piège évité, à savoir pour la fusion** : une première passe complète donnait 45 défauts. Les classes du récit
s'appelaient `.rc-n`, `.rc-v`, `.rc-lien`… — le préfixe `rc-` est celui du récapitulatif (lot E) : mes règles débordaient
sur ses chiffres (« 1387 / g » chevauchés) et sur la recherche. Elles s'appellent maintenant `recit-*` ; les trois écrans
rejoués reviennent au chiffre d'avant. Les autres préfixes neufs (`pr-`, `ct-carte`, `cand-r`, `fi-hyp-l`, `fi-mes-d`,
`fi-piece-pq`) ont été vérifiés contre tout `src/`.

**Le juge sur les états neufs.** Le juge ne visite pas « Changer » ouvert, le récit, la carte du contact, le « manque ».
Un mini-juge (`outils/mini-juge.js`, le socle même de `ux.js`) les a passés en 1440 / 1920, clair / sombre. Il a trouvé
deux cibles trop petites — le contact d'une barrette devenu bouton (20 px), le titre « D'où vient chaque pièce » (17 px) —,
corrigées (24 et 28 px). Il ne reste que deux « ? » d'en-tête de tableau passés sous la barre collante après un défilement
forcé par la sonde : un artefact de position, pas un défaut.

---

## 5. Ce qui reste

- **« Changer » d'un connecteur d'équipement** (300XC1 A…) garde le patron v73 (Automatique, ceux qui logent, les autres
  avec leur raison). Le moteur `arrangementsRecommandes` vaut aussi pour lui (un contrôle le vérifie sur 300XC1 A) : il
  suffirait d'y brancher `carteRecommandee`. Le brief ne le demandait que pour la prise.
- **Le contact d'une barrette ou d'une prise ne se change pas d'ici** (la carte le montre, sans liste) : la clé
  `sertir|repère|borne` ne distingue ni les deux côtés d'une prise ni les câbles d'une même borne de barrette. Il se change
  dans le récapitulatif (colonne Contact).
- **La base SEE** : le récit et le « manque » la citent quand elle est gardée (`BASE_SEE`, `equipementSEE`), mais aucun
  essai n'en avait une : ces phrases-là n'ont été vues qu'à vide.
- **Le « ? » de la courbe** à 1920 sur « fiche-aide » (§ 4), d'avant.
- **La règle des douilles côté fiche** est dite comme l'usage (« le côté qui amène le courant porte les douilles ») : à
  confirmer par le bureau d'études si la règle de l'atelier diffère.

---

## 6. Les captures

Dans `…/scratchpad/v74F/` :

- `avant/prise-412-changer-1440-clair.png` → `apres/prise-412-changer-1440-clair.png` (et `-sombre`, `-1920-*`) :
  la rangée de normes et les disques noirs → la norme en tête, les recommandés dessinés, leurs contacts ;
- `apres/prise-412-changer-plis-1440-clair.png` : les trois plis et leurs raisons ;
- `apres/prise-412-grande-1440-clair.png` : le pourquoi sous la référence, la partie mobile, le sexe et son pourquoi ;
- `apres/prise-412-recit-1440-clair.png`, `apres/conn-300-recit-1440-clair.png`, `apres/sw-550-1440-clair.png` : le récit ;
- `apres/conn-300-contact-1920-sombre.png`, `apres/barrette-668-contact-1440-clair.png`,
  `apres/prise-412-contact-1440-clair.png` : la carte du contact ;
- `apres/conn-101-manque-1920-sombre.png` : le « manque » qui dit pourquoi ;
- `avant/cable-W012-grande-1440-clair.png` → `apres/cable-W012-1440-clair.png`, `apres/cable-W012-1920-sombre.png` :
  trois tuiles, « Longueur supposée » une fois, l'intensité et la chute en phrases ;
- `apres/barrette-668-cables-1440-sombre.png` : « aucun problème · le plus chargé… » et la note en clair.
