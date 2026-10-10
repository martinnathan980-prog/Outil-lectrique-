/* ===========================================================================
   08 sexies — LA COURBE DE DÉCLENCHEMENT : le dessin du disjoncteur
   ---------------------------------------------------------------------------
   Le lecteur : « la courbe de déclenchement, le schéma est dégueulasse. Les
   courbes, je te les ai déjà données [son Excel : 125 °C, 23 °C min, 23 °C
   max, −55 °C, le temps en secondes selon le multiple de In]. Il ne faut pas
   faire un dessin d'enfant, il faut un dessin vraiment beaucoup plus propre. »
   Le dessin quitte la fiche (08-disjoncteurs) pour ce fichier et se fait
   comme la figure d'une fiche de constructeur (E-T-A, Sensata) :
     · LE PAPIER : une vraie grille log-log — les décades en trait plein
       léger, les sous-divisions 2 à 9 plus fines —, les décades nommées
       (0,01 s à 10 000 s ; 1 A, 10 A, 100 A…), le titre du temps le long de
       son axe, et sous les ampères un second rang discret, les multiples du
       calibre (In, 2 In, 5 In…) : la lecture de l'Excel ;
     · LES COURBES de la famille du part number (MS3320 : ETA483, les quatre
       de l'Excel), lisses — Fritsch-Carlson en log-log, entre les points de
       la norme —, en traits fins : la plus rapide et la plus lente à l'encre,
       celles d'entre elles plus douces, la bande entre les deux d'un ton très
       léger ; chacune nommée à son bout, en haut, par sa température. « Une
       seule bande » (les deux bords) reste à un clic ;
     · LE PROFIL DE CHARGE en escalier — démarrage, transition, permanent : un
       trait qui descend par paliers —, ses coins en points nommés court, de
       la couleur de leur sort ;
     · la limite de dommage du fil le plus faible, en tirets fins ;
     · aucune légende à part, aucune étiquette sur une autre, pas de carte
       autour : le dessin est sur papier blanc dans les deux thèmes.
   La fiche l'appelle par deux portes, et seulement par elles :
   `grapheSvg(d, vue, W)` rend le SVG (posé dans `.dj-graphe`, à la largeur
   où il se pose : 1 unité = 1 pixel, net à 100 et à 200 %), `lierGraphique(
   fig, nom, E, lire, ecrire, retenir)` le rend vivant — la bulle d'un point,
   le réticule, glisser un point, retenir un calibre voisin d'un clic, la
   bande qui glisse quand le calibre change. `DJ_VUE` dit ce qu'il montre
   (les deux interrupteurs de la fiche). Le jugement reste celui du moteur
   (09 bis) : on ne lisse que le dessin.
   =========================================================================== */
'use strict';

/* ---- ce que le graphique montre ------------------------------------------------------ */
/* D'une fiche à l'autre, dans ce navigateur : comparer les calibres voisins, toutes les températures — les quatre courbes
   de l'Excel par défaut (la clé a changé avec ce défaut : « une seule bande » d'hier ne se rappelle pas). */
const CLE_VUE_DJ = 'atelier.courbe.vue';
const DJ_VUE = (() => { try { const o = JSON.parse(localStorage.getItem(CLE_VUE_DJ) || '{}') || {}; return { comparer: !!o.comparer, temperatures: o.temperatures !== false }; } catch (_) { return { comparer: false, temperatures: true }; } })();
const retenirVue = () => { try { localStorage.setItem(CLE_VUE_DJ, JSON.stringify(DJ_VUE)); } catch (_) { } };

/* ---- la géométrie --------------------------------------------------------------------- */
/* Ampères en abscisse, secondes en ordonnée, en log-log : six décades de temps, 10 ms en bas, 10 000 s en haut (le
   permanent dure toujours : il se pose sur le bord du haut). L'abscisse prend les décades qui couvrent le profil, la bande
   du calibre retenu et le fil le plus faible. Les marges : à gauche le titre du temps et ses décades, en haut deux rangs pour
   nommer les courbes à leur bout (trois pour comparer), en bas les ampères, les multiples de In, le titre du courant. */
const DJG = { L: 64, R: 16, T: 36, B: 50, ylo: -2, yhi: 4, ubas: -2.4, uhaut: 4.4 };
function largeurGrapheEstimee() { const b = typeof $ === 'function' ? $('ba-equip') : null; return b && b.clientWidth > 200 ? b.clientWidth - 48 : 392; }
function geometrieGraphe(d, W, faible, vue) { W = Math.max(300, Math.round(W || 392)); const T = DJG.T + (vue && vue.comparer ? 14 : 0), { L, R, B, ylo, yhi } = DJG;
  const hp = Math.round(Math.max(240, Math.min(380, (W - L - R) * 0.86))), H = T + hp + B, rapide = d.courbes[0], cal = d.calibre, I = d.points.map(p => p.i).filter(i => i > 0);
  const bas = [...I, cal ? cal * rapide.points[0].m : Infinity, faible ? faible.continu : Infinity].filter(x => x > 0 && isFinite(x));
  const hauts = [...I.map(i => i * 1.5), cal ? cal * multipleAdmis(rapide, 0.02) : 0];
  let xlo = Math.floor(Math.log10((bas.length ? Math.min(...bas) : 1) / 1.4) + 1e-9), xhi = Math.ceil(Math.log10(Math.max(...hauts, 1e-9)) - 1e-9); if (xhi - xlo < 2) xhi = xlo + 2;
  const kx = (W - L - R) / (xhi - xlo), ky = hp / (yhi - ylo), xv = v => L + (v - xlo) * kx, yu = u => T + (yhi - u) * ky;
  return { W, H, L, R, T, B, xlo, xhi, ylo, yhi, kx, ky, xv, yu, X: i => xv(Math.log10(i)), Y: t => yu(Math.max(ylo, Math.min(yhi, Math.log10(t)))),
    iDe: x => Math.pow(10, xlo + (x - L) / kx), tDe: y => Math.pow(10, yhi - (y - T) / ky), dx: c => c > 0 ? Math.log10(c) * kx : 0 }; }

