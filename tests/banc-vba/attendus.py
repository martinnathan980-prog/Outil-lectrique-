# Ce que « conforme » veut dire pour chaque scénario du banc VBA.
#
#   python3 attendus.py --liste
#       les passages que lancer.sh doit faire, un par ligne, séparés par des tabulations :
#       <nom affiché>  <relecture|regression>  <nom du scénario dans ce programme>  <paquet variante ou ->
#       Les scénarios sont LUS dans relecture.py et regression.py (la liste SCEN de chacun) : un
#       scénario ajouté là est lancé même sans attendu ici ; il n'a alors que le critère « va au bout ».
#       « variante V5 » passe une fois par paquet variante (tout, casse, noms, long).
#   python3 attendus.py "<nom affiché>" <sortie.txt> [durée en s] [note]
#       relit la sortie d'un passage (ce que relecture.py / regression.py ont écrit) et écrit son
#       verdict : CONFORME ou NON CONFORME, puis chaque critère, « ok » ou « ÉCART » avec la valeur lue.
#       Code de sortie : 0 si conforme, 1 sinon.
#
# D'où viennent les valeurs :
#   - celles des scénarios marqués RELEVÉ ont été relevées sur le code du dépôt du 10 octobre 2026 et
#     données comme attendues ; si l'une change, c'est le code VBA (ou le paquet d'exemple) qui a changé :
#     comprendre pourquoi avant de toucher à ce fichier ;
#   - celles marquées INTENTION ne sont pas des relevés : elles disent ce que le scénario est fait pour
#     montrer (le commentaire du scénario dans BancR.bas, celui du code VBA, ou variante.js) ;
#   - « va au bout » (tous les scénarios) : la macro du banc rend son texte, sans « ERREUR VBA » (une
#     erreur sortie du pilote jusqu'au banc) ni « EXCEPTION » (le pont UNO ou LibreOffice tombé).
import ast, os, re, sys

ICI = os.path.dirname(os.path.abspath(__file__))
VARIANTES = [('tout', 'paquet-variante.xlsx'), ('casse', 'paquet-casse.xlsx'), ('noms', 'paquet-noms.xlsx'), ('long', 'paquet-long.xlsx')]


# ---------------------------------------------------------------- lecture d'une sortie
def resultat(t):
    """Le texte rendu par la macro du banc (la ligne « Module.Macro -> … (x.x s) »)."""
    m = re.search(r'^\S+ -> (.*?)  \(\d+\.\d s\)$', t, re.M | re.S)
    return m.group(1) if m else None

def partie(t, debut):
    """Le morceau du résultat qui commence par « debut » (les morceaux sont séparés par « | »)."""
    r = resultat(t) or ''
    for p in r.split(' | '):
        if p.strip().startswith(debut):
            return p.strip()
    return ''

def nombres(motif, ou=None):
    """Les entiers capturés par « motif », cherché dans un morceau du résultat, ou dans toute la sortie."""
    def f(t):
        m = re.search(motif, partie(t, ou) if ou else t)
        if not m: return None
        v = tuple(int(x) for x in m.groups())
        return v[0] if len(v) == 1 else v
    return f

def texte(motif):
    """Le texte capturé par « motif » dans le résultat de la macro (None s'il n'y est pas)."""
    def f(t):
        m = re.search(motif, resultat(t) or '')
        return m.group(1) if m else None
    return f

def folios_see(ou=None):
    """La liste « SEE [1,~2,3,] » d'un morceau du résultat : ['1', '~2', '3']."""
    def f(t):
        m = re.search(r'SEE \[([^\]]*)\]', partie(t, ou) if ou else (resultat(t) or ''))
        return None if not m else [x for x in m.group(1).split(',') if x != '']
    return f

def bilan(ou=None):
    """Le bilan écrit par EtatsBilan (BancR.bas) : [('1', 'SAUVE'), ('2', 'ERREUR'), …]."""
    def f(t):
        texte = partie(t, ou) if ou else (resultat(t) or '')
        m = re.search(r'bilan ((?:[^=;|]+=[^;|]+? ;(?: |$))*)', texte)
        return None if not m else [(k.strip(), v.strip()) for k, v in re.findall(r'([^=;|]+)=([^;|]+?) ;', m.group(1))]
    return f

def bilan_regression(t):
    """Le bilan écrit par regression.py : ['SAUVE', 'SAUVE', …]."""
    m = re.search(r'^    bilan (\[.*\])$', t, re.M)
    return ast.literal_eval(m.group(1)) if m else None

