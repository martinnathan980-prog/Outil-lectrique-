/* ===========================================================================
   UN FOLIO DE SCHÉMA INVENTÉ — placer, router, dessiner, dire la vérité
   ---------------------------------------------------------------------------
   Un folio se décrit par ce qu'il porte : des ÉQUIPEMENTS en colonnes (une
   boîte et ses broches, un disjoncteur, un relais, une barrette et ses
   modules, une prise de coupure, un voyant…) et des FILS d'un bout à l'autre
   (une broche, une masse, un renvoi vers un autre folio). Le compositeur pose
   les équipements, donne à chaque broche son côté, route les fils sur la
   grille (routeur.js : ils se croisent, jamais ne se touchent), puis dessine
   le tout dans le style d'un des trois « logiciels ».

   LA FORME DES VRAIS SCHÉMAS (le lecteur, 8 novembre 2026), commune aux trois :
     · des boîtes PLEINES (un trait continu, jamais des tirets) ;
     · les relais et les disjoncteurs ont leur SYMBOLE DESSINÉ DANS LA BOÎTE
       (la bobine et le contact ; les bornes rondes et l'arc, ou un bilame) :
       des traits qui vont du bord de la boîte au symbole — ce ne sont pas des
       fils ;
     · une barrette se dessine en PASTILLES SUR UN POINTILLÉ : une pastille
       par contact, le pointillé relie les contacts d'un même groupe (une même
       plage de métal) ; le contact se dit module + lettre (667VT2:51B) ;
     · des masses à TROIS BARRES ;
     · un renvoi dit le FOLIO ET LA ZONE de l'autre bout (« F5/C3 ») ; vers un
       autre plan du dossier, son numéro devant (« SC-4520-320 F5/C3 ») ;
     · des NUMÉROS DE FIL, parfois (une partie des folios) : le même numéro
       des deux côtés d'un renvoi ;
     · des cartouches EN FRANÇAIS.
   Trois « logiciels », pour la variété :
     A « atelier »         le repère et les numéros DEDANS, les connecteurs en
                           sous-boîtes lettrées, un relais à bobine
                           rectangulaire, un disjoncteur à bornes rondes et
                           arc, des pastilles pleines lettrées en blanc sous
                           le numéro du module, un drapeau « F5/C3 »,
                           cartouche « fr », numéros de fil « W1024 » ;
     B « ancien logiciel » des boîtes en quatre traits, le repère et les
                           numéros DEHORS, un relais à bobine ronde, un
                           disjoncteur à bilame (un zigzag) et son calibre
                           « 5A » dedans, des pastilles creuses lettrées en
                           noir, le module à côté, des T sans point (un sur
                           deux), une flèche « F5/C3 », cartouche « fr2 »,
                           numéros de fil « W-2051 » ;
     C « outil de schéma » des numéros écrits debout, des ponts aux
                           croisements, un relais électronique (une bobine
                           barrée), un disjoncteur à bouton, des pastilles en
                           gélule où « 51A » est écrit, un hexagone « F5/C3 »,
                           cartouche en bande.
   Deux fils sur une même broche : le premier la prend, le second fait un T sur
   lui, près d'elle, avec un point de jonction (le style B en oublie un sur deux).
   Il rend le SVG, la SCÈNE (la géométrie de tout, pour l'écrivain Visio) et la
   VÉRITÉ du folio — chaque fil dessiné, borne à borne, vérifiée contre le
   dessin lui-même (l'arbre de proche en proche que VOLTA suit doit redonner
   les fils écrits : sinon le générateur refuse son propre dessin).
   (Les documents d'avant — boîtes en tirets, masses en râteau, barrettes en
   cases, renvois « F°12 — B4 » et « 245-C3 », cartouche anglais — sont gardés
   tels quels dans tests/documents/v0/, pour comparer.)
   =========================================================================== */
'use strict';
const { toile, feuille, zoneDe, CADRE, triNaturel, arbreDuReseau, f2 } = require('./commun');
const { routeur, PAS } = require('./routeur');

const g = PAS, grille = x => Math.round(x / g) * g, ROW = 5, STUB = 2;
const STYLES = {
  A: { police: 'Liberation Sans', fil: 0.3, cart: 'fr', nomDedans: true, brocheDedans: true, relais: 'bobine', cb: 'ronds', barrette: 'lettres', masse: 'barres', renvoi: 'drapeau', point: 1, ponts: false, boite: 'plein', tauxType: 0.8, numero: n => 'W' + n },
  B: { police: 'Liberation Serif', fil: 0.28, cart: 'fr2', nomDedans: false, brocheDedans: false, relais: 'cercle', cb: 'bilame', barrette: 'cercles', masse: 'barres-larges', renvoi: 'fleche', point: 0.5, ponts: false, boite: 'quatre', tauxType: 0.6, numero: n => 'W-' + n },
  C: { police: 'DejaVu Sans Mono', fil: 0.32, cart: 'bande', nomDedans: false, brocheDedans: 'debout', relais: 'barree', cb: 'bouton', barrette: 'gelules', masse: 'barres', renvoi: 'hexagone', point: 1, ponts: true, boite: 'plein', tauxType: 0.7, numero: n => 'W' + n } };
// la boîte d'un disjoncteur : sa taille, la hauteur de ses deux bornes
const CB_GEO = { ronds: { w: 17.5, h: 12.5, dy: 7.5 }, bilame: { w: 12.5, h: 7.5, dy: 5 }, bouton: { w: 15, h: 10, dy: 5 } };
// une barrette : la largeur de sa colonne, le numéro du module au-dessus (une rangée), jusqu'où le fil entre (le bord de la pastille)
const BARRETTE = { lettres: { w: 5, tete: true, portee: 1 }, cercles: { w: 5, tete: false, portee: 0.9 }, gelules: { w: 7.5, tete: false, portee: 0.5 } };

// le nom écrit d'une broche : la borne, sans la lettre de son connecteur quand le connecteur est dessiné
const decouper = nom => { const m = /^([A-Z])(\d{1,3})$/.exec(nom); return m ? { connecteur: m[1], numero: m[2] } : { connecteur: '', numero: nom }; };
const memePoint = (p, q) => Math.abs(p[0] - q[0]) < 1e-6 && Math.abs(p[1] - q[1]) < 1e-6;
const aligne = (r, q, p) => (Math.abs(r[0] - q[0]) < 1e-6 && Math.abs(q[0] - p[0]) < 1e-6) || (Math.abs(r[1] - q[1]) < 1e-6 && Math.abs(q[1] - p[1]) < 1e-6);
function nettoyer(pts) { const out = []; pts.forEach(p => { const q = out[out.length - 1], r = out[out.length - 2]; if (q && memePoint(q, p)) return; if (r && aligne(r, q, p)) out[out.length - 1] = p; else out.push(p); }); return out; }

/* ---- le folio ----------------------------------------------------------------------------------------------------
   spec : { style, cart, equipements, fils, notes, numeros }. Un fil : { id, a, b, type, numero, dessin: [] } ; un bout :
   { pin: [rep, borne] } | { masse: '901G' } | { renvoi: { cle, folio, signal } }. `numeros` : ce folio écrit les numéros de fil. */
