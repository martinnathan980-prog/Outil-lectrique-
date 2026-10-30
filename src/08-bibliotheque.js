/* ===========================================================================
   08 — LA BIBLIOTHÈQUE : les installations et leurs plans, l'ouverture de Volta
   ---------------------------------------------------------------------------
   Le lecteur : « Il nous faut une bibliothèque : par installation (telle
   antenne, tel cockpit…), on a plein de plans électriques. On choisit notre
   installation et on a directement ses plans. » Puis : « On ne dit pas
   install, on dit installation. Derrière chaque installation, c'est un ECP :
   un numéro à 5 chiffres. Il faut trier bien proprement chaque installation
   et aller d'une à l'autre très facilement — l'outil est partagé, chacun est
   sur la sienne. »

   L'OUTIL S'OUVRE SUR ELLE, posée sur la table bleu nuit (`#bibliotheque`) :
     · la RACINE : une carte par installation — son numéro d'ECP, son nom,
       combien de plans, la dernière ouverture, le nom de ses premiers plans —,
       rangées par ECP (ou par nom, ou les plus récentes d'abord : on choisit,
       le choix se garde), « Nouvelle installation » (l'ECP, puis le nom), une
       recherche (un ECP, une installation, un plan, un harness, un dessin) ; le
       plan resté sur la table se reprend d'un clic ; l'Exemple, une
       installation de démonstration, discrète, en dernier ;
     · une INSTALLATION : à gauche, toutes les installations (un clic passe de
       l'une à l'autre, Alt+↑ / Alt+↓ aussi) ; à droite son ECP et son nom (un
       clic les modifie), créée quand, modifiée quand ; ses plans (un plan = un
       retest : son nom, ses folios, créé, modifié, ouvert), « Ajouter un plan »
       (un ou plusieurs retests, Excel ou CSV, choisis ou déposés) ; un clic
       ouvre le plan sur la table, avec ses folios.
   L'ACCUEIL (rien encore) : une VITRINE (le lecteur, v73 : « comme l'écran
   d'accueil d'un iPhone, stylisé, travaillé ») — au centre optique de la table,
   une pile de trois feuilles, « Ouvrez votre installation » en affiche (v74 :
   le fichier du lecteur s'appelle une installation), une phrase, deux gestes
   (« Ouvrir une installation… » clair sur la nuit, ses touches Ctrl O ;
   « Nouvelle installation » au verre), une ligne (« ou glissez-le n'importe où
   dans la fenêtre ») ; en bas, le DOCK de verre : l'Exemple et la base des
   contrats déjà faits, comme deux applications (« Reprendre » le plan resté sur
   la table s'y ajoute). Elle se pose en cascade, une fois, puis les deux câbles
   de la vignette se tracent ; la barre du haut s'efface : la marque flotte.
   LA BIBLIOTHÈQUE PLEINE : la tête en affiche, « Reprendre » en verre (le papier
   est réservé à ce qu'on choisit), « Installations, par n° ECP » et son filet,
   les cartes en grille — chacune une vraie pile de feuilles, qui s'évente au
   survol, son état en pastille —, l'Exemple au trait, en dernier.
   Ce qui est un plan se montre en VIGNETTE (une petite feuille blanche, son
   dessin à l'encre, deux fils aux couleurs des routes) : l'Exemple,
   « Reprendre », l'accueil.
   La barre du haut porte un fil discret : Volta (la bibliothèque) /
   l'installation (son ECP, son nom : ses plans) / le plan. Échap remonte d'un
   cran. Renommer (sur place), supprimer (une confirmation dans la page,
   « Rétablir » juste après), déplacer un plan d'une installation à une autre :
   le « ⋯ » de chaque carte et de chaque ligne.

   TOUT RESTE DANS CE NAVIGATEUR (IndexedDB « volta-bibliotheque ») : les
   installations (magasin `installs`), les plans (ce qu'on en montre) et le
   CONTRAT de chaque plan — ses liaisons, ses choix, son cartouche : ce que
   garde la mémoire du contrat (08-interface, `etatDuContrat`), écrit à chaque
   enregistrement du plan ouvert (`garderLePlan`). La bibliothèque vit en
   mémoire (`BIB`) et s'écrit au fil des gestes : tout est immédiat à l'écran.

   LA BASE DES CONTRATS DÉJÀ FAITS la remplit (v72 : l'énorme retest, 100 000
   lignes et plus) : une colonne d'installation (Install, Installation, Système
   — 02-lecture) crée chaque installation avec SES CONTRATS, un plan par
   harness, qui ne recopie rien — il lit la base quand on l'ouvre, d'un clic ;
   une colonne ECP, ou un nom qui commence par cinq chiffres, lui donne son
   ECP ; sans colonne d'installation, la bibliothèque propose de RANGER ses
   harness. La recherche de la racine CHERCHE DANS TOUT (les lignes de la base :
   un part number, un câble, un repère) ; « Convertir… » sort des contrats
   choisis leurs retests corrigés et leurs dossiers PDF, en un zip ; chaque plan
   dit ce qu'il lui reste à faire et quand il a été exporté. La base reste la
   comparaison « Déjà fait » (08-references).

   `atelier.exemple()` ouvre toujours l'exemple tel qu'il est livré ;
   `atelier.bibliotheque()` et `atelier.reprendre()` vont de l'une à l'autre.
   =========================================================================== */
'use strict';

const IDB_BIBLIO = 'volta-bibliotheque', CLE_BIBLIO = 'atelier.bibliotheque.v1';
const ID_EXEMPLE = 'exemple', ID_A_RANGER = 'a-ranger', NOM_A_RANGER = 'À ranger';
/* L'état : ce qui est montré (`vue` : 'racine', 'install' ou 'plan' — la table), l'installation montrée, la recherche ; ce
   qui s'écrit sur place (`edition` : { quoi: 'nouvelle'|'install'|'plan', id, champ: 'ecp'|'nom' }), la confirmation d'une suppression
   (`confirme`), le « ⋯ » ouvert (`pop` : { quoi, id, sous }), les fichiers en lecture ou en erreur (`ajouts`), les plans
   tout juste ajoutés (`nouveaux`), le rangement de la base (`ranger`), la corbeille d'un seul geste (`corbeille`). */
const BIB = { pret: false, db: null, garde: true, installs: new Map(), plans: new Map(), supprimes: new Set(), aAdopter: false,
  vue: 'racine', install: '', q: '', edition: null, confirme: null, pop: null, ajouts: [], nouveaux: new Set(), ranger: null, corbeille: null, lie: false,
  // la recherche dans tout (ce qu'elle a trouvé dans la base), la conversion en lot (ce qui est choisi, ce qui sort)
  trouve: null, chercheT: 0, lot: null, groupes: null };

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
// une date de colonne : « 14/10/2026 »
const laDate = t => { if (!t) return ''; const d = new Date(t); return deux(d.getDate()) + '/' + deux(d.getMonth() + 1) + '/' + d.getFullYear(); };
/* L'ECP : cinq chiffres, rien d'autre (« ECP 40217 », « 40 217 » se lisent 40217) ; '' quand il n'y en a pas. */
const ecpLu = v => { const c = String(v == null ? '' : v).replace(/\D/g, ''); return c.length === 5 ? c : ''; };
const ecpDuNom = nom => { const m = /^\s*(?:ECP\s*)?(\d{5})(?!\d)/i.exec(String(nom || '')); return m ? m[1] : ''; };
const installDeLEcp = ecp => ecp ? installsVraies().find(i => i.ecp === ecp) || null : null;
const nouvelId = p => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function grouper(xs, f) { const m = new Map(); xs.forEach(x => { const k = f(x); (m.get(k) || m.set(k, []).get(k)).push(x); }); return m; }
const ICONES_BI = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  plan: '<rect x="4.5" y="3.5" width="15" height="17" rx="1.5"/><path d="M4.5 15.5h15M12 15.5v5"/>',
  install: '<path d="M8 3.5h10a1.5 1.5 0 0 1 1.5 1.5v12.5"/><rect x="4.5" y="6.5" width="12" height="14" rx="1.5"/><path d="M4.5 16h12"/>',
  loupe: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  depot: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  glisser: '<path d="M12 3v10M8 9l4 4 4-4"/><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  retour: '<path d="m14.5 6-6 6 6 6"/>',
  points: '<circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  ouvrir: '<path d="M5 12h13M13 7l5 5-5 5"/>',
  renommer: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  deplacer: '<path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M10 13.5h6M13.5 11l2.5 2.5-2.5 2.5"/>',
  supprimer: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  base: '<ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>',
  fermer: '<path d="M6 6l12 12M18 6 6 18"/>'
};
const icoBi = (k, cls) => `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONES_BI[k]}</svg>`;
/* UN PLAN EN VIGNETTE : une petite feuille blanche (le papier, le même dans les deux thèmes : `.ilot-clair`), son cadre, son
   cartouche, un disjoncteur, deux équipements et deux fils aux couleurs des routes — le folio tel que la table le montre.
   Les traits gardent leur finesse à toute taille (`non-scaling-stroke`). */
const DESSIN_FOLIO = '<rect class="bf-papier" x=".5" y=".5" width="63" height="43" rx="3"/><rect class="bf-cadre" x="3.5" y="3.5" width="57" height="37" rx="1"/>'
  + '<path class="bf-cadre" d="M41 33.5h19.5M47.5 33.5v7"/><rect class="bf-bloc" x="8.5" y="10.5" width="9" height="11" rx="1"/><rect class="bf-bloc" x="42.5" y="8.5" width="12" height="9" rx="1"/><rect class="bf-bloc" x="42.5" y="21.5" width="12" height="9" rx="1"/>'
  + '<path class="bf-fil bf-a" d="M17.5 13H42.5"/><path class="bf-fil bf-b" d="M17.5 18.5h11v7.5h14"/><circle class="bf-noeud" cx="28.5" cy="18.5" r="1.1"/>';
const folioMini = cls => `<svg class="bi-folio ilot-clair${cls ? ' ' + cls : ''}" viewBox="0 0 64 44" aria-hidden="true">${DESSIN_FOLIO}</svg>`;
/* L'accueil : une installation est une PILE DE FEUILLES — deux feuilles de papier dessous, un peu tournées, la vignette d'un
   plan dessus (son cadre, son cartouche, un disjoncteur, deux équipements, deux câbles aux couleurs des routes, qui se
   tracent quand l'accueil se pose : `pathLength` les mesure). Une flaque de lumière dessous la pose sur la table. */
const pileAccueil = () => `<div class="bi-pile ilot-clair" aria-hidden="true"><i class="bi-pf bi-pf3"></i><i class="bi-pf bi-pf2"></i><svg class="bi-pf bi-pf1" viewBox="0 0 236 167">`
  + '<rect class="bp-cadre" x="9.5" y="9.5" width="217" height="148" rx="1"/><rect class="bp-cart" x="140.5" y="132.5" width="86" height="25"/><path class="bp-cadre" d="M170 132.5v25"/>'
  + '<rect class="bp-bloc" x="28.5" y="44.5" width="36" height="46" rx="1.5"/><rect class="bp-bloc" x="160.5" y="30.5" width="44" height="30" rx="1.5"/><rect class="bp-bloc" x="160.5" y="76.5" width="44" height="30" rx="1.5"/>'
  + '<path class="bp-fil bf-a" pathLength="1" d="M64.5 56.5H112.5V45.5H160.5"/><path class="bp-fil bf-b" pathLength="1" style="--j:1" d="M64.5 78.5H120.5V91.5H160.5"/><circle class="bp-noeud" cx="112.5" cy="56.5" r="2.2"/></svg></div>';

/* ---- ce que la bibliothèque sait d'un plan -------------------------------------------------------------------------- */
/* Le résumé d'un contrat (gardé ou neuf) : combien de liaisons, de folios, ses harness, ses dessins, son appareil — ce que
   la carte et la ligne disent, et ce que la recherche lit. */
function resumeDe(o) { const V = o.source || o.liaisons || [], L = o.liaisons || [], d = k => [...new Set(V.map(l => l[k]).filter(Boolean))];
  const fwds = d('fwd'), harness = d('harness');
  return { n: V.length, folios: V.length ? Math.max(1, plansDe(L).length) : 0, harness: harness.slice(0, 8), nHarness: harness.length, fwds: fwds.slice(0, 12), dessins: fwds.length, appareil: d('appareil')[0] || '' }; }
const estDemo = id => { const i = BIB.installs.get(id); return !!(i && i.demo); };
const installsVraies = () => [...BIB.installs.values()].filter(i => !i.demo);
/* Les plans d'une installation, par nom. Pendant qu'un écran se fait (`BIB.groupes`), ils se rangent UNE fois pour toutes
   les installations : une base de 3 000 contrats ne se trie pas soixante fois par écran. */
const TRI_NOMS = (a, b) => COLLATEUR_FR.compare(a, b);
function grouperLesPlans() { const G = new Map(); BIB.plans.forEach(p => (G.get(p.install) || G.set(p.install, []).get(p.install)).push(p));
  G.forEach(xs => xs.sort((a, b) => TRI_NOMS(nomAffiche(a.nom), nomAffiche(b.nom)))); return G; }
const plansDeInstall = id => BIB.groupes ? (BIB.groupes.get(id) || []).slice() : [...BIB.plans.values()].filter(p => p.install === id).sort((a, b) => TRI_NOMS(nomAffiche(a.nom), nomAffiche(b.nom)));
const avecGroupes = f => { const avant = BIB.groupes; BIB.groupes = grouperLesPlans(); try { return f(); } finally { BIB.groupes = avant; } };
const plansVrais = () => [...BIB.plans.values()].filter(p => !estDemo(p.install));
/* LE RANGEMENT DES INSTALLATIONS, choisi à la racine et gardé : par ECP (d'office — celles qui n'en ont pas encore suivent,
   par nom), par nom, ou les plus récemment ouvertes d'abord. « À ranger » puis l'Exemple ferment toujours la marche. */
const TRIS = [['ecp', 'N° ECP'], ['nom', 'Nom'], ['recentes', 'Récentes']];
const triChoisi = () => { const t = BIB.tri || preferencesBiblio().tri; return TRIS.some(x => x[0] === t) ? t : 'ecp'; };
function choisirTri(t) { BIB.tri = t; const pref = preferencesBiblio(); pref.tri = t; garderPreferences(pref); rendreBibliotheque(); }
const vueLe = i => Math.max(i.vu || 0, ...plansDeInstall(i.id).map(p => p.vu || 0));
// modifiée : son nom ou son ECP changés, un plan ajouté ou enregistré
const modifieeLe = i => Math.max(i.modifie || i.cree || 0, ...plansDeInstall(i.id).map(p => p.modifie || p.cree || 0));
function installsTriees(tri) { const t = tri || triChoisi(), fin = i => i.demo ? 2 : i.id === ID_A_RANGER ? 1 : 0;
  const par = t === 'nom' ? (a, b) => triNaturel(a.nom, b.nom)
    : t === 'recentes' ? (a, b) => (vueLe(b) || b.cree || 0) - (vueLe(a) || a.cree || 0) || triNaturel(a.nom, b.nom)
    : (a, b) => (!a.ecp - !b.ecp) || String(a.ecp || '').localeCompare(String(b.ecp || '')) || triNaturel(a.nom, b.nom);
  return [...BIB.installs.values()].sort((a, b) => fin(a) - fin(b) || par(a, b)); }
const planSurLaTable = () => verite().length > 0;
const bibliothequeOuverte = () => BIB.vue !== 'plan';

/* ---- créer, ranger ---------------------------------------------------------------------------------------------------- */
function creerInstall(nom, o) { const t = Date.now(), i = { id: nouvelId('i'), nom: String(nom || '').trim() || 'Sans nom', ecp: '', cree: t, modifie: t, vu: 0, ...(o || {}) };
  BIB.installs.set(i.id, i); BIB.supprimes.delete(i.id); garderInstall(i); return i; }
const installNommee = nom => { const k = cleTexte(nom); return installsVraies().find(i => cleTexte(i.nom) === k) || null; };
// « À ranger » : là où va ce qui n'a pas d'installation (un fichier ouvert hors de toute installation, un contrat d'avant la bibliothèque)
const installARanger = () => BIB.installs.get(ID_A_RANGER) || creerInstall(NOM_A_RANGER, { id: ID_A_RANGER });
/* Un plan : son installation, son nom, son résumé ; son contrat, quand on le donne (`liaisons`), se garde « neuf » — à sa
   première ouverture il se charge comme un fichier (les folios se découpent s'il le faut, les choix partent de zéro, sauf
   ce que garde la feuille « Volta » d'un retest corrigé : `o.volta`, repris à l'ouverture). */
