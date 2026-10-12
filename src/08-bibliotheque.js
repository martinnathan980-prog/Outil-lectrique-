/* ===========================================================================
   08 — LA BIBLIOTHÈQUE : les installs et leurs plans, l'ouverture de Volta
   ---------------------------------------------------------------------------
   Le lecteur : « Quand on ouvre, on tombe sur la page d'exemple qui explique :
   on dégage. Il nous faut une bibliothèque : par install (une installation :
   telle antenne, tel cockpit…), on a plein de plans électriques — on les
   sous-traite par install. On choisit notre install et on a directement ses
   plans. »

   L'OUTIL S'OUVRE SUR ELLE, posée sur la table noire (`#bibliotheque`) :
     · la RACINE : une carte par install — son nom, combien de plans, la
       dernière ouverture, le nom de ses premiers plans —, « Nouvelle
       install », une recherche (une install, un plan, un harness, un dessin,
       un appareil) ; le plan resté sur la table se reprend d'un clic ;
       l'Exemple, une install de démonstration, discrète, en dernier ;
     · une INSTALL : ses plans (un plan = un retest : son nom, ses harness et
       ses dessins, ses liaisons, ses folios, sa dernière ouverture), « Ajouter
       un plan » (un ou plusieurs retests, Excel ou CSV, choisis ou déposés) ;
       un clic ouvre le plan sur la table, avec ses folios.
   La barre du haut porte un fil discret : Volta (la bibliothèque) / l'install
   (ses plans) / le plan. Échap remonte d'un cran. Renommer (sur place),
   supprimer (une confirmation dans la page, « Rétablir » juste après),
   déplacer un plan d'une install à une autre : le « ⋯ » de chaque carte et de
   chaque ligne.

   TOUT RESTE DANS CE NAVIGATEUR (IndexedDB « volta-bibliotheque ») : les
   installs, les plans (ce qu'on en montre) et le CONTRAT de chaque plan — ses
   liaisons, ses choix, son cartouche : ce que garde la mémoire du contrat
   (08-interface, `etatDuContrat`), écrit à chaque enregistrement du plan
   ouvert (`garderLePlan`). La bibliothèque vit en mémoire (`BIB`) et s'écrit
   au fil des gestes : tout est immédiat à l'écran.

   LA BASE DES CONTRATS DÉJÀ FAITS la remplit : une colonne d'install
   (Install, Installation, Système — 02-lecture) crée chaque install avec ses
   plans, un par harness (un par dessin quand il n'y a pas de harness) ; sans
   elle, la bibliothèque propose de RANGER ses harness dans une install. La
   base reste la comparaison « Déjà fait » (08-references).

   `atelier.exemple()` ouvre toujours l'exemple tel qu'il est livré ;
   `atelier.bibliotheque()` et `atelier.reprendre()` vont de l'une à l'autre.
   =========================================================================== */
'use strict';

const IDB_BIBLIO = 'volta-bibliotheque', CLE_BIBLIO = 'atelier.bibliotheque.v1';
const ID_EXEMPLE = 'exemple', ID_A_RANGER = 'a-ranger', NOM_A_RANGER = 'À ranger';
/* L'état : ce qui est montré (`vue` : 'racine', 'install' ou 'plan' — la table), l'install montrée, la recherche ; ce qui
   s'écrit sur place (`edition` : { quoi: 'nouvelle'|'install'|'plan', id }), la confirmation d'une suppression
   (`confirme`), le « ⋯ » ouvert (`pop` : { quoi, id, sous }), les fichiers en lecture ou en erreur (`ajouts`), les plans
   tout juste ajoutés (`nouveaux`), le rangement de la base (`ranger`), la corbeille d'un seul geste (`corbeille`). */
const BIB = { pret: false, db: null, garde: true, installs: new Map(), plans: new Map(), supprimes: new Set(), aAdopter: false,
  vue: 'racine', install: '', q: '', edition: null, confirme: null, pop: null, ajouts: [], nouveaux: new Set(), ranger: null, corbeille: null, lie: false };

/* ---- garder : IndexedDB, trois magasins (installs, plans, contrats) ------------------------------------------------- */
function baseBiblio() { if (BIB.db) return BIB.db;
  BIB.db = new Promise((ok, ko) => { try { const r = indexedDB.open(IDB_BIBLIO, 1);
    r.onupgradeneeded = () => ['installs', 'plans', 'contrats'].forEach(m => { if (!r.result.objectStoreNames.contains(m)) r.result.createObjectStore(m); });
    r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); r.onblocked = () => ko(new Error('bibliothèque occupée par un autre onglet')); } catch (e) { ko(e); } });
  BIB.db.catch(() => { BIB.garde = false; }); return BIB.db; }
// écrire (une valeur) ou effacer (sans valeur) ; lire une entrée ; tout un magasin
const ecrireBiblio = (magasin, cle, valeur) => baseBiblio().then(db => { const st = db.transaction(magasin, 'readwrite').objectStore(magasin); if (valeur === undefined) st.delete(cle); else st.put(valeur, cle); }).catch(() => { BIB.garde = false; });
const lireBiblio = (magasin, cle) => baseBiblio().then(db => new Promise(ok => { const r = db.transaction(magasin).objectStore(magasin).get(cle); r.onsuccess = () => ok(r.result || null); r.onerror = () => ok(null); })).catch(() => null);
const toutLireBiblio = magasin => baseBiblio().then(db => new Promise(ok => { const r = db.transaction(magasin).objectStore(magasin).getAll(); r.onsuccess = () => ok(r.result || []); r.onerror = () => ok([]); })).catch(() => []);
const garderInstall = i => ecrireBiblio('installs', i.id, { ...i });
const garderPlan = p => ecrireBiblio('plans', p.id, { ...p });
// ce que l'utilisateur a décidé une fois pour toutes : l'exemple retiré, une base qu'il ne veut pas ranger
function preferencesBiblio() { try { return JSON.parse(localStorage.getItem(CLE_BIBLIO) || '{}') || {}; } catch (_) { return {}; } }
function garderPreferences(o) { try { localStorage.setItem(CLE_BIBLIO, JSON.stringify(o)); } catch (_) { } }

/* ---- les mots ----------------------------------------------------------------------------------------------------- */
const nomAffiche = n => String(n || '').replace(/\.(xlsx|xlsm|xls|csv|tsv|txt)$/i, '').trim() || 'Sans nom';
const cleTexte = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const nPlans = n => n ? plurielLie(n, 'plan') : 'aucun plan';
const leJour = t => { if (!t) return ''; const d = new Date(t), auj = new Date(); return 'le ' + deux(d.getDate()) + '/' + deux(d.getMonth() + 1) + (d.getFullYear() !== auj.getFullYear() ? '/' + d.getFullYear() : ''); };
const nouvelId = p => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function grouper(xs, f) { const m = new Map(); xs.forEach(x => { const k = f(x); (m.get(k) || m.set(k, []).get(k)).push(x); }); return m; }
const ICONES_BI = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  plan: '<rect x="4.5" y="3.5" width="15" height="17" rx="1.5"/><path d="M4.5 15.5h15M12 15.5v5"/>',
  install: '<path d="M8 3.5h10a1.5 1.5 0 0 1 1.5 1.5v12.5"/><rect x="4.5" y="6.5" width="12" height="14" rx="1.5"/><path d="M4.5 16h12"/>',
  loupe: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  depot: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  retour: '<path d="m14.5 6-6 6 6 6"/>',
  points: '<circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  reprendre: '<path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4"/>',
  ouvrir: '<path d="M5 12h13M13 7l5 5-5 5"/>',
  renommer: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  deplacer: '<path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M10 13.5h6M13.5 11l2.5 2.5-2.5 2.5"/>',
  supprimer: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  base: '<ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>',
  fermer: '<path d="M6 6l12 12M18 6 6 18"/>'
};
const icoBi = (k, cls) => `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONES_BI[k]}</svg>`;

/* ---- ce que la bibliothèque sait d'un plan -------------------------------------------------------------------------- */
/* Le résumé d'un contrat (gardé ou neuf) : combien de liaisons, de folios, ses harness, ses dessins, son appareil — ce que
   la carte et la ligne disent, et ce que la recherche lit. */
function resumeDe(o) { const V = o.source || o.liaisons || [], L = o.liaisons || [], d = k => [...new Set(V.map(l => l[k]).filter(Boolean))];
  const fwds = d('fwd'), harness = d('harness');
  return { n: V.length, folios: V.length ? Math.max(1, plansDe(L).length) : 0, harness: harness.slice(0, 8), nHarness: harness.length, fwds: fwds.slice(0, 12), dessins: fwds.length, appareil: d('appareil')[0] || '' }; }
