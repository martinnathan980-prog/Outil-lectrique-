/* ===========================================================================
   DOCUMENT A — un schéma de principe de huit folios, inventé de bout en bout
   ---------------------------------------------------------------------------
   « Distribution 28 V CC — carburant et dégivrage » : une batterie et une
   génératrice derrière un contacteur, une barrette qui distribue vers quatre
   disjoncteurs, deux relais de pompe, une prise de coupure, des capteurs sur
   une barrette à deux modules, un calculateur à deux connecteurs lettrés, le
   dégivrage, un bornier, une interface. Des renvois d'un folio à l'autre
   (« F3/B2 », le folio et la zone de l'autre bout), des types de câble écrits,
   des T avec un point, des croisements sans point, des masses.
   Rien de ce qui est écrit ici n'existe : repères, références, titres.
   =========================================================================== */
'use strict';

const CATALOGUE = {
  '101BT1': { genre: 'boite', desig: 'BATTERIE 28 V', pn: 'MS3509-1', largeur: 30 },
  '111GN1': { genre: 'boite', desig: 'GÉNÉRATRICE 28 V', pn: 'EN2997Y1A04P', largeur: 30 },
  '105CT1': { genre: 'relais', desig: 'CONTACTEUR BATTERIE', pn: 'M83536/1-024M' },
  '106SW1': { genre: 'inter', desig: 'INTER BATTERIE', pn: 'MS24523-22', bornes: ['1', '2', '3'] },
  '131VT1': { genre: 'barrette', pn: 'M81714/60-22-1', modules: [{ num: '51', lettres: 'ABCDEFGH', bus: ['ABCDEF'], typeBus: 'DR16', pn: 'M81714/60-22-1' }] },
  '121CB1': { genre: 'disjoncteur', calibre: '10 A', pn: 'MS3320-10' },
  '122CB1': { genre: 'disjoncteur', calibre: '10 A', pn: 'MS3320-10' },
  '123CB1': { genre: 'disjoncteur', calibre: '3 A', pn: 'MS3320-3' },
  '124CB1': { genre: 'disjoncteur', calibre: '7,5 A', pn: 'MS3320-7.5' },
  '211SW1': { genre: 'inter', desig: 'INTER POMPES', pn: 'MS24524-23', bornes: ['1', '2', '3', '4', '5', '6'] },
  '212PB1': { genre: 'inter', desig: 'ESSAI VOYANTS', pn: 'MS25089-1C', bornes: ['1', '2'] },
  '241DI1': { genre: 'diode', desig: 'DIODE ESSAI 1', pn: 'D2-1A', bornes: ['A', 'K'] },
  '242DI2': { genre: 'diode', desig: 'DIODE ESSAI 2', pn: 'D2-1A', bornes: ['A', 'K'] },
  '215LP1': { genre: 'lampe', desig: 'VOYANT POMPE 1', pn: 'MS25041-2' },
  '216LP2': { genre: 'lampe', desig: 'VOYANT POMPE 2', pn: 'MS25041-2' },
  '217LP3': { genre: 'lampe', desig: 'VOYANT DÉGIVRAGE', pn: 'MS25041-2' },
  '203RL1': { genre: 'relais', desig: 'RELAIS POMPE 1', pn: 'M83536/1-021M' },
  '204RL2': { genre: 'relais', desig: 'RELAIS POMPE 2', pn: 'M83536/1-021M' },
  '408VC1A': { genre: 'prise', lettres: 'ABCD', pn: 'EN3646A1004PN' },
  '351PM1': { genre: 'boite', desig: 'POMPE CARBURANT 1', pn: 'EN2997Y1A08P', bornes: ['1', '2', '3'] },
  '352PM2': { genre: 'boite', desig: 'POMPE CARBURANT 2', pn: 'EN2997Y1A08P', bornes: ['1', '2', '3'] },
  '230SP1': { genre: 'boite', desig: 'CAPTEUR PRESSION 1', pn: 'EN2997Y1A04P', bornes: ['1', '2', '3', '4'] },
  '231SP2': { genre: 'boite', desig: 'CAPTEUR PRESSION 2', pn: 'EN2997Y1A04P', bornes: ['1', '2', '3', '4'] },
  '667VT2': { genre: 'barrette', pn: 'M81714/60-22-1', modules: [{ num: '51', lettres: 'ABCDEF', bus: ['ABC'], typeBus: 'DR24', pn: 'M81714/60-22-1' }, { num: '52', lettres: 'ABCDEF', bus: ['ABCD'], typeBus: 'DR24', pn: 'M81714/60-22-1' }], visio: { prompt: 'module' } },
  '421ST1': { genre: 'boite', desig: 'SONDE TEMPÉRATURE', pn: 'EN2997Y1A02P', bornes: ['1', '2'], largeur: 30 },
  '431PR1': { genre: 'boite', desig: 'PRESSOSTAT', pn: 'EN2997Y1A04P', bornes: ['1', '2', '3'], largeur: 30 },
  '250CP1': { genre: 'boite', desig: 'CALCULATEUR CARBURANT', pn: 'EN4165-2M', connecteurs: true, largeur: 42, coteConnecteur: { A: 'D', B: 'G' }, visio: { points: 'numero' } },
  '252RL3': { genre: 'relais', desig: 'RELAIS ALARME', pn: 'M83536/1-021M' },
  '261LP4': { genre: 'lampe', desig: 'VOYANT ALARME', pn: 'MS25041-2' },
  '262XC1': { genre: 'boite', desig: 'INTERFACE AVIONIQUE', pn: 'EN4165-2M', bornes: ['A1', 'A2', 'A3', 'B1', 'B2'] },
  '601RL1': { genre: 'relais', desig: 'RELAIS DÉGIVRAGE', pn: 'M83536/1-024M' },
  '605SW2': { genre: 'inter', desig: 'INTER DÉGIVRAGE', pn: 'MS24523-22', bornes: ['1', '2', '3'] },
  '409VC2A': { genre: 'prise', lettres: 'ABC', pn: 'EN3646A1003PN' },
  '560HT1': { genre: 'boite', desig: 'RÉCHAUFFEUR SONDE', pn: 'EN2997Y1A02P', bornes: ['1', '2'], largeur: 32 },
  '561HT2': { genre: 'boite', desig: 'RÉCHAUFFEUR ENTRÉE D’AIR', pn: 'EN2997Y1A02P', bornes: ['1', '2'], largeur: 36 },
  '711CB5': { genre: 'disjoncteur', calibre: '2 A', pn: 'MS3320-2' },
  '712CB6': { genre: 'disjoncteur', calibre: '3 A', pn: 'MS3320-3' },
  '397TB1': { genre: 'boite', desig: 'BORNIER', pn: 'MS27212-1-8', bornes: ['1', '2', '3', '4', '5', '6', '7', '8'], largeur: 25 },
  '720VT3': { genre: 'barrette', pn: 'M81714/60-20-1', modules: [{ num: '51', lettres: 'ABCD', bus: ['ABC'], typeBus: 'DR20', pn: 'M81714/60-20-1' }] },
  '801XC2': { genre: 'boite', desig: 'CONNECTEUR D’INTERFACE', pn: 'EN3646A1410PN', bornes: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4'], largeur: 32 },
  '802RL4': { genre: 'relais', desig: 'RELAIS SECOURS', pn: 'M83536/1-021M' },
  '810CP2': { genre: 'boite', desig: 'BOÎTIER DE SURVEILLANCE', pn: 'EN4165-2M', connecteurs: true, bornes: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8'], largeur: 38, coteConnecteur: { A: 'G' } } };

const FOLIOS = [
  { n: 1, titre: 'SOURCES ET DISTRIBUTION', eqs: [['101BT1', 0], ['111GN1', 0], ['105CT1', 1], ['106SW1', 1], ['131VT1', 2], ['121CB1', 3], ['122CB1', 3], ['123CB1', 3], ['124CB1', 3]],
    notes: ['1. LONGUEURS DES CÂBLES DE PUISSANCE AU PLAN DE FAISCEAU.', '2. MASSES 901G ET 902G SUR LA MÊME PLAQUE DE MASSE.'] },
  { n: 2, titre: 'COMMANDES ET VOYANTS', eqs: [['211SW1', 0], ['212PB1', 0], ['241DI1', 1], ['242DI2', 1], ['215LP1', 2], ['216LP2', 2], ['217LP3', 2]] },
  { n: 3, titre: 'POMPES CARBURANT', eqs: [['203RL1', 0], ['204RL2', 0], ['408VC1A', 1], ['351PM1', 2], ['352PM2', 2]], notes: ['1. PRISE 408VC1A : PARTIE FIXE CÔTÉ POMPES.'] },
  { n: 4, titre: 'CAPTEURS', eqs: [['230SP1', 0], ['231SP2', 0], ['667VT2', 1], ['421ST1', 2], ['431PR1', 2]], notes: ['1. CÂBLES BLINDÉS : REPRISE DE BLINDAGE AU CALCULATEUR.'] },
  { n: 5, titre: 'CALCULATEUR CARBURANT', eqs: [['250CP1', 0], ['252RL3', 1], ['261LP4', 2], ['262XC1', 2]] },
  { n: 6, titre: 'DÉGIVRAGE', eqs: [['601RL1', 0], ['605SW2', 0], ['409VC2A', 1], ['560HT1', 2], ['561HT2', 2]] },
  { n: 7, titre: 'PROTECTION DES COMMANDES', eqs: [['711CB5', 0], ['712CB6', 0], ['397TB1', 1], ['720VT3', 2]] },
  { n: 8, titre: 'INTERFACE ET SECOURS', eqs: [['801XC2', 0], ['802RL4', 1], ['810CP2', 2]] }];

// [de, vers, type, folio, folioVers, signal]
const FILS = [
  // folio 1
  ['101BT1:1', '105CT1:A1', 'DR12', 1], ['111GN1:B', '105CT1:A1', 'DR12', 1], ['101BT1:2', 'masse:901G', 'DR12', 1], ['111GN1:E', 'masse:902G', 'DR12', 1],
  ['105CT1:A2', '131VT1:51A', 'DR12', 1], ['131VT1:51B', '121CB1:1', 'DR16', 1], ['131VT1:51C', '122CB1:1', 'DR16', 1], ['131VT1:51D', '123CB1:1', 'DR20', 1], ['131VT1:51E', '124CB1:1', 'DR16', 1],
  ['105CT1:X1', '106SW1:2', 'DR22', 1], ['105CT1:X2', 'masse:903G', 'DR22', 1], ['106SW1:1', '123CB1:2', 'DR22', 1],
  ['121CB1:2', '203RL1:A1', 'DR16', 1, 3, 'ALIM POMPE 1'], ['122CB1:2', '204RL2:A1', 'DR16', 1, 3, 'ALIM POMPE 2'], ['123CB1:2', '211SW1:1', 'DR22', 1, 2, 'COMMANDE POMPES'],
  ['124CB1:2', '601RL1:A1', 'DR16', 1, 6, 'ALIM DÉGIVRAGE'], ['131VT1:51F', '711CB5:1', 'DR20', 1, 7, '+28 V COMMANDES'],
  // folio 2
  ['211SW1:2', '212PB1:1', 'DR22', 2], ['211SW1:1', '211SW1:4', 'DR22', 2], ['212PB1:2', '241DI1:A', 'DR24', 2], ['212PB1:2', '242DI2:A', 'DR24', 2],
  ['241DI1:K', '215LP1:1', 'DR24', 2], ['242DI2:K', '216LP2:1', 'DR24', 2], ['215LP1:2', 'masse:904G', 'DR24', 2], ['216LP2:2', 'masse:904G', 'DR24', 2], ['217LP3:2', 'masse:904G', 'DR24', 2],
  ['211SW1:3', '203RL1:X1', 'DR22', 2, 3, 'CDE POMPE 1'], ['211SW1:6', '204RL2:X1', 'DR22', 2, 3, 'CDE POMPE 2'],
  // folio 3
  ['203RL1:A2', '408VC1A:A', 'DR16', 3], ['408VC1A:A', '351PM1:1', 'DR16', 3], ['204RL2:A2', '408VC1A:B', 'DR16', 3], ['408VC1A:B', '352PM2:1', 'DR16', 3],
  ['351PM1:2', '408VC1A:C', 'DR16', 3], ['408VC1A:C', 'masse:905G', 'DR16', 3], ['352PM2:2', '408VC1A:D', 'DR16', 3], ['408VC1A:D', 'masse:905G', 'DR16', 3],
  ['203RL1:X2', 'masse:906G', 'DR22', 3], ['204RL2:X2', 'masse:906G', 'DR22', 3],
  ['203RL1:A3', '215LP1:1', 'DR22', 3, 2, 'VOYANT POMPE 1'], ['204RL2:A3', '216LP2:1', 'DR22', 3, 2, 'VOYANT POMPE 2'],
  ['351PM1:3', '250CP1:A1', 'DR22', 3, 5, 'ÉTAT POMPE 1'], ['352PM2:3', '250CP1:A2', 'DR22', 3, 5, 'ÉTAT POMPE 2'],
  // folio 4
  ['230SP1:1', '667VT2:51A', 'DR24', 4], ['231SP2:1', '667VT2:51B', 'DR24', 4], ['230SP1:2', '667VT2:52A', 'DR24', 4], ['231SP2:2', '667VT2:52B', 'DR24', 4],
  ['431PR1:3', '667VT2:52C', 'DR24', 4], ['667VT2:52D', 'masse:907G', 'DR22', 4], ['431PR1:2', 'masse:907G', 'DR24', 4],
  ['667VT2:51C', '250CP1:A10', 'DR24', 4, 5, 'ALIM CAPTEURS'], ['431PR1:1', '250CP1:A11', 'DR24', 4, 5, 'PRESSOSTAT'],
  ['230SP1:3', '250CP1:B1', 'MLB24', 4, 5, 'PRESSION 1 +'], ['230SP1:4', '250CP1:B2', 'MLB24', 4, 5, 'PRESSION 1 −'],
  ['231SP2:3', '250CP1:B3', 'MLB24', 4, 5, 'PRESSION 2 +'], ['231SP2:4', '250CP1:B4', 'MLB24', 4, 5, 'PRESSION 2 −'],
  ['421ST1:1', '250CP1:B5', 'MLB24', 4, 5, 'TEMPÉRATURE +'], ['421ST1:2', '250CP1:B6', 'MLB24', 4, 5, 'TEMPÉRATURE −'],
  // folio 5
  ['250CP1:A20', '252RL3:X1', 'DR24', 5], ['252RL3:X2', 'masse:908G', 'DR24', 5], ['252RL3:A2', '261LP4:1', 'DR22', 5], ['261LP4:2', 'masse:908G', 'DR22', 5],
  ['252RL3:A1', '262XC1:A3', 'DR22', 5], ['250CP1:B10', '262XC1:A1', 'MLB24', 5], ['250CP1:B11', '262XC1:A2', 'MLB24', 5], ['250CP1:A21', '262XC1:B1', 'DR24', 5],
  // folio 6
  ['601RL1:A2', '409VC2A:A', 'DR16', 6], ['409VC2A:A', '560HT1:1', 'DR16', 6], ['601RL1:A2', '409VC2A:B', 'DR16', 6], ['409VC2A:B', '561HT2:1', 'DR16', 6],
  ['560HT1:2', '409VC2A:C', 'DR16', 6], ['409VC2A:C', 'masse:909G', 'DR16', 6], ['561HT2:2', 'masse:910G', 'DR16', 6], ['601RL1:X1', '605SW2:2', 'DR22', 6], ['601RL1:X2', 'masse:911G', 'DR22', 6],
  ['601RL1:A3', '217LP3:1', 'DR22', 6, 2, 'VOYANT DÉGIVRAGE'],
  // folio 7
  ['711CB5:1', '712CB6:1', 'DR20', 7], ['711CB5:2', '397TB1:1', 'DR22', 7], ['397TB1:1', '397TB1:2', 'DR22', 7], ['712CB6:2', '720VT3:51A', 'DR20', 7], ['397TB1:5', 'masse:912G', 'DR22', 7],
  ['397TB1:2', '605SW2:1', 'DR22', 7, 6, 'CDE DÉGIVRAGE'], ['720VT3:51B', '250CP1:A30', 'DR20', 7, 5, '+28 V CALCULATEUR'], ['720VT3:51C', '801XC2:A1', 'DR20', 7, 8, 'ALIM INTERFACE'], ['720VT3:51D', '802RL4:X1', 'DR24', 7, 8, 'CDE SECOURS'],
  // folio 8
  ['801XC2:A2', '802RL4:A1', 'DR22', 8], ['802RL4:A2', '810CP2:A3', 'DR22', 8], ['802RL4:X2', 'masse:913G', 'DR24', 8], ['801XC2:B1', '810CP2:A1', 'MLB24', 8], ['801XC2:B2', '810CP2:A2', 'MLB24', 8],
  ['810CP2:A8', 'masse:913G', 'DR22', 8], ['810CP2:A7', 'masse:914G', 'DR22', 8], ['801XC2:A3', '810CP2:A4', 'DR24', 8]];

const DOCUMENT_A = { numero: 'SC-4520-201', titre: 'DISTRIBUTION 28 V CC — CARBURANT ET DÉGIVRAGE', titreCourt: 'DISTRIBUTION 28 V CC', indice: 'C', faisceau: 'FX-4520-21', auteur: 'BE CÂBLAGE', date: '14/09/2026',
  style: 'A', catalogue: CATALOGUE, folios: FOLIOS, fils: FILS, prefixe: 'a',
  texteRenvoi: ({ folio, zone }) => 'F' + folio + '/' + zone };

module.exports = { DOCUMENT_A };
