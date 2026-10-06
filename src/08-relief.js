/* ===========================================================================
   08 bis — LA VUE EN RELIEF : une barrette, une prise de coupure, comme on
   les tient dans la main.
   ---------------------------------------------------------------------------
   Un clic sur « Voir en relief » (ou un double-clic sur le bloc) ouvre une
   grande fenêtre : la pièce en perspective, qu'on fait tourner à la main.

     · BARRETTE : ses modules posés sur leur rail, un par borne, les libres
       en clair ; le pont de métal sur les modules d'un même paquet ; sur le
       dessus de chaque module ses trous — en arrière ce qui arrive (amont),
       en avant ce qui repart (aval) ; de chaque trou occupé monte son fil, à
       la couleur de sa route, jusqu'à son étiquette : numéro, destination,
       type. Un trou dont le fil sort de la norme (jauge, courant, chute) est
       cerclé de rouge.
     · PRISE DE COUPURE : la fiche (partie mobile) et l'embase (partie
       fixe), sorties l'une de l'autre, leurs faces de contact tournées vers
       nous, chaque contact numéroté ; les fils entrent par l'arrière de la
       fiche (amont) et sortent par l'arrière de l'embase (aval). La
       disposition des contacts sur la face est indicative : elle dépend de
       l'arrangement de l'insert, que la bible ne donne pas encore.

   Sous la pièce, le tableau module par module (ou contact par contact) :
   ce qui arrive, ce qui repart. Survoler un fil — dans la vue ou dans le
   tableau — l'allume sur le plan ; un clic y va.

   Le relief est un petit moteur 3D en SVG, sans bibliothèque : une
   rotation (azimut autour de la verticale, puis inclinaison), une
   projection orthographique, les faces cachées écartées, les autres peintes
   du fond vers l'avant, ombrées selon une lumière fixe.
   =========================================================================== */
'use strict';

const RELIEF = { nom: null, az: 0.42, el: 0.6, P: null, S: null, Q: null, prise: false, glisse: null };
// un fil de la vue (celui de la carte : `filsDuModule`) : sa ligne du contrat, la couleur de sa route
const ligneRelief = e => (e && e.i != null ? verite()[e.i] : null);
const couleurRelief = (e, routes) => { const l = ligneRelief(e); return (l && routes.get(l.route || '')) || '#26323f'; };
const VUES_RELIEF = { '3/4': [0.42, 0.6], face: [0, 0.14], dessus: [0, 1.32] };

/* ---- le moteur : rotation, projection, faces, ombre -------------------- */
function tourner(v, az, el) { const ca = Math.cos(az), sa = Math.sin(az), ce = Math.cos(el), se = Math.sin(el);
  const x1 = v.x * ca - v.z * sa, z1 = v.x * sa + v.z * ca;
  return { x: x1, y: v.y * ce - z1 * se, d: v.y * se + z1 * ce }; }
const projeter = (p, az, el) => { const t = tourner(p, az, el); return { x: t.x, y: -t.y, d: t.d }; };
const LUMIERE = (() => { const l = { x: -0.35, y: 0.8, d: 0.5 }, n = Math.hypot(l.x, l.y, l.d); return { x: l.x / n, y: l.y / n, d: l.d / n }; })();
const rvb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const ombrer = (h, k) => '#' + rvb(h).map(c => Math.max(0, Math.min(255, Math.round(c * k)))).map(c => c.toString(16).padStart(2, '0')).join('');
// une face : ses sommets (dans l'ordre), sa normale, sa couleur ; écartée si elle tourne le dos, ombrée sinon
function face(pts, n, coul, extra) { return { pts, n, coul, extra: extra || '' }; }
function boite(x0, y0, z0, x1, y1, z1, coul, extra) { const P = (x, y, z) => ({ x, y, z });
  return [face([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], { x: 0, y: 1, z: 0 }, coul, extra),
    face([P(x0, y0, z1), P(x1, y0, z1), P(x1, y0, z0), P(x0, y0, z0)], { x: 0, y: -1, z: 0 }, coul, extra),
    face([P(x0, y0, z1), P(x0, y1, z1), P(x1, y1, z1), P(x1, y0, z1)], { x: 0, y: 0, z: 1 }, coul, extra),
    face([P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0), P(x0, y0, z0)], { x: 0, y: 0, z: -1 }, coul, extra),
    face([P(x0, y0, z0), P(x0, y1, z0), P(x0, y1, z1), P(x0, y0, z1)], { x: -1, y: 0, z: 0 }, coul, extra),
    face([P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0), P(x1, y0, z0)], { x: 1, y: 0, z: 0 }, coul, extra)]; }
