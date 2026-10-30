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
# les scénarios qui jouent un autre paquet que celui de l'exemple (v_pn.js : des PN vides, un connecteur à deux PN)
VARIANTE_DE = {'materiel V5': 'paquet-pn.xlsx', 'materiel V4': 'paquet-pn.xlsx'}


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

def dans(ou, motif):
    """Le texte capturé par « motif » dans un morceau du résultat (None s'il n'y est pas)."""
    def f(t):
        m = re.search(motif, partie(t, ou))
        return m.group(1) if m else None
    return f

# la ligne de verifier.py --materiel : ce que le pilote DOIT faire, calculé depuis le paquet
MOTIF_MATERIEL = (r'matériels : tentatives attendues (\d+) \(corps (\d+), connecteurs (\d+)\) ; refus attendus (\d+) ; '
                  r'associés attendus (\d+) ; associés lus (\d+) \(corps (\d+), connecteurs (\d+)\) ; classe ou code faux (\d+) ; '
                  r'manquants (\d+) ; en trop (\d+) ; corps sans PN attendus (\d+) ; corps dessinés attendus (\d+) ; '
                  r'connecteurs sans PN attendus (\d+) ; PN différents attendus (\d+)')
def calcule(i):
    """Le i-ème nombre de la ligne de verifier.py --materiel (0 : tentatives, 3 : refus, 4 : associés…)."""
    def f(t):
        v = nombres(MOTIF_MATERIEL)(t)
        return v[i] if isinstance(v, tuple) else None
    return f

def egal_au_calcul(libelle, lu, i, non_nul=True):
    """Un nombre lu (dans le résultat de la macro) égal à celui que verifier.py calcule depuis le paquet (et non nul :
    le chemin est bien joué)."""
    return (libelle, lambda t: (lu(t), calcule(i)(t)),
            lambda v: v[0] is not None and v[0] == v[1] and (not non_nul or v[1] > 0))

def materiel(v):
    """INTENTION (SEE_Pilote, le matériel) sur la variante « pn » (v_pn.js) ; les nombres attendus sont CALCULÉS par
    verifier.py --materiel depuis le paquet : ce que le pilote doit associer (corps posés en symbole, connecteurs servis
    une fois), ce que le faux catalogue refuse (codes « * »), ce qu'il doit taire et dire (PN vides, corps dessinés,
    un connecteur à deux PN). La géométrie ne doit pas bouger."""
    return [version(v),
            tous('6 folios, tous SAUVE (un refus du catalogue n\'arrête pas le folio)', bilan('V'), 'SAUVE', 6),
            egal('fils tracés 210 sur 210', nombres(r'fils tracés (\d+) attendus (\d+)'), (210, 210)),
            egal('bouts faux 0', nombres(r'bouts faux (\d+)'), 0),
            egal('segments obliques 0', nombres(r'segments obliques (\d+)'), 0),
            egal('broches recalées sur leur point de pose 309, hors 0', nombres(r'broches recalées sur leur point de pose \(contact\) (\d+) hors (\d+)'), (309, 0)),
            ('associations lues dans la trace = associations attendues (non nul)', lambda t: (calcule(5)(t), calcule(4)(t)),
             lambda w: w[0] is not None and w[0] == w[1] and w[1] > 0),
            egal('associations : classe ou code faux 0, manquantes 0, en trop 0', lambda t: (calcule(8)(t), calcule(9)(t), calcule(10)(t)), (0, 0, 0)),
            egal_au_calcul('refus du catalogue dits au journal = refus attendus', nombres(r'refus dits (\d+)', 'V'), 3),
            egal_au_calcul('corps sans PN dits = attendus', nombres(r'corps sans PN dits (\d+)', 'V'), 11),
            egal_au_calcul('corps dessinés (PN non associé) dits = attendus', nombres(r'corps dessinés dits (\d+)', 'V'), 12),
            egal_au_calcul('connecteurs sans PN : une ligne par bloc, comme attendu', nombres(r'connecteurs sans PN dits (\d+)', 'V'), 13),
            egal_au_calcul('un connecteur à deux PN : dit, le premier gardé', nombres(r'PN différents dits (\d+)', 'V'), 14),
            egal('matériel relu après chaque association : « non relu » 0', nombres(r'non relus (\d+)', 'V'), 0),
            egal('relecture : SEE rend ce qu\'il a reçu (« relecture différente » 0)', nombres(r'relectures différentes (\d+)', 'V'), 0),
            egal_au_calcul('matériels au bilan (colonne Materiels) = associés attendus', nombres(r'matériels au bilan (\d+)', 'V'), 4),
            ('SondeFolio relit le matériel du folio 1 (corps et connecteurs) comme attendu',
             lambda t: (nombres(r'sonde : matériels relus (\d+) \(corps (\d+), connecteurs (\d+)\)', 'sonde')(t),
                        nombres(r'relus attendus sur le folio 1 : (\d+) \(corps (\d+), connecteurs (\d+)\)')(t)),
             lambda w: w[0] is not None and w[0] == w[1] and w[1][0] > 0),
            egal('la sonde n\'écrit rien : écritures 0', nombres(r'écritures pendant la sonde (\d+)', 'sonde'), 0),
            egal('simulation : écritures 0', nombres(r'écritures (\d+)', 'simulation'), 0),
            # la simulation suit le passage réel : les connecteurs qu'il a associés sont repris du projet, lus, et
            # « déjà associés » (rien à écrire) ; le reste (corps non posés, codes refusés) est dit « SIMULATION »
            ('simulation : chaque tentative dite ou lue déjà faite (simulées + déjà associés = tentatives attendues)',
             lambda t: (somme(nombres(r'associations simulées (\d+)', 'simulation')(t), nombres(r'déjà associés (\d+)', 'simulation')(t)), calcule(0)(t)),
             lambda w: w[0] is not None and w[0] == w[1] and w[1] > 0),
            egal_au_calcul('simulation : les connecteurs associés au passage réel sont lus, pas réécrits (déjà associés = connecteurs associés)',
                           nombres(r'déjà associés (\d+)', 'simulation'), 7),
            tous('simulation : bilan tous SIMULE', bilan('simulation'), 'SIMULE', 6)]

