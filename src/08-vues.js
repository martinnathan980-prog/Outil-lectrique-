/* ===========================================================================
   08 — LES VUES DE LA FICHE (v78) : la pièce dessinée, et pourquoi elle est ainsi
   Le lecteur, sur la maquette : « le schéma qui parle, c'est bien » ; « il faut qu'on comprenne d'où ça vient, pourquoi
   on en est là — toutes les infos de manière précise, propre, mais très simple ». Ce module dessine, pour chaque genre
   d'objet, ce qu'on comprend d'un coup d'œil :
     · le disjoncteur — ce qu'il tire contre ses calibres (le fichier, le retenu, ceux qui passent), puis l'arbre de ses
       câbles, chacun sa charge au bout ;
     · l'équipement — la face de chaque connecteur (plein = pris, creux = libre, rouge = refusé), puis ses broches ;
     · la barrette — ses potentiels en couleur, chacun avec ses câbles ;
     · la prise de coupure — LA TRAVERSÉE : ce qui arrive par la fiche, la lettre du contact, ce qui repart par l'embase ;
     · le câble — son chemin d'un bout à l'autre, et deux jauges (l'intensité, la chute).
   Et sous chaque schéma, « COMMENT VOLTA L'A DÉCIDÉ » : trois ou quatre étapes numérotées, chacune une phrase et sa
   source en pastille (votre fichier, la norme, les tables de VOLTA, une hypothèse). Puis LA FABRICATION : tout ce qu'il
   faut pour monter la pièce, compté par référence.
   Ces fonctions ne calculent rien : les fiches (08-fiche) leur donnent les chiffres du moteur.
   =========================================================================== */
'use strict';

/* ---- (v83) LA ZONE D'UN GROUPE (une barrette). Le lecteur : « tu ne les relies pas par un trait, c'est dégueulasse ;
   c'est la zone entière de la barrette qui doit être prise, de manière très esthétique ». Dans le vrai module, les
   contacts d'un groupe tiennent à une même pièce de métal : on la dessine. Une PLAGE d'un seul tenant qui épouse ses
   contacts : chacun au centre d'un carré de demi-côté `rho`, les voisins du groupe soudés (en ligne, en L, en bloc), les
   coins sortants arrondis au rayon `rho` — le bout d'une rangée est un demi-cercle centré sur son contact —, les coins
   rentrants adoucis. Une place vide cernée par le groupe (« . » dans la disposition) en fait partie : la plage reste
   pleine. Une face libre (« lettre@x:y ») : l'enveloppe des contacts, arrondie au même rayon. Toujours UN chemin fermé :
   un remplissage teinté et un liseré net, rien de flou, rien qui se superpose. ---- */
const faceZoneN = v => String(Math.round(v * 100) / 100);
// le chemin d'un contour polygonal, ses coins arrondis : sortants au rayon `rc`, rentrants au rayon `rf` (sens horaire
// à l'écran : la plage est à droite du chemin, un virage à droite est un coin sortant)
function faceZoneArrondi(pts, rc, rf) { const n = pts.length; if (n < 3) return '';
  const k = pts.map((v, i) => { const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n], la = Math.hypot(v[0] - a[0], v[1] - a[1]), lb = Math.hypot(b[0] - v[0], b[1] - v[1]);
    const u = [(v[0] - a[0]) / la, (v[1] - a[1]) / la], w = [(b[0] - v[0]) / lb, (b[1] - v[1]) / lb], sort = u[0] * w[1] - u[1] * w[0] > 0, r = Math.min(sort ? rc : rf, la / 2, lb / 2);
    return { s: [v[0] - u[0] * r, v[1] - u[1] * r], e: [v[0] + w[0] * r, v[1] + w[1] * r], r, sw: sort ? 1 : 0 }; });
  const P = q => faceZoneN(q[0]) + ' ' + faceZoneN(q[1]);
  return 'M' + P(k[n - 1].e) + k.map(c => 'L' + P(c.s) + 'A' + faceZoneN(c.r) + ' ' + faceZoneN(c.r) + ' 0 0 ' + c.sw + ' ' + P(c.e)).join('') + 'Z'; }
// la plage d'un groupe posé sur la grille : l'union des carrés et de leurs soudures, son contour (une boucle par bord —
// un trou s'il y en a un, tourné à l'envers, reste un trou), chaque coin arrondi
function faceZoneGrille(cases, P, rho) { const S = new Set(cases.map(q => q.join(':'))), a = (r, c) => S.has(r + ':' + c), rects = [];
  cases.forEach(([r, c]) => { const [x, y] = P(r, c); rects.push([x - rho, y - rho, x + rho, y + rho]);
    if (a(r, c + 1)) rects.push([x - rho, y - rho, P(r, c + 1)[0] + rho, y + rho]);
    if (a(r + 1, c)) rects.push([x - rho, y - rho, x + rho, P(r + 1, c)[1] + rho]);
    if (a(r, c + 1) && a(r + 1, c) && a(r + 1, c + 1)) { const [x2, y2] = P(r + 1, c + 1); rects.push([x - rho, y - rho, x2 + rho, y2 + rho]); } });
  const Q = rects.map(q => q.map(v => Math.round(v * 100) / 100)), tri = v => [...new Set(v)].sort((u, w) => u - w), X = tri(Q.flatMap(q => [q[0], q[2]])), Y = tri(Q.flatMap(q => [q[1], q[3]]));
  const plein = Y.slice(1).map((_, j) => X.slice(1).map((_, i) => Q.some(q => q[0] <= X[i] && X[i + 1] <= q[2] && q[1] <= Y[j] && Y[j + 1] <= q[3])));
  const pl = (i, j) => j >= 0 && j < plein.length && i >= 0 && i < plein[j].length && plein[j][i], depart = new Map();
  const arete = (u, v) => { const c = u.join(','); (depart.get(c) || depart.set(c, []).get(c)).push([u, v]); };
  plein.forEach((ln, j) => ln.forEach((x, i) => { if (!x) return;
    if (!pl(i, j - 1)) arete([X[i], Y[j]], [X[i + 1], Y[j]]); if (!pl(i + 1, j)) arete([X[i + 1], Y[j]], [X[i + 1], Y[j + 1]]);
    if (!pl(i, j + 1)) arete([X[i + 1], Y[j + 1]], [X[i], Y[j + 1]]); if (!pl(i - 1, j)) arete([X[i], Y[j + 1]], [X[i], Y[j]]); }));
  const vues = new Set(); let d = '';
  depart.forEach(es => es.forEach(e0 => { if (vues.has(e0)) return; const pts = []; let e = e0;
    while (e && !vues.has(e)) { vues.add(e); pts.push(e[0]); e = (depart.get(e[1].join(',')) || []).find(x => !vues.has(x)); }
    // les points alignés tombent : il reste les coins
    const coins = pts.filter((v, i) => { const u = pts[(i + pts.length - 1) % pts.length], w = pts[(i + 1) % pts.length]; return !((u[0] === v[0] && v[0] === w[0]) || (u[1] === v[1] && v[1] === w[1])); });
    d += faceZoneArrondi(coins, rho, rho * 0.42); }));
  return d; }
// l'enveloppe convexe de quelques centres, gonflée de `rho` : un cercle, une gélule, un polygone aux coins ronds
function faceZoneEnveloppe(ps, rho) { const s = ps.slice().sort((u, v) => u[0] - v[0] || u[1] - v[1]), x = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const bas = [], haut = []; s.forEach(q => { while (bas.length > 1 && x(bas[bas.length - 2], bas[bas.length - 1], q) <= 0) bas.pop(); bas.push(q); });
  s.slice().reverse().forEach(q => { while (haut.length > 1 && x(haut[haut.length - 2], haut[haut.length - 1], q) <= 0) haut.pop(); haut.push(q); });
  const H = bas.slice(0, -1).concat(haut.slice(0, -1)).filter((q, i, t) => !i || q[0] !== t[i - 1][0] || q[1] !== t[i - 1][1]), N = faceZoneN, n = H.length;
  if (n < 2) { const [cx, cy] = s[0]; return { H: [s[0]], d: `M${N(cx - rho)} ${N(cy)}A${N(rho)} ${N(rho)} 0 1 1 ${N(cx + rho)} ${N(cy)}A${N(rho)} ${N(rho)} 0 1 1 ${N(cx - rho)} ${N(cy)}Z` }; }
  const no = H.map((a, i) => { const b = H[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[1] - a[1]) / l * rho, -(b[0] - a[0]) / l * rho]; });
  return { H, d: 'M' + N(H[0][0] + no[0][0]) + ' ' + N(H[0][1] + no[0][1]) + H.map((_, i) => { const b = H[(i + 1) % n], m1 = no[i], m2 = no[(i + 1) % n];
    return 'L' + N(b[0] + m1[0]) + ' ' + N(b[1] + m1[1]) + 'A' + N(rho) + ' ' + N(rho) + ' 0 0 1 ' + N(b[0] + m2[0]) + ' ' + N(b[1] + m2[1]); }).join('') + 'Z' }; }