// un cylindre d'axe Z (de z0 à z1), centré en (cx, cy), de rayon r : ses côtés et ses deux fonds
function cylindre(cx, cy, z0, z1, r, coul, extra, n) { n = n || 32; const fs = [], pt = (k, z) => ({ x: cx + r * Math.cos(2 * Math.PI * k / n), y: cy + r * Math.sin(2 * Math.PI * k / n), z });
  for (let k = 0; k < n; k++) { const a = 2 * Math.PI * (k + 0.5) / n; fs.push(face([pt(k, z0), pt(k + 1, z0), pt(k + 1, z1), pt(k, z1)], { x: Math.cos(a), y: Math.sin(a), z: 0 }, coul, extra)); }
  fs.push(face(Array.from({ length: n }, (_, k) => pt(n - k, z1)), { x: 0, y: 0, z: 1 }, coul, extra));
  fs.push(face(Array.from({ length: n }, (_, k) => pt(k, z0)), { x: 0, y: 0, z: -1 }, coul, extra));
  return fs; }
// les faces visibles, du fond vers l'avant, ombrées
function peindreFaces(faces, az, el) { const vues = [];
  faces.forEach(f => { const n = tourner(f.n, az, el); if (n.d <= 1e-6) return;
    const q = f.pts.map(p => projeter(p, az, el)), d = q.reduce((s, p) => s + p.d, 0) / q.length, k = 0.62 + 0.42 * Math.max(0, n.x * LUMIERE.x + n.y * LUMIERE.y + n.d * LUMIERE.d);
    vues.push({ q, d, fill: ombrer(f.coul, k), extra: f.extra }); });
  vues.sort((a, b) => a.d - b.d);
  return vues.map(v => `<polygon points="${v.q.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ')}" fill="${v.fill}" stroke="${ombrer(v.fill, 0.72)}" stroke-width=".6" stroke-linejoin="round"${v.extra}/>`).join(''); }

