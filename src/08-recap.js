/* ===========================================================================
   08 — LE RÉCAPITULATIF : le contrat d'un coup d'œil, en onglets ; tout s'y
   corrige, tout reste calculé
   ---------------------------------------------------------------------------
   Le lecteur (v57) : « le tableau récapitulatif, c'est pas mal, mais il faut
   faire plus propre. Liaisons : beaucoup d'infos, on s'y perd. Équipements :
   part number, connecteur, deux, trois fils… pas des infos hyper importantes
   au quotidien. Tout doit être revu d'un point de vue praticité ; tout
   modifiable très facilement, et tout automatique. »
   Il remplace le tiroir des liaisons (`#base` : l'identifiant reste) :
     · TROIS TAILLES : Plan (fermé), Moitié (en bas, le plan au-dessus), Page
       (toute la place du plan) — l'inspecteur reste à droite. B ouvre et
       ferme, Maj+B passe en page et en revient ; le segment en tête.
     · NEUF ONGLETS, et chaque objet dans UN seul : Liaisons, Équipements
       (les équipements seuls : disjoncteurs, barrettes et prises ont chacun
       le leur, avec ce qui leur est propre), Disjoncteurs, Barrettes, Prises,
       Câbles (un type par ligne), Raccords, Problèmes, Normes. Les contacts
       n'ont plus d'onglet : leur liste à commander est la nomenclature, et
       le contact d'un bout se change là où on le voit (sa fiche ; ici les
       colonnes « Contact de » et « Contact vers »).
     · PEU DE COLONNES D'OFFICE, celles du quotidien ; le reste attend dans
       « Colonnes ». Une liaison se lit comme une phrase : de (repère, borne)
       → une flèche de longueur fixe, de la couleur de sa route, qui porte
       l'étiquette du câble (son type, sa gauge si le type ne la dit pas) →
       vers ; sa longueur ; son état en mots (à voir, problème — rien quand
       tout va bien), son pourquoi dans la bulle. Une colonne qui ne dirait
       rien pour les lignes montrées ne se pose pas (`colonnesUtiles`).
     · LA COULEUR NE DIT QUE L'ÉTAT, et la route d'un câble ; le reste est à
       l'encre, les identifiants en chasse fixe.
     · UNE SEULE SOURCE (v86, la charte v85) : ce qui vient du fichier — un
       repère, une borne, un type, une longueur, une route, un part number —
       SE LIT, sans champ ; un double-clic, Entrée ou F2 disent dans une bulle
       qu'il se change dans le fichier. On n'ajoute ni ne supprime une
       liaison ou un équipement ici : c'est changer le fichier. Seuls LES
       CHOIX DE VOLTA (le contact d'un bout, le module, l'arrangement, la
       norme, le sexe, le raccord) et le profil de charge se règlent sur
       place : Automatique ou Manuel (« manuel » et ↺, qui rend l'automatique).
       Chaque réglage est une entrée d'historique (Ctrl+Z).
     · FILTRER, TRIER, CHOISIR SES COLONNES, EXPORTER : la portée (Folio n /
       Tout), un champ qui cherche dans l'onglet, des puces, le tri à
       l'en-tête, le CSV de ce qu'on voit. Un clic sur une ligne ouvre sa
       fiche et allume le plan, le survol allume le câble ; un bloc choisi sur
       le plan filtre l'onglet (`filtreAuto`). Onglet, recherche, tri, puces
       et colonnes se gardent dans ce navigateur, jamais l'état ouvert.
   LES VERDICTS SE LISENT, ils ne se refont pas ici : l'intensité et la chute
   d'un câble comme sa fiche les calcule (`intensiteCalculee`, `chuteDuFil` :
   la chute admise est celle du moteur), le contrôle (`CONTROLE.items`), la
   disjonction (`disjonctionDe` : valide, serré, le meilleur et son pourquoi),
   les plans des connecteurs, des barrettes et des prises, le raccord — une
   fois par état du contrat (`RECAP.memo`), et seulement pour ce que l'onglet
   montre. Retenir un calibre passe par la fiche (`retenirCalibre`,
   `rendreCalibre`) : le récapitulatif et la fiche font le même geste.
   La NATURE dite d'un équipement (« 115CD est une pompe ») se garde dans les
   choix du contrat (`designations`, clé « repère|nature », comme
   l'arrangement d'un connecteur l'est sous « repère|A ») ; le modèle la lit
   (01, `natureDite`). Le CONTACT forcé d'un bout se garde sur la liaison
   (`contactDe`, `contactVers`) ; la fiche et la nomenclature le lisent.
   =========================================================================== */
'use strict';

/* ---- l'état, et ce que ce navigateur en garde ------------------------------- */
/* LE RAIL DU RÉCAPITULATIF (v74, le lecteur : « trop de données, l'œil se perd. Garde UNE place avec toutes les données —
   la base commune, le cœur du process — mais mieux organisée, plus simple, plus fluide. Le rail de gauche, c'est bien »).
   Les neuf onglets ne font plus une bande qui défile au-dessus de la table : ils se rangent à GAUCHE, comme le rail de
   l'outil, en trois groupes qui se lisent d'un regard — ce qu'on câble, le matériel qu'on pose, ce qu'on vérifie —, chacun
   avec son compte aligné à droite et un point rouge seulement là où il y a un problème. La table garde toute la largeur
   qui reste ; la feuille étroite (l'inspecteur épinglé, un petit écran) les remet en bande au-dessus (`#base.etroit`). */
/* (v77, le lecteur : « encore mieux trier, plus intuitif, plus simple, plus propre, plus carré ») : LES PROBLÈMES EN TÊTE,
   seuls, comme une boîte de réception (le rouge et l'ambre en pastilles, plus de « 1 · 3 ») ; puis ce qu'on câble, le
   matériel qu'on pose ; les normes, la référence, tout en bas. Chaque onglet a son icône (le point rouge se pose dessus :
   les mots s'alignent tous), son compte, un seul nombre. */
const GROUPES_ONGLETS = [['controle', '', ['problemes']], ['cablage', 'Câblage', ['liaisons', 'cables']], ['materiel', 'Matériel', ['equipements', 'disjoncteurs', 'barrettes', 'prises', 'raccords']], ['reference', 'Référence', ['normes']]];
// (v86, G6 : « Câbles 7 » juste sous « Liaisons 223 » comptait des TYPES — le nom de l'onglet dit ce qu'il compte)
const ONGLETS = [['problemes', 'Problèmes'], ['liaisons', 'Liaisons'], ['cables', 'Types de câble'], ['equipements', 'Équipements'], ['disjoncteurs', 'Disjoncteurs'], ['barrettes', 'Barrettes'], ['prises', 'Prises'],
  ['raccords', 'Raccords'], ['normes', 'Normes']];
const ICONES_ONGLETS = {
  problemes: '<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.2M12 16.8v.2"/>',
  liaisons: '<circle cx="5" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/><path d="M7.2 12h9.6"/>',
  cables: '<path d="M2.5 12h4M17.5 12h4"/><rect x="6.5" y="8.5" width="11" height="7" rx="3.5"/>',
  equipements: '<rect x="5" y="6" width="14" height="12" rx="1.5"/><path d="M2.5 10h2.5M2.5 14h2.5M19 10h2.5M19 14h2.5"/>',
  disjoncteurs: '<circle cx="6" cy="15.5" r="1.7"/><circle cx="18" cy="15.5" r="1.7"/><path d="M7.5 14.6 16.2 8.5M2.5 15.5h1.8M19.7 15.5h1.8"/>',
  barrettes: '<rect x="3" y="8" width="18" height="8" rx="2"/><circle cx="8" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="16" cy="12" r="1.3"/>',
  prises: '<circle cx="12" cy="12" r="8"/><circle cx="9" cy="10.2" r="1.2"/><circle cx="15" cy="10.2" r="1.2"/><circle cx="12" cy="15" r="1.2"/>',
  raccords: '<path d="M3.5 9h7l3-2.5h7v11h-7l-3-2.5h-7z"/>',
  normes: '<path d="M5 4.5h10.5a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3z"/><path d="M5 16.5a3 3 0 0 1 3-3h10.5"/>' };
/* app.base (08) porte déjà : ouvert, portee, filtre (la recherche de l'onglet ouvert), filtreAuto (le bloc choisi sur le
   plan : il vaut pour tous les onglets), tri (celui de l'onglet ouvert), hauteur, sale, defiler, enSaisie. Le
   récapitulatif y ajoute sa taille, l'onglet, les recherches, tris, puces et colonnes de chaque onglet, les lignes
   ajoutées (en tête jusqu'à ce qu'on ferme), l'édition en cours et la case à reprendre après un rendu. */
Object.assign(app.base, { taille: 'moitie', onglet: 'liaisons', filtres: {}, tris: {}, puces: {}, colonnes: {}, neuves: [], neufs: [], nouveau: false, edition: null, focus: null, toutes: false });
// la v2 (octobre 2026) a d'autres colonnes d'office et d'autres puces : de la v1, on ne reprend que l'onglet, la portée,
// les recherches, les tris et la hauteur
const CLE_RECAP = 'atelier.recap.v2', CLE_RECAP_V1 = 'atelier.recap.v1';
// la nature dite d'un équipement, lue par le modèle (01, `lireRepere`)
const CLE_NATURE = nom => nom + '|nature';
natureDite = nom => (app.contrat && app.contrat.designations && app.contrat.designations.get(CLE_NATURE(nom))) || '';

function memoriserBase() { const b = app.base; b.tris[b.onglet] = b.tri; if (!b.filtreAuto) b.filtres[b.onglet] = b.filtre;
  try { localStorage.setItem(CLE_RECAP, JSON.stringify({ onglet: b.onglet, portee: b.portee, filtres: b.filtres, tris: b.tris, puces: b.puces, colonnes: b.colonnes, hauteur: b.hauteur })); } catch (_) { } }
function relireBase() { const b = app.base, lire = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (_) { return null; } };
  let o = lire(CLE_RECAP); if (!o) { o = lire(CLE_RECAP_V1); if (o && typeof o === 'object') { delete o.colonnes; delete o.puces; } }
  if (o && typeof o === 'object') { if (TABS[o.onglet]) b.onglet = o.onglet; if (o.portee === 'tout' || o.portee === 'folio') b.portee = o.portee;
    ['filtres', 'tris', 'puces', 'colonnes'].forEach(k => { if (o[k] && typeof o[k] === 'object') b[k] = o[k]; }); b.hauteur = +o.hauteur || 0; }
  // un tri sur une colonne qui n'existe plus s'oublie
  Object.keys(b.tris).forEach(k => { const t = b.tris[k]; if (t && !(TABS[k] && TABS[k].colonnes.some(c => c.k === t.k && c.tri))) delete b.tris[k]; });
  b.tri = b.tris[b.onglet] || null; b.filtre = typeof b.filtres[b.onglet] === 'string' ? b.filtres[b.onglet] : ''; appliquerTailleBase(); }

/* ---- ce que l'onglet lit du moteur : une fois par état du contrat --------- */
const RECAP = { notes: {}, groupes: new Map(), memes: new Set(), palier: 0, parGenre: false, jeton: 0, cle: null, memo: new Map(), norme: null, bible: null, refs: null, items: null, itemsN: 0, parCable: null, parNom: null, rendu: null, vues: new Map(), liste: [], datalist: 0 };
function assurerModele() { const C = app.contrat, V = verite();
  const k = JSON.stringify(V) + '|' + JSON.stringify([...C.designations]) + '|' + JSON.stringify([...(C.sexes || [])]) + '|' + JSON.stringify([...(C.charges || [])])
    + '|' + JSON.stringify([...(C.raccords || [])]) + '|' + JSON.stringify(app.simu || {}) + '|' + app.plan + '|' + app.nFolios;
  // (v86) un Défaire rend des COPIES des liaisons, de même contenu : la clé ne change pas, mais les plans et les gestes gardés
  // tiennent aux liaisons elles-mêmes — la liste qui n'est plus la même refait tout
  if (k !== RECAP.cle || RECAP.V !== V || RECAP.premier !== V[0] || RECAP.norme !== app.norme || RECAP.bible !== app.bible || RECAP.refs !== app.references) {
    if (RECAP.V !== V || RECAP.premier !== V[0]) RECAP.versV = (RECAP.versV || 0) + 1;   // (le rendu le sait : ses lignes tiennent aux liaisons)
    RECAP.cle = k; RECAP.V = V; RECAP.premier = V[0]; RECAP.norme = app.norme; RECAP.bible = app.bible; RECAP.refs = app.references; RECAP.memo.clear(); }
  if (RECAP.items !== CONTROLE.items) { RECAP.items = CONTROLE.items; RECAP.itemsN++; RECAP.parCable = null; RECAP.parNom = null; RECAP.memo.delete('fils'); } }
const memo = (k, f) => { if (!RECAP.memo.has(k)) RECAP.memo.set(k, f()); return RECAP.memo.get(k); };
const routes = () => memo('routes', couleursDesRoutes);
const H_ = () => app.simu || HYPOTHESES;
/* Le contrôle, par câble (un point qui cite son numéro) et par repère : l'état d'une ligne. */
function itemsParCable() { if (!RECAP.parCable) { const C = new Set(verite().map(l => l.cable).filter(Boolean)), m = new Map();
    (CONTROLE.items || []).forEach(x => { new Set(String(x.texte).match(/[^\s,;:()«»]+/g) || []).forEach(t => { if (C.has(t)) (m.get(t) || m.set(t, []).get(t)).push(x); }); }); RECAP.parCable = m; }
  return RECAP.parCable; }
function itemsParNom() { if (!RECAP.parNom) { const m = new Map(); (CONTROLE.items || []).forEach(x => { if (x.nom) (m.get(x.nom) || m.set(x.nom, []).get(x.nom)).push(x); }); RECAP.parNom = m; } return RECAP.parNom; }
const niveauDe = xs => xs.some(x => x.niveau === 'ko') ? 'ko' : xs.length ? 'att' : '';
// (passe 87, S4) l'état d'un repère : les LIGNES de sa fiche (un câble, une ligne ; la barrette ajoutée sur l'une de ses bornes),
// à régler (un problème ou un geste) ou à voir (`lignesDeLObjet`) ; ses points disent le niveau
const etatDuNom = nom => { const U = typeof lignesDeLObjet === 'function' ? lignesDeLObjet(nom) : [], xs = U.length ? U.flatMap(u => u.xs) : itemsParNom().get(nom) || [];
  return { niveau: niveauDe(xs), ko: xs.filter(x => x.niveau === 'ko').map(x => x.texte), att: xs.filter(x => x.niveau !== 'ko').map(x => x.texte), regler: U.filter(u => u.regler), voir: U.filter(u => !u.regler) }; };

/* Les liaisons de chaque repère, rangées en un passage : le moteur lit un repère dans les liaisons qu'on lui donne (ses
   besoins, ses connecteurs, son plan ne regardent que les siennes) — lui donner les siennes seulement, c'est le même
   calcul, sans relire tout le contrat pour chacun. */
const liaisonsParRepere = () => memo('parRepere', () => { const m = new Map(), V = verite();
  V.forEach(l => [l.de, l.vers].forEach((r, k) => { if (!r || (k && l.vers === l.de)) return; (m.get(r) || m.set(r, []).get(r)).push(l); })); return m; });
const liaisonsDuRepere = nom => liaisonsParRepere().get(nom) || [];
/* Le plan d'un repère — ses cavités, sa barrette ou sa prise, comme 08-modules les calcule (`cavitesDe`, `planDeBarrette`,
   `planDeCoupure`) — et ce que chaque câble y reçoit (le contact, ce qu'on sertit). */
function planDuRepere(r) { return memo('plan|' + r, () => { const fils = new Map(), out = { fils, cavites: [], barrette: null, coupure: null };
  if (!r || VT_A_POSER.test(r) || estMasse(r) || estRenvoi(r) || estRail(r)) return out;
  const noter = xs => (xs || []).forEach(x => { if (x.f && x.f.l && !fils.has(x.f.l)) fils.set(x.f.l, x); }), L = liaisonsDuRepere(r), D = app.contrat.designations;
  try { if (barretteEnModules(r)) { const besoins = besoinsDeBarrette(r, L), plan = remplirModules(besoins, app.norme, D.get(r) || ''); out.barrette = { besoins, plan, main: plan.variante }; noter(plan.fils); }
    else if (coupureEnModules(r)) { out.coupure = coupureEnModule(r, L, app.norme, D.get(r) || '', sexeChoisi(r)); noter(out.coupure.plan.fils); }
    else if (!estBornier(r) && aDesModulesDeConnecteur()) { out.cavites = connecteursEnModules(r, L, app.norme, k => D.get(k) || '', sexeChoisi); out.cavites.forEach(c => noter(c.plan.fils)); } } catch (_) { }
  return out; }); }
/* Le contact d'un bout de câble : celui qu'on a écrit à la main, sinon celui que le plan lui donne ; null pour un bout
   qui n'en prend pas (une masse, un renvoi). */
function contactDuBout(l, cote) { const r = cote === 'de' ? l.de : l.vers, force = contactMain(l, r, cote === 'de' ? l.borneDe : l.borneVers);
  if (!r || VT_A_POSER.test(r) || estMasse(r) || estRenvoi(r) || estRail(r)) return null;
  const x = planDuRepere(r).fils.get(l) || null, auto = x && x.sertir ? x.sertir.reference : '';
  if (force) return { ref: force, acc: '', main: true, auto, taille: x && x.contact ? x.contact.taille : '', sexe: x ? x.sexe || '' : '' };
  return { ref: auto, acc: x && x.sertir ? x.sertir.accessoire || '' : '', ko: !!(x && x.jaugeOk === false), taille: x && x.contact ? x.contact.taille : '', sexe: x ? x.sexe || '' : '', connu: !!x }; }

/* ---- UNE LIGNE DE LIAISON : ce que la fiche du câble en dit ----------------- */
/* Comme la fiche (08-fiche) : ce que le câble porte et ce qu'il admet (`intensiteCalculee` : le profil du disjoncteur en
   amont, sinon l'hypothèse ; la norme des câbles, déclassée), sa chute — sur lui seul, et en ligne depuis son
   disjoncteur contre la chute admise du moteur (`chuteDuFil`) —, la longueur, le contact de chaque bout ; puis l'état. */
function infoFil(l) { const M = memo('fils', () => new Map()); let F = M.get(l); if (F) return F;
  const x = intensiteCalculee(l), c = chuteDuFil(l, x), cab = l.type ? cableDuType(app.norme, l.type) : null;
  F = { l, x, c, jauge: x.jauge, cab, L: c.L, R: x.rd.rho != null ? x.rd.rho / 1000 * c.L : null, masse: cab && cab.masse != null ? cab.masse * c.L : null, de: contactDuBout(l, 'de'), vers: contactDuBout(l, 'vers') };
  F.etat = etatDuFil(l, F); M.set(l, F); return F; }
/* L'ÉTAT d'une liaison, en un mot : un problème (le câble ne porte pas son courant, la chute en ligne dépasse sur des
   longueurs mesurées, un contact refuse sa gauge, le contrôle le dit), à voir (sans type, hors de la norme, la chute sur
   des longueurs d'hypothèse, une remarque du contrôle), sinon ok. La bulle dit les chiffres, puis le pourquoi. */
function etatDuFil(l, F) { const ko = new Set(), att = new Set(), x = F.x, c = F.c, controle = l.cable ? itemsParCable().get(l.cable) || [] : [];
  if (!liaisonComplete(l)) att.add('Liaison incomplète : ni dessinée, ni vérifiée');
  else if (l.de !== l.vers) {
    if (!l.type) att.add('Sans type : ce qu’il admet ne se lit pas');
    else if (!x.fn) att.add(l.type + ' : hors de la norme des câbles, ce qu’il admet ne se lit pas');
    // ce que le contrôle dit déjà d'un câble sous un disjoncteur, il le dit dans ses mots : on ne le répète pas
    [['de', l.de], ['vers', l.vers]].forEach(([k, r]) => { if (F[k] && F[k].ko) ko.add('Le contact côté ' + r + ' refuse sa gauge'); }); }
  controle.forEach(y => (y.niveau === 'ko' ? ko : att).add(majuscule(y.texte)));
  // l'intensité et la chute comptent dans l'état — la chute en pointe aussi, comme la fiche (`etatDeChute`) ; leurs chiffres
  // ouvrent la bulle (« > » quand ça dépasse)
  const trop = l.de !== l.vers && liaisonComplete(l) && x.trop.length > 0, chute = c.trop || c.pointe ? (c.reel ? 'ko' : 'att') : '';
  const niveau = ko.size || trop || chute === 'ko' ? 'ko' : att.size || chute ? 'att' : l.de === l.vers ? '' : 'ok';
  const cmp = (a, b) => a > b + 1e-9 ? '>' : 'sur', supp = c.reel ? '' : ' (longueurs supposées)';
  // (v87, le lecteur, Q1) un courant inconnu dit ce qu'il faut écrire — jamais le courant total du disjoncteur
  const chiffres = [x.I == null ? `Intensité : inconnue${typeof motDeCommande === 'function' && motDeCommande(x) ? ' — ' + motDeCommande(x) : ''}${x.al ? ', sous ' + x.al.nom : ''}` : x.fn ? `Intensité : ${amperes(x.I)} ${cmp(x.I, x.continu)} ${amperes1(x.continu)} admis en continu${x.al ? ', sous ' + x.al.nom : ' (supposé)'}` : '',
    x.fn && x.pointe && x.pointe.admis ? `En pointe : ${amperes(x.pointe.i)} pendant ${secondes(x.pointe.t)} ${cmp(x.pointe.i, x.pointe.admis)} ${amperes1(x.pointe.admis)} admis` : '',
    c.total ? `Chute en ligne : ${volts(c.total.dU)} ${c.max != null ? cmp(c.total.dU, c.max) + ' ' + volts(c.max) + ' admis' : ''}${supp}` : c.dU != null ? `Chute sur ce câble : ${volts(c.dU)}` : '',
    c.pointe ? `Chute en pointe : ${volts(c.pointe.dU)} > ${volts(c.pointe.admis)} admis${supp}` : ''].filter(Boolean);
  return { niveau, ko: [...ko], att: [...att], bulle: [chiffres.join('\n'), [...ko, ...att].join('\n')].filter(Boolean).join('\n\n') }; }

/* ---- petits morceaux de rendu ------------------------------------------- */
// UN CHOIX DE VOLTA qu'on règle : au survol il prend l'air d'un champ ; double-clic, Entrée ou F2 ouvre Automatique et
// les choix possibles ; vide, il dit ce qu'on y choisirait (sur la ligne survolée ou choisie)
const val = (f, html, opt) => { opt = opt || {}; const vide = html == null || html === '';
  return `<span class="rc-v${opt.cls ? ' ' + opt.cls : ''}${vide ? ' rc-vide' : ''}" data-f="${escA(f)}" tabindex="-1" ${opt.titre ? ` data-bulle="${escA(opt.titre)}"` : ''} aria-description="${escA(opt.aria || opt.titre || 'Double-clic pour choisir')}"${opt.ph ? ` data-ph="${escA(opt.ph)}"` : ''}>${vide ? '' : html}</span>`; };
const valT = (f, t, opt) => val(f, t == null || t === '' ? '' : esc(t), opt);
/* CE QUI VIENT DU FICHIER SE LIT (v86 — la charte v85 : « une seule source ») : pas l'air d'un champ, pas de saisie ; la case
   garde sa place dans le parcours du clavier (les flèches), et un double-clic, Entrée ou F2 disent dans une bulle qu'elle se
   change dans le fichier (`signalerFichier`). `titre` : sa bulle de survol, quand elle explique quelque chose. */
const luFichier = (f, html, opt) => { opt = opt || {}; const vide = html == null || html === '';
  return `<span class="rc-v rc-lu${opt.cls ? ' ' + opt.cls : ''}${vide ? ' rc-vide' : ''}" data-f="${escA(f)}" tabindex="-1"${opt.titre ? ` data-bulle="${escA(opt.titre)}"` : ''}>${vide ? '' : html}</span>`; };
const luFichierT = (f, t, opt) => luFichier(f, t == null || t === '' ? '' : esc(t), opt);
// le nom de ce qu'une case du fichier porte, pour la bulle qui dit où le changer
const MOTS_DU_FICHIER = { de: 'Ce repère', vers: 'Ce repère', rep: 'Ce repère', borneDe: 'Cette borne', borneVers: 'Cette borne', type: 'Ce type de câble', longueur: 'Cette longueur',
  route: 'Cette route', pnDe: 'Ce part number', pnVers: 'Ce part number', 'pn:': 'Ce part number', plan: 'Ce folio', harness: 'Ce harness', fwd: 'Ce dessin', descriptionDe: 'Cette description',
  descriptionVers: 'Cette description', nature: 'Sa nature', calibre: 'Ce calibre' };
const motDuFichier = f => MOTS_DU_FICHIER[f] || (/^pn:/.test(f) ? 'Ce part number' : 'Cette valeur');
// « ↺ » : rend le calcul (ou ce que le fichier portait) à une valeur forcée ; son titre dit ce qui revient
const rond = (f, quoi) => `<button type="button" class="rc-auto" data-auto="${escA(f)}" data-bulle="${escA('Rendre ' + quoi)}" aria-label="${escA('Rendre ' + quoi)}">↺</button>`;
// l'origine d'une valeur, seulement quand elle n'est pas celle du calcul : « manuel » (un choix de VOLTA réglé à la main —
// le mot de la fiche, Automatique · Manuel), « supposée » (une hypothèse de la simulation — plus « hyp. », une
// abréviation que le lecteur n'emploie pas) ; `mot` : le mot accordé à la valeur
const orig = (o, bulle, mot) => o === 'hyp' ? `<i class="rc-o rc-hyp" data-bulle="${escA(bulle || 'Une hypothèse de la simulation (menu ⋮ → Hypothèses)')}">${mot || 'supposé'}</i>`
  : o === 'main' ? `<i class="rc-o main" data-bulle="${escA(bulle || 'Réglé à la main (Manuel) : ↺ rend le choix automatique de VOLTA')}">${mot || 'manuel'}</i>` : '';
const unite = u => `<i class="rc-u">${u}</i>`;
const rien = '<span class="rc-rien">—</span>';
const fmt = (x, n) => x == null || !isFinite(x) ? '' : nombre(Math.round(x * Math.pow(10, n)) / Math.pow(10, n));
/* (v86, F1 : « 9,3 A ici, 9,31 A dans la fiche ; ≈ 5,00 m ici, ≈ 5 m là ») LES NOMBRES S'ÉCRIVENT COMME DANS LA FICHE : un
   courant à deux décimales sous 10 A, une au-delà (`nombreA`, 08-fiche : 9,31 A, 2 A, 11,7 A) ; une tension comme `volts`
   (1,34 V, 2 V) ; une longueur au centimètre, sans zéro de traîne (5 m, 3,5 m, 0,84 m). Les chiffres d'une colonne restent
   alignés à droite dans leur place (`calerChiffres`). */
const ampere = x => x == null || !isFinite(x) ? '' : typeof nombreA === 'function' ? nombreA(x) : fmt(x, x < 10 ? 2 : 1);
const voltsN = u => u == null || !isFinite(u) ? '' : fmt(u, u < 0.1 ? 3 : 2);
const metres = x => fmt(x, 2);
// un nombre et son unité, alignés à droite dans leur place ; ce qui suit (l'origine, ↺) se range derrière
const chiffre = (html, u, cls) => `<span class="rc-chiffre${cls ? ' ' + cls : ''}">${html}${u ? unite(u) : ''}</span>`;
// une fraction (« 7 / 10 ») : le premier nombre dans la place des chiffres de sa colonne — les barres tombent l'une sous l'autre
const fraction = (a, b, cls) => `<span class="rc-frac${cls ? ' ' + cls : ''}">${chiffre(`<b class="rc-n">${a}</b>`)}<i>/ ${b}</i></span>`;
/* L'ÉTAT, partout pareil : un point de sa couleur et un mot (ok, à voir, problème — ou ce qu'il compte), le pourquoi
   dans la bulle. */
const MOTS_ETAT = { ok: 'ok', att: 'à voir', ko: 'problème' };
/* (v74 : « l'œil se perd ») ce qui va bien se tait : « ok » n'est plus écrit deux cents fois — son point vert suffit, le mot
   reste pour le lecteur d'écran et le CSV ; « à voir » et « problème » gardent leur mot, ils sortent ainsi du lot. */
/* (le lecteur : « État, pastille verte ou quoi, on ne comprend pas ») ce qui va bien ne se dessine plus du tout : ni point,
   ni mot à l'écran — « ok » reste pour le lecteur d'écran et le CSV ; une colonne d'état où tout va bien ne se pose pas
   (`vide`, `colonnesUtiles`). Le reste se dit en mots, à sa couleur : « problème », « à voir », « 3 problèmes ». */
const etatHtml = (niveau, mot, bulle) => { if (!niveau) return rien; const m = mot || MOTS_ETAT[niveau];
  if (m === 'ok') return '<span class="rc-etat ok seul"><span class="sr">ok</span></span>';
  return `<span class="rc-etat ${niveau}"${bulle ? ` data-bulle="${escA(bulle)}"` : ''}><i aria-hidden="true"></i>${esc(m)}</span>`; };
const rangEtat = n => ({ ko: 0, att: 1, ok: 2 })[n] ?? 3;
/* LA GAUGE, une fois (v74 ; le designer v73 : « trois styles de disque sans légende » ; le technicien : « la gauge en simple
   nombre ») : un nombre à l'encre seconde, sans disque — et dans la case du câble, seulement quand le type ne la dit pas
   déjà (DR12 dit 12) ; toutes les flèches d'une colonne ont la même épaisseur (v81 : la gauge ne l'épaissit plus). */
const pastilleJauge = g => `<span class="rc-jauge ${g == null ? 'inconnue' : g <= 16 ? 'forte' : g <= 20 ? 'moyenne' : 'fine'}" data-bulle="${g == null ? 'Gauge inconnue : le type ne la dit pas' : 'Gauge ' + g + ' AWG'}">${g == null ? '?' : g}</span>`;
const typeDitJauge = (t, g) => g != null && new RegExp('(^|\\D)' + g + '$').test(String(t || '').trim());
const traitRoute = c => `<i class="rc-trait"${c ? ` style="--c:${c}"` : ''}></i>`;
const listeFolios = ps => ps.length ? (ps.length > 3 ? ps.length + ' folios' : 'f.\u00a0' + ps.join(' · ')) : '';

/* ---- LIAISONS ----------------------------------------------------------- */
// la portée : le folio affiché ; ce que l'outil a découpé se lit par la clé de la liaison (une fois par état du contrat)
const avecPortee = () => app.plan !== '*' && memo('plans', plans).length > 0;
const modeFolioMemo = () => memo('modeFolio', modeFolio);
const foliosParSourceMemo = () => memo('foliosSource', foliosParSource);
function surLeFolio(l) { if (app.plan === '*') return true; return modeFolioMemo() === 'auto' ? (foliosParSourceMemo().get(cleDe(l)) || []).includes(app.plan) : l.plan === app.plan; }
const premierFolio = l => (modeFolioMemo() === 'auto' ? (foliosParSourceMemo().get(cleDe(l)) || [])[0] : l.plan) || '';
// un bout : le repère et sa borne, en chasse fixe ; une masse, un renvoi le disent en un mot ; le repère du bloc choisi
// sur le plan se surligne (`ici`)
const bout = (l, c) => { const de = c === 'de', r = l[c], b = l[de ? 'borneDe' : 'borneVers'], nat = estMasse(r) ? 'masse' : estRenvoi(r) ? 'renvoi' : '', ici = !!r && !!app.cible && app.cible.type === 'bloc' && app.cible.nom === r;
  return `<span class="rc-bout${ici ? ' ici' : ''}">${luFichierT(c, r, { cls: 'rc-r' })}<i class="rc-sep${b ? '' : ' rc-vide'}">:</i>${luFichierT(de ? 'borneDe' : 'borneVers', b, { cls: 'rc-b' })}${nat ? `<small class="rc-nat">${nat}</small>` : ''}</span>`; };
// une valeur du fichier qu'une proposition de VOLTA a changée (« Passer en DR16 ») : « ↺ » rend celle de votre fichier
const rendu = (l, f) => origineChamp(l, f) === 'main' && l.avant && l.avant[f] ? rond(f, 'celle de votre fichier (' + l.avant[f] + ')') : '';
/* LE CONTACT D'UN BOUT, UN CHOIX DE VOLTA (la table des contacts, à la taille et au sexe de la cavité, à la gauge du câble) :
   Automatique, ou Manuel — un contact de la table qu'on lui préfère ; « manuel » et ↺ le disent. */
const contactH = (l, F, c) => { const x = F[c], f = c === 'de' ? 'contactDe' : 'contactVers'; if (!x) return rien;
  const titre = x.main ? 'Manuel' + (x.auto ? ' — l’automatique serait ' + x.auto : '') : x.ko ? 'Ce contact refuse la gauge du câble' : !x.ref ? (x.connu ? 'Aucun contact de la table ne va à ce câble' : 'Aucun plan ne connaît ce connecteur : choisissez le contact') : (x.taille ? 'Automatique : contact taille ' + x.taille + (x.sexe ? ' · ' + (x.sexe === 'M' ? 'mâle' : 'femelle') : '') : 'Automatique');
  return `<span class="rc-ctc">${valT(f, x.ref, { cls: 'rc-ct' + (x.ko ? ' ko' : ''), ph: 'contact', titre: titre + ' — double-clic : Automatique, ou un autre contact' })}${x.acc ? `<small class="rc-acc">+ ${esc(x.acc)}</small>` : ''}${x.main ? orig('main') + rond(f, x.auto ? 'l’automatique (' + x.auto + ')' : 'l’automatique') : ''}</span>`; };