// la distance d'un point à une enveloppe (0 dedans)
function faceZoneDistance(f, H) { const n = H.length; if (n === 1) return Math.hypot(f[0] - H[0][0], f[1] - H[0][1]);
  let dedans = n > 2, m = Infinity;
  H.forEach((a, i) => { const b = H[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((f[0] - a[0]) * dx + (f[1] - a[1]) * dy) / (dx * dx + dy * dy)));
    m = Math.min(m, Math.hypot(f[0] - a[0] - t * dx, f[1] - a[1] - t * dy)); if (dx * (f[1] - a[1]) - dy * (f[0] - a[0]) < 0) dedans = false; });
  return dedans ? 0 : m; }
// la plage d'un groupe : `g.contacts` parmi `tous` (ceux de la face), P(r, c) → [x, y] ; R le rayon d'un contact, p le pas
function faceZone(g, tous, P, rho, R, p) { const cle = c => (+c.r || 0) + ':' + (+c.c || 0), siens = new Set(g.contacts.map(cle));
  const etrangers = tous.filter(c => !siens.has(cle(c))).map(c => P(+c.r || 0, +c.c || 0)), libre = H => etrangers.every(f => faceZoneDistance(f, H) >= rho + R + 1.5);
  const morceaux = (xs, voisin) => { const reste = xs.slice(), out = []; while (reste.length) { const cc = [reste.shift()];
    for (let i = 0; i < cc.length; i++) for (let j = reste.length - 1; j >= 0; j--) if (voisin(cc[i], reste[j])) cc.push(reste.splice(j, 1)[0]); out.push(cc); } return out; };
  if (tous.every(c => Number.isInteger(+c.r || 0) && Number.isInteger(+c.c || 0))) {
    // une place vide cernée par le groupe (trois voisins au moins, tous à lui) entre dans sa plage
    const occ = new Set(tous.map(cle)), rs = tous.map(c => +c.r || 0), cs = tous.map(c => +c.c || 0), cases = g.contacts.map(c => [+c.r || 0, +c.c || 0]);
    for (let r = Math.min(...rs); r <= Math.max(...rs); r++) for (let c = Math.min(...cs); c <= Math.max(...cs); c++) { if (occ.has(r + ':' + c)) continue;
      const vs = [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]].map(q => q.join(':')).filter(k => occ.has(k)); if (vs.length >= 3 && vs.every(k => siens.has(k))) cases.push([r, c]); }
    const uniques = [...new Map(cases.map(q => [q.join(':'), q])).values()], parts = morceaux(uniques, (u, v) => Math.abs(u[0] - v[0]) + Math.abs(u[1] - v[1]) === 1);
    if (parts.length === 1) return faceZoneGrille(parts[0], P, rho);
    // en morceaux sur la grille (une norme d'atelier) : l'enveloppe si elle ne mord sur aucun autre contact, sinon chaque morceau
    const env = faceZoneEnveloppe(g.contacts.map(c => P(+c.r || 0, +c.c || 0)), rho);
    return libre(env.H) ? env.d : parts.map(pt => faceZoneGrille(pt, P, rho)).join(''); }
  const ps = g.contacts.map(c => P(+c.r || 0, +c.c || 0)), env = faceZoneEnveloppe(ps, rho); if (libre(env.H)) return env.d;
  return morceaux(ps, (u, v) => Math.hypot(u[0] - v[0], u[1] - v[1]) <= 1.3 * p).map(pt => { const e = faceZoneEnveloppe(pt, rho); return libre(e.H) ? e.d : pt.map(q => faceZoneEnveloppe([q], rho).d).join(''); }).join(''); }

/* ---- LA FACE d'un connecteur, d'une barrette, d'une prise : chaque contact à sa place (r, c), plein s'il est pris,
   rouge s'il refuse ; `couleur(ct)` (une barrette : la couleur de son potentiel) ; `rond` : une prise circulaire ;
   `bus` (une barrette) : [{ contacts, couleur }], les groupes de contacts reliés — chacun sa plage. ---- */
function faceVue(contacts, etatDe, o) { o = o || {}; const n = (contacts || []).length;
  if (!n) return `<svg class="vu-face vu-vide" viewBox="0 0 120 84" width="${o.w || 120}" role="img" aria-label="Aucun arrangement"><rect class="vu-corps" x="4" y="4" width="112" height="76" rx="10"/><text x="60" y="40">aucun</text><text x="60" y="53">arrangement</text></svg>`;
  const F = faceDessin(contacts, etatDe, o);
  // (v84) `echelle` : la face agrandie d'un même facteur, quel que soit le module — deux modules montrent des contacts de
  // même taille (un module de dix contacts n'est plus deux fois plus gros qu'un de dix-huit)
  return `<svg class="vu-face${o.mini ? ' mini' : ''}${F.zones ? ' a-zones' : ''}" viewBox="0 0 ${F.W.toFixed(0)} ${F.H.toFixed(0)}" width="${o.w || Math.round(F.W * (o.echelle || 1))}" role="img" aria-label="${escA(o.titre || 'La face')}">${F.svg}</svg>`; }
/* (v86, l'audit G10) LE TRAIT SOUS LES MINUSCULES d'une écriture en chasse fixe : « 51e » se lit d'un coup d'œil autre que
   « 51E ». Dans le même texte, une seconde ligne posée au même x : un « _ » sous chaque minuscule, une espace insécable sous
   le reste — le trait fin de la police, à la couleur de la lettre quel que soit son état ou le thème (la marque du plan, 06
   `soulignement`). Rien pour une écriture sans minuscule. */
const sousMinuscules = (t, x) => { const s = String(t == null ? '' : t); return /[a-z]/.test(s) ? `<tspan x="${x}">${[...s].map(ch => /[a-z]/.test(ch) ? '_' : ' ').join('')}</tspan>` : ''; };
/* (v85) LE DESSIN d'une face, sans son cadre <svg> : le corps, les plages des groupes, les contacts — dans un repère de
   (0, 0) à (W, H). La face seule (`faceVue`) et la barrette entière (`barretteVue`) le posent. */
function faceDessin(contacts, etatDe, o) {
  const xs = contacts.map(c => +c.c || 0), ys = contacts.map(c => +c.r || 0), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  // (les lettres s'écrivent DANS les contacts : au-dessus, elles chevauchaient le rang d'avant)
  // (v83) une barrette : chaque plage déborde de ses contacts (`rho`), et deux plages voisines gardent entre elles un
  // jour franc — le pas s'élargit d'autant (la vignette garde le sien : ses lettres l'avaient déjà élargi)
  const grp = (o.bus || []).filter(g => g && g.contacts && g.contacts.length), R = o.r || 8, rho = R + (o.mini ? 1.5 : 3);
  const p = Math.max(o.pas || 26, o.lettres ? 2 * R + 6 : 0, grp.length ? 2 * rho + (o.mini ? 3 : 4) : 0), m = o.rond ? 28 : grp.length && !o.mini ? 20 : 18, W = (x1 - x0) * p + 2 * m, H = (y1 - y0) * p + 2 * m;
  const corps = o.rond ? `<circle class="vu-corps" cx="${W / 2}" cy="${H / 2}" r="${(Math.max(W, H) / 2 - 3).toFixed(1)}"/><rect class="vu-cle" x="${W / 2 - 5}" y="1" width="10" height="7" rx="2"/>`
    : `<rect class="vu-corps" x="2" y="2" width="${W - 4}" height="${H - 4}" rx="${o.mini ? 7 : 11}"/><rect class="vu-cle" x="${W / 2 - 13}" y="${H - 5}" width="26" height="4" rx="2"/>`;
  const P = (r, c) => [m + (c - x0) * p, m + (r - y0) * p], pos = c => P(+c.r || 0, +c.c || 0);
  const ct = c => { const [x, y] = pos(c), st = etatDe(c) || '', col = o.couleur ? o.couleur(c) : '', L = String(c.lettre || '');
    const style = col ? (st === 'pris' ? ` style="fill:${col};stroke:${col}"` : ` style="stroke:${col}"`) : '';
    const va = o.va ? o.va(c) : null;
    /* (v86, l'audit G10) une minuscule (« e » d'une grande face, qui a aussi « E ») est soulignée comme sur le plan : un trait
       fin sous la lettre, celui de la police (« _ » posé sous elle, dans le même texte : la couleur de la lettre, quel que soit
       son état ou le thème) */
    const min = /^[a-z]+$/.test(L);
    return `<g class="vu-ct-g${va ? ' va' : ''}" data-ct="${escA(L)}"${va ? ` data-va-onglet="${escA(va.onglet)}" data-va-vers="${escA(va.vers)}" role="button" tabindex="0" aria-label="${escA('Le contact ' + L + (min ? ' (minuscule)' : ''))}"` : ''}><circle class="vu-ct ${st}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${R}"${style}/>${o.lettres ? `<text class="${st}${L.length > 2 ? ' long' : ''}" x="${x.toFixed(1)}" y="${(y + 3.4).toFixed(1)}">${esc(L)}${sousMinuscules(L, x.toFixed(1))}</text>` : ''}</g>`; };
  // (v83) LES GROUPES RELIÉS : chaque groupe, sa plage puis ses contacts par-dessus (un survol de l'un éveille la plage
  // entière) ; teintée à la couleur du groupe s'il porte des câbles — la même que ses câbles dans la fiche —, neutre sinon
  const cle = c => (+c.r || 0) + ':' + (+c.c || 0), sienDe = new Map(); grp.forEach((g, k) => g.contacts.forEach(c => sienDe.set(cle(c), k)));
  const zones = grp.map((g, k) => `<g class="vu-zone-g"><path class="vu-zone${g.couleur ? '' : ' libre'}" d="${faceZone(g, contacts, P, rho, R, p)}"${g.couleur ? ` style="--zc:${escA(g.couleur)}"` : ''}/>${contacts.filter(c => sienDe.get(cle(c)) === k).map(ct).join('')}</g>`).join('');
  const cts = contacts.filter(c => !sienDe.has(cle(c))).map(ct).join('');
  return { svg: (o.sansCorps ? '' : corps) + zones + cts, corps, W, H, zones: grp.length > 0 }; }