def somme(*v):
    return None if any(x is None for x in v) else sum(v)

def materiel_existant():
    """INTENTION (SEE_Pilote, MaterielExistant ; constats C1, R2) : un connecteur repris du projet qui porte DÉJÀ un
    matériel n'est ni écrasé ni doublé. c1 porte un autre matériel, c2 le sien et un accessoire, c3 un accessoire."""
    return [au_moins('trois connecteurs du folio 1 ont reçu leur matériel au premier passage', nombres(r'connecteurs avec matériel (\d+)'), 3),
            egal('simulation GARDER : écritures 0', nombres(r'écritures (\d+)', 'simulation GARDER'), 0),
            egal('simulation GARDER : c1 et c3 « matériel existant gardé » dits (lus en simulation)', nombres(r'gardés (\d+)', 'simulation GARDER'), 2),
            egal('simulation GARDER : aucune association simulée sur eux', nombres(r'associations simulées (\d+)', 'simulation GARDER'), 0),
            au_moins('simulation GARDER : c2 et les autres « déjà associés »', nombres(r'déjà associés (\d+)', 'simulation GARDER'), 1),
            egal('GARDER : aucune association écrite', nombres(r'associations (\d+)', 'GARDER'), 0),
            egal('GARDER : c1 et c3 gardés, dits au journal', nombres(r'gardés (\d+)', 'GARDER'), 2),
            egal('GARDER : les trois inchangés', dans('GARDER', r'inchangés (\w+)'), 'oui'),
            egal('AJOUTER : deux associations (c1, c3)', nombres(r'associations (\d+)', 'AJOUTER'), 2),
            egal('AJOUTER : c1 = l\'autre matériel + son PN', dans('AJOUTER', r'c1 ajouté (\w+)'), 'oui'),
            egal('AJOUTER : c2 inchangé (il avait déjà son PN)', dans('AJOUTER', r'c2 inchangé (\w+)'), 'oui'),
            egal('AJOUTER : c3 = l\'accessoire + son PN', dans('AJOUTER', r'c3 ajouté (\w+)'), 'oui'),
            egal('AJOUTER : rien de perdu, relu comme reçu, tout relu', lambda t: (nombres(r'perdus (\d+)', 'AJOUTER')(t),
                 nombres(r'relectures différentes (\d+)', 'AJOUTER')(t), nombres(r'non relus (\d+)', 'AJOUTER')(t)), (0, 0, 0)),
            egal('relance AJOUTER : aucune association (tout est déjà là)', nombres(r'associations (\d+)', 'relance AJOUTER'), 0),
            egal('relance AJOUTER : aucun doublon (2, 2, 2 matériels)', nombres(r'matériels (\d+) (\d+) (\d+)', 'relance AJOUTER'), (2, 2, 2)),
            egal('REMPLACER : une association (c1 remis à la main)', nombres(r'associations (\d+)', 'REMPLACER'), 1),
            egal('REMPLACER : c1 ne garde que le PN du paquet', dans('REMPLACER', r'c1 seul PN (\w+)'), 'oui'),
            egal('REMPLACER : ce qui est retiré est dit', nombres(r'retirés dits (\d+)', 'REMPLACER'), 1),
            egal('lecture ratée : rien n\'est écrit à l\'aveugle', nombres(r'associations (\d+)', 'illisible'), 0),
            au_moins('lecture ratée : « matériel existant illisible » dit pour c1, c2, c3', nombres(r'illisibles dits (\d+)', 'illisible'), 3),
            egal('lecture ratée : c1 inchangé', dans('illisible', r'c1 inchangé (\w+)'), 'oui'),
            tous('lecture ratée : le folio va au bout (SAUVE)', bilan('illisible'), 'SAUVE', 1)]

# la consigne qui envoie au bouton 3 (CONSIGNE_BOUTON3, SEE_Commun) : où est le bouton, une fois un bouton passé (TE1)
BOUTON3 = "Essaie le bouton 3 : enregistre et ferme SEE. Puis, en bas d'Excel, clique sur l'onglet « Accueil », et sur le bouton orange « 3. SEE FERMÉ »."
# la photo vient APRÈS la boîte, qui cache le milieu du bloc (TE2)
PHOTO = 'Clique sur OK, puis prends une photo de la partie jaune de la feuille Resultat_Test'

def etapes_et_echecs(ou):
    """(somme des « (n réponse(s) en erreur au journal) » des Étapes, total de « Ce qui a échoué ») d'un passage."""
    def f(t):
        s = partie(t, ou)
        m = re.search(r'Étapes = (.*?) ; Ce qui a échoué = (?:le journal note (\d+)|rien)', s, re.S)
        if not m: return None
        return (sum(int(x) for x in re.findall(r'\((\d+) réponse\(s\) en erreur au journal\)', m.group(1))), int(m.group(2) or 0))
    return f

def boite_et_suite(ou):
    """(1re phrase de la boîte de fin, 1re ligne de « Et maintenant ») : la même consigne."""
    def f(t):
        s = partie(t, ou)
        a, b = re.search(r'boîte = (.*?)(?: / |$| ; Sonde_XML)', s), re.search(r'Et maintenant = ([^\n]*?)(?:\n| ; boîte de fin)', s)
        return (a.group(1).strip() if a else None, b.group(1).strip() if b else None)
    return f