/* ---- les courbes lisses ------------------------------------------------------------------ */
/* L'interpolation cubique MONOTONE de Fritsch et Carlson (1980) : par des nœuds (u croissant, v monotone), une courbe C¹
   qui passe par chacun sans jamais sortir de l'intervalle de deux voisins — ni bosse, ni retour, ni cassure. `fin` force
   la pente au dernier nœud (0 : la courbe y devient verticale et rejoint son asymptote). Rend les segments de Bézier. */
function bezierMonotone(N, fin) { const n = N.length; if (n < 2) return [];
  const s = []; for (let k = 0; k < n - 1; k++) s.push((N[k + 1].v - N[k].v) / (N[k + 1].u - N[k].u));
  const m = N.map((_, k) => k === 0 ? s[0] : k === n - 1 ? s[n - 2] : s[k - 1] * s[k] <= 0 ? 0 : (s[k - 1] + s[k]) / 2); if (fin != null) m[n - 1] = fin;
  for (let k = 0; k < n - 1; k++) { if (s[k] === 0) { m[k] = m[k + 1] = 0; continue; }
    const a = m[k] / s[k], b = m[k + 1] / s[k], r = a * a + b * b; if (r > 9) { const t = 3 / Math.sqrt(r); m[k] = t * a * s[k]; m[k + 1] = t * b * s[k]; } }
  return s.map((_, k) => { const A = N[k], Bn = N[k + 1], h = Bn.u - A.u; return [[A.u, A.v], [A.u + h / 3, A.v + m[k] * h / 3], [Bn.u - h / 3, Bn.v - m[k + 1] * h / 3], [Bn.u, Bn.v]]; }); }
/* LA COURBE LISSE d'une courbe de disjonction, au calibre 1 A (le multiple vaut l'ampère : un calibre la décale de
   log10(calibre) décades). En log-log, le multiple en fonction du temps — vers les temps longs la courbe devient verticale,
   c'est le temps qui la parcourt sans peine — : les points de l'enveloppe du moteur, un par temps, lissés (`lisserNoeuds`),
   la pente du dernier segment au-delà du dernier point (comme le moteur), verticale au premier ; puis, du haut vers le
   bas, la droite de l'asymptote et les segments de Bézier (`bezierMonotone`). Rend { haut, coude, segs, fin } en pixels. */
function noeudsLisses(c) { const par = new Map();
  c.points.forEach(p => { if (!(p.t > 0 && p.m > 0)) return; const u = Math.log10(p.t), v = Math.log10(p.m), k = u.toFixed(5), x = par.get(k); if (!x || x.v < v) par.set(k, { u, v }); });
  return lisserNoeuds([...par.values()].sort((a, b) => a.u - b.u), u => Math.log10(multipleAdmis(c, Math.pow(10, u)))); }
/* Les points d'une courbe de la norme sont lus à la main sur une figure : ils tremblent d'un pour cent, et une courbe qui
   passe par chacun tremble aussi. Le DESSIN les lisse d'abord — une régression QUADRATIQUE locale (poids gaussien de
   0,2 décade en temps : elle suit le genou d'une courbe sans le couper, là où une droite locale le coupait et laissait la
   tolérance rendre les tremblements) évaluée tous les 0,08 décade —, chaque nœud tenu à ±0,009 décade (2 %) de la courbe
   du moteur (`exact` : là où la norme a un vrai coude, le dessin le garde), puis monotone. Là où les points manquent (un
   Klixon 2TC à 121 °C n'en a aucun entre 58 et 1 000 s), la régression n'a plus de quoi s'appuyer : son écart compte
   d'autant moins que la fenêtre tient moins d'un point et demi (`S0`), et le dessin suit la droite du moteur. Au bout du
   haut, l'asymptote verticale (au-delà du premier point, le disjoncteur ne déclenche plus : le multiple ne change plus)
   entre dans les données — trois points virtuels, un dixième de décade l'un de l'autre : la régression n'y est plus
   borgne, et la courbe rejoint sa verticale peu à peu, sans coude. Sur les six familles de courbes, trois fois moins
   d'inflexions qu'avec la droite locale ; l'écart au moteur reste sous 2,5 % (tests/disjoncteur.js le mesure) ; le
   jugement, lui, reste sur les points lus. */
