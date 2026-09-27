/* ===========================================================================
   04 — LE PLACEMENT
   Le cœur de l'outil. Les nœuds vont en colonnes (niveaux d'un parcours en
   largeur depuis une graine) ; puis les ordonnées sont choisies pour rendre
   un MAXIMUM de fils parfaitement droits — un fil dont les deux bornes sont à
   la même hauteur. C'est la priorité absolue, tout le reste est du confort.

   `placer` fait UNE mise en page pour une graine donnée. `meilleurPlacement`
   en essaie sept (équilibrées ou non, feuilles sur une ou deux colonnes),
   route chacune pour de vrai, et garde celle qui gagne au jugement (tient
   sur la feuille, fils droits, croisements, encombrement) ; puis, si le
   dessin est un ruban, le replie en rangées (serpentin).

   Géométrie partagée par les étapes, pour un nœud `id` et une broche `cle` :
     xDe(id)                 abscisse du bloc
     hautDe(id) / basDe(id)  bords haut et bas du bloc
     yBroche(id + SEP + cle) ordonnée de la broche
     listes.get(id)          broches par flanc : {L, R} ou {S} (réglette)
   =========================================================================== */
'use strict';

const PRH = 14, STRIPW = 20, BODYW = 104, BORNW = 40, VGAP = 22, HH = 20, BPAD = 6, HHS = 15;
const MARGE = 70, HAUT_PAGE = MARGE + 120;
const RANGEE_GAP = 130;
/* L'ordre naturel des bornes : numérique quand la borne est un nombre, sinon
   alphanumérique (1, 2, 10 ; A1, A2, B1). C'est l'ordre du matériel. */
const ordreNaturel = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' });

