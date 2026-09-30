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
  // les deux règles dures du tracé : aucun segment partagé par deux fils de nets différents, aucune marche
  const partages = typeof compterPartages === 'function' ? compterPartages(fils) : 0, marches = typeof compterMarches === 'function' ? compterMarches(fils) : 0;
  return { blocs: a.blocs, fils: a.fils, droits: a.droits, taux: a.tauxDroits, croisements: a.croisements, evitables: a.evitables || 0,
           filsDansBloc: a.filsDansBloc, chevauches: a.blocsChevauches, partages, marches,
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
  /* les tours (un fil qui sort par le flanc opposé à son partenaire) se lisent sur les liaisons, pas sur les tracés : on les
     passe ; un fil qui traverse SON PROPRE bloc n'est pas droit et vaut deux croisements, comme au juge (le routeur exclut
     les deux blocs d'un fil de sa vérification de couloir) : on passe les blocs */
  const noter = (R, links, comps) => { const fils = propres(R), t = traversees(fils, (comps || R.comps).filter(c => c.kind !== 'tag'));
    return { d: compterDroits(fils.filter(w => !t.propres.has(w))), c: compterCroisements(fils, R.barrettes) + 2 * t.propres.size, p: compterPartages(R.fils), m: compterMarches(fils), t: compterTours({ links: links || R.links }), k: compterContours(fils) }; };
  // le même barème que le juge (ses constantes) : croisements, segments partagés, marches, tours, contours (un fil qui
  // contourne des blocs) — et un TOUR de plus n'est jamais « mieux », quoi qu'il rapporte : un fil qui fait le tour de son
  // bloc est ce qu'un lecteur déteste le plus
  const note = n => n.d - n.c / CROISEMENTS_PAR_DROIT - PARTAGE * n.p - PAR_MARCHE * n.m - TOUR * n.t - n.k;
  const mieux = (n, b) => n.t <= b.t && note(n) > note(b) + 0.01;
  const texte = n => n.d + ' droits, ' + n.c + ' croisements, ' + n.p + ' partagés, ' + n.m + ' marches, ' + n.t + ' tours' + (n.k > 0.05 ? ', contours ' + n.k.toFixed(1) : '');
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
  window.banc = { noter, note, mieux, texte, sain, glisser, pastillesDe };
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
        const R = router({ comps: d.comps, links, geom: d.geom, bbox: d.bbox }), n = B.noter(R, links, d.comps);
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
      // une borne pontée à une autre du bloc reste avec son paquet : un pont ne se dessine pas entre deux flancs
      if (d.links.some(l => l.shunt && String(l.de) === c.name && String(l.vers) === c.name && (String(l.borneDe) === etiq || String(l.borneVers) === etiq))) return;
      // un pas d'une borne du même connecteur, deux d'une borne d'un autre (sa lettre s'écrit entre les deux) — la règle du placement
      const conn = connecteurParBorne(c.name, d.links), nomDe = e => (conn.get(String(e)) || {}).nom, pasDe = q => nomDe(q.etiq) === nomDe(etiq) ? PRH : 2 * PRH;
      const autres = (c.rangs[autre] || []), libre = y => autres.every(q => Math.abs(q.y - y) >= pasDe(q) - 0.5);
      // à sa hauteur, ou juste au-dessus ou au-dessous des bornes d'en face — hors du corps s'il le faut : le corps grandit d'autant
      const haut = Math.min(...autres.map(q => q.y - pasDe(q))), bas = Math.max(...autres.map(q => q.y + pasDe(q)));
      const cands = [p.y, ...(autres.length ? [haut, bas] : [])].filter((y, i, a) => a.indexOf(y) === i && libre(y) && y >= c.y + 10 - PRH && y <= c.y + c.h - 10 + PRH);
      const x = autre === 'R' ? c.x + c.w : c.x, ch = c.col + (autre === 'R' ? 1 : 0), stub = autre === 'R' ? 'L' : 'R';
      let trouve = null;      // une borne compte une fois, à la première hauteur qui fait mieux
      cands.forEach(y => { if (trouve) return; essais++;
        const links = d.links.map(l => { if (!siens(l)) return l; const L2 = { ...l };
          if (l.de === c.name && String(l.borneDe) === etiq) L2.epA = { x, y, ch, stub }; if (l.vers === c.name && String(l.borneVers) === etiq) L2.epB = { x, y, ch, stub }; return L2; });
        const y0 = Math.min(c.y, y - 18), y1 = Math.max(c.y + c.h, y + 18);
        const comps = (y0 < c.y || y1 > c.y + c.h) ? d.comps.map(k => k === c ? { ...k, y: y0, h: y1 - y0 } : k) : d.comps;
        const R = router({ comps, links, geom: d.geom, bbox: d.bbox }), n = B.noter(R, links, comps);
        if (B.mieux(n, base) && B.sain(comps, R)) trouve = c.name + ':' + etiq + ' sur le flanc ' + autre + ' : ' + B.texte(base) + ' → ' + B.texte(n); });
      if (trouve) manques.push(trouve); })); });
  return { manques, essais, base };
}
/* Les GLISSEMENTS ÉVIDENTS : chaque bloc glisse, ses pastilles avec lui,
   aux hauteurs exactes qui alignent une de ses bornes avec son partenaire
   d'une autre colonne — et se route. Un glissement qui fait mieux sans rien
   chevaucher est un geste que le placement aurait dû trouver. Un bloc ne
   glisse pas à moins de dix unités d'un autre bloc de sa colonne : c'est la
   garde que la recherche s'impose (deux corps qui se touchent presque). */
