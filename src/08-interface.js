/* ===========================================================================
   08 — L'INTERFACE
   Une chose à la fois. Le panneau montre une seule vue — Matériel, Compléter,
   Réglages — et la planche montre le folio. Tout ce que l'écran affiche se
   déduit de `app` par `synchroniser()` ; aucun état ne vit dans le DOM.

   app.contrat      le contrat tel qu'il est édité (liaisons, désignations, cartouche)
   app.source       les liaisons d'origine quand le contrat est découpé en folios
   app.plan         '*' = tout, sinon le plan / folio affiché
   app.dessin       le dessin du plan affiché (placement + routage)
   =========================================================================== */
'use strict';

const app = {
  contrat: nouveauContrat(), source: null, nFolios: 0, plan: '*',
  vue: { s: 1, tx: 0, ty: 0 }, choisi: null, dessin: null, filtre: '', hist: []
};
const $ = id => document.getElementById(id);
const CLE_CONTRAT = 'atelier.contrat.v2';

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
function folioCourant() { const plans = plansDe(app.contrat.liaisons);
  return (app.plan !== '*' && plans.length > 1) ? (app.plan + ' / ' + plans.length) : '1 / 1'; }
function peindre() {
  const svg = $('svg'), notice = $('notice');
  if (!app.dessin) { svg.innerHTML = ''; notice.style.display = 'flex'; return; }
  notice.style.display = 'none';
  const designation = n => app.contrat.designations.get(n) || '';
  svg.innerHTML = styleDessin() + `<g id="scene" transform="translate(${app.vue.tx},${app.vue.ty}) scale(${app.vue.s})">`
    + sceneSvg(app.dessin, app.contrat.cartouche, folioCourant(), designation, app.choisi) + '</g>';
}
function redessiner() { calculer(); peindre(); synchroniser(); }

/* ---- la vue : zoom, cadrage ------------------------------------------- */
const cadreSvg = () => $('svg').getBoundingClientRect();
function appliquerVue() { const sc = $('scene'); if (sc) sc.setAttribute('transform', `translate(${app.vue.tx},${app.vue.ty}) scale(${app.vue.s})`);
  $('zlbl').textContent = Math.round(app.vue.s * 100) + ' %'; }
function ajuster() {
  if (!app.dessin) { app.vue = { s: 1, tx: 40, ty: 40 }; appliquerVue(); return; }
  const bb = app.dessin.bbox, r = cadreSvg();
  app.vue.s = Math.max(.12, Math.min(6, Math.min(r.width / bb.w, r.height / bb.h) * 0.92));
  app.vue.tx = (r.width - bb.w * app.vue.s) / 2 - bb.x * app.vue.s;
  app.vue.ty = (r.height - bb.h * app.vue.s) / 2 - bb.y * app.vue.s; appliquerVue();
}
function zoomer(k, mx, my) { const r = cadreSvg(); if (mx == null) { mx = r.width / 2; my = r.height / 2; }
  const wx = (mx - app.vue.tx) / app.vue.s, wy = (my - app.vue.ty) / app.vue.s;
  const ns = Math.max(.12, Math.min(6, app.vue.s * k));
  app.vue.tx = mx - wx * ns; app.vue.ty = my - wy * ns; app.vue.s = ns; appliquerVue(); }
const versMonde = (cx, cy) => { const r = cadreSvg(); return { x: (cx - r.left - app.vue.tx) / app.vue.s, y: (cy - r.top - app.vue.ty) / app.vue.s }; };
function blocSous(w) { if (!app.dessin) return null; const cs = app.dessin.comps;
  for (let i = cs.length - 1; i >= 0; i--) { const c = cs[i]; if (w.x >= c.x - 5 && w.x <= c.x + c.w + 5 && w.y >= c.y - 5 && w.y <= c.y + c.h + 5) return c; } return null; }
function filSous(w) { if (!app.dessin) return null; const tol = Math.max(4, 6 / app.vue.s); let best = null, bd = tol;
  const d = (px, py, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy; let t = L2 ? ((px - a.x) * dx + (py - a.y) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy)); };
  for (const f of app.dessin.fils) for (let i = 0; i < f.pts.length - 1; i++) { const dd = d(w.x, w.y, f.pts[i], f.pts[i + 1]); if (dd < bd) { bd = dd; best = f; } }
  return best; }
