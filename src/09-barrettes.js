/* ===========================================================================
   09 — LA BIBLE : BARRETTES, PRISES DE COUPURE, CONNECTEURS, ET LE SUIVI
   Ce que le contrat ne porte qu'à moitié :

   LA BIBLE — une seule table, venue d'un Excel ou d'un CSV de l'atelier :
   les références normalisées (NSA, ASNE, ABS, EN…) avec ce qu'elles
   acceptent. Sa colonne NATURE dit de quoi il s'agit : « jonction » ou
   « blindage » (barrettes), « coupure » (prises de coupure), « connecteur »
   (l'embase d'un équipement, avec sa PARTIE MOBILE — la fiche qu'on pose
   sur le faisceau). La bible d'exemple embarquée ne sert qu'à montrer le
   mécanisme ; elle n'a aucune valeur normative.

   LE CHOIX — chaque barrette et chaque prise de coupure du contrat reçoit la
   référence la plus logique pour ce qu'elle porte : assez de bornes, la
   jauge des fils qui y arrivent, le blindage s'il y en a, la famille déjà
   employée. Chaque connecteur d'équipement dit la partie mobile à poser.

   LES CONNECTEURS — les bornes d'un équipement appartiennent à des
   connecteurs (A, B, C…) : la lettre en tête de la borne (A12, B03), sinon
   le part number du connecteur (PN1 / PN2), qui reçoit alors une lettre.

   LE SUIVI — pour un contrat, la liste de tout ce qu'on pose : chaque
   barrette, prise et connecteur avec sa référence, ses bornes, ses fils,
   ses routes, ses folios. C'est ce qui s'exporte et se garde d'un contrat
   à l'autre.

   LA NORME — ce qu'une norme de matériel dit et que ni le contrat ni la
   bible ne portent : pour une FAMILLE (ASNE0500, EN3646…), le pas, ce que
   chaque contact admet (jauges, intensité, résistance), combien de fils par
   côté, la règle de remplissage ; pour les FILS, par type et jauge, la
   section, la résistance et l'intensité ; les DÉCLASSEMENTS ; le RÉSEAU
   (la chute admise). Quatre tables lues par le nom de leurs colonnes. La
   norme embarquée vient de normes/*.csv à la construction ; celle qui est
   livrée est un EXEMPLE, sans valeur normative. Avec elle, la barrette se
   REMPLIT trou par trou et se SIMULE (jauge admise, courant, chute) sur des
   hypothèses dites — le retest ne porte ni longueur ni courant.
   =========================================================================== */
'use strict';

/* ---- la bible ------------------------------------------------------------ */
/* Les en-têtes d'atelier ont des accents : « Référence », « Intensité ». */
const NORMA = t => NORM(String(t == null ? '' : t).normalize('NFD'));
const COLONNES_BIBLE = [
  ['reference',  ['reference', 'ref', 'partnumber', 'pn', 'norme', 'designation']],
  ['famille',    ['famille', 'family', 'serie', 'series', 'type']],
  ['nature',     ['nature', 'fonction', 'usage', 'kind']],
  ['bornes',     ['bornes', 'modules', 'nbbornes', 'nombredebornes', 'voies', 'ways', 'contacts', 'positions']],
  ['jaugeMin',   ['jaugemin', 'awgmin', 'jaugefine', 'gaugemin', 'minawg']],
  ['jaugeMax',   ['jaugemax', 'awgmax', 'jaugegrosse', 'gaugemax', 'maxawg']],
  ['intensite',  ['intensite', 'intensitemax', 'courant', 'current', 'amperes', 'a']],
  ['blindage',   ['blindage', 'blinde', 'shield', 'shielded', 'masse']],
  ['mobile',     ['mobile', 'partiemobile', 'fiche', 'contrepartie', 'mating', 'plug', 'pnmobile']],
  ['note',       ['note', 'notes', 'observation', 'observations', 'remarque', 'commentaire']]
];
/* Une entrée normalisée. Les jauges AWG comptent à l'envers : 26 est plus
   fin que 20 ; « min » est la plus fine acceptée, « max » la plus grosse. */
function entreeBible(o) {
  const n = v => { const x = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(x) ? null : x; };
  const oui = v => /^(oui|o|yes|y|x|1|true|vrai)$/i.test(String(v == null ? '' : v).trim());
  const ref = String(o.reference || '').trim(); if (!ref) return null;
  const jauges = [n(o.jaugeMin), n(o.jaugeMax)].filter(x => x != null);
  return { reference: ref, famille: String(o.famille || ref.replace(/[-\s].*$/, '')).trim(),
           nature: String(o.nature || 'jonction').trim().toLowerCase(), bornes: n(o.bornes),
           jaugeMin: jauges.length ? Math.max(...jauges) : null, jaugeMax: jauges.length ? Math.min(...jauges) : null,
           intensite: n(o.intensite), blindage: oui(o.blindage), mobile: String(o.mobile || '').trim(), note: String(o.note || '').trim(),
           module: String(o.module || '').trim() || (/^(E0599-?1?[A-E]\d{3}|NSA937901)/i.test(ref) ? ref : '') };      // un module de jonction (ASNE 0599, NSA937901)
}
/* La bible d'exemple : des références PLAUSIBLES, pas des normes lues. Elle
   montre le mécanisme en attendant la bible de l'atelier. */
function bibleExemple() {
  const E = (reference, famille, nature, bornes, jaugeMin, jaugeMax, intensite, blindage, note, mobile) =>
    ({ reference, famille, nature, bornes, jaugeMin, jaugeMax, intensite, blindage, note, mobile });
  return [
    E('EN3646A6083AAN', 'EN3646', 'coupure', 3, 26, 20, 7.5, false, 'exemple · prise de coupure 3 contacts'),
    E('EN3646A6088AAN', 'EN3646', 'coupure', 8, 26, 20, 7.5, false, 'exemple · prise de coupure 8 contacts'),
    E('EN2997Y1A08P', 'EN2997', 'connecteur', 8, 26, 20, 7.5, false, 'exemple · embase 8 contacts', 'EN2997Y2A08S'),
    E('ABS0864-12', 'ABS0864', 'connecteur', 12, 26, 20, 7.5, false, 'exemple · embase 12 contacts', 'ABS0865-12')
  ].map(entreeBible);
}
/* La bible de l'outil : pour les barrettes, les modules de jonction des normes ASNE 0599 et NSA937901 — les seules
   proposées — ; pour les prises de coupure et les connecteurs, les références d'exemple. */
const bibleDeLOutil = () => avecModules(bibleExemple());
// une bible, tous les modules des normes en tête (ceux qu'elle porte déjà gardent leur ligne) : ce sont eux que les barrettes prennent
const avecModules = (entrees, norme) => { const E = entrees || [], par = new Map(E.map(e => [e.reference, e])), mods = bibleDesModules(norme), refs = new Set(mods.map(e => e.reference));
  return [...mods.map(e => par.get(e.reference) || e), ...E.filter(e => !refs.has(e.reference))]; };
/* Lire une bible : un tableau dont la première ligne reconnue nomme les
   colonnes (au moins « référence » et « bornes »). Rend { entrees, entete }. */
function lireBible(texte) {
  const lignes = String(texte || '').split(/\r?\n/);
  let entete = null;
  for (let r = 0; r < Math.min(lignes.length, 30) && !entete; r++) {
    const row = cellules(lignes[r] || ''); const col = {}; let n = 0;
    row.forEach((cell, c) => { const k = NORMA(cell); if (!k) return;
      for (const [nom, alias] of COLONNES_BIBLE) if (col[nom] == null && alias.includes(k)) { col[nom] = c; n++; break; } });
    if (col.reference != null && col.bornes != null) entete = { ligne: r, col, trouvees: n };
  }
  if (!entete) return { entrees: [], entete: null };
  const entrees = [];
  for (let r = entete.ligne + 1; r < lignes.length; r++) { if (!lignes[r].trim()) continue;
    const row = cellules(lignes[r]); const o = {};
    Object.entries(entete.col).forEach(([nom, c]) => { o[nom] = row[c] == null ? '' : row[c]; });
    const e = entreeBible(o); if (e) entrees.push(e); }
  return { entrees, entete: entete.ligne + 1 };
}
async function lireBibleFichier(fichier) { return lireBible(await texteDuFichier(fichier)); }

/* ---- ce que porte une barrette du contrat -------------------------------- */
/* Le type de câble du retest dit la jauge en queue : DR24, MLB22, BN20 → 24,
   22, 20. Le blindage se devine au code : ML… (multiconducteur blindé). C'est
   une première lecture, à corriger avec la table de l'atelier. */
function jaugeDuType(type) { const m = /(\d{1,2})\s*$/.exec(String(type || '').trim()); return m ? parseInt(m[1], 10) : null; }
function blindeDuType(type) { return /^(ML|BL|SH|SC)/i.test(String(type || '').trim()); }
function besoinsDeBarrette(repere, liaisons) {
  const bornes = new Set(), jauges = [], pns = new Map(), ponts = [], parBorne = new Map(); let blindes = 0, shunts = 0, fils = 0;
  // AMONT : le fil arrive sur la barrette (elle est son « vers ») ; AVAL : il en repart. `l` : la liaison elle-même, pour la retrouver.
  const arrivee = (b, l, autre, borneAutre) => { if (!b) return; (parBorne.get(b) || parBorne.set(b, []).get(b)).push({ cable: l.cable, type: l.type, route: l.route, plan: l.plan, vers: autre, borne: borneAutre, amont: l.vers === repere, l }); };
  liaisons.forEach(l => { const ici = [];
    if (l.de === repere) ici.push([l.borneDe, l.pnDe]);
    if (l.vers === repere) ici.push([l.borneVers, l.pnVers]);
    if (!ici.length) return;
    if (l.de === repere && l.vers === repere) { shunts++; ponts.push([l.borneDe, l.borneVers]); }
    else { fils++; const g = jaugeDuType(l.type); if (g != null) jauges.push(g); if (blindeDuType(l.type)) blindes++;
      if (l.de === repere) arrivee(l.borneDe, l, l.vers, l.borneVers); else arrivee(l.borneVers, l, l.de, l.borneDe); }
    ici.forEach(([b, pn]) => { if (b) bornes.add(b); if (pn) pns.set(pn, (pns.get(pn) || 0) + 1); }); });
  const numeros = [...bornes].map(b => parseInt(b, 10)).filter(x => !isNaN(x));
  const pn = [...pns.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0])[0] || '';
  return { repere, bornes: [...bornes], nBornes: bornes.size, borneMax: numeros.length ? Math.max(...numeros) : bornes.size,
           fils, shunts, ponts, parBorne, jaugeFine: jauges.length ? Math.max(...jauges) : null, jaugeGrosse: jauges.length ? Math.min(...jauges) : null,
           blindes, pn };
}
/* Les PAQUETS d'une barrette : les bornes réunies par des shunts forment un
   paquet ; une borne seule est un paquet à elle seule. Rend, dans l'ordre
   des bornes, [{ bornes:[…], ponte:bool }]. */
function paquetsDeBarrette(bornes, ponts) {
  const chef = new Map(); const trouver = b => { while (chef.has(b) && chef.get(b) !== b) b = chef.get(b); return b; };
  bornes.forEach(b => chef.set(b, b));
  ponts.forEach(([a, b]) => { if (!chef.has(a)) chef.set(a, a); if (!chef.has(b)) chef.set(b, b); const ra = trouver(a), rb = trouver(b); if (ra !== rb) chef.set(rb, ra); });
  const groupes = new Map();
  [...chef.keys()].sort(triBornes).forEach(b => { const r = trouver(b); (groupes.get(r) || groupes.set(r, []).get(r)).push(b); });
  return [...groupes.values()].map(g => ({ bornes: g, ponte: g.length > 1 })).sort((u, v) => triBornes(u.bornes[0], v.bornes[0]));
}
/* La barrette telle qu'elle est physiquement : tous les modules de la
   référence retenue (ou au moins ceux qu'on utilise), chacun avec ses fils
   de tous les folios, son paquet, et s'il est libre. Ce que la fiche
   visuelle dessine. */
function physiqueDeBarrette(repere, liaisons, bible, retenue) {
  const I = (estCoupure(repere) ? coupureInfos : barretteInfos)(repere, liaisons, bible);
  const ref = retenue || I.reference, entree = (bible || []).find(e => e.reference === ref) || I.choix || null;
  const n = Math.max(entree && entree.bornes || 0, I.borneMax || 0, I.nBornes);
  const paquets = paquetsDeBarrette(I.bornes, I.ponts);
  const paquetDe = new Map(); paquets.forEach((p, k) => p.bornes.forEach(b => paquetDe.set(b, k)));
  const utilisees = new Set(I.bornes.map(String));
  const modules = [];
  for (let k = 1; k <= n; k++) { const b = String(k);
    modules.push({ borne: b, utilisee: utilisees.has(b), paquet: paquetDe.has(b) ? paquetDe.get(b) : null, fils: I.parBorne.get(b) || [] }); }
  I.bornes.filter(b => !/^\d+$/.test(String(b))).sort(triBornes).forEach(b => modules.push({ borne: b, utilisee: true, paquet: paquetDe.get(b) ?? null, fils: I.parBorne.get(b) || [] }));
  return { repere, reference: ref, entree, modules, paquets, libres: modules.filter(m => !m.utilisee).length, nature: estCoupure(repere) ? 'prise de coupure' : (I.blindes ? 'barrette de blindage' : 'barrette') };
}
/* La même physique pour une référence de la bible, sans contrat : tous ses
   modules, aucun fil, aucun paquet. Ce que la fiche de la bible dessine. */
function physiqueDeReference(entree) {
  const n = entree && entree.bornes != null ? Math.max(0, Math.round(entree.bornes)) : 0, modules = [];
  for (let k = 1; k <= n; k++) modules.push({ borne: String(k), utilisee: false, paquet: null, fils: [] });
  const nature = !entree ? 'barrette' : entree.nature === 'coupure' ? 'prise de coupure' : entree.nature === 'connecteur' ? 'connecteur' : entree.nature === 'blindage' ? 'barrette de blindage' : 'barrette';
  return { repere: '', reference: entree ? entree.reference : '', entree: entree || null, modules, paquets: [], libres: n, nature };
}
/* Le choix : parmi les entrées de la bonne nature qui conviennent, la
   famille déjà employée d'abord, puis la plus petite qui a assez de bornes,
   puis la plus courante en intensité. Chaque raison est dite pour qu'on
   puisse la contester. */
