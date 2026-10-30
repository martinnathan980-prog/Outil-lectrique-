# -*- coding: utf-8 -*-
"""
SONDE PDF -- Atelier Schema, le releve ANONYMISE d'un schema electrique en PDF
=============================================================================

    python sonde_pdf.py <fichier.pdf | dossier> [...] [options]
    python sonde_pdf.py                (ou un double-clic sur ce fichier)

Lit chaque PDF et ecrit, a cote de ce script dans le dossier « rapports »,
deux fichiers par PDF, nommes d'apres un numero d'ordre et une empreinte
courte du CONTENU (jamais d'apres le nom du PDF, qui peut etre confidentiel) :

    NN-xxxxxxxx.rapport.txt    le rapport en francais (UTF-8 avec BOM, CRLF)
    NN-xxxxxxxx.elements.tsv   une ligne par element graphique ou texte

PAR DEFAUT RIEN DE REEL NE SORT : chaque texte est reduit a sa forme (lettre
majuscule -> A, minuscule -> a, chiffre -> 9, les autres signes gardes), aucun
nom de fichier, aucun nom propre (calque, police maison, cle ou etiquette d'un
logiciel : un code et sa forme), aucune metadonnee de personne ou de projet ;
les traits groupes comme des caracteres (un texte dessine en traits, jusqu'a
3 cm de haut, meme hors de la page vue) tiennent en une ligne par mot, sans la
place, le nombre ni la taille de chaque trait. Le TSV garde la geometrie du
dessin (traits, rectangles, place des textes). Ce qui reste approche : un
texte en traits de plus de 3 cm, ou qui touche un trait plus long, reste
ecrit trait par trait ; ce qui epouse un texte (cadre, soulignement, masque,
rectangle d'un lien ou d'un surlignage) garde sa vraie largeur, que la
longueur conventionnelle des textes cache. Le format du TSV et ces limites
sont decrits dans LISEZMOI.md (meme dossier).

SANS AUCUN CHEMIN (un double-clic dans l'Explorateur) : les PDF du dossier
« PDF-A-LIRE », a cote de ce script ; s'il est vide, une fenetre pour les
choisir (si tkinter est la) ; sinon, ou si l'on annule, le dossier est cree,
ouvert, et l'ecran dit quoi faire. Glisser des PDF sur ce fichier les lit
aussi. A la fin, sous Windows, le dossier des rapports s'ouvre ; la fenetre
attend Entree seulement si elle a ete ouverte pour ce script (pas sous une
invite de commandes ni sous sonde-pdf.bat). SONDE_SANS_FENETRE=1 (variable
d'environnement) : ni fenetre de choix, ni Explorateur, ni attente. Une
erreur imprevue ne montre que sa classe, jamais un traceback (il montrerait
le chemin du script, donc l'identifiant Windows).

Options :
    --clair             ecrit AUSSI les textes reels et toute la geometrie (pour
                        un PDF que l'on a le droit de montrer) : fichiers
                        NN-xxxxxxxx.EN-CLAIR.*, dans « rapports-EN-CLAIR »
    --sortie=DOSSIER    ailleurs que « rapports » a cote du script
    --lecteur=auto|standard|pymupdf
                        auto (defaut) : le lecteur ecrit ici (bibliotheque
                        standard seule) ; PyMuPDF, s'il est installe, relit
                        chaque page pour comparer ; pymupdf : PyMuPDF d'abord
    --pages=1-3,7       seulement ces pages
    --mot-de-passe=XXX  le mot de passe d'un PDF protege (utilisateur ou
                        proprietaire ; le mot de passe vide est essaye avant)
    --delai=120         secondes au plus par PDF (au-dela : le rapport le dit,
                        et l'on passe au PDF suivant)

Le coeur n'utilise que la bibliotheque standard de Python (3.8 et plus).
Ce qui n'est pas gere se DIT dans le rapport ; un PDF illisible donne un
rapport qui le dit, jamais un plantage du releve.
"""
from __future__ import division

import binascii
import datetime
import hashlib
import itertools
import math
import os
import re
import struct
import sys
import time
import unicodedata
import zlib

VERSION_SONDE = '1.0'
MM = 25.4 / 72.0          # un point PDF en millimetres


# ===========================================================================
#  1. Petits outils
# ===========================================================================

class ErreurPDF(Exception):
    """Une erreur de lecture du PDF (structure, objet, filtre...). Son message
    est ecrit ici et ne porte jamais de contenu du PDF (les noms y passent
    par nom_montrable)."""


class ArretLecture(Exception):
    """La lecture d'une page s'arrete en cours de route (delai, nombre
    d'elements, nombre d'operations) : ce qui est deja releve est garde."""


def raison(e):
    """Ce qu'on peut ecrire d'une erreur : le message d'une ErreurPDF (ecrit
    ici), sinon seulement la classe de l'exception (un message de Python peut
    recopier un morceau du PDF : « could not convert string to float: b'...' »)."""
    if isinstance(e, (ErreurPDF, ArretLecture)):
        m = str(e)
        return m if m else e.__class__.__name__
    return e.__class__.__name__


def ascii_seul(texte):
    """Le texte sans accents ni caracteres hors ASCII : la console Windows
    (cp850, cp1252) ne sait pas tout afficher."""
    t = unicodedata.normalize('NFKD', u'%s' % (texte,))
    t = u''.join(c for c in t if not unicodedata.combining(c))
    t = t.replace(u'\u00ab', u'"').replace(u'\u00bb', u'"').replace(u'\u2019', u"'")
    return t.encode('ascii', 'replace').decode('ascii')


def dire(texte=''):
    """Ecrit une ligne a l'ecran, en ASCII seulement, sans jamais planter."""
    try:
        sys.stdout.write(ascii_seul(texte) + '\n')
        sys.stdout.flush()
    except Exception:
        pass


def chemin_long(chemin):
    r"""Sous Windows, un chemin de plus de 240 caracteres prend le prefixe
    \\?\ pour depasser la limite historique de 260."""
    if os.name == 'nt':
        p = os.path.abspath(chemin)
        if len(p) > 240 and not p.startswith('\\\\?\\'):
            if p.startswith('\\\\'):
                return '\\\\?\\UNC\\' + p[2:]
            return '\\\\?\\' + p
        return p
    return chemin


def fmt(x, n=2):
    """Un nombre pour le TSV : point decimal, n decimales, sans -0."""
    if x is None:
        return ''
    v = round(x, n)
    if v == 0:
        v = 0.0
    s = ('%.' + str(n) + 'f') % v
    return s


def fr(x, n=1):
    """Un nombre pour le rapport : virgule decimale."""
    return (('%.' + str(n) + 'f') % x).replace('.', ',')


def mul(m, n):
    """Produit de deux matrices PDF (a b c d e f) : m puis n."""
    a, b, c, d, e, f = m
    A, B, C, D, E, F = n
    return (a * A + b * C, a * B + b * D,
            c * A + d * C, c * B + d * D,
            e * A + f * C + E, e * B + f * D + F)


def appliquer(m, x, y):
    return (m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5])


IDENTITE = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)


# ===========================================================================
#  2. Les objets PDF et le decoupage en jetons
# ===========================================================================

class Nom(str):
    """Un nom PDF (/Type), sans la barre oblique."""
    __slots__ = ()


class Ref(object):
    """Une reference indirecte (12 0 R)."""
    __slots__ = ('num', 'gen')

    def __init__(self, num, gen):
        self.num = num
        self.gen = gen

    def __eq__(self, autre):
        return isinstance(autre, Ref) and autre.num == self.num and autre.gen == self.gen

    def __ne__(self, autre):
        return not self.__eq__(autre)

    def __hash__(self):
        return hash((self.num, self.gen))

    def __repr__(self):
        return '%d %d R' % (self.num, self.gen)


class Flux(object):
    """Un flux : son dictionnaire et ses octets bruts (encore chiffres et
    filtres)."""
    __slots__ = ('dico', 'brut', 'num', 'gen', 'cache')

    def __init__(self, dico, brut, num=0, gen=0):
        self.dico = dico
        self.brut = brut
        self.num = num
        self.gen = gen
        self.cache = None


class MotCle(object):
    """Un mot-cle du fichier (obj, endobj, stream, R...) ou un operateur."""
    __slots__ = ('mot',)

    def __init__(self, mot):
        self.mot = mot

    def __repr__(self):
        return 'MotCle(%r)' % (self.mot,)


_BLANCS = b'\x00\t\n\x0c\r '
_RE_JETON = re.compile(
    br'(?:[\x00\t\n\x0c\r ]+|%[^\r\n]*)*'
    br'(?:(?P<n>[+-]?(?:\d+\.?\d*|\.\d+))(?![^\x00\t\n\x0c\r ()<>\[\]{}/%])'
    br'|/(?P<nom>[^\x00\t\n\x0c\r ()<>\[\]{}/%]*)'
    br'|(?P<dd><<)|(?P<df>>>)'
    br'|<(?P<hx>[0-9A-Fa-f\x00\t\n\x0c\r ]*)>'
    br'|(?P<ao>\[)|(?P<af>\])'
    br'|(?P<ch>\()'
    br'|(?P<mot>[^\x00\t\n\x0c\r ()<>\[\]{}/%]+)'
    br'|(?P<x>[\s\S]))')
_RE_DIESE = re.compile(br'#([0-9A-Fa-f]{2})')
_RE_CHAINE = re.compile(br'[()\\]')
_ECHAPPEMENTS = {ord('n'): b'\n', ord('r'): b'\r', ord('t'): b'\t', ord('b'): b'\x08',
                 ord('f'): b'\x0c', ord('('): b'(', ord(')'): b')', ord('\\'): b'\\'}
_CACHE_NOMS = {}


def nom_de(brut):
    n = _CACHE_NOMS.get(brut)
    if n is None:
        b = brut
        if b'#' in b:
            b = _RE_DIESE.sub(lambda m: bytes([int(m.group(1), 16)]), b)
        n = Nom(b.decode('latin-1'))
        if len(_CACHE_NOMS) < 20000:
            _CACHE_NOMS[brut] = n
    return n


def nombre_de(brut):
    try:
        if b'.' in brut:
            return float(brut)
        return int(brut)
    except ValueError:
        return 0


def hex_de(brut):
    h = bytes(c for c in brut if c not in _BLANCS)
    if len(h) % 2:
        h += b'0'
    try:
        return binascii.unhexlify(h)
    except (binascii.Error, ValueError):
        return b''


def lire_chaine(data, pos):
    """Une chaine litterale ( ... ) commencee juste avant pos. Rend (octets,
    position apres la parenthese fermante)."""
    profondeur = 1
    morceaux = []
    debut = pos
    n = len(data)
    while True:
        m = _RE_CHAINE.search(data, pos)
        if m is None:
            morceaux.append(data[debut:])
            return b''.join(morceaux), n
        i = m.start()
        c = data[i]
        if c == 0x5C:                     # antislash
            morceaux.append(data[debut:i])
            if i + 1 >= n:
                return b''.join(morceaux), n
            e = data[i + 1]
            if e in _ECHAPPEMENTS:
                morceaux.append(_ECHAPPEMENTS[e])
                pos = i + 2
            elif 0x30 <= e <= 0x37:
                j = i + 1
                v = 0
                while j < n and j < i + 4 and 0x30 <= data[j] <= 0x37:
                    v = v * 8 + data[j] - 0x30
                    j += 1
                morceaux.append(bytes([v & 0xFF]))
                pos = j
            elif e == 0x0D:
                pos = i + 2
                if pos < n and data[pos] == 0x0A:
                    pos += 1
            elif e == 0x0A:
                pos = i + 2
            else:
                morceaux.append(bytes([e]))
                pos = i + 2
            debut = pos
        elif c == 0x28:
            profondeur += 1
            pos = i + 1
        else:
            profondeur -= 1
            pos = i + 1
            if profondeur == 0:
                morceaux.append(data[debut:i])
                return b''.join(morceaux), pos


def lire_valeur(data, pos, arrets=None):
    """Lit UNE valeur PDF a partir de pos (avec ses references n g R).
    Rend (valeur, position). Un mot-cle rencontre au premier niveau est rendu
    comme MotCle. Leve ErreurPDF a la fin des donnees."""
    pile = []                 # conteneurs ouverts : listes ; un dico est une liste marquee
    marques = []              # 'a' (tableau) ou 'd' (dictionnaire)
    while True:
        m = _RE_JETON.match(data, pos)
        if m is None:
            raise ErreurPDF('fin des donnees au milieu d\'un objet')
        pos = m.end()
        g = m.lastgroup
        if g == 'n':
            v = nombre_de(m.group('n'))
        elif g == 'nom':
            v = nom_de(m.group('nom'))
        elif g == 'ch':
            v, pos = lire_chaine(data, pos)
        elif g == 'hx':
            v = hex_de(m.group('hx'))
        elif g == 'dd' or g == 'ao':
            pile.append([])
            marques.append('d' if g == 'dd' else 'a')
            continue
        elif g == 'df' or g == 'af':
            if not pile:
                continue                       # fermeture orpheline : ignoree
            contenu = pile.pop()
            genre = marques.pop()
            if genre == 'd':
                v = {}
                for i in range(0, len(contenu) - 1, 2):
                    k = contenu[i]
                    if isinstance(k, Nom):
                        v[str(k)] = contenu[i + 1]
            else:
                v = contenu
        elif g == 'mot':
            mot = m.group('mot')
            if mot == b'R' and pile and len(pile[-1]) >= 2 and \
                    isinstance(pile[-1][-1], int) and isinstance(pile[-1][-2], int):
                gen = pile[-1].pop()
                num = pile[-1].pop()
                v = Ref(num, gen)
            elif mot == b'true':
                v = True
            elif mot == b'false':
                v = False
            elif mot == b'null':
                v = None
            else:
                if not pile:
                    return MotCle(mot), pos
                if mot in (b'endobj', b'stream', b'obj', b'endstream'):
                    # objet mal ferme : on rend ce qu'on a
                    while pile:
                        contenu = pile.pop()
                        genre = marques.pop()
                        if genre == 'd':
                            v = {}
                            for i in range(0, len(contenu) - 1, 2):
                                if isinstance(contenu[i], Nom):
                                    v[str(contenu[i])] = contenu[i + 1]
                        else:
                            v = contenu
                        if pile:
                            pile[-1].append(v)
                    return v, m.start('mot')
                continue                        # mot inconnu dans un conteneur : ignore
        else:
            continue                            # caractere isole : ignore
        if pile:
            pile[-1].append(v)
        else:
            if isinstance(v, int) and not isinstance(v, bool):
                m2 = _RE_REF.match(data, pos)
                if m2:
                    return Ref(v, int(m2.group(1))), m2.end()
            return v, pos


_RE_REF = re.compile(br'[\x00\t\n\x0c\r ]+(\d+)[\x00\t\n\x0c\r ]+R(?![^\x00\t\n\x0c\r ()<>\[\]{}/%])')
_RE_ENTETE_OBJ = re.compile(br'[\x00\t\n\x0c\r ]*(\d+)[\x00\t\n\x0c\r ]+(\d+)[\x00\t\n\x0c\r ]+obj')
_RE_OBJ_PARTOUT = re.compile(br'(?<![0-9])(\d{1,10})[\x00\t\n\x0c\r ]+(\d{1,5})[\x00\t\n\x0c\r ]+obj(?![^\x00\t\n\x0c\r ()<>\[\]{}/%])')


# ===========================================================================
#  3. Les filtres
# ===========================================================================

def predicteur(data, params):
    """Annule un predicteur PNG (10-15) ou TIFF (2)."""
    pred = entier(params.get('Predictor'), 1)
    if pred <= 1:
        return data
    colonnes = entier(params.get('Columns'), 1)
    couleurs = entier(params.get('Colors'), 1)
    bits = entier(params.get('BitsPerComponent'), 8)
    bpp = max(1, (couleurs * bits + 7) // 8)
    ligne = (colonnes * couleurs * bits + 7) // 8
    if ligne <= 0 or ligne > len(data) + 1 or couleurs > 64 or bits > 32:
        # une ligne plus longue que tout le flux (Columns de deux milliards) : rien a reconstruire
        raise ErreurPDF('predicteur aux dimensions impossibles')
    if pred == 2:
        if bits != 8:
            raise ErreurPDF('predicteur TIFF a %d bits non gere' % bits)
        sortie = bytearray(data)
        for debut in range(0, len(sortie), ligne):
            for i in range(debut + bpp, min(debut + ligne, len(sortie))):
                sortie[i] = (sortie[i] + sortie[i - bpp]) & 0xFF
        return bytes(sortie)
    sortie = bytearray()
    prec = bytearray(ligne)
    i = 0
    n = len(data)
    while i < n:
        filtre = data[i]
        cour = bytearray(data[i + 1:i + 1 + ligne])
        if len(cour) < ligne:
            cour.extend(bytes(ligne - len(cour)))
        i += 1 + ligne
        if filtre == 1:
            for k in range(bpp, ligne):
                cour[k] = (cour[k] + cour[k - bpp]) & 0xFF
        elif filtre == 2:
            for k in range(ligne):
                cour[k] = (cour[k] + prec[k]) & 0xFF
        elif filtre == 3:
            for k in range(ligne):
                gauche = cour[k - bpp] if k >= bpp else 0
                cour[k] = (cour[k] + ((gauche + prec[k]) >> 1)) & 0xFF
        elif filtre == 4:
            for k in range(ligne):
                a = cour[k - bpp] if k >= bpp else 0
                b = prec[k]
                c = prec[k - bpp] if k >= bpp else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                if pa <= pb and pa <= pc:
                    v = a
                elif pb <= pc:
                    v = b
                else:
                    v = c
                cour[k] = (cour[k] + v) & 0xFF
        sortie.extend(cour)
        prec = cour
    return bytes(sortie)


def entier(v, defaut=0):
    if isinstance(v, bool):
        return defaut
    if isinstance(v, (int, float)):
        return int(v)
    return defaut


def flate(data):
    """FlateDecode, tolerant : un flux tronque ou abime rend ce qui a pu etre lu."""
    for wbits in (15, -15, 31):
        d = zlib.decompressobj(wbits)
        try:
            sortie = d.decompress(data)
            try:
                sortie += d.flush()
            except zlib.error:
                pass
            return sortie
        except zlib.error:
            # lire morceau par morceau pour garder le debut d'un flux abime
            d = zlib.decompressobj(wbits)
            sortie = b''
            try:
                for i in range(0, len(data), 1024):
                    sortie += d.decompress(data[i:i + 1024])
            except zlib.error:
                pass
            if sortie:
                return sortie
    raise ErreurPDF('flux FlateDecode illisible')


def ascii_hex(data):
    fin = data.find(b'>')
    if fin >= 0:
        data = data[:fin]
    return hex_de(data)


def ascii85(data):
    import base64
    d = bytes(c for c in data if c not in _BLANCS)
    if d.startswith(b'<~'):
        d = d[2:]
    fin = d.find(b'~>')
    if fin >= 0:
        d = d[:fin]
    elif d.endswith(b'~'):
        d = d[:-1]
    try:
        return base64.a85decode(d)
    except Exception:
        # dernier groupe abime : on le retire
        try:
            return base64.a85decode(d[:len(d) - (len(d) % 5)])
        except Exception:
            raise ErreurPDF('flux ASCII85 illisible')


def lzw(data, early=1):
    sortie = bytearray()
    table = [bytes([i]) for i in range(256)] + [None, None]
    taille = 9
    tampon = 0
    nbits = 0
    prec = None
    for octet in data:
        tampon = (tampon << 8) | octet
        nbits += 8
        while nbits >= taille:
            nbits -= taille
            code = (tampon >> nbits) & ((1 << taille) - 1)
            if code == 256:
                table = table[:258]
                taille = 9
                prec = None
                continue
            if code == 257:
                return bytes(sortie)
            if prec is None:
                if code < len(table) and table[code] is not None:
                    entree = table[code]
                else:
                    return bytes(sortie)
            elif code < len(table) and table[code] is not None:
                entree = table[code]
                table.append(prec + entree[:1])
            elif code == len(table):
                entree = prec + prec[:1]
                table.append(entree)
            else:
                return bytes(sortie)
            sortie.extend(entree)
            prec = entree
            n = len(table) + early
            if n >= 4096:
                taille = 12
            elif n >= 2048:
                taille = 12
            elif n >= 1024:
                taille = 11
            elif n >= 512:
                taille = 10
    return bytes(sortie)


def run_length(data):
    sortie = bytearray()
    i = 0
    n = len(data)
    while i < n:
        l = data[i]
        if l == 128:
            break
        if l < 128:
            sortie.extend(data[i + 1:i + 2 + l])
            i += 2 + l
        else:
            if i + 1 < n:
                sortie.extend(data[i + 1:i + 2] * (257 - l))
            i += 2
    return bytes(sortie)


ABREV_FILTRES = {'AHx': 'ASCIIHexDecode', 'A85': 'ASCII85Decode', 'LZW': 'LZWDecode',
                 'Fl': 'FlateDecode', 'RL': 'RunLengthDecode', 'CCF': 'CCITTFaxDecode',
                 'DCT': 'DCTDecode'}
FILTRES_IMAGE = ('DCTDecode', 'JPXDecode', 'CCITTFaxDecode', 'JBIG2Decode')


# ===========================================================================
#  4. Le chiffrement (gestionnaire standard)
# ===========================================================================

def rc4(cle, data):
    S = list(range(256))
    j = 0
    lc = len(cle)
    for i in range(256):
        j = (j + S[i] + cle[i % lc]) & 0xFF
        S[i], S[j] = S[j], S[i]
    sortie = bytearray(len(data))
    i = j = 0
    for k in range(len(data)):
        i = (i + 1) & 0xFF
        j = (j + S[i]) & 0xFF
        S[i], S[j] = S[j], S[i]
        sortie[k] = data[k] ^ S[(S[i] + S[j]) & 0xFF]
    return bytes(sortie)


class AES(object):
    """AES (128 et 256 bits) en Python pur : dechiffrement CBC des flux, et
    chiffrement CBC pour le calcul de cle du chiffrement AES-256 (R6)."""
    _pret = False

    @classmethod
    def _tables(cls):
        if cls._pret:
            return
        sbox = [0] * 256
        inv = [0] * 256
        p = q = 1
        sbox[0] = 0x63
        while True:
            p = p ^ ((p << 1) & 0xFF) ^ (0x1B if p & 0x80 else 0)
            q ^= q << 1
            q ^= q << 2
            q ^= q << 4
            q &= 0xFF
            if q & 0x80:
                q ^= 0x09
            x = q ^ ((q << 1) | (q >> 7)) ^ ((q << 2) | (q >> 6)) ^ ((q << 3) | (q >> 5)) ^ ((q << 4) | (q >> 4))
            x = (x ^ 0x63) & 0xFF
            sbox[p] = x
            if p == 1:
                break
        for i in range(256):
            inv[sbox[i]] = i

        def xt(a):
            return ((a << 1) ^ 0x1B) & 0xFF if a & 0x80 else a << 1

        def mulg(a, b):
            r = 0
            while b:
                if b & 1:
                    r ^= a
                a = xt(a)
                b >>= 1
            return r
        Te = [[0] * 256 for _ in range(4)]
        Td = [[0] * 256 for _ in range(4)]
        for i in range(256):
            s = sbox[i]
            w = (mulg(s, 2) << 24) | (s << 16) | (s << 8) | mulg(s, 3)
            for k in range(4):
                Te[k][i] = ((w >> (8 * k)) | (w << (32 - 8 * k))) & 0xFFFFFFFF
            s = inv[i]
            w = (mulg(s, 14) << 24) | (mulg(s, 9) << 16) | (mulg(s, 13) << 8) | mulg(s, 11)
            for k in range(4):
                Td[k][i] = ((w >> (8 * k)) | (w << (32 - 8 * k))) & 0xFFFFFFFF
        cls.sbox, cls.inv, cls.Te, cls.Td = sbox, inv, Te, Td
        cls._pret = True

    def __init__(self, cle):
        self._tables()
        sbox = self.sbox
        nk = len(cle) // 4
        if len(cle) not in (16, 24, 32):
            raise ErreurPDF('cle AES de longueur %d' % len(cle))
        self.nr = nk + 6
        w = list(struct.unpack('>%dI' % nk, cle))
        rcon = 1
        for i in range(nk, 4 * (self.nr + 1)):
            t = w[i - 1]
            if i % nk == 0:
                t = ((t << 8) & 0xFFFFFFFF) | (t >> 24)
                t = (sbox[t >> 24] << 24) | (sbox[(t >> 16) & 0xFF] << 16) | (sbox[(t >> 8) & 0xFF] << 8) | sbox[t & 0xFF]
                t ^= rcon << 24
                rcon = ((rcon << 1) ^ 0x1B) & 0xFF if rcon & 0x80 else rcon << 1
            elif nk > 6 and i % nk == 4:
                t = (sbox[t >> 24] << 24) | (sbox[(t >> 16) & 0xFF] << 16) | (sbox[(t >> 8) & 0xFF] << 8) | sbox[t & 0xFF]
            w.append(w[i - nk] ^ t)
        self.ke = [w[4 * r:4 * r + 4] for r in range(self.nr + 1)]
        # cles de dechiffrement (forme equivalente)
        Td, s = self.Td, sbox
        kd = [self.ke[self.nr]]
        for r in range(self.nr - 1, 0, -1):
            ligne = []
            for x in self.ke[r]:
                ligne.append(Td[0][s[x >> 24]] ^ Td[1][s[(x >> 16) & 0xFF]] ^ Td[2][s[(x >> 8) & 0xFF]] ^ Td[3][s[x & 0xFF]])
            kd.append(ligne)
        kd.append(self.ke[0])
        self.kd = kd

    def chiffrer_bloc(self, b):
        T0, T1, T2, T3 = self.Te[0], self.Te[1], self.Te[2], self.Te[3]
        s = self.sbox
        k = self.ke
        a0, a1, a2, a3 = struct.unpack('>4I', b)
        a0 ^= k[0][0]
        a1 ^= k[0][1]
        a2 ^= k[0][2]
        a3 ^= k[0][3]
        for r in range(1, self.nr):
            kr = k[r]
            b0 = T0[a0 >> 24] ^ T1[(a1 >> 16) & 0xFF] ^ T2[(a2 >> 8) & 0xFF] ^ T3[a3 & 0xFF] ^ kr[0]
            b1 = T0[a1 >> 24] ^ T1[(a2 >> 16) & 0xFF] ^ T2[(a3 >> 8) & 0xFF] ^ T3[a0 & 0xFF] ^ kr[1]
            b2 = T0[a2 >> 24] ^ T1[(a3 >> 16) & 0xFF] ^ T2[(a0 >> 8) & 0xFF] ^ T3[a1 & 0xFF] ^ kr[2]
            b3 = T0[a3 >> 24] ^ T1[(a0 >> 16) & 0xFF] ^ T2[(a1 >> 8) & 0xFF] ^ T3[a2 & 0xFF] ^ kr[3]
            a0, a1, a2, a3 = b0, b1, b2, b3
        kr = k[self.nr]
        sortie = []
        for x0, x1, x2, x3, kk in ((a0, a1, a2, a3, kr[0]), (a1, a2, a3, a0, kr[1]),
                                   (a2, a3, a0, a1, kr[2]), (a3, a0, a1, a2, kr[3])):
            v = (s[x0 >> 24] << 24) | (s[(x1 >> 16) & 0xFF] << 16) | (s[(x2 >> 8) & 0xFF] << 8) | s[x3 & 0xFF]
            sortie.append(v ^ kk)
        return struct.pack('>4I', *sortie)

    def dechiffrer_bloc(self, b):
        T0, T1, T2, T3 = self.Td[0], self.Td[1], self.Td[2], self.Td[3]
        s = self.inv
        k = self.kd
        a0, a1, a2, a3 = struct.unpack('>4I', b)
        a0 ^= k[0][0]
        a1 ^= k[0][1]
        a2 ^= k[0][2]
        a3 ^= k[0][3]
        for r in range(1, self.nr):
            kr = k[r]
            b0 = T0[a0 >> 24] ^ T1[(a3 >> 16) & 0xFF] ^ T2[(a2 >> 8) & 0xFF] ^ T3[a1 & 0xFF] ^ kr[0]
            b1 = T0[a1 >> 24] ^ T1[(a0 >> 16) & 0xFF] ^ T2[(a3 >> 8) & 0xFF] ^ T3[a2 & 0xFF] ^ kr[1]
            b2 = T0[a2 >> 24] ^ T1[(a1 >> 16) & 0xFF] ^ T2[(a0 >> 8) & 0xFF] ^ T3[a3 & 0xFF] ^ kr[2]
            b3 = T0[a3 >> 24] ^ T1[(a2 >> 16) & 0xFF] ^ T2[(a1 >> 8) & 0xFF] ^ T3[a0 & 0xFF] ^ kr[3]
            a0, a1, a2, a3 = b0, b1, b2, b3
        kr = k[self.nr]
        sortie = []
        for x0, x1, x2, x3, kk in ((a0, a3, a2, a1, kr[0]), (a1, a0, a3, a2, kr[1]),
                                   (a2, a1, a0, a3, kr[2]), (a3, a2, a1, a0, kr[3])):
            v = (s[x0 >> 24] << 24) | (s[(x1 >> 16) & 0xFF] << 16) | (s[(x2 >> 8) & 0xFF] << 8) | s[x3 & 0xFF]
            sortie.append(v ^ kk)
        return struct.pack('>4I', *sortie)

    def chiffrer_cbc(self, iv, data):
        sortie = []
        prec = iv
        for i in range(0, len(data), 16):
            bloc = bytes(x ^ y for x, y in zip(data[i:i + 16], prec))
            prec = self.chiffrer_bloc(bloc)
            sortie.append(prec)
        return b''.join(sortie)

    def dechiffrer_cbc(self, iv, data):
        sortie = []
        prec = iv
        n = len(data) - len(data) % 16
        for i in range(0, n, 16):
            bloc = data[i:i + 16]
            d = self.dechiffrer_bloc(bloc)
            sortie.append(bytes(x ^ y for x, y in zip(d, prec)))
            prec = bloc
        return b''.join(sortie)


def aes_dechiffrer(cle, data, bourrage=True):
    if len(data) < 32:
        if len(data) == 16:
            return b''
        return b''
    clair = AES(cle).dechiffrer_cbc(data[:16], data[16:])
    if bourrage and clair:
        n = clair[-1]
        if 1 <= n <= 16 and clair[-n:] == bytes([n]) * n:
            clair = clair[:-n]
    return clair


BOURRAGE = (b'\x28\xBF\x4E\x5E\x4E\x75\x8A\x41\x64\x00\x4E\x56\xFF\xFA\x01\x08'
            b'\x2E\x2E\x00\xB6\xD0\x68\x3E\x80\x2F\x0C\xA9\xFE\x64\x53\x69\x7A')


class Chiffrement(object):
    """Le gestionnaire de securite standard : RC4 40 et 128 bits, AES-128,
    AES-256 (R5 et R6). On essaie le mot de passe vide, puis celui qui est
    donne, comme mot de passe utilisateur puis proprietaire ; ouvert_par dit
    lequel a ouvert le fichier."""

    def __init__(self, enc, id0, mot_de_passe=''):
        self.enc = enc
        self.v = entier(enc.get('V'), 0)
        self.r = entier(enc.get('R'), 0)
        self.methode = ''
        self.cle = None
        self.ouvert_par = None
        self.stmf = 'RC4'
        self.strf = 'RC4'
        self.id0 = id0
        self.encrypt_meta = enc.get('EncryptMetadata', True) is not False
        filtre = enc.get('Filter')
        if filtre != 'Standard':
            raise ErreurPDF('chiffrement par le gestionnaire %s (pas le standard) : non gere'
                            % nom_standard(filtre, 'maison'))
        longueur = entier(enc.get('Length'), 40)
        if self.v in (4, 5):
            cf = enc.get('CF') if isinstance(enc.get('CF'), dict) else {}

            def methode_de(nom):
                if nom == 'Identity' or nom is None:
                    return 'aucun'
                d = cf.get(str(nom))
                if not isinstance(d, dict):
                    return 'aucun'
                cfm = d.get('CFM')
                if cfm == 'AESV2':
                    return 'AES128'
                if cfm == 'AESV3':
                    return 'AES256'
                if cfm == 'V2':
                    return 'RC4'
                return 'aucun'
            self.stmf = methode_de(enc.get('StmF'))
            self.strf = methode_de(enc.get('StrF'))
            if self.v == 4:
                for nom in (enc.get('StmF'), enc.get('StrF')):
                    d = cf.get(str(nom)) if nom is not None else None
                    if isinstance(d, dict) and entier(d.get('Length'), 0):
                        l = entier(d.get('Length'), 16)
                        longueur = l * 8 if l <= 32 else l
                if longueur < 40:
                    longueur = 128
        self.o = octets(enc.get('O'))
        self.u = octets(enc.get('U'))
        if self.r <= 4:
            self.n = 5 if self.r == 2 else max(5, min(16, longueur // 8))
            self.p = entier(enc.get('P'), 0)
        elif self.r in (5, 6):
            if len(self.u) < 48 or len(octets(enc.get('UE'))) < 32:
                raise ErreurPDF('dictionnaire de chiffrement AES-256 incomplet')
        else:
            raise ErreurPDF('revision de chiffrement R%d non geree' % self.r)
        candidats = [u'']
        if mot_de_passe:
            candidats.append(mot_de_passe if isinstance(mot_de_passe, str) else mot_de_passe.decode('latin-1'))
        for mdp in candidats:
            for role in ('utilisateur', 'proprietaire'):
                cle = self._essayer(mdp, role)
                if cle is not None:
                    self.cle = cle
                    self.ouvert_par = role if mdp else 'vide'
                    break
            if self.cle is not None:
                break
        if self.cle is None:
            raise ErreurPDF('protege par un mot de passe a l\'ouverture')
        if self.r <= 4:
            if self.v == 4:
                m = self.stmf if self.stmf != 'aucun' else self.strf
                self.methode = 'AES-128' if m == 'AES128' else ('RC4 %d bits' % (self.n * 8))
            else:
                self.methode = 'RC4 %d bits' % (self.n * 8)
        else:
            self.methode = 'AES-256 (R%d)' % self.r
            self.stmf = self.stmf if self.v == 5 else 'AES256'

    # -- R2 a R4 -------------------------------------------------------------
    def _cle_r4(self, mdp32):
        """Algorithme 2 : la cle du fichier depuis un mot de passe utilisateur (32 octets, bourre)."""
        n = self.n
        h = hashlib.md5(mdp32 + self.o[:32] + struct.pack('<i', self.p if self.p < 2 ** 31 else self.p - 2 ** 32)
                        + self.id0)
        if self.r >= 4 and not self.encrypt_meta:
            h.update(b'\xff\xff\xff\xff')
        cle = h.digest()
        if self.r >= 3:
            for _ in range(50):
                cle = hashlib.md5(cle[:n]).digest()
        return cle[:n]

    def _utilisateur_r4(self, cle):
        """Algorithmes 4 et 5 : la cle ouvre-t-elle le fichier (contre /U) ?"""
        u = self.u
        if self.r == 2:
            return rc4(cle, BOURRAGE) == u[:32]
        x = rc4(cle, hashlib.md5(BOURRAGE + self.id0).digest())
        for i in range(1, 20):
            x = rc4(bytes(c ^ i for c in cle), x)
        return x[:16] == u[:16]

    def _essayer(self, mdp, role):
        """La cle du fichier si mdp est le bon mot de passe (role : utilisateur
        ou proprietaire), sinon None."""
        if self.r <= 4:
            b = mdp.encode('latin-1', 'replace')
            pad = (b + BOURRAGE)[:32]
            if role == 'utilisateur':
                cle = self._cle_r4(pad)
                return cle if self._utilisateur_r4(cle) else None
            # algorithme 7 : le mot de passe proprietaire dechiffre /O, qui rend le mot de passe utilisateur
            k = hashlib.md5(pad).digest()
            if self.r >= 3:
                for _ in range(50):
                    k = hashlib.md5(k).digest()
            k = k[:self.n]
            if self.r == 2:
                mdp_u = rc4(k, self.o[:32])
            else:
                mdp_u = self.o[:32]
                for i in range(19, -1, -1):
                    mdp_u = rc4(bytes(c ^ i for c in k), mdp_u)
            cle = self._cle_r4(mdp_u[:32])
            return cle if self._utilisateur_r4(cle) else None
        b = mdp.encode('utf-8')[:127]
        u, o = self.u, self.o
        if role == 'utilisateur':
            sel_v, sel_c, extra, chiffree = u[32:40], u[40:48], b'', octets(self.enc.get('UE'))
            cible = u[:32]
        else:
            if len(o) < 48 or len(octets(self.enc.get('OE'))) < 32:
                return None
            sel_v, sel_c, extra, chiffree = o[32:40], o[40:48], u[:48], octets(self.enc.get('OE'))
            cible = o[:32]
        if self.r == 5:
            if hashlib.sha256(b + sel_v + extra).digest() != cible:
                return None
            inter = hashlib.sha256(b + sel_c + extra).digest()
        else:
            if hash_r6(b, sel_v, extra) != cible:
                return None
            inter = hash_r6(b, sel_c, extra)
        return AES(inter).dechiffrer_cbc(b'\x00' * 16, chiffree[:32])

    def cle_objet(self, num, gen, aes):
        if self.r >= 5:
            return self.cle
        k = self.cle + struct.pack('<I', num)[:3] + struct.pack('<I', gen)[:2]
        if aes:
            k += b'sAlT'
        return hashlib.md5(k).digest()[:min(self.n + 5, 16)]

    def dechiffrer(self, data, num, gen, methode):
        if methode == 'aucun' or not data:
            return data
        if self.v < 4:
            methode = 'RC4'
        if methode == 'RC4':
            return rc4(self.cle_objet(num, gen, False), data)
        if methode in ('AES128', 'AES256'):
            return aes_dechiffrer(self.cle_objet(num, gen, True), data)
        return data


def hash_r6(mdp, sel, udata):
    """Algorithme 2.B de l'ISO 32000-2 (chiffrement AES-256, revision 6)."""
    k = hashlib.sha256(mdp + sel + udata).digest()
    i = 0
    while True:
        k1 = (mdp + k + udata) * 64
        e = AES(k[:16]).chiffrer_cbc(k[16:32], k1)
        reste = sum(e[:16]) % 3
        if reste == 0:
            k = hashlib.sha256(e).digest()
        elif reste == 1:
            k = hashlib.sha384(e).digest()
        else:
            k = hashlib.sha512(e).digest()
        i += 1
        if i >= 64 and e[-1] <= i - 32:
            break
    return k[:32]


def octets(v):
    if isinstance(v, bytes):
        return v
    if isinstance(v, str):
        return v.encode('latin-1', 'replace')
    return b''


# ===========================================================================
#  5. Le lecteur du fichier : xref, objets, flux
# ===========================================================================

class LecteurPDF(object):
    """Lit la structure d'un PDF : table xref classique ou flux xref (PDF 1.5),
    flux d'objets, mises a jour incrementales, et en dernier recours la
    reconstruction en parcourant le fichier."""

    def __init__(self, data, notes, mot_de_passe=''):
        self.data = data
        self.notes = notes            # NotesNonGere : ce qui n'est pas gere
        self.xref = {}                # num -> ('n', offset, gen) | ('o', flux, index) | ('f',)
        self.trailer = {}
        self.cache = {}
        self.objstm = {}
        self.chiffre = None
        self.erreur_chiffrement = None
        self.reconstruit = False
        self.raisons_reconstruction = []
        self.nb_mises_a_jour = 0
        self.flux_xref = False
        self.flux_objets = 0
        self._index_scan = None
        m = re.search(br'%PDF-(\d\.\d)', data[:1024])
        self.version = m.group(1).decode('ascii') if m else '?'
        if not m:
            self.notes.ajouter('en-tete %PDF absent dans le premier kilo-octet')
        try:
            self._charger_xref()
            if 'Root' not in self.trailer:
                raise ErreurPDF('pas de /Root dans le trailer')
            racine = self.resoudre(self.trailer.get('Root'))
            if not isinstance(racine, dict):
                raise ErreurPDF('/Root illisible')
        except Exception as e:
            self.raisons_reconstruction.append(raison(e))
            self._reconstruire()
        enc = self.trailer.get('Encrypt')
        if enc is not None:
            num_enc = enc.num if isinstance(enc, Ref) else None
            self._num_enc = num_enc
            enc_d = self.resoudre(enc)
            ids = self.resoudre(self.trailer.get('ID'))
            id0 = octets(self.resoudre(ids[0])) if isinstance(ids, list) and ids else b''
            if isinstance(enc_d, dict):
                self.enc_dico = enc_d
                try:
                    self.chiffre = Chiffrement(enc_d, id0, mot_de_passe)
                except Exception as e:
                    self.erreur_chiffrement = raison(e)
                # les objets deja lus (avant de connaitre la cle) sont a relire
                gardes = {}
                if num_enc is not None and num_enc in self.cache:
                    gardes[num_enc] = self.cache[num_enc]
                self.cache = gardes
                self.objstm = {}
        else:
            self._num_enc = None

    # -- la table xref ----------------------------------------------------
    def _charger_xref(self):
        data = self.data
        fin = data.rfind(b'startxref')
        if fin < 0:
            raise ErreurPDF('pas de startxref')
        m = re.match(br'startxref[\x00\t\n\x0c\r ]+(\d+)', data[fin:fin + 40])
        if not m:
            raise ErreurPDF('startxref illisible')
        pos = int(m.group(1))
        vus = set()
        premier = True
        while pos is not None and pos not in vus:
            vus.add(pos)
            if pos >= len(data):
                raise ErreurPDF('startxref hors du fichier')
            # tolerance : la table commence parfois un peu avant ou apres
            debut = data[pos:pos + 20].lstrip(_BLANCS)
            if debut.startswith(b'xref'):
                trailer = self._table_classique(pos)
            else:
                mo = _RE_ENTETE_OBJ.match(data, pos)
                if not mo:
                    # chercher 'xref' tout pres
                    k = data.find(b'xref', max(0, pos - 20), pos + 20)
                    if k >= 0:
                        trailer = self._table_classique(k)
                    else:
                        raise ErreurPDF('pas de table xref a la position annoncee')
                else:
                    trailer = self._flux_xref(pos)
            if premier:
                self.trailer = dict(trailer)
                premier = False
            else:
                self.nb_mises_a_jour += 1
                for k, v in trailer.items():
                    self.trailer.setdefault(k, v)
            prec = trailer.get('Prev')
            pos = int(prec) if isinstance(prec, (int, float)) and not isinstance(prec, bool) else None

    def _table_classique(self, pos):
        data = self.data
        pos = data.find(b'xref', pos) + 4
        rx = re.compile(br'[\x00\t\n\x0c\r ]*(\d+)[ \t]+(\d+)[ \t]*[\r\n]+')
        re_entree = re.compile(br'(\d{1,10})[ \t]+(\d{1,5})[ \t]+([nf])')
        while True:
            m = rx.match(data, pos)
            if not m:
                break
            premier, nombre = int(m.group(1)), int(m.group(2))
            pos = m.end()
            entrees = []
            for i in range(nombre):
                me = re_entree.search(data, pos, pos + 40)
                if not me:
                    break
                entrees.append((int(me.group(1)), int(me.group(2)), me.group(3)))
                pos = me.end()
            # piege connu : une sous-section qui commence a 1 au lieu de 0
            if premier == 1 and entrees and entrees[0][2] == b'f' and entrees[0][1] == 65535:
                premier = 0
            for i, (off, gen, t) in enumerate(entrees):
                num = premier + i
                if num in self.xref:
                    continue
                if t == b'n':
                    self.xref[num] = ('n', off, gen)
                else:
                    self.xref[num] = ('f',)
        k = data.find(b'trailer', pos)
        if k < 0:
            raise ErreurPDF('trailer absent')
        trailer, _ = lire_valeur(data, k + 7)
        if not isinstance(trailer, dict):
            raise ErreurPDF('trailer illisible')
        stm = trailer.get('XRefStm')
        if isinstance(stm, int) and not isinstance(stm, bool):
            try:
                self._flux_xref(stm, hybride=True)
                self.flux_xref = True
            except ErreurPDF:
                pass
        return trailer

    def _flux_xref(self, pos, hybride=False):
        m = _RE_ENTETE_OBJ.match(self.data, pos)
        if not m:
            raise ErreurPDF('flux xref introuvable')
        obj = self._lire_objet_a(m.end(), int(m.group(1)), int(m.group(2)), dechiffrer=False)
        if not isinstance(obj, Flux) or obj.dico.get('Type') != 'XRef':
            raise ErreurPDF('l\'objet annonce n\'est pas un flux xref')
        self.flux_xref = True
        d = obj.dico
        w = [entier(x) for x in d.get('W', [])]
        if len(w) < 3:
            raise ErreurPDF('flux xref sans /W')
        taille = entier(d.get('Size'), 0)
        index = d.get('Index') or [0, taille]
        brut = self.decoder_flux(obj, dechiffrer=False)
        ligne = sum(w)
        if ligne <= 0 or any(x < 0 or x > 8 for x in w):
            raise ErreurPDF('flux xref aux largeurs (/W) impossibles')
        p = 0
        for k in range(0, len(index) - 1, 2):
            premier, nombre = entier(index[k]), entier(index[k + 1])
            # jamais plus d'entrees que le flux n'en contient (un /Size de deux milliards ne coute rien)
            nombre = max(0, min(nombre, (len(brut) - p) // ligne))
            for i in range(nombre):
                if p + ligne > len(brut):
                    break
                champs = []
                q = p
                for largeur in w:
                    v = 0
                    for _ in range(largeur):
                        v = (v << 8) | brut[q]
                        q += 1
                    champs.append(v)
                p += ligne
                t = champs[0] if w[0] else 1
                num = premier + i
                if num in self.xref:
                    continue
                if t == 0:
                    self.xref[num] = ('f',)
                elif t == 1:
                    self.xref[num] = ('n', champs[1], champs[2] if w[2] else 0)
                elif t == 2:
                    self.xref[num] = ('o', champs[1], champs[2])
        return d

    # -- reconstruction ----------------------------------------------------
    def _scanner(self):
        if self._index_scan is None:
            idx = {}
            for m in _RE_OBJ_PARTOUT.finditer(self.data):
                idx[int(m.group(1))] = (m.end(), int(m.group(2)))
            self._index_scan = idx
        return self._index_scan

    def _reconstruire(self):
        self.reconstruit = True
        self.notes.ajouter('structure du fichier abimee (%s) : objets retrouves en parcourant tout le fichier'
                           % '; '.join(self.raisons_reconstruction))
        self.xref = {}
        self.cache = {}
        idx = self._scanner()
        for num, (pos, gen) in idx.items():
            self.xref[num] = ('n', pos, gen, 'scan')
        trailer = {}
        for m in re.finditer(br'trailer[\x00\t\n\x0c\r ]*<<', self.data):
            try:
                t, _ = lire_valeur(self.data, m.start() + 7)
                if isinstance(t, dict):
                    trailer.update(t)
            except ErreurPDF:
                pass
        # flux xref et flux d'objets
        for num in sorted(idx):
            try:
                o = self.obtenir(num)
            except Exception:
                continue
            if isinstance(o, Flux):
                t = o.dico.get('Type')
                if t == 'XRef':
                    for k in ('Root', 'Info', 'Encrypt', 'ID'):
                        if k in o.dico:
                            trailer[k] = o.dico[k]
                elif t == 'ObjStm':
                    try:
                        objets = self._objets_du_flux(num, o)
                    except Exception:
                        continue
                    for n2 in objets:
                        if n2 not in idx:
                            self.xref[n2] = ('o', num, None)
        if 'Root' not in trailer or not isinstance(self.resoudre(trailer.get('Root')), dict):
            for num in sorted(idx):
                try:
                    o = self.obtenir(num)
                except Exception:
                    continue
                if isinstance(o, dict) and o.get('Type') == 'Catalog':
                    trailer['Root'] = Ref(num, 0)
                    break
        if 'Root' not in trailer:
            raise ErreurPDF('aucun catalogue (/Root) trouve, meme en parcourant tout le fichier')
        self.trailer = trailer

    # -- les objets ----------------------------------------------------------
    def resoudre(self, v, profondeur=0):
        while isinstance(v, Ref) and profondeur < 32:
            v = self.obtenir(v.num)
            profondeur += 1
        return v

    def obtenir(self, num):
        if num in self.cache:
            return self.cache[num]
        e = self.xref.get(num)
        obj = None
        if e is None or e[0] == 'f':
            obj = None
        elif e[0] == 'n':
            obj = self._lire_objet_num(num, e)
        elif e[0] == 'o':
            obj = self._depuis_flux_objets(num, e[1], e[2])
        if len(self.cache) > 200000:
            self.cache.clear()
        self.cache[num] = obj
        return obj

    def _lire_objet_num(self, num, e):
        data = self.data
        pos, gen = e[1], e[2]
        if len(e) == 4:                      # issu du parcours : juste apres "obj"
            return self._lire_objet_a(pos, num, gen)
        m = _RE_ENTETE_OBJ.match(data, pos) if pos < len(data) else None
        if not m or int(m.group(1)) != num:
            # decalage : chercher le bon en-tete tout pres, sinon par le parcours
            m = None
            for delta in (-4, -2, -1, 1, 2, 4, -8, 8, -16, 16):
                p = pos + delta
                if 0 <= p < len(data):
                    m2 = _RE_ENTETE_OBJ.match(data, p)
                    if m2 and int(m2.group(1)) == num:
                        m = m2
                        break
            if m is None:
                idx = self._scanner()
                if num in idx:
                    self.notes.ajouter('table xref fausse : objets retrouves en parcourant le fichier')
                    return self._lire_objet_a(idx[num][0], num, idx[num][1])
                return None
            self.notes.ajouter('table xref decalee : objets retrouves a quelques octets de la position annoncee')
        return self._lire_objet_a(m.end(), num, int(m.group(2)))

    def _lire_objet_a(self, pos, num, gen, dechiffrer=True):
        data = self.data
        try:
            v, pos = lire_valeur(data, pos)
        except ErreurPDF:
            return None
        if isinstance(v, MotCle):
            return None
        m = re.compile(br'[\x00\t\n\x0c\r ]*stream(\r\n|\n|\r)?').match(data, pos)
        if m and isinstance(v, dict):
            debut = m.end()
            if m.group(1) == b'\r' and data[debut:debut + 1] == b'\n':
                debut += 1
            longueur = v.get('Length')
            if isinstance(longueur, Ref):
                if longueur.num == num:
                    longueur = None
                else:
                    try:
                        longueur = self.resoudre(longueur)
                    except Exception:
                        longueur = None
            fin = None
            if isinstance(longueur, int) and not isinstance(longueur, bool) and longueur >= 0:
                f = debut + longueur
                apres = data[f:f + 40].lstrip(_BLANCS)
                if apres.startswith(b'endstream'):
                    fin = f
            if fin is None:
                k = data.find(b'endstream', debut)
                if k < 0:
                    k = len(data)
                    self.notes.ajouter('flux tronque (fin du fichier avant endstream)')
                fin = k
                # retirer la fin de ligne avant endstream
                if fin > debut and data[fin - 1:fin] == b'\n':
                    fin -= 1
                if fin > debut and data[fin - 1:fin] == b'\r':
                    fin -= 1
            v = Flux(v, data[debut:fin], num, gen)
            if dechiffrer and self.chiffre is not None and num != self._num_enc:
                self._dechiffrer_chaines(v.dico, num, gen)
            return v
        if dechiffrer and self.chiffre is not None and num != getattr(self, '_num_enc', None):
            v = self._dechiffrer_chaines(v, num, gen)
        return v

    def _dechiffrer_chaines(self, v, num, gen):
        if isinstance(v, bytes):
            return self.chiffre.dechiffrer(v, num, gen, self.chiffre.strf)
        if isinstance(v, list):
            for i, x in enumerate(v):
                if isinstance(x, (bytes, list, dict)):
                    v[i] = self._dechiffrer_chaines(x, num, gen)
            return v
        if isinstance(v, dict):
            for k, x in list(v.items()):
                if isinstance(x, (bytes, list, dict)):
                    v[k] = self._dechiffrer_chaines(x, num, gen)
            return v
        return v

    def _objets_du_flux(self, num_flux, flux=None):
        if num_flux in self.objstm:
            return self.objstm[num_flux]
        if flux is None:
            flux = self.obtenir(num_flux)
        objets = {}
        if isinstance(flux, Flux):
            self.flux_objets += 1
            brut = self.decoder_flux(flux)
            n = entier(flux.dico.get('N'), 0)
            premier = entier(flux.dico.get('First'), 0)
            entete = re.findall(br'(\d+)[\x00\t\n\x0c\r ]+(\d+)', brut[:premier])
            positions = [(int(a), int(b)) for a, b in entete[:n]]
            for i, (num, off) in enumerate(positions):
                try:
                    v, _ = lire_valeur(brut, premier + off)
                    if isinstance(v, MotCle):
                        v = None
                except ErreurPDF:
                    v = None
                objets[num] = v
        self.objstm[num_flux] = objets
        return objets

    def _depuis_flux_objets(self, num, num_flux, index):
        objets = self._objets_du_flux(num_flux)
        return objets.get(num)

    # -- les flux --------------------------------------------------------------
    def decoder_flux(self, flux, dechiffrer=True, garder=False):
        """Les octets d'un flux, dechiffres et sans leurs filtres. Un filtre
        d'image (DCT, JPX, CCITT, JBIG2) n'est pas decode (on n'en a pas
        besoin) : les octets s'arretent avant lui."""
        if flux.cache is not None:
            return flux.cache
        data = flux.brut
        d = flux.dico
        filtres = self.resoudre(d.get('Filter'))
        params = self.resoudre(d.get('DecodeParms', d.get('DP')))
        if not isinstance(filtres, list):
            filtres = [filtres] if filtres is not None else []
        if not isinstance(params, list):
            params = [params] * len(filtres) if params is not None else [None] * len(filtres)
        filtres = [self.resoudre(f) for f in filtres]
        if dechiffrer and self.chiffre is not None and flux.num != self._num_enc:
            methode = self.chiffre.stmf
            if filtres and filtres[0] == 'Crypt':
                p = self.resoudre(params[0]) if params else None
                nom = p.get('Name') if isinstance(p, dict) else None
                methode = 'aucun' if nom in (None, 'Identity') else methode
            if d.get('Type') == 'XRef':
                methode = 'aucun'
            if d.get('Type') == 'Metadata' and not self.chiffre.encrypt_meta:
                methode = 'aucun'
            data = self.chiffre.dechiffrer(data, flux.num, flux.gen, methode)
        for i, f in enumerate(filtres):
            f = ABREV_FILTRES.get(str(f), str(f)) if f is not None else None
            p = self.resoudre(params[i]) if i < len(params) else None
            if not isinstance(p, dict):
                p = {}
            if f == 'FlateDecode':
                data = predicteur(flate(data), p)
            elif f == 'LZWDecode':
                data = predicteur(lzw(data, entier(p.get('EarlyChange'), 1)), p)
            elif f == 'ASCIIHexDecode':
                data = ascii_hex(data)
            elif f == 'ASCII85Decode':
                data = ascii85(data)
            elif f == 'RunLengthDecode':
                data = run_length(data)
            elif f == 'Crypt':
                pass
            elif f in FILTRES_IMAGE:
                break
            else:
                self.notes.ajouter('filtre %s non gere (flux ignore)' % nom_standard(f, 'maison'))
                raise ErreurPDF('filtre %s non gere' % nom_standard(f, 'maison'))
        if garder:
            flux.cache = data
        return data

# ===========================================================================
#  6. Les polices : encodages, noms de glyphes, largeurs
# ===========================================================================

NOMS_WINANSI = (
    'space exclam quotedbl numbersign dollar percent ampersand quotesingle parenleft parenright asterisk '
    'plus comma hyphen period slash zero one two three four five six seven eight nine colon semicolon less '
    'equal greater question at A B C D E F G H I J K L M N O P Q R S T U V W X Y Z bracketleft backslash '
    'bracketright asciicircum underscore grave a b c d e f g h i j k l m n o p q r s t u v w x y z braceleft '
    'bar braceright asciitilde bullet Euro bullet quotesinglbase florin quotedblbase ellipsis dagger daggerdbl '
    'circumflex perthousand Scaron guilsinglleft OE bullet Zcaron bullet bullet quoteleft quoteright '
    'quotedblleft quotedblright bullet endash emdash tilde trademark scaron guilsinglright oe bullet zcaron '
    'Ydieresis space exclamdown cent sterling currency yen brokenbar section dieresis copyright ordfeminine '
    'guillemotleft logicalnot hyphen registered macron degree plusminus twosuperior threesuperior acute mu '
    'paragraph periodcentered cedilla onesuperior ordmasculine guillemotright onequarter onehalf threequarters '
    'questiondown Agrave Aacute Acircumflex Atilde Adieresis Aring AE Ccedilla Egrave Eacute Ecircumflex '
    'Edieresis Igrave Iacute Icircumflex Idieresis Eth Ntilde Ograve Oacute Ocircumflex Otilde Odieresis '
    'multiply Oslash Ugrave Uacute Ucircumflex Udieresis Yacute Thorn germandbls agrave aacute acircumflex '
    'atilde adieresis aring ae ccedilla egrave eacute ecircumflex edieresis igrave iacute icircumflex '
    'idieresis eth ntilde ograve oacute ocircumflex otilde odieresis divide oslash ugrave uacute ucircumflex '
    'udieresis yacute thorn ydieresis').split()

# Largeurs (1/1000 du corps) des polices standard pour les codes WinAnsi 32 a 255
_LARGEURS_STD = {
    'Helvetica': '278 278 355 556 556 889 667 191 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 278 278 584 584 584 556 1015 667 667 722 722 667 611 778 722 278 500 667 556 833 722 778 667 778 722 667 611 722 667 944 667 667 611 278 278 278 469 556 333 556 556 500 556 556 278 556 556 222 222 500 222 833 556 556 556 556 333 500 278 556 500 722 500 500 500 334 260 334 584 350 556 350 222 556 333 1000 556 556 333 1000 667 333 1000 350 611 350 350 222 222 333 333 350 556 1000 333 1000 500 333 944 350 500 667 278 333 556 556 556 556 260 556 333 737 370 556 584 333 737 333 400 584 333 333 333 556 537 278 333 333 365 556 834 834 834 611 667 667 667 667 667 667 1000 722 667 667 667 667 278 278 278 278 722 722 778 778 778 778 778 584 778 722 722 722 722 667 667 611 556 556 556 556 556 556 889 500 556 556 556 556 278 278 278 278 556 556 556 556 556 556 556 584 611 556 556 556 556 500 556 500',
    'Helvetica-Bold': '278 333 474 556 556 889 722 238 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 333 333 584 584 584 611 975 722 722 722 722 667 611 778 722 278 556 722 611 833 722 778 667 778 722 667 611 722 667 944 667 667 611 333 278 333 584 556 333 556 611 556 611 556 333 611 611 278 278 556 278 889 611 611 611 611 389 556 333 611 556 778 556 556 500 389 280 389 584 350 556 350 278 556 500 1000 556 556 333 1000 667 333 1000 350 611 350 350 278 278 500 500 350 556 1000 333 1000 556 333 944 350 500 667 278 333 556 556 556 556 280 556 333 737 370 556 584 333 737 333 400 584 333 333 333 611 556 278 333 333 365 556 834 834 834 611 722 722 722 722 722 722 1000 722 667 667 667 667 278 278 278 278 722 722 778 778 778 778 778 584 778 722 722 722 722 667 667 611 556 556 556 556 556 556 889 556 556 556 556 556 278 278 278 278 611 611 611 611 611 611 611 584 611 611 611 611 611 556 611 556',
    'Times-Roman': '250 333 408 500 500 833 778 180 333 333 500 564 250 333 250 278 500 500 500 500 500 500 500 500 500 500 278 278 564 564 564 444 921 722 667 667 722 611 556 722 722 333 389 722 611 889 722 722 556 722 667 556 611 722 722 944 722 722 611 333 278 333 469 500 333 444 500 444 500 444 333 500 500 278 278 500 278 778 500 500 500 500 333 389 278 500 500 722 500 500 444 480 200 480 541 350 500 350 333 500 444 1000 500 500 333 1000 556 333 889 350 611 350 350 333 333 444 444 350 500 1000 333 980 389 333 722 350 444 722 250 333 500 500 500 500 200 500 333 760 276 500 564 333 760 333 400 564 300 300 333 500 453 250 333 300 310 500 750 750 750 444 722 722 722 722 722 722 889 667 611 611 611 611 333 333 333 333 722 722 722 722 722 722 722 564 722 722 722 722 722 722 556 500 444 444 444 444 444 444 667 444 444 444 444 444 278 278 278 278 500 500 500 500 500 500 500 564 500 500 500 500 500 500 500 500',
    'Times-Bold': '250 333 555 500 500 1000 833 278 333 333 500 570 250 333 250 278 500 500 500 500 500 500 500 500 500 500 333 333 570 570 570 500 930 722 667 722 722 667 611 778 778 389 500 778 667 944 722 778 611 778 722 556 667 722 722 1000 722 722 667 333 278 333 581 500 333 500 556 444 556 444 333 500 556 278 333 556 278 833 556 500 556 556 444 389 333 556 500 722 500 500 444 394 220 394 520 350 500 350 333 500 500 1000 500 500 333 1000 556 333 1000 350 667 350 350 333 333 500 500 350 500 1000 333 1000 389 333 722 350 444 722 250 333 500 500 500 500 220 500 333 747 300 500 570 333 747 333 400 570 300 300 333 556 540 250 333 300 330 500 750 750 750 500 722 722 722 722 722 722 1000 722 667 667 667 667 389 389 389 389 722 722 778 778 778 778 778 570 778 722 722 722 722 722 611 556 500 500 500 500 500 500 722 444 444 444 444 444 278 278 278 278 500 556 500 500 500 500 500 570 500 556 556 556 556 500 556 500',
    'Times-Italic': '250 333 420 500 500 833 778 214 333 333 500 675 250 333 250 278 500 500 500 500 500 500 500 500 500 500 333 333 675 675 675 500 920 611 611 667 722 611 611 722 722 333 444 667 556 833 667 722 611 722 611 500 556 722 611 833 611 556 556 389 278 389 422 500 333 500 500 444 500 444 278 500 500 278 278 444 278 722 500 500 500 500 389 389 278 500 444 667 444 444 389 400 275 400 541 350 500 350 333 500 556 889 500 500 333 1000 500 333 944 350 556 350 350 333 333 556 556 350 500 889 333 980 389 333 667 350 389 556 250 389 500 500 500 500 275 500 333 760 276 500 675 333 760 333 400 675 300 300 333 500 523 250 333 300 310 500 750 750 750 500 611 611 611 611 611 611 889 667 611 611 611 611 333 333 333 333 722 667 722 722 722 722 722 675 722 722 722 722 722 556 611 500 500 500 500 500 500 500 667 444 444 444 444 444 278 278 278 278 500 500 500 500 500 500 500 675 500 500 500 500 500 444 500 444',
    'Times-BoldItalic': '250 389 555 500 500 833 778 278 333 333 500 570 250 333 250 278 500 500 500 500 500 500 500 500 500 500 333 333 570 570 570 500 832 667 667 667 722 667 667 722 778 389 500 667 611 889 722 722 611 722 667 556 611 722 667 889 667 611 611 333 278 333 570 500 333 500 500 444 500 444 333 500 556 278 278 500 278 778 556 500 500 500 389 389 278 556 444 667 500 444 389 348 220 348 570 350 500 350 333 500 500 1000 500 500 333 1000 556 333 944 350 611 350 350 333 333 500 500 350 500 1000 333 1000 389 333 722 350 389 611 250 389 500 500 500 500 220 500 333 747 266 500 606 333 747 333 400 570 300 300 333 576 500 250 333 300 300 500 750 750 750 500 667 667 667 667 667 667 944 667 667 667 667 667 389 389 389 389 722 722 722 722 722 722 722 570 722 722 722 722 722 611 611 500 500 500 500 500 500 500 722 444 444 444 444 444 278 278 278 278 500 556 500 500 500 500 500 570 500 556 556 556 556 444 500 444',
    'Symbol': '250 333 713 500 549 833 778 439 333 333 500 549 250 549 250 278 500 500 500 500 500 500 500 500 500 500 278 278 549 549 549 444 549 722 667 722 612 611 763 603 722 333 631 722 686 889 722 722 768 741 556 592 611 690 439 768 645 795 611 333 863 333 658 500 500 631 549 549 494 439 521 411 603 329 603 549 549 576 521 549 549 521 549 603 439 576 713 686 493 686 494 480 200 480 549 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 750 620 247 549 167 713 500 753 753 753 753 1042 987 603 987 603 400 549 411 549 549 713 494 460 549 549 549 549 1000 603 1000 658 823 686 795 987 768 768 823 768 768 713 713 713 713 713 713 713 768 713 790 790 890 823 549 250 713 603 603 1042 987 603 987 603 494 329 790 790 786 713 384 384 384 384 384 384 494 494 494 494 0 329 274 686 686 686 384 384 384 384 384 384 494 494 494 0',
    'ZapfDingbats': '278 974 961 974 980 719 789 790 791 690 960 939 549 855 911 933 911 945 974 755 846 762 761 571 677 763 760 759 754 494 552 537 577 692 786 788 788 790 793 794 816 823 789 841 823 833 816 831 923 744 723 749 790 792 695 776 768 792 759 707 708 682 701 826 815 789 789 707 687 696 689 786 787 713 791 785 791 873 761 762 762 759 759 892 892 788 784 438 138 277 415 392 392 668 668 0 390 390 317 317 276 276 509 509 410 410 234 234 334 334 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 732 544 544 910 667 760 760 776 595 694 626 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 788 894 838 1016 458 748 924 748 918 927 928 928 834 873 828 924 924 917 930 931 463 883 836 836 867 867 696 696 874 0 874 760 946 771 865 771 888 967 888 831 873 927 970 918 0',
}
_TABLES_STD = {}


def largeurs_standard(nom):
    t = _TABLES_STD.get(nom)
    if t is None and nom in _LARGEURS_STD:
        t = [int(x) for x in _LARGEURS_STD[nom].split()]
        _TABLES_STD[nom] = t
    return t


_ACCENTS_AGL = (('DOUBLE ACUTE', 'hungarumlaut'), ('ACUTE', 'acute'), ('GRAVE', 'grave'),
                ('CIRCUMFLEX', 'circumflex'), ('DIAERESIS', 'dieresis'), ('TILDE', 'tilde'),
                ('RING ABOVE', 'ring'), ('CEDILLA', 'cedilla'), ('CARON', 'caron'), ('MACRON', 'macron'),
                ('BREVE', 'breve'), ('OGONEK', 'ogonek'), ('DOT ABOVE', 'dotaccent'), ('STROKE', 'slash'),
                ('MIDDLE DOT', 'dot'), ('COMMA BELOW', 'commaaccent'))
_GLYPHES = None


def table_glyphes():
    """Nom de glyphe -> caractere : les noms de l'encodage WinAnsi, ceux des
    lettres latines accentuees (deduits des noms Unicode), les lettres
    grecques et quelques symboles courants."""
    global _GLYPHES
    if _GLYPHES is not None:
        return _GLYPHES
    g = {}
    for i, nom in enumerate(NOMS_WINANSI):
        code = 32 + i
        if nom == 'bullet':
            g[nom] = u'•'
            continue
        try:
            c = bytes([code]).decode('cp1252')
        except UnicodeDecodeError:
            continue
        g.setdefault(nom, c)
    for cp in list(range(0xC0, 0x250)) + list(range(0x370, 0x3D0)):
        c = chr(cp)
        try:
            n = unicodedata.name(c)
        except ValueError:
            continue
        m = re.match(r'(LATIN|GREEK) (CAPITAL|SMALL) LETTER (\w+)(?: WITH (.*))?$', n)
        if not m:
            continue
        lettre = m.group(3)
        if m.group(1) == 'GREEK':
            if m.group(4):
                continue
            base = lettre.lower()
            base = {'lamda': 'lambda', 'final sigma': 'sigma1'}.get(base, base)
            nom = base[0].upper() + base[1:] if m.group(2) == 'CAPITAL' else base
        else:
            if len(lettre) != 1:
                continue
            base = lettre if m.group(2) == 'CAPITAL' else lettre.lower()
            accent = ''
            if m.group(4):
                for cle, mot in _ACCENTS_AGL:
                    if m.group(4) == cle:
                        accent = mot
                        break
                if not accent:
                    continue
            nom = base + accent
        g.setdefault(nom, c)
    extras = {
        'fi': u'ﬁ', 'fl': u'ﬂ', 'ff': u'ﬀ', 'ffi': u'ﬃ', 'ffl': u'ﬄ',
        'dotlessi': u'ı', 'fraction': u'⁄', 'ring': u'˚', 'hungarumlaut': u'˝',
        'ogonek': u'˛', 'caron': u'ˇ', 'breve': u'˘', 'dotaccent': u'˙',
        'Lslash': u'Ł', 'lslash': u'ł', 'minus': u'−', 'Delta': u'∆', 'Omega': u'Ω',
        'mu': u'µ', 'nbspace': u' ', 'nonbreakingspace': u' ', 'sfthyphen': u'­',
        'middot': u'·', 'arrowright': u'→', 'arrowleft': u'←', 'arrowup': u'↑',
        'arrowdown': u'↓', 'arrowboth': u'↔', 'lessequal': u'≤', 'greaterequal': u'≥',
        'notequal': u'≠', 'approxequal': u'≈', 'infinity': u'∞', 'radical': u'√',
        'summation': u'∑', 'product': u'∏', 'integral': u'∫', 'partialdiff': u'∂',
        'lozenge': u'◊', 'apple': u'', 'universal': u'∀', 'existential': u'∃',
        'emptyset': u'∅', 'element': u'∈', 'angle': u'∠', 'minute': u'′',
        'second': u'″', 'dotmath': u'⋅', 'asteriskmath': u'∗', 'similar': u'∼',
        'congruent': u'≅', 'perpendicular': u'⊥', 'therefore': u'∴', 'suchthat': u'∋',
        'proportional': u'∝', 'equivalence': u'≡', 'circleplus': u'⊕', 'circlemultiply': u'⊗',
        'Ifraktur': u'ℑ', 'Rfraktur': u'ℜ', 'aleph': u'ℵ', 'weierstrass': u'℘',
        'theta1': u'ϑ', 'phi1': u'ϕ', 'omega1': u'ϖ', 'Upsilon1': u'ϒ', 'sigma1': u'ς',
        'club': u'♣', 'diamond': u'♦', 'heart': u'♥', 'spade': u'♠',
        'quotesingle': u"'", 'grave': u'`', 'quoteleft': u'‘', 'quoteright': u'’',
        'Dcroat': u'Đ', 'dcroat': u'đ', 'Hbar': u'Ħ', 'hbar': u'ħ',
        'IJ': u'Ĳ', 'ij': u'ĳ', 'Eng': u'Ŋ', 'eng': u'ŋ', 'kgreenlandic': u'ĸ',
        'napostrophe': u'ŉ', 'longs': u'ſ', 'Ldot': u'Ŀ', 'ldot': u'ŀ',
        'periodcentered': u'·', 'ohm': u'Ω', 'Ohm': u'Ω', 'micro': u'µ',
        'commaaccent': u'̦', 'onethird': u'⅓', 'twothirds': u'⅔', 'degreecentigrade': u'℃',
        'uni00A0': u' ', 'figuredash': u'‒', 'quotereversed': u'‛', 'Euro': u'€',
        'checkmark': u'✓', 'arrowdblright': u'⇒', 'arrowdblleft': u'⇐', 'triagup': u'▲',
        'triagdn': u'▼', 'triagrt': u'►', 'triaglf': u'◄', 'filledbox': u'■',
        'H22073': u'□', 'circle': u'○', 'H18533': u'●', 'openbullet': u'◦',
    }
    for k, v in extras.items():
        g.setdefault(k, v)
    _GLYPHES = g
    return g


def unicode_du_glyphe(nom):
    """Le caractere d'un nom de glyphe, ou None s'il est inconnu."""
    if not nom:
        return None
    g = table_glyphes()
    c = g.get(nom)
    if c is not None:
        return c
    base = nom.split('.')[0]
    if base != nom:
        c = g.get(base)
        if c is not None:
            return c
    if '_' in base:
        morceaux = [unicode_du_glyphe(p) for p in base.split('_')]
        if all(morceaux):
            return u''.join(morceaux)
    m = re.match(r'uni((?:[0-9A-Fa-f]{4})+)$', base)
    if m:
        h = m.group(1)
        try:
            return u''.join(chr(int(h[i:i + 4], 16)) for i in range(0, len(h), 4))
        except ValueError:
            return None
    m = re.match(r'u([0-9A-Fa-f]{4,6})$', base)
    if m:
        try:
            return chr(int(m.group(1), 16))
        except ValueError:
            return None
    if len(base) == 1:
        return base
    return None


# l'encodage standard d'Adobe : ce qui differe de l'ASCII
_STANDARD_HAUT = {
    0x27: 'quoteright', 0x60: 'quoteleft', 0xA1: 'exclamdown', 0xA2: 'cent', 0xA3: 'sterling',
    0xA4: 'fraction', 0xA5: 'yen', 0xA6: 'florin', 0xA7: 'section', 0xA8: 'currency',
    0xA9: 'quotesingle', 0xAA: 'quotedblleft', 0xAB: 'guillemotleft', 0xAC: 'guilsinglleft',
    0xAD: 'guilsinglright', 0xAE: 'fi', 0xAF: 'fl', 0xB1: 'endash', 0xB2: 'dagger', 0xB3: 'daggerdbl',
    0xB4: 'periodcentered', 0xB6: 'paragraph', 0xB7: 'bullet', 0xB8: 'quotesinglbase',
    0xB9: 'quotedblbase', 0xBA: 'quotedblright', 0xBB: 'guillemotright', 0xBC: 'ellipsis',
    0xBD: 'perthousand', 0xBF: 'questiondown', 0xC1: 'grave', 0xC2: 'acute', 0xC3: 'circumflex',
    0xC4: 'tilde', 0xC5: 'macron', 0xC6: 'breve', 0xC7: 'dotaccent', 0xC8: 'dieresis', 0xCA: 'ring',
    0xCB: 'cedilla', 0xCD: 'hungarumlaut', 0xCE: 'ogonek', 0xCF: 'caron', 0xD0: 'emdash', 0xE1: 'AE',
    0xE3: 'ordfeminine', 0xE8: 'Lslash', 0xE9: 'Oslash', 0xEA: 'OE', 0xEB: 'ordmasculine', 0xF1: 'ae',
    0xF5: 'dotlessi', 0xF8: 'lslash', 0xF9: 'oslash', 0xFA: 'oe', 0xFB: 'germandbls'}
_ENCODAGES = {}


def encodage_de_base(nom):
    """Liste de 256 noms de glyphes (ou None) pour WinAnsi, MacRoman,
    Standard, PDFDoc."""
    if nom in _ENCODAGES:
        return _ENCODAGES[nom]
    t = [None] * 256
    if nom == 'WinAnsiEncoding':
        for i, n in enumerate(NOMS_WINANSI):
            t[32 + i] = n
        for c in (0x7F, 0x81, 0x8D, 0x8F, 0x90, 0x9D):
            t[c] = 'bullet'
        t[0xA0] = 'space'
        t[0xAD] = 'hyphen'
    elif nom in ('MacRomanEncoding', 'MacExpertEncoding'):
        inverse = {}
        for k, v in table_glyphes().items():
            inverse.setdefault(v, k)
        for c in range(32, 256):
            try:
                ch = bytes([c]).decode('mac_roman')
            except UnicodeDecodeError:
                continue
            t[c] = inverse.get(ch, 'uni%04X' % ord(ch))
        for i in range(32, 127):
            t[i] = NOMS_WINANSI[i - 32]
    else:                                   # StandardEncoding (et par defaut)
        for i in range(32, 127):
            t[i] = NOMS_WINANSI[i - 32]
        for c in range(0x80, 0x100):
            t[c] = None
        for c, n in _STANDARD_HAUT.items():
            t[c] = n
    _ENCODAGES[nom] = t
    return t


# Symbol : le code -> caractere (les lettres sont grecques)
_SYMBOL_LETTRES = u'ΑΒΧΔΕΦΓΗΙϑΚΛΜΝΟΠΘΡΣΤΥςΩΞΨΖ'
_SYMBOL_HAUT = {0xA0: u'€', 0xA1: u'ϒ', 0xA2: u'′', 0xA3: u'≤', 0xA4: u'⁄', 0xA5: u'∞',
                0xA6: u'ƒ', 0xAB: u'↔', 0xAC: u'←', 0xAD: u'↑', 0xAE: u'→', 0xAF: u'↓',
                0xB0: u'°', 0xB1: u'±', 0xB2: u'″', 0xB3: u'≥', 0xB4: u'×', 0xB5: u'∝',
                0xB6: u'∂', 0xB7: u'•', 0xB8: u'÷', 0xB9: u'≠', 0xBA: u'≡', 0xBB: u'≈',
                0xBC: u'…', 0xC6: u'∅', 0xD6: u'√', 0xE5: u'∑', 0xF2: u'∫'}


def unicode_symbol(code):
    if 0x41 <= code <= 0x5A:
        return _SYMBOL_LETTRES[code - 0x41]
    if 0x61 <= code <= 0x7A:
        c = _SYMBOL_LETTRES[code - 0x61]
        return c.lower() if c != u'ς' else u'ς'
    if code == 0x2D:
        return u'−'
    if 0x20 <= code < 0x7F:
        return chr(code)
    return _SYMBOL_HAUT.get(code)


def police_standard(nom):
    """Le nom d'une des 14 polices standard qui ressemble a ce nom, ou None."""
    n = re.sub(r'[^A-Za-z]', '', nom or '').lower()
    gras = 'bold' in n or 'black' in n or 'heavy' in n
    italique = 'italic' in n or 'oblique' in n
    if n.startswith('symbol'):
        return 'Symbol'
    if 'dingbat' in n:
        return 'ZapfDingbats'
    if 'courier' in n or 'mono' in n:
        return 'Courier'
    if 'times' in n or 'roman' in n or 'serif' in n and 'sans' not in n:
        if gras and italique:
            return 'Times-BoldItalic'
        return 'Times-Bold' if gras else ('Times-Italic' if italique else 'Times-Roman')
    if 'helvetica' in n or 'arial' in n:
        return 'Helvetica-Bold' if gras else 'Helvetica'
    return None


_RE_CMAP_LIGNES = re.compile(
    br'begincodespacerange(.*?)endcodespacerange|beginbfchar(.*?)endbfchar|beginbfrange(.*?)endbfrange|'
    br'begincidrange(.*?)endcidrange|begincidchar(.*?)endcidchar|/CMapName[\x00\t\n\x0c\r ]*/(\S+)|'
    br'/WMode[\x00\t\n\x0c\r ]+(\d)|/(\S+)[\x00\t\n\x0c\r ]+usecmap', re.S)


def valeurs_cmap(bloc):
    """Les jetons d'un bloc de CMap : chaines hexa, nombres, tableaux."""
    sortie = []
    pos = 0
    while True:
        try:
            v, pos = lire_valeur(bloc, pos)
        except ErreurPDF:
            break
        if isinstance(v, MotCle):
            continue
        sortie.append(v)
    return sortie


class CMap(object):
    """Une CMap : ses plages de codes (combien d'octets par code) et ses
    correspondances (vers l'Unicode pour une ToUnicode, vers les CID sinon)."""

    def __init__(self):
        self.plages = []             # (longueur, debut, fin)
        self.vers = {}               # code (int) -> str (ToUnicode) ou int (CID)
        self.intervalles = []        # (debut, fin, base) pour les cidrange
        self.nom = ''
        self.wmode = 0

    def lire(self, data, lecteur=None, unicode=True):
        for m in _RE_CMAP_LIGNES.finditer(data):
            if m.group(1) is not None:
                v = valeurs_cmap(m.group(1))
                for i in range(0, len(v) - 1, 2):
                    if isinstance(v[i], bytes) and isinstance(v[i + 1], bytes):
                        self.plages.append((len(v[i]), int.from_bytes(v[i], 'big'), int.from_bytes(v[i + 1], 'big')))
            elif m.group(2) is not None:
                v = valeurs_cmap(m.group(2))
                for i in range(0, len(v) - 1, 2):
                    if isinstance(v[i], bytes):
                        self.vers[(len(v[i]), int.from_bytes(v[i], 'big'))] = self._dest(v[i + 1], unicode)
            elif m.group(3) is not None:
                v = valeurs_cmap(m.group(3))
                for i in range(0, len(v) - 2, 3):
                    a, b, d = v[i], v[i + 1], v[i + 2]
                    if not isinstance(a, bytes) or not isinstance(b, bytes):
                        continue
                    n = len(a)
                    ia, ib = int.from_bytes(a, 'big'), int.from_bytes(b, 'big')
                    if ib - ia > 65535 or ib < ia:
                        continue
                    if isinstance(d, list):
                        for k, x in enumerate(d):
                            self.vers[(n, ia + k)] = self._dest(x, unicode)
                    elif isinstance(d, bytes) and d:
                        base = int.from_bytes(d, 'big')
                        long_d = len(d)
                        for k in range(ib - ia + 1):
                            x = (base + k).to_bytes(long_d, 'big') if base + k < 256 ** long_d else d
                            self.vers[(n, ia + k)] = self._dest(x, unicode)
            elif m.group(4) is not None:
                v = valeurs_cmap(m.group(4))
                for i in range(0, len(v) - 2, 3):
                    a, b, d = v[i], v[i + 1], v[i + 2]
                    if isinstance(a, bytes) and isinstance(b, bytes) and isinstance(d, int):
                        self.intervalles.append((len(a), int.from_bytes(a, 'big'), int.from_bytes(b, 'big'), d))
            elif m.group(5) is not None:
                v = valeurs_cmap(m.group(5))
                for i in range(0, len(v) - 1, 2):
                    if isinstance(v[i], bytes) and isinstance(v[i + 1], int):
                        self.vers[(len(v[i]), int.from_bytes(v[i], 'big'))] = v[i + 1]
            elif m.group(6) is not None:
                self.nom = m.group(6).decode('latin-1')
            elif m.group(7) is not None:
                self.wmode = int(m.group(7))
        return self

    @staticmethod
    def _dest(v, unicode):
        if not unicode:
            return v
        if isinstance(v, bytes):
            if len(v) % 2:
                v = b'\x00' + v
            try:
                return v.decode('utf-16-be', 'replace')
            except Exception:
                return None
        if isinstance(v, int):
            return chr(v) if 0 <= v < 0x110000 else None
        if isinstance(v, Nom):
            return unicode_du_glyphe(str(v))
        return None

    def decouper(self, s):
        """Coupe une chaine en codes (longueur, valeur) selon les plages."""
        codes = []
        i = 0
        n = len(s)
        plages = self.plages
        if not plages:
            while i + 1 < n:
                codes.append((2, (s[i] << 8) | s[i + 1]))
                i += 2
            if i < n:
                codes.append((1, s[i]))
            return codes
        while i < n:
            trouve = False
            for l in (1, 2, 3, 4):
                if i + l > n:
                    break
                v = int.from_bytes(s[i:i + l], 'big')
                for (pl, a, b) in plages:
                    if pl == l and a <= v <= b:
                        codes.append((l, v))
                        i += l
                        trouve = True
                        break
                if trouve:
                    break
            if not trouve:
                # pas dans les plages : on avance de la plus petite longueur
                l = min(p[0] for p in plages)
                codes.append((l, int.from_bytes(s[i:i + l], 'big')))
                i += l
        return codes

    def cid(self, code):
        l, v = code
        c = self.vers.get(code)
        if isinstance(c, int):
            return c
        for (pl, a, b, base) in self.intervalles:
            if pl == l and a <= v <= b:
                return base + v - a
        return None


INCONNU = u'¤'      # ce qu'on met pour un glyphe sans caractere connu


class Police(object):
    """Une police de page : decoder une chaine en glyphes (caractere, largeur)."""

    def __init__(self, lecteur, dico, notes):
        self.lecteur = lecteur
        self.notes = notes
        r = lecteur.resoudre
        self.dico = dico
        self.de_secours = False
        self.sous_type = str(r(dico.get('Subtype')) or '')
        base = r(dico.get('BaseFont'))
        nom = str(base) if base is not None else ''
        if '+' in nom[:8]:
            nom = nom.split('+', 1)[1]
        self.nom = nom or self.sous_type or 'police'
        self.composite = self.sous_type == 'Type0'
        self.type3 = self.sous_type == 'Type3'
        self.matrice = (0.001, 0, 0, 0.001, 0, 0)
        self.cache = {}
        self.vertical = False
        self.unicode_cmap = None
        tu = r(dico.get('ToUnicode'))
        if isinstance(tu, Flux):
            try:
                self.unicode_cmap = CMap().lire(lecteur.decoder_flux(tu))
            except Exception:
                notes.ajouter('ToUnicode illisible pour une police')
        elif isinstance(tu, Nom) and str(tu) != 'Identity-H':
            pass
        if self.composite:
            self._charger_composite()
        else:
            self._charger_simple()

    # -- polices simples -----------------------------------------------------
    def _charger_simple(self):
        r = self.lecteur.resoudre
        d = self.dico
        desc = r(d.get('FontDescriptor'))
        if not isinstance(desc, dict):
            desc = {}
        drapeaux = entier(r(desc.get('Flags')), 0)
        std = police_standard(self.nom) if not self.type3 else None
        self.std = std
        symbolique = bool(drapeaux & 4) and not (drapeaux & 32)
        enc = r(d.get('Encoding'))
        base_enc = None
        differences = None
        if isinstance(enc, Nom):
            base_enc = str(enc)
        elif isinstance(enc, dict):
            be = r(enc.get('BaseEncoding'))
            base_enc = str(be) if isinstance(be, Nom) else None
            differences = r(enc.get('Differences'))
        if std == 'Symbol' and base_enc is None:
            self.table = None
            self.special = 'Symbol'
        elif std == 'ZapfDingbats' and base_enc is None:
            self.table = None
            self.special = 'ZapfDingbats'
        else:
            self.special = None
            if base_enc is None:
                if self.type3 or symbolique:
                    base_enc = 'StandardEncoding' if not symbolique else 'WinAnsiEncoding'
                else:
                    base_enc = 'StandardEncoding'
                if symbolique and self.unicode_cmap is None:
                    self.notes.ajouter('police symbolique sans ToUnicode : caracteres supposes WinAnsi')
            self.table = list(encodage_de_base(base_enc))
        if isinstance(differences, list):
            if self.table is None:
                self.table = [None] * 256
            code = 0
            for x in differences:
                x = r(x)
                if isinstance(x, (int, float)) and not isinstance(x, bool):
                    code = int(x)
                elif isinstance(x, Nom):
                    if 0 <= code < 256:
                        self.table[code] = str(x)
                    code += 1
        # largeurs
        self.premier = entier(r(d.get('FirstChar')), 0)
        largeurs = r(d.get('Widths'))
        self.largeurs = [float(r(x)) if isinstance(r(x), (int, float)) else 0.0 for x in largeurs] \
            if isinstance(largeurs, list) else None
        self.manquante = float(r(desc.get('MissingWidth')) or 0) if isinstance(r(desc.get('MissingWidth')), (int, float)) else 0.0
        if self.type3:
            fm = r(d.get('FontMatrix'))
            if isinstance(fm, list) and len(fm) == 6:
                self.matrice = tuple(float(r(x)) for x in fm)
            if self.largeurs is None:
                self.largeurs = []
        if self.largeurs is None and std is None:
            self.notes.ajouter('police sans /Widths ni metrique standard : largeurs estimees')
        self.table_std = largeurs_standard(std) if std and std != 'Courier' else None

    def _largeur_simple(self, code):
        if self.largeurs is not None:
            i = code - self.premier
            if 0 <= i < len(self.largeurs):
                w = self.largeurs[i]
                if self.type3:
                    return w * self.matrice[0]
                return w / 1000.0
            if self.type3:
                return 0.0
            if self.largeurs:
                return self.manquante / 1000.0
        if self.std == 'Courier':
            return 0.6
        if self.special in ('Symbol', 'ZapfDingbats'):
            t = largeurs_standard(self.special)
            return t[code - 32] / 1000.0 if 32 <= code < 256 else 0.0
        if self.table_std is not None:
            nom = self.table[code] if self.table else None
            if nom:
                try:
                    i = NOMS_WINANSI.index(nom)
                    return self.table_std[i] / 1000.0
                except ValueError:
                    pass
            return 0.5
        return 0.5

    def _unicode_simple(self, code):
        if self.unicode_cmap is not None:
            u = self.unicode_cmap.vers.get((1, code)) or self.unicode_cmap.vers.get((2, code))
            if u:
                return u
        if self.special == 'Symbol':
            u = unicode_symbol(code)
            if u:
                return u
        if self.table is not None:
            nom = self.table[code] if 0 <= code < 256 else None
            u = unicode_du_glyphe(nom)
            if u:
                return u
            if nom is None and 32 <= code < 127 and self.type3 is False and self.special is None:
                return chr(code)
        return INCONNU

    # -- polices composites --------------------------------------------------
    def _charger_composite(self):
        r = self.lecteur.resoudre
        d = self.dico
        enc = r(d.get('Encoding'))
        self.cmap = CMap()
        self.cmap_unicode_direct = False
        if isinstance(enc, Nom):
            n = str(enc)
            if n in ('Identity-H', 'Identity-V'):
                self.cmap.plages = [(2, 0, 0xFFFF)]
                self.identite = True
                self.vertical = n.endswith('-V')
            else:
                self.identite = False
                self.cmap.plages = [(2, 0, 0xFFFF)]
                if re.search(r'UCS2|UTF16', n):
                    self.cmap_unicode_direct = True
                else:
                    self.notes.ajouter('CMap predefinie %s non geree : codes lus sur deux octets' % nom_standard(n, '(nom masque)'))
                self.vertical = n.endswith('-V')
        elif isinstance(enc, Flux):
            try:
                self.cmap = CMap().lire(self.lecteur.decoder_flux(enc), unicode=False)
                if not self.cmap.plages:
                    self.cmap.plages = [(2, 0, 0xFFFF)]
                self.vertical = self.cmap.wmode == 1
            except Exception:
                self.cmap.plages = [(2, 0, 0xFFFF)]
            self.identite = False
        else:
            self.cmap.plages = [(2, 0, 0xFFFF)]
            self.identite = True
        if self.vertical:
            self.notes.ajouter('ecriture verticale (CMap -V) : placee comme horizontale')
        desc = r(d.get('DescendantFonts'))
        df = r(desc[0]) if isinstance(desc, list) and desc else {}
        if not isinstance(df, dict):
            df = {}
        bn = r(df.get('BaseFont'))
        if isinstance(bn, Nom) and (not self.nom or self.nom == 'Type0'):
            self.nom = str(bn).split('+', 1)[-1]
        self.dw = float(r(df.get('DW'))) if isinstance(r(df.get('DW')), (int, float)) else 1000.0
        self.w = {}
        w = r(df.get('W'))
        if isinstance(w, list):
            i = 0
            w = [r(x) for x in w]
            while i < len(w):
                a = w[i]
                if i + 1 < len(w) and isinstance(w[i + 1], list):
                    for k, x in enumerate(w[i + 1]):
                        x = r(x)
                        if isinstance(x, (int, float)):
                            self.w[int(a) + k] = float(x)
                    i += 2
                elif i + 2 < len(w):
                    b, x = w[i + 1], w[i + 2]
                    if isinstance(a, (int, float)) and isinstance(b, (int, float)) and isinstance(x, (int, float)):
                        if b - a < 100000:
                            for c in range(int(a), int(b) + 1):
                                self.w[c] = float(x)
                    i += 3
                else:
                    break
        if self.unicode_cmap is None and not self.cmap_unicode_direct:
            self.notes.ajouter('police composite sans ToUnicode : caracteres inconnus (sauf si PyMuPDF les lit)')

    def glyphes(self, s):
        """[(caractere, largeur en unites de texte (1 = le corps), mot (code 32 d'un octet))]."""
        g = self.cache.get(s)
        if g is not None:
            return g
        sortie = []
        if self.composite:
            for code in self.cmap.decouper(s):
                cid = self.cmap.cid(code) if not self.identite else code[1]
                if cid is None:
                    cid = code[1]
                u = None
                if self.unicode_cmap is not None:
                    u = self.unicode_cmap.vers.get(code)
                    if u is None and code[0] == 2:
                        u = self.unicode_cmap.vers.get((2, code[1]))
                if u is None and self.cmap_unicode_direct:
                    try:
                        u = chr(code[1])
                    except ValueError:
                        u = None
                w = self.w.get(cid, self.dw) / 1000.0
                sortie.append((u or INCONNU, w, code == (1, 32)))
        else:
            for code in s:
                sortie.append((self._unicode_simple(code), self._largeur_simple(code), code == 32))
        if len(self.cache) < 5000:
            self.cache[s] = sortie
        return sortie


# ===========================================================================
#  7. Les couleurs
# ===========================================================================

def cmyk_rgb(c, m, y, k):
    return ((1 - c) * (1 - k), (1 - m) * (1 - k), (1 - y) * (1 - k))


def borner(x):
    return 0.0 if x < 0 else (1.0 if x > 1 else x)


class EspaceCouleur(object):
    """Un espace de couleur reduit a ce qu'il faut pour rendre une couleur RGB
    approchee : nombre de composantes et conversion."""

    def __init__(self, genre, n, **kw):
        self.genre = genre       # 'gris', 'rgb', 'cmyk', 'lab', 'indexe', 'separation', 'devicen', 'motif'
        self.n = n
        self.__dict__.update(kw)

    def initiale(self):
        if self.genre in ('separation', 'devicen'):
            return [1.0] * self.n
        if self.genre == 'cmyk':
            return [0.0, 0.0, 0.0, 1.0]
        if self.genre == 'lab':
            return [0.0, 0.0, 0.0]
        return [0.0] * self.n

    def rgb(self, v):
        try:
            if self.genre == 'gris':
                g = borner(float(v[0]))
                return (g, g, g)
            if self.genre == 'rgb':
                return (borner(float(v[0])), borner(float(v[1])), borner(float(v[2])))
            if self.genre == 'cmyk':
                return cmyk_rgb(*[borner(float(x)) for x in v[:4]])
            if self.genre == 'lab':
                g = borner(float(v[0]) / 100.0)
                return (g, g, g)
            if self.genre == 'indexe':
                i = max(0, min(self.hival, int(round(float(v[0])))))
                n = self.base.n
                morceau = self.table[i * n:(i + 1) * n]
                if len(morceau) < n:
                    return (0.0, 0.0, 0.0)
                return self.base.rgb([b / 255.0 for b in morceau])
            if self.genre in ('separation', 'devicen'):
                if self.nom_sep == 'None':
                    return None
                if self.fonction is not None and self.alt is not None:
                    sortie = self.fonction(v)
                    if sortie is not None:
                        return self.alt.rgb(sortie)
                t = borner(float(v[0])) if v else 1.0
                return (1 - t, 1 - t, 1 - t)
        except (ValueError, TypeError, IndexError):
            return (0.0, 0.0, 0.0)
        return None


GRIS = EspaceCouleur('gris', 1)
RGB = EspaceCouleur('rgb', 3)
CMYK = EspaceCouleur('cmyk', 4)
MOTIF = EspaceCouleur('motif', 0)


def fonction_type2(d, r):
    """Une fonction exponentielle (type 2), la plus courante pour une teinte."""
    c0 = r(d.get('C0')) or [0.0]
    c1 = r(d.get('C1')) or [1.0]
    n = r(d.get('N'))
    n = float(n) if isinstance(n, (int, float)) else 1.0
    c0 = [float(r(x)) for x in c0]
    c1 = [float(r(x)) for x in c1]

    def f(v):
        t = borner(float(v[0])) if v else 1.0
        return [a + (t ** n) * (b - a) for a, b in zip(c0, c1)]
    return f


# ===========================================================================
#  8. Le collecteur : ce que les deux lecteurs rendent, sous une meme forme
# ===========================================================================

class NotesNonGere(object):
    """Ce que la lecture n'a pas gere : chaque message une fois, avec son
    nombre d'occurrences."""

    def __init__(self):
        self.messages = {}
        self.ordre = []

    def ajouter(self, message):
        if message not in self.messages:
            self.messages[message] = 0
            self.ordre.append(message)
        self.messages[message] += 1

    def liste(self):
        return [(m, self.messages[m]) for m in self.ordre]


class Collecteur(object):
    """Recoit, page par page, les traces des chemins, les glyphes et les
    images, en coordonnees de la page vue (points, origine en haut a gauche,
    y vers le bas, rotation de la page appliquee)."""

    def __init__(self):
        self.chemins = []        # dict : items, trait, fond, ep, at, af, calque, tirets
        self.glyphes = []        # tuple : (u, ox, oy, dx, dy, taille, avance, police, mode, couleur, alpha, calque)
        self.images = []         # dict : coins, l, h, info, calque
        self.ordre = 0
        self.nb_degrades = 0
        self.nb_motifs = 0       # surfaces (ou traits) peintes par un motif : non relevees
        self.marques = {}        # etiquette du contenu marque -> nombre
        self.cles_marques = {}   # cle des proprietes (hors MCID) -> nombre
        self.textes_marques = [] # (cle, texte) : ActualText, Alt, E et autres chaines cachees dans le contenu marque
        self.bloc = None         # le formulaire (XObject) en cours : « X3.12 » = le formulaire X3, sa 12e pose
        self.usages = {}         # formulaire -> nombre de poses dans la page (imbriquees comprises)
        self.clip = None         # la decoupe rectangulaire en cours (x0, y0, x1, y1), ou None
        self.nb_items = 0        # traits, glyphes et images recus (la limite de la page)
        self.glyphes_secours = 0 # glyphes lus avec la police de secours (police absente ou illisible)
        self.arret = None        # pourquoi la lecture de la page s'est arretee en route

    def chemin(self, items, trait, fond, ep, at, af, calque, tirets, ordre=None):
        if not items:
            return
        self.ordre += 1
        self.nb_items += len(items)
        c = {'items': items, 'trait': trait, 'fond': fond, 'ep': ep, 'at': at, 'af': af,
             'calque': calque, 'tirets': tirets, 'ordre': self.ordre if ordre is None else ordre, 'bloc': self.bloc,
             'clip': self.clip}
        # un remplissage suivi du trait du meme chemin : un seul element (comme PyMuPDF)
        if self.chemins and trait is not None and fond is None:
            p = self.chemins[-1]
            if p['fond'] is not None and p['trait'] is None and p['items'] == items and p['calque'] == calque:
                p['trait'] = trait
                p['ep'] = ep
                p['at'] = at
                p['tirets'] = tirets
                return
        self.chemins.append(c)

    def glyphe(self, g, ordre=None):
        self.ordre += 1
        self.nb_items += 1
        self.glyphes.append(g + (self.ordre if ordre is None else ordre, self.bloc, self.clip))

    def image(self, coins, l, h, info, calque, ordre=None):
        self.ordre += 1
        self.nb_items += 1
        self.images.append({'coins': coins, 'l': l, 'h': h, 'info': info, 'calque': calque,
                            'ordre': self.ordre if ordre is None else ordre, 'bloc': self.bloc, 'clip': self.clip})


# ===========================================================================
#  9. La machine : l'interprete des flux de contenu
# ===========================================================================

class Etat(object):
    __slots__ = ('ctm', 'cs_t', 'cs_f', 'col_t', 'col_f', 'ep', 'at', 'af', 'police', 'corps',
                 'tc', 'tw', 'th', 'tl', 'rise', 'tr', 'tirets', 'motif_f', 'clip')

    def __init__(self):
        self.ctm = IDENTITE
        self.cs_t = GRIS
        self.cs_f = GRIS
        self.col_t = (0.0, 0.0, 0.0)
        self.col_f = (0.0, 0.0, 0.0)
        self.ep = 1.0
        self.at = 1.0
        self.af = 1.0
        self.police = None
        self.corps = 0.0
        self.tc = 0.0
        self.tw = 0.0
        self.th = 1.0
        self.tl = 0.0
        self.rise = 0.0
        self.tr = 0
        self.tirets = False
        self.motif_f = None
        self.clip = None          # decoupe rectangulaire (page vue), ou None

    def copie(self):
        e = Etat.__new__(Etat)
        for k in Etat.__slots__:
            setattr(e, k, getattr(self, k))
        return e


_FAMILLES_ESPACES = {'DeviceGray': 'Gray', 'G': 'Gray', 'Gray': 'Gray', 'CalGray': 'CalGray', 'DeviceRGB': 'RGB',
                     'RGB': 'RGB', 'CalRGB': 'CalRGB', 'DeviceCMYK': 'CMYK', 'CMYK': 'CMYK', 'Lab': 'Lab',
                     'ICCBased': 'ICCBased', 'Indexed': 'Indexed', 'I': 'Indexed', 'Pattern': 'Pattern',
                     'Separation': 'Separation', 'DeviceN': 'DeviceN'}


def famille_espace(nom):
    """La famille d'un espace de couleur (RGB, ICCBased, Separation...) ;
    « autre » pour un nom qui n'est pas de la norme (le nom d'une ressource
    ou d'une encre peut etre celui de la societe)."""
    n = u'%s' % (nom,) if nom is not None else u''
    return _FAMILLES_ESPACES.get(n, 'autre' if n else '')


ABREV_IMAGE = {'W': 'Width', 'H': 'Height', 'BPC': 'BitsPerComponent', 'CS': 'ColorSpace',
               'F': 'Filter', 'DP': 'DecodeParms', 'IM': 'ImageMask', 'D': 'Decode', 'I': 'Interpolate'}
ABREV_CS = {'G': 'DeviceGray', 'RGB': 'DeviceRGB', 'CMYK': 'DeviceCMYK', 'I': 'Indexed'}


class Calques(object):
    """Les calques (contenu facultatif, OCG) et leur etat par defaut."""

    def __init__(self, lecteur, catalogue, notes):
        self.lecteur = lecteur
        self.liste = []          # [(num, nom, visible)]
        self.visible = {}        # num -> bool
        self.noms = {}
        r = lecteur.resoudre
        ocp = r(catalogue.get('OCProperties')) if isinstance(catalogue, dict) else None
        if not isinstance(ocp, dict):
            return
        ocgs = r(ocp.get('OCGs'))
        d = r(ocp.get('D'))
        if not isinstance(d, dict):
            d = {}
        base = r(d.get('BaseState'))
        on = set(x.num for x in (r(d.get('ON')) or []) if isinstance(x, Ref))
        off = set(x.num for x in (r(d.get('OFF')) or []) if isinstance(x, Ref))
        nums = []
        if isinstance(ocgs, list):
            for x in ocgs:
                if isinstance(x, Ref) and x.num not in nums:
                    nums.append(x.num)
        for num in sorted(nums):
            o = r(Ref(num, 0)) if num in lecteur.xref else None
            nom = ''
            if isinstance(o, dict):
                nom = texte_pdf(r(o.get('Name')))
            if base == 'OFF':
                vis = num in on
            else:
                vis = num not in off
            self.liste.append((num, nom, vis))
            self.visible[num] = vis
            self.noms[num] = nom
        if r(d.get('AS')) is not None:
            notes.ajouter('calques : etats automatiques (/AS, impression ou vue) ignores ; etat par defaut retenu')

    def evaluer(self, oc):
        """(identifiant du calque, visible) pour un /OC (OCG ou OCMD)."""
        r = self.lecteur.resoudre
        num = oc.num if isinstance(oc, Ref) else None
        d = r(oc)
        if not isinstance(d, dict):
            return (None, True)
        if d.get('Type') == 'OCMD':
            ve = r(d.get('VE'))
            groupes = r(d.get('OCGs'))
            if isinstance(groupes, Ref) or isinstance(groupes, dict):
                groupes = [groupes]
            refs = [g for g in (groupes or []) if isinstance(g, Ref)]
            if isinstance(ve, list):
                vis = self._expression(ve, 0)
            else:
                etats = [self.visible.get(g.num, True) for g in refs]
                p = r(d.get('P')) or 'AnyOn'
                if not etats:
                    vis = True
                elif p == 'AllOn':
                    vis = all(etats)
                elif p == 'AnyOff':
                    vis = not all(etats)
                elif p == 'AllOff':
                    vis = not any(etats)
                else:
                    vis = any(etats)
            ident = refs[0].num if refs else num
            return (ident, vis)
        if num is None:
            return (None, True)
        return (num, self.visible.get(num, True))

    def _expression(self, ve, profondeur):
        """Une expression de visibilite (/VE). Au-dela de 16 niveaux (une
        expression qui se contient elle-meme), le calque est suppose visible."""
        r = self.lecteur.resoudre
        if not ve or profondeur > 16:
            return True
        op = r(ve[0])
        args = []
        for x in ve[1:]:
            x2 = r(x)
            if isinstance(x2, list):
                args.append(self._expression(x2, profondeur + 1))
            elif isinstance(x, Ref):
                args.append(self.visible.get(x.num, True))
        if op == 'Not':
            return not args[0] if args else True
        if op == 'And':
            return all(args)
        if op == 'Or':
            return any(args)
        return True


def texte_pdf(v):
    """Une chaine de texte PDF (PDFDocEncoding ou UTF-16 avec BOM) en str."""
    if isinstance(v, bytes):
        if v[:2] == b'\xfe\xff':
            return v[2:].decode('utf-16-be', 'replace')
        if v[:2] == b'\xff\xfe':
            return v[2:].decode('utf-16-le', 'replace')
        if v[:3] == b'\xef\xbb\xbf':
            return v[3:].decode('utf-8', 'replace')
        return v.decode('latin-1')
    if isinstance(v, str):
        return str(v)
    return ''


class Machine(object):
    """Interprete les flux de contenu d'une page et rend les traces au
    collecteur."""

    PROFONDEUR_MAX = 24
    LIMITE_OPERATIONS = 5000000    # operateurs executes dans une page (formulaires compris) : au-dela, on s'arrete
    LIMITE_POSES = 100000          # formulaires (XObject) poses dans une page, imbriques compris : au-dela, on s'arrete

    def __init__(self, lecteur, notes, calques):
        self.lecteur = lecteur
        self.notes = notes
        self.calques = calques
        self.echeance = None      # heure au-dela de laquelle la lecture s'arrete (le delai par PDF)
        self.limite_items = None  # traits, glyphes et images au-dela desquels la page s'arrete
        self.nb_ops = 0
        self.polices = {}        # cle -> Police
        self.secours = None      # la police de secours (Helvetica) d'un texte dont la police manque
        self.espaces = {}
        self.noms_formes = {}    # numero d'objet d'un formulaire -> « X1 », « X2 »... (dans l'ordre de premiere pose)
        self.poses = {}          # « X1 » -> nombre de poses de premier niveau dans la page

    # -- une page ------------------------------------------------------------
    def page(self, dico_page, ressources, ctm_page, collecteur):
        self.col = collecteur
        r = self.lecteur.resoudre
        contenus = r(dico_page.get('Contents'))
        if isinstance(contenus, Flux):
            contenus = [contenus]
        elif isinstance(contenus, list):
            contenus = [r(x) for x in contenus]
        else:
            contenus = []
        morceaux = []
        for c in contenus:
            if isinstance(c, Flux):
                try:
                    morceaux.append(self.lecteur.decoder_flux(c))
                except ErreurPDF as e:
                    self.notes.ajouter('un flux de contenu illisible : %s' % raison(e))
        data = b'\n'.join(morceaux)
        etat = Etat()
        etat.ctm = ctm_page
        self.pile_formes = []
        self.poses = {}
        self.nb_ops = 0
        self.nb_poses = 0
        try:
            self.executer(data, ressources, etat, 0, [])
        except ArretLecture as e:
            # ce qui est deja releve est garde ; la page est dite incomplete
            collecteur.arret = str(e)
            collecteur.bloc = None
        except RecursionError:
            collecteur.arret = 'imbrication trop profonde'
            collecteur.bloc = None

    def _budget(self):
        """Toutes les 4096 operations : le delai, le nombre d'elements, le
        nombre d'operations (des formulaires poses en eventail peuvent en
        demander des millions sans boucler)."""
        if self.echeance is not None and time.time() > self.echeance:
            raise ArretLecture('delai depasse')
        if self.limite_items is not None and self.col.nb_items > self.limite_items:
            raise ArretLecture('trop d\'elements (limite de la memoire du poste)')
        if self.nb_ops > self.LIMITE_OPERATIONS:
            raise ArretLecture('plus de %d operations dans la page' % self.LIMITE_OPERATIONS)

    # -- les ressources --------------------------------------------------------
    def ressource(self, ressources, genre, nom):
        r = self.lecteur.resoudre
        d = r(ressources.get(genre)) if isinstance(ressources, dict) else None
        if not isinstance(d, dict):
            return None, None
        brut = d.get(str(nom))
        return r(brut), brut

    def police(self, ressources, nom):
        objet, brut = self.ressource(ressources, 'Font', nom)
        if not isinstance(objet, dict):
            self.notes.ajouter('police introuvable dans les ressources : texte lu avec une police de secours '
                               '(Helvetica, largeurs approchees ; voir le nombre de glyphes plus bas)')
            return self.police_de_secours()
        cle = brut.num if isinstance(brut, Ref) else id(objet)
        p = self.polices.get(cle)
        if p is None:
            try:
                p = Police(self.lecteur, objet, self.notes)
            except Exception as e:
                self.notes.ajouter('police illisible (%s) : texte lu avec une police de secours (Helvetica)' % raison(e))
                p = self.police_de_secours()
            self.polices[cle] = p
        return p

    def police_de_secours(self):
        """Comme MuPDF : un texte dont la police manque se lit quand meme,
        en Helvetica (encodage standard) ; ses glyphes sont comptes."""
        if self.secours is None:
            self.secours = Police(self.lecteur, {'Type': Nom('Font'), 'Subtype': Nom('Type1'),
                                                 'BaseFont': Nom('Helvetica')}, self.notes)
            self.secours.de_secours = True
        return self.secours

    def espace(self, ressources, nom_ou_objet, profondeur=0):
        r = self.lecteur.resoudre
        o = nom_ou_objet
        if isinstance(o, Nom):
            n = str(o)
            n = ABREV_CS.get(n, n)
            if n == 'DeviceGray' or n == 'CalGray':
                return GRIS
            if n == 'DeviceRGB' or n == 'CalRGB':
                return RGB
            if n == 'DeviceCMYK':
                return CMYK
            if n == 'Pattern':
                return MOTIF
            objet, brut = self.ressource(ressources, 'ColorSpace', n)
            if objet is None:
                if n in ('DefaultGray',):
                    return GRIS
                self.notes.ajouter('espace de couleur %s introuvable (gris suppose)' % nom_standard(n, 'nomme'))
                return GRIS
            cle = brut.num if isinstance(brut, Ref) else None
            if cle is not None and cle in self.espaces:
                return self.espaces[cle]
            e = self.espace(ressources, objet, profondeur + 1)
            if cle is not None:
                self.espaces[cle] = e
            return e
        o = r(o)
        if isinstance(o, Nom):
            return self.espace(ressources, o, profondeur + 1)
        if not isinstance(o, list) or not o or profondeur > 6:
            return GRIS
        genre = str(r(o[0]))
        genre = ABREV_CS.get(genre, genre)
        try:
            if genre in ('CalGray', 'DeviceGray'):
                return GRIS
            if genre in ('CalRGB', 'DeviceRGB'):
                return RGB
            if genre == 'DeviceCMYK':
                return CMYK
            if genre == 'Lab':
                return EspaceCouleur('lab', 3)
            if genre == 'ICCBased':
                f = r(o[1])
                n = entier(r(f.dico.get('N')), 3) if isinstance(f, Flux) else 3
                return {1: GRIS, 3: RGB, 4: CMYK}.get(n, RGB)
            if genre == 'Indexed':
                base = self.espace(ressources, o[1], profondeur + 1)
                hival = entier(r(o[2]), 255)
                t = r(o[3])
                if isinstance(t, Flux):
                    t = self.lecteur.decoder_flux(t)
                if not isinstance(t, bytes):
                    t = b''
                return EspaceCouleur('indexe', 1, base=base, hival=hival, table=t)
            if genre in ('Separation', 'DeviceN'):
                nom_sep = str(r(o[1])) if genre == 'Separation' else ''
                alt = self.espace(ressources, o[2], profondeur + 1)
                fd = r(o[3])
                fonction = None
                fdict = fd.dico if isinstance(fd, Flux) else fd
                if isinstance(fdict, dict) and entier(r(fdict.get('FunctionType')), -1) == 2:
                    fonction = fonction_type2(fdict, r)
                elif nom_sep not in ('All', 'None'):
                    self.notes.ajouter('couleur d\'accompagnement (Separation/DeviceN) a fonction non exponentielle : teinte rendue en gris')
                n = 1 if genre == 'Separation' else len(r(o[1]) or [1])
                if genre == 'DeviceN' and n > 1:
                    fonction = None
                return EspaceCouleur('separation' if genre == 'Separation' else 'devicen', n,
                                     nom_sep=nom_sep, alt=alt, fonction=fonction)
            if genre == 'Pattern':
                return MOTIF
        except (IndexError, AttributeError, TypeError):
            pass
        self.notes.ajouter('espace de couleur %s non gere (gris suppose)' % nom_standard(genre, 'inconnu'))
        return GRIS

    # -- l'interpretation --------------------------------------------------------
    def executer(self, data, ressources, etat, profondeur, pile_mc):
        """Interprete un flux de contenu. etat : l'etat graphique de depart (modifie)."""
        col = self.col
        lecteur = self.lecteur
        r = lecteur.resoudre
        pile = []                      # etats sauvegardes (q / Q)
        ops = []                       # operandes
        conteneurs = []
        marques = []
        chemin = []                    # items du chemin courant : ('l', p0, p1) / ('c', p0, p1, p2, p3)
        point = None                   # point courant
        debut_sp = None                # debut du sous-chemin
        tm = tlm = IDENTITE
        dans_texte = False
        mc = list(pile_mc)             # pile du contenu marque : (calque, visible) ou None
        rex = _RE_JETON
        n = len(data)
        pos = 0
        ctm = etat.ctm
        decoupe = False                # W ou W* en attente du n

        def calque_courant():
            ident = None
            vis = True
            for e in mc:
                if e is not None:
                    if e[0] is not None:
                        ident = e[0]
                    if not e[1]:
                        vis = False
            return ident, vis

        while True:
            m = rex.match(data, pos)
            if m is None:
                break
            pos = m.end()
            g = m.lastgroup
            if g == 'n':
                v = m.group('n')
                try:
                    v = float(v)
                except ValueError:
                    v = 0.0
            elif g == 'mot':
                op = m.group('mot')
                self.nb_ops += 1
                if not self.nb_ops & 4095:
                    self._budget()
                if conteneurs:
                    if op == b'true':
                        conteneurs[-1].append(True)
                    elif op == b'false':
                        conteneurs[-1].append(False)
                    elif op == b'null':
                        conteneurs[-1].append(None)
                    continue
                if op == b'true' or op == b'false' or op == b'null':
                    ops.append(op == b'true' if op != b'null' else None)
                    continue
                # ------------------------------------------------ operateurs
                try:
                    if op == b'l':
                        if point is not None and len(ops) >= 2:
                            p = appliquer(ctm, ops[-2], ops[-1])
                            chemin.append(('l', point, p))
                            point = p
                    elif op == b'm':
                        if len(ops) >= 2:
                            point = appliquer(ctm, ops[-2], ops[-1])
                            debut_sp = point
                    elif op == b'c':
                        if point is not None and len(ops) >= 6:
                            p1 = appliquer(ctm, ops[-6], ops[-5])
                            p2 = appliquer(ctm, ops[-4], ops[-3])
                            p3 = appliquer(ctm, ops[-2], ops[-1])
                            chemin.append(('c', point, p1, p2, p3))
                            point = p3
                    elif op == b'v':
                        if point is not None and len(ops) >= 4:
                            p2 = appliquer(ctm, ops[-4], ops[-3])
                            p3 = appliquer(ctm, ops[-2], ops[-1])
                            chemin.append(('c', point, point, p2, p3))
                            point = p3
                    elif op == b'y':
                        if point is not None and len(ops) >= 4:
                            p1 = appliquer(ctm, ops[-4], ops[-3])
                            p3 = appliquer(ctm, ops[-2], ops[-1])
                            chemin.append(('c', point, p1, p3, p3))
                            point = p3
                    elif op == b'h':
                        if point is not None and debut_sp is not None and point != debut_sp:
                            chemin.append(('l', point, debut_sp))
                        point = debut_sp
                    elif op == b're':
                        if len(ops) >= 4:
                            x, y, w, h = ops[-4], ops[-3], ops[-2], ops[-1]
                            a = appliquer(ctm, x, y)
                            c = appliquer(ctm, x + w, y + h)
                            if w == 0 or h == 0:
                                # un rectangle sans largeur ou sans hauteur : un trait (certains exports tracent ainsi)
                                chemin.append(('l', a, c))
                            else:
                                b = appliquer(ctm, x + w, y)
                                d = appliquer(ctm, x, y + h)
                                chemin.append(('l', a, b))
                                chemin.append(('l', b, c))
                                chemin.append(('l', c, d))
                                chemin.append(('l', d, a))
                            point = debut_sp = a
                    elif op in _PEINTURES:
                        trait, fond, fermer = _PEINTURES[op]
                        col.clip = etat.clip
                        if fermer and point is not None and debut_sp is not None and point != debut_sp:
                            chemin.append(('l', point, debut_sp))
                        if chemin and (trait or fond):
                            if True:
                                ident, vis = calque_courant()
                                ct = etat.cs_t.rgb(etat.col_t) if trait and etat.cs_t is not MOTIF else None
                                cf = etat.cs_f.rgb(etat.col_f) if fond and etat.cs_f is not MOTIF else None
                                if trait and ct is None:
                                    ct = 'motif'
                                if fond and cf is None:
                                    cf = 'motif'
                                if cf == 'motif' or ct == 'motif':
                                    self.notes.ajouter('surface peinte par un motif (Pattern : hachures, quadrillage, '
                                                       'degrade ou image tramee) : la surface et le contenu du motif '
                                                       'ne sont pas releves (comptes page par page)')
                                if cf == 'motif':
                                    # comme MuPDF : une surface peinte par un motif n'est pas un chemin rempli
                                    # (c'est une decoupe, puis le motif) ; seul son trait, s'il en a un, reste
                                    col.nb_motifs += 1
                                    if etat.motif_f is not None:
                                        self._images_du_motif(ressources, etat.motif_f, chemin, (ident, vis))
                                    fond = False
                                if ct == 'motif':
                                    col.nb_motifs += 1
                                    trait = False
                                if trait or fond:
                                    ep = etat.ep * math.sqrt(abs(ctm[0] * ctm[3] - ctm[1] * ctm[2]))
                                    col.clip = etat.clip
                                    col.chemin(chemin, ct if trait else None, cf if fond else None, ep,
                                               etat.at, etat.af, (ident, vis), etat.tirets)
                        if decoupe:
                            # W n (ou W S...) : la decoupe s'applique aux traces suivants ; seule une decoupe
                            # rectangulaire (le cas courant) est suivie, les autres sont notees
                            etat.clip = self._decoupe(chemin, etat.clip)
                        chemin = []
                        point = debut_sp = None
                        decoupe = False
                    elif op == b'W' or op == b'W*':
                        decoupe = True
                    elif op == b'q':
                        pile.append(etat.copie())
                    elif op == b'Q':
                        if pile:
                            etat = pile.pop()
                            ctm = etat.ctm
                    elif op == b'cm':
                        if len(ops) >= 6:
                            etat.ctm = ctm = mul(tuple(ops[-6:]), ctm)
                    elif op == b'w':
                        if ops:
                            etat.ep = ops[-1]
                    elif op == b'd':
                        if ops and isinstance(ops[0], list):
                            etat.tirets = any(isinstance(x, float) and x > 0 for x in ops[0])
                    # -------------------------------------------- couleurs
                    elif op == b'g':
                        etat.cs_f = GRIS
                        etat.col_f = ops[-1:] or [0.0]
                    elif op == b'G':
                        etat.cs_t = GRIS
                        etat.col_t = ops[-1:] or [0.0]
                    elif op == b'rg':
                        etat.cs_f = RGB
                        etat.col_f = ops[-3:]
                    elif op == b'RG':
                        etat.cs_t = RGB
                        etat.col_t = ops[-3:]
                    elif op == b'k':
                        etat.cs_f = CMYK
                        etat.col_f = ops[-4:]
                    elif op == b'K':
                        etat.cs_t = CMYK
                        etat.col_t = ops[-4:]
                    elif op == b'cs':
                        if ops:
                            etat.cs_f = self.espace(ressources, ops[-1])
                            etat.col_f = etat.cs_f.initiale()
                    elif op == b'CS':
                        if ops:
                            etat.cs_t = self.espace(ressources, ops[-1])
                            etat.col_t = etat.cs_t.initiale()
                    elif op == b'sc' or op == b'scn':
                        etat.col_f = [x for x in ops if isinstance(x, float)]
                        if ops and isinstance(ops[-1], Nom):
                            etat.motif_f = ops[-1]
                    elif op == b'SC' or op == b'SCN':
                        etat.col_t = [x for x in ops if isinstance(x, float)]
                    # -------------------------------------------- etat etendu
                    elif op == b'gs':
                        if ops:
                            self._gs(ressources, ops[-1], etat)
                    # -------------------------------------------- texte
                    elif op == b'BT':
                        tm = tlm = IDENTITE
                        dans_texte = True
                    elif op == b'ET':
                        dans_texte = False
                    elif op == b'Tf':
                        if len(ops) >= 2:
                            etat.police = self.police(ressources, ops[-2])
                            etat.corps = ops[-1] if isinstance(ops[-1], float) else 0.0
                    elif op == b'Tc':
                        if ops:
                            etat.tc = ops[-1]
                    elif op == b'Tw':
                        if ops:
                            etat.tw = ops[-1]
                    elif op == b'Tz':
                        if ops:
                            etat.th = ops[-1] / 100.0
                    elif op == b'TL':
                        if ops:
                            etat.tl = ops[-1]
                    elif op == b'Ts':
                        if ops:
                            etat.rise = ops[-1]
                    elif op == b'Tr':
                        if ops:
                            etat.tr = int(ops[-1])
                    elif op == b'Td':
                        if len(ops) >= 2:
                            tlm = tm = mul((1.0, 0.0, 0.0, 1.0, ops[-2], ops[-1]), tlm)
                    elif op == b'TD':
                        if len(ops) >= 2:
                            etat.tl = -ops[-1]
                            tlm = tm = mul((1.0, 0.0, 0.0, 1.0, ops[-2], ops[-1]), tlm)
                    elif op == b'Tm':
                        if len(ops) >= 6:
                            tlm = tm = tuple(ops[-6:])
                    elif op == b'T*':
                        tlm = tm = mul((1.0, 0.0, 0.0, 1.0, 0.0, -etat.tl), tlm)
                    elif op == b'Tj':
                        if ops and isinstance(ops[-1], bytes):
                            col.clip = etat.clip
                            tm = self._montrer(etat, tm, [ops[-1]], calque_courant)
                    elif op == b'TJ':
                        if ops and isinstance(ops[-1], list):
                            col.clip = etat.clip
                            tm = self._montrer(etat, tm, ops[-1], calque_courant)
                    elif op == b"'":
                        tlm = tm = mul((1.0, 0.0, 0.0, 1.0, 0.0, -etat.tl), tlm)
                        if ops and isinstance(ops[-1], bytes):
                            col.clip = etat.clip
                            tm = self._montrer(etat, tm, [ops[-1]], calque_courant)
                    elif op == b'"':
                        if len(ops) >= 3:
                            etat.tw = ops[-3]
                            etat.tc = ops[-2]
                        tlm = tm = mul((1.0, 0.0, 0.0, 1.0, 0.0, -etat.tl), tlm)
                        if ops and isinstance(ops[-1], bytes):
                            col.clip = etat.clip
                            tm = self._montrer(etat, tm, [ops[-1]], calque_courant)
                    # -------------------------------------------- objets externes
                    elif op == b'Do':
                        if ops and isinstance(ops[-1], Nom):
                            col.clip = etat.clip
                            self._do(ressources, ops[-1], etat, profondeur, mc, calque_courant)
                    elif op == b'BI':
                        col.clip = etat.clip
                        pos = self._image_en_ligne(data, pos, ressources, etat, calque_courant)
                    elif op == b'sh':
                        col.nb_degrades += 1
                    # -------------------------------------------- contenu marque
                    elif op == b'BDC':
                        entree = None
                        if len(ops) >= 2:
                            etiquette = str(ops[-2]) if isinstance(ops[-2], Nom) else '?'
                            col.marques[etiquette] = col.marques.get(etiquette, 0) + 1
                            prop = ops[-1]
                            dico = prop
                            if isinstance(prop, Nom):
                                dico, brut = self.ressource(ressources, 'Properties', prop)
                                prop = brut
                            if etiquette == 'OC' and prop is not None:
                                entree = self.calques.evaluer(prop)
                            elif isinstance(dico, dict):
                                self._proprietes(dico, col)
                        mc.append(entree)
                    elif op == b'BMC':
                        if ops and isinstance(ops[-1], Nom):
                            col.marques[str(ops[-1])] = col.marques.get(str(ops[-1]), 0) + 1
                        mc.append(None)
                    elif op == b'EMC':
                        if len(mc) > len(pile_mc):
                            mc.pop()
                    elif op in _OPS_IGNORES:
                        pass
                    else:
                        if len(op) < 4:
                            self.notes.ajouter('operateur inconnu ignore')
                except (TypeError, ValueError, IndexError, ZeroDivisionError, OverflowError) as e:
                    self.notes.ajouter('operateur %s mal forme (ignore)' % op.decode('latin-1', 'replace')[:6])
                ops = []
                continue
            elif g == 'nom':
                v = nom_de(m.group('nom'))
            elif g == 'ch':
                v, pos = lire_chaine(data, pos)
            elif g == 'hx':
                v = hex_de(m.group('hx'))
            elif g == 'ao' or g == 'dd':
                conteneurs.append([])
                marques.append(g)
                continue
            elif g == 'af' or g == 'df':
                if not conteneurs:
                    continue
                contenu = conteneurs.pop()
                genre = marques.pop()
                if genre == 'dd':
                    v = {}
                    for i in range(0, len(contenu) - 1, 2):
                        if isinstance(contenu[i], Nom):
                            v[str(contenu[i])] = contenu[i + 1]
                else:
                    v = contenu
            else:
                continue
            if conteneurs:
                conteneurs[-1].append(v)
            else:
                ops.append(v)
                if len(ops) > 64:
                    del ops[:-32]

    def _decoupe(self, chemin, clip):
        """La decoupe en cours apres un W : la boite du chemin s'il est un
        rectangle droit (re W n, le cas courant), intersectee avec la decoupe
        d'avant ; sinon la decoupe d'avant (une decoupe d'une autre forme n'est
        pas appliquee, et le rapport le dit)."""
        chs = _chaines(normaliser(chemin, {}))
        r_ = _est_rectangle(chs[0]) if len(chs) == 1 else None
        if r_ is None:
            self.notes.ajouter('decoupe (W) d\'une autre forme qu\'un rectangle droit : non appliquee')
            return clip
        return intersection(clip, r_)

    def _proprietes(self, dico, col):
        """Les proprietes d'un contenu marque (BDC) : un logiciel peut y
        ranger du texte qui ne se dessine pas (ActualText, Alt, E, ou ses
        propres cles)."""
        r = self.lecteur.resoudre
        for k, v in dico.items():
            if k in ('MCID', 'Type'):
                continue
            col.cles_marques[k] = col.cles_marques.get(k, 0) + 1
            v = r(v)
            if isinstance(v, bytes) and len(col.textes_marques) < 100000:
                t = texte_pdf(v)
                if t.strip():
                    col.textes_marques.append((k, t))

    def _images_du_motif(self, ressources, nom, chemin, calque):
        """Une surface peinte par un motif qui contient des images (un logiciel
        qui a tramé une partie du dessin) : chaque image est relevee, sur la
        boite de la surface (approche : sa place exacte dans le motif n'est
        pas calculee)."""
        r = self.lecteur.resoudre
        motif_o, _ = self.ressource(ressources, 'Pattern', nom)
        if not isinstance(motif_o, Flux) or entier(r(motif_o.dico.get('PatternType')), 0) != 1:
            return
        res = r(motif_o.dico.get('Resources'))
        xo = r(res.get('XObject')) if isinstance(res, dict) else None
        if not isinstance(xo, dict):
            return
        pts = [p for it in chemin for p in it[1:]]
        if not pts:
            return
        x0, x1 = min(p[0] for p in pts), max(p[0] for p in pts)
        y0, y1 = min(p[1] for p in pts), max(p[1] for p in pts)
        for k in sorted(xo):
            im = r(xo[k])
            if isinstance(im, Flux) and r(im.dico.get('Subtype')) == 'Image':
                coins = [(x0, y1), (x1, y1), (x1, y0), (x0, y0)]
                d = dict(im.dico)
                self._image_coins(d, coins, calque, motif=True)
        self.notes.ajouter('image(s) dans un motif : placee(s) sur la surface peinte (approche)')

    def _gs(self, ressources, nom, etat):
        d, _ = self.ressource(ressources, 'ExtGState', nom)
        if not isinstance(d, dict):
            return
        r = self.lecteur.resoudre
        lw = r(d.get('LW'))
        if isinstance(lw, (int, float)) and not isinstance(lw, bool):
            etat.ep = float(lw)
        ca = r(d.get('CA'))
        if isinstance(ca, (int, float)) and not isinstance(ca, bool):
            etat.at = float(ca)
        ca = r(d.get('ca'))
        if isinstance(ca, (int, float)) and not isinstance(ca, bool):
            etat.af = float(ca)
        f = r(d.get('Font'))
        if isinstance(f, list) and len(f) >= 2:
            fd = r(f[0])
            if isinstance(fd, dict):
                cle = f[0].num if isinstance(f[0], Ref) else id(fd)
                p = self.polices.get(cle)
                if p is None:
                    p = Police(self.lecteur, fd, self.notes)
                    self.polices[cle] = p
                etat.police = p
                etat.corps = float(r(f[1]) or 0)
        dash = r(d.get('D'))
        if isinstance(dash, list) and dash:
            arr = r(dash[0])
            etat.tirets = isinstance(arr, list) and any(isinstance(r(x), (int, float)) and r(x) > 0 for x in arr)
        if r(d.get('SMask')) not in (None, 'None'):
            self.notes.ajouter('masque doux (SMask) ignore')

    def _montrer(self, etat, tm, morceaux, calque_courant):
        """Place les glyphes d'un Tj / TJ. Rend la nouvelle matrice de texte."""
        p = etat.police
        if p is None:
            return tm
        M = mul(tm, etat.ctm)
        corps = etat.corps
        th = etat.th
        tc = etat.tc
        tw = etat.tw
        rise = etat.rise
        a, b, c, d, e, f = M
        vx, vy = a * corps * th, b * corps * th
        taille = math.hypot(vx, vy)
        if taille > 0:
            ux, uy = vx / taille, vy / taille
        else:
            ux, uy = 1.0, 0.0
        tr = etat.tr
        if tr == 7:
            mode = 'decoupe'                 # le texte ne sert qu'a decouper (et ne se peint pas)
            couleur = etat.cs_f.rgb(etat.col_f)
            alpha = etat.af
        elif tr == 3:
            mode = 'invisible'
            couleur = etat.cs_f.rgb(etat.col_f)
            alpha = etat.af
        elif tr in (1, 5):
            mode = 'trait'
            couleur = etat.cs_t.rgb(etat.col_t) if etat.cs_t is not MOTIF else 'motif'
            alpha = etat.at
        else:
            mode = 'rempli'
            couleur = etat.cs_f.rgb(etat.col_f) if etat.cs_f is not MOTIF else 'motif'
            alpha = etat.af
        ident, vis = calque_courant()
        calque = (ident, vis)
        nom = p.nom
        col = self.col
        xc = 0.0
        rx, ry = c * rise, d * rise
        for morceau in morceaux:
            if isinstance(morceau, bytes):
                gl = p.glyphes(morceau)
                if p.de_secours:
                    col.glyphes_secours += len(gl)
                for (u, w0, mot) in gl:
                    ox = a * xc + rx + e
                    oy = b * xc + ry + f
                    col.glyphe((u, ox, oy, ux, uy, taille, w0 * taille, nom, mode, couleur, alpha, calque))
                    xc += (w0 * corps + tc + (tw if mot else 0.0)) * th
            elif isinstance(morceau, (int, float)) and not isinstance(morceau, bool):
                xc -= morceau / 1000.0 * corps * th
        return (tm[0], tm[1], tm[2], tm[3], tm[4] + xc * tm[0], tm[5] + xc * tm[1])

    def _do(self, ressources, nom, etat, profondeur, mc, calque_courant):
        r = self.lecteur.resoudre
        x, brut = self.ressource(ressources, 'XObject', nom)
        if not isinstance(x, Flux):
            return
        st = r(x.dico.get('Subtype'))
        oc = x.dico.get('OC')
        entree = self.calques.evaluer(oc) if oc is not None else None
        if st == 'Image':
            ident, vis = calque_courant()
            if entree is not None:
                ident = entree[0] if entree[0] is not None else ident
                vis = vis and entree[1]
            self._image(x.dico, etat.ctm, (ident, vis))
        elif st == 'Form':
            cle = brut.num if isinstance(brut, Ref) else id(x)
            if profondeur >= self.PROFONDEUR_MAX or cle in self.pile_formes:
                self.notes.ajouter('formulaire (XObject) trop imbrique ou en boucle : ignore')
                return
            try:
                data = self.lecteur.decoder_flux(x, garder=True)
            except ErreurPDF as e:
                self.notes.ajouter('formulaire illisible : %s' % raison(e))
                return
            mat = r(x.dico.get('Matrix'))
            e2 = etat.copie()
            if isinstance(mat, list) and len(mat) == 6:
                try:
                    e2.ctm = mul(tuple(float(r(v)) for v in mat), etat.ctm)
                except (TypeError, ValueError):
                    pass
            bb = boite_pdf(x.dico.get('BBox'), r)
            if bb is not None:
                # un formulaire est decoupe par sa BBox (appliquee si elle reste un rectangle droit)
                c = [appliquer(e2.ctm, bb[0], bb[1]), appliquer(e2.ctm, bb[2], bb[1]),
                     appliquer(e2.ctm, bb[2], bb[3]), appliquer(e2.ctm, bb[0], bb[3])]
                r_ = _est_rectangle([('l', c[0], c[1]), ('l', c[1], c[2]), ('l', c[2], c[3]), ('l', c[3], c[0])])
                if r_ is not None:
                    e2.clip = intersection(e2.clip, r_)
            res = r(x.dico.get('Resources'))
            if not isinstance(res, dict):
                res = ressources
            pile_mc = list(mc)
            if entree is not None:
                pile_mc.append(entree)
            nom_f = self.noms_formes.get(cle)
            if nom_f is None:
                nom_f = self.noms_formes[cle] = 'X%d' % (len(self.noms_formes) + 1)
            self.col.usages[nom_f] = self.col.usages.get(nom_f, 0) + 1
            self.nb_poses += 1
            if self.nb_poses > self.LIMITE_POSES:
                # des formulaires poses en eventail (2 par niveau sur 24 niveaux : 16 millions de poses)
                raise ArretLecture('plus de %d formulaires poses dans la page' % self.LIMITE_POSES)
            premier = not self.pile_formes
            if premier:
                # les elements d'une pose de premier niveau portent son nom : un symbole pose plusieurs fois
                self.poses[nom_f] = self.poses.get(nom_f, 0) + 1
                self.col.bloc = '%s.%d' % (nom_f, self.poses[nom_f])
            self.pile_formes.append(cle)
            try:
                self.executer(data, res, e2, profondeur + 1, pile_mc)
            finally:
                self.pile_formes.pop()
                if premier:
                    self.col.bloc = None
        elif st == 'PS':
            self.notes.ajouter('XObject PostScript ignore')

    def _image(self, d, ctm, calque, en_ligne=False, ressources=None):
        coins = [appliquer(ctm, 0, 0), appliquer(ctm, 1, 0), appliquer(ctm, 1, 1), appliquer(ctm, 0, 1)]
        self._image_coins(d, coins, calque, en_ligne=en_ligne, ressources=ressources)

    def _image_coins(self, d, coins, calque, motif=False, en_ligne=False, ressources=None):
        r = self.lecteur.resoudre
        l = entier(r(d.get('Width', d.get('W'))), 0)
        h = entier(r(d.get('Height', d.get('H'))), 0)
        filtre = r(d.get('Filter', d.get('F')))
        if isinstance(filtre, list):
            filtre = r(filtre[-1]) if filtre else None
        filtre = ABREV_FILTRES.get(str(filtre), str(filtre)) if filtre is not None else 'brut'
        if filtre != 'brut':
            filtre = nom_standard(filtre, 'autre')
        cs = r(d.get('ColorSpace', d.get('CS')))
        if isinstance(cs, Nom) and ressources is not None and famille_espace(cs) == 'autre':
            # une image en ligne peut nommer un espace des ressources de la page : sa famille, pas son nom
            o, _ = self.ressource(ressources, 'ColorSpace', cs)
            cs = o if o is not None else cs
        if isinstance(cs, list) and cs:
            cs = r(cs[0])
        masque = r(d.get('ImageMask', d.get('IM'))) is True
        bpc = entier(r(d.get('BitsPerComponent', d.get('BPC'))), 0)
        info = {'filtre': filtre.replace('Decode', ''), 'espace': famille_espace(cs) if cs is not None else '',
                'bits': bpc, 'masque': masque, 'motif': motif, 'en_ligne': en_ligne}
        self.col.image(coins, l, h, info, calque)

    def _image_en_ligne(self, data, pos, ressources, etat, calque_courant):
        """BI ... ID <donnees> EI : lit le dictionnaire, saute les donnees."""
        dico = {}
        cle = None
        while True:
            try:
                v, pos2 = lire_valeur(data, pos)
            except ErreurPDF:
                return len(data)
            if isinstance(v, MotCle):
                if v.mot == b'ID':
                    pos = pos2
                    break
                pos = pos2
                continue
            pos = pos2
            if cle is None:
                cle = str(v) if isinstance(v, Nom) else None
            else:
                dico[ABREV_IMAGE.get(cle, cle)] = v
                cle = None
        # un seul blanc apres ID
        if pos < len(data) and data[pos] in _BLANCS:
            pos += 1
        fin = None
        filtre = dico.get('Filter')
        if filtre is None:
            l = entier(dico.get('Width'), 0)
            h = entier(dico.get('Height'), 0)
            bpc = entier(dico.get('BitsPerComponent'), 1 if dico.get('ImageMask') else 8)
            cs = dico.get('ColorSpace')
            ncomp = {'G': 1, 'DeviceGray': 1, 'RGB': 3, 'DeviceRGB': 3, 'CMYK': 4, 'DeviceCMYK': 4,
                     'I': 1, 'Indexed': 1}.get(str(cs) if isinstance(cs, Nom) else '', 1)
            if isinstance(cs, list):
                ncomp = 1
            longueur = h * ((l * ncomp * bpc + 7) // 8)
            k = pos + longueur
            mm = re.compile(br'[\x00\t\n\x0c\r ]*EI(?![^\x00\t\n\x0c\r ()<>\[\]{}/%])').match(data, k)
            if mm:
                fin = mm.end()
        if fin is None:
            mm = re.compile(br'[\x00\t\n\x0c\r ]EI(?=[\x00\t\n\x0c\r ]|$)').search(data, pos)
            fin = mm.end() if mm else len(data)
        ident, vis = calque_courant()
        self._image(dico, etat.ctm, (ident, vis), en_ligne=True, ressources=ressources)
        return fin


_PEINTURES = {b'S': (True, False, False), b's': (True, False, True),
              b'f': (False, True, False), b'F': (False, True, False), b'f*': (False, True, False),
              b'B': (True, True, False), b'B*': (True, True, False),
              b'b': (True, True, True), b'b*': (True, True, True),
              b'n': (False, False, False)}
_OPS_IGNORES = set([b'J', b'j', b'M', b'ri', b'i', b'MP', b'DP', b'BX', b'EX', b'd0', b'd1',
                    b'ID', b'EI', b'%'])


# ===========================================================================
#  10. Des traces aux elements : segments, rectangles, cercles, textes
# ===========================================================================

LONGUEUR_NULLE = 0.01        # pt : un trait plus court est un point (compte a part)
TOL_ANGLE = 0.5              # degres : horizontal / vertical a ce pres


def angle_de(dx, dy):
    """Angle en degrees, sens trigonometrique tel qu'on le voit sur la page
    (y vers le bas dans nos coordonnees), dans [0, 360)."""
    if dx == 0 and dy == 0:
        return 0.0
    a = math.degrees(math.atan2(-dy, dx)) % 360.0
    if a >= 359.95:
        a = 0.0
    return a


def orientation_segment(a):
    a = a % 180.0
    if a < TOL_ANGLE or a > 180.0 - TOL_ANGLE:
        return 'H'
    if abs(a - 90.0) < TOL_ANGLE:
        return 'V'
    return 'O'


def _chaines(items):
    """Coupe les items d'un chemin en chaines contigues (le debut d'un item
    est la fin du precedent). Un item 're' (PyMuPDF) est seul."""
    chaines = []
    cour = []
    fin = None
    for it in items:
        if it[0] == 're':
            if cour:
                chaines.append(cour)
            chaines.append([it])
            cour = []
            fin = None
            continue
        if cour and it[1] == fin:
            cour.append(it)
        else:
            if cour:
                chaines.append(cour)
            cour = [it]
        fin = it[-1]
    if cour:
        chaines.append(cour)
    return chaines


def _est_rectangle(ch):
    if len(ch) != 4 or any(it[0] != 'l' for it in ch):
        return None
    p0 = ch[0][1]
    q = ch[-1][2]
    if abs(p0[0] - q[0]) > 1e-3 or abs(p0[1] - q[1]) > 1e-3:
        return None
    sens = []
    for it in ch:
        dx = abs(it[2][0] - it[1][0])
        dy = abs(it[2][1] - it[1][1])
        if dx <= 1e-3 and dy <= 1e-3:
            sens.append('*')
        elif dy <= 1e-3:
            sens.append('H')
        elif dx <= 1e-3:
            sens.append('V')
        else:
            return None
    # alterner horizontal et vertical (un cote nul va avec tout)
    for i in range(4):
        a, b = sens[i], sens[(i + 1) % 4]
        if a != '*' and a == b:
            return None
    xs = [it[1][0] for it in ch]
    ys = [it[1][1] for it in ch]
    return (min(xs), min(ys), max(xs), max(ys))


def _bezier(p0, p1, p2, p3, t):
    u = 1 - t
    return (u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
            u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1])


def _est_cercle(ch):
    courbes = [it for it in ch if it[0] == 'c']
    lignes = [it for it in ch if it[0] == 'l']
    if len(courbes) < 2 or any(math.hypot(it[2][0] - it[1][0], it[2][1] - it[1][1]) >= 0.05 for it in lignes):
        return None
    p0 = ch[0][1]
    q = ch[-1][-1]
    if math.hypot(p0[0] - q[0], p0[1] - q[1]) > 0.05:
        return None
    pts = []
    for it in courbes:
        pts.append(it[1])
        pts.append(_bezier(it[1], it[2], it[3], it[4], 0.5))
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    for it in courbes:
        for t in (0.25, 0.75):
            p = _bezier(it[1], it[2], it[3], it[4], t)
            xs.append(p[0])
            ys.append(p[1])
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    w, h = x1 - x0, y1 - y0
    if w <= 0 or h <= 0 or abs(w - h) > 0.03 * max(w, h):
        return None
    cx, cy, rayon = (x0 + x1) / 2, (y0 + y1) / 2, (w + h) / 4
    for it in courbes:
        for t in (0.0, 0.25, 0.5, 0.75):
            p = _bezier(it[1], it[2], it[3], it[4], t)
            if abs(math.hypot(p[0] - cx, p[1] - cy) - rayon) > 0.03 * rayon + 0.01:
                return None
    return (x0, y0, x1, y1)


def est_blanc(c):
    return isinstance(c, tuple) and len(c) >= 3 and c[0] >= 0.97 and c[1] >= 0.97 and c[2] >= 0.97


def hexa(c):
    if c is None:
        return ''
    if c == 'motif':
        return 'motif'
    try:
        return '#%02x%02x%02x' % tuple(int(round(borner(float(x)) * 255)) for x in c[:3])
    except (TypeError, ValueError):
        return ''


def _proches(p, q, tol=1e-3):
    return abs(p[0] - q[0]) <= tol and abs(p[1] - q[1]) <= tol


def intersection(a, b):
    """L'intersection de deux boites (x0, y0, x1, y1) ; None = pas de
    limite. Une intersection vide rend une boite retournee (x0 > x1) que rien
    ne touche."""
    if a is None:
        return b
    if b is None:
        return a
    return (max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3]))


def touche(b, c, tol=0.01):
    """Vrai si la boite b touche la boite c (a tol pres)."""
    return b[2] >= c[0] - tol and b[0] <= c[2] + tol and b[3] >= c[1] - tol and b[1] <= c[3] + tol


def normaliser(items, stats):
    """Les items d'un chemin sans leurs cas degeneres, la meme regle pour les
    deux lecteurs (MuPDF garde ou jette ces cas a sa facon) : un trait plus
    court que 0,01 pt, une courbe dont les quatre points se confondent, ou qui
    part et revient au meme point par un point de controle confondu, sont
    jetes (comptes comme « points ») ; une courbe droite (p0 = p1 et p2 = p3,
    ou trois points confondus) devient un trait."""
    sortie = []
    for it in items:
        if not all(math.isfinite(v) for pt in (it[1:] if it[0] != 're' else (it[1:],)) for v in pt):
            # une matrice demesuree (1e308) rend des coordonnees infinies : rien a relever
            stats['infinis'] = stats.get('infinis', 0) + 1
            continue
        if it[0] == 'c':
            p0, p1, p2, p3 = it[1], it[2], it[3], it[4]
            if _proches(p0, p3) and (_proches(p0, p1) or _proches(p0, p2) or (_proches(p1, p2) and _proches(p0, p1))):
                stats['points'] = stats.get('points', 0) + 1
                continue
            if (_proches(p0, p1) and _proches(p2, p3)) or (_proches(p0, p1) and _proches(p1, p2)) or \
                    (_proches(p1, p2) and _proches(p2, p3)):
                it = ('l', p0, p3)
        if it[0] == 'l':
            (xa, ya), (xb, yb) = it[1], it[2]
            if math.hypot(xb - xa, yb - ya) < LONGUEUR_NULLE:
                stats['points'] = stats.get('points', 0) + 1
                continue
            # un trait qui revient exactement sur le precedent (aller-retour : un « re » sans hauteur trace
            # en quatre cotes, une polyligne qui revient sur ses pas) ne se voit qu'une fois
            if sortie and sortie[-1][0] == 'l' and _proches(sortie[-1][1], it[2], LONGUEUR_NULLE) and \
                    _proches(sortie[-1][2], it[1], LONGUEUR_NULLE):
                stats['doublons'] = stats.get('doublons', 0) + 1
                continue
        elif it[0] == 're' and (abs(it[3] - it[1]) <= 1e-3 or abs(it[4] - it[2]) <= 1e-3):
            # un rectangle sans largeur ou sans hauteur (PyMuPDF) : un trait
            it = ('l', (it[1], it[2]), (it[3], it[4]))
            if math.hypot(it[2][0] - it[1][0], it[2][1] - it[1][1]) < LONGUEUR_NULLE:
                stats['points'] = stats.get('points', 0) + 1
                continue
        sortie.append(it)
    return sortie


def elements_des_chemins(col, stats):
    """Les elements d'une page tires de ses chemins."""
    sortie = []
    for k, c in enumerate(col.chemins):
        num = k + 1
        base = {'trait': c['trait'], 'fond': c['fond'], 'ep': c['ep'] if c['trait'] is not None else None,
                'at': c['at'], 'af': c['af'], 'calque': c['calque'], 'chemin': num, 'ordre': c['ordre'],
                'tirets': c['tirets'], 'bloc': c.get('bloc'), 'clip': c.get('clip')}
        for ch in _chaines(normaliser(c['items'], stats)):
            if ch[0][0] == 're':
                _, x0, y0, x1, y1 = ch[0]
                e = dict(base, type='rectangle', x1=min(x0, x1), y1=min(y0, y1), x2=max(x0, x1), y2=max(y0, y1), angle=None)
                sortie.append(e)
                continue
            r = _est_rectangle(ch)
            if r is not None:
                sortie.append(dict(base, type='rectangle', x1=r[0], y1=r[1], x2=r[2], y2=r[3], angle=None))
                continue
            r = _est_cercle(ch)
            if r is not None:
                sortie.append(dict(base, type='cercle', x1=r[0], y1=r[1], x2=r[2], y2=r[3], angle=None))
                continue
            for it in ch:
                if it[0] == 'l':
                    (xa, ya), (xb, yb) = it[1], it[2]
                    sortie.append(dict(base, type='segment', x1=xa, y1=ya, x2=xb, y2=yb,
                                       angle=angle_de(xb - xa, yb - ya)))
                elif it[0] == 'c':
                    p0, p1, p2, p3 = it[1], it[2], it[3], it[4]
                    sortie.append(dict(base, type='courbe', x1=p0[0], y1=p0[1], x2=p3[0], y2=p3[1],
                                       angle=angle_de(p3[0] - p0[0], p3[1] - p0[1]), ctrl=(p1, p2)))
    return sortie


# un glyphe : (u, ox, oy, ux, uy, taille, avance, police, mode, couleur, alpha, calque, ordre)

LIGATURES = {0xFB00: u'ff', 0xFB01: u'fi', 0xFB02: u'fl', 0xFB03: u'ffi', 0xFB04: u'ffl', 0xFB05: u'st', 0xFB06: u'st'}


def elements_des_glyphes(glyphes):
    """Regroupe les glyphes en textes : meme police, meme corps, meme sens,
    meme couleur, meme calque, sur la meme ligne de base et a moins d'un
    corps l'un de l'autre (un texte espace lettre a lettre reste un texte :
    coupe en morceaux, le debut de chacun dirait la largeur des lettres). Un
    ecart de plus de 0,12 corps (au-dela de l'ecart ordinaire du texte, pour
    un texte espace lettre a lettre) sans glyphe d'espace devient une espace."""
    textes = []
    cour = None
    for g in glyphes:
        u, ox, oy, ux, uy, taille, avance, police, mode, couleur, alpha, calque, ordre, bloc, clip = g
        if not (math.isfinite(ox) and math.isfinite(oy) and math.isfinite(taille) and math.isfinite(avance)):
            continue
        if cour is not None:
            (fx, fy) = cour['fin']
            meme = (police == cour['police'] and abs(taille - cour['taille']) <= 0.01 * max(taille, cour['taille'])
                    and mode == cour['mode'] and couleur == cour['couleur'] and calque == cour['calque']
                    and alpha == cour['alpha']
                    and abs(ux - cour['ux']) < 0.009 and abs(uy - cour['uy']) < 0.009)
            if meme:
                vx, vy = ox - fx, oy - fy
                le_long = vx * cour['ux'] + vy * cour['uy']
                travers = abs(vx * cour['uy'] - vy * cour['ux'])
                if travers <= 0.05 * taille and -0.3 * taille <= le_long <= 1.0 * taille:
                    cour['glyphes'].append((u, ox, oy, avance, le_long / taille if taille > 0 else 0.0))
                    cour['fin'] = (ox + avance * ux, oy + avance * uy)
                    # la decoupe d'un texte : l'union de celles de ses glyphes (une decoupe qui change au milieu d'une
                    # ligne ne coupe pas le texte en deux : PyMuPDF, qui ne la connait pas, ne le couperait pas)
                    if cour['clip'] is not None:
                        cour['clip'] = None if clip is None else (min(cour['clip'][0], clip[0]), min(cour['clip'][1], clip[1]),
                                                                  max(cour['clip'][2], clip[2]), max(cour['clip'][3], clip[3]))
                    continue
            textes.append(cour)
        cour = {'police': police, 'taille': taille, 'mode': mode, 'couleur': couleur, 'calque': calque,
                'alpha': alpha, 'ux': ux, 'uy': uy, 'glyphes': [(u, ox, oy, avance, 0.0)],
                'fin': (ox + avance * ux, oy + avance * uy), 'ordre': ordre, 'bloc': bloc, 'clip': clip}
    if cour is not None:
        textes.append(cour)
    sortie = []
    for t in textes:
        brut = t['glyphes']
        # l'ecart ordinaire entre deux glyphes (un texte espace lettre a lettre en a un)
        ecarts = sorted(brut[k][4] for k in range(1, len(brut)) if brut[k][0] != ' ' and brut[k - 1][0] != ' ')
        ordinaire = max(0.0, ecarts[len(ecarts) // 2]) if len(ecarts) >= 3 else 0.0
        gl = [brut[0]]
        for k in range(1, len(brut)):
            g = brut[k]
            if g[4] - ordinaire > 0.12 and g[0] != ' ' and gl[-1][0] != ' ':
                prec = gl[-1]
                gl.append((' ', prec[1] + prec[3] * t['ux'], prec[2] + prec[3] * t['uy'], 0.0, 0.0))
            gl.append(g)
        # retirer les espaces du debut et de la fin
        i, j = 0, len(gl)
        while i < j and not gl[i][0].strip():
            i += 1
        while j > i and not gl[j - 1][0].strip():
            j -= 1
        if i >= j:
            continue
        gl = gl[i:j]
        texte = u''.join(x[0] for x in gl).translate(LIGATURES)
        x1, y1 = gl[0][1], gl[0][2]
        der = gl[-1]
        x2, y2 = der[1] + der[3] * t['ux'], der[2] + der[3] * t['uy']
        sortie.append({'type': 'texte', 'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2,
                       'angle': angle_de(t['ux'], t['uy']), 'taille': t['taille'], 'trait': None,
                       'fond': None, 'couleur': t['couleur'], 'mode': t['mode'], 'police': t['police'],
                       'texte': texte, 'calque': t['calque'], 'alpha': t['alpha'], 'chemin': None,
                       'ordre': t['ordre'], 'ux': t['ux'], 'uy': t['uy'], 'bloc': t['bloc'], 'clip': t['clip']})
    return sortie


def elements_des_images(col):
    sortie = []
    for im in col.images:
        xs = [p[0] for p in im['coins']]
        ys = [p[1] for p in im['coins']]
        if not all(math.isfinite(v) for v in xs + ys):
            continue
        (ax, ay), (bx, by) = im['coins'][0], im['coins'][1]
        sortie.append({'type': 'image', 'x1': min(xs), 'y1': min(ys), 'x2': max(xs), 'y2': max(ys),
                       'angle': angle_de(bx - ax, by - ay), 'l': im['l'], 'h': im['h'], 'info': im['info'],
                       'calque': im['calque'], 'ordre': im['ordre'], 'trait': None, 'fond': None,
                       'chemin': None, 'coins': im['coins'], 'bloc': im.get('bloc'), 'clip': im.get('clip')})
    return sortie


def boite_texte(e):
    """La boite d'un texte : de la ligne de base, 0,8 corps au-dessus et 0,2
    au-dessous (convention fixe : les deux lecteurs disent la meme chose)."""
    ux, uy = e['ux'], e['uy']
    nx, ny = uy, -ux                    # vers le haut du texte
    s = e['taille']
    pts = []
    for (x, y) in ((e['x1'], e['y1']), (e['x2'], e['y2'])):
        pts.append((x + 0.8 * s * nx, y + 0.8 * s * ny))
        pts.append((x - 0.2 * s * nx, y - 0.2 * s * ny))
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return (min(xs), min(ys), max(xs), max(ys))


def boite(e):
    if e['type'] == 'texte':
        return boite_texte(e)
    if e['type'] == 'courbe':
        xs = [e['x1'], e['x2'], e['ctrl'][0][0], e['ctrl'][1][0]]
        ys = [e['y1'], e['y2'], e['ctrl'][0][1], e['ctrl'][1][1]]
        return (min(xs), min(ys), max(xs), max(ys))
    return (min(e['x1'], e['x2']), min(e['y1'], e['y2']), max(e['x1'], e['x2']), max(e['y1'], e['y2']))


CORPS_MINUSCULE = 1.0      # pt : un texte plus petit ne se lit pas a l'oeil
CASE_GRILLE = 56.7         # pt (20 mm) : la grille qui range les caches
MARGE_PAGE = 10 / MM       # pt : au-dela de la page (et de cette marge), une boite ne compte plus pour la grille


class Grille(object):
    """Un index spatial tout simple : des boites rangees par case. La grille
    est bornee a la page (et une marge) : une boite demesuree (un texte de
    10^9 mm, un aplat geant) n'y prend que les cases de la page."""

    def __init__(self, largeur=None, hauteur=None, case=CASE_GRILLE):
        self.cases = {}
        self.case = case
        if largeur is not None and hauteur is not None:
            self.bornes = (int(-MARGE_PAGE // case), int(-MARGE_PAGE // case),
                           int((largeur + MARGE_PAGE) // case), int((hauteur + MARGE_PAGE) // case))
        else:
            self.bornes = None

    def plage(self, b, marge=0.0):
        """Les cases (i0, j0, i1, j1) que couvre la boite b (agrandie de marge), bornees."""
        k = self.case
        try:
            i0, j0 = int((b[0] - marge) // k), int((b[1] - marge) // k)
            i1, j1 = int((b[2] + marge) // k), int((b[3] + marge) // k)
        except (OverflowError, ValueError):
            return (0, 0, -1, -1)
        if self.bornes is not None:
            bi0, bj0, bi1, bj1 = self.bornes
            i0, j0, i1, j1 = max(i0, bi0), max(j0, bj0), min(i1, bi1), min(j1, bj1)
        return (i0, j0, i1, j1)

    def ajouter(self, b, objet):
        i0, j0, i1, j1 = self.plage(b)
        for i in range(i0, i1 + 1):
            for j in range(j0, j1 + 1):
                self.cases.setdefault((i, j), []).append(objet)

    def autour(self, x, y):
        try:
            return self.cases.get((int(x // self.case), int(y // self.case)), ())
        except (OverflowError, ValueError):
            return ()

    def dans(self, b, marge=0.0):
        """Les objets des cases que touche la boite b (agrandie de marge), chacun une fois."""
        vus = set()
        i0, j0, i1, j1 = self.plage(b, marge)
        for i in range(i0, i1 + 1):
            for j in range(j0, j1 + 1):
                for o in self.cases.get((i, j), ()):
                    if id(o) not in vus:
                        vus.add(id(o))
                        yield o


def meme_couleur(a, b, tol=0.03):
    return isinstance(a, tuple) and isinstance(b, tuple) and len(a) >= 3 and len(b) >= 3 and \
        all(abs(float(x) - float(y)) <= tol for x, y in zip(a[:3], b[:3]))


VOISINS_MAX = 4000         # surfaces examinees au plus pour un element (des milliers d'aplats empiles a l'identique)


def juger_visibilite(elements, largeur, hauteur):
    """Pour chaque element : visible (O/N) et pourquoi pas (mode3, mode7,
    calque, transparent, horspage, decoupe, blanc, fond, minuscule, recouvert).
    Les elements arrivent dans l'ordre ou la page les peint : dans chaque case
    de la grille, les surfaces sont rangees par rang croissant, et la
    recherche part du bon rang (bisect) : un empilement de milliers d'aplats
    identiques ne rend pas le calcul quadratique."""
    import bisect
    fonds = Grille(largeur, hauteur)    # les surfaces remplies opaques : ce qui est dessous (par rang croissant)
    caches = Grille(largeur, hauteur)   # les rectangles pleins et opaques : ce qu'ils recouvrent ne se voit plus
    images_sans_rang = []               # images lues par PyMuPDF (sans rang : peintes en premier)
    for e in elements:
        b = boite(e)
        e['boite'] = b
        cal = e.get('calque')
        masque = isinstance(cal, tuple) and cal[1] is False
        if e['type'] == 'image' or (e.get('fond') not in (None, 'motif') and (e.get('af') is None or e.get('af') > 0)):
            if (b[2] - b[0]) * (b[3] - b[1]) > 0.5 and not masque:
                if e['type'] == 'image' and e['info'].get('sans_rang'):
                    images_sans_rang.append(e)
                else:
                    fonds.ajouter(b, e)
        if e['type'] == 'rectangle' and e.get('fond') not in (None, 'motif') and (e.get('af') is None or e['af'] >= 0.999):
            if not masque:
                caches.ajouter(b, e)
    rangs_f = dict((k, [f['ordre'] for f in v]) for k, v in fonds.cases.items())
    rangs_c = dict((k, [f['ordre'] for f in v]) for k, v in caches.cases.items())

    def cellule(g, x, y):
        try:
            return (int(x // g.case), int(y // g.case))
        except (OverflowError, ValueError):
            return None
    for e in elements:
        raisons = []
        cal = e.get('calque')
        if isinstance(cal, tuple) and cal[1] is False:
            raisons.append('calque')
        t = e['type']
        if t == 'texte':
            if e['mode'] == 'invisible':
                raisons.append('mode3')
            elif e['mode'] == 'decoupe':
                raisons.append('mode7')
            if e.get('alpha') is not None and e['alpha'] <= 0:
                raisons.append('transparent')
        elif t != 'image':
            at, af = e.get('at'), e.get('af')
            visibles = []
            if e.get('trait') is not None:
                visibles.append(at is None or at > 0)
            if e.get('fond') is not None:
                visibles.append(af is None or af > 0)
            if visibles and not any(visibles):
                raisons.append('transparent')
        b = e['boite']
        if b[2] < -0.01 or b[0] > largeur + 0.01 or b[3] < -0.01 or b[1] > hauteur + 0.01:
            raisons.append('horspage')
        elif e.get('clip') is not None and not touche(b, e['clip']):
            raisons.append('decoupe')
        # sur quoi il se peint : la surface opaque la plus haute peinte avant lui sous son centre (sinon la page, blanche)
        cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
        if t == 'texte':
            couleurs = [e.get('couleur')]
        elif t == 'image':
            couleurs = []
        else:
            couleurs = [c for c in (e.get('trait'), e.get('fond')) if c is not None]
        if couleurs and all(isinstance(c, tuple) for c in couleurs):
            dessous = None
            k = cellule(fonds, cx, cy)
            liste = fonds.cases.get(k, ()) if k is not None else ()
            if liste:
                j = bisect.bisect_left(rangs_f[k], e['ordre']) - 1
                vus = 0
                while j >= 0 and vus < VOISINS_MAX:
                    f = liste[j]
                    fb = f['boite']
                    if fb[0] <= cx <= fb[2] and fb[1] <= cy <= fb[3]:
                        dessous = f
                        break
                    j -= 1
                    vus += 1
            if dessous is None:
                for f in images_sans_rang:
                    fb = f['boite']
                    if fb[0] <= cx <= fb[2] and fb[1] <= cy <= fb[3]:
                        dessous = f
                        break
            if dessous is None or (dessous['type'] != 'image' and est_blanc(dessous.get('fond'))):
                if all(est_blanc(c) for c in couleurs):
                    raisons.append('blanc')
            elif t == 'texte' and dessous['type'] != 'image' and meme_couleur(couleurs[0], dessous.get('fond')):
                # un texte de la couleur de l'aplat sur lequel il est peint (jaune sur jaune...)
                raisons.append('fond')
        if t == 'texte' and e['taille'] < CORPS_MINUSCULE:
            raisons.append('minuscule')
        # recouvert par un rectangle plein et opaque peint apres lui
        if t in ('texte', 'segment') and not raisons:
            k = cellule(caches, cx, cy)
            liste = caches.cases.get(k, ()) if k is not None else ()
            if liste:
                j = len(liste) - 1
                debut = bisect.bisect_right(rangs_c[k], e['ordre'])
                vus = 0
                while j >= debut and vus < VOISINS_MAX:
                    cb = liste[j]['boite']
                    if cb[0] <= b[0] + 0.05 and cb[1] <= b[1] + 0.05 and cb[2] >= b[2] - 0.05 and cb[3] >= b[3] - 0.05:
                        raisons.append('recouvert')
                        break
                    j -= 1
                    vus += 1
        e['raisons'] = raisons
        e['visible'] = not raisons
    return elements


# ===========================================================================
#  11. Les motifs : chaque texte reduit a sa forme
# ===========================================================================

def _classe_caractere(c):
    """'A' (majuscule ou lettre sans casse), 'a' (minuscule), '9' (chiffre ou
    nombre : 7, Ⅻ, ⑫, ½), '' (marque combinante : un accent decompose suit sa
    lettre et n'est pas un signe a part), ou None (un autre signe)."""
    cat = unicodedata.category(c)
    if cat[0] == 'L':
        return 'a' if (cat == 'Ll' or c.islower()) else 'A'
    if cat[0] == 'N':
        return '9'
    if cat[0] == 'M':
        return ''
    return None


def _symbole_lettre(c):
    """Un symbole qui porte une lettre ou un chiffre sans en etre un pour
    Unicode (lettre cerclee, encadree, indicateur regional, capitale
    tournee, braille...) : sa classe par sa decomposition de compatibilite
    (Ⓚ -> K, ™ -> TM) ou par son nom ; None si le symbole n'en porte pas."""
    d = unicodedata.normalize('NFKD', c)
    if d != c:
        classes = [_classe_caractere(x) for x in d]
        if any(k for k in classes):
            return u''.join(k if k is not None else x for k, x in zip(classes, d))
    try:
        nom = unicodedata.name(c)
    except ValueError:
        return None
    if re.search(r'\b(?:DIGIT|NUMBER|NUMERAL)\b', nom):
        return '9'
    if re.search(r'\b(?:LETTER|CAPITAL|BRAILLE)\b', nom):
        # une lettre (LETTER), une capitale tournee ou de ronde (TURNED SANS-SERIF CAPITAL L, SCRIPT CAPITAL
        # P) ou une cellule de braille (BRAILLE PATTERN DOTS-13) : une lettre
        return 'a' if 'SMALL' in nom else 'A'
    return None


def motif(texte):
    """Le texte reduit a sa forme : une lettre -> A ou a, un chiffre ou un
    nombre -> 9 (lettres accentuees, autres ecritures, chiffres romains, nombres
    cercles, lettres cerclees ou encadrees compris), les autres signes et les
    espaces gardes, un caractere de controle ou prive -> ¤."""
    sortie = []
    for c in texte:
        k = _classe_caractere(c)
        if k is not None:
            sortie.append(k)
            continue
        if c == '\t' or c == '\n' or c == '\r':
            sortie.append(' ')
            continue
        cat = unicodedata.category(c)
        if cat[0] == 'C':
            sortie.append(INCONNU)
            continue
        if cat[0] == 'S' or cat in ('Pd', 'Po'):
            s = _symbole_lettre(c) if ord(c) > 127 else None
            if s is not None:
                sortie.append(s)
                continue
        sortie.append(c)
    return u''.join(sortie)


# -- Les noms qu'on peut montrer ------------------------------------------------
#
# Un nom lu dans le PDF (police, etiquette ou cle du contenu marque, sorte
# d'annotation, cle hors norme, propriete XMP, filtre, espace de couleur...)
# peut etre celui d'une societe, d'un projet, d'une personne. Il ne sort en
# clair que s'il est CONNU (un nom de la norme PDF, une famille de polices du
# commerce) ou fait de MOTS ORDINAIRES (PartNumber, SEE_Attributs) ; sinon il
# devient un code stable et sa forme : « K2 (AaaaaaaAA) ».

_MOTS_ORDINAIRES = set(u'''
a à about acad ad add additional address adresse after alt alternate am an and annotation annotations app appareil
application applications apres après article articles as at attr attribut attributs attribute attributes author auteur
autocad avant b back bas base bbox begin bloc block blocks blindage bloc body bom borne bornes bottom box broche
broches by c cable cables câble câbles cad calque calques caption catalog catalogue categorie catégorie category ce
cell cellule center centre champ champs change changes channel char check child cible circuit class classe cle clé
client code codes color colour column comment commentaire commentaires commande company component components composant
composants config configuration connecteur connecteurs connector connectors contact contacts content contents
coordinate cote côté count created creation création creator cross custom customer d data date de debut début default
del delete dept depth des desc description design designation désignation destination detail details device devices
diagram diagramme dim dimension direction doc document documents donnee donnée donnees données drawing du e ecad
echelle échelle edit edition element elements élément éléments end entity entree entrée equipement équipement
equipements équipements equipment etat état export ext extra f family famille field fields fil file filename fils fin
fini flag folio font for form format from fonction function g gauche gauge group groupe h harness haut height hidden
id ident identifier image in index info information informations input instance item items jauge key keys keyword
keywords kind l label labels largeur last layer layers left length level lib libelle libellé line link list liste
local localisation location long longueur m main manufacturer interne internal externe external tool create modify rendition
trapped conformance rights publisher language lang chemin outil fichier marker mass masse master material materiel matériel max
meta metadata mfg mfr min mod mode model modele modèle modified modification module name names net nets new no nom
noms norm norme normes not note notes num number numero numéro numbers o object objet objets of old on option options
order ordre origin origine out output owner p page pages param parameter parameters parametre paramètre parent part
parts path pb pdf piece pièce pieces pièces pin pins pn point pos position prefix prefixe préfixe print private prive
privé prod produit product project projet prop properties property propriete propriété proprietes propriétés ps qty
quantite quantité quantity r ref refs reference référence references références rel relation remark remarque rev
revision révision right role root rotation route s scale schema schéma section see segment sheet shield side signal
size source spec splice std standard start state status std style sub subject sujet supplier symbol symbole symboles
system systeme système t table tag tags target taille terminal terminaux text texte title titre to top total type
types u unit unite unité user utilisateur v val valeur value values var variant variante version vers view vue w
width wire wires x xref y z zone
'''.split())

_NOMS_PDF = set('''
Type Subtype S P Pg K Kids Parent Names Name Alt ActualText E Lang MCID O A C R T ID Title Author Subject Keywords
Creator Producer CreationDate ModDate Trapped Metadata PieceInfo LastModified Private Contents BBox Attached
Document Part Art Sect Div BlockQuote Caption TOC TOCI Index NonStruct H H1 H2 H3 H4 H5 H6 L LI Lbl LBody Table TR TH
TD THead TBody TFoot Span Quote Note Reference BibEntry Code Link Annot Ruby RB RT RP Warichu WT WP Figure Formula
Form Artifact OC ReversedChars Tx Layer Aside Title FENote Sub Em Strong DocumentFragment Clip Pagination Layout
Page Header Footer Watermark Background Placement Role RoleMap ClassMap Placement WritingMode BackgroundColor
BorderColor BorderStyle BorderThickness Padding Color SpaceBefore SpaceAfter StartIndent EndIndent TextIndent
TextAlign Width Height BlockAlign InlineAlign TBorderStyle TPadding BaselineShift LineHeight TextDecorationColor
TextDecorationThickness TextDecorationType RubyAlign RubyPosition GlyphOrientationVertical ColumnCount ColumnGap
ColumnWidths ListNumbering RowSpan ColSpan Headers Scope Summary Short Checked Desc Version Extensions Pages
PageLabels Dests ViewerPreferences PageLayout PageMode Outlines Threads OpenAction AA URI AcroForm StructTreeRoot
MarkInfo SpiderInfo OutputIntents OCProperties Perms Legal Requirements Collection NeedsRendering DSS AF DPartRoot
Resources MediaBox CropBox BleedBox TrimBox ArtBox BoxColorInfo Rotate Group Thumb B Dur Trans Annots StructParents
PZ SeparationInfo Tabs TemplateInstantiated PresSteps UserUnit VP DPart
Text FreeText Line Square Circle Polygon PolyLine Highlight Underline Squiggly StrikeOut Caret Stamp Ink Popup
FileAttachment Sound Movie Screen Widget PrinterMark TrapNet 3D Redact Projection RichMedia
ASCIIHexDecode ASCII85Decode LZWDecode FlateDecode RunLengthDecode CCITTFaxDecode JBIG2Decode DCTDecode JPXDecode
Crypt AHx A85 LZW Fl RL CCF DCT
DeviceGray DeviceRGB DeviceCMYK CalGray CalRGB Lab ICCBased Indexed Pattern Separation DeviceN G RGB CMYK I Gray
Standard Adobe.PubSec Adobe.APS Adobe.PPKLite Adobe.PPKMS
Type0 Type1 MMType1 Type3 TrueType CIDFontType0 CIDFontType2 OpenType
StandardEncoding MacRomanEncoding WinAnsiEncoding PDFDocEncoding MacExpertEncoding Identity-H Identity-V Identity
Differences
'''.split())

_RE_CMAP_STANDARD = re.compile(
    r'^(?:Uni(?:GB|CNS|JIS|JISPro|JIS2004|JISX0213|JISX02132004|KS|Code)|GBK?(?:p|2K)?|GBpc|GBT|B5pc|B5|HKscs|ETen|'
    r'ETenms|ETHK|HKdla|HKdlb|HKgccs|HKm314|HKm471|CNS(?:1|2)?|83pv|90ms|90msp|90pv|78|78ms|Add|EUC|Ext|NWP|KSC|KSCms|'
    r'KSCpc|Hankaku|Hiragana|Katakana|Roman|WP-Symbol|Identity|Adobe)'
    r'(?:-(?:UCS2|UCS|UTF8|UTF16|UTF32|HW|RKSJ|EUC|B5|UHC|GB1|CNS1|Japan1|Korea1|Identity))*(?:-[HV])?$')


def _mots_du_nom(nom):
    s = ascii_seul(nom)
    s = re.sub(r'([a-z])([A-Z])', r'\1 \2', s)
    s = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1 \2', s)
    s = re.sub(r'([A-Za-z])([0-9])', r'\1 \2', s)
    s = re.sub(r'([0-9])([A-Za-z])', r'\1 \2', s)
    return [m for m in re.split(r'[^A-Za-z0-9]+', s) if m]


def nom_ordinaire(nom):
    """Vrai si le nom n'est fait que de mots ordinaires (anglais ou francais
    techniques : PartNumber, Ref_Norme, SEE_Attributs) et de petits nombres
    (deux chiffres au plus) : il ne peut pas porter un nom propre."""
    mots = _mots_du_nom(nom)
    if not mots or len(nom) > 60:
        return False
    for m in mots:
        b = m.lower()
        if b.isdigit():
            if len(b) > 2:
                return False
        elif b not in _MOTS_ORDINAIRES and not (len(b) == 1 and b.isalpha()):
            return False
    return True


class Masques(object):
    """Les noms qu'on ne montre pas : un code stable par sorte et par releve
    (P1, P2... pour les polices, K1... pour les cles), suivi de la forme."""

    def __init__(self):
        self.codes = {}

    def code(self, prefixe, nom):
        d = self.codes.setdefault(prefixe, {})
        if nom not in d:
            d[nom] = '%s%d' % (prefixe, len(d) + 1)
        return d[nom]


def nom_montrable(nom, prefixe='N', masques=None, connus=_NOMS_PDF, ordinaire=True):
    """Le nom tel qu'on peut l'ecrire : en clair s'il est connu (connus : un
    ensemble de noms, ou une fonction) ou fait de mots ordinaires ; sinon un
    code et sa forme (« K2 (AaaaAaaaaa) »), ou sa forme seule sans masques."""
    nom = u'' if nom is None else u'%s' % (nom,)
    if not nom:
        return u''
    connu = connus(nom) if callable(connus) else (connus is not None and nom in connus)
    if connu or (ordinaire and nom_ordinaire(nom)):
        return re.sub(r'[^A-Za-z0-9 ,._+:/-]', '', ascii_seul(nom))[:60] or u'?'
    forme = motif(nom)[:40]
    if masques is None:
        return u'(nom masqué : %s)' % forme
    return u'%s (%s)' % (masques.code(prefixe, nom), forme)


def nom_standard(nom, defaut='autre'):
    """Un nom de la norme PDF, sinon « autre » (pour les messages : jamais de
    nom lu dans le PDF)."""
    n = u'%s' % (nom,) if nom is not None else u''
    return n if (n in _NOMS_PDF or _RE_CMAP_STANDARD.match(n)) else defaut


# -- Les polices : une famille du commerce sort en clair, une police maison non --

_FAMILLES_POLICES = sorted(set('''
arial arialmt arialnarrow arialunicode arialunicodems arialuni arialblack arialrounded helvetica helveticaneue times
timesnewroman timesroman timesnewromanps courier couriernew couriernewps symbol zapfdingbats dingbats calibri cambria
cambriamath candara consolas constantia corbel segoeui segoe segoeprint segoescript segoeuisymbol segoeuiemoji
tahoma verdana georgia trebuchet trebuchetms lucida lucidaconsole lucidasans lucidasansunicode lucidagrande
lucidasanstypewriter mssansserif msserif msgothic msmincho mspgothic mspmincho msuigothic msreferencesansserif
microsoftsansserif microsoftyahei microsoftjhenghei simsun nsimsun simhei simkai fangsong kaiti mingliu pmingliu gulim
batang dotum gungsuh malgungothic meiryo yugothic yumincho wingdings webdings marlett bookantiqua centurygothic century
centuryschoolbook garamond impact comicsansms franklingothic gillsans gillsansmt futura frutiger univers optima palatino
palatinolinotype bookman bookmanoldstyle newcenturyschlbk avantgarde itcavantgarde isocpeur isocteur isocp isoct
isocp2 isocp3 isoct2 isoct3 simplex romans romand romanc romant txt monotxt gdt amgdt gothice gothicg gothici italicc
italict scriptc scripts complex greekc greeks syastro symap symath symeteo symusic swiss dutch monospac821 swis721
dutch801 bitstreamvera vera dejavusans dejavuserif dejavusansmono dejavusanscondensed liberationsans liberationserif
liberationmono liberationsansnarrow notosans notoserif notosansmono notosanscjk notosanssymbols notocoloremoji roboto
robotomono robotocondensed opensans sourcesanspro sourcesans sourcesans3 sourceserifpro sourcecodepro ubuntu
ubuntumono cantarell freesans freeserif freemono nimbussans nimbussansl nimbusroman nimbusromno9l nimbusmono
nimbusmonol nimbussanl nimbusmonops urwgothic urwbookman urwpalladio urwchancery myriad myriadpro minion minionpro lato
montserrat inter aptos bahnschrift sitka sitkatext ebrima gadugi nirmalaui leelawadee leelawadeeui sylfaen mangal
euclid euclidsymbol euclidextra euclidmathone euclidmathtwo standardsymbolsps ocra ocrb ocraextended cascadiacode
cascadiamono menlo monaco sfns sfpro sfprotext sfprodisplay sfmono geneva applesdgothicneo hiraginosans hiragino
hiraginokakugothic hiraginomincho pingfangsc pingfangtc stheiti stsong stkaiti osaka adobesongstd kozminpro kozgopro
kozminpr6n kozgopr6n adobemingstd adobeheitistd adobefangsongstd adobekaitistd adobemyungjostd adobegothicstd
adobepistd mtextra mtsymbol javanesetext holomdl2 gisha david miriam frankruehl arialhebrew traditionalarabic
simplifiedarabic andalus kartika vrinda shruti raavi latha gautami tunga iskoolapota kalinga estrangeloedessa mvboli
sakkalmajalla calibrilight segoeuilight segoeuisemibold segoeuiblack franklingothicmedium franklingothicbook
twcen tw centurygothic haettenschweiler agencyfb berlinsansfb eras erasitc rockwell perpetua baskerville
baskervilleoldface bodoni didot hoefler hoeflertext americantypewriter chalkboard markerfelt noteworthy papyrus
brushscript brushscriptmt edwardianscript vladimirscript kristen lucidahandwriting lucidacalligraphy lucidafax
lucidabright mistral jokerman curlz wide latin stencil algerian castellar copperplate copperplategothic engravers
felixtitling goudy goudyoldstyle bernard bookshelf tempussans viner gigi harrington pristina rage informal
poorrichard footlight showcard snapitc bauhaus93 cooperblack broadway colonna onyx playbill magneto harlow
jazz desdemona kino matura maiandra parchment ravie juice blackadder bradleyhand chiller frenchscript freestyle
gill gillsansultrabold gloucester imprint kunstler modern niagara oldenglish palacescript script snap stencil
abadi aldhabi aparajita arabictypesetting browallia cordia daunpenh dfkaisb dokchampa estrangelo euphemia gabriola
irisupc jasmine kodchiang leelawadee lilyupc mongolianbaiti moolboran narkisim plantagenet raavi rod shonar
simplifiedarabicfixed sylfaen traditionalarabic utsaah vani vijaya
'''.split()), key=len, reverse=True)

_STYLES_POLICES = sorted(set('''
bold bd b italic ital it i oblique obl o regular regu reg r roman rom book bk light lt medium med md semibold sb semi
demibold demi black blk heavy hv thin th extralight extrabold xbold ultralight ultrabold narrow nar condensed cond cn
compressed extended ext expanded wide mt ps psmt std pro com mono sans serif neue display text caption headline sc osf
small smallcaps caps normal plain kursiv fett gras italique standard unicode ms ce cyr greek gr tur baltic ui uni
bt lf tf otf ttf t1 tt sym symbol math w x
'''.split()), key=len, reverse=True)


def _fait_de(reste, morceaux):
    ok = [False] * (len(reste) + 1)
    ok[0] = True
    for i in range(len(reste)):
        if not ok[i]:
            continue
        for m in morceaux:
            if reste.startswith(m, i):
                ok[i + len(m)] = True
    return ok[len(reste)]


def police_connue(nom):
    """Une famille de polices du commerce (Arial, Helvetica, ISOCPEUR...),
    avec ses suffixes de style (-Bold, MT, PS...) : on peut la nommer."""
    n = nom or ''
    if '+' in n[:8]:
        n = n.split('+', 1)[1]
    k = re.sub(r'[^a-z0-9]', '', ascii_seul(n).lower())
    if not k:
        return False
    for fam in _FAMILLES_POLICES:
        if k.startswith(fam) and _fait_de(k[len(fam):], _STYLES_POLICES):
            return True
    return False


def nom_de_police(nom, masques=None):
    """Le nom d'une police tel qu'on peut l'ecrire : une famille connue en
    clair (sans le prefixe de sous-ensemble ABCDEF+), une police Type3 sous ce
    seul nom, toute autre (une police maison peut porter le nom de la
    societe, du programme, du client) en code et forme : « P1 (Aaaaaaaa-Aaaa) »."""
    n = nom or ''
    if '+' in n[:8]:
        n = n.split('+', 1)[1]
    if not n or n in ('Type3', 'Type0', 'TrueType', 'Type1'):
        return n or '?'
    return nom_montrable(n, 'P', masques, connus=police_connue, ordinaire=False)


# -- Le logiciel qui a fait le PDF (Producer, Creator) --------------------------

# des noms de logiciels et d'editeurs sans ambiguite : toujours gardes
_LOGICIELS = set(u'''
adobe acrobat distiller pdflib pdfmaker microsoft excel powerpoint visio autocad autodesk dwg trueview ige+xao ige-xao
etap see ghostscript ghostpdl artifex itext itextsharp itextpdf pdfsharp reportlab skia chromium mupdf pymupdf fitz
pdftex latex luatex xetex dvipdfmx libreoffice openoffice staroffice inkscape illustrator indesign photoshop pscript5
pscript5.dll pdfcreator bullzip cutepdf primopdf foxit phantompdf nitro novapdf bluebeam pdf-xchange paperport
omnipage abbyy finereader kofax catia zuken e3.series cadstar vesys eplan teamcenter solidworks ansys microstation creo
pdf24 smallpdf ilovepdf aspose pdfium pdfbox wkhtmltopdf webkit qtwebkit scansoft nuance textbridge ironpdf pdftron
apryse docotic syncfusion telerik devexpress ssrs tibco jaspersoft birt fastreport stimulsoft activereports poppler
xpdf cairographics pdfjs tcpdf fpdf dompdf mpdf weasyprint jasperreports pdfsam scribus quarkxpress framemaker
solidedge zw3d draftsight bricscad nanocad progecad intellicad vectorworks archicad revit navisworks smartplant aveva
wscad elcad ruplan cimatron caneco xelec see-electrical trace-software quartz pdfcontext macos osx windows linux
pikepdf qpdf pypdf pypdf2 pdfminer pdfplumber pdfkit amyuni xerox ricoh kyocera konica minolta lexmark epson kodak
fujitsu fujifilm toshiba olivetti laserjet officejet designjet imagerunner workcentre bizhub taskalfa scansnap
docuworks
'''.split())

# des mots ordinaires ou ambigus (un nom propre possible : Sharp, Prince, Power, Star...) : gardes
# seulement colles a un logiciel garde (« Microsoft Print To PDF », « Acrobat 11 for Word »)
_LOGICIELS_MOTS = set(u'''
pdf library paper capture word office print printer printing to for mac os x plot plotter pc3 electrical expert trace
software gpl google chrome headless qt cairo tex writer draw calc impress reader editor pro tracker sharp brother hp
canon scan scanner power dassault systemes systèmes e3 mentor graphics capital siemens nx solid edge bentley ptc apache
fop ibex prince pdfwriter normal version build release edition professional standard server service pack sp dc x64
x86 bit 64-bit 32-bit macro convert converter export exporter plugin plug-in add-in with by and the of on inc corp
corporation gmbh ltd llc sa sas ag co ecad cad harness wiring diagram designer builder studio suite manager viewer
generator cocoa ios android unix sun java jdk net framework ms rendering engine image images tiff jpeg png postscript
ps eps svg dxf html xml xps opc ocr crystal reports sap business objects macintosh cc star pour core api sdk lib kit
toolkit anglais francais français english french german deutsch espanol español italiano gs prawn quark elements elec
save as architect soda series visual basic vba xchange xao ige
'''.split())

# des suites de mots qui forment un nom de logiciel (chacun garde)
_LOGICIELS_SUITES = [tuple(x.split()) for x in u'''
see electrical expert
see electrical
solid edge
mac os x
mac os
crystal reports
sap business objects
mentor graphics capital
mentor graphics
capital harness
e3 series
trace software
star office
google chrome
google docs
ms word
ms office
microsoft print to pdf
print to pdf
save as pdf
power pdf
pdf architect
soda pdf
siemens nx
pdf xchange
ige xao
'''.strip().splitlines()]

_RE_VERSION_POINTEE = re.compile(r'^v?\d{1,4}(?:\.\d{1,6}){1,4}(?:[.-]?[a-z]{1,3}\d{0,3})?$', re.I)
_RE_VERSION_COURTE = re.compile(r'^(?:v\d{1,3}|v\d{1,2}(?:-\d{1,2})?r\d{1,4}(?:sp\d{1,2})?|r\d{1,4}|sp\d{1,2}|m\d{2,3}|'
                                r'(?:19|20)\d\d|\d{1,3})$', re.I)


def masquer_logiciel(s, clair=False):
    """Le Producer / Creator : garde le nom d'un logiciel connu et sa version,
    masque tout le reste (nom de personne, de societe, de projet, numero de
    projet ou d'ordre, chemin, adresse). Un mot ordinaire ou ambigu (Sharp,
    Power, Star) n'est garde que colle a un logiciel garde ; un numero, que
    juste apres lui et sous une forme de version (11.0.23, V4R3, V5-6R2019,
    2018, 11) : 350A41, X350, 1234567 sont masques."""
    if not s:
        return ''
    if clair:
        return s
    s = re.sub(r'[A-Za-z]:\\[^;,()]*|\\\\[^;,()]+|(?:/[^/\s;,()]+){2,}/?', '[chemin]', s)
    s = re.sub(r'\S+@\S+', '[courriel]', s)
    s = re.sub(r'(?i)\b(?:https?|ftp|file)://\S+', '[adresse]', s)
    jetons = [m.group(0) for m in re.finditer(r'\[(?:chemin|courriel|adresse)\]|[^\W_][\w.+#-]*|\s+|.', s, re.U)]
    # les mots, et leur voisin immediat (seulement des blancs ou des signes entre eux, pas un masque)
    mots = []
    coupe = False
    prec = {}
    for i, t in enumerate(jetons):
        if t.startswith('[') and t.endswith(']') and len(t) > 2:
            coupe = True
            continue
        if any(c.isalnum() for c in t):
            if mots and not coupe:
                prec[i] = mots[-1]
            mots.append(i)
            coupe = False
    suiv = dict((v, k) for k, v in prec.items())
    cle = dict((i, jetons[i].lower().rstrip('.,;:')) for i in mots)
    garde = {}                          # i -> 'mot' | 'version'
    for i in mots:
        if cle[i] in _LOGICIELS:
            garde[i] = 'mot'
    for k in range(len(mots)):
        for suite in _LOGICIELS_SUITES:
            n = len(suite)
            idx = mots[k:k + n]
            if len(idx) == n and all(cle[idx[j]] == suite[j] for j in range(n)) and \
                    all(prec.get(idx[j]) == idx[j - 1] for j in range(1, n)):
                for i in idx:
                    garde[i] = 'mot'
    change = True
    while change:
        change = False
        for i in mots:
            if i in garde:
                continue
            p = prec.get(i)
            n_ = suiv.get(i)
            c = cle[i]
            if c in _LOGICIELS_MOTS and (p in garde or n_ in garde):
                garde[i] = 'mot'
                change = True
            elif p in garde and (_RE_VERSION_POINTEE.match(c) or (garde[p] == 'mot' and _RE_VERSION_COURTE.match(c))):
                garde[i] = 'version'
                change = True
    return u''.join(t if (i in garde or i not in cle) else motif(t) for i, t in enumerate(jetons))


# ===========================================================================
#  12. Le document lu par le lecteur standard
# ===========================================================================

def boite_pdf(v, r):
    v = r(v)
    if isinstance(v, list) and len(v) == 4:
        try:
            x0, y0, x1, y1 = [float(r(x)) for x in v]
            return (min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1))
        except (TypeError, ValueError):
            return None
    return None


def matrice_page(boite, rotation, unite):
    """Espace utilisateur -> page vue (points, origine en haut a gauche, y vers
    le bas, rotation appliquee). Rend (matrice, largeur, hauteur)."""
    x0, y0, x1, y1 = boite
    W, H = x1 - x0, y1 - y0
    m = (1.0, 0.0, 0.0, -1.0, -x0, y1)
    if rotation == 90:
        m = mul(m, (0.0, 1.0, -1.0, 0.0, H, 0.0))
        W, H = H, W
    elif rotation == 180:
        m = mul(m, (-1.0, 0.0, 0.0, -1.0, W, H))
    elif rotation == 270:
        m = mul(m, (0.0, -1.0, 1.0, 0.0, 0.0, W))
        W, H = H, W
    if unite != 1.0:
        m = mul(m, (unite, 0.0, 0.0, unite, 0.0, 0.0))
        W, H = W * unite, H * unite
    return m, W, H


_CLES_INFO = set('Title Author Subject Keywords Creator Producer CreationDate ModDate Trapped'.split())
_CLES_CATALOGUE = set('''Type Version Extensions Pages PageLabels Names Dests ViewerPreferences PageLayout PageMode
Outlines Threads OpenAction AA URI AcroForm Metadata StructTreeRoot MarkInfo Lang SpiderInfo OutputIntents PieceInfo
OCProperties Perms Legal Requirements Collection NeedsRendering DSS AF DPartRoot'''.split())
_CLES_PAGE = set('''Type Parent LastModified Resources MediaBox CropBox BleedBox TrimBox ArtBox BoxColorInfo Contents
Rotate Group Thumb B Dur Trans Annots AA Metadata PieceInfo StructParents ID PZ SeparationInfo Tabs TemplateInstantiated
PresSteps UserUnit VP AF OutputIntents DPart'''.split())


_PREFIXES_XMP = set('''dc xmp xmpMM xmpRights xmpTPg xmpG xmpDM xmpBJ xmpidq stEvt stRef stFnt stDim stVer stJob photoshop
pdf pdfaid pdfx pdfxid pdfuaid pdfaExtension pdfaSchema pdfaProperty pdfaType pdfaField tiff exif exifEX aux crs
illustrator Iptc4xmpCore Iptc4xmpExt plus prism xmpNote'''.split())


def proprietes_xmp(xmp):
    """Les proprietes d'un paquet XMP : [(prefixe:nom, valeur)], attributs
    (see:Norme="...") et elements (<dc:title>...<rdf:li>valeur</rdf:li>)."""
    import html
    sortie = []
    pile = []
    for m in re.finditer(r'<(/?)([A-Za-z_][\w.-]*(?::[A-Za-z_][\w.-]*)?)((?:[^>"\']|"[^"]*"|\'[^\']*\')*?)(/?)>|([^<]+)', xmp):
        if len(sortie) > 5000:
            break
        if m.group(5) is not None:
            texte = m.group(5).strip()
            if texte and pile:
                prop = None
                for t in reversed(pile):
                    if ':' in t and t.split(':')[0] not in ('rdf', 'x', 'xml'):
                        prop = t
                        break
                if prop:
                    sortie.append((prop, html.unescape(texte)))
            continue
        ferme, nom, attrs, auto = m.group(1), m.group(2), m.group(3), m.group(4)
        if ferme:
            while pile:
                if pile.pop() == nom:
                    break
            continue
        for a in re.finditer(r'([A-Za-z_][\w.-]*):([A-Za-z_][\w.-]*)\s*=\s*(?:"([^"]*)"|\'([^\']*)\')', attrs):
            if a.group(1) not in ('xmlns', 'rdf', 'x', 'xml'):
                sortie.append((a.group(1) + ':' + a.group(2), html.unescape(a.group(3) if a.group(3) is not None else a.group(4))))
        if not auto:
            pile.append(nom)
    return sortie


class DocumentStandard(object):
    """Un PDF lu par le lecteur ecrit ici (bibliotheque standard seule)."""

    def __init__(self, data, notes, mot_de_passe=''):
        self.notes = notes
        self.lecteur = L = LecteurPDF(data, notes, mot_de_passe)
        r = L.resoudre
        if L.erreur_chiffrement:
            raise ErreurPDF(L.erreur_chiffrement)
        self.catalogue = r(L.trailer.get('Root'))
        if not isinstance(self.catalogue, dict):
            raise ErreurPDF('catalogue illisible')
        self.pages = []
        try:
            self._arbre(r(self.catalogue.get('Pages')), {}, set(), 0)
        except RecursionError:
            notes.ajouter('arbre des pages trop profond')
        if not self.pages:
            # dernier recours : tous les objets /Type /Page, dans l'ordre des numeros
            idx = L._scanner() if L.reconstruit or True else {}
            for num in sorted(L.xref):
                try:
                    o = L.obtenir(num)
                except Exception:
                    continue
                if isinstance(o, dict) and o.get('Type') == 'Page':
                    self._ajouter_page(o, {})
            if self.pages:
                notes.ajouter('arbre des pages illisible : pages retrouvees une a une')
        self.calques = Calques(L, self.catalogue, notes)
        self.machine = Machine(L, notes, self.calques)

    def _arbre(self, noeud, herite, vus, profondeur):
        r = self.lecteur.resoudre
        if not isinstance(noeud, dict) or profondeur > 64 or id(noeud) in vus:
            return
        vus.add(id(noeud))
        h = dict(herite)
        for k in ('Resources', 'MediaBox', 'CropBox', 'Rotate'):
            if k in noeud:
                h[k] = noeud[k]
        enfants = r(noeud.get('Kids'))
        if noeud.get('Type') == 'Page' or (enfants is None and 'Contents' in noeud):
            self._ajouter_page(noeud, h)
            return
        if isinstance(enfants, list):
            for k in enfants:
                self._arbre(r(k), h, vus, profondeur + 1)

    def _ajouter_page(self, dico, h):
        r = self.lecteur.resoudre
        res = r(dico.get('Resources', h.get('Resources')))
        media = boite_pdf(dico.get('MediaBox', h.get('MediaBox')), r) or (0.0, 0.0, 612.0, 792.0)
        crop = boite_pdf(dico.get('CropBox', h.get('CropBox')), r) or media
        crop = (max(crop[0], media[0]), max(crop[1], media[1]), min(crop[2], media[2]), min(crop[3], media[3]))
        if crop[2] <= crop[0] or crop[3] <= crop[1]:
            crop = media
        rot = r(dico.get('Rotate', h.get('Rotate', 0)))
        rot = int(rot) % 360 if isinstance(rot, (int, float)) and not isinstance(rot, bool) else 0
        rot = rot - rot % 90
        unite = r(dico.get('UserUnit'))
        unite = float(unite) if isinstance(unite, (int, float)) and not isinstance(unite, bool) and unite > 0 else 1.0
        self.pages.append({'dico': dico, 'res': res if isinstance(res, dict) else {}, 'media': media,
                           'crop': crop, 'rot': rot, 'unite': unite})

    def geometrie(self, i):
        p = self.pages[i]
        m, W, H = matrice_page(p['crop'], p['rot'], p['unite'])
        return m, W, H, p['rot']

    def lire_page(self, i, echeance=None, limite=None):
        """echeance : l'heure au-dela de laquelle la lecture s'arrete ; limite :
        le nombre de traces au-dela duquel la page s'arrete (ce qui est lu est
        garde, col.arret dit pourquoi)."""
        p = self.pages[i]
        m, W, H, rot = self.geometrie(i)
        col = Collecteur()
        self.machine.echeance = echeance
        self.machine.limite_items = limite
        self.machine.page(p['dico'], p['res'], m, col)
        return col, W, H, rot

    def annotations(self, i):
        """Les annotations d'une page comme elements : leur rectangle, leur
        sorte, et le motif de leur texte (Contents, valeur d'un champ, titre,
        adresse d'un lien). Une annotation sans apparence ou cachee est
        invisible."""
        r = self.lecteur.resoudre
        p = self.pages[i]
        m, W, H, rot = self.geometrie(i)
        sortie = []
        a = r(p['dico'].get('Annots'))
        if not isinstance(a, list):
            return sortie
        for k, x in enumerate(a):
            x = r(x)
            if not isinstance(x, dict):
                continue
            st = str(r(x.get('Subtype')) or '?')
            if st == 'Popup':
                continue
            b = boite_pdf(x.get('Rect'), r)
            if b is None:
                continue
            coins = [appliquer(m, b[0], b[1]), appliquer(m, b[2], b[3])]
            texte = ''
            source = ''
            for cle in ('Contents', 'V', 'TU', 'T', 'RC'):
                v = r(x.get(cle))
                if isinstance(v, bytes) and texte_pdf(v).strip():
                    texte = texte_pdf(v)
                    source = cle
                    break
            act = r(x.get('A'))
            if not texte and isinstance(act, dict):
                v = r(act.get('URI'))
                if isinstance(v, bytes) and v.strip():
                    texte = texte_pdf(v)
                    source = 'URI'
            drapeaux = entier(r(x.get('F')), 0)
            raisons = []
            if drapeaux & 2 or drapeaux & 32:
                raisons.append('cachee')
            ap = r(x.get('AP'))
            if not (isinstance(ap, dict) and ap.get('N') is not None):
                raisons.append('sansapparence')
            sortie.append({'type': 'annotation', 'x1': min(coins[0][0], coins[1][0]), 'y1': min(coins[0][1], coins[1][1]),
                           'x2': max(coins[0][0], coins[1][0]), 'y2': max(coins[0][1], coins[1][1]), 'angle': None,
                           'texte': texte, 'source': source, 'sorte': st, 'raisons': raisons, 'visible': not raisons,
                           'calque': (None, True), 'ordre': 10 ** 9 + k, 'trait': None, 'fond': None, 'chemin': None})
        return sortie

    # -- les renseignements du document ------------------------------------
    def infos(self, clair=False):
        L = self.lecteur
        r = L.resoudre
        d = {'version': L.version, 'pages': len(self.pages)}
        info = r(L.trailer.get('Info'))
        if not isinstance(info, dict):
            info = {}
        prod = texte_pdf(r(info.get('Producer')))
        crea = texte_pdf(r(info.get('Creator')))
        meta = r(self.catalogue.get('Metadata'))
        xmp = ''
        if isinstance(meta, Flux):
            try:
                xmp = L.decoder_flux(meta).decode('utf-8', 'replace')
            except Exception:
                xmp = ''
        if not prod and xmp:
            m = re.search(r'<pdf:Producer>([^<]*)<|pdf:Producer="([^"]*)"', xmp)
            if m:
                prod = m.group(1) or m.group(2) or ''
        if not crea and xmp:
            m = re.search(r'<xmp:CreatorTool>([^<]*)<|xmp:CreatorTool="([^"]*)"', xmp)
            if m:
                crea = m.group(1) or m.group(2) or ''
        d['producer'] = masquer_logiciel(prod, clair)
        d['creator'] = masquer_logiciel(crea, clair)
        for k in ('CreationDate', 'ModDate'):
            v = texte_pdf(r(info.get(k)))
            m = re.search(r'(\d{4})(\d{2})?', v)
            d[k] = (m.group(1) + ('-' + m.group(2) if m.group(2) else '')) if m else ''
        d['personnels'] = {}
        for k in ('Title', 'Author', 'Subject', 'Keywords'):
            v = texte_pdf(r(info.get(k)))
            if v:
                d['personnels'][k] = v if clair else len(v)
        d['xmp'] = bool(xmp)
        # chiffrement
        if L.chiffre is not None:
            p = entier(r(L.enc_dico.get('P')), -1)
            if p >= 2 ** 31:
                p -= 2 ** 32
            d['chiffrement'] = {'methode': L.chiffre.methode, 'impression': bool(p & 4), 'modification': bool(p & 8),
                                'copie': bool(p & 16), 'annotations': bool(p & 32), 'ouvert_par': L.chiffre.ouvert_par}
        else:
            d['chiffrement'] = None
        d['structure'] = {'xref': 'flux xref (PDF 1.5)' if L.flux_xref else 'table xref classique',
                          'flux_objets': L.flux_objets, 'mises_a_jour': L.nb_mises_a_jour,
                          'reconstruit': L.reconstruit, 'pourquoi': list(L.raisons_reconstruction)}
        # annotations et pieces jointes
        annots = {}
        jointes = 0
        for p in self.pages:
            a = r(p['dico'].get('Annots'))
            if isinstance(a, list):
                for x in a:
                    x = r(x)
                    if isinstance(x, dict):
                        st = str(r(x.get('Subtype')) or '?')
                        annots[st] = annots.get(st, 0) + 1
                        if st == 'FileAttachment':
                            jointes += 1
        d['annotations'] = annots
        noms = r(self.catalogue.get('Names'))
        if isinstance(noms, dict):
            ef = r(noms.get('EmbeddedFiles'))
            jointes += self._compter_arbre_noms(ef, 0)
        d['jointes'] = jointes
        out = r(self.catalogue.get('Outlines'))
        d['signets'] = abs(entier(r(out.get('Count')), 0)) if isinstance(out, dict) else 0
        af = r(self.catalogue.get('AcroForm'))
        d['formulaire'] = len(r(af.get('Fields')) or []) if isinstance(af, dict) else 0
        mi = r(self.catalogue.get('MarkInfo'))
        d['balise'] = bool(self.catalogue.get('StructTreeRoot')) or (isinstance(mi, dict) and r(mi.get('Marked')) is True)
        d['calques'] = [(num, nom, vis) for (num, nom, vis) in self.calques.liste]
        return d

    # -- ce qu'un logiciel range dans le PDF sans le dessiner -------------------
    def donnees_non_dessinees(self, formes=()):
        """Les cachettes d'un logiciel de CAO pour des references qui ne se
        dessinent pas : les cles hors norme de /Info, du catalogue et des
        pages, les /PieceInfo (catalogue, pages, formulaires), les proprietes
        XMP (document, pages, formulaires), la structure (StructTreeRoot :
        /Alt, /ActualText, /E, /T, les attributs). Rend des listes BRUTES
        (noms et textes reels) : le rapport les masque."""
        L = self.lecteur
        r = L.resoudre
        sortie = {'entrees': [], 'xmp': [], 'structure': None}
        budget = [20000]

        def valeurs(lieu, chemin, v, prof):
            v = r(v)
            if budget[0] <= 0 or prof > 5:
                return
            budget[0] -= 1
            if isinstance(v, dict):
                for k in sorted(v):
                    if k not in ('Type', 'LastModified'):
                        valeurs(lieu, chemin + [k], v[k], prof + 1)
            elif isinstance(v, list):
                for x in v[:200]:
                    valeurs(lieu, chemin, x, prof + 1)
            elif isinstance(v, Flux):
                sortie['entrees'].append((lieu, chemin, None, 'flux'))
            elif isinstance(v, bytes):
                sortie['entrees'].append((lieu, chemin, texte_pdf(v), 'texte'))
            elif isinstance(v, Nom):
                sortie['entrees'].append((lieu, chemin, str(v), 'nom'))
            elif isinstance(v, (int, float)) and not isinstance(v, bool):
                sortie['entrees'].append((lieu, chemin, ('%g' % v), 'nombre'))
            elif isinstance(v, bool):
                sortie['entrees'].append((lieu, chemin, None, 'booleen'))

        def hors_norme(lieu, d, normes):
            if not isinstance(d, dict):
                return
            for k in sorted(d):
                if k not in normes:
                    valeurs(lieu, [k], d[k], 0)
            pi = r(d.get('PieceInfo'))
            if isinstance(pi, dict):
                valeurs(lieu, ['PieceInfo'], pi, 0)

        def xmp_de(lieu, objet):
            meta = r(objet.get('Metadata')) if isinstance(objet, dict) else None
            if isinstance(meta, Flux):
                try:
                    x = L.decoder_flux(meta)[:2000000].decode('utf-8', 'replace')
                except Exception:
                    return
                for prop, val in proprietes_xmp(x):
                    sortie['xmp'].append((lieu, prop, val))

        info = r(L.trailer.get('Info'))
        hors_norme('/Info', info, _CLES_INFO)
        hors_norme('catalogue', self.catalogue, _CLES_CATALOGUE)
        xmp_de('document', self.catalogue)
        for p in self.pages:
            hors_norme('page', p['dico'], _CLES_PAGE)
            xmp_de('page', p['dico'])
        for num in list(formes)[:5000]:
            f = L.obtenir(num)
            if isinstance(f, Flux):
                pi = r(f.dico.get('PieceInfo'))
                if isinstance(pi, dict):
                    valeurs('formulaire', ['PieceInfo'], pi, 0)
                xmp_de('formulaire', f.dico)
        sortie['structure'] = self._structure()
        return sortie

    def _structure(self):
        """L'arbre de structure (PDF balise) : ses types, les textes qu'il
        porte sans les dessiner (/Alt, /ActualText, /E, /T) et ses attributs."""
        r = self.lecteur.resoudre
        racine = r(self.catalogue.get('StructTreeRoot'))
        if not isinstance(racine, dict):
            return None
        st = {'elements': 0, 'types': {}, 'textes': [], 'attributs': {}, 'roles': set()}
        rm = r(racine.get('RoleMap'))
        if isinstance(rm, dict):
            st['roles'] = set(rm)
        pile = [racine.get('K')]
        vus = set()
        while pile and st['elements'] < 200000:
            k = pile.pop()
            if isinstance(k, list):
                pile.extend(reversed(k[:100000]))
                continue
            if isinstance(k, Ref):
                if k.num in vus:
                    continue
                vus.add(k.num)
            o = r(k)
            if not isinstance(o, dict) or o.get('Type') in ('MCR', 'OBJR'):
                continue
            s_ = r(o.get('S'))
            if s_ is None:
                continue
            st['elements'] += 1
            st['types'][str(s_)] = st['types'].get(str(s_), 0) + 1
            for cle in ('Alt', 'ActualText', 'E', 'T'):
                v = r(o.get(cle))
                if isinstance(v, bytes) and texte_pdf(v).strip() and len(st['textes']) < 100000:
                    st['textes'].append((cle, texte_pdf(v)))
            attrs = r(o.get('A'))
            for a in (attrs if isinstance(attrs, list) else [attrs]):
                a = r(a)
                if not isinstance(a, dict):
                    continue
                proprio = str(r(a.get('O')) or '?')
                for ka in a:
                    if ka == 'O':
                        continue
                    va = r(a[ka])
                    st['attributs'][(proprio, ka)] = st['attributs'].get((proprio, ka), 0) + 1
                    if isinstance(va, bytes) and len(st['textes']) < 100000:
                        st['textes'].append(('A/' + ka, texte_pdf(va)))
                    elif isinstance(va, list):
                        # /UserProperties : [<< /N (nom) /V (valeur) >> ...]
                        for x in va[:1000]:
                            x = r(x)
                            if isinstance(x, dict):
                                for kk in ('N', 'V'):
                                    vv = r(x.get(kk))
                                    if isinstance(vv, bytes) and len(st['textes']) < 100000:
                                        st['textes'].append(('A/%s/%s' % (ka, kk), texte_pdf(vv)))
            pile.append(o.get('K'))
        return st

    def _compter_arbre_noms(self, n, prof, vus=None):
        """Les entrees d'un arbre de noms ; chaque noeud n'est lu qu'une fois
        (un /Kids qui se contient lui-meme ne fait pas boucler)."""
        r = self.lecteur.resoudre
        if vus is None:
            vus = set()
        cle = n.num if isinstance(n, Ref) else id(n)
        if cle in vus or len(vus) > 100000:
            return 0
        vus.add(cle)
        n = r(n)
        if not isinstance(n, dict) or prof > 20:
            return 0
        total = 0
        noms = r(n.get('Names'))
        if isinstance(noms, list):
            total += len(noms) // 2
        kids = r(n.get('Kids'))
        for k in (kids if isinstance(kids, list) else []):
            total += self._compter_arbre_noms(k, prof + 1, vus)
        return total

    def polices(self):
        """[(nom, type, embarquee, encodage, tounicode)] des polices vues."""
        r = self.lecteur.resoudre
        sortie = []
        for p in self.machine.polices.values():
            if p is None:
                continue
            if p.de_secours:
                sortie.append(('Helvetica', 'Type1', False, '(police de secours : celle du texte manque ou est illisible)', False))
                continue
            d = p.dico
            desc = None
            if p.composite:
                desc_l = r(d.get('DescendantFonts'))
                df = r(desc_l[0]) if isinstance(desc_l, list) and desc_l else None
                desc = r(df.get('FontDescriptor')) if isinstance(df, dict) else None
                st = 'Type0/' + str(r(df.get('Subtype')) if isinstance(df, dict) else '?')
            else:
                desc = r(d.get('FontDescriptor'))
                st = p.sous_type
            emb = isinstance(desc, dict) and any(k in desc for k in ('FontFile', 'FontFile2', 'FontFile3'))
            enc = r(d.get('Encoding'))
            if isinstance(enc, dict):
                be = r(enc.get('BaseEncoding'))
                enc = (str(be) + ' + ' if be else '') + 'Differences'
            elif isinstance(enc, Flux):
                enc = 'CMap integree'
            else:
                enc = str(enc) if enc is not None else '(celui de la police)'
            sortie.append((p.nom, st, emb, enc, p.unicode_cmap is not None))
        return sortie


# ===========================================================================
#  13. Le lecteur PyMuPDF (s'il est installe)
# ===========================================================================

def importer_pymupdf():
    try:
        import pymupdf as fitz           # PyMuPDF 1.24 et plus
        return faire_taire(fitz)
    except Exception:
        pass
    try:
        import fitz                      # anciennes versions
        if hasattr(fitz, 'open') and hasattr(fitz, 'Document'):
            return faire_taire(fitz)
    except Exception:
        pass
    return None


class _Muet(object):
    """Un flux ou rien ne s'ecrit."""

    def write(self, _texte):
        return 0

    def flush(self):
        pass


def faire_taire(fitz):
    """MuPDF et PyMuPDF n'ecrivent plus rien a l'ecran : leurs messages
    recopient des noms et des mots lus dans le PDF (« FT_New_Memory_Face(
    ABCDEF+NomDeLaPolice) », « unknown keyword: 'MOT' », le nom d'une
    ressource, d'une CMap, d'un espace de couleur). PyMuPDF les affiche par
    defaut ; un paquet voisin (pymupdf4llm) les coupe a son import, mais on
    ne compte pas sur lui. Rend le module."""
    for f in ('mupdf_display_errors', 'mupdf_display_warnings'):
        try:
            getattr(fitz.TOOLS, f)(False)
        except Exception:
            pass
    for f in ('set_messages', 'set_log'):           # PyMuPDF 1.24 et plus
        try:
            getattr(fitz, f)(stream=_Muet())
        except Exception:
            pass
    return fitz


def oublier_messages(fitz):
    """Vide la reserve des messages de MuPDF avant chaque PDF et chaque page :
    Page.bound() de PyMuPDF en recopie le dernier a l'ecran (sur stderr en
    1.23, meme affichage coupe) quand la page est « infinie » ; il viendrait
    d'une page ou d'un PDF lus avant."""
    try:
        fitz.TOOLS.reset_mupdf_warnings()
    except Exception:
        pass


def version_tuple(v):
    """« 1.23.26 » -> (1, 23, 26) ; (0,) si illisible."""
    try:
        return tuple(int(x) for x in re.findall(r'\d+', str(v))[:3]) or (0,)
    except ValueError:
        return (0,)


def version_pymupdf(fitz):
    for k in ('__version__', 'VersionBind'):
        v = getattr(fitz, k, None)
        if v:
            return str(v)
    try:
        return str(fitz.version[0])
    except Exception:
        return '?'


class DocumentPyMuPDF(object):
    """Un PDF lu par PyMuPDF : la geometrie de chaque page (traces, glyphes,
    images) rendue sous la meme forme que le lecteur standard."""

    def __init__(self, fitz, data, notes, mot_de_passe='', visibles=None):
        """visibles : {numero d'objet d'un calque : visible par defaut}, tel que
        le lecteur standard l'a lu dans /OCProperties /D (PyMuPDF ne le dit pas
        toujours juste) ; a defaut, ce que dit PyMuPDF."""
        self.fitz = fitz
        self.notes = notes
        self.doc = doc = fitz.open(stream=data, filetype='pdf')
        self.ouvert_par = 'vide'
        if getattr(doc, 'needs_pass', False):
            code = doc.authenticate(mot_de_passe) if mot_de_passe else 0
            if not code:
                raise ErreurPDF('protege par un mot de passe a l\'ouverture')
            # des bits (MuPDF) : 1 = aucun mot de passe n'etait demande, 2 = utilisateur, 4 = proprietaire
            self.ouvert_par = 'proprietaire' if code & 4 else ('utilisateur' if code & 2 else 'vide')
        self.nb = doc.page_count
        self.calques = {}       # nom -> (xref, visible)
        try:
            ocgs = doc.get_ocgs() or {}
        except Exception:
            ocgs = {}
        for xref in sorted(ocgs):
            o = ocgs[xref]
            nom = o.get('name', '')
            if nom in self.calques:
                notes.ajouter('deux calques portent le meme nom : PyMuPDF ne les distingue pas')
                continue
            vis = visibles.get(xref, True) if visibles else bool(o.get('on', True))
            self.calques[nom] = (xref, vis)
        if ocgs:
            # tout rendre visible pour relever aussi le contenu des calques masques : la configuration par
            # defaut (/D) est reecrite (tout allume), puis le document relu depuis la memoire
            reussi = False
            try:
                cat = doc.pdf_catalog()
                doc.xref_set_key(cat, 'OCProperties/D/OFF', '[]')
                doc.xref_set_key(cat, 'OCProperties/D/BaseState', '/ON')
                doc.xref_set_key(cat, 'OCProperties/D/AS', 'null')
                doc2 = fitz.open(stream=doc.tobytes(), filetype='pdf')
                if getattr(doc2, 'needs_pass', False):
                    doc2.authenticate(mot_de_passe or '')
                if doc2.page_count == self.nb:
                    self.doc = doc = doc2
                    reussi = True
            except Exception:
                reussi = False
            if not reussi:
                try:
                    for c in doc.layer_ui_configs():
                        if not c.get('on'):
                            doc.set_layer_ui_config(c['number'], 0)
                    reussi = True
                except Exception:
                    reussi = False
            if not reussi and not all(v for (_, v) in self.calques.values()):
                notes.ajouter('PyMuPDF : les calques masques n\'ont pas pu etre rendus visibles (leur contenu manque)')

    def _calque(self, nom):
        if not nom:
            return (None, True)
        c = self.calques.get(nom)
        if c is None:
            return (None, True)
        return (c[0], c[1])

    def geometrie(self, page):
        """Le passage des coordonnees de PyMuPDF (page non tournee, y vers le
        bas, origine en haut a gauche de la boite qu'a prise MuPDF) a la page
        vue de la sonde. La page vue est CropBox ∩ MediaBox, comme le veut la
        norme et comme le lecteur standard la prend ; or MuPDF avant 1.24 part
        de la CropBox brute, et PyMuPDF calcule sa rotation_matrix sur la
        CropBox brute (faux de 35 a 3 335 mm quand la CropBox deborde). On
        reconstruit donc les deux boites (page.mediabox est en coordonnees PDF,
        page.cropbox en coordonnees MuPDF : y compte depuis le haut de la
        MediaBox), on reconnait celle qu'a prise MuPDF a ses dimensions, et on
        applique la meme rotation que le lecteur standard."""
        rot = int(page.rotation or 0) % 360
        rot = rot - rot % 90
        try:
            mb, cb, rect = page.mediabox, page.cropbox, page.rect
            media = (float(mb.x0), float(mb.y0), float(mb.x1), float(mb.y1))
            brut = (float(cb.x0), media[3] - float(cb.y1), float(cb.x1), media[3] - float(cb.y0))
            vue = intersection(media, brut)
            if vue[2] <= vue[0] or vue[3] <= vue[1]:
                vue = media
            rw, rh = float(rect.width), float(rect.height)
            if rot in (90, 270):
                rw, rh = rh, rw
            base, s = None, 1.0
            for cand in (vue, brut, media):
                cw, ch = cand[2] - cand[0], cand[3] - cand[1]
                if cw > 0 and ch > 0 and abs(rh - ch * rw / cw) <= 0.5 + 0.001 * rh:
                    base, s = cand, rw / cw
                    break
            if base is None:
                raise ValueError('boites')
            m_vue, W, H = matrice_page(vue, rot, s)
            return mul((1.0 / s, 0.0, 0.0, -1.0 / s, base[0], base[3]), m_vue), W, H, rot
        except Exception:
            # tres vieux PyMuPDF : sa propre matrice de rotation
            try:
                rm = page.rotation_matrix
                m = (rm.a, rm.b, rm.c, rm.d, rm.e, rm.f)
            except Exception:
                m = IDENTITE
            return m, page.rect.width, page.rect.height, rot

    def lire_page(self, i, en_ligne=None):
        """en_ligne : les boites (points, page vue) des images en ligne (BI...EI)
        que le lecteur standard a vues ; PyMuPDF leur donne xref 0, comme aux
        rendus de degrades et de masques doux, qu'elles permettent d'ecarter."""
        page = self.doc[i]
        oublier_messages(self.fitz)       # page.rect recopierait le dernier message d'une page « infinie »
        m, W, H, rot = self.geometrie(page)

        def T(p):
            return appliquer(m, p[0], p[1])

        col = Collecteur()
        # les traces
        try:
            dessins = page.get_drawings()
        except Exception as e:
            dessins = []
            self.notes.ajouter('PyMuPDF : get_drawings a echoue (%s)' % raison(e))
        for d in dessins:
            genre = d.get('type')
            if genre not in ('f', 's', 'fs'):
                continue
            items = []
            for it in d.get('items', []):
                k = it[0]
                if k == 'l':
                    items.append(('l', T(it[1]), T(it[2])))
                elif k == 'c':
                    items.append(('c', T(it[1]), T(it[2]), T(it[3]), T(it[4])))
                elif k == 're':
                    rc = it[1]
                    a, b = T((rc.x0, rc.y0)), T((rc.x1, rc.y1))
                    items.append(('re', min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])))
                elif k == 'qu':
                    q = it[1]
                    ul, ur, ll, lr = T(q.ul), T(q.ur), T(q.ll), T(q.lr)
                    items.append(('l', ul, ll))
                    items.append(('l', ll, lr))
                    items.append(('l', lr, ur))
                    items.append(('l', ur, ul))
            if d.get('closePath'):
                # PyMuPDF avant 1.24 ne donne pas le trait de fermeture (h) : il le dit par closePath ; on le
                # remet au bout de chaque chaine ouverte (comme le lecteur standard le trace)
                fermes = []
                debut = None
                for k2, it in enumerate(items):
                    if it[0] == 're':
                        fermes.append(it)
                        debut = None
                        continue
                    if debut is None or (fermes and fermes[-1][0] != 're' and fermes[-1][-1] != it[1]):
                        if debut is not None and fermes[-1][-1] != debut:
                            fermes.append(('l', fermes[-1][-1], debut))
                        debut = it[1]
                    fermes.append(it)
                if debut is not None and fermes and fermes[-1][0] != 're' and fermes[-1][-1] != debut:
                    fermes.append(('l', fermes[-1][-1], debut))
                items = fermes
            trait = couleur_mu(d.get('color')) if genre in ('s', 'fs') else None
            fond = couleur_mu(d.get('fill')) if genre in ('f', 'fs') else None
            if genre in ('s', 'fs') and trait is None:
                trait = 'motif'
            if genre in ('f', 'fs') and fond is None:
                fond = 'motif'
            tir = d.get('dashes')
            tirets = bool(tir) and not re.match(r'^\[\s*\]', str(tir))
            col.chemin(items, trait, fond, nombre_mu(d.get('width'), 0.0), nombre_mu(d.get('stroke_opacity'), 1.0),
                       nombre_mu(d.get('fill_opacity'), 1.0), self._calque(d.get('layer')), tirets, d.get('seqno'))
        # les glyphes
        try:
            spans = page.get_texttrace()
        except Exception as e:
            spans = []
            self.notes.ajouter('PyMuPDF : get_texttrace a echoue (%s)' % raison(e))
        prec = None
        for s in spans:
            t = s.get('type', 0)
            mode = {0: 'rempli', 1: 'trait', 2: 'rempli', 3: 'invisible'}.get(t, 'rempli')
            # un texte rempli puis trace (Tr 2) arrive deux fois : un seul
            cle = tuple((c[0], round(c[2][0], 3), round(c[2][1], 3)) for c in s.get('chars', ()))
            if t == 1 and prec is not None and prec[0] == cle:
                continue
            prec = (cle, t)
            sx, sy = s.get('dir', (1, 0))
            dx, dy = m[0] * sx + m[2] * sy, m[1] * sx + m[3] * sy
            nd = math.hypot(dx, dy) or 1.0
            ux, uy = dx / nd, dy / nd
            taille = nombre_mu(s.get('size'), 0.0)
            couleur = couleur_mu(s.get('color'))
            if couleur is None:
                couleur = (0.0, 0.0, 0.0)
            alpha = nombre_mu(s.get('opacity'), 1.0)
            police = s.get('font', '') or ''
            calque = self._calque(s.get('layer'))
            attente = None             # le glyphe en cours : un glyphe a plusieurs caracteres (ligature
            for c in s.get('chars', ()):   # « fi ») arrive en plusieurs « chars », les suivants sans glyphe (gid < 0)
                ucs, gid, origine, bb = c[0], c[1], c[2], c[3]
                try:
                    u = chr(ucs) if ucs >= 32 and ucs != 0xFFFD else INCONNU
                except (ValueError, OverflowError, TypeError):
                    u = INCONNU
                if gid is not None and gid < 0 and attente is not None:
                    attente = (attente[0] + u,) + attente[1:]
                    continue
                if attente is not None:
                    col.glyphe(attente, s.get('seqno'))
                largeur_bb = bb[2] - bb[0]
                hauteur_bb = bb[3] - bb[1]
                acx, acy = abs(sx), abs(sy)
                if acx >= acy:
                    avance = (largeur_bb - taille * acy) / acx if acx > 1e-9 else 0.0
                else:
                    avance = (hauteur_bb - taille * acx) / acy
                o = T(origine)
                attente = (u, o[0], o[1], ux, uy, taille, max(0.0, avance), police, mode, couleur, alpha, calque)
            if attente is not None:
                col.glyphe(attente, s.get('seqno'))
        # les images
        try:
            imgs = page.get_image_info(xrefs=True)
        except Exception as e:
            imgs = []
            self.notes.ajouter('PyMuPDF : get_image_info a echoue (%s)' % raison(e))
        for im in imgs:
            bb = im.get('bbox')
            # MuPDF rend un degrade (sh, motif de degrade) en « image » sans objet (xref 0), a 72 points par
            # pouce et sans masque : on le compte comme un degrade, comme le lecteur standard
            if bb is not None and not im.get('xref') and not im.get('has-mask'):
                if en_ligne is not None:
                    bv = [T((bb[0], bb[1])), T((bb[2], bb[3]))]
                    bx0, bx1 = min(bv[0][0], bv[1][0]), max(bv[0][0], bv[1][0])
                    by0, by1 = min(bv[0][1], bv[1][1]), max(bv[0][1], bv[1][1])
                    vraie = any(abs(bx0 - e[0]) <= 1 and abs(by0 - e[1]) <= 1 and abs(bx1 - e[2]) <= 1 and abs(by1 - e[3]) <= 1
                                for e in en_ligne)
                    if not vraie:
                        col.nb_degrades += 1
                        continue
                elif abs(im.get('width', 0) - (bb[2] - bb[0])) <= 1.5 and abs(im.get('height', 0) - (bb[3] - bb[1])) <= 1.5:
                    col.nb_degrades += 1
                    continue
            tr = im.get('transform')
            if tr is not None and len(tr) == 6:
                mt = tuple(tr)
                coins = [T(appliquer(mt, 0, 0)), T(appliquer(mt, 1, 0)), T(appliquer(mt, 1, 1)), T(appliquer(mt, 0, 1))]
                # PyMuPDF : l'image va de (0,1) en haut a gauche ; on garde l'ordre des coins du PDF
                coins = [coins[3], coins[2], coins[1], coins[0]]
            else:
                bb = im.get('bbox')
                coins = [T((bb[0], bb[3])), T((bb[2], bb[3])), T((bb[2], bb[1])), T((bb[0], bb[1]))]
            # l'espace de couleur : sa seule famille (« ICCBased(RGB,<description du profil>) » ou
            # « Separation(RGB,<nom de l'encre>) » porteraient un nom lu dans le PDF)
            mf = re.match(r'[A-Za-z]+', im.get('cs-name', '') or '')
            info = {'filtre': '', 'espace': famille_espace(mf.group(0) if mf else ''),
                    'bits': entier(im.get('bpc'), 0), 'masque': False, 'sans_rang': True}
            col.image(coins, entier(im.get('width'), 0), entier(im.get('height'), 0), info, (None, True))
        return col, W, H, rot


def nombre_mu(v, defaut):
    """Un nombre rendu par PyMuPDF (selon les versions : None, un nombre, une liste)."""
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return float(v)
    return defaut


def couleur_mu(c):
    """Une couleur rendue par PyMuPDF en (r, g, b) : selon les versions, une
    liste de composantes (gris, RGB, CMYK), un nombre de 0 a 1 (gris) ou un
    entier sRGB (0xRRGGBB) ; None si absente."""
    if c is None:
        return None
    if isinstance(c, (int, float)) and not isinstance(c, bool):
        if 0 <= c <= 1:
            return (float(c),) * 3
        v = int(c)
        return (((v >> 16) & 255) / 255.0, ((v >> 8) & 255) / 255.0, (v & 255) / 255.0)
    try:
        t = tuple(float(x) for x in c)
    except (TypeError, ValueError):
        return None
    if len(t) == 1:
        return t * 3
    if len(t) == 4:
        return cmyk_rgb(*t)
    if len(t) >= 3:
        return t[:3]
    return None


# ===========================================================================
#  14. L'analyse d'un PDF : pages, elements, verdict
# ===========================================================================

FORMATS = (('A0', 841, 1189), ('A1', 594, 841), ('A2', 420, 594), ('A3', 297, 420), ('A4', 210, 297),
           ('A5', 148, 210), ('Letter', 216, 279), ('Legal', 216, 356), ('Tabloid', 279, 432),
           ('ANSI C', 432, 559), ('ANSI D', 559, 864), ('ANSI E', 864, 1118), ('B4', 250, 353),
           ('B3', 353, 500))


def nom_format(l_mm, h_mm):
    a, b = sorted((l_mm, h_mm))
    for nom, x, y in FORMATS:
        if abs(a - x) <= 3 and abs(b - y) <= 3:
            return nom
    return 'hors format'


def analyser_page(col, W, H):
    """Les elements d'une page, leur visibilite et leurs comptes."""
    stats = {'points': 0}
    els = elements_des_chemins(col, stats)
    els += elements_des_glyphes(col.glyphes)
    els += elements_des_images(col)
    els.sort(key=lambda e: e['ordre'])
    juger_visibilite(els, W, H)
    stats['degrades'] = col.nb_degrades
    stats['motifs'] = col.nb_motifs
    stats['usages'] = dict(col.usages)
    return els, stats


PETIT_TRAIT = 10 / MM      # pt : un trait plus court peut etre un morceau de caractere (texte dessine en traits)
ECART_AMAS = 2.0 / MM      # pt : deux petits traits plus eloignes ne sont pas du meme amas
GRAND_TRAIT = 30 / MM      # pt : un trait plus court peut etre le jambage d'une grande lettre (titre, logo, cartouche)
CONTACT = 0.3 / MM         # pt : deux traits plus proches se touchent


def _longueurs_alignees(segs):
    """La longueur de chaque segment comptee avec ceux qui le prolongent
    bout a bout dans le meme sens (un fil coupe a chaque piquage, ou trace
    en morceaux, garde sa longueur : ce n'est pas un petit trait)."""
    n = len(segs)
    parent = list(range(n))

    def racine(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    q = 0.05                                   # pt : la tolerance d'un bout commun
    bouts = {}
    for k, e in enumerate(segs):
        bouts.setdefault((int(round(e['x1'] / q)), int(round(e['y1'] / q))), []).append((k, 0))
        bouts.setdefault((int(round(e['x2'] / q)), int(round(e['y2'] / q))), []).append((k, 1))
    for liste in bouts.values():
        if len(liste) < 2 or len(liste) > 16:
            continue
        for a in range(len(liste)):
            for b in range(a + 1, len(liste)):
                (ka, ca), (kb, cb) = liste[a], liste[b]
                if ka == kb:
                    continue
                ea, eb = segs[ka], segs[kb]
                # les directions vues depuis le bout commun : opposees (l'un prolonge l'autre)
                va = (ea['x2'] - ea['x1'], ea['y2'] - ea['y1']) if ca == 0 else (ea['x1'] - ea['x2'], ea['y1'] - ea['y2'])
                vb = (eb['x2'] - eb['x1'], eb['y2'] - eb['y1']) if cb == 0 else (eb['x1'] - eb['x2'], eb['y1'] - eb['y2'])
                la, lb = math.hypot(*va), math.hypot(*vb)
                if la <= 0 or lb <= 0:
                    continue
                if (va[0] * vb[0] + va[1] * vb[1]) / (la * lb) < -0.99996:      # 0,5 degre
                    ra, rb = racine(ka), racine(kb)
                    if ra != rb:
                        parent[ra] = rb
    groupes = {}
    for k in range(n):
        groupes.setdefault(racine(k), []).append(k)
    longueur = [0.0] * n
    for membres in groupes.values():
        e0 = segs[membres[0]]
        dx, dy = e0['x2'] - e0['x1'], e0['y2'] - e0['y1']
        l0 = math.hypot(dx, dy) or 1.0
        ux, uy = dx / l0, dy / l0
        ts = []
        for k in membres:
            e = segs[k]
            ts.append(e['x1'] * ux + e['y1'] * uy)
            ts.append(e['x2'] * ux + e['y2'] * uy)
        L = max(ts) - min(ts)
        for k in membres:
            longueur[k] = L
    return longueur


def _morceaux(e):
    """Les morceaux droits d'un trait, pour mesurer un contact : le segment,
    les quatre cotes d'un rectangle (pas sa surface), un cercle en polygone,
    une courbe en ligne brisee (un morceau tous les 2 mm environ)."""
    t = e['type']
    if t == 'segment':
        return [(e['x1'], e['y1'], e['x2'], e['y2'])]
    if t == 'rectangle':
        x0, y0, x1, y1 = e['x1'], e['y1'], e['x2'], e['y2']
        return [(x0, y0, x1, y0), (x1, y0, x1, y1), (x1, y1, x0, y1), (x0, y1, x0, y0)]
    if t == 'cercle':
        cx, cy = (e['x1'] + e['x2']) / 2, (e['y1'] + e['y2']) / 2
        r = (e['x2'] - e['x1'] + e['y2'] - e['y1']) / 4
        nb = int(min(360, max(24, 2 * math.pi * r / (2 / MM))))
        pts = [(cx + r * math.cos(2 * math.pi * k / nb), cy + r * math.sin(2 * math.pi * k / nb)) for k in range(nb + 1)]
    else:
        p0, p3 = (e['x1'], e['y1']), (e['x2'], e['y2'])
        p1, p2 = e['ctrl']
        approche = math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + math.hypot(p2[0] - p1[0], p2[1] - p1[1]) + \
            math.hypot(p3[0] - p2[0], p3[1] - p2[1])
        nb = int(min(128, max(8, approche / (2 / MM))))
        pts = [_bezier(p0, p1, p2, p3, k / float(nb)) for k in range(nb + 1)]
    return [(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]) for k in range(len(pts) - 1)]


def _distance_point(px, py, m):
    ax, ay, bx, by = m
    dx, dy = bx - ax, by - ay
    l2 = dx * dx + dy * dy
    t = 0.0 if l2 <= 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / l2))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)


def _distance_morceaux(a, b):
    """La plus courte distance entre deux morceaux droits (0 s'ils se croisent)."""
    def cote(m, px, py):
        return (m[2] - m[0]) * (py - m[1]) - (m[3] - m[1]) * (px - m[0])
    if cote(b, a[0], a[1]) * cote(b, a[2], a[3]) < 0 and cote(a, b[0], b[1]) * cote(a, b[2], b[3]) < 0:
        return 0.0
    return min(_distance_point(a[0], a[1], b), _distance_point(a[2], a[3], b),
               _distance_point(b[0], b[1], a), _distance_point(b[2], b[3], a))


def _touchent_un_long(groupes, els, longs):
    """Les rangs des groupes (listes de rangs d'elements) dont un trait touche
    (a CONTACT pres, par la vraie distance entre les traits et non par leurs
    boites : la boite du cadre de la page contient tout) un des traits longs."""
    g = Grille(case=5.0 / MM)
    zone = None
    for r, idx in enumerate(groupes):
        for k in idx:
            for m in _morceaux(els[k]):
                b = (min(m[0], m[2]) - CONTACT, min(m[1], m[3]) - CONTACT, max(m[0], m[2]) + CONTACT, max(m[1], m[3]) + CONTACT)
                g.ajouter(b, (r, m))
                zone = b if zone is None else (min(zone[0], b[0]), min(zone[1], b[1]), max(zone[2], b[2]), max(zone[3], b[3]))
    touches = set()
    if zone is None:
        return touches
    for k in longs:
        for m in _morceaux(els[k]):
            b = intersection((min(m[0], m[2]), min(m[1], m[3]), max(m[0], m[2]), max(m[1], m[3])), zone)
            if b[0] > b[2] or b[1] > b[3]:
                continue
            i0, j0, i1, j1 = g.plage(b)
            if (i1 - i0 + 1) * (j1 - j0 + 1) <= len(g.cases):
                cles = [(i, j) for i in range(i0, i1 + 1) for j in range(j0, j1 + 1)]
            else:
                # un trait long en biais : sa boite couvre plus de cases qu'il n'y en a de remplies
                cles = [c for c in g.cases if i0 <= c[0] <= i1 and j0 <= c[1] <= j1]
            for cle in cles:
                for (r, m2) in g.cases.get(cle, ()):
                    if r not in touches and _distance_morceaux(m, m2) <= CONTACT:
                        touches.add(r)
            if len(touches) == len(groupes):
                return touches
    return touches


def _comme_un_trait(e, b):
    """Un trait d'ecriture : un segment, une courbe, ou un rectangle mince (un
    trait de lettre rempli, quatre fois plus long que large au moins). Un
    rectangle plus trapu ou un cercle est plutot un dessin (une boite, une
    borne), sauf dans un texte en traits (un 0 en rectangle barre)."""
    if e['type'] in ('segment', 'courbe'):
        return True
    return e['type'] == 'rectangle' and min(b[2] - b[0], b[3] - b[1]) <= 0.25 * max(b[2] - b[0], b[3] - b[1])


def _mots(groupes, cands):
    """La troisieme passe : les lettres d'un meme mot (des amas de meme
    hauteur, a 20 % pres, alignes en haut et en bas a 10 % de la hauteur
    pres, separes de moins de 0,6 fois leur hauteur) sont reunies. Une police
    SHX espace ses lettres d'un tiers de leur hauteur : au-dela de 6 mm de
    haut, chaque lettre ferait sinon son propre amas. Rend les groupes."""
    boites = []
    for membres in groupes:
        bs = [cands[c][1] for c in membres]
        boites.append((min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs)))
    parent = list(range(len(groupes)))

    def racine(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    g = Grille(case=10.0 / MM)
    for r, b in enumerate(boites):
        if 0 < b[3] - b[1] <= GRAND_TRAIT:
            g.ajouter(b, r)
    for r, b in enumerate(boites):
        h = b[3] - b[1]
        if not 0 < h <= GRAND_TRAIT:
            continue
        for q in g.dans(b, 0.75 * h):
            if q <= r:
                continue
            bq = boites[q]
            hq = bq[3] - bq[1]
            hm = max(h, hq)
            if abs(h - hq) > 0.2 * hm or abs(b[1] - bq[1]) > 0.1 * hm or abs(b[3] - bq[3]) > 0.1 * hm:
                continue
            if max(0.0, bq[0] - b[2], b[0] - bq[2]) <= 0.6 * hm:
                ra, rb = racine(r), racine(q)
                if ra != rb:
                    parent[ra] = rb
    unis = {}
    for r, membres in enumerate(groupes):
        unis.setdefault(racine(r), []).extend(membres)
    return list(unis.values())


def amas_de_petits_traits(els, W, H):
    """Les amas de petits traits : segments, courbes, rectangles et cercles de
    moins de 10 mm (un segment prolonge bout a bout dans le meme sens compte
    pour sa longueur totale), a moins de 0,6 fois la taille du plus grand des
    deux l'un de l'autre (2 mm au plus). Un texte dessine en traits (police
    SHX d'AutoCAD, police « baton » de CATIA, texte vectorise en contours) en
    est fait, des symboles aussi. Une seconde passe reprend de meme les traits
    de 30 mm au plus : un groupe qui en contient un de plus de 10 mm devient
    un amas (a la place des amas de la premiere passe qu'il contient) s'il
    n'a pas plus de 30 mm de haut ou de large, s'il ne touche aucun trait
    plus long, et s'il n'est pas un symbole qui porte son repere (un dessin
    de rectangles ou de cercles, plus d'un sur cinq hors _comme_un_trait,
    avec un texte reel a moins de 2 mm) : une grande lettre de cartouche, un
    logo, un titre ; un symbole raccorde a un fil, ou qui porte son repere,
    reste de la geometrie. Une troisieme passe reunit les lettres d'un mot
    (_mots). Le TSV anonymise n'ecrit pas ces traits un par un (on y relirait
    le texte) : un amas y est une seule ligne. Rend la liste des amas (au
    moins deux elements) ; chaque element d'un amas porte e['amas'] = son
    rang (1...). Les grilles n'ont pas de bornes : un cartouche hors de la
    page vue (une page recadree) se regroupe aussi."""
    segs = [e for e in els if e['type'] == 'segment']
    longueurs = _longueurs_alignees(segs)
    taille = {}
    for e, L in zip(segs, longueurs):
        taille[id(e)] = L
    cands = []
    longs = []
    for k, e in enumerate(els):
        t = e['type']
        if t not in ('segment', 'courbe', 'rectangle', 'cercle'):
            continue
        b = e.get('boite') or boite(e)
        s = taille[id(e)] if t == 'segment' else max(b[2] - b[0], b[3] - b[1])
        if s <= GRAND_TRAIT:
            cands.append((k, b, s))
        else:
            longs.append(k)
    n = len(cands)
    if n < 2:
        return []
    parent = list(range(n))

    def racine(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    # deux grilles : fine pour les petits traits, plus large pour les grands (moins de cases par trait)
    fine, large = Grille(case=2.0 / MM), Grille(case=10.0 / MM)
    premiers = {}
    uniques = []
    for c in range(n):
        k, b, s = cands[c]
        cle = (els[k]['type'],) + tuple(round(v, 2) for v in b)
        if cle in premiers:
            # le meme trait empile a l'identique : du meme amas que le premier, sans passer par la grille
            parent[c] = premiers[cle]
            continue
        premiers[cle] = c
        uniques.append(c)
        (fine if s <= PETIT_TRAIT else large).ajouter(b, c)
    tol = 0.05

    def relier(c):
        k, b, s = cands[c]
        # l'ecart admis entre deux traits depend du plus grand des deux : chaque paire est trouvee depuis
        # le plus grand, qui cherche dans son voisinage (0,6 fois sa taille) ; un petit trait cherche donc pres
        ecart = min(0.6 * s, ECART_AMAS) + tol
        rc = racine(c)
        for grille in ((fine,) if s <= PETIT_TRAIT else (fine, large)):
            cases = grille.cases
            i0, j0, i1, j1 = grille.plage(b, ecart)
            for i in range(i0, i1 + 1):
                for j in range(j0, j1 + 1):
                    for d in cases.get((i, j), ()):
                        if d == c:
                            continue
                        k2, b2, s2 = cands[d]
                        if s2 > s:
                            continue                 # le plus grand des deux la trouvera
                        dx = max(0.0, b2[0] - b[2], b[0] - b2[2])
                        if dx > ecart:
                            continue
                        dy = max(0.0, b2[1] - b[3], b[1] - b2[3])
                        if dy <= ecart and dx * dx + dy * dy <= ecart * ecart:
                            rd = racine(d)
                            if rd != rc:
                                parent[rd] = rc
    # premiere passe : les petits traits seuls ; on garde ses groupes avant la seconde
    for c in uniques:
        if cands[c][2] <= PETIT_TRAIT:
            relier(c)
    premiere = [racine(c) for c in range(n)]
    for c in uniques:
        if cands[c][2] > PETIT_TRAIT:
            relier(c)
    groupes = {}
    for c in range(n):
        groupes.setdefault(racine(c), []).append(c)
    retenus = []
    grands = []
    grille_textes = []

    def porte_un_texte(bx):
        """Un texte (reel) a moins de 2 mm de la boite : le repere d'un symbole."""
        if not grille_textes:
            g = Grille(W, H)
            for e in els:
                if e['type'] == 'texte':
                    bt = boite(e)
                    g.ajouter(bt, bt)
            grille_textes.append(g)
        return any(touche(bt, bx, ECART_AMAS) for bt in grille_textes[0].dans(bx, ECART_AMAS))

    def premiere_passe(membres):
        sous = {}
        for c in membres:
            if cands[c][2] <= PETIT_TRAIT:
                sous.setdefault(premiere[c], []).append(c)
        retenus.extend(m for m in sous.values() if len(m) >= 2)
    for membres in groupes.values():
        if all(cands[c][2] <= PETIT_TRAIT for c in membres):
            if len(membres) >= 2:
                retenus.append(membres)
            continue
        bs = [cands[c][1] for c in membres]
        bx = (min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs))
        dessin = sum(1 for c in membres if _comme_un_trait(els[cands[c][0]], cands[c][1])) < 0.8 * len(membres)
        if len(membres) >= 2 and min(bx[2] - bx[0], bx[3] - bx[1]) <= GRAND_TRAIT and not (dessin and porte_un_texte(bx)):
            grands.append(membres)
        else:
            premiere_passe(membres)
    touches = _touchent_un_long([[cands[c][0] for c in m] for m in grands], els, longs) if grands else set()
    for r, membres in enumerate(grands):
        if r in touches:
            premiere_passe(membres)
        else:
            retenus.append(membres)
    amas = []
    for membres in sorted(_mots(retenus, cands), key=lambda m: min(cands[c][0] for c in m)):
        idx = sorted(cands[c][0] for c in membres)
        bs = [cands[c][1] for c in membres]
        x0, y0 = min(b[0] for b in bs), min(b[1] for b in bs)
        x1, y1 = max(b[2] for b in bs), max(b[3] for b in bs)
        types = {}
        for k in idx:
            types[els[k]['type']] = types.get(els[k]['type'], 0) + 1
        plus_grand = max(cands[c][2] for c in membres)
        larg, haut = x1 - x0, y1 - y0
        petit, grand = min(larg, haut), max(larg, haut)
        traits = types.get('segment', 0) + types.get('courbe', 0)
        a = {'rang': len(amas) + 1, 'membres': idx, 'n': len(idx), 'boite': (x0, y0, x1, y1), 'types': types,
             'texte_probable': len(idx) >= 4 and traits >= 0.8 * len(idx)
             and 1 / MM <= petit <= max(12 / MM, 1.2 * plus_grand) and grand >= 1.5 * petit}
        for k in idx:
            els[k]['amas'] = a['rang']
        amas.append(a)
    return amas


def ligne_amas(num_page, n, a, els, index_calques):
    """La ligne du TSV d'un amas (releve anonymise) : sa boite, l'ordre de
    grandeur de son nombre de traits, l'epaisseur et la couleur les plus
    frequentes. Ni la place des traits, ni leur nombre par sorte, ni leur
    taille, ni le formulaire d'ou ils viennent : pour un amas d'une lettre,
    ce serait sa signature (on relirait le texte avec l'alphabet de la
    police, ou par la frequence des formulaires)."""
    membres = [els[k] for k in a['membres']]

    def plus_frequent(valeurs):
        h = {}
        for v in valeurs:
            h[v] = h.get(v, 0) + 1
        return max(sorted(h.items(), key=lambda x: str(x[0])), key=lambda x: x[1])[0] if h else ''
    ep = plus_frequent([fmt(e['ep'] * MM, 3) for e in membres if e.get('ep') is not None])
    coul = plus_frequent([hexa(e.get('trait')) for e in membres if e.get('trait') is not None])
    fond = plus_frequent([hexa(e.get('fond')) for e in membres if e.get('fond') is not None])
    vis = [e for e in membres if e['visible']]
    raisons = sorted(set(r_ for e in membres for r_ in e['raisons'])) if not vis else []
    cal = set(nom_calque(e.get('calque'), index_calques) for e in membres)
    x0, y0, x1, y1 = a['boite']
    w_, h_ = x1 - x0, y1 - y0
    if a['n'] < 10:
        # un petit amas (une lettre, un chiffre, un petit symbole) plus haut que large : sa largeur portee a
        # 0,6 fois sa hauteur (un 1 ou un I, etroits, ne se distinguent pas d'une autre lettre) ; ni drapeau
        # « texte ». Seulement debout : elargir aussi les amas couches deformerait trois fois plus de symboles
        if w_ < 0.6 * h_:
            x0, x1 = (x0 + x1 - 0.6 * h_) / 2, (x0 + x1 + 0.6 * h_) / 2
        details = 'moins de 10 traits'
    else:
        details = ('10 a 50 traits' if a['n'] <= 50 else 'plus de 50 traits') + (
            ', peut-etre du texte dessine en traits' if a['texte_probable'] else '')
    champs = [str(num_page), str(n), 'amas', fmt(x0 * MM), fmt(y0 * MM), fmt(x1 * MM), fmt(y1 * MM), '', ep, '',
              coul, fond, 'O' if vis else 'N', ','.join(raisons), cal.pop() if len(cal) == 1 else '', '',
              '', '', '', details]
    return champs


def comptes_page(els, W, H):
    c = {'textes_vis': 0, 'textes_invis': 0, 'raisons': {}, 'seg': 0, 'H': 0, 'V': 0, 'O': 0,
         'rect': 0, 'courbe': 0, 'cercle': 0, 'image': 0, 'couverture': 0.0, 'images': [],
         'vect_vis': 0, 'invisibles': 0}
    aire = max(W * H, 1e-9)
    for e in els:
        t = e['type']
        if not e['visible']:
            c['invisibles'] += 1
            for r_ in e['raisons']:
                cle = (t, r_)
                c['raisons'][cle] = c['raisons'].get(cle, 0) + 1
        if t == 'texte':
            if e['visible']:
                c['textes_vis'] += 1
            else:
                c['textes_invis'] += 1
        elif t == 'segment':
            c['seg'] += 1
            c[orientation_segment(e['angle'])] += 1
        elif t == 'rectangle':
            c['rect'] += 1
        elif t == 'courbe':
            c['courbe'] += 1
        elif t == 'cercle':
            c['cercle'] += 1
        elif t == 'image':
            c['image'] += 1
            b = e['boite']
            ix = max(0.0, min(b[2], W) - max(b[0], 0.0))
            iy = max(0.0, min(b[3], H) - max(b[1], 0.0))
            part = ix * iy / aire
            if not e['info'].get('motif'):
                # une image dans un motif (un quadrillage, une trame) n'est pas un scan de la page
                c['couverture'] = max(c['couverture'], part)
            else:
                c['images_motif'] = c.get('images_motif', 0) + 1
            c['images'].append((e, part))
        if t in ('segment', 'rectangle', 'courbe', 'cercle') and e['visible']:
            c['vect_vis'] += 1
    return c


def verdict_page(c):
    v, pq = _verdict_page(c)
    n = c.get('amas_texte', 0)
    if n >= 5 and v != 'vectoriel sans texte':
        pq += u' ; et %d groupe(s) de petits traits (%d traits) qui peuvent etre du texte dessine en traits (ou des symboles)' % (
            n, c.get('traits_amas_texte', 0))
    elif n:
        pq += u' ; %d groupe(s) de petits traits (%d traits) ressemblent a du texte dessine en traits' % (
            n, c.get('traits_amas_texte', 0))
    return v, pq


def _verdict_page(c):
    grande_image = c['couverture'] >= 0.5
    if grande_image:
        if c['textes_vis'] == 0 and c['vect_vis'] < 20:
            if c['textes_invis'] > 0:
                return 'mixte', 'une image couvre %d %% de la page, avec %d textes invisibles par-dessus (un scan passe a l\'OCR)' % (
                    round(c['couverture'] * 100), c['textes_invis'])
            return 'scanne (image seule)', 'une image couvre %d %% de la page, aucun texte visible, %d traits' % (
                round(c['couverture'] * 100), c['vect_vis'])
        return 'mixte', 'une image couvre %d %% de la page, et il y a aussi %d textes visibles et %d traits' % (
            round(c['couverture'] * 100), c['textes_vis'], c['vect_vis'])
    if c['textes_vis'] > 0:
        if c['vect_vis'] > 0:
            return 'vectoriel avec texte', '%d textes visibles et %d traits, aucune image ne couvre la moitie de la page' % (
                c['textes_vis'], c['vect_vis'])
        return 'vectoriel avec texte', '%d textes visibles, aucun trait' % c['textes_vis']
    if c['vect_vis'] > 0:
        return 'vectoriel sans texte', '%d traits mais aucun texte visible : le texte est peut-etre dessine en traits (polices de DAO), ou absent' % c['vect_vis']
    if c['image'] > 0:
        return 'mixte', 'seulement de petites images (%d), la plus grande couvre %d %% de la page' % (
            c['image'], round(c['couverture'] * 100))
    return 'vide', 'rien de visible sur la page'


def verdict_document(verdicts):
    if not verdicts:
        return 'illisible', 'aucune page lue'
    genres = {}
    for v, _ in verdicts:
        genres[v] = genres.get(v, 0) + 1
    if len(genres) == 1:
        v = list(genres)[0]
        n = len(verdicts)
        pq = verdicts[0][1] if n == 1 else 'meme verdict pour chacune des %d pages (le detail est page par page)' % n
        return v, pq
    nonvides = dict((k, n) for k, n in genres.items() if k != 'vide')
    if len(nonvides) == 1:
        v = list(nonvides)[0]
        return v, '%s sur %d page(s) ; %d page(s) vide(s)' % (v, nonvides[v], genres.get('vide', 0))
    return 'mixte', 'les pages different : ' + ', '.join('%s : %d' % (k, n) for k, n in sorted(genres.items(), key=lambda x: -x[1]))


LIMITE_ELEMENTS = 500000      # au-dela (dans un PDF), la lecture s'arrete, meme en cours de page (la memoire du poste)
LIMITE_COMPARAISON = 150000   # au-dela (dans une page), PyMuPDF ne relit pas la page pour comparer (temps, memoire)
DELAI_PDF = 120.0             # s : au-dela, la lecture d'un PDF s'arrete (le rapport le dit) et l'on passe au suivant


def lire_pages(choix, nb, pages_voulues):
    if not pages_voulues:
        return list(range(nb))
    return [i for i in range(nb) if (i + 1) in pages_voulues]


class Releve(object):
    """Le releve d'un PDF : tout ce que le rapport et le TSV disent."""

    def __init__(self):
        self.erreur = None
        self.lecteur = ''
        self.infos = None
        self.pages = []          # dict : num, W, H, rot, elements, stats, comptes, verdict, amas
        self.polices = []
        self.notes = NotesNonGere()
        self.duree = 0.0
        self.comparaison = None
        self.comparaison_sautee = 0
        self.completes = 0       # textes que PyMuPDF a completes (caracteres inconnus du lecteur standard)
        self.cachees = None      # les donnees non dessinees (brutes : le rapport les masque)
        self.masques = Masques()
        self.arrete = 0


def completer_textes(els, autres, tol=0.1 / MM):
    """Les caracteres que le lecteur standard ne connait pas (¤ : une police
    composite sans ToUnicode, dont seul le programme de la police dit les
    caracteres) pris chez PyMuPDF, qui lit ce programme : meme place (0,1 mm),
    meme sens, meme nombre de caracteres. Seul un ¤ est complete, et
    seulement par une lettre ou un chiffre ; tout autre signe (une espace
    comprise) le laisse ¤ : faute de nom de glyphe connu, PyMuPDF rend le
    code brut (33, 34... dans l'ordre d'apparition des glyphes ; /g3 donne
    une espace), dont motif() garderait les signes, et KESTREL deviendrait
    !"#$%"& (un chiffre par substitution). Rend le nombre de textes completes."""
    index = {}
    for f in autres:
        if f['type'] == 'texte' and INCONNU not in f['texte']:
            index.setdefault((int(f['x1'] // 2), int(f['y1'] // 2)), []).append(f)
    n = 0
    for e in els:
        if e['type'] != 'texte' or INCONNU not in e['texte']:
            continue
        gx, gy = int(e['x1'] // 2), int(e['y1'] // 2)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for f in index.get((gx + dx, gy + dy), ()):
                    if abs(f['x1'] - e['x1']) <= tol and abs(f['y1'] - e['y1']) <= tol and \
                            len(f['texte']) == len(e['texte']) and abs(f['ux'] - e['ux']) < 0.01 and abs(f['uy'] - e['uy']) < 0.01:
                        e['texte'] = u''.join(b if (a == INCONNU and b.isalnum()) else a for a, b in zip(e['texte'], f['texte']))
                        n += 1
                        break
                else:
                    continue
                break
            else:
                continue
            break
    return n


def relever(data, options, fitz):
    """Lit un PDF : le lecteur standard d'abord (il est exact partout ou on
    l'a mesure, et il dit le contenu marque, les calques, les formulaires) ;
    PyMuPDF, s'il est installe, relit chaque page pour comparer et complete
    les caracteres que le lecteur standard ne connait pas ; il prend la page
    a son compte si le lecteur standard echoue. Ne leve jamais : une erreur
    est notee dans le releve."""
    rel = Releve()
    t0 = time.time()
    echeance = t0 + float(options.get('delai') or DELAI_PDF)
    clair = options.get('clair', False)
    mdp = options.get('mot_de_passe', '') or ''
    std = None
    try:
        std = DocumentStandard(data, rel.notes, mdp)
        rel.infos = std.infos(clair)
    except Exception as e:
        rel.notes.ajouter('lecteur standard : %s' % raison(e))
        std = None
        rel.erreur_std = raison(e)
    choix = options.get('lecteur', 'auto')
    mu = None
    if fitz is not None and choix in ('auto', 'pymupdf'):
        oublier_messages(fitz)
        try:
            mu = DocumentPyMuPDF(fitz, data, rel.notes, mdp, std.calques.visible if std is not None else None)
        except Exception as e:
            rel.notes.ajouter('PyMuPDF n\'a pas pu ouvrir le fichier (%s)' % raison(e))
            mu = None
    if choix == 'pymupdf' and mu is not None:
        principal = mu
    elif std is not None:
        principal = std
    else:
        principal = mu
    if principal is None:
        rel.erreur = getattr(rel, 'erreur_std', 'illisible')
        rel.duree = time.time() - t0
        return rel
    vmu = ('PyMuPDF ' + version_pymupdf(fitz)) if mu is not None else ''
    if mu is not None and version_tuple(version_pymupdf(fitz)) < (1, 23):
        rel.notes.ajouter('%s (avant 1.23) : ses traces different des notres sur des cas connus (fermeture des chemins, '
                          'couleurs) ; il ne sert qu\'a comparer et a completer les caracteres inconnus' % vmu)
    if principal is std:
        rel.lecteur = u'standard (bibliothèque standard de Python seule)' + (
            u' ; %s relit chaque page pour comparer' % vmu if mu is not None else u'')
    else:
        rel.lecteur = vmu + (u' (le lecteur standard n\'a pas pu ouvrir le fichier)' if std is None else u'')
    nb = len(std.pages) if principal is std else mu.nb
    if rel.infos is None:
        rel.infos = infos_pymupdf(mu, clair)
    rel.infos['pages'] = nb
    if std is not None and mu is not None:
        rel.comparaison = []
    total = 0
    secours = 0
    a_lire = lire_pages(choix, nb, options.get('pages'))
    for rang, i in enumerate(a_lire):
        if total > LIMITE_ELEMENTS:
            rel.notes.ajouter('releve arrete apres %d page(s) et %d elements, pour menager la memoire du poste : '
                              '%d page(s) non lues (--pages=... pour en choisir d\'autres)' % (rang, total, len(a_lire) - rang))
            rel.arrete = len(a_lire) - rang
            break
        if time.time() > echeance:
            rel.notes.ajouter('releve arrete apres %d page(s) : le delai de %d s par PDF est depasse ; %d page(s) non lues '
                              '(--pages=... ou --delai=...)' % (rang, int(echeance - t0), len(a_lire) - rang))
            rel.arrete = len(a_lire) - rang
            break
        col_s = col_m = None
        if std is not None and i < len(std.pages):
            try:
                col_s, Ws, Hs, rots = std.lire_page(i, echeance, LIMITE_ELEMENTS - total)
            except Exception as e:
                col_s = None
                rel.notes.ajouter('lecteur standard, page %d : %s' % (i + 1, raison(e)))
        # une page qui a arrete le lecteur standard (delai, eventail de formulaires, trop d'elements) n'est pas
        # relue par PyMuPDF pour comparer : MuPDF peut y passer des minutes, ou s'y planter (et la sonde avec lui)
        if mu is not None and i < mu.nb and (principal is mu or col_s is None or
                                             (col_s.nb_items <= LIMITE_COMPARAISON and not col_s.arret)):
            en_ligne = None
            if col_s is not None:
                en_ligne = []
                for im in col_s.images:
                    if im['info'].get('en_ligne'):
                        xs = [q[0] for q in im['coins']]
                        ys = [q[1] for q in im['coins']]
                        en_ligne.append((min(xs), min(ys), max(xs), max(ys)))
            try:
                col_m, Wm, Hm, rotm = mu.lire_page(i, en_ligne)
            except Exception as e:
                col_m = None
                rel.notes.ajouter('PyMuPDF, page %d : %s' % (i + 1, raison(e)))
        elif mu is not None and col_s is not None:
            if i >= mu.nb:
                rel.notes.ajouter('PyMuPDF ne voit que %d page(s) : pages suivantes non comparees' % mu.nb)
            elif col_s.arret:
                rel.notes.ajouter('page %d : arretee en route, PyMuPDF ne la relit pas pour comparer' % (i + 1))
            else:
                rel.comparaison_sautee += 1
        if col_s is not None and (principal is std or col_m is None):
            col, W, H, rot, autre = col_s, Ws, Hs, rots, col_m
        elif col_m is not None:
            col, W, H, rot, autre = col_m, Wm, Hm, rotm, col_s
            if principal is std:
                rel.notes.ajouter('page %d lue par PyMuPDF : le lecteur standard n\'a pas pu la lire' % (i + 1))
        else:
            rel.notes.ajouter('page %d illisible' % (i + 1))
            rel.pages.append({'num': i + 1, 'W': 0, 'H': 0, 'rot': 0, 'elements': [], 'stats': {}, 'amas': [],
                              'comptes': comptes_page([], 1, 1), 'verdict': ('illisible', u'aucun lecteur n\'a pu la lire'),
                              'erreur': 'illisible', 'marques': {}, 'cles_marques': {}, 'textes_marques': []})
            continue
        try:
            els, stats = analyser_page(col, W, H)
        except Exception as e:
            rel.notes.ajouter('page %d illisible : %s' % (i + 1, raison(e)))
            rel.pages.append({'num': i + 1, 'W': 0, 'H': 0, 'rot': 0, 'elements': [], 'stats': {}, 'amas': [],
                              'comptes': comptes_page([], 1, 1), 'verdict': ('illisible', raison(e)), 'erreur': raison(e),
                              'marques': {}, 'cles_marques': {}, 'textes_marques': []})
            continue
        if col.arret:
            rel.notes.ajouter('page %d : lecture arretee en cours de page (%s) : la page est incomplete' % (i + 1, col.arret))
        secours += col.glyphes_secours
        if autre is not None and rel.comparaison is not None:
            try:
                els2, _ = analyser_page(autre, Wm if autre is col_m else Ws, Hm if autre is col_m else Hs)
                if col is col_s:
                    comp = comparer_elements(els2, els)
                    rel.completes += completer_textes(els, els2)
                else:
                    comp = comparer_elements(els, els2)
                    # PyMuPDF ne dit pas de quel formulaire vient un element : le lecteur standard, si
                    for (ea, eb) in comp['paires']:
                        if eb.get('bloc') and not ea.get('bloc'):
                            ea['bloc'] = eb['bloc']
                    stats['usages'] = dict(col_s.usages)
                rel.comparaison.append({'types': comp['types']})   # seulement les comptes : la memoire
                del els2, comp
            except Exception as e:
                rel.notes.ajouter('page %d : comparaison des deux lecteurs impossible (%s)' % (i + 1, raison(e)))
        col_marques = col_s if col_s is not None else col
        c = comptes_page(els, W, H)
        amas = amas_de_petits_traits(els, W, H)
        c['amas_texte'] = sum(1 for a in amas if a['texte_probable'])
        c['traits_amas_texte'] = sum(a['n'] for a in amas if a['texte_probable'])
        if std is not None:
            try:
                ann = std.annotations(i)
                for e in ann:
                    e['boite'] = (e['x1'], e['y1'], e['x2'], e['y2'])
                els = els + ann
            except Exception as e:
                rel.notes.ajouter('annotations de la page %d illisibles : %s' % (i + 1, raison(e)))
        rel.pages.append({'num': i + 1, 'W': W, 'H': H, 'rot': rot, 'elements': els, 'stats': stats, 'amas': amas,
                          'comptes': c, 'verdict': verdict_page(c), 'marques': getattr(col_marques, 'marques', {}),
                          'cles_marques': getattr(col_marques, 'cles_marques', {}),
                          'textes_marques': getattr(col_marques, 'textes_marques', []), 'incomplete': col.arret})
        total += len(els)
        if not options.get('silencieux'):
            dire('    page %d/%d : %d elements' % (i + 1, nb, len(els)))
        if col.arret and (col.arret.startswith('delai') or col.arret.startswith('trop')):
            reste = len(a_lire) - rang - 1
            if reste:
                rel.notes.ajouter('%d page(s) non lues apres la page %d (%s)' % (reste, i + 1, col.arret))
                rel.arrete = reste
            break
    if secours:
        rel.notes.ajouter('%d glyphe(s) lus avec la police de secours (Helvetica) : leurs largeurs sont approchees' % secours)
    if rel.completes:
        rel.notes.ajouter('%d texte(s) aux caracteres inconnus du lecteur standard (police sans ToUnicode) completes '
                          'par PyMuPDF (meme place, meme longueur)' % rel.completes)
    if rel.comparaison_sautee:
        rel.notes.ajouter('%d page(s) trop chargee(s) (plus de %d traces) : PyMuPDF ne les a pas relues pour comparer'
                          % (rel.comparaison_sautee, LIMITE_COMPARAISON))
    if std is not None:
        try:
            rel.polices = std.polices()
        except Exception:
            rel.polices = []
        try:
            formes = [k for k in std.machine.noms_formes if isinstance(k, int) and k in std.lecteur.xref]
            rel.cachees = std.donnees_non_dessinees(formes)
        except Exception as e:
            rel.notes.ajouter('donnees non dessinees illisibles : %s' % raison(e))
    rel.duree = time.time() - t0
    return rel


def infos_pymupdf(doc, clair):
    d = doc.doc
    meta = d.metadata or {}
    infos = {'version': re.sub(r'[^0-9.]', '', meta.get('format') or ''), 'pages': doc.nb,
             'producer': masquer_logiciel(meta.get('producer') or '', clair),
             'creator': masquer_logiciel(meta.get('creator') or '', clair),
             'CreationDate': re.sub(r'\D', '', (meta.get('creationDate') or '')[2:6]),
             'ModDate': re.sub(r'\D', '', (meta.get('modDate') or '')[2:6]),
             'personnels': {}, 'xmp': False, 'chiffrement': None,
             'structure': {'xref': '(lu par PyMuPDF)', 'flux_objets': 0, 'mises_a_jour': 0,
                           'reconstruit': bool(getattr(d, 'is_repaired', False)), 'pourquoi': []},
             'annotations': {}, 'jointes': 0, 'signets': 0, 'formulaire': 0, 'balise': False,
             'calques': [(v[0], n, v[1]) for n, v in sorted(doc.calques.items(), key=lambda x: x[1][0])]}
    for k, kk in (('title', 'Title'), ('author', 'Author'), ('subject', 'Subject'), ('keywords', 'Keywords')):
        v = meta.get(k)
        if v:
            infos['personnels'][kk] = v if clair else len(v)
    if meta.get('encryption'):
        # « Standard V4 R4 128-bit AES » : seulement les mots connus
        meth = ' '.join(m for m in str(meta.get('encryption')).split()
                        if re.match(r'^(?:Standard|V\d|R\d|\d{2,3}-bit|RC4|AES|None|Unknown)$', m)) or 'oui'
        infos['chiffrement'] = {'methode': meth, 'impression': None, 'modification': None,
                                'copie': None, 'annotations': None, 'ouvert_par': getattr(doc, 'ouvert_par', None)}
    try:
        infos['jointes'] = d.embfile_count()
    except Exception:
        pass
    try:
        for i in range(doc.nb):
            for a in d[i].annots() or []:
                t = a.type[1]
                infos['annotations'][t] = infos['annotations'].get(t, 0) + 1
    except Exception:
        pass
    return infos


# ===========================================================================
#  15. Comparer deux releves (les deux lecteurs)
# ===========================================================================

def comparer_elements(a, b, tol=0.1 / MM):
    """Apparie les elements de deux listes (meme type, memes coordonnees a tol
    pres ; pour un texte, meme motif). Rend un dict de comptes par type."""
    def cle(e):
        return e['type']
    # un texte qui ne sert qu'a decouper (Tr 7) : PyMuPDF ne le rend pas ; un trait ou une courbe de
    # moins de 0,05 mm : MuPDF (en simple precision, et a sa facon pour les cas degeneres) peut le
    # garder ou le jeter autrement que le lecteur standard ; on ne les compare pas
    def comparable(e):
        if 'mode7' in e.get('raisons', ()):
            return False
        if e['type'] in ('segment', 'courbe', 'cercle', 'rectangle'):
            b_ = boite(e)
            return max(b_[2] - b_[0], b_[3] - b_[1]) >= 0.05 / MM
        return True
    a = [e for e in a if comparable(e)]
    b = [e for e in b if comparable(e)]
    seaux = {}
    pas = max(tol * 4, 1.0)
    for j, e in enumerate(b):
        k = (cle(e), int(e['x1'] // pas), int(e['y1'] // pas))
        seaux.setdefault(k, []).append(j)
    pris = set()
    resultat = {}
    ecarts = []
    paires = []
    for e in a:
        t = cle(e)
        r_ = resultat.setdefault(t, {'a': 0, 'b': 0, 'ensemble': 0, 'ecart_max': 0.0})
        r_['a'] += 1
        trouve = None
        meilleur = None
        ou = None
        me = motif(e['texte']) if t == 'texte' else None
        gx, gy = int(e['x1'] // pas), int(e['y1'] // pas)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                seau = seaux.get((t, gx + dx, gy + dy))
                if not seau:
                    continue
                for pos, j in enumerate(itertools.islice(seau, VOISINS_MAX)):
                    f = b[j]
                    if t == 'texte':
                        mf = f.get('_motif')
                        if mf is None:
                            mf = f['_motif'] = motif(f['texte'])
                        if me != mf:
                            continue
                    d = max(abs(e['x1'] - f['x1']), abs(e['y1'] - f['y1']), abs(e['x2'] - f['x2']), abs(e['y2'] - f['y2']))
                    if t == 'segment' and d > tol:
                        d2 = max(abs(e['x1'] - f['x2']), abs(e['y1'] - f['y2']), abs(e['x2'] - f['x1']), abs(e['y2'] - f['y1']))
                        d = min(d, d2)
                    if d <= tol and (meilleur is None or d < meilleur):
                        meilleur = d
                        trouve = j
                        ou = (seau, pos)
                        if d <= 1e-3:              # le meme a un millieme de point : inutile de chercher mieux
                            break
                if meilleur is not None and meilleur <= 1e-3:
                    break
            if meilleur is not None and meilleur <= 1e-3:
                break
        if trouve is not None:
            # l'element apparie sort de son seau : un empilement d'elements identiques reste lineaire
            seau, pos = ou
            seau[pos] = seau[-1]
            seau.pop()
            pris.add(trouve)
            paires.append((e, b[trouve]))
            r_['ensemble'] += 1
            r_['ecart_max'] = max(r_['ecart_max'], meilleur)
        else:
            ecarts.append(('seul_a', e))
    for j, f in enumerate(b):
        t = cle(f)
        r_ = resultat.setdefault(t, {'a': 0, 'b': 0, 'ensemble': 0, 'ecart_max': 0.0})
        r_['b'] += 1
        if j not in pris:
            ecarts.append(('seul_b', f))
    return {'types': resultat, 'ecarts': ecarts, 'paires': paires}


# ===========================================================================
#  16. Ecrire le rapport et le TSV
# ===========================================================================

COLONNES_TSV = ('page', 'n', 'type', 'x1', 'y1', 'x2', 'y2', 'angle', 'epaisseur', 'taille', 'couleur', 'fond',
                'visible', 'raison', 'calque', 'chemin', 'bloc', 'motif', 'police', 'details')


def index_des_calques(rel):
    """Les calques -> C1, C2... dans l'ordre de leurs numeros d'objet (le
    lecteur standard et PyMuPDF les identifient tous deux ainsi)."""
    nums = set(x[0] for x in ((rel.infos or {}).get('calques') or []))
    for p in rel.pages:
        for e in p['elements']:
            c = e.get('calque')
            if isinstance(c, tuple) and c[0] is not None:
                nums.add(c[0])
    return dict((x, 'C%d' % (i + 1)) for i, x in enumerate(sorted(nums)))


def nom_calque(cal, index_calques):
    if not isinstance(cal, tuple) or cal[0] is None:
        return ''
    return index_calques.get(cal[0], 'C?')


LARGEUR_CONVENTIONNELLE = 0.6   # corps par caractere : la longueur d'un texte dans le TSV anonymise


def fin_de_texte(e, clair):
    """La fin de la ligne de base d'un texte pour le TSV. Releve anonymise :
    une longueur CONVENTIONNELLE (nombre de caracteres x 0,6 corps), car la
    vraie longueur suit les largeurs des lettres (M, W larges ; I, l etroits)
    et laisserait deviner le texte ; avec --clair, la vraie fin."""
    if clair:
        return e['x2'], e['y2']
    L = len(e['texte']) * LARGEUR_CONVENTIONNELLE * e['taille']
    return e['x1'] + L * e['ux'], e['y1'] + L * e['uy']


def ligne_tsv(num_page, n, e, index_calques, clair, masques=None):
    t = e['type']
    mm = MM
    details = ''
    if t == 'courbe':
        (ax, ay), (bx, by) = e['ctrl']
        details = '%s %s %s %s' % (fmt(ax * mm), fmt(ay * mm), fmt(bx * mm), fmt(by * mm))
    elif t == 'image':
        inf = e['info']
        morceaux = ['%dx%d px' % (e['l'], e['h'])]
        if inf.get('filtre'):
            morceaux.append(inf['filtre'])
        if inf.get('espace'):
            morceaux.append(inf['espace'])
        if inf.get('bits'):
            morceaux.append('%d bits' % inf['bits'])
        if inf.get('masque'):
            morceaux.append('masque')
        if inf.get('motif'):
            morceaux.append('dans un motif')
        details = ', '.join(morceaux)
    elif t == 'texte':
        details = '%d car.' % len(e['texte'])
    elif t == 'annotation':
        details = nom_montrable(e['sorte'], 'S', masques) + (
            (' (%s, %d car.)' % (e['source'], len(e['texte']))) if e['texte'] else '')
    if e.get('tirets'):
        details = (details + ' ' if details else '') + 'tirets'
    if e.get('amas'):
        details = (details + ' ' if details else '') + 'amas %d' % e['amas']
    if t == 'texte':
        couleur = hexa(e.get('couleur'))
        if e['mode'] == 'trait':
            details += ' (texte en contour)'
        x2, y2 = fin_de_texte(e, clair)
    else:
        couleur = hexa(e.get('trait'))
        x2, y2 = e['x2'], e['y2']
    m = motif(e['texte']) if t in ('texte', 'annotation') else ''
    champs = [str(num_page), str(n), t, fmt(e['x1'] * mm), fmt(e['y1'] * mm), fmt(x2 * mm), fmt(y2 * mm),
              fmt(e['angle'], 1) if e.get('angle') is not None else '',
              fmt(e['ep'] * mm, 3) if e.get('ep') is not None and t not in ('texte', 'image') else '',
              fmt(e['taille'], 2) if t == 'texte' else '',
              couleur, hexa(e.get('fond')),
              'O' if e['visible'] else 'N', ','.join(e['raisons']), nom_calque(e.get('calque'), index_calques),
              str(e['chemin']) if e.get('chemin') is not None else '', e.get('bloc') or '', m,
              nom_de_police(e.get('police'), masques) if t == 'texte' else '', details.strip()]
    if clair:
        champs.append(e['texte'] if t in ('texte', 'annotation') else '')
    return champs


def ecrire_tsv(chemin, rel, index_calques, clair):
    """Le TSV : une ligne par element. Releve anonymise : les petits traits
    groupes en amas (de quoi relire un texte dessine en traits) sont ecrits
    en une ligne par amas, a la place du premier, et la colonne n numerote
    les lignes (le rang des elements dirait, d'un amas au suivant, combien de
    traits a chacun) ; avec --clair, tout, au rang de chaque element."""
    entete = list(COLONNES_TSV) + (['texte_EN_CLAIR'] if clair else [])
    with open(chemin_long(chemin), 'w', encoding='utf-8-sig', newline='') as f:
        f.write('\t'.join(entete) + '\r\n')
        for p in rel.pages:
            amas = dict((a['membres'][0], a) for a in (p.get('amas') or []))
            els = p['elements']
            rang = 0
            for k, e in enumerate(els):
                if not clair and e.get('amas'):
                    a = amas.get(k)
                    if a is None:
                        continue
                    rang += 1
                    champs = ligne_amas(p['num'], rang, a, els, index_calques)
                else:
                    rang += 1
                    champs = ligne_tsv(p['num'], rang, e, index_calques, clair, rel.masques)
                f.write('\t'.join(c.replace('\t', ' ').replace('\r', ' ').replace('\n', ' ') for c in champs) + '\r\n')


def histogramme(valeurs, n=12):
    h = {}
    for v in valeurs:
        h[v] = h.get(v, 0) + 1
    return sorted(h.items(), key=lambda x: (-x[1], x[0]))[:n], len(h)


def angle_arrondi(a):
    return int(round(a)) % 360


def ecrire_rapport(chemin, rel, entete, options, index_calques):
    L = []
    clair = options.get('clair', False)
    w = L.append
    if clair:
        w(u'SONDE PDF -- relevé EN CLAIR (option --clair : les textes réels et toute la géométrie sont écrits)')
    else:
        w(u'SONDE PDF -- relevé ANONYMISÉ (aucun texte réel, aucun nom de fichier, aucun nom propre)')
    w(u'=' * 78)
    if not clair:
        w(u'Le .elements.tsv contient la GÉOMÉTRIE du dessin (traits, rectangles, cercles, place des textes) ;')
        w(u'les textes y sont réduits à leur forme, et les petits traits groupés comme des caractères (texte')
        w(u'dessiné en traits) y tiennent en une ligne par groupe, sans la place de chaque trait.')
        w(u'')
    for k, v in entete:
        w(u'%-22s : %s' % (k, v))
    w(u'%-22s : %s' % (u'Lecteur utilisé', rel.lecteur or u'aucun'))
    w(u'%-22s : %s s' % (u'Durée de la lecture', fr(rel.duree, 1)))
    w(u'')
    if rel.erreur:
        w(u'== CE PDF N\'A PAS PU ÊTRE LU ==')
        w(u'Raison : %s' % rel.erreur)
        w(u'')
    inf = rel.infos or {}
    if inf:
        w(u'== LE DOCUMENT ==')
        w(u'Version PDF            : %s' % (inf.get('version') or '?'))
        w(u'Pages                  : %s%s' % (inf.get('pages'), (u' (relevées : %s)' % ', '.join(str(p['num']) for p in rel.pages)) if options.get('pages') else ''))
        w(u'Producteur (Producer)  : %s' % (inf.get('producer') or u'(absent)'))
        w(u'Créateur (Creator)     : %s' % (inf.get('creator') or u'(absent)'))
        w(u'Année de création      : %s ; de modification : %s' % (inf.get('CreationDate') or '?', inf.get('ModDate') or '?'))
        pers = inf.get('personnels') or {}
        if pers:
            if clair:
                for k, v in pers.items():
                    w(u'%-22s : %s' % (k, v))
            else:
                w(u'Titre, auteur, sujet   : présents mais masqués (%s)' % ', '.join(u'%s %d car.' % (k, v) for k, v in pers.items()))
        else:
            w(u'Titre, auteur, sujet   : absents')
        ch = inf.get('chiffrement')
        if ch:
            perms = []
            for k in ('impression', 'modification', 'copie', 'annotations'):
                if ch.get(k) is not None:
                    perms.append(u'%s %s' % (k, u'oui' if ch[k] else u'non'))
            par = {'vide': u'ouvert sans mot de passe', 'utilisateur': u'ouvert avec le mot de passe donné (utilisateur)',
                   'proprietaire': u'ouvert avec le mot de passe donné (propriétaire)'}.get(ch.get('ouvert_par'), u'ouvert')
            w(u'Chiffré                : oui, %s, %s%s' % (ch['methode'], par, (u' ; permissions : ' + ', '.join(perms)) if perms else ''))
        else:
            w(u'Chiffré                : non')
        st = inf.get('structure') or {}
        w(u'Structure              : %s ; flux d\'objets : %s ; mises à jour incrémentales : %s' % (
            st.get('xref', '?'), st.get('flux_objets', 0), st.get('mises_a_jour', 0)))
        if st.get('reconstruit'):
            w(u'                         RECONSTRUIT en parcourant le fichier (%s)' % '; '.join(st.get('pourquoi') or []))
        w(u'Balisé (structure)     : %s ; formulaire : %s champ(s) ; signets : %s ; métadonnées XMP : %s' % (
            u'oui' if inf.get('balise') else u'non', inf.get('formulaire', 0), inf.get('signets', 0), u'oui' if inf.get('xmp') else u'non'))
        ann = inf.get('annotations') or {}
        w(u'Annotations            : %s' % (', '.join(u'%s %d' % (nom_montrable(k, 'S', rel.masques), v)
                                                     for k, v in sorted(ann.items())) if ann else u'aucune'))
        w(u'Pièces jointes         : %d' % inf.get('jointes', 0))
        cal = inf.get('calques') or []
        if cal:
            w(u'Calques (OCG)          : %d' % len(cal))
            nb_par_calque = {}
            for p in rel.pages:
                for e in p['elements']:
                    c = nom_calque(e.get('calque'), index_calques)
                    if c:
                        nb_par_calque[c] = nb_par_calque.get(c, 0) + 1
            for (num, nom, vis) in cal:
                cle = index_calques.get(num, 'C?')
                montre = nom if clair else motif(nom)
                w(u'    %-4s nom %s « %s », %s par défaut, %d élément(s)' % (
                    cle, u'réel' if clair else u'masqué', montre, u'visible' if vis else u'MASQUÉ', nb_par_calque.get(cle, 0)))
        else:
            w(u'Calques (OCG)          : aucun')
        w(u'')
    if rel.pages:
        verdicts = [p['verdict'] for p in rel.pages]
        v, pq = verdict_document(verdicts)
        w(u'== VERDICT ==')
        w(u'%s' % v.upper())
        w(u'Pourquoi : %s' % pq)
        tot = {}
        for p in rel.pages:
            for k in ('textes_vis', 'textes_invis', 'seg', 'rect', 'courbe', 'cercle', 'image'):
                tot[k] = tot.get(k, 0) + p['comptes'][k]
        couv = max([p['comptes']['couverture'] for p in rel.pages] or [0])
        im_motif = sum(p['comptes'].get('images_motif', 0) for p in rel.pages)
        w(u'Ensemble : %d textes visibles, %d invisibles ; %d segments, %d rectangles, %d courbes, %d cercles ; '
          u'%d image(s)%s%s' % (tot['textes_vis'], tot['textes_invis'], tot['seg'], tot['rect'], tot['courbe'], tot['cercle'],
                                tot['image'], (u', la plus grande couvre %d %% d\'une page' % round(couv * 100)) if tot['image'] > im_motif else u'',
                                (u' (dont %d dans un motif : un quadrillage ou une trame, pas un scan)' % im_motif) if im_motif else u''))
        if v == 'vectoriel avec texte':
            w(u'=> Les liaisons pourront se lire directement dans le PDF (traits et textes).')
        elif v == 'vectoriel sans texte':
            w(u'=> Les traits se liront ; les textes (repères, numéros de fil) sont peut-être dessinés en traits : il faudra une reconnaissance de caractères.')
        elif v.startswith('scann'):
            w(u'=> Rien à lire directement : il faudra une reconnaissance de l\'image (OCR et traits).')
        elif v == 'mixte':
            w(u'=> Lecture directe possible en partie ; voir page par page.')
        w(u'')
        w(u'== PAGE PAR PAGE ==')
        for p in rel.pages:
            c = p['comptes']
            Wm, Hm = p['W'] * MM, p['H'] * MM
            orient = u'paysage' if Wm > Hm else (u'portrait' if Hm > Wm else u'carré')
            w(u'Page %d : %s x %s mm, %s %s, rotation %d°' % (p['num'], fr(Wm), fr(Hm), nom_format(Wm, Hm), orient, p['rot']))
            if p.get('erreur'):
                w(u'  ILLISIBLE : %s' % p['erreur'])
                continue
            rs = c['raisons']
            detail_t = ', '.join(u'%s : %d' % (nom_raison(r_), n) for (t, r_), n in sorted(rs.items()) if t == 'texte')
            w(u'  Textes     : %d visibles, %d invisibles%s' % (c['textes_vis'], c['textes_invis'], (u' (' + detail_t + u')') if detail_t else ''))
            w(u'  Segments   : %d (horizontaux %d, verticaux %d, obliques %d)' % (c['seg'], c['H'], c['V'], c['O']))
            w(u'  Rectangles : %d ; courbes : %d ; cercles : %d ; points (traits de longueur nulle) : %d ; '
              u'traits doublés (aller-retour) : %d' % (
                  c['rect'], c['courbe'], c['cercle'], p['stats'].get('points', 0), p['stats'].get('doublons', 0)))
            am = p.get('amas') or []
            if am:
                w(u'  Groupes de traits (amas : petits traits serrés, grandes lettres, mots) : %d, %d traits ; dont %d qui '
                  u'ressemblent à du texte dessiné en traits (%d traits)' % (len(am), sum(a['n'] for a in am), c.get('amas_texte', 0),
                                                           c.get('traits_amas_texte', 0)))
            if p.get('incomplete'):
                w(u'  INCOMPLÈTE : la lecture de la page s\'est arrêtée en route (%s)' % p['incomplete'])
            autres = ', '.join(u'%s %s : %d' % (t, nom_raison(r_), n) for (t, r_), n in sorted(rs.items()) if t != 'texte')
            if autres:
                w(u'  Traits invisibles : %s' % autres)
            if c['image']:
                w(u'  Images     : %d' % c['image'])
                for (e, part) in sorted(c['images'], key=lambda x: -x[1])[:6]:
                    b = e['boite']
                    w(u'    %d x %d px, %s x %s mm, %s %% de la page%s' % (
                        e['l'], e['h'], fr((b[2] - b[0]) * MM), fr((b[3] - b[1]) * MM), fr(part * 100, 1),
                        (u', ' + e['info']['filtre']) if e['info'].get('filtre') else ''))
            else:
                w(u'  Images     : aucune')
            if p['stats'].get('degrades'):
                w(u'  Dégradés : %d (non relevés)' % p['stats']['degrades'])
            if p['stats'].get('motifs'):
                w(u'  Surfaces peintes par un motif (hachures, dégradé, trame) : %d (non relevées)' % p['stats']['motifs'])
            w(u'  Verdict    : %s -- %s' % p['verdict'])
        w(u'')
        ecrire_communs(w, rel)
        ecrire_motifs(w, rel, clair)
        try:
            ecrire_structure(w, rel, clair)
        except Exception as e:                        # une analyse en plus ne doit jamais coûter le rapport
            w(u'(analyse de la structure impossible : %s)' % raison(e))
            w(u'')
        ecrire_caches(w, rel, clair)
    try:
        ecrire_non_dessinees(w, rel, clair)
    except Exception as e:
        w(u'(données non dessinées : analyse impossible : %s)' % raison(e))
        w(u'')
    if rel.polices:
        w(u'== POLICES (déclarées dans les pages lues) ==')
        w(u'(une famille du commerce est nommée ; une police maison, qui peut porter le nom de la société ou du')
        w(u' programme, est donnée par un code et sa forme : P1 (Aaaaaaa-Aaaa))')
        lignes = set()
        for (nom, st, emb, enc, tu) in rel.polices:
            enc_m = enc if (enc.startswith(u'(') or enc == u'CMap integree') else u' + '.join(
                nom_montrable(x.strip(), 'N', rel.masques, connus=lambda n: nom_standard(n, None) is not None,
                              ordinaire=False) for x in enc.split('+'))
            lignes.add(u'  %s : %s, %s, encodage %s, ToUnicode %s' % (
                nom_de_police(nom, rel.masques), u'/'.join(nom_standard(x, u'autre') for x in st.split('/')),
                u'embarquée' if emb else u'non embarquée', enc_m, u'oui' if tu else u'non'))
        for l in sorted(lignes):
            w(l)
        w(u'')
    if rel.comparaison is not None:
        w(u'== LES DEUX LECTEURS (PyMuPDF contre le lecteur standard) ==')
        if rel.comparaison_sautee:
            w(u'  (%d page(s) trop chargée(s) non relues par PyMuPDF)' % rel.comparaison_sautee)
        tot = {}
        for comp in rel.comparaison:
            for t, r_ in comp['types'].items():
                x = tot.setdefault(t, {'a': 0, 'b': 0, 'ensemble': 0, 'ecart_max': 0.0})
                for k in ('a', 'b', 'ensemble'):
                    x[k] += r_[k]
                x['ecart_max'] = max(x['ecart_max'], r_['ecart_max'])
        for t, x in sorted(tot.items()):
            w(u'  %-10s PyMuPDF %d, standard %d, appariés à 0,1 mm : %d (écart max %s mm)' % (
                t, x['a'], x['b'], x['ensemble'], fr(x['ecart_max'] * MM, 3)))
        w(u'')
    notes = rel.notes.liste()
    w(u'== CE QUI N\'EST PAS GÉRÉ (ou seulement approché) ==')
    if notes:
        for m, n in notes:
            w(u'  - %s%s' % (m, (u' (%d fois)' % n) if n > 1 else ''))
    else:
        w(u'  rien de signalé pour ce PDF')
    w(u'  (toujours : seules les découpes rectangulaires (re W n, BBox d\'un formulaire) sont appliquées, et un élément')
    w(u'   en partie découpé est relevé en entier ; les apparences des annotations ne sont pas lues ; la boîte d\'un')
    w(u'   texte est conventionnelle : de la ligne de base, 0,8 corps au-dessus et 0,2 au-dessous)')
    w(u'')
    w(u'Fin du rapport.')
    texte = u'\r\n'.join(L) + u'\r\n'
    with open(chemin_long(chemin), 'w', encoding='utf-8-sig', newline='') as f:
        f.write(texte)


def nom_raison(r_):
    return {'mode3': u'mode de rendu invisible', 'horspage': u'hors page', 'blanc': u'blanc sur blanc',
            'calque': u'calque masqué', 'transparent': u'transparent', 'minuscule': u'corps < 1 pt',
            'mode7': u'texte de découpe (Tr 7)', 'decoupe': u'hors de sa découpe (clip)',
            'fond': u'de la couleur de l\'aplat dessous',
            'recouvert': u'recouvert par un aplat', 'cachee': u'annotation cachée',
            'sansapparence': u'sans apparence'}.get(r_, r_)


def ecrire_communs(w, rel):
    textes = [e for p in rel.pages for e in p['elements'] if e['type'] == 'texte']
    traits = [e for p in rel.pages for e in p['elements'] if e['type'] in ('segment', 'rectangle', 'courbe', 'cercle')]
    if textes:
        w(u'== CE QUE LES TEXTES ONT EN COMMUN ==')
        h, n = histogramme([round(e['taille'], 1) for e in textes])
        w(u'Corps (pt)      : ' + ', '.join(u'%s : %d' % (fr(k), v) for k, v in h) + (u' (%d corps différents)' % n if n > len(h) else ''))
        h, n = histogramme([round(e['taille'] * MM, 2) for e in textes], 6)
        w(u'Corps (mm)      : ' + ', '.join(u'%s : %d' % (fr(k, 2), v) for k, v in h))
        h, n = histogramme([angle_arrondi(e['angle']) for e in textes], 8)
        w(u'Angles (°)      : ' + ', '.join(u'%d : %d' % (k, v) for k, v in h))
        h, n = histogramme([nom_de_police(e['police'], rel.masques) for e in textes], 10)
        w(u'Polices         : ' + ', '.join(u'%s : %d' % (k, v) for k, v in h))
        h, n = histogramme([hexa(e['couleur']) for e in textes], 8)
        w(u'Couleurs        : ' + ', '.join(u'%s : %d' % (k, v) for k, v in h))
        h, n = histogramme([len(e['texte']) for e in textes], 12)
        w(u'Longueurs (car.): ' + ', '.join(u'%d : %d' % (k, v) for k, v in sorted(h)))
        w(u'')
    if traits:
        w(u'== CE QUE LES TRAITS ONT EN COMMUN ==')
        h, n = histogramme([round(e['ep'] * MM, 2) for e in traits if e.get('ep') is not None])
        w(u'Épaisseurs (mm) : ' + ', '.join(u'%s : %d' % (fr(k, 2), v) for k, v in h))
        h, n = histogramme([hexa(e['trait']) for e in traits if e.get('trait') is not None], 8)
        w(u'Couleurs        : ' + ', '.join(u'%s : %d' % (k, v) for k, v in h))
        h, n = histogramme([hexa(e['fond']) for e in traits if e.get('fond') is not None], 8)
        if h:
            w(u'Remplissages    : ' + ', '.join(u'%s : %d' % (k, v) for k, v in h))
        nt = sum(1 for e in traits if e.get('tirets'))
        w(u'Pointillés      : %d' % nt)
        segs = [e for e in traits if e['type'] == 'segment']
        if segs:
            h, n = histogramme([round(math.hypot(e['x2'] - e['x1'], e['y2'] - e['y1']) * MM * 2) / 2 for e in segs], 15)
            w(u'Longueurs de segment fréquentes (mm, au 0,5) : ' + ', '.join(u'%s : %d' % (fr(k, 1), v) for k, v in h))
        rects = [e for e in traits if e['type'] == 'rectangle']
        if rects:
            h, n = histogramme([(round((e['x2'] - e['x1']) * MM * 2) / 2, round((e['y2'] - e['y1']) * MM * 2) / 2) for e in rects], 15)
            w(u'Rectangles fréquents (L x H mm, au 0,5) : ' + ', '.join(u'%s x %s : %d' % (fr(k[0], 1), fr(k[1], 1), v) for k, v in h))
        cercles = [e for e in traits if e['type'] == 'cercle']
        if cercles:
            h, n = histogramme([round((e['x2'] - e['x1']) * MM * 10) / 10 for e in cercles], 10)
            w(u'Cercles fréquents (diamètre mm, au 0,1) : ' + ', '.join(u'%s : %d' % (fr(k, 1), v) for k, v in h))
        w(u'')


def mediane(xs):
    xs = sorted(xs)
    return xs[len(xs) // 2] if xs else 0


def ecrire_structure(w, rel, clair=False):
    """Ce qui aidera a lire les liaisons : les symboles poses comme formulaires,
    comment les traits se touchent, ou les textes se posent par rapport aux
    traits et aux rectangles. Releve anonymise : un formulaire fait seulement
    de traits groupes en amas (une lettre posee comme un formulaire) n'est pas
    detaille : leur liste, numerotee dans l'ordre des premieres poses, avec
    le contenu et la frequence de chacun, donnerait l'alphabet du texte."""
    # -- les formulaires poses (des symboles, probablement)
    poses = {}
    for p in rel.pages:
        for e in p['elements']:
            b = e.get('bloc')
            if b:
                poses.setdefault((b.split('.')[0]), {}).setdefault((p['num'], b), []).append(e)
    usages = {}
    for p in rel.pages:
        for k, v in (p['stats'].get('usages') or {}).items():
            usages[k] = usages.get(k, 0) + v
    w(u'== FORMULAIRES (XObject) : DES SYMBOLES PROBABLES ==')
    if not poses:
        if usages:
            w(u'Formulaires utilisés (%d) mais sans élément relevé dedans.' % len(usages))
        else:
            w(u'Aucun formulaire : les symboles (s\'il y en a) sont dessinés trait par trait, ou PyMuPDF a lu seul.')
    else:
        w(u'%d formulaire(s) utilisé(s) (imbriqués compris), %d posé(s) au premier niveau, %d pose(s) de premier niveau '
          u'(colonne « bloc » du TSV : X3.12 = formulaire X3, 12e pose dans la page).'
          % (len(usages), len(poses), sum(len(v) for v in poses.values())))
        en_amas = [] if clair else [nom for nom, inst in poses.items()
                                    if all(e.get('amas') for els in inst.values() for e in els)]
        if en_amas:
            w(u'%d formulaire(s) faits seulement de petits traits groupés en amas (du texte dessiné en traits, lettre '
              u'par lettre ?), %d pose(s) : non détaillés (leur liste donnerait l\'alphabet du texte).'
              % (len(en_amas), sum(len(poses[nom]) for nom in en_amas)))
            for nom in en_amas:
                del poses[nom]
        w(u'formulaire\tposes\téléments par pose\tcontenu d\'une pose\ttaille (mm)\tmotifs des textes dedans')
        tri = sorted(poses.items(), key=lambda kv: (-len(kv[1]), int(kv[0][1:]) if kv[0][1:].isdigit() else 0))
        for nom, inst in tri[:30]:
            tailles = []
            nbs = []
            contenus = {}
            motifs_ = {}
            for (_, _), els in inst.items():
                bs = [e.get('boite') or boite(e) for e in els]
                tailles.append(((max(b[2] for b in bs) - min(b[0] for b in bs)) * MM, (max(b[3] for b in bs) - min(b[1] for b in bs)) * MM))
                nbs.append(len(els))
                for e in els:
                    contenus[e['type']] = contenus.get(e['type'], 0) + 1
                    if e['type'] == 'texte':
                        m = motif(e['texte'])
                        motifs_[m] = motifs_.get(m, 0) + 1
            n = len(inst)
            contenu = ', '.join(u'%s %s' % (fr(v / float(n), 1), k) for k, v in sorted(contenus.items(), key=lambda x: -x[1]))
            tl = mediane([t[0] for t in tailles])
            th = mediane([t[1] for t in tailles])
            mt = ', '.join(u'%s (%d)' % (k, v) for k, v in sorted(motifs_.items(), key=lambda x: -x[1])[:4])
            w(u'%s\t%d\t%d\t%s\t%s x %s\t%s' % (nom, n, mediane(nbs), contenu, fr(tl), fr(th), mt))
        if len(tri) > 30:
            w(u'... et %d formulaires posés moins souvent' % (len(tri) - 30))
    w(u'')
    # -- les traits qui se touchent
    segs = [e for p in rel.pages for e in p['elements'] if e['type'] == 'segment' and e['visible']]
    w(u'== COMMENT LES TRAITS SE TOUCHENT (segments visibles) ==')
    if not segs:
        w(u'Aucun segment visible.')
        w(u'')
    else:
        tol = 0.05 / MM
        bouts = {}
        for p in rel.pages:
            for e in p['elements']:
                if e['type'] == 'segment' and e['visible']:
                    for (x, y) in ((e['x1'], e['y1']), (e['x2'], e['y2'])):
                        k = (p['num'], int(round(x / tol)), int(round(y / tol)))
                        bouts[k] = bouts.get(k, 0) + 1
        h = {}
        for v in bouts.values():
            k = v if v < 4 else 4
            h[k] = h.get(k, 0) + 1
        w(u'Extrémités : %d points distincts ; seuls (bout libre) : %d, partagés par 2 : %d, par 3 : %d, par 4 ou plus : %d'
          % (len(bouts), h.get(1, 0), h.get(2, 0), h.get(3, 0), h.get(4, 0)))
        # les bouts poses au milieu d'un trait horizontal ou vertical (piquages en T)
        t_jonctions = 0
        for p in rel.pages:
            hs, vs = {}, {}
            ps = [e for e in p['elements'] if e['type'] == 'segment' and e['visible']]
            for e in ps:
                o = orientation_segment(e['angle'])
                # un ensemble par ligne : un trait repete a l'identique (empile) ne compte qu'une fois
                if o == 'H':
                    hs.setdefault(int(round(e['y1'] / tol)), set()).add(
                        (round(min(e['x1'], e['x2']), 2), round(max(e['x1'], e['x2']), 2)))
                elif o == 'V':
                    vs.setdefault(int(round(e['x1'] / tol)), set()).add(
                        (round(min(e['y1'], e['y2']), 2), round(max(e['y1'], e['y2']), 2)))
            ps = list(dict((tuple(round(v, 2) for v in (e['x1'], e['y1'], e['x2'], e['y2'])), e) for e in ps).values())
            for e in ps:
                for (x, y) in ((e['x1'], e['y1']), (e['x2'], e['y2'])):
                    trouve = False
                    for ky in (int(round(y / tol)) - 1, int(round(y / tol)), int(round(y / tol)) + 1):
                        for (a, b) in hs.get(ky, ()):
                            if a + tol < x < b - tol:
                                trouve = True
                                break
                        if trouve:
                            break
                    if not trouve:
                        for kx in (int(round(x / tol)) - 1, int(round(x / tol)), int(round(x / tol)) + 1):
                            for (a, b) in vs.get(kx, ()):
                                if a + tol < y < b - tol:
                                    trouve = True
                                    break
                            if trouve:
                                break
                    if trouve:
                        t_jonctions += 1
        points = sum(1 for p in rel.pages for e in p['elements'] if e['type'] == 'cercle' and e['visible']
                     and e.get('fond') not in (None, 'motif') and (e['x2'] - e['x1']) * MM <= 2.0)
        sur_rect, centre_c, bord_c = bouts_sur_formes(rel)
        w(u'Bouts posés au milieu d\'un trait horizontal ou vertical (piquages en T) : %d' % t_jonctions)
        w(u'Bouts posés sur le bord d\'un petit rectangle (moins de 10 mm, une broche probable) : %d' % sur_rect)
        w(u'Bouts posés au centre d\'un petit cercle (moins de 10 mm) : %d ; sur son bord : %d' % (centre_c, bord_c))
        w(u'Petits cercles pleins (diamètre <= 2 mm, points de jonction probables) : %d' % points)
        w(u'')
    # -- ou se posent les textes
    w(u'== OÙ SE POSENT LES TEXTES (textes visibles, par motif) ==')
    w(u'(dans un rect. = la boîte du texte tient dans un rectangle de moins d\'une demi-page ; sur un trait = un segment'
      u' parallèle au texte (quel que soit son angle) passe sous le texte ou le traverse, à 2 mm au plus de la ligne de'
      u' base, sous le milieu du texte ; le long d\'un trait = un tel segment à côté du texte, de 2 à 5 mm ; près d\'un'
      u' bout = une extrémité de segment à 2 mm au plus de la boîte du texte)')
    stats_m = {}
    stats_t = {}
    case = 5.0 / MM
    for p in rel.pages:
        W, H = p['W'], p['H']
        rects = Grille(W, H)
        segs = Grille(W, H, case=case)
        bouts = Grille(W, H, case=case)
        vus_segs = set()
        vus_bouts = set()
        vus_rects = set()
        for e in p['elements']:
            if not e['visible']:
                continue
            if e['type'] == 'rectangle':
                rb = e.get('boite') or boite(e)
                # pas le cadre ni le cartouche : un rectangle de moins de la moitie de la page dans chaque sens
                cle = tuple(round(v, 2) for v in rb)
                if rb[2] - rb[0] < 0.5 * W and rb[3] - rb[1] < 0.5 * H and cle not in vus_rects:
                    vus_rects.add(cle)
                    rects.ajouter(rb, e)
            elif e['type'] == 'segment':
                cle = tuple(round(v, 2) for v in (e['x1'], e['y1'], e['x2'], e['y2']))
                if cle in vus_segs:             # un trait empile a l'identique : une fois
                    continue
                vus_segs.add(cle)
                segs.ajouter(e.get('boite') or boite(e), e)
                for (x, y) in ((e['x1'], e['y1']), (e['x2'], e['y2'])):
                    cle = (round(x, 2), round(y, 2))
                    if cle not in vus_bouts:
                        vus_bouts.add(cle)
                        bouts.ajouter((x, y, x, y), (x, y))
        for e in p['elements']:
            if e['type'] != 'texte' or not e['visible']:
                continue
            m = motif(e['texte'])
            tourne = abs(e['uy']) >= 0.01 or e['ux'] < 0
            for table in ((stats_m, stats_t) if tourne else (stats_m,)):
                x = table.setdefault(m, [0, 0, 0, 0, 0])
                x[0] += 1
            b = e.get('boite') or boite(e)
            cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
            dans_rect = False
            for r_ in rects.autour(cx, cy):
                rb = r_.get('boite') or boite(r_)
                if rb[0] <= b[0] + 0.5 and rb[1] <= b[1] + 0.5 and rb[2] >= b[2] - 0.5 and rb[3] >= b[3] - 0.5:
                    dans_rect = True
                    break
            place = texte_sur_un_trait(e, b, segs)
            sur = place == 'sur'
            le_long = place == 'long'
            pres = False
            if not sur:
                d2 = (2 / MM) ** 2
                for (px, py) in bouts.dans(b, 2 / MM):
                    dx = max(b[0] - px, 0, px - b[2])
                    dy = max(b[1] - py, 0, py - b[3])
                    if dx * dx + dy * dy <= d2:
                        pres = True
                        break
            for table in ((stats_m, stats_t) if tourne else (stats_m,)):
                x = table[m]
                x[1] += dans_rect
                x[2] += sur
                x[3] += le_long
                x[4] += pres
    if not stats_m:
        w(u'Aucun texte visible.')
    else:
        for titre, table in ((None, stats_m), (u'Textes tournés (pas de gauche à droite à l\'horizontale) :', stats_t)):
            if not table:
                continue
            if titre:
                w(u'')
                w(titre)
            w(u'motif\ttextes\tdans un rect.\tsur un trait\tle long d\'un trait\tprès d\'un bout')
            for m, (n, dr, st, ll, pb) in sorted(table.items(), key=lambda kv: (-kv[1][0], kv[0]))[:40]:
                w(u'%s\t%d\t%d %%\t%d %%\t%d %%\t%d %%' % (m.replace('\t', ' '), n, round(100.0 * dr / n),
                                                        round(100.0 * st / n), round(100.0 * ll / n), round(100.0 * pb / n)))
    w(u'')


def texte_sur_un_trait(e, b, segs):
    """'sur' : un segment parallele au texte (a 0,5 degre pres, quel que
    soit l'angle : un numero de fil vertical sur un fil vertical compte) passe
    sous lui ou le traverse (a 2 mm au plus sous la ligne de base, au plus a
    0,8 corps au-dessus), sous le milieu du texte ; 'long' : un tel segment a
    cote du texte, de 2 a 5 mm (un repere pose a cote d'un fil) ; sinon None."""
    ux, uy = e['ux'], e['uy']
    nx, ny = uy, -ux                     # vers le haut du texte (y vers le bas)
    corps = e['taille']
    mx = (e['x1'] + e['x2']) / 2
    my = (e['y1'] + e['y2']) / 2
    rendu = None
    for s_ in segs.dans(b, 5 / MM):
        dx, dy = s_['x2'] - s_['x1'], s_['y2'] - s_['y1']
        L = math.hypot(dx, dy)
        if L <= 0:
            continue
        if abs(dx * uy - dy * ux) / L > 0.0087:      # sin 0,5 degre : pas parallele
            continue
        # hauteur du segment au-dessus de la ligne de base, dans le repere du texte
        h = (s_['x1'] - e['x1']) * nx + (s_['y1'] - e['y1']) * ny
        if not (-5 / MM <= h <= 0.8 * corps + 5 / MM):
            continue
        # le milieu du texte se projette-t-il dans le segment ?
        t = ((mx - s_['x1']) * dx + (my - s_['y1']) * dy) / (L * L)
        if 0.0 <= t <= 1.0:
            if -2 / MM <= h <= 0.8 * corps:
                return 'sur'
            rendu = 'long'
    return rendu


def bouts_sur_formes(rel):
    """Les bouts de segment poses sur le bord d'un petit rectangle (une broche,
    une borne), au centre d'un petit cercle (un point de jonction) ou sur son
    bord (une broche ronde) : a 0,1 mm pres, formes de moins de 10 mm."""
    tol = 0.1 / MM
    petit = 10 / MM
    sur_rect = centre = bord = 0
    for p in rel.pages:
        g = Grille(p['W'], p['H'], case=5.0 / MM)
        vus = set()
        for e in p['elements']:
            if e['visible'] and e['type'] in ('rectangle', 'cercle'):
                b = e.get('boite') or boite(e)
                cle = (e['type'],) + tuple(round(v, 2) for v in b)
                if max(b[2] - b[0], b[3] - b[1]) <= petit and cle not in vus:
                    vus.add(cle)
                    g.ajouter(b, e)
        if not g.cases:
            continue
        vus = set()
        for e in p['elements']:
            if e['type'] != 'segment' or not e['visible']:
                continue
            cle = tuple(round(v, 2) for v in (e['x1'], e['y1'], e['x2'], e['y2']))
            if cle in vus:
                continue
            vus.add(cle)
            for (x, y) in ((e['x1'], e['y1']), (e['x2'], e['y2'])):
                for f in g.dans((x, y, x, y), tol):
                    b = f.get('boite') or boite(f)
                    if f['type'] == 'rectangle':
                        dedans = b[0] - tol <= x <= b[2] + tol and b[1] - tol <= y <= b[3] + tol
                        pres_bord = min(abs(x - b[0]), abs(x - b[2]), abs(y - b[1]), abs(y - b[3])) <= tol
                        if dedans and pres_bord:
                            sur_rect += 1
                            break
                    else:
                        cx, cy, rr = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2, (b[2] - b[0] + b[3] - b[1]) / 4
                        d = math.hypot(x - cx, y - cy)
                        if d <= tol:
                            centre += 1
                            break
                        if abs(d - rr) <= tol:
                            bord += 1
                            break
    return sur_rect, centre, bord


def ecrire_caches(w, rel, clair):
    """Ce qui porte du texte sans se dessiner : les annotations et le contenu
    marque (ActualText, Alt, cles propres d'un logiciel). Les etiquettes et
    les cles de la norme sont nommees ; les autres (un logiciel peut les
    nommer d'apres le projet, Word d'apres un style de l'utilisateur) ne le
    sont que si elles sont faites de mots ordinaires, sinon par un code et
    leur forme (E1, K1)."""
    M = rel.masques
    ann = [e for p in rel.pages for e in p['elements'] if e['type'] == 'annotation']
    if ann:
        w(u'== ANNOTATIONS ==')
        sortes = {}
        for e in ann:
            x = sortes.setdefault(nom_montrable(e['sorte'], 'S', M), [0, 0, 0])
            x[0] += 1
            if e['texte']:
                x[1] += 1
            if not e['visible']:
                x[2] += 1
        for k, (n, avec, invis) in sorted(sortes.items()):
            w(u'  %s : %d (avec un texte : %d ; invisibles : %d)' % (k, n, avec, invis))
        h, n = histogramme([(e['source'], motif(e['texte'])) for e in ann if e['texte']], 40)
        if h:
            w(u'  Motifs des textes d\'annotation (source ; motif ; nombre) :')
            for (src, m), v in h:
                w(u'    %s\t%s\t%d' % (src, m, v))
            if clair:
                for e in ann[:50]:
                    if e['texte']:
                        w(u'    en clair : %s' % e['texte'])
        w(u'')
    marques, cles, textes = {}, {}, []
    for p in rel.pages:
        for k, v in (p.get('marques') or {}).items():
            k = nom_montrable(k, 'E', M)
            marques[k] = marques.get(k, 0) + v
        for k, v in (p.get('cles_marques') or {}).items():
            k = nom_montrable(k, 'K', M)
            cles[k] = cles.get(k, 0) + v
        textes.extend(p.get('textes_marques') or [])
    if marques or cles or textes:
        w(u'== CONTENU MARQUÉ (BDC / BMC) ==')
        w(u'  Étiquettes : ' + ', '.join(u'%s : %d' % (k, v) for k, v in sorted(marques.items(), key=lambda x: (-x[1], x[0]))[:20]))
        if cles:
            w(u'  Clés des propriétés : ' + ', '.join(u'%s : %d' % (k, v) for k, v in sorted(cles.items(), key=lambda x: (-x[1], x[0]))[:20]))
        if textes:
            w(u'  %d texte(s) caché(s) dans les propriétés (ils ne se dessinent pas) ; motifs (clé ; motif ; nombre) :' % len(textes))
            h, n = histogramme([(nom_montrable(k, 'K', M), motif(t)) for k, t in textes], 60)
            for (k, m), v in h:
                w(u'    %s\t%s\t%d' % (k, m, v))
            if n > len(h):
                w(u'    ... et %d motifs de plus' % (n - len(h)))
            if clair:
                for k, t in textes[:50]:
                    w(u'    en clair : %s = %s' % (k, t))
        w(u'')


def ecrire_non_dessinees(w, rel, clair):
    """Les donnees qu'un logiciel range dans le PDF sans les dessiner (la ou
    seraient des normes ou des references « dans le PDF mais invisibles ») :
    noms des cles (ou leur code), motif des valeurs."""
    c = rel.cachees
    if not c:
        return
    M = rel.masques
    lignes = {}
    for (lieu, chemin, valeur, genre) in c['entrees']:
        nom = u' / '.join(nom_montrable(k, 'K', M) for k in chemin)
        if valeur is None:
            v = u'(%s)' % genre
        elif clair:
            v = u'« %s »' % valeur
        else:
            v = u'« %s »' % motif(valeur)[:80]
        cle = (lieu, nom, v)
        lignes[cle] = lignes.get(cle, 0) + 1
    xmp = {}
    for (lieu, prop, valeur) in c['xmp']:
        pre, _, nom = prop.partition(':')
        nom_m = nom_montrable(pre, 'K', M, connus=_PREFIXES_XMP) + u':' + nom_montrable(nom, 'K', M)
        v = valeur if clair else motif(valeur)[:80]
        cle = (lieu, nom_m, u'« %s »' % v)
        xmp[cle] = xmp.get(cle, 0) + 1
    st = c.get('structure')
    if not lignes and not xmp and not st:
        return
    w(u'== DONNÉES NON DESSINÉES (métadonnées, propriétés, structure) ==')
    w(u'(là où un logiciel range des références qui ne se dessinent pas : clés hors norme de /Info, du catalogue,')
    w(u' des pages, /PieceInfo, propriétés XMP, arbre de structure ; les clés de la norme ou faites de mots ordinaires')
    w(u' sont nommées, les autres par un code et leur forme ; les valeurs, par leur motif)')
    if lignes:
        for (lieu, nom, v), n in sorted(lignes.items(), key=lambda x: (x[0][0], -x[1], x[0][1]))[:300]:
            w(u'  %s\t%s = %s%s' % (lieu, nom, v, (u'\t(%d fois)' % n) if n > 1 else u''))
        if len(lignes) > 300:
            w(u'  ... et %d de plus' % (len(lignes) - 300))
    if xmp:
        w(u'  Propriétés XMP :')
        for (lieu, nom, v), n in sorted(xmp.items(), key=lambda x: (x[0][0], x[0][1]))[:300]:
            w(u'  %s\t%s = %s%s' % (lieu, nom, v, (u'\t(%d fois)' % n) if n > 1 else u''))
    if st:
        types = {}
        for k, v in st['types'].items():
            k = k if (k in _NOMS_PDF and k not in st['roles']) else nom_montrable(k, 'R', M)
            types[k] = types.get(k, 0) + v
        w(u'  Structure (PDF balisé) : %d élément(s) ; types : %s' % (
            st['elements'], u', '.join(u'%s %d' % (k, v) for k, v in sorted(types.items(), key=lambda x: (-x[1], x[0]))[:20])))
        if st['textes']:
            h, n = histogramme([(nom_montrable(k.split('/')[-1] if k.startswith('A/') else k, 'K', M),
                                 t if clair else motif(t)[:80]) for k, t in st['textes']], 60)
            w(u'  Textes de la structure (/Alt, /ActualText, /E, /T, attributs) : %d ; (clé ; motif ; nombre) :' % len(st['textes']))
            for (k, m), v in h:
                w(u'    %s\t%s\t%d' % (k, m, v))
            if n > len(h):
                w(u'    ... et %d motifs de plus' % (n - len(h)))
        if st['attributs']:
            w(u'  Attributs : ' + u', '.join(u'%s/%s %d' % (nom_montrable(o, 'K', M), nom_montrable(k, 'K', M), v)
                                            for (o, k), v in sorted(st['attributs'].items(), key=lambda x: -x[1])[:30]))
    w(u'')


def ecrire_motifs(w, rel, clair):
    d = {}
    for p in rel.pages:
        for e in p['elements']:
            if e['type'] != 'texte':
                continue
            m = motif(e['texte'])
            x = d.setdefault(m, {'n': 0, 'tailles': {}, 'angles': set(), 'invisibles': 0, 'textes': {}})
            x['n'] += 1
            t = round(e['taille'], 1)
            x['tailles'][t] = x['tailles'].get(t, 0) + 1
            x['angles'].add(angle_arrondi(e['angle']))
            if not e['visible']:
                x['invisibles'] += 1
            if clair:
                x['textes'][e['texte']] = x['textes'].get(e['texte'], 0) + 1
    if not d:
        return
    w(u'== DICTIONNAIRE DES MOTIFS ==')
    w(u'(chaque texte réduit à sa forme : majuscule -> A, minuscule -> a, chiffre -> 9 ; les autres signes gardés ;')
    w(u' %s = glyphe sans caractère connu)' % INCONNU)
    w(u'%d motifs différents pour %d textes.' % (len(d), sum(x['n'] for x in d.values())))
    w(u'motif\toccurrences\tcorps le plus fréquent (pt)\tangles (°)\tinvisibles')
    tri = sorted(d.items(), key=lambda kv: (-kv[1]['n'], kv[0]))
    LIMITE = 3000
    for m, x in tri[:LIMITE]:
        t = sorted(x['tailles'].items(), key=lambda kv: -kv[1])[0][0]
        w(u'%s\t%d\t%s\t%s\t%s' % (m.replace('\t', ' '), x['n'], fr(t), ','.join(str(a) for a in sorted(x['angles'])),
                                    x['invisibles'] or ''))
        if clair:
            exemples = sorted(x['textes'].items(), key=lambda kv: -kv[1])[:5]
            w(u'\t  en clair : ' + u' | '.join(u'%s (%d)' % (k, v) for k, v in exemples))
    if len(tri) > LIMITE:
        w(u'... et %d motifs plus rares (tous sont dans le TSV)' % (len(tri) - LIMITE))
    w(u'')


# ===========================================================================
#  17. Le programme
# ===========================================================================

def bibliotheques():
    """Les bibliotheques PDF presentes (et leur version)."""
    sortie = []
    fitz = importer_pymupdf()
    sortie.append(('PyMuPDF', version_pymupdf(fitz) if fitz else None))
    for nom, mod in (('pdfminer.six', 'pdfminer'), ('pdfplumber', 'pdfplumber'), ('pypdf', 'pypdf'),
                     ('PyPDF2', 'PyPDF2'), ('pikepdf', 'pikepdf'), ('reportlab', 'reportlab')):
        try:
            m = __import__(mod)
            sortie.append((nom, str(getattr(m, '__version__', getattr(m, 'Version', '?')))))
        except Exception:
            sortie.append((nom, None))
    return sortie, fitz


def lister_pdf(chemins):
    r"""Les PDF des chemins donnes (fichiers ou dossiers, parcourus en
    entier). Sous Windows, le parcours d'un dossier passe toujours par le
    prefixe \\?\ : sinon os.walk saute EN SILENCE un sous-dossier de plus de
    260 caracteres (frequent sur un partage reseau) ; un dossier illisible
    est compte et dit a l'ecran."""
    fichiers = []
    illisibles = [0]

    def erreur(_e):
        illisibles[0] += 1
    for c in chemins:
        c = c.strip().strip('"')
        if not c:
            continue
        if os.path.isdir(chemin_long(c)):
            racine0 = os.path.abspath(c)
            if os.name == 'nt' and not racine0.startswith('\\\\?\\'):
                racine0 = ('\\\\?\\UNC\\' + racine0[2:]) if racine0.startswith('\\\\') else ('\\\\?\\' + racine0)
            for racine, dossiers, noms in os.walk(racine0, onerror=erreur):
                dossiers.sort()
                for n in sorted(noms):
                    if n.lower().endswith('.pdf'):
                        fichiers.append(os.path.join(racine, n))
        elif os.path.isfile(chemin_long(c)):
            fichiers.append(c)
        else:
            dire('  introuvable : un des chemins donnes (ignore)')
    if illisibles[0]:
        dire('  %d dossier(s) n\'ont pas pu etre lus (droits ?) : leurs PDF manquent' % illisibles[0])
    return fichiers


def lire_plages(texte):
    s = set()
    for morceau in re.split(r'[;,]', texte or ''):
        morceau = morceau.strip()
        m = re.match(r'^(\d+)\s*-\s*(\d+)$', morceau)
        if m:
            s.update(range(int(m.group(1)), min(int(m.group(2)), int(m.group(1)) + 100000) + 1))
        elif morceau.isdecimal():            # pas isdigit() : « ² » en est un, et int() le refuse
            s.add(int(morceau))
    return s


SUFFIXE_CLAIR = '.EN-CLAIR'


def dossier_rapports(options):
    """Le dossier des rapports et ce qu'on en dit a l'ecran (jamais le chemin
    complet : il porte l'identifiant Windows, parfois un nom de projet).
    Avec --clair, un dossier a part par defaut (« rapports-EN-CLAIR ») : un
    releve en clair ne se melange pas aux releves anonymises."""
    nom_defaut = 'rapports-EN-CLAIR' if options.get('clair') else 'rapports'
    if options.get('sortie'):
        d = options['sortie']
        montre = u'"%s" (donne par --sortie)' % os.path.basename(os.path.normpath(d))
    else:
        d = os.path.join(os.path.dirname(os.path.abspath(__file__)), nom_defaut)
        montre = u'"%s", a cote de la sonde' % nom_defaut
    try:
        os.makedirs(chemin_long(d), exist_ok=True)
        essai = os.path.join(d, '.essai-ecriture')
        with open(chemin_long(essai), 'w') as f:
            f.write('x')
        os.remove(chemin_long(essai))
        return d, montre
    except Exception:
        repli = os.path.join(os.path.expanduser('~'), 'Documents', 'sonde-pdf-' + nom_defaut)
        montre = u'"sonde-pdf-%s" dans tes Documents' % nom_defaut
        try:
            os.makedirs(chemin_long(repli), exist_ok=True)
        except Exception:
            import tempfile
            repli = os.path.join(tempfile.gettempdir(), 'sonde-pdf-' + nom_defaut)
            montre = u'"sonde-pdf-%s" dans le dossier temporaire de Windows (%%TEMP%%)' % nom_defaut
            os.makedirs(repli, exist_ok=True)
        dire('Le dossier a cote du script n\'est pas modifiable : rapports ecrits dans le dossier %s' % montre)
        return repli, montre


def prochain_numero(dossier):
    n = 0
    try:
        for nom in os.listdir(chemin_long(dossier)):
            m = re.match(r'^(\d+)-[0-9a-f]{8}[.]', nom)
            if m:
                n = max(n, int(m.group(1)))
    except Exception:
        pass
    return n + 1


# ---------------------------------------------------------------------------
#  Le double-clic : sans chemin, la fenetre de choix, l'Explorateur, l'attente
# ---------------------------------------------------------------------------

DOSSIER_A_LIRE = 'PDF-A-LIRE'


def dossier_de_la_sonde():
    return os.path.dirname(os.path.abspath(__file__))


def sans_fenetre():
    """SONDE_SANS_FENETRE=1 : ni fenetre de choix, ni Explorateur, ni attente
    (les tests, un lancement par un autre programme)."""
    return os.environ.get('SONDE_SANS_FENETRE', '').strip() not in ('', '0')


def ouvrir_dans_l_explorateur(dossier):
    """Ouvre le dossier dans l'Explorateur de Windows ; rend True si c'est
    fait. Ailleurs que sous Windows, ou avec SONDE_SANS_FENETRE : rien."""
    if os.name != 'nt' or sans_fenetre():
        return False
    try:
        os.startfile(os.path.abspath(dossier))
        return True
    except Exception:
        return False


def choisir_dans_une_fenetre():
    """La fenetre « Ouvrir » de Windows (tkinter), pour choisir un ou plusieurs
    PDF ; rend la liste des fichiers choisis, vide si l'on annule, si tkinter
    manque, s'il n'y a pas d'ecran ou avec SONDE_SANS_FENETRE."""
    if sans_fenetre():
        return []
    try:
        import tkinter
        from tkinter import filedialog
    except Exception:
        return []
    racine = None
    try:
        racine = tkinter.Tk()
        racine.withdraw()
        try:
            racine.attributes('-topmost', True)   # devant la fenetre noire
        except Exception:
            pass
        dire('Une fenetre s\'ouvre pour choisir les plans PDF (elle est peut-etre derriere celle-ci).')
        noms = filedialog.askopenfilenames(
            parent=racine, title=u'Sonde PDF : choisis 2 ou 3 plans PDF (Ctrl enfoncé pour en prendre plusieurs)',
            filetypes=[('Plans PDF', '*.pdf *.PDF')])
        return [n for n in racine.tk.splitlist(noms) if n] if noms else []
    except Exception:
        return []
    finally:
        if racine is not None:
            try:
                racine.destroy()
            except Exception:
                pass


def pdf_sans_chemin():
    """Les PDF a lire quand aucun chemin n'est donne (un double-clic) : ceux du
    dossier PDF-A-LIRE, a cote de la sonde ; s'il n'y en a pas, ceux choisis
    dans une fenetre ; sinon, aucun : le dossier est cree et ouvert, et l'ecran
    dit quoi faire. L'ecran ne montre jamais un chemin, ni un nom de PDF."""
    a_lire = os.path.join(dossier_de_la_sonde(), DOSSIER_A_LIRE)
    if os.path.isdir(chemin_long(a_lire)):
        fichiers = lister_pdf([a_lire])
        if fichiers:
            dire('Les PDF du dossier "%s", a cote de la sonde (ils y restent : pour en lire d\'autres, '
                 'remplace-les).' % DOSSIER_A_LIRE)
            return fichiers
    choisis = choisir_dans_une_fenetre()
    if choisis:
        fichiers = lister_pdf(choisis)
        dire('%d PDF choisi(s) dans la fenetre.' % len(fichiers))
        if fichiers:
            return fichiers
    try:
        os.makedirs(chemin_long(a_lire), exist_ok=True)
    except Exception:
        dire('')
        dire('Aucun PDF a lire, et le dossier "%s" n\'a pas pu etre cree a cote de la sonde' % DOSSIER_A_LIRE)
        dire('(dossier protege ?). Sors le kit du zip (clic droit, "Extraire tout"), puis recommence.')
        return []
    ouvert = ouvrir_dans_l_explorateur(a_lire)
    dire('')
    dire('Aucun PDF a lire. Le dossier "%s" est pret, a cote de la sonde%s.' % (
        DOSSIER_A_LIRE, ' (il vient de s\'ouvrir)' if ouvert else ''))
    dire('  1. Copie dedans 2 ou 3 plans PDF : un simple, un charge, un avec des connecteurs.')
    dire('  2. Puis lance de nouveau la sonde : double-clic sur sonde_pdf.py.')
    dire('Rien n\'est envoye nulle part, rien n\'est modifie dans les PDF.')
    return []


def fin_du_releve(dossier, montre, clair, ecrits):
    """Ce que l'ecran dit a la fin (celui de sonde-pdf.bat avant), et, sous
    Windows, le dossier des rapports qui s'ouvre."""
    if not ecrits:
        return
    if not clair:
        dire('Ils ne contiennent aucun texte reel des plans, ni le nom des fichiers, ni de nom propre.')
        dire('Le .elements.tsv contient la GEOMETRIE du dessin (les traits, sans les textes) :')
        dire('a toi de voir si tu peux l\'envoyer ; le .rapport.txt seul suffit pour commencer.')
        try:
            vieux = [n for n in os.listdir(chemin_long(dossier)) if 'EN-CLAIR' in n]
        except Exception:
            vieux = []
        if vieux:
            dire('ATTENTION : ce dossier contient aussi des fichiers EN-CLAIR (vrais textes des plans) :')
            dire('ne les envoyer que pour un plan que l\'on a le droit de montrer.')
        if os.path.isdir(chemin_long(os.path.join(dossier_de_la_sonde(), 'rapports-EN-CLAIR'))):
            dire('ATTENTION : le dossier "rapports-EN-CLAIR", a cote de la sonde, contient des releves EN CLAIR')
            dire('(vrais textes) : ne pas les envoyer sans accord.')
    ouvrir_dans_l_explorateur(dossier)


def processus_de_la_console():
    """Sous Windows, le nom (en minuscules) des AUTRES processus attaches a la
    console de la sonde (None pour un nom illisible) ; None si l'on ne sait
    pas (pas de console, pas Windows)."""
    if os.name != 'nt':
        return None
    try:
        import ctypes
        from ctypes import wintypes
        k = ctypes.WinDLL('kernel32', use_last_error=True)
        k.GetConsoleProcessList.argtypes = [ctypes.POINTER(wintypes.DWORD), wintypes.DWORD]
        k.GetConsoleProcessList.restype = wintypes.DWORD
        k.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
        k.OpenProcess.restype = wintypes.HANDLE
        k.QueryFullProcessImageNameW.argtypes = [wintypes.HANDLE, wintypes.DWORD, wintypes.LPWSTR,
                                                 ctypes.POINTER(wintypes.DWORD)]
        k.QueryFullProcessImageNameW.restype = wintypes.BOOL
        k.CloseHandle.argtypes = [wintypes.HANDLE]
        pids = (wintypes.DWORD * 64)()
        n = k.GetConsoleProcessList(pids, 64)
        if n < 1 or n > 64:
            return None
        noms = []
        for i in range(n):
            if pids[i] == os.getpid():
                continue
            h = k.OpenProcess(0x1000, False, pids[i])     # PROCESS_QUERY_LIMITED_INFORMATION
            if not h:
                noms.append(None)
                continue
            try:
                tampon = ctypes.create_unicode_buffer(1024)
                taille = wintypes.DWORD(1024)
                ok_ = k.QueryFullProcessImageNameW(h, 0, tampon, ctypes.byref(taille))
                noms.append(re.split(r'[\\/]', tampon.value)[-1].lower() if ok_ else None)
            finally:
                k.CloseHandle(h)
        return noms
    except Exception:
        return None


def console_a_soi(autres):
    """Vrai si la console a ete creee pour la sonde : aucun autre processus n'y
    est attache, sauf Python lui-meme (py.exe, le lanceur d'un double-clic ;
    python.exe, celui d'un venv). Une invite de commandes (cmd.exe, donc aussi
    sonde-pdf.bat), PowerShell ou un nom illisible : non, elle n'est pas a soi."""
    if autres is None:
        return False
    return all(n and re.match(r'^py[a-z0-9._-]*\.exe$', n) for n in autres)


def attendre_entree():
    """« Appuie sur Entree » : ne bloque ni ne plante jamais si l'entree est
    fermee (fin de fichier) ou absente."""
    try:
        dire('')
        sys.stdout.write('Appuie sur Entree pour fermer cette fenetre.')
        sys.stdout.flush()
    except Exception:
        pass
    try:
        if sys.stdin is not None:
            sys.stdin.readline()
    except (Exception, KeyboardInterrupt):
        pass


def doit_attendre():
    """Garder la fenetre ouverte a la fin : seulement sous Windows, sans
    SONDE_SANS_FENETRE, quand la console a ete creee pour la sonde (double-clic,
    PDF glisses sur le .py)."""
    if os.name != 'nt' or sans_fenetre():
        return False
    return console_a_soi(processus_de_la_console())


def ecran_sans_chemin():
    """Rien de Python ne s'ecrit plus avec un chemin : ni traceback (meme d'un
    fil ou d'un objet detruit), ni avertissement (qui donne le fichier et la
    ligne). Seulement la classe."""
    def accroche(genre, valeur, pile):
        dire('Erreur imprevue de la sonde (%s).' % getattr(genre, '__name__', 'Exception'))
    sys.excepthook = accroche
    if hasattr(sys, 'unraisablehook'):
        sys.unraisablehook = lambda u: None
    try:
        import threading
        threading.excepthook = lambda a: accroche(a.exc_type, None, None)
    except Exception:
        pass
    try:
        import warnings

        def avertissement(message, categorie, *_a, **_k):
            dire('  (avertissement de Python : %s)' % getattr(categorie, '__name__', 'Warning'))
        warnings.showwarning = avertissement
    except Exception:
        pass


def ligne_de_l_erreur(e):
    """« , ligne 1234 » : la derniere ligne de ce script par ou l'exception
    est passee (de quoi la retrouver), jamais un chemin ; vide si inconnue."""
    try:
        import traceback
        nom = os.path.basename(__file__)
        lignes = [f.lineno for f in traceback.extract_tb(e.__traceback__) if os.path.basename(f.filename) == nom]
        return ', ligne %d' % lignes[-1] if lignes else ''
    except Exception:
        return ''


def lancer(argv):
    """Le point d'entree de la ligne de commande et du double-clic : aucune
    exception ne sort (seulement sa classe et un message en francais), puis
    l'attente d'Entree si la fenetre a ete ouverte pour la sonde."""
    ecran_sans_chemin()
    try:
        code = principal(argv)
    except KeyboardInterrupt:
        dire('Interrompu.')
        code = 130
    except Exception as e:
        dire('')
        dire('La sonde s\'est arretee sur une erreur imprevue (%s%s). Rien n\'a ete envoye.' % (
            e.__class__.__name__, ligne_de_l_erreur(e)))
        dire('Prends cet ecran en photo et envoie-la-moi.')
        code = 3
    try:
        if doit_attendre():
            attendre_entree()
    except (Exception, KeyboardInterrupt):
        pass
    return code


def principal(argv):
    options = {'clair': False, 'lecteur': 'auto', 'pages': None, 'sortie': None, 'mot_de_passe': '', 'delai': DELAI_PDF}
    chemins = []
    for a in argv:
        if a == '--clair':
            options['clair'] = True
        elif a.startswith('--lecteur='):
            options['lecteur'] = a.split('=', 1)[1].strip().lower()
        elif a.startswith('--pages='):
            options['pages'] = lire_plages(a.split('=', 1)[1])
            if not options['pages']:
                dire('--pages : aucun numero de page compris (par exemple --pages=1-3,7) ; toutes les pages sont lues.')
        elif a.startswith('--sortie='):
            options['sortie'] = a.split('=', 1)[1]
        elif a.startswith('--mot-de-passe='):
            options['mot_de_passe'] = a.split('=', 1)[1]
        elif a.startswith('--delai='):
            try:
                options['delai'] = max(1.0, float(a.split('=', 1)[1].replace(',', '.')))
            except ValueError:
                dire('--delai= un nombre de secondes')
                return 2
        elif a in ('-h', '--help', '/?', '--aide'):
            dire(__doc__.strip())
            return 0
        elif a.startswith('--'):
            # seulement le nom de l'option : la valeur peut etre un mot de passe mal tape
            dire('Option inconnue : %s (voir --aide)' % a.split('=', 1)[0][:40])
            return 2
        else:
            chemins.append(a)
    if options['lecteur'] not in ('auto', 'standard', 'pymupdf'):
        dire('--lecteur= auto, standard ou pymupdf')
        return 2
    dire('Sonde PDF %s -- Python %s' % (VERSION_SONDE, sys.version.split()[0]))
    if sys.version_info < (3, 8):
        dire('Attention : Python %s est plus ancien que 3.8 ; la sonde peut echouer.' % sys.version.split()[0])
    if not chemins:
        fichiers = pdf_sans_chemin()
        if not fichiers:
            return 1
    else:
        fichiers = lister_pdf(chemins)
        if not fichiers:
            dire('Aucun PDF a lire. Donner un ou plusieurs PDF (ou un dossier) : python sonde_pdf.py fichier.pdf [dossier]')
            dire('ou les mettre dans le dossier "%s", a cote de la sonde, et la lancer sans rien.' % DOSSIER_A_LIRE)
            return 1
    libs, fitz = bibliotheques()
    if options['lecteur'] == 'standard':
        fitz_util = None
    else:
        fitz_util = fitz
        if options['lecteur'] == 'pymupdf' and fitz is None:
            dire('PyMuPDF n\'est pas installe : lecteur standard.')
    clair = options['clair']
    if clair:
        dire('')
        dire('ATTENTION : --clair. Les rapports contiendront les VRAIS TEXTES, le nom des fichiers et toute la')
        dire('geometrie des plans. Ils sont ecrits a part (fichiers ...EN-CLAIR...) : ne les envoyer que pour')
        dire('un plan que l\'on a le droit de montrer.')
        dire('')
    dossier, montre = dossier_rapports(options)
    numero = prochain_numero(dossier)
    import platform
    systeme = '%s %s' % (platform.system(), platform.release())
    dire('%d PDF a lire ; rapports dans le dossier %s' % (len(fichiers), montre))
    suffixe = SUFFIXE_CLAIR if clair else ''
    ecrits = 0
    for chemin in fichiers:
        try:
            with open(chemin_long(chemin), 'rb') as f:
                data = f.read()
        except Exception as e:
            dire('  un fichier n\'a pas pu etre ouvert (%s)' % e.__class__.__name__)
            continue
        empreinte = hashlib.sha1(data).hexdigest()[:8]
        base = '%02d-%s%s' % (numero, empreinte, suffixe)
        numero += 1
        dire('  PDF %s (%s Ko)...' % (base, len(data) // 1024))
        try:
            rel = relever(data, options, fitz_util)
        except Exception as e:                   # filet ultime : jamais de plantage
            rel = Releve()
            rel.erreur = 'erreur inattendue de la sonde : %s' % e.__class__.__name__
        index_calques = index_des_calques(rel)
        entete = [
            (u'Version de la sonde', VERSION_SONDE),
            (u'Date du relevé', datetime.datetime.now().strftime('%Y-%m-%d %H:%M')),
            (u'Python', '%s (%s)' % (sys.version.split()[0], systeme)),
            (u'Bibliothèques', ', '.join(u'%s %s' % (n, v) if v else u'%s absente' % n for n, v in libs)),
            (u'Fichier', u'n° %02d, empreinte %s (SHA-1 du contenu), %s Ko' % (numero - 1, empreinte, fr(len(data) / 1024.0, 0))),
        ]
        if clair:
            entete.append((u'Nom du fichier', os.path.basename(chemin)))
        try:
            ecrire_rapport(os.path.join(dossier, base + '.rapport.txt'), rel, entete, options, index_calques)
            ecrire_tsv(os.path.join(dossier, base + '.elements.tsv'), rel, index_calques, clair)
            ecrits += 1
        except Exception as e:
            dire('  impossible d\'ecrire le rapport (%s)' % e.__class__.__name__)
            continue
        if rel.erreur:
            dire('    -> illisible (voir le rapport)')
        else:
            v, _ = verdict_document([p['verdict'] for p in rel.pages])
            n = sum(len(p['elements']) for p in rel.pages)
            dire('    -> %d page(s), %d elements, %s (%s s)' % (len(rel.pages), n, v, fr(rel.duree, 1)))
    dire('')
    dire('%d rapport(s) ecrit(s) dans le dossier %s' % (ecrits, montre))
    if clair:
        dire('ATTENTION : ces rapports sont EN CLAIR (vrais textes, noms des fichiers).')
    fin_du_releve(dossier, montre, clair, ecrits)
    return 0 if ecrits else 1


if __name__ == '__main__':
    sys.exit(lancer(sys.argv[1:]))
