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
    // (passe 87) chaque segment sait s'il vient d'une courbe (`courbes[i]` : de pts[i-1] à pts[i]) : un arc fait de cordes
    // seulement (l'arc d'un disjoncteur) reste un symbole, quelle que soit la longueur de ses cordes
    function construire(ops, c) { let k = 0;
      const nouveau = p => { cur = { pts: [p], ferme: false, courbe: false, courbes: [false] }; chemin.push(cur); };
      const vers = (x, y) => { const p = app(ctm, x, y); if (!cur) nouveau(p); else { cur.pts.push(p); cur.courbes.push(false); } u = [x, y]; };
      const bezier = (x1, y1, x2, y2, x3, y3) => { if (!u) { vers(x3, y3); return; } const [x0, y0] = u; if (!cur) nouveau(app(ctm, x0, y0)); cur.courbe = true;
        for (let s = 1; s <= 8; s++) { const t = s / 8, m = 1 - t; cur.pts.push(app(ctm, m * m * m * x0 + 3 * m * m * t * x1 + 3 * m * t * t * x2 + t * t * t * x3, m * m * m * y0 + 3 * m * m * t * y1 + 3 * m * t * t * y2 + t * t * t * y3)); cur.courbes.push(true); } u = [x3, y3]; };
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
      const entier = mot(s, o, w); out.push(entier);
      // une ligne de plusieurs mots : chacun, à sa place estimée (la police est supposée à chasse égale) ; il sait sa ligne entière
      const parts = s.split(/\s+/); if (parts.length > 1 && parts.length < 8) { let k = 0; const par = w / s.length;
        for (const p of parts) { const i = s.indexOf(p, k); out.push({ ...mot(p, [o[0] + u[0] * par * i, o[1] + u[1] * par * i], par * p.length), partie: true, ligne: entier }); k = i + p.length; } } }
    return out; }
  // ce qu'un mot est
  const RE_BORNE = /^(?:[A-Z]{1,2}[-.]?)?\d{1,3}[A-Z]?$|^[A-Z]{1,2}$|^[A-Z]{1,2}\d{1,2}[A-Z]$/;
  const RE_TYPE = /^(?:DR|DW|ML[A-D]?|BN|AD[B-E]?|DG|GPB|KC|KD|KL|YV|X[EFKYD]|W[SHLMNFWCGKP]|HE|AM|LE|KQ|KR|DH|VN[B-D]?|CF|SPA|PB)\d{1,2}[A-Z]?$/;
  const RE_PN = /^(?:EN|MS|NSA|ABS|ASNE|E\d{3,}|M\d{3,}|D38999|MIL|AS\d|SAE|NAS|NSA|DMC|M8\d{3})[\w\-/.,*]{3,}$|^\*?\d{3}[A-Z]\d{4,}/;
  // les flèches d'un renvoi (« ›F3 » : le renvoi « ▷F3 » de VOLTA, écrit dans un PDF en WinAnsi — 08-pdf-dossier)
  const FLECHES = '→|->|>|▷|►|⇨|⇒|›|»|←|<-|◁|◄|⇦|⇐|‹|«', RE_FLECHE = new RegExp('^\\s*(' + FLECHES + ')'), RE_RETOUR = /^\s*(←|<-|◁|◄|⇦|⇐|‹|«)/;
  const RE_RENVOI = new RegExp('^(?:' + FLECHES + ')?\\s*(?:F(?:OLIO|°|\\.)?\\s*)?(\\d{1,3})\\s*(?:[\\/.]\\s*([A-Z]?\\d{0,2}[A-Z]?))?$', 'i');
  const RE_FIL = /^W[-_]?\d{1,5}[A-Z]?$/i;
  // un numéro de plan (« SC-4520-320 ») : des groupes de lettres et de chiffres liés par des tirets, au moins quatre chiffres
  const RE_PLAN = /^(?=(?:[^\d]*\d){4})[A-Z0-9]{1,6}(?:-[A-Z0-9]{1,8}){1,4}$/;
  // un repère n'a pas d'espace (« 10 A », le calibre écrit près d'un disjoncteur, n'en est pas un)
  // (passe 87) ni un code d'une seule lettre, sauf la masse (901G) : « 51A » est le contact A du module 51 d'une barrette — la
  // convention de VOLTA, 667VT2:51B —, « 10A » le calibre d'un disjoncteur écrit sans espace
  function estRepere(s) { if (!s || s.length < 3 || s.length > 14 || /\s/.test(s)) return false; if (VT_A_POSER.test(s)) return true;
    const q = lireRepere(s); if (!q || !q.num) return false; if (q.code.length > 4) return false;
    if (q.code.length === 1 && !(CODES[q.code] && CODES[q.code].forme === 'masse')) return false;
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
    const traits = [], cadres = [], ronds = [], points = [], pieces = [], fleches = [], arcs = [], gelules = [];
    for (const F of formes) for (const sp of F.sp) { const pts = sp.pts; if (pts.length < 2) continue;
      const B = boiteDe(pts), w = B.x1 - B.x0, h = B.y1 - B.y0, ferme = sp.ferme || (pts.length > 3 && dist(pts[0], pts[pts.length - 1]) < 0.05 * u);
      if (F.plein && !clair(F.cf)) {
        if (ferme && sp.courbe && Math.max(w, h) < 1.8 * u) { const R = rondeur(pts); if (R.ecart < 0.12 && Math.abs(w - h) < 0.25 * Math.max(w, h)) { points.push({ c: R.c, r: R.r }); continue; } }
        // (passe 87) un TIRET à bouts ronds, peint plein (un pointillé que le PDF dessine morceau par morceau) : un morceau de pointillé
        if (ferme && sp.courbe && Math.min(w, h) < 0.45 * u && Math.max(w, h) < 3 * u && Math.max(w, h) > 1.2 * Math.min(w, h)) { const e = Math.min(w, h), cy = (B.y0 + B.y1) / 2, cx = (B.x0 + B.x1) / 2;
          const [a, b] = w >= h ? [[B.x0 + e / 2, cy], [B.x1 - e / 2, cy]] : [[cx, B.y0 + e / 2], [cx, B.y1 - e / 2]]; pieces.push({ a, b, L: Math.max(dist(a, b), 1e-3), e }); continue; }
        // (passe 87) une GÉLULE pleine (un rectangle aux bouts ronds, plus large que haut) : la pastille d'une barrette où « 51A » est écrit
        if (ferme && sp.courbe && Math.max(w, h) < 4 * u && Math.min(w, h) < 1.6 * u && Math.max(w, h) > 1.25 * Math.min(w, h)) { gelules.push({ c: [(B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2], B, r: Math.min(w, h) / 2 }); continue; }
        if (ferme && !sp.courbe && (pts.length === 4 || (pts.length === 5 && dist(pts[0], pts[4]) < 0.05 * u))) { const q = pts.slice(0, 4), l1 = dist(q[0], q[1]), l2 = dist(q[1], q[2]);
          const [L, e] = l1 >= l2 ? [l1, l2] : [l2, l1]; if (e < 0.6 * u && L > 1.8 * e) { const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
            const [a, b] = l1 >= l2 ? [mid(q[0], q[3]), mid(q[1], q[2])] : [mid(q[0], q[1]), mid(q[2], q[3])]; pieces.push({ a, b, L, e }); continue; } }
        if (ferme && pts.length === 3 || (ferme && pts.length === 4 && dist(pts[0], pts[3]) < 0.05 * u)) { if (Math.max(w, h) < 2 * u) { fleches.push({ pts: pts.slice(0, 3), B }); continue; } } }
      if (!F.trait || clair(F.ct)) continue;
      // (passe 87) un petit triangle fermé, seulement tracé (le contour d'une flèche de renvoi, peint à part de son plein) : une flèche
      if (ferme && !sp.courbe && (pts.length === 3 || (pts.length === 4 && dist(pts[0], pts[3]) < 0.05 * u)) && Math.max(w, h) < 2 * u) { fleches.push({ pts: pts.slice(0, 3), B }); continue; }
      if (ferme) { if (sp.courbe) { const R = rondeur(pts); if (R.ecart < 0.1 && Math.max(w, h) < 2.2 * u) { ronds.push({ c: R.c, r: R.r }); continue; } }
        if (w > 0.5 * u && h > 0.5 * u && aire(pts) > 0.8 * w * h) { cadres.push({ x0: B.x0, y0: B.y0, x1: B.x1, y1: B.y1, lw: F.lw, arrondi: sp.courbe }); continue; }
        if (sp.courbe) { arcs.push(pts); continue; } }
      // un chemin ouvert : ses segments droits sont des traits ; une courbe seule est un symbole (l'arc d'un disjoncteur) ;
      // une courbe ENTRE deux segments droits d'un même chemin, un coude arrondi : ses cordes restent des traits
      if (sp.courbe && pts.length > 2) { let droits = 0; for (let i = 1; i < pts.length; i++) if (!(sp.courbes && sp.courbes[i]) && dist(pts[i - 1], pts[i]) > 0.6 * u) droits++; if (!droits) { arcs.push(pts); continue; } }
      // les cordes minuscules d'une courbe (le pont d'un croisement) se regroupent : aucun morceau ne se perd sous la tolérance
      const q = [pts[0]]; for (let i = 1; i < pts.length; i++) if (dist(q[q.length - 1], pts[i]) > 0.15 * u || i === pts.length - 1) q.push(pts[i]);
      // un sommet au milieu d'un chemin (un coude, le haut d'un pont) n'est pas un bout libre : il ne fait pas de T
      for (let i = 1; i < q.length; i++) if (dist(q[i - 1], q[i]) > 1e-3) traits.push({ a: q[i - 1], b: q[i], lw: F.lw, tiret: !!(F.tirets && F.tirets.some(x => x > 0)), libreA: i === 1 && !ferme, libreB: i === q.length - 1 && !ferme });
      if (ferme && dist(pts[0], pts[pts.length - 1]) > 1e-3) traits.push({ a: pts[pts.length - 1], b: pts[0], lw: F.lw, tiret: !!F.tirets }); }
    return { traits, cadres, ronds, points, pieces, fleches, arcs, gelules }; }

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

  /* (passe 87) LES SYMBOLES DANS LES BOÎTES ne sont pas des fils (le lecteur, 8 novembre 2026 : « les relais et les disjoncteurs
     ont leur symbole dessiné dans la boîte ») : la bobine et la lame d'un relais, le bilame ou l'arc d'un disjoncteur, la croix
     d'un voyant — des traits qui vont du bord de la boîte au symbole, ou qui flottent dedans. Une boîte d'équipement : un cadre
     qui n'est ni la feuille, ni le cartouche, ni une grande zone (plus de deux repères dedans), et qu'un repère nomme (écrit
     dedans, ou contre son bord) ; un trait dont les deux bouts sont dans la boîte (son bord compris) et le milieu franchement
     dedans en fait partie. Le fil, lui, arrive de dehors : un de ses bouts est hors de la boîte. */
  function sansSymboles(traits, boites, u) {
    const G = grille(4 * u), tol = 0.3 * u, gardes = [], symboles = []; boites.forEach(k => G.ajouter(k, k.x0, k.y0, k.x1, k.y1));
    traits.forEach(t => { const m = [(t.a[0] + t.b[0]) / 2, (t.a[1] + t.b[1]) / 2];
      const k = G.chercher(m[0], m[1], m[0], m[1]).find(k => auBord(m, k) < -tol && dedans(t.a, k, tol) && dedans(t.b, k, tol));
      if (k) { symboles.push({ a: t.a, b: t.b, boite: k }); k.symbole = true; } else gardes.push(t); });
    return { gardes, symboles }; }

  /* (passe 87) LES BARRETTES : des PASTILLES SUR UN POINTILLÉ (le lecteur : « une barrette se dessine en pastilles sur un
     pointillé ») — une pastille par contact : pleine, creuse, ou une gélule ; dedans, la lettre du contact, ou le module et la
     lettre (« 51A ») ; quand elle ne dit que la lettre, le numéro du module est écrit au-dessus de sa colonne (ou à côté) ; le
     repère de la barrette au-dessus ou au-dessous (un code VT d'abord) ; le POINTILLÉ relie les contacts d'un même groupe (une
     même plage de métal : ils sont au même potentiel). Un contact se dit comme dans les fichiers du lecteur et dans VOLTA :
     module + lettre, 667VT2:51B. Rend les pastilles { c, r, B (une gélule), mot, borne, repere, conf, raisons } et les groupes
     (les pastilles d'un même pointillé, dans l'ordre où il les relie). */
  const ETIQUETTE_PASTILLE = s => { let m = /^(\d{1,3})([A-Z]{1,2})$/.exec(s); if (m) return { module: m[1], lettre: m[2] }; if (/^[A-Z]{1,2}$/.test(s)) return { lettre: s }; if (/^\d{1,3}$/.test(s)) return { numero: s }; return null; };
  function barrettesDe(o) { const { points, ronds, gelules, PT, GM, u } = o;
    const dansForme = (m, f) => f.B ? dedans(m.c, f.B, 0.1 * u) : dist(m.c, f.c) < f.r * 1.15 + 0.1 * u;
    const motDans = (f, permis) => { const R = (f.B ? Math.max(f.B.x1 - f.B.x0, f.B.y1 - f.B.y0) / 2 : f.r) + u;
      return GM.chercher(f.c[0] - R, f.c[1] - R, f.c[0] + R, f.c[1] + R).filter(m => !m.partie && dansForme(m, f)).map(m => ({ m, e: ETIQUETTE_PASTILLE(m.s.toUpperCase()) })).filter(x => x.e && permis(x.e))
        .sort((a, b) => dist(a.m.c, f.c) - dist(b.m.c, f.c))[0] || null; };
    // 1. les candidates : un disque plein ou une gélule où un nom de contact est écrit ; un rond creux où une lettre (ou « 51A ») est écrite
    const cands = [];
    points.forEach(d => { const x = motDans(d, () => true); if (x) cands.push({ forme: 'disque', c: d.c, r: d.r, mot: x.m, e: x.e, src: d }); });
    gelules.forEach(g => { const x = motDans(g, () => true); if (x) cands.push({ forme: 'gélule', c: g.c, r: g.r, B: g.B, mot: x.m, e: x.e, src: g }); });
    ronds.forEach(r => { const x = motDans(r, e => !e.numero); if (x) cands.push({ forme: 'rond', c: r.c, r: r.r, mot: x.m, e: x.e, src: r }); });
    // 2. les colonnes : les pastilles d'une même verticale, de haut en bas ; leurs grappes (une barrette), leurs modules
    const cols = []; cands.slice().sort((a, b) => a.c[0] - b.c[0]).forEach(p => { const c = cols.find(c => Math.abs(c.x - p.c[0]) < 0.6 * u); if (c) c.ps.push(p); else cols.push({ x: p.c[0], ps: [p] }); });
    const grappes = [];
    cols.forEach(c => { c.ps.sort((a, b) => a.c[1] - b.c[1]); const ecarts = c.ps.slice(1).map((p, k) => p.c[1] - c.ps[k].c[1]), pas = Math.min(...ecarts.filter(e => e > 0.5 * u), 3 * u);
      let g = null, M = null; c.ps.forEach((p, k) => { const e = k ? ecarts[k - 1] : Infinity;
        if (e > 3.2 * pas) { g = { x: c.x, pas, modules: [], ps: [] }; grappes.push(g); M = null; }
        if (!M || e > 1.5 * pas) { M = { ps: [] }; g.modules.push(M); }
        M.ps.push(p); g.ps.push(p); p.module = M; p.grappe = g; }); });
    // 3. le pointillé : les pastilles qu'un même pointillé traverse, ou qu'il relie bout à bout, sont d'un même groupe
    const U = unions(cands.length); cands.forEach((p, i) => { p.i = i; });
    const surLigne = [];
    PT.forEach(t => { const L = dist(t.a, t.b); if (L < 1e-6) return; const v = [(t.b[0] - t.a[0]) / L, (t.b[1] - t.a[1]) / L];
      const sur = cands.filter(p => { const w = [p.c[0] - t.a[0], p.c[1] - t.a[1]], s = w[0] * v[0] + w[1] * v[1], d = Math.abs(w[0] * v[1] - w[1] * v[0]), r = p.B ? Math.min(p.B.x1 - p.B.x0, p.B.y1 - p.B.y0) / 2 : p.r;
        return d < r * 0.6 + 0.2 * u && s > -(r + 0.45 * u) && s < L + r + 0.45 * u; }).map(p => ({ p, s: (p.c[0] - t.a[0]) * v[0] + (p.c[1] - t.a[1]) * v[1] }));
      if (!sur.length) return; sur.forEach(x => { x.p.surPointille = true; }); for (let k = 1; k < sur.length; k++) U.u(sur[0].p.i, sur[k].p.i); surLigne.push({ t, sur }); });
    // un rond creux seul, ni dans une colonne ni sur un pointillé, n'est pas une pastille (la bobine ronde d'un relais, un moteur « M »)
    const garde = p => p.forme !== 'rond' || p.surPointille || p.grappe.ps.filter(q => q.forme === 'rond').length >= 2;
    const pastilles = cands.filter(garde);
    // 4. le numéro du module (une pastille qui ne dit que sa lettre) : un nombre écrit au-dessus de sa colonne, ou à côté
    const pris = new Set();
    grappes.forEach(g => g.modules.forEach(M => { if (!M.ps.some(p => p.e.lettre && !p.e.module)) return; const f = M.ps[0], pas = g.pas;
      const c = GM.chercher(g.x - 3.5 * u, f.c[1] - 2.8 * pas, g.x + 3.5 * u, f.c[1] - 0.2 * pas).filter(m => !m.partie && /^\d{1,3}$/.test(m.s) && !pris.has(m) && m.c[1] < f.c[1] - 0.2 * pas && m.c[1] > f.c[1] - 2.8 * pas && Math.abs(m.c[0] - g.x) < 3.5 * u)
        .sort((a, b) => dist(a.c, [g.x, f.c[1] - pas]) - dist(b.c, [g.x, f.c[1] - pas]));
      if (c[0]) { M.num = c[0]; pris.add(c[0]); } }));
    // 5. le repère de chaque grappe : au-dessus de sa première pastille ou au-dessous de sa dernière, un code VT d'abord
    const etiquettes = new Set(cands.map(p => p.mot));
    grappes.forEach(g => { const h = g.ps[0].c[1], b = g.ps[g.ps.length - 1].c[1], pas = Math.min(g.pas, 1.6 * u), R = 4.5 * u;
      const c = GM.chercher(g.x - R, h - 3.5 * pas - R, g.x + R, b + 3.5 * pas + R).filter(m => !m.partie && !etiquettes.has(m) && estRepere(m.s) && Math.abs(m.c[0] - g.x) < R)
        .map(m => { const dy = m.c[1] < h ? h - m.c[1] : m.c[1] > b ? m.c[1] - b : 0, vt = /VT/i.test((lireRepere(m.s) || {}).code || '') || VT_A_POSER.test(m.s); return { m, d: Math.hypot(m.c[0] - g.x, dy), vt }; })
        .filter(o => o.d < 3.5 * pas + R).sort((a, b) => (b.vt - a.vt) || a.d - b.d);
      g.repere = c[0] ? c[0].m : null; g.vt = !!(c[0] && c[0].vt); });
    // 6. chaque pastille : son nom de contact (module + lettre), son repère, sa confiance
    pastilles.forEach(p => { const g = p.grappe, M = p.module, e = p.e;
      let borne = '', dit = '', conf = 0.97;
      if (e.module) { borne = e.module + e.lettre; dit = 'contact ' + borne + ' écrit dans sa pastille'; }
      else if (e.lettre && M.num) { borne = M.num.s + e.lettre; dit = 'contact ' + e.lettre + ' du module ' + M.num.s + ' (le numéro écrit au-dessus de sa colonne)'; conf = 0.96; }
      else if (e.lettre) { borne = e.lettre; dit = 'contact ' + e.lettre + ', sans numéro de module lisible'; conf = 0.55; }
      else { borne = e.numero; dit = 'borne ' + e.numero + ' écrite dans sa pastille'; conf = 0.96; }
      const rep = g.repere; p.borne = borne; p.repere = rep; p.moduleMot = M.num || null;
      p.conf = conf * (rep ? (g.vt ? 1 : 0.8) : 0.4);
      p.raisons = [dit, rep ? (g.vt ? 'barrette ' : 'repère le plus proche de la barrette : ') + rep.s : 'aucun repère pour cette barrette']; });
    // 7. les groupes : les pastilles d'un même pointillé, dans l'ordre où il les relie
    const groupes = new Map(); surLigne.forEach(({ sur }) => { const ps = sur.filter(x => garde(x.p)); if (ps.length < 2) return; const r = U.f(ps[0].p.i);
      const G = groupes.get(r) || groupes.set(r, { ps: new Map() }).get(r); ps.forEach(x => { if (!G.ps.has(x.p)) G.ps.set(x.p, x.s); }); });
    return { pastilles, groupes: [...groupes.values()].map(G => [...G.ps.keys()].sort((a, b) => a.c[1] - b.c[1] || a.c[0] - b.c[0])), mots: new Set([...pastilles.map(p => p.mot), ...pris]) }; }

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
    const { mots, cadres, ronds, pastilles, masses: M, u } = ctx;
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
    /* (passe 87) Le renvoi d'un dossier de plusieurs plans (le folio recommence à 1 à chaque plan) : vers un autre plan, son numéro
       est écrit devant (« SC-4520-320 F12/B4 ») — dans la même ligne, ou juste à gauche. Le nom du signal, au-dessus. */
    const planDuRenvoi = m => { if (m.ligne) { const t = m.ligne.s.split(/\s+/), i = t.indexOf(m.s); if (i > 0 && RE_PLAN.test(t[i - 1])) return t[i - 1]; }
      const g = motsPres(m.c, 8 * u).filter(w => !w.partie && w !== m && w !== m.ligne && Math.abs(w.o[1] - m.o[1]) < 0.35 * m.h && w.B.x1 <= m.B.x0 + 0.2 * u && m.B.x0 - w.B.x1 < 1.6 * m.h && RE_PLAN.test(w.s)).sort((a, b) => b.B.x1 - a.B.x1)[0];
      return g ? g.s : ''; };
    const signalDuRenvoi = m => { const B = m.ligne ? m.ligne.B : m.B, c = motsPres([(B.x0 + B.x1) / 2, B.y0], 3 * u).filter(w => !w.partie && w !== m && w !== m.ligne && w.c[1] < B.y0 && B.y0 - w.c[1] < 2.2 * u && w.B.x1 > B.x0 - 2 * u && w.B.x0 < B.x1 + 2 * u && !renvoiDe(w.s) && !estBorne(w.s) && !estType(w.s))
        .sort((a, b) => (B.y0 - a.c[1]) - (B.y0 - b.c[1]))[0]; return c ? c.s.replace(/\s+/g, ' ').trim() : ''; };
    const leRenvoi = m => ({ ...renvoiDe(m.s), texte: m.ligne && planDuRenvoi(m) ? m.ligne.s : m.s, plan: planDuRenvoi(m), signal: signalDuRenvoi(m) });

    /* Un bout { p, d (le sens où le trait arrive) } → { repere, borne, pn, genre, conf, raisons, mots (les textes lus,
       pour les surligner) } ou null. */
    return function resoudre(p, d) {
      const R = [], vus = [];
      // une masse
      for (const g of M) if (dist(g.attache, p) < 0.5 * u) { const nom = repereLePlusProche(g.attache, 4 * u) || null;
        const pref = nom && /G$/i.test((lireRepere(nom.m.s) || {}).code || '') ? 0.97 : nom ? 0.85 : 0.5; if (nom) vus.push(nom.m);
        return { genre: 'masse', repere: nom ? nom.m.s : 'MASSE', borne: '', pn: '', conf: pref, raisons: [nom ? 'masse ' + nom.m.s : 'masse sans repère écrit'], mots: vus, B: g.B }; }
      // une pastille de barrette : son contact (module + lettre), le repère de sa barrette
      for (const n of pastilles) if (n.B ? auBord(p, n.B) < 0.35 * u : dist(n.c, p) < n.r + 0.3 * u) { vus.push(n.mot); if (n.repere) vus.push(n.repere); if (n.moduleMot) vus.push(n.moduleMot);
        return { genre: 'pastille', repere: n.repere ? n.repere.s : '', borne: n.borne, pn: '', conf: n.conf, raisons: n.raisons.slice(), mots: vus }; }
      // un rond : la borne d'un disjoncteur
      for (const r of ronds) if (dist(r.c, p) < r.r + 0.25 * u) { const b = borneDe(r.c, null, null, 2.6 * u), rep = repereLePlusProche(r.c, 7 * u);
        if (b) vus.push(b.m); if (rep) vus.push(rep.m);
        return { genre: 'rond', repere: rep ? rep.m.s : '', borne: b ? b.m.s : '', pn: '', conf: (b ? 0.95 : 0.6) * (rep ? (rep.d < 4 * u ? 1 : 0.85) : 0.4), raisons: [b ? 'borne ronde ' + b.m.s + ', son numéro à ' + dixieme(mm(b.d)) + ' mm' : 'borne ronde sans numéro', rep ? 'repère ' + rep.m.s + ' à côté' : 'aucun repère autour'], mots: vus }; }
      // un renvoi vers un autre folio
      const rv = renvoiPres(p, d); if (rv && !cadres.some(k => !grand(k) && auBord(p, k) < 0.3 * u && !k.mots.includes(rv.m))) { vus.push(rv.m); const r = leRenvoi(rv.m);
        return { genre: 'renvoi', renvoi: r, repere: '', borne: '', conf: 0.9, raisons: ['renvoi ' + r.texte], mots: vus }; }
      // un cadre touché : le plus petit dont le bord passe au bout
      const touches = GC.chercher(p[0] - 0.4 * u, p[1] - 0.4 * u, p[0] + 0.4 * u, p[1] + 0.4 * u).filter(k => !grand(k) && Math.abs(auBord(p, k)) < 0.35 * u).sort((a, b) => a.aire - b.aire);
      if (touches.length) { const k = touches[0], A = assemblage(k);
        // un renvoi dans une pastille (le jeton « ▷F3 » d'un folio découpé)
        const rvk = k.mots.find(m => renvoiDe(m.s)); if (rvk && !repereDuCadre(k)) { vus.push(rvk); const r = leRenvoi(rvk); return { genre: 'renvoi', renvoi: r, repere: '', borne: '', conf: 0.9, raisons: ['renvoi ' + r.texte], mots: vus }; }
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
    const GM = grille(3 * u); motsLus.forEach(m => GM.ajouter(m, m.B.x0, m.B.y0, m.B.x1, m.B.y1));
    // (passe 87) les symboles dessinés dans les boîtes (la bobine et la lame d'un relais, le bilame d'un disjoncteur) ne sont pas
    // des fils : une boîte qu'un repère nomme, dedans ou contre son bord
    T.cadres.forEach(k => { k.mots = GM.chercher(k.x0, k.y0, k.x1, k.y1).filter(m => dedans(m.c, k)); k.reperes = k.mots.filter(m => estRepere(m.s)); });
    const nommee = k => { if (k.cadre || k.cartouche || k.reperes.length > 2 || (k.x1 - k.x0) * (k.y1 - k.y0) > 0.3 * page.w * page.h) return false; if (k.reperes.length) return true;
      return GM.chercher(k.x0 - 2.5 * u, k.y0 - 2.5 * u, k.x1 + 2.5 * u, k.y1 + 2.5 * u).some(m => !m.partie && estRepere(m.s) && auBord(m.c, k) < 2.2 * u && auBord(m.c, k) > -0.2 * u); };
    const SB = sansSymboles(traits, T.cadres.filter(nommee), u); traits = SB.gardes;
    // les barrettes : des pastilles sur un pointillé (le contact : module + lettre) ; les autres disques pleins sont des jonctions,
    // les autres ronds creux, des bornes rondes (un disjoncteur)
    const BR = barrettesDe({ points: T.points.filter(d => !horsJeu(d.c)), ronds: T.ronds.filter(r => !horsJeu(r.c)), gelules: T.gelules.filter(g => !horsJeu(g.c)), PT, GM, u });
    const sources = new Set(BR.pastilles.map(p => p.src)), jonctions = T.points.filter(d => !horsJeu(d.c) && !sources.has(d));
    // le graphe ; les ronds et les pastilles sont des bornes, pas des jonctions
    const G = graphe(traits, jonctions, u, jeu);
    const resoudre = resolveur({ mots: motsLus.filter(m => !BR.mots.has(m)), cadres: T.cadres, ronds: T.ronds.filter(r => !horsJeu(r.c) && !sources.has(r)), pastilles: BR.pastilles, masses: M, u, pointilles: PT });
    // les bouts : un nœud où finit un segment, qui n'a qu'une arête — ou qui touche une borne (un cadre, un rond, un point numéroté, une masse)
    const bouts = [], orphelins = [];
    G.noeuds.forEach((n, k) => { if (!n.bouts.length || n.point) return; if (horsJeu(n.p)) return;
      const e = n.aretes[0], autre = e ? G.noeuds[e.a === k ? e.b : e.a].p : null, d = autre ? (() => { const v = [n.p[0] - autre[0], n.p[1] - autre[1]], L = Math.hypot(...v) || 1; return [v[0] / L, v[1] / L]; })() : null;
      const r = resoudre(n.p, d);
      // (passe 87) un renvoi, comme un texte, ne se lit qu'au BOUT d'un fil : un coude qui passe près d'un drapeau n'y arrive pas
      if (r && (r.repere || r.renvoi)) { if (n.deg > 1 && (r.genre === 'texte' || r.genre === 'renvoi')) return; bouts.push({ n: k, p: n.p, ...r }); }
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
        const info = q.trajet.map(e => surTrait.get(e)).filter(Boolean), type = (info.find(o => o.type) || {}).type || '', fil = (info.find(o => o.fil) || {}).fil || '';
        // une moitié de câble finie par un renvoi : son type et son numéro de fil servent à l'apparier (08 : `assembler`)
        if (x.genre === 'renvoi' || y.genre === 'renvoi') { renvois.push({ x, y, d: q.d, trajet: q.trajet.map(pointAretes), type, fil, mots: info.flatMap(o => o.mots || []) }); return; }
        if (x.repere === y.repere && x.borne === y.borne) return;
        const jT = q.trajet.some(e => G.noeuds[e.a].sortes.has(1) && !G.noeuds[e.a].point || G.noeuds[e.b].sortes.has(1) && !G.noeuds[e.b].point);
        const conf = Math.min(x.conf, y.conf) * (multi ? 0.95 : 1) * (jT ? 0.92 : 1);
        // dans le sens de lecture : de gauche à droite, puis de haut en bas
        const [g, d] = (x.p[0] < y.p[0] - 0.5 * u || (Math.abs(x.p[0] - y.p[0]) <= 0.5 * u && x.p[1] <= y.p[1])) ? [x, y] : [y, x];
        const raisons = [multi ? 'réseau à ' + B.length + ' bouts : relié de proche en proche' : 'trait suivi de bout en bout', ...(jT ? ['jonction en T sans point'] : []), ...g.raisons.map(r => 'de : ' + r), ...d.raisons.map(r => 'vers : ' + r)];
        liaisons.push({ de: g.repere, borneDe: g.borne, pnDe: g.pn || '', vers: d.repere, borneVers: d.borne, pnVers: d.pn || '', type, cable: fil, conf: Math.round(conf * 100) / 100, raisons,
          trajet: q.trajet.map(pointAretes), bouts: [g.p, d.p], mots: [...g.mots, ...d.mots, ...info.flatMap(o => o.mots || [])].map(m => m.B) }); }); });
    // les pontages d'une barrette : ses contacts sur un même pointillé sont au même potentiel, de proche en proche (dans l'ordre
    // où le pointillé les relie)
    BR.groupes.forEach(ps => { for (let i = 1; i < ps.length; i++) { const A = ps[i - 1], Bn = ps[i]; if (!A.repere || A.repere !== Bn.repere || A.borne === Bn.borne) continue;
      liaisons.push({ de: A.repere.s, borneDe: A.borne, pnDe: '', vers: Bn.repere.s, borneVers: Bn.borne, pnVers: '', type: '', cable: '', conf: Math.round(Math.min(A.conf, Bn.conf) * 0.97 * 100) / 100,
        raisons: ['pontage : contacts ' + A.borne + ' et ' + Bn.borne + ' sur le même pointillé de ' + A.repere.s + ' (une même plage de métal)', 'de : ' + A.raisons[0], 'vers : ' + Bn.raisons[0]],
        trajet: [[A.c, Bn.c]], bouts: [A.c, Bn.c], mots: [A.mot.B, Bn.mot.B, A.repere.B, ...(A.moduleMot ? [A.moduleMot.B] : [])] }); } });
    // une barrette à poser (VT1, la convention de VOLTA) : ses bornes 2, 3… reviennent sur la borne que la 1 dédouble
    replierBarrettesAPoser(liaisons);
    // lu sur un scan : les textes viennent de l'OCR, les traits de l'image — une confiance plus basse, toujours à relire
    if (P.scan) liaisons.forEach(l => { l.conf = Math.round(l.conf * 0.75 * 100) / 100; l.raisons.unshift('lu sur un scan : les textes par l’OCR, les traits sur l’image'); });
    // les bornes sans trait : un numéro écrit contre le bord d'un cadre, que rien n'a pris
    const pris = new Set(liaisons.flatMap(l => l.mots)); bouts.forEach(b => b.mots.forEach(m => pris.add(m.B)));
    const bornesSeules = [];
    T.cadres.forEach(k => { if (k.cadre || k.cartouche || (k.reperes || []).length > 2) return; (k.mots || []).forEach(m => { if (m.partie || !estBorne(m.s) || pris.has(m.B) || horsJeu(m.c)) return;
      if (Math.min(m.c[0] - k.x0, k.x1 - m.c[0], m.c[1] - k.y0, k.y1 - m.c[1]) < 1.5 * u && !BR.mots.has(m)) { const A = cadreRepere(k, T.cadres); bornesSeules.push({ p: m.c, B: m.B, texte: m.s, repere: A }); } }); });
    return { page, u, mots: motsLus, tousMots: mots, liaisons, renvois, orphelins: orph, bornesSeules, champs: C.champs, zoneCartouche: C.zone,
      debug: { traits: traits.length, cadres: T.cadres.length, ronds: T.ronds.length, points: T.points.length, pointilles: PT.length, masses: M.length, bouts: bouts.length, enT: G.nT, aretes: G.aretes.length, symboles: SB.symboles.length, pastilles: BR.pastilles.length, gelules: T.gelules.length },
      voir: P.voir ? { pastilles: BR.pastilles.map(p => ({ c: p.c, f: p.forme, s: p.mot.s, b: p.borne, r: p.repere && p.repere.s, k: p.conf })), groupes: BR.groupes.map(g => ({ c: g[0].c, b: g.map(p => p.borne).join(' ') })), pointilles: PT.map(t => ({ a: t.a, b: t.b })), symboles: SB.symboles.map(t => ({ a: t.a, b: t.b })) } : undefined }; }
  // le repère d'un cadre ou de son voisin collé (pour dire à qui est une borne sans trait)
  function cadreRepere(k, cadres) { const r = (k.reperes || [])[0] || (k.mots || []).find(m => m.devine); if (r) return r.s; const v = cadres.find(j => j !== k && !j.cadre && (j.reperes || []).length === 1 && k.x0 <= j.x1 + 1 && j.x0 <= k.x1 + 1 && k.y0 <= j.y1 + 1 && j.y0 <= k.y1 + 1); return v ? v.reperes[0].s : ''; }

  /* Une barrette à poser (VTn : le nom que VOLTA donne à une borne d'équipement qui reçoit plusieurs fils) : le fil de
     la borne 1 vient de la borne dédoublée ; chaque fil des bornes 2, 3… en part en vérité. On le replie comme le
     moteur (01, `sansBarrettesAPoser`) : la liaison de la 1 et les shunts disparaissent, les autres retrouvent la borne. */
  function replierBarrettesAPoser(L) { const source = new Map(), premier = new Map();
    // (passe 87) le contact qui reçoit la borne dédoublée : « 1 » (l'écriture d'avant), sinon le premier de sa face — VOLTA nomme les
    // contacts d'une barrette ajoutée comme sa face (« 51H », 09-barrettes `lettresDeBarretteAPoser`) : la borne 1 prend la première lettre
    L.forEach(l => [[l.de, l.borneDe], [l.vers, l.borneVers]].forEach(([r, b]) => { if (!VT_A_POSER.test(r) || !b) return; const p = premier.get(r);
      if (p == null || b === '1' || (p !== '1' && String(b).localeCompare(p, 'fr', { numeric: true }) < 0)) premier.set(r, b); }));
    L.forEach(l => { [[l.de, l.borneDe, l.vers, l.borneVers, l.pnVers], [l.vers, l.borneVers, l.de, l.borneDe, l.pnDe]].forEach(([r, b, o, ob, opn]) => { if (VT_A_POSER.test(r) && b === premier.get(r) && !VT_A_POSER.test(o) && o) source.set(r, [o, ob, opn, l]); }); });
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
    // un folio de VOLTA
    // (passe 87) chaque page : son plan (le numéro de son cartouche : un dossier de plusieurs plans, où le folio recommence à 1 à
    // chaque plan — le lecteur, 8 novembre 2026), son folio
    lues.forEach((r, i) => { const f = (r.champs && r.champs.folioNum) || String(i + 1); r.folio = f; r.numeroPlan = (r.champs && r.champs.numero) || numero;
      r.plan = r.numeroPlan ? r.numeroPlan + (lues.length > 1 ? ' F' + f : '') : f; });
    const tout = [];
    lues.forEach((r, i) => r.liaisons.forEach(l => { tout.push({ ...l, page: i, folio: r.folio, plan: r.plan, fwd: r.plan, harness }); }));
    /* Les RENVOIS (passe 87). Un renvoi dit le folio et la zone de l'autre bout (« F5/C3 ») ; vers un autre plan, le numéro de ce
       plan devant (« SC-4520-320 F5/C3 »). Deux moitiés se répondent quand chacune vise la page de l'autre — le folio qu'elle nomme,
       DANS LE BON PLAN. Entre plusieurs vis-à-vis possibles : la zone écrite de chaque côté doit être celle où se trouve l'autre
       (les deux se vérifient), puis le NUMÉRO DE FIL, quand il est écrit des deux côtés (le même : c'est le même câble), le nom du
       signal ; à égalité, l'ordre de lecture. La confiance le dit : les zones qui se répondent ou le même numéro de fil, sûre ;
       une zone seule, ou un appariement dans l'ordre de lecture, à voir. */
    const R = []; lues.forEach((r, i) => r.renvois.forEach(q => { const [rv, autre] = q.x.genre === 'renvoi' ? [q.x, q.y] : [q.y, q.x]; if (autre.genre === 'renvoi') return;
      R.push({ i, rv: rv.renvoi, bout: autre, q, p: rv.p, fil: q.fil || '', type: q.type || '' }); }));
    R.sort((a, b) => a.i - b.i || a.p[1] - b.p[1] || a.p[0] - b.p[0]); R.forEach((a, k) => { a.k = k; });
    const planDe = i => lues[i].numeroPlan || '', pages = new Map(); lues.forEach((r, i) => { const c = planDe(i) + '\u0001' + r.folio; (pages.get(c) || pages.set(c, []).get(c)).push(i); });
    R.forEach(a => { let js = pages.get((a.rv.plan || planDe(a.i)) + '\u0001' + String(a.rv.folio)) || [];
      if (!js.length && !a.rv.plan) js = lues.map((r, j) => (r.folio === String(a.rv.folio) ? j : -1)).filter(j => j >= 0);   // un plan sans numéro lisible
      a.visees = new Set(js.filter(j => j !== a.i)); });
    const parPage = new Map(); R.forEach(a => { (parPage.get(a.i) || parPage.set(a.i, []).get(a.i)).push(a); });
    const paires = [];
    R.forEach(a => a.visees.forEach(j => (parPage.get(j) || []).forEach(b => { if (b.k <= a.k || !b.visees.has(a.i)) return;
      const za = a.rv.zone ? (zoneDe(lues[b.i], b.p) === a.rv.zone.toUpperCase() ? 1 : -1) : 0, zb = b.rv.zone ? (zoneDe(lues[a.i], a.p) === b.rv.zone.toUpperCase() ? 1 : -1) : 0;
      const nf = a.fil && b.fil ? (a.fil.toUpperCase() === b.fil.toUpperCase() ? 1 : -1) : 0, sg = a.rv.signal && b.rv.signal && a.rv.signal === b.rv.signal ? 1 : 0;
      paires.push({ a, b, za, zb, nf, sg, s: (za > 0 ? 2 : za < 0 ? -3 : 0) + (zb > 0 ? 2 : zb < 0 ? -3 : 0) + (nf > 0 ? 4 : nf < 0 ? -6 : 0) + sg }); })));
    paires.sort((p, q) => q.s - p.s || p.a.k - q.a.k || p.b.k - q.b.k);
    const pris = new Set();
    paires.forEach(P => { const { a, b } = P; if (pris.has(a) || pris.has(b)) return;
      // un autre vis-à-vis aussi bon, encore libre, pour l'un ou pour l'autre : l'appariement n'est qu'un choix
      const rivaux = paires.some(Q => Q !== P && Q.s >= P.s && ((Q.a === a || Q.b === a) && !pris.has(Q.a === a ? Q.b : Q.a) || (Q.a === b || Q.b === b) && !pris.has(Q.a === b ? Q.b : Q.a)));
      pris.add(a); pris.add(b);
      const [g, d] = [a.bout, b.bout]; if (g.repere === d.repere && g.borne === d.borne) return;
      const confirme = P.nf > 0 || (P.za > 0 && P.zb > 0), contre = P.za < 0 || P.zb < 0 || P.nf < 0, demi = !confirme && (P.za > 0 || P.zb > 0);
      const k = contre ? 0.5 : confirme ? 0.97 : demi ? (rivaux ? 0.8 : 0.9) : (rivaux ? 0.6 : 0.85);
      const dit = [...(P.za > 0 && P.zb > 0 ? ['les zones se répondent : ' + a.rv.zone.toUpperCase() + ' et ' + b.rv.zone.toUpperCase()] : P.za > 0 || P.zb > 0 ? ['une seule zone se vérifie'] : []),
        ...(P.nf > 0 ? ['le même numéro de fil des deux côtés : ' + a.fil] : []), ...(contre ? ['une zone ou un numéro de fil ne répond pas'] : []), ...(rivaux && !confirme ? ['plusieurs vis-à-vis possibles : apparié dans l’ordre de lecture'] : [])];
      tout.push({ de: g.repere, borneDe: g.borne, pnDe: g.pn || '', vers: d.repere, borneVers: d.borne, pnVers: d.pn || '', type: a.type || b.type || '', cable: a.fil || b.fil || '', conf: Math.round(Math.min(g.conf, d.conf) * k * 100) / 100,
        raisons: ['renvoi : ' + (planDe(a.i) !== planDe(b.i) ? lues[a.i].plan + ' → ' + lues[b.i].plan : 'folio ' + lues[a.i].folio + ' → folio ' + lues[b.i].folio) + ' (' + a.rv.texte + ')', ...dit, ...g.raisons.map(r => 'de : ' + r), ...d.raisons.map(r => 'vers : ' + r)],
        trajet: a.q.trajet, bouts: [g.p, a.p], mots: g.mots.map(m => m.B), page: a.i, pageVers: b.i, trajetVers: b.q.trajet, boutsVers: [b.p, d.p], folio: lues[a.i].folio, plan: lues[a.i].plan, fwd: lues[a.i].plan, harness }); });
    return { pages: lues, liaisons: tout, scannees: lues.filter(r => r.scanne).length, numero, indice, harness }; }
  // la zone d'un point sur une feuille à repères de zone (les chiffres en haut, les lettres à gauche) : « C4 »
  function zoneDe(r, p) { const M = r.tousMots || r.mots || []; const col = M.filter(m => /^\d{1,2}$/.test(m.s) && m.c[1] < r.page.h * 0.06), lig = M.filter(m => /^[A-Z]$/.test(m.s) && m.c[0] < r.page.w * 0.04);
    const pc = col.sort((a, b) => Math.abs(a.c[0] - p[0]) - Math.abs(b.c[0] - p[0]))[0], pl = lig.sort((a, b) => Math.abs(a.c[1] - p[1]) - Math.abs(b.c[1] - p[1]))[0]; return (pl ? pl.s : '') + (pc ? pc.s : ''); }

  return { lireDocument, lirePage, assembler, motsDesTextes, formesDesOperateurs, estRepere, estBorne, estPN, estType, renvoiDe, replierBarrettesAPoser, mm };
})();
/* Le point d'entrée : les pages telles que 08-pdf les a lues avec pdf.js → la lecture du document. */
function lireSchemaPdf(pages) { return SCHEMA_PDF.lireDocument(pages); }