def tester():
    """INTENTION (SEE_Sonde, TesterSEE) : sur un classeur neuf et sans SEE, il crée Reglages et Journal et dit « NON » ;
    avec le faux SEE (V5, V4), il lit sans rien écrire ; dans les trois cas, Resultat_Test est la première feuille et la
    seule boîte est celle de la fin (dite au journal ici)."""
    c = [egal('sans SEE : pas de feuille Reglages avant le test', dans('sans SEE', r'Reglages avant (\w+)'), 'non'),
         au_moins('sans SEE : Reglages créée (au moins 100 clés)', nombres(r'réglages créés (\d+)', 'sans SEE'), 100),
         egal('sans SEE : Resultat_Test en tête du classeur', dans('sans SEE', r'feuille 1 = (\w+)'), 'Resultat_Test'),
         egal('sans SEE : « SEE rejoint ? = NON »', dans('sans SEE', r'SEE rejoint \? = (\w+)'), 'NON'),
         egal('sans SEE : aucune trace', nombres(r'traces (\d+)', 'sans SEE'), 0),
         egal('sans SEE : une seule boîte, celle de la fin', nombres(r'boîte de fin dite (\d+)', 'sans SEE'), 1),
         # R1, R6 : la boîte dit quoi faire d'après ce qui a été lu ; les étapes comptent ce que compte « Ce qui a échoué »
         ('sans SEE : la boîte dit que la fenêtre SEE n\'est pas trouvée, OK puis la photo, et le bouton 3 avec son onglet (Accueil)', dans('sans SEE', r'boîte = (.*?) ; Sonde_XML'),
          lambda s: bool(s) and "Excel n'a pas trouvé ta fenêtre SEE" in s and PHOTO in s and BOUTON3 in s),
         ('sans SEE : le bloc PROVISOIRE (« EN COURS ») est remplacé par le bloc final', lambda t: partie(t, 'sans SEE'),
          lambda s: 'EN COURS' not in s and 'Si tu lis encore ceci' not in s),
         ('sans SEE : « Et maintenant » = la boîte', boite_et_suite('sans SEE'), lambda p: p[0] is not None and p[0] == p[1]),
         ('sans SEE : erreurs des étapes = erreurs du journal', etapes_et_echecs('sans SEE'), lambda p: p is not None and p[0] == p[1] and p[1] > 0)]
    for v, version_lue in (('V5', '5.20'), ('V4', '4.8')):
        c += [egal(f'{v} : écritures dans SEE pendant le test 0', nombres(r'écritures pendant le test (\d+)', v), 0),
              egal(f'{v} : Resultat_Test en tête du classeur', dans(v, r'feuille 1 = (\w+)'), 'Resultat_Test'),
              egal(f'{v} : « SEE rejoint ? = OUI »', dans(v, r'SEE rejoint \? = (\w+)'), 'OUI'),
              egal(f'{v} : version lue {version_lue}', dans(v, r'Version = [^;]*?(\d+\.\d+)'), version_lue),
              egal(f'{v} : unité lue (0 = millimètres)', dans(v, r'Unité = ([^;]+?) ;'), '0 = millimètres'),
              au_moins(f'{v} : symboles du folio lus', nombres(r'Folio lu = « [^»]* » : (\d+) symbole', v), 1),
              au_moins(f'{v} : matériels lus', nombres(r'Matériel = (\d+) matériel', v), 1),
              # la sélection du faux SEE est le folio 1 entier : le même matériel, compté une fois de chaque côté
              (f'{v} : matériels de la sélection = matériels du folio (pas de double compte)',
               lambda t, w=v: (nombres(r'Matériel = (\d+) matériel', w)(t), nombres(r'Sélection = \d+ objet\(s\) sélectionné\(s\) lus, (\d+) matériel', w)(t)),
               lambda p: p[0] is not None and p[0] == p[1]),
              (f'{v} : classes vues CL_EQUIPEMENT et CL_CONNECTEUR', dans(v, r'(classes vues :[^;]*)'),
               lambda s: bool(s) and '« CL_EQUIPEMENT »' in s and '« CL_CONNECTEUR »' in s),
              egal(f'{v} : XML 6 sur 6, dans Sonde_XML', (lambda w: lambda t: (nombres(r'Méthodes \(XML\) = (\d+) sur 6', w)(t), dans(w, r'Sonde_XML (\w+)')(t)))(v), (6, 'présente')),
              (f'{v} : les cinq sondes faites', dans(v, r'(Étapes = .*)'),
               lambda s: bool(s) and all(f'{n} : faite' in s for n in ('SondeApplication', 'SondeSymboles', 'SondeFolio', 'SondeSelection', 'SondeMethodes'))),
              egal(f'{v} : une seule boîte, celle de la fin', nombres(r'boîte de fin dite (\d+)', v), 1),
              (f'{v} : la boîte dit « BRAVO », OK puis la photo de Resultat_Test, puis le bouton 2 et son onglet (aucun fichier à renvoyer)', dans(v, r'boîte = (.*?) ; Sonde_XML'),
               lambda s: bool(s) and s.startswith('BRAVO') and PHOTO in s and '2. SEE DESSINE' in s and "en bas d'Excel, onglet « Accueil »" in s and 'Enregistre' not in s),
              (f'{v} : le bloc PROVISOIRE est remplacé par le bloc final', lambda t, w=v: partie(t, w), lambda s: 'EN COURS' not in s),
              (f'{v} : « Et maintenant » = la boîte', boite_et_suite(v), lambda p: p[0] is not None and p[0] == p[1]),
              (f'{v} : erreurs des étapes = erreurs du journal', etapes_et_echecs(v), lambda p: p is not None and p[0] == p[1] and p[1] > 0)]
    # SEE joint, un projet ouvert sans aucun folio affiché : c'est assez pour l'étape 1 (un projet vide suffit), la boîte dit
    # « BRAVO » et envoie au bouton 2
    c += [egal('sans folio : « SEE rejoint ? = OUI »', dans('sans folio', r'SEE rejoint \? = (\w+)'), 'OUI'),
          egal('sans folio : « Folio lu = aucun »', dans('sans folio', r'Folio lu = (\w+)'), 'aucun'),
          ('sans folio : l\'étape SondeFolio dit « rien lu » (pas « faite »)', dans('sans folio', r'(Étapes = .*?) ; Ce qui a échoué'),
           lambda s: bool(s) and 'SondeFolio : rien lu' in s and 'SondeFolio : faite' not in s),
          ('sans folio : la boîte dit « BRAVO » et le bouton 2, sans demander de relancer', dans('sans folio', r'boîte = (.*?) ; Sonde_XML'),
           lambda s: bool(s) and s.startswith('BRAVO') and '2. SEE DESSINE' in s and 'relance' not in s and 'folio «' not in s),
          ('sans folio : « Et maintenant » = la boîte', boite_et_suite('sans folio'), lambda p: p[0] is not None and p[0] == p[1]),
          egal('sans folio : une seule boîte', nombres(r'boîte de fin dite (\d+)', 'sans folio'), 1)]
    # R3 : SEE cesse de répondre quand la sélection est lue : pas de reconnexion, ce qui a été lu reste dit
    c += [egal('muet : aucune reconnexion pendant le test (ni GetObject ni « nouvelle connexion »)', nombres(r'reconnexions (\d+)', 'muet'), 0),
          egal('muet : « SEE rejoint ? = OUI » (joint par SondeApplication)', dans('muet', r'SEE rejoint \? = (\w+)'), 'OUI'),
          egal('muet : la version lue reste dite', dans('muet', r'Version = [^;]*?(\d+\.\d+)'), '5.20'),
          ('muet : « SEE perdu » nomme la sonde (SondeSelection)', dans('muet', r'SEE perdu = ([^;]*)'), lambda s: bool(s) and 'SondeSelection' in s),
          au_moins('muet : le folio lu avant la panne reste dit', nombres(r'Folio lu = « [^»]* » : (\d+) symbole', 'muet'), 1),
          egal('muet : SondeMethodes sautée (« non lues »)', dans('muet', r'Méthodes \(XML\) = (non lues)'), 'non lues'),
          ('muet : la boîte dit que SEE a cessé de répondre', dans('muet', r'boîte = (.*?) ; Sonde_XML'), lambda s: bool(s) and 'cessé de répondre' in s),
          egal('muet : une seule boîte', nombres(r'boîte de fin dite (\d+)', 'muet'), 1)]
    # C4, R4 : GetEquipmentCollection rend Nothing (rien d'associé) : « (aucun : Nothing) », jamais « #ERR » d'un autre appel
    c += [egal('Nothing : aucune cellule « #ERR » dans les colonnes Materiel de Sonde_Folio', nombres(r'colonne Materiel #ERR (\d+)', 'Nothing'), 0),
          au_moins('Nothing : « (aucun : Nothing) » dit', nombres(r'colonne Materiel #ERR \d+, Nothing (\d+)', 'Nothing'), 1),
          au_moins('Nothing : le matériel associé reste lu', nombres(r'Matériel = (\d+) matériel', 'Nothing'), 1)]
    return c