function composer(spec) {
  const S = STYLES[spec.style], R = routeur(), T = toile({ police: S.police, trait: S.fil });
  const F = feuille(T, spec.cart, S.cart), Z = F.zoneLibre, folio = spec.cart.folio;
  const scene = { style: spec.style, cart: spec.cart, cartouche: F.cartouche, champs: F.champs, equipements: [], fils: [], masses: [], renvois: [], points: [], textes: [], numeros: !!spec.numeros };
  R.horsZone({ x0: Z.x0 + 2, y0: Z.y0 + 2, x1: Z.x1 - 2, y1: Z.y1 - 2 }); R.bloquer(F.cartouche.x0, F.cartouche.y0, F.cartouche.x1, F.cartouche.y1, 2);
  // les notes du folio, en bas à gauche
  const notes = spec.notes || []; let hautNotes = Infinity;
  if (notes.length) { const y0 = (S.cart === 'bande' ? F.cartouche.y0 : CADRE.y1) - 6 - 4.2 * notes.length; hautNotes = y0 - 5; T.texte(Z.x0 + 4, y0, 'NOTES :', { taille: 2.2, gras: true });
    notes.forEach((n, i) => T.texte(Z.x0 + 4, y0 + 4.2 * (i + 1), n, { taille: 2 })); R.bloquer(Z.x0, y0 - 4, Z.x0 + 160, y0 + 4.2 * notes.length + 2, 1); }
  // un renvoi vers un folio plus loin dans le document part à droite ; vers un folio d'avant, à gauche
  const ici = spec.n != null ? +spec.n : +folio, versLaDroite = rv => (rv.n != null ? +rv.n : +rv.folio) > ici;
  const eqs = spec.equipements.map(e => ({ ...e, broches: new Map() }));
  const parRep = new Map(eqs.map(e => [e.rep, e]));
  const nCol = Math.max(...eqs.map(e => e.col)) + 1;

  /* 1. LES BROCHES : celles que les fils touchent, celles que l'équipement montre toujours ; un côté chacune */
  const fils = spec.fils.map((w, k) => ({ ...w, net: k + 1 }));
  const broche = (rep, nom) => { const e = parRep.get(rep); if (!e) throw new Error('folio ' + folio + ' : équipement inconnu ' + rep);
    if (!e.broches.has(nom)) e.broches.set(nom, { e, nom, fils: [] }); return e.broches.get(nom); };
  eqs.forEach(e => (e.bornes || []).forEach(n => broche(e.rep, n)));
  eqs.filter(e => e.genre === 'relais').forEach(e => ['X1', 'X2', 'A1', 'A2', 'A3'].forEach(n => broche(e.rep, n)));
  eqs.filter(e => e.genre === 'disjoncteur').forEach(e => ['1', '2'].forEach(n => broche(e.rep, n)));
  eqs.filter(e => e.genre === 'barrette').forEach(e => e.modules.forEach(M => [...M.lettres].forEach(l => broche(e.rep, M.num + l))));
  eqs.filter(e => e.genre === 'prise').forEach(e => [...e.lettres].forEach(l => broche(e.rep, l)));
  // l'autre bout d'un fil, vu d'une broche : vers la gauche (-1), la droite (+1), ou une masse (0)
  // (un pontage entre deux broches d'un même équipement ne vote pas : il se pose en dernier, en pont entre leurs deux fils)
  const versOu = (e, bout) => bout.pin ? (bout.pin[0] === e.rep ? 0 : Math.sign(parRep.get(bout.pin[0]).col - e.col) || (e.col < nCol / 2 ? 1 : -1)) : bout.renvoi ? (versLaDroite(bout.renvoi) ? 1 : -1) : 0;
  fils.forEach(w => [[w.a, w.b], [w.b, w.a]].forEach(([x, y]) => { if (!x.pin) return; const b = broche(x.pin[0], x.pin[1]); b.fils.push({ w, autre: y, sens: versOu(b.e, y) }); }));
  // les groupes des barrettes : les contacts d'une même plage de métal, que le pointillé relie (de proche en proche, dans l'ordre des lettres)
  const peignes = [];
  eqs.filter(e => e.genre === 'barrette').forEach(e => e.modules.forEach(M => (M.bus || []).forEach(lettres => peignes.push({ e, M, lettres: [...lettres], net: 1000 + peignes.length, type: M.typeBus || 'DR22' }))));
  // le côté de chaque broche
  eqs.forEach(e => { const B = [...e.broches.values()];
    if (e.genre === 'disjoncteur') B.forEach(b => { b.cote = b.nom === '1' ? 'G' : 'D'; b.fils.forEach(f => { f.cote = b.cote; }); });
    else if (e.genre === 'relais') B.forEach(b => { b.cote = /^X/.test(b.nom) ? 'G' : 'D'; b.fils.forEach(f => { f.cote = b.cote; }); });
    else if (e.genre === 'prise') B.forEach(b => { const fs = b.fils.slice().sort((x, y) => x.sens - y.sens); fs.forEach((f, i) => { f.cote = fs.length === 2 ? (i === 0 ? 'G' : 'D') : (f.sens > 0 ? 'D' : 'G'); }); });
    // une pastille se prend des deux côtés : chaque fil du côté de son autre bout
    else if (e.genre === 'barrette') B.forEach(b => { b.peigne = peignes.find(p => p.e === e && p.lettres.some(l => p.M.num + l === b.nom)) || null; b.fils.forEach(f => { f.cote = f.sens < 0 ? 'G' : 'D'; }); });
    else { // une boîte : le côté de l'autre bout ; les broches d'un même connecteur ensemble ; une masse du côté le moins chargé
      B.forEach(b => { const s = b.fils.map(f => f.sens).filter(Boolean); b.cote = e.cotes && e.cotes[b.nom] || (s.length ? (s.reduce((a, c) => a + c, 0) >= 0 ? 'D' : 'G') : null); });
      if (e.connecteurs) { const parC = new Map(); B.forEach(b => { const c = decouper(b.nom).connecteur; (parC.get(c) || parC.set(c, []).get(c)).push(b); });
        parC.forEach((bs, c) => { const d = bs.filter(b => b.cote === 'D').length, gg = bs.filter(b => b.cote === 'G').length, cc = (e.coteConnecteur && e.coteConnecteur[c]) || (d >= gg ? 'D' : 'G'); bs.forEach(b => { b.cote = cc; }); }); }
      const nG = B.filter(b => b.cote === 'G').length, nD = B.filter(b => b.cote === 'D').length;
      B.forEach(b => { if (!b.cote) b.cote = e.coteLibre || (nG < nD ? 'G' : 'D'); b.fils.forEach(f => { f.cote = b.cote; }); }); } });

  /* 2. LA GÉOMÉTRIE de chaque équipement : sa boîte, l'ancre de chaque broche (sur le bord), ce qu'on dessine */
  eqs.forEach(e => { const B = [...e.broches.values()];
    if (e.genre === 'disjoncteur') { const G = CB_GEO[S.cb]; e.w = G.w; e.h = G.h; e.dy = G.dy; e.haut = S.nomDedans ? 0 : 6; e.bas = 5; return; }
    if (e.genre === 'relais') { e.w = 25; e.h = 25; e.haut = S.nomDedans ? 0 : 6; e.bas = e.pn ? 5 : 2; return; }
    if (e.genre === 'prise') { e.w = 12.5; e.h = ROW * e.lettres.length + 5; e.haut = 6; e.bas = e.pn ? 5 : 2; return; }
    if (e.genre === 'barrette') { const n = e.modules.reduce((k, M) => k + M.lettres.length, 0), m = e.modules.length, Bq = BARRETTE[S.barrette];
      e.w = Bq.w; e.h = ROW * n + (Bq.tete ? ROW * m : ROW * (m - 1) + 2 * g); e.haut = 6; e.bas = e.pn ? 5 : 2; return; }
    // une boîte : des rangées de chaque côté (un connecteur prend une rangée de plus pour sa lettre)
    const rangs = cote => { const bs = B.filter(b => b.cote === cote); if (!e.connecteurs) return bs.length; return bs.length + new Set(bs.map(b => decouper(b.nom).connecteur)).size; };
    e.tete = S.nomDedans ? 10 : 5;
    e.w = Math.ceil((e.largeur || (e.genre === 'boite' ? 35 : 25)) / g) * g; e.h = Math.max(e.tete + ROW * Math.max(rangs('G'), rangs('D'), 1), e.genre === 'boite' ? 20 : 17.5); e.haut = S.nomDedans ? 0 : 6; e.bas = e.pn ? 5 : 2; });
  // les colonnes : de gauche à droite, des couloirs égaux ; dans chaque colonne, de haut en bas
  const X0 = 65, X1 = 355, cols = Array.from({ length: nCol }, (_, c) => eqs.filter(e => e.col === c));
  const largeurs = cols.map(c => Math.max(...c.map(e => e.w), 10)), couloir = nCol > 1 ? (X1 - X0 - largeurs.reduce((a, b) => a + b, 0)) / (nCol - 1) : 0;
  let x = nCol > 1 ? X0 : (X0 + X1) / 2 - largeurs[0] / 2; cols.forEach((c, k) => { c.forEach(e => { e.x = grille(x + (largeurs[k] - e.w) / 2); }); x += largeurs[k] + couloir; });
  const Ytop = Z.y0 + 8;
  cols.forEach((c, k) => { if (!c.length) return; const x0 = Math.min(...c.map(e => e.x)) - 15, x1 = Math.max(...c.map(e => e.x + e.w)) + 15;
    let bas = (S.cart === 'bande' ? F.cartouche.y0 : CADRE.y1) - 8; if (x1 > F.cartouche.x0) bas = Math.min(bas, F.cartouche.y0 - 8); if (x0 < Z.x0 + 165) bas = Math.min(bas, hautNotes);
    const total = c.reduce((s, e) => s + e.h + e.haut + e.bas, 0), place = bas - Ytop - total;
    if (place < 0) throw new Error(`folio ${folio} : la colonne ${k} déborde de ${f2(-place)} mm`);
    const ecart = Math.min(spec.ecartMax || 55, place / Math.max(1, c.length)); let y = Ytop + (c.length === 1 ? Math.min(place / 3, 60) : ecart / 2);
    c.forEach(e => { e.y = grille(y + e.haut); y = e.y + e.h + e.bas + ecart; }); });

  /* les ancres : sur le bord de la boîte, au pas de la grille ; `dir` : vers l'extérieur (-1 à gauche, +1 à droite) */
  const ancre = (b, cote, y) => { const e = b.e, p = [cote === 'G' ? e.x : e.x + e.w, y], a = { b, cote, p, dir: cote === 'G' ? -1 : 1 }; (b.ancres || (b.ancres = {}))[cote] = a; return a; };
  eqs.forEach(e => { const B = [...e.broches.values()].sort((x, y) => triNaturel(x.nom, y.nom));
    if (e.genre === 'disjoncteur') { const cy = e.y + e.dy; ancre(e.broches.get('1'), 'G', cy); ancre(e.broches.get('2'), 'D', cy); return; }
    if (e.genre === 'relais') { [['X1', 'G', 10], ['X2', 'G', 20], ['A1', 'D', 10], ['A2', 'D', 15], ['A3', 'D', 20]].forEach(([n, c, dy]) => { const b = e.broches.get(n); b.y = e.y + dy; ancre(b, c, b.y); }); return; }
    if (e.genre === 'prise') { [...e.lettres].forEach((l, i) => { const b = e.broches.get(l), y = e.y + ROW * (i + 1); b.y = y; ancre(b, 'G', y); ancre(b, 'D', y); }); return; }
    if (e.genre === 'barrette') { const Bq = BARRETTE[S.barrette]; let y = e.y; if (!Bq.tete) y += g;
      e.modules.forEach((M, m) => { if (Bq.tete) { M.yTete = y; y += ROW; } else if (m) y += ROW; M.y0 = y;
        [...M.lettres].forEach(l => { const b = e.broches.get(M.num + l); b.y = y + 2.5; b.lettre = l; b.module = M; ancre(b, 'G', b.y); ancre(b, 'D', b.y); y += ROW; }); M.y1 = y; }); return; }
    ['G', 'D'].forEach(cote => { let y = e.y + e.tete, prec = null;
      B.filter(b => b.cote === cote).forEach(b => { const c = e.connecteurs ? decouper(b.nom).connecteur : ''; if (e.connecteurs && c !== prec) { y += ROW; prec = c; } b.y = y; ancre(b, cote, y); y += ROW; }); }); });
  // ce qui est occupé : les boîtes (et une marge), leurs textes (le numéro du module d'une barrette à pastilles creuses, à sa droite)
  eqs.forEach(e => { R.bloquer(e.x, e.y - e.haut - 1, e.x + e.w + (e.genre === 'barrette' && S.barrette === 'cercles' ? 3 : 0), e.y + e.h + e.bas, 1); });

  /* 3. ROUTER. L'ordre : les fils de broche à broche du plus court au plus long, puis les masses et les renvois. Chaque
     ancre appartient au premier fil qui la touche (son amorce est réservée avant tout routage) ; les suivants y font un T. */
  const traits = [], jonctions = [];
  const ancreDe = (w, bout) => { const b = broche(bout.pin[0], bout.pin[1]), f = b.fils.find(x => x.w === w); return b.ancres[f.cote || b.cote]; };
  const longueur = w => { const P = [w.a, w.b].map(o => o.pin ? ancreDe(w, o).p : null).filter(Boolean); return P.length === 2 ? Math.abs(P[0][0] - P[1][0]) + Math.abs(P[0][1] - P[1][1]) : 1000; };
  const ordre = [...fils].sort((x, y) => longueur(x) - longueur(y));
  const pont = w => w.a.pin && w.b.pin && w.a.pin[0] === w.b.pin[0] && parRep.get(w.a.pin[0]).genre !== 'barrette';
  const ordreRoutage = [...ordre.filter(w => w.a.pin && w.b.pin && !pont(w)), ...ordre.filter(w => !(w.a.pin && w.b.pin)), ...ordre.filter(pont)];
  const proprio = new Map();   // ancre → fil
  ordreRoutage.forEach(w => [w.a, w.b].forEach(bout => { if (!bout.pin) return; const a = ancreDe(w, bout); if (!proprio.has(a)) proprio.set(a, w); }));
  const stubs = new Map();     // ancre → nœuds de l'amorce (de la broche vers l'extérieur)
  proprio.forEach((w, a) => { const nds = []; for (let k = 0; k <= STUB; k++) { const n = R.id(...R.versNoeud(a.p[0] + a.dir * k * g, a.p[1])); if (R.coin[n] >= 0 && R.coin[n] !== w.net) throw new Error('folio ' + folio + ' : deux amorces se touchent près de ' + a.b.e.rep + ':' + a.b.nom); R.reserver(n, w.net); nds.push(n); } stubs.set(a, nds); });
  // les T possibles sur le fil qui tient une ancre : ses nœuds droits, à plus de deux pas de la broche, au plus à 25 mm
  const candidatsT = a => { const w = proprio.get(a); let nds = w.noeuds; if (!nds) return []; if (nds[0] !== stubs.get(a)[0]) nds = nds.slice().reverse();
    const out = []; for (let k = STUB + 1; k < nds.length - 1 && k * g <= 25; k++) { const n = nds[k]; if (R.coin[n] >= 0) continue;
      const h = R.occH[n] === w.net, v = R.occV[n] === w.net; if (h && R.occV[n] < 0) out.push({ n, sens: 1, cout: 2 * k }); else if (v && R.occH[n] < 0) out.push({ n, sens: 0, cout: 2 * k }); }
    return out; };
  const noeudLibre = (x, y) => { const [i, j] = R.versNoeud(x, y); return i >= 0 && j >= 0 && i < R.nx && j < R.ny && R.libre(R.id(i, j)); };
  const zoneLibre = (x0, y0, x1, y1) => { for (let y = y0; y <= y1 + 1e-6; y += g) for (let x = x0; x <= x1 + 1e-6; x += g) if (!noeudLibre(x, y)) return false; return true; };
  const bloquerTemp = (x0, y0, x1, y1, sauf) => { const pris = []; for (let y = y0; y <= y1 + 1e-6; y += g) for (let x = x0; x <= x1 + 1e-6; x += g) { const k = R.id(...R.versNoeud(x, y)); if (k !== sauf && !R.bloque[k]) { R.bloque[k] = 1; pris.push(k); } } return () => pris.forEach(k => { R.bloque[k] = 0; }); };
  for (const w of ordreRoutage) {
    const bA = w.a.pin ? w.a : w.b, bB = bA === w.a ? w.b : w.a; if (!bA.pin) throw new Error('un fil sans broche');
    const aA = ancreDe(w, bA), depT = proprio.get(aA) !== w;
    const departs = depT ? candidatsT(aA).map(c => ({ n: c.n, sens: c.sens, g0: c.cout })) : [{ n: stubs.get(aA)[STUB], sens: 0 }];
    if (!departs.length) throw new Error(`folio ${folio} : pas de place pour un T près de ${aA.b.e.rep}:${aA.b.nom}`);
    let chemin = null, cible = null;
    if (bB.pin) { const aB = ancreDe(w, bB), butT = proprio.get(aB) !== w, buts = new Map();
      if (butT) candidatsT(aB).forEach(c => buts.set(c.n, { sens: [c.sens], t: true, cout: c.cout })); else buts.set(stubs.get(aB)[STUB], { sens: [0, 1] });
      chemin = R.chemin(w.net, departs, buts); cible = { ancre: aB, t: butT }; }
    else if (bB.masse) { const x0 = aA.p[0] + aA.dir * STUB * g, y0 = aA.p[1], cands = [];
      for (const dy of [4, 5, 6, -6, -7, 7, 8, -8, 9, 10, -10, 12, -12]) for (const dx of [1, 2, 3, 4, 6, 0, 8, -2]) cands.push([x0 + aA.dir * dx * g, y0 + dy * g]);
      for (const [mx, my] of cands) { if (!zoneLibre(mx - 2 * g, my - g, mx + 4 * g, my + g)) continue; const n = R.id(...R.versNoeud(mx, my));
        const rendre = bloquerTemp(mx - 2 * g, my, mx + 4 * g, my + g, n); const c = R.chemin(w.net, departs, new Map([[n, { sens: [1] }]]));
        if (c && R.mm(c[c.length - 2])[1] < my - 1e-6) { chemin = c; cible = { masse: bB.masse, p: [mx, my] }; break; } rendre(); } }
    else if (bB.renvoi) { const droite = versLaDroite(bB.renvoi), xF = droite ? 380 : 40, y0 = aA.p[1];
      const dys = []; for (let d = 0; d <= 100; d++) { dys.push(d); if (d) dys.push(-d); }
      for (const dy of dys) { const yF = grille(y0 + dy * g); if (yF < Z.y0 + 10 || yF > Z.y1 - 6) continue;
        const xa = droite ? xF + g : xF - 7 * g, xb = droite ? xF + 7 * g : xF - g; if (!zoneLibre(xa, yF - 3 * g, xb, yF + 2 * g) || !noeudLibre(xF, yF)) continue;
        const n = R.id(...R.versNoeud(xF, yF)), rendre = bloquerTemp(xa, yF - 3 * g, xb, yF + 2 * g, n);
        const c = R.chemin(w.net, departs, new Map([[n, { sens: [0] }]]));
        if (c && (droite ? R.mm(c[c.length - 2])[0] < xF - 1e-6 : R.mm(c[c.length - 2])[0] > xF + 1e-6)) { chemin = c; cible = { renvoi: bB.renvoi, p: [xF, yF], droite }; break; } rendre(); } }
    if (!chemin) throw new Error(`folio ${folio} : le fil ${w.id} (${JSON.stringify(w.a)} → ${JSON.stringify(w.b)}) ne trouve pas de chemin`);
    R.poser(w.net, chemin, cible && cible.t ? proprio.get(cible.ancre).net : null);
    // les nœuds du fil entier, de sa broche de départ à sa fin (les amorces comprises)
    const nA = depT ? [] : stubs.get(aA).slice(0, STUB), nB = cible.ancre && !cible.t ? stubs.get(cible.ancre).slice(0, STUB).reverse() : [];
    w.noeuds = [...nA, ...chemin, ...nB]; w.aA = aA; w.cible = cible;
    let pts = nettoyer(w.noeuds.map(R.mm));
    // une barrette : le fil entre dans la colonne jusqu'au bord de la pastille
    const pastille = a => a && a.b.e.genre === 'barrette' ? [a.p[0] - a.dir * BARRETTE[S.barrette].portee, a.p[1]] : null;
    const pa = !depT && pastille(aA), pb = cible.ancre && !cible.t && pastille(cible.ancre); if (pa) pts = [pa, ...pts]; if (pb) pts = [...pts, pb];
    if (depT) jonctions.push({ p: pts[0], net: proprio.get(aA).net, t: w.net });
    if (cible.t) jonctions.push({ p: pts[pts.length - 1], net: proprio.get(cible.ancre).net, t: w.net });
    w.pts = pts; traits.push({ net: w.net, pts, w });
    if (cible.masse) scene.masses.push({ rep: cible.masse, p: cible.p, net: w.net });
    if (cible.renvoi) scene.renvois.push({ ...cible.renvoi, p: cible.p, droite: cible.droite, net: w.net, zone: zoneDe(cible.p[0], cible.p[1]), numero: spec.numeros ? w.numero || '' : '' }); }

  /* 4. LA VÉRITÉ du folio, vérifiée contre le dessin : chaque réseau électrique (des fils reliés par un T) rend, par l'arbre
     de proche en proche, exactement les fils qu'il dessine ; un groupe de barrette, ses contacts de proche en proche */
  const nomBout = bout => bout.masse ? { rep: bout.masse, borne: '' } : bout.renvoi ? null : { rep: bout.pin[0], borne: bout.pin[1] };
  const cleB = o => o.rep + ':' + o.borne;
  const verite = fils.map(w => ({ a: nomBout(w.a), b: nomBout(w.b), w, type: w.type, dessin: [...(w.dessin || [])] }));
  peignes.forEach(P => { for (let k = 1; k < P.lettres.length; k++) verite.push({ a: { rep: P.e.rep, borne: P.M.num + P.lettres[k - 1] }, b: { rep: P.e.rep, borne: P.M.num + P.lettres[k] }, type: P.type, dessin: ['barrette', 'pontage', 'pointillé'], peigne: P }); });
  // les réseaux électriques : les fils réunis par leurs T
  const parent = new Map(), fr = n => { while (parent.get(n) !== n) n = parent.get(n); return n; }, un = (a, b) => parent.set(fr(a), fr(b));
  fils.forEach(w => parent.set(w.net, w.net)); jonctions.forEach(j => { if (j.t) un(j.t, j.net); });
  const groupes = new Map(); fils.forEach(w => { const r = fr(w.net); (groupes.get(r) || groupes.set(r, []).get(r)).push(w); });
  const verifier = (segs, bouts, attendu) => { const A = arbreDuReseau(segs, bouts); if (!A) throw new Error('folio ' + folio + ' : réseau non connexe');
    const lu = A.map(p => p.slice().sort().join(' | ')).sort(), at = attendu.map(p => p.slice().sort().join(' | ')).sort();
    if (JSON.stringify(at) !== JSON.stringify(lu)) throw new Error(`folio ${folio} : le dessin ne dit pas la vérité — attendu ${at.join(' ; ')} — dessiné ${lu.join(' ; ')}`); };
  // (un renvoi y compte comme un bout : VOLTA l'y lit aussi)
  const cleV = bout => bout.renvoi ? '§' + bout.renvoi.cle : cleB(nomBout(bout));
  groupes.forEach(ws => { if (ws.length < 2) return;
    const segs = ws.flatMap(w => w.pts.slice(1).map((p, k) => [w.pts[k], p])), bouts = [], vus = new Set();
    ws.forEach(w => { const pA = w.aA === ancreDe(w, w.a.pin ? w.a : w.b) ? w.aA.p : w.pts[0];
      [[w.a.pin ? w.a : w.b, pA, w.aA], [w.a.pin ? w.b : w.a, w.pts[w.pts.length - 1], w.cible.ancre]].forEach(([bout, p, a]) => { const c = cleV(bout); if (vus.has(c)) return; vus.add(c); bouts.push({ p: a ? a.p : p, cle: c }); }); });
    verifier(segs, bouts, ws.map(w => [cleV(w.a), cleV(w.b)])); });

  /* 5. DESSINER */
  dessinerEquipements(T, S, eqs, spec, peignes);
  dessinerFils(T, S, traits, jonctions, scene, R, spec);
  dessinerMasses(T, S, scene.masses);
  scene.equipements = eqs.map(e => ({ rep: e.rep, genre: e.genre, desig: e.desig, pn: e.pn, calibre: e.calibre, x: e.x, y: e.y, w: e.w, h: e.h, dy: e.dy, modules: e.modules, lettres: e.lettres, connecteurs: e.connecteurs, visio: e.visio,
    broches: [...e.broches.values()].map(b => ({ nom: b.nom, y: b.y, cote: b.cote, ancres: Object.fromEntries(Object.entries(b.ancres || {}).map(([k, a]) => [k, a.p])) })) }));
  scene.peignes = peignes.map(P => ({ rep: P.e.rep, module: P.M.num, lettres: P.lettres }));
  scene.traits = traits.map(t => ({ net: t.net, pts: t.pts, peigne: false, type: t.w ? t.w.type : '', id: t.w ? t.w.id : '', numero: t.w && spec.numeros ? t.w.numero || '' : '', a: t.w ? t.w.a : null, b: t.w ? t.w.b : null,
    ancreA: t.w ? t.w.aA && { rep: t.w.aA.b.e.rep, borne: t.w.aA.b.nom, cote: t.w.aA.cote } : null, ancreB: t.w && t.w.cible.ancre ? { rep: t.w.cible.ancre.b.e.rep, borne: t.w.cible.ancre.b.nom, cote: t.w.cible.ancre.cote } : null,
    tA: !!(t.w && proprio.get(t.w.aA) !== t.w), tB: !!(t.w && t.w.cible.t), masse: t.w && t.w.cible.masse ? t.w.cible.masse : null, renvoi: t.w && t.w.cible.renvoi ? t.w.cible.renvoi.cle : null }));
  scene.jonctions = jonctions.map(j => j.p);
  return { scene, verite, renvois: scene.renvois, S,
    // écrire les renvois quand on sait où ils arrivent (le folio et la zone de leur vis-à-vis)
    rendre(texteRenvoi) { scene.renvois.forEach(r => { r.texte = texteRenvoi(r); }); dessinerRenvois(T, S, scene.renvois); return T.svg(); } }; }

