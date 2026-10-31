# Volta v77 — vos retours, et la préparation du gigatest

## Ce que vous avez signalé, et ce qui a changé

### La main qui restait bloquée sur un connecteur
- La cause : les bulles A · B · C étaient posées dans le titre de la section « Connecteur ». Un clic sur ce titre
  tombait souvent sur une bulle : il choisissait un connecteur au lieu de replier la section.
- Maintenant, les bulles sont dans la section, sous « Le connecteur montré ». Le titre dit seulement
  « 3 connecteurs : A, B, C », et un clic dessus ouvre et ferme la section.

### Les fiches
- **Tout est plié à l'ouverture.** Chaque fiche se souvient de ce que vous y avez déplié, et d'elle seule.
- **« Installation » devient « Modifications ».**
  - Le titre dit par rapport à quoi : « 4 changements par rapport à votre fichier, tous écrits par Volta ».
  - Déplié, il dit à quoi ça sert : ces changements partent dans l'installation corrigée.
  - Chaque changement se lit en mots, par exemple « Référence de 102CB1 ». La colonne du fichier est dans la bulle.
  - La phrase « colonne par colonne » a disparu.
- **La fenêtre se tire comme une page.**
  - On l'agrandit à la souris, par n'importe quel bord ou coin, et elle garde sa taille d'une fiche à l'autre.
  - Épinglée à droite, c'est son bord gauche qui se tire.
  - Un double-clic sur un bord la remet à sa taille normale.
  - ⤢ et × restent.

### Le cadran du disjoncteur
- **Rouge ou vert, rien d'autre.** Toucher la courbe, c'est ne pas passer : rouge, et c'est un problème.
- La légende tient en deux mots : « passe », « ne passe pas ».
- L'automatique dit « **Le minimum : 15 A** ».

### Les câbles
- **Sans numéro, un câble se dit par son type.**
  - Le titre de sa fiche affiche « DR12 » ; le crayon permet de lui donner un numéro.
  - Le type est utilisé partout ailleurs : problèmes, bulles, résumés.
  - Dans la liste d'un disjoncteur, l'autre bout s'affiche en petit (« vers 101BT1:1 ») pour distinguer trois « DR12 ».
- **La chute et la longueur, sur une deuxième ligne, en clair** : « Chute 0,37 V sur 2 V », « Longueur 5 m · supposée ».

### La référence d'un connecteur
- **D'où elle vient, toujours écrit sous elle** : « de votre fichier · norme EN 4165-002 · tables de Volta ». Si une
  base SEE est gardée sur le PC, la ligne dit aussi si elle la connaît.
- **« D'où elle vient »** ouvre sa carte d'identité :
  - d'où elle vient ;
  - sa base ;
  - pourquoi cette norme, en une phrase ;
  - ce qu'en dit la base SEE ;
  - **son schéma** (la face de l'arrangement, avec les câbles posés dessus) ;
  - un lien vers la bible.

### Les schémas des prises de coupure et des barrettes
- **Plein = pris, creux = libre, rouge = refusé.** Les contacts reliés entre eux sont cernés de bleu pâle.
- Les lettres des contacts se lisent, et une petite légende est sous chaque schéma.
- Plus de couleur de route dans un schéma : elle reste dans la liste des câbles.

### Le récapitulatif
- Les **problèmes en tête**, seuls, comme une boîte de réception, avec une pastille rouge et une ambre au lieu de
  « 1 · 3 ».
- Puis le câblage et le matériel, et les normes tout en bas.
- Chaque onglet a son icône et un seul nombre.

## Pour le gigatest
- **L'autotest du plan** (⋮ › Plus) : Volta parcourt lui-même tout le plan ouvert.
  - Il chronomètre chaque étape.
  - Il note chaque erreur : l'écran où elle s'est produite, sans aucun nom du plan.
  - Le résultat part avec le bilan anonyme.
- **Ce qui a déjà été corrigé grâce à lui**, sur des fichiers piégés fabriqués ici :
  - un CSV à virgules avec des champs entre guillemets s'ouvrait vide ;
  - un « ; » dans une description décalait les colonnes.
- La marche à suivre est dans [GIGATEST.md](GIGATEST.md).
