# python3 verifier.py <paquet.xlsx> <trace.txt> [DX DY] : les fils tracés et les broches recalées, relus contre le paquet
import sys, json, os
sys.dont_write_bytecode = True   # pas de __pycache__ dans le dépôt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chemins import XLSX
import subprocess
PAQUET=sys.argv[1]; TRACE=sys.argv[2]; DX=float(sys.argv[3]) if len(sys.argv)>3 else 2.5; DY=float(sys.argv[4]) if len(sys.argv)>4 else -1
# lire le paquet par node + SheetJS
js='''const XLSX=require('''+json.dumps(XLSX)+'''),fs=require('fs');const wb=XLSX.read(fs.readFileSync(process.argv[1]),{type:'buffer'});
const o={};for(const n of wb.SheetNames)o[n]=XLSX.utils.sheet_to_json(wb.Sheets[n],{defval:null});console.log(JSON.stringify(o));'''
P=json.loads(subprocess.run(['node','-e',js,PAQUET],capture_output=True,text=True).stdout)
E=min(390/420,250/297); dx=(390-E*420)/2; dy=(250-E*297)/2
cx=lambda x: dx+E*x; cy=lambda y: dy+E*y
t=lambda v:'' if v is None else str(v).strip()
cote=lambda c: t(c).upper() if t(c).upper() in ('FICHE','EMBASE') else ''
acc={}; lignes={}
for b in P['Bornes']:
    k=(b['Folio'],t(b['Bloc']),t(b['Borne']),cote(b['Connecteur']))
    pose=(b['CX'],b['CY']) if b.get('CX') is not None and b.get('CY') is not None else (b['X'],b['Y'])
    acc[k+(len(lignes.get(k,[])),)]=(cx(pose[0]),cy(pose[1])); b['_pose']=pose; lignes.setdefault(k,[]).append(b)
# la ligne de Bornes DÉSIGNÉE par le tracé : celle dont l'accroche est à 0,01 mm du premier / dernier point (invariant du contrat) ;
# un pontage (sans tracé) : la paire de lignes la plus proche
def designee(k,px,py):
    c=lignes[k]; b=min(c,key=lambda r:(r['X']-px)**2+(r['Y']-py)**2); return (cx(b['_pose'][0]),cy(b['_pose'][1]))
def paire(k1,k2):
    best=None
    for a in lignes[k1]:
        for b in lignes[k2]:
            d=(a['X']-b['X'])**2+(a['Y']-b['Y'])**2
            if best is None or d<best[0]: best=(d,a,b)
    return (cx(best[1]['_pose'][0]),cy(best[1]['_pose'][1])),(cx(best[2]['_pose'][0]),cy(best[2]['_pose'][1]))
doubles=sum(1 for v in lignes.values() if len(v)>1); print('clés de borne en double',doubles)
T=[l for l in open(TRACE,encoding='utf-8',errors='replace').read().split('\n') if l]
fils=[l.split('|') for l in T if l.startswith('AddWireConnection|')]
attendus=[f for f in P['Fils']]
print('fils tracés',len(fils),'attendus',len(attendus))
ko=0; obliques=0; num=0
for (_,nom,typ,lab,pts),f in zip(fils,attendus):
    p=[tuple(map(float,q.split(';'))) for q in pts.split(' ')]
    kd=(f['Folio'],t(f['DeBloc']),t(f['DeBorne']),cote(f['DeCote'])); kv=(f['Folio'],t(f['VersBloc']),t(f['VersBorne']),cote(f['VersCote']))
    if f.get('Points'):
        q=[tuple(map(float,z.split())) for z in f['Points'].split('|')]
        a=designee(kd,*q[0]); b=designee(kv,*q[-1])
    else:
        a,b=paire(kd,kv)
    if abs(p[0][0]-a[0])>2e-3 or abs(p[0][1]-a[1])>2e-3 or abs(p[-1][0]-b[0])>2e-3 or abs(p[-1][1]-b[1])>2e-3:
        ko+=1
        if ko<4: print('  bout faux', f['Folio'], t(f['Fil']), p[0], a, p[-1], b)
    for i in range(len(p)-1):
        if abs(p[i][0]-p[i+1][0])>2e-3 and abs(p[i][1]-p[i+1][1])>2e-3: obliques+=1
    if lab!=t(f['Fil']): num+=1
print('bouts faux',ko,'segments obliques',obliques,'numéros différents',num)
# recalage : chaque broche, après recalage, a son point de connexion sur une accroche
lies=[l.split('|') for l in T if l.startswith('SetPosition|')]
derniers={}
for _,lien,pos in lies: derniers[lien]=pos
ok=0; faux=0
cibles=set((round(v[0],3),round(v[1],3)) for v in acc.values())
for lien,pos in derniers.items():
    x,y=map(float,pos.split(';')); c=(round(x+DX,3),round(y+DY,3))
    if c in cibles or any(abs(c[0]-u[0])<2e-3 and abs(c[1]-u[1])<2e-3 for u in cibles): ok+=1
    else: faux+=1
print('broches recalées sur leur point de pose (contact)',ok,'hors',faux)
