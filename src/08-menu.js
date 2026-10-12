/* ===========================================================================
   08 — LES BULLES DU MENU ⋮
   Chaque ligne du menu dit ce qu'elle fait, en une ou deux phrases : ses
   mots sont écrits dans page.html (`data-aide`) ; ici, la typographie
   française qu'un attribut n'a pas d'office, la même phrase pour un lecteur
   d'écran, et la bulle posée à gauche du menu. Le clavier du menu et ses
   sous-menus : 08-interface, `lierMenu`.
   =========================================================================== */
'use strict';

/* La typographie française (une espace insécable avant « : ; ? ! » — un attribut n'est pas du texte, `typographieVivante`
   ne le voit pas), et la même phrase pour un lecteur d'écran (`aria-describedby`). La bulle est UNE (`#menu-bulle`, posée
   sur la page, pas dans le menu) : le menu peut défiler quand il ne tient pas dans l'écran sans la rogner. Elle se pose à
   gauche du menu, à la hauteur de la ligne — dans un sous-menu comme dans le menu —, après 300 ms de survol (on traverse
   le menu sans qu'elle clignote ; d'une ligne à l'autre, elle suit aussitôt), tout de suite au clavier. */
function lierBullesDuMenu() { const m = $('menu'); if (!m || $('menu-bulle')) return; const boite = document.createElement('div'); boite.hidden = true; boite.id = 'menu-aides'; m.after(boite);
  m.querySelectorAll('button[data-aide]').forEach(b => { b.dataset.aide = typo(b.dataset.aide); const s = document.createElement('span'), id = 'aide-' + (b.dataset.act || b.dataset.sous);
    s.id = id; s.textContent = b.dataset.aide; boite.appendChild(s); b.setAttribute('aria-describedby', id); });
  const bulle = document.createElement('div'); bulle.id = 'menu-bulle'; bulle.className = 'menu-bulle'; bulle.setAttribute('aria-hidden', 'true'); document.body.appendChild(bulle);
  let tempo = 0;
  const cacher = () => { clearTimeout(tempo); bulle.classList.remove('on'); };
  const montrer = (b, vite) => { clearTimeout(tempo); tempo = setTimeout(() => { if (m.hidden || !b.isConnected || !b.offsetParent) return;
    bulle.textContent = b.dataset.aide; bulle.classList.add('on'); const r = b.getBoundingClientRect(), g = m.getBoundingClientRect(), h = bulle.offsetHeight;
    bulle.style.right = Math.round(innerWidth - g.left + 12) + 'px'; bulle.style.top = Math.round(Math.max(8, Math.min(r.top + r.height / 2 - 16, innerHeight - h - 8))) + 'px'; }, vite ? 0 : 300); };
  m.addEventListener('pointerover', e => { const b = e.target.closest && e.target.closest('button'); if (e.pointerType === 'touch') return;
    if (!b || !b.dataset.aide) { cacher(); return; } montrer(b, bulle.classList.contains('on')); });
  m.addEventListener('pointerleave', cacher); m.addEventListener('scroll', cacher, { passive: true });
  m.addEventListener('focusin', e => { const b = e.target.closest && e.target.closest('button[data-aide]'); if (b && b.matches(':focus-visible')) montrer(b, true); else if (!b) cacher(); });
  m.addEventListener('focusout', e => { if (!m.contains(e.relatedTarget)) cacher(); });
  new MutationObserver(() => { if (m.hidden) cacher(); }).observe(m, { attributes: true, attributeFilter: ['hidden'] }); }
