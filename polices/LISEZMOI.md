# Les polices embarquées

L'outil reste un seul fichier hors ligne : `construire.js` lit chaque `.woff2` de ce dossier et l'écrit dans la page
en `@font-face` (data: URI). Aucune police n'est demandée au réseau.

| fichier | famille | rôle |
|---|---|---|
| `b612-latin-400-normal`, `b612-latin-700-normal` | B612 | les titres, les étiquettes et les lectures chiffrées — la police dessinée pour les écrans de cockpit Airbus (Intactile Design, ENAC, 2012) |
| `ibm-plex-sans-latin-{400,500,600}-normal`, `-400-italic` | IBM Plex Sans | le texte courant et les valeurs |
| `ibm-plex-mono-latin-{400,500,600}-normal` | IBM Plex Mono | les identifiants : repères, part numbers, numéros de fil, types de câble |
| `ibm-plex-{sans,mono}-symboles-{400,500,600}-normal` | Plex Sans / Plex Mono | les flèches et les signes (← → ↔ ⇄ ↶ − √ ∞ ≈ ≠ ≤ ≥ ✓), chargés pour ces seuls caractères (`unicode-range`) |
| `ibm-plex-{sans,mono}-grec-{400,500,600}-normal` | Plex Sans (dans les deux familles) | le grec des unités et des formules (Δ Σ Φ Ω λ π ρ φ) ; Plex Mono n'a pas de grec : la famille Mono le prend à Plex Sans |

Le nom d'un fichier dit son rôle : `<famille>-<sous-ensemble>-<graisse>-<style>.woff2`, le sous-ensemble étant
`latin`, `symboles` ou `grec` (les plages sont dans `construire.js`, `PLAGES`). Le dessin des folios garde sa propre
police à chasse fixe (celle du système) : il ne dépend pas de ce dossier.

Licence : SIL Open Font License 1.1 (`OFL-B612.txt`, `OFL-IBM-Plex.txt` pour Plex Sans et Plex Mono), qui permet de
les embarquer et de les découper. Sources : les paquets `@fontsource` 5.0.8 (b612, ibm-plex-sans, ibm-plex-mono) pour
le latin ; les polices complètes `@ibm/plex-sans` et `@ibm/plex-mono` 1.1.0, découpées par `fontTools.subset`, pour
les symboles et le grec. Une étoile, un triangle de tri ou un « pour toujours » sont des icônes SVG, pas des glyphes.