const estDemo = id => { const i = BIB.installs.get(id); return !!(i && i.demo); };
const installsVraies = () => [...BIB.installs.values()].filter(i => !i.demo);
const plansDeInstall = id => [...BIB.plans.values()].filter(p => p.install === id).sort((a, b) => triNaturel(nomAffiche(a.nom), nomAffiche(b.nom)));
const plansVrais = () => [...BIB.plans.values()].filter(p => !estDemo(p.install));
const installsTriees = () => [...BIB.installs.values()].sort((a, b) => (!!a.demo - !!b.demo) || (a.id === ID_A_RANGER) - (b.id === ID_A_RANGER) || triNaturel(a.nom, b.nom));
const vueLe = i => Math.max(i.vu || 0, ...plansDeInstall(i.id).map(p => p.vu || 0));
const planSurLaTable = () => verite().length > 0;
const bibliothequeOuverte = () => BIB.vue !== 'plan';

/* ---- créer, ranger ---------------------------------------------------------------------------------------------------- */
function creerInstall(nom, o) { const i = { id: nouvelId('i'), nom: String(nom || '').trim() || 'Sans nom', cree: Date.now(), vu: 0, ...(o || {}) };
  BIB.installs.set(i.id, i); BIB.supprimes.delete(i.id); garderInstall(i); return i; }
const installNommee = nom => { const k = cleTexte(nom); return installsVraies().find(i => cleTexte(i.nom) === k) || null; };
// « À ranger » : là où va ce qui n'a pas d'install (un fichier ouvert hors de toute install, un contrat d'avant la bibliothèque)
const installARanger = () => BIB.installs.get(ID_A_RANGER) || creerInstall(NOM_A_RANGER, { id: ID_A_RANGER });
/* Un plan : son install, son nom, son résumé ; son contrat, quand on le donne (`liaisons`), se garde « neuf » — à sa
   première ouverture il se charge comme un fichier (les folios se découpent s'il le faut, les choix partent de zéro). */
function creerPlan(installId, nom, liaisons, o) { o = o || {}; const t = Date.now();
  const p = { id: o.id || nouvelId('p'), install: installId, nom: String(nom || '').trim() || 'Sans nom', source: o.source || 'fichier', cree: t, vu: 0, modifie: t, ...resumeDe({ liaisons: liaisons || [] }) };
  BIB.plans.set(p.id, p); BIB.supprimes.delete(p.id); garderPlan(p);
  if (liaisons && o.contrat !== false) ecrireBiblio('contrats', p.id, { planId: p.id, nom: p.nom, liaisons: liaisons.map(l => ({ ...l })), neuf: true, t });
  return p; }
/* L'install où va un plan neuf : celle qu'on regarde, sinon celle du plan sur la table, sinon « À ranger » — jamais
   l'Exemple, qui reste tel qu'il est livré. */
function installCible() { const vue = BIB.vue === 'install' && BIB.installs.get(BIB.install); if (vue && !vue.demo) return vue.id;
  const p = BIB.plans.get(app.planId), i = p && BIB.installs.get(p.install); return i && !i.demo ? i.id : ''; }
const installCourante = () => installCible() || installARanger().id;
// son nom, sans la créer (« À ranger » n'existe qu'une fois qu'un plan y va)
const nomInstallCible = () => { const i = BIB.installs.get(installCible()); return i ? i.nom : NOM_A_RANGER; };
function marquerVu(p) { const t = Date.now(); p.vu = t; garderPlan(p); const i = BIB.installs.get(p.install); if (i) { i.vu = t; garderInstall(i); } }
/* L'exemple : une install de démonstration, un plan — créés au premier lancement, recréés quand on le demande (le menu,
   `atelier.exemple()`) même après qu'on l'a retiré. */
function assurerExemple(demande) { const pref = preferencesBiblio();
  if (pref.exempleRetire && !demande) return null;
  if (pref.exempleRetire) { delete pref.exempleRetire; garderPreferences(pref); }
  if (!BIB.installs.has(ID_EXEMPLE)) creerInstall('Exemple', { id: ID_EXEMPLE, demo: true });
  let p = BIB.plans.get(ID_EXEMPLE);
  if (!p) { p = { id: ID_EXEMPLE, install: ID_EXEMPLE, nom: NOM_EXEMPLE, source: 'exemple', cree: Date.now(), vu: 0, modifie: 0, ...resumeDe({ liaisons: contratExemple() }) }; BIB.plans.set(p.id, p); BIB.supprimes.delete(p.id); garderPlan(p); }
  return p; }
/* LE PLAN QUE DEVIENT UN CONTRAT CHARGÉ (08-interface, `chargerContrat`) : un plan nommé (`planId` : l'exemple, un plan
   qu'on ouvre) ; un plan neuf de l'install courante (`nouveau` : un fichier ouvert sur la table) ; sinon le plan sur la
   table (le collage qui le remplace) — sauf l'exemple, qu'on ne remplace pas : un plan neuf alors. */
function planPour(o, nom, L) { let p;
  if (o.planId) { if (o.planId === ID_EXEMPLE) assurerExemple(true); p = BIB.plans.get(o.planId); if (p) marquerVu(p); return o.planId; }
  if (!o.nouveau && app.planId && app.planId !== ID_EXEMPLE && BIB.plans.has(app.planId)) return app.planId;
  p = creerPlan(installCourante(), nom, L, { contrat: false, source: o.source || 'fichier' }); marquerVu(p); BIB.nouveaux.add(p.id);
  return p.id; }
/* Le plan sur la table vient d'être enregistré (08-interface, `ecrireContrat`) : son contrat et son résumé se gardent. */
function garderLePlan(o) { const p = o.planId && BIB.plans.get(o.planId); if (!p) return;
  Object.assign(p, resumeDe(o), { nom: o.nom || p.nom, modifie: o.t }); garderPlan(p); ecrireBiblio('contrats', p.id, o);
  if (bibliothequeOuverte() && !BIB.edition) rendreContenuBibliotheque(); }

/* ---- lire la bibliothèque au lancement ------------------------------------------------------------------------------- */
/* Ce qui est déjà en mémoire (créé pendant la lecture) l'emporte ; un plan sans install va « À ranger ». Le contrat resté
   sur la table d'une version d'avant la bibliothèque y est rangé (rien ne se perd), l'exemple s'il l'était. */
async function chargerBibliotheque() { const [I, P] = await Promise.all([toutLireBiblio('installs'), toutLireBiblio('plans')]);
  I.forEach(i => { if (i && i.id && !BIB.supprimes.has(i.id) && !BIB.installs.has(i.id)) BIB.installs.set(i.id, i); });
  P.forEach(p => { if (p && p.id && !BIB.supprimes.has(p.id) && !BIB.plans.has(p.id)) BIB.plans.set(p.id, p); });
  BIB.plans.forEach(p => { if (!BIB.installs.has(p.install)) { p.install = installARanger().id; garderPlan(p); } });
  assurerExemple(false);
  if (BIB.aAdopter && verite().length && (!app.planId || !BIB.plans.has(app.planId))) {
    if (app.nom === NOM_EXEMPLE) { assurerExemple(true); app.planId = ID_EXEMPLE; }
    else app.planId = creerPlan(installARanger().id, app.nom || 'Plan sans nom', verite(), { contrat: false }).id;
    sauver(); }
  BIB.aAdopter = false; BIB.pret = true; synchroniserBibliotheque(); if (bibliothequeOuverte()) { rendreBibliotheque(); poser(); } }

/* ---- aller de la bibliothèque au plan, et retour ------------------------------------------------------------------- */
/* Montrer la bibliothèque — la racine, ou une install (`id`). Le plan reste sur la table, dessous : ce qu'on y a fait est
   gardé, ce qui y était ouvert (la fiche, le tableau, la recherche) se ferme. */
function montrerBibliotheque(vue, id) { const venait = BIB.vue === 'plan';
  if (venait) { sauverMaintenant(); quitterLePlan(); }
  if (vue === 'install' && !BIB.installs.has(id)) vue = 'racine';
  if (BIB.vue === 'install' && (vue !== 'install' || id !== BIB.install)) BIB.nouveaux.clear();
  BIB.vue = vue || 'racine'; BIB.install = BIB.vue === 'install' ? id : ''; BIB.pop = null; BIB.edition = null; BIB.confirme = null;
  if (BIB.vue === 'install') { const i = BIB.installs.get(id); i.vu = Date.now(); garderInstall(i); BIB.ranger = null; }
  const el = $('bibliotheque'); el.hidden = false; document.body.classList.add('biblio');
  rendreBibliotheque(); poser(); synchroniserFil(); el.scrollTop = 0; }
