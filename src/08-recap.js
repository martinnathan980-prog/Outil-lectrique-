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
       « Colonnes ». Une liaison se lit comme une phrase : de (repère:borne) →
       le câble (son numéro, son type, sa gauge, une flèche de la couleur de
       sa route, épaisse selon la gauge) → vers ; sa longueur ; UN état (ok,
       à voir, problème : un point et un mot), son pourquoi dans la bulle.
     · LA COULEUR NE DIT QUE L'ÉTAT, et la route d'un câble ; le reste est à
       l'encre, les identifiants en chasse fixe.
     · TOUT SE CORRIGE SUR PLACE : une valeur qu'on peut écrire prend au
       survol l'air d'un champ (et la ligne survolée souligne les siennes) ;
       double-clic, Entrée ou F2 l'édite, Tab passe à la suivante, Échap
       annule, les flèches se déplacent ; une valeur que l'outil calcule (la
       longueur d'hypothèse, le contact, le type, le calibre, le module)
       forcée à la main porte « main » et ↺, qui rend l'automatique. Chaque
       correction est une entrée d'historique (Ctrl+Z).
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
const ONGLETS = [['problemes', 'Problèmes'], ['liaisons', 'Liaisons'], ['cables', 'Câbles'], ['equipements', 'Équipements'], ['disjoncteurs', 'Disjoncteurs'], ['barrettes', 'Barrettes'], ['prises', 'Prises'],
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
const RECAP = { notes: {}, pareils: new Set(), parGenre: false, jeton: 0, cle: null, memo: new Map(), norme: null, bible: null, refs: null, items: null, itemsN: 0, parCable: null, parNom: null, rendu: null, vues: new Map(), liste: [], datalist: 0 };
function assurerModele() { const C = app.contrat;
  const k = JSON.stringify(verite()) + '|' + JSON.stringify([...C.designations]) + '|' + JSON.stringify([...(C.sexes || [])]) + '|' + JSON.stringify([...(C.charges || [])])
    + '|' + JSON.stringify([...(C.raccords || [])]) + '|' + JSON.stringify(app.simu || {}) + '|' + app.plan + '|' + app.nFolios;
  if (k !== RECAP.cle || RECAP.norme !== app.norme || RECAP.bible !== app.bible || RECAP.refs !== app.references) { RECAP.cle = k; RECAP.norme = app.norme; RECAP.bible = app.bible; RECAP.refs = app.references; RECAP.memo.clear(); }
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
const etatDuNom = nom => { const xs = itemsParNom().get(nom) || []; return { niveau: niveauDe(xs), ko: xs.filter(x => x.niveau === 'ko').map(x => x.texte), att: xs.filter(x => x.niveau !== 'ko').map(x => x.texte) }; };

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
  F = { x, c, jauge: x.jauge, cab, L: c.L, R: x.rd.rho != null ? x.rd.rho / 1000 * c.L : null, masse: cab && cab.masse != null ? cab.masse * c.L : null, de: contactDuBout(l, 'de'), vers: contactDuBout(l, 'vers') };
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
  // l'intensité et la chute comptent dans l'état ; leurs chiffres ouvrent la bulle (« > » quand ça dépasse)
  const trop = l.de !== l.vers && liaisonComplete(l) && x.trop.length > 0, chute = c.trop ? (c.reel ? 'ko' : 'att') : '';
  const niveau = ko.size || trop || chute === 'ko' ? 'ko' : att.size || chute ? 'att' : l.de === l.vers ? '' : 'ok';
  const cmp = (a, b) => a > b + 1e-9 ? '>' : 'sur';
  const chiffres = [x.fn ? `Intensité : ${amperes(x.I)} ${cmp(x.I, x.continu)} ${amperes(x.continu)} admis en continu${x.al ? ', sous ' + x.al.nom : ' (hypothèse)'}` : '',
    x.fn && x.pointe && x.pointe.admis ? `Pointe : ${amperes(x.pointe.i)} pendant ${secondes(x.pointe.t)} ${cmp(x.pointe.i, x.pointe.admis)} ${amperes(x.pointe.admis)} admis` : '',
    c.total ? `Chute en ligne : ${volts(c.total.dU)} ${c.max != null ? cmp(c.total.dU, c.max) + ' ' + volts(c.max) + ' admis' : ''}${c.reel ? '' : ' (longueurs d’hypothèse)'}` : c.dU != null ? `Chute sur ce câble : ${volts(c.dU)}` : ''].filter(Boolean);
  return { niveau, ko: [...ko], att: [...att], bulle: [chiffres.join('\n'), [...ko, ...att].join('\n')].filter(Boolean).join('\n\n') }; }

/* ---- petits morceaux de rendu ------------------------------------------- */
// une valeur qu'on corrige : au survol elle prend l'air d'un champ ; double-clic, Entrée ou F2 l'édite ; vide, elle dit
// ce qu'on y écrirait (sur la ligne survolée, choisie ou neuve)
const val = (f, html, opt) => { opt = opt || {}; const vide = html == null || html === '';
  return `<span class="rc-v${opt.cls ? ' ' + opt.cls : ''}${vide ? ' rc-vide' : ''}" data-f="${escA(f)}" tabindex="-1" ${opt.titre ? ` data-bulle="${escA(opt.titre)}"` : ''} aria-description="${escA(opt.titre || 'Double-clic pour modifier')}"${opt.ph ? ` data-ph="${escA(opt.ph)}"` : ''}>${vide ? '' : html}</span>`; };
const valT = (f, t, opt) => val(f, t == null || t === '' ? '' : esc(t), opt);
// « ↺ » : rend le calcul (ou ce que le fichier portait) à une valeur forcée ; son titre dit ce qui revient
const rond = (f, quoi) => `<button type="button" class="rc-auto" data-auto="${escA(f)}" data-bulle="${escA('Rendre ' + quoi)}" aria-label="${escA('Rendre ' + quoi)}">↺</button>`;
// l'origine d'une valeur, seulement quand elle n'est pas celle du calcul : « main », « supposée » (une hypothèse de la
// simulation — plus « hyp. », une abréviation que le lecteur n'emploie pas) ; `mot` : le mot accordé à la valeur
const orig = (o, bulle, mot) => o === 'hyp' ? `<i class="rc-o rc-hyp" data-bulle="${escA(bulle || 'Une hypothèse de la simulation (menu ⋮ → Hypothèses)')}">${mot || 'supposé'}</i>`
  : o === 'main' ? `<i class="rc-o main" data-bulle="${escA(bulle || 'Écrit à la main')}">main</i>` : '';
const unite = u => `<i class="rc-u">${u}</i>`;
const rien = '<span class="rc-rien">—</span>';
const fmt = (x, n) => x == null || !isFinite(x) ? '' : nombre(Math.round(x * Math.pow(10, n)) / Math.pow(10, n));
const amp1 = x => x == null || !isFinite(x) ? '' : nombre((Math.round(x * 10) / 10).toFixed(1));
// deux décimales, toujours : les longueurs s'alignent sous leur virgule (« 0,80 », « 0,84 », « 1,10 »)
const metres = x => nombre((Math.round(x * 100) / 100).toFixed(2));
// un nombre et son unité, alignés à droite dans leur place ; ce qui suit (l'origine, ↺) se range derrière
const chiffre = (html, u, cls) => `<span class="rc-chiffre${cls ? ' ' + cls : ''}">${html}${u ? unite(u) : ''}</span>`;
/* L'ÉTAT, partout pareil : un point de sa couleur et un mot (ok, à voir, problème — ou ce qu'il compte), le pourquoi
   dans la bulle. */
const MOTS_ETAT = { ok: 'ok', att: 'à voir', ko: 'problème' };
/* (v74 : « l'œil se perd ») ce qui va bien se tait : « ok » n'est plus écrit deux cents fois — son point vert suffit, le mot
   reste pour le lecteur d'écran et le CSV ; « à voir » et « problème » gardent leur mot, ils sortent ainsi du lot. */
const etatHtml = (niveau, mot, bulle) => { if (!niveau) return rien; const m = mot || MOTS_ETAT[niveau], seul = m === 'ok';
  return `<span class="rc-etat ${niveau}${seul ? ' seul' : ''}"${bulle ? ` data-bulle="${escA(bulle)}"` : ''}><i aria-hidden="true"></i>${seul ? '<span class="sr">ok</span>' : esc(m)}</span>`; };
const rangEtat = n => ({ ko: 0, att: 1, ok: 2 })[n] ?? 3;
/* LA GAUGE, une fois (v74 ; le designer v73 : « trois styles de disque sans légende » ; le technicien : « la gauge en simple
   nombre ») : un nombre à l'encre seconde, sans disque — et dans la case du câble, seulement quand le type ne la dit pas
   déjà (DR12 dit 12) ; la flèche, à peine plus épaisse pour un gros câble (1,5 à 3 px : elle ne crie plus). */
const epaisseur = g => g == null ? 1.5 : g <= 16 ? Math.min(3, 2.2 + 0.1 * (16 - g)) : Math.max(1.5, 2.2 - 0.15 * (g - 16));
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
  return `<span class="rc-bout${ici ? ' ici' : ''}">${valT(c, r, { cls: 'rc-r', ph: de ? 'de' : 'vers' })}<i class="rc-sep${b ? '' : ' rc-vide'}">:</i>${valT(de ? 'borneDe' : 'borneVers', b, { cls: 'rc-b', ph: 'borne' })}${nat ? `<small class="rc-nat">${nat}</small>` : ''}</span>`; };
// ce que la ligne dit de la valeur d'un champ du fichier, forcée ici : « ↺ » rend celle du retest
const rendu = (l, f) => origineChamp(l, f) === 'main' && l.avant && l.avant[f] ? rond(f, 'la valeur de l’installation (' + l.avant[f] + ')') : '';
const contactH = (l, F, c) => { const x = F[c], f = c === 'de' ? 'contactDe' : 'contactVers'; if (!x) return rien;
  const titre = x.main ? 'Écrit à la main' + (x.auto ? ' — le calcul donne ' + x.auto : '') : x.ko ? 'Ce contact refuse la gauge du câble' : !x.ref ? (x.connu ? 'Aucun contact de la table ne va à ce câble' : 'Aucun plan ne connaît ce connecteur : écrivez le contact') : (x.taille ? 'Contact taille ' + x.taille + (x.sexe ? ' · ' + (x.sexe === 'M' ? 'mâle' : 'femelle') : '') : '');
  return `<span class="rc-ctc">${valT(f, x.ref, { cls: 'rc-ct' + (x.ko ? ' ko' : ''), ph: '—', titre: (titre ? titre + ' — ' : '') + 'double-clic pour en choisir un autre' })}${x.acc ? `<small class="rc-acc">+ ${esc(x.acc)}</small>` : ''}${x.main ? orig('main') + rond(f, x.auto ? 'le contact calculé (' + x.auto + ')' : 'le calcul') : ''}</span>`; };
const motEtatFil = r => { const n = r.F().etat.niveau; return n ? MOTS_ETAT[n] : ''; };
/* Le câble : son numéro, son type, sa gauge, puis la flèche vers « vers », de la couleur de sa route. */
const celluleCable = r => { const l = r.l, g = r.F().jauge, c = routes().get(l.route || '') || '';
  return `<span class="rc-cable${c ? '' : ' sans-route'}${g == null ? ' sans-jauge' : ''}" style="${c ? '--c:' + c + ';' : ''}--e:${epaisseur(g)}px">`
    + `<span class="rc-cable-id">${valT('cable', l.cable, { cls: 'rc-no', ph: 'n° du câble' })}${rendu(l, 'cable')}</span>`
    + `<span class="rc-cable-type">${valT('type', l.type, { cls: 'rc-type', ph: 'type' })}${rendu(l, 'type')}</span>${typeDitJauge(l.type, g) ? '' : pastilleJauge(g)}`
    + `<i class="rc-fleche" data-bulle="${escA((l.route ? 'Route ' + l.route : 'Sans route') + (g != null ? ' · ' + g + ' AWG' : ''))}"></i></span>`; };
const celluleLongueur = r => { const l = r.l, o = l.longueur > 0 ? origineChamp(l, 'longueur') : 'hyp';
  return `<span class="rc-mesure${o === 'hyp' ? ' rc-suppose' : ''}">${chiffre(val('longueur', metres(r.F().L), { cls: 'rc-n', titre: o === 'hyp' ? 'Aucune longueur dans l’installation : la longueur supposée par la simulation. Double-clic pour écrire la longueur mesurée.' : '' }), 'm')}`
    // « supposée » une fois : dans l'en-tête quand toutes les longueurs montrées le sont (la note de sa colonne), sinon sur
    // chaque ligne qui l'est — l'exception se voit, la règle ne se répète pas
    + `${o === 'hyp' ? (RECAP.notes.longueur ? '' : orig('hyp', 'Aucune longueur dans l’installation : la longueur supposée par la simulation (menu ⋮ → Hypothèses)', 'supposée')) : o === 'main' ? orig('main') + rond('longueur', r.l.avant && r.l.avant.longueur > 0 ? 'la longueur de l’installation (' + metres(r.l.avant.longueur) + ' m)' : 'l’hypothèse (' + metres(H_().longueur) + ' m)') : ''}</span>`; };
// l'intensité contre ce que le câble admet : au pire du permanent et de la pointe, une barre comme celle de la fiche
const celluleIntensite = r => { const x = r.F().x; if (!x.fn) return rien;
  const rP = x.continu ? x.I / x.continu : 0, rT = x.pointe && x.pointe.admis ? x.pointe.i / x.pointe.admis : 0, pointe = rT > rP, q = Math.max(rP, rT);
  const niv = x.trop.length ? 'ko' : q > 0.8 ? 'att' : 'ok', i = pointe ? x.pointe.i : x.I, a = pointe ? x.pointe.admis : x.continu;
  return `<span class="rc-int">${chiffre(val('intensite', amp1(i), { cls: 'rc-n rc-calc', titre: 'Double-clic : ' + (x.al ? 'le profil de ' + x.al.nom : 'les hypothèses') }), 'A', niv === 'ko' ? 'ko' : '')}<span class="rc-adm">/ ${amp1(a)}</span>`
    + `<span class="rc-barre ${niv}"><i style="width:${Math.round(Math.min(1, q) * 100)}%"></i></span>${pointe ? '<i class="rc-o">pointe</i>' : x.al ? '' : orig('hyp', 'Aucun disjoncteur en amont : le courant supposé par la simulation (menu ⋮ → Hypothèses)')}</span>`; };
const celluleChute = r => { const c = r.F().c, u = c.total ? c.total.dU : c.dU; if (u == null) return rien;
  const niv = c.trop ? (c.reel ? 'ko' : 'att') : '';
  return `<span class="rc-mesure" data-bulle="${escA(c.total ? 'En ligne depuis ' + r.F().x.al.nom + ' : ' + volts(c.total.dU) + (c.max != null ? ' sur ' + volts(c.max) + ' admis' : '') + (c.reel ? '' : ' (longueurs d’hypothèse)') + '\nSur ce câble : ' + volts(c.dU) : 'Sur ce câble seul : aucun disjoncteur en amont')}">`
    + `${chiffre(`<b class="rc-n">${fmt(u, u < 0.1 ? 3 : 2)}</b>`, 'V', niv)}${c.total && c.max != null ? `<span class="rc-adm">/ ${fmt(c.max, 2)}</span>` : ''}</span>`; };