function glissementsEvidentsDansLaPage() {
  const B = window.banc, d = atelier.dessin(); if (!d) return { manques: [], essais: 0 };
  const base = B.noter(d), manques = []; let essais = 0;
  d.comps.forEach(c => { if (c.kind === 'tag') return; const dys = new Set();
    d.links.forEach(l => { if (l.shunt || l.boucle) return; let ici, la, autre;
      if (l.de === c.name) { ici = l.epA; la = l.epB; autre = l.vers; } else if (l.vers === c.name) { ici = l.epB; la = l.epA; autre = l.de; } else return;
      const k = d.compDe.get(autre); if (!k || k.kind === 'tag' || k.col === c.col) return;
      const dy = Math.round((la.y - ici.y) * 2) / 2; if (Math.abs(dy) > 0.75) dys.add(dy); });
    const heurte = dy => d.comps.some(o => o !== c && o.kind !== 'tag' && o.col === c.col && c.y + dy < o.y + o.h + 10 && o.y < c.y + c.h + dy + 10);
    dys.forEach(dy => { if (heurte(dy)) return; essais++; const { comps, links } = B.glisser(d, c, dy);
      const R = router({ comps, links, geom: d.geom, bbox: d.bbox }), n = B.noter(R, links, comps);
      if (B.mieux(n, base) && B.sain(comps, R)) manques.push(c.name + ' glissé de ' + dy + ' : ' + B.texte(base) + ' → ' + B.texte(n)); }); });
  return { manques, essais, base };
}
/* Les SEGMENTS PARTAGÉS : deux fils de nets différents superposés sur un
   même trait — une connexion qui n'existe pas. Rend les paires. */
function segmentsPartagesDansLaPage() {
  const d = atelier.dessin(); if (!d) return { n: 0, detail: [] };
  const detail = []; const n = compterPartages(d.fils, detail); return { n, detail };
}
/* Les MARCHES : un fil qui fait un escalier — un segment de moins de 12
   entre deux angles, deux verticales à moins de 24 l'une de l'autre. Un fil
   est droit, fait un Z, ou un U par un couloir. Rend les fils fautifs. */
function marchesDansLaPage() {
  const d = atelier.dessin(); if (!d) return { n: 0, detail: [] };
  const detail = []; const n = compterMarches(d.fils.filter(w => !w.shunt), detail); return { n, detail };
}
/* Les CORPS ÉTIRÉS : un équipement (ou une réglette : un paquet de
   barrette, une prise de coupure) que le juge tient pour étiré
   (`corpsEtire` : une fois et demie sa hauteur naturelle, à un pas près)
   est compacté — chaque flanc au pas depuis le haut, ses pastilles suivent
   — et routé. Si le juge préfère le compact (au barème : fils droits,
   croisements, partages, marches, tours, contours ; le corps compact vaut
   ETIRE), l'étirement n'était pas justifié, et c'est un geste manqué. */