function placer(G, options) {
  const { liaisons: lk, ids, noeuds, bouts, nid, partenaires, adj, degreDe, feuillesDe } = G;
  const opt = options || {};
  const graine = opt.graine || 0;                 // 0 = plus fort degré, 'loin' = point le plus éloigné, n = décalage
  const SERP = opt.serpentin | 0;                 // largeur de rangée (0 = pas de repli)
  const mediane = a => { a = a.slice().sort((x, y) => x - y); return a[a.length >> 1]; };
  /* Un SHUNT — deux bornes d'un même bloc pontées, bornier ou équipement —
     n'est pas un fil : il ne prend ni goulotte ni ordonnée, le dessin le
     trace en pont dans la réglette ou dans le cadre du connecteur. Les deux
     bornes restent voisines quand elles sont du même connecteur : c'est
     l'ordre naturel qui les y tient. */
  const shunts = new Set();
  lk.forEach((l, li) => { const A = bouts.get(li + ':A'), B = bouts.get(li + ':B');
    if (A.cle !== B.cle && nid(A.nom, A.cle) === nid(B.nom, B.cle)) shunts.add(li); });
  // les partenaires d'une borne, ceux de ses bornes pontées compris : deux
  // bornes d'un shunt sont un seul point électrique
  const partenairesExternes = (id, cle) => { const vus = new Set([cle]), pile = [cle], out = [];
    while (pile.length) { const c = pile.pop(); (partenaires.get(id + SEP + c) || []).forEach(q => {
      if (q.id !== id) out.push(q); else if (!vus.has(q.cle)) { vus.add(q.cle); pile.push(q.cle); } }); }
    return out; };
  /* Le GROUPE d'une borne : son connecteur (A, B… ou le part number) sur un
     équipement, le bornier entier sur une barrette ou une prise (ordre fixe),
     rien sur un rail. Un groupe choisit un flanc : ses fils partent ensemble. */
  const connecteurs = new Map();
  const connecteurDe = (id, etiq) => { const nom = noeuds.get(id).nom;
    if (!connecteurs.has(nom)) connecteurs.set(nom, connecteurParBorne(nom, lk));
    const c = connecteurs.get(nom).get(String(etiq)); return c ? c.nom : null; };
  const groupeDe = (id, cle) => { const N = noeuds.get(id); if (N.reglette) return estBornier(N.nom) ? '' : null;
    const p = N.broches.find(b => b.cle === cle); return p ? connecteurDe(id, p.etiq) : null; };

  /* ===== 1. NIVEAUX : chaque nœud reçoit sa colonne ======================= */
  const niveau = new Map();
  { const bfs = (s, vus) => { const d = new Map([[s, 0]]); const q = [s]; let loin = s;
      while (q.length) { const c = q.shift();
        [...adj.get(c).keys()].forEach(k => { if (!d.has(k) && !(vus && vus.has(k))) {
          d.set(k, d.get(c) + 1); if (d.get(k) > d.get(loin)) loin = k; q.push(k); } }); }
      return { d, loin }; };
    // une masse n'est jamais graine : c'est l'équipement qui fixe la colonne
    // de départ, sa masse se range à côté de lui, toujours du même côté
    const potentiel = n => estMasse(noeuds.get(n).nom) ? 1 : 0;
    const graines = [...ids].sort((a, b) => (potentiel(a) - potentiel(b)) || (degreDe(b) - degreDe(a)));
    const decalage = typeof graine === 'number' ? graine : 0;
    if (decalage > 0 && graines.length > decalage) { const tete = graines.splice(0, decalage); graines.push(...tete); }
    for (const s of graines) { if (niveau.has(s)) continue;
      let depart = s; if (graine === 'loin') depart = bfs(s, niveau).loin;
      for (const [k, v] of bfs(depart, niveau).d) niveau.set(k, v); }
    /* une borne reliée à deux blocs distincts posés du MÊME côté a besoin
       d'une barrette dans la goulotte, qui tranche les fils qu'elle enjambe ;
       posés de part et d'autre, ses deux fils sortent chacun de leur côté */
    const barrettesSi = (n, ln) => { let b = 0; const vues = new Set();
      const lv = id => (id === n ? ln : niveau.get(id));
      const compte = (id, cle) => { const k = id + SEP + cle; if (vues.has(k)) return; vues.add(k);
        const blocs = new Set(), cotes = new Set();
        (partenaires.get(k) || []).forEach(q => { if (q.id === id) return; blocs.add(q.id); cotes.add(Math.sign(lv(q.id) - lv(id))); });
        if (blocs.size >= 2 && cotes.size === 1) b++; };
      noeuds.get(n).broches.forEach(p => { compte(n, p.cle);
        (partenaires.get(n + SEP + p.cle) || []).forEach(q => { if (q.id !== n) compte(q.id, q.cle); }); });
      return b; };
    /* un groupe (connecteur, bornier) choisit un flanc : un voisin relié à un
       groupe dont les autres fils partent de l'autre côté coûte deux points
       par fil — sinon le connecteur se coupe en deux cadres, un par flanc, ou
       la barrette sert des deux côtés */
    const flancImpose = (n, ln) => { let c = 0; const lv = id => (id === n ? ln : niveau.get(id));
      if (potentiel(n)) return 0;                     // une masse est un petit symbole : elle va où il y a de la place
      // une borne de bornier qui a deux partenaires (amont et aval) les sert de part et d'autre : elle ne vote pas
      const externes = (id, cle) => (partenaires.get(id + SEP + cle) || []).filter(r => r.id !== id);
      const traversante = (id, cle) => noeuds.get(id).reglette && externes(id, cle).length >= 2;
      noeuds.get(n).broches.forEach(p => (partenaires.get(n + SEP + p.cle) || []).forEach(q => { if (q.id === n) return;
        const g = groupeDe(q.id, q.cle); if (g == null || traversante(q.id, q.cle)) return; const s = Math.sign(ln - lv(q.id)); if (!s) return;
        let gauche = 0, droite = 0;
        noeuds.get(q.id).broches.forEach(b => { if (groupeDe(q.id, b.cle) !== g || traversante(q.id, b.cle)) return;
          externes(q.id, b.cle).forEach(r => { if (r.id === n || potentiel(r.id)) return;
            const t = Math.sign(lv(r.id) - lv(q.id)); if (t < 0) gauche++; else if (t > 0) droite++; }); });
        if (gauche !== droite && (s < 0) !== (gauche > droite)) c += 2; }));
      return c; };
    // raffinement local : un nœud se rapproche de ses voisins si ça coûte
    // moins ; un fil entre deux blocs d'une même colonne est plié à coup sûr
    // et descend une goulotte chargée — il coûte plus qu'un fil qui enjambe
    // une colonne, qui peut passer droit
    const cout = (n, ln) => { let sc = 0; for (const [k, w] of adj.get(n)) { const dd = Math.abs(ln - niveau.get(k));
      sc += w * (dd === 1 ? 0 : (dd === 0 ? 3 : dd)); } return sc + barrettesSi(n, ln) + flancImpose(n, ln); };
    for (let passe = 0; passe < 3; passe++) { let bouge = false;
      for (const n of ids) { const l0 = niveau.get(n); let best = l0, bc = cout(n, l0);
        for (const c of [l0 - 1, l0 + 1]) { const cc = cout(n, c); if (cc < bc - 0.01) { bc = cc; best = c; } }
        if (best !== l0) { niveau.set(n, best); bouge = true; } }
      if (!bouge) break; }
    // une feuille (tous ses voisins dans une même colonne) coûte autant des
    // deux côtés : sur demande, elle va du côté le moins chargé — les colonnes
    // s'équilibrent, mais le flanc opposé du hub peut se charger de fils pliés ;
    // c'est au concours de trancher, pas à cette règle
    const charge = new Map(); const hauteur = n => noeuds.get(n).broches.length * PRH + 60;
    ids.forEach(n => charge.set(niveau.get(n), (charge.get(niveau.get(n)) || 0) + hauteur(n)));
    if (opt.equilibrer) ids.slice().sort((a, b) => hauteur(b) - hauteur(a)).forEach(n => {
      const voisins = [...adj.get(n).keys()]; const autour = [...new Set(voisins.map(k => niveau.get(k)))]; if (autour.length !== 1) return;
      if (voisins.length === 1 && adj.get(voisins[0]).size === 1) return;      // un îlot de deux blocs n'a pas de côté
      const l0 = niveau.get(n), l1 = 2 * autour[0] - l0; if (Math.abs(l1 - l0) !== 2) return;
      if ((charge.get(l1) || 0) + hauteur(n) >= (charge.get(l0) || 0)) return;
      if (barrettesSi(n, l1) > barrettesSi(n, l0)) return;                  // pas au prix d'une barrette
      if (flancImpose(n, l1) > flancImpose(n, l0)) return;                  // ni d'un connecteur coupé en deux
      niveau.set(n, l1); charge.set(l0, charge.get(l0) - hauteur(n)); charge.set(l1, (charge.get(l1) || 0) + hauteur(n)); });
    /* PROFONDEUR : un hub qui a beaucoup de feuilles d'un même côté les range
       sur deux colonnes, une feuille sur deux plus loin ; leur fil passe droit
       entre deux feuilles de la première colonne (le solveur y veille) et la
       colonne fait moitié moins haut */
    if (opt.profondeur) ids.forEach(H => [-1, 1].forEach(s => {
      const feuilles = feuillesDe(H).filter(id => niveau.get(id) === niveau.get(H) + s);
      if (feuilles.length >= opt.profondeur) feuilles.forEach((id, i) => { if (i % 2) niveau.set(id, niveau.get(H) + 2 * s); }); })); }
  { const usuels = [...new Set(ids.map(n => niveau.get(n)))].sort((a, b) => a - b);
    const remap = new Map(usuels.map((l, i) => [l, i]));
    ids.forEach(n => niveau.set(n, remap.get(niveau.get(n)))); }

  /* ===== 2. VOIES : les composantes indépendantes côte à côte ============ */
  const comp = new Map(); let nc = 0;
  for (const n of ids) { if (comp.has(n)) continue; const q = [n]; comp.set(n, nc);
    while (q.length) { const u = q.pop(); for (const k of adj.get(u).keys()) if (!comp.has(k)) { comp.set(k, nc); q.push(k); } } nc++; }
  { if (nc > 1) {
      const comps = Array.from({ length: nc }, () => ({ ids: [], h: 0, span: 0 }));
      ids.forEach(n => { const c = comps[comp.get(n)]; c.ids.push(n);
        c.h += noeuds.get(n).broches.length * PRH + 60; c.span = Math.max(c.span, niveau.get(n)); });
      const totH = comps.reduce((s, c) => s + c.h, 0);
      const laneW = (Math.max(...comps.map(c => c.span)) + 1) * 260;
      let K = Math.max(1, Math.round(Math.sqrt(1.414 * totH / laneW))); K = Math.min(K, 8, nc);
      if (K > 1) { comps.sort((a, b) => b.h - a.h);
        const voies = Array.from({ length: K }, () => ({ h: 0, span: 0, comps: [] }));
        comps.forEach(c => { const v = voies.reduce((m, l) => l.h < m.h ? l : m, voies[0]); v.comps.push(c); v.h += c.h; v.span = Math.max(v.span, c.span); });
        let off = 0; voies.forEach(v => { if (!v.comps.length) return; v.comps.forEach(c => c.ids.forEach(n => niveau.set(n, niveau.get(n) + off))); off += v.span + 1; }); } } }

  /* ===== 3. SERPENTIN : replier les colonnes en rangées, en boustrophédon = */
  const rangeeDe = new Map(ids.map(n => [n, 0]));
  const compDeRangee = new Map();                 // rangée -> composante qui l'occupe seule
  // entre deux rangées d'une même composante passent des fils : large ; entre
  // deux composantes il ne passe rien : serré
  const ecartRangees = r => (compDeRangee.has(r) && compDeRangee.has(r + 1) && compDeRangee.get(r) !== compDeRangee.get(r + 1)) ? 2 * VGAP : RANGEE_GAP;
  if (SERP > 0) {
    // chaque composante trop longue se replie sur SES rangées : deux chaînes
    // repliées ensemble mêlaient leurs rangées et leurs fils de retour se croisaient
    const etendue = new Map();
    ids.forEach(n => { const c = comp.get(n), l = niveau.get(n); const e = etendue.get(c) || etendue.set(c, { lo: l, hi: l }).get(c); e.lo = Math.min(e.lo, l); e.hi = Math.max(e.hi, l); });
    const longues = [...etendue.entries()].filter(([, e]) => e.hi - e.lo + 1 > SERP).sort((a, b) => a[1].lo - b[1].lo);
    const base = new Map(); let r0 = 0;
    longues.forEach(([c, e]) => { base.set(c, { r: r0, lo: e.lo }); const n = Math.ceil((e.hi - e.lo + 1) / SERP);
      for (let r = r0; r < r0 + n; r++) compDeRangee.set(r, c); r0 += n; });
    ids.forEach(n => { const b = base.get(comp.get(n)); const l = b ? niveau.get(n) - b.lo : niveau.get(n);
      const r = (b ? b.r : r0) + Math.floor(l / SERP), k = l % SERP;
      rangeeDe.set(n, r); niveau.set(n, (r % 2 === 0) ? k : (SERP - 1 - k)); }); }
  const nRang = SERP > 0 ? 1 + Math.max(0, ...ids.map(n => rangeeDe.get(n))) : 1;

  const nMax = ids.length ? Math.max(...ids.map(n => niveau.get(n))) : 0;
  const colonnes = Array.from({ length: nMax + 1 }, () => []);
  ids.forEach(n => colonnes[niveau.get(n)].push(n));
  const colonneDe = new Map(); colonnes.forEach((c, i) => c.forEach(n => colonneDe.set(n, i)));

  /* ===== 4. GÉOMÉTRIE DES COLONNES : flancs, largeurs, goulottes ========= */
  const flancDe = new Map(), listes = new Map();
  const colDe = id => colonneDe.get(id) || 0;
  for (const id of ids) { const N = noeuds.get(id);
    if (N.reglette) { listes.set(id, { S: N.broches.slice() }); continue; }
    const L = [], R = []; const cn = colDe(id);
    /* une borne qui parle des deux côtés se DÉDOUBLE : elle figure sur les deux
       flancs, à la même hauteur, et chaque fil sort du côté de son partenaire
       — sinon l'un des deux contournait le bloc par une barrette. Une borne
       dont le seul partenaire est dans la même colonne sort du côté de la
       borne partenaire, à droite par défaut ; si ce partenaire est une
       réglette, elle sort du côté OPPOSÉ à ce que la réglette distribue :
       le fil monte la goulotte d'amont, sans trancher les départs d'aval. */
    const amontDe = r => { let g = 0, d = 0; const cr = colDe(r);
      noeuds.get(r).broches.forEach(p => (partenaires.get(r + SEP + p.cle) || []).forEach(q => { if (q.id === r) return; const cq = colDe(q.id); if (cq < cr) g++; else if (cq > cr) d++; }));
      return d > g ? 'L' : (g > d ? 'R' : null); };
    N.broches.forEach(p => { let d = 0, g = 0, meme = null;
      (partenaires.get(id + SEP + p.cle) || []).forEach(q => { if (q.id === id) return; const cq = colDe(q.id); if (cq < cn) g++; else if (cq > cn) d++; else meme = q; });
      let f; if (!d && !g && meme) f = noeuds.get(meme.id).reglette ? (amontDe(meme.id) || 'R') : (flancDe.get(meme.id + SEP + meme.cle) === 'L' ? 'L' : 'R');
      else f = (d && g) ? 'LR' : ((d >= g) ? 'R' : 'L');
      flancDe.set(id + SEP + p.cle, f); if (f !== 'R') L.push(p); if (f !== 'L') R.push(p); });
    listes.set(id, { L, R }); }
  const clesListes = id => listes.get(id).S ? ['S'] : ['L', 'R'];
  const liste = (id, lid) => listes.get(id)[lid];
  const dedoublee = (id, cle) => flancDe.get(id + SEP + cle) === 'LR';
  const listeDeBroche = (id, cle) => listes.get(id).S ? 'S' : (flancDe.get(id + SEP + cle) === 'L' ? 'L' : 'R');
  const chaqueBroche = (id, f) => clesListes(id).forEach(lid => liste(id, lid).forEach(p => f(p, lid)));
  const estPastille = id => { const ls = listes.get(id); return !!ls.S && ls.S.length === 1 && estRail(noeuds.get(id).nom); };
  /* Un BORNIER garde l'ORDRE NATUREL de ses bornes (1, 2, 3…), quoi que
     fassent leurs partenaires : ce sont les équipements d'en face qui bougent.
     Une PRISE DE COUPURE est de plus AU PAS : ses contacts se suivent à PRH,
     d'un bloc. Une BARRETTE, dessinée en ligne pointillée, s'allonge autant
     qu'il faut : chaque borne vient en face de son partenaire. */
  const ordreFixe = id => !!listes.get(id).S && estBornier(noeuds.get(id).nom);
  const auPas = id => !!listes.get(id).S && estCoupure(noeuds.get(id).nom);
  ids.forEach(id => { if (ordreFixe(id)) listes.get(id).S.sort((a, b) => ordreNaturel(a.etiq, b.etiq)); });
  // marges d'une réglette : au-dessus de sa première borne, sous la dernière
  const margesReglette = id => estPastille(id) ? [7, 7] : (ordreFixe(id) ? [PRH / 2 + 5, PRH / 2 + 5] : [HHS + PRH / 2, PRH / 2 + 5]);
  /* Un CONNECTEUR d'équipement est CONTIGU et AU PAS : sur un flanc, les
     bornes d'un même connecteur (A1, A2, A3…) se suivent à PRH et c'est le
     connecteur entier qui glisse. Mais leur ORDRE est LIBRE : on le choisit
     (trierRuns) pour que les fils sortent sans se croiser. Une borne sans
     connecteur reste libre. `runs` : id|flanc|cle -> le GROUPE
     { id, lid, nom, cles } d'une borne qui n'est pas seule ; absent, la borne
     est libre. `opt.ordres` impose l'ordre d'un groupe (id|flanc|nom -> cles) :
     c'est ainsi qu'un ordre trouvé au routage réel se rejoue au solveur. */
  const runs = new Map();
  { ids.forEach(id => clesListes(id).forEach(lid => { const L = liste(id, lid); if (L.length < 2) return;
      const parNom = new Map();
      L.forEach(p => { const nom = listes.get(id).S ? (auPas(id) ? '' : null) : connecteurDe(id, p.etiq); if (nom == null) return;
        (parNom.get(nom) || parNom.set(nom, []).get(nom)).push(p); });
      parNom.forEach((ps, nom) => { if (ps.length < 2) return; ps.sort((a, b) => ordreNaturel(a.etiq, b.etiq));
        const r = { id, lid, nom, cles: ps.map(p => p.cle), impose: false };
        const voulu = opt.ordres && opt.ordres.get(id + '|' + lid + '|' + nom);
        if (voulu && voulu.length === r.cles.length && voulu.every(c => r.cles.includes(c))) { r.cles = voulu.slice(); r.impose = true; }
        ps.forEach(p => runs.set(id + '|' + lid + '|' + p.cle, r)); }); })); }
  const runDe = (id, lid, cle) => runs.get(id + '|' + lid + '|' + cle) || null;
  const lesRuns = () => [...new Set(runs.values())];
  // une borne LIBRE bouge seule dans sa liste : ni d'un groupe, ni d'un bornier
  const libre = (id, cle) => !ordreFixe(id) && clesListes(id).every(lid => !runDe(id, lid, cle));
  /* L'ordre des bornes d'un connecteur suit l'ordre VERTICAL de leurs
     partenaires : les fils sortent alors du bloc sans se croiser entre eux.
     À égalité, l'ordre naturel. Une borne dont le seul partenaire est une
     pastille (une masse, qui vient se coller où elle est) garde son rang
     courant : la pastille suivra. Deux bornes pontées ont les mêmes
     partenaires (partenairesExternes) et restent donc voisines. */
  const rangDe = (id, cle, yDe) => { const ps = partenairesExternes(id, cle).filter(q => !estPastille(q.id));
    const ys = ps.map(q => yDe(q.id + SEP + q.cle)).filter(y => y != null);
    return ys.length ? mediane(ys) : yDe(id + SEP + cle); };
  const trierRuns = yDe => lesRuns().forEach(r => { if (auPas(r.id) || r.impose) return;
    const etiq = new Map(noeuds.get(r.id).broches.map(p => [p.cle, p.etiq]));
    const k = new Map(r.cles.map(c => [c, rangDe(r.id, c, yDe)]));
    r.cles.sort((a, b) => (k.get(a) - k.get(b)) || ordreNaturel(etiq.get(a), etiq.get(b))); });
  // dans chaque liste, les bornes d'un groupe se suivent dans l'ordre du groupe, à la place du groupe
  const rangerGroupes = () => ids.forEach(id => clesListes(id).forEach(lid => { const L = liste(id, lid); if (L.length < 2) return;
    const pos = new Map(L.map((p, i) => [p.cle, i]));
    const K = new Map(L.map(p => { const r = runDe(id, lid, p.cle); if (!r) return [p.cle, [pos.get(p.cle), 0]];
      return [p.cle, [Math.min(...r.cles.map(c => pos.get(c))), r.cles.indexOf(p.cle)]]; }));
    L.sort((a, b) => { const x = K.get(a.cle), y = K.get(b.cle); return (x[0] - y[0]) || (x[1] - y[1]); }); }));
  // les bornes qui glissent avec celle-ci : ses groupes, de flanc en flanc
  const membres = (id, cle) => { const vus = new Set([cle]), pile = [cle];
    while (pile.length) { const c = pile.pop(); clesListes(id).forEach(lid => { const r = runDe(id, lid, c); if (r) r.cles.forEach(k => { if (!vus.has(k)) { vus.add(k); pile.push(k); } }); }); }
    return [...vus]; };
  /* un bornier est plus étroit qu'un équipement : une barrette est une ligne
     pointillée, le numéro de borne s'écrit sur le fil ; une prise de coupure
     est deux rectangles fins ; les deux flancs gardent STRIPW */
  const corpsDe = id => { const nom = noeuds.get(id).nom; return estBarrette(nom) ? 24 : (estCoupure(nom) ? 30 : BODYW); };
  const largeurDe = id => { const ls = listes.get(id);
    if (ls.S) return estPastille(id) ? BORNW : (STRIPW + corpsDe(id) + STRIPW);
    if (estMasse(noeuds.get(id).nom)) return 26;      // le symbole de masse tient en 10 unités
    return STRIPW + BODYW + STRIPW; };
  const hauteurEstimee = id => { const ls = listes.get(id);
    const rangs = ls.S ? Math.max(1, ls.S.length) : Math.max(ls.L.length, ls.R.length, 1);
    return Math.max(ls.S ? HH + rangs * PRH + BPAD : 46, rangs * PRH + 26); };
  const nCols = colonnes.length;
  const colW = colonnes.map(c => c.length ? Math.max(...c.map(largeurDe)) : 92);
  const flancDuBout = (nom, cle, autreNom, autreCle) => { const id = nid(nom, cle), autre = nid(autreNom, autreCle);
    const f = flancDe.get(id + SEP + cle); if (f === 'L' || f === 'R') return f;      // une borne d'un seul flanc
    if (colDe(autre) !== colDe(id)) return colDe(autre) < colDe(id) ? 'L' : 'R';    // réglette ou borne dédoublée : face au partenaire
    const fq = flancDe.get(autre + SEP + autreCle); return (fq === 'L' || fq === 'R') ? fq : 'L'; };   // même colonne : la même goulotte
  const goulotteDuBout = (id, flanc) => (colonneDe.get(id) || 0) + (flanc === 'R' ? 1 : 0);
  const chCount = new Array(nCols + 1).fill(0);
  lk.forEach((l, li) => { if (shunts.has(li)) return; const A = bouts.get(li + ':A'), B = bouts.get(li + ':B');
    const cA = goulotteDuBout(nid(A.nom, A.cle), flancDuBout(A.nom, A.cle, B.nom, B.cle));
    const cB = goulotteDuBout(nid(B.nom, B.cle), flancDuBout(B.nom, B.cle, A.nom, A.cle));
    chCount[cA]++; if (cA !== cB) chCount[cB]++; });
  // largeur de goulotte : 9 par fil ; ou celle réellement occupée au tour précédent
  const chW = chCount.map((c, i) => (opt.goulottes && opt.goulottes[i] != null) ? opt.goulottes[i] : Math.max(54, 28 + c * 9));
  const colX = []; let cx = MARGE + chW[0];
  for (let i = 0; i < nCols; i++) { colX.push(cx); cx += colW[i] + chW[i + 1]; }
  const largeurTotale = Math.max(cx, MARGE + 360);

  /* ===== 5. POSITION INITIALE, PUIS ORDONNANCEMENT ÉLASTIQUE ============= */
  // un bloc plus étroit que sa colonne (une masse) se range du côté de ses fils
  const xDe = new Map(); colonnes.forEach((c, i) => c.forEach(id => { const w = largeurDe(id); let g = 0, d = 0;
    if (w < colW[i]) chaqueBroche(id, p => (partenaires.get(id + SEP + p.cle) || []).forEach(q => { const cq = colonneDe.get(q.id) ?? 0; if (cq > i) d++; else if (cq < i) g++; }));
    xDe.set(id, (d && !g) ? colX[i] + colW[i] - w : colX[i]); }));
  const yBroche = new Map(), hautDe = new Map(), basDe = new Map();
  const yB = (id, k) => yBroche.get(id + SEP + k);
  const glisser = (id, dy) => { chaqueBroche(id, p => yBroche.set(id + SEP + p.cle, yB(id, p.cle) + dy));
    hautDe.set(id, hautDe.get(id) + dy); basDe.set(id, basDe.get(id) + dy); };
  const bandeY = [];
  { const colH = colonnes.map(c => c.reduce((s, id) => s + hauteurEstimee(id) + VGAP, -VGAP));
    const maxColH = Math.max(60, ...colH);
    const hR = new Array(nRang).fill(0);
    colonnes.forEach(c => { const s = new Array(nRang).fill(-VGAP); c.forEach(id => { s[rangeeDe.get(id)] += hauteurEstimee(id) + VGAP; });
      for (let r = 0; r < nRang; r++) hR[r] = Math.max(hR[r], Math.max(0, s[r])); });
    let y = HAUT_PAGE; for (let r = 0; r < nRang; r++) { bandeY.push(y); y += hR[r] + ecartRangees(r); }
    colonnes.forEach((c, i) => { if (SERP > 0) c.sort((a, b) => rangeeDe.get(a) - rangeeDe.get(b));
      const cur = bandeY.slice(); if (SERP <= 0) cur[0] = HAUT_PAGE + (maxColH - colH[i]) / 2;
      c.forEach(id => { const r = rangeeDe.get(id) || 0; const y = cur[r]; hautDe.set(id, y);
        clesListes(id).forEach(lid => liste(id, lid).forEach((p, j) => yBroche.set(id + SEP + p.cle, y + 16 + j * PRH)));
        basDe.set(id, y + hauteurEstimee(id)); cur[r] = y + hauteurEstimee(id) + VGAP; }); }); }

  /* l'ordre des bornes suit d'abord les partenaires RIGIDES (un bloc à
     plusieurs bornes, dont l'ordre s'impose) ; un bloc à une seule borne peut
     toujours venir se mettre en face, il ne dicte rien */
  const partenairesQuiComptent = (id, cle) => { const ps = partenairesExternes(id, cle);
    const rigides = ps.filter(q => noeuds.get(q.id).broches.length > 1); return rigides.length ? rigides : ps; };
  const trierBroches = () => { trierRuns(k => yBroche.get(k)); for (const id of ids) clesListes(id).forEach(lid => { const L = liste(id, lid); if (L.length < 2 || ordreFixe(id)) return;
    const sc = new Map(L.map(p => { const ps = partenairesQuiComptent(id, p.cle);
      if (!ps.length) return [p.cle, yB(id, p.cle)]; let s = 0; ps.forEach(q => s += yB(q.id, q.cle)); return [p.cle, s / ps.length]; }));
    // un groupe rigide se trie d'un bloc, au barycentre de ses bornes, et garde son ordre naturel dedans
    const K = new Map(L.map(p => { const r = runDe(id, lid, p.cle); if (!r) return [p.cle, [sc.get(p.cle), '', 0]];
      let s = 0; r.cles.forEach(c => s += sc.get(c)); return [p.cle, [s / r.cles.length, r.nom, r.cles.indexOf(p.cle)]]; }));
    L.sort((a, b) => { const x = K.get(a.cle), y = K.get(b.cle); return (x[0] - y[0]) || (x[1] < y[1] ? -1 : x[1] > y[1] ? 1 : 0) || (x[2] - y[2]); }); }); };
  /* Pour ranger un bloc dans sa colonne, ses partenaires ne pèsent pas tous
     pareil : une borne de bornier (ordre naturel, imposé) DICTE, une borne
     d'équipement suit (l'ordre d'un connecteur est libre, un bloc vient se
     mettre en face), un rail ne dit rien. Un bornier, lui, écoute tout le monde. */
  const partenairesDeTri = id => { const isS = !!listes.get(id).S; const fixes = [], equip = [], tous = [];
    chaqueBroche(id, p => (partenaires.get(id + SEP + p.cle) || []).forEach(q => { if (q.id === id) return; tous.push(q);
      if (ordreFixe(q.id)) fixes.push(q); else if (isS || !listes.get(q.id).S) equip.push(q); }));
    if (!ordreFixe(id) && fixes.length) return fixes;
    return equip.length ? equip : tous; };
  const trierColonnes = () => colonnes.forEach(c => { if (c.length < 2) return;
    const cle = new Map(c.map(id => { const use = partenairesDeTri(id).map(q => yB(q.id, q.cle)); return [id, use.length ? mediane(use) : hautDe.get(id)]; }));
    c.sort((a, b) => (rangeeDe.get(a) - rangeeDe.get(b)) || (cle.get(a) - cle.get(b))); });
  // pose : les écarts entre broches suivent ceux des partenaires (bornés), la
  // liste est centrée dans le corps, le bloc se translate en face (médiane)
  const elastique = () => { const GAPX = 4 * PRH; colonnes.forEach(c => { let curseur = -Infinity;
    c.forEach(id => { const ls = clesListes(id); const isS = !!listes.get(id).S;
      let aEq = false; chaqueBroche(id, p => (partenaires.get(id + SEP + p.cle) || []).forEach(q => { if (q.id !== id && !listes.get(q.id).S) aEq = true; }));
      const desDe = lid => liste(id, lid).map(p => {
        let ps = (partenaires.get(id + SEP + p.cle) || []).filter(q => q.id !== id && (isS || !aEq || !listes.get(q.id).S));
        const lf = ps.filter(q => (colonneDe.get(q.id) ?? 0) < (colonneDe.get(id) ?? 0)); if (lf.length) ps = lf;
        return ps.length ? mediane(ps.map(q => yB(q.id, q.cle))) : null; });
      const relDe = (lid, des) => { const L = liste(id, lid); const rel = []; let r = 0;
        L.forEach((p, j) => { if (j > 0) { let pas = PRH; const rp = runDe(id, lid, L[j - 1].cle);
          if (!isS && !(rp && rp === runDe(id, lid, p.cle)) && des[j] != null && des[j - 1] != null) pas = Math.max(PRH, Math.min(des[j] - des[j - 1], PRH + GAPX));
          r += pas; } rel.push(r); });
        return rel; };
      const desL = {}, relL = {}; let maxSpan = 0;
      const spanDe = lid => { const r = relL[lid]; return r && r.length ? Math.max(...r) : 0; };
      ls.forEach(lid => { desL[lid] = desDe(lid); relL[lid] = relDe(lid, desL[lid]); maxSpan = Math.max(maxSpan, spanDe(lid)); });
      const [mh, mb] = isS ? margesReglette(id) : [22, 22];
      const h = isS ? (mh + maxSpan + mb) : Math.max(64, maxSpan + 2 * 22);
      const baseL = {}; ls.forEach(lid => { baseL[lid] = isS ? mh : ((h - spanDe(lid)) / 2); });
      const offs = [];
      ls.forEach(lid => desL[lid].forEach((d, j) => { if (d != null) offs.push(d - (baseL[lid] + relL[lid][j])); }));
      if (!offs.length) ls.forEach(lid => liste(id, lid).forEach((p, j) => (partenaires.get(id + SEP + p.cle) || []).forEach(q => { if (q.id !== id) offs.push(yB(q.id, q.cle) - (baseL[lid] + relL[lid][j])); })));
      let haut = offs.length ? mediane(offs) : hautDe.get(id);
      haut = Math.max(haut, curseur + (isS ? 14 : VGAP), (bandeY[rangeeDe.get(id) || 0] ?? HAUT_PAGE) - 60);
      ls.forEach(lid => liste(id, lid).forEach((p, j) => yBroche.set(id + SEP + p.cle, haut + baseL[lid] + relL[lid][j])));
      hautDe.set(id, haut); basDe.set(id, haut + h); curseur = haut + h; }); }); };
  for (let tour = 0; tour < 4; tour++) { trierBroches(); trierColonnes(); elastique(); }
  trierBroches(); elastique();

  // faisceaux : plusieurs fils entre les mêmes deux blocs gardent le même ordre
  { const faisceaux = new Map();
    lk.forEach((l, li) => { const A = bouts.get(li + ':A'), B = bouts.get(li + ':B');
      const ia = nid(A.nom, A.cle), ib = nid(B.nom, B.cle); if (ia === ib) return;
      let a = { id: ia, cle: A.cle }, b = { id: ib, cle: B.cle };
      const ca = colonneDe.get(ia) ?? 0, cb = colonneDe.get(ib) ?? 0;
      if (ca > cb || (ca === cb && ia > ib)) { const t = a; a = b; b = t; }
      if (dedoublee(b.id, b.cle)) return;     // une borne des deux flancs garde le même rang sur chacun
      const k = a.id + '|' + b.id + '|' + listeDeBroche(b.id, b.cle);
      (faisceaux.get(k) || faisceaux.set(k, []).get(k)).push({ a, b }); });
    const verrou = new Set();
    [...faisceaux.values()].filter(ws => ws.length > 1).sort((x, y) => y.length - x.length).forEach(ws => {
      const bId = ws[0].b.id; if (ordreFixe(bId)) return; const lid = listeDeBroche(bId, ws[0].b.cle); const L = liste(bId, lid);
      const idx = new Map(L.map((p, i) => [p.cle, i])); const parB = new Map();
      ws.forEach(w => { const e = parB.get(w.b.cle) || { s: 0, c: 0 }; e.s += yB(w.a.id, w.a.cle); e.c++; parB.set(w.b.cle, e); });
      const cles = [...parB.keys()].filter(k => !verrou.has(bId + SEP + k) && libre(bId, k)); if (cles.length < 2) return;
      const places = cles.map(k => idx.get(k)).sort((u, v) => u - v);
      const voulu = [...cles].sort((k1, k2) => (parB.get(k1).s / parB.get(k1).c) - (parB.get(k2).s / parB.get(k2).c));
      const parPlace = new Map(); voulu.forEach((k, i) => { parPlace.set(places[i], k); verrou.add(bId + SEP + k); });
      const autres = L.filter(p => !cles.includes(p.cle)); const nouv = new Array(L.length); let ri = 0;
      for (let i = 0; i < L.length; i++) nouv[i] = parPlace.has(i) ? L.find(pp => pp.cle === parPlace.get(i)) : autres[ri++];
      listes.get(bId)[lid] = nouv.filter(Boolean); }); }

  // micro-alignement : chaque bloc glisse d'un résidu de fil, sans chevaucher
  const polir = () => { for (let passe = 0; passe < 4; passe++) { let bouge = false;
    colonnes.forEach(c => c.forEach((id, k) => { const isS = !!listes.get(id).S; const res = [], tous = [];
      chaqueBroche(id, p => (partenaires.get(id + SEP + p.cle) || []).forEach(q => { if (colonneDe.get(q.id) === colonneDe.get(id)) return;
        const r = yB(q.id, q.cle) - yB(id, p.cle); tous.push(r); if (isS || !listes.get(q.id).S) res.push(r); }));
      if (!res.length) res.push(...tous); if (!res.length) return;
      const h = basDe.get(id) - hautDe.get(id);
      const bas = k > 0 ? basDe.get(c[k - 1]) + 10 : -Infinity, haut = (k < c.length - 1 ? hautDe.get(c[k + 1]) - 10 : Infinity) - h;
      let best = 0, bestN = res.filter(r => Math.abs(r) < 0.6).length;
      [...new Set(res.map(r => Math.round(r * 2) / 2))].forEach(s => { if (s === 0 || Math.abs(s) > 3 * PRH) return;
        const t = hautDe.get(id) + s; if (t < bas - 0.01 || t > haut + 0.01) return;
        const n = res.filter(r => Math.abs(r - s) < 0.6).length;
        if (n > bestN || (n === bestN && n > 0 && Math.abs(s) < Math.abs(best) && best !== 0)) { best = s; bestN = n; } });
      if (best !== 0) { glisser(id, best); bouge = true; } }));
    if (!bouge) break; } };
  const scoreDroits = () => { let n = 0; lk.forEach((l, li) => { const A = bouts.get(li + ':A'), B = bouts.get(li + ':B');
    const ia = nid(A.nom, A.cle), ib = nid(B.nom, B.cle); if (ia === ib) return;
    if (Math.abs(yB(ia, A.cle) - yB(ib, B.cle)) < 0.6) n += (!listes.get(ia).S && !listes.get(ib).S) ? 3 : 1; }); return n; };
  /* Les INVERSIONS d'une goulotte : deux fils entre deux colonnes voisines
     dont l'ordre des bouts n'est pas le même à gauche et à droite se croisent,
     quoi que fasse le routeur. Un fil droit gagné en désordonnant une colonne
     se paie en croisements : le score les compte. */
  const inversions = () => { const par = new Map();
    lk.forEach((l, li) => { const A = bouts.get(li + ':A'), B = bouts.get(li + ':B'); const ia = nid(A.nom, A.cle), ib = nid(B.nom, B.cle);
      const ca = colonneDe.get(ia) ?? 0, cb = colonneDe.get(ib) ?? 0; if (Math.abs(ca - cb) !== 1) return;
      const g = ca < cb ? { ch: cb, l: yB(ia, A.cle), r: yB(ib, B.cle) } : { ch: ca, l: yB(ib, B.cle), r: yB(ia, A.cle) };
      (par.get(g.ch) || par.set(g.ch, []).get(g.ch)).push(g); });
    let n = 0; par.forEach(fs => { for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) {
      const dl = fs[i].l - fs[j].l, dr = fs[i].r - fs[j].r; if (Math.abs(dl) > 0.6 && Math.abs(dr) > 0.6 && (dl > 0) !== (dr > 0)) n++; } });
    return n; };
  const score = () => scoreDroits() - inversions();
  const photo = () => ({ p: new Map(yBroche), t: new Map(hautDe), b: new Map(basDe), o: colonnes.map(c => c.slice()) });
  const revenir = st => { yBroche.clear(); st.p.forEach((v, k) => yBroche.set(k, v)); hautDe.clear(); st.t.forEach((v, k) => hautDe.set(k, v));
    basDe.clear(); st.b.forEach((v, k) => basDe.set(k, v)); st.o.forEach((c, i) => colonnes[i] = c); };
  { let bestScore = -Infinity, bestSnap = null;
    for (let r = 0; r < 4; r++) { trierColonnes(); elastique(); polir(); const sc = score();
      if (sc > bestScore) { bestScore = sc; bestSnap = photo(); } }
    if (bestSnap) revenir(bestSnap); }
  // recherche locale : échanges de voisins de colonne, gardés s'ils gagnent
  if (ids.length <= 60) { let cur = score();
    for (let passe = 0; passe < 2; passe++) { let mieux = false;
      for (const c of colonnes) for (let i = 0; i + 1 < c.length; i++) {
        if (rangeeDe.get(c[i]) !== rangeeDe.get(c[i + 1])) continue;
        const st = photo(); const t = c[i]; c[i] = c[i + 1]; c[i + 1] = t;
        elastique(); polir(); const sc = score();
        if (sc > cur) { cur = sc; mieux = true; } else revenir(st); }
      if (!mieux) break; } }
  // sauvetage : un bloc sans aucun fil en face rejoint sa cible si un trou l'accueille
  colonnes.forEach(c => c.forEach(id => { const isS = !!listes.get(id).S; const res = [], tous = [];
    chaqueBroche(id, p => (partenaires.get(id + SEP + p.cle) || []).forEach(q => { if (q.id === id || colonneDe.get(q.id) === colonneDe.get(id)) return;
      const r = yB(q.id, q.cle) - yB(id, p.cle); tous.push(r); if (isS || !listes.get(q.id).S) res.push(r); }));
    const R = res.length ? res : tous; if (!R.length || R.some(r => Math.abs(r) < 0.6)) return;
    const h = basDe.get(id) - hautDe.get(id); const autres = c.filter(o => o !== id);
    const tient = t => autres.every(o => t + h + 10 <= hautDe.get(o) || t >= basDe.get(o) + 10);
    let best = 0, bestN = 0;
    [...new Set(R.map(r => Math.round(r * 2) / 2))].forEach(s => { if (!s || !tient(hautDe.get(id) + s)) return;
      const n = R.filter(r => Math.abs(r - s) < 0.6).length; if (n > bestN) { best = s; bestN = n; } });
    if (best) glisser(id, best); }));

  /* ===== 6. RÉSOLUTION EXACTE : chaque liaison acceptée reçoit UNE ordonnée
     partagée par ses deux broches ; les blocs s'étirent juste ce qu'il faut.
     Plus-long-chemin sur le graphe des contraintes (ordre des broches ≥ PRH,
     non-chevauchement dans une colonne) ; une liaison qui créerait un cycle
     reste pliée, le routeur s'en charge. ======================================= */
  const mHaut = new Map(), mBas = new Map(), estS = new Map();
  { ids.forEach(id => { const isS = !!listes.get(id).S; estS.set(id, isS);
      if (isS) { const [mh, mb] = margesReglette(id); mHaut.set(id, mh); mBas.set(id, mb); }
      else { let L = 1; clesListes(id).forEach(lid => L = Math.max(L, liste(id, lid).length));
        const m = Math.max(18, (46 - (L - 1) * PRH) / 2); mHaut.set(id, m); mBas.set(id, m); } });
    const PK = (id, cle) => id + SEP + cle;
    /* une borne reliée à plusieurs BLOCS du même côté les sert par une
       BARRETTE : le routeur rend ces fils droits quelle que soit leur hauteur,
       le solveur n'a donc pas à les aligner — la borne reste libre, le bloc
       reste compact. Plusieurs fils vers un même bloc gardent leur net : c'est
       lui qui tient le bloc partenaire en face. */
    const parBarrette = new Set();
    ids.forEach(id => chaqueBroche(id, p => { const k = PK(id, p.cle); const cote = new Map();
      (partenaires.get(k) || []).forEach(q => { if (q.id === id) return; const s = Math.sign((colonneDe.get(q.id) ?? 0) - (colonneDe.get(id) ?? 0));
        (cote.get(s) || cote.set(s, new Set()).get(s)).add(q.id); });
      cote.forEach((blocs, s) => { if (blocs.size >= 2) parBarrette.add(k + '|' + s); }); }));
    const derniersDe = id => { const out = []; clesListes(id).forEach(lid => { const L = liste(id, lid); if (L.length) out.push(PK(id, L[L.length - 1].cle)); }); return out; };
    const premiersDe = id => { const out = []; clesListes(id).forEach(lid => { const L = liste(id, lid); if (L.length) out.push(PK(id, L[0].cle)); }); return out; };
    /* `guide` : les ordonnées du tour précédent, pour deviner entre quels blocs
       d'une colonne enjambée un fil doit passer.
       Un NET est un ensemble de broches à une ordonnée commune — à un DÉCALAGE
       près : les bornes d'un groupe rigide (bornier, connecteur) forment un
       net dès le départ, chacune à k × PRH de la racine ; l'union-find porte
       ces décalages, et un fil accepté vers une borne du groupe fixe alors la
       broche partenaire exactement en face de cette borne. */
    const resoudre = (colBlocs, guide) => {
      const par = new Map(), dec = new Map(), etiq = new Map(), decales = new Set();
      ids.forEach(id => chaqueBroche(id, (p, lid) => { const k = PK(id, p.cle); par.set(k, k); dec.set(k, 0); etiq.set(k, new Map([[id + '|' + lid, 1]])); }));
      // compression de chemin : chaque maillon reçoit son décalage cumulé jusqu'à la racine
      const find = x => { let r = x; while (par.get(r) !== r) r = par.get(r);
        const chaine = []; for (let c = x; c !== r; c = par.get(c)) chaine.push(c);
        let cum = 0; for (let i = chaine.length - 1; i >= 0; i--) { cum += dec.get(chaine[i]); par.set(chaine[i], r); dec.set(chaine[i], cum); }
        return r; };
      const pos = x => { const r = find(x); return [r, x === r ? 0 : dec.get(x)]; };
      const fondre = (rb, ra, d) => { par.set(rb, ra); dec.set(rb, d); if (decales.has(rb)) decales.add(ra);
        const ta = etiq.get(ra); etiq.get(rb).forEach((v, k) => ta.set(k, (ta.get(k) || 0) + v)); etiq.delete(rb); };
      new Set(runs.values()).forEach(r => { const k0 = PK(r.id, r.cles[0]);
        r.cles.forEach((c, j) => { if (!j) return; const [ra, oa] = pos(k0), [rb, ob] = pos(PK(r.id, c));
          if (ra === rb) return;                        // déjà lié par l'autre flanc
          fondre(rb, ra, oa + j * PRH - ob); decales.add(ra); }); });
      const traversees = [];      // fils qui enjambent une colonne : le net passe entre deux blocs de celle-ci
      const aretes = f => { const E = [];
        const arete = (a, b, w) => { const [ra, oa] = f(a), [rb, ob] = f(b); E.push([ra, rb, w + oa - ob]); };
        ids.forEach(id => clesListes(id).forEach(lid => { const L = liste(id, lid); for (let j = 1; j < L.length; j++) arete(PK(id, L[j - 1].cle), PK(id, L[j].cle), PRH); }));
        colBlocs.map(c => c.filter(id => !estPastille(id))).forEach(c => { for (let i = 1; i < c.length; i++) { const P = c[i - 1], N = c[i];
          const w = mBas.get(P) + ((estS.get(P) && estS.get(N)) ? 14 : VGAP) + mHaut.get(N);
          derniersDe(P).forEach(a => premiersDe(N).forEach(b => arete(a, b, w))); } });
        traversees.forEach(t => { if (t.dessus) derniersDe(t.dessus).forEach(a => arete(a, t.net, mBas.get(t.dessus) + 6));
          if (t.dessous) premiersDe(t.dessous).forEach(b => arete(t.net, b, mHaut.get(t.dessous) + 6)); });
        return E; };
      const estimY = k => (guide && guide.get(k)) ?? yBroche.get(k);
      const couloir = (c, y) => { let dessus = null, dessous = null;
        for (const id of colBlocs[c]) { if (estPastille(id)) continue; let lo = Infinity, hi = -Infinity;
          chaqueBroche(id, p => { const v = estimY(PK(id, p.cle)); lo = Math.min(lo, v); hi = Math.max(hi, v); });
          if (hi <= y) { if (!dessus || hi > dessus.hi) dessus = { id, hi }; }
          else if (lo >= y) { if (!dessous || lo < dessous.lo) dessous = { id, lo }; }
          else if (y - lo < hi - y) { if (!dessous || lo < dessous.lo) dessous = { id, lo }; }     // le fil passe au-dessus du bloc qui le gêne
          else if (!dessus || hi > dessus.hi) dessus = { id, hi }; }
        return { dessus: dessus && dessus.id, dessous: dessous && dessous.id }; };
      /* une contrainte d'un net sur lui-même est vide si son poids est nul ou
         négatif (deux bornes d'un bornier, dans leur ordre), impossible sinon */
      const acyclique = E => { const indeg = new Map(), ad = new Map(), ns = new Set();
        for (const [a, b, w] of E) { if (a === b) { if (w > 0.01) return false; continue; }
          ns.add(a); ns.add(b); (ad.get(a) || ad.set(a, []).get(a)).push(b); indeg.set(b, (indeg.get(b) || 0) + 1); }
        const q = [...ns].filter(n => !(indeg.get(n) || 0)); let vus = 0;
        while (q.length) { const n = q.pop(); vus++; (ad.get(n) || []).forEach(m => { const d = indeg.get(m) - 1; indeg.set(m, d); if (!d) q.push(m); }); }
        return vus === ns.size; };
      const cand = [];
      lk.forEach((l, li) => { const A = bouts.get(li + ':A'), B = bouts.get(li + ':B');
        const ia = nid(A.nom, A.cle), ib = nid(B.nom, B.cle); if (ia === ib) return;
        const s = Math.sign((colonneDe.get(ib) ?? 0) - (colonneDe.get(ia) ?? 0)); if (s === 0) return;
        const d = Math.abs((colonneDe.get(ia) ?? 0) - (colonneDe.get(ib) ?? 0));
        if (!par.has(PK(ia, A.cle)) || !par.has(PK(ib, B.cle))) return;
        if (parBarrette.has(PK(ia, A.cle) + '|' + s) || parBarrette.has(PK(ib, B.cle) + '|' + (-s))) return;
        const genre = (estS.get(ia) ? 1 : 0) + (estS.get(ib) ? 1 : 0);
        cand.push({ a: PK(ia, A.cle), b: PK(ib, B.cle), d, milieu: d === 2 ? ((colonneDe.get(ia) ?? 0) + (colonneDe.get(ib) ?? 0)) / 2 : -1,
          pr: (d > 1 ? 10 : 0) + genre, w: (d === 1 ? 1 : 0.25) * (genre === 0 ? 1.06 : 1) }); });
      cand.sort((x, y) => x.pr - y.pr);
      let acc = 0;
      cand.forEach(wc => { const [ra, oa] = pos(wc.a), [rb, ob] = pos(wc.b);
        if (ra === rb) { if (Math.abs(oa - ob) < 0.01) acc += wc.w; return; }
        // deux broches d'une même liste ne partagent pas une ordonnée — sauf à
        // des décalages différents, ce que le test d'acyclicité tranche seul
        if (!decales.has(ra) && !decales.has(rb)) { const ta = etiq.get(ra), tb = etiq.get(rb); for (const k of tb.keys()) if (ta.has(k)) return; }
        const d = oa - ob;                     // Y(rb) = Y(ra) + d met les deux bouts à la même hauteur
        const f = x => { const [r, o] = pos(x); return r === rb ? [ra, o + d] : [r, o]; };
        let t = null;
        if (wc.milieu >= 0) { const { dessus, dessous } = couloir(wc.milieu, (estimY(wc.a) + estimY(wc.b)) / 2);
          if (dessus || dessous) { t = { net: wc.a, dessus, dessous }; traversees.push(t); } }
        if (!acyclique(aretes(f))) { if (t) traversees.pop(); return; }
        fondre(rb, ra, d); acc += wc.w; });
      const E = aretes(pos); const indeg = new Map(), ad = new Map(), ns = new Set();
      ids.forEach(id => chaqueBroche(id, p => ns.add(find(PK(id, p.cle)))));
      E.forEach(([a, b, w]) => { if (a === b) return; (ad.get(a) || ad.set(a, []).get(a)).push([b, w]); indeg.set(b, (indeg.get(b) || 0) + 1); });
      const Y = new Map(); const q = [...ns].filter(n => !(indeg.get(n) || 0)); q.forEach(n => Y.set(n, 0)); let qi = 0;
      while (qi < q.length) { const n = q[qi++]; (ad.get(n) || []).forEach(([m, w]) => { Y.set(m, Math.max(Y.get(m) || 0, (Y.get(n) || 0) + w));
        const d = indeg.get(m) - 1; indeg.set(m, d); if (!d) q.push(m); }); }
      const yDe = k => { const [r, o] = pos(k); return (Y.get(r) || 0) + o; };
      // détente : un net qui est le sommet d'un bloc (et le bas d'aucun) redescend
      // au plus près ; un net à décalages (un bornier) est déjà au plus serré
      const netBlocs = new Map();
      ids.forEach(id => chaqueBroche(id, p => { const r = find(PK(id, p.cle)); (netBlocs.get(r) || netBlocs.set(r, new Set()).get(r)).add(id); }));
      for (let dp = 0; dp < 2; dp++) for (let i = q.length - 1; i >= 0; i--) { const n = q[i]; if (decales.has(n)) continue; const oe = ad.get(n);
        let mx = Infinity; if (oe && oe.length) oe.forEach(([m, w]) => mx = Math.min(mx, (Y.get(m) || 0) - w));
        const y0 = Y.get(n) || 0; let hauts = 0, bas = 0, tgt = Infinity;
        (netBlocs.get(n) || []).forEach(id => { if (estPastille(id)) return;
          let lo = Infinity, lo2 = Infinity, hi = -Infinity, loN = 0;
          chaqueBroche(id, p => { const yy = yDe(PK(id, p.cle));
            if (yy < lo - 0.01) { lo2 = lo; lo = yy; loN = 1; } else if (yy < lo + 0.01) loN++; else if (yy < lo2) lo2 = yy;
            if (yy > hi) hi = yy; });
          if (Math.abs(y0 - lo) < 0.01 && loN === 1) { hauts++; if (isFinite(lo2)) tgt = Math.min(tgt, lo2 - PRH); }
          if (Math.abs(y0 - hi) < 0.01) bas++; });
        if (!(oe && oe.length)) mx = isFinite(tgt) ? tgt : y0;
        if (mx <= y0 + 0.5) continue;
        if (hauts >= 1 && bas === 0) Y.set(n, mx); }
      const py = new Map(); ids.forEach(id => chaqueBroche(id, p => { const k = PK(id, p.cle); py.set(k, HAUT_PAGE + yDe(k)); }));
      return { acc, py }; };

    const RANG = id => (rangeeDe.get(id) || 0) * 1e9;     // la rangée du serpentin prime tout
    let colBlocs = colonnes.map(c => [...c].sort((a, b) => (RANG(a) + hautDe.get(a)) - (RANG(b) + hautDe.get(b))));
    let best = resoudre(colBlocs), bestBlocs = colBlocs;
    /* un partenaire dans une AUTRE rangée du serpentin compte en miroir : les
       fils de retour d'un repli s'emboîtent alors au lieu de se croiser — de
       deux bras qui descendent ensemble, celui du haut doit arriver en bas */
    const bandes = py => { const b = new Map(); ids.forEach(id => { const r = rangeeDe.get(id) || 0; const e = b.get(r) || b.set(r, { lo: Infinity, hi: -Infinity }).get(r);
      chaqueBroche(id, p => { const y = py.get(PK(id, p.cle)); if (y != null) { e.lo = Math.min(e.lo, y); e.hi = Math.max(e.hi, y); } }); }); return b; };
    const cleBary = (py, moyenne) => { const B = bandes(py); return id => { const ds = []; const r = rangeeDe.get(id) || 0;
      partenairesDeTri(id).forEach(q => { if (!py.has(PK(q.id, q.cle))) return;
        const y = py.get(PK(q.id, q.cle)), rq = rangeeDe.get(q.id) || 0; const b = B.get(rq);
        ds.push(rq === r ? y : b.lo + b.hi - y); });
      let bar; if (!ds.length) bar = hautDe.get(id); else if (moyenne) bar = ds.reduce((a, b) => a + b, 0) / ds.length; else bar = mediane(ds);
      return RANG(id) + bar; }; };
    const MAXIT = ids.length > 600 ? 10 : (ids.length > 120 ? 16 : 24);
    // les bornes d'un rail n'ont pas d'ordre imposé : elles se mettent face à
    // leurs partenaires ; celles d'un bornier gardent leur ordre naturel ;
    // celles d'un connecteur se rangent dans l'ordre des partenaires (trierRuns)
    const reordonner = py => { trierRuns(k => py.get(k)); rangerGroupes(); ids.forEach(id => { if (!estS.get(id) || ordreFixe(id)) return;
      clesListes(id).forEach(lid => { const L = liste(id, lid); if (L.length < 2) return;
        const sc = new Map(L.map(p => { const ps = partenairesQuiComptent(id, p.cle);
          let s = 0, c = 0; ps.forEach(q => { const y = py.get(PK(q.id, q.cle)); if (y != null) { s += y; c++; } });
          return [p.cle, c ? s / c : (py.get(PK(id, p.cle)) || 0)]; }));
        L.sort((a, b) => sc.get(a.cle) - sc.get(b.cle)); }); }); };
    const photoOrdre = () => ({ listes: new Map(ids.map(id => { const ls = listes.get(id); return [id, { L: ls.L ? ls.L.slice() : null, R: ls.R ? ls.R.slice() : null, S: ls.S ? ls.S.slice() : null }]; })),
      runs: lesRuns().map(r => [r, r.cles.slice()]) });
    const revenirOrdre = snap => { snap.listes.forEach((o, id) => { const ls = listes.get(id); if (o.L) ls.L = o.L; if (o.R) ls.R = o.R; if (o.S) ls.S = o.S; });
      snap.runs.forEach(([r, cles]) => { r.cles = cles.slice(); }); };
    let py = best.py, cur = colBlocs, stagne = 0, bestOrdre = photoOrdre();
    for (let it = 0; it < MAXIT && stagne < 5; it++) { reordonner(py);
      const cle = cleBary(py, it % 2 === 1);
      const nb = cur.map(c => { const k = new Map(c.map(id => [id, cle(id)])); return [...c].sort((a, b) => k.get(a) - k.get(b)); });
      const r = resoudre(nb, py); py = r.py; cur = nb;
      if (r.acc > best.acc + 0.01) { best = r; bestBlocs = nb; bestOrdre = photoOrdre(); stagne = 0; } else stagne++; }
    revenirOrdre(bestOrdre); colBlocs = bestBlocs;
    // dégonflage : un bloc étiré pour rien (broche accrochée à l'extrémité opposée
    // du partenaire) se referme en déplaçant la broche partenaire dans sa liste
    const sommeH = st => { let h = 0; ids.forEach(id => { let lo = Infinity, hi = -Infinity;
      chaqueBroche(id, p => { const y = st.py.get(PK(id, p.cle)); lo = Math.min(lo, y); hi = Math.max(hi, y); }); if (isFinite(lo)) h += hi - lo; }); return h; };
    for (let rp = 0; rp < 3; rp++) { const py2 = best.py; const sauve = new Map(); let bouge = false;
      ids.forEach(id => clesListes(id).forEach(lid => { const L = liste(id, lid); if (L.length < 2) return;
        const ys = L.map(p => py2.get(PK(id, p.cle)));
        let bj = -1, bg = 0; for (let j = 0; j + 1 < L.length; j++) { const g = ys[j + 1] - ys[j]; if (g > bg) { bg = g; bj = j; } }
        if (bg <= 3 * PRH) return;
        const enHaut = (bj + 1) <= L.length / 2; const grp = enHaut ? L.slice(0, bj + 1) : L.slice(bj + 1);
        if (grp.length > L.length / 2) return;
        const cible = enHaut ? ys[bj + 1] : ys[bj];
        grp.forEach(p => (partenaires.get(id + SEP + p.cle) || []).forEach(q => { if (q.id === id || dedoublee(q.id, q.cle) || !libre(q.id, q.cle)) return;
          const lid2 = listeDeBroche(q.id, q.cle); const L2 = listes.get(q.id)[lid2]; if (!L2 || L2.length < 2) return;
          const qi = L2.findIndex(pp => pp.cle === q.cle); if (qi < 0) return;
          const ys2 = L2.map(pp => py2.get(PK(q.id, pp.cle))); let ni = 0; while (ni < L2.length && ys2[ni] < cible) ni++;
          if (ni === qi || ni === qi + 1) return;
          // jamais au milieu d'un groupe rigide
          if (ni > 0 && ni < L2.length && runDe(q.id, lid2, L2[ni - 1].cle) && runDe(q.id, lid2, L2[ni - 1].cle) === runDe(q.id, lid2, L2[ni].cle)) return;
          if (!sauve.has(L2)) sauve.set(L2, L2.slice());
          const item = L2.splice(qi, 1)[0]; L2.splice(qi < ni ? ni - 1 : ni, 0, item); bouge = true; })); }));
      if (!bouge) break;
      const r = resoudre(colBlocs, best.py);
      if (r.acc >= best.acc && sommeH(r) < sommeH(best)) best = r;
      else { sauve.forEach((copie, arr) => { arr.length = 0; copie.forEach(x => arr.push(x)); }); break; } }
    ids.forEach(id => { let lo = Infinity, hi = -Infinity;
      chaqueBroche(id, p => { const y = best.py.get(PK(id, p.cle)); yBroche.set(PK(id, p.cle), y); lo = Math.min(lo, y); hi = Math.max(hi, y); });
      if (!isFinite(lo)) { lo = HAUT_PAGE; hi = HAUT_PAGE; }
      hautDe.set(id, lo - mHaut.get(id)); basDe.set(id, hi + mBas.get(id)); }); }

  const recalerBords = id => { let lo = Infinity, hi = -Infinity; chaqueBroche(id, p => { const y = yB(id, p.cle); lo = Math.min(lo, y); hi = Math.max(hi, y); });
    if (isFinite(lo)) { hautDe.set(id, lo - mHaut.get(id)); basDe.set(id, hi + mBas.get(id)); } };
  const voisinsDe = id => { const s = new Set(); chaqueBroche(id, p => (partenaires.get(id + SEP + p.cle) || []).forEach(q => { if (q.id !== id && !estPastille(q.id)) s.add(q.id); })); return s; };
  const tous = colonnes.flat();
  const heurte = (L, nt, nb, exclus) => { const x = xDe.get(L), w = largeurDe(L);
    return tous.some(o => { if (o === L || estPastille(o) || (exclus && exclus.includes(o))) return false; const ox = xDe.get(o), ow = largeurDe(o);
      return x < ox + ow + 6 && ox < x + w + 6 && nt < basDe.get(o) + 8 && hautDe.get(o) < nb + 8; }); };

  /* ===== 7. FINITIONS QUI NE PLIENT AUCUN FIL DROIT ====================== */
  // flancs alignés : un flanc qui ne dessert que des feuilles les emmène avec lui
  tous.forEach(B => { if (estS.get(B) || estPastille(B)) return;
    const ls = listes.get(B); if (!ls.L || !ls.R || !ls.L.length || !ls.R.length) return;
    const cen = arr => arr.reduce((s, p) => s + yB(B, p.cle), 0) / arr.length;
    const d = cen(ls.L) - cen(ls.R); if (Math.abs(d) < 12) return;
    const feuilles = flanc => { const set = new Set(); ls[flanc].forEach(p => (partenaires.get(B + SEP + p.cle) || []).forEach(q => { if (q.id !== B && !estPastille(q.id)) set.add(q.id); }));
      const ps = [...set]; if (!ps.length) return null; for (const q of ps) { const nb = voisinsDe(q); if (nb.size !== 1 || !nb.has(B)) return null; } return ps; };
    const rl = feuilles('R'), ll = feuilles('L'); let flanc = null, dy = 0;
    if (rl) { flanc = 'R'; dy = d; } else if (ll) { flanc = 'L'; dy = -d; }
    if (!flanc || Math.abs(dy) < 12) return;
    const fs = flanc === 'R' ? rl : ll;
    if (fs.some(id => heurte(id, hautDe.get(id) + dy, basDe.get(id) + dy, fs))) return;
    ls[flanc].forEach(p => yBroche.set(B + SEP + p.cle, yB(B, p.cle) + dy)); fs.forEach(q => glisser(q, dy)); recalerBords(B); });
  // droiture bornée : un gros trou vide dans un équipement se referme en glissant
  // le côté qui a le moins de broches ; un bloc dense n'est jamais touché
  ids.forEach(id => { if (estS.get(id) || estPastille(id)) return;
    const cles = []; chaqueBroche(id, p => cles.push(id + SEP + p.cle)); if (cles.length < 2) return;
    const permis = (cles.length - 1) * (cles.length >= 16 ? 100 : 130);
    { const ys = cles.map(k => yBroche.get(k)); if (Math.max(...ys) - Math.min(...ys) <= permis) return; }
    for (let garde = 0; garde < 80; garde++) {
      const arr = cles.map(k => ({ k, y: yBroche.get(k) })).sort((a, b) => a.y - b.y);
      const span = arr[arr.length - 1].y - arr[0].y; if (span <= permis) break;
      let bi = -1, bg = PRH; for (let i = 1; i < arr.length; i++) { const g = arr[i].y - arr[i - 1].y; if (g > bg) { bg = g; bi = i; } }
      if (bi < 0) break; const reduit = Math.min(span - permis, bg - PRH); if (reduit <= 0.5) break;
      const dessus = arr.slice(0, bi), dessous = arr.slice(bi);
      const m = dessus.length <= dessous.length ? { set: new Set(dessus.map(a => a.k)), d: reduit } : { set: new Set(dessous.map(a => a.k)), d: -reduit };
      cles.forEach(k => { if (m.set.has(k)) yBroche.set(k, yBroche.get(k) + m.d); }); }
    recalerBords(id); });
  // feuilles : un bloc qui ne se raccorde qu'à un seul autre se met pile en face
  tous.forEach(L => { if (estS.get(L) || estPastille(L)) return;
    const nb = voisinsDe(L); if (nb.size !== 1) return; const B = [...nb][0]; if (estPastille(B)) return;
    const parFlanc = {}, all = [];
    clesListes(L).forEach(lid => { const arr = []; liste(L, lid).forEach(p => { const qs = (partenaires.get(L + SEP + p.cle) || []).filter(q => q.id === B);
      const it = { cle: p.cle, cur: yB(L, p.cle), des: qs.length ? mediane(qs.map(q => yB(q.id, q.cle))) : null }; arr.push(it); all.push(it); }); parFlanc[lid] = arr; });
    let exact = all.length > 0 && all.every(it => it.des != null);
    // exact seulement si l'ordre tient, et si les bornes d'un même groupe rigide restent au pas
    if (exact) for (const lid in parFlanc) { const a = parFlanc[lid]; for (let i = 1; i < a.length; i++) { const g = a[i].des - a[i - 1].des;
      const rp = runDe(L, lid, a[i - 1].cle), meme = rp && rp === runDe(L, lid, a[i].cle);
      if (g < PRH - 0.5 || (meme && Math.abs(g - PRH) > 0.5)) { exact = false; break; } } if (!exact) break; }
    if (exact) { let lo = Infinity, hi = -Infinity; all.forEach(it => { lo = Math.min(lo, it.des); hi = Math.max(hi, it.des); });
      const nt = lo - mHaut.get(L), nb2 = hi + mBas.get(L);
      if (!heurte(L, nt, nb2)) { all.forEach(it => yBroche.set(L + SEP + it.cle, it.des)); hautDe.set(L, nt); basDe.set(L, nb2); return; } }
    let s = 0, c = 0; all.forEach(it => { if (it.des != null) { s += it.des - it.cur; c++; } });
    if (!c) return; const dy = s / c; if (Math.abs(dy) < 1) return;
    if (!heurte(L, hautDe.get(L) + dy, basDe.get(L) + dy)) glisser(L, dy); });
  const recollerPastilles = () => tous.forEach(id => { if (!estPastille(id)) return;
    const pp = liste(id, 'S')[0]; if (!pp) return;
    const qs = (partenaires.get(id + SEP + pp.cle) || []).filter(q => q.id !== id); if (!qs.length) return;
    let y = yB(qs[0].id, qs[0].cle); const x = xDe.get(id), w = largeurDe(id);
    for (const o of tous) { if (o === id || o === qs[0].id || estPastille(o)) continue; const ox = xDe.get(o), ow = largeurDe(o);
      if (!(x < ox + ow + 2 && ox < x + w + 2)) continue; const t = hautDe.get(o) - 9, b = basDe.get(o) + 9;
      if (y > t && y < b) { const up = y - t, dn = b - y; if (Math.min(up, dn) <= 20) y = (up <= dn) ? t : b; } }
    yBroche.set(id + SEP + pp.cle, y); hautDe.set(id, y - 7); basDe.set(id, y + 7); });
  recollerPastilles();
  // bandes vides : tout remonte d'autant, les fils droits le restent
  { const iv = tous.map(id => [hautDe.get(id), basDe.get(id)]).sort((a, b) => a[0] - b[0]); const fus = [];
    iv.forEach(([a, b]) => { const m = fus[fus.length - 1]; if (m && a <= m[1] + VGAP) m[1] = Math.max(m[1], b); else fus.push([a, b]); });
    const moves = []; for (let i = 1; i < fus.length; i++) { const gap = fus[i][0] - fus[i - 1][1]; if (gap > 3 * VGAP) moves.push([fus[i][0], gap - 3 * VGAP]); }
    if (moves.length) tous.forEach(id => { const t = hautDe.get(id); let d = 0; moves.forEach(([y, g]) => { if (t >= y - 0.01) d += g; }); if (d) glisser(id, -d); }); }
  // aucun chevauchement, jamais : le bloc du dessous glisse sous l'autre
  { const ids2 = tous.filter(id => !estPastille(id));
    for (let passe = 0; passe < 8; passe++) { let bouge = false;
      for (let i = 0; i < ids2.length; i++) for (let j = 0; j < ids2.length; j++) { if (i === j) continue;
        const u = ids2[i], v = ids2[j];
        if (!(xDe.get(u) < xDe.get(v) + largeurDe(v) + 6 && xDe.get(v) < xDe.get(u) + largeurDe(u) + 6 && hautDe.get(u) < basDe.get(v) + 6 && hautDe.get(v) < basDe.get(u) + 6)) continue;
        glisser(v, (basDe.get(u) + 10) - hautDe.get(v)); bouge = true; }
      if (!bouge) break; } }
  // pastilles : si sa colonne est prise ou son fil très long, la pastille se
  // colle au flanc de son partenaire, dans la goulotte ; la recherche locale
  // le redemande après chaque geste qui déplace un bloc
  const pastilles = [];
  const recaserPastilles = () => tous.forEach(id => { if (!estPastille(id) || pastilles.some(sp => sp.id === id)) return;
    const t = hautDe.get(id), bb = basDe.get(id), x = xDe.get(id), w = largeurDe(id);
    const pp = liste(id, 'S')[0]; if (!pp) return;
    const qs = (partenaires.get(id + SEP + pp.cle) || []).filter(q => q.id !== id); if (!qs.length) return;
    const q = qs[0]; const qx = xDe.get(q.id), qw = largeurDe(q.id);
    const gene = tous.some(o => o !== id && !estPastille(o) && x < xDe.get(o) + largeurDe(o) + 2 && xDe.get(o) < x + w + 2 && t < basDe.get(o) + 2 && hautDe.get(o) < bb + 2);
    const loin = Math.min(Math.abs(x - (qx + qw)), Math.abs(qx - (x + w))) > 120;
    if (!gene && !loin) return;
    const droite = (colonneDe.get(id) ?? 0) >= (colonneDe.get(q.id) ?? 0);
    xDe.set(id, droite ? qx + qw + 6 : qx - w - 6);
    pastilles.push({ id, ch: droite ? (colonneDe.get(q.id) ?? 0) + 1 : (colonneDe.get(q.id) ?? 0), y1: t, y2: bb }); });
  recaserPastilles();

  /* ===== 8. ALLER-RETOUR BORNES ↔ ÉQUIPEMENTS ============================ */
  { const couloirLibre = (ia, ib, y) => { const xa = xDe.get(ia), xb = xDe.get(ib); if (xa == null || xb == null) return false;
      const seg = xa < xb ? [xa + largeurDe(ia), xb] : [xb + largeurDe(ib), xa]; if (seg[1] - seg[0] < 4) return true;
      return !tous.some(o => { if (o === ia || o === ib) return false; const ox = xDe.get(o), ow = largeurDe(o);
        return seg[1] > ox + 2 && seg[0] < ox + ow - 2 && y > hautDe.get(o) + 2 && y < basDe.get(o) - 2; }); };
    const filsDroits = () => { const S = [];
      lk.forEach((l, li) => { const A = bouts.get(li + ':A'), B = bouts.get(li + ':B'); const ia = nid(A.nom, A.cle), ib = nid(B.nom, B.cle); if (ia === ib) return;
        const ya = yB(ia, A.cle), yb = yB(ib, B.cle); if (Math.abs(ya - yb) >= 0.6) return;
        const xa = xDe.get(ia), xb = xDe.get(ib); if (xa == null || xb == null) return;
        const seg = xa < xb ? [xa + largeurDe(ia), xb] : [xb + largeurDe(ib), xa]; S.push({ y: ya, x0: seg[0], x1: seg[1], ia, ib, ka: A.cle, kb: B.cle }); });
      return S; };
    const avaleUnDroit = (L, nt, nb) => { const x = xDe.get(L), w = largeurDe(L);
      return filsDroits().some(sg => sg.ia !== L && sg.ib !== L && sg.x1 > x + 2 && sg.x0 < x + w - 2 && sg.y > nt + 2 && sg.y < nb - 2); };
    const espaceOK = (id, cle, y, exclus) => { let ok = true;
      chaqueBroche(id, (p, lid) => { if (ok && p.cle !== cle && !exclus.has(p.cle) && (listes.get(id).S || dedoublee(id, cle) || lid === listeDeBroche(id, cle)) && Math.abs(yB(id, p.cle) - y) < PRH - 0.5) ok = false; });
      return ok; };
    // un fil droit à tout prix : le bloc a le droit de grandir pour l'attraper,
    // sans chevaucher personne ni avaler le fil droit de personne. Une borne
    // d'un groupe rigide emmène tout son groupe, d'un bloc. Le corps reste
    // l'enveloppe des bornes plus ses marges : il suit le groupe, il ne garde
    // pas la place que le groupe a quittée.
    const poser = (id, cle, y) => { if (auPas(id)) return false;
      const grp = membres(id, cle), ens = new Set(grp), dy = y - yB(id, cle);
      if (grp.some(c => !espaceOK(id, c, yB(id, c) + dy, ens))) return false;
      // une borne de barrette bouge seule, mais jamais par-dessus une voisine
      if (ordreFixe(id)) { const S = liste(id, 'S'), i = S.findIndex(p => p.cle === cle);
        if ((i > 0 && y < yB(id, S[i - 1].cle) + PRH - 0.5) || (i < S.length - 1 && y > yB(id, S[i + 1].cle) - PRH + 0.5)) return false; }
      let lo = Infinity, hi = -Infinity; chaqueBroche(id, p => { const v = yB(id, p.cle) + (ens.has(p.cle) ? dy : 0); lo = Math.min(lo, v); hi = Math.max(hi, v); });
      const nt = lo - mHaut.get(id), nb = hi + mBas.get(id);
      if (nt < hautDe.get(id) - 0.5 || nb > basDe.get(id) + 0.5) {
        if (listes.get(id).S || tous.length > 400) return false;
        if (nb - nt > 900 || (nb - nt) - (basDe.get(id) - hautDe.get(id)) > 260) return false;
        if (heurte(id, nt, nb) || avaleUnDroit(id, nt, nb)) return false; }
      grp.forEach(c => yBroche.set(id + SEP + c, yB(id, c) + dy)); hautDe.set(id, nt); basDe.set(id, nb); return true; };
    const detente = () => { let bouge = false;
      lk.forEach((l, li) => { const A = bouts.get(li + ':A'), B = bouts.get(li + ':B'); const ia = nid(A.nom, A.cle), ib = nid(B.nom, B.cle); if (ia === ib) return;
        const dc = Math.abs((colonneDe.get(ia) ?? 0) - (colonneDe.get(ib) ?? 0)); if (dc === 0 || estPastille(ia) || estPastille(ib)) return;
        const ya = yB(ia, A.cle), yb = yB(ib, B.cle); if (Math.abs(ya - yb) < 0.6) return;
        const mobile = (id, cle) => { const ps = (partenaires.get(id + SEP + cle) || []).filter(q => q.id !== id);
          if (ps.length === 1) return true; if (!ps.length) return false; const y0 = yB(ps[0].id, ps[0].cle); return ps.every(q => Math.abs(yB(q.id, q.cle) - y0) < 0.6); };
        const ok = y => dc === 1 || couloirLibre(ia, ib, y);
        if (mobile(ia, A.cle) && ok(yb) && poser(ia, A.cle, yb)) bouge = true;
        else if (mobile(ib, B.cle) && ok(ya) && poser(ib, B.cle, ya)) bouge = true; });
      return bouge; };
    const pousser = () => { let any = false; const S = filsDroits();
      const heurteFil = (id, nt, nb) => { const x = xDe.get(id), w = largeurDe(id); return S.some(sg => sg.ia !== id && sg.ib !== id && sg.y > nt + 2 && sg.y < nb - 2 && sg.x1 > x + 2 && sg.x0 < x + w - 2); };
      tous.forEach(id => { if (estPastille(id)) return; const rs = [];
        chaqueBroche(id, p => (partenaires.get(id + SEP + p.cle) || []).forEach(q => { if (q.id === id || estPastille(q.id)) return;
          if (Math.abs((colonneDe.get(q.id) ?? 0) - (colonneDe.get(id) ?? 0)) !== 1) return; rs.push(yB(q.id, q.cle) - yB(id, p.cle)); }));
        if (!rs.length) return; const cur = rs.filter(r => Math.abs(r) < 0.6).length; let best = 0, bg = 0;
        [...new Set(rs.map(r => Math.round(r * 2) / 2))].forEach(s => { if (Math.abs(s) < 0.6) return; const n = rs.filter(r => Math.abs(r - s) < 0.6).length;
          if (n - cur > bg && !heurte(id, hautDe.get(id) + s, basDe.get(id) + s) && !heurteFil(id, hautDe.get(id) + s, basDe.get(id) + s)) { bg = n - cur; best = s; } });
        if (best) { glisser(id, best); any = true; } });
      return any; };
    // dé-croisement : sur chaque flanc, les bornes LIBRES pliées échangent leurs
    // places pour suivre l'ordre vertical de leurs partenaires
    const permuter = () => { let any = false;
      tous.forEach(id => { if (estPastille(id) || ordreFixe(id)) return;
        clesListes(id).forEach(lid => { const L = liste(id, lid); const grp = { L: [], R: [] };
          L.forEach(p => { if (!libre(id, p.cle)) return; const ps = partenaires.get(id + SEP + p.cle) || []; if (ps.length !== 1) return; const q = ps[0]; if (q.id === id || estPastille(q.id)) return;
            const dc = (colonneDe.get(q.id) ?? 0) - (colonneDe.get(id) ?? 0); if (Math.abs(dc) !== 1) return;
            const my = yB(id, p.cle), tgt = yB(q.id, q.cle); if (Math.abs(my - tgt) < 0.6) return; grp[dc > 0 ? 'R' : 'L'].push({ cle: p.cle, y: my, tgt }); });
          ['L', 'R'].forEach(g => { const libres = grp[g]; if (libres.length < 2) return;
            const places = libres.map(f => f.y).sort((a, b) => a - b); const ordre = libres.slice().sort((a, b) => a.tgt - b.tgt);
            if (!ordre.some((f, i) => Math.abs(f.y - places[i]) > 0.5)) return;
            ordre.forEach((f, i) => yBroche.set(id + SEP + f.cle, places[i])); any = true; }); }); });
      return any; };
    // rétreint : une broche extrême dont le fil est plié de toute façon se
    // rapproche — avec son groupe rigide, si aucun de ses fils n'est droit
    const retreindre = () => { tous.forEach(id => { if (estPastille(id) || auPas(id)) return;
      for (let garde = 0; garde < 40; garde++) { const items = [];
        chaqueBroche(id, p => { const k = p.cle, y = yB(id, p.cle); const ps = (partenaires.get(id + SEP + k) || []).filter(q => q.id !== id && !estPastille(q.id));
          items.push({ k, y, droit: ps.length > 0 && ps.every(q => Math.abs(yB(q.id, q.cle) - y) < 0.6) }); });
        if (items.length < 2) break; items.sort((a, b) => a.y - b.y); let fait = false;
        // l'extrémité, c'est le groupe de la broche extrême ; il se rapproche du reste
        const bout = (ext, signe) => { const g = new Set(membres(id, ext.k)); const dedans = items.filter(it => g.has(it.k)), dehors = items.filter(it => !g.has(it.k));
          if (!dehors.length || dedans.some(it => it.droit)) return false;
          const bord = signe > 0 ? Math.max(...dedans.map(it => it.y)) : Math.min(...dedans.map(it => it.y));
          const voisin = signe > 0 ? Math.min(...dehors.map(it => it.y)) : Math.max(...dehors.map(it => it.y));
          const d = signe * (voisin - bord) - PRH; if (d <= 0.5) return false;
          dedans.forEach(it => yBroche.set(id + SEP + it.k, it.y + signe * d)); return true; };
        fait = bout(items[0], 1) || bout(items[items.length - 1], -1);
        if (!fait) break; }
      recalerBords(id); }); };
    // paires libres (un appareil + son bornier dédié) dans l'ordre naturel des repères
    colonnes.forEach(col => { const paires = [];
      col.forEach(id => { if (listes.get(id).S || estPastille(id)) return; const nb = voisinsDe(id); if (nb.size !== 1) return; const fr = [...nb][0];
        if (!listes.get(fr).S || estPastille(fr)) return; const fn = voisinsDe(fr); if (fn.size !== 1 || [...fn][0] !== id) return; paires.push({ dev: id, fr }); });
      if (paires.length < 2) return;
      const hautP = p => Math.min(hautDe.get(p.dev), hautDe.get(p.fr)), hP = p => Math.round(Math.max(basDe.get(p.dev), basDe.get(p.fr)) - hautP(p));
      const parH = new Map(); paires.forEach(p => { const h = hP(p); (parH.get(h) || parH.set(h, []).get(h)).push(p); });
      parH.forEach(grp => { if (grp.length < 2) return; const hauts = grp.map(hautP).sort((a, b) => a - b);
        const ordre = grp.slice().sort((a, b) => String(noeuds.get(a.dev).nom).localeCompare(String(noeuds.get(b.dev).nom), undefined, { numeric: true }));
        ordre.forEach((p, i) => { const dy = hauts[i] - hautP(p); if (Math.abs(dy) < 0.5) return; glisser(p.dev, dy); glisser(p.fr, dy); }); }); });
    // condensation rigide : un trou dans un hub se referme en emmenant les grappes-feuilles
    const condenser = () => { const rebord = new Set();
      tous.forEach(H => { if (estPastille(H)) return;
        const grappe = P => { const vus = new Set([P]); const st = [P];
          while (st.length) { const u = st.pop(); if (vus.size > 40) return null;
            chaqueBroche(u, p => (partenaires.get(u + SEP + p.cle) || []).forEach(q => { if (q.id === H || estPastille(q.id) || vus.has(q.id)) return; vus.add(q.id); st.push(q.id); })); }
          return vus; };
        let bouge = false;
        for (let g = 0; g < 60; g++) { const items = []; chaqueBroche(H, p => items.push({ k: p.cle, y: yB(H, p.cle) }));
          if (items.length < 3) break; items.sort((a, b) => a.y - b.y);
          const trous = []; for (let i = 1; i < items.length; i++) { const gp = items[i].y - items[i - 1].y; if (gp > 3 * PRH) trous.push({ i, gp }); }
          if (!trous.length) break; trous.sort((a, b) => b.gp - a.gp); let fait = false;
          for (const T of trous) { const dessus = items.slice(0, T.i), dessous = items.slice(T.i);
            const essai = (cote, dy) => { const cles = new Set(cote.map(it => it.k)); const parts = new Set(); let ok = true;
              cote.forEach(it => (partenaires.get(H + SEP + it.k) || []).forEach(q => { if (!ok) return;
                if (q.id === H) { if (!cles.has(q.cle)) ok = false; return; } if (estPastille(q.id) || parts.has(q.id)) return;
                const c = grappe(q.id); if (!c) { ok = false; return; } c.forEach(m => parts.add(m)); }));
              if (!ok || !parts.size) return false;
              for (const m of parts) { let mal = false; chaqueBroche(m, p => (partenaires.get(m + SEP + p.cle) || []).forEach(q => { if (q.id === H && !cles.has(q.cle)) mal = true; })); if (mal) return false; }
              const signe = dy > 0 ? 1 : -1; let mag = Math.abs(dy);
              for (const P of parts) { const x = xDe.get(P), w = largeurDe(P);
                tous.forEach(o => { if (o === P || o === H || parts.has(o) || estPastille(o)) return; const ox = xDe.get(o), ow = largeurDe(o); if (!(x < ox + ow + 6 && ox < x + w + 6)) return;
                  if (signe > 0) { if (hautDe.get(o) >= basDe.get(P) - 1) mag = Math.min(mag, hautDe.get(o) - 8 - basDe.get(P)); }
                  else { if (basDe.get(o) <= hautDe.get(P) + 1) mag = Math.min(mag, hautDe.get(P) - (basDe.get(o) + 8)); } }); }
              if (mag < 2 * PRH) return false; const d = signe * mag;
              cote.forEach(it => yBroche.set(H + SEP + it.k, yB(H, it.k) + d)); parts.forEach(P => glisser(P, d)); return true; };
            /* glissement de broches : quand le bloc partenaire ne peut pas bouger, on
               ne glisse que ses broches concernées dans leur bloc — aucun bloc ne bouge,
               les deux bouts glissent ensemble, les fils restent droits. Candidat
               (opt.condenser) : mesuré, il ne change pas la droiture mais rend les
               blocs compacts — un équipement n'a plus à grandir pour attraper un fil
               qu'une masse peut aller chercher. */
            const essaiBroches = (cote, dy) => { if (!opt.condenser) return false;
              const clesH = new Set(cote.map(it => it.k)); const mv = [], mvSet = new Set(); let ok = true;
              cote.forEach(it => (partenaires.get(H + SEP + it.k) || []).forEach(q => { if (!ok || estPastille(q.id)) return;
                if (q.id === H) { if (!clesH.has(q.cle)) ok = false; return; }
                if (!libre(q.id, q.cle)) { ok = false; return; }          // une borne d'un groupe rigide ne glisse pas seule
                const pk = q.id + SEP + q.cle; if (mvSet.has(pk)) return;
                for (const r of (partenaires.get(pk) || [])) { if (!(r.id === H && clesH.has(r.cle))) { ok = false; return; } }
                mvSet.add(pk); mv.push({ id: q.id, cle: q.cle }); }));
              if (!ok || !mv.length) return false;
              const signe = dy > 0 ? 1 : -1, touches = [...new Set(mv.map(m => m.id))];
              let SGS = null; const sgs = () => SGS || (SGS = filsDroits());
              const enMouvement = sg => (sg.ia === H && clesH.has(sg.ka)) || (sg.ib === H && clesH.has(sg.kb)) || mvSet.has(sg.ia + SEP + sg.ka) || mvSet.has(sg.ib + SEP + sg.kb);
              let bornes = null;
              const tient = mag => { const d = signe * mag; bornes = new Map();
                for (const m of mv) { const y = yB(m.id, m.cle) + d; if (!couloirLibre(H, m.id, y)) return false;
                  for (const p of noeuds.get(m.id).broches) { if (mvSet.has(m.id + SEP + p.cle)) continue; if (Math.abs(yB(m.id, p.cle) - y) < PRH - 0.5) return false; } }
                for (const id of touches) { let lo = Infinity, hi = -Infinity;
                  noeuds.get(id).broches.forEach(p => { const y = yB(id, p.cle) + (mvSet.has(id + SEP + p.cle) ? d : 0); lo = Math.min(lo, y); hi = Math.max(hi, y); });
                  const isS = !!listes.get(id).S, nt = lo - (isS ? mHaut.get(id) : 22), nb = hi + (isS ? mBas.get(id) : 22);
                  if (nt < hautDe.get(id) - 0.5 || nb > basDe.get(id) + 0.5) { if (heurte(id, nt, nb)) return false;
                    const x = xDe.get(id), w = largeurDe(id), zt1 = nt, zb1 = hautDe.get(id), zt2 = basDe.get(id), zb2 = nb;
                    if (sgs().some(sg => !enMouvement(sg) && sg.ia !== id && sg.ib !== id && sg.x1 > x + 2 && sg.x0 < x + w - 2 && ((sg.y > zt1 + 2 && sg.y < zb1 - 2) || (sg.y > zt2 + 2 && sg.y < zb2 - 2)))) return false; }
                  bornes.set(id, { nt, nb }); }
                return true; };
              let mag = Math.abs(dy); while (mag >= 2 * PRH && !tient(mag)) mag = Math.floor(mag / 2);
              if (mag < 2 * PRH) return false; const d = signe * mag;
              cote.forEach(it => yBroche.set(H + SEP + it.k, yB(H, it.k) + d)); mv.forEach(m => yBroche.set(m.id + SEP + m.cle, yB(m.id, m.cle) + d));
              bornes.forEach((b2, id) => { hautDe.set(id, b2.nt); basDe.set(id, b2.nb); }); return true; };
            const reduit = T.gp - PRH;
            fait = dessus.length <= dessous.length
              ? (essai(dessus, reduit) || essai(dessous, -reduit) || essaiBroches(dessus, reduit) || essaiBroches(dessous, -reduit))
              : (essai(dessous, -reduit) || essai(dessus, reduit) || essaiBroches(dessous, -reduit) || essaiBroches(dessus, reduit));
            if (fait) break; }
          if (!fait) break; bouge = true; }
        if (bouge) rebord.add(H); });
      rebord.forEach(B => { let lo = Infinity, hi = -Infinity; chaqueBroche(B, p => { const y = yB(B, p.cle); lo = Math.min(lo, y); hi = Math.max(hi, y); });
        if (isFinite(lo)) { const isS = !!listes.get(B).S; hautDe.set(B, Math.max(hautDe.get(B), lo - (isS ? mHaut.get(B) : 22))); basDe.set(B, Math.min(basDe.get(B), hi + (isS ? mBas.get(B) : 22))); } }); };
    for (let tour = 0; tour < 4; tour++) { const a = detente(); const b = pousser(); const c = permuter(); recollerPastilles(); if (!a && !b && !c) break; }
    condenser(); retreindre(); detente(); permuter(); recollerPastilles();
    // un corps fait l'empan de ses bornes plus ses marges, et pas plus
    tous.forEach(id => { if (!estPastille(id)) recalerBords(id); });
    pastilles.forEach(sp => { sp.y1 = hautDe.get(sp.id); sp.y2 = basDe.get(sp.id); });
    ids.forEach(id => clesListes(id).forEach(lid => liste(id, lid).sort((a, b) => yB(id, a.cle) - yB(id, b.cle))));
  }


  /* ===== 9. LES BLOCS ET LES LIAISONS, PRÊTS À DESSINER ================== */
  // de quel côté chaque borne reçoit ses fils : ce que le routeur tracera
  const cotesDe = new Map();
  lk.forEach((l, li) => { if (shunts.has(li)) return; const A = bouts.get(li + ':A'), B = bouts.get(li + ':B');
    if (A.nom === B.nom && A.cle === B.cle) return;
    [[A, B], [B, A]].forEach(([u, v]) => { const k = nid(u.nom, u.cle) + SEP + u.cle;
      (cotesDe.get(k) || cotesDe.set(k, new Set()).get(k)).add(flancDuBout(u.nom, u.cle, v.nom, v.cle)); }); });
  /* `assembler` lit l'état courant (ordonnées, bords, abscisses) et rend ce
     que le routeur et le dessin attendent ; la recherche locale l'appelle à
     chaque geste, le placement une dernière fois à la fin. */
  const assembler = () => {
    pastilles.forEach(sp => { sp.y1 = hautDe.get(sp.id); sp.y2 = basDe.get(sp.id); });
    ids.forEach(id => clesListes(id).forEach(lid => liste(id, lid).sort((a, b) => yB(id, a.cle) - yB(id, b.cle))));
    let yMin = Infinity, yMax = -Infinity;
    ids.forEach(id => { yMin = Math.min(yMin, hautDe.get(id)); yMax = Math.max(yMax, basDe.get(id)); });
    if (!isFinite(yMin)) { yMin = HAUT_PAGE; yMax = HAUT_PAGE + 200; }
    const comps = [], compDe = new Map();
    for (const id of ids) { const N = noeuds.get(id); const x = xDe.get(id), haut = hautDe.get(id), bas = basDe.get(id); const ls = listes.get(id);
      const parCle = new Map(); const rangs = {};
      clesListes(id).forEach(lid => { rangs[lid] = liste(id, lid).map(p => { const py = yBroche.get(id + SEP + p.cle); parCle.set(p.cle, { y: py });
        const c = cotesDe.get(id + SEP + p.cle) || new Set();
        // une prise de coupure a un fil de chaque côté de chaque contact, par nature
        return { etiq: p.etiq, y: py, dir: (estCoupure(N.nom) || (c.has('L') && c.has('R'))) ? 0 : (c.has('R') ? 1 : (c.has('L') ? -1 : 0)) }; }); });
      const tag = estPastille(id);
      const c = { name: N.nom, id, x, y: haut, w: largeurDe(id), h: bas - haut, col: colonneDe.get(id),
        kind: tag ? 'tag' : (ls.S ? 'strip' : 'equip'), lw: tag ? 0 : STRIPW, rw: tag ? 0 : STRIPW, rangs, parCle, rail: estRail(N.nom) };
      comps.push(c); compDe.set(id, c); if (!compDe.has(N.nom)) compDe.set(N.nom, c); }
    const links = lk.map((l, li) => { const A = bouts.get(li + ':A'), B = bouts.get(li + ':B'); const ia = nid(A.nom, A.cle), ib = nid(B.nom, B.cle);
      const sA = flancDuBout(A.nom, A.cle, B.nom, B.cle), sB = flancDuBout(B.nom, B.cle, A.nom, A.cle); const cA = compDe.get(ia), cB = compDe.get(ib);
      return { i: li, ...l, boucle: l.de === l.vers && l.borneDe === l.borneVers, shunt: shunts.has(li),
        epA: { x: sA === 'R' ? cA.x + cA.w : cA.x, y: cA.parCle.get(A.cle).y, ch: goulotteDuBout(ia, sA), stub: sA === 'R' ? 'L' : 'R' },
        epB: { x: sB === 'R' ? cB.x + cB.w : cB.x, y: cB.parCle.get(B.cle).y, ch: goulotteDuBout(ib, sB), stub: sB === 'R' ? 'L' : 'R' } }; });
    // le cadre se cale sur les blocs dessinés, marges proportionnées, réserve pour le cartouche
    const cx0 = Math.min(...comps.map(c => c.x)), cx1 = Math.max(...comps.map(c => c.x + c.w));
    const cw0 = cx1 - cx0, ch0 = yMax - yMin, resv = 30;
    const mx = Math.max(50, Math.min(150, cw0 * 0.07)), mt = Math.max(50, Math.min(150, ch0 * 0.07)), mb = Math.max(95, Math.min(150, ch0 * 0.07));
    const bbox = { x: cx0 - resv - mx, y: yMin - mt, w: (cx1 + resv + mx) - (cx0 - resv - mx), h: (yMax + mb) - (yMin - mt) };
    // on tend vers le format A3 sans jamais ajouter plus d'un tiers de vide
    const A3 = (cw0 / Math.max(1, ch0) < 1) ? (1 / 1.414) : 1.414, GONFLE = 1.35, r0 = bbox.w / bbox.h;
    if (r0 < A3) { const nw = Math.min(bbox.h * A3, bbox.w * GONFLE); if (nw > bbox.w) { bbox.x -= (nw - bbox.w) / 2; bbox.w = nw; } }
    else if (r0 > A3) { const nh = Math.min(bbox.w / A3, bbox.h * GONFLE); if (nh > bbox.h) { bbox.y -= (nh - bbox.h) / 2; bbox.h = nh; } }
    // l'ordre des bornes de chaque connecteur, pour le rejouer au solveur
    const ordres = new Map(lesRuns().map(r => [r.id + '|' + r.lid + '|' + r.nom, r.cles.slice().sort((a, b) => yB(r.id, a) - yB(r.id, b))]));
    return { comps, links, bbox, compDe, ordres, geom: { colonnes, colonneDe, colX, colW, chW, nCols, yMin, yMax, pastilles, rangees: SERP > 0 ? nRang : 0 } };
  };

  /* ===== 10. RECHERCHE LOCALE AU ROUTAGE RÉEL ============================ */
  if (opt.affiner && ids.length < 40) affinerAuRoutage({ tous, noeuds, lesRuns, auPas, estPastille, shunts, lk, bouts, nid, partenaires, colonneDe, serpentin: SERP > 0,
    yB, yBroche, hautDe, basDe, xDe, largeurDe, glisser, heurte, recollerPastilles, recaserPastilles, pastilles, assembler });

  /* ===== 11. TASSEMENT, ÎLOTS, RANGÉES =================================== */
  // toute bande vide sur toute la largeur se referme à un petit interstice
  { const GAPMIN = 44; const evs = ids.map(id => ({ t: hautDe.get(id), b: basDe.get(id) })).concat(pastilles.map(sp => ({ t: sp.y1, b: sp.y2 }))).sort((a, b) => a.t - b.t);
    const occ = []; evs.forEach(e => { const L = occ[occ.length - 1]; if (L && e.t <= L.b + GAPMIN) L.b = Math.max(L.b, e.b); else occ.push({ t: e.t, b: e.b }); });
    const moves = []; let cum = 0; for (let i = 1; i < occ.length; i++) { const gap = occ[i].t - occ[i - 1].b; if (gap > GAPMIN) { cum += gap - GAPMIN; moves.push({ from: occ[i].t, dy: cum }); } }
    if (moves.length) { const dyDe = y => { let d = 0; for (const m of moves) { if (y >= m.from - 0.1) d = m.dy; else break; } return d; };
      ids.forEach(id => { const d = dyDe(hautDe.get(id)); if (d) glisser(id, -d); });
      pastilles.forEach(sp => { const d = dyDe(sp.y1); if (d) { sp.y1 -= d; sp.y2 -= d; } }); } }
  // îlots indépendants : en étagères à droite de l'îlot principal, au format de la page
  { const par = new Map(ids.map(n => [n, n])); const find = k => { while (par.get(k) !== k) { par.set(k, par.get(par.get(k))); k = par.get(k); } return k; };
    ids.forEach(id => chaqueBroche(id, p => (partenaires.get(id + SEP + p.cle) || []).forEach(q => { if (par.has(q.id)) { const a = find(id), b = find(q.id); if (a !== b) par.set(a, b); } })));
    const grp = new Map(); ids.forEach(n => { const r = find(n); (grp.get(r) || grp.set(r, []).get(r)).push(n); });
    const cadre = g => { let x0 = 1e18, y0 = 1e18, x1 = -1e18, y1 = -1e18;
      g.forEach(n => { x0 = Math.min(x0, xDe.get(n)); x1 = Math.max(x1, xDe.get(n) + largeurDe(n)); y0 = Math.min(y0, hautDe.get(n)); y1 = Math.max(y1, basDe.get(n)); });
      return { x0, y0, w: x1 - x0, h: y1 - y0 }; };
    // on ne déplace un îlot que si tous ses fils internes sont droits : une translation les garde droits
    const sur = g => { const S = new Set(g); for (const id of g) for (const p of noeuds.get(id).broches) { const py = yB(id, p.cle);
      for (const q of (partenaires.get(id + SEP + p.cle) || [])) { if (!S.has(q.id)) continue; const qy = yB(q.id, q.cle); if (py == null || qy == null || Math.abs(py - qy) > 1.5) return false; } } return true; };
    const items = [], fixes = []; const all = [...grp.values()]; let bi = 0; all.forEach((g, i) => { if (g.length > all[bi].length) bi = i; });
    all.forEach((g, i) => { if (i === bi || !sur(g)) fixes.push(g); else items.push(g); });
    if (items.length >= 3) {
      items.forEach(g => { if (g.length < 2 || g.length > 3) return; const devs = g.filter(n => !noeuds.get(n).reglette), frs = g.filter(n => noeuds.get(n).reglette);
        if (devs.length !== 1 || !frs.length) return; const d = devs[0]; const dx0 = xDe.get(d), dw = largeurDe(d); let ro = dx0 + dw + 30, lo = dx0 - 30;
        frs.slice().sort((a, b) => xDe.get(a) - xDe.get(b)).forEach(f => { const fw = largeurDe(f); if (xDe.get(f) >= dx0 + dw) { xDe.set(f, ro); ro += fw + 26; } else { lo -= fw; xDe.set(f, lo); lo -= 26; } }); });
      const PAD = 16;
      const cleDe = g => { let m = 1e15; g.forEach(n => { const N = noeuds.get(n); if (N.reglette) return; const v = parseFloat(N.nom); if (!isNaN(v)) m = Math.min(m, v); }); return m; };
      const rects = items.map(g => { const b = cadre(g); return { g, b, w: b.w + 2 * PAD, h: b.h + 2 * PAD, k: cleDe(g) }; });
      rects.sort((a, b) => (b.h - a.h) || (a.k - b.k));
      let MB = null; fixes.forEach(g => { const b = cadre(g); MB = MB ? { x0: Math.min(MB.x0, b.x0), y0: Math.min(MB.y0, b.y0), x1: Math.max(MB.x1, b.x0 + b.w), y1: Math.max(MB.y1, b.y0 + b.h) } : { x0: b.x0, y0: b.y0, x1: b.x0 + b.w, y1: b.y0 + b.h }; });
      // la première étagère se remplit sous l'îlot principal, les suivantes à sa droite
      const ranger = capH => { const pos = []; let x = MB.x0, y = MB.y1, cw = MB.x1 - MB.x0 + 34, ybot = MB.y1, xr = MB.x1;
        rects.forEach(r => { if (y > MB.y0 && y + r.h > MB.y0 + capH) { x += cw; cw = 0; y = MB.y0; } pos.push({ r, x, y }); cw = Math.max(cw, r.w); ybot = Math.max(ybot, y + r.h); xr = Math.max(xr, x + r.w); y += r.h; });
        return { pos, W: xr - MB.x0, H: Math.max(MB.y1, ybot) - MB.y0 }; };
      const mh = Math.max(MB.y1 - MB.y0, 500); const cands = [0.8, 1, 1.3, 1.7, 2.2, 2.9].map(f => ranger(mh * f));
      const cout = c => Math.abs(Math.log((Math.max(c.W, 60) / Math.max(c.H, 60)) / 1.414));
      const P = cands.reduce((m, c) => cout(c) < cout(m) ? c : m, cands[0]);
      P.pos.forEach(({ r, x, y }) => { const dx = (x + PAD) - r.b.x0, dy = (y + PAD) - r.b.y0; if (!dx && !dy) return;
        r.g.forEach(n => { xDe.set(n, xDe.get(n) + dx); glisser(n, dy); });
        pastilles.forEach(sp => { if (r.g.includes(sp.id)) { sp.y1 += dy; sp.y2 += dy; } }); }); } }
  // serpentin : les rangées se remettent l'une sous l'autre par translation RIGIDE
  if (SERP > 0 && nRang > 1) { const parRangee = Array.from({ length: nRang }, () => []); ids.forEach(n => parRangee[rangeeDe.get(n) || 0].push(n));
    let y = HAUT_PAGE;
    parRangee.forEach((grp, r) => { if (!grp.length) return; let lo = Infinity, hi = -Infinity; grp.forEach(id => { lo = Math.min(lo, hautDe.get(id)); hi = Math.max(hi, basDe.get(id)); });
      if (!isFinite(lo)) return; const dy = y - lo; if (dy) grp.forEach(id => glisser(id, dy)); y += (hi - lo) + ecartRangees(r); });
    pastilles.forEach(sp => { sp.y1 = hautDe.get(sp.id); sp.y2 = basDe.get(sp.id); }); }
  return assembler();
}