const COLONNES_LIAISONS = [
  { k: 'de', t: 'De', cls: 'rc-c-bout', html: r => bout(r.l, 'de') + rendu(r.l, 'de'), tri: r => r.l.de + '\u0001' + r.l.borneDe, texte: r => r.l.de + (r.l.borneDe ? ':' + r.l.borneDe : '') },
  { k: 'cable', t: 'Câble', cls: 'rc-c-cable', html: celluleCable, tri: r => r.l.cable, texte: r => [r.l.cable, r.l.type, r.F().jauge != null ? r.F().jauge + ' AWG' : ''].filter(Boolean).join(' ') },
  { k: 'vers', t: 'Vers', cls: 'rc-c-bout', html: r => bout(r.l, 'vers') + rendu(r.l, 'vers'), tri: r => r.l.vers + '\u0001' + r.l.borneVers, texte: r => r.l.vers + (r.l.borneVers ? ':' + r.l.borneVers : '') },
  { k: 'longueur', t: 'Longueur', cls: 'rc-c-mesure', html: celluleLongueur, tri: r => r.F().L, texte: r => metres(r.F().L) + ' m' + (r.l.longueur > 0 ? '' : ' (hypothèse)'),
    note: L => L.every(r => !(r.l.longueur > 0)) ? ['supposée', 'Aucune longueur dans l’installation : chaque câble compte ' + metres(H_().longueur) + ' m, l’hypothèse de la simulation (menu ⋮ → Hypothèses). Écrivez la longueur mesurée d’un double-clic.'] : null },
  { k: 'etat', t: 'État', cls: 'rc-c-etat', html: r => { const e = r.F().etat; return etatHtml(e.niveau, '', e.bulle); }, tri: r => rangEtat(r.F().etat.niveau), texte: motEtatFil },
  // en plus, au choix
  { k: 'jauge', t: 'Gauge', option: true, g: 'Le câble', html: r => pastilleJauge(r.F().jauge), tri: r => r.F().jauge == null ? 99 : r.F().jauge, texte: r => r.F().jauge != null ? r.F().jauge + ' AWG' : '' },
  { k: 'route', t: 'Route', option: true, g: 'Le câble', html: r => `<span class="rc-route">${traitRoute(routes().get(r.l.route || ''))}${valT('route', r.l.route, { ph: 'route' })}${rendu(r.l, 'route')}</span>`, tri: r => r.l.route, texte: r => r.l.route },
  { k: 'intensite', t: 'Intensité', option: true, g: 'Le câble', cls: 'rc-c-int', html: celluleIntensite, tri: r => { const x = r.F().x; return x.continu ? x.I / x.continu : -1; }, texte: r => { const x = r.F().x; return x.fn ? amp1(x.I) + ' A / ' + amp1(x.continu) + ' A' : ''; } },
  { k: 'chute', t: 'Chute', option: true, g: 'Le câble', cls: 'rc-c-mesure', html: celluleChute, tri: r => { const c = r.F().c; return c.total ? c.total.dU : c.dU ?? -1; }, texte: r => { const c = r.F().c, u = c.total ? c.total.dU : c.dU; return u == null ? '' : fmt(u, 2) + ' V'; } },
  { k: 'contactDe', t: 'Contact de', option: true, g: 'Les deux bouts', cls: 'rc-c-ct', html: r => contactH(r.l, r.F(), 'de'), tri: r => (r.F().de || {}).ref || '', texte: r => (r.F().de || {}).ref || '' },
  { k: 'contactVers', t: 'Contact vers', option: true, g: 'Les deux bouts', cls: 'rc-c-ct', html: r => contactH(r.l, r.F(), 'vers'), tri: r => (r.F().vers || {}).ref || '', texte: r => (r.F().vers || {}).ref || '' },
  { k: 'pnDe', t: 'Part number de', option: true, g: 'Les deux bouts', html: r => estMasse(r.l.de) || estRenvoi(r.l.de) ? rien : valT('pnDe', r.l.pnDe, { cls: 'rc-pn', ph: 'part number' }) + rendu(r.l, 'pnDe'), tri: r => r.l.pnDe || '', texte: r => r.l.pnDe || '' },
  { k: 'pnVers', t: 'Part number vers', option: true, g: 'Les deux bouts', html: r => estMasse(r.l.vers) || estRenvoi(r.l.vers) ? rien : valT('pnVers', r.l.pnVers, { cls: 'rc-pn', ph: 'part number' }) + rendu(r.l, 'pnVers'), tri: r => r.l.pnVers || '', texte: r => r.l.pnVers || '' },
  { k: 'plan', t: 'Folio', cls: 'rc-c-folio', option: true, g: 'Le dossier', si: () => modeFolio() !== 'aucun', html: r => modeFolioMemo() === 'auto'
      ? `<span data-bulle="Découpé par l’outil : le folio se lit, il ne s’écrit pas">${(foliosParSourceMemo().get(cleDe(r.l)) || []).map(p => `<button class="rc-f" data-plan="${escA(p)}">${esc(p)}</button>`).join('')}</span>` : valT('plan', r.l.plan, { ph: 'folio' }),
    tri: r => premierFolio(r.l), texte: r => modeFolioMemo() === 'auto' ? (foliosParSourceMemo().get(cleDe(r.l)) || []).join(' ') : r.l.plan },
  { k: 'harness', t: 'Harness', option: true, g: 'Le dossier', html: r => valT('harness', r.l.harness, { ph: 'harness', cls: 'rc-pn' }), tri: r => r.l.harness || '', texte: r => r.l.harness || '' },
  { k: 'fwd', t: 'FWD', option: true, g: 'Le dossier', html: r => valT('fwd', r.l.fwd, { ph: 'dessin', cls: 'rc-pn' }), tri: r => r.l.fwd || '', texte: r => r.l.fwd || '' },
  { k: 'descriptionDe', t: 'Description 1', option: true, g: 'Les deux bouts', html: r => valT('descriptionDe', r.l.descriptionDe, { ph: 'description', cls: 'rc-texte' }), tri: r => r.l.descriptionDe || '', texte: r => r.l.descriptionDe || '' },
  { k: 'descriptionVers', t: 'Description 2', option: true, g: 'Les deux bouts', html: r => valT('descriptionVers', r.l.descriptionVers, { ph: 'description', cls: 'rc-texte' }), tri: r => r.l.descriptionVers || '', texte: r => r.l.descriptionVers || '' },
  { k: 'resistance', t: 'Résistance', cls: 'rc-c-n', option: true, g: 'Le câble', html: r => r.F().R == null ? rien : chiffre(`<b class="rc-n">${fmt(r.F().R * 1000, 0)}</b>`, 'mΩ'), tri: r => r.F().R ?? -1, texte: r => r.F().R == null ? '' : fmt(r.F().R * 1000, 0) + ' mΩ' },
  { k: 'masse', t: 'Masse', cls: 'rc-c-n', option: true, g: 'Le câble', html: r => r.F().masse == null ? rien : chiffre(`<b class="rc-n">${fmt(r.F().masse, 1)}</b>`, 'g'), tri: r => r.F().masse ?? -1, texte: r => r.F().masse == null ? '' : fmt(r.F().masse, 1) + ' g' }];
const ligneLiaison = (l, i) => { const r = { l, i, k: String(i) }; let F = null; r.F = () => F || (F = infoFil(l)); return r; };
const aReprendre = n => n === 'ko' || n === 'att';
const LIAISONS = {
  ajout: 'Liaison', aide: 'Une liaison de plus, en tête : le curseur dans « de » (sur un équipement choisi, « vers »)', cherche: 'Chercher : repère, n° de câble, type…',
  colonnes: COLONNES_LIAISONS, portee: true,
  lignes: () => verite().map(ligneLiaison),
  surFolio: r => surLeFolio(r.l),
  exact: (r, f) => r.l.de === f || r.l.vers === f,
  etat: r => r.F().etat.niveau,
  choisie: r => { const c = app.cible; return !!c && (c.type === 'fil' ? c.l === r.l : r.l.de === c.nom || r.l.vers === c.nom); },
  hors: r => !(liaisonComplete(r.l) && surLeFolio(r.l)),
  puces: () => [['probleme', 'À reprendre', r => aReprendre(r.F().etat.niveau), '', '', 'Les liaisons à reprendre : un problème ou un point à voir', true],
    ...[...routes()].map(([route, c]) => ['route:' + route, route, r => r.l.route === route, traitRoute(c), 'route']),
    ['hyp', 'Sans longueur', r => !(r.l.longueur > 0), '', '', 'Les câbles sans longueur dans l’installation : l’hypothèse de la simulation compte pour eux', false, 'Ce qui manque'],
    ['sanscontact', 'Sans contact', r => [r.F().de, r.F().vers].some(x => x && !x.ref), '', '', 'Un bout dont aucun plan ne donne le contact à sertir', true, 'Ce qui manque']],
  ajouter: () => ajouterLiaison(app.cible && app.cible.type === 'bloc' && !VT_A_POSER.test(app.cible.nom) ? app.cible.nom : ''),
  choisir: r => choisirLigneFil(r.l),
  survol: r => { const w = filDe(r.l); if (w) allumerFil(w); },
  supprimer: r => { const l = r.l; supprimerLiaison(r.i); direRetablir('Liaison ' + (l.cable || '') + ' ' + (l.de || '?') + ' → ' + (l.vers || '?') + ' supprimée.'); },
  editeur: (r, f) => editeurFil(r, f),
  ecrire: (r, f, v) => ecrireFil(r.l, f, v),
  rendre: (r, f) => { const l = r.l; if (f === 'contactDe' || f === 'contactVers') { const de = f === 'contactDe'; app.contrat.designations.delete('sertir|' + (de ? l.de : l.vers) + '|' + (de ? l.borneDe : l.borneVers)); return ecrireFil(l, f, ''); }
    return rendreChamp(l, f); } };
const LISTES = { de: 'reperes', vers: 'reperes', pnDe: 'pns', pnVers: 'pns', type: 'types', route: 'routes', plan: 'folios', contactDe: 'contacts', contactVers: 'contacts' };
// le nom d'un champ qu'on écrit, pour qui ne voit pas l'écran
const LIBELLES_CHAMPS = { cable: 'Numéro du câble', type: 'Type de câble', borneDe: 'Borne de départ', borneVers: 'Borne d’arrivée', pnDe: 'Part number de départ', pnVers: 'Part number d’arrivée', perm: 'Courant permanent', 'pn:': 'Part number' };
function editeurFil(r, f) { const l = r.l;
  if (f === 'intensite') { const x = r.F().x; return { action: () => { if (x.al) choisirRepere(x.al.nom); else ficheHypotheses(); } }; }
  if (f === 'plan' && modeFolio() === 'auto') return null;
  if (f === 'longueur') return { valeur: l.longueur > 0 ? metres(l.longueur) : '', ph: 'm (hypothèse : ' + metres(H_().longueur) + ')', aide: 'en mètres (3,5) ou en millimètres (3500 mm)' };
  if (f === 'contactDe' || f === 'contactVers') { const F = r.F(), x = F[f === 'contactDe' ? 'de' : 'vers']; if (!x) return null;
    return { valeur: x.main ? x.ref : '', ph: x.ref || 'contact à sertir', liste: candidatsContact(F.jauge, x), aide: x.main ? 'vide : le contact calculé revient' : '' }; }
  return { valeur: l[f] == null ? '' : String(l[f]), liste: LISTES[f] }; }
/* Les contacts de la table (la norme des modules) qui vont à cette gauge — et à la taille et au sexe du plan, s'il les dit. */
function candidatsContact(jauge, x) { const T = normeDesModules(app.norme).contacts || [], vus = new Set();
  return T.filter(c => (c.jauge === '*' || jauge == null || +c.jauge === jauge) && (!x.taille || String(c.taille) === String(x.taille)) && (!x.sexe || c.sexe === x.sexe))
    .map(c => c.reference).filter(c => c && !vus.has(c) && vus.add(c)).slice(0, 40); }
/* Écrire un champ d'une liaison : une entrée d'historique, ce que le fichier portait gardé (`changerLiaison`, 08-sections).
   Un champ du fichier vidé reste une chaîne vide (de, vers, borne… : le modèle ne connaît pas « rien »). */
const CHAMPS_DE_BASE = new Set(['de', 'borneDe', 'pnDe', 'vers', 'borneVers', 'pnVers', 'cable', 'type', 'route', 'plan']);
function ecrireFil(l, f, v) { const avant = l[f] == null ? '' : String(l[f]);
  if (f === 'longueur') { if (v === '') { if (!(l.longueur > 0)) return false; }
    else { const x = longueurLue(v); if (x == null) { dire('Longueur illisible : écrivez des mètres (3,5) ou des millimètres (3500 mm).', true); return false; } if (x === l.longueur) return false; v = x; } }
  else if (avant === v) return false;
  if (!(app.cible && app.cible.type === 'bloc')) app.cible = { type: 'fil', l };
  const quoi = f === 'longueur' ? 'longueur de ' + (l.cable || 'la liaison') : /^contact/.test(f) ? 'contact de ' + (l.cable || 'la liaison') : 'modification d’une liaison';
  if (CHAMPS_DE_BASE.has(f) && v === '') { histPush(quoi); if (!(l.avant && f in l.avant)) l.avant = { ...(l.avant || {}), [f]: l[f] == null ? null : l[f] }; l[f] = ''; app.actif = l; apresEdition(); return true; }
  return changerLiaison(l, f, v === '' ? null : v, quoi); }
/* Choisir une liaison : sa fiche à droite, son câble allumé ; sur un autre folio, on y va. */
function choisirLigneFil(l) { if (app.choisi) { app.choisi = null; peindre(); } app.cible = { type: 'fil', l };
  const ou = foliosDe(l); if (app.plan !== '*' && ou.length && !ou.includes(app.plan)) allerAuPlan(ou[0]);
  ouvrirInspecteur(); const w = filDe(l); if (w) allumerFil(w); marquerLignes(); }
/* Une liaison de plus, EN TÊTE de l'onglet : le curseur dans la première case (sur un équipement choisi, « de » est
   déjà écrit : le curseur va dans « vers »). Elle est au bout du contrat ; elle reste en tête jusqu'à ce qu'on ferme. */
function ajouterLiaison(de) { histPush('ajout d’une liaison'); const b = app.base;
  const n = liaison({ de: de || '', plan: (modeFolio() === 'fichier' && app.plan !== '*') ? app.plan : '' }); verite().push(n);
  const i = verite().length - 1, sousBloc = de && app.cible && app.cible.type === 'bloc' && app.cible.nom === de;
  if (!sousBloc) app.cible = { type: 'fil', l: n };
  b.neuves.unshift(n); if (b.onglet !== 'liaisons') changerOnglet('liaisons', true);
  if (!b.ouvert) ouvrirBase(); apresEdition(); rendreBase();
  editerCase(String(i), de ? 'vers' : 'de'); }
function nouvelleLiaison() { ajouterLiaison(app.cible && app.cible.type === 'bloc' && !VT_A_POSER.test(app.cible.nom) ? app.cible.nom : ''); }

/* ---- LES REPÈRES : ce que les onglets Équipements, Disjoncteurs, Barrettes et Prises partagent ---- */
const genreDuRepere = nom => estCoupure(nom) ? 'coupure' : estBarrette(nom) ? 'barrette' : estDisjoncteur(nom) ? 'cb' : 'eqpt';
/* Les repères du contrat (hors renvois, masses et rails) et les barrettes à poser de chaque folio — sans rien calculer de
   leurs plans : l'onglet ne paie que ce qu'il montre. */
