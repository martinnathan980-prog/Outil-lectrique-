/* ===========================================================================
   08 sexies — LA COURBE DE DÉCLENCHEMENT : le dessin du disjoncteur
   ---------------------------------------------------------------------------
   Le lecteur (version 57) : « La seule justification qu'on veut, c'est la
   courbe : tout doit être sur la courbe. Elle est bien, mais les traits ne
   sont pas propres, ça fait enfant, pas smooth. Les calibres voisins on s'en
   fiche. Les températures il nous les faut de base : pas de bouton.
   N'importe qui doit comprendre en un coup d'œil : je suis dans la zone,
   valide ou pas, je déclenche ou pas. »
   Le dessin, comme la figure d'une fiche de constructeur (E-T-A, Sensata) :
     · LE PAPIER : une vraie grille log-log — les décades en trait plein
       léger, les sous-divisions 2 à 9 plus fines —, les secondes nommées
       à gauche (0,01 s à 10 000 s) et, en bas, les MULTIPLES DU COURANT
       NOMINAL (0,5 · 1 · 2 · 5 · 10… In : le lecteur, version 61, « le
       graphique n'est pas en ampères, il est en courants nominaux ») ;
     · LES QUATRE COURBES de la famille du part number, toujours (MS3320 :
       ETA483, les 125 °C, 23 °C min et max, −55 °C de l'Excel), LISSES :
       une spline de lissage monotone et convexe ajustée aux points lus — la
       courbe ne passe plus par chacun, elle les résume (`lissage`) ; la plus
       rapide et la plus lente à l'encre, celles d'entre elles plus douces ;
       chacune nommée juste au-dessus de sa sortie du cadre par sa
       température — sans trait qui dépasse du cadre (version 61) ;
     · LE VERDICT DANS LE DESSIN : trois fonds très légers — à gauche de la
       courbe la plus rapide, le disjoncteur « ne déclenche pas » (vert) ;
       entre les courbes, la bande où cela dépend de la température (gris) ;
       à droite de la plus lente, il « déclenche » (rouge) — ; le profil de
       charge en escalier, chaque marche et chaque point de la couleur de son
       sort (passe en vert, juste en ambre, déclenche en rouge), nommés court ; plus de
       limite de dommage du câble (version 61 : elle se juge, elle ne se
       dessine plus) ;
     · aucune légende à part, aucune étiquette sur une autre, pas de carte
       autour : le dessin est sur papier blanc dans les deux thèmes.
   La fiche l'appelle par deux portes, et seulement par elles :
   `grapheSvg(d, vue, W)` rend le SVG (posé dans `.dj-graphe`, à la largeur
   où il se pose : 1 unité = 1 pixel, net à 100 et à 200 %) — `vue` ne choisit
   plus rien, tout se montre toujours ; `lierGraphique(fig, nom, E, lire,
   ecrire, retenir)` le rend vivant : la bulle d'un point, le réticule,
   glisser un point, la bande qui glisse quand le calibre change (`retenir`
   n'a plus d'usage ici : on ne retient plus un voisin sur la courbe). Le
   JUGEMENT reste celui du moteur (09 bis), sur les points lus : on ne lisse
   que le dessin, à 5 % au plus en temps de chacun (tests/disjoncteur.js).
   =========================================================================== */
'use strict';

/* La vue que la fiche passe encore à `grapheSvg` : il n'y a plus rien à choisir (les bascules sont parties). */
const DJ_VUE = Object.freeze({});

/* ---- la géométrie --------------------------------------------------------------------- */
/* Le calcul est en ampères (le profil s'écrit en ampères), le dessin en log-log : six décades de temps, 10 ms en bas,
   10 000 s en haut (le permanent dure toujours : il se pose sur le bord du haut). L'abscisse prend les décades qui
   couvrent le profil et la bande du calibre retenu ; elle se lit en multiples de In (`grapheIn`). Les marges : à gauche
   le titre du temps et ses décades, en haut les températures au-dessus de la sortie des courbes, en bas les multiples de
   In et le titre du courant. */
const DJG = { L: 64, R: 16, T: 50, B: 50, ylo: -2, yhi: 4, ubas: -2.4, uhaut: 4.4 };
// (la largeur de la figure : celle de la fiche, moins ses deux marges de 20 px)
function largeurGrapheEstimee() { const b = typeof $ === 'function' ? $('ba-equip') : null; return b && b.clientWidth > 200 ? b.clientWidth - 40 : 392; }
function geometrieGraphe(d, W) { W = Math.max(300, Math.round(W || 392)); const { L, R, T, B, ylo, yhi } = DJG;
  const hp = Math.round(Math.max(240, Math.min(380, (W - L - R) * 0.86))), H = T + hp + B, rapide = d.courbes[0], cal = d.calibre, I = d.points.map(p => p.i).filter(i => i > 0);
  const bas = [...I, cal ? cal * rapide.points[0].m : Infinity].filter(x => x > 0 && isFinite(x));
  const hauts = [...I.map(i => i * 1.5), cal ? cal * multipleAdmis(rapide, 0.02) : 0];
  let xlo = Math.floor(Math.log10((bas.length ? Math.min(...bas) : 1) / 1.4) + 1e-9), xhi = Math.ceil(Math.log10(Math.max(...hauts, 1e-9)) - 1e-9); if (xhi - xlo < 2) xhi = xlo + 2;
  const kx = (W - L - R) / (xhi - xlo), ky = hp / (yhi - ylo), xv = v => L + (v - xlo) * kx, yu = u => T + (yhi - u) * ky;
  return { W, H, L, R, T, B, xlo, xhi, ylo, yhi, kx, ky, xv, yu, X: i => xv(Math.log10(i)), Y: t => yu(Math.max(ylo, Math.min(yhi, Math.log10(t)))),
    iDe: x => Math.pow(10, xlo + (x - L) / kx), tDe: y => Math.pow(10, yhi - (y - T) / ky), dx: c => c > 0 ? Math.log10(c) * kx : 0 }; }

