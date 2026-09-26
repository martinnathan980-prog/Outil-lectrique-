/* ===========================================================================
   08 — L'INTERFACE
   Le plan est l'écran. Tout ce qui s'affiche se déduit de `app` par
   `synchroniser()` ; aucun état ne vit dans le DOM.

   app.contrat      le contrat tel qu'il est édité (liaisons, désignations, cartouche)
   app.source       les liaisons d'origine quand le contrat est découpé en folios
                    tout seul ; `verite()` rend toujours ce qu'on édite
   app.plan         '*' = tout d'un tenant, sinon le folio affiché
   app.dessin       le dessin du folio affiché (placement + routage)
   app.base         la base à côté du plan : ouverte ou non, son filtre, son tri
   app.cible        ce qui est choisi : un bloc { type:'bloc', nom } ou un fil
                    { type:'fil', l } — allumé sur le plan, marqué dans la base
   app.actif        la liaison dont on écrit une cellule : son fil s'allume
   La base est LE document : on la corrige, le plan suit. Une fiche ne sert
   plus qu'au cartouche et au collage — jamais deux documents à la fois.
   =========================================================================== */
'use strict';

const app = {
  contrat: nouveauContrat(), source: null, nFolios: 0, budget: 16, plan: '*', nom: '',
  vue: { s: 1, tx: 0, ty: 0 }, choisi: null, cible: null, actif: null, dessin: null, hist: [], fiche: null,
  base: { ouvert: false, filtre: '', tri: null, largeur: 0, hauteur: 0, sale: true, defiler: false, enSaisie: false }
};
const $ = id => document.getElementById(id);
const CLE_CONTRAT = 'atelier.contrat.v2';
const CLE_BASE = 'atelier.base.v1';
const ZMIN = 0.06, ZMAX = 8;
const verite = () => app.source || app.contrat.liaisons;
const plans = () => plansDe(app.contrat.liaisons);
const mouvementReduit = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const telephone = () => window.innerWidth <= 700;

/* ---- le dessin ---------------------------------------------------------- */
function liaisonsDuPlan() { const L = app.contrat.liaisons.filter(liaisonComplete);
  return app.plan === '*' ? L : L.filter(l => l.plan === app.plan); }
function calculer() {
  const L = liaisonsDuPlan(); if (!L.length) { app.dessin = null; return null; }
  const P = meilleurPlacement(L);
  app.dessin = P ? { comps: P.comps, links: P.links, bbox: P.bbox, geom: P.geom, compDe: P.compDe,
                     fils: P.routage.fils, points: P.routage.points, barrettes: P.routage.barrettes, piquages: P.routage.piquages } : null;
  return app.dessin;
}
function folioCourant() { const P = plans();
  return (app.plan !== '*' && P.length > 1) ? (app.plan + ' / ' + P.length) : '1 / 1'; }
function peindre() {
  const svg = $('svg');
  $('vide').hidden = app.contrat.liaisons.length > 0;
  if (!app.dessin) { svg.innerHTML = ''; appliquerVue(); return; }
  const designation = n => app.contrat.designations.get(n) || '';
  svg.innerHTML = styleDessin() + `<g id="scene" transform="translate(${app.vue.tx},${app.vue.ty}) scale(${app.vue.s})">`
    + sceneSvg(app.dessin, app.contrat.cartouche, folioCourant(), designation, app.choisi) + '</g>';
  appliquerVue();
}
function redessiner() { calculer(); peindre(); synchroniser(); rallumer(); }

/* ---- la vue : zoom, cadrage, l'ombre sous la feuille ------------------- */
const cadre = () => $('planche').getBoundingClientRect();
function appliquerVue() {
  const sc = $('scene'); if (sc) sc.setAttribute('transform', `translate(${app.vue.tx},${app.vue.ty}) scale(${app.vue.s})`);
  $('zlbl').textContent = Math.round(app.vue.s * 100) + ' %';
  const o = $('ombre');
  if (!app.dessin) { o.style.display = 'none'; return; }
  const bb = app.dessin.bbox, s = app.vue.s;
  o.style.display = 'block'; o.style.transform = `translate(${app.vue.tx + bb.x * s}px,${app.vue.ty + bb.y * s}px)`;
  o.style.width = bb.w * s + 'px'; o.style.height = bb.h * s + 'px';
}
/* Le vide que laissent les instruments et le document ouvert : la feuille se cadre dedans. */
function marges() { const tel = telephone();
  const doc = !$('base').hidden ? $('base') : (!$('fiche').hidden ? $('fiche') : null);
  return { haut: tel ? 60 : 68, bas: (tel && doc) ? doc.offsetHeight + 12 : (tel ? 64 : 72),
           gauche: tel ? 12 : 28, droite: (tel ? 12 : 28) + ((doc && !tel) ? doc.offsetWidth + 24 : 0) }; }
let anim = null;
function animerVue(cible, doux) {
  if (anim) { cancelAnimationFrame(anim); anim = null; }
  if (!doux || mouvementReduit()) { app.vue = cible; appliquerVue(); return; }
  const de = { ...app.vue }, t0 = performance.now(), D = 260;
  const pas = t => { const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3);
    app.vue = { s: de.s + (cible.s - de.s) * e, tx: de.tx + (cible.tx - de.tx) * e, ty: de.ty + (cible.ty - de.ty) * e };
    appliquerVue(); anim = k < 1 ? requestAnimationFrame(pas) : null; };
  anim = requestAnimationFrame(pas);
}
function ajuster(doux) {
  if (!app.dessin) { app.vue = { s: 1, tx: 40, ty: 40 }; appliquerVue(); return; }
  const bb = app.dessin.bbox, r = cadre(), m = marges();
  const W = Math.max(80, r.width - m.gauche - m.droite), H = Math.max(80, r.height - m.haut - m.bas);
  const s = Math.max(ZMIN, Math.min(ZMAX, Math.min(W / bb.w, H / bb.h)));
  animerVue({ s, tx: m.gauche + (W - bb.w * s) / 2 - bb.x * s, ty: m.haut + (H - bb.h * s) / 2 - bb.y * s }, doux);
}
function zoomer(k, mx, my) { const r = cadre(); if (mx == null) { mx = r.width / 2; my = r.height / 2; }
  const wx = (mx - app.vue.tx) / app.vue.s, wy = (my - app.vue.ty) / app.vue.s;
  const ns = Math.max(ZMIN, Math.min(ZMAX, app.vue.s * k));
  app.vue = { s: ns, tx: mx - wx * ns, ty: my - wy * ns }; appliquerVue(); }
const versMonde = (cx, cy) => { const r = cadre(); return { x: (cx - r.left - app.vue.tx) / app.vue.s, y: (cy - r.top - app.vue.ty) / app.vue.s }; };
function blocSous(w) { if (!app.dessin) return null; const cs = app.dessin.comps;
  for (let i = cs.length - 1; i >= 0; i--) { const c = cs[i]; if (w.x >= c.x - 5 && w.x <= c.x + c.w + 5 && w.y >= c.y - 5 && w.y <= c.y + c.h + 5) return c; } return null; }
function filSous(w) { if (!app.dessin) return null; const tol = Math.max(4, 7 / app.vue.s); let best = null, bd = tol;
  const d = (px, py, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy; let t = L2 ? ((px - a.x) * dx + (py - a.y) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy)); };
  for (const f of app.dessin.fils) for (let i = 0; i < f.pts.length - 1; i++) { const dd = d(w.x, w.y, f.pts[i], f.pts[i + 1]); if (dd < bd) { bd = dd; best = f; } }
  return best; }