const reperes = () => memo('reperes', () => { const V = verite(), par = new Map();
  // les folios d'un repère : ceux du contrat tel qu'il se dessine (découpé par l'outil, ce sont les siens), comme `plansDuRepere`
  app.contrat.liaisons.forEach(l => [l.de, l.vers].forEach(r => { if (!r) return; const s = par.get(r) || par.set(r, new Set()).get(r); if (l.plan) s.add(l.plan); }));
  const out = reperesDe(V).filter(r => !estRenvoi(r) && !estMasse(r) && !estRail(r)).map(nom => ({ nom, k: nom, genre: genreDuRepere(nom), plans: [...(par.get(nom) || [])].sort(triNaturel) }));
  (plans().length ? plans() : ['*']).forEach(p => liaisonsDe(p).forEach(l => { if (l.origine === null && l.vers === l.aPoser && l.borneVers === '1')
    out.push({ nom: l.aPoser, k: l.aPoser + '@' + p, genre: 'barrette', plan: p === '*' ? '' : p, plans: p === '*' ? [] : [p], aPoser: true, sous: 'ajoutée par Volta sur ' + l.de + ':' + l.borneDe }); }));
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
const natureModifiable = r => !r.aPoser && (r.genre === 'eqpt' || r.genre === 'cb');
// l'état d'un repère : ses points du contrôle, comptés (les problèmes d'abord) ; chacun dans la bulle
const etatRepere = nom => { const e = etatDuNom(nom);
  return { niveau: e.niveau || 'ok', mot: e.ko.length ? pluriel(e.ko.length, 'problème') : e.att.length ? e.att.length + INSECABLE + 'à voir' : 'ok', bulle: [...e.ko, ...e.att].map(majuscule).join('\n') }; };
/* Les colonnes que les onglets de repères partagent : le repère (en tête), ses problèmes (au bout), son folio (en plus). */
const COL_REPERE = { k: 'rep', t: 'Repère', cls: 'rc-c-rep', html: r => r.aPoser
    ? `<span class="rc-aposer">${valT('rep', r.nom, { cls: 'rc-r aposer', titre: 'Barrette ajoutée par Volta (plusieurs câbles sur une borne), repère provisoire : double-clic pour écrire son vrai repère' })}<small>${esc(r.sous)}</small><button type="button" class="rc-poser" data-poser="1" data-bulle="${escA('Lui donner son vrai repère (' + prochainRepereVT(r) + ' proposé) : elle entre au contrat')}">Poser</button></span>`
    : valT('rep', r.nom, { cls: 'rc-r', titre: 'Double-clic pour renommer : chaque câble suit' }),
  tri: r => r.nom, texte: r => r.nom + (r.aPoser ? ' (repère provisoire)' : '') };
const COL_PROBLEMES = { k: 'etat', t: 'Problèmes', cls: 'rc-c-etat', html: r => { const e = etatRepere(r.nom); return etatHtml(e.niveau, e.mot, e.bulle); },
  tri: r => { const e = etatDuNom(r.nom); return e.ko.length ? -100 * e.ko.length - e.att.length : -e.att.length; }, texte: r => etatRepere(r.nom).mot };
const COL_FOLIO = { k: 'folio', t: 'Folio', cls: 'rc-c-folio', option: true, html: r => r.plans.length ? `<span class="rc-folios">${esc(listeFolios(r.plans))}</span>` : rien, tri: r => r.plans[0] || '', texte: r => r.plans.join(' ') };
const surFolioRepere = r => app.plan === '*' || (r.plan ? r.plan === app.plan : r.plans.includes(app.plan));
const choisieRepere = r => !!app.cible && app.cible.type === 'bloc' && app.cible.nom === r.nom;
const ONGLET_REPERES = { portee: true, surFolio: surFolioRepere, exact: (r, f) => r.nom === f, choisie: choisieRepere, etat: r => etatDuNom(r.nom).niveau,
  choisir: r => choisirRepere(r.nom, r.plan), survol: r => survolRepere(r.nom) };
const PUCE_A_REPRENDRE = ['probleme', 'À reprendre', r => !!etatDuNom(r.nom).niveau, '', '', 'Un problème ou un point à voir'];

/* ---- ÉQUIPEMENTS (les équipements seuls : les disjoncteurs, barrettes et prises ont leur onglet) ---- */
const equipements = () => memo('eqpts', () => reperes().filter(r => r.genre === 'eqpt'));
const COLONNES_EQUIPEMENTS = [COL_REPERE,
  { k: 'nature', t: 'Type', cls: 'rc-c-nature', html: r => { const d = natureDite(r.nom);
      return `<span class="rc-nature">${valT('nature', majuscule(natureDe(r.nom)), { titre: (d ? 'Dit à la main ; le code du repère dit « ' + natureAuto(r.nom) + ' »' : 'Lu dans le code du repère') + ' — double-clic pour le changer' })}${d ? orig('main') + rond('nature', 'le type que dit le code (' + natureAuto(r.nom) + ')') : ''}</span>`; },
    tri: r => natureDe(r.nom), texte: r => majuscule(natureDe(r.nom)) },
  { k: 'norme', t: 'Norme', cls: 'rc-c-norme', html: r => { const N = normesDuRepere(r.nom); return N.length ? `<span class="rc-norme" data-bulle="${escA(N.flatMap(n => n.cs).join('\n'))}">${N.map(n => esc(n.norme)).join('<i class="rc-pt">·</i>')}</span>` : rien; },
    tri: r => normesDuRepere(r.nom).map(n => n.norme).join(' '), texte: r => normesDuRepere(r.nom).map(n => n.norme).join(' · ') },
  COL_PROBLEMES,
  { k: 'des', t: 'Désignation', option: true, g: 'Ce qu’il est', html: r => valT('des', app.contrat.designations.get(r.nom) || '', { cls: 'rc-texte', ph: 'à écrire' }), tri: r => app.contrat.designations.get(r.nom) || '', texte: r => app.contrat.designations.get(r.nom) || '' },
  { k: 'pn', t: 'Part number', option: true, g: 'Ce qu’il est', html: r => { const I = baseRepere(r.nom);
      return `<span class="rc-pns">${I.pns.map(c => `<span class="rc-pnl">${I.pns.length > 1 ? `<i class="rc-cn">${esc(c.nom)}</i>` : ''}${valT('pn:' + c.nom, c.pn, { cls: 'rc-pn', ph: 'part number', titre: 'Double-clic : toutes ses liaisons le prennent' })}</span>`).join('')}</span>`; },
    tri: r => baseRepere(r.nom).pns.map(c => c.pn).join(' '), texte: r => baseRepere(r.nom).pns.map(c => c.pn).filter(Boolean).join(' ') },
  { k: 'connecteurs', t: 'Connecteurs', option: true, g: 'Ce qu’il est', html: r => { const I = infoRepere(r); return I.connecteurs.length ? `<span class="rc-cnx">${I.connecteurs.map(c => `<i class="${c.ko ? 'ko' : ''}" data-bulle="${escA((c.pn || 'sans part number') + (c.ref ? ' · ' + c.ref : '') + ' · ' + pluriel(c.bornes.length, 'borne') + (c.ko ? ' — aucun arrangement ne convient' : ''))}">${esc(c.nom)}</i>`).join('')}</span>` : rien; },
    tri: r => infoRepere(r).connecteurs.length, texte: r => infoRepere(r).connecteurs.map(c => c.nom).join(' ') },
  { k: 'cables', t: 'Câbles', cls: 'rc-c-n', option: true, g: 'Ce qu’il porte', html: r => `<b class="rc-n">${nCablesDuRepere(r)}</b>`, tri: nCablesDuRepere, texte: r => String(nCablesDuRepere(r)) },
  { k: 'contacts', t: 'Contacts', cls: 'rc-c-n', option: true, g: 'Ce qu’il porte', html: r => { const c = infoRepere(r).contacts; return c ? `<span class="rc-frac"><b class="rc-n">${c[0]}</b><i>/ ${c[1] == null ? '?' : c[1]}</i></span>` : rien; },
    tri: r => (infoRepere(r).contacts || [-1])[0], texte: r => { const c = infoRepere(r).contacts; return c ? c[0] + ' / ' + (c[1] == null ? '?' : c[1]) : ''; } },
  COL_FOLIO,
  { k: 'deja', t: 'Déjà fait', cls: 'rc-c-n', option: true, si: () => !!indexReferences(), html: r => { const c = dejaFait(r.nom); return c ? `<span class="rc-deja" data-bulle="${escA(c.repere + ' de ' + c.harness)}"><b class="rc-n">${Math.round(c.taux * 100)}</b><i>%</i></span>` : rien; },
    tri: r => { const c = dejaFait(r.nom); return c ? c.taux : -1; }, texte: r => { const c = dejaFait(r.nom); return c ? Math.round(c.taux * 100) + ' %' : ''; } }];
const EQUIPEMENTS = { ...ONGLET_REPERES,
  ajout: 'Équipement', aide: 'Un équipement de plus, en tête : écrivez son repère, puis ses câbles dans Liaisons', cherche: 'Chercher : repère, type, norme…',
  colonnes: COLONNES_EQUIPEMENTS,
  // un équipement qu'on vient d'ajouter reste là, quel que soit son code
  lignes: () => { const n = app.base.neufs; return n.length ? reperes().filter(r => r.genre === 'eqpt' || (!r.aPoser && n.includes(r.nom))) : equipements(); },
  puces: () => [PUCE_A_REPRENDRE],
  ajouter: () => { app.base.nouveau = true; rendreBase(true); editerCase('+', 'rep'); },
  editeur: (r, f) => editeurRepere(r, f),
  ecrire: (r, f, v) => ecrireRepere(r, f, v),
  rendre: (r, f) => f === 'nature' ? ecrireRepere(r, 'nature', '') : false };
function editeurRepere(r, f) {
  if (f === 'rep') return { valeur: r.nouveau ? '' : r.nom, ph: r.nouveau ? 'repère du nouvel équipement, par exemple 105RL2' : 'repère', aide: r.aPoser ? 'le vrai repère : la barrette entre au contrat' : '' };
  if (f === 'nature') { if (!natureModifiable(r)) return null; const auto = natureAuto(r.nom), d = natureDite(r.nom);
    const opts = [['', 'Automatique · ' + auto], ...Object.entries(CODES).filter(([, c]) => c.forme === 'equipement').sort((a, b) => a[1].nom.localeCompare(b[1].nom, 'fr')).map(([k, c]) => [k, majuscule(c.nom) + ' (' + k + ')']), ['EQ', 'Équipement, sans type']];
    return { valeur: d, options: opts }; }
  if (f === 'des') return r.aPoser ? null : { valeur: app.contrat.designations.get(r.nom) || '', ph: 'désignation' };
  if (/^pn:/.test(f)) { const c = baseRepere(r.nom).pns.find(x => 'pn:' + x.nom === f); return c ? { valeur: c.pn || '', liste: 'pns', aide: c.bornes ? 'connecteur ' + c.nom + ' : toutes ses liaisons suivent' : 'toutes ses liaisons suivent' } : null; }
  return null; }
function ecrireRepere(r, f, v) { const nom = r.nom;
  if (f === 'rep') { if (r.nouveau) { app.base.nouveau = false; if (!v) return false; return creerEquipement(v); }
    if (!v || v === nom) return false; return renommerRepere(nom, v, r); }
  if (f === 'nature') { if (v === natureDite(nom)) return false; histPush('type de ' + nom); designer(CLE_NATURE(nom), v); apresEdition();
    const g = genreDuRepere(nom), ailleurs = g === 'cb' ? ' — il passe dans l’onglet Disjoncteurs' : '';
    dire(v ? nom + ' : ' + natureDe(nom) + ', dit à la main' + ailleurs + '.' : nom + ' : le type du code revient (' + natureAuto(nom) + ').'); return true; }
  if (f === 'des') { if (v === (app.contrat.designations.get(nom) || '')) return false; histPush('désignation de ' + nom); designer(nom, v); apresEdition(); return true; }
  if (/^pn:/.test(f)) { const c = baseRepere(r.nom).pns.find(x => 'pn:' + x.nom === f); return c ? changerPartNumber(nom, c.bornes, v) : false; }
  return false; }
/* Renommer un repère d'ici (comme la fiche) : chaque câble suit, ses choix aussi ; une barrette à poser entre au contrat. */
function renommerRepere(nom, nr, r) { const b = app.base;
  if (r && r.aPoser) { if (r.plan && r.plan !== app.plan && plans().includes(r.plan)) allerAuPlan(r.plan); const ok = poserBarrette(nom, nr); if (ok) RECAP.renomme = [r.k, nr]; return ok; }
  if (verite().some(l => l.de === nr || l.vers === nr)) { dire(nr + ' existe déjà au contrat : choisissez un autre repère.', true); return false; }
  histPush('renommage de ' + nom); renommer(nom, nr);
  const D = app.contrat.designations, n = D.get(CLE_NATURE(nom)); if (n) { D.delete(CLE_NATURE(nom)); D.set(CLE_NATURE(nr), n); }
  if (app.cible && app.cible.type === 'bloc' && app.cible.nom === nom) { app.cible = { type: 'bloc', nom: nr }; app.choisi = nr; }
  if (b.filtre === nom) b.filtre = nr; RECAP.renomme = [r ? r.k : nom, nr]; b.neufs = b.neufs.map(x => x === nom ? nr : x);
  apresEdition(); return true; }
function creerEquipement(nom) { if (verite().some(l => l.de === nom || l.vers === nom)) { dire(nom + ' existe déjà au contrat.', true); return false; }
  histPush('ajout de ' + nom); verite().push(liaison({ de: nom, plan: (modeFolio() === 'fichier' && app.plan !== '*') ? app.plan : '' }));
  app.base.neufs.unshift(nom); app.cible = { type: 'bloc', nom }; app.base.focus = { k: nom, f: 'nature' }; apresEdition();
  dire(nom + ' : ses câbles s’écrivent dans l’onglet Liaisons (une ligne l’attend, « vers » à écrire).'); return true; }
/* Le part number d'un connecteur (ou de tout le repère) : toutes ses liaisons le prennent, en une action (Ctrl+Z). */
function changerPartNumber(nom, bornes, pn) { const xs = [];
  verite().forEach(l => { if (l.de === nom && (!bornes || bornes.includes(l.borneDe)) && (l.pnDe || '') !== pn) xs.push([l, 'pnDe']); if (l.vers === nom && (!bornes || bornes.includes(l.borneVers)) && (l.pnVers || '') !== pn) xs.push([l, 'pnVers']); });
  return changerLiaisons(xs.map(([l, k]) => [l, k, pn]), 'part number de ' + nom); }   // plusieurs liaisons, un seul Ctrl+Z (08-sections)
/* Choisir un repère depuis une ligne : son folio, son bloc, sa fiche — sans toucher au filtre de l'onglet. */
function choisirRepere(nom, plan) { const P = plans();
  if (plan && plan !== app.plan && P.includes(plan)) allerAuPlan(plan);
  else if (!plan) { const ou = plansDuRepere(nom); if (app.plan !== '*' && ou.length && !ou.includes(app.plan)) allerAuPlan(ou[0]); }
  app.choisi = nom; app.cible = { type: 'bloc', nom }; peindre(); ouvrirInspecteur(); rallumer(); }
function survolRepere(nom) { if (app.dessin && app.dessin.compDe.has(nom)) allumerBloc(nom); else if (barretteAPoser(nom)) allumerBarretteAPoser(nom); }

/* ---- DISJONCTEURS : le calibre retenu, son verdict, le meilleur ----------------- */
const disjoncteurs = () => memo('disj', () => reperes().filter(r => r.genre === 'cb'));
function infoDisj(nom) { return memo('dj|' + nom, () => { const d = disjonctionDe(nom), H = H_(), V = verite();
  const I = d.profil && d.profil.perm && d.profil.perm.i > 0 ? d.profil.perm.i : d.calibre > 0 ? d.calibre : H.courant, courts = d.points.filter(p => p.t !== Infinity && p.i > 0);
  let pire = null; try { chutesDepuis(app.norme, V, nom, I, H, courts).forEach(c => { if (!pire || c.dU > pire.dU) pire = c; }); } catch (_) { }
  const ok = d.fils.filter(f => f.verdict !== 'fil' && f.verdict !== 'calibre' && f.protege !== false).length;
  const pointe = d.points.find(p => p.t !== Infinity) || null, perm = etatsDuProfil(d.profil).find(e => e.k === 'perm');
  const o = origineDuCalibre(nom, d);
  return { d, pire, ok, n: d.fils.length, pointe, perm: perm && perm.i > 0 ? perm.i : null, pn: pnDuRepere(nom), origine: o.origine, rendu: o.calRetest ? 'celui de l’installation (' + amperes(o.calRetest) + ')' : 'l’automatique' + (d.calibreIdeal ? ' (' + amperes(d.calibreIdeal) + ')' : '') }; }); }
/* LE VERDICT du calibre retenu, en TROIS MOTS — passe, juste, déclenche —, ceux de la fiche, du cadran, des problèmes et du
   dossier (v73, l'ingénieur n° 8 : « tient », « touche la courbe » ici, « passe » là ; la table unique est celle du moteur,
   `VERDICTS_CALIBRE`, 09-disjoncteurs) ; « touche la courbe », « sans la marge » vont dans la bulle, avec le pourquoi
   chiffré du moteur (`pourquoiDuCalibre`) et chaque état du profil contre la courbe. */
const MOTS_TROIS = { passe: { mot: 'passe', etat: 'ok', bulle: 'Il ne déclenche pas, avec la marge.' }, juste: { mot: 'touche la courbe', etat: 'ko', bulle: 'Il touche la courbe : il ne passe pas.' }, declenche: { mot: 'déclenche', etat: 'ko', bulle: 'Il déclenche.' } };
const verdictTrois = g => { if (typeof verdictDeCalibre === 'function') { try { return verdictDeCalibre(g); } catch (_) { return null; } }
  if (!g || g.valide == null) return null; return g.valide === false ? MOTS_TROIS.declenche : (g.marge != null ? g.marge : g.avecMarge) ? MOTS_TROIS.passe : MOTS_TROIS.juste; };
function verdictDuCalibre(d) { if (!d.calibre) return { n: '', mot: '' };
  if (d.sansProfil) return { n: 'att', mot: 'sans profil', bulle: 'Le profil de charge est à renseigner : sans lui, le calibre ne se juge pas' };
  if (d.sansCourbe) return { n: '', mot: '' };
  const v = verdictTrois(d) || (!d.valide ? MOTS_TROIS.declenche : d.serre ? MOTS_TROIS.juste : MOTS_TROIS.passe);
  let pq = null; try { pq = typeof pourquoiDuCalibre === 'function' ? pourquoiDuCalibre(app.norme, d, d.calibre) : null; } catch (_) { pq = null; }
  const motPoint = p => p.ok === false ? 'déclenche' : p.serre ? 'juste (touche la courbe)' : 'passe';
  const etats = d.points.filter(p => p.ok != null).map(p => `${majuscule(p.nom || 'état')} ${amperes(p.i)}${p.t === Infinity ? ' en permanent' : ' pendant ' + secondes(p.t)} : ${motPoint(p)}`).join('\n');
  return { n: v.etat, mot: v.mot, bulle: [pq ? majuscule(pq.phrase) + '.' : v.bulle, etats].filter(Boolean).join('\n') }; }
/* Le calibre que l'INSTALLATION écrit (son part number, celui du fichier quand on l'a changé ici) : à côté du retenu, barré
   quand Volta en retient un autre (l'ingénieur v73 : « le 10 A du retest est invisible ici, alors que la fiche l'écrit
   barré ») ; la colonne se dit « Installation » (v74), la clé `retest` reste. */
const calibreDuRetest = r => { const D = infoDisj(r.nom), o = origineDuCalibre(r.nom, D.d); return o.calRetest || D.d.pn || null; };
const COLONNES_DISJ = [COL_REPERE,
  { k: 'calibre', t: 'Calibre', cls: 'rc-c-mesure', html: r => { const D = infoDisj(r.nom), d = D.d, main = D.origine === 'main', propose = typeof propositionNonEcrite === 'function' && propositionNonEcrite(d);
      return `<span class="rc-mesure">${chiffre(val('calibre', d.calibre ? fmt(d.calibre, 2) : '', { cls: 'rc-n rc-fort rc-gamme-v', ph: '—', titre: (main ? 'Choisi à la main' : propose ? 'Proposé par Volta, pas encore écrit dans l’installation' : 'Choisi automatiquement') + ' — un clic, Entrée ou un double-clic : toute la gamme' }), d.calibre ? 'A' : '')}`
        + `${main ? orig('main') + rond('calibre', D.rendu) : propose ? '<i class="rc-o rc-propose" data-bulle="Volta le retient ; l’installation garde le sien tant que « Passer en … » (la fiche) ou le relevé de l’installation corrigée ne l’écrit pas">proposé</i>' : ''}</span>`; },
    tri: r => infoDisj(r.nom).d.calibre || 0, texte: r => { const d = infoDisj(r.nom).d; return d.calibre ? amperes(d.calibre) : ''; } },
  { k: 'retest', t: 'Installation', cls: 'rc-c-mesure', html: r => { const c = calibreDuRetest(r), d = infoDisj(r.nom).d; if (!c) return rien; const autre = d.calibre && c !== d.calibre;
      return `<span class="rc-mesure rc-retest${autre ? ' autre' : ''}" data-bulle="${escA('L’installation porte ' + (pnDuRepere(r.nom) || 'son part number') + (autre ? ' : ' + amperes(c) + ' — Volta retient ' + amperes(d.calibre) : ''))}">${autre ? chiffre(`<s class="rc-n">${fmt(c, 2)}${unite('A')}</s>`) : chiffre(`<b class="rc-n">${fmt(c, 2)}</b>`, 'A')}</span>`; },
    tri: r => calibreDuRetest(r) || 0, texte: r => { const c = calibreDuRetest(r); return c ? amperes(c) : ''; } },
  { k: 'verdict', t: 'Verdict', cls: 'rc-c-etat', html: r => { const v = verdictDuCalibre(infoDisj(r.nom).d); return etatHtml(v.n, v.mot, v.bulle); }, tri: r => rangEtat(verdictDuCalibre(infoDisj(r.nom).d).n), texte: r => verdictDuCalibre(infoDisj(r.nom).d).mot },
  COL_PROBLEMES,
  { k: 'ideal', t: 'Meilleur', cls: 'rc-c-mesure', option: true, html: r => { const d = infoDisj(r.nom).d; if (!d.calibreIdeal) return rien; const pq = d.meilleur && d.meilleur.pourquoi;
      return `<span class="rc-mesure"${pq ? ` data-bulle="${escA(majuscule(pq))}"` : ''}>${chiffre(`<i class="rc-etoile" aria-label="le meilleur">${ico('etoile')}</i><b class="rc-n">${fmt(d.calibreIdeal, 2)}</b>`, 'A')}${d.calibre !== d.calibreIdeal ? `<button type="button" class="rc-lien" data-retenir="${d.calibreIdeal}" data-bulle="${escA('Retenir ' + amperes(d.calibreIdeal))}">Retenir</button>` : ''}</span>`; },
    tri: r => infoDisj(r.nom).d.calibreIdeal || 0, texte: r => { const d = infoDisj(r.nom).d; return d.calibreIdeal ? amperes(d.calibreIdeal) : ''; } },
  { k: 'pn', t: 'Part number', option: true, html: r => valT('pn:', infoDisj(r.nom).pn, { cls: 'rc-pn', ph: 'part number', titre: 'Double-clic : toutes ses liaisons le prennent' }), tri: r => infoDisj(r.nom).pn, texte: r => infoDisj(r.nom).pn },
  { k: 'profil', t: 'Permanent', cls: 'rc-c-mesure', w: 72, option: true, html: r => { const D = infoDisj(r.nom);
      return `<span class="rc-mesure">${chiffre(val('perm', D.perm != null ? fmt(D.perm, 2) : '', { cls: 'rc-n', ph: 'A', titre: 'Le courant permanent du profil de charge — double-clic pour l’écrire' }), D.perm != null ? 'A' : '')}${D.pointe ? `<small class="rc-pointe">pointe ${esc(amperes(D.pointe.i))} · ${esc(secondes(D.pointe.t))}</small>` : ''}</span>`; },
    tri: r => infoDisj(r.nom).perm ?? -1, texte: r => { const D = infoDisj(r.nom); return (D.perm != null ? amperes(D.perm) : '') + (D.pointe ? ' pointe ' + amperes(D.pointe.i) + ' ' + secondes(D.pointe.t) : ''); } },
  { k: 'cables', t: 'Câbles protégés', cls: 'rc-c-n', option: true, html: r => { const D = infoDisj(r.nom); return D.n ? `<span class="rc-frac${D.ok < D.n ? ' ko' : ''}"><b class="rc-n">${D.ok}</b><i>/ ${D.n}</i></span>` : rien; },
    tri: r => { const D = infoDisj(r.nom); return D.n ? D.ok / D.n : -1; }, texte: r => { const D = infoDisj(r.nom); return D.ok + ' / ' + D.n; } },
  { k: 'chute', t: 'Pire chute', cls: 'rc-c-mesure', option: true, html: r => { const p = infoDisj(r.nom).pire; if (!p) return rien;
      return `<span class="rc-mesure" data-bulle="${escA(majuscule(p.mots || '') + (p.admis != null ? ' · ' + volts(p.admis) + ' admis' : '') + (p.reel ? '' : ' · sur des longueurs d’hypothèse'))}">${chiffre(`<b class="rc-n">${fmt(p.dU, 2)}</b>`, 'V', p.trop ? (p.reel ? 'ko' : 'att') : '')}${p.admis != null ? `<span class="rc-adm">/ ${fmt(p.admis, 2)}</span>` : ''}${p.reel ? '' : orig('hyp', 'Sur des longueurs supposées par la simulation', 'supposée')}</span>`; },
    tri: r => (infoDisj(r.nom).pire || { dU: -1 }).dU, texte: r => { const p = infoDisj(r.nom).pire; return p ? fmt(p.dU, 2) + ' V' : ''; } },
  { k: 'courbe', t: 'Courbe', option: true, html: r => { const d = infoDisj(r.nom).d; return `<span class="rc-mot">${esc(d.famille ? d.famille.famille : d.courbe || 'par défaut')}</span>`; }, tri: r => { const d = infoDisj(r.nom).d; return d.famille ? d.famille.famille : d.courbe || ''; }, texte: r => { const d = infoDisj(r.nom).d; return d.famille ? d.famille.famille : d.courbe || ''; } },
  COL_FOLIO];
const DISJONCTEURS = { ...ONGLET_REPERES, colonnes: COLONNES_DISJ, lignes: disjoncteurs, cherche: 'Chercher : repère, calibre…',
  choisir: r => choisirRepere(r.nom),
  puces: () => [PUCE_A_REPRENDRE, ['sansprofil', 'Sans profil', r => !!infoDisj(r.nom).d.sansProfil, '', '', 'Le profil de charge est à renseigner']],
  editeur: (r, f) => { const D = infoDisj(r.nom), d = D.d;
    if (f === 'rep') return { valeur: r.nom };
    if (f === 'pn:') return { valeur: D.pn, liste: 'pns', aide: 'toutes ses liaisons suivent' };
    // TOUTE la gamme, dans le composant de la fiche (`choixDuCalibre`, 08-disjoncteurs) : la liste qui tombe de la case
    if (f === 'calibre') return d.sansCourbe || !(d.gamme || []).length ? null : { gamme: true };
    if (f === 'perm') return { valeur: D.perm != null ? fmt(D.perm, 2) : '', ph: 'A', aide: 'le courant permanent, en ampères' };
    return null; },
  ecrire: (r, f, v) => { const nom = r.nom;
    if (f === 'rep') return v && v !== nom ? renommerRepere(nom, v, r) : false;
    if (f === 'pn:') return changerPartNumber(nom, null, v);
    if (f === 'calibre') { const D = infoDisj(nom); if (v) return +v !== D.d.calibre && retenirCalibre(nom, nombreLu(v)); if (D.origine !== 'main') return false; rendreCalibre(nom); return true; }
    if (f === 'perm') { const x = v ? nombreLu(v) : null; if (v && x == null) { dire('Écrivez un courant en ampères (3,5).', true); return false; } return ecrireCharge(nom, c => { c.perm = { ...(c.perm || {}), i: x }; }, 'profil de charge de ' + nom); }
    return false; },
  rendre: (r, f) => { if (f !== 'calibre') return false; rendreCalibre(r.nom); return true; } };
/* ---- LE CHOIX DU CALIBRE : la liste qui tombe de la case (v73) ---------------------------------------------------------
   Le lecteur : « sur un disjoncteur, je ne peux choisir que les calibres du dessus ; je dois TOUT pouvoir sélectionner ».
   La case Calibre ouvre TOUTE la gamme — le même composant que le cadran et « À la main » de la fiche (`choixDuCalibre`,
   08-disjoncteurs : un calibre, sa clé et son mot — passe, juste, déclenche —, sa raison sur une ligne, le retenu,
   l'automatique, celui du retest, ceux hors des calibres préférés) — dans le verre des menus : la marque et le mot dans la
   couleur de leur état, la raison dessous ; TOUS se choisissent (un calibre qui déclenche se retient, rouge partout, Ctrl+Z
   le rend) ; « Tout le catalogue MS3320 (13) » ajoute ceux que les Hypothèses écartent ; « Rendre l'automatique » quand
   le calibre a été choisi à la main. ↑ ↓ parcourent, Entrée retient, Échap rend le clavier à la case. */
const GAMME = { el: null, nom: '', cle: null, tout: {} };
// sans le composant de la fiche, la même liste, lue dans la gamme jugée du moteur
function calibresDuChoix(nom, tout) { if (typeof choixDuCalibre === 'function') { try { return choixDuCalibre(nom, tout); } catch (_) { } }
  const d = disjonctionDe(nom); if (d.sansCourbe) return [];
  return (d.gamme || []).slice().sort((a, b) => a.calibre - b.calibre).map(g => { const v = verdictTrois(g) || {}, cle = Object.keys(MOTS_TROIS).find(k => MOTS_TROIS[k].mot === v.mot) || '';
    let pq = null; try { pq = typeof pourquoiDuCalibre === 'function' ? pourquoiDuCalibre(app.norme, d, g.calibre) : null; } catch (_) { }
    return { calibre: g.calibre, cle, mot: v.mot || '', etat: v.etat || '', raison: pq ? pq.phrase.replace(/^[^—]*—\s*[^:]*:?\s*/, '') : '', retenu: g.calibre === d.calibre, auto: g.calibre === d.passe, retest: g.calibre === d.pn, hors: false, bulle: pq ? pq.phrase : '' }; }); }
const MARQUE_GAMME = { passe: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', juste: '<path d="M4.5 13.5c2.2-3.2 4.3-3.2 6.5 0s4.3 3.2 6.5 0"/>', declenche: '<path d="M6 6l12 12M18 6 6 18"/>' };
const marqueGamme = k => MARQUE_GAMME[k] ? `<svg class="ico rc-g-marque" viewBox="0 0 24 24" aria-hidden="true">${MARQUE_GAMME[k]}</svg>` : '<i class="rc-g-marque"></i>';
function gammeHtml(nom) { const tout = !!GAMME.tout[nom], xs = calibresDuChoix(nom, tout), D = infoDisj(nom), d = D.d, F = d.famille, fam = (F && (F.famille || F.nom)) || '';
  const nPref = (d.catalogue || d.gamme || []).length, nTout = typeof catalogueDeLaFamille === 'function' && F ? catalogueDeLaFamille(F).length : nPref;
  const ligne = x => `<button type="button" role="option" class="rc-g-l ${x.cle || 'inconnu'}${x.hors ? ' hors' : ''}" data-cal="${x.calibre}" aria-selected="${!!x.retenu}" tabindex="-1"`
    + ` aria-label="${escA(amperes(x.calibre) + (x.mot ? ', ' + x.mot : '') + (x.retenu ? ', retenu' : '') + (x.auto ? ', l’automatique' : '') + (x.retest ? ', celui de l’installation' : ''))}"${x.bulle ? ` aria-description="${escA(x.bulle)}"` : ''}>`
    + `<span class="rc-g-h">${marqueGamme(x.cle)}<b>${esc(nombre(x.calibre))}<small>A</small></b><em>${esc(x.mot || 'pas jugé')}</em>`
    + `<span class="rc-g-tags">${x.auto ? `<i class="rc-g-tag auto">${ico('etoile')}${x.propose || (x.retenu && typeof propositionNonEcrite === 'function' && propositionNonEcrite(d)) ? 'proposé' : 'automatique'}</i>` : ''}${x.retest && !x.retenu ? '<i class="rc-g-tag">installation</i>' : ''}${x.hors ? '<i class="rc-g-tag hors">hors préférés</i>' : ''}</span></span>`
    + (x.raison ? `<span class="rc-g-r">${esc(majuscule(x.raison))}</span>` : '') + '</button>';
  return `<div class="rc-g-tete"><b>${esc(nom)}</b><span>${esc(fam ? 'Gamme ' + fam : 'La gamme')}${xs.length ? ' · ' + pluriel(xs.length, 'calibre') : ''}</span></div>`
    + `<div class="rc-g-liste" role="listbox" aria-label="${escA('Le calibre de ' + nom)}">${xs.map(ligne).join('')}</div>`
    + `<div class="rc-g-pied">${nTout > nPref ? `<button type="button" class="rc-g-cat" data-g-tout="${tout ? 0 : 1}">${tout ? `Seulement vos calibres préférés (${nPref})` : `Tout le catalogue ${esc(fam)} (${nTout})`}</button>` : ''}`
    + `${D.origine === 'main' ? `<button type="button" class="rc-g-cat" data-g-rendre="1">Rendre ${esc(D.rendu)}</button>` : ''}</div>`; }
function ouvrirGamme(cellule, nom) { fermerGamme(); const tr = cellule.closest('tr[data-k]');
  const el = document.createElement('div'); el.id = 'rc-gamme'; el.className = 'rc-gamme menu-verre entre-v'; el.innerHTML = gammeHtml(nom); document.body.appendChild(el);
  GAMME.el = el; GAMME.nom = nom; GAMME.cle = tr ? { k: tr.dataset.k, f: 'calibre' } : null; cellule.setAttribute('aria-expanded', 'true');
  placerGamme(cellule); lierGamme(el, nom);
  const b = el.querySelector('.rc-g-l[aria-selected="true"]') || el.querySelector('.rc-g-l'); if (b) { b.tabIndex = 0; b.focus({ preventScroll: true }); b.scrollIntoView({ block: 'nearest' }); } }
function placerGamme(cellule) { const el = GAMME.el; if (!el) return; const r = cellule.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight, W = innerWidth, H = innerHeight;
  const bas = r.bottom + 6 + h <= H - 8, y = bas ? r.bottom + 6 : Math.max(8, r.top - 6 - h);
  el.style.left = Math.max(8, Math.min(r.left - 14, W - w - 8)) + 'px'; el.style.top = y + 'px'; el.style.setProperty('--entre-y', bas ? '-4px' : '4px'); }
function fermerGamme(rendre) { const el = GAMME.el; if (!el) return; GAMME.el = null; el.remove(); document.querySelectorAll('#ba-tbody [aria-expanded="true"][data-f="calibre"]').forEach(c => c.removeAttribute('aria-expanded'));
  if (rendre && GAMME.cle) { const c = elementDe(GAMME.cle); if (c) { try { c.focus({ preventScroll: true }); } catch (_) { c.focus(); } } } }
function retenirDeLaGamme(nom, cal) { const x = calibresDuChoix(nom, !!GAMME.tout[nom]).find(y => y.calibre === cal), cle = GAMME.cle; fermerGamme();
  const rendre = () => { const c = cle && elementDe(cle); if (c) { try { c.focus({ preventScroll: true }); } catch (_) { c.focus(); } } };
  if (!x || x.retenu) { rendre(); return; }
  retenirCalibre(nom, cal); requestAnimationFrame(rendre); }
function lierGamme(el, nom) { const lignes = () => [...el.querySelectorAll('.rc-g-l, .rc-g-cat')];
  el.addEventListener('click', e => { const l = e.target.closest('.rc-g-l'); if (l) { retenirDeLaGamme(nom, +l.dataset.cal); return; }
    const t = e.target.closest('[data-g-tout]'); if (t) { GAMME.tout[nom] = t.dataset.gTout === '1'; const c = GAMME.cle && elementDe(GAMME.cle); if (c) { ouvrirGamme(c, nom); const n = GAMME.el && GAMME.el.querySelector('[data-g-tout]'); if (n) n.focus(); } return; }
    if (e.target.closest('[data-g-rendre]')) { fermerGamme(); rendreCalibre(nom); requestAnimationFrame(() => { const c = GAMME.cle && elementDe(GAMME.cle); if (c) c.focus({ preventScroll: true }); }); } });
  el.addEventListener('keydown', e => { const xs = lignes(), i = xs.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fermerGamme(true); return; }
    if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); fermerGamme(true); return; }
    const pas = { ArrowDown: 1, ArrowUp: -1, Home: -Infinity, End: Infinity }[e.key]; if (pas == null || !xs.length) return; e.preventDefault(); e.stopPropagation();
    const j = pas === -Infinity ? 0 : pas === Infinity ? xs.length - 1 : Math.max(0, Math.min(xs.length - 1, (i < 0 ? 0 : i) + pas)); xs.forEach(x => { x.tabIndex = -1; }); xs[j].tabIndex = 0; xs[j].focus(); xs[j].scrollIntoView({ block: 'nearest' }); }); }
