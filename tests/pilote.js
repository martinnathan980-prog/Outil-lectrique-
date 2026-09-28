/* ===========================================================================
   PILOTE — parler à l'outil depuis Playwright, ancien ou nouveau.
   Pendant la refonte, les bancs mesurent les DEUX fichiers avec les mêmes
   cas : ce module cache la différence d'API derrière trois verbes.
     charger(page, lignes)   lignes = [[de, borneDe, vers, borneVers], …]
     essai(page)             le contrat d'essai
     exemple(page, plan)     un folio du contrat d'exemple (nouveau moteur seulement)
     mesurer(page)           audit + géométrie, même forme pour les deux
   puis les contrôles exacts a posteriori du banc (échanges, flancs,
   glissements, segments partagés, corps étirés), qui reposent sur un socle
   défini une fois dans la page par `preparerDansLaPage`.
   Le fichier se choisit par --fichier=chemin (défaut : index.html).
   =========================================================================== */
const path = require('path');

function fichierDemande(argv) {
  const a = (argv || process.argv).find(x => x.startsWith('--fichier='));
  const f = a ? a.slice('--fichier='.length) : path.resolve(__dirname, '..', 'index.html');
  return 'file://' + path.resolve(f);
}

// exécuté DANS la page : un seul point d'entrée, qui détecte l'API présente
function chargerDansLaPage(lignes) {
  if (typeof atelier !== 'undefined' && atelier.charger) {
    return atelier.charger(lignes.map(l => ({ de: l[0], borneDe: l[1], vers: l[2], borneVers: l[3] })));
  }
  state.lk = lignes.map(l => ({ from: l[0], fromTerm: l[1], to: l[2], toTerm: l[3],
    nature: '', cable: '', ctype: '', route: '', plan: '', pn1: '', pn2: '' }));
  state.eq = deriveEq(state.lk);
  if (typeof OVR !== 'undefined') OVR.clear(); if (typeof ORDH !== 'undefined') ORDH.clear();
  state.sel = null; state.forceFull = true; render();
}
function essaiDansLaPage() {
  if (typeof atelier !== 'undefined' && atelier.essai) return atelier.essai();
  contratEssai();
}
// un folio du contrat d'exemple, tel que l'outil le dessine quand on ouvre ce plan
function exempleDansLaPage(plan) {
  return atelier.charger(contratExemple().filter(l => l.plan === plan));
}
function mesurerDansLaPage() {
  let a, comps, fils;
  if (typeof atelier !== 'undefined' && atelier.audit) {
    a = atelier.audit(); const d = atelier.dessin(); comps = d.comps; fils = d.fils;
  } else {
    a = auditSchema(); comps = LAST.layout.comps; fils = LAST.routing.wires;
  }
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, aire = 0;
  comps.forEach(c => { if (c.kind === 'tag') return; x0 = Math.min(x0, c.x); x1 = Math.max(x1, c.x + c.w);
    y0 = Math.min(y0, c.y); y1 = Math.max(y1, c.y + c.h); aire += c.w * c.h; });
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
  let tracee = 0, vol = 0;
  fils.forEach(f => { if (!f.pts.length) return;       // un shunt n'a pas de tracé
    for (let i = 0; i < f.pts.length - 1; i++) tracee += Math.abs(f.pts[i + 1].x - f.pts[i].x) + Math.abs(f.pts[i + 1].y - f.pts[i].y);
    const p = f.pts[0], q = f.pts[f.pts.length - 1]; vol += Math.hypot(q.x - p.x, q.y - p.y); });
  return { blocs: a.blocs, fils: a.fils, droits: a.droits, taux: a.tauxDroits, croisements: a.croisements, evitables: a.evitables || 0,
           filsDansBloc: a.filsDansBloc, chevauches: a.blocsChevauches,
           w, h, format: w / h, densite: aire / (w * h), allongement: vol ? tracee / vol : 1 };
}

/* Le SOCLE des contrôles exacts a posteriori, défini une fois dans la page
   (`window.banc`) : noter un routage (fils droits, croisements, segments
   partagés), dire si une variante FAIT MIEUX — moins de croisements ou de
   segments partagés sans moins de fils droits, ou plus de fils droits sans
   plus de croisements ni de partages —, si elle reste SAINE (aucun fil dans
   un bloc étranger, aucun chevauchement), et GLISSER un bloc avec les
   pastilles qui lui sont collées. Chaque contrôle route la variante pour de
   vrai : c'est le routeur qui tranche, pas une estimation. */
