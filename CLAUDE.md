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
- **Le courant d'un câble** (v84) : celui de ce qu'il alimente en aval quand la consommation est écrite ; sinon le courant
  total de son disjoncteur, et la fiche le dit. Un câble côté source (vers une batterie, une génératrice, un TR) n'est pas
  protégé par le disjoncteur qu'il nourrit.
- **Un disjoncteur, c'est mathématique : valide ou pas valide, point** (v80, le lecteur insiste : « je te l'ai dit plein
  de fois »). La courbe a une zone où il ne disjoncte pas et une zone où il disjoncte ; chaque point du profil tombe
  d'un côté ou de l'autre. **Aucune réserve, aucune marge, aucun « 10 % », aucun « trop juste »**. Le calibre retenu est
  le plus petit qui ne disjoncte pas. Ce qui s'explique : ce qu'il tire, pendant combien de temps, et le seuil où ce
  calibre disjoncte sur cette durée.
- **Le courant traverse un relais ou un interrupteur** (v86) : le contact est supposé fermé (le pire cas) et la fiche le dit
  (« à travers 103RL1, contact supposé fermé ») ; une bobine consomme, elle ne traverse pas. Une branche de commande sans
  consommation écrite dit « courant inconnu » et demande la consommation : jamais « Passer en DR16 » sur un fil de commande.
- **Le calibre écrit vient du fichier** (v86) : pas de « Manuel » sur le calibre ; seule la proposition justifiée de VOLTA
  (« Retenir le 7,5 A ») écrit, dans l'Excel corrigé.

## Les mots

- **VOLTA toujours en capitales.**
- Vocabulaire électrique : « disjoncte / ne disjoncte pas » (jamais « tient »), courant, calibre, borne, repère,
  connecteur, câble, contact à sertir.
