/* ===========================================================================
   08 — LE RÉCAPITULATIF : tout le contrat d'un coup d'œil, en onglets, et
   tout s'y corrige
   ---------------------------------------------------------------------------
   Le lecteur : « le tableau, la base de données : très bien, mais pas hyper
   structuré ; beaucoup de chiffres dans tous les sens. Qu'on comprenne d'un
   coup d'œil : le fil va de là à là, c'est un fil de telle jauge. Et il n'y a
   que les liaisons : un endroit qui récapitule tout, où l'on voit tout, les
   normes. Tout doit être modifiable. »
   Il remplace le tiroir des liaisons (`#base` : l'identifiant reste) :
     · TROIS TAILLES : Plan (fermé), Moitié (en bas, le plan au-dessus), Page
       (toute la place du plan) — l'inspecteur reste à droite. B ouvre et
       ferme, Maj+B passe en page et en revient ; le segment en tête.
     · DIX ONGLETS, chacun son compte et, s'il y a lieu, un carré d'état :
       Liaisons, Équipements, Disjoncteurs, Barrettes, Prises, Fils et câbles,
       Contacts, Raccords, Problèmes, Normes.
     · UNE LIAISON SE LIT COMME UNE PHRASE : de (repère:borne, le part number
       dessous) → le fil (un trait à la couleur de sa route, épais selon sa
       jauge, son numéro au milieu, une flèche) → vers ; la jauge en pastille ;
       la longueur et son origine ; l'intensité en barre contre l'admis ; la
       chute ; les contacts. La couleur ne dit que l'état (le fond pâle et le
       point d'une ligne fautive, le point ambre d'une ligne à voir) et la
       route ; tout le reste est à l'encre.
     · TOUT SE CORRIGE SUR PLACE : double-clic, Entrée ou F2 édite la valeur,
       Tab passe à la suivante, Échap annule, les flèches se déplacent ; une
       valeur que l'outil calcule (la longueur d'hypothèse, le contact, la
       nature, le calibre) forcée à la main devient « main » et porte ↺, qui
       rend le calcul. Chaque correction est une entrée d'historique (Ctrl+Z).
     · FILTRER, TRIER, CHOISIR SES COLONNES, EXPORTER : la portée (Folio n /
       Tout), un champ qui cherche partout, des puces, le tri à l'en-tête, le
       CSV de ce qu'on voit. Un clic sur une ligne ouvre sa fiche et allume le
       plan, le survol allume le fil ; un bloc choisi sur le plan filtre
       l'onglet (`filtreAuto`). Onglet, recherche, tri, puces et colonnes se
       gardent dans ce navigateur, jamais l'état ouvert.
   Les valeurs se lisent dans le moteur — le contrôle (`CONTROLE.items`), les
   plans des connecteurs, des barrettes et des prises (le contact de chaque
   fil), la disjonction, l'habillage, la norme — une fois par état du contrat
   (`RECAP.memo`), et seulement pour ce que l'onglet montre.
   La NATURE dite d'un équipement (« 115CD est un disjoncteur ») se garde dans
   les choix du contrat (`designations`, clé « repère|nature », comme
   l'arrangement d'un connecteur l'est sous « repère|A ») ; le modèle la lit
   (01, `natureDite`). Le CONTACT forcé d'un bout de fil se garde sur la
   liaison (`contactDe`, `contactVers`) ; la fiche et la nomenclature le lisent.
   =========================================================================== */
'use strict';

/* ---- l'état, et ce que ce navigateur en garde ------------------------------- */
const ONGLETS = [['liaisons', 'Liaisons'], ['equipements', 'Équipements'], ['disjoncteurs', 'Disjoncteurs'], ['barrettes', 'Barrettes'], ['prises', 'Prises'],
  ['cables', 'Fils et câbles'], ['contacts', 'Contacts'], ['raccords', 'Raccords'], ['problemes', 'Problèmes'], ['normes', 'Normes']];
/* app.base (08) porte déjà : ouvert, portee, filtre (la recherche de l'onglet ouvert), filtreAuto (le bloc choisi sur le
   plan : il vaut pour tous les onglets), tri (celui de l'onglet ouvert), hauteur, sale, defiler, enSaisie. Le
   récapitulatif y ajoute sa taille, l'onglet, les recherches, tris, puces et colonnes de chaque onglet, les lignes
   ajoutées (en tête jusqu'à ce qu'on ferme), l'édition en cours et la case à reprendre après un rendu. */
Object.assign(app.base, { taille: 'moitie', onglet: 'liaisons', filtres: {}, tris: {}, puces: {}, colonnes: {}, neuves: [], neufs: [], nouveau: false, edition: null, focus: null, toutes: false });
const CLE_RECAP = 'atelier.recap.v1', CAP_LIGNES = 400;
// la nature dite d'un équipement, lue par le modèle (01, `lireRepere`)
const CLE_NATURE = nom => nom + '|nature';
natureDite = nom => (app.contrat && app.contrat.designations && app.contrat.designations.get(CLE_NATURE(nom))) || '';

function memoriserBase() { const b = app.base; b.tris[b.onglet] = b.tri; if (!b.filtreAuto) b.filtres[b.onglet] = b.filtre;
  try { localStorage.setItem(CLE_RECAP, JSON.stringify({ onglet: b.onglet, portee: b.portee, filtres: b.filtres, tris: b.tris, puces: b.puces, colonnes: b.colonnes, hauteur: b.hauteur })); } catch (_) { } }
function relireBase() { let o = null; try { o = JSON.parse(localStorage.getItem(CLE_RECAP) || 'null'); } catch (_) { }
  const b = app.base;
  if (o && typeof o === 'object') { if (ONGLETS.some(([k]) => k === o.onglet)) b.onglet = o.onglet; if (o.portee === 'tout' || o.portee === 'folio') b.portee = o.portee;
    ['filtres', 'tris', 'puces', 'colonnes'].forEach(k => { if (o[k] && typeof o[k] === 'object') b[k] = o[k]; }); b.hauteur = +o.hauteur || 0; }
  b.tri = b.tris[b.onglet] || null; b.filtre = typeof b.filtres[b.onglet] === 'string' ? b.filtres[b.onglet] : ''; appliquerTailleBase(); }

/* ---- ce que l'onglet lit du moteur : une fois par état du contrat --------- */
const RECAP = { jeton: 0, cle: null, memo: new Map(), norme: null, bible: null, refs: null, items: null, itemsN: 0, parCable: null, parNom: null, rendu: null, vues: new Map(), liste: [], datalist: 0 };
function assurerModele() { const C = app.contrat;
  const k = JSON.stringify(verite()) + '|' + JSON.stringify([...C.designations]) + '|' + JSON.stringify([...(C.sexes || [])]) + '|' + JSON.stringify([...(C.charges || [])])
    + '|' + JSON.stringify([...(C.raccords || [])]) + '|' + JSON.stringify(app.simu || {}) + '|' + app.plan + '|' + app.nFolios;
  if (k !== RECAP.cle || RECAP.norme !== app.norme || RECAP.bible !== app.bible || RECAP.refs !== app.references) { RECAP.cle = k; RECAP.norme = app.norme; RECAP.bible = app.bible; RECAP.refs = app.references; RECAP.memo.clear(); }
  if (RECAP.items !== CONTROLE.items) { RECAP.items = CONTROLE.items; RECAP.itemsN++; RECAP.parCable = null; RECAP.parNom = null; RECAP.memo.delete('fils'); } }
const memo = (k, f) => { if (!RECAP.memo.has(k)) RECAP.memo.set(k, f()); return RECAP.memo.get(k); };
const routes = () => memo('routes', couleursDesRoutes);
const H_ = () => app.simu || HYPOTHESES;
/* Le contrôle, par fil (un point qui cite son numéro) et par repère : l'état d'une ligne. */
function itemsParCable() { if (!RECAP.parCable) { const C = new Set(verite().map(l => l.cable).filter(Boolean)), m = new Map();
    (CONTROLE.items || []).forEach(x => { new Set(String(x.texte).match(/[^\s,;:()«»]+/g) || []).forEach(t => { if (C.has(t)) (m.get(t) || m.set(t, []).get(t)).push(x); }); }); RECAP.parCable = m; }
  return RECAP.parCable; }
function itemsParNom() { if (!RECAP.parNom) { const m = new Map(); (CONTROLE.items || []).forEach(x => { if (x.nom) (m.get(x.nom) || m.set(x.nom, []).get(x.nom)).push(x); }); RECAP.parNom = m; } return RECAP.parNom; }
const niveauDe = xs => xs.some(x => x.niveau === 'ko') ? 'ko' : xs.length ? 'att' : '';
const etatDuNom = nom => { const xs = itemsParNom().get(nom) || []; return { niveau: niveauDe(xs), ko: xs.filter(x => x.niveau === 'ko').map(x => x.texte), att: xs.filter(x => x.niveau !== 'ko').map(x => x.texte) }; };

/* Ce qui alimente chaque fil : le premier disjoncteur dont un chemin passe par lui (comme `alimentationDe`, une fois pour
   tous les fils), et les points de son profil de charge. */
const alimentations = () => memo('alim', () => { const V = verite(), m = new Map();
  reperesDe(V).filter(estDisjoncteur).forEach(cb => { const pts = pointsDuProfil(chargeDe(cb));
    cheminsDepuis(V, cb).forEach(ch => ch.segments.forEach(s => { if (s.fil && !m.has(s.fil)) m.set(s.fil, { nom: cb, points: pts }); })); });
  return m; });
const declassement = () => memo('declassement', () => { const H = H_(); return facteurDeclassement(app.norme, H.conditions, { fils: H.fils, charge: H.charge, altitude: H.altitude }); });
/* Les liaisons de chaque repère, rangées en un passage : le moteur lit un repère dans les liaisons qu'on lui donne (ses
   besoins, ses connecteurs, son plan ne regardent que les siennes) — lui donner les siennes seulement, c'est le même
   calcul, sans relire tout le contrat pour chacun. */
const liaisonsParRepere = () => memo('parRepere', () => { const m = new Map(), V = verite();
  V.forEach(l => [l.de, l.vers].forEach((r, k) => { if (!r || (k && l.vers === l.de)) return; (m.get(r) || m.set(r, []).get(r)).push(l); })); return m; });
const liaisonsDuRepere = nom => liaisonsParRepere().get(nom) || [];
/* Le plan d'un repère — ses cavités, sa barrette ou sa prise, comme 08-modules les calcule (`cavitesDe`, `planDeBarrette`,
   `planDeCoupure`) — et ce que chaque fil y reçoit (le contact, ce qu'on sertit). */
function planDuRepere(r) { return memo('plan|' + r, () => { const fils = new Map(), out = { fils, cavites: [], barrette: null, coupure: null };
  if (!r || VT_A_POSER.test(r) || estMasse(r) || estRenvoi(r) || estRail(r)) return out;
  const noter = xs => (xs || []).forEach(x => { if (x.f && x.f.l && !fils.has(x.f.l)) fils.set(x.f.l, x); }), L = liaisonsDuRepere(r), D = app.contrat.designations;
  try { if (barretteEnModules(r)) { const besoins = besoinsDeBarrette(r, L), plan = remplirModules(besoins, app.norme, D.get(r) || ''); out.barrette = { besoins, plan, main: plan.variante }; noter(plan.fils); }
    else if (coupureEnModules(r)) { out.coupure = coupureEnModule(r, L, app.norme, D.get(r) || '', sexeChoisi(r)); noter(out.coupure.plan.fils); }
    else if (!estBornier(r) && aDesModulesDeConnecteur()) { out.cavites = connecteursEnModules(r, L, app.norme, k => D.get(k) || '', sexeChoisi); out.cavites.forEach(c => noter(c.plan.fils)); } } catch (_) { }
  return out; }); }
/* Le contact d'un bout de fil : celui qu'on a écrit à la main, sinon celui que le plan lui donne ; null pour un bout qui
   n'en prend pas (une masse, un renvoi). */
function contactDuBout(l, cote) { const r = cote === 'de' ? l.de : l.vers, force = cote === 'de' ? l.contactDe : l.contactVers;
  if (!r || VT_A_POSER.test(r) || estMasse(r) || estRenvoi(r) || estRail(r)) return null;
  const x = planDuRepere(r).fils.get(l) || null, auto = x && x.sertir ? x.sertir.reference : '';
  if (force) return { ref: force, acc: '', main: true, auto, taille: x && x.contact ? x.contact.taille : '', sexe: x ? x.sexe || '' : '' };
  return { ref: auto, acc: x && x.sertir ? x.sertir.accessoire || '' : '', ko: !!(x && x.jaugeOk === false), taille: x && x.contact ? x.contact.taille : '', sexe: x ? x.sexe || '' : '', connu: !!x }; }
/* TOUT CE QU'UNE LIGNE DE LIAISON DIT, comme la fiche du fil (08-fiche, `ficheFil`) : la jauge, ce que le fil admet
   (EN 2853, déclassé), le courant (le profil du disjoncteur en amont, sinon l'hypothèse), ce qui dépasse, la longueur
   (le retest, sinon l'hypothèse), la chute sur ce fil, sa résistance et sa masse, le contact de chaque bout, l'état. */
function infoFil(l) { const M = memo('fils', () => new Map()); let F = M.get(l); if (F) return F;
  const H = H_(), jauge = jaugeDuType(l.type), fn = l.type ? filDeNorme(app.norme, l.type, jauge) : null, cab = l.type ? cableDuType(app.norme, l.type) : null;
  const rd = l.type ? resistanceDuFil(app.norme, l.type, jauge, H.tconducteur) : { rho: null, kConducteur: 1 };
  const fac = fn ? declassement() * facteurAmbiante(fn, H.ambiante) * (rd.kConducteur || 1) : 1, admis = fn && fn.intensite != null ? fn.intensite * fac : null;
  const al = alimentations().get(l) || null, perm = al ? al.points.find(p => p.t === Infinity) : null, I = perm ? perm.i : H.courant;
  const pts = al ? al.points : [{ nom: 'hypothèse', i: I, t: Infinity }], adm = p => fn ? intensiteAdmise(fn, p.t) * fac : null;
  const trop = fn ? pts.filter(p => p.i > adm(p) + 1e-9) : [];
  // ce que la ligne montre : le point le plus chargé du profil contre ce que le fil admet à sa durée (le permanent sinon)
  const pire = fn && pts.length ? pts.slice().sort((a, b) => b.i / adm(b) - a.i / adm(a))[0] : null;
  const L = l.longueur > 0 ? l.longueur : H.longueur, R = rd.rho != null ? rd.rho / 1000 * L : null;
  F = { jauge, fn, cab, admis, al, I, Ihyp: !perm, trop, pire: pire && (pire.t !== Infinity || pire.i !== I) ? { ...pire, admis: adm(pire) } : null, L, R, dU: R != null ? R * I : null, masse: cab && cab.masse != null ? cab.masse * L : null, de: contactDuBout(l, 'de'), vers: contactDuBout(l, 'vers') };
  F.etat = etatDuFil(l, F); M.set(l, F); return F; }
function etatDuFil(l, F) { const ko = new Set(), att = new Set();
  if (!liaisonComplete(l)) att.add('liaison incomplète : ni dessinée, ni vérifiée');
  else if (l.de !== l.vers) { if (!l.type) att.add('sans type : sa jauge ne se vérifie pas');
    F.trop.forEach(p => ko.add(`${p.nom} ${amperes(p.i)}${p.t === Infinity ? '' : ' pendant ' + secondes(p.t)} : plus que ce que le fil admet`));
    [['de', l.de], ['vers', l.vers]].forEach(([c, r]) => { if (F[c] && F[c].ko) ko.add('le contact côté ' + r + ' refuse sa jauge'); }); }
  (l.cable ? itemsParCable().get(l.cable) || [] : []).forEach(x => (x.niveau === 'ko' ? ko : att).add(x.texte));
  return { niveau: ko.size ? 'ko' : att.size ? 'att' : '', ko: [...ko], att: [...att] }; }

/* ---- petits morceaux de rendu ------------------------------------------- */
// une valeur qu'on corrige : un clic la choisit, double-clic, Entrée ou F2 l'édite ; vide, elle dit ce qu'on y écrirait
const val = (f, html, opt) => { opt = opt || {}; const vide = html == null || html === '';
  return `<span class="rc-v${opt.cls ? ' ' + opt.cls : ''}${vide ? ' rc-vide' : ''}" data-f="${escA(f)}" tabindex="-1"${opt.ph ? ` data-ph="${escA(opt.ph)}"` : ''}${opt.titre ? ` title="${escA(opt.titre)}"` : ''}>${vide ? '' : html}</span>`; };
