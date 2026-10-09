# Modèles de tables

Trois lignes d'exemple par fichier, les en-têtes que l'outil reconnaît. Les deux premiers sont exactement ce que
« Télécharger un modèle (CSV) » écrit (l'accueil, « Vos fichiers ») — les mêmes lignes que `08-fichiers.js`
(`MODELE_RETEST`, `MODELE_BASE`) ; `tests/interface.js` vérifie qu'ils ne divergent pas.

`modele-retest.csv` — le retest, le contrat qu'on ouvre : une ligne par fil, les seize colonnes reconnues par leur nom
(et leurs alias, `COLONNES` de 02-lecture), en-têtes dans les trente premières lignes. Le minimum : **Device1, Pin1,
Device2, Pin2**. Plusieurs harness dans le fichier : l'outil demande lequel ouvrir, les autres deviennent des contrats
déjà faits.

`modele-contrats-deja-faits.csv` — la base des contrats déjà faits : les mêmes colonnes que le retest, **Harness**
rempli (une machine = un harness), FWD, Appareil et Date retest fortement conseillés ; une feuille par harness, ou
tout à la suite. Elle se dépose une fois (⋮ → Vos fichiers → Contrats déjà faits) et reste dans le navigateur.

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

La bible dit QUELLE référence poser ; ce que la référence ADMET (pas, jauges,
intensité et résistance de contact, fils par côté, règle de remplissage) et
ce que valent les fils vient d'une NORME : voir `normes/LISEZMOI.md`. La
Famille de la bible est la clé qui relie une référence à sa norme.

## Le suivi

Le menu « Exporter le suivi (CSV) » écrit, pour le contrat ouvert, une ligne
par chose posée — barrette, prise de coupure, connecteur — avec la référence
retenue, celle que portait le fichier, les bornes utilisées, les shunts, la
jauge, les fils, les routes et les folios. Colonnes :

    Contrat ; Repère ; Nature ; Référence retenue ; Référence du fichier ;
    Bornes utilisées ; Bornes ; Shunts ; Jauge ; Fils ; Routes ; Folios