/* ---- la scène d'une barrette ------------------------------------------- */
const RB = { pas: 46, l: 38, h: 34, p: 74, rail: 9 };
function sceneBarrette(P, S, az, el) {
  const n = P.modules.length, faces = [], fils = [], textes = [], trous = [];
  const ko = new Set((S ? S.lignes : []).filter(x => x.verdict !== 'ok').map(x => x.borne + '|' + x.sens + '|' + x.trou));
  const cx = k => k * RB.pas;
  // le rail sous les modules, un peu plus long qu'eux
  faces.push(...boite(-RB.pas * 0.6, -RB.rail, RB.p * 0.18, cx(n - 1) + RB.pas * 0.6, 0, RB.p * 0.82, '#9aa4ae'));
  P.modules.forEach((m, k) => { const x0 = cx(k) - RB.l / 2, x1 = cx(k) + RB.l / 2;
    faces.push(...boite(x0, 0, 0, x1, RB.h, RB.p, m.utilisee ? '#465568' : '#d9dee4', ` data-mod="${escA(m.borne)}"`)); });
  // le pont de métal sur les modules d'un même paquet
  P.paquets.forEach(pq => { if (!pq.ponte) return; const ks = pq.bornes.map(b => P.modules.findIndex(m => m.borne === String(b))).filter(k => k >= 0); if (ks.length < 2) return;
    faces.push(...boite(cx(Math.min(...ks)) - RB.l * 0.32, RB.h, RB.p * 0.45, cx(Math.max(...ks)) + RB.l * 0.32, RB.h + 4, RB.p * 0.55, '#c0692b')); });
  // les trous du dessus — l'amont en arrière, l'aval en avant — et le fil qui monte de chaque trou occupé
  P.modules.forEach((m, k) => ['amont', 'aval'].forEach(sens => { const ts = trousDe(m, filsDuModule(RELIEF.nom, m), sens), z = sens === 'amont' ? RB.p * 0.22 : RB.p * 0.78;
    ts.forEach((f, t) => { const x = cx(k) + (t - (ts.length - 1) / 2) * 11, trou = { x, y: RB.h + 0.5, z }, mauvais = ko.has(m.borne + '|' + sens + '|' + (t + 1));
      trous.push({ p: trou, f, mauvais });
      if (!f) return;
      // le fil monte du trou, puis part vers l'arrière (amont) ou vers l'avant (aval) ; son étiquette se range plus loin
      const monte = 14 + 7 * t, loin = sens === 'amont' ? -22 : RB.p + 22;
      fils.push({ pts: [trou, { x, y: RB.h + monte, z }, { x, y: RB.h + monte, z: loin }], f, sens }); }); }));
  // les numéros des modules, sur leur face avant (un module libre est clair)
  P.modules.forEach((m, k) => textes.push({ p: { x: cx(k), y: RB.h * 0.42, z: RB.p }, t: m.borne, cls: m.utilisee ? 're-num' : 're-num libre', face: { x: 0, y: 0, z: 1 } }));
  return { faces, fils, textes, trous }; }

/* ---- la scène d'une prise de coupure ------------------------------------ */
// la disposition des contacts sur la face : indicative (un, un anneau, ou un anneau intérieur et un extérieur)
function dispositionContacts(n, R) { if (n <= 1) return [{ x: 0, y: 0 }];
  const anneau = (k, r, a0) => Array.from({ length: k }, (_, i) => { const a = a0 + 2 * Math.PI * i / k; return { x: r * Math.sin(a), y: r * Math.cos(a) }; });
  if (n <= 7) return anneau(n, R * 0.56, 0);
  const k1 = Math.max(3, Math.round(n * 0.34)); return [...anneau(k1, R * 0.32, 0), ...anneau(n - k1, R * 0.7, Math.PI / (n - k1))]; }
function scenePrise(P, S, az, el) {
  const n = P.modules.length, R = 30 + 7 * Math.sqrt(n), L = 70, ecart = R + 42, faces = [], fils = [], textes = [], trous = [];
  const ko = new Set((S ? S.lignes : []).filter(x => x.verdict !== 'ok').map(x => x.borne + '|' + x.sens));
  const pos = dispositionContacts(n, R);
  // la fiche (à gauche) et l'embase (à droite), faces de contact vers nous (z = 0), corps vers l'arrière
  faces.push(...cylindre(-ecart, 0, -L, 0, R, '#5d6b7c'));
  faces.push(...cylindre(-ecart, 0, -L * 0.62, -L * 0.3, R + 5, '#4a5767'));          // la bague d'accouplement
  faces.push(...cylindre(ecart, 0, -L, 0, R * 0.94, '#7a8796'));
  faces.push(...boite(ecart - R - 14, -R - 14, -L * 0.42, ecart + R + 14, R + 14, -L * 0.34, '#6c7887'));   // la collerette de l'embase
  P.modules.forEach((m, k) => { const c = pos[k] || { x: 0, y: 0 };
    ['amont', 'aval'].forEach(sens => { const ox = sens === 'amont' ? -ecart : ecart, f = (trousDe(m, filsDuModule(RELIEF.nom, m), sens) || []).find(Boolean) || null;
      trous.push({ p: { x: ox + c.x, y: c.y, z: 0.5 }, f, mauvais: ko.has(m.borne + '|' + sens), num: m.borne, prise: true });
      textes.push({ p: { x: ox + c.x + 8, y: c.y + 8, z: 0.5 }, t: m.borne, cls: 're-num petit', face: { x: 0, y: 0, z: 1 } });
      if (!f) return;
      // le fil entre (ou sort) par l'arrière, puis s'écarte sur le côté, jusqu'à son étiquette
      const cote = sens === 'amont' ? -1 : 1;
      fils.push({ pts: [{ x: ox + c.x, y: c.y, z: -L }, { x: ox + c.x, y: c.y, z: -L - 26 }, { x: ox + cote * (R + 34), y: c.y, z: -L - 26 }], f, sens }); }); });
  textes.push({ p: { x: -ecart, y: -R - 34, z: 0 }, t: 'FICHE · partie mobile', cls: 're-titre-piece', sous: true });
  textes.push({ p: { x: ecart, y: -R - 34, z: 0 }, t: 'EMBASE · partie fixe', cls: 're-titre-piece', sous: true });
  return { faces, fils, textes, trous, emboite: { a: { x: -ecart + R + 8, y: 0, z: 0 }, b: { x: ecart - R - 8, y: 0, z: 0 } } }; }