/* Aller voir quelque chose : on le met au centre du vide, lisible. */
function centrerSur(x, y, w, h) { const r = cadre(), m = marges();
  const s = Math.max(app.vue.s, Math.min(1.1, Math.min((r.width - m.gauche - m.droite) / (w + 80), (r.height - m.haut - m.bas) / (h + 80))));
  const cx = m.gauche + (r.width - m.gauche - m.droite) / 2, cy = m.haut + (r.height - m.haut - m.bas) / 2;
  animerVue({ s, tx: cx - (x + w / 2) * s, ty: cy - (y + h / 2) * s }, true); }
function viser(nom) { const c = app.dessin && app.dessin.compDe.get(nom); if (!c) return false;
  centrerSur(c.x, c.y, c.w, c.h); return true; }
function viserFil(f) { const xs = f.pts.map(p => p.x), ys = f.pts.map(p => p.y);
  const x0 = Math.min(...xs), y0 = Math.min(...ys); centrerSur(x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0); }

/* ---- la surbrillance : des classes sur le rendu, jamais un recalcul ---- */
function eteindre() { const sc = $('scene'); if (!sc) return;
  if (sc.classList.contains('focus')) { sc.classList.remove('focus'); sc.querySelectorAll('.hl').forEach(el => el.classList.remove('hl')); } }
function allumerBloc(nom) { const sc = $('scene'); if (!sc) return; eteindre(); sc.classList.add('focus'); nom = xmlSur(nom);
  const autres = new Set();
  sc.querySelectorAll('.cab').forEach(p => { const a = p.dataset.a, b = p.dataset.b; if (a === nom || b === nom) { p.classList.add('hl'); autres.add(a); autres.add(b); } });
  sc.querySelectorAll('.comp').forEach(g => { if (g.dataset.name === nom || autres.has(g.dataset.name)) g.classList.add('hl'); }); }
function allumerFil(f) { const sc = $('scene'); if (!sc) return; eteindre(); sc.classList.add('focus');
  sc.querySelectorAll('.cab').forEach(p => { if (+p.dataset.i === f.i) p.classList.add('hl'); });
  sc.querySelectorAll('.comp').forEach(g => { if (g.dataset.name === xmlSur(f.de) || g.dataset.name === xmlSur(f.vers)) g.classList.add('hl'); }); }
/* Ce qui est choisi reste allumé après un survol ou un redessin ; la ligne
   qu'on écrit passe devant. */
function rallumer() { const c = app.cible, w = app.actif && filDe(app.actif);
  if (w) allumerFil(w);
  else if (c && c.type === 'bloc' && app.dessin && app.dessin.compDe.has(c.nom)) allumerBloc(c.nom);
  else if (c && c.type === 'fil' && app.dessin) { const w = filDe(c.l); if (w) allumerFil(w); else eteindre(); }
  else eteindre();
  marquerLignes(); }
function filDe(l) { if (!app.dessin) return null; const L = liaisonsDuPlan();
  return app.dessin.fils.find(w => L[w.i] === l || sourceDe(L[w.i]) === l) || null; }

