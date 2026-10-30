# Volta v74 — les cinq lots (le lecteur : « feu vert complet, on termine tout »)

Chaque lot : lis `docs/v74/BRIEF-COMMUN.md`, puis ta section. Les citations sont les mots du lecteur (oct. 2026).

## A — L'ACCUEIL ET LA TABLE VIVANTE (reprise de `origin/v73-pause-accueil`)
« Le fond est statique : ça doit un petit peu bouger. » « Comme l'écran d'accueil d'un iPhone. » « La beauté d'abord. »
- Fusionne la branche en pause, finis ce que `docs/v73/BRIEF-CORRECTIONS.md` (domaine A1) et le rapport
  `docs/v73/corrections/table-accueil.md` demandent, la maquette `docs/v73/maquettes/accueil-vivant.html` en tête.
- Un fond qui vit à peine (lent, calme, jamais une distraction ; le mouvement réduit l'arrête), un accueil et une
  bibliothèque qui donnent envie, nets à 1440 et 1920.
- Fichiers : `src/08-bibliotheque.js`, `src/08-table.js`, `src/style-bibliotheque.css`, `src/style-table.css`,
  `src/page.html` (l'accueil et la bibliothèque seulement), `tests/bibliotheque.js`, `tests/vitesse.js`.

## D — LE FOLIO, LA RECHERCHE, Ctrl+K (reprise de `origin/v73-pause-folio`)
- Fusionne la branche en pause ; finis ce que `docs/v73/corrections/folio.md` et le brief (domaine D) demandent : le
  folio lisible, l'objet trouvé qui pulse, la palette Ctrl+K (`ouvrirPalette`), les flèches.
- Ajoute à la palette « Comment Volta réfléchit » (la page du lot N, `ficheComprendre()` ; tant qu'elle n'existe pas,
  teste `typeof ficheComprendre === 'function'`).
- Fichiers : `src/06-dessin.js`, `src/07-folios.js`, `src/style-dessin.css`, `src/style-palette.css`, les sections
  recherche / palette / index / « aller à » de `src/08-interface.js` (et elles seules), `tests/dessin.js`,
  `tests/placement.js`, `tests/retouche.js`.

## E — LE RÉCAPITULATIF ET LES DOCUMENTS (reprise de `origin/v73-pause-documents`)
« Le récapitulatif : trop de données, l'œil se perd. Garde UNE place avec toutes les données — la base commune, le cœur
du process — mais mieux organisée, plus simple, plus fluide. Le rail de gauche, c'est bien. »
- Fusionne la branche en pause ; finis le domaine E du brief v73 et `docs/v73/corrections/documents.md`.
- Repense le récapitulatif pour l'œil : moins de colonnes d'office (l'essentiel d'abord, le reste derrière
  « Colonnes »), des groupes clairs, une hiérarchie qui se lit d'un regard, des onglets sobres, rien qui clignote.
  Toutes les données restent atteignables et modifiables. La croix (v74) reste.
- Fichiers : `src/08-recap.js`, `src/style-recap.css`, `src/08-export.js`, `src/08-pdf.js`, `src/08-pdf-dossier.js`,
  `src/08-nomenclature.js`, `src/style-pdf.css`, `src/style-nomen.css`, `src/style-export.css`, `src/style-fichiers.css`,
  `tests/documents.js` (s'il vient de la branche), la partie récapitulatif de `tests/interface.js`. Les retouches de la
  branche en pause à `style-normes.css`, `style-see.css`, `style-ref.css` : garde-les, n'en ajoute pas (le lot N les
  tient).

## F — LES FICHES : PRISE DE COUPURE, CÂBLE, CONTACTS, RÉFÉRENCE
- **La prise de coupure** : « le bordel total (EN 2997, puis EN 3646) : il faut organiser. Changer la référence marche
  mais pas fluide : je veux des RECOMMANDATIONS, les mêmes types, les contacts admissibles, ultra pensé pour un
  novice. Fiche mâle / femelle et raccord : très bien. Je veux le POURQUOI : pourquoi ce choix et pas les autres. »
  → une fiche rangée (la partie mobile et la fixe, une norme à la fois), « Changer » qui propose d'abord les
  références RECOMMANDÉES (même famille, même type, qui logent ces câbles), chacune avec ses contacts admissibles et
  sa raison ; les autres repliées avec la raison de leur rejet.
- **Le câble** : « un peu compliqué (“Tous tiennent”, l'italique, l'hypothèse 5 m). Câble et type, c'est bien.
  Intensité et chute, c'est bien mais pas présenté de façon fluide. » → plus simple, sans italique, l'hypothèse des 5 m
  dite une fois et clairement (« longueur supposée : 5 m, à écrire dans l'installation »).
- **La gauge d'une barrette ou d'un connecteur** : « cliquer sur la gauge doit aller au contact et à sa norme. » → un
  clic sur la gauge (ou le contact) d'une ligne de contacts ouvre le contact (sa référence, sa norme, sa table, sa
  source) ; « D'où vient chaque pièce » existe déjà, sers-t'en.
- **La référence d'un connecteur** : « un clic dessus doit ouvrir une fenêtre : la norme, pourquoi cette norme, où on
  l'a trouvée par rapport aux autres — quelqu'un de perdu doit tout retrouver. » → à côté du champ, un bouton qui
  ouvre ce récit (la chaîne de `traceConnecteur`, les familles voisines écartées et pourquoi).
- **Le raccord « manque »** : dis pourquoi (« aucune ligne de la table des raccords pour cette famille et cette
  classe ; la base SEE gardée sur ce PC la donne peut-être »), jamais un « manque » muet.
- Fichiers : `src/08-fiche.js`, `src/08-sections.js`, `src/08-modules.js`, `src/08-carte.js`, `src/style-fiche.css`,
  `src/style-sections.css`, `src/style-carte.css`, ajouts commentés dans `src/09-barrettes.js` / `src/09-raccords.js`,
  `tests/fiche.js`, `tests/barrettes.js`.

## N — LA BIBLE, LA BASE UNIQUE, « COMMENT VOLTA RÉFLÉCHIT »
- **La Bible** : « propre mais pas organisée de façon fluide ; les références, la nature et les bornes ne sont pas
  centrées ; le schéma est petit et pas carré ; “quelle norme, ça vient d'où”, pas ce que je veux. » → une grille
  alignée et centrée, le schéma grand et carré, l'origine dite simplement (une puce : vérifiée / à confirmer, la source
  dans sa bulle).
- **La base unique** : la Cohérence compte des lignes « seulement dans Volta » (photos des tables face à la base SEE) :
  rends ce compte CLIQUABLE — la liste des lignes, chacune avec sa raison (ce que la base n'a plus, ce que Volta a
  ajouté de ses sources) — pour que le lecteur décide. Prépare, sans l'activer, l'option « Ne prendre les pièces que
  dans la base SEE gardée » (une case des Hypothèses ou de la carte Normes, décochée).
- **« Comment Volta réfléchit »** : une page simple, pour un novice et le bureau d'études (« même le BE doit comprendre
  comment c'est fait, et pourquoi »), en français simple, avec des schémas : le cuisinier (l'installation = la
  commande, la base SEE = le catalogue, la physique = les recettes), la chaîne d'un connecteur (référence → famille →
  face → taille → contact), celle d'un disjoncteur (consommation → profil → courbe → calibre → câbles → chute), les
  routes, ce que veut dire « manque », comment vérifier. Accessible depuis le menu (Plus) et les « ? ».
  Expose `ficheComprendre()`.
- Fichiers : `src/08-normes.js`, `src/style-normes.css`, `src/08-see.js`, `src/08-see-import.js`, `src/style-see.css`,
  `src/08-explications.js`, un nouveau `src/08-comprendre.js` et `src/style-comprendre.css`, une ligne de menu dans
  `src/page.html` / `src/08-menu.js`, `tests/normes.js`, `tests/see.js`.
