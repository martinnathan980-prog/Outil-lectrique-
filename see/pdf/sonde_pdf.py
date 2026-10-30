# -*- coding: utf-8 -*-
"""
SONDE PDF -- Atelier Schema, le releve ANONYMISE d'un schema electrique en PDF
=============================================================================

    python sonde_pdf.py <fichier.pdf | dossier> [...] [options]

Lit chaque PDF et ecrit, a cote de ce script dans le dossier « rapports »,
deux fichiers par PDF, nommes d'apres un numero d'ordre et une empreinte
courte du CONTENU (jamais d'apres le nom du PDF, qui peut etre confidentiel) :

    NN-xxxxxxxx.rapport.txt    le rapport en francais (UTF-8 avec BOM, CRLF)
    NN-xxxxxxxx.elements.tsv   une ligne par element graphique ou texte

PAR DEFAUT RIEN DE REEL NE SORT : chaque texte est reduit a sa forme (lettre
majuscule -> A, minuscule -> a, chiffre -> 9, les autres signes gardes), aucun
nom de fichier, aucun nom de calque, aucune metadonnee de personne ou de
projet. Le format du TSV est decrit dans LISEZMOI.md (meme dossier).

Options :
    --clair             ecrit AUSSI les textes reels (pour un PDF que l'on a
                        le droit de montrer) ; le rapport le dit en tete
    --sortie=DOSSIER    ailleurs que « rapports » a cote du script
    --lecteur=auto|standard|pymupdf
                        auto (defaut) : PyMuPDF s'il est installe, sinon le
                        lecteur ecrit ici en bibliotheque standard seule
    --deux              lit avec les deux lecteurs (si PyMuPDF est la) et dit
                        dans le rapport s'ils sont d'accord
    --pages=1-3,7       seulement ces pages
    --mot-de-passe=XXX  le mot de passe d'ouverture d'un PDF protege

Le coeur n'utilise que la bibliotheque standard de Python (3.8 et plus).
Ce qui n'est pas gere se DIT dans le rapport ; un PDF illisible donne un
rapport qui le dit, jamais un plantage du releve.
"""
from __future__ import division