function preparerDansLaPage() {
  const propres = R => R.fils.filter(w => !w.shunt);
  const noter = R => ({ d: compterDroits(propres(R)), c: compterCroisements(propres(R), R.barrettes), p: compterPartages(R.fils) });
  const mieux = (n, b) => n.d >= b.d && n.c <= b.c && n.p <= b.p && (n.d > b.d || n.c < b.c || n.p < b.p);
  const texte = n => n.d + ' droits, ' + n.c + ' croisements, ' + n.p + ' partagés';
  const sain = (comps, R) => { const blocs = comps.filter(c => c.kind !== 'tag');
    for (let i = 0; i < blocs.length; i++) for (let j = i + 1; j < blocs.length; j++) { const a = blocs[i], b = blocs[j];
      if (a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1) return false; }
    return propres(R).every(w => { const siens = new Set([String(w.de), String(w.vers)]);
      for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1];
        const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
        if (blocs.some(c => !siens.has(String(c.name)) && x1 > c.x + 2 && x0 < c.x + c.w - 2 && y1 > c.y + 2 && y0 < c.y + c.h - 2)) return false; }
      return true; }); };
  // les pastilles collées à un bloc : celles qui touchent son flanc, par la position (plusieurs pastilles portent le même nom de masse)
  const pastillesDe = (d, c) => d.comps.filter(t => t.kind === 'tag' && t.y + t.h / 2 > c.y - 1 && t.y + t.h / 2 < c.y + c.h + 1
    && (Math.abs(t.x + t.w + FIL_PASTILLE - c.x) < 2 || Math.abs(t.x - (c.x + c.w + FIL_PASTILLE)) < 2));
  const glisser = (d, c, dy) => { const suit = new Set([c.name, ...pastillesDe(d, c).map(t => t.name)]), tags = new Set(pastillesDe(d, c));
    const comps = d.comps.map(k => (k === c || tags.has(k)) ? { ...k, y: k.y + dy } : k);
    // un fil du bloc bouge de son côté ; un fil vers une pastille collée bouge des deux côtés
    const links = d.links.map(l => { const a = l.de === c.name, b = l.vers === c.name; if (!a && !b) return l;
      const versTag = (a && suit.has(l.vers) && l.vers !== c.name) || (b && suit.has(l.de) && l.de !== c.name);
      return { ...l, epA: { ...l.epA, y: l.epA.y + ((a || versTag) ? dy : 0) }, epB: { ...l.epB, y: l.epB.y + ((b || versTag) ? dy : 0) } }; });
    return { comps, links }; };
  window.banc = { noter, mieux, texte, sain, glisser, pastillesDe };
  return true;
}
/* Les ÉCHANGES ÉVIDENTS : sur le dessin courant, pour chaque connecteur
   d'équipement, on essaie chaque paire de bornes d'un même flanc en
   échangeant leurs ordonnées et en routant pour de vrai. Un échange qui fait
   mieux est un échange que le placement aurait dû trouver : il est rendu,
   avec ses chiffres. */
function echangesEvidentsDansLaPage() {
  const B = window.banc, d = atelier.dessin(); if (!d) return { manques: [], paires: 0 };
  const base = B.noter(d), manques = []; let paires = 0;
  d.comps.forEach(c => { if (c.kind !== 'equip') return; const conn = connecteurParBorne(c.name, d.links);
    ['L', 'R'].forEach(lid => { const autre = new Set((c.rangs[lid === 'L' ? 'R' : 'L'] || []).map(p => String(p.etiq)));
      const groupes = new Map();
      (c.rangs[lid] || []).forEach(p => { const g = conn.get(String(p.etiq)); if (!g || autre.has(String(p.etiq))) return;
        (groupes.get(g.nom) || groupes.set(g.nom, []).get(g.nom)).push(p); });
      groupes.forEach(ps => { for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) { paires++;
        const ya = ps[i].y, yb = ps[j].y;
        const links = d.links.map(l => { const L2 = { ...l, epA: { ...l.epA }, epB: { ...l.epB } };
          [['de', 'borneDe', 'epA'], ['vers', 'borneVers', 'epB']].forEach(([n, b, ep]) => { if (L2[n] !== c.name) return;
            if (String(L2[b]) === String(ps[i].etiq)) L2[ep].y = yb; else if (String(L2[b]) === String(ps[j].etiq)) L2[ep].y = ya; });
          return L2; });
        const R = router({ comps: d.comps, links, geom: d.geom, bbox: d.bbox }), n = B.noter(R);
        if (B.mieux(n, base) && B.sain(d.comps, R)) manques.push(c.name + ' ' + ps[i].etiq + '↔' + ps[j].etiq + ' : ' + B.texte(base) + ' → ' + B.texte(n)); } }); }); });
  return { manques, paires, base };
}
/* Les CHANGEMENTS DE FLANC ÉVIDENTS : chaque borne d'équipement reliée à un
   bloc (pas à une pastille : elle suivrait, on ne l'émule pas) est essayée
   sur l'autre flanc, à sa hauteur si la place est libre, sinon juste
   au-dessus ou au-dessous des bornes de ce flanc — et routée. Un flanc qui
   fait mieux est un geste que le placement aurait dû trouver. */
