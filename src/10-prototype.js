/* ===========================================================================
   10 — LE PROTOTYPE v72 : trois directions visuelles, à essayer sur pièce
   Le lecteur (20 octobre 2026) : « il y a beaucoup de sombre ; quand tu cliques, ça s'ouvre sur un volet à droite, il est
   statique — pourquoi pas une pop-up qui s'ouvre à partir de là où tu cliques, que tu peux bouger un peu partout ; les
   menus sont noirs sur fond noir ; un fond pas que noir, un peu dégradé, un petit peu interactif, qui bouge comme une
   application un peu futuriste — mais pas m'as-tu-vu : classe, propre ; et le calibre du 15 A, horrible ».
   Ce module habille l'application elle-même — le moteur, les fiches et les batteries ne bougent pas. Une direction se
   choisit par l'adresse (index.html?direction=aube | nuit | ardoise) ou dans ⋮ › Plus ; sans direction, rien ne change
   (Graphite 2027). Il pose trois choses, que chaque direction habille à sa façon (style-proto-*.css) :
     · LA TABLE, en couches (#pr-table) : le dégradé, une lumière qui respire très lentement, les points (ou la trame)
       en légère parallaxe quand on déplace le plan, une lueur qui suit la souris de loin. Le mouvement réduit coupe tout ;
     · LA FICHE QUI NAÎT DU CLIC : l'inspecteur devient une CARTE FLOTTANTE — elle grandit depuis le bloc cliqué (~280 ms,
       vive puis freinée), se pose à côté de lui sans le cacher, un fil fin l'y relie ; on la déplace en la tenant par sa
       barre ; un bouton (ou la porter au bord droit) l'épingle en volet, comme avant ; Échap ou un clic dehors la rend au
       bloc, où elle se résorbe. Le plan n'est plus rétréci par elle (`marges`) ;
     · LE CALIBRE d'un disjoncteur, redessiné pour chaque direction : la règle de la gamme (Aube), le cadran (Nuit
       bleue), le cartouche (Ardoise) — le retenu posé dans la gamme jugée : le verdict se lit sans pastille ni mot.
   Les fonctions de l'interface qu'il enveloppe gardent leur nom et leur contrat : `ouvrirInspecteur`, `fermerInspecteur`,
   `ouvrirFiche`, `marges`, `appliquerVue`, `heroCalibre`.
   =========================================================================== */
'use strict';

const DIRECTIONS = { aube: 'Aube', nuit: 'Nuit bleue', ardoise: 'Ardoise' };
const PR = { dir: '', epingle: false, origine: null, deplacee: false, appui: null, prise: null, table: null, lien: null, quai: null,
  lueur: { x: 0, y: 0, vx: 0, vy: 0, anim: 0, vue: false } };
const PR_LARGEUR = () => (window.innerWidth >= 1800 ? 440 : 420);   // la carte : la largeur d'une fiche, pas d'un volet
const PR_HAUTEUR = 620;                                             // au plus : au-delà, elle défile — une carte, pas un pan d'écran
const PR_ECART = 44;                                                 // l'air entre le bloc et la carte (le fil y passe)
const SVGNS = 'http://www.w3.org/2000/svg';
const flottante = () => !!PR.dir && !PR.epingle && !telephone();

/* ---- la direction : l'adresse d'abord, sinon la dernière choisie dans ce navigateur -------------------------------- */
function directionDemandee() { let d = null;
  try { d = new URLSearchParams(location.search).get('direction'); } catch (_) { }
  if (d == null) try { d = localStorage.getItem('volta.direction'); } catch (_) { }
  // le choix ne paraît dans le menu que pour qui essaie le prototype (une direction dans l'adresse ou déjà choisie) : sans
  // elle, le menu reste celui de Graphite, ligne pour ligne
  PR.essai = d != null;
  d = String(d || '').toLowerCase(); return DIRECTIONS[d] ? d : ''; }
function appliquerDirection(d, garder) { const h = document.documentElement;
  if (!$('inspecteur').hidden) fermerInspecteur();
  PR.dir = DIRECTIONS[d] ? d : '';
  if (PR.dir) h.dataset.direction = PR.dir; else delete h.dataset.direction;
  // l'Aube est claire de bout en bout : elle impose le thème clair aux feuilles (les deux autres suivent le système)
  if (PR.dir === 'aube') { h.dataset.theme = 'light'; h.dataset.themeImpose = '1'; } else if (h.dataset.themeImpose) { delete h.dataset.theme; delete h.dataset.themeImpose; }
  if (garder) try { localStorage.setItem('volta.direction', PR.dir || 'graphite'); } catch (_) { }
  marquerMenuDirection(); appliquerVue(); }