const valT = (f, t, opt) => val(f, t == null || t === '' ? '' : esc(t), opt);
// « ↺ » : rend le calcul (ou ce que le fichier portait) à une valeur forcée ; la bulle dit ce qui revient
const rond = (f, quoi) => `<button type="button" class="rc-auto" data-auto="${escA(f)}" title="${escA('Rendre ' + quoi)}" aria-label="${escA('Rendre ' + quoi)}">↺</button>`;
const orig = o => o === 'hyp' ? '<i class="rc-o rc-hyp" title="Une hypothèse de la simulation (menu ⋮ → Hypothèses)">hyp.</i>' : o === 'auto' ? '<i class="rc-o">auto</i>' : o === 'main' ? '<i class="rc-o main" title="Écrit à la main">main</i>' : o ? `<i class="rc-o">${esc(o)}</i>` : '';
const unite = u => `<i class="rc-u">${u}</i>`;
const rien = '<span class="rc-rien">—</span>';
const fmt = (x, n) => x == null || !isFinite(x) ? '' : nombre(Math.round(x * Math.pow(10, n)) / Math.pow(10, n));
const amp1 = x => x == null || !isFinite(x) ? '' : nombre((Math.round(x * 10) / 10).toFixed(1));
const volt2 = x => nombre(x < 0.1 ? x.toFixed(3) : x.toFixed(2));
const metres = x => { const t = Math.round(x * 100) / 100; return nombre(t % 1 === 0 ? t.toFixed(1) : String(t)); };
const point = (niveau, mots) => niveau ? `<i class="rc-point ${niveau}" title="${escA(mots || (niveau === 'ko' ? 'un problème' : 'à voir'))}"></i>` : '';
const motsEtat = e => [...e.ko, ...e.att].join('\n');
// la jauge dite deux fois : l'épaisseur du trait et une pastille chiffrée
const epaisseur = g => g == null ? 1.5 : g <= 16 ? Math.min(8, 5 + 0.3 * (16 - g)) : Math.max(1.8, 5 - 0.4 * (g - 16));
const pastilleJauge = g => `<span class="rc-jauge ${g == null ? 'inconnue' : g <= 16 ? 'forte' : g <= 20 ? 'moyenne' : 'fine'}" title="${g == null ? 'jauge inconnue : le type ne la dit pas' : g + ' AWG'}">${g == null ? '?' : g}</span>`;
const traitRoute = c => `<i class="rc-trait"${c ? ` style="--c:${c}"` : ''}></i>`;
const listeFolios = ps => ps.length ? (ps.length > 3 ? ps.length + ' folios' : 'f. ' + ps.join(' · ')) : '';
// le genre d'un repère, en mot et en symbole
const SYMBOLES = { eqpt: '<rect x="4" y="5" width="12" height="14" rx="1.5"/><path d="M16 9h4M16 15h4"/>', cb: '<path d="M3 15h5M16 15h5"/><circle cx="8" cy="15" r="1.3"/><circle cx="16" cy="15" r="1.3"/><path d="M8.5 13.6C10 9 14 9 15.5 13.6"/><path d="M12 9.6V6"/>',
  barrette: '<rect x="3" y="9" width="18" height="6" rx="1.5"/><circle cx="7.5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="16.5" cy="12" r="1" fill="currentColor"/>',
  coupure: '<path d="M10 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3z"/><path d="M14 5h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3z"/><path d="M10 9h4M10 15h4"/>', aposer: '<rect x="3" y="9" width="18" height="6" rx="1.5" stroke-dasharray="2.5 2"/>' };
const symbole = g => `<svg class="ico rc-sym" viewBox="0 0 24 24" aria-hidden="true">${SYMBOLES[g] || SYMBOLES.eqpt}</svg>`;

/* ---- LIAISONS ----------------------------------------------------------- */
// la portée : le folio affiché ; ce que l'outil a découpé se lit par la clé de la liaison (une fois par état du contrat)
const avecPortee = () => app.plan !== '*' && memo('plans', plans).length > 0;
const modeFolioMemo = () => memo('modeFolio', modeFolio);
const foliosParSourceMemo = () => memo('foliosSource', foliosParSource);
function surLeFolio(l) { if (app.plan === '*') return true; return modeFolioMemo() === 'auto' ? (foliosParSourceMemo().get(cleDe(l)) || []).includes(app.plan) : l.plan === app.plan; }
const premierFolio = l => (modeFolioMemo() === 'auto' ? (foliosParSourceMemo().get(cleDe(l)) || [])[0] : l.plan) || '';
const bout = (l, c) => { const de = c === 'de', r = l[c], b = l[de ? 'borneDe' : 'borneVers'], pn = l[de ? 'pnDe' : 'pnVers'], nat = estMasse(r) ? 'masse' : estRenvoi(r) ? 'renvoi' : '';
  return `<div class="rc-bout"><span class="rc-rep">${valT(c, r, { cls: 'rc-r', ph: de ? 'de' : 'vers' })}<i class="rc-sep${b ? '' : ' rc-vide'}">:</i>${valT(de ? 'borneDe' : 'borneVers', b, { cls: 'rc-b', ph: 'borne' })}</span>`
    // une masse, un renvoi : pas de part number à écrire, le mot le dit
    + `<span class="rc-sous">${pn || !nat ? valT(de ? 'pnDe' : 'pnVers', pn, { cls: 'rc-pn', ph: 'part number' }) : `<small class="rc-nat">${nat}</small>`}</span></div>`; };
const contactH = (l, F, c) => { const x = F[c], f = c === 'de' ? 'contactDe' : 'contactVers'; if (!x) return rien;
  const titre = x.main ? 'Écrit à la main' + (x.auto ? ' — le calcul donne ' + x.auto : '') : x.ko ? 'Ce contact refuse la jauge du fil' : !x.ref ? (x.connu ? 'Aucun contact de la table ne va à ce fil' : 'Aucun plan ne connaît ce connecteur : écris le contact') : (x.taille ? 'contact taille ' + x.taille + (x.sexe ? ' · ' + (x.sexe === 'M' ? 'mâle' : 'femelle') : '') : '');
  return `<div class="rc-ctc">${valT(f, x.ref, { cls: 'rc-ct' + (x.ko ? ' ko' : ''), ph: '—', titre })}${x.acc ? `<small class="rc-acc">+ ${esc(x.acc)}</small>` : ''}${x.main ? orig('main') + rond(f, x.auto ? 'le contact calculé (' + x.auto + ')' : 'le calcul') : ''}</div>`; };
// ce que la ligne dit de la valeur d'un champ du fichier, forcée ici : « ↺ » rend celle du retest
const rendu = (l, f) => origineChamp(l, f) === 'main' && l.avant && l.avant[f] ? rond(f, 'la valeur du retest (' + l.avant[f] + ')') : '';
const COLONNES_LIAISONS = [
  { k: 'etat', t: '', titre: 'État', cls: 'rc-et', html: r => point(r.F().etat.niveau, motsEtat(r.F().etat)), tri: r => ({ ko: 0, att: 1 })[r.F().etat.niveau] ?? 2, texte: r => ({ ko: 'problème', att: 'à voir' })[r.F().etat.niveau] || '' },
  { k: 'de', t: 'De', cls: 'rc-c-bout', html: r => bout(r.l, 'de') + rendu(r.l, 'de'), tri: r => r.l.de + '\u0001' + r.l.borneDe, texte: r => r.l.de + (r.l.borneDe ? ':' + r.l.borneDe : '') + ' ' + (r.l.pnDe || '') },
  { k: 'fil', t: 'Fil', cls: 'rc-c-fil', html: r => { const c = routes().get(r.l.route || '') || '', g = r.F().jauge;
      return `<div class="rc-fil${c ? '' : ' sans-route'}${g == null ? ' sans-jauge' : ''}" style="${c ? '--c:' + c + ';' : ''}--e:${epaisseur(g)}px">${valT('cable', r.l.cable, { cls: 'rc-no', ph: 'n° de fil' })}</div>${rendu(r.l, 'cable')}`; },
    tri: r => r.l.cable, texte: r => r.l.cable },
  { k: 'vers', t: 'Vers', cls: 'rc-c-bout', html: r => bout(r.l, 'vers') + rendu(r.l, 'vers'), tri: r => r.l.vers + '\u0001' + r.l.borneVers, texte: r => r.l.vers + (r.l.borneVers ? ':' + r.l.borneVers : '') + ' ' + (r.l.pnVers || '') },
  { k: 'jauge', t: 'Jauge · câble', cls: 'rc-c-jauge', html: r => `<div class="rc-jc">${pastilleJauge(r.F().jauge)}${valT('type', r.l.type, { cls: 'rc-type', ph: 'type' })}${rendu(r.l, 'type')}</div>`,
    tri: r => r.F().jauge == null ? 99 : r.F().jauge, texte: r => r.l.type + (r.F().jauge != null ? ' ' + r.F().jauge + ' AWG' : '') },
  { k: 'longueur', t: 'Longueur', cls: 'rc-c-n', html: r => { const o = r.l.longueur > 0 ? origineChamp(r.l, 'longueur') : 'hyp';
      return `<div class="rc-num">${val('longueur', metres(r.F().L), { cls: 'rc-n', titre: o === 'hyp' ? 'Aucune longueur au retest : l’hypothèse de la simulation. Écris la longueur mesurée.' : '' })}${unite('m')}${o === 'hyp' ? orig('hyp') : o === 'main' ? orig('main') + rond('longueur', r.l.avant && r.l.avant.longueur > 0 ? 'la longueur du retest (' + metres(r.l.avant.longueur) + ' m)' : 'l’hypothèse (' + metres(H_().longueur) + ' m)') : ''}</div>`; },
    tri: r => r.F().L, texte: r => metres(r.F().L) + ' m' + (r.l.longueur > 0 ? '' : ' hypothèse') },
  { k: 'intensite', t: 'Intensité / admis', cls: 'rc-c-int', html: r => { const F = r.F(), P = F.pire && F.pire.i / F.pire.admis > (F.admis ? F.I / F.admis : 0) ? F.pire : null, i = P ? P.i : F.I, a = P ? P.admis : F.admis;
      const q = a ? i / a : null, niv = F.trop.length || (q != null && q > 1) ? 'ko' : q != null && q > 0.6 ? 'att' : 'ok';
      const titre = (F.al ? amperes(F.I) + ' permanent sous ' + F.al.nom : amperes(F.I) + ' : le courant d’hypothèse (aucun profil en amont)') + (F.admis != null ? ' · le fil admet ' + amperes(F.admis) + ' en continu (EN 2853, déclassé)' : ' · ce que le fil admet est inconnu')
        + (P ? ' · ' + P.nom + ' ' + amperes(P.i) + ' pendant ' + secondes(P.t) + ' : le fil admet ' + amperes(P.admis) + ' à cette durée' : '') + ' — double-clic : ' + (F.al ? 'le profil de ' + F.al.nom : 'les hypothèses');
      return `<div class="rc-int" title="${escA(titre)}"><span class="rc-iv${niv === 'ko' ? ' ko' : ''}">${val('intensite', amp1(i), { cls: 'rc-n rc-calc' })}${unite('A')}<span class="rc-adm">/ ${a != null ? amp1(a) : '?'}</span>${P ? `<i class="rc-o">${esc(secondes(P.t))}</i>` : F.Ihyp ? orig('hyp') : ''}</span>`
        + (q != null ? `<span class="rc-barre ${niv}"><i style="width:${Math.round(Math.min(1, q) * 100)}%"></i></span>` : '') + '</div>'; },
    tri: r => r.F().admis ? r.F().I / r.F().admis : -1, texte: r => amp1(r.F().I) + ' A / ' + (r.F().admis != null ? amp1(r.F().admis) : '?') },
  { k: 'chute', t: 'Chute', cls: 'rc-c-n', html: r => r.F().dU == null ? rien : `<div class="rc-num" title="Sur ce fil seul, au courant de la ligne ; la chute en ligne se lit sur la fiche du disjoncteur"><b class="rc-n">${volt2(r.F().dU)}</b>${unite('V')}</div>`, tri: r => r.F().dU ?? -1, texte: r => r.F().dU == null ? '' : volt2(r.F().dU) + ' V' },
  { k: 'contactDe', t: 'Contact de', cls: 'rc-c-ct', html: r => contactH(r.l, r.F(), 'de'), tri: r => (r.F().de || {}).ref || '', texte: r => (r.F().de || {}).ref || '' },
  { k: 'contactVers', t: 'Contact vers', cls: 'rc-c-ct', html: r => contactH(r.l, r.F(), 'vers'), tri: r => (r.F().vers || {}).ref || '', texte: r => (r.F().vers || {}).ref || '' },
  { k: 'route', t: 'Route', cls: 'rc-c-route', html: r => `<div class="rc-route">${traitRoute(routes().get(r.l.route || ''))}${valT('route', r.l.route, { ph: 'route' })}${rendu(r.l, 'route')}</div>`, tri: r => r.l.route, texte: r => r.l.route },
  { k: 'plan', t: 'Folio', cls: 'rc-c-folio', option: true, si: () => modeFolio() !== 'aucun', html: r => modeFolioMemo() === 'auto'
      ? `<span title="Découpé par l’outil : le folio se lit, il ne s’écrit pas">${(foliosParSourceMemo().get(cleDe(r.l)) || []).map(p => `<button class="rc-f" data-plan="${escA(p)}">${esc(p)}</button>`).join('')}</span>` : valT('plan', r.l.plan, { ph: 'folio' }),
    tri: r => premierFolio(r.l), texte: r => modeFolioMemo() === 'auto' ? (foliosParSourceMemo().get(cleDe(r.l)) || []).join(' ') : r.l.plan },
  { k: 'harness', t: 'Harness', option: true, html: r => valT('harness', r.l.harness, { ph: 'harness' }), tri: r => r.l.harness || '', texte: r => r.l.harness || '' },
  { k: 'fwd', t: 'FWD', option: true, html: r => valT('fwd', r.l.fwd, { ph: 'dessin' }), tri: r => r.l.fwd || '', texte: r => r.l.fwd || '' },
  { k: 'descriptionDe', t: 'Description 1', option: true, cls: 'rc-c-texte', html: r => valT('descriptionDe', r.l.descriptionDe, { ph: 'description', cls: 'rc-texte' }), tri: r => r.l.descriptionDe || '', texte: r => r.l.descriptionDe || '' },
  { k: 'descriptionVers', t: 'Description 2', option: true, cls: 'rc-c-texte', html: r => valT('descriptionVers', r.l.descriptionVers, { ph: 'description', cls: 'rc-texte' }), tri: r => r.l.descriptionVers || '', texte: r => r.l.descriptionVers || '' },
  { k: 'resistance', t: 'Résistance', cls: 'rc-c-n', option: true, html: r => r.F().R == null ? rien : `<div class="rc-num"><b class="rc-n">${fmt(r.F().R * 1000, 0)}</b>${unite('mΩ')}</div>`, tri: r => r.F().R ?? -1, texte: r => r.F().R == null ? '' : fmt(r.F().R * 1000, 0) + ' mΩ' },
  { k: 'masse', t: 'Masse', cls: 'rc-c-n', option: true, html: r => r.F().masse == null ? rien : `<div class="rc-num"><b class="rc-n">${fmt(r.F().masse, 1)}</b>${unite('g')}</div>`, tri: r => r.F().masse ?? -1, texte: r => r.F().masse == null ? '' : fmt(r.F().masse, 1) + ' g' }];
const ligneLiaison = (l, i) => { const r = { l, i, k: String(i) }; let F = null; r.F = () => F || (F = infoFil(l)); return r; };
const LIAISONS = {
  ajout: 'Liaison', aide: 'Une liaison de plus, en tête : le curseur dans « de » (sur un équipement choisi, « vers »)',
  colonnes: COLONNES_LIAISONS, portee: true,
  lignes: () => verite().map(ligneLiaison),
  surFolio: r => surLeFolio(r.l),
  exact: (r, f) => r.l.de === f || r.l.vers === f,
  etat: r => r.F().etat.niveau,
  choisie: r => { const c = app.cible; return !!c && (c.type === 'fil' ? c.l === r.l : r.l.de === c.nom || r.l.vers === c.nom); },
  hors: r => !(liaisonComplete(r.l) && surLeFolio(r.l)),
  puces: () => [['probleme', 'Problèmes', r => !!r.F().etat.niveau, '', '', 'Les lignes à reprendre : un problème (le point rouge) ou un point à voir (ambre)', true],
    ...[...routes()].map(([route, c]) => ['route:' + route, route, r => r.l.route === route, traitRoute(c), 'route']),
    ['hyp', 'Longueur d’hypothèse', r => !(r.l.longueur > 0), '', '', 'Les fils sans longueur au retest : l’hypothèse de la simulation compte pour eux'],
    ['fins', 'Jauge ≤ 22', r => { const g = jaugeDuType(r.l.type); return g != null && g <= 22; }, '', '', 'Les fils de 22 AWG et plus gros (16, 18, 20, 22)'],
    ['sanscontact', 'Sans contact connu', r => [r.F().de, r.F().vers].some(x => x && !x.ref), '', '', 'Un bout dont aucun plan ne donne le contact à sertir', true]],
  ajouter: () => ajouterLiaison(app.cible && app.cible.type === 'bloc' && !VT_A_POSER.test(app.cible.nom) ? app.cible.nom : ''),
  choisir: r => choisirLigneFil(r.l),
  survol: r => { const w = filDe(r.l); if (w) allumerFil(w); },
  supprimer: r => supprimerLiaison(r.i),
  editeur: (r, f) => editeurFil(r, f),
  ecrire: (r, f, v) => ecrireFil(r.l, f, v),
  rendre: (r, f) => { const l = r.l; if (f === 'contactDe' || f === 'contactVers') return ecrireFil(l, f, '');
    return rendreChamp(l, f); } };
