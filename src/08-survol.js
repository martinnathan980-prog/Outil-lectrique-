/* ===========================================================================
   08 — LE SURVOL D'UNE BORNE (v86, l'audit M4)
   Sur le plan, chaque borne porte son nom, lisible sans zoomer. Au survol, une bulle sobre en dit le reste : le nom, le
   même que sur la pièce (« 667VT2 · 51B », « 411VC3A · A ») ; la lettre de la face quand le fichier numérote ses bornes
   (« 1 · contact A ») ; une minuscule dite telle (« 51e, minuscule ») ; chaque câble par son type et l'autre bout ; le
   contact à sertir. Elle n'apparaît qu'au repos sur une borne, ne grossit rien, ne décale rien (charte v86 : sur le plan,
   rien ne bouge) et ne va jamais à l'export : c'est une bulle de la page, posée par-dessus le plan, avec la matière des
   bulles de VOLTA (`.bulle-texte`), pas un trait du dessin. La borne se trouve par la géométrie du dessin : là où elle se
   prend à la souris (06, `bornesPrenables`), la pastille d'une barrette à poser ou d'un morceau de barrette, la lettre d'un
   contact de prise dans sa partie mobile.
   =========================================================================== */
'use strict';

const SURVOL_BORNE = { el: null, t: 0, cle: '', muet: '', montre: false, fin: 0 };

/* LA BORNE SOUS UN POINT du dessin (x, y, en unités du dessin) : { nom, borne, zone } — ou null. */
function borneSous(x, y) { const D = app.dessin; if (!D) return null;
  // une barrette à poser (VT1…) : ses pastilles, sur sa ligne
  for (const b of D.barrettes || []) { if (!b.nomVT) continue;
    for (const p of bornesDePiquage(b)) { const r = R_PASTILLE(String(p.n)) + 1.5;
      if (Math.abs(x - b.x) <= r && Math.abs(y - p.y) <= PAST_H / 2 + 1.5) return { nom: b.nomVT, borne: String(p.n), zone: { x0: b.x - r, x1: b.x + r, y0: p.y - PAST_H / 2, y1: p.y + PAST_H / 2 } }; } }
  for (const c of D.comps) { if ((c.kind === 'tag' && estMasse(c.name)) || estDrapeau(c) || estMasse(c.name)) continue;
    if (x < c.x - 6 || x > c.x + c.w + 6 || y < c.y - 10 || y > c.y + c.h + 10) continue;
    const zs = bornesPrenables(c).slice();
    // une prise : la lettre du contact, écrite dans la partie mobile, entre ses deux amenées
    if (c.kind === 'strip' && estCoupure(c.name)) { const mid = c.x + c.lw + (c.w - c.lw - c.rw) / 2, xm0 = mid - (PRISE.WE + PRISE.WM) / 2, xe1 = mid + (PRISE.WE + PRISE.WM) / 2;
      (c.rangs.S || []).forEach(p => zs.push({ y: p.y, etiq: p.etiq, x0: xm0, x1: xe1, y0: p.y - PRH / 2 + 1, y1: p.y + PRH / 2 - 1 })); }
    // un morceau de barrette collé à sa borne : sa pastille
    if (c.kind === 'tag' && estBarrette(c.name)) { const M = symboleDePastille(c); if (M) { const r = R_PASTILLE(String(M.etiq || '')) + 1.5;
      zs.push({ y: M.y, etiq: M.etiq, x0: M.xs - r, x1: M.xs + r, y0: M.y - PAST_H / 2 - 1, y1: M.y + PAST_H / 2 + 1 }); } }
    const z = zs.find(q => q.etiq != null && String(q.etiq) !== '' && x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1);
    if (z) return { nom: c.name, borne: String(z.etiq), zone: z }; }
  return null; }

/* CE QUE LA BULLE DIT d'une borne : son nom (et la lettre de sa face, si le fichier la numérote), chaque câble par son type
   et l'autre bout (une prise : par quelle partie), le contact à sertir. Les liaisons du folio : une barrette à poser y vit. */
function texteDuSurvol(t) { const L = liaisonsDuPlan(), b = t.borne;
  const xs = L.filter(l => (l.de === t.nom && String(l.borneDe) === b) || (l.vers === t.nom && String(l.borneVers) === b)); if (!xs.length) return '';
  const prise = estCoupure(t.nom), aPoser = VT_A_POSER.test(t.nom), sertir = new Set(); let face = '';
  let Q = null; if (aPoser) { try { Q = planDeBarrette(t.nom).plan; } catch (_) { Q = null; } }
  const lignes = xs.slice().sort((u, v) => (u.de === u.vers) - (v.de === v.vers)).map(l => { const ici = l.de === t.nom && String(l.borneDe) === b, cote = ici ? 'de' : 'vers';
    const autre = ici ? l.vers : l.de, bAutre = ici ? l.borneVers : l.borneDe;
    // le contact à sertir à ce bout, et la lettre de la face quand elle n'est pas le nom de la borne
    let ct = null; try { ct = aPoser ? (Q && Q.fils.find(y => y.f.l === l && String(y.borne) === b)) || null : (sertirDuFil(l) || {})[cote] || null; } catch (_) { ct = null; }
    if (ct && ct.sertir && ct.sertir.reference) sertir.add(ct.sertir.reference);
    // (« A12 » est le contact 12 de son connecteur : rien à ajouter ; « 51B » le dit déjà ; « 1 » d'une prise lettrée : contact A)
    if (ct && ct.contact && ct.contact.lettre && !face && String(ct.contact.lettre).toUpperCase() !== String(numeroDeBorne(b)).toUpperCase() && !/^\d+[A-Za-z]{1,2}$/.test(b)) face = String(ct.contact.lettre);
    if (l.de === l.vers) return 'pontage vers ' + (ici ? l.borneVers : l.borneDe);
    const quoi = estRaccordAPoser(l) ? 'câble à créer' : (l.type || 'câble');
    // une prise : le câble qui arrive est dans la partie mobile, celui qui repart dans la partie fixe (06, le dessin)
    return (prise ? (ici ? 'partie fixe · ' : 'partie mobile · ') : '') + quoi + ' vers ' + autre + (bAutre ? ':' + bAutre : ''); });
  const min = /[a-z]/.test(b) ? ', minuscule' : '';
  return [t.nom + ' · ' + b + (face ? ' · contact ' + face : '') + min, ...lignes.slice(0, 4), ...(lignes.length > 4 ? ['et ' + (lignes.length - 4) + ' de plus'] : []),
    ...(sertir.size ? ['contact à sertir : ' + [...sertir].join(', ')] : [])].join('\n'); }