/* ---- le rendu : la scène, projetée, en SVG ------------------------------ */
function reliefSvg() { const { P, S, Q, az, el, prise } = RELIEF; if (!P && !Q) return '';
  const sc = Q ? sceneModules(Q) : prise ? scenePrise(P, S, az, el) : sceneBarrette(P, S, az, el), routes = couleursDesRoutes();
  const pj = p => projeter(p, az, el); let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
  const voir = p => { minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x); miny = Math.min(miny, p.y); maxy = Math.max(maxy, p.y); };
  sc.faces.forEach(f => f.pts.forEach(p => voir(pj(p)))); sc.fils.forEach(w => w.pts.forEach(p => voir(pj(p))));
  sc.textes.forEach(t => voir(pj(t.p)));
  /* les ÉTIQUETTES se rangent hors de la pièce, sans se chevaucher : une barrette, en rangée au-dessus (amont) et en
     dessous (aval), dans l'ordre de leurs fils ; une prise, en colonne à gauche (fiche) et à droite (embase). Un trait
     fin, à la couleur de la route, va du bout du fil à son étiquette. */
  const LARG = 150, HAUT = 32, etiquettes = sc.fils.map(w => ({ w, a: pj(w.pts[w.pts.length - 1]) }));
  /* une rangée trop longue pour la pièce (une barrette de douze fils) se replie en deux ou trois rangées décalées, leurs
     étiquettes en quinconce — sinon la pièce rapetissait jusqu'à ne plus se lire. `sens` : de quel côté de la pièce la
     rangée s'éloigne (-1 au-dessus, +1 en dessous). */
  const ranger = (gr, cle, pas, base, sens) => { gr.sort((u, v) => u.a[cle] - v.a[cle]);
    const etendue = cle === 'x' ? maxx - minx : maxy - miny, k = cle === 'x' ? Math.max(1, Math.min(3, Math.ceil(gr.length * pas / Math.max(1, 1.25 * etendue)))) : 1;
    let prec = -Infinity; gr.forEach(e => { e.v = Math.max(e.a[cle], prec + pas / k); prec = e.v; });
    if (gr.length) { const deborde = gr[gr.length - 1].v - gr[gr.length - 1].a[cle]; gr.forEach(e => { e.v -= deborde / 2; }); }
    gr.forEach((e, j) => { const rang = (j % k) * 34 * (sens || 1); e.pos = cle === 'x' ? { x: e.v, y: base + rang } : { x: base, y: e.v }; }); };
  const [x0s, x1s, y0s, y1s] = [minx, maxx, miny, maxy];
  if (prise) { ranger(etiquettes.filter(e => e.w.sens === 'amont'), 'y', HAUT, x0s - 18); ranger(etiquettes.filter(e => e.w.sens === 'aval'), 'y', HAUT, x1s + 18); }
  else { ranger(etiquettes.filter(e => e.w.sens === 'amont'), 'x', LARG, y0s - 30, -1); ranger(etiquettes.filter(e => e.w.sens === 'aval'), 'x', LARG, y1s + 30, 1); }
  etiquettes.forEach(e => { const g = prise ? (e.w.sens === 'amont' ? -1 : 1) : 0; voir({ x: e.pos.x + (g ? g * LARG : -LARG / 2), y: e.pos.y - 14 }); voir({ x: e.pos.x + (g ? 0 : LARG / 2), y: e.pos.y + 16 }); });
  const m = 22, vb = [minx - m, miny - m, maxx - minx + 2 * m, maxy - miny + 2 * m];
  let s = `<svg id="re-svg" viewBox="${vb.map(v => v.toFixed(1)).join(' ')}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escA((prise ? 'Prise de coupure ' : 'Barrette ') + RELIEF.nom + ' en relief')}">`;
  // une prise : les fils d'abord (la pièce les cache derrière elle) ; une barrette : la pièce d'abord (les fils montent au-dessus)
  const filsSvg = () => sc.fils.map(w => { const i = w.f.i, coul = couleurRelief(w.f, routes), d = 'M' + w.pts.map(p => { const q = pj(p); return q.x.toFixed(1) + ' ' + q.y.toFixed(1); }).join(' L');
    return `<g class="re-fil" data-i="${i}"><path d="${d}" class="re-gaine"/><path d="${d}" class="re-ame" style="stroke:${coul}"/></g>`; }).join('');
  if (prise) s += filsSvg();
  s += peindreFaces(sc.faces, az, el);
  if (!prise) s += filsSvg();
  // les trous : occupés, libres, et cerclés de rouge quand la norme les refuse
  sc.trous.forEach(t => { const q = pj(t.p), i = t.f ? t.f.i : -1, coul = t.f ? couleurRelief(t.f, routes) : null;
    s += `<circle class="re-trou${t.f ? ' plein' : ''}${t.mauvais ? ' ko' : ''}"${i >= 0 ? ` data-i="${i}"` : ''} cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="${t.prise ? 5 : 4.2}"${coul ? ` style="stroke:${coul}"` : ''}/>`; });
  sc.textes.forEach(t => { if (t.face && tourner(t.face, az, el).d <= 0.05) return; const q = pj(t.p); s += `<text class="${t.cls}" x="${q.x.toFixed(1)}" y="${q.y.toFixed(1)}" text-anchor="middle">${esc(t.t)}</text>`; });
  if (sc.emboite) { const a = pj(sc.emboite.a), b = pj(sc.emboite.b);
    s += `<path class="re-emboite" d="M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}" marker-end="url(#re-fleche)" marker-start="url(#re-fleche)"/><text class="re-note" x="${((a.x + b.x) / 2).toFixed(1)}" y="${((a.y + b.y) / 2 + 16).toFixed(1)}" text-anchor="middle">s’emboîtent</text>`; }
  // les étiquettes : numéro (à la couleur de la route), destination, type
  etiquettes.forEach(({ w, a, pos }) => { const f = w.f, i = f.i, coul = couleurRelief(f, routes);
    const ancre = prise ? (w.sens === 'amont' ? 'end' : 'start') : 'middle', bout = prise ? { x: pos.x + (w.sens === 'amont' ? 4 : -4), y: pos.y - 4 } : { x: pos.x, y: w.sens === 'amont' ? pos.y + 14 : pos.y - 12 };
    s += `<g class="re-etiq" data-i="${i}"><path class="re-trait" d="M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${bout.x.toFixed(1)} ${bout.y.toFixed(1)}" style="stroke:${coul}"/>`
      + `<text x="${pos.x.toFixed(1)}" y="${(pos.y - 1).toFixed(1)}" text-anchor="${ancre}" class="re-cable" style="fill:${coul}">${esc(f.cable || '—')}</text>`
      + `<text x="${pos.x.toFixed(1)}" y="${(pos.y + 12).toFixed(1)}" text-anchor="${ancre}" class="re-dest">${esc(destination(f) + (f.type ? ' · ' + f.type : ''))}</text></g>`; });
  s += `<defs><marker id="re-fleche" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#7a8796"/></marker></defs>`;
  return s + '</svg>'; }