function creerPlan(installId, nom, liaisons, o) { o = o || {}; const t = Date.now();
  const p = { id: o.id || nouvelId('p'), install: installId, nom: String(nom || '').trim() || 'Sans nom', source: o.source || 'fichier', cree: t, vu: 0, modifie: t, ...resumeDe({ liaisons: liaisons || [] }) };
  BIB.plans.set(p.id, p); BIB.supprimes.delete(p.id); garderPlan(p);
  if (liaisons && o.contrat !== false) ecrireBiblio('contrats', p.id, { planId: p.id, nom: p.nom, liaisons: liaisons.map(l => ({ ...l })), neuf: true, t, ...(o.volta ? { volta: o.volta } : {}) });
  return p; }
/* L'installation où va un plan neuf : celle qu'on regarde, sinon celle du plan sur la table, sinon « À ranger » — jamais
   l'Exemple, qui reste tel qu'il est livré. */
function installCible() { const vue = BIB.vue === 'install' && BIB.installs.get(BIB.install); if (vue && !vue.demo) return vue.id;
  const p = BIB.plans.get(app.planId), i = p && BIB.installs.get(p.install); return i && !i.demo ? i.id : ''; }
const installCourante = () => installCible() || installARanger().id;
// son nom, sans la créer (« À ranger » n'existe qu'une fois qu'un plan y va)
const nomInstallCible = () => { const i = BIB.installs.get(installCible()); return i ? i.nom : NOM_A_RANGER; };
function marquerVu(p) { const t = Date.now(); p.vu = t; garderPlan(p); const i = BIB.installs.get(p.install); if (i) { i.vu = t; garderInstall(i); } }
/* L'exemple : une installation de démonstration, un plan — créés au premier lancement, recréés quand on le demande (le menu,
   `atelier.exemple()`) même après qu'on l'a retiré. */
function assurerExemple(demande) { const pref = preferencesBiblio();
  if (pref.exempleRetire && !demande) return null;
  if (pref.exempleRetire) { delete pref.exempleRetire; garderPreferences(pref); }
  if (!BIB.installs.has(ID_EXEMPLE)) creerInstall('Exemple', { id: ID_EXEMPLE, demo: true });
  let p = BIB.plans.get(ID_EXEMPLE);
  if (!p) { p = { id: ID_EXEMPLE, install: ID_EXEMPLE, nom: NOM_EXEMPLE, source: 'exemple', cree: Date.now(), vu: 0, modifie: 0, ...resumeDe({ liaisons: contratExemple() }) }; BIB.plans.set(p.id, p); BIB.supprimes.delete(p.id); garderPlan(p); }
  return p; }
/* LE PLAN QUE DEVIENT UN CONTRAT CHARGÉ (08-interface, `chargerContrat`) : un plan nommé (`planId` : l'exemple, un plan
   qu'on ouvre) ; un plan neuf de l'installation courante (`nouveau` : un fichier ouvert sur la table) ; sinon le plan sur la
   table (le collage qui le remplace) — sauf l'exemple, qu'on ne remplace pas : un plan neuf alors. */
function planPour(o, nom, L) { let p;
  if (o.planId) { if (o.planId === ID_EXEMPLE) assurerExemple(true); p = BIB.plans.get(o.planId); if (p) marquerVu(p); return o.planId; }
  if (!o.nouveau && app.planId && app.planId !== ID_EXEMPLE && BIB.plans.has(app.planId)) return app.planId;
  p = creerPlan(installCourante(), nom, L, { contrat: false, source: o.source || 'fichier' }); marquerVu(p); BIB.nouveaux.add(p.id);
  return p.id; }
/* Le plan sur la table vient d'être enregistré (08-interface, `ecrireContrat`) : son contrat et son résumé se gardent. */
function garderLePlan(o) { const p = o.planId && BIB.plans.get(o.planId); if (!p) return;
  Object.assign(p, resumeDe(o), { nom: o.nom || p.nom, modifie: o.t });
  // ce qu'il reste à faire : le compte du contrôle tel qu'il est quand le plan se garde, lu à sa source unique (08-controle,
  // `compteProblemes` : les nombres de la pastille du rail) — la bibliothèque le dit
  if (typeof compteProblemes === 'function' && typeof CONTROLE !== 'undefined' && CONTROLE.cle) { const c = compteProblemes(); p.problemes = { ko: c.ko, att: c.att }; }
  garderPlan(p); ecrireBiblio('contrats', p.id, o);
  if (bibliothequeOuverte() && !BIB.edition) rendreContenuBibliotheque(); }

/* ---- lire la bibliothèque au lancement ------------------------------------------------------------------------------- */
/* Ce qui est déjà en mémoire (créé pendant la lecture) l'emporte ; un plan sans installation va « À ranger ». Le contrat resté
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
  BIB.aAdopter = false; BIB.pret = true; synchroniserBibliotheque(); if (bibliothequeOuverte()) { rendreBibliotheque({ arrivee: true }); poser(); } }

/* ---- aller de la bibliothèque au plan, et retour ------------------------------------------------------------------- */
/* Montrer la bibliothèque — la racine, ou une installation (`id`). Le plan reste sur la table, dessous : ce qu'on y a fait est
   gardé, ce qui y était ouvert (la fiche, le tableau, la recherche) se ferme. */
function montrerBibliotheque(vue, id) { const venait = BIB.vue === 'plan';
  if (venait) { sauverMaintenant(); quitterLePlan(); }
  if (vue === 'install' && !BIB.installs.has(id)) vue = 'racine';
  if (BIB.vue === 'install' && (vue !== 'install' || id !== BIB.install)) BIB.nouveaux.clear();
  BIB.vue = vue || 'racine'; BIB.install = BIB.vue === 'install' ? id : ''; BIB.pop = null; BIB.edition = null; BIB.confirme = null;
  if (BIB.vue === 'install') { const i = BIB.installs.get(id); i.vu = Date.now(); garderInstall(i); BIB.ranger = null; }
  const el = $('bibliotheque'); el.hidden = false; document.body.classList.add('biblio');
  rendreBibliotheque({ arrivee: true }); poser(); synchroniserFil(); el.scrollTop = 0; }
function quitterLePlan() { if (app.cible || app.choisi) { app.cible = null; app.choisi = null; eteindre(); peindre(); }
  fermerInspecteur(); fermerBase(); fermerFiche(); fermerRecherche(); fermerMenu(); }
/* Le plan sur la table, la bibliothèque s'efface (un plan ouvert, chargé, repris). */
function montrerLePlan() { if (typeof retirerCarteLecture === 'function') retirerCarteLecture(); if (BIB.vue === 'plan') return; BIB.vue = 'plan'; BIB.pop = null; BIB.edition = null; BIB.confirme = null; BIB.ranger = null; BIB.nouveaux.clear();
  $('bibliotheque').hidden = true; document.body.classList.remove('biblio', 'biblio-accueil'); synchroniserBibliotheque(); }
// ce qui porte sur le plan (le récapitulatif, la nomenclature, les exports, le cartouche) le remet sur la table d'abord
const surLePlan = fn => (...a) => { if (bibliothequeOuverte()) { if (!planSurLaTable()) { dire('Aucun plan ouvert : choisissez une installation, puis un plan.'); return; } montrerLePlan(); } return fn(...a); };
/* OUVRIR UN PLAN : le sien, tel qu'on l'a laissé (ses liaisons, ses choix, son folio) ; un plan jamais ouvert se charge
   comme un fichier ; l'exemple jamais ouvert, tel qu'il est livré ; un contrat de la base jamais ouvert, lu dans la base
   (son intervalle de lignes : un instant, même dans 300 000). Ctrl+Z part de là. `apres` : où aller une fois le plan sur
   la table (un repère, un câble que la recherche a trouvé). */
async function ouvrirPlan(id, apres) { const p = BIB.plans.get(id); if (!p) return; marquerVu(p);
  if (app.planId === id && planSurLaTable()) { montrerLePlan(); if (apres) aller(apres); return; }
  sauverMaintenant(); const o = await lireBiblio('contrats', id);
  if (!o && id === ID_EXEMPLE) { ouvrirExemple(true); return; }
  if (!o && p.source === 'base' && p.contrat) { const L = await liaisonsDuContrat(p.contrat, p.fwdBase);
    if (!L || !L.length) { dire(guillemets(nomAffiche(p.nom)) + ' vient de la base des contrats déjà faits, qui n’est plus dans ce navigateur : redéposez-la.', true); return; }
    chargerContrat(L, 'ouverture de ' + p.nom, p.nom, { planId: id }); app.hist = []; synchroniserHistorique(); if (apres) aller(apres); return; }
  if (!o || !o.liaisons) { dire(guillemets(nomAffiche(p.nom)) + ' n’a plus ses liaisons dans ce navigateur.', true); return; }
  // un retest corrigé déposé, ouvert pour la première fois (même un autre jour) : ce que garde sa feuille « Volta » — les
  // profils, les choix des fiches ; les hypothèses, dites et offertes — se reprend une fois (08-export, `reprendreVolta`).
  // La reprise en attente de la même lecture (`VOLTA.attente`) est la même : elle ne se dit pas deux fois.
  if (o.neuf) { const v = o.volta && typeof reprendreVolta === 'function' ? o.volta : null; if (v && typeof VOLTA !== 'undefined') VOLTA.attente = null;
    chargerContrat(o.liaisons, 'ouverture de ' + p.nom, p.nom, { planId: id }); app.hist = []; synchroniserHistorique();
    if (v) { const dit = reprendreVolta(v, []); if (dit) dire(dit.msg, false, dit.geste ? { geste: dit.geste, faire: dit.faire } : null); }
    if (apres) aller(apres); return; }
  poserEtat({ ...o, planId: id }); app.hist = []; app.base.filtre = ''; app.base.tri = null; app.base.enSaisie = false; $('q').value = '';
  fermerFiche(); fermerMenu(); montrerLePlan(); redessiner(); retrouverVue(); heureSauve(o.t); sauver(); if (apres) aller(apres); }
// la table vide : le plan qu'elle portait vient d'être supprimé
function viderLaTable() { app.contrat = contratNeuf(); app.source = null; app.nFolios = 0; app.plan = '*'; app.nom = ''; app.planId = ''; app.cible = null; app.choisi = null; app.hist = [];
  redessiner(); sauver(); }

/* ---- les gestes : renommer, supprimer (et rétablir), déplacer ------------------------------------------------------- */
/* Le nom et l'ECP d'une installation, modifiés ensemble (le champ qu'on n'a pas touché reste tel quel). Un nom pris, un ECP
   pris ou qui n'a pas ses cinq chiffres : le mot qui passe le dit, rien ne change. Rend vrai quand c'est gardé. */
function renommerInstall(id, nom, ecp) { const i = BIB.installs.get(id); if (!i) return false;
  nom = nom == null ? i.nom : String(nom).trim() || i.nom;
  const brut = ecp == null ? i.ecp || '' : String(ecp).trim(), e = ecpLu(brut);
  if (brut && !e) { dire('Un ECP a cinq chiffres : ' + guillemets(brut) + ' n’en a que ' + brut.replace(/\D/g, '').length + '.', true); return false; }
  const deja = installNommee(nom); if (deja && deja.id !== id) { dire(guillemets(deja.nom) + ' existe déjà : choisissez un autre nom.', true); return false; }
  const meme = installDeLEcp(e); if (meme && meme.id !== id) { dire('L’ECP ' + e + ' est déjà celui de ' + guillemets(meme.nom) + '.', true); return false; }
  if (nom === i.nom && e === (i.ecp || '')) return true;
  i.nom = nom; i.ecp = e; i.modifie = Date.now(); garderInstall(i); synchroniserFil(); return true; }
function renommerPlan(id, nom) { const p = BIB.plans.get(id); nom = String(nom || '').trim(); if (!p || !nom || nom === nomAffiche(p.nom)) return;
  p.nom = nom; garderPlan(p); if (app.planId === id) { app.nom = nom; synchroniserContexte(); sauver(); } }
/* Supprimer : le plan (ou l'installation et tous ses plans) quitte la bibliothèque et ce navigateur ; le mot qui passe offre
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
  direAvecGeste(guillemets(nom) + (quoi !== 'install' ? ' supprimé.' : i && i.demo ? ' retiré : le menu Plus le rouvre.' : plans.length > 1 ? ' et ses ' + pluriel(plans.length, 'plan') + ' supprimés.' : plans.length ? ' et son plan supprimés.' : ' supprimée.'), 'Rétablir', retablir); }
function retablir() { const C = BIB.corbeille; if (!C) return; BIB.corbeille = null;
  if (C.install) { BIB.installs.set(C.install.id, C.install); BIB.supprimes.delete(C.install.id); garderInstall(C.install); if (C.install.demo) { const pref = preferencesBiblio(); delete pref.exempleRetire; garderPreferences(pref); } }
  C.plans.forEach((p, k) => { if (!BIB.installs.has(p.install)) p.install = installARanger().id; BIB.plans.set(p.id, p); BIB.supprimes.delete(p.id); garderPlan(p); if (C.contrats[k]) ecrireBiblio('contrats', p.id, C.contrats[k]); });
  rendreBibliotheque(); dire('Rétabli.'); }
// le mot qui passe, avec un geste (« Rétablir ») : le bouton du mot qui passe (`dire`, 08-interface) ; il reste le temps
// de le lire, et tant qu'on le survole
function direAvecGeste(msg, libelle, fn) { dire(msg, false, { geste: libelle, faire: fn }); }
function deplacerPlan(id, versId) { const p = BIB.plans.get(id); if (!p || p.install === versId) return;
  let v = BIB.installs.get(versId), neuve = false;
  if (!v) { let n = 'Nouvelle installation', k = 1; while (installNommee(n)) n = 'Nouvelle installation ' + (++k); v = creerInstall(n); neuve = true; }
  p.install = v.id; garderPlan(p); BIB.pop = null;
  if (neuve) { montrerBibliotheque('install', v.id); BIB.edition = { quoi: 'install', id: v.id, champ: 'ecp' }; rendreBibliotheque(); }
  else rendreBibliotheque();
  dire(guillemets(nomAffiche(p.nom)) + ' est rangé dans ' + guillemets(v.nom) + (neuve ? ' : nommez-la.' : '.')); synchroniserFil(); }
/* Une installation neuve : son ECP (cinq chiffres, ou rien encore) et son nom (sans nom, « ECP 40217 »). Un ECP ou un nom
   déjà pris : on va à celle qui le porte. */
function nouvelleInstall(nom, ecp) { nom = String(nom || '').trim(); const brut = String(ecp || '').trim(), e = ecpLu(brut);
  if (brut && !e) { dire('Un ECP a cinq chiffres : ' + guillemets(brut) + ' n’en a que ' + brut.replace(/\D/g, '').length + '.', true); return null; }
  if (!nom && !e) return null; if (!nom) nom = 'ECP ' + e;
  const deja = installDeLEcp(e) || installNommee(nom);
  if (deja) { dire(guillemets(deja.nom) + (deja.ecp && deja.ecp === e ? ' porte déjà l’ECP ' + e : ' existe déjà') + ' : la voici.'); montrerBibliotheque('install', deja.id); return deja; }
  const i = creerInstall(nom, { ecp: e }); montrerBibliotheque('install', i.id); return i; }
// passer à l'installation d'avant ou d'après (Alt+↑, Alt+↓) ; le rail et ces touches gardent un ordre fixe (par ECP, ou par nom) : « Récentes » le bousculerait à chaque passage
const ordreDuRail = () => installsTriees(triChoisi() === 'nom' ? 'nom' : 'ecp');
function installVoisine(pas) { const T = ordreDuRail(), k = T.findIndex(i => i.id === BIB.install); if (k < 0 || !T.length) return;
  const v = T[(k + pas + T.length) % T.length]; if (v && v.id !== BIB.install) montrerBibliotheque('install', v.id); }

/* ---- ajouter des plans : un ou plusieurs retests ------------------------------------------------------------------- */
/* Un fichier → ses plans : un retest en donne un (plusieurs harness : un par harness) ; une bible ou une norme déposée
   ici va à sa place (08-fichiers, `rangerAilleurs`) ; un tableau aux en-têtes d'ailleurs (« Équipement ; Broche ; … »,
   l'export français) se DEVINE comme Ctrl+O le devine (08-fichiers, `devinerTableau` — audit v72, parcours P2-10 : le dépôt
   le refusait) et devient un plan, ce qui a été compris dit dans le mot qui passe ; le reste se dit dans sa ligne, en
   clair. */