/* ---- la planche : pan, pinch, molette, clic, survol -------------------- */
function lierPlanche() {
  const stage = $('planche'); const pointeurs = new Map(); let mode = null, pan = null, pinch = null, bouge = false, origine = null, survole = null;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const debutPinch = () => { mode = 'pinch'; pan = null; const r = cadre(); const p = [...pointeurs.values()];
    const mx = (p[0].x + p[1].x) / 2 - r.left, my = (p[0].y + p[1].y) / 2 - r.top;
    pinch = { d: dist(p[0], p[1]), wx: (mx - app.vue.tx) / app.vue.s, wy: (my - app.vue.ty) / app.vue.s, s0: app.vue.s }; };
  const suitPinch = () => { const r = cadre(); const p = [...pointeurs.values()]; if (p.length < 2) return;
    const ns = Math.max(ZMIN, Math.min(ZMAX, pinch.s0 * dist(p[0], p[1]) / pinch.d));
    const mx = (p[0].x + p[1].x) / 2 - r.left, my = (p[0].y + p[1].y) / 2 - r.top;
    app.vue = { s: ns, tx: mx - pinch.wx * ns, ty: my - pinch.wy * ns }; appliquerVue(); };
  stage.addEventListener('pointerdown', e => { if (e.button && e.button !== 0) return; fermerMenu(); fermerRecherche();
    try { stage.setPointerCapture(e.pointerId); } catch (_) { }
    pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointeurs.size >= 2) { debutPinch(); return; }
    bouge = false; origine = [e.clientX, e.clientY]; mode = 'pan'; pan = { tx: app.vue.tx, ty: app.vue.ty, x: e.clientX, y: e.clientY }; });
  stage.addEventListener('pointermove', e => { if (pointeurs.has(e.pointerId)) pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (mode === 'pinch') { suitPinch(); return; } if (!mode) return;
    if (origine && (Math.abs(e.clientX - origine[0]) > 3 || Math.abs(e.clientY - origine[1]) > 3)) { bouge = true; stage.classList.add('tient'); }
    if (mode === 'pan') { app.vue.tx = pan.tx + (e.clientX - pan.x); app.vue.ty = pan.ty + (e.clientY - pan.y); appliquerVue(); } });
  const fin = e => { try { stage.releasePointerCapture(e.pointerId); } catch (_) { } stage.classList.remove('tient');
    const etaitPinch = mode === 'pinch'; pointeurs.delete(e.pointerId);
    if (etaitPinch) { if (pointeurs.size < 2) { mode = null; pinch = null; } return; }
    if (mode === 'pan' && !bouge) cliquer(versMonde(e.clientX, e.clientY));
    mode = null; pan = null; };
  stage.addEventListener('pointerup', fin); stage.addEventListener('pointercancel', fin);
  stage.addEventListener('mousemove', e => { if (mode || pointeurs.size) return;
    const c = blocSous(versMonde(e.clientX, e.clientY)); const nm = c ? c.name : null;
    if (nm !== survole) { survole = nm; if (nm) allumerBloc(nm); else rallumer(); } });
  stage.addEventListener('mouseleave', () => { if (!mode) { survole = null; rallumer(); } });
  stage.addEventListener('wheel', e => { e.preventDefault(); const r = cadre(); zoomer(Math.exp(-e.deltaY * 0.0014), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  stage.addEventListener('dblclick', e => { const r = cadre(); zoomer(1.6, e.clientX - r.left, e.clientY - r.top); });
}
/* Un clic sur la planche : un bloc, un renvoi, un fil, ou le vide. */
function cliquer(w) { const c = blocSous(w);
  if (c) { if (estRenvoi(c.name)) { const t = c.name.replace(RENVOI, ''); if (plans().includes(t)) allerAuPlan(t); return; }
    if (c.rail) return; choisirBloc(c); return; }
  const f = filSous(w); if (f) choisirFil(f); else deselectionner(); }
/* Choisir un bloc : la base se filtre sur lui — c'est sa fiche. */
function choisirBloc(c) { app.choisi = c.name; app.cible = { type: 'bloc', nom: c.name }; app.base.filtre = c.name; app.base.defiler = true;
  peindre(); ouvrirBase(); rendreBase(); allumerBloc(c.name); }
/* Choisir un fil : sa ligne se marque et vient sous les yeux. */
function choisirFil(f) { const l = liaisonsDuPlan()[f.i]; if (!l) return; const src = sourceDe(l) || l;
  if (app.choisi) { app.choisi = null; peindre(); }
  app.cible = { type: 'fil', l: src }; app.base.defiler = true;
  if (!lignesVisibles().some(([x]) => x === src)) app.base.filtre = '';
  ouvrirBase(); rendreBase(); allumerFil(f); }
function deselectionner() { const c = app.cible;
  if (c) { app.cible = null; if (app.choisi) { app.choisi = null; peindre(); }
    if (c.type === 'bloc' && app.base.filtre === c.nom) app.base.filtre = '';
    rendreBase(); eteindre(); }
  if (app.fiche) fermerFiche(true); }

/* ---- les folios : y aller, les montrer --------------------------------- */
function allerAuPlan(plan) { if (plan === app.plan) return; app.plan = plan; app.choisi = null; fermerFiche(); redessiner(); ajuster(); }
function allerAuFolio(pas) { const P = plans(); let i = P.indexOf(app.plan);
  if (i < 0) i = pas > 0 ? -1 : P.length; i += pas; if (i < 0 || i >= P.length) return; allerAuPlan(P[i]); }
function plansDuRepere(nom) { return [...new Set(app.contrat.liaisons.filter(l => l.de === nom || l.vers === nom).map(l => l.plan).filter(Boolean))]; }
function plansDuFil(cable) { return [...new Set(app.contrat.liaisons.filter(l => l.cable === cable).map(l => l.plan).filter(Boolean))]; }
function synchroniserFolios() { const P = plans(), nav = $('folios'), strip = $('fo-strip');
  nav.hidden = P.length < 2;
  if (app.plan !== '*' && !P.includes(app.plan)) app.plan = P.length > 1 ? P[0] : '*';
  const i = P.indexOf(app.plan);
  strip.innerHTML = P.length < 2 ? '' : P.map(p => `<button class="chip${p === app.plan ? ' on' : ''}" data-plan="${escA(p)}" aria-label="Folio ${escA(p)}"${p === app.plan ? ' aria-current="page"' : ''}>${esc(p)}</button>`).join('');
  $('fo-lbl').textContent = i < 0 ? (P.length > 1 ? 'tout' : '1 / 1') : (i + 1) + ' / ' + P.length;
  $('fo-prev').disabled = i === 0; $('fo-next').disabled = i >= 0 && i >= P.length - 1;
  const on = strip.querySelector('.chip.on'); if (on && on.scrollIntoView) { try { on.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (_) { } } }

/* ---- aller à un repère ou à un fil, même sur un autre folio ------------ */
function aller(cible) { const P = plans(); const nom = cible.nom;
  const ou = cible.type === 'fil' ? plansDuFil(nom) : plansDuRepere(nom);
  if (P.length > 1 && app.plan !== '*' && ou.length && !ou.includes(app.plan)) allerAuPlan(ou[0]);
  if (cible.type === 'fil') { const f = app.dessin && app.dessin.fils.find(w => w.cable === nom); if (!f) { dire('« ' + nom + ' » n’est pas dessiné.'); return; }
    choisirFil(f); viserFil(f); return; }
  const c = app.dessin && app.dessin.compDe.get(nom); if (!c) { dire('« ' + nom + ' » n’est sur aucun folio.'); return; }
  choisirBloc(c); viser(nom); }

/* ---- la recherche ------------------------------------------------------- */
function candidats(q) { q = q.trim().toLowerCase(); if (!q) return [];
  const L = verite(), cnt = new Map(), D = app.contrat.designations;
  L.forEach(l => [l.de, l.vers].forEach(n => { if (n && !estRenvoi(n)) cnt.set(n, (cnt.get(n) || 0) + 1); }));
  const rang = n => n.toLowerCase().startsWith(q) ? 0 : (n.toLowerCase().includes(q) ? 1 : 2);
  const rep = [...cnt.keys()].filter(n => rang(n) < 2 || (D.get(n) || '').toLowerCase().includes(q))
    .sort((a, b) => rang(a) - rang(b) || cnt.get(b) - cnt.get(a) || a.localeCompare(b)).slice(0, 7)
    .map(n => ({ type: 'repere', nom: n, des: D.get(n) || '', n: cnt.get(n) }));
  const fils = [], vus = new Set();
  L.forEach(l => { const c = l.cable; if (c && !vus.has(c) && c.toLowerCase().includes(q)) { vus.add(c); fils.push({ type: 'fil', nom: c, des: l.de + ' → ' + l.vers }); } });
  return rep.concat(fils.sort((a, b) => rang(a.nom) - rang(b.nom)).slice(0, 5)); }
let qSel = 0, qCands = [];
function montrerCandidats() { const box = $('q-liste'), q = $('q').value; qCands = candidats(q);
  if (!q.trim()) { box.hidden = true; return; } box.hidden = false; qSel = Math.min(qSel, Math.max(0, qCands.length - 1));
  box.innerHTML = qCands.length ? qCands.map((c, i) => `<button class="q-item${i === qSel ? ' on' : ''}" role="option" data-i="${i}" aria-selected="${i === qSel}">
      <span class="genre">${c.type === 'fil' ? 'fil' : 'repère'}</span><span class="nom">${esc(c.nom)}</span><span class="des">${esc(c.des)}</span>${c.n ? `<span class="cpt">${c.n} fil${c.n > 1 ? 's' : ''}</span>` : ''}</button>`).join('')
    : '<div class="q-rien">Rien qui corresponde.</div>'; }
function fermerRecherche() { $('q-liste').hidden = true; $('haut').classList.remove('cherche'); }
function lierRecherche() { const q = $('q'), box = $('q-liste');
  q.addEventListener('input', () => { qSel = 0; montrerCandidats(); });
  q.addEventListener('focus', () => { $('haut').classList.add('cherche'); if (q.value.trim()) montrerCandidats(); });
  q.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); qSel = Math.min(qSel + 1, qCands.length - 1); montrerCandidats(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); qSel = Math.max(qSel - 1, 0); montrerCandidats(); }
    else if (e.key === 'Enter') { e.preventDefault(); const c = qCands[qSel]; if (c) trouve(c); }
    else if (e.key === 'Escape') { q.value = ''; fermerRecherche(); q.blur(); } });
  // trouvé : le champ se vide, le résultat est sur le plan et dans la base
  const trouve = c => { q.value = ''; fermerRecherche(); q.blur(); aller(c); };
  box.addEventListener('pointerdown', e => e.preventDefault());   // le champ garde le focus
  box.addEventListener('click', e => { const b = e.target.closest('.q-item'); if (!b) return; const c = qCands[+b.dataset.i]; if (c) trouve(c); });
  q.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== q) fermerRecherche(); }, 120));
  // sur téléphone le champ est replié : on l'ouvre d'abord, puis on lui donne le focus
  $('recherche').addEventListener('click', e => { if (e.target.closest('.q-liste')) return; $('haut').classList.add('cherche'); q.focus(); }); }

