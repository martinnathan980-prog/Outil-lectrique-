# Contrôle de l'outil

## Lancer

```
node tests/controle.js         les invariants, le contrat d'essai, la base de retest, les pièges déjà tombés
node tests/memoire.js          le travail survit-il à la fermeture de l'onglet
node tests/format-retest.js    les seize colonnes sont lues par leur nom
node tests/banc-placement.js   combien de fils sortent droits, et sur quelle feuille
node tests/barrettes.js        la bible des barrettes se lit, la référence se choisit, les connecteurs se lisent (sans navigateur)
```

Tous acceptent `--fichier=chemin` pour mesurer un autre fichier que
`index.html` (c'est ainsi qu'on a tenu la parité avec l'ancien moteur pendant
la refonte). `controle.js` et `memoire.js` rendent 1 en cas d'échec, pour
qu'un enchaînement s'arrête ; `banc-placement.js` est une MESURE et non un
contrôle — il chiffre, avec `--json` pour comparer deux versions — et ne rend
1 que si un invariant sacré est violé.

Il faut Playwright et un Chromium :

```
NODE_PATH=/opt/node22/lib/node_modules node tests/controle.js
```

`tests/pilote.js` est le seul endroit qui sait parler à la page : trois
verbes (charger, essai, mesurer) sur l'API `atelier` de `src/10-demarrage.js`.

## Le contrat de la refonte

Avant de toucher au moteur, on relance le banc ; après, on le relance. Les
chiffres de référence sur les dix-huit topologies (quinze historiques et
les trois folios de l'exemple ; un piquage qui tranche un fil compte comme
un croisement), depuis que le juge voit les corps étirés, les segments
partagés et les tours :

    86,0 % de fils droits · 13 croisements · 0 évitable · 0 violation · 0 cas hors feuille
    contrat d'essai : 66,7 %, 0 croisement
    folio 1 : 75 %, 1 · folio 2 : 65 %, 0 · folio 3 : 57,1 %, 12

UN CROISEMENT VAUT DEUX FILS DROITS. Un lecteur a montré, deux fois sur la
même feuille (210SP1, 601RC), un croisement pour rien qu'un échange de deux
bornes ôtait en pliant un fil : c'est l'échange qu'il voulait. Le juge
précédent (un croisement = un fil droit) préférait le fil droit à égalité.
Un TOUR (un fil qui sort de son bloc par le flanc opposé à son partenaire et
en fait le tour) coûte un croisement et demi, et l'estimation le voit.
Le tamis de l'estimation se compte en croisements (un ; deux dans la passe
finale, où l'estimation se trompe d'un ou deux croisements sur un changement
de flanc). Une borne peut changer de flanc au-dessus ou au-dessous du corps,
qui grandit d'autant ; un échange de bornes à hauteurs fixes qui plie un
fil se rejoue au solveur, où le partenaire glisse et le garde droit. Les
finalistes du concours se comparent sur la géométrie qu'on dessinera
(resserrée, étirée au format) : sinon un dessin replié battait un paysage
qui ne « tenait » pas encore parce que ses goulottes étaient taillées large.

LES BARRETTES SE POSENT PAR PAQUET (`03-graphe`) : les bornes pontées
ensemble font un module, dessiné là où il sert, aussi petit que possible ;
une barrette de dix bornes n'est plus une colonne de dix bornes que tous
les fils contournent. C'est ce qui fait passer le folio 2 de 60 % / 3 à
65 % / 0 et le folio 3 de 22 à 12 croisements (« réglette VT
traversante » : 71 % / 17 → 100 % / 0). Beaucoup de petites composantes se
rangent sur une étagère dont la largeur vise le format de la feuille.

Avant ce barème et ces paquets, c'était 82,7 % et 45 croisements (folio 1
62,5 % / 1, folio 2 60 % / 3, folio 3 55,4 % / 22).

