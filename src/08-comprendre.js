/* ===========================================================================
   08 — COMMENT VOLTA RÉFLÉCHIT : une page qui explique l'outil, du novice au bureau d'études
   ---------------------------------------------------------------------------
   Le lecteur (octobre 2026) : « je ne comprends plus la base ; explique-moi comme à un enfant de quatre ans » — et
   « même le BE doit comprendre comment c'est fait, et pourquoi ». Une page, six images, en français simple :
     1. le CUISINIER : l'installation est la commande, la base SEE le catalogue, la physique les recettes — Volta cuisine,
        il n'invente pas une pièce qui manque au catalogue ; et la base « unique » (ce que seul Volta a, l'option) ;
     2. la CHAÎNE D'UN CONNECTEUR : référence → famille → face → taille → câble → contact ;
     3. la CHAÎNE D'UN DISJONCTEUR : consommation → profil → courbe → calibre → câbles → chute ;
     4. les ROUTES : impair à gauche, pair à droite, le branchement en chaîne, la prise de coupure qui change de route ;
     5. ce que veut dire « MANQUE » (et vérifié, à confirmer, hypothèse) ;
     6. COMMENT VÉRIFIER : « D'où vient chaque pièce », les points de couleur, la Bible, les Normes, la Cohérence.
   Chaque chapitre : une phrase, un schéma (SVG en ligne, sur le papier comme tous les dessins de l'outil — aucun fichier
   à côté), trois ou quatre points, et, replié, « Pour le bureau d'études : la règle exacte ». Les exemples sont ceux de
   l'installation livrée (340AB1, 102CB1), relevés sur les tables de l'outil.
   `ficheComprendre(chapitre)` ouvre la page (sur un chapitre : 'cuisinier', 'connecteur', 'disjoncteur', 'routes',
   'manque', 'verifier'). Elle s'ouvre du menu (⋮ › Plus), de chaque « ? » (un lien au pied de sa bulle) et des pages
   Normes, Bible et Base SEE. Le style : style-comprendre.css.
   =========================================================================== */
'use strict';

const CHAPITRES_COMPRENDRE = [
  ['cuisinier', 'Volta est un cuisinier'], ['connecteur', 'La chaîne d’un connecteur'], ['disjoncteur', 'La chaîne d’un disjoncteur'],
  ['routes', 'Les routes : gauche, droite'], ['manque', 'Ce que veut dire « manque »'], ['verifier', 'Comment vérifier']];

/* ---- les dessins : sur papier, l'encre et quatre couleurs (les seules couleurs littérales de l'outil sont celles des
   dessins sur papier — DESIGN § 4) ---------------------------------------------------------------------------------- */
const CP = { encre: '#1d1d1f', encre2: '#47474c', encre3: '#636369', filet: '#d2d2d7', fond: '#ffffff', doux: '#f5f5f7',
  violet: '#5b3fc4', sarcelle: '#0b6e80', ambre: '#8a5100', vert: '#1d7a3c', rouge: '#c3271f',
  violetDoux: '#efebfb', sarcelleDoux: '#e4f3f5', ambreDoux: '#fbf1e1', vertDoux: '#e8f5ec', rougeDoux: '#fdeceb' };
const cpT = (x, y, t, o) => { o = o || {}; const ls = Array.isArray(t) ? t : [t];
  // la couleur en style : la feuille donne l'encre d'office à tout texte d'un schéma, un attribut `fill` ne passerait pas devant
  return `<text x="${x}" y="${y}" class="${o.cls || ''}" text-anchor="${o.ancre || 'middle'}"${o.couleur ? ` style="fill:${o.couleur}"` : ''}>${ls.map((l, i) => `<tspan x="${x}" dy="${i ? o.pas || 15 : 0}">${esc(l)}</tspan>`).join('')}</text>`; };
// une flèche de (x1, y1) à (x2, y2), sa pointe pleine
const cpFleche = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), p = (k, d) => `${f1(x2 - 9 * Math.cos(a) + k * 4.5 * Math.sin(a))},${f1(y2 - 9 * Math.sin(a) - k * 4.5 * Math.cos(a))}`;
  return `<path d="M${f1(x1)} ${f1(y1)}L${f1(x2 - 7 * Math.cos(a))} ${f1(y2 - 7 * Math.sin(a))}" stroke="${c || CP.encre3}" stroke-width="1.6" fill="none"/><path d="M${f1(x2)} ${f1(y2)}L${p(1)}L${p(-1)}z" fill="${c || CP.encre3}"/>`; };
/* UN MAILLON d'une chaîne : un cadre, son nom (petit, à l'encre seconde), sa valeur (en grand ; un identifiant en chasse
   fixe), et une ou deux lignes de ce qui le décide. `o.etat` : 'ok' | 'att' | 'ko' le teinte ; 'manque' le dessine en
   pointillé rouge. */
function cpMaillon(x, y, w, h, nom, valeur, lignes, o) { o = o || {}; const c = o.etat === 'ok' ? CP.vert : o.etat === 'att' ? CP.ambre : o.etat === 'ko' || o.etat === 'manque' ? CP.rouge : CP.filet;
  const fond = o.etat === 'ok' ? CP.vertDoux : o.etat === 'att' ? CP.ambreDoux : o.etat === 'ko' || o.etat === 'manque' ? CP.rougeDoux : CP.fond, vs = Array.isArray(valeur) ? valeur : [valeur];
  return `<g class="vr-maillon"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fond}" stroke="${c}" stroke-width="${o.etat ? 1.6 : 1.2}"${o.etat === 'manque' ? ' stroke-dasharray="5 4"' : ''}/>`
    + cpT(x + w / 2, y + 20, nom, { cls: 'vr-nom' }) + vs.map((v, i) => cpT(x + w / 2, y + 42 + i * 17, v, { cls: o.mono ? 'vr-val mono' : 'vr-val', couleur: o.etat === 'manque' ? CP.rouge : null })).join('')
    + (lignes ? cpT(x + w / 2, y + 42 + vs.length * 17 + 4, lignes, { cls: 'vr-petit', pas: 14 }) : '') + '</g>'; }
