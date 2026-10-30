# v73 — Domaine D : le folio et la recherche

Branche `correction-v73-folio` (worktree `/home/user/Outil-lectrique-/.claude/worktrees/agent-a05af5e95237c48df`),
partie de `f96f0cd`, A2 (`4300387`) puis B (`17b0694`) fusionnés avant le commit. Un seul commit.

Fichiers : `src/06-dessin.js`, `src/style-dessin.css`, mes sections de `src/08-interface.js` (le dessin, la vue, la
surbrillance, la planche, l'INDEX, les folios, aller à un repère, la recherche) et une feuille neuve, `src/style-palette.css`
(la recherche, la palette, l'index au clavier). Rien d'autre dans `src/`.

## 1. Point par point

| Point | Fait | Comment |
|---|---|---|
| **Le folio se lit à 100 %** (ergonome 1, technicien 7) | oui | « 100 % » veut dire maintenant *l'écriture à sa taille* : un numéro de câble à **11 px d'écran** (`S100 = 11 / FS_FIL`), plus « la feuille à sa taille ». Les crans, l'étiquette du zoom, les touches 1 et 2, le maximum (400 %) suivent. Les plus petites écritures du dessin ont grossi (borne d'une barrette 4 → 5,4, pastilles, numéros de prise) : **aucune écriture du folio sous 9 px à 100 %** (ux : 14 défauts → 0). |
| Zoom sémantique | oui | Trois paliers (`.tait-1`, `.tait`, `.tait-3` sur la scène) : une écriture qui ferait moins de 7 px se tait (140 ms) ; le câble se referme sous son numéro. Ce qui est allumé (`.hl`) et le bloc choisi parlent toujours. La feuille entière se lit comme une carte : blocs, repères, routes. Une classe, jamais un recalcul. |
| La loupe | oui (en plus) | Le câble survolé ou choisi, quand son numéro ferait moins de 9,5 px, le lève à 11 px sur une pastille de papier cerclée de sa route (collisions évitées, 40 au plus). Elle s'en va avec le choix et à 100 %. |
| L'ouverture cadrée sur le dessin | oui | `VUE.cadrage = 'dessin'` par défaut, plafonné à 100 % (un petit folio ne s'ouvre pas à 300 %). « Ajuster » (0) alterne toujours dessin / feuille. Le recadrage à côté d'un volet épinglé vaut aussi pour le dessin (`recadrerSiCache`). Le téléphone s'ouvre aussi sur le dessin. |
| **Le dessin se range** (moment n° 3) | oui | Plus de fondu entre deux dessins : les blocs du dessin d'esquisse *glissent* à leur place définitive (FLIP, Web Animations, 420 ms, le plus proche de son arrivée d'abord, 120 ms d'écart au plus), les anciens câbles s'effacent en 120 ms, les nouveaux paraissent de 260 à 520 ms, un bloc neuf paraît à +200 ms depuis 0,96. Jamais deux jeux de blocs à l'écran. Écart au designer : les câbles paraissent à 260 ms et non 180 — à 180, ils se posaient alors que les blocs étaient encore à mi-chemin (planche `mouvement/planche-rangement-*.png`). |
| **Le folio glisse, la pastille aussi** (designer § 5.4) | oui | Le dessin quitté part en photo (sans feuille, sans identifiant, inerte) 120 ms ; le nouveau entre 260 ms après 100 ms. Le papier reste (il se transforme si le format change) : la table ne clignote plus. La pastille de la barre des folios glisse d'une puce à l'autre en 220 ms, son encre en fondu. Mouvement réduit : rien ne glisse. |
| **La recherche pardonne** (technicien 9) | oui | « w012 », « W 012 », « w12 » → W-012 (sans casse, accents, séparateurs ni zéros de tête) ; « disjoncteur(s) » → la ligne « Disjoncteurs · n » (ouvre l'onglet de la base, filtré) puis chacun ; « 300xc1b5 » → la borne ; une faute (« W-0122 ») → « Vouliez-vous dire W-012 ? ». La liste a ses `id`, `aria-activedescendant`, et le genre de chaque ligne. |
| **L'objet trouvé pulse deux fois** | oui | Un anneau de glace autour du bloc (ou le long du câble) qui s'élargit et s'efface, 2 × 300 ms, après le glissement de la vue. Recherche, index, renvois, palette. |
| **Ctrl+K, la palette** (ingénieur § 10) | oui | `ouvrirPalette()` (le nom qu'attend le raccourci posé par A2). Une boîte au centre : les actions d'abord (« Exporter le dossier en PDF », « Hypothèses », le retest corrigé, le récapitulatif, refaire…, lues du menu ⋮ et faites par `MENU.actions`), les gestes du contrôle (`gestesDuPoint`, domaine C), les folios, puis les objets (« Sur le plan »). ↑↓, Entrée, Échap ; Tab reste dedans ; le clavier rendu d'où il venait. |
| **L'index (R) au clavier** | oui | Son champ est un `combobox` : ↑↓ parcourent les lignes sans le quitter (`.actif`, `aria-activedescendant`), Début/Fin, Entrée ouvre la ligne choisie (la première sinon). `#in-fermer` a sa bulle « Fermer · Échap ». |
| ux et rapports sur le plan | oui | Le curseur sur un bloc est la main qui montre (un clic ouvre sa fiche ; la main fermée une fois le glisser commencé — technicien C, P3) ; un repère dessiné plusieurs fois (668VT31) a ses crochets pleins sur le morceau cliqué, en pointillé ailleurs ; la bulle d'un bloc dit « Clic : sa fiche · glisser : le déplacer ». |
| Demande C (D-1) « (retest 10 A) » | oui | Sous le calibre retenu, quand il diffère du retest, via `calibresAuFolio(nom)` ; à l'écran, à l'impression et au SVG/PNG. La ligne s'adapte (« (retest 10 A) » puis « retest 10 A ») et cède avant le symbole du disjoncteur. |
| Demande B (les flèches) | oui, adaptée | Les flèches ne poussent plus le bloc quand le clavier est dans un champ, une liste, le menu, la carte, la fiche, la base ou la palette — **sauf** sur la carte elle-même : B lui donne le clavier à l'ouverture (`prendreLeClavier`), et la règle à la lettre empêchait toute poussée au clavier (`tests/retouche.js` tombait). |

Pas fait, et pourquoi : le halo « --ok » sur le câble corrigé après « Passer en DR12 » (technicien M, P3) — le geste est
dans la fiche ; `pulser()` est prêt (demande à B ci-dessous). La croix ✥ pendant le glisser (technicien) : `style.css`
(A1/A2) pose la main fermée pendant le glisser, avec `!important` ; je l'ai gardée, elle dit aussi « je tiens ».

## 2. Les batteries

`node tests/toutes.js` : voir § 5 (état final). En cours de route, trois batteries jugeaient l'ancien comportement ;
je les ai **mises à jour** (chaque ligne porte « MIS À JOUR ») :

- `tests/dessin.js` : le « 59 % » de la feuille cadrée devient `memeVue(cadrageDe('feuille'))` ; le curseur ; le
  maximum du zoom (400 %). **Ajouts** : l'ouverture sur le dessin ; « LE FOLIO SE LIT » (11 px à 100 %, rien sous 9 px,
  la carte à la feuille entière, la loupe, « (retest 10 A) » à l'écran et au SVG, le glissement de folio et de pastille,
  le pulse, le volet épinglé qui recadre le dessin, la main fermée au glisser) ; « LA RECHERCHE » (w012 / W 012 / w12,
  disjoncteur, 300xc1b5, « Vouliez-vous dire », `/ w012 Entrée`, Ctrl+K actions et objets, Échap, Entrée, l'index au
  clavier) ; les crochets de 668VT31.
- `tests/placement.js` : le fondu `.dessin-fondu` remplacé par le rangement (blocs qui glissent, aucune copie de bloc,
  câbles qui attendent, tout nettoyé après 900 ms).
- `tests/interface.js` : deux mises en place gardent la feuille entière (`VUE.cadrage = 'feuille'`), leurs mesures
  (carte, volet, tiroir, survol de 104LP1) sont des mesures de feuille.
- `tests/retouche.js` : le curseur d'un bloc au repos est `pointer` (et non plus `move`).
- `tests/parcours.js` : au téléphone, c'est le dessin (cadré sur lui) qui tient entre les barres.
- `tests/ux.js` : **un faux positif corrigé** — le parcours des textes coupés lisait les `<text>` du SVG au-delà du
  cadre de la planche comme « rognés en haut » ; ils sont désormais ignorés (le dessin a sa propre mesure, « à 100 % »).

## 3. ux sur mon domaine (plan, recherche, index), avant et après

Avant (`avant/ux-avant.txt`, à `f96f0cd`) : **21 défauts distincts**, dont 14 « à 100 %, chaque écriture ≥ 9 px »
(filnum 6,5 px, bpnum 4,1, connpin 5,7, cartouche 6…), 3 noms/bulles (`#in-fermer`, `#ix-plus`, `#fi-epingle`),
1 contraste (`#q`), 3 anneaux de focus (`#fo-strip .chip`, `#btnIndex`, `#btnCherche`).

Après (`apres/ux-domaine.txt`) : voir § 5.

## 4. Captures (dans `…/corrections/folio/`)

- L'ouverture : `avant/ouverture-1440-clair.png` (une poussière de traits) / `apres/ouverture-1440-clair.png`,
  `apres/ouverture1-1920-sombre.png`.
- À 100 % : `avant/cent-1440-clair.png` / `apres/cent-1440-clair.png` ; à 200 % : `apres/deuxcents-1920-sombre.png`.
- La feuille entière, une carte : `avant/feuille-1440-clair.png` / `apres/feuille-1440-clair.png`.
- La loupe, le choix : `apres/choix-1440-sombre.png`, `apres/survol-1920-clair.png`.
- La recherche qui pardonne : `avant/recherche-1440-clair.png` / `apres/recherche-1440-clair.png`.
- La palette : `apres/palette-1440-clair.png`, `apres/palette-vide-1920-sombre.png`.
- L'index au clavier : `apres/index-1440-sombre.png`.
- La carte et le volet épinglé, cadrés sur le dessin : `apres/carte-1440-sombre.png`, `apres/epingle-1440-clair.png`,
  `apres/epingle-1920-sombre.png`.
- Le mouvement, image par image : `mouvement/planche-rangement-clair-1440.png` et `-sombre-1920.png` (moment n° 3),
  `mouvement/planche-folio-clair-1440.png` et `-sombre-1440.png`, `mouvement/pastille-clair-1440.png` et
  `-sombre-1440.png`, `mouvement/planche-pulse-clair-1440.png`, `mouvement/planche-loupe-sombre-1440.png`.

## 5. État final

(complété ci-dessous)

## 6. Demandes aux autres domaines

**E — `src/08-visio.js`** (défaut antérieur, vérifié avant et après mon travail : `dessinPourVisio('1')` retrouve
**0 place sur 8** numéros de câble). La regex ne connaît ni le `data-i` ni la rotation que `06-dessin.js` pose sur
`text.filnum`. À remplacer par :

```js
/<text class="filnum"(?: data-i="[^"]*")?(?: transform="rotate\(-90 [^)]*\)")? x="(-?[\d.]+)" y="(-?[\d.]+)"[^>]*>([^<]*)<\/text>/g
```

et, pour que Visio écrive aussi « (retest 10 A) » comme le folio :

```js
const disj = n => typeof calibresAuFolio === 'function' ? calibresAuFolio(n) : { calibre: calibreAuFolio(n) };
```

**E — le récapitulatif en moitié** : pour recentrer le dessin dans la moitié libre, `centrerSur(x, y, w, h)` (la vue)
tient compte de `marges()` ; il suffit que la moitié du récapitulatif y soit comptée.

**A1 — `src/style-table.css`** : la règle `.dessin-fondu` est morte (le fondu n'existe plus) ; elle peut partir.

**A2 — le chrome** :
- `#q` (le champ de la recherche, `style.css` `.recherche`) : ux mesure son bord à 1,47:1 sur la barre (`#2b3852` sur
  `#111b2e`) ; il faut ≥ 3:1.
- l'anneau de focus des puces de folio (`#fo-strip .chip`, 1,58:1) et des boutons du rail (`#btnIndex` 2,92:1,
  `#btnCherche` 2,76:1) : `--anneau-c` sur un fond qui le porte (≥ 3:1).
- le mot qui passe (`#toast`) se pose sous la liste de la recherche quand elle est ouverte : le monter au-dessus
  (z-index) ou le taire tant qu'elle est là.

**B — les bulles au clavier** : `#ix-plus`, `#fi-epingle`, `#in-fermer` ont leur `data-bulle`, mais elle ne paraît qu'à
la souris : `lierBulles` doit les prendre aussi au focus clavier (250 ms).
**B — le câble corrigé** : après « Passer en DR12 » / « Changer les câbles », appeler
`pulser({ type: 'fil', f: app.dessin.fils.find(w => w.cable === cable) })` pour chaque câble touché du folio (la fonction est dans « aller à un repère ») : le plan
montre où la correction est tombée (technicien M, P3).
**B — la carte et les flèches** : la carte qui tient le clavier sur elle-même laisse les flèches au bloc choisi ; ses
contrôles (cadran, champs, listes) les gardent. Si la carte veut un jour des flèches à elle, qu'elle les arrête en
capture comme `.dj-crans`.

**Coordination — `DESIGN.md`** (paragraphe proposé, section du plan) :

> **Le folio se lit.** 100 % est l'écriture à sa taille : un numéro de câble à 11 px d'écran ; aucune écriture du folio
> sous 9 px à 100 %. Le folio s'ouvre cadré sur son dessin (au plus 100 %). Sous 7 px, les petites écritures se taisent
> (zoom sémantique) ; ce qui est allumé parle toujours, et un câble choisi lève son numéro à 11 px (la loupe). Le dessin
> qui change se range (ses blocs glissent à leur place, ses câbles suivent) ; le folio qui change glisse, sa pastille
> aussi ; l'objet trouvé pulse deux fois. La recherche pardonne (casse, séparateurs, zéros, une faute) ; Ctrl+K ouvre la
> palette des objets et des actions.

Note : le « premier folio en 4 à 7 s » mesuré par l'ingénieur vient de son pilote (sous webdriver, le placement se fait
d'un bloc, sans rendre la main) ; ce n'est pas un défaut du folio.