function choisirReference(besoins, bible, natures) {
  const raisons = [];
  const nBornes = Math.max(besoins.nBornes, besoins.borneMax || 0);
  let cands = bible.filter(e => natures.includes(e.nature) && e.bornes != null && e.bornes >= nBornes);
  raisons.push(`${nBornes} borne${nBornes > 1 ? 's' : ''} à loger`);
  if (besoins.jaugeFine != null) {
    const ok = cands.filter(e => (e.jaugeMin == null || e.jaugeMin >= besoins.jaugeFine) && (e.jaugeMax == null || e.jaugeMax <= besoins.jaugeGrosse));
    if (ok.length) cands = ok;
    raisons.push(besoins.jaugeFine === besoins.jaugeGrosse ? `fils de jauge ${besoins.jaugeFine}` : `fils de jauge ${besoins.jaugeFine} à ${besoins.jaugeGrosse}`);
  }
  if (besoins.blindes && natures.includes('blindage')) { const ok = cands.filter(e => e.blindage || e.nature === 'blindage'); if (ok.length) cands = ok;
    raisons.push(`${besoins.blindes} fil${besoins.blindes > 1 ? 's' : ''} blindé${besoins.blindes > 1 ? 's' : ''}`); }
  else if (natures.includes('blindage')) { const ok = cands.filter(e => e.nature !== 'blindage'); if (ok.length) cands = ok; }
  const famille = besoins.pn ? (bible.find(e => e.reference === besoins.pn) || {}).famille || besoins.pn.replace(/[-\s].*$/, '') : '';
  if (famille) { const ok = cands.filter(e => e.famille === famille); if (ok.length) { cands = ok; raisons.push(`famille ${famille} déjà employée`); } }
  cands = cands.slice().sort((a, b) => (a.bornes - b.bornes) || ((a.intensite || 0) - (b.intensite || 0)) || a.reference.localeCompare(b.reference));
  const choix = cands[0] || null;
  if (choix && choix.bornes > nBornes) raisons.push(`${choix.bornes - nBornes} borne${choix.bornes - nBornes > 1 ? 's' : ''} libre${choix.bornes - nBornes > 1 ? 's' : ''}`);
  if (!choix) raisons.push('aucune référence de la bible ne convient');
  return { choix, nature: natures[0], raisons, candidats: cands.slice(0, 6), enPlus: Math.max(0, cands.length - 6) };
}
const choisirBarrette = (besoins, bible) => ({ ...choisirReference(besoins, bible, ['jonction', 'blindage']), nature: besoins.blindes ? 'blindage' : 'jonction' });
const choisirCoupure  = (besoins, bible) => choisirReference(besoins, bible, ['coupure']);
/* Tout ce qu'on sait d'une barrette (ou d'une prise) du contrat : ses
   besoins, la référence choisie, le pourquoi, et celle que le fichier
   portait déjà. */
function infosDe(repere, liaisons, bible, choisir) {
  const besoins = besoinsDeBarrette(repere, liaisons);
  const choix = choisir(besoins, bible || []);
  const deja = (bible || []).find(e => e.reference === besoins.pn) || null;
  return { ...besoins, ...choix, deja, reference: choix.choix ? choix.choix.reference : (besoins.pn || ''),
           changee: !!(besoins.pn && choix.choix && choix.choix.reference !== besoins.pn) };
}
/* Une barrette, quand la bible porte des modules de jonction : le REMPLISSAGE AUTOMATIQUE dit les modules
   (`remplirModules`) ; la référence retenue est celle des modules posés (« 2 × E0599-1A101Z »), les candidates sont les
   variantes qui la logent d'un seul module, dans la norme visée. `retenue` : la désignation donnée à la main (une
   variante, ou le nom d'une norme). Sinon, le choix d'une réglette par son nombre de bornes. */
function barretteInfos(repere, liaisons, bible, norme, retenue) { const B = bible || [];
  if (!B.some(e => e.module)) return infosDe(repere, liaisons, bible, choisirBarrette);
  const besoins = besoinsDeBarrette(repere, liaisons), plan = remplirModules(besoins, norme, retenue), s = k => k > 1 ? 's' : '';
  const nom = plan.famille ? nomDeFamille(norme, plan.famille) : 'ASNE 0599 ou NSA937901';
  const choix = plan.modules.length ? B.find(e => e.reference === plan.modules[0].reference) || null : null;
  const candidats = variantesQuiLogent(besoins, norme, plan.famille).map(m => B.find(e => e.reference === m.reference)).filter(Boolean);
  const raisons = [`${plan.potentiels} potentiel${s(plan.potentiels)} à loger`, ...(besoins.jaugeFine != null ? [besoins.jaugeFine === besoins.jaugeGrosse ? `fils de jauge ${besoins.jaugeFine}` : `fils de jauge ${besoins.jaugeFine} à ${besoins.jaugeGrosse}`] : []),
    plan.modules.length ? `${plan.modules.length} module${s(plan.modules.length)} ${nom}, ${plan.contacts - plan.utilises} contact${s(plan.contacts - plan.utilises)} libre${s(plan.contacts - plan.utilises)}` : 'aucun module ' + nom + ' ne convient',
    ...plan.verdicts.map(v => v.texte)];
  return { ...besoins, choix, nature: 'jonction', raisons, candidats: candidats.slice(0, 6), enPlus: Math.max(0, candidats.length - 6), deja: B.find(e => e.reference === besoins.pn) || null, plan,
           reference: plan.reference || besoins.pn || '', changee: !!(besoins.pn && plan.reference && plan.reference !== besoins.pn) }; }
const coupureInfos  = (repere, liaisons, bible) => infosDe(repere, liaisons, bible, choisirCoupure);

/* ---- les connecteurs d'un équipement ------------------------------------- */
/* Une borne « A12 » est la borne 12 du connecteur A ; sinon le connecteur
   est le part number (PN) porté par la liaison, et il reçoit une lettre —
   la première libre, dans l'ordre d'apparition — parce qu'un connecteur se
   nomme d'une lettre sur le plan ; son part number se lit dans sa carte.
   Rend, pour un repère, [{ nom, pn, deduite, bornes:[…] }] dans l'ordre
   des lettres. */
const LETTRE_CONNECTEUR = /^([A-Z]{1,2})[-./ ]?(\d{1,3}[A-Z]?)$/i;
/* Une borne sans chiffre (CNT, GND…) n'est pas un contact de connecteur :
   elle se raccorde au corps. */
function connecteurDeBorne(borne, pn) {
  const b = String(borne || '').trim(); if (!/\d/.test(b)) return null;
  const m = LETTRE_CONNECTEUR.exec(b);
  if (m) return { nom: m[1].toUpperCase(), pn: pn || '', lettre: true };
  return pn ? { nom: pn, pn, lettre: false } : null;
}
function connecteursDe(repere, liaisons) {
  const groupes = new Map();
  liaisons.forEach(l => { [[l.de, l.borneDe, l.pnDe], [l.vers, l.borneVers, l.pnVers]].forEach(([r, b, pn]) => {
    if (r !== repere || !b) return; const c = connecteurDeBorne(b, pn); if (!c) return;
    const cle = (c.lettre ? 'L:' : 'P:') + c.nom;
    const g = groupes.get(cle) || groupes.set(cle, { nom: c.lettre ? c.nom : '', pn: c.pn, lettre: c.lettre, deduite: !c.lettre, bornes: new Set() }).get(cle);
    g.bornes.add(b); if (!g.pn && c.pn) g.pn = c.pn; }); });
  const prises = new Set([...groupes.values()].filter(g => g.lettre).map(g => g.nom));
  let k = 0; const libre = () => { let n; do { n = String.fromCharCode(65 + (k % 26)) + (k >= 26 ? String(Math.floor(k / 26)) : ''); k++; } while (prises.has(n)); return n; };
  groupes.forEach(g => { if (!g.lettre) g.nom = libre(); });
  return [...groupes.values()].sort((a, b) => a.nom.localeCompare(b.nom)).map(g => ({ nom: g.nom, pn: g.pn, deduite: g.deduite, bornes: [...g.bornes] }));
}
/* La même chose, borne par borne : ce que le dessin lit. */
function connecteurParBorne(repere, liaisons) {
  const m = new Map(); connecteursDe(repere, liaisons).forEach(g => g.bornes.forEach(b => m.set(String(b), g))); return m;
}
/* Ce qu'on pose sur chaque connecteur d'un équipement : l'embase est celle
   de l'équipement (le part number du fichier) ; la bible dit sa partie
   mobile — la fiche qu'on câble — et son nombre de contacts. */
function connecteursInfos(repere, liaisons, bible) {
  return connecteursDe(repere, liaisons).map(c => { const e = (bible || []).find(x => x.reference === c.pn && x.nature === 'connecteur') || null;
    return { ...c, embase: e, mobile: e ? e.mobile : '', contacts: e ? e.bornes : null, libres: e && e.bornes != null ? Math.max(0, e.bornes - c.bornes.length) : null }; });
}

/* ---- le suivi ------------------------------------------------------------ */
/* Une ligne par chose posée : barrette, prise de coupure, connecteur — avec
   la référence retenue (celle de la bible, ou celle qu'on a choisie à la
   main, sinon celle du fichier), ses bornes, ses fils, ses routes, ses
   folios. `retenue(repere)` rend la référence choisie à la main, s'il y en
   a une. */
function suiviDuContrat(liaisons, bible, contrat, retenue) {
  const lignes = [], main = retenue || (() => '');
  const filsDe = (r, borne) => liaisons.filter(l => (l.de === r && (!borne || l.borneDe === borne)) || (l.vers === r && (!borne || l.borneVers === borne)));
  const champs = (fils) => ({ fils: [...new Set(fils.map(l => l.cable).filter(Boolean))], routes: [...new Set(fils.map(l => l.route).filter(Boolean))], plans: [...new Set(fils.map(l => l.plan).filter(Boolean))] });
  reperesDe(liaisons).forEach(r => {
    if (estBarrette(r) || estCoupure(r)) {
      const I = estBarrette(r) ? barretteInfos(r, liaisons, bible, undefined, main(r)) : coupureInfos(r, liaisons, bible);
      lignes.push({ contrat, repere: r, nature: estBarrette(r) ? (I.blindes ? 'barrette de blindage' : 'barrette') : 'prise de coupure',
                    reference: I.plan ? I.reference : main(r) || I.reference, fichier: I.pn, bornes: I.bornes.slice().sort(triBornes), nBornes: I.nBornes, shunts: I.shunts,
                    jauge: I.jaugeFine == null ? '' : (I.jaugeFine === I.jaugeGrosse ? String(I.jaugeFine) : I.jaugeFine + '-' + I.jaugeGrosse), ...champs(filsDe(r)) });
    } else if (!estMasse(r)) {
      connecteursInfos(r, liaisons, bible).forEach(c => { const fils = liaisons.filter(l => (l.de === r && c.bornes.includes(l.borneDe)) || (l.vers === r && c.bornes.includes(l.borneVers)));
        lignes.push({ contrat, repere: r + ' ' + c.nom, nature: 'connecteur', reference: c.mobile || '', fichier: c.pn, bornes: c.bornes.slice().sort(triBornes), nBornes: c.bornes.length, shunts: 0,
                      jauge: '', ...champs(fils) }); }); } });
  return lignes;
}
/* L'ordre naturel des bornes : 1, 2, 10 ; A1, A2, B1. */
function triBornes(a, b) { const na = parseFloat(a), nb = parseFloat(b);
  if (!isNaN(na) && !isNaN(nb) && String(na) === String(a) && String(nb) === String(b)) return na - nb;
  return String(a).localeCompare(String(b), 'fr', { numeric: true }); }

/* ---- la norme : quatre tables, lues par le nom des colonnes -------------- */
/* Chaque table se reconnaît à ses colonnes ; une bible (Référence + Bornes)
   n'est pas une table de familles. Les titres entre les tables sont ignorés. */
