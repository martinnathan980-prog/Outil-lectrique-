/* ===========================================================================
   03 — LE GRAPHE
   Des liaisons on tire les objets que le placement manipule :
     · les NŒUDS : un équipement entier, ou un bornier — entier tant que le
       dessin est de taille de travail (≤ 60 repères), sinon découpé en un
       fragment par destination pour que ses départs restent courts ; une
       PASTILLE (masse, rail) par point de raccordement ; un morceau de
       barrette réduit à une borne et un fil est une pastille aussi ;
     · les BROCHES de chaque nœud, identifiées par leur numéro de borne ;
     · les PARTENAIRES de chaque broche (à qui elle est reliée) ;
     · l'ADJACENCE entre nœuds, pondérée par le nombre de fils.
   Tout est indexé par des chaînes : clé de broche = id + SEP + cle.
   =========================================================================== */
'use strict';

const SEP = '\u0001';        // sépare un id de nœud d'une clé de broche
const FRAG = '\u0002';       // sépare un repère du numéro de son fragment

/* Un rail (L1, N, PE, 0V…) n'est pas un équipement : c'est un potentiel, dont
   chaque point de raccordement se dessine en pastille près de sa borne. Une
   masse est un potentiel de la même espèce : son symbole se répète au pied de
   chaque borne qu'elle sert, le fil reste court. */
const estRail = nom => RAIL_RE.test(String(nom || '').trim());
const estPotentiel = nom => estRail(nom) || estMasse(nom);
/* Ce qui se place en RÉGLETTE (une pile de bornes, un fil de chaque côté) :
   les potentiels, les prises de coupure et les barrettes. */
const enReglette = nom => estPotentiel(nom) || estBornier(nom);

