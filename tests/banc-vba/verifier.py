# python3 verifier.py <paquet.xlsx> <trace.txt> [DX DY] : les fils tracés et les broches recalées, relus contre le paquet
# python3 verifier.py <paquet.xlsx> <trace.txt> --materiel=<réglages> : le MATÉRIEL associé, relu contre le paquet
#   <réglages> : corps=NATURE:CLASSE,…;connecteurs=NATURE:CLASSE,…;symboles=NATURE,…;broche=NATURE,…;refuse=<préfixe>;folio=<n>
#   corps / connecteurs : les classes réglées (<NATURE>.ClasseMateriel / .ClasseConnecteur) ; symboles : les natures dont le
#   corps est posé en symbole ; broche : les natures en mode BROCHE ; refuse : le préfixe des codes que le faux catalogue
#   refuse ; folio : le folio relu par SondeFolio.
import sys, json, os
sys.dont_write_bytecode = True   # pas de __pycache__ dans le dépôt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chemins import XLSX
import subprocess
OPTIONS=[a for a in sys.argv[1:] if a.startswith('--')]; ARGS=[a for a in sys.argv[1:] if not a.startswith('--')]
PAQUET=ARGS[0]; TRACE=ARGS[1]; DX=float(ARGS[2]) if len(ARGS)>2 else 2.5; DY=float(ARGS[3]) if len(ARGS)>3 else -1
MATERIEL=next((o.split('=',1)[1] for o in OPTIONS if o.startswith('--materiel=')), None)
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
doubles=sum(1 for v in lignes.values() if len(v)>1)

# ---------------------------------------------------------------- le matériel (le « device » associé)
def verifier_materiel(spec, T):
    """Ce que le pilote doit associer, calculé depuis le paquet comme le pilote le fait (FORMAT-PAQUET.md, SEE_Pilote) :
    un corps posé en symbole d'une nature dont ClasseMateriel est réglée reçoit son PN (Blocs) ; un connecteur servi
    (une borne du bloc le cite) d'un bloc en BROCHE dont ClasseConnecteur est réglée reçoit le PN de sa pièce
    (Connecteurs), une fois par exécution (le premier PN vu gagne). PN vide : rien. Code refusé : rien (journalisé)."""
    o = dict(kv.split('=', 1) for kv in spec.split(';') if kv)
    paires = lambda s: dict(x.split(':', 1) for x in s.split(',') if x) if s else {}
    corps, classes_con = paires(o.get('corps', '')), paires(o.get('connecteurs', ''))
    symboles, broche = set(filter(None, o.get('symboles', '').split(','))), set(filter(None, o.get('broche', '').split(',')))
    refuse = o.get('refuse', ''); folio_sonde = int(o['folio']) if o.get('folio') else None
    refuse_t = lambda pn: bool(refuse) and pn.startswith(refuse)
    noms = {t(f['Nom']): f['Folio'] for f in P['Folios']}
    folios = sorted({f['Folio'] for f in P['Folios']})
    attendus_corps, attendus_con = [], []          # (folio, (x1, y1, x2, y2) | repère, classe, pn)
    corps_sans_pn = corps_dessines = con_sans_pn = pn_differents = 0
    vus = {}                                        # repère du connecteur -> premier PN associé
    servis = {}                                     # folio -> repères des connecteurs servis
    for f in folios:
        for b in [b for b in P['Blocs'] if b['Folio'] == f]:
            nat, pn = t(b['Nature']), t(b['PN'])
            if nat in corps:
                if not pn: corps_sans_pn += 1
                elif nat not in symboles: corps_dessines += 1
                else: attendus_corps.append((f, (cx(b['X']), cy(b['Y']), cx(b['X'] + b['L']), cy(b['Y'] + b['H'])), corps[nat], pn))
            if nat in broche and nat in classes_con:
                lettres = []
                for r in P['Bornes']:
                    if r['Folio'] == f and t(r['Bloc']) == t(b['Bloc']) and t(r['Connecteur']) not in lettres: lettres.append(t(r['Connecteur']))
                sans = 0
                for le in lettres:
                    tag = t(b['Repere']) + ('-' + le if le else '')
                    servis.setdefault(f, set()).add(tag)
                    pieces = [c for c in P['Connecteurs'] if c['Folio'] == f and t(c['Bloc']) == t(b['Bloc']) and t(c['Lettre']) == le and t(c['PN'])]
                    pc = t(pieces[0]['PN']) if pieces else ''
                    if not pc: sans += 1
                    elif tag in vus:
                        if vus[tag] != pc: pn_differents += 1
                    else:
                        vus[tag] = pc; attendus_con.append((f, tag, classes_con[nat], pc))
                if sans: con_sans_pn += 1
    tentatives = len(attendus_corps) + len(attendus_con)
    refus = sum(1 for a in attendus_corps + attendus_con if refuse_t(a[3]))
    # la trace : SetEquipmentCollection|Symbol|<folio>|<forme>|<x1;y1-x2;y2>|<Class;Code;Quantity> ou …|Connector|<repère>|<…>
    lus = [l.split('|') for l in T if l.startswith('SetEquipmentCollection|')]
    lus_corps, lus_con = [l for l in lus if l[1] == 'Symbol'], [l for l in lus if l[1] == 'Connector']
    restants = [a for a in attendus_corps if not refuse_t(a[3])]
    faux = en_trop = 0
    for l in lus_corps:
        f = noms.get(l[2].lstrip('~'))
        a, b = l[4].split('-', 1) if '-' in l[4] else (l[4], '')
        p = tuple(map(float, a.split(';'))) + (tuple(map(float, b.split(';'))) if b else ())
        cible = next((x for x in restants if x[0] == f and len(p) == 4 and all(abs(p[i] - x[1][i]) < 2e-3 for i in range(4))), None)
        if cible is None: en_trop += 1; continue
        restants.remove(cible)
        if l[5] != f'{cible[2]};{cible[3]};1': faux += 1
    con_attendus = {a[1]: a for a in attendus_con if not refuse_t(a[3])}
    for l in lus_con:
        a = con_attendus.pop(l[2], None)
        if a is None: en_trop += 1
        elif l[3] != f'{a[2]};{a[3]};1': faux += 1
    manquants = len(restants) + len(con_attendus)
    print(f'matériels : tentatives attendues {tentatives} (corps {len(attendus_corps)}, connecteurs {len(attendus_con)}) ; '
          f'refus attendus {refus} ; associés attendus {tentatives - refus} ; associés lus {len(lus)} '
          f'(corps {len(lus_corps)}, connecteurs {len(lus_con)}) ; classe ou code faux {faux} ; manquants {manquants} ; en trop {en_trop} ; '
          f'corps sans PN attendus {corps_sans_pn} ; corps dessinés attendus {corps_dessines} ; '
          f'connecteurs sans PN attendus {con_sans_pn} ; PN différents attendus {pn_differents}')
    if folio_sonde is not None:
        rc = sum(1 for a in attendus_corps if a[0] == folio_sonde and not refuse_t(a[3]))
        rk = sum(1 for tag in servis.get(folio_sonde, ()) if tag in vus and not refuse_t(vus[tag]))
        print(f'relus attendus sur le folio {folio_sonde} : {rc + rk} (corps {rc}, connecteurs {rk})')

T=[l for l in open(TRACE,encoding='utf-8',errors='replace').read().split('\n') if l]
if MATERIEL is not None:
    verifier_materiel(MATERIEL, T)
    sys.exit(0)
print('clés de borne en double',doubles)
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
