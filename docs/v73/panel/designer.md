# Panel v73 : le designer d'interface (ancien des Human Interface Guidelines)

Dossier : `/tmp/claude-0/-home-user-Outil-lectrique-/d44a74ef-5d4e-5d70-aef6-303c6243d2ca/scratchpad/v73/panel/designer/`
(les chemins ci-dessous partent de ce dossier).

- `avant/` contient 221 captures : 1440 × 900 et 1920 × 1080, clair et sombre, et `avant/zoom/` des gros plans en densité ×2.
- `mouvement/` contient les images une par une, et `planches/` les planches-contacts.
- `maquettes/` contient deux maquettes autonomes (`accueil-vivant.html`, `moments.html`) et leurs captures.
- `outils/` contient mes scripts Playwright.

Méthode :
- J'ai fait le tour de l'outil à la souris et au clavier.
- J'ai étudié le mouvement de trois façons :
  - au ralenti ×10 (CDP `Animation.setPlaybackRate`) ;
  - à des instants exacts (`currentTime` posé à 0, 20, 40… ms) ;
  - en temps réel (captures successives), pour ce que le JS anime.
- J'ai mesuré au pixel la géométrie, les contrastes et le coût CPU.
- Une limite est connue. Sous Playwright, l'outil place les folios en synchrone (« pilote automatique »). J'ai donc remis le placement « au loin » (`atelier.placement(true)`) pour juger comme un humain.

---

## 1. Mes notes sur 10

