# Les polices embarquées

L'outil reste un seul fichier hors ligne : `construire.js` lit chaque `.woff2` de ce dossier et l'écrit dans la page
en `@font-face` (data: URI). Aucune police n'est demandée au réseau.

| fichier | famille | rôle |
|---|---|---|
| `b612-latin-400-normal`, `b612-latin-700-normal` | B612 | les titres et les étiquettes — la police dessinée pour les écrans de cockpit Airbus (Intactile Design, ENAC, 2012) |
| `ibm-plex-sans-latin-{400,500,600}-normal`, `-400-italic` | IBM Plex Sans | le texte courant |
| `ibm-plex-mono-latin-{400,500,600}-normal` | IBM Plex Mono | les données : repères, part numbers, numéros de fil, valeurs |

Le dessin des folios garde sa propre police à chasse fixe (celle du système) : il ne dépend pas de ce dossier.

Licence : SIL Open Font License 1.1 (`OFL-B612.txt`, `OFL-IBM-Plex.txt` pour Plex Sans et Plex Mono), qui permet de
les embarquer. Sous-ensemble « latin » (les accents du français compris) ; un glyphe absent (Ω, φ, √) vient de la
police système. Source : les paquets `@fontsource` 5.0.8 (b612, ibm-plex-sans, ibm-plex-mono).
