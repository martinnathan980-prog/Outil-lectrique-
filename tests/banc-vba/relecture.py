# Les scénarios de la reprise : python3 relecture.py <paquet> <variante> [scénario...]
import sys, os, json, subprocess
sys.dont_write_bytecode = True   # pas de __pycache__ dans le dépôt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from banc import charger, lancer, feuille
from chemins import ICI, TRACE, XLSX, TRAVAIL
import faux2
PAQUET, VARIANTE = (sys.argv[1], sys.argv[2]) if __name__ == '__main__' else ('', '')
choisis = sys.argv[3:]
def doc_neuf():
    return charger([('Banc', open(f'{ICI}/Banc.bas', encoding='utf-8').read()), ('BancR', open(os.environ.get('BANCR', f'{ICI}/BancR.bas'), encoding='utf-8').read())] + faux2.modules())
def verifier(paquet, *options):
    r = subprocess.run(['python3', f'{ICI}/verifier.py', paquet, TRACE, *options], capture_output=True, text=True)
    s = r.stdout.strip().replace('\n', ' | ')
    if r.returncode: s += ' | verifier en échec : ' + r.stderr.strip().split('\n')[-1]
    return s
# les réglages du matériel de BancR.BancMateriel, pour verifier.py --materiel (voir l'en-tête de verifier.py)
MATERIEL = ('corps=EQUIPEMENT:CL_EQUIPEMENT,MASSE:CL_MASSE,BARRETTE:CL_BARRETTE;connecteurs=EQUIPEMENT:CL_CONNECTEUR,PRISE:CL_CONNECTEUR;'
            'symboles=EQUIPEMENT,MASSE;broche=EQUIPEMENT,PRISE;refuse=*;folio=1')
def materiel(paquet):
    return verifier(paquet, '--materiel=' + MATERIEL)
# le projet d'essai du bouton 3 : un fichier .seeprj (son contenu n'importe pas au faux SEE), seul dans son dossier
ESSAI = os.path.join(TRAVAIL, 'robot')
def projet_essai():
    os.makedirs(ESSAI, exist_ok=True)
    for f in os.listdir(ESSAI): os.remove(os.path.join(ESSAI, f))
    p = os.path.join(ESSAI, 'TEST_SEE.seeprj')
    with open(p, 'wb') as f: f.write(b'faux projet SEE du banc\n')
    return p
def sans_texte(d, macro, args=()):
    """Lance une macro qu'on s'attend à voir ARRÊTÉE (End) : son texte n'est pas le résultat du scénario."""
    s = d.getScriptProvider().getScript(f"vnd.sun.star.script:Standard.{macro}?language=Basic&location=document")
    try: s.invoke(args, (), ())
    except Exception as e: print('    (arrêt :', str(e)[:200], ')')
def dossier_essai():
    return 'dossier du projet : ' + ', '.join(sorted(os.listdir(ESSAI)))
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
    # le matériel (le « device ») : sur la variante « pn » (des PN vides, un connecteur à deux PN), V5 et V4
    ('materiel V5', lambda d: lancer(d, 'BancR.BancMateriel', (VARIANTE, False)), lambda: verifier(VARIANTE) + ' || ' + materiel(VARIANTE)),
    ('materiel V4', lambda d: lancer(d, 'BancR.BancMateriel', (VARIANTE, True)), lambda: verifier(VARIANTE) + ' || ' + materiel(VARIANTE)),
    # un connecteur repris qui porte DÉJÀ un matériel : GARDER, AJOUTER, REMPLACER, lecture ratée (MaterielExistant)
    ('materiel existant', lambda d: lancer(d, 'BancR.BancMaterielExistant', (PAQUET,)), None),
    # TesterSEE, le bouton du bureau : sans SEE, avec le faux SEE en V5 et en V4, sans folio affiché, SEE qui cesse
    # de répondre, matériel rendu Nothing
    ('tester', lambda d: lancer(d, 'BancR.BancTester', (PAQUET,)), None),
    # le bouton 2 du classeur (EssaiDessinReel) : pour de vrai malgré Simulation = O, une question, le folio relu ; puis sans SEE
    ('bouton 2 V5', lambda d: lancer(d, 'BancR.BancBouton2', (False,)), None),
    ('bouton 2 V4', lambda d: lancer(d, 'BancR.BancBouton2', (True,)), None),
    # la v3 : les boutons 1 et 2 rejoignent la fenêtre SEE et n'en créent jamais (faux SEE_Windows : FauxWindows.bas)
    ('connexion V5', lambda d: lancer(d, 'BancR.BancConnexion', (False,)), None),
    ('connexion V4', lambda d: lancer(d, 'BancR.BancConnexion', (True,)), None),
    # le bouton 3 (EssaiSansFenetre), SEE fermé : V4 et la forme à un paramètre de plus (le cas probable au bureau),
    # V5 et la forme d'Application ; projet_essai() pose un faux projet dans le dossier de travail
    ('bouton 3 V4', lambda d: lancer(d, 'BancR.BancBouton3', (True, 2, projet_essai())), lambda: dossier_essai()),
    ('bouton 3 V5', lambda d: lancer(d, 'BancR.BancBouton3', (False, 1, projet_essai())), lambda: dossier_essai()),
    # Windows arrête TesterSEE au premier appel d'une fonction déclarée (GetActiveObject) : le bloc PROVISOIRE reste
    ('arret Windows', lambda d: (sans_texte(d, 'BancR.BancArret'), lancer(d, 'BancR.ApresArret', ())), None),
    # InitialiserClasseur qui lève une erreur : gSansDialogue reprend sa valeur
    ('panne classeur', lambda d: lancer(d, 'BancR.BancPanneClasseur', ()), None),
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