/* ---- la base : la table des liaisons, corrigée en direct --------------- */
const COLONNES_BASE = [
  { k: 'de', lib: 'De', cls: 'rep' }, { k: 'borneDe', lib: 'B.', cls: 'n' },
  { k: 'vers', lib: 'Vers', cls: 'rep' }, { k: 'borneVers', lib: 'B.', cls: 'n' },
  { k: 'cable', lib: 'Fil', cls: 'fil' }, { k: 'type', lib: 'Type', cls: 'type', option: true }, { k: 'plan', lib: 'Folio', cls: 'n' },
  { k: 'pnDe', lib: 'Conn. dép.', cls: 'pn', option: true }, { k: 'pnVers', lib: 'Conn. arr.', cls: 'pn', option: true }, { k: 'route', lib: 'Route', cls: 'route', option: true }];
const CAP_LIGNES = 400;
/* La colonne Folio : se corrige quand le folio vient du fichier ; se lit
   seulement quand l'outil a découpé lui-même ; absente s'il n'y a qu'une feuille. */
const modeFolio = () => app.nFolios ? 'auto' : (plans().length ? 'fichier' : 'aucun');
/* Une colonne du retest que le contrat n'utilise pas ne prend pas de place. */
function colonnes() { const V = verite(), mf = modeFolio();
  return COLONNES_BASE.filter(c => c.k === 'plan' ? mf !== 'aucun' : (!c.option || V.some(l => l[c.k]))); }
const cleDe = l => [l.de, l.borneDe, l.vers, l.borneVers, l.cable].join('\u0001');
/* Quand l'outil a découpé, chaque liaison d'origine vit sur un ou deux
   folios : on retrouve la sienne par sa clé, sans parcourir la source. */
function foliosParSource() { const m = new Map(); if (!app.nFolios) return m;
  app.contrat.liaisons.forEach(d => { const k = cleSource(d); const t = m.get(k) || m.set(k, []).get(k); if (!t.includes(d.plan)) t.push(d.plan); });
  return m; }
function lignesVisibles() { const V = verite(), f = app.base.filtre.trim().toLowerCase(), C = colonnes();
  let L = V.map((l, i) => [l, i]); if (f) L = L.filter(([l]) => C.some(c => String(l[c.k]).toLowerCase().includes(f)));
  const tri = app.base.tri; if (!tri) return L;
  const cmp = (a, b) => { const x = a[0][tri.k], y = b[0][tri.k], nx = parseFloat(x), ny = parseFloat(y);
    return (!isNaN(nx) && !isNaN(ny) && String(nx) === x && String(ny) === y) ? nx - ny : String(x).localeCompare(String(y), 'fr', { numeric: true }); };
  return L.sort((a, b) => tri.sens * cmp(a, b) || a[1] - b[1]); }
function ligneChoisie(l) { const c = app.cible; if (!c) return false;
  return c.type === 'fil' ? c.l === l : (l.de === c.nom || l.vers === c.nom); }
function rendreLigne(l, i, folios) { const c = app.cible, mode = modeFolio();
  const surCeFolio = app.plan === '*' || (mode === 'auto' ? (folios.get(cleDe(l)) || []).includes(app.plan) : l.plan === app.plan);
  const cell = col => { if (col.k === 'plan' && mode === 'auto') return `<td class="n">${(folios.get(cleDe(l)) || []).map(p => `<button class="f" data-plan="${escA(p)}" title="Aller au folio ${escA(p)}">${esc(p)}</button>`).join('')}</td>`;
    return `<td${col.cls ? ` class="${col.cls}"` : ''}><input data-i="${i}" data-f="${col.k}" value="${escA(l[col.k])}" aria-label="${col.lib}, ligne ${i + 1}" spellcheck="false" autocomplete="off"></td>`; };
  return `<tr data-i="${i}" class="${ligneChoisie(l) ? 'on' : ''}${surCeFolio && liaisonComplete(l) ? '' : ' hors'}"><td class="g"><button data-voir="${i}" title="${surCeFolio ? 'Voir ce fil sur le plan' : 'Ce fil n’est pas sur ce folio'}">${i + 1}</button></td>`
    + colonnes().map(cell).join('') + `<td class="x"><button data-x="${i}" aria-label="Supprimer la ligne ${i + 1}">×</button></td></tr>`; }
/* Tout le panneau se déduit de `app` ; le tableau n'est pas refait tant
   qu'on y écrit (voir rafraichirBase). */
function rendreBase() { const b = app.base; b.sale = false; if ($('base').hidden) { b.sale = true; return; }
  const V = verite(), vues = lignesVisibles(), folios = foliosParSource(), tri = b.tri;
  $('ba-titre').innerHTML = vues.length === V.length ? `<b>${V.length}</b> liaison${V.length > 1 ? 's' : ''}` : `<b>${vues.length}</b> sur ${V.length}`;
  const fi = $('ba-filtre'); if (fi.value !== b.filtre) fi.value = b.filtre; $('ba-vider').hidden = !b.filtre;
  $('ba-thead').innerHTML = '<tr><th title="Numéro de ligne">#</th>' + colonnes().map(c => `<th data-k="${c.k}" class="${tri && tri.k === c.k ? 'tri' : ''}" title="Trier par ${escA(c.lib)}">${c.lib}${tri && tri.k === c.k ? `<span class="sens">${tri.sens > 0 ? '▲' : '▼'}</span>` : ''}</th>`).join('') + '<th></th>';
  $('ba-tbody').innerHTML = vues.slice(0, CAP_LIGNES).map(([l, i]) => rendreLigne(l, i, folios)).join('')
    + (vues.length > CAP_LIGNES ? `<tr class="reste"><td colspan="${colonnes().length + 2}">… et ${vues.length - CAP_LIGNES} autres lignes — affine le filtre.</td></tr>` : '')
    + (!vues.length ? `<tr class="reste"><td colspan="${colonnes().length + 2}">${V.length ? 'Rien qui corresponde au filtre.' : 'Aucune liaison. Ajoute une ligne, ou dépose un fichier.'}</td></tr>` : '');
  rendreEquip();
  if (b.defiler) { b.defiler = false; const tr = $('ba-tbody').querySelector('tr.on'); if (tr && tr.scrollIntoView) { try { tr.scrollIntoView({ block: 'center' }); } catch (_) { } } } }
/* Le rendu attend qu'on ait fini d'écrire dans une cellule : refaire le
   tableau sous les doigts casserait la saisie et la tabulation. On s'en
   remet à `enSaisie` (focusin / focusout) et non à document.activeElement :
   pendant le `change` que déclenche Tab, le navigateur l'a déjà vidé. */
function rafraichirBase() { if (app.base.enSaisie) { app.base.sale = true; return; } rendreBase(); }
function marquerLignes() { if ($('base').hidden) return;
  $('ba-tbody').querySelectorAll('tr[data-i]').forEach(tr => { const l = verite()[+tr.dataset.i]; tr.classList.toggle('on', !!l && ligneChoisie(l)); }); }
