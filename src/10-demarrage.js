/* ===========================================================================
   10 — DÉMARRAGE, ET L'API DE CONTRÔLE
   `atelier` est ce que les bancs et les contrôles pilotent : charger un
   contrat, obtenir le dessin, l'auditer. L'interface passe par les mêmes
   fonctions — il n'y a qu'un chemin.
   =========================================================================== */
'use strict';

const atelier = {
  /* charge des liaisons et dessine, sans découper en folios : c'est le
     dessin ENTIER que les bancs mesurent */
  charger(liaisons) { app.contrat.liaisons = liaisons.map(liaison); app.source = null; app.nFolios = 0; app.plan = '*'; app.choisi = null;
    redessiner(); return app.dessin; },
  essai() { return atelier.charger(contratEssai()); },
  lire(texte) { const r = lireTexte(texte); atelier.charger(r.liaisons); return r; },
  dessin() { return app.dessin; },
  audit() { return app.dessin ? auditer(app.dessin) : { ok: false, fils: 0, droits: 0, tauxDroits: 1, croisements: 0, filsDansBloc: 0, blocsChevauches: 0, blocs: 0 }; },
  app
};

function demarrer() {
  lierPanneau(); lierPlanche();
  if (typeof lierRetest === 'function') lierRetest();
  // on retrouve son contrat ; à défaut l'exemple — jamais un écran vide
  if (!relire()) { remplirCartouche(); chargerContrat(contratEssai(), 'contrat d’exemple'); app.hist = []; synchroniserHistorique(); }
  requestAnimationFrame(ajuster);
}
demarrer();