const motEtatFil = r => { const n = r.F().etat.niveau; return n ? MOTS_ETAT[n] : ''; };
/* LE CÂBLE EST LE LIEN (le lecteur : « la flèche, tu la mets immense, tu dis ça va de là à là, mais en fait tu as mis le câble
   entre ; ce n'est pas du tout propre »). De → Vers se lit d'un trait : « de » finit contre la flèche, « vers » part de sa
   pointe ; la flèche a une longueur fixe, de la couleur de sa route, et porte en son milieu l'étiquette du câble — son type
   (et sa gauge quand le type ne la dit pas), sur une pastille de papier cerclée de la couleur de sa route, comme la loupe
   du plan. Plus de numéro (v78c : « les câbles n'ont plus de numéro du tout »). */
const celluleCable = r => { const l = r.l, g = r.F().jauge, c = routes().get(l.route || '') || '', dit = typeDitJauge(l.type, g);
  const bulle = (l.route ? 'Route ' + l.route : 'Sans route') + (g != null ? ' · gauge ' + g + ' AWG' : ' · gauge inconnue');
  return `<span class="rc-cable${c ? '' : ' sans-route'}${g == null ? ' sans-jauge' : ''}"${c ? ` style="--c:${c}"` : ''} data-bulle="${escA(bulle)}"><i class="rc-fleche" aria-hidden="true"></i>`
    + `<span class="rc-cable-type${l.type || (g != null && !dit) ? '' : ' vide'}">${luFichierT('type', l.type, { cls: 'rc-type' })}${g != null && !dit ? `<i class="rc-jauge">${g}</i>` : ''}${rendu(l, 'type')}</span></span>`; };
// la longueur : celle de votre fichier ; sans elle, « ≈ » et l'hypothèse de la simulation, que la bulle dit où écrire
const celluleLongueur = r => { const l = r.l, o = l.longueur > 0 ? origineChamp(l, 'longueur') : 'hyp';
  const bulle = o === 'hyp' ? 'Votre fichier ne donne pas sa longueur : VOLTA suppose ' + metres(H_().longueur) + ' m (Hypothèses) — à écrire dans votre fichier' : '';
  return `<span class="rc-mesure${o === 'hyp' ? ' rc-suppose' : ''}">${chiffre(luFichier('longueur', metres(r.F().L), { cls: 'rc-n', titre: bulle }), 'm')}`
    // « supposée » une fois : dans l'en-tête quand toutes les longueurs montrées le sont (la note de sa colonne), sinon sur
    // chaque ligne qui l'est — l'exception se voit, la règle ne se répète pas
    + `${o === 'hyp' ? (RECAP.notes.longueur ? '' : orig('hyp', bulle, 'supposée')) : o === 'main' ? rond('longueur', l.avant && l.avant.longueur > 0 ? 'celle de votre fichier (' + metres(l.avant.longueur) + ' m)' : 'l’hypothèse (' + metres(H_().longueur) + ' m)') : ''}</span>`; };
/* L'INSTANT D'UNE LIGNE (v86, B7 — l'audit : « 9,3 A pointe à côté d'une chute prise au permanent : le lecteur rapproche les
   deux colonnes et ne retombe pas sur ses pieds ») : l'intensité et la chute disent LE MÊME INSTANT, le plus dur pour ce câble
   — une pointe du profil quand elle pèse plus que le permanent (sur le courant contre ce qu'il admet pour sa durée, ou sur la
   chute contre ce qui est admis), sinon le permanent. « pointe » le dit dans les deux cases ; leur bulle donne l'autre
   instant. La chute à une pointe : celle de la ligne que le moteur a déjà comptée (09-chute, `pointes`) ; sur un câble sans
   chemin de disjoncteur, sur lui seul, au courant de la pointe (`chuteDuCable`). Rend { le, perm, autre }. */
function instantsDuFil(F) { if (F.inst) return F.inst; const x = F.x, c = F.c, total = c.total;
  const perm = { pointe: false, i: x.I, admis: x.continu, u: total ? total.dU : c.dU, umax: c.max, nom: 'permanent', t: Infinity };
  const admisU = t => { try { const A = chuteAdmiseDe(x.H); return A ? (t <= (typeof INTERMITTENT_MAX === 'number' ? INTERMITTENT_MAX : 120) && A.chuteInter != null ? A.chuteInter : A.chuteMax) : c.max; } catch (_) { return c.max; } };
  const pointes = (x.pts || []).filter(p => p.t !== Infinity && p.i > 0).map(p => { let u = null, umax = null, inter = false;
    const q = total ? (total.pointes || []).find(y => y.t === p.t && (y.nom || '') === (p.nom || '')) || (total.pointes || []).find(y => y.t === p.t) : null;
    if (q) { u = q.dU; umax = q.admis; inter = !!q.intermittent; }
    else if (!total && c.dU != null && F.l) { try { const k = chuteDuCable(app.norme, F.l, p.i, x.H); if (k && k.dU != null) { u = k.dU; umax = admisU(p.t); inter = p.t <= 120; } } catch (_) { } }
    return { pointe: true, i: p.i, admis: x.fn && x.admise ? x.admise(p.t) : null, u, umax, nom: p.nom || 'pointe', t: p.t, inter }; });
  const dur = s => Math.max(s.admis ? s.i / s.admis : 0, s.u != null && s.umax ? s.u / s.umax : 0);
  let le = perm; pointes.forEach(s => { if (dur(s) > dur(le) + 1e-9) le = s; });
  return (F.inst = { le, perm, autre: le === perm ? pointes.slice().sort((a, z) => dur(z) - dur(a))[0] || null : perm }); }
/* L'ANNEAU (v86, F2 — « une barre ici, un anneau dans les fiches ») : la part de l'admis, dessinée comme la fiche (`anneauVue`,
   08-vues, sa couleur d'état), petite et sans chiffre dedans — la valeur est à côté, la part dans la bulle. Sans admis, sa place
   reste (les valeurs d'une colonne tombent l'une sous l'autre). `niv` : la teinte du problème, quand la mesure dépasse. */
const anneau = (ratio, niv) => { if (typeof anneauVue !== 'function') return ''; let h = anneauVue(ratio, { r: 7, ep: 2.6 });
  if (niv && ratio != null && isFinite(ratio)) h = h.replace(/class="vu-anneau [a-z]*"/, `class="vu-anneau ${niv}"`); return `<span class="rc-anneau" aria-hidden="true">${h}</span>`; };
const pourcentDe = r => r != null && isFinite(r) ? Math.round(r * 100) + INSECABLE + '%' : '';
const instantDit = s => s.pointe ? 'en pointe (' + s.nom + ', ' + secondes(s.t) + ')' : 'au permanent';
// le mot d'un instant ou d'une origine (« pointe », « supposé ») : une place fixe, même vide — chaque case de la colonne a la même largeur
const motInstant = (mot, bulle) => `<span class="rc-int-mot">${mot ? `<i class="rc-o"${bulle ? ` data-bulle="${escA(bulle)}"` : ''}>${mot}</i>` : ''}</span>`;
/* L'INTENSITÉ, à l'instant de la ligne : ce qu'il porte, sur ce qu'il admet pour cette durée (EN 2853, déclassé), l'anneau de la
   part ; un câble sans type garde son courant (V86, 8 : « le courant doit se lire quand même ») — sans admis, sans anneau. */
const celluleIntensite = r => { const F = r.F(), x = F.x, I = instantsDuFil(F), s = I.le;
  /* (v86, comme la fiche) une BRANCHE DE COMMANDE dont rien n'est écrit (la bobine d'un relais, l'entrée d'un calculateur) : son
     courant est INCONNU — jamais le courant total du disjoncteur ; « inconnu », et la bulle dit ce qu'il faut écrire */
  // (v87, le lecteur, Q1) toute branche dont une consommation manque, son retour aussi (S1) : « inconnu », et ce qu'il faut écrire
  if (x.I == null && x.al) { const quoi = typeof motDeCommande === 'function' ? motDeCommande(x) : '', cmd = x.source === 'commande';
    return `<span class="rc-int" data-bulle="${escA((cmd ? 'Courant de commande inconnu' : 'Courant inconnu') + (x.retour ? ' — le retour de ' + listeEt(x.retour.de) + ', comme son aller' : '') + ', sous ' + (x.al ? x.al.nom : 'son disjoncteur') + (quoi ? ' : ' + quoi : '') + '. Rien ne le juge, rien ne le grossit tant qu’il n’est pas écrit.')}">${anneau(null)}${chiffre('')}<span class="rc-adm rc-inconnu">inconnu</span>${motInstant(cmd ? 'commande' : '')}</span>`; }
  // (v88, le lecteur : « l'outil dit la vérité, pas inventé ») sans disjoncteur en amont, plus de courant supposé : « inconnu »,
  // comme les autres — la colonne ne se pose que si une ligne au moins a un courant ou un geste (`vide`)
  if (x.I == null && !x.al) return `<span class="rc-int" data-bulle="${escA('Courant inconnu : votre fichier ne lui donne aucun disjoncteur en amont. VOLTA ne lui prête aucun courant.')}">${anneau(null)}${chiffre('')}<span class="rc-adm rc-inconnu">inconnu</span>${motInstant('')}</span>`;
  if (s.i == null || !isFinite(s.i)) return rien;
  const q = s.admis ? s.i / s.admis : null, trop = q != null && q > 1 + 1e-9;
  const quoi = x.al ? (x.source === 'branche' ? (x.retour ? 'ce que ce câble ramène' : 'ce qu’alimente ce câble') : x.partiel ? 'ce qui est écrit en aval de ' + x.al.nom + ' (au moins)' : 'le profil de ' + x.al.nom) : 'ce qui est écrit';
  const autre = I.autre && I.autre.admis ? `\n${majuscule(instantDit(I.autre))} : ${amperes(I.autre.i)} sur ${amperes1(I.autre.admis)} admis` + (I.autre.i > I.autre.admis + 1e-9 ? ' — il ne les porte pas.' : '.') : '';
  const bulle = s.admis ? `${majuscule(instantDit(s))} : ${amperes(s.i)}, selon ${quoi} ; ${s.pointe ? 'sur cette durée, ' : ''}le ${F.l.type || 'câble'} admet ${amperes1(s.admis)} (${pourcentDe(q)})${trop ? ' : il ne les porte pas.' : '.'}${autre}`
    : `${majuscule(instantDit(s))} : ${amperes(s.i)}, selon ${quoi}.\n${F.l.type ? F.l.type + ' n’est pas dans l’EN 2853' : 'Votre fichier ne donne pas son type'} : ce qu’il admet ne se lit pas.`;
  const mot = s.pointe ? motInstant('pointe', 'Les deux colonnes disent la pointe du profil : ' + s.nom + ', ' + amperes(s.i) + ' pendant ' + secondes(s.t) + '.') : motInstant('');
  const mene = x.al ? 'Double-clic : le profil de ' + x.al.nom : '';
  return `<span class="rc-int" data-bulle="${escA(bulle + (mene ? '\n' + mene + '.' : ''))}">${anneau(q, trop ? 'ko' : '')}${chiffre(val('intensite', ampere(s.i), { cls: 'rc-n rc-calc', aria: mene }), 'A', trop ? 'ko' : '')}<span class="rc-adm">${s.admis ? 'sur ' + ampere(s.admis) + INSECABLE + 'A' : 'admis inconnu'}</span>${mot}</span>`; };
/* LA CHUTE, au même instant : la tension perdue depuis le disjoncteur jusqu'au bout du chemin le plus long qui passe par lui,
   sur ce qui est admis (sans disjoncteur en amont : sur lui seul) ; en défaut, la teinte du problème — rouge sur des longueurs
   de votre fichier, ambre (à voir) sur des longueurs supposées. */
const celluleChute = r => { const F = r.F(), c = F.c, I = instantsDuFil(F), s = I.le, u = s.u; if (u == null || !isFinite(u)) return rien;
  const q = s.umax ? u / s.umax : null, trop = q != null && q > 1 + 1e-9, niv = trop ? (c.reel ? 'ko' : 'att') : '';
  const ou = c.total ? 'En ligne depuis ' + F.x.al.nom : 'Sur ce câble seul (aucun disjoncteur en amont n’en donne le chemin)';
  const autre = I.autre && I.autre.u != null ? `\n${majuscule(instantDit(I.autre))} : ${volts(I.autre.u)}` + (I.autre.umax ? ' sur ' + volts(I.autre.umax) + ' admis' : '') + '.' : '';
  const bulle = `${ou}, ${instantDit(s)} : ${volts(u)} perdus${s.umax ? ' sur ' + volts(s.umax) + ' admis' + (s.pointe && s.inter ? ' en intermittent' : '') + ' (' + pourcentDe(q) + ')' : ''}${trop ? ' : la ligne perd trop' + (c.reel ? '.' : ', sur des longueurs supposées — à voir.') : '.'}`
    + (c.total && c.dU != null && !s.pointe ? `\nSur ce câble : ${volts(c.dU)}.` : '') + autre;
  // (« pointe » ne se répète pas dans la case : l'intensité le dit, et l'en-tête de la colonne dit « au même instant »)
  return `<span class="rc-mesure rc-chute" data-bulle="${escA(bulle)}">${anneau(q, niv)}${chiffre(`<b class="rc-n">${voltsN(u)}</b>`, 'V', niv)}<span class="rc-adm">${s.umax ? 'sur ' + voltsN(s.umax) + INSECABLE + 'V' : ''}</span></span>`; };
const COLONNES_LIAISONS = [
  // « de » se range contre la flèche (à droite de sa case), « vers » part de sa pointe (à gauche) : la phrase se lit d'un trait
  { k: 'de', t: 'De', cls: 'rc-c-bout rc-c-de', html: r => bout(r.l, 'de') + rendu(r.l, 'de'), tri: r => r.l.de + '\u0001' + r.l.borneDe, texte: r => r.l.de + (r.l.borneDe ? ':' + r.l.borneDe : '') },
  { k: 'cable', t: 'Câble', cls: 'rc-c-cable', html: celluleCable, tri: r => r.l.type || '', texte: r => [r.l.type, r.F().jauge != null ? r.F().jauge + ' AWG' : ''].filter(Boolean).join(' ') },
  { k: 'vers', t: 'Vers', cls: 'rc-c-bout rc-c-vers', html: r => bout(r.l, 'vers') + rendu(r.l, 'vers'), tri: r => r.l.vers + '\u0001' + r.l.borneVers, texte: r => r.l.vers + (r.l.borneVers ? ':' + r.l.borneVers : '') },
  { k: 'longueur', t: 'Longueur', cls: 'rc-c-mesure', html: celluleLongueur, tri: r => r.F().L, texte: r => metres(r.F().L) + ' m' + (r.l.longueur > 0 ? '' : ' (supposée)'),
    note: L => L.every(r => !(r.l.longueur > 0)) ? ['supposée', 'Votre fichier ne donne aucune longueur : chaque câble compte ' + metres(H_().longueur) + ' m, l’hypothèse de la simulation (menu ⋮ → Hypothèses). Les longueurs mesurées s’écrivent dans votre fichier.'] : null },
  { k: 'etat', t: 'État', cls: 'rc-c-etat', html: r => { const e = r.F().etat; return etatHtml(e.niveau, '', e.bulle); }, tri: r => rangEtat(r.F().etat.niveau), texte: motEtatFil, vide: r => !aReprendre(r.F().etat.niveau) },
  // en plus, au choix — (v84) l'intensité et la chute d'office dès que la feuille est large, les contacts à sertir sur une
  // très large (`large`, `colonnesVues`)
  { k: 'jauge', t: 'Gauge', cls: 'rc-c-n', option: true, g: 'Le câble', html: r => chiffre(pastilleJauge(r.F().jauge)), tri: r => r.F().jauge == null ? 99 : r.F().jauge, texte: r => r.F().jauge != null ? r.F().jauge + ' AWG' : '' },
  { k: 'route', t: 'Route', option: true, g: 'Le câble', html: r => `<span class="rc-route">${traitRoute(routes().get(r.l.route || ''))}${luFichierT('route', r.l.route)}${rendu(r.l, 'route')}</span>`, tri: r => r.l.route, texte: r => r.l.route },
  // (v86, B7) l'intensité et la chute au même instant (`instantsDuFil`) — à l'écran, au tri et dans le CSV
  { k: 'intensite', t: 'Intensité', option: true, large: 1, g: 'Le câble', cls: 'rc-c-int', html: celluleIntensite,
    tri: r => { const s = instantsDuFil(r.F()).le; return s.admis ? s.i / s.admis : s.i != null ? s.i / 1000 : -1; },
    texte: r => { const s = instantsDuFil(r.F()).le; return s.i == null ? (r.F().x.I == null ? (r.F().x.source === 'commande' ? 'inconnu (commande)' : 'inconnu') : '') : ampere(s.i) + ' A' + (s.admis ? ' sur ' + ampere(s.admis) + ' A' : '') + (s.pointe ? ' (pointe)' : ''); },
    vide: r => { const s = instantsDuFil(r.F()).le; return (s.i == null || !isFinite(s.i)) && !(r.F().x.I == null && r.F().x.al); } },
  { k: 'chute', t: 'Chute', option: true, large: 1, g: 'Le câble', cls: 'rc-c-mesure', html: celluleChute,
    // la règle de la colonne, dite une fois dans son en-tête : la chute de chaque ligne est prise à l'instant de son intensité
    note: () => colonnesVues(LIAISONS).some(c => c.k === 'intensite') ? ['au même instant', 'La chute de chaque ligne est prise au même instant que son intensité : la pointe du profil quand c’est elle qui pèse le plus (« pointe »), sinon le permanent. La bulle de chaque valeur donne l’autre instant.'] : null,
    tri: r => { const s = instantsDuFil(r.F()).le; return s.u == null ? -1 : s.umax ? s.u / s.umax : s.u / 100; },
    texte: r => { const s = instantsDuFil(r.F()).le; return s.u == null ? '' : voltsN(s.u) + ' V' + (s.umax ? ' sur ' + voltsN(s.umax) + ' V' : '') + (s.pointe ? ' (pointe)' : ''); },
    vide: r => { const s = instantsDuFil(r.F()).le; return s.u == null || !isFinite(s.u); } },
  { k: 'contactDe', t: 'Contact de', option: true, large: 2, g: 'Les deux bouts', cls: 'rc-c-ct', html: r => contactH(r.l, r.F(), 'de'), tri: r => (r.F().de || {}).ref || '', texte: r => (r.F().de || {}).ref || '', vide: r => !(r.F().de && r.F().de.ref) },
  { k: 'contactVers', t: 'Contact vers', option: true, large: 2, g: 'Les deux bouts', cls: 'rc-c-ct', html: r => contactH(r.l, r.F(), 'vers'), tri: r => (r.F().vers || {}).ref || '', texte: r => (r.F().vers || {}).ref || '', vide: r => !(r.F().vers && r.F().vers.ref) },
  { k: 'pnDe', t: 'Part number de', option: true, g: 'Les deux bouts', html: r => estMasse(r.l.de) || estRenvoi(r.l.de) ? rien : luFichierT('pnDe', r.l.pnDe, { cls: 'rc-pn' }) + rendu(r.l, 'pnDe'), tri: r => r.l.pnDe || '', texte: r => r.l.pnDe || '' },
  { k: 'pnVers', t: 'Part number vers', option: true, g: 'Les deux bouts', html: r => estMasse(r.l.vers) || estRenvoi(r.l.vers) ? rien : luFichierT('pnVers', r.l.pnVers, { cls: 'rc-pn' }) + rendu(r.l, 'pnVers'), tri: r => r.l.pnVers || '', texte: r => r.l.pnVers || '' },
  { k: 'plan', t: 'Folio', cls: 'rc-c-folio', option: true, g: 'Le dossier', si: () => modeFolio() !== 'aucun', html: r => modeFolioMemo() === 'auto'
      ? `<span data-bulle="Découpé par VOLTA : le folio se lit, il ne s’écrit pas">${(foliosParSourceMemo().get(cleDe(r.l)) || []).map(p => `<button class="rc-f" data-plan="${escA(p)}">${esc(p)}</button>`).join('')}</span>` : luFichierT('plan', r.l.plan),
    tri: r => premierFolio(r.l), texte: r => modeFolioMemo() === 'auto' ? (foliosParSourceMemo().get(cleDe(r.l)) || []).join(' ') : r.l.plan },
  { k: 'harness', t: 'Harness', option: true, g: 'Le dossier', html: r => luFichierT('harness', r.l.harness, { cls: 'rc-pn' }), tri: r => r.l.harness || '', texte: r => r.l.harness || '' },
  { k: 'fwd', t: 'FWD', option: true, g: 'Le dossier', html: r => luFichierT('fwd', r.l.fwd, { cls: 'rc-pn' }), tri: r => r.l.fwd || '', texte: r => r.l.fwd || '' },
  { k: 'descriptionDe', t: 'Description 1', option: true, g: 'Les deux bouts', html: r => luFichierT('descriptionDe', r.l.descriptionDe, { cls: 'rc-texte' }), tri: r => r.l.descriptionDe || '', texte: r => r.l.descriptionDe || '' },
  { k: 'descriptionVers', t: 'Description 2', option: true, g: 'Les deux bouts', html: r => luFichierT('descriptionVers', r.l.descriptionVers, { cls: 'rc-texte' }), tri: r => r.l.descriptionVers || '', texte: r => r.l.descriptionVers || '' },
  { k: 'resistance', t: 'Résistance', cls: 'rc-c-n', option: true, g: 'Le câble', html: r => r.F().R == null ? rien : chiffre(`<b class="rc-n">${fmt(r.F().R * 1000, 0)}</b>`, 'mΩ'), tri: r => r.F().R ?? -1, texte: r => r.F().R == null ? '' : fmt(r.F().R * 1000, 0) + ' mΩ' },
  { k: 'masse', t: 'Masse', cls: 'rc-c-n', option: true, g: 'Le câble', html: r => r.F().masse == null ? rien : chiffre(`<b class="rc-n">${fmt(r.F().masse, 1)}</b>`, 'g'), tri: r => r.F().masse ?? -1, texte: r => r.F().masse == null ? '' : fmt(r.F().masse, 1) + ' g' }];
const ligneLiaison = (l, i) => { const r = { l, i, k: String(i) }; let F = null; r.F = () => F || (F = infoFil(l)); return r; };
const aReprendre = n => n === 'ko' || n === 'att';
/* (v86, B5) une ligne tout à fait vide (ni « de », ni « vers », ni type, ni numéro) ne vient d'aucun fichier : celles que
   « + Liaison » puis Échap laissaient avant la v86 ne se montrent ni ne se comptent plus */
const liaisonVide = l => !l.de && !l.vers && !l.type && !l.cable && !(l.longueur > 0);
const LIAISONS = {
  cherche: 'Chercher : repère, câble…',
  colonnes: COLONNES_LIAISONS, portee: true,
  lignes: () => verite().map(ligneLiaison).filter(r => !liaisonVide(r.l)),
  surFolio: r => surLeFolio(r.l),
  exact: (r, f) => r.l.de === f || r.l.vers === f,
  etat: r => r.F().etat.niveau,
  choisie: r => { const c = app.cible; return !!c && (c.type === 'fil' ? c.l === r.l : r.l.de === c.nom || r.l.vers === c.nom); },
  hors: r => !(liaisonComplete(r.l) && surLeFolio(r.l)),
  puces: () => [['probleme', 'À reprendre', r => aReprendre(r.F().etat.niveau), '', '', 'Les liaisons à reprendre : un problème ou un point à voir', true],
    ...[...routes()].map(([route, c]) => ['route:' + route, route, r => r.l.route === route, traitRoute(c), 'route']),
    ['hyp', 'Sans longueur', r => !(r.l.longueur > 0), '', '', 'Les câbles sans longueur dans votre fichier : l’hypothèse de la simulation compte pour eux', false, 'Ce qui manque'],
    ['sanscontact', 'Sans contact', r => [r.F().de, r.F().vers].some(x => x && !x.ref), '', '', 'Un bout dont aucun plan ne donne le contact à sertir', true, 'Ce qui manque']],
  choisir: r => choisirLigneFil(r.l),
  survol: r => { const w = filDe(r.l); if (w) allumerFil(w); },
  editeur: (r, f) => editeurFil(r, f),
  ecrire: (r, f, v) => f === 'contactDe' || f === 'contactVers' ? (v === '' ? LIAISONS.rendre(r, f) : ecrireFil(r.l, f, v)) : false,
  // ↺ : le contact automatique revient ; une valeur du fichier qu'une proposition de VOLTA a changée retrouve celle du fichier
  rendre: (r, f) => { const l = r.l; if (f === 'contactDe' || f === 'contactVers') { const de = f === 'contactDe'; app.contrat.designations.delete('sertir|' + (de ? l.de : l.vers) + '|' + (de ? l.borneDe : l.borneVers)); return ecrireFil(l, f, ''); }
    return rendreChamp(l, f); } };
// le nom d'un champ qu'on règle, pour qui ne voit pas l'écran
const LIBELLES_CHAMPS = { contactDe: 'Contact à sertir, côté de', contactVers: 'Contact à sertir, côté vers', perm: 'Courant permanent' };
/* Ce qui se règle dans une ligne de liaison : le CONTACT de chaque bout (Automatique, puis les contacts de la table qui vont
   à sa cavité et à sa gauge) ; l'intensité mène au profil qui la donne. Le reste vient du fichier : rien. */
function editeurFil(r, f) {
  if (f === 'intensite') { const x = r.F().x; return { action: () => { if (x.al) choisirRepere(x.al.nom); else ficheHypotheses(); } }; }
  if (f === 'contactDe' || f === 'contactVers') { const F = r.F(), x = F[f === 'contactDe' ? 'de' : 'vers']; if (!x) return null;
    const auto = x.main ? x.auto : x.ref, xs = candidatsContact(F.jauge, x).filter(c => c !== auto); if (x.main && x.ref && !xs.includes(x.ref)) xs.unshift(x.ref);
    return { valeur: x.main ? x.ref : '', options: [['', 'Automatique' + (auto ? ' · ' + auto : '')], ...xs.map(c => [c, c])] }; }
  return null; }
/* Les contacts de la table (la norme des modules) qui vont à cette gauge — et à la taille et au sexe du plan, s'il les dit. */
function candidatsContact(jauge, x) { const T = normeDesModules(app.norme).contacts || [], vus = new Set();
  return T.filter(c => (c.jauge === '*' || jauge == null || +c.jauge === jauge) && (!x.taille || String(c.taille) === String(x.taille)) && (!x.sexe || c.sexe === x.sexe))
    .map(c => c.reference).filter(c => c && !vus.has(c) && vus.add(c)).slice(0, 40); }
/* Régler le contact d'un bout (un choix de VOLTA) : une entrée d'historique (`changerLiaison`, 08-sections) qui dit le bout,
   jamais le numéro du câble ; vide, l'automatique revient. Rien d'autre d'une liaison ne s'écrit ici. */
function ecrireFil(l, f, v) { if (f !== 'contactDe' && f !== 'contactVers') return false; const avant = l[f] == null ? '' : String(l[f]); if (avant === v) return false;
  if (!(app.cible && app.cible.type === 'bloc')) app.cible = { type: 'fil', l };
  const bout = f === 'contactDe' ? l.de + (l.borneDe ? ':' + l.borneDe : '') : l.vers + (l.borneVers ? ':' + l.borneVers : '');
  return changerLiaison(l, f, v === '' ? null : v, 'contact de ' + bout + ' : ' + (v || 'automatique')); }
/* Choisir une liaison : sa fiche à droite, son câble allumé ; sur un autre folio, on y va. */
function choisirLigneFil(l) { if (app.choisi) { app.choisi = null; peindre(); } app.cible = { type: 'fil', l };
  const ou = foliosDe(l); if (app.plan !== '*' && ou.length && !ou.includes(app.plan)) allerAuPlan(ou[0]);
  ouvrirInspecteur(); const w = filDe(l); if (w) allumerFil(w); marquerLignes(); }
/* (v86 — l'intégrateur, « une seule source » ; l'audit, B4 et B5) AJOUTER UNE LIAISON, C'EST CHANGER LE FICHIER : plus
   aucune ligne ne se crée ici (« + Liaison » puis Échap laissait une liaison vide, comptée partout et jusque dans la
   bibliothèque). Un geste resté ailleurs qui l'appelle encore dit simplement où le faire. */
function ajouterLiaison(de) { dire((de ? 'Un câble de plus pour ' + de : 'Une liaison de plus') + ' : elle s’ajoute dans votre fichier — VOLTA la lira en le rouvrant.'); return false; }
function nouvelleLiaison() { return ajouterLiaison(app.cible && app.cible.type === 'bloc' && !VT_A_POSER.test(app.cible.nom) ? app.cible.nom : ''); }

/* ---- LES REPÈRES : ce que les onglets Équipements, Disjoncteurs, Barrettes et Prises partagent ---- */
const genreDuRepere = nom => estCoupure(nom) ? 'coupure' : estBarrette(nom) ? 'barrette' : estDisjoncteur(nom) ? 'cb' : 'eqpt';
/* Les repères du contrat (hors renvois, masses et rails) et les barrettes à poser de chaque folio — sans rien calculer de
   leurs plans : l'onglet ne paie que ce qu'il montre. */
const reperes = () => memo('reperes', () => { const V = verite(), par = new Map();
  // les folios d'un repère : ceux du contrat tel qu'il se dessine (découpé par l'outil, ce sont les siens), comme `plansDuRepere`
  app.contrat.liaisons.forEach(l => [l.de, l.vers].forEach(r => { if (!r) return; const s = par.get(r) || par.set(r, new Set()).get(r); if (l.plan) s.add(l.plan); }));
  const out = reperesDe(V).filter(r => !estRenvoi(r) && !estMasse(r) && !estRail(r)).map(nom => ({ nom, k: nom, genre: genreDuRepere(nom), plans: [...(par.get(nom) || [])].sort(triNaturel) }));
  (plans().length ? plans() : ['*']).forEach(p => liaisonsDe(p).forEach(l => { if (l.origine === null && l.vers === l.aPoser && estRaccordAPoser(l))
    out.push({ nom: l.aPoser, k: l.aPoser + '@' + p, genre: 'barrette', plan: p === '*' ? '' : p, plans: p === '*' ? [] : [p], aPoser: true, sous: 'ajoutée par VOLTA sur ' + l.de + ':' + l.borneDe }); }));
  return out.sort((a, b) => triNaturel(a.nom, b.nom) || triNaturel(a.plan || '', b.plan || '')); });
/* Ce qu'un repère porte sans plan : ses connecteurs (lettre, part number, bornes), ses câbles, ses besoins. */
const baseRepere = nom => memo('base|' + nom, () => { const L = liaisonsDuRepere(nom), b = besoinsDeBarrette(nom, L), cs = estBornier(nom) ? [] : connecteursDe(nom, L).filter(c => c.nom);
  return { b, cs, cables: L.filter(l => l.de !== l.vers).length, pns: cs.length ? cs : [{ nom: '', pn: b.pn, bornes: null }] }; });
/* Et ce que ses plans en disent : chaque connecteur (le fautif), les contacts pris sur ce qu'il y a. */
function infoRepere(r) { return memo('rep|' + r.k, () => { const nom = r.nom;
  if (r.aPoser) { const L = liaisonsDe(r.plan || '*'), Q = (app.bible || []).some(e => e.module) ? remplirModules(besoinsDeBarrette(nom, L), app.norme, '') : null;
    return { cables: L.filter(l => (l.de === nom || l.vers === nom) && l.de !== l.vers).length, contacts: Q ? [Q.utilises, Q.contacts] : null, connecteurs: [], pns: [], Q }; }
  const B = baseRepere(nom), P = planDuRepere(nom), cav = new Map(P.cavites.map(c => [c.nom, c]));
  const connecteurs = B.cs.map(c => { const k = cav.get(c.nom); return { nom: c.nom, pn: c.pn, bornes: c.bornes, ko: !!(k && k.plan.verdicts.some(v => v.niveau === 'ko')), ref: k && k.plan.modules[0] ? k.plan.modules[0].reference : '' }; });
  let contacts = null;
  if (P.barrette) contacts = [P.barrette.plan.utilises, P.barrette.plan.contacts];
  else if (P.coupure) { const M = P.coupure.plan.modules[0]; contacts = [P.coupure.points.length, M ? M.module.contacts.length : null]; }
  else if (P.cavites.length) contacts = [P.cavites.reduce((n, c) => n + c.plan.utilises, 0), P.cavites.reduce((n, c) => n + c.plan.modules.reduce((m, M) => m + M.module.contacts.length, 0), 0)];
  return { cables: B.cables, contacts, connecteurs, pns: B.pns, b: B.b }; }); }