async function plansDuFichier(f) { const nom = f.name || 'le fichier', L = await lireLeFichier(f);
  if (L.erreur) return { erreur: texteBrut(L.erreur.texte) };
  if (!trouverEnteteRetest(L.brutes)) { if (await rangerAilleurs(L, nom, f)) return { plans: [] };
    const D = devinerTableau(L.pleines), lu = D.entete && D.devine ? lireAvecCarte(L.pleines, D.map, D.debut) : null;
    if (lu && lu.liaisons.length) return { plans: [{ nom, liaisons: lu.liaisons }], devine: texteBrut(comprisHtml(D)) };
    return { erreur: nom + ' n’a pas les en-têtes de l’installation : il me faut au moins Device1, Pin1, Device2 et Pin2.', lu: L }; }
  const r = lireTexte(L.texte); if (!r.liaisons.length) return { erreur: nom + ' : les en-têtes de l’installation sont là, mais aucune liaison dessous.' };
  // la feuille « Volta » d'une installation corrigée (02-lecture) suit le plan qu'elle devient : elle se reprend à son ouverture
  const volta = r.volta || null;
  if (r.harnais.length > 1) return { plans: r.harnais.map(h => ({ nom: h, liaisons: r.liaisons.filter(l => l.harness === h), volta })) };
  return { plans: [{ nom, liaisons: r.liaisons, volta }] }; }
/* AJOUTER DES PLANS à une installation (celle qu'on regarde, sinon celle du plan sur la table) : chaque fichier se lit dans
   sa ligne (« Lecture… »), puis devient un plan — marqué « nouveau » — ou dit ce qui ne va pas. Rien ne s'ouvre : un clic le
   fera. Un PDF de schéma n'est pas un retest : il va au lecteur de PDF (08-pdf), un schéma Visio à sa relecture (08-visio) ;
   un très gros fichier (une base entière)
   se lit ailleurs (08-references). Sans installation sous les yeux, « À ranger » ne se crée qu'au premier plan fait — un
   dépôt qui ne donne rien ne laisse pas d'installation vide (audit v72, parcours P2-10). */
async function ajouterPlans(fichiers, installId) { fichiers = [...(fichiers || [])].filter(Boolean); if (!fichiers.length) return;
  const pdfs = typeof estPdf === 'function' ? fichiers.filter(estPdf) : []; if (pdfs.length) { fichiers = fichiers.filter(f => !pdfs.includes(f)); if (typeof ouvrirPdf === 'function') ouvrirPdf(pdfs[0]); }
  const visios = typeof estVisio === 'function' ? fichiers.filter(f => estVisio(f) || estVisioAncien(f)) : [];
  if (visios.length) { fichiers = fichiers.filter(f => !visios.includes(f)); if (!pdfs.length && typeof ouvrirVisio === 'function') ouvrirVisio(visios[0]); }
  const gros = fichiers.find(f => (f.size || 0) > SEUIL_AILLEURS); if (gros && typeof Worker !== 'undefined' && lireLaBaseAilleurs(gros, 'ouvrir')) fichiers = fichiers.filter(f => f !== gros);
  if (!fichiers.length) return;
  let id = installId && BIB.installs.has(installId) && !estDemo(installId) ? installId : installCible();
  if (id && !(BIB.vue === 'install' && BIB.install === id)) montrerBibliotheque('install', id);
  const faits = [], devines = [];
  for (const f of fichiers) { const a = { id: nouvelId('a'), nom: f.name || 'fichier', etat: 'lecture' }; if (id) { BIB.ajouts.push(a); rendreContenuBibliotheque(); } else dire('Lecture de ' + guillemets(a.nom) + '…');
    let r; try { r = await plansDuFichier(f); } catch (e) { r = { erreur: a.nom + ' n’a pas pu être lu : ' + String(e && e.message || e) + '.' }; }
    if (r.erreur) { if (!id) { if (r.lu) direAvecGeste(r.erreur, 'Deviner ses colonnes', () => proposerRattrapage(a.nom, r.lu)); else dire(r.erreur, true); continue; }
      a.etat = 'ko'; a.texte = r.erreur; a.lu = r.lu || null; rendreContenuBibliotheque(); continue; }
    if (id) BIB.ajouts.splice(BIB.ajouts.indexOf(a), 1);
    if (!r.plans.length) continue;
    // le premier plan fait : l'installation qu'il lui faut (« À ranger » au besoin), sous les yeux
    if (!id) { id = installCourante(); montrerBibliotheque('install', id); }
    if (r.devine) devines.push(a.nom + ' : ' + r.devine);
    r.plans.forEach(x => { const p = creerPlan(id, x.nom, x.liaisons, { source: 'fichier', volta: x.volta }); BIB.nouveaux.add(p.id); faits.push(p); });
    rendreContenuBibliotheque(); }
  if (!id) return;
  rendreBibliotheque(); const p = faits[0], ins = BIB.installs.get(id);
  // un plan : ce qu'il porte ; plusieurs : combien — et, d'un tableau deviné, ce qui a été compris
  const vu = devines.length ? ' Colonnes devinées — ' + devines.join(' ; ') + '.' : '';
  if (faits.length === 1) dire(guillemets(nomAffiche(p.nom)) + ' ajouté à ' + guillemets(ins.nom) + ' : ' + plurielLie(p.n, 'liaison') + ', ' + plurielLie(p.folios, 'folio') + ' — un clic l’ouvre.' + vu);
  else if (faits.length) dire(pluriel(faits.length, 'plan') + ' ajoutés à ' + guillemets(ins.nom) + ' — un clic en ouvre un.' + vu); }

/* ---- la base des contrats déjà faits dans la bibliothèque ------------------------------------------------------------ */
/* Une base qui dit l'installation de chaque ligne crée chaque installation (ou la retrouve, par son nom) avec ses plans : un par
   harness, un par dessin quand la base n'a pas de harness. Redéposée, elle remplace les plans qu'elle avait créés (sauf
   celui qui est sur la table). Rend { installs, nouvelles, plans }, ou null quand la base ne dit pas d'installation. */
function rangerLaBase(L, nomBase) { const nomDe = l => l.install || (ecpLu(l.ecp) ? 'ECP ' + ecpLu(l.ecp) : ''), avec = (L || []).filter(nomDe);
  if (!avec.length) { synchroniserBibliotheque(); if (bibliothequeOuverte()) rendreBibliotheque(); return null; }
  const parInstall = grouper(avec, nomDe); let nouvelles = 0, n = 0;
  parInstall.forEach((Li, nomI) => { const e = ecpLu((Li.find(l => ecpLu(l.ecp)) || {}).ecp) || ecpDuNom(nomI);
    let ins = installDeLEcp(e) || installNommee(nomI); if (!ins) { ins = creerInstall(nomI, { ecp: e }); nouvelles++; } else if (e && !ins.ecp && !installDeLEcp(e)) { ins.ecp = e; garderInstall(ins); }
    const parH = grouper(Li, l => l.harness || ''), G = parH.size === 1 && parH.has('') ? grouper(Li, l => fwdDe(l) || '') : parH;
    G.forEach((Lp, k) => { const nom = k || nomI, deja = plansDeInstall(ins.id).find(p => p.source === 'base' && p.nom === nom);
      if (deja && deja.id === app.planId) return;
      if (deja) { Object.assign(deja, resumeDe({ liaisons: Lp }), { modifie: Date.now(), base: nomBase || '' }); garderPlan(deja); ecrireBiblio('contrats', deja.id, { planId: deja.id, nom, liaisons: Lp.map(l => ({ ...l })), neuf: true, t: Date.now() }); }
      else { const p = creerPlan(ins.id, nom, Lp, { source: 'base' }); p.base = nomBase || ''; garderPlan(p); }
      n++; }); });
  synchroniserBibliotheque(); if (bibliothequeOuverte()) rendreBibliotheque();
  return { installs: parInstall.size, nouvelles, plans: n }; }
/* LA GRANDE BASE RANGÉE PAR CONTRAT (v72 : 100 000 lignes et plus) : chaque installation que la base dit (sa colonne
   Install, son ECP) est créée — ou retrouvée, par son ECP puis son nom — avec SES CONTRATS : un plan par harness, qui ne
   recopie rien — il lit la base quand on l'ouvre (`ouvrirPlan`), 300 000 lignes ne se dupliquent pas. Son résumé (lignes,
   dessins, appareil, date du retest) vient des contrats de la base. Redéposée, la base met à jour les plans qu'elle avait
   faits ; un plan déjà ouvert garde ce qu'on y a fait. Rend { installs, nouvelles, plans }, ou null quand la base ne dit
   pas d'installation (la bibliothèque propose alors de RANGER ses harness). */
const resumeDuContrat = (c, nomBase) => ({ contrat: c.h, base: nomBase || '', n: c.n, folios: Math.max(1, c.fwds.length), harness: [c.h], nHarness: 1, fwds: c.fwds.slice(0, 12), dessins: c.fwds.length, appareil: c.appareil || '', retest: c.retest || '' });
// plusieurs plans d'un coup : une seule écriture
const garderPlansEnLot = ps => ps.length ? baseBiblio().then(db => { const st = db.transaction('plans', 'readwrite').objectStore('plans'); ps.forEach(p => st.put({ ...p }, p.id)); }).catch(() => { BIB.garde = false; }) : null;
function planDeContrat(ins, c, nomBase, t, fwd) { const p = { id: nouvelId('p'), install: ins.id, nom: fwd || c.h, source: 'base', cree: t, vu: 0, modifie: t, ...resumeDuContrat(c, nomBase) };
  if (fwd) Object.assign(p, { fwdBase: fwd, fwds: [fwd], dessins: 1, folios: 1, n: (c.fwdsN || [])[c.fwds.indexOf(fwd)] || 0 });
  BIB.plans.set(p.id, p); BIB.supprimes.delete(p.id); return p; }
function rangerLesContrats(B, nomBase) { const C = (B && B.meta.contrats || []).filter(c => c.install && c.h !== '—');
  if (!C.length) { synchroniserBibliotheque(); if (bibliothequeOuverte()) rendreBibliotheque(); return null; }
  const parInstall = grouper(C, c => c.install), t = Date.now(), lot = []; let nouvelles = 0, n = 0;
  parInstall.forEach((cs, nomI) => { const e = ecpLu((cs.find(c => ecpLu(c.ecp)) || {}).ecp) || ecpDuNom(nomI);
    let ins = installDeLEcp(e) || installNommee(nomI); if (!ins) { ins = creerInstall(nomI, { ecp: e }); nouvelles++; } else if (e && !ins.ecp && !installDeLEcp(e)) { ins.ecp = e; garderInstall(ins); }
    const deja = new Map(plansDeInstall(ins.id).filter(p => p.source === 'base' && !p.fwdBase).map(p => [p.contrat || p.nom, p]));
    cs.forEach(c => { let p = deja.get(c.h);
      if (p) { if (p.id === app.planId) return; Object.assign(p, resumeDuContrat(c, nomBase), { modifie: t }); if (!p.vu) ecrireBiblio('contrats', p.id); }   // jamais ouvert : il relira la base
      else p = planDeContrat(ins, c, nomBase, t);
      lot.push(p); n++; }); });
  garderPlansEnLot(lot); synchroniserBibliotheque(); if (bibliothequeOuverte()) rendreBibliotheque();
  return { installs: parInstall.size, nouvelles, plans: n }; }
/* Avant qu'une base s'en aille (oubliée, ou remplacée par une autre qui n'a plus ces contrats), les plans qui la lisaient
   prennent leurs liaisons, recopiées une fois : « les plans rangés dans la bibliothèque restent ». Un plan déjà ouvert a les
   siennes. Rend combien de plans sont concernés. */
function figerLesPlansDeLaBase(ancienne, nouvelle) { if (!ancienne) return 0; const garde = new Set(nouvelle ? nouvelle.meta.contrats.map(c => c.h) : []); let n = 0;
  BIB.plans.forEach(p => { if (p.source !== 'base' || !p.contrat || garde.has(p.contrat)) return; n++;
    lireBiblio('contrats', p.id).then(o => { if (o) return; const L = liaisonsDuContratDeLaBase(ancienne, p.contrat); if (!L || !L.length) return;
      ecrireBiblio('contrats', p.id, { planId: p.id, nom: p.nom, liaisons: p.fwdBase ? L.filter(l => fwdDe(l) === p.fwdBase) : L, neuf: true, t: Date.now() }); }); });
  return n; }
/* Les harness de la base, et ceux qu'aucun plan de la bibliothèque ne porte encore. */
function harnessDeLaBase() { const B = baseDeReferences(); if (!B) return [];
  const ranges = new Set(plansVrais().filter(p => p.source === 'base').flatMap(p => p.contrat ? [p.contrat] : p.harness || []));
  return B.meta.contrats.filter(c => c.h !== '—').map(c => ({ h: c.h, appareil: c.appareil, retest: c.retest, dessins: c.fwds.length, n: c.n, range: ranges.has(c.h) })).sort((a, b) => triNaturel(a.h, b.h)); }
const aRanger = () => harnessDeLaBase().filter(x => !x.range && x.h !== '—');
function ouvrirRanger() { const xs = aRanger(), H = harnessDeLaBase(); if (!H.length) return;
  BIB.ranger = { coches: new Set((xs.length ? xs : H).map(x => x.h)), par: 'harness', vers: '', nom: (app.references && app.references.nom ? nomAffiche(app.references.nom) : 'Contrats déjà faits') };
  if (BIB.vue !== 'racine') montrerBibliotheque('racine'); else rendreBibliotheque();
  setTimeout(() => { const r = document.querySelector('#bibliotheque .bi-ranger'); if (r && r.scrollIntoView) r.scrollIntoView({ block: 'nearest' }); }, 0); }
/* Ranger : chaque harness coché devient un plan (ou ses dessins, un plan chacun) de l'installation choisie, ou d'une neuve —
   des plans qui lisent la base quand on les ouvre, comme ceux que range une colonne d'installation. */
function rangerOk() { const R = BIB.ranger, B = baseDeReferences(); if (!R || !B || !R.coches.size) return;
  let ins = R.vers ? BIB.installs.get(R.vers) : null; if (!ins) ins = installNommee(R.nom) || creerInstall(R.nom || 'Contrats déjà faits', { ecp: installDeLEcp(ecpDuNom(R.nom)) ? '' : ecpDuNom(R.nom) });
  const t = Date.now(), lot = [];
  [...R.coches].sort(triNaturel).forEach(h => { const c = contratDeLaBase(B, h); if (!c) return;
    (R.par === 'fwd' && c.fwds.length > 1 ? c.fwds : [null]).forEach(f => { const p = planDeContrat(ins, c, app.references.nom || '', t, f); BIB.nouveaux.add(p.id); lot.push(p); }); });
  garderPlansEnLot(lot); BIB.ranger = null; montrerBibliotheque('install', ins.id); const n = lot.length;
  dire(pluriel(n, 'plan') + ' rangé' + (n > 1 ? 's' : '') + ' dans ' + guillemets(ins.nom) + '.'); }

/* ---- l'écran ----------------------------------------------------------------------------------------------------------- */
const chercheBiHtml = (ph, large) => `<label class="bi-cherche${large ? ' bi-cherche-large' : ''}">${icoBi('loupe')}<input id="bi-q" type="search" value="${escA(BIB.q)}" placeholder="${escA(ph)}" aria-label="${escA(ph)}" autocomplete="off" spellcheck="false"><kbd aria-hidden="true">/</kbd></label>`;
// un plan correspond à la recherche par son nom, ses harness, ses dessins, son appareil ; une installation par son ECP, son nom ou l'un de ses plans
// …et, un contrat de la base, par ce que ses lignes portent (la recherche dans tout : un part number, un câble)
const planCorrespondNom = (p, t) => !t || [p.nom, p.appareil, p.retest, ...(p.harness || []), ...(p.fwds || [])].some(x => cleTexte(x).includes(t));
const planCorrespond = (p, t) => planCorrespondNom(p, t) || !!(p.contrat && contratsTrouves() && contratsTrouves().has(p.contrat));
// une installation, par son ECP, son nom, le nom de l'un de ses plans (ce que ses contrats portent se dit à part : « Dans les contrats déjà faits »)
const installCorrespond = (i, t) => !t || cleTexte(i.nom).includes(t) || (i.ecp && i.ecp.includes(t.replace(/^ecp\s*/, '').replace(/\s/g, ''))) || plansDeInstall(i.id).some(p => planCorrespondNom(p, t));
/* L'écran entier : la tête (son titre, ses comptes, la recherche, l'action), puis le contenu, qui se refait seul quand on
   cherche (`rendreContenuBibliotheque`) — le champ garde le clavier. Une installation a, à sa gauche, toutes les autres. */