/* ---- les équipements ------------------------------------------------------------------------------------------- */
function dessinerEquipements(T, S, eqs, spec, peignes) {
  const P = S.brocheDedans, tB = 2.2;
  const boite = (x, y, w, h) => { if (S.boite === 'quatre') T.rectQuatre(x, y, w, h, 0.3); else T.rect(x, y, w, h, 0.35); };
  const nomBroche = (e, a, texte) => { const [x, y] = a.p, d = a.dir;
    if (P === true) T.texte(x - d * 1.3, e.genre === 'relais' || e.genre === 'disjoncteur' ? y - 0.8 : y + 0.8, texte, { taille: tB, ancre: d < 0 ? 'start' : 'end' });
    else if (P === 'debout') T.texte(x - d * 1.2 + (d < 0 ? 1.6 : 0), y - (e.genre === 'relais' || e.genre === 'disjoncteur' ? 1.6 : 0), texte, { taille: 2, angle: -90, ancre: 'middle' });
    else T.texte(x + d * 1.3, y - 0.8, texte, { taille: tB, ancre: d < 0 ? 'end' : 'start' }); };
  const repere = (e, dedans) => { if (dedans) T.texte(e.x + 1.6, e.y + 4.2, e.rep, { taille: 3.1, gras: true }); else T.texte(e.x, e.y - 2, e.rep, { taille: 3.2, gras: true }); };
  for (const e of eqs) {
    const B = [...e.broches.values()];
    if (e.genre === 'disjoncteur') { dessinerDisjoncteur(T, S, e, boite, nomBroche); continue; }
    if (e.genre === 'relais') { boite(e.x, e.y, e.w, e.h); repere(e, S.nomDedans);
      if (S.nomDedans && e.desig) T.texte(e.x + 1.6, e.y + 7, e.desig, { taille: 1.6 });
      B.forEach(b => nomBroche(e, b.ancres[b.cote], b.nom));
      dessinerRelais(T, S, e);
      if (!S.nomDedans && e.desig) T.texte(e.x + e.w / 2, e.y + e.h - 1.4, e.desig, { taille: 1.4, ancre: 'middle' });
      if (e.pn) T.texte(e.x + e.w / 2, e.y + e.h + 3.6, e.pn, { taille: 1.8, ancre: 'middle' });
      continue; }
    if (e.genre === 'prise') { const xm = e.x + 7.5; T.rect(e.x, e.y, 7.5, e.h, 0.35); T.rect(xm, e.y, e.w - 7.5, e.h, 0.35);
      T.texte(e.x + e.w / 2, e.y - 2, e.rep, { taille: 3, gras: true, ancre: 'middle' });
      [...e.lettres].forEach(l => { const b = e.broches.get(l); T.texte(e.x + 3.75, b.y + 0.8, l, { taille: tB, ancre: 'middle' }); if (spec.style !== 'B') T.texte(xm + (e.w - 7.5) / 2, b.y + 0.8, l, { taille: tB, ancre: 'middle' }); });
      if (e.pn) T.texte(e.x + e.w / 2, e.y + e.h + 3.4, e.pn, { taille: 1.7, ancre: 'middle' });
      continue; }
    if (e.genre === 'barrette') { dessinerBarrette(T, S, e, peignes.filter(p => p.e === e)); continue; }
    // une boîte : son repère, sa désignation, ses connecteurs, ses broches, son dessin intérieur (voyant, inter, diode)
    boite(e.x, e.y, e.w, e.h); repere(e, S.nomDedans);
    if (e.desig) { if (S.nomDedans) T.texte(e.x + 1.6, e.y + 7.6, e.desig, { taille: 1.7 }); else T.texte(e.x + e.w / 2, e.y + e.h - 1.8, e.desig, { taille: 1.6, ancre: 'middle' }); }
    if (e.connecteurs) { const parC = new Map(); B.forEach(b => { const c = decouper(b.nom).connecteur; (parC.get(c) || parC.set(c, []).get(c)).push(b); });
      parC.forEach((bs, c) => { const y0 = Math.min(...bs.map(b => b.y)) - 2.5, y1 = Math.max(...bs.map(b => b.y)) + 2.5, xc = bs[0].cote === 'G' ? e.x : e.x + e.w - 7.5;
        T.rect(xc, y0, 7.5, y1 - y0, 0.3); T.texte(xc + 3.75, y0 - 1.3, c, { taille: 2.4, gras: true, ancre: 'middle' }); }); }
    B.forEach(b => { const a = b.ancres && b.ancres[b.cote]; if (a) nomBroche(e, a, e.connecteurs ? decouper(b.nom).numero : b.nom); });
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2 + (S.nomDedans ? 2 : -1);
    if (e.genre === 'lampe') { T.cercle(cx, cy, 3, 0.3); T.ligne(cx - 2.1, cy - 2.1, cx + 2.1, cy + 2.1, 0.3); T.ligne(cx - 2.1, cy + 2.1, cx + 2.1, cy - 2.1, 0.3); }
    else if (e.genre === 'inter') { T.cercle(cx - 4, cy + 1.5, 0.6, 0.25); T.cercle(cx + 4, cy + 1.5, 0.6, 0.25); T.ligne(cx - 3.4, cy + 1.2, cx + 3.6, cy - 2, 0.3); }
    else if (e.genre === 'diode') { T.polygone([[cx - 2.5, cy - 2.5], [cx - 2.5, cy + 2.5], [cx + 1.8, cy]], 0.3); T.ligne(cx + 1.8, cy - 2.6, cx + 1.8, cy + 2.6, 0.3); }
    if (e.pn) T.texte(e.x + e.w / 2, e.y + e.h + 3.6, e.pn, { taille: 1.8, ancre: 'middle' }); }
}