const nCablesDuRepere = r => r.aPoser ? infoRepere(r).cables : baseRepere(r.nom).cables;
/* La norme des connecteurs d'un équipement : celle de l'arrangement que chaque connecteur reçoit ; rien quand son part
   number n'est dans aucune norme embarquée (on ne sait pas : on ne met rien). */
const normesDuRepere = nom => memo('normes|' + nom, () => { const m = new Map();
  planDuRepere(nom).cavites.forEach(c => { const n = c.plan.famille ? nomDeFamille(app.norme, c.plan.famille) || c.plan.famille : ''; if (!n) return;
    (m.get(n) || m.set(n, []).get(n)).push(c.nom + ' · ' + (c.pn || 'sans part number') + ' → ' + (c.plan.reference || 'aucun arrangement')); });
  return [...m].map(([norme, cs]) => ({ norme, cs })); });
const dejaFait = nom => memo('deja|' + nom, () => { const I = indexReferences(); if (!I) return null; try { const c = candidatsDeReference(I, verite(), nom, 1)[0]; return c ? c : null; } catch (_) { return null; } });
const natureAuto = nom => { const q = lireRepere(nom), c = q && (q.codeLu || q.code); return q && q.num && CODES[c] ? CODES[c].nom : 'équipement'; };
// l'état d'un repère : ses points du contrôle, comptés (les problèmes d'abord) ; chacun dans la bulle
const etatRepere = nom => { const e = etatDuNom(nom);
  return { niveau: e.niveau || 'ok', mot: e.regler.length ? e.regler.length + INSECABLE + 'à régler' : e.voir.length ? e.voir.length + INSECABLE + 'à voir' : 'ok', bulle: [...e.regler, ...e.voir].map(motDeLaLigne).join('\n') }; };
/* Les colonnes que les onglets de repères partagent : le repère (en tête), ses problèmes (au bout), son folio (en plus). */
/* LE REPÈRE se lit (le retest est la source : un repère se change dans le fichier, « tout au même endroit ») ; celui d'une
   barrette que VOLTA a ajoutée est provisoire : « ajoutée » le dit, et « Lui donner son repère » — le même geste que la fiche
   et l'onglet Problèmes (08-controle, `poserLesBarrettes`) — lui donne celui que VOLTA propose. */
const COL_REPERE = { k: 'rep', t: 'Repère', cls: 'rc-c-rep', html: r => r.aPoser
    ? `<span class="rc-aposer">${luFichierT('rep', r.nom, { cls: 'rc-r aposer', titre: 'Barrette ajoutée par VOLTA (plusieurs câbles sur une borne) : son repère est provisoire' })}<small class="rc-ajout" data-bulle="${escA(majuscule(r.sous) + ' : plusieurs câbles sur une borne')}">ajoutée</small><button type="button" class="btn cuivre dense rc-poser" data-poser="1" data-bulle="${escA('Elle prend ' + prochainRepereVT(r) + ', le repère que VOLTA propose (la suite de la barrette la plus proche) — « Défaire » rend le provisoire')}">Lui donner son repère</button></span>`
    : luFichierT('rep', r.nom, { cls: 'rc-r' }),
  tri: r => r.nom, texte: r => r.nom + (r.aPoser ? ' (repère provisoire)' : '') };
// (« État », comme dans Liaisons, Câbles, Raccords : la case dit « 3 problèmes », « 1 à voir » ; tout va bien, elle se tait)
const COL_PROBLEMES = { k: 'etat', t: 'État', cls: 'rc-c-etat', html: r => { const e = etatRepere(r.nom); return etatHtml(e.niveau, e.mot, e.bulle); },
  tri: r => { const e = etatDuNom(r.nom); return -(e.niveau === 'ko' ? 10000 : 0) - 100 * e.regler.length - e.voir.length; }, texte: r => etatRepere(r.nom).mot, vide: r => !etatDuNom(r.nom).niveau };
const COL_FOLIO = { k: 'folio', t: 'Folio', cls: 'rc-c-folio', option: true, large: 2, html: r => r.plans.length ? `<span class="rc-folios">${esc(listeFolios(r.plans))}</span>` : rien, tri: r => r.plans[0] || '', texte: r => r.plans.join(' '), vide: r => !r.plans.length };
const surFolioRepere = r => app.plan === '*' || (r.plan ? r.plan === app.plan : r.plans.includes(app.plan));
const choisieRepere = r => !!app.cible && app.cible.type === 'bloc' && app.cible.nom === r.nom;
const ONGLET_REPERES = { portee: true, surFolio: surFolioRepere, exact: (r, f) => r.nom === f, choisie: choisieRepere, etat: r => etatDuNom(r.nom).niveau,
  choisir: r => choisirRepere(r.nom, r.plan), survol: r => survolRepere(r.nom) };
const PUCE_A_REPRENDRE = ['probleme', 'À reprendre', r => !!etatDuNom(r.nom).niveau, '', '', 'Un problème ou un point à voir'];

/* ---- ÉQUIPEMENTS (les équipements seuls : les disjoncteurs, barrettes et prises ont leur onglet) ---- */
const equipements = () => memo('eqpts', () => reperes().filter(r => r.genre === 'eqpt'));
const COLONNES_EQUIPEMENTS = [COL_REPERE,
  // (v86) la nature se lit dans le code du repère (le fichier) ; une nature dite à la main avant la v86 garde « manuel » et ↺
  { k: 'nature', t: 'Type', cls: 'rc-c-nature', html: r => { const d = natureDite(r.nom), q = lireRepere(r.nom), code = q && (q.codeLu || q.code);
      return `<span class="rc-nature">${luFichierT('nature', majuscule(natureDe(r.nom)), { titre: d ? 'Dit à la main ; le code du repère dit « ' + natureAuto(r.nom) + ' »' : 'Lu dans le code du repère' + (code ? ' (' + code + ')' : '') })}${d ? orig('main', 'Dit à la main avant la v86 : la nature se lit dans le code du repère, ↺ la rend') + rond('nature', 'celle que dit le code (' + natureAuto(r.nom) + ')') : ''}</span>`; },
    tri: r => natureDe(r.nom), texte: r => majuscule(natureDe(r.nom)) },
  { k: 'norme', t: 'Norme', cls: 'rc-c-norme', si: () => memo('eq-normes', () => reperes().some(r => r.genre === 'eqpt' && normesDuRepere(r.nom).length)), html: r => { const N = normesDuRepere(r.nom); return N.length ? `<span class="rc-norme" data-bulle="${escA(N.flatMap(n => n.cs).join('\n'))}">${N.map(n => esc(n.norme)).join('<i class="rc-pt">·</i>')}</span>` : rien; },
    tri: r => normesDuRepere(r.nom).map(n => n.norme).join(' '), texte: r => normesDuRepere(r.nom).map(n => n.norme).join(' · '), vide: r => !normesDuRepere(r.nom).length },
  COL_PROBLEMES,
  // (v86 : plus de « Désignation » à écrire — un nom en clair doublerait le fichier, la charte l'exclut)
  { k: 'pn', t: 'Part number', option: true, g: 'Ce qu’il est', html: r => { const I = baseRepere(r.nom);
      return `<span class="rc-pns">${I.pns.map(c => `<span class="rc-pnl">${I.pns.length > 1 ? `<i class="rc-cn">${esc(c.nom)}</i>` : ''}${luFichierT('pn:' + c.nom, c.pn, { cls: 'rc-pn' })}</span>`).join('')}</span>`; },
    tri: r => baseRepere(r.nom).pns.map(c => c.pn).join(' '), texte: r => baseRepere(r.nom).pns.map(c => c.pn).filter(Boolean).join(' ') },
  { k: 'connecteurs', t: 'Connecteurs', option: true, large: 1, g: 'Ce qu’il est', html: r => { const I = infoRepere(r); return I.connecteurs.length ? `<span class="rc-cnx">${I.connecteurs.map(c => `<i class="${c.ko ? 'ko' : ''}" data-bulle="${escA((c.pn || 'sans part number') + (c.ref ? ' · ' + c.ref : '') + ' · ' + pluriel(c.bornes.length, 'borne') + (c.ko ? ' — aucun arrangement ne convient' : ''))}">${esc(c.nom)}</i>`).join('')}</span>` : rien; },
    tri: r => infoRepere(r).connecteurs.length, texte: r => infoRepere(r).connecteurs.map(c => c.nom).join(' '), vide: r => !infoRepere(r).connecteurs.length },
  { k: 'cables', t: 'Câbles', cls: 'rc-c-n', option: true, large: 1, g: 'Ce qu’il porte', html: r => chiffre(`<b class="rc-n">${nCablesDuRepere(r)}</b>`), tri: nCablesDuRepere, texte: r => String(nCablesDuRepere(r)) },
  { k: 'contacts', t: 'Contacts', cls: 'rc-c-n', option: true, large: 1, g: 'Ce qu’il porte', html: r => { const c = infoRepere(r).contacts; return c ? fraction(c[0], c[1] == null ? '?' : c[1]) : rien; },
    tri: r => (infoRepere(r).contacts || [-1])[0], texte: r => { const c = infoRepere(r).contacts; return c ? c[0] + ' / ' + (c[1] == null ? '?' : c[1]) : ''; }, vide: r => !infoRepere(r).contacts },
  COL_FOLIO,
  { k: 'deja', t: 'Déjà fait', cls: 'rc-c-n', option: true, si: () => !!indexReferences(), html: r => { const c = dejaFait(r.nom); return c ? `<span class="rc-deja" data-bulle="${escA(c.repere + ' de ' + c.harness)}"><b class="rc-n">${Math.round(c.taux * 100)}</b><i>%</i></span>` : rien; },
    tri: r => { const c = dejaFait(r.nom); return c ? c.taux : -1; }, texte: r => { const c = dejaFait(r.nom); return c ? Math.round(c.taux * 100) + ' %' : ''; } }];
/* (v86, une seule source) TOUT CE QUE CET ONGLET MONTRE VIENT DU FICHIER — le repère, sa nature (le code du repère), ses part
   numbers : rien ne s'y écrit, un équipement ne s'y ajoute ni ne s'y renomme (c'est changer le fichier). Une nature dite à
   la main avant la v86 se rend d'un ↺. */
const EQUIPEMENTS = { ...ONGLET_REPERES, cherche: 'Chercher : repère, type…',
  colonnes: COLONNES_EQUIPEMENTS, lignes: equipements, puces: () => [PUCE_A_REPRENDRE],
  editeur: () => null, ecrire: () => false,
  rendre: (r, f) => { const nom = r.nom; if (f !== 'nature' || !natureDite(nom)) return false; histPush('nature de ' + nom); designer(CLE_NATURE(nom), ''); apresEdition();
    dire(nom + ' : la nature que dit son code revient (' + natureAuto(nom) + ').', false, typeof defaire === 'function' ? { geste: 'Défaire', faire: defaire } : undefined); return true; } };
/* Choisir un repère depuis une ligne : son folio, son bloc, sa fiche — sans toucher au filtre de l'onglet. */
function choisirRepere(nom, plan) { const P = plans();
  if (plan && plan !== app.plan && P.includes(plan)) allerAuPlan(plan);
  else if (!plan) { const ou = plansDuRepere(nom); if (app.plan !== '*' && ou.length && !ou.includes(app.plan)) allerAuPlan(ou[0]); }
  app.choisi = nom; app.cible = { type: 'bloc', nom }; peindre(); ouvrirInspecteur(); rallumer(); }
function survolRepere(nom) { if (app.dessin && app.dessin.compDe.has(nom)) allumerBloc(nom); else if (barretteAPoser(nom)) allumerBarretteAPoser(nom); }

/* ---- DISJONCTEURS : le calibre retenu, son verdict, le meilleur ----------------- */
const disjoncteurs = () => memo('disj', () => reperes().filter(r => r.genre === 'cb'));
function infoDisj(nom) { return memo('dj|' + nom, () => { const d = disjonctionDe(nom), H = H_(), V = verite();
  const I = d.profil && d.profil.perm && d.profil.perm.i > 0 ? d.profil.perm.i : 0, courts = d.points.filter(p => p.t !== Infinity && p.i > 0);
  // (v86) la pire chute de ses lignes, à l'instant le plus dur — le permanent ou une pointe, contre ce qui est admis à cet instant
  let pire = null; try { chutesDepuis(app.norme, V, nom, I, H, courts).forEach(c => [{ dU: c.dU, admis: c.admis, pointe: null }, ...(c.pointes || []).map(p => ({ dU: p.dU, admis: p.admis, pointe: p }))].forEach(k => {
    if (k.dU == null) return; const q = k.admis ? k.dU / k.admis : k.dU / 100; if (!pire || q > pire.q) pire = { ...c, dU: k.dU, admis: k.admis, pointe: k.pointe, trop: k.admis != null && k.dU > k.admis + 1e-9, q }; })); } catch (_) { }
  const ok = d.fils.filter(f => f.verdict !== 'fil' && f.verdict !== 'calibre' && f.protege !== false).length;
  const pointe = d.points.find(p => p.t !== Infinity) || null, perm = etatsDuProfil(d.profil).find(e => e.k === 'perm');
  const o = origineDuCalibre(nom, d);
  return { d, pire, ok, n: d.fils.length, pointe, perm: perm && perm.i > 0 ? perm.i : null, pn: pnDuRepere(nom), origine: o.origine, rendu: o.calRetest ? 'celui de votre fichier (' + amperes(o.calRetest) + ')' : 'l’automatique' + (d.calibreIdeal ? ' (' + amperes(d.calibreIdeal) + ')' : '') }; }); }
/* LE VERDICT du calibre retenu, en TROIS MOTS — passe, juste, déclenche —, ceux de la fiche, du cadran, des problèmes et du
   dossier (v73, l'ingénieur n° 8 : « tient », « touche la courbe » ici, « passe » là ; la table unique est celle du moteur,
   `VERDICTS_CALIBRE`, 09-disjoncteurs) ; « touche la courbe », « sans la marge » vont dans la bulle, avec le pourquoi
   chiffré du moteur (`pourquoiDuCalibre`) et chaque état du profil contre la courbe. */
const MOTS_TROIS = { passe: { mot: 'ne disjoncte pas', etat: 'ok', bulle: 'Il ne disjoncte pas : chaque point du profil reste du côté de sa courbe où il ne coupe pas.' }, juste: { mot: 'disjoncte', etat: 'ko', bulle: 'Il disjoncte.' }, declenche: { mot: 'disjoncte', etat: 'ko', bulle: 'Il disjoncte.' } };
const verdictTrois = g => { if (typeof verdictDeCalibre === 'function') { try { return verdictDeCalibre(g); } catch (_) { return null; } }
  if (!g || g.valide == null) return null; return g.valide === false ? MOTS_TROIS.declenche : (g.marge != null ? g.marge : g.avecMarge) ? MOTS_TROIS.passe : MOTS_TROIS.juste; };
function verdictDuCalibre(d) { if (!d.calibre) return { n: '', mot: '' };
  if (d.sansProfil) return { n: 'att', mot: 'sans profil', bulle: 'Le profil de charge est à renseigner : sans lui, le calibre ne se juge pas' };
  if (d.sansCourbe) return { n: '', mot: '' };
  const v = verdictTrois(d) || (!d.valide ? MOTS_TROIS.declenche : d.serre ? MOTS_TROIS.juste : MOTS_TROIS.passe);
  let pq = null; try { pq = typeof pourquoiDuCalibre === 'function' ? pourquoiDuCalibre(app.norme, d, d.calibre) : null; } catch (_) { pq = null; }
  const motPoint = p => p.ok === false ? 'disjoncte' : 'ne disjoncte pas';
  const etats = d.points.filter(p => p.ok != null).map(p => `${majuscule(p.nom || 'état')} ${amperes(p.i)}${p.t === Infinity ? ' en permanent' : ' pendant ' + secondes(p.t)} : ${motPoint(p)}`).join('\n');
  return { n: v.etat, mot: v.mot, bulle: [pq ? majuscule(pq.phrase) + '.' : v.bulle, etats].filter(Boolean).join('\n') }; }
/* Le calibre que l'INSTALLATION écrit (son part number, celui du fichier quand on l'a changé ici) : à côté du retenu, barré
   quand VOLTA en retient un autre (l'ingénieur v73 : « le 10 A du retest est invisible ici, alors que la fiche l'écrit
   barré ») ; la colonne se dit « Installation » (v74), la clé `retest` reste. */
const calibreDuRetest = r => { const D = infoDisj(r.nom), o = origineDuCalibre(r.nom, D.d); return o.calRetest || D.d.pn || null; };
const COLONNES_DISJ = [COL_REPERE,
  /* (v86 — l'intégrateur, G8 : « le calibre écrit vient du fichier : plus de choix libre ») LE CALIBRE RETENU SE LIT, sa bulle
     dit pourquoi en ampères ; celui de votre fichier se change dans votre fichier (un double-clic le dit). Un seul geste, celui
     de la fiche : la carte de décision quand le calibre du fichier disjoncte (« Passer en 15 A », `deciderCalibre`), sinon la
     proposition justifiée de VOLTA (« Retenir le 7,5 A », `propositionDuCalibre`) — elle part dans l'Excel corrigé, son message
     propose « Défaire » ; un calibre retenu à la main par une version d'avant garde « manuel », et la proposition le rend. */
  { k: 'calibre', t: 'Calibre', cls: 'rc-c-mesure', html: r => { const D = infoDisj(r.nom), d = D.d, main = D.origine === 'main', propose = typeof propositionNonEcrite === 'function' && propositionNonEcrite(d);
      const essai = f => { try { return f(); } catch (_) { return null; } }, v = verdictDuCalibre(d);
      const dec = propose && typeof decisionEnMots === 'function' ? essai(() => decisionEnMots(r.nom, d)) : null, p = !dec && typeof propositionDuCalibre === 'function' ? essai(() => propositionDuCalibre(r.nom, d)) : null;
      const deFichier = d.pn > 0 && d.calibre > 0 && Math.abs(d.pn - d.calibre) < 1e-9 && !main && !(typeof pnDeVolta === 'function' && pnDeVolta(r.nom));
      const tete = main ? 'Retenu à la main par une version d’avant' : propose ? 'Proposé par VOLTA : votre fichier garde le sien tant que vous ne l’acceptez pas' : deFichier ? 'Celui de votre fichier : il ne disjoncte pas, VOLTA le garde — à changer dans votre fichier' : 'Le plus petit qui ne disjoncte pas, écrit par VOLTA : il ira dans l’Excel corrigé';
      const nf = p ? p.fils.length : 0, geste = dec ? `<button type="button" class="btn cuivre dense rc-decider" data-decider="1" data-bulle="${escA('Écrit dans l’Excel corrigé : ' + amperes(d.calibre) + ', et les câbles qu’il demande — « Défaire » rend le tout')}">${esc('Passer en ' + amperes(d.calibre))}</button>`
        : p ? `<button type="button" class="btn cuivre dense rc-decider" data-proposer="1" data-bulle="${escA((p.main ? (p.fichier ? 'Reprend le calibre de votre fichier' : 'Rend le calibre au calcul de VOLTA') : 'Le plus petit qui ne disjoncte pas — il ira dans l’Excel corrigé' + (nf ? ', et ' + pluriel(nf, 'câble') + ' grossi' + (nf > 1 ? 's' : '') : '')) + (p.m && p.m.bulle ? '.\n' + p.m.bulle : '') + '\n« Défaire » le reprend.')}">${esc('Retenir le ' + amperes(p.cal) + (nf ? ' et grossir ' + (nf > 1 ? 'les ' + nf + ' câbles' : 'le câble') : ''))}</button>` : '';
      const bulle = [tete, v.bulle || ''].filter(Boolean).join('\n'), valeur = d.calibre ? `<b class="rc-n rc-fort">${fmt(d.calibre, 2)}</b>` : '';
      // (celui de votre fichier est une case du fichier : un double-clic dit où le changer ; celui de VOLTA se lit, sa bulle dit pourquoi)
      const caseCal = deFichier ? luFichier('calibre', valeur, { titre: bulle }) : `<span${d.calibre ? ` data-bulle="${escA(bulle)}"` : ''}>${valeur}</span>`;
      return `<span class="rc-mesure">${chiffre(caseCal, d.calibre ? 'A' : '')}`
        + `${main ? orig('main', 'Retenu à la main par une version d’avant : la proposition de VOLTA le rend') + (p ? '' : rond('calibre', D.rendu)) : propose ? '<i class="rc-o rc-propose" data-bulle="VOLTA le retient ; votre fichier garde le sien tant que vous n’acceptez pas la proposition — elle part alors dans l’Excel corrigé">proposé</i>' : ''}${geste}</span>`; },
    tri: r => infoDisj(r.nom).d.calibre || 0, texte: r => { const d = infoDisj(r.nom).d; return d.calibre ? amperes(d.calibre) : ''; } },
  { k: 'retest', t: 'Votre fichier', cls: 'rc-c-mesure', html: r => { const c = calibreDuRetest(r), d = infoDisj(r.nom).d; if (!c) return rien; const autre = d.calibre && c !== d.calibre;
      return `<span class="rc-mesure rc-retest${autre ? ' autre' : ''}" data-bulle="${escA('Votre fichier porte ' + (pnDuRepere(r.nom) || 'son part number') + (autre ? ', un ' + amperes(c) + ' : VOLTA retient le ' + amperes(d.calibre) + ' (la fiche dit pourquoi, en ampères)' : ''))}">${autre ? chiffre(`<s class="rc-n">${fmt(c, 2)}</s>`, 'A') : chiffre(`<b class="rc-n">${fmt(c, 2)}</b>`, 'A')}</span>`; },
    // le calibre du fichier ne se répète pas quand c'est celui que VOLTA retient : la colonne paraît dès qu'il en conteste un
    tri: r => calibreDuRetest(r) || 0, texte: r => { const c = calibreDuRetest(r); return c ? amperes(c) : ''; }, vide: r => { const c = calibreDuRetest(r), d = infoDisj(r.nom).d; return !c || !d.calibre || c === d.calibre; } },
  { k: 'verdict', t: 'Verdict', cls: 'rc-c-etat', html: r => { const v = verdictDuCalibre(infoDisj(r.nom).d); return etatHtml(v.n, v.mot, v.bulle); }, tri: r => rangEtat(verdictDuCalibre(infoDisj(r.nom).d).n), texte: r => verdictDuCalibre(infoDisj(r.nom).d).mot },
  COL_PROBLEMES,
  { k: 'ideal', t: 'Meilleur', cls: 'rc-c-mesure', option: true, html: r => { const d = infoDisj(r.nom).d; if (!d.calibreIdeal) return rien; const pq = d.meilleur && d.meilleur.pourquoi;
      return `<span class="rc-mesure"${pq ? ` data-bulle="${escA(majuscule(pq))}"` : ''}>${chiffre(`<i class="rc-etoile" aria-label="le meilleur">${ico('etoile')}</i><b class="rc-n">${fmt(d.calibreIdeal, 2)}</b>`, 'A')}</span>`; },
    // (v86, G8 : plus de « Retenir » libre ici — la proposition de VOLTA, quand il y en a une, est dans la case Calibre)
    tri: r => infoDisj(r.nom).d.calibreIdeal || 0, texte: r => { const d = infoDisj(r.nom).d; return d.calibreIdeal ? amperes(d.calibreIdeal) : ''; } },
  { k: 'pn', t: 'Part number', option: true, html: r => luFichierT('pn:', infoDisj(r.nom).pn, { cls: 'rc-pn' }), tri: r => infoDisj(r.nom).pn, texte: r => infoDisj(r.nom).pn },
  { k: 'profil', t: 'Permanent', cls: 'rc-c-mesure', w: 72, option: true, large: 1, html: r => { const D = infoDisj(r.nom);
      return `<span class="rc-mesure">${chiffre(val('perm', D.perm != null ? fmt(D.perm, 2) : '', { cls: 'rc-n', ph: 'A', titre: 'Le courant permanent du profil de charge — double-clic pour l’écrire' }), D.perm != null ? 'A' : '')}${D.pointe ? `<small class="rc-pointe">pointe ${esc(amperes(D.pointe.i))} · ${esc(secondes(D.pointe.t))}</small>` : ''}</span>`; },
    tri: r => infoDisj(r.nom).perm ?? -1, texte: r => { const D = infoDisj(r.nom); return (D.perm != null ? amperes(D.perm) : '') + (D.pointe ? ' pointe ' + amperes(D.pointe.i) + ' ' + secondes(D.pointe.t) : ''); } },
  { k: 'cables', t: 'Câbles protégés', cls: 'rc-c-n', option: true, large: 1, html: r => { const D = infoDisj(r.nom); return D.n ? fraction(D.ok, D.n, D.ok < D.n ? 'ko' : '') : rien; },
    tri: r => { const D = infoDisj(r.nom); return D.n ? D.ok / D.n : -1; }, texte: r => { const D = infoDisj(r.nom); return D.ok + ' / ' + D.n; }, vide: r => !infoDisj(r.nom).n },
  // la pire chute de ses lignes, dessinée comme celle d'une liaison (l'anneau, « sur 2 V », « pointe ») — F1, F2
  { k: 'chute', t: 'Pire chute', cls: 'rc-c-mesure', option: true, large: 2, vide: r => !infoDisj(r.nom).pire, html: r => { const p = infoDisj(r.nom).pire; if (!p) return rien;
      const niv = p.trop ? (p.reel ? 'ko' : 'att') : '', s = p.pointe;
      const bulle = majuscule(p.mots || '') + (s ? ', en pointe (' + (s.nom || 'pointe') + ', ' + amperes(s.i) + ' pendant ' + secondes(s.t) + ')' : ', au permanent') + ' : ' + volts(p.dU) + (p.admis != null ? ' sur ' + volts(p.admis) + ' admis' + (s && s.intermittent ? ' en intermittent' : '') + ' (' + pourcentDe(p.q) + ')' : '') + (p.reel ? '.' : ', sur des longueurs supposées.');
      return `<span class="rc-mesure rc-chute" data-bulle="${escA(bulle)}">${anneau(p.admis ? p.q : null, niv)}${chiffre(`<b class="rc-n">${voltsN(p.dU)}</b>`, 'V', niv)}<span class="rc-adm">${p.admis != null ? 'sur ' + voltsN(p.admis) + INSECABLE + 'V' : ''}</span>${motInstant(s ? 'pointe' : '')}</span>`; },
    tri: r => (infoDisj(r.nom).pire || { q: -1 }).q, texte: r => { const p = infoDisj(r.nom).pire; return p ? voltsN(p.dU) + ' V' + (p.admis != null ? ' sur ' + voltsN(p.admis) + ' V' : '') + (p.pointe ? ' (pointe)' : '') : ''; } },
  { k: 'courbe', t: 'Courbe', option: true, large: 2, html: r => { const d = infoDisj(r.nom).d; return `<span class="rc-mot">${esc(d.famille ? d.famille.famille : d.courbe || 'par défaut')}</span>`; }, tri: r => { const d = infoDisj(r.nom).d; return d.famille ? d.famille.famille : d.courbe || ''; }, texte: r => { const d = infoDisj(r.nom).d; return d.famille ? d.famille.famille : d.courbe || ''; } },
  COL_FOLIO];
const DISJONCTEURS = { ...ONGLET_REPERES, colonnes: COLONNES_DISJ, lignes: disjoncteurs, cherche: 'Chercher : repère, calibre…',
  choisir: r => choisirRepere(r.nom),
  puces: () => [PUCE_A_REPRENDRE, ['sansprofil', 'Sans profil', r => !!infoDisj(r.nom).d.sansProfil, '', '', 'Le profil de charge est à renseigner']],
  // ce qui s'écrit ici : le PROFIL DE CHARGE (ce qu'il alimente consomme — une donnée que VOLTA demande, pas une case du
  // fichier) ; le repère et le part number viennent du fichier, le calibre est le calcul de VOLTA
  editeur: (r, f) => { const D = infoDisj(r.nom);
    if (f === 'perm') return { valeur: D.perm != null ? fmt(D.perm, 2) : '', ph: 'A', aide: 'le courant permanent, en ampères' };
    return null; },
  ecrire: (r, f, v) => { const nom = r.nom;
    if (f === 'perm') { const x = v ? nombreLu(v) : null; if (v && x == null) { dire('Écrivez un courant en ampères (3,5).', true); return false; } return ecrireCharge(nom, c => { c.perm = { ...(c.perm || {}), i: x }; }, 'profil de charge de ' + nom); }
    return false; },
  rendre: (r, f) => { if (f !== 'calibre') return false; rendreCalibre(r.nom); return true; } };
/* (v86, l'intégrateur, G8 : « le calibre écrit vient du fichier ») LE CHOIX LIBRE D'UN CALIBRE EST PARTI : la case ne déroule
   plus toute la gamme. Le seul geste qui écrit un calibre est LA PROPOSITION JUSTIFIÉE DE VOLTA, la même que la fiche
   (08-disjoncteurs, `propositionDuCalibre`) : « Retenir le 7,5 A » (le plus petit qui ne disjoncte pas, sous `parVolta` : il
   part dans l'Excel corrigé), ou, pour un calibre retenu à la main par une version d'avant, son retour au calcul de VOLTA ; le
   message propose « Défaire ». Quand la carte de décision existe (le calibre du fichier disjoncte), son geste « Passer en … ». */
function accepterLeCalibre(nom) { const d = disjonctionDe(nom), p = typeof propositionDuCalibre === 'function' ? propositionDuCalibre(nom, d) : null; if (!p) return false;
  if (p.main) { rendreCalibre(nom); const d2 = disjonctionDe(nom); dire(nom + ' : ' + (d2.calibre ? amperes(d2.calibre) + ', ' : '') + (p.fichier ? 'celui de votre fichier.' : 'le calcul de VOLTA.'), false, typeof defaire === 'function' ? { geste: 'Défaire', faire: () => defaire() } : undefined); return true; }
  return (typeof parVolta === 'function' ? parVolta : f => f())(() => deciderCalibre(nom, p.cal)); }
function ecrireCharge(nom, f, quoi) { const avant = chargeDe(nom), c = JSON.parse(JSON.stringify(avant || {})); f(c);
  if (JSON.stringify(c) === JSON.stringify(avant || {})) return false; histPush(quoi); if (!app.contrat.charges) app.contrat.charges = new Map(); app.contrat.charges.set(nom, c); apresEdition(); return true; }

/* ---- BARRETTES : la norme, le module, ce qui reste libre ------------------------ */
const barrettes = () => memo('barr', () => reperes().filter(r => r.genre === 'barrette'));
function infoBarrette(r) { return memo('bar|' + r.k, () => { if (r.aPoser) { const I = infoRepere(r); return { Q: I.Q, cables: I.cables }; }
  const P = planDuRepere(r.nom); return { Q: P.barrette ? P.barrette.plan : null, main: P.barrette ? P.barrette.main : '', cables: infoRepere(r).cables }; }); }
/* Le prochain repère libre d'une barrette à poser : la suite de la barrette du contrat la plus proche de l'équipement
   qu'elle dédouble (102CB1 → 667VT21 → 667VT22), sinon le numéro de cet équipement (102VT1). */
function prochainRepereVT(r) { const pris = new Set(reperesDe(verite())), sur = /^ajoutée par VOLTA sur (\S+?):/.exec(r.sous || ''), q0 = sur ? lireRepere(sur[1]) : null, n0 = q0 && q0.num ? +q0.num : 0;
  const vts = [...pris].filter(x => estBarrette(x) && !VT_A_POSER.test(x)).map(lireRepere).filter(q => q && q.num && /^\d+$/.test(q.suffixe));
  const num = vts.length ? vts.slice().sort((a, b) => Math.abs(+a.num - n0) - Math.abs(+b.num - n0))[0].num : q0 && q0.num ? q0.num : '1';
  let k = Math.max(0, ...vts.filter(q => q.num === num).map(q => +q.suffixe)) + 1; while (pris.has(num + 'VT' + k)) k++; return num + 'VT' + k; }
const COLONNES_BARRETTES = [COL_REPERE,
  { k: 'norme', t: 'Norme', cls: 'rc-c-norme', html: r => { const Q = infoBarrette(r).Q; if (!Q) return rien; const n = Q.famille ? nomDeFamille(app.norme, Q.famille) : '';
      return r.aPoser ? `<span class="rc-norme">${esc(n)}</span>` : valT('norme', n, { cls: 'rc-norme', ph: '—', titre: 'Un choix de VOLTA — double-clic : Automatique, ou une autre norme' }); },
    tri: r => (infoBarrette(r).Q || {}).famille || '', texte: r => { const Q = infoBarrette(r).Q; return Q && Q.famille ? nomDeFamille(app.norme, Q.famille) : ''; } },
  { k: 'module', t: 'Module', cls: 'rc-c-id', html: r => { const B = infoBarrette(r); if (!B.Q) return rien;
      return r.aPoser ? `<span class="rc-id">${esc(B.Q.reference || '')}</span>` : valT('module', B.Q.reference || '', { cls: 'rc-id', ph: 'aucun module', titre: (B.main ? 'Manuel' : 'Automatique : le plus petit module de la norme qui loge ces potentiels') + ' — double-clic : Automatique, ou un autre module' }) + (B.main ? orig('main') + rond('module', 'le choix automatique') : ''); },
    tri: r => (infoBarrette(r).Q || {}).reference || '', texte: r => (infoBarrette(r).Q || {}).reference || '' },
  { k: 'libres', t: 'Contacts libres', cls: 'rc-c-n', html: r => { const Q = infoBarrette(r).Q; return Q && Q.modules.length ? fraction(Q.contacts - Q.utilises, Q.contacts) : rien; },
    tri: r => { const Q = infoBarrette(r).Q; return Q ? Q.contacts - Q.utilises : -1; }, texte: r => { const Q = infoBarrette(r).Q; return Q ? (Q.contacts - Q.utilises) + ' / ' + Q.contacts : ''; } },
  COL_PROBLEMES,
  { k: 'potentiels', t: 'Potentiels', cls: 'rc-c-n', option: true, large: 1, html: r => { const Q = infoBarrette(r).Q; return Q ? chiffre(`<b class="rc-n">${Q.potentiels}</b>`) : rien; }, tri: r => (infoBarrette(r).Q || { potentiels: -1 }).potentiels, texte: r => String((infoBarrette(r).Q || {}).potentiels ?? ''), vide: r => !infoBarrette(r).Q },
  { k: 'cables', t: 'Câbles', cls: 'rc-c-n', option: true, large: 1, html: r => chiffre(`<b class="rc-n">${infoBarrette(r).cables}</b>`), tri: r => infoBarrette(r).cables, texte: r => String(infoBarrette(r).cables) },
  COL_FOLIO];