const TOLERANCE_LISSAGE = 0.009;
function lisserNoeuds(N, exact, h) { if (N.length < 4) return N; h = h || 0.2; const u0 = N[0].u, u1 = N[N.length - 1].u, n = Math.max(2, Math.ceil((u1 - u0) / 0.08)), out = [];
  const det = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const appuis = N.concat([1, 2, 3].map(j => ({ u: u1 + j * 0.1, v: N[N.length - 1].v })));
  for (let k = 0; k <= n; k++) { const u = u0 + (u1 - u0) * k / n, S = [0, 0, 0, 0, 0], Tv = [0, 0, 0];
    // les moments pondérés, centrés sur u : la valeur de la parabole en u est son terme constant (Cramer sur 3 × 3)
    appuis.forEach(p => { const x = p.u - u, w = Math.exp(-0.5 * Math.pow(x / h, 2)); let xp = 1; for (let j = 0; j < 5; j++) { S[j] += w * xp; if (j < 3) Tv[j] += w * xp * p.v; xp *= x; } });
    const A = [[S[0], S[1], S[2]], [S[1], S[2], S[3]], [S[2], S[3], S[4]]], D = det(A), e = exact ? exact(u) : NaN;
    const v = Math.abs(D) > 1e-12 * Math.pow(S[0], 3) ? det([[Tv[0], S[1], S[2]], [Tv[1], S[2], S[3]], [Tv[2], S[3], S[4]]]) / D : isFinite(e) ? e : Tv[0] / S[0];
    out.push({ u, v: isFinite(e) ? e + Math.max(-TOLERANCE_LISSAGE, Math.min(TOLERANCE_LISSAGE, v - e)) * Math.min(1, S[0] / 1.5) : v }); }
  for (let k = 1; k < out.length; k++) out[k].v = Math.min(out[k].v, out[k - 1].v);
  return out; }
function traceLisse(c, G) { const N = noeudsLisses(c); if (!N.length) return null;
  if (N.length >= 2 && N[0].u > DJG.ubas) { const a = N[0], b = N[1], pente = (b.v - a.v) / (b.u - a.u); N.unshift({ u: DJG.ubas, v: a.v + pente * (DJG.ubas - a.u) }); }
  const segs = bezierMonotone(N, 0).map(sg => sg.map(([u, v]) => [G.xv(v), G.yu(u)]).reverse()).reverse(), h = N[N.length - 1], x0 = G.xv(h.v);
  return { haut: [x0, G.yu(DJG.uhaut)], coude: [x0, G.yu(h.u)], segs, fin: segs.length ? segs[segs.length - 1][3] : [x0, G.yu(h.u)] }; }
/* LA LIMITE DE DOMMAGE d'un fil (09 bis, `dommageDuFil`) : en bref l'adiabatique √(I²t / t) — une droite en log-log —, en
   long son continu porté à la tenue — une verticale —, le coude arrondi sur ±0,14 décade (2 % au plus) ; sans courbe de
   dommage, ses intensités de service aux paliers, lissées de même. Même forme que `traceLisse`, en ampères. */
function traceDommage(f, G) { const D = f.dommage;
  if (D && D.i2t > 0 && D.continu > 0) { const vc = Math.log10(D.continu), us = Math.log10(D.i2t / (D.continu * D.continu)), h = 0.14, adia = u => 0.5 * Math.log10(D.i2t) - 0.5 * u;
    const P = (u, v) => [G.xv(v), G.yu(u)], A = { u: us - h, v: adia(us - h) }, Bn = { u: us + h, v: vc }, k = Bn.u - A.u;
    const coude = [[Bn.u, Bn.v], [Bn.u - k / 3, Bn.v], [A.u + k / 3, A.v - 0.5 * k / 3], [A.u, A.v]].map(([u, v]) => P(u, v));
    const bas = P(DJG.ubas, adia(DJG.ubas)); return { haut: P(DJG.uhaut, vc), coude: P(Bn.u, vc), segs: [coude, [coude[3], coude[3], bas, bas]], fin: bas }; }
  const L = (f.laisse || []).filter(x => x.service > 0); if (L.length < 2) return null;
  const N = L.map(x => ({ u: x.palier === Infinity ? Math.log10(600) : Math.log10(x.palier), v: Math.log10(x.admise) })).sort((a, b) => a.u - b.u);
  const a = N[0], b = N[1], pente = (b.v - a.v) / (b.u - a.u); N.unshift({ u: DJG.ubas, v: a.v + pente * (DJG.ubas - a.u) });
  const segs = bezierMonotone(N, 0).map(sg => sg.map(([u, v]) => [G.xv(v), G.yu(u)]).reverse()).reverse(), hh = N[N.length - 1];
  return { haut: [G.xv(hh.v), G.yu(DJG.uhaut)], coude: [G.xv(hh.v), G.yu(hh.u)], segs, fin: segs[segs.length - 1][3] }; }