const LISTES = { de: 'reperes', vers: 'reperes', pnDe: 'pns', pnVers: 'pns', type: 'types', route: 'routes', plan: 'folios', contactDe: 'contacts', contactVers: 'contacts' };
function editeurFil(r, f) { const l = r.l;
  if (f === 'intensite') { const F = r.F(); return { action: () => { if (F.al) choisirRepere(F.al.nom); else ficheHypotheses(); } }; }
  if (f === 'plan' && modeFolio() === 'auto') return null;
  if (f === 'longueur') return { valeur: l.longueur > 0 ? metres(l.longueur) : '', ph: 'm (hypothèse : ' + metres(H_().longueur) + ')', aide: 'en mètres (3,5) ou en millimètres (3500 mm)' };
  if (f === 'contactDe' || f === 'contactVers') { const F = r.F(), x = F[f === 'contactDe' ? 'de' : 'vers']; if (!x) return null;
    return { valeur: x.main ? x.ref : '', ph: x.ref || 'contact à sertir', liste: candidatsContact(F.jauge, x), aide: x.main ? 'vide : le contact calculé revient' : '' }; }
  return { valeur: l[f] == null ? '' : String(l[f]), liste: LISTES[f] }; }
/* Les contacts de la table (la norme des modules) qui vont à cette jauge — et à la taille et au sexe du plan, s'il les dit. */
function candidatsContact(jauge, x) { const T = normeDesModules(app.norme).contacts || [], vus = new Set();
  return T.filter(c => (c.jauge === '*' || jauge == null || +c.jauge === jauge) && (!x.taille || String(c.taille) === String(x.taille)) && (!x.sexe || c.sexe === x.sexe))
    .map(c => c.reference).filter(c => c && !vus.has(c) && vus.add(c)).slice(0, 40); }
/* Écrire un champ d'une liaison : une entrée d'historique, ce que le fichier portait gardé (`changerLiaison`, 08-sections).
   Un champ du fichier vidé reste une chaîne vide (de, vers, borne… : le modèle ne connaît pas « rien »). */
const CHAMPS_DE_BASE = new Set(['de', 'borneDe', 'pnDe', 'vers', 'borneVers', 'pnVers', 'cable', 'type', 'route', 'plan']);
function ecrireFil(l, f, v) { const avant = l[f] == null ? '' : String(l[f]);
  if (f === 'longueur') { if (v === '') { if (!(l.longueur > 0)) return false; }
    else { const x = longueurLue(v); if (x == null) { dire('Longueur illisible : écris des mètres (3,5) ou des millimètres (3500 mm).', true); return false; } if (x === l.longueur) return false; v = x; } }
  else if (avant === v) return false;
  if (!(app.cible && app.cible.type === 'bloc')) app.cible = { type: 'fil', l };
  const quoi = f === 'longueur' ? 'longueur de ' + (l.cable || 'la liaison') : /^contact/.test(f) ? 'contact de ' + (l.cable || 'la liaison') : 'modification d’une liaison';
  if (CHAMPS_DE_BASE.has(f) && v === '') { histPush(quoi); if (!(l.avant && f in l.avant)) l.avant = { ...(l.avant || {}), [f]: l[f] == null ? null : l[f] }; l[f] = ''; app.actif = l; apresEdition(); return true; }
  return changerLiaison(l, f, v === '' ? null : v, quoi); }
/* Choisir une liaison : sa fiche à droite, son fil allumé ; sur un autre folio, on y va. */
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

/* ---- ÉQUIPEMENTS (un repère par ligne : équipements, disjoncteurs, barrettes, prises) ---- */
const GENRES = { eqpt: 'équipement', cb: 'disjoncteur', barrette: 'barrette', coupure: 'prise de coupure' };
const genreDuRepere = nom => estCoupure(nom) ? 'coupure' : estBarrette(nom) ? 'barrette' : estDisjoncteur(nom) ? 'cb' : 'eqpt';
/* Les repères du contrat (hors renvois, masses et rails) et les barrettes à poser de chaque folio — sans rien calculer de
   leurs plans : l'onglet ne paie que ce qu'il montre. */
const reperes = () => memo('reperes', () => { const V = verite(), par = new Map();
  // les folios d'un repère : ceux du contrat tel qu'il se dessine (découpé par l'outil, ce sont les siens), comme `plansDuRepere`
  app.contrat.liaisons.forEach(l => [l.de, l.vers].forEach(r => { if (!r) return; const s = par.get(r) || par.set(r, new Set()).get(r); if (l.plan) s.add(l.plan); }));
  const out = reperesDe(V).filter(r => !estRenvoi(r) && !estMasse(r) && !estRail(r)).map(nom => ({ nom, k: nom, genre: genreDuRepere(nom), plans: [...(par.get(nom) || [])].sort(triNaturel) }));
  (plans().length ? plans() : ['*']).forEach(p => liaisonsDe(p).forEach(l => { if (l.origine === null && l.vers === l.aPoser && l.borneVers === '1')
    out.push({ nom: l.aPoser, k: l.aPoser + '@' + p, genre: 'barrette', plan: p === '*' ? '' : p, plans: p === '*' ? [] : [p], aPoser: true, sous: 'à poser sur ' + l.de + ':' + l.borneDe }); }));
  return out.sort((a, b) => triNaturel(a.nom, b.nom) || triNaturel(a.plan || '', b.plan || '')); });
/* Ce qu'un repère porte sans plan : ses connecteurs (lettre, part number, bornes), ses fils, ses besoins. */
const baseRepere = nom => memo('base|' + nom, () => { const L = liaisonsDuRepere(nom), b = besoinsDeBarrette(nom, L), cs = estBornier(nom) ? [] : connecteursDe(nom, L).filter(c => c.nom);
  return { b, cs, fils: L.filter(l => l.de !== l.vers).length, pns: cs.length ? cs : [{ nom: '', pn: b.pn, bornes: null }] }; });
/* Et ce que ses plans en disent : chaque connecteur (le fautif), les contacts pris sur ce qu'il y a. */
function infoRepere(r) { return memo('rep|' + r.k, () => { const nom = r.nom;
  if (r.aPoser) { const L = liaisonsDe(r.plan || '*'), Q = (app.bible || []).some(e => e.module) ? remplirModules(besoinsDeBarrette(nom, L), app.norme, '') : null;
    return { fils: L.filter(l => (l.de === nom || l.vers === nom) && l.de !== l.vers).length, contacts: Q ? [Q.utilises, Q.contacts] : null, connecteurs: [], pns: [], Q }; }
  const B = baseRepere(nom), P = planDuRepere(nom), cav = new Map(P.cavites.map(c => [c.nom, c]));
  const connecteurs = B.cs.map(c => { const k = cav.get(c.nom); return { nom: c.nom, pn: c.pn, bornes: c.bornes, ko: !!(k && k.plan.verdicts.some(v => v.niveau === 'ko')), ref: k && k.plan.modules[0] ? k.plan.modules[0].reference : '' }; });
  let contacts = null;
  if (P.barrette) contacts = [P.barrette.plan.utilises, P.barrette.plan.contacts];
  else if (P.coupure) { const M = P.coupure.plan.modules[0]; contacts = [P.coupure.points.length, M ? M.module.contacts.length : null]; }
  else if (P.cavites.length) contacts = [P.cavites.reduce((n, c) => n + c.plan.utilises, 0), P.cavites.reduce((n, c) => n + c.plan.modules.reduce((m, M) => m + M.module.contacts.length, 0), 0)];
  return { fils: B.fils, contacts, connecteurs, pns: B.pns, b: B.b }; }); }
const filsDuRepere = r => r.aPoser ? infoRepere(r).fils : baseRepere(r.nom).fils;
const dejaFait = nom => memo('deja|' + nom, () => { const I = indexReferences(); if (!I) return null; try { const c = candidatsDeReference(I, verite(), nom, 1)[0]; return c ? c : null; } catch (_) { return null; } });
const natureAuto = nom => { const q = lireRepere(nom), c = q && (q.codeLu || q.code); return q && q.num && CODES[c] ? CODES[c].nom : 'équipement'; };
const natureModifiable = r => !r.aPoser && (r.genre === 'eqpt' || r.genre === 'cb');
const COLONNES_REPERES = [
  { k: 'etat', t: '', titre: 'État', cls: 'rc-et', html: r => { const e = etatDuNom(r.nom); return point(e.niveau, motsEtat(e)); }, tri: r => ({ ko: 0, att: 1 })[etatDuNom(r.nom).niveau] ?? 2, texte: r => ({ ko: 'problème', att: 'à voir' })[etatDuNom(r.nom).niveau] || '' },
  { k: 'rep', t: 'Repère', cls: 'rc-c-rep', html: r => valT('rep', r.nom, { cls: 'rc-r' + (r.aPoser ? ' aposer' : ''), titre: r.aPoser ? 'Barrette à poser : écris son vrai repère, elle entre au contrat' : 'Écrire ici renomme : chaque fil suit' }) + (r.aPoser ? `<small class="rc-nat">${esc(r.sous)}</small>` : ''), tri: r => r.nom, texte: r => r.nom },
  { k: 'nature', t: 'Nature', cls: 'rc-c-nature', html: r => { const d = natureDite(r.nom), mot = r.aPoser ? 'barrette à poser' : r.genre === 'eqpt' || r.genre === 'cb' ? natureDe(r.nom) : GENRES[r.genre];
      return `<div class="rc-nature">${symbole(r.aPoser ? 'aposer' : r.genre)}${natureModifiable(r) ? valT('nature', mot, { titre: d ? 'Dite à la main ; le code du repère dit « ' + natureAuto(r.nom) + ' »' : 'Lue dans le code du repère — double-clic pour la dire' }) : `<span class="rc-mot">${esc(mot)}</span>`}${d ? orig('main') + rond('nature', 'la nature du code (' + natureAuto(r.nom) + ')') : ''}</div>`; },
    tri: r => natureDe(r.nom), texte: r => natureDe(r.nom) },
  { k: 'des', t: 'Désignation', cls: 'rc-c-texte', html: r => r.aPoser ? rien : valT('des', app.contrat.designations.get(r.nom) || '', { cls: 'rc-texte', ph: 'à écrire' }), tri: r => app.contrat.designations.get(r.nom) || '', texte: r => app.contrat.designations.get(r.nom) || '' },
  { k: 'pn', t: 'Part number', cls: 'rc-c-pn', html: r => { if (r.aPoser) return rien; const I = baseRepere(r.nom);
      return `<div class="rc-pns">${I.pns.map(c => `<span class="rc-pnl">${I.pns.length > 1 ? `<i class="rc-cn">${esc(c.nom)}</i>` : ''}${valT('pn:' + c.nom, c.pn, { cls: 'rc-pn', ph: 'part number' })}</span>`).join('')}</div>`; },
    tri: r => r.aPoser ? '' : baseRepere(r.nom).pns.map(c => c.pn).join(' '), texte: r => r.aPoser ? '' : baseRepere(r.nom).pns.map(c => c.pn).filter(Boolean).join(' ') },
  { k: 'connecteurs', t: 'Connecteurs', html: r => { const I = infoRepere(r); return I.connecteurs.length ? `<span class="rc-cnx">${I.connecteurs.map(c => `<i class="${c.ko ? 'ko' : ''}" title="${escA((c.pn || 'sans part number') + (c.ref ? ' · ' + c.ref : '') + ' · ' + pluriel(c.bornes.length, 'borne') + (c.ko ? ' — aucun arrangement ne convient' : ''))}">${esc(c.nom)}</i>`).join('')}</span>` : rien; },
    tri: r => infoRepere(r).connecteurs.length, texte: r => infoRepere(r).connecteurs.map(c => c.nom).join(' ') },
  { k: 'fils', t: 'Fils', cls: 'rc-c-n', html: r => `<b class="rc-n">${filsDuRepere(r)}</b>`, tri: filsDuRepere, texte: r => String(filsDuRepere(r)) },
  { k: 'contacts', t: 'Contacts', cls: 'rc-c-n', html: r => { const c = infoRepere(r).contacts; return c ? `<span class="rc-frac"><b class="rc-n">${c[0]}</b><i>/ ${c[1] == null ? '?' : c[1]}</i></span>` : rien; },
    tri: r => (infoRepere(r).contacts || [-1])[0], texte: r => { const c = infoRepere(r).contacts; return c ? c[0] + ' / ' + (c[1] == null ? '?' : c[1]) : ''; } },
  { k: 'folio', t: 'Folio', cls: 'rc-c-folio', html: r => r.plans.length ? `<span class="rc-folios">${esc(listeFolios(r.plans))}</span>` : rien, tri: r => r.plans[0] || '', texte: r => r.plans.join(' ') },
  { k: 'deja', t: 'Déjà fait', cls: 'rc-c-n', si: () => !!indexReferences(), html: r => { const c = r.aPoser ? null : dejaFait(r.nom); return c ? `<span class="rc-deja" title="${escA(c.repere + ' de ' + c.harness)}"><b class="rc-n">${Math.round(c.taux * 100)}</b><i>%</i></span>` : rien; },
    tri: r => { const c = r.aPoser ? null : dejaFait(r.nom); return c ? c.taux : -1; }, texte: r => { const c = r.aPoser ? null : dejaFait(r.nom); return c ? Math.round(c.taux * 100) + ' %' : ''; } }];
const surFolioRepere = r => app.plan === '*' || (r.plan ? r.plan === app.plan : r.plans.includes(app.plan));
const choisieRepere = r => !!app.cible && app.cible.type === 'bloc' && app.cible.nom === r.nom;
const EQUIPEMENTS = {
  ajout: 'Équipement', aide: 'Un équipement de plus, en tête : écris son repère, puis ses fils dans Liaisons',
  colonnes: COLONNES_REPERES, portee: true, lignes: () => reperes(), surFolio: surFolioRepere, exact: (r, f) => r.nom === f, choisie: choisieRepere,
  etat: r => etatDuNom(r.nom).niveau,
  puces: () => [['genre:tous', 'Tous', () => true, '', 'genre'], ['genre:eqpt', 'Équipements', r => r.genre === 'eqpt', '', 'genre'], ['genre:cb', 'Disjoncteurs', r => r.genre === 'cb', '', 'genre'],
    ['genre:barrette', 'Barrettes', r => r.genre === 'barrette', '', 'genre'], ['genre:coupure', 'Prises', r => r.genre === 'coupure', '', 'genre'], ['probleme', 'Problèmes', r => !!etatDuNom(r.nom).niveau]],
  exclusif: 'genre',
  ajouter: () => { app.base.nouveau = true; rendreBase(true); editerCase('+', 'rep'); },
  choisir: r => choisirRepere(r.nom, r.plan),
  survol: r => survolRepere(r.nom),
  editeur: (r, f) => editeurRepere(r, f),
  ecrire: (r, f, v) => ecrireRepere(r, f, v),
  rendre: (r, f) => f === 'nature' ? ecrireRepere(r, 'nature', '') : false };
function editeurRepere(r, f) {
  if (f === 'rep') return { valeur: r.nouveau ? '' : r.nom, ph: r.nouveau ? 'repère du nouvel équipement, par exemple 105RL2' : 'repère', aide: r.aPoser ? 'le vrai repère : la barrette entre au contrat' : '' };
  if (f === 'nature') { if (!natureModifiable(r)) return null; const auto = natureAuto(r.nom), d = natureDite(r.nom);
    const opts = [['', 'auto · ' + auto], ...Object.entries(CODES).filter(([, c]) => c.forme === 'equipement').sort((a, b) => a[1].nom.localeCompare(b[1].nom, 'fr')).map(([k, c]) => [k, c.nom + ' (' + k + ')']), ['EQ', 'équipement, sans nature']];
    return { valeur: d, options: opts }; }
  if (f === 'des') return r.aPoser ? null : { valeur: app.contrat.designations.get(r.nom) || '', ph: 'désignation' };
  if (/^pn:/.test(f)) { const c = baseRepere(r.nom).pns.find(x => 'pn:' + x.nom === f); return c ? { valeur: c.pn || '', liste: 'pns', aide: c.bornes ? 'connecteur ' + c.nom + ' : toutes ses liaisons suivent' : 'toutes ses liaisons suivent' } : null; }
  return null; }
function ecrireRepere(r, f, v) { const nom = r.nom;
  if (f === 'rep') { if (r.nouveau) { app.base.nouveau = false; if (!v) return false; return creerEquipement(v); }
    if (!v || v === nom) return false; return renommerRepere(nom, v, r); }
  if (f === 'nature') { if (v === natureDite(nom)) return false; histPush('nature de ' + nom); designer(CLE_NATURE(nom), v); apresEdition(); dire(v ? nom + ' : ' + natureDe(nom) + ', dit à la main.' : nom + ' : la nature du code revient (' + natureAuto(nom) + ').'); return true; }
  if (f === 'des') { if (v === (app.contrat.designations.get(nom) || '')) return false; histPush('désignation de ' + nom); designer(nom, v); apresEdition(); return true; }
  if (/^pn:/.test(f)) { const c = baseRepere(r.nom).pns.find(x => 'pn:' + x.nom === f); return c ? changerPartNumber(nom, c.bornes, v) : false; }
  return false; }
