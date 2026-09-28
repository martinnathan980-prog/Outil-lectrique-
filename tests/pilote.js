/* ===========================================================================
   PILOTE — parler à l'outil depuis Playwright, ancien ou nouveau.
   Pendant la refonte, les bancs mesurent les DEUX fichiers avec les mêmes
   cas : ce module cache la différence d'API derrière trois verbes.
     charger(page, lignes)   lignes = [[de, borneDe, vers, borneVers], …]
     essai(page)             le contrat d'essai
     exemple(page, plan)     un folio du contrat d'exemple (nouveau moteur seulement)
     mesurer(page)           audit + géométrie, même forme pour les deux
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

/* Les ÉCHANGES ÉVIDENTS : sur le dessin courant, pour chaque connecteur
   d'équipement, on essaie chaque paire de bornes d'un même flanc en
   échangeant leurs ordonnées et en routant pour de vrai. Un échange qui
   réduit les croisements sans réduire les fils droits est un échange que le
   placement aurait dû trouver : il est rendu, avec ses chiffres. */
function echangesEvidentsDansLaPage() {
  const d = atelier.dessin(); if (!d) return { manques: [], paires: 0 };
  const propres = R => R.fils.filter(w => !w.shunt);
  const base = { droits: compterDroits(propres(d)), crois: compterCroisements(propres(d), d.barrettes) };
  const manques = []; let paires = 0;
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
        const R = router({ comps: d.comps, links, geom: d.geom, bbox: d.bbox });
        const dr = compterDroits(propres(R)), cr = compterCroisements(propres(R), R.barrettes);
        if (cr < base.crois && dr >= base.droits) manques.push(c.name + ' ' + ps[i].etiq + '↔' + ps[j].etiq + ' : ' + base.droits + '/' + base.crois + ' → ' + dr + '/' + cr); } }); }); });
  return { manques, paires, base };
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
  const propres = R => R.fils.filter(f => !f.shunt);
  const note = R => compterDroits(propres(R)) - compterCroisements(propres(R), R.barrettes) / 8;
  const base = note(d); const essais = [];
  [[w.de, w.epA.y, w.epB.y], [w.vers, w.epB.y, w.epA.y]].forEach(([nom, yIci, yLa]) => { const dy = yLa - yIci; if (Math.abs(dy) < 0.75) return;
    // le bloc glisse avec les pastilles qui lui sont collées
    const suit = new Set([nom]); d.fils.forEach(f => { if (f.de === nom && d.compDe.get(f.vers) && d.compDe.get(f.vers).kind === 'tag') suit.add(f.vers); if (f.vers === nom && d.compDe.get(f.de) && d.compDe.get(f.de).kind === 'tag') suit.add(f.de); });
    const comps = d.comps.map(c => suit.has(c.name) ? { ...c, y: c.y + dy } : c);
    const links = d.links.map(l => ({ ...l, epA: { ...l.epA, y: l.epA.y + (suit.has(l.de) ? dy : 0) }, epB: { ...l.epB, y: l.epB.y + (suit.has(l.vers) ? dy : 0) } }));
    const blocs = comps.filter(c => c.kind !== 'tag'); let chevauche = false;
    for (let i = 0; i < blocs.length && !chevauche; i++) for (let j = i + 1; j < blocs.length; j++) { const a = blocs[i], b = blocs[j];
      if (a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1) { chevauche = true; break; } }
    if (chevauche) { essais.push(nom + ' : chevauche'); return; }
    const R = router({ comps, links, geom: d.geom, bbox: d.bbox }); const n = note(R);
    essais.push(nom + ' : ' + n.toFixed(2) + (n > base + 0.01 ? ' MIEUX' : ' pas mieux'));
    if (n > base + 0.01) essais.mieux = true; });
  return { ok: !essais.mieux, detail: 'plié ; juge ' + base.toFixed(2) + ' ; glisser ' + essais.join(', ') };
}

module.exports = { fichierDemande, chargerDansLaPage, essaiDansLaPage, exempleDansLaPage, mesurerDansLaPage, echangesEvidentsDansLaPage, massesColleesDansLaPage, blocLisibleDansLaPage, filDroitOuJustifieDansLaPage };
