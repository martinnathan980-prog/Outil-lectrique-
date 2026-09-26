/* ===========================================================================
   03 — LE GRAPHE
   Des liaisons on tire les objets que le placement manipule :
     · les NŒUDS : un équipement entier, ou un bornier — entier tant que le
       dessin est de taille de travail (≤ 60 repères), sinon découpé en un
       fragment par destination pour que ses départs restent courts ;
     · les BROCHES de chaque nœud, identifiées par leur numéro de borne ;
     · les PARTENAIRES de chaque broche (à qui elle est reliée) ;
     · l'ADJACENCE entre nœuds, pondérée par le nombre de fils.
   Tout est indexé par des chaînes : clé de broche = id + SEP + cle.
   =========================================================================== */
'use strict';

const SEP = '\u0001';        // sépare un id de nœud d'une clé de broche
const FRAG = '\u0002';       // sépare un repère du numéro de son fragment

/* Un rail (L1, N, PE, 0V…) n'est pas un équipement : c'est un potentiel, dont
   chaque point de raccordement se dessine en pastille près de sa borne. */
const estRail = nom => RAIL_RE.test(String(nom || '').trim());
/* Ce qui se place en RÉGLETTE (une pile de bornes, un fil de chaque côté) :
   les rails, les prises de coupure et les barrettes. */
const enReglette = nom => estRail(nom) || estBornier(nom);

function construireGraphe(liaisons) {
  const lk = liaisons.filter(liaisonComplete);
  const noms = []; const vus = new Set();
  lk.forEach(l => [l.de, l.vers].forEach(n => { if (!vus.has(n)) { vus.add(n); noms.push(n); } }));

  // --- broches par repère : une par numéro de borne ; un rail en reçoit une
  //     par fil (chaque point du potentiel est une pastille distincte)
  const broches = new Map();
  const B0 = n => { if (!broches.has(n)) broches.set(n, { liste: [], parEtiquette: new Map(), cnt: 0 }); return broches.get(n); };
  const bouts = new Map();          // 'li:A' / 'li:B' -> { nom, cle }
  lk.forEach((l, li) => {
    [['de', 'borneDe', 'pnDe', 'A'], ['vers', 'borneVers', 'pnVers', 'B']].forEach(([a, ab, apn, tag]) => {
      const nom = l[a]; const P = B0(nom); const rail = estRail(nom);
      const etiq = rail ? l[apn] : l[ab];
      let cle;
      if (rail) { cle = 'r' + (P.cnt++); P.liste.push({ cle, etiq }); }
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
  /* Une masse est un potentiel, pas un appareil : son symbole est petit et se
     répète au pied de chaque équipement qu'elle sert, le fil reste court. */
  const fragmente = n => estMasse(n) || (enReglette(n) && !entier);
  for (const n of noms) { const P = B0(n);
    if (!fragmente(n)) {
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
      noeuds.set(id, { id, nom: n, reglette: enReglette(n), broches: pins });
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
