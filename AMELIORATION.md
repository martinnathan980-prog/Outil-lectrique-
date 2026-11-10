# VOLTA — l'amélioration continue

Décidée par le lecteur le 8 novembre 2026 : « une amélioration continue du site, de l'outil, avec plein d'agents
différents… la beauté (les couleurs, la forme, le texte, les graphiques) et de l'autre côté les fonctions, les calculs,
les outils ». Et, le même jour : « le secret, c'est poser des questions… pas une, deux, trois questions, mais tout le
temps des questions… si on fait à deux, on fera l'outil parfait ». Ce fichier dit comment chaque passe se fait ; il se lit
avec CLAUDE.md (la charte), qui a toujours le dernier mot.

## Ses choix

- **Rythme** : une passe complète tous les 3 jours, vers 3 h (heure de Paris) ; la première le 8 novembre 2026.
- **Un regard neuf qui regarde TOUT** : un agent qui ne connaît pas les passes d'avant, et qui regarde à chaque fois la
  beauté, les calculs, l'ergonomie, l'usage, l'expérience — pas un thème par passe.
- **Il corrige seul ce qui est sûr** : un bug, un calcul faux, un texte faux ou coupé, un écart à la charte, une incohérence.
- **Le reste se fait À DEUX** : le goût (graphisme, couleurs, formes, mise en page), l'expérience, les fonctions à ajouter,
  à retirer ou à fusionner. VOLTA présente des **planches** (avant / variantes) et pose **des questions, autant qu'il
  faut**, chacune avec sa proposition par défaut ; rien de cela ne s'applique sans le oui du lecteur.
- **Rien n'est acquis** : une passe peut tout remettre en cause, et tout reprendre de zéro si c'est mieux — la beauté, le
  calcul, l'expérience, le site entier.
- **Livraison** : seulement s'il y a du neuf — le fichier HTML, un compte rendu court, les planches et les questions. Une
  passe sans rien d'utile ne dit rien : elle s'écrit seulement au journal ci-dessous.

## Une passe

0. Lire CLAUDE.md, puis ce fichier : les questions en attente, les réponses du lecteur depuis la passe d'avant.
1. Se mettre à jour sur la branche de travail.
2. **Le regard neuf** : un agent sans mémoire des passes d'avant (il lit la charte, rien d'autre) utilise VOLTA de bout en
   bout et regarde tout. Chromium, clair et sombre, 1440 et 1920, le parcours du lecteur, un fichier abîmé, un gros
   fichier ; il recalcule lui-même des valeurs contre les normes. Il ne modifie rien. Il rend un rapport : le sûr à
   corriger, le goût et les fonctions avec leurs variantes et leurs planches, des questions, des idées.
3. **Trier** :
   - le **sûr** part à des agents qui corrigent, chacun sur ses fichiers, sans chevauchement. Sur un fichier partagé,
     l'outil Edit seulement ; aucune commande git ; un nom déclaré au niveau d'un module est d'abord cherché dans `src/` ;
   - le **goût** et les **fonctions** deviennent des planches et des questions au lecteur, écrites aussi plus bas ;
   - ce que le lecteur a accepté depuis la passe d'avant s'applique.
4. **Tout vérifier** avec la skill `livrer-volta` : construire, charger, fumée, œil, moteur, bornes fixes, fichiers piégés,
   captures relues.
5. **Livrer** s'il y a du neuf, sous la version suivante. Écrire la passe au journal, commiter, pousser la branche de
   travail ; `main` seulement quand toutes les batteries, interface comprise, sont vertes.

**Limites** :
- une passe de la taille de la v86 au plus ;
- confidentialité : jamais « SEE » ni un nom de client, de programme, d'appareil ou de personne dans une recherche ou dans
  le dépôt — l'IA interne du lecteur s'y dit « l'IA interne », son nom et son adresse restent dans son navigateur ;
- si les batteries restent rouges après deux essais, rien ne se livre, et le compte rendu dit pourquoi.

