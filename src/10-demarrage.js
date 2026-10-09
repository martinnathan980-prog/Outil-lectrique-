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
    fermerFiche(); redessiner(); return app.dessin; },
  essai() { return atelier.charger(contratEssai()); },
  /* l'exemple embarqué, avec son profil de charge, comme si l'outil venait de s'ouvrir dessus (sans historique) : les
     batteries qui le lisent le demandent — l'outil, lui, s'ouvre sur l'accueil */
  exemple() { ouvrirExemple(true); return app.dessin; },
  lire(texte) { const r = lireTexte(texte); atelier.charger(r.liaisons); return r; },
  dessin() { return app.dessin; },
  audit() { return app.dessin ? auditer(app.dessin) : { ok: false, fils: 0, droits: 0, tauxDroits: 1, croisements: 0, filsDansBloc: 0, blocsChevauches: 0, blocs: 0 }; },
  /* l'affinage (08) : endormi sous pilote automatique, pour que les bancs mesurent le concours ; réveillé ici */
  affinage(on) { affinage.actif = !!on; if (on) { relireAffines(); affinerTout(); } return atelier.etatAffinage(); },
  /* le placement d'un folio jamais vu (08) : au loin dans un Worker, sauf sous pilote (synchrone) ; réveillé ici */
  placement(on) { return placementAilleurs(on); },
  etatPlacement() { return etatPlacement(); },
  etatAffinage() { return { actif: affinage.actif, encours: affinage.encours ? affinage.encours.cle.length : 0, attente: affinage.file.length, finis: affinage.finis.size, etat: affinage.etat, worker: affinage.worker === false ? 'refusé' : affinage.worker ? 'oui' : 'pas encore', erreur: affinage.erreur || null }; },
  app
};

function demarrer() {
  typographieVivante(); relireBible(); lierPanneau(); lierPlanche();
  // le tableau garde sa taille et sa portée, jamais son état ouvert : on rouvre sur le plan seul, le tableau à la demande (B)
  relireBase();
  // on retrouve son contrat (avec ses choix) ; à défaut l'ACCUEIL — ce que l'outil attend, dans l'ordre (le retest, les
  // contrats déjà faits, la bible et les normes) —, jamais un contrat qu'on n'a pas ouvert : l'exemple attend qu'on le demande
  if (!relire()) redessiner();
  requestAnimationFrame(() => ajuster());
  // les folios déjà affinés dans ce navigateur reviennent ; les autres s'affinent en arrière-plan ; les retouches aussi
  relireAffines(); relireRetouches(); relireReferences();
}
demarrer();
