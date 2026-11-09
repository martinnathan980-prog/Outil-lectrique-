---
name: livrer-volta
description: Livrer une version de VOLTA au lecteur — construire, vérifier (chargement, fumée, œil, batteries moteur, fichiers piégés), relire les captures en clair et en sombre, commiter, pousser la branche, envoyer le fichier HTML et le compte rendu. À utiliser à chaque fin de lot, avant de dire « c'est livré ».
---

# Livrer VOLTA

Toujours dans cet ordre, sans en sauter. Un échec arrête la livraison : on corrige, on reprend à l'étape qui a échoué.

```bash
cd <racine du dépôt>
export NODE_PATH=$(npm root -g)
```

1. **Construire** : d'abord le numéro de la version qu'on livre dans `src/08-bilan.js` (`BILAN.version` : le bilan anonyme le
   dit au lecteur) ; puis `node construire.js` et `node construire.js --verif` (« index.html à jour »).
2. **Charger** : `node tests/ecran/charge.js` → « chargée — aucune erreur ».
3. **La fumée** : `node tests/ecran/fumee.js` → « tout tient » (chaque bloc, chaque onglet, des fils, aucune fiche vide).
4. **L'œil** : `node tests/ecran/oeil.js clair 1440` puis `sombre 1920` → aucun onglet inégal, aucun texte coupé, aucun
   chevauchement. Un défaut restant se corrige, ou se justifie dans le compte rendu.
5. **Les batteries moteur** : `node tests/toutes.js moteur` → tout est vert.
6. **Les fichiers piégés** : `node tests/pieges.js` (long : en arrière-plan) → « 10 / 10 — tout tient ».
7. **Les captures, relues une à une** : `node tests/ecran/captures.js <brouillon>/captures les-deux 1440` (et 1920 pour
   les écrans touchés). Regarder chaque image avec la charte en tête (CLAUDE.md, « L'œil humain ») : hiérarchie, sections
   visibles, onglets égaux, couleurs, rien de vide, rien de coupé. Corriger avant d'aller plus loin.
8. **Les batteries de l'interface** (`node tests/toutes.js navigateur`) : seulement quand le lecteur a validé l'écran
   qu'elles décrivent ; sinon, dire dans le compte rendu qu'elles attendent sa validation.
9. **Commiter** (message en français, ce qui change pour le lecteur, lignes d'attribution de la séance) et **pousser la
   branche de travail** (`git push -u origin <branche>`, jusqu'à quatre essais espacés si le réseau lâche). `main`
   seulement si toutes les batteries, interface comprise, sont vertes.
10. **Envoyer le fichier** : copier `index.html` en `<brouillon>/Volta-vNN.html` et l'envoyer tel quel (jamais de ZIP).
11. **Le compte rendu**, en français, en tutoyant : ce qui a changé, écran par écran, dans les mots du lecteur ; ce qui
    a été vérifié (avec les chiffres) ; ce qui reste ; les questions, s'il y en a, chacune avec la proposition par
    défaut.

Ne jamais dire « livré » ou « vert » sans avoir vu la sortie de la commande.