/* Un DISJONCTEUR : une boîte, son symbole dedans (des amorces du bord au symbole : pas des fils), ses bornes 1 et 2 */
function dessinerDisjoncteur(T, S, e, boite, nomBroche) {
  const y = e.y + e.dy, x0 = e.x, x1 = e.x + e.w, cal = e.calibre || '';
  boite(x0, e.y, e.w, e.h);
  if (S.cb === 'ronds') { // A : le repère dedans ; deux bornes rondes, l'arc ; 1 et 2 dedans, contre le bord ; le calibre dessous
    T.texte(x0 + 1.4, e.y + 3.6, e.rep, { taille: 2.6, gras: true });
    const c1 = x0 + 5.5, c2 = x1 - 5.5, r = 1.1;
    T.ligne(x0, y, c1 - r, y); T.ligne(c2 + r, y, x1, y); T.cercle(c1, y, r, 0.3); T.cercle(c2, y, r, 0.3);
    T.chemin(`M${f2(c1)} ${f2(y - r)} Q${f2((c1 + c2) / 2)} ${f2(y - 3.6)} ${f2(c2)} ${f2(y - r)}`, 0.3);
    nomBroche(e, e.broches.get('1').ancres.G, '1'); nomBroche(e, e.broches.get('2').ancres.D, '2');
    T.texte(e.x + e.w / 2, e.y + e.h + 3.2, cal, { taille: 2, ancre: 'middle' }); return; }
  if (S.cb === 'bilame') { // B : le repère dessus ; un bilame en zigzag entre deux amorces ; le calibre « 5A » dedans ; 1 et 2 dehors
    T.texte(x0, e.y - 2, e.rep, { taille: 3, gras: true });
    const a = x0 + 2.5, b = x1 - 2.5, n = 6, pts = [[x0, y], [a, y]]; for (let k = 1; k < n; k++) pts.push([a + (b - a) * k / n, y + (k % 2 ? -1.1 : 1.1)]); pts.push([b, y], [x1, y]);
    T.poly(pts, 0.3); T.texte(e.x + e.w / 2, e.y + 2.6, cal.replace(/\s/g, ''), { taille: 1.7, ancre: 'middle' });
    nomBroche(e, e.broches.get('1').ancres.G, '1'); nomBroche(e, e.broches.get('2').ancres.D, '2'); return; }
  // C : le repère dessus ; deux bornes rondes, l'arc et son bouton ; 1 et 2 debout, dedans ; le calibre dessous
  T.texte(x0, e.y - 2, e.rep, { taille: 3.2, gras: true });
  const c1 = x0 + 4.5, c2 = x1 - 4.5, r = 1;
  T.ligne(x0, y, c1 - r, y); T.ligne(c2 + r, y, x1, y); T.cercle(c1, y, r, 0.3); T.cercle(c2, y, r, 0.3);
  T.chemin(`M${f2(c1)} ${f2(y - r)} Q${f2((c1 + c2) / 2)} ${f2(y - 3.4)} ${f2(c2)} ${f2(y - r)}`, 0.3);
  // (le sommet de l'arc : le quart de la somme de ses deux bouts et du double de son point de contrôle)
  const xm = (c1 + c2) / 2, ym = y - (2 * r + 2 * 3.4) / 4; T.ligne(xm, ym, xm, e.y + 1.2, 0.3); T.ligne(xm - 1.2, e.y + 1.2, xm + 1.2, e.y + 1.2, 0.3);
  nomBroche(e, e.broches.get('1').ancres.G, '1'); nomBroche(e, e.broches.get('2').ancres.D, '2');
  T.texte(e.x + e.w / 2, e.y + e.h + 3.2, cal, { taille: 2, ancre: 'middle' }); }