import binascii
import codecs
import datetime
import hashlib
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
    """Une erreur de lecture du PDF (structure, objet, filtre...)."""


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
    AES-256 (R5 et R6), avec le mot de passe utilisateur (vide par defaut)."""

    def __init__(self, enc, id0, mot_de_passe=b''):
        self.enc = enc
        self.v = entier(enc.get('V'), 0)
        self.r = entier(enc.get('R'), 0)
        self.methode = ''
        self.cle = None
        self.stmf = 'RC4'
        self.strf = 'RC4'
        self.encrypt_meta = enc.get('EncryptMetadata', True) is not False
        filtre = enc.get('Filter')
        if filtre != 'Standard':
            raise ErreurPDF('chiffrement par le gestionnaire %s (pas le standard) : non gere' % (filtre,))
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
        if self.r <= 4:
            if self.r == 2:
                n = 5
            else:
                n = max(5, min(16, longueur // 8))
            self.n = n
            o = octets(enc.get('O'))[:32]
            u = octets(enc.get('U'))
            p = entier(enc.get('P'), 0)
            mdp = (mot_de_passe + BOURRAGE)[:32]
            h = hashlib.md5(mdp + o + struct.pack('<i', p if p < 2 ** 31 else p - 2 ** 32) + id0)
            if self.r >= 4 and not self.encrypt_meta:
                h.update(b'\xff\xff\xff\xff')
            cle = h.digest()
            if self.r >= 3:
                for _ in range(50):
                    cle = hashlib.md5(cle[:n]).digest()
            cle = cle[:n]
            # verification du mot de passe utilisateur
            if self.r == 2:
                ok = rc4(cle, BOURRAGE) == u[:32]
            else:
                x = rc4(cle, hashlib.md5(BOURRAGE + id0).digest())
                for i in range(1, 20):
                    x = rc4(bytes(c ^ i for c in cle), x)
                ok = x[:16] == u[:16]
            if not ok:
                raise ErreurPDF('protege par un mot de passe a l\'ouverture')
            self.cle = cle
            if self.v == 4:
                m = self.stmf if self.stmf != 'aucun' else self.strf
                self.methode = 'AES-128' if m == 'AES128' else ('RC4 %d bits' % (n * 8))
            else:
                self.methode = 'RC4 %d bits' % (n * 8)
        elif self.r in (5, 6):
            mdp = mot_de_passe[:127]
            u = octets(enc.get('U'))
            ue = octets(enc.get('UE'))
            if len(u) < 48 or len(ue) < 32:
                raise ErreurPDF('dictionnaire de chiffrement AES-256 incomplet')
            if self.r == 5:
                ok = hashlib.sha256(mdp + u[32:40]).digest() == u[:32]
                cle_inter = hashlib.sha256(mdp + u[40:48]).digest()
            else:
                ok = hash_r6(mdp, u[32:40], b'') == u[:32]
                cle_inter = hash_r6(mdp, u[40:48], b'')
            if not ok:
                raise ErreurPDF('protege par un mot de passe a l\'ouverture')
            self.cle = AES(cle_inter).dechiffrer_cbc(b'\x00' * 16, ue[:32])
            self.methode = 'AES-256 (R%d)' % self.r
            self.stmf = self.stmf if self.v == 5 else 'AES256'
        else:
            raise ErreurPDF('revision de chiffrement R%d non geree' % self.r)

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

    def __init__(self, data, notes, mot_de_passe=b''):
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
            self.raisons_reconstruction.append(str(e))
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
                except ErreurPDF as e:
                    self.erreur_chiffrement = str(e)
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
        p = 0
        for k in range(0, len(index) - 1, 2):
            premier, nombre = entier(index[k]), entier(index[k + 1])
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
                self.notes.ajouter('filtre %s non gere (flux ignore)' % f)
                raise ErreurPDF('filtre %s non gere' % f)
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
            self.notes.ajouter('police sans /Widths ni metrique standard : largeurs estimees (%s)' % nettoyer_nom_police(self.nom))
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
                    self.notes.ajouter('CMap predefinie %s non geree : codes lus sur deux octets' % n)
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
            self.notes.ajouter('police composite sans ToUnicode : caracteres inconnus (%s)' % nettoyer_nom_police(self.nom))

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


def nettoyer_nom_police(nom):
    """Le nom d'une police tel qu'on peut le montrer : sans prefixe de
    sous-ensemble, en caracteres simples, 60 au plus."""
    nom = nom or ''
    if '+' in nom[:8]:
        nom = nom.split('+', 1)[1]
    nom = re.sub(r'[^A-Za-z0-9 ,._+-]', '', nom)[:60]
    return nom or '?'


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

    def chemin(self, items, trait, fond, ep, at, af, calque, tirets, ordre=None):
        if not items:
            return
        self.ordre += 1
        c = {'items': items, 'trait': trait, 'fond': fond, 'ep': ep, 'at': at, 'af': af,
             'calque': calque, 'tirets': tirets, 'ordre': self.ordre if ordre is None else ordre}
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
        self.glyphes.append(g + (self.ordre if ordre is None else ordre,))

    def image(self, coins, l, h, info, calque, ordre=None):
        self.ordre += 1
        self.images.append({'coins': coins, 'l': l, 'h': h, 'info': info, 'calque': calque,
                            'ordre': self.ordre if ordre is None else ordre})


# ===========================================================================
#  9. La machine : l'interprete des flux de contenu
# ===========================================================================

class Etat(object):
    __slots__ = ('ctm', 'cs_t', 'cs_f', 'col_t', 'col_f', 'ep', 'at', 'af', 'police', 'corps',
                 'tc', 'tw', 'th', 'tl', 'rise', 'tr', 'tirets', 'motif_f')

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

    def copie(self):
        e = Etat.__new__(Etat)
        for k in Etat.__slots__:
            setattr(e, k, getattr(self, k))
        return e


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
                vis = self._expression(ve)
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

    def _expression(self, ve):
        r = self.lecteur.resoudre
        if not ve:
            return True
        op = r(ve[0])
        args = []
        for x in ve[1:]:
            x2 = r(x)
            if isinstance(x2, list):
                args.append(self._expression(x2))
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

    def __init__(self, lecteur, notes, calques):
        self.lecteur = lecteur
        self.notes = notes
        self.calques = calques
        self.polices = {}        # cle -> Police
        self.espaces = {}

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
                    self.notes.ajouter('un flux de contenu illisible : %s' % e)
        data = b'\n'.join(morceaux)
        etat = Etat()
        etat.ctm = ctm_page
        self.pile_formes = []
        self.executer(data, ressources, etat, 0, [])

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
            self.notes.ajouter('police introuvable dans les ressources (texte ignore)')
            return None
        cle = brut.num if isinstance(brut, Ref) else id(objet)
        p = self.polices.get(cle)
        if p is None:
            try:
                p = Police(self.lecteur, objet, self.notes)
            except Exception as e:
                self.notes.ajouter('police illisible : %s' % e)
                p = None
            self.polices[cle] = p
        return p

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
                self.notes.ajouter('espace de couleur %s introuvable (gris suppose)' % nettoyer_nom_police(n))
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
        self.notes.ajouter('espace de couleur %s non gere (gris suppose)' % nettoyer_nom_police(genre))
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
                            b = appliquer(ctm, x + w, y)
                            c = appliquer(ctm, x + w, y + h)
                            d = appliquer(ctm, x, y + h)
                            chemin.append(('l', a, b))
                            chemin.append(('l', b, c))
                            chemin.append(('l', c, d))
                            chemin.append(('l', d, a))
                            point = debut_sp = a
                    elif op in _PEINTURES:
                        trait, fond, fermer = _PEINTURES[op]
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
                                    col.chemin(chemin, ct if trait else None, cf if fond else None, ep,
                                               etat.at, etat.af, (ident, vis), etat.tirets)
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
                            tm = self._montrer(etat, tm, [ops[-1]], calque_courant)
                    elif op == b'TJ':
                        if ops and isinstance(ops[-1], list):
                            tm = self._montrer(etat, tm, ops[-1], calque_courant)
                    elif op == b"'":
                        tlm = tm = mul((1.0, 0.0, 0.0, 1.0, 0.0, -etat.tl), tlm)
                        if ops and isinstance(ops[-1], bytes):
                            tm = self._montrer(etat, tm, [ops[-1]], calque_courant)
                    elif op == b'"':
                        if len(ops) >= 3:
                            etat.tw = ops[-3]
                            etat.tc = ops[-2]
                        tlm = tm = mul((1.0, 0.0, 0.0, 1.0, 0.0, -etat.tl), tlm)
                        if ops and isinstance(ops[-1], bytes):
                            tm = self._montrer(etat, tm, [ops[-1]], calque_courant)
                    # -------------------------------------------- objets externes
                    elif op == b'Do':
                        if ops and isinstance(ops[-1], Nom):
                            self._do(ressources, ops[-1], etat, profondeur, mc, calque_courant)
                    elif op == b'BI':
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
                for (u, w0, mot) in p.glyphes(morceau):
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
                self.notes.ajouter('formulaire illisible : %s' % e)
                return
            mat = r(x.dico.get('Matrix'))
            e2 = etat.copie()
            if isinstance(mat, list) and len(mat) == 6:
                try:
                    e2.ctm = mul(tuple(float(r(v)) for v in mat), etat.ctm)
                except (TypeError, ValueError):
                    pass
            res = r(x.dico.get('Resources'))
            if not isinstance(res, dict):
                res = ressources
            pile_mc = list(mc)
            if entree is not None:
                pile_mc.append(entree)
            self.pile_formes.append(cle)
            try:
                self.executer(data, res, e2, profondeur + 1, pile_mc)
            finally:
                self.pile_formes.pop()
        elif st == 'PS':
            self.notes.ajouter('XObject PostScript ignore')

    def _image(self, d, ctm, calque, en_ligne=False):
        coins = [appliquer(ctm, 0, 0), appliquer(ctm, 1, 0), appliquer(ctm, 1, 1), appliquer(ctm, 0, 1)]
        self._image_coins(d, coins, calque, en_ligne=en_ligne)

    def _image_coins(self, d, coins, calque, motif=False, en_ligne=False):
        r = self.lecteur.resoudre
        l = entier(r(d.get('Width', d.get('W'))), 0)
        h = entier(r(d.get('Height', d.get('H'))), 0)
        filtre = r(d.get('Filter', d.get('F')))
        if isinstance(filtre, list):
            filtre = r(filtre[-1]) if filtre else None
        filtre = ABREV_FILTRES.get(str(filtre), str(filtre)) if filtre is not None else 'brut'
        cs = r(d.get('ColorSpace', d.get('CS')))
        if isinstance(cs, list) and cs:
            cs = r(cs[0])
        cs = ABREV_CS.get(str(cs), str(cs)) if cs is not None else ''
        masque = r(d.get('ImageMask', d.get('IM'))) is True
        bpc = entier(r(d.get('BitsPerComponent', d.get('BPC'))), 0)
        info = {'filtre': filtre.replace('Decode', ''), 'espace': cs.replace('Device', ''),
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
        self._image(dico, etat.ctm, (ident, vis), en_ligne=True)
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


def normaliser(items, stats):
    """Les items d'un chemin sans leurs cas degeneres, la meme regle pour les
    deux lecteurs (MuPDF garde ou jette ces cas a sa facon) : un trait plus
    court que 0,01 pt, une courbe dont les quatre points se confondent, ou qui
    part et revient au meme point par un point de controle confondu, sont
    jetes (comptes comme « points ») ; une courbe droite (p0 = p1 et p2 = p3,
    ou trois points confondus) devient un trait."""
    sortie = []
    for it in items:
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
        sortie.append(it)
    return sortie


def elements_des_chemins(col, stats):
    """Les elements d'une page tires de ses chemins."""
    sortie = []
    for k, c in enumerate(col.chemins):
        num = k + 1
        base = {'trait': c['trait'], 'fond': c['fond'], 'ep': c['ep'] if c['trait'] is not None else None,
                'at': c['at'], 'af': c['af'], 'calque': c['calque'], 'chemin': num, 'ordre': c['ordre'],
                'tirets': c['tirets']}
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
    demi-corps l'un de l'autre. Un ecart de plus de 0,12 corps (au-dela de
    l'ecart ordinaire du texte, pour un texte espace lettre a lettre) sans
    glyphe d'espace devient une espace."""
    textes = []
    cour = None
    for g in glyphes:
        u, ox, oy, ux, uy, taille, avance, police, mode, couleur, alpha, calque, ordre = g
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
                if travers <= 0.05 * taille and -0.3 * taille <= le_long <= 0.5 * taille:
                    cour['glyphes'].append((u, ox, oy, avance, le_long / taille if taille > 0 else 0.0))
                    cour['fin'] = (ox + avance * ux, oy + avance * uy)
                    continue
            textes.append(cour)
        cour = {'police': police, 'taille': taille, 'mode': mode, 'couleur': couleur, 'calque': calque,
                'alpha': alpha, 'ux': ux, 'uy': uy, 'glyphes': [(u, ox, oy, avance, 0.0)],
                'fin': (ox + avance * ux, oy + avance * uy), 'ordre': ordre}
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
                       'ordre': t['ordre'], 'ux': t['ux'], 'uy': t['uy']})
    return sortie