/* Aller voir un repère : on centre dessus et on l'allume. */
function viser(nom) { if (!app.dessin) return;
  const c = app.dessin.compDe.get(nom); const st = $('xp-stat');
  if (!c) { st.textContent = '« ' + nom + ' » n’est pas sur ce folio.'; return; }
  const r = cadreSvg(); app.vue.s = Math.max(app.vue.s, 0.9);
  app.vue.tx = r.width / 2 - (c.x + c.w / 2) * app.vue.s; app.vue.ty = r.height / 2 - (c.y + c.h / 2) * app.vue.s;
  appliquerVue(); allumerBloc(nom);
  st.textContent = nom + ' — ' + raccordementsDe(nom).length + ' liaison(s) sur ce folio.'; }

/* ---- la surbrillance : des classes sur le rendu, jamais un recalcul ---- */
let survole = null;
function eteindre() { const sc = $('scene'); if (!sc) return;
  if (sc.classList.contains('focus')) { sc.classList.remove('focus'); sc.querySelectorAll('.hl').forEach(el => el.classList.remove('hl')); } survole = null; }
function allumerBloc(nom) { const sc = $('scene'); if (!sc) return; eteindre(); sc.classList.add('focus'); nom = xmlSur(nom);
  const autres = new Set();
  sc.querySelectorAll('.cab').forEach(p => { const a = p.dataset.a, b = p.dataset.b; if (a === nom || b === nom) { p.classList.add('hl'); autres.add(a); autres.add(b); } });
  sc.querySelectorAll('.comp').forEach(g => { if (g.dataset.name === nom || autres.has(g.dataset.name)) g.classList.add('hl'); }); }
function allumerFil(f) { const sc = $('scene'); if (!sc) return; eteindre(); sc.classList.add('focus');
  sc.querySelectorAll('.cab').forEach(p => { if (+p.dataset.i === f.i) p.classList.add('hl'); });
  sc.querySelectorAll('.comp').forEach(g => { if (g.dataset.name === xmlSur(f.de) || g.dataset.name === xmlSur(f.vers)) g.classList.add('hl'); }); }