- **Gauge** (son mot, pas « jauge ») ; **folio** (pas « planche ») ; « VOLTA » partout où l'on écrivait « l'outil ».
- **Chaque chiffre s'explique en clair** : de quoi il parle et ce qu'il change (« au démarrage il tire 9,31 A pendant
  5 s ; sur 5 s, un 7,5 A ne disjoncte qu'au-delà de 10,9 A : il ne disjoncte pas »).
- **Le nom des onglets dit ce qu'on y trouve** : « Fabrication » sonnait « usine » — c'est devenu « Pièces » (ce qu'il faut commander pour le monter).
- Un problème se dit simplement, avec ce qu'il faut faire.
- **« Votre fichier »** pour ce qui vient du lecteur ; **« l'Excel corrigé »** pour ce que VOLTA renvoie (v86) ;
  « installation » ne nomme plus que le classement de la bibliothèque (et la colonne Install de ses fichiers).
- **Un contact a un seul nom partout** (v86) : sur le plan, dans la fiche, le récapitulatif, la recherche, l'Excel corrigé —
  celui que porte la pièce (la lettre de la face, module + lettre pour une barrette, même ajoutée par VOLTA) ; une minuscule
  (51e) se souligne d'un trait fin.
- **Un statut ne montre pas un pourcentage qui demande « de quoi ? »** (v86, « 2 câbles · 80 % ») : le compte, ou l'état en
  mots (« 1 à régler ») ; le pourcentage vit dans le tableau, sous son titre.

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
  information pertinente. Pas de colonne pleine de tirets.
- **Ne pas surcharger** : ce que le dessin montre déjà, on ne le répète pas en phrase (« 3 contacts pris sur 8 » sous un
  module dessiné : de trop) ; une légende suffit.
- **Les tableaux sont homogènes** : chaque valeur centrée sous son titre quand c'est un chiffre ou un dessin, les colonnes
  réparties également, les écarts égaux (deux anneaux plus proches que le troisième, l'œil le voit tout de suite).
  Toutes les flèches d'une même colonne ont la même longueur et la même épaisseur.
- **Expliquer : 1, 2, 3** — une phrase simple par étape ; qui veut plus déplie l'étape et trouve tout, expliqué pour
  tout le monde.
- **Le mode sombre n'est pas tout noir** : les bandes et les en-têtes restent lisibles et vivants, rien ne se perd.
- **Moderne, pas statique** : l'accueil et les écrans doivent vivre, sans clignoter.
- **Les choix déjà tranchés** (v79) : le profil de charge d'un disjoncteur se lit en **tableau** (état, courant, durée sur une
  ligne), pas en cartes ; la courbe de déclenchement est « parfaite » — on n'y touche pas ; l'essentiel d'un équipement
  montre son **brochage dessiné** (ce qu'il relie), jamais un tableau de tirets ; un calibre s'explique en **ampères** (ce
  qu'il tire, pendant combien de temps, le seuil où il disjoncte sur cette durée — sans réserve ni pourcentage).
- **L'accueil et la bibliothèque** sont sur le **graphite** (noir chaud, cuivre) ; la table du plan aussi (v84) : **graphite
  chaud** la nuit, **l'aluminium, un gris neutre sans teinte,** le jour (v86 : le lin faisait « beige sur blanc » ; un fond teinté fausse le blanc du papier et les couleurs des fils), le folio blanc posé d'une ombre douce — plus de bleu nuit ; le cadre
  (barre du haut, rail, folios, menus) suit le thème : clair le jour, graphite la nuit.
- **L'accueil, à la manière d'Apple** (v80) : VOLTA seul, presque rien autour — plus de sur-titre ; le slogan garde la
  couleur cuivre ; un titre qui sort du lot (pas une écriture classique) ; le schéma vivant reste ; les gestes d'entrée
  (ouvrir, nouvelle, pour commencer) doivent être classe, dynamiques, « waouh ».
- **Reprendre un plan l'ouvre cadré**, comme le bouton de cadrage en bas à droite.
- **La synthèse (la carte d'un objet) tient sans défiler** et sa hauteur suit son contenu : ni ascenseur, ni grand vide
  dessous. Les problèmes et attentions ne s'empilent pas : une seule section compacte, qui se déplie (v82).
- **Ce qu'on modifie montre sa plus-value** : avant / après, ce que ça change, d'où vient l'info, pourquoi ce choix ; les
  gestes de modification se voient d'un coup d'œil (v82).
- **Une barrette ou une prise montre tous ses modules** (1, 2, 3… sous le nom du parent), même ceux posés sur d'autres
  folios ; une lettre de la face mène à son contact ; les liaisons d'un groupe se dessinent nettes, jamais floues (v82).
- **Le dessin d'un objet reprend la forme du plan** (la prise : grand rectangle et petit rectangle, comme sur le folio).
- « Pièces », c'est la **LPA** (liste de pré-approvisionnement) dans le jargon du lecteur.
- **Le mode sombre doit être beau et vivant**, pas seulement moins noir : de la couleur, de la lumière, des surfaces qui se
  distinguent (v83, le lecteur, excédé : « tout est sombre… c'est l'essentiel, c'est la beauté »).
- **La fenêtre agrandie se tire par ses coins et ses bords** : ne jamais retirer ce geste.
- **Une barrette montre ses groupes comme des ZONES** (la plage de métal commune), jamais des contacts reliés par un trait.
- **La prise : « partie mobile » et « partie fixe » vont de soi** — ne pas étiqueter « fiche / embase » sur le dessin ; dans
  les textes, ce sont ses mots (« partie mobile », « partie fixe »), jamais « fiche / embase » ; une lettre de la face mène à
  son câble.
- **Pas deux fois la même chose** : en grand, « module 2 de VT2 » se lit dans la section de la barrette, pas aussi en tête.
- **Ce que coûte un changement se chiffre** (« +21 g sur 5 m ») ; la LPA du plan entier s'exporte d'un clic depuis Pièces.
- **L'accueil** : du cadre du schéma, seule la ligne du haut (les numéros de colonne) reste, et s'efface vers les côtés :
  un schéma infini, pas un casier.
- **Modifier se lit sans défiler** : un sommaire, et chaque réglage s'ouvre sur place.
- **Les tableaux du récapitulatif** : le câble est porté par la flèche entre ses deux bouts ; l'état se dit en mots.
- **Les messages** (v84) : VOLTA parle de lui à la troisième personne (« VOLTA a lu 209 liaisons »), jamais « je » ; après un
  geste annulable, le message propose « Défaire ». La nomenclature s'appelle **LPA** partout.
- **Les routes** se distinguent par des teintes froides de catégorie, jamais rouge, ambre, vert ni fuchsia ; sur le plan, un
  bloc qui a un problème porte un bord rouge ou ambre (à l'écran seulement, jamais à l'export).
- **Modifier, trois sortes bien séparées** (v85) : **ce qui vient de votre fichier** (type, gauge, longueur, route, part
  number, calibre écrit) se lit sans saisie — « à changer dans votre fichier », une seule source ; seules les **propositions
  justifiées de VOLTA** (« Tout régler », « Passer en DR16 ») restent à un clic et vont dans l'Excel corrigé, qui devient le
  nouveau fichier ; **les choix de VOLTA** (module, raccord, contacts, arrangement) se règlent ici, en **Automatique / Manuel**
  bien visible ; **l'information** (calculs) se lit, sans geste.
- **Une barrette, c'est plusieurs modules** (v85) : sa fiche la dessine entière, les modules alignés sur leur rail comme la
  vraie pièce, chacun avec ses lettres ; une borne de barrette se dit comme dans ses fichiers, **module + lettre** (51B).
- **Sur le plan, rien n'est caché et rien ne bouge** (v86) : les bornes des équipements et des barrettes sont toujours là,
  fines comme sur le papier (au cadrage elles sont petites, on zoome pour lire) ; jamais un numéro qui grossit au dézoom ni
  qui glisse d'un zoom à l'autre ; une borne n'apparaît qu'une fois.
- **Une fiche qui s'ouvre sur un autre objet commence à L'essentiel** (pas sur l'onglet de l'objet d'avant).
- **Le dessin des folios montre où il en est** : chaque folio dit s'il est prêt.
- **Ce qui demande une action se voit d'abord** : un problème à régler a l'air d'une action (son geste en évidence) ; un point
  d'information reste calme.
- **Dans un tableau, une mesure a toujours son anneau** quand elle a une valeur : jamais l'un avec, l'autre sans.
- **Chaque genre se reconnaît d'un coup d'œil** (v86) : la carte porte la silhouette de l'objet (sa forme du plan) et dit sa
  nature quand le code la donne (« Relais », « Interrupteur », « Batterie ») ; un en-tête homogène, deux graisses, sans fond.
- **Le disjoncteur se lit vivant** (v86) : la conclusion d'abord, en ampères (« 10 A : il ne disjoncte pas ») ; le courant
  avance dans les barres ; le profil de charge s'écrit à côté de la courbe, qui bouge en direct ; ce que le graphique montre
  (« disjoncterait après 36 min »), on ne l'écrit pas.
- **Les problèmes d'une fiche disent l'essentiel en une phrase** (v86), même en grand ; le détail (d'où vient l'admis) se lit
  au survol — jamais la même explication répétée sept fois.

## La méthode

- **Regarder chaque écran soi-même avant de livrer** (clair et sombre, 1440 et 1920), lancer `tests/ecran/oeil.js` : le
  lecteur ne doit jamais avoir à signaler un alignement, une largeur, un texte coupé.
- **Poser les questions** quand un retour est ambigu (court, avec une proposition par défaut) ; pour un choix visuel ouvert,
  montrer deux ou trois variantes. Ne pas rester dans son coin.
- Carte blanche : proposer, dire non quand une demande va contre l'expérience (avec mieux à la place).
- **Répondre court** dans la conversation (v82, le lecteur : « trop à lire ») : les points importants seulement, ce
  qu'il doit savoir ; le détail seulement s'il le demande.
- Livrer avec la skill **`livrer-volta`** : le fichier `.html` envoyé directement (pas de ZIP) et un compte rendu en
  français, court, qui dit aussi ce qui reste.

## Où sont les choses

- `src/` (les modules `NN-*.js`, `page.html`, les styles `style*.css`) → `node construire.js` → `index.html`.
- La fiche : `08-fiche.js` (les constructeurs), `08-niveaux.js` (carte et grand), `08-vues.js` (les dessins),
  `style-niveaux.css`. Le récapitulatif : `08-recap.js`, `style-recap.css`. L'accueil : `08-bibliotheque.js`,
  `style-bibliotheque.css`, `08-table.js`, `style-table.css`.
- Les batteries : `tests/toutes.js` (`moteur`, `navigateur`), les fichiers piégés `tests/pieges.js`, les écrans
  `tests/ecran/` (`charge`, `fumee`, `captures`, `oeil`). Avec Playwright : `NODE_PATH=$(npm root -g)`.