def elements_des_images(col):
    sortie = []
    for im in col.images:
        xs = [p[0] for p in im['coins']]
        ys = [p[1] for p in im['coins']]
        (ax, ay), (bx, by) = im['coins'][0], im['coins'][1]
        sortie.append({'type': 'image', 'x1': min(xs), 'y1': min(ys), 'x2': max(xs), 'y2': max(ys),
                       'angle': angle_de(bx - ax, by - ay), 'l': im['l'], 'h': im['h'], 'info': im['info'],
                       'calque': im['calque'], 'ordre': im['ordre'], 'trait': None, 'fond': None,
                       'chemin': None, 'coins': im['coins']})
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


class Grille(object):
    """Un index spatial tout simple : des boites rangees par case."""

    def __init__(self):
        self.cases = {}

    def ajouter(self, b, objet):
        for i in range(int(b[0] // CASE_GRILLE), int(b[2] // CASE_GRILLE) + 1):
            for j in range(int(b[1] // CASE_GRILLE), int(b[3] // CASE_GRILLE) + 1):
                self.cases.setdefault((i, j), []).append(objet)

    def autour(self, x, y):
        return self.cases.get((int(x // CASE_GRILLE), int(y // CASE_GRILLE)), ())


def juger_visibilite(elements, largeur, hauteur):
    """Pour chaque element : visible (O/N) et pourquoi pas (mode3, calque,
    transparent, horspage, blanc, minuscule, recouvert)."""
    fonds = []          # (ordre, boite) des surfaces remplies non blanches et des images
    caches = Grille()   # les rectangles pleins et opaques : ce qu'ils recouvrent ne se voit plus
    for e in elements:
        if e['type'] == 'image' or (e.get('fond') not in (None, 'motif') and not est_blanc(e.get('fond'))
                                   and (e.get('af') is None or e.get('af') > 0)):
            b = boite(e)
            if (b[2] - b[0]) * (b[3] - b[1]) > 0.5:
                # une image compte toujours comme un fond (PyMuPDF ne dit pas son rang)
                fonds.append((-1 if e['type'] == 'image' else e['ordre'], b))
        if e['type'] == 'rectangle' and e.get('fond') not in (None, 'motif') and (e.get('af') is None or e['af'] >= 0.999):
            cal = e.get('calque')
            if not (isinstance(cal, tuple) and cal[1] is False):
                caches.ajouter(boite(e), e)
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
        b = boite(e)
        e['boite'] = b
        if b[2] < -0.01 or b[0] > largeur + 0.01 or b[3] < -0.01 or b[1] > hauteur + 0.01:
            raisons.append('horspage')
        # blanc sur blanc
        if t == 'texte':
            blanc = est_blanc(e.get('couleur'))
        elif t == 'image':
            blanc = False
        else:
            couleurs = [c for c in (e.get('trait'), e.get('fond')) if c is not None]
            blanc = bool(couleurs) and all(est_blanc(c) for c in couleurs)
        if blanc:
            cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
            dessous = False
            for (o, fb) in fonds:
                if o < e['ordre'] and fb[0] <= cx <= fb[2] and fb[1] <= cy <= fb[3]:
                    dessous = True
                    break
            if not dessous:
                raisons.append('blanc')
        if t == 'texte' and e['taille'] < CORPS_MINUSCULE:
            raisons.append('minuscule')
        # recouvert par un rectangle plein et opaque peint apres lui
        if t in ('texte', 'segment') and not raisons:
            for c in caches.autour((b[0] + b[2]) / 2, (b[1] + b[3]) / 2):
                if c['ordre'] > e['ordre']:
                    cb = c['boite'] if 'boite' in c else boite(c)
                    if cb[0] <= b[0] + 0.05 and cb[1] <= b[1] + 0.05 and cb[2] >= b[2] - 0.05 and cb[3] >= b[3] - 0.05:
                        raisons.append('recouvert')
                        break
        e['raisons'] = raisons
        e['visible'] = not raisons
    return elements


# ===========================================================================
#  11. Les motifs : chaque texte reduit a sa forme
# ===========================================================================

def motif(texte):
    """Majuscule -> A, minuscule -> a, chiffre -> 9 (lettres accentuees
    comprises), les autres signes et les espaces gardes."""
    sortie = []
    for c in texte:
        if c.isdigit():
            sortie.append('9')
        elif c.isalpha():
            if c.islower():
                sortie.append('a')
            else:
                sortie.append('A')
        elif c == '\t' or c == '\n' or c == '\r':
            sortie.append(' ')
        elif unicodedata.category(c)[0] == 'C':
            sortie.append(INCONNU)
        else:
            sortie.append(c)
    return u''.join(sortie)


_LOGICIELS = set('''
adobe acrobat distiller pdf pdflib library pdfmaker paper capture microsoft word excel powerpoint visio office
print printer printing to for windows mac os x macos osx quartz pdfcontext autocad autodesk dwg trueview plot plotter
pc3 see electrical expert ige+xao ige xao etap trace software ghostscript gpl artifex itext itextsharp pdfsharp
reportlab skia chromium chrome google headless qt cairo mupdf pymupdf fitz pdftex latex tex luatex xetex dvipdfmx
libreoffice openoffice writer draw calc impress inkscape illustrator indesign photoshop pscript5 pscript5.dll dll
pdfcreator bullzip cutepdf primopdf foxit phantompdf reader editor nitro pro novapdf bluebeam revu pdf-xchange
xchange tracker canon xerox ricoh kyocera konica minolta sharp lexmark brother epson hp scan scanner kodak
paperport omnipage abbyy finereader kofax power catia dassault systemes zuken e3 e3.series cadstar mentor capital
vesys eplan siemens teamcenter nx solidworks solid edge ansys microstation bentley creo ptc pdf24 smallpdf ilovepdf
aspose pdfium apache pdfbox fop ibex prince wkhtmltopdf webkit qtwebkit pdfwriter jaws normal version build
release edition professional standard server service pack sp dc x64 x86 bit 64-bit 32-bit macro convert converter
export exporter plugin plug-in add-in with by and the of on inc corp corporation gmbh ltd llc sa sas ag co ecad
cad harness wiring diagram designer builder studio suite manager viewer generator pdfkit cocoa ios android linux
unix sun java jdk net framework ms rendering engine image images tiff jpeg png postscript ps eps svg dxf html
xml xps opc scansoft nuance ocr textbridge itextpdf ironpdf pdftron apryse docotic syncfusion telerik devexpress
crystal reports ssrs sap business objects tibco jaspersoft birt fastreport stimulsoft activereports
'''.split())


def masquer_logiciel(s, clair=False):
    """Le Producer / Creator : garde le nom d'un logiciel connu et les numeros
    de version ; masque ce qui ressemble a un nom de personne, de societe, de
    projet, un chemin ou une adresse."""
    if not s:
        return ''
    if clair:
        return s
    s = re.sub(r'[A-Za-z]:\\[^;,()]*|\\\\[^;,()]+|(?:/[^/\s;,()]+){2,}/?', '[chemin]', s)
    s = re.sub(r'\S+@\S+', '[courriel]', s)
    s = re.sub(r'(?i)\b(?:https?|ftp|file)://\S+', '[adresse]', s)
    sortie = []
    for m in re.finditer(r'\[(?:chemin|courriel|adresse)\]|[^\W_][\w.+#-]*|\s+|.', s, re.U):
        mot = m.group(0)
        if mot.startswith('['):
            sortie.append(mot)
            continue
        if not mot.strip() or not any(c.isalnum() for c in mot):
            sortie.append(mot)
            continue
        cle = mot.lower().rstrip('.,;:')
        if cle in _LOGICIELS:
            sortie.append(mot)
        elif re.match(r'(?i)^(?:v|r|v\d+r|build|sp|x)?[\d][\d.]*[a-z]?\d*$', cle) or \
                re.match(r'(?i)^v\d+(?:r\d+)?(?:\.\d+)*$', cle) or re.match(r'^\d+(?:\.\d+)+$', cle):
            sortie.append(mot)
        else:
            sortie.append(motif(mot))
    return u''.join(sortie)


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


class DocumentStandard(object):
    """Un PDF lu par le lecteur ecrit ici (bibliotheque standard seule)."""

    def __init__(self, data, notes, mot_de_passe=b''):
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

    def lire_page(self, i):
        p = self.pages[i]
        m, W, H, rot = self.geometrie(i)
        col = Collecteur()
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
                                'copie': bool(p & 16), 'annotations': bool(p & 32)}
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

    def _compter_arbre_noms(self, n, prof):
        r = self.lecteur.resoudre
        n = r(n)
        if not isinstance(n, dict) or prof > 20:
            return 0
        total = 0
        noms = r(n.get('Names'))
        if isinstance(noms, list):
            total += len(noms) // 2
        for k in r(n.get('Kids')) or []:
            total += self._compter_arbre_noms(k, prof + 1)
        return total

    def polices(self):
        """[(nom, type, embarquee, encodage, tounicode)] des polices vues."""
        r = self.lecteur.resoudre
        sortie = []
        for p in self.machine.polices.values():
            if p is None:
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
            sortie.append((nettoyer_nom_police(p.nom), st, emb, enc, p.unicode_cmap is not None))
        return sortie


# ===========================================================================
#  13. Le lecteur PyMuPDF (s'il est installe)
# ===========================================================================

def importer_pymupdf():
    try:
        import pymupdf as fitz           # PyMuPDF 1.24 et plus
        return fitz
    except Exception:
        pass
    try:
        import fitz                      # anciennes versions
        if hasattr(fitz, 'open') and hasattr(fitz, 'Document'):
            return fitz
    except Exception:
        pass
    return None


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
        if getattr(doc, 'needs_pass', False):
            if not doc.authenticate(mot_de_passe or ''):
                raise ErreurPDF('protege par un mot de passe a l\'ouverture')
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

    def lire_page(self, i, en_ligne=None):
        """en_ligne : les boites (points, page vue) des images en ligne (BI...EI)
        que le lecteur standard a vues ; PyMuPDF leur donne xref 0, comme aux
        rendus de degrades et de masques doux, qu'elles permettent d'ecarter."""
        fitz = self.fitz
        page = self.doc[i]
        rot = page.rotation
        W, H = page.rect.width, page.rect.height
        try:
            rm = page.rotation_matrix
            m = (rm.a, rm.b, rm.c, rm.d, rm.e, rm.f)
        except Exception:
            m = IDENTITE
        tourne = rot % 360 != 0

        def T(p):
            if tourne:
                return appliquer(m, p[0], p[1])
            return (p[0], p[1])

        col = Collecteur()
        # les traces
        try:
            dessins = page.get_drawings()
        except Exception as e:
            dessins = []
            self.notes.ajouter('PyMuPDF : get_drawings a echoue (%s)' % e)
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
            trait = tuple(d.get('color')) if genre in ('s', 'fs') and d.get('color') is not None else None
            fond = tuple(d.get('fill')) if genre in ('f', 'fs') and d.get('fill') is not None else None
            if genre in ('s', 'fs') and trait is None:
                trait = 'motif'
            if genre in ('f', 'fs') and fond is None:
                fond = 'motif'
            tir = d.get('dashes')
            tirets = bool(tir) and not re.match(r'^\[\s*\]', str(tir))
            col.chemin(items, trait, fond, d.get('width') or 0.0, d.get('stroke_opacity', 1.0),
                       d.get('fill_opacity', 1.0), self._calque(d.get('layer')), tirets, d.get('seqno'))
        # les glyphes
        try:
            spans = page.get_texttrace()
        except Exception as e:
            spans = []
            self.notes.ajouter('PyMuPDF : get_texttrace a echoue (%s)' % e)
        prec = None
        for s in spans:
            t = s.get('type', 0)
            mode = {0: 'rempli', 1: 'trait', 2: 'rempli', 3: 'invisible'}.get(t, 'rempli')
            # un texte rempli puis trace (Tr 2) arrive deux fois : un seul
            cle = tuple((c[0], round(c[2][0], 3), round(c[2][1], 3)) for c in s.get('chars', ()))
            if t == 1 and prec is not None and prec[0] == cle:
                continue
            prec = (cle, t)
            dx, dy = s.get('dir', (1, 0))
            if tourne:
                dx, dy = m[0] * dx + m[2] * dy, m[1] * dx + m[3] * dy
            nd = math.hypot(dx, dy) or 1.0
            ux, uy = dx / nd, dy / nd
            taille = s.get('size', 0.0)
            couleur = tuple(s.get('color', (0, 0, 0)))
            alpha = s.get('opacity', 1.0)
            police = s.get('font', '')
            calque = self._calque(s.get('layer'))
            sx, sy = s.get('dir', (1, 0))
            attente = None             # le glyphe en cours : un glyphe a plusieurs caracteres (ligature
            for c in s.get('chars', ()):   # « fi ») arrive en plusieurs « chars », les suivants sans glyphe (gid < 0)
                ucs, gid, origine, bb = c[0], c[1], c[2], c[3]
                try:
                    u = chr(ucs) if ucs >= 32 and ucs != 0xFFFD else INCONNU
                except (ValueError, OverflowError):
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
            self.notes.ajouter('PyMuPDF : get_image_info a echoue (%s)' % e)
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
            cs = im.get('cs-name', '') or ''
            info = {'filtre': '', 'espace': cs.replace('Device', ''), 'bits': im.get('bpc', 0),
                    'masque': bool(im.get('has-mask')) and False}
            col.image(coins, im.get('width', 0), im.get('height', 0), info, (None, True))
        return col, W, H, rot


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
    return els, stats


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
            c['couverture'] = max(c['couverture'], part)
            c['images'].append((e, part))
        if t in ('segment', 'rectangle', 'courbe', 'cercle') and e['visible']:
            c['vect_vis'] += 1
    return c


def verdict_page(c):
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
        self.pages = []          # dict : num, W, H, rot, elements, stats, comptes, verdict
        self.polices = []
        self.notes = NotesNonGere()
        self.duree = 0.0
        self.comparaison = None


def relever(data, options, fitz):
    """Lit un PDF avec le lecteur choisi. Ne leve jamais : une erreur est
    notee dans le releve."""
    rel = Releve()
    t0 = time.time()
    mdp = options.get('mot_de_passe', '')
    std = None
    try:
        std = DocumentStandard(data, rel.notes, mdp.encode('latin-1', 'replace'))
        rel.infos = std.infos(options.get('clair', False))
    except Exception as e:
        rel.notes.ajouter('lecteur standard : %s' % e)
        std = None
        rel.erreur_std = str(e)
    choix = options.get('lecteur', 'auto')
    utiliser_pymupdf = fitz is not None and choix in ('auto', 'pymupdf')
    doc = None
    if utiliser_pymupdf:
        try:
            doc = DocumentPyMuPDF(fitz, data, rel.notes, mdp, std.calques.visible if std is not None else None)
            rel.lecteur = 'PyMuPDF ' + version_pymupdf(fitz)
        except Exception as e:
            rel.notes.ajouter('PyMuPDF n\'a pas pu ouvrir le fichier (%s) : lecteur standard' % e)
            doc = None
    if doc is None:
        if std is None:
            rel.erreur = getattr(rel, 'erreur_std', 'illisible')
            rel.duree = time.time() - t0
            return rel
        doc = std
        rel.lecteur = 'standard (bibliotheque standard de Python seule)'
    nb = doc.nb if isinstance(doc, DocumentPyMuPDF) else len(doc.pages)
    if rel.infos is None:
        rel.infos = infos_pymupdf(doc, options.get('clair', False))
    rel.infos['pages'] = nb
    double = isinstance(doc, DocumentPyMuPDF) and std is not None
    if double:
        rel.comparaison = []
    for i in lire_pages(choix, nb, options.get('pages')):
        col2 = None
        if double:
            # le lecteur standard aussi : le contenu marque (que PyMuPDF ne dit pas), les images en ligne
            # (pour les distinguer des rendus de degrades) et la comparaison
            try:
                col2, W2, H2, _ = std.lire_page(i)
            except Exception as e:
                col2 = None
                rel.notes.ajouter('lecteur standard, page %d : %s (comparaison impossible)' % (i + 1, e))
        try:
            if double:
                en_ligne = None
                if col2 is not None:
                    en_ligne = []
                    for im in col2.images:
                        if im['info'].get('en_ligne'):
                            xs = [q[0] for q in im['coins']]
                            ys = [q[1] for q in im['coins']]
                            en_ligne.append((min(xs), min(ys), max(xs), max(ys)))
                col, W, H, rot = doc.lire_page(i, en_ligne)
            else:
                col, W, H, rot = doc.lire_page(i)
            els, stats = analyser_page(col, W, H)
        except Exception as e:
            rel.notes.ajouter('page %d illisible : %s' % (i + 1, e))
            rel.pages.append({'num': i + 1, 'W': 0, 'H': 0, 'rot': 0, 'elements': [], 'stats': {},
                              'comptes': comptes_page([], 1, 1), 'verdict': ('illisible', str(e)), 'erreur': str(e),
                              'marques': {}, 'cles_marques': {}, 'textes_marques': []})
            continue
        col_marques = col
        if col2 is not None:
            try:
                els2, _ = analyser_page(col2, W2, H2)
                rel.comparaison.append(comparer_elements(els, els2))
                col_marques = col2
            except Exception as e:
                rel.notes.ajouter('lecteur standard, page %d : %s (comparaison impossible)' % (i + 1, e))
        c = comptes_page(els, W, H)
        if std is not None:
            try:
                ann = std.annotations(i)
                for e in ann:
                    e['boite'] = (e['x1'], e['y1'], e['x2'], e['y2'])
                els = els + ann
            except Exception as e:
                rel.notes.ajouter('annotations de la page %d illisibles : %s' % (i + 1, e))
        rel.pages.append({'num': i + 1, 'W': W, 'H': H, 'rot': rot, 'elements': els, 'stats': stats,
                          'comptes': c, 'verdict': verdict_page(c), 'marques': getattr(col_marques, 'marques', {}),
                          'cles_marques': getattr(col_marques, 'cles_marques', {}),
                          'textes_marques': getattr(col_marques, 'textes_marques', [])})
        if not options.get('silencieux'):
            dire('    page %d/%d : %d elements' % (i + 1, nb, len(els)))
    if std is not None:
        try:
            rel.polices = std.polices()
        except Exception:
            rel.polices = []
    rel.duree = time.time() - t0
    return rel


def infos_pymupdf(doc, clair):
    d = doc.doc
    meta = d.metadata or {}
    infos = {'version': (meta.get('format') or '').replace('PDF ', ''), 'pages': doc.nb,
             'producer': masquer_logiciel(meta.get('producer') or '', clair),
             'creator': masquer_logiciel(meta.get('creator') or '', clair),
             'CreationDate': (meta.get('creationDate') or '')[2:6], 'ModDate': (meta.get('modDate') or '')[2:6],
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
        infos['chiffrement'] = {'methode': meta.get('encryption'), 'impression': None, 'modification': None,
                                'copie': None, 'annotations': None}
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
    for e in a:
        t = cle(e)
        r_ = resultat.setdefault(t, {'a': 0, 'b': 0, 'ensemble': 0, 'ecart_max': 0.0})
        r_['a'] += 1
        trouve = None
        meilleur = None
        gx, gy = int(e['x1'] // pas), int(e['y1'] // pas)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for j in seaux.get((t, gx + dx, gy + dy), ()):
                    if j in pris:
                        continue
                    f = b[j]
                    if t == 'texte' and motif(e['texte']) != motif(f['texte']):
                        continue
                    d = max(abs(e['x1'] - f['x1']), abs(e['y1'] - f['y1']), abs(e['x2'] - f['x2']), abs(e['y2'] - f['y2']))
                    if t == 'segment' and d > tol:
                        d2 = max(abs(e['x1'] - f['x2']), abs(e['y1'] - f['y2']), abs(e['x2'] - f['x1']), abs(e['y2'] - f['y1']))
                        d = min(d, d2)
                    if d <= tol and (meilleur is None or d < meilleur):
                        meilleur = d
                        trouve = j
        if trouve is not None:
            pris.add(trouve)
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
    return {'types': resultat, 'ecarts': ecarts}


# ===========================================================================
#  16. Ecrire le rapport et le TSV
# ===========================================================================

COLONNES_TSV = ('page', 'n', 'type', 'x1', 'y1', 'x2', 'y2', 'angle', 'epaisseur', 'taille', 'couleur', 'fond',
                'visible', 'raison', 'calque', 'chemin', 'motif', 'police', 'details')


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


def ligne_tsv(num_page, n, e, index_calques, clair):
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
        details = e['sorte'] + ((' (%s, %d car.)' % (e['source'], len(e['texte']))) if e['texte'] else '')
    if e.get('tirets'):
        details = (details + ' ' if details else '') + 'tirets'
    if t == 'texte':
        couleur = hexa(e.get('couleur'))
        if e['mode'] == 'trait':
            details += ' (texte en contour)'
    else:
        couleur = hexa(e.get('trait'))
    m = motif(e['texte']) if t in ('texte', 'annotation') else ''
    champs = [str(num_page), str(n), t, fmt(e['x1'] * mm), fmt(e['y1'] * mm), fmt(e['x2'] * mm), fmt(e['y2'] * mm),
              fmt(e['angle'], 1) if e.get('angle') is not None else '',
              fmt(e['ep'] * mm, 3) if e.get('ep') is not None and t not in ('texte', 'image') else '',
              fmt(e['taille'], 2) if t == 'texte' else '',
              couleur, hexa(e.get('fond')),
              'O' if e['visible'] else 'N', ','.join(e['raisons']), nom_calque(e.get('calque'), index_calques),
              str(e['chemin']) if e.get('chemin') is not None else '', m,
              nettoyer_nom_police(e.get('police')) if t == 'texte' else '', details.strip()]
    if clair:
        champs.append(e['texte'] if t in ('texte', 'annotation') else '')
    return '\t'.join(c.replace('\t', ' ').replace('\r', ' ').replace('\n', ' ') for c in champs)


def ecrire_tsv(chemin, rel, index_calques, clair):
    entete = list(COLONNES_TSV) + (['texte'] if clair else [])
    with open(chemin_long(chemin), 'w', encoding='utf-8-sig', newline='') as f:
        f.write('\t'.join(entete) + '\r\n')
        for p in rel.pages:
            for n, e in enumerate(p['elements'], 1):
                f.write(ligne_tsv(p['num'], n, e, index_calques, clair) + '\r\n')


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
        w(u'SONDE PDF -- relevé EN CLAIR (option --clair : les textes réels sont écrits)')
    else:
        w(u'SONDE PDF -- relevé ANONYMISÉ (aucun texte réel, aucun nom de fichier, aucun nom de calque)')
    w(u'=' * 78)
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
            w(u'Chiffré                : oui, %s, ouvert sans mot de passe%s' % (ch['methode'], (u' ; permissions : ' + ', '.join(perms)) if perms else ''))
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
        w(u'Annotations            : %s' % (', '.join(u'%s %d' % (k, v) for k, v in sorted(ann.items())) if ann else u'aucune'))
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
        w(u'Ensemble : %d textes visibles, %d invisibles ; %d segments, %d rectangles, %d courbes, %d cercles ; '
          u'%d image(s)%s' % (tot['textes_vis'], tot['textes_invis'], tot['seg'], tot['rect'], tot['courbe'], tot['cercle'],
                              tot['image'], (u', la plus grande couvre %d %% d\'une page' % round(couv * 100)) if tot['image'] else u''))
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
            w(u'  Rectangles : %d ; courbes : %d ; cercles : %d ; points (traits de longueur nulle) : %d' % (
                c['rect'], c['courbe'], c['cercle'], p['stats'].get('points', 0)))
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
        ecrire_caches(w, rel, clair)
    if rel.polices:
        w(u'== POLICES (déclarées dans les pages lues) ==')
        for (nom, st, emb, enc, tu) in sorted(set(rel.polices)):
            w(u'  %s : %s, %s, encodage %s, ToUnicode %s' % (nom, st, u'embarquée' if emb else u'non embarquée', enc, u'oui' if tu else u'non'))
        w(u'')
    if rel.comparaison is not None:
        w(u'== LES DEUX LECTEURS (PyMuPDF contre le lecteur standard) ==')
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
    w(u'  (toujours : les zones de découpe (clip) ne sont pas appliquées ; les apparences des annotations ne sont pas lues ;')
    w(u'   la boîte d\'un texte est conventionnelle : de la ligne de base, 0,8 corps au-dessus et 0,2 au-dessous)')
    w(u'')
    w(u'Fin du rapport.')
    texte = u'\r\n'.join(L) + u'\r\n'
    with open(chemin_long(chemin), 'w', encoding='utf-8-sig', newline='') as f:
        f.write(texte)


def nom_raison(r_):
    return {'mode3': u'mode de rendu invisible', 'horspage': u'hors page', 'blanc': u'blanc sur blanc',
            'calque': u'calque masqué', 'transparent': u'transparent', 'minuscule': u'corps < 1 pt',
            'mode7': u'texte de découpe (Tr 7)',
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
        h, n = histogramme([nettoyer_nom_police(e['police']) for e in textes], 10)
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


def ecrire_caches(w, rel, clair):
    """Ce qui porte du texte sans se dessiner : les annotations et le contenu
    marque (ActualText, Alt, cles propres d'un logiciel)."""
    ann = [e for p in rel.pages for e in p['elements'] if e['type'] == 'annotation']
    if ann:
        w(u'== ANNOTATIONS ==')
        sortes = {}
        for e in ann:
            x = sortes.setdefault(e['sorte'], [0, 0, 0])
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
            marques[k] = marques.get(k, 0) + v
        for k, v in (p.get('cles_marques') or {}).items():
            cles[k] = cles.get(k, 0) + v
        textes.extend(p.get('textes_marques') or [])
    if marques or cles or textes:
        w(u'== CONTENU MARQUÉ (BDC / BMC) ==')
        w(u'  Étiquettes : ' + ', '.join(u'%s : %d' % (nettoyer_nom_police(k), v) for k, v in sorted(marques.items(), key=lambda x: -x[1])[:20]))
        if cles:
            w(u'  Clés des propriétés : ' + ', '.join(u'%s : %d' % (nettoyer_nom_police(k), v) for k, v in sorted(cles.items(), key=lambda x: -x[1])[:20]))
        if textes:
            w(u'  %d texte(s) caché(s) dans les propriétés (ils ne se dessinent pas) ; motifs (clé ; motif ; nombre) :' % len(textes))
            h, n = histogramme([(k, motif(t)) for k, t in textes], 60)
            for (k, m), v in h:
                w(u'    %s\t%s\t%d' % (nettoyer_nom_police(k), m, v))
            if n > len(h):
                w(u'    ... et %d motifs de plus' % (n - len(h)))
            if clair:
                for k, t in textes[:50]:
                    w(u'    en clair : %s = %s' % (k, t))
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
    fichiers = []
    for c in chemins:
        c = c.strip().strip('"')
        if not c:
            continue
        if os.path.isdir(chemin_long(c)):
            for racine, dossiers, noms in os.walk(chemin_long(c)):
                dossiers.sort()
                for n in sorted(noms):
                    if n.lower().endswith('.pdf'):
                        fichiers.append(os.path.join(racine, n))
        elif os.path.isfile(chemin_long(c)):
            fichiers.append(c)
        else:
            dire('  introuvable : un des chemins donnes (ignore)')
    return fichiers


def lire_plages(texte):
    s = set()
    for morceau in re.split(r'[;,]', texte or ''):
        morceau = morceau.strip()
        m = re.match(r'^(\d+)\s*-\s*(\d+)$', morceau)
        if m:
            s.update(range(int(m.group(1)), int(m.group(2)) + 1))
        elif morceau.isdigit():
            s.add(int(morceau))
    return s


def dossier_rapports(options):
    if options.get('sortie'):
        d = options['sortie']
    else:
        d = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rapports')
    try:
        os.makedirs(chemin_long(d), exist_ok=True)
        essai = os.path.join(d, '.essai-ecriture')
        with open(chemin_long(essai), 'w') as f:
            f.write('x')
        os.remove(chemin_long(essai))
        return d
    except Exception:
        repli = os.path.join(os.path.expanduser('~'), 'Documents', 'sonde-pdf-rapports')
        try:
            os.makedirs(chemin_long(repli), exist_ok=True)
        except Exception:
            import tempfile
            repli = os.path.join(tempfile.gettempdir(), 'sonde-pdf-rapports')
            os.makedirs(repli, exist_ok=True)
        dire('Le dossier a cote du script n\'est pas modifiable : rapports ecrits dans %s' % repli)
        return repli


def prochain_numero(dossier):
    n = 0
    try:
        for nom in os.listdir(chemin_long(dossier)):
            m = re.match(r'^(\d+)-[0-9a-f]{8}\.', nom)
            if m:
                n = max(n, int(m.group(1)))
    except Exception:
        pass
    return n + 1


def principal(argv):
    options = {'clair': False, 'lecteur': 'auto', 'deux': False, 'pages': None, 'sortie': None, 'mot_de_passe': ''}
    chemins = []
    for a in argv:
        if a == '--clair':
            options['clair'] = True
        elif a == '--deux':
            options['deux'] = True
        elif a.startswith('--lecteur='):
            options['lecteur'] = a.split('=', 1)[1].strip().lower()
        elif a.startswith('--pages='):
            options['pages'] = lire_plages(a.split('=', 1)[1])
        elif a.startswith('--sortie='):
            options['sortie'] = a.split('=', 1)[1]
        elif a.startswith('--mot-de-passe='):
            options['mot_de_passe'] = a.split('=', 1)[1]
        elif a in ('-h', '--help', '/?', '--aide'):
            dire(__doc__.strip())
            return 0
        elif a.startswith('--'):
            dire('Option inconnue : %s (voir --aide)' % a)
            return 2
        else:
            chemins.append(a)
    if options['lecteur'] not in ('auto', 'standard', 'pymupdf'):
        dire('--lecteur= auto, standard ou pymupdf')
        return 2
    dire('Sonde PDF %s -- Python %s' % (VERSION_SONDE, sys.version.split()[0]))
    if sys.version_info < (3, 8):
        dire('Attention : Python %s est plus ancien que 3.8 ; la sonde peut echouer.' % sys.version.split()[0])
    fichiers = lister_pdf(chemins)
    if not fichiers:
        dire('Aucun PDF a lire. Glisser un ou plusieurs PDF (ou un dossier) sur sonde-pdf.bat,')
        dire('ou : python sonde_pdf.py fichier.pdf [dossier] [--clair]')
        return 1
    libs, fitz = bibliotheques()
    if options['lecteur'] == 'standard':
        fitz_util = None
    else:
        fitz_util = fitz
        if options['lecteur'] == 'pymupdf' and fitz is None:
            dire('PyMuPDF n\'est pas installe : lecteur standard.')
    dossier = dossier_rapports(options)
    numero = prochain_numero(dossier)
    import platform
    systeme = '%s %s' % (platform.system(), platform.release())
    dire('%d PDF a lire ; rapports dans : %s' % (len(fichiers), ascii_seul(dossier)))
    ecrits = 0
    for chemin in fichiers:
        try:
            with open(chemin_long(chemin), 'rb') as f:
                data = f.read()
        except Exception as e:
            dire('  un fichier n\'a pas pu etre ouvert (%s)' % e.__class__.__name__)
            continue
        empreinte = hashlib.sha1(data).hexdigest()[:8]
        base = '%02d-%s' % (numero, empreinte)
        numero += 1
        dire('  PDF %s (%s Ko)...' % (base, len(data) // 1024))
        try:
            rel = relever(data, options, fitz_util)
        except Exception as e:                   # filet ultime : jamais de plantage
            rel = Releve()
            rel.erreur = 'erreur inattendue de la sonde : %s: %s' % (e.__class__.__name__, e)
        index_calques = index_des_calques(rel)
        entete = [
            (u'Version de la sonde', VERSION_SONDE),
            (u'Date du relevé', datetime.datetime.now().strftime('%Y-%m-%d %H:%M')),
            (u'Python', '%s (%s)' % (sys.version.split()[0], systeme)),
            (u'Bibliothèques', ', '.join(u'%s %s' % (n, v) if v else u'%s absente' % n for n, v in libs)),
            (u'Fichier', u'n° %02d, empreinte %s (SHA-1 du contenu), %s Ko' % (numero - 1, empreinte, fr(len(data) / 1024.0, 0))),
        ]
        if options['clair']:
            entete.append((u'Nom du fichier', os.path.basename(chemin)))
        try:
            ecrire_rapport(os.path.join(dossier, base + '.rapport.txt'), rel, entete, options, index_calques)
            ecrire_tsv(os.path.join(dossier, base + '.elements.tsv'), rel, index_calques, options['clair'])
            ecrits += 1
        except Exception as e:
            dire('  impossible d\'ecrire le rapport : %s' % ascii_seul(str(e)))
            continue
        if rel.erreur:
            dire('    -> illisible (voir le rapport)')
        else:
            v, _ = verdict_document([p['verdict'] for p in rel.pages])
            n = sum(len(p['elements']) for p in rel.pages)
            dire('    -> %d page(s), %d elements, %s (%s s)' % (len(rel.pages), n, v, fr(rel.duree, 1)))
    dire('')
    dire('%d rapport(s) ecrit(s) dans : %s' % (ecrits, ascii_seul(dossier)))
    return 0 if ecrits else 1


if __name__ == '__main__':
    try:
        code = principal(sys.argv[1:])
    except KeyboardInterrupt:
        dire('Interrompu.')
        code = 130
    sys.exit(code)
