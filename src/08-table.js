/* ===========================================================================
   08 — LA TABLE VIVANTE (v73, « Nuit bleue » sublimée)
   Le lecteur (v72) : « un fond pas que noir, un peu dégradé, un petit peu interactif, qui bouge comme une application un
   peu futuriste — mais pas trop, pas m'as-tu-vu ». Puis (v73) : « le fond est statique, sauf la lumière qui suit la souris :
   il doit bouger un peu ». La table vit donc, doucement, même quand la main se repose — et s'endort quand on n'est plus là.
   Ses couches (page.html `#table`, leur dessin dans style-table.css), de bas en haut :
   · le FOND, l'encre bleu nuit dégradée (la lumière du coin haut-droit) : immobile ;
   · deux NAPPES de lumière qui DÉRIVENT — translation seule, sur des périodes premières entre elles (47 s et 61 s : ça ne
     se répète jamais à l'œil), ±4 vw et ±3 vh ; la seconde respire aussi (24 s, son opacité seule). Elles remplacent le
     souffle d'avant. Écrites à 10 Hz, pas à 60 : à quelques pixels par seconde l'œil ne voit pas la différence, et deux
     calques déjà peints que le compositeur déplace ne coûtent presque rien (le designer, v73 : 2 % du fil principal au
     repos ; la rotation de calques plein écran, essayée, faisait tomber la cadence à 30 images/s : écartée) ;
   · les POINTS, un tous les 24 px, plus discrets au repos et estompés vers les bords ; ils glissent d'un dixième sous le
     plan (la parallaxe) ;
   · la LUEUR froide qui suit la souris, sur un ressort amorti critique (posée en une demi-seconde, sans dépassement) et
     qui s'arrête avec la main ; sous elle, la grille se RÉVÈLE (les mêmes points, plus vifs, recalés sur la grille) : la
     souris est une lampe posée sur la table ;
   · le COURANT : de temps en temps (14 à 22 s), un éclat de glace court le long d'une rangée de points — l'électricité,
     discrète —, seulement sur la bibliothèque, dans une bande libre, jamais sous ce qu'on lit, jamais deux à la fois.
   SOBRE : 90 s sans la main, la dérive ralentit jusqu'à l'arrêt (2 s) et plus rien ne tourne ; un geste la relance (1,2 s).
   Pendant un long travail (la conversion en lot, le dossier PDF, le placement d'un folio), elle attend aussi.
   Page cachée : tout s'arrête. Pendant un geste sur le plan (glisser, la molette, tenir un bloc), elle attend. Sous une
   feuille qui prend la page (le récapitulatif en page, la base SEE), elle se fige et la lueur s'éteint. Le mouvement réduit
   pose les nappes une fois pour toutes, sans lueur ni courant ; au doigt, pas de lueur.
   =========================================================================== */
'use strict';

const TABLE_PARALLAXE = .1, TABLE_PAS = 24;   // les points, un tous les 24 px : leur parallaxe glisse modulo un pas
/* La dérive s'écrit à 7 Hz (v74 ; le designer en voulait 15, le lot A l'avait mise à 10) : à 7,7 px/s au plus (10 à 1920), un
   pas fait un pixel et demi au plus sur une lumière très floue — l'œil n'y voit aucune marche ; les points, à un dixième
   de cette vitesse, à peine un sixième de pixel. Le navigateur entier, table éveillée, sans carte graphique (rendu
   logiciel) : 85 à 90 % d'un cœur en v74, 31 à 34 % à 10 Hz, 24 à 25 % à 7 Hz (tests/vitesse.js, machine au repos). La
   lueur : un ressort de 9 rad/s. */
