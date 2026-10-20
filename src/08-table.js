/* ===========================================================================
   08 — LA TABLE : le fond qui vit, à peine (v72, « Nuit bleue »)
   Le lecteur : « un fond pas que noir, un peu dégradé, un petit peu interactif, qui bouge comme une application un peu
   futuriste — mais pas trop, pas m'as-tu-vu ». La table est en quatre couches, sous tout (page.html, `#table` ; leurs
   dessins sont des jetons de style.css) : l'encre bleu nuit dégradée, une lumière qui respire très lentement (16 s, en
   CSS), les points, et une LUEUR froide qui suit la souris de loin. Ce module fait les deux mouvements que le CSS ne sait
   pas faire : la lueur qui rattrape la souris en douceur (puis s'arrête : rien ne tourne quand la main ne bouge pas), et
   la PARALLAXE — les points glissent d'un dixième de ce que glisse la feuille, qui paraît posée au-dessus de la table.
   Le mouvement réduit coupe tout ; au doigt, pas de lueur.
   =========================================================================== */
'use strict';

const TABLE = { x: 0, y: 0, vx: 0, vy: 0, anim: 0, vue: false };
const TABLE_PARALLAXE = .1;
function lierTable() { const t = $('table'), el = t && t.querySelector('.ta-lueur'); if (!el) return;
  TABLE.x = TABLE.vx = window.innerWidth * .7; TABLE.y = TABLE.vy = window.innerHeight * .3;
  const poser = () => { el.style.transform = `translate3d(${TABLE.vx.toFixed(1)}px,${TABLE.vy.toFixed(1)}px,0)`; };
  // elle rattrape la souris d'un quinzième du chemin par image, puis s'arrête
  const pas = () => { TABLE.vx += (TABLE.x - TABLE.vx) * .065; TABLE.vy += (TABLE.y - TABLE.vy) * .065; poser();
    TABLE.anim = Math.abs(TABLE.x - TABLE.vx) + Math.abs(TABLE.y - TABLE.vy) > .6 ? requestAnimationFrame(pas) : 0; };
  window.addEventListener('pointermove', e => { if (mouvementReduit() || e.pointerType === 'touch') return; TABLE.x = e.clientX; TABLE.y = e.clientY;
    if (!TABLE.vue) { TABLE.vue = true; t.classList.add('vue'); } if (!TABLE.anim) TABLE.anim = requestAnimationFrame(pas); }, { passive: true });
  document.addEventListener('pointerleave', () => { TABLE.vue = false; t.classList.remove('vue'); });
  poser(); }
// appelée à chaque vue posée (08-interface, `appliquerVue`)
function parallaxeTable() { const p = document.querySelector('#table .ta-points'); if (!p) return;
  p.style.backgroundPosition = mouvementReduit() ? '' : `${(app.vue.tx * TABLE_PARALLAXE).toFixed(1)}px ${(app.vue.ty * TABLE_PARALLAXE).toFixed(1)}px`; }
