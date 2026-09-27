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
  const q = lireRepere(repere);
  return (q && q.num && CODES[q.code]) ? CODES[q.code].forme : 'equipement';
}
const estBarrette = r => formeDe(r) === 'barrette';
const estCoupure  = r => formeDe(r) === 'coupure';
const estMasse    = r => formeDe(r) === 'masse';
/* Un bornier — barrette ou prise de coupure — se dessine en réglette : une
   colonne de bornes, un fil de chaque côté. */
const estBornier  = r => estBarrette(r) || estCoupure(r);

function liaison(o) {
  const s = v => (v == null ? '' : String(v).trim());
  return { de: s(o.de), borneDe: s(o.borneDe), pnDe: s(o.pnDe),
           vers: s(o.vers), borneVers: s(o.borneVers), pnVers: s(o.pnVers),
           cable: s(o.cable), type: s(o.type), route: s(o.route), plan: s(o.plan) };
}
/* Une liaison sans équipement à un bout n'en est pas une : c'est une ligne
   en cours de saisie. On la garde dans la table, pas dans le dessin. */
const liaisonComplete = l => !!(l.de && l.vers);

function nouveauContrat() {
  return {
    liaisons: [],
    designations: new Map(),           // repère -> désignation libre
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
/* Le contrat d'exemple, celui qu'on voit en ouvrant l'outil : trois plans,
   donc trois folios — un facile, un moyen, un très chargé — avec ce que le
   retest porte en vrai : les part numbers des connecteurs, des bornes qui
   disent leur connecteur (A12), des barrettes qui distribuent avec leurs
   shunts, des prises de coupure, des fils blindés, des masses. */
function contratExemple() {
  const PN = {
    '101BT1': 'MS3470L14-5P', '102CB1': 'NSA935401-10', '103RL1': 'E0836IS35-22SA', '104LP1': 'E0644D9S',
    '210SP1': '*704A46220028', '340AB1': 'EN2997Y1A08P', '340AB2': 'EN2997Y1A08P', '115CD': 'ABS0864-12', '118CD': 'ABS0864-12',
    '409GH2': 'NSA937802-05', '512VN': 'E0644G9S', '601RC': 'E0836IS35-22SA', '733LE': 'E0644D9S', '845VG': 'E0656A01N1S0',
    '667VT21': 'ASNE0500-04', '408VC1A': 'EN3646A6083AAN',
    '300XC1': 'EN4165-2M', '351PM1': 'EN2997Y1A12P', '352PM2': 'EN2997Y1A12P', '361VL1': 'ABS0864-08', '362VL2': 'ABS0864-08', '363VL3': 'ABS0864-08',
    '371CP1': 'E0644B9S', '372CP2': 'E0644B9S', '381RL1': 'E0836IS35-22SA', '382RL2': 'E0836IS35-22SA', '383RL3': 'E0836IS35-22SA',
    '391LP1': 'E0644D9S', '392LP2': 'E0644D9S', '395SW1': 'NSA937802-03', '396SW2': 'NSA937802-03', '397TB1': 'ASNE0501-08',
    '668VT31': 'ASNE0500-12', '669VT32': 'ASNE0502-08', '409VC2A': 'EN3646A6083AAN', '410VC2B': 'EN3646A6083AAN' };
  const L = [];
  const li = (plan, de, bDe, vers, bVers, cable, type) =>
    L.push(liaison({ de, borneDe: bDe, pnDe: PN[de] || '', vers, borneVers: bVers, pnVers: PN[vers] || '', cable, type, plan }));
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
  li('2', '601RC',  '11', '733LE',  'CNT',  'W-150', 'MLC24');
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
  return L;
}