const TABLE_HZ = 7, TABLE_RESSORT = 9;
const TABLE_REVELE = 240;  // (v78 : « les jeux de lumière autour de la souris, plus fins »)                     // le disque où la grille se révèle (style-table.css, `.ta-revele`)
// ce qu'on lit, posé sur la table : la grille ne s'y révèle pas
const TABLE_LU = '#bi-page :is(.bi-vide-centre > *, .bi-dock, .bi-carte, .bi-tete, .bi-reprendre, .bi-feuille, .bi-intertitre, .bi-rail, .bi-bandeau, .bi-lot, .bi-sous), #fiche, #base, #inspecteur, #menu, #entete, #rail, #folios';
const TABLE = {
  el: null, nA: null, nB: null, lueur: null, revele: null, reveleI: null, courant: null,
  // la lueur : la souris (x, y), où elle est (px, py), sa vitesse (vx, vy) ; la parallaxe des points (ox, oy)
  x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, anim: 0, t: 0, vue: false, ox: 0, oy: 0,
  // la dérive : son temps, sa vitesse (0 endormie, 1 éveillée) qui rejoint sa cible, la minuterie, le dernier geste
  temps: 0, vitesse: 0, cible: 0, derniere: 0, minuterie: 0, main: 0, veilleApres: 90000, hz: TABLE_HZ,
  geste: 0, enGeste: false, courantT: 0, surLu: false };

/* LES NAPPES au temps t (en secondes) : deux Lissajous lents, déphasés ; la seconde respire (.55 ↔ 1). Un pas qui ne les
   déplace pas d'un tiers de pixel (ou ne change pas leur lumière d'un rien) ne s'écrit pas : pas d'image pour rien — près
   des retournements, la dérive ne coûte presque plus. */
const NAPPES = { a: [NaN, NaN], b: [NaN, NaN], o: NaN };
function poserNappes(t, toujours) { const T = TABLE; if (!T.nA) return; const vw = innerWidth / 100, vh = innerHeight / 100, s = Math.sin, D = 2 * Math.PI, N = NAPPES;
  // (v78, le lecteur : « le fond, un petit peu plus en mouvement — pas grossi ») : des périodes plus courtes, une course plus ample
  const ax = 18 * vw + 5.5 * vw * s(D * t / 31), ay = -22 * vh + 4.5 * vh * s(D * t / 41 + 1.1), bx = -30 * vw - 5.5 * vw * s(D * t / 41 + .4), by = 30 * vh - 4.5 * vh * s(D * t / 31 + 2), o = .74 + .26 * s(D * t / 19);
  const loin = (p, x, y) => toujours || !(Math.abs(p[0] - x) < .33 && Math.abs(p[1] - y) < .33);
  if (loin(N.a, ax, ay)) { N.a = [ax, ay]; T.nA.style.transform = `translate3d(${ax.toFixed(1)}px,${ay.toFixed(1)}px,0)`; }
  if (loin(N.b, bx, by)) { N.b = [bx, by]; T.nB.style.transform = `translate3d(${bx.toFixed(1)}px,${by.toFixed(1)}px,0)`; }
  if (toujours || !(Math.abs(N.o - o) < .006)) { N.o = o; T.nB.style.opacity = o.toFixed(3); } }
// une feuille prend la page (le récapitulatif en page, la base SEE) : la table, dessous, ne se voit plus
const tableCouverte = () => !!document.querySelector('#base.page:not([hidden]), #fiche[data-mode="see"]:not([hidden])');
// un long travail (la conversion en lot, le dossier PDF, le placement d'un folio au loin) : la table attend, le processeur
// est à lui (en rendu logiciel, chaque pas de la dérive recompose l'écran : il ralentissait la conversion d'un tiers)
const tableOccupee = () => !!((typeof BIB !== 'undefined' && BIB.lot && BIB.lot.encours) || (typeof DOSSIER !== 'undefined' && DOSSIER.encours) || (typeof placement !== 'undefined' && placement.encours));
/* UN PAS DE LA DÉRIVE (10 Hz) : la vitesse rejoint sa cible (la veille la met à 0 en 2 s, un geste à 1 en 1,2 s) ; le
   temps avance d'autant — sauf pendant un geste ou sous une feuille. Endormie, la minuterie s'arrête : plus rien ne tourne. */
function deriver() { const T = TABLE, n = performance.now(), dt = Math.min(.25, (n - T.derniere) / 1000); T.derniere = n;
  if (document.hidden) { arreterDerive(); return; }
  if (T.cible && n - T.main > T.veilleApres) { T.cible = 0; T.el.classList.add('dort'); }
  T.vitesse += (T.cible - T.vitesse) * Math.min(1, dt * 2.2);
  if (!T.cible && T.vitesse < .002) { T.vitesse = 0; arreterDerive(); return; }
  if (T.enGeste || tableCouverte() || tableOccupee()) return;
  T.temps += dt * T.vitesse; poserNappes(T.temps); }