/* ---- le lissage : une spline monotone et convexe, ajustée aux points lus ---------------- */
/* Les points d'une courbe de la norme sont lus à la main sur une figure : ils tremblent d'un pour cent, et une courbe qui
   passe par chacun tremble aussi (« ça fait enfant »). Le dessin n'y passe plus : il AJUSTE à chaque courbe, en log-log —
   le log du multiple selon le log du temps, v(u) —, une spline de lissage (une P-spline d'Eilers et Marx : une B-spline
   cubique, un nœud tous les quarts de décade, la somme des carrés des écarts aux points plus λ fois celle des différences
   secondes de ses coefficients), tenue
     · MONOTONE : le multiple admis ne remonte jamais quand la durée croît ;
     · CONVEXE : la pente ne fait que se redresser, de la pente des forts multiples à la verticale de l'asymptote — ni
       bosse, ni inflexion : la forme d'un bilame, celle des fiches de constructeur ;
   (deux contraintes sur les coefficients — leurs différences premières négatives, leurs différences secondes positives —,
   posées là où elles manquent puis réajustées, jusqu'à ce qu'aucune ne manque). Au-delà du point le plus long, le multiple
   ne change plus (la règle du moteur : trois points virtuels à sa hauteur, puis la spline tenue à plat) : la courbe y
   rejoint sa verticale peu à peu. En deçà du point le plus court, la pénalité la prolonge en droite. λ : le plus fort
   (de 10⁴ à 10⁻³, d'une demi-décade à l'autre) qui tienne la courbe à 5 % EN TEMPS de chaque point là où elle penche
   (moins de 8 décades de temps par décade de courant), à 2 % EN MULTIPLE sur son asymptote (là, 1 % de courant vaut des
   dizaines de % de temps : c'est le courant qui se lit) ; à défaut, celui qui s'en approche le plus — et si la forme
   convexe ne le peut pas (une norme écrite à la main), monotone seulement. Sur les vingt-quatre courbes de la norme, la
   convexe tient partout : l'ETA483 du lecteur à 3,7 – 5 % en temps, 0,9 % en multiple sur l'asymptote, à 3,5 % au plus
   de la courbe du moteur. Les modèles thermiques essayés d'abord — t = τ · ln(M² / (M² − M0²)) d'un bilame, avec un
   exposant, une seconde constante de temps, un temps propre du mécanisme — ne suivent pas l'ETA483 à mieux de 13 à 30 %
   en temps : sa pente passe de −3 au genou à −1,2 vers 80 In. Le jugement, lui, reste sur les points lus. Rend { val,
   der, u0, u1, pas, ecart, lambda, convexe } ou null. */
const LISSAGE = { pas: 0.25, tolTemps: 0.05, tolMultiple: 0.02, asymptote: 8, virtuels: 0.3 };
const LISSES = new WeakMap();   // par courbe (le moteur garde ses courbes : `courbesDeDisjonction`)
// la B-spline cubique uniforme en x (en pas, x dans [0, K]) : l'intervalle et les valeurs (et dérivées) des quatre bases non nulles
function bspline(x, K) { x = Math.max(0, Math.min(K - 1e-9, x)); const j = Math.floor(x), t = x - j, t2 = t * t, t3 = t2 * t, s = 1 - t;
  return { j, b: [s * s * s / 6, (3 * t3 - 6 * t2 + 4) / 6, (-3 * t3 + 3 * t2 + 3 * t + 1) / 6, t3 / 6], d: [-s * s / 2, (3 * t2 - 4 * t) / 2, (-3 * t2 + 2 * t + 1) / 2, t2 / 2] }; }
// un système linéaire, par le pivot de Gauss (une trentaine d'inconnues)
function resoudreLineaire(A, b) { const n = b.length, M = A.map((r, i) => r.concat([b[i]]));
  for (let k = 0; k < n; k++) { let p = k; for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i; const x = M[k]; M[k] = M[p]; M[p] = x;
    for (let i = k + 1; i < n; i++) { const f = M[i][k] / M[k][k]; if (f) for (let j = k; j <= n; j++) M[i][j] -= f * M[k][j]; } }
  const x = Array(n).fill(0); for (let i = n - 1; i >= 0; i--) { let s = M[i][n]; for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; } return x; }
/* Une spline ajustée pour un λ : `o` = { u0, K, plat (le premier coefficient tenu à plat), convexe }. */
function ajusterSpline(pts, lambda, o) { const { u0, K, plat, convexe } = o, pas = LISSAGE.pas, m = K + 3, FORT = 1e6;
  const A = Array.from({ length: m }, () => Array(m).fill(0)), r = Array(m).fill(0);
  pts.forEach(p => { const { j, b } = bspline((p.u - u0) / pas, K); for (let a = 0; a < 4; a++) { r[j + a] += b[a] * p.v; for (let c = 0; c < 4; c++) A[j + a][j + c] += b[a] * b[c]; } });
  // une pénalité sur une différence de coefficients (ses poids w à partir de i) : ajoutée à la matrice
  const penal = (P, i, w, k) => w.forEach((wa, a) => w.forEach((wb, b) => { P[i + a][i + b] += k * wa * wb; }));
  const mono = new Set(), conv = new Set(); let c = null;
  for (let it = 0; it < 40; it++) { const P = A.map(x => x.slice());
    for (let i = 0; i < m - 2; i++) penal(P, i, [1, -2, 1], lambda + (conv.has(i) ? FORT : 0));
    for (let i = 0; i < m - 1; i++) { const k = (i + 1 >= plat ? FORT : 0) + (mono.has(i) ? FORT : 0); if (k) penal(P, i, [-1, 1], k); }
    c = resoudreLineaire(P, r); let neuf = false;
    for (let i = 0; i < m - 1; i++) if (c[i + 1] - c[i] > 1e-12 && !mono.has(i)) { mono.add(i); neuf = true; }
    if (convexe) for (let i = 0; i < m - 2; i++) if (c[i + 2] - 2 * c[i + 1] + c[i] < -1e-12 && !conv.has(i)) { conv.add(i); neuf = true; }
    if (!neuf) break; }
  const en = (u, k) => { const B = bspline((u - u0) / pas, K), w = k ? B.d : B.b; return w.reduce((s, x, a) => s + x * c[B.j + a], 0) / (k ? pas : 1); };
  return { val: u => en(u, 0), der: u => en(u, 1), u0, u1: u0 + K * pas, pas }; }
/* L'écart d'une spline aux points : en temps là où elle penche (le temps où elle atteint le multiple du point, cherché
   par dichotomie), en multiple sur l'asymptote. */
function ecartAuxPoints(F, pts) { let temps = 0, multiple = 0;
  const uDe = v => { let a = F.u0, b = F.u1; if (v >= F.val(a)) return a; if (v <= F.val(b)) return Infinity; for (let k = 0; k < 50; k++) { const mi = (a + b) / 2; if (F.val(mi) > v) a = mi; else b = mi; } return (a + b) / 2; };
  pts.forEach(p => { const d = F.der(p.u);
    if (Math.abs(d) * LISSAGE.asymptote > 1) { const u = uDe(p.v); temps = Math.max(temps, isFinite(u) ? Math.abs(Math.pow(10, u - p.u) - 1) : Infinity); }
    else multiple = Math.max(multiple, Math.abs(Math.pow(10, F.val(p.u) - p.v) - 1)); });
  return { temps, multiple }; }