const f2 = n => String(Math.round(n * 1000) / 1000);   // trois décimales : arrondir au centième faisait trembler la tangente
const pt2 = p => f2(p[0]) + ' ' + f2(p[1]);
// un filet d'un pixel tombe sur la grille des pixels : net à 100 % comme à 200 %
const net = v => Math.floor(v) + 0.5;
// du haut vers le bas, puis (pour fermer une bande) du bas vers le haut
const descente = tr => `M${pt2(tr.haut)} L${pt2(tr.coude)}` + tr.segs.map(s => ` C${pt2(s[1])} ${pt2(s[2])} ${pt2(s[3])}`).join('');
const montee = tr => ` L${pt2(tr.fin)}` + tr.segs.slice().reverse().map(s => ` C${pt2(s[2])} ${pt2(s[1])} ${pt2(s[0])}`).join('') + ` L${pt2(tr.haut)}`;
const bandeDe = (a, b) => descente(a) + montee(b) + ' Z';
/* Des points le long d'un tracé (pour que les étiquettes ne se posent pas dessus), décalés de `dx`. */
function echantillons(tr, dx, haut) { const out = [], bz = (s, t) => { const u = 1 - t; return [0, 1].map(j => u * u * u * s[0][j] + 3 * u * u * t * s[1][j] + 3 * u * t * t * s[2][j] + t * t * t * s[3][j]); };
  for (let y = Math.max(tr.haut[1], haut != null ? haut : DJG.T); y < tr.coude[1]; y += 4) out.push([tr.coude[0] + dx, y]);   // la part visible : au-dessus du cadre, le trait est coupé
  // un échantillon tous les 4 pixels environ (la longueur du polygone de contrôle borne celle du segment)
  tr.segs.forEach(s => { const lg = Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]) + Math.hypot(s[2][0] - s[1][0], s[2][1] - s[1][1]) + Math.hypot(s[3][0] - s[2][0], s[3][1] - s[2][1]), n = Math.max(4, Math.ceil(lg / 4));
    for (let k = 0; k <= n; k++) { const p = bz(s, k / n); out.push([p[0] + dx, p[1]]); } }); return out; }
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
  const libre = b => dedans(b) && !pris.some(o => { const g = o.e && b.e ? 3 : 0; return b.x0 < o.x1 + g && b.x1 > o.x0 - g && b.y0 < o.y1 && b.y1 > o.y0; });
  return { pris, traits(ech, r) { ech.forEach(([x, y]) => pris.push({ x0: x - r, x1: x + r, y0: y - r, y1: y + r })); }, boite(b) { pris.push(b); },
    essayer(cands) { for (const c of cands) if (c && libre(c.b) && (c.ext || []).every(b => !pris.some(o => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0))) { pris.push(c.b, ...(c.ext || [])); return c; } return null; } }; }
/* Une étiquette candidate : des lignes [texte, classe, taille, suite?, classe de la suite?] — la suite se lit sur la même
   ligne, plus douce (« démarrage 12 A · 2 s ») —, ancrée (start, end, middle) en (x, y), y la ligne de base de la
   première ; et sa boîte. */
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
/* Le fil le plus faible du disjoncteur : celui qui supporte le moins à 10 s (sa courbe de dommage, sinon son service). */
function filLePlusFaible(d) { const lim = f => f.dommage ? Math.max(f.dommage.continu, Math.sqrt(f.dommage.i2t / 10)) : ((f.laisse || []).find(x => x.palier === 10) || {}).admise || Infinity;
  const xs = d.fils.filter(f => f.dommage || (f.laisse || []).length).sort((a, b) => lim(a) - lim(b)); const f = xs[0]; if (!f) return null;
  return { f, continu: f.dommage ? f.dommage.continu : ((f.laisse.find(x => x.palier === Infinity) || {}).admise || null) }; }
/* Le rôle d'une courbe dans le dessin : un BORD de la bande (la plus rapide, qui juge l'intempestif ; la plus lente, qui dit
   ce qui passe jusqu'au fil), à l'encre ; une courbe d'entre elles (la paire de 23 °C de l'Excel), plus douce. */
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
   gauche, les ampères en bas —, le titre du temps le long de son axe, celui du courant sous les deux rangs du bas (les
   ampères ; les multiples de In, qui suivent la bande : `grapheIn`). Le cadre se pose par-dessus les courbes. */
function papierSvg(G) { const { L, R, T, B, H, W } = G, x0 = net(L), x1 = net(W - R - 1), y0 = net(T), y1 = net(H - B - 1);
  let fins = '', decades = '', mots = '';
  for (let e = G.ylo; e <= G.yhi; e++) { const y = G.yu(e);
    if (e > G.ylo && e < G.yhi) decades += `M${x0} ${f2(net(y))}H${x1}`;
    if (e < G.yhi) for (let k = 2; k <= 9; k++) fins += `M${x0} ${f2(net(G.yu(e + Math.log10(k))))}H${x1}`;
    mots += `<text class="dj-grad" x="${L - 7}" y="${f2(y + 3.5)}" text-anchor="end">${motTemps(e)}</text>`; }
  for (let e = G.xlo; e <= G.xhi; e++) { const x = G.xv(e);
    if (e > G.xlo && e < G.xhi) decades += `M${f2(net(x))} ${y0}V${y1}`;
    if (e < G.xhi) for (let k = 2; k <= 9; k++) fins += `M${f2(net(G.xv(e + Math.log10(k))))} ${y0}V${y1}`;
    mots += `<text class="dj-grad" x="${f2(x)}" y="${H - B + 17}" text-anchor="middle">${motCourant(e)}</text>`; }
  return `<path class="dj-filet fin" d="${fins}"/><path class="dj-filet" d="${decades}"/>`
    + mots + `<text class="dj-axe" transform="translate(13 ${f2(T + (H - B - T) / 2)}) rotate(-90)" text-anchor="middle">Temps de déclenchement</text>`
    + `<text class="dj-axe" x="${f2(L + (W - R - L) / 2)}" y="${H - 6}" text-anchor="middle">Courant</text>`; }