// un appui ailleurs, la table qui défile, la fenêtre qui change : la liste se replie
document.addEventListener('pointerdown', e => { if (GAMME.el && !GAMME.el.contains(e.target)) { GAMME.ferme = Date.now(); fermerGamme(); } }, true);
window.addEventListener('resize', () => fermerGamme());
function ecrireCharge(nom, f, quoi) { const avant = chargeDe(nom), c = JSON.parse(JSON.stringify(avant || {})); f(c);
  if (JSON.stringify(c) === JSON.stringify(avant || {})) return false; histPush(quoi); if (!app.contrat.charges) app.contrat.charges = new Map(); app.contrat.charges.set(nom, c); apresEdition(); return true; }

/* ---- BARRETTES : la norme, le module, ce qui reste libre ------------------------ */
const barrettes = () => memo('barr', () => reperes().filter(r => r.genre === 'barrette'));
function infoBarrette(r) { return memo('bar|' + r.k, () => { if (r.aPoser) { const I = infoRepere(r); return { Q: I.Q, cables: I.cables }; }
  const P = planDuRepere(r.nom); return { Q: P.barrette ? P.barrette.plan : null, main: P.barrette ? P.barrette.main : '', cables: infoRepere(r).cables }; }); }
/* Le prochain repère libre d'une barrette à poser : la suite de la barrette du contrat la plus proche de l'équipement
   qu'elle dédouble (102CB1 → 667VT21 → 667VT22), sinon le numéro de cet équipement (102VT1). */
