/* ===========================================================================
   UX — L'ERGONOME : ce qui se MESURE de l'utilisabilité et de l'accessibilité, écran par écran.
       node tests/ux.js [--fichier=chemin] [--ecrans=plan,menu,…] [--passes=1440-clair,1920-sombre,…]
                        [--captures=dossier] [--fonds=dossier] [--court] [--sans-mouvement | --seulement-mouvement]

   Le lecteur veut un outil « ultra compréhensible, facile d'accès ». Un juge humain se lasse et s'habitue ; celui-ci
   repasse tout, à chaque version, avec des règles chiffrées. En 1440 × 900 et 1920 × 1080, en clair et en sombre, sur
   les écrans principaux (l'accueil, la bibliothèque, une installation, le plan, chaque fiche, la bulle d'un « ? », le
   « ⋯ » d'une fiche, le récapitulatif et chacun de ses onglets, l'index, la recherche, le menu ⋮ et ses sous-menus, la
   feuille des raccourcis, Vos fichiers, Normes, Bible, Hypothèses), il vérifie DANS LA PAGE :

     · LES CONTRASTES (WCAG 1.4.3, 1.4.11) : un texte ≥ 4,5:1, un gros texte (24 px, ou 18,7 px gras) ≥ 3:1, l'icône
       d'un bouton qui n'a qu'une icône ≥ 3:1, le bord d'un champ (ou son fond) ≥ 3:1 sur ce qui l'entoure. Le fond est
       LU À L'ÉCRAN, pas deviné : une capture où tout texte et toute icône sont rendus transparents donne, pixel par
       pixel, ce qui est derrière chaque lettre (le dégradé de la table, le verre des palets, le papier). Un texte éteint
       est jugé comme les autres (DESIGN.md : « Éteint : lisible, 4,5:1, jamais un fantôme ») ;
     · LES CIBLES (WCAG 2.5.8) : tout ce qui se clique et se voit fait au moins 24 × 24 px — mesuré au clic
       (elementFromPoint à ±11,5 px du centre : une zone agrandie par un pseudo-élément compte) ; un lien dans une
       phrase en est exempté. Ce qui fait moins de 32 px (l'idéal sur ordinateur) se compte, sans échouer ;
     · LES NOMS : chaque bouton, lien, onglet, ligne de menu, champ a un nom (son texte, aria-label, aria-labelledby,
       title, une étiquette, ou data-bulle) ; un bouton qui n'a qu'une icône a aussi sa BULLE (un .bulle, data-bulle,
       data-aide ou title) — et, à la souris comme au clavier, cette bulle PARAÎT ;
     · LES TEXTES COUPÉS : un texte coupé (points de suspension, ligne rognée, débordement caché) a une bulle qui le
       donne EN ENTIER (title, data-bulle, aria-label, data-aide de lui ou d'un parent proche) ; deux textes d'un même
       panneau ne se chevauchent pas ;
     · RIEN DE CACHÉ : un élément interactif visible est bien celui que touche un clic en son milieu (elementFromPoint,
       au centre puis en quatre points) — sinon, ce qui le recouvre est nommé ;
     · LE FOCUS : chaque élément qui prend le clavier montre, au :focus-visible, un contour (outline) ou une ombre
       (box-shadow) — sur lui, ses pseudo-éléments ou son parent (:focus-within) — d'au moins 3:1 sur ce qui l'entoure ;
       Tab ne mène jamais à un élément qu'on ne voit pas, et ne sort pas d'une feuille modale ;
     · ÉCHAP ferme ce qui s'ouvre, en un appui (un sous-menu revient d'abord au menu), sans fermer ce qui est dessous, et
       rend le clavier à ce qui l'avait ouvert (jamais à la page) ; un document ouvert par le menu prend le clavier ;
     · LE FOLIO SE LIT : à « 1 » (100 %), sur le folio le plus chargé, chaque sorte d'écriture du dessin (un numéro de
       câble, une borne, un repère) fait au moins 9 px à l'écran (DESIGN.md : « lisibles à 100 % ») ;
     · CE QUI SE LIT COMME UN CHOIX SE CHOISIT : chaque calibre que le cadran d'un disjoncteur écrit — son cran se clique,
       ou « À la main » le propose (le lecteur : « je dois tout pouvoir sélectionner ») ;
     · LE MOUVEMENT RÉDUIT : sous `prefers-reduced-motion: reduce` (emulateMedia), aucune animation ni transition de
       plus de 0,01 s — CSS, Web Animations (`el.animate`), défilement doux, vue du plan qui glisse, table qui respire ;
     · AUCUNE ERREUR de page.

   Ce qui ne dépend pas du thème (une bulle paraît-elle, Tab, Échap, le folio à 100 %, les calibres) se juge une fois
   par largeur ; les encres et les anneaux du focus, à chaque passe ; le mouvement réduit, une fois (une page neuve, un
   enregistreur posé avant le chargement ; sans `reduce`, il en relève plus de cent : il voit bien ce qu'il cherche).

   Chaque défaut est écrit avec son ÉCRAN et son SÉLECTEUR (l'ancêtre à identifiant le plus proche, puis l'élément), un
   défaut par ligne, dédoublonné par passe (les écrans où il paraît sont listés ; les lignes d'une même liste qui ont le
   même défaut n'en font qu'un, « × 3 »). Un contrôle `ok` par règle et par passe ; le résumé final compte les défauts
   distincts, par sorte. Rend 1 tant qu'il reste un défaut : la batterie est le JUGE des corrections, elle n'est pas
   faite pour passer. --court n'écrit que les comptes ; --captures=dossier garde une capture de chaque écran,
   --fonds=dossier celle des fonds (sans texte ni icône) que les contrastes lisent ; --sans-mouvement saute la passe du
   mouvement réduit, --seulement-mouvement ne fait qu'elle. Environ dix minutes.
   =========================================================================== */
const { chromium } = require('playwright');
const zlib = require('zlib'), fs = require('fs'), path = require('path');
const P = require('./pilote');
const FICHIER = P.fichierDemande();
const option = n => { const a = process.argv.find(x => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : null; };
const ECRANS_VOULUS = option('ecrans') ? option('ecrans').split(',') : null;
const PASSES_VOULUES = option('passes') ? option('passes').split(',') : null;
const CAPTURES = option('captures'), FONDS = option('fonds'), COURT = process.argv.includes('--court'), SANS_MOUVEMENT = process.argv.includes('--sans-mouvement'), SEUL_MOUVEMENT = process.argv.includes('--seulement-mouvement');
for (const d of [CAPTURES, FONDS]) if (d) fs.mkdirSync(d, { recursive: true });

const PASSES = [
  { nom: '1440-clair', W: 1440, H: 900, theme: 'light' }, { nom: '1440-sombre', W: 1440, H: 900, theme: 'dark' },
  { nom: '1920-clair', W: 1920, H: 1080, theme: 'light' }, { nom: '1920-sombre', W: 1920, H: 1080, theme: 'dark' }].filter(p => !PASSES_VOULUES || PASSES_VOULUES.includes(p.nom));

/* ---- les couleurs : luminance relative et rapport de contraste (WCAG 2.x) ---------------------------------------- */
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const poser = (fg, bg) => [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3]));   // une encre (r, g, b, a) posée sur un fond
const hex = c => '#' + c.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const rapport = x => x.toFixed(2).replace('.', ',') + ':1';
const mediane = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };

/* ---- lire une capture PNG (8 bits, RVB ou RVBA), sans dépendance : les fonds, pixel par pixel ------------------------ */
function lirePng(buf) {
  let p = 8, w = 0, h = 0, ct = 6; const idat = [];
  while (p < buf.length) { const n = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + n);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; } else if (type === 'IDAT') idat.push(d); else if (type === 'IEND') break; p += 12 + n; }
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : ct === 4 ? 2 : 1, stride = w * bpp, raw = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) { const f = raw[y * (stride + 1)], s = y * (stride + 1) + 1, o = y * stride;
    for (let x = 0; x < stride; x++) { const a = x >= bpp ? px[o + x - bpp] : 0, b = y ? px[o - stride + x] : 0, c = x >= bpp && y ? px[o - stride + x - bpp] : 0; let v = raw[s + x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[o + x] = v & 255; } }
  return { w, h, at(x, y) { x = Math.max(0, Math.min(w - 1, Math.round(x))); y = Math.max(0, Math.min(h - 1, Math.round(y))); const i = y * stride + x * bpp;
    return bpp >= 3 ? [px[i], px[i + 1], px[i + 2]] : [px[i], px[i], px[i]]; } };
}

/* ===========================================================================
   LE SOCLE, DANS LA PAGE (`window.__ux`) : ce qui se lit sans pixels — les textes et leurs encres, les cibles, les noms,
   les bulles, les textes coupés, ce qui est recouvert, le focus. Posé une fois par page.
   =========================================================================== */
