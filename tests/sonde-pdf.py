# -*- coding: utf-8 -*-
"""
LA SONDE PDF (see/pdf/sonde_pdf.py) -- tient-elle ce qu'elle promet ?
=====================================================================

    python tests/sonde-pdf.py [--corpus=DOSSIER] [--garder=DOSSIER]

Sans dependance obligatoire (Python 3.8 et plus). Le test FABRIQUE lui-meme,
a la main, de petits PDF dont il connait tout : un schema invente (textes
connus, un rectangle a un endroit connu, des traits, des cercles, des textes
caches de six facons, une police composite Identity-H, une police Type3, un
formulaire imbrique, une image en ligne, des annotations, du contenu marque),
puis le meme schema sous d'autres structures : flux xref avec predicteur PNG
et flux d'objets, chaque filtre (ASCIIHex, ASCII85, LZW, RunLength, Flate,
et une chaine de deux), mise a jour incrementale, chiffrement RC4 128 bits
(ecrit ici, independamment de la sonde), table xref fausse, fichier tronque,
page tournee de 90 degres, page « scannee » (une image seule), fichier qui
n'est pas un PDF. Il verifie :

  * qu'AUCUNE chaine reelle ne sort par defaut : chaque texte connu du PDF,
    chaque metadonnee personnelle et le nom du fichier sont cherches dans le
    rapport et le TSV (zero trouvaille) ; avec --clair, ils y sont ;
  * le compte des textes, segments, rectangles, cercles ;
  * les coordonnees en mm, origine en haut a gauche (un rectangle place a un
    endroit connu, aussi sur la page tournee) ;
  * le verdict (vectoriel avec texte, scanne, mixte) ;
  * les textes invisibles comptes comme tels, chacun avec sa raison ;
  * que chaque structure et chaque filtre donnent EXACTEMENT les memes
    elements que le PDF simple ;
  * si PyMuPDF est installe : que le lecteur standard et PyMuPDF donnent les
    memes elements a 0,1 mm pres (sur les PDF fabriques, et sur le corpus) ;
  * le corpus d'essai, s'il est donne (--corpus=DOSSIER, fabrique par
    tests/sonde-pdf-corpus.py) : verite.json y dit ce que chaque PDF contient.

Rend 1 si un controle echoue.
"""
from __future__ import print_function

import hashlib
import io
import json
import os
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import zlib

ICI = os.path.dirname(os.path.abspath(__file__))
SONDE = os.path.join(ICI, '..', 'see', 'pdf', 'sonde_pdf.py')
sys.path.insert(0, os.path.join(ICI, '..', 'see', 'pdf'))
import sonde_pdf as S  # noqa: E402

MM = 72.0 / 25.4
ECHECS = []
NB = [0]


def ok(condition, message):
    NB[0] += 1
    if condition:
        print('  ok  ' + message)
    else:
        print('  ECHEC  ' + message)
        ECHECS.append(message)


# ---------------------------------------------------------------------------
#  Fabriquer un PDF a la main
# ---------------------------------------------------------------------------

def lzw_coder(data):
    """Un codeur LZW (EarlyChange 1), ecrit ici pour le test."""
    table = dict((bytes([i]), i) for i in range(256))
    suivant = 258
    taille = 9
    bits = []

    def ecrire(code):
        bits.append((code, taille))
    ecrire(256)
    w = b''
    for c in data:
        wc = w + bytes([c])
        if wc in table:
            w = wc
            continue
        ecrire(table[w])
        table[wc] = suivant
        suivant += 1
        w = bytes([c])
        if suivant + 1 > (1 << taille) and taille < 12:
            taille += 1
        if suivant >= 4094:
            ecrire(256)
            table = dict((bytes([i]), i) for i in range(256))
            suivant = 258
            taille = 9
    if w:
        ecrire(table[w])
    ecrire(257)
    sortie = bytearray()
    acc = 0
    n = 0
    for code, t in bits:
        acc = (acc << t) | code
        n += t
        while n >= 8:
            n -= 8
            sortie.append((acc >> n) & 0xFF)
    if n:
        sortie.append((acc << (8 - n)) & 0xFF)
    return bytes(sortie)


def rl_coder(data):
    sortie = bytearray()
    for i in range(0, len(data), 100):
        morceau = data[i:i + 100]
        sortie.append(len(morceau) - 1)
        sortie.extend(morceau)
    sortie.append(128)
    return bytes(sortie)


def a85_coder(data):
    import base64
    return base64.a85encode(data) + b'~>'


def hex_coder(data):
    return data.hex().upper().encode('ascii') + b'>'


def filtrer(data, filtres):
    """Applique les filtres (dans l'ordre inverse de /Filter)."""
    for f in reversed(filtres):
        if f == 'FlateDecode':
            data = zlib.compress(data)
        elif f == 'LZWDecode':
            data = lzw_coder(data)
        elif f == 'RunLengthDecode':
            data = rl_coder(data)
        elif f == 'ASCII85Decode':
            data = a85_coder(data)
        elif f == 'ASCIIHexDecode':
            data = hex_coder(data)
    return data


def rc4(cle, data):
    s = list(range(256))
    j = 0
    for i in range(256):
        j = (j + s[i] + cle[i % len(cle)]) % 256
        s[i], s[j] = s[j], s[i]
    i = j = 0
    sortie = bytearray()
    for c in data:
        i = (i + 1) % 256
        j = (j + s[i]) % 256
        s[i], s[j] = s[j], s[i]
        sortie.append(c ^ s[(s[i] + s[j]) % 256])
    return bytes(sortie)


BOURRAGE = bytes.fromhex('28BF4E5E4E758A4164004E56FFFA01082E2E00B6D0683E802F0CA9FE6453697A')


class Objet(object):
    def __init__(self, dico, flux=None):
        self.dico = dico        # bytes : le dictionnaire (ou l'objet)
        self.flux = flux        # bytes ou None


def chaine_pdf(t):
    """Une chaine litterale PDF (latin-1, echappee)."""
    b = t.encode('cp1252') if not isinstance(t, bytes) else t
    return b'(' + b.replace(b'\\', b'\\\\').replace(b'(', b'\\(').replace(b')', b'\\)') + b')'


def ecrire_pdf(objets, racine=1, info=None, xref_flux=False, flux_objets=False, chiffrer=False,
               id0=b'0123456789abcdef', mdp_u=b''):
    """objets : {num: Objet}. Rend les octets du PDF."""
    cle = None
    trailer_extra = b''
    if chiffrer:
        # RC4 128 bits, revision 3, mot de passe utilisateur mdp_u (vide par defaut), proprietaire « p »
        n = 16
        pad_u = (mdp_u + BOURRAGE)[:32]
        h = hashlib.md5((b'p' + BOURRAGE)[:32]).digest()
        for _ in range(50):
            h = hashlib.md5(h[:n]).digest()
        o = rc4(h[:n], pad_u)
        for i in range(1, 20):
            o = rc4(bytes(c ^ i for c in h[:n]), o)
        P = -3904
        k = hashlib.md5(pad_u + o + struct.pack('<i', P) + id0).digest()
        for _ in range(50):
            k = hashlib.md5(k[:n]).digest()
        cle = k[:n]
        u = rc4(cle, hashlib.md5(BOURRAGE + id0).digest())
        for i in range(1, 20):
            u = rc4(bytes(c ^ i for c in cle), u)
        u = u + b'\x00' * 16
        num_enc = max(objets) + 1
        objets = dict(objets)
        objets[num_enc] = Objet(b'<< /Filter /Standard /V 2 /R 3 /Length 128 /P %d /O <%s> /U <%s> >>'
                                % (P, o.hex().encode(), u.hex().encode()))
        trailer_extra = b' /Encrypt %d 0 R' % num_enc

    def cle_objet(num):
        return hashlib.md5(cle + struct.pack('<I', num)[:3] + b'\x00\x00').digest()[:min(len(cle) + 5, 16)]

    def chiffrer_chaines(num, texte):
        # chiffre les chaines litterales (...) d'un dictionnaire (sans parentheses imbriquees)
        def rempl(m):
            brut = m.group(1).replace(b'\\(', b'(').replace(b'\\)', b')').replace(b'\\\\', b'\\')
            return b'<' + rc4(cle_objet(num), brut).hex().encode() + b'>'
        return re.sub(rb'\(((?:[^()\\]|\\.)*)\)', rempl, texte)

    sortie = bytearray(b'%PDF-1.7\n%\xe2\xe3\xcf\xd3\n')
    positions = {}
    dans_flux = {}
    a_ranger = []
    if flux_objets:
        a_ranger = [n for n, o in sorted(objets.items()) if o.flux is None and n != racine + 1000]
    for num in sorted(objets):
        if num in a_ranger:
            continue
        o = objets[num]
        positions[num] = len(sortie)
        dico = o.dico
        flux = o.flux
        if chiffrer and not dico.startswith(b'<< /Filter /Standard'):
            dico = chiffrer_chaines(num, dico)
            if flux is not None:
                flux = rc4(cle_objet(num), flux)
        sortie += b'%d 0 obj\n' % num + dico
        if flux is not None:
            sortie += b'\nstream\n' + flux + b'\nendstream'
        sortie += b'\nendobj\n'
    if a_ranger:
        num_os = max(objets) + 1
        entetes = []
        corps = bytearray()
        for i, num in enumerate(a_ranger):
            entetes.append(b'%d %d' % (num, len(corps)))
            corps += objets[num].dico + b'\n'
            dans_flux[num] = (num_os, i)
        tete = b' '.join(entetes) + b'\n'
        brut = zlib.compress(tete + bytes(corps))
        positions[num_os] = len(sortie)
        sortie += b'%d 0 obj\n<< /Type /ObjStm /N %d /First %d /Filter /FlateDecode /Length %d >>\nstream\n' % (
            num_os, len(a_ranger), len(tete), len(brut)) + brut + b'\nendstream\nendobj\n'
    taille = max(list(positions) + list(dans_flux)) + 2
    infos = b''
    if info is not None:
        num_info = taille - 1
        positions[num_info] = len(sortie)
        dico_info = info
        if chiffrer:
            dico_info = chiffrer_chaines(num_info, info)
        sortie += b'%d 0 obj\n' % num_info + dico_info + b'\nendobj\n'
        infos = b' /Info %d 0 R' % num_info
        taille += 1
    trailer = b'/Size %d /Root %d 0 R%s /ID [<%s> <%s>]%s' % (taille, racine, infos, id0.hex().encode(),
                                                               id0.hex().encode(), trailer_extra)
    debut_xref = len(sortie)
    if xref_flux:
        num_x = taille
        positions[num_x] = debut_xref
        lignes = []
        for n in range(num_x + 1):
            if n in positions:
                lignes.append(struct.pack('>BIH', 1, positions[n], 0))
            elif n in dans_flux:
                lignes.append(struct.pack('>BIH', 2, dans_flux[n][0], dans_flux[n][1]))
            else:
                lignes.append(struct.pack('>BIH', 0, 0, 0))
        # predicteur PNG « Up » (12), 7 colonnes
        brut = bytearray()
        prec = bytes(7)
        for l in lignes:
            brut.append(2)
            brut.extend(bytes((a - b) & 0xFF for a, b in zip(l, prec)))
            prec = l
        data = zlib.compress(bytes(brut))
        trailer = trailer.replace(b'/Size %d' % taille, b'/Size %d' % (num_x + 1))
        sortie += (b'%d 0 obj\n<< /Type /XRef %s /W [1 4 2] /Filter /FlateDecode '
                   b'/DecodeParms << /Predictor 12 /Columns 7 >> /Length %d >>\nstream\n' % (num_x, trailer, len(data))
                   + data + b'\nendstream\nendobj\n')
    else:
        n_max = max(positions) + 1
        sortie += b'xref\n0 %d\n0000000000 65535 f \n' % n_max
        for n in range(1, n_max):
            if n in positions:
                sortie += b'%010d 00000 n \n' % positions[n]
            else:
                sortie += b'0000000000 65535 f \n'
        sortie += b'trailer\n<< ' + trailer.replace(b'/Size %d' % taille, b'/Size %d' % n_max) + b' >>\n'
    sortie += b'startxref\n%d\n%%%%EOF\n' % debut_xref
    return bytes(sortie)