function prochainRepereVT(r) { const pris = new Set(reperesDe(verite())), sur = /^ajoutée par Volta sur (\S+?):/.exec(r.sous || ''), q0 = sur ? lireRepere(sur[1]) : null, n0 = q0 && q0.num ? +q0.num : 0;
  const vts = [...pris].filter(x => estBarrette(x) && !VT_A_POSER.test(x)).map(lireRepere).filter(q => q && q.num && /^\d+$/.test(q.suffixe));
  const num = vts.length ? vts.slice().sort((a, b) => Math.abs(+a.num - n0) - Math.abs(+b.num - n0))[0].num : q0 && q0.num ? q0.num : '1';
  let k = Math.max(0, ...vts.filter(q => q.num === num).map(q => +q.suffixe)) + 1; while (pris.has(num + 'VT' + k)) k++; return num + 'VT' + k; }
const COLONNES_BARRETTES = [COL_REPERE,
  { k: 'norme', t: 'Norme', cls: 'rc-c-norme', html: r => { const Q = infoBarrette(r).Q; if (!Q) return rien; const n = Q.famille ? nomDeFamille(app.norme, Q.famille) : '';
      return r.aPoser ? `<span class="rc-norme">${esc(n)}</span>` : valT('norme', n, { cls: 'rc-norme', ph: '—', titre: 'Double-clic pour en choisir une autre' }); },
    tri: r => (infoBarrette(r).Q || {}).famille || '', texte: r => { const Q = infoBarrette(r).Q; return Q && Q.famille ? nomDeFamille(app.norme, Q.famille) : ''; } },
  { k: 'module', t: 'Module', cls: 'rc-c-id', html: r => { const B = infoBarrette(r); if (!B.Q) return rien;
      return r.aPoser ? `<span class="rc-id">${esc(B.Q.reference || '')}</span>` : valT('module', B.Q.reference || '', { cls: 'rc-id', ph: 'aucun module', titre: (B.main ? 'Choisi à la main' : 'Choisi automatiquement : le plus petit module de la norme qui loge ces potentiels') + ' — double-clic pour en choisir un autre' }) + (B.main ? orig('main') + rond('module', 'le choix automatique') : ''); },
    tri: r => (infoBarrette(r).Q || {}).reference || '', texte: r => (infoBarrette(r).Q || {}).reference || '' },
  { k: 'libres', t: 'Contacts libres', cls: 'rc-c-n', html: r => { const Q = infoBarrette(r).Q; return Q && Q.modules.length ? `<span class="rc-frac"><b class="rc-n">${Q.contacts - Q.utilises}</b><i>/ ${Q.contacts}</i></span>` : rien; },
    tri: r => { const Q = infoBarrette(r).Q; return Q ? Q.contacts - Q.utilises : -1; }, texte: r => { const Q = infoBarrette(r).Q; return Q ? (Q.contacts - Q.utilises) + ' / ' + Q.contacts : ''; } },
  COL_PROBLEMES,
  { k: 'potentiels', t: 'Potentiels', cls: 'rc-c-n', option: true, html: r => { const Q = infoBarrette(r).Q; return Q ? `<b class="rc-n">${Q.potentiels}</b>` : rien; }, tri: r => (infoBarrette(r).Q || { potentiels: -1 }).potentiels, texte: r => String((infoBarrette(r).Q || {}).potentiels ?? '') },
  { k: 'cables', t: 'Câbles', cls: 'rc-c-n', option: true, html: r => `<b class="rc-n">${infoBarrette(r).cables}</b>`, tri: r => infoBarrette(r).cables, texte: r => String(infoBarrette(r).cables) },
  COL_FOLIO];
const BARRETTES = { ...ONGLET_REPERES, colonnes: COLONNES_BARRETTES, lignes: barrettes, cherche: 'Chercher : repère, module, norme…',
  puces: () => [PUCE_A_REPRENDRE, ['aposer', 'Repère provisoire', r => r.aPoser, '', '', 'Les barrettes que Volta a ajoutées (plusieurs câbles sur une borne), au repère provisoire']],
  editeur: (r, f) => { const B = infoBarrette(r);
    if (f === 'rep') return { valeur: r.aPoser ? prochainRepereVT(r) : r.nom, toujours: r.aPoser, aide: r.aPoser ? 'le vrai repère de la barrette (Ctrl+Z rend le repère provisoire)' : '' };
    if (r.aPoser || !B.Q) return null;
    if (f === 'module') { const b = planDuRepere(r.nom).barrette.besoins, vs = (B.Q.famille ? [B.Q.famille] : famillesDeModules(app.norme)).flatMap(fa => variantesQuiLogent(b, app.norme, fa).slice(0, 12));
      return { valeur: B.main ? B.Q.reference : '', options: [['', 'Automatique'], ...vs.map(m => [m.reference, m.variante + ' · ' + m.reference])] }; }
    if (f === 'norme') return { valeur: '', options: [['', 'Automatique'], ...famillesDeModules(app.norme).map(fa => [fa, nomDeFamille(app.norme, fa)])] };
    return null; },
  ecrire: (r, f, v) => { if (f === 'rep') return v && v !== r.nom ? renommerRepere(r.nom, v, r) : false;
    if (f === 'module' || f === 'norme') { histPush((f === 'module' ? 'module de ' : 'norme de ') + r.nom); designer(r.nom, v); apresEdition(); return true; } return false; },
  rendre: (r, f) => { if (f !== 'module') return false; histPush('choix automatique'); designer(r.nom, ''); apresEdition(); return true; } };

/* ---- PRISES : la norme, l'arrangement, les contacts pris ------------------------- */
const prises = () => memo('prises', () => reperes().filter(r => r.genre === 'coupure'));
function infoPrise(nom) { return memo('pr|' + nom, () => { const P = planDuRepere(nom).coupure; if (!P) return null; const Q = P.plan, M = Q.modules[0];
  const am = Q.fils.filter(x => x.f.amont).map(x => x.f), av = Q.fils.filter(x => !x.f.amont).map(x => x.f);
  const hab = (cote, fils) => fils.length ? memo('habp|' + nom + '|' + cote, () => habillage(app.norme, fils, app.contrat.raccords.get(nom + '|' + cote), P.besoins.pn, Q.reference)) : null;
  return { P, Q, M, pris: P.points.length, total: M ? M.module.contacts.length : null, fiche: hab('fiche', am), embase: hab('embase', av) }; }); }
const motRaccord = h => !h ? '' : h.raccord === 'aucun' ? 'sans raccord' : (h.designation || h.raccord);
const COLONNES_PRISES = [COL_REPERE,
  { k: 'norme', t: 'Norme', cls: 'rc-c-norme', html: r => { const I = infoPrise(r.nom); return I ? valT('norme', I.Q.famille ? nomDeFamille(app.norme, I.Q.famille) : '', { cls: 'rc-norme', ph: '—', titre: 'Double-clic pour en choisir une autre' }) : rien; },
    tri: r => (infoPrise(r.nom) || { Q: {} }).Q.famille || '', texte: r => { const I = infoPrise(r.nom); return I && I.Q.famille ? nomDeFamille(app.norme, I.Q.famille) : ''; } },
  { k: 'arrangement', t: 'Arrangement', cls: 'rc-c-id', html: r => { const I = infoPrise(r.nom); return I ? valT('arrangement', I.Q.reference, { cls: 'rc-id', ph: 'aucun arrangement', titre: (I.Q.main ? 'Choisi à la main' : 'Choisi automatiquement : le plus petit de la norme qui loge ces contacts') + ' — double-clic pour en choisir un autre' }) + (I.Q.main ? orig('main') + rond('arrangement', 'le choix automatique') : '') : rien; },
    tri: r => (infoPrise(r.nom) || { Q: {} }).Q.reference || '', texte: r => (infoPrise(r.nom) || { Q: {} }).Q.reference || '' },
  { k: 'contacts', t: 'Contacts', cls: 'rc-c-n', html: r => { const I = infoPrise(r.nom); return I ? `<span class="rc-frac"><b class="rc-n">${I.pris}</b><i>/ ${I.total == null ? '?' : I.total}</i></span>` : rien; }, tri: r => (infoPrise(r.nom) || { pris: -1 }).pris, texte: r => { const I = infoPrise(r.nom); return I ? I.pris + ' / ' + (I.total ?? '?') : ''; } },
  COL_PROBLEMES,
  // (v74, l'ingénieur v73 : « le part number complet de la prise, le récapitulatif ne l'a pas ») : au choix, et il s'écrit
  { k: 'pn', t: 'Part number', option: true, html: r => valT('pn:', baseRepere(r.nom).b.pn || '', { cls: 'rc-pn', ph: 'part number', titre: 'Double-clic : toutes ses liaisons le prennent' }), tri: r => baseRepere(r.nom).b.pn || '', texte: r => baseRepere(r.nom).b.pn || '' },
  { k: 'sexe', t: 'Sexe fiche · embase', option: true, html: r => { const I = infoPrise(r.nom); if (!I) return rien; const s = I.Q.sexe || sexeChoisi(r.nom); return I.Q.tableContacts ? valT('sexe', s === 'M' ? 'mâle · femelle' : s === 'F' ? 'femelle · mâle' : '', { ph: 'à choisir' }) : rien; },
    tri: r => (infoPrise(r.nom) || { Q: {} }).Q.sexe || '', texte: r => (infoPrise(r.nom) || { Q: {} }).Q.sexe || '' },
  { k: 'fiche', t: 'Raccord fiche', option: true, html: r => { const I = infoPrise(r.nom); return I && I.fiche ? `<span class="rc-id">${esc(motRaccord(I.fiche))}</span>` : rien; }, tri: r => motRaccord((infoPrise(r.nom) || {}).fiche), texte: r => motRaccord((infoPrise(r.nom) || {}).fiche) },
  { k: 'embase', t: 'Raccord embase', option: true, html: r => { const I = infoPrise(r.nom); return I && I.embase ? `<span class="rc-id">${esc(motRaccord(I.embase))}</span>` : rien; }, tri: r => motRaccord((infoPrise(r.nom) || {}).embase), texte: r => motRaccord((infoPrise(r.nom) || {}).embase) },
  COL_FOLIO];