/* ---- le tableau, module par module ------------------------------------- */
function tableauRelief() { const { P, S, prise } = RELIEF, routes = couleursDesRoutes();
  const ko = new Map(); (S ? S.lignes : []).forEach(x => { if (x.verdict !== 'ok') ko.set(x.cable + '|' + x.borne, x.verdict); });
  const fil = (f, m) => { if (!f) return ''; const i = f.i, coul = couleurRelief(f, routes), v = ko.get(f.cable + '|' + m.borne);
    return `<span class="re-f" data-i="${i}"><i style="background:${coul}"></i><b>${esc(f.cable || '—')}</b> ${esc(destination(f))}${f.type ? ' <em>' + esc(f.type) + '</em>' : ''}${v ? ` <span class="ko">${esc(MOTS_VERDICT[v] || v)}</span>` : ''}</span>`; };
  const lignes = P.modules.map(m => { const fs = filsDuModule(RELIEF.nom, m), am = trousDe(m, fs, 'amont').filter(Boolean), av = trousDe(m, fs, 'aval').filter(Boolean);
    return `<tr class="${m.utilisee ? '' : 'libre'}"><td class="n">${esc(m.borne)}</td><td>${am.map(f => fil(f, m)).join('') || (m.utilisee ? '' : '<span class="re-libre">libre</span>')}</td><td>${av.map(f => fil(f, m)).join('')}</td></tr>`; }).join('');
  return `<table class="re-tab"><thead><tr><th>${prise ? 'Contact' : 'Module'}</th><th>${prise ? 'Fiche · ce qui arrive' : 'Amont · ce qui arrive'}</th><th>${prise ? 'Embase · ce qui repart' : 'Aval · ce qui repart'}</th></tr></thead><tbody>${lignes}</tbody></table>`; }

