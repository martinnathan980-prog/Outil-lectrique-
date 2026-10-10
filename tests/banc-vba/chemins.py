# Les chemins du banc, calculés depuis l'emplacement de ce fichier :
#   ICI     = tests/banc-vba/ (les fichiers du banc) ;
#   RACINE  = la racine du dépôt (deux niveaux au-dessus) ;
#   VBA     = see/vba/ (les modules éprouvés ; VBA_DIR pour en éprouver d'autres) ;
#   XLSX    = lib/xlsx.min.js (SheetJS, pour lire les paquets depuis node) ;
#   TRAVAIL = le dossier de travail (trace, paquets, sorties) : BANC_VBA_TRAVAIL,
#             sinon <répertoire temporaire du système>/banc-vba ; JAMAIS dans le dépôt ;
#   TRACE   = TRAVAIL/trace.txt, la trace des appels au faux SEE (EcrireTrace) ;
#   PORT    = le port du soffice à joindre (BANC_VBA_PORT, sinon 2002).
# « python3 chemins.py » écrit le dossier de travail (lancer.sh s'en sert).
import os, tempfile
ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(os.path.dirname(ICI))
VBA = os.environ.get('VBA_DIR') or os.path.join(RACINE, 'see', 'vba')
XLSX = os.path.join(RACINE, 'lib', 'xlsx.min.js')
TRAVAIL = os.path.abspath(os.environ.get('BANC_VBA_TRAVAIL') or os.path.join(tempfile.gettempdir(), 'banc-vba'))
TRACE = os.path.join(TRAVAIL, 'trace.txt')
PORT = int(os.environ.get('BANC_VBA_PORT') or 2002)
if os.path.commonpath([TRAVAIL, RACINE]) == RACINE:
    raise SystemExit(f'le dossier de travail {TRAVAIL} est dans le dépôt : choisir BANC_VBA_TRAVAIL ailleurs')
os.makedirs(TRAVAIL, exist_ok=True)
if __name__ == '__main__':
    print(TRAVAIL)
