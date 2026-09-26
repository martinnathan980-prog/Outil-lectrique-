/* ===========================================================================
   10 — DÉMARRAGE, ET L'API DE CONTRÔLE
   `atelier` est ce que les bancs et les contrôles pilotent : charger un
   contrat, obtenir le dessin, l'auditer. C'est aussi ce que l'interface
   appelle — il n'y a qu'un chemin.
   =========================================================================== */
'use strict';

const etat = { contrat: nouveauContrat(), dessin: null };

function recalculer() {
  const lk = etat.contrat.liaisons.filter(liaisonComplete);
  if (!lk.length) { etat.dessin = null; return null; }
  const L = meilleurPlacement(lk);
  etat.dessin = L ? { comps: L.comps, links: L.links, bbox: L.bbox, geom: L.geom, fils: L.routage.fils,
                      points: L.routage.points, barrettes: L.routage.barrettes, piquages: L.routage.piquages } : null;
  return etat.dessin;
}

const atelier = {
  charger(liaisons) { etat.contrat.liaisons = liaisons.map(liaison); return recalculer(); },
  essai() { return atelier.charger(contratEssai()); },
  lire(texte) { const r = lireTexte(texte); atelier.charger(r.liaisons); return r; },
  dessin() { return etat.dessin; },
  audit() { return etat.dessin ? auditer(etat.dessin) : { ok: false, fils: 0, droits: 0, tauxDroits: 1, croisements: 0, filsDansBloc: 0, blocsChevauches: 0, blocs: 0 }; },
  etat
};