/* LE LISSAGE de points (u, v) — `haut` : le multiple (log) au-delà du point le plus long. */
function lissage(pts, haut) { if (!pts.length) return null; const umin = Math.min(...pts.map(p => p.u)), umax = Math.max(...pts.map(p => p.u)), pas = LISSAGE.pas, V = LISSAGE.virtuels;
  const u0 = Math.min(DJG.ubas - 0.2, umin - 0.1), K = Math.ceil((umax + V + 1 - u0) / pas), plat = Math.ceil((umax + V - u0) / pas) + 3;
  const appuis = pts.concat(isFinite(haut) ? [1, 2, 3].map(j => ({ u: umax + j * V / 3, v: haut })) : []);
  const essai = convexe => { let best = null;
    for (let e = 4; e >= -3; e -= 0.5) { const F = ajusterSpline(appuis, Math.pow(10, e), { u0, K, plat, convexe }), ecart = ecartAuxPoints(F, pts), note = Math.max(ecart.temps / LISSAGE.tolTemps, ecart.multiple / LISSAGE.tolMultiple);
      if (!best || note < best.note - 1e-9) best = { F, ecart, note, lambda: Math.pow(10, e), convexe }; if (note <= 1) break; }
    return best; };
  let r = essai(true); if (r.note > 2) { const m = essai(false); if (m.note < r.note) r = m; }
  return { ...r.F, ecart: r.ecart, lambda: r.lambda, convexe: r.convexe }; }
/* LA COURBE LISSE d'une courbe de disjonction, au calibre 1 A (le multiple vaut l'ampère : un calibre la décale de
   log10(calibre) décades) : ses points lus (`brut`), son asymptote celle du moteur (le premier point de son enveloppe). */
function courbeLisse(c) { if (LISSES.has(c)) return LISSES.get(c);
  const pts = (c.brut && c.brut.length ? c.brut : c.points).filter(p => p.t > 0 && p.m > 0).map(p => ({ u: Math.log10(p.t), v: Math.log10(p.m) }));
  const F = lissage(pts, c.points.length ? Math.log10(c.points[0].m) : NaN); LISSES.set(c, F); return F; }

/* ---- les tracés -------------------------------------------------------------------------- */
/* LE TRACÉ d'une spline, en pixels, du haut vers le bas : la verticale de l'asymptote du bord du haut (au-dessus du cadre)
   jusqu'à la fin du lissage, puis un Bézier par quart de décade. Entre deux nœuds la spline est un polynôme de degré 3 :
   sa forme de Hermite (les valeurs et les pentes aux deux bouts) donne le Bézier EXACT, et le passage en pixels, affine
   en log-log, le garde exact. Rend { haut, coude, segs, fin }. */
function traceSpline(F, G) { if (!F) return null; const uS = Math.min(F.u1, DJG.uhaut), us = [uS];
  for (let k = Math.floor((uS - F.u0) / F.pas - 1e-9); k >= 0; k--) us.push(F.u0 + k * F.pas);
  const segs = []; for (let k = 0; k < us.length - 1; k++) { const a = us[k], b = us[k + 1], h = b - a, va = F.val(a), vb = F.val(b), da = F.der(a), db = F.der(b);
    segs.push([[a, va], [a + h / 3, va + da * h / 3], [b - h / 3, vb - db * h / 3], [b, vb]].map(([u, v]) => [G.xv(v), G.yu(u)])); }
  const x0 = G.xv(F.val(uS)); return { haut: [x0, G.yu(DJG.uhaut)], coude: [x0, G.yu(uS)], segs, fin: segs.length ? segs[segs.length - 1][3] : [x0, G.yu(uS)] }; }
const traceLisse = (c, G) => traceSpline(courbeLisse(c), G);
const f2 = n => String(Math.round(n * 1000) / 1000);   // trois décimales : arrondir au centième faisait trembler la tangente
const pt2 = p => f2(p[0]) + ' ' + f2(p[1]);
// un filet d'un pixel tombe sur la grille des pixels : net à 100 % comme à 200 %
const net = v => Math.floor(v) + 0.5;
// du haut vers le bas (sans le premier point), puis, pour fermer une bande, du bas vers le haut
const suite = tr => ` L${pt2(tr.coude)}` + tr.segs.map(s => ` C${pt2(s[1])} ${pt2(s[2])} ${pt2(s[3])}`).join('');
const descente = tr => `M${pt2(tr.haut)}` + suite(tr);
const montee = tr => ` L${pt2(tr.fin)}` + tr.segs.slice().reverse().map(s => ` C${pt2(s[2])} ${pt2(s[1])} ${pt2(s[0])}`).join('') + ` L${pt2(tr.haut)}`;
const bandeDe = (a, b) => descente(a) + montee(b) + ' Z';
// le fond d'un côté d'un tracé (−1 : à sa gauche, 1 : à sa droite), jusqu'au loin — le cadre le coupe
const fondDe = (tr, cote) => { const loin = cote < 0 ? -4000 : 8000; return `M${f2(loin)} ${f2(tr.haut[1])} L${pt2(tr.haut)}` + suite(tr) + ` L${f2(loin)} ${f2(tr.fin[1])} Z`; };
/* Des points le long d'un tracé (pour que les étiquettes ne se posent pas dessus), décalés de `dx`. */
function echantillons(tr, dx, haut) { const out = [], h = haut != null ? haut : DJG.T, bz = (s, t) => { const u = 1 - t; return [0, 1].map(j => u * u * u * s[0][j] + 3 * u * u * t * s[1][j] + 3 * u * t * t * s[2][j] + t * t * t * s[3][j]); };
  // la part visible seulement : au-dessus du cadre, le trait est coupé (la marge du haut reste aux noms)
  for (let y = Math.max(tr.haut[1], h); y < tr.coude[1]; y += 4) out.push([tr.coude[0] + dx, y]);
  // un échantillon tous les 4 pixels environ (la longueur du polygone de contrôle borne celle du segment)
  tr.segs.forEach(s => { const lg = Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]) + Math.hypot(s[2][0] - s[1][0], s[2][1] - s[1][1]) + Math.hypot(s[3][0] - s[2][0], s[3][1] - s[2][1]), n = Math.max(4, Math.ceil(lg / 4));
    for (let k = 0; k <= n; k++) { const p = bz(s, k / n); if (p[1] >= h) out.push([p[0] + dx, p[1]]); } }); return out; }
// l'abscisse d'un tracé à une hauteur (l'échantillon le plus proche de cette hauteur)
const xA = (ech, y) => { let best = null; for (const p of ech) if (best == null || Math.abs(p[1] - y) < Math.abs(best[1] - y)) best = p; return best ? best[0] : null; };

/* ---- les étiquettes ------------------------------------------------------------------- */
/* Posées sans chevaucher : la largeur d'un texte en Inter, estimée (le dessin se fait en chaîne, avant la page) ; un
   « poseur » garde les boîtes prises (traits, points, étiquettes) et essaie, pour chaque étiquette, ses places dans
   l'ordre de préférence — la première libre gagne ; sans place, l'étiquette se tait (la bulle du survol la dit). */