## Le grand chantier : lire tous les documents d'entrée (8 novembre 2026)

Le lecteur : « la donnée d'entrée sera plusieurs choses : un schéma PDF qu'il faudra lire et comprendre pour faire les
liaisons entre tous les fils ; pareil en Visio ; ou un document de centaines de pages avec les infos pin à pin, en
tableau, en texte ou en schéma ». VOLTA reconnaît ce qu'on lui donne, cherche l'information lui-même, et quand il ne
comprend pas, il appelle **l'IA interne** du lecteur (un modèle ouvert de la famille Gemma, moins puissant : autant de
requêtes qu'il faut, une nuit s'il le faut). En sortie : le schéma électrique (les folios) et **un tableau pin à pin** avec
toutes les données — pas forcément de rapport. Carte blanche, et des questions à chaque étape.

## Questions en attente

- **Ce que l'IA interne sait faire** : lire une image (les scans), la taille de ce qu'elle accepte — VOLTA le mesurera seul
  avec « Tester la connexion », sur le poste du lecteur.

## Réponses du lecteur

- 8 novembre 2026 : chute admise **2 V** (gardée) ; repère d'une barrette ajoutée : **la suite de la barrette voisine**
  (667VT3) ; interrupteur à bornes chiffrées : **toutes ses bornes reliées** ; un relais « aux bornes vides », ce sont des
  bornes **sans câble** (rien à changer : le courant ne va que là où il y a un câble).
- 8 novembre 2026, le grand chantier : VOLTA appelle **l'IA interne automatiquement** quand il bloque (exception à la
  charte, la seule) ; API **de type OpenAI** ; les documents qui arrivent : **schéma PDF, gros document, Visio** ; PDF
  **texte et scans** ; le gros document est surtout fait de **schémas dessinés** ; Visio en **.vsdx** ; sortie : **le format
  du retest** ; VOLTA **invente des documents d'exemple** et le lecteur corrige ce qui ne ressemble pas ; lecture longue
  **en journée, en fond** ; navigateur **Chrome** ; le lecteur veut **vérifier tout, liaison par liaison**, avant les
  folios et le retest.
- 8 novembre 2026, la vérification liaison par liaison (planches A, B, C) : **B, une à une** (les deux bouts en grand, la
  suivante qui arrive ; le surligneur de A sur la carte du folio, l'ordre connecteur par connecteur de C en option) ; une
  liaison douteuse se **choisit tout de suite** (1, 2, C ; Espace pour plus tard ; Entrée seule ne la passe pas) ; l'ordre
  **de la page** ; « **Ce qui reste noir** » (les traits lus dans aucune liaison) **obligatoire** avant les folios et le
  retest.
- 8 novembre 2026, passe 1 (les questions du regard neuf) : ses plus gros fichiers font **500 à 2 000 liaisons** ; une
  branche sans consommation écrite a un courant **inconnu**, la **protection toujours jugée** ; « à régler », c'est **ce
  qui a un geste**, partout ; la protection selon **la plus sévère** de l'AC 43.13-1B (table 11-3) et de l'EN 2853
  déclassée, dite.
- 8 novembre 2026, passe 1 (les planches du regard neuf) : P1, **une ligne par câble** dans les problèmes d'une fiche (ses
  raisons en puces, un geste, un « Tout régler » chiffré) ; P2, le fil entre un bloc et sa carte en **pointillé discret** ;
  P3, les groupes d'une barrette en **teintes froides** ; P5, le titre d'une fiche de câble **avec ses deux bouts**.
- 8 novembre 2026, passe 1 : le connecteur **d'accouplement** (côté harness) se **commande** ; les **obturateurs**
  comptés dans la LPA ; deux câbles sur une borne : **toujours une barrette** ; un folio presque vide : **un dessin plus
  grand** sur la feuille (fait en v87 : tout grandit, à l'écran comme à l'impression).