const BARRETTES = { ...ONGLET_REPERES, colonnes: COLONNES_BARRETTES, lignes: barrettes, cherche: 'Chercher : repère, module…',
  puces: () => [PUCE_A_REPRENDRE, ['aposer', 'Repère provisoire', r => r.aPoser, '', '', 'Les barrettes que VOLTA a ajoutées (plusieurs câbles sur une borne), au repère provisoire']],
  // ses choix de VOLTA : la norme et le module (Automatique, ou Manuel) ; son repère vient du fichier — provisoire, celui
  // d'une barrette ajoutée se donne d'un geste (« Lui donner son repère »)
  editeur: (r, f) => { const B = infoBarrette(r);
    if (r.aPoser || !B.Q) return null;
    if (f === 'module') { const b = planDuRepere(r.nom).barrette.besoins, vs = (B.Q.famille ? [B.Q.famille] : famillesDeModules(app.norme)).flatMap(fa => variantesQuiLogent(b, app.norme, fa).slice(0, 12));
      return { valeur: B.main ? B.Q.reference : '', options: [['', 'Automatique'], ...vs.map(m => [m.reference, m.variante + ' · ' + m.reference])] }; }
    if (f === 'norme') return { valeur: '', options: [['', 'Automatique'], ...famillesDeModules(app.norme).map(fa => [fa, nomDeFamille(app.norme, fa)])] };
    return null; },
  ecrire: (r, f, v) => { if (f === 'module' || f === 'norme') { histPush((f === 'module' ? 'module de ' : 'norme de ') + r.nom); designer(r.nom, v); apresEdition(); return true; } return false; },
  rendre: (r, f) => { if (f !== 'module') return false; histPush('choix automatique'); designer(r.nom, ''); apresEdition(); return true; } };

/* ---- PRISES : la norme, l'arrangement, les contacts pris ------------------------- */
const prises = () => memo('prises', () => reperes().filter(r => r.genre === 'coupure'));
function infoPrise(nom) { return memo('pr|' + nom, () => { const P = planDuRepere(nom).coupure; if (!P) return null; const Q = P.plan, M = Q.modules[0];
  const am = Q.fils.filter(x => x.f.amont).map(x => x.f), av = Q.fils.filter(x => !x.f.amont).map(x => x.f);
  const hab = (cote, fils) => fils.length ? memo('habp|' + nom + '|' + cote, () => habillage(app.norme, fils, app.contrat.raccords.get(nom + '|' + cote), P.besoins.pn, Q.reference)) : null;
  return { P, Q, M, pris: P.points.length, total: M ? M.module.contacts.length : null, fiche: hab('fiche', am), embase: hab('embase', av) }; }); }
const motRaccord = h => !h ? '' : h.raccord === 'aucun' ? 'sans raccord' : (h.designation || h.raccord);
const COLONNES_PRISES = [COL_REPERE,
  { k: 'norme', t: 'Norme', cls: 'rc-c-norme', html: r => { const I = infoPrise(r.nom); return I ? valT('norme', I.Q.famille ? nomDeFamille(app.norme, I.Q.famille) : '', { cls: 'rc-norme', ph: '—', titre: 'Un choix de VOLTA — double-clic : Automatique, ou une autre norme' }) : rien; },
    tri: r => (infoPrise(r.nom) || { Q: {} }).Q.famille || '', texte: r => { const I = infoPrise(r.nom); return I && I.Q.famille ? nomDeFamille(app.norme, I.Q.famille) : ''; } },
  { k: 'arrangement', t: 'Arrangement', cls: 'rc-c-id', html: r => { const I = infoPrise(r.nom); return I ? valT('arrangement', I.Q.reference, { cls: 'rc-id', ph: 'aucun arrangement', titre: (I.Q.main ? 'Manuel' : 'Automatique : le plus petit de la norme qui loge ces contacts') + ' — double-clic : Automatique, ou un autre arrangement' }) + (I.Q.main ? orig('main') + rond('arrangement', 'le choix automatique') : '') : rien; },
    tri: r => (infoPrise(r.nom) || { Q: {} }).Q.reference || '', texte: r => (infoPrise(r.nom) || { Q: {} }).Q.reference || '' },
  { k: 'contacts', t: 'Contacts', cls: 'rc-c-n', html: r => { const I = infoPrise(r.nom); return I ? fraction(I.pris, I.total == null ? '?' : I.total) : rien; }, tri: r => (infoPrise(r.nom) || { pris: -1 }).pris, texte: r => { const I = infoPrise(r.nom); return I ? I.pris + ' / ' + (I.total ?? '?') : ''; } },
  COL_PROBLEMES,
  // (v74, l'ingénieur v73 : « le part number complet de la prise, le récapitulatif ne l'a pas ») : au choix ; il se lit (v86)
  { k: 'pn', t: 'Part number', option: true, large: 1, html: r => luFichierT('pn:', baseRepere(r.nom).b.pn || '', { cls: 'rc-pn' }), tri: r => baseRepere(r.nom).b.pn || '', texte: r => baseRepere(r.nom).b.pn || '', vide: r => !baseRepere(r.nom).b.pn },
  // (la charte : « partie mobile », « partie fixe » — jamais « fiche / embase » dans les mots du lecteur ; les clés restent)
  { k: 'sexe', t: 'Sexe mobile · fixe', option: true, large: 2, html: r => { const I = infoPrise(r.nom); if (!I) return rien; const s = I.Q.sexe || sexeChoisi(r.nom); return I.Q.tableContacts ? valT('sexe', s === 'M' ? 'mâle · femelle' : s === 'F' ? 'femelle · mâle' : '', { ph: 'à choisir', titre: 'Le sexe des contacts de la partie mobile, puis de la partie fixe — double-clic pour le changer' }) : rien; },
    tri: r => (infoPrise(r.nom) || { Q: {} }).Q.sexe || '', texte: r => (infoPrise(r.nom) || { Q: {} }).Q.sexe || '', vide: r => { const I = infoPrise(r.nom); return !(I && I.Q.tableContacts); } },
  { k: 'fiche', t: 'Raccord partie mobile', option: true, html: r => { const I = infoPrise(r.nom); return I && I.fiche ? `<span class="rc-id">${esc(motRaccord(I.fiche))}</span>` : rien; }, tri: r => motRaccord((infoPrise(r.nom) || {}).fiche), texte: r => motRaccord((infoPrise(r.nom) || {}).fiche) },
  { k: 'embase', t: 'Raccord partie fixe', option: true, html: r => { const I = infoPrise(r.nom); return I && I.embase ? `<span class="rc-id">${esc(motRaccord(I.embase))}</span>` : rien; }, tri: r => motRaccord((infoPrise(r.nom) || {}).embase), texte: r => motRaccord((infoPrise(r.nom) || {}).embase) },
  { ...COL_FOLIO, large: 1 }];
const PRISES = { ...ONGLET_REPERES, colonnes: COLONNES_PRISES, lignes: prises, cherche: 'Chercher : repère, norme…',
  choisir: r => choisirRepere(r.nom),
  puces: () => [PUCE_A_REPRENDRE],
  // ses choix de VOLTA : la norme, l'arrangement, le sexe des contacts (Automatique, ou Manuel) ; le repère et le part number
  // viennent du fichier
  editeur: (r, f) => { const I = infoPrise(r.nom); if (!I) return null;
    if (f === 'arrangement') return { valeur: I.Q.main ? I.Q.reference : '', options: [['', 'Automatique'], ...arrangementsQuiLogent(I.P.points, app.norme, I.Q.visee || I.Q.famille).slice(0, 12).map(m => [m.reference, m.variante + ' · ' + m.reference])] };
    if (f === 'norme') return { valeur: '', options: [['', 'Automatique'], ...famillesDeModules(app.norme, 'connecteur').map(fa => [fa, nomDeFamille(app.norme, fa)])] };
    if (f === 'sexe') return I.Q.tableContacts ? { valeur: sexeChoisi(r.nom), options: [['', 'Automatique'], ['F', 'Partie mobile femelle · partie fixe mâle'], ['M', 'Partie mobile mâle · partie fixe femelle']] } : null;
    return null; },
  ecrire: (r, f, v) => { if (f === 'arrangement' || f === 'norme') { histPush((f === 'norme' ? 'norme de ' : 'arrangement de ') + r.nom); designer(r.nom, v); apresEdition(); return true; }
    if (f === 'sexe') { if (v === sexeChoisi(r.nom)) return false; histPush('sexe des contacts de ' + r.nom); if (v) app.contrat.sexes.set(r.nom, v); else app.contrat.sexes.delete(r.nom); apresEdition(); return true; }
    return false; },
  rendre: (r, f) => { if (f !== 'arrangement') return false; histPush('choix automatique'); designer(r.nom, ''); apresEdition(); return true; } };

/* ---- CÂBLES (un type de câble par ligne) ---------------------------------------- */
const cables = () => memo('cables', () => { const H = H_(), m = new Map();
  verite().forEach(l => { if (!liaisonComplete(l) || l.de === l.vers) return; const t = l.type || '';
    const e = m.get(t) || m.set(t, { k: 't:' + t, type: t, n: 0, L: 0, reelles: 0 }).get(t); e.n++; e.L += l.longueur > 0 ? l.longueur : H.longueur; if (l.longueur > 0) e.reelles++; });
  return [...m.values()].map(e => { const cab = e.type ? cableDuType(app.norme, e.type) : null, jauge = jaugeDuType(e.type), fn = e.type ? filDeNorme(app.norme, e.type, jauge) : null;
    return { ...e, cab, fam: e.type ? cableFamilleDe(app.norme, e.type) : null, jauge, fn, masse: cab && cab.masse != null ? cab.masse * e.L : null }; }); });
const etatCable = c => !c.type ? 'att' : !c.cab && !c.fn ? 'att' : '';
// une masse : en g, en kg dès 1 000 g (deux décimales : la dizaine de grammes) ; supposée, « ≈ » en gris (la classe des longueurs)
const masseNombre = g => g >= 1000 ? nombre((Math.round(g / 10) / 100).toFixed(2)) : fmt(g, 0), masseUnite = g => g >= 1000 ? 'kg' : 'g', masseMot = g => masseNombre(g) + ' ' + masseUnite(g);
const celluleMasse = (g, suppose, bulle) => `<span class="rc-mesure${suppose ? ' rc-suppose' : ''}"${bulle ? ` data-bulle="${escA(bulle)}"` : ''}>${chiffre(`<b class="rc-n">${masseNombre(g)}</b>`, masseUnite(g))}</span>`;
const suppositionDe = c => pluriel(c.n - c.reelles, 'câble') + ' sur ' + c.n + ' sans longueur dans votre fichier : la longueur supposée par la simulation (' + metres(H_().longueur) + ' m) compte pour eux';
/* LE PIED DE L'ONGLET CÂBLES : le total des types montrés — leur nombre, leur longueur, leur masse — et la masse de chaque
   route (PUISSANCE, SIGNAL…), chacune avec son trait. Il reste collé au bas de la feuille. */
function totalCables(L, C) { const n = L.reduce((s, c) => s + c.n, 0), Lt = L.reduce((s, c) => s + c.L, 0), sup = L.some(c => c.reelles < c.n), pesees = L.filter(c => c.masse != null), M = pesees.reduce((s, c) => s + c.masse, 0);
  const types = new Set(L.map(c => c.type)), H = H_(), parRoute = new Map(), couleurs = routes();
  verite().forEach(l => { if (!liaisonComplete(l) || l.de === l.vers || !types.has(l.type || '')) return; const cab = l.type ? cableDuType(app.norme, l.type) : null; if (!cab || cab.masse == null) return;
    const k = l.route || ''; parRoute.set(k, (parRoute.get(k) || 0) + cab.masse * (l.longueur > 0 ? l.longueur : H.longueur)); });
  const ordre = [...couleurs.keys()], rs = [...parRoute].sort((a, b) => (ordre.indexOf(a[0]) + 1 || 99) - (ordre.indexOf(b[0]) + 1 || 99));
  const cellule = c => c.k === 'type' ? '<span class="rc-total-t">Total</span>' : c.k === 'n' ? chiffre(`<b class="rc-n">${n}</b>`)
    : c.k === 'longueur' ? `<span class="rc-mesure${sup ? ' rc-suppose' : ''}">${chiffre(`<b class="rc-n">${fmt(Lt, 1)}</b>`, 'm')}</span>`
    : c.k === 'masse' && pesees.length ? celluleMasse(M, sup, pesees.length < L.length ? 'Sans ' + pluriel(L.length - pesees.length, 'type') + ' que la base des câbles ne pèse pas' : '') : '';
  const j = Math.max(C.findIndex(c => c.k === 'masse'), C.findIndex(c => c.k === 'longueur'), C.findIndex(c => c.k === 'n')) + 1;
  const detail = rs.length > 1 ? `<span class="rc-total-routes" aria-label="La masse par route">${rs.map(([k, g]) => `<span class="rc-total-r"${k ? '' : ' data-bulle="Les câbles sans route"'}>${traitRoute(couleurs.get(k))}<span>${esc(k || 'sans route')}</span><b class="rc-n${sup ? ' rc-sup' : ''}">${sup ? '≈ ' : ''}${masseMot(g)}</b></span>`).join('')}</span>` : '';
  return `<tr class="rc-total">${C.slice(0, j).map(c => `<td class="${c.cls || ''}">${cellule(c)}</td>`).join('')}<td class="rc-total-d" colspan="${C.length - j + 1}">${detail}</td></tr>`; }
const motCable = c => !c.type ? 'sans type' : etatCable(c) ? 'inconnu' : 'ok';
const COLONNES_CABLES = [
  { k: 'type', t: 'Type', cls: 'rc-c-id', html: c => c.type ? luFichierT('type', c.type, { cls: 'rc-type' }) : '<span class="rc-mot doux">sans type</span>', tri: c => c.type, texte: c => c.type || 'sans type' },
  { k: 'jauge', t: 'Gauge', cls: 'rc-c-n', option: true, html: c => chiffre(pastilleJauge(c.jauge)), tri: c => c.jauge ?? 99, texte: c => c.jauge != null ? c.jauge + ' AWG' : '' },
  // (le lecteur : « le type est hyper à gauche, le nombre hyper à droite… ça se travaille, les tableaux ») : des colonnes à
  // leur juste largeur, serrées sur le type ; chaque nombre aligné à droite dans une place fixe, centrée sous son titre
  { k: 'n', t: 'Nombre', cls: 'rc-c-n', html: c => chiffre(`<b class="rc-n">${c.n}</b>`), tri: c => c.n, texte: c => String(c.n) },
  { k: 'longueur', t: 'Longueur totale', cls: 'rc-c-mesure', w: 100, html: c => `<span class="rc-mesure${c.reelles < c.n ? ' rc-suppose' : ''}"${c.reelles < c.n ? ` data-bulle="${escA(suppositionDe(c))}"` : ''}>${chiffre(`<b class="rc-n">${fmt(c.L, 1)}</b>`, 'm')}</span>`, tri: c => c.L, texte: c => fmt(c.L, 1) + ' m',
    note: L => L.every(c => c.reelles < c.n) ? ['en partie supposée', 'Des câbles de chaque type n’ont pas de longueur dans votre fichier : la longueur supposée par la simulation compte pour eux (menu ⋮ → Hypothèses)'] : null },
  /* LA MASSE d'un type (le lecteur) : sa longueur totale × sa masse linéique (la base des câbles, `cableDuType` : g/m) — en g,
     en kg dès 1 000 g ; « ≈ » en gris quand une partie des longueurs est supposée, comme la longueur ; sa bulle dit le calcul.
     Un type que la base ne pèse pas : rien ; aucun : la colonne ne se pose pas. Le total, et sa part par route, au pied. */
  { k: 'masse', t: 'Masse', cls: 'rc-c-mesure', html: c => c.masse != null ? celluleMasse(c.masse, c.reelles < c.n, `${fmt(c.L, 1)} m × ${fmt(c.cab.masse, 2)} g/m (base des câbles)` + (c.reelles < c.n ? '\n' + suppositionDe(c) : '')) : rien,
    tri: c => c.masse ?? -1, texte: c => c.masse != null ? masseMot(c.masse) : '', vide: c => c.masse == null },
  { k: 'etat', t: 'État', cls: 'rc-c-etat', html: c => etatHtml(etatCable(c) || 'ok', motCable(c), !c.type ? 'Des câbles sans type : leur gauge ne se vérifie pas' : etatCable(c) ? 'Inconnu de la base des câbles et de la norme des câbles' : c.cab ? 'Dans la base des câbles' : 'La gauge seule, par l’EN 2853'), tri: c => etatCable(c) ? 0 : 1, texte: motCable, vide: c => !etatCable(c) },
  { k: 'nature', t: 'Composition', option: true, large: 1, vide: c => !c.cab, html: c => c.cab ? `<span class="rc-mot">${esc([(c.cab.brins > 1 ? c.cab.brins + ' brins' : '1 brin') + (c.cab.blindage ? ' + blindage' : ''), c.cab.nature, c.fam && c.fam.conducteur && c.fam.conducteur !== 'cuivre' ? c.fam.conducteur : ''].filter(Boolean).join(' · '))}</span>` : rien,
    tri: c => c.cab ? c.cab.brins || 0 : -1, texte: c => c.cab ? [c.cab.brins + ' brins', c.cab.blindage ? 'blindage' : '', c.cab.nature].filter(Boolean).join(' ') : '' },
  // (v84) des titres en mots, l'unité dans la case : en capitales, « mΩ/m » devenait « MΩ/M » (des mégohms)
  { k: 'diametre', t: 'Diamètre', cls: 'rc-c-mesure', option: true, large: 1, vide: c => !(c.cab && c.cab.diametre != null), html: c => c.cab && c.cab.diametre != null ? chiffre(`<b class="rc-n">${fmt(c.cab.diametre, 2)}</b>`, 'mm') : rien, tri: c => c.cab && c.cab.diametre != null ? c.cab.diametre : -1, texte: c => c.cab && c.cab.diametre != null ? fmt(c.cab.diametre, 2) + ' mm' : '' },
  { k: 'resistance', t: 'Résistance', cls: 'rc-c-mesure', option: true, large: 2, vide: c => (c.cab && c.cab.resistance != null ? c.cab.resistance : c.fn && c.fn.resistance != null ? c.fn.resistance : null) == null, html: c => { const R = c.cab && c.cab.resistance != null ? c.cab.resistance : c.fn && c.fn.resistance != null ? c.fn.resistance : null; return R != null ? chiffre(`<b class="rc-n">${fmt(R, 2)}</b>`, 'mΩ/m') : rien; },
    tri: c => (c.cab && c.cab.resistance) ?? (c.fn && c.fn.resistance) ?? -1, texte: c => { const R = (c.cab && c.cab.resistance) ?? (c.fn && c.fn.resistance); return R == null ? '' : fmt(R, 2) + ' mΩ/m'; } },
  { k: 'gm', t: 'Masse linéique', cls: 'rc-c-mesure', option: true, large: 2, vide: c => !(c.cab && c.cab.masse != null), html: c => c.cab && c.cab.masse != null ? chiffre(`<b class="rc-n">${fmt(c.cab.masse, 2)}</b>`, 'g/m') : rien, tri: c => c.cab && c.cab.masse != null ? c.cab.masse : -1, texte: c => c.cab && c.cab.masse != null ? fmt(c.cab.masse, 2) + ' g/m' : '' },
  { k: 'source', t: 'Source', option: true, html: c => `<span class="rc-mot">${c.cab ? 'base des câbles' : c.fn ? 'EN 2853 (la gauge seule)' : c.type ? 'inconnu' : '—'}</span>`, tri: c => c.cab ? 0 : c.fn ? 1 : 2, texte: c => c.cab ? 'base des câbles' : c.fn ? 'EN 2853' : 'inconnu' },
  { k: 'aller', t: '', cls: 'rc-c-aller', html: () => '<button type="button" class="rc-lien" data-voir-fils="1">Voir les câbles</button>', texte: () => '' }];
const CABLES = { colonnes: COLONNES_CABLES, lignes: cables, etat: etatCable, choisie: () => false, cherche: 'Chercher : type de câble…',
  puces: () => [['inconnus', 'Inconnus de la base', c => !!etatCable(c), '', '', 'Les types que la base des câbles ne connaît pas']],
  voirFils: c => montrerLiaisons(c.type), total: totalCables,
  // survoler un type allume, sur le folio affiché, chacun de ses câbles
  survol: c => { const D = app.dessin; if (!D) return; const L = liaisonsDuPlan(); allumerFils(D.fils.filter(w => !w.shunt && L[w.i] && (L[w.i].type || '') === c.type)); },
  // (v86) un type de câble vient du fichier : il se lit, il ne se renomme pas d'ici pour tous ses câbles
  editeur: () => null, ecrire: () => false };
/* L'onglet Liaisons, filtré sur ce qu'on cherche (un type, un contact). */
function montrerLiaisons(q) { const b = app.base; b.filtreAuto = false; changerOnglet('liaisons', true); b.filtre = q || ''; b.portee = 'tout'; memoriserBase(); if (b.ouvert) rendreBase(true); else ouvrirBase(); }

/* ---- RACCORDS (un connecteur, ou un côté de prise, par ligne) -------------------- */
const raccords = () => memo('raccords', () => { const out = [];
  reperes().forEach(rp => { const r = rp.nom; if (rp.aPoser || estBarrette(r)) return; const B = baseRepere(r);
    if (estCoupure(r)) { if (!coupureEnModules(r)) return; const fs = [...B.b.parBorne.values()].flat();
      [['fiche', true], ['embase', false]].forEach(([c, am]) => { if (fs.some(f => !!f.amont === am)) out.push({ k: r + '|' + c, nom: r, c, plans: rp.plans, pn: B.b.pn, prise: am ? 'amont' : 'aval' }); }); return; }
    B.cs.forEach(c => { const fils = c.bornes.flatMap(bo => B.b.parBorne.get(bo) || []); if (fils.length) out.push({ k: r + '|' + c.nom, nom: r, c: c.nom, plans: rp.plans, pn: c.pn, fils }); }); });
  return out; });
/* Le raccord d'un connecteur ou d'un côté de prise, comme la fiche le calcule (l'arrangement retenu, les câbles posés). */
const habDe = x => memo('hab|' + x.k, () => { try {
  if (x.prise) { const I = infoPrise(x.nom); return I ? I[x.c] : null; }
  const k = planDuRepere(x.nom).cavites.find(c => c.nom === x.c), ref = k && k.plan.modules[0] ? k.plan.modules[0].reference : '';
  return habillage(app.norme, x.fils, app.contrat.raccords.get(x.k), x.pn, ref); } catch (_) { return null; } });
const CHOIX = { blindage: [['NO', 'sans reprise'], ['GND', 'sur le corps'], ['BLI', 'par cosse'], ['CONTACT', 'sur un contact']], etanche: [['false', 'pas étanche'], ['true', 'étanche']],
  orientation: [['droit', 'droit'], ['coudé', 'coudé']], gaine: [['', 'sans gaine'], ['HFA', 'gaine HFA'], ['NOMEX', 'gaine Nomex']] };
const motChoix = (champ, v) => (CHOIX[champ].find(([x]) => x === String(v)) || CHOIX[champ][0])[1];
const coteDePrise = x => x.c === 'fiche' ? 'partie mobile' : 'partie fixe';
const COLONNES_RACCORDS = [
  // un côté de prise se dit « partie mobile » ou « partie fixe » (la clé garde « fiche », « embase » : les choix gardés)
  { k: 'conn', t: 'Connecteur', cls: 'rc-c-rep', html: x => `<span class="rc-r">${esc(x.nom)}</span><i class="rc-pt">·</i>${x.prise ? `<span class="rc-mot">${esc(coteDePrise(x))}</span>` : `<span class="rc-cn">${esc(x.c)}</span>`}`, tri: x => x.nom + '\u0001' + x.c, texte: x => x.nom + ' ' + (x.prise ? coteDePrise(x) : x.c) },
  { k: 'raccord', t: 'Raccord', html: x => { const h = habDe(x); if (!h) return rien; const pq = h.pourquoi ? ` data-bulle="${escA(majuscule(h.pourquoi))}"` : '';
      return h.sansRaccord ? `<span class="rc-mot"${pq}>sans raccord</span>`
        : `<span class="${h.designation ? 'rc-id' : 'rc-mot'}"${pq}>${esc(h.designation || h.raccord)}</span>${h.statut && h.statut !== 'vérifié' ? `<i class="rc-o" data-bulle="${escA(SENS_STATUT_RACCORD[h.statut] || '')}">${esc(h.statut)}</i>` : ''}`; },
    tri: x => motRaccord(habDe(x)), texte: x => motRaccord(habDe(x)) },
  { k: 'bandit', t: 'Band-it', html: x => { const h = habDe(x); return h && h.bandit ? (h.collier ? `<span class="rc-id">${esc(h.collier.reference)}</span>` : etatHtml('att', 'aucun ne va')) : rien; }, tri: x => { const h = habDe(x); return h && h.collier ? h.collier.reference : ''; }, texte: x => { const h = habDe(x); return h && h.collier ? h.collier.reference : ''; },
    vide: x => { const h = habDe(x); return !(h && h.bandit); } },
  // (v74) ce qu'on a choisi à l'encre, ce qui reste par défaut à l'encre seconde : l'œil va aux choix, pas aux quatre mots
  // que chaque ligne répète
  { k: 'choix', t: 'Choix', html: x => { const c = (habDe(x) || { choix: {} }).choix, o = app.contrat.raccords.get(x.k) || {};
      return `<span class="rc-choix">${['orientation', 'blindage', 'etanche', 'gaine'].map(k => valT(k, motChoix(k, c[k]), { cls: k in o ? '' : 'rc-defaut', titre: (k in o ? 'Manuel' : 'Automatique') + ' — double-clic : Automatique, ou un autre choix ; la fiche et la LPA suivent' })).join('<i class="rc-pt">·</i>')}</span>`; },
    tri: x => { const c = (habDe(x) || { choix: {} }).choix; return [c.orientation, c.blindage, c.etanche, c.gaine].join(' '); }, texte: x => { const c = (habDe(x) || { choix: {} }).choix; return ['orientation', 'blindage', 'etanche', 'gaine'].map(k => motChoix(k, c[k])).join(' · '); } },
  { k: 'etat', t: 'État', cls: 'rc-c-etat', html: x => { const h = habDe(x); return h ? etatHtml(h.manquants.length ? 'att' : 'ok', h.manquants.length ? 'à compléter' : 'ok', h.manquants.map(majuscule).join('\n')) : rien; },
    tri: x => { const h = habDe(x); return h && h.manquants.length ? 0 : 1; }, texte: x => { const h = habDe(x); return h && h.manquants.length ? 'à compléter' : 'ok'; }, vide: x => { const h = habDe(x); return !(h && h.manquants.length); } },
  { k: 'pn', t: 'Part number', option: true, html: x => x.pn ? `<span class="rc-pn">${esc(x.pn)}</span>` : rien, tri: x => x.pn || '', texte: x => x.pn || '' },
  { k: 'taille', t: 'Taille · filetage', option: true, large: 1, vide: x => { const h = habDe(x); return !(h && h.taille); }, html: x => { const h = habDe(x); return h && h.taille ? `<span class="rc-mot"><b>${esc(h.taille)}</b>${h.filetage ? ' · ' + esc(h.filetage.filetage) : ''}</span>` : rien; }, tri: x => (habDe(x) || {}).taille || '', texte: x => { const h = habDe(x); return h && h.taille ? h.taille + (h.filetage ? ' ' + h.filetage.filetage : '') : ''; } },
  { k: 'manchon', t: 'Manchon', option: true, html: x => { const h = habDe(x); return h && h.manchon ? (h.manchonRef ? `<span class="rc-id">${esc(h.manchonRef.designation)}</span>` : etatHtml('att', 'aucun ne va')) : rien; }, tri: x => { const h = habDe(x); return h && h.manchonRef ? h.manchonRef.designation : ''; }, texte: x => { const h = habDe(x); return h && h.manchonRef ? h.manchonRef.designation : ''; } },
  { k: 'gaine', t: 'Gaine', option: true, html: x => { const h = habDe(x); return h && h.choix.gaine ? (h.gaine ? `<span class="rc-id">${esc(h.gaine.reference)}</span>` : etatHtml('att', 'aucune ne va')) : rien; }, tri: x => { const h = habDe(x); return h && h.gaine ? h.gaine.reference : ''; }, texte: x => { const h = habDe(x); return h && h.gaine ? h.gaine.reference : ''; } },
  { k: 'toron', t: 'Toron Ø', cls: 'rc-c-mesure', option: true, large: 1, vide: x => { const h = habDe(x); return !(h && h.faisceau.diametre != null); }, html: x => { const h = habDe(x); return h && h.faisceau.diametre != null ? `<span class="rc-mesure">${chiffre(`<b class="rc-n">${fmt(h.faisceau.diametre, 1)}</b>`, 'mm')}${h.faisceau.complet ? '' : '<i class="rc-o" data-bulle="Un type de câble inconnu de la base : le toron est sous-estimé">?</i>'}</span>` : rien; },
    tri: x => { const h = habDe(x); return h && h.faisceau.diametre != null ? h.faisceau.diametre : -1; }, texte: x => { const h = habDe(x); return h && h.faisceau.diametre != null ? fmt(h.faisceau.diametre, 1) + ' mm' : ''; } },
  { k: 'folio', t: 'Folio', cls: 'rc-c-folio', option: true, large: 2, vide: x => !x.plans.length, html: x => x.plans.length ? `<span class="rc-folios">${esc(listeFolios(x.plans))}</span>` : rien, tri: x => x.plans[0] || '', texte: x => x.plans.join(' ') }];
const RACCORDS = { colonnes: COLONNES_RACCORDS, portee: true, lignes: raccords, surFolio: x => app.plan === '*' || x.plans.includes(app.plan), exact: (x, f) => x.nom === f, cherche: 'Chercher : repère, raccord…',
  choisie: x => !!app.cible && app.cible.type === 'bloc' && app.cible.nom === x.nom, etat: x => { const h = habDe(x); return h && h.manquants.length ? 'att' : ''; },
  puces: () => [['completer', 'À compléter', x => { const h = habDe(x); return !!(h && h.manquants.length); }, '', '', 'Ce que la norme ne dit pas encore (une référence, une cote)']],
  choisir: x => choisirRepere(x.nom), survol: x => survolRepere(x.nom),
  // les choix d'un raccord sont des choix de VOLTA : Automatique (le calcul), ou Manuel (un choix de la liste) — v86, comme la fiche
  editeur: (x, f) => { if (!CHOIX[f]) return null; const o = app.contrat.raccords.get(x.k) || {}, c = (habDe(x) || { choix: {} }).choix;
    return { valeur: f in o ? String(o[f]) : '*auto', options: [['*auto', 'Automatique' + (f in o ? '' : ' · ' + motChoix(f, c[f]))], ...CHOIX[f]] }; },
  ecrire: (x, f, v) => { if (!CHOIX[f]) return false; const o = { ...(app.contrat.raccords.get(x.k) || {}) }, c = (habDe(x) || { choix: {} }).choix;
    if (v === '*auto') { if (!(f in o)) return false; histPush('raccord de ' + x.k + ' : automatique'); delete o[f]; app.contrat.raccords.set(x.k, o); apresEdition(); return true; }
    const w = v === 'true' ? true : v === 'false' ? false : v; if (f in o ? String(o[f]) === String(w) : String(c[f]) === String(w)) return false;
    histPush('raccord de ' + x.k); o[f] = w; app.contrat.raccords.set(x.k, o); apresEdition(); return true; } };

/* ---- PROBLÈMES (un verdict du contrôle par ligne) ----------------------------- */
/* Ce qu'il faut faire, et où la fiche le montre : lu dans la phrase du verdict (le contrôle ne le dit pas encore). Les
   phrases du contrôle disent « câble » et « gauge » (elles disaient « fil » et « jauge ») : on lit les deux. */