// une chaîne de maillons, de gauche à droite, une flèche entre deux
function cpChaine(xs, y, w, h, gap) { return xs.map((m, i) => { const x = 8 + i * (w + gap);
  return cpMaillon(x, y, w, h, m[0], m[1], m[2], m[3]) + (i < xs.length - 1 ? cpFleche(x + w + 3, y + h / 2, x + w + gap - 3, y + h / 2) : ''); }).join(''); }
const cpSvg = (vb, titre, corps) => `<svg class="vr-svg" viewBox="${vb}" role="img" aria-label="${escA(titre)}"><title>${esc(titre)}</title>${corps}</svg>`;

/* 1. LE CUISINIER : trois ingrédients à gauche, le cuisinier au milieu, le plat à droite. */
function cpSchemaCuisinier() { const carte = (y, c, cd, titre, sous, ex) => `<rect x="8" y="${y}" width="290" height="78" rx="12" fill="${CP.fond}" stroke="${CP.filet}"/><rect x="8" y="${y}" width="6" height="78" rx="3" fill="${c}"/>`
    + `<circle cx="42" cy="${y + 39}" r="17" fill="${cd}"/>` + cpT(42, y + 44, titre[0], { cls: 'vr-ico', couleur: c })
    + cpT(70, y + 26, titre[1], { cls: 'vr-titre', ancre: 'start' }) + cpT(70, y + 45, sous, { cls: 'vr-sous', ancre: 'start', couleur: c }) + cpT(70, y + 63, ex, { cls: 'vr-petit', ancre: 'start' });
  const plat = ['les folios dessinés', 'une fiche par objet', 'la nomenclature', 'l’installation corrigée'];
  return cpSvg('0 0 880 300', 'Volta est un cuisinier : la commande, le catalogue et les recettes entrent ; les folios, les fiches et la nomenclature sortent',
    carte(10, CP.violet, CP.violetDoux, ['1', 'La commande'], 'votre fichier d’installation', 'relier 102CB1 à 103RL1, en DR20')
    + carte(111, CP.sarcelle, CP.sarcelleDoux, ['2', 'Le catalogue'], 'la base SEE gardée', 'sinon les tables de Volta')
    + carte(212, CP.ambre, CP.ambreDoux, ['3', 'Les recettes'], 'la physique, les normes', 'ce qu’un câble supporte, quand couper')
    + cpFleche(302, 49, 376, 128, CP.violet) + cpFleche(302, 150, 368, 150, CP.sarcelle) + cpFleche(302, 251, 376, 172, CP.ambre)
    + `<circle cx="440" cy="150" r="70" fill="${CP.doux}" stroke="${CP.encre}" stroke-width="1.6"/>`
    + `<path d="M412 126c-10 0-16-8-13-16 3-9 14-11 20-5 3-10 15-13 22-6 7-7 19-4 22 6 6-6 17-4 20 5 3 8-3 16-13 16v12h-58z" fill="${CP.fond}" stroke="${CP.encre}" stroke-width="1.5" stroke-linejoin="round"/>`
    + cpT(440, 166, 'Volta', { cls: 'vr-titre' }) + cpT(440, 184, 'le cuisinier', { cls: 'vr-sous' })
    + cpFleche(514, 150, 582, 150, CP.encre)
    + `<rect x="586" y="44" width="286" height="212" rx="14" fill="${CP.fond}" stroke="${CP.encre}" stroke-width="1.3"/>` + cpT(606, 76, 'Le plat', { cls: 'vr-titre', ancre: 'start' })
    + plat.map((p, i) => `<circle cx="612" cy="${104 + i * 26}" r="3.5" fill="${CP.vert}"/>` + cpT(626, 109 + i * 26, p, { cls: 'vr-ligne', ancre: 'start' })).join('')
    + `<rect x="602" y="208" width="254" height="30" rx="15" fill="${CP.rougeDoux}" stroke="${CP.rouge}" stroke-dasharray="4 3"/>` + cpT(729, 227, 'une pièce absente : « manque »', { cls: 'vr-petit', couleur: CP.rouge })); }
/* 2. LA CHAÎNE D'UN CONNECTEUR : 340AB1 de l'installation livrée. */
function cpSchemaConnecteur() { const xs = [
    ['Référence', 'EN2997Y1A08P', ['dans votre fichier', 'd’installation'], { mono: 1 }], ['Famille', 'EN 2997', ['le début de', 'la référence']], ['Face', '16-24', ['la plus petite qui', 'loge tous les câbles']],
    ['Cavité', 'taille 20', ['lue sur la face,', 'à la borne 1']], ['Câble', ['DR24', '24 AWG'], ['la base', 'des câbles'], { mono: 1 }], ['Contact', 'EN3155-019F2020', ['taille + sexe', '+ gauge'], { mono: 1, etat: 'ok' }]];
  return cpSvg('0 0 880 150', 'La chaîne d’un connecteur : référence, famille, face, cavité, câble, contact', cpChaine(xs, 14, 126, 120, 24)); }