function rendreBibliotheque(o) { const el = $('bi-page'); if (!el || BIB.vue === 'plan') return;
  if (!BIB.pret) { el.innerHTML = ''; return; }
  const glisser = o && o.arrivee ? () => { } : glisserLesCartes();
  avecGroupes(() => { const corps = (BIB.vue === 'install' ? teteInstallHtml() : teteRacineHtml()) + `<div class="bi-contenu" id="bi-contenu">${contenuHtml()}</div>`
      + `<div class="bi-lot-place" id="bi-lot"${BIB.lot ? '' : ' hidden'}>${lotHtml()}</div>`;
    const rail = BIB.vue === 'install' ? railHtml() : '';
    el.classList.toggle('bi-avec-rail', !!rail); el.classList.toggle('bi-accueil', accueil()); el.classList.toggle('bi-en-lot', !!BIB.lot);
    el.innerHTML = rail ? rail + `<div class="bi-principal">${corps}</div>` : corps; });
  // l'accueil : la barre du haut s'efface, la marque flotte sur la table (style-bibliotheque.css)
  document.body.classList.toggle('biblio-accueil', accueil());
  // ce que dit la bibliothèque quand on y glisse un fichier : où il va
  $('bibliotheque').dataset.depotDit = 'Déposez vos installations : elles deviennent des plans de ' + guillemets(nomInstallCible());
  glisser(); apresRendu(); }
/* L'ARRIVÉE, une fois par session : ce qu'on voit se pose en cascade (la règle commune `.entre-v` : 420 ms, de --monte,
   40 ms d'écart, six crans au plus) — l'accueil : la pile, le titre, la phrase, les gestes, la ligne, le dock, puis les
   deux câbles de la vignette se tracent ; la bibliothèque : la tête, « Reprendre », l'intertitre, les cartes. Ensuite (le
   retour du plan, une installation, la racine) : un fondu de 220 ms, rien ne bouge. Jamais à chaque lettre cherchée. */
const ARRIVEE = ['.bi-pile', '.bi-vide-centre > h1', '.bi-chapeau', '.bi-vide-gestes', '.bi-vide-depot', '.bi-dock', '.bi-rail', '.bi-tete', '.bi-reprendre', '.bi-bandeau', '.bi-intertitre', '.bi-grille:not(.bi-grille-demo) > .bi-carte', '.bi-feuille', '.bi-essai'].join(', ');
function poser() { const p = $('bi-page'); if (!p || mouvementReduit()) return; clearTimeout(BIB.poseT); p.classList.remove('entre-v', 'bi-fondu', 'bi-trace');
  const fin = [...p.querySelectorAll('.entre-v')]; fin.forEach(e => e.classList.remove('entre-v'));
  if (BIB.arrive) { void p.offsetWidth; p.classList.add('entre-v', 'bi-fondu'); BIB.poseT = setTimeout(() => p.classList.remove('entre-v', 'bi-fondu'), 400); return; }
  BIB.arrive = true; const X = [...p.querySelectorAll(ARRIVEE)].filter(e => e.offsetParent && e.getBoundingClientRect().top < innerHeight);
  X.forEach((e, k) => { e.style.setProperty('--k', Math.min(k, 6)); e.classList.add('entre-v'); });
  if (p.querySelector('.bi-pile')) p.classList.add('bi-trace');
  BIB.poseT = setTimeout(() => { X.forEach(e => { e.classList.remove('entre-v'); e.style.removeProperty('--k'); }); p.classList.remove('bi-trace'); }, 1600); }
function rendreContenuBibliotheque() { const c = $('bi-contenu'); if (!c || BIB.vue === 'plan' || !BIB.pret) return; const glisser = glisserLesCartes(); c.innerHTML = avecGroupes(contenuHtml); glisser(); apresRendu(); }
/* LES CARTES GLISSENT À LEUR NOUVELLE PLACE (une installation neuve pousse la grille, une recherche la resserre) : leurs
   places avant le rendu, puis chacune part de l'ancienne et glisse à la nouvelle (300 ms, --courbe-glisse) ; une carte qui
   n'était pas là paraît. Seulement dans la même vue ; le mouvement réduit coupe. */
function glisserLesCartes() { const p = $('bi-page'); if (!p || mouvementReduit() || p.classList.contains('bi-trace')) return () => { };
  const vue = BIB.vue + '|' + BIB.install, avant = new Map(); p.querySelectorAll('.bi-grille .bi-carte[data-install], .bi-grille .bi-carte-neuve').forEach(c => avant.set(c.dataset.install || 'neuve', c.getBoundingClientRect()));
  if (!avant.size || [...avant.values()].every(r => !r.width)) return () => { };
  return () => { if (BIB.vue + '|' + BIB.install !== vue) return; const courbe = getComputedStyle(document.documentElement).getPropertyValue('--courbe-glisse').trim() || 'ease';
    p.querySelectorAll('.bi-grille .bi-carte[data-install], .bi-grille .bi-carte-neuve').forEach(c => { const a = avant.get(c.dataset.install || 'neuve'), b = c.getBoundingClientRect();
      if (!a) { c.animate([{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: courbe, delay: 60 }); return; }
      const dx = a.left - b.left, dy = a.top - b.top; if (Math.abs(dx) + Math.abs(dy) < 1) return;
      c.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 300, easing: courbe }); }); }; }
const contenuHtml = () => BIB.vue === 'install' ? installHtml() : racineHtml();
// ce qui s'écrit sur place prend le clavier (le champ demandé : l'ECP ou le nom) ; le « ⋯ » ouvert, sa première ligne
function apresRendu() { const champ = document.querySelector('#bibliotheque .bi-nommer [data-premier]') || document.querySelector('#bibliotheque .bi-nommer input');
  if (champ) { if (!champ.closest('.bi-nommer').contains(document.activeElement)) { champ.focus(); champ.select(); } return; }
  const pop = document.querySelector('#bibliotheque .bi-pop'); if (pop && !pop.contains(document.activeElement)) { const b = pop.querySelector('button'); if (b) b.focus(); return; }
  const oui = document.querySelector('#bibliotheque .bi-confirme [data-bi="oui"]'); if (oui && document.activeElement !== oui && !document.querySelector('#bibliotheque .bi-confirme').contains(document.activeElement)) oui.focus(); }

/* L'ECP d'une installation, tel qu'on le montre : « ECP » en petit, les cinq chiffres ; pas encore saisi, un tiret calme
   (le technicien v73 : « à saisir », en ambre, inquiétait — « j'ai oublié quelque chose ? ») ; dans la tête de
   l'installation, où un clic l'écrit, « N° ECP (facultatif) ». */
const ecpHtml = (i, cls, tete) => `<span class="bi-ecp${i.ecp ? '' : ' bi-ecp-vide'}${cls ? ' ' + cls : ''}">${i.ecp ? `<small>ECP</small><b>${esc(i.ecp)}</b>` : tete ? '<small>N° ECP</small><b>(facultatif)</b>' : '<small>ECP</small><b>—</b>'}</span>`;
const aUnEcp = i => !i.demo && i.id !== ID_A_RANGER;

/* LA RACINE : ses comptes, la recherche, « Nouvelle installation » ; le plan resté sur la table ; la base à ranger ; le
   rangement (ECP, nom, récentes) ; les cartes ; les plans qui répondent à la recherche ; l'Exemple, discret. Rien encore :
   l'accueil (`videHtml`) porte seul le titre, au milieu de la table. */
// l'accueil : rien encore — ni installation, ni base des contrats déjà faits (une base sans installation se cherche déjà)
const accueil = () => BIB.vue === 'racine' && !installsVraies().length && !BIB.q && !baseDeReferences() && !(BIB.edition && BIB.edition.quoi === 'nouvelle');
const pasGardeHtml = () => BIB.garde ? '' : '<span class="bi-pas-garde">pas gardée dans ce navigateur</span>';
function teteRacineHtml() { const V = installsVraies(), nP = plansVrais().length, B = baseDeReferences(); if (accueil()) return '';
  return `<header class="bi-tete"><div class="bi-titres"><h1 class="bi-titre">Bibliothèque</h1>`
    + `<p class="bi-compte">${V.length ? esc(lies([plurielLie(V.length, 'installation'), nPlans(nP)])) : 'Vos installations et leurs plans'}${B ? `<span class="bi-compte-base">${esc(POINT + 'base de ' + milliers(B.meta.n) + ' lignes')}</span>` : ''}${BIB.garde ? '' : POINT + pasGardeHtml()}</p></div>`
    + (V.length || B ? `<div class="bi-outils">${chercheBiHtml(B ? 'Chercher partout : part number, repère, câble, ECP…' : 'Chercher un ECP, une installation…', !!B)}<button class="bi-btn" id="bi-nouvelle" data-bi="nouvelle">${icoBi('plus')}<span>Nouvelle installation</span></button></div>` : '') + '</header>'; }
/* L'intertitre des cartes, au filet (le designer v73 : le segment flottait entre deux blocs) : « Installations, par n° ECP »,
   et à droite le rangement — par ECP, par nom, les plus récentes d'abord (le choix se garde). */
const TRI_DIT = { ecp: 'par n° ECP', nom: 'par nom', recentes: 'les plus récentes d’abord' };
const triHtml = () => `<div class="bi-intertitre"><h2 class="bi-sous">Installations${installsVraies().length > 1 ? `<span class="bi-sous-par">, ${TRI_DIT[triChoisi()]}</span>` : ''}</h2>`
  + (installsVraies().length > 1 ? `<span class="bi-tri-seg" role="group" aria-label="Ranger les installations">${TRIS.map(([k, mot]) => `<button data-bi="tri" data-tri="${k}" aria-pressed="${triChoisi() === k}">${mot}</button>`).join('')}</span>` : '') + '</div>';
function racineHtml() { const t = cleTexte(BIB.q), toutes = installsTriees(), I = toutes.filter(i => installCorrespond(i, t)), vraies = I.filter(i => !i.demo), demo = I.filter(i => i.demo);
  if (accueil()) return videHtml(demo[0]);
  let h = reprendreHtml() + bandeauBaseHtml() + rangerHtml();
  { const nouvelle = BIB.edition && BIB.edition.quoi === 'nouvelle' ? carteNouvelleHtml() : '';
    if ((installsVraies().length || nouvelle) && !t) h += triHtml();
    // une recherche que seules les lignes de la base portent (un part number, un câble) : ce qu'elles disent d'abord
    const trouve = t ? trouvesHtml() : '', base = !!(BIB.trouve && BIB.trouve.R && BIB.trouve.R.n);
    if (t && base && !vraies.length) h += trouve;
    h += vraies.length || nouvelle ? `<div class="bi-grille" role="list">${nouvelle}${vraies.map(carteInstallHtml).join('')}</div>` : t && !base ? `<p class="bi-rien">Aucune installation ne répond à ${esc(guillemets(BIB.q))}.</p>` : '';
    // la recherche : les plans qui répondent par leur nom (harness, dessin, appareil), puis ce que la base porte, ligne à ligne
    if (t) { const P = [...BIB.plans.values()].filter(p => planCorrespondNom(p, t)).sort((a, b) => TRI_NOMS(nomAffiche(a.nom), nomAffiche(b.nom)));
      if (P.length) h += `<h2 class="bi-sous">Plans<span>${P.length}</span></h2><div class="bi-feuille">${listePlansHtml(P.slice(0, 60), true)}</div>`;
      if (!(base && !vraies.length)) h += trouve; } }
  // l'Exemple ferme la marche, discret, au trait : « Pour essayer »
  if (demo.length) h += `<section class="bi-essai"><div class="bi-intertitre"><h2 class="bi-sous">Pour essayer</h2></div><div class="bi-grille bi-grille-demo" role="list">${demo.map(carteInstallHtml).join('')}</div></section>`;
  return h; }
/* Les folios du plan resté sur la table, en puces numérotées : où l'on en était (le courant, clair). Au-delà de huit,
   « 3 / 12 ». */
function foliosRepris() { const P = plans(), k = Math.max(0, P.indexOf(app.plan)); if (P.length < 2) return '';
  if (P.length > 8) return `<span class="bi-rep-n">${esc((k + 1) + INSECABLE + '/' + INSECABLE + P.length)}</span>`;
  return `<span class="bi-rep-folios" aria-hidden="true">${P.map((x, j) => `<i${j === k ? ' class="on"' : ''}>${j + 1}</i>`).join('')}</span>`; }
/* « REPRENDRE » le plan resté sur la table : un palet de VERRE (le designer v73 : une bande de papier blanc pleine largeur
   concurrençait les cartes ; le papier est réservé à ce qu'on choisit) — la vignette, « Reprendre où vous en étiez », son
   nom et son installation, ses folios (le courant en clair), Échap. Un clic le reprend (Échap aussi). */
function reprendreHtml() { if (!planSurLaTable()) return ''; const p = BIB.plans.get(app.planId), i = p && BIB.installs.get(p.install);
  return `<button class="bi-reprendre" id="bi-reprendre" data-bi="reprendre">${folioMini()}<span class="bi-rep-textes"><span class="bi-rep-mot">Reprendre où vous en étiez</span>`
    + `<span class="bi-rep-nom"><b>${esc(nomAffiche(app.nom))}</b>${i ? `<span>${INSECABLE}·${INSECABLE}${i.ecp ? `<span class="bi-rep-ecp">${esc(i.ecp)}</span> ` : ''}${esc(i.nom)}</span>` : ''}</span></span>`
    + `${foliosRepris()}<kbd>Échap</kbd></button>`; }
/* RIEN ENCORE : L'ACCUEIL, une vitrine (le designer v73, § 5.5 : « une composition, un objet, un titre, un geste, et un
   dock ») — au centre optique de la table : la pile de feuilles, « Ouvrez votre installation » en affiche (v74 : le mot
   du lecteur, plus « retest »), une phrase, les deux gestes (« Ouvrir une installation… » clair, ses deux touches Ctrl O ;
   « Nouvelle installation » au verre), une ligne pour le dépôt (la fenêtre entière le reçoit) ; en bas, le DOCK. Plus
   d'encadré pointillé ni de « Pour essayer » : l'Exemple et la base des contrats déjà faits sont deux tuiles du dock (la
   phrase de la base, dans sa bulle). */
function videHtml(demo) { return `<section class="bi-vide"><div class="bi-vide-centre">${pileAccueil()}<h1 class="bi-titre bi-affiche">Ouvrez votre installation</h1>`
  + `<p class="bi-chapeau">Une ligne par câble, en Excel ou en CSV. Volta dessine les folios et vérifie chaque calibre, chaque contact, chaque câble.</p>${BIB.garde ? '' : `<p class="bi-vide-note">${pasGardeHtml()}</p>`}`
  + `<div class="bi-vide-gestes"><button class="bi-btn bi-btn-ouvrir" data-bi="ouvrir">${icoBi('depot')}<span>Ouvrir une installation…</span><kbd class="bi-touches-k"><span>Ctrl</span><i>+</i><span>O</span></kbd></button><button class="bi-btn bi-btn-2" data-bi="nouvelle">${icoBi('plus')}<span>Nouvelle installation</span></button></div>`
  + `<p class="bi-vide-depot">${icoBi('glisser')}<span>ou glissez-le n’importe où dans la fenêtre</span></p></div>${dockHtml(demo)}</section>`; }
/* LE DOCK : le verre des palets, en bas au milieu — « Reprendre » le plan resté sur la table (s'il y en a un), l'Exemple,
   la base des contrats déjà faits : comme des applications. Une tuile : son image (une vignette, une icône), son nom, ce
   qu'elle fait. */
const BULLE_BASE = 'Un seul Excel qui porte tous vos contrats (Harness rempli) : chaque installation se crée avec ses contrats, même à 300 000 lignes.';
function dockHtml(demo) { const rep = planSurLaTable() ? tuileReprendreHtml() : '', ex = demo ? tuileExempleHtml(demo) : '';
  const base = `<button class="bi-tuile" data-bi="base" aria-describedby="bi-bulle-base"><span class="bi-tuile-ico">${icoBi('base')}</span><span class="bi-tuile-t"><b>Base des contrats</b><small>déposer les contrats déjà faits</small></span><span class="bulle bi-bulle-haut" id="bi-bulle-base" aria-hidden="true">${esc(BULLE_BASE)}</span></button>`;
  return `<nav class="bi-dock" aria-label="Pour commencer autrement">${rep}${rep ? '<hr>' : ''}${ex}${ex ? '<hr>' : ''}${base}</nav>`; }