function corpsEtiresDansLaPage() {
  const B = window.banc, d = atelier.dessin(); if (!d) return { defauts: [], etires: 0 };
  const base = B.noter(d), defauts = []; let etires = 0;
  d.comps.forEach(c => { if (!corpsEtire(c)) return; const nat = hauteurNaturelle(c); etires++;
    const reglette = c.kind !== 'equip', marge = reglette ? (estCoupure(c.name) ? PRH / 2 + 5 : MARGE_BARRETTE) : Math.max((c.rangs.L || []).length, (c.rangs.R || []).length) === 1 ? 23 : 18, yDe = new Map();
    // les bornes d'une réglette sont sur une seule liste (S), servies des deux flancs
    (reglette ? ['S'] : ['L', 'R']).forEach(lid => (c.rangs[lid] || []).slice().sort((u, v) => u.y - v.y).forEach((p, i) => yDe.set(lid + ':' + Math.round(p.y * 2), c.y + marge + i * PRH)));
    const nouvelle = ep => yDe.get((reglette ? 'S' : Math.abs(ep.x - c.x) < 0.5 ? 'L' : 'R') + ':' + Math.round(ep.y * 2));
    const tags = B.pastillesDe(d, c), yTag = new Map(); tags.forEach(t => { const y = t.y + t.h / 2, ny = yDe.get('L:' + Math.round(y * 2)) ?? yDe.get('R:' + Math.round(y * 2)) ?? yDe.get('S:' + Math.round(y * 2)); if (ny != null) yTag.set(t, ny); });
    const comps = d.comps.map(k => k === c ? { ...k, h: nat } : (yTag.has(k) ? { ...k, y: yTag.get(k) - k.h / 2 } : k));
    const links = d.links.map(l => { const a = l.de === c.name, b = l.vers === c.name; if (!a && !b) return l;
      // la pastille de ce fil : celle de ce nom collée à cette hauteur (deux masses d'un bloc portent souvent le même nom)
      const laTag = (nom, ep) => tags.find(t => t.name === nom && yTag.has(t) && Math.abs(t.y + t.h / 2 - ep.y) < 0.5);
      const ya = a ? nouvelle(l.epA) : null, yb = b ? nouvelle(l.epB) : null, versTag = a ? laTag(l.vers, l.epB) : laTag(l.de, l.epA);
      return { ...l, epA: { ...l.epA, y: ya ?? (versTag && !a ? yTag.get(versTag) : l.epA.y) }, epB: { ...l.epB, y: yb ?? (versTag && !b ? yTag.get(versTag) : l.epB.y) } }; });
    const R = router({ comps, links, geom: d.geom, bbox: d.bbox }), n = B.noter(R, links, comps);
    if (B.sain(comps, R) && n.t <= base.t && B.note(n) > B.note(base) - ETIRE + 0.01) defauts.push(c.name + ' : ' + Math.round(c.h) + ' pour ' + nat + ' de naturel (' + (c.h / nat).toFixed(1) + '×), compact : ' + B.texte(n) + ' contre ' + B.texte(base)); });
  return { defauts, etires };
}

/* Les PASTILLES COLLÉES : chaque masse, et chaque morceau de barrette
   réduit à une borne et un fil vers un bloc, est une pastille au flanc de
   la borne qu'elle sert — même hauteur, fil court et droit, à moins de 40
   du flanc. Rend celles qui ne le sont pas, avec leur distance. */
function pastillesColleesDansLaPage() {
  const d = atelier.dessin(); if (!d) return { masses: 0, morceaux: 0, loin: [] };
  const loin = []; let masses = 0, morceaux = 0;
  // les bornes de barrette qui ne portent qu'un fil, et si la barrette est seule sur ce paquet (aucun shunt sur la borne)
  const filsParBorne = new Map(), shuntees = new Set();
  d.fils.forEach(w => { [[w.de, w.borneDe], [w.vers, w.borneVers]].forEach(([r, b]) => { if (!estBarrette(r)) return; const k = r + ':' + b;
    if (w.shunt) shuntees.add(k); else filsParBorne.set(k, (filsParBorne.get(k) || 0) + 1); }); });
  d.fils.forEach(w => { if (w.shunt) return;
    let m = estMasse(w.de) ? 'de' : (estMasse(w.vers) ? 'vers' : null), quoi = 'masse';
    if (!m) { const feuille = (r, b, autre) => estBarrette(r) && !estMasse(autre) && !estRail(autre) && filsParBorne.get(r + ':' + b) === 1 && !shuntees.has(r + ':' + b);
      if (feuille(w.de, w.borneDe, w.vers)) m = 'de'; else if (feuille(w.vers, w.borneVers, w.de)) m = 'vers'; quoi = 'morceau'; }
    if (!m) return; if (quoi === 'masse') masses++; else morceaux++;
    const tag = d.comps.find(c => c.kind === 'tag' && c.name === w[m]); const ep = m === 'de' ? w.epA : w.epB, autre = m === 'de' ? w.epB : w.epA;
    const dist = Math.abs(ep.x - autre.x), droit = w.pts.length === 2 && Math.abs(ep.y - autre.y) < 0.75;
    if (!tag || !droit || dist > 40) loin.push(w[m] + ' (' + w.cable + ') : ' + (tag ? '' : 'pas une pastille, ') + (droit ? '' : 'fil plié, ') + 'à ' + Math.round(dist) + ' du flanc'); });
  return { masses, morceaux, loin };
}
/* Un BLOC LISIBLE : aucune de ses bornes ne tourne le dos à la colonne de
   son partenaire (un connecteur coupé en deux flancs n'est admis que
   JUSTIFIÉ : chaque borne regarde vers son partenaire — une borne qui sert
   les deux côtés est excusée, l'un de ses fils fait le tour quoi qu'on
   fasse), et aucun fil étranger ne traverse son voisinage (le rectangle du
   bloc, flancs compris, élargi de 3 : la distance que le routeur s'impose
   entre un couloir et un bloc). Rend les défauts trouvés. */