function arreterDerive() { clearInterval(TABLE.minuterie); TABLE.minuterie = 0; }
/* On est là (la souris, le clavier, la molette) : la dérive s'éveille, ou reste éveillée 90 s de plus. */
function eveillerTable() { const T = TABLE; if (!T.el || mouvementReduit() || document.hidden) return; T.main = performance.now();
  if (!T.cible) { T.cible = 1; T.el.classList.remove('dort'); }
  if (!T.minuterie) { T.derniere = performance.now(); T.minuterie = setInterval(deriver, Math.round(1000 / T.hz)); }
  if (!T.courantT) planifierCourant(); }

/* LA LUEUR, sur un ressort amorti critique ; le disque de la révélation la suit, ses points recalés sur la grille (la
   contre-translation modulo un pas, parallaxe comprise). */
function poserLueur() { const T = TABLE, tr = `translate3d(${T.px.toFixed(1)}px,${T.py.toFixed(1)}px,0)`; T.lueur.style.transform = tr; T.revele.style.transform = tr;
  const r = TABLE_REVELE / 2, m = (v, o) => (((v - r - o) % TABLE_PAS) + TABLE_PAS) % TABLE_PAS;
  T.reveleI.style.transform = `translate3d(${(-m(T.px, T.ox)).toFixed(1)}px,${(-m(T.py, T.oy)).toFixed(1)}px,0)`; }
function pasDeLaLueur(n) { const T = TABLE, dt = Math.min(.05, (n - (T.t || n)) / 1000) || .016, w = TABLE_RESSORT; T.t = n;
  const ax = w * w * (T.x - T.px) - 2 * w * T.vx, ay = w * w * (T.y - T.py) - 2 * w * T.vy;
  T.vx += ax * dt; T.vy += ay * dt; T.px += T.vx * dt; T.py += T.vy * dt; poserLueur();
  T.anim = Math.abs(T.x - T.px) + Math.abs(T.y - T.py) > .4 || Math.abs(T.vx) + Math.abs(T.vy) > 2 ? requestAnimationFrame(pasDeLaLueur) : 0; if (!T.anim) T.t = 0; }

/* LE COURANT : un éclat de glace sur une rangée de points, dans une bande que rien ne couvre (la bibliothèque : sa
   composition, ses cartes, le dock ; la barre du haut). Sur le plan, la table se tait : on y travaille. */
function planifierCourant() { clearTimeout(TABLE.courantT); TABLE.courantT = setTimeout(courir, 6000 + Math.random() * 5000); }
function rangeesLibres() { const H = innerHeight, haut = (typeof $ === 'function' && $('entete') ? $('entete').getBoundingClientRect().bottom : 52) + 20;
  const pris = [...document.querySelectorAll('#bi-page :is(.bi-tete, .bi-reprendre, .bi-bandeau, .bi-intertitre, .bi-carte, .bi-feuille, .bi-sous, .bi-rien, .bi-rail, .bi-lot, .bi-vide-centre > *, .bi-dock), #fiche:not([hidden])')]
    .map(e => e.getBoundingClientRect()).filter(r => r.height && r.width);
  const libre = y => y > haut && y < H - 24 && !pris.some(r => y > r.top - 28 && y < r.bottom + 28), Y = [];
  for (let k = Math.ceil((haut - TABLE.oy + 23) / TABLE_PAS); ; k++) { const y = TABLE.oy - 23 + k * TABLE_PAS; if (y > H) break; if (libre(y)) Y.push(y); }
  return Y; }
