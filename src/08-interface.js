/* ===========================================================================
   08 — L'INTERFACE
   Le plan est l'écran. Tout ce qui s'affiche se déduit de `app` par
   `synchroniser()` ; aucun état ne vit dans le DOM.

   app.contrat      le contrat tel qu'il est édité (liaisons, désignations, cartouche)
   app.source       les liaisons d'origine quand le contrat est découpé en folios
                    tout seul ; `verite()` rend toujours ce qu'on édite
   app.plan         '*' = tout d'un tenant, sinon le folio affiché
   app.dessin       le dessin du folio affiché (placement + routage)
   La fiche est le seul document : un équipement, un fil, la table des
   liaisons, le cartouche, un collage — jamais deux à la fois.
   =========================================================================== */
'use strict';

const app = {
  contrat: nouveauContrat(), source: null, nFolios: 0, budget: 16, plan: '*', nom: '',
  vue: { s: 1, tx: 0, ty: 0 }, choisi: null, dessin: null, hist: [], fiche: null
};
const $ = id => document.getElementById(id);
const CLE_CONTRAT = 'atelier.contrat.v2';
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
/* Le vide que laissent les instruments : la feuille se cadre dedans. */
function marges() { const tel = telephone(), fiche = $('fiche').hidden ? null : $('fiche');
  return { haut: tel ? 60 : 68, bas: (tel && fiche) ? fiche.offsetHeight + 12 : (tel ? 64 : 72),
           gauche: tel ? 12 : 28, droite: (tel ? 12 : 28) + ((fiche && !tel) ? fiche.offsetWidth + 24 : 0) }; }
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
/* Ce qui est choisi reste allumé après un survol ou un redessin. */
function rallumer() { const f = app.fiche;
  if (f && f.mode === 'equip' && app.dessin && app.dessin.compDe.has(f.nom)) allumerBloc(f.nom);
  else if (f && f.mode === 'fil' && app.dessin) { const w = filDe(f.l); if (w) allumerFil(w); else eteindre(); }
  else eteindre(); }
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
  const f = filSous(w); if (f) choisirFil(f); else if (app.fiche) fermerFiche(); }
