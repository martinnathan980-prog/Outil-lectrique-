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
           intensite: n(o.intensite), blindage: oui(o.blindage), mobile: String(o.mobile || '').trim(), note: String(o.note || '').trim() };
}
/* La bible d'exemple : des références PLAUSIBLES, pas des normes lues. Elle
   montre le mécanisme en attendant la bible de l'atelier. */
function bibleExemple() {
  const E = (reference, famille, nature, bornes, jaugeMin, jaugeMax, intensite, blindage, note, mobile) =>
    ({ reference, famille, nature, bornes, jaugeMin, jaugeMax, intensite, blindage, note, mobile });
  return [
    E('ASNE0500-02', 'ASNE0500', 'jonction', 2,  26, 20, 7.5, false, 'exemple'),
    E('ASNE0500-04', 'ASNE0500', 'jonction', 4,  26, 20, 7.5, false, 'exemple'),
    E('ASNE0500-08', 'ASNE0500', 'jonction', 8,  26, 20, 7.5, false, 'exemple'),
    E('ASNE0500-12', 'ASNE0500', 'jonction', 12, 26, 20, 7.5, false, 'exemple'),
    E('ASNE0500-20', 'ASNE0500', 'jonction', 20, 26, 20, 7.5, false, 'exemple'),
    E('ASNE0501-04', 'ASNE0501', 'jonction', 4,  22, 16, 23,  false, 'exemple · grosses sections'),
    E('ASNE0501-08', 'ASNE0501', 'jonction', 8,  22, 16, 23,  false, 'exemple · grosses sections'),
    E('ASNE0502-04', 'ASNE0502', 'blindage', 4,  26, 20, 7.5, true,  'exemple · reprise de blindage'),
    E('ASNE0502-08', 'ASNE0502', 'blindage', 8,  26, 20, 7.5, true,  'exemple · reprise de blindage'),
    E('EN3646A6083AAN', 'EN3646', 'coupure', 3, 26, 20, 7.5, false, 'exemple · prise de coupure 3 contacts'),
    E('EN3646A6088AAN', 'EN3646', 'coupure', 8, 26, 20, 7.5, false, 'exemple · prise de coupure 8 contacts'),
    E('EN2997Y1A08P', 'EN2997', 'connecteur', 8, 26, 20, 7.5, false, 'exemple · embase 8 contacts', 'EN2997Y2A08S'),
    E('ABS0864-12', 'ABS0864', 'connecteur', 12, 26, 20, 7.5, false, 'exemple · embase 12 contacts', 'ABS0865-12')
  ].map(entreeBible);
}
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
const barretteInfos = (repere, liaisons, bible) => infosDe(repere, liaisons, bible, choisirBarrette);
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
      const I = (estBarrette(r) ? barretteInfos : coupureInfos)(r, liaisons, bible);
      lignes.push({ contrat, repere: r, nature: estBarrette(r) ? (I.blindes ? 'barrette de blindage' : 'barrette') : 'prise de coupure',
                    reference: main(r) || I.reference, fichier: I.pn, bornes: I.bornes.slice().sort(triBornes), nBornes: I.nBornes, shunts: I.shunts,
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
    ['type',        ['type', 'typedefil', 'code', 'typedecable']],
    ['jauge',       ['jauge', 'awg', 'gauge', 'jaugeawg']],
    ['section',     ['section', 'sectionmm2', 'mm2', 'sectionmm']],
    ['resistance',  ['resistance', 'resistanceohmkm', 'ohmkm', 'rlineique', 'resistancelineique']],
    ['intensite',   ['intensite', 'courant', 'intensiteadmissible', 'current', 'a']],
    ['note',        ['note', 'notes', 'observation', 'remarque', 'commentaire']]],
  declassements: [
    ['condition',   ['condition', 'cause', 'cas', 'situation']],
    ['facteur',     ['facteur', 'coefficient', 'coef', 'k']],
    ['note',        ['note', 'notes', 'observation', 'remarque', 'commentaire']]],
  reseau: [
    ['tension',     ['tension', 'reseau', 'u', 'volts', 'v']],
    ['chuteMax',    ['chutemax', 'chute', 'chuteadmise', 'chutemaxv', 'deltau', 'chuteenv']],
    ['chutePct',    ['chutemaxpct', 'chutepct', 'pourcent', 'chuteen']],
    ['note',        ['note', 'notes', 'observation', 'remarque', 'commentaire']]]
};
const TABLE_NORME = {
  familles: c => c.famille != null && c.reference == null && (c.pas != null || c.intensite != null || c.filsParCote != null || c.ordre != null || c.jaugeMin != null),
  fils: c => c.jauge != null && (c.section != null || c.resistance != null || c.intensite != null),
  declassements: c => c.condition != null && c.facteur != null,
  reseau: c => c.tension != null && c.chuteMax != null
};
/* Un nombre d'atelier : virgule ou point, une unité derrière (« 5 mm », « 0,8 »). */
const NUMERO = v => { const t = String(v == null ? '' : v).trim().replace(',', '.'); if (!t) return null; const m = /-?\d+(\.\d+)?/.exec(t); return m ? parseFloat(m[0]) : null; };
const LISTE_NUM = v => String(v == null ? '' : v).split(/[\s,;/|]+/).map(NUMERO).filter(x => x != null);
const MOT = v => String(v == null ? '' : v).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
/* Les jauges AWG comptent à l'envers : « min » est la plus fine acceptée. */
function familleNorme(o) { const famille = String(o.famille || '').trim(); if (!famille) return null;
  const jauges = [NUMERO(o.jaugeMin), NUMERO(o.jaugeMax)].filter(x => x != null), norme = String(o.norme || '').trim() || famille;
  return { norme, famille, exemple: /exemple|example|fictif|fausse/.test(MOT(norme) + ' ' + MOT(o.note)), nature: MOT(o.nature) || 'jonction', variantes: LISTE_NUM(o.variantes), pas: NUMERO(o.pas),
           jaugeMin: jauges.length ? Math.max(...jauges) : null, jaugeMax: jauges.length ? Math.min(...jauges) : null, intensite: NUMERO(o.intensite), resistance: NUMERO(o.resistance),
           filsParCote: Math.max(1, Math.round(NUMERO(o.filsParCote) || 1)), ordre: /crois|ordre|suite/.test(MOT(o.ordre)) ? 'croissant' : 'libre',
           paquets: /contig|voisin|adjac/.test(MOT(o.paquets)) ? 'contigus' : 'libres', reserves: LISTE_NUM(o.reserves), masse: /paquet|oui|^x$|^1$|vrai/.test(MOT(o.masse)) ? 'par paquet' : '',
           note: String(o.note || '').trim() }; }