const PRISES = { ...ONGLET_REPERES, colonnes: COLONNES_PRISES, lignes: prises, cherche: 'Chercher : repère, arrangement, norme…',
  choisir: r => choisirRepere(r.nom),
  puces: () => [PUCE_A_REPRENDRE],
  editeur: (r, f) => { const I = infoPrise(r.nom); if (f === 'rep') return { valeur: r.nom }; if (f === 'pn:') return { valeur: baseRepere(r.nom).b.pn || '', liste: 'pns', aide: 'toutes ses liaisons suivent' }; if (!I) return null;
    if (f === 'arrangement') return { valeur: I.Q.main ? I.Q.reference : '', options: [['', 'Automatique'], ...arrangementsQuiLogent(I.P.points, app.norme, I.Q.visee || I.Q.famille).slice(0, 12).map(m => [m.reference, m.variante + ' · ' + m.reference])] };
    if (f === 'norme') return { valeur: '', options: [['', 'Automatique'], ...famillesDeModules(app.norme, 'connecteur').map(fa => [fa, nomDeFamille(app.norme, fa)])] };
    if (f === 'sexe') return I.Q.tableContacts ? { valeur: sexeChoisi(r.nom), options: [['', 'Automatique'], ['F', 'Fiche femelle · embase mâle'], ['M', 'Fiche mâle · embase femelle']] } : null;
    return null; },
  ecrire: (r, f, v) => { if (f === 'rep') return v && v !== r.nom ? renommerRepere(r.nom, v, r) : false;
    if (f === 'pn:') return changerPartNumber(r.nom, null, v);
    if (f === 'arrangement' || f === 'norme') { histPush((f === 'norme' ? 'norme de ' : 'arrangement de ') + r.nom); designer(r.nom, v); apresEdition(); return true; }
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
const motCable = c => !c.type ? 'sans type' : etatCable(c) ? 'inconnu' : 'ok';
const COLONNES_CABLES = [
  { k: 'type', t: 'Type', cls: 'rc-c-id', html: c => valT('type', c.type, { cls: 'rc-type', ph: 'sans type', titre: 'Double-clic : tous les câbles de ce type prennent le nouveau' }), tri: c => c.type, texte: c => c.type || 'sans type' },
  { k: 'jauge', t: 'Gauge', option: true, html: c => pastilleJauge(c.jauge), tri: c => c.jauge ?? 99, texte: c => c.jauge != null ? c.jauge + ' AWG' : '' },
  { k: 'n', t: 'Nombre', cls: 'rc-c-n', html: c => `<b class="rc-n">${c.n}</b>`, tri: c => c.n, texte: c => String(c.n) },
  { k: 'longueur', t: 'Longueur totale', cls: 'rc-c-mesure', w: 100, html: c => `<span class="rc-mesure">${chiffre(`<b class="rc-n">${fmt(c.L, 1)}</b>`, 'm')}${c.reelles < c.n && !RECAP.notes.longueur ? orig('hyp', pluriel(c.n - c.reelles, 'câble') + ' sans longueur dans l’installation : la longueur supposée par la simulation', 'en partie supposée') : ''}</span>`, tri: c => c.L, texte: c => fmt(c.L, 1) + ' m',
    note: L => L.every(c => c.reelles < c.n) ? ['en partie supposée', 'Des câbles de chaque type n’ont pas de longueur dans l’installation : la longueur supposée par la simulation compte pour eux (menu ⋮ → Hypothèses)'] : null },
  { k: 'masse', t: 'Masse', cls: 'rc-c-mesure', html: c => c.masse != null ? `<span class="rc-mesure">${chiffre(`<b class="rc-n">${fmt(c.masse, 0)}</b>`, 'g')}</span>` : rien, tri: c => c.masse ?? -1, texte: c => c.masse != null ? fmt(c.masse, 0) + ' g' : '' },
  { k: 'etat', t: 'État', cls: 'rc-c-etat', html: c => etatHtml(etatCable(c) || 'ok', motCable(c), !c.type ? 'Des câbles sans type : leur gauge ne se vérifie pas' : etatCable(c) ? 'Inconnu de la base des câbles et de la norme des câbles' : c.cab ? 'Dans la base des câbles' : 'La gauge seule, par l’EN 2853'), tri: c => etatCable(c) ? 0 : 1, texte: motCable },
  { k: 'nature', t: 'Composition', option: true, html: c => c.cab ? `<span class="rc-mot">${esc([(c.cab.brins > 1 ? c.cab.brins + ' brins' : '1 brin') + (c.cab.blindage ? ' + blindage' : ''), c.cab.nature, c.fam && c.fam.conducteur && c.fam.conducteur !== 'cuivre' ? c.fam.conducteur : ''].filter(Boolean).join(' · '))}</span>` : rien,
    tri: c => c.cab ? c.cab.brins || 0 : -1, texte: c => c.cab ? [c.cab.brins + ' brins', c.cab.blindage ? 'blindage' : '', c.cab.nature].filter(Boolean).join(' ') : '' },
  { k: 'diametre', t: 'Ø', cls: 'rc-c-mesure', option: true, html: c => c.cab && c.cab.diametre != null ? chiffre(`<b class="rc-n">${fmt(c.cab.diametre, 2)}</b>`, 'mm') : rien, tri: c => c.cab && c.cab.diametre != null ? c.cab.diametre : -1, texte: c => c.cab && c.cab.diametre != null ? fmt(c.cab.diametre, 2) + ' mm' : '' },
  { k: 'resistance', t: 'mΩ/m', cls: 'rc-c-n', option: true, html: c => { const R = c.cab && c.cab.resistance != null ? c.cab.resistance : c.fn && c.fn.resistance != null ? c.fn.resistance : null; return R != null ? `<b class="rc-n">${fmt(R, 2)}</b>` : rien; },
    tri: c => (c.cab && c.cab.resistance) ?? (c.fn && c.fn.resistance) ?? -1, texte: c => String((c.cab && c.cab.resistance) ?? (c.fn && c.fn.resistance) ?? '') },
  { k: 'gm', t: 'g/m', cls: 'rc-c-n', option: true, html: c => c.cab && c.cab.masse != null ? `<b class="rc-n">${fmt(c.cab.masse, 2)}</b>` : rien, tri: c => c.cab && c.cab.masse != null ? c.cab.masse : -1, texte: c => c.cab && c.cab.masse != null ? fmt(c.cab.masse, 2) : '' },
  { k: 'source', t: 'Source', option: true, html: c => `<span class="rc-mot">${c.cab ? 'base des câbles' : c.fn ? 'EN 2853 (la gauge seule)' : c.type ? 'inconnu' : '—'}</span>`, tri: c => c.cab ? 0 : c.fn ? 1 : 2, texte: c => c.cab ? 'base des câbles' : c.fn ? 'EN 2853' : 'inconnu' },
  { k: 'aller', t: '', cls: 'rc-c-aller', html: () => '<button type="button" class="rc-lien" data-voir-fils="1">Voir les câbles</button>', texte: () => '' }];
const CABLES = { colonnes: COLONNES_CABLES, lignes: cables, etat: etatCable, choisie: () => false, cherche: 'Chercher : type de câble…',
  puces: () => [['inconnus', 'Inconnus de la base', c => !!etatCable(c), '', '', 'Les types que la base des câbles ne connaît pas']],
  voirFils: c => montrerLiaisons(c.type),
  editeur: (c, f) => f === 'type' ? { valeur: c.type, liste: 'types', aide: 'tous les câbles de ce type le prennent' } : null,
  ecrire: (c, f, v) => { if (f !== 'type' || v === c.type) return false; const xs = verite().filter(l => liaisonComplete(l) && l.de !== l.vers && (l.type || '') === c.type).map(l => [l, 'type']);
    return changerLiaisons(xs.map(([l, k]) => [l, k, v]), 'type ' + (c.type || 'vide') + ' → ' + (v || 'vide')); } };
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
const COLONNES_RACCORDS = [
  { k: 'conn', t: 'Connecteur', cls: 'rc-c-rep', html: x => `<span class="rc-r">${esc(x.nom)}</span><i class="rc-pt">·</i><span class="rc-cn">${esc(x.c)}</span>`, tri: x => x.nom + '\u0001' + x.c, texte: x => x.nom + ' ' + x.c },
  { k: 'raccord', t: 'Raccord', html: x => { const h = habDe(x); if (!h) return rien; const pq = h.pourquoi ? ` data-bulle="${escA(majuscule(h.pourquoi))}"` : '';
      return h.sansRaccord ? `<span class="rc-mot"${pq}>sans raccord</span>`
        : `<span class="${h.designation ? 'rc-id' : 'rc-mot'}"${pq}>${esc(h.designation || h.raccord)}</span>${h.statut && h.statut !== 'vérifié' ? `<i class="rc-o" data-bulle="${escA(SENS_STATUT_RACCORD[h.statut] || '')}">${esc(h.statut)}</i>` : ''}`; },
    tri: x => motRaccord(habDe(x)), texte: x => motRaccord(habDe(x)) },
  { k: 'bandit', t: 'Band-it', html: x => { const h = habDe(x); return h && h.bandit ? (h.collier ? `<span class="rc-id">${esc(h.collier.reference)}</span>` : etatHtml('att', 'aucun ne va')) : rien; }, tri: x => { const h = habDe(x); return h && h.collier ? h.collier.reference : ''; }, texte: x => { const h = habDe(x); return h && h.collier ? h.collier.reference : ''; } },
  // (v74) ce qu'on a choisi à l'encre, ce qui reste par défaut à l'encre seconde : l'œil va aux choix, pas aux quatre mots
  // que chaque ligne répète
  { k: 'choix', t: 'Choix', html: x => { const c = (habDe(x) || { choix: {} }).choix, o = app.contrat.raccords.get(x.k) || {};
      return `<span class="rc-choix">${['orientation', 'blindage', 'etanche', 'gaine'].map(k => valT(k, motChoix(k, c[k]), { cls: k in o ? '' : 'rc-defaut', titre: (k in o ? 'Choisi ici' : 'Par défaut') + ' — double-clic pour changer : la fiche et la nomenclature suivent' })).join('<i class="rc-pt">·</i>')}</span>`; },
    tri: x => { const c = (habDe(x) || { choix: {} }).choix; return [c.orientation, c.blindage, c.etanche, c.gaine].join(' '); }, texte: x => { const c = (habDe(x) || { choix: {} }).choix; return ['orientation', 'blindage', 'etanche', 'gaine'].map(k => motChoix(k, c[k])).join(' · '); } },
  { k: 'etat', t: 'État', cls: 'rc-c-etat', html: x => { const h = habDe(x); return h ? etatHtml(h.manquants.length ? 'att' : 'ok', h.manquants.length ? 'à compléter' : 'ok', h.manquants.map(majuscule).join('\n')) : rien; },
    tri: x => { const h = habDe(x); return h && h.manquants.length ? 0 : 1; }, texte: x => { const h = habDe(x); return h && h.manquants.length ? 'à compléter' : 'ok'; } },
  { k: 'pn', t: 'Part number', option: true, html: x => x.pn ? `<span class="rc-pn">${esc(x.pn)}</span>` : rien, tri: x => x.pn || '', texte: x => x.pn || '' },
  { k: 'taille', t: 'Taille · filetage', option: true, html: x => { const h = habDe(x); return h && h.taille ? `<span class="rc-mot"><b>${esc(h.taille)}</b>${h.filetage ? ' · ' + esc(h.filetage.filetage) : ''}</span>` : rien; }, tri: x => (habDe(x) || {}).taille || '', texte: x => { const h = habDe(x); return h && h.taille ? h.taille + (h.filetage ? ' ' + h.filetage.filetage : '') : ''; } },
  { k: 'manchon', t: 'Manchon', option: true, html: x => { const h = habDe(x); return h && h.manchon ? (h.manchonRef ? `<span class="rc-id">${esc(h.manchonRef.designation)}</span>` : etatHtml('att', 'aucun ne va')) : rien; }, tri: x => { const h = habDe(x); return h && h.manchonRef ? h.manchonRef.designation : ''; }, texte: x => { const h = habDe(x); return h && h.manchonRef ? h.manchonRef.designation : ''; } },
  { k: 'gaine', t: 'Gaine', option: true, html: x => { const h = habDe(x); return h && h.choix.gaine ? (h.gaine ? `<span class="rc-id">${esc(h.gaine.reference)}</span>` : etatHtml('att', 'aucune ne va')) : rien; }, tri: x => { const h = habDe(x); return h && h.gaine ? h.gaine.reference : ''; }, texte: x => { const h = habDe(x); return h && h.gaine ? h.gaine.reference : ''; } },
  { k: 'toron', t: 'Toron Ø', cls: 'rc-c-mesure', option: true, html: x => { const h = habDe(x); return h && h.faisceau.diametre != null ? `<span class="rc-mesure">${chiffre(`<b class="rc-n">${fmt(h.faisceau.diametre, 1)}</b>`, 'mm')}${h.faisceau.complet ? '' : '<i class="rc-o" data-bulle="Un type de câble inconnu de la base : le toron est sous-estimé">?</i>'}</span>` : rien; },
    tri: x => { const h = habDe(x); return h && h.faisceau.diametre != null ? h.faisceau.diametre : -1; }, texte: x => { const h = habDe(x); return h && h.faisceau.diametre != null ? fmt(h.faisceau.diametre, 1) + ' mm' : ''; } },
  { k: 'folio', t: 'Folio', cls: 'rc-c-folio', option: true, html: x => x.plans.length ? `<span class="rc-folios">${esc(listeFolios(x.plans))}</span>` : rien, tri: x => x.plans[0] || '', texte: x => x.plans.join(' ') }];
const RACCORDS = { colonnes: COLONNES_RACCORDS, portee: true, lignes: raccords, surFolio: x => app.plan === '*' || x.plans.includes(app.plan), exact: (x, f) => x.nom === f, cherche: 'Chercher : repère, raccord, band-it…',
  choisie: x => !!app.cible && app.cible.type === 'bloc' && app.cible.nom === x.nom, etat: x => { const h = habDe(x); return h && h.manquants.length ? 'att' : ''; },
  puces: () => [['completer', 'À compléter', x => { const h = habDe(x); return !!(h && h.manquants.length); }, '', '', 'Ce que la norme ne dit pas encore (une référence, une cote)']],
  choisir: x => choisirRepere(x.nom), survol: x => survolRepere(x.nom),
  editeur: (x, f) => CHOIX[f] ? { valeur: String((habDe(x) || { choix: {} }).choix[f] ?? ''), options: CHOIX[f] } : null,
  ecrire: (x, f, v) => { if (!CHOIX[f]) return false; const o = { ...(app.contrat.raccords.get(x.k) || {}) }, w = v === 'true' ? true : v === 'false' ? false : v; if (String((habDe(x) || { choix: {} }).choix[f]) === String(w)) return false;
    histPush('raccord de ' + x.k); o[f] = w; app.contrat.raccords.set(x.k, o); apresEdition(); return true; } };

/* ---- PROBLÈMES (un verdict du contrôle par ligne) ----------------------------- */
/* Ce qu'il faut faire, et où la fiche le montre : lu dans la phrase du verdict (le contrôle ne le dit pas encore). Les
   phrases du contrôle disent « câble » et « gauge » (elles disaient « fil » et « jauge ») : on lit les deux. */
function remede(x) { const t = x.texte, ideal = /l’idéal est un ([\d,.]+ A)/.exec(t) || /un ([\d,.]+ A) suffirait/.exec(t);
  if (/^ajoutée par Volta sur/.test(t)) return ['Donner son vrai repère à la barrette que Volta a ajoutée (onglet Barrettes)', 'connecteur'];
  if (/profil de charge est à renseigner/.test(t)) return ['Renseigner le profil de charge du disjoncteur : l’outil trouve le calibre', 'profil'];
  if (/déclenche|aucun calibre/.test(t)) return [ideal ? 'Retenir ' + ideal[1] + ' (sa fiche, ou la case Calibre de l’onglet Disjoncteurs)' : 'Alléger le profil ou changer de famille de disjoncteur', 'calibre'];
  if (/suffirait|touche la courbe|l’idéal est|\bjuste\b/.test(t)) return [ideal ? 'Retenir ' + ideal[1] : 'Retenir le calibre que Volta propose', 'calibre'];
  if (/sélectivité/.test(t)) return ['L’amont au moins au double de l’aval : changer l’un des deux calibres', 'calibre'];
  if (/chute en ligne/.test(t)) return [/hypothèse/.test(t) ? 'Écrire les longueurs mesurées (onglet Liaisons, puce « Sans longueur »)' : 'Une gauge plus forte, ou un chemin plus court', 'chute'];
  if (/maximum de l’AC|table 11-3/.test(t)) return ['Un calibre plus petit, ou un câble plus gros (la table 11-3 de l’AC 43.13-1B)', 'fils'];
  // (plus « ou un calibre plus petit » : sous un profil qui déclenche déjà le calibre, c'est faux — l'ingénieur v73)
  if (/admis|pas protégé/.test(t)) return ['Un câble plus gros : sa fiche propose le plus fin qui tient', 'fils'];
  if (/contact taille|dépasse le contact/.test(t)) return ['Un contact plus gros, ou un courant moindre', 'contacts'];
  if (/refusé|aucun contact|jauge|gauge/.test(t)) return ['Changer le type du câble, ou l’arrangement du connecteur (sa fiche, « Changer »)', 'contacts'];
  if (/aucun arrangement|aucun module|ne loge/.test(t)) return ['Choisir un autre arrangement ou une autre norme (sa fiche, « Changer »)', 'connecteur'];
  if (/famille de disjoncteur inconnue/.test(t)) return ['Ajouter la famille du part number (Normes › Familles de disjoncteurs)', 'disjoncteur'];
  if (/types? de (fil|câble)s? inconnus?/.test(t)) return ['Corriger le type, ou ajouter le câble à la base (Normes › Câbles)', ''];
  if (/sans type/.test(t)) return ['Écrire le type de chaque câble (onglet Liaisons)', ''];
  if (/incomplète/.test(t)) return ['Écrire « de » et « vers » (onglet Liaisons)', ''];
  if (/ambiante/.test(t)) return ['Un câble de plus haute température, ou revoir l’ambiante (menu ⋮ → Hypothèses)', ''];
  if (/CCA/.test(t)) return ['Qualifier le contact pour l’aluminium cuivré, ou un câble cuivre', 'contacts'];
  return ['Ouvrir la fiche', 'problemes']; }
// les gestes d'un point du contrôle (08-controle), une fois par état du contrat
const gestesDuPb = p => memo('gestes|' + RECAP.itemsN + '|' + p.k, () => { try { return typeof gestesDuPoint === 'function' ? gestesDuPoint(p.x) : []; } catch (_) { return []; } });
const problemes = () => memo('problemes:' + RECAP.itemsN, () => (CONTROLE.items || []).map((x, k) => { const [que, sec] = remede(x); return { k: 'p' + k, x, idx: k, que, sec, plans: x.plan && x.plan !== '*' ? [x.plan] : [] }; }));
/* (v74) RANGÉ PAR GENRE, l'intercalaire dit déjà le niveau (son compte, à sa couleur) : chaque ligne n'en garde que le point —
   le mot reste pour le lecteur d'écran et le CSV ; et un geste qui se répète d'une ligne à la suivante (« Tout régler :
   102CB1 en 15 A… » cinq fois de suite) s'écrit UNE fois, puis « ″ » dessous, sa bulle le redit (le patron des Normes). */
const pointSeul = (n, mot) => `<span class="rc-etat ${n} seul"><i aria-hidden="true"></i><span class="sr">${esc(mot)}</span></span>`;
const signatureGestes = p => gestesDuPb(p).map(g => g.mot).join('\u0001');
const COLONNES_PROBLEMES = [
  { k: 'niveau', t: 'Niveau', cls: 'rc-c-etat', html: p => { const n = p.x.niveau === 'ko' ? 'ko' : 'att'; return RECAP.parGenre ? pointSeul(n, MOTS_ETAT[n]) : etatHtml(n); }, tri: p => p.x.niveau === 'ko' ? 0 : 1, texte: p => p.x.niveau === 'ko' ? 'problème' : 'à voir' },
  { k: 'objet', t: 'Objet', cls: 'rc-c-rep', html: p => p.x.nom ? `<span class="rc-r">${esc(p.x.nom)}</span>` : '<span class="rc-mot">le contrat</span>', tri: p => p.x.nom || '', texte: p => p.x.nom || 'contrat' },
  { k: 'texte', t: 'Ce qui ne va pas', cls: 'rc-c-phrase', html: p => `<span class="rc-phrase">${insecable(esc(majuscule(p.x.texte)))}</span>`, tri: p => p.x.texte, texte: p => p.x.texte },
  /* CE QU'IL FAUT FAIRE : le GESTE de la fiche, en bouton (v73, l'ingénieur n° 8 ; le domaine C, `gestesDuPoint`) — « Tout
     régler : 102CB1 en 15 A et 3 câbles en DR12 », « Unifier sur MS3320-15 », « La poser » — le premier au trait, les autres
     en lien ; quand le seul geste est d'aller voir, la phrase dit d'abord quoi y faire. */
  { k: 'que', t: 'Ce qu’il faut faire', cls: 'rc-c-phrase rc-c-que', html: p => { const G = gestesDuPb(p), repare = G.some(g => !/^Voir /.test(g.mot));
      if (RECAP.pareils.has(p.k)) return `<span class="rc-pareil" data-bulle="${escA('Le même geste qu’à la ligne du dessus : ' + G.map(g => g.mot).join(' · '))}">″</span>`;
      return `<span class="rc-que">${repare ? '' : `<span class="rc-phrase">${esc(p.que)}</span>`}${G.length ? `<span class="rc-gestes">${G.map((g, i) => `<button type="button" class="btn ${g.principal ? 'papier' : 'lien'} dense" data-geste-pb="${i}" data-bulle="${escA(g.aide || '')}">${esc(g.mot)}</button>`).join('')}</span>` : ''}</span>`; },
    tri: p => p.que, texte: p => { const G = gestesDuPb(p); return G.some(g => !/^Voir /.test(g.mot)) ? G.map(g => g.mot).join(' · ') : p.que; } },
  { k: 'folio', t: 'Folio', cls: 'rc-c-folio', option: true, html: p => p.plans.length ? `<span class="rc-folios">f.${INSECABLE}${esc(p.plans[0])}</span>` : rien, tri: p => p.plans[0] || '', texte: p => p.plans.join(' ') },
  { k: 'section', t: 'Dans la fiche', option: true, html: p => p.sec && p.x.nom && SECTIONS[p.sec] ? `<span class="rc-mot">${esc(SECTIONS[p.sec])}</span>` : rien, tri: p => p.sec, texte: p => SECTIONS[p.sec] || '' }];
const PROBLEMES = { colonnes: COLONNES_PROBLEMES, portee: true, lignes: problemes, surFolio: p => app.plan === '*' || !p.plans.length || p.plans.includes(app.plan), exact: (p, f) => p.x.nom === f, cherche: 'Chercher : repère, câble, mot…',
  choisie: p => !!app.cible && app.cible.type === 'bloc' && app.cible.nom === p.x.nom, etat: p => p.x.niveau,
  puces: () => [['niveau:ko', 'Problèmes', p => p.x.niveau === 'ko', '', 'niveau'], ['niveau:att', 'À voir', p => p.x.niveau !== 'ko', '', 'niveau']],
  choisir: p => { if (p.x.nom) choisirRepere(p.x.nom, p.x.plan); }, survol: p => { if (p.x.nom) survolRepere(p.x.nom); },
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
const phrase = t => { const x = String(t || '').split(/\. (?=[A-ZÀ-Ý])/)[0].replace(/\.$/, ''); return x.length > 170 ? x.slice(0, 168).replace(/\s+\S*$/, '') + '…' : x; };
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
  { k: 'origine', t: 'Origine', html: x => x.modifiee ? `<span class="rc-mot">modifiée</span>${orig('main', 'Une table changée dans ce navigateur (Normes)')}` : '<span class="rc-mot doux">embarquée</span>', tri: x => x.modifiee ? 0 : 1, texte: x => x.modifiee ? 'modifiée' : 'embarquée' },
  { k: 'aller', t: '', cls: 'rc-c-aller', html: () => '<button type="button" class="rc-lien" data-aller="1">Ouvrir la table</button>', texte: () => '' },
  { k: 'juge', t: 'À quoi elle sert', cls: 'rc-c-phrase', option: true, html: x => `<span class="rc-phrase">${esc(x.juge)}</span>`, tri: x => x.juge, texte: x => x.juge },
  { k: 'lignes', t: 'Lignes', cls: 'rc-c-n', option: true, html: x => `<b class="rc-n">${x.lignes}</b>`, tri: x => x.lignes, texte: x => String(x.lignes) }];
const NORMES_ONGLET = { colonnes: COLONNES_NORMES, lignes: () => normes().filter(x => x.n || x.modifiee), etat: () => '', choisie: () => false, cherche: 'Chercher : norme, table…',
  puces: () => [['modifiees', 'Modifiées', x => x.modifiee]], aller: x => ficheNormes({ table: x.v }) };

const TABS = { liaisons: LIAISONS, equipements: EQUIPEMENTS, disjoncteurs: DISJONCTEURS, barrettes: BARRETTES, prises: PRISES, cables: CABLES, raccords: RACCORDS, problemes: PROBLEMES, normes: NORMES_ONGLET };
const onglet = () => TABS[app.base.onglet] || LIAISONS;

/* ---- les lignes d'un onglet : la portée, la recherche, les puces, le tri ------ */
const portee = O => !!O.portee && avecPortee();
const colonnesVues = O => { const choix = app.base.colonnes[app.base.onglet] || {};
  return O.colonnes.filter(c => (!c.si || c.si()) && (c.k in choix ? choix[c.k] : !c.option)); };
// une puce : [clé, mot, test, ce qui la précède (le trait d'une route), son groupe (l'un OU l'autre), sa bulle, lourde (elle lit
// les plans), sa rubrique dans « Filtrer »]
const pucesDe = O => (O.puces ? O.puces() : []).map(([k, t, test, avant, groupe, aide, lourd, rubrique]) => ({ k, t, test, avant: avant || '', groupe: groupe || k, aide: aide || '', lourd: !!lourd, rubrique: rubrique || (groupe === 'route' ? 'Route' : 'Les autres') }));
function pucesActives(O) { const P = pucesDe(O), on = new Set(app.base.puces[app.base.onglet] || []); return P.filter(p => on.has(p.k)); }
function lignesDe(O, sansPuces, sansPortee) { const b = app.base, f = b.filtre.trim().toLowerCase();
  let L = O.lignes();
  if (!sansPortee && portee(O) && b.portee === 'folio' && O.surFolio) L = L.filter(O.surFolio);
  // un bloc choisi sur le plan filtre sur lui-même, là où il veut dire quelque chose (pas les câbles, ni les normes)
  if (f && b.filtreAuto) { if (O.exact) L = L.filter(r => O.exact(r, b.filtre.trim())); }
  else if (f) L = L.filter(r => O.colonnes.some(c => c.texte && String(c.texte(r)).toLowerCase().includes(f)));
  if (!sansPuces) { const A = pucesActives(O), G = new Map(); A.forEach(p => (G.get(p.groupe) || G.set(p.groupe, []).get(p.groupe)).push(p)); G.forEach(ps => { L = L.filter(r => ps.some(p => p.test(r))); }); }
  const tri = b.tri, c = tri && O.colonnes.find(x => x.k === tri.k && x.tri);
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
    case 'liaisons': { const V = verite(), C = itemsParCable(); return { n: String(V.length), etat: V.some(l => (C.get(l.cable) || []).some(x => x.niveau === 'ko')) ? 'ko' : items.some(x => x.tableau != null) || V.some(l => C.has(l.cable)) ? 'att' : '' }; }
    case 'equipements': { const R = equipements(); return { n: String(R.length), etat: etatNoms(R) }; }
    case 'disjoncteurs': { const R = disjoncteurs(); return { n: String(R.length), etat: etatNoms(R) }; }
    case 'barrettes': { const R = barrettes(), a = R.filter(r => r.aPoser).length; return { n: String(R.length), etat: etatNoms(R), titre: a ? pluriel(R.length - a, 'barrette') + ' du contrat, ' + a + ' ajoutée' + (a > 1 ? 's' : '') + ' par Volta' : '' }; }
    case 'prises': { const R = prises(); return { n: String(R.length), etat: etatNoms(R) }; }
    case 'cables': { const C = cables(); return { n: String(C.length), etat: C.some(etatCable) ? 'att' : '' }; }
    case 'raccords': return { n: String(raccords().length), etat: '' };
    // le compte des problèmes : la source unique (08-controle, `compteProblemes`) — les rouges · ce qui est à voir
    case 'problemes': { const C = typeof compteProblemes === 'function' ? compteProblemes() : { ko: items.filter(x => x.niveau === 'ko').length, att: items.filter(x => x.niveau !== 'ko').length }, ko = C.ko, att = C.att;
      return { n: String(ko + att), ko, att, etat: ko ? 'ko' : att ? 'att' : '', titre: C.mot || pluriel(ko, 'problème') + ' · ' + att + ' à voir' }; }
    case 'normes': return { n: String(NORMES_ONGLET.lignes().length), etat: '' };
  } } catch (_) { } return { n: '', etat: '' }; }

