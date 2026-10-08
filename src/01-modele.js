/* ===========================================================================
   01 — LE MODÈLE
   Un contrat de câblage : des liaisons entre des bornes d'équipements, un
   cartouche. C'est la seule structure que tous les modules partagent.

   liaison   { de, borneDe, pnDe, vers, borneVers, pnVers, cable, type, route, plan }
             de / vers      repères des deux équipements
             borneDe / -Vers numéros de borne
             pnDe / -Vers   part number du connecteur (couches à venir : normes,
                            nombre de modules, section)
             cable          numéro de fil (Cable Tag)
             type           type et section du fil (Cable T/G)
             route          cheminement
             plan           feuille d'origine (FWD) — sert au découpage en folios
   =========================================================================== */
'use strict';

const RAIL_RE = /^(L1|L2|L3|L|N|PE|PEN|GND|0V|\+|-|VCC|VDD|\+?\d{1,3}V)$/i;

/* Le repère aéronautique porte son code AU MILIEU : <numéro><CODE><suffixe>
   — 667VT21, 408VC1A, 210SP1, 904G. Trois codes sont connus avec certitude,
   ce sont les seuls qu'on interprète ; tout le reste est un équipement, et on
   ne lui invente pas une nature qu'on ignore. */
const CODES = {
  VT: { nom: 'barrette',          forme: 'barrette' },
  VC: { nom: 'prise de coupure',  forme: 'coupure'  },
  G:  { nom: 'masse',             forme: 'masse'    }
};
function lireRepere(repere) {
  const m = /^([0-9]*)\s*([A-Za-z]+)([0-9A-Za-z\-_.]*)$/.exec(String(repere || '').trim());
  return m ? { num: m[1], code: m[2].toUpperCase(), suffixe: m[3] } : null;
}
function formeDe(repere) {
  if (VT_A_POSER.test(String(repere || '').trim())) return 'barrette';   // une barrette à poser (VT1, VT2…)
  const q = lireRepere(repere);
  return (q && q.num && CODES[q.code]) ? CODES[q.code].forme : 'equipement';
}
const estBarrette = r => formeDe(r) === 'barrette';
const estCoupure  = r => formeDe(r) === 'coupure';
const estMasse    = r => formeDe(r) === 'masse';
/* Un bornier — barrette ou prise de coupure — se dessine en réglette : une
   colonne de bornes, un fil de chaque côté. */
const estBornier  = r => estBarrette(r) || estCoupure(r);

/* Un bout tel que la base l'écrit : « 677VT2 51 » dans Device et « B » dans Pin — le repère, puis le MODULE de la
   barrette, puis le contact du module. Chez nous : repère 677VT2, borne 51B (le module et son contact). Un repère sans
   espace reste tel quel. */
function boutLu(repere, borne) { const r = String(repere == null ? '' : repere).trim(), b = String(borne == null ? '' : borne).trim();
  const m = /^(\S+)\s+(\d+)$/.exec(r); if (!m || !lireRepere(m[1])) return [r, b];
  return [m[1], m[2] + (/^\d/.test(b) ? '-' : '') + b]; }
// une longueur du retest : des mm (« 3670 ») ou des m (« 3,67 ») ; en mètres chez nous, ou null
function longueurLue(v) { if (v == null || v === '') return null; if (typeof v === 'number') return v > 100 ? v / 1000 : v;
  const t = String(v).trim().replace(',', '.'), m = /-?\d+(\.\d+)?/.exec(t); if (!m) return null; const x = parseFloat(m[0]); if (!(x > 0)) return null;
  return /mm/i.test(t) || (!/\bm\b/i.test(t) && x > 100) ? x / 1000 : x; }
function liaison(o) {
  const s = v => (v == null ? '' : String(v).trim()), [de, borneDe] = boutLu(o.de, o.borneDe), [vers, borneVers] = boutLu(o.vers, o.borneVers);
  const l = { de, borneDe, pnDe: s(o.pnDe), vers, borneVers, pnVers: s(o.pnVers), cable: s(o.cable), type: s(o.type), route: s(o.route), plan: s(o.plan) };
  // ce que le vrai retest porte en plus : le faisceau, la longueur (m), l'appareil, la date du retest
  const longueur = longueurLue(o.longueur); if (longueur != null) l.longueur = longueur;
  if (s(o.harness)) l.harness = s(o.harness); if (s(o.appareil)) l.appareil = s(o.appareil); if (s(o.retest)) l.retest = s(o.retest);
  return l;
}
/* Une liaison sans équipement à un bout n'en est pas une : c'est une ligne
   en cours de saisie. On la garde dans la table, pas dans le dessin. */
const liaisonComplete = l => !!(l.de && l.vers);