/* Un RELAIS : sa bobine (X1, X2) et son contact (A1 commun, A2 repos, A3 travail), dessinés dans la boîte et reliés aux
   bornes par des amorces — au repos, la lame touche A2 : un trait d'A1 à A2 qui n'est pas un fil */
function dessinerRelais(T, S, e) { const x0 = e.x, x1 = e.x + e.w, y = e.y;
  if (S.relais === 'bobine') { // A : une bobine rectangulaire, la lame, le lien mécanique en pointillé
    T.rect(x0 + 6.5, y + 12, 3, 6, 0.3); T.poly([[x0, y + 10], [x0 + 8, y + 10], [x0 + 8, y + 12]]); T.poly([[x0, y + 20], [x0 + 8, y + 20], [x0 + 8, y + 18]]);
    T.poly([[x1, y + 10], [x1 - 7, y + 10]]); T.poly([[x1, y + 15], [x1 - 11, y + 15]]); T.poly([[x1, y + 20], [x1 - 11, y + 20]]);
    T.ligne(x1 - 7, y + 10, x1 - 11, y + 15, 0.3); T.ligne(x0 + 9.5, y + 15, x1 - 9, y + 12.5, 0.2, ' stroke-dasharray="0.8 0.6"'); return; }
  if (S.relais === 'cercle') { // B : une bobine ronde, la lame posée sur le repos, le travail en attente
    T.cercle(x0 + 8, y + 15, 2.6, 0.3); T.poly([[x0, y + 10], [x0 + 8, y + 10], [x0 + 8, y + 12.4]]); T.poly([[x0, y + 20], [x0 + 8, y + 20], [x0 + 8, y + 17.6]]);
    T.poly([[x1, y + 10], [x1 - 6, y + 10], [x1 - 6, y + 11.5]]); T.poly([[x1, y + 15], [x1 - 10, y + 15]]); T.poly([[x1, y + 20], [x1 - 10, y + 20], [x1 - 10, y + 18.5]]);
    T.ligne(x1 - 6, y + 11.5, x1 - 10, y + 15, 0.3); T.texte(x0 + 8, y + 15.8, 'K', { taille: 2, ancre: 'middle' }); return; }
  // C : une bobine barrée (un relais électronique), un contact à deux plots et la lame
  T.rect(x0 + 5.5, y + 12.5, 5, 5, 0.3); T.ligne(x0 + 5.5, y + 17.5, x0 + 10.5, y + 12.5, 0.25);
  T.poly([[x0, y + 10], [x0 + 8, y + 10], [x0 + 8, y + 12.5]]); T.poly([[x0, y + 20], [x0 + 8, y + 20], [x0 + 8, y + 17.5]]);
  T.poly([[x1, y + 10], [x1 - 8, y + 10]]); T.poly([[x1, y + 15], [x1 - 12, y + 15], [x1 - 12, y + 13.4]]); T.poly([[x1, y + 20], [x1 - 12, y + 20], [x1 - 12, y + 18]]);
  T.ligne(x1 - 8, y + 10, x1 - 12, y + 13.4, 0.3); T.ligne(x1 - 13.2, y + 18, x1 - 10.8, y + 18, 0.3); }