const COLONNES_NORME = {
  familles: [
    ['norme',       ['norme', 'document', 'standard', 'spec', 'specification']],
    ['famille',     ['famille', 'family', 'serie', 'series']],
    ['reference',   ['reference', 'ref', 'partnumber', 'pn']],
    ['nature',      ['nature', 'fonction', 'usage', 'kind']],
    ['variantes',   ['variantes', 'contacts', 'modules', 'bornes', 'voies', 'tailles']],
    ['pas',         ['pas', 'pasmm', 'pitch', 'entraxe']],
    ['jaugeMin',    ['jaugemin', 'awgmin', 'jaugefine', 'gaugemin', 'minawg']],
    ['jaugeMax',    ['jaugemax', 'awgmax', 'jaugegrosse', 'gaugemax', 'maxawg']],
    ['intensite',   ['intensite', 'intensitecontact', 'intensiteparcontact', 'courant', 'current', 'a']],
    ['resistance',  ['resistance', 'resistancecontact', 'resistancedecontact', 'rcontact', 'mohm']],
    ['filsParCote', ['filsparcote', 'filspartrou', 'filsparcontact', 'trousparcote', 'trous', 'filsparmodule']],
    ['ordre',       ['ordre', 'remplissage', 'sens']],
    ['paquets',     ['paquets', 'pontage', 'ponts', 'peigne']],
    ['reserves',    ['reserves', 'modulesreserves', 'reserve', 'contactsreserves']],
    ['masse',       ['masse', 'retourdemasse', 'misealamasse']],
    ['note',        ['note', 'notes', 'observation', 'remarque', 'commentaire']]],
  fils: [
    ['type',        ['type', 'typedefil', 'typedecable']],
    ['jauge',       ['jauge', 'awg', 'gauge', 'jaugeawg', 'sizeawg']],
    ['code',        ['code', 'codeen2853', 'codeen2083', 'reference']],
    ['brins',       ['brins', 'toronnage', 'nombredebrins']],
    ['section',     ['section', 'sectiontoron', 'sectionconducteur', 'sectionmm2', 'mm2', 'sectionmm']],
    ['resistance20', ['resistance20', 'r20', 'resistancea20', 'resistance20c']],
    ['resistance',  ['resistance', 'resistanceohmkm', 'ohmkm', 'rlineique', 'resistancelineique', 'resistance135']],
    ['intensite',   ['intensite', 'courant', 'intensiteadmissible', 'current', 'a', 'continu', 'intensitecontinue', 'continuousrating']],
    ['i2s',         ['intensite2s', '2s', 'i2s', 'duty2s']],
    ['i10s',        ['intensite10s', '10s', 'i10s', 'duty10s']],
    ['i1min',       ['intensite1min', '1min', 'i1min', '60s', 'duty1min']],
    ['chute10m',    ['chute10m', 'chutepour10m', 'voltagedrop10m', 'chute']],
    ['tr',          ['tr', 'tconducteur', 'temperatureconducteur', 'temperaturenominale', 'tnominale', 'ratedtemperature']],
    ['note',        ['note', 'notes', 'observation', 'remarque', 'commentaire']]],
  declassements: [
    ['condition',   ['condition', 'cause', 'cas', 'situation']],
    ['fils',        ['fils', 'nfils', 'nombredefils', 'filsdufaisceau']],
    ['charge',      ['charge', 'chargepct', 'pourcentcharge', 'chargedufaisceau']],
    ['altitude',    ['altitude', 'altitudeft', 'ft', 'pieds']],
    ['facteur',     ['facteur', 'coefficient', 'coef', 'k']],
    ['note',        ['note', 'notes', 'observation', 'remarque', 'commentaire', 'source']]],
  reseau: [
    ['tension',     ['tension', 'reseau', 'u', 'volts', 'v']],
    ['nature',      ['nature', 'regime', 'courant', 'type']],
    ['chuteMax',    ['chutemax', 'chute', 'chuteadmise', 'chutemaxv', 'deltau', 'chuteenv', 'chutemaxcontinue']],
    ['chuteInter',  ['chutemaxintermittent', 'intermittent', 'chuteintermittente', 'chuteintermittent']],
    ['chutePct',    ['chutemaxpct', 'chutepct', 'pourcent', 'chuteen', 'chutemaxen', 'pourcentmax']],
    ['note',        ['note', 'notes', 'observation', 'remarque', 'commentaire']]],
  cablesFamilles: [
    ['famille',     ['famille', 'familles', 'family', 'serie']],
    ['norme',       ['norme', 'standard', 'spec', 'document']],
    ['conducteur',  ['conducteur', 'conductor', 'metal', 'ame']],
    ['placage',     ['placage', 'plating', 'revetement']],
    ['tmin',        ['tmin', 'temperaturemin', 'tminc']],
    ['tmax',        ['tmax', 'temperaturemax', 'tmaxc', 'tmaxcable']],
    ['tension',     ['tension', 'voltage', 'tensionv']],
    ['frequence',   ['frequence', 'frequencemax', 'fmax', 'hz']],
    ['isolant',     ['isolant', 'isolation', 'insulation']],
    ['blindage',    ['blindage', 'ecran', 'shield']],
    ['rayon',       ['rayon', 'rayondecourbure', 'rayonmin', 'courbure']],
    ['marquage',    ['marquage', 'marking']],
    ['note',        ['note', 'notes', 'observation', 'remarque', 'commentaire', 'statut']]],
  resistancesContacts: [
    ['taille',      ['taille', 'taillecontact', 'tailledecontact', 'size']],
    ['intensite',   ['intensite', 'courant', 'courantnominal', 'current']],
    ['chuteMax',    ['chutemax', 'chute', 'chutemaxneuf', 'mv']],
    ['resistance',  ['resistance', 'rmax', 'resistancemax', 'rmaxneuf', 'mohm']],
    ['resistanceFin', ['resistancefindevie', 'findevie', 'rfindevie', 'resistanceconception']],
    ['note',        ['note', 'notes', 'observation', 'remarque', 'commentaire', 'source']]],
  tailles: [
    ['famille',     ['famille', 'norme', 'family']],
    ['taille',      ['taille', 'taillecontact', 'tailledecontact', 'size']],
    ['jaugeMin',    ['jaugemin', 'awgmin', 'jaugefine', 'gaugemin', 'minawg']],
    ['jaugeMax',    ['jaugemax', 'awgmax', 'jaugegrosse', 'gaugemax', 'maxawg']],
    ['note',        ['note', 'notes', 'observation', 'remarque', 'commentaire']]],
  gaines: [
    ['famille',     ['famille', 'gaine', 'norme', 'family']],
    ['reference',   ['reference', 'ref', 'code', 'designation']],
    ['role',        ['role', 'nature', 'usage']],
    ['dmin',        ['dmin', 'toronmin', 'diametremin']],
    ['dmax',        ['dmax', 'toronmax', 'diametremax']],
    ['dint',        ['dint', 'dintmm', 'diametreinterieur', 'interieur', 'di']],
    ['dext',        ['dext', 'dextmm', 'diametreexterieur', 'exterieur', 'de']],
    ['masse',       ['masse', 'massegm', 'gm', 'poids']],
    ['note',        ['note', 'notes', 'observation', 'remarque', 'commentaire']]],
  colliers: [
    ['reference',   ['reference', 'ref', 'collier', 'bandit', 'designation']],
    ['type',        ['type', 'nature', 'genre']],
    ['largeur',     ['largeur', 'largeurmm', 'width']],
    ['longueur',    ['longueur', 'longueurmm', 'length']],
    ['dmin',        ['dmin', 'diametremin', 'min', 'toronmin']],
    ['dmax',        ['dmax', 'diametremax', 'max', 'toronmax']],
    ['tenue',       ['tenue', 'tenuen', 'resistance', 'traction']],
    ['temperature', ['temperature', 'temperaturec', 'tmax']],
    ['note',        ['note', 'notes', 'observation', 'remarque', 'commentaire']]],
  filetages: [
    ['famille',     ['famille', 'connecteur', 'norme', 'family']],
    ['taille',      ['taille', 'tailleboitier', 'shellsize', 'boitier', 'size']],
    ['lettre',      ['lettre', 'letter', 'code']],
    ['filetage',    ['filetage', 'thread', 'filetageaccessoire']],
    ['dmaxBoitier', ['dmaxboitier', 'dmax', 'diametreboitier', 'obmax']],
    ['note',        ['note', 'notes', 'observation', 'remarque', 'commentaire']]],
  entrees: [
    ['code',        ['code', 'entree', 'codeentree', 'cableentry']],
    ['dmin',        ['dmin', 'toronmin', 'diametremin', 'min']],
    ['dmax',        ['dmax', 'toronmax', 'diametremax', 'max']],
    ['tailleMin',   ['taillesmin', 'taillemin', 'boitiermin']],
    ['tailleMax',   ['taillesmax', 'taillemax', 'boitiermax']],
    ['note',        ['note', 'notes', 'observation', 'remarque', 'commentaire']]],
  raccords: [
    ['famille',     ['famille', 'connecteur', 'family']],
    ['taille',      ['taille', 'tailleboitier', 'shellsize', 'boitier', 'size']],
    ['type',        ['type', 'typederaccord', 'style']],
    ['orientation', ['orientation', 'forme', 'sens']],
    ['norme',       ['normeraccord', 'norme', 'standard', 'en3660']],
    ['materiau',    ['materiau', 'matiere', 'material']],
    ['fini',        ['fini', 'finition', 'finish', 'revetement']],
    ['amin',        ['amin', 'toronmin', 'cableentrymin']],
    ['amax',        ['amax', 'toronmax', 'cableentrymax']],
    ['b',           ['b', 'coteb', 'dgaine']],
    ['c',           ['c', 'cotec', 'plateforme', 'dmanchon']],
    ['d',           ['d', 'coted', 'sortie']],
    ['masse',       ['masse', 'massegm', 'poids', 'g']],
    ['reference',   ['reference', 'ref', 'designation', 'partnumber', 'pn']],
    ['statut',      ['statut', 'status', 'confiance']],
    ['note',        ['note', 'notes', 'observation', 'remarque', 'commentaire']]],
  manchons: [
    ['forme',       ['forme', 'type', 'orientation']],
    ['designation', ['designation', 'vg', 'norme']],
    ['reference',   ['reference', 'ref', 'partnumber', 'pn']],
    ['ha',          ['ha', 'havant', 'hmax']],
    ['hb',          ['hb', 'hapres', 'hmin']],
    ['ja',          ['ja', 'javant', 'jmax']],
    ['jb',          ['jb', 'japres', 'jmin']],
    ['p',           ['p', 'longueur', 'longueurtotale']],
    ['r',           ['r', 'longueurtoron']],
    ['jo',          ['jo', 'levre']],
    ['masse',       ['masse', 'massegm', 'poids', 'g']],
    ['note',        ['note', 'notes', 'observation', 'remarque', 'commentaire']]],
  calibrations: [
    ['famille',     ['famille', 'family', 'serie']],
    ['norme',       ['norme', 'standard', 'spec']],
    ['temperature', ['temperature', 'temperaturec', 'ambiante', 't']],
    ['tient',       ['tient', 'musthold', 'hold', 'tenue']],
    ['declenche',   ['declenche', 'musttrip', 'trip', 'ultimatetrip']],
    ['t200min',     ['t200min', 't200']],
    ['t200max',     ['t200max']],
    ['t500min',     ['t500min', 't500']],
    ['t500max',     ['t500max']],
    ['t1000min',    ['t1000min', 't1000']],
    ['t1000max',    ['t1000max']],
    ['source',      ['source', 'note', 'origine']]],
  disjoncteursFamilles: [
    ['famille',     ['famille', 'family', 'serie', 'prefixe']],
    ['norme',       ['norme', 'standard', 'spec']],
    ['poles',       ['poles', 'pole', 'nbpoles']],
    ['calibres',    ['calibres', 'gamme', 'ratings']],
    ['tension',     ['tension', 'reseau', 'voltage']],
    ['compense',    ['compense', 'compensation', 'tempcomp']],
    ['tmin',        ['tmin', 'temperaturemin', 'ambiantemin']],
    ['tmax',        ['tmax', 'temperaturemax', 'ambiantemax']],
    ['masse',       ['masse', 'massegm', 'poids', 'g']],
    ['courbe',      ['courbe', 'courbes', 'famillecourbe']],
    ['note',        ['note', 'notes', 'observation', 'remarque', 'commentaire']]],
  protections: [
    ['jauge',       ['jauge', 'awg', 'gauge']],
    ['disjoncteurMax', ['disjoncteurmax', 'calibremax', 'cbmax', 'disjoncteur']],
    ['fusibleMax',  ['fusiblemax', 'fusible', 'fusemax']],
    ['tailleContact', ['taillecontact', 'contact', 'taille']],
    ['iContact',    ['icontact', 'intensitecontact', 'courantcontact']],
    ['note',        ['note', 'notes', 'observation', 'remarque', 'commentaire', 'source']]],
  cables: [
    ['cable',       ['cable', 'cablecode', 'codecable', 'typedecable']],
    ['famille',     ['famille', 'wiretype', 'typedefil', 'serie']],
    ['jauge',       ['jauge', 'gauge', 'awg', 'jaugeawg']],
    ['brins',       ['brins', 'conducteurs', 'nbrins', 'cores']],
    ['blindage',    ['blindage', 'brinshield', 'blinde', 'shield', 'ecran']],
    ['nature',      ['nature', 'type', 'construction', 'genre']],
    ['masse',       ['masse', 'gm', 'masselineique', 'poids', 'gparm']],
    ['liaisons',    ['liaisons', 'nliaisons', 'circuits']],
    ['resistance',  ['resistance', 'rmm', 'rmohmm', 'rmohm', 'r', 'resistancelineique', 'ohmkm']],
    ['diametre',    ['diametre', 'dext', 'dextmm', 'diametreexterieur', 'd']],
    ['section',     ['section', 'smm', 'smm2', 's', 'sectionmm2']],
    ['note',        ['note', 'notes', 'observation', 'remarque', 'commentaire']]],
  disjoncteurs: [
    ['famille',     ['famille', 'disjoncteur', 'norme', 'family']],
    ['courbe',      ['courbe', 'nom', 'serie', 'curve']],
    ['temperature', ['temperature', 'temp', 'degres', 'degre', 'c']],
    ['multiple',    ['multiple', 'multiples', 'multiplesin', 'multipledein', 'xin', 'iin']],
    ['temps',       ['temps', 'tempsdedeclenchement', 'secondes', 'duree', 'time']],
    ['note',        ['note', 'notes', 'observation', 'remarque', 'commentaire']]],
  contacts: [
    ['famille',     ['norme', 'famille', 'connecteur', 'family']],
    ['sexe',        ['sexe', 'genre', 'typedecontact', 'contacttype', 'mf']],
    ['taille',      ['taille', 'taillecontact', 'tailledecontact', 'size', 'cavite']],
    ['typeFil',     ['typedefil', 'typefil', 'fil', 'wiretype', 'codefil', 'codedefil']],
    ['jauge',       ['jauge', 'awg', 'gauge', 'jaugeawg', 'wiregauge']],
    ['reference',   ['contact', 'reference', 'ref', 'partnumber', 'pn', 'partnumber1']],
    ['accessoire',  ['accessoire', 'fourreau', 'additif', 'additive', 'additivepn', 'additivepn1', 'accessoires']],
    ['note',        ['note', 'notes', 'observation', 'remarque', 'commentaire']]],
  modules: [
    ['famille',     ['famille', 'norme', 'family']],
    ['variante',    ['variante', 'variantedinterconnexion', 'interconnexion', 'code', 'codedarrangement', 'arrangement']],
    ['reference',   ['designation', 'reference', 'ref', 'partnumber', 'pn']],
    ['type',        ['type', 'typedemodule']],
    ['taille',      ['taille', 'taillecontact', 'tailledecontact', 'size']],
    ['disposition', ['disposition', 'face', 'implantation']],
    ['groupes',     ['groupes', 'groupe', 'interconnexions']],
    ['poids',       ['masse', 'poids', 'masseg']],
    ['hauteur',     ['hauteur', 'hauteurmm', 'h']],
    ['diodes',      ['diodes', 'diode']],
    ['usage',       ['usage', 'utilisation']],
    ['corps',       ['corps', 'forme', 'boitier']],
    ['emploi',      ['emploi', 'pour', 'application']],
    ['note',        ['note', 'notes', 'observation', 'remarque', 'commentaire']]]
};
const TABLE_NORME = {
  familles: c => c.famille != null && c.reference == null && (c.pas != null || c.intensite != null || c.filsParCote != null || c.ordre != null || c.jaugeMin != null),
  fils: c => c.jauge != null && (c.section != null || c.resistance != null || c.intensite != null),
  declassements: c => c.condition != null && c.facteur != null,
  reseau: c => c.tension != null && c.chuteMax != null,
  cablesFamilles: c => c.famille != null && c.conducteur != null,
  resistancesContacts: c => c.taille != null && c.resistance != null && c.famille == null && c.jaugeMin == null && c.sexe == null,
  tailles: c => c.taille != null && c.jaugeMin != null,
  modules: c => c.variante != null && c.groupes != null,
  contacts: c => c.sexe != null && c.taille != null && c.reference != null,
  disjoncteurs: c => c.multiple != null && c.temps != null,
  cables: c => c.cable != null && c.brins != null,
  gaines: c => c.famille != null && c.reference != null && (c.dint != null || c.dmax != null) && c.type == null && c.ha == null,
  colliers: c => c.reference != null && c.famille == null && c.filetage == null && c.ha == null && (c.dmin != null || c.dmax != null || c.longueur != null),
  filetages: c => c.filetage != null && c.taille != null,
  entrees: c => c.code != null && c.dmin != null && c.dmax != null && c.reference == null && c.famille == null,
  raccords: c => c.famille != null && c.type != null && c.orientation != null,
  manchons: c => c.ha != null && c.ja != null,
  calibrations: c => c.tient != null && c.declenche != null,
  disjoncteursFamilles: c => c.poles != null && c.calibres != null,
  protections: c => c.jauge != null && c.disjoncteurMax != null
};
/* Un nombre d'atelier : virgule ou point, une unité derrière (« 5 mm », « 0,8 »). */
const NUMERO = v => { const t = String(v == null ? '' : v).trim().replace(',', '.'); if (!t) return null; const m = /-?\d+(\.\d+)?/.exec(t); return m ? parseFloat(m[0]) : null; };
/* Une liste de nombres d'atelier : « 2 4 8 12 20 », « 1 2 2,5 3 » (la virgule est décimale quand des espaces séparent),
   « 1,2,3 » (sans espace, la virgule sépare). */
const LISTE_NUM = v => { const t = String(v == null ? '' : v).trim(); if (!t) return []; return t.split(/[\s/|]/.test(t) ? /[\s/|]+/ : /[,;]+/).map(NUMERO).filter(x => x != null); };
const MOT = v => String(v == null ? '' : v).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
/* Les jauges AWG comptent à l'envers : « min » est la plus fine acceptée. */
function familleNorme(o) { const famille = String(o.famille || '').trim(); if (!famille) return null;
  const jauges = [NUMERO(o.jaugeMin), NUMERO(o.jaugeMax)].filter(x => x != null), norme = String(o.norme || '').trim() || famille;
  return { norme, famille, exemple: /exemple|example|fictif|fausse/.test(MOT(norme) + ' ' + MOT(o.note)), nature: MOT(o.nature) || 'jonction', variantes: LISTE_NUM(o.variantes), pas: NUMERO(o.pas),
           jaugeMin: jauges.length ? Math.max(...jauges) : null, jaugeMax: jauges.length ? Math.min(...jauges) : null, intensite: NUMERO(o.intensite), resistance: NUMERO(o.resistance),
           filsParCote: Math.max(1, Math.round(NUMERO(o.filsParCote) || 1)), ordre: /crois|ordre|suite/.test(MOT(o.ordre)) ? 'croissant' : 'libre',
           paquets: /contig|voisin|adjac/.test(MOT(o.paquets)) ? 'contigus' : 'libres', reserves: LISTE_NUM(o.reserves), masse: /paquet|oui|^x$|^1$|vrai/.test(MOT(o.masse)) ? 'par paquet' : '',
           note: String(o.note || '').trim() }; }