def traces_regression(t):
    """Les traces du faux SEE comptées par regression.py : {'AddSheet': 6, …} ({} : aucune écriture)."""
    m = re.search(r'^    traces (\{.*\})$', t, re.M)
    return ast.literal_eval(m.group(1)) if m else None

def court(v, n=160):
    if isinstance(v, list) and v and all(isinstance(x, tuple) and len(x) == 2 for x in v):
        v = ' '.join(f'{k}={e}' for k, e in v)          # un bilan : « 1=SAUVE 2=ERREUR »
    elif isinstance(v, list):
        v = '[' + ', '.join(str(x) for x in v) + ']'
    s = str(v)
    return s if len(s) <= n else s[:n] + ' …'


# ---------------------------------------------------------------- les critères
# Un critère : (libellé, extraire(sortie) -> valeur lue, test(valeur) -> bool).
def egal(libelle, extraire, attendu):
    return (libelle, extraire, lambda v: v == attendu)

def au_moins(libelle, extraire, n):
    return (libelle, extraire, lambda v: isinstance(v, int) and v >= n)

def tous(libelle, extraire, etat, nombre=None):
    """Un bilan dont toutes les lignes valent « etat » (et, si « nombre » est donné, qui en a autant)."""
    def test(v):
        if not v: return False
        etats = [e for _, e in v] if isinstance(v[0], tuple) else v
        return all(e == etat for e in etats) and (nombre is None or len(etats) == nombre)
    return (libelle, extraire, test)

def va_au_bout():
    def extraire(t):
        r = resultat(t)
        return r if r is not None else 'pas de résultat (soffice tombé ? voir la sortie)'
    return ('va au bout', extraire, lambda r: resultat_ok(r))

def resultat_ok(r):
    return bool(r) and not r.startswith('pas de résultat') and not r.startswith('EXCEPTION') and 'ERREUR VBA' not in r

def version(v):
    return egal(f'API V{v} retenue', texte(r'^(?:fini ; )?V(\d) ;'), str(v))

def complet(v, relecture_impossible=None, masses=True):
    """complet V5 / V4, relecture ratée : RELEVÉ."""
    c = [version(v),
         tous('6 folios, tous SAUVE', bilan(), 'SAUVE', 6),
         egal('fils tracés 210 sur 210', nombres(r'fils tracés (\d+) attendus (\d+)'), (210, 210)),
         egal('bouts faux 0', nombres(r'bouts faux (\d+)'), 0),
         egal('segments obliques 0', nombres(r'segments obliques (\d+)'), 0),
         egal('broches recalées sur leur point de pose 309, hors 0', nombres(r'broches recalées sur leur point de pose \(contact\) (\d+) hors (\d+)'), (309, 0))]
    if relecture_impossible is not None:
        c.append(egal(f'« relecture impossible » {relecture_impossible}', nombres(r'relecture impossible (\d+)', None), relecture_impossible))
    if masses:
        c.append(egal('masses Sens D 25 / G 17, posées à 180° : 25, à 0° : 17',
                      nombres(r'masses Sens D (\d+) / G (\d+) ; symboles MASSE posés à 180° : (\d+), à 0° : (\d+)'), (25, 17, 25, 17)))
    return c

def variante(quoi):
    """INTENTION (variante.js) : la variante passe comme le paquet d'exemple ; le nom en double et le numéro
    trop long sont dits au journal sans arrêter le folio ; les bornes « A » et « a » reçoivent chacune leur fil."""
    c = [version(5),
         tous('6 folios, tous SAUVE', bilan(), 'SAUVE', 6),
         ('tous les fils du paquet tracés', nombres(r'fils tracés (\d+) attendus (\d+)'), lambda v: isinstance(v, tuple) and v[0] == v[1] and v[0] > 0),
         egal('bouts faux 0', nombres(r'bouts faux (\d+)'), 0),
         egal('segments obliques 0', nombres(r'segments obliques (\d+)'), 0),
         ('broches recalées : aucune hors de son point de pose', nombres(r'broches recalées sur leur point de pose \(contact\) (\d+) hors (\d+)'), lambda v: isinstance(v, tuple) and v[1] == 0 and v[0] > 0)]
    if quoi in ('tout', 'noms'):
        c.append(au_moins('« nom en double » dit au journal', nombres(r'nom en double (\d+)', None), 1))
    if quoi in ('tout', 'long'):
        c.append(au_moins('« ordre hors limite » dit au journal', nombres(r'ordre hors limite (\d+)', None), 1))
    return c