def bouton2():
    """INTENTION (SEE_Pilote, EssaiDessinReel) : pour de vrai malgré Simulation = O, une seule question qui nomme le projet,
    le folio d'essai créé et dessiné puis relu (Sonde_Folio) sans vider le journal ; Simulation reprend sa valeur ; sans SEE,
    rien n'est écrit, aucune question, et la fin le dit."""
    return [egal('un folio créé (AddSheet 1)', nombres(r'-> AddSheet (\d+) ;'), 1),
            au_moins('le motif dessiné (au moins 5 objets graphiques)', nombres(r'graphiques (\d+)'), 5),
            egal('une seule question', nombres(r'questions (\d+)'), 1),
            egal('la question nomme le projet ouvert', nombres(r'projet nommé (\d+)'), 1),
            egal('le journal du dessin n\'est pas vidé par la relecture', nombres(r'début du journal gardé (\d+)'), 1),
            au_moins('la relecture est faite', nombres(r'relecture (\d+)'), 1),
            egal('Sonde_Folio décrit le folio ESSAI_PILOTE', texte(r'Sonde_Folio ESSAI_PILOTE (\w+)'), 'oui'),
            au_moins('la fin dit de regarder le folio dans SEE (journal et boîte)', nombres(r'fin dite (\d+)'), 1),
            egal('Simulation reprend sa valeur (O) après', texte(r'Simulation après (\w)'), 'O'),
            egal('sans SEE : rien d\'écrit', nombres(r'sans SEE : traces (\d+)'), 0),
            egal('sans SEE : aucune question', nombres(r'question posée (\d+)'), 0),
            au_moins('sans SEE : « Rien n\'a été dessiné » dit', nombres(r'rien dessiné dit (\d+)'), 1),
            # SU7 : le sous-groupe du réglage Groupe n'est créé qu'APRÈS la question (Annuler ne laisse rien dans SEE)
            ('groupe : la question vient avant la création du sous-groupe, puis le folio est dessiné',
             nombres(r'groupe : question ligne (\d+) ; CreateSubGroup ligne (\d+) ; AddSheet (\d+)'),
             lambda p: isinstance(p, tuple) and 0 < p[0] < p[1] and p[2] >= 1)]