/* ===========================================================================
   LA RECHERCHE LOCALE AU ROUTAGE RÉEL. L'estimation du placement ne voit ni
   le piquage qui rend un fil droit, ni le croisement que crée une descente ;
   le routeur, si. Sur un dessin de taille de travail, chaque geste local se
   juge donc en routant pour de vrai : l'ordre des bornes d'un connecteur
   (toutes les permutations d'un petit, les échanges deux à deux d'un grand),
   le glissement d'un bloc en face d'un partenaire, l'échange de deux blocs
   voisins d'une colonne. Un geste est gardé s'il gagne un fil droit sans en
   perdre, ou un croisement à droiture égale — jamais s'il met un fil dans
   un bloc ou un bloc sur une pastille.
   =========================================================================== */
function affinerAuRoutage(P) {
  const { tous, noeuds, lesRuns, auPas, estPastille, shunts, lk, bouts, nid, partenaires, colonneDe, serpentin,
    yB, yBroche, hautDe, basDe, xDe, largeurDe, glisser, heurte, recollerPastilles, recaserPastilles, pastilles, assembler } = P;
  const pastillesEcrasees = () => { let n = 0; tous.forEach(p => { if (!estPastille(p)) return;
    tous.forEach(o => { if (!estPastille(o) && xDe.get(p) < xDe.get(o) + largeurDe(o) && xDe.get(o) < xDe.get(p) + largeurDe(p)
      && hautDe.get(p) < basDe.get(o) && hautDe.get(o) < basDe.get(p)) n++; }); }); return n; };
  const juger = () => { const L = assembler(); const R = router(L); const fils = R.fils.filter(w => !w.shunt);
    return { sain: filsDansBlocs(fils, L.comps.filter(c => c.kind !== 'tag')) === 0, ecrasees: pastillesEcrasees(),
      droits: compterDroits(fils), croisements: compterCroisements(fils, R.barrettes) }; };
  const bat = (a, b) => a.sain && a.ecrasees <= b.ecrasees && (a.droits > b.droits || (a.droits === b.droits && a.croisements < b.croisements));
  let cur = juger();
  /* un geste qui décolle une borne de son partenaire perd un fil droit à coup
     sûr : on ne route que les gestes qui n'en décollent pas plus qu'ils n'en
     recollent — le routeur tranche le reste (piquages, croisements) */
  const collee = (id, cle, y) => (partenaires.get(id + SEP + cle) || []).some(q => q.id !== id && !estPastille(q.id) && Math.abs(yB(q.id, q.cle) - y) < 0.6);
  const collees = (id, yDe) => { let n = 0; noeuds.get(id).broches.forEach(p => { if (collee(id, p.cle, yDe(p.cle))) n++; }); return n; };
  // les pastilles collées au flanc d'un bloc qui bouge : on les recase, et on sait revenir
  const photoPastilles = () => ({ n: pastilles.length, xs: new Map(tous.filter(estPastille).map(id => [id, xDe.get(id)])) });
  const revenirPastilles = ph => { pastilles.length = ph.n; ph.xs.forEach((x, id) => xDe.set(id, x)); };
  const apresBouge = () => { recollerPastilles(); recaserPastilles(); };
  // --- l'ordre des bornes d'un connecteur : les ordonnées du groupe se redistribuent
  const pontees = new Map();               // id -> paires de bornes pontées, qui restent voisines
  lk.forEach((l, li) => { if (!shunts.has(li)) return; const A = bouts.get(li + ':A'), B = bouts.get(li + ':B');
    const id = nid(A.nom, A.cle); (pontees.get(id) || pontees.set(id, []).get(id)).push([A.cle, B.cle]); });
  const voisinesOK = (r, ordre) => (pontees.get(r.id) || []).every(([a, b]) => { const i = ordre.indexOf(a), j = ordre.indexOf(b); return i < 0 || j < 0 || Math.abs(i - j) === 1; });
  const auPasOK = r => { const ys = r.cles.map(c => yB(r.id, c)).sort((a, b) => a - b); return ys.every((y, j) => !j || Math.abs(y - ys[j - 1] - PRH) < 0.5); };
  const runsDe = (id, cles) => lesRuns().filter(r => r.id === id && r.cles.some(c => cles.includes(c)));
  const poserOrdre = (r, ordre) => { const ys = r.cles.map(c => yB(r.id, c)).sort((a, b) => a - b);
    ordre.forEach((c, j) => yBroche.set(r.id + SEP + c, ys[j])); r.cles = ordre.slice(); recollerPastilles(); };
  const essayerOrdre = (r, ordre) => { const avant = r.cles.slice(); if (!voisinesOK(r, ordre)) return false;
    const ys = r.cles.map(c => yB(r.id, c)).sort((a, b) => a - b), apres = new Map(ordre.map((c, j) => [c, ys[j]]));
    const yDe = c => apres.has(c) ? apres.get(c) : yB(r.id, c);
    if (collees(r.id, yDe) < collees(r.id, c => yB(r.id, c))) return false;
    poserOrdre(r, ordre); if (!runsDe(r.id, ordre).every(auPasOK)) { poserOrdre(r, avant); return false; }
    const j = juger(); if (bat(j, cur)) { cur = j; return true; } poserOrdre(r, avant); return false; };
  const permutations = a => a.length <= 1 ? [a] : a.flatMap((x, i) => permutations([...a.slice(0, i), ...a.slice(i + 1)]).map(q => [x, ...q]));
  const ordres = () => { let any = false;
    lesRuns().forEach(r => { if (auPas(r.id) || r.cles.length < 2) return; r.cles.sort((a, b) => yB(r.id, a) - yB(r.id, b));
      if (r.cles.length <= 4) { permutations(r.cles.slice()).forEach(q => { if (q.every((c, j) => c === r.cles[j])) return; if (essayerOrdre(r, q)) any = true; }); return; }
      for (let i = 0; i < r.cles.length; i++) for (let j = i + 1; j < r.cles.length; j++) {
        const o = r.cles.slice(); const t = o[i]; o[i] = o[j]; o[j] = t; if (essayerOrdre(r, o)) any = true; } });
    return any; };
  // --- un bloc glisse en face d'un partenaire, du plus court glissement au plus long
  const glissements = () => { if (serpentin) return false; let any = false;
    tous.forEach(id => { if (estPastille(id)) return; const rs = new Set();
      noeuds.get(id).broches.forEach(p => (partenaires.get(id + SEP + p.cle) || []).forEach(q => { if (q.id === id || estPastille(q.id) || colonneDe.get(q.id) === colonneDe.get(id)) return;
        const r = Math.round((yB(q.id, q.cle) - yB(id, p.cle)) * 2) / 2; if (Math.abs(r) > 0.6 && Math.abs(r) <= 400) rs.add(r); }));
      const c0 = collees(id, c => yB(id, c));
      for (const s of [...rs].sort((a, b) => Math.abs(a) - Math.abs(b))) { if (collees(id, c => yB(id, c) + s) < c0) continue;
        if (heurte(id, hautDe.get(id) + s, basDe.get(id) + s)) continue;
        const ph = photoPastilles(); glisser(id, s); apresBouge(); const j = juger();
        if (bat(j, cur)) { cur = j; any = true; break; } glisser(id, -s); revenirPastilles(ph); recollerPastilles(); } });
    return any; };
  // --- deux blocs voisins d'une colonne échangent leurs places
  const echanges = () => { if (serpentin) return false; let any = false;
    const cols = new Map(); tous.forEach(id => { if (estPastille(id)) return; const c = colonneDe.get(id) ?? 0; (cols.get(c) || cols.set(c, []).get(c)).push(id); });
    cols.forEach(c => { c.sort((a, b) => hautDe.get(a) - hautDe.get(b));
      for (let i = 0; i + 1 < c.length; i++) { const u = c[i], v = c[i + 1];
        const hu = basDe.get(u) - hautDe.get(u), hv = basDe.get(v) - hautDe.get(v), gap = hautDe.get(v) - basDe.get(u);
        const du = hv + gap, dv = -(hu + gap);
        if (collees(u, k => yB(u, k) + du) + collees(v, k => yB(v, k) + dv) < collees(u, k => yB(u, k)) + collees(v, k => yB(v, k))) continue;
        if (heurte(u, hautDe.get(u) + du, basDe.get(u) + du, [v]) || heurte(v, hautDe.get(v) + dv, basDe.get(v) + dv, [u])) continue;
        const ph = photoPastilles(); glisser(u, du); glisser(v, dv); apresBouge(); const j = juger();
        if (bat(j, cur)) { cur = j; any = true; c[i] = v; c[i + 1] = u; } else { glisser(u, -du); glisser(v, -dv); revenirPastilles(ph); recollerPastilles(); } } });
    return any; };
  for (let passe = 0; passe < 3; passe++) { const a = ordres(); const b = glissements(); const c = echanges(); if (!a && !b && !c) break; }
  return cur;
}