/* ---- LES BARRETTES À POSER ---------------------------------------------------
   Plusieurs fils sur une même borne d'équipement (le contrat dit « 102CB1:2 → 103RL1 » et « 395SW1 → 102CB1:2 ») : on
   ne sertit pas deux fils dans un contact, on pose une BARRETTE (le lecteur : « quand les fils se dédoublent, il faut
   une barrette »). Le folio la reçoit comme une vraie barrette, que le moteur place et dessine comme les autres — une
   colonne, une borne par fil, jamais deux fils au même niveau :
     · un fil À CRÉER de la borne de l'équipement à la borne 1 de la barrette (sans numéro, de la jauge du plus gros) ;
     · chaque fil du contrat part d'une borne à lui, 2, 3… ;
     · les bornes de la barrette sont reliées (des shunts : un même potentiel).
   Repère provisoire VT1, VT2…, unique dans le contrat : la numérotation suit l'ordre des folios (`depart` = le nombre de
   barrettes à poser des folios d'avant). Chaque liaison changée garde `origine` (la liaison du contrat ; null pour ce
   que l'outil ajoute) : la base, elle, reste celle du contrat. Les bornes de barrette, de prise et de masse ne sont pas
   concernées (leur moteur sait recevoir plusieurs fils). */
const VT_A_POSER = /^VT\d+$/i;
// les bornes d'équipement dédoublées d'un folio : [clé repère\u0001borne, [{ i, cote }]] — une barrette à poser chacune
function dedoublements(L) {
  const parBorne = new Map();
  L.forEach((l, i) => { if (l.de === l.vers) return;
    [[l.de, l.borneDe, 'de'], [l.vers, l.borneVers, 'vers']].forEach(([r, b, cote]) => {
      if (!r || !b || estBornier(r) || estMasse(r) || VT_A_POSER.test(r)) return;
      const k = r + '\u0001' + b; (parBorne.get(k) || parBorne.set(k, []).get(k)).push({ i, cote }); }); });
  return [...parBorne].filter(([, xs]) => xs.length > 1); }
function avecBarrettesAPoser(L, depart = 0) {
  const groupes = dedoublements(L);
  if (!groupes.length) return L;
  const remplace = new Map(), ajouts = [];
  const jauge = t => { const m = /(\d{1,2})\s*$/.exec(String(t || '')); return m ? +m[1] : 99; };
  groupes.forEach(([k, xs], g) => { const [r, b] = k.split('\u0001'), nom = 'VT' + (depart + g + 1), l0 = L[xs[0].i];
    const types = xs.map(x => L[x.i].type).filter(Boolean), gros = types.slice().sort((u, v) => jauge(u) - jauge(v))[0] || '';
    const pn = xs[0].cote === 'de' ? l0.pnDe : l0.pnVers, commun = { route: l0.route, plan: l0.plan, origine: null, aPoser: nom };
    ajouts.push({ de: r, borneDe: b, pnDe: pn, vers: nom, borneVers: '1', pnVers: '', cable: '', type: gros, ...commun });
    xs.forEach((x, j) => { const cur = remplace.get(x.i) || { ...L[x.i], origine: L[x.i], aPoser: nom };
      if (x.cote === 'de') { cur.de = nom; cur.borneDe = String(j + 2); cur.pnDe = ''; } else { cur.vers = nom; cur.borneVers = String(j + 2); cur.pnVers = ''; }
      remplace.set(x.i, cur); });
    for (let j = 1; j <= xs.length; j++) ajouts.push({ de: nom, borneDe: String(j), vers: nom, borneVers: String(j + 1), pnDe: '', pnVers: '', cable: '', type: '', ...commun }); });
  return [...L.map((l, i) => remplace.get(i) || l), ...ajouts]; }

/* L'inverse, pour le MOTEUR (03) : une barrette à poser n'y est pas un bloc. Le dessin se place comme si ses fils
   partaient encore de la borne (c'est ce dessin-là que le lecteur trouvait « très, très bien »), et c'est le routage qui
   pose la barrette au ras de la borne, une borne par fil (05, `formerLesPiquages`). Chaque bout posé sur une barrette à
   poser revient sur la borne qu'elle dédouble ; le fil à créer et les shunts deviennent des boucles, que rien ne
   dessine. Les liaisons qui n'en touchent aucune sont rendues telles quelles — les mêmes objets, au même rang. */
function sansBarrettesAPoser(L) {
  const bornes = new Map();   // VTn -> [repère, borne, part number] de la borne dédoublée (le fil à créer les porte)
  L.forEach(l => { if (VT_A_POSER.test(l.vers) && l.borneVers === '1' && l.de && !VT_A_POSER.test(l.de)) bornes.set(l.vers, [l.de, l.borneDe, l.pnDe]); });
  if (!bornes.size) return L;
  return L.map(l => { const a = bornes.get(l.de), b = bornes.get(l.vers); if (!a && !b) return l;
    const o = { ...l }; if (a) { o.de = a[0]; o.borneDe = a[1]; o.pnDe = a[2]; } if (b) { o.vers = b[0]; o.borneVers = b[1]; o.pnVers = b[2]; } return o; });
}