function filNorme(o) { const jauge = NUMERO(o.jauge); if (jauge == null) return null;
  return { type: String(o.type || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || '*', jauge, section: NUMERO(o.section), resistance: NUMERO(o.resistance), intensite: NUMERO(o.intensite), note: String(o.note || '').trim() }; }
function declassementNorme(o) { const condition = MOT(o.condition), facteur = NUMERO(o.facteur); return condition && facteur != null ? { condition, facteur, note: String(o.note || '').trim() } : null; }
function reseauNorme(o) { const tension = NUMERO(o.tension); return tension == null ? null : { tension, chuteMax: NUMERO(o.chuteMax), chutePct: NUMERO(o.chutePct), note: String(o.note || '').trim() }; }
const ENTREE_NORME = { familles: familleNorme, fils: filNorme, declassements: declassementNorme, reseau: reseauNorme };
const normeVide = () => ({ familles: [], fils: [], declassements: [], reseau: [], tables: 0 });
/* Lire une norme : les tables se suivent (un titre libre, la ligne d'en-tête,
   les lignes, une ligne vide), dans un CSV ou une feuille Excel. */
function lireNorme(texte) { const N = normeVide(); let table = null, col = null;
  const entete = row => { for (const [nom, cles] of Object.entries(COLONNES_NORME)) { const c = {}; row.forEach((cell, i) => { const t = NORMA(cell); if (!t) return;
      for (const [champ, alias] of cles) if (c[champ] == null && alias.includes(t)) { c[champ] = i; break; } });
    if (TABLE_NORME[nom](c)) return { nom, col: c }; } return null; };
  String(texte || '').split(/\r?\n/).forEach(ligne => { if (!ligne.trim()) { table = null; return; }
    const row = cellules(ligne), e = entete(row); if (e) { table = e.nom; col = e.col; N.tables++; return; }
    if (!table) return; const o = {}; Object.entries(col).forEach(([champ, i]) => { o[champ] = row[i] == null ? '' : row[i]; });
    const x = ENTREE_NORME[table](o); if (x) N[table].push(x); });
  return N; }
const normeLue = N => !!(N && (N.familles.length || N.fils.length || N.declassements.length || N.reseau.length));
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
function fusionnerNormes(a, b) { const N = normeVide(); const cle = { familles: x => x.famille.toUpperCase(), fils: x => x.type + '/' + x.jauge, declassements: x => x.condition, reseau: x => String(x.tension) };
  Object.keys(cle).forEach(t => { const m = new Map(); [...(a ? a[t] : []), ...(b ? b[t] : [])].forEach(x => m.set(cle[t](x), x)); N[t] = [...m.values()]; });
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
/* Le fil de la norme : le type et la jauge exacts ; sinon la jauge seule
   (type « * », ou n'importe quel type — c'est dit : `approx`). */
function filDeNorme(norme, type, jauge) { if (!norme || jauge == null) return null; const t = typeDuFil(type);
  const exact = norme.fils.find(f => f.jauge === jauge && f.type === t); if (exact) return exact;
  const joker = norme.fils.find(f => f.jauge === jauge && f.type === '*'); if (joker) return joker;
  const autre = norme.fils.find(f => f.jauge === jauge); return autre ? { ...autre, approx: true } : null; }
function facteurDeclassement(norme, conditions) { return (conditions || []).reduce((k, c) => { const d = norme && norme.declassements.find(x => x.condition === MOT(c)); return d ? k * d.facteur : k; }, 1); }
/* La chute admise pour la tension du réseau : la ligne de cette tension,
   sinon la plus proche. */
function chuteAdmise(norme, tension) { if (!norme || !norme.reseau.length) return null;
  return norme.reseau.slice().sort((a, b) => Math.abs(a.tension - tension) - Math.abs(b.tension - tension))[0]; }

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
const HYPOTHESES = { longueur: 5, courant: 2, tension: 28, conditions: ['faisceau'] };
function simulerBornier(Q, norme, hyp) {
  if (!Q.modules.every(m => m.trous)) Q = remplirSelonNorme(Q, norme);
  const H = { ...HYPOTHESES, ...(hyp || {}) }, F = Q.famille, facteur = facteurDeclassement(norme, H.conditions), chute = chuteAdmise(norme, H.tension);
  const iContact = F && F.intensite != null ? F.intensite : (Q.entree && Q.entree.intensite != null ? Q.entree.intensite : null);
  const rContact = F && F.resistance != null ? F.resistance / 1000 : 0, lignes = [];
  Q.modules.forEach(m => ['amont', 'aval'].forEach(sens => m.trous[sens].forEach((f, k) => { if (!f) return;
    const fil = filDeNorme(norme, f.type, f.jauge);
    const iFil = fil && fil.intensite != null ? fil.intensite * facteur : null, rFil = fil && fil.resistance != null ? fil.resistance / 1000 * H.longueur : null;
    const R = rFil == null ? null : rFil + rContact, dU = R == null ? null : R * H.courant, pct = dU == null || !H.tension ? null : dU / H.tension * 100;
    const verdict = f.jaugeOk === false ? 'jauge' : (iFil != null && H.courant > iFil + 1e-9) ? 'fil' : (iContact != null && H.courant > iContact + 1e-9) ? 'contact'
      : (dU != null && chute && chute.chuteMax != null && dU > chute.chuteMax + 1e-9) ? 'chute' : !fil ? 'inconnu' : 'ok';
    lignes.push({ borne: m.borne, sens, trou: k + 1, surcharge: k >= Q.filsParCote, cable: f.cable, type: f.type, jauge: f.jauge, jaugeOk: f.jaugeOk, fil, approx: !!(fil && fil.approx),
                  iFil, iContact, rFil, rContact, R, dU, pct, verdict, vers: f.vers, borneVers: f.borne, l: f.l }); })));
  const compte = {}; lignes.forEach(x => { compte[x.verdict] = (compte[x.verdict] || 0) + 1; });
  return { hyp: H, facteur, chute, iContact, rContact, famille: F, lignes, compte, sansNorme: !F && !(norme && norme.fils.length) };
}
const COLONNES_SUIVI = [['contrat', 'Contrat'], ['repere', 'Repère'], ['nature', 'Nature'], ['reference', 'Référence retenue'], ['fichier', 'Référence du fichier'],
  ['nBornes', 'Bornes utilisées'], ['bornes', 'Bornes'], ['shunts', 'Shunts'], ['jauge', 'Jauge'], ['fils', 'Fils'], ['routes', 'Routes'], ['plans', 'Folios']];
function csvDuSuivi(lignes) {
  const cell = v => { const t = Array.isArray(v) ? v.join(' ') : String(v == null ? '' : v); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  return [COLONNES_SUIVI.map(c => c[1]).join(';'), ...lignes.map(l => COLONNES_SUIVI.map(c => cell(l[c[0]])).join(';'))].join('\n');
}
