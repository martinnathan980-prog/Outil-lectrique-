# Les scénarios d'origine du banc (banc_*.py de l'auteur), sur les modules du dépôt :
#   python3 regression.py <paquet.xlsx> [scénario...]   (sans nom de scénario : tous)
import sys, os
sys.dont_write_bytecode = True   # pas de __pycache__ dans le dépôt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from relecture import doc_neuf
from banc import lancer, feuille
from chemins import TRACE
from collections import Counter
P = sys.argv[1]
choisis = sys.argv[2:]
def trace():
    return Counter(l.split('|')[0] for l in open(TRACE, encoding='utf-8', errors='replace').read().split('\n') if l)
def erreurs(d):
    J = feuille(d, 'Journal')
    e = [r for r in J[1:] if str(r[4]).startswith('ERREUR') or str(r[4]).startswith('ARR')]
    return len(J), Counter((str(r[3])[:40], str(r[6])[:60]) for r in e).most_common(4)
SCEN = [
    ('simulation sans SEE', 'Banc.BancSimulation', (P,)),
    ('essais V5', 'BancFaux.BancEssais', (False,)), ('essais V4', 'BancFaux.BancEssais', (True,)),
    ('sondes V5', 'BancFaux.BancSondes', (P, False)), ('sondes V4', 'BancFaux.BancSondes', (P, True)),
    ('modes V5', 'BancFaux.BancModes', (P, False)), ('modes V4', 'BancFaux.BancModes', (P, True)),
    ('journal NORMAL', 'BancFaux.BancNormal', (P,)),
    ('simulation avec SEE V5', 'BancFaux.BancSimuleAvecSEE', (P, False)), ('simulation avec SEE V4', 'BancFaux.BancSimuleAvecSEE', (P, True)),
]
inconnus = [c for c in choisis if c not in [n for n, _, _ in SCEN]]
if inconnus: raise SystemExit(f'scénario inconnu : {inconnus} ; connus : {[n for n, _, _ in SCEN]}')
if os.path.exists(TRACE): os.remove(TRACE)   # pas de trace d'un passage précédent
for nom, macro, args in SCEN:
    if choisis and nom not in choisis: continue
    print('=====', nom)
    d = doc_neuf()
    lancer(d, macro, args)
    n, e = erreurs(d)
    print('    journal', n, 'lignes ; erreurs', e)
    try: print('    traces', dict(trace()))
    except Exception: pass
    try:
        B = feuille(d, 'Bilan'); print('    bilan', [str(r[2]) for r in B[1:]])
    except Exception: pass
    if nom.startswith('sondes'):
        for f in ['Sonde_Application', 'Sonde_Symboles', 'Sonde_Folio', 'Sonde_Selection', 'Sonde_Methodes']:
            try: D = feuille(d, f); print('    ', f, len(D), 'lignes', [' | '.join(str(x) for x in r if x not in ('', None))[:90] for r in D if 'Unit' in str(r) or 'VersionAPI' in str(r) or 'Dossier' in str(r)][:3])
            except Exception as ex: print('    ', f, 'absente')
    d.close(True)
    if os.path.exists(TRACE): os.remove(TRACE)
