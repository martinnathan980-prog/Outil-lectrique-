# Panel v73 — « l'ingénieur câblage exigeant »

*15 ans de câblage d'hélicoptères. Je connais mes MS3320 et mes E-T-A 4120, mes EN 3155, mes EN 4165 / EN 2997, la règle
des 2 V. Je veux un outil pro : tout voir, tout pouvoir choisir, comprendre d'un coup d'œil, aller vite au clavier.
Et je veux en être fier.*

Joué le 29-30 octobre 2026 sur `index.html` (v72), à la vraie souris et au clavier, avec Playwright (Chromium). Écrans :
1440 × 900 et 1920 × 1080, en clair et en sombre. Les captures sont dans `avant/`. Leur numéro suit l'ordre du parcours.
Elles sont nommées par écran, thème et largeur.

J'ai tout essayé sur l'exemple :
- les fiches 102CB1, 300XC1 (A, B, C), 668VT31, 412VC3B, W-012, W-015, W-370 et la masse 901G ;
- le récapitulatif et ses 9 onglets, avec édition en place, Tab, Colonnes et le calibre au double-clic ;
- l'index R, les problèmes P, la recherche / et le menu ⋮ avec Exporter et Plus ;
- les normes, la bible, les hypothèses, la nomenclature, et l'export du retest corrigé (non modifié, puis modifié et
  rouvert) ;
- le dossier PDF, ouvert page par page ;
- une base SEE fabriquée comme dans `tests/see.js` (le classeur « cohérence »), avec ses onglets Import et Cohérence ;
- la grande base de `tests/fabrique-base.js` : 100 068 lignes, 983 contrats, 60 installations. Je l'ai déposée,
  j'y ai cherché, j'ai ouvert un contrat, regardé « Déjà fait » et lancé « Comparer au déjà-fait ».

---

## 1. Mes notes

| | note | en une phrase |
|---|---|---|
| **Beauté** | **7,5 / 10** | La nuit bleue est belle et le cadran du calibre est un vrai instrument de bord. Les faces de connecteur et de module sont superbes. Mais la carte de 420 px est un couloir où la courbe étouffe, et il reste des doublons et des colonnes vides. |
| **Clarté** | **6 / 10** | Le « pourquoi » est souvent là, dans des bulles riches et justes. Mais les mots du verdict changent d'un écran à l'autre, deux chiffres différents portent le même nom, et on me cache des options sans me le dire. |
| **Fluidité** | **7 / 10** | 130 ms du clic à la fiche, 15 ms pour chercher dans 100 000 lignes, la base lue en 1,6 s : c'est rapide. Mais il faut 21 Tab pour atteindre « À la main », il n'y a ni palette de commandes ni « refaire », et le premier passage d'un folio prend 4 à 7 s. |
| **Plaisir** | **6,5 / 10** | « Passer en 15 A et grossir les 3 câbles », puis Ctrl+Z qui défait le tout, c'est un vrai moment de pro. La frustration revient dès que je veux choisir moi-même et que l'outil ne me propose que ce qu'il a déjà validé. |
| *Confiance (en plus)* | *5,5 / 10* | Les contacts disent leurs sources : c'est le meilleur de l'outil. Mais le retest corrigé rouvert se corrompt, un même disjoncteur peut porter deux part numbers sans alerte, et le dossier PDF ne dit pas sur quelles hypothèses il repose. |

---

## 2. Les 10 choses qui me gênent le plus

### 1. Le calibre : je ne peux choisir que ce qui passe (le défaut signalé, confirmé et plus large que prévu)
`avant/05b-dj-cadran-zoom-light-1440.png`, `avant/08-dj-a-la-main-light-1440.png`, `avant/13-dj-clic-cran-3-light-1440.png`,
`avant/14-dj-10A-a-la-main-liste-light-1440.png`, `avant/108-recap-dj-dblclic-calibre-light-1440.png`

- Les crans 1, 3, 5, 7,5 et 10 du cadran se lisent, mais un clic sur « 3 » ne fait rien (le calibre reste à 10).
- « À la main ▾ » ne propose que 15 A et 20 A. Même avec 10 A retenu, la liste reste 15 / 20.
- Le seul chemin vers un calibre qui ne passe pas est « Garder le 10 A… » puis « Retenir le 10 A quand même ». Il ne
  marche que pour le calibre du retest.
- **Le récapitulatif fait déjà ce que je veux.** Dans l'onglet Disjoncteurs, un double-clic sur le calibre ouvre une
  liste des 7 calibres, chacun avec son verdict : « 1 A — déclenche · 3 A — déclenche · … · 10 A — touche la courbe ·
  15 A ★ le meilleur — tient · 20 A — tient ». Deux écrans, deux règles.
- En plus, le catalogue MS3320 a 13 calibres (0,5 · 0,75 · 1 · 1,5 · 2 · 2,5 · 3 · 4 · 5 · 7,5 · 10 · 15 · 20). Le
  cadran n'en montre que 7, filtrés par l'hypothèse « Calibres préférés ». Rien sur la fiche ne le dit. 2 A et 4 A
  existent chez nous.