/* ---- LE RENDU ------------------------------------------------------------- */
/* Tout le récapitulatif se déduit de `app` ; il n'est pas refait tant qu'on écrit dans une case (`enSaisie`) ni quand rien
   de ce qu'il montre n'a changé — alors seule la ligne choisie se marque. `force` : le refaire quand même. */
function rendreBase(force) { const b = app.base; b.sale = false; if ($('base').hidden) { b.sale = true; return; }
  if (b.edition && !force) { b.sale = true; return; }
  assurerModele(); const O = onglet(), C = colonnesVues(O);
  const cle = [RECAP.cle, RECAP.itemsN, b.onglet, b.portee, b.filtre, b.filtreAuto, JSON.stringify(b.tri), JSON.stringify(b.puces[b.onglet] || []), C.map(c => c.k).join(','), b.toutes, b.neuves.length, b.neufs.join(','), b.nouveau].join('\u0002');
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
  if (n) cx.dataset.bulle = [plurielLie(verite().length, 'liaison'), plurielLie(reperes().length, 'repère'), P.length > 1 ? plurielLie(P.length, 'folio') : ''].filter(Boolean).join(' · '); else delete cx.dataset.bulle;
  $('ba-taille').querySelectorAll('[data-taille]').forEach(x => x.setAttribute('aria-pressed', String(b.ouvert && x.dataset.taille === b.taille)));
  $('ba-ajouter').hidden = !O.ajout; if (O.ajout) { $('ba-ajouter-t').textContent = O.ajout; $('ba-ajouter').dataset.bulle = O.aide || ''; }
  rendreExport(O); }
/* Un onglet du rail : son mot, son compte (à droite, aligné sur les autres), le point rouge d'un problème — l'ambre « à
   voir » se lit dans l'onglet Problèmes, pas en semis de points sur le rail (v74 : « rien qui clignote », l'œil va au rouge).
   Les trois groupes portent leur titre ; au clavier, ↑ ↓ (← → dans la bande étroite) passent d'un onglet à l'autre. */