const largeurEtiquette = (s, px) => [...String(s)].reduce((w, c) => w + (/[0-9]/.test(c) ? 0.6 : /[A-Z]/.test(c) ? 0.68 : /[ ,.·:;’'()\u00a0]/.test(c) ? 0.3 : c === '°' ? 0.42 : /[mw]/.test(c) ? 0.86 : /[iljtfr]/.test(c) ? 0.34 : 0.56), 0) * px;
function poseur(G) { const pris = [];
  // dans le cadre — ou, pour une étiquette marquée `haut`, dans la marge du haut, au bout d'un trait qui sort par là ; deux
  // étiquettes d'un même rang gardent 3 pixels entre elles, pour ne pas se lire comme une seule
  const dedans = b => b.haut ? b.x0 >= 2 && b.x1 <= G.W - 2 && b.y0 >= 0 : b.x0 >= G.L + 2 && b.x1 <= G.W - G.R - 2 && b.y0 >= G.T + 1 && b.y1 <= G.H - G.B - 2;
  // (une étiquette qui veut plus d'air autour d'elle — un fond nommé — le dit : `gx`, `gy`)
  const libre = b => dedans(b) && !pris.some(o => { const n = o.e && b.e, gx = n ? Math.max(3, b.gx || 0, o.gx || 0) : 0, gy = n ? Math.max(b.gy || 0, o.gy || 0) : 0;
    return b.x0 < o.x1 + gx && b.x1 > o.x0 - gx && b.y0 < o.y1 + gy && b.y1 > o.y0 - gy; });
  return { pris, traits(ech, r) { ech.forEach(([x, y]) => pris.push({ x0: x - r, x1: x + r, y0: y - r, y1: y + r })); }, boite(b) { pris.push(b); },
    essayer(cands) { for (const c of cands) if (c && libre(c.b) && (c.ext || []).every(b => !pris.some(o => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0))) { pris.push(c.b, ...(c.ext || [])); return c; } return null; } }; }
/* Une étiquette candidate : des lignes [texte, classe, taille, suite?, classe de la suite?] — la suite se lit sur la même
   ligne, plus douce —, ancrée (start, end, middle) en (x, y), y la ligne de base de la première ; et sa boîte. */
function etiquette(lignes, x, y, ancre, haut) { const w = Math.max(...lignes.map(([t, , px, t2]) => largeurEtiquette(t + (t2 ? ' ' + t2 : ''), px))), x0 = ancre === 'end' ? x - w : ancre === 'middle' ? x - w / 2 : x;
  return { lignes, x, y, ancre, b: { x0: x0 - 2, x1: x0 + w + 2, y0: y - 9, y1: y + (lignes.length - 1) * 12 + 3, e: true, haut: !!haut } }; }
const etiquetteSvg = (e, cls, dx) => `<text class="dj-etiq${cls ? ' ' + cls : ''}" x="${f2(e.x - (dx || 0))}" y="${f2(e.y)}" text-anchor="${e.ancre}">${e.lignes.map(([t, c, , t2, c2], k) => `<tspan${c ? ` class="${c}"` : ''}${k ? ` x="${f2(e.x - (dx || 0))}" dy="12"` : ''}>${esc(t)}</tspan>${t2 ? `<tspan class="${c2 || 'v'}"> ${esc(t2)}</tspan>` : ''}`).join('')}</text>`;
/* Les places d'une étiquette le long d'un tracé : de chaque côté (`cotes` : -1 à gauche, 1 à droite), à des hauteurs
   prises de haut en bas (`sens` 1) ou de bas en haut (-1). */
function lelong(lignes, ech, G, cotes, sens, ecart) { const out = [], hs = [], bas = (lignes.length - 1) * 12 + 3; for (let y = G.T + 12; y <= G.H - G.B - 6; y += 12) hs.push(y); if (sens < 0) hs.reverse();
  // le trait penche : à droite, on se pose après le point le plus à droite qu'il atteint sur la hauteur du texte ; à gauche, avant le plus à gauche
  cotes.forEach(c => hs.forEach(y => { const xs = [xA(ech, y - 9), xA(ech, y - 3), xA(ech, y + bas)].filter(x => x != null); if (!xs.length) return;
    out.push(etiquette(lignes, (c < 0 ? Math.min(...xs) : Math.max(...xs)) + c * (ecart || 6), y, c < 0 ? 'end' : 'start')); })); return out; }

/* ---- ce que le dessin nomme ------------------------------------------------------------ */
/* Le rôle d'une courbe dans le dessin : un BORD de la bande (la plus rapide, qui juge l'intempestif ; la plus lente, qui dit
   ce qui passe jusqu'au câble), à l'encre ; une courbe d'entre elles (la paire de 23 °C de l'Excel), plus douce. */
const roleDe = (k, C) => k === 0 || k === C.length - 1 ? 'bord' : 'milieu';
// le nom d'une courbe au bout de son trait : sa température (« 125 °C » ; la paire « 23 °C min / max » se nomme une fois)
const nomDeTemperature = c => c.temperature != null ? nombre(Math.round(c.temperature * 10) / 10).replace('-', '−') + ' °C' : c.nom;
// « 1 000 », « 10 000 » : les décades se lisent groupées par trois
const milliers = n => nombre(n).replace(/^(\d+)(\d{3})(?!\d)/, '$1\u00a0$2');
const motTemps = e => e < 0 ? nombre(+Math.pow(10, e).toFixed(-e)) + '\u00a0s' : milliers(Math.pow(10, e)) + '\u00a0s';
const motCourant = e => e >= 3 ? milliers(Math.pow(10, e - 3)) + '\u00a0kA' : nombre(+Math.pow(10, e).toPrecision(3)) + '\u00a0A';
let DJ_CLIP = 0;

/* ---- le graphique ---------------------------------------------------------------------- */
/* LE PAPIER : les décades (traits pleins légers) et leurs sous-divisions 2 à 9 (plus fines), nommées — les secondes à
   gauche —, le titre du temps le long de son axe, celui du courant sous le cadre. L'abscisse est en MULTIPLES DU COURANT
   NOMINAL (le lecteur : « le graphique n'est pas en ampères, il est en courants nominaux : ne mets que les In ») : ses
   filets verticaux sont ceux des multiples de In (`filetsIn`, qui glissent avec la bande quand le calibre change) et ses
   chiffres aussi (`grapheIn`) ; sans calibre seulement, les ampères. Les fonds passent dessous, le cadre par-dessus. */
function papierSvg(G, cal) { const { L, R, T, B, H, W } = G, x0 = net(L), x1 = net(W - R - 1), y0 = net(T), y1 = net(H - B - 1);
  let fins = '', decades = '', mots = '';
  for (let e = G.ylo; e <= G.yhi; e++) { const y = G.yu(e);
    if (e > G.ylo && e < G.yhi) decades += `M${x0} ${f2(net(y))}H${x1}`;
    if (e < G.yhi) for (let k = 2; k <= 9; k++) fins += `M${x0} ${f2(net(G.yu(e + Math.log10(k))))}H${x1}`;
    mots += `<text class="dj-grad" x="${L - 7}" y="${f2(y + 3.5)}" text-anchor="end">${motTemps(e)}</text>`; }
  if (!cal) for (let e = G.xlo; e <= G.xhi; e++) { const x = G.xv(e);
    if (e > G.xlo && e < G.xhi) decades += `M${f2(net(x))} ${y0}V${y1}`;
    if (e < G.xhi) for (let k = 2; k <= 9; k++) fins += `M${f2(net(G.xv(e + Math.log10(k))))} ${y0}V${y1}`;
    mots += `<text class="dj-grad" x="${f2(x)}" y="${H - B + 17}" text-anchor="middle">${motCourant(e)}</text>`; }
  return `<path class="dj-filet fin" d="${fins}"/><path class="dj-filet" d="${decades}"/>`
    + mots + `<text class="dj-axe" transform="translate(13 ${f2(T + (H - B - T) / 2)}) rotate(-90)" text-anchor="middle">Temps de déclenchement</text>`
    + `<text class="dj-axe" x="${f2(L + (W - R - L) / 2)}" y="${H - 12}" text-anchor="middle">${cal ? 'Multiples du courant nominal (In)' : 'Courant'}</text>`; }
/* LES FILETS DES MULTIPLES DE In : les décades (0,1 · 1 · 10 · 100 In) et leurs sous-divisions, dessinés au calibre 1 A
   (le multiple vaut l'ampère) — le groupe qui les porte glisse avec la bande ; le cadre les coupe. */
function filetsIn(G, cal) { if (!cal) return ''; const lc = Math.log10(cal), y0 = net(G.T), y1 = net(G.H - G.B - 1); let fins = '', decades = '';
  for (let e = Math.floor(G.xlo - lc) - 1; e <= Math.ceil(G.xhi - lc) + 1; e++) { decades += `M${f2(G.xv(e))} ${y0}V${y1}`;
    for (let k = 2; k <= 9; k++) fins += `M${f2(G.xv(e + Math.log10(k)))} ${y0}V${y1}`; }
  return `<path class="dj-filet fin" d="${fins}"/><path class="dj-filet" d="${decades}"/>`; }
/* LES CHIFFRES DES MULTIPLES DE In, sous le cadre : 0,5 · 1 · 2 · 5 · 10 · 20 · 50 · 100 (comme la figure du
   constructeur : « multiples du courant nominal ») — décalés avec la bande ; seuls ceux qui tombent sous le cadre se
   nomment, et sans se toucher. */
function grapheIn(G, cal, dx) { if (!cal) return ''; let s = '', avant = -Infinity;
  [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].forEach(m => { const x = G.xv(Math.log10(m)) + dx; if (x < G.L - 0.5 || x > G.W - G.R + 0.5) return;
    const mot = nombre(m), w = largeurEtiquette(mot, 11); if (x - w / 2 < avant + 8) return; avant = x + w / 2;
    s += `<line class="dj-tic-in" x1="${f2(net(x - dx))}" y1="${G.H - G.B}" x2="${f2(net(x - dx))}" y2="${G.H - G.B + 4}"/><text class="dj-grad in" x="${f2(x - dx)}" y="${G.H - G.B + 17}" text-anchor="middle">${mot}</text>`; });
  return s; }
/* LE GRAPHIQUE : les fonds du verdict (ne déclenche pas · la bande · déclenche), le papier et ses filets en multiples de
   In, les quatre courbes du calibre retenu, le cadre, puis le profil en escalier et ses points, et les noms : au-dessus de
   la sortie des courbes (les températures), dans les fonds. Rend le SVG ; `vue` :
   plus rien à choisir ; `W` : la largeur en pixels. */
function grapheSvg(d, vue, W) { const G = geometrieGraphe(d, W), { L, R, T, B, H } = G, Wd = G.W, cal = d.calibre, C = d.courbes, clip = 'dj-clip-' + (++DJ_CLIP);
  const tr = C.map(c => traceLisse(c, G)), rapide = tr[0], lente = tr[tr.length - 1], dx = G.dx(cal), P = poseur(G), avecBande = !!(cal && rapide && lente);
  // ce que les étiquettes doivent éviter : chaque trait dessiné
  const ech = tr.map(t => t ? echantillons(t, dx, T) : []);
  if (avecBande) ech.forEach(e => P.traits(e, 2));
  // le profil et ses points, d'abord : ce sont eux qu'on lit
  const pts = pointsSvg(d.points, G, P);
  let fonds = '', courbes = '', noms = '', tics = '', zones = '';
  if (avecBande) {
    // les fonds : à gauche de la plus rapide, la bande entre les deux bords, à droite de la plus lente
    fonds = `<path class="dj-fond sur" d="${fondDe(rapide, -1)}"/>` + (C.length > 1 ? `<path class="dj-bande" d="${bandeDe(rapide, lente)}"/>` : '') + `<path class="dj-fond declenche" d="${fondDe(lente, 1)}"/>`;
    courbes = C.map((c, k) => tr[k] ? `<path class="dj-courbe ${roleDe(k, C)}" data-courbe="${k}" d="${descente(tr[k])}"><title>${esc(c.nom + ' · ' + amperes(cal))}</title></path>` : '').join('');
    // LES NOMS DANS LA MARGE DU HAUT, là où les traits sortent du cadre : la plus rapide à gauche de son trait, la plus lente à
    // droite, la paire d'entre elles (une même température, min et max) au-dessus d'elle ; un trait nommé là y monte jusqu'à son
    // nom — un trait court, dans le prolongement de son asymptote ; puis le calibre, au-dessus de la bande, au premier rang libre
    const rangs = [T - 9, T - 23, T - 37], traitsNoms = [];
    const marge = (l, x, ancre, ts, ys) => (ys || rangs).map(y => { const e = etiquette(l, x, y, ancre, true); e.tics = []; e.ext = []; return e; });
    // (plus de trait du cadre jusqu'au nom : le lecteur, « des traits noirs qui sortent du cadre, ça ne va pas du tout » —
    // le nom se pose juste au-dessus de la sortie de sa courbe, et rien ne dépasse le cadre)
    const nommer = (e, cls) => e ? etiquetteSvg(e, cls, dx) : '';
    // entre deux courbes d'une même température, au besoin : au milieu, à une hauteur où elles s'écartent assez, du bas vers le haut
    const entre = (l, a, b) => { const out = [], w = largeurEtiquette(l[0][0], 11);
      for (let y = H - B - 6; y >= T + 12; y -= 6) { const xa = Math.max(...[y - 9, y - 3, y + 3].map(z => xA(a, z))), xb = Math.min(...[y - 9, y - 3, y + 3].map(z => xA(b, z)));
        if (isFinite(xa) && isFinite(xb) && xb - xa > w + 12) out.push(etiquette(l, (xa + xb) / 2, y, 'middle')); } return out; };
    const parT = new Map(); C.forEach((c, k) => { const cle = c.temperature != null ? c.temperature : c.nom; (parT.get(cle) || parT.set(cle, []).get(cle)).push(k); });
    const groupes = [...parT.values()], bout = ks => ks[0] === 0 || ks[ks.length - 1] === C.length - 1;
    groupes.filter(bout).concat(groupes.filter(ks => !bout(ks))).forEach(ks => { const l = [[nomDeTemperature(C[ks[0]]), '', 11]];
      const a = ech[ks[0]], b = ech[ks[ks.length - 1]], xa = tr[ks[0]].coude[0] + dx, xb = tr[ks[ks.length - 1]].coude[0] + dx, premier = ks[0] === 0, dernier = ks[ks.length - 1] === C.length - 1, role = premier || dernier ? 'bord' : 'milieu';
      const temps = rangs.slice(0, 2), cands = premier && !dernier ? [...marge(l, xa - 4, 'end', [xa], temps), ...lelong(l, a, G, [-1], 1), ...lelong(l, a, G, [1], -1)]
        : dernier && !premier ? [...marge(l, xb + 4, 'start', [xb], temps), ...lelong(l, b, G, [1], 1), ...lelong(l, b, G, [-1], -1)]
        // la paire d'entre elles (23 °C) se nomme d'abord DANS le dessin, entre ses deux traits : les trois noms ne s'empilent plus dans la marge (l'audit v72)
        : [...entre(l, a, b), ...lelong(l, b, G, [1], -1), ...marge(l, (xa + xb) / 2, 'middle', ks.length > 1 ? [xa, xb] : [xa], temps), ...lelong(l, b, G, [1], 1)];
      noms += nommer(P.essayer(cands), 'dj-t ' + role, role); });
    tics = traitsNoms.join(''); }
  // plus de limite de dommage dessinée (le lecteur : « un fil rouge en pointillé, W-015 DR24 : on ne sait pas à quoi il sert,
  // c'est chiant ») : la protection de chaque câble se juge toujours, et se lit dans la section Câbles et les problèmes
  
  // LES FONDS NOMMÉS sobrement, à l'encre seconde, contre la courbe qui borne leur fond : « ne déclenche pas » à gauche de la
  // plus rapide, en bas d'abord ; « déclenche » à droite de la plus lente, en haut d'abord — de 8 en 8 pixels vers le coin tant
  // que la place est prise —, en dernier et loin de tout autre nom (deux mots voisins se liraient comme une phrase)
  if (avecBande) { const mot = (texte, cote) => { const e = cote < 0 ? ech[0] : ech[ech.length - 1], l = [[texte, '', 11]], hs = [], cands = [], a = cote < 0 ? 'end' : 'start';
      for (let y = H - B - 8; y >= T + 14; y -= 12) hs.push(y); if (cote > 0) hs.reverse();
      hs.forEach(y => { const xs = [y - 9, y + 3].map(z => xA(e, z)).filter(x => x != null); if (!xs.length) return; let x = cote < 0 ? Math.min(...xs) - 8 : Math.max(...xs) + 8;
        for (let k = 0; k < 80; k++, x += 8 * cote) { const c = etiquette(l, x, y, a); if (cote < 0 ? c.b.x0 < L : c.b.x1 > Wd - R) break; if (c.b.x1 < L || c.b.x0 > Wd - R) continue;
          c.b.gx = 16; c.b.gy = 10; cands.push(c); } });
      const e2 = P.essayer(cands); return e2 ? etiquetteSvg(e2, 'dj-zone ' + (cote < 0 ? 'sur' : 'declenche'), 0) : ''; };
    zones = mot('ne déclenche pas', -1) + mot('déclenche', 1); }
  const glisse = `data-glisse="${f2(dx)}" style="transform:translate(${f2(dx)}px,0)"`, cadre = `<rect x="${L}" y="${T}" width="${Wd - L - R}" height="${H - T - B}"/>`;
  const s = `<defs><clipPath id="${clip}">${cadre}</clipPath></defs>`
    + (avecBande ? `<g clip-path="url(#${clip})"><g class="dj-fonds" ${glisse}>${fonds}</g><g class="dj-papier-in" ${glisse}>${filetsIn(G, cal)}</g></g>` : '') + papierSvg(G, avecBande ? cal : 0)
    + `<g clip-path="url(#${clip})">${avecBande ? `<g class="dj-cal" data-cal="${cal}" ${glisse}>${courbes}</g>` : ''}</g>`
    + `<rect class="dj-cadre" x="${net(L)}" y="${net(T)}" width="${Wd - L - R - 1}" height="${H - T - B - 1}"/>`
    + `<g class="dj-etiquettes">${zones}${avecBande ? `<g class="dj-cal-t" ${glisse}>${tics}${noms}${grapheIn(G, cal, dx)}</g>` : ''}</g>`
    + `<g class="dj-prof">${pts}</g><g class="dj-vise" hidden><line class="dj-croix" x1="0" y1="0" x2="0" y2="0"/><line class="dj-croix" x1="0" y1="0" x2="0" y2="0"/></g>`;
  return `<svg class="dj-svg" viewBox="0 0 ${Wd} ${H}" width="${Wd}" height="${H}" data-xlo="${G.xlo}" data-xhi="${G.xhi}" data-w="${Wd}" role="img" aria-label="${escA('Courbe de déclenchement' + (cal ? ' du ' + amperes(cal) : '') + ' aux quatre températures, le profil de charge en escalier')}">${s}</svg>`; }
/* LE PROFIL EN ESCALIER : du bas du cadre, au courant le plus fort, le trait monte jusqu'à la fin de ce qu'il dure, recule
   au courant suivant, remonte… jusqu'au permanent, qui monte au bord du haut (toujours) ; sans permanent, le dernier palier
   rejoint le bord gauche (plus rien ne passe). Chaque coin est un point du profil (09 bis, `pointsDuProfil` : un état dure
   autant que tous les états au moins aussi forts) — de la couleur de son sort, nommé court à côté de lui : au-dessus de sa
   marche d'abord, sinon à sa droite. */
function pointsSvg(points, G, P) { const pts = points.filter(p => p.i > 0).sort((a, b) => b.i - a.i), { T, H, B, L } = G; if (!pts.length) return '';
  const pos = pts.map(p => ({ p, x: G.X(p.i), y: p.t === Infinity ? T : G.Y(p.t) })), bas = H - B, dern = pos[pos.length - 1];
  // l'escalier, une marche par point : la marche qui mène à un point (le palier depuis le point d'avant, puis la montée) prend la
  // couleur de son sort — là où le profil touche la courbe, son trait le dit ; après le dernier palier sans permanent, un trait neutre
  const marches = pos.map(({ p, x, y }, k) => `<path class="dj-escalier${classeVerdict(p) ? ' ' + classeVerdict(p) : ''}" d="${k ? `M${f2(pos[k - 1].x)} ${f2(pos[k - 1].y)} H${f2(x)}` : `M${f2(x)} ${f2(bas)}`} V${f2(y)}"/>`)
    .concat(dern.p.t !== Infinity ? [`<path class="dj-escalier fin" d="M${f2(dern.x)} ${f2(dern.y)} H${f2(L)}"/>`] : []).join('');
  // le trait de l'escalier : les étiquettes l'évitent
  const ech = [], pas = (x0, y0, x1, y1) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4)); for (let k = 0; k <= n; k++) ech.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]); };
  let px = pos[0].x, py = bas; pos.forEach(({ x, y }, k) => { if (k) { pas(px, py, x, py); px = x; } pas(px, py, px, y); py = y; }); if (dern.p.t !== Infinity) pas(px, py, L, py); P.traits(ech, 2);
  pos.forEach(({ x, y }) => P.boite({ x0: x - 6, x1: x + 6, y0: y - 6, y1: y + 6 }));
  // nommés court : le nom de l'état (les chiffres sont dans les axes et dans la bulle) — au-dessus de sa marche, sinon à droite,
  // dessous ; le permanent, sous le bord du haut, sinon au-dessus de lui, dans la marge
  const nommes = pos.map(({ p, x, y }) => { const nom = p.nom, coupe = nom.split(' et ');
    const variantes = [[[nom, '', 11]]].concat(coupe.length > 1 ? [[[coupe[0] + ' et', '', 11], [coupe.slice(1).join(' et '), '', 11]]] : []);
    // (un permanent seul monte du bas du cadre au bord du haut : il se nomme aussi à son pied)
    const places = l => { const hh = (l.length - 1) * 12; return p.t === Infinity ? [etiquette(l, x + 9, y + 15, 'start'), etiquette(l, x - 9, y + 15, 'end'), ...(pos.length === 1 ? [etiquette(l, x + 8, bas - 7, 'start'), etiquette(l, x - 8, bas - 7, 'end')] : []), etiquette(l, x, T - 9, 'middle', true), etiquette(l, x + 9, y + 30, 'start'), etiquette(l, x - 9, y + 30, 'end')]
      : [etiquette(l, x - 7, y - 8 - hh, 'end'), etiquette(l, x + 9, y + 4 - hh / 2, 'start'), etiquette(l, x + 8, y - 9 - hh, 'start'), etiquette(l, x - 7, y + 16, 'end'), etiquette(l, x + 8, y + 17, 'start')]; };
    const e = P.essayer(variantes.flatMap(places)), c = classeVerdict(p);
    return e ? etiquetteSvg(e, 'dj-nomme' + (c ? ' ' + c : ''), 0) : ''; }).join('');
  return marches + pos.map(({ p, x, y }) => { const c = classeVerdict(p);
    return `<g class="dj-pt${c ? ' ' + c : ''}" data-k="${escA(p.k)}" tabindex="0" role="button" aria-label="${escA(p.nom + ' : ' + amperes(p.i) + (p.t === Infinity ? ', pour toujours' : ' pendant ' + secondes(p.t)) + ' — ' + motVerdict(p))}">`
      + `<circle class="dj-halo" cx="${f2(x)}" cy="${f2(y)}" r="12"/><circle class="dj-point" cx="${f2(x)}" cy="${f2(y)}" r="4.5"/></g>`; }).join('') + nommes; }