**Correction** (`08-disjoncteurs.js`, `heroCalibre` et `cadranCalibre`) :
- Chaque cran devient un bouton `[data-cal]`, avec une zone de clic de 28 × 28 px centrée sur le nombre, le curseur
  `pointer` et une bulle sur ce modèle : « 3 A — déclenche en N s à 9,31 A · un clic le retient à la main ». N est le
  temps que le moteur calcule.
- « À la main ▾ » ouvre **toute la gamme** en grille de 4 colonnes. Chaque puce de 30 px porte le calibre et une marque
  d'état : ✓ `--ok` pour « passe », ~ `--warn` pour « juste », ✕ `--ko` pour « déclenche ». Toutes sont cliquables.
  Retenir un calibre qui ne passe pas le montre en rouge sur le cadran et sur la courbe, avec la phrase du pourquoi :
  c'est exactement ce que je veux voir.
- Sous la grille, un lien « Tout le catalogue MS3320 (13) » ajoute les calibres hors de la liste préférée, en encre
  `--t-2`, avec la bulle « hors de vos calibres préférés (Hypothèses) ».
- Au clavier, ← et → déplacent l'index sur le cadran en aperçu : l'index glisse en 140 ms (`--rapide`, `--courbe`), la
  courbe et le verdict suivent. Entrée retient, Échap rend l'automatique.
- Le cadran et la liste du récapitulatif doivent utiliser le **même** composant.

### 2. Le retest corrigé, rouvert, se corrompt : la feuille « Modifications » est relue comme des liaisons
`avant/103-retest-corrige-rouvert-light-1440.png`, `avant/104-retest-rouvert-102CB1-light-1440.png`

Voici ce que j'ai fait :
1. « Passer en 15 A », puis j'ai changé un part number dans le récapitulatif.
2. J'ai exporté le retest corrigé : 3 liaisons modifiées, 6 cases commentées, la feuille « Modifications » remplie.
3. Je l'ai rouvert avec Ctrl+O.

Le plan obtenu a **207 liaisons au lieu de 201**. Les 6 lignes de la feuille « Modifications » sont devenues des
liaisons sans type et sans folio. Sur 102CB1, cela donne « borne 1 : 3 câbles — une barrette à poser » et « borne 2 : 6
câbles ». Ce sont de faux problèmes, nés de l'export de Volta lui-même.

En plus, le profil de charge est perdu : la fiche dit de nouveau « Écrire le profil ». Le 15 A n'a donc plus de
justification.

**Correction** :
- Dans `lectureDuFichier` (02-lecture.js), ignorer une feuille nommée « Modifications », ou dont l'en-tête porte
  « Colonne / Avant / Après ». Le dire dans le mot qui passe : « feuille Modifications lue comme un journal, pas comme
  des liaisons ».
- Ajouter à l'export une feuille cachée « Volta » : les profils de charge, les hypothèses et les contacts choisis à la
  main. Volta la relit quand elle est là.
- Un test dans `tests/retest.js` : exporter, rouvrir, retrouver 201 liaisons et le même verdict de 102CB1.

### 3. Un disjoncteur peut porter deux part numbers, en silence
`avant/101-recap-pn-4120-light-1440.png`, `avant/102-dj-pn-incoherent-light-1440.png`

Dans le récapitulatif (onglet Liaisons, colonne « Part number vers »), j'ai écrit `4120-F-10A` sur la ligne W-011.
Résultat : 102CB1 porte `4120-F-10A` sur W-011 et `MS3320-15` sur W-012 et W-015.
- La fiche affiche « 4120-F-10A ».
- Aucun problème n'est levé.
- Le retest corrigé exporté contient les deux part numbers.

Pour un disjoncteur, c'est une faute que je ne veux pas envoyer à la fabrication.

**Correction** :
- Une cellule de part number d'un repère, dans le récapitulatif, propose « Appliquer aux 3 liaisons de 102CB1 », comme
  la fiche le fait.
- Si les part numbers d'un même repère divergent, lever un problème « 102CB1 porte deux part numbers (4120-F-10A,
  MS3320-15) » dans la barre de la fiche, l'onglet Problèmes, l'index et le PDF, avec le geste « Unifier sur… ».

### 4. Deux chiffres pour la même chute de tension
`avant/37-cable-W012-chute-light-1440.png`, `avant/16-dj-problemes-light-1440.png`, `avant/63-pdf-page1.png`

La chute en pointe de W-012 vers 103RL1:A1 vaut :
- **2,28 V** sur la fiche du câble (« 1,29 V / 2 V · 2,28 V en pointe ») et dans la bulle de la ligne ;
- **2,33 V** dans la barre des problèmes du disjoncteur, dans l'onglet Problèmes et dans le PDF.

Même mot, même câble, deux valeurs. Je ne sais plus laquelle croire. Avec la règle des 2 V, ça compte.

**Correction** : une seule fonction rend la chute affichée (`chutesDuDisjoncteur`, 09-chute). Si deux calculs
existent volontairement (par exemple avec le conducteur échauffé par la pointe, ou avec la chute du disjoncteur au
prorata), leurs noms doivent différer (« en pointe, conducteur échauffé ») et la bulle doit dire la différence. Un
test doit vérifier que la fiche du câble, la fiche du disjoncteur, l'onglet Problèmes et le PDF portent le même nombre.