/* ---- LA TABLE : quatre couches sous tout, fixées à l'écran -------------------------------------------------------- */
function poserLaTable() { const t = document.createElement('div'); t.id = 'pr-table'; t.setAttribute('aria-hidden', 'true');
  t.innerHTML = '<div class="pr-fond"></div><div class="pr-souffle"></div><div class="pr-points"></div><div class="pr-lueur"></div>';
  document.body.prepend(t); PR.table = t;
  // la lueur suit la souris DE LOIN : elle la rattrape en douceur (un pas d'un quinzième par image), puis s'arrête
  const L = PR.lueur, el = t.querySelector('.pr-lueur');
  L.x = L.vx = window.innerWidth * .7; L.y = L.vy = window.innerHeight * .3;
  const pas = () => { L.vx += (L.x - L.vx) * .065; L.vy += (L.y - L.vy) * .065;
    el.style.transform = `translate3d(${L.vx.toFixed(1)}px,${L.vy.toFixed(1)}px,0)`;
    L.anim = Math.abs(L.x - L.vx) + Math.abs(L.y - L.vy) > .6 ? requestAnimationFrame(pas) : 0; };
  window.addEventListener('pointermove', e => { if (!PR.dir || mouvementReduit() || e.pointerType === 'touch') return; L.x = e.clientX; L.y = e.clientY; if (!L.vue) { L.vue = true; t.classList.add('vue'); } if (!L.anim) L.anim = requestAnimationFrame(pas); }, { passive: true });
  document.addEventListener('pointerleave', () => t.classList.remove('vue'));
  el.style.transform = `translate3d(${L.vx}px,${L.vy}px,0)`; }
// la parallaxe : les points glissent d'un dixième de ce que glisse la feuille — elle est posée AU-DESSUS de la table
function parallaxe() { const p = PR.table && PR.table.querySelector('.pr-points'); if (!p) return;
  if (!PR.dir || mouvementReduit()) { p.style.backgroundPosition = ''; return; }
  const k = .1; p.style.backgroundPosition = `${(app.vue.tx * k).toFixed(1)}px ${(app.vue.ty * k).toFixed(1)}px`; }

/* ---- LA CARTE : où elle naît, où elle se pose ---------------------------------------------------------------------- */
// la boîte d'un objet du dessin, à l'écran
function rectDuMonde(x, y, w, h) { const r = cadre(), s = app.vue.s; return { left: r.left + app.vue.tx + x * s, top: r.top + app.vue.ty + y * s, width: w * s, height: h * s }; }
/* D'où vient la fiche : le bloc cliqué (sa boîte, qui suit le plan), sinon l'endroit du clic (un câble, une barrette à
   poser : le point du dessin sous le doigt), sinon le bouton qui l'a demandée (les repères, au rail). */
function origineDeLaCible() { const c = app.cible, d = app.dessin, recent = PR.appui && Date.now() - PR.appui.t < 900;
  if (c && c.type === 'bloc' && d && d.compDe.get(c.nom)) return { type: 'bloc', nom: c.nom };
  if (c && recent) { const w = versMonde(PR.appui.x, PR.appui.y); return { type: 'point', x: w.x, y: w.y }; }
  if (c && c.type === 'fil' && d) { const w = c.f || (typeof filDe === 'function' ? filDe(c.l) : null); if (w && w.pts && w.pts.length) { const a = w.pts[0], b = w.pts[1] || a; return { type: 'point', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; } }
  if (!c && app.insp.index) { const b = $('btnIndex'); if (b) return { type: 'ecran', rect: b.getBoundingClientRect() }; }
  return null; }
function rectDeLOrigine(o) { o = o || PR.origine; if (!o) return null;
  if (o.type === 'ecran') return o.rect;
  if (!app.dessin) return null;
  if (o.type === 'bloc') { const k = app.dessin.compDe.get(o.nom); return k ? rectDuMonde(k.x, k.y, k.w, k.h) : null; }
  if (o.type === 'point') { const r = rectDuMonde(o.x, o.y, 0, 0); return { left: r.left - 7, top: r.top - 7, width: 14, height: 14 }; }
  return null; }
const jeton = n => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)) || 0;
// la place que la carte peut prendre : sous la barre du haut, à droite du rail, à un jeu des bords
function zoneLibre() { const j = jeton('--jeu') || 10; return { L: (jeton('--rail') || 64) + 2, T: (jeton('--entete') || 52) + j, R: window.innerWidth - j, B: window.innerHeight - j }; }
/* Se poser à côté du bloc sans le cacher : à sa droite d'abord (on lit de gauche à droite : le bloc, puis sa fiche), à sa
   gauche sinon, dessous, dessus ; à défaut, du côté où il y a le plus de place, rentrée dans l'écran. Le haut de la carte
   s'aligne sur le haut du bloc (un peu au-dessus, pour que la barre de la carte et le repère se lisent ensemble). */
function placerPres(b, W, H) { const Z = zoneLibre(), e = PR_ECART, ent = (x, y) => x >= Z.L && x + W <= Z.R && y >= Z.T && y + H <= Z.B;
  const cl = (v, a, z) => Math.max(a, Math.min(z, v));
  if (!b) return { x: Z.R - W - 6, y: Z.T };
  const yA = cl(b.top - 14, Z.T, Z.B - H), xA = cl(b.left, Z.L, Z.R - W);
  const essais = [[b.left + b.width + e, yA], [b.left - e - W, yA], [xA, b.top + b.height + e], [xA, b.top - e - H]];
  for (const [x, y] of essais) if (ent(x, y)) return { x, y };
  const droite = Z.R - (b.left + b.width), gauche = b.left - Z.L;
  return droite >= gauche ? { x: cl(b.left + b.width + e, Z.L, Z.R - W), y: yA } : { x: cl(b.left - e - W, Z.L, Z.R - W), y: yA }; }
