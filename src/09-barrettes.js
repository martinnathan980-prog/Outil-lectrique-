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
  const arrivee = (b, l, autre, borneAutre) => { if (!b) return; (parBorne.get(b) || parBorne.set(b, []).get(b)).push({ cable: l.cable, type: l.type, route: l.route, plan: l.plan, vers: autre, borne: borneAutre }); };
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
const COLONNES_SUIVI = [['contrat', 'Contrat'], ['repere', 'Repère'], ['nature', 'Nature'], ['reference', 'Référence retenue'], ['fichier', 'Référence du fichier'],
  ['nBornes', 'Bornes utilisées'], ['bornes', 'Bornes'], ['shunts', 'Shunts'], ['jauge', 'Jauge'], ['fils', 'Fils'], ['routes', 'Routes'], ['plans', 'Folios']];
function csvDuSuivi(lignes) {
  const cell = v => { const t = Array.isArray(v) ? v.join(' ') : String(v == null ? '' : v); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  return [COLONNES_SUIVI.map(c => c[1]).join(';'), ...lignes.map(l => COLONNES_SUIVI.map(c => cell(l[c[0]])).join(';'))].join('\n');
}