function courir() { const T = TABLE; T.courantT = 0;
  if (!T.cible) return;   // endormie : le prochain geste le replanifie
  const biblio = typeof BIB !== 'undefined' && BIB.vue !== 'plan' && !$('bibliotheque').hidden;
  if (!document.hidden && !mouvementReduit() && biblio && T.vitesse > .5 && !T.enGeste && !tableCouverte() && !tableOccupee()) { const Y = rangeesLibres();
    if (Y.length) { const y = Y[Math.floor(Math.random() * Y.length)] - .75, W = innerWidth, long = 360 + Math.random() * 220, sens = Math.random() < .5 ? 1 : -1;
      const x0 = Math.round((40 + Math.random() * Math.max(40, W - long - 230)) / TABLE_PAS) * TABLE_PAS + ((T.ox - 23) % TABLE_PAS), a = sens > 0 ? x0 : x0 + long, b = sens > 0 ? x0 + long : x0;
      T.courant.animate([{ transform: `translate3d(${a}px,${y}px,0) scaleX(${sens})`, opacity: 0 }, { opacity: .9, offset: .15 }, { opacity: .7, offset: .7 }, { transform: `translate3d(${b}px,${y}px,0) scaleX(${sens})`, opacity: 0 }],
        { duration: 1800, easing: 'cubic-bezier(.45,0,.25,1)' }); } }
  planifierCourant(); }

function lierTable() { const T = TABLE, t = $('table'); if (!t) return; const q = s => t.querySelector(s);
  Object.assign(T, { el: t, nA: q('.ta-nappe-a'), nB: q('.ta-nappe-b'), lueur: q('.ta-lueur'), revele: q('.ta-revele'), courant: q('.ta-courant') });
  if (!T.nA || !T.lueur || !T.revele) return; T.reveleI = T.revele.querySelector('i');
  T.x = T.px = innerWidth * .7; T.y = T.py = innerHeight * .3; poserLueur(); poserNappes(0);
  // le mouvement réduit : les nappes posées une fois pour toutes (la même lumière, immobile) ; ni lueur ni courant (CSS)
  if (mouvementReduit()) { T.nB.style.opacity = '.75'; return; }
  // un geste (un appui, la molette, un glisser) : la dérive et la lueur attendent qu'il finisse
  const geste = () => { T.enGeste = true; if (!t.classList.contains('geste')) t.classList.add('geste'); clearTimeout(T.geste); T.geste = setTimeout(() => { T.enGeste = false; t.classList.remove('geste'); }, 350); };
  addEventListener('pointermove', e => { eveillerTable(); if (e.buttons) { geste(); return; }
    if (e.pointerType === 'touch') return; T.x = e.clientX; T.y = e.clientY;
    if (!T.vue) { T.vue = true; t.classList.add('vue'); } if (!T.anim) T.anim = requestAnimationFrame(pasDeLaLueur);
    // la lampe éclaire la table, pas ce qu'on lit : sur la composition, les cartes, une feuille, la grille ne se révèle pas
    // (ses points passeraient entre les lettres) ; la lueur, elle, reste
    const lu = !!(e.target && e.target.closest && e.target.closest(TABLE_LU)); if (lu !== T.surLu) { T.surLu = lu; t.classList.toggle('sur-lu', lu); } }, { passive: true });
  addEventListener('pointerdown', () => { eveillerTable(); geste(); }, { passive: true, capture: true });
  addEventListener('wheel', () => { eveillerTable(); geste(); }, { passive: true, capture: true });
  addEventListener('keydown', eveillerTable, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { arreterDerive(); clearTimeout(T.courantT); T.courantT = 0; if (T.anim) { cancelAnimationFrame(T.anim); T.anim = 0; T.t = 0; } } else eveillerTable(); });
  document.addEventListener('pointerleave', () => { T.vue = false; t.classList.remove('vue'); });
  // à l'ouverture, la table s'éveille d'elle-même (on vient d'arriver) : elle dérive déjà quand l'accueil se pose
  eveillerTable(); }
// appelée à chaque vue posée (08-interface, `appliquerVue`) : les points glissent d'un dixième, modulo leur pas ; la grille
// révélée sous la lueur les suit
function parallaxeTable() { const p = document.querySelector('#table .ta-points'); if (!p) return;
  if (mouvementReduit()) { if (p.style.transform) p.style.transform = ''; return; }
  const m = v => (((v * TABLE_PARALLAXE) % TABLE_PAS) + TABLE_PAS) % TABLE_PAS; TABLE.ox = m(app.vue.tx); TABLE.oy = m(app.vue.ty);
  p.style.transform = `translate3d(${TABLE.ox.toFixed(1)}px,${TABLE.oy.toFixed(1)}px,0)`; if (TABLE.reveleI) poserLueur(); }