/* Une BARRETTE : une pastille par contact ; le pointillé relie les contacts d'un même groupe ; le module et la lettre écrits
   selon le logiciel (lettre blanche dans la pastille sous le numéro du module ; pastille creuse et le module à côté ; une
   gélule où « 51A » est écrit) */
function dessinerBarrette(T, S, e, groupes) {
  const cx = e.x + e.w / 2, lien = ' stroke-dasharray="1 0.8"';
  T.texte(cx, e.y - 2.2, e.rep, { taille: 3, gras: true, ancre: 'middle' });
  // le pointillé d'abord : la pastille se pose dessus
  groupes.forEach(P => { const ys = P.lettres.map(l => e.broches.get(P.M.num + l).y);
    if (S.barrette === 'cercles') ys.slice(1).forEach((y, k) => T.ligne(cx, ys[k] + 1.6, cx, y - 1.6, 0.35, lien));
    else T.ligne(cx, ys[0], cx, ys[ys.length - 1], 0.4, lien); });
  e.modules.forEach(M => {
    if (S.barrette === 'lettres') T.texte(cx, M.yTete + 3.6, M.num, { taille: 2, gras: true, ancre: 'middle' });
    if (S.barrette === 'cercles') T.texte(e.x + e.w + 0.6, M.y0 - 0.3, M.num, { taille: 2, gras: true });
    [...M.lettres].forEach(l => { const b = e.broches.get(M.num + l);
      if (S.barrette === 'lettres') { T.point(cx, b.y, 1.5); T.texte(cx, b.y + 0.72, l, { taille: 2, ancre: 'middle', couleur: '#fff', gras: true }); }
      else if (S.barrette === 'cercles') { T.brut(`<circle cx="${f2(cx)}" cy="${f2(b.y)}" r="1.6" fill="#fff" stroke="#111" stroke-width="0.3"/>`); T.texte(cx, b.y + 0.7, l, { taille: 1.9, ancre: 'middle' }); }
      else { T.brut(`<rect x="${f2(cx - 3.25)}" y="${f2(b.y - 1.7)}" width="6.5" height="3.4" rx="1.7" fill="#111"/>`); T.texte(cx, b.y + 0.62, M.num + l, { taille: 1.7, ancre: 'middle', couleur: '#fff', gras: true }); } }); });
  if (e.pn) T.texte(cx, e.y + e.h + 3.4, e.pn, { taille: 1.6, ancre: 'middle' }); }

