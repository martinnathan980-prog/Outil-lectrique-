# Modèles de tables

`bible-barrettes.csv` — la forme que l'outil sait lire pour la bible :
barrettes, prises de coupure et connecteurs dans une seule table (menu
« Bible des barrettes », ou dépôt du fichier sur la table).
Excel convient aussi : seule la ligne d'en-tête compte, les colonnes se
reconnaissent par leur nom, dans n'importe quel ordre.

| colonne | obligatoire | sens |
|---|---|---|
| Référence | oui | la référence normalisée (NSA…, ASNE…, ABS…) |
| Bornes | oui | nombre de bornes / modules |
| Famille | non | la série (déduite de la référence si absente) |
| Nature | non | `jonction` ou `blindage` (barrette), `coupure` (prise de coupure), `connecteur` (embase d'un équipement) |
| Jauge min / Jauge max | non | la plus fine et la plus grosse jauge AWG admises |
| Intensité | non | ampères, virgule ou point |
| Blindage | non | `oui` / `non` |
| Mobile | non | pour un `connecteur` : la référence de la partie mobile (la fiche à poser sur le faisceau) |
| Note | non | libre |

Les lignes de ce fichier sont un EXEMPLE : des références plausibles pour
montrer le mécanisme, pas des normes lues. Remplace-les par l'export de ta
base.

## Le suivi

Le menu « Exporter le suivi (CSV) » écrit, pour le contrat ouvert, une ligne
par chose posée — barrette, prise de coupure, connecteur — avec la référence
retenue, celle que portait le fichier, les bornes utilisées, les shunts, la
jauge, les fils, les routes et les folios. Colonnes :

    Contrat ; Repère ; Nature ; Référence retenue ; Référence du fichier ;
    Bornes utilisées ; Bornes ; Shunts ; Jauge ; Fils ; Routes ; Folios