const natureDe = nom => { const q = lireRepere(nom); return (q && q.num && CODES[q.code]) ? CODES[q.code].nom : 'équipement'; };
/* L'équipement choisi : son repère et sa désignation, au-dessus de ses fils. */
function rendreEquip() { const box = $('ba-equip'), c = app.cible; box.hidden = !(c && c.type === 'bloc'); if (box.hidden) return;
  const nom = c.nom, n = verite().filter(l => l.de === nom || l.vers === nom).length, pn = [...new Set(verite().flatMap(l => l.de === nom ? [l.pnDe] : (l.vers === nom ? [l.pnVers] : [])).filter(Boolean))];
  box.innerHTML = `<div class="sur">${esc(natureDe(nom))} · ${n} fil${n > 1 ? 's' : ''}${pn.length ? ' · ' + esc(pn.join(' · ')) : ''}</div>
    <div class="actions"><button class="btn lien danger" id="eq-del" title="Supprimer l’équipement et ses fils">Supprimer</button></div>
    <input class="rep" id="eq-rep" value="${escA(nom)}" aria-label="Repère" title="Renommer : chaque fil suit" spellcheck="false">
    <input class="des" id="eq-des" value="${escA(app.contrat.designations.get(nom) || '')}" placeholder="Désignation, écrite sous le repère" aria-label="Désignation" spellcheck="false">`;
  $('eq-rep').addEventListener('change', e => { const nr = e.target.value.trim(); if (!nr || nr === nom) { e.target.value = nom; return; }
    histPush('renommage de ' + nom); renommer(nom, nr); app.choisi = nr; app.cible = { type: 'bloc', nom: nr }; app.base.filtre = nr; apresEdition(); });
  $('eq-des').addEventListener('change', e => { histPush('désignation de ' + nom); designer(nom, e.target.value.trim()); apresEdition(); });
  $('eq-del').onclick = () => { if (!confirm('Supprimer « ' + nom + ' » et ses ' + n + ' liaison(s) ?')) return;
    histPush('suppression de ' + nom); supprimerEquipement(nom); app.base.filtre = ''; apresEdition(); dire(nom + ' supprimé.'); };
  box.querySelectorAll('input').forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } })); }

/* Une cellule corrigée : la vérité change, le plan suit, le fil s'allume.
   Un bloc choisi le reste : on corrige ses fils sans quitter sa fiche. */
function appliquerCellule(inp) { const l = verite()[+inp.dataset.i], k = inp.dataset.f; if (!l || !k) return;
  const v = inp.value.trim(); if (l[k] === v) return;
  if (!inp.dataset.hist) { histPush('modification d’une liaison'); inp.dataset.hist = '1'; }   // une seule entrée d'historique par saisie
  l[k] = v; app.actif = l; if (!(app.cible && app.cible.type === 'bloc')) app.cible = { type: 'fil', l }; apresEdition(); }
/* Entrer dans une cellule : sa ligne devient ce qu'on regarde. */
function entrerCellule(inp) { delete inp.dataset.hist; app.base.enSaisie = true;
  const l = verite()[+inp.dataset.i]; if (!l) return; app.actif = l;
  if (!(app.cible && app.cible.type === 'bloc')) app.cible = { type: 'fil', l }; rallumer(); }
function quitterTable() { app.base.enSaisie = false; app.actif = null; if (app.base.sale) rendreBase(); rallumer(); }
function ajouterLiaison(de) { histPush('ajout d’une liaison');
  const n = liaison({ de: de || '', plan: (modeFolio() === 'fichier' && app.plan !== '*') ? app.plan : '' }); verite().push(n);
  const i = verite().length - 1, sousBloc = de && app.cible && app.cible.type === 'bloc' && app.cible.nom === de;
  if (!sousBloc) { app.cible = { type: 'fil', l: n }; app.base.filtre = ''; }
  app.base.tri = null; apresEdition(); rendreBase();
  const tr = $('ba-tbody').querySelector(`tr[data-i="${i}"]`); const inp = tr && tr.querySelector(`input[data-f="${de ? 'vers' : 'de'}"]`);
  if (inp) { inp.focus(); try { tr.scrollIntoView({ block: 'nearest' }); } catch (_) { } } }
function supprimerLiaison(i) { const V = verite(), l = V[i]; if (!l) return; histPush('suppression d’une liaison'); V.splice(i, 1);
  if (app.cible && app.cible.type === 'fil' && app.cible.l === l) app.cible = null; apresEdition(); rendreBase(); }
/* Voir un fil depuis sa ligne : on change de folio s'il le faut, on le cadre. */
function voirLiaison(i) { const l = verite()[i]; if (!l) return;
  if (app.choisi) { app.choisi = null; peindre(); } app.cible = { type: 'fil', l };
  const ou = modeFolio() === 'auto' ? (foliosParSource().get(cleDe(l)) || []) : (l.plan ? [l.plan] : []);
  if (app.plan !== '*' && ou.length && !ou.includes(app.plan)) allerAuPlan(ou[0]);
  const w = filDe(l); if (w) { allumerFil(w); viserFil(w); } marquerLignes(); }
function lierBase() { const t = $('ba-tab'), corps = $('ba-tbody'), fi = $('ba-filtre'); let sT, fT;
  fi.addEventListener('input', () => { clearTimeout(fT); fT = setTimeout(() => { app.base.filtre = fi.value;
    const c = app.cible; if (c && c.type === 'bloc' && fi.value.trim() !== c.nom) { app.cible = null; app.choisi = null; peindre(); }
    rendreBase(); rallumer(); }, 150); });
  fi.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); if (fi.value) { fi.value = ''; fi.dispatchEvent(new Event('input')); } else fi.blur(); } });
  $('ba-vider').onclick = () => { fi.value = ''; fi.dispatchEvent(new Event('input')); fi.focus(); };
  $('ba-add').onclick = () => ajouterLiaison(app.cible && app.cible.type === 'bloc' ? app.cible.nom : '');
  $('ba-fermer').onclick = fermerBase;
  $('ba-thead').addEventListener('click', e => { const th = e.target.closest('th[data-k]'); if (!th) return; const k = th.dataset.k, tri = app.base.tri;
    app.base.tri = !tri || tri.k !== k ? { k, sens: 1 } : (tri.sens > 0 ? { k, sens: -1 } : null); rendreBase(); });
  t.addEventListener('focusin', e => { if (e.target.dataset.f != null) entrerCellule(e.target); });
  t.addEventListener('input', e => { const inp = e.target; if (inp.dataset.f == null) return; clearTimeout(sT); sT = setTimeout(() => appliquerCellule(inp), 350); });
  t.addEventListener('change', e => { const inp = e.target; if (inp.dataset.f == null) return; clearTimeout(sT); appliquerCellule(inp); });
  // le focus part : si c'est hors de la table (on le sait un instant plus tard), la saisie est finie
  t.addEventListener('focusout', () => setTimeout(() => { if (!t.contains(document.activeElement)) quitterTable(); }, 0));
  t.addEventListener('keydown', e => { const inp = e.target; if (inp.dataset.f == null) return;
    if (e.key === 'Escape') { e.stopPropagation(); inp.blur(); }
    else if (e.key === 'Enter') { e.preventDefault(); const tr = inp.closest('tr'), suiv = tr && tr.nextElementSibling; const n = suiv && suiv.querySelector(`input[data-f="${inp.dataset.f}"]`); if (n) n.focus(); else inp.blur(); } });
  corps.addEventListener('mouseover', e => { const tr = e.target.closest('tr[data-i]'); if (!tr) return; const w = filDe(verite()[+tr.dataset.i]); if (w) allumerFil(w); });
  corps.addEventListener('mouseleave', () => rallumer());
  corps.addEventListener('click', e => { const v = e.target.closest('button[data-voir]'), x = e.target.closest('button[data-x]'), f = e.target.closest('button[data-plan]');
    if (v) voirLiaison(+v.dataset.voir); else if (x) supprimerLiaison(+x.dataset.x); else if (f) allerAuPlan(f.dataset.plan); });
  lierPoignee(); }