function flancsEvidentsDansLaPage() {
  const B = window.banc, d = atelier.dessin(); if (!d) return { manques: [], essais: 0 };
  const base = B.noter(d), manques = [], tags = new Set(d.comps.filter(c => c.kind === 'tag').map(c => c.name)); let essais = 0;
  d.comps.forEach(c => { if (c.kind !== 'equip') return;
    ['L', 'R'].forEach(lid => (c.rangs[lid] || []).forEach(p => { const autre = lid === 'L' ? 'R' : 'L', etiq = String(p.etiq);
      const siens = l => !l.shunt && !l.boucle && ((l.de === c.name && String(l.borneDe) === etiq) || (l.vers === c.name && String(l.borneVers) === etiq));
      const fils = d.links.filter(siens); if (!fils.length || fils.some(l => tags.has(l.de) || tags.has(l.vers))) return;
      if ((c.rangs[autre] || []).some(q => String(q.etiq) === etiq)) return;      // une borne libre dédoublée parle déjà des deux côtés
      const ys = (c.rangs[autre] || []).map(q => q.y), libre = y => ys.every(v => Math.abs(v - y) >= PRH - 0.5);
      const cands = [p.y, ...(ys.length ? [Math.min(...ys) - PRH, Math.max(...ys) + PRH] : [])].filter((y, i, a) => a.indexOf(y) === i && libre(y) && y >= c.y + 10 && y <= c.y + c.h - 10);
      const x = autre === 'R' ? c.x + c.w : c.x, ch = c.col + (autre === 'R' ? 1 : 0), stub = autre === 'R' ? 'L' : 'R';
      let trouve = null;      // une borne compte une fois, à la première hauteur qui fait mieux
      cands.forEach(y => { if (trouve) return; essais++;
        const links = d.links.map(l => { if (!siens(l)) return l; const L2 = { ...l };
          if (l.de === c.name && String(l.borneDe) === etiq) L2.epA = { x, y, ch, stub }; if (l.vers === c.name && String(l.borneVers) === etiq) L2.epB = { x, y, ch, stub }; return L2; });
        const R = router({ comps: d.comps, links, geom: d.geom, bbox: d.bbox }), n = B.noter(R);
        if (B.mieux(n, base) && B.sain(d.comps, R)) trouve = c.name + ':' + etiq + ' sur le flanc ' + autre + ' : ' + B.texte(base) + ' → ' + B.texte(n); });
      if (trouve) manques.push(trouve); })); });
  return { manques, essais, base };
}
/* Les GLISSEMENTS ÉVIDENTS : chaque bloc glisse, ses pastilles avec lui,
   aux hauteurs exactes qui alignent une de ses bornes avec son partenaire
   d'une autre colonne — et se route. Un glissement qui fait mieux sans rien
   chevaucher est un geste que le placement aurait dû trouver. */
function glissementsEvidentsDansLaPage() {
  const B = window.banc, d = atelier.dessin(); if (!d) return { manques: [], essais: 0 };
  const base = B.noter(d), manques = []; let essais = 0;
  d.comps.forEach(c => { if (c.kind === 'tag') return; const dys = new Set();
    d.links.forEach(l => { if (l.shunt || l.boucle) return; let ici, la, autre;
      if (l.de === c.name) { ici = l.epA; la = l.epB; autre = l.vers; } else if (l.vers === c.name) { ici = l.epB; la = l.epA; autre = l.de; } else return;
      const k = d.compDe.get(autre); if (!k || k.kind === 'tag' || k.col === c.col) return;
      const dy = Math.round((la.y - ici.y) * 2) / 2; if (Math.abs(dy) > 0.75) dys.add(dy); });
    dys.forEach(dy => { essais++; const { comps, links } = B.glisser(d, c, dy);
      const R = router({ comps, links, geom: d.geom, bbox: d.bbox }), n = B.noter(R);
      if (B.mieux(n, base) && B.sain(comps, R)) manques.push(c.name + ' glissé de ' + dy + ' : ' + B.texte(base) + ' → ' + B.texte(n)); }); });
  return { manques, essais, base };
}
/* Les SEGMENTS PARTAGÉS : deux fils de nets différents superposés sur un
   même trait — une connexion qui n'existe pas. Rend les paires. */
