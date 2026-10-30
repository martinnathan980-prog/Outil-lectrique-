# -*- coding: utf-8 -*-
"""Fabrique le CORPUS D'ESSAI de la sonde PDF, HORS du depot.

    python tests/sonde-pdf-corpus.py <dossier>
    NODE_PATH=... node tests/sonde-pdf-folios.js . <dossier>     (les folios de l'Atelier, Chromium)
    python tests/sonde-pdf.py --corpus=<dossier>

Demande reportlab, PyMuPDF, pikepdf et Pillow (dans un venv a part : ce ne
sont PAS des dependances de la sonde). Ecrit des PDF varies et verite.json :
ce que chaque PDF contient de connu (textes, chaines secretes qui ne doivent
jamais sortir, un rectangle place a un endroit connu, verdict attendu...).
  reportlab.pdf            ReportLab : polices standard WinAnsi, texte tourne de 90, texte invisible
                           (Tr 3), hors page, blanc sur blanc, Tz et Ts, formulaires imbriques,
                           image en ligne, page 2 tournee (Rotate 90)
  calques.pdf              PyMuPDF : deux calques, dont un masque par defaut
  scanne.pdf, scanne-ocr.pdf   une image pleine page ; la meme avec un texte OCR invisible
  chiffre-*.pdf            RC4 40, RC4 128, AES-128, AES-256 (PyMuPDF), AES-256 R6 et AES-128
                           sans chiffrer les metadonnees (pikepdf), un a mot de passe d'ouverture
  flux-objets*.pdf         flux xref et flux d'objets (PyMuPDF, pikepdf)
  incremental.pdf          une mise a jour incrementale (PyMuPDF saveIncr)
  tronque.pdf, xref-faux.pdf, sans-xref.pdf, pas-un-pdf.pdf   malformes"""
import io, json, math, os, sys, zlib, struct

D = sys.argv[1] if len(sys.argv) > 1 else 'corpus-pdf'
os.makedirs(D, exist_ok=True)
verite = {}

# ---------------------------------------------------------------- ReportLab
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, A3, landscape
from reportlab.lib.units import mm

TEXTES_RL = ['601RC1', 'W-1234-22', 'A12', 'Connecteur J1', u'Équipement côté droit', 'SECRET-PROJET-X', '12AWG',
             'OCR-INVISIBLE-33', 'HORS-PAGE-31', 'BLANC-SUR-32', 'VERTICAL 90', 'TZ50-SERRE', 'EXPOSANT-2']