function tuileReprendreHtml() { return `<button class="bi-tuile bi-tuile-reprendre" id="bi-reprendre" data-bi="reprendre">${folioMini('bi-tuile-vi')}<span class="bi-tuile-t"><b>Reprendre</b><small>${esc(nomAffiche(app.nom))}</small></span><kbd>Échap</kbd></button>`; }
// l'Exemple, une tuile du dock : sa carte ouvre son plan d'un clic (la même `.bi-carte.bi-demo` que sur la bibliothèque pleine)
function tuileExempleHtml(i) { const p = plansDeInstall(i.id)[0], f = p && p.folios ? plurielLie(p.folios, 'folio') : nPlans(plansDeInstall(i.id).length), pb = p && p.problemes && p.problemes.ko;
  return `<div class="bi-carte bi-demo bi-tuile-carte" data-install="${escA(i.id)}"><button class="bi-carte-corps bi-tuile" data-bi="exemple" aria-label="${escA(lies(['Ouvrir l’exemple', 'démonstration', f, pb ? plurielLie(pb, 'problème') : '']))}">${folioMini('bi-tuile-vi')}<span class="bi-tuile-t"><b>Exemple</b><small>${esc(lies(['démonstration', f]))}${pb ? `${POINT}<span class="bi-carte-pb">${esc(plurielLie(pb, 'problème'))}</span>` : ''}</small></span></button></div>`; }
/* UNE CARTE D'INSTALLATION (le designer v73, § 5.6) : une VRAIE pile de feuilles — dessous, une ou deux feuilles de papier
   (deux plans : une ; trois et plus : deux), chacune son filet —, dessus la carte : son ECP, son état en pastille (« 2
   problèmes » : le rouge ne dit que les problèmes), son nom, ses comptes, ses premiers plans, un par ligne, en mots (une
   mini-feuille devant). Au survol, la carte se soulève et ses feuilles s'éventent. Le « ⋯ » (le nom et l'ECP, supprimer) ;
   modifiée sur place ; la confirmation d'une suppression s'écrit dedans. L'Exemple : au trait, la vignette de son plan. */
function carteInstallHtml(i) { const P = plansDeInstall(i.id), vu = vueLe(i), pile = P.length >= 3 ? 3 : P.length, t = cleTexte(BIB.q);
  const edite = BIB.edition && BIB.edition.quoi === 'install' && BIB.edition.id === i.id, confirme = BIB.confirme && BIB.confirme.quoi === 'install' && BIB.confirme.id === i.id;
  const meta = i.demo ? lies(['démonstration', nPlans(P.length)]) : lies([nPlans(P.length), vu ? 'ouverte ' + quand(vu) : 'créée ' + leJour(i.cree)]);
  const montres = (t ? P.filter(p => planCorrespond(p, t)) : P).slice(0, 3), reste = P.length - montres.length;
  const noms = P.length ? `<span class="bi-carte-plans">${montres.map(p => `<span class="bi-pn"><i aria-hidden="true"></i><span>${esc(nomAffiche(p.nom))}</span></span>`).join('')}${reste > 0 ? `<span class="bi-pn-plus">+${INSECABLE}${esc(plurielLie(reste, 'autre'))}</span>` : ''}</span>`
    : `<span class="bi-carte-plans bi-carte-plans-vide">Aucun plan : un clic, puis déposez vos installations.</span>`;
  const haut = i.demo ? folioMini() : aUnEcp(i) ? ecpHtml(i, 'bi-carte-ecp') : `<span class="bi-carte-ico">${icoBi('install')}</span>`;
  // l'Exemple : sa carte OUVRE son plan, d'un clic (audit v72, parcours P2-2 : une page pour une ligne, c'était un clic de trop)
  const geste = i.demo ? 'data-bi="exemple"' : `data-bi="install" data-id="${escA(i.id)}"`;
  // ce qu'il reste à faire dans ses plans (le compte gardé de chacun) : on voit d'un coup d'œil où il y a du travail
  const aReprendre = P.reduce((s, p) => s + (p.problemes ? p.problemes.ko : 0), 0), pb = aReprendre ? plurielLie(aReprendre, 'problème') : '';
  const etat = pb && !i.demo ? `<span class="bi-carte-etat ko">${esc(pb)}</span>` : '';
  const feuilles = (pile >= 3 ? '<i class="bi-f bi-f3" aria-hidden="true"></i>' : '') + (pile >= 2 ? '<i class="bi-f bi-f2" aria-hidden="true"></i>' : '');
  const plus = `<button class="bi-plus" data-bi="pop" data-quoi="install" data-id="${escA(i.id)}" aria-label="${escA('Gestes pour ' + i.nom)}" aria-haspopup="menu" aria-expanded="${!!(BIB.pop && BIB.pop.id === i.id)}">${icoBi('points')}<span class="bulle" aria-hidden="true">${i.demo ? 'Retirer l’exemple' : aUnEcp(i) ? 'Nom et ECP, supprimer' : 'Renommer, supprimer'}</span></button>`;
  const article = cls => `<article class="bi-carte${cls} pile-${pile}${BIB.pop && BIB.pop.id === i.id ? ' bi-pop-ouvert' : ''}" role="listitem" data-install="${escA(i.id)}">${feuilles}`;
  if (confirme) return article(' bi-confirmant') + `<div class="bi-carte-corps">${confirmeInstallHtml(i, P)}</div></article>`;
  return article(i.demo ? ' bi-demo' : '')
    + (edite ? `<div class="bi-carte-corps">${nommerInstallHtml('install', i)}<span class="bi-carte-meta">${esc(meta)}</span></div>`
      : `<button class="bi-carte-corps" ${geste} aria-label="${escA(lies([i.demo ? 'Ouvrir l’exemple' : '', i.ecp ? 'ECP ' + i.ecp : '', i.nom, meta, pb]))}">${haut}${etat}<span class="bi-carte-textes"><span class="bi-carte-nom">${esc(i.nom)}</span><span class="bi-carte-meta">${esc(meta)}${pb && i.demo ? `${POINT}<span class="bi-carte-pb">${esc(pb)}</span>` : ''}</span></span>${i.demo ? icoBi('ouvrir', 'bi-demo-fleche') : noms}</button>`)
    + (edite ? '' : plus) + popHtml('install', i) + '</article>'; }
function carteNouvelleHtml() { return `<article class="bi-carte bi-carte-neuve" role="listitem"><div class="bi-carte-corps">${nommerInstallHtml('nouvelle', null)}<span class="bi-carte-meta bi-touches"><kbd>Entrée</kbd> la crée<kbd>Échap</kbd> renonce</span></div></article>`; }
/* Ce qui s'écrit sur place. Un plan : son nom. Une installation (neuve ou modifiée) : son ECP — cinq chiffres, le clavier
   passe seul au nom quand ils y sont — et son nom. Entrée garde, Échap renonce ; quitter les deux champs garde aussi. */
const nommerHtml = (quoi, id, val, ph) => `<span class="bi-nommer"><input id="bi-nom" data-nommer="${quoi}" data-champ="nom" data-id="${escA(id)}" value="${escA(val)}" placeholder="${escA(ph)}" aria-label="Nom du plan" autocomplete="off" spellcheck="false"></span>`;
function nommerInstallHtml(quoi, i) { const neuve = quoi === 'nouvelle', id = i ? i.id : '', sfx = neuve ? '-nouvelle' : '', champ = (BIB.edition && BIB.edition.champ) || (neuve ? 'ecp' : 'nom');
  return `<span class="bi-nommer bi-nommer-install">`
    + `<label class="bi-champ-ecp"><span>ECP</span><input id="bi-ecp${sfx}" data-nommer="${quoi}" data-champ="ecp" data-id="${escA(id)}" value="${escA(i ? i.ecp || '' : '')}" placeholder="5 chiffres" inputmode="numeric" maxlength="7" aria-label="Numéro d’ECP (cinq chiffres)" autocomplete="off" spellcheck="false"${champ === 'ecp' ? ' data-premier' : ''}></label>`
    + `<input id="bi-nom${sfx}" data-nommer="${quoi}" data-champ="nom" data-id="${escA(id)}" value="${escA(i ? i.nom : '')}" placeholder="${neuve ? 'Antenne VHF, Cockpit…' : 'Nom de l’installation'}" aria-label="Nom de l’installation" autocomplete="off" spellcheck="false"${champ === 'nom' ? ' data-premier' : ''}></span>`; }
// supprimer une installation : ses plans partent avec elle ; l'Exemple, lui, se retire (le menu Plus le rouvre)
const confirmeInstallHtml = (i, P) => confirmeHtml('install', i.id, i.demo ? 'Retirer l’exemple ?' : 'Supprimer ' + guillemets(i.nom) + ' ?',
  i.demo ? 'Le menu Plus le rouvre quand vous voulez.' : P.length > 1 ? 'Ses ' + pluriel(P.length, 'plan') + ' partent avec elle, et ce qu’on y a fait.' : P.length ? 'Son plan part avec elle, et ce qu’on y a fait.' : 'Elle est vide.');
// la confirmation d'une suppression, dans la carte ou la ligne : la corbeille, la phrase, « Supprimer », « Annuler »
const confirmeHtml = (quoi, id, titre, sous) => `<div class="bi-confirme" role="alertdialog" aria-label="${escA(titre)}"><span class="bi-confirme-ico">${icoBi('supprimer')}</span><p><b>${esc(titre)}</b> ${esc(sous)}</p><div class="bi-confirme-gestes"><button class="bi-danger" data-bi="oui" data-quoi="${quoi}" data-id="${escA(id)}">${quoi === 'install' && estDemo(id) ? 'Retirer' : 'Supprimer'}</button><button class="bi-non" data-bi="non">Annuler</button></div></div>`;
/* Le « ⋯ » : une petite liste sous le bouton, sombre comme le menu ⋮ (l'îlot sombre). Une installation : son nom et son ECP,
   supprimer. Un plan : ouvrir, renommer, déplacer vers une autre installation (la liste, ou une neuve), supprimer.
   L'exemple : le retirer. */
function popHtml(quoi, x) { if (!(BIB.pop && BIB.pop.quoi === quoi && BIB.pop.id === x.id)) return '';
  const ligne = (bi, ico, mot, extra) => `<button role="menuitem" data-bi="${bi}" data-quoi="${quoi}" data-id="${escA(x.id)}"${extra || ''}>${icoBi(ico)}<span>${mot}</span></button>`;
  const pop = h => `<div class="bi-pop menu-verre" role="menu">${h}</div>`;
  if (quoi === 'install') return pop(x.demo ? ligne('supprimer', 'supprimer', 'Retirer l’exemple', ' class="danger"') : ligne('renommer', 'renommer', aUnEcp(x) ? 'Nom et ECP' : 'Renommer') + '<hr>' + ligne('supprimer', 'supprimer', 'Supprimer…', ' class="danger"'));
  if (BIB.pop.sous === 'deplacer') { const autres = installsTriees().filter(i => !i.demo && i.id !== x.install);
    return pop(`<button role="menuitem" class="bi-pop-retour" data-bi="pop-retour" data-quoi="plan" data-id="${escA(x.id)}">${icoBi('retour')}<span>Déplacer vers…</span></button>${autres.map(i => `<button role="menuitem" data-bi="deplacer-vers" data-id="${escA(x.id)}" data-vers="${escA(i.id)}">${icoBi('install')}<span>${i.ecp ? `<span class="bi-pop-ecp">${esc(i.ecp)}</span>` : ''}${esc(i.nom)}</span></button>`).join('')}<hr><button role="menuitem" data-bi="deplacer-vers" data-id="${escA(x.id)}" data-vers="">${icoBi('plus')}<span>Une nouvelle installation</span></button>`); }
  return pop(`${ligne('plan', 'ouvrir', 'Ouvrir')}${ligne('renommer', 'renommer', 'Renommer')}${ligne('deplacer', 'deplacer', 'Déplacer vers…')}<hr>${ligne('supprimer', 'supprimer', 'Supprimer…', ' class="danger"')}`); }

/* LE RAIL : toutes les installations, par ECP (ou par nom, si c'est le rangement choisi) — un clic passe de l'une à l'autre (Alt+↑, Alt+↓ aussi) ;
   celle qu'on regarde est marquée. L'Exemple ferme la liste, discret. */
function railHtml() { const T = ordreDuRail(); if (T.length < 2) return '';
  const ligne = i => { const n = plansDeInstall(i.id).length, ici = i.id === BIB.install;
    return `<li><button class="bi-rail-l${i.demo ? ' bi-rail-demo' : ''}" data-bi="install" data-id="${escA(i.id)}"${ici ? ' aria-current="page"' : ''} data-bulle="${escA(lies([i.ecp ? 'ECP ' + i.ecp : '', i.nom, nPlans(n)]))}">`
      + `<span class="bi-rail-ecp">${aUnEcp(i) ? (i.ecp ? esc(i.ecp) : '—') : ''}</span><span class="bi-rail-nom">${esc(i.nom)}</span><span class="bi-rail-n">${n || ''}</span></button></li>`; };
  return `<nav class="bi-rail" aria-label="Les installations"><p class="bi-rail-titre"><span>Installations</span><kbd data-bulle="Alt+↑ · Alt+↓ : l’installation d’avant, d’après">Alt ↑↓</kbd></p><ul>${T.map(ligne).join('')}</ul></nav>`; }

/* UNE INSTALLATION : son ECP et son nom (un clic les modifie), créée quand, modifiée quand, la recherche, « Ajouter un
   plan », le « ⋯ » ; puis la feuille de ses plans, la zone de dépôt en bas — elle seule quand l'installation est vide. */
function teteInstallHtml() { const i = BIB.installs.get(BIB.install), P = plansDeInstall(i.id), mod = modifieeLe(i);
  const edite = BIB.edition && BIB.edition.quoi === 'install' && BIB.edition.id === i.id;
  return `<header class="bi-tete"><div class="bi-titres"><button class="bi-retour" id="bi-retour" data-bi="racine" aria-label="Retour à la bibliothèque">${icoBi('retour')}<span>Bibliothèque</span></button>`
    + (edite ? `<div class="bi-titre bi-titre-edite">${nommerInstallHtml('install', i)}</div>`
      : (aUnEcp(i) ? `<button class="bi-ecp-tete" data-bi="renommer" data-quoi="install" data-id="${escA(i.id)}" data-champ="ecp" data-bulle="${i.ecp ? 'Modifier l’ECP' : 'Saisir l’ECP : il range l’installation parmi les autres'}">${ecpHtml(i, '', true)}</button>` : '')
        + `<h1 class="bi-titre"><button class="bi-titre-nom" data-bi="renommer" data-quoi="install" data-id="${escA(i.id)}" data-champ="nom" data-bulle="${i.demo ? '' : 'Renommer'}"${i.demo ? ' disabled' : ''}>${esc(i.nom)}</button></h1>`)
    + `<p class="bi-compte">${esc(lies([i.demo ? 'démonstration' : '', nPlans(P.length), 'créée ' + leJour(i.cree), mod ? 'modifiée ' + quand(mod) : '']))}</p></div>`
    + `<div class="bi-outils">${P.length > 6 ? chercheBiHtml(baseDeReferences() ? 'Un plan, un part number, un câble…' : 'Chercher un plan, un harness, un dessin') : ''}${P.length && !i.demo ? `<button class="bi-btn bi-btn-2" id="bi-convertir" data-bi="lot" aria-pressed="${!!BIB.lot}">${icoBi('depot')}<span>Convertir…</span></button>` : ''}${i.demo ? '' : `<button class="bi-btn" id="bi-ajouter" data-bi="choisir">${icoBi('plus')}<span>Ajouter un plan</span></button>`}`
    + `<span class="bi-pop-ancre${BIB.pop && BIB.pop.id === i.id ? ' bi-pop-ouvert' : ''}"><button class="bi-plus bi-plus-tete" data-bi="pop" data-quoi="install" data-id="${escA(i.id)}" aria-label="${escA('Gestes pour ' + i.nom)}" aria-haspopup="menu">${icoBi('points')}<span class="bulle" aria-hidden="true">${i.demo ? 'Retirer l’exemple' : 'Renommer, supprimer l’installation'}</span></button>${popHtml('install', i)}</span></div></header>`
    + (BIB.confirme && BIB.confirme.quoi === 'install' && BIB.confirme.id === i.id ? `<div class="bi-feuille bi-confirme-tete">${confirmeInstallHtml(i, P)}</div>` : ''); }