/* Un fil de la norme : par type (« * » : tous) et jauge, la section, la résistance (Ω/km), l'intensité admissible en
   continu et, quand la norme les donne (EN 2853), par durée — 2 s, 10 s, 1 min —, la chute pour 10 m, la température
   nominale Tr (la table vaut pour un échauffement de 40 °C depuis 95 °C). */
function filNorme(o) { const jauge = NUMERO(o.jauge); if (jauge == null) return null;
  return { type: String(o.type || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || '*', jauge, code: String(o.code || '').trim(), brins: String(o.brins || '').trim(), section: NUMERO(o.section),
           resistance20: NUMERO(o.resistance20), resistance: NUMERO(o.resistance), intensite: NUMERO(o.intensite),
           i2s: NUMERO(o.i2s), i10s: NUMERO(o.i10s), i1min: NUMERO(o.i1min), chute10m: NUMERO(o.chute10m), tr: NUMERO(o.tr), note: String(o.note || '').trim() }; }
/* Ce qu'un fil admet pour une durée : le palier de l'EN 2853 juste au-dessus (2 s, 10 s, 1 min), sinon le continu. */
const palierDe = duree => !(duree > 0) || !isFinite(duree) ? Infinity : duree <= 2 ? 2 : duree <= 10 ? 10 : duree <= 60 ? 60 : Infinity;
function intensiteAdmise(fil, duree) { if (!fil) return null; const p = palierDe(duree);
  for (const [t, i] of [[2, fil.i2s], [10, fil.i10s], [60, fil.i1min]]) if (p <= t && i != null) return i; return fil.intensite; }
/* La note 2 de l'EN 2853 : pour une ambiante Tu autre que 95 °C, I2 = I1 × √((Tr − Tu)/40). Un fil sans Tr n'en sait rien. */
const facteurAmbiante = (fil, Tu) => fil && fil.tr != null && Tu != null ? Math.sqrt(Math.max(0, fil.tr - Tu) / 40) : 1;
/* Un point de DÉCLASSEMENT : une condition (faisceau, altitude…), et pour la lire, le nombre de fils du faisceau et sa
   charge en % (fig. 11-5 de l'AC 43.13-1B), ou l'altitude en pieds (fig. 11-6) ; le facteur sur l'intensité admissible. */
function declassementNorme(o) { const condition = MOT(o.condition), facteur = NUMERO(o.facteur); return condition && facteur != null ? { condition, fils: NUMERO(o.fils), charge: NUMERO(o.charge), altitude: NUMERO(o.altitude), facteur, note: String(o.note || '').trim() } : null; }
/* Le RÉSEAU : par tension, la chute admise en continu et en intermittent (≤ 2 min), en volts et en %. */
function reseauNorme(o) { const tension = NUMERO(o.tension); return tension == null ? null : { tension, nature: String(o.nature || '').trim(), chuteMax: NUMERO(o.chuteMax), chuteInter: NUMERO(o.chuteInter), chutePct: NUMERO(o.chutePct), note: String(o.note || '').trim() }; }
/* Une FAMILLE DE CÂBLES (normes/cables.csv, table Familles de câbles) : les familles qu'une ligne couvre (« DRB DRC
   DRD »), la norme, le conducteur — cuivre, CCA (aluminium cuivré) ou aluminium —, la tenue en température et en
   tension, l'isolant, le blindage, le rayon de courbure (× Ø), le marquage. */
const CONDUCTEUR = t => { const u = MOT(t); return !u ? '' : /cca|clad|cuivr.*alu|alu.*cuivr/.test(u) ? 'CCA' : /alu/.test(u) ? 'aluminium' : /cuivre|copper|\bcu\b/.test(u) ? 'cuivre' : String(t).trim(); };
function cableFamilleNorme(o) { const familles = String(o.famille || '').toUpperCase().split(/[\s,/|]+/).map(cleNorme).filter(Boolean); if (!familles.length) return null;
  return { familles, norme: String(o.norme || '').trim(), conducteur: CONDUCTEUR(o.conducteur), placage: String(o.placage || '').trim(), tmin: NUMERO(o.tmin), tmax: NUMERO(o.tmax), tension: NUMERO(o.tension), frequence: NUMERO(o.frequence),
           isolant: String(o.isolant || '').trim(), blindage: String(o.blindage || '').trim(), rayon: NUMERO(o.rayon), marquage: String(o.marquage || '').trim(), note: String(o.note || '').trim() }; }
/* La RÉSISTANCE D'UN CONTACT par taille (normes/contacts.csv, table Résistance des contacts : AS39029, paire sertie et
   accouplée, neuve) : le courant nominal, la chute max aux bornes (mV), la résistance max à neuf et celle de conception
   (fin de vie), en mΩ. */
function resistanceContactNorme(o) { const taille = tailleCle(o.taille), resistance = NUMERO(o.resistance); if (!taille || resistance == null) return null;
  return { taille, intensite: NUMERO(o.intensite), chuteMax: NUMERO(o.chuteMax), resistance, resistanceFin: NUMERO(o.resistanceFin), note: String(o.note || '').trim() }; }
/* Une ligne d'une COURBE DE DISJONCTION (normes/disjoncteurs.csv) : la famille de disjoncteurs, la courbe (sa
   température), un multiple du courant nominal et le temps de déclenchement en secondes. */
function disjonctionNorme(o) { const multiple = NUMERO(o.multiple), temps = NUMERO(o.temps); if (multiple == null || temps == null || multiple <= 0 || temps <= 0) return null;
  return { famille: cleNorme(o.famille) || 'DISJONCTEUR', courbe: String(o.courbe || '').trim() || String(o.temperature || '').trim() || '—', temperature: NUMERO(o.temperature), multiple, temps }; }
/* Un CÂBLE de la base des câbles (normes/cables.csv, l'Excel du lecteur) : le type tel que le retest l'écrit (DR24,
   MLB22, KD24, WC…), sa famille, sa jauge, ses brins, s'il est blindé, sa nature, sa masse (g/m), les liaisons qu'il
   porte, sa résistance (mΩ/m, soit des Ω/km), son diamètre extérieur (mm) et sa section (mm²). */
function cableNorme(o) { const cable = cleNorme(o.cable); if (!cable) return null; const brins = NUMERO(o.brins);
  return { cable, famille: cleNorme(o.famille) || typeDuFil(cable), jauge: NUMERO(o.jauge), brins: brins == null ? 1 : Math.max(1, Math.round(brins)), blindage: /^(1|oui|x|vrai|true)$/i.test(String(o.blindage || '').trim()) || NUMERO(o.blindage) > 0,
           nature: String(o.nature || '').trim(), masse: NUMERO(o.masse), liaisons: NUMERO(o.liaisons), resistance: NUMERO(o.resistance), diametre: NUMERO(o.diametre), section: NUMERO(o.section), note: String(o.note || '').trim() }; }
/* Une GAINE (HFA, Nomex) et un COLLIER band-it (normes/raccords.csv). */
/* Une gaine : un surblindage (tresse cuivre : Dint / Dext, le toron passe dans Dint) ou une protection (une tresse
   expansible : la plage de toron Dmin / Dmax qu'elle habille). */
function gaineNorme(o) { const reference = String(o.reference || '').trim(), dint = NUMERO(o.dint), dmin = NUMERO(o.dmin), dmax = NUMERO(o.dmax); if (!reference || (dint == null && dmax == null)) return null;
  const role = /blind|tresse|cuivre|shield/.test(MOT(o.role)) || (dint != null && dmax == null && /HFA|DHS754/i.test(reference + ' ' + o.famille)) ? 'surblindage' : 'protection';
  return { famille: cleNorme(o.famille) || 'GAINE', reference, role, dmin, dmax, dint, dext: NUMERO(o.dext), masse: NUMERO(o.masse), note: String(o.note || '').trim() }; }
/* Un collier : un band-it (par le diamètre de ce qu'il serre) ou un tyrap (par sa longueur, sa largeur, le toron maximal). */
function collierNorme(o) { const reference = String(o.reference || '').trim(); if (!reference) return null; const t = MOT(o.type);
  return { reference, type: /tyrap|serre|tie|collierplast|nylon|polyamide/.test(t) || /^NSA9354/i.test(reference) ? 'tyrap' : 'band-it', largeur: NUMERO(o.largeur), longueur: NUMERO(o.longueur), dmin: NUMERO(o.dmin), dmax: NUMERO(o.dmax), tenue: NUMERO(o.tenue), temperature: NUMERO(o.temperature), note: String(o.note || '').trim() }; }
const TAILLE_BOITIER = v => { const t = String(v == null ? '' : v).trim().toUpperCase(); return /^\d$/.test(t) ? '0' + t : t; };
function filetageNorme(o) { const famille = cleNorme(o.famille), taille = TAILLE_BOITIER(o.taille), filetage = String(o.filetage || '').trim(); if (!famille || !taille || !filetage) return null;
  return { famille, taille, lettre: String(o.lettre || '').trim().toUpperCase(), filetage, dmaxBoitier: NUMERO(o.dmaxBoitier), note: String(o.note || '').trim() }; }
function entreeNorme(o) { const code = TAILLE_BOITIER(o.code), dmin = NUMERO(o.dmin), dmax = NUMERO(o.dmax); if (!code || dmin == null || dmax == null) return null;
  return { code, dmin, dmax, tailleMin: TAILLE_BOITIER(o.tailleMin), tailleMax: TAILLE_BOITIER(o.tailleMax), note: String(o.note || '').trim() }; }
const TYPE_RACCORD = t => { const u = MOT(t); return /durci|k|blind.*etanch/.test(u) && !/serre/.test(u) ? 'durci' : /manchon|j\b/.test(u) ? 'pour manchon' : /serre|clamp/.test(u) ? 'serre-câble' : /tyrap|tie|collier/.test(u) ? 'tyrap' : /chemin/.test(u) ? 'cheminée' : String(t || '').trim(); };
function raccordNorme(o) { const famille = cleNorme(o.famille), type = TYPE_RACCORD(o.type); if (!famille || !type) return null;
  return { famille, taille: TAILLE_BOITIER(o.taille), type, orientation: /coud|90|45|angle/.test(MOT(o.orientation)) ? 'coudé' : 'droit', norme: String(o.norme || '').trim(), materiau: String(o.materiau || '').trim(), fini: String(o.fini || '').trim(),
           amin: NUMERO(o.amin), amax: NUMERO(o.amax), b: NUMERO(o.b), c: NUMERO(o.c), d: NUMERO(o.d), masse: NUMERO(o.masse), reference: String(o.reference || '').trim(), statut: String(o.statut || '').trim(), note: String(o.note || '').trim() }; }
function manchonNorme(o) { const ha = NUMERO(o.ha), ja = NUMERO(o.ja), designation = String(o.designation || '').trim(); if (ha == null || ja == null || !designation) return null;
  return { forme: /coud|90|angle/.test(MOT(o.forme)) ? 'coudé' : /long|sortie/.test(MOT(o.forme)) ? 'sortie longue' : 'droit', designation, reference: String(o.reference || '').trim(), ha, hb: NUMERO(o.hb), ja, jb: NUMERO(o.jb), p: NUMERO(o.p), r: NUMERO(o.r), jo: NUMERO(o.jo), masse: NUMERO(o.masse), note: String(o.note || '').trim() }; }
function calibrationNorme(o) { const tient = NUMERO(o.tient), declenche = NUMERO(o.declenche), temperature = NUMERO(o.temperature); if (tient == null && declenche == null) return null;
  return { famille: String(o.famille || '').trim(), norme: String(o.norme || '').trim(), temperature, tient, declenche, t200: [NUMERO(o.t200min), NUMERO(o.t200max)], t500: [NUMERO(o.t500min), NUMERO(o.t500max)], t1000: [NUMERO(o.t1000min), NUMERO(o.t1000max)], source: String(o.source || '').trim() }; }
function disjoncteurFamilleNorme(o) { const nom = String(o.famille || '').trim(); if (!nom) return null;
  return { famille: cleNorme(nom), nom, norme: String(o.norme || '').trim(), poles: NUMERO(o.poles) || 1, calibres: LISTE_NUM(o.calibres), tension: String(o.tension || '').trim(), compense: /^(oui|yes|o|y|1|true)/i.test(String(o.compense || '').trim()), tmin: NUMERO(o.tmin), tmax: NUMERO(o.tmax), masse: NUMERO(o.masse), courbe: String(o.courbe || '').trim(), note: String(o.note || '').trim() }; }
function protectionNorme(o) { const jauge = NUMERO(o.jauge), disjoncteurMax = NUMERO(o.disjoncteurMax); if (jauge == null || disjoncteurMax == null) return null;
  return { jauge, disjoncteurMax, fusibleMax: NUMERO(o.fusibleMax), tailleContact: String(o.tailleContact || '').trim().toUpperCase(), iContact: NUMERO(o.iContact), note: String(o.note || '').trim() }; }
const ENTREE_NORME = { familles: familleNorme, fils: filNorme, declassements: declassementNorme, reseau: reseauNorme, tailles: tailleNorme, modules: moduleNorme, contacts: contactNorme, disjoncteurs: disjonctionNorme, cables: cableNorme, gaines: gaineNorme, colliers: collierNorme,
  filetages: filetageNorme, entrees: entreeNorme, raccords: raccordNorme, manchons: manchonNorme, calibrations: calibrationNorme, disjoncteursFamilles: disjoncteurFamilleNorme, protections: protectionNorme, cablesFamilles: cableFamilleNorme, resistancesContacts: resistanceContactNorme };
const TABLES_NORME = ['familles', 'fils', 'declassements', 'reseau', 'tailles', 'modules', 'contacts', 'disjoncteurs', 'cables', 'gaines', 'colliers', 'filetages', 'entrees', 'raccords', 'manchons', 'calibrations', 'disjoncteursFamilles', 'protections', 'cablesFamilles', 'resistancesContacts'];
const normeVide = () => { const N = { tables: 0 }; TABLES_NORME.forEach(t => { N[t] = []; }); return N; };
/* Lire une norme : les tables se suivent (un titre libre, la ligne d'en-tête,
   les lignes, une ligne vide), dans un CSV ou une feuille Excel. */
function lireNorme(texte) { const N = normeVide(); let table = null, col = null;
  // les tables les plus précises d'abord : une table de tailles nomme aussi sa famille et ses jauges, comme une table de familles
  const entete = row => { for (const nom of ['calibrations', 'protections', 'disjoncteursFamilles', 'cablesFamilles', 'resistancesContacts', 'filetages', 'entrees', 'raccords', 'manchons', 'gaines', 'colliers', 'cables', 'disjoncteurs', 'contacts', 'modules', 'tailles', 'familles', 'fils', 'declassements', 'reseau']) { const cles = COLONNES_NORME[nom]; const c = {}; row.forEach((cell, i) => { const t = NORMA(cell); if (!t) return;
      for (const [champ, alias] of cles) if (c[champ] == null && alias.includes(t)) { c[champ] = i; break; } });
    if (TABLE_NORME[nom](c)) return { nom, col: c }; } return null; };
  String(texte || '').split(/\r?\n/).forEach(ligne => { if (!ligne.trim()) { table = null; return; }
    const row = cellules(ligne), e = entete(row); if (e) { table = e.nom; col = e.col; N.tables++; return; }
    if (!table) return; const o = {}; Object.entries(col).forEach(([champ, i]) => { o[champ] = row[i] == null ? '' : row[i]; });
    const x = ENTREE_NORME[table](o); if (x) N[table].push(x); });
  return N; }
const normeLue = N => !!N && TABLES_NORME.some(t => (N[t] || []).length > 0);
/* Un fichier de normes : chaque feuille d'un Excel est lue (une table par
   feuille, ou plusieurs à la suite) ; un CSV d'un bloc. */
async function lireNormeFichier(fichier) { const nom = (fichier.name || '').toLowerCase();
  if (!(/\.xls[xm]?$/.test(nom) || /sheet|excel/.test(fichier.type || ''))) return lireNorme(await fichier.text());
  if (typeof XLSX === 'undefined') throw new Error('bibliothèque Excel absente');
  const wb = XLSX.read(await fichier.arrayBuffer(), { type: 'array' });
  const feuilles = wb.SheetNames.map(n => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, blankrows: true, defval: '' }).map(r => (Array.isArray(r) ? r : [r]).map(c => c == null ? '' : String(c)).join('\t')).join('\n'));
  return lireNorme(feuilles.join('\n\n')); }
