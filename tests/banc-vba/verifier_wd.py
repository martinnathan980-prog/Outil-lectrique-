# python3 verifier_wd.py <travail> <paquet.xlsx> <variante.xlsx> <schéma.xsd> <un-harness.xlsx> : les listes de fils XML
# qu'ExporterWD a écrites (scénario « exporter WD » du banc), vérifiées par xmllint contre la reconstitution du schéma
# 3.10, et relues contre le paquet. Ce qui est attendu est CALCULÉ ici depuis le paquet, avec les règles de
# see/FORMAT-WD.md (écrites à part du VBA) : les noms des fichiers ; chaque WireHarness (Tag, Description) ; chaque
# appareil (Tag, Type : TerminalBlock et GroundBlock pour un bornier et une masse, ConnectivityType, MatingTag,
# ParentTag, PartNumber : pas sur un équipement dont un connecteur en a un, Description) et ses broches (une masse :
# une seule) ; chaque fil (Tag, Wire_Type, Gauge, Length, Length_Status, Type : un fil blindé est Normal, Segregation) ;
# ses bouts (ID, WireTag, Pin, PinParent) ; WD-TOUT, un WireHarness par harness, les folios d'un même harness réunis.
# Et, sans rien calculer : chaque fichier valide pour xmllint, en ASCII, sans WiresNumber ni Class, chaque bout de fil
# sur une broche de son appareil, aucun Tag en double.
# Une ligne par dossier : WD-paquet-exemple (l'exemple), WD-paquet-wd (la variante v_wd.js), WD-paquet-wd-h1 (la
# variante v_wd_h.js : un seul harness), WD-paquet-wd-refus (une copie de l'exemple, que le faux Windows refuse en
# partie : les fichiers sont les mêmes), WD-paquet-wd-sans (le schéma introuvable : seulement les attributs de l'essai
# du bureau). Code de sortie 0, sauf si ce programme ne peut pas tourner.
import sys, os, json, subprocess
sys.dont_write_bytecode = True   # pas de __pycache__ dans le dépôt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chemins import XLSX
from lxml import etree

TRAVAIL, PAQUET, VARIANTE, XSD, UN_HARNESS = sys.argv[1:6]
BORNIER, MASSE = 'TerminalBlock', 'GroundBlock'      # le Type d'un bornier et d'une masse en 3.10 (vu au bureau)
# les attributs de l'essai importé au bureau (ATTRIBUTS_SURS de SEE_WD) : seuls écrits sans schéma
SURS = {'IGE-XAO_WIRE_HARNESS': {'EDB_InstanceID', 'XSDversion', 'LengthUnit'}, 'WireHarness': {'Tag'},
        'ConnectiveDevice': {'Tag', 'Type', 'ConnectivityType'}, 'Pin': {'Tag'},
        'Wire': {'Tag', 'Wire_Type', 'Gauge', 'Length', 'Length_Status', 'Type', 'Segregation'},
        'WireExtremity': {'ID', 'WireTag', 'Pin', 'PinParent'}}
# les longueurs maximales des types de la reconstitution (tExtendedTag, tTag, tWireType, tGauge, tSegregation, et
# tPartNumber, tDescription supposés à 255)
MAXI = {'dev': 255, 'pin': 128, 'fil': 128, 'harnais': 128, 'type': 50, 'jauge': 10, 'seg': 255, 'pn': 255, 'desc': 255}

def lire(paquet):
    js = ('const XLSX=require(' + json.dumps(XLSX) + '),fs=require("fs");const wb=XLSX.read(fs.readFileSync(process.argv[1]),{type:"buffer"});'
          'const o={};for(const n of wb.SheetNames)o[n]=XLSX.utils.sheet_to_json(wb.Sheets[n],{defval:null});console.log(JSON.stringify(o));')
    return json.loads(subprocess.run(['node', '-e', js, paquet], capture_output=True, text=True, check=True).stdout)

