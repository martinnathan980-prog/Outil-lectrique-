# Brief commun — Volta v74 (lis-le en entier avant de toucher à quoi que ce soit)

Lis d'abord `docs/v73/BRIEF-COMMUN-v72.md` : ses règles valent toujours (hors ligne, confidentialité, français,
aucun identifiant de modèle, construire et REGARDER l'écran, style du code). Ce fichier dit ce qui a changé depuis.

## Ce que la v74 a changé (ne le défais pas)
- **« Installation », plus « retest »**, dans tout ce que le lecteur lit (son Excel, c'est « l'installation du
  moment »). Les vrais mots de SES fichiers restent tels quels : les en-têtes « Date retest », « Date du retest », la
  ligne « Retest du 09/10/2026 » d'un Excel lu. Les identifiants, clés et classes (`retest`, `en-retest`,
  `data-act="retestcorrige"`…) ne changent pas.
- **Le calibre (la règle du lecteur)** : un calibre du fichier qui touche la courbe ou déclenche est remplacé, sans
  carte ni question, par le plus petit qui passe, son part number réécrit et ses câbles grossis (case « Volta »).
  Celui qui passe est gardé. `atelier.exemple()` ouvre donc l'exemple avec 102CB1 déjà en MS3320-15 et W-011/W-012/W-015
  en DR12. `atelier.exempleSansCalibreAuto()` l'ouvre comme la v73 (le 10 A proposé, pas écrit) : les batteries qui
  jugent autre chose que le calibre s'en servent. Une case des Hypothèses (`calibreAuto`) coupe la règle.
- **La consommation d'un équipement** (section « Consommation » de sa fiche) fait le profil du disjoncteur qui
  l'alimente (`profilDesConsommateurs`, 08-disjoncteurs).
- **Les routes** : impair = gauche, pair = droite (`coteDeRoute`, 01-modele) ; un mélange gauche/droite sur un même
  connecteur, module ou côté de prise est un point « branchement en chaîne » (genre `segregation`, 08-controle).
- **« D'où vient chaque pièce »** (`traceConnecteur`, 08-fiche) sous les contacts d'un connecteur.
- **Le relief est supprimé à tout jamais** (le lecteur : « tout ce qui est relief, on s'en fout »). Ne le rajoute pas.
- La barrette que Volta ajoute se dit « ajoutée par Volta · repère provisoire » (plus « à poser »).
- La fiche s'agrandit (⤢), le récapitulatif a sa croix.

## Comment travailler
- Tu es dans une copie isolée du dépôt (un worktree), partie de la branche principale. **Commence** par lire le rapport
  v73 de ton domaine s'il existe (`docs/v73/corrections/…`) et `docs/v73/BRIEF-CORRECTIONS.md` (ton domaine).
- Si ton brief nomme une branche en pause (`origin/v73-pause-…`) : `git fetch origin` puis `git merge
  origin/v73-pause-<domaine>` dans TA branche, et résous les conflits en gardant TOUT ce que la v74 a fait (ci-dessus).
- **Tes fichiers** sont listés dans ton brief. Touche le moins possible les autres ; si tu dois, un ajout court et
  commenté, jamais une réécriture (d'autres domaines travaillent en même temps, on fusionnera).
- **Construire** : `node construire.js`. **Charger** : vérifie qu'aucune `pageerror` ne paraît au chargement (une
  déclaration en double au niveau global casse toute la page).
- **Tests** : `NODE_PATH=/opt/node22/lib/node_modules node tests/<batterie>.js` (chaque batterie lit l'`index.html` de
  TON répertoire). Lance les batteries de ton domaine, puis `node tests/toutes.js` à la fin. Ne reconstruis pas
  `index.html` pendant qu'une batterie tourne dessus (copie-le ailleurs et passe `--fichier=<copie>` si besoin).
  `tests/ux.js` est le juge chiffré de l'ergonome : il ne doit pas gagner de défaut à cause de toi, il devrait en perdre.
- **Regarde tes écrans** (1440 × 900 et 1920 × 1080, clair et sombre) avant de dire que c'est fini.
- **Commit** dans ta branche, en français, terminé par :
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01SJNARvo3EkMZ1PC61moyNM
  ```
  Ne pousse pas, ne touche pas `main` : on fusionne après.
- **Ton rapport** : `docs/v74/corrections/<domaine>.md` — ce que tu as fait, chaque demande du lecteur et sa réponse,
  ce qui reste, les fonctions exposées aux autres domaines, les batteries passées (avec leurs chiffres).
- Aucun nom de personne dans le dépôt. Jamais « SEE », ni un nom de programme, d'appareil ou de client dans une
  recherche web.