ATTENDUS = {
    # ---- relecture.py (BancR.bas) ----
    'complet V5': complet(5, relecture_impossible=0),     # RELEVÉ (« relecture impossible » 0 : relecture ratée en diffère)
    'complet V4': complet(4),                               # RELEVÉ ; « numéros différents 201 » est normal en V4 (ChangeTag après coup)
    'relecture ratée V5': complet(5, relecture_impossible=732, masses=False),   # RELEVÉ
    'interrompu': [                                         # RELEVÉ
        egal('passage 1 : SEE [1,~2,3]', folios_see('passage 1'), ['1', '~2', '3']),
        egal('passage 1 : bilan 1=SAUVE 2=ERREUR 3=SAUVE', bilan('passage 1'), [('1', 'SAUVE'), ('2', 'ERREUR'), ('3', 'SAUVE')]),
        egal('relance : SEE [1,3,2]', folios_see('relance'), ['1', '3', '2']),
        egal('relance : bilan 1=SAUTE (existe) 2=SAUVE 3=SAUTE (existe)', bilan('relance'), [('1', 'SAUTE (existe)'), ('2', 'SAUVE'), ('3', 'SAUTE (existe)')]),
        egal('relance : DeleteSheet 1', nombres(r'DeleteSheet (\d+)', 'relance'), 1)],
    'remplacer': [                                          # RELEVÉ
        egal('SEE [1,2,3]', folios_see(), ['1', '2', '3']),
        tous('bilan tous SAUVE', bilan(), 'SAUVE', 3),
        egal('AddSheet 6', nombres(r'AddSheet (\d+)', None), 6),
        egal('DeleteSheet 3', nombres(r'DeleteSheet (\d+)', None), 3)],
    'liste': [                                              # RELEVÉ
        egal('passage 1 : SEE [1,2,3]', folios_see('passage 1'), ['1', '2', '3']),
        tous('relance : bilan tous SAUTE (existe)', bilan('relance'), 'SAUTE (existe)', 3),
        egal('liste illisible : AddSheet 0', nombres(r'AddSheet (\d+)', 'liste illisible'), 0),
        au_moins('liste illisible : arrêt dit au journal', nombres(r'arrêt dit (\d+)', 'liste illisible'), 1)],
    'renommage': [                                          # RELEVÉ
        egal('AddSheet 3', nombres(r'AddSheet (\d+)', None), 3),
        egal('DeleteSheet 3', nombres(r'DeleteSheet (\d+)', None), 3),
        tous('bilan : 3 ERREUR', bilan(), 'ERREUR', 3),
        au_moins('arrêt du lot dit au journal', nombres(r'arrêt dit (\d+)', None), 1)],
    'sauvegardes': [                                        # RELEVÉ
        egal('bilan A1=DESSINE A2=DESSINE B1=SAUVE B2=SAUVE', bilan(), [('A1', 'DESSINE'), ('A2', 'DESSINE'), ('B1', 'SAUVE'), ('B2', 'SAUVE')])],
    'automation': [                                         # RELEVÉ
        egal('réel : traces 0', nombres(r'traces (\d+)', 'réel'), 0),
        egal('simulation : traces 0', nombres(r'traces (\d+)', 'simulation'), 0),
        tous('simulation : bilan tous SIMULE', bilan('simulation'), 'SIMULE')],
    'simulation zone': [                                    # RELEVÉ
        egal('écritures pendant la simulation 0', nombres(r'écritures pendant la simulation (-?\d+)', None), 0),
        ('ouverture du projet en lecture seule', nombres(r'ouvertures (\d+) \(lecture seule : (\d+)\)', None), lambda v: isinstance(v, tuple) and v[0] >= 1 and v[0] == v[1])],
    'essai existant': [                                     # RELEVÉ
        egal('DeleteSheet 0', nombres(r'DeleteSheet (\d+)', None), 0)],
    'version': [                                            # INTENTION (VBA-2 : le réglage VersionAPI relu par une macro suivante)
        egal('auto : V5', texte(r'auto : (V\d)'), 'V5'),
        egal('après VersionAPI = V4 : V4', texte(r'après VersionAPI = V4 : (V\d)'), 'V4')],
    'apostrophe': [                                         # INTENTION (VBA-1 ; SEE_Commun : réglages écrits sans apostrophe, une apostrophe de tête n'est pas une valeur)
        egal('écrit par InitialiserClasseur sans apostrophe : [O]', texte(r'écrit par InitialiserClasseur : \[([^\]]*)\]'), 'O'),
        egal("cellule « 'N » lue N", texte(r'Simulation lue : (\S+)'), 'N')],
    # ---- regression.py (BancFaux, dans faux.py) ----
    'simulation sans SEE': [                                # INTENTION : une simulation ne dessine rien
        tous('bilan tout SIMULE', bilan_regression, 'SIMULE')],
    'essais V5': [version(5)],                              # INTENTION : l'essai va au bout en V5
    'essais V4': [version(4)],                              # INTENTION : l'essai va au bout en V4
    'sondes V5': [version(5), au_moins('jusqu\'à la dernière sonde (« folio de la vue »)', nombres(r'folio de la vue (\d+)', None), 0)],   # RELEVÉ
    'sondes V4': [version(4), au_moins('jusqu\'à la dernière sonde (« folio de la vue »)', nombres(r'folio de la vue (\d+)', None), 0)],   # RELEVÉ
    'modes V5': [version(5), tous('bilan tout SAUVE', bilan_regression, 'SAUVE')],         # RELEVÉ
    'modes V4': [version(4), tous('bilan tout SAUVE', bilan_regression, 'SAUVE')],         # RELEVÉ
    'journal NORMAL': [tous('bilan tout SAUVE', bilan_regression, 'SAUVE')],               # RELEVÉ
    'simulation avec SEE V5': [version(5), egal('traces {} (aucune écriture dans SEE)', traces_regression, {}), tous('bilan tout SIMULE', bilan_regression, 'SIMULE')],   # RELEVÉ
    'simulation avec SEE V4': [version(4), egal('traces {} (aucune écriture dans SEE)', traces_regression, {}), tous('bilan tout SIMULE', bilan_regression, 'SIMULE')],   # RELEVÉ
}
for quoi, _ in VARIANTES:
    ATTENDUS[f'variante V5 ({quoi})'] = variante(quoi)
