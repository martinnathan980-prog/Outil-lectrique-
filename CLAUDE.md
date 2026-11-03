# VOLTA — la charte (lue au début de chaque séance)

Ce fichier dit **ce que le lecteur veut, une fois pour toutes**. Il passe avant `PROMPT.md`, `DESIGN.md` et `REFONTE.md`
(plus anciens : quand ils le contredisent, c'est ce fichier qui a raison). Chaque nouvelle règle donnée par le lecteur
s'écrit ici, le jour même.

## Qui, quoi

- **VOLTA** : outil de câblage électrique aéronautique, hors ligne, un seul fichier HTML. Un retest Excel entre ; des
  folios dessinés, des fiches qui expliquent, un récapitulatif, des exports sortent.
- **Le lecteur** : ingénieur câblage, français. On le **tutoie** dans la conversation ; l'interface **vouvoie**. Il connaît
  le câblage, pas forcément le code : on lui parle simplement.
- Il juge à l'œil, sur ordinateur (1440 et 1920 px, clair et sombre). Il cherche **la perfection** : « classe, épuré,
  fluide, compréhensible, waouh — mais pas m'as-tu-vu ».

## Contraintes absolues

- **100 % hors ligne**, aucun appel réseau, polices embarquées seulement (Inter, JetBrains Mono, IBM Plex symboles).
- **Confidentialité** : ses vrais fichiers ne quittent jamais son poste, ne sont jamais dans le dépôt ni dans une
  recherche. Jamais de nom de client, de programme, d'appareil, de personne dans le dépôt ; jamais « SEE » ni ces noms
  dans une recherche web. On travaille sur le contrat d'exemple et les fichiers piégés.
- **Tout en français** : interface, code, commentaires, commits.
- `index.html` se construit (`node construire.js`), ne se modifie jamais à la main.
- Aucun identifiant de modèle d'IA dans le dépôt. Commits terminés par les lignes d'attribution demandées par la séance.
- Pas de pull request sans demande. On pousse la branche de travail ; `main` seulement quand toutes les batteries sont
  vertes.
- Ne jamais lancer `pkill -f "tests/"` (il tue son propre shell).

## Les vérités du métier (ne pas les réinventer)

- **Le retest est la source dure.** Repères, numéros de borne, qui va où : VOLTA ne les change jamais. Pour changer un
  nom, le lecteur change son fichier de base — **tout au même endroit**. Donc : **pas de champ « nom en clair »** ni
  d'autre saisie qui doublerait le fichier.
- **Tout est automatique, tout est modifiable** — sauf la source. On peut tout **déplacer** sur le plan (équipements,
  bornes dans leur connecteur, connecteurs, fils) ; ce que VOLTA ajoute (barrette, prise de coupure, relais, diode) est
  marqué comme ajouté et se retrouve dans l'Historique.
- **Les câbles n'ont plus de numéro** (les W-xxx sont faits plus tard, dans un autre logiciel). Un câble se dit par son
  type (DR12) et ses deux bouts. La donnée du fichier reste intacte à l'export.
- **Les connecteurs des équipements sont fournis par le fournisseur.** Nous choisissons : barrettes, prises de coupure,
  relais, raccords, tyraps, contacts à sertir.
- Un fichier peut donner un **calibre** ; VOLTA peut le contester s'il le justifie (« actuel : celui de votre fichier »).

## Les mots

- **VOLTA toujours en capitales.**
- Vocabulaire électrique : « disjoncte / ne disjoncte pas » (jamais « tient »), courant, calibre, borne, repère,
  connecteur, câble, contact à sertir.
- **Gauge** (son mot, pas « jauge ») ; **folio** (pas « planche ») ; « VOLTA » partout où l'on écrivait « l'outil ».
- **Chaque chiffre s'explique en clair.** Jamais « 10 % de marge » sans dire de quoi et ce que ça change : « VOLTA veut
  que le courant reste au moins 10 % sous la courbe ; ici il n'en est qu'à 4 %, il pourrait disjoncter ».
- Un problème se dit simplement, avec ce qu'il faut faire.

## L'œil humain (la vraie différence)

- **Hiérarchie évidente, presque inconsciente** : le titre, puis l'information clé, puis le détail. L'œil sépare d'instinct
  le titre, la référence, les chiffres clés, les problèmes.
- **Les sections se voient toujours** : un titre net, de l'air, une séparation. Jamais de « gros pavés » où l'on se perd.
- **Les barres d'onglets ressortent du contenu**, et **tous les onglets d'une barre ont la même largeur**.
- Peu de variations de police, de graisse et de taille ; tout bien réparti, aligné, centré quand il le faut.
- **Couleurs** : classe, jamais fuchsia, pas de bleu sur bleu, pas de noir sur noir. Les fiches sont du papier neutre
  (blanc pierre le jour, graphite la nuit) ; un seul accent, le **cuivre** ; rouge, ambre, vert ne disent que l'état ; le
  rouge d'un problème est franc mais pas criard.
- **Les micro-détails interactifs** (le symbole en filigrane qui s'éveille, une étape qui mène à la courbe, un survol qui
  explique) : c'est la signature de VOLTA. On en met, avec goût.
- **Jamais de bloc vide ou sans sens** : pas de dessin quand il n'y a rien à dessiner, pas de « aucun … » — rien, ou une
  information pertinente.
- **Moderne, pas statique** : l'accueil et les écrans doivent vivre, sans clignoter.
- **Les choix déjà tranchés** (v79) : le profil de charge d'un disjoncteur se lit en **tableau** (état, courant, durée sur une
  ligne), pas en cartes ; la courbe de déclenchement est « parfaite » — on n'y touche pas ; l'essentiel d'un équipement
  montre son **brochage dessiné** (ce qu'il relie), jamais un tableau de tirets ; un calibre s'explique en **ampères** (ce
  qu'il tire, le seuil où il disjoncte sur cette durée, la réserve, les 10 % exigés).
- **L'accueil et la bibliothèque** sont sur le **graphite** (noir chaud, cuivre) ; le plan garde sa table bleu nuit tant que
  le lecteur ne dit pas le contraire.

## La méthode

- **Regarder chaque écran soi-même avant de livrer** (clair et sombre, 1440 et 1920), lancer `tests/ecran/oeil.js` : le
  lecteur ne doit jamais avoir à signaler un alignement, une largeur, un texte coupé.
- **Poser les questions** quand un retour est ambigu (court, avec une proposition par défaut) ; pour un choix visuel ouvert,
  montrer deux ou trois variantes. Ne pas rester dans son coin.
- Carte blanche : proposer, dire non quand une demande va contre l'expérience (avec mieux à la place).
- Livrer avec la skill **`livrer-volta`** : le fichier `.html` envoyé directement (pas de ZIP) et un compte rendu en
  français, court, qui dit aussi ce qui reste.

## Où sont les choses

- `src/` (les modules `NN-*.js`, `page.html`, les styles `style*.css`) → `node construire.js` → `index.html`.
- La fiche : `08-fiche.js` (les constructeurs), `08-niveaux.js` (carte et grand), `08-vues.js` (les dessins),
  `style-niveaux.css`. Le récapitulatif : `08-recap.js`, `style-recap.css`. L'accueil : `08-bibliotheque.js`,
  `style-bibliotheque.css`, `08-table.js`, `style-table.css`.
- Les batteries : `tests/toutes.js` (`moteur`, `navigateur`), les fichiers piégés `tests/pieges.js`, les écrans
  `tests/ecran/` (`charge`, `fumee`, `captures`, `oeil`). Avec Playwright : `NODE_PATH=$(npm root -g)`.