/* ---- les fils ---------------------------------------------------------------------------------------------------- */
function dessinerFils(T, S, traits, jonctions, scene, R, spec) {
  const lw = S.fil;
  // les croisements (pour les ponts du style C) : un segment horizontal d'un réseau coupé par un vertical d'un autre
  const H = [], V = []; traits.forEach(t => t.pts.slice(1).forEach((p, k) => { const a = t.pts[k]; if (Math.abs(a[1] - p[1]) < 1e-6) H.push({ t, y: a[1], x0: Math.min(a[0], p[0]), x1: Math.max(a[0], p[0]) }); else V.push({ t, x: a[0], y0: Math.min(a[1], p[1]), y1: Math.max(a[1], p[1]) }); }));
  const ponts = new Map(); if (S.ponts) H.forEach(h => V.forEach(v => { if (v.t.net === h.t.net) return; if (v.x > h.x0 + 1.5 && v.x < h.x1 - 1.5 && h.y > v.y0 + 0.5 && h.y < v.y1 - 0.5) (ponts.get(h.t) || ponts.set(h.t, []).get(h.t)).push([v.x, h.y]); }));
  for (const t of traits) {
    const pts = t.pts;
    if (S.ponts && ponts.has(t)) { // le trait se dessine en chemin : chaque croisement passe par un petit pont
      const P = ponts.get(t); let d = `M${f2(pts[0][0])} ${f2(pts[0][1])}`;
      for (let k = 1; k < pts.length; k++) { const a = pts[k - 1], b = pts[k];
        if (Math.abs(a[1] - b[1]) < 1e-6) { const s = Math.sign(b[0] - a[0]), sur = P.filter(q => Math.abs(q[1] - a[1]) < 1e-6 && (q[0] - a[0]) * s > 1.4 && (b[0] - q[0]) * s > 1.4).sort((x, y) => (x[0] - y[0]) * s);
          sur.forEach(q => { d += `L${f2(q[0] - s * 1.1)} ${f2(q[1])}A1.1 1.1 0 0 ${s > 0 ? 1 : 0} ${f2(q[0] + s * 1.1)} ${f2(q[1])}`; }); }
        d += `L${f2(b[0])} ${f2(b[1])}`; }
      T.chemin(d, lw); }
    else if (spec.style === 'B') pts.slice(1).forEach((p, k) => T.ligne(pts[k][0], pts[k][1], p[0], p[1], lw));
    else T.poly(pts, lw);
    scene.fils.push({ net: t.net, pts, peigne: false }); }
  // les points de jonction (le style B n'en met qu'un sur deux : un T sans point)
  jonctions.forEach((j, k) => { if (S.point < 1 && k % 2) return; T.point(j.p[0], j.p[1], 0.65); scene.points.push(j.p); });
  /* l'étiquette de chaque fil, au-dessus du plus long tronçon horizontal libre : son numéro (un folio qui les écrit), son
     type (pas toujours) ; un blindé : son anneau sur le fil */
  const libre = (x0, x1, y) => { for (let x = Math.floor(x0 / g) * g; x <= x1 + 1e-6; x += g) { const [i, j] = R.versNoeud(x, y); const n = R.id(i, j); if (R.bloque[n] || R.occH[n] >= 0 || R.occV[n] >= 0 || R.coin[n] >= 0) return false; } return true; };
  let k = 0;
  traits.filter(t => t.w && (t.w.type || (spec.numeros && t.w.numero))).forEach(t => { k++; const num = spec.numeros && t.w.numero ? t.w.numero : '', type = t.w.type && (k * 0.618) % 1 <= S.tauxType ? t.w.type : '';
    const texte = [num, type].filter(Boolean).join(' '); if (!texte) return;
    const segs = t.pts.slice(1).map((p, i) => [t.pts[i], p]).filter(([a, b]) => Math.abs(a[1] - b[1]) < 1e-6 && Math.abs(a[0] - b[0]) >= 12).sort((x, y) => Math.abs(y[0][0] - y[1][0]) - Math.abs(x[0][0] - x[1][0]));
    const larg = 1.25 * texte.length + 1;
    for (const [a, b] of segs) { const xm = grille((a[0] + b[0]) / 2), y = a[1]; if (Math.abs(xm - a[0]) < larg / 2 + 2 || Math.abs(xm - b[0]) < larg / 2 + 2 || !libre(xm - larg / 2 - g, xm + larg / 2 + g, y - g)) continue;
      T.texte(xm, y - 0.9, texte, { taille: 1.9, ancre: 'middle' }); scene.textes.push({ s: texte, x: xm, y: y - 0.9, net: t.net, numero: num, type });
      for (let x = xm - larg / 2 - g; x <= xm + larg / 2 + g; x += g) { const [i, j] = R.versNoeud(x, y - g); R.bloque[R.id(i, j)] = 1; }
      if (/^ML/.test(t.w.type) && Math.abs(b[0] - a[0]) > larg + 16) { const xe = xm + Math.sign(b[0] - a[0] || 1) * (larg / 2 + 4); T.ellipse(xe, y, 1.4, 2.6, 0.25); }
      if (num) t.w.numeroEcrit = true;
      break; } });
}