function nouveauContrat() {
  return {
    liaisons: [],
    designations: new Map(),           // repère -> désignation libre
    sexes: new Map(),                  // « repère|connecteur » (ou repère d'une prise) -> sexe des contacts à sertir, M ou F
    charges: new Map(),                // repère d'un disjoncteur -> { calibre, dem: { i, t }, trans: { i, t }, perm: { i } } (A, s)
    raccords: new Map(),               // « repère|connecteur » (ou « repère|fiche », « repère|embase » d'une prise) -> { blindage, etanche, orientation, gaine, surblindage, materiau }
    cartouche: { titre: 'Contrat de câblage', auteur: '', indice: 'A',
                 date: new Date().toISOString().slice(0, 10), echelle: '—' }
  };
}
/* Les repères du contrat, dans l'ordre d'apparition. Les rails (L1, N, PE…)
   ne sont pas des équipements : ce sont des potentiels. */
function reperesDe(liaisons) {
  const vus = new Set(); const out = [];
  liaisons.forEach(l => [l.de, l.vers].forEach(r => {
    if (r && !RAIL_RE.test(r) && !vus.has(r)) { vus.add(r); out.push(r); } }));
  return out;
}
function plansDe(liaisons) {
  const tri = (a, b) => { const na = parseFloat(a), nb = parseFloat(b);
    return (!isNaN(na) && !isNaN(nb)) ? na - nb : String(a).localeCompare(String(b)); };
  return [...new Set(liaisons.map(l => l.plan).filter(Boolean))].sort(tri);
}

/* Le contrat d'essai : vingt liaisons qui montrent tout ce que l'outil sait
   faire — un calculateur qui distribue (barrette à poser sur la borne 12),
   un second shunt, une chaîne, deux masses, une reprise de blindage. */
function contratEssai() {
  const L = [];
  const li = (de, bDe, vers, bVers, cable, type) =>
    L.push(liaison({ de, borneDe: bDe, vers, borneVers: bVers, cable, type }));
  li('210SP1', '12', '115CD',  '3',   'W-101', 'DR24');
  li('210SP1', '12', '118CD',  '3',   'W-102', 'DR24');
  li('210SP1', '12', '409GH2', '7',   'W-103', 'DR24');
  li('340AB1', '4',  '512VN',  '1',   'W-110', 'DR22');
  li('340AB1', '4',  '512VN',  '2',   'W-111', 'DR22');
  li('340AB1', '1',  '210SP1', '3',   'W-120', 'DR24');
  li('340AB2', '1',  '210SP1', '4',   'W-121', 'DR24');
  li('115CD',  '8',  '601RC',  '2',   'W-130', 'BN24');
  li('601RC',  '5',  '733LE',  '1',   'W-131', 'BN24');
  li('733LE',  '4',  '409GH2', '2',   'W-132', 'BN24');
  li('118CD',  '8',  '512VN',  '5',   'W-133', 'DR22');
  li('409GH2', '9',  '845VG',  '3',   'W-134', 'MLB24');
  li('845VG',  '1',  '601RC',  '7',   'W-135', 'MLB24');
  li('210SP1', '20', '904G',   '',    'W-140', 'DR20');
  li('340AB1', '20', '904G',   '',    'W-141', 'DR20');
  li('115CD',  '20', '907G',   '',    'W-142', 'DR20');
  li('118CD',  '20', '907G',   '',    'W-143', 'DR20');
  li('601RC',  '11', '733LE',  'CNT', 'W-150', 'MLC24');
  return L;
}
/* Le contrat d'exemple, celui qu'on voit en ouvrant l'outil : six plans,
   donc six folios — un facile, un moyen, un très chargé, puis trois de
   taille moyenne aux structures différentes — avec ce que le retest porte
   en vrai : les part numbers des connecteurs, des bornes qui disent leur
   connecteur (A12), des barrettes qui distribuent avec leurs shunts, des
   prises de coupure, des fils blindés, des masses. */
/* Le profil de charge de l'exemple : celui de l'Excel du lecteur, sur le disjoncteur 10 A (102CB1) — un démarrage de
   9,31 A pendant 5 s, une transition de 9,31 A pendant 120 s, 5 A en permanence. */