/* 3. LA CHAÎNE D'UN DISJONCTEUR, et sa courbe : 102CB1 de l'installation livrée. */
function cpSchemaDisjoncteur() { const xs = [
    ['Consommation', ['5 A', '9,31 A au départ'], ['ce que tirent', 'les équipements']], ['Profil', ['9,31 A · 2 min', '5 A ensuite'], ['démarrage, transition,', 'permanent']],
    ['Courbe', 'MS3320', ['à 125 °C : la plus', 'rapide à couper']], ['Calibre', ['10 A juste', '15 A passe'], ['le plus petit qui', 'tient, avec la marge'], { etat: 'ok' }],
    ['Câbles', ['W-011, W-012', 'W-015 en DR12'], ['assez gros pour', 'que le 15 A les protège']], ['Chute', '≤ 2 V', ['jusqu’au bout,', 'pointes comprises']]];
  // LA COURBE, en schéma : sa forme à 125 °C (la plus rapide — presque droite près du calibre), en échelles logarithmiques ;
  // le temps que met le disjoncteur à couper selon le courant. Le 10 A frôle le point de 102CB1 (9,31 A pendant 2 min) :
  // il passe, sans la marge ; le 15 A est loin à droite. Le profil en escalier, comme dans votre Excel.
  const X0 = 120, Y0 = 192, W = 430, H = 150, IMIN = 4, IMAX = 60, TMIN = 0.5, TMAX = 7200;
  const lx = i => X0 + Math.log(i / IMIN) / Math.log(IMAX / IMIN) * W, ly = t => Y0 + H - Math.log(t / TMIN) / Math.log(TMAX / TMIN) * H;
  const FORME = [[0.9, 7200], [0.92, 900], [0.94, 200], [0.97, 80], [1.02, 31], [1.2, 12], [1.5, 6], [2, 3], [3, 1.4], [5, 0.7]];
  const courbe = In => FORME.map(([m, t]) => [lx(m * In), ly(t)]).filter(([x]) => x <= X0 + W + 0.5).map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join('');
  const axes = `<rect x="${X0}" y="${Y0}" width="${W}" height="${H}" fill="${CP.fond}" stroke="${CP.filet}"/>`
    + [5, 10, 15, 20, 30, 50].map(i => `<line x1="${f1(lx(i))}" y1="${Y0}" x2="${f1(lx(i))}" y2="${Y0 + H}" stroke="${CP.doux}"/>` + cpT(lx(i), Y0 + H + 15, i + ' A', { cls: 'vr-axe' })).join('')
    + [[1, '1 s'], [10, '10 s'], [60, '1 min'], [600, '10 min'], [3600, '1 h']].map(([t, m]) => `<line x1="${X0}" y1="${f1(ly(t))}" x2="${X0 + W}" y2="${f1(ly(t))}" stroke="${CP.doux}"/>` + cpT(X0 - 6, ly(t) + 4, m, { cls: 'vr-axe', ancre: 'end' })).join('')
    + cpT(X0 + W / 2, Y0 + H + 32, 'le courant', { cls: 'vr-petit' }) + cpT(X0, Y0 - 9, 'le temps pour couper', { cls: 'vr-petit', ancre: 'start' });
  const P = { x: lx(9.31), y: ly(125) }, Q = { x: lx(5), y: Y0 + 4 };
  const profil = `<path d="M${f1(Q.x)} ${f1(Q.y)}V${f1(P.y)}H${f1(P.x)}" fill="none" stroke="${CP.violet}" stroke-width="1.8" stroke-dasharray="4 3"/>`
    + `<circle cx="${f1(P.x)}" cy="${f1(P.y)}" r="5.5" fill="${CP.violet}"/><circle cx="${f1(Q.x)}" cy="${f1(Q.y + 2)}" r="4" fill="${CP.violet}"/>`
    + cpT(P.x - 10, P.y + 20, '9,31 A · 2 min', { cls: 'vr-petit', ancre: 'end', couleur: CP.violet }) + cpT(Q.x + 9, Q.y + 16, '5 A · toujours', { cls: 'vr-petit', ancre: 'start', couleur: CP.violet });
  const leg = (y, c, d, t) => `<line x1="586" y1="${y}" x2="612" y2="${y}" stroke="${c}" stroke-width="2.4"${d ? ' stroke-dasharray="6 4"' : ''}/>` + cpT(622, y + 4, t, { cls: 'vr-ligne', ancre: 'start' });
  return cpSvg('0 0 880 384', 'La chaîne d’un disjoncteur : consommation, profil, courbe, calibre, câbles, chute ; et, en schéma, la courbe du 10 A et du 15 A face au profil de 102CB1',
    cpChaine(xs, 14, 126, 128, 24) + axes + `<path d="${courbe(10)}" fill="none" stroke="${CP.ambre}" stroke-width="2.4" stroke-dasharray="6 4"/><path d="${courbe(15)}" fill="none" stroke="${CP.vert}" stroke-width="2.4"/>` + profil
    + leg(214, CP.violet, true, 'le profil de 102CB1') + leg(244, CP.ambre, true, '10 A : il frôle le profil (juste)') + leg(274, CP.vert, false, '15 A : le profil passe, avec la marge')
    + cpT(586, 310, ['Un point à gauche d’une courbe ne déclenche pas.', 'Volta prend le plus petit calibre dont la courbe', 'reste à droite, avec la marge.', '(schéma : la forme des courbes à 125 °C)'], { cls: 'vr-petit', ancre: 'start', pas: 15 })); }