/* LES MULTIPLES DE In, sous les ampères : In, 2 In, 5 In, 10 In… du calibre retenu — dessinés au calibre 1 A et décalés
   avec la bande (ils glissent avec elle quand le calibre change) ; seuls ceux qui tombent sous le cadre se nomment, et
   sans se toucher. */
function grapheIn(G, cal, dx) { if (!cal) return ''; let s = '', avant = -Infinity;
  [1, 2, 5, 10, 20, 50, 100, 200, 500].forEach(m => { const x = G.xv(Math.log10(m)) + dx; if (x < G.L - 0.5 || x > G.W - G.R + 0.5) return;
    const mot = m === 1 ? 'In' : m + '\u00a0In', w = largeurEtiquette(mot, 10); if (x - w / 2 < avant + 6) return; avant = x + w / 2;
    s += `<line class="dj-tic-in" x1="${f2(net(x - dx))}" y1="${G.H - G.B}" x2="${f2(net(x - dx))}" y2="${G.H - G.B + 3}"/><text class="dj-grad in" x="${f2(x - dx)}" y="${G.H - G.B + 30}" text-anchor="middle">${mot}</text>`; });
  return s; }
/* LE GRAPHIQUE : le papier, puis dans le cadre — les bandes des calibres voisins s'il faut comparer, la bande du calibre
   retenu et ses quatre courbes (ou ses deux bords), la limite de dommage du fil le plus faible —, le profil en escalier et
   ses points, les noms au bout des traits. Rend le SVG ; `vue` : { comparer, temperatures } ; `W` : la largeur en pixels. */