def reportlab():
    chemin = os.path.join(D, 'reportlab.pdf')
    c = canvas.Canvas(chemin, pagesize=landscape(A3), pageCompression=1)
    c.setTitle('Projet confidentiel Airbus H160')
    c.setAuthor('Jean Dupont')
    c.setCreator('Atelier interne de Jean Dupont')
    W, H = landscape(A3)
    # cadre et quadrillage
    c.setLineWidth(0.5)
    c.rect(10 * mm, 10 * mm, W - 20 * mm, H - 20 * mm)            # rectangle 1 : cadre
    # un rectangle a un endroit connu : x=50 mm, y(haut)=40 mm, 30 x 20 mm
    c.rect(50 * mm, H - 40 * mm - 20 * mm, 30 * mm, 20 * mm, stroke=1, fill=0)
    # rectangle rempli gris
    c.setFillGray(0.8)
    c.rect(100 * mm, H - 100 * mm, 40 * mm, 15 * mm, stroke=0, fill=1)
    c.setFillGray(0)
    # lignes : 3 horizontales, 2 verticales, 1 oblique
    for k in range(3):
        c.line(20 * mm, H - (150 + 10 * k) * mm, 120 * mm, H - (150 + 10 * k) * mm)
    c.line(130 * mm, H - 150 * mm, 130 * mm, H - 200 * mm)
    c.line(140 * mm, H - 150 * mm, 140 * mm, H - 200 * mm)
    c.line(150 * mm, H - 150 * mm, 200 * mm, H - 200 * mm)
    # cercles
    c.circle(250 * mm, H - 150 * mm, 5 * mm, stroke=1, fill=0)
    c.circle(270 * mm, H - 150 * mm, 2 * mm, stroke=1, fill=1)
    # polyligne (chemin ouvert de 3 segments)
    p = c.beginPath()
    p.moveTo(300 * mm, H - 150 * mm)
    p.lineTo(320 * mm, H - 150 * mm)
    p.lineTo(320 * mm, H - 170 * mm)
    p.lineTo(340 * mm, H - 170 * mm)
    c.drawPath(p, stroke=1, fill=0)
    # textes
    c.setFont('Helvetica', 10)
    c.drawString(50 * mm, H - 30 * mm, '601RC1')
    c.drawString(90 * mm, H - 30 * mm, 'W-1234-22')
    c.setFont('Helvetica-Bold', 7)
    c.drawString(50 * mm, H - 70 * mm, 'A12')
    c.setFont('Times-Roman', 12)
    c.drawString(50 * mm, H - 80 * mm, 'Connecteur J1')
    c.setFont('Helvetica', 9)
    c.drawString(50 * mm, H - 90 * mm, u'Équipement côté droit')
    c.setFont('Courier', 8)
    c.drawString(200 * mm, H - 30 * mm, 'SECRET-PROJET-X')
    c.drawString(200 * mm, H - 40 * mm, '12AWG')
    # texte tourne de 90 degres
    c.saveState()
    c.translate(380 * mm, H - 200 * mm)
    c.rotate(90)
    c.setFont('Helvetica', 10)
    c.drawString(0, 0, 'VERTICAL 90')
    c.restoreState()
    # texte invisible (Tr 3)
    t = c.beginText(50 * mm, H - 250 * mm)
    t.setFont('Helvetica', 10)
    t.setTextRenderMode(3)
    t.textOut('OCR-INVISIBLE-33')
    t.setTextRenderMode(0)
    c.drawText(t)
    # texte hors page
    c.setFont('Helvetica', 10)
    c.drawString(W + 50 * mm, H - 50 * mm, 'HORS-PAGE-31')
    # texte blanc sur blanc
    c.setFillGray(1)
    c.drawString(200 * mm, H - 250 * mm, 'BLANC-SUR-32')
    c.setFillGray(0)
    # texte serre (Tz 50) et exposant (Ts)
    t = c.beginText(250 * mm, H - 250 * mm)
    t.setFont('Helvetica', 10)
    t.setHorizScale(50)
    t.textOut('TZ50-SERRE')
    t.setHorizScale(100)
    t.setRise(4)
    t.textOut(' EXPOSANT-2')
    c.drawText(t)
    # un formulaire (XObject) reutilise deux fois, imbrique
    c.beginForm('symbole')
    c.rect(0, 0, 10 * mm, 5 * mm)
    c.line(0, 0, 10 * mm, 5 * mm)
    c.endForm()
    c.beginForm('double')
    c.doForm('symbole')
    c.saveState()
    c.translate(15 * mm, 0)
    c.doForm('symbole')
    c.restoreState()
    c.endForm()
    c.saveState()
    c.translate(300 * mm, H - 60 * mm)
    c.doForm('double')
    c.restoreState()
    # image en ligne (petite)
    from reportlab.lib.utils import ImageReader
    try:
        from PIL import Image
        im = Image.new('RGB', (8, 8), (200, 30, 30))
        c.drawInlineImage(im, 350 * mm, H - 280 * mm, 10 * mm, 10 * mm)
    except ImportError:
        pass
    c.showPage()
    # page 2 : A4 portrait, tournee de 90 (Rotate) avec un rectangle connu
    c.setPageSize(A4)
    c.setPageRotation(90)
    c.rect(20 * mm, 20 * mm, 30 * mm, 10 * mm)
    c.setFont('Helvetica', 10)
    c.drawString(20 * mm, 50 * mm, 'PAGE-TOURNEE-4')
    c.showPage()
    c.save()
    verite['reportlab.pdf'] = {
        'pages': 2,
        'textes': TEXTES_RL + ['PAGE-TOURNEE-4'],
        'secrets': ['Airbus', 'Jean Dupont', 'Dupont', 'H160', 'confidentiel', 'Atelier interne'],
        'rect_connu': {'page': 1, 'x1': 50, 'y1': 40, 'x2': 80, 'y2': 60},
        'invisibles': {'OCR-INVISIBLE-33': 'mode3', 'HORS-PAGE-31': 'horspage', 'BLANC-SUR-32': 'blanc'},
        'verdict': 'vectoriel avec texte',
    }