function installHtml() { const i = BIB.installs.get(BIB.install); if (!i) return ''; const t = cleTexte(BIB.q), P = plansDeInstall(i.id), montres = P.filter(p => planCorrespond(p, t));
  // la zone de dépôt : une ligne au bas de la feuille ; l'installation vide, elle seule — une icône, une phrase, ce qu'elle attend
  const zone = i.demo ? '' : P.length ? `<button type="button" class="bi-zone" data-bi="choisir">${icoBi('depot')}<span><b>Glissez d’autres installations ici</b> ou cliquez — plusieurs à la fois</span></button>`
    : `<button type="button" class="bi-zone bi-zone-grande" data-bi="choisir"><span class="bi-zone-ico">${icoBi('depot')}</span><b>Glissez vos installations ici</b><span>ou cliquez pour les choisir — plusieurs à la fois</span>`
      + '<small>Excel ou CSV, une ligne par câble : <span class="id">Device1</span> · <span class="id">Pin1</span> · <span class="id">Device2</span> · <span class="id">Pin2</span> au moins. Chaque fichier devient un plan.</small></button>';
  const ajouts = BIB.ajouts.map(a => `<li class="bi-plan bi-ajout ${a.etat}"><span class="bi-ajout-ico" aria-hidden="true"></span><span class="bi-ajout-t">${a.etat === 'lecture' ? 'Lecture de ' + esc(guillemets(a.nom)) + '…' : esc(a.texte)}</span>${a.etat === 'ko' ? `${a.lu ? `<button class="bi-lien" data-bi="deviner" data-a="${escA(a.id)}">Deviner ses colonnes</button>` : ''}<button class="bi-oublier" data-bi="oublier-ajout" data-a="${escA(a.id)}" aria-label="Effacer ce message">${icoBi('fermer')}</button>` : ''}</li>`).join('');
  if (!P.length && !ajouts) return `<div class="bi-feuille bi-feuille-vide">${zone}</div>`;
  return `<div class="bi-feuille" data-depot="plans">${ajouts ? `<ul class="bi-plans bi-ajouts">${ajouts}</ul>` : ''}${montres.length ? listePlansHtml(montres, false) : t ? `<p class="bi-rien bi-rien-feuille">Aucun plan ne répond à ${esc(guillemets(BIB.q))}.</p>` : ''}${zone}</div>`; }
/* La liste des plans : l'en-tête des colonnes, puis une ligne par plan — sa feuille, son nom (« sur la table », « nouveau »)
   et dessous ce qu'il est (un contrat de la base : son appareil, la date de son retest, ses dessins ; un fichier : ses
   harness et ses dessins), ses folios, ses liaisons, CE QU'IL RESTE À FAIRE (le compte du contrôle, gardé à chaque
   enregistrement : « 3 problèmes », « 5 à voir », « rien à reprendre » — « pas encore ouvert » sinon), modifié, et sa
   dernière ouverture avec, dessous, « exporté le … » (pages, idée 7 : on voit d'un coup d'œil ce qui reste à faire).
   `avecInstall` : la recherche de la racine dit l'installation de chacun (à la place de « modifié »). En CONVERSION EN LOT
   (`BIB.lot`), la feuille devient une case à cocher et un clic choisit au lieu d'ouvrir. */
function listePlansHtml(P, avecInstall) { const lot = !!BIB.lot, tous = lot && P.length && P.every(p => BIB.lot.ids.has(p.id));
  return `<div class="bi-ligne bi-entetes${avecInstall ? ' avec-install' : ''}"${lot ? '' : ' aria-hidden="true"'}>${lot ? `<button class="bi-coche-tous" data-bi="lot-tous" aria-pressed="${tous}" aria-label="${tous ? 'Ne plus choisir ces plans' : 'Choisir tous ces plans'}"><span class="bi-coche" aria-hidden="true"></span></button>` : '<span></span>'}<span>Plan</span>${avecInstall ? '<span>Installation</span>' : ''}<span class="d">Folios</span><span class="d">Liaisons</span><span>À reprendre</span>${avecInstall ? '' : '<span>Modifié</span>'}<span>Ouvert</span></div>`
    + `<ul class="bi-plans" role="list">${P.map(p => lignePlanHtml(p, avecInstall)).join('')}</ul>`; }
// sous le nom d'un plan : un contrat de la base dit son appareil, la date de son retest, ses dessins ; un fichier, ses harness
// (quand ils ne sont pas son nom) et ses dessins — ce que la recherche lit aussi
const sousPlan = p => { if (p.source === 'base') return lies([p.appareil, p.retest ? 'installation du ' + p.retest : '', p.fwdBase ? 'un dessin' : p.dessins > 1 ? plurielLie(p.dessins, 'dessin') : '']);
  const h = (p.harness || []).filter(x => cleTexte(x) !== cleTexte(nomAffiche(p.nom)));
  return lies([h.slice(0, 2).join(', ') + (h.length > 2 ? '…' : ''), p.dessins > 1 ? plurielLie(p.dessins, 'dessin') : '']); };
// ce qu'il reste à faire, d'après le dernier contrôle gardé
const problemesHtml = p => { const x = p.problemes; if (!x) return '<span class="bi-pb bi-pb-rien">pas encore ouvert</span>';
  return x.ko ? `<span class="bi-pb ko">${esc(plurielLie(x.ko, 'problème'))}</span>` : x.att ? `<span class="bi-pb att">${x.att}${INSECABLE}à voir</span>` : '<span class="bi-pb ok">rien à reprendre</span>'; };
function lignePlanHtml(p, avecInstall) { const i = BIB.installs.get(p.install), table = p.id === app.planId && planSurLaTable(), neuf = BIB.nouveaux.has(p.id), lot = !!BIB.lot, choisi = lot && BIB.lot.ids.has(p.id);
  const edite = BIB.edition && BIB.edition.quoi === 'plan' && BIB.edition.id === p.id, confirme = BIB.confirme && BIB.confirme.quoi === 'plan' && BIB.confirme.id === p.id;
  if (confirme) return `<li class="bi-plan bi-confirmant" data-plan="${escA(p.id)}">${confirmeHtml('plan', p.id, 'Supprimer ' + guillemets(nomAffiche(p.nom)) + ' ?', 'Ses liaisons et ce qu’on y a fait partent avec lui.')}</li>`;
  const etiquette = table ? '<em class="bi-table">sur la table</em>' : neuf ? '<em class="bi-neuf">nouveau</em>' : '', sous = sousPlan(p);
  const ou = avecInstall ? `<span class="bi-plan-sous">${i ? `${i.ecp ? `<span class="bi-plan-ecp">${esc(i.ecp)}</span>` : ''}${esc(i.nom)}` : '—'}</span>` : '';
  // modifié, ouvert : quand (« aujourd'hui à 9:12 ») — jamais ouvert, il le dit ; exporté, dessous
  // un contrat de la base jamais ouvert n'a pas été modifié (sa date est celle de son retest, dessous)
  const modifie = avecInstall ? '' : p.source === 'base' && !p.vu ? '<span class="bi-plan-date bi-jamais">—</span>' : `<span class="bi-plan-date">${esc(quand(p.modifie || p.cree))}</span>`;
  const ouvert = `<span class="bi-plan-vu">${p.vu ? `<span>${esc(quand(p.vu))}</span>` : '<span class="bi-jamais">jamais</span>'}${p.exporte ? `<small>exporté ${esc(leJour(p.exporte))}</small>` : ''}</span>`;
  const tete = lot ? '<span class="bi-coche" aria-hidden="true"></span>' : `<span class="bi-plan-ico">${icoBi('plan')}</span>`;
  const cellules = nom => `${tete}${nom}${ou}<span class="d">${p.folios || 0}</span><span class="d bi-plan-n">${p.n || 0}</span>${problemesHtml(p)}${modifie}${ouvert}`;
  return `<li class="bi-plan${table ? ' sur-table' : ''}${neuf ? ' nouveau' : ''}${choisi ? ' choisi' : ''}${BIB.pop && BIB.pop.id === p.id ? ' bi-pop-ouvert' : ''}" data-plan="${escA(p.id)}">`
    + (edite ? `<span class="bi-ligne${avecInstall ? ' avec-install' : ''}">${cellules(nommerHtml('plan', p.id, nomAffiche(p.nom), 'Nom du plan'))}</span>`
      : `<button class="bi-ligne${avecInstall ? ' avec-install' : ''} bi-plan-ouvrir" data-bi="plan" data-id="${escA(p.id)}"${lot ? ` aria-pressed="${choisi}"` : ''} aria-label="${escA((lot ? (choisi ? 'Choisi : ' : 'Choisir ') : 'Ouvrir ') + nomAffiche(p.nom) + ' : ' + plurielLie(p.folios || 0, 'folio'))}">${cellules(`<span class="bi-plan-nom"><span class="bi-plan-l1"><b>${esc(nomAffiche(p.nom))}</b>${etiquette}</span>${sous ? `<span class="bi-plan-l2">${esc(sous)}</span>` : ''}</span>`)}</button>`)
    + (edite || p.id === ID_EXEMPLE || lot ? '' : `<button class="bi-plus" data-bi="pop" data-quoi="plan" data-id="${escA(p.id)}" aria-label="${escA('Gestes pour ' + nomAffiche(p.nom))}" aria-haspopup="menu" aria-expanded="${!!(BIB.pop && BIB.pop.id === p.id)}">${icoBi('points')}<span class="bulle" aria-hidden="true">Renommer, déplacer, supprimer</span></button>`)
    + popHtml('plan', p) + '</li>'; }

/* LA BASE À RANGER : une base sans colonne d'installation a des harness qu'aucun plan ne porte ; la bibliothèque le dit en
   une ligne (« Plus tard » la fait taire pour cette base) et, sur demande, les range : on coche, on choisit l'installation. */
function bandeauBaseHtml() { const R = app.references, xs = R ? aRanger() : []; if (!xs.length || BIB.ranger || BIB.q) return '';
  const pref = preferencesBiblio(); if (pref.baseTue && pref.baseTue === (R.nom || '') + '|' + (R.t || 0)) return '';
  return `<div class="bi-bandeau">${icoBi('base')}<span>La base des contrats déjà faits${R.nom ? ' (<b>' + esc(R.nom) + '</b>)' : ''} compte ${esc(pluriel(xs.length, 'harness'))} ${xs.length > 1 ? 'qui ne sont rangés' : 'qui n’est rangé'} dans aucune installation.</span><button class="bi-btn bi-btn-2" data-bi="ranger">${xs.length > 1 ? 'Les ranger…' : 'Le ranger…'}</button><button class="bi-lien-table" data-bi="ranger-tais">Plus tard</button></div>`; }
function rangerHtml() { const R = BIB.ranger; if (!R) return ''; const H = harnessDeLaBase(), I = installsTriees().filter(i => !i.demo), n = R.coches.size;
  return `<section class="bi-feuille bi-ranger" aria-label="Ranger la base dans la bibliothèque"><div class="bi-ranger-tete"><h2>Ranger la base dans la bibliothèque</h2><p>Chaque harness coché devient un plan de l’installation choisie — ou un plan par dessin (FWD).</p></div>`
    + `<ul class="bi-ranger-liste">${H.map(x => `<li><label><input type="checkbox" data-ranger-h="${escA(x.h)}"${R.coches.has(x.h) ? ' checked' : ''}><b class="id">${esc(x.h)}</b><span>${esc(lies([x.appareil, x.retest, plurielLie(x.dessins, 'dessin'), plurielLie(x.n, 'liaison')]))}</span>${x.range ? '<em>déjà rangé</em>' : ''}</label></li>`).join('')}</ul>`
    + `<div class="bi-ranger-pied"><div class="segment" role="group" aria-label="Un plan par"><button data-bi="ranger-par" data-par="harness" aria-pressed="${R.par === 'harness'}">un plan par harness</button><button data-bi="ranger-par" data-par="fwd" aria-pressed="${R.par === 'fwd'}">par dessin</button></div>`
    + `<label class="bi-ranger-vers"><span>dans</span><select id="bi-ranger-vers"><option value=""${R.vers ? '' : ' selected'}>une nouvelle installation…</option>${I.map(i => `<option value="${escA(i.id)}"${R.vers === i.id ? ' selected' : ''}>${esc(lies([i.ecp, i.nom]))}</option>`).join('')}</select></label>`
    + (R.vers ? '' : `<input id="bi-ranger-nom" class="bi-ranger-nom" value="${escA(R.nom)}" placeholder="Nom de l’installation" aria-label="Nom de la nouvelle installation" spellcheck="false">`)
    + `<span class="espace"></span><button class="btn lien" data-bi="ranger-annuler">Annuler</button><button class="btn cuivre" data-bi="ranger-ok"${n ? '' : ' disabled'}>Ranger ${esc(pluriel(n, 'harness'))}</button></div></section>`; }

/* ---- CHERCHER DANS TOUT : la base entière, d'un mot -----------------------------------------------------------------
   Le lecteur (20 octobre 2026) : « chercher dans tout ». La recherche de la racine cherche aussi dans les 300 000 lignes
   de la base (09, `chercherDansLaBase` : un part number, un type de câble, un repère, un numéro de câble, un harness, un
   dessin, « 300XC1:B5 » une borne exactement, « "W-012" » une case entière) : les contrats qui les portent, leurs lignes,
   le champ trouvé marqué. Un clic ouvre le contrat — sur le repère, le câble trouvé. La recherche part 140 ms après la
   dernière lettre (elle prend quelques dizaines de millisecondes sur 300 000 lignes) ; dans une installation, elle choisit
   ses plans qui portent le mot. */
