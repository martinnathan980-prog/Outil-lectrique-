# Contrôle de l'outil

## Lancer

```
node tests/controle.js        les invariants et les pièges déjà tombés
node tests/memoire.js         le travail survit-il à la fermeture de l'onglet
node tests/banc-placement.js  combien de fils sortent droits, et sur quelle feuille
node tests/format-retest.js   les seize colonnes sont lues par leur nom
```

Les trois sont indépendants. `controle.js` et `memoire.js` rendent 1 en cas
d'échec, pour qu'un enchaînement s'arrête ; `banc-placement.js` est une
MESURE et non un contrôle — il ne juge pas, il chiffre, et il ne rend 1 que
si un invariant sacré est violé. C'est lui qu'on relance avant et après tout
changement du moteur de placement, avec `--json` pour comparer deux
versions.

Il faut Playwright et un Chromium. Sur la machine de développement :

```
NODE_PATH=/opt/node22/lib/node_modules /opt/node22/bin/node tests/controle.js
```

Le script sort avec le code **1** si un seul contrôle échoue — de quoi
l'enchaîner à un déploiement sans y penser.

## Ce qu'il vérifie

| # | Contrôle | Pourquoi c'est là |
|---|---|---|
| 1 | Le fichier se charge seul, bibliothèque Excel comprise | `index.html` doit marcher **sans aucun fichier à côté**. Ça a déjà cassé une fois. |
| 2 | Le dessin reste sain sur la base embarquée | L'invariant le plus important : **aucun fil ne traverse un bloc**, **aucun bloc n'en chevauche un autre**. Le reste est du confort ; ça, c'est faux ou juste. |
| 3 | Le contrat d'essai se dessine, ses deux barrettes sont repérées | La détection des barrettes est ce sur quoi tout le rapprochement s'appuie. |
| 4 | Les trois règles de prise de coupure | Et surtout : **sans fichier de localisation, aucune coupure n'est inventée**. |
| 5 | Identification par empreinte, choix du contrat de départ | Qu'un équipement aux bornes déplacées soit reconnu, et que le différentiel fasse remonter les pièces manquantes. |

## Ce qu'il ne vérifie pas

- **L'esthétique.** Le nombre de fils droits est affiché mais ne fait pas
  échouer le contrôle, sauf s'il tombe sous 90 % : la beauté se juge à l'œil,
  sur des captures.
- **Les gros volumes.** La vraie base fait 596 244 lignes ; le contrôle
  travaille sur des jeux d'essai de quelques dizaines de lignes, pour rester
  rapide. Un changement qui touche à la lecture du `.xlsm` doit être essayé à
  la main sur le vrai fichier.
- **Le fichier de localisation.** Il n'existe pas encore. Les zones utilisées
  ici sont provisoires ; les règles sont vérifiées, pas les valeurs.

## Si un contrôle échoue

Le message donne la mesure à côté du nom. Un `filsDansBloc` ou un
`chevauch` non nul est un défaut de moteur, jamais un réglage : c'est à
corriger avant tout le reste.