/* ---- la fenêtre ------------------------------------------------------- */
function ouvrirRelief(nom) { if (!estBornier(nom)) return; const V = verite();
  RELIEF.nom = nom; RELIEF.prise = estCoupure(nom); RELIEF.Q = null;
  /* une barrette en modules de jonction : les modules sur leur rail, chaque contact lettré, les fils montant des contacts */
  if (barretteEnModules(nom)) { const { plan: Q } = planDeBarrette(nom); RELIEF.Q = Q; RELIEF.P = null; RELIEF.S = null; [RELIEF.az, RELIEF.el] = VUES_RELIEF['3/4'];
    const ko = Q.fils.filter(x => x.jaugeOk === false).length;
    $('re-sur').textContent = 'Barrette · ' + (Q.reference || 'aucun module ne convient'); $('re-titre').textContent = nom;
    $('re-compte').innerHTML = [pluriel(Q.modules.length, 'module'), pluriel(Q.utilises, 'contact') + ' pris', pluriel(Q.contacts - Q.utilises, 'libre')].join(' · ') + (ko ? ` · <span class="ko">${pluriel(ko, 'fil')} hors taille</span>` : '');
    $('re-tableau').innerHTML = tableauModules(Q);
    $('re-note').textContent = 'Modules de jonction ' + [...new Set(Q.modules.map(M => nomDeFamille(app.norme, M.module.famille)))].join(' et ') + ' : chaque contact lettré ; le laiton relie les contacts d’un même groupe (shunt). En arrière, ce qui arrive ; en avant, ce qui repart.';
    const d = $('relief'); d.hidden = false; peindreRelief(); lierRelief(); $('re-fermer').focus(); return; }
  RELIEF.P = remplirSelonNorme(physiqueDeBarrette(nom, V, app.bible, app.contrat.designations.get(nom) || ''), app.norme);
  RELIEF.S = simulerBornier(RELIEF.P, app.norme, app.simu);
  [RELIEF.az, RELIEF.el] = VUES_RELIEF['3/4'];
  const P = RELIEF.P, mot = RELIEF.prise ? 'contact' : 'module', kos = RELIEF.S ? RELIEF.S.lignes.filter(x => x.verdict !== 'ok').length : 0;
  $('re-sur').textContent = (RELIEF.prise ? 'Prise de coupure' : P.nature.charAt(0).toUpperCase() + P.nature.slice(1)) + ' · ' + (P.reference || 'référence inconnue');
  $('re-titre').textContent = nom;
  $('re-compte').innerHTML = [pluriel(P.modules.length, mot), pluriel(P.modules.length - P.libres, 'utilisé'), pluriel(P.libres, 'libre')].join(' · ')
    + (kos ? ` · <span class="ko">${pluriel(kos, 'fil')} hors norme</span>` : '');
  $('re-tableau').innerHTML = tableauRelief();
  $('re-note').textContent = RELIEF.prise ? 'Disposition des contacts sur la face : indicative (l’arrangement de l’insert n’est pas encore dans la bible).' : 'En arrière, ce qui arrive (amont) ; en avant, ce qui repart (aval). Le cuivre relie les modules d’un même paquet.';
  const d = $('relief'); d.hidden = false; peindreRelief(); lierRelief(); $('re-fermer').focus(); }