/* La poignée : la base se règle en largeur (à droite) ou en hauteur (en tiroir). */
function lierPoignee() { const p = $('ba-poignee'), b = $('base'); let actif = false;
  p.addEventListener('pointerdown', e => { actif = true; b.classList.add('redim'); try { p.setPointerCapture(e.pointerId); } catch (_) { } e.preventDefault(); });
  p.addEventListener('pointermove', e => { if (!actif) return;
    if (telephone()) { app.base.hauteur = Math.round(Math.max(160, Math.min(window.innerHeight * 0.85, window.innerHeight - e.clientY))); }
    else { app.base.largeur = Math.round(Math.max(340, Math.min(window.innerWidth * 0.7, window.innerWidth - 12 - e.clientX))); }
    appliquerTailleBase(); });
  const fin = () => { if (!actif) return; actif = false; b.classList.remove('redim'); memoriserBase(); ajuster(true); };
  p.addEventListener('pointerup', fin); p.addEventListener('pointercancel', fin); }
function appliquerTailleBase() { const r = document.documentElement.style;
  if (app.base.largeur) r.setProperty('--base-l', app.base.largeur + 'px'); if (app.base.hauteur) r.setProperty('--base-h', app.base.hauteur + 'px'); }
function ouvrirBase() { if (app.base.ouvert) return; app.base.ouvert = true; fermerFiche();
  const b = $('base'); b.hidden = false; b.classList.remove('entre'); void b.offsetWidth; b.classList.add('entre');
  document.body.classList.add('base-ouverte'); $('btnBase').setAttribute('aria-pressed', 'true');
  rendreBase(); memoriserBase(); ajuster(true); }
function fermerBase() { if (!app.base.ouvert) return; app.base.ouvert = false;
  $('base').hidden = true; document.body.classList.remove('base-ouverte'); $('btnBase').setAttribute('aria-pressed', 'false');
  if (app.cible) { app.cible = null; if (app.choisi) { app.choisi = null; peindre(); } eteindre(); }
  memoriserBase(); ajuster(true); }
function basculerBase() { if (app.base.ouvert) fermerBase(); else if (app.contrat.liaisons.length || verite().length) ouvrirBase(); else dire('Rien à montrer : dépose d’abord un fichier.'); }
/* Ouverte ou non, sa taille : une commodité de ce navigateur, rien de plus. */
function memoriserBase() { try { localStorage.setItem(CLE_BASE, JSON.stringify({ ouvert: app.base.ouvert, largeur: app.base.largeur, hauteur: app.base.hauteur })); } catch (_) { } }
function relireBase() { let o = null; try { o = JSON.parse(localStorage.getItem(CLE_BASE) || 'null'); } catch (_) { }
  if (o) { app.base.largeur = o.largeur || 0; app.base.hauteur = o.hauteur || 0; } appliquerTailleBase();
  return o ? !!o.ouvert : !telephone(); }   // au premier lancement, la base est là sur un grand écran

/* ---- la fiche : cartouche, collage — les documents rares ---------------- */
function ouvrirFiche(mode, corps, pied) { const f = $('fiche'); fermerBase();
  $('fiche-corps').innerHTML = corps; const p = $('fiche-pied'); p.innerHTML = pied || ''; p.hidden = !pied;
  const nouveau = f.hidden || !app.fiche || app.fiche.mode !== mode.mode;
  f.hidden = false; if (nouveau) { f.classList.remove('entre'); void f.offsetWidth; f.classList.add('entre'); }
  app.fiche = mode; $('fiche-corps').scrollTop = 0;
  $('fi-fermer').onclick = () => fermerFiche(true); if (nouveau) ajuster(true); }
/* `recadrer` : quand on ferme la fiche pour elle-même, le plan reprend la place. */
function fermerFiche(recadrer) { const f = $('fiche'); if (f.hidden && !app.fiche) return; f.hidden = true; app.fiche = null; if (recadrer) ajuster(true); }
const tete = (sur, titre) => `<div class="fiche-tete"><div class="min0"><div class="sur">${esc(sur)}</div><h2 class="titre">${esc(titre)}</h2></div>
  <button class="rond fermer" id="fi-fermer" aria-label="Fermer la fiche"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>`;
const champ = (id, lib, val, opt) => `<label class="champ${opt && opt.sans ? ' sans' : ''}"><span>${lib}</span><input id="${id}" value="${escA(val || '')}"${opt && opt.ph ? ` placeholder="${escA(opt.ph)}"` : ''} spellcheck="false"></label>`;
const CHAMPS_CARTOUCHE = [['ca-titre', 'titre', 'Titre'], ['ca-auteur', 'auteur', 'Dessiné par'], ['ca-indice', 'indice', 'Indice'], ['ca-date', 'date', 'Date'], ['ca-echelle', 'echelle', 'Échelle']];
function ficheCartouche() { const c = app.contrat.cartouche;
  const corps = tete('Sur chaque folio', 'Cartouche') + champ('ca-titre', 'Titre', c.titre, { sans: true }) + champ('ca-auteur', 'Dessiné par', c.auteur, { sans: true })
    + `<div class="grille">${champ('ca-indice', 'Indice', c.indice)}${champ('ca-date', 'Date', c.date)}</div>` + champ('ca-echelle', 'Échelle', c.echelle)
    + '<p class="note">Le numéro de folio s’écrit tout seul. Ce cartouche part avec chaque planche enregistrée ou imprimée.</p>';
  ouvrirFiche({ mode: 'cartouche' }, corps, '');
  CHAMPS_CARTOUCHE.forEach(([id, k]) => { $(id).addEventListener('input', e => { c[k] = e.target.value; }); $(id).addEventListener('change', () => { peindre(); rallumer(); sauver(); }); });
}
function ficheColler() {
  const corps = tete('Charger', 'Coller des liaisons')
    + '<p class="note">Une liaison par ligne, colonnes séparées par <b>;</b> <b>,</b> ou une tabulation. Un export du retest est reconnu à ses en-têtes ; sinon l’ordre attendu est :</p>'
    + '<p class="note mono">Équip.1 · Borne · PN · Équip.2 · Borne · PN · Fil · Type · Route · Folio</p>'
    + '<label class="champ"><span>Lignes</span><textarea id="co-txt" placeholder="210SP1;12;;115CD;3;;W-101;DR24;;" spellcheck="false"></textarea></label>';
  const pied = '<button class="btn cuivre" id="co-ok">Charger</button><span class="espace"></span><button class="btn lien" id="co-fichier">…ou choisir un fichier</button>';
  ouvrirFiche({ mode: 'coller' }, corps, pied);
  $('co-ok').onclick = () => { const r = lireTexte($('co-txt').value);
    if (!r.liaisons.length) { dire('Aucune liaison reconnue : vérifie le séparateur et l’ordre des colonnes.', true); return; }
    chargerContrat(r.liaisons, 'collage de ' + r.liaisons.length + ' liaisons', 'Collage'); dire(r.liaisons.length + ' liaisons chargées.'); };
  $('co-fichier').onclick = () => $('fichier').click();
  $('co-txt').focus();
}