/* ---- les masses : trois barres qui décroissent, le repère à droite ---------------------------------------------------- */
function dessinerMasses(T, S, masses) {
  masses.forEach(m => { const [x, y] = m.p;
    if (S.masse === 'barres-larges') { T.ligne(x - 2.4, y, x + 2.4, y, 0.3); T.ligne(x - 1.5, y + 1.2, x + 1.5, y + 1.2, 0.3); T.ligne(x - 0.6, y + 2.4, x + 0.6, y + 2.4, 0.3); T.texte(x + 3, y + 2.2, m.rep, { taille: 2 }); }
    else { T.ligne(x - 2, y, x + 2, y, 0.3); T.ligne(x - 1.3, y + 1, x + 1.3, y + 1, 0.3); T.ligne(x - 0.6, y + 2, x + 0.6, y + 2, 0.3); T.texte(x + 2.8, y + 1.9, m.rep, { taille: 2.2 }); } }); }

/* ---- les renvois : « F5/C3 », dans un drapeau, après une flèche, dans un hexagone ; le signal au-dessus --------------- */
function dessinerRenvois(T, S, renvois) {
  renvois.forEach(r => { const [x, y] = r.p, s = r.droite ? 1 : -1, t = r.texte, long = t.length > 8;
    if (S.renvoi === 'drapeau') { const w = long ? 4 + 1.32 * t.length : 11; T.polygone([[x, y - 2.5], [x + s * w, y - 2.5], [x + s * (w + 3), y], [x + s * w, y + 2.5], [x, y + 2.5]], 0.3);
      T.texte(x + s * 1.4, y + 0.8, t, { taille: 2.2, ancre: s > 0 ? 'start' : 'end' }); if (r.signal) T.texte(x + s * 0.5, y - 3.4, r.signal, { taille: 1.6, ancre: s > 0 ? 'start' : 'end' }); }
    else if (S.renvoi === 'fleche') { T.polygone([[x, y - 1], [x + s * 2.4, y], [x, y + 1]], 0.2, '#111'); T.texte(x + s * 3.2, y + 0.8, t, { taille: 2.2, ancre: s > 0 ? 'start' : 'end' }); if (r.signal) T.texte(x + s * 3.2, y - 2.4, r.signal, { taille: 1.6, ancre: s > 0 ? 'start' : 'end' }); }
    else { const w = long ? 5 + 1.3 * t.length : 13; T.polygone([[x, y], [x + s * 2, y - 2.6], [x + s * (w - 2), y - 2.6], [x + s * w, y], [x + s * (w - 2), y + 2.6], [x + s * 2, y + 2.6]], 0.3);
      T.texte(x + s * w / 2, y + 0.8, t, { taille: 2.1, ancre: 'middle' }); if (r.signal) T.texte(x + s * w / 2, y - 3.6, r.signal, { taille: 1.6, ancre: 'middle' }); } }); }

module.exports = { composer, STYLES, decouper, CB_GEO, BARRETTE };