function fermerRelief() { $('relief').hidden = true; RELIEF.P = null; RELIEF.Q = null; rallumer(); }
function peindreRelief() { $('re-scene').innerHTML = reliefSvg();
  document.querySelectorAll('#re-vues button').forEach(b => { const [a, e] = VUES_RELIEF[b.dataset.vue]; b.classList.toggle('on', Math.abs(a - RELIEF.az) < 1e-3 && Math.abs(e - RELIEF.el) < 1e-3); }); }
// survoler un fil l'allume ici et sur le plan ; un clic y va
function allumerRelief(i) { document.querySelectorAll('#relief [data-i]').forEach(el => el.classList.toggle('on', +el.dataset.i === i && i >= 0));
  const l = i >= 0 ? verite()[i] : null, f = l && filDe(l); if (f) allumerFil(f); else rallumer(); }
let reliefLie = false;
function lierRelief() { if (reliefLie) return; reliefLie = true; const d = $('relief'), sc = $('re-scene');
  $('re-fermer').onclick = fermerRelief;
  d.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); fermerRelief(); } });
  d.addEventListener('click', e => { if (e.target === d) fermerRelief(); });
  $('re-vues').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; [RELIEF.az, RELIEF.el] = VUES_RELIEF[b.dataset.vue]; peindreRelief(); });
  // tourner à la main : un glissé horizontal tourne autour de la verticale, un glissé vertical incline
  sc.addEventListener('pointerdown', e => { RELIEF.glisse = { x: e.clientX, y: e.clientY, az: RELIEF.az, el: RELIEF.el }; try { sc.setPointerCapture(e.pointerId); } catch (_) { } sc.classList.add('tourne'); });
  sc.addEventListener('pointermove', e => { const g = RELIEF.glisse; if (!g) return;
    RELIEF.az = Math.max(-1.45, Math.min(1.45, g.az + (e.clientX - g.x) * 0.008)); RELIEF.el = Math.max(0.02, Math.min(1.5, g.el + (e.clientY - g.y) * 0.008));
    cancelAnimationFrame(RELIEF.image); RELIEF.image = requestAnimationFrame(peindreRelief); });
  const fin = () => { RELIEF.glisse = null; sc.classList.remove('tourne'); };
  sc.addEventListener('pointerup', fin); sc.addEventListener('pointercancel', fin);
  d.addEventListener('mouseover', e => { const el = e.target.closest('[data-i]'); allumerRelief(el ? +el.dataset.i : -1); });
  d.addEventListener('click', e => { const el = e.target.closest('[data-i]'); if (!el || RELIEF.glisse) return; const l = verite()[+el.dataset.i], f = l && filDe(l);
    if (f) { fermerRelief(); choisirFil(f); viserFil(f); } }); }