/* Deux normes en une : ce qui vient en second remplace ce qui porte la même
   clé (famille, type+jauge, condition, tension). C'est ainsi qu'une norme de
   barrettes et une norme de fils, importées l'une après l'autre, se complètent. */
function fusionnerNormes(a, b) { const N = normeVide(); const cle = { familles: x => x.famille.toUpperCase(), fils: x => x.type + '/' + x.jauge, declassements: x => [x.condition, x.fils, x.charge, x.altitude].join('/'), reseau: x => String(x.tension),
    tailles: x => x.famille + '/' + x.taille, modules: x => x.famille + '/' + x.variante, contacts: x => [x.famille, x.sexe, x.taille, x.typeFil, x.jauge, x.reference].join('/'),
    disjoncteurs: x => [x.famille, x.courbe, x.multiple, x.temps].join('/'), cables: x => x.cable, gaines: x => x.famille + '/' + x.reference, colliers: x => x.reference,
    filetages: x => x.famille + '/' + x.taille, entrees: x => x.code, raccords: x => [x.famille, x.taille, x.type, x.orientation].join('/'), manchons: x => x.designation, calibrations: x => x.famille + '/' + x.temperature, disjoncteursFamilles: x => x.famille, protections: x => String(x.jauge),
    cablesFamilles: x => x.familles.join(' '), resistancesContacts: x => x.taille };
  Object.keys(cle).forEach(t => { const m = new Map(); [...(a ? a[t] || [] : []), ...(b ? b[t] || [] : [])].forEach(x => m.set(cle[t](x), x)); N[t] = [...m.values()]; });
  N.tables = (a ? a.tables : 0) + (b ? b.tables : 0); return N; }
/* La norme embarquée : normes/*.csv, mis dans la page à la construction. */
function normeEmbarquee() { return lireNorme(typeof NORME_EMBARQUEE === 'string' ? NORME_EMBARQUEE : ''); }
const normeExemple = N => !!(N && N.familles.length && N.familles.every(f => f.exemple));
/* La famille d'une référence : celle que la bible lui donne, sinon la plus
   longue famille de la norme dont la référence commence par le nom. */
function familleDeNorme(norme, famille, reference) { if (!norme) return null; const F = norme.familles;
  if (famille) { const f = F.find(x => x.famille.toUpperCase() === String(famille).toUpperCase()); if (f) return f; }
  const ref = String(reference || '').toUpperCase(); if (!ref) return null;
  return F.filter(x => ref.startsWith(x.famille.toUpperCase())).sort((u, v) => v.famille.length - u.famille.length)[0] || null; }
/* Le type d'un fil est en tête de son code : DR24 → DR, MLB22 → MLB. */
const typeDuFil = type => { const m = /^([A-Za-z]+)/.exec(String(type || '').trim()); return m ? m[1].toUpperCase() : ''; };
/* LA BASE DES CÂBLES : les câbles de la norme de l'atelier, sinon ceux de la norme embarquée. Un type du retest se
   retrouve tel quel (DR24), sinon par sa famille et sa jauge (typeDuFil + jaugeDuType). */
const cablesDe = norme => (norme && norme.cables && norme.cables.length) ? norme.cables : (!norme || normeLue(norme)) ? (normeDesModules(norme).cables || []) : [];
function cableDuType(norme, type) { const t = cleNorme(type); if (!t) return null; const C = cablesDe(norme);
  const exact = C.find(c => c.cable === t); if (exact) return exact;
  const fam = typeDuFil(type), j = jaugeDuType(type); return (fam && j != null && C.find(c => c.famille === fam && c.jauge === j)) || null; }
/* LA FAMILLE D'UN CÂBLE (table Familles de câbles) : par le type du fil (DR24 → DR), la ligne qui couvre la famille. */
function cableFamilleDe(norme, type) { const f = typeDuFil(type); if (!f) return null; const T = (normeDesModules(norme).cablesFamilles || []);
  return T.find(x => x.familles.includes(f)) || null; }
/* La résistance d'un conducteur à T °C depuis sa valeur à 20 °C : × (234,5 + T)/254,5 pour le cuivre (et le CCA, cuivre
   en surface), × (238,1 + T)/258,1 pour l'aluminium — la formule de l'AC 43.13-1B § 11-66 (α ≈ 0,00393/K) : 20 °C → 1,
   70 °C → 1,20, 95 °C → 1,29, 135 °C → 1,45. */
const coefTemperature = (T, conducteur) => T == null ? 1 : conducteur === 'aluminium' ? (238.1 + T) / 258.1 : (234.5 + T) / 254.5;
/* La résistance d'un fil, en Ω/km, à la température du conducteur T (20 °C par défaut — la convention de la base des
   câbles et des fiches constructeur) : une ligne Fils de son type exact (une norme importée qui distingue les types) ;
   sinon son câble dans la base (R à 20 °C) ; sinon la ligne de sa jauge (EN 2853, type « * », cuivre : sa R à 20 °C
   quand la table la donne, sinon celle à sa température de table ramenée à 20 °C) — mais pas la jauge seule pour un
   conducteur qui n'est pas du cuivre (AD, VN : aluminium cuivré, 30 à 65 % plus résistant). D'où elle vient est dit,
   et le facteur de température aussi. */
function resistanceDuFil(norme, type, jauge, T) { const fil = filDeNorme(norme, type, jauge), cab = cableDuType(norme, type), fam = cableFamilleDe(norme, type), conducteur = fam && fam.conducteur ? fam.conducteur : 'cuivre';
  const r20 = f => f.resistance20 != null ? f.resistance20 : f.resistance != null ? f.resistance / coefTemperature(f.tr != null ? f.tr : 20, 'cuivre') : null;
  let rho20 = null, source = null;
  if (fil && fil.type !== '*' && !fil.approx && r20(fil) != null) { rho20 = r20(fil); source = 'fil'; }
  else if (cab && cab.resistance != null) { rho20 = cab.resistance; source = 'câble'; }
  else if (fil && r20(fil) != null && conducteur === 'cuivre') { rho20 = r20(fil); source = 'jauge'; }
  const k = coefTemperature(T, conducteur), refuse = rho20 == null && !!fil && conducteur !== 'cuivre';
  // un conducteur qui n'est pas du cuivre, jugé par la ligne cuivre de l'EN 2853 : l'intensité se déclasse de √(R cuivre / R câble) — même échauffement, moins de courant
  const kConducteur = conducteur !== 'cuivre' && fil && fil.type === '*' && cab && cab.resistance > 0 && r20(fil) != null ? Math.sqrt(r20(fil) / cab.resistance) : 1;
  return { rho: rho20 == null ? null : rho20 * k, rho20, k, T: T == null ? 20 : T, source, fil, cab, famille: fam, conducteur, refuse, kConducteur }; }
/* LA TAILLE DE CONTACT d'une jauge : dans la famille (table Tailles : la plus petite taille qui admet la jauge), sinon
   la table Protection (AC 43.13-1B : 22 → 22, 20 → 20, 18 → 16…). */
function tailleDeJauge(norme, famille, jauge) { if (jauge == null) return ''; const N = normeDesModules(norme), f = cleNorme(famille);
  const T = (N.tailles || []).filter(t => (!f || t.famille === f) && t.jaugeMin != null && t.jaugeMax != null && jauge <= t.jaugeMin && jauge >= t.jaugeMax).sort((a, b) => b.calibre - a.calibre);
  if (T.length) return T[0].taille; const p = (N.protections || []).find(x => x.jauge === jauge); return p && p.tailleContact ? p.tailleContact : ''; }
/* LA RÉSISTANCE D'UN CONTACT par sa taille (table Résistance des contacts), en Ω : à neuf, ou de conception (fin de
   vie) si on le demande ; la taille 22D vaut 22. Rien si la table ne la connaît pas. */
function resistanceDeContact(norme, taille, fin) { const t = tailleCle(taille); if (!t) return null; const T = normeDesModules(norme).resistancesContacts || [], num = x => NUMERO(x.replace(/[A-Z]+$/, ''));
  // la taille exacte, sinon la même sans lettre (22D → 22), sinon la taille connue la plus proche en numéro (23 → 22 ; à égalité, la plus petite, qui résiste le plus)
  const r = T.find(x => x.taille === t) || T.find(x => num(x.taille) === num(t)) || (num(t) == null ? null : T.slice().sort((a, b) => Math.abs(num(a.taille) - num(t)) - Math.abs(num(b.taille) - num(t)) || num(b.taille) - num(a.taille))[0]); if (!r) return null;
  return (fin && r.resistanceFin != null ? r.resistanceFin : r.resistance) / 1000; }
/* LE FAISCEAU d'un connecteur : ses câbles (un câble à plusieurs brins ne compte qu'une fois, par son numéro), la
   section cumulée, le diamètre équivalent `deq` (un rond de même section — l'Excel du lecteur : Seq puis Deq), le
   TORON `diametre` = Deq plus la marge de 10 % du tutoriel (FOISONNEMENT), et la masse au mètre. */
const FOISONNEMENT = 1.1;
function faisceauDe(norme, fils) { const vus = new Map(), inconnus = new Set(); let k = 0;
  (fils || []).forEach(f => { if (!f.type) return; const cle = f.cable ? 'W' + f.cable : 'n' + (k++); if (vus.has(cle)) return;
    const c = cableDuType(norme, f.type); if (!c) { inconnus.add(f.type); return; } vus.set(cle, c); });
  const cs = [...vus.values()], section = cs.reduce((s, c) => s + (c.section || 0), 0), masse = cs.reduce((s, c) => s + (c.masse || 0), 0);
  const deq = section > 0 ? 2 * Math.sqrt(section / Math.PI) : null;
  return { n: cs.length, cables: cs, section, deq, diametre: deq != null ? deq * FOISONNEMENT : null, masse, complet: cs.every(c => c.section != null), inconnus: [...inconnus] }; }
/* Le fil de la norme : le type et la jauge exacts ; sinon la jauge seule
   (type « * », ou n'importe quel type — c'est dit : `approx`). */
function filDeNorme(norme, type, jauge) { if (!norme || jauge == null) return null; const t = typeDuFil(type);
  const exact = norme.fils.find(f => f.jauge === jauge && f.type === t); if (exact) return exact;
  const joker = norme.fils.find(f => f.jauge === jauge && f.type === '*'); if (joker) return joker;
  const autre = norme.fils.find(f => f.jauge === jauge); return autre ? { ...autre, approx: true } : null; }
/* LE DÉCLASSEMENT d'une condition, point par point (table Déclassement) : un facteur seul vaut tel quel ; une condition
   à points « fils × charge » (le faisceau, fig. 11-5 de l'AC 43.13-1B) prend le point le plus proche du faisceau simulé
   (le nombre de fils en échelle log, la charge en %) ; une condition à points d'altitude (fig. 11-6) interpole. `ctx` :
   { fils, charge, altitude } — sans rien, le faisceau prend l'exemple de l'AC (8 fils à 60 % : × 0,60), l'altitude 0.
   Rend [{ condition, facteur, point }] ; `facteurDeclassement` en fait le produit. */
const CTX_DECLASSEMENT = { fils: 8, charge: 60, altitude: 0 };
function detailDeclassement(norme, conditions, ctx) { const c = { ...CTX_DECLASSEMENT, ...(ctx || {}) }, D = norme ? norme.declassements : [];
  return (conditions || []).map(nom => { const rows = D.filter(x => x.condition === MOT(nom)); if (!rows.length) return null;
    const alt = rows.filter(x => x.altitude != null).sort((a, b) => a.altitude - b.altitude), fai = rows.filter(x => x.fils != null);
    if (alt.length) { const h = Math.max(0, +c.altitude || 0); if (h <= alt[0].altitude) return { condition: rows[0].condition, facteur: alt[0].facteur, point: alt[0] };
      const j = alt.findIndex(x => x.altitude >= h); if (j < 0) return { condition: rows[0].condition, facteur: alt[alt.length - 1].facteur, point: alt[alt.length - 1] };
      const a = alt[j - 1], b = alt[j], t = (h - a.altitude) / (b.altitude - a.altitude); return { condition: rows[0].condition, facteur: a.facteur + t * (b.facteur - a.facteur), point: b, interpole: true }; }
    if (fai.length) { const n = Math.max(1, +c.fils || CTX_DECLASSEMENT.fils), ch = c.charge != null ? +c.charge : CTX_DECLASSEMENT.charge;
      const d = x => Math.abs(Math.log(n / x.fils)) + Math.abs(ch - (x.charge != null ? x.charge : 100)) / 100;
      const p = fai.slice().sort((a, b) => d(a) - d(b))[0]; return { condition: rows[0].condition, facteur: p.facteur, point: p }; }
    return { condition: rows[0].condition, facteur: rows[0].facteur, point: rows[0] }; }).filter(Boolean); }
function facteurDeclassement(norme, conditions, ctx) { return detailDeclassement(norme, conditions, ctx).reduce((k, d) => k * d.facteur, 1); }
/* La chute admise pour la tension du réseau : la ligne de cette tension, sinon la plus proche. En triphasé la chute
   calculée est composée (entre deux phases) : on la compare à la ligne de la tension composée (115 V → 200 V). */
function chuteAdmise(norme, tension, regime) { if (!norme || !norme.reseau.length) return null; const u = regime === 'tri' ? tension * Math.sqrt(3) : tension;
  return norme.reseau.slice().sort((a, b) => Math.abs(a.tension - u) - Math.abs(b.tension - u))[0]; }

/* ---- le remplissage : chaque fil dans son trou, selon la norme ------------ */
/* Un module (un contact) a un côté AMONT et un côté AVAL, chacun avec autant
   de trous que la famille en donne ; les fils s'y rangent dans l'ordre de
   leur numéro, les trous qui restent sont libres, ce qui déborde est en
   SURCHARGE. Puis la règle de remplissage juge : modules réservés, paquets
   contigus (un peigne ne saute pas un module), ordre croissant, retour de
   masse par paquet (blindage), jauge de chaque fil dans la plage du contact.
   Les ponts (shunts) ne sont pas des fils dans un trou. Rend la physique
   enrichie : famille, trous par module, verdicts. */
