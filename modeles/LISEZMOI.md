# Modèles de tables

`bible-barrettes.csv` — la forme que l'outil sait lire pour la bible des
barrettes (menu « Bible des barrettes », ou dépôt du fichier sur la table).
Excel convient aussi : seule la ligne d'en-tête compte, les colonnes se
reconnaissent par leur nom, dans n'importe quel ordre.

| colonne | obligatoire | sens |
|---|---|---|
| Référence | oui | la référence normalisée (NSA…, ASNE…, ABS…) |
| Bornes | oui | nombre de bornes / modules |
| Famille | non | la série (déduite de la référence si absente) |
| Nature | non | `jonction`, `blindage`, `coupure`… |
| Jauge min / Jauge max | non | la plus fine et la plus grosse jauge AWG admises |
| Intensité | non | ampères, virgule ou point |
| Blindage | non | `oui` / `non` |
| Note | non | libre |

Les lignes de ce fichier sont un EXEMPLE : des références plausibles pour
montrer le mécanisme, pas des normes lues. Remplace-les par l'export de ta
base.