/* ---- (v85) LA BARRETTE ENTIÈRE, comme la vraie pièce (le lecteur : « une barrette, c'est plusieurs modules ; qu'elle me
   sorte les autres modules, bien alignés les uns après les autres, comme sur une barrette ») : le RAIL, et dessus tous les
   modules côte à côte, chacun debout — sa face, ses lettres, ses zones (les groupes) —, son numéro au-dessus (51, 52…),
   sa référence dessous. Tous les modules ont la même hauteur, comme sur le rail : le pas de chacun suit son nombre de
   rangées (un module de neuf rangées de #22 est plus serré qu'un de six rangées de #20). Une face plus large que haute
   (NSA937901 de dix contacts) se dresse d'un quart de tour, comme elle se monte sur le rail. Le module montré est cerné
   de cuivre ; un clic sur un module mène où il se choisit (ou à sa fiche, s'il en a une) ; une lettre, à son contact.
   mods : [{ titre, sous, contacts, etat(ct), couleur(ct), bus: [{ contacts, couleur }], va(ct), ici, lien: { onglet, vers },
   frere, bulle, ko }] ; o : { mini, titre } ---- */
function barretteVue(mods, o) { o = o || {}; const mini = !!o.mini, xs = (mods || []).filter(M => M && M.contacts && M.contacts.length); if (!xs.length) return '';
  // debout : une face plus large que haute tourne d'un quart de tour (dans le sens des aiguilles) ; ses groupes la suivent
  const debout = M => { const cs = M.contacts, w = Math.max(...cs.map(c => +c.c || 0)) - Math.min(...cs.map(c => +c.c || 0)), h = Math.max(...cs.map(c => +c.r || 0)) - Math.min(...cs.map(c => +c.r || 0));
    if (w <= h) return M; const yMax = Math.max(...cs.map(c => +c.r || 0)), tourne = new Map(cs.map(c => [c, { ...c, r: +c.c || 0, c: yMax - (+c.r || 0) }]));
    const t = c => tourne.get(c) || c, base = new Map(cs.map(c => [tourne.get(c), c]));
    return { ...M, contacts: cs.map(t), bus: (M.bus || []).map(g => ({ ...g, contacts: g.contacts.map(t) })), etat: c => M.etat(base.get(c) || c), couleur: M.couleur ? c => M.couleur(base.get(c) || c) : null, va: M.va ? c => M.va(base.get(c) || c) : null }; };
  const ds = xs.map(debout), rangs = M => Math.max(1, Math.max(...M.contacts.map(c => +c.r || 0)) - Math.min(...M.contacts.map(c => +c.r || 0)));
  // la hauteur commune : celle du module le plus serré, au pas qui laisse lire ses lettres
  // (la marge d'une face est celle que `faceDessin` lui donne : 20 autour des plages en grand, 18 sinon)
  const marge = M => !mini && M.bus && M.bus.some(g => g && g.contacts && g.contacts.length) ? 20 : 18, pMin = mini ? 17 : 26;
  const Ht = Math.max(mini ? 120 : 230, ...ds.map(M => rangs(M) * pMin + 2 * marge(M)));
  const ecart = mini ? 9 : 18, bord = mini ? 12 : 22, hautT = mini ? 15 : 24, basT = mini ? 15 : 30, yC = hautT;
  let x = bord; const poses = ds.map(M => { const p = (Ht - 2 * marge(M)) / rangs(M), R = Math.max(mini ? 4 : 6, Math.min(p * 0.36, (p - (mini ? 6 : 10)) / 2, mini ? 7.5 : 12));
    const F = faceDessin(M.contacts, M.etat, { lettres: true, mini, pas: p, r: R, bus: M.bus, couleur: M.couleur, va: M.va }), X0 = x; x += F.W + ecart; return { M, F, x: X0 }; });
  const W = x - ecart + bord, H = hautT + Ht + basT, yR = yC + Ht / 2, hR = Math.round(Ht * 0.2);
  // le rail : la bande qui court sous les modules, ses deux butées aux bouts
  // (un métal neutre, lisible de jour comme de nuit : l'encre du texte, très diluée dans le papier de la fiche)
  const metal = 'fill:color-mix(in srgb,var(--t-1) 9%,var(--s-surface));stroke:color-mix(in srgb,var(--t-1) 24%,var(--s-surface))';
  const rail = `<rect x="2" y="${(yR - hR / 2).toFixed(1)}" width="${(W - 4).toFixed(1)}" height="${hR}" rx="3" style="${metal};stroke-width:1"/>`
    + `<path d="M6 ${(yR - hR / 2 + 3).toFixed(1)}H${(W - 6).toFixed(1)}M6 ${(yR + hR / 2 - 3).toFixed(1)}H${(W - 6).toFixed(1)}" style="fill:none;stroke:color-mix(in srgb,var(--t-1) 14%,var(--s-surface));stroke-width:1"/>`
    + [3, W - (mini ? 9 : 13)].map(bx => `<rect x="${bx.toFixed(1)}" y="${(yR - hR / 2 - (mini ? 5 : 8)).toFixed(1)}" width="${mini ? 6 : 10}" height="${hR + (mini ? 10 : 16)}" rx="2" style="${metal};stroke-width:1.2"/>`).join('');
  // (le style en ligne : la règle des faces, « svg.vu-face text », écrirait ces titres en 9 px gris)
  const t = (police, couleur) => `style="font:${police};fill:${couleur};text-anchor:middle;pointer-events:none"`;
  const corps = poses.map(({ M, F, x: X }) => { const cx = X + F.W / 2, lien = M.lien || null, frere = M.frere || '';
    const act = lien ? ` data-va-onglet="${escA(lien.onglet)}" data-va-vers="${escA(lien.vers)}"` : frere ? ` data-frere="${escA(frere)}"` : '';
    const role = act ? ` role="button" tabindex="0" aria-label="${escA(M.bulle || ('Le module ' + M.titre))}"${M.bulle ? ` data-bulle="${escA(M.bulle)}"` : ''}` : '';
    return `<g class="vu-bar-m${M.ici ? ' ici' : ''}${M.ko ? ' ko' : ''}${act ? ' vu-ct-g va' : ''}" data-module="${escA(M.titre)}"${act}${role}>`
      + (M.ici ? `<rect x="${(X - (mini ? 3 : 5)).toFixed(1)}" y="${(yC - (mini ? 3 : 5)).toFixed(1)}" width="${(F.W + (mini ? 6 : 10)).toFixed(1)}" height="${(F.H + (mini ? 6 : 10)).toFixed(1)}" rx="${mini ? 9 : 14}" style="fill:none;stroke:var(--nv-cuivre);stroke-width:${mini ? 1.6 : 2.2}"/>` : '')
      + `<g transform="translate(${X.toFixed(1)} ${yC})">${F.corps}</g>`
      + `<text x="${cx.toFixed(1)}" y="${(yC - (mini ? 5 : 9)).toFixed(1)}" ${t(mini ? '700 10px var(--mono)' : '700 13px var(--mono)', M.ici ? 'var(--nv-cuivre)' : M.ko ? 'var(--ko)' : 'var(--t-1)')}>${esc(M.titre)}</text>`
      + (M.sous ? `<text x="${cx.toFixed(1)}" y="${(yC + Ht + (mini ? 12 : 19)).toFixed(1)}" ${t(mini ? '600 9px var(--mono)' : '600 11px var(--mono)', M.ko ? 'var(--ko)' : 'var(--t-2)')}>${esc(M.sous)}</text>` : '') + '</g>'; }).join('');
  // les contacts par-dessus, chacun dans le repère de son module (une lettre mène à son contact)
  const faces = poses.map(({ F, x: X }) => `<g transform="translate(${X.toFixed(1)} ${yC})">${F.svg.slice(F.corps.length)}</g>`).join('');
  return `<svg class="vu-face vu-barrette${mini ? ' mini' : ''} a-zones" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" width="${Math.round(W * (mini ? 1 : 1.18))}" role="img" aria-label="${escA(o.titre || 'La barrette et ses modules')}">${rail}${corps}${faces}</svg>`; }