| | note | en une phrase |
|---|---|---|
| **Beauté** | **6,5** | L'identité « Nuit bleue » est juste et tenue (palets de verre, feuille blanche, menu de verre), mais la vitrine n'a pas d'éclat. L'accueil est une pile de paragraphes, le fond dort, et la typographie a un défaut qui se voit partout (le trait d'union élargi). |
| **Clarté** | **7** | Chaque écran dit l'essentiel. Mais les bulles cachent parfois ce qu'on vient d'ouvrir, et le cadran se lit sans se toucher. |
| **Fluidité** | **7** | C'est vif : 60 images/s, une seule courbe bien choisie. Mais la carte naît en dalle blanche vide, et le dessin définitif remplace l'esquisse en double image. |
| **Plaisir** | **5** | Rien ne surprend ni ne récompense : aucun « moment » qu'on aurait envie de refaire pour le plaisir du geste. |

---

## 2. Les 10 choses qui me gênent le plus

### 1. La table dort (P1)
- **Captures** : `avant/04-plan-lueur-dark-1440.png`, `avant/01-accueil-vide-dark-1920.png`
- **Constat** :
  - Le souffle de la table se fige six secondes après le dernier geste (`TABLE_EVEIL = 6000`, 08-table).
  - La lueur s'arrête avec la main.
  - Les points sont une trame uniforme à 22 %, d'un bord à l'autre.
  - Au repos, rien ne bouge : c'est précisément ce que le lecteur reproche.
- **Correction** : la table vivante (§ 6), mesurée.
  - Deux nappes de lumière dérivent sur des périodes de 47 à 61 s.
  - La lueur révèle la grille sous la main.
  - Un « courant » de glace parcourt une rangée de points toutes les 14 à 22 s.
  - Une veille s'installe à 90 s.
  - Résultat : 2 % du fil principal au repos.
  - Preuves : `planches/derive.png`, `maquettes/accueil-vide-lueur-1440.png`, `maquettes/courant-zoom.png`.

### 2. L'accueil n'est pas une vitrine (P2)
- **Captures** : `avant/01-accueil-vide-light-1440.png`, `avant/01-accueil-vide-dark-1920.png`
- **Constat** : huit strates empilées sur 633 px :
  - la pile, le titre, la phrase, les deux gestes ;
  - un encadré pointillé de trois lignes ;
  - la phrase de la base, sur deux lignes et un tiret ;
  - le filet « Pour essayer » ;
  - la carte Exemple.
- **Tailles** :
  - Le titre fait 28 px, la taille d'un titre de page : il n'y a pas de taille d'affiche.
  - La pile fait 168 px.
  - L'encadré pointillé est plus fort que le bouton secondaire.
  - À 1920, rien ne grandit : la composition flotte, perdue au milieu.
- **Espacements** : 30, 12, 28, 22, 18 et 64 px. Aucun rythme.
- **Correction** : une composition, un objet, un titre, un geste, et un dock (§ 5). Maquette : `maquettes/accueil-vide-1440.png`, `-1920.png`.

### 3. Le dessin définitif remplace l'esquisse en double image (P1, ça fait mal aux yeux)
- **Captures** : `mouvement/E-esquisse-034.png`, `planches/E-esquisse.png`
- **Constat** :
  - Au premier passage sur un folio, on voit l'esquisse (« le dessin définitif dans environ 3 s »).
  - Puis le définitif arrive en fondu enchaîné de 550 ms (`.dessin-fondu`).
  - Deux dispositions différentes se superposent : deux 300XC1, deux 397TB1, des câbles en double.
  - C'est l'objet principal de l'outil, et il « bave ».
- **Correction** : le moment signature n° 3, « le dessin se range » (§ 4) : chaque bloc glisse de sa place d'esquisse à sa place définitive, sans double image.

### 4. La carte naît en dalle blanche vide qui couvre les voisins (P2)
- **Captures** : `mouvement/X2-carte-nait-light-t040.png`, `planches/X2-carte-nait-light.png`, et la résorption `planches/X3-carte-resorbe-light.png`
- **Constat** :
  - La carte grandit en 280 ms avec une échelle non uniforme (`scale(sx, sy)`, 08-carte l. 154). Les coins de 18 px deviennent ovales.
  - Son contenu reste à opacité 0 jusqu'à 40 %.
  - De 20 à 110 ms, une dalle blanche vide de 300 × 360 px recouvre 101BT1 et 103RL1, justement les blocs que la carte doit éviter.
  - La résorption repasse dessus, en fantôme.
- **Correction** : le moment signature n° 1 (§ 4). La carte part du centre du bloc à une échelle uniforme, lisible dès la première image, sans dalle. Preuve : `planches/S1-carte-deplie.png`, `mouvement/S1-carte-deplie-t060.png`.

### 5. Les bulles couvrent ce qu'on vient d'ouvrir (P1 pour « À la main »)
- **Captures** : `avant/41-calibre-a-la-main-light-1440.png`, `avant/49b-barrette-galerie-light-1440.png`, `avant/50-prise-ouverte-light-1440.png`, `avant/18-problemes-light-1440.png`, `avant/24-normes-light-1440.png`
- **Constat** :
  - Un clic sur « À la main » ouvre la gamme… et la bulle « Retenir à la main un autre calibre… » reste posée dessus : elle cache les puces qu'on veut cliquer.
  - Pour la barrette, la bulle couvre la galerie et l'onglet de la seconde norme.
  - Pour la prise, la bulle déborde la carte jusqu'à 2 px du bord de l'écran.
  - Le mot « Problème 1 / 10 … P : le suivant » chevauche la carte de 21 px (toast jusqu'à 1031, carte dès 1010).
  - Au clavier, la bulle « Menu » reste sur la croix des documents après Échap.
- **Correction (une règle pour toutes)** :
  - Une bulle s'éteint au `pointerdown` et ne revient qu'après `pointerleave`.
  - Elle reste dans sa carte (ou à 12 px du bord de l'écran) et se retourne s'il le faut.
  - Elle ne se pose jamais sur ce que son geste vient d'ouvrir.
  - Le toast se centre dans la place libre à gauche de la carte, comme il le fait déjà pour le volet.

### 6. Le cadran se lit mais ne se touche pas (P2)
- **Captures** : `avant/zoom/z06-cadran-light.png` et `avant/zoom/z06-cadran-dark.png`
- **Constat** :
  - Le défaut est confirmé par le brief : les crans 1, 3, 5, 7,5 ne se cliquent pas, et « À la main » ne propose que 15 et 20.
  - Au pixel, le « 15 » est collé à l'index (2 px).
  - Le « 10 » ambre et son cran forment un « + ».
  - Les chiffres font 11 px.
- **Correction** : le moment signature n° 2, « le cadran qu'on tourne » (§ 4). Maquette : `planches/S2-cadran-tourne.png`.
  - Chaque cran se clique, l'index suit l'arc et le chiffre roule.
  - Le verdict se dit en une ligne (« 5 A ne passe pas : la pointe de 9,31 A pendant 2,1 min touche sa courbe »).

### 7. Les chiffres tabulaires sont posés sur TOUT le texte, et le trait d'union s'élargit (P2)
- **Captures** : `avant/zoom/z02-accueil-gestes-light.png` (« glissez - le », « Ctrl+O »), `avant/48-connecteur-ouvert-light-1440.png` (« du 12 - 20 »), `avant/25-bible-light-1440.png` (« EN 2997 - 002 »)
- **Constat** :
  - `body{font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1}` (style.css l. 171).
  - Mesure Inter 600 13 px : avec `tnum`, le « - » fait 7,97 px au lieu de 5,97 px, et « : . , » font 2,97 px au lieu de 3,97 px.
  - Chaque trait d'union devient un tiret aéré, et la ponctuation se serre. C'est le défaut typographique le plus répandu de l'outil.
- **Correction** : `tnum` seulement sur ce qui s'aligne en colonne (§ 5, jetons).

### 8. Des contrastes ratés à même la table (P2)
- **Captures** : `avant/32-survol-carte-light-1440.png`, `avant/zoom/z02-accueil-gestes-light.png`, `avant/zoom/z03-barre-rail-jonction-light.png`
- **Constat** :
  - « 5 problèmes dans 1 plan » est écrit en `--ko` des feuilles (#c3271f) sur la table : **2,94:1**.
  - La touche « Ctrl+O » sur le bouton clair est à **1,72:1**.
  - Le survol du geste clair passe de #e9eef9 à #fff : **1,16:1**, on ne le voit pas.
  - La pastille « 5 » du rail (#cc3127 sur le palet) est à **2,3:1**, sous les 3:1 d'un objet non textuel.
- **Correction** : jetons `--t-table-ko`, `--pastille-ko`, `--kbd-clair-t` et `--halo-geste` (§ 5). Ils sont mesurés à 6,7:1, 4,3:1, 8:1, et la carte se soulève au survol.

### 9. La bibliothèque pleine : la pile ne se lit pas comme des feuilles, « Reprendre » écrase tout (P2)
- **Captures** : `avant/31-bibliotheque-pleine-light-1920.png`, `avant/32-survol-carte-light-1440.png`
- **Constat** :
  - Les feuilles de la pile ne sont que deux ombres décalées (`0 8px 0 -4px`). On voit une barre grise sous la carte, pas des feuilles.
  - « Reprendre » est une bande de papier blanc de 1160 × 64 qui concurrence les cartes : deux papiers au même niveau.
  - Les noms des plans sont en chasse fixe (« H-1 Alimentation » : ce sont des mots).
  - Une installation d'un seul plan laisse 90 px de blanc mort.
- **Correction** : `maquettes/accueil-pleine-survol-carte-1440.png` et `maquettes/accueil-pleine-1440.png` (§ 5).

### 10. Le « jeu » n'est pas tenu au pixel (P3, mais partout)
- **Captures** : `avant/zoom/z03-barre-rail-jonction-light.png`, `avant/zoom/z05-carte-tete-light.png`
- **Constat** :
  - Le rail et les feuilles commencent à `top: 52 px`, collés au filet de la barre (0 px), alors qu'ils sont à 10 px des autres bords.
  - La marque est à 3 px à gauche de la colonne du rail : centre à 29 px contre 32 px.
  - Dans la barre de la carte, ‹ › font 30 px, l'épingle et × font 32 px.
  - Il y a 22 animations d'entrée différentes, d'amplitudes 3, 4, 6, 8, 10, 12, 14 et 16 px, dans les quatre sens.
- **Correction** : § 3 (Plan), et une seule règle d'entrée (§ 5).

---

## 3. Tous les points, écran par écran

### L'accueil, rien encore (`avant/01-…`, `02-…`)

| | où | ce que je ressens | correction |
|---|---|---|---|
| P2 | la composition | huit strates, cinq paragraphes, pas de point focal ; le titre (28 px) n'est pas plus grand qu'un titre de document ; à 1920 elle ne grandit pas | § 5 « L'accueil » : la pile de 236 px, un titre de 40 px (clamp jusqu'à 56), une phrase, deux gestes, une ligne, le dock en bas |
| P2 | « Ctrl+O » dans le bouton clair | 1,72:1, c'est illisible ; écrit en une seule touche « Ctrl+O » | deux touches `Ctrl` `O`, `--kbd-clair-t` #3f4a62 sur `rgba(15,26,46,.07)`, filet `inset 0 0 0 1px rgba(15,26,46,.1)`, 11 px / 500 mono, padding 4 × 5, coin 5 : 8:1 |
| P2 | survol du geste principal | de #e9eef9 à #fff : on ne voit rien | au survol, `translateY(-1px)` et `--halo-geste` (`0 16px 36px -12px rgba(130,175,255,.7)`) ; pressé, `scale(.97)` en 90 ms |
| P2 | l'encadré pointillé « …ou glissez-le » | un cadre pointillé de 520 px plus fort que le bouton secondaire ; la phrase commence par des points de suspension | une ligne de 13 px, icône 16, sans cadre : « ou glissez-le n'importe où dans la fenêtre » (la fenêtre entière s'allume déjà au dépôt) |
| P3 | la phrase de la base (2 lignes, tiret) | du texte de mode d'emploi sur la vitrine | une tuile du dock « Base des contrats · déposer les contrats déjà faits » ; « même à 300 000 lignes » dans sa bulle |
| P3 | la barre du haut sur l'accueil | une bande de 52 px et son filet pour un logo seul | transparente sur l'accueil (`background:none; box-shadow:none`) ; elle reprend sa bande dès qu'on défile ou qu'un plan est ouvert (`--moyen`) |
| P3 | « Pour essayer » et l'Exemple | une carte au trait seule en bas, sous un filet | la tuile Exemple du dock, à côté de la base |
| P3 | l'arrivée | 340 ms, chaque bloc translateY 6 px, décalage 30 ms : correct mais muet | la chorégraphie du § 5 : la pile, le titre, la phrase, les gestes, puis la vignette **se dessine** (les deux fils se tracent, 640 ms) |

### La bibliothèque pleine, une installation, une nouvelle installation (`avant/31` à `34`)

| | où | ce que je ressens | correction |
|---|---|---|---|
| P2 | la pile de feuilles | des barres grises sous la carte, pas des feuilles | trois vraies couches : `.p2` (scale .97, Y +6 px, #dfe6f3) et `.p3` (scale .94, Y +12 px, #c9d3e6), chacune avec son filet ; au survol, la carte monte de 4 px, `.p2` passe à translate(7 px, 7 px) rotate(2°), `.p3` à translate(−8 px, 13 px) rotate(−3°), en 420 ms `--courbe-entree` (`maquettes/accueil-pleine-survol-carte-1440.png`) |
| P2 | « Reprendre » | une bande de papier blanc pleine largeur, au même niveau que les cartes | un widget de **verre** : 76 px de haut, coin 18, `rgba(38,54,86,.62)`, filet de lumière ; la vignette 72 × 51, « Reprendre où vous en étiez » (12 px), le nom (16 / 600), les puces des folios (22 × 22, la courante claire), la touche `Échap` ; le papier reste réservé à ce qu'on choisit |
| P2 | « 5 problèmes dans 1 plan » sur l'Exemple | rouge à 2,94:1 sur la table | `--t-table-ko` #ff7a6e (6,7:1) |
| P3 | les noms de plans dans la carte | en chasse fixe : on dirait du code | Inter 12 / 500 ; la chasse fixe pour l'ECP seulement |
| P3 | l'état d'une installation | une ligne rouge dans les métadonnées | une pastille d'état en haut à droite de la carte (`.badge.ko` : « 2 problèmes ») |
| P3 | une installation d'un seul plan | 90 px de blanc mort | carte de 200 px en `flex-direction:column; justify-content:space-between` : la liste en bas, alignée d'une carte à l'autre |
| P3 | « Rangées par » | un segment qui flotte entre deux blocs | un intertitre au filet (« Installations, par n° ECP » + filet `--l-table`), le segment à droite sur la même ligne |
| P3 | nouvelle installation | la carte neuve pousse la grille, « Feux de navigation » saute à la rangée suivante d'un coup | FLIP des cartes : 300 ms `--courbe-glisse` |
| P3 | le rail des installations, un ECP vide | « ····· » : joli mais cryptique | « — » à l'encre seconde |

### Le plan : la table, la barre, le rail, les folios (`avant/03` à `05`, `30`, `62-…`)

| | où | ce que je ressens | correction |
|---|---|---|---|
| P1 | le fond | il dort | § 6 |
| P1 | l'esquisse remplacée par le définitif | double image pendant 550 ms | moment signature n° 3 (§ 4) |
| P2 | le rail et les feuilles | `top: 52` = la hauteur de la barre : collés au filet, alors qu'ils sont à 10 px des autres bords | `top: calc(var(--entete) + var(--jeu))` pour le rail, les feuilles et le volet (la carte flottante l'a déjà, top 62) |
| P3 | la marque | centre à 29 px, colonne du rail à 32 px | `.en-volta{padding-left:7px}` |
| P3 | la pastille « 5 » du rail | #cc3127 sur le palet : 2,3:1 | `--pastille-ko` #ff6b5e, chiffre `--pastille-ko-t` #2a0806, anneau 2 px de la couleur du palet |
| P3 | l'icône « Ajouter une liaison » | un trait, un rond, un + : se lit comme un curseur de réglage | un câble entre deux bornes, et le + en exposant : même trait de 1,5, même boîte de 24 |
| P3 | le changement de folio | une coupe franche (sur un folio déjà calculé) | le nouveau folio entre de 32 px dans le sens du geste, en 260 ms `--courbe-entree` ; l'ancien sort de 32 px en 120 ms `--courbe-sortie` ; la pastille claire du folio courant **glisse** d'une puce à l'autre en 220 ms `--courbe-glisse` au lieu de sauter. Mouvement réduit : coupe |
| P3 | la lueur | elle rattrape d'un cinquième par image (code), DESIGN dit « un quinzième » | un ressort amorti critique (ω = 9 rad/s, posé en environ 0,5 s, sans dépassement) ; et corriger DESIGN |
| P3 | le palet des folios | sa marge gauche (64 px) n'est pas celle du rail (10 px) | à trancher : l'aligner sur le rail (`left: var(--jeu)`), une seule marge gauche ; le rail s'arrête à 300 px du bas |

### La carte, commune à toutes les fiches (`avant/06`, `13b`, `46`, `planches/X2`, `X3`)

| | où | ce que je ressens | correction |
|---|---|---|---|
| P2 | la naissance | une dalle blanche vide (20 à 110 ms) sur les voisins ; échelle non uniforme | moment signature n° 1 |
| P2 | la résorption | le double repasse sur les voisins ; l'opacité ne tombe qu'à la fin | 240 ms `--courbe-sortie` ; échelle uniforme vers le centre du bloc ; opacité à 0 dès 70 % |
| P3 | la barre de la carte | ‹ › font 30 px, l'épingle et × font 32 px | tous à 32 px, icône 18 |
| P3 | le repère en titre | JetBrains Mono 24 / 600 avec −0,6 px de chasse : une chasse fixe resserrée perd sa grille | `letter-spacing:0` (−.01em au plus) |
| P3 | les résumés de section | coupés en plein mot (« W-012 (DR2… », « aucun arrangement E… ») | le compte sur la ligne, le premier point en dessous, deux lignes au plus (`line-clamp:2`) |

### Le disjoncteur 102CB1 (`avant/06`, `40` à `45`, `zoom/z06-…`)

| | où | ce que je ressens | correction |
|---|---|---|---|
| P1 | « À la main » | la bulle reste sur la gamme qu'on vient d'ouvrir | règle des bulles (point 5 du § 2) |
| P2 | le cadran | il se lit et ne se touche pas | moment signature n° 2 |
| P2 | la hiérarchie | la carte de décision rouge fait 320 px (fond, titre, filet rouges ; bouton noir ; trois câbles) ; le cadran, le héros, est replié dessous ; trop de rouge pour ce qui est une proposition | décision sur fond `--s-surface`, filet `--ko` de 3 px, seul le titre en rouge, 180 px au plus (« 3 câbles à grossir ›» replié) ; section Calibre ouverte dessous : le cadran visible dans les 620 px de la carte |
| P3 | le cadran au pixel | « 15 » collé à l'index (2 px) ; le cran ambre du 10 forme un « + » ; chiffres de 11 px | chiffres à 12 px ; celui du retenu poussé de 4 px vers l'extérieur ; crans du « serré » dessinés hors de la piste |
| P3 | en sombre | le bouton plein devient blanc sur rouge profond : il crie | une conséquence du point précédent (la décision sur la surface) |

### Connecteur 300XC1, barrette 668VT31, prise 412VC3B, câble W-012, masse 901G (`avant/08` à `12`, `48` à `51`)

| | où | ce que je ressens | correction |
|---|---|---|---|
| P2 | la barrette : bulle du module | elle couvre la galerie et l'onglet de la seconde norme, touche le bord de l'écran | règle des bulles |
| P2 | la prise : bulle du part number | elle déborde la carte jusqu'à 2 px du bord | règle des bulles |
| P3 | le câble : les tuiles | des tuiles cadrées et, dedans, des champs gris : un cadre dans un cadre | les champs ont l'air d'une valeur (pas de fond) jusqu'au survol, comme DESIGN le dit (`.fc-in`) |
| P3 | la masse épinglée | trois lignes puis 600 px de blanc | un objet court reste carte flottante, même épinglé ailleurs ; ou le volet prend la hauteur de son contenu, `max-height` jusqu'en bas |
| P3 | le connecteur | rien à redire au dessin. La ligne B5 en défaut (fond `--ko-soft`, filet à gauche) est juste | — |

### Récapitulatif, index, recherche, problèmes, menu, raccourcis (`avant/15` à `22`)

| | où | ce que je ressens | correction |
|---|---|---|---|
| P2 | le mot « Problème 1 / 10 … » (P) | il chevauche la carte de 21 px | le toast se centre dans la place libre à gauche de la carte (`body.insp-flotte` : même calcul que pour le volet, avec la carte) |
| P3 | le récapitulatif : les disques de gauge | trois styles sans légende (plein noir 16, cerclé 20, pâle 22 et 24) | un seul disque ; la couleur dit l'état, et la bulle dit pourquoi |
| P3 | le récapitulatif en page à 1920 | la table s'arrête à 860 px et laisse 1000 px vides | la colonne « État » prend le reste (`width:100%` sur la dernière), ou la table est centrée à `max-width:1280px` |
| P3 | la recherche | la liste (460 px) dépasse le champ (420 px) de 40 px à droite : deux bords | la liste a la largeur du champ, ou elle est centrée dessous |
| P3 | la bulle « Menu » (au clavier) | après Échap, elle reste et couvre la croix du document ouvert | pas de bulle sur un bouton qui reçoit le focus par programme (Échap) ; elle revient au prochain Tab |
| — | le menu ⋮, ses sous-menus | beau : le verre dense, les lignes de 34 px, la bulle à gauche | à garder (§ 7) |
| — | la feuille des raccourcis | juste : les touches au filet, les deux colonnes | à garder |

### Les documents (`avant/23` à `28`, `planches/X5`)

| | où | ce que je ressens | correction |
|---|---|---|---|
| P3 | l'entrée d'une feuille | elle traverse un état gris translucide (opacité linéaire sur 340 ms) | opacité 1 dès 120 ms ; translateX de 24 px sur 420 ms `--courbe-entree` ; le plan se recadre en même temps, en `--courbe-glisse` |
| P3 | les normes | « Normes » trois fois (sur-titre, titre, onglet) | le sur-titre « Ce que l'outil vérifie » seul, les onglets font le titre |
| P3 | « Vos fichiers » | trois zones pointillées et deux « Ce que j'attends » d'un coup : beaucoup de bruit | seule la première entrée vide garde sa zone ; les autres ont un lien « Déposer… » |
| P3 | les hypothèses | des réglages réussis ; seule la liste « Retour » est un `select` natif au milieu de champs dessinés | `select` à 34 px, coin 10, chevron de 14 au trait, comme `.champ` |
| — | la nomenclature, le cartouche | sobres et justes (les chiffres clés, l'aperçu sur papier) | à garder |

### La typographie, la couleur, le mouvement (transverse)

| | où | ce que je ressens | correction |
|---|---|---|---|
| P2 | `tnum` sur `body` | le trait d'union élargi, la ponctuation serrée, partout | § 5 |
| P2 | 22 animations d'entrée | amplitudes de 3 à 16 px, dans les quatre sens, durées de 140 à 340 ms : chacun a la sienne | une seule `@keyframes entre` (§ 5) |
| P3 | une seule courbe | l'entrée et la sortie ont la même courbe : une sortie doit accélérer | `--courbe-entree`, `--courbe-sortie`, `--courbe-glisse` (§ 5) |
| P3 | les bulles | 400 ms à chaque bulle, même quand on balaie le rail | « bulles chaudes » : 0 ms pendant 1,2 s après la fermeture d'une bulle (comme macOS) |
| P3 | DESIGN dit « titres de section 15 px » | le code fait 13 px / 600 | aligner : le 13 / 600 est juste dans une carte ; corriger DESIGN, ou ajouter `--f-15` |
| P3 | deux encres d'interface | #1b1f27 (feuilles) et #141c2c (bibliothèque) | une seule : #1b1f27 |
| P3 | les tailles d'affiche | il n'y en a pas : 28 px au plus | `--f-34` (la bibliothèque), `--f-44` (l'accueil, en clamp) |

---

## 4. Les « moments signature » (trois), et les autres « wow »

### Moment signature n° 1 : la carte se déplie du bloc
Maquette : `maquettes/moments.html?moment=carte`. Images : `planches/S1-carte-deplie.png`.

```
naissance        340 ms  cubic-bezier(.32,.72,0,1)
  la carte entière part du CENTRE du bloc, à échelle UNIFORME
  s = clamp(.16, max(bloc.l / carte.l, bloc.h / carte.h), .5)
  — jamais sx ≠ sy : ni texte écrasé, ni coins ovales
  opacité   0 → 1 sur les 25 premiers % ; son contenu est LÀ dès la première image (pas d'opacité 0 sur #ba-equip)
  ombre     --sh-carte, sans clip : elle grandit avec elle
  viseur    les coins du bloc se serrent : scale 1.12 → 1, opacité 0 → 1, 160 ms
  fil       se trace à +200 ms, en 220 ms (inchangé)
d'un bloc à l'autre  300 ms  --courbe-glisse  (A → B sous les yeux) ; le fil se retrace
résorption       240 ms  cubic-bezier(.4,0,1,1)  vers le centre du bloc, échelle uniforme, opacité 0 dès 70 %
mouvement réduit       la carte paraît à sa place (inchangé)
```

### Moment signature n° 2 : le cadran qu'on tourne
Il corrige aussi le défaut confirmé. Maquette : `maquettes/moments.html?moment=cadran`. Images : `planches/S2-cadran-tourne.png`.

```
chaque cran (1 · 3 · 5 · 7,5 · 10 · 15 · 20) est un bouton : cible ronde de 22 px, survol voile 6 %, chiffre en demi-gras
clic      l'index VOYAGE le long de l'arc (pas en ligne droite) : 120 ms par cran franchi + 60, au plus 420 ms, --courbe-glisse
          le chiffre du centre ROULE : chaque valeur traversée s'affiche (≈ 60 ms chacune)
arrivée   l'index se pose : scale 1.18 → 1, 160 ms --courbe-entree
verdict   une ligne sous le cadran, dans sa couleur d'état, fond doux, 220 ms --courbe :
          « 5 A ne passe pas : la pointe de 9,31 A pendant 2,1 min touche sa courbe. »
          « 15 A passe : le plus petit de la gamme qui tient la pointe. »
« À la main » propose TOUTE la gamme (les crans qui ne passent pas en puce au trait rouge)
« Automatique » rend le meilleur avec le même voyage à l'envers
clavier   ← → sur le cadran déplacent l'index d'un cran ; Entrée retient
réduit    l'index saute, le verdict change, rien ne roule
```

### Moment signature n° 3 : le dessin se range (de l'esquisse au définitif)
Il remplace le fondu enchaîné en double image.

```
au remplacement : pour chaque .comp[data-name] présent dans les deux dessins
  Δ = boîte d'avant − boîte d'après (à l'écran)
  le bloc NEUF part de translate(Δ) et glisse à 0 : 420 ms --courbe-glisse
  ordre : du plus proche au plus loin de son point d'arrivée, +6 ms par rang (120 ms au plus)
les câbles (.cab) : ceux de l'esquisse s'effacent en 120 ms --courbe-sortie ;
  ceux du définitif paraissent de 180 à 420 ms (opacité), JAMAIS deux jeux de câbles pleins à la fois
un bloc qui n'existait pas : opacité 0 → 1 et scale .96 → 1 à +200 ms, 220 ms
coût : un transform par <g> (≈ 60 blocs), will-change seulement pendant ; rien d'autre ne bouge
réduit : coupe franche
```

### Les autres « wow » (petits, mais on les sent)
- **La lueur révèle la grille** : sous la main, dans un disque de 420 px, les points passent de 16 % à 55 % et restent calés sur la grille de 24 px. La souris devient une lampe posée sur la table.
- **Le courant** : de temps en temps, un éclat de glace court le long d'une rangée de points. C'est l'électricité, discrète (§ 6).
- **L'accueil se pose**, puis la vignette **se dessine** : les deux fils aux couleurs des routes se tracent en 640 ms.
- **La pile s'évente** au survol d'une installation (§ 3).
- **La pastille du folio glisse** d'une puce à l'autre au lieu de sauter.
- **Les bulles chaudes** : on balaie le rail et les noms paraissent l'un après l'autre, sans attendre.

---

## 5. Les spécifications prêtes à coder

### 5.1 Les jetons proposés (`src/style.css`, `:root`)
Ils s'ajoutent. Les noms d'aujourd'hui (`--rapide`, `--moyen`, `--lent`, `--courbe`) restent.

```css
:root{
  /* ── LE MOUVEMENT ── */
  --courbe:cubic-bezier(.2,.8,.2,1);          /* inchangé : survol, couleur, état */
  --courbe-entree:cubic-bezier(.32,.72,0,1);  /* ce qui PARAÎT : carte, feuille, menu, bulle, toast, rangée — vif, très freiné */
  --courbe-sortie:cubic-bezier(.4,0,1,1);     /* ce qui PART : accélère, ne traîne pas */
  --courbe-glisse:cubic-bezier(.65,0,.35,1);  /* ce qui VA de A à B sous les yeux : index, pastille du folio, blocs, recadrage */
  --d-instant:90ms;                           /* pressé */
  --d-rapide:140ms; --d-moyen:220ms; --d-lent:340ms;   /* les durées d'aujourd'hui, sans la courbe */
  --d-pose:420ms;                             /* ce qui se pose sur la table : feuille, carte, accueil */
  --d-trace:640ms;                            /* un trait qui se dessine */
  --decale:40ms;                              /* l'écart entre deux éléments d'une arrivée (6 au plus) */
  --monte:8px;                                /* l'amplitude UNIQUE d'une entrée verticale */
  --glisse:24px;                              /* l'amplitude UNIQUE d'une feuille qui entre de côté */
  --presse:.97;                               /* l'enfoncement d'un bouton */
  --bulle-chaude:1200ms;                      /* après une bulle, la suivante paraît tout de suite */
  /* ── LA TYPOGRAPHIE ── */
  --f-15:15px; --f-34:34px; --f-44:clamp(36px,2.9vw,56px);
  /* ── LA TABLE VIVANTE ── */
  --nappe-a:radial-gradient(closest-side,rgba(92,138,226,.34),rgba(92,138,226,.12) 45%,rgba(92,138,226,0));
  --nappe-b:radial-gradient(closest-side,rgba(40,112,170,.30),rgba(40,112,170,.10) 50%,rgba(40,112,170,0));
  --s-grille:rgba(160,188,240,.16);           /* au repos (aujourd'hui .22) */
  --s-grille-revele:rgba(190,212,255,.55);    /* sous la lueur */
  --points-vignette:radial-gradient(ellipse 72% 68% at 50% 46%,#000 35%,rgba(0,0,0,.35) 75%,transparent);
  --courant:linear-gradient(90deg,rgba(159,194,255,0),rgba(190,214,255,.85) 70%,#ebf3ff);
  /* ── LES ENCRES À MÊME LA TABLE (mesurées) ── */
  --t-table-ko:#ff7a6e;                       /* 6,7:1 sur la table (le --ko des feuilles y fait 2,9:1) */
  --pastille-ko:#ff6b5e; --pastille-ko-t:#2a0806;   /* 4,3:1 contre le palet ; le chiffre 6,6:1 */
  --kbd-clair-t:#3f4a62; --kbd-clair-fond:rgba(15,26,46,.07);   /* une touche sur un bouton clair : 8:1 */
  --halo-geste:0 16px 36px -12px rgba(130,175,255,.7);         /* le geste clair survolé, sur la table */
}
```

### 5.2 Les chiffres tabulaires à leur place

```css
body{font-feature-settings:"cv05" 1;font-variant-numeric:normal}
:is(td,th,.d,.chip,.fo-lbl,.zl,kbd,.badge,.puce-n,.onglet-n,.fs-badge,.dj-stat b,.dj-h-cal,.dj-chip,.bi-ecp b,
    .co-n,.cc-taux,.q-c b,.bi-plan-date,.bi-ligne .d){font-variant-numeric:tabular-nums}
```
Vérification : le « - » revient à 5,97 px, « : » à 3,97 px ; les colonnes de chiffres gardent leur alignement.

### 5.3 Une seule entrée (elle remplace les 22 `@keyframes` d'entrée)

```css
@keyframes entre{from{opacity:0;transform:translate(var(--entre-x,0),var(--entre-y,var(--monte)))}}
.entre-v{animation:entre var(--d-pose) var(--courbe-entree) both;animation-delay:calc(var(--k,0) * var(--decale))}
/* une feuille de côté : --entre-x:var(--glisse); --entre-y:0 ; ce qui tombe d'un bouton : --entre-y:-4px, durée --d-moyen */
/* les sorties : même chemin à l'envers, 0,7 × la durée, --courbe-sortie */
```

### 5.4 Les durées et les courbes, mouvement par mouvement

| mouvement | aujourd'hui (mesuré) | proposé |
|---|---|---|
| la carte naît | 280 ms `--courbe`, `scale(sx,sy)`, contenu à 0 jusqu'à 40 % | 340 ms `--courbe-entree`, échelle uniforme, contenu présent (moment n° 1) |
| la carte glisse | 300 ms `--courbe` | 300 ms `--courbe-glisse` |
| la carte se résorbe | 250 ms `cubic-bezier(.5,0,.3,1)` | 240 ms `--courbe-sortie`, uniforme, opacité 0 dès 70 % |
| une feuille entre | 340 ms, opacité linéaire, X 16 px | 420 ms `--courbe-entree`, X 24 px, opaque dès 120 ms |
| le récapitulatif monte | 340 ms, Y 14 px | 420 ms `--courbe-entree`, Y 24 px |
| un menu tombe | 220 ms, Y −4, scale .985 | 200 ms `--courbe-entree`, Y −4, scale .96, origine à son bouton ; il se ferme en 120 ms (opacité) |
| une bulle | 400 ms d'attente, 140 ms | 400 ms la première, puis 0 ms pendant 1,2 s ; éteinte au `pointerdown` |
| le toast | 220 ms | entre en 340 ms `--courbe-entree` (Y −8 → 0), sort en 200 ms `--courbe-sortie` |
| changement de folio | coupe | 260 ms : nouveau de ±32 px, ancien sort en 120 ms ; la pastille glisse en 220 ms `--courbe-glisse` |
| esquisse vers définitif | fondu enchaîné de 550 ms (double image) | les blocs se rangent, 420 ms `--courbe-glisse` (moment n° 3) |
| un bouton pressé | `scale(.98)` 140 ms (`.rd` : .94) | `scale(var(--presse))` 90 ms, relâché en 140 ms `--courbe` |
| l'arrivée de la bibliothèque | 340 ms, Y 6, +30 ms | `.entre-v` : 420 ms, Y 8, +40 ms, six éléments au plus, une fois par session (au retour du plan : 220 ms d'opacité seule) |

### 5.5 L'accueil, « rien encore » (`maquettes/accueil-vivant.html?etat=vide`)
Mesures à 1440 × 900 ; zone utile sous la barre : 848 px.

```
barre du haut   transparente sur l'accueil (pas de bande, pas de filet) : la marque et ⋮ flottent sur la table
bloc central    centré à 46 % de la hauteur (centre optique), largeur 520 au plus
  pile          236 × 167 : trois feuilles — f3 #c9d3e6 rotate(−3,4°) translate(−8, 12), f2 #dfe6f3 rotate(2,2°) translate(7, 7), f1 blanche droite,
                coin 4 ; ombre 0 30px 60px −22px rgba(0,6,18,.85) ; une flaque de lumière dessous 440 × 110 rgba(120,162,255,.2)
                (à 1920 : 300 × 212 — width:clamp(220px,16.4vw,320px))
   ↕ 44 px
  titre         « Ouvrez votre retest » — --f-44 (40 px à 1440, 52 à 1920), 600, lh 1,1, −.032em, #f2f6ff
   ↕ 14 px
  chapeau       15 / 1,6, --t-table-2, 44 ch, trois lignes au plus :
                « Une ligne par câble, en Excel ou en CSV. Volta dessine les folios et vérifie chaque calibre, chaque contact, chaque câble. »
   ↕ 34 px
  gestes        44 px, coin 12, écart 12 : « Ouvrir un retest…  [Ctrl] [O] » plein clair #eef3fd (survol : −1 px, --halo-geste)
                │ « Nouvelle installation » au verre rgba(170,200,255,.08), filet rgba(170,200,255,.22)
   ↕ 18 px
  une ligne     13 px, icône 16 : « ou glissez-le n'importe où dans la fenêtre »
dock            centré, à 28 px du bas ; verre rgba(38,54,86,.72) + flou 18 px (ou opaque .94, même coût mesuré), coin 20, padding 8,
                filet inset 0 1px 0 rgba(255,255,255,.12) et anneau rgba(186,212,255,.22) ;
                deux tuiles de 56 px : [vignette 56 × 40] Exemple · démonstration, 6 folios │ [icône 40, coin 11] Base des contrats · déposer…
on retire       l'encadré pointillé, la phrase de la base (dans la bulle de sa tuile), l'intertitre « Pour essayer »
arrivée (une fois)  pile (k0) → titre (k1) → chapeau (k2) → gestes (k3) → ligne (k4) → dock (k5) :
                .entre-v (420 ms, Y 10, +40 ms) ; puis les deux fils de la vignette se tracent (640 ms, à +260 et +380 ms)
```

### 5.6 La bibliothèque pleine (`maquettes/accueil-pleine-1440.png`, `accueil-pleine-survol-carte-1440.png`)

```
tête         « Bibliothèque » --f-34 600 −.028em ; « 4 installations · 10 plans » 14 px --t-table-2 ;
             recherche 300 × 38 coin 12 ; « Nouvelle installation » 38 px (le geste clair)
Reprendre    le widget de verre (§ 3), 76 px, à 32 px sous la tête
intertitre   « Installations, par n° ECP » 13 / 500 + un filet --l-table jusqu'au bord ; le segment de tri à droite
cartes       grille 4 colonnes, écart 36 × 28 ; carte de 200 px, coin 14, padding 18 / 18 / 16 / 20 ; ECP 11 + 13 mono ;
             nom 17 / 600 −.016em ; méta 12 ; plans en Inter 12 / 500 avec une mini-feuille 12 × 9 ; l'état en pastille en haut à droite ;
             la pile réelle et son éventail au survol (§ 3)
Exemple      au trait, en dernier ; « 5 problèmes » en --t-table-ko
```

---

## 6. Le fond vivant : quoi bouge, à quelle vitesse, à quelle amplitude, à quel coût

Il est codé et mesuré dans `maquettes/accueil-vivant.html` (le script, en fin de fichier, est la spécification).

**Les couches**, de bas en haut (sous `#table`, fixées à l'écran) :

| couche | ce qu'elle est | ce qui bouge | vitesse, amplitude |
|---|---|---|---|
| `.ta-fond` | le dégradé d'aujourd'hui (la lumière du coin haut-droit à .30) | rien | — |
| `.ta-nappe.a` | ellipse de 120 × 90 vmax, `--nappe-a`, posée à (+18 vw, −22 vh) du centre | **dérive** en translation seule | ±4 vw et ±3 vh, périodes de **47 s** et **61 s** (premières entre elles : ne se répète jamais à l'œil) ; pointe à environ 7,7 px/s à 1440 |
| `.ta-nappe.b` | ellipse de 110 × 80 vmax, `--nappe-b`, à (−30 vw, +30 vh) ; elle **remplace le souffle** | dérive, et son opacité respire | ±4 vw et ±3 vh sur 61 et 47 s, déphasée ; opacité .55 ↔ 1 sur **24 s** |
| `.ta-points` | la trame de 24 px, **16 %**, en vignette (`--points-vignette`) | la parallaxe d'un dixième avec le plan (inchangée) | — |
| `.ta-lueur` | disque de 760 px, rgba(132,172,255,.15 → .05 → 0) | suit la souris par un ressort amorti critique | ω = 9 rad/s : posée en environ 0,5 s, sans dépassement ; s'arrête avec la main |
| `.ta-revele` | disque de 420 px : les **mêmes points à 55 %**, masqués en dégradé radial, recalés sur la grille (contre-translation modulo 24) | suit la lueur | — |
| `.ta-courant` | un trait de glace de 150 × 1,5 px et sa tête (point de 4,5 px, halo) | court le long d'une rangée de points | toutes les **14 à 22 s**, 360 à 580 px en **1,8 s** `cubic-bezier(.45,0,.25,1)` ; seulement dans les bandes libres (14 % du haut, 20 % du bas), jamais sous la composition, jamais deux à la fois |

**La conduite** :
- La dérive s'écrit à **15 Hz** (`setInterval`, pas `requestAnimationFrame`) : à quelques px/s, l'œil ne voit pas la différence avec 60 Hz.
- Elle se fait par `transform: translate3d` **seulement**, sans rotation.
- **Veille** :
  - à 90 s sans la main, la dérive ralentit jusqu'à l'arrêt en environ 2 s ;
  - un geste la relance en 1,2 s ;
  - page cachée : tout s'arrête.
- Pendant un geste sur le plan (glisser, molette, tenir un bloc) : la dérive attend, comme le souffle aujourd'hui (`.geste`).
- Sous une feuille qui prend la page (récapitulatif en page, base SEE) : nappes figées, lueur cachée (comme aujourd'hui).
- **`prefers-reduced-motion`** :
  - les nappes restent posées à t = 0 (même composition de lumière, immobile) ;
  - ni lueur, ni révélation, ni courant ;
  - la nappe B à opacité .75 fixe.

**Le coût**, mesuré sur cette machine : Chromium sans tête, **rendu logiciel sans GPU**, 1440 × 900, machine partagée. On compare des ordres de grandeur. Outil : `outils/cout.js`, CDP `Performance.getMetrics` et cadence de `requestAnimationFrame`.

| | fil principal, souris en mouvement | fil principal, au repos | image médiane | p95 |
|---|---|---|---|---|
| la table d'aujourd'hui (bibliothèque vide) | 8,6 % | **0,6 %** | 16,7 ms | 16,8 ms |
| la table vivante, accueil vide | 7,0 % | **2,0 %** | 16,7 ms | 33 ms |
| la table vivante, bibliothèque pleine | 10,7 % | **1,8 %** | 16,7 ms | 16,8 ms |
| *rejetée : trois nappes et rotation (±5°)* | 4,7 % | 1,9 % | **33 ms** | 67 ms |

- La rotation de calques plein écran fait tomber la cadence à 30 images/s en rendu logiciel. D'où la spécification : **deux nappes, translation seule**.
- Le flou du dock et le masque de vignette ne changent rien à la mesure.
- Avec GPU (le cas réel), déplacer deux calques déjà rastérisés est quasi gratuit.
- À valider par la batterie « audit de fluidité » du projet, qui a déjà mesuré le souffle.

---

## 7. Ce qui est déjà bien, et qu'il ne faut pas casser
- **L'identité « Nuit bleue »** : la table bleu nuit, la même dans les deux thèmes, la feuille blanche posée dessus avec son ombre profonde. Les palets de verre lisibles (97 %), sans noir sur noir.
- **Le menu ⋮** : le verre dense, les lignes de 34 px, les sous-menus en place, la bulle à gauche, les raccourcis à droite. C'est le plus « Apple » de l'outil.
- **Les jetons existent et sont employés** : 94 + 45 + 44 emplois des coins `--r-1`, `--r-btn`, `--r-2`, peu de littéraux, une chasse négative tenue sur les titres. Les **composants communs** (§ 4 de DESIGN) sont une vraie discipline.
- **Le focus sur un bloc** : le viseur en quatre coins, les autres blocs atténués, le fil de glace vers la carte. C'est l'idée la plus juste du plan.
- **Le cadran** lui-même : il se lit d'un coup d'œil (« 15 A », l'unité à sa taille), la charge en bleu d'instrument, la légende en mots.
- **Les hypothèses en réglages**, la **nomenclature** (les chiffres clés), la **feuille des raccourcis**, le **cartouche** sur papier : sobres et justes.
- **Le sombre** : feuilles et carte en encre bleue (#1a2640) cerclées de lumière ; tous les contrôles mesurés passent l'AA sur leurs fonds (sauf ceux du § 2, point 8).
- **La sobriété mesurée** : 0,6 % au repos, 60 images/s. Le mouvement réduit est respecté partout. La table vivante doit garder cette discipline (§ 6).
- **Le toast d'erreur** (verre teinté, filet rouge, il reste jusqu'au clic) et la règle « faire, puis Rétablir ».