- 8 novembre 2026, passe 1 : les disjoncteurs se jugent à **125 °C** (gardé) ; **une seule ambiante** pour tout le plan
  (gardée) ; dans une prise, **la lettre répond toujours à la même lettre** (G face à G : VOLTA signale tout écart) ; un
  connecteur fourni : **l'arrangement se lit dans sa référence**, sinon « déduit des bornes, à vérifier ».
- 8 novembre 2026, passe 1 : « Comment VOLTA réfléchit » devient **un schéma sobre** (plus de cuisinier) ; la pastille
  « VOLTA peaufine encore… » **se tait** ; Alt+← ramène **la fiche d'avant, d'où qu'elle vienne** ; le **Suivi de
  fabrication entre dans la LPA** (un onglet).
- 9 novembre 2026, à la livraison de la v87 : un **connecteur d'accouplement inconnu se déduit** du connecteur fourni
  (même série, même arrangement, l'autre sexe), marqué « à vérifier » (**à faire**, passe 2) ; un fil de commande mal
  protégé **reste « à voir »** (sans geste, la phrase dit les deux voies) ; les groupes d'une barrette gardent **huit
  teintes** ; la page inventée ressemble « **à peu près** » à ses schémas — ce qui diffère est demandé.
- 10 novembre 2026, après l'état des lieux — **carte blanche sur tout** : le courant supposé disparaît (« l'outil dit la
  vérité, pas inventé ») ; les données sont provisoires jusqu'à son classeur ; la lecture des vrais documents, la sauvegarde
  d'ensemble, les batteries de l'interface, le fil conducteur, le menu : **à faire** ; les mots : **Installation › Plan ›
  Folio** ; les scans : **par l'IA interne** ; les folios : **les nôtres**, les plus propres et les plus vrais (on ne copie
  pas ses schémas, il y en a de toutes les formes) ; les idées pour demain : toutes retenues, **« comparer deux indices »
  en premier**, puis le plan vivant, la fiche d'atelier, le bilan électrique, la vue d'ensemble.

## La mesure de la lecture des documents (passe 1, documents inventés, `node tests/lecture-documents.js`)

| Document | Au début de la passe 1 | À la fin de la passe 1 (v87) | Quand VOLTA dit « sûr », il a raison |
|---|---|---|---|
| A, schéma PDF vectoriel (8 folios) | 65 / 104 (63 %) | **104 / 104 (100 %)** | 100 % (102 sur 102) |
| C, le même en Visio | 71 / 104 (68 %) | **104 / 104 (100 %)** | 100 % (87 sur 87) |
| D, dossier de 300 pages | 1 701 / 3 752 (45 %) | **3 520 / 3 733 (94 %)** | 100 % (3 327 sur 3 327) |
| B et E, scans | 0 (pas d'OCR) | 0 (pas d'OCR) | — |

En tout, hors scans : **3 728 liaisons justes sur 3 941 (95 %)**, et jamais une fausse dite « sûre ». Ce qui manque dans D :
les **tableaux** (210 liaisons sur 6 pages), les **phrases** des notes (3), un renvoi vers un autre plan (1). Les scans
attendent l'OCR ou l'IA interne (simulée, une page qui doute lui est confiée : B 100 %, E 84 %).

Les causes du début, dans l'ordre (réglées en passe 1) : les barrettes (module + lettre), les renvois entre folios, des
symboles lus comme des fils, les boîtes en tirets, les masses en râteau, les cartouches en anglais.

**La forme de ses vrais schémas** (le lecteur, 8 novembre 2026) : des numéros de fil **parfois** ; un renvoi s'écrit **folio
et zone** (« F5/C3 ») ; une barrette se dessine en **pastilles sur un pointillé** ; le folio **recommence à 1 à chaque plan** ;
les relais et les disjoncteurs ont **leur symbole dessiné dans la boîte** ; des masses **à trois barres** ; des boîtes
**pleines** ; des cartouches **en français** ; des scans **de toute qualité**. Les documents inventés se refont à cette forme.