function construireGraphe(liaisons) {
  const lk = liaisons.filter(liaisonComplete);
  const noms = []; const vus = new Set();
  lk.forEach(l => [l.de, l.vers].forEach(n => { if (!vus.has(n)) { vus.add(n); noms.push(n); } }));

  // --- broches par repère : une par numéro de borne ; un potentiel en reçoit
  //     une par fil (chaque point de raccordement est une pastille distincte)
  const broches = new Map();
  const B0 = n => { if (!broches.has(n)) broches.set(n, { liste: [], parEtiquette: new Map(), cnt: 0 }); return broches.get(n); };
  const bouts = new Map();          // 'li:A' / 'li:B' -> { nom, cle }
  lk.forEach((l, li) => {
    [['de', 'borneDe', 'pnDe', 'A'], ['vers', 'borneVers', 'pnVers', 'B']].forEach(([a, ab, apn, tag]) => {
      const nom = l[a]; const P = B0(nom); const potentiel = estPotentiel(nom);
      const etiq = estRail(nom) ? l[apn] : l[ab];
      let cle;
      if (potentiel) { cle = 'r' + (P.cnt++); P.liste.push({ cle, etiq }); }
      else if (etiq && P.parEtiquette.has(etiq)) cle = P.parEtiquette.get(etiq);
      else { cle = etiq ? ('n:' + etiq) : ('p' + (P.cnt++)); if (etiq) P.parEtiquette.set(etiq, cle); P.liste.push({ cle, etiq }); }
      bouts.set(li + ':' + tag, { nom, cle });
    });
  });

  // --- partenaires bruts par broche (sert au découpage des borniers)
  const partBruts = new Map();
  lk.forEach((l, li) => { const A = bouts.get(li + ':A'), B = bouts.get(li + ':B');
    (partBruts.get(A.nom + SEP + A.cle) || partBruts.set(A.nom + SEP + A.cle, []).get(A.nom + SEP + A.cle)).push(B);
    (partBruts.get(B.nom + SEP + B.cle) || partBruts.set(B.nom + SEP + B.cle, []).get(B.nom + SEP + B.cle)).push(A); });
  const degre = new Map();
  lk.forEach(l => { degre.set(l.de, (degre.get(l.de) || 0) + 1); degre.set(l.vers, (degre.get(l.vers) || 0) + 1); });

  // --- nœuds
  const noeuds = new Map(); const noeudDeBroche = new Map();
  const entier = noms.length <= 60;
  for (const n of noms) { const P = B0(n);
    if (estPotentiel(n)) {
      // une pastille par point de raccordement : c'est la borne d'en face qui la place
      P.liste.forEach((p, i) => { const id = n + FRAG + i;
        noeuds.set(id, { id, nom: n, reglette: true, broches: [p] }); noeudDeBroche.set(n + SEP + p.cle, id); });
      continue; }
    if (estBarrette(n)) {
      // une BARRETTE se pose par PAQUET : les bornes pontées ensemble font un module, et chaque module se dessine
      // là où il sert, aussi petit que possible — une barrette de dix bornes n'est pas une colonne de dix bornes
      const chef = new Map(P.liste.map(p => [p.cle, p.cle])); const trouver = c => { while (chef.get(c) !== c) c = chef.get(c); return c; };
      lk.forEach((l, li) => { if (l.de !== n || l.vers !== n) return; const A = bouts.get(li + ':A'), B = bouts.get(li + ':B'); const ra = trouver(A.cle), rb = trouver(B.cle); if (ra !== rb) chef.set(ra, rb); });
      const paquets = new Map(); P.liste.forEach(p => { const r = trouver(p.cle); (paquets.get(r) || paquets.set(r, []).get(r)).push(p); });
      let gi = 0;
      for (const pins of paquets.values()) { const id = paquets.size === 1 ? n : n + FRAG + (gi++);
        // un morceau réduit à UNE borne et UN fil vers un bloc : rien après lui — il se colle à la borne qu'il sert, comme
        // une masse (une PASTILLE), au lieu d'occuper une colonne ; à plusieurs bornes ou plusieurs partenaires, il reste un bloc
        const ps = pins.length === 1 ? (partBruts.get(n + SEP + pins[0].cle) || []) : [];
        const pastille = ps.length === 1 && ps[0].nom !== n && !estPotentiel(ps[0].nom);
        noeuds.set(id, { id, nom: n, reglette: true, broches: pins, pastille }); pins.forEach(p => noeudDeBroche.set(n + SEP + p.cle, id)); }
      continue; }
    if (!(enReglette(n) && !entier)) {
      noeuds.set(n, { id: n, nom: n, reglette: enReglette(n), broches: P.liste.slice() });
      P.liste.forEach(p => noeudDeBroche.set(n + SEP + p.cle, n)); continue; }
    // un gros bornier se coupe près de l'équipement le plus LOCAL (plus petit
    // fan-out), pas près de la grosse source
    const groupes = new Map();
    P.liste.forEach(p => { const ps = partBruts.get(n + SEP + p.cle) || [];
      const g = ps.length ? ps.reduce((b, q) => ((degre.get(q.nom) || 0) < (degre.get(b.nom) || 0) ? q : b), ps[0]).nom : '~';
      (groupes.get(g) || groupes.set(g, []).get(g)).push(p); });
    let gi = 0;
    for (const [, pins] of groupes) { const id = n + FRAG + (gi++);
      noeuds.set(id, { id, nom: n, reglette: true, broches: pins });
      pins.forEach(p => noeudDeBroche.set(n + SEP + p.cle, id)); }
  }
  const ids = [...noeuds.keys()];
  const nid = (nom, cle) => noeudDeBroche.get(nom + SEP + cle) || nom;

  // --- partenaires au niveau nœud, adjacence
  const partenaires = new Map();
  const adj = new Map(ids.map(n => [n, new Map()]));
  lk.forEach((l, li) => { const A = bouts.get(li + ':A'), B = bouts.get(li + ':B');
    const ia = nid(A.nom, A.cle), ib = nid(B.nom, B.cle);
    (partenaires.get(ia + SEP + A.cle) || partenaires.set(ia + SEP + A.cle, []).get(ia + SEP + A.cle)).push({ id: ib, cle: B.cle });
    (partenaires.get(ib + SEP + B.cle) || partenaires.set(ib + SEP + B.cle, []).get(ib + SEP + B.cle)).push({ id: ia, cle: A.cle });
    if (ia === ib) return;
    adj.get(ia).set(ib, (adj.get(ia).get(ib) || 0) + 1);
    adj.get(ib).set(ia, (adj.get(ib).get(ia) || 0) + 1); });
  const degreDe = n => { let s = 0; for (const w of adj.get(n).values()) s += w; return s; };

  return { liaisons: lk, noms, noeuds, ids, bouts, nid, partenaires, adj, degreDe };
}