/* 4. LES ROUTES : l'appareil vu de dessus, ses deux côtés ; un connecteur qui mélange ; une prise qui change de route. */
function cpSchemaRoutes() { const cable = (x1, y1, x2, y2, c, t, ty) => `<path d="M${x1} ${y1}H${x2}" stroke="${c}" stroke-width="3" fill="none"/>` + (t ? cpT((x1 + x2) / 2, ty || y1 - 7, t, { cls: 'vr-petit mono', couleur: c }) : '');
  const helico = `<g><ellipse cx="150" cy="150" rx="60" ry="92" fill="${CP.fond}" stroke="${CP.encre}" stroke-width="1.5"/><path d="M90 150a60 92 0 0 0 60 92V58a60 92 0 0 0-60 92z" fill="${CP.violetDoux}"/>`
    + `<path d="M150 58a60 92 0 0 1 60 92 60 92 0 0 1-60 92z" fill="${CP.sarcelleDoux}"/><ellipse cx="150" cy="150" rx="60" ry="92" fill="none" stroke="${CP.encre}" stroke-width="1.5"/>`
    + `<rect x="144" y="236" width="12" height="54" rx="4" fill="${CP.fond}" stroke="${CP.encre}" stroke-width="1.3"/><circle cx="150" cy="140" r="104" fill="none" stroke="${CP.encre3}" stroke-dasharray="3 5"/>`
    + `<path d="M150 70v-24" stroke="${CP.encre}" stroke-width="1.4"/>` + cpT(150, 36, 'l’avant', { cls: 'vr-petit' })
    + cpT(121, 146, ['impair', 'gauche'], { cls: 'vr-sous', couleur: CP.violet, pas: 16 }) + cpT(179, 146, ['pair', 'droite'], { cls: 'vr-sous', couleur: CP.sarcelle, pas: 16 })
    + cpT(58, 290, '1MO, 3HO…', { cls: 'vr-petit mono', couleur: CP.violet }) + cpT(242, 290, '2MO, 4HO…', { cls: 'vr-petit mono', couleur: CP.sarcelle }) + '</g>';
  const connecteur = `<g>${cpT(470, 36, 'Un connecteur', { cls: 'vr-titre' })}<rect x="500" y="74" width="56" height="128" rx="8" fill="${CP.fond}" stroke="${CP.encre}" stroke-width="1.5"/>`
    + cable(380, 104, 500, 104, CP.violet, '1MO') + cable(380, 136, 500, 136, CP.violet, '3HO') + cable(380, 172, 500, 172, CP.sarcelle, '2MO')
    + `<rect x="372" y="222" width="196" height="46" rx="10" fill="${CP.ambreDoux}" stroke="${CP.ambre}"/>` + cpT(470, 241, 'branchement en chaîne', { cls: 'vr-sous', couleur: CP.ambre }) + cpT(470, 258, 'gauche et droite mêlées : à voir', { cls: 'vr-petit' }) + '</g>';
  const prise = `<g>${cpT(760, 36, 'Une prise de coupure', { cls: 'vr-titre' })}<rect x="728" y="74" width="28" height="128" rx="6" fill="${CP.fond}" stroke="${CP.encre}" stroke-width="1.5"/><rect x="764" y="74" width="28" height="128" rx="6" fill="${CP.fond}" stroke="${CP.encre}" stroke-width="1.5"/>`
    + cable(640, 110, 728, 110, CP.violet, '1MO') + cable(640, 160, 728, 160, CP.violet, '1MO') + cable(792, 110, 876, 110, CP.violet, '3HO') + cable(792, 160, 876, 160, CP.violet, '3HO')
    + cpT(684, 196, 'côté fiche', { cls: 'vr-petit' }) + cpT(836, 196, 'côté embase', { cls: 'vr-petit' })
    + `<rect x="652" y="222" width="216" height="46" rx="10" fill="${CP.vertDoux}" stroke="${CP.vert}"/>` + cpT(760, 241, 'elle change de route : bien', { cls: 'vr-sous', couleur: CP.vert }) + cpT(760, 258, 'chaque côté se juge à part', { cls: 'vr-petit' }) + '</g>';
  return cpSvg('0 0 880 300', 'Les routes : impair à gauche, pair à droite ; un connecteur qui mélange les deux côtés ; une prise de coupure qui change de route', helico + connecteur + prise); }
/* 5. « MANQUE » : la chaîne d'un raccord qui s'arrête, et les quatre mots de l'outil. */
function cpSchemaManque() { const xs = [['Connecteur', 'EN 3646', ['sa famille,', 'sa classe']], ['Taille', 'boîtier 12', ['lue dans', 'la référence']], ['Raccord', 'manque', ['aucune ligne de la table', 'pour cette famille'], { etat: 'manque' }], ['Manchon', '—', ['attend', 'le raccord'], { etat: 'manque' }]];
  const mot = (x, c, cd, t, s, forme) => `<g><rect x="${x}" y="176" width="200" height="66" rx="12" fill="${cd}" stroke="${c}"${forme === 'manque' ? ' stroke-dasharray="5 4"' : ''}/>`
    + (forme === 'plein' ? `<circle cx="${x + 24}" cy="198" r="7" fill="${c}"/>` : forme === 'anneau' ? `<circle cx="${x + 24}" cy="198" r="6" fill="none" stroke="${c}" stroke-width="2.2"/>` : forme === 'hyp' ? `<rect x="${x + 14}" y="191" width="22" height="14" rx="4" fill="${CP.fond}" stroke="${c}"/>` : `<path d="M${x + 18} 192l12 12M${x + 30} 192l-12 12" stroke="${c}" stroke-width="2.2"/>`)
    + cpT(x + 42, 203, t, { cls: 'vr-sous', ancre: 'start', couleur: c }) + cpT(x + 16, 226, s, { cls: 'vr-petit', ancre: 'start' }) + '</g>';
  return cpSvg('0 0 880 252', 'Ce que veut dire « manque » : une chaîne qui s’arrête, et les quatre mots de l’outil — vérifié, à confirmer, hypothèse, manque',
    cpChaine(xs, 8, 196, 124, 26) + mot(8, CP.vert, CP.vertDoux, 'vérifié', 'deux sources ou plus le disent', 'plein') + mot(228, CP.ambre, CP.ambreDoux, 'à confirmer', 'une seule source, ou non publique', 'anneau')
    + mot(448, CP.violet, CP.violetDoux, 'hypothèse', 'Volta suppose, et le dit (5 m)', 'hyp') + mot(668, CP.rouge, CP.rougeDoux, 'manque', 'rien n’est inventé', 'manque')); }