/* (v84, « chaque problème dit simplement ce qui ne va pas et ce qu'il faut faire, en peu de mots ») : une phrase courte, à
   l'impératif doux, sans renvoi d'onglet quand la ligne y mène d'un clic ; « le plus fin qui convient », plus « qui tient »
   (les mots de la charte). */
/* (v86, G1 — l'audit : « un conseil renvoie à « Changer », un bouton qui n'existe plus ») : le bon chemin, dans les mots de
   la fiche — un choix de VOLTA se règle dans sa fiche, « Choix de VOLTA », Manuel ; ce qui vient du fichier se change « dans
   votre fichier » (une seule source). Quand un geste règle le point, c'est lui qui s'affiche, pas la phrase. */
function remede(x) { const t = x.texte, ideal = /l’idéal est un ([\d,.]+ A)/.exec(t) || /un ([\d,.]+ A) suffirait/.exec(t);
  if (/^ajoutée par VOLTA sur/.test(t)) return ['Lui donner son repère', 'connecteur'];
  if (/profil de charge est à renseigner/.test(t)) return ['Écrire son profil de charge : VOLTA en déduit le calibre', 'profil'];
  if (/déclenche|disjoncte —|aucun calibre/.test(t)) return [ideal ? 'Retenir le ' + ideal[1] + ' que VOLTA propose' : 'Alléger le profil, ou une autre famille de disjoncteur dans votre fichier', 'calibre'];
  if (/suffirait|touche la courbe|l’idéal est|\bjuste\b/.test(t)) return [ideal ? 'Retenir le ' + ideal[1] + ' que VOLTA propose' : 'Retenir le calibre que VOLTA propose', 'calibre'];
  if (/sélectivité/.test(t)) return ['Un amont au moins double de l’aval : l’un des deux calibres, dans votre fichier', 'calibre'];
  if (/chute en ligne|chute en pointe/.test(t)) return [/hypothèse|supposé/.test(t) ? 'Écrire les longueurs mesurées dans votre fichier' : 'Une gauge plus forte, ou un chemin plus court', 'chute'];
  // (passe 87) un câble mal protégé que VOLTA ne sait pas régler d'un geste (un fil de commande : jamais « Passer en DR16 ») : la
  // phrase ne promet pas une proposition que la fiche ne fait pas — les deux vraies voies, toutes deux dans votre fichier
  if (/admis|pas protégé|maximum de l’AC|table 11-3/.test(t) && !/contact taille|la gauge limite/i.test(t) && typeof rangDuPoint === 'function' && !rangDuPoint(x).regler)
    return ['À décider dans votre fichier : un calibre plus petit, ou une gauge plus forte', 'fils'];
  if (/maximum de l’AC|table 11-3/.test(t)) return ['Un calibre plus petit, ou un câble plus gros (AC 43.13-1B, table 11-3)', 'fils'];
  // un CONTACT que le calibre ne protège pas (« Contact taille 20 (7,5 A) < calibre 10 A — pas protégé ») : c'est le contact
  // (v87, S7) la taille de contact qui suffit, quand il y en a une ; sinon c'est la gauge qui limite (un 24 AWG porte 3 A dans tout
  // contact) : une gauge plus forte règle aussi le contact — jamais « un contact plus gros » qui ne changerait rien
  { const m = /un contact taille (\S+) suffit/.exec(t); if (m) return ['Un contact taille ' + m[1] + ' : sa fiche › Choix de VOLTA › Manuel', 'contacts']; }
  if (/la gauge limite/.test(t)) return ['Une gauge plus forte : elle règle aussi le contact — sa fiche propose la plus fine qui convient', 'fils'];
  if (/^consommation de .+ à écrire/i.test(t)) return ['L’écrire dans sa fiche : Modifier › Ce qu’il consomme', 'profil'];
  if (/contact taille[^—]*— pas protégé/i.test(t)) return ['Un contact plus gros : sa fiche › Choix de VOLTA › Manuel', 'contacts'];
  // (plus « ou un calibre plus petit » : sous un profil qui déclenche déjà le calibre, c'est faux — l'ingénieur v73)
  if (/admis|pas protégé/.test(t)) return ['Un câble plus gros : sa fiche propose le plus fin qui convient', 'fils'];
  if (/contact taille|dépasse le contact/.test(t)) return ['Un contact plus gros : sa fiche › Choix de VOLTA › Manuel', 'contacts'];
  if (/refusé|aucun contact|jauge|gauge/.test(t)) return ['Un autre type de câble dans votre fichier, ou un autre arrangement (sa fiche › Choix de VOLTA › Manuel)', 'contacts'];
  if (/aucun arrangement|aucun module|ne loge/.test(t)) return ['Un autre arrangement : sa fiche › Choix de VOLTA › Manuel — ou une gauge plus fine dans votre fichier', 'connecteur'];
  if (/branchement en chaîne/.test(t)) return ['Séparer gauche et droite, si le câblage le permet', 'connecteur'];
  if (/famille de disjoncteur inconnue/.test(t)) return ['Ajouter la famille de ce part number (Normes › Familles de disjoncteurs)', 'disjoncteur'];
  if (/types? de (fil|câble)s? inconnus?/.test(t)) return ['Corriger le type dans votre fichier, ou ajouter le câble à la base (Normes › Câbles)', ''];
  if (/sans type/.test(t)) return ['Écrire le type de chaque câble dans votre fichier', ''];
  if (/incomplète/.test(t)) return ['Écrire « de » et « vers » dans votre fichier', ''];
  if (/ambiante/.test(t)) return ['Un câble qui supporte plus chaud, ou revoir l’ambiante (⋮ › Hypothèses)', ''];
  if (/CCA/.test(t)) return ['Qualifier le contact pour l’aluminium cuivré, ou un câble cuivre', 'contacts'];
  // (v86) une branche de commande au courant inconnu : écrire ce que consomme ce qu'elle alimente (la bobine d'un relais)
  if (/courant de commande inconnu/i.test(t)) { const b = /bobine de (\S+?)\.?$/.exec(t); return [b ? 'Écrire ce que consomme ' + b[1] + ' : sa fiche, « Ce qu’il consomme »' : 'Écrire ce que consomme sa charge, dans sa fiche', 'profil']; }
  return ['Voir sa fiche', 'problemes']; }
// les gestes d'un point du contrôle (08-controle), une fois par état du contrat
const gestesDuPb = p => memo('gestes|' + RECAP.itemsN + '|' + p.k, () => { try { return typeof gestesDuPoint === 'function' ? gestesDuPoint(p.x) : []; } catch (_) { return []; } });
const problemes = () => memo('problemes:' + RECAP.itemsN, () => (CONTROLE.items || []).map((x, k) => { const [que, sec] = remede(x); return { k: 'p' + k, x, idx: k, que, sec, plans: x.plan && x.plan !== '*' ? [x.plan] : [] }; }));
/* (v74) RANGÉ PAR GENRE, l'intercalaire dit déjà le niveau (son compte, à sa couleur) : chaque ligne n'en garde que le point —
   le mot reste pour le lecteur d'écran et le CSV ; et un geste qui se répète d'une ligne à la suivante (« Tout régler :
   102CB1 en 15 A… » cinq fois de suite) s'écrit UNE fois, puis « ″ » dessous, sa bulle le redit (le patron des Normes). */
const pointSeul = (n, mot) => `<span class="rc-etat ${n} seul"><i aria-hidden="true"></i><span class="sr">${esc(mot)}</span></span>`;
/* (v84) LE GESTE QUI RÈGLE SE VOIT : « Voir 102CB1 », répété en bouton sur chaque ligne, couvrait les vrais gestes (« Tout
   régler… », « Unifier sur… », « Lui donner son repère »). La LIGNE mène à la fiche, à la section qui démontre le point
   (`voirLePoint`) ; les boutons ne gardent que ce qui corrige — et « Voir les liaisons », quand le point est au tableau. */
/* (v86, l'intégrateur : « que les deux disent la même chose avec les mêmes mots ») CE QUI NE VA PAS, DANS LES MOTS DE LA
   FICHE (08-niveaux, l'agent « fiche2 ») : QUI, vu de l'objet de la ligne (« 2 → 103RL1:A1 · DR20 » — la flèche suit le
   courant : `quiVuDIci`), en chasse fixe, à part — l'œil trouve QUOI ; puis ce qui cloche, en clair (`motsDuProbleme` :
   « 9,31 A pendant 2,1 min : plus que les 6,9 A qu'il admet en continu. ») ; la bulle dit tout (d'où vient l'admis,
   `conditionsEnMots` ; pourquoi VOLTA suppose un contact). Une phrase que VOLTA ne sait pas dire autrement reste telle
   quelle. Rend { sujet, court, long }. */
// le câble d'un point : la liaison vivante — après un Défaire, le contrôle peut garder la copie d'avant, de même clé
const cableDuPb = x => { const c0 = (x.cables || []).length === 1 && x.cables[0] && typeof x.cables[0] === 'object' ? x.cables[0] : null, V = verite();
  return c0 ? (V.includes(c0) ? c0 : V.find(l => typeof memeLiaison === 'function' && memeLiaison(l, c0)) || null) : null; };
const motsDuPb = p => memo('mots|' + RECAP.itemsN + '|' + p.k, () => { const x = p.x, t = majuscule(typeof motDuProbleme === 'function' ? motDuProbleme(x.texte) : String(x.texte || ''));
  const k = t.indexOf(' — '), suite = k > 0 ? t.slice(k + 3) : '', titre = k > 0 ? t.slice(0, k) : t, tel = { sujet: '', court: t, long: t };
  if (typeof motsDuProbleme !== 'function' || typeof quiVuDIci !== 'function' || !x.nom) return tel;
  const o = { type: estDisjoncteur(x.nom) ? 'disjoncteur' : 'equipement', tete: { nom: x.nom } }, pt = { texte: x.texte, cable: cableDuPb(x) };
  try { const qui = /^(\S+ vers \S+(?: \(par [^)]+\))?) : (.+)$/.exec(titre);
    if (qui) { const vu = quiVuDIci(qui[1], pt, o, /^chute en ligne/i.test(qui[2])), M = motsDuProbleme(qui[2], suite, vu.type), glose = k > 0 || M.sansGlose || typeof gloseDuProbleme !== 'function' ? '' : gloseDuProbleme(x.texte);
      const sous = /^sous (\S+)$/.exec(suite), plus = M.mange || !suite ? '' : sous ? (String(vu.titre).includes(sous[1]) ? '' : ' Son disjoncteur : ' + sous[1] + '.') : ' ' + majuscule(suite) + '.';
      return { sujet: vu.titre, court: M.court, long: M.long + plus + (glose ? ' ' + glose : '') }; }
    // « B · aucun arrangement EN 4165-002 ne loge B5 : DR12 vers 397TB1 » (un connecteur) : le câble en sujet, vu d'ici
    const ar = /^(\S+) · aucun arrangement (.+?) ne loge (\S+) : (\S+) vers (\S+)$/i.exec(titre);
    if (ar) { const [, cn, fam, bo, type, vers] = ar; let f = null; try { f = typeof filsDuRepere === 'function' ? filsDuRepere(x.nom).find(y => String(y.borne) === bo && y.vers === vers) : null; } catch (_) { f = null; }
      const court = `Aucun arrangement ${fam} ne loge ce ${type} au connecteur ${cn}.`;
      return { sujet: quiVuDIci(`${type} vers ${vers}`, { cable: f ? f.l : null }, o).titre, court, long: suite ? court.replace(/\.$/, ' : ' + suite.replace(/^\S/, c => c.toLowerCase()) + '.') : court }; }
  } catch (_) { }
  return tel; });
const phraseDuPoint = p => { const M = motsDuPb(p), sujet = M.sujet ? `<span class="rc-sujet">${esc(M.sujet).replace(/ (→|←|–) /g, '<i>$1</i>').replace(/ · /g, '<i>·</i>')}</span>` : '';
  return `<span class="rc-phrase"${M.long !== M.court ? ` data-bulle="${escA(M.long)}"` : ''}>${sujet}${insecable(esc(M.court))}</span>`; };
/* LE GESTE D'UN POINT, LE MÊME QUE DANS LA FICHE (v86, G1 — l'audit : « dans le récapitulatif, les problèmes n'ont pas leur
   geste, alors que la fiche montre Passer en DR16 » ; 08-niveaux, `tachesFiche`) : celui du contrôle qui RÈGLE (« Tout
   régler… », « Unifier sur… », « Lui donner son repère » : 08-controle, `gestesDuPoint`), sinon celui que VOLTA sait faire
   pour un câble trop fin ou mal protégé (« Passer en DR16 » : 08-niveaux, `gesteDuPoint`). « Voir 102CB1 » ne règle rien :
   la ligne y mène. `cle` : deux lignes qui portent la même clé demandent le même geste (elles se regroupent). */
/* (passe 87, S4) un point À VOIR ne montre pas de geste (la fiche non plus : « à régler, c'est ce qui a un geste ») ; un point
   À RÉGLER montre le sien, sinon celui de sa ligne — le câble qui passe en DR16 règle aussi son contact (`rangDuPoint`). */
const reparateurs = p => memo('repare|' + RECAP.itemsN + '|' + p.k, () => { const x = p.x, r = rangDuPoint(x); if (!r.regler) return [];
  const G = gestesDuPb(p), regle = G.filter(g => g && g.mot && typeof g.faire === 'function' && !/^Voir\b/.test(g.mot)).map(g => ({ ...g, cle: g.cle || (x.nom || '') + '|' + g.mot }));
  if (regle.length) return regle;
  return r.geste ? [{ ...r.geste, cle: r.geste.cle || (x.nom || '') + '|' + r.geste.mot, principal: true }] : []; });
const signatureGestes = p => { const G = reparateurs(p); return G.length ? G.map(g => g.cle).join('\u0001') : '\u0002' + p.que; };
/* ---- (passe 87, S4 — le lecteur : « À régler, c'est ce qui a un geste ») LE RANG DE CHAQUE POINT, LA RÈGLE DE LA FICHE ----
   La fiche range ses points par ligne (08-niveaux, `tachesFiche`, variante A) : un câble, une ligne — tous ses points — ; un
   autre point, la sienne. Une ligne est À RÉGLER quand elle a un problème (rouge) ou un geste (« Passer en DR16 », « Lui
   donner son repère », « Unifier sur… »), À VOIR sinon ; chaque point prend le rang de sa ligne. Le récapitulatif (Problèmes,
   Disjoncteurs et les autres onglets de repères), le panneau Repères (R), la garde du dossier PDF et la pastille du rail
   (08-controle, `compteProblemes`) lisent ce rang : un objet a le même nombre partout. Aucun chiffre en dur : le rang suit le
   contrôle. Rend Map(point → { regler, geste, ligne }) — `geste` : ce qui règle le point (le sien, sinon celui de sa ligne). */
const RANGS = { items: null, carte: null, lignes: null, parObjet: null, genres: null, genresDe: null };
const objetDuPoint = x => ({ type: x.nom && estDisjoncteur(x.nom) ? 'disjoncteur' : 'equipement', tete: { nom: x.nom || '' } });
// le geste qui règle un point, dans l'ordre de la fiche : celui du contrôle (08-controle, `gestesDuPoint` ; « Voir 102CB1 » ne
// règle rien), sinon celui que VOLTA sait faire (08-niveaux, `gesteDuPoint` : « Passer en DR16 », « Lui donner son repère »)
function gesteQuiRegleLePoint(x) { let G = []; try { G = typeof gestesDuPoint === 'function' ? gestesDuPoint(x) || [] : []; } catch (_) { G = []; }
  const regle = G.filter(g => g && g.mot && typeof g.faire === 'function' && !/^Voir\b/.test(g.mot)); if (regle.length) return regle.find(g => g.principal) || regle[0];
  if (typeof gesteDuPoint !== 'function') return null;
  try { return gesteDuPoint({ texte: x.texte, cable: cableDuPb(x), gestes: G }, objetDuPoint(x)) || null; } catch (_) { return null; } }
function rangsDesPoints(items) { const xs = items || (typeof CONTROLE !== 'undefined' && CONTROLE.items) || [];
  if (RANGS.items === xs && RANGS.carte) return RANGS.carte;
  const carte = new Map(), lignes = new Map();
  xs.forEach((x, i) => { const g = gesteQuiRegleLePoint(x); let l = null;
    try { l = typeof cableDeLaLigne === 'function' ? cableDeLaLigne({ texte: x.texte, cable: cableDuPb(x), point: x }, objetDuPoint(x)) : null; } catch (_) { l = null; }
    const k = (x.nom || '') + '\u0001' + (l ? 'c|' + cleDeLiaison(l) : 'p|' + i), u = lignes.get(k) || lignes.set(k, { k, nom: x.nom || '', l, xs: [], ko: false, geste: null }).get(k);
    u.xs.push(x); if (x.niveau === 'ko') u.ko = true; if (g && !u.geste) u.geste = g; carte.set(x, { ligne: u, geste: g }); });
  lignes.forEach(u => { u.regler = u.ko || !!u.geste; });
  carte.forEach(r => { r.regler = r.ligne.regler; if (!r.geste && r.regler) r.geste = r.ligne.geste; });
  RANGS.items = xs; RANGS.carte = carte; RANGS.lignes = [...lignes.values()]; RANGS.parObjet = null; RANGS.genres = null; return carte; }
const rangDuPoint = x => rangsDesPoints().get(x) || { regler: !!x && x.niveau === 'ko', geste: null, ligne: null };
// le compte, sur tout le plan : les points à régler, à voir — et combien sont des problèmes (rouges)
const motARegler = (r, v) => !r && !v ? 'Rien à reprendre' : [r ? r + ' à régler' : '', v ? v + ' à voir' : ''].filter(Boolean).join(' · ');
function compteARegler(items) { const xs = items || (typeof CONTROLE !== 'undefined' && CONTROLE.items) || [], R = rangsDesPoints(xs); let regler = 0, ko = 0;
  xs.forEach(x => { if ((R.get(x) || {}).regler) regler++; if (x.niveau === 'ko') ko++; });
  return { regler, voir: xs.length - regler, ko, mot: motARegler(regler, xs.length - regler) }; }
/* LES LIGNES D'UN OBJET, comme sa fiche les montre : les siennes, et la barrette que VOLTA ajoute sur l'une de ses bornes
   (« Deux câbles arrivent sur la borne 2 — Lui donner son repère » : 08-fiche, `problemesEquipement`) — l'onglet de son genre
   dit « 5 à régler » quand sa fiche en montre cinq. */
function lignesDeLObjet(nom) { rangsDesPoints();
  if (!RANGS.parObjet) { const m = new Map(), mettre = (k, u) => (m.get(k) || m.set(k, []).get(k)).push(u);
    RANGS.lignes.forEach(u => { if (u.nom) mettre(u.nom, u);
      const s = u.xs.length === 1 && u.xs[0].genre === 'aposer' ? /^ajoutée par VOLTA sur (\S+?):/.exec(String(u.xs[0].texte || '')) : null;
      if (s && s[1] !== u.nom && typeof genreDe === 'function' && genreDe(s[1]) === 'eqpt') mettre(s[1], u); });
    RANGS.parObjet = m; }
  return RANGS.parObjet.get(nom) || []; }
// une ligne en mots, pour une bulle : un câble, ses deux bouts et ses règles (« 102CB1:2 → 395SW1:1 · DR24 : protection, contact ») ;
// un autre point, sa phrase
const motDeLaLigne = u => { const l = u.l, bout = (r, b) => r + (b != null && b !== '' ? ':' + b : '');
  if (!l) return majuscule(typeof motDuProbleme === 'function' ? motDuProbleme(u.xs[0].texte) : u.xs[0].texte);
  const regles = [...new Set(u.xs.map(x => typeof regleDuPoint === 'function' ? regleDuPoint(x.texte) : '').map((r, i) => typeof motDeLaRegle === 'function' ? motDeLaRegle(r, u.xs[i] ? u.xs[i].texte : '') : '').filter(Boolean))];
  return `${bout(l.de, l.borneDe)} → ${bout(l.vers, l.borneVers)} · ${l.type || 'câble'}${regles.length ? ' : ' + regles.join(', ') : ''}`; };
/* LES GENRES, RANGÉS : comme `genresDuControle` (08-controle), mais selon le rang — À RÉGLER d'abord (les genres où il y a un
   problème, puis les autres), puis À VOIR ; chaque genre, ses lignes par repère, rangées par nom. L'onglet Problèmes, le
   panneau Repères et la garde du dossier PDF les montrent. Rend [{ cle, regler, niveau, genre, lignes, n, noms }] ; une ligne :
   { cle, niveau, genre, nom, xs, plan, k, cleControle (celle de `lignesDuControle` : P y reprend) }. */
function genresARegler(items) { const xs = items || (typeof CONTROLE !== 'undefined' && CONTROLE.items) || [], R = rangsDesPoints(xs);
  if (RANGS.genres && RANGS.genresDe === xs) return RANGS.genres;
  const G = new Map(), L = new Map();
  xs.forEach((x, k) => { const r = R.get(x) || {}, genre = x.genre || 'autre', cg = (r.regler ? 'regler' : 'voir') + '|' + genre;
    const g = G.get(cg) || G.set(cg, { cle: cg, regler: !!r.regler, niveau: 'att', genre, lignes: [], n: 0, noms: new Set() }).get(cg), cl = cg + '|' + (x.nom || '\u0001' + x.texte);
    let l = L.get(cl); if (!l) { l = { cle: cl, niveau: 'att', genre, nom: x.nom || '', xs: [], plan: x.plan || '', k, cleControle: x.niveau + '|' + genre + '|' + (x.nom || '\u0001' + x.texte) }; L.set(cl, l); g.lignes.push(l); }
    l.xs.push(x); g.n++; if (x.nom) g.noms.add(x.nom); if (x.niveau === 'ko') { g.niveau = 'ko'; l.niveau = 'ko'; } });
  const poids = g => g.regler ? (g.niveau === 'ko' ? 0 : 1) : 2;
  const out = [...G.values()].sort((a, b) => poids(a) - poids(b) || rangDuGenre(a.genre) - rangDuGenre(b.genre));
  out.forEach(g => g.lignes.sort((a, b) => triNaturel(a.nom || '~', b.nom || '~')));
  RANGS.genres = out; RANGS.genresDe = xs; return out; }
/* Voir un point depuis sa ligne : sa fiche, sur son folio, ouverte à la section qui le démontre — sans filtrer l'onglet sur
   lui (la liste reste sous les yeux ; « Voir 102CB1 » la réduisait à 102CB1). */
function voirLePoint(p) { const x = p.x; if (!x.nom || x.tableau != null || VT_A_POSER.test(x.nom)) { allerAuControle(x); return; }
  const k = /^([A-Z]{1,2}\d?) · /.exec(x.texte); if (k && typeof FI !== 'undefined' && FI.connecteur) FI.connecteur[x.nom] = k[1];
  choisirRepere(x.nom, x.plan);
  const secs = [x.section, p.sec !== 'problemes' ? p.sec : '', estDisjoncteur(x.nom) ? 'disjoncteur' : ''].filter(Boolean), box = $('ba-equip');
  const ouvrir = () => box && typeof ouvrirSection === 'function' && secs.some(s => { try { return ouvrirSection(box, s); } catch (_) { return false; } });
  if (!ouvrir()) setTimeout(ouvrir, 0); if (typeof viser === 'function') { try { viser(x.nom); } catch (_) { } } }
const COLONNES_PROBLEMES = [
  // rangé par genre, l'intercalaire dit déjà le niveau (son compte, à sa couleur) : la colonne ne se pose pas — elle ne
  // répéterait qu'un point par ligne ; triée, cherchée ou filtrée, chaque ligne le dit en mots
  // (passe 87, S4) le rang de la fiche : à régler (un problème ou un geste), puis à voir — le point garde la couleur de son état
  { k: 'niveau', t: 'Niveau', cls: 'rc-c-etat', html: p => { const n = p.x.niveau === 'ko' ? 'ko' : 'att'; return RECAP.parGenre ? pointSeul(n, MOTS_ETAT[n]) : etatHtml(n); }, tri: p => rangDuPoint(p.x).regler ? (p.x.niveau === 'ko' ? 0 : 1) : 2, texte: p => rangDuPoint(p.x).regler ? 'à régler' : 'à voir',
    vide: () => groupesParGenre() },
  // (un bloc choisi sur le plan filtre l'onglet sur lui : la colonne ne répéterait que son nom, déjà dans la recherche) ; le
  // même objet qu'à la ligne du dessus s'écrit à l'encre troisième : l'œil voit où un autre commence
  { k: 'objet', t: 'Objet', cls: 'rc-c-rep', html: p => p.x.nom ? `<span class="rc-r${RECAP.memes.has(p.k) ? ' rc-meme' : ''}">${esc(p.x.nom)}</span>` : '<span class="rc-mot doux">le tableau</span>', tri: p => p.x.nom || '', texte: p => p.x.nom || 'tableau',
    vide: p => !!app.base.filtreAuto && !!p.x.nom && p.x.nom === app.base.filtre.trim() },
  { k: 'texte', t: 'Ce qui ne va pas', cls: 'rc-c-phrase rc-c-pb', html: p => phraseDuPoint(p), tri: p => p.x.texte, texte: p => { const M = motsDuPb(p); return (M.sujet ? M.sujet + ' : ' : '') + M.long; } },
  /* CE QU'IL FAUT FAIRE : le GESTE qui règle, en bouton cuivre — celui de la fiche (`reparateurs`) : « Passer en DR16 »,
     « Lui donner son repère », « Tout régler : 102CB1 en 15 A… » ; sans geste, la phrase courte (`remede`), calme. Des lignes
     qui se suivent et demandent la même chose ne le répètent pas : une seule case pour elles toutes (v86 — plus de « ″ »,
     obscur), qui court sur leurs lignes (`RECAP.groupes`, `ligneHtml`). Aller voir, c'est la ligne. */
  { k: 'que', t: 'Ce qu’il faut faire', cls: 'rc-c-phrase rc-c-que', html: p => { const G = reparateurs(p);
      return `<span class="rc-que">${G.length ? `<span class="rc-gestes">${G.map((g, i) => `<button type="button" class="btn ${i ? 'lien' : 'cuivre'} dense" data-geste-pb="${escA(g.cle)}" data-bulle="${escA(g.aide || '')}">${esc(g.mot)}</button>`).join('')}</span>` : `<span class="rc-phrase">${insecable(esc(p.que))}</span>`}</span>`; },
    tri: p => { const G = reparateurs(p); return G.length ? '\u0001' + G[0].mot : p.que; }, texte: p => { const G = reparateurs(p); return G.length ? G.map(g => g.mot).join(' · ') : p.que; } },
  { k: 'folio', t: 'Folio', cls: 'rc-c-folio', option: true, html: p => p.plans.length ? `<span class="rc-folios">f.${INSECABLE}${esc(p.plans[0])}</span>` : rien, tri: p => p.plans[0] || '', texte: p => p.plans.join(' ') },
  { k: 'section', t: 'Dans la fiche', option: true, html: p => p.sec && p.x.nom && SECTIONS[p.sec] ? `<span class="rc-mot">${esc(SECTIONS[p.sec])}</span>` : rien, tri: p => p.sec, texte: p => SECTIONS[p.sec] || '' }];
// (tour du site, un relecteur : « le seul problème rouge, sur le folio 3, ne se voit pas depuis le folio 1 ») : les
// problèmes se lisent toujours sur tout le plan — ils sont peu nombreux, et chaque puce dit combien sont sur ce folio
const PROBLEMES = { colonnes: COLONNES_PROBLEMES, portee: false, lignes: problemes, surFolio: p => app.plan === '*' || !p.plans.length || p.plans.includes(app.plan), exact: (p, f) => p.x.nom === f, cherche: 'Chercher : repère, mot…',
  choisie: p => !!app.cible && app.cible.type === 'bloc' && app.cible.nom === p.x.nom, etat: p => p.x.niveau,
  puces: () => [['niveau:ko', 'À régler', p => rangDuPoint(p.x).regler, '', 'niveau'], ['niveau:att', 'À voir', p => !rangDuPoint(p.x).regler, '', 'niveau']],
  choisir: voirLePoint, survol: p => { if (p.x.nom) survolRepere(p.x.nom); },
  ordre: L => { const rg = p => (rangDuPoint(p.x).regler ? (p.x.niveau === 'ko' ? 0 : 500) : 1000) + (typeof rangDuGenre === 'function' ? rangDuGenre(p.x.genre) : 0); return L.map((p, i) => [p, i]).sort((a, z) => rg(a[0]) - rg(z[0]) || a[1] - z[1]).map(x => x[0]); },
  aller: p => { const x = p.x; if (x.tableau != null) { montrerLiaisons(x.tableau); return; } allerAuControle(x);
    if (p.sec) setTimeout(() => { if (typeof ouvrirSection === 'function') ouvrirSection($('ba-equip'), p.sec); }, 0); } };

/* ---- NORMES (une table de la norme qui juge ce contrat, par ligne) ---------- */
/* La norme qu'une table porte, en deux ou trois mots (le détail est sur la page des normes, `FICHES_TABLES`). */
const NORME_DE_VUE = { 'modules:barrette': 'ASNE 0599 · NSA937901', 'tailles:barrette': 'EN 3155', 'familles:barrette': 'ASNE 0599 · NSA937901', accessoires: 'Amphenol Air LB',
  'modules:connecteur': 'EN 4165-002 · EN 2997-002…', 'tailles:connecteur': 'EN 3155', 'familles:connecteur': 'EN 2997 · EN 3645 · EN 3646 · EN 4165', contacts: 'tables SEE',
  resistancesContacts: 'AS39029', courantsContacts: 'AS39029 · EN 3155-076', cables: 'base des câbles', cablesFamilles: 'EN 2267-010 · EN 2714-013…', fils: 'EN 2853',
  reseau: 'AC 43.13-1B (11-6)', declassements: 'AC 43.13-1B (11-5, 11-6)', disjoncteurs: 'E-T-A 483 · Sensata · Crouzet', protections: 'AC 43.13-1B (11-3)',
  disjoncteursFamilles: 'MS3320 · 2TC · E-T-A 483…', chutesDisjoncteurs: 'MS3320N · MS22073M…', calibrations: 'MS3320N · Sensata…', raccords: 'EN 3660', entrees: 'EN 3660-064',
  classes: 'EN 3660-001', manchons: 'VG 95343', gaines: 'EN 6049', colliers: 'EN 3660-033', filetages: 'EN 3645-002 · EN 2997-002…' };