/* Renommer un repère d'ici (comme la fiche) : chaque fil suit, ses choix aussi ; une barrette à poser entre au contrat. */
function renommerRepere(nom, nr, r) { const b = app.base;
  if (r && r.aPoser) { if (r.plan && r.plan !== app.plan && plans().includes(r.plan)) allerAuPlan(r.plan); const ok = poserBarrette(nom, nr); if (ok) RECAP.renomme = [r.k, nr]; return ok; }
  if (verite().some(l => l.de === nr || l.vers === nr)) { dire(nr + ' existe déjà au contrat : choisis un autre repère.', true); return false; }
  histPush('renommage de ' + nom); renommer(nom, nr);
  const D = app.contrat.designations, n = D.get(CLE_NATURE(nom)); if (n) { D.delete(CLE_NATURE(nom)); D.set(CLE_NATURE(nr), n); }
  if (app.cible && app.cible.type === 'bloc' && app.cible.nom === nom) { app.cible = { type: 'bloc', nom: nr }; app.choisi = nr; }
  if (b.filtre === nom) b.filtre = nr; RECAP.renomme = [r ? r.k : nom, nr]; b.neufs = b.neufs.map(x => x === nom ? nr : x);
  apresEdition(); return true; }
function creerEquipement(nom) { if (verite().some(l => l.de === nom || l.vers === nom)) { dire(nom + ' existe déjà au contrat.', true); return false; }
  histPush('ajout de ' + nom); verite().push(liaison({ de: nom, plan: (modeFolio() === 'fichier' && app.plan !== '*') ? app.plan : '' }));
  app.base.neufs.unshift(nom); app.cible = { type: 'bloc', nom }; app.base.focus = { k: nom, f: 'nature' }; apresEdition();
  dire(nom + ' : ses fils s’écrivent dans l’onglet Liaisons (une ligne l’attend, « vers » à écrire).'); return true; }
/* Le part number d'un connecteur (ou de tout le repère) : toutes ses liaisons le prennent, en une action (Ctrl+Z). */
function changerPartNumber(nom, bornes, pn) { const xs = [];
  verite().forEach(l => { if (l.de === nom && (!bornes || bornes.includes(l.borneDe)) && (l.pnDe || '') !== pn) xs.push([l, 'pnDe']); if (l.vers === nom && (!bornes || bornes.includes(l.borneVers)) && (l.pnVers || '') !== pn) xs.push([l, 'pnVers']); });
  return changerLiaisons(xs, pn, 'part number de ' + nom); }
/* Plusieurs liaisons d'un coup : une entrée d'historique ; chacune garde ce qu'elle portait (comme `changerLiaison`). */
function changerLiaisons(xs, v, quoi) { if (!xs.length) return false; histPush(quoi);
  xs.forEach(([l, k]) => { if (!(l.avant && k in l.avant)) l.avant = { ...(l.avant || {}), [k]: l[k] == null ? null : l[k] }; l[k] = v; }); apresEdition(); return true; }
/* Choisir un repère depuis une ligne : son folio, son bloc, sa fiche — sans toucher au filtre de l'onglet. */
function choisirRepere(nom, plan) { const P = plans();
  if (plan && plan !== app.plan && P.includes(plan)) allerAuPlan(plan);
  else if (!plan) { const ou = plansDuRepere(nom); if (app.plan !== '*' && ou.length && !ou.includes(app.plan)) allerAuPlan(ou[0]); }
  app.choisi = nom; app.cible = { type: 'bloc', nom }; peindre(); ouvrirInspecteur(); rallumer(); }
function survolRepere(nom) { if (app.dessin && app.dessin.compDe.has(nom)) allumerBloc(nom); else if (barretteAPoser(nom)) allumerBarretteAPoser(nom); }

/* ---- DISJONCTEURS --------------------------------------------------------- */
const disjoncteurs = () => memo('disj', () => reperes().filter(r => r.genre === 'cb'));
function infoDisj(nom) { return memo('dj|' + nom, () => { const d = disjonctionDe(nom), H = H_(), V = verite();
  const I = d.profil && d.profil.perm && d.profil.perm.i > 0 ? d.profil.perm.i : d.calibre > 0 ? d.calibre : H.courant, courts = d.points.filter(p => p.t !== Infinity && p.i > 0);
  let pire = null; try { chutesDepuis(app.norme, V, nom, I, H, courts).forEach(c => { if (!pire || c.dU > pire.dU) pire = c; }); } catch (_) { }
  const ok = d.fils.filter(f => f.verdict !== 'fil' && f.verdict !== 'calibre' && f.protege !== false).length;
  const pointe = d.points.find(p => p.t !== Infinity) || null, perm = etatsDuProfil(d.profil).find(e => e.k === 'perm');
  return { d, pire, ok, n: d.fils.length, pointe, perm: perm && perm.i > 0 ? perm.i : null, pn: pnDuRepere(nom) }; }); }
const COLONNES_DISJ = [COLONNES_REPERES[0], COLONNES_REPERES[1],
  { k: 'pn', t: 'Part number', cls: 'rc-c-pn', html: r => valT('pn:', infoDisj(r.nom).pn, { cls: 'rc-pn', ph: 'part number' }), tri: r => infoDisj(r.nom).pn, texte: r => infoDisj(r.nom).pn },
  { k: 'calibre', t: 'Calibre retenu', cls: 'rc-c-n', html: r => { const d = infoDisj(r.nom).d;
      return `<div class="rc-num">${val('calibre', d.calibre ? fmt(d.calibre, 2) : '', { cls: 'rc-n', ph: '—' })}${d.calibre ? unite('A') : ''}${d.origine === 'main' ? orig('main') + rond('calibre', 'le calibre ' + (d.pn ? 'du part number (' + amperes(d.pn) + ')' : 'idéal')) : d.origine === 'pn' ? '<i class="rc-o" title="Lu dans le part number">pn</i>' : d.origine === 'ideal' ? orig('auto') : ''}</div>`; },
    tri: r => infoDisj(r.nom).d.calibre || 0, texte: r => { const d = infoDisj(r.nom).d; return d.calibre ? amperes(d.calibre) : ''; } },
  { k: 'ideal', t: 'Le meilleur', cls: 'rc-c-n', html: r => { const d = infoDisj(r.nom).d; if (!d.calibreIdeal) return d.sansProfil ? '<span class="rc-rien" title="Le profil de charge est à renseigner">profil ?</span>' : rien;
      return `<div class="rc-num rc-ideal"><i class="rc-etoile" aria-label="idéal">${ico('etoile')}</i><b class="rc-n">${fmt(d.calibreIdeal, 2)}</b>${unite('A')}${d.calibre !== d.calibreIdeal ? `<button type="button" class="rc-lien" data-retenir="${d.calibreIdeal}">Retenir</button>` : ''}</div>`; },
    tri: r => infoDisj(r.nom).d.calibreIdeal || 0, texte: r => { const d = infoDisj(r.nom).d; return d.calibreIdeal ? amperes(d.calibreIdeal) : ''; } },
  { k: 'profil', t: 'Profil · permanent, pointe', html: r => { const D = infoDisj(r.nom);
      return `<div class="rc-profil rc-deux-lignes"><span class="rc-num">${val('perm', D.perm != null ? fmt(D.perm, 2) : '', { cls: 'rc-n', ph: 'permanent', titre: 'Le courant permanent du profil de charge' })}${D.perm != null ? unite('A') : ''}</span>${D.pointe ? `<small class="rc-pointe">pointe ${esc(amperes(D.pointe.i))} · ${esc(secondes(D.pointe.t))}</small>` : ''}</div>`; },
    tri: r => infoDisj(r.nom).perm ?? -1, texte: r => { const D = infoDisj(r.nom); return (D.perm != null ? amperes(D.perm) : '') + (D.pointe ? ' pointe ' + amperes(D.pointe.i) + ' ' + secondes(D.pointe.t) : ''); } },
  { k: 'fils', t: 'Fils protégés', cls: 'rc-c-n', html: r => { const D = infoDisj(r.nom); return D.n ? `<span class="rc-frac${D.ok < D.n ? ' ko' : ''}"><b class="rc-n">${D.ok}</b><i>/ ${D.n}</i></span>` : rien; },
    tri: r => { const D = infoDisj(r.nom); return D.n ? D.ok / D.n : -1; }, texte: r => { const D = infoDisj(r.nom); return D.ok + ' / ' + D.n; } },
  { k: 'chute', t: 'Pire chute', cls: 'rc-c-n', html: r => { const p = infoDisj(r.nom).pire; if (!p) return rien;
      return `<div class="rc-num" title="${escA(p.mots + (p.admis != null ? ' · ' + volts(p.admis) + ' admis' : '') + (p.reel ? '' : ' · sur des longueurs d’hypothèse'))}"><b class="rc-n${p.trop ? (p.reel ? ' ko' : ' att') : ''}">${fmt(p.dU, 2)}</b>${unite('V')}${p.reel ? '' : orig('hyp')}</div>`; },
    tri: r => (infoDisj(r.nom).pire || { dU: -1 }).dU, texte: r => { const p = infoDisj(r.nom).pire; return p ? fmt(p.dU, 2) + ' V' : ''; } },
  { k: 'courbe', t: 'Courbe', html: r => { const d = infoDisj(r.nom).d; return `<span class="rc-mot">${esc(d.famille ? d.famille.famille : d.courbe || 'par défaut')}</span>`; }, tri: r => { const d = infoDisj(r.nom).d; return d.famille ? d.famille.famille : d.courbe || ''; }, texte: r => { const d = infoDisj(r.nom).d; return d.famille ? d.famille.famille : d.courbe || ''; } },
  COLONNES_REPERES[8]];
const DISJONCTEURS = { colonnes: COLONNES_DISJ, portee: true, lignes: disjoncteurs, surFolio: surFolioRepere, exact: (r, f) => r.nom === f, choisie: choisieRepere, etat: r => etatDuNom(r.nom).niveau,
  puces: () => [['probleme', 'Problèmes', r => !!etatDuNom(r.nom).niveau], ['sansprofil', 'Sans profil', r => !!infoDisj(r.nom).d.sansProfil]],
  choisir: r => choisirRepere(r.nom), survol: r => survolRepere(r.nom),
  editeur: (r, f) => f === 'rep' ? { valeur: r.nom } : f === 'pn:' ? { valeur: infoDisj(r.nom).pn, liste: 'pns', aide: 'toutes ses liaisons suivent' }
    : f === 'calibre' ? { valeur: infoDisj(r.nom).d.ecrit ? String(infoDisj(r.nom).d.ecrit) : '', options: [['', 'automatique · ' + (infoDisj(r.nom).d.pn ? 'part number' : 'l’idéal')], ...infoDisj(r.nom).d.gamme.map(g => [String(g.calibre), amperes(g.calibre) + (g.ideal ? ' ★' : '') + (g.valide === false ? ' — déclenche' : '')])] }
    : f === 'perm' ? { valeur: infoDisj(r.nom).perm != null ? fmt(infoDisj(r.nom).perm, 2) : '', ph: 'A', aide: 'le courant permanent, en ampères' } : null,
  ecrire: (r, f, v) => { const nom = r.nom;
    if (f === 'rep') return v && v !== nom ? renommerRepere(nom, v, r) : false;
    if (f === 'pn:') return changerPartNumber(nom, null, v);
    if (f === 'calibre') return ecrireCharge(nom, c => { c.calibre = v ? nombreLu(v) : null; }, 'calibre de ' + nom);
    if (f === 'perm') { const x = v ? nombreLu(v) : null; if (v && x == null) { dire('Écris un courant en ampères (3,5).', true); return false; } return ecrireCharge(nom, c => { c.perm = { ...(c.perm || {}), i: x }; }, 'profil de charge de ' + nom); }
    return false; },
  rendre: (r, f) => f === 'calibre' ? ecrireCharge(r.nom, c => { c.calibre = null; }, 'calibre de ' + r.nom) : false };
function ecrireCharge(nom, f, quoi) { const avant = chargeDe(nom), c = JSON.parse(JSON.stringify(avant || {})); f(c);
  if (JSON.stringify(c) === JSON.stringify(avant || {})) return false; histPush(quoi); if (!app.contrat.charges) app.contrat.charges = new Map(); app.contrat.charges.set(nom, c); apresEdition(); return true; }

/* ---- BARRETTES ------------------------------------------------------------ */
const barrettes = () => memo('barr', () => reperes().filter(r => r.genre === 'barrette'));
function infoBarrette(r) { return memo('bar|' + r.k, () => { if (r.aPoser) { const I = infoRepere(r); return { Q: I.Q, fils: I.fils }; }
  const P = planDuRepere(r.nom); return { Q: P.barrette ? P.barrette.plan : null, main: P.barrette ? P.barrette.main : '', fils: infoRepere(r).fils }; }); }
/* Le prochain repère libre d'une barrette à poser : la suite de la barrette du contrat la plus proche de l'équipement
   qu'elle dédouble (102CB1 → 667VT21 → 667VT22), sinon le numéro de cet équipement (102VT1). */
function prochainRepereVT(r) { const pris = new Set(reperesDe(verite())), sur = /^à poser sur (\S+?):/.exec(r.sous || ''), q0 = sur ? lireRepere(sur[1]) : null, n0 = q0 && q0.num ? +q0.num : 0;
  const vts = [...pris].filter(x => estBarrette(x) && !VT_A_POSER.test(x)).map(lireRepere).filter(q => q && q.num && /^\d+$/.test(q.suffixe));
  const num = vts.length ? vts.slice().sort((a, b) => Math.abs(+a.num - n0) - Math.abs(+b.num - n0))[0].num : q0 && q0.num ? q0.num : '1';
  let k = Math.max(0, ...vts.filter(q => q.num === num).map(q => +q.suffixe)) + 1; while (pris.has(num + 'VT' + k)) k++; return num + 'VT' + k; }
const COLONNES_BARRETTES = [COLONNES_REPERES[0], COLONNES_REPERES[1],
  { k: 'module', t: 'Module', cls: 'rc-c-pn', html: r => { const B = infoBarrette(r); return B.Q ? valT('module', B.Q.reference || '', { cls: 'rc-pn', ph: 'aucun module', titre: B.main ? 'Choisi à la main' : 'Le remplissage automatique' }) + (B.main ? orig('main') + rond('module', 'le choix automatique') : '') : rien; },
    tri: r => (infoBarrette(r).Q || {}).reference || '', texte: r => (infoBarrette(r).Q || {}).reference || '' },
  { k: 'norme', t: 'Norme', html: r => { const Q = infoBarrette(r).Q; return Q ? valT('norme', Q.famille ? nomDeFamille(app.norme, Q.famille) : '', { ph: '—' }) : rien; }, tri: r => (infoBarrette(r).Q || {}).famille || '', texte: r => { const Q = infoBarrette(r).Q; return Q && Q.famille ? nomDeFamille(app.norme, Q.famille) : ''; } },
  { k: 'potentiels', t: 'Potentiels', cls: 'rc-c-n', html: r => { const Q = infoBarrette(r).Q; return Q ? `<b class="rc-n">${Q.potentiels}</b>` : rien; }, tri: r => (infoBarrette(r).Q || { potentiels: -1 }).potentiels, texte: r => String((infoBarrette(r).Q || {}).potentiels ?? '') },
  { k: 'fils', t: 'Fils', cls: 'rc-c-n', html: r => `<b class="rc-n">${infoBarrette(r).fils}</b>`, tri: r => infoBarrette(r).fils, texte: r => String(infoBarrette(r).fils) },
  { k: 'libres', t: 'Libres', cls: 'rc-c-n', html: r => { const Q = infoBarrette(r).Q; return Q && Q.modules.length ? `<b class="rc-n">${Q.contacts - Q.utilises}</b>` : rien; }, tri: r => { const Q = infoBarrette(r).Q; return Q ? Q.contacts - Q.utilises : -1; }, texte: r => { const Q = infoBarrette(r).Q; return Q ? String(Q.contacts - Q.utilises) : ''; } },
  { k: 'statut', t: 'Posée', html: r => r.aPoser ? `<span class="rc-statut"><span class="rc-mot aposer">à poser</span><button type="button" class="btn papier rc-poser" data-poser="1" title="${escA('Lui donner son vrai repère (' + prochainRepereVT(r) + ' proposé) : elle entre au contrat')}">Poser</button></span>` : '<span class="rc-mot">posée</span>',
    tri: r => r.aPoser ? 0 : 1, texte: r => r.aPoser ? 'à poser' : 'posée' },
  COLONNES_REPERES[8]];
