import sys, os, re, uno, time
sys.dont_write_bytecode = True   # pas de __pycache__ dans le dépôt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lo_run import connect, pv
from chemins import VBA, ICI, TRAVAIL
def module(nom):
    t=open(f'{VBA}/{nom}.bas','rb').read().decode('cp1252').replace('\r\n','\n')
    t=re.sub(r'^Attribute VB_Name = .*\n','',t)
    t=t.replace('Set d = CreateObject("Scripting.Dictionary")','Set d = New DicoTest')
    # LibreOffice ne sait pas « obj.Item(k) = v » sur une classe Basic : le banc écrit obj.Assigner k, v
    t=re.sub(r'(\b[\w]+(?:\([\w]+\))?)\.Item\(((?:[^()]|\((?:[^()]|\([^()]*\))*\))*)\) = (.+)$', r'\1.Assigner \2, \3', t, flags=re.M)
    return 'Option VBASupport 1\n'+t
def charger(extra):
    ctx=connect(); smgr=ctx.ServiceManager
    desk=smgr.createInstanceWithContext("com.sun.star.frame.Desktop",ctx)
    doc=desk.loadComponentFromURL("private:factory/scalc","_blank",0,(pv("Hidden",False),))
    libs=doc.BasicLibraries
    libs.VBACompatibilityMode=True
    lib=libs.getByName("Standard")
    mods=[('DicoTest',open(f'{ICI}/DicoTest.bas', encoding='utf-8').read())]+[(m,module(m)) for m in ['SEE_Commun','SEE_Sonde','SEE_Pilote']]+extra
    for n,c in mods: lib.insertByName(n,c)
    return doc
def lancer(doc, macro, args=()):
    s=doc.getScriptProvider().getScript(f"vnd.sun.star.script:Standard.{macro}?language=Basic&location=document")
    t=time.time()
    try: r=s.invoke(args,(),())[0]
    except Exception as e: r='EXCEPTION '+str(e)[:2000]
    print(f'{macro} -> {r}  ({time.time()-t:.1f} s)')
    return r
def feuille(doc, nom, maxl=100000):
    sh=doc.Sheets.getByName(nom); cur=sh.createCursor(); cur.gotoEndOfUsedArea(False)
    n=cur.RangeAddress.EndRow+1; m=cur.RangeAddress.EndColumn+1
    return sh.getCellRangeByPosition(0,0,m-1,min(n,maxl)-1).DataArray
if __name__=='__main__':
    doc=charger([('Banc',open(f'{ICI}/Banc.bas', encoding='utf-8').read())])
    lancer(doc,'Banc.BancSimulation',(sys.argv[1],))
    J=feuille(doc,'Journal')
    print('journal',len(J),'lignes')
    for r in J[:12]: print('  ',' | '.join(str(x) for x in r)[:220])
    err=[r for r in J if str(r[4]).startswith('ERREUR') or (r[5] not in ('',None) and r[5]!=0)]
    print('erreurs/num',len(err))
    for r in err[:15]: print('  E',' | '.join(str(x) for x in r)[:260])
    B=feuille(doc,'Bilan')
    for r in B: print('  B',' | '.join(str(x) for x in r)[:220])
    doc.storeToURL(uno.systemPathToFileUrl(os.path.join(TRAVAIL,'banc-simulation.ods')),())
