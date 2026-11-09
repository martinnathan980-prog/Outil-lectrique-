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

## Journal des passes

- **8 novembre 2026 — v86** (passe manuelle, quatorze agents) : l'aluminium, les bornes fixes, la carte et les genres,
  le disjoncteur vivant, un contact un nom, le courant à travers les relais, une seule source, l'historique du plan.
- **8-9 novembre 2026 — passe 1 → v87** (le premier regard neuf, dix agents) : les mots du lecteur partout (« à régler »,
  « votre fichier », « l'Excel corrigé », plus de cuisinier) ; le courant inconnu sans consommation et la protection
  toujours jugée ; une ligne par câble dans les problèmes ; la LPA = la somme des fiches (accouplements, obturateurs,
  prises, Suivi) ; les teintes froides des groupes, le pointillé de la carte, le câble dit par ses deux bouts ; l'IA
  interne (réglage, test, file d'attente) ; la lecture des documents de 63 / 68 / 45 % à 100 / 100 / 94 %. Reste : les
  scans (OCR ou IA), les tableaux des PDF, l'écran de vérification B, les batteries de l'interface à valider.