/* ---- la planche : pan, pinch, molette, clic, survol -------------------- */
function lierPlanche() {
  const stage = $('stage'); const pointeurs = new Map(); let mode = null, pan = null, pinch = null, bouge = false, origine = null;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const debutPinch = () => { mode = 'pinch'; pan = null; const r = cadreSvg(); const p = [...pointeurs.values()];
    const mx = (p[0].x + p[1].x) / 2 - r.left, my = (p[0].y + p[1].y) / 2 - r.top;
    pinch = { d: dist(p[0], p[1]), wx: (mx - app.vue.tx) / app.vue.s, wy: (my - app.vue.ty) / app.vue.s, s0: app.vue.s }; };
  const suitPinch = () => { const r = cadreSvg(); const p = [...pointeurs.values()]; if (p.length < 2) return;
    const ns = Math.max(.12, Math.min(6, pinch.s0 * dist(p[0], p[1]) / pinch.d));
    const mx = (p[0].x + p[1].x) / 2 - r.left, my = (p[0].y + p[1].y) / 2 - r.top;
    app.vue.s = ns; app.vue.tx = mx - pinch.wx * ns; app.vue.ty = my - pinch.wy * ns; appliquerVue(); };
  stage.addEventListener('pointerdown', e => { fermerFiche(); try { stage.setPointerCapture(e.pointerId); } catch (_) { }
    pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointeurs.size >= 2) { debutPinch(); return; }
    bouge = false; origine = [e.clientX, e.clientY]; mode = 'pan'; pan = { tx: app.vue.tx, ty: app.vue.ty, x: e.clientX, y: e.clientY }; });
  stage.addEventListener('pointermove', e => { if (pointeurs.has(e.pointerId)) pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (mode === 'pinch') { suitPinch(); return; } if (!mode) return;
    if (origine && (Math.abs(e.clientX - origine[0]) > 3 || Math.abs(e.clientY - origine[1]) > 3)) bouge = true;
    if (mode === 'pan') { app.vue.tx = pan.tx + (e.clientX - pan.x); app.vue.ty = pan.ty + (e.clientY - pan.y); appliquerVue(); } });
  const fin = e => { try { stage.releasePointerCapture(e.pointerId); } catch (_) { }
    const etaitPinch = mode === 'pinch'; pointeurs.delete(e.pointerId);
    if (etaitPinch) { if (pointeurs.size < 2) { mode = null; pinch = null; } return; }
    if (mode === 'pan' && !bouge) { const w = versMonde(e.clientX, e.clientY); const c = blocSous(w);
      if (c) { if (estRenvoi(c.name)) { const t = c.name.replace(RENVOI, ''); if (app.nFolios) allerAuPlan(t); }
               else ouvrirFiche(c, e.clientX, e.clientY); }
      else { const f = filSous(w); if (f) ouvrirFicheFil(f, e.clientX, e.clientY); else if (app.choisi) { app.choisi = null; peindre(); } } }
    mode = null; pan = null; };
  stage.addEventListener('pointerup', fin); stage.addEventListener('pointercancel', fin);
  stage.addEventListener('mousemove', e => { if (mode || pointeurs.size || $('pop').style.display === 'block') return;
    const c = blocSous(versMonde(e.clientX, e.clientY)); const nm = c ? c.name : null;
    if (nm !== survole) { if (nm) { allumerBloc(nm); survole = nm; } else eteindre(); } });
  stage.addEventListener('mouseleave', () => { if (!mode) eteindre(); });
  stage.addEventListener('wheel', e => { e.preventDefault(); const r = cadreSvg(); zoomer(Math.exp(-e.deltaY * 0.0014), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  // déposer un fichier n'importe où sur la planche
  ['dragenter', 'dragover'].forEach(ev => stage.addEventListener(ev, e => { e.preventDefault(); stage.classList.add('over'); }));
  ['dragleave', 'dragend'].forEach(ev => stage.addEventListener(ev, e => { e.preventDefault(); stage.classList.remove('over'); }));
  stage.addEventListener('drop', e => { e.preventDefault(); stage.classList.remove('over'); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) ouvrirFichier(f); });
}

/* ---- les fiches --------------------------------------------------------- */
function raccordementsDe(nom) { const src = app.source || app.contrat.liaisons; const out = [];
  src.forEach(l => { if (estRenvoi(l.de) || estRenvoi(l.vers)) return;
    if (l.de === nom) out.push({ borne: l.borneDe || '·', dest: l.vers, dt: l.borneVers, cable: l.cable, type: l.type, plan: l.plan, pn: l.pnDe });
    else if (l.vers === nom) out.push({ borne: l.borneVers || '·', dest: l.de, dt: l.borneDe, cable: l.cable, type: l.type, plan: l.plan, pn: l.pnVers }); });
  return out.sort((a, b) => { const na = parseFloat(a.borne), nb = parseFloat(b.borne); return (!isNaN(na) && !isNaN(nb)) ? na - nb : String(a.borne).localeCompare(String(b.borne)); }); }
function poserFiche(sx, sy, w) { const p = $('pop'); p.style.width = w + 'px'; p.style.display = 'block'; const pr = cadreSvg();
  let L = sx - pr.left + 12, T = sy - pr.top + 12; L = Math.min(L, pr.width - w - 12); T = Math.min(T, pr.height - 220);
  p.style.left = Math.max(8, L) + 'px'; p.style.top = Math.max(8, T) + 'px'; }
function fermerFiche() { $('pop').style.display = 'none'; eteindre(); }
function ouvrirFiche(c, sx, sy) { app.choisi = c.name; peindre();
  const cn = raccordementsDe(c.name), p = $('pop');
  const meta = x => [x.cable ? esc(x.cable) + (x.type ? ' ' + esc(x.type) : '') : (x.type ? esc(x.type) : ''), x.plan ? 'pl. ' + esc(x.plan) : ''].filter(Boolean).join(' · ') || '—';
  const lignes = cn.length ? cn.map(x => `<tr><td class="bn">${esc(x.borne)}</td><td>${esc(x.dest)}${x.dt ? ':' + esc(x.dt) : ''}</td><td>${meta(x)}</td></tr>`).join('')
    : '<tr><td colspan="3" class="vide">Aucun raccordement</td></tr>';
  const pn = [...new Set(cn.map(x => x.pn).filter(Boolean))];
  p.innerHTML = `<h5>${esc(CODES[(lireRepere(c.name) || {}).code] ? CODES[lireRepere(c.name).code].nom : 'Équipement')} — ${esc(c.name)}</h5>
    <div class="field"><label>Repère</label><input id="ed-rep" value="${escA(c.name)}"></div>
    <div class="field"><label>Désignation</label><input id="ed-des" value="${escA(app.contrat.designations.get(c.name) || '')}"></div>
    ${pn.length ? `<div class="infoline"><span class="k">Connecteur</span><span class="v">${esc(pn.join(' · '))}</span></div>` : ''}
    <div class="subhead">Bornes et raccordements <span class="count">${cn.length}</span></div>
    <div class="btbl-wrap"><table class="btbl"><thead><tr><th>Borne</th><th>Vers</th><th>Fil</th></tr></thead><tbody>${lignes}</tbody></table></div>
    <div class="actions"><button class="primary" id="ed-ok">Enregistrer</button><button id="ed-del">Supprimer</button><button class="ghost" id="ed-close">Fermer</button></div>`;
  poserFiche(sx, sy, 290);
  $('ed-close').onclick = fermerFiche;
  $('ed-ok').onclick = () => { const nr = $('ed-rep').value.trim() || c.name, nd = $('ed-des').value.trim();
    histPush('modification de ' + c.name);
    if (nr !== c.name) { const ren = arr => arr.forEach(l => { if (l.de === c.name) l.de = nr; if (l.vers === c.name) l.vers = nr; });
      ren(app.contrat.liaisons); if (app.source) ren(app.source); app.contrat.designations.delete(c.name); }
    if (nd) app.contrat.designations.set(nr, nd); else app.contrat.designations.delete(nr);
    app.choisi = nr; fermerFiche(); redessiner(); sauver(); };
  $('ed-del').onclick = () => { histPush('suppression de ' + c.name);
    const garder = l => l.de !== c.name && l.vers !== c.name;
    app.contrat.liaisons = app.contrat.liaisons.filter(garder); if (app.source) app.source = app.source.filter(garder);
    app.contrat.designations.delete(c.name); app.choisi = null; fermerFiche(); redessiner(); sauver(); };
}
function ouvrirFicheFil(f, sx, sy) { const p = $('pop');
  const ligne = (k, v) => v ? `<div class="infoline"><span class="k">${k}</span><span class="v">${esc(v)}</span></div>` : '';
  p.innerHTML = `<h5>${f.cable ? 'Fil — ' + esc(f.cable) : 'Fil'}</h5>`
    + ligne('De', f.de + (f.borneDe ? ':' + f.borneDe : '')) + ligne('Vers', f.vers + (f.borneVers ? ':' + f.borneVers : ''))
    + ligne('Type / section', f.type) + ligne('Route', f.route) + ligne('Plan', f.plan) + ligne('Connecteur dép.', f.pnDe) + ligne('Connecteur arr.', f.pnVers)
    + '<div class="actions"><button class="ghost" id="cb-close">Fermer</button></div>';
  poserFiche(sx, sy, 250); $('cb-close').onclick = fermerFiche; allumerFil(f); }

/* ---- le panneau --------------------------------------------------------- */
function montrerVue(id) { document.querySelectorAll('#railtabs button').forEach(b => b.classList.toggle('on', b.dataset.vue === id));
  document.querySelectorAll('.vue').forEach(v => v.classList.toggle('on', v.id === id));
  const rb = document.querySelector('.railbody'); if (rb) rb.scrollTop = 0;
  if (id === 'v-piece' && typeof synchroniserRetest === 'function') synchroniserRetest(); }
function listeMateriel() { const box = $('mt-liste'); const L = app.contrat.liaisons; const cnt = new Map();
  L.forEach(l => [l.de, l.vers].forEach(n => { if (n && !estRenvoi(n)) cnt.set(n, (cnt.get(n) || 0) + 1); }));
  const f = app.filtre.toLowerCase(); const parFil = new Set();
  if (f) L.forEach(l => { if (String(l.cable).toLowerCase().includes(f)) { parFil.add(l.de); parFil.add(l.vers); } });
  const noms = [...cnt.keys()].filter(n => !f || n.toLowerCase().includes(f) || parFil.has(n)).sort((a, b) => cnt.get(b) - cnt.get(a) || a.localeCompare(b));
  $('mt-rien').style.display = (cnt.size && !noms.length) ? '' : 'none';
  box.innerHTML = noms.slice(0, 400).map(n => { const d = app.contrat.designations.get(n) || '';
    return `<div class="mtrow" data-n="${escA(n)}"><span class="mtn">${esc(n)}</span>${d ? `<span class="mtd">${esc(clip(d, 22))}</span>` : ''}<span class="mtc">${cnt.get(n)} fil${cnt.get(n) > 1 ? 's' : ''}</span></div>`; }).join('');
  box.querySelectorAll('.mtrow').forEach(el => { el.onclick = () => viser(el.dataset.n); });
  $('cnt-eq').textContent = cnt.size; }
function tableLiaisons() { const CAP = 300; const f = app.filtre.toLowerCase();
  const vues = app.contrat.liaisons.map((l, i) => [l, i]).filter(([l]) => !f || l.de.toLowerCase().includes(f) || l.vers.toLowerCase().includes(f) || l.cable.toLowerCase().includes(f));
  const cell = (i, k, v) => `<td><input data-i="${i}" data-f="${k}" value="${escA(v)}"></td>`;
  $('tbl-lk').querySelector('tbody').innerHTML = vues.slice(0, CAP).map(([l, i]) => `<tr>${cell(i, 'de', l.de)}${cell(i, 'borneDe', l.borneDe)}${cell(i, 'vers', l.vers)}${cell(i, 'borneVers', l.borneVers)}${cell(i, 'cable', l.cable)}<td class="rmrow" data-i="${i}" title="Supprimer">✕</td></tr>`).join('')
    + (vues.length > CAP ? `<tr><td colspan="6" class="vide">… ${vues.length - CAP} autres lignes</td></tr>` : '');
  $('cnt-lk').textContent = app.contrat.liaisons.length; }
function tableDesignations() { const rows = [...app.contrat.designations.entries()];
  $('tbl-eq').querySelector('tbody').innerHTML = rows.map(([r, d]) => `<tr><td><input data-rep="${escA(r)}" data-f="repere" value="${escA(r)}"></td><td><input data-rep="${escA(r)}" data-f="designation" value="${escA(d)}"></td><td class="rmrow" data-rep="${escA(r)}" title="Supprimer">✕</td></tr>`).join(''); }
function synchroniserContexte() { const n = app.contrat.liaisons.length; const el = $('ctx-txt');
  if (!n) { el.textContent = 'aucun contrat'; return; }
  el.innerHTML = `<b>${n}</b> liaison${n > 1 ? 's' : ''} · <b>${reperesDe(app.contrat.liaisons).filter(r => !estRenvoi(r)).length}</b> repères` + (app.nFolios ? ` · <b>${app.nFolios}</b> folios` : ''); }
function synchroniserFolios() { const plans = plansDe(app.contrat.liaisons); const nav = $('folionav');
  if (plans.length < 2) { nav.classList.remove('on'); if (app.plan !== '*' && !plans.includes(app.plan)) app.plan = '*'; }
  else { nav.classList.add('on'); const i = plans.indexOf(app.plan); const mot = app.nFolios ? 'Folio' : 'Plan';
    $('fo-lbl').textContent = i < 0 ? 'Tous les ' + mot.toLowerCase() + 's' : mot + ' ' + plans[i] + ' / ' + plans.length;
    $('fo-prev').disabled = i === 0; $('fo-next').disabled = i >= 0 && i >= plans.length - 1; }
  $('btnFolios').textContent = app.nFolios ? 'Tout d’un tenant' : 'Découper en folios'; }
function synchroniserHistorique() { const b = $('btnUndo'); b.style.display = app.hist.length ? '' : 'none';
  if (app.hist.length) b.title = 'Annuler : ' + app.hist[app.hist.length - 1].quoi + ' (Ctrl+Z)'; }
function synchroniser() { listeMateriel(); tableLiaisons(); tableDesignations(); synchroniserContexte(); synchroniserFolios(); synchroniserHistorique(); }
function allerAuPlan(plan) { app.plan = plan; app.choisi = null; fermerFiche(); redessiner(); ajuster(); }
function allerAuFolio(pas) { const plans = plansDe(app.contrat.liaisons); let i = plans.indexOf(app.plan);
  if (i < 0) i = pas > 0 ? -1 : plans.length; i += pas; if (i < 0 || i >= plans.length) return; allerAuPlan(plans[i]); }

/* ---- les folios : découper, dérouler, ajuster tout seul ---------------- */
function decouper(budget) { const src = app.source || app.contrat.liaisons; const R = decouperEnFolios(src, budget);
  if (!R.applique) return 0;
  app.source = src; app.contrat.liaisons = R.liaisons; app.nFolios = R.nFolios; app.plan = '1'; redessiner(); ajuster(); return R.nFolios; }
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
  $('xp-stat').textContent = 'Le schéma faisait ' + Math.round(f.larg) + ' × ' + Math.round(f.haut) + ', il ne tenait sur aucune feuille. Découpé en ' + meilleur.n + ' folios.';
  return meilleur.n; }