def texte(v):
    """Une cellule comme PaquetTexte la lit : vide, un nombre écrit simplement, ou le texte sans espace au bout."""
    if v is None: return ''
    if isinstance(v, bool): return 'Vrai' if v else 'Faux'
    if isinstance(v, (int, float)):
        x = round(float(v), 4)
        return str(int(x)) if x == int(x) else repr(x)
    return str(v).strip(' ')

def cote(c):
    c = c.strip().upper()
    return c if c in ('FICHE', 'EMBASE') else ''

def couper(s, n):
    return s[:n] if n > 0 else s

def unique(brut, maxi, pris, prefixe='', casse=True):
    """TagUnique : coupé à maxi, puis « ~2 », « ~3 »... s'il est pris (pris : les Tag déjà donnés, précédés de prefixe)."""
    cle = (lambda s: s) if casse else (lambda s: s.lower())
    t, n = couper(brut, maxi), 1
    while cle(prefixe + t) in pris:
        n += 1
        s = f'~{n}'
        t = couper(brut, maxi - len(s)) + s if maxi > len(s) else brut + s
    pris.add(cle(prefixe + t))
    return t

def nom_fichier(nom, defaut):
    r = ''.join('_' if (ord(c) < 32 or c in '\\/:*?"<>|') else c for c in nom)
    r = r[:80].strip(' ')
    while r and r[-1] in '. ':
        r = r[:-1]
    return r or defaut