def connexion():
    """INTENTION (SEE_Commun, ConnecterSEE ; la v3) : les boutons 1 et 2 REJOIGNENT la fenêtre SEE ouverte et n'en créent
    jamais, que LancerSEE vaille N (le défaut) ou O ; le bloc à photographier dit chaque essai avec son code et sa phrase ;
    un ProgID lu au registre, ou le CLSID (GetActiveObject), rejoint la fenêtre ; une connexion CRÉÉE par une macro
    d'avant est lâchée au début des boutons 1 et 2, sans Quit."""
    return [egal('a : LancerSEE vaut N dans un classeur neuf', dans('a :', r'LancerSEE par défaut (\w+)'), 'N'),
            egal('a : bouton 1 : aucun objet SEE créé (ni new:, ni CreateObject)', nombres(r'bouton 1 : créations (\d+)', 'a :'), 0),
            egal('a : bloc à photographier : 10 essais, chacun avec son code (et sa phrase, ou « voir plus haut »)',
                 nombres(r'essais (\d+), avec code et phrase (\d+)', 'a :'), (10, 10)),
            egal('a : « SEE rejoint ? = NON »', dans('a :', r'SEE rejoint \? = (\w+)'), 'NON'),
            ('a : les codes de Windows en clair : 429 (800A01AD) et 800401E3 (MK_E_UNAVAILABLE)', dans('a :', r'(Essais = .*?) ; Registre ='),
             lambda s: bool(s) and '429 (800A01AD) = ' in s and '800401E3 = MK_E_UNAVAILABLE' in s),
            ('a : « Et maintenant » : OK puis la photo, puis le bouton 3 et où il est (onglet « Accueil »)',
             dans('a :', r'(?s)Et maintenant = (.*?) ; Détail'), lambda s: bool(s) and PHOTO in s and BOUTON3 in s),
            egal('a : bouton 2 : aucun objet SEE créé', nombres(r'bouton 2 : créations (\d+)', 'a :'), 0),
            egal('a : bouton 2 : rien d\'écrit', nombres(r'bouton 2 : créations \d+ ; écritures (\d+)', 'a :'), 0),
            au_moins('a : bouton 2 : la fin propose le bouton 3', nombres(r'bouton 3 proposé (\d+)', 'a :'), 1),
            egal('b : LancerSEE = O : bouton 1 : aucun objet SEE créé', nombres(r'bouton 1 : créations (\d+)', 'b :'), 0),
            egal('b : LancerSEE = O : bouton 2 : aucun objet SEE créé, rien dessiné', nombres(r'bouton 2 : créations (\d+) ; AddSheet (\d+)', 'b :'), (0, 0)),
            egal('c : Sonde_Registre nomme le ProgID SEEExpert.Application.48', dans('c :', r'Sonde_Registre nomme le ProgID (\w+)'), 'oui'),
            egal('c : rejoint par le ProgID lu au registre', dans('c :', r'SEE rejoint \? = OUI, ta fenêtre SEE ouverte, rejointe par ([^;]*?) ; '),
                 'GetObject(, "SEEExpert.Application.48")'),
            ('c : le bloc dit les ProgID trouvés au registre', dans('c :', r'(ProgID trouvés : [^;]*)'), lambda s: bool(s) and 'SEEExpert.Application.48 = Application V4R3' in s),
            egal('c : aucun objet SEE créé', nombres(r'créations (\d+)', 'c :'), 0),
            egal('d : rejoint par le CLSID (GetActiveObject)', dans('d :', r'SEE rejoint \? = OUI, ta fenêtre SEE ouverte, rejointe par ([^;]*?) ; '),
                 'GetActiveObject({A55015A3-0E82-4694-87D9-DB82B6620532})'),
            egal('d : aucun objet SEE créé', nombres(r'créations (\d+)', 'd :'), 0),
            au_moins('e : EssaiDessin (Alt+F8, LancerSEE = O) a créé un objet SEE', nombres(r'EssaiDessin \(Alt\+F8, LancerSEE = O\) : créations (\d+)', 'e :'), 1),
            egal('e : la connexion est dite CRÉÉE par Excel', dans('e :', r'créée par Excel (\w+)'), 'oui'),
            au_moins('e : bouton 1 : la connexion créée est lâchée, et le journal le dit', nombres(r'bouton 1 : lâchée (\d+)', 'e :'), 1),
            egal('e : bouton 1 : ni Quit, ni objet créé de plus', nombres(r'bouton 1 : lâchée \d+ ; Quit (\d+) ; créations de plus (\d+)', 'e :'), (0, 0)),
            egal('e : bouton 1 : la fenêtre ouverte est rejointe', dans('e :', r'SEE rejoint \? = OUI, ta fenêtre SEE ouverte, rejointe par ([^;]*?) ; '),
                 'GetObject(, "SEEExpert.Application")'),
            egal('e2 : bouton 2 : la connexion créée est lâchée, sans Quit, et le folio dessiné dans la fenêtre rejointe',
                 nombres(r'lâchée (\d+) ; Quit (\d+) ; AddSheet (\d+)', 'e2 :'), (1, 0, 1)),
            egal('e2 : bouton 2 : rejoint par GetObject(, "SEEExpert.Application")', dans('e2 :', r'stratégie (.*)$'), 'GetObject(, "SEEExpert.Application")'),
            # EX3 : GetActiveObject (une fonction de Windows déclarée) après tous les GetObject ; EX1 : rejoint par SeeAutomation, le
            # bouton 1 envoie au bouton 3 et LÂCHE la connexion (sinon File > Exit ne ferait que cacher SEE)
            egal('f : rejoint par GetActiveObject (SeeAutomation V4R3)', dans('f :', r'SEE rejoint \? = OUI, ta fenêtre SEE ouverte, rejointe par (GetActiveObject\([^)]*\))'),
                 'GetActiveObject({B0B9DD73-EE81-473F-9C3C-D8910C7E2D59})'),
            egal('f : GetActiveObject essayé après tous les GetObject(, "{CLSID}")', dans('f :', r'GetActiveObject après les GetObject (\w+)'), 'oui'),
            ('f : le bouton 1 lâche la connexion SeeAutomation, et le journal le dit', nombres(r'lâchée dite (\d+)', 'f :'), lambda n: n is not None and n >= 1),
            egal('f : gApp lâché après le bouton 1', dans('f :', r'gApp lâché (\w+)'), 'oui'),
            ('f : la boîte envoie au bouton 3 (et dit où il est)', dans('f :', r'boîte = (.*?) ; Sonde_XML'), lambda s: bool(s) and BOUTON3 in s)]

