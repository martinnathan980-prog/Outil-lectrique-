/* ===========================================================================
   08 octies — L'ACCUEIL
   La table vide est une page d'entrée : ce que l'outil fait, par où l'on
   commence. Tout y est écrit dans la page (page.html, `#vide`) ; ici
   seulement le geste que la page ne sait pas faire seule — la zone de dépôt
   (`#vd-zone`) qui, cliquée ou validée au clavier, ouvre le choix de fichier
   (le dépôt lui-même est pris par `lierDepot`, sur toute la fenêtre).
   `rendreAccueil()` est appelée par l'interface à chaque synchronisation :
   elle ne lie qu'une fois et ne coûte rien ensuite. « Reprendre »
   (`#vd-reprendre`) est montré et rempli par `synchroniserContexte`.
   =========================================================================== */
'use strict';

function rendreAccueil() { const zone = $('vd-zone'); if (!zone || zone.dataset.lie) return; zone.dataset.lie = '1';
  const choisir = () => { const f = $('fichier'); if (f) f.click(); };
  zone.addEventListener('click', choisir);
  zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choisir(); } }); }