/* ---- historique et enregistrement ------------------------------------- */
function histPush(quoi) { app.hist.push({ quoi, liaisons: app.contrat.liaisons.map(l => ({ ...l })), source: app.source ? app.source.map(l => ({ ...l })) : null,
  nFolios: app.nFolios, plan: app.plan, designations: new Map(app.contrat.designations) });
  if (app.hist.length > 40) app.hist.shift(); synchroniserHistorique(); }
function annuler() { const p = app.hist.pop(); if (!p) return null;
  app.contrat.liaisons = p.liaisons; app.source = p.source; app.nFolios = p.nFolios; app.plan = p.plan; app.contrat.designations = p.designations; app.choisi = null;
  redessiner(); ajuster(); sauver(); return p.quoi; }
let sauveT = null;
function sauver() { clearTimeout(sauveT); sauveT = setTimeout(() => { try {
    localStorage.setItem(CLE_CONTRAT, JSON.stringify({ liaisons: app.contrat.liaisons, source: app.source, nFolios: app.nFolios, plan: app.plan,
      designations: [...app.contrat.designations], cartouche: app.contrat.cartouche, t: Date.now() }));
    heureSauve(Date.now()); } catch (_) { heureSauve(null); } }, 400); }
function heureSauve(t) { const el = $('ctx-sauve');
  if (!t) { el.textContent = 'non enregistré'; el.title = 'Le navigateur refuse d’enregistrer (navigation privée ?)'; return; }
  const d = new Date(t); el.textContent = 'enregistré ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  el.title = 'Gardé dans ce navigateur. Rien n’est parti sur le réseau.'; }
function relire() { try { const j = localStorage.getItem(CLE_CONTRAT); if (!j) return false; const o = JSON.parse(j);
    if (!o || !o.liaisons || !o.liaisons.length) return false;
    app.contrat.liaisons = o.liaisons.map(liaison); app.source = o.source ? o.source.map(liaison) : null; app.nFolios = o.nFolios || 0; app.plan = o.plan || '*';
    app.contrat.designations = new Map(o.designations || []); if (o.cartouche) Object.assign(app.contrat.cartouche, o.cartouche);
    remplirCartouche(); redessiner(); ajuster(); heureSauve(o.t || Date.now()); return true; } catch (_) { return false; } }

/* ---- charger un contrat ----------------------------------------------- */
function chargerContrat(liaisons, quoi) { histPush(quoi || 'chargement d’un contrat');
  app.contrat.liaisons = liaisons.map(liaison); app.source = null; app.nFolios = 0; app.plan = '*'; app.choisi = null; app.filtre = ''; $('mt-find').value = '';
  redessiner(); ajuster(); ajusterFolios(); sauver(); fermerModale(); fermerTiroir(); }
function infoImport(msg, cls) { const el = $('db-fileinfo'); el.textContent = msg || ''; el.className = 'dz-info' + (cls ? ' ' + cls : ''); }
async function ouvrirFichier(fichier) { if (!fichier) return;
  try { infoImport('Lecture de « ' + fichier.name + ' »…', 'load'); const r = await lireFichier(fichier);
    if (!r.liaisons.length) { infoImport('« ' + fichier.name + ' » lu, mais aucune liaison reconnue — vérifie les colonnes.', 'err'); ouvrirModale(); return; }
    infoImport('« ' + fichier.name + ' » — ' + r.liaisons.length + ' liaisons' + (r.format === 'retest' ? ', format retest (en-têtes ligne ' + r.entete + ')' : '') + '.', 'ok');
    chargerContrat(r.liaisons, 'ouverture de ' + fichier.name);
  } catch (e) { infoImport('Erreur : ' + (e && e.message || e), 'err'); ouvrirModale(); } }
function collerTexte() { const r = lireTexte($('imp-db').value);
  if (!r.liaisons.length) { infoImport('Aucune liaison reconnue. Vérifie le séparateur ( ; , ou tabulation ) et l’ordre des colonnes.', 'err'); return; }
  chargerContrat(r.liaisons, 'collage de ' + r.liaisons.length + ' liaisons'); }
function ouvrirModale() { $('modal').style.display = 'flex'; }
function fermerModale() { $('modal').style.display = 'none'; }
function ouvrirTiroir() { document.querySelector('aside').classList.add('open'); $('drawerBg').classList.add('show'); }
function fermerTiroir() { document.querySelector('aside').classList.remove('open'); $('drawerBg').classList.remove('show'); }

/* ---- sortir le dessin : SVG, PNG, impression -------------------------- */
function nomFolio() { return 'atelier-schema' + (app.plan !== '*' ? '-folio-' + String(app.plan).replace(/[^\w.-]+/g, '_') : ''); }
async function telecharger(blob, nom) {
  try { const c = window.claude; if (c && typeof c.use === 'function') { const dl = await c.use('downloads'); if (dl && typeof dl.save === 'function') { await dl.save({ filename: nom, data: blob }); return; } } } catch (_) { return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nom; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
function svgDuFolio() { return app.dessin ? svgAutonome(app.dessin, app.contrat.cartouche, folioCourant(), n => app.contrat.designations.get(n) || '') : null; }
function exporterSVG() { const S = svgDuFolio(); if (!S) return; telecharger(new Blob([S.txt], { type: 'image/svg+xml;charset=utf-8' }), nomFolio() + '.svg'); }
function exporterPNG() { const S = svgDuFolio(); if (!S) return;
  const k = Math.max(1, Math.min(3, 12e6 / Math.max(1, S.w * S.h))); const img = new Image();
  img.onload = () => { const cv = document.createElement('canvas'); cv.width = Math.round(S.w * k); cv.height = Math.round(S.h * k);
    const g = cv.getContext('2d'); g.fillStyle = '#fbfbf7'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
    cv.toBlob(b => { if (b) telecharger(b, nomFolio() + '.png'); }, 'image/png'); };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(S.txt); }
function imprimer() { const S = svgDuFolio(); if (!S) return;
  let root = $('printroot'); if (!root) { root = document.createElement('div'); root.id = 'printroot'; document.body.appendChild(root); }
  root.innerHTML = S.txt.replace(/^<\?xml[^>]*\?>\s*/, ''); window.print(); }

/* ---- le cartouche ------------------------------------------------------ */
const CHAMPS_CARTOUCHE = [['m-title', 'titre'], ['m-author', 'auteur'], ['m-rev', 'indice'], ['m-date', 'date'], ['m-scale', 'echelle']];
function remplirCartouche() { CHAMPS_CARTOUCHE.forEach(([id, k]) => { $(id).value = app.contrat.cartouche[k] || ''; }); }

/* ---- tout relier -------------------------------------------------------- */
function lierPanneau() {
  const o = (id, fn) => { const e = $(id); if (e) e.onclick = fn; };
  $('railtabs').addEventListener('click', e => { const b = e.target.closest('button[data-vue]'); if (b) montrerVue(b.dataset.vue); });
  o('btnMenu', () => document.querySelector('aside').classList.contains('open') ? fermerTiroir() : ouvrirTiroir());
  o('drawerBg', fermerTiroir);
  o('lk-file', () => $('lk-fichier').click());
  $('lk-fichier').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) ouvrirFichier(f); e.target.value = ''; });
  o('lk-import', () => { fermerTiroir(); ouvrirModale(); });
  o('lk-demo', () => chargerContrat(contratEssai(), 'contrat d’exemple'));
  o('imp-cancel', fermerModale); o('imp-ok', collerTexte);
  $('modal').addEventListener('click', e => { if (e.target.id === 'modal') fermerModale(); });
  { const dz = $('db-drop'), input = $('db-file');
    dz.addEventListener('click', e => { if (e.target.id !== 'db-browse') input.click(); });
    o('db-browse', e => { e.stopPropagation(); input.click(); });
    input.addEventListener('change', () => { if (input.files && input.files[0]) ouvrirFichier(input.files[0]); input.value = ''; });
    ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); dz.classList.add('over'); }));
    ['dragleave', 'dragend'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); dz.classList.remove('over'); }));
    dz.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dz.classList.remove('over'); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) ouvrirFichier(f); }); }
  $('mt-find').addEventListener('input', e => { app.filtre = e.target.value.trim(); listeMateriel(); tableLiaisons(); });
  // la table des liaisons : chaque cellule modifie la liaison qu'elle montre
  { const t = $('tbl-lk');
    t.addEventListener('input', e => { const i = e.target.dataset.i; if (i == null) return; app.contrat.liaisons[+i][e.target.dataset.f] = e.target.value.trim(); });
    t.addEventListener('change', () => { redessiner(); sauver(); });
    t.addEventListener('click', e => { const c = e.target.closest('.rmrow'); if (!c) return; histPush('suppression d’une liaison'); app.contrat.liaisons.splice(+c.dataset.i, 1); redessiner(); sauver(); }); }
  o('add-lk', () => { histPush('ajout d’une liaison'); app.contrat.liaisons.push(liaison({})); tableLiaisons(); $('cnt-lk').textContent = app.contrat.liaisons.length; sauver(); });
  o('lk-clear', () => { if (!confirm('Effacer tout le contrat ?')) return; histPush('tout vider'); app.contrat.liaisons = []; app.source = null; app.nFolios = 0; app.plan = '*'; redessiner(); ajuster(); sauver(); });
  o('btnFolios', () => { histPush(app.nFolios ? 'retour d’un seul tenant' : 'découpage en folios'); if (app.nFolios) derouler(); else if (!decouper(16)) $('xp-stat').textContent = 'Ce schéma tient déjà sur une page : pas besoin de le découper.'; sauver(); });
  { const t = $('tbl-eq');
    t.addEventListener('change', e => { const r = e.target.dataset.rep; if (r == null) return; const f = e.target.dataset.f;
      if (f === 'designation') app.contrat.designations.set(r, e.target.value.trim());
      else { const d = app.contrat.designations.get(r); app.contrat.designations.delete(r); if (e.target.value.trim()) app.contrat.designations.set(e.target.value.trim(), d); }
      redessiner(); sauver(); });
    t.addEventListener('click', e => { const c = e.target.closest('.rmrow'); if (!c) return; app.contrat.designations.delete(c.dataset.rep); redessiner(); sauver(); }); }
  o('add-eq', () => { const r = prompt('Repère à désigner :'); if (!r) return; app.contrat.designations.set(r.trim(), ''); tableDesignations(); });
  CHAMPS_CARTOUCHE.forEach(([id, k]) => { $(id).addEventListener('input', e => { app.contrat.cartouche[k] = e.target.value; }); $(id).addEventListener('change', () => { peindre(); sauver(); }); });
  o('fo-prev', () => allerAuFolio(-1)); o('fo-next', () => allerAuFolio(+1));
  o('btnSvg', exporterSVG); o('btnPng', exporterPNG); o('btnPrint', imprimer);
  o('zin', () => zoomer(1.2)); o('zout', () => zoomer(1 / 1.2)); o('zfit', ajuster);
  o('btnUndo', () => annuler());
  window.addEventListener('keydown', e => { if (e.key === 'Escape') { fermerFiche(); fermerModale(); fermerTiroir(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName || '')) { e.preventDefault(); annuler(); } });
  let rT; window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { if (window.innerWidth <= 860) ajuster(); }, 160); });
  window.addEventListener('orientationchange', () => setTimeout(ajuster, 300));
}