/* ---- le graphique vivant ------------------------------------------------------------------ */
/* La bulle du survol, courte : un titre (le courant, la durée), une ligne (ce que le calibre tient à la courbe qui juge),
   un verdict. */
function carteTip(titre, sous, verdict, cls) { const lie = h => String(h).replace(/(\d) (°C|A|s|ms|min|h|In|%)(?![\wé])/g, '$1\u00a0$2');   // « 125 °C » ne se coupe pas
  return `<div class="dj-tip-t"><b>${lie(titre)}</b>${sous ? `<span>${lie(sous)}</span>` : ''}</div>` + (verdict ? `<div class="dj-tip-v${cls ? ' ' + cls : ''}">${lie(verdict)}</div>` : ''); }
// un multiple du calibre, en mots : « 1,2 In »
const motIn = (i, cal) => cal > 0 ? nombre(Math.round(i / cal * 100) / 100) + '\u00a0In' : '';
/* Survoler un point dit son sort en une bulle courte ; ailleurs dans le cadre, un réticule lit le courant (et son multiple
   de In) et la durée. Glisser un point change le courant et la durée de son état — l'escalier, les points et la gamme
   suivent en direct, le contrat s'écrit quand on lâche. Quand le calibre a changé depuis le dernier dessin, la bande glisse
   (`DJ_ANIM`, 08-disjoncteurs : le dernier décalage dessiné par repère). `retenir` : la porte garde sa forme. */