def bouton3(v, forme):
    """INTENTION (SEE_Pilote, EssaiSansFenetre ; la v3, revue) : SEE ouvert (Windows revu cinq fois), Windows muet (sans
    boîte), copie ratée, Annuler : rien n'est fait (ni objet SEE créé, ni copie, ni projet ouvert), et le bloc dit pourquoi
    et quoi faire ; le parcours complet : copie, création, ouverture, dessin, Save, fermeture, le projet noté ; CreateObject
    refusé : projet ouvert, rien dessiné, pas de Save, chaque forme et chaque variable dites ; un SEE qui reste après Quit :
    la manière de l'arrêter (Plus de détails, Processus en arrière-plan) ; SEE rouvert pendant le choix du projet : rien
    n'est créé (SU1) ; le paramètre de sortie (V4) : Variant, puis Object si SEE refuse le type (EX2) ; une connexion
    rejointe par le bouton 1 est lâchée au début (EX1) ; ensuite, les boutons 1 et 2 n'ouvrent jamais le projet d'essai
    noté dans Projet (SU2) ; le chemin entier du projet n'est jamais montré (SU3)."""
    rien = lambda ou: egal(f'{ou} : rien de fait (new:, copie, OpenProject, AddSheet, Save, Quit : 0)',
                           (lambda t, o=ou: tuple(nombres(rf'{m} (\d+)', o)(t) for m in ('new:', 'copies', 'OpenProject', 'AddSheet', 'Save', 'Quit'))), (0,) * 6)
    tout = lambda ou, n=(1, 1, 1, 1, 1): egal(f'{ou} : copie, OpenProject, AddSheet, Save, Quit = {n}',
                           (lambda t, o=ou: tuple(nombres(rf'{m} (\d+)', o)(t) for m in ('copies', 'OpenProject', 'AddSheet', 'Save', 'Quit'))), n)
    v4 = v == 'V4'
    forme_lue = 'CreateObject(type, ?, objet en sortie), variable Variant' if (v, forme) == ('V4', 2) else 'CreateObject(type) -> objet rendu'
    sortie = ' (variable de sortie : Variant)' if v4 else ''
    c = [rien('SEE ouvert'),
         egal('SEE ouvert : Windows revu cinq fois avant de refuser (Patienter 5)', nombres(r'SEE ouvert : Patienter (\d+)', 'SEE ouvert'), 5),
         ('SEE ouvert : « 1. SEE fermé ? = NON », puis : si tu vois SEE, File > Exit ; sinon, ferme Excel ; sinon, le Gestionnaire des tâches',
          lambda t: partie(t, 'SEE ouvert'),
          lambda s: '1. SEE fermé ? = NON : 1 SEE_Faux.exe en marche' in s and 'Si tu vois SEE : enregistre et ferme-le (File > Exit)' in s
              and 'Si tu ne vois pas SEE : enregistre et ferme Excel, rouvre Pilote-SEE.xlsm' in s and 'Plus de détails' in s
              and 'Processus en arrière-plan' in s and 'Ne termine PAS Excel' in s and "onglet « Accueil »" in s),
         egal('SEE ouvert : le nom du programme compté vient du registre (LocalServer32 : SEE_Faux.exe)', dans('SEE ouvert', r'programme compté (\S+)'), 'SEE_Faux.exe'),
         rien('Windows muet'),
         ('Windows muet : « on ne sait pas », rien n\'est fait sans boîte', lambda t: partie(t, 'Windows muet'),
          lambda s: '1. SEE fermé ? = on ne sait pas' in s and 'rien n\'a été fait' in s),
         rien('copie ratée'),
         ('copie ratée : « 3. Copie = RATÉE », rien n\'a été ouvert', lambda t: partie(t, 'copie ratée'), lambda s: '3. Copie = RATÉE' in s and "rien n'a été ouvert" in s),
         rien('Annuler fichier'),
         ('Annuler fichier : « aucun choisi (Annuler) », et où est le bouton 3', lambda t: partie(t, 'Annuler fichier'),
          lambda s: '2. Projet d\'essai = aucun choisi (Annuler)' in s and 'bouton orange « 3. SEE FERMÉ » (en bas d\'Excel, onglet « Accueil »)' in s),
         rien('Annuler question'),
         egal('Annuler question : une question posée', nombres(r'questions (\d+)', 'Annuler question'), 1),
         ('Annuler question : « tu as répondu Annuler »', lambda t: partie(t, 'Annuler question'), lambda s: 'tu as répondu Annuler' in s),
         egal('complet : le projet choisi est noté dans le réglage Projet', dans('complet', r'Projet noté (\w+)'), 'oui'),
         tout('complet'),
         au_moins('complet : le motif dessiné (au moins 5 objets graphiques)', nombres(r'graphiques (\d+)', 'complet'), 5),
         egal('complet : SEE V5R2 « classe non inscrite », puis V4R3 créé (2 new:)', nombres(r'new: (\d+)', 'complet'), 2),
         egal('complet : gApp lâché (aucun objet SEE gardé)', dans('complet', r'gApp lâché (\w+)'), 'oui'),
         egal('complet : Simulation reprend sa valeur (O)', dans('complet', r'Simulation après (\w)'), 'O'),
         egal('complet : Sonde_Folio relit ESSAI_PILOTE', dans('complet', r'Sonde_Folio ESSAI_PILOTE (\w+)'), 'oui'),
         ('complet : le bloc : DESSINÉ ET ENREGISTRÉ, la forme et la variable retenues, Save, SEE refermé, la consigne, la copie nommée', lambda t: partie(t, 'complet'),
          lambda s, f=forme_lue: 'Résultat = DESSINÉ ET ENREGISTRÉ' in s and f'création d\'objets : oui, {f}' in s and '7. Enregistré = oui (Project.Save)' in s
              and '8. SEE refermé = oui' in s and 'Ouvre SEE, ouvre ton projet d\'essai, double-clic sur le folio ESSAI_PILOTE, et prends une photo.' in s
              and re.search(r'TEST_SEE\.avant-pilote-\d{8}-\d{6}\.seeprj', s) is not None and 'Visible : 438' in s
              and f'5. Projet ouvert = oui : « PROJET_FAUX »{sortie}' in s),
         ('complet : la consigne : OK, puis la photo du bloc, puis l\'onglet Sonde_Folio (TE2, TE6) ; la copie : « N\'y touche pas » (TE9)', lambda t: partie(t, 'complet'),
          lambda s: s.find(PHOTO) >= 0 and s.find("clique sur l'onglet « Sonde_Folio » et prends une photo de son haut") > s.find(PHOTO)
              and "N'y touche pas : je te dirai si on s'en sert." in s and 'à remettre à sa place' not in s),
         ('complet : chaque objet posé est compté (n sur n)', dans('complet', r'(\d+ objet\(s\) dessiné\(s\) sur \d+)'),
          lambda s: bool(s) and len(set(re.findall(r'\d+', s))) == 1),
         egal('refusé : copie 1, OpenProject 1, AddSheet 0, graphiques 0, Save 0, Quit 1',
              (lambda t: tuple(nombres(rf'{m} (\d+)', 'refusé')(t) for m in ('copies', 'OpenProject', 'AddSheet', 'graphiques', 'Save', 'Quit'))), (1, 1, 0, 0, 0, 1)),
         ('refusé : « REFUSÉE » seulement après chaque forme ET chaque variable (Variant, puis Object), et pas d\'enregistrement', lambda t: partie(t, 'refusé'),
          lambda s: 'projet ouvert : oui, création d\'objets : REFUSÉE (codes : forme 1' in s and 'forme 2, Variant : 13 (800A000D)' in s
              and 'forme 2, Object : 13 (800A000D)' in s and '7. Enregistré = non : rien n\'a été dessiné' in s and 'Résultat = pas de dessin enregistré' in s),
         egal('reste : Windows revu cinq fois (Patienter 5), Quit 1', nombres(r'reste : Patienter (\d+) ; .*?Quit (\d+)', 'reste'), (5, 1)),
         ('reste : « SEE refermé = NON », et d\'abord comment l\'arrêter (Ctrl + Maj + Échap, Plus de détails, Processus en arrière-plan, Fin de tâche), puis rouvrir SEE',
          lambda t: partie(t, 'reste'),
          lambda s: '8. SEE refermé = NON' in s and s.find('Ctrl + Maj + Échap') >= 0 and s.find('Plus de détails') > s.find('Ctrl + Maj + Échap')
              and s.find('Processus en arrière-plan') > s.find('Plus de détails') and s.find('Fin de tâche') > s.find('Processus en arrière-plan')
              and s.find('Ouvre SEE, ouvre ton projet') > s.find('Fin de tâche')),
         # SU1 / EX4 : SEE rouvert pendant le choix du projet : Windows revu juste avant la création, rien n'est créé
         egal('rouvert : new: 0, copie 1, OpenProject 0, Save 0, Quit 0',
              (lambda t: tuple(nombres(rf'{m} (\d+)', 'rouvert')(t) for m in ('new:', 'copies', 'OpenProject', 'Save', 'Quit'))), (0, 1, 0, 0, 0)),
         ('rouvert : « 4. SEE créé = NON : SEE a été ouvert pendant le choix du projet », et quoi faire', lambda t: partie(t, 'rouvert'),
          lambda s: '4. SEE créé = NON : SEE a été ouvert pendant le choix du projet' in s and 'Ne rouvre pas SEE pendant le bouton 3' in s),
         # EX1 : une connexion REJOINTE par le bouton 1 (gardée) est lâchée au début du bouton 3 : SEE peut s'arrêter
         egal('joint : le bouton 1 garde la connexion à la fenêtre rejointe (Application)', dans('joint', r'bouton 1 garde la connexion (\w+)'), 'oui'),
         au_moins('joint : le bouton 3 la lâche d\'abord, et le journal le dit', nombres(r'lâchée dite (\d+)', 'joint'), 1),
         ('joint : « 1. SEE fermé ? = oui » (SEE.exe n\'est plus tenu par Excel)', lambda t: partie(t, 'joint'), lambda s: '1. SEE fermé ? = oui' in s),
         tout('joint'),
         # SU2 : le réglage Projet noté par le bouton 3 ; un SEE ouvert sur un autre projet, rejoint : rien n'y est ouvert
         egal('ensuite : bouton 1 (lecture seule) : aucun OpenProject dans le SEE rejoint', nombres(r'bouton 1 : OpenProject (\d+)', 'ensuite'), 0),
         egal('ensuite : bouton 2 : aucun OpenProject ; la question nomme le projet ouvert (PROJET_FAUX)',
              nombres(r'bouton 2 : OpenProject (\d+) ; question nomme PROJET_FAUX (\d+)', 'ensuite'), (0, 1)),
         # SU3 : ni le bloc ni le journal ne montrent le chemin entier du projet (le dossier qui contient « robot »)
         ('aucun passage ne montre le chemin entier du projet (Resultat_Test, Journal)', lambda t: resultat(t) or '',
          lambda s: s.count('chemin entier montré non') >= 13 and 'chemin entier montré oui' not in s)]
    # EX2 : le type du paramètre de sortie de SeeAutomation (V4) : Variant d'abord ; Object seulement si SEE refuse le type
    if v4:
        c += [tout('Object seulement'),
              ('Object seulement : OpenProject et CreateObject passent par une variable Object, après le refus du Variant',
               lambda t: partie(t, 'Object seulement'),
               lambda s: '5. Projet ouvert = oui : « PROJET_FAUX » (variable de sortie : Object)' in s
                   and 'variable Object (avant : forme 1, Variant : 450 (800A01C2), forme 2, Variant : 13 (800A000D))' in s),
              tout('Variant seulement'),
              ('Variant seulement : le Variant suffit, aucune variable Object essayée', lambda t: partie(t, 'Variant seulement'),
               lambda s: '(variable de sortie : Variant)' in s and 'variable Variant' in s and 'variable Object' not in s and ', Object :' not in s)]
    else:
        c += [tout('Object seulement'), tout('Variant seulement')]
    return c

