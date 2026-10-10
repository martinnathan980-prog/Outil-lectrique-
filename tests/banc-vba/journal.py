# lance un scénario et montre le journal (erreurs, arrêts, bilan)
import sys, os
sys.dont_write_bytecode = True   # pas de __pycache__ dans le dépôt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from relecture import doc_neuf
from banc import lancer, feuille
from collections import Counter
macro, args = sys.argv[1], tuple(eval(sys.argv[2]))
filtre = sys.argv[3] if len(sys.argv) > 3 else None
d = doc_neuf(); lancer(d, macro, args)
J = feuille(d, 'Journal')
print('journal', len(J), 'lignes')
err = [r for r in J[1:] if r[5] not in ('', None, 0)]
print(Counter((str(r[3])[:50], str(r[6])[:70]) for r in err).most_common(15))
for r in J[1:]:
    t = ' | '.join(str(x) for x in r[1:])
    if (filtre and any(f in t for f in filtre.split('~'))): print('  ', t[:300])
try:
    for r in feuille(d, 'Bilan'): print('  B', ' | '.join(str(x) for x in r[:13])[:250])
except Exception as e: print(e)
d.close(True)