function socle() {
  if (window.__ux) return;
  const EXCLU = new Set(['svg', 'table', 'printroot', 'menu-aides']);   // le dessin du plan (il zoome), la table de fond, l'impression, les aides lues par les lecteurs d'écran
  const INTER = 'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=menuitem], [role=menuitemradio], [role=option], [role=checkbox], [role=switch], [role=link], [role=slider], [tabindex]:not([tabindex="-1"])';
  const CHAMP = 'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=color]), select, textarea';
  const norm = s => (s || '').replace(/[   ]/g, ' ').replace(/[’‘]/g, '\'').replace(/[…]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const rgba = s => { const m = /rgba?\(([^)]+)\)/.exec(s || ''); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; };
  // un sélecteur lisible : l'ancêtre à identifiant le plus proche, puis l'élément (sa classe, l'attribut qui le distingue)
  const ATTRS = ['data-act', 'data-sous', 'data-q', 'data-cal', 'data-onglet', 'data-changer', 'data-plan', 'data-install', 'data-id', 'data-dj-geste', 'data-voir', 'data-auto', 'data-portee', 'data-section', 'data-champ', 'data-k', 'data-i', 'aria-label', 'name', 'type'];
  const un = e => { let s = e.tagName.toLowerCase(); if (e.id) return s + '#' + e.id;
    const cls = [...e.classList].filter(c => !/^(on|hl|vise|choisi|entre|fondu|ouvert|fs-entre|fs-allume|survol|lie|ici)$/.test(c)).slice(0, 2); if (cls.length) s += '.' + cls.join('.');
    for (const a of ATTRS) { const v = e.getAttribute(a); if (v != null && v !== '') { s += `[${a}="${v.length > 28 ? v.slice(0, 27) + '…' : v}"]`; break; } } return s; };
  const nom = e => { if (!e || e.nodeType !== 1) return String(e); if (e.id) return '#' + e.id; const ch = [un(e)]; let a = e.parentElement, n = 0;
    while (a && !a.id && n < 2) { if (a.classList.length) ch.unshift(un(a)); a = a.parentElement; n++; }
    while (a && !a.id) a = a.parentElement; return (a ? '#' + a.id + ' ' : '') + ch.join(' > '); };
  const extrait = e => { const t = (e.innerText || e.value || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(); return t.length > 40 ? t.slice(0, 39) + '…' : t; };
  // ce qui se voit : rendu, non transparent (opacité cumulée), visible, et pas rogné en entier par un parent qui coupe
  const opacite = e => { let o = 1; for (let x = e; x && x.nodeType === 1; x = x.parentElement) o *= +getComputedStyle(x).opacity; return o; };
  const masque = e => { for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const s = getComputedStyle(x); if ((s.clip && s.clip !== 'auto') || (s.clipPath && s.clipPath !== 'none' && /inset\(50%|circle\(0/.test(s.clipPath))) return true; } return false; };
  function zone(e, r, soi) {   // la part visible d'un rectangle : l'écran, puis chaque parent qui coupe (overflow), jusqu'au premier fixe
    let x0 = Math.max(r.left, 0), y0 = Math.max(r.top, 0), x1 = Math.min(r.right, innerWidth), y1 = Math.min(r.bottom, innerHeight);
    if (getComputedStyle(e).position === 'fixed' && !soi) return x1 - x0 >= 1 && y1 - y0 >= 1 ? { x0, y0, x1, y1 } : null;
    for (let a = soi ? e : e.parentElement; a && a !== document.documentElement; a = a.parentElement) { const s = getComputedStyle(a);
      if (s.overflowX !== 'visible' || s.overflowY !== 'visible') { const q = a.getBoundingClientRect();
        if (s.overflowX !== 'visible') { x0 = Math.max(x0, q.left + a.clientLeft); x1 = Math.min(x1, q.left + a.clientLeft + a.clientWidth); }
        if (s.overflowY !== 'visible') { y0 = Math.max(y0, q.top + a.clientTop); y1 = Math.min(y1, q.top + a.clientTop + a.clientHeight); } }
      if (s.position === 'fixed') break; }
    return x1 - x0 >= 1 && y1 - y0 >= 1 ? { x0, y0, x1, y1 } : null; }
  const visible = e => { const s = getComputedStyle(e); if (s.visibility !== 'visible' || opacite(e) < 0.1 || masque(e)) return null;
    const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return null; return zone(e, r, false); };
  const appartient = (e, h) => !!h && (h === e || e.contains(h) || (e.labels && [...e.labels].some(l => l.contains(h))));
  // tout l'arbre rendu, sans le dessin du plan ni ce qui est caché (display: none) : une seule marche par relevé
  function elements() { const out = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, { acceptNode: n =>
    EXCLU.has(n.id) || n.classList.contains('carte-double') || n.tagName === 'SCRIPT' || n.tagName === 'STYLE' || n.tagName === 'TEMPLATE' || !n.checkVisibility() ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    for (let n; (n = w.nextNode());) out.push(n); return out; }
  const interactif = (e, s) => { if (e.matches(INTER)) return true; if (s.cursor !== 'pointer' || e.closest('svg') && e.tagName.toLowerCase() !== 'svg') return false;
    const p = e.parentElement; return !p || getComputedStyle(p).cursor !== 'pointer'; };
  const eteint = e => !!(e.disabled || e.getAttribute('aria-disabled') === 'true' || (e.closest && e.closest('[disabled], [aria-disabled="true"], fieldset[disabled]')));
  // le nom accessible (assez fidèle à accname pour juger) ; la brief admet data-bulle comme nom
  const texteNomme = e => { let t = ''; for (const n of e.childNodes) { if (n.nodeType === 3) t += n.data; else if (n.nodeType === 1 && n.getAttribute('aria-hidden') !== 'true' && getComputedStyle(n).display !== 'none') t += ' ' + (n.getAttribute('aria-label') || texteNomme(n)); } return t; };
  const nomAccessible = e => { const lb = e.getAttribute('aria-labelledby'); if (lb) { const t = lb.split(/\s+/).map(id => document.getElementById(id)).filter(Boolean).map(x => x.textContent).join(' ').trim(); if (t) return t; }
    const al = (e.getAttribute('aria-label') || '').trim(); if (al) return al;
    if (e.matches(CHAMP)) { const ls = e.labels ? [...e.labels].map(l => l.textContent).join(' ').trim() : ''; if (ls) return ls; }
    else { const t = texteNomme(e).replace(/\s+/g, ' ').trim(); if (t) return t; if (e.tagName === 'INPUT' && /^(button|submit|reset)$/.test(e.type) && e.value) return e.value; }
    return (e.getAttribute('title') || e.getAttribute('placeholder') || e.dataset.bulle || '').trim(); };
  // le texte qu'on VOIT d'un élément (ni le caché aux lecteurs d'écran, ni une bulle transparente) : vide = une icône seule
  const texteVu = e => { let t = ''; const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); for (let n; (n = w.nextNode());) { const p = n.parentElement; if (!n.data.trim() || p.closest('[aria-hidden="true"]') || opacite(p) < 0.1 || !p.checkVisibility()) continue; t += n.data; } return t.trim(); };
  const POPOVERS = '#fi-q-bulle, #menu, #q-liste, #fi-menu-liste, .doc-menu-l, .fi-bulle, [role=tooltip], .menu-bulle, #menu-bulle, .bi-pop, .fi-menu, #ba-colonnes-menu';
  // pourquoi h couvre e : 'modale' (une feuille aria-modal), 'ouvert' (un menu, une bulle que la main a ouverts), 'colle'
  // (un en-tête ou un pied collé du conteneur qui défile), ou '' (un vrai recouvrement)
  const couvreur = (e, h) => { if (!h) return ''; if (h.closest('[aria-modal="true"]') && !e.closest('[aria-modal="true"]')) return 'modale'; if (h.closest(POPOVERS) && !e.closest(POPOVERS)) return 'ouvert';
    for (let a = h; a && !a.contains(e); a = a.parentElement) if (getComputedStyle(a).position === 'sticky') return 'colle'; return ''; };
  const aUneBulle = e => !!(e.dataset.bulle || e.dataset.aide || e.getAttribute('title') || e.querySelector('.bulle, .menu-bulle') || (e.getAttribute('aria-describedby') || '').split(/\s+/).some(id => id && document.getElementById(id)));

  /* LE RELEVÉ D'UN ÉCRAN : les encres à juger (textes, icônes, champs) et les défauts qui se lisent sans pixels */
  function releve() { finir();   // l'écran posé : une transition en cours se juge finie
    const els = elements(), D ={ cibles: [], noms: [], coupes: [], cachees: [] }, textes = [], icones = [], champs = [], info = { mots: 0, cibles: 0, petites32: [] };
    const cibles = [];
    for (const e of els) { const s = getComputedStyle(e);
      // 1. les textes : chaque nœud texte visible, son encre, ses rectangles rognés à ce qui se voit
      for (const n of e.childNodes) { if (n.nodeType !== 3 || !n.data.trim()) continue;
        if (s.visibility !== 'visible' || /^(OPTION|TITLE|TEXTAREA)$/.test(e.tagName)) continue;
        const op = opacite(e); if (op < 0.1 || masque(e)) continue;
        const svg = e.closest('svg'), enc = rgba(svg ? s.fill : s.color); if (!enc || enc[3] * op < 0.05) continue;
        const rg = document.createRange(); rg.selectNodeContents(n); const rs = [];
        // un morceau de texte sous autre chose (une carte, une feuille, un voile) ne se lit pas : il ne se juge pas
        for (const r of rg.getClientRects()) { if (r.width < 2 || r.height < 4) continue; const z = zone(e, r, true); if (!z || z.x1 - z.x0 < 2 || z.y1 - z.y0 < 3) continue;
          const h = document.elementFromPoint((z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2); if (h && h !== e && !e.contains(h) && !h.contains(e)) continue; rs.push([z.x0, z.y0, z.x1, z.y1]); }
        if (!rs.length) continue; info.mots += n.data.trim().split(/\s+/).length;
        const px = parseFloat(s.fontSize), gras = +s.fontWeight >= 700;
        textes.push({ sel: nom(e), txt: n.data.trim().replace(/\s+/g, ' ').slice(0, 40), c: [enc[0], enc[1], enc[2], enc[3] * op], seuil: px >= 24 || (px >= 18.66 && gras) ? 3 : 4.5, eteint: eteint(e), rs: rs.slice(0, 4), px }); }
      // 2. les champs : leur valeur (ou leur indication) comme un texte, leur bord comme un élément d'interface
      if (e.matches(CHAMP)) { const z = visible(e); if (z && !eteint(e)) { const r = e.getBoundingClientRect(), bw = parseFloat(s.borderBottomWidth) || 0, bt = parseFloat(s.borderTopWidth) || 0;
        // la boîte du champ : lui, ou le parent proche qui porte son bord (une recherche : la loupe, le champ, la croix dans un cadre)
        const bordDe = (x, t) => { const b = parseFloat(t.borderBottomWidth) || 0, h = parseFloat(t.borderTopWidth) || 0, c = b >= 1 || h >= 1 ? rgba(b >= h ? t.borderBottomColor : t.borderTopColor) : null; return c && c[3] > 0.02 ? c : null; };
        let boite = e, bs = s; if (!bordDe(e, s) && !((rgba(s.backgroundColor) || [0, 0, 0, 0])[3] > 0.02))
          for (let a = e.parentElement, k = 0; a && k < 2; a = a.parentElement, k++) { const q = a.getBoundingClientRect(), t = getComputedStyle(a);
            if (q.width > r.width + 140 || q.height > r.height + 24) break; if (bordDe(a, t) || (rgba(t.backgroundColor) || [0, 0, 0, 0])[3] > 0.02) { boite = a; bs = t; break; } }
        const rb = boite.getBoundingClientRect();
        champs.push({ sel: nom(e), r: [rb.left, rb.top, rb.right, rb.bottom], bord: bordDe(boite, bs), fond: rgba(bs.backgroundColor), op: opacite(boite) });
        const ph = !e.value && e.getAttribute('placeholder'), enc = rgba(ph ? getComputedStyle(e, '::placeholder').color : s.color), txt = e.tagName === 'SELECT' ? (e.selectedOptions[0] || {}).text : ph || e.value;
        const pl = parseFloat(s.paddingLeft) + (parseFloat(s.borderLeftWidth) || 0), pt = parseFloat(s.paddingTop) + bt;
        if (txt && enc && enc[3] > 0.05) { const zz = zone(e, { left: r.left + pl, top: r.top + pt, right: Math.min(r.right - pl, r.left + pl + 8 * Math.max(4, txt.length)), bottom: r.bottom - pt }, false);
          if (zz) textes.push({ sel: nom(e) + (ph ? '::placeholder' : ''), txt: String(txt).slice(0, 40), c: [enc[0], enc[1], enc[2], enc[3] * opacite(e)], seuil: parseFloat(s.fontSize) >= 24 ? 3 : 4.5, eteint: false, rs: [[zz.x0, zz.y0, zz.x1, zz.y1]], px: parseFloat(s.fontSize) }); } } }
      // 3. les cibles
      if (!interactif(e, s) || eteint(e) || e.closest('[aria-hidden="true"]') || s.pointerEvents === 'none') continue;
      const z = visible(e); if (!z) continue; cibles.push({ e, z, s }); }

    // les cibles : taille au clic, nom, bulle d'une icône seule, recouvrement
    for (const { e, z, s } of cibles) { info.cibles++;
      const sel = nom(e), r = e.getBoundingClientRect(), cx = (z.x0 + z.x1) / 2, cy = (z.y0 + z.y1) / 2;
      const ici = (x, y) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight && appartient(e, document.elementFromPoint(x, y));
      // recouvert : ni le centre de sa part visible, ni ses quatre quarts ne le touchent
      const pts = [[cx, cy], [(z.x0 + cx) / 2, (z.y0 + cy) / 2], [(z.x1 + cx) / 2, (z.y0 + cy) / 2], [(z.x0 + cx) / 2, (z.y1 + cy) / 2], [(z.x1 + cx) / 2, (z.y1 + cy) / 2]];
      const touche = pts.some(([x, y]) => ici(x, y));
      // ce qui couvre PAR DESSEIN ne compte pas ici : une feuille modale, ce que la main vient d'ouvrir (un menu, une bulle,
      // une liste), l'en-tête ou le pied collé de la liste qui défile dessous (le clavier, lui, est jugé plus bas)
      if (!touche) { const h = document.elementFromPoint(cx, cy), pourquoi = couvreur(e, h);
        if (!pourquoi) D.cachees.push({ sel, detail: (h && h.contains(e) ? 'le clic passe au travers, à ' : 'caché sous ') + nom(h) + (e.tabIndex >= 0 ? ' — et Tab y va quand même' : ''), txt: extrait(e) }); }
      // la taille : la boîte, ou ce que le clic touche à ±11,5 px du centre (une zone agrandie compte) ; un lien dans une phrase est exempté
      const dansPhrase = /^inline/.test(s.display) && e.parentElement && [...e.parentElement.childNodes].some(n => n !== e && n.nodeType === 3 && n.data.trim().length > 2);
      if (!dansPhrase && touche) { const w = r.width, h = r.height;
        if ((w < 24 || h < 24) && !(ici(cx - 11.5, cy) && ici(cx + 11.5, cy) && ici(cx, cy - 11.5) && ici(cx, cy + 11.5))) D.cibles.push({ sel, detail: Math.round(w) + ' × ' + Math.round(h) + ' px', txt: extrait(e) });
        else if (w < 32 || h < 32) info.petites32.push(sel); }
      // le nom, et la bulle d'un bouton qui n'a qu'une icône
      const n = nomAccessible(e); if (!n) D.noms.push({ sel, detail: 'sans nom accessible (ni texte, ni aria-label, ni title, ni data-bulle)', txt: e.outerHTML.slice(0, 60) });
      const role = e.getAttribute('role') || e.tagName.toLowerCase();
      if (/^(button|a|summary|menuitem|tab|link)$/.test(role) && !texteVu(e) && e.querySelector('svg, img') && !aUneBulle(e)) D.noms.push({ sel, detail: 'une icône seule, sans bulle (.bulle, data-bulle, data-aide, title)', txt: n || '' }); }

    // les textes coupés : des points de suspension, une ligne rognée, un débordement caché — sans bulle qui donne le texte entier
    const bulleEntiere = (e, plein) => { const p = norm(plein); if (!p) return true; for (let a = e, k = 0; a && k < 5; a = a.parentElement, k++) {
      for (const at of ['title', 'data-bulle', 'aria-label', 'data-aide', 'data-titre']) { const v = norm(a.getAttribute(at)); if (v && (v.includes(p) || p.includes(v) && v.length > p.length * 0.9)) return true; }
      if (a.matches(INTER)) break; } return false; };
    const vus = new Set();
    for (const e of els) { const s = getComputedStyle(e); if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName) || e.closest('svg')) continue;
      const ellipse = s.textOverflow === 'ellipsis', pince = s.webkitLineClamp && s.webkitLineClamp !== 'none';
      const coupe = s.overflowX === 'hidden' || s.overflowX === 'clip' || s.overflowY === 'hidden' || s.overflowY === 'clip';
      if (!(ellipse || pince || coupe) || !visible(e)) continue;
      const plein = e.textContent.replace(/\s+/g, ' ').trim(); if (!plein) continue;
      let rogne = '';
      if ((ellipse || pince) && (e.scrollWidth > e.clientWidth + 1 || pince && e.scrollHeight > e.clientHeight + 1)) rogne = ellipse && e.scrollWidth > e.clientWidth + 1 ? 'points de suspension' : 'lignes rognées';
      else if (coupe) { // un nœud texte qui dépasse la boîte qui coupe (pas une décoration ; en hauteur, plus que le jambage d'une lettre)
        const q = e.getBoundingClientRect(), bx0 = q.left + e.clientLeft, by0 = q.top + e.clientTop, bx1 = bx0 + e.clientWidth, by1 = by0 + e.clientHeight, cx = s.overflowX !== 'visible', cy = s.overflowY !== 'visible';
        const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
        // (un dessin — le folio, qu'on zoome et qu'on glisse — n'est pas un texte coupé : le relevé saute déjà ce qui est
        // dans un svg ; la marche des nœuds, partie de la planche, y redescendait — le récapitulatif en moitié, qui glisse
        // le dessin au-dessus du tiroir, rognait le cadre de la feuille « en haut »)
        for (let n; !rogne && (n = w.nextNode());) { if (!n.data.trim() || n.parentElement.closest('svg') || !n.parentElement.checkVisibility() || opacite(n.parentElement) < 0.1) continue;
          const rg = document.createRange(), tol = Math.max(3, 0.3 * parseFloat(getComputedStyle(n.parentElement).fontSize)); rg.selectNodeContents(n);
          for (const r of rg.getClientRects()) { if (r.width < 2) continue;
            const ou = cx && r.right > bx1 + 1.5 ? 'à droite' : cx && r.left < bx0 - 1.5 ? 'à gauche' : cy && r.bottom > by1 + tol ? 'en bas' : cy && r.top < by0 - tol ? 'en haut' : '';
            if (!ou) continue;
            // ce qui défile dans un parent plus proche n'est pas coupé pour de bon
            let defile = false; for (let a = n.parentElement; a && a !== e; a = a.parentElement) { const t = getComputedStyle(a); if (/auto|scroll/.test(t.overflowX + t.overflowY)) defile = true; }
            if (!defile) { rogne = 'texte rogné ' + ou; break; } } } }
      if (!rogne || vus.has(e)) continue; [...e.querySelectorAll('*')].forEach(x => vus.add(x));
      if (!bulleEntiere(e, plein)) D.coupes.push({ sel: nom(e), detail: rogne + ' sans bulle qui le donne en entier', txt: plein.length > 60 ? plein.slice(0, 59) + '…' : plein }); }

    // deux textes d'un même panneau qui se chevauchent (une bulle, faite pour flotter, n'y compte pas)
    for (let i = 0; i < textes.length; i++) for (let j = i + 1; j < textes.length; j++) { const a = textes[i], b = textes[j]; if (a.sel === b.sel || /bulle|placeholder/.test(a.sel + b.sel)) continue;
      const pa = a.sel.split(' ')[0], pb = b.sel.split(' ')[0]; if (pa !== pb || !pa.startsWith('#')) continue;
      for (const ra of a.rs) for (const rb of b.rs) { const dx = Math.min(ra[2], rb[2]) - Math.max(ra[0], rb[0]), dy = Math.min(ra[3], rb[3]) - Math.max(ra[1], rb[1]);
        if (dx > 3 && dy > Math.min(ra[3] - ra[1], rb[3] - rb[1]) * 0.45) { D.coupes.push({ sel: a.sel + '  ×  ' + b.sel, detail: 'deux textes se chevauchent (' + Math.round(dx) + ' × ' + Math.round(dy) + ' px)', txt: a.txt + ' / ' + b.txt }); ra[0] = 1e9; } } }

    // les icônes d'un bouton qui n'a qu'une icône : leur trait, sur leur fond
    for (const { e } of cibles) { if (texteVu(e)) continue; const ic = e.querySelector('svg'); if (!ic || !ic.checkVisibility() || opacite(ic) < 0.1) continue;
      const r = ic.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue; const z = zone(ic, r, false); if (!z) continue;
      const h = document.elementFromPoint((z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2); if (h && !e.contains(h) && !h.contains(e)) continue;
      const tr = ic.querySelector('path, circle, rect, line, polyline, polygon'), ts = tr ? getComputedStyle(tr) : getComputedStyle(ic);
      const c = rgba(ts.stroke && ts.stroke !== 'none' ? ts.stroke : ts.fill && ts.fill !== 'none' ? ts.fill : getComputedStyle(ic).color); if (!c) continue;
      icones.push({ sel: nom(e), c: [c[0], c[1], c[2], c[3] * opacite(ic) * (+ts.strokeOpacity || 1)], r: [z.x0, z.y0, z.x1, z.y1], eteint: eteint(e) }); }
    info.petites32 = info.petites32.length;
    return { D, textes, icones, champs, info }; }

  /* LE FOCUS : chaque élément qui prend le clavier, focalisé comme au clavier ; ce qui change sur lui, ses pseudo-éléments,
     son parent. Rend les défauts et, pour juger leur contraste, les anneaux (couleur, rectangle). */
  const anneau = e => { const s = getComputedStyle(e), b = getComputedStyle(e, '::before'), a = getComputedStyle(e, '::after'), p = e.parentElement ? getComputedStyle(e.parentElement) : null, g = e.parentElement && e.parentElement.parentElement ? getComputedStyle(e.parentElement.parentElement) : null;
    const pseudo = x => [x.boxShadow, x.outlineStyle, x.outlineWidth, x.borderTopColor, x.opacity, x.backgroundColor].join('|');
    return { os: s.outlineStyle, ow: parseFloat(s.outlineWidth) || 0, oc: s.outlineColor, oo: parseFloat(s.outlineOffset) || 0, bs: s.boxShadow, bc: [s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor].join(), bg: s.backgroundColor,
      ps: pseudo(b) + '§' + pseudo(a), par: p ? [p.boxShadow, p.outlineStyle, p.outlineWidth, p.borderTopColor].join('|') : '', gpar: g ? [g.boxShadow, g.outlineStyle, g.borderTopColor].join('|') : '' }; };
  // un élément du SVG (un point d'une courbe) ne porte ni contour ni ombre : son anneau est le trait de ses enfants
  const enfants = e => [...e.querySelectorAll('*')].slice(0, 12).map(x => { const t = getComputedStyle(x); return [t.stroke, t.strokeWidth, t.fill, t.opacity, t.outlineStyle, t.boxShadow].join('|'); }).join('§');
  const recouvert = (e, z) => { const pts = [[(z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2], [z.x0 + 2, z.y0 + 2], [z.x1 - 2, z.y1 - 2]]; return !pts.some(([x, y]) => appartient(e, document.elementFromPoint(x, y))); };
  function focus() { const D = [], anneaux = []; let indetermines = 0, essayes = 0;
    const els = elements().filter(e => e.tabIndex >= 0 && !eteint(e) && !e.closest('[aria-hidden="true"], [inert]') && visible(e));
    const avant0 = document.activeElement;
    for (const e of els) { const z = visible(e); if (!z || recouvert(e, z)) continue;   // recouvert : jugé par « rien de caché » et par Tab
      const deja = e === avant0, svg = e instanceof SVGElement;
      finir(); const av = anneau(e), avE = svg ? enfants(e) : ''; try { e.focus({ preventScroll: true }); } catch (_) { continue; }
      if (document.activeElement !== e) continue; essayes++; finir();
      if (!e.matches(':focus-visible')) { indetermines++; continue; }
      const ap = anneau(e), sel = nom(e), r = e.getBoundingClientRect(), entier = Math.abs(z.x0 - Math.max(0, r.left)) < 1 && Math.abs(z.x1 - Math.min(innerWidth, r.right)) < 1 && Math.abs(z.y0 - Math.max(0, r.top)) < 1 && Math.abs(z.y1 - Math.min(innerHeight, r.bottom)) < 1;
      const contour = ap.os !== 'none' && ap.ow >= 1 && (rgba(ap.oc) || [0, 0, 0, 0])[3] >= 0.3;
      const ombre = ap.bs !== av.bs && ap.bs !== 'none' || deja && ap.bs !== 'none' && /\b0px 0px 0px [1-9]/.test(ap.bs);
      if (contour) { if (entier) anneaux.push({ sel, c: rgba(ap.oc), r: [r.left, r.top, r.right, r.bottom], d: ap.oo + ap.ow / 2, sorte: 'contour' }); }
      else if (ombre) { const c = rgba(ap.bs); if (c && entier) anneaux.push({ sel, c, r: [r.left, r.top, r.right, r.bottom], d: 1.5, sorte: 'ombre' }); }
      else if (ap.ps !== av.ps || ap.par !== av.par || ap.gpar !== av.gpar || svg && enfants(e) !== avE) { /* un anneau porté par un pseudo-élément, le parent (:focus-within) ou, dans un SVG, les enfants : il se voit */ }
      else if (deja) indetermines++;   // il avait déjà le clavier en arrivant : on ne voit pas la différence, on ne juge pas
      else D.push({ sel, detail: ap.bg !== av.bg || ap.bc !== av.bc ? 'au clavier, seul ' + (ap.bg !== av.bg ? 'le fond' : 'le bord') + ' change : ni contour ni ombre' : 'au clavier, rien ne change : aucun contour, aucune ombre', txt: extrait(e) }); }
    try { if (avant0 && avant0.focus) avant0.focus({ preventScroll: true }); else document.activeElement.blur(); } catch (_) { }
    return { D, anneaux, indetermines, essayes }; }
  // où est le clavier, et le voit-on ?
  // un anneau qui paraît en 140 ms, une liste qui tombe en 220 ms se jugent parus (ce qui tourne sans fin, la table, reste)
  const finir = () => document.getAnimations().forEach(a => { try { const t = a.effect && a.effect.getComputedTiming(); if (a.playState === 'running' && t && isFinite(t.endTime)) a.finish(); } catch (_) { } });
  function clavierIci() { finir(); const e = document.activeElement; if (!e || e === document.body || e === document.documentElement) return { sel: 'body', vu: true, corps: true };
    const z = visible(e); if (!z) return { sel: nom(e), vu: false, pourquoi: 'invisible (taille nulle, transparent, hors de l’écran ou rogné)', txt: extrait(e) };
    const cx = (z.x0 + z.x1) / 2, cy = (z.y0 + z.y1) / 2, h = document.elementFromPoint(cx, cy);
    if (!appartient(e, h) && !(h && h.contains(e) && e.tabIndex < 0)) { const pts = [[z.x0 + 2, z.y0 + 2], [z.x1 - 2, z.y1 - 2], [z.x0 + 2, z.y1 - 2], [z.x1 - 2, z.y0 + 2]]; if (!pts.some(([x, y]) => appartient(e, document.elementFromPoint(x, y)))) { const k = couvreur(e, h);
      return { sel: nom(e), vu: false, modaleDerriere: k === 'modale', pourquoi: k === 'colle' ? 'sous l’en-tête (ou le pied) collé de sa liste — le défilement ne le dégage pas' : k === 'ouvert' ? 'sous ' + nom(h) + ', ouvert, qui ne se ferme pas quand le clavier s’en va' : 'caché sous ' + nom(h), txt: extrait(e) }; } }
    return { sel: nom(e), vu: true, modale: !!e.closest('[aria-modal="true"]') }; }
  // une bulle se voit-elle maintenant (celle d'un bouton du rail, la bulle des fiches, celle du menu, un role=tooltip) ?
  function bulleVue(sel) { finir(); const e = document.querySelector(sel); const cands = [...(e ? e.querySelectorAll('.bulle') : []), ...document.querySelectorAll('.fi-bulle, .menu-bulle, #menu-bulle, [role=tooltip], .bulle-texte')];
    return cands.some(b => b.checkVisibility() && opacite(b) > 0.5 && b.getBoundingClientRect().width > 4 && (b.textContent || '').trim()); }
  window.__ux = { releve, focus, clavierIci, bulleVue, nom };
}

/* Le MOUVEMENT, enregistré dès le chargement (addInitScript) : chaque animation de plus de 10 ms qui court, chaque
   `animate()`, chaque défilement doux, chaque glissement de la vue du plan — sous le mouvement réduit, il n'y en a aucun. */
function enregistreur() {
  const M = window.__mvt = { vus: new Map(), on: false };
  const nomDe = e => { if (!e || e.nodeType !== 1) return '?'; if (e.id) return '#' + e.id; let a = e.parentElement; while (a && !a.id) a = a.parentElement; return (a ? '#' + a.id + ' ' : '') + e.tagName.toLowerCase() + (e.classList.length ? '.' + [...e.classList].slice(0, 2).join('.') : ''); };
  const noter = (cle, quoi) => { if (!M.on) return; const v = M.vus.get(cle); if (v) v.n++; else M.vus.set(cle, { ...quoi, n: 1, ecran: M.ecran }); };
  const ani = Element.prototype.animate; Element.prototype.animate = function (k, o) { const a = ani.call(this, k, o);
    try { const d = typeof o === 'number' ? o : (o && +o.duration) || 0; if (d > 10) noter('animate|' + nomDe(this), { sel: nomDe(this), quoi: 'el.animate() de ' + Math.round(d) + ' ms' }); } catch (_) { } return a; };
  for (const [proto, fn] of [[Element.prototype, 'scrollIntoView'], [Element.prototype, 'scrollTo'], [Element.prototype, 'scrollBy'], [window, 'scrollTo'], [window, 'scrollBy']]) { const f = proto[fn];
    proto[fn] = function (o, ...r) { if (o && typeof o === 'object' && o.behavior === 'smooth') noter('doux|' + fn + '|' + nomDe(this === window ? document.documentElement : this), { sel: nomDe(this === window ? document.documentElement : this), quoi: fn + '({ behavior: "smooth" })' }); return f.call(this, o, ...r); }; }
  let vue = '', suite = 0;
  const tour = () => { try { if (M.on) { for (const a of document.getAnimations()) { const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null; if (!t || a.playState !== 'running') continue;
        const d = +t.duration || 0; if (d > 10 || t.duration === Infinity) { const cible = a.effect.target, quoi = a.animationName ? 'animation ' + a.animationName : a.transitionProperty ? 'transition ' + a.transitionProperty : 'animation';
          noter('ani|' + nomDe(cible) + '|' + quoi, { sel: nomDe(cible), quoi: quoi + ' de ' + (d === Infinity ? '∞' : Math.round(d) + ' ms') }); } }
      // la vue du plan qui change plusieurs images de suite : elle glisse
      if (typeof app !== 'undefined' && app.vue) { const v = JSON.stringify(app.vue); suite = v !== vue ? suite + 1 : 0; vue = v; if (suite >= 4) noter('vue|' + M.ecran, { sel: '#planche (app.vue)', quoi: 'la vue du plan glisse sur ' + suite + ' images' }); } } } catch (_) { } requestAnimationFrame(tour); };
  requestAnimationFrame(tour);
}

/* ===========================================================================
   LES ÉCRANS : comment y aller (à la vraie souris et au clavier quand c'est le geste de l'humain), ce qui est ouvert,
   et ce qu'Échap doit faire (combien d'appuis, ce qui doit rester, à qui revient le clavier).
   =========================================================================== */
const calme = page => page.waitForFunction(() => !document.getAnimations().some(a => a.playState === 'running' && a.effect && isFinite(a.effect.getComputedTiming().endTime)), null, { timeout: 4000 }).catch(() => {});
async function remettre(page) {
  await page.evaluate(() => { const f = (fn, ...a) => { try { if (typeof window[fn] === 'function') window[fn](...a); } catch (_) { } };
    try { if (typeof FI !== 'undefined' && FI.liste) FI.liste = ''; } catch (_) { }
    f('fermerRaccourcis'); f('fermerMenu'); f('fermerAide'); f('fermerRecherche'); if (typeof app !== 'undefined') { if (app.fiche) f('fermerFiche'); f('deselectionner'); f('fermerInspecteur'); f('fermerBase'); }
    const l = document.getElementById('fi-menu-liste'); if (l) l.hidden = true; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
  await page.mouse.move(3, 3); await calme(page); }
// le plan sur la table, un folio, cadré
async function folio(page, f) { await page.evaluate(f => { if (typeof BIB !== 'undefined' && BIB.vue && !document.getElementById('bibliotheque').hidden && typeof montrerLePlan === 'function') montrerLePlan(); if (app.plan !== f) allerAuPlan(f); ajuster(); }, f); await page.waitForTimeout(250); await calme(page); }
// un clic au milieu d'un bloc du plan, comme la main ; s'il n'ouvre pas sa fiche, on le note (et on l'ouvre autrement)
async function cliquerBloc(page, nomBloc, f, notes) { await folio(page, f);
  const c = await page.evaluate(n => { const k = app.dessin.comps.find(k => k.name === n && (k.kind !== 'tag' || estMasse(n))) || app.dessin.comps.find(k => k.name === n), r = $('planche').getBoundingClientRect();
    return { x: r.left + app.vue.tx + (k.x + k.w / 2) * app.vue.s, y: r.top + app.vue.ty + (k.y + k.h / 2) * app.vue.s }; }, nomBloc);
  await page.mouse.click(c.x, c.y); await page.waitForTimeout(350); await calme(page);
  const ouvert = await page.evaluate(n => !$('inspecteur').hidden && $('inspecteur').textContent.includes(n), nomBloc);
  if (!ouvert) { notes.push({ sel: nomBloc, detail: 'un clic au milieu du bloc n’ouvre pas sa fiche (' + Math.round(c.x) + ', ' + Math.round(c.y) + ')' }); await page.evaluate(n => montrerBloc(n), nomBloc); await page.waitForTimeout(350); await calme(page); } }
async function cliquerCable(page, cable, f) { await folio(page, f);
  const p = await page.evaluate(cable => { const w = app.dessin.fils.find(w => w.cable === cable), r = $('planche').getBoundingClientRect();
    let best = null; w.pts.slice(1).forEach((b, i) => { const a = w.pts[i], L = Math.abs(b.x - a.x) + Math.abs(b.y - a.y); if (!best || L > best.L) best = { L, x: r.left + app.vue.tx + (a.x * .4 + b.x * .6) * app.vue.s, y: r.top + app.vue.ty + (a.y * .4 + b.y * .6) * app.vue.s }; }); return best; }, cable);
  await page.mouse.click(p.x, p.y); await page.waitForTimeout(350); await calme(page);
  if (!await page.evaluate(c => !$('inspecteur').hidden && $('inspecteur').textContent.includes(c), cable)) { await page.evaluate(c => montrerFil(verite().find(l => l.cable === c)), cable); await page.waitForTimeout(350); await calme(page); } }
async function clic(page, sel) { const el = await page.$(sel); if (!el) throw new Error('introuvable : ' + sel); await el.click(); await page.waitForTimeout(260); await calme(page); }
async function touche(page, k) { await page.keyboard.press(k); await page.waitForTimeout(300); await calme(page); }
async function parLeMenu(page, ...sels) { await clic(page, '#btnMenu'); for (const s of sels) await clic(page, '#menu ' + s); await page.waitForTimeout(250); await calme(page); }
const carteOuverte = '!$("inspecteur").hidden';
const docOuvert = '!$("fiche").hidden';

const ECRANS = [
  { nom: 'accueil', vide: true, aller: async () => {} },
  { nom: 'plan', aller: async page => { await page.evaluate(() => atelier.exemple()); await page.waitForTimeout(1200); await folio(page, '1'); },
    // DESIGN.md : les dessins « exacts, lisibles à 100 % ». À « 1 » (100 %), sur le folio le plus chargé, chaque sorte d'écriture
    // du folio (un numéro de câble, une borne, un repère) fait au moins 9 px à l'écran — la taille d'une lettre qu'on lit sans plisser
    lecture: async page => { await folio(page, '3'); await page.keyboard.press('1'); await page.waitForTimeout(500); await calme(page);
      const D = await page.evaluate(() => { const par = {}, zoom = $('zlbl').textContent.trim();
        document.querySelectorAll('#svg text').forEach(t => { const k = (t.getAttribute('class') || t.parentNode.getAttribute('class') || 'texte').split(' ')[0], m = t.getScreenCTM(); if (!m) return;
          (par[k] = par[k] || { px: [], ex: t.textContent }).px.push(parseFloat(getComputedStyle(t).fontSize) * Math.hypot(m.a, m.b)); });
        return Object.entries(par).map(([k, v]) => { v.px.sort((a, b) => a - b); return { k, med: v.px[Math.floor(v.px.length / 2)], n: v.px.length, ex: v.ex, zoom }; })
          .filter(x => x.med < 8.995).map(x => ({ sel: '#svg text.' + x.k, pire: x.med, detail: 'à ' + x.zoom + ', ' + x.n + ' écriture' + (x.n > 1 ? 's' : '') + ' de ' + x.med.toFixed(1).replace('.', ',') + ' px à l’écran (9 px au moins)', txt: x.ex.slice(0, 20) })); });
      await page.keyboard.press('0'); await folio(page, '1'); return D; } },
  { nom: 'fiche-disjoncteur', aller: (page, n) => cliquerBloc(page, '102CB1', '1', n), echap: { ouvert: carteOuverte } },
  { nom: 'fiche-calibre-a-la-main', aller: async (page, n) => { await cliquerBloc(page, '102CB1', '1', n); await clic(page, '#inspecteur .dj-main'); },
    echap: { ouvert: 'FI.liste === "dj|102CB1"', reste: carteOuverte, retour: '#inspecteur .dj-main', mot: 'la gamme « À la main »' },
    // le lecteur : « je peux sélectionner que ceux au-dessus, pas en dessous ; je dois tout pouvoir sélectionner » — chaque calibre
    // que le cadran écrit se choisit : son cran se clique, ou « À la main » le propose (même s'il ne passe pas : on voit pourquoi)
    choix: page => page.evaluate(() => { const crans = [...document.querySelectorAll('#inspecteur .dj-arc-n')], D = [];
      const choisis = new Set([...document.querySelectorAll('#inspecteur .dj-chip[data-cal], #inspecteur [data-cal]')].filter(b => b.checkVisibility()).map(b => +b.dataset.cal));
      const lus = crans.map(t => ({ t, v: parseFloat(t.textContent.replace(',', '.')) }));
      const cliquables = lus.filter(({ t }) => { const r = t.getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return h && (h.closest('button, [role=button], [data-cal]') || getComputedStyle(h).cursor === 'pointer'); }).length;
      const manquent = lus.filter(({ v }) => !choisis.has(v)).map(({ v }) => String(v).replace('.', ','));
      if (!cliquables) D.push({ sel: '#inspecteur svg.dj-arc text.dj-arc-n', detail: `le cadran écrit ${lus.length} calibres, aucun cran ne se clique` });
      if (manquent.length) D.push({ sel: '#inspecteur .dj-chips', detail: `« À la main » ne propose pas ${manquent.join(', ')} A (${lus.length - manquent.length} calibres sur ${lus.length}) : un calibre plus petit ne se choisit pas, on ne voit pas pourquoi il ne passe pas` });
      return D; }) },
  { nom: 'fiche-aide', aller: async (page, n) => { await cliquerBloc(page, '102CB1', '1', n); await clic(page, '#inspecteur .fi-q'); },
    echap: { ouvert: '!!document.querySelector("#fi-q-bulle") && !$("fi-q-bulle").hidden', reste: carteOuverte, retour: '#inspecteur .fi-q', mot: 'la bulle du « ? »' } },
  { nom: 'fiche-plus', aller: async (page, n) => { await cliquerBloc(page, '102CB1', '1', n); await clic(page, '#fi-menu'); },
    echap: { ouvert: '!$("fi-menu-liste").hidden', reste: carteOuverte, retour: '#fi-menu', mot: 'le « ⋯ » du pied' } },
  { nom: 'fiche-connecteur', aller: (page, n) => cliquerBloc(page, '300XC1', '3', n), echap: { ouvert: carteOuverte } },
  { nom: 'fiche-barrette', aller: (page, n) => cliquerBloc(page, '668VT31', '3', n), echap: { ouvert: carteOuverte } },
  { nom: 'fiche-prise', aller: (page, n) => cliquerBloc(page, '412VC3B', '5', n), echap: { ouvert: carteOuverte } },
  { nom: 'fiche-cable', aller: page => cliquerCable(page, 'W-012', '1'), echap: { ouvert: carteOuverte } },
  { nom: 'fiche-masse', aller: (page, n) => cliquerBloc(page, '901G', '1', n), echap: { ouvert: carteOuverte } },
  { nom: 'recapitulatif', aller: async page => { await folio(page, '1'); await touche(page, 'b'); }, echap: { ouvert: '!$("base").hidden' } },
  ...['equipements', 'disjoncteurs', 'barrettes', 'prises', 'cables', 'raccords', 'problemes', 'normes'].map(k => ({ nom: 'recap-' + k,
    aller: async page => { await folio(page, '1'); await touche(page, 'b'); await clic(page, `#base [data-onglet="${k}"]`); } })),
  { nom: 'recap-page', aller: async page => { await folio(page, '1'); await touche(page, 'Shift+B'); }, echap: { ouvert: '!$("base").hidden' } },
  { nom: 'index', aller: async page => { await folio(page, '1'); await touche(page, 'r'); }, echap: { ouvert: '!$("inspecteur").hidden && app.insp.index', mot: 'l’index (le clavier dans sa recherche)' } },
  { nom: 'recherche', aller: async page => { await folio(page, '1'); await touche(page, '/'); await page.keyboard.type('W-01', { delay: 30 }); await page.waitForTimeout(400); },
    echap: { ouvert: 'rechercheOuverte()', mot: 'la recherche' } },
  { nom: 'menu', aller: async page => { await folio(page, '1'); await clic(page, '#btnMenu'); }, echap: { ouvert: '!$("menu").hidden', retour: '#btnMenu' } },
  { nom: 'menu-exporter', aller: async page => { await folio(page, '1'); await parLeMenu(page, '[data-sous="exporter"]'); },
    echap: { ouvert: '!$("menu").hidden && $("mp-principal").hidden', reste: '!$("menu").hidden', retour: '#menu [data-sous="exporter"]', mot: 'le sous-menu Exporter (il revient au menu)' } },
  { nom: 'menu-plus', aller: async page => { await folio(page, '1'); await parLeMenu(page, '[data-sous="plus"]'); },
    echap: { ouvert: '!$("menu").hidden && $("mp-principal").hidden', reste: '!$("menu").hidden', retour: '#menu [data-sous="plus"]', mot: 'le sous-menu Plus (il revient au menu)' } },
  { nom: 'raccourcis', aller: async page => { await folio(page, '1'); await touche(page, '?'); }, echap: { ouvert: 'raccourcisOuverts()', mot: 'la feuille des raccourcis' }, modale: true },
  { nom: 'vos-fichiers', aller: async page => { await folio(page, '1'); await parLeMenu(page, '[data-act="fichiers"]'); }, echap: { ouvert: docOuvert, retour: '#btnMenu', mot: 'Vos fichiers' }, document: true },
  { nom: 'normes', aller: async page => { await folio(page, '1'); await parLeMenu(page, '[data-sous="plus"]', '[data-act="normes"]'); }, echap: { ouvert: docOuvert, retour: '#btnMenu', mot: 'les Normes' }, document: true },
  { nom: 'bible', aller: async page => { await folio(page, '1'); await parLeMenu(page, '[data-sous="plus"]', '[data-act="bible"]'); }, echap: { ouvert: docOuvert, retour: '#btnMenu', mot: 'la Bible' }, document: true },
  { nom: 'hypotheses', aller: async page => { await folio(page, '1'); await parLeMenu(page, '[data-sous="plus"]', '[data-act="hypotheses"]'); }, echap: { ouvert: docOuvert, retour: '#btnMenu', mot: 'les Hypothèses' }, document: true },
  { nom: 'bibliotheque', aller: async page => { await folio(page, '1'); await clic(page, '#en-biblio'); }, echap: { ouvert: '!$("bibliotheque").hidden', mot: 'la bibliothèque (Échap reprend le plan)' } },
  { nom: 'installation', aller: async page => { await folio(page, '1'); await clic(page, '#en-install'); },
    echap: { ouvert: 'BIB.vue === "install" && !$("bibliotheque").hidden', mot: 'une installation (Échap remonte)' } },
].filter(e => !ECRANS_VOULUS || ECRANS_VOULUS.includes(e.nom) || e.nom === 'plan');

const GESTES = new Set(['lecture', 'choix']);   // jugées une fois par largeur (elles ne dépendent pas du thème)
const CATEGORIES = [
  ['contrastes', 'les contrastes : texte ≥ 4,5:1, gros texte, icône et bord de champ ≥ 3:1'],
  ['cibles', 'les cibles cliquables visibles font au moins 24 × 24 px'],
  ['noms', 'chaque bouton, lien, onglet, champ a un nom ; chaque icône seule a sa bulle, qui paraît à la souris et au clavier'],
  ['coupes', 'aucun texte coupé sans bulle qui le donne en entier, aucun texte sur un autre'],
  ['cachees', 'aucun élément interactif caché sous un autre au point de clic'],
  ['focus', 'le focus se voit partout (contour ou ombre ≥ 3:1) ; Tab ne va jamais sur l’invisible ni hors d’une feuille modale'],
  ['lecture', 'à 100 %, chaque écriture du folio fait au moins 9 px à l’écran'],
  ['choix', 'ce qui se lit comme un choix se choisit (chaque calibre du cadran : son cran, ou « À la main »)'],
  ['echap', 'Échap ferme ce qui s’ouvre, sans fermer ce qui est dessous, et rend le clavier à ce qui l’avait ouvert'],
  ['erreurs', 'aucune erreur de page']];

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  let ko = 0, oks = 0; const ok = (c, nom, detail) => { if (!c) ko++; else oks++; console.log('  ' + (c ? 'ok ' : 'KO ') + ' ' + nom + (detail ? '   ' + detail : '')); };
  const total = new Map(CATEGORIES.map(([k]) => [k, new Map()]));   // les défauts distincts, toutes passes : sélecteur + sorte → passes
  // un défaut se reconnaît à sa SORTE (le détail sans ses chiffres) et à son MOTIF (le sélecteur sans le rang d'une ligne : les
  // trois lignes d'une même liste qui ont le même défaut en font un, « × 3 »)
  const sorte = d => d.detail.replace(/[\d,.]+:1.*$|\d+ × \d+ px|\(\d+ × \d+ px\)|\(\d+, \d+\)/g, '#').trim();
  const motif = sel => sel.replace(/\[(data-i|data-k|data-id|data-plan)="[^"]*"\]/g, '');
  const cle = d => motif(d.sel) + '|' + sorte(d);
  const lister = (cat, defauts, passe, muet) => { const par = new Map();
    for (const d of defauts) { const k = cle(d); const v = par.get(k); if (v) { if (!v.ecrans.includes(d.ecran)) v.ecrans.push(d.ecran); v.sels.add(d.sel); if (d.pire != null && d.pire < v.pire) { v.pire = d.pire; v.detail = d.detail; } } else par.set(k, { ...d, ecrans: [d.ecran], sels: new Set([d.sel]) });
      const t = total.get(cat); if (!t.has(k)) t.set(k, { d, passes: new Set() }); t.get(k).passes.add(passe); }
    if (!COURT && !muet) for (const v of par.values()) console.log('        · ' + (v.sels.size > 1 ? motif(v.sel) + ' (× ' + v.sels.size + ')' : v.sel) + ' — ' + v.detail + (v.txt ? ' « ' + v.txt + ' »' : '') + '   [' + (v.ecrans.length > 6 ? v.ecrans.slice(0, 6).join(', ') + ' … +' + (v.ecrans.length - 6) : v.ecrans.join(', ')) + ']');
    return par.size; };
  const charges = [];

  for (const passe of SEUL_MOUVEMENT ? [] : PASSES) {
    console.log(`\n${passe.W} × ${passe.H} · ${passe.theme === 'dark' ? 'sombre' : 'clair'}`);
    const page = await nav.newPage({ viewport: { width: passe.W, height: passe.H }, colorScheme: passe.theme }); page.setDefaultTimeout(60000);
    const erreurs = []; page.on('pageerror', e => erreurs.push({ sel: 'page', detail: e.message.slice(0, 160) })); page.on('console', m => { if (m.type() === 'error') erreurs.push({ sel: 'console', detail: m.text().slice(0, 160) }); });
    await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined' && typeof BIB !== 'undefined' && BIB.pret, null, { timeout: 120000 });
    await page.evaluate(t => { document.documentElement.dataset.theme = t; }, passe.theme);
    await page.evaluate(() => ['equipement', 'disjoncteur', 'barrette', 'prise', 'masse', 'fil'].forEach(t => ['disjoncteur', 'connecteur', 'raccord', 'trajet', 'fils', 'dejafait'].forEach(k => { try { retenirSection(t, k, true); } catch (_) { } })));   // chaque section ouverte : on juge tout ce qu'une fiche peut montrer
    await page.evaluate(socle);
    const D = Object.fromEntries(CATEGORIES.map(([k]) => [k, []])), echaps = [], bullesVues = new Set();
    // LES GESTES (une bulle paraît-elle, Échap, le clavier qui entre dans un document) ne dépendent pas du thème : ils se
    // jugent une fois par largeur, à sa première passe ; les encres, le focus et Tab, à chaque passe
    const gestes = !PASSES.slice(0, PASSES.indexOf(passe)).some(p => p.W === passe.W);

    for (const ecran of ECRANS) {
      const notes = [], t0 = Date.now();
      try { if (ecran.nom !== 'accueil') await remettre(page); await ecran.aller(page, notes); }
      catch (e) { D.erreurs.push({ ecran: ecran.nom, sel: 'parcours', detail: 'l’écran ne s’atteint pas : ' + e.message.split('\n')[0].slice(0, 140) }); continue; }
      await page.evaluate(t => { document.documentElement.dataset.theme = t; }, passe.theme);
      await page.mouse.move(3, passe.H - 3); await page.waitForTimeout(120); await calme(page);
      notes.forEach(n => D.cibles.push({ ecran: ecran.nom, ...n }));
      if (CAPTURES) await page.screenshot({ path: path.join(CAPTURES, `${ecran.nom}-${passe.nom}.png`) });

      // 1. LE RELEVÉ sans pixels, puis LES FONDS : la même image, chaque texte et chaque icône rendus transparents
      const R = await page.evaluate(() => window.__ux.releve());
      for (const k of ['cibles', 'noms', 'coupes', 'cachees']) R.D[k].forEach(d => D[k].push({ ecran: ecran.nom, ...d }));
      charges.push({ passe: passe.nom, ecran: ecran.nom, ...R.info });
      await page.addStyleTag({ content: `*,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important;transition:none!important}
        ::placeholder{color:transparent!important} svg text,svg tspan{fill:transparent!important} button svg,[role] svg,a svg,svg.ico,.ico{visibility:hidden!important}
        :focus,:focus-visible{outline-color:transparent!important}` }).then(h => h.evaluate(n => n.id = 'ux-sans-encre'));
      await page.waitForTimeout(40);
      const png = await page.screenshot(), fond = lirePng(png);
      if (FONDS) fs.writeFileSync(path.join(FONDS, `${ecran.nom}-${passe.nom}-fond.png`), png);
      await page.evaluate(() => { document.getElementById('ux-sans-encre').remove(); document.getAnimations().forEach(a => { if (a instanceof CSSTransition) a.finish(); }); });
      for (const t of R.textes) { const ratios = [];
        for (const [x0, y0, x1, y1] of t.rs) for (const fx of [.2, .5, .8]) for (const fy of [.25, .5, .75]) { const b = fond.at(x0 + (x1 - x0) * fx, y0 + (y1 - y0) * fy); ratios.push({ r: contraste(poser(t.c, b), b), b }); }
        const m = mediane(ratios.map(x => x.r)); if (m >= t.seuil - 0.005) continue; const b = ratios.find(x => Math.abs(x.r - m) < 1e-9).b;
        D.contrastes.push({ ecran: ecran.nom, sel: t.sel, pire: m, detail: rapport(m) + ' < ' + String(t.seuil).replace('.', ',') + (t.eteint ? ' (éteint)' : '') + ' — encre ' + hex(poser(t.c, b)) + ' sur ' + hex(b) + ', ' + Math.round(t.px) + ' px', txt: t.txt }); }
      for (const i of R.icones) { const [x0, y0, x1, y1] = i.r, rs = [];
        for (const fx of [.3, .5, .7]) for (const fy of [.3, .5, .7]) { const b = fond.at(x0 + (x1 - x0) * fx, y0 + (y1 - y0) * fy); rs.push({ r: contraste(poser(i.c, b), b), b }); }
        const m = mediane(rs.map(x => x.r)); if (m >= 2.995) continue; const b = rs.find(x => Math.abs(x.r - m) < 1e-9).b;
        D.contrastes.push({ ecran: ecran.nom, sel: i.sel + ' svg', pire: m, detail: rapport(m) + ' < 3 (icône' + (i.eteint ? ', éteinte' : '') + ') — trait ' + hex(poser(i.c, b)) + ' sur ' + hex(b) }); }
      for (const c of R.champs) { const [x0, y0, x1, y1] = c.r, my = (y0 + y1) / 2, mx = (x0 + x1) / 2;
        const dehors = [fond.at(x0 - 3, my), fond.at(x1 + 3, my), fond.at(mx, y0 - 3), fond.at(mx, y1 + 3)], dedans = fond.at(x0 + Math.min(12, (x1 - x0) / 3), y0 + 4);
        const r = Math.max(...dehors.map(o => Math.max(c.bord ? contraste(poser([...c.bord.slice(0, 3), c.bord[3] * c.op], o), o) : 1, contraste(dedans, o))).sort((a, b) => a - b).slice(1, 3));
        if (r < 2.995) D.contrastes.push({ ecran: ecran.nom, sel: c.sel, pire: r, detail: rapport(r) + ' < 3 (le bord du champ, ou son fond, sur ce qui l’entoure)' + (c.bord ? ' — bord ' + hex(poser(c.bord, dehors[0])) + ' sur ' + hex(dehors[0]) : ' — sans bord') }); }

      if (ecran.choix && gestes) (await ecran.choix(page)).forEach(d => D.choix.push({ ecran: ecran.nom, ...d }));
      if (ecran.lecture && gestes) (await ecran.lecture(page)).forEach(d => D.lecture.push({ ecran: ecran.nom, ...d }));

      // 2. LES BULLES des boutons qui n'ont qu'une icône : elles paraissent au survol, et au clavier (une fois par passe chacune)
      const icones = await page.evaluate(() => [...document.querySelectorAll('button, [role=button], a[href], [role=menuitem], [role=tab]')].filter(e => {
        if (e.closest('#svg, [aria-hidden="true"]') || e.disabled || !e.checkVisibility({ opacityProperty: true, visibilityProperty: true }) || !e.querySelector('svg')) return false;
        const r = e.getBoundingClientRect(); if (r.width < 4 || r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) return false;
        let t = ''; const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); for (let n; (n = w.nextNode());) if (!n.parentElement.closest('[aria-hidden="true"], .bulle') && n.parentElement.checkVisibility({ opacityProperty: true })) t += n.data;
        if (t.trim()) return false; const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return h && (h === e || e.contains(h)); })
        .map(e => { const r = e.getBoundingClientRect(); return { sel: window.__ux.nom(e), x: r.left + r.width / 2, y: r.top + r.height / 2 }; }));
      const sous = ([x, y]) => { const e = document.elementFromPoint(x, y), c = e && e.closest('button, [role=button], a, [role=menuitem], [role=tab]'); if (!c) return null; c.dataset.uxIci = '1'; const v = window.__ux.bulleVue('[data-ux-ici="1"]'); delete c.dataset.uxIci; return v; };
      for (const b of gestes ? icones : []) { if (bullesVues.has(b.sel) || D.noms.some(d => d.sel === b.sel)) continue; bullesVues.add(b.sel);   // sans bulle du tout : déjà dit
        await page.mouse.move(b.x, b.y); await page.waitForTimeout(470); const souris = await page.evaluate(sous, [b.x, b.y]);
        await page.mouse.move(3, passe.H - 3); await page.waitForTimeout(80); await page.keyboard.press('Shift');
        const pose = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y), c = e && e.closest('button, [role=button], a, [role=menuitem], [role=tab]'); if (!c) return false; c.focus({ preventScroll: true }); return document.activeElement === c; }, [b.x, b.y]);
        await page.waitForTimeout(250); const clavier = pose ? await page.evaluate(sous, [b.x, b.y]) : null;
        await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
        if (souris === false) D.noms.push({ ecran: ecran.nom, sel: b.sel, detail: 'une icône seule : au survol (470 ms), aucune bulle ne paraît' });
        else if (clavier === false) D.noms.push({ ecran: ecran.nom, sel: b.sel, detail: 'une icône seule : au clavier (250 ms), sa bulle ne paraît pas — elle ne vient qu’à la souris' }); }

      // 3. LE CLAVIER : chaque élément qui prend le clavier, son anneau ; puis Tab, quinze fois, depuis où l'écran a mis le clavier
      const etat = await page.evaluate(() => window.__ux.nom(document.activeElement));
      await page.keyboard.press('Shift');   // la modalité clavier : :focus-visible s'applique au focus posé par script
      const F = await page.evaluate(() => window.__ux.focus());
      F.D.forEach(d => D.focus.push({ ecran: ecran.nom, ...d }));
      for (const a of F.anneaux) { const [x0, y0, x1, y1] = a.r, d = a.d, my = (y0 + y1) / 2, mx = (x0 + x1) / 2, rs = [];
        for (const [x, y] of [[x0 - d, my], [x1 + d, my], [mx, y0 - d], [mx, y1 + d]]) { const b = fond.at(x, y); rs.push(contraste(poser(a.c, b), b)); }
        const m = mediane(rs); if (m < 2.995) D.focus.push({ ecran: ecran.nom, sel: a.sel, pire: m, detail: 'l’anneau du focus (' + a.sorte + ') ne fait que ' + rapport(m) + ' sur ce qui l’entoure (3:1 au moins)' }); }
      await page.evaluate(s => { const e = s === 'body' ? null : document.querySelector(s); if (e && e.focus) e.focus({ preventScroll: true }); else if (document.activeElement) document.activeElement.blur(); }, etat).catch(() => {});
      const parcours = new Set(); let modaleQuittee = false;
      for (let i = 0; i < (gestes ? 15 : 0); i++) { await page.keyboard.press('Tab'); const c = await page.evaluate(() => window.__ux.clavierIci());
        if (ecran.modale && !c.modale && !c.corps && !modaleQuittee) modaleQuittee = c.sel;
        if (c.modaleDerriere) continue;
        if (!c.vu && !parcours.has(c.sel)) { parcours.add(c.sel); D.focus.push({ ecran: ecran.nom, sel: c.sel, detail: 'Tab y mène, mais on ne le voit pas : ' + c.pourquoi, txt: c.txt }); } }
      if (modaleQuittee) D.focus.push({ ecran: ecran.nom, sel: modaleQuittee, detail: 'Tab sort de la feuille modale (aria-modal) et va derrière elle' });

      // 4. ÉCHAP : ce qui est ouvert se ferme, ce qui est dessous reste, le clavier revient à l'ouvreur (jamais à la page)
      if (ecran.echap && gestes) { const E = ecran.echap, mot = E.mot || ecran.nom, attendu = E.appuis || 1;
        try { await remettre(page); await ecran.aller(page, []); await page.evaluate(t => { document.documentElement.dataset.theme = t; }, passe.theme); await page.waitForTimeout(150);
          if (!await page.evaluate(E.ouvert)) echaps.push({ ecran: ecran.nom, ok: false, nom: `Échap : ${mot}`, detail: 'pas ouvert avant Échap (le geste de l’écran a échoué)' });
          else { let appuis = 0, ferme = false;
            while (appuis < attendu + 1 && !ferme) { await page.keyboard.press('Escape'); appuis++; await page.waitForTimeout(280); ferme = !await page.evaluate(E.ouvert); }
            const reste = E.reste ? await page.evaluate(E.reste) : true, ou = await page.evaluate(() => window.__ux.nom(document.activeElement));
            const retour = !E.retour || await page.evaluate(s => { const e = document.activeElement; return !!e && s.split(',').some(x => { const c = document.querySelector(x.trim()); return !!c && (c === e || c.contains(e)); }); }, E.retour);
            const pourquoi = !ferme ? `toujours ouvert après ${appuis} appuis` : appuis > attendu ? `il faut ${appuis} appuis` : !reste ? 'Échap ferme aussi ce qui était dessous' : !retour ? `le clavier va à ${ou}, pas à ${E.retour.split(',')[0]}` : '';
            echaps.push({ ecran: ecran.nom, ok: !pourquoi, nom: `Échap : ${mot}`, detail: pourquoi || `${appuis} appui${appuis > 1 ? 's' : ''}, le clavier à ${ou}` }); } }
        catch (e) { echaps.push({ ecran: ecran.nom, ok: false, nom: `Échap : ${mot}`, detail: 'le test n’a pas pu se faire : ' + e.message.split('\n')[0].slice(0, 120) }); } }
      // un document ouvert par le menu : le clavier entre-t-il dedans (Tab, Échap, ses gestes) ?
      if (ecran.document && gestes) { await remettre(page); await ecran.aller(page, []);
        const ou = await page.evaluate(() => $('fiche').contains(document.activeElement) ? '' : window.__ux.nom(document.activeElement));
        echaps.push({ ecran: ecran.nom, ok: !ou, nom: `le clavier entre dans ${ecran.echap.mot}`, detail: ou ? 'il reste à ' + ou : '' }); }
      const ch = charges.find(c => c.passe === passe.nom && c.ecran === ecran.nom); if (ch) ch.ms = Date.now() - t0;
    }
    erreurs.forEach(e => D.erreurs.push({ ecran: 'page', ...e }));

    // le verdict de la passe : une ligne par règle, chaque défaut dessous (Échap : une ligne par écran)
    for (const [k, libelle] of CATEGORIES) {
      if (k === 'echap') { for (const e of echaps) { ok(e.ok, e.nom, e.detail); if (!e.ok) lister('echap', [{ ecran: e.ecran, sel: e.nom, detail: e.detail }], passe.nom, true); } continue; }
      if (GESTES.has(k) && (!gestes || !ECRANS.some(e => e[k]))) continue;   // une règle qu'aucun écran choisi ne juge ne s'écrit pas
      const n = D[k].length ? new Set(D[k].map(cle)).size : 0;
      ok(!n, libelle, n ? n + ' défaut' + (n > 1 ? 's' : '') : ''); if (n) lister(k, D[k], passe.nom); }
    await page.close(); }

  /* LE MOUVEMENT RÉDUIT : une page neuve sous `prefers-reduced-motion: reduce`, les mêmes écrans, l'enregistreur posé dès
     le chargement ; la souris passe sur la table, le plan se déplace : rien ne doit bouger de plus de 0,01 s */
  if (!SANS_MOUVEMENT) for (const passe of PASSES.slice(0, 1)) {
    console.log(`\nmouvement réduit · ${passe.W} × ${passe.H}`);
    const page = await nav.newPage({ viewport: { width: passe.W, height: passe.H }, reducedMotion: process.env.UX_TEMOIN ? 'no-preference' : 'reduce' }); page.setDefaultTimeout(60000);
    const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
    await page.addInitScript(enregistreur);
    await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined' && typeof BIB !== 'undefined' && BIB.pret, null, { timeout: 120000 });
    await page.emulateMedia({ reducedMotion: process.env.UX_TEMOIN ? 'no-preference' : 'reduce' }); await page.evaluate(socle);
    const statiques = [];
    for (const ecran of ECRANS) { await page.evaluate(n => { window.__mvt.on = true; window.__mvt.ecran = n; }, ecran.nom);
      try { if (ecran.nom !== 'accueil' && ecran.nom !== 'plan') await remettre(page); await ecran.aller(page, []); } catch (e) { continue; }
      // la souris traverse la table, la molette déplace la vue : la lueur et les points restent où ils sont
      await page.mouse.move(passe.W * .3, passe.H * .5); await page.mouse.move(passe.W * .7, passe.H * .4, { steps: 6 }); await page.waitForTimeout(300);
      // ce qui est déclaré : une animation ou une transition de plus de 0,01 s sur un élément rendu
      const s = await page.evaluate(() => { const out = [], d = v => Math.max(0, ...String(v).split(',').map(x => parseFloat(x) * (/ms/.test(x) ? 1 : 1000) || 0));
        for (const e of document.querySelectorAll('body *')) { if (e.closest('#svg') || !e.checkVisibility()) continue; const s = getComputedStyle(e);
          if (s.animationName !== 'none' && d(s.animationDuration) > 10) out.push({ sel: window.__ux.nom(e), quoi: 'animation ' + s.animationName + ' de ' + d(s.animationDuration) + ' ms (déclarée)' });
          if (s.transitionProperty !== 'none' && d(s.transitionDuration) > 10) out.push({ sel: window.__ux.nom(e), quoi: 'transition ' + s.transitionProperty + ' de ' + d(s.transitionDuration) + ' ms (déclarée)' }); }
        const l = document.querySelector('#table .ta-lueur'); if (l && l.checkVisibility() && +getComputedStyle(l).opacity > 0.02) out.push({ sel: '#table .ta-lueur', quoi: 'la lueur qui suit la souris est là' });
        return out.slice(0, 40); });
      s.forEach(x => statiques.push({ ...x, ecran: ecran.nom })); }
    const vus = await page.evaluate(() => [...window.__mvt.vus.values()]);
    const defauts = [...vus.map(v => ({ ecran: v.ecran, sel: v.sel, detail: v.quoi + (v.n > 1 ? ' (' + v.n + ' fois)' : '') })), ...statiques.map(v => ({ ecran: v.ecran, sel: v.sel, detail: v.quoi }))];
    if (!total.has('mouvement')) total.set('mouvement', new Map());
    const n = new Set(defauts.map(cle)).size;
    ok(!n, 'sous prefers-reduced-motion: reduce, rien ne bouge plus de 0,01 s (CSS, el.animate, défilement doux, vue du plan, table)', n ? n + ' défaut' + (n > 1 ? 's' : '') : '');
    if (n) lister('mouvement', defauts, 'mouvement-' + passe.W);
    ok(!erreurs.length, 'aucune erreur de page (mouvement réduit)', erreurs.slice(0, 3).join(' | '));
    await page.close(); }

  // LA CHARGE : ce qu'il y a à lire et à viser par écran (une mesure, pas un contrôle)
  if (!COURT && charges.length) { console.log('\nla charge de chaque écran (' + PASSES[0].nom + ') : mots lisibles · cibles · dont moins de 32 px   (durée du juge)');
    for (const c of charges.filter(c => c.passe === (PASSES[0] || {}).nom)) console.log('        ' + c.ecran.padEnd(26) + String(c.mots).padStart(5) + ' mots ' + String(c.cibles).padStart(5) + ' cibles ' + String(c.petites32).padStart(5) + '   (' + (c.ms / 1000).toFixed(1) + ' s)'); }

  // LE RÉSUMÉ : les défauts distincts, toutes passes, par sorte
  console.log('\nrésumé — les défauts distincts (un sélecteur et une sorte), toutes passes confondues :');
  let defauts = 0; for (const [k, m] of total) { const lib = (CATEGORIES.find(c => c[0] === k) || [k, k === 'mouvement' ? 'le mouvement réduit' : k])[1]; defauts += m.size;
    console.log('    ' + String(m.size).padStart(4) + '  ' + k.padEnd(11) + (m.size ? '' : '  —') + (m.size ? '  ' + lib.split(' : ')[0].split(';')[0] : '')); }
  console.log('\n  ' + (ko ? `${ko} échec(s) · ${defauts} défaut(s) distinct(s) · ${oks} contrôles passés sur ${ko + oks}` : 'tout tient'));
  await nav.close(); process.exit(ko ? 1 : 0);
})();
