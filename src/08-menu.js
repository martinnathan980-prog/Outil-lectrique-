/* ===========================================================================
   08 — LES BULLES DU CHROME : le menu ⋮, le rail, la barre du haut, la barre des folios
   Chaque ligne du menu dit ce qu'elle fait, en une ou deux phrases : ses mots sont écrits dans page.html (`data-aide`) ;
   ici, la typographie française qu'un attribut n'a pas d'office, la même phrase pour un lecteur d'écran, et la bulle
   posée à gauche du menu. Chaque outil du rail, de la barre du haut et de la barre des folios porte sa bulle (un `.bulle`
   dans son bouton) : ici, QUAND elle paraît. Le clavier du menu et ses sous-menus : 08-interface, `lierMenu`.
   =========================================================================== */
'use strict';

/* LA RÈGLE DU TEMPS, une pour toutes les bulles du chrome (le panel v73 : le designer, § 5.4 ; l'ergonome) :
     · la première paraît après 400 ms de survol — une main qui passe ne fait rien clignoter ;
     · tant qu'une bulle vient de s'éteindre (`--bulle-chaude`, 1,2 s), la suivante paraît TOUT DE SUITE : on balaie le
       rail, les noms se suivent, comme sur macOS ;
     · au clavier, tout de suite — sauf quand le clavier est RENDU par programme (Échap ferme le menu et rend le clavier
       au ⋮ : sa bulle couvrait la croix du document ouvert ; `rendreLeClavier`) ;
     · au premier appui elle s'éteint, et se tait jusqu'à ce que la main quitte le bouton (elle couvrait ce que le clic
       venait d'ouvrir).
   Un bouton qui porte une `.bulle` enfant — le rail, la barre du haut, les folios, la visionneuse d'un PDF, la feuille des
   raccourcis — la montre par la classe `.bulle-on` (style.css). Juste avant de paraître, la bulle prévient son bouton
   (l'événement `bulle`) : il peut l'écrire à ce moment-là (↶ et ↷ disent ce qu'ils feraient, 08-interface). */
const BULLES = { vise: null, attend: null, tempo: 0, chaud: 0, muette: null, taire: null, lie: false };
const DELAI_BULLE = 400, BULLE_CHAUDE = 1200;
const bulleChaude = () => Date.now() < BULLES.chaud;
const bulleEteinte = () => { BULLES.chaud = Date.now() + BULLE_CHAUDE; };
// rendre le clavier à un bouton sans faire paraître sa bulle (Échap, la fermeture d'une feuille)
function rendreLeClavier(el) { if (!el || !el.focus) return; BULLES.taire = el; try { el.focus({ preventScroll: true }); } catch (_) { el.focus(); }
  setTimeout(() => { if (BULLES.taire === el) BULLES.taire = null; }, 0); }
function lierBullesDuChrome() { if (BULLES.lie) return; BULLES.lie = true;
  const porteur = t => { const b = t && t.closest ? t.closest('button, [role="button"]') : null; return b && b.querySelector(':scope > .bulle') ? b : null; };
  const eteindre = b => { if (!b) return; if (b.classList.contains('bulle-on')) bulleEteinte(); b.classList.remove('bulle-on'); if (BULLES.vise === b) BULLES.vise = null; };
  const montrer = b => { clearTimeout(BULLES.tempo); BULLES.attend = null; if (BULLES.vise && BULLES.vise !== b) eteindre(BULLES.vise);
    if (b.disabled || !b.isConnected) return; b.dispatchEvent(new CustomEvent('bulle')); b.classList.add('bulle-on'); BULLES.vise = b; };
  const attendre = () => { clearTimeout(BULLES.tempo); BULLES.attend = null; };
  document.addEventListener('pointerover', e => { if (e.pointerType === 'touch') return; const b = porteur(e.target); if (!b || b === BULLES.vise || b === BULLES.attend) return;
    attendre(); if (BULLES.vise) eteindre(BULLES.vise); if (b === BULLES.muette) return;
    // sur le rail replié, la bulle attend toujours : le rail se déplie avant elle (250 ms), elle paraît déjà dans sa forme
    // dépliée — sinon elle changerait de texte sous les yeux
    const rail = b.closest('#rail'), attendLeRail = rail && !rail.classList.contains('deplie') && matchMedia('(min-width: 701px) and (hover: hover)').matches;
    if (bulleChaude() && !attendLeRail) montrer(b); else { BULLES.attend = b; BULLES.tempo = setTimeout(() => { BULLES.attend = null; if (b.matches(':hover')) montrer(b); }, DELAI_BULLE); } }, true);
  document.addEventListener('pointerout', e => { const b = porteur(e.target); if (!b || b.contains(e.relatedTarget)) return; if (BULLES.muette === b) BULLES.muette = null;
    if (BULLES.attend === b) attendre(); if (b === BULLES.vise && !b.matches(':focus-visible')) eteindre(b); }, true);
  document.addEventListener('pointerdown', e => { attendre(); if (BULLES.vise) eteindre(BULLES.vise); BULLES.muette = porteur(e.target); }, true);
  document.addEventListener('focusin', e => { const b = porteur(e.target); if (!b || e.target !== b) return; if (BULLES.taire === b) { BULLES.taire = null; return; } if (b.matches(':focus-visible')) montrer(b); });
  document.addEventListener('focusout', e => { const b = porteur(e.target); if (b && b === BULLES.vise && !b.matches(':hover')) eteindre(b); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && BULLES.vise) eteindre(BULLES.vise); }, true);
  window.addEventListener('scroll', () => { if (BULLES.vise) eteindre(BULLES.vise); }, { capture: true, passive: true }); }

