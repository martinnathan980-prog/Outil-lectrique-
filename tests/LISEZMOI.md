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

    82,7 % de fils droits · 45 croisements · 0 évitable · 0 violation · 0 cas hors feuille
    contrat d'essai : 66,7 %, 0 croisement
    folio 1 : 62,5 %, 1 · folio 2 : 60 %, 3 · folio 3 : 55,4 %, 22

Un TOUR (un fil qui sort de son bloc par le flanc opposé à son partenaire
et en fait le tour) coûte un croisement et demi : le lecteur suit un fil
qui s'éloigne de sa cible, c'est pire qu'un pont. Avant ce poids (les tours
ne faisaient que départager), c'était 82,4 % et 40 croisements, mais W-014
du folio 1 faisait le tour de 395SW1 par la gauche et le bas ; il traverse
maintenant en Z avec un pont. Le banc note ses variantes au même barème.

Le juge précédent donnait 84,6 % et 53 croisements (contrat d'essai
83,3 %, folio 1 75 % / 1, folio 3 50 % / 35) : les fils droits perdus
étaient ACHETÉS PAR DES CORPS ÉTIRÉS — 601RC et 210SP1 sur toute la
hauteur de l'essai, 103RL1 du folio 1, C1 et C7 de la boucle (100 → 90 %)
— ce qu'un lecteur voit tout de suite et qu'aucun chiffre ne disait. Un
corps qui dépasse une fois et demie sa hauteur naturelle coûte désormais
un croisement et demi ; deux fils étrangers superposés sur un même trait
(une connexion qui ment) coûtent deux croisements ; un fil qui fait le
tour de son bloc coûte un croisement et demi ; une masse qui pend sur un
fil, un connecteur coupé en deux flancs départagent ensuite — un
connecteur se coupe quand ça supprime un tour ou un croisement, jamais
sans raison (le banc l'admet si chaque borne regarde vers son
partenaire).

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