const legendeFaceVue = (avecKo) => `<p class="vu-legende"><span><i class="pris"></i>pris</span><span><i></i>libre</span>${avecKo ? '<span><i class="ko"></i>refusé</span>' : ''}</p>`;

/* ---- CE QU'IL TIRE, CE QU'IL TIENT (un disjoncteur) : le démarrage et le permanent en barres, sur l'échelle des
   ampères ; au pied, les calibres de la gamme (vert : il passe ; rouge : non) ; le retenu en trait plein, celui du
   fichier en pointillé rouge quand il touche la courbe. ---- */
function chargeVue(d, o, W, mini) { const ch = chargeDuProfil(d), cal = d.calibre, gamme = (d.gamme || []).filter(g => g.calibre > 0);
  if (!gamme.length || !(ch.perm || ch.pointe)) return `<p class="vu-note">${esc(d.sansProfil ? 'Sans profil de charge, rien ne se juge : écrivez-le dans l’onglet Calibre.' : 'Aucune gamme de calibres connue pour ce part number.')}</p>`;
  const max = Math.max(...gamme.map(g => g.calibre), ch.pointe || 0, ch.perm || 0) * 1.08, L = 12, X = a => L + (W - 2 * L) * a / max;
  const bh = mini ? 10 : 14, y1 = mini ? 36 : 50, y2 = y1 + (mini ? 28 : 44), H = mini ? 106 : 160, yt = H - 13;
  const cRet = o && o.calRetest && o.calRetest !== cal ? o.calRetest : null, pointe = ch.pointe || ch.perm, dur = ch.pointeP && ch.pointeP.t !== Infinity ? secondes(ch.pointeP.t) : '';
  const quand = majuscule(String(quandDuPoint(ch.pointeP) || 'en pointe').replace(/^(au|en) /, ''));
  const barre = (y, v, cls) => `<rect class="vu-rail" x="${X(0)}" y="${y}" width="${(X(max) - X(0)).toFixed(1)}" height="${bh}" rx="${bh / 2}"/><rect class="${cls}" x="${X(0)}" y="${y}" width="${Math.max(bh, X(v) - X(0)).toFixed(1)}" height="${bh}" rx="${bh / 2}"/>`;
  const ticks = gamme.map(g => { const k = cleDuVerdict(g); return `<circle class="vu-tick ${k === 'passe' ? 'oui' : 'non'}" cx="${X(g.calibre).toFixed(1)}" cy="${yt - 11}" r="3"/><text class="vu-t-pied" x="${X(g.calibre).toFixed(1)}" y="${yt + 2}">${esc(nombre(g.calibre))}</text>`; }).join('');
  const mots = mini ? `<text class="vu-t" x="${X(0)}" y="${y1 - 5}">${esc(quand)} <tspan class="vu-t-fort">${esc(amperes(pointe))}</tspan></text>${ch.perm ? `<text class="vu-t" x="${X(0)}" y="${y2 - 5}">Permanent <tspan class="vu-t-fort">${esc(amperes(ch.perm))}</tspan></text>` : ''}`
    : `<text class="vu-t" x="${X(0)}" y="${y1 - 7}">${esc(quand)} <tspan class="vu-t-fort">${esc(amperes(pointe))}</tspan>${dur ? ' · pendant ' + esc(dur) : ''}</text>${ch.perm ? `<text class="vu-t" x="${X(0)}" y="${y2 - 7}">Permanent <tspan class="vu-t-fort">${esc(amperes(ch.perm))}</tspan></text>` : ''}`;
  // le retenu : son trait, son nom en haut (à droite du trait, ou à gauche quand il est au bout de l'échelle)
  const finCal = cal && X(cal) > W - 90, traitCal = cal ? `<line class="vu-cal" x1="${X(cal).toFixed(1)}" x2="${X(cal).toFixed(1)}" y1="${mini ? 14 : 8}" y2="${yt - 18}"/><text class="vu-t-fort vu-t-cal" x="${(X(cal) + (finCal ? -6 : 6)).toFixed(1)}" y="${mini ? 12 : 18}"${finCal ? ' text-anchor="end"' : ''}>${esc(amperes(cal))} retenu</text>` : '';
  const traitFic = cRet ? `<line class="vu-fic" x1="${X(cRet).toFixed(1)}" x2="${X(cRet).toFixed(1)}" y1="${mini ? 14 : 8}" y2="${yt - 18}"/>${mini ? '' : `<text class="vu-t-ko" x="${(X(cRet) - 6).toFixed(1)}" y="${yt - 24}" text-anchor="end">${esc(amperes(cRet))} : votre fichier</text>`}` : '';
  return `<svg class="vu-charge" viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-label="${escA('Ce qu’il tire contre ses calibres : ' + amperes(pointe) + ' au plus, ' + (cal ? amperes(cal) + ' retenu' : 'aucun calibre'))}">${barre(y1, pointe, 'vu-b-pointe')}${ch.perm ? barre(y2, ch.perm, 'vu-b-perm') : ''}${mots}${traitFic}${traitCal}${ticks}</svg>`; }
const legendeChargeVue = () => `<p class="vu-legende"><span><i class="carre perm"></i>permanent</span><span><i class="carre pointe"></i>démarrage</span><span><i class="ok"></i>ne disjoncte pas</span><span><i class="ko"></i>disjoncte</span></p>`;
/* ---- UNE JAUGE EN ANNEAU (le lecteur : « la barre de progression, pas top — quelque chose de circulaire ») : la part de
   l'admis, de la couleur de son état ; au centre, le pourcentage ---- */
function anneauVue(r, o) { o = o || {}; const R = o.r || 11, e = o.ep || 3.5, C = 2 * Math.PI * R, ok = r != null && isFinite(r), w = ok ? Math.max(0, Math.min(1, r)) : 0, S = 2 * R + e + 2, c = S / 2;
  // (v79) sans mesure, pas d'anneau vide (il ressemblait à un chargement) ; plus de chiffre minuscule dedans (la valeur est à côté)
  if (!ok) return `<span class="vu-anneau-vide" style="width:${S}px" aria-hidden="true"></span>`;
  return `<svg class="vu-anneau ${classeMesure(r)}" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" aria-hidden="true"><circle class="vu-an-f" cx="${c}" cy="${c}" r="${R}" style="stroke-width:${e}px"/>`
    + `<circle class="vu-an-v" cx="${c}" cy="${c}" r="${R}" style="stroke-width:${e}px;stroke-dasharray:${(C * w).toFixed(2)} ${C.toFixed(2)}" transform="rotate(-90 ${c} ${c})"/>${o.texte === true && ok ? `<text class="vu-an-t" x="${c}" y="${(c + 3.2).toFixed(1)}">${r > 9.99 ? '>999' : Math.round(r * 100)}<tspan class="vu-an-pc">%</tspan></text>` : ''}</svg>`; }

/* ---- L'ARBRE d'un disjoncteur : lui, puis chacun de ses câbles jusqu'à son bout, sa charge au bout ; une ligne
   s'ouvre d'un clic (data-i : la ligne du câble), son survol l'allume sur le plan. ---- */