const BARRETTES = { colonnes: COLONNES_BARRETTES, portee: true, lignes: barrettes, surFolio: surFolioRepere, exact: (r, f) => r.nom === f, choisie: choisieRepere, etat: r => etatDuNom(r.nom).niveau,
  puces: () => [['probleme', 'Problèmes', r => !!etatDuNom(r.nom).niveau], ['aposer', 'À poser', r => r.aPoser]],
  choisir: r => choisirRepere(r.nom, r.plan), survol: r => survolRepere(r.nom),
  editeur: (r, f) => { const B = infoBarrette(r);
    if (f === 'rep') return { valeur: r.aPoser ? prochainRepereVT(r) : r.nom, toujours: r.aPoser, aide: r.aPoser ? 'le vrai repère : la barrette entre au contrat (Ctrl+Z la rend à poser)' : '' };
    if (r.aPoser || !B.Q) return null;
    if (f === 'module') { const b = planDuRepere(r.nom).barrette.besoins, vs = (B.Q.famille ? [B.Q.famille] : famillesDeModules(app.norme)).flatMap(fa => variantesQuiLogent(b, app.norme, fa).slice(0, 12));
      return { valeur: B.main ? B.Q.reference : '', options: [['', 'automatique'], ...vs.map(m => [m.reference, m.variante + ' · ' + m.reference])] }; }
    if (f === 'norme') return { valeur: '', options: [['', 'automatique'], ...famillesDeModules(app.norme).map(fa => [fa, nomDeFamille(app.norme, fa)])] };
    return null; },
  ecrire: (r, f, v) => { if (f === 'rep') return v && v !== r.nom ? renommerRepere(r.nom, v, r) : false;
    if (f === 'module' || f === 'norme') { histPush((f === 'module' ? 'module de ' : 'norme de ') + r.nom); designer(r.nom, v); apresEdition(); return true; } return false; },
  rendre: (r, f) => { if (f !== 'module') return false; histPush('choix automatique'); designer(r.nom, ''); apresEdition(); return true; } };

/* ---- PRISES ------------------------------------------------------------- */
const prises = () => memo('prises', () => reperes().filter(r => r.genre === 'coupure'));
function infoPrise(nom) { return memo('pr|' + nom, () => { const P = planDuRepere(nom).coupure; if (!P) return null; const Q = P.plan, M = Q.modules[0];
  const am = Q.fils.filter(x => x.f.amont).map(x => x.f), av = Q.fils.filter(x => !x.f.amont).map(x => x.f);
  const hab = (cote, fils) => fils.length ? memo('habp|' + nom + '|' + cote, () => habillage(app.norme, fils, app.contrat.raccords.get(nom + '|' + cote), P.besoins.pn, Q.reference)) : null;
  return { P, Q, M, pris: P.points.length, total: M ? M.module.contacts.length : null, fiche: hab('fiche', am), embase: hab('embase', av) }; }); }
const motRaccord = h => !h ? '' : h.raccord === 'aucun' ? 'sans raccord' : (h.designation || h.raccord);
const COLONNES_PRISES = [COLONNES_REPERES[0], COLONNES_REPERES[1],
  { k: 'arrangement', t: 'Arrangement', cls: 'rc-c-pn', html: r => { const I = infoPrise(r.nom); return I ? valT('arrangement', I.Q.reference, { cls: 'rc-pn', ph: 'aucun arrangement' }) + (I.Q.main ? orig('main') + rond('arrangement', 'le choix automatique') : '') : rien; }, tri: r => (infoPrise(r.nom) || { Q: {} }).Q.reference || '', texte: r => (infoPrise(r.nom) || { Q: {} }).Q.reference || '' },
  { k: 'norme', t: 'Norme', html: r => { const I = infoPrise(r.nom); return I ? valT('norme', I.Q.famille ? nomDeFamille(app.norme, I.Q.famille) : '', { ph: '—' }) : rien; }, tri: r => (infoPrise(r.nom) || { Q: {} }).Q.famille || '', texte: r => { const I = infoPrise(r.nom); return I && I.Q.famille ? nomDeFamille(app.norme, I.Q.famille) : ''; } },
  { k: 'contacts', t: 'Contacts', cls: 'rc-c-n', html: r => { const I = infoPrise(r.nom); return I ? `<span class="rc-frac"><b class="rc-n">${I.pris}</b><i>/ ${I.total == null ? '?' : I.total}</i></span>` : rien; }, tri: r => (infoPrise(r.nom) || { pris: -1 }).pris, texte: r => { const I = infoPrise(r.nom); return I ? I.pris + ' / ' + (I.total ?? '?') : ''; } },
  { k: 'sexe', t: 'Sexe fiche · embase', html: r => { const I = infoPrise(r.nom); if (!I) return rien; const s = I.Q.sexe || sexeChoisi(r.nom); return I.Q.tableContacts ? valT('sexe', s === 'M' ? 'mâle · femelle' : s === 'F' ? 'femelle · mâle' : '', { ph: 'à choisir' }) : '<span class="rc-rien" title="La norme de cette prise ne juge pas le sexe">—</span>'; },
    tri: r => (infoPrise(r.nom) || { Q: {} }).Q.sexe || '', texte: r => (infoPrise(r.nom) || { Q: {} }).Q.sexe || '' },
  { k: 'fiche', t: 'Raccord fiche', cls: 'rc-c-pn', html: r => { const I = infoPrise(r.nom); return I && I.fiche ? `<span class="rc-id">${esc(motRaccord(I.fiche))}</span>` : rien; }, tri: r => motRaccord((infoPrise(r.nom) || {}).fiche), texte: r => motRaccord((infoPrise(r.nom) || {}).fiche) },
  { k: 'embase', t: 'Raccord embase', cls: 'rc-c-pn', html: r => { const I = infoPrise(r.nom); return I && I.embase ? `<span class="rc-id">${esc(motRaccord(I.embase))}</span>` : rien; }, tri: r => motRaccord((infoPrise(r.nom) || {}).embase), texte: r => motRaccord((infoPrise(r.nom) || {}).embase) },
  COLONNES_REPERES[8]];
const PRISES = { colonnes: COLONNES_PRISES, portee: true, lignes: prises, surFolio: surFolioRepere, exact: (r, f) => r.nom === f, choisie: choisieRepere, etat: r => etatDuNom(r.nom).niveau,
  puces: () => [['probleme', 'Problèmes', r => !!etatDuNom(r.nom).niveau]],
  choisir: r => choisirRepere(r.nom), survol: r => survolRepere(r.nom),
  editeur: (r, f) => { const I = infoPrise(r.nom); if (f === 'rep') return { valeur: r.nom }; if (!I) return null;
    if (f === 'arrangement') return { valeur: I.Q.main ? I.Q.reference : '', options: [['', 'automatique'], ...arrangementsQuiLogent(I.P.points, app.norme, I.Q.visee || I.Q.famille).slice(0, 12).map(m => [m.reference, m.variante + ' · ' + m.reference])] };
    if (f === 'norme') return { valeur: '', options: [['', 'automatique'], ...famillesDeModules(app.norme, 'connecteur').map(fa => [fa, nomDeFamille(app.norme, fa)])] };
    if (f === 'sexe') return I.Q.tableContacts ? { valeur: sexeChoisi(r.nom), options: [['', 'automatique'], ['F', 'fiche femelle · embase mâle'], ['M', 'fiche mâle · embase femelle']] } : null;
    return null; },
  ecrire: (r, f, v) => { if (f === 'rep') return v && v !== r.nom ? renommerRepere(r.nom, v, r) : false;
    if (f === 'arrangement' || f === 'norme') { histPush((f === 'norme' ? 'norme de ' : 'arrangement de ') + r.nom); designer(r.nom, v); apresEdition(); return true; }
    if (f === 'sexe') { if (v === sexeChoisi(r.nom)) return false; histPush('sexe des contacts de ' + r.nom); if (v) app.contrat.sexes.set(r.nom, v); else app.contrat.sexes.delete(r.nom); apresEdition(); return true; }
    return false; },
  rendre: (r, f) => { if (f !== 'arrangement') return false; histPush('choix automatique'); designer(r.nom, ''); apresEdition(); return true; } };

/* ---- FILS ET CÂBLES (un type de câble par ligne) ---------------------------- */
const cables = () => memo('cables', () => { const H = H_(), m = new Map();
  verite().forEach(l => { if (!liaisonComplete(l) || l.de === l.vers) return; const t = l.type || '';
    const e = m.get(t) || m.set(t, { k: 't:' + t, type: t, n: 0, L: 0, reelles: 0 }).get(t); e.n++; e.L += l.longueur > 0 ? l.longueur : H.longueur; if (l.longueur > 0) e.reelles++; });
  return [...m.values()].map(e => { const cab = e.type ? cableDuType(app.norme, e.type) : null, jauge = jaugeDuType(e.type), fn = e.type ? filDeNorme(app.norme, e.type, jauge) : null;
    return { ...e, cab, fam: e.type ? cableFamilleDe(app.norme, e.type) : null, jauge, fn, masse: cab && cab.masse != null ? cab.masse * e.L : null }; }); });
const etatCable = c => !c.type ? 'att' : !c.cab && !c.fn ? 'att' : '';
const COLONNES_CABLES = [
  { k: 'etat', t: '', titre: 'État', cls: 'rc-et', html: c => point(etatCable(c), !c.type ? 'fils sans type : leur jauge ne se vérifie pas' : 'inconnu de la base des câbles et de la norme des fils'), tri: c => etatCable(c) ? 0 : 1, texte: c => etatCable(c) ? 'à voir' : '' },
  { k: 'type', t: 'Type', cls: 'rc-c-pn', html: c => valT('type', c.type, { cls: 'rc-type', ph: 'sans type', titre: 'Écrire ici change le type de tous ses fils' }), tri: c => c.type, texte: c => c.type || 'sans type' },
  { k: 'jauge', t: 'Jauge', cls: 'rc-c-n', html: c => pastilleJauge(c.jauge), tri: c => c.jauge ?? 99, texte: c => c.jauge != null ? c.jauge + ' AWG' : '' },
  { k: 'nature', t: 'Nature', html: c => c.cab ? `<span class="rc-mot">${esc([(c.cab.brins > 1 ? c.cab.brins + ' brins' : '1 brin') + (c.cab.blindage ? ' + blindage' : ''), c.cab.nature, c.fam && c.fam.conducteur && c.fam.conducteur !== 'cuivre' ? c.fam.conducteur : ''].filter(Boolean).join(' · '))}</span>` : rien,
    tri: c => c.cab ? c.cab.brins || 0 : -1, texte: c => c.cab ? [c.cab.brins + ' brins', c.cab.blindage ? 'blindage' : '', c.cab.nature].filter(Boolean).join(' ') : '' },
  { k: 'diametre', t: 'Ø', cls: 'rc-c-n', html: c => c.cab && c.cab.diametre != null ? `<div class="rc-num"><b class="rc-n">${fmt(c.cab.diametre, 2)}</b>${unite('mm')}</div>` : rien, tri: c => c.cab && c.cab.diametre != null ? c.cab.diametre : -1, texte: c => c.cab && c.cab.diametre != null ? fmt(c.cab.diametre, 2) + ' mm' : '' },
  { k: 'resistance', t: 'mΩ/m', cls: 'rc-c-n', html: c => { const R = c.cab && c.cab.resistance != null ? c.cab.resistance : c.fn && c.fn.resistance != null ? c.fn.resistance : null; return R != null ? `<b class="rc-n">${fmt(R, 2)}</b>` : rien; },
    tri: c => (c.cab && c.cab.resistance) ?? (c.fn && c.fn.resistance) ?? -1, texte: c => String((c.cab && c.cab.resistance) ?? (c.fn && c.fn.resistance) ?? '') },
  { k: 'gm', t: 'g/m', cls: 'rc-c-n', html: c => c.cab && c.cab.masse != null ? `<b class="rc-n">${fmt(c.cab.masse, 2)}</b>` : rien, tri: c => c.cab && c.cab.masse != null ? c.cab.masse : -1, texte: c => c.cab && c.cab.masse != null ? fmt(c.cab.masse, 2) : '' },
  { k: 'n', t: 'Fils', cls: 'rc-c-n', html: c => `<b class="rc-n">${c.n}</b>`, tri: c => c.n, texte: c => String(c.n) },
  { k: 'longueur', t: 'Longueur totale', cls: 'rc-c-n', html: c => `<div class="rc-num"><b class="rc-n">${fmt(c.L, 1)}</b>${unite('m')}${c.reelles < c.n ? `<i class="rc-o rc-hyp" title="${escA(pluriel(c.n - c.reelles, 'fil') + ' sans longueur au retest : l’hypothèse')}">~</i>` : ''}</div>`, tri: c => c.L, texte: c => fmt(c.L, 1) + ' m' },
  { k: 'masse', t: 'Masse', cls: 'rc-c-n', html: c => c.masse != null ? `<div class="rc-num"><b class="rc-n">${fmt(c.masse, 0)}</b>${unite('g')}</div>` : rien, tri: c => c.masse ?? -1, texte: c => c.masse != null ? fmt(c.masse, 0) + ' g' : '' },
  { k: 'source', t: 'Source', html: c => `<span class="rc-mot${etatCable(c) ? ' att' : ''}">${c.cab ? 'base des câbles' : c.fn ? 'EN 2853 (la jauge seule)' : c.type ? 'inconnu' : '—'}</span>`, tri: c => c.cab ? 0 : c.fn ? 1 : 2, texte: c => c.cab ? 'base des câbles' : c.fn ? 'EN 2853' : 'inconnu' },
  { k: 'aller', t: '', cls: 'rc-c-aller', html: () => '<button type="button" class="rc-lien" data-voir-fils="1">ses fils</button>', texte: () => '' }];
const CABLES = { colonnes: COLONNES_CABLES, lignes: cables, etat: etatCable, choisie: () => false,
  puces: () => [['inconnus', 'Inconnus de la base', c => !!etatCable(c), '', '', 'Les types que la base des câbles ne connaît pas']],
  voirFils: c => montrerLiaisons(c.type),
  editeur: (c, f) => f === 'type' ? { valeur: c.type, liste: 'types', aide: 'tous les fils de ce type le prennent' } : null,
  ecrire: (c, f, v) => { if (f !== 'type' || v === c.type) return false; const xs = verite().filter(l => liaisonComplete(l) && l.de !== l.vers && (l.type || '') === c.type).map(l => [l, 'type']);
    return changerLiaisons(xs, v, 'type ' + (c.type || 'vide') + ' → ' + (v || 'vide')); } };
/* L'onglet Liaisons, filtré sur ce qu'on cherche (un type, un contact). */
function montrerLiaisons(q) { const b = app.base; b.filtreAuto = false; changerOnglet('liaisons', true); b.filtre = q || ''; b.portee = 'tout'; memoriserBase(); if (b.ouvert) rendreBase(true); else ouvrirBase(); }

/* ---- CONTACTS (une référence à sertir par ligne) ----------------------------- */
const contacts = () => memo('contacts', () => { const m = new Map(), V = verite(), T = normeDesModules(app.norme).contacts || [];
  reperesDe(V).forEach(r => planDuRepere(r).fils.forEach((x, l) => { const force = l.de === r ? l.contactDe : l.vers === r ? l.contactVers : '', ref = force || (x.sertir && x.sertir.reference); if (!ref) return;
    const acc = force ? '' : (x.sertir.accessoire || ''), k = ref + '\u0001' + acc, e = m.get(k) || m.set(k, { k: 'c:' + ref + '|' + acc, ref, acc, n: 0, ou: new Set(), tailles: new Set(), main: 0 }).get(k);
    e.n++; e.ou.add(r); if (x.contact && x.contact.taille) e.tailles.add(String(x.contact.taille)); if (force) e.main++; }));
  return [...m.values()].map(e => { const t = T.find(c => c.reference === e.ref); return { ...e, ou: [...e.ou].sort(triNaturel), tailles: [...e.tailles].sort(triNaturel), norme: t ? t.famille : '', sexe: t ? t.sexe : '' }; })
    .sort((a, b) => b.n - a.n || triNaturel(a.ref, b.ref)); });
const COLONNES_CONTACTS = [
  { k: 'ref', t: 'Contact', cls: 'rc-c-pn', html: c => `<span class="rc-id rc-fort">${esc(c.ref)}</span>${c.main ? orig('main') : ''}`, tri: c => c.ref, texte: c => c.ref },
  { k: 'acc', t: 'Fourreau', cls: 'rc-c-pn', html: c => c.acc ? `<span class="rc-id">${esc(c.acc)}</span>` : rien, tri: c => c.acc, texte: c => c.acc },
  { k: 'n', t: 'Quantité', cls: 'rc-c-n', html: c => `<b class="rc-n">${c.n}</b>`, tri: c => c.n, texte: c => String(c.n) },
  { k: 'ou', t: 'Où', cls: 'rc-c-texte', html: c => `<span class="rc-ou" title="${escA(c.ou.join(', '))}">${esc(c.ou.length > 5 ? c.ou.slice(0, 5).join(', ') + ' … (' + c.ou.length + ')' : c.ou.join(', '))}</span>`, tri: c => c.ou.length, texte: c => c.ou.join(' ') },
  { k: 'taille', t: 'Taille', cls: 'rc-c-n', html: c => c.tailles.length ? `<b class="rc-n">${esc(c.tailles.join(', '))}</b>` : rien, tri: c => +c.tailles[0] || 0, texte: c => c.tailles.join(' ') },
  { k: 'sexe', t: 'Sexe', html: c => c.sexe ? `<span class="rc-mot">${c.sexe === 'M' ? 'mâle' : 'femelle'}</span>` : rien, tri: c => c.sexe, texte: c => c.sexe },
  { k: 'norme', t: 'Norme', html: c => c.norme ? `<span class="rc-mot">${esc(nomDeFamille(app.norme, c.norme) || c.norme)}</span>` : rien, tri: c => c.norme, texte: c => c.norme },
  { k: 'aller', t: '', cls: 'rc-c-aller', html: () => '<button type="button" class="rc-lien" data-voir-fils="1">ses fils</button>', texte: () => '' }];