function remplirSelonNorme(P, norme) {
  const F = familleDeNorme(norme, P.entree ? P.entree.famille : '', P.reference), n = F ? F.filsParCote : 1;
  const prise = P.nature === 'prise de coupure', mot = prise ? 'contact' : 'module', cote = { amont: prise ? 'fiche' : 'amont', aval: prise ? 'embase' : 'aval' };
  const jaugeOk = j => (F && j != null && F.jaugeMin != null && F.jaugeMax != null) ? (j <= F.jaugeMin && j >= F.jaugeMax) : null;
  const modules = P.modules.map(m => { const fils = m.fils.map(f => { const jauge = jaugeDuType(f.type); return { ...f, jauge, jaugeOk: jaugeOk(jauge) }; });
    const trous = {}; ['amont', 'aval'].forEach(s => { const t = fils.filter(f => (s === 'amont') === !!f.amont).sort((a, b) => triBornes(a.cable, b.cable)); while (t.length < n) t.push(null); trous[s] = t; });
    const surcharge = Math.max(0, trous.amont.length - n) + Math.max(0, trous.aval.length - n);
    return { ...m, fils, trous, surcharge }; });
  const verdicts = [], s = k => k > 1 ? 's' : '', modDe = b => modules.find(m => m.borne === String(b));
  if (F) {
    modules.forEach(m => ['amont', 'aval'].forEach(k => { const c = m.trous[k].filter(Boolean).length; if (c > n) verdicts.push({ niveau: 'ko', texte: `${mot} ${m.borne} : ${c} fils côté ${cote[k]} pour ${n} trou${s(n)}`, bornes: [m.borne] }); }));
    F.reserves.forEach(r => { const m = modDe(r); if (m && m.utilisee) verdicts.push({ niveau: 'ko', texte: `${mot} ${r} réservé par la norme, et pourtant utilisé`, bornes: [m.borne] }); });
    if (F.paquets === 'contigus') P.paquets.forEach(p => { if (!p.ponte) return; const nums = p.bornes.map(Number); if (nums.some(isNaN)) return; nums.sort((a, b) => a - b);
      if (nums.some((v, i) => i && v !== nums[i - 1] + 1)) verdicts.push({ niveau: 'ko', texte: `paquet ${p.bornes.join('-')} : le peigne de pontage ne saute pas un ${mot}`, bornes: p.bornes }); });
    if (F.ordre === 'croissant') { const nums = modules.filter(m => m.utilisee && /^\d+$/.test(m.borne)).map(m => +m.borne); if (nums.length) { const max = Math.max(...nums);
      const creux = modules.filter(m => !m.utilisee && /^\d+$/.test(m.borne) && +m.borne < max).map(m => m.borne);
      if (creux.length) verdicts.push({ niveau: 'attention', texte: `${mot}${s(creux.length)} ${creux.join(', ')} libre${s(creux.length)} avant le ${max} : la norme remplit dans l’ordre`, bornes: creux }); } }
    if (F.masse === 'par paquet') P.paquets.forEach(p => { const fils = p.bornes.flatMap(b => (modDe(b) || { fils: [] }).fils); if (!fils.length) return;
      if (!fils.some(f => estMasse(f.vers))) verdicts.push({ niveau: 'ko', texte: `paquet ${p.bornes.join('-')} sans retour de masse`, bornes: p.bornes }); });
    modules.forEach(m => m.fils.forEach(f => { if (f.jaugeOk === false) verdicts.push({ niveau: 'ko', texte: `${f.cable} (${f.type}) : jauge ${f.jauge} hors de ${F.jaugeMin}–${F.jaugeMax} AWG sur le ${mot} ${m.borne}`, bornes: [m.borne] }); }));
  }
  return { ...P, famille: F, filsParCote: n, cotes: cote, modules, verdicts };
}

/* ---- la simulation : ce que chaque fil subit, sur des hypothèses dites ---- */
/* Le retest ne porte ni longueur ni courant : on les SUPPOSE (longueur du
   fil, courant qui le traverse, tension du réseau, conditions de
   déclassement), on le dit, et on calcule, fil par fil :
     I fil     = intensité du fil (norme) × facteur de déclassement
     I contact = intensité du contact (norme, sinon la bible)
     R         = ρ (Ω/km) / 1000 × L (m) + R contact (mΩ) / 1000
     ΔU        = R × I, en V, et en % de la tension
   Le verdict, dans l'ordre : jauge hors plage · le courant dépasse le fil ·
   dépasse le contact · la chute dépasse ce que le réseau admet · fil
   inconnu de la norme · ok. */
/* Les hypothèses de la simulation : la longueur simple du câble, le courant (par phase), la tension du réseau,
   l'ambiante, la TEMPÉRATURE DU CONDUCTEUR (20 °C : la convention des fiches et de la base des câbles ; 135 °C : la
   table de l'EN 2853, le cas le plus défavorable), le RÉGIME — continu (ΔU = R × I), monophasé (ΔU = I × (R cos φ
   + X sin φ)) ou triphasé (ΔU composée, entre deux phases : √3 × I × (R cos φ + X sin φ), I par phase, jamais la
   somme des phases ; comparée à la ligne 200 V du réseau) —, cos φ (0,8 en régime permanent, 0,35 au démarrage d'un
   moteur), la réactance X en mΩ/m (négligée sous 10 mm² de cuivre, à saisir au-delà : à 400 Hz, X vaut l'ordre de R
   dès le 6–8 AWG pour un fil seul — l'Excel du lecteur suspend le calcul), la charge du faisceau (% de ce que ses fils
   admettent ensemble) et l'altitude (pieds) pour le déclassement. */
const HYPOTHESES = { longueur: 5, courant: 2, tension: 28, ambiante: 95, tconducteur: 20, regime: 'continu', cosphi: 0.8, reactance: 0, conditions: ['faisceau'], charge: 60, altitude: 0 };
const GROS_CABLE = 10;   // mm² de conducteur : au-delà, la réactance compte en alternatif
const REGIMES = { continu: 'continu', mono: 'alternatif monophasé', tri: 'alternatif triphasé' };
/* Les fils d'un bornier : ce que le faisceau compte pour le déclassement. */
const filsDuBornier = Q => Q.modules.reduce((s, m) => s + m.fils.filter(f => f.type).length, 0);
function simulerBornier(Q, norme, hyp) {
  if (!Q.modules.every(m => m.trous)) Q = remplirSelonNorme(Q, norme);
  const H = { ...HYPOTHESES, ...(hyp || {}) }, F = Q.famille, regime = REGIMES[H.regime] ? H.regime : 'continu';
  const declassement = detailDeclassement(norme, H.conditions, { fils: filsDuBornier(Q), charge: H.charge, altitude: H.altitude }), facteur = declassement.reduce((k, d) => k * d.facteur, 1), chute = chuteAdmise(norme, H.tension, regime);
  const iContact = F && F.intensite != null ? F.intensite : (Q.entree && Q.entree.intensite != null ? Q.entree.intensite : null);
  // la résistance de contact : celle de la famille (table Familles) ; sinon celle de la taille de contact de chaque fil (table Résistance des contacts), deux fois sur une barrette (deux sertissages et la barre)
  const prise = Q.nature === 'prise de coupure', rFamille = F && F.resistance != null ? F.resistance / 1000 : null, lignes = [];
  const rContactDe = f => { if (rFamille != null) return rFamille; const r = resistanceDeContact(norme, tailleDeJauge(norme, F ? F.famille : '', f.jauge)); return r == null ? 0 : r * (prise ? 1 : 2); };
  Q.modules.forEach(m => ['amont', 'aval'].forEach(sens => m.trous[sens].forEach((f, k) => { if (!f) return;
    const rd = resistanceDuFil(norme, f.type, f.jauge, H.tconducteur), fil = rd.fil, rContact = rContactDe(f);
    const Lf = f.l && f.l.longueur > 0 ? f.l.longueur : H.longueur, reelle = !!(f.l && f.l.longueur > 0);
    const kT = facteurAmbiante(fil, H.ambiante), iFil = fil && fil.intensite != null ? fil.intensite * facteur * kT * rd.kConducteur : null, rFil = rd.rho != null ? rd.rho / 1000 * Lf : null;
    const cosphi = regime === 'continu' ? 1 : Math.min(1, Math.max(0, +H.cosphi || 0.8)), sinphi = Math.sqrt(Math.max(0, 1 - cosphi * cosphi));
    // la section du conducteur (la ligne Fils : le toron de cuivre), pas celle, hors-tout, du câble
    const section = fil && fil.section != null ? fil.section : null, gros = regime !== 'continu' && section != null && section >= GROS_CABLE;
    const X = regime === 'continu' ? 0 : (+H.reactance || 0) / 1000 * Lf, xRequis = gros && !(X > 0), kReg = regime === 'tri' ? Math.sqrt(3) : 1;
    const R = rFil == null ? null : rFil + rContact, dU = R == null || xRequis ? null : kReg * (R * cosphi + X * sinphi) * H.courant, pct = dU == null || !H.tension ? null : dU / H.tension * 100;
    const verdict = f.jaugeOk === false ? 'jauge' : (iFil != null && H.courant > iFil + 1e-9) ? 'fil' : (iContact != null && H.courant > iContact + 1e-9) ? 'contact'
      : xRequis ? 'reactance' : (dU != null && chute && chute.chuteMax != null && dU > chute.chuteMax + 1e-9) ? 'chute' : !fil || rd.refuse ? 'inconnu' : 'ok';
    lignes.push({ borne: m.borne, sens, trou: k + 1, surcharge: k >= Q.filsParCote, cable: f.cable, type: f.type, jauge: f.jauge, jaugeOk: f.jaugeOk, fil, approx: !!(fil && fil.approx),
                  iFil, iContact, rFil, rContact, R, dU, pct, verdict, kT, kConducteur: rd.kConducteur, conducteur: rd.conducteur, rho: rd.rho, rho20: rd.rho20, kTemperature: rd.k, rhoSource: rd.source, cab: rd.cab, section,
                  sectionHorsTout: rd.cab && rd.cab.section != null ? rd.cab.section : null, regime, cosphi, X, xRequis, longueur: Lf, reelle, vers: f.vers, borneVers: f.borne, l: f.l }); })));
  const compte = {}; lignes.forEach(x => { compte[x.verdict] = (compte[x.verdict] || 0) + 1; });
  const rContact = lignes.length ? lignes[0].rContact : (rFamille != null ? rFamille : 0);
  return { hyp: H, facteur, declassement, chute, iContact, rContact, famille: F, lignes, compte, regime, fils: filsDuBornier(Q), sansNorme: !F && !(norme && norme.fils.length) };
}
const COLONNES_SUIVI = [['contrat', 'Contrat'], ['repere', 'Repère'], ['nature', 'Nature'], ['reference', 'Référence retenue'], ['fichier', 'Référence du fichier'],
  ['nBornes', 'Bornes utilisées'], ['bornes', 'Bornes'], ['shunts', 'Shunts'], ['jauge', 'Jauge'], ['fils', 'Fils'], ['routes', 'Routes'], ['plans', 'Folios']];