def arret_windows():
    """INTENTION (EX3) : Windows arrête TesterSEE au premier appel d'une fonction déclarée (GetActiveObject) : le bloc
    PROVISOIRE « EN COURS » reste devant le technicien, avec le registre lu, et dit quoi photographier ; les GetObject,
    sans fonction déclarée, ont été essayés AVANT."""
    return [egal('Resultat_Test est la feuille active', texte(r'feuille active (\w+)'), 'Resultat_Test'),
            ('le bloc dit « EN COURS : SondeApplication » et GetActiveObject', texte(r'À PHOTOGRAPHIER = ([^;]*)'),
             lambda s: bool(s) and 'EN COURS : SondeApplication' in s and 'GetActiveObject' in s),
            ('« Et maintenant » : la photo de la partie jaune ET du message de Windows', texte(r'Et maintenant = ([^;]*)'),
             lambda s: bool(s) and 'Si tu lis encore ceci' in s and 'message de Windows' in s and 'Sécurité Windows' in s),
            ('le registre lu avant l\'arrêt est dans le bloc', texte(r'(Registre = .*?) ; Et maintenant'), lambda s: bool(s) and 'Application V4R3' in s),
            au_moins('les GetObject (sans fonction déclarée) ont été essayés AVANT l\'arrêt', nombres(r'GetObject au journal (\d+)'), 6),
            egal('l\'arrêt est au premier GetActiveObject (aucun au journal)', nombres(r'GetActiveObject au journal (\d+)'), 0),
            egal('aucune boîte de fin (le test n\'a pas fini)', nombres(r'boîte de fin dite (\d+)'), 0)]