def harnais(P, f):
    """Le folio f construit (ConstruireFolioWD) : (appareils [dict(tag, type, prise, accouple, parent, pn, desc, pins)],
    fils [(Tag, attributs)], bouts [(ID, attributs)]), dans l'ordre où ils s'écrivent."""
    devs, tags_pris, nature, repere, pieces = {}, set(), {}, {}, {}
    for c in P.get('Connecteurs', []):
        if c['Folio'] == f: pieces.setdefault(texte(c['Bloc']), []).append(c)
    def appareil(cle, brut, genre, pn, desc, parent='', prise='', accouple=''):
        if cle in devs:
            if not devs[cle]['pn'] and pn: devs[cle]['pn'] = pn
            if not devs[cle]['desc'] and desc: devs[cle]['desc'] = desc
            return
        devs[cle] = dict(tag=unique(brut, MAXI['dev'], tags_pris), type=genre, pn=pn, desc=desc, parent=parent, prise=prise, accouple=accouple, pins=[])
    def pn_si_vide(cle, pn):
        if cle in devs and pn and not devs[cle]['pn']: devs[cle]['pn'] = pn
    for b in [b for b in P['Blocs'] if b['Folio'] == f]:
        bl, nat, rep, pn, desc = texte(b['Bloc']), texte(b['Nature']).upper(), texte(b['Repere']), texte(b['PN']), texte(b['Description'])
        rep = rep or bl
        nature.setdefault(bl, nat); repere.setdefault(bl, rep)
        if nat == 'EQUIPEMENT':
            appareil('B|' + rep, rep, 'Equipment', pn, desc)
            for c in pieces.get(bl, []):
                lettre = texte(c['Lettre'])
                if lettre: appareil(f'C|{rep}|{lettre}', f'{rep}-{lettre}', 'Connector', texte(c['PN']), '', 'B|' + rep)
        elif nat == 'PRISE':
            appareil(f'P|{rep}|FICHE', rep + '-FICHE', 'Connector', '', desc, '', 'Plug', f'P|{rep}|EMBASE')
            appareil(f'P|{rep}|EMBASE', rep + '-EMBASE', 'Connector', '', desc, '', 'Receptacle', f'P|{rep}|FICHE')
            for c in pieces.get(bl, []):
                lettre = texte(c['Lettre']).upper()
                if lettre in ('FICHE', 'EMBASE'): pn_si_vide(f'P|{rep}|{lettre}', texte(c['PN']))
            pn_si_vide(f'P|{rep}|FICHE', pn); pn_si_vide(f'P|{rep}|EMBASE', pn)
        elif nat in ('BARRETTE', 'BARRETTE_A_POSER', 'RAIL'):
            appareil('B|' + rep, rep, BORNIER, pn, desc)
        elif nat in ('MASSE', 'COLLECTEUR'):
            appareil('B|' + rep, rep, MASSE, pn, desc)
    broche, pins_pris, du_bout = {}, set(), {}
    def appareil_de(bl, con):
        if bl not in nature: return ''
        nat, rep = nature[bl], repere[bl]
        if nat == 'EQUIPEMENT':
            if not con: return 'B|' + rep
            k = f'C|{rep}|{con}'
            if k not in devs: appareil(k, f'{rep}-{con}', 'Connector', '', '', 'B|' + rep)
            return k
        if nat == 'PRISE':
            return f'P|{rep}|{con.upper()}' if con.upper() in ('FICHE', 'EMBASE') else ''
        return 'B|' + rep if 'B|' + rep in devs else ''
    for r in [r for r in P['Bornes'] if r['Folio'] == f]:
        bl, borne, con = texte(r['Bloc']), texte(r['Borne']), texte(r['Connecteur'])
        cle = (bl, borne, cote(con))
        if cle in du_bout: continue
        dev = du_bout[cle] = appareil_de(bl, con)
        if dev and f'{dev}|{borne}' not in broche:
            if devs[dev]['type'] == MASSE and devs[dev]['pins']:     # une masse : un seul point, tous ses fils dessus
                broche[f'{dev}|{borne}'] = devs[dev]['pins'][0]
                continue
            brut = texte(r['Numero']) or borne or '1'
            if f'{dev}|{couper(brut, MAXI["pin"])}' in pins_pris and borne: brut = borne
            t = unique(brut, MAXI['pin'], pins_pris, dev + '|')
            broche[f'{dev}|{borne}'] = t
            devs[dev]['pins'].append(t)
    fils, bouts, fils_pris = [], [], set()
    def bout(r, quel):
        cle = (texte(r[quel + 'Bloc']), texte(r[quel + 'Borne']), cote(texte(r[quel + 'Cote'])))
        dev = du_bout.get(cle, '')
        return (devs[dev]['tag'], broche[f'{dev}|{cle[1]}']) if dev else None
    for r in [r for r in P['Fils'] if r['Folio'] == f]:
        de, vers = bout(r, 'De'), bout(r, 'Vers')
        if de is None and vers is None: continue
        tag = unique(texte(r['Fil']) or f"F{f}-{texte(r['Ordre']) or '0'}", MAXI['fil'], fils_pris)
        longueur, statut = '0', 'Estimation'
        if isinstance(r.get('Longueur'), (int, float)) and r['Longueur'] > 0:
            longueur, statut = texte(r['Longueur'] * 1000), 'Manual'
        genre = 'Shunt' if texte(r['Shunt']).upper() == 'O' else 'Normal'      # un fil blindé : Normal (FORMAT-WD)
        fils.append((tag, {'Tag': tag, 'Wire_Type': couper(texte(r['Type']), MAXI['type']), 'Gauge': couper(texte(r['Jauge']), MAXI['jauge']),
                           'Length': longueur, 'Length_Status': statut, 'Type': genre, 'Segregation': couper(texte(r['Route']) or '1', MAXI['seg'])}))
        for n, b in ((1, de), (2, vers)):
            if b:
                i = couper(tag, MAXI['fil'] - 2) + f'-{n}'
                bouts.append((i, {'ID': i, 'WireTag': tag, 'Pin': b[1], 'PinParent': b[0]}))
    appareils = []
    for d in devs.values():
        appareils.append(dict(d, accouple=devs[d['accouple']]['tag'] if d['accouple'] in devs else '',
                              parent=devs[d['parent']]['tag'] if d['parent'] in devs else '', pins=list(d['pins'])))
    return appareils, fils, bouts

def nouveau():
    return {'devs': {}, 'fils': {}, 'bouts': {}}