/* 6. VÉRIFIER : la fiche d'un connecteur, « D'où vient chaque pièce » déplié, et la bulle d'un point. */
function cpSchemaVerifier() { const ligne = (y, k, v, d, forme) => `<g>${cpT(46, y, k, { cls: 'vr-petit', ancre: 'start' })}${cpT(136, y, v, { cls: 'vr-val mono', ancre: 'start' })}`
    + (forme === 'plein' ? `<circle cx="292" cy="${y - 4}" r="4.5" fill="${CP.vert}"/>` : forme === 'moitie' ? `<circle cx="292" cy="${y - 4}" r="4.5" fill="none" stroke="${CP.encre2}" stroke-width="1.4"/><path d="M292 ${y - 8.5}a4.5 4.5 0 0 0 0 9z" fill="${CP.encre2}"/>` : `<circle cx="292" cy="${y - 4}" r="4" fill="none" stroke="${CP.ambre}" stroke-width="2"/>`)
    + cpT(306, y, d, { cls: 'vr-petit', ancre: 'start' }) + '</g>';
  const etape = (y, n, t) => `<circle cx="664" cy="${y}" r="14" fill="${CP.encre}"/>` + cpT(664, y + 5, String(n), { cls: 'vr-ico', couleur: CP.fond }) + cpT(688, y + (Array.isArray(t) ? -2 : 5), t, { cls: 'vr-ligne', ancre: 'start', pas: 16 });
  return cpSvg('0 0 880 250', 'Comment vérifier : la fiche d’un connecteur, « D’où vient chaque pièce » déplié, la bulle d’un point qui nomme sa source',
    `<rect x="20" y="16" width="580" height="188" rx="14" fill="${CP.fond}" stroke="${CP.filet}"/>` + cpT(46, 46, '340AB1 · D’où vient chaque pièce', { cls: 'vr-titre', ancre: 'start' })
    + `<line x1="46" y1="60" x2="574" y2="60" stroke="${CP.filet}"/>` + ligne(88, 'Référence', 'EN2997Y1A08P', 'votre fichier', 'moitie') + ligne(118, 'Face', '16-24', 'table des faces', 'plein')
    + ligne(148, 'Contact', 'EN3155-019F2020', 'table des contacts', 'plein') + ligne(178, 'Raccord', 'EN3660-064…', 'un modèle', 'anneau')
    + `<path d="M292 150V163H420" fill="none" stroke="${CP.encre3}" stroke-dasharray="3 3"/><rect x="420" y="142" width="166" height="42" rx="8" fill="#eef3fd" stroke="#1b1f27"/>` + cpT(432, 159, ['Vérifié par deux sources :', 'Souriau 2014, TE Deutsch'], { cls: 'vr-petit', ancre: 'start', pas: 14 })
    + etape(60, 1, 'Ouvrez la fiche du connecteur') + etape(110, 2, ['Dépliez « D’où vient', 'chaque pièce »']) + etape(160, 3, 'Survolez le point : la source') + cpT(664, 222, 'Rien ne se juge sans que vous puissiez remonter à sa table.', { cls: 'vr-petit', ancre: 'middle' })); }

/* ---- la page --------------------------------------------------------------------------------------------------------- */
// un chapitre : son numéro, son titre, la phrase de l'enfant, le schéma, les points, la règle exacte (repliée)
const cpChapitre = (id, n, titre, une, schema, points, be) => `<section class="vr-ch entre-v" id="vr-${id}" data-chapitre="${id}" style="--k:${n}" aria-labelledby="vr-t-${id}">`
  + `<header class="vr-ch-tete"><span class="vr-num" aria-hidden="true">${n}</span><h3 id="vr-t-${id}">${esc(titre)}</h3></header><p class="vr-une">${une}</p>`
  + `<figure class="vr-schema">${schema}</figure><ul class="vr-points">${points.map(p => `<li>${p}</li>`).join('')}</ul>`
  + `<details class="vr-be"><summary>Pour le bureau d’études : la règle exacte</summary><div class="vr-be-corps">${be}</div></details></section>`;
const cpLien = (geste, mot, bulle) => `<button type="button" class="btn lien dense vr-aller" data-vr-aller="${geste}"${bulle ? ` data-bulle="${escA(bulle)}"` : ''}>${esc(mot)}</button>`;
// ce que la base SEE gardée sur ce PC change à la page : le compte de ce que seul Volta a, l'option — rien sans base
function cpBase() { const I = typeof BASE_SEE !== 'undefined' && BASE_SEE.base; if (!I || typeof seulVoltaSEE !== 'function') return '';
  let L = []; try { L = seulVoltaSEE(I); } catch (_) { L = []; } const perdues = L.filter(x => !x.couverte).length, seule = typeof seuleBaseSEE === 'function' && seuleBaseSEE();
  return `<p class="vr-encart"><b>Sur ce PC</b>, votre base SEE est gardée : elle est le catalogue. ${L.length ? `${plurielLie(L.length, 'ligne')} de contact ne ${L.length > 1 ? 'sont' : 'est'} que chez Volta${perdues ? `, dont ${perdues} sans équivalent dans la base` : ''}. ` : 'Tout ce que Volta tenait de vos photos est dans la base. '}`
    + `${seule ? 'Vous avez choisi de ne prendre les pièces que dans la base.' : 'Volta les garde en secours tant que vous ne cochez pas « Ne prendre les pièces que dans la base SEE gardée ».'} ${cpLien('seul-volta', 'Voir ces lignes', 'La base SEE, onglet Cohérence : chaque ligne que seul Volta a, et pourquoi')}</p>`; }
