/* ===========================================================================
   PILOTE — parler à l'outil depuis Playwright, ancien ou nouveau.
   Pendant la refonte, les bancs mesurent les DEUX fichiers avec les mêmes
   cas : ce module cache la différence d'API derrière trois verbes.
     charger(page, lignes)   lignes = [[de, borneDe, vers, borneVers], …]
     essai(page)             le contrat d'essai
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
  return { blocs: a.blocs, fils: a.fils, droits: a.droits, taux: a.tauxDroits, croisements: a.croisements,
           filsDansBloc: a.filsDansBloc, chevauches: a.blocsChevauches,
           w, h, format: w / h, densite: aire / (w * h), allongement: vol ? tracee / vol : 1 };
}

module.exports = { fichierDemande, chargerDansLaPage, essaiDansLaPage, mesurerDansLaPage };