function choisirBloc(c) { app.choisi = c.name; peindre(); ficheEquipement(c.name); allumerBloc(c.name); }
function choisirFil(f) { const l = liaisonsDuPlan()[f.i]; if (!l) return;
  if (app.choisi) { app.choisi = null; peindre(); } ficheFil(sourceDe(l) || l); allumerFil(f); }

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
      <span class="genre">${c.type === 'fil' ? 'fil' : 'rep.'}</span><span class="nom">${esc(c.nom)}</span><span class="des">${esc(c.des)}</span>${c.n ? `<span class="cpt">${c.n} fil${c.n > 1 ? 's' : ''}</span>` : ''}</button>`).join('')
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
  // trouvé : le champ se vide, le résultat est dans la fiche
  const trouve = c => { q.value = ''; fermerRecherche(); q.blur(); aller(c); };
  box.addEventListener('pointerdown', e => e.preventDefault());   // le champ garde le focus
  box.addEventListener('click', e => { const b = e.target.closest('.q-item'); if (!b) return; const c = qCands[+b.dataset.i]; if (c) trouve(c); });
  q.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== q) fermerRecherche(); }, 120));
  // sur téléphone le champ est replié : on l'ouvre d'abord, puis on lui donne le focus
  $('recherche').addEventListener('click', e => { if (e.target.closest('.q-liste')) return; $('haut').classList.add('cherche'); q.focus(); }); }

/* ---- la fiche ----------------------------------------------------------- */
function ouvrirFiche(mode, corps, pied, large) { const f = $('fiche');
  f.classList.toggle('large', !!large); $('fiche-corps').innerHTML = corps; const p = $('fiche-pied'); p.innerHTML = pied || ''; p.hidden = !pied;
  const nouveau = f.hidden || !app.fiche || app.fiche.mode !== mode.mode;
  f.hidden = false; if (nouveau) { f.classList.remove('entre'); void f.offsetWidth; f.classList.add('entre'); }
  app.fiche = mode; $('fiche-corps').scrollTop = 0;
  $('fi-fermer').onclick = fermerFiche; }
function fermerFiche() { const f = $('fiche'); if (f.hidden && !app.fiche) return; f.hidden = true; app.fiche = null;
  if (app.choisi) { app.choisi = null; peindre(); } eteindre(); }
const tete = (sur, titre, editable) => `<div class="fiche-tete"><div class="min0"><div class="sur">${esc(sur)}</div>${editable
  ? `<input class="titre" id="${editable}" value="${escA(titre)}" aria-label="${escA(sur)}" title="Se modifie ici" spellcheck="false" placeholder="—">` : `<h2 class="titre">${esc(titre)}</h2>`}</div>
  <button class="rond fermer" id="fi-fermer" aria-label="Fermer la fiche"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>`;
const champ = (id, lib, val, opt) => `<label class="champ${opt && opt.sans ? ' sans' : ''}"><span>${lib}</span><input id="${id}" value="${escA(val || '')}"${opt && opt.ph ? ` placeholder="${escA(opt.ph)}"` : ''} spellcheck="false"></label>`;
const natureDe = nom => { const q = lireRepere(nom); return (q && q.num && CODES[q.code]) ? CODES[q.code].nom : 'équipement'; };

function raccordementsDe(nom) { const out = [];
  verite().forEach((l, i) => { if (estRenvoi(l.de) || estRenvoi(l.vers)) return;
    if (l.de === nom) out.push({ i, l, borne: l.borneDe || '·', dest: l.vers, dt: l.borneVers, pn: l.pnDe });
    else if (l.vers === nom) out.push({ i, l, borne: l.borneVers || '·', dest: l.de, dt: l.borneDe, pn: l.pnVers }); });
  return out.sort((a, b) => { const na = parseFloat(a.borne), nb = parseFloat(b.borne); return (!isNaN(na) && !isNaN(nb)) ? na - nb : String(a.borne).localeCompare(String(b.borne)); }); }
function ficheEquipement(nom) {
  const cn = raccordementsDe(nom), pn = [...new Set(cn.map(x => x.pn).filter(Boolean))], multi = plans().length > 1;
  const ailleurs = d => { if (!multi || app.plan === '*') return ''; const ou = plansDuRepere(d); return (ou.length && !ou.includes(app.plan)) ? `<span class="f" title="Sur le folio ${escA(ou[0])}">f. ${esc(ou[0])}</span>` : ''; };
  const lignes = cn.map(x => `<li tabindex="0" role="button" data-i="${x.i}" title="Voir ce fil"><span class="borne">${esc(x.borne)}</span><span class="fleche">→</span>
      <button class="dest" data-aller="${escA(x.dest)}" title="Aller à ${escA(x.dest)}">${esc(x.dest)}${x.dt ? `<span class="b">:${esc(x.dt)}</span>` : ''}</button>
      ${ailleurs(x.dest)}<span class="meta">${esc([x.l.cable, x.l.type].filter(Boolean).join(' · '))}</span></li>`).join('');
  const corps = tete(natureDe(nom), nom, 'ed-rep')
    + champ('ed-des', 'Désignation', app.contrat.designations.get(nom), { ph: 'Ce que c’est, écrit sous le repère', sans: true })
    + (pn.length ? `<div class="info"><span>Connecteur</span><b class="mono">${esc(pn.join(' · '))}</b></div>` : '')
    + `<div class="sous-titre">Raccordements <span class="compte">${cn.length}</span></div><ul class="racc" id="racc">${lignes || '<li class="rien">Aucun raccordement.</li>'}</ul>`;
  const pied = `<button class="btn cuivre" id="ed-ok" hidden>Enregistrer</button><button class="btn papier" id="ed-add">+ Liaison</button><span class="espace"></span><button class="btn lien danger" id="ed-del">Supprimer</button>`;
  ouvrirFiche({ mode: 'equip', nom }, corps, pied);
  const rep = $('ed-rep'), des = $('ed-des'), ok = $('ed-ok');
  const modifie = () => { ok.hidden = rep.value.trim() === nom && des.value.trim() === (app.contrat.designations.get(nom) || ''); };
  [rep, des].forEach(el => { el.addEventListener('input', modifie); el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ok.click(); } }); });
  ok.onclick = () => { const nr = rep.value.trim() || nom, nd = des.value.trim(); if (ok.hidden) return;
    histPush('modification de ' + nom); if (nr !== nom) renommer(nom, nr); designer(nr, nd); app.choisi = nr; apresEdition(); ficheEquipement(nr); rallumer(); dire('Enregistré.'); };
  $('ed-add').onclick = () => ficheFil(liaison({ de: nom }), true);
  $('ed-del').onclick = () => { if (!confirm('Supprimer « ' + nom + ' » et ses ' + cn.length + ' liaison(s) ?')) return;
    histPush('suppression de ' + nom); supprimerEquipement(nom); apresEdition(); dire(nom + ' supprimé.'); };
  $('racc').addEventListener('click', e => { const a = e.target.closest('.dest'); if (a) { aller({ type: 'repere', nom: a.dataset.aller }); return; }
    const li = e.target.closest('li[data-i]'); if (li) { const l = verite()[+li.dataset.i]; if (l) { ficheFil(l); const w = filDe(l); if (w) { allumerFil(w); viserFil(w); } } } });
  $('racc').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('li[data-i]')) e.target.click(); });
}
function ficheFil(l, neuve) {
  const corps = tete(neuve ? 'Nouvelle liaison' : 'Fil', l.cable || (neuve ? '' : '—'), 'fl-cable')
    + `<div class="grille bornes">${champ('fl-de', 'De', l.de, { ph: 'repère' })}${champ('fl-bde', 'Borne', l.borneDe)}</div>`
    + `<div class="grille bornes">${champ('fl-vers', 'Vers', l.vers, { ph: 'repère' })}${champ('fl-bvers', 'Borne', l.borneVers)}</div>`
    + `<div class="grille">${champ('fl-type', 'Type / section', l.type)}${champ('fl-route', 'Route', l.route)}</div>`
    + `<div class="grille">${champ('fl-pnde', 'Connecteur départ', l.pnDe)}${champ('fl-pnvers', 'Connecteur arrivée', l.pnVers)}</div>`
    + (!app.nFolios && plans().length ? champ('fl-plan', 'Folio', l.plan) : '')
    + (neuve ? '' : `<div class="aller">Aller à ${[l.de, l.vers].filter(n => n && !estRenvoi(n)).map(n => `<button data-aller="${escA(n)}">${esc(n)}</button>`).join('')}</div>`);
  const pied = `<button class="btn cuivre" id="fl-ok">${neuve ? 'Ajouter' : 'Enregistrer'}</button><span class="espace"></span>${neuve ? '' : '<button class="btn lien danger" id="fl-del">Supprimer</button>'}`;
  ouvrirFiche({ mode: neuve ? 'neuve' : 'fil', l }, corps, pied);
  const v = id => ($(id) ? $(id).value.trim() : '');
  const lire = () => ({ cable: v('fl-cable'), de: v('fl-de'), borneDe: v('fl-bde'), vers: v('fl-vers'), borneVers: v('fl-bvers'), type: v('fl-type'), route: v('fl-route'), pnDe: v('fl-pnde'), pnVers: v('fl-pnvers'), plan: $('fl-plan') ? v('fl-plan') : l.plan });
  $('fl-ok').onclick = () => { const ch = lire();
    if (neuve) { if (!ch.de || !ch.vers) { dire('Il faut un repère à chaque bout.', true); return; }
      if (!ch.plan && !app.nFolios && app.plan !== '*') ch.plan = app.plan;
      histPush('ajout d’une liaison'); const n = liaison(ch); verite().push(n); apresEdition(); ficheFil(n); rallumer(); dire('Liaison ajoutée.'); return; }
    histPush('modification d’une liaison'); Object.assign(l, ch); apresEdition(); ficheFil(l); rallumer(); dire('Enregistré.'); };
  $('fiche-corps').querySelectorAll('input').forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('fl-ok').click(); } }));
  if (!neuve) { $('fl-del').onclick = () => { histPush('suppression d’une liaison'); const V = verite(), i = V.indexOf(l); if (i >= 0) V.splice(i, 1); fermerFiche(); apresEdition(); dire('Liaison supprimée.'); };
    $('fiche-corps').querySelectorAll('.aller button').forEach(b => b.onclick = () => aller({ type: 'repere', nom: b.dataset.aller })); }
  if (neuve) $('fl-vers').focus();
}
function ficheTable(filtre) { const V = verite(), CAP = 300, f = (filtre || '').toLowerCase();
  const vues = V.map((l, i) => [l, i]).filter(([l]) => !f || [l.de, l.vers, l.cable].some(x => x.toLowerCase().includes(f)));
  const cell = (i, k, v, cls) => `<td${cls ? ` class="${cls}"` : ''}><input data-i="${i}" data-f="${k}" value="${escA(v)}" aria-label="${k}" spellcheck="false"></td>`;
  const lignes = vues.slice(0, CAP).map(([l, i]) => `<tr>${cell(i, 'de', l.de)}${cell(i, 'borneDe', l.borneDe, 'n')}${cell(i, 'vers', l.vers)}${cell(i, 'borneVers', l.borneVers, 'n')}${cell(i, 'cable', l.cable)}<td class="x"><button data-x="${i}" aria-label="Supprimer la liaison">×</button></td></tr>`).join('')
    + (vues.length > CAP ? `<tr class="reste"><td colspan="6">… et ${vues.length - CAP} autres — affine le filtre.</td></tr>` : '');
  const corps = tete('Contrat', 'Toutes les liaisons')
    + `<div class="filtre"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="tb-filtre" value="${escA(filtre || '')}" placeholder="Filtrer par repère ou n° de fil" aria-label="Filtrer"></div>`
    + `<table class="tab" id="tb"><thead><tr><th>De</th><th>B.</th><th>Vers</th><th>B.</th><th>Fil</th><th></th></tr></thead><tbody>${lignes || '<tr class="reste"><td colspan="6">Aucune liaison.</td></tr>'}</tbody></table>`;
  const pied = `<button class="btn papier" id="tb-add">+ Liaison</button><span class="espace"></span><span class="note">${V.length} liaison${V.length > 1 ? 's' : ''}</span>`;
  ouvrirFiche({ mode: 'table' }, corps, pied, true);
  const fi = $('tb-filtre'); let fT; fi.addEventListener('input', () => { clearTimeout(fT); fT = setTimeout(() => { const pos = fi.selectionStart; ficheTable(fi.value); $('tb-filtre').focus(); $('tb-filtre').setSelectionRange(pos, pos); }, 200); });
  if (filtre !== undefined) { fi.focus(); }
  const t = $('tb');
  t.addEventListener('focusin', e => { if (e.target.dataset.i != null) e.target.dataset.avant = e.target.value; });
  t.addEventListener('change', e => { const i = e.target.dataset.i; if (i == null) return; const l = V[+i]; if (!l) return;
    histPush('modification d’une liaison'); l[e.target.dataset.f] = e.target.value.trim(); apresEdition(); });
  t.addEventListener('click', e => { const b = e.target.closest('button[data-x]'); if (!b) return;
    histPush('suppression d’une liaison'); V.splice(+b.dataset.x, 1); apresEdition(); ficheTable(fi.value); });
  $('tb-add').onclick = () => ficheFil(liaison({}), true);
}
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
/* Après une correction, la fiche se remet au niveau de ce qu'elle montre. */
function rafraichirFiche() { const f = app.fiche; if (!f) return;
  if (f.mode === 'equip') { if (verite().some(l => l.de === f.nom || l.vers === f.nom)) ficheEquipement(f.nom); else fermerFiche(); }
  else if (f.mode === 'table') ficheTable($('tb-filtre') ? $('tb-filtre').value : ''); }

/* ---- corriger : toujours la vérité, puis on refait les folios ----------- */
function sourceDe(l) { if (!app.source || app.source.includes(l)) return l;
  const bout = (n, b) => { if (!estRenvoi(n)) return [n, b]; const k = b.indexOf(' '); return k < 0 ? [b, ''] : [b.slice(0, k), b.slice(k + 1)]; };
  const [de, bDe] = bout(l.de, l.borneDe), [vers, bVers] = bout(l.vers, l.borneVers);
  return app.source.find(s => s.de === de && s.borneDe === bDe && s.vers === vers && s.borneVers === bVers && s.cable === l.cable) || null; }
function renommer(ancien, nouveau) { verite().forEach(l => { if (l.de === ancien) l.de = nouveau; if (l.vers === ancien) l.vers = nouveau; });
  const d = app.contrat.designations.get(ancien); app.contrat.designations.delete(ancien); if (d) app.contrat.designations.set(nouveau, d); }
function designer(nom, d) { if (d) app.contrat.designations.set(nom, d); else app.contrat.designations.delete(nom); }
function supprimerEquipement(nom) { const g = l => l.de !== nom && l.vers !== nom;
  if (app.source) app.source = app.source.filter(g); app.contrat.liaisons = app.contrat.liaisons.filter(g);
  app.contrat.designations.delete(nom); app.choisi = null; fermerFiche(); }
function refaireFolios() { const src = app.source, plan = app.plan; app.contrat.liaisons = src; app.source = null; app.nFolios = 0;
  const R = decouperEnFolios(src, app.budget);
  if (R.applique) { app.source = src; app.contrat.liaisons = R.liaisons; app.nFolios = R.nFolios; app.plan = plansDe(R.liaisons).includes(plan) ? plan : '1'; }
  else app.plan = '*'; }
function apresEdition() { if (app.nFolios) refaireFolios(); redessiner(); rafraichirFiche(); sauver(); }

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
  app.contrat.liaisons = p.liaisons; app.source = p.source; app.nFolios = p.nFolios; app.budget = p.budget || 16; app.plan = p.plan; app.nom = p.nom || ''; app.contrat.designations = p.designations; app.choisi = null;
  fermerFiche(); redessiner(); ajuster(true); sauver(); return p.quoi; }
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
  app.contrat.liaisons = liaisons.map(liaison); app.source = null; app.nFolios = 0; app.choisi = null; app.nom = nom || app.nom;
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
function synchroniser() { synchroniserContexte(); synchroniserFolios(); synchroniserHistorique(); }
let toastT = null;
function dire(msg, erreur) { const t = $('toast'); t.textContent = msg; t.classList.toggle('erreur', !!erreur); t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), erreur ? 6000 : 2800); }
function ouvrirMenu() { $('menu').hidden = false; $('btnMenu').setAttribute('aria-expanded', 'true'); const b = $('menu').querySelector('button'); if (b) b.focus(); }
function fermerMenu() { $('menu').hidden = true; $('btnMenu').setAttribute('aria-expanded', 'false'); }

/* ---- tout relier -------------------------------------------------------- */
function lierPanneau() {
  const o = (id, fn) => { const e = $(id); if (e) e.onclick = fn; };
  const choisirFichier = () => $('fichier').click();
  $('fichier').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) ouvrirFichier(f); e.target.value = ''; });
  o('btnOuvrir', choisirFichier); o('vd-ouvrir', choisirFichier); o('vd-coller', ficheColler); o('vd-exemple', () => chargerContrat(contratEssai(), 'contrat d’exemple', 'Contrat d’exemple'));
  o('dossier', () => { if (app.fiche && app.fiche.mode === 'table') fermerFiche(); else if (app.contrat.liaisons.length) ficheTable(''); });
  o('btnMenu', e => { e.stopPropagation(); $('menu').hidden ? ouvrirMenu() : fermerMenu(); });
  const actions = { ouvrir: choisirFichier, coller: ficheColler, exemple: () => chargerContrat(contratEssai(), 'contrat d’exemple', 'Contrat d’exemple'),
    table: () => ficheTable(''), cartouche: ficheCartouche, svg: exporterSVG, png: exporterPNG, imprimer,
    vider: () => { if (!confirm('Effacer tout le contrat ?')) return; histPush('tout effacer'); app.contrat.liaisons = []; app.source = null; app.nFolios = 0; app.plan = '*'; app.nom = ''; fermerFiche(); redessiner(); ajuster(); sauver(); } };
  $('menu').addEventListener('click', e => { const b = e.target.closest('button[data-act]'); if (!b) return; fermerMenu(); actions[b.dataset.act](); });
  document.addEventListener('click', e => { if (!e.target.closest('#menuBoite')) fermerMenu(); });
  o('btnUndo', () => { const q = annuler(); if (q) dire('Annulé : ' + q + '.'); });
  o('fo-prev', () => allerAuFolio(-1)); o('fo-next', () => allerAuFolio(+1));
  $('fo-strip').addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) allerAuPlan(c.dataset.plan); });
  o('zin', () => zoomer(1.25)); o('zout', () => zoomer(1 / 1.25)); o('zfit', () => ajuster(true)); o('zlbl', () => ajuster(true));
  lierRecherche(); lierDepot();
  window.addEventListener('keydown', e => {
    const dansChamp = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '');
    if (e.key === 'Escape') { if (!$('menu').hidden) { fermerMenu(); $('btnMenu').focus(); } else if (!$('q-liste').hidden || $('haut').classList.contains('cherche')) { fermerRecherche(); $('q').blur(); } else fermerFiche(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !dansChamp) { e.preventDefault(); const q = annuler(); if (q) dire('Annulé : ' + q + '.'); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') { e.preventDefault(); imprimer(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); choisirFichier(); return; }
    if (dansChamp || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '/' || e.key === 'f') { e.preventDefault(); $('q').focus(); $('q').select(); }
    else if (e.key === 'ArrowLeft') allerAuFolio(-1); else if (e.key === 'ArrowRight') allerAuFolio(+1);
    else if (e.key === '+' || e.key === '=') zoomer(1.25); else if (e.key === '-') zoomer(1 / 1.25); else if (e.key === '0') ajuster(true); });
  let rT; window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { if (telephone()) ajuster(); else appliquerVue(); }, 160); });
  window.addEventListener('orientationchange', () => setTimeout(() => ajuster(), 300));
}