function arbreVue(nom, cal, rows) { const n = rows.length; if (!n) return '<p class="vu-note">Aucun câble ne part de ce disjoncteur.</p>';
  const rh = 40, H = n * rh + 12, W = 600, yC = H / 2;
  const lignes = rows.map((r, i) => { const y = 16 + i * rh + 6, col = r.l ? coulDeFil({ l: r.l }) : 'currentColor', m = classeMesure(r.charge.r), w = r.charge.r != null && isFinite(r.charge.r) ? Math.min(1, r.charge.r) : 0;
    return `<g class="vu-branche fi-ia${r.etat ? ' ' + r.etat : ''}"${r.k ? ` data-i="${r.k}" tabindex="0" role="button" aria-label="${escA('Ouvrir le câble ' + (r.type || '') + ' vers ' + (r.bout ? r.bout.rep : ''))}"` : ''}>`
      + `<rect class="vu-b-fond" x="140" y="${y - 18}" width="${W - 140}" height="${rh - 4}" rx="9"/><path class="vu-br" d="M112 ${y}H220" style="stroke:${col}"/><circle class="vu-noeud" cx="112" cy="${y}" r="3.5"/>`
      + `<text class="vu-t-mono" x="232" y="${y + 4}">${esc(r.type || 'sans type')}</text><text class="vu-t" x="286" y="${y + 4}">vers</text><text class="vu-t-mono" x="316" y="${y + 4}">${esc(r.bout ? r.bout.rep : '—')}<tspan class="vu-t">${r.bout && r.bout.borne ? ':' + esc(r.bout.borne) : ''}</tspan></text>`
      + (() => { const Ra = 12, C = 2 * Math.PI * Ra, cx = 450, pc = r.charge.r != null && isFinite(r.charge.r) ? Math.round(r.charge.r * 100) : null;
          return `<g class="vu-an ${m}"><circle class="vu-an-f" cx="${cx}" cy="${y}" r="${Ra}"/><circle class="vu-an-v" cx="${cx}" cy="${y}" r="${Ra}" style="stroke-dasharray:${(C * w).toFixed(2)} ${C.toFixed(2)}" transform="rotate(-90 ${cx} ${y})"/>${pc != null ? `<text class="vu-an-t" x="${cx}" y="${y + 3}">${pc}</text>` : ''}</g>`; })()
      + `<text class="vu-t-fort" x="474" y="${y + 4}">${r.charge.i != null ? esc(nombreA(r.charge.i)) + ' A' : '—'}<tspan class="vu-t-sur">${r.charge.admis != null ? ' sur ' + esc(nombreA(r.charge.admis)) + ' A' : ''}</tspan></text></g>`; }).join('');
  return `<svg class="vu-arbre" viewBox="0 0 ${W} ${H}" width="${W}" role="group" aria-label="${escA('Les ' + n + ' câbles de ' + nom)}"><rect class="vu-boite" x="4" y="${yC - 25}" width="88" height="50" rx="10"/><text class="vu-t-mono vu-milieu" x="48" y="${yC - 2}">${esc(nom)}</text><text class="vu-t vu-milieu" x="48" y="${yC + 14}">${cal ? esc(amperes(cal)) : ''}</text>`
    + `<path class="vu-bus" d="M92 ${yC}H112M112 22V${16 + (n - 1) * rh + 6}"/>${lignes}</svg>`; }

/* ---- LE CHEMIN d'un câble : un bout, ce qu'il traverse, l'autre bout, à la couleur de sa route ---- */
/* (v84) dessiné comme les brochages : chaque bout, son repère et sa borne en pastille (un clic l'ouvre, le contact
   allumé) ; le trait à la couleur de la route, le type posé dessus, la longueur dessous ; la barrette ajoutée par VOLTA, au
   milieu ; sous chaque bout, ce qu'on y sertit. o : { de, borneDe, vers, borneVers, via, couleur, type, legende, sousDe,
   sousVers } */
function cheminVue(o, W, mini) { const a = mini ? 112 : 168, b = W - a, y = mini ? 24 : 30, m = (a + b) / 2, sous = !mini && (o.sousDe || o.sousVers), H = y + (sous ? 46 : 28);
  const bout = (cote, rep, borne, s) => { const g = cote === 'de', bo = String(borne || ''), r = String(rep || '—'), pw = bo ? 12 + bo.length * 6.6 : 0;
    const xRep = g ? a - 12 - (bo ? pw + 6 : 0) : b + 12, xPin = g ? a - 12 - pw : b + 18 + r.length * 7.8;
    return `<g class="vu-ch-bout" data-bout="${cote}" role="button" tabindex="0" aria-label="${escA('Ouvrir ' + r + (bo ? ', borne ' + bo : ''))}"><rect class="bro-zone" x="${g ? 0 : b + 4}" y="${y - 14}" width="${a - 4}" height="28" rx="6"/>`
      + `<text class="bro-vers" x="${xRep}" y="${y + 4.5}" text-anchor="${g ? 'end' : 'start'}">${esc(r)}</text>`
      + (bo ? `<rect class="bro-pin-f" x="${xPin}" y="${y - 9}" width="${pw}" height="18" rx="5"/><text class="bro-pin" x="${xPin + pw / 2}" y="${y + 4}">${esc(bo)}</text>` : '')
      + (s && !mini ? `<text class="bro-mot vu-ch-sous" x="${g ? a - 12 : b + 12}" y="${y + 30}" text-anchor="${g ? 'end' : 'start'}">${esc(s)}</text>` : '') + '</g>'; };
  const xT = o.via ? (a + m - 22) / 2 : m;
  return `<svg class="vu-bro vu-chemin${mini ? ' petit' : ''}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escA('De ' + o.de + ' à ' + o.vers)}">`
    + `<path class="bro-fil vu-ch-fil" d="M${a} ${y}H${b}" style="stroke:${o.couleur || 'currentColor'}"/><circle class="bro-bout" cx="${a}" cy="${y}" r="3"/><circle class="bro-bout" cx="${b}" cy="${y}" r="3"/>`
    + (o.via ? `<rect class="bro-piece vu-ch-via" x="${m - 22}" y="${y - 11}" width="44" height="22" rx="6"/><text class="bro-borne" x="${m}" y="${y + 4}">${esc(o.via)}</text>` : '')
    + (o.type ? `<rect class="bro-type-f" x="${xT - 26}" y="${y - 16}" width="52" height="13" rx="3"/><text class="bro-type" x="${xT}" y="${y - 6}">${esc(o.type)}</text>` : '')
    + (o.legende && !mini ? `<text class="bro-mot vu-ch-leg" x="${xT}" y="${y + 17}" text-anchor="middle">${esc(o.legende)}</text>` : '')
    + bout('de', o.de, o.borneDe, o.sousDe) + bout('vers', o.vers, o.borneVers, o.sousVers) + '</svg>'; }

/* ---- LA TRAVERSÉE d'une prise de coupure : ce qui arrive par la fiche (à gauche), la lettre du contact, ce qui repart
   par l'embase (à droite) — une ligne par contact ; son survol allume la lettre sur la face et le câble sur le plan ---- */
function traverseeVue(lettres, cote) { const c = (f, g) => !f ? `<span class="vu-tr-c ${g ? 'g' : ''} vide">—</span>`
    : `<span class="vu-tr-c ${g ? 'g' : ''}${f.ko ? ' ko' : ''}"${f.k ? ` data-i="${f.k}"` : ''}>${g ? `<small class="id">${esc(f.de)}</small><b class="id">${esc(f.type || '—')}</b><i class="vu-route" style="--c:${f.couleur}"></i>` : `<i class="vu-route" style="--c:${f.couleur}"></i><b class="id">${esc(f.type || '—')}</b><small class="id">${esc(f.de)}</small>`}</span>`;
  return `<div class="vu-traverse" role="table" aria-label="Ce qui traverse la prise"><div class="vu-tr-t" role="row"><span>Arrive par la partie mobile</span><span></span><span>Repart par la partie fixe</span></div>`
    + lettres.map(l => `<div class="vu-tr-l" role="row" data-ct="${escA(l)}">${c(cote(l, true), true)}<span class="vu-tr-p"><b>${esc(l)}</b></span>${c(cote(l, false))}</div>`).join('') + '</div>'; }

/* ---- LA TRAVERSÉE DESSINÉE d'une prise de coupure (v81, le lecteur : « attention au schéma de la prise et de ce qui la
   traverse ») : la prise au milieu — la fiche et l'embase accolées, la lettre de chaque contact des deux côtés —, à gauche
   ce qui arrive par la fiche, à droite ce qui repart par l'embase : le type sur le câble, où il va, sur quelle borne.
   `cote(l, amont)` rend { de: 'REP:borne', type, couleur, ko, k } ou rien. ---- */