function chargesExemple() { return new Map([['102CB1', { calibre: 10, dem: { i: 9.31, t: 5 }, trans: { i: 9.31, t: 120 }, perm: { i: 5, t: null } }]]); }
function contratExemple() {
  const PN = {
    '101BT1': 'MS3470L14-5P', '102CB1': 'NSA935401-10', '103RL1': 'E0836IS35-22SA', '104LP1': 'E0644D9S',
    '210SP1': '*704A46220028', '340AB1': 'EN2997Y1A08P', '340AB2': 'EN2997Y1A08P', '115CD': 'ABS0864-12', '118CD': 'ABS0864-12',
    '409GH2': 'NSA937802-05', '512VN': 'E0644G9S', '601RC': 'E0836IS35-22SA', '733LE': 'E0644D9S', '845VG': 'E0656A01N1S0',
    '667VT21': 'E0599-1B201Z', '408VC1A': 'EN3646A6083AAN',
    '300XC1': 'EN4165-2M', '351PM1': 'EN2997Y1A12P', '352PM2': 'EN2997Y1A12P', '361VL1': 'ABS0864-08', '362VL2': 'ABS0864-08', '363VL3': 'ABS0864-08',
    '371CP1': 'E0644B9S', '372CP2': 'E0644B9S', '381RL1': 'E0836IS35-22SA', '382RL2': 'E0836IS35-22SA', '383RL3': 'E0836IS35-22SA',
    '391LP1': 'E0644D9S', '392LP2': 'E0644D9S', '395SW1': 'NSA937802-03', '396SW2': 'NSA937802-03', '397TB1': 'NSA936501-08',
    '668VT31': 'E0599-1A101Z', '669VT32': 'E0599-1B204Z', '409VC2A': 'EN3646A6083AAN', '410VC2B': 'EN3646A6083AAN',
    '400XC2': 'EN4165-2M', '421ST1': 'EN2997Y1A10P', '422ST2': 'EN2997Y1A10P', '423ST3': 'EN2997Y1A10P', '431PR1': 'EN2997Y1A08P',
    '441VN1': 'ABS0864-08', '442VN2': 'ABS0864-08', '670VT41': 'NSA937901-20-06', '671VT42': 'NSA937901-20-04',
    '500XC3': 'EN4165-2M', '510RL1': 'E0836IS35-22SA', '511RL2': 'E0836IS35-22SA', '520LP1': 'E0644D9S', '530PM3': 'EN2997Y1A12P', '531PM4': 'EN2997Y1A12P',
    '540VL5': 'ABS0864-08', '550SW3': 'NSA937802-03', '560HT1': 'E0644B9S', '411VC3A': 'EN3646A6088AAN', '412VC3B': 'EN3646A6088AAN',
    '600XC4': 'EN4165-2M', '601XC5': 'EN4165-2M', '672VT51': 'E0599-1A101Z', '610LP3': 'E0644D9S', '611LP4': 'E0644D9S', '620SW4': 'NSA937802-03',
    '630RL5': 'E0836IS35-22SA', '631RL6': 'E0836IS35-22SA' };
  const L = [];
  /* des routes PROVISOIRES, tirées du type de fil, pour que la légende des routes se voie sur l'exemple : les vraies
     routes viendront du fichier (colonne « route » ou « cheminement ») */
  const routeExemple = t => /^ML/i.test(t) ? 'BLINDÉ' : /^DR(16|20)$/i.test(t) ? 'PUISSANCE' : 'SIGNAL';
  const li = (plan, de, bDe, vers, bVers, cable, type) =>
    L.push(liaison({ de, borneDe: bDe, pnDe: PN[de] || '', vers, borneVers: bVers, pnVers: PN[vers] || '', cable, type, route: routeExemple(type || ''), plan }));
  // ---- plan 1 : facile — une batterie, un disjoncteur, un relais, une lampe, une masse
  li('1', '101BT1', '1',  '102CB1', '1',   'W-011', 'DR16');
  li('1', '102CB1', '2',  '103RL1', 'A1',  'W-012', 'DR20');
  li('1', '103RL1', 'A2', '104LP1', '1',   'W-013', 'DR22');
  li('1', '103RL1', 'X1', '395SW1', '2',   'W-014', 'DR24');
  li('1', '395SW1', '1',  '102CB1', '2',   'W-015', 'DR24');
  li('1', '104LP1', '2',  '901G',   '',    'W-016', 'DR22');
  li('1', '103RL1', 'X2', '901G',   '',    'W-017', 'DR24');
  li('1', '101BT1', '2',  '901G',   '',    'W-018', 'DR16');
  // ---- plan 2 : moyen — un calculateur qui distribue par une barrette, une prise de coupure, deux masses
  li('2', '210SP1', 'B12', '667VT21', '1',  'W-101', 'DR24');
  li('2', '667VT21', '1', '667VT21', '2',   'W-102', 'DR24');
  li('2', '667VT21', '2', '115CD',  '3',    'W-103', 'DR24');
  li('2', '667VT21', '3', '118CD',  '3',    'W-104', 'DR24');
  li('2', '667VT21', '4', '409GH2', '7',    'W-105', 'DR24');
  li('2', '340AB1', '4',  '512VN',  '1',    'W-110', 'DR22');
  li('2', '340AB1', '4',  '512VN',  '2',    'W-111', 'DR22');
  li('2', '340AB1', '1',  '210SP1', 'A3',   'W-120', 'DR24');
  li('2', '340AB2', '1',  '210SP1', 'A4',   'W-121', 'DR24');
  li('2', '115CD',  '8',  '408VC1A', '1',   'W-130', 'MLB24');
  li('2', '408VC1A', '1', '601RC',  '2',    'W-131', 'MLB24');
  li('2', '601RC',  '5',  '733LE',  '1',    'W-132', 'BN24');
  li('2', '733LE',  '4',  '409GH2', '2',    'W-133', 'BN24');
  li('2', '118CD',  '8',  '512VN',  '5',    'W-134', 'DR22');
  li('2', '409GH2', '9',  '845VG',  '3',    'W-135', 'MLB24');
  li('2', '845VG',  '1',  '601RC',  '7',    'W-136', 'MLB24');
  li('2', '210SP1', 'B20', '904G',  '',     'W-140', 'DR20');
  li('2', '340AB1', '20', '904G',   '',     'W-141', 'DR20');
  li('2', '115CD',  '20', '907G',   '',     'W-142', 'DR20');
  li('2', '118CD',  '20', '907G',   '',     'W-143', 'DR20');
  // ---- plan 3 : très chargé — un calculateur à trois connecteurs, deux barrettes (une de
  //      distribution à shunts, une de reprise de blindage), deux prises de coupure, trois
  //      relais, deux pompes, trois vannes, deux capteurs blindés, lampes, interrupteurs, masses
  li('3', '300XC1', 'B1',  '668VT31', '1',  'W-301', 'DR20');
  li('3', '668VT31', '1',  '668VT31', '2',  'W-302', 'DR20');
  li('3', '668VT31', '2',  '668VT31', '3',  'W-303', 'DR20');
  li('3', '668VT31', '2',  '351PM1',  '1',  'W-304', 'DR20');
  li('3', '668VT31', '3',  '352PM2',  '1',  'W-305', 'DR20');
  li('3', '668VT31', '4',  '361VL1',  '1',  'W-306', 'DR22');
  li('3', '668VT31', '5',  '668VT31', '6',  'W-307', 'DR22');
  li('3', '668VT31', '5',  '362VL2',  '1',  'W-308', 'DR22');
  li('3', '668VT31', '6',  '363VL3',  '1',  'W-309', 'DR22');
  li('3', '300XC1', 'B2',  '668VT31', '4',  'W-310', 'DR22');
  li('3', '300XC1', 'B3',  '668VT31', '5',  'W-311', 'DR22');
  li('3', '668VT31', '8',  '381RL1',  '1',  'W-312', 'DR22');
  li('3', '668VT31', '9',  '382RL2',  '1',  'W-313', 'DR22');
  li('3', '668VT31', '10', '383RL3',  '1',  'W-314', 'DR22');
  li('3', '668VT31', '8',  '668VT31', '9',  'W-315', 'DR22');
  li('3', '668VT31', '9',  '668VT31', '10', 'W-316', 'DR22');
  li('3', '300XC1', 'B4',  '668VT31', '8',  'W-317', 'DR22');
  li('3', '300XC1', 'A1',  '381RL1',  '3',  'W-320', 'DR24');
  li('3', '300XC1', 'A2',  '382RL2',  '3',  'W-321', 'DR24');
  li('3', '300XC1', 'A3',  '383RL3',  '3',  'W-322', 'DR24');
  li('3', '381RL1', '2',   '391LP1',  '1',  'W-323', 'DR22');
  li('3', '382RL2', '2',   '392LP2',  '1',  'W-324', 'DR22');
  li('3', '383RL3', '2',   '396SW2',  '1',  'W-325', 'DR22');
  li('3', '396SW2', '2',   '300XC1',  'A4', 'W-326', 'DR24');
  li('3', '395SW1', '1',   '300XC1',  'A5', 'W-327', 'DR24');
  li('3', '395SW1', '3',   '300XC1',  'A6', 'W-328', 'DR24');
  li('3', '300XC1', 'C1',  '409VC2A', '1',  'W-330', 'MLB24');
  li('3', '300XC1', 'C2',  '409VC2A', '2',  'W-331', 'MLB24');
  li('3', '300XC1', 'C3',  '409VC2A', '3',  'W-332', 'MLB24');
  li('3', '409VC2A', '1',  '371CP1',  '1',  'W-333', 'MLB24');
  li('3', '409VC2A', '2',  '371CP1',  '2',  'W-334', 'MLB24');
  li('3', '409VC2A', '3',  '371CP1',  '3',  'W-335', 'MLB24');
  li('3', '300XC1', 'C4',  '410VC2B', '1',  'W-336', 'MLB24');
  li('3', '300XC1', 'C5',  '410VC2B', '2',  'W-337', 'MLB24');
  li('3', '410VC2B', '1',  '372CP2',  '1',  'W-338', 'MLB24');
  li('3', '410VC2B', '2',  '372CP2',  '2',  'W-339', 'MLB24');
  li('3', '371CP1', '4',   '669VT32', '1',  'W-340', 'MLB24');
  li('3', '372CP2', '3',   '669VT32', '2',  'W-341', 'MLB24');
  li('3', '300XC1', 'C6',  '669VT32', '3',  'W-342', 'MLB24');
  li('3', '669VT32', '1',  '669VT32', '2',  'W-343', 'DR24');
  li('3', '669VT32', '2',  '669VT32', '3',  'W-344', 'DR24');
  li('3', '669VT32', '4',  '905G',    '',   'W-345', 'DR22');
  li('3', '669VT32', '3',  '669VT32', '4',  'W-346', 'DR24');
  li('3', '351PM1', '2',   '906G',    '',   'W-350', 'DR20');
  li('3', '352PM2', '2',   '906G',    '',   'W-351', 'DR20');
  li('3', '361VL1', '2',   '908G',    '',   'W-352', 'DR22');
  li('3', '362VL2', '2',   '908G',    '',   'W-353', 'DR22');
  li('3', '363VL3', '2',   '908G',    '',   'W-354', 'DR22');
  li('3', '391LP1', '2',   '909G',    '',   'W-355', 'DR22');
  li('3', '392LP2', '2',   '909G',    '',   'W-356', 'DR22');
  li('3', '381RL1', '4',   '909G',    '',   'W-357', 'DR24');
  li('3', '382RL2', '4',   '909G',    '',   'W-358', 'DR24');
  li('3', '383RL3', '4',   '909G',    '',   'W-359', 'DR24');
  li('3', '300XC1', 'B10', '905G',    '',   'W-360', 'DR20');
  li('3', '397TB1', '1',   '300XC1',  'B5', 'W-370', 'DR16');
  li('3', '397TB1', '2',   '351PM1',  '3',  'W-371', 'DR16');
  li('3', '397TB1', '3',   '352PM2',  '3',  'W-372', 'DR16');
  li('3', '397TB1', '1',   '397TB1',  '2',  'W-373', 'DR16');
  li('3', '397TB1', '2',   '397TB1',  '3',  'W-374', 'DR16');
  li('3', '351PM1', '4',   '300XC1',  'A7', 'W-375', 'DR24');
  li('3', '352PM2', '4',   '300XC1',  'A8', 'W-376', 'DR24');
  li('3', '361VL1', '3',   '300XC1',  'A9', 'W-377', 'DR24');
  li('3', '362VL2', '3',   '300XC1',  'A10', 'W-378', 'DR24');
  li('3', '363VL3', '3',   '300XC1',  'A11', 'W-379', 'DR24');
  li('3', '391LP1', '3',   '395SW1',  '4',  'W-380', 'DR24');
  li('3', '396SW2', '3',   '392LP2',  '3',  'W-381', 'DR24');
  // ---- plan 4 : moyen — un calculateur qui distribue par une barrette à deux paquets de shunts, trois sondes
  //      blindées dont les blindages se reprennent sur une seconde barrette, un pressostat, deux vannes ; un
  //      morceau de barrette seul (la borne 7, alimentée d'un autre folio) ; des masses partout
  li('4', '400XC2', 'B1',  '670VT41', '1',  'W-401', 'DR20');
  li('4', '670VT41', '1',  '670VT41', '2',  'W-402', 'DR20');
  li('4', '670VT41', '2',  '670VT41', '3',  'W-403', 'DR20');
  li('4', '670VT41', '3',  '670VT41', '4',  'W-404', 'DR20');
  li('4', '670VT41', '2',  '421ST1',  '1',  'W-405', 'DR22');
  li('4', '670VT41', '3',  '422ST2',  '1',  'W-406', 'DR22');
  li('4', '670VT41', '4',  '423ST3',  '1',  'W-407', 'DR22');
  li('4', '400XC2', 'B2',  '670VT41', '5',  'W-408', 'DR20');
  li('4', '670VT41', '5',  '670VT41', '6',  'W-409', 'DR20');
  li('4', '670VT41', '5',  '431PR1',  '1',  'W-410', 'DR22');
  li('4', '670VT41', '6',  '441VN1',  '1',  'W-411', 'DR22');
  li('4', '670VT41', '7',  '442VN2',  '1',  'W-412', 'DR22');
  li('4', '421ST1', '2',   '400XC2',  'A1', 'W-420', 'MLB24');
  li('4', '422ST2', '2',   '400XC2',  'A2', 'W-421', 'MLB24');
  li('4', '423ST3', '2',   '400XC2',  'A3', 'W-422', 'MLB24');
  li('4', '431PR1', '2',   '400XC2',  'A4', 'W-423', 'DR24');
  li('4', '441VN1', '2',   '400XC2',  'A5', 'W-424', 'DR24');
  li('4', '441VN1', '3',   '400XC2',  'A6', 'W-425', 'DR24');
  li('4', '442VN2', '2',   '400XC2',  'A7', 'W-426', 'DR24');
  li('4', '421ST1', '3',   '671VT42', '1',  'W-430', 'MLB24');
  li('4', '422ST2', '3',   '671VT42', '2',  'W-431', 'MLB24');
  li('4', '423ST3', '3',   '671VT42', '3',  'W-432', 'MLB24');
  li('4', '671VT42', '1',  '671VT42', '2',  'W-433', 'DR24');
  li('4', '671VT42', '2',  '671VT42', '3',  'W-434', 'DR24');
  li('4', '671VT42', '3',  '671VT42', '4',  'W-435', 'DR24');
  li('4', '671VT42', '4',  '400XC2',  'A10', 'W-436', 'DR24');
  li('4', '421ST1', '4',   '910G',    '',   'W-440', 'DR22');
  li('4', '422ST2', '4',   '910G',    '',   'W-441', 'DR22');
  li('4', '423ST3', '4',   '910G',    '',   'W-442', 'DR22');
  li('4', '431PR1', '3',   '911G',    '',   'W-443', 'DR22');
  li('4', '441VN1', '4',   '911G',    '',   'W-444', 'DR22');
  li('4', '442VN2', '3',   '911G',    '',   'W-445', 'DR22');
  li('4', '400XC2', 'B10', '911G',    '',   'W-446', 'DR20');
  // ---- plan 5 : moyen — deux tronçons de faisceau (fuselage, voilure) séparés par une chaîne de deux prises
  //      de coupure : un calculateur et deux relais d'un côté, deux pompes, une vanne, un interrupteur et un
  //      réchauffeur de l'autre ; les fils traversent une prise, ou les deux
  li('5', '500XC3', 'A1',  '411VC3A', '1',  'W-501', 'DR20');
  li('5', '411VC3A', '1',  '412VC3B', '1',  'W-502', 'DR20');
  li('5', '412VC3B', '1',  '530PM3',  '1',  'W-503', 'DR20');
  li('5', '500XC3', 'A2',  '411VC3A', '2',  'W-504', 'DR20');
  li('5', '411VC3A', '2',  '412VC3B', '2',  'W-505', 'DR20');
  li('5', '412VC3B', '2',  '530PM3',  '2',  'W-506', 'DR20');
  li('5', '500XC3', 'A3',  '411VC3A', '3',  'W-507', 'DR20');
  li('5', '411VC3A', '3',  '412VC3B', '3',  'W-508', 'DR20');
  li('5', '412VC3B', '3',  '531PM4',  '1',  'W-509', 'DR20');
  li('5', '500XC3', 'A4',  '411VC3A', '4',  'W-510', 'DR20');
  li('5', '411VC3A', '4',  '412VC3B', '4',  'W-511', 'DR20');
  li('5', '412VC3B', '4',  '531PM4',  '2',  'W-512', 'DR20');
  li('5', '500XC3', 'B1',  '411VC3A', '5',  'W-513', 'DR22');
  li('5', '411VC3A', '5',  '540VL5',  '1',  'W-514', 'DR22');
  li('5', '500XC3', 'B2',  '411VC3A', '6',  'W-515', 'DR22');
  li('5', '411VC3A', '6',  '540VL5',  '2',  'W-516', 'DR22');
  li('5', '510RL1', '2',   '411VC3A', '7',  'W-520', 'DR22');
  li('5', '411VC3A', '7',  '412VC3B', '5',  'W-521', 'DR22');
  li('5', '412VC3B', '5',  '550SW3',  '1',  'W-522', 'DR22');
  li('5', '550SW3', '2',   '412VC3B', '6',  'W-523', 'DR24');
  li('5', '412VC3B', '6',  '411VC3A', '8',  'W-524', 'DR24');
  li('5', '411VC3A', '8',  '500XC3',  'B3', 'W-525', 'DR24');
  li('5', '540VL5', '4',   '412VC3B', '7',  'W-526', 'DR22');
  li('5', '412VC3B', '7',  '560HT1',  '1',  'W-527', 'DR22');
  li('5', '500XC3', 'B4',  '510RL1',  '1',  'W-530', 'DR24');
  li('5', '500XC3', 'B5',  '511RL2',  '1',  'W-531', 'DR24');
  li('5', '500XC3', 'B6',  '511RL2',  '4',  'W-532', 'DR22');
  li('5', '511RL2', '2',   '510RL1',  '4',  'W-533', 'DR22');
  li('5', '511RL2', '5',   '520LP1',  '1',  'W-534', 'DR24');
  li('5', '520LP1', '2',   '912G',    '',   'W-540', 'DR24');
  li('5', '510RL1', '3',   '912G',    '',   'W-541', 'DR24');
  li('5', '511RL2', '3',   '912G',    '',   'W-542', 'DR24');
  li('5', '500XC3', 'B10', '912G',    '',   'W-543', 'DR20');
  li('5', '530PM3', '3',   '913G',    '',   'W-544', 'DR20');
  li('5', '531PM4', '3',   '913G',    '',   'W-545', 'DR20');
  li('5', '540VL5', '3',   '913G',    '',   'W-546', 'DR22');
  li('5', '550SW3', '3',   '913G',    '',   'W-547', 'DR22');
  li('5', '560HT1', '2',   '913G',    '',   'W-548', 'DR22');
  // ---- plan 6 : moyen — deux équipements de dix bornes qui se parlent à travers une barrette : huit fils qui la
  //      traversent, un paquet ponté en bus, trois piquages par shunt vers des lampes et un interrupteur (un module de
  //      barrette n'a qu'un contact par côté : un piquage, c'est un shunt), deux fils directs, une borne qui alimente
  //      deux relais (un piquage sur l'équipement), des masses
  li('6', '600XC4', 'A1',  '672VT51', '1',  'W-601', 'DR22');
  li('6', '672VT51', '1',  '601XC5',  'B1', 'W-611', 'DR22');
  li('6', '600XC4', 'A2',  '672VT51', '2',  'W-602', 'DR22');
  li('6', '672VT51', '2',  '601XC5',  'B2', 'W-612', 'DR22');
  li('6', '672VT51', '1',  '672VT51', '2',  'W-620', 'DR22');
  li('6', '600XC4', 'A3',  '672VT51', '3',  'W-603', 'DR22');
  li('6', '672VT51', '3',  '601XC5',  'B3', 'W-613', 'DR22');
  li('6', '672VT51', '3',  '672VT51', '4',  'W-621', 'DR22');
  li('6', '672VT51', '4',  '610LP3',  '1',  'W-622', 'DR24');
  li('6', '600XC4', 'A4',  '672VT51', '5',  'W-604', 'DR22');
  li('6', '672VT51', '5',  '601XC5',  'B4', 'W-614', 'DR22');
  li('6', '600XC4', 'A5',  '672VT51', '6',  'W-605', 'DR22');
  li('6', '672VT51', '6',  '601XC5',  'B5', 'W-615', 'DR22');
  li('6', '672VT51', '6',  '672VT51', '7',  'W-623', 'DR22');
  li('6', '672VT51', '7',  '611LP4',  '1',  'W-624', 'DR24');
  li('6', '600XC4', 'A6',  '672VT51', '8',  'W-606', 'DR22');
  li('6', '672VT51', '8',  '601XC5',  'B6', 'W-616', 'DR22');
  li('6', '600XC4', 'A7',  '672VT51', '9',  'W-607', 'DR22');
  li('6', '672VT51', '9',  '601XC5',  'B7', 'W-617', 'DR22');
  li('6', '672VT51', '9',  '672VT51', '10', 'W-625', 'DR22');
  li('6', '672VT51', '10', '620SW4',  '1',  'W-626', 'DR24');
  li('6', '600XC4', 'A8',  '672VT51', '11', 'W-608', 'DR22');
  li('6', '672VT51', '11', '601XC5',  'B8', 'W-618', 'DR22');
  li('6', '600XC4', 'A9',  '601XC5',  'B9', 'W-627', 'DR24');
  li('6', '600XC4', 'A10', '601XC5',  'B10', 'W-628', 'DR24');
  li('6', '600XC4', 'A11', '630RL5',  '1',  'W-630', 'DR24');
  li('6', '600XC4', 'A11', '631RL6',  '1',  'W-631', 'DR24');
  li('6', '630RL5', '2',   '601XC5',  'B11', 'W-632', 'DR24');
  li('6', '631RL6', '2',   '601XC5',  'B12', 'W-633', 'DR24');
  li('6', '610LP3', '2',   '914G',    '',   'W-640', 'DR24');
  li('6', '611LP4', '2',   '914G',    '',   'W-641', 'DR24');
  li('6', '620SW4', '2',   '914G',    '',   'W-642', 'DR24');
  li('6', '630RL5', '3',   '914G',    '',   'W-643', 'DR24');
  li('6', '631RL6', '3',   '914G',    '',   'W-644', 'DR24');
  li('6', '600XC4', 'A15', '915G',    '',   'W-645', 'DR22');
  li('6', '601XC5', 'B15', '915G',    '',   'W-646', 'DR22');
  return L;
}