/* ---- corriger : toujours la vérité, puis on refait les folios ----------- */
/* Une demi-liaison de renvoi porte le vrai bout dans sa borne : « 733LE 4 ». */
const boutSource = (n, b) => { if (!estRenvoi(n)) return [n, b]; const k = b.indexOf(' '); return k < 0 ? [b, ''] : [b.slice(0, k), b.slice(k + 1)]; };
function cleSource(l) { const [de, bDe] = boutSource(l.de, l.borneDe), [vers, bVers] = boutSource(l.vers, l.borneVers); return [de, bDe, vers, bVers, l.cable].join('\u0001'); }
function sourceDe(l) { if (!app.source || app.source.includes(l)) return l;
  const k = cleSource(l); return app.source.find(s => cleDe(s) === k) || null; }
function renommer(ancien, nouveau) { verite().forEach(l => { if (l.de === ancien) l.de = nouveau; if (l.vers === ancien) l.vers = nouveau; });
  const d = app.contrat.designations.get(ancien); app.contrat.designations.delete(ancien); if (d) app.contrat.designations.set(nouveau, d); }
function designer(nom, d) { if (d) app.contrat.designations.set(nom, d); else app.contrat.designations.delete(nom); }
function supprimerEquipement(nom) { const g = l => l.de !== nom && l.vers !== nom;
  if (app.source) app.source = app.source.filter(g); app.contrat.liaisons = app.contrat.liaisons.filter(g);
  app.contrat.designations.delete(nom); app.choisi = null; app.cible = null; }
function refaireFolios() { const src = app.source, plan = app.plan; app.contrat.liaisons = src; app.source = null; app.nFolios = 0;
  const R = decouperEnFolios(src, app.budget);
  if (R.applique) { app.source = src; app.contrat.liaisons = R.liaisons; app.nFolios = R.nFolios; app.plan = plansDe(R.liaisons).includes(plan) ? plan : '1'; }
  else app.plan = '*'; }
/* Après chaque correction : les folios, le plan, la base, l'enregistrement. */
function apresEdition() { if (app.nFolios) refaireFolios(); redessiner(); sauver(); }

/* ---- les folios automatiques : découper, dérouler, ajuster tout seul --- */
function decouper(budget) { const src = verite(); const R = decouperEnFolios(src, budget);
  if (!R.applique) return 0;
  app.source = src; app.contrat.liaisons = R.liaisons; app.nFolios = R.nFolios; app.budget = budget; app.plan = '1'; redessiner(); ajuster(); return R.nFolios; }
function derouler() { if (!app.nFolios) return; app.contrat.liaisons = app.source; app.source = null; app.nFolios = 0; app.plan = '*'; redessiner(); ajuster(); }
/* Un dessin qui ne tient pas sur une feuille se découpe tout seul : on essaie
   plusieurs budgets, du plus généreux au plus serré, et on garde le premier
   qui rentre — sinon le meilleur format obtenu. */
function ajusterFolios() { if (app.nFolios) return 0;
  const f = formatDuDessin(app.dessin); if (!f || f.tientSurUnePage) return 0;
  const src = app.contrat.liaisons; let meilleur = null;
  for (const budget of [16, 12, 9, 6]) { if (app.nFolios) derouler(); app.contrat.liaisons = src;
    const n = decouper(budget); if (!n) break;
    const g = formatDuDessin(app.dessin); if (!g) break;
    const ecart = Math.abs(Math.log(g.ratio / 1.41));
    if (!meilleur || ecart < meilleur.ecart) meilleur = { budget, n, ecart };
    if (g.tientSurUnePage) break; }
  if (!meilleur) { derouler(); return 0; }
  const g = formatDuDessin(app.dessin);
  if (!g || Math.abs(Math.log(g.ratio / 1.41)) > meilleur.ecart + 1e-9) { derouler(); app.contrat.liaisons = src; decouper(meilleur.budget); }
  dire('Trop grand pour une feuille : découpé en ' + meilleur.n + ' folios.');
  return meilleur.n; }

/* ---- historique et enregistrement ------------------------------------- */
function histPush(quoi) { app.hist.push({ quoi, liaisons: app.contrat.liaisons.map(l => ({ ...l })), source: app.source ? app.source.map(l => ({ ...l })) : null,
  nFolios: app.nFolios, budget: app.budget, plan: app.plan, nom: app.nom, designations: new Map(app.contrat.designations) });
  if (app.hist.length > 40) app.hist.shift(); synchroniserHistorique(); }
function annuler() { const p = app.hist.pop(); if (!p) return null;
  app.contrat.liaisons = p.liaisons; app.source = p.source; app.nFolios = p.nFolios; app.budget = p.budget || 16; app.plan = p.plan; app.nom = p.nom || ''; app.contrat.designations = p.designations;
  app.choisi = null; app.cible = null; app.actif = null; app.base.enSaisie = false; fermerFiche();
  if (document.activeElement && $('ba-tab').contains(document.activeElement)) document.activeElement.blur();
  redessiner(); ajuster(true); sauver(); return p.quoi; }
let sauveT = null;
function sauver() { clearTimeout(sauveT); sauveT = setTimeout(() => { try {
    localStorage.setItem(CLE_CONTRAT, JSON.stringify({ liaisons: app.contrat.liaisons, source: app.source, nFolios: app.nFolios, budget: app.budget, plan: app.plan, nom: app.nom,
      designations: [...app.contrat.designations], cartouche: app.contrat.cartouche, t: Date.now() }));
    heureSauve(Date.now()); } catch (_) { heureSauve(null); } }, 400); }
function heureSauve(t) { const el = $('ctx-sauve');
  if (!t) { el.textContent = 'non enregistré'; el.classList.add('ko'); el.title = 'Le navigateur refuse d’enregistrer (navigation privée ?). Le travail tient tant que l’onglet est ouvert.'; return; }
  const d = new Date(t); el.textContent = 'enregistré ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); el.classList.remove('ko');
  el.title = 'Gardé dans ce navigateur. Rien n’est parti sur le réseau.'; }
function relire() { try { const j = localStorage.getItem(CLE_CONTRAT); if (!j) return false; const o = JSON.parse(j);
    if (!o || !o.liaisons || !o.liaisons.length) return false;
    app.contrat.liaisons = o.liaisons.map(liaison); app.source = o.source ? o.source.map(liaison) : null; app.nFolios = o.nFolios || 0; app.budget = o.budget || 16; app.plan = o.plan || '*'; app.nom = o.nom || '';
    app.contrat.designations = new Map(o.designations || []); if (o.cartouche) Object.assign(app.contrat.cartouche, o.cartouche);
    const P = plans(); if (app.plan === '*' && P.length > 1) app.plan = P[0];
    redessiner(); ajuster(); heureSauve(o.t || Date.now()); return true; } catch (_) { return false; } }

/* ---- charger un contrat ----------------------------------------------- */
function chargerContrat(liaisons, quoi, nom) { histPush(quoi || 'chargement d’un contrat');
  app.contrat.liaisons = liaisons.map(liaison); app.source = null; app.nFolios = 0; app.choisi = null; app.cible = null; app.actif = null; app.nom = nom || app.nom;
  app.base.filtre = ''; app.base.tri = null; app.base.enSaisie = false;
  if (document.activeElement && $('ba-tab').contains(document.activeElement)) document.activeElement.blur();
  const P = plans(); app.plan = P.length > 1 ? P[0] : '*';
  fermerFiche(); fermerMenu(); $('q').value = '';
  redessiner(); ajuster(); if (P.length <= 1) ajusterFolios(); sauver(); }
