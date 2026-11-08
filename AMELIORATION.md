# VOLTA — l'amélioration continue

Décidée par le lecteur le 8 novembre 2026 : « une amélioration continue du site, de l'outil, avec plein d'agents
différents… la beauté (les couleurs, la forme, le texte, les graphiques) et de l'autre côté les fonctions, les calculs,
les outils… en posant beaucoup de questions, car c'est ça la clé du succès ». Ce fichier dit comment chaque passe se fait ;
il se lit avec CLAUDE.md (la charte), qui a toujours le dernier mot.

## Ses choix

- **Rythme** : tous les 3 jours, vers 3 h (heure de Paris), une passe complète.
- **Autonomie** : VOLTA corrige seul ce qui est **sûr** — un bug, un calcul faux, un texte coupé, un écart à la charte,
  une incohérence entre deux écrans, une batterie rouge. Ce qui touche au **goût** (couleurs, formes, mise en page, un mot
  qui change le sens) et toute **fonction** à ajouter, à retirer ou à fusionner : préparé avec des variantes, appliqué
  seulement sur son oui.
- **Livraison** : seulement s'il y a du neuf — le fichier HTML et un compte rendu de cinq lignes au plus, avec au plus
  trois questions, chacune avec sa proposition par défaut. Une passe sans rien d'utile ne dit rien : elle s'écrit seulement
  au journal ci-dessous.
- **Sans réponse**, une question reste en attente : sa proposition n'est pas appliquée.

## Le thème qui tourne

1. **La beauté** : couleurs, lumière, formes, hiérarchie, clair et sombre, 1440 et 1920.
2. **Les mots** : chaque phrase, chaque bulle, chaque chiffre expliqué ; le vocabulaire de la charte.
3. **Les calculs** : disjoncteurs, courants, chutes, contacts, barrettes, LPA — contre les normes et le bon sens d'un
   ingénieur câblage.
4. **Les fonctions et les parcours** : ce qui manque, ce qui ne sert à rien, les doublons, les gestes qui surprennent.
5. **La robustesse** : fichiers abîmés, gros fichiers, vitesse, exports, clavier.

Chaque passe fait aussi le tour complet du site, comme le lecteur, quel que soit son thème.

## Une passe

0. Lire CLAUDE.md, puis ce fichier : le thème suivant, les questions en attente, les réponses du lecteur.
1. Se mettre à jour sur la branche de travail.
2. **Le regard neuf** : un agent sans mémoire des passes d'avant utilise VOLTA de bout en bout, sur le thème de la passe
   et sur tout le reste. Comme l'audit de la v86 : Chromium, clair et sombre, 1440 et 1920, le parcours du lecteur, un
   fichier piégé. Il ne modifie rien et rend un rapport classé (bloquant, gênant, finition, ce qui manque) avec ses captures.
3. **Trier** :
   - le **sûr** part à des agents qui corrigent, chacun sur ses fichiers, sans chevauchement. Sur un fichier partagé,
     l'outil Edit seulement ; aucune commande git ; un nom déclaré au niveau d'un module est d'abord cherché dans `src/` ;
   - le **goût** et les **fonctions** deviennent des propositions avec leurs variantes (une planche), écrites plus bas dans
     les questions en attente ;
   - les propositions que le lecteur a acceptées depuis la passe d'avant s'appliquent.
4. **Tout vérifier** avec la skill `livrer-volta` : construire, charger, fumée, œil, moteur, bornes fixes, fichiers piégés,
   captures relues.
5. **Livrer** s'il y a du neuf, sous la version suivante. Écrire la passe au journal, commiter, pousser la branche de
   travail ; `main` seulement quand toutes les batteries, interface comprise, sont vertes.

**Limites** :
- une passe de la taille de la v86 au plus ;
- les choix tranchés de la charte ne bougent pas sans son oui ;
- confidentialité : jamais « SEE » ni un nom de client, de programme, d'appareil ou de personne dans une recherche ;
- si les batteries restent rouges après deux essais, rien ne se livre, et le compte rendu dit pourquoi.

## Questions en attente

- **Chute admise** : VOLTA admet 2 V ; l'AC 43.13-1B dit 1 V en continu et 2 V en intermittent sous 28 V. Par défaut,
  garder 2 V.
- **Repère d'une barrette ajoutée** : la suite de la barrette voisine (667VT3), ou un repère tiré de la zone de
  l'équipement (340VT1). Par défaut, 667VT3.
- **Interrupteur à bornes chiffrées** : toutes ses bornes supposées reliées, par prudence. Par défaut, garder.

## Journal des passes

- **8 novembre 2026 — v86** (passe manuelle, quatorze agents) : l'aluminium, les bornes fixes, la carte et les genres,
  le disjoncteur vivant, un contact un nom, le courant à travers les relais, une seule source, l'historique du plan.
  Prochain thème : **1. La beauté**.