# « formes » et « unite » : pas d'attendu propre (ils montrent un comportement à lire) ; « va au bout » seulement.


# ---------------------------------------------------------------- les passages
def scenarios(programme):
    """Les noms de la liste SCEN de relecture.py ou de regression.py, dans leur ordre."""
    texte = open(os.path.join(ICI, programme + '.py'), encoding='utf-8').read()
    motif = r"^\s*\('([^']+)', lambda d: lancer" if programme == 'relecture' else r"\('([^']+)', '\w+\.\w+', \("
    return re.findall(motif, texte, re.M)

def passages():
    """[(nom affiché, programme, scénario, variante ou '-')], dans l'ordre où lancer.sh les fait."""
    p = []
    for programme in ('relecture', 'regression'):
        for s in scenarios(programme):
            if programme == 'relecture' and s == 'variante V5':
                p += [(f'{s} ({quoi})', programme, s, fichier) for quoi, fichier in VARIANTES]
            else:
                p.append((s, programme, s, '-'))
    return p

def juger(nom, t):
    """(conforme, [(ok, libellé, valeur lue)])."""
    lignes = []
    for libelle, extraire, test in [va_au_bout()] + ATTENDUS.get(nom, []):
        try:
            v = extraire(t)
            ok = bool(test(v))
        except Exception as e:
            v, ok = f'illisible ({e!r})', False
        lignes.append((ok, libelle, v))
    return all(ok for ok, _, _ in lignes), lignes


if __name__ == '__main__':
    if sys.argv[1:] == ['--liste']:
        for p in passages():
            print('\t'.join(p))
        sys.exit(0)
    if len(sys.argv) < 3:
        raise SystemExit('usage : python3 attendus.py --liste | "<nom affiché>" <sortie.txt> [durée] [note]')
    nom, fichier = sys.argv[1], sys.argv[2]
    duree = f'  ({sys.argv[3]} s)' if len(sys.argv) > 3 and sys.argv[3] else ''
    note = f'  [{sys.argv[4]}]' if len(sys.argv) > 4 and sys.argv[4] else ''
    t = open(fichier, encoding='utf-8', errors='replace').read() if os.path.exists(fichier) else ''
    conforme, lignes = juger(nom, t)
    print(f"{'CONFORME    ' if conforme else 'NON CONFORME'}  {nom}{duree}{note}")
    if nom not in ATTENDUS and nom not in ('formes', 'unite'):
        print('      (aucun attendu propre dans attendus.py : « va au bout » seulement)')
    for ok, libelle, v in lignes:
        print(f"      {'ok   ' if ok else 'ÉCART'}  {libelle} : {court(v)}")
    sys.exit(0 if conforme else 1)