# ---------------------------------------------------------------------------
#  Le schema invente
# ---------------------------------------------------------------------------

L_A3, H_A3 = 1190.55, 841.89
VISIBLES = ['601RC1', 'W-1234-22', 'J1-A12', u'Câble blindé', 'VERT-90', 'IDH-901', 'T3-AB', 'FORMTXT-1', 'FORMTXT-1']
INVISIBLES = {'FANTOME-77': 'mode3', 'BLANC-55': 'blanc', 'DEHORS-33': 'horspage', 'CALQUE-44': 'calque',
              'MINUS-11': 'minuscule', 'SOUS-AP-22': 'recouvert'}
SECRETS = ['Airbus', 'Helicopters', 'Marignane', 'Jean Dupont', 'Dupont', 'Projet Tigre', 'Tigre',
           'Notes internes Martin', 'Martin', 'NOTE-ANNOT-5', 'ALT-CACHE-9', 'PN-MS3106-22']
NOM_FICHIER = 'Plan-SECRET-H160-rev3'


def contenu_principal():
    """Le flux de contenu de la page 1 (A3 paysage). Rend (octets, verite)."""
    y = lambda mm_haut: H_A3 - mm_haut * MM          # noqa: E731
    c = []
    w = c.append
    w('0.5 w 0 0 0 RG')
    # le cadre : un rectangle
    w('%.3f %.3f %.3f %.3f re S' % (10 * MM, y(287), 400 * MM, 277 * MM))
    # LE rectangle connu : x 50 -> 80 mm, y (depuis le haut) 40 -> 60 mm
    w('%.3f %.3f %.3f %.3f re S' % (50 * MM, y(60), 30 * MM, 20 * MM))
    # trois horizontales, deux verticales, une oblique (segments)
    for k in range(3):
        w('%.3f %.3f m %.3f %.3f l S' % (20 * MM, y(150 + 10 * k), 120 * MM, y(150 + 10 * k)))
    w('%.3f %.3f m %.3f %.3f l S' % (130 * MM, y(150), 130 * MM, y(200)))
    w('%.3f %.3f m %.3f %.3f l S' % (140 * MM, y(150), 140 * MM, y(200)))
    w('%.3f %.3f m %.3f %.3f l S' % (150 * MM, y(150), 200 * MM, y(200)))
    # une polyligne de trois segments, et un rectangle trace a la main (m l l l h)
    w('%.3f %.3f m %.3f %.3f l %.3f %.3f l %.3f %.3f l S' % (300 * MM, y(150), 320 * MM, y(150), 320 * MM, y(170), 340 * MM, y(170)))
    w('%.3f %.3f m %.3f %.3f l %.3f %.3f l %.3f %.3f l h S' % (200 * MM, y(100), 230 * MM, y(100), 230 * MM, y(110), 200 * MM, y(110)))
    # un cercle (quatre courbes de Bezier), rempli et trace
    cx, cy, r = 250 * MM, y(150), 5 * MM
    k = 0.5523 * r
    w('%.3f %.3f m %.3f %.3f %.3f %.3f %.3f %.3f c %.3f %.3f %.3f %.3f %.3f %.3f c '
      '%.3f %.3f %.3f %.3f %.3f %.3f c %.3f %.3f %.3f %.3f %.3f %.3f c h B' % (
          cx + r, cy, cx + r, cy + k, cx + k, cy + r, cx, cy + r, cx - k, cy + r, cx - r, cy + k, cx - r, cy,
          cx - r, cy - k, cx - k, cy - r, cx, cy - r, cx + k, cy - r, cx + r, cy - k, cx + r, cy))
    # une courbe seule
    w('%.3f %.3f m %.3f %.3f %.3f %.3f %.3f %.3f c S' % (300 * MM, y(200), 310 * MM, y(190), 320 * MM, y(210), 330 * MM, y(200)))
    # les textes visibles (Helvetica WinAnsi)
    w('BT /F1 10 Tf 1 0 0 1 %.3f %.3f Tm (601RC1) Tj ET' % (50 * MM, y(30)))
    w('BT /F1 10 Tf 1 0 0 1 %.3f %.3f Tm (W-1234-22) Tj ET' % (90 * MM, y(30)))
    w('BT /F2 7 Tf 1 0 0 1 %.3f %.3f Tm [(J1-)-20(A12)] TJ ET' % (50 * MM, y(70)))
    w('BT /F1 9 Tf 1 0 0 1 %.3f %.3f Tm (C\\342ble blind\\351) Tj ET' % (50 * MM, y(90)))
    w('BT /F1 10 Tf 0 1 -1 0 %.3f %.3f Tm (VERT-90) Tj ET' % (380 * MM, y(200)))
    # police composite Identity-H avec ToUnicode
    w('BT /F3 8 Tf 1 0 0 1 %.3f %.3f Tm <0001000200030004000500060007> Tj ET' % (200 * MM, y(30)))
    # police Type3
    w('BT /F4 12 Tf 1 0 0 1 %.3f %.3f Tm <010203040506> Tj ET' % (200 * MM, y(50)))
    # les textes invisibles, de six facons
    w('BT /F1 10 Tf 3 Tr 1 0 0 1 %.3f %.3f Tm (FANTOME-77) Tj 0 Tr ET' % (50 * MM, y(250)))
    w('1 g BT /F1 10 Tf 1 0 0 1 %.3f %.3f Tm (BLANC-55) Tj ET 0 g' % (200 * MM, y(250)))
    w('BT /F1 10 Tf 1 0 0 1 %.3f %.3f Tm (DEHORS-33) Tj ET' % (450 * MM, y(50)))
    w('/OC /Cache BDC BT /F1 10 Tf 1 0 0 1 %.3f %.3f Tm (CALQUE-44) Tj ET EMC' % (100 * MM, y(250)))
    w('BT /F1 0.5 Tf 1 0 0 1 %.3f %.3f Tm (MINUS-11) Tj ET' % (300 * MM, y(250)))
    w('BT /F1 10 Tf 1 0 0 1 %.3f %.3f Tm (SOUS-AP-22) Tj ET' % (340 * MM, y(30)))
    w('0.5 g %.3f %.3f %.3f %.3f re f 0 g' % (338 * MM, y(34), 30 * MM, 8 * MM))     # l'aplat qui le recouvre
    # du contenu marque qui porte un texte cache
    w('/Span << /ActualText (ALT-CACHE-9) /PartNumber (PN-MS3106-22) >> BDC EMC')
    # le formulaire imbrique (un rectangle et un texte), pose deux fois
    w('q 1 0 0 1 %.3f %.3f cm /Fx1 Do Q' % (300 * MM, y(60)))
    w('q 1 0 0 1 %.3f %.3f cm /Fx1 Do Q' % (300 * MM, y(80)))
    # une petite image en ligne (2 x 2, gris)
    w('q %.3f 0 0 %.3f %.3f %.3f cm BI /W 2 /H 2 /BPC 8 /CS /G ID \x00\x80\x80\xff EI Q' % (10 * MM, 10 * MM, 350 * MM, y(280)))
    data = ('\n'.join(c) + '\n').encode('latin-1')
    verite = {
        'textes_visibles': VISIBLES, 'invisibles': INVISIBLES,
        'segments': 3 + 2 + 1 + 3 + 2,     # dont les diagonales des deux formulaires
        'rectangles': 2 + 1 + 1 + 2,       # cadre, connu, a la main, aplat, deux formulaires
        'cercles': 1, 'courbes': 1, 'images': 1,
        'rect_connu': (50.0, 40.0, 80.0, 60.0),
    }
    return data, verite


