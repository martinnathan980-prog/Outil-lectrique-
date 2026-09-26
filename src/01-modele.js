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
