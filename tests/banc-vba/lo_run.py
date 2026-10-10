import uno, sys, time, os, subprocess
sys.dont_write_bytecode = True   # pas de __pycache__ dans le dépôt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chemins import PORT
from com.sun.star.beans import PropertyValue
def pv(n,v):
    p=PropertyValue(); p.Name=n; p.Value=v; return p
def connect():
    local=uno.getComponentContext()
    res=local.ServiceManager.createInstanceWithContext("com.sun.star.bridge.UnoUrlResolver",local)
    for i in range(60):
        try: return res.resolve(f"uno:socket,host=localhost,port={PORT};urp;StarOffice.ComponentContext")
        except Exception: time.sleep(1)
    raise SystemExit("pas de soffice")
def run(modules, macro, docpath=None):
    ctx=connect(); smgr=ctx.ServiceManager
    desk=smgr.createInstanceWithContext("com.sun.star.frame.Desktop",ctx)
    doc=desk.loadComponentFromURL("private:factory/scalc","_blank",0,(pv("Hidden",True),))
    if docpath:
        doc.storeAsURL(uno.systemPathToFileUrl(docpath),(pv("FilterName","Calc MS Excel 2007 VBA XML"),))
    libs=doc.BasicLibraries
    try: libs.VBACompatibilityMode=True
    except Exception as e: print('compat',e)
    lib=libs.getByName("Standard")
    for name,code in modules:
        if lib.hasByName(name): lib.removeByName(name)
        lib.insertByName(name,code)
    sp=doc.getScriptProvider()
    s=sp.getScript(f"vnd.sun.star.script:Standard.{macro}?language=Basic&location=document")
    try:
        r=s.invoke((),(),())
        print('RESULTAT', r[0])
    except Exception as e:
        print('EXCEPTION', str(e)[:3000])
    return doc
# python3 lo_run.py attendre : rend la main quand le soffice du port PORT répond (60 s au plus) ;
# python3 lo_run.py arreter  : lui demande de s'arrêter (Desktop.terminate), s'il répond.
if __name__ == '__main__':
    if sys.argv[1:] == ['attendre']:
        connect()
    elif sys.argv[1:] == ['arreter']:
        local=uno.getComponentContext()
        res=local.ServiceManager.createInstanceWithContext("com.sun.star.bridge.UnoUrlResolver",local)
        try: ctx=res.resolve(f"uno:socket,host=localhost,port={PORT};urp;StarOffice.ComponentContext")
        except Exception: sys.exit(0)   # personne n'écoute : déjà arrêté
        try: ctx.ServiceManager.createInstanceWithContext("com.sun.star.frame.Desktop",ctx).terminate()
        except Exception: pass          # le pont tombe avec soffice : c'est voulu
    else:
        raise SystemExit('usage : python3 lo_run.py attendre|arreter')