function traverseeDessin(nom, lettres, cote, o) { if (!lettres.length) return ''; const petit = !!(o && o.petit);
  // (v82, le lecteur : « deux carrés pareils ; représente-la comme sur le schéma ») : comme le folio — la FICHE (partie
  // mobile) plus large et un peu moins haute, l'EMBASE (partie fixe) plus fine et plus haute, accolées, angles vifs ; les
  // lettres dans la fiche seulement
  const PAS = petit ? 30 : 34, HAUT = petit ? 22 : 26, W = petit ? 400 : 660, wB = petit ? 28 : 34, wE = petit ? 16 : 20, xF = petit ? 178 : 304, xE = xF + wB, x0 = petit ? 104 : 140, x1 = xE + wE + (petit ? 70 : 156), cx = 7.8;
  const H = HAUT + lettres.length * PAS + 16, yB0 = HAUT - 10, yB1 = HAUT + lettres.length * PAS + 4, yF0 = yB0 + 7, yF1 = yB1 - 7;
  const bout = s => { const t = String(s || ''), i = t.lastIndexOf(':'); return i > 0 ? [t.slice(0, i), t.slice(i + 1)] : [t, '']; };
  // (v83, le lecteur : « fiche, embase : tu peux l'enlever, on le sait — partie mobile, partie fixe ») : le dessin seul
  let out = (true ? '' : `<text class="bro-sens" x="${(x0 + xF) / 2}" y="14" text-anchor="middle">arrive par la fiche</text><text class="bro-sens" x="${(xE + wE + x1) / 2}" y="14" text-anchor="middle">repart par l’embase</text>`)
    + ''
    + `<rect class="bro-embase" x="${xE}" y="${yB0}" width="${wE}" height="${yB1 - yB0}"/><rect class="bro-fiche" x="${xF}" y="${yF0}" width="${wB}" height="${yF1 - yF0}"/>`;
  lettres.forEach((l, i) => { const yy = HAUT + i * PAS + PAS / 2, g = cote(l, true), d = cote(l, false);
    out += `<g class="bro-l fi-ia${(g && g.ko) || (d && d.ko) ? ' ko' : ''}"${(g && g.k) || (d && d.k) ? ` data-i="${escA((g && g.k) || d.k)}"` : ''}><rect class="bro-zone" x="0" y="${yy - PAS / 2}" width="${W}" height="${PAS}" rx="6"/>`
      + `<text class="bro-borne" x="${xF + wB / 2}" y="${yy + 4}">${esc(l)}${sousMinuscules(l, xF + wB / 2)}</text>`;
    if (g) { const [rep, bo] = bout(g.de), pw = bo ? 12 + bo.length * 6.6 : 0, xm = (x0 + xF) / 2;
      out += `<path class="bro-fil" style="stroke:${g.couleur || 'currentColor'}" d="M${x0} ${yy}H${xF}"/><rect class="bro-type-f" x="${xm - 24}" y="${yy - 15}" width="48" height="12" rx="3"/><text class="bro-type" x="${xm}" y="${yy - 5.5}">${esc(g.type || '—')}</text><circle class="bro-bout" cx="${x0}" cy="${yy}" r="2.6"/>`
        + (bo ? `<rect class="bro-pin-f" x="${x0 - 10 - pw}" y="${yy - 9}" width="${pw}" height="18" rx="5"/><text class="bro-pin" x="${x0 - 10 - pw / 2}" y="${yy + 4}">${esc(bo)}</text>` : '')
        + `<text class="bro-vers" x="${x0 - 10 - pw - (bo ? 6 : 0)}" y="${yy + 4.5}" text-anchor="end">${esc(rep)}</text>`; }
    if (d) { const [rep, bo] = bout(d.de), xm = (xE + wE + x1) / 2;
      out += `<path class="bro-fil" style="stroke:${d.couleur || 'currentColor'}" d="M${xE + wE} ${yy}H${x1}"/><rect class="bro-type-f" x="${xm - 24}" y="${yy - 15}" width="48" height="12" rx="3"/><text class="bro-type" x="${xm}" y="${yy - 5.5}">${esc(d.type || '—')}</text><circle class="bro-bout" cx="${x1}" cy="${yy}" r="2.6"/>`
        + `<text class="bro-vers" x="${x1 + 10}" y="${yy + 4.5}">${esc(rep)}</text>` + (bo ? `<rect class="bro-pin-f" x="${x1 + 16 + rep.length * cx}" y="${yy - 9}" width="${12 + bo.length * 6.6}" height="18" rx="5"/><text class="bro-pin" x="${x1 + 22 + rep.length * cx + bo.length * 3.3}" y="${yy + 4}">${esc(bo)}</text>` : ''); }
    out += '</g>'; });
  return `<svg class="vu-bro vu-trav${petit ? ' petit' : ''}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escA('Ce qui traverse ' + nom)}">${out}</svg>`; }

/* ---- LES POTENTIELS d'une barrette : la couleur du potentiel, ses contacts, ses câbles (type → où il va) ---- */
function potentielsVue(groupes) { return `<div class="vu-pots">${groupes.map((g, i) => `<div class="vu-pot${g.ko ? ' ko' : ''}" style="--c:${g.ko ? 'var(--vu-ko)' : `var(--vu-g${(i % 6) + 1})`}" data-ct="${escA(g.lettres[0] || '')}"><i aria-hidden="true"></i><b class="id">${esc(g.lettres.join(' '))}</b>`
  + `<span>${g.fils.length ? g.fils.map(f => `<em class="id"${f.k ? ` data-i="${f.k}"` : ''}>${esc(f.type || '—')} ${f.amont ? '←' : '→'} ${esc(f.vers)}</em>`).join('') : '<em class="libre">libre</em>'}</span></div>`).join('')}</div>`; }

/* ---- LES BROCHES d'un connecteur : contact, où il va, le câble, le contact à sertir — une ligne chacune ---- */
function brochesVue(xs) { if (!xs.length) return '<p class="vu-note">Aucun câble sur ce connecteur.</p>';
  // (v78, le lecteur : « ses broches, il faut tout reprendre ») : une ligne par contact — la broche, le câble à la couleur de
  // sa route, où il va (l'équipement, sa borne), le contact à sertir
  return `<div class="vu-broches" role="table" aria-label="Les broches"><div class="vu-br-l vu-br-tete" role="row"><span>Broche</span><span>Câble</span><span></span><span>Vers</span><span>Contact à sertir</span></div>`
    + xs.map(x => `<div class="vu-br-l fi-ia${x.ko ? ' ko' : ''}" role="row" data-ct="${escA(x.lettre)}"${x.k ? ` data-i="${x.k}" tabindex="0"` : ''}>`
      + `<span class="vu-br-pin" title="${escA(x.borne && x.borne !== x.lettre ? 'borne ' + x.borne : '')}">${esc(x.lettre || x.borne)}</span>`
      + `<span class="vu-br-cab"><i class="vu-route" style="--c:${x.couleur}"></i><b class="id">${esc(x.type || '—')}</b></span><span class="vu-br-fl" aria-hidden="true">${ico('droite')}</span>`
      + `<span class="vu-br-vers"><b class="id">${esc(x.vers)}</b>${x.borneVers ? `<small>borne ${esc(x.borneVers)}</small>` : ''}</span>`
      + `<span class="vu-br-sertir">${x.ko ? `<em class="vu-ko">${esc(x.ko)}</em>` : `<span class="id">${esc(x.sertir || '—')}</span>`}</span></div>`).join('') + '</div>'; }

/* ---- LE BROCHAGE : l'équipement, ses connecteurs, chaque broche, son câble, où il va (v79, le lecteur sur 101BT1 :
   « les broches et tout, c'est vide, on comprend pas ; l'œil humain, il n'y a pas d'infos, il est perdu ») — un petit
   plan de l'équipement seul, dessiné comme le folio : le corps, ses connecteurs collés (la lettre au-dessus, le numéro
   de chaque borne dedans), un câble par broche à la couleur de sa route, son type dessus, et au bout l'équipement et sa
   borne (une masse : son symbole). Survoler une ligne allume le câble sur le plan ; un clic ouvre sa fiche.
   cons : [{ nom, ref, lignes: [{ borne, type, couleur, vers, borneVers, masse, ko, k }] }] ---- */