const RE_NORME = /\b(EN ?\d{4}(?:-\d{3})?|AC 43\.13-1B|ASNE ?\d{4}|NSA ?\d{6}|AS ?\d{4,5}|VG ?\d{5})/;
const normeCourte = v => { if (NORME_DE_VUE[v]) return NORME_DE_VUE[v]; const F = FICHES_TABLES[vueDe(v).table] || {}, m = RE_NORME.exec(F.source || ''); return m ? m[1] : String(F.source || '').split(/[,;(:]/)[0].trim().slice(0, 32); };
// ce qu'une table juge : la première phrase de « à quoi elle sert »
// (v84 : la colonne a la place d'office sur une feuille large — la phrase se coupe à une virgule plutôt qu'au milieu d'un mot)
const phrase = t => { const x = String(t || '').split(/\. (?=[A-ZÀ-Ý])/)[0].replace(/\.$/, ''); if (x.length <= 170) return x;
  const c = x.slice(0, 170), v = Math.max(c.lastIndexOf(', '), c.lastIndexOf(' : '), c.lastIndexOf(' — ')); return v > 90 ? c.slice(0, v) + '…' : c.replace(/\s+\S*$/, '') + '…'; };
function normes() { return memo('normes', () => { const V = verite(), cab = V.filter(l => liaisonComplete(l) && l.de !== l.vers && l.type).length, R = reperes();
  const n = g => R.filter(r => r.genre === g).length, connecteurs = raccords().length, cb = n('cb'), barr = n('barrette'), pr = n('coupure');
  const objets = { fils: [cab, 'câble'], cables: [cab, 'câble'], cablesFamilles: [cab, 'câble'], reseau: [cb ? cab : 0, 'câble'], declassements: [cab, 'câble'],
    disjoncteurs: [cb, 'disjoncteur'], protections: [cb, 'disjoncteur'], disjoncteursFamilles: [cb, 'disjoncteur'], chutesDisjoncteurs: [cb, 'disjoncteur'], calibrations: [0, ''],
    'modules:barrette': [barr, 'barrette'], 'tailles:barrette': [barr, 'barrette'], 'familles:barrette': [barr, 'barrette'], accessoires: [0, ''],
    'modules:connecteur': [connecteurs, 'connecteur'], 'tailles:connecteur': [connecteurs, 'connecteur'], 'familles:connecteur': [connecteurs + pr, 'connecteur'],
    contacts: [connecteurs, 'connecteur'], resistancesContacts: [cb ? connecteurs : 0, 'connecteur'], courantsContacts: [cb ? connecteurs : 0, 'connecteur'],
    raccords: [connecteurs, 'connecteur'], entrees: [connecteurs, 'connecteur'], classes: [connecteurs, 'connecteur'], manchons: [connecteurs, 'connecteur'], gaines: [connecteurs, 'connecteur'], colliers: [connecteurs, 'connecteur'], filetages: [connecteurs, 'connecteur'] };
  return DOMAINES_NORMES.flatMap(d => d.vues.map(v => { const T = vueDe(v).table, o = objets[v] || [0, '']; let lignes = 0; try { lignes = lignesDeVue(v).lignes.length; } catch (_) { }
    return { k: 'n:' + v, v, T, domaine: d.titre, titre: vueDe(v).titre || TITRES_NORME[T] || v, norme: normeCourte(v), juge: phrase((FICHES_TABLES[T] || {}).sert), n: o[0], mot: o[1], lignes, modifiee: tableModifiee(T) }; })); }); }
const COLONNES_NORMES = [
  { k: 'norme', t: 'Norme', cls: 'rc-c-id', html: x => `<span class="rc-norme">${esc(x.norme)}</span>`, tri: x => x.norme, texte: x => x.norme },
  { k: 'titre', t: 'Table', html: x => `<span class="rc-table"${x.juge ? ` data-bulle="${escA(x.juge)}"` : ''}><b>${esc(x.titre)}</b><small>${esc(x.domaine)}</small></span>`, tri: x => x.titre, texte: x => x.titre + ' ' + x.domaine },
  { k: 'objets', t: 'Ce qu’elle juge ici', cls: 'rc-c-n', html: x => x.n ? `<span class="rc-frac"><b class="rc-n">${x.n}</b><i>${esc(pluriel(x.n, x.mot).replace(/^\d+ /, ''))}</i></span>` : rien, tri: x => x.n, texte: x => x.n ? pluriel(x.n, x.mot) : '' },
  { k: 'origine', t: 'Origine', si: () => normes().some(x => x.modifiee), html: x => x.modifiee ? `<span class="rc-mot">modifiée</span>${orig('main', 'Une table changée dans ce navigateur (Normes)')}` : '<span class="rc-mot doux">embarquée</span>', tri: x => x.modifiee ? 0 : 1, texte: x => x.modifiee ? 'modifiée' : 'embarquée' },
  { k: 'aller', t: '', cls: 'rc-c-aller', html: () => '<button type="button" class="rc-lien" data-aller="1">Ouvrir la table</button>', texte: () => '' },
  { k: 'juge', t: 'À quoi elle sert', cls: 'rc-c-phrase', option: true, large: 1, vide: x => !x.juge, html: x => `<span class="rc-phrase">${esc(x.juge)}</span>`, tri: x => x.juge, texte: x => x.juge },
  { k: 'lignes', t: 'Lignes', cls: 'rc-c-n', option: true, large: 2, html: x => chiffre(`<b class="rc-n">${x.lignes}</b>`), tri: x => x.lignes, texte: x => String(x.lignes) }];
const NORMES_ONGLET = { colonnes: COLONNES_NORMES, lignes: () => normes().filter(x => x.n || x.modifiee), etat: () => '', choisie: () => false, cherche: 'Chercher : norme, table…',
  puces: () => [['modifiees', 'Modifiées', x => x.modifiee]], aller: x => ficheNormes({ table: x.v }) };

const TABS = { liaisons: LIAISONS, equipements: EQUIPEMENTS, disjoncteurs: DISJONCTEURS, barrettes: BARRETTES, prises: PRISES, cables: CABLES, raccords: RACCORDS, problemes: PROBLEMES, normes: NORMES_ONGLET };
const onglet = () => TABS[app.base.onglet] || LIAISONS;

/* ---- les lignes d'un onglet : la portée, la recherche, les puces, le tri ------ */
const portee = O => !!O.portee && avecPortee();
/* LA PLACE QUI RESTE SE REMPLIT DE CE QUI SERT (v84, le lecteur : « le blanc à droite, à 1920 ») : ni table étirée (« le type
   hyper à gauche, le nombre hyper à droite »), ni table centrée dans le vide — sur une feuille large, des colonnes « en plus »
   viennent d'office, celles qu'un ingénieur ouvre de toute façon : l'intensité et la chute d'une liaison, les connecteurs
   d'un équipement, le permanent d'un disjoncteur… (`large` : 1 dès 1 080 px de table, 2 dès 1 480). Le choix fait dans
   « Colonnes » passe toujours devant ; une colonne qui ne dirait rien ne se pose pas (`colonnesUtiles`). */
const PALIERS = [1080, 1480];
function palierDuCorps() { const c = $('ba-corps'), w = c ? c.getBoundingClientRect().width : 0; return w >= PALIERS[1] ? 2 : w >= PALIERS[0] ? 1 : 0; }
const dOffice = c => !c.option || (!!c.large && (RECAP.palier || 0) >= c.large);
/* L'ÉTAT SE LIT AU BOUT DE LA LIGNE, quelles que soient les colonnes ajoutées ; seul le lien d'action (« Ouvrir la table »,
   « Voir les câbles ») vient après lui. */
const rangDeFin = c => c.k === 'etat' ? 1 : /\brc-c-aller\b/.test(c.cls || '') ? 2 : 0;
const colonnesVues = O => { const choix = app.base.colonnes[app.base.onglet] || {};
  return O.colonnes.filter(c => (!c.si || c.si()) && (c.k in choix ? choix[c.k] : dOffice(c))).map((c, i) => [c, i]).sort((a, z) => rangDeFin(a[0]) - rangDeFin(z[0]) || a[1] - z[1]).map(x => x[0]); };
// une puce : [clé, mot, test, ce qui la précède (le trait d'une route), son groupe (l'un OU l'autre), sa bulle, lourde (elle lit
// les plans), sa rubrique dans « Filtrer »]
const pucesDe = O => (O.puces ? O.puces() : []).map(([k, t, test, avant, groupe, aide, lourd, rubrique]) => ({ k, t, test, avant: avant || '', groupe: groupe || k, aide: aide || '', lourd: !!lourd, rubrique: rubrique || (groupe === 'route' ? 'Route' : 'Les autres') }));
function pucesActives(O) { const P = pucesDe(O), on = new Set(app.base.puces[app.base.onglet] || []); return P.filter(p => on.has(p.k)); }
function lignesDe(O, sansPuces, sansPortee) { const b = app.base, f = b.filtre.trim().toLowerCase();
  let L = O.lignes();
  // (v79, un relecteur : « Ce folio : rien — alors que le plan en compte 5 ») : un folio qui n'a rien de cet onglet montre tout le plan
  if (!sansPortee && portee(O) && b.portee === 'folio' && O.surFolio) { const F = L.filter(O.surFolio); b.toutFaute = !F.length && L.length > 0 && !f; if (!b.toutFaute) L = F; }
  // un bloc choisi sur le plan filtre sur lui-même, là où il veut dire quelque chose (pas les câbles, ni les normes)
  if (f && b.filtreAuto) { if (O.exact) L = L.filter(r => O.exact(r, b.filtre.trim())); }
  else if (f) L = L.filter(r => O.colonnes.some(c => c.texte && String(c.texte(r)).toLowerCase().includes(f)));
  if (!sansPuces) { const A = pucesActives(O), G = new Map(); A.forEach(p => (G.get(p.groupe) || G.set(p.groupe, []).get(p.groupe)).push(p)); G.forEach(ps => { L = L.filter(r => ps.some(p => p.test(r))); }); }
  const tri = b.tri, c = tri && O.colonnes.find(x => x.k === tri.k && x.tri);
  // sans tri choisi, l'onglet garde son ordre de lecture (les problèmes : du plus grave au moins grave, même filtrés)
  if (!c && O.ordre) L = O.ordre(L);
  if (c) { const v = new Map(L.map(r => [r, c.tri(r)]));
    L = L.slice().sort((a, z) => { const x = v.get(a), y = v.get(z), vx = x == null || x === '', vy = y == null || y === ''; if (vx || vy) return vx - vy;
      return tri.sens * (typeof x === 'number' && typeof y === 'number' ? x - y : triNaturel(x, y)); }); }
  return L; }
// le tableau de la vue liaisons : [[liaison, rang]] (08 : un câble choisi sur le plan cherche sa ligne)
function lignesVisibles() { return lignesDe(LIAISONS).map(r => [r.l, r.i]); }
const groupesParFolio = () => app.base.onglet === 'liaisons' && avecPortee() && app.base.portee === 'tout' && !app.base.tri && !app.base.filtre.trim() && !pucesActives(LIAISONS).length;

/* ---- les comptes et l'état de chaque onglet ------------------------------------ */
function compteOnglet(k) { const items = CONTROLE.items || [];
  const etatNoms = rs => niveauDe(rs.flatMap(r => itemsParNom().get(r.nom) || []));
  try { switch (k) {
    case 'liaisons': { const V = verite().filter(l => !liaisonVide(l)), C = itemsParCable(); return { n: String(V.length), etat: V.some(l => (C.get(l.cable) || []).some(x => x.niveau === 'ko')) ? 'ko' : items.some(x => x.tableau != null) || V.some(l => C.has(l.cable)) ? 'att' : '' }; }
    case 'equipements': { const R = equipements(); return { n: String(R.length), etat: etatNoms(R) }; }
    case 'disjoncteurs': { const R = disjoncteurs(); return { n: String(R.length), etat: etatNoms(R) }; }
    case 'barrettes': { const R = barrettes(), a = R.filter(r => r.aPoser).length; return { n: String(R.length), etat: etatNoms(R), titre: a ? pluriel(R.length - a, 'barrette') + ' du contrat, ' + a + ' ajoutée' + (a > 1 ? 's' : '') + ' par VOLTA' : '' }; }
    case 'prises': { const R = prises(); return { n: String(R.length), etat: etatNoms(R) }; }
    case 'cables': { const C = cables(); return { n: String(C.length), etat: C.some(etatCable) ? 'att' : '' }; }
    case 'raccords': return { n: String(raccords().length), etat: '' };
    // le compte des problèmes : la source unique (08-controle, `compteProblemes`) — les rouges · ce qui est à voir
    // (passe 87, S4) à régler · à voir, la règle de la fiche (`compteARegler`, que lit aussi la pastille du rail)
    case 'problemes': { const C = compteARegler(items);
      return { n: String(C.regler + C.voir), ko: C.regler, att: C.voir, rouge: C.ko > 0, etat: C.ko ? 'ko' : C.regler || C.voir ? 'att' : '', titre: C.mot }; }
    case 'normes': return { n: String(NORMES_ONGLET.lignes().length), etat: '' };
  } } catch (_) { } return { n: '', etat: '' }; }

/* ---- LE RENDU ------------------------------------------------------------- */
/* Tout le récapitulatif se déduit de `app` ; il n'est pas refait tant qu'on écrit dans une case (`enSaisie`) ni quand rien
   de ce qu'il montre n'a changé — alors seule la ligne choisie se marque. `force` : le refaire quand même. */
function rendreBase(force) { const b = app.base; b.sale = false; if ($('base').hidden) { b.sale = true; return; }
  if (b.edition && !force) { b.sale = true; return; }
  assurerModele(); RECAP.palier = palierDuCorps(); const O = onglet(), C = colonnesVues(O);
  const cle = [RECAP.cle, RECAP.versV, RECAP.itemsN, b.onglet, b.portee, b.filtre, b.filtreAuto, JSON.stringify(b.tri), JSON.stringify(b.puces[b.onglet] || []), C.map(c => c.k).join(','), b.toutes, b.neuves.length, b.neufs.join(','), b.nouveau].join('\u0002');
  const avaitFocus = $('ba-tab').contains(document.activeElement), focus = b.focus || (avaitFocus ? caseDe(document.activeElement) : null);
  if (!force && cle === RECAP.rendu) { marquerLignes(); defiler(); return; }
  RECAP.rendu = cle; if (typeof cacherBulle === 'function') cacherBulle(); rendreTete(O); rendreOnglets(); rendreOutils(O); rendreTable(O, C);
  if (focus && (b.focus || avaitFocus)) { b.focus = null; const el = elementDe(focus); if (el) { try { el.focus({ preventScroll: true }); } catch (_) { el.focus(); } el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } }
  defiler(); }
function rafraichirBase() { if (app.base.enSaisie || app.base.edition) { app.base.sale = true; return; } rendreBase(); }
function defiler() { const b = app.base; if (!b.defiler) return; b.defiler = false;
  if (RECAP.virtuel) { const O = onglet(), m = RECAP.virtuel.morceaux.find(x => { const r = x.k != null && RECAP.vues.get(x.k); return r && !r.nouveau && O.choisie(r); }); if (m) amenerLigne(m.k); }
  const tr = $('ba-tbody').querySelector('tr.on'); if (tr && tr.scrollIntoView) { try { tr.scrollIntoView({ block: 'center' }); } catch (_) { } } }
/* La tête : le titre et le nom du plan, seulement — les comptes sont au rail, chacun devant son onglet (v74 : la ligne
   « 201 liaisons · 67 repères · 6 folios » doublait le rail et se coupait, la fiche épinglée) ; ils restent dans sa bulle. */
function rendreTete(O) { const b = app.base, n = app.contrat.liaisons.length, P = plans(), cx = $('ba-contexte');
  cx.textContent = n ? app.nom || 'Sans nom' : '';
  if (n) cx.dataset.bulle = [plurielLie(verite().filter(l => !liaisonVide(l)).length, 'liaison'), plurielLie(reperes().length, 'repère'), P.length > 1 ? plurielLie(P.length, 'folio') : ''].filter(Boolean).join(' · '); else delete cx.dataset.bulle;
  $('ba-taille').querySelectorAll('[data-taille]').forEach(x => x.setAttribute('aria-pressed', String(b.ouvert && x.dataset.taille === b.taille)));
  // (v86) plus d'ajout d'ici : une liaison ou un équipement de plus, c'est changer le fichier
  $('ba-ajouter').hidden = true;
  rendreExport(O); }
/* Un onglet du rail : son mot, son compte (à droite, aligné sur les autres), le point rouge d'un problème — l'ambre « à
   voir » se lit dans l'onglet Problèmes, pas en semis de points sur le rail (v74 : « rien qui clignote », l'œil va au rouge).
   Les trois groupes portent leur titre ; au clavier, ↑ ↓ (← → dans la bande étroite) passent d'un onglet à l'autre. */
function rendreOnglets() { const b = app.base, mots = new Map(ONGLETS);
  const ongletHtml = k => { const c = compteOnglet(k), on = k === b.onglet, ko = c.etat === 'ko';
    // les problèmes : deux pastilles, le rouge (à reprendre) et l'ambre (à voir) ; les autres : un nombre
    // (passe 87) la première, ce qui est à régler — rouge s'il y a un problème, ambre plein sinon ; la seconde, ce qui est à voir
    const compte = k === 'problemes' && c.ko != null ? (c.ko || c.att ? `<span class="rc-ns">${c.ko ? `<b class="rc-n ${c.rouge === false ? 'att regler' : 'ko'}" aria-label="${escA(c.ko + ' à régler')}">${c.ko}</b>` : ''}${c.att ? `<b class="rc-n att" aria-label="${escA(c.att + ' à voir')}">${c.att}</b>` : ''}</span>` : '<small>0</small>') : c.n ? `<small>${esc(c.n)}</small>` : '';
    return `<button role="tab" class="rc-onglet" data-onglet="${k}" aria-selected="${on}" tabindex="${on ? 0 : -1}"${c.titre ? ` data-bulle="${escA(c.titre)}"` : ''}><i class="rc-ico" aria-hidden="true"><svg class="ico" viewBox="0 0 24 24">${ICONES_ONGLETS[k] || ''}</svg>${ko && k !== 'problemes' ? '<i class="rc-carre ko" aria-label="un problème"></i>' : ''}</i><span>${esc(mots.get(k))}</span>${compte}</button>`; };
  $('ba-onglets').innerHTML = GROUPES_ONGLETS.map(([g, t, ks]) => `<div class="rc-onglets-g" role="presentation" data-groupe="${g}">${t ? `<span class="rc-onglets-t" aria-hidden="true">${esc(t)}</span>` : ''}${ks.map(ongletHtml).join('')}</div>`).join('');
  // l'onglet choisi reste en vue quand le rail défile (une moitié basse) ou la bande (la feuille étroite)
  const ong = $('ba-onglets'), x = ong.querySelector('[aria-selected="true"]');
  if (x && ong.scrollWidth > ong.clientWidth) { if (x.offsetLeft < ong.scrollLeft) ong.scrollLeft = x.offsetLeft - 8; else if (x.offsetLeft + x.offsetWidth > ong.scrollLeft + ong.clientWidth) ong.scrollLeft = x.offsetLeft + x.offsetWidth - ong.clientWidth + 24; }
  if (x && ong.scrollHeight > ong.clientHeight + 1) { if (x.offsetTop < ong.scrollTop) ong.scrollTop = x.offsetTop - 28; else if (x.offsetTop + x.offsetHeight > ong.scrollTop + ong.clientHeight) ong.scrollTop = x.offsetTop + x.offsetHeight - ong.clientHeight + 8; }
  bordDe(ong); }
// sous pilote automatique (les bancs mesurent les gestes), les puces lourdes ne se comptent pas au repos
const AU_REPOS = !(typeof navigator !== 'undefined' && navigator.webdriver);
function rendreOutils(O) { const b = app.base, pt = portee(O);
  $('ba-portee').hidden = !pt;
  // la portée : « Ce folio · Tout le plan » (le technicien v73 : « Folio 1 · Tout », je ne comprenais pas le segment) ; le
  // folio se lit dans la bulle et dans la barre des folios
  if (pt) { const tous = O.lignes(); $('ba-n-folio').textContent = tous.filter(O.surFolio).length; $('ba-n-tout').textContent = tous.length; $('ba-lib-folio').textContent = 'Ce folio';
    $('ba-lib-folio').parentElement.dataset.bulle = 'Les lignes du folio ' + app.plan + ', celui qu’on regarde';
    const vide = b.portee === 'folio' && !tous.some(O.surFolio) && tous.length > 0;
    $('ba-portee').querySelectorAll('[data-portee]').forEach(x => x.setAttribute('aria-pressed', String(vide ? x.dataset.portee === 'tout' : x.dataset.portee === b.portee)));
    if (vide) $('ba-lib-folio').parentElement.dataset.bulle = 'Rien sur le folio ' + app.plan + ' : voici tout le plan'; }
  const fi = $('ba-filtre'); if (fi.value !== b.filtre && document.activeElement !== fi) fi.value = b.filtre; $('ba-vider').hidden = !b.filtre; ajusterRecherche(O);
  const on = new Set(b.puces[b.onglet] || []), P = pucesDe(O), base = P.length ? lignesDe(O, true) : [], petit = base.length <= PAQUET * 2;
  /* « À REPRENDRE » COMPTE TOUT LE PLAN, le folio en second (le technicien v73 : « À reprendre 3 » sur le folio 1, 4 sur le
     plan — « je ne sais plus combien il m'en reste ») : « À reprendre 4 · 3 sur ce folio ». */
  const surCeFolio = pt && b.portee === 'folio', plan = surCeFolio && P.some(p => p.k === 'probleme') ? lignesDe(O, true, true) : base, petitPlan = plan.length <= PAQUET * 2;
  // une puce qui lit les plans (l'état, les contacts) se compte tout de suite sur une petite portée, au repos sur une grande ;
  // à zéro, elle s'efface d'un cran (elle reste un choix)
  const compte = p => { const touP = p.k === 'probleme' && surCeFolio, n = p.lourd && !(touP ? petitPlan : petit) ? '' : (touP ? plan : base).filter(p.test).length, ici = touP && n !== '' ? base.filter(p.test).length : null;
    return `<small>${n}</small>${ici != null && ici !== n ? `<small class="rc-chip-ici">· ${ici} sur ce folio</small>` : ''}`; };
  const puce = p => { const html = compte(p), zero = /^<small>0<\/small>$/.test(html);
    return `<button class="rc-chip${zero ? ' zero' : ''}" data-puce="${escA(p.k)}" aria-pressed="${on.has(p.k)}"${p.aide ? ` data-bulle="${escA(p.aide)}"` : ''}>${p.avant}<span>${esc(p.t)}</span>${html}</button>`; };
  /* LES FILTRES, L'ESSENTIEL D'ABORD (v74 : la rangée des puces défilait sous un fondu, « Sans co… » à 1440) : la première
     sorte de puces de l'onglet (« À reprendre », le niveau des problèmes) reste dans la barre, avec chaque puce qu'on a
     pressée ; les autres — les routes, ce qui manque — attendent dans « Filtrer », rangées par rubrique, chacune avec son
     compte. Un onglet qui n'en a que deux les garde toutes deux dans la barre. */
  const G = []; P.forEach(p => { const g = G.find(x => x.k === p.groupe); if (g) g.ps.push(p); else G.push({ k: p.groupe, ps: [p] }); });
  const enMenu = new Set(P.length > 2 ? G.slice(1).flatMap(g => g.ps.map(p => p.k)) : []);
  // les puces d'un même groupe (les routes, les niveaux : l'une OU l'autre) se joignent en un seul creux, comme un segment
  $('ba-puces').innerHTML = G.map(g => ({ ...g, ps: g.ps.filter(p => !enMenu.has(p.k) || on.has(p.k)) })).filter(g => g.ps.length)
    .map(g => g.ps.length > 1 ? `<span class="rc-puces-g" role="group" aria-label="${escA(g.k === 'route' ? 'Route' : g.k === 'niveau' ? 'Niveau' : g.k)}">${g.ps.map(puce).join('')}</span>` : puce(g.ps[0])).join('');
  rendreFiltres(P.filter(p => enMenu.has(p.k)), on, compte);
  bordDesPuces();
  if ((!petit || !petitPlan) && P.some(p => p.lourd) && AU_REPOS) { const jeton = RECAP.jeton, go = () => { if (jeton !== RECAP.jeton || $('base').hidden || app.base.edition) return;
      P.filter(p => p.lourd).forEach(p => { document.querySelectorAll(`#ba-puces [data-puce="${CSS.escape(p.k)}"], #ba-filtrer-l [data-puce="${CSS.escape(p.k)}"]`).forEach(x => { x.querySelectorAll('small').forEach(s => s.remove()); x.insertAdjacentHTML('beforeend', compte({ ...p, lourd: false })); x.classList.toggle('zero', /^0$/.test(x.querySelector('small').textContent)); }); }); };
    if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 3000 }); else setTimeout(go, 500); } }
/* (v84 : « Chercher : repère, borne, t… » — un texte coupé dans le champ) l'invite de la recherche tient dans sa place : la
   phrase de l'onglet quand elle y tient, sinon « Chercher… » ; relue quand le champ s'élargit ou se resserre. */
let MESURE_RECHERCHE = null;
function ajusterRecherche(O) { const fi = $('ba-filtre'); if (!fi) return; const long = (O || onglet()).cherche || 'Chercher dans l’onglet', s = getComputedStyle(fi);
  const place = fi.clientWidth - parseFloat(s.paddingLeft || 0) - parseFloat(s.paddingRight || 0) - 1; if (!(place > 0)) { fi.placeholder = long; return; }
  try { MESURE_RECHERCHE = MESURE_RECHERCHE || document.createElement('canvas').getContext('2d'); MESURE_RECHERCHE.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    fi.placeholder = MESURE_RECHERCHE.measureText(long).width <= place ? long : 'Chercher…'; } catch (_) { fi.placeholder = long; } }
/* « FILTRER » : les puces qui ne tiennent pas dans la barre, dans un menu de verre (le patron des menus de documents) — une
   rubrique (la route, ce qui manque), une ligne par puce : sa coche, son trait, son mot, son compte. Une ligne cochée filtre
   (et sa puce paraît, pressée, dans la barre : on voit ce qui filtre, on l'ôte d'un clic) ; le menu reste ouvert d'une
   ligne à l'autre ; Échap, un clic ailleurs le ferment. */
const ICO_FILTRE = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M7 12h10M10 17h4"/></svg>';
const ICO_CHEVRON = '<svg class="ico rc-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const ICO_COCHE = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
function rendreFiltres(ps, on, compte) { const d = $('ba-filtrer'), l = $('ba-filtrer-l'); if (!d || !l) return;
  d.hidden = !ps.length; if (!ps.length) { d.open = false; l.innerHTML = ''; return; }
  const n = ps.filter(p => on.has(p.k)).length, R = []; ps.forEach(p => { const r = R.find(x => x.t === p.rubrique); if (r) r.ps.push(p); else R.push({ t: p.rubrique, ps: [p] }); });
  $('ba-filtrer-n').textContent = n ? String(n) : ''; $('ba-filtrer-b').classList.toggle('actif', n > 0);
  const s = $('ba-filtrer-b'), bulle = 'Les autres filtres : ' + ps.map(p => p.t.toLowerCase()).join(', ');
  if (d.open) s.dataset.bulleFermee = bulle; else s.dataset.bulle = bulle;
  const garde = l.contains(document.activeElement) ? document.activeElement.dataset.puce : null;
  l.innerHTML = R.map(r => `<div class="rc-f-t" role="presentation">${esc(r.t)}</div>` + r.ps.map(p => { const html = compte(p);
    return `<button role="menuitemcheckbox" class="rc-f-l${/^<small>0<\/small>$/.test(html) ? ' zero' : ''}" data-puce="${escA(p.k)}" aria-checked="${on.has(p.k)}"${p.aide ? ` aria-description="${escA(p.aide)}"` : ''}><span class="rc-f-coche">${ICO_COCHE}</span>${p.avant}<span class="rc-f-mot">${esc(p.t)}</span>${html}</button>`; }).join('')).join('');
  if (garde) { const x = l.querySelector(`[data-puce="${CSS.escape(garde)}"]`); if (x) x.focus({ preventScroll: true }); } }
// une puce bascule (celles d'un niveau — Problèmes, À voir — une seule à la fois), de la barre comme du menu
function basculerPuce(k) { const b = app.base, on = new Set(b.puces[b.onglet] || []);
  if (/^niveau:/.test(k)) { const avait = on.has(k); [...on].forEach(p => { if (/^niveau:/.test(p)) on.delete(p); }); if (!avait) on.add(k); }
  else if (on.has(k)) on.delete(k); else on.add(k);
  b.puces[b.onglet] = [...on]; b.toutes = false; memoriserBase(); rendreBase(true); }
/* Les puces et les onglets tiennent sur une ligne : quand ils débordent, ils défilent (la molette aussi) et s'effacent au
   bord qui cache quelque chose — à droite, et à gauche dès qu'on a défilé. */
function bordDe(el) { if (!el) return; const plus = el.scrollWidth > el.clientWidth + 1;
  el.classList.toggle('deborde', plus && el.scrollLeft + el.clientWidth < el.scrollWidth - 2); el.classList.toggle('deborde-g', plus && el.scrollLeft > 2); }
function bordDesPuces() { bordDe($('ba-puces')); }
/* Ce que l'onglet montre : les lignes de la portée, de la recherche et des puces, triées. (v86 : plus de ligne neuve en tête
   — rien ne s'ajoute ici ; `tete` reste vide.) */
function lignesMontrees(O) { const tous = O.lignes(); return { tete: [], tous, L: lignesDe(O) }; }
/* La table : l'en-tête (trier au clic), les lignes — d'abord celles qu'on vient d'ajouter —, un intercalaire par folio
   quand « Tout » se lit sans tri ni recherche, un par GENRE dans l'onglet Problèmes (08-controle : son compte, « Voir le
   premier », le geste qui le traite). La dernière colonne (`rc-suppr` : la croix d'une liaison) prend la place qui
   reste : les colonnes se lisent serrées, à gauche.
   AU-DELÀ DE VIRTUEL_DES LIGNES, LA TABLE EST VIRTUELLE (l'audit de fluidité, P2 : « Tout montrer » posait 137 000 nœuds
   pour 3 000 liaisons, et le défilement tombait à 3 images/s) : seules les lignes sous les yeux (et une marge) sont
   posées, entre deux espaces qui tiennent la hauteur des autres ; chaque ligne posée dit sa vraie hauteur, que la suite
   reprend. Plus de « Tout montrer » : tout se lit en défilant. En deçà, tout est posé, le premier paquet tout de suite
   (jusqu'à la ligne choisie), les suivants aux images d'après. */
const PAQUET = 120, VIRTUEL_DES = 300, MARGE_VIRTUELLE = 700, H_LIGNE = 44, H_GROUPE = 40;
// l'en-tête d'une colonne : son mot, et la flèche du tri (qui paraît au survol d'un en-tête qui se trie)
const FLECHE_TRI = '<svg class="ico rc-sens" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
// la largeur des chiffres d'une colonne de mesures, quand son en-tête est plus large qu'eux : ils se rangent dessous
const largeurCol = c => c.w ? ` style="--w:${c.w}px"` : '';
// les intercalaires par genre : l'onglet Problèmes lu tel quel (ni tri, ni recherche, ni puce)
const groupesParGenre = () => app.base.onglet === 'problemes' && !app.base.tri && !app.base.filtre.trim() && !pucesActives(PROBLEMES).length && typeof genresDuControle === 'function';
/* UNE COLONNE QUI NE DIRAIT RIEN NE SE POSE PAS (le lecteur : « retire ce qui ne sert à rien : les colonnes de tirets, les
   répétitions ») : une colonne qui sait se dire vide (`vide`) et l'est pour chaque ligne montrée — l'état quand tout va bien,
   la norme ou le band-it que rien ne porte, le calibre du fichier quand c'est le retenu — s'efface ; une ligne qui la
   remplit la fait revenir. Au-delà d'une table virtuelle, on ne lit pas toutes les lignes pour le savoir : elle reste. */
function colonnesUtiles(C, rs) { const xs = rs.filter(r => !r.nouveau), tri = app.base.tri, choix = app.base.colonnes[app.base.onglet] || {}; if (!xs.length || xs.length > VIRTUEL_DES) return C;
  // (v84) une colonne venue d'office avec la largeur (`large`, que personne n'a cochée) doit servir à au moins la moitié des
  // lignes : sinon c'est une grande colonne vide sous les yeux (les contacts de quelques câbles seulement)
  const auto = c => c.option && c.large && !(c.k in choix);
  // (la colonne qui trie reste : son en-tête est le seul geste qui défait le tri)
  return C.filter(c => { if (!c.vide || (tri && tri.k === c.k)) return true; try { if (auto(c)) return xs.filter(r => !c.vide(r)).length * 2 >= xs.length; return !xs.every(c.vide); } catch (_) { return true; } }); }
