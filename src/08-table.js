/* ===========================================================================
   08 — LA TABLE : le fond qui vit, à peine (v72, « Nuit bleue »)
   Le lecteur : « un fond pas que noir, un peu dégradé, un petit peu interactif, qui bouge comme une application un peu
   futuriste — mais pas trop, pas m'as-tu-vu ». La table est en quatre couches, sous tout (page.html, `#table` ; leurs
   dessins sont des jetons de style.css, leur conduite dans style-table.css) : l'encre bleu nuit dégradée, une lumière
   qui RESPIRE très lentement, les points, et une LUEUR froide qui suit la souris de loin.
   SOBRE (l'audit de fluidité : telle quelle, la table brûlait un cœur entier quand on ne faisait rien — 100 % contre 1 %
   —, et doublait le coût de chaque image d'un geste, en rendu logiciel) :
   · le souffle ne respire que quand on est là — la souris ou le clavier, et six secondes après — et que la table se
     voit ; il se fige au repos, pendant un geste (glisser le plan, la molette, tenir un bloc), sous une feuille qui prend
     la page. Il respire en opacité seule (un calque plein écran agrandi se rééchantillonnait à chaque image) ;
   · la lueur rattrape la souris en un tiers de seconde et s'arrête avec elle ; pendant un geste, elle attend ;
   · la parallaxe des points glisse le calque (un `transform`, que le compositeur déplace), elle ne repeint plus l'écran ;
   · le mouvement réduit coupe tout ; au doigt, pas de lueur.
   =========================================================================== */
'use strict';

const TABLE = { x: 0, y: 0, vx: 0, vy: 0, anim: 0, vue: false, eveil: 0, geste: 0 };
const TABLE_PARALLAXE = .1, TABLE_PAS = 24;   // les points, un tous les 24 px : leur parallaxe glisse modulo un pas
const TABLE_EVEIL = 6000;                     // le souffle respire tant qu'on est là, et six secondes après
function lierTable() { const t = $('table'), el = t && t.querySelector('.ta-lueur'); if (!el) return;
  TABLE.x = TABLE.vx = window.innerWidth * .7; TABLE.y = TABLE.vy = window.innerHeight * .3;
  const poser = () => { el.style.transform = `translate3d(${TABLE.vx.toFixed(1)}px,${TABLE.vy.toFixed(1)}px,0)`; };
  // elle rattrape la souris d'un cinquième du chemin par image (un tiers de seconde), puis s'arrête
  const pas = () => { TABLE.vx += (TABLE.x - TABLE.vx) * .2; TABLE.vy += (TABLE.y - TABLE.vy) * .2; poser();
    TABLE.anim = Math.abs(TABLE.x - TABLE.vx) + Math.abs(TABLE.y - TABLE.vy) > .8 ? requestAnimationFrame(pas) : 0; };
  // on est là : le souffle respire ; six secondes sans rien, il se fige où il en est
  const reveiller = () => { if (mouvementReduit() || document.hidden) return; if (!t.classList.contains('respire')) t.classList.add('respire');   // (ajouter une classe déjà là réécrit l'attribut : un restyle à chaque mouvement)
    clearTimeout(TABLE.eveil); TABLE.eveil = setTimeout(() => t.classList.remove('respire'), TABLE_EVEIL); };
  // un geste (un appui, la molette, un glisser) : le souffle et la lueur attendent qu'il finisse
  const geste = () => { if (!t.classList.contains('geste')) t.classList.add('geste'); clearTimeout(TABLE.geste); TABLE.geste = setTimeout(() => t.classList.remove('geste'), 350); };
  window.addEventListener('pointermove', e => { reveiller(); if (e.buttons) { geste(); return; }
    if (mouvementReduit() || e.pointerType === 'touch') return; TABLE.x = e.clientX; TABLE.y = e.clientY;
    if (!TABLE.vue) { TABLE.vue = true; t.classList.add('vue'); } if (!TABLE.anim) TABLE.anim = requestAnimationFrame(pas); }, { passive: true });
  window.addEventListener('pointerdown', geste, { passive: true, capture: true });
  window.addEventListener('wheel', () => { reveiller(); geste(); }, { passive: true, capture: true });
  window.addEventListener('keydown', reveiller, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { t.classList.remove('respire'); if (TABLE.anim) { cancelAnimationFrame(TABLE.anim); TABLE.anim = 0; } } });
  document.addEventListener('pointerleave', () => { TABLE.vue = false; t.classList.remove('vue'); });
  poser(); }
// appelée à chaque vue posée (08-interface, `appliquerVue`) : les points glissent d'un dixième, modulo leur pas
function parallaxeTable() { const p = document.querySelector('#table .ta-points'); if (!p) return;
  if (mouvementReduit()) { if (p.style.transform) p.style.transform = ''; return; }
  const m = v => (((v * TABLE_PARALLAXE) % TABLE_PAS) + TABLE_PAS) % TABLE_PAS;
  p.style.transform = `translate3d(${m(app.vue.tx).toFixed(1)}px,${m(app.vue.ty).toFixed(1)}px,0)`; }