function segmentsPartagesDansLaPage() {
  const d = atelier.dessin(); if (!d) return { n: 0, detail: [] };
  const detail = []; const n = compterPartages(d.fils, detail); return { n, detail };
}
/* Les CORPS ÉTIRÉS : un équipement plus de deux fois plus haut que sa
   hauteur naturelle (bornes au pas, plus les marges) est compacté — chaque
   flanc au pas depuis le haut, ses pastilles suivent — et routé. Si le
   corps étiré ne rend pas droits au moins deux fils de plus que le compact,
   l'étirement n'était pas justifié. */
function corpsEtiresDansLaPage() {
  const B = window.banc, d = atelier.dessin(); if (!d) return { defauts: [], etires: 0 };
  const base = B.noter(d), defauts = []; let etires = 0;
  d.comps.forEach(c => { if (c.kind !== 'equip') return; const nat = hauteurNaturelle(c); if (c.h <= 2 * nat) return; etires++;
    const marge = Math.max((c.rangs.L || []).length, (c.rangs.R || []).length) === 1 ? 23 : 18, yDe = new Map();
    ['L', 'R'].forEach(lid => (c.rangs[lid] || []).slice().sort((u, v) => u.y - v.y).forEach((p, i) => yDe.set(lid + ':' + Math.round(p.y * 2), c.y + marge + i * PRH)));
    const nouvelle = ep => yDe.get((Math.abs(ep.x - c.x) < 0.5 ? 'L' : 'R') + ':' + Math.round(ep.y * 2));
    const tags = B.pastillesDe(d, c), yTag = new Map(); tags.forEach(t => { const y = t.y + t.h / 2, ny = yDe.get('L:' + Math.round(y * 2)) ?? yDe.get('R:' + Math.round(y * 2)); if (ny != null) yTag.set(t, ny); });
    const comps = d.comps.map(k => k === c ? { ...k, h: nat } : (yTag.has(k) ? { ...k, y: yTag.get(k) - k.h / 2 } : k));
    const links = d.links.map(l => { const a = l.de === c.name, b = l.vers === c.name; if (!a && !b) return l;
      // la pastille de ce fil : celle de ce nom collée à cette hauteur (deux masses d'un bloc portent souvent le même nom)
      const laTag = (nom, ep) => tags.find(t => t.name === nom && yTag.has(t) && Math.abs(t.y + t.h / 2 - ep.y) < 0.5);
      const ya = a ? nouvelle(l.epA) : null, yb = b ? nouvelle(l.epB) : null, versTag = a ? laTag(l.vers, l.epB) : laTag(l.de, l.epA);
      return { ...l, epA: { ...l.epA, y: ya ?? (versTag && !a ? yTag.get(versTag) : l.epA.y) }, epB: { ...l.epB, y: yb ?? (versTag && !b ? yTag.get(versTag) : l.epB.y) } }; });
    const R = router({ comps, links, geom: d.geom, bbox: d.bbox }), n = B.noter(R);
    if (base.d - n.d < 2) defauts.push(c.name + ' : ' + Math.round(c.h) + ' pour ' + nat + ' de naturel (' + (c.h / nat).toFixed(1) + '×), compact : ' + B.texte(n) + ' contre ' + B.texte(base)); });
  return { defauts, etires };
}

/* Les MASSES COLLÉES : chaque masse est une pastille au flanc de la borne
   qu'elle sert — même hauteur, fil court et droit, à moins de 40 du flanc.
   Rend les masses qui ne le sont pas, avec leur distance. */