/* LE MENU ⋮. La typographie française (une espace insécable avant « : ; ? ! » — un attribut n'est pas du texte,
   `typographieVivante` ne le voit pas), et la même phrase pour un lecteur d'écran (`aria-describedby`). La bulle est UNE
   (`#menu-bulle`, posée sur la page, pas dans le menu) : le menu peut défiler quand il ne tient pas dans l'écran sans la
   rogner. Elle se pose à gauche du menu, à la hauteur de la ligne — dans un sous-menu comme dans le menu —, après 300 ms
   de survol (on traverse le menu sans qu'elle clignote ; d'une ligne à l'autre, ou juste après une autre bulle, elle suit
   aussitôt), tout de suite au clavier ; un appui l'éteint. */
function lierBullesDuMenu() { const m = $('menu'); if (!m || $('menu-bulle')) return; const boite = document.createElement('div'); boite.hidden = true; boite.id = 'menu-aides'; m.after(boite);
  m.querySelectorAll('button[data-aide]').forEach(b => { b.dataset.aide = typo(b.dataset.aide); const s = document.createElement('span'), id = 'aide-' + (b.dataset.act || b.dataset.sous);
    s.id = id; s.textContent = b.dataset.aide; boite.appendChild(s); b.setAttribute('aria-describedby', id); });
  const bulle = document.createElement('div'); bulle.id = 'menu-bulle'; bulle.className = 'menu-bulle'; bulle.setAttribute('aria-hidden', 'true'); document.body.appendChild(bulle);
  let tempo = 0;
  const cacher = () => { clearTimeout(tempo); if (bulle.classList.contains('on')) bulleEteinte(); bulle.classList.remove('on'); };
  const montrer = (b, vite) => { clearTimeout(tempo); tempo = setTimeout(() => { if (m.hidden || !b.isConnected || !b.offsetParent) return;
    bulle.textContent = b.dataset.aide; bulle.classList.add('on'); const r = b.getBoundingClientRect(), g = m.getBoundingClientRect(), h = bulle.offsetHeight;
    bulle.style.right = Math.round(innerWidth - g.left + 12) + 'px'; bulle.style.top = Math.round(Math.max(8, Math.min(r.top + r.height / 2 - 16, innerHeight - h - 8))) + 'px'; }, vite ? 0 : 300); };
  m.addEventListener('pointerover', e => { const b = e.target.closest && e.target.closest('button'); if (e.pointerType === 'touch') return;
    if (!b || !b.dataset.aide) { cacher(); return; } montrer(b, bulle.classList.contains('on') || bulleChaude()); });
  m.addEventListener('pointerleave', cacher); m.addEventListener('pointerdown', cacher); m.addEventListener('scroll', cacher, { passive: true });
  m.addEventListener('focusin', e => { const b = e.target.closest && e.target.closest('button[data-aide]'); if (b && b.matches(':focus-visible')) montrer(b, true); else if (!b) cacher(); });
  m.addEventListener('focusout', e => { if (!m.contains(e.relatedTarget)) cacher(); });
  new MutationObserver(() => { if (m.hidden) cacher(); }).observe(m, { attributes: true, attributeFilter: ['hidden'] }); }