function lancerRecherche() { clearTimeout(BIB.chercheT); const q = BIB.q.trim(), B = baseDeReferences();
  if (!B || q.replace(/["\s:]/g, '').length < 2) { BIB.trouve = null; return; }
  if (BIB.trouve && BIB.trouve.q === q && BIB.trouve.B === B && !BIB.trouve.enCours) return;
  BIB.filtreTrouve = null;   // une autre recherche : les filtres repartent de zéro
  BIB.trouve = { q, B, R: BIB.trouve && BIB.trouve.B === B ? BIB.trouve.R : null, enCours: true, genres: BIB.trouve ? BIB.trouve.genres : [] };
  BIB.chercheT = setTimeout(() => { if (BIB.q.trim() !== q || baseDeReferences() !== B) return; const t0 = performance.now(), R = chercherDansLaBase(B, q, { parContrat: 3 });
    BIB.trouve = { q, B, R, enCours: false, ms: Math.max(1, Math.round(performance.now() - t0)), genres: R ? genreTrouve(B, R) : [], contrats: R ? new Set(R.contrats.map(x => B.meta.contrats[x.k].h)) : new Set() };
    if (bibliothequeOuverte()) rendreContenuBibliotheque(); }, 140); }
// les contrats que la recherche a trouvés dans la base (pour choisir les plans d'une installation)
const contratsTrouves = () => BIB.trouve && !BIB.trouve.enCours && BIB.trouve.q === BIB.q.trim() && BIB.trouve.contrats || null;
// « 3 autres lignes »
const autres = (n, mot) => n + INSECABLE + (n > 1 ? 'autres ' + mot + 's' : 'autre ' + mot);
const planDuContrat = h => { for (const p of BIB.plans.values()) if (p.source === 'base' && p.contrat === h && !p.fwdBase) return p; return null; };
// une ligne de la base, telle qu'on la montre : ses deux bouts, son type, son câble, ses part numbers, son dessin — le champ trouvé marqué
function ligneTrouveeHtml(B, g, R) { const brute = ligneBruteDeLaBase(B, g), f = brute.split('\u0001'), ch = new Set(champsTrouves(brute, R)), m = (i, v) => ch.has(CHAMPS_BASE[i]) ? `<mark>${v}</mark>` : v;
  const bout = (r, b) => `<span class="id">${m(r, esc(f[r]))}${f[b] ? ':' + m(b, esc(f[b])) : ''}</span>`;
  const reste = [[7, 'type'], [8, 'câble'], [5, 'PN'], [12, 'PN'], [6, ''], [13, ''], [14, 'dessin']].filter(([i]) => f[i] && (ch.has(CHAMPS_BASE[i]) || i === 7 || i === 8)).map(([i]) => `<span class="${i === 8 || i === 5 || i === 12 || i === 14 ? 'id' : ''}">${m(i, esc(f[i]))}</span>`);
  return `<li><button class="bi-tl" data-bi="contrat" data-h="${escA(f[0])}" data-g="${g}">${bout(3, 4)}<span class="bi-tl-fl" aria-hidden="true">→</span>${bout(10, 11)}<span class="bi-tl-reste">${reste.join('<i aria-hidden="true">·</i>')}</span></button></li>`; }
function trouvesHtml() { const T = BIB.trouve, B = baseDeReferences(); if (!T || !B || T.q !== BIB.q.trim() && !T.R) return '';
  const tete = (compte, sous) => `<div class="bi-trouve-tete"><h2 class="bi-sous">Dans les contrats déjà faits${compte ? `<span>${compte}</span>` : ''}</h2>${sous ? `<p class="bi-trouve-sous">${sous}</p>` : ''}`;
  if (!T.R) return `<section class="bi-trouve en-cours">${tete('', esc('Recherche dans ' + milliers(B.meta.n) + ' lignes…'))}</div></section>`;
  const R = T.R, C = B.meta.contrats;
  if (!R.n) return `<section class="bi-trouve">${tete('', '')}</div><p class="bi-rien">Aucune des ${esc(milliers(B.meta.n))} lignes de la base ne porte ${esc(guillemets(R.q))}.</p></section>`;
  // les filtres (l'ingénieur v73 : 1 573 lignes dans 571 contrats, sans pouvoir les trier) : par installation, appareil, année
  const L = contratsFiltres(R, C), MAX = 40, montres = L.slice(0, MAX), filtre = L.length !== R.contrats.length;
  const carte = x => { const c = C[x.k], i = c.install, p = planDuContrat(c.h), ou = lies([i ? (c.ecp ? c.ecp + ' ' : '') + i : 'pas encore rangé', c.appareil, c.retest ? 'installation du ' + c.retest : '']);
    return `<article class="bi-tc"><button class="bi-tc-tete" data-bi="contrat" data-h="${escA(c.h)}" data-g="${x.lignes[0]}"><span class="bi-plan-ico${p && p.id === app.planId && planSurLaTable() ? ' sur-table' : ''}">${icoBi('plan')}</span>`
      + `<span class="bi-tc-nom"><b>${esc(c.h)}</b><span>${esc(ou)}</span></span><span class="bi-tc-n">${esc(plurielLie(x.n, 'ligne'))}</span><span class="bi-tc-ouvrir">Ouvrir${icoBi('ouvrir')}</span></button>`
      + `<ul class="bi-tc-lignes">${x.lignes.map(g => ligneTrouveeHtml(B, g, R)).join('')}${x.n > x.lignes.length ? `<li class="bi-tc-plus">+${INSECABLE}${esc(autres(x.n - x.lignes.length, 'ligne'))}</li>` : ''}</ul></article>`; };
  const sous = lies([T.genres.length ? T.genres.slice(0, 2).join(', ') : '', filtre ? plurielLie(L.length, 'contrat') + ' sur ' + milliers(R.contrats.length) : plurielLie(R.contrats.length, 'contrat'), R.borne ? 'la borne exactement' : R.exact ? 'la case entière' : '', T.ms + INSECABLE + 'ms']);
  return `<section class="bi-trouve${T.enCours ? ' en-cours' : ''}">${tete(milliers(R.n) + ' ligne' + (R.n > 1 ? 's' : ''), esc(sous))}<button class="bi-btn bi-btn-2 bi-trouve-lot" data-bi="lot-trouves">Convertir ${L.length > 1 ? 'ces ' + milliers(L.length) + ' contrats' : 'ce contrat'}…</button></div>`
    + `<div class="bi-feuille bi-trouves">${filtresTrouveHtml(R, C)}${montres.map(carte).join('')}</div>${L.length > MAX ? `<p class="bi-rien">… et ${esc(autres(L.length - MAX, 'contrat'))} : précisez la recherche (un part number entier, « 300XC1:B5 », « "W-012" »).</p>` : ''}</section>`; }
/* Les filtres de ce que la base porte : une puce par installation, par appareil, par année du retest (les six plus
   fréquentes de chaque, une famille n'en montre que si elle en a deux au moins) ; une puce pressée filtre, pressée encore
   rend tout. « Convertir… » prend ce qui est montré. */
const FILTRES_TROUVE = [['install', 'Installation', c => c.install || 'pas encore rangé'], ['appareil', 'Appareil', c => c.appareil || ''], ['annee', 'Année', c => (/(\d{4})\s*$/.exec(c.retest || '') || [])[1] || '']];
// (`sauf` : une famille qu'on ne filtre pas — ses puces comptent ce que les AUTRES filtres laissent)
const contratsFiltres = (R, C, sauf) => { const F = BIB.filtreTrouve || {}; return R.contrats.filter(x => FILTRES_TROUVE.every(([k, , f]) => k === sauf || !F[k] || f(C[x.k]) === F[k])); };
function filtresTrouveHtml(R, C) { const F = BIB.filtreTrouve || {};
  const G = FILTRES_TROUVE.map(([k, mot, f]) => { const n = new Map(); contratsFiltres(R, C, k).forEach(x => { const v = f(C[x.k]); if (v) n.set(v, (n.get(v) || 0) + 1); }); if (n.size < 2 && !F[k]) return '';
    const top = [...n].sort((a, b) => b[1] - a[1] || TRI_NOMS(a[0], b[0])).slice(0, 6); if (F[k] && !top.some(([v]) => v === F[k])) top.push([F[k], n.get(F[k]) || 0]);
    return `<span class="bi-filtres-g" role="group" aria-label="${escA(mot)}"><span class="bi-filtres-mot">${esc(mot)}</span>${top.map(([v, c]) => `<button class="puce" data-bi="trouve-filtre" data-cle="${k}" data-val="${escA(v)}" aria-pressed="${F[k] === v}">${esc(v)}<span class="puce-n">${c}</span></button>`).join('')}</span>`; }).filter(Boolean);
  return G.length ? `<div class="bi-filtres">${G.join('')}</div>` : ''; }
/* Ouvrir un contrat trouvé : le plan qui le porte (créé s'il n'existe pas encore, dans son installation — sinon « À ranger »),
   puis le repère ou le câble de la ligne trouvée. */
function ouvrirContratTrouve(h, g) { const B = baseDeReferences(), c = B && contratDeLaBase(B, h); if (!c) return;
  let p = planDuContrat(h);
  if (!p) { const ins = (c.install && (installDeLEcp(ecpLu(c.ecp)) || installNommee(c.install))) || BIB.installs.get(installCourante()); p = planDeContrat(ins, c, app.references.nom || '', Date.now()); garderPlan(p); }
  ouvrirPlan(p.id, g != null && g !== '' ? cibleDeLaLigne(B, +g) : null); }
// où aller sur le plan pour une ligne trouvée : son câble (un numéro de câble, un type), sinon le repère du côté trouvé
function cibleDeLaLigne(B, g) { const R = BIB.trouve && BIB.trouve.R, brute = ligneBruteDeLaBase(B, g), f = brute.split('\u0001'), ch = R ? champsTrouves(brute, R) : [];
  if (f[8] && ch.some(c => c === 'cable' || c === 'type')) return { type: 'fil', nom: f[8] };
  const vers = ch.some(c => ['vers', 'borneVers', 'pnVers', 'descriptionVers'].includes(c)) && !ch.some(c => ['de', 'borneDe', 'pnDe', 'descriptionDe'].includes(c));
  return ch.some(c => ['de', 'borneDe', 'pnDe', 'descriptionDe', 'vers', 'borneVers', 'pnVers', 'descriptionVers'].includes(c)) ? { type: 'repere', nom: vers ? f[10] : f[3] } : null; }

/* ---- CONVERTIR EN LOT : des contrats choisis → leurs retests corrigés (Excel) et leurs dossiers PDF, un zip -------------
   Le lecteur : « convertir en lot ». Dans une installation, « Convertir… » change la feuille des plans en cases à cocher (un
   clic choisit) ; la recherche dans tout propose les contrats qu'elle a trouvés. La barre du lot, en bas : combien, ce qu'on
   sort (le retest corrigé — 08-export, `classeurRetestCorrige` : les seize colonnes, les cases changées commentées, la
   feuille Modifications — ; le dossier PDF — 08-pdf-dossier, `pdfDuPlan(liaisons, nom, { signal, avancement })` : tant
   qu'il n'est pas là, la case le dit), un zip ou un fichier par contrat. Chaque contrat se lit tel qu'il est gardé (avec ce
   qu'on y a corrigé), sinon dans la base ; la page respire entre deux ; la barre avance aussi pendant le placement des
   folios d'un dossier ; « Arrêter » arrête, même au milieu d'un dossier. Rien ne part sur le réseau. */
const pdfDisponible = () => typeof pdfDuPlan === 'function';
function commencerLot(ids) { retirerCarteLecture(); BIB.lot = { ids: new Set(ids || []), excel: true, pdf: pdfDisponible(), zip: true, encours: null }; BIB.pop = null; rendreBibliotheque(); }
function basculerLot(id) { const L = BIB.lot; if (!L || L.encours) return; if (L.ids.has(id)) L.ids.delete(id); else L.ids.add(id); rendreContenuBibliotheque(); rendreLot(); }
// un élément du lot : un plan de la bibliothèque, ou un contrat de la base (« c:harness ») ; ses liaisons, quand on les demande
function elementDuLot(k) { if (k.startsWith('c:')) { const h = k.slice(2), p = planDuContrat(h); return p ? elementDuLot(p.id) : { nom: h, plan: null, liaisons: () => liaisonsDuContrat(h) }; }
  const p = BIB.plans.get(k); if (!p) return null;
  return { nom: nomAffiche(p.nom), plan: p, liaisons: async () => { const o = await lireBiblio('contrats', p.id); if (o && (o.source || o.liaisons)) return o.source || o.liaisons;
    if (p.source === 'base' && p.contrat) return liaisonsDuContrat(p.contrat, p.fwdBase); return p.id === ID_EXEMPLE ? contratExemple() : null; } }; }
function lotHtml() { const L = BIB.lot; if (!L) return ''; const n = L.ids.size, E = L.encours, pdf = pdfDisponible();
  if (E) return `<div class="bi-lot en-cours" role="status" aria-live="polite"><div class="bi-lot-barre" role="progressbar" aria-valuemin="0" aria-valuemax="${E.n}" aria-valuenow="${E.k}"><i style="width:${partDuLot(E)}%"></i></div>`
    + `<span class="bi-lot-n">Conversion : <b>${E.k}${INSECABLE}/${INSECABLE}${E.n}</b></span><span class="bi-lot-nom id">${esc(E.nom)}</span><small class="bi-lot-mot">${esc(E.mot || '')}</small><span class="espace"></span><button class="bi-lien-lot" data-bi="lot-arreter">Arrêter</button></div>`;
  return `<div class="bi-lot" role="region" aria-label="Convertir en lot"><span class="bi-lot-n"><b>${n}</b>${INSECABLE}${n > 1 ? 'contrats choisis' : 'contrat choisi'}</span>`
    + `<label class="bi-lot-o"><input type="checkbox" data-lot-o="excel"${L.excel ? ' checked' : ''}><span>Installation corrigée <small>Excel</small></span></label>`
    + `<label class="bi-lot-o${pdf ? '' : ' eteint'}"><input type="checkbox" data-lot-o="pdf"${L.pdf && pdf ? ' checked' : ''}${pdf ? '' : ' disabled'}><span>Dossier PDF <small>${pdf ? 'tous les folios' : 'pas encore là'}</small></span></label>`
    + `<span class="bi-lot-seg" role="group" aria-label="Ce qui sort"><button data-bi="lot-zip" data-zip="1" aria-pressed="${L.zip}">Un zip</button><button data-bi="lot-zip" data-zip="0" aria-pressed="${!L.zip}">Un par contrat</button></span>`
    + `<span class="espace"></span><button class="bi-lien-lot" data-bi="lot-annuler">Annuler</button><button class="bi-btn" data-bi="lot-convertir"${n && (L.excel || (L.pdf && pdf)) ? '' : ' disabled'}>${icoBi('depot')}<span>Convertir${n ? ' ' + (n > 1 ? milliers(n) + ' contrats' : 'le contrat') : ''}</span></button></div>`; }
function rendreLot() { const el = $('bi-lot'); if (!el) return; el.innerHTML = lotHtml(); el.hidden = !BIB.lot; }
const partDuLot = E => Math.round(100 * (Math.max(0, E.k - 1) + (E.part || 0)) / Math.max(1, E.n));
// le dossier PDF d'un contrat avance (ses folios se placent) : la barre et son mot, sur place — le bouton « Arrêter » reste
function avancerLot(E, a) { E.part = a.part * 0.9; E.mot = String(a.mot || '').split(' — ')[0]; const el = $('bi-lot'); if (!el) return;
  const i = el.querySelector('.bi-lot-barre i'), m = el.querySelector('.bi-lot-mot'); if (i) i.style.width = partDuLot(E) + '%'; if (m) m.textContent = E.mot; }
function arreterLot() { const E = BIB.lot && BIB.lot.encours; if (!E) return; E.arret = true; try { E.ctl.abort(); } catch (_) { } }
// un zip sans compression (un .xlsx et un PDF le sont déjà) : l'en-tête de chaque fichier, son contenu, le répertoire, sa fin
const TABLE_CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc32 = u8 => { let c = -1; for (let i = 0; i < u8.length; i++) c = TABLE_CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function zipSimple(fichiers) { const enc = new TextEncoder(), parts = [], centre = []; let off = 0;
  fichiers.forEach(([nom, d]) => { const n = enc.encode(nom), crc = crc32(d), h = new DataView(new ArrayBuffer(30)), c = new DataView(new ArrayBuffer(46));
    [[h, 0, 0x04034b50, 4], [h, 4, 20, 2], [h, 6, 0x0800, 2], [h, 14, crc, 4], [h, 18, d.length, 4], [h, 22, d.length, 4], [h, 26, n.length, 2],
     [c, 0, 0x02014b50, 4], [c, 4, 20, 2], [c, 6, 20, 2], [c, 8, 0x0800, 2], [c, 16, crc, 4], [c, 20, d.length, 4], [c, 24, d.length, 4], [c, 28, n.length, 2], [c, 42, off, 4]]
      .forEach(([v, o, x, t]) => t === 4 ? v.setUint32(o, x >>> 0, true) : v.setUint16(o, x, true));
    parts.push(h, n, d); centre.push(c, n); off += 30 + n.length + d.length; });
  const tc = centre.reduce((s, b) => s + b.byteLength, 0), f = new DataView(new ArrayBuffer(22)); f.setUint32(0, 0x06054b50, true); f.setUint16(8, fichiers.length, true); f.setUint16(10, fichiers.length, true); f.setUint32(12, tc, true); f.setUint32(16, off, true);
  return new Blob([...parts, ...centre, f], { type: 'application/zip' }); }
async function convertirLeLot() { const L = BIB.lot; if (!L || L.encours || !L.ids.size) return; sauverMaintenant();
  const els = [...L.ids].map(elementDuLot).filter(Boolean), pdf = L.pdf && pdfDisponible(), fichiers = [], pris = new Set(), rates = [], t0 = performance.now(); let nx = 0, np = 0;
  const unique = nom => { let n = nom, k = 2; while (pris.has(n)) n = nom.replace(/(\.\w+)$/, '-' + (k++) + '$1'); pris.add(n); return n; };
  const E = L.encours = { k: 0, n: els.length, nom: '', mot: '', part: 0, arret: false, ctl: new AbortController() }; rendreLot(); const sansPdf = [];
  for (const x of els) { if (E.arret) break; E.k++; E.nom = x.nom; E.part = 0; E.mot = ''; rendreLot(); await respirer();
    const V = await x.liaisons(); if (!V || !V.length) { rates.push(x.nom); continue; } const base = nomAscii(x.nom.replace(/\.[^.]+$/, '')) || 'contrat', sortis = [];
    if (L.excel) { const R = classeurRetestCorrige(V, x.nom); sortis.push([unique(base + '-retest-corrige.xlsx'), new Uint8Array(XLSX.write(R.wb, { type: 'array', bookType: 'xlsx', compression: true }))]); nx++; }
    if (pdf && !E.arret) { try { const d = await pdfDuPlan(V, x.nom, { signal: E.ctl.signal, avancement: a => avancerLot(E, a) }); if (d && d.length) { sortis.push([unique(base + '-dossier.pdf'), d]); np++; } }
      catch (_) { if (!E.arret) sansPdf.push(x.nom); } }
    if (x.plan && sortis.length) { x.plan.exporte = Date.now(); garderPlan(x.plan); }
    if (L.zip) fichiers.push(...sortis); else sortis.forEach(([n, d]) => telecharger(new Blob([d], { type: /\.pdf$/.test(n) ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), n)); }
  const arrete = E.arret, ins = BIB.vue === 'install' && BIB.installs.get(BIB.install), nomZip = nomAscii((ins ? ins.nom : 'contrats-deja-faits') + '-' + els.length + '-contrats') + '.zip';
  if (L.zip && fichiers.length) telecharger(zipSimple(fichiers), nomZip);
  BIB.lot = null; rendreBibliotheque();
  const fait = lies([nx ? nx + INSECABLE + (nx > 1 ? 'installations corrigées' : 'installation corrigée') + ' (Excel)' : '', np ? np + INSECABLE + (np > 1 ? 'dossiers PDF' : 'dossier PDF') : '']), ms = Math.round(performance.now() - t0);
  dire((arrete ? 'Arrêté : ' : '') + (fait || 'rien à sortir') + (L.zip && fichiers.length ? ' dans ' + guillemets(nomZip) : '') + (fait ? ' — ' + (ms < 1000 ? ms + ' ms' : nombre(Math.round(ms / 100) / 10) + ' s') : '') + '.'
    + (L.pdf && !pdfDisponible() ? ' Le dossier PDF n’est pas encore dans cette version.' : '') + (rates.length ? ' Sans liaisons : ' + rates.slice(0, 3).join(', ') + (rates.length > 3 ? '…' : '') + '.' : '')
    + (sansPdf.length ? ' Pas de dossier PDF pour ' + sansPdf.slice(0, 3).join(', ') + (sansPdf.length > 3 ? '…' : '') + ' (un folio ne se dessine pas).' : ''), !fait); }

/* ---- la barre du haut, le menu, le plan vide : ce qui suit le contrat (08-interface, `synchroniserContexte`) ---------- */
/* LE FIL : Volta / l'installation / le plan. La racine : la marque seule ; une installation : son ECP et son nom ; la
   table : l'installation (un clic y mène) et le plan. */
function synchroniserFil() { const fil = $('en-fil'); if (!fil) return; const surTable = BIB.vue === 'plan';
  const p = BIB.plans.get(app.planId), i = BIB.vue === 'install' ? BIB.installs.get(BIB.install) : surTable && p ? BIB.installs.get(p.install) : null;
  const plan = surTable && (app.nom || p) ? nomAffiche(app.nom || p.nom) : '';
  fil.hidden = !i && !plan; const bi = $('en-install'), bp = $('en-plan');
  // sa bulle suit la règle des bulles du chrome (08-menu) : elle s'écrit quand elle paraît (l'événement `bulle`, lié une
  // fois dans `lierBibliotheque`) — le fil ne se lit pas deux fois
  bi.hidden = !i; bi.innerHTML = i ? (i.ecp ? `<span class="en-ecp">${esc(i.ecp)}</span>` : '') + `<span class="en-install-nom">${esc(i.nom)}</span><span class="bulle" aria-hidden="true"></span>` : '';
  bi.removeAttribute('title'); bi.disabled = BIB.vue === 'install'; bi.dataset.id = i ? i.id : '';
  bp.hidden = !plan; bp.textContent = plan; bp.title = plan; }
function synchroniserBibliotheque() { synchroniserFil();
  const m = $('mn-biblio'); if (m) { const V = installsVraies(); m.textContent = V.length ? pluriel(V.length, 'installation') + ' · ' + pluriel(plansVrais().length, 'plan') : 'installations · plans'; }
  // ce qui porte sur le plan s'éteint dans le menu tant qu'aucun plan n'est sur la table (un clic le dit)
  const sans = !planSurLaTable(); document.querySelectorAll('#menu [data-act="recapitulatif"], #menu [data-act="nomenclature"], #menu [data-act="dejafait"], #menu [data-sous="exporter"], #menu [data-act="cartouche"]').forEach(b => b.setAttribute('aria-disabled', String(sans)));
  // le plan vide : « Reprendre » si le dernier geste l'a vidé
  const rep = $('vd-reprendre'); if (rep) { const n = app.contrat.liaisons.length, d = app.hist[app.hist.length - 1]; rep.hidden = !(!n && d && d.liaisons && d.liaisons.length); if (!rep.hidden) rep.textContent = 'Reprendre ' + guillemets(nomAffiche(d.nom || 'le plan')); } }

/* ---- les touches ----------------------------------------------------------------------------------------------------- */
/* La bibliothèque ouverte : Échap remonte (le « ⋯ », ce qu'on nomme, la confirmation, la recherche, l'installation, puis le
   plan resté sur la table) ; « / » cherche ; Alt+↑ / Alt+↓ passent à l'installation d'avant, d'après ; Ctrl+O ouvre un
   retest comme partout ; les touches du plan, caché dessous, se taisent. Le menu, un document ouvert, un champ gardent les leurs. Rend vrai quand la touche est prise ici. */
function toucheBibliotheque(e, dansChamp) { if (!bibliothequeOuverte() || !$('menu').hidden || app.fiche || dansChamp) return false;
  const k = e.key, mod = e.ctrlKey || e.metaKey;
  if (k === 'Escape') { echapBibliotheque(); return true; }
  if (mod && k.toLowerCase() === 'o') return false;
  if (e.altKey && !mod && BIB.vue === 'install' && (k === 'ArrowUp' || k === 'ArrowDown')) { e.preventDefault(); installVoisine(k === 'ArrowUp' ? -1 : 1); return true; }
  if (mod || e.altKey) { if (/^[zp]$/i.test(k)) e.preventDefault(); return /^[zp]$/i.test(k); }
  if (k === '/') { const q = $('bi-q'); if (q) { e.preventDefault(); q.focus(); } return true; }
  return true; }
function echapBibliotheque() {
  if (BIB.pop) { const id = BIB.pop.id; BIB.pop = null; rendreBibliotheque(); const b = document.querySelector(`#bibliotheque .bi-plus[data-id="${CSS.escape(id)}"]`); if (b) b.focus(); return; }
  if (BIB.edition) { BIB.edition = null; rendreBibliotheque(); return; }
  if (BIB.confirme) { BIB.confirme = null; rendreBibliotheque(); return; }
  if (BIB.ranger) { BIB.ranger = null; rendreBibliotheque(); return; }
  if (BIB.lot) { if (BIB.lot.encours) arreterLot(); else { BIB.lot = null; rendreBibliotheque(); } return; }
  if (BIB.q) { BIB.q = ''; BIB.trouve = null; rendreBibliotheque(); return; }
  // d'une installation, on remonte à la racine — le clavier sur sa carte (on ne le perd pas)
  if (BIB.vue === 'install') { const id = BIB.install; montrerBibliotheque('racine'); const c = document.querySelector(`#bibliotheque .bi-carte[data-install="${CSS.escape(id)}"] .bi-carte-corps`); if (c) c.focus({ preventScroll: false }); return; }
  if (planSurLaTable()) montrerLePlan(); }

/* ---- tout relier, une fois ------------------------------------------------------------------------------------------ */
function lierBibliotheque() { if (BIB.lie) return; BIB.lie = true; const el = $('bibliotheque'); if (typeof lierBulles === 'function') lierBulles(el);
  /* Garder ce qui s'écrit sur place : le nom d'un plan ; le nom et l'ECP d'une installation (les deux champs de son
     groupe). Un ECP qui n'a pas ses cinq chiffres, un nom pris : le mot qui passe le dit et le champ reste ouvert (Entrée)
     — ou l'on renonce (on est parti ailleurs). */
  const nommer = (input, garder) => { const quoi = input.dataset.nommer, id = input.dataset.id, g = input.closest('.bi-nommer') || input.parentNode;
    const val = c => { const x = g.querySelector(`[data-champ="${c}"]`); return x ? x.value.trim() : null; }, nom = val('nom'), ecp = val('ecp'), parti = !g.contains(document.activeElement);
    // ce qui ne passe pas reste écrit, marqué, le curseur au bout : on complète
    const reprendre = () => { const x = g.querySelector('[data-champ="ecp"]'); if (x) { x.classList.add('faux'); x.focus(); x.setSelectionRange(x.value.length, x.value.length); } };
    if (!garder || (quoi === 'nouvelle' && !nom && !ecp)) { BIB.edition = null; rendreBibliotheque(); return; }
    if (quoi === 'nouvelle') { const e = ecpLu(ecp); if (ecp && !e && !parti) { nouvelleInstall(nom, ecp); reprendre(); return; } BIB.edition = null; if (!nouvelleInstall(nom, e)) rendreBibliotheque(); return; }
    if (quoi === 'install' && !renommerInstall(id, nom, ecp) && !parti) { reprendre(); return; }
    if (quoi === 'plan' && nom) renommerPlan(id, nom);
    BIB.edition = null; rendreBibliotheque(); };
  el.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-bi]');
    // un clic hors du « ⋯ » ouvert le referme
    if (BIB.pop && !(e.target.closest && e.target.closest('.bi-pop'))) { const meme = b && b.dataset.bi === 'pop' && b.dataset.id === BIB.pop.id; BIB.pop = null; if (!b || meme) { rendreBibliotheque(); return; } }
    if (!b || b.disabled) return; const id = b.dataset.id, quoi = b.dataset.quoi;
    const faire = {
      nouvelle: () => { BIB.edition = { quoi: 'nouvelle', champ: 'ecp' }; BIB.q = ''; if (BIB.vue !== 'racine') montrerBibliotheque('racine'); rendreBibliotheque(); },
      install: () => montrerBibliotheque('install', id), racine: () => montrerBibliotheque('racine'),
      // en conversion en lot, un plan se choisit ; sinon il s'ouvre
      plan: () => { BIB.pop = null; if (BIB.lot && !BIB.lot.encours && b.classList.contains('bi-plan-ouvrir')) { basculerLot(id); return; } ouvrirPlan(id); }, reprendre: () => montrerLePlan(),
      exemple: () => ouvrirPlan(ID_EXEMPLE), ouvrir: () => $('fichier').click(),
      contrat: () => ouvrirContratTrouve(b.dataset.h, b.dataset.g),
      lot: () => { if (BIB.lot) { if (!BIB.lot.encours) { BIB.lot = null; rendreBibliotheque(); } } else commencerLot(); },
      // tous les plans que la feuille montre (une installation, ou ceux que la recherche a trouvés)
      'lot-tous': () => { const L = BIB.lot; if (!L || L.encours) return; const P = [...el.querySelectorAll('#bi-contenu .bi-plan[data-plan]')].map(li => li.dataset.plan).filter(id => id !== ID_EXEMPLE), tous = P.every(id => L.ids.has(id)); P.forEach(id => tous ? L.ids.delete(id) : L.ids.add(id)); rendreContenuBibliotheque(); rendreLot(); },
      'lot-trouves': () => { const T = BIB.trouve, B = baseDeReferences(); if (!T || !T.R || !B) return; commencerLot(contratsFiltres(T.R, B.meta.contrats).map(x => 'c:' + B.meta.contrats[x.k].h)); },
      'trouve-filtre': () => { const F = BIB.filtreTrouve = BIB.filtreTrouve || {}, k = b.dataset.cle; F[k] = F[k] === b.dataset.val ? '' : b.dataset.val; rendreContenuBibliotheque(); },
      'lot-zip': () => { if (BIB.lot) { BIB.lot.zip = b.dataset.zip === '1'; rendreLot(); } },
      'lot-annuler': () => { BIB.lot = null; rendreBibliotheque(); }, 'lot-convertir': () => convertirLeLot(), 'lot-arreter': arreterLot,
      pop: () => { BIB.pop = { quoi, id }; BIB.confirme = null; BIB.edition = null; rendreBibliotheque(); },
      'pop-retour': () => { BIB.pop = { quoi, id }; rendreBibliotheque(); },
      renommer: () => { BIB.pop = null; BIB.edition = { quoi, id, champ: b.dataset.champ || 'nom' }; rendreBibliotheque(); },
      tri: () => choisirTri(b.dataset.tri),
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
    /* l'ECP : des chiffres seulement ; une installation neuve, ses cinq chiffres tapés, le clavier passe au nom. Des lettres
       tapées dans l'ECP encore vide (on n'a pas d'ECP sous la main) : elles vont au nom, et le clavier avec. */
    if (t.dataset && t.dataset.champ === 'ecp') { const n0 = t.closest('.bi-nommer').querySelector('[data-champ="nom"]');
      if (/[^\d\s]/.test(t.value) && !/\d/.test(t.value) && n0) { n0.value = (t.dataset.nommer === 'nouvelle' ? n0.value : '') + t.value; t.value = ''; n0.focus(); return; }
      const c = t.value.replace(/\D/g, '').slice(0, 5); if (c !== t.value) t.value = c;
      t.classList.toggle('complet', c.length === 5); t.classList.remove('faux'); if (c.length === 5 && t.dataset.nommer === 'nouvelle' && e.inputType !== 'deleteContentBackward') { const n = t.closest('.bi-nommer').querySelector('[data-champ="nom"]'); if (n) n.focus(); } return; }
    if (t.id === 'bi-q') { BIB.q = t.value; lancerRecherche(); rendreContenuBibliotheque(); }
    else if (t.id === 'bi-ranger-nom' && BIB.ranger) BIB.ranger.nom = t.value; });
  el.addEventListener('change', e => { const t = e.target;
    if (t.dataset && t.dataset.lotO && BIB.lot) { BIB.lot[t.dataset.lotO] = t.checked; rendreLot(); return; }
    if (!BIB.ranger) return;
    if (t.dataset.rangerH != null) { if (t.checked) BIB.ranger.coches.add(t.dataset.rangerH); else BIB.ranger.coches.delete(t.dataset.rangerH); rendreContenuBibliotheque(); }
    else if (t.id === 'bi-ranger-vers') { BIB.ranger.vers = t.value; rendreContenuBibliotheque(); } });
  // nommer : Entrée garde, Échap renonce, quitter le champ garde (un nom vide : rien) ; la recherche : Échap l'efface, ↓ va au premier résultat
  el.addEventListener('keydown', e => { const t = e.target;
    if (t.dataset && t.dataset.nommer) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); nommer(t, true); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); BIB.edition = null; rendreBibliotheque(); } return; }
    if (t.id === 'bi-q') { if (e.key === 'Escape') { e.stopPropagation(); if (t.value) { t.value = ''; BIB.q = ''; BIB.trouve = null; rendreContenuBibliotheque(); } else t.blur(); }
      else if (e.key === 'ArrowDown') { const x = el.querySelector('#bi-contenu .bi-carte-corps, #bi-contenu .bi-plan-ouvrir, #bi-contenu .bi-tc-tete'); if (x) { e.preventDefault(); x.focus(); } }
      else if (e.key === 'Enter') { const x = el.querySelector('#bi-contenu .bi-carte-corps, #bi-contenu .bi-plan-ouvrir, #bi-contenu .bi-tc-tete'); if (x) { e.preventDefault(); x.click(); } } } });
  // quitter le groupe (pas passer de l'ECP au nom) garde ; une installation neuve laissée vide, on y renonce
  el.addEventListener('focusout', e => { const t = e.target; if (!(t.dataset && t.dataset.nommer) || !BIB.edition) return;
    setTimeout(() => { const g = t.closest('.bi-nommer'); if (!BIB.edition || !t.isConnected || (g && g.contains(document.activeElement))) return; nommer(t, true); }, 0); });
  // la barre du haut : la marque mène à la bibliothèque, l'installation du fil à ses plans
  $('en-biblio').addEventListener('click', () => montrerBibliotheque('racine'));
  $('en-install').addEventListener('click', e => { const id = e.currentTarget.dataset.id; if (id) montrerBibliotheque('install', id); });
  $('en-install').addEventListener('bulle', e => { const b = e.currentTarget, s = b.querySelector(':scope > .bulle'), i = BIB.installs.get(b.dataset.id);
    if (s && i) s.textContent = lies([i.ecp ? 'ECP ' + i.ecp : '', i.nom]) + ' : ses plans'; });
  // plusieurs retests à la fois, choisis : des plans
  $('fichier-plans').addEventListener('change', e => { const xs = [...(e.target.files || [])]; e.target.value = ''; if (xs.length) ajouterPlans(xs); });
  // le plan vide : un retest, des lignes collées, la bibliothèque ; « Reprendre » défait ce qui l'a vidé
  const o = (id, fn) => { const b = $(id); if (b) b.addEventListener('click', fn); };
  o('vd-ouvrir', () => $('fichier').click()); o('vd-coller', () => ficheColler()); o('vd-bibliotheque', () => montrerBibliotheque('install', (BIB.plans.get(app.planId) || {}).install));
  o('vd-reprendre', () => { const q = annuler(); if (q) dire('Repris : ' + q + '.'); });
  // ce qui ne peut se faire que sur le plan (une fiche, le récapitulatif) le remet sur la table
  const suivre = id => new MutationObserver(() => { if (!$(id).hidden && bibliothequeOuverte()) montrerLePlan(); }).observe($(id), { attributes: true, attributeFilter: ['hidden'] });
  suivre('inspecteur'); suivre('base');
  // « exporté le … » : ce qui sort du plan sur la table (un folio, le retest corrigé, le dossier) passe par `telecharger`
  // (08-interface) — le plan le retient, la bibliothèque le dit
  if (typeof telecharger === 'function' && !telecharger.retenu) { const avant = telecharger; telecharger = (blob, nom) => { avant(blob, nom); noterExportDuPlan(nom); }; telecharger.retenu = true; } }
function noterExportDuPlan(nom) { const p = BIB.plans.get(app.planId); if (!p || !planSurLaTable() || BIB.lot) return; const a = nomAscii(String(nom || ''));
  if (/^(modele|gabarit)-/i.test(a)) return; const debuts = [nomContrat(), nomAscii(nomFolio().replace(/-folio-.*$/, ''))].filter(x => x && x.length > 1);
  if (!debuts.some(x => a.startsWith(x))) return; p.exporte = Date.now(); garderPlan(p); }