function csvDuSuivi(lignes) {
  const cell = v => { const t = Array.isArray(v) ? v.join(' ') : String(v == null ? '' : v); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  return [COLONNES_SUIVI.map(c => c[1]).join(';'), ...lignes.map(l => COLONNES_SUIVI.map(c => cell(l[c[0]])).join(';'))].join('\n');
}

/* ---- les modules de jonction (ASNE 0599, NSA937901) ------------------------
   Une barrette du contrat se pose en MODULES DE JONCTION : un module est un
   bloc de contacts lettrés, et des GROUPES de contacts reliés (shuntés) dans
   le module — la VARIANTE, ou le code d'arrangement (E0599 A101 : dix-huit
   paires ; NSA937901 20-04 : un groupe de 4 et un de 6 ; M12-08 : deux
   groupes mêlant des contacts #12, #16 et #20). Chaque POTENTIEL de la
   barrette — une borne, ou les bornes que des shunts relient — prend un
   groupe ; chaque fil de ce potentiel, un contact du groupe dont la TAILLE
   admet sa jauge. Deux normes, chacune dans son CSV (normes/asne0599.csv,
   normes/nsa937901.csv) : les variantes (la face, les groupes, les tailles,
   l'usage, le corps), et les jauges que chaque taille de contact reçoit dans
   cette norme (un #20 ASNE 0599 prend du 24 au 20, un 20 NSA937901 du 24 au
   18). */
const lettresDe = t => String(t == null ? '' : t).split(/[\s,]+/).filter(Boolean);
const cleNorme = t => String(t == null ? '' : t).toUpperCase().replace(/[^A-Z0-9]/g, '');
// « 22D », « 20 », « #12 » : la clé d'une taille de contact ; son calibre est le nombre (22D → 22)
const tailleCle = t => String(t == null ? '' : t).trim().toUpperCase().replace(/^#/, '').replace(/\s+/g, '');
function tailleNorme(o) { const taille = tailleCle(o.taille), calibre = NUMERO(taille); if (!taille || calibre == null) return null;
  const j = [NUMERO(o.jaugeMin), NUMERO(o.jaugeMax)].filter(x => x != null);
  return { famille: cleNorme(o.famille), taille, calibre, jaugeMin: j.length ? Math.max(...j) : null, jaugeMax: j.length ? Math.min(...j) : null, note: String(o.note || '').trim() }; }
/* Une ligne de la table CONTACTS (normes/contacts.csv, transcrite des tables SEE) : pour une norme de connecteurs, une
   taille de cavité, un sexe (M broche, F douille), un type de fil (« * » : tous) et une jauge (« * » : toutes), le contact
   à sertir et son accessoire (un fourreau de réduction E0718 pour un fil plus fin que le contact, une bague EN4530…). */
const sexeDe = t => { const u = MOT(t); return /^m|^male|broche|pin/.test(u) ? 'M' : /^f|douille|socket/.test(u) ? 'F' : ''; };
function contactNorme(o) { const famille = cleNorme(o.famille), taille = tailleCle(o.taille), sexe = sexeDe(o.sexe), reference = String(o.reference || '').trim();
  if (!famille || !taille || !sexe || !reference) return null;
  const typeFil = String(o.typeFil || '').trim().toUpperCase().replace(/[^A-Z0-9*]/g, '') || '*', j = String(o.jauge == null ? '' : o.jauge).trim();
  return { famille, sexe, taille, typeFil, jauge: j && j !== '*' ? NUMERO(j) : null, reference, accessoire: String(o.accessoire || '').trim(), note: String(o.note || '').trim() }; }
/* L'USAGE d'une variante : « normal » (marqué par la norme), « possible », « A350 » (application spécifique), « à
   confirmer » (la figure ne se lit pas), « diodes ». Les deux derniers et l'A350 ne sont jamais choisis seuls. */
const usageDe = t => { const u = MOT(t); return /diode/.test(u) ? 'diodes' : /ancien|nouvelle conception|obsolet/.test(u) ? 'ancien' : /a350|ad12|specifique/.test(u) ? 'A350' : /confirm/.test(u) ? 'à confirmer' : /shunt/.test(u) ? 'shuntés' : /special/.test(u) ? 'spécial'
  : /normal|courant|\*/.test(u) || !u ? 'normal' : 'possible'; };
const corpsDe = t => { const u = MOT(t); return /etanch|seal/.test(u) ? 'étanche' : /circul|rond/.test(u) ? 'circulaire' : /oval/.test(u) ? 'ovale' : /module|carre/.test(u) ? 'module' : 'rectangle'; };
function moduleNorme(o) { const variante = String(o.variante || '').trim().toUpperCase(); if (!variante) return null;
  const famille = cleNorme(o.famille) || (/^[A-E]\d{3}$/.test(variante) ? 'E0599' : ''), taille = tailleCle(o.taille), type = String(o.type || '').trim().toLowerCase();
  const reference = String(o.reference || '').trim() || (famille === 'E0599' ? 'E0599-1' + variante + 'Z' : (famille ? famille + '-' : '') + variante);
  // la face : des rangées (« A B C / D E F », « . » une place vide), ou, pour une face irrégulière, « lettre@x:y » en pas
  const place = new Map(), disp = String(o.disposition || ''), libre = /@/.test(disp); let rangs, colonnes;
  if (libre) { let centre = null; lettresDe(disp).forEach(t => { const m = /^(.+?)@(-?[\d.]+):(-?[\d.]+)$/.exec(t); if (!m) return;
      // « centre@x:y » : le centre d'une face ronde — la face est alors le carré qui l'entoure, et reste ronde
      if (m[1].toLowerCase() === 'centre') centre = { x: +m[2], y: +m[3] }; else place.set(m[1], { r: +m[3] - 0.5, c: +m[2] - 0.5 }); });
    const ps = [...place.values()]; colonnes = centre ? 2 * centre.x : Math.max(1, ...ps.map(p => p.c + 1.1)); rangs = centre ? 2 * centre.y : Math.max(1, ...ps.map(p => p.r + 1.1)); }
  else { const rs = disp.split('/').map(r => lettresDe(r)); rs.forEach((r, i) => r.forEach((l, j) => { if (l !== '.') place.set(l, { r: i, c: j }); }));
    rangs = rs.length; colonnes = Math.max(1, ...rs.map(r => r.length)); }
  const contacts = [];
  const groupes = String(o.groupes || '').split('|').map((g, k) => {
    const cs = lettresDe(g).map(t => { const m = /^(.+?)#(\w+)$/.exec(t), lettre = m ? m[1] : t, tl = m ? tailleCle(m[2]) : taille, p = place.get(lettre) || { r: rangs + contacts.length, c: 0 };
      const c = { lettre, taille: tl, calibre: NUMERO(tl), r: p.r, c: p.c, groupe: k }; contacts.push(c); return c; });
    return { k, contacts: cs, nom: cs.length > 4 ? cs[0].lettre + '…' + cs[cs.length - 1].lettre : cs.map(c => c.lettre).join('-') }; }).filter(g => g.contacts.length).map((g, k) => ({ ...g, k }));
  groupes.forEach(g => g.contacts.forEach(c => { c.groupe = g.k; }));
  const diodes = lettresDe(o.diodes).map(d => d.split('>')).filter(d => d.length === 2), usage = usageDe(type === 'diodes' ? 'diodes' : o.usage);
  return { famille, variante, reference, type, taille, rangs, colonnes, libre, contacts, groupes, poids: NUMERO(o.poids), hauteur: NUMERO(o.hauteur),
           diodes, aDiodes: type === 'diodes' || diodes.length > 0, usage, auto: !/diodes|A350|confirmer|shuntés|spécial|ancien/.test(usage) && contacts.length > 0, corps: corpsDe(o.corps),
           // l'EMPLOI : une barrette (modules de jonction), ou un connecteur — d'équipement ou de prise de coupure (EN 4165)
           emploi: /connect|coupure|prise/.test(MOT(o.emploi)) ? 'connecteur' : 'barrette', note: String(o.note || '').trim() }; }
// la norme embarquée, lue une fois : ses modules servent quand la norme de l'atelier n'en porte pas
let normeDesModulesLue = null;
const normeDesModules = norme => (norme && norme.modules && norme.modules.length) ? norme : (normeDesModulesLue || (normeDesModulesLue = normeEmbarquee()));
// les familles de modules, dans l'ordre de la norme ; le nom à montrer d'une famille (« ASNE 0599 », « NSA 937901 »)
const famillesDeModules = (norme, emploi) => [...new Set(normeDesModules(norme).modules.filter(m => m.emploi === (emploi || 'barrette')).map(m => m.famille))];
// une famille d'exemple (EN3646 de la norme d'exemple) ne nomme pas les modules d'une vraie norme : « EN3646 » se dit alors « EN 3646-002 »
const nomDeFamille = (norme, f) => { const F = normeDesModules(norme).familles.find(x => cleNorme(x.famille) === f && !x.exemple);
  return F ? F.norme : String(f || '').replace(/^EN(\d{4})$/, 'EN $1-002'); };
/* Le module d'une référence : sa désignation, ou famille et variante écrites autrement (« NSA937901 20-04 »,
   « E0599-1B204 »). */
function moduleDeReference(norme, ref) { const r = cleNorme(ref); if (!r) return null; const M = normeDesModules(norme).modules;
  const m = M.find(x => cleNorme(x.reference) === r || cleNorme(x.famille + x.variante) === r); if (m) return m;
  const e = /^E0599-?1?([A-E]\d{3})/i.exec(String(ref).trim()); return e ? M.find(x => x.famille === 'E0599' && x.variante === e[1].toUpperCase()) || null : null; }
// la famille de modules qu'une référence nomme (une désignation, ou le nom de la norme seul)
const familleDeReference = (norme, ref, emploi) => { const r = cleNorme(ref); return r ? famillesDeModules(norme, emploi).find(f => r.startsWith(f)) || '' : ''; };
/* Ce qu'un contact de cette taille reçoit, dans sa norme ; et s'il reçoit un fil de cette jauge. Une jauge inconnue
   passe (c'est dit ailleurs) ; une taille que la norme ne décrit pas aussi. */
const tailleDe = (norme, famille, taille) => { const T = normeDesModules(norme).tailles; return T.find(x => x.famille === famille && x.taille === taille) || T.find(x => !x.famille && x.taille === taille) || null; };
/* LE CONTACT À SERTIR. La table Contacts de la norme (tables SEE : EN 2997, EN 3645, EN 3646, EN 4165) donne, pour la
   taille de la cavité, le sexe du contact, le type et la jauge du fil, le contact et son accessoire. La ligne la plus
   précise gagne : le type de fil exact avant « * », la jauge exacte avant « * ». Sans sexe, n'importe lequel. Quand la
   table connaît la taille, c'est elle qui juge la jauge (un fil sans ligne est refusé) ; sinon la plage de Tailles. */
const contactsDeTaille = (norme, famille, taille) => (normeDesModules(norme).contacts || []).filter(c => c.famille === famille && c.taille === taille);
const rangDeContact = c => (c.typeFil !== '*' ? 2 : 0) + (c.jauge != null ? 1 : 0);   // 3 : type et jauge exacts … 0 : la ligne « * * »
function contactDuFil(norme, famille, taille, sexe, type, jauge) { const t = typeDuFil(type);
  return contactsDeTaille(norme, famille, taille).filter(c => (!sexe || c.sexe === sexe) && (c.typeFil === '*' || c.typeFil === t) && (c.jauge == null || c.jauge === jauge))
    .sort((a, b) => rangDeContact(b) - rangDeContact(a))[0] || null; }
/* Ce qu'un arrangement coûte en ACCOMMODATIONS pour ces fils : un fil sur une ligne « * * » (le contact par défaut de
   la taille, pour un fil que la table ne nomme pas) ou sur une ligne à jauge « * » compte 2, un accessoire (un fourreau
   de réduction : le contact est trop gros pour le fil) compte 1. Entre deux arrangements qui logent tout, le moins
   accommodant gagne — un 24 AWG va sur un contact 20, pas sur un 12 avec fourreau. */
function accommodations(norme, famille, pl, sexeFil) { let n = 0;
  pl.forEach(x => x.p.fils.forEach(f => { if (f.jauge == null) return; const c = contactDuFil(norme, famille, x.c.taille, sexeFil(f), f.type, f.jauge); if (!c) return;
    if (c.jauge == null) n += 2; if (c.accessoire) n += 1; })); return n; }
function contactAccepte(norme, famille, taille, jauge, sexe, type) { if (jauge == null) return true;
  if (contactsDeTaille(norme, famille, taille).length) return !!contactDuFil(norme, famille, taille, sexe, type, jauge);
  const T = tailleDe(norme, famille, taille); return !T || (jauge <= T.jaugeMin && jauge >= T.jaugeMax); }
// le sexe opposé ; le sexe des contacts d'une prise : la fiche (ce qui arrive) d'un côté, l'embase de l'autre
const autreSexe = s => s === 'M' ? 'F' : 'M';
const nomDuSexe = s => s === 'M' ? 'mâle' : s === 'F' ? 'femelle' : '';
/* La NOMENCLATURE des contacts d'un plan : chaque contact (et son accessoire) avec son nombre, le plus courant d'abord. */
function nomenclatureDe(fils) { const m = new Map();
  fils.forEach(x => { if (!x.sertir) return; const k = x.sertir.reference + '\u0001' + (x.sertir.accessoire || '');
    (m.get(k) || m.set(k, { reference: x.sertir.reference, accessoire: x.sertir.accessoire || '', n: 0 }).get(k)).n++; });
  return [...m.values()].sort((a, b) => b.n - a.n || triBornes(a.reference, b.reference)); }
/* Les entrées de bible d'une norme de modules : une par variante — ses groupes sont les « bornes » qu'elle offre. */
function bibleDesModules(norme) {
  return normeDesModules(norme).modules.map(m => { const ts = [...new Set(m.contacts.map(c => c.taille))].map(t => tailleDe(norme, m.famille, t)).filter(Boolean);
    return entreeBible({ reference: m.reference, famille: m.famille, nature: m.emploi === 'connecteur' ? 'module de connecteur' : 'jonction', bornes: m.emploi === 'connecteur' ? m.contacts.length : m.groupes.length, module: m.reference,
      jaugeMin: ts.length ? Math.max(...ts.map(t => t.jaugeMin)) : '', jaugeMax: ts.length ? Math.min(...ts.map(t => t.jaugeMax)) : '',
      note: `${m.variante} · ${m.contacts.length} contacts · ${m.note}` }); }); }
/* Les POTENTIELS d'une barrette : chaque paquet de bornes (reliées par des shunts), avec tous ses fils. */
function potentielsDeBarrette(besoins) {
  return paquetsDeBarrette(besoins.bornes, besoins.ponts).map(p => ({ bornes: p.bornes,
    fils: p.bornes.flatMap(b => (besoins.parBorne.get(b) || []).map(f => ({ ...f, borneBarrette: b, jauge: jaugeDuType(f.type) }))).sort((a, b) => triBornes(a.cable || '', b.cable || '')) }))
    .filter(p => p.fils.length); }
/* Les fils d'un potentiel dans un groupe : chaque fil un contact qui admet sa jauge — les plus gros fils d'abord, chacun
   sur le plus petit contact qui le reçoit (les gros contacts restent aux gros fils) ; puis, à taille égale, dans l'ordre
   des lettres et des numéros de fil. Rend [[fil, contact]…], ou null. */
function placerDansGroupe(norme, mod, groupe, fils) { if (fils.length > groupe.contacts.length) return null;
  const libres = groupe.contacts.slice(), choix = [];
  for (const f of fils.slice().sort((a, b) => (a.jauge == null ? 99 : a.jauge) - (b.jauge == null ? 99 : b.jauge))) {
    const ok = libres.filter(c => contactAccepte(norme, mod.famille, c.taille, f.jauge)); if (!ok.length) return null;
    const c = ok.sort((u, v) => v.calibre - u.calibre)[0]; libres.splice(libres.indexOf(c), 1); choix.push([f, c]); }
  // à taille égale, le premier fil sur la première lettre
  const parTaille = new Map(); choix.forEach(([f, c]) => (parTaille.get(c.taille) || parTaille.set(c.taille, []).get(c.taille)).push([f, c]));
  const ordre = c => groupe.contacts.indexOf(c);
  return [...parTaille.values()].flatMap(xs => { const fs = xs.map(x => x[0]).sort((a, b) => triBornes(a.cable || '', b.cable || '')), cs = xs.map(x => x[1]).sort((a, b) => ordre(a) - ordre(b)); return fs.map((f, i) => [f, cs[i]]); }); }
/* Des potentiels dans un module : chacun, du plus chargé au moins chargé, dans le groupe qui le loge en perdant le moins
   de contacts. */
function placerDansModule(norme, mod, potentiels) { const libres = mod.groupes.slice(), places = [];
  potentiels.forEach(p => { let mieux = null;
    for (const g of libres) { const perte = g.contacts.length - p.fils.length; if (perte < 0 || (mieux && perte >= mieux.perte)) continue;
      const a = placerDansGroupe(norme, mod, g, p.fils); if (a) mieux = { g, a, perte }; }
    if (mieux) { libres.splice(libres.indexOf(mieux.g), 1); places.push({ potentiel: p, groupe: mieux.g, fils: mieux.a, perte: mieux.perte }); } });
  return places; }
/* Ce que vise le remplissage : `choix` est une désignation retenue à la main (tous les modules la prennent), le nom
   d'une norme (ses variantes seules), ou rien — alors la norme du part number du fichier s'il en nomme une, sinon les
   deux. Rend { module, famille }. */
function viseeDesModules(norme, choix, pn) { const m = choix ? moduleDeReference(norme, choix) : null;
  if (m) return { module: m, famille: m.famille, main: true };
  const f = familleDeReference(norme, choix); if (f) return { module: null, famille: f, main: true };
  return { module: null, famille: familleDeReference(norme, pn), main: false }; }
// le rang d'une variante parmi celles qui logent autant : l'usage normal d'abord, la moindre perte, le moins de groupes vides, la plus légère
const scoreModule = (m, pl) => [pl.length, m.usage === 'normal' ? 1 : 0, -pl.reduce((s, x) => s + x.perte, 0), -(m.groupes.length - pl.length), m.poids != null ? -m.poids : -1e3];
const meilleurScore = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i]; return false; };
/* LE REMPLISSAGE : les modules d'une barrette, et chaque fil dans son contact. Tant qu'il reste des potentiels, le
   module qui en loge le plus (`scoreModule`). Un potentiel qu'aucun groupe ne reçoit (trop de fils, une jauge qu'aucun
   contact n'admet, deux jauges qu'aucun groupe ne mêle) est dit. */