function poserCarte(x, y) { const el = $('inspecteur'), Z = zoneLibre(), W = PR_LARGEUR();
  x = Math.max(Z.L - 40, Math.min(Z.R - 120, x)); y = Math.max(Z.T - 2, Math.min(Z.B - 56, y));
  const s = el.style; s.setProperty('--pr-x', Math.round(x) + 'px'); s.setProperty('--pr-y', Math.round(y) + 'px'); s.setProperty('--pr-l', W + 'px');
  s.setProperty('--pr-hmax', Math.round(Math.min(PR_HAUTEUR, Z.B - y)) + 'px'); }
// la carte, mesurée à sa hauteur libre (au plus PR_HAUTEUR, au plus l'écran)
function mesurerCarte() { const el = $('inspecteur'), Z = zoneLibre(); el.style.setProperty('--pr-l', PR_LARGEUR() + 'px'); el.style.setProperty('--pr-hmax', Math.min(PR_HAUTEUR, Z.B - Z.T) + 'px');
  return { W: el.offsetWidth || PR_LARGEUR(), H: el.offsetHeight || 400 }; }

/* ---- NAÎTRE, GLISSER, SE RÉSORBER ---------------------------------------------------------------------------------- */
const PR_COURBE = 'cubic-bezier(.2,.8,.2,1)';
/* Naître du bloc : la carte part EXACTEMENT de la boîte du bloc (le même rectangle blanc sur le papier), grandit jusqu'à
   sa place, et son contenu paraît dans la seconde moitié — pendant l'élan, on ne lit pas un texte écrasé. */