function brochageVue(nom, sous, cons, o) { const xs = (cons || []).filter(c => c.lignes && c.lignes.length); if (!xs.length) return ''; const petit = !!(o && o.petit);
  const PAS = petit ? 26 : 30, HAUT = 34, ECART = petit ? 22 : 26, W = petit ? 400 : 640, xC = petit ? 92 : 150, wC = petit ? 26 : 30, x0 = xC + wC, x1 = W - (petit ? 132 : 214), xd = x1 + (petit ? 12 : 16);
  let y = HAUT, out = '';
  const blocs = xs.map(c => { const y0 = y, h = c.lignes.length * PAS; y += h + ECART; return { c, y0, h }; });
  const H = y - ECART + 22, yB0 = HAUT - 10, yB1 = H - 12;
  out += `<rect class="bro-corps" x="8.5" y="${yB0 + .5}" width="${xC - 8}" height="${yB1 - yB0}" rx="4"/>`
    + `<text class="bro-nom" x="${(8 + xC) / 2}" y="${(yB0 + yB1) / 2 - (sous ? 4 : -4)}">${esc(nom)}</text>`
    + (sous ? `<text class="bro-sous" x="${(8 + xC) / 2}" y="${(yB0 + yB1) / 2 + 14}">${esc(sous)}</text>` : '');
  blocs.forEach(({ c, y0, h }) => {
    out += `<path class="bro-piece" d="M${xC} ${y0 + .5}H${xC + wC - 7}a7 7 0 0 1 7 7V${y0 + h - 7.5}a7 7 0 0 1 -7 7H${xC}Z"/>`
      + `<text class="bro-lettre" x="${xC + wC / 2}" y="${y0 - 7}">${esc(c.nom)}</text>`
      + (c.ref && !petit ? `<text class="bro-ref" x="${xC + wC + 8}" y="${y0 - 7}">${esc(c.ref)}</text>` : '');
    c.lignes.forEach((l, i) => { const yy = y0 + i * PAS + PAS / 2, xm = (x0 + x1) / 2;
      out += `<g class="bro-l fi-ia${l.ko ? ' ko' : ''}"${l.k ? ` data-i="${escA(l.k)}"` : ''}><rect class="bro-zone" x="${xC}" y="${yy - PAS / 2}" width="${W - xC}" height="${PAS}" rx="6"/>`
        + `<text class="bro-borne" x="${xC + wC / 2 - 2}" y="${yy + 4}">${esc(l.borne)}${sousMinuscules(l.borne, xC + wC / 2 - 2)}</text>`
        + `<path class="bro-fil" style="stroke:${l.couleur || 'currentColor'}" d="M${x0} ${yy}H${x1}"/>`
        + `<rect class="bro-type-f" x="${xm - 24}" y="${yy - 15}" width="48" height="12" rx="3"/><text class="bro-type" x="${xm}" y="${yy - 5.5}">${esc(l.type || '—')}</text>`
        + (l.masse ? `<path class="bro-masse" d="M${x1} ${yy - 7}v14M${x1 + 4} ${yy - 4.5}v9M${x1 + 8} ${yy - 2}v4"/><text class="bro-vers" x="${xd}" y="${yy + 4.5}">${esc(l.vers)}</text><text class="bro-mot" x="${xd + 8 + l.vers.length * 7.8}" y="${yy + 4}">masse</text>`
          : `<circle class="bro-bout" cx="${x1}" cy="${yy}" r="2.6"/><text class="bro-vers" x="${xd}" y="${yy + 4.5}">${esc(l.vers)}</text>`
            + (l.borneVers ? `<rect class="bro-pin-f" x="${xd + 6 + l.vers.length * 7.8}" y="${yy - 9}" width="${12 + String(l.borneVers).length * 6.6}" height="18" rx="5"/><text class="bro-pin" x="${xd + 12 + l.vers.length * 7.8 + String(l.borneVers).length * 3.3}" y="${yy + 4}">${esc(l.borneVers)}${sousMinuscules(l.borneVers, xd + 12 + l.vers.length * 7.8 + String(l.borneVers).length * 3.3)}</text>` : ''))
        + (l.ko ? (() => { const xk = xd + l.vers.length * 7.8 + (l.borneVers ? 24 + String(l.borneVers).length * 6.6 : (l.masse ? 60 : 10));
          // le défaut se dit au bout de la ligne, après la borne d'arrivée, s'il y tient ; sinon sous le câble
          return xk + String(l.ko).length * 6.2 < W - 4 ? `<text class="bro-ko bout" x="${xk}" y="${yy + 4}">${esc(l.ko)}</text>` : `<text class="bro-ko" x="${xm}" y="${yy + 12}">${esc(l.ko)}</text>`; })() : '') + '</g>'; }); });
  return `<svg class="vu-bro${petit ? ' petit' : ''}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escA('Le brochage de ' + nom)}">${out}</svg>`; }

/* ---- LA MASSE (v84) : ce qui y revient, dessiné comme le folio — chaque câble arrive de son équipement (son repère, sa
   borne en pastille), son type sur le trait, à la couleur de sa route ; tous se rejoignent sur un trait commun qui finit
   par le symbole de masse, son repère à côté. Survoler une ligne allume le câble sur le plan ; un clic ouvre sa fiche.
   lignes : [{ vers, borneVers, type, couleur, ko, k }] ---- */
function masseVue(nom, lignes, o) { if (!lignes.length) return ''; const petit = !!(o && o.petit);
  const PAS = petit ? 26 : 30, HAUT = 12, W = petit ? 400 : 640, cx = 7.8, xBus = W - (petit ? 92 : 150), x0 = petit ? 150 : 236, n = lignes.length;
  const y = i => HAUT + i * PAS + PAS / 2, yN = y(n - 1), yG = yN + (petit ? 16 : 20), H = yG + 22;
  let out = '';
  lignes.forEach((l, i) => { const yy = y(i), xm = (x0 + xBus) / 2, bo = String(l.borneVers || ''), pw = bo ? 12 + bo.length * 6.6 : 0, rep = String(l.vers || '—');
    out += `<g class="bro-l fi-ia${l.ko ? ' ko' : ''}"${l.k ? ` data-i="${escA(l.k)}"` : ''}><rect class="bro-zone" x="0" y="${yy - PAS / 2}" width="${xBus + 6}" height="${PAS}" rx="6"/>`
      + `<text class="bro-vers" x="${x0 - 12 - (bo ? pw + 6 : 0)}" y="${yy + 4.5}" text-anchor="end">${esc(rep)}</text>`
      + (bo ? `<rect class="bro-pin-f" x="${x0 - 12 - pw}" y="${yy - 9}" width="${pw}" height="18" rx="5"/><text class="bro-pin" x="${x0 - 12 - pw / 2}" y="${yy + 4}">${esc(bo)}</text>` : '')
      + `<circle class="bro-bout" cx="${x0}" cy="${yy}" r="2.6"/><path class="bro-fil" style="stroke:${l.couleur || 'currentColor'}" d="M${x0} ${yy}H${xBus}"/>`
      + `<rect class="bro-type-f" x="${xm - 24}" y="${yy - 15}" width="48" height="12" rx="3"/><text class="bro-type" x="${xm}" y="${yy - 5.5}">${esc(l.type || '—')}</text>`
      + (l.ko ? `<text class="bro-ko" x="${xm}" y="${yy + 12}">${esc(l.ko)}</text>` : '') + '</g>'; });
  // le trait commun, ses points de jonction, puis le symbole de masse (trois traits qui décroissent), son repère à côté
  const jonctions = lignes.map((_, i) => `<circle class="bro-noeud" cx="${xBus}" cy="${y(i)}" r="3"/>`).join('');
  out += `<path class="bro-bus" d="M${xBus} ${y(0)}V${yG}"/>${n > 1 ? jonctions : ''}`
    + `<path class="bro-terre" d="M${xBus - 14} ${yG}h28M${xBus - 9} ${yG + 5}h18M${xBus - 4} ${yG + 10}h8"/>`
    + `<text class="bro-nom bro-nom-masse" x="${xBus + 22}" y="${(y(0) + yG) / 2 + (petit ? 2 : 0)}">${esc(nom)}</text>`
    + (petit ? '' : `<text class="bro-sous bro-sous-masse" x="${xBus + 22}" y="${(y(0) + yG) / 2 + 17}">masse</text>`);
  return `<svg class="vu-bro vu-masse${petit ? ' petit' : ''}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escA('Les ' + n + ' câbles qui reviennent à ' + nom)}">${out}</svg>`; }

/* ---- COMMENT VOLTA L'A DÉCIDÉ : des étapes numérotées, une phrase chacune et sa source ---- */
// sources : fichier (votre fichier), norme, tables (les tables de VOLTA), calcul, hypothese, main (choisi ici), base (la base SEE)
const MOTS_SOURCES = { fichier: 'votre fichier', norme: 'la norme', tables: 'tables de VOLTA', calcul: 'calcul de VOLTA', hypothese: 'hypothèse', main: 'choisi ici', base: 'base SEE' };
function pourquoiVue(titre, etapes) { const xs = (etapes || []).filter(Boolean); if (!xs.length) return '';
  return `<section class="vu-pq" aria-label="${escA(titre)}"><h4 class="vu-titre">${esc(titre)}</h4><ol>${xs.map((e, i) => {
    const va = e.va ? ` data-va-onglet="${escA(e.va.onglet || '')}" data-va-vers="${escA(e.va.vers || '')}" tabindex="0" role="button" aria-label="${escA('Voir ' + (e.va.mot || 'le détail'))}"` : '';
    return `<li class="${e.etat || ''}${e.va ? ' va' : ''}"${va}><span class="vu-pq-n">${i + 1}</span><span class="vu-pq-t">${e.html || esc(e.texte)}${e.va ? `<span class="vu-pq-va">${esc('voir ' + (e.va.mot || 'le détail'))}${ico('droite')}</span>` : ''}</span>`
      + `${e.source ? `<span class="vu-src ${escA(e.source)}"${e.bulle ? ` data-bulle="${escA(e.bulle)}"` : ''}>${esc(e.mot || MOTS_SOURCES[e.source] || e.source)}</span>` : ''}`
      + `${e.detail ? `<details class="vu-pq-d"><summary>${ico('bas')}Voir le calcul</summary><div class="vu-pq-dc">${e.detail}</div></details>` : ''}</li>`; }).join('')}</ol></section>`; }

/* ---- LES CALIBRES D'UN DISJONCTEUR, en un coup d'œil (la carte) : chaque calibre de la gamme, vert s'il tient ce qu'il
   alimente, rouge sinon ; le retenu plein, l'actuel (celui de votre fichier) marqué ---- */