def panne_classeur():
    """INTENTION (SU4, EX6) : InitialiserClasseur lève une erreur (sous Excel, une feuille Reglages protégée) : gSansDialogue
    reprend sa valeur (sinon chaque question de sécurité répondrait seule OK jusqu'à la fermeture d'Excel), l'erreur va à
    l'appelant ; le bouton 3 la dit « ARRÊT IMPRÉVU » et ne crée rien."""
    return [('InitialiserSansBoite : l\'erreur est relevée (1004), gSansDialogue reprend sa valeur (Faux)', lambda t: resultat(t) or '',
             lambda s: 'erreur relevée 1004 ; gSansDialogue Faux' in s),
            ('bouton 3 : « ARRÊT IMPRÉVU » dit, gSansDialogue inchangé (Vrai), rien créé', lambda t: partie(t, 'bouton 3'),
             lambda s: re.search(r'arrêt imprévu dit [1-9]', s) is not None and 'gSansDialogue Vrai' in s and 'new: 0' in s)]

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
    'materiel V5': materiel(5),                             # INTENTION, nombres CALCULÉS depuis le paquet (verifier.py --materiel)
    'materiel V4': materiel(4),                             # idem, API V4 (GetEquipmentCollection en paramètre de sortie)
    'materiel existant': materiel_existant(),               # INTENTION (MaterielExistant : GARDER, AJOUTER, REMPLACER, lecture ratée)
    'tester': tester(),                                     # INTENTION (TesterSEE)
    'bouton 2 V5': bouton2(),                               # INTENTION (EssaiDessinReel, le bouton 2 du classeur)
    'bouton 2 V4': bouton2(),                               # idem, API V4
    'connexion V5': connexion(),                            # INTENTION (la v3 : rejoindre, jamais créer par surprise)
    'connexion V4': connexion(),                            # idem, API V4
    'bouton 3 V4': bouton3('V4', 2),                        # INTENTION (EssaiSansFenetre ; V4 : un paramètre de plus, le cas probable)
    'bouton 3 V5': bouton3('V5', 1),                        # idem, V5 et la forme d'Application
    'arret Windows': arret_windows(),                       # INTENTION (EX3 : Windows arrête la macro sur une fonction déclarée)
    'panne classeur': panne_classeur(),                     # INTENTION (SU4, EX6 : gSansDialogue remis sur une erreur)
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
    motif = r"^\s*\('([^']+)', lambda d: " if programme == 'relecture' else r"\('([^']+)', '\w+\.\w+', \("
    return re.findall(motif, texte, re.M)

def passages():
    """[(nom affiché, programme, scénario, variante ou '-')], dans l'ordre où lancer.sh les fait."""
    p = []
    for programme in ('relecture', 'regression'):
        for s in scenarios(programme):
            if programme == 'relecture' and s == 'variante V5':
                p += [(f'{s} ({quoi})', programme, s, fichier) for quoi, fichier in VARIANTES]
            else:
                p.append((s, programme, s, VARIANTE_DE.get(s, '-')))
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
