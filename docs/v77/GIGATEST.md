# Volta v77 — le gigatest au bureau

Le but : faire tourner Volta sur une vraie installation, et rapporter tout ce qui coince **sans rien sortir de
confidentiel**. Volta a été préparé pour ça : il se parcourt lui-même, et il écrit un bilan où aucun nom du plan
n'apparaît.

## Avant
- Copier `Volta-v77.html` sur le PC du bureau.
- Ouvrir le fichier avec Chrome ou Edge à jour. Pas besoin de réseau.

## 1. Ouvrir la vraie installation
- Glisser le fichier Excel de l'installation sur la page, ou passer par ⋮ › Ouvrir.
- Ouvrir le fichier lui-même, pas un plan rouvert depuis la bibliothèque : c'est le seul moyen pour que le bilan dise
  quelles colonnes Volta a reconnues.

## 2. Lancer l'autotest (⋮ › Plus › Autotest du plan)
- Volta ouvre tout seul, dans cet ordre :
  - le contrôle ;
  - chaque onglet du récapitulatif ;
  - chaque document ;
  - chaque folio, avec chaque fiche, ses sections, ses listes « Changer » et « D'où elle vient » ;
  - chaque câble ;
  - enfin chaque export. Les exports sont fabriqués, mais **rien n'est enregistré sur le PC**.
- Il chronomètre tout et note chaque erreur : l'écran où elle s'est produite (« fiche d'un disjoncteur · folio 3 »), le
  message (les noms du plan sont masqués) et l'endroit dans le code de Volta.
- Ne touchez à rien pendant qu'il tourne. Comptez quelques minutes, 20 au plus.
- **Échap** l'arrête. Ce qui a déjà été vu reste noté, parce que ce qui concerne tout le plan passe en premier.

## 3. Travailler pour de vrai, avec le carnet (touche C)
- Menez l'installation jusqu'au bout : vérifier les fiches, corriger, exporter.
- À chaque hésitation, appuyez sur **C**, tapez ce qui vous arrête, puis **Entrée**.
- Volta note l'écran où vous étiez, jamais le repère.

## 4. Envoyer le bilan (⋮ › Plus › Bilan anonyme)
- Relisez le texte : c'est exactement ce qui partira.
- **Copier le bilan et le carnet**, puis collez-le dans la conversation.
- Ce qu'il contient :
  - les colonnes reconnues ;
  - les comptes (liaisons, repères, câbles, références inconnues par leur forme) ;
  - le contrôle ;
  - l'autotest (durées, erreurs, fiches non rendues, exports) ;
  - les erreurs de la page ;
  - vos notes.
- Ce qu'il ne contient jamais :
  - un repère, un part number, un numéro de câble ;
  - un harness, un dessin, un nom de fichier, de client ou de programme.

## 5. Si vous voulez montrer un écran
- Une capture n'est utile que si elle ne montre rien de confidentiel : un écran de Volta vide, une forme, une
  disposition.
- Sinon, décrivez-la en une phrase dans le carnet (C) : c'est souvent suffisant.

## Si Volta se fige
- Attendez une minute : le premier dessin d'un très gros folio peut être long.
- S'il reste figé, rechargez la page (F5), rouvrez le fichier, puis allez directement au bilan. Les erreurs de la page
  et les notes du carnet y sont gardées.

## Ce qui a été vérifié ici avant de vous l'envoyer
Le fichier `tests/pieges.js` fabrique, à partir de l'exemple de Volta, dix installations abîmées comme le sont les
vraies :
- cases vides ;
- doublons ;
- caractères bizarres ;
- nombres mal écrits ;
- références inconnues ;
- boucles ;
- en-têtes décalés ;
- CSV à virgules ;
- classeur à plusieurs feuilles ;
- plan géant de 3 000 liaisons.

L'autotest tourne sur chacune. Toute erreur, fiche non rendue ou export manqué fait échouer la batterie.