function calibresVue(d, o, cal) { const gamme = (d.gamme || []).filter(g => g.calibre > 0); if (!gamme.length) return '';
  const act = o && o.calRetest ? o.calRetest : d.pn && d.pn !== cal ? d.pn : null;
  return `<span class="vu-calv"><span class="vu-calv-l">${gamme.map(g => { const k = cleDuVerdict(g), r = g.calibre === cal, a = act === g.calibre && !r;
      return `<span class="vu-c ${k === 'passe' ? 'oui' : 'non'}${r ? ' ret' : ''}${a ? ' act' : ''}"><b>${esc(nombre(g.calibre))}</b><small>${r ? 'retenu' : a ? 'actuel' : ''}</small></span>`; }).join('')}</span>`
    + `<span class="vu-legende"><span><i class="ok"></i>ne disjoncte pas</span><span><i class="ko"></i>disjoncte</span>${act && act !== cal ? '<span>actuel : celui de votre fichier</span>' : ''}</span></span>`; }

/* ---- LES CONNECTEURS D'UN ÉQUIPEMENT, en un coup d'œil (la carte) : une ligne chacun — sa lettre, sa référence, ses
   contacts pris (une barre) ; en rouge celui qu'aucun arrangement ne loge ---- */
function connecteursVue(xs) { if (!xs.length) return '';
  return `<span class="vu-cons">${xs.map(x => `<span class="vu-con${x.ko ? ' ko' : ''}"><b class="vu-con-l">${esc(x.nom)}</b><span class="vu-con-t"><span class="id">${esc(x.ref || 'sans référence')}</span>`
    + (x.ko ? `<small>${esc(x.ko)}</small>` : x.places ? `<span class="vu-con-b"><i style="width:${(Math.min(1, x.pris / x.places) * 100).toFixed(1)}%"></i></span>` : `<small>${esc(pluriel(x.cables || 0, 'câble'))}</small>`) + `</span>`
    + `<span class="vu-con-n">${x.places && !x.ko ? `${x.pris}<small>/${x.places}</small>` : ''}</span></span>`).join('')}</span>`; }
// deux, trois… en mots (une phrase qui se lit)
const nombreEnMots = n => ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'][n] || String(n);

/* ---- LA FABRICATION : tout ce qu'il faut pour monter la pièce, groupé, compté par référence ---- */
function fabricationVue(groupes) { const gs = (groupes || []).filter(g => g && g.lignes && g.lignes.length);
  if (!gs.length) return '<p class="vu-note">Rien à monter : la référence de la pièce n’est pas encore connue.</p>';
  const n = gs.reduce((s, g) => s + g.lignes.reduce((t, l) => t + (l.q || 0), 0), 0);
  return `<div class="vu-fab" data-pieces="${n}">${gs.map(g => `<section class="vu-fab-g"><h4><span>${esc(g.titre)}</span>${g.ref ? `<span class="id">${esc(g.ref)}</span>` : ''}${g.sous ? `<small>${esc(g.sous)}</small>` : ''}</h4>`
    + g.lignes.map(l => `<div class="vu-fab-l"><span class="vu-q">${l.q}<small>×</small></span><span class="vu-r"><b class="id">${esc(l.ref || '—')}</b><small>${esc(l.role || '')}</small></span>${l.statut ? `<span class="vu-st${/confirmer|manque/.test(l.statut) ? ' att' : ''}">${esc(l.statut)}</span>` : '<span></span>'}</div>`).join('') + '</section>').join('')}</div>`; }
const compterParReference = (refs, role) => { const m = new Map(); refs.filter(Boolean).forEach(r => m.set(r, (m.get(r) || 0) + 1)); return [...m].sort((a, b) => b[1] - a[1]).map(([ref, q]) => ({ q, ref, role })); };
const piecesFabrication = h => { try { return piecesHabillage(h).map(p => ({ q: p.quantite || 1, ref: p.reference || '', role: ({ cheminee: 'cheminée, à la place du raccord', tyrap: 'collier', raccord: 'raccord', bande: 'collier de blindage (band-it)', manchon: 'manchon', gaine: 'gaine', obturateur: 'obturateur des contacts libres' })[p.role] || p.libelle || p.role || '', statut: p.statut || '' })).filter(p => p.ref); } catch (_) { return []; } };

/* ---- (v86) LA SILHOUETTE D'UN OBJET — la signature de sa fiche (le sceau de la carte, la tête du grand). Le lecteur : « je
   ne sais pas différencier les équipements des disjoncteurs, des barrettes, proprement : quelque chose d'innovant ». Chaque
   genre a SA forme, celle du folio, en trait fin de cuivre : le disjoncteur (ses deux bornes, l'arc, le poussoir) ; le
   corps d'un équipement et son connecteur (un de chaque côté s'il en a plusieurs) ; la barrette, ses modules sur leur rail
   (autant qu'elle en a, quatre au plus) ; la prise, le grand rectangle et le petit ; le câble, entre ses deux bouts ; la
   masse, le râteau. Un dessin de 72 × 28 : chaque trait se trace quand la fiche s'ouvre (`pathLength` = 1), puis un éclat
   de courant suit le chemin du courant (`.sl-courant`) — et repasse quand on survole la tête (style-z-carte).
   `o` : { modules (barrette), connecteurs (équipement) }. ---- */
function silhouetteVue(type, o) { o = o || {}; const L = s => s.replace(/<(path|circle|rect)\b/g, '<$1 pathLength="1"'), n1 = v => String(Math.round(v * 10) / 10);
  let forme = '', courant = '';
  if (type === 'disjoncteur') {
    forme = '<path d="M5 19H24.4M47.6 19H67"/><circle cx="27" cy="19" r="2.6"/><circle cx="45" cy="19" r="2.6"/><path d="M27 16.4A11 11 0 0 1 45 16.4"/><path d="M36 11.7V5.6M31.6 5.6H40.4"/>';
    courant = 'M5 19H27V16.4A11 11 0 0 1 45 16.4V19H67'; }
  else if (type === 'barrette') { const n = Math.max(1, Math.min(4, Math.round(o.modules) || 3)), w = 11, e = 2.5, W = n * w + (n - 1) * e, x0 = 36 - W / 2;
    forme = `<rect x="4" y="10.5" width="3" height="7" rx="1"/><rect x="65" y="10.5" width="3" height="7" rx="1"/><path d="M7 14H${n1(x0)}M${n1(x0 + W)} 14H65${Array.from({ length: n - 1 }, (_, i) => `M${n1(x0 + (i + 1) * w + i * e)} 14h${e}`).join('')}"/>`
      + Array.from({ length: n }, (_, i) => { const x = x0 + i * (w + e); return `<rect x="${n1(x)}" y="4" width="${w}" height="20" rx="2.6"/>` + [10.5, 17.5].map(y => `<circle cx="${n1(x + 3.7)}" cy="${y}" r="1.25"/><circle cx="${n1(x + 7.3)}" cy="${y}" r="1.25"/>`).join(''); }).join('');
    courant = 'M5.5 14H66.5'; }
  else if (type === 'prise') {
    forme = '<path d="M5 14H26.5M45.5 14H67"/><rect x="26.5" y="7" width="14" height="14" rx="1.4"/><rect x="40.5" y="4" width="5" height="20" rx="1.2"/>';
    courant = 'M5 14H67'; }
  else if (type === 'fil') {
    forme = '<circle cx="7" cy="19" r="2.3"/><circle cx="65" cy="9" r="2.3"/><path d="M9.3 19H31a3 3 0 0 0 3-3v-4a3 3 0 0 1 3-3h25.7"/>';
    courant = 'M7 19H31a3 3 0 0 0 3-3v-4a3 3 0 0 1 3-3H65'; }
  else if (type === 'masse') {
    forme = '<path d="M54 14H28"/><path d="M28 5V23M23 8.5V19.5M18 12V16"/>';
    courant = 'M54 14H28'; }
  else if ((o.connecteurs || 1) > 1) {
    // deux connecteurs ou plus : rangés l'un sous l'autre sur le flanc, comme le dessin de sa fiche (A, puis X)
    forme = '<rect x="11" y="4" width="28" height="20" rx="2"/><rect x="39" y="5" width="6" height="7.5" rx="1"/><rect x="39" y="15.5" width="6" height="7.5" rx="1"/><path d="M45 8.75H61M45 19.25H61"/>';
    courant = 'M61 8.75H45M61 19.25H45'; }
  else {
    forme = '<rect x="11" y="4" width="28" height="20" rx="2"/><rect x="39" y="8" width="6" height="12" rx="1"/><path d="M45 11H61M45 17H61"/>';
    courant = 'M61 11H45'; }
  return `<svg class="silhouette sl-${type === 'fil' || type === 'masse' || type === 'prise' || type === 'barrette' || type === 'disjoncteur' ? type : 'equipement'}" viewBox="0 0 72 28" aria-hidden="true" focusable="false"><g class="sl-trait">${L(forme)}</g><path class="sl-courant" pathLength="1" d="${courant}"/></svg>`; }