function massesColleesDansLaPage() {
  const d = atelier.dessin(); if (!d) return { masses: 0, loin: [] };
  const loin = []; let masses = 0;
  d.fils.forEach(w => { const m = estMasse(w.de) ? 'de' : (estMasse(w.vers) ? 'vers' : null); if (!m || w.shunt) return; masses++;
    const tag = d.comps.find(c => c.kind === 'tag' && c.name === w[m]); const ep = m === 'de' ? w.epA : w.epB, autre = m === 'de' ? w.epB : w.epA;
    const dist = Math.abs(ep.x - autre.x), droit = w.pts.length === 2 && Math.abs(ep.y - autre.y) < 0.75;
    if (!tag || !droit || dist > 40) loin.push(w[m] + ' (' + w.cable + ') : ' + (tag ? '' : 'pas une pastille, ') + (droit ? '' : 'fil plié, ') + 'à ' + Math.round(dist) + ' du flanc'); });
  return { masses, loin };
}
/* Un BLOC LISIBLE : chacun de ses connecteurs est sur un seul flanc, et aucun
   fil étranger ne traverse son voisinage (le rectangle du bloc, flancs
   compris, élargi de 3 : la distance que le routeur s'impose entre un
   couloir et un bloc — sur le folio 3, un détour passe à 4 au-dessus de
   397TB1 ; le jour où le routeur tient ses couloirs à distance, ce 3
   remonte à 6). Rend les défauts trouvés. */
function blocLisibleDansLaPage(nom) {
  const d = atelier.dessin(); const c = d && d.compDe.get(nom); if (!c) return ['bloc ' + nom + ' absent'];
  const defauts = []; const conn = connecteurParBorne(c.name, d.links);
  const flancsDe = new Map();
  ['L', 'R'].forEach(lid => (c.rangs[lid] || []).forEach(p => { const g = conn.get(String(p.etiq)); if (!g) return; (flancsDe.get(g.nom) || flancsDe.set(g.nom, new Set()).get(g.nom)).add(lid); }));
  flancsDe.forEach((fl, g) => { if (fl.size > 1) defauts.push('connecteur ' + g + ' sur deux flancs'); });
  const x0 = c.x - 3, x1 = c.x + c.w + 3, y0 = c.y - 3, y1 = c.y + c.h + 3;
  d.fils.forEach(w => { if (w.shunt || w.de === nom || w.vers === nom) return;
    for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1];
      if (Math.min(a.x, b.x) < x1 && Math.max(a.x, b.x) > x0 && Math.min(a.y, b.y) < y1 && Math.max(a.y, b.y) > y0) { defauts.push('le fil ' + w.cable + ' traverse le voisinage'); break; } } });
  return defauts;
}
/* Un FIL DROIT OU JUSTIFIÉ : le fil est droit, ou bien le glissement d'un de
   ses deux blocs qui le rendrait droit (ses pastilles avec lui) chevauche un
   bloc ou ne fait pas mieux au juge (fils droits moins un huitième des
   croisements). Rend le verdict et les chiffres. */
function filDroitOuJustifieDansLaPage(cable) {
  const d = atelier.dessin(); const w = d && d.fils.find(f => f.cable === cable); if (!w) return { ok: false, detail: 'fil ' + cable + ' absent' };
  if (w.pts.length === 2) return { ok: true, detail: 'droit' };
  const B = window.banc, propres = R => R.fils.filter(f => !f.shunt);
  const note = R => compterDroits(propres(R)) - compterCroisements(propres(R), R.barrettes) / 8;
  const base = note(d); const essais = [];
  [[w.de, w.epA.y, w.epB.y], [w.vers, w.epB.y, w.epA.y]].forEach(([nom, yIci, yLa]) => { const dy = yLa - yIci; if (Math.abs(dy) < 0.75) return;
    // le bloc glisse avec les pastilles qui lui sont collées
    const { comps, links } = B.glisser(d, d.compDe.get(nom), dy);
    const blocs = comps.filter(c => c.kind !== 'tag'); let chevauche = false;
    for (let i = 0; i < blocs.length && !chevauche; i++) for (let j = i + 1; j < blocs.length; j++) { const a = blocs[i], b = blocs[j];
      if (a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1) { chevauche = true; break; } }
    if (chevauche) { essais.push(nom + ' : chevauche'); return; }
    const R = router({ comps, links, geom: d.geom, bbox: d.bbox }); const n = note(R);
    essais.push(nom + ' : ' + n.toFixed(2) + (n > base + 0.01 ? ' MIEUX' : ' pas mieux'));
    if (n > base + 0.01) essais.mieux = true; });
  return { ok: !essais.mieux, detail: 'plié ; juge ' + base.toFixed(2) + ' ; glisser ' + essais.join(', ') };
}

module.exports = { fichierDemande, chargerDansLaPage, essaiDansLaPage, exempleDansLaPage, mesurerDansLaPage, preparerDansLaPage, echangesEvidentsDansLaPage,
  flancsEvidentsDansLaPage, glissementsEvidentsDansLaPage, segmentsPartagesDansLaPage, corpsEtiresDansLaPage, massesColleesDansLaPage, blocLisibleDansLaPage, filDroitOuJustifieDansLaPage };