CE QUI RESTE ROUGE AU BANC, mesuré et non caché : sur le folio 3 (66
liaisons), la recherche n'a pas convergé dans son budget — un changement de
flanc évident (351PM1:3) est manqué, deux segments restent partagés et un
connecteur est coupé sans raison (381RL1:A2) ; sur le folio 2, W-133 et
W-136 partagent un segment que le juge ne sait pas défaire sans créer un
croisement. Le banc rend 1 tant que c'est là.

La mesure des fils droits est HONNÊTE depuis ce routeur : un fil qui passe
par le raccord et la verticale d'un piquage n'est pas droit, même si son
dernier segment l'est. L'ancien routeur les comptait droits : ses 88,3 %
valaient 79,6 % à cette mesure (285 fils sur 358, à placement fixé), pour
86 croisements dont plusieurs barrettes superposées comptées chacune.

Les CROISEMENTS ÉVITABLES : à placement fixé, un croisement est évitable
si un autre ordre des verticales de sa goulotte le supprime sans en créer.
C'est la part du routeur, mesurée sur les tracés (pas dans le routeur), et
elle vaut 0 ; sinon le banc rend 1.

Quand borniers et connecteurs étaient rigides (ordre naturel, au pas),
c'était 73,7 %, 122 croisements, folio 2 : 50 % / 5, folio 3 : 46,4 % / 80
(mesure gonflée). Avant la rigidité, les quinze historiques donnaient
96,7 % et 4 croisements : c'est le prix, mesuré, d'objets qui ressemblent
au matériel.

Le banc vérifie aussi, sur chaque folio de l'exemple, que **les gestes
évidents sont trouvés** : aucun échange de deux bornes d'un connecteur,
aucun changement de flanc d'une borne, aucun glissement d'un bloc (ses
pastilles avec lui) ne fait mieux — moins de croisements ou de segments
partagés sans moins de fils droits, ou l'inverse (vérification exacte, a
posteriori, au routage réel, sur la géométrie resserrée). Et que le dessin
n'a **aucun segment partagé** par deux fils de nets différents, **aucun
corps étiré** à plus de deux fois sa hauteur naturelle sans rendre droits
deux fils de plus (on le compacte et on reroute), les masses collées à
leur borne, et les cas montrés du doigt (W-120, 381RL1, 397TB1). Un
manqué fait rendre 1.

Un changement qui fait baisser le premier chiffre doit dire pourquoi, dans son
message de commit, mesure à l'appui.

## Ce que `controle.js` vérifie

| # | Contrôle | Pourquoi c'est là |
|---|---|---|
| 1 | Le fichier se charge seul, bibliothèque Excel comprise | `index.html` doit marcher **sans aucun fichier à côté**. |
| 2 | Le dessin reste sain sur les formes qui font mal, sans croisement évitable | **Aucun fil ne traverse un bloc, aucun bloc n'en chevauche un autre.** La chaîne doit en plus tenir sur une feuille ; le maillage, qui croise beaucoup, ne croise que l'inévitable. |
| 3 | Le contrat d'essai : barrettes repérées, aucun croisement évitable, numéros de fil écrits sans se marcher dessus | Le numéro de fil est l'information numéro un d'un câbleur. |
| 5 | Identification par empreinte, choix du contrat de départ, différentiel | Qu'un équipement aux bornes déplacées soit reconnu, que le bon contrat sorte premier, que les pièces manquantes remontent. |
| 6 | Écriture des pièces, provenance, annulation exacte | On recopie, on ne reconstruit pas ; « Annuler » rend l'état d'avant. |
| 7 | Les pièges déjà tombés | Chaque défaut trouvé un jour a son contrôle, pour ne pas revenir. |

## Ce qu'il ne vérifie pas

- **L'esthétique.** Elle se juge à l'œil, sur des captures.
- **Les gros volumes.** La vraie base fait des centaines de milliers de
  lignes ; les contrôles travaillent sur quelques dizaines. Un changement à
  la lecture Excel s'essaie à la main sur le vrai fichier.
- **Le fichier de localisation.** Il n'existe pas encore ; les règles de
  coupure attendent dans `a-venir/`.