function rendreTable(O, C) { const b = app.base, tri = b.tri, jeton = ++RECAP.jeton;
  $('ba-tab').dataset.onglet = b.onglet;
  // (v84) un autre onglet : ses lignes paraissent d'un fondu court (une fois — pas à chaque correction)
  if (RECAP.ongletVu !== b.onglet) { const t = $('ba-tab'), premier = RECAP.ongletVu == null; RECAP.ongletVu = b.onglet;
    if (!premier) { t.classList.remove('rc-entre'); void t.offsetWidth; t.classList.add('rc-entre'); } }
  const { tete, L, tous } = lignesMontrees(O), parFolio = groupesParFolio(), parGenre = groupesParGenre();
  C = colonnesUtiles(C, [...tete, ...L]); const n = C.length + 1;
  /* LA NOTE D'UNE COLONNE (v74) : ce qui vaut pour toutes les lignes montrées — « supposée » quand aucune longueur n'est
     mesurée — se dit UNE fois, dans l'en-tête (sa bulle dit pourquoi), et les lignes se taisent ; une exception se dit sur sa ligne. */
  RECAP.notes = {}; C.forEach(c => { const x = c.note && L.length ? c.note(L) : null; if (x) RECAP.notes[c.k] = x; });
  const note = c => { const x = RECAP.notes[c.k]; return x ? ` data-note="${escA(x[0])}" data-bulle="${escA(x[1])}"` : ''; };
  $('ba-thead').innerHTML = '<tr>' + C.map(c => { const t = tri && tri.k === c.k, triable = !!c.tri;
    return `<th data-k="${c.k}" class="${c.cls || ''}${t ? ' tri' + (tri.sens > 0 ? '' : ' desc') : ''}"${largeurCol(c)}${note(c)}${triable ? ` tabindex="0" role="button" aria-label="${escA('Trier par ' + (c.titre || c.t).toLowerCase())}" aria-sort="${t ? (tri.sens > 0 ? 'ascending' : 'descending') : 'none'}"` : ''}>${c.t ? `<span class="rc-th-l">${esc(c.t)}${triable ? FLECHE_TRI : ''}</span>` : ''}</th>`; }).join('') + '<th class="rc-suppr"></th></tr>';
  RECAP.vues = new Map(); RECAP.liste = [...tete, ...L]; RECAP.liste.forEach(r => RECAP.vues.set(r.k, r));
  // les morceaux : { f: son HTML, h: sa hauteur estimée, k: la clé de sa ligne (rien pour un intercalaire) }
  const morceaux = tete.map(r => ({ f: () => ligneHtml(O, C, r, true), h: H_LIGNE, k: r.k })), ligne = r => morceaux.push({ f: () => ligneHtml(O, C, r), h: H_LIGNE, k: r.k });
  if (parFolio) { const par = new Map(); L.forEach(r => { const p = premierFolio(r.l); (par.get(p) || par.set(p, []).get(p)).push(r); });
    // l'intercalaire d'un folio : ses liaisons, ses problèmes et ses points à voir — un point et un mot, comme l'état d'une
    // ligne (comptés quand il se pose, avec ses lignes) ; le folio affiché porte un point d'encre
    par.forEach((rs, p) => { morceaux.push({ h: H_GROUPE, f: () => { const ko = rs.filter(r => O.etat(r) === 'ko').length, att = rs.filter(r => O.etat(r) === 'att').length;
      return `<tr class="rc-groupe${p === app.plan ? ' ici' : ''}"><td colspan="${n}"><span class="rc-groupe-l"><button class="rc-f" data-plan="${escA(p)}" data-bulle="${escA(p ? 'Aller au folio ' + p : 'Les liaisons sans folio')}">${p ? 'Folio ' + esc(p) : 'Sans folio'}</button><span class="rc-groupe-n">${plurielLie(rs.length, 'liaison')}</span>`
        + `${ko ? etatHtml('ko', plurielLie(ko, 'problème')) : ''}${att ? etatHtml('att', att + INSECABLE + 'à voir') : ''}</span></td></tr>`; } });
      rs.forEach(ligne); }); }
  else if (parGenre) { const G = genresARegler(), rang = new Map(); G.forEach((g, i) => g.lignes.forEach(l => l.xs.forEach(x => rang.set(x, i))));
    const par = new Map(); L.forEach(r => { const i = rang.has(r.x) ? rang.get(r.x) : G.length; (par.get(i) || par.set(i, []).get(i)).push(r); });
    /* (v84) DU PLUS GRAVE AU MOINS GRAVE, et ça se voit : un intercalaire (« À régler · 5 », puis « À voir · 7 ») avant ses
       genres ; chaque genre dit son compte, son mot, ses repères, et le geste qui le traite d'un coup quand il existe — plus de
       « Voir le premier » : chaque ligne y mène. (passe 87, S4) Rangés comme la fiche (`genresARegler`) : « À régler » au rouge
       s'il y a un problème, à l'ambre sinon ; « À voir », calme. */
    const ordre = [...par.keys()].sort((a, c) => a - c), parNiveau = new Map(), rougeR = G.some(g => g.regler && g.niveau === 'ko');
    const niv = i => G[i] && G[i].regler ? 'regler' : 'voir';
    ordre.forEach(i => parNiveau.set(niv(i), (parNiveau.get(niv(i)) || 0) + par.get(i).length));
    let niveau = null;
    ordre.forEach(i => { const g = G[i], rs = par.get(i), nv = niv(i);
      if (nv !== niveau && parNiveau.size > 1) { niveau = nv; const t = nv === 'regler' ? 'À régler' : 'À voir', c = parNiveau.get(nv), cls = nv === 'regler' ? (rougeR ? 'ko' : 'att') : 'voir';
        morceaux.push({ h: H_GROUPE, f: () => `<tr class="rc-niveau ${cls}"><td colspan="${n}"><span class="rc-niveau-l"><i aria-hidden="true"></i>${t}<b class="rc-n">${c}</b></span></td></tr>` }); }
      if (g) morceaux.push({ h: H_GROUPE + 8, f: () => { const ge = gesteDuGenre(g), noms = [...g.noms], va = ge && /^Voir /.test(ge.mot);
        return `<tr class="rc-groupe rc-genre ${g.niveau}"><td colspan="${n}"><span class="rc-groupe-l"><b class="rc-genre-n">${g.n}</b><b class="rc-genre-mot">${esc(motDuGenre(g.genre, g.n))}</b>`
          + (noms.length === 1 && g.n > 1 ? `<span class="rc-groupe-n">${esc(noms[0])}</span>` : noms.length && noms.length !== g.n && noms.length !== 1 ? `<span class="rc-groupe-n">${esc(plurielLie(noms.length, 'repère'))}</span>` : '')
          + (ge ? `<button type="button" class="${va ? 'rc-lien' : 'btn papier dense'} rc-genre-geste" data-geste="${escA(g.cle)}" data-bulle="${escA(ge.aide)}">${esc(ge.mot)}</button>` : '') + '</span></td></tr>'; } });
      rs.forEach(ligne); }); }
  else L.forEach(ligne);
  // le pied (onglet Câbles : le total, la masse par route), dès qu'il y a de quoi additionner
  if (O.total && L.length > 1) morceaux.push({ h: H_LIGNE, f: () => O.total(L, C) });
  /* (v86, G1) LES LIGNES QUI DEMANDENT LA MÊME CHOSE SE REGROUPENT : sans intercalaire entre elles, au même niveau, le même
     geste (la même clé : le même câble, le même disjoncteur) ou la même phrase — une seule case « Ce qu'il faut faire »
     court sur leurs lignes (plus de « ″ » dessous) ; une table virtuelle (au-delà de 300 lignes) garde une case par ligne.
     (v84) L'objet qui se répète d'une ligne à la suivante s'écrit plus doux. Les lignes se posent après : le calcul est prêt. */
  RECAP.parGenre = !!parGenre; RECAP.groupes = new Map(); RECAP.memes = new Set();
  if (O === PROBLEMES) { let tete = null, avant = null, nom = null; const virtuel = morceaux.length > VIRTUEL_DES;
    morceaux.forEach(m => { if (m.k == null) { tete = null; avant = null; nom = null; return; } const r = RECAP.vues.get(m.k), s = r ? (rangDuPoint(r.x).regler ? 'regler' : 'voir') + '\u0001' + signatureGestes(r) : '', x = r && r.x.nom;
      if (!virtuel) { if (s && s === avant && tete) { RECAP.groupes.get(tete).n++; RECAP.groupes.set(m.k, { suite: true, tete }); } else { tete = m.k; RECAP.groupes.set(m.k, { n: 1 }); } }
      if (x && x === nom) RECAP.memes.add(m.k); avant = s; nom = x; }); }
  // un onglet vide le dit sous ses en-têtes, au milieu de la feuille (hors de la table : sa dernière colonne prend tout)
  // (v84) un onglet vide ne pose pas d'en-têtes : sans lignes, ils se tassaient à gauche (« DE CÂBLE VERS… »), sans rien dire
  const vide = assurerVide(), rien = !L.length && !tete.length; vide.innerHTML = rien ? videRecap(O, tous.length) : ''; vide.hidden = !rien; $('ba-thead').hidden = rien;
  const corps = $('ba-tbody'), choisie = morceaux.findIndex(m => { const r = m.k != null && RECAP.vues.get(m.k); return r && !r.nouveau && O.choisie(r); });
  if (morceaux.length > VIRTUEL_DES) { RECAP.virtuel = { morceaux, n, debut: -1, fin: -1, jeton }; corps.innerHTML = '';
    if (choisie >= 0 && b.defiler) { let y = 0; for (let i = 0; i < choisie; i++) y += morceaux[i].h; $('ba-corps').scrollTop = Math.max(0, y - $('ba-corps').clientHeight / 2); }
    peindreFenetre(true); return; }
  RECAP.virtuel = null;
  // le premier paquet va jusqu'à la ligne choisie (on la fait venir sous les yeux)
  const d = Math.max(PAQUET, choisie >= 0 ? choisie + 20 : 0), poser = (a, z) => morceaux.slice(a, z).map(m => m.f()).join('');
  corps.innerHTML = poser(0, d); calerChiffres();
  if (d < morceaux.length) { let k = d; const suite = () => { if (jeton !== RECAP.jeton || $('base').hidden) return;
      corps.insertAdjacentHTML('beforeend', poser(k, k + PAQUET * 2)); calerChiffres(true); k += PAQUET * 2; if (k < morceaux.length) requestAnimationFrame(suite); };
    requestAnimationFrame(suite); } }
/* LES CHIFFRES CENTRÉS SOUS LEUR TITRE, ALIGNÉS ENTRE EUX (la charte : « chaque valeur centrée sous son titre quand c'est un
   chiffre ») : dans une colonne de nombres, chaque valeur est alignée à droite dans une place de la largeur de la plus
   longue (les virgules et les unités tombent l'une sous l'autre), et cette place est centrée sous le titre. La largeur se
   mesure sur les lignes posées (un seul calcul de mise en page), elle va à la table (`--wc<n>`, la n-ième colonne :
   style-x-recap.css) ; une table virtuelle ne fait que l'élargir en défilant. */
const NUMERIQUE = /\brc-c-(n|mesure|int)\b/;
function calerChiffres(garder) { const t = $('ba-tab'), ths = [...$('ba-thead').querySelectorAll('th')], idx = ths.map((th, i) => NUMERIQUE.test(th.className) ? i + 1 : 0).filter(Boolean);
  if (!garder) { for (let i = 1; i <= 16; i++) t.style.removeProperty('--wc' + i); RECAP.cale = {}; }
  if (!idx.length) return;
  t.classList.add('rc-cale'); const w = idx.map(i => { let m = 0; $('ba-tbody').querySelectorAll(`tr:is([data-k],.rc-total) > td:nth-child(${i}) .rc-chiffre`).forEach(x => { m = Math.max(m, x.getBoundingClientRect().width); }); return Math.ceil(m); });
  t.classList.remove('rc-cale');
  idx.forEach((i, j) => { const x = Math.max(w[j], (RECAP.cale || {})[i] || 0); if (!x) return; (RECAP.cale || (RECAP.cale = {}))[i] = x; t.style.setProperty('--wc' + i, x + 'px'); }); }
/* LA FENÊTRE d'une table virtuelle : les morceaux sous les yeux (et MARGE_VIRTUELLE au-dessus et au-dessous), entre deux
   espaces ; les hauteurs vraies de ce qui vient d'être posé remplacent les estimées. Rien ne change sous les doigts : pas
   pendant qu'on écrit dans une case ; la case qui a le clavier le garde. */
const espaceVirtuel = (h, n) => h > 0 ? `<tr class="rc-espace" aria-hidden="true"><td colspan="${n}" style="height:${Math.round(h)}px;padding:0;border:0"></td></tr>` : '';
function peindreFenetre(force) { const V = RECAP.virtuel; if (!V || $('base').hidden || (app.base.edition && !force)) return;
  const c = $('ba-corps'), corps = $('ba-tbody'), haut = c.scrollTop - 36, H = c.clientHeight || 400, M = V.morceaux;
  let y = 0, i = 0; while (i < M.length && y + M[i].h < haut - MARGE_VIRTUELLE) { y += M[i].h; i++; }
  const debut = i, avant = y; while (i < M.length && y < haut + H + MARGE_VIRTUELLE) { y += M[i].h; i++; }
  const fin = i; if (!force && debut === V.debut && fin === V.fin) return;
  let apres = 0; for (let j = fin; j < M.length; j++) apres += M[j].h;
  const a = document.activeElement, garde = corps.contains(a) ? caseDe(a) : null;
  corps.innerHTML = espaceVirtuel(avant, V.n) + M.slice(debut, fin).map(m => m.f()).join('') + espaceVirtuel(apres, V.n);
  V.debut = debut; V.fin = fin; calerChiffres(!!V.cale); V.cale = true;
  [...corps.children].filter(tr => !tr.classList.contains('rc-espace')).forEach((tr, j) => { const m = M[debut + j]; if (m && tr.offsetHeight) m.h = tr.offsetHeight; });
  if (garde) { const el = elementDe(garde); if (el) { try { el.focus({ preventScroll: true }); } catch (_) { el.focus(); } } } }
// amener la ligne d'une clé sous les yeux (la ligne choisie, une case qu'on édite), même hors de la fenêtre
function amenerLigne(k) { const V = RECAP.virtuel; if (!V) return; const i = V.morceaux.findIndex(m => m.k === k); if (i < 0) return;
  if (i >= V.debut && i < V.fin) return; let y = 0; for (let j = 0; j < i; j++) y += V.morceaux[j].h; const c = $('ba-corps'); c.scrollTop = Math.max(0, y - c.clientHeight / 2); peindreFenetre(true); }
/* LES VIDES : une icône au trait dans un carré doux, une phrase (ce qui manque, puis pourquoi), UNE action — effacer ce
   qui filtre, voir tout le contrat, ou écrire la première ligne. */
/* (v84, la charte : « jamais de “aucun …” — rien, ou une information pertinente ») : chaque vide dit ce qui viendra ici, et
   d'où. */
// (v86) les liaisons et les équipements viennent de votre fichier : le vide dit d'où ils viendront, pas « écrivez-les ici »
const VIDES = { liaisons: ['Les liaisons de votre fichier viendront ici', 'Déposez votre fichier sur la table : VOLTA en lit chaque ligne.'], equipements: ['Les équipements de votre fichier viendront ici', 'Chaque repère de vos liaisons qui n’est ni un disjoncteur, ni une barrette, ni une prise.'],
  disjoncteurs: ['Les disjoncteurs viendront ici', 'Un repère au code CB : son calibre, son verdict et son profil de charge se lisent ici.'], barrettes: ['Les barrettes viendront ici', 'Celles du contrat (code VT), et celles que VOLTA ajoute quand plusieurs câbles partagent une borne.'],
  prises: ['Les prises de coupure viendront ici', 'Un repère au code VC : son arrangement et ses contacts se lisent ici.'], cables: ['Les types de câble viendront ici', 'Un câble compte dès que sa liaison a un « de » et un « vers ».'],
  raccords: ['Les raccords viendront ici', 'Un raccord se choisit pour chaque connecteur d’équipement.'], problemes: ['Rien à reprendre', 'Chaque câble, chaque calibre, chaque contact est vérifié.'], normes: ['Les normes viendront ici', 'Elles jugent le contrat dès qu’il a des liaisons.'] };