def verser(h, appareils, fils, bouts):
    """VerserWD : un appareil par Tag (le premier garde son Type ; un attribut encore vide se remplit ; les broches
    réunies, dans l'ordre), un fil par Tag, un bout par ID ; ce qui est déjà versé reste."""
    for a in appareils:
        d = h['devs'].get(a['tag'])
        if d is None:
            h['devs'][a['tag']] = dict(a, pins=list(a['pins']))
            continue
        for k in ('prise', 'accouple', 'parent', 'pn', 'desc'):
            if not d[k] and a[k]: d[k] = a[k]
        d['pins'] += [p for p in a['pins'] if p not in d['pins']]
    for k, w in fils: h['fils'].setdefault(k, w)
    for k, e in bouts: h['bouts'].setdefault(k, e)

def ecrit(h, tag, titre):
    """XmlHarnaisWD : (attributs du WireHarness, appareils [(attributs, broches)], fils, bouts) ; un équipement n'a de
    PartNumber que si aucun de ses connecteurs n'en a un ; moins de deux bouts : aucun."""
    avec_pn = {d['parent'] for d in h['devs'].values() if d['parent'] and d['pn']}
    appareils = []
    for d in h['devs'].values():
        a = {'Tag': d['tag'], 'Type': d['type']}
        if d['prise']: a['ConnectivityType'] = d['prise']
        if d['accouple']: a['MatingTag'] = d['accouple']
        if d['parent']: a['ParentTag'] = d['parent']
        if d['pn'] and not (d['type'] == 'Equipment' and d['tag'] in avec_pn): a['PartNumber'] = couper(d['pn'], MAXI['pn'])
        if d['desc']: a['Description'] = couper(d['desc'], MAXI['desc'])
        appareils.append((a, d['pins']))
    bouts = list(h['bouts'].values())
    hd = {'Tag': tag}
    if titre: hd['Description'] = couper(titre, MAXI['desc'])
    return hd, appareils, list(h['fils'].values()), bouts if len(bouts) >= 2 else []

def attendu(P, schema):
    """Les fichiers attendus : {nom: [(attributs du WireHarness, appareils, fils, bouts)]} ; WD-TOUT : un WireHarness par
    harness, dans l'ordre des folios, les folios d'un même harness réunis (verser)."""
    fichiers, noms, tout, ordre = {}, {'tout'}, {}, []
    for fo in sorted(P['Folios'], key=lambda r: r['Folio']):
        f = fo['Folio']
        appareils, fils, bouts = harnais(P, f)
        tag, titre = couper(texte(fo['Harness']) or texte(fo['Nom']) or f'F{f}', MAXI['harnais']), texte(fo['Titre'])
        h = nouveau()
        verser(h, appareils, fils, bouts)
        base = nom_fichier(texte(fo['Nom']), f'F{f}')
        while base.lower() in noms: base += f'-F{f}'
        noms.add(base.lower())
        fichiers['WD-' + base + '.xml'] = [ecrit(h, tag, titre)]
        if tag not in tout:
            tout[tag] = [nouveau(), titre]
            ordre.append(tag)
        elif not tout[tag][1]:
            tout[tag][1] = titre
        verser(tout[tag][0], appareils, fils, bouts)
    fichiers['WD-TOUT.xml'] = [ecrit(tout[t][0], t, tout[t][1]) for t in ordre]
    if not schema:      # sans schéma : seulement les attributs de l'essai du bureau
        filtre = lambda e, a: {k: v for k, v in a.items() if k in SURS[e]}
        fichiers = {n: [(filtre('WireHarness', h), [(filtre('ConnectiveDevice', a), p) for a, p in ap], fi, bo) for h, ap, fi, bo in hs] for n, hs in fichiers.items()}
    return fichiers

def lu(fichier):
    """Ce que dit un fichier : (racine, [(attributs du WireHarness, appareils, fils, bouts)])."""
    racine = etree.parse(fichier).getroot()
    hs = []
    for h in racine.findall('WireHarness'):
        ap = [(dict(d.attrib), [p.get('Tag') for p in d.findall('Pin')]) for d in h.findall('ConnectiveDevicesList/ConnectiveDevice')]
        hs.append((dict(h.attrib), ap, [dict(w.attrib) for w in h.findall('WiresList/Wire')], [dict(e.attrib) for e in h.findall('WiresExtremitiesList/WireExtremity')]))
    return racine, hs