# ---------------------------------------------------------------- PyMuPDF
import pymupdf as fitz


def calques():
    chemin = os.path.join(D, 'calques.pdf')
    doc = fitz.open()
    page = doc.new_page(width=842, height=595)
    oc_fils = doc.add_ocg('Fils du harnais X', on=True)
    oc_cache = doc.add_ocg('Notes internes Dupont', on=False)
    page.insert_text((100, 100), 'FIL-001', fontsize=12, oc=oc_fils)
    page.insert_text((100, 130), 'NOTE-CACHEE', fontsize=12, oc=oc_cache)
    page.insert_text((100, 160), 'HORS-CALQUE', fontsize=12)
    page.draw_line((100, 200), (400, 200), oc=oc_fils)
    page.draw_line((100, 220), (400, 220), oc=oc_cache)
    page.draw_rect(fitz.Rect(500, 100, 600, 150), oc=oc_cache)
    page.draw_rect(fitz.Rect(500, 200, 600, 250))
    doc.save(chemin)
    verite['calques.pdf'] = {'pages': 1, 'textes': ['FIL-001', 'NOTE-CACHEE', 'HORS-CALQUE'],
                             'secrets': ['Fils du harnais X', 'Notes internes Dupont', 'Dupont', 'harnais'],
                             'invisibles': {'NOTE-CACHEE': 'calque'}, 'calques': 2,
                             'verdict': 'vectoriel avec texte'}


def scanne():
    chemin = os.path.join(D, 'scanne.pdf')
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    pix = fitz.Pixmap(fitz.csGRAY, fitz.IRect(0, 0, 620, 877), False)
    pix.set_rect(pix.irect, (245,))
    pix.set_rect(fitz.IRect(100, 100, 500, 110), (20,))
    pix.set_rect(fitz.IRect(100, 100, 110, 700), (20,))
    page.insert_image(page.rect, pixmap=pix)
    doc.save(chemin, deflate=True)
    verite['scanne.pdf'] = {'pages': 1, 'textes': [], 'verdict': 'scanne (image seule)'}
    # le meme avec une couche OCR invisible
    chemin = os.path.join(D, 'scanne-ocr.pdf')
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    page.insert_image(page.rect, pixmap=pix)
    page.insert_text((120, 150), 'TEXTE-OCR-123', fontsize=11, render_mode=3)
    doc.save(chemin, deflate=True)
    verite['scanne-ocr.pdf'] = {'pages': 1, 'textes': ['TEXTE-OCR-123'], 'verdict': 'mixte',
                                'invisibles': {'TEXTE-OCR-123': 'mode3'}}


