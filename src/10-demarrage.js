/* ===========================================================================
   10 — DÉMARRAGE, ET L'API DE CONTRÔLE
   `atelier` (son autre nom : `volta`) est ce que les bancs et les contrôles
   pilotent : charger un contrat, obtenir le dessin, l'auditer, ouvrir
   l'exemple, aller de la bibliothèque au plan. L'interface passe par les
   mêmes fonctions — il n'y a qu'un chemin.
   =========================================================================== */
'use strict';

const atelier = {
  /* charge des liaisons et dessine, sans découper en folios : c'est le dessin ENTIER que les bancs mesurent — hors de
     la bibliothèque (aucun plan ne le garde), sur la table */
  charger(liaisons) { app.contrat.liaisons = liaisons.map(liaison); app.source = null; app.nFolios = 0; app.plan = '*'; app.choisi = null; app.planId = '';
    fermerFiche(); montrerLePlan(); redessiner(); return app.dessin; },
  essai() { return atelier.charger(contratEssai()); },
  /* l'exemple embarqué, tel qu'il est livré, avec son profil de charge, comme si on venait de l'ouvrir (sans historique) :
     les batteries qui le lisent le demandent — l'outil, lui, s'ouvre sur la bibliothèque */
  exemple() { ouvrirExemple(true); return app.dessin; },
  /* l'exemple tel que la v73 l'ouvrait : le 10 A du fichier PROPOSÉ en 15 A, pas encore écrit (l'hypothèse « Volta écrit
     lui-même le calibre qui passe » décochée) — les batteries qui jugent la carte de décision le demandent */
  exempleSansCalibreAuto() { HYPOTHESES.calibreAuto = false; if (app.simu) app.simu.calibreAuto = false; ouvrirExemple(true); return app.dessin; },
  /* la bibliothèque (sa racine), et le retour au plan resté sur la table */
  bibliotheque() { montrerBibliotheque('racine'); return BIB.pret; },
  reprendre() { montrerLePlan(); return app.dessin; },
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
const volta = atelier;

function demarrer() {
  typographieVivante(); relireBible(); lierPanneau(); lierPlanche(); lierTable(); lierCarte(); lierBullesDuMenu(); lierEntreesFichiers(); lierBibliotheque();
  // le tableau garde sa taille et sa portée, jamais son état ouvert : on rouvre sur le plan seul, le tableau à la demande (B)
  relireBase();
  // le plan resté sur la table à la fermeture revient, derrière : l'outil s'ouvre sur la BIBLIOTHÈQUE (les installations, leurs
  // plans), jamais sur un contrat qu'on n'a pas choisi — l'exemple est une installation de démonstration, en dernier. Un contrat
  // gardé par une version d'avant la bibliothèque y est rangé dès qu'elle est lue (`chargerBibliotheque`).
  const relu = relire(); if (!relu) redessiner(); BIB.aAdopter = relu;
  montrerBibliotheque('racine'); chargerBibliotheque();
  // la vue que la main avait donnée à ce folio revient (08-interface, `retrouverVue`) ; sinon il se cadre
  requestAnimationFrame(() => retrouverVue());
  // les folios déjà affinés dans ce navigateur reviennent ; les autres s'affinent en arrière-plan ; les retouches aussi
  relireAffines(); relireRetouches(); relireReferences();
  // la base SEE gardée sur ce PC (08 nonies) : elle revient et passe devant les tables de Volta
  relireBaseSEE();
}
demarrer();
