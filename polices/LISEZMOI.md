# Les polices embarquées

L'outil reste un seul fichier hors ligne : `construire.js` lit chaque `.woff2` de ce dossier et l'écrit dans la page
en `@font-face` (data: URI). Aucune police n'est demandée au réseau.

| fichier | famille | rôle |
|---|---|---|
| `inter-latin-{400,500,600,700}-normal`, `-400-italic` | Inter | tout le texte : les titres (demi-gras, serrés), les étiquettes, les valeurs, les chiffres (tabulaires) |
| `inter-grec-{400,500,600,700}-normal` | Inter | le grec des unités et des formules (Δ Σ Φ Ω λ π ρ φ), chargé pour ces seuls caractères (`unicode-range`) |
| `jetbrains-mono-latin-{400,500,600}-normal` | JetBrains Mono | les identifiants : repères, part numbers, numéros de fil, types de câble — zéro pointé, l et 1 distincts |
| `jetbrains-mono-grec-{400,500,600}-normal` | JetBrains Mono | le grec dans un identifiant |
| `ibm-plex-{sans,mono}-symboles-{400,500,600}-normal` | Plex Sans / Plex Mono | les flèches et les signes (← → ↔ ⇄ ↶ − √ ∞ ≈ ≠ ≤ ≥ ✓) qu'Inter et JetBrains Mono n'ont pas dans ces sous-ensembles : la police suivante de la pile les sert, pour ces seuls caractères |

Le nom d'un fichier dit son rôle : `<famille>-<sous-ensemble>-<graisse>-<style>.woff2`, le sous-ensemble étant
`latin`, `symboles` ou `grec` (les plages sont dans `construire.js`, `PLAGES`). Le dessin des folios garde sa propre
police à chasse fixe (celle du système) : il ne dépend pas de ce dossier.

Licence : SIL Open Font License 1.1 (`OFL-Inter.txt`, `OFL-JetBrains-Mono.txt`, `OFL-IBM-Plex.txt`), qui permet de
les embarquer et de les découper. Sources : les paquets `@fontsource` (inter, jetbrains-mono 5.1.0) pour le latin et
le grec ; les polices complètes `@ibm/plex-sans` et `@ibm/plex-mono` 1.1.0, découpées par `fontTools.subset`, pour les
symboles. Une étoile, un triangle de tri ou un « pour toujours » sont des icônes SVG, pas des glyphes.