def speciaux(hs):
    """Les valeurs écrites qui demandent un échappement (& < > " ' ou hors ASCII)."""
    vals = []
    for h, ap, fi, bo in hs:
        vals += list(h.values()) + [v for a, p in ap for v in list(a.values()) + p] + [v for w in fi + bo for v in w.values()]
    return [v for v in vals if any(c in v for c in '&<>"\'') or any(ord(c) > 127 for c in v)]

def verifier(dossier, P, schema):
    chemin = os.path.join(TRAVAIL, dossier)
    if not os.path.isdir(chemin):
        return f'{dossier} : ABSENT'
    att = attendu(P, schema)
    presents = sorted(n for n in os.listdir(chemin) if n.endswith('.xml'))
    valides = ascii_ = interdits = sans_broche = doublons = hors_essai = shield = pn_equipement = 0
    harnais_tout = -1
    nb = {k: [0, 0] for k in ('appareils', 'broches', 'fils', 'bouts')}
    ecarts, aech = [], [0, 0]
    for n in presents:
        f = os.path.join(chemin, n)
        if subprocess.run(['xmllint', '--noout', '--schema', XSD, f], capture_output=True).returncode == 0: valides += 1
        else: ecarts.append(f'{n} : xmllint refuse')
        octets = open(f, 'rb').read()
        if all(b < 128 for b in octets): ascii_ += 1
        racine, hs = lu(f)
        for e in racine.iter():
            interdits += sum(1 for a in e.attrib if a in ('WiresNumber', 'Class'))
            if not schema and e.tag in SURS: hors_essai += sum(1 for a in e.attrib if a not in SURS[e.tag])
        if (racine.get('EDB_InstanceID'), racine.get('XSDversion'), racine.get('LengthUnit')) != ('1', '3.10', 'millimeter'):
            ecarts.append(f'{n} : racine {dict(racine.attrib)}')
        if n == 'WD-TOUT.xml': harnais_tout = len(hs)
        for h, ap, fi, bo in hs:
            broches = {a['Tag']: p for a, p in ap}
            shield += sum(1 for w in fi if w.get('Type') == 'Shield')
            pn_equipement += sum(1 for a, p in ap if a.get('Type') == 'Equipment' and a.get('PartNumber')
                                 and any(b.get('ParentTag') == a['Tag'] and b.get('PartNumber') for b, q in ap))
            sans_broche += sum(1 for e in bo if e.get('Pin') not in broches.get(e.get('PinParent'), []))
            doublons += (len(ap) - len(broches)) + sum(len(p) - len(set(p)) for p in broches.values())
            doublons += (len(fi) - len({w.get('Tag') for w in fi})) + (len(bo) - len({e.get('ID') for e in bo}))
        a = att.get(n)
        if a is None:
            ecarts.append(f'{n} : fichier en trop'); continue
        if n != 'WD-TOUT.xml':       # les comptes : sur les fichiers des folios (WD-TOUT les redit)
            for _, ap, fi, bo in a:
                nb['appareils'][1] += len(ap); nb['broches'][1] += sum(len(p) for _, p in ap); nb['fils'][1] += len(fi); nb['bouts'][1] += len(bo)
            for _, ap, fi, bo in hs:
                nb['appareils'][0] += len(ap); nb['broches'][0] += sum(len(p) for _, p in ap); nb['fils'][0] += len(fi); nb['bouts'][0] += len(bo)
        if len(a) != len(hs):
            ecarts.append(f'{n} : {len(hs)} WireHarness, attendu {len(a)}'); continue
        for i, (x, y) in enumerate(zip(hs, a)):
            for quoi, u, v in (('WireHarness', x[0], y[0]), ('appareils', x[1], y[1]), ('fils', x[2], y[2]), ('bouts', x[3], y[3])):
                if u != v:
                    if isinstance(u, list):
                        k = next((j for j in range(min(len(u), len(v))) if u[j] != v[j]), min(len(u), len(v)))
                        ecarts.append(f'{n} (harness {i + 1}) {quoi} n° {k + 1} : lu {str(u[k] if k < len(u) else "rien")[:160]} ; attendu {str(v[k] if k < len(v) else "rien")[:160]}')
                    else:
                        ecarts.append(f'{n} (harness {i + 1}) {quoi} : lu {str(u)[:160]} ; attendu {str(v)[:160]}')
        s_lu, s_att = speciaux(hs), speciaux(a)
        aech[1] += len(s_att); aech[0] += sum(1 for v in s_att if v in s_lu)
    manquants = [n for n in att if n not in presents]
    ecarts += [f'{n} : manquant' for n in manquants]
    s = (f'{dossier} : fichiers {len(presents)} / attendus {len(att)} ; xmllint valides {valides}/{len(presents)} ; ASCII {ascii_}/{len(presents)} ; '
         f'WiresNumber ou Class {interdits} ; bouts sans broche {sans_broche} ; Tag en double {doublons} ; WD-TOUT : {harnais_tout} WireHarness ; '
         f'fils Shield {shield} ; PartNumber d\'un équipement dont un connecteur en a un {pn_equipement} ; '
         + ' ; '.join(f'{k} {u}/{v}' for k, (u, v) in nb.items()) + f' ; valeurs à échapper relues {aech[0]}/{aech[1]}')
    if not schema: s += f' ; attributs hors essai {hors_essai}'
    s += f' ; écarts au calcul {len(ecarts)}' + (' [' + ' / '.join(ecarts[:3]) + ']' if ecarts else '')
    return s

