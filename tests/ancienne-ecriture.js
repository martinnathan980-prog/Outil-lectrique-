/* ===========================================================================
   L'ANCIENNE ÉCRITURE DES BARRETTES DE L'EXEMPLE (jusqu'à la v84) — un repère par module (667VT21, 668VT31…), des
   bornes numérotées 1, 2, 3… — pour les batteries qui vérifient la mécanique d'une barrette NUMÉROTÉE : une barrette à
   poser (VT1 : 1, 2, 3…), un fichier d'une autre forme, la bible d'atelier (ASNE0500…), la simulation d'un bornier.
   Depuis la v85, l'exemple écrit ses barrettes comme les fichiers du lecteur (« 667VT2 51 » + « A » : un repère par
   barrette, la borne dit le module et le contact) ; le câblage électrique (qui est relié à quoi) est le même.
       const { ancienne } = require('./ancienne-ecriture.js'); const LA = ancienne(X, L);
   `ancienne(X, L)` : l'exemple `L` (X.contratExemple()), ses barrettes rendues à l'ancienne écriture — les autres liaisons
   telles quelles, les part numbers d'alors.
   ========================================================================= */
const LIGNES = {
  '2': `210SP1 B12 667VT21 1 W-101 DR24 | 667VT21 1 667VT21 2 W-102 DR24 | 667VT21 2 115CD 3 W-103 DR24 | 667VT21 3 118CD 3 W-104 DR24 | 667VT21 4 409GH2 7 W-105 DR24`,
  '3': `300XC1 B1 668VT31 1 W-301 DR20 | 668VT31 1 668VT31 2 W-302 DR20 | 668VT31 2 668VT31 3 W-303 DR20 | 668VT31 2 351PM1 1 W-304 DR20 | 668VT31 3 352PM2 1 W-305 DR20 | 668VT31 4 361VL1 1 W-306 DR22 | 668VT31 5 668VT31 6 W-307 DR22 | 668VT31 5 362VL2 1 W-308 DR22 | 668VT31 6 363VL3 1 W-309 DR22 | 300XC1 B2 668VT31 4 W-310 DR22 | 300XC1 B3 668VT31 5 W-311 DR22 | 668VT31 8 381RL1 1 W-312 DR22 | 668VT31 9 382RL2 1 W-313 DR22 | 668VT31 10 383RL3 1 W-314 DR22 | 668VT31 8 668VT31 9 W-315 DR22 | 668VT31 9 668VT31 10 W-316 DR22 | 300XC1 B4 668VT31 8 W-317 DR22 | 371CP1 4 669VT32 1 W-340 MLB24 | 372CP2 3 669VT32 2 W-341 MLB24 | 300XC1 C6 669VT32 3 W-342 MLB24 | 669VT32 1 669VT32 2 W-343 DR24 | 669VT32 2 669VT32 3 W-344 DR24 | 669VT32 4 905G - W-345 DR22 | 669VT32 3 669VT32 4 W-346 DR24`,
  '4': `400XC2 B1 670VT41 1 W-401 DR20 | 670VT41 1 670VT41 2 W-402 DR20 | 670VT41 2 670VT41 3 W-403 DR20 | 670VT41 3 670VT41 4 W-404 DR20 | 670VT41 2 421ST1 1 W-405 DR22 | 670VT41 3 422ST2 1 W-406 DR22 | 670VT41 4 423ST3 1 W-407 DR22 | 400XC2 B2 670VT41 5 W-408 DR20 | 670VT41 5 670VT41 6 W-409 DR20 | 670VT41 5 431PR1 1 W-410 DR22 | 670VT41 6 441VN1 1 W-411 DR22 | 670VT41 7 442VN2 1 W-412 DR22 | 421ST1 3 671VT42 1 W-430 MLB24 | 422ST2 3 671VT42 2 W-431 MLB24 | 423ST3 3 671VT42 3 W-432 MLB24 | 671VT42 1 671VT42 2 W-433 DR24 | 671VT42 2 671VT42 3 W-434 DR24 | 671VT42 3 671VT42 4 W-435 DR24 | 671VT42 4 400XC2 A10 W-436 DR24`,
  '5': `500XC3 B7 674VT22 1 W-550 DR22 | 674VT22 1 674VT22 2 W-551 DR22 | 674VT22 1 540VL5 5 W-552 DR22 | 674VT22 2 560HT1 3 W-553 DR22`,
  '6': `600XC4 A1 672VT51 1 W-601 DR22 | 672VT51 1 601XC5 B1 W-611 DR22 | 600XC4 A2 672VT51 2 W-602 DR22 | 672VT51 2 601XC5 B2 W-612 DR22 | 672VT51 1 672VT51 2 W-620 DR22 | 600XC4 A3 672VT51 3 W-603 DR22 | 672VT51 3 601XC5 B3 W-613 DR22 | 672VT51 3 672VT51 4 W-621 DR22 | 672VT51 4 610LP3 1 W-622 DR24 | 600XC4 A4 672VT51 5 W-604 DR22 | 672VT51 5 601XC5 B4 W-614 DR22 | 600XC4 A5 672VT51 6 W-605 DR22 | 672VT51 6 601XC5 B5 W-615 DR22 | 672VT51 6 672VT51 7 W-623 DR22 | 672VT51 7 611LP4 1 W-624 DR24 | 600XC4 A6 672VT51 8 W-606 DR22 | 672VT51 8 601XC5 B6 W-616 DR22 | 600XC4 A7 672VT51 9 W-607 DR22 | 672VT51 9 601XC5 B7 W-617 DR22 | 672VT51 9 672VT51 10 W-625 DR22 | 672VT51 10 620SW4 1 W-626 DR24 | 600XC4 A8 672VT51 11 W-608 DR22 | 672VT51 11 601XC5 B8 W-618 DR22 | 600XC4 A12 673VT52 1 W-650 DR24 | 673VT52 1 673VT52 2 W-651 DR24 | 673VT52 1 630RL5 4 W-652 DR24 | 673VT52 2 631RL6 4 W-653 DR24`,
};
const PN = { '667VT21': 'E0599-1B201Z', '668VT31': 'E0599-1A101Z', '669VT32': 'E0599-1B204Z', '670VT41': 'NSA937901M20-06', '671VT42': 'NSA937901M20-04',
  '672VT51': 'E0599-1A101Z', '673VT52': 'E0599-1A101Z', '674VT22': 'E0599-1B201Z' };
const NOUVELLES = new Set(['667VT2', '668VT3', '670VT4', '672VT5']);
// la route provisoire de l'exemple, tirée du type (01, `contratExemple`)
const routeExemple = t => /^ML/i.test(t) ? 'BLINDÉ' : /^DR(16|20)$/i.test(t) ? 'PUISSANCE' : 'SIGNAL';
function ancienne(X, L) { const pn = new Map(); L.forEach(l => { if (l.pnDe) pn.set(l.de, l.pnDe); if (l.pnVers) pn.set(l.vers, l.pnVers); });
  const vieilles = Object.entries(LIGNES).flatMap(([plan, t]) => t.split(' | ').map(s => { const [de, bDe, vers, bVers, cable, type] = s.split(' ').map(x => x === '-' ? '' : x);
    return X.liaison({ de, borneDe: bDe, pnDe: PN[de] || pn.get(de) || '', vers, borneVers: bVers, pnVers: PN[vers] || pn.get(vers) || '', cable, type, route: routeExemple(type), plan }); }));
  return [...L.filter(l => !NOUVELLES.has(l.de) && !NOUVELLES.has(l.vers)), ...vieilles]; }
module.exports = { ancienne, NOUVELLES };