// la boîte d'écran d'une zone du dessin (la matrice d'écran de la scène)
function zoneEcran(z, M) { const a = new DOMPoint(z.x0, z.y0).matrixTransform(M), c = new DOMPoint(z.x1, z.y1).matrixTransform(M);
  return { left: Math.min(a.x, c.x), right: Math.max(a.x, c.x), top: Math.min(a.y, c.y), bottom: Math.max(a.y, c.y) }; }
function cacherSurvol() { clearTimeout(SURVOL_BORNE.t); if (SURVOL_BORNE.montre) SURVOL_BORNE.fin = performance.now(); SURVOL_BORNE.montre = false; if (SURVOL_BORNE.el) SURVOL_BORNE.el.hidden = true; }
/* La bulle sous la borne (au-dessus quand la place manque), dans le plan, à 12 px au moins des bords de l'écran. */
function montrerSurvol(t) { const sc = $('scene'), M = sc && sc.getScreenCTM(); if (!M) return; const txt = texteDuSurvol(t); if (!txt) return;
  if (!SURVOL_BORNE.el) { const el = document.createElement('div'); el.className = 'fi-bulle bulle-texte'; el.id = 'plan-bulle'; el.setAttribute('role', 'tooltip'); el.hidden = true; document.body.appendChild(el); SURVOL_BORNE.el = el; }
  const el = SURVOL_BORNE.el; el.textContent = txt; el.hidden = false; SURVOL_BORNE.montre = true;
  const r = zoneEcran(t.zone, M), P = $('planche').getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
  const L = Math.max(12, P.left + 8), R = Math.min(window.innerWidth - 12, P.right - 8), T = Math.max(12, P.top + 8), B = Math.min(window.innerHeight - 12, P.bottom - 8);
  const x = Math.max(L, Math.min(r.left, R - w)), y = r.bottom + 8 + h <= B ? r.bottom + 8 : r.top - 8 - h >= T ? r.top - 8 - h : Math.max(T, B - h);
  el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px'; }

/* LES GESTES : au repos sur une borne, la bulle (450 ms la première, tout de suite les suivantes, comme les bulles de la
   fiche) ; elle part dès que la main quitte la borne, appuie, tourne la molette ou tape une touche — et la borne appuyée
   reste muette tant que la main ne l'a pas quittée (la bulle ne couvre jamais ce que le clic vient d'ouvrir). Rien au doigt,
   rien pendant un glissé. */
function lierSurvol() { const stage = $('planche'); if (!stage || stage.dataset.survol) return; stage.dataset.survol = '1';
  stage.addEventListener('pointermove', e => { if (e.pointerType === 'touch' || e.buttons) { cacherSurvol(); SURVOL_BORNE.cle = ''; return; }
    const sc = $('scene'), M = sc && app.dessin ? sc.getScreenCTM() : null; if (!M) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(M.inverse()), t = borneSous(p.x, p.y), cle = t ? t.nom + '\u0001' + t.borne : '';
    if (SURVOL_BORNE.muet && cle !== SURVOL_BORNE.muet) SURVOL_BORNE.muet = '';
    if (cle === SURVOL_BORNE.cle) return;
    cacherSurvol(); SURVOL_BORNE.cle = cle; if (!t || cle === SURVOL_BORNE.muet) return;
    const chaude = performance.now() - SURVOL_BORNE.fin < 1200;
    SURVOL_BORNE.t = setTimeout(() => { if (SURVOL_BORNE.cle === cle) montrerSurvol(t); }, chaude ? 0 : 450); }, { passive: true });
  stage.addEventListener('pointerdown', () => { SURVOL_BORNE.muet = SURVOL_BORNE.cle; cacherSurvol(); }, { passive: true });
  stage.addEventListener('pointerleave', () => { cacherSurvol(); SURVOL_BORNE.cle = ''; SURVOL_BORNE.muet = ''; }, { passive: true });
  stage.addEventListener('wheel', () => { cacherSurvol(); SURVOL_BORNE.cle = ''; }, { passive: true });
  document.addEventListener('keydown', () => { if (SURVOL_BORNE.montre) cacherSurvol(); }, true); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lierSurvol); else lierSurvol();