function remplirModules(besoins, norme, choix) { const N = normeDesModules(norme), V = viseeDesModules(N, choix, besoins.pn);
  const cands = V.module ? [V.module] : N.modules.filter(m => m.auto && m.emploi === 'barrette' && (!V.famille || m.famille === V.famille));
  let restants = potentielsDeBarrette(besoins).sort((a, b) => b.fils.length - a.fils.length || triBornes(a.bornes[0], b.bornes[0]));
  const nPot = restants.length, modules = [];
  while (restants.length && modules.length < 16) { let mieux = null;
    for (const m of cands) { const pl = placerDansModule(N, m, restants); if (!pl.length) continue;
      const score = scoreModule(m, pl); if (!mieux || meilleurScore(score, mieux.score)) mieux = { m, pl, score }; }
    if (!mieux) break;
    modules.push({ module: mieux.m, reference: mieux.m.reference, places: mieux.pl.sort((a, b) => a.groupe.k - b.groupe.k) });
    restants = restants.filter(p => !mieux.pl.some(x => x.potentiel === p)); }
  const s = k => k > 1 ? 's' : '', verdicts = [], ou = V.module ? 'de ' + V.module.variante : V.famille ? 'de la norme ' + nomDeFamille(N, V.famille) : 'des deux normes';
  restants.forEach(p => { const js = [...new Set(p.fils.map(f => f.jauge).filter(j => j != null))];
    verdicts.push({ niveau: 'ko', texte: `borne${s(p.bornes.length)} ${p.bornes.join('-')} : ${p.fils.length} fil${s(p.fils.length)}${js.length ? ' de jauge ' + js.join(', ') : ''} — aucun groupe ${ou} ne les reçoit`, bornes: p.bornes }); });
  const fils = modules.flatMap((M, k) => M.places.flatMap(pl => pl.fils.map(([f, c]) => ({ f, contact: c, module: k, groupe: pl.groupe, potentiel: pl.potentiel,
    taille: c.taille, jaugeOk: f.jauge == null ? null : contactAccepte(N, M.module.famille, c.taille, f.jauge) }))));
  const contacts = modules.reduce((n, M) => n + M.module.contacts.length, 0);
  const parRef = new Map(); modules.forEach(M => parRef.set(M.reference, (parRef.get(M.reference) || 0) + 1));
  const reference = [...parRef].map(([r, n]) => (n > 1 ? n + ' × ' : '') + r).join(' + ');
  return { modules, fils, verdicts, potentiels: nPot, places: nPot - restants.length, restants, contacts, utilises: fils.length, reference,
           famille: V.famille || (modules.length ? modules[0].module.famille : ''), variante: V.module ? V.module.variante : '', main: V.main, choix: choix || '' }; }
/* Les variantes qui logent la barrette d'un seul module, de la mieux à la moins bien taillée — les candidates de la
   carte ; d'une norme, ou des deux. */
function variantesQuiLogent(besoins, norme, famille) { const N = normeDesModules(norme), pots = potentielsDeBarrette(besoins).sort((a, b) => b.fils.length - a.fils.length);
  return N.modules.filter(m => m.auto && m.emploi === 'barrette' && (!famille || m.famille === famille)).map(m => ({ m, pl: placerDansModule(N, m, pots) }))
    .filter(x => x.pl.length === pots.length).map(x => ({ m: x.m, score: scoreModule(x.m, x.pl) }))
    .sort((a, b) => meilleurScore(a.score, b.score) ? -1 : meilleurScore(b.score, a.score) ? 1 : 0).map(x => x.m); }

/* ---- les modules de connecteur (EN 4165, EN 2997) ------------------------
   EN 2997 : un connecteur circulaire porte un seul insert, lu comme un module de même façon.
   Un connecteur EN 4165 reçoit un MODULE par cavité (A, B, C…) ; une prise
   de coupure en est faite aussi (fiche et embase). Le module se lit par son
   ARRANGEMENT (EN 4165-002 : 20-22, 12-20, 08-16…) : des contacts numérotés,
   chacun d'une taille. Ici pas de groupe à choisir : la borne 7 du
   connecteur EST le contact 7 du module ; il faut seulement qu'il existe et
   que sa taille admette la jauge du fil. Le remplissage choisit
   l'arrangement : celui que le part number nomme, sinon le plus petit qui
   loge toutes les bornes, l'arrangement de base avant ses variantes. */
// le numéro de contact d'une borne : « A11 » (connecteur A) → « 11 », « 7 » → « 7 »
const numeroDeBorne = b => { const t = String(b == null ? '' : b).trim(), m = LETTRE_CONNECTEUR.exec(t); return (m ? m[2] : t).toUpperCase(); };
/* Le module qu'un part number de connecteur nomme : une désignation de la norme, ou son arrangement écrit dedans
   (« EN4165-002-08W16 », « …12-20… ») ; le plus long qui s'y lit. */
function moduleDeConnecteur(norme, pn) { const m = moduleDeReference(norme, pn); if (m && m.emploi === 'connecteur') return m;
  const f = familleDeReference(norme, pn, 'connecteur'); if (!f) return null; const reste = cleNorme(pn).slice(f.length);
  return normeDesModules(norme).modules.filter(x => x.famille === f && x.emploi === 'connecteur' && x.contacts.length && reste.includes(cleNorme(x.variante)))
    .sort((a, b) => cleNorme(b.variante).length - cleNorme(a.variante).length)[0] || null; }
/* Les POINTS d'un connecteur ou d'une prise : chaque borne, son numéro de contact, ses fils (jauge lue dans le type). */
const pointsDe = (besoins, bornes) => bornes.slice().sort(triBornes).map(b => ({ borne: b, num: numeroDeBorne(b), fils: (besoins.parBorne.get(b) || []).map(f => ({ ...f, jauge: jaugeDuType(f.type) })) }));
/* Les points dans un module : chaque borne sur son contact ; rend ce qui se pose et ce qui ne se pose pas. */
function poserPoints(norme, mod, points, sexeFil) { const pl = [], manque = [], refus = []; sexeFil = sexeFil || (() => '');
  // des contacts lettrés (EN 3646) et une borne numérotée : la borne n prend la lettre de rang n, dans l'ordre de la norme
  const lettres = !mod.contacts.some(x => /^\d+$/.test(x.lettre)), contactDe = num => mod.contacts.find(x => x.lettre === num) || (lettres && /^\d+$/.test(num) ? mod.contacts[+num - 1] || null : null);
  points.forEach(p => { const c = contactDe(p.num); if (!c) { manque.push(p); return; }
    const ko = p.fils.filter(f => !contactAccepte(norme, mod.famille, c.taille, f.jauge, sexeFil(f), f.type)); if (ko.length) refus.push({ p, c, ko });
    pl.push({ p, c, ok: !ko.length }); });
  return { pl, manque, refus }; }
/* LE REMPLISSAGE d'un connecteur ou d'une prise de coupure. `choix` : l'arrangement retenu à la main ; `pn` : le part
   number du fichier ; `prise` : deux côtés (fiche et embase), un fil de chaque côté par contact — sinon un seul fil.
   `choix` peut aussi nommer une norme seule (« EN2997 ») : ses arrangements seuls. Sans norme nommée (une prise de
   coupure dont le part number n'en dit rien), toutes les normes de connecteurs concourent. `sexe` : le sexe des
   contacts qu'on sertit — F (douilles) par défaut : face à une embase d'équipement à broches, et côté fiche d'une
   prise de coupure, dont l'embase prend l'autre sexe. Chaque fil rend son contact à sertir (`sertir`, table Contacts).
   Rend un plan de la même forme que celui des barrettes (un module). */
function remplirContacts(points, norme, opts) { opts = opts || {}; const N = normeDesModules(norme), s = k => k > 1 ? 's' : '';
  const sexe0 = opts.sexe === 'M' ? 'M' : 'F', sexeFil = f => opts.prise && !f.amont ? autreSexe(sexe0) : sexe0;
  const main = opts.choix ? moduleDeReference(N, opts.choix) : null, visee = !main && opts.choix ? familleDeReference(N, opts.choix, 'connecteur') : '';
  const nomme = main || visee ? null : moduleDeConnecteur(N, opts.pn), force = main || nomme;
  const famille = force ? force.famille : visee || familleDeReference(N, opts.pn, 'connecteur');
  const cands = force ? [force] : N.modules.filter(m => m.emploi === 'connecteur' && m.auto && (!famille || m.famille === famille));
  let mieux = null;
  cands.forEach(m => { const r = poserPoints(N, m, points, sexeFil), bons = r.pl.filter(x => x.ok).length;
    const score = [bons, m.usage === 'normal' ? 1 : 0, -accommodations(N, m.famille, r.pl, sexeFil), -m.contacts.length, m.poids != null ? -m.poids : -1e3];
    if (force || bons === points.length) if (!mieux || meilleurScore(score, mieux.score)) mieux = { m, r, score }; });
  const verdicts = [], modules = [], fils = [];
  if (mieux) { const m = mieux.m;
    modules.push({ module: m, reference: m.reference, places: mieux.r.pl.map(x => ({ potentiel: { bornes: [x.p.borne], fils: x.p.fils }, groupe: m.groupes[x.c.groupe], fils: x.p.fils.map(f => [f, x.c]), perte: 0 })) });
    mieux.r.pl.forEach(x => x.p.fils.forEach(f => { const sx = sexeFil(f), st = contactDuFil(N, m.famille, x.c.taille, sx, f.type, f.jauge);
      fils.push({ f, contact: x.c, module: 0, groupe: m.groupes[x.c.groupe], potentiel: { bornes: [x.p.borne], fils: x.p.fils }, taille: x.c.taille, sexe: sx,
        jaugeOk: f.jauge == null ? null : contactAccepte(N, m.famille, x.c.taille, f.jauge, sx, f.type), sertir: st ? { reference: st.reference, accessoire: st.accessoire } : null }); }));
    mieux.r.manque.forEach(p => verdicts.push({ niveau: 'ko', texte: `borne ${p.borne} : l'arrangement ${m.variante} n'a pas de contact ${p.num}`, bornes: [p.borne] }));
    if (mieux.r.pl.some(x => x.c.lettre !== x.p.num)) verdicts.push({ niveau: 'info', texte: `contacts lettrés : chaque borne numérotée prend la lettre de même rang (${mieux.r.pl.slice(0, 4).map(x => x.p.num + ' → ' + x.c.lettre).join(', ')}${mieux.r.pl.length > 4 ? '…' : ''})`, bornes: [] });
    mieux.r.refus.forEach(({ p, c, ko }) => { const table = contactsDeTaille(N, m.famille, c.taille).length;
      verdicts.push({ niveau: 'ko', texte: `borne ${p.borne} : ${ko.map(f => (f.cable || '?') + ' (' + f.type + ')').join(', ')} — ` + (table ? `aucun contact ${nomDuSexe(sexeFil(ko[0]))} de taille ${c.taille} (${nomDeFamille(N, m.famille)}) pour ce fil` : `jauge refusée par le contact ${c.lettre} (taille ${c.taille})`), bornes: [p.borne] }); });
    mieux.r.pl.forEach(({ p, c }) => { const cotes = opts.prise ? [p.fils.filter(f => f.amont), p.fils.filter(f => !f.amont)] : [p.fils];
      if (cotes.some(x => x.length > 1)) verdicts.push({ niveau: 'attention', texte: `contact ${c.lettre} : ${p.fils.length} fils${opts.prise ? ', plus d’un d’un même côté' : ''} — un contact reçoit un fil${opts.prise ? ' de chaque côté' : ''}`, bornes: [p.borne] }); });
    // les contacts shuntés d'un module retenu à la main relient des bornes qui ne le sont peut-être pas
    if (m.groupes.some(g => g.contacts.length > 1)) verdicts.push({ niveau: 'attention', texte: `l'arrangement ${m.variante} relie des contacts entre eux (module shunté) : à n'employer que si le contrat le veut`, bornes: [] }); }
  else if (points.length) verdicts.push({ niveau: 'ko', texte: `aucun arrangement ${famille ? nomDeFamille(N, famille) : 'des normes de connecteurs'} ne loge les bornes ${points.map(p => p.borne).join(', ')} avec ces jauges`, bornes: points.map(p => p.borne) });
  const posees = new Set(mieux ? mieux.r.pl.map(x => x.p) : []), restants = points.filter(p => !posees.has(p));
  return { modules, fils, verdicts, potentiels: points.length, places: points.length - restants.length, restants, contacts: mieux ? mieux.m.contacts.length : 0,
           utilises: new Set(fils.map(x => x.contact.lettre)).size, reference: mieux ? mieux.m.reference : '', famille: famille || (mieux ? mieux.m.famille : ''), visee,
           variante: main ? main.variante : '', main: !!main, nomme: !!nomme, choix: opts.choix || '', sexe: sexe0, prise: !!opts.prise,
           nomenclature: nomenclatureDe(fils), tableContacts: !!(mieux && contactsDeTaille(N, mieux.m.famille, mieux.m.contacts[0].taille).length) }; }
/* Les arrangements qui logent ces points, du mieux taillé au moins bien — les candidats de la carte. */
function arrangementsQuiLogent(points, norme, famille, sexeFil) { const N = normeDesModules(norme);
  return N.modules.filter(m => m.emploi === 'connecteur' && m.auto && (!famille || m.famille === famille))
    .map(m => ({ m, r: poserPoints(N, m, points, sexeFil) })).filter(x => !x.r.manque.length && !x.r.refus.length)
    .map(x => ({ ...x, acc: accommodations(N, x.m.famille, x.r.pl, sexeFil || (() => '')) }))
    .sort((a, b) => (b.m.usage === 'normal') - (a.m.usage === 'normal') || a.acc - b.acc || a.m.contacts.length - b.m.contacts.length).map(x => x.m); }
/* Les connecteurs EN 4165 d'un équipement : chaque cavité (connecteur A, B…) et son module. `retenue(nom)` : la
   désignation donnée à la main à « repère|lettre » ; `sexes(nom)` : le sexe des contacts choisi pour cette clé. */
function connecteursEnModules(repere, liaisons, norme, retenue, sexes) { const b = besoinsDeBarrette(repere, liaisons), main = retenue || (() => ''), sx = sexes || (() => '');
  return connecteursDe(repere, liaisons).filter(c => familleDeReference(norme, c.pn, 'connecteur') || moduleDeConnecteur(norme, c.pn))
    .map(c => { const points = pointsDe(b, c.bornes); return { ...c, points, plan: remplirContacts(points, norme, { choix: main(repere + '|' + c.nom), pn: c.pn, sexe: sx(repere + '|' + c.nom) }) }; }); }
/* La prise de coupure en module : ses contacts, un fil de chaque côté (fiche et embase). `sexe` : celui de la fiche. */
function coupureEnModule(repere, liaisons, norme, choix, sexe) { const b = besoinsDeBarrette(repere, liaisons), points = pointsDe(b, b.bornes);
  return { besoins: b, points, plan: remplirContacts(points, norme, { choix, pn: b.pn, prise: true, sexe }) }; }
/* Plusieurs plans d'un module en un seul (les cavités d'un connecteur, côte à côte) : ce que la vue en relief dessine. */
function planDesCavites(liste) { const modules = [], fils = [], verdicts = [];
  liste.forEach(({ nom, plan }) => { const k0 = modules.length;
    plan.modules.forEach(M => modules.push({ ...M, titre: nom + ' · ' + M.module.variante })); plan.fils.forEach(x => fils.push({ ...x, module: x.module + k0 })); verdicts.push(...plan.verdicts); });
  return { modules, fils, verdicts, potentiels: liste.reduce((n, x) => n + x.plan.potentiels, 0), places: liste.reduce((n, x) => n + x.plan.places, 0), restants: liste.flatMap(x => x.plan.restants),
           contacts: modules.reduce((n, M) => n + M.module.contacts.length, 0), utilises: liste.reduce((n, x) => n + x.plan.utilises, 0), reference: liste.map(x => x.nom + ' ' + (x.plan.reference || '—')).join(' · ') }; }