function quitterLePlan() { if (app.cible || app.choisi) { app.cible = null; app.choisi = null; eteindre(); peindre(); }
  fermerInspecteur(); fermerBase(); fermerFiche(); fermerRecherche(); fermerMenu(); }
/* Le plan sur la table, la bibliothèque s'efface (un plan ouvert, chargé, repris). */
function montrerLePlan() { if (BIB.vue === 'plan') return; BIB.vue = 'plan'; BIB.pop = null; BIB.edition = null; BIB.confirme = null; BIB.ranger = null; BIB.nouveaux.clear();
  $('bibliotheque').hidden = true; document.body.classList.remove('biblio'); synchroniserBibliotheque(); }
// ce qui porte sur le plan (le récapitulatif, la nomenclature, les exports, le cartouche) le remet sur la table d'abord
const surLePlan = fn => (...a) => { if (bibliothequeOuverte()) { if (!planSurLaTable()) { dire('Aucun plan ouvert : choisissez une install, puis un plan.'); return; } montrerLePlan(); } return fn(...a); };
/* OUVRIR UN PLAN : le sien, tel qu'on l'a laissé (ses liaisons, ses choix, son folio) ; un plan jamais ouvert se charge
   comme un fichier ; l'exemple jamais ouvert, tel qu'il est livré. Ctrl+Z part de là. */
async function ouvrirPlan(id) { const p = BIB.plans.get(id); if (!p) return; marquerVu(p);
  if (app.planId === id && planSurLaTable()) { montrerLePlan(); return; }
  sauverMaintenant(); const o = await lireBiblio('contrats', id);
  if (!o && id === ID_EXEMPLE) { ouvrirExemple(true); return; }
  if (!o || !o.liaisons) { dire(guillemets(nomAffiche(p.nom)) + ' n’a plus ses liaisons dans ce navigateur.', true); return; }
  if (o.neuf) { chargerContrat(o.liaisons, 'ouverture de ' + p.nom, p.nom, { planId: id }); app.hist = []; synchroniserHistorique(); return; }
  poserEtat({ ...o, planId: id }); app.hist = []; app.base.filtre = ''; app.base.tri = null; app.base.enSaisie = false; $('q').value = '';
  fermerFiche(); fermerMenu(); montrerLePlan(); redessiner(); ajuster(); heureSauve(o.t); sauver(); }
// la table vide : le plan qu'elle portait vient d'être supprimé
function viderLaTable() { app.contrat = contratNeuf(); app.source = null; app.nFolios = 0; app.plan = '*'; app.nom = ''; app.planId = ''; app.cible = null; app.choisi = null; app.hist = [];
  redessiner(); sauver(); }

/* ---- les gestes : renommer, supprimer (et rétablir), déplacer ------------------------------------------------------- */
function renommerInstall(id, nom) { const i = BIB.installs.get(id); nom = String(nom || '').trim(); if (!i || !nom || nom === i.nom) return;
  const deja = installNommee(nom); if (deja && deja.id !== id) { dire(guillemets(deja.nom) + ' existe déjà : choisissez un autre nom.', true); return; }
  i.nom = nom; garderInstall(i); synchroniserFil(); }
function renommerPlan(id, nom) { const p = BIB.plans.get(id); nom = String(nom || '').trim(); if (!p || !nom || nom === nomAffiche(p.nom)) return;
  p.nom = nom; garderPlan(p); if (app.planId === id) { app.nom = nom; synchroniserContexte(); sauver(); } }
/* Supprimer : le plan (ou l'install et tous ses plans) quitte la bibliothèque et ce navigateur ; le mot qui passe offre
   « Rétablir » le temps de le lire. Le plan sur la table, s'il en était, la quitte aussi. */
async function supprimer(quoi, id) { const ids = quoi === 'install' ? plansDeInstall(id).map(p => p.id) : [id], i = quoi === 'install' ? BIB.installs.get(id) : null;
  const plans = ids.map(k => BIB.plans.get(k)).filter(Boolean), nom = quoi === 'install' ? (i ? i.nom : '') : nomAffiche((plans[0] || {}).nom);
  if (ids.includes(app.planId)) viderLaTable();
  ids.forEach(k => { BIB.plans.delete(k); BIB.supprimes.add(k); });
  if (i) { BIB.installs.delete(id); BIB.supprimes.add(id); if (i.demo) { const pref = preferencesBiblio(); pref.exempleRetire = true; garderPreferences(pref); } }
  BIB.confirme = null; BIB.pop = null;
  if (quoi === 'install' && BIB.vue === 'install' && BIB.install === id) montrerBibliotheque('racine'); else rendreBibliotheque();
  const contrats = await Promise.all(ids.map(k => lireBiblio('contrats', k)));
  ids.forEach(k => { ecrireBiblio('plans', k); ecrireBiblio('contrats', k); }); if (i) ecrireBiblio('installs', id);
  BIB.corbeille = { install: i, plans, contrats };
  direAvecGeste(guillemets(nom) + (quoi !== 'install' ? ' supprimé.' : i && i.demo ? ' retiré : le menu Plus le rouvre.' : plans.length ? ' et ses ' + pluriel(plans.length, 'plan') + ' supprimés.' : ' supprimée.'), 'Rétablir', retablir); }
function retablir() { const C = BIB.corbeille; if (!C) return; BIB.corbeille = null;
  if (C.install) { BIB.installs.set(C.install.id, C.install); BIB.supprimes.delete(C.install.id); garderInstall(C.install); if (C.install.demo) { const pref = preferencesBiblio(); delete pref.exempleRetire; garderPreferences(pref); } }
  C.plans.forEach((p, k) => { if (!BIB.installs.has(p.install)) p.install = installARanger().id; BIB.plans.set(p.id, p); BIB.supprimes.delete(p.id); garderPlan(p); if (C.contrats[k]) ecrireBiblio('contrats', p.id, C.contrats[k]); });
  rendreBibliotheque(); dire('Rétabli.'); }