def chiffres():
    src = os.path.join(D, 'reportlab.pdf')
    for nom, m in (('rc4-40', fitz.PDF_ENCRYPT_RC4_40), ('rc4-128', fitz.PDF_ENCRYPT_RC4_128),
                   ('aes-128', fitz.PDF_ENCRYPT_AES_128), ('aes-256', fitz.PDF_ENCRYPT_AES_256)):
        doc = fitz.open(src)
        chemin = os.path.join(D, 'chiffre-%s.pdf' % nom)
        doc.save(chemin, encryption=m, owner_pw='proprietaire', user_pw='',
                 permissions=fitz.PDF_PERM_PRINT)
        verite['chiffre-%s.pdf' % nom] = dict(verite['reportlab.pdf'], chiffre=nom)
    # un PDF a mot de passe utilisateur : illisible sans lui
    doc = fitz.open(src)
    chemin = os.path.join(D, 'chiffre-motdepasse.pdf')
    doc.save(chemin, encryption=fitz.PDF_ENCRYPT_AES_128, owner_pw='proprietaire', user_pw='secret')
    verite['chiffre-motdepasse.pdf'] = {'illisible': True, 'mot_de_passe': 'secret', 'pages': 2,
                                        'textes': verite['reportlab.pdf']['textes']}
    # avec pikepdf : AES-256 R6 et RC4 128 sans chiffrer les metadonnees
    try:
        import pikepdf
        with pikepdf.open(src) as p:
            p.save(os.path.join(D, 'chiffre-pikepdf-r6.pdf'),
                   encryption=pikepdf.Encryption(owner='o', user='', R=6))
        verite['chiffre-pikepdf-r6.pdf'] = dict(verite['reportlab.pdf'], chiffre='aes-256 R6')
        with pikepdf.open(src) as p:
            p.save(os.path.join(D, 'chiffre-pikepdf-r4-aes.pdf'),
                   encryption=pikepdf.Encryption(owner='o', user='', R=4, aes=True, metadata=False))
        verite['chiffre-pikepdf-r4-aes.pdf'] = dict(verite['reportlab.pdf'], chiffre='aes-128 R4')
    except ImportError:
        pass


def flux_xref():
    src = os.path.join(D, 'reportlab.pdf')
    doc = fitz.open(src)
    doc.save(os.path.join(D, 'flux-objets.pdf'), use_objstms=1, garbage=3, deflate=True)
    verite['flux-objets.pdf'] = dict(verite['reportlab.pdf'])
    try:
        import pikepdf
        with pikepdf.open(src) as p:
            p.save(os.path.join(D, 'flux-objets-pikepdf.pdf'), object_stream_mode=pikepdf.ObjectStreamMode.generate)
        verite['flux-objets-pikepdf.pdf'] = dict(verite['reportlab.pdf'])
    except ImportError:
        pass


def incremental():
    import shutil
    src = os.path.join(D, 'reportlab.pdf')
    chemin = os.path.join(D, 'incremental.pdf')
    shutil.copy(src, chemin)
    doc = fitz.open(chemin)
    page = doc[0]
    page.insert_text((200, 500), 'AJOUT-INCREMENTAL', fontsize=10)
    page.draw_rect(fitz.Rect(600, 600, 700, 650))
    doc.saveIncr()
    doc.close()
    v = dict(verite['reportlab.pdf'])
    v['textes'] = v['textes'] + ['AJOUT-INCREMENTAL']
    v['incremental'] = True
    verite['incremental.pdf'] = v


def malformes():
    src = open(os.path.join(D, 'reportlab.pdf'), 'rb').read()
    # tronque a 80 %
    open(os.path.join(D, 'tronque.pdf'), 'wb').write(src[:int(len(src) * 0.8)])
    verite['tronque.pdf'] = {'malforme': True, 'textes': verite['reportlab.pdf']['textes']}
    # table xref fausse : tous les decalages decales de 7 octets
    import re
    k = src.rfind(b'\nxref') + 1
    tete, queue = src[:k], src[k:]
    queue = re.sub(rb'(\d{10}) (\d{5}) n', lambda m: b'%010d %s n' % (int(m.group(1)) + 7, m.group(2)), queue)
    open(os.path.join(D, 'xref-faux.pdf'), 'wb').write(tete + queue)
    verite['xref-faux.pdf'] = dict(verite['reportlab.pdf'], malforme=True)
    # sans startxref ni table
    open(os.path.join(D, 'sans-xref.pdf'), 'wb').write(tete)
    verite['sans-xref.pdf'] = dict(verite['reportlab.pdf'], malforme=True)
    # pas du tout un PDF
    open(os.path.join(D, 'pas-un-pdf.pdf'), 'wb').write(b'Ceci n est pas un PDF\n' * 20)
    verite['pas-un-pdf.pdf'] = {'illisible': True, 'textes': []}


reportlab()
calques()
scanne()
chiffres()
flux_xref()
incremental()
malformes()
json.dump(verite, open(os.path.join(D, 'verite.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('corpus :', sorted(os.listdir(D)))
