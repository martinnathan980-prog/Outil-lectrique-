/* ===========================================================================
   07 — LES FOLIOS
   Un dessin qui ne tient pas sur une feuille se découpe. Les équipements
   LOCAUX (peu de voisins) se regroupent par départs, une composante n'est
   jamais coupée ; les HUBS (borniers, prises de coupure, gros fan-out) se
   répliquent sur chaque folio où ils ont un départ. Une liaison entre deux
   folios devient deux demi-liaisons vers un jeton de renvoi « ▷F3 ».
   =========================================================================== */
'use strict';

const RENVOI = /^▷F/;
const estRenvoi = n => RENVOI.test(String(n || ''));

function decouperEnFolios(liaisons, budget) {
  budget = budget || 16;
  const lk = liaisons.filter(liaisonComplete);
  const blocs = new Set(); lk.forEach(l => { blocs.add(l.de); blocs.add(l.vers); });
  const voisins = new Map([...blocs].map(n => [n, new Set()]));
  lk.forEach(l => { if (l.de === l.vers) return; voisins.get(l.de).add(l.vers); voisins.get(l.vers).add(l.de); });
  const HUB = 6;
  const partage = n => estRail(n) || estBornier(n) || voisins.get(n).size >= HUB;
  const partages = new Set([...blocs].filter(partage));
  const locaux = [...blocs].filter(n => !partages.has(n));
  const inchange = { liaisons: lk.map(l => ({ ...l })), nFolios: 1, applique: false };
  if (locaux.length <= budget) return inchange;
  // route dominante de chaque bloc local
  const routeDe = new Map();
  { const votes = new Map();
    lk.forEach(l => { const r = l.route; if (!r) return;
      [l.de, l.vers].forEach(n => { if (partages.has(n)) return; const m = votes.get(n) || votes.set(n, new Map()).get(n); m.set(r, (m.get(r) || 0) + 1); }); });
    votes.forEach((m, n) => { let br = '', bc = -1; m.forEach((c, r) => { if (c > bc) { bc = c; br = r; } }); routeDe.set(n, br); }); }
  // départs : composantes de liens local-local, sans franchir les routes ni
  // les chaînes (KM1-KM2… : mêmes noms à numéro consécutif)
  const nom = s => { const m = /^(.*?)(\d+)$/.exec(s || ''); return m ? { p: m[1], n: +m[2] } : { p: s, n: null }; };
  const chaine = l => { const A = nom(l.de), B = nom(l.vers); return A.n != null && B.n != null && A.p && A.p === B.p && Math.abs(A.n - B.n) <= 2; };
  const adj = new Map(locaux.map(n => [n, new Set()]));
  lk.forEach(l => { if (l.de === l.vers || partages.has(l.de) || partages.has(l.vers) || chaine(l)) return;
    if (adj.has(l.de) && adj.has(l.vers)) { adj.get(l.de).add(l.vers); adj.get(l.vers).add(l.de); } });
  const compDe = new Map(); let ci = 0;
  for (const s of locaux) { if (compDe.has(s)) continue; const id = ci++; compDe.set(s, id); const q = [s];
    while (q.length) { const c = q.shift(); adj.get(c).forEach(k => { if (!compDe.has(k) && (routeDe.get(k) || '') === (routeDe.get(c) || '')) { compDe.set(k, id); q.push(k); } }); } }
  const comps = new Map(); compDe.forEach((id, n) => { const e = comps.get(id) || comps.set(id, { route: routeDe.get(n) || '', noeuds: [] }).get(id); e.noeuds.push(n); });
  const ordre = [...comps.values()].sort((a, b) => a.route < b.route ? -1 : (a.route > b.route ? 1 : b.noeuds.length - a.noeuds.length));
  const folioDe = new Map(); let folio = 0, compte = 1e9, routeCourante = '\0';
  for (const c of ordre) { if (c.route !== routeCourante || compte + c.noeuds.length > budget) { folio++; compte = 0; routeCourante = c.route; }
    c.noeuds.forEach(n => folioDe.set(n, folio)); compte += c.noeuds.length; }
  if (folio <= 1) return inchange;
  // folio « maison » d'un hub : celui de la majorité de ses départs
  const maison = n => { if (folioDe.has(n)) return folioDe.get(n); const cnt = new Map();
    voisins.get(n).forEach(k => { const f = folioDe.get(k); if (f) cnt.set(f, (cnt.get(f) || 0) + 1); });
    let bf = 0, bc = 0; cnt.forEach((c, f) => { if (c > bc) { bc = c; bf = f; } }); return bf; };
  const maisonDe = new Map(); partages.forEach(n => maisonDe.set(n, maison(n)));
  const F = n => String(n);
  const renvoi = (l, versFolio, deFolio) => [
    liaison({ ...l, vers: '▷F' + versFolio, borneVers: l.vers + (l.borneVers ? ' ' + l.borneVers : ''), plan: F(deFolio) }),
    liaison({ ...l, de: '▷F' + deFolio, borneDe: l.de + (l.borneDe ? ' ' + l.borneDe : ''), plan: F(versFolio) }) ];
  const out = [];
  lk.forEach(l => { const pD = partages.has(l.de), pV = partages.has(l.vers);
    if (pD && pV) { const hd = maisonDe.get(l.de), hv = maisonDe.get(l.vers);
      if (hd && hv && hd !== hv) out.push(...renvoi(l, hv, hd)); else out.push({ ...l, plan: F(hd || hv || 1) }); return; }
    if (pD || pV) { const local = pD ? l.vers : l.de, hub = pD ? l.de : l.vers; out.push({ ...l, plan: F(folioDe.get(local) || maisonDe.get(hub) || 1) }); return; }
    const fd = folioDe.get(l.de), fv = folioDe.get(l.vers);
    if (fd === fv) out.push({ ...l, plan: F(fd) }); else out.push(...renvoi(l, fv, fd)); });
  return { liaisons: out, nFolios: folio, applique: true };
}

/* Ce qui est dessiné tient-il sur une feuille ? On mesure l'emprise des
   blocs — pas la feuille, calée sur un format A quoi qu'on dessine dessus. */
function formatDuDessin(dessin) {
  if (!dessin) return null;
  const C = dessin.comps.filter(c => c.kind !== 'tag'); if (!C.length) return null;
  const x0 = Math.min(...C.map(c => c.x)), x1 = Math.max(...C.map(c => c.x + c.w));
  const y0 = Math.min(...C.map(c => c.y)), y1 = Math.max(...C.map(c => c.y + c.h));
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
  return { larg: w, haut: h, ratio: w / h, tientSurUnePage: (w / h) <= 2.5 && (w / h) >= 0.4 };
}