// le mot qui passe, avec un geste (« Rétablir ») : il reste le temps de le lire, et tant qu'on le survole
function direAvecGeste(msg, libelle, fn) { dire(msg); const t = $('toast'), b = document.createElement('button'); b.type = 'button'; b.className = 'toast-voir'; b.textContent = libelle;
  b.addEventListener('click', () => { t.classList.remove('on', 'action'); fn(); }); t.appendChild(b); t.classList.add('action'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on', 'action'), 9000); }
function deplacerPlan(id, versId) { const p = BIB.plans.get(id); if (!p || p.install === versId) return;
  let v = BIB.installs.get(versId), neuve = false;
  if (!v) { let n = 'Nouvelle install', k = 1; while (installNommee(n)) n = 'Nouvelle install ' + (++k); v = creerInstall(n); neuve = true; }
  p.install = v.id; garderPlan(p); BIB.pop = null;
  if (neuve) { montrerBibliotheque('install', v.id); BIB.edition = { quoi: 'install', id: v.id }; rendreBibliotheque(); }
  else rendreBibliotheque();
  dire(guillemets(nomAffiche(p.nom)) + ' est rangé dans ' + guillemets(v.nom) + (neuve ? ' : nommez-la.' : '.')); synchroniserFil(); }
function nouvelleInstall(nom) { nom = String(nom || '').trim(); if (!nom) return null;
  const deja = installNommee(nom); if (deja) { dire(guillemets(deja.nom) + ' existe déjà : la voici.'); montrerBibliotheque('install', deja.id); return deja; }
  const i = creerInstall(nom); montrerBibliotheque('install', i.id); return i; }

/* ---- ajouter des plans : un ou plusieurs retests ------------------------------------------------------------------- */
/* Un fichier → ses plans : un retest en donne un (plusieurs harness : un par harness) ; une bible ou une norme déposée
   ici va à sa place (08-fichiers, `rangerAilleurs`) ; le reste se dit dans sa ligne, en clair (un tableau sans les en-têtes
   du retest peut encore se deviner, dans « Vos fichiers »). */
async function plansDuFichier(f) { const nom = f.name || 'le fichier', L = await lireLeFichier(f);
  if (L.erreur) return { erreur: texteBrut(L.erreur.texte) };
  if (!trouverEnteteRetest(L.brutes)) { if (await rangerAilleurs(L, nom, f)) return { plans: [] };
    return { erreur: nom + ' n’a pas les en-têtes du retest : il me faut au moins Device1, Pin1, Device2 et Pin2.', lu: L }; }
  const r = lireTexte(L.texte); if (!r.liaisons.length) return { erreur: nom + ' : les en-têtes du retest sont là, mais aucune liaison dessous.' };
  if (r.harnais.length > 1) return { plans: r.harnais.map(h => ({ nom: h, liaisons: r.liaisons.filter(l => l.harness === h) })) };
  return { plans: [{ nom, liaisons: r.liaisons }] }; }
/* AJOUTER DES PLANS à une install (celle qu'on regarde, sinon l'install courante) : chaque fichier se lit dans sa ligne
   (« Lecture… »), puis devient un plan — marqué « nouveau » — ou dit ce qui ne va pas. Rien ne s'ouvre : un clic le fera. */
async function ajouterPlans(fichiers, installId) { fichiers = [...(fichiers || [])].filter(Boolean); if (!fichiers.length) return;
  const id = installId && BIB.installs.has(installId) && !estDemo(installId) ? installId : installCourante();
  if (!(BIB.vue === 'install' && BIB.install === id)) montrerBibliotheque('install', id);
  const ins = BIB.installs.get(id), faits = [];
  for (const f of fichiers) { const a = { id: nouvelId('a'), nom: f.name || 'fichier', etat: 'lecture' }; BIB.ajouts.push(a); rendreContenuBibliotheque();
    let r; try { r = await plansDuFichier(f); } catch (e) { r = { erreur: a.nom + ' n’a pas pu être lu : ' + String(e && e.message || e) + '.' }; }
    if (r.erreur) { a.etat = 'ko'; a.texte = r.erreur; a.lu = r.lu || null; rendreContenuBibliotheque(); continue; }
    BIB.ajouts.splice(BIB.ajouts.indexOf(a), 1);
    r.plans.forEach(x => { const p = creerPlan(id, x.nom, x.liaisons, { source: 'fichier' }); BIB.nouveaux.add(p.id); faits.push(p); });
    rendreContenuBibliotheque(); }
  rendreBibliotheque(); const p = faits[0];
  // un plan : ce qu'il porte ; plusieurs : combien
  if (faits.length === 1) dire(guillemets(nomAffiche(p.nom)) + ' ajouté à ' + guillemets(ins.nom) + ' : ' + plurielLie(p.n, 'liaison') + ', ' + plurielLie(p.folios, 'folio') + ' — un clic l’ouvre.');
  else if (faits.length) dire(pluriel(faits.length, 'plan') + ' ajoutés à ' + guillemets(ins.nom) + ' — un clic en ouvre un.'); }

/* ---- la base des contrats déjà faits dans la bibliothèque ------------------------------------------------------------ */
/* Une base qui dit l'install de chaque ligne crée chaque install (ou la retrouve, par son nom) avec ses plans : un par
   harness, un par dessin quand la base n'a pas de harness. Redéposée, elle remplace les plans qu'elle avait créés (sauf
   celui qui est sur la table). Rend { installs, nouvelles, plans }, ou null quand la base ne dit pas d'install. */
function rangerLaBase(L, nomBase) { const avec = (L || []).filter(l => l.install); if (!avec.length) { synchroniserBibliotheque(); if (bibliothequeOuverte()) rendreBibliotheque(); return null; }
  const parInstall = grouper(avec, l => l.install); let nouvelles = 0, n = 0;
  parInstall.forEach((Li, nomI) => { let ins = installNommee(nomI); if (!ins) { ins = creerInstall(nomI); nouvelles++; }
    const parH = grouper(Li, l => l.harness || ''), G = parH.size === 1 && parH.has('') ? grouper(Li, l => fwdDe(l) || '') : parH;
    G.forEach((Lp, k) => { const nom = k || nomI, deja = plansDeInstall(ins.id).find(p => p.source === 'base' && p.nom === nom);
      if (deja && deja.id === app.planId) return;
      if (deja) { Object.assign(deja, resumeDe({ liaisons: Lp }), { modifie: Date.now(), base: nomBase || '' }); garderPlan(deja); ecrireBiblio('contrats', deja.id, { planId: deja.id, nom, liaisons: Lp.map(l => ({ ...l })), neuf: true, t: Date.now() }); }
      else { const p = creerPlan(ins.id, nom, Lp, { source: 'base' }); p.base = nomBase || ''; garderPlan(p); }
      n++; }); });
  synchroniserBibliotheque(); if (bibliothequeOuverte()) rendreBibliotheque();
  return { installs: parInstall.size, nouvelles, plans: n }; }
/* Les harness de la base, et ceux qu'aucun plan de la bibliothèque ne porte encore. */
function harnessDeLaBase() { const I = indexReferences(); if (!I) return [];
  const ranges = new Set(plansVrais().filter(p => p.source === 'base').flatMap(p => p.harness || []));
  return [...I.harnais.values()].map(h => ({ h: h.harness, appareil: h.appareil, retest: h.retest, dessins: h.dessins.length, n: h.liaisons.length, range: ranges.has(h.harness) })).sort((a, b) => triNaturel(a.h, b.h)); }
const aRanger = () => harnessDeLaBase().filter(x => !x.range && x.h !== '—');
function ouvrirRanger() { const xs = aRanger(), H = harnessDeLaBase(); if (!H.length) return;
  BIB.ranger = { coches: new Set((xs.length ? xs : H).map(x => x.h)), par: 'harness', vers: '', nom: (app.references && app.references.nom ? nomAffiche(app.references.nom) : 'Contrats déjà faits') };
  if (BIB.vue !== 'racine') montrerBibliotheque('racine'); else rendreBibliotheque();
  setTimeout(() => { const r = document.querySelector('#bibliotheque .bi-ranger'); if (r && r.scrollIntoView) r.scrollIntoView({ block: 'nearest' }); }, 0); }
/* Ranger : chaque harness coché devient un plan (ou ses dessins, un plan chacun) de l'install choisie, ou d'une neuve. */
function rangerOk() { const R = BIB.ranger, I = indexReferences(); if (!R || !I || !R.coches.size) return;
  let ins = R.vers ? BIB.installs.get(R.vers) : null; if (!ins) ins = installNommee(R.nom) || creerInstall(R.nom || 'Contrats déjà faits');
  let n = 0;
  [...R.coches].sort(triNaturel).forEach(h => { const H = I.harnais.get(h); if (!H) return;
    const G = R.par === 'fwd' ? grouper(H.liaisons, l => fwdDe(l) || h) : new Map([[h, H.liaisons]]);
    G.forEach((Lp, nom) => { const p = creerPlan(ins.id, nom, Lp, { source: 'base' }); p.base = app.references.nom || ''; garderPlan(p); BIB.nouveaux.add(p.id); n++; }); });
  BIB.ranger = null; montrerBibliotheque('install', ins.id);
  dire(pluriel(n, 'plan') + ' rangé' + (n > 1 ? 's' : '') + ' dans ' + guillemets(ins.nom) + '.'); }

/* ---- l'écran ----------------------------------------------------------------------------------------------------------- */
const chercheBiHtml = ph => `<label class="bi-cherche">${icoBi('loupe')}<input id="bi-q" type="search" value="${escA(BIB.q)}" placeholder="${escA(ph)}" aria-label="${escA(ph)}" autocomplete="off" spellcheck="false"><kbd aria-hidden="true">/</kbd></label>`;
// un plan correspond à la recherche par son nom, ses harness, ses dessins, son appareil ; une install par son nom ou l'un de ses plans
const planCorrespond = (p, t) => !t || [p.nom, p.appareil, ...(p.harness || []), ...(p.fwds || [])].some(x => cleTexte(x).includes(t));
const installCorrespond = (i, t) => !t || cleTexte(i.nom).includes(t) || plansDeInstall(i.id).some(p => planCorrespond(p, t));
/* L'écran entier : la tête (son titre, ses comptes, la recherche, l'action), puis le contenu, qui se refait seul quand on
   cherche (`rendreContenuBibliotheque`) — le champ garde le clavier. */
function rendreBibliotheque() { const el = $('bi-page'); if (!el || BIB.vue === 'plan') return;
  if (!BIB.pret) { el.innerHTML = ''; return; }
  el.innerHTML = (BIB.vue === 'install' ? teteInstallHtml() : teteRacineHtml()) + `<div class="bi-contenu" id="bi-contenu">${contenuHtml()}</div>`;
  // ce que dit la bibliothèque quand on y glisse un fichier : où il va
  $('bibliotheque').dataset.depotDit = 'Déposez vos retests : ils deviennent des plans de ' + guillemets(nomInstallCible());
  apresRendu(); }
// l'arrivée sur une vue : les cartes et la feuille se posent (une fois, pas à chaque lettre cherchée)
function poser() { const p = $('bi-page'); if (!p || mouvementReduit()) return; p.classList.remove('bi-entre'); void p.offsetWidth; p.classList.add('bi-entre');
  clearTimeout(BIB.poseT); BIB.poseT = setTimeout(() => p.classList.remove('bi-entre'), 700); }
function rendreContenuBibliotheque() { const c = $('bi-contenu'); if (!c || BIB.vue === 'plan' || !BIB.pret) return; c.innerHTML = contenuHtml(); apresRendu(); }
const contenuHtml = () => BIB.vue === 'install' ? installHtml() : racineHtml();
// ce qui s'écrit sur place prend le clavier ; le « ⋯ » ouvert, sa première ligne
function apresRendu() { const champ = document.querySelector('#bibliotheque .bi-nommer input'); if (champ && document.activeElement !== champ) { champ.focus(); champ.select(); return; }
  const pop = document.querySelector('#bibliotheque .bi-pop'); if (pop && !pop.contains(document.activeElement)) { const b = pop.querySelector('button'); if (b) b.focus(); return; }
  const oui = document.querySelector('#bibliotheque .bi-confirme [data-bi="oui"]'); if (oui && document.activeElement !== oui && !document.querySelector('#bibliotheque .bi-confirme').contains(document.activeElement)) oui.focus(); }

/* LA RACINE : ses comptes, la recherche, « Nouvelle install » ; le plan resté sur la table ; la base à ranger ; les
   cartes ; les plans qui répondent à la recherche ; l'Exemple, discret. */
function teteRacineHtml() { const V = installsVraies(), nP = plansVrais().length;
  return `<header class="bi-tete"><div class="bi-titres"><h1 class="bi-titre">Bibliothèque</h1>`
    + `<p class="bi-compte">${V.length ? esc(lies([plurielLie(V.length, 'install'), plurielLie(nP, 'plan')])) : 'Vos installs et leurs plans'}${BIB.garde ? '' : ' · <span class="bi-pas-garde">pas gardée dans ce navigateur</span>'}</p></div>`
    // rien encore : la tête n'a que son titre, le vide dit comment commencer
    + (V.length ? `<div class="bi-outils">${chercheBiHtml('Chercher une install, un plan…')}<button class="bi-btn" id="bi-nouvelle" data-bi="nouvelle">${icoBi('plus')}<span>Nouvelle install</span></button></div>` : '') + '</header>'; }
function racineHtml() { const t = cleTexte(BIB.q), toutes = installsTriees(), I = toutes.filter(i => installCorrespond(i, t)), vraies = I.filter(i => !i.demo), demo = I.filter(i => i.demo);
  const rien = !installsVraies().length && !t;
  let h = reprendreHtml() + bandeauBaseHtml() + rangerHtml();
  if (rien && !(BIB.edition && BIB.edition.quoi === 'nouvelle')) h += videHtml();
  else { const nouvelle = BIB.edition && BIB.edition.quoi === 'nouvelle' ? carteNouvelleHtml() : '';
    h += vraies.length || nouvelle ? `<div class="bi-grille" role="list">${nouvelle}${vraies.map(carteInstallHtml).join('')}</div>` : t ? `<p class="bi-rien">Aucune install ne répond à ${esc(guillemets(BIB.q))}.</p>` : '';
    if (t) { const P = [...BIB.plans.values()].filter(p => planCorrespond(p, t)).sort((a, b) => triNaturel(nomAffiche(a.nom), nomAffiche(b.nom)));
      if (P.length) h += `<h2 class="bi-sous">Plans · ${P.length}</h2><div class="bi-feuille">${listePlansHtml(P.slice(0, 60), true)}</div>`; } }
  if (demo.length) h += `<div class="bi-grille bi-grille-demo" role="list">${demo.map(carteInstallHtml).join('')}</div>`;
  return h; }
// le plan resté sur la table : on le reprend d'un clic (Échap aussi)
function reprendreHtml() { if (!planSurLaTable()) return ''; const p = BIB.plans.get(app.planId), i = p && BIB.installs.get(p.install), V = verite(), P = plans().length;
  return `<button class="bi-reprendre" id="bi-reprendre" data-bi="reprendre">${icoBi('reprendre')}<span class="bi-rep-mot">Reprendre</span><span class="bi-rep-nom">${i ? `<span>${esc(i.nom)}</span><i>/</i>` : ''}<b>${esc(nomAffiche(app.nom))}</b></span><span class="bi-rep-n">${esc(lies([plurielLie(V.length, 'liaison'), P > 1 ? plurielLie(P, 'folio') : '']))}</span><kbd>Échap</kbd></button>`; }
// rien encore : ce qu'est une install, en une phrase, et les deux façons de commencer
function videHtml() { return `<section class="bi-vide"><span class="bi-vide-ico">${icoBi('install')}</span><h2>Aucune install pour l’instant</h2>`
  + `<p>Une install, c’est une installation — une antenne, un cockpit… — et tous ses plans : un plan par retest.</p>`
  + `<div class="bi-vide-gestes"><button class="bi-btn" data-bi="nouvelle">${icoBi('plus')}<span>Nouvelle install</span></button><button class="bi-btn bi-btn-2" data-bi="base">${icoBi('base')}<span>Déposer la base des contrats déjà faits</span></button></div>`
  + `<p class="bi-vide-note">La base range chaque install avec ses plans quand elle a une colonne Install. Un retest glissé ici va dans « ${NOM_A_RANGER} ».</p></section>`; }
/* Une carte d'install : une pile de feuilles (deux ou trois selon ses plans), son nom, ses comptes, ses premiers plans ;
   le « ⋯ » (renommer, supprimer) ; renommée sur place ; la confirmation d'une suppression s'écrit dedans. */
function carteInstallHtml(i) { const P = plansDeInstall(i.id), vu = vueLe(i), pile = P.length >= 3 ? 3 : P.length, t = cleTexte(BIB.q);
  const edite = BIB.edition && BIB.edition.quoi === 'install' && BIB.edition.id === i.id, confirme = BIB.confirme && BIB.confirme.quoi === 'install' && BIB.confirme.id === i.id;
  const meta = i.demo ? lies(['démonstration', P[0] ? plurielLie(P[0].n, 'liaison') : '']) : lies([nPlans(P.length), vu ? 'ouverte ' + quand(vu) : 'créée ' + leJour(i.cree)]);
  const montres = (t ? P.filter(p => planCorrespond(p, t)) : P).slice(0, 4);
  const noms = P.length ? `<span class="bi-carte-plans">${montres.map(p => `<span class="bi-pn">${esc(nomAffiche(p.nom))}</span>`).join('')}${P.length > montres.length ? `<span class="bi-pn-plus">+${P.length - montres.length}</span>` : ''}</span>` : `<span class="bi-carte-plans bi-carte-plans-vide">aucun plan : un clic, puis déposez vos retests</span>`;
  if (confirme) return `<article class="bi-carte bi-confirmant pile-${pile}" role="listitem" data-install="${escA(i.id)}">${confirmeInstallHtml(i, P)}</article>`;
  return `<article class="bi-carte${i.demo ? ' bi-demo' : ''} pile-${pile}${BIB.pop && BIB.pop.id === i.id ? ' bi-pop-ouvert' : ''}" role="listitem" data-install="${escA(i.id)}">`
    + (edite ? `<div class="bi-carte-corps">${nommerHtml('install', i.id, i.nom, 'Nom de l’install')}<span class="bi-carte-meta">${esc(meta)}</span></div>`
      : `<button class="bi-carte-corps" data-bi="install" data-id="${escA(i.id)}" aria-label="${escA(i.nom + ' : ' + meta)}"><span class="bi-carte-ico">${icoBi(i.demo ? 'plan' : 'install')}</span><span class="bi-carte-nom">${esc(i.nom)}</span><span class="bi-carte-meta">${esc(meta)}</span>${i.demo ? '' : noms}</button>`)
    + (edite ? '' : `<button class="bi-plus" data-bi="pop" data-quoi="install" data-id="${escA(i.id)}" aria-label="${escA('Gestes pour ' + i.nom)}" aria-haspopup="menu" aria-expanded="${!!(BIB.pop && BIB.pop.id === i.id)}">${icoBi('points')}</button>`)
    + popHtml('install', i) + '</article>'; }
function carteNouvelleHtml() { return `<article class="bi-carte bi-carte-neuve" role="listitem"><div class="bi-carte-corps">${nommerHtml('nouvelle', '', '', 'Antenne VHF, Cockpit…')}<span class="bi-carte-meta">Entrée pour la créer · Échap pour renoncer</span></div></article>`; }
// le champ qui nomme sur place : Entrée garde, Échap renonce (un clic ailleurs garde aussi)
const nommerHtml = (quoi, id, val, ph) => `<span class="bi-nommer"><input id="${quoi === 'nouvelle' ? 'bi-nom-nouvelle' : 'bi-nom'}" data-nommer="${quoi}" data-id="${escA(id)}" value="${escA(val)}" placeholder="${escA(ph)}" aria-label="${escA(quoi === 'plan' ? 'Nom du plan' : 'Nom de l’install')}" autocomplete="off" spellcheck="false"></span>`;
// supprimer une install : ses plans partent avec elle ; l'Exemple, lui, se retire (le menu Plus le rouvre)
const confirmeInstallHtml = (i, P) => confirmeHtml('install', i.id, i.demo ? 'Retirer l’exemple ?' : 'Supprimer ' + guillemets(i.nom) + ' ?',
  i.demo ? 'Le menu Plus le rouvre quand vous voulez.' : P.length ? 'Ses ' + pluriel(P.length, 'plan') + ' partent avec elle, et ce qu’on y a fait.' : 'Elle est vide.');
// la confirmation d'une suppression, dans la carte ou la ligne : la phrase, « Supprimer », « Annuler »
const confirmeHtml = (quoi, id, titre, sous) => `<div class="bi-confirme" role="alertdialog" aria-label="${escA(titre)}"><p><b>${esc(titre)}</b> ${esc(sous)}</p><div class="bi-confirme-gestes"><button class="bi-danger" data-bi="oui" data-quoi="${quoi}" data-id="${escA(id)}">${icoBi('supprimer')}<span>${quoi === 'install' && estDemo(id) ? 'Retirer' : 'Supprimer'}</span></button><button class="bi-non" data-bi="non">Annuler</button></div></div>`;
/* Le « ⋯ » : une petite liste sous le bouton. Une install : renommer, supprimer. Un plan : ouvrir, renommer, déplacer vers
   une autre install (la liste, ou une neuve), supprimer. L'exemple : le retirer. */
function popHtml(quoi, x) { if (!(BIB.pop && BIB.pop.quoi === quoi && BIB.pop.id === x.id)) return '';
  const ligne = (bi, ico, mot, extra) => `<button role="menuitem" data-bi="${bi}" data-quoi="${quoi}" data-id="${escA(x.id)}"${extra || ''}>${icoBi(ico)}<span>${mot}</span></button>`;
  if (quoi === 'install') return `<div class="bi-pop" role="menu">${x.demo ? ligne('supprimer', 'supprimer', 'Retirer l’exemple', ' class="danger"') : ligne('renommer', 'renommer', 'Renommer') + ligne('supprimer', 'supprimer', 'Supprimer…', ' class="danger"')}</div>`;
  if (BIB.pop.sous === 'deplacer') { const autres = installsVraies().filter(i => i.id !== x.install).sort((a, b) => triNaturel(a.nom, b.nom));
    return `<div class="bi-pop" role="menu"><button role="menuitem" class="bi-pop-retour" data-bi="pop-retour" data-quoi="plan" data-id="${escA(x.id)}">${icoBi('retour')}<span>Déplacer vers…</span></button>${autres.map(i => `<button role="menuitem" data-bi="deplacer-vers" data-id="${escA(x.id)}" data-vers="${escA(i.id)}">${icoBi('install')}<span>${esc(i.nom)}</span></button>`).join('')}<button role="menuitem" data-bi="deplacer-vers" data-id="${escA(x.id)}" data-vers="">${icoBi('plus')}<span>Une nouvelle install</span></button></div>`; }
  return `<div class="bi-pop" role="menu">${ligne('plan', 'ouvrir', 'Ouvrir')}${ligne('renommer', 'renommer', 'Renommer')}${ligne('deplacer', 'deplacer', 'Déplacer vers…')}${ligne('supprimer', 'supprimer', 'Supprimer…', ' class="danger"')}</div>`; }

/* UNE INSTALL : son nom (un clic le renomme), ses comptes, la recherche, « Ajouter un plan », le « ⋯ » ; puis la feuille
   de ses plans, la zone de dépôt en bas — elle seule quand l'install est vide, avec ce qu'elle attend en une ligne. */
function teteInstallHtml() { const i = BIB.installs.get(BIB.install), P = plansDeInstall(i.id), n = P.reduce((k, p) => k + (p.n || 0), 0);
  const edite = BIB.edition && BIB.edition.quoi === 'install' && BIB.edition.id === i.id;
  return `<header class="bi-tete"><div class="bi-titres"><button class="bi-retour" id="bi-retour" data-bi="racine" aria-label="Retour à la bibliothèque">${icoBi('retour')}<span>Bibliothèque</span></button>`
    + (edite ? `<h1 class="bi-titre">${nommerHtml('install', i.id, i.nom, 'Nom de l’install')}</h1>` : `<h1 class="bi-titre"><button class="bi-titre-nom" data-bi="renommer" data-quoi="install" data-id="${escA(i.id)}" title="${i.demo ? '' : 'Renommer'}"${i.demo ? ' disabled' : ''}>${esc(i.nom)}</button></h1>`)
    + `<p class="bi-compte">${esc(lies([i.demo ? 'démonstration' : '', nPlans(P.length), n ? plurielLie(n, 'liaison') : '', 'créée ' + leJour(i.cree)]))}</p></div>`
    + `<div class="bi-outils">${P.length > 6 ? chercheBiHtml('Chercher un plan, un harness, un dessin') : ''}${i.demo ? '' : `<button class="bi-btn" id="bi-ajouter" data-bi="choisir">${icoBi('plus')}<span>Ajouter un plan</span></button>`}`
    + `<span class="bi-pop-ancre${BIB.pop && BIB.pop.id === i.id ? ' bi-pop-ouvert' : ''}"><button class="bi-plus bi-plus-tete" data-bi="pop" data-quoi="install" data-id="${escA(i.id)}" aria-label="${escA('Gestes pour ' + i.nom)}" aria-haspopup="menu">${icoBi('points')}</button>${popHtml('install', i)}</span></div></header>`
    + (BIB.confirme && BIB.confirme.quoi === 'install' && BIB.confirme.id === i.id ? `<div class="bi-feuille bi-confirme-tete">${confirmeInstallHtml(i, P)}</div>` : ''); }
function installHtml() { const i = BIB.installs.get(BIB.install); if (!i) return ''; const t = cleTexte(BIB.q), P = plansDeInstall(i.id), montres = P.filter(p => planCorrespond(p, t));
  const zone = i.demo ? '' : `<button type="button" class="bi-zone${P.length ? '' : ' bi-zone-grande'}" data-bi="choisir">${icoBi('depot')}<span><b>${P.length ? 'Glissez d’autres retests ici' : 'Glissez vos retests ici'}</b> ou cliquez — plusieurs à la fois</span>${P.length ? '' : '<small>Excel ou CSV, une ligne par fil : <span class="id">Device1</span> · <span class="id">Pin1</span> · <span class="id">Device2</span> · <span class="id">Pin2</span> au moins. Chaque fichier devient un plan.</small>'}</button>`;
  const ajouts = BIB.ajouts.map(a => `<li class="bi-plan bi-ajout ${a.etat}"><span class="bi-ajout-ico" aria-hidden="true"></span><span class="bi-ajout-t">${a.etat === 'lecture' ? 'Lecture de ' + esc(guillemets(a.nom)) + '…' : esc(a.texte)}</span>${a.etat === 'ko' ? `${a.lu ? `<button class="bi-lien" data-bi="deviner" data-a="${escA(a.id)}">Deviner ses colonnes</button>` : ''}<button class="bi-oublier" data-bi="oublier-ajout" data-a="${escA(a.id)}" aria-label="Effacer ce message">${icoBi('fermer')}</button>` : ''}</li>`).join('');
  const note = i.demo ? '<p class="bi-note">L’exemple tel qu’il est livré : 201 liaisons sur 6 folios, pour essayer. Ce qu’on y change reste ici ; le menu Plus le rend neuf.</p>' : '';
  if (!P.length && !ajouts) return note + `<div class="bi-feuille bi-feuille-vide">${zone}</div>`;
  return note + `<div class="bi-feuille" data-depot="plans">${ajouts ? `<ul class="bi-plans bi-ajouts">${ajouts}</ul>` : ''}${montres.length ? listePlansHtml(montres, false) : t ? `<p class="bi-rien bi-rien-feuille">Aucun plan ne répond à ${esc(guillemets(BIB.q))}.</p>` : ''}${zone}</div>`; }
/* La liste des plans : l'en-tête des colonnes, puis une ligne par plan — sa feuille, son nom (« sur la table », « nouveau »),
   ses harness et dessins, ses liaisons, ses folios, sa dernière ouverture, le « ⋯ ». `avecInstall` : la recherche de la
   racine dit aussi l'install de chacun. */
function listePlansHtml(P, avecInstall) {
  return `<div class="bi-ligne bi-entetes" aria-hidden="true"><span></span><span>Plan</span><span>${avecInstall ? 'Install · harness · dessins' : 'Harness · dessins'}</span><span class="d">Liaisons</span><span class="d">Folios</span><span>Ouvert</span></div>`
    + `<ul class="bi-plans" role="list">${P.map(p => lignePlanHtml(p, avecInstall)).join('')}</ul>`; }
function lignePlanHtml(p, avecInstall) { const i = BIB.installs.get(p.install), table = p.id === app.planId && planSurLaTable(), neuf = BIB.nouveaux.has(p.id);
  const edite = BIB.edition && BIB.edition.quoi === 'plan' && BIB.edition.id === p.id, confirme = BIB.confirme && BIB.confirme.quoi === 'plan' && BIB.confirme.id === p.id;
  const H = (p.harness || []).filter(h => h !== nomAffiche(p.nom)), sous = lies([avecInstall && i ? i.nom : '', p.appareil, H.slice(0, 2).join(', ') + (H.length > 2 || (p.nHarness || 0) > 3 ? '…' : ''), p.dessins ? plurielLie(p.dessins, 'dessin') : '']) || '—';
  if (confirme) return `<li class="bi-plan bi-confirmant" data-plan="${escA(p.id)}">${confirmeHtml('plan', p.id, 'Supprimer ' + guillemets(nomAffiche(p.nom)) + ' ?', 'Ses liaisons et ce qu’on y a fait partent avec lui.')}</li>`;
  const etiquette = table ? '<em class="bi-table">sur la table</em>' : neuf ? '<em class="bi-neuf">nouveau</em>' : '';
  return `<li class="bi-plan${table ? ' sur-table' : ''}${neuf ? ' nouveau' : ''}${BIB.pop && BIB.pop.id === p.id ? ' bi-pop-ouvert' : ''}" data-plan="${escA(p.id)}">`
    + (edite ? `<span class="bi-ligne"><span class="bi-plan-ico">${icoBi('plan')}</span>${nommerHtml('plan', p.id, nomAffiche(p.nom), 'Nom du plan')}<span class="bi-plan-sous">${esc(sous)}</span><span class="d">${p.n || 0}</span><span class="d">${p.folios || 0}</span><span class="bi-plan-vu">${p.vu ? esc(quand(p.vu)) : '—'}</span></span>`
      : `<button class="bi-ligne bi-plan-ouvrir" data-bi="plan" data-id="${escA(p.id)}" aria-label="${escA('Ouvrir ' + nomAffiche(p.nom) + ' : ' + pluriel(p.n || 0, 'liaison'))}"><span class="bi-plan-ico">${icoBi('plan')}</span><span class="bi-plan-nom"><b>${esc(nomAffiche(p.nom))}</b>${etiquette}</span><span class="bi-plan-sous">${esc(sous)}</span><span class="d">${p.n || 0}</span><span class="d">${p.folios || 0}</span><span class="bi-plan-vu">${p.vu ? esc(quand(p.vu)) : '<span class="bi-jamais">jamais</span>'}</span></button>`)
    + (edite || p.id === ID_EXEMPLE ? '' : `<button class="bi-plus" data-bi="pop" data-quoi="plan" data-id="${escA(p.id)}" aria-label="${escA('Gestes pour ' + nomAffiche(p.nom))}" aria-haspopup="menu" aria-expanded="${!!(BIB.pop && BIB.pop.id === p.id)}">${icoBi('points')}</button>`)
    + popHtml('plan', p) + '</li>'; }

/* LA BASE À RANGER : une base sans colonne d'install a des harness qu'aucun plan ne porte ; la bibliothèque le dit en une
   ligne (« Plus tard » la fait taire pour cette base) et, sur demande, les range : on coche, on choisit l'install. */
function bandeauBaseHtml() { const R = app.references, xs = R ? aRanger() : []; if (!xs.length || BIB.ranger || BIB.q) return '';
  const pref = preferencesBiblio(); if (pref.baseTue && pref.baseTue === (R.nom || '') + '|' + (R.t || 0)) return '';
  return `<div class="bi-bandeau">${icoBi('base')}<span>La base des contrats déjà faits${R.nom ? ' (<b>' + esc(R.nom) + '</b>)' : ''} compte ${esc(pluriel(xs.length, 'harness'))} ${xs.length > 1 ? 'qui ne sont rangés' : 'qui n’est rangé'} dans aucune install.</span><button class="bi-btn bi-btn-2" data-bi="ranger">${xs.length > 1 ? 'Les ranger…' : 'Le ranger…'}</button><button class="bi-lien-table" data-bi="ranger-tais">Plus tard</button></div>`; }
function rangerHtml() { const R = BIB.ranger; if (!R) return ''; const H = harnessDeLaBase(), I = installsVraies().sort((a, b) => triNaturel(a.nom, b.nom)), n = R.coches.size;
  return `<section class="bi-feuille bi-ranger" aria-label="Ranger la base dans la bibliothèque"><div class="bi-ranger-tete"><h2>Ranger la base dans la bibliothèque</h2><p>Chaque harness coché devient un plan de l’install choisie — ou un plan par dessin (FWD).</p></div>`
    + `<ul class="bi-ranger-liste">${H.map(x => `<li><label><input type="checkbox" data-ranger-h="${escA(x.h)}"${R.coches.has(x.h) ? ' checked' : ''}><b class="id">${esc(x.h)}</b><span>${esc(lies([x.appareil, x.retest, plurielLie(x.dessins, 'dessin'), plurielLie(x.n, 'liaison')]))}</span>${x.range ? '<em>déjà rangé</em>' : ''}</label></li>`).join('')}</ul>`
    + `<div class="bi-ranger-pied"><div class="segment" role="group" aria-label="Un plan par"><button data-bi="ranger-par" data-par="harness" aria-pressed="${R.par === 'harness'}">un plan par harness</button><button data-bi="ranger-par" data-par="fwd" aria-pressed="${R.par === 'fwd'}">par dessin</button></div>`
    + `<label class="bi-ranger-vers"><span>dans</span><select id="bi-ranger-vers"><option value=""${R.vers ? '' : ' selected'}>une nouvelle install…</option>${I.map(i => `<option value="${escA(i.id)}"${R.vers === i.id ? ' selected' : ''}>${esc(i.nom)}</option>`).join('')}</select></label>`
    + (R.vers ? '' : `<input id="bi-ranger-nom" class="bi-ranger-nom" value="${escA(R.nom)}" placeholder="Nom de l’install" aria-label="Nom de la nouvelle install" spellcheck="false">`)
    + `<span class="espace"></span><button class="btn lien" data-bi="ranger-annuler">Annuler</button><button class="btn cuivre" data-bi="ranger-ok"${n ? '' : ' disabled'}>Ranger ${esc(pluriel(n, 'harness'))}</button></div></section>`; }

/* ---- la barre du haut, le menu, le plan vide : ce qui suit le contrat (08-interface, `synchroniserContexte`) ---------- */
/* LE FIL : Volta / l'install / le plan. La racine : la marque seule ; une install : son nom ; la table : l'install (un clic
   y mène) et le plan. */
function synchroniserFil() { const fil = $('en-fil'); if (!fil) return; const surTable = BIB.vue === 'plan';
  const p = BIB.plans.get(app.planId), i = BIB.vue === 'install' ? BIB.installs.get(BIB.install) : surTable && p ? BIB.installs.get(p.install) : null;
  const plan = surTable && (app.nom || p) ? nomAffiche(app.nom || p.nom) : '';
  fil.hidden = !i && !plan; const bi = $('en-install'), bp = $('en-plan');
  bi.hidden = !i; bi.textContent = i ? i.nom : ''; bi.disabled = BIB.vue === 'install'; bi.dataset.id = i ? i.id : '';
  bp.hidden = !plan; bp.textContent = plan; bp.title = plan; }
function synchroniserBibliotheque() { synchroniserFil();
  const m = $('mn-biblio'); if (m) { const V = installsVraies(); m.textContent = V.length ? pluriel(V.length, 'install') + ' · ' + pluriel(plansVrais().length, 'plan') : 'installs · plans'; }
  // ce qui porte sur le plan s'éteint dans le menu tant qu'aucun plan n'est sur la table (un clic le dit)
  const sans = !planSurLaTable(); document.querySelectorAll('#menu [data-act="recapitulatif"], #menu [data-act="nomenclature"], #menu [data-sous="exporter"], #menu [data-act="cartouche"]').forEach(b => b.setAttribute('aria-disabled', String(sans)));
  // le plan vide : « Reprendre » si le dernier geste l'a vidé
  const rep = $('vd-reprendre'); if (rep) { const n = app.contrat.liaisons.length, d = app.hist[app.hist.length - 1]; rep.hidden = !(!n && d && d.liaisons && d.liaisons.length); if (!rep.hidden) rep.textContent = 'Reprendre ' + guillemets(nomAffiche(d.nom || 'le plan')); } }

/* ---- les touches ----------------------------------------------------------------------------------------------------- */
/* La bibliothèque ouverte : Échap remonte (le « ⋯ », ce qu'on nomme, la confirmation, la recherche, l'install, puis le
   plan resté sur la table) ; « / » cherche ; Ctrl+O ouvre un retest comme partout ; les touches du plan, caché dessous,
   se taisent. Le menu, un document ouvert, un champ gardent les leurs. Rend vrai quand la touche est prise ici. */
function toucheBibliotheque(e, dansChamp) { if (!bibliothequeOuverte() || !$('menu').hidden || app.fiche || dansChamp) return false;
  const k = e.key, mod = e.ctrlKey || e.metaKey;
  if (k === 'Escape') { echapBibliotheque(); return true; }
  if (mod && k.toLowerCase() === 'o') return false;
  if (mod || e.altKey) { if (/^[zp]$/i.test(k)) e.preventDefault(); return /^[zp]$/i.test(k); }
  if (k === '/') { const q = $('bi-q'); if (q) { e.preventDefault(); q.focus(); } return true; }
  return true; }
function echapBibliotheque() {
  if (BIB.pop) { const id = BIB.pop.id; BIB.pop = null; rendreBibliotheque(); const b = document.querySelector(`#bibliotheque .bi-plus[data-id="${CSS.escape(id)}"]`); if (b) b.focus(); return; }
  if (BIB.edition) { BIB.edition = null; rendreBibliotheque(); return; }
  if (BIB.confirme) { BIB.confirme = null; rendreBibliotheque(); return; }
  if (BIB.ranger) { BIB.ranger = null; rendreBibliotheque(); return; }
  if (BIB.q) { BIB.q = ''; rendreBibliotheque(); return; }
  if (BIB.vue === 'install') { montrerBibliotheque('racine'); return; }
  if (planSurLaTable()) montrerLePlan(); }

/* ---- tout relier, une fois ------------------------------------------------------------------------------------------ */
function lierBibliotheque() { if (BIB.lie) return; BIB.lie = true; const el = $('bibliotheque');
  const nommer = (input, garder) => { const quoi = input.dataset.nommer, id = input.dataset.id, v = input.value.trim(); BIB.edition = null;
    if (garder && v) { if (quoi === 'nouvelle') { nouvelleInstall(v); return; } if (quoi === 'install') renommerInstall(id, v); else renommerPlan(id, v); }
    rendreBibliotheque(); };
  el.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-bi]');
    // un clic hors du « ⋯ » ouvert le referme
    if (BIB.pop && !(e.target.closest && e.target.closest('.bi-pop'))) { const meme = b && b.dataset.bi === 'pop' && b.dataset.id === BIB.pop.id; BIB.pop = null; if (!b || meme) { rendreBibliotheque(); return; } }
    if (!b || b.disabled) return; const id = b.dataset.id, quoi = b.dataset.quoi;
    const faire = {
      nouvelle: () => { BIB.edition = { quoi: 'nouvelle' }; BIB.q = ''; if (BIB.vue !== 'racine') montrerBibliotheque('racine'); rendreBibliotheque(); },
      install: () => montrerBibliotheque('install', id), racine: () => montrerBibliotheque('racine'),
      plan: () => { BIB.pop = null; ouvrirPlan(id); }, reprendre: () => montrerLePlan(),
      pop: () => { BIB.pop = { quoi, id }; BIB.confirme = null; BIB.edition = null; rendreBibliotheque(); },
      'pop-retour': () => { BIB.pop = { quoi, id }; rendreBibliotheque(); },
      renommer: () => { BIB.pop = null; BIB.edition = { quoi, id }; rendreBibliotheque(); },
      supprimer: () => { BIB.pop = null; BIB.confirme = { quoi, id }; rendreBibliotheque(); },
      oui: () => supprimer(quoi, id), non: () => { BIB.confirme = null; rendreBibliotheque(); },
      deplacer: () => { BIB.pop = { quoi: 'plan', id, sous: 'deplacer' }; rendreBibliotheque(); },
      'deplacer-vers': () => deplacerPlan(id, b.dataset.vers),
      choisir: () => $('fichier-plans').click(), base: () => choisirBase(),
      'oublier-ajout': () => { BIB.ajouts = BIB.ajouts.filter(a => a.id !== b.dataset.a); rendreContenuBibliotheque(); },
      deviner: () => { const a = BIB.ajouts.find(x => x.id === b.dataset.a); if (!a || !a.lu) return; BIB.ajouts = BIB.ajouts.filter(x => x !== a); rendreContenuBibliotheque(); proposerRattrapage(a.nom, a.lu); },
      ranger: () => ouvrirRanger(), 'ranger-annuler': () => { BIB.ranger = null; rendreBibliotheque(); }, 'ranger-ok': rangerOk,
      'ranger-par': () => { BIB.ranger.par = b.dataset.par; rendreContenuBibliotheque(); },
      'ranger-tais': () => { const R = app.references, pref = preferencesBiblio(); if (R) { pref.baseTue = (R.nom || '') + '|' + (R.t || 0); garderPreferences(pref); } rendreContenuBibliotheque(); }
    }[b.dataset.bi];
    if (faire) { e.preventDefault(); faire(); } });
  el.addEventListener('input', e => { const t = e.target;
    if (t.id === 'bi-q') { BIB.q = t.value; rendreContenuBibliotheque(); }
    else if (t.id === 'bi-ranger-nom' && BIB.ranger) BIB.ranger.nom = t.value; });
  el.addEventListener('change', e => { const t = e.target; if (!BIB.ranger) return;
    if (t.dataset.rangerH != null) { if (t.checked) BIB.ranger.coches.add(t.dataset.rangerH); else BIB.ranger.coches.delete(t.dataset.rangerH); rendreContenuBibliotheque(); }
    else if (t.id === 'bi-ranger-vers') { BIB.ranger.vers = t.value; rendreContenuBibliotheque(); } });
  // nommer : Entrée garde, Échap renonce, quitter le champ garde (un nom vide : rien) ; la recherche : Échap l'efface, ↓ va au premier résultat
  el.addEventListener('keydown', e => { const t = e.target;
    if (t.dataset && t.dataset.nommer) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); nommer(t, true); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); BIB.edition = null; rendreBibliotheque(); } return; }
    if (t.id === 'bi-q') { if (e.key === 'Escape') { e.stopPropagation(); if (t.value) { t.value = ''; BIB.q = ''; rendreContenuBibliotheque(); } else t.blur(); }
      else if (e.key === 'ArrowDown') { const x = el.querySelector('#bi-contenu .bi-carte-corps, #bi-contenu .bi-plan-ouvrir'); if (x) { e.preventDefault(); x.focus(); } }
      else if (e.key === 'Enter') { const x = el.querySelector('#bi-contenu .bi-carte-corps, #bi-contenu .bi-plan-ouvrir'); if (x) { e.preventDefault(); x.click(); } } } });
  el.addEventListener('focusout', e => { const t = e.target; if (!(t.dataset && t.dataset.nommer) || !BIB.edition) return;
    setTimeout(() => { if (!BIB.edition || !t.isConnected || document.activeElement === t) return; if (t.dataset.nommer === 'nouvelle' && !t.value.trim()) { BIB.edition = null; rendreBibliotheque(); return; } nommer(t, true); }, 0); });
  // la barre du haut : la marque mène à la bibliothèque, l'install du fil à ses plans
  $('en-biblio').addEventListener('click', () => montrerBibliotheque('racine'));
  $('en-install').addEventListener('click', e => { const id = e.currentTarget.dataset.id; if (id) montrerBibliotheque('install', id); });
  // plusieurs retests à la fois, choisis : des plans
  $('fichier-plans').addEventListener('change', e => { const xs = [...(e.target.files || [])]; e.target.value = ''; if (xs.length) ajouterPlans(xs); });
  // le plan vide : un retest, des lignes collées, la bibliothèque ; « Reprendre » défait ce qui l'a vidé
  const o = (id, fn) => { const b = $(id); if (b) b.addEventListener('click', fn); };
  o('vd-ouvrir', () => $('fichier').click()); o('vd-coller', () => ficheColler()); o('vd-bibliotheque', () => montrerBibliotheque('install', (BIB.plans.get(app.planId) || {}).install));
  o('vd-reprendre', () => { const q = annuler(); if (q) dire('Repris : ' + q + '.'); });
  // ce qui ne peut se faire que sur le plan (une fiche, le récapitulatif) le remet sur la table
  const suivre = id => new MutationObserver(() => { if (!$(id).hidden && bibliothequeOuverte()) montrerLePlan(); }).observe($(id), { attributes: true, attributeFilter: ['hidden'] });
  suivre('inspecteur'); suivre('base'); }