const CONTACTS = { colonnes: COLONNES_CONTACTS, lignes: contacts, etat: () => '', choisie: () => false, exact: (c, f) => c.ou.includes(f),
  puces: () => [['main', 'Écrits à la main', c => c.main > 0]], voirFils: c => montrerLiaisons(c.ref) };

/* ---- RACCORDS (un connecteur, ou un côté de prise, par ligne) ---------------- */
const raccords = () => memo('raccords', () => { const out = [];
  reperes().forEach(rp => { const r = rp.nom; if (rp.aPoser || estBarrette(r)) return; const B = baseRepere(r);
    if (estCoupure(r)) { if (!coupureEnModules(r)) return; const fs = [...B.b.parBorne.values()].flat();
      [['fiche', true], ['embase', false]].forEach(([c, am]) => { if (fs.some(f => !!f.amont === am)) out.push({ k: r + '|' + c, nom: r, c, plans: rp.plans, pn: B.b.pn, prise: am ? 'amont' : 'aval' }); }); return; }
    B.cs.forEach(c => { const fils = c.bornes.flatMap(bo => B.b.parBorne.get(bo) || []); if (fils.length) out.push({ k: r + '|' + c.nom, nom: r, c: c.nom, plans: rp.plans, pn: c.pn, fils }); }); });
  return out; });
/* L'habillage d'un connecteur ou d'un côté de prise, comme la fiche le calcule (l'arrangement retenu, les fils posés). */
const habDe = x => memo('hab|' + x.k, () => { try {
  if (x.prise) { const I = infoPrise(x.nom); return I ? I[x.c] : null; }
  const k = planDuRepere(x.nom).cavites.find(c => c.nom === x.c), ref = k && k.plan.modules[0] ? k.plan.modules[0].reference : '';
  return habillage(app.norme, x.fils, app.contrat.raccords.get(x.k), x.pn, ref); } catch (_) { return null; } });
const CHOIX = { blindage: [['NO', 'sans reprise'], ['GND', 'sur le corps'], ['BLI', 'par cosse'], ['CONTACT', 'sur un contact']], etanche: [['false', 'pas étanche'], ['true', 'étanche']],
  orientation: [['droit', 'droit'], ['coudé', 'coudé']], gaine: [['', 'sans gaine'], ['HFA', 'gaine HFA'], ['NOMEX', 'gaine Nomex']] };
const motChoix = (champ, v) => (CHOIX[champ].find(([x]) => x === String(v)) || CHOIX[champ][0])[1];
const COLONNES_RACCORDS = [
  { k: 'etat', t: '', titre: 'État', cls: 'rc-et', html: x => { const h = habDe(x); return point(h && h.manquants.length ? 'att' : '', h ? h.manquants.join('\n') : ''); }, tri: x => { const h = habDe(x); return h && h.manquants.length ? 0 : 1; }, texte: x => { const h = habDe(x); return h && h.manquants.length ? 'à compléter' : ''; } },
  { k: 'rep', t: 'Repère', cls: 'rc-c-rep', html: x => `<span class="rc-id rc-fort">${esc(x.nom)}</span>`, tri: x => x.nom, texte: x => x.nom },
  { k: 'conn', t: 'Connecteur', cls: 'rc-c-pn', html: x => `<div class="rc-bout"><span class="rc-rep"><b class="rc-id">${esc(x.c)}</b></span>${x.pn ? `<span class="rc-sous"><span class="rc-pn">${esc(x.pn)}</span></span>` : ''}</div>`, tri: x => x.c, texte: x => x.c + ' ' + (x.pn || '') },
  { k: 'taille', t: 'Taille · filetage', html: x => { const h = habDe(x); return h && h.taille ? `<span class="rc-mot"><b>${esc(h.taille)}</b>${h.filetage ? ' · ' + esc(h.filetage.filetage) : ''}</span>` : rien; }, tri: x => (habDe(x) || {}).taille || '', texte: x => { const h = habDe(x); return h && h.taille ? h.taille + (h.filetage ? ' ' + h.filetage.filetage : '') : ''; } },
  { k: 'choix', t: 'Choix', html: x => { const c = (habDe(x) || { choix: {} }).choix; return `<div class="rc-choix">${['orientation', 'blindage', 'etanche', 'gaine'].map(k => valT(k, motChoix(k, c[k]), { titre: 'Double-clic pour changer : la fiche et la nomenclature suivent' })).join('<i class="rc-pt">·</i>')}</div>`; },
    tri: x => { const c = (habDe(x) || { choix: {} }).choix; return [c.orientation, c.blindage, c.etanche, c.gaine].join(' '); }, texte: x => { const c = (habDe(x) || { choix: {} }).choix; return ['orientation', 'blindage', 'etanche', 'gaine'].map(k => motChoix(k, c[k])).join(' · '); } },
  { k: 'raccord', t: 'Raccord', cls: 'rc-c-pn', html: x => { const h = habDe(x); if (!h) return rien; return h.sansRaccord ? `<span class="rc-mot" title="${escA(h.pourquoi || '')}">sans raccord</span>`
      : `<span class="rc-id${h.designation ? ' rc-fort' : ''}" title="${escA(h.pourquoi || '')}">${esc(h.designation || h.raccord)}</span>${h.statut && h.statut !== 'vérifié' ? `<i class="rc-o" title="${escA(SENS_STATUT_RACCORD[h.statut] || '')}">${esc(h.statut)}</i>` : ''}`; },
    tri: x => motRaccord(habDe(x)), texte: x => motRaccord(habDe(x)) },
  { k: 'bandit', t: 'Band-it', cls: 'rc-c-pn', html: x => { const h = habDe(x); return h && h.bandit ? (h.collier ? `<span class="rc-id">${esc(h.collier.reference)}</span>` : '<span class="rc-mot att">aucun ne va</span>') : rien; }, tri: x => { const h = habDe(x); return h && h.collier ? h.collier.reference : ''; }, texte: x => { const h = habDe(x); return h && h.collier ? h.collier.reference : ''; } },
  { k: 'manchon', t: 'Manchon', cls: 'rc-c-pn', html: x => { const h = habDe(x); return h && h.manchon ? (h.manchonRef ? `<span class="rc-id">${esc(h.manchonRef.designation)}</span>` : '<span class="rc-mot att">aucun ne va</span>') : rien; }, tri: x => { const h = habDe(x); return h && h.manchonRef ? h.manchonRef.designation : ''; }, texte: x => { const h = habDe(x); return h && h.manchonRef ? h.manchonRef.designation : ''; } },
  { k: 'gaine', t: 'Gaine', cls: 'rc-c-pn', html: x => { const h = habDe(x); return h && h.choix.gaine ? (h.gaine ? `<span class="rc-id">${esc(h.gaine.reference)}</span>` : '<span class="rc-mot att">aucune ne va</span>') : rien; }, tri: x => { const h = habDe(x); return h && h.gaine ? h.gaine.reference : ''; }, texte: x => { const h = habDe(x); return h && h.gaine ? h.gaine.reference : ''; } },
  { k: 'toron', t: 'Toron Ø', cls: 'rc-c-n', html: x => { const h = habDe(x); return h && h.faisceau.diametre != null ? `<div class="rc-num"><b class="rc-n">${fmt(h.faisceau.diametre, 1)}</b>${unite('mm')}${h.faisceau.complet ? '' : '<i class="rc-o" title="Un type de câble inconnu de la base : le toron est sous-estimé">?</i>'}</div>` : rien; },
    tri: x => { const h = habDe(x); return h && h.faisceau.diametre != null ? h.faisceau.diametre : -1; }, texte: x => { const h = habDe(x); return h && h.faisceau.diametre != null ? fmt(h.faisceau.diametre, 1) + ' mm' : ''; } },
  { k: 'folio', t: 'Folio', cls: 'rc-c-folio', option: true, html: x => x.plans.length ? `<span class="rc-folios">${esc(listeFolios(x.plans))}</span>` : rien, tri: x => x.plans[0] || '', texte: x => x.plans.join(' ') }];
const RACCORDS = { colonnes: COLONNES_RACCORDS, portee: true, lignes: raccords, surFolio: x => app.plan === '*' || x.plans.includes(app.plan), exact: (x, f) => x.nom === f,
  choisie: x => !!app.cible && app.cible.type === 'bloc' && app.cible.nom === x.nom, etat: x => { const h = habDe(x); return h && h.manquants.length ? 'att' : ''; },
  puces: () => [['completer', 'À compléter', x => { const h = habDe(x); return !!(h && h.manquants.length); }, '', '', 'Ce que la norme ne dit pas encore (une référence, une cote)']],
  choisir: x => choisirRepere(x.nom), survol: x => survolRepere(x.nom),
  editeur: (x, f) => CHOIX[f] ? { valeur: String((habDe(x) || { choix: {} }).choix[f] ?? ''), options: CHOIX[f] } : null,
  ecrire: (x, f, v) => { if (!CHOIX[f]) return false; const o = { ...(app.contrat.raccords.get(x.k) || {}) }, w = v === 'true' ? true : v === 'false' ? false : v; if (String((habDe(x) || { choix: {} }).choix[f]) === String(w)) return false;
    histPush('raccord de ' + x.k); o[f] = w; app.contrat.raccords.set(x.k, o); apresEdition(); return true; } };

/* ---- PROBLÈMES (un verdict du contrôle par ligne) ----------------------------- */
/* Ce qu'il faut faire, et où la fiche le montre : lu dans la phrase du verdict (le contrôle ne le dit pas encore). */
function remede(x) { const t = x.texte, ideal = /l’idéal est un ([\d,.]+ A)/.exec(t) || /un ([\d,.]+ A) suffirait/.exec(t);
  if (/^à poser sur/.test(t)) return ['Poser la barrette au contrat : lui donner son vrai repère (onglet Barrettes, « Poser »)', 'identite'];
  if (/profil de charge est à renseigner/.test(t)) return ['Renseigner le profil de charge du disjoncteur : l’outil trouve le calibre', 'profil'];
  if (/déclenche|aucun calibre/.test(t)) return [ideal ? 'Retenir ' + ideal[1] + ' (onglet Disjoncteurs, « Retenir »)' : 'Alléger le profil ou changer de famille de disjoncteur', 'calibre'];
  if (/suffirait|touche la courbe|l’idéal est/.test(t)) return [ideal ? 'Retenir ' + ideal[1] : 'Retenir l’idéal', 'calibre'];
  if (/sélectivité/.test(t)) return ['L’amont au moins au double de l’aval : changer l’un des deux calibres', 'calibre'];
  if (/chute en ligne/.test(t)) return [/hypothèse/.test(t) ? 'Écrire les longueurs mesurées (onglet Liaisons, puce « Longueur d’hypothèse »)' : 'Une jauge plus forte, ou un chemin plus court', 'chute'];
  if (/maximum de l’AC|table 11-3/.test(t)) return ['Un calibre plus petit, ou un fil plus gros (la table 11-3 de l’AC 43.13-1B)', 'fils'];
  if (/admis|pas protégé/.test(t)) return ['Un fil plus gros (onglet Liaisons, colonne Jauge · câble), ou un calibre plus petit', 'fils'];
  if (/contact taille|dépasse le contact/.test(t)) return ['Un contact plus gros, ou un courant moindre', 'contacts'];
  if (/refusé|aucun contact|jauge/.test(t)) return ['Changer le type du fil, ou l’arrangement du connecteur (fiche, « Changer »)', 'contacts'];
  if (/aucun arrangement|aucun module|ne loge/.test(t)) return ['Choisir un autre arrangement ou une autre norme (fiche, « Changer »)', 'connecteur'];
  if (/famille de disjoncteur inconnue/.test(t)) return ['Ajouter la famille du part number (Normes › Familles de disjoncteurs)', 'identite'];
  if (/type de fil inconnu|types de fil inconnus/.test(t)) return ['Corriger le type, ou ajouter le câble à la base (Normes › Câbles)', ''];
  if (/sans type/.test(t)) return ['Écrire le type de chaque fil (onglet Liaisons, trier par Jauge · câble)', ''];
  if (/incomplète/.test(t)) return ['Écrire « de » et « vers » (onglet Liaisons, trier par De)', ''];
  if (/ambiante/.test(t)) return ['Un câble de plus haute température, ou revoir l’ambiante (menu ⋮ → Hypothèses)', ''];
  if (/CCA/.test(t)) return ['Qualifier le contact pour l’aluminium cuivré, ou un câble cuivre', 'contacts'];
  return ['Ouvrir la fiche', 'problemes']; }
const problemes = () => memo('problemes:' + RECAP.itemsN, () => (CONTROLE.items || []).map((x, k) => { const [que, sec] = remede(x); return { k: 'p' + k, x, idx: k, que, sec, plans: x.plan && x.plan !== '*' ? [x.plan] : [] }; }));
const COLONNES_PROBLEMES = [
  { k: 'niveau', t: 'Niveau', cls: 'rc-c-niveau', html: p => `<span class="rc-niveau ${p.x.niveau}">${point(p.x.niveau)}${p.x.niveau === 'ko' ? 'problème' : 'à voir'}</span>`, tri: p => p.x.niveau === 'ko' ? 0 : 1, texte: p => p.x.niveau === 'ko' ? 'problème' : 'à voir' },
  { k: 'objet', t: 'Objet', cls: 'rc-c-rep', html: p => p.x.nom ? `<span class="rc-id rc-fort">${esc(p.x.nom)}</span>` : '<span class="rc-mot">le contrat</span>', tri: p => p.x.nom || '', texte: p => p.x.nom || 'contrat' },
  { k: 'folio', t: 'Folio', cls: 'rc-c-folio', html: p => p.plans.length ? `<span class="rc-folios">f. ${esc(p.plans[0])}</span>` : rien, tri: p => p.plans[0] || '', texte: p => p.plans.join(' ') },
  { k: 'texte', t: 'Ce qui ne va pas', cls: 'rc-c-phrase', html: p => `<span class="rc-phrase">${insecable(esc(p.x.texte))}</span>`, tri: p => p.x.texte, texte: p => p.x.texte },
  { k: 'que', t: 'Ce qu’il faut faire', cls: 'rc-c-phrase', html: p => `<span class="rc-phrase rc-fort">${esc(p.que)}</span>`, tri: p => p.que, texte: p => p.que },
  { k: 'section', t: 'Dans la fiche', html: p => p.sec && p.x.nom ? `<span class="rc-mot">${esc(SECTIONS[p.sec] || p.sec)}</span>` : rien, tri: p => p.sec, texte: p => SECTIONS[p.sec] || '' },
  { k: 'aller', t: '', cls: 'rc-c-aller', html: () => '<button type="button" class="rc-lien" data-aller="1">Aller</button>', texte: () => '' }];