async function ouvrirFichier(fichier) { if (!fichier) return;
  try { dire('Lecture de « ' + fichier.name + ' », puis dessin…'); const r = await lireFichier(fichier);
    if (!r.liaisons.length) { dire('« ' + fichier.name + ' » est lu, mais aucune liaison n’est reconnue — vérifie les colonnes.', true); return; }
    chargerContrat(r.liaisons, 'ouverture de ' + fichier.name, fichier.name);
    dire(r.liaisons.length + ' liaisons' + (r.format === 'retest' ? ' — format retest, en-têtes ligne ' + r.entete : '') + (plans().length > 1 ? ' · ' + plans().length + ' folios' : '') + '.');
  } catch (e) { dire('Erreur : ' + (e && e.message || e), true); } }
function lierDepot() { let n = 0;
  window.addEventListener('dragenter', e => { e.preventDefault(); n++; document.body.classList.add('depot-actif'); });
  window.addEventListener('dragover', e => { e.preventDefault(); });
  window.addEventListener('dragleave', e => { e.preventDefault(); if (--n <= 0) { n = 0; document.body.classList.remove('depot-actif'); } });
  window.addEventListener('drop', e => { e.preventDefault(); n = 0; document.body.classList.remove('depot-actif');
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) ouvrirFichier(f); }); }

/* ---- sortir le dessin : SVG, PNG, impression -------------------------- */
function nomFolio() { const base = (app.nom || 'atelier-schema').replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_');
  return base + (app.plan !== '*' ? '-folio-' + String(app.plan).replace(/[^\w.-]+/g, '_') : ''); }
function telecharger(blob, nom) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nom;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
function svgDuFolio() { return app.dessin ? svgAutonome(app.dessin, app.contrat.cartouche, folioCourant(), n => app.contrat.designations.get(n) || '') : null; }
function exporterSVG() { const S = svgDuFolio(); if (!S) return; telecharger(new Blob([S.txt], { type: 'image/svg+xml;charset=utf-8' }), nomFolio() + '.svg'); dire('Folio enregistré en SVG.'); }
function exporterPNG() { const S = svgDuFolio(); if (!S) return;
  const k = Math.max(1, Math.min(3, 12e6 / Math.max(1, S.w * S.h))); const img = new Image();
  img.onload = () => { const cv = document.createElement('canvas'); cv.width = Math.round(S.w * k); cv.height = Math.round(S.h * k);
    const g = cv.getContext('2d'); g.fillStyle = '#fbfbf7'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
    cv.toBlob(b => { if (b) { telecharger(b, nomFolio() + '.png'); dire('Folio enregistré en PNG.'); } }, 'image/png'); };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(S.txt); }
function imprimer() { const S = svgDuFolio(); if (!S) return;
  $('printroot').innerHTML = S.txt.replace(/^<\?xml[^>]*\?>\s*/, ''); window.print(); }

/* ---- ce que le haut affiche ------------------------------------------- */
function synchroniserContexte() { const n = app.contrat.liaisons.length;
  $('ctx-nom').textContent = n ? (app.nom || 'Sans nom') : 'Aucun contrat';
  const P = plans();
  $('ctx-txt').textContent = n ? `${n} liaison${n > 1 ? 's' : ''} · ${reperesDe(verite()).filter(r => !estRenvoi(r)).length} repères` + (P.length > 1 ? ` · ${P.length} folios` : '') : ''; }
function synchroniserHistorique() { const b = $('btnUndo'); b.hidden = !app.hist.length;
  if (app.hist.length) b.title = 'Annuler : ' + app.hist[app.hist.length - 1].quoi + ' (Ctrl+Z)'; }
function synchroniser() { synchroniserContexte(); synchroniserFolios(); synchroniserHistorique(); rafraichirBase(); }
let toastT = null;
function dire(msg, erreur) { const t = $('toast'); t.textContent = msg; t.classList.toggle('erreur', !!erreur); t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), erreur ? 6000 : 2800); }
function ouvrirMenu() { $('menu').hidden = false; $('btnMenu').setAttribute('aria-expanded', 'true'); const b = $('menu').querySelector('button'); if (b) b.focus(); }
function fermerMenu() { $('menu').hidden = true; $('btnMenu').setAttribute('aria-expanded', 'false'); }

/* ---- tout relier -------------------------------------------------------- */
function lierPanneau() {
  const o = (id, fn) => { const e = $(id); if (e) e.onclick = fn; };
  const choisirFichier = () => $('fichier').click();
  const exemple = () => chargerContrat(contratEssai(), 'contrat d’exemple', 'Contrat d’exemple');
  $('fichier').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) ouvrirFichier(f); e.target.value = ''; });
  o('vd-ouvrir', choisirFichier); o('vd-coller', ficheColler); o('vd-exemple', exemple);
  o('btnBase', basculerBase);
  o('btnMenu', e => { e.stopPropagation(); $('menu').hidden ? ouvrirMenu() : fermerMenu(); });
  const actions = { ouvrir: choisirFichier, coller: ficheColler, exemple, cartouche: ficheCartouche, svg: exporterSVG, png: exporterPNG, imprimer,
    vider: () => { if (!confirm('Effacer tout le contrat ?')) return; histPush('tout effacer'); app.contrat.liaisons = []; app.source = null; app.nFolios = 0; app.plan = '*'; app.nom = ''; app.cible = null; app.choisi = null;
      fermerFiche(); fermerBase(); redessiner(); ajuster(); sauver(); } };
  $('menu').addEventListener('click', e => { const b = e.target.closest('button[data-act]'); if (!b) return; fermerMenu(); actions[b.dataset.act](); });
  document.addEventListener('click', e => { if (!e.target.closest('#menuBoite')) fermerMenu(); });
  o('btnUndo', () => { const q = annuler(); if (q) dire('Annulé : ' + q + '.'); });
  o('fo-prev', () => allerAuFolio(-1)); o('fo-next', () => allerAuFolio(+1));
  $('fo-strip').addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) allerAuPlan(c.dataset.plan); });
  o('zin', () => zoomer(1.25)); o('zout', () => zoomer(1 / 1.25)); o('zfit', () => ajuster(true)); o('zlbl', () => ajuster(true));
  lierRecherche(); lierDepot(); lierBase();
  window.addEventListener('keydown', e => {
    const dansChamp = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '');
    if (e.key === 'Escape') { if (!$('menu').hidden) { fermerMenu(); $('btnMenu').focus(); } else if (!$('q-liste').hidden || $('haut').classList.contains('cherche')) { fermerRecherche(); $('q').blur(); }
      else if (dansChamp) e.target.blur();   // dans un champ, Échap ne fait que le quitter
      else if (app.fiche) fermerFiche(true); else if (app.cible) deselectionner(); else fermerBase(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !dansChamp) { e.preventDefault(); const q = annuler(); if (q) dire('Annulé : ' + q + '.'); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') { e.preventDefault(); imprimer(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); choisirFichier(); return; }
    if (dansChamp || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '/' || e.key === 'f') { e.preventDefault(); $('q').focus(); $('q').select(); }
    else if (e.key === 'b') basculerBase();
    else if (e.key === 'ArrowLeft') allerAuFolio(-1); else if (e.key === 'ArrowRight') allerAuFolio(+1);
    else if (e.key === '+' || e.key === '=') zoomer(1.25); else if (e.key === '-') zoomer(1 / 1.25); else if (e.key === '0') ajuster(true); });
  let rT; window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { if (telephone()) ajuster(); else appliquerVue(); }, 160); });
  window.addEventListener('orientationchange', () => setTimeout(() => ajuster(), 300));
}
