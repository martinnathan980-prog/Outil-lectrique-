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
             et, quand le retest les porte : fwd (le DESSIN d'origine, gardé tel
             quel même quand l'outil redécoupe les folios), descriptionDe /
             descriptionVers (Description1 / Description2), harness, longueur,
             appareil, retest
   =========================================================================== */
'use strict';

/* L'ordre naturel du français (1, 2, 10 ; A1, A2, B1), UN collateur pour tout l'outil : `localeCompare` avec options en
   refait un à chaque comparaison — sur un retest de 100 000 lignes, c'est l'essentiel du temps d'un tri. */
const COLLATEUR_FR = new Intl.Collator('fr', { numeric: true });
/* LE CÔTÉ D'UNE ROUTE (le lecteur, v74 : « les routes 1MO, 2MO, 1HO, 2HO… — impair à gauche de l'hélicoptère, pair à
   droite, pour la ségrégation ») : le nombre en tête de la route ; 'gauche', 'droite', ou '' sans nombre. */
const coteDeRoute = r => { const m = /^\s*(\d+)/.exec(String(r || '')); return m ? (+m[1] % 2 ? 'gauche' : 'droite') : ''; };
const RAIL_RE = /^(L1|L2|L3|L|N|PE|PEN|GND|0V|\+|-|VCC|VDD|\+?\d{1,3}V)$/i;

/* Le repère aéronautique porte son code AU MILIEU : <numéro><CODE><suffixe>
   — 667VT21, 408VC1A, 210SP1, 904G. Les trois chiffres de tête disent la zone
   ou le système, le code la NATURE, la fin l'ordre et la variante (09
   quinquies, `decoderRepere`). Chaque code connu a son nom ; seules trois
   natures changent la FORME du dessin (barrette, prise de coupure, masse) :
   tout le reste se dessine en équipement. Un code absent d'ici reste un
   équipement sans nature : on ne lui en invente pas une. */
const CODES = {
  VT: { nom: 'barrette de jonction', forme: 'barrette' },
  VC: { nom: 'prise de coupure',     forme: 'coupure'  },
  G:  { nom: 'masse',                forme: 'masse'    },
  CB: { nom: 'disjoncteur',          forme: 'equipement' },
  RL: { nom: 'relais',               forme: 'equipement' },
  CT: { nom: 'contacteur',           forme: 'equipement' },
  SW: { nom: 'interrupteur',         forme: 'equipement' },
  PB: { nom: 'bouton-poussoir',      forme: 'equipement' },
  LP: { nom: 'voyant',               forme: 'equipement' },
  BT: { nom: 'batterie',             forme: 'equipement' },
  GN: { nom: 'génératrice',          forme: 'equipement' },
  TR: { nom: 'transfo-redresseur',   forme: 'equipement' },
  XC: { nom: 'connecteur',           forme: 'equipement' },
  TB: { nom: 'bornier',              forme: 'equipement' },
  CP: { nom: 'calculateur',          forme: 'equipement' },
  PM: { nom: 'pompe',                forme: 'equipement' },
  PL: { nom: 'pompe',                forme: 'equipement' },
  VL: { nom: 'vanne',                forme: 'equipement' },
  MT: { nom: 'moteur',               forme: 'equipement' },
  HT: { nom: 'réchauffeur',          forme: 'equipement' },
  SP: { nom: 'capteur',              forme: 'equipement' },
  ST: { nom: 'sonde',                forme: 'equipement' },
  PR: { nom: 'pressostat',           forme: 'equipement' },
  FU: { nom: 'fusible',              forme: 'equipement' },
  DI: { nom: 'diode',                forme: 'equipement' },
  RS: { nom: 'résistance',           forme: 'equipement' },
  AN: { nom: 'antenne',              forme: 'equipement' }
};
/* La NATURE DITE : un équipement dont le code ne dit pas la nature (115CD), ou la dit mal, l'ingénieur la dit (« c'est un
   disjoncteur ») ; le contrat la garde et l'interface installe ici sa lecture (08-recap) — le moteur seul (un Worker)
   ne la connaît pas. Elle ne vaut que d'un équipement à un autre : la forme du dessin (barrette, prise, masse) reste
   celle du code. `codeLu` : le code tel que le repère l'écrit. */
let natureDite = null;
function lireRepere(repere) {
  const m = /^([0-9]*)\s*([A-Za-z]+)([0-9A-Za-z\-_.]*)$/.exec(String(repere || '').trim()); if (!m) return null;
  const q = { num: m[1], code: m[2].toUpperCase(), suffixe: m[3] }, d = natureDite ? natureDite(String(repere).trim()) : '';
  const equipement = c => !CODES[c] || CODES[c].forme === 'equipement';
  return d && d !== q.code && equipement(q.code) && (CODES[d] ? CODES[d].forme === 'equipement' : d === 'EQ') ? { ...q, code: d, codeLu: q.code } : q;
}
function formeSansMemoire(repere) {
  if (VT_A_POSER.test(String(repere || '').trim())) return 'barrette';   // une barrette à poser (VT1, VT2…)
  const q = lireRepere(repere);
  return (q && q.num && CODES[q.code]) ? CODES[q.code].forme : 'equipement';
}
/* (v84, la vitesse : sur le plan géant des fichiers piégés, 3 135 liaisons, `formeDe` se relisait des millions de fois — 0,5 s
   à l'ouverture, autant à chaque contrôle) La forme ne dépend que de l'écriture du repère : la nature dite à la main (`natureDite`)
   ne change que le nom d'un équipement, jamais sa forme (barrette, prise, masse restent celles du code). Elle se garde. */
const FORMES_DES_REPERES = new Map();
function formeDe(repere) { const r = repere == null ? '' : String(repere), M = FORMES_DES_REPERES; let f = M.get(r); if (f !== undefined) return f;
  f = formeSansMemoire(r); if (M.size > 50000) M.clear(); M.set(r, f); return f; }
const estBarrette = r => formeDe(r) === 'barrette';
const estCoupure  = r => formeDe(r) === 'coupure';
const estMasse    = r => formeDe(r) === 'masse';
/* Un bornier — barrette ou prise de coupure — se dessine en réglette : une
   colonne de bornes, un fil de chaque côté. */
const estBornier  = r => estBarrette(r) || estCoupure(r);

/* Un bout tel que la base l'écrit : « 677VT2 51 » dans Device et « B » dans Pin — le repère, puis le MODULE de la
   barrette, puis le contact du module. Chez nous : repère 677VT2, borne 51B (le module et son contact). Un repère sans
   espace reste tel quel. */
// (v84) seul un repère aéronautique numéroté (677VT2) porte un module : « LAMP 1 » reste un nom, il n'est pas coupé en LAMP:1-…
function boutLu(repere, borne) { const r = String(repere == null ? '' : repere).trim(), b = String(borne == null ? '' : borne).trim();
  const m = /^(\S+)\s+(\d+)$/.exec(r), q = m ? lireRepere(m[1]) : null; if (!q || !q.num) return [r, b];
  return [m[1], m[2] + (/^\d/.test(b) ? '-' : '') + b]; }
/* Une longueur du retest : des mm (« 3670 ») ou des m (« 3,67 ») ; en mètres chez nous, ou null. (v84, les fichiers piégés :
   « 2 500 » — l'espace des milliers d'Excel — se lisait 2 mm, « 1e3 » 1 mm.) Les espaces entre chiffres tombent, la
   virgule décimale devient un point, une puissance de dix se lit. */
// un nombre écrit à la main : « 2 500 » (espace, espace insécable, espace fine), « 2.500,5 » (le point des milliers devant la
// virgule décimale), « 2,500.5 » (à l'anglaise) — le dernier des deux signes est la décimale, l'autre sépare les milliers
const nombreDeLaCase = s => { let t = String(s).trim().replace(/(\d)[\s  ]+(?=\d)/g, '$1'); const p = t.lastIndexOf('.'), v = t.lastIndexOf(',');
  if (p >= 0 && v >= 0) t = p > v ? t.replace(/,/g, '') : t.replace(/\./g, '').replace(',', '.'); else t = t.replace(',', '.'); return t; };
function longueurLue(v) { if (v == null || v === '') return null; if (typeof v === 'number') return v > 100 ? v / 1000 : v > 0 ? v : null;
  const t = nombreDeLaCase(v), m = /-?\d+(\.\d+)?(e[+-]?\d+)?/i.exec(t); if (!m) return null;
  const x = parseFloat(m[0]); if (!(x > 0) || !isFinite(x)) return null;
  return /mm/i.test(t) || (!/\bm\b/i.test(t) && x > 100) ? x / 1000 : x; }
/* (v84) CE QUE LE FICHIER ÉCRIVAIT, quand VOLTA le lit autrement : « 677VT2 51 » + « B » se lit 677VT2:51B (`boutLu`), une
   longueur illisible (« abc », « -3 ») ne se lit pas — l'installation corrigée (08-export) les RÉÉCRIT comme le fichier
   les portait, tant que la lecture n'a pas changé. `ecrit` : { de, borneDe, vers, borneVers } tels que le fichier les
   écrivait ; il ne vaut que s'il se relit encore en la liaison (`ecritDuBout`). */
/* (v86, l'audit B3) un repère écrit de deux façons — « 103rl1 » et « 103RL1 », « 101 BT1 » et « 101BT1 » — se LIT d'une seule
   (02, `unifierLesReperes`) : sa forme, en capitales sans espace, est la même ; l'écriture du fichier reste valable tant que
   seule la casse ou une espace diffère, et l'installation corrigée la rend telle quelle (seul le geste « Écrire 103RL1
   partout », 08-controle, l'écrit). */
const formeEcrite = r => String(r == null ? '' : r).toUpperCase().replace(/\s+/g, '');
const memeRepereEcrit = (x, y) => x === y || formeEcrite(x) === formeEcrite(y);
const ecritDuBout = (l, cote) => { const e = l && l.ecrit, a = cote === 'de' ? 'de' : 'vers', b = cote === 'de' ? 'borneDe' : 'borneVers';
  if (!e || e[a] == null) return null; const [r, n] = boutLu(e[a], e[b]); return memeRepereEcrit(r, l[a]) && n === l[b] ? [e[a], e[b] == null ? '' : e[b]] : null; };
function liaison(o) {
  const s = v => (v == null ? '' : String(v).trim()), [de, borneDe] = boutLu(o.de, o.borneDe), [vers, borneVers] = boutLu(o.vers, o.borneVers);
  const l = { de, borneDe, pnDe: s(o.pnDe), vers, borneVers, pnVers: s(o.pnVers), cable: s(o.cable), type: s(o.type), route: s(o.route), plan: s(o.plan) };
  // ce que le vrai retest porte en plus : le faisceau, la longueur (m), l'appareil, la date du retest, le dessin (FWD)
  // d'origine, les descriptions des deux équipements
  const longueur = longueurLue(o.longueur); if (longueur != null) l.longueur = longueur; else if (s(o.longueurBrute)) l.longueurBrute = s(o.longueurBrute);
  if (s(o.harness)) l.harness = s(o.harness); if (s(o.appareil)) l.appareil = s(o.appareil); if (s(o.retest)) l.retest = s(o.retest);
  if (s(o.fwd)) l.fwd = s(o.fwd); if (s(o.descriptionDe)) l.descriptionDe = s(o.descriptionDe); if (s(o.descriptionVers)) l.descriptionVers = s(o.descriptionVers);
  // (v84) l'installation et son ECP, et les colonnes que VOLTA ne lit pas (`autres` : { en-tête: valeur }) : gardées telles
  // quelles, l'installation corrigée les rend (la donnée du fichier reste intacte)
  if (s(o.install)) l.install = s(o.install); if (s(o.ecp)) l.ecp = s(o.ecp);
  if (o.autres && typeof o.autres === 'object') { const a = {}; let n = 0; Object.keys(o.autres).forEach(k => { const v = s(o.autres[k]); if (k && v) { a[k] = v; n++; } }); if (n) l.autres = a; }
  // le bout tel que le fichier l'écrivait, quand la lecture le change (« 677VT2 51 » + « B ») — ou tel qu'une liaison déjà lue le garde
  const e = {}; [['de', 'borneDe', de, borneDe], ['vers', 'borneVers', vers, borneVers]].forEach(([a, b, r, n]) => { const ra = s(o[a]), rb = s(o[b]);
    if (ra !== r || rb !== n) { e[a] = ra; e[b] = rb; } else if (o.ecrit && o.ecrit[a] != null) { const [r2, n2] = boutLu(o.ecrit[a], o.ecrit[b]); if (memeRepereEcrit(r2, r) && n2 === n) { e[a] = s(o.ecrit[a]); e[b] = s(o.ecrit[b]); } } });
  if (Object.keys(e).length) l.ecrit = e;
  // le contact à sertir écrit à la main à un bout (le récapitulatif) : il passe devant celui que le plan donne
  if (s(o.contactDe)) l.contactDe = s(o.contactDe); if (s(o.contactVers)) l.contactVers = s(o.contactVers);
  // ce que le fichier portait là où on l'a corrigé (`changerLiaison`, `poserChamp`) : un plan rouvert le garde, et le
  // retest corrigé (08-export) commente encore ses cases changées
  if (o.avant && typeof o.avant === 'object') l.avant = { ...o.avant };
  // (v86) le câble que VOLTA crée pour une barrette (`aCreer`, plus bas) le reste une fois la barrette posée au contrat :
  // ses bornes ne disent plus « 1 » (« 51H »), sa marque le dit — ce que VOLTA ajoute se retrouve (08-journal)
  if (o.aCreer === true) l.aCreer = true;
  return l;
}
/* Une liaison sans équipement à un bout n'en est pas une : c'est une ligne
   en cours de saisie. On la garde dans la table, pas dans le dessin. */
const liaisonComplete = l => !!(l.de && l.vers);
// (v77, le lecteur : « les câbles n'ont plus de numéro, il faut mettre le type ») : un câble sans numéro se dit par son type
// (v78, le lecteur : « il n'y a plus de numéro de câble du tout, ça doit disparaître ») : un câble se dit par son TYPE et
// par où il va — « DR12 vers 103RL1:A1 » —, jamais par son numéro (la colonne reste dans le fichier ; l'export la rend telle quelle)
const cableDit = l => { const t = (l && String(l.type || '').trim()) || 'câble', v = l && (l.vers || l.autre); return t + (v ? ' vers ' + v + (l.vers && l.borneVers ? ':' + l.borneVers : '') : ''); };
const cableEtType = l => cableDit(l);

/* ---- LES BARRETTES À POSER ---------------------------------------------------
   Plusieurs fils sur une même borne d'équipement (le contrat dit « 102CB1:2 → 103RL1 » et « 395SW1 → 102CB1:2 ») : on
   ne sertit pas deux fils dans un contact, on pose une BARRETTE (le lecteur : « quand les fils se dédoublent, il faut
   une barrette »). Le folio la reçoit comme une vraie barrette, que le moteur place et dessine comme les autres — une
   colonne, une borne par fil, jamais deux fils au même niveau :
     · un fil À CRÉER de la borne de l'équipement à la borne 1 de la barrette (sans numéro, de la jauge du plus gros) ;
     · chaque fil du contrat part d'une borne à lui, 2, 3… ;
     · les bornes de la barrette sont reliées (des shunts : un même potentiel).
   (v86, l'audit B2 : « un même contact, deux noms — 1, 2, 3 sur le plan, H, J, K sur la fiche ») VOLTA la crée, VOLTA nomme
   ses bornes : chacune prend le nom de son contact sur la face, comme vos fichiers nomment ceux d'une
   barrette — le module et la lettre, « 51H » (09, `lettresDeBarretteAPoser`). Les numéros ne restent que si aucun module
   ne la loge. Le câble à créer se reconnaît à sa marque, `aCreer` (`estRaccordAPoser`).
   Repère provisoire VT1, VT2…, unique dans le contrat : la numérotation suit l'ordre des folios (`depart` = le nombre de
   barrettes à poser des folios d'avant). Avec une MÉMOIRE (`provisoires` du contrat : clé repère␁borne → numéro), un
   nom TIENT : une borne dédoublée garde son numéro tant que le contrat vit, et poser VT1 au contrat ne fait pas
   reculer VT2 en VT1 — un numéro donné à une borne n'est jamais repris par une autre, une borne nouvelle prend son rang
   s'il est libre, sinon le premier numéro au-delà de tous ceux donnés. Sans mémoire (le dessin d'un FWD, le moteur),
   la numérotation est celle du seul rang. Chaque liaison changée garde `origine` (la liaison du contrat ; null pour ce
   que l'outil ajoute) : la base, elle, reste celle du contrat. Les bornes de barrette, de prise et de masse ne sont pas
   concernées (leur moteur sait recevoir plusieurs fils). */
const VT_A_POSER = /^VT\d+$/i;
/* (v86) LE CÂBLE À CRÉER d'une barrette à poser : de la borne dédoublée (un équipement) à sa barrette (VT1…). Ses bornes
   se nomment désormais comme sa face (« 51H », 09 `lettresDeBarretteAPoser`) : il se reconnaît à sa marque, `aCreer`, qu'il
   garde jusque dans le moteur en Worker (la page lui retire `origine`) ; une liaison d'avant, sans marque, à sa borne 1.
   Tous ceux qui cherchent le câble à créer d'une barrette (le dessin, la fiche, le contrôle, le récapitulatif) passent ici. */
const estRaccordAPoser = l => !!l && !!l.de && VT_A_POSER.test(String(l.vers || '')) && !VT_A_POSER.test(String(l.de))
  && (l.aCreer === true || (l.aCreer === undefined && String(l.borneVers) === '1'));
/* (v86, l'audit B3) UNE LIGNE EN DOUBLE — la même ligne écrite deux fois dans le fichier (une copie d'Excel) : les mêmes deux
   bouts (dans un sens ou dans l'autre), le même type, le même numéro, le même folio, le même harness. Ce n'est pas
   « plusieurs câbles sur une borne » : elle ne fait jamais poser de barrette et ne se dessine qu'une fois ; le contrôle la
   dit, « à régler », avec son geste (08-controle, « Retirer la ligne en double »). `rangsEnDouble(L)` : les rangs des
   copies (la première ligne reste). */
const cleDeDoublon = l => { const a = l.de + '\u0002' + l.borneDe, b = l.vers + '\u0002' + l.borneVers;
  return [a < b ? a + '\u0001' + b : b + '\u0001' + a, l.type || '', l.cable || '', l.plan || '', l.harness || ''].join('\u0001'); };
function rangsEnDouble(L) { const vus = new Set(), copies = new Set();
  L.forEach((l, i) => { if (!l || !liaisonComplete(l) || l.origine === null) return; const k = cleDeDoublon(l); if (vus.has(k)) copies.add(i); else vus.add(k); });
  return copies; }
// les bornes d'équipement dédoublées d'un folio : [clé repère\u0001borne, [{ i, cote }]] — une barrette à poser chacune
// (une ligne en double n'y compte qu'une fois)
function dedoublements(L) {
  const parBorne = new Map(), copies = rangsEnDouble(L);
  L.forEach((l, i) => { if (l.de === l.vers || copies.has(i)) return;
    [[l.de, l.borneDe, 'de'], [l.vers, l.borneVers, 'vers']].forEach(([r, b, cote]) => {
      if (!r || !b || estBornier(r) || estMasse(r) || VT_A_POSER.test(r)) return;
      const k = r + '\u0001' + b; (parBorne.get(k) || parBorne.set(k, []).get(k)).push({ i, cote }); }); });
  return [...parBorne].filter(([, xs]) => xs.length > 1); }
function avecBarrettesAPoser(L, depart = 0, memoire = null, norme = null) {
  // une ligne en double ne se dessine qu'une fois (le contrôle la dit)
  const copies = rangsEnDouble(L); if (copies.size) L = L.filter((_, i) => !copies.has(i));
  const groupes = dedoublements(L);
  if (!groupes.length) return L;
  const remplace = new Map(), ajouts = [];
  const jauge = t => { const m = /(\d{1,2})\s*$/.exec(String(t || '')); return m ? +m[1] : 99; };
  // le numéro d'une borne dédoublée : celui que la mémoire lui garde ; sinon son rang, s'il n'est à personne d'autre ;
  // sinon le premier au-delà de tous ceux déjà donnés — et la mémoire le retient
  const donnes = new Map(); if (memoire) memoire.forEach((n, k) => donnes.set(n, k));   // numéro → clé
  const numero = (k, g) => { if (memoire && memoire.has(k)) return memoire.get(k);
    let n = depart + g + 1; if (donnes.has(n) && donnes.get(n) !== k) n = Math.max(0, ...donnes.keys()) + 1;
    donnes.set(n, k); if (memoire) memoire.set(k, n); return n; };
  groupes.forEach(([k, xs], g) => { const [r, b] = k.split('\u0001'), nom = 'VT' + numero(k, g), l0 = L[xs[0].i];
    const types = xs.map(x => L[x.i].type).filter(Boolean), gros = types.slice().sort((u, v) => jauge(u) - jauge(v))[0] || '';
    const pn = xs[0].cote === 'de' ? l0.pnDe : l0.pnVers, commun = { route: l0.route, plan: l0.plan, origine: null, aPoser: nom };
    ajouts.push({ de: r, borneDe: b, pnDe: pn, vers: nom, borneVers: '1', pnVers: '', cable: '', type: gros, ...commun, aCreer: true });
    xs.forEach((x, j) => { const cur = remplace.get(x.i) || { ...L[x.i], origine: L[x.i], aPoser: nom };
      if (x.cote === 'de') { cur.de = nom; cur.borneDe = String(j + 2); cur.pnDe = ''; } else { cur.vers = nom; cur.borneVers = String(j + 2); cur.pnVers = ''; }
      remplace.set(x.i, cur); });
    for (let j = 1; j <= xs.length; j++) ajouts.push({ de: nom, borneDe: String(j), vers: nom, borneVers: String(j + 1), pnDe: '', pnVers: '', cable: '', type: '', ...commun }); });
  const out = [...L.map((l, i) => remplace.get(i) || l), ...ajouts];
  // (v86) chaque barrette nomme ses bornes comme sa face (« 51H », 09) ; sans module qui la loge, elle garde ses numéros
  if (typeof lettresDeBarretteAPoser === 'function') { const neufs = [...remplace.values(), ...ajouts];
    [...new Set(ajouts.map(l => l.aPoser))].forEach(nom => { const siens = neufs.filter(l => l.de === nom || l.vers === nom), noms = lettresDeBarretteAPoser(nom, siens, norme); if (!noms) return;
      siens.forEach(l => { if (l.de === nom) l.borneDe = noms.get(l.borneDe) || l.borneDe; if (l.vers === nom) l.borneVers = noms.get(l.borneVers) || l.borneVers; }); }); }
  return out; }

/* L'inverse, pour le MOTEUR (03) : une barrette à poser n'y est pas un bloc. Le dessin se place comme si ses fils
   partaient encore de la borne (c'est ce dessin-là que le lecteur trouvait « très, très bien »), et c'est le routage qui
   pose la barrette au ras de la borne, une borne par fil (05, `formerLesPiquages`). Chaque bout posé sur une barrette à
   poser revient sur la borne qu'elle dédouble ; le fil à créer et les shunts deviennent des boucles, que rien ne
   dessine. Les liaisons qui n'en touchent aucune sont rendues telles quelles — les mêmes objets, au même rang. */
function sansBarrettesAPoser(L) {
  const bornes = new Map();   // VTn -> [repère, borne, part number] de la borne dédoublée (le fil à créer les porte)
  L.forEach(l => { if (estRaccordAPoser(l)) bornes.set(l.vers, [l.de, l.borneDe, l.pnDe]); });
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
    provisoires: new Map(),            // « repère␁borne » dédoublée -> numéro de sa barrette à poser (VTn) : un nom provisoire qui tient (`avecBarrettesAPoser`)
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
function chargesExemple() { return new Map([['102CB1', { calibre: null, dem: { i: 9.31, t: 5 }, trans: { i: 9.31, t: 120 }, perm: { i: 5, t: null } }]]); }
function contratExemple() {
  const PN = {
    '101BT1': 'MS3470L14-5P', '102CB1': 'MS3320-10', '103RL1': 'E0836IS35-22SA', '104LP1': 'E0644D9S',
    '210SP1': '*704A46220028', '340AB1': 'EN2997Y1A08P', '340AB2': 'EN2997Y1A08P', '115CD': 'ABS0864-12', '118CD': 'ABS0864-12',
    '409GH2': 'NSA937802-05', '512VN': 'E0644G9S', '601RC': 'E0836IS35-22SA', '733LE': 'E0644D9S', '845VG': 'E0656A01N1S0',
    '408VC1A': 'EN3646A6083AAN',
    '300XC1': 'EN4165-2M', '351PM1': 'EN2997Y1A12P', '352PM2': 'EN2997Y1A12P', '361VL1': 'ABS0864-08', '362VL2': 'ABS0864-08', '363VL3': 'ABS0864-08',
    '371CP1': 'E0644B9S', '372CP2': 'E0644B9S', '381RL1': 'E0836IS35-22SA', '382RL2': 'E0836IS35-22SA', '383RL3': 'E0836IS35-22SA',
    '391LP1': 'E0644D9S', '392LP2': 'E0644D9S', '395SW1': 'NSA937802-03', '396SW2': 'NSA937802-03', '397TB1': 'NSA936501-08',
    '409VC2A': 'EN3646A6083AAN', '410VC2B': 'EN3646A6083AAN',
    '400XC2': 'EN4165-2M', '421ST1': 'EN2997Y1A10P', '422ST2': 'EN2997Y1A10P', '423ST3': 'EN2997Y1A10P', '431PR1': 'EN2997Y1A08P',
    '441VN1': 'ABS0864-08', '442VN2': 'ABS0864-08',
    '500XC3': 'EN4165-2M', '510RL1': 'E0836IS35-22SA', '511RL2': 'E0836IS35-22SA', '520LP1': 'E0644D9S', '530PM3': 'EN2997Y1A12P', '531PM4': 'EN2997Y1A12P',
    '540VL5': 'ABS0864-08', '550SW3': 'NSA937802-03', '560HT1': 'E0644B9S', '411VC3A': 'EN3646A61208FN', '412VC3B': 'EN3646A61208FN',
    '600XC4': 'EN4165-2M', '601XC5': 'EN4165-2M', '610LP3': 'E0644D9S', '611LP4': 'E0644D9S', '620SW4': 'NSA937802-03',
    '630RL5': 'E0836IS35-22SA', '631RL6': 'E0836IS35-22SA',
    /* (v85) LES BARRETTES, COMME DANS VOS FICHIERS : un repère par barrette, plusieurs modules sur un rail ; un bout s'écrit
       « 667VT2 51 » (la barrette, son module) et « A » (le contact du module) — VOLTA lit 667VT2:51A —, avec le part number
       du MODULE. Deux le sont à dessein d'une façon que VOLTA conteste, pour qu'on le voie faire : 667VT2 52 (le B201
       sépare A, B et C, que le fichier relie : le B202 les réunit) et 672VT5 51 (l'A101, des paires, quand le fichier relie
       quatre contacts : l'A102). */
    '667VT2 51': 'E0599-1B201Z', '667VT2 52': 'E0599-1B201Z',
    '668VT3 51': 'E0599-1B207Z', '668VT3 52': 'E0599-1B207Z', '668VT3 53': 'E0599-1B204Z',
    '670VT4 51': 'NSA937901M20-06', '670VT4 52': 'NSA937901M20-04',
    '672VT5 51': 'E0599-1A101Z', '672VT5 52': 'E0599-1B202Z' };
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
  //      (v85) le module 51 de la barrette 667VT2 (son module 52 est au folio 5) : A et D reliés (le pontage, et la zone
  //      A-D du B201), B et C chacun seul dans sa zone
  li('2', '210SP1', 'B12', '667VT2 51', 'A', 'W-101', 'DR24');
  li('2', '667VT2 51', 'A', '667VT2 51', 'D', 'W-102', 'DR24');
  li('2', '667VT2 51', 'D', '115CD',  '3',  'W-103', 'DR24');
  li('2', '667VT2 51', 'B', '118CD',  '3',  'W-104', 'DR24');
  li('2', '667VT2 51', 'C', '409GH2', '7',  'W-105', 'DR24');
  li('2', '340AB1', '4',  '512VN',  '1',    'W-110', 'DR22');
  li('2', '340AB1', '4',  '512VN',  '2',    'W-111', 'DR22');
  li('2', '340AB1', '1',  '210SP1', 'A3',   'W-120', 'DR24');
  li('2', '340AB2', '1',  '210SP1', 'A4',   'W-121', 'DR24');
  //      (v86) une prise de coupure se dit par les lettres de sa face (A, B, C…), comme sa fiche la dessine
  li('2', '115CD',  '8',  '408VC1A', 'A',   'W-130', 'MLB24');
  li('2', '408VC1A', 'A', '601RC',  '2',    'W-131', 'MLB24');
  li('2', '601RC',  '5',  '733LE',  '1',    'W-132', 'BN24');
  li('2', '733LE',  '4',  '409GH2', '2',    'W-133', 'BN24');
  li('2', '118CD',  '8',  '512VN',  '5',    'W-134', 'DR22');
  li('2', '409GH2', '9',  '845VG',  '3',    'W-135', 'MLB24');
  li('2', '845VG',  '1',  '601RC',  '7',    'W-136', 'MLB24');
  li('2', '210SP1', 'B20', '904G',  '',     'W-140', 'DR20');
  li('2', '340AB1', '20', '904G',   '',     'W-141', 'DR20');
  li('2', '115CD',  '20', '907G',   '',     'W-142', 'DR20');
  li('2', '118CD',  '20', '907G',   '',     'W-143', 'DR20');
  // ---- plan 3 : très chargé — un calculateur à trois connecteurs, une barrette de trois modules (deux de
  //      distribution, un de reprise de blindage), deux prises de coupure, trois
  //      relais, deux pompes, trois vannes, deux capteurs blindés, lampes, interrupteurs, masses
  //      (v85) la barrette 668VT3 et ses TROIS modules : 51 (les pompes N-P-R, la vanne S-T), 52 (les relais A-D-G-K, les
  //      vannes N-P-R), 53 (la reprise de blindage, A à D) — chaque câble sur son contact, les reliés dans une même zone
  li('3', '300XC1', 'B1',  '668VT3 51', 'N', 'W-301', 'DR20');
  li('3', '668VT3 51', 'N', '668VT3 51', 'P', 'W-302', 'DR20');
  li('3', '668VT3 51', 'P', '668VT3 51', 'R', 'W-303', 'DR20');
  li('3', '668VT3 51', 'P', '351PM1',  '1',  'W-304', 'DR20');
  li('3', '668VT3 51', 'R', '352PM2',  '1',  'W-305', 'DR20');
  li('3', '668VT3 51', 'T', '361VL1',  '1',  'W-306', 'DR22');
  li('3', '668VT3 51', 'S', '668VT3 51', 'T', 'W-318', 'DR22');
  li('3', '668VT3 52', 'N', '668VT3 52', 'P', 'W-307', 'DR22');
  li('3', '668VT3 52', 'P', '362VL2',  '1',  'W-308', 'DR22');
  li('3', '668VT3 52', 'R', '363VL3',  '1',  'W-309', 'DR22');
  li('3', '668VT3 52', 'P', '668VT3 52', 'R', 'W-319', 'DR22');
  li('3', '300XC1', 'B2',  '668VT3 51', 'S', 'W-310', 'DR22');
  li('3', '300XC1', 'B3',  '668VT3 52', 'N', 'W-311', 'DR22');
  li('3', '668VT3 52', 'D', '381RL1',  '1',  'W-312', 'DR22');
  li('3', '668VT3 52', 'G', '382RL2',  '1',  'W-313', 'DR22');
  li('3', '668VT3 52', 'K', '383RL3',  '1',  'W-314', 'DR22');
  li('3', '668VT3 52', 'A', '668VT3 52', 'D', 'W-315', 'DR22');
  li('3', '668VT3 52', 'D', '668VT3 52', 'G', 'W-316', 'DR22');
  li('3', '668VT3 52', 'G', '668VT3 52', 'K', 'W-329', 'DR22');
  li('3', '300XC1', 'B4',  '668VT3 52', 'A', 'W-317', 'DR22');
  li('3', '300XC1', 'A1',  '381RL1',  '3',  'W-320', 'DR24');
  li('3', '300XC1', 'A2',  '382RL2',  '3',  'W-321', 'DR24');
  li('3', '300XC1', 'A3',  '383RL3',  '3',  'W-322', 'DR24');
  li('3', '381RL1', '2',   '391LP1',  '1',  'W-323', 'DR22');
  li('3', '382RL2', '2',   '392LP2',  '1',  'W-324', 'DR22');
  li('3', '383RL3', '2',   '396SW2',  '1',  'W-325', 'DR22');
  li('3', '396SW2', '2',   '300XC1',  'A4', 'W-326', 'DR24');
  li('3', '395SW1', '1',   '300XC1',  'A5', 'W-327', 'DR24');
  li('3', '395SW1', '3',   '300XC1',  'A6', 'W-328', 'DR24');
  li('3', '300XC1', 'C1',  '409VC2A', 'A',  'W-330', 'MLB24');
  li('3', '300XC1', 'C2',  '409VC2A', 'B',  'W-331', 'MLB24');
  li('3', '300XC1', 'C3',  '409VC2A', 'C',  'W-332', 'MLB24');
  li('3', '409VC2A', 'A',  '371CP1',  '1',  'W-333', 'MLB24');
  li('3', '409VC2A', 'B',  '371CP1',  '2',  'W-334', 'MLB24');
  li('3', '409VC2A', 'C',  '371CP1',  '3',  'W-335', 'MLB24');
  li('3', '300XC1', 'C4',  '410VC2B', 'A',  'W-336', 'MLB24');
  li('3', '300XC1', 'C5',  '410VC2B', 'B',  'W-337', 'MLB24');
  li('3', '410VC2B', 'A',  '372CP2',  '1',  'W-338', 'MLB24');
  li('3', '410VC2B', 'B',  '372CP2',  '2',  'W-339', 'MLB24');
  li('3', '371CP1', '4',   '668VT3 53', 'A', 'W-340', 'MLB24');
  li('3', '372CP2', '3',   '668VT3 53', 'B', 'W-341', 'MLB24');
  li('3', '300XC1', 'C6',  '668VT3 53', 'C', 'W-342', 'MLB24');
  li('3', '668VT3 53', 'A', '668VT3 53', 'B', 'W-343', 'DR24');
  li('3', '668VT3 53', 'B', '668VT3 53', 'C', 'W-344', 'DR24');
  li('3', '668VT3 53', 'D', '905G',    '',   'W-345', 'DR22');
  li('3', '668VT3 53', 'C', '668VT3 53', 'D', 'W-346', 'DR24');
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
  // 300XC1 B : un 12 AWG parmi des 20 et 22 — aucun module EN 4165 ne les loge ensemble (le 99-10, relu en octobre 2026 : 8 contacts 20 et 2 contacts 16, pas de 12)
  li('3', '397TB1', '1',   '300XC1',  'B5', 'W-370', 'DR12');
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
  // ---- plan 4 : moyen — un calculateur qui distribue par une barrette NSA937901 de deux modules : le module 51 à deux
  //      paquets (A-B-F-G, D-E-J) et un contact seul (C, alimenté d'un autre folio), le module 52 où se reprennent les
  //      blindages des trois sondes ; un pressostat, deux vannes ; des masses partout
  li('4', '400XC2', 'B1',  '670VT4 51', 'A', 'W-401', 'DR20');
  li('4', '670VT4 51', 'A', '670VT4 51', 'B', 'W-402', 'DR20');
  li('4', '670VT4 51', 'B', '670VT4 51', 'F', 'W-403', 'DR20');
  li('4', '670VT4 51', 'F', '670VT4 51', 'G', 'W-404', 'DR20');
  li('4', '670VT4 51', 'B', '421ST1',  '1',  'W-405', 'DR22');
  li('4', '670VT4 51', 'F', '422ST2',  '1',  'W-406', 'DR22');
  li('4', '670VT4 51', 'G', '423ST3',  '1',  'W-407', 'DR22');
  li('4', '400XC2', 'B2',  '670VT4 51', 'D', 'W-408', 'DR20');
  li('4', '670VT4 51', 'D', '670VT4 51', 'E', 'W-409', 'DR20');
  li('4', '670VT4 51', 'E', '431PR1',  '1',  'W-410', 'DR22');
  li('4', '670VT4 51', 'J', '441VN1',  '1',  'W-411', 'DR22');
  li('4', '670VT4 51', 'E', '670VT4 51', 'J', 'W-413', 'DR20');
  li('4', '670VT4 51', 'C', '442VN2',  '1',  'W-412', 'DR22');
  li('4', '421ST1', '2',   '400XC2',  'A1', 'W-420', 'MLB24');
  li('4', '422ST2', '2',   '400XC2',  'A2', 'W-421', 'MLB24');
  li('4', '423ST3', '2',   '400XC2',  'A3', 'W-422', 'MLB24');
  li('4', '431PR1', '2',   '400XC2',  'A4', 'W-423', 'DR24');
  li('4', '441VN1', '2',   '400XC2',  'A5', 'W-424', 'DR24');
  li('4', '441VN1', '3',   '400XC2',  'A6', 'W-425', 'DR24');
  li('4', '442VN2', '2',   '400XC2',  'A7', 'W-426', 'DR24');
  li('4', '421ST1', '3',   '670VT4 52', 'A', 'W-430', 'MLB24');
  li('4', '422ST2', '3',   '670VT4 52', 'B', 'W-431', 'MLB24');
  li('4', '423ST3', '3',   '670VT4 52', 'F', 'W-432', 'MLB24');
  li('4', '670VT4 52', 'A', '670VT4 52', 'B', 'W-433', 'DR24');
  li('4', '670VT4 52', 'B', '670VT4 52', 'F', 'W-434', 'DR24');
  li('4', '670VT4 52', 'F', '670VT4 52', 'G', 'W-435', 'DR24');
  li('4', '670VT4 52', 'G', '400XC2',  'A10', 'W-436', 'DR24');
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
  li('5', '500XC3', 'A1',  '411VC3A', 'A',  'W-501', 'DR20');
  li('5', '411VC3A', 'A',  '412VC3B', 'A',  'W-502', 'DR20');
  li('5', '412VC3B', 'A',  '530PM3',  '1',  'W-503', 'DR20');
  li('5', '500XC3', 'A2',  '411VC3A', 'B',  'W-504', 'DR20');
  li('5', '411VC3A', 'B',  '412VC3B', 'B',  'W-505', 'DR20');
  li('5', '412VC3B', 'B',  '530PM3',  '2',  'W-506', 'DR20');
  li('5', '500XC3', 'A3',  '411VC3A', 'C',  'W-507', 'DR20');
  li('5', '411VC3A', 'C',  '412VC3B', 'C',  'W-508', 'DR20');
  li('5', '412VC3B', 'C',  '531PM4',  '1',  'W-509', 'DR20');
  li('5', '500XC3', 'A4',  '411VC3A', 'D',  'W-510', 'DR20');
  li('5', '411VC3A', 'D',  '412VC3B', 'D',  'W-511', 'DR20');
  li('5', '412VC3B', 'D',  '531PM4',  '2',  'W-512', 'DR20');
  li('5', '500XC3', 'B1',  '411VC3A', 'E',  'W-513', 'DR22');
  li('5', '411VC3A', 'E',  '540VL5',  '1',  'W-514', 'DR22');
  li('5', '500XC3', 'B2',  '411VC3A', 'F',  'W-515', 'DR22');
  li('5', '411VC3A', 'F',  '540VL5',  '2',  'W-516', 'DR22');
  li('5', '510RL1', '2',   '411VC3A', 'G',  'W-520', 'DR22');
  li('5', '411VC3A', 'G',  '412VC3B', 'E',  'W-521', 'DR22');
  li('5', '412VC3B', 'E',  '550SW3',  '1',  'W-522', 'DR22');
  li('5', '550SW3', '2',   '412VC3B', 'F',  'W-523', 'DR24');
  li('5', '412VC3B', 'F',  '411VC3A', 'H',  'W-524', 'DR24');
  li('5', '411VC3A', 'H',  '500XC3',  'B3', 'W-525', 'DR24');
  li('5', '540VL5', '4',   '412VC3B', 'G',  'W-526', 'DR22');
  li('5', '412VC3B', 'G',  '560HT1',  '1',  'W-527', 'DR22');
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
  // le module 52 de la barrette 667VT2 (son module 51 est au folio 2) : le 28 V de B7 réparti vers la vanne et le
  // réchauffeur — une barrette dont les modules sont posés sur deux folios ; A, B et C reliés, que le B201 du fichier sépare
  li('5', '500XC3', 'B7',  '667VT2 52', 'A', 'W-550', 'DR22');
  li('5', '667VT2 52', 'A', '667VT2 52', 'B', 'W-551', 'DR22');
  li('5', '667VT2 52', 'B', '540VL5',  '5',  'W-552', 'DR22');
  li('5', '667VT2 52', 'C', '560HT1',  '3',  'W-553', 'DR22');
  li('5', '667VT2 52', 'B', '667VT2 52', 'C', 'W-554', 'DR22');
  // ---- plan 6 : moyen — deux équipements de dix bornes qui se parlent à travers une barrette : huit fils qui la
  //      traversent, un paquet ponté en bus, trois piquages vers des lampes et un interrupteur (un contact par câble :
  //      un piquage prend le contact d'à côté, dans la même zone), deux fils directs, une borne qui alimente deux relais
  //      (un piquage sur l'équipement), des masses
  //      (v85) le module 51 de la barrette 672VT5 : chaque câble sur son contact — celui qui arrive et celui qui repart
  //      n'ont jamais le même (le lecteur : « des bornes en double, 5, 5, 8, 8 : normalement pas possible »), reliés par
  //      la zone qui les porte
  li('6', '600XC4', 'A1',  '672VT5 51', 'A', 'W-601', 'DR22');
  li('6', '672VT5 51', 'A', '672VT5 51', 'B', 'W-660', 'DR22');
  li('6', '672VT5 51', 'B', '601XC5',  'B1', 'W-611', 'DR22');
  li('6', '600XC4', 'A2',  '672VT5 51', 'C', 'W-602', 'DR22');
  li('6', '672VT5 51', 'C', '672VT5 51', 'D', 'W-661', 'DR22');
  li('6', '672VT5 51', 'D', '601XC5',  'B2', 'W-612', 'DR22');
  li('6', '672VT5 51', 'B', '672VT5 51', 'C', 'W-620', 'DR22');
  li('6', '600XC4', 'A3',  '672VT5 51', 'E', 'W-603', 'DR22');
  li('6', '672VT5 51', 'E', '672VT5 51', 'F', 'W-662', 'DR22');
  li('6', '672VT5 51', 'F', '601XC5',  'B3', 'W-613', 'DR22');
  li('6', '672VT5 51', 'F', '672VT5 51', 'G', 'W-621', 'DR22');
  li('6', '672VT5 51', 'G', '610LP3',  '1',  'W-622', 'DR24');
  li('6', '600XC4', 'A4',  '672VT5 51', 'J', 'W-604', 'DR22');
  li('6', '672VT5 51', 'J', '672VT5 51', 'K', 'W-663', 'DR22');
  li('6', '672VT5 51', 'K', '601XC5',  'B4', 'W-614', 'DR22');
  li('6', '600XC4', 'A5',  '672VT5 51', 'N', 'W-605', 'DR22');
  li('6', '672VT5 51', 'N', '672VT5 51', 'P', 'W-664', 'DR22');
  li('6', '672VT5 51', 'P', '601XC5',  'B5', 'W-615', 'DR22');
  li('6', '672VT5 51', 'P', '672VT5 51', 'R', 'W-623', 'DR22');
  li('6', '672VT5 51', 'R', '611LP4',  '1',  'W-624', 'DR24');
  li('6', '600XC4', 'A6',  '672VT5 51', 'T', 'W-606', 'DR22');
  li('6', '672VT5 51', 'T', '672VT5 51', 'U', 'W-665', 'DR22');
  li('6', '672VT5 51', 'U', '601XC5',  'B6', 'W-616', 'DR22');
  li('6', '600XC4', 'A7',  '672VT5 51', 'a', 'W-607', 'DR22');
  li('6', '672VT5 51', 'a', '672VT5 51', 'b', 'W-666', 'DR22');
  li('6', '672VT5 51', 'b', '601XC5',  'B7', 'W-617', 'DR22');
  li('6', '672VT5 51', 'b', '672VT5 51', 'c', 'W-625', 'DR22');
  li('6', '672VT5 51', 'c', '620SW4',  '1',  'W-626', 'DR24');
  li('6', '600XC4', 'A8',  '672VT5 51', 'e', 'W-608', 'DR22');
  li('6', '672VT5 51', 'e', '672VT5 51', 'f', 'W-667', 'DR22');
  li('6', '672VT5 51', 'f', '601XC5',  'B8', 'W-618', 'DR22');
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
  // le module 52 de la barrette 672VT5 : la commande A12 reprise par les deux relais (A, B, C dans la zone A-B-C du B202)
  li('6', '600XC4', 'A12', '672VT5 52', 'A', 'W-650', 'DR24');
  li('6', '672VT5 52', 'A', '672VT5 52', 'B', 'W-668', 'DR24');
  li('6', '672VT5 52', 'B', '630RL5',  '4',  'W-652', 'DR24');
  li('6', '672VT5 52', 'C', '631RL6',  '4',  'W-653', 'DR24');
  li('6', '672VT5 52', 'B', '672VT5 52', 'C', 'W-651', 'DR24');
  return L;
}