function comprendreHtml() {
  const sommaire = `<nav class="vr-sommaire" aria-label="Les chapitres"><ol>${CHAPITRES_COMPRENDRE.map(([id, t], i) => `<li><button type="button" data-vr-ch="${id}"${i ? '' : ' data-clavier'}><span>${i + 1}</span>${esc(t)}</button></li>`).join('')}</ol></nav>`;
  const ch = [
    cpChapitre('cuisinier', 1, 'Volta est un cuisinier', 'Votre installation est <b>la commande</b>, la base SEE est <b>le catalogue</b>, la physique est <b>les recettes</b>. Volta lit la commande, prend les pièces dans le catalogue, suit les recettes — et sert le plat. Il n’invente jamais une pièce : si elle n’est pas au catalogue, il écrit « manque ».', cpSchemaCuisinier(),
      ['<b>La commande</b> dit ce qu’on veut : relier telle borne à telle autre, avec tel câble, sur tel folio. Volta ne la change jamais sans vous : ce qu’il propose s’écrit seulement d’un geste.',
        '<b>Le catalogue</b> dit ce qui existe : les contacts à sertir, les câbles, les faces des connecteurs. Si votre base SEE est gardée sur ce PC, c’est elle ; sinon, les tables de Volta (vos photos des tables de SEE, recoupées sur des sources publiques).',
        '<b>Les recettes</b> disent ce qui tient : ce qu’un câble supporte, quand un disjoncteur coupe, la chute de tension admise (2 V, votre règle). Elles ne viennent jamais du catalogue : la base SEE n’a ni courbes ni intensités.',
        '<b>Un seul catalogue ?</b> Quand la base SEE est là, elle passe devant. Quelques lignes ne sont que chez Volta : la Cohérence les liste, une par une, avec leur raison. Vous décidez : une case, « Ne prendre les pièces que dans la base SEE gardée », est prête, décochée.'],
      `<p>L’ordre des tables, du plus fort au plus faible : <b>ce que vous corrigez à la main</b> sur la page Normes, puis <b>la base SEE gardée</b>, puis <b>les tables de Volta</b> (l’embarquée et vos imports). Une exception, votre règle du 20 octobre 2026 : quand la base contredit une ligne que deux sources indépendantes ont vérifiée, la source gagne, et la valeur de la base est montrée barrée, « à corriger dans SEE ». Un chiffre de la base impossible pour sa gauge (une masse sous celle du cuivre seul) ne passe jamais. Ce que la base laisse vide, Volta le garde.</p>`
      + `<p>« Seulement dans Volta » : une ligne de contact (famille, sexe, taille, type et gauge du câble) que la base n’a pas. Deux raisons : la base ne l’a plus (sa règle a changé de version), ou Volta l’a ajoutée de ses sources (une taille que vos photos n’avaient pas). Avec la case cochée, ces lignes ne servent plus pour les familles que la base connaît ; une famille que la base ignore garde celles de Volta.</p>`
      + cpBase()),
    cpChapitre('connecteur', 2, 'La chaîne d’un connecteur', 'Pour savoir quel contact sertir au bout d’un câble, Volta suit une chaîne, maillon par maillon : <b>la référence</b> donne <b>la famille</b>, la famille donne <b>la face</b>, la face donne <b>la taille de la cavité</b>, et la taille, avec <b>la gauge du câble</b>, donne <b>le contact</b>.', cpSchemaConnecteur(),
      ['L’exemple est 340AB1 dans l’installation livrée : EN2997Y1A08P est un EN 2997 ; sa face 16-24 loge ses câbles ; la borne 1 est une cavité de taille 20 ; le câble DR24 fait 24 AWG ; la douille qui va avec est EN3155-019F2020.',
        'Chaque maillon vient de <b>sa</b> table, et d’elle seule. Un contact ne se devine pas : il se lit dans la table des contacts, à la taille, au sexe et à la gauge.',
        'Si un maillon manque — une famille inconnue, aucune face qui loge les câbles —, la chaîne s’arrête là, et la fiche le dit : c’est pourquoi un contact reste vide.'],
      `<p><b>Famille</b> : la famille la plus longue dont le nom commence la référence (table des connecteurs ; la base SEE gardée en plus). <b>Face</b> : celle que la référence nomme, sinon la plus petite de la famille qui a toutes les bornes et dont chaque cavité admet la gauge de son câble ; « Changer » sur la fiche en prend une autre. <b>Cavité</b> : la borne numérotée va sur son numéro, une borne lettrée sur sa lettre (ou la lettre de même rang). <b>Contact</b> : la ligne la plus précise gagne — le type de câble exact avant « tout câble », la gauge exacte avant « toute gauge » ; le sexe est celui du contact qu’on sertit (des douilles face à une embase d’équipement ; « Changer » l’inverse). Autour du connecteur, le toron (√ de la somme des Ø², × le facteur TE), le raccord (votre table CHOIX), le manchon et le collier suivent la même règle : une table, une ligne, sinon « manque ».</p>`),
    cpChapitre('disjoncteur', 3, 'La chaîne d’un disjoncteur', 'Un disjoncteur doit <b>laisser passer</b> ce que les équipements consomment, et <b>couper avant</b> que les câbles chauffent trop. Volta part de la <b>consommation</b>, en fait un <b>profil</b>, le pose sur la <b>courbe</b> de la famille, choisit le <b>calibre</b>, vérifie les <b>câbles</b>, puis la <b>chute</b> de tension.', cpSchemaDisjoncteur(),
      ['L’exemple est 102CB1 : il démarre à 9,31 A pendant 2 minutes, puis tire 5 A. Le 10 A frôle sa courbe : il passe, mais sans la marge (« juste »). Le 15 A passe avec la marge : Volta l’écrit, et grossit ses trois câbles en DR12 pour que le 15 A les protège.',
        'La courbe dit combien de temps le disjoncteur met à couper, selon le courant. Un point du profil à gauche de la courbe ne déclenche pas.',
        'Un câble doit tenir le courant, et être protégé par le calibre : si le calibre monte, le câble grossit — jamais l’inverse.',
        'La chute se compte du disjoncteur jusqu’au bout du câble, contacts et disjoncteur compris : 2 V au plus, pointes comprises (votre règle).'],
      `<p><b>Profil</b> : la consommation des équipements qu’il alimente (section « Consommation » de leur fiche), ou le profil écrit sur sa fiche — démarrage, transition (un courant pendant une durée), permanent. Chaque phase dure, pour la courbe, autant que toutes les phases au moins aussi fortes qu’elle. <b>Courbe</b> : celle de la famille du part number (table Familles de disjoncteurs ; un part number inconnu est une E-T-A 4120), à la température max du tableau (125 °C : la plus rapide) ; un état qui survient chaud se divise par le préchauffage (MS3320N, ÷ 1,6). Le permanent reste sous ce que la famille garantit de tenir (table Calibration). <b>Calibre</b> : le plus petit de la gamme (vos calibres préférés) qui tient le permanent et les pointes avec 10 % de marge de courant et 75 % au plus du temps de déclenchement, et qui reste sélectif 2:1 avec ses voisins. Un calibre du fichier qui touche la courbe est remplacé par celui-là, son part number réécrit, ses câbles grossis (une case des Hypothèses coupe la règle). <b>Câbles</b> : chacun tient le profil (EN 2853, déclassée par le faisceau et l’altitude) et la courbe lente du disjoncteur reste sous sa courbe de dommage. <b>Chute</b> : la résistance du câble (corrigée de sa température) × la longueur (5 m tant qu’elle manque : une hypothèse) × le courant, plus la chute propre du disjoncteur et celle de chaque contact traversé.</p>`),
    cpChapitre('routes', 4, 'Les routes : gauche, droite', 'Chaque câble suit une <b>route</b> (la colonne H de votre fichier : 1MO, 2HO…). Le nombre en tête dit le côté de l’appareil : <b>impair à gauche, pair à droite</b>. Un même connecteur qui reçoit des câbles des deux côtés fait un <b>branchement en chaîne</b>.', cpSchemaRoutes(),
      ['Deux routes du même côté sur un connecteur : rien à dire.',
        'Gauche et droite mêlées sur un même connecteur, un même module de barrette ou un même côté de prise : « branchement en chaîne », un point <b>à voir</b> (pas un problème : c’est parfois sans choix).',
        'Une <b>prise de coupure change de route</b> : sa fiche et son embase peuvent porter deux routes différentes. Chaque côté se juge à part.'],
      `<p>Le côté se lit dans le premier nombre de la route (« 1MO » → 1, impair → gauche) ; une route sans nombre n’a pas de côté et ne se juge pas. Le contrôle regroupe les câbles par lieu — un connecteur (ou une cavité lettrée d’un connecteur EN 4165), un module de barrette, le côté fiche ou le côté embase d’une prise — et relève, en ambre, chaque lieu qui mêle les deux côtés, avec les routes de chacun. Les disjoncteurs et les borniers ne sont pas jugés. La légende du folio écrit G ou D à côté de chaque route.</p>`),
    cpChapitre('manque', 5, 'Ce que veut dire « manque »', '« Manque », c’est Volta qui dit : <b>je ne sais pas, et je ne l’invente pas</b>. Une table n’a pas la ligne qu’il faut ; la case reste vide, et la fiche dit laquelle, et pourquoi.', cpSchemaManque(),
      ['<b>Vérifié</b> : deux sources indépendantes (la norme, des catalogues) disent la même chose.',
        '<b>À confirmer</b> : une seule source, ou une norme qui n’est pas publique (Airbus, Airbus Helicopters). La valeur sert, et la bulle dit pourquoi elle reste à confirmer.',
        '<b>Hypothèse</b> : ce que votre fichier ne dit pas, Volta le suppose et l’écrit « hypothèse » (une longueur de 5 m, une ambiante de 95 °C) ; ⋮ › Plus › Hypothèses le change.',
        '<b>Manque</b> : aucune ligne. Pour le combler : la base SEE gardée la donne peut-être ; sinon déposez la ligne (⋮ › Vos fichiers › Normes) ou écrivez-la sur la page Normes.'],
      `<p>Un « manque » n’est jamais muet : il nomme la table et la clé cherchée (« aucune ligne de la table des raccords pour l’EN 3646, classe K, taille 12 »). Ce qui en dépend s’arrête aussi (pas de raccord, pas de code d’entrée, donc pas de manchon). La liste de ce qui manque encore à l’outil, et la forme sous laquelle le donner, est dans CE-QUI-MANQUE.md ; chaque donnée reçue fait disparaître un « à confirmer » ou un « manque ».</p>`),
    cpChapitre('verifier', 6, 'Comment vérifier', 'Tout ce que Volta montre se remonte jusqu’à sa table. Sur la fiche d’un connecteur, dépliez <b>« D’où vient chaque pièce »</b> : chaque maillon y dit sa table et sa source. À côté de chaque valeur, un <b>point</b> dit d’où elle vient — survolez-le.', cpSchemaVerifier(),
      ['Le point <b>plein vert</b> : vérifié par deux sources (la bulle les nomme). <b>À moitié</b> : vos tables. <b>Un anneau ambre</b> : à confirmer, et pourquoi.',
        'Le <b>« ? »</b> à côté d’une valeur choisie dit comment Volta l’a choisie, en une phrase, ses chiffres, ses étapes et ses sources.',
        'La <b>Bible</b> montre chaque module et chaque arrangement en grand, avec son origine. Les <b>Normes</b> montrent chaque table : d’où elle vient, qui la lit, comment une ligne se choisit.',
        'La <b>base SEE</b>, onglet Cohérence : la base vérifiée ligne par ligne, et ce que seul Volta a.'],
      `<p>Les sources de chaque ligne sont dans les colonnes Source et Statut des tables (normes/*.csv, lisibles sur la page Normes) : « vérifié (deux sources : … ) », « à confirmer (une source : …) », « à confirmer (non public : …) » ; vide, c’est votre donnée. Le dossier PDF porte une page « Hypothèses et sources » ; l’installation corrigée, une feuille « Volta » (cachée) avec les hypothèses et les choix faits à la main. ${cpLien('normes', 'Ouvrir les Normes')} ${cpLien('bible', 'Ouvrir la Bible')}</p>`)];
  return `<div class="vr">${nmTitre('Pour tous, du novice au bureau d’études', 'Comment Volta réfléchit')}`
    + `<div class="vr-page">${sommaire}<div class="vr-texte"><p class="vr-chapeau">Volta ne devine rien. Il lit votre fichier, prend les pièces dans un catalogue, applique des règles de physique, et vous montre d’où vient chaque chose. Six images pour tout comprendre.</p>${ch.join('')}</div></div></div>`; }
