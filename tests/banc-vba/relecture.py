# Les scénarios de la reprise : python3 relecture.py <paquet> <variante> [scénario...]
import sys, os, json, subprocess
sys.dont_write_bytecode = True   # pas de __pycache__ dans le dépôt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from banc import charger, lancer, feuille
from chemins import ICI, TRACE, XLSX
import faux2
PAQUET, VARIANTE = (sys.argv[1], sys.argv[2]) if __name__ == '__main__' else ('', '')
choisis = sys.argv[3:]
def doc_neuf():
    return charger([('Banc', open(f'{ICI}/Banc.bas', encoding='utf-8').read()), ('BancR', open(os.environ.get('BANCR', f'{ICI}/BancR.bas'), encoding='utf-8').read())] + faux2.modules())
def verifier(paquet):
    r = subprocess.run(['python3', f'{ICI}/verifier.py', paquet, TRACE], capture_output=True, text=True)
    s = r.stdout.strip().replace('\n', ' | ')
    if r.returncode: s += ' | verifier en échec : ' + r.stderr.strip().split('\n')[-1]
    return s
def angles(paquet):
    js = '''const XLSX=require('''+json.dumps(XLSX)+'''),fs=require('fs');const wb=XLSX.read(fs.readFileSync(process.argv[1]),{type:'buffer'});
console.log(JSON.stringify(XLSX.utils.sheet_to_json(wb.Sheets.Blocs,{defval:null}).filter(b=>b.Nature==='MASSE').map(b=>b.Sens)));'''
    sens = json.loads(subprocess.run(['node', '-e', js, paquet], capture_output=True, text=True).stdout)
    T = [l.split('|') for l in open(TRACE, encoding='utf-8', errors='replace').read().split('\n') if l.startswith('AddSymbol|')]
    m = [t for t in T if t[2] == 'MASSE']
    return f"masses Sens D {sens.count('D')} / G {sens.count('G')} ; symboles MASSE posés à 180° : {sum(1 for t in m if float(t[4]) == 180)}, à 0° : {sum(1 for t in m if float(t[4]) == 0)}"
SCEN = [
    ('complet V5', lambda d: lancer(d, 'BancR.BancComplet', (PAQUET, False, False)), lambda: verifier(PAQUET) + ' || ' + angles(PAQUET)),
    ('complet V4', lambda d: lancer(d, 'BancR.BancComplet', (PAQUET, True, False)), lambda: verifier(PAQUET) + ' || ' + angles(PAQUET)),
    ('relecture ratée V5', lambda d: lancer(d, 'BancR.BancComplet', (PAQUET, False, True)), lambda: verifier(PAQUET)),
    ('variante V5', lambda d: lancer(d, 'BancR.BancComplet', (VARIANTE, False, False)), lambda: verifier(VARIANTE)),
    ('interrompu', lambda d: lancer(d, 'BancR.BancInterrompu', (PAQUET,)), None),
    ('remplacer', lambda d: lancer(d, 'BancR.BancRemplacer', (PAQUET,)), None),
    ('liste', lambda d: lancer(d, 'BancR.BancListe', (PAQUET,)), None),
    ('renommage', lambda d: lancer(d, 'BancR.BancRenommage', (PAQUET,)), None),
    ('sauvegardes', lambda d: lancer(d, 'BancR.BancSauvegardes', (PAQUET,)), None),
    ('automation', lambda d: lancer(d, 'BancR.BancAutomation', (PAQUET,)), None),
    ('version', lambda d: lancer(d, 'BancR.BancVersion', ()), None),
    ('formes', lambda d: lancer(d, 'BancR.BancFormes', (PAQUET,)), None),
    ('simulation zone', lambda d: lancer(d, 'BancR.BancSimulationZone', (PAQUET,)), None),
    ('essai existant', lambda d: lancer(d, 'BancR.BancEssaiExistant', (PAQUET,)), None),
    ('apostrophe', lambda d: lancer(d, 'BancR.BancApostrophe', ()), None),
    ('unite', lambda d: lancer(d, 'BancR.BancUnite', ()), None),
]
if __name__ == "__main__":
 inconnus = [c for c in choisis if c not in [n for n, _, _ in SCEN]]
 if inconnus: raise SystemExit(f'scénario inconnu : {inconnus} ; connus : {[n for n, _, _ in SCEN]}')
 for nom, f, apres in SCEN:
     if choisis and nom not in choisis: continue
     print('=====', nom)
     if os.path.exists(TRACE): os.remove(TRACE)   # pas de trace d'un scénario précédent
     d = doc_neuf()
     f(d)
     if apres:
         try: print('   ', apres())
         except Exception as e: print('    vérification impossible :', repr(e)[:300])
     d.close(True)
