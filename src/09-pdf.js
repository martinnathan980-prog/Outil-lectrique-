/* ===========================================================================
   09 — LIRE UN PDF DE SCHÉMA : des traits et des textes, les liaisons
   ---------------------------------------------------------------------------
   Le lecteur : « grâce à un PDF, tu arrives à créer le retest toi-même : tu
   analyses, tu trouves le nom des documents, le nom des bornes, tout ». Ses
   schémas n'ont PAS de numéro de fil : une liaison se lit au dessin seul —
   le trait qui part d'une borne et celui où il arrive.

   Ce module ne voit ni la page ni pdf.js : il reçoit, page par page, ce que
   pdf.js en donne (08-pdf) — les TEXTES (getTextContent : la chaîne, sa
   matrice, sa largeur) et les OPÉRATEURS de dessin (getOperatorList : les
   chemins sous leur matrice, l'épaisseur, les tirets, les couleurs) — et rend
   les liaisons, chacune avec sa CONFIANCE et ses raisons, le trajet suivi et
   ses deux bouts (pour les surligner), les bouts orphelins, le cartouche.
   Testable hors navigateur : tout est donnée.

   La lecture, dans l'ordre :
     1. les formes : chaque chemin peint, sous sa matrice, en coordonnées de la
        page (le point, l'origine en haut à gauche) ;
     2. les textes : les mots, leur boîte, leur angle ; un repère (102CB1,
        300XC1, 901G — `lireRepere`), une borne (1, 12, A1, X), une référence
        (EN2997…, MS3320-10), un type de câble (DR20, MLB22), un renvoi (→ 3/4) ;
     3. le tri des formes : les TRAITS (les conducteurs : des segments droits),
        les CADRES (un rectangle fermé, même dessiné en quatre traits), les RONDS
        (une borne ronde de disjoncteur), les POINTS (un disque plein : une
        jonction, ou une borne de barrette quand un numéro y est écrit), les
        POINTILLÉS (une barrette : ses bornes au même potentiel), les MASSES (trois
        barres qui décroissent), le cadre de la feuille et le cartouche (ce qui est
        dehors ou dedans ne se lit pas comme du câblage) ;
     4. le graphe : deux bouts qui se touchent (à une tolérance près, à l'échelle
        des textes de la page), un bout qui tombe sur un trait (un T), un point de
        jonction posé sur des traits les relient ; un CROISEMENT SANS POINT ne relie
        pas ;
     5. les bouts : un bout libre arrive sur un cadre (la borne : le texte court le
        plus proche, dans le cadre d'abord ; l'équipement : le repère du cadre, de
        son voisin collé, ou celui qui le nomme dessous), sur un rond, une borne de
        barrette, une masse, un renvoi — ou nulle part (orphelin) ;
     6. les liaisons d'un réseau : deux bouts, une liaison ; trois ou plus, celles
        que le dessin trace DE PROCHE EN PROCHE (l'arbre couvrant le plus court
        entre les bouts, mesuré le long des traits), pas toutes les paires ;
     7. le document : une page est un folio (son cartouche le dit) ; deux renvois
        qui se répondent d'un folio à l'autre relient leurs réseaux.
   Les seuils sont des multiples du MODULE de la page (`u` : la hauteur médiane
   des textes courts) : le même réglage vaut pour un A3 ou un A4, un export ou un
   tirage réduit.
   =========================================================================== */
'use strict';