function grapheSvg(d, vue, W) { vue = vue || {}; const faible = filLePlusFaible(d), G = geometrieGraphe(d, W, faible, vue), { L, R, T, B, H } = G, Wd = G.W, cal = d.calibre, C = d.courbes, clip = 'dj-clip-' + (++DJ_CLIP);
  const tr = C.map(c => traceLisse(c, G)), rapide = tr[0], lente = tr[tr.length - 1], dx = G.dx(cal), P = poseur(G), toutes = !!vue.temperatures && C.length > 2;
  // ce que les étiquettes doivent éviter : chaque trait dessiné
  const ech = tr.map(t => t ? echantillons(t, dx, T) : []), dom = faible ? traceDommage(faible.f, G) : null, echDom = dom ? echantillons(dom, 0, T) : [];
  if (cal) (toutes ? ech : [ech[0], ech[ech.length - 1]]).forEach(e => P.traits(e, 2));
  // le profil et ses points, d'abord : ce sont eux qu'on lit (leur nom peut passer sur les tirets du dommage : son halo le détache)
  const pts = pointsSvg(d.points, G, P); P.traits(echDom, 2);
  // les noms dans la marge du haut, là où les traits sortent du cadre : deux rangs (trois pour comparer) ; un trait nommé là y
  // monte jusqu'à son nom — un trait court, dans le prolongement de son asymptote, qui ne coupe aucun autre nom
  const rangs = [T - 9, T - 23, T - 37].filter(y => y > 10), traitsNoms = [];
  const marge = (l, x, ancre, tics) => rangs.map(y => { const e = etiquette(l, x, y, ancre, true); e.tics = tics || []; e.ext = e.tics.map(tx => ({ x0: tx - 2, x1: tx + 2, y0: y + 3, y1: T - 3 })); return e; });
  const nommerEn = (e, cls, dxg, role) => { if (!e) return ''; (e.tics || []).forEach(tx => traitsNoms.push(`<line class="dj-tic-nom${role ? ' ' + role : ''}" x1="${f2(tx - dxg)}" y1="${T}" x2="${f2(tx - dxg)}" y2="${f2(e.y + 3)}"/>`));
    return etiquetteSvg(e, cls, dxg); };
  // les voisins (comparer) : le calibre de la gamme juste en dessous, celui juste au-dessus, et le meilleur
  let voisins = '', etiqFixes = '', etiqBande = '', ticsBande = '', choix = [];
  if (vue.comparer && cal && rapide && lente) { const cat = d.gamme.filter(g => g.catalogue || g.calibre === cal).map(g => g.calibre), k = cat.indexOf(cal);
    choix = [...new Set(cat.slice(Math.max(0, k - 1), k + 2).concat(d.meilleur.calibre ? [d.meilleur.calibre] : []))].filter(c => c !== cal);
    const bande = bandeDe(rapide, lente), bord = descente(rapide), bord2 = descente(lente);
    voisins = choix.map(c => { const g = d.gamme.find(x => x.calibre === c) || {}, cls = g.valide === true ? (g.marge ? ' ok' : ' serre') : g.valide === false ? ' ko' : '';
      return `<g class="dj-voisin${cls}${c === d.meilleur.calibre ? ' meilleur' : ''}" data-cal="${c}" style="transform:translate(${f2(G.dx(c))}px,0)"><path class="dj-v-bande" d="${bande}"/><path class="dj-v-bord" d="${bord}"/><path class="dj-v-bord" d="${bord2}"/></g>`; }).join('');
    // chaque calibre nommé au-dessus de sa bande, au rang du haut : le meilleur d'abord (en vert), les voisins, le retenu (à
    // l'encre) s'il reste la place — c'est ce qu'on compare ; les températures prennent les rangs d'en dessous
    [d.meilleur.calibre, ...choix, cal].filter((c, n, xs) => c && xs.indexOf(c) === n && (c === cal || choix.includes(c))).forEach(c => {
      const l = [[nombre(c), '', 10.5]], e = P.essayer([etiquette(l, (rapide.coude[0] + lente.coude[0]) / 2 + G.dx(c), rangs[rangs.length - 1], 'middle', true)]);
      if (e) etiqFixes += etiquetteSvg(e, 'dj-v-t' + (c === cal ? ' retenu' : '') + (c === d.meilleur.calibre ? ' meilleur' : ''), 0); }); }
  // la bande du retenu et ses courbes (ou ses deux bords), nommées à leur bout du haut — la plus rapide à gauche de son trait,
  // la plus lente à droite, la paire d'entre elles (une même température, min et max) au-dessus d'elle, au premier rang libre
  let bande = '';
  if (cal && rapide && lente) {
    bande = (C.length > 1 ? `<path class="dj-bande" d="${bandeDe(rapide, lente)}"/>` : '')
      + (toutes ? C.map((c, k) => tr[k] ? `<path class="dj-courbe ${roleDe(k, C)}" data-courbe="${k}" d="${descente(tr[k])}"><title>${esc(c.nom + ' · ' + amperes(cal))}</title></path>` : '').join('')
        : `<path class="dj-bord" d="${descente(rapide)}"><title>${esc(C[0].nom)}</title></path>` + (C.length > 1 ? `<path class="dj-bord" d="${descente(lente)}"><title>${esc(C[C.length - 1].nom)}</title></path>` : ''));
    // entre deux courbes d'une même température, au besoin : au milieu, à une hauteur où elles s'écartent assez (le texte
    // tient entre elles sur toute sa hauteur), du bas vers le haut
    const entre = (l, a, b) => { const out = [], w = largeurEtiquette(l[0][0], 11);
      for (let y = H - B - 6; y >= T + 12; y -= 6) { const xa = Math.max(...[y - 9, y - 3, y + 3].map(z => xA(a, z))), xb = Math.min(...[y - 9, y - 3, y + 3].map(z => xA(b, z)));
        if (isFinite(xa) && isFinite(xb) && xb - xa > w + 12) out.push(etiquette(l, (xa + xb) / 2, y, 'middle')); } return out; };
    const groupes = toutes ? (() => { const parT = new Map(); C.forEach((c, k) => { const key = c.temperature != null ? c.temperature : c.nom; (parT.get(key) || parT.set(key, []).get(key)).push(k); }); return [...parT.values()]; })()
      : (C.length > 1 ? [[0], [C.length - 1]] : [[0]]);
    const bout = ks => ks[0] === 0 || ks[ks.length - 1] === C.length - 1;
    groupes.filter(bout).concat(groupes.filter(ks => !bout(ks))).forEach(ks => { const c0 = C[ks[0]], l = [[nomDeTemperature(c0), '', 11]];
      const a = ech[ks[0]], b = ech[ks[ks.length - 1]], xa = tr[ks[0]].coude[0] + dx, xb = tr[ks[ks.length - 1]].coude[0] + dx, premier = ks[0] === 0, dernier = ks[ks.length - 1] === C.length - 1, role = premier || dernier ? 'bord' : 'milieu';
      const cands = premier && !dernier ? [...marge(l, xa - 4, 'end', [xa]), ...lelong(l, a, G, [-1], 1), ...lelong(l, a, G, [1], -1)]
        : dernier && !premier ? [...marge(l, xb + 4, 'start', [xb]), ...lelong(l, b, G, [1], 1), ...lelong(l, b, G, [-1], -1)]
        : [...marge(l, (xa + xb) / 2, 'middle', ks.length > 1 ? [xa, xb] : [xa]), ...entre(l, a, b), ...lelong(l, b, G, [1], 1)];
      etiqBande += nommerEn(P.essayer(cands), 'dj-t ' + role, dx, role); });
    ticsBande = traitsNoms.splice(0).join(''); }
  if (cal) { const mot = P.essayer([etiquette([['déclenche', '', 10.5]], Wd - R - 7, T + 15, 'end'), etiquette([['déclenche', '', 10.5]], Wd - R - 7, T + 40, 'end')]); if (mot) etiqFixes += etiquetteSvg(mot, 'dj-zone', 0); }
  // la limite de dommage du fil le plus faible : des tirets fins, nommés à leur bout — rouges quand le disjoncteur ne le protège pas
  let dommage = '', etiqDom = '';
  if (dom) { const f = faible.f, ko = f.protege === false, mot = (f.cable || 'fil') + ' · ' + (f.type || '?');
    dommage = `<path class="dj-dommage${ko ? ' ko' : ''}" d="${descente(dom)}"><title>${esc('Limite de dommage de ' + mot + (f.jugeSur === 'dommage' ? ' (table Dommage des fils)' : ' (ses intensités de service)') + (ko ? ' : le ' + (cal ? amperes(cal) : 'disjoncteur') + ' ne le protège pas' : ''))}</title></path>`;
    // nommée le long de sa pente d'abord (sous le coude), sinon le long de sa verticale
    const cands = lelong([[mot, '', 10.5]], echDom, G, [-1, 1], 1, 5), sous = c => c.y > dom.coude[1] + 8, e = P.essayer([...cands.filter(sous), ...cands.filter(c => !sous(c))]); if (e) etiqDom = etiquetteSvg(e, 'dj-dom' + (ko ? ' ko' : ''), 0); }
  const glisse = `data-glisse="${f2(dx)}" style="transform:translate(${f2(dx)}px,0)"`, enIn = grapheIn(G, cal, dx);
  const s = papierSvg(G) + `<defs><clipPath id="${clip}"><rect x="${L}" y="${T}" width="${Wd - L - R}" height="${H - T - B}"/></clipPath></defs>`
    + `<g clip-path="url(#${clip})"><g class="dj-voisins">${voisins}</g>${cal ? `<g class="dj-cal" data-cal="${cal}" ${glisse}>${bande}</g>` : ''}${dommage}</g>`
    + `<rect class="dj-cadre" x="${net(L)}" y="${net(T)}" width="${Wd - L - R - 1}" height="${H - T - B - 1}"/>`
    + `<g class="dj-etiquettes">${etiqFixes}${cal ? `<g class="dj-cal-t" ${glisse}>${ticsBande}${etiqBande}${enIn}</g>` : ''}${etiqDom}</g>`
    + `<g class="dj-prof">${pts}</g><g class="dj-vise" hidden><line class="dj-croix" x1="0" y1="0" x2="0" y2="0"/><line class="dj-croix" x1="0" y1="0" x2="0" y2="0"/></g>`;
  return `<svg class="dj-svg" viewBox="0 0 ${Wd} ${H}" width="${Wd}" height="${H}" data-xlo="${G.xlo}" data-xhi="${G.xhi}" data-w="${Wd}" role="img" aria-label="${escA('Courbe de déclenchement' + (cal ? ' du ' + amperes(cal) : '') + ', le profil de charge en escalier')}">${s}</svg>`; }
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
/* La bulle du survol, courte dans toutes les vues : un titre (le courant, la durée), une ligne (ce que le calibre tient à la
   courbe qui juge), un verdict. */