### 5. La fiche d'un câble ne dit pas son propre défaut de protection
`avant/107-cable-DR14-light-1440.png`, puis la fiche 102CB1 juste après

J'ai passé W-012 en DR14 sous le 15 A. Les deux fiches ne disent pas la même chose :
- La fiche du disjoncteur dit « W-012 (DR14) : 14,4 A admis en continu (× 0,6) < calibre 15 A — pas protégé en
  surcharge ».
- La fiche du câble W-012 n'a **aucune barre de problèmes**. Elle affiche « 9,31 A sur 14,4 A » en encre normale,
  comme si tout allait bien.

Le câble est l'objet en défaut, et c'est sa fiche qui se tait.

Autre point : « Le plus fin qui suit le 15 A de 102CB1 : DR12 » ne dit pas pourquoi DR14 ne suffit pas.

**Correction** :
- Rattacher les problèmes `pas protégé` et `contact < calibre` au câble autant qu'au disjoncteur.
- Sur la fiche du câble : la tuile Intensité à bord `--warn`, et la ligne de problème avec son geste « Passer en DR12 ».
- Sous la proposition, une ligne « pourquoi pas DR14 : 14,4 A admis < 15 A », comme pour le calibre (« pourquoi pas
  celui d'en dessous »).

### 6. La nomenclature et le dossier PDF rangent le disjoncteur parmi les « connecteurs », et le folio contredit la nomenclature
`avant/63-pdf-page8.png`, `avant/72-nomenclature-light-1440.png`, `avant/63-pdf-page4.png`

- « MS3320-10 · connecteur · 1 · 102CB1 A ». Un disjoncteur n'est pas un connecteur.
- Dans le même PDF, le folio 1 écrit « 102CB1 · 15 A », le calibre retenu par Volta, alors que la nomenclature commande
  un MS3320-10.
- La garde annonce « 77 repères », le récapitulatif « 67 repères ».
- Plusieurs textes sont coupés par « … » dans un document imprimé (« loge les 5 a… », « (longueurs d'h… », la colonne
  Où).
- La colonne « Fourreau » est vide de haut en bas. C'est contraire à la règle de DESIGN.md : « une colonne que les
  lignes ne remplissent pas ne s'écrit pas ».
- Rien sur les cosses : les bornes à vis du disjoncteur, de la batterie ou du bornier n'apparaissent pas dans la
  nomenclature.

**Correction** (`08-nomenclature.js`, `08-pdf-dossier.js`) :
- Un groupe « Disjoncteurs » avec ces colonnes : Repère, Part number à commander, Calibre retenu, Retest (barré s'il
  diffère) et État.
- Le folio écrit « 15 A » et, s'il diffère du part number, « (retest 10 A) » en 6 pt sous le calibre.
- Un seul compte de repères, partout.
- Pas de troncature dans le PDF : la ligne passe sur deux lignes.
- Supprimer les colonnes vides.
- Un groupe « Cosses » quand une borne est un goujon.

### 7. Partout, on ne me montre que les candidats qui « passent »
`avant/30-barrette-galerie-light-1440.png`, `avant/106-barrette-galerie-nsa-light-1440.png`,
`avant/97-300XC1-B-sans-changer-light-1440.png`, `avant/94-300XC1-contact-choix-light-1440.png`

Le défaut du calibre se retrouve ailleurs :
- La galerie de 668VT31 montre 2 modules ASNE 0599 sur 29 (B207, B208). L'onglet NSA 937901 dit seulement « Aucun
  assemblage ne loge… », sans en montrer aucun.
- Le connecteur B de 300XC1 (« Aucun ne loge B5 ») **n'a plus de bouton « Changer »**. Je ne peux pas voir les 30
  arrangements EN 4165-002, ni forcer celui que je sais monter avec un autre contact.
- Le choix du contact à sertir de A1 propose « Automatique EN3155-003F2020 » et « EN3155-003F2020 » : la même
  référence deux fois, et aucune autre.

**Correction** :
- Le même patron que le calibre. Tous les candidats de la norme sont listés, triés « passe » d'abord. Les autres sont
  en encre `--t-2`, avec la raison sur une ligne de 12 px (« B209 : 4 libres, ne loge pas le potentiel 3 (3 câbles) » ;
  « 20-22 : loge 5 / 6, B5 en DR12 trop gros pour un #22 »). Tous restent cliquables, et un choix forcé est marqué
  « main » et rouge.
- Le bouton « Changer » ne disparaît jamais.
- Le contact « Automatique » ne se répète pas. La liste montre les EN 3155 de la taille, du sexe et de la famille de
  fût (-003, -009, -019…), chacun avec son ✓ / ✕ de gauge.

### 8. Les mots du verdict changent d'un écran à l'autre
`avant/10-dj-10A-retenu-light-1440.png`, `avant/46-recap-disjoncteurs-light-1440.png`,
`avant/51-recap-problemes-light-1440.png`, `avant/25-dj-q-gamme-deplie-light-1440.png`

| où | ce qui est écrit |
|---|---|
| la fiche | « passe » / « ne passe pas — il touche la courbe : sans la marge » |
| le récapitulatif | « tient » / « touche la courbe » / « déclenche » |
| l'onglet Problèmes | « calibre à revoir » |
| la carte de décision | « Le 10 A du retest touche la courbe » |

- Le « ? » de la gamme dit « Essaie chaque calibre de votre gamme (1 · 3 · 5 · 7,5 · 10 · 15 · 20 · **25** A) », alors
  que le MS3320 s'arrête à 20 A.
- Dans l'onglet Problèmes, « Ce qu'il faut faire » propose « … ou un calibre plus petit » pour W-012, alors que le
  calibre plus petit ne passe pas. Le texte contredit l'outil.

**Correction** : trois mots, partout.
- **passe** (`--ok`)
- **juste** (`--warn` : il passe sans la marge)
- **déclenche** (`--ko`)

« Touche la courbe » et « sans la marge » vont dans la bulle. Ces mots doivent venir d'une seule table, utilisée par la
fiche, le récapitulatif, les problèmes, le PDF et l'export. Le « ? » lit la gamme de la famille, pas la liste préférée.
« Ce qu'il faut faire » rend le geste concret de la fiche (« Passer en DR12 », un bouton), pas un conseil générique.

### 9. Les exports ne disent pas sur quoi ils reposent
`avant/63-pdf-page1.png`, `avant/67-hypotheses-light-1440.png`, `avant/113-hypotheses-dark-1920.png`

Les hypothèses disent : « se garde dans ce navigateur, pas avec le contrat ». Le dossier PDF n'en dit **rien** :
- l'ambiante de 95 °C ;
- le faisceau × 0,6 ;
- les 5 m supposés ;
- la règle des 2 V ;
- les profils de charge ;
- la marge de 10 %.

Le retest corrigé n'en dit rien non plus. Si j'envoie le dossier à un collègue ou à un vérificateur, il ne peut pas
refaire le calcul.

**Correction** :
- Une page « Hypothèses et sources » dans le PDF, après la garde. Un tableau dense de 32 px : le réglage, sa valeur, la
  valeur de l'outil si elle diffère, et la source (AC 43.13-1B § 11-66…). Les profils de charge, un par disjoncteur.
  Le statut des tables utilisées (vérifié / à confirmer).
- La même chose dans la feuille « Volta » du retest corrigé (voir le point 2).
- En tête des Hypothèses : « ces réglages sont écrits dans chaque export ».

### 10. Le clavier n'est pas celui d'un outil pro
`avant/105-raccourcis-light-1440.png`, `avant/115-recherche-DR20-light-1440.png`

- Depuis le haut de la fiche 102CB1, il faut **21 Tab** pour atteindre « À la main ». Les 5 premiers passent par les
  boutons des folios, derrière la carte.
- Il n'existe ni « refaire » (Ctrl+Y ou Ctrl+Maj+Z) ni palette de commandes.
- La recherche `/` trouve un repère, un part number ou un type (« DR20 · 29 câbles » : très bien), mais rien pour
  « export », « hypo » ou « pdf ».

**Correction** :
- **Ctrl+K**, une palette qui cherche à la fois les objets et les actions : « Exporter le dossier PDF », « Hypothèses »,
  « Passer 102CB1 en 15 A »… Elle reprend la liste de `/`, avec une section « Actions » en tête quand le mot y
  correspond.
- Ctrl+Y et Ctrl+Maj+Z pour refaire.
- Dans une fiche, les touches **1 à 5** ouvrent la section de ce rang, et **C** met le clavier sur le cadran.
- L'ordre de tabulation commence dans la carte quand elle a le focus. Les folios passent après elle.
- La feuille « ? » doit lister tout cela.

---

## 3. Tous les points, écran par écran

> P1 : bloque, perd, ou fait douter du résultat · P2 : gêne nettement · P3 : finition.

### 3.1 Fiche disjoncteur (102CB1, folio 1)

| | où | ce que je ressens | correction |
|---|---|---|---|
| **P1** | Cadran, « À la main » | Voir le point 1 : seuls 15 / 20 A sont proposés, et les crans ne se cliquent pas. | Voir le point 1. |
| **P1** | Fiche ↔ récapitulatif | Le récapitulatif propose les 7 calibres avec leur verdict, la fiche 2. | Un seul composant de choix du calibre, partagé par les deux. |
| P2 | Le cadran | 6 calibres du catalogue sont cachés par « Calibres préférés », et rien ne le dit. | Le lien « Tout le catalogue (13) », plus une ligne dans le « ? » : « vos calibres préférés : 1 3 5 7,5 10 15 20 25 (Hypothèses) ». |
| P2 | La courbe (`avant/06`, `avant/11`, `avant/74`) | 380 × 360 px dans une carte de 420 px. Les étiquettes « 23 °C / 125 °C / −55 °C » sont tassées en haut. L'axe est en ×In seulement. On ne peut ni agrandir ni lire un point au réticule. | Un clic sur la courbe l'ouvre dans une feuille de 760 × 540 (`--lent`, 340 ms). Une bascule « A / × In ». Un réticule au survol qui dit « à 9,31 A : déclenche en 38 s à 125 °C ». Chaque courbe nommée à son extrémité droite, pas en tête. |
| P2 | La courbe : la confiance | Les contacts ont leur repère vérifié / à confirmer, la courbe non. Or les lignes 2TC / MS3320 sont « à confirmer — une source » dans les normes (`avant/66`). | Le repère de 7 px à côté du titre « Courbe de déclenchement », avec la bulle « à confirmer : une source (Sensata 2TC 2018), ±5 % sur le temps ». |
| P2 | « Garder le 10 A… » (`avant/09`) | L'explication est excellente : il faudrait des pointes de 23,2 s au plus. Mais il faut deux clics pour retenir. | La garder, et ajouter la même phrase dans la bulle du cran 10 quand il devient cliquable. |
| P2 | Barre des problèmes (`avant/16`) | La liste mélange problèmes et « à voir », et répète trois fois « Le plan ne dit pas quel contact est serti… ». | Grouper par câble (W-011, W-012, W-015), une ligne de titre par câble. La phrase d'hypothèse du contact une seule fois, en petit (`--f-12`, `--t-2`). |
| P2 | Le contact « taille 23 supposé » sur un disjoncteur | Une borne de MS3320 se raccorde par une **cosse** sur goujon, pas par un contact EN 3155 taille 23. Le problème « le permanent dépasse le contact taille 23 (3 A) » me fait douter de tout le reste. Et la fiche du câble ne dit pas à quel bout est ce contact (`avant/116`). | Une borne de disjoncteur, de batterie ou de bornier prend la famille « cosse » (NSA936501, MS25036…). La fiche du câble montre le contact de chaque bout en puce, comme le dit DESIGN.md (« le contact du bout en puce »). |
| P3 | « ? » de la gamme (`avant/25`) | Il cite 25 A dans la gamme MS3320. | Lire `d.catalogue`, pas `calibresPreferes`. |
| P3 | Le profil (`avant/07`) | Les unités sont en tête (« Courant A », « Durée s »). Le ∞ du permanent est bien vu. Mais les durées de 120 s ne se lisent pas en minutes. | Afficher « 120 s (2 min) » en `.fc-sous` sous la valeur. |

### 3.2 Fiche connecteur (300XC1, folio 3)

| | où | ce que je ressens | correction |
|---|---|---|---|
| **P1** | Connecteur B, « Aucun ne loge B5 » (`avant/97`) | Le bouton « Changer » a disparu. Je ne peux ni choisir ni forcer un arrangement. | « Changer » reste toujours affiché, avec la liste complète (point 7). Le seul geste proposé aujourd'hui, « W-370 en DR18 », reste en tête. |
| P2 | Bulles A · B · C (`avant/93`) | Section Connecteur fermée, un clic sur « A » ne l'ouvre pas : je dois ouvrir la section, puis rechoisir. | Un clic sur une bulle ouvre la section Connecteur sur ce connecteur (`ouvrirSection(box, 'connecteur')`) et l'allume (`.fs-allume`). |
| P2 | Liste « Changer » (`avant/21`) | Seuls 3 arrangements s'affichent, plus l'automatique. Il en existe 30 dans l'EN 4165-002. | Toute la norme, triée par adéquation, avec « loge 6 / 6 », « loge 5 / 6 » à droite. |
| P2 | Contact à sertir (`avant/94`) | La même référence deux fois, et aucune autre. | Voir le point 7. |
| P3 | Raccord, Options (`avant/96`) | Des segments clairs : blindage, étanchéité, sortie, gaine. Mais « toron Ø 3,7 mm » ne dit pas d'où vient le diamètre. | Ajouter une bulle sur le Ø : « somme des 11 câbles (Ø de la base des câbles), × 1,15 de foisonnement ». |
| P3 | Carte à 1920 px (`avant/76`) | La carte garde 420 à 440 px sur un écran de 1920, alors qu'il y a la place. | À 1920 × 1080, porter `--carte-l` à 520 px : les contacts tiennent sur une ligne et la courbe du disjoncteur gagne 25 %. |

### 3.3 Barrette 668VT31 (f. 3) et prise 412VC3B (f. 5)

| | où | ce que je ressens | correction |
|---|---|---|---|
| P2 | Galerie des modules (`avant/30`, `avant/106`) | 2 modules sur 29 en ASNE 0599, 0 sur 45 en NSA 937901. | Voir le point 7 : toute la norme, les modules qui ne logent pas en encre `--t-2` avec leur raison. Le plus proche en tête : « le plus proche : M20-06, il manque 1 contact ». |
| P2 | « le retest dit E0599-1A101Z · garder le retest » (`avant/29`) | Je ne vois pas **pourquoi** le 1A101Z du retest est écarté. | Une ligne sous le lien : « 1A101Z : 3 groupes de 4 — le potentiel 2 (3 câbles) n'y tient pas ». |
| P3 | Section Module | « Module E0599-1B207Z » s'écrit deux fois, dans le titre replié et dans le champ. | Quand la section est ouverte, le résumé de la tête s'efface (opacité 0, 140 ms). |
| P3 | Prise 412VC3B (`avant/33`) | La face et « voir l'embase » sont très bien. Le part number complet (EN3646A61208FN) est écrit en petit dans l'en-tête, mais le récapitulatif Prises ne l'a pas d'office. | Ajouter « Part number » aux colonnes d'office de l'onglet Prises. |

### 3.4 Câble (W-012, W-015, W-370) et masse 901G

| | où | ce que je ressens | correction |
|---|---|---|---|
| **P1** | Fiche câble, défaut de protection | Voir le point 5. | Voir le point 5. |
| **P1** | Chute en pointe 2,28 V contre 2,33 V | Voir le point 4. | Voir le point 4. |
| P3 | Type « DR » plus gauge en liste (`avant/36`) | La liste des gauges suit la famille (DR : 26 à 6 ; MLB : 26 à 10), c'est juste. Mais le type que j'écris d'un bloc (« DR20 ») est coupé en deux champs : il faut deux gestes pour un changement que je pense en un. | Dans la tuile Type, un seul champ « DR20 », avec la liste de la base (`#fi-cables`) et la saisie libre. La gauge reste lisible dessous, sans être un second champ. |
| P2 | De → vers (`avant/116`) | Aucun contact à chaque bout, alors que les problèmes en parlent. | La puce du contact à chaque bout, cliquable (`[data-sertir]`). |
| P3 | Masse 901G (`avant/38`, `avant/39`) | Une seule ligne « 3 câbles » repliée, alors qu'une masse n'a que ça à montrer. Le « ? » dit seulement « 3 câbles y vont ». | Section ouverte d'office. Le « ? » dit la règle : un câble de masse par goujon ou cosse, la gauge maximale, la chute de retour si « retour par câble ». |

### 3.5 Récapitulatif (B), ses onglets, l'index (R), les problèmes (P), la recherche (/)

| | où | ce que je ressens | correction |
|---|---|---|---|
| **P1** | Part number d'un repère édité ligne par ligne | Voir le point 3. | Voir le point 3. |
| P2 | Onglet Disjoncteurs (`avant/46`) | Il n'y a pas de colonne « Retest » d'office : le 10 A du retest est invisible ici, alors que la fiche l'écrit barré. Le verdict « tient » n'est pas le mot de la fiche. | Colonnes d'office : Repère, Calibre, **Retest**, Verdict (passe / juste / déclenche), Problèmes. Le « Meilleur ★ » passe dans les colonnes au choix. |
| P2 | Onglet Problèmes (`avant/51`) | « Ce qu'il faut faire » donne un conseil générique (« onglet Liaisons, son type », « Ouvrir la fiche »), et « ou un calibre plus petit » est faux ici. | Un bouton par ligne avec le geste exact de la fiche (« Passer en DR12 », « Passer en 15 A et grossir… »), à l'encre (`.btn.papier.dense`). |
| P2 | Moitié de l'écran après « Page » (`avant/109`) | Le plan reste à **7 %**, une vignette perdue en haut. | En revenant en moitié, recadrer le plan dans la place libre (`ajuster()` après la transition, 220 ms). |
| P2 | Deux boutons « Tout » dans la même barre (`avant/78`, `avant/98`) | Le segment de portée « Folio 3 · **Tout** 201 » filtre. Le bouton « **Tout** (201) », à côté d'« Exporter 66 liaisons », exporte. En visant le filtre « Tout », j'ai exporté un CSV des 201 liaisons sans le vouloir (« 201 liaisons … enregistrées en CSV »). | Écrire le bouton d'export en entier, « Exporter les 201 », ou le mettre dans un menu ▾ accroché à « Exporter » (« ce folio · tout le contrat »). Un même mot ne doit jamais désigner deux gestes dans une barre. |
| P3 | Édition en place (`avant/98`) | Double-clic, Ctrl+A, « DR18 » puis Tab : la case passe bien à « Vers », la colonne ne saute pas, et ↺ paraît. C'est bon. Mais rien ne confirme le changement. | Après Tab ou Entrée, un mot qui passe court : « W-370 : DR18 (était DR12) · Ctrl+Z ». |
| P3 | Colonnes (`avant/42`) | Le menu « Colonnes » défile (710 px de contenu pour 460 visibles) : je ne vois pas toutes les colonnes d'un coup. | Deux colonnes dans le menu à partir de 12 options (largeur 440 px). |
| P3 | Recherche `/` (`avant/115`) | « DR20 → tous les câbles de ce type, dans le récapitulatif » : excellent. Mais les actions sont absentes. | Voir le point 10 (Ctrl+K). |
| P3 | Index R (`avant/54`) | La ligne « Disjoncteurs · 102CB1 · 15 A · f. 1 » est parfaite. Mais les équipements ne montrent pas leur état (point rouge, ambre) dans la liste. | Le point d'état de 6 px avant le repère, comme dans le récapitulatif. |

### 3.6 Normes, bible, hypothèses, nomenclature

| | où | ce que je ressens | correction |
|---|---|---|---|
| P2 | Bible (`avant/69`, `avant/71`) | 306 références et pas de champ de recherche, seulement les puces de norme. Je veux taper « 12-8 » ou « #16 ». | Un `.filtre` avec sa loupe à gauche de la rangée de puces, qui filtre sur la référence, l'arrangement et la gauge. Le raccourci `/` y met le clavier quand la bible est ouverte. |
| P2 | Normes, recherche « MS3320 » (`avant/66`) | 48 lignes. La colonne Statut répète le même paragraphe sur chaque ligne et la table devient illisible. | Fusionner les notes identiques : une seule note par groupe de lignes, puis « ″ » en dessous (comme pour les contacts de la fiche). |
| P2 | Hypothèses (`avant/67`) | La page est claire et chaque réglage dit ce qu'il fait. Mais rien ne dit que ces valeurs ne voyagent pas dans les exports. | Voir le point 9. |
| P2 | Nomenclature (`avant/72`) | Le disjoncteur est rangé en connecteur, la colonne Fourreau est vide, et il n'y a pas de cosses. | Voir le point 6. |
| P3 | Nomenclature : « +11 », « +2 » | Le compte est là, mais impossible de voir la liste complète sans exporter. | Un clic sur « +11 » déplie la ligne en place. |

### 3.7 Exports

| | où | ce que je ressens | correction |
|---|---|---|---|
| **P1** | Retest corrigé rouvert | Voir le point 2. | Voir le point 2. |
| **P1** | Dossier PDF : disjoncteur en connecteur, folio à 15 A contre MS3320-10 | Voir le point 6. | Voir le point 6. |
| P2 | Dossier PDF : garde (`avant/63-pdf-page1.png`) | « 77 repères » contre 67 dans l'outil. Des textes coupés par « … ». Ni l'appareil, ni le harness, ni les hypothèses. | Voir le point 6 et le point 9. Ajouter à la garde un cartouche « Appareil · Harness · Retest du … · Volta v73 ». |
| P3 | Dossier PDF : 12,6 s pour 9 pages | La carte de progression avec « Annuler » est bien faite (`avant/61`). | La garder, et ajouter le temps restant estimé (« environ 8 s »). |
| P3 | Retest corrigé (non rouvert) | Les commentaires « Avant : DR16 », la colonne « Modifié par Volta » et la feuille Modifications sont excellents. | Ne rien casser (voir la section 5). |

### 3.8 Base SEE (classeur « cohérence » de `tests/see.js`)

| | où | ce que je ressens | correction |
|---|---|---|---|
| P3 | Import (`avant/80`) | Le mot qui passe (« 10 feuilles lues … 28 contrôles ») recouvre le haut de la feuille et le titre « Ce que Volta prend ». | Sur une feuille pleine page, poser le mot qui passe en bas au milieu (bottom 72 px), pas en haut. |
| P3 | Rangée d'onglets (`avant/80`) | 17 onglets. « OBJ_END_Fitting_Rules_Conta » est long et le dernier onglet est coupé (« ConnectiveEq… »). | Un séparateur et un sous-titre « Feuilles du classeur » avant les onglets de feuille. Les noms raccourcis sans le préfixe `OBJ_` et `LNK_`, avec le nom complet en `title=`. |
| P3 | Cohérence (`avant/81`, `avant/82`) | Très pro : le verdict en 4 chiffres, chaque contrôle avec son compte, les exemples avec leur ligne Excel (« l. 15 »). Il manque seulement un moyen d'aller à la ligne. | « l. 15 » ouvre l'onglet de la feuille à la ligne 15, surlignée. |

### 3.9 Le grand retest (`tests/fabrique-base.js`, 100 068 lignes)

| | où | ce que je ressens | correction |
|---|---|---|---|
| P2 | « Déjà fait » d'un contrat de la base (`avant/89`) | La première machine « proche à 100 % » est **le contrat ouvert lui-même** (332A601033-008-H). « Comparer au déjà-fait » (⋮) l'exclut bien, la section de la fiche non. | Exclure le plan ouvert (`app.planId`) de la section « Déjà fait », comme `ficheDejaFaitContrat`. |
| P3 | Recherche « MS3320-10 » (`avant/86`) | 1 573 lignes dans 571 contrats en 15 ms : impressionnant. Mais le résultat ne se filtre pas (par installation, appareil, date). | Des puces de filtre sous le titre : Installation ▾, Appareil ▾, Année ▾. |
| P3 | Contrat ouvert depuis la base (`avant/88`) | Le disjoncteur n'a pas de profil (normal). Le cadran sans couleurs est bien neutre, mais « Écrire le profil » est un bouton au trait, perdu. | Quand il n'y a pas de profil, « Écrire le profil » devient l'action principale (pleine, `.btn.cuivre`), et le cadran affiche en gris « verdict après le profil ». |

### 3.10 Mouvements et temps mesurés

| geste | mesure | verdict |
|---|---|---|
| clic sur un bloc → fiche affichée (folio 1) | **125 à 152 ms** | excellent |
| recherche `/` → Entrée → fiche W-012 | 228 ms | excellent |
| `B` → récapitulatif | 146 ms | excellent |
| clic sur la bulle « A » de 300XC1 | 275 ms | bon |
| premier passage sur les folios 2, 4, 5, 6 | **4,1 · 5,2 · 7,2 · 3,5 s**, et un clic Playwright sur la barre des folios a expiré à 5 s pendant ce temps | **P2** : le dessin se fait ailleurs (Worker), mais la barre ne doit jamais refuser un clic. Pendant le calcul, garder les boutons des folios réactifs et montrer l'esquisse tout de suite. |
| retour sur un folio déjà vu | 120 à 172 ms | excellent |
| grande base : lue / indexée | 2,05 s / 2,5 s (« en 1,6 s » dit la carte) | excellent |
| ouvrir un contrat de la base | 519 ms | excellent |
| « Comparer au déjà-fait » | 205 ms | excellent |
| dossier PDF de 9 pages | 12,6 s | acceptable avec la carte de progression |

*(La machine était partagée avec trois autres membres du panel : les temps longs peuvent être gonflés.)*

---

## 4. Les « moments wow » que je propose

1. **Le cadran qui essaie.** Je survole un cran et la courbe montre en fantôme (trait 1 px, `--t-3`, 140 ms) la courbe
   de ce calibre, avec le verdict sous le grand nombre (« 7,5 A — déclenche en N s », N calculé par le moteur). Je
   clique et c'est retenu.
   L'index glisse sur l'arc en 280 ms (`--courbe`). C'est **l'instrument** dont je rêve, et la réponse directe à « je
   dois tout pouvoir sélectionner ».
2. **Avant / après.** Après « Passer en 15 A et grossir les 3 câbles », la fiche montre deux secondes la courbe du 10 A
   en pointillé et celle du 15 A pleine. Sur le plan, les 3 câbles s'épaississent d'un coup de 220 ms (le trait passe
   de 1,2 à 2,4 px, puis revient), et leur nouveau type s'écrit sur le fil. On **voit** la correction se propager.
3. **« Pourquoi pas ? » partout.** Sous chaque choix de l'outil (calibre, câble, module, arrangement, contact), une
   ligne de 12 px dit pourquoi le candidat juste en dessous est écarté : « DR14 : 14,4 A admis < 15 A ». C'est ce que
   je ferais à la main, et c'est ce qui donne confiance.
4. **Ctrl+K, la palette.** Un verre de nuit au centre (`.menu-verre`, 560 px, coin 14) qui tombe en 220 ms, où l'on
   tape « 102 », « pdf » ou « hypo ». C'est l'outil des gens qui vont vite.
5. **La fiche technique d'un disjoncteur à imprimer.** Une A4 : le cadran, la courbe en grand, le profil, les câbles
   protégés, la chute en ligne, les sources et leur statut. C'est ce que je joindrais à une note de calcul.
6. **La chaîne d'origine.** Survoler un chiffre (9,31 A, 6,9 A admis, 2,28 V) déroule sa généalogie dans la bulle :
   par exemple « 6,9 A = 11,5 A admis seul (DR20, EN 2853, 95 °C) × 0,6 (faisceau, AC 43.13-1B fig. 11-5) ». Chaque
   valeur dit d'où elle vient.

---

## 5. Ce qui est déjà bien, et qu'il ne faut pas casser

- **La vitesse** : 130 ms du clic à la fiche, la recherche dans 100 000 lignes en 15 ms, la base lue en 1,6 s sans
  figer la page, un contrat ouvert en 0,5 s, « Comparer » en 0,2 s.
- **La carte de décision du disjoncteur** (`avant/03`) : « Le 10 A du retest touche la courbe » et ses chiffres, la liste
  des 3 câbles, « Passer en 15 A et grossir les 3 câbles » en un geste, puis le toast qui dit tout. Ctrl+Z défait le
  tout.
- **« Garder le 10 A… »** et sa phrase : « il faudrait des pointes de 23,2 s au plus ». C'est du raisonnement
  d'ingénieur.
- **Le cadran** comme instrument : la gamme sur l'arc, la charge à l'intérieur et la clé des couleurs sous lui. Les
  couleurs vert, ambre et rouge sont justes, en clair comme en sombre (`avant/73`).
- **Les bulles riches** d'une ligne de câble (`avant/10`) : « N'admet que 11,7 A … son contact taille 16 n'admet que
  13 A ; le 15 A laisse passer 28,62 A pour 1 min à −55 °C ».
- **Le repère de confiance** des contacts : « Vérifié par trois sources : TE Solid Contacts, Tri-Star, Amphenol p.9 ».
  C'est le modèle à étendre aux courbes, aux câbles et aux modules.
- **Le choix du calibre au double-clic dans le récapitulatif**, avec le verdict de chaque calibre. C'est le bon modèle :
  il faut le porter dans la fiche.
- **Les faces dessinées** des connecteurs, des modules et de la prise (fiche ou embase), et les options du raccord en
  segments.
- **Le retest corrigé** : un commentaire « Avant : … » sur chaque case changée, la colonne « Modifié par Volta » et la
  feuille Modifications. Il faut seulement qu'il se relise proprement (point 2).
- **La base SEE, onglet Cohérence** : 36 contrôles, le verdict en 4 chiffres, les exemples avec leur ligne Excel, un
  rapport sans données.
- **La feuille des raccourcis** (`?`), sobre et complète pour ce qui existe.
- **La carte de progression du dossier PDF**, avec « Annuler ».
- **L'onglet Problèmes groupé par nature**, avec « Voir le premier » et « Voir les disjoncteurs ».
