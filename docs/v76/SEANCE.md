# Volta v76 — la séance sur une vraie installation

Le but : que Volta tourne enfin sur un vrai fichier, et que celui qui le construit voie ce qui coince, sans jamais voir
une donnée confidentielle.

## Pendant le travail : le carnet (touche **C**)
- Ouvrez une vraie installation et menez-la jusqu'au bout : la lire, vérifier les fiches, corriger, exporter.
- À chaque hésitation, même minime, appuyez sur **C** : une petite barre s'ouvre en bas.
- Tapez ce qui vous arrête (« je ne savais pas où cliquer », « ce chiffre me paraît faux », « il manque… »), puis
  **Entrée**.
- Volta note l'écran où vous étiez (« fiche d'un disjoncteur · folio 3 »), jamais le repère.
- Les notes restent sur ce PC. Rien ne part tout seul.

## À la fin : le bilan anonyme (⋮ › Plus › Bilan anonyme)
- Il dit, en chiffres, ce que Volta a lu et jugé du plan ouvert :
  - les colonnes reconnues et celles qu'il ne connaît pas ;
  - les liaisons, les repères, les câbles ;
  - les références et types inconnus, par leur forme (lettres → A, chiffres → 9) ;
  - les contacts trouvés ou non ;
  - les disjoncteurs ;
  - les points du contrôle ;
  - la base SEE ;
  - les réglages changés ;
  - les erreurs de la page ;
  - puis vos notes.
- Ce qui est masqué : tout nom du plan (repère, part number, numéro de câble, harness, dessin, nom du fichier) devient
  ‹repère›, ‹référence›, ‹câble› ou ‹nom›, y compris dans vos notes.
- Relisez le texte à l'écran : c'est exactement ce qui partira.
- **Copier le bilan et le carnet**, puis collez-le dans la conversation. Ou **Enregistrer en .txt**.

Pour que le bilan dise les colonnes du fichier, ouvrez le fichier dans la même session (un plan rouvert depuis la
bibliothèque n'a plus sa lecture).

## Ce qui est vérifié
`tests/bilan.js` rejoue l'exemple comme un vrai fichier et vérifie qu'aucun des 304 noms du plan ne paraît dans le
texte copié, ni dans une erreur de page, ni dans une note.