/* Largeur réellement occupée par les pistes de chaque goulotte, pour resserrer
   les colonnes au second tour. */
function goulottesOccupees(L) {
  const g = L.geom; if (!g.colX.length) return null;
  const gx = i => i === 0 ? (g.colX[0] - g.chW[0]) : g.colX[i - 1] + g.colW[i - 1];
  const maxOff = new Array(g.nCols + 1).fill(0);
  L.routage.fils.forEach(w => { for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1];
    if (Math.abs(a.x - b.x) > 0.5) continue; const x = a.x;
    for (let ch = 0; ch <= g.nCols; ch++) { const x0 = gx(ch); if (x >= x0 - 2 && x <= x0 + g.chW[ch] + 2) { maxOff[ch] = Math.max(maxOff[ch], x - x0); break; } } } });
  return maxOff.map((o, i) => Math.max(54, Math.min(g.chW[i], o + 26)));
}

/* ===========================================================================
   LE JUGEMENT, partagé par toutes les étapes du concours. Un dessin qui met
   un fil dans un bloc ne gagne jamais ; un dessin qui tient sur une feuille
   bat un dessin qui n'y tient pas ; ensuite la droiture décide, puis les
   croisements, puis le format, puis la longueur des barrettes.
   =========================================================================== */
const A3 = 1.414;
function jugeDePlacement() {
  const emprise = L => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    L.comps.forEach(c => { x0 = Math.min(x0, c.x); x1 = Math.max(x1, c.x + c.w); y0 = Math.min(y0, c.y); y1 = Math.max(y1, c.y + c.h); });
    return { w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) }; };
  const filsDansBloc = L => filsDansBlocs(L.routage.fils, L.comps);
  /* l'encombrement : ce qui limite l'échelle d'impression sur une feuille au
     format A, posée dans le sens qui l'arrange (paysage ou portrait) ; à
     encombrement égal, la plus petite emprise a le moins de vide */
  // les goulottes sont taillées pour tous leurs fils, mais les fils droits ne
  // prennent pas de piste : on juge la largeur qu'aura le dessin resserré
  const largeurResserree = (L, e) => { const g = L.geom, occ = goulottesOccupees(L); if (!occ) return e.w;
    let d = 0; for (let i = 1; i < g.nCols; i++) d += Math.max(0, g.chW[i] - occ[i]); return e.w - d; };
  const juger = L => { if (!L.jugement) { const e = emprise(L); e.w = largeurResserree(L, e); const r = e.w / e.h; L.jugement = {
      sain: filsDansBloc(L) === 0, tient: r <= 2.2 && r >= 0.45, droits: compterDroits(L.routage.fils),
      croisements: compterCroisements(L.routage.fils, L.routage.barrettes),
      encombrement: Math.min(Math.max(e.w / A3, e.h), Math.max(e.w, e.h / A3)), surface: e.w * e.h,
      peignes: L.routage.barrettes.reduce((t, b) => t + Math.abs(b.y2 - b.y1), 0) }; } return L.jugement; };
  /* un fil droit vaut un croisement évité : depuis que les réglettes et les
     connecteurs sont compacts, un fil droit de plus s'achète souvent en
     désordonnant une colonne, et l'œil voit d'abord les croisements */
  const bat = (L, ref) => { if (!ref) return true; const a = juger(L), b = juger(ref);
    if (a.sain !== b.sain) return a.sain; if (a.tient !== b.tient) return a.tient;
    const na = a.droits - a.croisements, nb = b.droits - b.croisements;
    if (na !== nb) return na > nb; if (a.croisements !== b.croisements) return a.croisements < b.croisements;
    if (Math.abs(a.encombrement - b.encombrement) > 0.01 * b.encombrement) return a.encombrement < b.encombrement;
    if (Math.abs(a.surface - b.surface) > 0.01 * b.surface) return a.surface < b.surface;
    return a.peignes < b.peignes; };
  return { juger, bat, emprise };
}