function lierGraphique(fig, nom, E, lire, ecrire, retenir) { const d = E.d, svg = fig.querySelector('svg'), tip = fig.querySelector('.dj-tip'); if (!svg || !d.courbes.length) return;
  const G = geometrieGraphe(d, +svg.dataset.w), { L, R, T, B, H } = G, W = G.W, cal = d.calibre, C = d.courbes, vise = svg.querySelector('.dj-vise');
  // la bande glisse : du décalage dessiné la dernière fois pour ce repère à celui d'aujourd'hui (à géométrie égale)
  const grps = [...svg.querySelectorAll('[data-glisse]')], geo = G.xlo + '|' + G.xhi + '|' + W, avant = DJ_ANIM.get(nom);
  if (grps.length) { const tx = +grps[0].dataset.glisse;
    if (avant && avant.geo === geo && Math.abs(avant.tx - tx) > 0.5) { grps.forEach(g => { g.style.transition = 'none'; g.style.transform = `translate(${avant.tx}px,0)`; }); void svg.getBoundingClientRect(); grps.forEach(g => { g.style.transition = ''; g.style.transform = `translate(${tx}px,0)`; }); }
    DJ_ANIM.set(nom, { tx, geo }); }
  const local = e => { const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
  const dansLeCadre = p => p.x >= L && p.x <= W - R && p.y >= T - 4 && p.y <= H - B;
  // la bulle se pose à droite du pointeur, à gauche quand elle déborderait ; sinon au-dessous ou au-dessus — jamais sur ce qu'elle décrit
  const montrer = (p, html) => { const rs = svg.getBoundingClientRect(), rf = fig.getBoundingClientRect(), px = p.x / W * rs.width + rs.left - rf.left, py = p.y / H * rs.height + rs.top - rf.top;
    tip.innerHTML = html; tip.hidden = false; const w = tip.offsetWidth, h = tip.offsetHeight, droite = px + 16 + w <= rf.width - 2, gauche = px - 16 - w >= 2;
    if (droite || gauche) { tip.style.left = (droite ? px + 16 : px - 16 - w) + 'px'; tip.style.top = Math.max(2, Math.min(py - 16, rf.height - h - 2)) + 'px'; return; }
    const bas = py + 16 + h <= rf.height - 2; tip.style.left = Math.max(2, Math.min(px - w / 2, rf.width - w - 2)) + 'px'; tip.style.top = (bas ? py + 16 : Math.max(2, py - 16 - h)) + 'px'; };
  const cacher = () => { tip.hidden = true; vise.hidden = true; };
  const croix = p => { const [a, b] = vise.querySelectorAll('line'); a.setAttribute('x1', f2(p.x)); a.setAttribute('x2', f2(p.x)); a.setAttribute('y1', T); a.setAttribute('y2', H - B); b.setAttribute('x1', L); b.setAttribute('x2', W - R); b.setAttribute('y1', f2(p.y)); b.setAttribute('y2', f2(p.y)); vise.hidden = false; };
  // la bulle d'un point : ce que le calibre tient à la courbe qui juge, le verdict (les courbes qui déclenchent, s'il en est)
  const cartePoint = pt => { const m0 = pt.marges[0], titre = esc(amperes(pt.i)) + (pt.t === Infinity ? ' · toujours' : ' · ' + esc(secondes(pt.t))); if (!m0) return carteTip(titre, esc(pt.nom), 'pas jugé', 'info');
    const rates = pt.marges.filter(m => !m.ok).map(m => m.courbe), bilan = pt.t === Infinity ? '' : ' · ' + esc(motFraction(m0.somme)) + ' du temps consommé';
    const sous = esc(pt.nom) + (!cal ? '' : ' — le ' + esc(amperes(cal)) + (pt.t === Infinity ? ' garantit ' + esc(amperes(m0.admis)) : m0.temps === Infinity ? ' ne déclenche pas' : ' tient ' + esc(secondes(m0.temps))) + ' à ' + esc(m0.courbe));
    // LES TROIS MOTS, comme le calibre (v73, l'ingénieur, point 8 : « les mots changent d'un écran à l'autre ») : déclenche, juste
    // (il touche la courbe, sans la marge), passe — la table du domaine C (`motDuVerdict`, 08-disjoncteurs)
    const M = k => typeof motDuVerdict === 'function' ? motDuVerdict(k) : { passe: 'passe', juste: 'juste', declenche: 'déclenche' }[k];
    const verdict = pt.ok === false ? `<em>${esc(M('declenche'))}</em> à ${rates.length === pt.marges.length ? 'toute température' : esc(rates.join(', '))}${bilan}` : pt.serre ? (pt.t === Infinity ? `<em>${esc(M('juste'))}</em> : sans ` + esc(nombre(d.marges.marge)) + ' % de marge' : `<em>${esc(M('juste'))}</em> : touche la courbe` + bilan) : (pt.t === Infinity ? esc(M('passe')) + ' : ne déclenche jamais' : esc(M('passe')) + ' à toute température' + bilan);
    return carteTip(titre, sous, verdict, pt.ok === false ? 'ko' : pt.serre ? 'serre' : 'ok'); };
  // le réticule : à ce courant (et ce multiple de In), ce que le calibre retenu tient à la courbe qui juge
  const carteReticule = (i, t) => { if (!cal) return carteTip(esc(amperes(i)) + ' · ' + esc(secondes(t)), '', '', '');
    const tt = tempsDeDeclenchement(C[0], i / cal); return carteTip(esc(motIn(i, cal)) + ' · ' + esc(secondes(t)), 'soit ' + esc(amperes(i)) + ' — le ' + esc(amperes(cal)) + (tt === Infinity ? ' n’y déclenche jamais' : ' y tient ' + esc(secondes(tt))) + ' à ' + esc(C[0].nom), '', ''); };
  // glisser un point : le profil se rejuge en direct (l'escalier, les points et la gamme), le contrat s'écrit au lâcher ; les noms
  // des points évitent les traits des courbes et les étiquettes déjà posées (le poseur du dessin, refait une fois)
  let prise = null, base = null;
  const traitsDeBase = () => { const P = poseur(G), dx = G.dx(cal); if (cal) C.forEach(c => { const t = traceLisse(c, G); if (t) P.traits(echantillons(t, dx, T), 2); });
    svg.querySelectorAll('.dj-etiquettes text').forEach(t => { const b = t.getBBox ? t.getBBox() : null, g = t.closest('[data-glisse]'), o = g ? +g.dataset.glisse : 0; if (b && b.width) P.boite({ x0: b.x + o - 2, x1: b.x + o + b.width + 2, y0: b.y, y1: b.y + b.height, e: true }); });
    return P; };
  const juger = profil => { const dd = { ...d, ...verdictDisjonction(app.norme, d.courbe, cal, profil, d.contexte) }; base = base || traitsDeBase(); const P = poseur(G); base.pris.forEach(b => P.boite(b));
    svg.querySelector('.dj-prof').innerHTML = pointsSvg(dd.points, G, P);
    document.querySelectorAll(`.fi-dj[data-disj="${CSS.escape(nom)}"] .dj-chip`).forEach(b => { const g = dd.gamme.find(x => x.calibre === +b.dataset.cal); if (g) { b.classList.toggle('ok', g.valide === true && !!g.marge); b.classList.toggle('ko', g.valide != null && !(g.valide === true && !!g.marge)); } });
    return dd; };
  svg.onpointermove = e => { const p = local(e);
    if (prise) { const i = Math.max(0.01, G.iDe(Math.min(W - R, Math.max(L, p.x)))), t = G.tDe(Math.min(H - B, Math.max(T, p.y))), el = prise.etat, ri = +i.toPrecision(3), rt = +t.toPrecision(2);
      el.i = ri; if (prise.k !== 'perm') el.t = rt; const dd = juger(prise.profil), pt = dd.points.find(x => x.k === prise.k) || dd.points.find(x => x.i === ri);
      montrer(p, pt ? cartePoint(pt) : carteTip(esc(amperes(ri)) + (prise.k === 'perm' ? '' : ' · ' + esc(secondes(rt))), esc(el.nom || ''), '', '')); return; }
    const g = e.target.closest && e.target.closest('.dj-pt');
    if (g) { const pt = d.points.find(x => x.k === g.dataset.k); if (pt) { vise.hidden = true; montrer(p, cartePoint(pt)); return; } }
    if (!dansLeCadre(p)) { cacher(); return; }
    croix(p); montrer(p, carteReticule(G.iDe(p.x), G.tDe(p.y))); };
  svg.onpointerleave = () => { if (!prise) cacher(); };
  svg.onpointerdown = e => { const g = e.target.closest && e.target.closest('.dj-pt'); if (!g || e.button) return;
    const profil = lire(), k = g.dataset.k, etat = k === 'perm' ? profil.perm : /^plus/.test(k) ? profil.plus[+k.slice(4)] : profil[k]; if (!etat) return;
    prise = { k, etat, profil }; svg.classList.add('tient'); try { svg.setPointerCapture(e.pointerId); } catch (_) { } e.preventDefault(); };
  const lacher = e => { if (!prise) return; const c = prise.profil; prise = null; svg.classList.remove('tient'); cacher(); try { svg.releasePointerCapture(e.pointerId); } catch (_) { } ecrire('profil de charge de ' + nom, c); };
  svg.onpointerup = lacher; svg.onpointercancel = lacher;
  // au clavier, le focus sur un point montre sa bulle
  svg.querySelectorAll('.dj-pt').forEach(g => { g.onfocus = () => { const pt = d.points.find(x => x.k === g.dataset.k), c = g.querySelector('.dj-point'); if (pt && c) montrer({ x: +c.getAttribute('cx'), y: +c.getAttribute('cy') }, cartePoint(pt)); }; g.onblur = cacher; }); }