function blocLisibleDansLaPage(nom) {
  const d = atelier.dessin(); const c = d && d.compDe.get(nom); if (!c) return ['bloc ' + nom + ' absent'];
  const defauts = []; const conn = connecteurParBorne(c.name, d.links);
  const colonneDuBout = ep => ep.stub === 'L' ? ep.ch - 1 : ep.ch;          // stub L : le bout est sur le flanc droit, sa goulotte à droite
  const flancsDe = new Map(), mal = [], bien = new Map(), flancDe = new Map(), douteux = [];
  ['L', 'R'].forEach(lid => (c.rangs[lid] || []).forEach(p => { const g = conn.get(String(p.etiq)); if (g) (flancsDe.get(g.nom) || flancsDe.set(g.nom, new Set()).get(g.nom)).add(lid);
    const cotes = new Set();
    d.links.forEach(l => { if (l.shunt || l.boucle) return; const xf = lid === 'L' ? c.x : c.x + c.w;
      const surMoi = e => Math.abs(e.x - xf) < 1 && Math.abs(e.y - p.y) < 0.5, moi = surMoi(l.epA) ? l.epA : surMoi(l.epB) ? l.epB : null; if (!moi) return;
      const autre = moi === l.epA ? l.epB : l.epA; if (d.compDe.get(autre === l.epA ? l.de : l.vers) && d.compDe.get(autre === l.epA ? l.de : l.vers).kind === 'tag') return;
      cotes.add(Math.sign(colonneDuBout(autre) - colonneDuBout(moi))); });
    const cle = String(p.etiq); flancDe.set(cle, lid); bien.set(cle, cotes.has(lid === 'L' ? -1 : 1));
    if (cotes.has(lid === 'L' ? 1 : -1) && !cotes.has(lid === 'L' ? -1 : 1)) douteux.push({ cle, nom: (g ? g.nom : '') + cle }); }));
  /* une borne PONTÉE à une borne du même flanc qui regarde bien ses partenaires est excusée : un pont ne se dessine
     pas entre deux flancs, le paquet sort du côté de la majorité, et l'autre fil fait le tour — c'est la règle du dessin */
  const chef = new Map([...bien.keys()].map(k => [k, k])), trouver = k => { while (chef.get(k) !== k) k = chef.get(k); return k; };
  d.links.forEach(l => { if (!l.shunt || String(l.de) !== nom || String(l.vers) !== nom) return; const a = String(l.borneDe), b = String(l.borneVers);
    if (chef.has(a) && chef.has(b) && flancDe.get(a) === flancDe.get(b)) chef.set(trouver(a), trouver(b)); });
  douteux.forEach(({ cle, nom: n }) => { const r = trouver(cle); if (![...bien].some(([k, ok]) => ok && trouver(k) === r)) mal.push(n); });
  if (mal.length) defauts.push('borne(s) ' + mal.join(', ') + ' tournant le dos à leur partenaire' + ([...flancsDe.values()].some(fl => fl.size > 1) ? ' (connecteur coupé sans raison)' : ''));
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
  flancsEvidentsDansLaPage, glissementsEvidentsDansLaPage, segmentsPartagesDansLaPage, marchesDansLaPage, corpsEtiresDansLaPage, pastillesColleesDansLaPage, blocLisibleDansLaPage, filDroitOuJustifieDansLaPage };