/* Ouvrir la page (sur un chapitre). Elle prend la page entière : on la lit comme un livre, le plan attend derrière. */
function ficheComprendre(chapitre) { const deja = !!(app.fiche && app.fiche.mode === 'comprendre');
  ouvrirFiche({ mode: 'comprendre', largeur: 'page' }, comprendreHtml(), '');
  lierComprendre(); if (typeof lierBullesDoc === 'function') lierBullesDoc();
  const c = $('fiche-corps'), id = typeof chapitre === 'string' && CHAPITRES_COMPRENDRE.some(([k]) => k === chapitre) ? chapitre : '';
  if (id) allerAuChapitre(id, true); else if (!deja && typeof clavierAuDoc === 'function') clavierAuDoc();
  marquerChapitre(); return c; }
function allerAuChapitre(id, ouvrir) { const c = $('fiche-corps'), s = c && c.querySelector('#vr-' + id); if (!s) return;
  const t = c.querySelector('.fiche-tete'), haut = t && getComputedStyle(t).position === 'sticky' ? t.offsetHeight : 0;
  c.scrollTop += s.getBoundingClientRect().top - c.getBoundingClientRect().top - haut - 12;
  const h = s.querySelector('h3'); if (h) { h.tabIndex = -1; try { h.focus({ preventScroll: true }); } catch (_) { } }
  if (ouvrir) { s.classList.remove('vise'); void s.offsetWidth; s.classList.add('vise'); } marquerChapitre(id); }