/* ===========================================================================
   LE CONCOURS : sept graines, routées pour de vrai, la meilleure au jugement
   gagne ; puis les goulottes se resserrent et les blocs se condensent si ça
   ne perd rien.
   Enfin le SECOURS : un dessin en ruban (plus de 2,2 fois plus large que
   haut) se replie en rangées, sans plier plus d'un fil par report.
   =========================================================================== */
function meilleurPlacement(liaisons) {
  const G = construireGraphe(liaisons);
  if (!G.ids.length) return null;
  const nB = G.ids.length;
  const graines = nB > 600 ? [0] : (nB <= 120 ? [0, 'loin', 1, 2, 3, 4, 5] : (nB <= 400 ? [0, 'loin', 1, 2, 3] : [0, 'loin']));
  const essayer = o => { const L = placer(G, o); L.routage = router(L); return L; };
  const { juger, bat, emprise } = jugeDePlacement();
  // chaque graine, feuilles à droite puis équilibrées
  let best = null, bOpt = {};
  const candidats = []; graines.forEach(g => { candidats.push({ graine: g }); if (nB <= 120) candidats.push({ graine: g, equilibrer: true }); });
  // un hub à huit feuilles ou plus : on essaie aussi ses feuilles sur deux colonnes
  const PROFONDEUR = 8;
  if (nB <= 120 && G.ids.some(n => G.feuillesDe(n).length >= PROFONDEUR)) candidats.slice().forEach(o => candidats.push({ ...o, profondeur: PROFONDEUR }));
  candidats.forEach(o => { const L = essayer(o); if (bat(L, best)) { best = L; bOpt = o; } });
  // resserrage : les goulottes reprennent la largeur que les pistes occupent
  // vraiment (le jugement l'anticipait) ; gardé s'il ne perd rien
  const nePerdRien = (L, ref) => { const a = juger(L), b = juger(ref); return a.sain && a.droits >= b.droits && a.croisements <= b.croisements; };
  let bGoulottes = null;
  { const fix = goulottesOccupees(best);
    if (fix) { const L2 = essayer({ ...bOpt, goulottes: fix }); if (nePerdRien(L2, best)) { best = L2; bGoulottes = fix; } } }
  // condensation par glissement de broches : gardée si aucun fil droit n'est
  // perdu et pas plus de croisements — elle rend les blocs compacts
  bOpt = { ...bOpt, goulottes: bGoulottes };
  { const L3 = essayer({ ...bOpt, condenser: true }); if (nePerdRien(L3, best)) { best = L3; bOpt.condenser = true; } }
  // secours : serpentin
  const e0 = emprise(best), r0 = e0.w / e0.h, nc = best.geom.nCols;
  if (r0 > 2.2 && nc >= 4) {
    const R0 = Math.max(2, Math.min(6, Math.round(Math.sqrt(r0 / A3)))); const s0 = juger(best).droits;
    const vus = new Set();
    [R0, R0 + 1, R0 + 2, R0 - 1].filter(k => k >= 2).forEach(k => { const W = Math.ceil(nc / k); if (W < 2 || vus.has(W)) return; vus.add(W);
      let L = null; try { L = essayer({ ...bOpt, serpentin: W }); } catch (e) { return; }
      if (L && juger(L).droits >= s0 - k && bat(L, best)) { best = L; bOpt.serpentin = W; } });
  }
  /* affinage au routage réel, sur le vainqueur : les gestes locaux que
     l'estimation ne voit pas ; puis l'ordre des connecteurs qu'il a trouvé se
     rejoue au solveur d'ordonnées, qui peut alors redresser des fils */
  if (nB < 40) {
    const L4 = essayer({ ...bOpt, affiner: true }); if (bat(L4, best)) best = L4;
    const L5 = essayer({ ...bOpt, affiner: true, ordres: best.ordres }); if (bat(L5, best)) best = L5;
  }
  return best;
}