def objets_du_schema(contenu, filtres=('FlateDecode',)):
    filtres = list(filtres)
    brut = filtrer(contenu, filtres)
    nom_filtres = (b'/Filter [' + b' '.join(b'/' + f.encode() for f in filtres) + b'] ') if filtres else b''
    tounicode = (b'/CIDInit /ProcSet findresource begin 12 dict begin begincmap /CMapName /Essai def '
                 b'1 begincodespacerange <0000> <FFFF> endcodespacerange '
                 b'2 beginbfrange <0005> <0005> <0039> <0006> <0007> [<0030> <0031>] endbfrange '
                 b'4 beginbfchar <0001> <0049> <0002> <0044> <0003> <0048> <0004> <002D> endbfchar '
                 b'endcmap CMapName currentdict /CMap defineresource pop end end')
    t3_tu = (b'1 begincodespacerange <00> <FF> endcodespacerange '
             b'6 beginbfchar <01> <0054> <02> <0033> <03> <002D> <04> <0041> <05> <0042> <06> <0020> endbfchar')
    glyphe = b'500 0 0 0 400 700 d1 0 0 400 700 re f'
    forme = (b'0 0 10 5 re S 0 0 m 10 5 l S BT /F1 3 Tf 1 6 Td (FORMTXT-1) Tj ET').replace(b'10', b'%.3f' % (10 * MM)).replace(b' 5 ', b' %.3f ' % (5 * MM))
    forme_ext = b'/Fx2 Do'
    o = {
        1: Objet(b'<< /Type /Catalog /Pages 2 0 R /OCProperties << /OCGs [20 0 R 21 0 R] /D << /OFF [21 0 R] >> >> >>'),
        2: Objet(b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
        3: Objet(b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2f %.2f] /Contents 4 0 R /Annots [30 0 R 31 0 R] '
                 b'/Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 9 0 R >> /XObject << /Fx1 12 0 R >> '
                 b'/Properties << /Cache 21 0 R >> >> >>' % (L_A3, H_A3)),
        4: Objet(b'<< ' + nom_filtres + b'/Length %d >>' % len(brut), brut),
        5: Objet(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),
        6: Objet(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'),
        7: Objet(b'<< /Type /Font /Subtype /Type0 /BaseFont /ABCDEF+Essai /Encoding /Identity-H '
                 b'/DescendantFonts [8 0 R] /ToUnicode 11 0 R >>'),
        8: Objet(b'<< /Type /Font /Subtype /CIDFontType2 /BaseFont /ABCDEF+Essai /CIDSystemInfo << /Registry (Adobe) '
                 b'/Ordering (Identity) /Supplement 0 >> /DW 600 /W [1 [610 620 630] 4 7 500] /FontDescriptor 10 0 R >>'),
        9: Objet(b'<< /Type /Font /Subtype /Type3 /FontMatrix [0.001 0 0 0.001 0 0] /FontBBox [0 0 500 700] '
                 b'/FirstChar 1 /LastChar 6 /Widths [550 560 570 580 590 250] /Encoding << /Type /Encoding '
                 b'/Differences [1 /g1 /g2 /g3 /g4 /g5 /g6] >> /CharProcs 13 0 R /Resources << >> /ToUnicode 14 0 R >>'),
        10: Objet(b'<< /Type /FontDescriptor /FontName /ABCDEF+Essai /Flags 4 /FontBBox [0 -200 1000 900] /ItalicAngle 0 '
                  b'/Ascent 800 /Descent -200 /CapHeight 700 /StemV 80 >>'),
        11: Objet(b'<< /Length %d >>' % len(tounicode), tounicode),
        12: Objet(b'<< /Type /XObject /Subtype /Form /BBox [-1 -1 100 100] /Resources << /Font << /F1 5 0 R >> '
                  b'/XObject << /Fx2 15 0 R >> >> /Length %d >>' % len(forme_ext), forme_ext),
        13: Objet(b'<< /g1 16 0 R /g2 16 0 R /g3 16 0 R /g4 16 0 R /g5 16 0 R /g6 16 0 R >>'),
        14: Objet(b'<< /Length %d >>' % len(t3_tu), t3_tu),
        15: Objet(b'<< /Type /XObject /Subtype /Form /BBox [-1 -1 100 100] /Resources << /Font << /F1 5 0 R >> >> '
                  b'/Length %d >>' % len(forme), forme),
        16: Objet(b'<< /Length %d >>' % len(glyphe), glyphe),
        20: Objet(b'<< /Type /OCG /Name (Fils du harnais) >>'),
        21: Objet(b'<< /Type /OCG /Name (Notes internes Martin) >>'),
        30: Objet(b'<< /Type /Annot /Subtype /Text /Rect [100 100 120 120] /Contents (NOTE-ANNOT-5) /F 2 >>'),
        31: Objet(b'<< /Type /Annot /Subtype /Link /Rect [200 100 260 120] /Border [0 0 0] '
                  b'/A << /S /URI /URI (http://intranet.example/Airbus/Tigre) >> >>'),
    }
    return o


INFO = (b'<< /Producer (SEE Electrical Expert V4R3 - Airbus Helicopters Marignane) /Creator (C:\\\\Users\\\\jdupont\\\\Projet Tigre\\\\plan.see) '
        b'/Author (Jean Dupont) /Title (Projet Tigre) /CreationDate (D:20240115093000) >>')


def schema(**options):
    contenu, verite = contenu_principal()
    filtres = options.pop('filtres', ('FlateDecode',))
    o = objets_du_schema(contenu, filtres)
    return ecrire_pdf(o, info=INFO, **options), verite


def mise_a_jour(pdf):
    """Une mise a jour incrementale : la page recoit un second flux de contenu."""
    m = re.search(rb'startxref\s+(\d+)', pdf[-64:])
    prec = int(m.group(1))
    ajout = b'BT /F1 10 Tf 1 0 0 1 100 400 Tm (AJOUT-88) Tj ET 100 380 m 200 380 l S'
    taille = int(re.findall(rb'/Size (\d+)', pdf)[-1])
    page = re.search(rb'3 0 obj\n(<<.*?>>)\nendobj', pdf, re.S).group(1)
    page = page.replace(b'/Contents 4 0 R', b'/Contents [4 0 R %d 0 R]' % taille)
    sortie = bytearray(pdf)
    pos_page = len(sortie)
    sortie += b'3 0 obj\n' + page + b'\nendobj\n'
    pos_flux = len(sortie)
    sortie += b'%d 0 obj\n<< /Length %d >>\nstream\n' % (taille, len(ajout)) + ajout + b'\nendstream\nendobj\n'
    x = len(sortie)
    racine = re.findall(rb'/Root (\d+) 0 R', pdf)[-1]
    sortie += b'xref\n0 1\n0000000000 65535 f \n3 1\n%010d 00000 n \n%d 1\n%010d 00000 n \n' % (pos_page, taille, pos_flux)
    sortie += b'trailer\n<< /Size %d /Root %s 0 R /Prev %d >>\nstartxref\n%d\n%%%%EOF\n' % (taille + 1, racine, prec, x)
    return bytes(sortie)


def page_tournee():
    """Une page A4 tournee de 90 degres : un rectangle connu dans l'espace du PDF."""
    contenu = b'1 w 0 0 0 RG %.3f %.3f %.3f %.3f re S BT /F1 10 Tf 1 0 0 1 100 100 Tm (TOURNE-6) Tj ET' % (
        20 * MM, 20 * MM, 30 * MM, 10 * MM)
    o = {1: Objet(b'<< /Type /Catalog /Pages 2 0 R >>'),
         2: Objet(b'<< /Type /Pages /Kids [3 0 R] /Count 1 /Rotate 90 /MediaBox [0 0 595.28 841.89] >>'),
         3: Objet(b'<< /Type /Page /Parent 2 0 R /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>'),
         4: Objet(b'<< /Length %d >>' % len(contenu), contenu),
         5: Objet(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')}
    return ecrire_pdf(o)


def trois_pages():
    """Trois pages qui partagent un contenu (un trait, un texte) ; Resources et MediaBox heritees."""
    contenu = b'100 100 m 300 100 l S BT /F1 10 Tf 100 200 Td (PAGE-X) Tj ET'
    o = {1: Objet(b'<< /Type /Catalog /Pages 2 0 R >>'),
         2: Objet(b'<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 /MediaBox [0 0 595.28 841.89] '
                  b'/Resources << /Font << /F1 7 0 R >> >> >>'),
         3: Objet(b'<< /Type /Page /Parent 2 0 R /Contents 6 0 R >>'),
         4: Objet(b'<< /Type /Page /Parent 2 0 R /Contents 6 0 R >>'),
         5: Objet(b'<< /Type /Page /Parent 2 0 R /Contents 6 0 R >>'),
         6: Objet(b'<< /Length %d >>' % len(contenu), contenu),
         7: Objet(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')}
    return ecrire_pdf(o)


def page_scannee():
    l, h = 124, 175
    pixels = bytes([240]) * (l * h)
    brut = zlib.compress(pixels)
    contenu = b'q 595.28 0 0 841.89 0 0 cm /Im1 Do Q'
    o = {1: Objet(b'<< /Type /Catalog /Pages 2 0 R >>'),
         2: Objet(b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
         3: Objet(b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R '
                  b'/Resources << /XObject << /Im1 5 0 R >> >> >>'),
         4: Objet(b'<< /Length %d >>' % len(contenu), contenu),
         5: Objet(b'<< /Type /XObject /Subtype /Image /Width %d /Height %d /ColorSpace /DeviceGray '
                  b'/BitsPerComponent 8 /Filter /FlateDecode /Length %d >>' % (l, h, len(brut)), brut)}
    return ecrire_pdf(o)


# ---------------------------------------------------------------------------
#  Les controles
# ---------------------------------------------------------------------------

def releve(data, lecteur='standard', **opt):
    o = {'lecteur': lecteur, 'silencieux': True}
    o.update(opt)
    fitz = S.importer_pymupdf() if lecteur != 'standard' else None
    return S.relever(data, o, fitz)


def textes_de(rel, visibles=None):
    t = []
    for p in rel.pages:
        for e in p['elements']:
            if e['type'] == 'texte' and (visibles is None or e['visible'] == visibles):
                t.append(e)
    return t


def compte(rel, genre):
    return sum(1 for p in rel.pages for e in p['elements'] if e['type'] == genre)


def signature(rel):
    """Les elements d'un releve, arrondis au centieme de mm : pour comparer
    deux structures du meme PDF."""
    sortie = []
    for p in rel.pages:
        for e in p['elements']:
            sortie.append((p['num'], e['type'], round(e['x1'] / MM, 2), round(e['y1'] / MM, 2), round(e['x2'] / MM, 2),
                           round(e['y2'] / MM, 2), e.get('texte', ''), e['visible'], tuple(e['raisons'])))
    return sorted(sortie)


def lancer_sonde(fichiers, dossier, *options):
    cmd = [sys.executable, SONDE] + list(fichiers) + ['--sortie=' + dossier] + list(options)
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    return p.returncode, p.stdout.decode('ascii', 'replace')


def fuites(dossier, chaines):
    """Les chaines (au moins 3 caracteres) trouvees dans les fichiers du dossier."""
    trouve = []
    for nom in os.listdir(dossier):
        contenu = open(os.path.join(dossier, nom), 'rb').read().decode('utf-8', 'replace').lower()
        for c in chaines:
            if len(c) >= 3 and c.lower() in contenu:
                trouve.append((nom, c))
    return trouve


def controles_fabriques(tmp, garder):
    print('\n== Le schema invente, lecteur standard ==')
    pdf, verite = schema()
    rel = releve(pdf)
    ok(rel.erreur is None and len(rel.pages) == 1, 'le schema se lit : 1 page')
    vis = textes_de(rel, True)
    invis = textes_de(rel, False)
    lus = sorted(e['texte'] for e in vis)
    ok(sorted(verite['textes_visibles']) == lus, 'les %d textes visibles, chacun lu en entier : %s' % (len(lus), ', '.join(lus)))
    raisons = dict((e['texte'], e['raisons']) for e in invis)
    for t, r in sorted(verite['invisibles'].items()):
        ok(t in raisons and r in raisons[t], 'texte invisible %s : compte comme invisible (%s), raisons lues %s' % (
            t, r, raisons.get(t)))
    ok(len(invis) == len(verite['invisibles']), '%d textes invisibles, ni plus ni moins' % len(invis))
    ok(compte(rel, 'segment') == verite['segments'], 'segments : %d (attendu %d)' % (compte(rel, 'segment'), verite['segments']))
    ok(compte(rel, 'rectangle') == verite['rectangles'], 'rectangles : %d (attendu %d)' % (compte(rel, 'rectangle'), verite['rectangles']))
    ok(compte(rel, 'cercle') == 1 and compte(rel, 'courbe') == 1, 'un cercle, une courbe')
    ok(compte(rel, 'image') == 1, 'une image (en ligne)')
    c = rel.pages[0]['comptes']
    ok((c['H'], c['V'], c['O']) == (3 + 2, 2 + 1, 1 + 2), 'segments horizontaux / verticaux / obliques : %d / %d / %d' % (c['H'], c['V'], c['O']))
    x1, y1, x2, y2 = verite['rect_connu']
    connus = [e for e in rel.pages[0]['elements'] if e['type'] == 'rectangle'
              and abs(e['x1'] / MM - x1) < 0.01 and abs(e['y1'] / MM - y1) < 0.01
              and abs(e['x2'] / MM - x2) < 0.01 and abs(e['y2'] / MM - y2) < 0.01]
    ok(len(connus) == 1, 'le rectangle connu est a x 50 -> 80 mm, y 40 -> 60 mm depuis le HAUT de la page')
    t = [e for e in vis if e['texte'] == '601RC1'][0]
    ok(abs(t['x1'] / MM - 50) < 0.01 and abs(t['y1'] / MM - 30) < 0.01 and abs(t['angle']) < 0.01,
       'le texte 601RC1 commence a (50 ; 30) mm, ligne de base, angle 0')
    largeur = (t['x2'] - t['x1'])
    ok(abs(largeur - 10 * (556 + 556 + 556 + 722 + 722 + 556) / 1000.0) < 0.01, 'sa longueur suit les largeurs de Helvetica (%.2f pt)' % largeur)
    v = [e for e in vis if e['texte'] == 'VERT-90'][0]
    ok(abs(v['angle'] - 90) < 0.01 and abs(v['x1'] / MM - 380) < 0.01 and abs(v['y1'] / MM - 200) < 0.01 and v['y2'] < v['y1'],
       'le texte tourne lit de bas en haut : angle 90, depart (380 ; 200) mm')
    idh = [e for e in vis if e['texte'] == 'IDH-901'][0]
    ok(abs((idh['x2'] - idh['x1']) - 8 * (610 + 620 + 630 + 500 + 500 + 500 + 500) / 1000.0) < 0.01,
       'police composite Identity-H : texte par sa ToUnicode, longueur par /W')
    t3 = [e for e in vis if e['texte'] == 'T3-AB'][0]
    ok(abs((t3['x2'] - t3['x1']) - 12 * (550 + 560 + 570 + 580 + 590) / 1000.0) < 0.01, 'police Type3 : largeurs par /Widths et /FontMatrix')
    m = rel.pages[0]
    ok(any(t == 'ALT-CACHE-9' for _, t in m['textes_marques']) and any(t == 'PN-MS3106-22' for _, t in m['textes_marques']),
       'le contenu marque : ActualText et une cle propre (PartNumber) releves')
    ann = [e for e in m['elements'] if e['type'] == 'annotation']
    ok(len(ann) == 2 and any(e['texte'] == 'NOTE-ANNOT-5' and not e['visible'] for e in ann),
       'deux annotations, la note cachee comptee invisible')
    v_doc = S.verdict_document([p['verdict'] for p in rel.pages])[0]
    ok(v_doc == 'vectoriel avec texte', 'verdict : %s' % v_doc)
    inf = rel.infos
    ok('SEE Electrical Expert V4R3' in inf['producer'] and 'Airbus' not in inf['producer'] and 'Marignane' not in inf['producer'],
       'Producer : le logiciel garde, la societe et le lieu masques (%s)' % inf['producer'])
    ok('jdupont' not in inf['creator'] and 'Tigre' not in inf['creator'], 'Creator : le chemin masque (%s)' % inf['creator'])
    ok(len(rel.infos['calques']) == 2 and [x[2] for x in rel.infos['calques']] == [True, False], 'deux calques, le second masque par defaut')

    print('\n== Le meme schema sous d\'autres structures (memes elements a 0,01 mm) ==')
    ref = signature(rel)
    variantes = [
        ('flux xref (predicteur PNG) et flux d\'objets', dict(xref_flux=True, flux_objets=True)),
        ('flux xref sans flux d\'objets', dict(xref_flux=True)),
        ('ASCIIHex', dict(filtres=('ASCIIHexDecode',))),
        ('ASCII85', dict(filtres=('ASCII85Decode',))),
        ('LZW', dict(filtres=('LZWDecode',))),
        ('RunLength', dict(filtres=('RunLengthDecode',))),
        ('sans filtre', dict(filtres=())),
        ('ASCII85 puis Flate (deux filtres)', dict(filtres=('ASCII85Decode', 'FlateDecode'))),
        ('chiffre RC4 128 bits, mot de passe vide', dict(chiffrer=True)),
        ('chiffre RC4 et flux xref', dict(chiffrer=True, xref_flux=True)),
    ]
    fichiers = {}
    for nom, opts in variantes:
        d, _ = schema(**opts)
        r = releve(d)
        ok(r.erreur is None and signature(r) == ref, nom)
        fichiers[nom] = d
    d, _ = schema()
    inc = mise_a_jour(d)
    r = releve(inc)
    ok(r.erreur is None and sorted(e['texte'] for e in textes_de(r, True)) == sorted(verite['textes_visibles'] + ['AJOUT-88'])
       and compte(r, 'segment') == verite['segments'] + 1 and r.infos['structure']['mises_a_jour'] == 1,
       'mise a jour incrementale : le texte et le trait ajoutes, une mise a jour comptee')
    r = releve(inc[:-int(len(inc) * 0.02)])
    ok(r.erreur is None and len(r.pages) == 1, 'fichier tronque (2 %% en moins) : lu quand meme, reconstruit=%s' % r.infos['structure']['reconstruit'])
    faux = re.sub(rb'(\d{10}) 00000 n', lambda m_: b'%010d 00000 n' % (int(m_.group(1)) + 37), d)
    r = releve(faux)
    ok(r.erreur is None and signature(r) == ref, 'table xref fausse (decalee de 37 octets) : memes elements')
    ok(any('xref' in m_ for m_, _ in r.notes.liste()), 'et le rapport le dit')
    r = releve(b'%PDF-1.4\nrien du tout\n')
    ok(r.erreur is not None, 'un PDF sans objets : illisible, sans plantage (%s)' % r.erreur)
    r = releve(b'\x00\x01 pas un pdf' * 100)
    ok(r.erreur is not None, 'un fichier qui n\'est pas un PDF : illisible, sans plantage')

    print('\n== Page tournee, page scannee ==')
    r = releve(page_tournee())
    p = r.pages[0]
    ok(abs(p['W'] / MM - 297) < 0.1 and abs(p['H'] / MM - 210) < 0.1 and p['rot'] == 90, 'A4 tournee de 90 : vue 297 x 210 mm (paysage)')
    rect = [e for e in p['elements'] if e['type'] == 'rectangle'][0]
    ok(abs(rect['x1'] / MM - 20) < 0.01 and abs(rect['y1'] / MM - 20) < 0.01 and abs(rect['x2'] / MM - 30) < 0.01
       and abs(rect['y2'] / MM - 50) < 0.01, 'le rectangle (20 ; 20 ; 30 x 10 mm dans le PDF) vu en (20 ; 20) -> (30 ; 50) mm')
    r = releve(page_scannee())
    v_doc = S.verdict_document([p['verdict'] for p in r.pages])[0]
    ok(v_doc == 'scanne (image seule)', 'une image seule : %s' % v_doc)
    r = releve(trois_pages())
    ok(len(r.pages) == 3 and all(len(p['elements']) == 2 for p in r.pages), 'trois pages, Resources et MediaBox heritees de /Pages')
    r = releve(trois_pages(), pages=set([2, 3]))
    ok([p['num'] for p in r.pages] == [2, 3], '--pages=2-3 : seulement les pages 2 et 3')
    garde = S.LIMITE_ELEMENTS
    S.LIMITE_ELEMENTS = 1
    try:
        r = releve(trois_pages())
    finally:
        S.LIMITE_ELEMENTS = garde
    ok(len(r.pages) == 1 and any('memoire' in m for m, _ in r.notes.liste()),
       'au-dela de la limite d\'elements, la lecture s\'arrete et le rapport le dit')

    print('\n== La ligne de commande : rien de reel ne sort ==')
    src = os.path.join(tmp, 'entree')
    os.makedirs(src)
    chemins = []
    for nom, d in [(NOM_FICHIER, pdf), (NOM_FICHIER + '-chiffre', fichiers['chiffre RC4 128 bits, mot de passe vide']),
                   (NOM_FICHIER + '-lzw', fichiers['LZW'])]:
        c = os.path.join(src, nom + '.pdf')
        open(c, 'wb').write(d)
        chemins.append(c)
    sortie = os.path.join(tmp, 'rapports')
    code, ecran = lancer_sonde([src], sortie, '--lecteur=standard')
    noms = sorted(os.listdir(sortie))
    ok(code == 0 and len(noms) == 6, 'trois PDF (un dossier) -> six fichiers : %s' % ', '.join(noms))
    ok(all(re.match(r'^\d\d-[0-9a-f]{8}\.(rapport\.txt|elements\.tsv)$', n) for n in noms), 'nommes par numero et empreinte seulement')
    chaines = VISIBLES + list(INVISIBLES) + SECRETS + [NOM_FICHIER, 'H160', 'jdupont', 'AJOUT-88']
    f = fuites(sortie, chaines)
    ok(not f, 'aucune des %d chaines reelles dans les rapports ni les TSV%s' % (len(chaines), (' : ' + repr(f[:5])) if f else ''))
    ok(all(ord(c) < 128 for c in ecran), 'l\'ecran ne recoit que de l\'ASCII (console Windows)')
    ok(NOM_FICHIER not in ecran, 'ni le nom du fichier a l\'ecran')
    rap = open(os.path.join(sortie, noms[1]), 'rb').read()
    ok(rap.startswith(b'\xef\xbb\xbf') and b'\r\n' in rap and b'\n' not in rap.replace(b'\r\n', b''), 'rapport : UTF-8 avec BOM, CRLF')
    ok(u'ANONYMISÉ'.encode('utf-8') in rap.split(b'\r\n')[0], 'la premiere ligne dit « ANONYMISÉ »')
    tsv = open(os.path.join(sortie, noms[0]), 'rb').read().decode('utf-8-sig').split('\r\n')
    entete = tsv[0].split('\t')
    ok(entete == list(S.COLONNES_TSV), 'TSV : les colonnes du contrat (%s)' % ', '.join(entete))
    lignes = [l.split('\t') for l in tsv[1:] if l]
    ok(all(len(l) == len(entete) for l in lignes), 'chaque ligne a %d colonnes' % len(entete))
    K = dict((nom, i) for i, nom in enumerate(entete))
    motifs = [l[K['motif']] for l in lignes if l[2] == 'texte']
    ok('999AA9' in motifs and 'A-9999-99' in motifs and u'Aaaaa aaaaaa' in motifs,
       'motifs : 601RC1 -> 999AA9, W-1234-22 -> A-9999-99, Câble blindé -> Aaaaa aaaaaa')
    rect = [l for l in lignes if l[2] == 'rectangle' and l[3:7] == ['50.00', '40.00', '80.00', '60.00']]
    ok(len(rect) == 1, 'le rectangle connu dans le TSV : 50.00 40.00 80.00 60.00')
    invis = [l for l in lignes if l[2] == 'texte' and l[K['visible']] == 'N']
    ok(len(invis) == 6 and set(l[K['raison']] for l in invis) == set(INVISIBLES.values()), 'les six textes invisibles et leurs raisons dans le TSV')
    blocs = sorted(set(l[K['bloc']] for l in lignes if l[K['bloc']]))
    ok(blocs == ['X1.1', 'X1.2'] and sum(1 for l in lignes if l[K['bloc']] == 'X1.1') == 3,
       'le formulaire pose deux fois : ses elements portent X1.1 et X1.2 (rectangle, diagonale, texte)')
    # --clair
    sortie2 = os.path.join(tmp, 'clair')
    code, ecran = lancer_sonde([chemins[0]], sortie2, '--lecteur=standard', '--clair')
    f = fuites(sortie2, ['601RC1', 'W-1234-22', 'FANTOME-77', NOM_FICHIER])
    ok(code == 0 and len(f) >= 4, 'avec --clair, les textes reels et le nom du fichier sont ecrits')
    rap = [n for n in os.listdir(sortie2) if n.endswith('.txt')][0]
    ok(u'EN CLAIR'.encode('utf-8') in open(os.path.join(sortie2, rap), 'rb').read().split(b'\r\n')[0], 'et la premiere ligne dit « EN CLAIR »')
    # numerotation qui continue
    code, _ = lancer_sonde([chemins[0]], sortie, '--lecteur=standard')
    ok(any(n.startswith('04-') for n in os.listdir(sortie)), 'un second passage continue la numerotation (04-...)')
    # sans PDF
    code, ecran = lancer_sonde([os.path.join(tmp, 'nexiste-pas')], os.path.join(tmp, 'vide'))
    ok(code == 1 and 'Aucun PDF' in ecran, 'sans PDF : un message clair, code 1')
    if garder:
        for nom, d in [('schema', pdf), ('schema-incremental', inc), ('tournee', page_tournee()), ('scannee', page_scannee())] + \
                [('schema-' + re.sub(r'[^a-z0-9]+', '-', k.lower()), v) for k, v in fichiers.items()]:
            open(os.path.join(garder, nom + '.pdf'), 'wb').write(d)
    return pdf, fichiers, inc


# ---------------------------------------------------------------------------
#  Les constats des relectures : chacun a son controle
# ---------------------------------------------------------------------------

def pdf_page(contenu, ressources=b'', page_extra=b'', objets=None, catalogue_extra=b'', info=None,
             media=b'0 0 595 842', **kw):
    """Un PDF d'une page : contenu (octets), ressources de la page (sans << >>)."""
    if not isinstance(contenu, bytes):
        contenu = contenu.encode('latin-1')
    o = {1: Objet(b'<< /Type /Catalog /Pages 2 0 R ' + catalogue_extra + b' >>'),
         2: Objet(b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
         3: Objet(b'<< /Type /Page /Parent 2 0 R /MediaBox [' + media + b'] /Contents 4 0 R /Resources << '
                  + ressources + b' >> ' + page_extra + b' >>'),
         4: Objet(b'<< /Length %d >>' % len(contenu), contenu)}
    if objets:
        o.update(objets)
    return ecrire_pdf(o, info=info, **kw)


HELV = b'/Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >>'

# une police « baton » (comme une police SHX d'AutoCAD) : chaque lettre en traits, sur une grille 4 x 6
TRAITS = {
    'K': [(0, 0, 0, 6), (0, 3, 4, 6), (1, 3.5, 4, 0)], 'E': [(4, 0, 0, 0), (0, 0, 0, 6), (0, 6, 4, 6), (0, 3, 3, 3)],
    'S': [(4, 6, 0, 6), (0, 6, 0, 3), (0, 3, 4, 3), (4, 3, 4, 0), (4, 0, 0, 0)], 'T': [(0, 6, 4, 6), (2, 6, 2, 0)],
    'R': [(0, 0, 0, 6), (0, 6, 4, 6), (4, 6, 4, 3), (4, 3, 0, 3), (1, 3, 4, 0)], 'L': [(0, 6, 0, 0), (0, 0, 4, 0)],
    '3': [(0, 6, 4, 6), (4, 6, 4, 0), (4, 0, 0, 0), (1, 3, 4, 3)], '5': [(4, 6, 0, 6), (0, 6, 0, 3), (0, 3, 4, 3), (4, 3, 4, 0), (4, 0, 0, 0)],
    '0': [(0, 0, 4, 0), (4, 0, 4, 6), (4, 6, 0, 6), (0, 6, 0, 0), (0, 0, 4, 6)], 'A': [(0, 0, 2, 6), (2, 6, 4, 0), (1, 3, 3, 3)],
    '4': [(3, 0, 3, 6), (3, 6, 0, 2), (0, 2, 4, 2)], '1': [(1, 5, 2, 6), (2, 6, 2, 0)], '-': [(0, 3, 4, 3)],
    'W': [(0, 6, 1, 0), (1, 0, 2, 4), (2, 4, 3, 0), (3, 0, 4, 6)], '2': [(0, 6, 4, 6), (4, 6, 4, 3), (4, 3, 0, 3), (0, 3, 0, 0), (0, 0, 4, 0)],
    '7': [(0, 6, 4, 6), (4, 6, 1, 0)], 'G': [(4, 6, 0, 6), (0, 6, 0, 0), (0, 0, 4, 0), (4, 0, 4, 3), (4, 3, 2, 3)],
    'I': [(2, 0, 2, 6), (1, 0, 3, 0), (1, 6, 3, 6)],
}


def texte_en_traits(x, y, chaine, h=8.5, contour=False):
    """Un texte dessine en traits (contour=False) ou vectorise en contours pleins (contour=True : chaque trait
    devient un quadrilatere plein, et un O un anneau de courbes de Bezier)."""
    u = h / 6.0
    out = []
    for ch in chaine:
        if contour and ch == 'O':
            for r_, sens in ((3 * u, 1), (2.4 * u, -1)):
                cx, cy, k = x + 2 * u, y + 3 * u, 0.5523 * r_
                out.append('%.2f %.2f m %.2f %.2f %.2f %.2f %.2f %.2f c %.2f %.2f %.2f %.2f %.2f %.2f c '
                           '%.2f %.2f %.2f %.2f %.2f %.2f c %.2f %.2f %.2f %.2f %.2f %.2f c h' % (
                               cx + r_, cy, cx + r_, cy + k, cx + k, cy + r_, cx, cy + r_, cx - k, cy + r_, cx - r_, cy + k,
                               cx - r_, cy, cx - r_, cy - k, cx - k, cy - r_, cx, cy - r_, cx + k, cy - r_, cx + r_, cy - k,
                               cx + r_, cy))
            out.append('f*')
        for (a, b, c, d) in TRAITS.get(ch, []):
            xa, ya, xb, yb = x + a * u, y + b * u, x + c * u, y + d * u
            if not contour:
                out.append('%.2f %.2f m %.2f %.2f l S' % (xa, ya, xb, yb))
            else:
                L = ((xb - xa) ** 2 + (yb - ya) ** 2) ** 0.5 or 1.0
                ex, ey = -(yb - ya) / L * 0.35 * u, (xb - xa) / L * 0.35 * u
                out.append('%.2f %.2f m %.2f %.2f l %.2f %.2f l %.2f %.2f l h f' % (
                    xa + ex, ya + ey, xb + ex, yb + ey, xb - ex, yb - ey, xa - ex, ya - ey))
        x += 6 * u
    return out


def lignes_tsv(dossier):
    """{nom du TSV: [lignes en dictionnaires]}."""
    sortie = {}
    for nom in sorted(os.listdir(dossier)):
        if nom.endswith('.tsv'):
            lignes = io.open(os.path.join(dossier, nom), encoding='utf-8-sig', newline='').read().split('\r\n')
            entete = lignes[0].split('\t')
            sortie[nom] = [dict(zip(entete, l.split('\t'))) for l in lignes[1:] if l]
    return sortie


def rapport_de(dossier):
    noms = [n for n in sorted(os.listdir(dossier)) if n.endswith('.rapport.txt')]
    return io.open(os.path.join(dossier, noms[0]), encoding='utf-8-sig').read() if noms else ''


def dans_zone(l, zone):
    """La ligne du TSV (mm) tient-elle dans la zone (x0, y0, x1, y1, mm) ?"""
    try:
        xs = (float(l['x1']), float(l['x2']))
        ys = (float(l['y1']), float(l['y2']))
    except (KeyError, ValueError):
        return False
    return zone[0] <= min(xs) and max(xs) <= zone[2] and zone[1] <= min(ys) and max(ys) <= zone[3]


def controles_constats(tmp):
    fitz = S.importer_pymupdf()

    print('\n== C1 : un texte dessine en traits ou vectorise ne se relit pas dans le TSV ==')
    c = ['0 0 0 RG 0.35 w 1 J']
    c += texte_en_traits(100, 700, 'KESTREL 350A41-1234-00')
    c += texte_en_traits(100, 660, 'W2017 TIGRE')
    c += ['0 g'] + texte_en_traits(100, 600, 'KOLTE 37 WIG2', h=12, contour=True)
    c += ['0.7 w 80 560 m 500 560 l S 80 560 m 80 450 l S 300 470 60 30 re S']
    # un fil coupe en morceaux de 3 mm (piquages) : il garde sa longueur, ce n'est pas un petit trait
    pas = 3 * MM
    c += ['%.2f 430 m %.2f 430 l S' % (100 + k * pas, 100 + (k + 1) * pas) for k in range(30)]
    d = pdf_page('\n'.join(c))
    zone_traits = (100 / MM - 1, (842 - 700 - 9) / MM - 1, 100 / MM + 22 * 3 + 1, (842 - 700) / MM + 1)
    zone_traits2 = (100 / MM - 1, (842 - 660 - 9) / MM - 1, 100 / MM + 11 * 3 + 1, (842 - 660) / MM + 1)
    zone_contours = (100 / MM - 2, (842 - 600 - 13) / MM - 2, 100 / MM + 13 * 12 / MM + 2, (842 - 600) / MM + 2)
    sortie = os.path.join(tmp, 'c1')
    src = os.path.join(tmp, 'c1-src')
    os.makedirs(src)
    open(os.path.join(src, 'traits.pdf'), 'wb').write(d)
    code, _ = lancer_sonde([src], sortie, '--lecteur=standard')
    l = list(lignes_tsv(sortie).values())[0]
    seuls = [x for x in l if x['type'] in ('segment', 'courbe', 'rectangle', 'cercle')
             and (dans_zone(x, zone_traits) or dans_zone(x, zone_traits2))]
    traits_lettres = [x for x in seuls if not (x['type'] == 'segment' and x['angle'] == '0.0')]
    ok(code == 0 and len(seuls) <= 2 and not traits_lettres,
       'texte en traits : %d trait(s) ecrit(s) un par un sur 140 (au plus 2 tirets isoles), aucun trait de lettre' % len(seuls))
    seuls = [x for x in l if x['type'] in ('segment', 'courbe', 'rectangle', 'cercle') and dans_zone(x, zone_contours)]
    ok(not seuls, 'texte vectorise en contours pleins (quadrilateres, anneaux de courbes) : aucun trait ecrit un par un (%d)' % len(seuls))
    amas = [x for x in l if x['type'] == 'amas']
    ok(len(amas) >= 5 and sum(1 for x in amas if 'texte dessine en traits' in x['details']) >= 3,
       'ils tiennent en %d lignes « amas » (boite, nombre de traits, taille typique)' % len(amas))
    fil = [x for x in l if x['type'] == 'segment' and x['y1'] == x['y2'] == '%.2f' % ((842 - 430) / MM)]
    ok(len(fil) == 30, 'un fil coupe en 30 morceaux de 3 mm reste 30 segments (sa longueur totale compte) : %d' % len(fil))
    ok(sum(1 for x in l if x['type'] == 'segment' and float(x['x2']) - float(x['x1']) > 100) == 1
       and sum(1 for x in l if x['type'] == 'rectangle' and x['x1'] == '%.2f' % (300 / MM)) == 1,
       'les fils longs et la boite restent ecrits')
    rap = rapport_de(sortie)
    ok('VECTORIEL SANS TEXTE' in rap and 'ressemblent a du texte dessine en traits' in rap,
       'le verdict dit « vectoriel sans texte » et compte les groupes de petits traits')
    sortie2 = os.path.join(tmp, 'c1-clair')
    code, _ = lancer_sonde([src], sortie2, '--lecteur=standard', '--clair')
    l2 = list(lignes_tsv(sortie2).values())[0]
    ok(sum(1 for x in l2 if x['type'] == 'segment') > 140 and not any(x['type'] == 'amas' for x in l2),
       'avec --clair, tous les traits sont ecrits (%d segments)' % sum(1 for x in l2 if x['type'] == 'segment'))

    print('\n== C2 : Producer / Creator ==')
    cas = [('SEE Electrical Expert V4R3 - Airbus Helicopters Marignane', ['SEE Electrical Expert V4R3'], ['Airbus', 'Marignane']),
           ('CATIA V5-6R2019 X4 Racer', ['CATIA V5-6R2019'], ['X4', 'Racer']),
           ('SEE V4R3 Projet 1234567 OT 98765', ['SEE V4R3'], ['Projet', '1234567', '98765']),
           ('v12345678', [], ['12345678']),
           ('Dassault Aviation Rafale', [], ['Dassault', 'Aviation', 'Rafale']),
           ('Dassault Systemes CATIA V5R21', ['Dassault Systemes CATIA V5R21'], []),
           ('SEE Electrical Expert V4R3 Albatrosse X350 350B3 build 1234 sp2 12345678', ['V4R3'],
            ['X350', '350B3', '1234', '12345678', 'Albatrosse']),
           ('PDFCreator 3.2 - Helidyne Provence 350A41 C:\\Users\\jdupont\\Tigre\\plan.see', ['PDFCreator 3.2'],
            ['350A41', 'Helidyne', 'jdupont', 'Tigre']),
           ('Acrobat Distiller 11.0 (Windows) Pontarlier Sharp Prince Power', ['Acrobat Distiller 11.0 (Windows)'],
            ['Sharp', 'Prince', 'Power', 'Pontarlier']),
           ('Helidyne CAD 704A47', [], ['704A47', 'Helidyne', 'CAD']),
           ('Microsoft\u00ae Word pour Microsoft 365', ['Microsoft\u00ae Word pour Microsoft 365'], []),
           ('macOS Version 10.15.7 (Build 19H2) Quartz PDFContext', ['10.15.7', 'Quartz PDFContext'], ['19H2']),
           ('Skia/PDF m118', ['Skia/PDF m118'], [])]
    for chaine, gardes, masques in cas:
        m = S.masquer_logiciel(chaine)
        ok(all(g in m for g in gardes) and not any(x in m for x in masques), '%r -> %r' % (chaine, m))

    print('\n== C3, C4, C6 : aucun nom propre (police, etiquette, cle, sorte, encre, filtre, gestionnaire) ==')
    largeurs = b' '.join([b'600'] * 95)
    res = (HELV[:-3] + b' /F2 6 0 R /F3 7 0 R /F5 9 0 R >> /ColorSpace << /CSKestrelRes [/Separation /HelidyneBleuCorporate '
           b'/DeviceRGB << /FunctionType 2 /Domain [0 1] /C0 [1 1 1] /C1 [0 0.3 0.8] /N 1 >>] >> '
           b'/Properties << /PrHelidyne << /Helidyne_Cle_Prop (ValeurSecreteZ) >> >>')
    contenu = (b'BT /F2 10 Tf 100 700 Td (Texte) Tj ET BT /F3 10 Tf 100 680 Td (AB) Tj ET '
               b'BT /F5 10 Tf 100 660 Td <00410042> Tj ET '
               b'/HelidynePN << /CleSecreteAlbatrosse (ValeurSecreteX) /PartNumber (PN-7788-01) >> BDC BT /F1 10 Tf 100 640 Td (Z) Tj ET EMC '
               b'/AlbatrosseTag BMC EMC /Span /PrHelidyne BDC EMC '
               b'/CSKestrelRes cs 1 scn 100 500 50 50 re f '
               b'q 20 0 0 20 300 300 cm BI /W 2 /H 2 /CS /CSKestrelRes /BPC 8 ID \x00\xff\x00\xff EI Q')
    objs = {6: Objet(b'<< /Type /Font /Subtype /TrueType /BaseFont /ABCDEF+HelidyneSans-Bold /FirstChar 32 /LastChar 126 '
                     b'/Widths [' + largeurs + b'] /Encoding /WinAnsiEncoding >>'),
            7: Objet(b'<< /Type /Font /Subtype /Type3 /Name /KestrelGlyphesT3 /FontBBox [0 0 1000 1000] '
                     b'/FontMatrix [0.001 0 0 0.001 0 0] /CharProcs << /A 8 0 R /B 8 0 R >> /Encoding << /Type /Encoding '
                     b'/Differences [65 /A /B] >> /FirstChar 65 /LastChar 66 /Widths [1000 1000] /Resources << >> >>'),
            8: Objet(b'<< /Length 43 >>', b'1000 0 0 0 1000 1000 d1 0 0 1000 1000 re f'),
            9: Objet(b'<< /Type /Font /Subtype /Type0 /BaseFont /GHIJKL+QuilesCorporateCID /Encoding /Identity-H '
                     b'/DescendantFonts [10 0 R] >>'),
            10: Objet(b'<< /Type /Font /Subtype /CIDFontType2 /BaseFont /GHIJKL+QuilesCorporateCID /CIDSystemInfo '
                      b'<< /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /DW 600 >>'),
            11: Objet(b'<< /Type /Annot /Subtype /HelidyneTamponMaison /Rect [400 400 420 420] /Contents (NoteSecreteY) >>')}
    d1 = pdf_page(contenu, res, b'/Annots [11 0 R]', objs)
    d2 = pdf_page(b'BT /F1 10 Tf 100 700 Td (AB) Tj ET', b'/Font << /F1 5 0 R >>',
                  objets={5: Objet(b'<< /Type /Font /Subtype /Type3 /FontBBox [0 0 1000 1000] /FontMatrix [(MatriceKestrel) 0 0 '
                                   b'0.001 0 0] /CharProcs << /A 6 0 R >> /Encoding << /Differences [65 /A] >> /FirstChar 65 '
                                   b'/LastChar 65 /Widths [1000] >>'),
                          6: Objet(b'<< /Length 43 >>', b'1000 0 0 0 1000 1000 d1 0 0 1000 1000 re f')})
    d3 = pdf_page(b'xxxxx')
    d3 = d3.replace(b'4 0 obj\n<< /Length 5 >>', b'4 0 obj\n<< /Length 5 /Filter /FiltreKestrelDecode >>')
    d4 = pdf_page(b'BT /F1 10 Tf 100 700 Td (Secret) Tj ET', HELV, objets={9: Objet(
        b'<< /Filter /HelidyneDRMGestion /V 2 /R 3 /Length 128 /P -4 /O <00> /U <00> >>')})
    d4 = d4.replace(b'/Root 1 0 R', b'/Root 1 0 R /Encrypt 9 0 R')
    src = os.path.join(tmp, 'noms')
    os.makedirs(src)
    for k, d in enumerate((d1, d2, d3, d4)):
        open(os.path.join(src, 'n%d.pdf' % k), 'wb').write(d)
    secrets = ['Helidyne', 'Kestrel', 'Albatrosse', 'Quiles', 'Corporate', 'ValeurSecrete', 'NoteSecrete', 'MatriceKestrel',
               'FiltreKestrel', 'DRMGestion', 'TamponMaison', 'PN-7788-01']
    for lecteur in ('standard',) + (('auto',) if fitz else ()):
        sortie = os.path.join(tmp, 'noms-' + lecteur)
        code, ecran = lancer_sonde([src], sortie, '--lecteur=' + lecteur)
        f = fuites(sortie, secrets)
        ok(code == 0 and len(os.listdir(sortie)) == 8 and not f and not any(x in ecran for x in secrets),
           'lecteur %s : polices maison, etiquettes et cles du contenu marque, sorte d\'annotation, encre, espace '
           'nomme, filtre, gestionnaire, message d\'erreur : aucun nom ne sort%s' % (lecteur, (' : ' + repr(f[:4])) if f else ''))
    rap = rapport_de(os.path.join(tmp, 'noms-standard'))
    ok(re.search(r'P\d \(AaaaaaaaAaaa-Aaaa\)', rap) and 'PartNumber' in rap and re.search(r'E\d \(AaaaaaaaAA\)', rap)
       and re.search(r'K\d \(AaaAaaaaaaAaaaaaaaaa\)', rap) and re.search(r'S\d \(AaaaaaaaAaaaaaAaaaaa\)', rap),
       'les noms masques le sont par un code et leur forme (P1, E1, K1, S1) ; PartNumber (mots ordinaires) reste')
    ok('Helvetica' in rap and 'Type3' in rap, 'les familles du commerce et Type3 restent nommees')

    print('\n== C5, C9 : --clair a part, rien de personnel a l\'ecran ==')
    copie = os.path.join(tmp, 'Projet Kestrel', 'sonde')
    os.makedirs(copie)
    shutil.copy(SONDE, copie)
    p_ = os.path.join(copie, 'sonde_pdf.py')
    pdf_, _ = schema()
    plan = os.path.join(tmp, 'Projet Kestrel', 'Plan_Kestrel.pdf')
    open(plan, 'wb').write(pdf_)
    r1 = subprocess.run([sys.executable, p_, plan, '--lecteur=standard'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    r2 = subprocess.run([sys.executable, p_, plan, '--lecteur=standard', '--clair'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    e1, e2 = r1.stdout.decode('ascii', 'replace'), r2.stdout.decode('ascii', 'replace')
    a = sorted(os.listdir(os.path.join(copie, 'rapports')))
    b = sorted(os.listdir(os.path.join(copie, 'rapports-EN-CLAIR')))
    ok(len(a) == 2 and not any('CLAIR' in n for n in a) and len(b) == 2 and all('.EN-CLAIR.' in n for n in b),
       '--clair ecrit NN-xxxxxxxx.EN-CLAIR.* dans « rapports-EN-CLAIR », a part : %s' % ', '.join(b))
    t = io.open(os.path.join(copie, 'rapports-EN-CLAIR', [n for n in b if n.endswith('.tsv')][0]), encoding='utf-8-sig').readline()
    ok(t.rstrip().endswith('texte_EN_CLAIR'), 'la colonne des vrais textes s\'appelle texte_EN_CLAIR')
    ok('ATTENTION' in e2 and 'EN CLAIR' in e2 and 'ATTENTION' not in e1, 'l\'ecran previent avec --clair, et seulement alors')
    ok(not any(x in e1 + e2 for x in ('Kestrel', tmp, 'Plan_')), 'l\'ecran ne montre ni le nom du PDF ni le chemin des dossiers')
    r3 = subprocess.run([sys.executable, p_, '--mot-de-pass=Secret123', plan], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    e3 = r3.stdout.decode('ascii', 'replace')
    ok(r3.returncode == 2 and 'Secret123' not in e3 and '--mot-de-pass' in e3,
       'une option mal tapee : seul son nom est repete (pas sa valeur, un mot de passe peut-etre)')
    r4 = subprocess.run([sys.executable, p_, '--deux', plan], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    ok(r4.returncode == 2, '--deux (qui n\'avait aucun effet) n\'existe plus')

    print('\n== C7 : la longueur d\'un texte ne suit pas la largeur de ses lettres ==')
    rel = releve(pdf_)
    t = [e for e in textes_de(rel, True) if e['texte'] == '601RC1'][0]
    anon = S.ligne_tsv(1, 1, t, {}, False)
    clair = S.ligne_tsv(1, 1, t, {}, True)
    ok(anon[5] == '%.2f' % (50 + 6 * 0.6 * 10 / MM) and clair[5] == '%.2f' % ((50 * MM + 36.68) / MM),
       'releve anonymise : 6 car. x 0,6 corps (x2 = %s mm) ; --clair : la vraie fin (%s mm)' % (anon[5], clair[5]))
    l1 = S.ligne_tsv(1, 1, dict(t, texte='MMMMMM'), {}, False)
    l2 = S.ligne_tsv(1, 1, dict(t, texte='IIIIII'), {}, False)
    ok(l1[5] == l2[5], 'MMMMMM et IIIIII ont la meme longueur dans le TSV')

    print('\n== C8 : motif() reduit toutes les lettres et tous les chiffres ==')
    for chaine, attendu in ((u'\u24c0\u24d4\u24e2\u24e3', u'Aaaa'), (u'\U0001f13a\U0001f134\U0001f142', u'AAA'),
                            (u'\u216b', u'9'), (u'\u246b', u'9'), (u'\u00bd', u'9'), (u'e\u0301tienne', u'aaaaaaa'),
                            (u'\U0001f150', u'A'), (u'601RC1', u'999AA9'), (u'C\u00e2ble', u'Aaaaa')):
        ok(S.motif(chaine) == attendu, 'motif(%r) = %r' % (chaine, S.motif(chaine)))

    print('\n== C10 : mot de passe vide d\'abord, puis utilisateur ou proprietaire ==')
    du, _ = schema(chiffrer=True, mdp_u=b'u')
    dv, _ = schema(chiffrer=True)
    r = releve(du)
    ok(r.erreur is not None, 'protege par « u » : illisible sans mot de passe')
    r = releve(du, mot_de_passe='u')
    ok(r.erreur is None and r.infos['chiffrement']['ouvert_par'] == 'utilisateur', 'ouvert avec « u » (utilisateur)')
    r = releve(du, mot_de_passe='p')
    ok(r.erreur is None and r.infos['chiffrement']['ouvert_par'] == 'proprietaire', 'ouvert avec « p » (proprietaire)')
    r = releve(dv, mot_de_passe='p')
    ok(r.erreur is None and r.infos['chiffrement']['ouvert_par'] == 'vide', 'un PDF sans mot de passe d\'ouverture : '
       'toujours ouvert, meme avec --mot-de-passe')
    src = os.path.join(tmp, 'mdp')
    os.makedirs(src)
    open(os.path.join(src, 'a.pdf'), 'wb').write(du)
    open(os.path.join(src, 'b.pdf'), 'wb').write(dv)
    sortie = os.path.join(tmp, 'mdp-r')
    code, _ = lancer_sonde([src], sortie, '--lecteur=standard', '--mot-de-passe=p')
    raps = [io.open(os.path.join(sortie, n), encoding='utf-8-sig').read() for n in sorted(os.listdir(sortie)) if n.endswith('.txt')]
    ok(len(raps) == 2 and u'propriétaire' in raps[0] and u'ouvert sans mot de passe' in raps[1],
       'un dossier avec --mot-de-passe=p : les deux s\'ouvrent, et le rapport dit lequel a servi')

    print('\n== R1, R7 : rien ne bloque ni ne boucle (chaque PDF en moins de 60 s) ==')
    attaques = {
        'texte-1e7': pdf_page(b'BT /F1 10 Tf 10000000 0 0 1 50 50 Tm (W1) Tj ET 0.5 g -1e9 -1e9 3e9 3e9 re f 0 G 0 0 m 50 50 l S', HELV),
        'noms-boucle': pdf_page(b'0 G 0 0 m 50 50 l S', catalogue_extra=b'/Names << /EmbeddedFiles 6 0 R >>',
                                objets={6: Objet(b'<< /Kids [6 0 R 6 0 R 6 0 R 6 0 R 6 0 R 6 0 R 6 0 R 6 0 R] >>')}),
        'ocmd-boucle': pdf_page(b'/OC /M BDC BT /F1 10 Tf 50 50 Td (OK) Tj ET EMC', HELV + b' /Properties << /M 7 0 R >>',
                                catalogue_extra=b'/OCProperties << /OCGs [6 0 R] /D << >> >>',
                                objets={6: Objet(b'<< /Type /OCG /Name (C) >>'),
                                        7: Objet(b'<< /Type /OCMD /OCGs [6 0 R] /VE [/And 8 0 R [/Not 8 0 R]] >>'),
                                        8: Objet(b'[/Or 8 0 R 6 0 R]')}),
        'predicteur': pdf_page(b'')
    }
    eventail = {5: Objet(b'<< /Length 6 >>', b'/X Do\n')}
    for k in range(24):
        eventail[10 + k] = Objet(b'<< /Type /XObject /Subtype /Form /BBox [0 0 10 10] /Resources << /XObject << /X %d 0 R >> >> '
                                 b'/Length 12 >>' % (11 + k), b'/X Do /X Do\n')
    eventail[34] = Objet(b'<< /Type /XObject /Subtype /Form /BBox [0 0 10 10] /Length 19 >>', b'0 G 0 0 m 5 5 l S\n')
    attaques['eventail'] = pdf_page(b'/X Do', b'/XObject << /X 10 0 R >>', objets=eventail)
    brut = zlib.compress(b'\x02' + b'\x00' * 100)
    attaques['predicteur'] = attaques['predicteur'].replace(
        b'4 0 obj\n<< /Length 0 >>\nstream\n\nendstream',
        b'4 0 obj\n<< /Filter /FlateDecode /DecodeParms << /Predictor 12 /Columns 2000000000 >> /Length %d >>\nstream\n'
        % len(brut) + brut + b'\nendstream')
    attaques['xref-w000'] = (b'%PDF-1.5\n1 0 obj\n<< /Type /XRef /Size 2000000000 /W [0 0 0] /Root 2 0 R /Length 0 >>\n'
                             b'stream\n\nendstream\nendobj\nstartxref\n9\n%%EOF\n')
    attaques['empile'] = pdf_page(b'q 0 G 10 10 m 100 100 l S BT /F1 12 Tf 50 50 Td (OK) Tj ET Q\n' * 1,
                                  HELV).replace(b'/Contents 4 0 R', b'/Contents [' + b'4 0 R ' * 5000 + b']')
    src = os.path.join(tmp, 'attaques')
    os.makedirs(src)
    for nom, d in attaques.items():
        open(os.path.join(src, nom + '.pdf'), 'wb').write(d)
    for nom in sorted(attaques):
        sortie = os.path.join(tmp, 'att-' + nom)
        import time as _t
        t0 = _t.time()
        try:
            p = subprocess.run([sys.executable, SONDE, os.path.join(src, nom + '.pdf'), '--sortie=' + sortie],
                               stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=60)
            ok(p.returncode == 0 and len(os.listdir(sortie)) == 2, '%s : rapport ecrit en %.1f s' % (nom, _t.time() - t0))
        except subprocess.TimeoutExpired:
            ok(False, '%s : plus de 60 s' % nom)
    rap = rapport_de(os.path.join(tmp, 'att-eventail'))
    ok('INCOMPL' in rap and 'formulaires poses' in rap, 'les formulaires en eventail : la page s\'arrete et le rapport le dit')
    rel = S.relever(attaques['empile'], {'lecteur': 'standard', 'silencieux': True, 'delai': 1e-9}, None)
    ok(not rel.pages and any('delai' in m for m, _ in rel.notes.liste()), 'au-dela du delai par PDF, la lecture s\'arrete et le dit')

    print('\n== R2 : le lecteur standard d\'abord ; les couleurs de PyMuPDF tolerees ==')
    ok(S.couleur_mu(0.5) == (0.5, 0.5, 0.5) and S.couleur_mu(0xFF0000) == (1.0, 0.0, 0.0) and S.couleur_mu([1, 0, 0, 0])
       == (0.0, 1.0, 1.0) and S.couleur_mu(None) is None, 'couleur de PyMuPDF : un nombre, un entier sRGB, CMYK, rien')
    if fitz:
        r = releve(pdf_, 'auto')
        ok(r.lecteur.startswith('standard') and 'PyMuPDF' in r.lecteur and r.comparaison,
           'avec PyMuPDF installe : le lecteur standard lit, PyMuPDF compare (%s)' % r.lecteur)

    print('\n== R3 : les textes tournes sur un fil vertical ==')
    c = ('0 G 0.5 w 200 100 m 200 700 l S 400 100 m 400 700 l S BT /F1 6 Tf 0 1 -1 0 201 300 Tm (W1234) Tj ET '
         'BT /F1 6 Tf 0 1 -1 0 201 500 Tm (W5678) Tj ET BT /F1 6 Tf 0 1 -1 0 %.2f 300 Tm (G300) Tj ET' % (400 - 3 * MM))
    sortie = os.path.join(tmp, 'r3')
    os.makedirs(os.path.join(tmp, 'r3-src'))
    open(os.path.join(tmp, 'r3-src', 'r3.pdf'), 'wb').write(pdf_page(c, HELV))
    lancer_sonde([os.path.join(tmp, 'r3-src')], sortie, '--lecteur=standard')
    rap = rapport_de(sortie)
    tourne = rap[rap.index(u'Textes tournés'):] if u'Textes tournés' in rap else ''
    ok(re.search(r'\nA9999\t2\t0 %\t100 %\t0 %', tourne) is not None and re.search(r'\nA999\t1\t0 %\t0 %\t100 %', tourne) is not None,
       'numeros de fil verticaux : « sur un trait » 100 % ; un repere a 3 mm du fil : « le long d\'un trait » 100 %')

    print('\n== R4 : les donnees non dessinees (cles hors norme, PieceInfo, XMP, structure) ==')
    xmp = (b'<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
           b'<rdf:Description xmlns:see="http://see/" see:Norme="EN3155-016M2018" see:PartNumber="NSA937901M2"/>'
           b'</rdf:RDF></x:xmpmeta>')
    objs = {6: Objet(b'<< /Length %d /Type /Metadata /Subtype /XML >>' % len(xmp), xmp),
            7: Objet(b'<< /Type /StructTreeRoot /K 8 0 R >>'),
            8: Objet(b'<< /Type /StructElem /S /Figure /P 7 0 R /K 0 /Alt (Connecteur EN3645-W1 norme NSA937901) '
                     b'/ActualText (ABS0368-A) >>')}
    d = pdf_page(b'BT /F1 10 Tf 100 300 Td (W1234-22) Tj ET', HELV,
                 b'/PieceInfo << /SEE << /Private << /Norme (EN3155) >> >> >> /SEE_Attributs << /PN (ABS1234) >>', objs,
                 b'/Metadata 6 0 R /StructTreeRoot 7 0 R /PieceInfo << /SEE << /Private << /Ref (NSA937901) >> >> >>',
                 info=b'<< /Producer (SEE Electrical Expert V4R3) /PartNumber (EN3645-W1) /Norme (ABS0368) '
                      b'/ProjetKestrel (Albatrosse) >>')
    sortie = os.path.join(tmp, 'r4')
    os.makedirs(os.path.join(tmp, 'r4-src'))
    open(os.path.join(tmp, 'r4-src', 'r4.pdf'), 'wb').write(d)
    lancer_sonde([os.path.join(tmp, 'r4-src')], sortie, '--lecteur=standard')
    rap = rapport_de(sortie)
    attendus = [u'/Info\tPartNumber = « AA9999-A9 »', u'/Info\tNorme = « AAA9999 »',
                u'catalogue\tPieceInfo / SEE / Private / Ref = « AAA999999 »',
                u'page\tPieceInfo / SEE / Private / Norme = « AA9999 »', u'page\tSEE_Attributs / PN = « AAA9999 »',
                u'see:Norme = « AA9999-999A9999 »', u'see:PartNumber = « AAA999999A9 »', u'ActualText\tAAA9999-A',
                u'Alt\tAaaaaaaaaa AA9999-A9 aaaaa AAA999999']
    manquent = [a_ for a_ in attendus if a_ not in rap]
    ok(not manquent, 'cles hors norme de /Info, PieceInfo, cle propre d\'une page, XMP, /Alt et /ActualText de la structure, '
       'en motifs%s' % ((' ; manquent : ' + repr(manquent[:3])) if manquent else ''))
    f = fuites(sortie, ['EN3645', 'ABS0368', 'NSA937901', 'EN3155', 'ABS1234', 'Kestrel', 'Albatrosse'])
    ok(not f, 'aucune de ces valeurs, ni la cle propre « ProjetKestrel », en clair%s' % ((' : ' + repr(f[:3])) if f else ''))

    print('\n== R5 : CropBox qui deborde de la MediaBox, page tournee ==')
    d = pdf_page(b'0 G 1 w 200 300 100 50 re S', media=b'0 0 842 595',
                 page_extra=b'/CropBox [-200 60 600 9999] /Rotate 90')
    for lecteur in ('standard',) + (('pymupdf',) if fitz else ()):
        r = releve(d, lecteur)
        rc = [e for e in r.pages[0]['elements'] if e['type'] == 'rectangle']
        # vue : boite = CropBox inter MediaBox = (0 60 600 595) ; tournee de 90 : X = y - 60, Y = x - 0
        ok(len(rc) == 1 and abs(rc[0]['x1'] - 240) < 0.01 and abs(rc[0]['y1'] - 200) < 0.01 and abs(rc[0]['x2'] - 290) < 0.01
           and abs(rc[0]['y2'] - 300) < 0.01, '%s : le rectangle tombe a sa place (CropBox inter MediaBox, puis la rotation)' % lecteur)

    print('\n== R6 : un « re » sans hauteur est un seul segment pour les deux lecteurs ==')
    d = pdf_page(b'0 G 1 w 100 100 50 0 re S 300 100 m 400 100 l 300 100 l S')
    for lecteur in ('standard',) + (('pymupdf',) if fitz else ()):
        r = releve(d, lecteur)
        ok([e['type'] for e in r.pages[0]['elements']] == ['segment', 'segment'],
           '%s : re de hauteur nulle et polyligne aller-retour -> un segment chacun' % lecteur)

    print('\n== R9 : decoupe, texte de la couleur du fond, police absente ==')
    c = (b'q 50 50 300 200 re W n BT /F1 10 Tf 500 100 Td (DECOUPE-1) Tj ET Q '
         b'q 1 1 0 rg 90 590 200 30 re f Q BT /F1 10 Tf 1 1 0 rg 100 600 Td (JAUNE-2) Tj ET '
         b'BT /FAbsente 10 Tf 0 g 100 400 Td (SECOURS-3) Tj ET')
    r = releve(pdf_page(c, HELV))
    t = dict((e['texte'], e['raisons']) for e in textes_de(r))
    ok(t.get('DECOUPE-1') == ['decoupe'] and t.get('JAUNE-2') == ['fond'] and t.get('SECOURS-3') == [],
       'hors de sa decoupe : « decoupe » ; jaune sur jaune : « fond » ; police absente : lu en Helvetica (%s)' % t)
    ok(any('police de secours' in m for m, _ in r.notes.liste()) and any(m.startswith('9 glyphe') for m, _ in r.notes.liste()),
       'et le rapport compte les glyphes lus avec la police de secours')

    print('\n== R11 : une image dans un motif n\'est pas un scan ==')
    im = zlib.compress(bytes([200]) * 400)
    motif_ = b'/PaintType 1 /PatternType 1 /TilingType 1 /BBox [0 0 20 20] /XStep 20 /YStep 20 /Resources << /XObject << /I 6 0 R >> >>'
    c = b'/Pattern cs /P1 scn 0 0 595 842 re f 0 G 1 w 100 100 m 300 100 l S BT /F1 10 Tf 100 200 Td (W1) Tj ET'
    d = pdf_page(c, HELV + b' /Pattern << /P1 5 0 R >>', objets={
        5: Objet(b'<< ' + motif_ + b' /Length 22 >>', b'20 0 0 20 0 0 cm /I Do'),
        6: Objet(b'<< /Type /XObject /Subtype /Image /Width 20 /Height 20 /ColorSpace /DeviceGray /BitsPerComponent 8 '
                 b'/Filter /FlateDecode /Length %d >>' % len(im), im)})
    r = releve(d)
    v = S.verdict_document([p['verdict'] for p in r.pages])[0]
    ok(v == 'vectoriel avec texte' and any(e['type'] == 'image' and e['info'].get('motif') for e in r.pages[0]['elements']),
       'une image dans un motif qui couvre la page : verdict %s (pas « mixte »)' % v)


def controles_pymupdf(pdfs):
    fitz = S.importer_pymupdf()
    print('\n== Les deux lecteurs (standard et PyMuPDF) ==')
    if fitz is None:
        print('  (PyMuPDF absent : comparaison sautee)')
        return
    for nom, d in pdfs:
        a = releve(d, 'standard')
        b = releve(d, 'pymupdf')
        if a.erreur or b.erreur:
            ok(bool(a.erreur) == bool(b.erreur), '%s : illisible pour les deux' % nom)
            continue
        tot = {}
        for pa, pb in zip(b.pages, a.pages):
            c = S.comparer_elements(pa['elements'], pb['elements'])
            for k, x in c['types'].items():
                if k == 'annotation':
                    continue
                y = tot.setdefault(k, [0, 0, 0, 0.0])
                y[0] += x['a']
                y[1] += x['b']
                y[2] += x['ensemble']
                y[3] = max(y[3], x['ecart_max'])
        pareil = all(y[0] == y[1] == y[2] for y in tot.values()) and len(a.pages) == len(b.pages)
        vis_a = sorted((e['texte'], e['visible']) for e in textes_de(a))
        vis_b = sorted((e['texte'], e['visible']) for e in textes_de(b))
        ok(pareil and vis_a == vis_b, '%s : %s' % (nom, ', '.join('%s %d/%d/%d (ecart %.3f mm)' % (
            k, y[0], y[1], y[2], y[3] / MM) for k, y in sorted(tot.items()))))
        if nom == 'schema':
            blocs = sorted(set(e.get('bloc') for p in b.pages for e in p['elements'] if e.get('bloc')))
            ok(blocs == ['X1.1', 'X1.2'], 'PyMuPDF lit, et les elements du formulaire portent quand meme leur bloc (%s)' % blocs)


def controles_corpus(dossier):
    print('\n== Le corpus d\'essai (%s) ==' % dossier)
    vf = os.path.join(dossier, 'verite.json')
    if not os.path.exists(vf):
        ok(False, 'verite.json absent du corpus')
        return []
    verite = json.load(io.open(vf, encoding='utf-8'))
    av = os.path.join(dossier, 'atelier-verite.json')
    atelier = json.load(io.open(av, encoding='utf-8')) if os.path.exists(av) else None
    pdfs = []
    for nom in sorted(os.listdir(dossier)):
        if not nom.lower().endswith('.pdf'):
            continue
        d = open(os.path.join(dossier, nom), 'rb').read()
        pdfs.append((nom, d))
        v = verite.get(nom)
        if v is None and nom.startswith('atelier-'):
            # un folio seul n'a qu'une partie des textes : on ne les cherche que dans les fichiers des six folios ;
            # le quadrillage de fond est une image dans un motif : pas un scan, le verdict reste vectoriel
            v = {'verdict': 'vectoriel avec texte',
                 'textes': (atelier['textes'] if atelier else []) if nom.startswith('atelier-folios') else []}
        if v is None:
            continue
        r = releve(d)
        if v.get('illisible'):
            ok(r.erreur is not None, '%s : illisible, sans plantage (%s)' % (nom, r.erreur))
            if v.get('mot_de_passe'):
                r2 = releve(d, mot_de_passe=v['mot_de_passe'])
                ok(r2.erreur is None and len(r2.pages) == v['pages'], '%s : lu avec son mot de passe' % nom)
            continue
        ok(r.erreur is None, '%s : lu (%d pages, %d elements)' % (nom, len(r.pages), sum(len(p['elements']) for p in r.pages)))
        if r.erreur:
            continue
        vd = S.verdict_document([p['verdict'] for p in r.pages])[0]
        if v.get('verdict') and not v.get('malforme'):
            ok(vd == v['verdict'], '%s : verdict %s' % (nom, vd))
        if v.get('textes') and not v.get('malforme'):
            lus = set(e['texte'] for e in textes_de(r))
            manquants = [t for t in v['textes'] if t not in lus and t.strip()]
            ok(not manquants,
               '%s : textes connus retrouves (%d manquent%s)' % (nom, len(manquants), (' : ' + ', '.join(manquants[:5])) if manquants else ''))
        if v.get('invisibles'):
            raisons = dict((e['texte'], e['raisons']) for e in textes_de(r, False))
            for t, rr in v['invisibles'].items():
                ok(t in raisons and rr in raisons[t], '%s : %s invisible (%s)' % (nom, t, rr))
        if v.get('rect_connu'):
            rc = v['rect_connu']
            p = r.pages[rc['page'] - 1]
            ok(any(e['type'] == 'rectangle' and abs(e['x1'] / MM - rc['x1']) < 0.01 and abs(e['y1'] / MM - rc['y1']) < 0.01
                   and abs(e['x2'] / MM - rc['x2']) < 0.01 and abs(e['y2'] / MM - rc['y2']) < 0.01 for e in p['elements']),
               '%s : le rectangle connu en (%s ; %s) -> (%s ; %s) mm' % (nom, rc['x1'], rc['y1'], rc['x2'], rc['y2']))
    # aucune fuite : la sonde en ligne de commande, sur tout le corpus
    tmp = tempfile.mkdtemp(prefix='sonde-corpus-')
    try:
        code, _ = lancer_sonde([dossier], tmp, '--lecteur=standard')
        chaines = set()
        for nom, v in verite.items():
            chaines.update(t for t in v.get('textes', []) if len(t) >= 4)
            chaines.update(v.get('secrets', []))
        if atelier:
            chaines.update(t for t in atelier['textes'] if len(t) >= 4 and re.search(r'[A-Za-z]', t) and re.search(r'\d', t))
        chaines.update(n for n in os.listdir(dossier) if n.endswith('.pdf'))   # le nom du fichier, avec .pdf
        f = fuites(tmp, sorted(chaines))
        ok(code == 0 and not f, 'corpus entier en ligne de commande : aucune des %d chaines reelles ne sort%s' % (
            len(chaines), (' : ' + repr(f[:5])) if f else ''))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return pdfs


def principal():
    corpus = None
    garder = None
    for a in sys.argv[1:]:
        if a.startswith('--corpus='):
            corpus = a.split('=', 1)[1]
        elif a.startswith('--garder='):
            garder = a.split('=', 1)[1]
            os.makedirs(garder, exist_ok=True)
    print('Sonde PDF %s, Python %s, PyMuPDF : %s' % (S.VERSION_SONDE, sys.version.split()[0],
                                                     S.version_pymupdf(S.importer_pymupdf()) if S.importer_pymupdf() else 'absent'))
    tmp = tempfile.mkdtemp(prefix='sonde-pdf-')
    try:
        pdf, fichiers, inc = controles_fabriques(tmp, garder)
        controles_constats(tmp)
        a_comparer = [('schema', pdf), ('schema incremental', inc), ('page tournee', page_tournee()),
                      ('page scannee', page_scannee())] + sorted(fichiers.items())
        if corpus:
            a_comparer += [(n, d) for n, d in controles_corpus(corpus) if n not in ('atelier-folios.pdf',)
                           and not re.match(r'atelier-folio-\d', n)]
        controles_pymupdf(a_comparer)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print('\n%d controles, %d echec(s)' % (NB[0], len(ECHECS)))
    for e in ECHECS:
        print('  ECHEC : ' + e)
    return 1 if ECHECS else 0


if __name__ == '__main__':
    sys.exit(principal())