function naitre(el, de) { if (mouvementReduit()) { dessinerLien(); return; }
  const r = el.getBoundingClientRect(); el.classList.add('pr-nait');
  const fin = () => { el.classList.remove('pr-nait'); dessinerLien(true); };
  if (!de || !r.width) { el.animate([{ opacity: 0, transform: 'translateY(8px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: PR_COURBE }).onfinish = fin; return; }
  const sx = Math.max(.03, de.width / r.width), sy = Math.max(.03, de.height / r.height), tx = de.left - r.left, ty = de.top - r.top;
  el.animate([{ transform: `translate(${tx}px,${ty}px) scale(${sx},${sy})`, opacity: .35 }, { opacity: 1, offset: .3 }, { transform: 'none', opacity: 1 }], { duration: 280, easing: PR_COURBE }).onfinish = fin;
  const fi = el.querySelector('#ba-equip'); if (fi) fi.animate([{ opacity: 0 }, { opacity: 0, offset: .4 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' }); }
// glisser d'une place à l'autre (un autre bloc cliqué) : la carte va de son ancienne boîte à la nouvelle
function glisser(el, avant) { if (mouvementReduit() || !avant) { dessinerLien(); return; } const r = el.getBoundingClientRect();
  el.animate([{ transform: `translate(${avant.left - r.left}px,${avant.top - r.top}px)` }, { transform: 'none' }], { duration: 300, easing: PR_COURBE });
  suivreLienPendant(320); }
/* Se résorber dans le bloc : la carte a déjà quitté l'application (fermée, comme avant : les gestes et les batteries
   n'attendent rien) ; c'est son double, sans identifiants, qui rentre dans le bloc et s'éteint. */
function resorber(el) { const de = el.getBoundingClientRect(), vers = rectDeLOrigine(); if (mouvementReduit() || !de.width) return;
  const f = el.cloneNode(true); f.removeAttribute('id'); f.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  f.classList.add('pr-fantome'); f.classList.remove('entre'); f.setAttribute('aria-hidden', 'true'); f.inert = true;
  Object.assign(f.style, { left: de.left + 'px', top: de.top + 'px', width: de.width + 'px', height: de.height + 'px' });
  document.body.appendChild(f);
  const fi = el.querySelector('.fi'), fi2 = f.querySelector('.fi'); if (fi && fi2) { fi2.classList.remove('fondu'); fi2.scrollTop = fi.scrollTop; fi2.animate([{ opacity: 1 }, { opacity: 0, offset: .45 }, { opacity: 0 }], { duration: 240, fill: 'forwards' }); }
  const anim = vers ? f.animate([{ transform: 'none', opacity: 1 }, { opacity: .9, offset: .55 }, { transform: `translate(${vers.left - de.left}px,${vers.top - de.top}px) scale(${Math.max(.03, vers.width / de.width)},${Math.max(.03, vers.height / de.height)})`, opacity: 0 }], { duration: 250, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' })
    : f.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(6px) scale(.98)' }], { duration: 180, easing: 'ease-in', fill: 'forwards' });
  anim.onfinish = () => f.remove(); }

/* ---- LE FIL qui relie la carte à son bloc ------------------------------------------------------------------------- */
function poserLeLien() { const s = document.createElementNS(SVGNS, 'svg'); s.id = 'pr-lien'; s.setAttribute('aria-hidden', 'true');
  s.innerHTML = '<path class="pr-l-trait"/><circle class="pr-l-bloc" r="3.5"/><circle class="pr-l-carte" r="3"/>'; document.body.appendChild(s); PR.lien = s;
  const q = document.createElement('div'); q.id = 'pr-quai'; q.setAttribute('aria-hidden', 'true'); q.innerHTML = '<span>Épingler ici</span>'; document.body.appendChild(q); PR.quai = q; }
// le point d'une boîte le plus proche d'un point donné
const auBord = (r, x, y) => ({ x: Math.max(r.left, Math.min(r.left + r.width, x)), y: Math.max(r.top, Math.min(r.top + r.height, y)) });
function dessinerLien(trace) { const s = PR.lien; if (!s) return; const el = $('inspecteur');
  const b = flottante() && !el.hidden && !el.classList.contains('pr-nait') ? rectDeLOrigine() : null;
  if (!b || (PR.origine && PR.origine.type === 'ecran')) { s.classList.remove('on'); return; }
  const c = el.getBoundingClientRect(), cb = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  // côté carte : à hauteur du bloc s'il est en face, sinon le coin le plus proche ; côté bloc : le point face à la carte
  const pc = auBord({ left: c.left, top: c.top + 20, width: c.width, height: Math.max(0, c.height - 40) }, cb.x, cb.y), pb = auBord(b, pc.x, pc.y);
  const dx = pc.x - pb.x, dy = pc.y - pb.y, L = Math.hypot(dx, dy);
  // le bloc sous la carte, ou collé contre elle : pas de fil
  if (L < 8 || (cb.x > c.left && cb.x < c.left + c.width && cb.y > c.top && cb.y < c.top + c.height)) { s.classList.remove('on'); return; }
  const h = Math.abs(dx) >= Math.abs(dy), k = .5;
  const d = h ? `M${pb.x},${pb.y} C${pb.x + dx * k},${pb.y} ${pc.x - dx * k},${pc.y} ${pc.x},${pc.y}` : `M${pb.x},${pb.y} C${pb.x},${pb.y + dy * k} ${pc.x},${pc.y - dy * k} ${pc.x},${pc.y}`;
  const t = s.querySelector('.pr-l-trait'); t.setAttribute('d', d);
  s.querySelector('.pr-l-bloc').setAttribute('cx', pb.x); s.querySelector('.pr-l-bloc').setAttribute('cy', pb.y);
  s.querySelector('.pr-l-carte').setAttribute('cx', pc.x); s.querySelector('.pr-l-carte').setAttribute('cy', pc.y);
  s.classList.add('on');
  // à la naissance, le fil se trace du bloc vers la carte
  if (trace && !mouvementReduit() && t.getTotalLength) { const n = t.getTotalLength(); t.animate([{ strokeDasharray: `${n} ${n}`, strokeDashoffset: n }, { strokeDasharray: `${n} ${n}`, strokeDashoffset: 0 }], { duration: 220, easing: PR_COURBE }); } }
function suivreLienPendant(ms) { const t0 = performance.now(); const pas = t => { dessinerLien(); if (t - t0 < ms) requestAnimationFrame(pas); }; requestAnimationFrame(pas); }

/* ---- L'ÉPINGLE : le volet d'hier, pour qui préfère ------------------------------------------------------------------- */
function epingler(oui, sansAnim) { PR.epingle = !!oui; try { localStorage.setItem('volta.fiche.epinglee', oui ? '1' : ''); } catch (_) { }
  const el = $('inspecteur'), b = document.body; if (el.hidden || !PR.dir) { b.classList.toggle('insp-epingle', PR.epingle); return; }
  const avant = el.getBoundingClientRect();
  b.classList.toggle('insp-flotte', !PR.epingle); b.classList.toggle('insp-epingle', PR.epingle);
  if (!PR.epingle && !sansAnim) { const m = mesurerCarte(), p = placerPres(rectDeLOrigine(), m.W, m.H); poserCarte(p.x, p.y); }
  majEpingle(); recadrerSiCache();
  if (!sansAnim && !mouvementReduit()) { const r = el.getBoundingClientRect();
    el.style.transformOrigin = '0 0';
    el.animate([{ transform: `translate(${avant.left - r.left}px,${avant.top - r.top}px) scale(${avant.width / r.width},${avant.height / r.height})` }, { transform: 'none' }], { duration: 300, easing: PR_COURBE });
    const fi = el.querySelector('#ba-equip'); if (fi) fi.animate([{ opacity: .2 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' }); }
  suivreLienPendant(340); }
const ICO_EPINGLE = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M14.5 4.5v15"/></svg>';
const ICO_DETACHER = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="7.5" width="12" height="12" rx="2"/><path d="M8.5 4.5h10a2 2 0 0 1 2 2v10"/></svg>';
function majEpingle() { const b = $('pr-epingle'); if (!b) return; const t = PR.epingle ? 'Détacher la fiche : une carte qu’on déplace' : 'Épingler la fiche à droite (le volet)';
  b.innerHTML = PR.epingle ? ICO_DETACHER : ICO_EPINGLE; b.title = t; b.setAttribute('aria-label', t); b.setAttribute('aria-pressed', String(PR.epingle)); }
// la barre de la fiche (ou de l'index) reçoit le bouton qui l'épingle, à côté de la croix ; un rendu la refait : on le remet
function garnirLaBarre() { if (!PR.dir || telephone()) { const x = $('pr-epingle'); if (x) x.remove(); return; }
  const box = $('ba-equip'), barre = box.querySelector(':scope > .fi-nav, :scope > .ix-tete'); if (!barre || barre.querySelector('#pr-epingle')) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'fi-x pr-epingle'; b.id = 'pr-epingle';
  b.onclick = e => { e.stopPropagation(); epingler(!PR.epingle); };
  const x = barre.querySelector('#in-fermer'); if (x) barre.insertBefore(b, x); else barre.appendChild(b); majEpingle(); }

/* ---- TENIR LA CARTE PAR SA BARRE ----------------------------------------------------------------------------------- */
function lierLaPrise() { const el = $('inspecteur');
  el.addEventListener('pointerdown', e => { if (!PR.dir || telephone() || e.button !== 0) return;
    const barre = e.target.closest && e.target.closest('.fi-nav, .ix-tete, .fi-symbole'); if (!barre || e.target.closest('button, input, select, a, textarea')) return;
    const r = el.getBoundingClientRect(); PR.prise = { dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, bouge: false };
    try { barre.setPointerCapture(e.pointerId); } catch (_) { } e.preventDefault(); });
  el.addEventListener('pointermove', e => { const p = PR.prise; if (!p) return;
    if (!p.bouge) { if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 4) return; p.bouge = true; document.body.classList.add('pr-tient');
      // épinglée, on la détache : elle redevient une carte, sa barre sous les doigts
      if (PR.epingle) { epingler(false, true); p.dx = Math.min(p.dx, PR_LARGEUR() - 40); } }
    poserCarte(e.clientX - p.dx, e.clientY - p.dy); dessinerLien();
    const quai = e.clientX > window.innerWidth - 56; document.body.classList.toggle('pr-quai-on', quai); });
  const lacher = () => { const p = PR.prise; PR.prise = null; if (!p || !p.bouge) return; document.body.classList.remove('pr-tient');
    const quai = document.body.classList.contains('pr-quai-on'); document.body.classList.remove('pr-quai-on');
    if (quai) { epingler(true); return; } PR.deplacee = true;
    // relâchée trop bas : elle remonte d'elle-même dans l'écran
    const r = el.getBoundingClientRect(), Z = zoneLibre(); poserCarte(r.left, Math.min(r.top, Math.max(Z.T, Z.B - Math.min(r.height, 160)))); dessinerLien(); };
  el.addEventListener('pointerup', lacher); el.addEventListener('pointercancel', lacher); }

/* ---- LES ENVELOPPES : l'interface d'hier, la carte en plus --------------------------------------------------------- */
const ouvrirInspecteurGraphite = ouvrirInspecteur, fermerInspecteurGraphite = fermerInspecteur, ouvrirFicheGraphite = ouvrirFiche;
const margesGraphite = marges, appliquerVueGraphite = appliquerVue, heroCalibreGraphite = heroCalibre;
ouvrirInspecteur = function () { const el = $('inspecteur');
  if (!PR.dir || telephone()) { document.body.classList.remove('insp-flotte', 'insp-epingle'); return ouvrirInspecteurGraphite(); }
  const etait = !el.hidden, avant = etait ? el.getBoundingClientRect() : null, vieille = PR.origine, depuisPlan = !!(PR.appui && Date.now() - PR.appui.t < 900);
  PR.origine = origineDeLaCible();
  document.body.classList.toggle('insp-flotte', !PR.epingle); document.body.classList.toggle('insp-epingle', PR.epingle);
  ouvrirInspecteurGraphite(); el.classList.remove('entre'); garnirLaBarre();
  if (PR.epingle) { if (!etait && !mouvementReduit()) { el.classList.add('entre'); } dessinerLien(); return; }
  const m = mesurerCarte(), b = rectDeLOrigine();
  if (!etait) { PR.deplacee = false; const p = placerPres(b, m.W, m.H); poserCarte(p.x, p.y); naitre(el, b); return; }
  // déjà ouverte : un autre bloc cliqué sur le plan, elle y va (sauf si on l'a posée à la main et qu'elle ne le cache pas)
  const meme = vieille && PR.origine && vieille.type === PR.origine.type && vieille.nom === PR.origine.nom && vieille.x === PR.origine.x;
  const cache = b && !(b.left > avant.right || b.left + b.width < avant.left || b.top > avant.bottom || b.top + b.height < avant.top);
  if (depuisPlan && !meme && (!PR.deplacee || cache)) { const p = placerPres(b, m.W, m.H); poserCarte(p.x, p.y); glisser(el, avant); }
  else { poserCarte(avant.left, avant.top); dessinerLien(); } };
fermerInspecteur = function () { const el = $('inspecteur');
  if (PR.dir && !el.hidden && flottante()) resorber(el);
  fermerInspecteurGraphite(); if (el.hidden) { document.body.classList.remove('insp-flotte'); PR.origine = null; dessinerLien(); } };
ouvrirFiche = function (...a) { const r = ouvrirFicheGraphite(...a); if ($('inspecteur').hidden) { document.body.classList.remove('insp-flotte'); dessinerLien(); } return r; };
/* Le plan qui glisse de lui-même (aller voir un repère depuis la recherche ou l'index : il se centre) peut amener le bloc
   sous la carte : à la fin du glissement, si on ne l'a pas posée à la main, elle s'écarte — elle ne cache jamais son bloc. */
const animerVueGraphite = animerVue;
animerVue = function (cible, doux) { animerVueGraphite(cible, doux); clearTimeout(PR.apresVue); PR.apresVue = setTimeout(eviterLeBloc, doux && !mouvementReduit() ? 300 : 30); };
function eviterLeBloc() { const el = $('inspecteur'); if (!flottante() || el.hidden || PR.deplacee || PR.prise || !PR.origine || PR.origine.type === 'ecran') return;
  const b = rectDeLOrigine(), c = el.getBoundingClientRect(); if (!b) return;
  if (b.left > c.right || b.left + b.width < c.left || b.top > c.bottom || b.top + b.height < c.top) return;
  const p = placerPres(b, c.width, c.height); poserCarte(p.x, p.y); glisser(el, c); }
// la carte flottante ne prend rien au plan : il garde toute la table
marges = function () { const m = margesGraphite(); if (flottante() && !$('inspecteur').hidden && $('fiche').hidden && !telephone()) m.droite = 24; return m; };
appliquerVue = function () { appliquerVueGraphite(); parallaxe(); dessinerLien(); };

/* ---- LE CALIBRE, redessiné ------------------------------------------------------------------------------------------ */
/* Ce que chaque direction dit du calibre retenu, sans pastille et sans mot de trop (le lecteur, v62 : « passe ou passe
   pas, pas besoin : on comprend que ça passe ») : le nombre et son unité, à la même taille ; la GAMME jugée calibre par
   calibre — ce qui passe, le serré (il passe sans la marge), ce qui ne passe pas — et le retenu posé dedans : dans la
   part verte, il passe, cela se voit ; ailleurs, le nombre se teinte et le dit en clair (`.dj-h-ko`, la phrase d'avant).
   La charge (le permanent, la pointe) dit la marge. Un calibre qui passe se retient d'un clic (le geste « retenir »). */
function lireCalibre(nom, d) { const cal = d.calibre, v = verdictDuRetenu(d), best = d.passe || null;
  const cat = [...new Set((d.catalogue && d.catalogue.length ? d.catalogue : (d.gamme || []).map(g => g.calibre)).concat(cal > 0 ? [cal] : []))].filter(x => x > 0).sort((a, b) => a - b);
  const etatDe = c => { const g = (d.gamme || []).find(x => x.calibre === c); if (!g || g.valide == null) return 'inconnu'; return g.valide === true && g.marge ? 'passe' : g.valide === true ? 'serre' : 'non'; };
  const pts = d.points || [], perm = (pts.find(p => p.t === Infinity) || {}).i, pointes = pts.filter(p => p.t !== Infinity && p.i > 0).map(p => p.i);
  const ko = v.etat === 'ko' ? (!(cal > 0) || (!best && !d.sansProfil) ? 'aucun calibre de la gamme ne passe' : 'ne passe pas — ' + v.raison.replace(/\.$/, '').toLowerCase()) : '';
  const famille = (d.famille && (d.famille.famille || d.famille.nom)) || d.courbe || '';
  return { cal, v, best, cat, etatDe, perm: perm > 0 ? perm : null, pointe: pointes.length ? Math.max(...pointes) : null, ko, famille }; }
const prNombre = x => esc(nombre(Math.round(x * 100) / 100));
const prBulleCal = (C, c) => { const e = C.etatDe(c); return amperes(c) + (e === 'passe' ? ' — passe' : e === 'serre' ? ' — serré : passe sans la marge' : e === 'non' ? ' — ne passe pas' : '') + (c === C.best ? ' · le plus petit qui passe' : '') + (c === C.cal ? ' · retenu' : e === 'passe' ? ' · un clic le retient' : ''); };
// un cran de la gamme : un bouton quand il passe (un clic le retient), sinon une marque
const prCran = (C, c, cls, contenu, attrs) => { const e = C.etatDe(c), on = c === C.cal, peut = e === 'passe' && !on;
  return `<${peut ? 'button type="button" data-dj-geste="retenir"' : 'span'}${attrs ? ' ' + attrs : ''} class="${cls} ${e}${on ? ' retenu' : ''}${c === C.best ? ' ideal' : ''}" data-cal="${c}" title="${escA(prBulleCal(C, c))}">${contenu}</${peut ? 'button' : 'span'}>`; };
// la charge : deux valeurs, leur mot dessous ; la pastille de couleur relie chacune à son trait (le cadran)
const prStats = C => [C.perm ? `<span class="pr-stat perm"><b>${prNombre(C.perm)}<small>A</small></b><span><i aria-hidden="true"></i>permanent</span></span>` : '', C.pointe ? `<span class="pr-stat pointe"><b>${prNombre(C.pointe)}<small>A</small></b><span><i aria-hidden="true"></i>en pointe</span></span>` : ''].join('');
const prKo = C => C.ko ? `<span class="dj-h-ko">${esc(C.ko)}</span>` : '';
const prChiffre = C => `<b class="dj-h-cal">${C.cal ? prNombre(C.cal) + '<span class="dj-h-u">A</span>' : '—'}</b>`;
const prOuvre = (C, cls) => `<div class="dj-heros pr-cal ${cls} ${C.v.etat || 'neutre'}"${C.v.raison ? ` title="${escA(C.v.raison)}"` : ''}>`;

/* A · AUBE — la typographie et la règle : le nombre en grand, l'unité à sa taille d'une encre cuivrée ; à droite la
   charge ; dessous, la gamme en règle graduée — la part qui passe d'un trait vert, le retenu marqué d'un curseur cuivre.
   Le curseur dans le vert, au plus près de son début : on a pris le plus petit qui passe. */
function herosAube(C) { const n = C.cat.length, etats = C.cat.map(c => C.etatDe(c)), i0 = etats.indexOf('passe'), i1 = etats.lastIndexOf('passe'), pos = i => n > 1 ? (i / (n - 1)) * 100 : 50;
  const vert = i0 >= 0 ? `<i class="pr-r-passe" style="left:${pos(i0)}%;right:${100 - pos(i1)}%"></i>` : '';
  return prOuvre(C, 'pr-cal-a')
    + `<div class="pr-a-tete"><div class="pr-a-nombre">${prChiffre(C)}<span class="pr-q"></span></div><div class="pr-stats">${prStats(C)}</div></div>`
    + (C.ko ? `<div class="pr-a-ko">${prKo(C)}</div>` : '')
    + (n ? `<div class="pr-regle" role="group" aria-label="${escA('La gamme ' + C.famille)}"><span class="pr-r-axe"></span>${vert}`
      + C.cat.map((c, i) => prCran(C, c, 'pr-r-cran', `<i class="pr-r-tic"></i><span class="pr-r-n">${prNombre(c)}</span>`, `style="left:${pos(i)}%"`)).join('') + '</div>' : '')
    + (C.famille ? `<div class="pr-a-pied">Gamme ${esc(C.famille)}</div>` : '') + '</div>'; }

/* B · NUIT BLEUE — le cadran : la gamme sur un arc (de 0 au plus gros calibre), la part qui passe en vert ; à
   l'intérieur, la charge (le permanent plein, la pointe en voile) ; le retenu, un index ; le nombre au centre, comme un
   instrument de bord. L'index sur le vert, la charge loin derrière : il passe, avec de la marge. */
function herosNuit(C) { const max = C.cat.length ? C.cat[C.cat.length - 1] : (C.cal || 1), A0 = 150, BAL = 240, R = 62, R2 = 50, cx = 80, cy = 78;
  const ang = v => (A0 + BAL * Math.max(0, Math.min(1, v / max))) * Math.PI / 180, P = (v, r) => [cx + r * Math.cos(ang(v)), cy + r * Math.sin(ang(v))].map(z => z.toFixed(2));
  const arc = (a, b, r) => { if (b <= a) return ''; const [x1, y1] = P(a, r), [x2, y2] = P(b, r), large = (b - a) / max * BAL > 180 ? 1 : 0; return `M${x1} ${y1}A${r} ${r} 0 ${large} 1 ${x2} ${y2}`; };
  const i0 = C.cat.find(c => C.etatDe(c) === 'passe'), serre = C.cat.filter(c => C.etatDe(c) === 'serre');
  const crans = C.cat.map(c => { const [x1, y1] = P(c, R + 4), [x2, y2] = P(c, R - 4), [tx, ty] = P(c, R + 15), e = C.etatDe(c);
    return `<line class="pr-d-cran ${e}${c === C.cal ? ' retenu' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><text class="pr-d-n ${e}${c === C.cal ? ' retenu' : ''}" x="${tx}" y="${ty}">${prNombre(c)}</text>`; }).join('');
  const [ix, iy] = C.cal ? P(C.cal, R) : [0, 0];
  const svg = `<svg class="pr-cadran" viewBox="-4 -6 168 152" aria-hidden="true"><path class="pr-d-piste" d="${arc(0, max, R)}"/>`
    + (i0 ? `<path class="pr-d-passe" d="${arc(i0, max, R)}"/>` : '') + serre.map(c => `<path class="pr-d-serre" d="${arc(Math.max(0, c - max * .012), Math.min(max, c + max * .012), R)}"/>`).join('')
    + `<path class="pr-d-piste2" d="${arc(0, max, R2)}"/>` + (C.pointe ? `<path class="pr-d-pointe" d="${arc(0, Math.min(max, C.pointe), R2)}"/>` : '') + (C.perm ? `<path class="pr-d-perm" d="${arc(0, Math.min(max, C.perm), R2)}"/>` : '')
    + crans + (C.cal ? `<circle class="pr-d-index" cx="${ix}" cy="${iy}" r="5.5"/>` : '') + '</svg>';
  return prOuvre(C, 'pr-cal-b')
    + `<div class="pr-b-cadran">${svg}<div class="pr-b-centre">${prChiffre(C)}</div></div>`
    + `<div class="pr-b-droite">${prKo(C)}<div class="pr-stats">${prStats(C)}</div>`
    + `<div class="pr-b-pied">${C.famille ? `<span>Gamme ${esc(C.famille)}</span>` : ''}<span class="pr-q"></span></div></div></div>`; }

/* C · ARDOISE — le cartouche : le calibre et la charge dans deux cases au filet d'encre, comme le cartouche du folio, une
   arête de la couleur de l'état sur son bord ; dessous, la gamme en cases — hachuré ce qui ne passe pas, l'ambre le
   serré, un trait vert sous ce qui passe, le retenu plein d'encre. Une pièce de dessin technique, posée dans la fiche. */
function herosArdoise(C) {
  return prOuvre(C, 'pr-cal-c')
    + `<div class="pr-c-haut"><div class="pr-c-case pr-c-cal"><span class="pr-c-k">Calibre retenu<span class="pr-q"></span></span>${prChiffre(C)}</div>`
    + `<div class="pr-c-case pr-c-charge"><span class="pr-c-k">Charge</span><div class="pr-stats">${prStats(C)}</div>${prKo(C)}</div></div>`
    + (C.cat.length ? `<div class="pr-c-gamme" style="grid-template-columns:repeat(${C.cat.length},minmax(0,1fr))" role="group" aria-label="${escA('La gamme ' + C.famille)}">${C.cat.map(c => prCran(C, c, 'pr-c-g', `<span>${prNombre(c)}</span>`)).join('')}</div>` : '')
    + (C.famille ? `<div class="pr-c-pied">Gamme ${esc(C.famille)}</div>` : '') + '</div>'; }

heroCalibre = function (nom, d, o) { const html = heroCalibreGraphite(nom, d, o); if (!PR.dir) return html;
  try { const C = lireCalibre(nom, d), t = document.createElement('template'); t.innerHTML = html;
    const h = t.content.querySelector('.dj-heros'); if (!h) return html;
    const q = h.querySelector('.fi-q'), n = document.createElement('template');
    n.innerHTML = PR.dir === 'aube' ? herosAube(C) : PR.dir === 'nuit' ? herosNuit(C) : herosArdoise(C);
    const neuf = n.content.firstElementChild, place = neuf.querySelector('.pr-q'); if (place) { if (q) place.replaceWith(q); else place.remove(); }
    h.replaceWith(neuf); return t.innerHTML; } catch (e) { return html; } };

/* ---- LE MENU : choisir la direction (⋮ › Plus) ---------------------------------------------------------------------- */
function poserLeChoix() { const p = $('mp-plus'); if (!p) return; const bloc = document.createElement('div'); bloc.className = 'menu-bloc pr-choix'; bloc.setAttribute('role', 'group'); bloc.setAttribute('aria-label', 'Direction visuelle (prototype)');
  bloc.innerHTML = '<div class="pr-choix-t">Direction visuelle · prototype</div>' + [['', 'Graphite', 'aujourd’hui'], ['aube', 'Aube', 'clair, perle et cuivre'], ['nuit', 'Nuit bleue', 'encre bleu nuit, verre'], ['ardoise', 'Ardoise', 'la table technique']].map(([k, t, s]) =>
    `<button role="menuitem" data-pr-direction="${k}" data-aide="${escA('L’application habillée en « ' + t + ' » : ' + s + '. La fiche naît du bloc cliqué (sauf Graphite).')}"><span class="pr-choix-pastille" data-d="${k || 'graphite'}" aria-hidden="true"></span><span class="menu-l">${t}<small>${s}</small></span></button>`).join('');
  p.appendChild(bloc);
  bloc.addEventListener('click', e => { const b = e.target.closest('[data-pr-direction]'); if (!b) return; fermerMenu(); appliquerDirection(b.dataset.prDirection, true); dire('Direction ' + (DIRECTIONS[PR.dir] || 'Graphite') + '.'); });
  marquerMenuDirection(); }
function marquerMenuDirection() { document.querySelectorAll('[data-pr-direction]').forEach(b => b.setAttribute('aria-current', String(b.dataset.prDirection === PR.dir))); }

/* ---- DÉMARRER ------------------------------------------------------------------------------------------------------- */
(function demarrerPrototype() {
  const d = directionDemandee();
  poserLaTable(); poserLeLien(); lierLaPrise(); if (PR.essai) poserLeChoix();
  try { PR.epingle = localStorage.getItem('volta.fiche.epinglee') === '1'; } catch (_) { }
  // l'endroit du dernier appui sur la planche : la fiche d'un câble naît de là
  $('planche').addEventListener('pointerdown', e => { PR.appui = { x: e.clientX, y: e.clientY, t: Date.now() }; }, true);
  // un rendu refait la barre de la fiche : le bouton de l'épingle y revient
  new MutationObserver(() => garnirLaBarre()).observe($('ba-equip'), { childList: true });
  // la fiche cachée par un autre chemin (un document, la bibliothèque) : le fil s'en va avec elle
  new MutationObserver(() => { if ($('inspecteur').hidden) { document.body.classList.remove('insp-flotte'); dessinerLien(); } }).observe($('inspecteur'), { attributes: true, attributeFilter: ['hidden'] });
  window.addEventListener('resize', () => { const el = $('inspecteur'); if (!el.hidden && flottante()) { const r = el.getBoundingClientRect(); poserCarte(r.left, r.top); } dessinerLien(); });
  appliquerDirection(d);
})();