def essai():
    """Les fichiers d'EssaiWD (robot-wd) : un par schéma trouvé, puis la série d'essais T01 à T10 de la 3.10 ;
    Essai-WD-3.10.xml valide pour xmllint, sans WiresNumber ni Class ; chaque essai T valide pour xmllint ; le Type de
    l'appareil seul des essais T06 à T10 (masse GB1, bornier TB1, barrette BB1, épissure SP1, prise de coupure PB1)."""
    d = os.path.join(TRAVAIL, 'robot-wd')
    noms = sorted(n for n in os.listdir(d) if n.startswith('Essai-WD-')) if os.path.isdir(d) else []
    def valide(n):
        f = os.path.join(d, n)
        return os.path.exists(f) and subprocess.run(['xmllint', '--noout', '--schema', XSD, f], capture_output=True).returncode == 0
    f = os.path.join(d, 'Essai-WD-3.10.xml')
    interdits = sum(1 for e in etree.parse(f).getroot().iter() for a in e.attrib if a in ('WiresNumber', 'Class')) if os.path.exists(f) else -1
    serie = [n for n in noms if n.startswith('Essai-WD-T')]
    types = sorted({f"{e.get('Tag')}={e.get('Type')}" for n in serie for e in etree.parse(os.path.join(d, n)).getroot().iter('ConnectiveDevice')
                    if e.get('Tag') in ('GB1', 'TB1', 'BB1', 'SP1', 'PB1')})
    return (f'robot-wd : fichiers d\'essai {len(noms)} ; Essai-WD-3.10.xml xmllint {"valide" if valide("Essai-WD-3.10.xml") else "REFUSÉ"} ; '
            f'WiresNumber ou Class {interdits} ; série T de la 3.10 : {len(serie)} fichiers, valides pour xmllint {sum(1 for n in serie if valide(n))} ; '
            f'appareils seuls {",".join(types) or "aucun"}')

P, V, H = lire(PAQUET), lire(VARIANTE), lire(UN_HARNESS)
for dossier, paquet, schema in (('WD-paquet-exemple', P, True), ('WD-paquet-wd', V, True), ('WD-paquet-wd-h1', H, True), ('WD-paquet-wd-refus', P, True),
                                ('WD-paquet-wd-sans', P, False)):
    print(verifier(dossier, paquet, schema))
print(essai())