const SCHEMA_PDF = (() => {
  /* ---- la géométrie ---------------------------------------------------------------------------------------------- */
  // une matrice [a b c d e f] : x' = a x + c y + e, y' = b x + d y + f ; mul(A, B) applique B puis A
  const mul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
  const app = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const med = xs => { if (!xs.length) return 0; const s = xs.slice().sort((a, b) => a - b), k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };
  // le point d'un segment le plus proche de p : { t (0 à 1), d (la distance), q (le point) }
  function proj(p, a, b) { const vx = b[0] - a[0], vy = b[1] - a[1], L2 = vx * vx + vy * vy;
    let t = L2 ? ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L2 : 0; t = Math.max(0, Math.min(1, t)); const q = [a[0] + t * vx, a[1] + t * vy]; return { t, d: dist(p, q), q }; }
  // la distance d'un point au bord d'une boîte (négative dedans)
  const auBord = (p, B) => { const dx = Math.max(B.x0 - p[0], 0, p[0] - B.x1), dy = Math.max(B.y0 - p[1], 0, p[1] - B.y1);
    if (dx || dy) return Math.hypot(dx, dy); return -Math.min(p[0] - B.x0, B.x1 - p[0], p[1] - B.y0, B.y1 - p[1]); };
  const dedans = (p, B, m = 0) => p[0] >= B.x0 - m && p[0] <= B.x1 + m && p[1] >= B.y0 - m && p[1] <= B.y1 + m;
  const boiteDe = pts => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return { x0, y0, x1, y1 }; };
  const aire = pts => { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };
  const mm = x => x * 25.4 / 72;   // le point PDF en millimètres : ce que les raisons disent
  const dixieme = x => (Math.round(x * 10) / 10).toString().replace('.', ',');

  /* L'index spatial : une grille de cases ; un objet s'inscrit dans les cases que sa boîte couvre. */
  function grille(pas) { const cases = new Map(), cle = (i, j) => i * 100003 + j;
    return { ajouter(o, x0, y0, x1, y1) { for (let i = Math.floor(x0 / pas); i <= Math.floor(x1 / pas); i++) for (let j = Math.floor(y0 / pas); j <= Math.floor(y1 / pas); j++) { const k = cle(i, j); (cases.get(k) || cases.set(k, []).get(k)).push(o); } },
      chercher(x0, y0, x1, y1) { const vu = new Set(), out = []; for (let i = Math.floor(x0 / pas); i <= Math.floor(x1 / pas); i++) for (let j = Math.floor(y0 / pas); j <= Math.floor(y1 / pas); j++) { const c = cases.get(cle(i, j)); if (c) for (const o of c) if (!vu.has(o)) { vu.add(o); out.push(o); } } return out; } }; }
  // l'ensemble disjoint (les nœuds qui se touchent, les cadres collés)
  function unions(n) { const p = Int32Array.from({ length: n }, (_, i) => i); const f = i => { while (p[i] !== i) { p[i] = p[p[i]]; i = p[i]; } return i; };
    return { f, u: (a, b) => { a = f(a); b = f(b); if (a !== b) p[a] = b; } }; }

  /* ---- 1. LES FORMES : chaque chemin peint, en coordonnées de la page ---------------------------------------------
     `vt` : la matrice de la vue de pdf.js à l'échelle 1 (le PDF a son origine en bas ; la page, en haut). Une forme :
     { sp: [{ pts, ferme, courbe }], trait, plein, lw, tirets, ct, cf } ; les images (un scan) : leur boîte. Les
     courbes se rendent en huit cordes : un rond se reconnaît à sa rondeur, un arc reste un symbole. */
  function formesDesOperateurs(fn, args, OPS, vt) {
    const O = OPS, formes = [], images = [], pile = []; let ctm = vt.slice(), lw = 1, tirets = null, ct = [0, 0, 0], cf = [0, 0, 0], aT = 1, aF = 1, chemin = [];
    const garder = () => ({ ctm, lw, tirets, ct, cf, aT, aF }), rendre = e => { ({ ctm, lw, tirets, ct, cf, aT, aF } = e); };
    const couleur = a => { if (a == null) return null; if (typeof a === 'string') { const m = /^#?([0-9a-f]{6})$/i.exec(a); return m ? [0, 2, 4].map(k => parseInt(m[1].slice(k, k + 2), 16)) : null; }
      const v = Array.from(a.length === 1 && a[0] && a[0].length ? a[0] : a); return v.length >= 3 ? v.slice(0, 3).map(Number) : v.length === 1 ? [v[0], v[0], v[0]].map(x => x <= 1 ? x * 255 : x) : null; };
    const echelle = () => Math.sqrt(Math.abs(ctm[0] * ctm[3] - ctm[1] * ctm[2])) || 1;
    // le chemin courant survit d'un constructPath à l'autre : pdf.js coupe parfois un chemin en deux (« m » puis « l »)
    let cur = null, u = null, depart = null;
    function construire(ops, c) { let k = 0;
      const nouveau = p => { cur = { pts: [p], ferme: false, courbe: false }; chemin.push(cur); };
      const vers = (x, y) => { const p = app(ctm, x, y); if (!cur) nouveau(p); else cur.pts.push(p); u = [x, y]; };
      const bezier = (x1, y1, x2, y2, x3, y3) => { if (!u) { vers(x3, y3); return; } const [x0, y0] = u; if (!cur) nouveau(app(ctm, x0, y0)); cur.courbe = true;
        for (let s = 1; s <= 8; s++) { const t = s / 8, m = 1 - t; cur.pts.push(app(ctm, m * m * m * x0 + 3 * m * m * t * x1 + 3 * m * t * t * x2 + t * t * t * x3, m * m * m * y0 + 3 * m * m * t * y1 + 3 * m * t * t * y2 + t * t * t * y3)); } u = [x3, y3]; };
      for (const o of ops) {
        if (o === O.moveTo) { u = [c[k], c[k + 1]]; depart = u; nouveau(app(ctm, c[k], c[k + 1])); k += 2; }
        else if (o === O.lineTo) { vers(c[k], c[k + 1]); k += 2; }
        else if (o === O.curveTo) { bezier(c[k], c[k + 1], c[k + 2], c[k + 3], c[k + 4], c[k + 5]); k += 6; }
        else if (o === O.curveTo2) { bezier(u ? u[0] : c[k], u ? u[1] : c[k + 1], c[k], c[k + 1], c[k + 2], c[k + 3]); k += 4; }
        else if (o === O.curveTo3) { bezier(c[k], c[k + 1], c[k + 2], c[k + 3], c[k + 2], c[k + 3]); k += 4; }
        else if (o === O.closePath) { if (cur) { cur.ferme = true; } if (depart) { u = depart; cur = null; } }
        else if (o === O.rectangle) { const [x, y, w, h] = [c[k], c[k + 1], c[k + 2], c[k + 3]]; k += 4;
          chemin.push({ pts: [app(ctm, x, y), app(ctm, x + w, y), app(ctm, x + w, y + h), app(ctm, x, y + h)], ferme: true, courbe: false, rect: true }); cur = null; u = [x, y]; depart = u; } } }
    function peindre(trait, plein, fermer) { if (fermer) chemin.forEach(s => { s.ferme = true; });
      const T = trait && aT > 0.05 && ct, F = plein && aF > 0.05 && cf;
      if (chemin.length && (T || F)) { const e = echelle(); formes.push({ sp: chemin, trait: !!T, plein: !!F, lw: Math.max(0.3, lw * e), tirets: T && tirets ? tirets.map(x => x * e) : null, ct: T ? ct : null, cf: F ? cf : null }); }
      chemin = []; cur = null; u = null; depart = null; }
    for (let i = 0; i < fn.length; i++) { const f = fn[i], a = args[i];
      if (f === O.save) pile.push(garder());
      else if (f === O.restore) { if (pile.length) rendre(pile.pop()); }
      else if (f === O.transform) ctm = mul(ctm, a);
      else if (f === O.paintFormXObjectBegin) { pile.push(garder()); if (a && a[0] && a[0].length === 6) ctm = mul(ctm, Array.from(a[0])); }
      else if (f === O.paintFormXObjectEnd) { if (pile.length) rendre(pile.pop()); }
      else if (f === O.beginGroup) { pile.push(garder()); const g = a && a[0]; if (g && g.matrix) ctm = mul(ctm, Array.from(g.matrix)); }
      else if (f === O.endGroup) { if (pile.length) rendre(pile.pop()); }
      else if (f === O.setLineWidth) lw = +a[0];
      else if (f === O.setDash) tirets = a && a[0] && a[0].length ? Array.from(a[0]) : null;
      else if (f === O.setGState) { for (const [k, v] of (a && a[0]) || []) { if (k === 'LW') lw = +v; else if (k === 'D') tirets = v && v[0] && v[0].length ? Array.from(v[0]) : null; else if (k === 'CA') aT = +v; else if (k === 'ca') aF = +v; } }
      else if (f === O.setStrokeRGBColor || f === O.setStrokeGray || f === O.setStrokeCMYKColor) ct = couleur(a) || [0, 0, 0];
      else if (f === O.setFillRGBColor || f === O.setFillGray || f === O.setFillCMYKColor) cf = couleur(a) || [0, 0, 0];
      else if (f === O.setStrokeColorN || f === O.setStrokeColor) ct = typeof (a && a[0]) === 'string' && /Pattern/.test(a[0]) ? null : (couleur(a) || [0, 0, 0]);
      else if (f === O.setFillColorN || f === O.setFillColor) cf = typeof (a && a[0]) === 'string' && /Pattern/.test(a[0]) ? null : (couleur(a) || [0, 0, 0]);
      else if (f === O.constructPath) construire(a[0], a[1]);
      else if (f === O.stroke) peindre(true, false);
      else if (f === O.closeStroke) peindre(true, false, true);
      else if (f === O.fill || f === O.eoFill) peindre(false, true, true);
      else if (f === O.fillStroke || f === O.eoFillStroke) peindre(true, true, true);
      else if (f === O.closeFillStroke || f === O.closeEOFillStroke) peindre(true, true, true);
      else if (f === O.endPath) { chemin = []; cur = null; u = null; depart = null; }
      else if (f === O.paintImageXObject || f === O.paintInlineImageXObject || f === O.paintImageMaskXObject || f === O.paintJpegXObject || f === O.paintImageXObjectRepeat)
        images.push(boiteDe([app(ctm, 0, 0), app(ctm, 1, 0), app(ctm, 1, 1), app(ctm, 0, 1)])); }
    return { formes, images }; }

  /* ---- 2. LES TEXTES ----------------------------------------------------------------------------------------------
     Un item de pdf.js : { str, transform, width }. Un mot : { s, o (l'origine, sur la ligne de base), u (le sens de
     lecture), n (vers le haut des lettres), w, h, angle, c (son centre), B (sa boîte) }. Un texte espacé (« 1 0 2 C B 1 » :
     l'interlettrage d'un dessin) se recolle ; une ligne de plusieurs mots garde aussi ses mots, à leur place. */
  const ESPACE = /^\S( \S)+$/;
  function motsDesTextes(items, vt) { const out = [];
    for (const it of items || []) { let s = String(it.str || '').replace(/ /g, ' ').trim(); if (!s) continue;
      const t = it.transform; if (!t) continue; const m = mul(vt, Array.from(t)), o = [m[4], m[5]];
      const h = Math.hypot(m[2], m[3]) || Math.hypot(m[0], m[1]) || 1, lx = Math.hypot(m[0], m[1]) || 1, u = [m[0] / lx, m[1] / lx], n = [u[1], -u[0]];
      // la largeur de pdf.js est dans l'espace du PDF ; à l'échelle de la vue (1), la même
      const w = Math.max(+it.width || 0, 0.3 * h * s.length * (it.width ? 0 : 1)) || 0.55 * h * s.length;
      if (ESPACE.test(s)) s = s.replace(/ /g, '');
      const mot = (s, o, w) => { const c = [o[0] + u[0] * w / 2 + n[0] * h * 0.35, o[1] + u[1] * w / 2 + n[1] * h * 0.35];
        const coins = [o, [o[0] + u[0] * w, o[1] + u[1] * w], [o[0] + u[0] * w + n[0] * h * 0.75, o[1] + u[1] * w + n[1] * h * 0.75], [o[0] + n[0] * h * 0.75, o[1] + n[1] * h * 0.75]];
        return { s, o, u, n, w, h, angle: Math.round(Math.atan2(u[1], u[0]) * 180 / Math.PI), c, B: boiteDe(coins) }; };
      out.push(mot(s, o, w));
      // une ligne de plusieurs mots : chacun, à sa place estimée (la police est supposée à chasse égale)
      const parts = s.split(/\s+/); if (parts.length > 1 && parts.length < 8) { let k = 0; const par = w / s.length;
        for (const p of parts) { const i = s.indexOf(p, k); out.push({ ...mot(p, [o[0] + u[0] * par * i, o[1] + u[1] * par * i], par * p.length), partie: true }); k = i + p.length; } } }
    return out; }
  // ce qu'un mot est
  const RE_BORNE = /^(?:[A-Z]{1,2}[-.]?)?\d{1,3}[A-Z]?$|^[A-Z]{1,2}$|^[A-Z]{1,2}\d{1,2}[A-Z]$/;
  const RE_TYPE = /^(?:DR|DW|ML[A-D]?|BN|AD[B-E]?|DG|GPB|KC|KD|KL|YV|X[EFKYD]|W[SHLMNFWCGKP]|HE|AM|LE|KQ|KR|DH|VN[B-D]?|CF|SPA|PB)\d{1,2}[A-Z]?$/;
  const RE_PN = /^(?:EN|MS|NSA|ABS|ASNE|E\d{3,}|M\d{3,}|D38999|MIL|AS\d|SAE|NAS|NSA|DMC|M8\d{3})[\w\-/.,*]{3,}$|^\*?\d{3}[A-Z]\d{4,}/;
  // les flèches d'un renvoi (« ›F3 » : le renvoi « ▷F3 » de Volta, écrit dans un PDF en WinAnsi — 08-pdf-dossier)
  const FLECHES = '→|->|>|▷|►|⇨|⇒|›|»|←|<-|◁|◄|⇦|⇐|‹|«', RE_FLECHE = new RegExp('^\\s*(' + FLECHES + ')'), RE_RETOUR = /^\s*(←|<-|◁|◄|⇦|⇐|‹|«)/;
  const RE_RENVOI = new RegExp('^(?:' + FLECHES + ')?\\s*(?:F(?:OLIO|°|\\.)?\\s*)?(\\d{1,3})\\s*(?:[\\/.]\\s*([A-Z]?\\d{0,2}[A-Z]?))?$', 'i');
  const RE_FIL = /^W[-_]?\d{1,5}[A-Z]?$/i;
  // un repère n'a pas d'espace (« 10 A », le calibre écrit près d'un disjoncteur, n'en est pas un)
  function estRepere(s) { if (!s || s.length < 3 || s.length > 14 || /\s/.test(s)) return false; if (VT_A_POSER.test(s)) return true;
    const q = lireRepere(s); if (!q || !q.num) return false; if (q.code.length > 4) return false;
    return q.num.length >= 2 || !!CODES[q.code]; }
  const estBorne = s => !!s && s.length <= 4 && RE_BORNE.test(s.toUpperCase()) && !estRepere(s);
  const estType = s => RE_TYPE.test(s);
  const estPN = s => !estRepere(s) && !estType(s) && (RE_PN.test(s) || (/^[A-Z0-9][A-Z0-9\-/.]{7,}$/.test(s) && /\d{3}/.test(s) && /[A-Z]/.test(s) && !/^\d{1,2}[\/.]\d/.test(s)));
  function renvoiDe(s) { const m = RE_RENVOI.exec(String(s).trim()); if (!m) return null; const fleche = RE_FLECHE.test(s), f = /^\s*F/i.test(String(s).replace(RE_FLECHE, ''));
    if (!fleche && !f && !m[2]) return null;   // un nombre seul n'est pas un renvoi
    return { folio: m[1], zone: m[2] || '', sens: RE_RETOUR.test(s) ? 'de' : 'vers' }; }

  /* ---- 3. LE TRI DES FORMES ---------------------------------------------------------------------------------------- */
  const lum = c => c ? 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] : 0;
  const clair = c => !!c && lum(c) > 238;
  function rondeur(pts) { const B = boiteDe(pts), c = [(B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2], rs = pts.map(p => dist(p, c)), r = rs.reduce((a, b) => a + b, 0) / rs.length;
    const ec = Math.sqrt(rs.reduce((a, x) => a + (x - r) * (x - r), 0) / rs.length); return { c, r, ecart: r ? ec / r : 1, w: B.x1 - B.x0, h: B.y1 - B.y0 }; }
  function trier(formes, u) {
    const traits = [], cadres = [], ronds = [], points = [], pieces = [], fleches = [], arcs = [];
    for (const F of formes) for (const sp of F.sp) { const pts = sp.pts; if (pts.length < 2) continue;
      const B = boiteDe(pts), w = B.x1 - B.x0, h = B.y1 - B.y0, ferme = sp.ferme || (pts.length > 3 && dist(pts[0], pts[pts.length - 1]) < 0.05 * u);
      if (F.plein && !clair(F.cf)) {
        if (ferme && sp.courbe && Math.max(w, h) < 1.8 * u) { const R = rondeur(pts); if (R.ecart < 0.12 && Math.abs(w - h) < 0.25 * Math.max(w, h)) { points.push({ c: R.c, r: R.r }); continue; } }
        if (ferme && !sp.courbe && (pts.length === 4 || (pts.length === 5 && dist(pts[0], pts[4]) < 0.05 * u))) { const q = pts.slice(0, 4), l1 = dist(q[0], q[1]), l2 = dist(q[1], q[2]);
          const [L, e] = l1 >= l2 ? [l1, l2] : [l2, l1]; if (e < 0.6 * u && L > 1.8 * e) { const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
            const [a, b] = l1 >= l2 ? [mid(q[0], q[3]), mid(q[1], q[2])] : [mid(q[0], q[1]), mid(q[2], q[3])]; pieces.push({ a, b, L, e }); continue; } }
        if (ferme && pts.length === 3 || (ferme && pts.length === 4 && dist(pts[0], pts[3]) < 0.05 * u)) { if (Math.max(w, h) < 2 * u) { fleches.push({ pts: pts.slice(0, 3), B }); continue; } } }
      if (!F.trait || clair(F.ct)) continue;
      if (ferme) { if (sp.courbe) { const R = rondeur(pts); if (R.ecart < 0.1 && Math.max(w, h) < 2.2 * u) { ronds.push({ c: R.c, r: R.r }); continue; } }
        if (w > 0.5 * u && h > 0.5 * u && aire(pts) > 0.8 * w * h) { cadres.push({ x0: B.x0, y0: B.y0, x1: B.x1, y1: B.y1, lw: F.lw, arrondi: sp.courbe }); continue; }
        if (sp.courbe) { arcs.push(pts); continue; } }
      // un chemin ouvert : ses segments droits sont des traits ; une courbe seule est un symbole (l'arc d'un disjoncteur) ;
      // une courbe ENTRE deux segments droits d'un même chemin, un coude arrondi : ses cordes restent des traits
      if (sp.courbe && pts.length > 2) { let droits = 0; for (let i = 1; i < pts.length; i++) if (dist(pts[i - 1], pts[i]) > 0.6 * u) droits++; if (!droits) { arcs.push(pts); continue; } }
      // les cordes minuscules d'une courbe (le pont d'un croisement) se regroupent : aucun morceau ne se perd sous la tolérance
      const q = [pts[0]]; for (let i = 1; i < pts.length; i++) if (dist(q[q.length - 1], pts[i]) > 0.15 * u || i === pts.length - 1) q.push(pts[i]);
      // un sommet au milieu d'un chemin (un coude, le haut d'un pont) n'est pas un bout libre : il ne fait pas de T
      for (let i = 1; i < q.length; i++) if (dist(q[i - 1], q[i]) > 1e-3) traits.push({ a: q[i - 1], b: q[i], lw: F.lw, tiret: !!(F.tirets && F.tirets.some(x => x > 0)), libreA: i === 1 && !ferme, libreB: i === q.length - 1 && !ferme });
      if (ferme && dist(pts[0], pts[pts.length - 1]) > 1e-3) traits.push({ a: pts[pts.length - 1], b: pts[0], lw: F.lw, tiret: !!F.tirets }); }
    return { traits, cadres, ronds, points, pieces, fleches, arcs }; }

  /* Un cadre dessiné en quatre traits (certains logiciels le font) : quatre segments horizontaux et verticaux qui se
     referment. Ils sortent des traits et deviennent un cadre. */
  function cadresEnTraits(traits, u, cadres, jeu = 1) { const tol = 0.12 * u * jeu, G = grille(2 * u), H = [], V = [];
    traits.forEach((t, i) => { if (t.tiret) return; const dx = Math.abs(t.a[0] - t.b[0]), dy = Math.abs(t.a[1] - t.b[1]);
      if (dy < tol && dx > 0.5 * u) H.push(i); else if (dx < tol && dy > 0.5 * u) V.push(i); else return;
      [t.a, t.b].forEach(p => G.ajouter({ i, p }, p[0], p[1], p[0], p[1])); });
    const pris = new Set(), pres = (p, sauf) => G.chercher(p[0] - tol, p[1] - tol, p[0] + tol, p[1] + tol).filter(o => !sauf.includes(o.i) && dist(o.p, p) < tol);
    for (const ih of H) { if (pris.has(ih)) continue; const h = traits[ih], [g, d] = h.a[0] < h.b[0] ? [h.a, h.b] : [h.b, h.a];
      const vg = pres(g, [ih]).filter(o => V.includes(o.i)), vd = pres(d, [ih]).filter(o => V.includes(o.i));
      for (const a of vg) for (const b of vd) { if (a.i === b.i || pris.has(a.i) || pris.has(b.i)) continue; const ta = traits[a.i], tb = traits[b.i];
        const ga = dist(ta.a, g) < tol ? ta.b : ta.a, db = dist(tb.a, d) < tol ? tb.b : tb.a; if (Math.abs(ga[1] - db[1]) > tol || Math.sign(ga[1] - g[1]) !== Math.sign(db[1] - d[1])) continue;
        const bas = pres(ga, [a.i]).find(o => H.includes(o.i) && o.i !== ih && pres(db, [b.i]).some(q => q.i === o.i)); if (!bas) continue;
        const B = boiteDe([g, d, ga, db]); cadres.push({ x0: B.x0, y0: B.y0, x1: B.x1, y1: B.y1, lw: h.lw, traits: true }); [ih, a.i, b.i, bas.i].forEach(k => pris.add(k)); break; } }
    return traits.filter((_, i) => !pris.has(i)); }

  /* Les POINTILLÉS : les tirets qu'un PDF peint un par un (de petits quadrilatères pleins, alignés) se recollent en un
     segment, comme un trait pointillé ; un long quadrilatère seul est un trait épais. */
  function pointilles(pieces, traits, u) { const out = [], seuls = [];
    const P = pieces.map(p => { const v = [p.b[0] - p.a[0], p.b[1] - p.a[1]], L = Math.hypot(...v) || 1; return { ...p, v: [v[0] / L, v[1] / L] }; });
    const vu = new Set();
    for (let i = 0; i < P.length; i++) { if (vu.has(i)) continue; const p = P[i], grp = [i]; vu.add(i);
      // les tirets sur la même droite, à moins de trois longueurs l'un de l'autre, de proche en proche
      let change = true; while (change) { change = false;
        for (let j = 0; j < P.length; j++) { if (vu.has(j)) continue; const q = P[j]; if (Math.abs(p.v[0] * q.v[1] - p.v[1] * q.v[0]) > 0.05) continue;
          if (proj(q.a, [p.a[0] - p.v[0] * 1e4, p.a[1] - p.v[1] * 1e4], [p.a[0] + p.v[0] * 1e4, p.a[1] + p.v[1] * 1e4]).d > 0.15 * u) continue;
          if (grp.some(k => Math.min(dist(P[k].a, q.b), dist(P[k].b, q.a), dist(P[k].a, q.a), dist(P[k].b, q.b)) < 3 * Math.max(P[k].L, q.L) + 0.3 * u)) { grp.push(j); vu.add(j); change = true; } } }
      if (grp.length < 2) { if (p.L > 1.5 * u) traits.push({ a: p.a, b: p.b, lw: p.e, tiret: false }); else seuls.push(p); continue; }
      const ts = grp.flatMap(k => [P[k].a, P[k].b]).map(q => (q[0] - p.a[0]) * p.v[0] + (q[1] - p.a[1]) * p.v[1]), t0 = Math.min(...ts), t1 = Math.max(...ts);
      out.push({ a: [p.a[0] + p.v[0] * t0, p.a[1] + p.v[1] * t0], b: [p.a[0] + p.v[0] * t1, p.a[1] + p.v[1] * t1] }); }
    // les traits peints en tirets (un motif de tirets sur le trait) en sont aussi
    traits.forEach(t => { if (t.tiret) out.push({ a: t.a, b: t.b }); });
    return out; }

  /* Les MASSES : trois barres parallèles qui décroissent, également espacées ; le trait qui arrive au milieu de la plus
     longue est le bout, la masse son équipement. Les barres sortent des traits. */
  function masses(traits, u) { const out = [], pris = new Set(), courts = [];
    traits.forEach((t, i) => { const L = dist(t.a, t.b); if (!t.tiret && L < 3.2 * u && L > 0.15 * u) courts.push({ i, L, c: [(t.a[0] + t.b[0]) / 2, (t.a[1] + t.b[1]) / 2], v: [(t.b[0] - t.a[0]) / L, (t.b[1] - t.a[1]) / L] }); });
    const G = grille(2 * u); courts.forEach(s => G.ajouter(s, s.c[0], s.c[1], s.c[0], s.c[1]));
    for (const s of courts) { if (pris.has(s.i)) continue; const n = [-s.v[1], s.v[0]];
      const voisins = G.chercher(s.c[0] - 3 * u, s.c[1] - 3 * u, s.c[0] + 3 * u, s.c[1] + 3 * u).filter(q => q !== s && !pris.has(q.i) && Math.abs(q.v[0] * s.v[1] - q.v[1] * s.v[0]) < 0.08 && q.L < s.L * 0.92)
        .map(q => { const d = [q.c[0] - s.c[0], q.c[1] - s.c[1]]; return { q, k: d[0] * n[0] + d[1] * n[1], le: Math.abs(d[0] * s.v[0] + d[1] * s.v[1]) }; }).filter(o => o.le < 0.2 * s.L && Math.abs(o.k) > 0.1 * u && Math.abs(o.k) < 3 * u);
      for (const sens of [1, -1]) { const cote = voisins.filter(o => Math.sign(o.k) === sens).sort((a, b) => Math.abs(a.k) - Math.abs(b.k)); if (cote.length < 2) continue;
        const [b2, b3] = cote; if (Math.abs(b2.k) > 1.5 * u || !(b3.q.L < b2.q.L && Math.abs(Math.abs(b3.k) - 2 * Math.abs(b2.k)) < 0.35 * Math.abs(b2.k))) continue;
        out.push({ attache: s.c, dir: [-n[0] * sens, -n[1] * sens], barres: [s.i, b2.q.i, b3.q.i], B: boiteDe([traits[s.i].a, traits[s.i].b, traits[b3.q.i].a, traits[b3.q.i].b]) });
        [s.i, b2.q.i, b3.q.i].forEach(k => pris.add(k)); break; } }
    return { masses: out, restants: traits.filter((_, i) => !pris.has(i)) }; }

  /* ---- LE CARTOUCHE, LE CADRE DE LA FEUILLE ---------------------------------------------------------------------- */
  const ETIQUETTES = [['titre', 'TITRE|TITLE|DÉSIGNATION|DESIGNATION|INTITULÉ'], ['numero', 'N°|NO\\.?|NUMÉRO|NUMERO|DOCUMENT|DOC\\.?|DRAWING|DWG\\.?|PLAN N°|N° DE PLAN|DESSIN N°|RÉFÉRENCE|REFERENCE|RÉF\\.?|REF\\.?'],
    ['folio', 'FOLIO|SHEET|FEUILLE|F°|PAGE|PLANCHE'], ['indice', 'INDICE|IND\\.?|REV\\.?|RÉVISION|REVISION|ÉDITION'], ['harness', 'HARNESS|FAISCEAU|TORON'],
    ['date', 'DATE'], ['auteur', 'DESSINÉ|DESSINE|DRAWN|AUTEUR|PAR'], ['echelle', 'ÉCHELLE|ECHELLE|SCALE']].map(([k, s]) => [k, new RegExp('^(?:' + s + ')\\s*:?$', 'i'), new RegExp('^(?:' + s + ')\\s*[:=]\\s*(.+)$', 'i')]);
  function cartouche(mots, cadres, u, page) {
    const lab = []; mots.forEach(m => { if (m.partie) return;
      for (const [k, seul, avec] of ETIQUETTES) { if (seul.test(m.s)) { lab.push({ k, m }); return; } const r = avec.exec(m.s); if (r) { lab.push({ k, m, valeur: r[1].trim() }); return; } } });
    if (lab.length < 2) return { zone: null, champs: {} };
    // la zone : le plus petit cadre qui contient au moins deux étiquettes, sinon leur boîte élargie
    const dans = K => lab.filter(l => dedans(l.m.c, K)).length;
    const K = cadres.filter(k => dans(k) >= 2 && (k.x1 - k.x0) * (k.y1 - k.y0) < 0.35 * page.w * page.h).sort((a, b) => (a.x1 - a.x0) * (a.y1 - a.y0) - (b.x1 - b.x0) * (b.y1 - b.y0))[0];
    const zone = K ? { ...K } : (() => { const B = boiteDe(lab.flatMap(l => [[l.m.B.x0, l.m.B.y0], [l.m.B.x1, l.m.B.y1]])); return { x0: B.x0 - 2 * u, y0: B.y0 - 2 * u, x1: B.x1 + 8 * u, y1: B.y1 + 3 * u }; })();
    const etiquettes = new Set(lab.map(l => l.m)), champs = {};
    lab.forEach(l => { if (champs[l.k]) return; if (l.valeur) { champs[l.k] = l.valeur; return; }
      // la valeur : le texte le plus proche dessous ou à droite, dans la zone
      const cands = mots.filter(m => !m.partie && !etiquettes.has(m) && dedans(m.c, zone, u) && m.c[1] > l.m.B.y0 - 0.5 * u && m.c[0] > l.m.B.x0 - 1.5 * u)
        .map(m => { const dx = m.B.x0 - l.m.B.x0, dy = m.c[1] - l.m.c[1]; return { m, d: dy > 0.3 * u ? Math.hypot(Math.max(0, dx) * 0.6, dy) : dx > 0 ? dx + 2 * u : Infinity }; }).filter(o => o.d < 12 * u).sort((a, b) => a.d - b.d);
      // la valeur, et les mots qui la suivent sur sa ligne, de proche en proche (« 3 », « / », « 6 » écrits séparément)
      if (cands.length) { const v = cands[0].m, ligne = mots.filter(m => !m.partie && !etiquettes.has(m) && Math.abs(m.o[1] - v.o[1]) < 0.3 * v.h && m.B.x0 >= v.B.x0 - 0.1 * u && dedans(m.c, zone, u)).sort((a, b) => a.o[0] - b.o[0]);
        const pris = [v]; for (const m of ligne) { if (m === v || m.B.x0 < v.B.x0) continue; if (m.B.x0 - pris[pris.length - 1].B.x1 > 1.6 * v.h) break; pris.push(m); }
        champs[l.k] = pris.map(m => m.s).join(' ').replace(/\s*\/\s*/g, ' / '); } });
    if (champs.folio) { const f = /(\d+)\s*(?:\/|sur|of)\s*(\d+)/i.exec(champs.folio); champs.folioNum = f ? f[1] : (/\d+/.exec(champs.folio) || [''])[0]; champs.folios = f ? f[2] : ''; }
    return { zone, champs }; }

  /* ---- 4. LE GRAPHE DES TRAITS ------------------------------------------------------------------------------------
     Les nœuds : les bouts des segments, regroupés à `tol` près ; un bout qui tombe à l'intérieur d'un autre segment le
     coupe (un T) ; un point de jonction coupe tous les segments qui passent dessous et les réunit. Un croisement sans
     point ne coupe rien. Rend les nœuds { p, deg, aretes }, les arêtes { a, b, L, seg }, les jonctions en T et par point. */
  function graphe(segs, points, u, jeu = 1) {
    const tol = Math.max(0.12 * u, 0.6) * jeu, G = grille(2 * u);
    segs.forEach((s, i) => { s.i = i; s.L = dist(s.a, s.b); s.coupes = [{ t: 0, p: s.a }, { t: 1, p: s.b }]; G.ajouter(s, Math.min(s.a[0], s.b[0]) - tol, Math.min(s.a[1], s.b[1]) - tol, Math.max(s.a[0], s.b[0]) + tol, Math.max(s.a[1], s.b[1]) + tol); });
    const pts = [], marque = [];   // les points de coupe : [x, y], leur sorte (0 bout, 1 T, 2 point de jonction)
    const ajouter = (p, sorte) => { pts.push(p); marque.push(sorte); return pts.length - 1; };
    segs.forEach(s => { s.coupes[0].k = ajouter(s.a, 0); s.coupes[1].k = ajouter(s.b, 0); });
    // les T : un bout posé sur l'intérieur d'un autre segment
    let nT = 0; segs.forEach(s => { [[s.a, s.libreA], [s.b, s.libreB]].forEach(([p, libre]) => { if (libre === false) return; G.chercher(p[0] - tol, p[1] - tol, p[0] + tol, p[1] + tol).forEach(t => { if (t === s) return;
      const r = proj(p, t.a, t.b); if (r.d > tol || r.t * t.L < tol || (1 - r.t) * t.L < tol) return; t.coupes.push({ t: r.t, p: r.q, k: ajouter(r.q, 1) }); nT++; }); }); });
    // les points de jonction : tout segment qui passe sous le disque est coupé là, et tous se rejoignent
    const groupesPoint = [];
    points.forEach(d => { const r = d.r + tol, ks = [];
      G.chercher(d.c[0] - r, d.c[1] - r, d.c[0] + r, d.c[1] + r).forEach(t => { const q = proj(d.c, t.a, t.b); if (q.d > r) return;
        if (q.t * t.L < tol) ks.push(t.coupes[0].k); else if ((1 - q.t) * t.L < tol) ks.push(t.coupes[1].k); else { const k = ajouter(q.q, 2); t.coupes.push({ t: q.t, p: q.q, k }); ks.push(k); } });
      if (ks.length) groupesPoint.push({ d, ks }); });
    // regrouper les points proches
    const U = unions(pts.length), GP = grille(Math.max(tol * 2, 1));
    pts.forEach((p, k) => { GP.chercher(p[0] - tol, p[1] - tol, p[0] + tol, p[1] + tol).forEach(j => { if (dist(pts[j], p) < tol) U.u(j, k); }); GP.ajouter(k, p[0], p[1], p[0], p[1]); });
    groupesPoint.forEach(g => g.ks.forEach(k => U.u(k, g.ks[0])));
    const idDe = new Map(), noeuds = [], noeudDe = k => { const r = U.f(k); if (!idDe.has(r)) { idDe.set(r, noeuds.length); noeuds.push({ p: pts[r], aretes: [], deg: 0, sortes: new Set(), bouts: [] }); } return idDe.get(r); };
    pts.forEach((p, k) => noeuds[noeudDe(k)].sortes.add(marque[k]));
    groupesPoint.forEach(g => { const n = noeuds[noeudDe(g.ks[0])]; n.point = g.d; n.p = g.d.c; });
    const aretes = [];
    segs.forEach(s => { s.coupes.sort((x, y) => x.t - y.t); let prec = null;
      for (const c of s.coupes) { const n = noeudDe(c.k); if (c.t === 0 || c.t === 1) noeuds[n].bouts.push({ s, fin: c.t === 1 });
        if (prec != null && prec.n !== n) { const L = Math.max(1e-6, (c.t - prec.t) * s.L); const e = { a: prec.n, b: n, L, s, t0: prec.t, t1: c.t }; aretes.push(e); noeuds[prec.n].aretes.push(e); noeuds[n].aretes.push(e); }
        if (!prec || prec.n !== n) prec = { n, t: c.t }; } });
    noeuds.forEach(n => { n.deg = n.aretes.length; });
    return { noeuds, aretes, nT, tol }; }

  /* ---- 5. LES BOUTS : à quoi chaque bout de trait arrive --------------------------------------------------------- */
  function resolveur(ctx) {
    const { mots, cadres, ronds, numerotes, masses: M, u, pointilles: PT } = ctx;
    const GM = grille(3 * u); mots.forEach(m => GM.ajouter(m, m.B.x0, m.B.y0, m.B.x1, m.B.y1));
    const motsPres = (p, r) => GM.chercher(p[0] - r, p[1] - r, p[0] + r, p[1] + r);
    const GC = grille(4 * u); cadres.forEach(k => GC.ajouter(k, k.x0, k.y0, k.x1, k.y1));
    // les textes dans un cadre ; les cadres collés (une pièce de connecteur sur son équipement : un ASSEMBLAGE)
    cadres.forEach(k => { k.mots = GM.chercher(k.x0, k.y0, k.x1, k.y1).filter(m => dedans(m.c, k)); k.reperes = k.mots.filter(m => estRepere(m.s)); k.aire = (k.x1 - k.x0) * (k.y1 - k.y0); });
    const grand = k => k.reperes.length > 2 || k.cadre || k.cartouche;
    const UC = unions(cadres.length), tolC = 0.25 * u; cadres.forEach((k, i) => { k.id = i; });
    cadres.forEach(k => { if (grand(k)) return; GC.chercher(k.x0 - tolC, k.y0 - tolC, k.x1 + tolC, k.y1 + tolC).forEach(j => { if (j === k || grand(j)) return;
      if (k.x0 <= j.x1 + tolC && j.x0 <= k.x1 + tolC && k.y0 <= j.y1 + tolC && j.y0 <= k.y1 + tolC) UC.u(k.id, j.id); }); });
    const assemblages = new Map(); cadres.forEach(k => { if (grand(k)) return; const r = UC.f(k.id); (assemblages.get(r) || assemblages.set(r, []).get(r)).push(k); });
    const assemblage = k => assemblages.get(UC.f(k.id)) || [k];
    /* Le repère d'un cadre : le repère écrit dedans (le plus grand) ; à défaut, son texte le plus grand s'il a l'air d'un nom
       (« J101 », « K12 », « CB-12 » : une autre convention que 102CB1) — deviné, il le dit. */
    const repereDuCadre = k => { const R = k.reperes.slice().sort((a, b) => b.h - a.h); if (R[0]) return R[0]; if (grand(k) || k.cartouche) return null;
      // (« J149 » a la forme d'une borne : c'est sa taille qui dit le nom)
      const g = k.mots.filter(m => /^[A-Z][A-Z0-9\-_.]{1,11}$/.test(m.s) && /\d/.test(m.s) && (!estBorne(m.s) || m.h >= 1.25 * u) && !estPN(m.s) && !estType(m.s) && !renvoiDe(m.s)).sort((a, b) => b.h - a.h)[0];
      return g && g.h >= 1.15 * u ? Object.assign(g, { devine: true }) : null; };
    // le repère qui NOMME un assemblage sans repère dedans : écrit juste dessous, dessus, ou à côté
    function repereQuiNomme(A) { const B = boiteDe(A.flatMap(k => [[k.x0, k.y0], [k.x1, k.y1]]));
      const c = motsPres([(B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2], Math.max(B.x1 - B.x0, B.y1 - B.y0) / 2 + 3 * u).filter(m => estRepere(m.s) && auBord(m.c, B) < 2.2 * u && auBord(m.c, B) > -0.2 * u && !cadres.some(k => !grand(k) && dedans(m.c, k) && !A.includes(k)))
        .sort((a, b) => auBord(a.c, B) - auBord(b.c, B)); return c[0] || null; }
    // la lettre d'une pièce de connecteur : une ou deux lettres posées juste au-dessus d'elle
    function lettreDe(k, A) { if (A.length < 2 || repereDuCadre(k)) return '';
      const c = motsPres([(k.x0 + k.x1) / 2, k.y0], 1.6 * u).filter(m => /^[A-Z]{1,2}$/.test(m.s) && m.c[1] < k.y0 + 0.1 * u && k.y0 - m.c[1] < 1.6 * u && m.c[0] > k.x0 - 0.3 * u && m.c[0] < k.x1 + 0.3 * u);
      return c.length ? c.sort((a, b) => (k.y0 - a.c[1]) - (k.y0 - b.c[1]))[0].s : ''; }
    // la référence (part number) écrite dans l'assemblage, ou juste autour
    function pnDe(A, R) { const B = boiteDe(A.flatMap(k => [[k.x0, k.y0], [k.x1, k.y1]]));
      const c = motsPres([(B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2], Math.max(B.x1 - B.x0, B.y1 - B.y0) / 2 + 4 * u).filter(m => m !== R && estPN(m.s) && auBord(m.c, B) < 2.5 * u).sort((a, b) => auBord(a.c, B) - auBord(b.c, B));
      return c[0] ? c[0].s : ''; }
    // la borne : le texte court le plus proche du bout — dans le cadre d'abord, dans le sens où le trait arrive
    function borneDe(p, d, dans, rayon, sauf) { const cands = motsPres(p, rayon).filter(m => !m.partie && estBorne(m.s) && !(sauf && sauf.has(m)) && (!dans || dans.some(k => dedans(m.c, k, 0.05 * u))));
      // la mesure : la distance du bout à la BOÎTE du texte (un « 12 » ou un « R1 » écrit contre le fil compte comme un « 1 »),
      // plus son écart de côté (le numéro de la borne voisine est sur la ligne d'à côté)
      let best = null, bd = Infinity;
      for (const m of cands) { const v = [m.c[0] - p[0], m.c[1] - p[1]], lat = d ? Math.abs(v[0] * d[1] - v[1] * d[0]) : 0, s = Math.max(0, auBord(p, m.B)) + 0.35 * lat;
        if (s < bd) { bd = s; best = m; } }
      return best && bd < rayon ? { m: best, d: Math.max(0, auBord(p, best.B)) } : null; }
    const repereLePlusProche = (p, r) => { const c = motsPres(p, r).filter(m => estRepere(m.s)).map(m => ({ m, d: auBord(p, m.B) })).sort((a, b) => a.d - b.d); return c[0] && c[0].d < r ? c[0] : null; };
    const renvoiPres = (p, d) => { const c = motsPres(p, 3 * u).filter(m => renvoiDe(m.s)).map(m => ({ m, d: auBord(p, m.B) })).filter(o => o.d < 2.2 * u).sort((a, b) => a.d - b.d); return c[0] || null; };

    /* Un bout { p, d (le sens où le trait arrive) } → { repere, borne, pn, genre, conf, raisons, mots (les textes lus,
       pour les surligner) } ou null. */
    return function resoudre(p, d) {
      const R = [], vus = [];
      // une masse
      for (const g of M) if (dist(g.attache, p) < 0.5 * u) { const nom = repereLePlusProche(g.attache, 4 * u) || null;
        const pref = nom && /G$/i.test((lireRepere(nom.m.s) || {}).code || '') ? 0.97 : nom ? 0.85 : 0.5; if (nom) vus.push(nom.m);
        return { genre: 'masse', repere: nom ? nom.m.s : 'MASSE', borne: '', pn: '', conf: pref, raisons: [nom ? 'masse ' + nom.m.s : 'masse sans repère écrit'], mots: vus, B: g.B }; }
      // une borne de barrette : un point numéroté
      for (const n of numerotes) if (dist(n.c, p) < n.r + 0.3 * u) { vus.push(n.mot); if (n.repere) vus.push(n.repere);
        return { genre: 'pastille', repere: n.repere ? n.repere.s : '', borne: n.mot.s, pn: '', conf: n.repere ? 0.96 : 0.6, raisons: [n.repere ? 'borne ' + n.mot.s + ' de ' + n.repere.s + ', sur sa barrette' : 'borne de barrette sans repère'], mots: vus }; }
      // un rond : la borne d'un disjoncteur
      for (const r of ronds) if (dist(r.c, p) < r.r + 0.25 * u) { const b = borneDe(r.c, null, null, 2.6 * u), rep = repereLePlusProche(r.c, 7 * u);
        if (b) vus.push(b.m); if (rep) vus.push(rep.m);
        return { genre: 'rond', repere: rep ? rep.m.s : '', borne: b ? b.m.s : '', pn: '', conf: (b ? 0.95 : 0.6) * (rep ? (rep.d < 4 * u ? 1 : 0.85) : 0.4), raisons: [b ? 'borne ronde ' + b.m.s + ', son numéro à ' + dixieme(mm(b.d)) + ' mm' : 'borne ronde sans numéro', rep ? 'repère ' + rep.m.s + ' à côté' : 'aucun repère autour'], mots: vus }; }
      // un renvoi vers un autre folio
      const rv = renvoiPres(p, d); if (rv && !cadres.some(k => !grand(k) && auBord(p, k) < 0.3 * u && !k.mots.includes(rv.m))) { vus.push(rv.m); const r = renvoiDe(rv.m.s);
        return { genre: 'renvoi', renvoi: { ...r, texte: rv.m.s }, repere: '', borne: '', conf: 0.9, raisons: ['renvoi ' + rv.m.s], mots: vus }; }
      // un cadre touché : le plus petit dont le bord passe au bout
      const touches = GC.chercher(p[0] - 0.4 * u, p[1] - 0.4 * u, p[0] + 0.4 * u, p[1] + 0.4 * u).filter(k => !grand(k) && Math.abs(auBord(p, k)) < 0.35 * u).sort((a, b) => a.aire - b.aire);
      if (touches.length) { const k = touches[0], A = assemblage(k);
        // un renvoi dans une pastille (le jeton « ▷F3 » d'un folio découpé)
        const rvk = k.mots.find(m => renvoiDe(m.s)); if (rvk && !repereDuCadre(k)) { vus.push(rvk); return { genre: 'renvoi', renvoi: { ...renvoiDe(rvk.s), texte: rvk.s }, repere: '', borne: '', conf: 0.9, raisons: ['renvoi ' + rvk.s], mots: vus }; }
        let rep = repereDuCadre(k), comment = 'repère du cadre';
        if (!rep) { const v = A.map(repereDuCadre).find(Boolean); if (v) { rep = v; comment = 'repère du cadre voisin'; } }
        if (!rep) { const v = repereQuiNomme(A); if (v) { rep = v; comment = 'repère écrit contre le cadre'; } }
        let confR = comment === 'repère du cadre' ? 1 : comment === 'repère du cadre voisin' ? 0.98 : 0.96;
        if (rep && rep.devine) { confR *= 0.8; comment += ' (deviné : le texte le plus grand du cadre)'; }
        if (!rep) { const v = repereLePlusProche(p, 10 * u); if (v) { rep = v.m; comment = 'repère le plus proche'; confR = 0.7; } }
        // la borne : dans la pièce touchée, puis dans l'assemblage, puis contre le bout
        const sauf = rep && rep.devine ? new Set([rep]) : null;
        let b = borneDe(p, d, [k], 3 * u, sauf), conf = 0.98, dit = 'borne lue dans le cadre';
        if (!b) { b = borneDe(p, d, A, 3 * u, sauf); dit = 'borne lue dans l’équipement'; conf = 0.97; }
        if (!b) { b = borneDe(p, d, null, 1.6 * u, sauf); if (b && b.d < 0.6 * u) { dit = 'borne écrite au bout du trait'; conf = 0.95; } else { dit = 'borne devinée : le texte le plus proche'; conf = 0.85; } }
        const lettre = b ? lettreDe(k, A) : '', borne = b ? (lettre && !b.m.s.toUpperCase().startsWith(lettre) ? lettre + b.m.s : b.m.s) : '';
        if (b) vus.push(b.m); if (rep) vus.push(rep);
        return { genre: 'cadre', repere: rep ? rep.s : '', borne, pn: rep ? pnDe(A, rep) : '', conf: (b ? conf : 0.55) * (rep ? confR : 0.3), cadre: k, A,
          raisons: [b ? dit + (lettre ? ' (connecteur ' + lettre + ')' : '') + ', à ' + dixieme(mm(b.d)) + ' mm' : 'aucun numéro de borne près du bout', rep ? comment + ' : ' + rep.s : 'aucun repère pour ce cadre'], mots: vus }; }
      // sans rien : un texte court au bout du trait
      const b = borneDe(p, d, null, 1.3 * u); if (b) { const rep = repereLePlusProche(p, 10 * u); vus.push(b.m); if (rep) vus.push(rep.m);
        return { genre: 'texte', repere: rep ? rep.m.s : '', borne: b.m.s, pn: '', conf: 0.75 * (rep ? (rep.d < 5 * u ? 1 : 0.8) : 0.3), raisons: ['borne devinée : texte au bout du trait, à ' + dixieme(mm(b.d)) + ' mm', rep ? 'repère le plus proche : ' + rep.m.s : 'aucun repère autour'], mots: vus }; }
      return null; }; }

  /* ---- 6. LES LIAISONS D'UN RÉSEAU : de proche en proche ----------------------------------------------------------
     Les distances le long des traits entre les bouts (Dijkstra depuis chacun), puis l'arbre couvrant le plus court
     (Kruskal) : deux bouts, une liaison ; trois, les deux plus courtes ; jamais toutes les paires. Chaque liaison garde
     son TRAJET (les arêtes suivies). */
  function dijkstra(noeuds, depart, dans) { const D = new Map([[depart, 0]]), prec = new Map(), file = [[0, depart]];
    while (file.length) { let bi = 0; for (let i = 1; i < file.length; i++) if (file[i][0] < file[bi][0]) bi = i; const [d, n] = file.splice(bi, 1)[0]; if (d > D.get(n)) continue;
      for (const e of noeuds[n].aretes) { const m = e.a === n ? e.b : e.a; if (dans && !dans.has(m)) continue; const nd = d + e.L; if (nd < (D.has(m) ? D.get(m) : Infinity)) { D.set(m, nd); prec.set(m, e); file.push([nd, m]); } } }
    return { D, prec }; }
  function arbre(bouts, noeuds) { const T = bouts.map(b => dijkstra(noeuds, b.n)), paires = [];
    for (let i = 0; i < bouts.length; i++) for (let j = i + 1; j < bouts.length; j++) { const d = T[i].D.get(bouts[j].n); if (d != null) paires.push({ i, j, d }); }
    paires.sort((a, b) => a.d - b.d || a.i - b.i || a.j - b.j); const U = unions(bouts.length), out = [];
    for (const q of paires) { if (U.f(q.i) === U.f(q.j)) continue; U.u(q.i, q.j);
      const tr = []; let n = bouts[q.j].n; while (n !== bouts[q.i].n) { const e = T[q.i].prec.get(n); if (!e) break; tr.push(e); n = e.a === n ? e.b : e.a; }
      out.push({ i: q.i, j: q.j, d: q.d, trajet: tr }); }
    return out; }

  /* ---- 7. UNE PAGE ------------------------------------------------------------------------------------------------- */
  function lirePage(P) {
    const vt = P.vt || [1, 0, 0, -1, 0, P.hauteur], page = { w: P.largeur, h: P.hauteur };
    // une page vectorielle arrive avec ce que pdf.js en lit ; une page SCANNÉE lue ailleurs (le branchement d'un module d'OCR :
    // ses mots et les traits trouvés sur l'image, `scan: true`) arrive avec ses mots et ses formes — tolérances élargies, confiance
    // abaissée
    const mots = P.mots || motsDesTextes(P.items, vt);
    const { formes, images } = P.formes ? { formes: P.formes, images: [] } : formesDesOperateurs(P.fn || [], P.args || [], P.OPS, vt);
    // un scan : une image couvre la page, et aucun texte ne s'y lit
    const couvre = images.some(B => (B.x1 - B.x0) * (B.y1 - B.y0) > 0.5 * page.w * page.h);
    // (un scanner qui « rend le PDF cherchable » pose sous l'image un texte invisible : la page reste un scan — des mots, pas de traits —,
    // mais ses mots servent à proposer le repère et la borne quand on relie à la main)
    const tracee = formes.filter(F => F.trait).length;
    // un PDF sans aucun texte et sans image : son texte est dessiné en traits (« vectorisé ») — il se relie à la main, comme un scan
    const sansTexte = !mots.filter(m => !m.partie).length;
    if (!P.scan && ((couvre && (sansTexte || tracee < 15)) || (sansTexte && tracee > 0))) return { scanne: true, vectorise: !couvre, texte: mots.length > 0, page, u: Math.min(page.w, page.h) / 120, mots: [], tousMots: [], liaisons: [], renvois: [], orphelins: [], bornesSeules: [], champs: {}, debug: {} };
    // le module : la hauteur médiane des textes courts (les bornes) ; à défaut, des textes
    const courts = mots.filter(m => !m.partie && m.s.length <= 3).map(m => m.h);
    const u = med(courts.length >= 5 ? courts : mots.map(m => m.h)) || Math.min(page.w, page.h) / 120;
    const T = trier(formes, u);
    // un scan : ses traits sortent de l'image, à l'épaisseur d'un trait près — les bouts se cherchent plus loin
    const jeu = P.scan ? 2.5 : 1;
    let traits = cadresEnTraits(T.traits, u, T.cadres, jeu);
    const PT = pointilles(T.pieces, traits, u); traits = traits.filter(t => !t.tiret);
    // le cadre de la feuille : le plus grand, s'il couvre l'essentiel ; ce qui est dehors (les repères de zone) ne compte pas
    const feuille = T.cadres.filter(k => (k.x1 - k.x0) * (k.y1 - k.y0) > 0.55 * page.w * page.h).sort((a, b) => (a.x1 - a.x0) * (a.y1 - a.y0) - (b.x1 - b.x0) * (b.y1 - b.y0))[0] || null;
    if (feuille) feuille.cadre = true;
    const C = cartouche(mots, T.cadres, u, page); if (C.zone) T.cadres.forEach(k => { if (k.x0 >= C.zone.x0 - 0.5 * u && k.x1 <= C.zone.x1 + 0.5 * u && k.y0 >= C.zone.y0 - 0.5 * u && k.y1 <= C.zone.y1 + 0.5 * u) k.cartouche = true; });
    const horsJeu = p => (feuille && !dedans(p, feuille, 0.2 * u)) || (C.zone && dedans(p, C.zone, 0.2 * u));
    const motsLus = mots.filter(m => !horsJeu(m.c));
    traits = traits.filter(t => !(horsJeu(t.a) && horsJeu(t.b)) && dist(t.a, t.b) > 0.04 * u);
    const { masses: M, restants } = masses(traits, u); traits = restants;
    // les points : numérotés (une borne de barrette : un numéro écrit dedans) ou de jonction
    const GM = grille(3 * u); motsLus.forEach(m => GM.ajouter(m, m.B.x0, m.B.y0, m.B.x1, m.B.y1));
    const numerotes = [], jonctions = [];
    T.points.filter(d => !horsJeu(d.c)).forEach(d => { const m = GM.chercher(d.c[0] - d.r, d.c[1] - d.r, d.c[0] + d.r, d.c[1] + d.r).find(m => !m.partie && estBorne(m.s) && dist(m.c, d.c) < d.r * 1.1 + 0.1 * u);
      if (m) numerotes.push({ ...d, mot: m }); else jonctions.push(d); });
    // les barrettes : les points numérotés sur un même pointillé, nommés par le repère écrit contre lui
    const barrettes = [];
    PT.forEach(t => { const sur = numerotes.filter(n => proj(n.c, t.a, t.b).d < n.r + 0.2 * u); if (!sur.length) return;
      const autour = GM.chercher(Math.min(t.a[0], t.b[0]) - 4 * u, Math.min(t.a[1], t.b[1]) - 4 * u, Math.max(t.a[0], t.b[0]) + 4 * u, Math.max(t.a[1], t.b[1]) + 4 * u)
        .filter(m => estRepere(m.s)).map(m => ({ m, d: proj(m.c, t.a, t.b).d })).sort((a, b) => a.d - b.d);
      const nom = autour[0] && autour[0].d < 3.5 * u ? autour[0].m : null; sur.forEach(n => { if (!n.repere || (nom && proj(n.c, t.a, t.b).d < 0.5 * u)) n.repere = nom; n.barrette = t; }); barrettes.push({ t, sur, nom }); });
    numerotes.forEach(n => { if (n.repere) return; const c = GM.chercher(n.c[0] - 5 * u, n.c[1] - 5 * u, n.c[0] + 5 * u, n.c[1] + 5 * u).filter(m => estRepere(m.s)).sort((a, b) => dist(a.c, n.c) - dist(b.c, n.c)); n.repere = c[0] || null; });
    // le graphe ; les ronds et les points numérotés sont des bornes, pas des jonctions
    const G = graphe(traits, jonctions, u, jeu);
    const resoudre = resolveur({ mots: motsLus, cadres: T.cadres, ronds: T.ronds.filter(r => !horsJeu(r.c)), numerotes, masses: M, u, pointilles: PT });
    // les bouts : un nœud où finit un segment, qui n'a qu'une arête — ou qui touche une borne (un cadre, un rond, un point numéroté, une masse)
    const bouts = [], orphelins = [];
    G.noeuds.forEach((n, k) => { if (!n.bouts.length || n.point) return; if (horsJeu(n.p)) return;
      const e = n.aretes[0], autre = e ? G.noeuds[e.a === k ? e.b : e.a].p : null, d = autre ? (() => { const v = [n.p[0] - autre[0], n.p[1] - autre[1]], L = Math.hypot(...v) || 1; return [v[0] / L, v[1] / L]; })() : null;
      const r = resoudre(n.p, d);
      if (r && (r.repere || r.renvoi)) { if (n.deg > 1 && r.genre === 'texte') return; bouts.push({ n: k, p: n.p, ...r }); }
      else if (n.deg === 1) orphelins.push({ n: k, p: n.p, raison: r ? 'bout sans repère (' + (r.borne ? 'borne ' + r.borne : r.genre) + ')' : 'trait qui n’arrive nulle part' }); });
    // les réseaux : les composantes connexes
    const U = unions(G.noeuds.length); G.aretes.forEach(e => U.u(e.a, e.b));
    const reseaux = new Map(); bouts.forEach(b => { const r = U.f(b.n); (reseaux.get(r) || reseaux.set(r, { bouts: [], longueur: 0 }).get(r)).bouts.push(b); });
    G.aretes.forEach(e => { const R = reseaux.get(U.f(e.a)); if (R) R.longueur += e.L; });
    // les orphelins comptent dans un réseau qui a des bouts, ou dans un long trait seul
    const longueurs = new Map(); G.aretes.forEach(e => { const r = U.f(e.a); longueurs.set(r, (longueurs.get(r) || 0) + e.L); });
    const orph = orphelins.filter(o => reseaux.has(U.f(o.n)) || (longueurs.get(U.f(o.n)) || 0) > 6 * u).map(o => ({ p: o.p, raison: o.raison }));
    // les mots posés sur un trait : un type de câble (DR20), un numéro de fil (W-012)
    const GS = grille(3 * u); G.aretes.forEach(e => { const a = G.noeuds[e.a].p, b = G.noeuds[e.b].p; GS.ajouter(e, Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])); });
    const surTrait = new Map();   // arête -> { type, fil }
    motsLus.forEach(m => { if (m.partie && !estType(m.s) && !RE_FIL.test(m.s)) return; const type = estType(m.s), fil = RE_FIL.test(m.s); if (!type && !fil) return;
      let best = null, bd = 1.3 * u; GS.chercher(m.c[0] - 1.5 * u, m.c[1] - 1.5 * u, m.c[0] + 1.5 * u, m.c[1] + 1.5 * u).forEach(e => { const q = proj(m.c, G.noeuds[e.a].p, G.noeuds[e.b].p); if (q.d < bd) { bd = q.d; best = e; } });
      if (best) { const o = surTrait.get(best) || {}; if (type) o.type = m.s; if (fil) o.fil = m.s; o.mots = [...(o.mots || []), m]; surTrait.set(best, o); } });
    // les liaisons
    const liaisons = [], renvois = [], pointAretes = e => [G.noeuds[e.a].p, G.noeuds[e.b].p];
    reseaux.forEach(R => { let B = R.bouts;
      // un même bout lu deux fois (les deux barres d'une masse, une borne dessinée deux fois) n'en fait qu'un
      const vus = new Map(); B = B.filter(b => { if (b.genre === 'renvoi') return true; const k = b.repere + '\u0001' + b.borne; if (vus.has(k)) return false; vus.set(k, b); return true; });
      const multi = B.length > 2, enT = false;
      arbre(B, G.noeuds).forEach(q => { const x = B[q.i], y = B[q.j];
        if (x.genre === 'renvoi' || y.genre === 'renvoi') { renvois.push({ x, y, d: q.d, trajet: q.trajet.map(pointAretes) }); return; }
        if (x.repere === y.repere && x.borne === y.borne) return;
        const info = q.trajet.map(e => surTrait.get(e)).filter(Boolean), type = (info.find(o => o.type) || {}).type || '', fil = (info.find(o => o.fil) || {}).fil || '';
        const jT = q.trajet.some(e => G.noeuds[e.a].sortes.has(1) && !G.noeuds[e.a].point || G.noeuds[e.b].sortes.has(1) && !G.noeuds[e.b].point);
        const conf = Math.min(x.conf, y.conf) * (multi ? 0.95 : 1) * (jT ? 0.92 : 1);
        // dans le sens de lecture : de gauche à droite, puis de haut en bas
        const [g, d] = (x.p[0] < y.p[0] - 0.5 * u || (Math.abs(x.p[0] - y.p[0]) <= 0.5 * u && x.p[1] <= y.p[1])) ? [x, y] : [y, x];
        const raisons = [multi ? 'réseau à ' + B.length + ' bouts : relié de proche en proche' : 'trait suivi de bout en bout', ...(jT ? ['jonction en T sans point'] : []), ...g.raisons.map(r => 'de : ' + r), ...d.raisons.map(r => 'vers : ' + r)];
        liaisons.push({ de: g.repere, borneDe: g.borne, pnDe: g.pn || '', vers: d.repere, borneVers: d.borne, pnVers: d.pn || '', type, cable: fil, conf: Math.round(conf * 100) / 100, raisons,
          trajet: q.trajet.map(pointAretes), bouts: [g.p, d.p], mots: [...g.mots, ...d.mots, ...info.flatMap(o => o.mots || [])].map(m => m.B) }); }); });
    // les shunts d'une barrette : ses bornes sur un même pointillé sont au même potentiel, de proche en proche (dans l'ordre des numéros)
    barrettes.forEach(b => { if (!b.nom) return; const nums = [...new Set(b.sur.map(n => n.mot.s))].sort((x, y) => (parseFloat(x) - parseFloat(y)) || x.localeCompare(y)); const ou = s => b.sur.find(n => n.mot.s === s);
      for (let i = 1; i < nums.length; i++) { const A = ou(nums[i - 1]), Bn = ou(nums[i]);
        liaisons.push({ de: b.nom.s, borneDe: nums[i - 1], pnDe: '', vers: b.nom.s, borneVers: nums[i], pnVers: '', type: '', cable: '', conf: 0.9, raisons: ['shunt : bornes ' + nums[i - 1] + ' et ' + nums[i] + ' sur le même pointillé de ' + b.nom.s],
          trajet: [[A.c, Bn.c]], bouts: [A.c, Bn.c], mots: [A.mot.B, Bn.mot.B, b.nom.B] }); } });
    // une barrette à poser (VT1, la convention de Volta) : ses bornes 2, 3… reviennent sur la borne que la 1 dédouble
    replierBarrettesAPoser(liaisons);
    // lu sur un scan : les textes viennent de l'OCR, les traits de l'image — une confiance plus basse, toujours à relire
    if (P.scan) liaisons.forEach(l => { l.conf = Math.round(l.conf * 0.75 * 100) / 100; l.raisons.unshift('lu sur un scan : les textes par l’OCR, les traits sur l’image'); });
    // les bornes sans trait : un numéro écrit contre le bord d'un cadre, que rien n'a pris
    const pris = new Set(liaisons.flatMap(l => l.mots)); bouts.forEach(b => b.mots.forEach(m => pris.add(m.B)));
    const bornesSeules = [];
    T.cadres.forEach(k => { if (k.cadre || k.cartouche || (k.reperes || []).length > 2) return; (k.mots || []).forEach(m => { if (m.partie || !estBorne(m.s) || pris.has(m.B) || horsJeu(m.c)) return;
      if (Math.min(m.c[0] - k.x0, k.x1 - m.c[0], m.c[1] - k.y0, k.y1 - m.c[1]) < 1.5 * u && !numerotes.some(n => n.mot === m)) { const A = cadreRepere(k, T.cadres); bornesSeules.push({ p: m.c, B: m.B, texte: m.s, repere: A }); } }); });
    return { page, u, mots: motsLus, tousMots: mots, liaisons, renvois, orphelins: orph, bornesSeules, champs: C.champs, zoneCartouche: C.zone,
      debug: { traits: traits.length, cadres: T.cadres.length, ronds: T.ronds.length, points: T.points.length, pointilles: PT.length, masses: M.length, bouts: bouts.length, enT: G.nT, aretes: G.aretes.length } }; }
  // le repère d'un cadre ou de son voisin collé (pour dire à qui est une borne sans trait)
  function cadreRepere(k, cadres) { const r = (k.reperes || [])[0] || (k.mots || []).find(m => m.devine); if (r) return r.s; const v = cadres.find(j => j !== k && !j.cadre && (j.reperes || []).length === 1 && k.x0 <= j.x1 + 1 && j.x0 <= k.x1 + 1 && k.y0 <= j.y1 + 1 && j.y0 <= k.y1 + 1); return v ? v.reperes[0].s : ''; }

  /* Une barrette à poser (VTn : le nom que Volta donne à une borne d'équipement qui reçoit plusieurs fils) : le fil de
     la borne 1 vient de la borne dédoublée ; chaque fil des bornes 2, 3… en part en vérité. On le replie comme le
     moteur (01, `sansBarrettesAPoser`) : la liaison de la 1 et les shunts disparaissent, les autres retrouvent la borne. */
  function replierBarrettesAPoser(L) { const source = new Map();
    L.forEach(l => { [[l.de, l.borneDe, l.vers, l.borneVers, l.pnVers], [l.vers, l.borneVers, l.de, l.borneDe, l.pnDe]].forEach(([r, b, o, ob, opn]) => { if (VT_A_POSER.test(r) && b === '1' && !VT_A_POSER.test(o) && o) source.set(r, [o, ob, opn, l]); }); });
    if (!source.size) return L;
    for (let i = L.length - 1; i >= 0; i--) { const l = L[i], a = source.get(l.de), b = source.get(l.vers);
      if ((a && a[3] === l) || (b && b[3] === l) || (a && b)) { L.splice(i, 1); continue; }
      if (a) { l.de = a[0]; l.borneDe = a[1]; l.pnDe = a[2]; l.raisons.push('barrette à poser repliée sur ' + a[0] + ':' + a[1]); l.trajet = [...a[3].trajet, ...l.trajet]; }
      if (b) { l.vers = b[0]; l.borneVers = b[1]; l.pnVers = b[2]; l.raisons.push('barrette à poser repliée sur ' + b[0] + ':' + b[1]); l.trajet = [...b[3].trajet, ...l.trajet]; } }
    return L; }

  /* ---- 8. LE DOCUMENT : une page, un folio ; les renvois relient les folios ---------------------------------------
     `pages` : [{ largeur, hauteur, vt, items, fn, args, OPS }]. Rend { pages: [lecture de chaque page], liaisons (toutes,
     avec leur page et leur folio), scanne (les pages sans texte) }. */
  function lireDocument(pages) { return assembler(pages.map(lirePage)); }
  /* Les pages lues une à une (l'interface les lit au fil de l'eau, sans figer l'écran) → le document. */
  function assembler(lues) { lues.forEach((r, i) => { r.index = i; });
    const docNum = (lues.find(r => r.champs && r.champs.numero) || {}).champs, numero = docNum ? docNum.numero : '';
    const indice = ((lues.find(r => r.champs && r.champs.indice) || {}).champs || {}).indice || '';
    const harness = ((lues.find(r => r.champs && r.champs.harness) || {}).champs || {}).harness || '';
    // le folio : celui du cartouche, sinon le rang de la page ; le dessin (FWD) : le numéro du document et le folio — une page,
    // un folio de Volta
    lues.forEach((r, i) => { const f = (r.champs && r.champs.folioNum) || String(i + 1); r.folio = f;
      r.plan = numero ? numero + (lues.length > 1 ? ' F' + f : '') : f; });
    const tout = [];
    lues.forEach((r, i) => r.liaisons.forEach(l => { tout.push({ ...l, page: i, folio: r.folio, plan: r.plan, fwd: r.plan, harness }); }));
    // les renvois : un bout « vers le folio 3 » sur le folio 1 répond à un bout « vers le folio 1 » (ou « du folio 1 ») sur le folio 3 ;
    // plusieurs candidats : dans l'ordre de lecture (de haut en bas), la zone quand elle est écrite
    const R = []; lues.forEach((r, i) => r.renvois.forEach(q => { const [rv, autre] = q.x.genre === 'renvoi' ? [q.x, q.y] : [q.y, q.x]; if (autre.genre === 'renvoi') return; R.push({ i, rv: rv.renvoi, bout: autre, q, p: rv.p }); }));
    const pageDuFolio = f => lues.findIndex(r => r.folio === String(f));
    const pris = new Set();
    R.sort((a, b) => a.i - b.i || a.p[1] - b.p[1] || a.p[0] - b.p[0]).forEach(a => { if (pris.has(a)) return; const j = pageDuFolio(a.rv.folio); if (j < 0 || j === a.i) return;
      const c = R.filter(b => !pris.has(b) && b !== a && b.i === j && String(b.rv.folio) === lues[a.i].folio);
      if (!c.length) return; const b = c.find(x => a.rv.zone && x.rv.zone && zoneDe(lues[j], x.p) === a.rv.zone.toUpperCase()) || c[0]; pris.add(a); pris.add(b);
      const [g, d] = [a.bout, b.bout]; if (g.repere === d.repere && g.borne === d.borne) return;
      tout.push({ de: g.repere, borneDe: g.borne, pnDe: g.pn || '', vers: d.repere, borneVers: d.borne, pnVers: d.pn || '', type: '', cable: '', conf: Math.round(Math.min(g.conf, d.conf) * 0.88 * 100) / 100,
        raisons: ['renvoi : folio ' + lues[a.i].folio + ' → folio ' + lues[j].folio + ' (' + a.rv.texte + ')', ...g.raisons.map(r => 'de : ' + r), ...d.raisons.map(r => 'vers : ' + r)],
        trajet: a.q.trajet, bouts: [g.p, a.p], mots: g.mots.map(m => m.B), page: a.i, pageVers: j, trajetVers: b.q.trajet, boutsVers: [b.p, d.p], folio: lues[a.i].folio, plan: lues[a.i].plan, fwd: lues[a.i].plan, harness }); });
    return { pages: lues, liaisons: tout, scannees: lues.filter(r => r.scanne).length, numero, indice, harness }; }
  // la zone d'un point sur une feuille à repères de zone (les chiffres en haut, les lettres à gauche) : « C4 »
  function zoneDe(r, p) { const M = r.tousMots || r.mots || []; const col = M.filter(m => /^\d{1,2}$/.test(m.s) && m.c[1] < r.page.h * 0.06), lig = M.filter(m => /^[A-Z]$/.test(m.s) && m.c[0] < r.page.w * 0.04);
    const pc = col.sort((a, b) => Math.abs(a.c[0] - p[0]) - Math.abs(b.c[0] - p[0]))[0], pl = lig.sort((a, b) => Math.abs(a.c[1] - p[1]) - Math.abs(b.c[1] - p[1]))[0]; return (pl ? pl.s : '') + (pc ? pc.s : ''); }

  return { lireDocument, lirePage, assembler, motsDesTextes, formesDesOperateurs, estRepere, estBorne, estPN, estType, renvoiDe, replierBarrettesAPoser, mm };
})();
/* Le point d'entrée : les pages telles que 08-pdf les a lues avec pdf.js → la lecture du document. */
function lireSchemaPdf(pages) { return SCHEMA_PDF.lireDocument(pages); }