const ICO_VIDE = { loupe: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>', folio: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 9h16M9 9v10"/>', ok: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  table: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 10h17M3.5 14.5h17M9.5 10v9"/>' };
const icoVide = (k, cls) => `<span class="rc-vide-ico${cls ? ' ' + cls : ''}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICO_VIDE[k]}</svg></span>`;
function videRecap(O, nTous) { const b = app.base, cherche = b.filtre.trim(), puces = pucesActives(O).length;
  const bloc = (ico, titre, phrase, action) => `<div class="rc-vide-etat">${ico}<b>${titre}</b><span>${phrase}</span>${action || ''}</div>`;
  if (nTous) {
    /* (v84) le bloc choisi sur le plan filtre chaque onglet : sous un onglet qui ne l'a pas, dire où il est (« 102CB1 est un
       disjoncteur ») et y mener — plus « la recherche lit chaque colonne », qui ne parlait pas de lui */
    if (cherche && b.filtreAuto && !puces) { const g = genreDuRepere(cherche), ou = { cb: 'disjoncteurs', barrette: 'barrettes', coupure: 'prises', eqpt: 'equipements' }[g], mot = (ONGLETS.find(([k]) => k === ou) || [])[1];
      const reperes = ['equipements', 'disjoncteurs', 'barrettes', 'prises'].includes(b.onglet);
      return reperes && ou && ou !== b.onglet ? bloc(icoVide('folio'), `${esc(cherche)} est dans l’onglet ${esc(mot)}`, 'Le bloc choisi sur le plan filtre chaque onglet sur lui.', `<button class="btn papier" data-onglet-vers="${escA(ou)}">Voir ${esc(cherche)} dans ${esc(mot)}</button>`)
        : bloc(icoVide('folio'), `Rien sur ${esc(cherche)} dans cet onglet`, 'Le bloc choisi sur le plan filtre chaque onglet sur lui.', '<button class="btn papier" id="ba-effacer">Voir tout l’onglet</button>'); }
    if (cherche || puces) return bloc(icoVide('loupe'), cherche && !b.filtreAuto ? `Rien ne correspond à «${INSECABLE}${esc(cherche)}${INSECABLE}»` : 'Rien qui corresponde',
      cherche && puces ? 'La recherche et ' + (puces > 1 ? 'les filtres pressés' : 'le filtre pressé') + ' se cumulent.' : puces ? (puces > 1 ? 'Les filtres pressés se cumulent : ôtez-en un pour élargir.' : 'Ôtez-le pour revoir tout l’onglet.') : 'La recherche lit chaque colonne de l’onglet, même celles qu’on ne montre pas.', `<button class="btn papier" id="ba-effacer">${cherche && puces ? 'Effacer la recherche et les filtres' : cherche ? 'Effacer la recherche' : 'Ôter les filtres'}</button>`);
    return bloc(icoVide('folio'), 'Rien sur ce folio', 'Le folio ' + esc(app.plan) + ' n’a aucune ligne de cet onglet.', '<button class="btn papier" data-portee-tout="1">Voir tout le contrat</button>'); }
  const [titre, phrase] = VIDES[b.onglet] || ['Rien à montrer', ''];
  return bloc(b.onglet === 'problemes' ? icoVide('ok', 'ok') : icoVide('table'), titre, phrase, O.ajout && O.ajouter ? `<button class="btn papier" data-ajouter="1">${ICONE_PLUS}${esc(O.ajout)}</button>` : ''); }
const ICONE_PLUS = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
// la place du vide, sous la table ; ses gestes sont ceux de la table (effacer, voir tout, écrire la première ligne)
function assurerVide() { let v = $('ba-vide'); if (v) return v; v = document.createElement('div'); v.id = 'ba-vide'; v.className = 'rc-vide-zone'; v.hidden = true; $('ba-corps').appendChild(v);
  v.addEventListener('click', e => { const b = app.base, O = onglet();
    if (e.target.closest('#ba-effacer')) { b.filtre = ''; b.filtreAuto = false; $('ba-filtre').value = ''; b.puces[b.onglet] = []; memoriserBase(); rendreBase(true); }
    else if (e.target.closest('[data-portee-tout]')) { b.portee = 'tout'; memoriserBase(); rendreBase(true); }
    else if (e.target.closest('[data-onglet-vers]')) { const k = e.target.closest('[data-onglet-vers]').dataset.ongletVers; changerOnglet(k); const n = $('ba-onglets').querySelector(`[data-onglet="${k}"]`); if (n) n.focus({ preventScroll: true }); }
    else if (e.target.closest('[data-ajouter]') && O.ajouter) O.ajouter(); });
  return v; }
/* LA LIGNE CHOISIE suit le plan : la liaison du câble choisi est posée sur le gris doux ; un BLOC choisi ne fait pas de
   ses liaisons des lignes choisies — elles gardent un filet, et le repère du bloc se surligne là où il paraît (de ou
   vers). `on` reste la marque de ce que le plan désigne ; `lie` dit qu'elle y tient par un bloc. */
// (les lignes qui tiennent au bloc par lui — ses liaisons, ses problèmes, ses raccords — : la recherche dit déjà son nom,
// elles ne se teintent pas toutes de cuivre ; seule la ligne qui EST l'objet choisi se pose sur le cuivre)
const parUnBloc = O => (O === LIAISONS || O === PROBLEMES || O === RACCORDS) && !!app.cible && app.cible.type === 'bloc';
/* UNE LIGNE : ses cases, puis la dernière, qui prend la place qui reste (« Voir › » au bout d'un problème). (v86 : plus de
   croix « Supprimer » — retirer une liaison, c'est changer le fichier.) Un groupe de problèmes qui demandent la même chose :
   la case « Ce qu'il faut faire » de sa première ligne court sur les suivantes (`rowspan`), qui n'en posent pas. */
function ligneHtml(O, C, r, neuve) { RECAP.vues.set(r.k, r); const et = O.etat(r), on = O.choisie(r), lie = on && parUnBloc(O);
  const G = O === PROBLEMES ? RECAP.groupes.get(r.k) : null, groupe = G && G.n > 1 ? 'tete' : G && G.suite ? 'suite' : '';
  const cls = [et, on ? 'on' : '', lie ? 'lie' : '', neuve ? 'neuve' : '', O.hors && O.hors(r) ? 'rc-hors' : '', groupe ? 'rc-grp-' + groupe : ''].filter(Boolean).join(' ');
  return `<tr data-k="${escA(r.k)}"${r.l ? ` data-i="${r.i}"` : ''}${cls ? ` class="${cls}"` : ''}>`
    + C.map(c => c.k === 'que' && groupe === 'suite' ? '' : `<td class="${c.cls || ''}"${largeurCol(c)}${c.k === 'que' && groupe === 'tete' ? ` rowspan="${G.n}"` : ''}>${c.html(r)}</td>`).join('')
    + `<td class="rc-suppr">${O === PROBLEMES ? FLECHE_VOIR : ''}</td></tr>`; }
// (v84) une ligne de problème mène à sa fiche : au survol, une flèche le dit au bout de la ligne
const FLECHE_VOIR = '<span class="rc-voir" aria-hidden="true">Voir<svg class="ico" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></span>';
function marquerLignes() { if ($('base').hidden) return; const O = onglet(), bloc = parUnBloc(O) ? app.cible.nom : '';
  $('ba-tbody').querySelectorAll('tr[data-k]').forEach(tr => { const r = RECAP.vues.get(tr.dataset.k), on = !!r && !r.nouveau && O.choisie(r);
    tr.classList.toggle('on', on); tr.classList.toggle('lie', on && !!bloc);
    tr.querySelectorAll('.rc-bout').forEach(s => { const v = s.querySelector('[data-f="de"],[data-f="vers"]'); s.classList.toggle('ici', on && !!bloc && !!v && v.textContent === bloc); }); }); }

/* ---- ÉDITER UNE CASE : double-clic, Entrée ou F2 ; Tab la suivante, Échap annule ---- */
// les touches seules de l'outil (08-interface, le clavier du plan) : sur une case, elles ne s'écrivent pas, elles agissent
const TOUCHES_DE_L_OUTIL = new Set(['b', 'p', 'P', 'r', 'n', 'f', '/', '?']);
const caseDe = el => { const v = el && el.closest && el.closest('[data-f]'), tr = v && v.closest('tr[data-k]'); return v && tr ? { k: tr.dataset.k, f: v.dataset.f } : null; };
const elementDe = c => c && $('ba-tbody').querySelector(`tr[data-k="${CSS.escape(c.k)}"] [data-f="${CSS.escape(c.f)}"]`);
function editerCase(k, f) { if (!elementDe({ k, f })) amenerLigne(k); const el = elementDe({ k, f }); if (el) editer(el); }
function datalist(nom) { const V = verite(), xs = nom === 'reperes' ? reperesDe(V) : nom === 'pns' ? [...new Set(V.flatMap(l => [l.pnDe, l.pnVers]).filter(Boolean))]
    : nom === 'types' ? [...new Set([...V.map(l => l.type), ...cablesDe(app.norme).map(c => c.cable || c.type)].filter(Boolean))] : nom === 'routes' ? [...routes().keys()] : nom === 'folios' ? plans() : [];
  return xs.sort(triNaturel); }
/* (v86, une seule source) UNE CASE DU FICHIER NE S'ÉDITE PAS : un double-clic, Entrée ou F2 posent sur elle une bulle qui dit
   d'où vient la valeur et où la changer — dans votre fichier, que VOLTA relira. */
function signalerFichier(el, f) { const t = motDuFichier(f) + ' vient de votre fichier.\nÀ changer dans votre fichier : VOLTA le relira.', c = caseDe(el);
  if (typeof montrerBulle !== 'function') { dire(t.replace('\n', ' ')); return; }
  const montrer = () => { const e = (c && elementDe(c)) || el; if (!e || !e.isConnected) return; const avant = e.getAttribute('data-bulle');
    e.setAttribute('data-bulle', t); montrerBulle(e); if (avant != null) e.setAttribute('data-bulle', avant); else e.removeAttribute('data-bulle'); };
  // (le premier appui d'un double-clic a pu choisir la ligne et ouvrir sa fiche : la table se refait et éteint la bulle — elle revient)
  montrer(); setTimeout(montrer, 220); }
function editer(el) { const b = app.base, O = onglet(), c = caseDe(el); if (!c || b.edition) return false; const r = RECAP.vues.get(c.k); if (!r) return false;
  if (el.classList.contains('rc-lu')) { signalerFichier(el, c.f); return true; }
  if (!O.editeur) return false;
  const E = O.editeur(r, c.f); if (!E) return false;
  if (E.action) { E.action(); return true; }
  if (typeof cacherBulle === 'function') cacherBulle();
  if (r.l) { app.actif = r.l; if (!(app.cible && app.cible.type === 'bloc')) app.cible = { type: 'fil', l: r.l }; rallumer(); }
  let inp;
  if (E.options) { inp = document.createElement('select'); inp.innerHTML = E.options.map(([v, t]) => `<option value="${escA(v)}"${String(v) === String(E.valeur) ? ' selected' : ''}>${esc(t)}</option>`).join(''); }
  else { inp = document.createElement('input'); inp.value = E.valeur; inp.spellcheck = false; inp.autocomplete = 'off'; if (E.ph) inp.placeholder = E.ph;
    const xs = Array.isArray(E.liste) ? E.liste : E.liste ? datalist(E.liste) : null;
    if (xs && xs.length) { const id = 'rc-dl-' + (++RECAP.datalist), dl = document.createElement('datalist'); dl.id = id; dl.innerHTML = xs.slice(0, 400).map(x => `<option value="${escA(x)}">`).join(''); el.appendChild(dl); inp.setAttribute('list', id); } }
  inp.className = 'rc-saisie'; inp.dataset.f = c.f; inp.setAttribute('aria-label', LIBELLES_CHAMPS[c.f] || (O.colonnes.find(x => x.k === c.f || c.f.startsWith(x.k)) || {}).t || c.f); if (E.aide) inp.title = E.aide;
  // la valeur reste dessous, invisible (elle tient la largeur de sa colonne) ; le champ flotte à sa place
  el.classList.add('edite'); el.dataset.avant = el.innerHTML; const fantome = document.createElement('span'); fantome.className = 'rc-fantome'; fantome.setAttribute('aria-hidden', 'true');
  [...el.childNodes].forEach(n => { if (n.tagName !== 'DATALIST') fantome.appendChild(n); }); if (!fantome.textContent) fantome.textContent = ' '; el.prepend(inp); el.appendChild(fantome);
  // la largeur du champ suit ce qu'on y écrit (la chasse fixe : 8 px le signe), plus la flèche d'une liste de choix
  const large = n => Math.max(96, Math.min(340, (n + 4) * 8 + (inp.getAttribute('list') ? 24 : 0))) + 'px';
  if (inp.tagName === 'INPUT') inp.style.width = large(Math.max(inp.value.length, Math.round((E.ph || '').length * 0.7)));
  b.edition = { k: c.k, f: c.f, el, inp, avant: E.toujours ? null : inp.value }; b.enSaisie = true; RECAP.edite = Date.now();
  inp.focus(); if (inp.select) try { inp.select(); } catch (_) { }
  inp.addEventListener('input', () => { if (inp.tagName === 'INPUT' && parseFloat(large(inp.value.length)) > parseFloat(inp.style.width)) inp.style.width = large(inp.value.length); });
  if (inp.tagName === 'SELECT') inp.addEventListener('change', () => finirEdition('ok', 'meme'));
  inp.addEventListener('blur', () => setTimeout(() => { if (b.edition && b.edition.inp === inp) finirEdition('ok', null); }, 0));
  return true; }
/* Finir l'édition : l'écrire (`ok`) ou la laisser (`annule`) ; puis le curseur va où le geste le dit — `suivante` (Tab),
   `precedente` (Maj+Tab), `dessous` (Entrée), `meme` (la case), null (là où le clic l'a mis). */
function finirEdition(mode, vers) { const b = app.base, ed = b.edition; if (!ed) return; b.edition = null;
  const O = onglet(), r = RECAP.vues.get(ed.k), v = ed.inp.value.trim(), voulue = vers ? voisine(ed, vers) : null;
  let ecrit = false; b.focus = null; RECAP.renomme = null;
  if (mode === 'ok' && r && (ed.avant == null || v !== ed.avant.trim() || r.nouveau)) { b.enSaisie = true; try { ecrit = !!O.ecrire(r, ed.f, v); } finally { b.enSaisie = false; } }
  b.enSaisie = false; app.actif = null;
  // où va le curseur : ce que l'écriture demande (un équipement neuf : son type), sinon la case voulue — sur la ligne
  // renommée, sous son nouveau nom
  const R = RECAP.renomme, cible = b.focus || (voulue && R && voulue.k === R[0] ? { k: R[1], f: voulue.f } : voulue); b.focus = null;
  if (r && r.nouveau && !ecrit) b.nouveau = false;
  if (!ecrit && ed.el.isConnected) { ed.el.classList.remove('edite'); ed.el.innerHTML = ed.el.dataset.avant || ''; }
  rendreBase(ecrit || b.sale || (r && r.nouveau));
  const n = cible && elementDe(cible);
  if (n && vers && vers !== 'meme' && vers !== 'dessous' && vers !== 'dessus') editer(n);
  else if (n && (vers || cible !== voulue)) { try { n.focus({ preventScroll: true }); } catch (_) { n.focus(); } n.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  rallumer(); }
// la case d'à côté : dans l'ordre des cases de la table (une ligne, puis la suivante), ou la même case une ligne plus bas
function voisine(ed, vers) { const tab = vers === 'suivante' || vers === 'precedente';
  // Tab passe d'une valeur qu'on écrit à la suivante : une valeur calculée qui mène ailleurs (l'intensité) se saute
  // (v86 : et une case du fichier, qui ne s'écrit pas)
  const toutes = [...$('ba-tbody').querySelectorAll('tr[data-k] [data-f]')].filter(x => x.tagName !== 'INPUT' && x.tagName !== 'SELECT' && (!tab || x === ed.el || !x.classList.contains('rc-calc') && !x.classList.contains('rc-lu'))), i = toutes.indexOf(ed.el);
  if (vers === 'meme') return { k: ed.k, f: ed.f };
  if (vers === 'dessous' || vers === 'dessus') { const trs = [...$('ba-tbody').querySelectorAll('tr[data-k]')], j = trs.findIndex(t => t.dataset.k === ed.k);
    for (let n = j + (vers === 'dessous' ? 1 : -1); n >= 0 && n < trs.length; n += vers === 'dessous' ? 1 : -1) if (trs[n].querySelector(`[data-f="${CSS.escape(ed.f)}"]`)) return { k: trs[n].dataset.k, f: ed.f };
    return { k: ed.k, f: ed.f }; }
  const x = toutes[i + (vers === 'suivante' ? 1 : -1)]; return x ? caseDe(x) : null; }

/* ---- OUVRIR, FERMER, LA TAILLE ---------------------------------------------- */
function appliquerTailleBase() { if (app.base.hauteur) document.documentElement.style.setProperty('--base-h', app.base.hauteur + 'px'); }
/* LE PLAN GARDE SON ÉCHELLE (l'audit v72, P1-3 : en moitié, le folio passait de 59 % à 20 % — une vignette — alors qu'on
   ouvre le récapitulatif pour corriger EN REGARDANT le plan). Le tiroir glisse dessous : l'échelle ne bouge pas ; le plan
   monte d'un rien (le haut de la feuille, s'il était plus bas, vient sous la barre) ; ce qu'on a choisi reste dans la place
   libre, à la même échelle (`montrerSiCache`). Le tiroir se ferme : la vue d'avant revient, si on n'y a pas touché.
   « 0 » cadre toujours la feuille entière dans la place qui reste. `deja` : le tiroir était déjà là (sa taille change). */
// la même vue, à la demi-unité près (celle de 08-interface, `memeVue`, tolère 1,5 % : elle juge un cadrage, pas un geste)
const vueIntacte = (a, b) => !!a && !!b && Math.abs(a.s - b.s) < 1e-6 && Math.abs(a.tx - b.tx) < .5 && Math.abs(a.ty - b.ty) < .5;
function laisserLePlan(deja) { const d = app.dessin; if (!deja || !RECAP.vueAvant) RECAP.vueAvant = { ...(anim && vueVisee ? vueVisee : app.vue) };
  if (!d || app.base.taille !== 'moitie') { RECAP.vuePosee = { ...app.vue }; return; }
  const c = app.cible, k = c && c.type === 'bloc' && d.compDe.get(c.nom), w = c && c.type === 'fil' && filDe(c.l);
  if (k || w) { const xs = w ? w.pts.map(p => p.x) : [], ys = w ? w.pts.map(p => p.y) : [];
    montrerSiCache(k ? { x: k.x, y: k.y, w: k.w, h: k.h } : { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }); }
  /* sans rien de choisi, LE DESSIN vient au milieu de la place libre (v73, l'ergonome : « le tiroir glisse sur le dessin, on ne
     voit que le haut blanc de la feuille ») : l'échelle reste, la vue glisse — et si le plan revient d'une page (l'ingénieur :
     « le plan reste à 7 % »), il reprend au moins l'échelle de la feuille entière dans la place libre. */
  else { const v = anim && vueVisee ? vueVisee : app.vue, P = placeDuPlan(), F = cadrageDe('feuille'), b = typeof boiteDuDessin === 'function' ? boiteDuDessin(d) : d.bbox; let s = Math.max(v.s, F.s);
    // une vue que l'outil a posée (le folio lisible à 100 %, v74) et qui ne tient plus au-dessus du tiroir se resserre juste
    // assez pour y tenir ; un zoom de la main (`VUE.main`) garde son échelle
    if (!VUE.main && b.h * s > P.H) s = Math.max(F.s, Math.min(s, cadrageDe('dessin').s));
    const tx = s === v.s ? v.tx : P.X - (b.x + b.w / 2) * s, ty = b.h * s <= P.H ? P.Y - (b.y + b.h / 2) * s : P.m.haut + 8 - b.y * s;
    if (s !== v.s || Math.abs(ty - v.ty) > 1) animerVue({ s, tx, ty }, true); }
  RECAP.vuePosee = { ...(anim && vueVisee ? vueVisee : app.vue) }; }
function rendreLePlan() { const A = RECAP.vueAvant, P = RECAP.vuePosee; RECAP.vueAvant = RECAP.vuePosee = null;
  if (A && vueIntacte(app.vue, P) && !vueIntacte(A, P)) animerVue(A, true); }
/* Ouvrir en moitié (par défaut) ou en page. Le filtre suit le bloc choisi ; sans bloc, celui qu'un bloc avait posé s'efface. */
function ouvrirBase(taille) { const b = app.base, t = taille === 'page' ? 'page' : 'moitie', etait = b.ouvert;
  if (etait && b.taille === t) return; b.taille = t;
  if (!etait) { b.ouvert = true; fermerFiche();
    if (app.cible && app.cible.type === 'bloc') { b.filtre = filtreDuBloc(app.cible.nom); b.filtreAuto = true; } else if (b.filtreAuto) { b.filtre = ''; b.filtreAuto = false; }
    b.defiler = true; }
  const el = $('base'); el.hidden = false; el.classList.toggle('page', t === 'page'); if (!etait) { el.classList.remove('entre'); void el.offsetWidth; el.classList.add('entre'); }
  document.body.classList.add('base-ouverte'); $('btnBase').setAttribute('aria-pressed', 'true');
  basculerModeCarte();   // la fiche ouverte se range en volet : le tableau s'arrête à côté d'elle (08-carte)
  rendreBase(true); memoriserBase(); laisserLePlan(etait); }
function fermerBase() { const b = app.base; if (!b.ouvert) return; if (b.edition) finirEdition('annule', null);
  b.ouvert = false; b.neuves = []; b.neufs = []; b.nouveau = false; b.toutes = false; fermerMenuColonnes(); ['ba-csv-menu', 'ba-filtrer'].forEach(id => { const m = $(id); if (m) m.open = false; }); if (typeof cacherBulle === 'function') cacherBulle();
  const el = $('base'); el.hidden = true; el.classList.remove('page'); document.body.classList.remove('base-ouverte'); $('btnBase').setAttribute('aria-pressed', 'false');
  memoriserBase(); rendreLePlan(); basculerModeCarte(); }   // la fiche redevient une carte, près de son bloc
/* B : ouvre en moitié, ou ferme ; Maj+B : passe en page, et de la page revient en moitié. */
function basculerBase(taille) { const b = app.base;
  if (taille === 'page') { if (!(app.contrat.liaisons.length || verite().length)) { dire('Rien à montrer : ouvrez d’abord votre fichier.'); return; } ouvrirBase(b.ouvert && b.taille === 'page' ? 'moitie' : 'page'); return; }
  if (b.ouvert) fermerBase(); else if (app.contrat.liaisons.length || verite().length) ouvrirBase('moitie'); else dire('Rien à montrer : ouvrez d’abord votre fichier.'); }
/* Le récapitulatif d'un objet (le pied d'une fiche) : l'onglet de son type, filtré sur lui — un câble sur son numéro. */
function recapitulatifDe(c) { c = c || app.cible; const b = app.base; if (!c || !(c.nom || c.l)) { basculerBase(); return; }
  const k = c.type === 'fil' ? 'liaisons' : estDisjoncteur(c.nom) ? 'disjoncteurs' : estBarrette(c.nom) ? 'barrettes' : estCoupure(c.nom) ? 'prises' : 'equipements';
  changerOnglet(k, true); b.portee = 'tout'; b.defiler = true;
  if (c.type === 'fil') { b.filtre = c.l.cable || c.l.de || ''; b.filtreAuto = false; } else { b.filtre = c.nom; b.filtreAuto = true; }
  memoriserBase(); if (b.ouvert) rendreBase(true); else ouvrirBase(); }
function changerOnglet(k, sansRendu) { const b = app.base; if (!TABS[k]) return; if (b.edition) finirEdition('ok', null);
  // chaque onglet retrouve sa recherche et son tri ; le bloc choisi sur le plan, lui, filtre tous les onglets
  if (k !== b.onglet) { b.tris[b.onglet] = b.tri; if (!b.filtreAuto) b.filtres[b.onglet] = b.filtre;
    b.onglet = k; b.tri = b.tris[k] || null; if (!b.filtreAuto) b.filtre = b.filtres[k] || ''; b.toutes = false; b.nouveau = false; }
  if (!b.ouvert) { if (!sansRendu) ouvrirBase(); return; } memoriserBase(); if (!sansRendu) rendreBase(true); }

/* ---- CSV : l'onglet tel qu'on le voit, ou tout l'onglet ------------------------ */
/* L'audit v72 (P2-4) : « Exporter CSV » sortait les 8 lignes du folio affiché sans le dire. Le bouton dit ce qu'il sort
   (« Exporter 8 liaisons · folio 1 ») ; « Tout » sort tout l'onglet — sans portée, sans recherche, sans puce — dans le
   même ordre de colonnes. */
const MOT_LIGNE = { liaisons: 'liaison', equipements: 'équipement', disjoncteurs: 'disjoncteur', barrettes: 'barrette', prises: 'prise', cables: 'type de câble', raccords: 'raccord', problemes: 'point', normes: 'table' };
function porteeDeLExport(O) { const b = app.base, M = lignesMontrees(O), n = M.tete.filter(r => !r.nouveau).length + M.L.length, total = O.lignes().length, mot = MOT_LIGNE[b.onglet] || 'ligne';
  const folio = portee(O) && b.portee === 'folio', filtre = !!b.filtre.trim() || pucesActives(O).length > 0;
  return { n, total, mot, dit: (folio ? 'folio ' + app.plan : '') + (filtre ? (folio ? ', ' : '') + 'filtrées' : ''), partiel: n !== total }; }
/* LE MENU « TABLEAU EN CSV » : ce qui est montré (son compte, sa portée), tout l'onglet quand on en voit moins, puis — sous un
   filet — le retest corrigé, le livrable (08-export, `exporterRetestCorrige` : son relevé d'abord). Chaque ligne dit ce
   qu'elle sort ; plus jamais un « Tout » qui exporte à côté d'un « Tout » qui filtre. */
function rendreExport(O) { const P = porteeDeLExport(O), l = $('ba-csv-l'); if (!l) return; const plural = n => plurielLie(n, P.mot), nom = (ONGLETS.find(([k]) => k === app.base.onglet) || [])[1] || '';
  const lignes = [P.n ? ['ba-csv-vu', P.partiel ? 'Ce qui est montré' : 'Tout l’onglet ' + nom, plural(P.n) + (P.dit ? ' · ' + P.dit : '') + ', les colonnes affichées'] : ['ba-csv-vu', 'Rien à mettre en CSV', 'l’onglet ne montre aucune ligne', ' aria-disabled="true"'],
    P.partiel ? ['ba-csv-tout', 'Tout l’onglet ' + nom, plural(P.total) + ', sans folio ni filtre'] : null,
    typeof exporterRetestCorrige === 'function' && verite().length ? null : false,
    typeof exporterRetestCorrige === 'function' && verite().length ? ['ba-csv-retest', 'L’Excel corrigé', 'le livrable à renvoyer : relu avant d’enregistrer'] : false].filter(x => x !== false);
  l.innerHTML = lignes.map(g => g === null ? '<hr>' : `<button role="menuitem" id="${g[0]}"${g[3] || ''}>${esc(g[1])}<small>${esc(g[2])}</small></button>`).join('').replace(/^<hr>|<hr>$/g, ''); }
function exporterRecap(tout) { assurerModele(); RECAP.palier = palierDuCorps(); const O = onglet(), C = colonnesVues(O).filter(c => c.texte && (c.t || c.titre)), M = lignesMontrees(O);
  const lignes = tout === true ? O.lignes() : [...M.tete.filter(r => !r.nouveau), ...M.L];
  if (!lignes.length) { dire('Rien à exporter : l’onglet est vide.'); return; }
  const cell = v => { const t = String(v == null ? '' : v).replace(/[\u00a0\u202f]/g, ' '); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const csv = [C.map(c => cell(c.t || c.titre)).join(';'), ...lignes.map(r => C.map(c => cell(c.texte(r))).join(';'))].join('\n');
  const nom = ONGLETS.find(([k]) => k === app.base.onglet)[1];
  telecharger(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), nomContrat() + '-' + nomAscii(nom.toLowerCase()) + (tout === true ? '-tout' : '') + '.csv');
  dire(plurielLie(lignes.length, MOT_LIGNE[app.base.onglet] || 'ligne') + (tout === true ? ' (tout l’onglet ' + nom + ')' : '') + ' enregistrée' + (lignes.length > 1 ? 's' : '') + ' en CSV.'); }

/* ---- LES COLONNES : celles d'office, puis celles qu'on ajoute ------------------ */
/* TOUT RESTE ATTEIGNABLE, DERRIÈRE « COLONNES » (v74 : « l'essentiel d'abord, le reste derrière Colonnes ») : d'office, puis
   les colonnes en plus rangées par rubrique (le câble, les deux bouts, le dossier…) ; à partir de dix, sur deux colonnes
   (l'ingénieur v73 : « le menu défile, je ne vois pas toutes les colonnes d'un coup »). Le menu se tient dans la feuille. */
function ouvrirMenuColonnes(garde) { const O = onglet(), vues = new Set(colonnesVues(O).map(c => c.k)), m = $('ba-colonnes-menu'), xs = O.colonnes.filter(c => c.t && (!c.si || c.si()));
  const coche = c => `<label class="rc-coche"><input type="checkbox" data-col="${c.k}"${vues.has(c.k) ? ' checked' : ''}><span>${esc(c.t)}</span></label>`;
  // (v84) « d'office » suit la largeur de la feuille : sur une feuille large, les colonnes qui y viennent s'y rangent aussi
  const R = []; xs.filter(c => !dOffice(c)).forEach(c => { const t = c.g || 'En plus', r = R.find(x => x.t === t); if (r) r.cs.push(c); else R.push({ t, cs: [c] }); });
  const rubrique = (t, cs) => `<div class="rc-menu-t">${esc(t)}</div><div class="rc-menu-g">${cs.map(coche).join('')}</div>`;
  m.classList.toggle('large', xs.length >= 10);
  // (dans l'ordre où la table les pose : l'état au bout)
  const office = xs.filter(dOffice).map((c, i) => [c, i]).sort((a, z) => rangDeFin(a[0]) - rangDeFin(z[0]) || a[1] - z[1]).map(x => x[0]);
  m.innerHTML = rubrique(RECAP.palier && xs.some(c => c.option && dOffice(c)) ? 'D’office, à cette largeur' : 'D’office', office) + R.map(r => rubrique(r.t, r.cs)).join('')
    + (app.base.colonnes[app.base.onglet] ? '<button class="rc-lien" id="ba-colonnes-defaut">Revenir aux colonnes d’office</button>' : '');
  m.style.maxHeight = ''; m.hidden = false; $('ba-colonnes').setAttribute('aria-expanded', 'true');
  const place = $('base').getBoundingClientRect().bottom - $('ba-colonnes').getBoundingClientRect().bottom - 18; if (place > 120 && m.scrollHeight > place) m.style.maxHeight = place + 'px';
  const x = m.querySelector(garde ? `[data-col="${CSS.escape(garde)}"]` : 'input') || m.querySelector('input'); if (x) x.focus(); }
function fermerMenuColonnes() { const m = $('ba-colonnes-menu'); if (!m || m.hidden) return; m.hidden = true; $('ba-colonnes').setAttribute('aria-expanded', 'false'); }

/* ---- TOUT RELIER --------------------------------------------------------------- */
function lierBase() { const b = app.base, t = $('ba-tab'), corps = $('ba-tbody'), fi = $('ba-filtre'); let fT;
  $('ba-taille').addEventListener('click', e => { const x = e.target.closest('[data-taille]'); if (!x) return; if (x.dataset.taille === 'plan') fermerBase(); else ouvrirBase(x.dataset.taille); });
  $('ba-x').onclick = fermerBase;
  // le menu du tableau en CSV : ses lignes (`rendreExport`) ; il se ferme au geste choisi, à Échap, d'un clic ailleurs (08-normes)
  $('ba-csv-l').addEventListener('click', e => { const x = e.target.closest('button'); if (!x || x.getAttribute('aria-disabled') === 'true') return;
    if (x.id === 'ba-csv-vu') exporterRecap(false); else if (x.id === 'ba-csv-tout') exporterRecap(true); else if (x.id === 'ba-csv-retest') exporterRetestCorrige(); });
  // « Filtrer » (v74) : posé après les puces ; un choix ne le ferme pas (on coche plusieurs routes d'affilée)
  const fl = document.createElement('details'); fl.className = 'doc-menu rc-filtrer'; fl.id = 'ba-filtrer'; fl.hidden = true;
  fl.innerHTML = `<summary class="btn papier" id="ba-filtrer-b" aria-label="Filtrer">${ICO_FILTRE}<span class="rc-filtrer-mot">Filtrer</span><small id="ba-filtrer-n"></small>${ICO_CHEVRON}</summary><div class="doc-menu-l" role="menu" id="ba-filtrer-l" aria-label="Les autres filtres"></div>`;
  $('ba-puces').after(fl);
  $('ba-filtrer-l').addEventListener('click', e => { const x = e.target.closest('[data-puce]'); if (!x) return; e.stopImmediatePropagation(); basculerPuce(x.dataset.puce); });
  if (typeof lierMenusDoc === 'function') lierMenusDoc($('base'));
  // le menu se tient dans la feuille : il ne descend pas plus bas qu'elle (la moitié est basse), il défile dedans
  fl.addEventListener('toggle', () => { if (!fl.open) return; const l = $('ba-filtrer-l'); l.style.maxHeight = Math.max(160, $('base').getBoundingClientRect().bottom - fl.getBoundingClientRect().bottom - 18) + 'px'; });
  // l'ajout n'est pas le geste principal de la barre : un bouton au trait, comme « Colonnes » (plus le bloc plein qui attirait l'œil)
  $('ba-ajouter').classList.replace('cuivre', 'papier');
  // LA FEUILLE QUI SE SERRE : sous 1000 px (la fiche épinglée à côté, en 1440), le rail s'amincit (`serre`) — il ne saute pas
  // quand on choisit une ligne ; sous 820 px (un petit écran), il redevient une bande au-dessus de la table (`etroit`)
  const base = $('base'), etroite = () => { const w = base.offsetWidth; if (!w) return; base.classList.toggle('serre', w < 1000); const e = w < 820; if (base.classList.contains('etroit') === e) return;
    base.classList.toggle('etroit', e); $('ba-onglets').setAttribute('aria-orientation', e ? 'horizontal' : 'vertical'); bordDe($('ba-onglets')); };
  if (window.ResizeObserver) new ResizeObserver(etroite).observe(base); window.addEventListener('resize', etroite);
  // la table passe un palier de largeur (une fiche s'ouvre à côté, la fenêtre change) : ses colonnes d'office suivent
  const palier = () => { if (base.hidden || !b.ouvert) return; const p = palierDuCorps(); if (p === (RECAP.palier || 0)) return; if (b.edition) { b.sale = true; return; } rendreBase(true); };
  if (window.ResizeObserver) new ResizeObserver(palier).observe($('ba-corps'));
  // le mot « Colonnes » se range quand la barre se resserre (la flèche reste)
  const col = $('ba-colonnes'), mot = [...col.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
  if (mot) { const s = document.createElement('span'); s.className = 'rc-col-mot'; s.textContent = mot.textContent; col.replaceChild(s, mot); col.dataset.bulle = 'Les colonnes de cet onglet'; }
  // (v74) son icône — trois colonnes — devant le mot : serrée, la barre garde l'icône, comme « Filtrer »
  col.insertAdjacentHTML('afterbegin', '<svg class="ico rc-col-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M9.5 5v14M14.5 5v14"/></svg>');
  t.addEventListener('animationend', e => { if (e.target.closest && e.target.closest('tbody') === corps) t.classList.remove('rc-entre'); });
  // la table virtuelle se repeint en défilant (une image au plus)
  let raf = 0; $('ba-corps').addEventListener('scroll', () => { if (RECAP.virtuel && !raf) raf = requestAnimationFrame(() => { raf = 0; peindreFenetre(); }); }, { passive: true });
  $('ba-ajouter').onclick = () => { const O = onglet(); if (O.ajouter) O.ajouter(); };
  // le pourquoi d'un état, d'une norme, d'une origine : la bulle de la fiche, au survol (08-fiche)
  if (typeof lierBulles === 'function') lierBulles($('base'));
  // les onglets : un clic, ou les flèches quand l'un a le clavier — ↑ ↓ dans le rail, ← → aussi (la bande étroite), Début, Fin
  const ong = $('ba-onglets'); ong.setAttribute('aria-orientation', 'vertical');
  ong.addEventListener('click', e => { const x = e.target.closest('[data-onglet]'); if (x) changerOnglet(x.dataset.onglet); });
  ong.addEventListener('keydown', e => { const pas = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, Home: -Infinity, End: Infinity }[e.key]; if (pas == null) return; e.preventDefault(); e.stopPropagation();
    const ks = ONGLETS.map(([k]) => k), i = ks.indexOf(b.onglet), k = pas === -Infinity ? ks[0] : pas === Infinity ? ks[ks.length - 1] : ks[(i + pas + ks.length) % ks.length]; changerOnglet(k); const n = ong.querySelector(`[data-onglet="${k}"]`); if (n) n.focus(); });
  $('ba-portee').addEventListener('click', e => { const x = e.target.closest('[data-portee]'); if (!x || b.portee === x.dataset.portee) return; b.portee = x.dataset.portee; memoriserBase(); rendreBase(true); });
  // ← → passent de « Ce folio » à « Tout le plan », le clavier suit
  $('ba-portee').addEventListener('keydown', e => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); e.stopPropagation();
    const v = e.key === 'ArrowLeft' ? 'folio' : 'tout'; if (b.portee !== v) { b.portee = v; memoriserBase(); rendreBase(true); } const n = $('ba-portee').querySelector(`[data-portee="${v}"]`); if (n) n.focus(); });
  fi.addEventListener('input', () => { clearTimeout(fT); fT = setTimeout(() => { b.filtre = fi.value; b.filtreAuto = false;
    const c = app.cible; if (c && c.type === 'bloc' && fi.value.trim() !== filtreDuBloc(c.nom)) { app.cible = null; app.choisi = null; peindre(); }
    memoriserBase(); rendreBase(); rallumer(); }, 150); });
  fi.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); if (fi.value) { fi.value = ''; fi.dispatchEvent(new Event('input')); } else fi.blur(); }
    else if (e.key === 'ArrowDown' || e.key === 'Enter') { const x = corps.querySelector('tr[data-k] [data-f]'); if (x) { e.preventDefault(); x.focus(); } } });
  $('ba-vider').onclick = () => { fi.value = ''; fi.dispatchEvent(new Event('input')); fi.focus(); };
  // le champ s'élargit au focus, se resserre avec la feuille : son invite se relit (`ajusterRecherche`)
  if (window.ResizeObserver) new ResizeObserver(() => ajusterRecherche()).observe(fi);
  // les puces et les onglets défilent de côté (la molette aussi) et s'effacent au bord qui cache quelque chose
  [$('ba-puces'), ong].forEach(x => { const bord = () => bordDe(x); x.addEventListener('scroll', bord, { passive: true }); if (window.ResizeObserver) new ResizeObserver(bord).observe(x);
    x.addEventListener('wheel', e => { if (x.scrollWidth <= x.clientWidth || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return; e.preventDefault(); x.scrollLeft += e.deltaY; }, { passive: false }); });
  // les puces : chacune bascule ; celles d'un niveau (Problèmes, À voir), une seule à la fois
  $('ba-puces').addEventListener('click', e => { const x = e.target.closest('[data-puce]'); if (x) basculerPuce(x.dataset.puce); });
  $('ba-colonnes').onclick = e => { e.stopPropagation(); if ($('ba-colonnes-menu').hidden) ouvrirMenuColonnes(); else fermerMenuColonnes(); };
  $('ba-colonnes').addEventListener('keydown', e => { if (e.key === 'ArrowDown' && $('ba-colonnes-menu').hidden) { e.preventDefault(); e.stopPropagation(); ouvrirMenuColonnes(); } });
  $('ba-colonnes-menu').addEventListener('change', e => { const x = e.target.closest('[data-col]'); if (!x) return; const ch = b.colonnes[b.onglet] || (b.colonnes[b.onglet] = {}); ch[x.dataset.col] = x.checked; memoriserBase(); rendreBase(true); ouvrirMenuColonnes(x.dataset.col); });
  $('ba-colonnes-menu').addEventListener('click', e => { if (e.target.id === 'ba-colonnes-defaut') { delete b.colonnes[b.onglet]; memoriserBase(); rendreBase(true); ouvrirMenuColonnes(); } });
  // au clavier, comme les autres menus : ↑ ↓ passent d'une case à l'autre (Début, Fin), Espace ou Entrée cochent, Échap ferme
  $('ba-colonnes-menu').addEventListener('keydown', e => { const m = $('ba-colonnes-menu'), xs = [...m.querySelectorAll('input, #ba-colonnes-defaut')], i = xs.indexOf(document.activeElement);
    if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); fermerMenuColonnes(); $('ba-colonnes').focus(); return; }
    if (e.key === 'Enter' && document.activeElement && document.activeElement.matches('input[type="checkbox"]')) { e.preventDefault(); e.stopPropagation(); document.activeElement.click(); return; }
    const pas = { ArrowDown: 1, ArrowUp: -1, Home: -Infinity, End: Infinity }[e.key]; if (pas == null || !xs.length) return; e.preventDefault(); e.stopPropagation();
    const j = pas === -Infinity ? 0 : pas === Infinity ? xs.length - 1 : (i < 0 ? 0 : (i + pas + xs.length) % xs.length); xs[j].focus(); });
  document.addEventListener('pointerdown', e => { if (!e.target.closest('.rc-colonnes')) fermerMenuColonnes(); });
  // trier : un clic sur l'en-tête (croissant, décroissant, rien), Entrée ou Espace au clavier
  $('ba-thead').addEventListener('click', e => { const th = e.target.closest('th[data-k][role="button"]'); if (!th) return; const k = th.dataset.k, tri = b.tri;
    b.tri = !tri || tri.k !== k ? { k, sens: 1 } : (tri.sens > 0 ? { k, sens: -1 } : null); b.tris[b.onglet] = b.tri; memoriserBase(); rendreBase(true);
    const n = $('ba-thead').querySelector(`th[data-k="${k}"]`); if (n && th === document.activeElement) n.focus(); });
  $('ba-thead').addEventListener('keydown', e => { const th = e.target.closest('th[data-k][role="button"]'); if (!th || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault(); e.stopPropagation(); const k = th.dataset.k; th.click(); const n = $('ba-thead').querySelector(`th[data-k="${k}"]`); if (n) n.focus(); });
  // une ligne : un clic la choisit (sa fiche, le plan) ; ses boutons font ce qu'ils disent
  corps.addEventListener('click', e => { const tr = e.target.closest('tr[data-k]'), r = tr && RECAP.vues.get(tr.dataset.k), O = onglet();
    // une case en cours d'édition : le clic qui l'a ouverte ne compte pas ; un clic ailleurs l'écrit, puis fait ce qu'il dit
    if (b.edition) { if (e.target.closest('.edite') || Date.now() - RECAP.edite < 500) return; finirEdition('ok', null); }
    const f = e.target.closest('button[data-plan]'); if (f) { allerAuPlan(f.dataset.plan); return; }
    const pr = e.target.closest('[data-premier]'); if (pr) { allerAuGenre(pr.dataset.premier); return; }
    // (passe 87) le geste d'un genre rangé comme la fiche (`genresARegler`), sinon celui du contrôle
    const ge = e.target.closest('[data-geste]'); if (ge) { const g = genresARegler().find(y => y.cle === ge.dataset.geste), G = g && typeof gesteDuGenre === 'function' ? gesteDuGenre(g) : null; if (G) G.faire(); else faireLeGeste(ge.dataset.geste); return; }
    if (!r) return;
    const au = e.target.closest('button[data-auto]'); if (au) { if (O.rendre) O.rendre(r, au.dataset.auto); return; }
    if (e.target.closest('[data-aller]')) { if (O.aller) O.aller(r); return; }
    if (e.target.closest('[data-voir-fils]')) { if (O.voirFils) O.voirFils(r); return; }
    if (e.target.closest('[data-proposer]')) { accepterLeCalibre(r.nom); return; }
    // (v86) les gestes de VOLTA, les mêmes que la fiche : donner son repère à une barrette ajoutée, accepter le calibre proposé
    if (e.target.closest('[data-poser]')) { if (r.plan && r.plan !== app.plan && plans().includes(r.plan)) allerAuPlan(r.plan); if (typeof poserLesBarrettes === 'function') poserLesBarrettes([r.nom]); return; }
    if (e.target.closest('[data-decider]')) { if (typeof deciderCalibre === 'function') (typeof parVolta === 'function' ? parVolta : f => f())(() => deciderCalibre(r.nom)); return; }
    const gp = e.target.closest('[data-geste-pb]'); if (gp) { const g = reparateurs(r).find(y => y.cle === gp.dataset.gestePb); if (g && g.faire) g.faire(); return; }
    /* UN SEUL GESTE POUR ÉCRIRE, PARTOUT (l'ergonome v73 : « on corrige au double-clic ici, d'un clic dans la fiche ») : sur
       la ligne qu'on a choisie, un clic sur une valeur l'écrit, comme dans la fiche ; ailleurs, le premier clic choisit la
       ligne et pose le clavier sur la valeur — une touche, Entrée ou un second clic l'écrivent. Le double-clic reste. */
    const v = e.target.closest('.rc-v[data-f]'); if (e.detail > 1) return;   // le second appui d'un double-clic : l'appui l'a déjà traité (plus bas)
    if (v && !v.classList.contains('rc-calc') && !v.classList.contains('rc-lu') && O.choisie(r)) { editer(v); return; }
    if (O.choisir) O.choisir(r);
    if (v) { const c = caseDe(v); requestAnimationFrame(() => { const n = elementDe(c); if (n && document.activeElement !== n && !b.edition) { try { n.focus({ preventScroll: true }); } catch (_) { n.focus(); } } }); } });
  /* LE DOUBLE APPUI se reconnaît ici, pas au « dblclick » : le premier clic choisit la ligne, ouvre sa fiche à droite (le
     tableau se resserre) ou change de folio (le tableau se refait) — sous un pointeur immobile, le second appui tombe
     sur un autre élément et le navigateur n'émet plus de double-clic ; le second appui garde pourtant son rang (`detail`,
     le compte des clics que le système tient). C'est la case visée au PREMIER appui qui s'édite. */
  let premier = null;
  corps.addEventListener('mousedown', e => { if (e.button) return; const p = premier;
    if (p && e.detail === 2 && Math.abs(e.clientX - p.x) < 8 && Math.abs(e.clientY - p.y) < 8) { premier = null; const v = elementDe(p.c);
      if (v && !v.classList.contains('edite') && !b.edition) { e.preventDefault(); editer(v); } return; }
    const c = caseDe(e.target); premier = c && e.detail <= 1 ? { c, x: e.clientX, y: e.clientY } : null; });
  corps.addEventListener('dblclick', e => { const v = e.target.closest('[data-f]'); if (v && !v.classList.contains('edite') && !b.edition) { e.preventDefault(); editer(v); } });
  // survoler une ligne allume ce qu'elle désigne sur le plan (son câble, son repère, les câbles d'un type) — une fois par
  // ligne entrée, pas à chaque case traversée ; la quitter rend ce qui était choisi
  corps.addEventListener('mouseover', e => { if (b.edition) return; const tr = e.target.closest('tr[data-k]'); if (tr === RECAP.survolee) return; RECAP.survolee = tr;
    const r = tr && RECAP.vues.get(tr.dataset.k), O = onglet(); if (r && !r.nouveau && O.survol) O.survol(r); else if (!tr) rallumer(); });
  corps.addEventListener('mouseleave', () => { RECAP.survolee = null; if (!b.edition) rallumer(); });
  // le clavier dans la table : en édition, Entrée écrit et descend, Tab passe à la case suivante, Échap annule, Ctrl+Z
  // sur une case qu'on n'a pas touchée défait le dernier geste de l'outil ; hors édition, Entrée ou F2 édite, les
  // flèches se déplacent de case en case
  t.addEventListener('keydown', e => { const ed = b.edition;
    if (ed && e.target === ed.inp) {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); finirEdition('ok', e.shiftKey ? 'dessus' : 'dessous'); }
      else if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); finirEdition('ok', e.shiftKey ? 'precedente' : 'suivante'); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finirEdition('annule', 'meme'); }
      // Ctrl+Z sur une case qu'on n'a pas touchée défait ; Ctrl+Y et Ctrl+Maj+Z REFONT (la Maj ne doit pas défaire : le chrome v73)
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && (ed.inp.value === ed.avant || ed.avant == null)) { e.preventDefault(); e.stopPropagation(); finirEdition('annule', null); defaire(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || e.key.toLowerCase() === 'z' && e.shiftKey) && (ed.inp.value === ed.avant || ed.avant == null)) { e.preventDefault(); e.stopPropagation(); finirEdition('annule', null); if (typeof refaireEtDire === 'function') refaireEtDire(); }
      return; }
    const v = e.target.closest && e.target.closest('[data-f]'); if (!v || !corps.contains(v)) return;
    if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); e.stopPropagation(); editer(v); return; }
    // une touche qu'on écrit, sur une valeur qui a le clavier : son champ s'ouvre et la reçoit (comme un tableur) — sauf les
    // touches de l'outil (v74, fusion : après Entrée, la case du dessous a le clavier, et « b » écrivait un « b » dans le
    // câble suivant au lieu de fermer le récapitulatif) : b, p, P, r, n, f, « / », « ? » gardent leur sens ; Entrée ou F2 éditent
    if (e.key.length === 1 && e.key !== ' ' && !TOUCHES_DE_L_OUTIL.has(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey && !v.classList.contains('rc-calc') && !v.classList.contains('rc-lu')) { const k = e.key;
      if (editer(v)) { e.preventDefault(); e.stopPropagation(); const ed = b.edition; if (ed && ed.inp.tagName === 'INPUT') { ed.inp.value = k; ed.inp.dispatchEvent(new Event('input')); } } return; }
    const pas = { ArrowRight: 'suivante', ArrowLeft: 'precedente', ArrowDown: 'dessous', ArrowUp: 'dessus' }[e.key]; if (!pas || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault(); e.stopPropagation(); const c = caseDe(v), n = elementDe(voisine({ k: c.k, f: c.f, el: v }, pas)); if (n) { n.focus(); n.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } });
  // le focus sur une case de liaison : son câble s'allume (le clavier comme la souris)
  corps.addEventListener('focusin', e => { if (b.edition) return; const tr = e.target.closest('tr[data-k]'), r = tr && RECAP.vues.get(tr.dataset.k); if (r && r.l) { const w = filDe(r.l); if (w) allumerFil(w); } });
  // Maj+B : la page (B, lui, est pris par le clavier de l'outil, 08 `lierPanneau`)
  window.addEventListener('keydown', e => { if (e.key !== 'B' || !e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return; e.preventDefault(); basculerBase('page'); });
  lierPoignee(); }
/* LA POIGNÉE (v84 : « à mi-hauteur, agrandi » se passent d'un geste) : la moitié se règle en hauteur ; tirée au-delà du haut,
   la poignée s'allume de cuivre et, lâchée, la feuille prend toute la place ; de la page, tirée vers le bas, elle redevient
   une moitié sous le pointeur ; un double-clic passe de l'une à l'autre. */
function lierPoignee() { const p = $('ba-poignee'), el = $('base'); let actif = false, versPage = false;
  p.dataset.bulle = 'Glisser pour régler la hauteur — double-clic : toute la place, ou la moitié';
  const haut = () => { const m = parseFloat(getComputedStyle(el).maxHeight); return Math.min(window.innerHeight * 0.8, isFinite(m) && !el.classList.contains('page') ? m : Infinity); };
  p.addEventListener('pointerdown', e => { if (e.button) return; actif = true; versPage = false; el.classList.add('redim'); try { p.setPointerCapture(e.pointerId); } catch (_) { } e.preventDefault(); });
  p.addEventListener('pointermove', e => { if (!actif) return; const voulu = el.getBoundingClientRect().bottom - e.clientY;
    if (app.base.taille === 'page') { const m = window.innerHeight * 0.8; if (voulu < m - 24) { app.base.hauteur = Math.round(Math.max(160, voulu)); appliquerTailleBase(); ouvrirBase('moitie'); } return; }
    const m = haut(); versPage = voulu > m + 48; el.classList.toggle('vers-page', versPage);
    app.base.hauteur = Math.round(Math.max(160, Math.min(m, voulu))); appliquerTailleBase(); });
  const fin = () => { if (!actif) return; actif = false; el.classList.remove('redim', 'vers-page'); if (versPage) { versPage = false; ouvrirBase('page'); } memoriserBase(); laisserLePlan(true); peindreFenetre(true); };
  p.addEventListener('pointerup', fin); p.addEventListener('pointercancel', fin);
  p.addEventListener('dblclick', e => { e.preventDefault(); basculerBase('page'); }); }