function rendreOnglets() { const b = app.base, mots = new Map(ONGLETS);
  const ongletHtml = k => { const c = compteOnglet(k), on = k === b.onglet, ko = c.etat === 'ko';
    // les problèmes : deux pastilles, le rouge (à reprendre) et l'ambre (à voir) ; les autres : un nombre
    const compte = k === 'problemes' && c.ko != null ? (c.ko || c.att ? `<span class="rc-ns">${c.ko ? `<b class="rc-n ko" aria-label="${escA(pluriel(c.ko, 'problème'))}">${c.ko}</b>` : ''}${c.att ? `<b class="rc-n att" aria-label="${escA(c.att + ' à voir')}">${c.att}</b>` : ''}</span>` : '<small>0</small>') : c.n ? `<small>${esc(c.n)}</small>` : '';
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
    $('ba-portee').querySelectorAll('[data-portee]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.portee === b.portee))); }
  const fi = $('ba-filtre'); if (fi.value !== b.filtre && document.activeElement !== fi) fi.value = b.filtre; $('ba-vider').hidden = !b.filtre; fi.placeholder = O.cherche || 'Chercher dans l’onglet';
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
/* Ce que l'onglet montre : en tête ce qu'on vient d'ajouter (une liaison, un équipement) et la ligne d'un équipement à
   nommer ; puis les lignes de la portée, de la recherche et des puces, triées. */
function lignesMontrees(O) { const b = app.base, tous = O.lignes(), tete = [];
  if (b.onglet === 'liaisons') { b.neuves = b.neuves.filter(l => verite().includes(l)); b.neuves.forEach(l => { const r = tous.find(x => x.l === l); if (r) tete.push(r); }); }
  if (b.onglet === 'equipements') { b.neufs.forEach(nm => { const r = tous.find(x => x.nom === nm); if (r) tete.push(r); }); if (b.nouveau) tete.unshift({ k: '+', nom: '', genre: 'eqpt', plans: [], sous: '', nouveau: true }); }
  const cles = new Set(tete.map(r => r.k)); return { tete, tous, L: lignesDe(O).filter(r => !cles.has(r.k)) }; }
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
function rendreTable(O, C) { const b = app.base, tri = b.tri, n = C.length + 1, jeton = ++RECAP.jeton; if (GAMME.el) fermerGamme();
  $('ba-tab').dataset.onglet = b.onglet;
  const { tete, L, tous } = lignesMontrees(O), parFolio = groupesParFolio(), parGenre = groupesParGenre();
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
  else if (parGenre) { const rang = new Map(); genresDuControle().forEach((g, i) => g.lignes.forEach(l => l.xs.forEach(x => rang.set(x, i))));
    const G = genresDuControle(), par = new Map(); L.forEach(r => { const i = rang.has(r.x) ? rang.get(r.x) : G.length; (par.get(i) || par.set(i, []).get(i)).push(r); });
    [...par.keys()].sort((a, c) => a - c).forEach(i => { const g = G[i], rs = par.get(i);
      if (g) morceaux.push({ h: H_GROUPE + 8, f: () => { const ge = gesteDuGenre(g), noms = [...g.noms];
        return `<tr class="rc-groupe rc-genre ${g.niveau}"><td colspan="${n}"><span class="rc-groupe-l">${etatHtml(g.niveau, String(g.n))}<b class="rc-genre-mot">${esc(motDuGenre(g.genre, g.n))}</b>`
          + `<span class="rc-groupe-n">${esc(noms.length === 1 ? noms[0] : noms.length ? plurielLie(noms.length, 'repère') : 'le tableau')}</span>`
          + `<button type="button" class="rc-lien" data-premier="${escA(g.cle)}" data-bulle="Sa fiche, sur son folio ; P passe au point suivant">${rs.length > 1 ? 'Voir le premier' : 'Voir'}</button>`
          + (ge ? `<button type="button" class="rc-lien rc-fort" data-geste="${escA(g.cle)}" data-bulle="${escA(ge.aide)}">${esc(ge.mot)}</button>` : '') + '</span></td></tr>'; } });
      rs.forEach(ligne); }); }
  else L.forEach(ligne);
  // (v74) le geste qui se répète d'une ligne à la suivante, sans intercalaire entre elles : « ″ » (les lignes se posent après)
  RECAP.parGenre = !!parGenre; RECAP.pareils = new Set();
  if (O === PROBLEMES) { let avant = null; morceaux.forEach(m => { if (m.k == null) { avant = null; return; } const r = RECAP.vues.get(m.k), s = r ? signatureGestes(r) : ''; if (s && s === avant) RECAP.pareils.add(m.k); avant = s; }); }
  // un onglet vide le dit sous ses en-têtes, au milieu de la feuille (hors de la table : sa dernière colonne prend tout)
  const vide = assurerVide(), rien = !L.length && !tete.length; vide.innerHTML = rien ? videRecap(O, tous.length) : ''; vide.hidden = !rien;
  const corps = $('ba-tbody'), choisie = morceaux.findIndex(m => { const r = m.k != null && RECAP.vues.get(m.k); return r && !r.nouveau && O.choisie(r); });
  if (morceaux.length > VIRTUEL_DES) { RECAP.virtuel = { morceaux, n, debut: -1, fin: -1, jeton }; corps.innerHTML = '';
    if (choisie >= 0 && b.defiler) { let y = 0; for (let i = 0; i < choisie; i++) y += morceaux[i].h; $('ba-corps').scrollTop = Math.max(0, y - $('ba-corps').clientHeight / 2); }
    peindreFenetre(true); return; }
  RECAP.virtuel = null;
  // le premier paquet va jusqu'à la ligne choisie (on la fait venir sous les yeux)
  const d = Math.max(PAQUET, choisie >= 0 ? choisie + 20 : 0), poser = (a, z) => morceaux.slice(a, z).map(m => m.f()).join('');
  corps.innerHTML = poser(0, d);
  if (d < morceaux.length) { let k = d; const suite = () => { if (jeton !== RECAP.jeton || $('base').hidden) return;
      corps.insertAdjacentHTML('beforeend', poser(k, k + PAQUET * 2)); k += PAQUET * 2; if (k < morceaux.length) requestAnimationFrame(suite); };
    requestAnimationFrame(suite); } }
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
  V.debut = debut; V.fin = fin;
  [...corps.children].filter(tr => !tr.classList.contains('rc-espace')).forEach((tr, j) => { const m = M[debut + j]; if (m && tr.offsetHeight) m.h = tr.offsetHeight; });
  if (garde) { const el = elementDe(garde); if (el) { try { el.focus({ preventScroll: true }); } catch (_) { el.focus(); } } } }
// amener la ligne d'une clé sous les yeux (la ligne choisie, une case qu'on édite), même hors de la fenêtre
function amenerLigne(k) { const V = RECAP.virtuel; if (!V) return; const i = V.morceaux.findIndex(m => m.k === k); if (i < 0) return;
  if (i >= V.debut && i < V.fin) return; let y = 0; for (let j = 0; j < i; j++) y += V.morceaux[j].h; const c = $('ba-corps'); c.scrollTop = Math.max(0, y - c.clientHeight / 2); peindreFenetre(true); }
/* LES VIDES : une icône au trait dans un carré doux, une phrase (ce qui manque, puis pourquoi), UNE action — effacer ce
   qui filtre, voir tout le contrat, ou écrire la première ligne. */
const VIDES = { liaisons: ['Aucune liaison', 'Écrivez la première ici, ou déposez une installation sur la table.'], equipements: ['Aucun équipement', 'Un équipement s’écrit ici ; ses câbles, dans l’onglet Liaisons.'],
  disjoncteurs: ['Aucun disjoncteur', 'Un disjoncteur est un repère au code CB.'], barrettes: ['Aucune barrette', 'Ni posée au contrat, ni proposée par l’outil.'],
  prises: ['Aucune prise de coupure', 'Une prise de coupure est un repère au code VC.'], cables: ['Aucun câble complet', 'Un câble compte quand sa liaison a un « de » et un « vers ».'],
  raccords: ['Aucun connecteur', 'Un raccord se choisit pour chaque connecteur d’équipement.'], problemes: ['Rien à reprendre', 'Le contrôle ne relève aucun problème.'], normes: ['Aucune table ne juge ce contrat', 'Les normes s’appliquent dès qu’il a des liaisons.'] };
const ICO_VIDE = { loupe: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>', folio: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 9h16M9 9v10"/>', ok: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  table: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 10h17M3.5 14.5h17M9.5 10v9"/>' };
const icoVide = (k, cls) => `<span class="rc-vide-ico${cls ? ' ' + cls : ''}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICO_VIDE[k]}</svg></span>`;
function videRecap(O, nTous) { const b = app.base, cherche = b.filtre.trim(), puces = pucesActives(O).length;
  const bloc = (ico, titre, phrase, action) => `<div class="rc-vide-etat">${ico}<b>${titre}</b><span>${phrase}</span>${action || ''}</div>`;
  if (nTous) {
    if (cherche || puces) return bloc(icoVide('loupe'), cherche && !b.filtreAuto ? `Rien ne correspond à «${INSECABLE}${esc(cherche)}${INSECABLE}»` : 'Rien qui corresponde',
      puces ? (puces > 1 ? 'Les puces pressées se cumulent' : 'La puce pressée filtre') + (cherche ? ' avec la recherche.' : ' cet onglet.') : 'Ni dans les repères, ni dans les câbles, ni dans les types.', '<button class="btn papier" id="ba-effacer">Tout effacer</button>');
    return bloc(icoVide('folio'), 'Rien sur ce folio', 'Le folio ' + esc(app.plan) + ' n’a aucune ligne de cet onglet.', '<button class="btn papier" data-portee-tout="1">Voir tout le contrat</button>'); }
  const [titre, phrase] = VIDES[b.onglet] || ['Rien à montrer', ''];
  return bloc(b.onglet === 'problemes' ? icoVide('ok', 'ok') : icoVide('table'), titre, phrase, O.ajout && O.ajouter ? `<button class="btn papier" data-ajouter="1">${ICONE_PLUS}${esc(O.ajout)}</button>` : ''); }
const ICONE_PLUS = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
// la place du vide, sous la table ; ses gestes sont ceux de la table (effacer, voir tout, écrire la première ligne)
function assurerVide() { let v = $('ba-vide'); if (v) return v; v = document.createElement('div'); v.id = 'ba-vide'; v.className = 'rc-vide-zone'; v.hidden = true; $('ba-corps').appendChild(v);
  v.addEventListener('click', e => { const b = app.base, O = onglet();
    if (e.target.closest('#ba-effacer')) { b.filtre = ''; b.filtreAuto = false; $('ba-filtre').value = ''; b.puces[b.onglet] = []; memoriserBase(); rendreBase(true); }
    else if (e.target.closest('[data-portee-tout]')) { b.portee = 'tout'; memoriserBase(); rendreBase(true); }
    else if (e.target.closest('[data-ajouter]') && O.ajouter) O.ajouter(); });
  return v; }
/* LA LIGNE CHOISIE suit le plan : la liaison du câble choisi est posée sur le gris doux ; un BLOC choisi ne fait pas de
   ses liaisons des lignes choisies — elles gardent un filet, et le repère du bloc se surligne là où il paraît (de ou
   vers). `on` reste la marque de ce que le plan désigne ; `lie` dit qu'elle y tient par un bloc. */
const parUnBloc = O => O === LIAISONS && !!app.cible && app.cible.type === 'bloc';
function ligneHtml(O, C, r, neuve) { RECAP.vues.set(r.k, r); const et = r.nouveau ? '' : O.etat(r), on = !r.nouveau && O.choisie(r), lie = on && parUnBloc(O);
  const cls = [et, on ? 'on' : '', lie ? 'lie' : '', neuve ? 'neuve' : '', O.hors && O.hors(r) ? 'rc-hors' : ''].filter(Boolean).join(' ');
  return `<tr data-k="${escA(r.k)}"${r.l ? ` data-i="${r.i}"` : ''}${cls ? ` class="${cls}"` : ''}>` + C.map(c => `<td class="${c.cls || ''}"${largeurCol(c)}>${r.nouveau ? (c.k === 'rep' ? valT('rep', '', { cls: 'rc-r', ph: 'repère' }) : '') : c.html(r)}</td>`).join('')
    + `<td class="rc-suppr">${O.supprimer && !r.nouveau ? `<button data-x="1" aria-label="Supprimer la liaison" data-bulle="Supprimer cette liaison (« Rétablir » ou Ctrl+Z la rend)"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>` : ''}</td></tr>`; }
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
function editer(el) { const b = app.base, O = onglet(), c = caseDe(el); if (!c || b.edition) return false; const r = RECAP.vues.get(c.k); if (!r || !O.editeur) return false;
  const E = O.editeur(r, c.f); if (!E) return false;
  if (E.action) { E.action(); return true; }
  if (E.gamme) { ouvrirGamme(el, r.nom); return true; }
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
  const toutes = [...$('ba-tbody').querySelectorAll('tr[data-k] [data-f]')].filter(x => x.tagName !== 'INPUT' && x.tagName !== 'SELECT' && (!tab || x === ed.el || !x.classList.contains('rc-calc'))), i = toutes.indexOf(ed.el);
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
  b.ouvert = false; b.neuves = []; b.neufs = []; b.nouveau = false; b.toutes = false; fermerMenuColonnes(); fermerGamme(); ['ba-csv-menu', 'ba-filtrer'].forEach(id => { const m = $(id); if (m) m.open = false; }); if (typeof cacherBulle === 'function') cacherBulle();
  const el = $('base'); el.hidden = true; el.classList.remove('page'); document.body.classList.remove('base-ouverte'); $('btnBase').setAttribute('aria-pressed', 'false');
  memoriserBase(); rendreLePlan(); basculerModeCarte(); }   // la fiche redevient une carte, près de son bloc
/* B : ouvre en moitié, ou ferme ; Maj+B : passe en page, et de la page revient en moitié. */
function basculerBase(taille) { const b = app.base;
  if (taille === 'page') { if (!(app.contrat.liaisons.length || verite().length)) { dire('Rien à montrer : ouvrez d’abord une installation.'); return; } ouvrirBase(b.ouvert && b.taille === 'page' ? 'moitie' : 'page'); return; }
  if (b.ouvert) fermerBase(); else if (app.contrat.liaisons.length || verite().length) ouvrirBase('moitie'); else dire('Rien à montrer : ouvrez d’abord une installation.'); }
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
    typeof exporterRetestCorrige === 'function' && verite().length ? ['ba-csv-retest', 'L’installation corrigée (Excel)', 'le livrable à renvoyer : relu avant d’enregistrer'] : false].filter(x => x !== false);
  l.innerHTML = lignes.map(g => g === null ? '<hr>' : `<button role="menuitem" id="${g[0]}"${g[3] || ''}>${esc(g[1])}<small>${esc(g[2])}</small></button>`).join('').replace(/^<hr>|<hr>$/g, ''); }
function exporterRecap(tout) { assurerModele(); const O = onglet(), C = colonnesVues(O).filter(c => c.texte && (c.t || c.titre)), M = lignesMontrees(O);
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
function ouvrirMenuColonnes() { const O = onglet(), vues = new Set(colonnesVues(O).map(c => c.k)), m = $('ba-colonnes-menu'), xs = O.colonnes.filter(c => c.t && (!c.si || c.si()));
  const coche = c => `<label class="rc-coche"><input type="checkbox" data-col="${c.k}"${vues.has(c.k) ? ' checked' : ''}><span>${esc(c.t)}</span></label>`;
  const R = []; xs.filter(c => c.option).forEach(c => { const t = c.g || 'En plus', r = R.find(x => x.t === t); if (r) r.cs.push(c); else R.push({ t, cs: [c] }); });
  const rubrique = (t, cs) => `<div class="rc-menu-t">${esc(t)}</div><div class="rc-menu-g">${cs.map(coche).join('')}</div>`;
  m.classList.toggle('large', xs.length >= 10);
  m.innerHTML = rubrique('D’office', xs.filter(c => !c.option)) + R.map(r => rubrique(r.t, r.cs)).join('')
    + '<button class="rc-lien" id="ba-colonnes-defaut">Revenir aux colonnes d’office</button>';
  m.style.maxHeight = ''; m.hidden = false; $('ba-colonnes').setAttribute('aria-expanded', 'true');
  const place = $('base').getBoundingClientRect().bottom - $('ba-colonnes').getBoundingClientRect().bottom - 18; if (place > 120 && m.scrollHeight > place) m.style.maxHeight = place + 'px';
  const x = m.querySelector('input'); if (x) x.focus(); }
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
  // le mot « Colonnes » se range quand la barre se resserre (la flèche reste)
  const col = $('ba-colonnes'), mot = [...col.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
  if (mot) { const s = document.createElement('span'); s.className = 'rc-col-mot'; s.textContent = mot.textContent; col.replaceChild(s, mot); col.dataset.bulle = 'Les colonnes de cet onglet'; }
  // (v74) son icône — trois colonnes — devant le mot : serrée, la barre garde l'icône, comme « Filtrer »
  col.insertAdjacentHTML('afterbegin', '<svg class="ico rc-col-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M9.5 5v14M14.5 5v14"/></svg>');
  // la table virtuelle se repeint en défilant (une image au plus)
  let raf = 0; $('ba-corps').addEventListener('scroll', () => { if (GAMME.el) fermerGamme(); if (RECAP.virtuel && !raf) raf = requestAnimationFrame(() => { raf = 0; peindreFenetre(); }); }, { passive: true });
  $('ba-ajouter').onclick = () => { const O = onglet(); if (O.ajouter) O.ajouter(); };
  // le pourquoi d'un état, d'une norme, d'une origine : la bulle de la fiche, au survol (08-fiche)
  if (typeof lierBulles === 'function') lierBulles($('base'));
  // les onglets : un clic, ou les flèches quand l'un a le clavier — ↑ ↓ dans le rail, ← → aussi (la bande étroite), Début, Fin
  const ong = $('ba-onglets'); ong.setAttribute('aria-orientation', 'vertical');
  ong.addEventListener('click', e => { const x = e.target.closest('[data-onglet]'); if (x) changerOnglet(x.dataset.onglet); });
  ong.addEventListener('keydown', e => { const pas = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, Home: -Infinity, End: Infinity }[e.key]; if (pas == null) return; e.preventDefault(); e.stopPropagation();
    const ks = ONGLETS.map(([k]) => k), i = ks.indexOf(b.onglet), k = pas === -Infinity ? ks[0] : pas === Infinity ? ks[ks.length - 1] : ks[(i + pas + ks.length) % ks.length]; changerOnglet(k); const n = ong.querySelector(`[data-onglet="${k}"]`); if (n) n.focus(); });
  $('ba-portee').addEventListener('click', e => { const x = e.target.closest('[data-portee]'); if (!x || b.portee === x.dataset.portee) return; b.portee = x.dataset.portee; memoriserBase(); rendreBase(true); });
  fi.addEventListener('input', () => { clearTimeout(fT); fT = setTimeout(() => { b.filtre = fi.value; b.filtreAuto = false;
    const c = app.cible; if (c && c.type === 'bloc' && fi.value.trim() !== filtreDuBloc(c.nom)) { app.cible = null; app.choisi = null; peindre(); }
    memoriserBase(); rendreBase(); rallumer(); }, 150); });
  fi.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); if (fi.value) { fi.value = ''; fi.dispatchEvent(new Event('input')); } else fi.blur(); }
    else if (e.key === 'ArrowDown' || e.key === 'Enter') { const x = corps.querySelector('tr[data-k] [data-f]'); if (x) { e.preventDefault(); x.focus(); } } });
  $('ba-vider').onclick = () => { fi.value = ''; fi.dispatchEvent(new Event('input')); fi.focus(); };
  // les puces et les onglets défilent de côté (la molette aussi) et s'effacent au bord qui cache quelque chose
  [$('ba-puces'), ong].forEach(x => { const bord = () => bordDe(x); x.addEventListener('scroll', bord, { passive: true }); if (window.ResizeObserver) new ResizeObserver(bord).observe(x);
    x.addEventListener('wheel', e => { if (x.scrollWidth <= x.clientWidth || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return; e.preventDefault(); x.scrollLeft += e.deltaY; }, { passive: false }); });
  // les puces : chacune bascule ; celles d'un niveau (Problèmes, À voir), une seule à la fois
  $('ba-puces').addEventListener('click', e => { const x = e.target.closest('[data-puce]'); if (x) basculerPuce(x.dataset.puce); });
  $('ba-colonnes').onclick = e => { e.stopPropagation(); if ($('ba-colonnes-menu').hidden) ouvrirMenuColonnes(); else fermerMenuColonnes(); };
  $('ba-colonnes-menu').addEventListener('change', e => { const x = e.target.closest('[data-col]'); if (!x) return; const ch = b.colonnes[b.onglet] || (b.colonnes[b.onglet] = {}); ch[x.dataset.col] = x.checked; memoriserBase(); rendreBase(true); });
  $('ba-colonnes-menu').addEventListener('click', e => { if (e.target.id === 'ba-colonnes-defaut') { delete b.colonnes[b.onglet]; memoriserBase(); rendreBase(true); ouvrirMenuColonnes(); } });
  $('ba-colonnes-menu').addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); fermerMenuColonnes(); $('ba-colonnes').focus(); } });
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
    const ge = e.target.closest('[data-geste]'); if (ge) { faireLeGeste(ge.dataset.geste); return; }
    if (!r || r.nouveau) return;
    if (e.target.closest('button[data-x]')) { O.supprimer(r); return; }
    const au = e.target.closest('button[data-auto]'); if (au) { if (O.rendre) O.rendre(r, au.dataset.auto); return; }
    if (e.target.closest('[data-aller]')) { if (O.aller) O.aller(r); return; }
    if (e.target.closest('[data-voir-fils]')) { if (O.voirFils) O.voirFils(r); return; }
    const re = e.target.closest('[data-retenir]'); if (re) { retenirCalibre(r.nom, +re.dataset.retenir); return; }
    if (e.target.closest('[data-poser]')) { editerCase(r.k, 'rep'); return; }
    const gp = e.target.closest('[data-geste-pb]'); if (gp) { const g = gestesDuPb(r)[+gp.dataset.gestePb]; if (g && g.faire) g.faire(); return; }
    /* UN SEUL GESTE POUR ÉCRIRE, PARTOUT (l'ergonome v73 : « on corrige au double-clic ici, d'un clic dans la fiche ») : sur
       la ligne qu'on a choisie, un clic sur une valeur l'écrit, comme dans la fiche ; ailleurs, le premier clic choisit la
       ligne et pose le clavier sur la valeur — une touche, Entrée ou un second clic l'écrivent. Le double-clic reste. */
    const v = e.target.closest('.rc-v[data-f]'); if (e.detail > 1) return;   // le second appui d'un double-clic : l'appui l'a déjà traité (plus bas)
    if (v && !v.classList.contains('rc-calc') && O.choisie(r) && !(v.dataset.f === 'calibre' && Date.now() - (GAMME.ferme || 0) < 350)) { editer(v); return; }
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
  corps.addEventListener('dblclick', e => { const v = e.target.closest('[data-f]'); if (v && !v.classList.contains('edite') && !b.edition && !GAMME.el) { e.preventDefault(); editer(v); } });
  corps.addEventListener('mouseover', e => { if (b.edition) return; const tr = e.target.closest('tr[data-k]'), r = tr && RECAP.vues.get(tr.dataset.k), O = onglet(); if (r && !r.nouveau && O.survol) O.survol(r); });
  corps.addEventListener('mouseleave', () => { if (!b.edition) rallumer(); });
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
    if (e.key.length === 1 && e.key !== ' ' && !TOUCHES_DE_L_OUTIL.has(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey && !v.classList.contains('rc-calc')) { const k = e.key;
      if (editer(v)) { e.preventDefault(); e.stopPropagation(); const ed = b.edition; if (ed && ed.inp.tagName === 'INPUT') { ed.inp.value = k; ed.inp.dispatchEvent(new Event('input')); } } return; }
    const pas = { ArrowRight: 'suivante', ArrowLeft: 'precedente', ArrowDown: 'dessous', ArrowUp: 'dessus' }[e.key]; if (!pas || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault(); e.stopPropagation(); const c = caseDe(v), n = elementDe(voisine({ k: c.k, f: c.f, el: v }, pas)); if (n) { n.focus(); n.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } });
  // le focus sur une case de liaison : son câble s'allume (le clavier comme la souris)
  corps.addEventListener('focusin', e => { if (b.edition) return; const tr = e.target.closest('tr[data-k]'), r = tr && RECAP.vues.get(tr.dataset.k); if (r && r.l) { const w = filDe(r.l); if (w) allumerFil(w); } });
  // Maj+B : la page (B, lui, est pris par le clavier de l'outil, 08 `lierPanneau`)
  window.addEventListener('keydown', e => { if (e.key !== 'B' || !e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return; e.preventDefault(); basculerBase('page'); });
  lierPoignee(); }
/* La poignée : la moitié se règle en hauteur (la page prend toute la place, elle n'en a pas). */
function lierPoignee() { const p = $('ba-poignee'), el = $('base'); let actif = false;
  p.addEventListener('pointerdown', e => { if (app.base.taille === 'page') return; actif = true; el.classList.add('redim'); try { p.setPointerCapture(e.pointerId); } catch (_) { } e.preventDefault(); });
  p.addEventListener('pointermove', e => { if (!actif) return;
    app.base.hauteur = Math.round(Math.max(160, Math.min(window.innerHeight * 0.8, el.getBoundingClientRect().bottom - e.clientY))); appliquerTailleBase(); });
  const fin = () => { if (!actif) return; actif = false; el.classList.remove('redim'); memoriserBase(); laisserLePlan(true); peindreFenetre(true); };
  p.addEventListener('pointerup', fin); p.addEventListener('pointercancel', fin); }