const PROBLEMES = { colonnes: COLONNES_PROBLEMES, portee: true, lignes: problemes, surFolio: p => app.plan === '*' || !p.plans.length || p.plans.includes(app.plan), exact: (p, f) => p.x.nom === f,
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
function normes() { return memo('normes', () => { const V = verite(), fils = V.filter(l => liaisonComplete(l) && l.de !== l.vers && l.type).length, R = reperes();
  const n = g => R.filter(r => r.genre === g).length, connecteurs = raccords().length, cb = n('cb'), barr = n('barrette'), pr = n('coupure');
  const objets = { fils: [fils, 'fil'], cables: [fils, 'fil'], cablesFamilles: [fils, 'fil'], reseau: [cb ? fils : 0, 'fil'], declassements: [fils, 'fil'],
    disjoncteurs: [cb, 'disjoncteur'], protections: [cb, 'disjoncteur'], disjoncteursFamilles: [cb, 'disjoncteur'], chutesDisjoncteurs: [cb, 'disjoncteur'], calibrations: [0, ''],
    'modules:barrette': [barr, 'barrette'], 'tailles:barrette': [barr, 'barrette'], 'familles:barrette': [barr, 'barrette'], accessoires: [0, ''],
    'modules:connecteur': [connecteurs, 'connecteur'], 'tailles:connecteur': [connecteurs, 'connecteur'], 'familles:connecteur': [connecteurs + pr, 'connecteur'],
    contacts: [connecteurs, 'connecteur'], resistancesContacts: [cb ? connecteurs : 0, 'connecteur'], courantsContacts: [cb ? connecteurs : 0, 'connecteur'],
    raccords: [connecteurs, 'connecteur'], entrees: [connecteurs, 'connecteur'], classes: [connecteurs, 'connecteur'], manchons: [connecteurs, 'connecteur'], gaines: [connecteurs, 'connecteur'], colliers: [connecteurs, 'connecteur'], filetages: [connecteurs, 'connecteur'] };
  return DOMAINES_NORMES.flatMap(d => d.vues.map(v => { const T = vueDe(v).table, o = objets[v] || [0, '']; let lignes = 0; try { lignes = lignesDeVue(v).lignes.length; } catch (_) { }
    return { k: 'n:' + v, v, T, domaine: d.titre, titre: vueDe(v).titre || TITRES_NORME[T] || v, norme: normeCourte(v), juge: phrase((FICHES_TABLES[T] || {}).sert), n: o[0], mot: o[1], lignes, modifiee: tableModifiee(T) }; })); }); }
const COLONNES_NORMES = [
  { k: 'norme', t: 'Norme', cls: 'rc-c-pn', html: x => `<span class="rc-id rc-fort">${esc(x.norme)}</span>`, tri: x => x.norme, texte: x => x.norme },
  { k: 'titre', t: 'Table', html: x => `<div class="rc-deux-lignes"><span class="rc-mot rc-fort">${esc(x.titre)}</span><small class="rc-nat">${esc(x.domaine)}</small></div>`, tri: x => x.titre, texte: x => x.titre + ' ' + x.domaine },
  { k: 'juge', t: 'Ce qu’elle juge', cls: 'rc-c-phrase', html: x => `<span class="rc-phrase">${esc(x.juge)}</span>`, tri: x => x.juge, texte: x => x.juge },
  { k: 'objets', t: 'Objets jugés', cls: 'rc-c-n', html: x => x.n ? `<span class="rc-frac"><b class="rc-n">${x.n}</b><i>${esc(pluriel(x.n, x.mot).replace(/^\d+ /, ''))}</i></span>` : rien, tri: x => x.n, texte: x => x.n ? pluriel(x.n, x.mot) : '' },
  { k: 'lignes', t: 'Lignes', cls: 'rc-c-n', html: x => `<b class="rc-n">${x.lignes}</b>`, tri: x => x.lignes, texte: x => String(x.lignes) },
  { k: 'origine', t: 'Origine', html: x => `<span class="rc-mot">${x.modifiee ? 'modifiée' : 'embarquée'}</span>${x.modifiee ? orig('main') : ''}`, tri: x => x.modifiee ? 0 : 1, texte: x => x.modifiee ? 'modifiée' : 'embarquée' },
  { k: 'aller', t: '', cls: 'rc-c-aller', html: () => '<button type="button" class="rc-lien" data-aller="1">La table</button>', texte: () => '' }];
const NORMES_ONGLET = { colonnes: COLONNES_NORMES, lignes: () => normes().filter(x => x.n || x.modifiee), etat: () => '', choisie: () => false,
  puces: () => [['modifiees', 'Modifiées', x => x.modifiee]], aller: x => ficheNormes({ table: x.v }) };

const TABS = { liaisons: LIAISONS, equipements: EQUIPEMENTS, disjoncteurs: DISJONCTEURS, barrettes: BARRETTES, prises: PRISES, cables: CABLES, contacts: CONTACTS, raccords: RACCORDS, problemes: PROBLEMES, normes: NORMES_ONGLET };
const onglet = () => TABS[app.base.onglet] || LIAISONS;

/* ---- les lignes d'un onglet : la portée, la recherche, les puces, le tri ------ */
const portee = O => !!O.portee && avecPortee();
const colonnesVues = O => { const choix = app.base.colonnes[app.base.onglet] || {};
  return O.colonnes.filter(c => (!c.si || c.si()) && (c.k in choix ? choix[c.k] : !c.option)); };
const pucesDe = O => (O.puces ? O.puces() : []).map(([k, t, test, avant, groupe, aide, lourd]) => ({ k, t, test, avant: avant || '', groupe: groupe || k, aide: aide || '', lourd: !!lourd }));
function pucesActives(O) { const P = pucesDe(O), on = new Set(app.base.puces[app.base.onglet] || []); return P.filter(p => on.has(p.k) && !(O.exclusif && p.k === O.exclusif + ':tous')); }
function lignesDe(O, sansPuces) { const b = app.base, f = b.filtre.trim().toLowerCase();
  let L = O.lignes();
  if (portee(O) && b.portee === 'folio' && O.surFolio) L = L.filter(O.surFolio);
  // un bloc choisi sur le plan filtre sur lui-même, là où il veut dire quelque chose (pas les câbles, ni les normes)
  if (f && b.filtreAuto) { if (O.exact) L = L.filter(r => O.exact(r, b.filtre.trim())); }
  else if (f) L = L.filter(r => O.colonnes.some(c => c.texte && String(c.texte(r)).toLowerCase().includes(f)));
  if (!sansPuces) { const A = pucesActives(O), G = new Map(); A.forEach(p => (G.get(p.groupe) || G.set(p.groupe, []).get(p.groupe)).push(p)); G.forEach(ps => { L = L.filter(r => ps.some(p => p.test(r))); }); }
  const tri = b.tri, c = tri && O.colonnes.find(x => x.k === tri.k && x.tri);
  if (c) { const v = new Map(L.map(r => [r, c.tri(r)]));
    L = L.slice().sort((a, z) => { const x = v.get(a), y = v.get(z), vx = x == null || x === '', vy = y == null || y === ''; if (vx || vy) return vx - vy;
      return tri.sens * (typeof x === 'number' && typeof y === 'number' ? x - y : triNaturel(x, y)); }); }
  return L; }
// le tableau de la vue liaisons : [[liaison, rang]] (08 : un fil choisi sur le plan cherche sa ligne)
function lignesVisibles() { return lignesDe(LIAISONS).map(r => [r.l, r.i]); }
const groupesParFolio = () => app.base.onglet === 'liaisons' && avecPortee() && app.base.portee === 'tout' && !app.base.tri && !app.base.filtre.trim() && !pucesActives(LIAISONS).length;

/* ---- les comptes et l'état de chaque onglet ------------------------------------ */
function compteOnglet(k) { const items = CONTROLE.items || [];
  const etatNoms = rs => niveauDe(rs.flatMap(r => itemsParNom().get(r.nom) || []));
  try { switch (k) {
    case 'liaisons': { const V = verite(), C = itemsParCable(); return { n: String(V.length), etat: V.some(l => (C.get(l.cable) || []).some(x => x.niveau === 'ko')) ? 'ko' : items.some(x => x.tableau != null) || V.some(l => C.has(l.cable)) ? 'att' : '' }; }
    case 'equipements': { const R = reperes(); return { n: String(R.length), etat: etatNoms(R) }; }
    case 'disjoncteurs': { const R = disjoncteurs(); return { n: String(R.length), etat: etatNoms(R) }; }
    case 'barrettes': { const R = barrettes(), a = R.filter(r => r.aPoser).length; return { n: a ? (R.length - a) + ' + ' + a : String(R.length), etat: etatNoms(R), titre: a ? pluriel(R.length - a, 'posée') + ', ' + a + ' à poser' : '' }; }
    case 'prises': { const R = prises(); return { n: String(R.length), etat: etatNoms(R) }; }
    case 'cables': { const C = cables(); return { n: String(C.length), etat: C.some(etatCable) ? 'att' : '' }; }
    case 'contacts': return RECAP.memo.has('contacts') ? { n: String(contacts().length), etat: '' } : { n: '', etat: '' };
    case 'raccords': return { n: String(raccords().length), etat: '' };
    case 'problemes': { const ko = items.filter(x => x.niveau === 'ko').length, att = items.length - ko; return { n: ko && att ? ko + ' · ' + att : String(items.length), etat: ko ? 'ko' : att ? 'att' : '', titre: pluriel(ko, 'problème') + ', ' + att + ' à voir' }; }
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
  RECAP.rendu = cle; rendreTete(O); rendreOnglets(); rendreOutils(O); rendreTable(O, C);
  if (focus && (b.focus || avaitFocus)) { b.focus = null; const el = elementDe(focus); if (el) { try { el.focus({ preventScroll: true }); } catch (_) { el.focus(); } el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } }
  defiler(); }
function rafraichirBase() { if (app.base.enSaisie || app.base.edition) { app.base.sale = true; return; } rendreBase(); }
function defiler() { const b = app.base; if (!b.defiler) return; b.defiler = false; const tr = $('ba-tbody').querySelector('tr.on'); if (tr && tr.scrollIntoView) { try { tr.scrollIntoView({ block: 'center' }); } catch (_) { } } }
function rendreTete(O) { const b = app.base, n = app.contrat.liaisons.length, P = plans();
  $('ba-contexte').textContent = n ? [app.nom || 'Sans nom', plurielLie(verite().length, 'liaison'), plurielLie(reperes().length, 'repère'), P.length > 1 ? plurielLie(P.length, 'folio') : ''].filter(Boolean).join(' · ') : '';
  $('ba-taille').querySelectorAll('[data-taille]').forEach(x => x.setAttribute('aria-pressed', String(b.ouvert && x.dataset.taille === b.taille)));
  $('ba-ajouter').hidden = !O.ajout; if (O.ajout) { $('ba-ajouter-t').textContent = O.ajout; $('ba-ajouter').title = O.aide || ''; } }
/* Le compte des contacts demande les plans de tous les repères : il se fait quand la page se repose, l'onglet ouvert
   d'abord. Sous pilote automatique (les bancs mesurent les gestes), il attend qu'on ouvre l'onglet. */
const COMPTE = { attente: 0, actif: !(typeof navigator !== 'undefined' && navigator.webdriver) };
function compterAuRepos() { if (COMPTE.attente || !COMPTE.actif || RECAP.memo.has('contacts')) return;
  const go = () => { COMPTE.attente = 0; if (!app.base.ouvert || $('base').hidden || app.base.edition) return; assurerModele(); contacts(); rendreOnglets(); };
  COMPTE.attente = window.requestIdleCallback ? requestIdleCallback(go, { timeout: 2000 }) : setTimeout(go, 400); }
function arreterCompte() { if (!COMPTE.attente) return; if (window.cancelIdleCallback) cancelIdleCallback(COMPTE.attente); clearTimeout(COMPTE.attente); COMPTE.attente = 0; }
function rendreOnglets() { const b = app.base; compterAuRepos();
  $('ba-onglets').innerHTML = ONGLETS.map(([k, t]) => { const c = compteOnglet(k), on = k === b.onglet;
    return `<button role="tab" class="rc-onglet" data-onglet="${k}" aria-selected="${on}" tabindex="${on ? 0 : -1}"${c.titre ? ` title="${escA(c.titre)}"` : ''}>${c.etat ? `<i class="rc-carre ${c.etat}" aria-label="${c.etat === 'ko' ? 'un problème' : 'à voir'}"></i>` : ''}<span>${esc(t)}</span>${c.n ? `<small>${esc(c.n)}</small>` : ''}</button>`; }).join(''); }
function rendreOutils(O) { const b = app.base, pt = portee(O);
  $('ba-portee').hidden = !pt;
  if (pt) { const tous = O.lignes(); $('ba-n-folio').textContent = tous.filter(O.surFolio).length; $('ba-n-tout').textContent = tous.length; $('ba-lib-folio').textContent = 'Folio ' + app.plan;
    $('ba-portee').querySelectorAll('[data-portee]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.portee === b.portee))); }
  const fi = $('ba-filtre'); if (fi.value !== b.filtre && document.activeElement !== fi) fi.value = b.filtre; $('ba-vider').hidden = !b.filtre;
  const on = new Set(b.puces[b.onglet] || []), P = pucesDe(O), base = P.length ? lignesDe(O, true) : [], petit = base.length <= PAQUET * 2;
  const exclusifTous = O.exclusif && !P.some(p => p.groupe === O.exclusif && p.k !== O.exclusif + ':tous' && on.has(p.k));
  // une puce qui lit les plans (l'état, les contacts) se compte tout de suite sur une petite portée, au repos sur une grande
  $('ba-puces').innerHTML = P.map(p => { const presse = p.k === O.exclusif + ':tous' ? exclusifTous : on.has(p.k), n = p.lourd && !petit ? '' : base.filter(p.test).length;
    return `<button class="rc-chip" data-puce="${escA(p.k)}" aria-pressed="${presse}"${p.aide ? ` title="${escA(p.aide)}"` : ''}>${p.avant}<span>${esc(p.t)}</span><small>${n}</small></button>`; }).join('');
  if (!petit && P.some(p => p.lourd) && COMPTE.actif) { const jeton = RECAP.jeton, go = () => { if (jeton !== RECAP.jeton || $('base').hidden || app.base.edition) return;
      P.filter(p => p.lourd).forEach(p => { const x = $('ba-puces').querySelector(`[data-puce="${CSS.escape(p.k)}"] small`); if (x) x.textContent = base.filter(p.test).length; }); };
    if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 3000 }); else setTimeout(go, 500); } }
/* Ce que l'onglet montre : en tête ce qu'on vient d'ajouter (une liaison, un équipement) et la ligne d'un équipement à
   nommer ; puis les lignes de la portée, de la recherche et des puces, triées. */
function lignesMontrees(O) { const b = app.base, tous = O.lignes(), tete = [];
  if (b.onglet === 'liaisons') { b.neuves = b.neuves.filter(l => verite().includes(l)); b.neuves.forEach(l => { const r = tous.find(x => x.l === l); if (r) tete.push(r); }); }
  if (b.onglet === 'equipements') { b.neufs.forEach(nm => { const r = tous.find(x => x.nom === nm); if (r) tete.push(r); }); if (b.nouveau) tete.unshift({ k: '+', nom: '', genre: 'eqpt', plans: [], sous: '', nouveau: true }); }
  const cles = new Set(tete.map(r => r.k)); return { tete, tous, L: lignesDe(O).filter(r => !cles.has(r.k)) }; }
/* La table : l'en-tête (trier au clic), les lignes — d'abord celles qu'on vient d'ajouter —, un intercalaire par folio
   quand « Tout » se lit sans tri ni recherche ; au-delà de 400 lignes, un bouton montre le reste. Les lignes se posent
   par paquets : le premier tout de suite (jusqu'à la ligne choisie s'il le faut), les suivants aux images d'après — un
   gros contrat s'ouvre sans attendre que mille lignes se mesurent. */
const PAQUET = 120;
function rendreTable(O, C) { const b = app.base, tri = b.tri, n = C.length + 1, jeton = ++RECAP.jeton;
  $('ba-tab').dataset.onglet = b.onglet;
  $('ba-thead').innerHTML = '<tr>' + C.map(c => { const t = tri && tri.k === c.k, triable = !!c.tri;
    return `<th data-k="${c.k}" class="${c.cls || ''}${t ? ' tri' : ''}"${triable ? ` tabindex="0" role="button" title="Trier par ${escA(c.titre || c.t)}" aria-sort="${t ? (tri.sens > 0 ? 'ascending' : 'descending') : 'none'}"` : ''}>${esc(c.t)}${t ? `<span class="sens" aria-hidden="true">${tri.sens > 0 ? '▲' : '▼'}</span>` : ''}</th>`; }).join('') + '<th class="rc-x"></th></tr>';
  const { tete, L, tous } = lignesMontrees(O), groupes = groupesParFolio();
  RECAP.vues = new Map(); RECAP.liste = [...tete, ...L];
  const vus = L.slice(0, b.toutes ? Infinity : CAP_LIGNES), morceaux = tete.map(r => () => ligneHtml(O, C, r, true));
  if (groupes) { const par = new Map(); vus.forEach(r => { const p = premierFolio(r.l); (par.get(p) || par.set(p, []).get(p)).push(r); });
    // l'intercalaire d'un folio : ses liaisons, ses problèmes et ses points à voir (comptés quand il se pose, avec ses lignes)
    par.forEach((rs, p) => { morceaux.push(() => { const ko = rs.filter(r => O.etat(r) === 'ko').length, att = rs.filter(r => O.etat(r) === 'att').length;
      return `<tr class="rc-groupe${p === app.plan ? ' ici' : ''}"><td colspan="${n}"><button class="rc-f" data-plan="${escA(p)}">${p ? 'Folio ' + esc(p) : 'Sans folio'}</button><span>${[plurielLie(rs.length, 'liaison'), ko ? plurielLie(ko, 'problème') : '', att ? att + INSECABLE + 'à voir' : ''].filter(Boolean).join(' · ')}</span></td></tr>`; });
      rs.forEach(r => morceaux.push(() => ligneHtml(O, C, r))); }); }
  else vus.forEach(r => morceaux.push(() => ligneHtml(O, C, r)));
  const fin = (L.length > vus.length ? `<tr class="rc-reste"><td colspan="${n}">… et ${L.length - vus.length} autres lignes. <button class="rc-lien" id="ba-toutes">Tout montrer</button> ou affiner la recherche.</td></tr>` : '')
    + (!L.length && !tete.length ? `<tr class="rc-reste"><td colspan="${n}">${tous.length ? (b.filtre || pucesActives(O).length ? 'Rien qui corresponde. <button class="rc-lien" id="ba-effacer">Tout effacer</button>' : 'Rien sur ce folio. <button class="rc-lien" data-portee-tout="1">Voir tout le contrat</button>') : videDe(b.onglet)}</td></tr>` : '');
  // le premier paquet va jusqu'à la ligne choisie (on la fait venir sous les yeux)
  const choisie = RECAP.liste.findIndex(r => !r.nouveau && O.choisie(r)), d = Math.max(PAQUET, choisie >= 0 ? choisie + (groupes ? 40 : 20) : 0);
  const poser = (a, z) => morceaux.slice(a, z).map(f => f()).join('');
  $('ba-tbody').innerHTML = poser(0, d) + (d >= morceaux.length ? fin : '');
  if (d < morceaux.length) { let k = d; const suite = () => { if (jeton !== RECAP.jeton || $('base').hidden) return;
      $('ba-tbody').insertAdjacentHTML('beforeend', poser(k, k + PAQUET * 2) + (k + PAQUET * 2 >= morceaux.length ? fin : '')); k += PAQUET * 2;
      if (k < morceaux.length) requestAnimationFrame(suite); };
    requestAnimationFrame(suite); } }
const VIDES = { liaisons: 'Aucune liaison. « + Liaison » en écrit une, ou dépose un retest.', equipements: 'Aucun repère.', disjoncteurs: 'Aucun disjoncteur dans ce contrat (un repère au code CB).', barrettes: 'Aucune barrette, posée ou à poser.',
  prises: 'Aucune prise de coupure (un repère au code VC).', cables: 'Aucun fil complet.', contacts: 'Aucun contact à sertir connu : les connecteurs de ce contrat sont hors des normes embarquées.', raccords: 'Aucun connecteur.', problemes: 'Rien à reprendre : le contrôle ne relève aucun problème.', normes: 'Aucune table ne juge encore ce contrat.' };
const videDe = k => VIDES[k] || 'Rien à montrer.';
function ligneHtml(O, C, r, neuve) { RECAP.vues.set(r.k, r); const et = r.nouveau ? '' : O.etat(r);
  const cls = [et, !r.nouveau && O.choisie(r) ? 'on' : '', neuve ? 'neuve' : '', O.hors && O.hors(r) ? 'rc-hors' : ''].filter(Boolean).join(' ');
  return `<tr data-k="${escA(r.k)}"${r.l ? ` data-i="${r.i}"` : ''}${cls ? ` class="${cls}"` : ''}>` + C.map(c => `<td class="${c.cls || ''}">${r.nouveau ? (c.k === 'rep' ? valT('rep', '', { cls: 'rc-r', ph: 'repère' }) : '') : c.html(r)}</td>`).join('')
    + `<td class="rc-x">${O.supprimer && !r.nouveau ? `<button data-x="1" aria-label="Supprimer la ligne" title="Supprimer cette liaison"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>` : ''}</td></tr>`; }
function marquerLignes() { if ($('base').hidden) return; const O = onglet();
  $('ba-tbody').querySelectorAll('tr[data-k]').forEach(tr => { const r = RECAP.vues.get(tr.dataset.k); tr.classList.toggle('on', !!r && !r.nouveau && O.choisie(r)); }); }

/* ---- ÉDITER UNE CASE : double-clic, Entrée ou F2 ; Tab la suivante, Échap annule ---- */
const caseDe = el => { const v = el && el.closest && el.closest('[data-f]'), tr = v && v.closest('tr[data-k]'); return v && tr ? { k: tr.dataset.k, f: v.dataset.f } : null; };
const elementDe = c => c && $('ba-tbody').querySelector(`tr[data-k="${CSS.escape(c.k)}"] [data-f="${CSS.escape(c.f)}"]`);
function editerCase(k, f) { const el = elementDe({ k, f }); if (el) editer(el); }
function datalist(nom) { const V = verite(), xs = nom === 'reperes' ? reperesDe(V) : nom === 'pns' ? [...new Set(V.flatMap(l => [l.pnDe, l.pnVers]).filter(Boolean))]
    : nom === 'types' ? [...new Set([...V.map(l => l.type), ...cablesDe(app.norme).map(c => c.cable || c.type)].filter(Boolean))] : nom === 'routes' ? [...routes().keys()] : nom === 'folios' ? plans() : [];
  return xs.sort(triNaturel); }
function editer(el) { const b = app.base, O = onglet(), c = caseDe(el); if (!c || b.edition) return false; const r = RECAP.vues.get(c.k); if (!r || !O.editeur) return false;
  const E = O.editeur(r, c.f); if (!E) return false;
  if (E.action) { E.action(); return true; }
  if (r.l) { app.actif = r.l; if (!(app.cible && app.cible.type === 'bloc')) app.cible = { type: 'fil', l: r.l }; rallumer(); }
  let inp;
  if (E.options) { inp = document.createElement('select'); inp.innerHTML = E.options.map(([v, t]) => `<option value="${escA(v)}"${String(v) === String(E.valeur) ? ' selected' : ''}>${esc(t)}</option>`).join(''); }
  else { inp = document.createElement('input'); inp.value = E.valeur; inp.spellcheck = false; inp.autocomplete = 'off'; if (E.ph) inp.placeholder = E.ph;
    const xs = Array.isArray(E.liste) ? E.liste : E.liste ? datalist(E.liste) : null;
    if (xs && xs.length) { const id = 'rc-dl-' + (++RECAP.datalist), dl = document.createElement('datalist'); dl.id = id; dl.innerHTML = xs.slice(0, 400).map(x => `<option value="${escA(x)}">`).join(''); el.appendChild(dl); inp.setAttribute('list', id); } }
  inp.className = 'rc-saisie'; inp.dataset.f = c.f; inp.setAttribute('aria-label', (O.colonnes.find(x => x.k === c.f || c.f.startsWith(x.k)) || {}).t || c.f); if (E.aide) inp.title = E.aide;
  el.classList.add('edite'); el.dataset.avant = el.innerHTML; [...el.childNodes].forEach(n => { if (n.tagName !== 'DATALIST') n.remove(); }); el.prepend(inp);
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
  // où va le curseur : ce que l'écriture demande (un équipement neuf : sa nature), sinon la case voulue — sur la ligne
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
/* Ouvrir en moitié (par défaut) ou en page. Le filtre suit le bloc choisi ; sans bloc, celui qu'un bloc avait posé s'efface. */
function ouvrirBase(taille) { const b = app.base, t = taille === 'page' ? 'page' : 'moitie', etait = b.ouvert;
  if (etait && b.taille === t) return; b.taille = t;
  if (!etait) { b.ouvert = true; fermerFiche();
    if (app.cible && app.cible.type === 'bloc') { b.filtre = filtreDuBloc(app.cible.nom); b.filtreAuto = true; } else if (b.filtreAuto) { b.filtre = ''; b.filtreAuto = false; }
    b.defiler = true; }
  const el = $('base'); el.hidden = false; el.classList.toggle('page', t === 'page'); if (!etait) { el.classList.remove('entre'); void el.offsetWidth; el.classList.add('entre'); }
  document.body.classList.add('base-ouverte'); $('btnBase').setAttribute('aria-pressed', 'true');
  rendreBase(true); memoriserBase(); if (t === 'moitie') ajuster(true); }
function fermerBase() { const b = app.base; if (!b.ouvert) return; if (b.edition) finirEdition('annule', null);
  b.ouvert = false; b.neuves = []; b.neufs = []; b.nouveau = false; b.toutes = false; fermerMenuColonnes(); arreterCompte();
  const el = $('base'); el.hidden = true; el.classList.remove('page'); document.body.classList.remove('base-ouverte'); $('btnBase').setAttribute('aria-pressed', 'false');
  memoriserBase(); ajuster(true); }
/* B : ouvre en moitié, ou ferme ; Maj+B : passe en page, et de la page revient en moitié. */
function basculerBase(taille) { const b = app.base;
  if (taille === 'page') { if (!(app.contrat.liaisons.length || verite().length)) { dire('Rien à montrer : dépose d’abord un fichier.'); return; } ouvrirBase(b.ouvert && b.taille === 'page' ? 'moitie' : 'page'); return; }
  if (b.ouvert) fermerBase(); else if (app.contrat.liaisons.length || verite().length) ouvrirBase('moitie'); else dire('Rien à montrer : dépose d’abord un fichier.'); }
/* Le récapitulatif d'un objet (le pied d'une fiche) : l'onglet de son type, filtré sur lui — un fil sur son numéro. */
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

/* ---- CSV : l'onglet tel qu'il est filtré et trié ------------------------------ */
function exporterRecap() { assurerModele(); const O = onglet(), C = colonnesVues(O).filter(c => c.texte && (c.t || c.titre)), M = lignesMontrees(O), lignes = [...M.tete.filter(r => !r.nouveau), ...M.L];
  if (!lignes.length) { dire('Rien à exporter : l’onglet est vide.'); return; }
  const cell = v => { const t = String(v == null ? '' : v).replace(/ /g, ' '); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const csv = [C.map(c => cell(c.t || c.titre)).join(';'), ...lignes.map(r => C.map(c => cell(c.texte(r))).join(';'))].join('\n');
  const nom = ONGLETS.find(([k]) => k === app.base.onglet)[1];
  telecharger(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), nomContrat() + '-' + nomAscii(nom.toLowerCase()) + '.csv');
  dire(plurielLie(lignes.length, 'ligne') + ' (' + nom.toLowerCase() + ') enregistrée' + (lignes.length > 1 ? 's' : '') + ' en CSV.'); }

/* ---- LES COLONNES : ce que l'onglet montre ---------------------------------- */
function ouvrirMenuColonnes() { const O = onglet(), vues = new Set(colonnesVues(O).map(c => c.k)), m = $('ba-colonnes-menu');
  m.innerHTML = '<div class="rc-menu-t">Colonnes de l’onglet</div>' + O.colonnes.filter(c => c.t && (!c.si || c.si())).map(c => `<label class="rc-coche"><input type="checkbox" data-col="${c.k}"${vues.has(c.k) ? ' checked' : ''}><span>${esc(c.t)}</span>${c.option ? '<small>en plus</small>' : ''}</label>`).join('')
    + '<button class="rc-lien" id="ba-colonnes-defaut">Les colonnes d’office</button>';
  m.hidden = false; $('ba-colonnes').setAttribute('aria-expanded', 'true'); const x = m.querySelector('input'); if (x) x.focus(); }
function fermerMenuColonnes() { const m = $('ba-colonnes-menu'); if (!m || m.hidden) return; m.hidden = true; $('ba-colonnes').setAttribute('aria-expanded', 'false'); }

/* ---- TOUT RELIER --------------------------------------------------------------- */
function lierBase() { const b = app.base, t = $('ba-tab'), corps = $('ba-tbody'), fi = $('ba-filtre'); let fT;
  $('ba-taille').addEventListener('click', e => { const x = e.target.closest('[data-taille]'); if (!x) return; if (x.dataset.taille === 'plan') fermerBase(); else ouvrirBase(x.dataset.taille); });
  $('ba-csv').onclick = exporterRecap;
  $('ba-ajouter').onclick = () => { const O = onglet(); if (O.ajouter) O.ajouter(); };
  // les onglets : un clic, ou les flèches quand l'un a le clavier
  const ong = $('ba-onglets');
  ong.addEventListener('click', e => { const x = e.target.closest('[data-onglet]'); if (x) changerOnglet(x.dataset.onglet); });
  ong.addEventListener('keydown', e => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); e.stopPropagation();
    const ks = ONGLETS.map(([k]) => k), i = ks.indexOf(b.onglet), k = ks[(i + (e.key === 'ArrowRight' ? 1 : ks.length - 1)) % ks.length]; changerOnglet(k); const n = ong.querySelector(`[data-onglet="${k}"]`); if (n) n.focus(); });
  $('ba-portee').addEventListener('click', e => { const x = e.target.closest('[data-portee]'); if (!x || b.portee === x.dataset.portee) return; b.portee = x.dataset.portee; memoriserBase(); rendreBase(true); });
  fi.addEventListener('input', () => { clearTimeout(fT); fT = setTimeout(() => { b.filtre = fi.value; b.filtreAuto = false;
    const c = app.cible; if (c && c.type === 'bloc' && fi.value.trim() !== filtreDuBloc(c.nom)) { app.cible = null; app.choisi = null; peindre(); }
    memoriserBase(); rendreBase(); rallumer(); }, 150); });
  fi.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); if (fi.value) { fi.value = ''; fi.dispatchEvent(new Event('input')); } else fi.blur(); }
    else if (e.key === 'ArrowDown' || e.key === 'Enter') { const x = corps.querySelector('tr[data-k] [data-f]'); if (x) { e.preventDefault(); x.focus(); } } });
  $('ba-vider').onclick = () => { fi.value = ''; fi.dispatchEvent(new Event('input')); fi.focus(); };
  // les puces : chacune bascule ; dans un groupe exclusif (le genre d'un repère), une seule à la fois
  $('ba-puces').addEventListener('click', e => { const x = e.target.closest('[data-puce]'); if (!x) return; const O = onglet(), k = x.dataset.puce, on = new Set(b.puces[b.onglet] || []), g = k.split(':')[0];
    if (O.exclusif && g === O.exclusif) { [...on].forEach(p => { if (p.split(':')[0] === g) on.delete(p); }); if (k !== g + ':tous') on.add(k); }
    else if (pucesDe(O).find(p => p.k === k).groupe === 'niveau') { const avait = on.has(k); [...on].forEach(p => { if (/^niveau:/.test(p)) on.delete(p); }); if (!avait) on.add(k); }
    else if (on.has(k)) on.delete(k); else on.add(k);
    b.puces[b.onglet] = [...on]; b.toutes = false; memoriserBase(); rendreBase(true); });
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
    if (e.target.closest('#ba-toutes')) { b.toutes = true; rendreBase(true); return; }
    if (e.target.closest('#ba-effacer')) { b.filtre = ''; b.filtreAuto = false; fi.value = ''; b.puces[b.onglet] = []; memoriserBase(); rendreBase(true); return; }
    if (e.target.closest('[data-portee-tout]')) { b.portee = 'tout'; memoriserBase(); rendreBase(true); return; }
    if (!r || r.nouveau) return;
    if (e.target.closest('button[data-x]')) { O.supprimer(r); return; }
    const au = e.target.closest('button[data-auto]'); if (au) { if (O.rendre) O.rendre(r, au.dataset.auto); return; }
    if (e.target.closest('[data-aller]')) { if (O.aller) O.aller(r); return; }
    if (e.target.closest('[data-voir-fils]')) { if (O.voirFils) O.voirFils(r); return; }
    const re = e.target.closest('[data-retenir]'); if (re) { ecrireCharge(r.nom, c => { c.calibre = +re.dataset.retenir; }, 'calibre de ' + r.nom); dire(r.nom + ' : ' + amperes(+re.dataset.retenir) + ' retenu.'); return; }
    if (e.target.closest('[data-poser]')) { editerCase(r.k, 'rep'); return; }
    if (O.choisir) O.choisir(r); });
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
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && (ed.inp.value === ed.avant || ed.avant == null)) { e.preventDefault(); e.stopPropagation(); finirEdition('annule', null); const q = annuler(); if (q) dire('Annulé : ' + q + '.'); }
      return; }
    const v = e.target.closest && e.target.closest('[data-f]'); if (!v || !corps.contains(v)) return;
    if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); e.stopPropagation(); editer(v); return; }
    const pas = { ArrowRight: 'suivante', ArrowLeft: 'precedente', ArrowDown: 'dessous', ArrowUp: 'dessus' }[e.key]; if (!pas || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault(); e.stopPropagation(); const c = caseDe(v), n = elementDe(voisine({ k: c.k, f: c.f, el: v }, pas)); if (n) { n.focus(); n.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } });
  // le focus sur une case de liaison : son fil s'allume (le clavier comme la souris)
  corps.addEventListener('focusin', e => { if (b.edition) return; const tr = e.target.closest('tr[data-k]'), r = tr && RECAP.vues.get(tr.dataset.k); if (r && r.l) { const w = filDe(r.l); if (w) allumerFil(w); } });
  // Maj+B : la page (B, lui, est pris par le clavier de l'outil, 08 `lierPanneau`)
  window.addEventListener('keydown', e => { if (e.key !== 'B' || !e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || !$('relief').hidden) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return; e.preventDefault(); basculerBase('page'); });
  lierPoignee(); }
/* La poignée : la moitié se règle en hauteur (la page prend toute la place, elle n'en a pas). */
function lierPoignee() { const p = $('ba-poignee'), el = $('base'); let actif = false;
  p.addEventListener('pointerdown', e => { if (app.base.taille === 'page') return; actif = true; el.classList.add('redim'); try { p.setPointerCapture(e.pointerId); } catch (_) { } e.preventDefault(); });
  p.addEventListener('pointermove', e => { if (!actif) return;
    app.base.hauteur = Math.round(Math.max(160, Math.min(window.innerHeight * 0.8, el.getBoundingClientRect().bottom - e.clientY))); appliquerTailleBase(); });
  const fin = () => { if (!actif) return; actif = false; el.classList.remove('redim'); memoriserBase(); ajuster(true); };
  p.addEventListener('pointerup', fin); p.addEventListener('pointercancel', fin); }