// le chapitre qu'on lit se marque dans le sommaire (celui dont le titre a passé le haut de la page)
function marquerChapitre(force) { const c = $('fiche-corps'); if (!c) return; const ss = [...c.querySelectorAll('.vr-ch')]; if (!ss.length) return;
  // au bout de la page, le dernier chapitre (son titre ne peut plus monter jusqu'au haut)
  const haut = c.getBoundingClientRect().top + 120, bout = c.scrollTop + c.clientHeight >= c.scrollHeight - 4;
  const ici = force || (bout ? ss[ss.length - 1] : ss.filter(s => s.getBoundingClientRect().top <= haut).pop() || ss[0]).dataset.chapitre;
  c.querySelectorAll('[data-vr-ch]').forEach(b => { const on = b.dataset.vrCh === ici; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); }); }
function lierComprendre() { const c = $('fiche-corps'); if (!c) return;
  c.querySelectorAll('[data-vr-ch]').forEach(b => b.onclick = () => allerAuChapitre(b.dataset.vrCh, true));
  c.querySelectorAll('[data-vr-aller]').forEach(b => b.onclick = () => { const g = b.dataset.vrAller;
    if (g === 'normes') ficheNormes(); else if (g === 'bible') ficheBible(); else if (g === 'seul-volta' && typeof montrerSeulVoltaSEE === 'function') montrerSeulVoltaSEE(); });
  if (!c.dataset.vrLie) { c.dataset.vrLie = '1'; let t = 0; c.addEventListener('scroll', () => { if (!(app.fiche && app.fiche.mode === 'comprendre')) return; cancelAnimationFrame(t); t = requestAnimationFrame(() => marquerChapitre()); }, { passive: true }); } }

/* ---- la page se trouve : le menu (⋮ › Plus, la ligne est dans page.html) et chaque « ? » ------------------------------ */
// le menu lit ses gestes dans MENU.actions (08-interface, `lierMenu`) : celui-ci y est posé d'avance (MENU est un `var`)
MENU = (typeof MENU !== 'undefined' && MENU) || { actions: {} }; MENU.actions.comprendre = () => ficheComprendre();
/* LE « ? » (08-sections) : dans la bulle qui dit comment Volta a choisi CETTE valeur, un lien vers le chapitre qui dit
   comment il réfléchit en général — sans toucher à la bulle elle-même : on la regarde se remplir, et on ajoute le lien.
   Il se met dans la ligne du titre, à droite : la bulle garde sa hauteur, donc sa place (sous le « ? » ; plus haute,
   elle se retournait au-dessus et couvrait le cadran du calibre). */
(function lierLesQ() { if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  const poser = el => { if (!el || el.hidden || el.querySelector('.q-comprendre')) return; const b = typeof AIDE !== 'undefined' && AIDE.bouton, cle = b && b.dataset.q, ch = typeof chapitreDeLExplication === 'function' ? chapitreDeLExplication(cle) : 'cuisinier';   // 08-explications
    const t = (CHAPITRES_COMPRENDRE.find(([k]) => k === ch) || ['', ''])[1], tete = el.querySelector('.q-tete');
    const lien = `<button type="button" class="btn lien dense q-comprendre" data-comprendre="${ch}" data-bulle="${escA('Comment Volta réfléchit — ' + t)}">Comprendre<span aria-hidden="true"> →</span></button>`;
    if (tete) tete.insertAdjacentHTML('beforeend', lien); else el.insertAdjacentHTML('beforeend', `<p class="q-comprendre-l">${lien}</p>`);
    if (typeof placerAide === 'function') placerAide(); };
  let vu = null; const regarder = el => { if (vu === el) return; vu = el; new MutationObserver(() => poser(el)).observe(el, { childList: true }); poser(el); };
  const chercher = () => { const el = document.getElementById('fi-q-bulle'); if (el) regarder(el); };
  const guetter = () => { chercher(); new MutationObserver(chercher).observe(document.body, { childList: true }); };
  if (document.body) guetter(); else document.addEventListener('DOMContentLoaded', guetter);
  document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('[data-comprendre]'); if (!b) return; e.preventDefault();
    if (typeof fermerAide === 'function') fermerAide(); ficheComprendre(b.dataset.comprendre); }); })();