## L'état des lieux du 9 novembre 2026 (demandé par le lecteur, après la v87 : tout le site regardé, clair et sombre)

**Très bien, à garder** : la fiche (carte puis grand), le disjoncteur vivant, l'Historique avant / après avec « Défaire »,
« Ce qui part dans l'Excel », la recherche, la bible aux faces dessinées, le mode sombre, l'accueil ; l'ouverture en 0,8 s,
3 345 liaisons et 90 folios lus en 1,4 s sans figer.

**Ce qui ne va vraiment pas** (à décider à deux, dans cet ordre) :
1. VOLTA invente encore un courant : un câble sans disjoncteur en amont vaut « 2 A supposé » (Hypothèses), et sur cette
   base « Passer en DR18 » se propose pour un DR12 (300XC1:B5) — une gauge plus fine sur un courant inventé, contre la
   règle du 8 novembre (« inconnu »). Proposé : plus d'hypothèse de courant ; jamais de gauge plus fine sans courant connu.
2. Les données : 999 lignes des normes sur 3 981 sont « à confirmer », 53 accouplements inconnus — la LPA ne se commande
   pas les yeux fermés. Proposé : ses catalogues importés sur son poste ; chaque résultat dit s'il repose sur du confirmé.
3. Le grand chantier n'est pas encore utilisable sur ses vrais documents (scans, tableaux, écran de vérification B), et il
   est caché : l'accueil dit « votre Excel », le PDF et le Visio sont dans ⋮ › Plus.
4. Aucune sauvegarde d'ensemble : plans, base, normes importées vivent dans le navigateur. Proposé : « Tout sauvegarder /
   tout restaurer », un fichier.
5. Les batteries de l'interface sont rouges depuis plusieurs versions : les écrans changent sans filet.

**L'expérience, à améliorer** : trop de mots pour une même chose (installation, plan, contrat, harness, fichier, base,
bible) ; le menu « Plus », quatorze lignes en vrac ; pas de fil conducteur après l'ouverture (proposé : un mode « Revue »,
un point à la fois, Entrée accepte, jusqu'à « prêt à exporter ») ; les folios pas encore à la forme de ses schémas (symbole
dans la boîte d'un relais, masse à trois barres, renvoi « F5/C3 ») ; les tableaux en pleine page tassés à gauche ; sur un
folio dense zoomé, le type du câble ne se lit plus (proposé : un survol) ; « Ce qu'il consomme » en Automatique / Manuel ;
le dessin en haut de la feuille ; VOLTA ne montre pas sa version ; du jargon interne dans les notes des normes
(« recherche R3 ») ; un folio dense met 4 s à paraître ; le repos à mesurer sur son poste.

**Les idées pour demain** : comparer deux indices d'un fichier (les évolutions, sur le folio) ; le plan vivant (ouvrir un
disjoncteur, fermer un relais, « si ce câble casse ») ; la fiche d'atelier par connecteur (face, brochage, contacts, outil) ;
le bilan électrique par disjoncteur ; la vue d'ensemble d'une installation ; la planche à clous ; apprendre du déjà-fait ;
« Demander à VOLTA » avec l'IA interne ; un mode atelier ; les étiquettes. À ne pas faire : la 3D, le travail en ligne à
plusieurs, modifier le câblage dans VOLTA (le retest reste la source).

## Journal des passes

- **8 novembre 2026 — v86** (passe manuelle, quatorze agents) : l'aluminium, les bornes fixes, la carte et les genres,
  le disjoncteur vivant, un contact un nom, le courant à travers les relais, une seule source, l'historique du plan.