function carteTip(titre, sous, verdict, cls) { return `<div class="dj-tip-t"><b>${titre}</b>${sous ? `<span>${sous}</span>` : ''}</div>`
  + (verdict ? `<div class="dj-tip-v${cls ? ' ' + cls : ''}">${verdict}</div>` : ''); }
// un multiple du calibre, en mots : « 1,2 In »
const motIn = (i, cal) => cal > 0 ? nombre(Math.round(i / cal * 100) / 100) + '\u00a0In' : '';
/* Survoler un point dit son sort en une bulle courte ; survoler une bande voisine dit ce que ce calibre ferait, un clic le
   retient ; ailleurs dans le cadre, un réticule lit le courant (et son multiple de In) et la durée. Glisser un point change le courant et la durée de son état — l'escalier, les points et la gamme suivent
   en direct, le contrat s'écrit quand on lâche. Quand le calibre a changé depuis le dernier dessin, la bande glisse
   (`DJ_ANIM`, 08-disjoncteurs : le dernier décalage dessiné par repère). */
function lierGraphique(fig, nom, E, lire, ecrire, retenir) { const d = E.d, svg = fig.querySelector('svg'), tip = fig.querySelector('.dj-tip'); if (!svg || !d.courbes.length) return;
  const faible = filLePlusFaible(d), G = geometrieGraphe(d, +svg.dataset.w, faible, DJ_VUE), { L, R, T, B, H } = G, W = G.W, cal = d.calibre, C = d.courbes, vise = svg.querySelector('.dj-vise');
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
  const cacher = () => { tip.hidden = true; vise.hidden = true; svg.querySelectorAll('.dj-voisin.vise').forEach(g => g.classList.remove('vise')); };
  const croix = p => { const [a, b] = vise.querySelectorAll('line'); a.setAttribute('x1', f2(p.x)); a.setAttribute('x2', f2(p.x)); a.setAttribute('y1', T); a.setAttribute('y2', H - B); b.setAttribute('x1', L); b.setAttribute('x2', W - R); b.setAttribute('y1', f2(p.y)); b.setAttribute('y2', f2(p.y)); vise.hidden = false; };
  const toutes = () => DJ_VUE.temperatures && C.length > 2;
  // la bulle d'un point : ce que le calibre tient à la courbe qui juge, le verdict (les courbes qui déclenchent, s'il en est)
  const cartePoint = pt => { const m0 = pt.marges[0], titre = esc(amperes(pt.i)) + (pt.t === Infinity ? ' · toujours' : ' · ' + esc(secondes(pt.t))); if (!m0) return carteTip(titre, esc(pt.nom), 'pas jugé', 'info');
    const rates = pt.marges.filter(m => !m.ok).map(m => m.courbe), bilan = pt.t === Infinity ? '' : ' · ' + esc(motFraction(m0.somme)) + ' du temps consommé';
    const sous = esc(pt.nom) + (!cal ? '' : ' — le ' + esc(amperes(cal)) + (pt.t === Infinity ? ' garantit ' + esc(amperes(m0.admis)) : m0.temps === Infinity ? ' ne déclenche pas' : ' tient ' + esc(secondes(m0.temps))) + ' à ' + esc(m0.courbe));
    const verdict = pt.ok === false ? `<em>déclenche</em> à ${rates.length === pt.marges.length ? 'toute température' : esc(rates.join(', '))}${bilan}` : pt.serre ? (pt.t === Infinity ? 'tient, sans ' + esc(nombre(d.marges.marge)) + ' % de marge' : 'tient, mais touche la courbe' + bilan) : (pt.t === Infinity ? 'ne déclenche jamais' : 'tient à toute température' + bilan);
    return carteTip(titre, sous, verdict, pt.ok === false ? 'ko' : pt.serre ? 'serre' : 'ok'); };
  // le réticule : à ce courant (et ce multiple de In), ce que le calibre retenu tient à la courbe qui juge
  const carteReticule = (i, t) => { const titre = esc(amperes(i)) + ' · ' + esc(secondes(t)); if (!cal) return carteTip(titre, '', '', '');
    const tt = tempsDeDeclenchement(C[0], i / cal); return carteTip(titre, esc(motIn(i, cal)) + ' — le ' + esc(amperes(cal)) + (tt === Infinity ? ' n’y déclenche jamais' : ' y tient ' + esc(secondes(tt))) + ' à ' + esc(C[0].nom), '', ''); };
  const carteVoisin = g => carteTip(esc(amperes(g.calibre)), g.valide == null ? '' : g.valide ? (g.calibre === d.meilleur.calibre ? 'tiendrait — le meilleur' : g.marge ? 'tiendrait' : 'tiendrait, serré') : 'déclencherait', 'cliquer pour le retenir', 'info');
  // glisser un point : le profil se rejuge en direct (l'escalier, les points et la gamme), le contrat s'écrit au lâcher
  let prise = null, base = null;
  const traitsDeBase = () => { const P = poseur(G), tr = C.map(c => traceLisse(c, G)), dx = G.dx(cal); if (cal) (toutes() ? tr : [tr[0], tr[tr.length - 1]]).forEach(t => t && P.traits(echantillons(t, dx, T), 2)); return P; };
  const juger = profil => { const dd = { ...d, ...verdictDisjonction(app.norme, d.courbe, cal, profil, d.contexte) }; base = base || traitsDeBase(); const P = poseur(G); base.pris.forEach(b => P.boite(b));
    svg.querySelector('.dj-prof').innerHTML = pointsSvg(dd.points, G, P);
    document.querySelectorAll(`.fi-dj[data-disj="${CSS.escape(nom)}"] .dj-chip`).forEach(b => { const g = dd.gamme.find(x => x.calibre === +b.dataset.cal); if (g) { b.classList.toggle('ok', g.valide === true && !!g.marge); b.classList.toggle('serre', g.valide === true && !g.marge); b.classList.toggle('ko', g.valide === false); } });
    return dd; };
  svg.onpointermove = e => { const p = local(e);
    if (prise) { const i = Math.max(0.01, G.iDe(Math.min(W - R, Math.max(L, p.x)))), t = G.tDe(Math.min(H - B, Math.max(T, p.y))), el = prise.etat, ri = +i.toPrecision(3), rt = +t.toPrecision(2);
      el.i = ri; if (prise.k !== 'perm') el.t = rt; const dd = juger(prise.profil), pt = dd.points.find(x => x.k === prise.k) || dd.points.find(x => x.i === ri);
      montrer(p, pt ? cartePoint(pt) : carteTip(esc(amperes(ri)) + (prise.k === 'perm' ? '' : ' · ' + esc(secondes(rt))), esc(el.nom || ''), '', '')); return; }
    const g = e.target.closest && e.target.closest('.dj-pt'), v = e.target.closest && e.target.closest('.dj-voisin');
    svg.querySelectorAll('.dj-voisin.vise').forEach(x => { if (x !== v) x.classList.remove('vise'); });
    if (g) { const pt = d.points.find(x => x.k === g.dataset.k); if (pt) { vise.hidden = true; montrer(p, cartePoint(pt)); return; } }
    if (v) { const gm = d.gamme.find(x => x.calibre === +v.dataset.cal); if (gm) { v.classList.add('vise'); vise.hidden = true; montrer(p, carteVoisin(gm)); return; } }
    if (!dansLeCadre(p)) { cacher(); return; }
    croix(p); montrer(p, carteReticule(G.iDe(p.x), G.tDe(p.y))); };
  svg.onpointerleave = () => { if (!prise) cacher(); };
  svg.onclick = e => { const v = e.target.closest && e.target.closest('.dj-voisin'); if (v && !prise) retenir(+v.dataset.cal); };
  svg.onpointerdown = e => { const g = e.target.closest && e.target.closest('.dj-pt'); if (!g || e.button) return;
    const profil = lire(), k = g.dataset.k, etat = k === 'perm' ? profil.perm : /^plus/.test(k) ? profil.plus[+k.slice(4)] : profil[k]; if (!etat) return;
    prise = { k, etat, profil }; svg.classList.add('tient'); try { svg.setPointerCapture(e.pointerId); } catch (_) { } e.preventDefault(); };
  const lacher = e => { if (!prise) return; const c = prise.profil; prise = null; svg.classList.remove('tient'); cacher(); try { svg.releasePointerCapture(e.pointerId); } catch (_) { } ecrire('profil de charge de ' + nom, c); };
  svg.onpointerup = lacher; svg.onpointercancel = lacher;
  // au clavier, le focus sur un point montre sa bulle
  svg.querySelectorAll('.dj-pt').forEach(g => { g.onfocus = () => { const pt = d.points.find(x => x.k === g.dataset.k), c = g.querySelector('.dj-point'); if (pt && c) montrer({ x: +c.getAttribute('cx'), y: +c.getAttribute('cy') }, cartePoint(pt)); }; g.onblur = cacher; }); }