- **8-9 novembre 2026 — passe 1 → v87** (le premier regard neuf, dix agents) : les mots du lecteur partout (« à régler »,
  « votre fichier », « l'Excel corrigé », plus de cuisinier) ; le courant inconnu sans consommation et la protection
  toujours jugée ; une ligne par câble dans les problèmes ; la LPA = la somme des fiches (accouplements, obturateurs,
  prises, Suivi) ; les teintes froides des groupes, le pointillé de la carte, le câble dit par ses deux bouts ; l'IA
  interne (réglage, test, file d'attente) ; la lecture des documents de 63 / 68 / 45 % à 100 / 100 / 94 %. Reste : les
  scans (OCR ou IA), les tableaux des PDF, l'écran de vérification B, les batteries de l'interface à valider.
- **10 novembre 2026 — v88** (carte blanche après l'état des lieux) : **plus aucun courant supposé** (sans consommation
  écrite, le courant et la chute sont inconnus ; jamais de gauge plus fine proposée sans courant connu) ; **Tout
  sauvegarder / tout restaurer** (un fichier `.volta`, sans les réglages de l'IA interne) ; le **menu rangé** (Réglages,
  Aide, la version visible ; plus de « Plus ») ; les mots **Installation › Plan › Folio** ; **la Revue** (un point à la
  fois, touche V, proposée à l'ouverture) ; l'accueil dit Excel, PDF ou Visio. Vérifié : charge, fumée, œil (clair et
  sombre, 1440 et 1920), moteur 9 / 9, pièges 11 / 11, IA 53 / 53. Reste : les batteries de l'interface (elles parlent
  encore de l'ancien menu et des anciens mots), « Ce qu'il consomme » en champ simple, les tableaux pleine page ; puis
  **comparer deux indices** (v89), les scans par l'IA interne, l'écran de vérification B.

- **10 novembre 2026 — v89, les batteries au vert** (le lecteur : « les tests automatiques sont rouges depuis plusieurs
  versions, faut corriger »). Les vingt-deux batteries du navigateur repassent, réécrites là où elles jugeaient un écran
  disparu (le cadran, « À la main », le menu « Plus », les numéros de câble, la marge de 10 %, le courant prêté à chaque
  câble) : `disjoncteur`, `documents`, `fiche`, `couverture`, `ux` d'après la charte ; les autres mises aux mots et aux
  gestes d'aujourd'hui. **Ce qu'elles ont fait corriger dans VOLTA** : P qui passait d'abord par ce qui est « à voir » ;
  des symboles de disjoncteur pris pour des câbles orphelins dans un PDF ; un message d'erreur effacé trop tôt ; une saisie
  de profil sans son « Défaire » (après un calibre qui change) ; la bulle « celui de votre fichier » sur un calibre que
  VOLTA venait d'écrire, et le part number de VOLTA nommé « votre fichier » ; « Raccourcis » et « Noter une hésitation » qui
  ne rendaient pas le clavier ; **un tiers de cœur brûlé au repos** (le filet cuivre de la barre du haut : 31 % → 9 %) ; le
  panneau Repères posé sur les folios 2 à 6 ; la palette et les raccourcis qui laissaient le clavier filer derrière eux ;
  « A · B · C » rogné sur la carte d'un équipement ; des encres, des bords de champ et des anneaux de clavier sous les
  seuils (une feuille : `style-zz-ergonome.css`) ; deux raccourcis d'un cadran qui n'existe plus. Reste : comparer deux
  indices, les scans par l'IA interne, l'écran de vérification B, le connecteur d'accouplement déduit « à vérifier »,
  « Ce qu'il consomme » en champ simple.

### 10 novembre 2026 — v90, « Nouvel indice de ce plan » (comparer deux indices)

- Le lecteur : « chaque crédit doit être ultra efficient » — plus de batteries longues en cours de route (charte) ; la passe
  automatique est en pause.
- **Fait** : ⋮ › « Nouvel indice de ce plan… ». On donne l'indice suivant du fichier ; VOLTA dit ce qui a changé (ajoutées,
  retirées, changées, rebranchées, équipements nouveaux ou disparus), puis « Passer à cet indice » remplace les liaisons en
  gardant le travail (retouches, choix, consommations, cartouche) ; « Défaire » revient. Moteur : `09-indices.js`,
  batterie `tests/indices.js` (10 contrôles). Écran : `08-nouvel-indice.js`, `style-zz-indices.css`.
- **Vérifié seulement** : la batterie du moteur, et l'écran regardé en clair et en sombre à 1440 sur l'exemple.
- **À faire à la toute fin** : les 22 batteries navigateur, l'œil sur tous les écrans, puis `main`.
- **À voir avec le lecteur** : montrer aussi les changements sur le plan (les liaisons ajoutées allumées) ; un fichier à
  plusieurs harness prend celui du plan ; une barrette posée par VOLTA absente du nouveau fichier est reproposée.

### 10 novembre 2026 — v91 à v93, les idées du lecteur (« on continue toutes les fonctions »)

- **v91 — Bilan électrique** (⋮ › Bilan électrique, `08-sources.js`) : les disjoncteurs sous leur source, calibre, ce qu'ils
  tirent, ce qu'ils alimentent ; une consommation non écrite reste inconnue, nommée, et un clic mène à l'équipement.
- **v91 — Fiche d'atelier** (onglet Pièces › « Fiche d'atelier », `08-papier-atelier.js`) : L'essentiel et Pièces de l'objet
  imprimés sur une A4, en clair, avec le plan, l'indice et la date. Ce que dit l'écran, rien de réécrit.
- **v92 — Plan vivant** (⋮ › Plan vivant, `08-vivant.js`) : tout fermé au départ ; un clic ouvre un disjoncteur, un relais,
  un interrupteur, ou coupe un câble ; ce qui n'est plus alimenté se voit et se dit sur tout le plan. Rien n'est écrit.
- **v93 — Vue d'ensemble d'une installation** (bibliothèque › une installation de 2 plans ou plus, `08-vue-ensemble.js`) :
  les chiffres, la carte des plans reliés par les équipements qu'ils partagent, la liste de ces équipements.
- **Vérifié seulement** : chaque écran regardé une fois sur l'exemple (1440, clair ou sombre), le trajet joué à la sonde.
  Aucune batterie longue (charte : à la toute fin).
- **Reste** : lire les vrais documents (scans par l'IA interne, tableaux des PDF) — attend un essai du lecteur sur son
  poste ; « nos folios à nous » (planches) ; le classeur de données ; la passe complète des tests, puis `main`.
- **À voir avec le lecteur** : plan vivant — partir « tout fermé » (le pire cas) ou « relais au repos » ? ; fiche d'atelier —
  faut-il l'outil de sertissage sur la feuille ? ; bilan — un export Excel ?

### 10 novembre 2026 — v94 et v95, « on continue avec tes recommandations »

- **v94** : sous chaque contact à sertir, son outillage (pince, positionneur, insertion, extraction — table des outillages),
  à l'écran et sur la fiche d'atelier ; le bilan électrique s'enregistre en Excel ; le plan vivant ferme la fiche ouverte
  en entrant (elle couvrait les câbles) — couper un câble d'un clic est vérifié. Le plan vivant reste « tout fermé ».
- **v95** : le connecteur d'accouplement que la bible ne donne pas est DÉDUIT du connecteur fourni (charte du 9 novembre) —
  seulement pour les familles dont VOLTA lit la codification (EN 2997, EN 3645, EN 3646, E0053 → E0052) : l'embase devient
  la prise mobile, l'autre sexe, « déduit de …, à vérifier » ; les autres restent « manque dans la bible ». Les évolutions
  d'un nouvel indice se voient SUR LE FOLIO : halo cuivre sur chaque câble ajouté, changé ou rebranché, et un bandeau qui
  nomme les folios concernés (« Effacer les marques »).
- **Vérifié seulement** : les sondes de chaque geste sur l'exemple ; la déduction sur neuf part numbers d'essai (l'exemple
  n'en porte aucun de ces familles : à voir sur un vrai fichier).
- **Reste** : lire les vrais documents (essai du lecteur) ; « nos folios à nous » (planches) ; le classeur de données ; la
  passe complète des tests, puis `main`.
