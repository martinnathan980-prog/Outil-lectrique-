/* ===========================================================================
   09 quinquies — LES CONTRATS DÉJÀ FAITS : ranger, reconnaître, comparer,
   reprendre — et le DESSIN (le FWD) comme unité
   ---------------------------------------------------------------------------
   La grande base du lecteur : des milliers de lignes de retest, un HARNESS
   (le faisceau d'une machine) par installation, avec l'appareil et la date —
   et sur chaque ligne un FWD, le DESSIN d'où elle vient. « Le FWD, c'est un
   dessin : il faut la totale, pas une comparaison ligne par ligne. »
   On ne repart jamais de zéro, on ne colle jamais un contrat entier :
     · RANGER : la base s'indexe une fois, par harness et par dessin, avec ses
       équipements (repères décodés : zone, nature, ordre, variante), leurs
       part numbers, leurs voisins ;
     · RECONNAÎTRE : pour un équipement du contrat, le même dans les
       références — même part number d'abord, sinon même code —, et le dessin
       où il apparaît ;
     · COMPARER : à l'échelle de l'équipement (ses lignes), de son voisinage
       (ce qui lui est relié dans le dessin, à un pas, deux pas) ou du dessin
       entier — les repères de la référence correspondus aux nôtres d'un bloc
       (même repère, part number, voisins, code), chaque fil jugé une fois :
       identique, différent, manquant chez nous, en plus chez nous ;
     · REPRENDRE : ce qu'on coche, recâblé sur nos repères — avec sa route,
       sans sa longueur (une mesure d'un autre aéronef) ni son numéro. « La
       solution du PH n'est pas forcément la bonne » : ce qui est repris
       passe les mêmes contrôles que le reste.
   Ce que l'outil propose « à confirmer » se confirme ou se corrige : les
   choix de l'utilisateur entrent dans la correspondance par `fixes`.
   Rien ici ne touche à la page : le moteur, comme 09.
   =========================================================================== */
'use strict';

/* ---- LES REPÈRES ELEC ------------------------------------------------------ */
/* Un repère complet se lit en quatre morceaux : les chiffres de tête (la ZONE ou le système : 677, 102, 412), le CODE
   (la nature — VT barrette de jonction, CB disjoncteur, VC prise de coupure — 01, `CODES`), l'ORDRE (le numéro dans la
   zone : 677VT2 est la deuxième barrette de la zone 677, « une variante de solution ») et la VARIANTE (une lettre de
   fin : 412VC3B, la partie B de la prise 3). Un code inconnu reste un équipement : rien d'inventé. */
function decoderRepere(repere) { const r = String(repere == null ? '' : repere).trim(), q = lireRepere(r); if (!q || !q.code) return null;
  const s = /^(\d*)(.*)$/.exec(q.suffixe || ''), c = CODES[q.code] || null;
  return { repere: r, zone: q.num || '', code: q.code, nature: c ? c.nom : '', forme: c ? c.forme : 'equipement', ordre: s[1] ? parseInt(s[1], 10) : null, variante: s[2] || '', connu: !!c }; }
/* Le même, en mots : « barrette de jonction n° 2 · zone 677 », « prise de coupure n° 3, variante B · zone 412 » ; un
   code inconnu : « équipement XX n° 9 · zone 305 ». */
function direRepere(repere) { const d = decoderRepere(repere); if (!d) return String(repere == null ? '' : repere);
  return (d.nature || 'équipement ' + d.code) + (d.ordre != null ? ' n° ' + d.ordre : '') + (d.variante ? ', variante ' + d.variante : '') + (d.zone ? ' · zone ' + d.zone : ''); }
/* Une borne telle que la base l'écrit sur une barrette — « 677VT2 51 » + « B » devient 677VT2:51B (01, `boutLu`) : le
   MODULE 51, son contact B ; « 51-3 », le module 51, contact 3. Ailleurs, une borne est une borne. */
function lireBorne(repere, borne) { const b = String(borne == null ? '' : borne).trim(); if (!b) return { borne: b };
  if (estBarrette(repere)) { const m = /^(\d+)(?:-(\w+)|([A-Za-z]\w*))$/.exec(b); if (m) return { borne: b, module: m[1], contact: m[2] || m[3] }; }
  return { borne: b }; }
const direBorne = (repere, borne) => { const x = lireBorne(repere, borne); return x.module ? 'module ' + x.module + ', contact ' + x.contact : x.borne ? 'borne ' + x.borne : ''; };
// une masse ou un rail n'est pas un équipement : un potentiel
const horsEquipement = r => estMasse(r) || RAIL_RE.test(String(r == null ? '' : r).trim());
const natureDuRepere = r => { const d = decoderRepere(r); return d && d.nature ? d.nature : 'équipement'; };

/* ---- LES LIGNES D'UN ÉQUIPEMENT ------------------------------------------- */
/* Le type d'un fil ramené à sa famille et sa gauge (DR20, MLB24), et le code d'un repère : calculés une fois par valeur —
   une base de 300 000 lignes n'a que quelques dizaines de types et quelques milliers de repères ; la même chaîne sert
   à toutes les lignes (la mémoire d'une grande base, v72). */
const TYPES_LUS = new Map(), CODES_LUS = new Map();
const typeLu = t => { let x = TYPES_LUS.get(t); if (x === undefined) { const j = jaugeDuType(t); x = typeDuFil(t) + (j != null ? j : ''); if (TYPES_LUS.size < 50000) TYPES_LUS.set(t, x); } return x; };
// une nature dite à la main (01, `natureDite`) change le code d'un repère : celui-là se relit à chaque fois
const codeLu = r => { const dit = natureDite && natureDite(String(r || '').trim()); let x = dit ? undefined : CODES_LUS.get(r);
  if (x === undefined) { const q = lireRepere(r); x = q && q.code ? q.code : r; if (!dit && CODES_LUS.size < 200000) CODES_LUS.set(r, x); } return x; };
/* Une ligne d'un équipement, vue de lui : sa borne, le type de fil, l'autre bout (repère, code, borne, part number). Elle ne
   garde que la liaison et le sens ; le reste se lit d'elle à la demande — deux lignes vues par liaison, 600 000 pour une
   base de 300 000 lignes : quatre fois moins de mémoire que des copies. */
class LigneVue { constructor(l, amont) { this.l = l; this.amont = amont; }
  get borne() { return this.amont ? this.l.borneVers : this.l.borneDe; } get pn() { return this.amont ? this.l.pnVers : this.l.pnDe; }
  get type() { return typeLu(this.l.type); } get typeBrut() { return this.l.type; } get autre() { return this.amont ? this.l.de : this.l.vers; }
  get codeAutre() { return codeLu(this.autre); } get borneAutre() { return this.amont ? this.l.borneDe : this.l.borneVers; } get pnAutre() { return this.amont ? this.l.pnDe : this.l.pnVers; }
  get cable() { return this.l.cable; } }
const ligneVueDe = (l, amont) => new LigneVue(l, amont);
function lignesDeRepere(liaisons, repere) { return liaisons.filter(l => l.de !== l.vers && (l.de === repere || l.vers === repere)).map(l => ligneVueDe(l, l.vers === repere)); }
const cleLigne = x => [x.borne, x.type, x.codeAutre, x.borneAutre].join('|'), cleLibre = x => [x.type, x.codeAutre, x.borneAutre].join('|');
// la clé d'une liaison de la référence (ce qu'on coche) : ses deux bouts et son numéro
const cleRef = l => [l.de, l.borneDe, l.vers, l.borneVers, l.cable].join('|');

/* ---- L'INDEX : par harness, par dessin ------------------------------------- */
/* Le dessin d'une liaison : la colonne FWD du retest, sinon son folio. */
const fwdDe = l => l.fwd || l.plan || '';
const cleDessin = (harness, fwd) => harness + '\u0001' + fwd;
/* L'INDEX des références, en UNE passe : par HARNESS (ses liaisons, son appareil, sa date, ses équipements avec leurs
   part numbers et leurs lignes), par DESSIN (un FWD d'un harness : ses liaisons, ses équipements avec leurs voisins, ses
   masses, combien de fils et de pontages), et deux entrées pour reconnaître vite : par part number, par code. Indexé
   une fois, gardé en mémoire : des dizaines de milliers de lignes passent en une fraction de seconde.
   L'INDEXEUR fait la même chose PAR MORCEAUX (`ajouter` autant de fois qu'il faut, puis `finir`) : la page indexe une base
   de 300 000 lignes par tranches de quelques millisecondes, sans geler (08-references). */
function indexerReferences(liaisons) { const x = indexeurDeReferences(); x.ajouter(liaisons); return x.finir(); }
/* Un équipement de l'index : son repère décodé, ses part numbers, ses lignes ; ses VOISINS (dans un dessin) et ses DESSINS
   (dans une machine) se comptent de ses lignes à la première lecture — 400 000 équipements pour une base de 300 000 lignes,
   pas 400 000 tables tenues d'avance. */
class EquipementRef { constructor(r) { const q = lireRepere(r); this.repere = r; this.code = q && q.code ? q.code : ''; this.nature = q && CODES[q.code] ? CODES[q.code].nom : ''; this.pns = []; this.lignes = []; this.pontages = 0; this._v = null; this._f = null; }
  get voisins() { if (!this._v) { const m = new Map(); this.lignes.forEach(x => { const a = x.autre; m.set(a, (m.get(a) || 0) + 1); }); this._v = m; } return this._v; }
  get fwds() { if (!this._f) { const m = new Map(); this.lignes.forEach(x => { const f = fwdDe(x.l); m.set(f, (m.get(f) || 0) + 1); }); this._f = m; } return this._f; } }
/* Un dessin de l'index : ses liaisons, ses fils, ses pontages, ses masses ; ses ÉQUIPEMENTS (avec leurs voisins) se font à la
   première lecture — on n'ouvre qu'une poignée des 10 000 dessins d'une grande base. */
const HORS_LUS = new Map(), horsEquipementLu = r => { let x = HORS_LUS.get(r); if (x === undefined) { x = horsEquipement(r); if (HORS_LUS.size < 200000) HORS_LUS.set(r, x); } return x; };
class DessinRef { constructor(cle, harness, fwd, appareil, retest) { Object.assign(this, { cle, harness, fwd, appareil, retest, liaisons: [], masses: new Map(), fils: 0, pontages: 0, _e: null }); }
  get equipements() { if (this._e) return this._e; const M = new Map(), equip = r => { let e = M.get(r); if (!e) { e = new EquipementRef(r); M.set(r, e); } return e; };
    this.liaisons.forEach(l => { if (!l.de || !l.vers) return; [[l.de, false], [l.vers, true]].forEach(([r, amont]) => { if (horsEquipementLu(r)) return; const e = equip(r);
      if (l.de === l.vers) { if (!amont) e.pontages++; return; } const x = ligneVueDe(l, amont); e.lignes.push(x); if (x.pn && !e.pns.includes(x.pn)) e.pns.push(x.pn); }); });
    return (this._e = M); } }
function indexeurDeReferences() { const H = new Map(), D = new Map(), parPn = new Map(), parCode = new Map(); let total = 0;
  const equip = (M, r) => { let e = M.get(r); if (!e) { e = new EquipementRef(r); M.set(r, e); } return e; };
  const ajouter = liaisons => { total += liaisons.length; liaisons.forEach(l => { const h = l.harness || '—', f = fwdDe(l);
    let eh = H.get(h); if (!eh) { eh = { harness: h, appareil: l.appareil || '', retest: l.retest || '', liaisons: [], equipements: new Map(), dessins: [] }; H.set(h, eh); }
    if (!eh.appareil && l.appareil) eh.appareil = l.appareil; if (!eh.retest && l.retest) eh.retest = l.retest; eh.liaisons.push(l);
    const k = cleDessin(h, f); let d = D.get(k);
    if (!d) { d = new DessinRef(k, h, f, eh.appareil, eh.retest); D.set(k, d); eh.dessins.push(f); }
    if (!d.appareil && l.appareil) d.appareil = l.appareil; if (!d.retest && l.retest) d.retest = l.retest; d.liaisons.push(l); d._e = null;
    if (!l.de || !l.vers) return;
    if (l.de === l.vers) d.pontages++; else d.fils++;
    for (let b = 0; b < 2; b++) { const r = b ? l.vers : l.de, amont = b === 1;
      if (horsEquipementLu(r)) { if (estMasse(r)) d.masses.set(r, (d.masses.get(r) || 0) + 1); continue; }
      const eqH = equip(eh.equipements, r);
      if (l.de === l.vers) continue;   // un pontage n'est pas une ligne vue de l'équipement
      const x = ligneVueDe(l, amont); eqH.lignes.push(x); eqH._f = null;
      const pn = x.pn; if (pn && !eqH.pns.includes(pn)) eqH.pns.push(pn); } }); };
  const finir = () => { H.forEach(eh => eh.equipements.forEach(e => { const ent = { h: eh, e };
      e.pns.forEach(pn => (parPn.get(pn) || parPn.set(pn, []).get(pn)).push(ent)); if (e.code) (parCode.get(e.code) || parCode.set(e.code, []).get(e.code)).push(ent); }));
    return { harnais: H, dessins: D, parPn, parCode, liaisons: total }; };
  return { ajouter, finir }; }
// le dessin où un équipement de la base a le plus de lignes
const dessinPrincipal = e => { let f = '', n = -1; (e.fwds || new Map()).forEach((k, fwd) => { if (k > n) { n = k; f = fwd; } }); return f; };
const dessinDe = (index, harness, fwd) => index && index.dessins.get(cleDessin(harness, fwd)) || null;
/* Ce qu'un dessin contient, en chiffres : équipements (par nature), fils, pontages, masses, barrettes, prises. */
function resumeDessin(dessin) { const natures = new Map(); let barrettes = 0, coupures = 0;
  dessin.equipements.forEach(e => { const n = e.nature || 'équipement'; natures.set(n, (natures.get(n) || 0) + 1); if (estBarrette(e.repere)) barrettes++; if (estCoupure(e.repere)) coupures++; });
  return { equipements: dessin.equipements.size, fils: dessin.fils, pontages: dessin.pontages, masses: dessin.masses.size, barrettes, coupures, natures: [...natures].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)) }; }
/* LA RECHERCHE dans la base : un mot filtre les harness, les dessins (FWD), les appareils, les repères. */
function chercherReferences(index, q, max) { max = max || 60; const t = String(q || '').trim().toLowerCase(), a = s => String(s || '').toLowerCase().includes(t);
  if (!index) return { harnais: [], dessins: [], equipements: [], total: 0 };
  const harnais = [...index.harnais.values()].filter(h => !t || a(h.harness) || a(h.appareil) || a(h.retest));
  const dessins = [...index.dessins.values()].filter(d => !t || a(d.fwd) || a(d.harness) || a(d.appareil) || a(d.retest));
  // les repères : ceux des machines (le dessin où chacun a le plus de lignes), sans faire les équipements de chaque dessin
  const equipements = []; if (t) for (const h of index.harnais.values()) { for (const e of h.equipements.values()) { if (equipements.length >= max) break; if (a(e.repere) || a(e.nature) || e.pns.some(a)) equipements.push({ harness: h.harness, fwd: dessinPrincipal(e), appareil: h.appareil, e }); } if (equipements.length >= max) break; }
  return { harnais: harnais.slice(0, max), dessins: dessins.slice(0, max), equipements, total: harnais.length + dessins.length + equipements.length, plus: Math.max(0, harnais.length - max) + Math.max(0, dessins.length - max) }; }

/* ---- RECONNAÎTRE ------------------------------------------------------------ */
/* LA RESSEMBLANCE de deux équipements : la part des lignes communes (borne, type, ce qu'elle relie) ; `libre` ignore la
   borne (un équipement aux bornes déplacées se reconnaît encore). */
function ressemblance(A, B) { const a = new Set(A.map(cleLigne)), b = new Set(B.map(cleLigne)), al = new Set(A.map(cleLibre)), bl = new Set(B.map(cleLibre));
  const inter = [...a].filter(k => b.has(k)).length, union = new Set([...a, ...b]).size, il = [...al].filter(k => bl.has(k)).length, ul = new Set([...al, ...bl]).size;
  return { taux: union ? inter / union : 0, libre: ul ? il / ul : 0, communes: inter }; }
/* LES CANDIDATS pour un équipement du contrat : les équipements des références de même part number (d'abord), sinon
   de même code — par les entrées de l'index, sans parcourir la base — ; les mieux ressemblants en tête, `n` au plus.
   À ressemblance égale, la machine qui porte LE MÊME REPÈRE passe devant (une autre machine du même programme
   ressemble plus qu'une zone décalée), puis celle du MÊME APPAREIL que notre contrat (quand le retest le dit).
   Chacun dit le dessin (FWD) où il apparaît. */
function candidatsDeReference(index, liaisons, repere, n) { if (!index) return []; const A = lignesDeRepere(liaisons, repere); if (!A.length) return [];
  const pns = new Set(A.map(x => x.pn).filter(Boolean)), q = lireRepere(repere), code = q && q.code ? q.code : '', vus = new Set(), out = [];
  const appareil = A.map(x => x.l.appareil).find(Boolean) || (liaisons.find(l => l.appareil) || {}).appareil || '', memeAppareil = c => !!appareil && c.appareil === appareil;
  const voir = (ent, par) => { const k = cleDessin(ent.h.harness, ent.e.repere); if (vus.has(k)) return; vus.add(k);
    out.push({ harness: ent.h.harness, appareil: ent.h.appareil, retest: ent.h.retest, repere: ent.e.repere, pns: ent.e.pns, par, ...ressemblance(A, ent.e.lignes), lignes: ent.e.lignes.length, fwd: dessinPrincipal(ent.e), fwds: [...ent.e.fwds.keys()] }); };
  pns.forEach(pn => (index.parPn.get(pn) || []).forEach(ent => voir(ent, 'pn')));
  if (code) (index.parCode.get(code) || []).forEach(ent => voir(ent, 'code'));
  return out.sort((u, v) => (v.par === 'pn') - (u.par === 'pn') || v.taux - u.taux || (v.repere === repere) - (u.repere === repere) || memeAppareil(v) - memeAppareil(u) || v.libre - u.libre || v.communes - u.communes).slice(0, n || 3); }
/* LA FLOTTE : pour un équipement, toutes les machines où il apparaît (par part number), et ce qu'elles y font. */
function flotteDe(index, liaisons, repere) { if (!index) return []; const A = lignesDeRepere(liaisons, repere), pns = new Set(A.map(x => x.pn).filter(Boolean)); if (!pns.size) return [];
  const vus = new Set(), out = []; pns.forEach(pn => (index.parPn.get(pn) || []).forEach(ent => { const k = cleDessin(ent.h.harness, ent.e.repere); if (vus.has(k)) return; vus.add(k);
    out.push({ harness: ent.h.harness, appareil: ent.h.appareil, retest: ent.h.retest, repere: ent.e.repere, lignes: ent.e.lignes.length, fwd: dessinPrincipal(ent.e), ...ressemblance(A, ent.e.lignes) }); }));
  return out.sort((u, v) => v.taux - u.taux); }

/* ---- LA CORRESPONDANCE DES REPÈRES ------------------------------------------ */
// les voisins de chaque repère (combien de fils vers chacun), sans les potentiels : une masse relierait tout le monde
function voisinsDe(liaisons) { const V = new Map(); const add = (a, b) => { const m = V.get(a) || V.set(a, new Map()).get(a); m.set(b, (m.get(b) || 0) + 1); };
  liaisons.forEach(l => { if (!l.de || !l.vers || l.de === l.vers || horsEquipement(l.de) || horsEquipement(l.vers)) return; add(l.de, l.vers); add(l.vers, l.de); }); return V; }
/* LE VOISINAGE d'un équipement dans un dessin : lui, puis ce qui lui est relié à un pas, deux pas… (par distance). */
function voisinageDe(liaisons, repere, pas) { const V = voisinsDe(liaisons), vus = new Set([repere]), out = [repere]; let front = [repere];
  for (let k = 0; k < (pas == null ? 1 : pas) && front.length; k++) { const suivant = [];
    front.forEach(r => [...(V.get(r) || new Map()).keys()].sort().forEach(v => { if (!vus.has(v)) { vus.add(v); suivant.push(v); out.push(v); } })); front = suivant; }
  return out; }
/* Ce qui sépare deux repères de même code, pour départager (et pour ranger les candidats qu'on propose à l'utilisateur) :
   l'ordre d'abord (RL1 ↔ RL1), la variante, puis la zone. */
function ecartDeReperes(r, n) { const a = decoderRepere(r), b = decoderRepere(n); if (!a || !b) return 1e9;
  return (a.ordre !== b.ordre ? 1000 : 0) + (a.variante !== b.variante ? 500 : 0) + Math.abs((parseInt(a.zone, 10) || 0) - (parseInt(b.zone, 10) || 0)); }
/* LA CORRESPONDANCE des repères d'une référence vers les nôtres, sur un ENSEMBLE d'équipements (un équipement et ses
   voisins, un dessin entier). Fixés d'abord : la cible (le repère comparé → le nôtre), puis le même repère s'il existe
   chez nous. Puis, de proche en proche tant que quelque chose se fixe : le même PART NUMBER (un seul candidat libre : lui ;
   plusieurs : celui qui est relié aux mêmes voisins, déjà correspondus), puis le même CODE relié aux mêmes voisins
   (« voisins » : proposé, à confirmer). Enfin, sans voisin pour départager : le part number puis le code, au numéro le
   plus proche (« code » : à confirmer) ; sinon rien, l'équipement est NOUVEAU pour nous. Un équipement de chez nous ne
   reçoit qu'un repère de la référence ; les masses et les rails se correspondent par leur nom. `fixes` : ce qui est
   posé d'avance — la cible de la comparaison, et LES CHOIX DE L'UTILISATEUR (« choisi » : il a confirmé ou corrigé la
   proposition ; « nouveau » : il a dit que l'équipement n'existe pas chez nous) ; un choix qui vise un des nôtres déjà
   pris par la cible est ignoré. */
function correspondre(liaisons, refLiaisons, reperesRef, fixes) {
  const nomsNotres = new Set(); liaisons.forEach(l => { if (l.de) nomsNotres.add(l.de); if (l.vers) nomsNotres.add(l.vers); });
  const notres = [...nomsNotres].filter(r => !horsEquipement(r)), pnsDe = new Map(), pnsRef = new Map(), vn = voisinsDe(liaisons), vr = voisinsDe(refLiaisons);
  const notePn = (M, r, pn) => { if (r && pn) (M.get(r) || M.set(r, new Set()).get(r)).add(pn); };
  liaisons.forEach(l => { notePn(pnsDe, l.de, l.pnDe); notePn(pnsDe, l.vers, l.pnVers); }); refLiaisons.forEach(l => { notePn(pnsRef, l.de, l.pnDe); notePn(pnsRef, l.vers, l.pnVers); });
  const code = r => { const q = lireRepere(r); return q && q.code ? q.code : ''; };
  const m = new Map(), pris = new Set(), poser = (r, vers, sur) => { m.set(r, { vers, sur }); if (!horsEquipement(vers)) pris.add(vers); };
  (fixes || new Map()).forEach((v, r) => { if (!v || !v.vers) return; if (v.sur !== 'cible' && !horsEquipement(v.vers) && pris.has(v.vers)) return; poser(r, v.vers, v.sur); });
  const refs = [...new Set(reperesRef.filter(r => r && !m.has(r)))], equipements = refs.filter(r => !horsEquipement(r));
  const ecart = ecartDeReperes;
  // les potentiels : le même nom chez nous ; une masse inconnue se propose sur la masse la plus proche ; sinon nouveau
  const masses = [...nomsNotres].filter(estMasse);
  refs.filter(horsEquipement).forEach(r => { if (nomsNotres.has(r)) poser(r, r, 'repère'); else if (estMasse(r) && masses.length) poser(r, masses.slice().sort((u, v) => ecart(r, u) - ecart(r, v) || (u < v ? -1 : 1))[0], 'code'); else poser(r, r, 'nouveau'); });
  equipements.forEach(r => { if (nomsNotres.has(r) && !pris.has(r)) poser(r, r, 'repère'); });
  // combien des voisins de r (dans la référence) correspondent à des voisins de n (chez nous)
  const score = (r, n) => { let s = 0; const vnn = vn.get(n); if (!vnn) return 0; (vr.get(r) || new Map()).forEach((k, v) => { const c = m.get(v); if (c && vnn.has(c.vers)) s++; }); return s; };
  const libres = cands => cands.filter(n => !pris.has(n));
  const parPn = r => { const pr = pnsRef.get(r); return pr ? notres.filter(n => { const p = pnsDe.get(n); return p && [...pr].some(x => p.has(x)); }) : []; };
  const parCode = r => { const c = code(r); return c ? notres.filter(n => code(n) === c) : []; };
  // les paires (référence, nôtre) notées, les meilleures d'abord ; une référence, un des nôtres, une fois
  const fixer = (cands, sur, mini) => { const paires = [];
    equipements.forEach(r => { if (m.has(r)) return; libres(cands(r)).forEach(n => { const s = score(r, n); if (s >= mini) paires.push({ r, n, s: s + (code(n) === code(r) ? 0.5 : 0), d: ecart(r, n) }); }); });
    paires.sort((u, v) => v.s - u.s || u.d - v.d || (u.r < v.r ? -1 : u.r > v.r ? 1 : 0) || (u.n < v.n ? -1 : 1));
    let k = 0; paires.forEach(p => { if (m.has(p.r) || pris.has(p.n)) return; poser(p.r, p.n, sur); k++; }); return k; };
  for (let tour = 0; tour < 400; tour++) {
    let k = fixer(r => { const c = libres(parPn(r)); return c.length === 1 ? c : []; }, 'pn', 0);
    if (!k) k = fixer(parPn, 'pn', 1);
    if (!k) k = fixer(parCode, 'voisins', 1);
    if (!k) break; }
  fixer(parPn, 'pn', 0); fixer(parCode, 'code', 0);
  equipements.forEach(r => { if (!m.has(r)) poser(r, r, 'nouveau'); });
  return m; }
/* Ce qui est posé d'avance : la cible (le repère comparé → le nôtre), puis les choix de l'utilisateur (`fixes`), sauf
   pour la cible elle-même. */
const fixesDe = (repereRef, repere, fixes) => { const f = new Map(); if (repereRef && repere) f.set(repereRef, { vers: repere, sur: 'cible' });
  (fixes || new Map()).forEach((v, r) => { if (!f.has(r) && v && v.vers) f.set(r, v); }); return f; };
/* À l'échelle d'un équipement : la référence (ses lignes) et ses voisins vers les nôtres — la cible fixée, les choix de
   l'utilisateur aussi. `refLiaisons` : toute la machine de référence quand on l'a (les voisins des voisins
   départagent) ; sinon les lignes elles-mêmes. */
function correspondanceDesReperes(liaisons, refLignes, repereRef, repere, refLiaisons, fixes) {
  return correspondre(liaisons, refLiaisons || refLignes.map(x => x.l), [repereRef, ...refLignes.map(x => x.autre)], fixesDe(repereRef, repere, fixes)); }

/* ---- COMPARER ----------------------------------------------------------------- */
const compteDe = lignes => ({ identique: lignes.filter(x => x.etat === 'identique').length, differe: lignes.filter(x => x.etat === 'differe').length, manque: lignes.filter(x => x.etat === 'manque').length, enplus: lignes.filter(x => x.etat === 'enplus').length });
/* LE DIFFÉRENTIEL d'un équipement : chaque ligne de la référence contre les nôtres — identique (même borne, même type,
   même chose reliée au même endroit), différente (la même borne, mais autre chose), manquante chez nous ; et ce que
   nous avons en plus. La correspondance des repères sert à lire « ce qu'elle relie » avec nos repères. */
function differentiel(liaisons, repere, refLiaisons, repereRef, fixes) { const A = lignesDeRepere(liaisons, repere), B = lignesDeRepere(refLiaisons, repereRef), corr = correspondanceDesReperes(liaisons, B, repereRef, repere, refLiaisons, fixes);
  const pris = new Set(), lignes = [];
  B.forEach(b => { const vers = corr.get(b.autre), ident = A.find(a => !pris.has(a) && cleLigne(a) === cleLigne(b));
    if (ident) { pris.add(ident); lignes.push({ etat: 'identique', ref: b, notre: ident, vers }); return; }
    const meme = A.find(a => !pris.has(a) && a.borne === b.borne);
    if (meme) { pris.add(meme); lignes.push({ etat: 'differe', ref: b, notre: meme, vers }); return; }
    lignes.push({ etat: 'manque', ref: b, notre: null, vers }); });
  A.forEach(a => { if (!pris.has(a)) lignes.push({ etat: 'enplus', ref: null, notre: a }); });
  const r = ressemblance(A, B);
  return { lignes, correspondance: corr, taux: r.taux, libre: r.libre, compte: compteDe(lignes) }; }
/* LA COMPARAISON D'UN ENSEMBLE — un dessin entier, ou le voisinage d'un équipement — contre notre contrat. Les repères
   de l'ensemble (et ceux qu'il touche) se correspondent d'un bloc (`correspondre`), puis chaque liaison de la référence
   qui touche l'ensemble est jugée UNE fois : IDENTIQUE si nous avons le même fil entre les mêmes bornes de repères
   correspondants, DIFFÉRENTE si la borne est prise chez nous par autre chose, MANQUANTE sinon ; et ce que nous avons
   EN PLUS sur ces équipements. Chaque ligne est rangée sous un équipement de l'ensemble (`chez`) ; par équipement, le
   bilan : chez nous ou non (et par quoi), ses voisins, combien de lignes pareilles, différentes, manquantes. */
function comparerEnsemble(liaisons, refLiaisons, reperesRef, fixes) {
  const ens = new Set(reperesRef.filter(r => r && !horsEquipement(r))), ordre = [...ens];
  const touche = refLiaisons.filter(l => l.de && l.vers && (ens.has(l.de) || ens.has(l.vers))), bords = new Set();
  touche.forEach(l => { bords.add(l.de); bords.add(l.vers); });
  const corr = correspondre(liaisons, refLiaisons, [...ordre, ...[...bords].filter(r => !ens.has(r))], fixes), image = r => { const c = corr.get(r); return c ? c.vers : r; };
  const cle = (r, b) => r + '\u0001' + b, parBout = new Map();
  liaisons.forEach(l => { if (!l.de || !l.vers) return; [[l.de, l.borneDe], [l.vers, l.borneVers]].forEach(([r, b]) => (parBout.get(cle(r, b)) || parBout.set(cle(r, b), []).get(cle(r, b))).push(l)); });
  const typeN = t => { const j = jaugeDuType(t); return typeDuFil(t) + (j != null ? j : ''); }, pris = new Set(), lignes = [];
  touche.forEach(L => { const a = image(L.de), b = image(L.vers), chez = ens.has(L.de) ? L.de : L.vers, k = cleRef(L);
    const surA = (parBout.get(cle(a, L.borneDe)) || []).filter(l => !pris.has(l)), surB = (parBout.get(cle(b, L.borneVers)) || []).filter(l => !pris.has(l));
    const meme = surA.find(l => (l.de === a && l.borneDe === L.borneDe && l.vers === b && l.borneVers === L.borneVers) || (l.vers === a && l.borneVers === L.borneDe && l.de === b && l.borneDe === L.borneVers));
    if (meme && typeN(meme.type) === typeN(L.type)) { pris.add(meme); lignes.push({ etat: 'identique', ref: L, notre: meme, chez, k }); return; }
    // « diffère » : la borne est prise par autre chose — sur une borne d'ÉQUIPEMENT de l'ensemble, jamais sur une masse (elle est à tout le monde)
    const cotes = [[L.de, a, surA], [L.vers, b, surB]].filter(([r, i]) => ens.has(r) && !horsEquipement(i)), autre = meme || cotes.map(c => c[2][0]).find(Boolean);
    if (autre) { pris.add(autre); lignes.push({ etat: 'differe', ref: L, notre: autre, chez, k }); return; }
    lignes.push({ etat: 'manque', ref: L, notre: null, chez, k }); });
  // ce que nous avons en plus sur les images des équipements de l'ensemble, rangé sous l'équipement de la référence
  const inverse = new Map(); ordre.forEach(r => { const i = image(r); if (!horsEquipement(i) && !inverse.has(i)) inverse.set(i, r); });
  liaisons.forEach(l => { if (pris.has(l) || !l.de || !l.vers) return; const chez = inverse.get(l.de) || inverse.get(l.vers); if (chez) lignes.push({ etat: 'enplus', ref: null, notre: l, chez, k: '' }); });
  // le bilan d'un équipement prend toutes ses lignes (ses deux bouts) ; le compte de l'ensemble, chaque ligne une fois
  const parEquip = new Map(), ranger = (r, x) => { if (r && ens.has(r)) { const xs = parEquip.get(r) || parEquip.set(r, []).get(r); if (!xs.includes(x)) xs.push(x); } };
  lignes.forEach(x => { if (x.ref) { ranger(x.ref.de, x); ranger(x.ref.vers, x); } else { ranger(inverse.get(x.notre.de), x); ranger(inverse.get(x.notre.vers), x); } });
  const pnsRef = new Map(); touche.forEach(l => { [[l.de, l.pnDe], [l.vers, l.pnVers]].forEach(([r, pn]) => { if (pn) { const s = pnsRef.get(r) || pnsRef.set(r, []).get(r); if (!s.includes(pn)) s.push(pn); } }); });
  const vr = voisinsDe(touche);
  const equipements = ordre.map(r => { const c = corr.get(r) || { vers: r, sur: 'nouveau' }, xs = parEquip.get(r) || [], d = decoderRepere(r);
    return { repere: r, vers: c.vers, sur: c.sur, chezNous: c.sur !== 'nouveau', decode: d, nature: d && d.nature || '', pns: pnsRef.get(r) || [],
             voisins: [...(vr.get(r) || new Map())].sort((u, v) => v[1] - u[1] || (u[0] < v[0] ? -1 : 1)), compte: compteDe(xs), lignes: xs }; });
  const compte = compteDe(lignes), juge = compte.identique + compte.differe + compte.manque;
  return { lignes, equipements, correspondance: corr, compte, taux: juge ? compte.identique / juge : 0, nEquipements: ordre.length,
           chezNous: equipements.filter(e => e.chezNous).length, manquent: equipements.filter(e => !e.chezNous), proposes: equipements.filter(e => e.sur === 'code' || e.sur === 'voisins') }; }
// le dessin entier ; le voisinage d'un équipement (à `pas` pas) — la cible fixée quand on compare depuis un équipement,
// et les choix de l'utilisateur (`fixes`)
function comparerDessin(liaisons, dessin, repereRef, repere, fixes) { return comparerEnsemble(liaisons, dessin.liaisons, [...dessin.equipements.keys()], fixesDe(repereRef, repere, fixes)); }
function comparerVoisinage(liaisons, dessin, repereRef, repere, pas, fixes) { return comparerEnsemble(liaisons, dessin.liaisons, voisinageDe(dessin.liaisons, repereRef, pas == null ? 1 : pas), fixesDe(repereRef, repere, fixes)); }

/* ---- REPRENDRE ---------------------------------------------------------------- */
/* Ce qu'une ligne reprise GARDE de l'autre machine, et ce qu'elle laisse. Elle garde le type de fil, la route (le
   cheminement est un choix d'installation : c'est lui qu'on reprend, et s'il n'existe pas chez nous il paraît dans la
   légende, où on le voit et le corrige) et les descriptions. Elle NE GARDE PAS la longueur : c'est une mesure sur un
   autre aéronef, et la chute se calculerait dessus sans le dire — sans longueur, l'hypothèse de la simulation sert, et la
   fiche du fil le dit (« hypothèse »). Ni le numéro de fil (à donner dans la plage maison). */
const reprise = l => ({ cable: '', type: l.type, route: l.route || '', descriptionDe: l.descriptionDe, descriptionVers: l.descriptionVers });
/* REPRENDRE : les liaisons à ajouter chez nous pour les lignes cochées (manquantes, ou différentes qu'on remplace),
   recâblées sur nos repères par la correspondance ; le numéro de fil reste à donner. `plan` : le folio où les poser. */
function liaisonsAReprendre(diff, repere, lignes, plan) { const pnDe = new Map(); (diff.lignes || []).forEach(x => { if (x.notre && x.notre.pn) pnDe.set(repere, x.notre.pn); });
  return lignes.map(x => { const b = x.ref, c = diff.correspondance.get(b.autre), autre = c ? c.vers : b.autre, pn = pnDe.get(repere) || b.pn || '';
    const o = b.amont ? { de: autre, borneDe: b.borneAutre, pnDe: b.pnAutre, vers: repere, borneVers: b.borne, pnVers: pn } : { de: repere, borneDe: b.borne, pnDe: pn, vers: autre, borneVers: b.borneAutre, pnVers: b.pnAutre };
    return liaison({ ...o, ...reprise(b.l), type: b.typeBrut, plan: plan || '' }); }); }
/* REPRENDRE à l'échelle d'un ensemble (un équipement entier, un voisinage, un dessin) : chaque ligne cochée devient une
   liaison chez nous, ses deux bouts recâblés par la correspondance ; le part number d'un bout est le nôtre quand nous
   avons l'équipement (celui de ses fils sur le même connecteur), sinon celui de la référence ; le numéro reste à donner. */
function liaisonsDEnsembleAReprendre(cmp, lignes, liaisons, plan) { const pns = new Map();
  liaisons.forEach(l => { [[l.de, l.borneDe, l.pnDe], [l.vers, l.borneVers, l.pnVers]].forEach(([r, b, pn]) => { if (r && pn) (pns.get(r) || pns.set(r, []).get(r)).push([b, pn]); }); });
  const lettre = b => (/^[A-Za-z]+/.exec(String(b || '')) || [''])[0];
  const pnPour = (r, b, sinon) => { const xs = pns.get(r); if (!xs) return sinon || ''; const meme = xs.find(([bb]) => lettre(bb) === lettre(b)); return (meme || xs[0])[1]; };
  const image = r => { const c = cmp.correspondance.get(r); return c ? c.vers : r; };
  return lignes.map(x => { const L = x.ref, de = image(L.de), vers = image(L.vers);
    return liaison({ de, borneDe: L.borneDe, pnDe: pnPour(de, L.borneDe, L.pnDe), vers, borneVers: L.borneVers, pnVers: pnPour(vers, L.borneVers, L.pnVers), ...reprise(L), plan: plan || '' }); }); }

/* ===========================================================================
   LA GRANDE BASE — « l'énorme retest qui gère tous les contrats » (v72)
   ---------------------------------------------------------------------------
   Le lecteur : 100 000 lignes ou plus, et il veut ouvrir un contrat d'un clic,
   chercher dans tout, convertir en lot, comparer au déjà-fait. Le classeur se
   lit ICI, dans un Worker que la page refait du moteur (08-references) :
     · LIRE PAR MORCEAUX : un .xlsx est un zip ; on en lit le répertoire, puis
       chaque feuille se décompresse au fil de l'eau (DecompressionStream, le
       navigateur le fait lui-même) et se découpe ligne à ligne — jamais le
       classeur entier en mémoire, comme SheetJS le ferait (25 s et 2 Go pour
       300 000 lignes, mesuré) ; un CSV se lit ligne à ligne aussi (UTF-8, sinon
       Windows-1252, l'Excel français). Chaque ligne passe par la même lecture
       que le retest (02 `colonnesRetest`, 01 `liaison`) : les mêmes colonnes,
       les mêmes alias, « 677VT2 51 » + « B » → 677VT2:51B ;
     · RANGER PAR CONTRAT : un contrat est un harness (une machine) — son
       installation, son ECP, son appareil, sa date, ses dessins (FWD) ; ses
       lignes se suivent, si bien qu'un contrat est un intervalle de lignes et
       s'ouvre sans parcourir la base ;
     · GARDER COMPACT : les lignes d'un morceau (16 384) tiennent dans UNE
       chaîne — les champs séparés par ␁, les lignes par un saut — qui se garde
       telle quelle sur le PC (IndexedDB) et se relit en un instant ; à côté,
       la même chaîne en minuscules, sans accents, pour CHERCHER : un indexOf
       sur 50 Mo de texte trouve un part number dans 300 000 lignes en quelques
       dizaines de millisecondes, et « 300XC1:B5 » une borne exactement.
   Rien ici ne touche à la page : le moteur.
   =========================================================================== */
// les champs d'une ligne de la base, dans l'ordre où elle se garde ; la longueur en dernier (la recherche ne la lit pas)
const CHAMPS_BASE = ['harness', 'install', 'ecp', 'de', 'borneDe', 'pnDe', 'descriptionDe', 'type', 'cable', 'route', 'vers', 'borneVers', 'pnVers', 'descriptionVers', 'fwd', 'appareil', 'retest', 'longueur'];
const CHAMPS_CHERCHES = CHAMPS_BASE.length - 1, LIGNES_PAR_MORCEAU = 16384;
// ce qu'une case ne doit pas porter : nos séparateurs (vérifié sur la ligne entière ; une case fautive se nettoie seule)
const caseBase = v => { const s = v == null ? '' : String(v); return /[\u0000-\u001f]/.test(s) ? s.replace(/[\u0000-\u001f]+/g, ' ').trim() : s; };
const ligneEnBase = l => { let s = l.harness || ''; for (let i = 1; i < CHAMPS_BASE.length; i++) { const v = l[CHAMPS_BASE[i]]; s += '\u0001' + (v == null ? '' : v); }
  let k = 0, p = -1; while ((p = s.indexOf('\u0001', p + 1)) >= 0) k++;
  return k !== CHAMPS_BASE.length - 1 || /[\u0000\u0002-\u001f]/.test(s) ? CHAMPS_BASE.map(c => caseBase(l[c])).join('\u0001') : s; };
const triBase = (a, b) => COLLATEUR_FR.compare(String(a), String(b));
/* Une ligne gardée redevient une liaison (la forme de 01 `liaison`, l'installation et l'ECP en plus) ; `garder` partage
   les chaînes qui se répètent (harness, part numbers, dates…) : 300 000 lignes en mémoire, pas 5 millions de chaînes. */
function liaisonDeLaBase(r, garder) { const f = r.split('\u0001'), v = garder ? i => garder(f[i]) : i => f[i];
  const l = { de: v(3), borneDe: v(4), pnDe: v(5), vers: v(10), borneVers: v(11), pnVers: v(12), cable: f[8], type: v(7), route: v(9), plan: v(14) };
  if (f[17]) l.longueur = +f[17]; if (f[0]) l.harness = v(0); if (f[15]) l.appareil = v(15); if (f[16]) l.retest = v(16); if (f[14]) l.fwd = v(14);
  if (f[6]) l.descriptionDe = v(6); if (f[13]) l.descriptionVers = v(13); if (f[1]) l.install = v(1); if (f[2]) l.ecp = v(2); return l; }
function partageur() { const M = new Map(); return s => { if (!s || s.length > 40) return s; const x = M.get(s); if (x !== undefined) return x; M.set(s, s); return s; }; }
// la forme qu'on cherche : minuscules, sans accents, l'apostrophe droite ; un caractère hors Latin-1 devient une espace
const normaliserRecherche = s => { let t = String(s == null ? '' : s); if (/[^\x00-\x7f]/.test(t)) t = t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘`´]/g, '\'').replace(/[^\x00-\xff]/g, ' '); return t.toLowerCase(); };

/* ---- RANGER : des liaisons → la base (ses contrats, ses morceaux) ----------------------------------------------- */
/* Le rangeur reçoit les liaisons une à une (`ajouter`) et rend la base (`fin`) : les contrats rangés par installation puis
   par harness, chacun son intervalle [debut, fin) de lignes, ses dessins, ses équipements comptés ; les installations et
   leur ECP ; les morceaux (lignes et recherche). */
function rangeurDeBase() { const C = new Map(); let n = 0;
  const ajouter = l => { const h = l.harness || '—'; let c = C.get(h);
    if (!c) C.set(h, c = { h, install: '', ecp: '', appareil: '', retest: '', fwds: new Map(), reperes: new Set(), lignes: [] });
    if (!c.install && l.install) c.install = l.install; if (!c.ecp && l.ecp) c.ecp = l.ecp; if (!c.appareil && l.appareil) c.appareil = l.appareil; if (!c.retest && l.retest) c.retest = l.retest;
    const f = fwdDe(l); if (f) c.fwds.set(f, (c.fwds.get(f) || 0) + 1); if (l.de) c.reperes.add(l.de); if (l.vers) c.reperes.add(l.vers); c.lignes.push(ligneEnBase(l)); n++; };
  const fin = (nom, surProgres) => { const tri = triBase;
    const cs = [...C.values()].sort((a, b) => (!a.install - !b.install) || tri(a.install, b.install) || tri(a.h, b.h));
    const contrats = [], morceaux = []; let rangs = [], debut = 0;
    // la chaîne qu'on cherche : chaque ligne bordée de ␁ (une case entière se cherche entre deux), sans la longueur (le dernier champ)
    const fermer = () => { if (!rangs.length) return; const lignes = rangs.join('\n');
      morceaux.push({ debut: debut - rangs.length, n: rangs.length, lignes, bas: normaliserRecherche(rangs.map(r => '\u0001' + r.slice(0, r.lastIndexOf('\u0001') + 1)).join('\n')) });
      rangs = []; if (surProgres) surProgres({ etape: 'range', fait: debut, total: n }); };
    cs.forEach(c => { const fs = [...c.fwds.keys()].sort(tri); contrats.push({ h: c.h, install: c.install, ecp: c.ecp, appareil: c.appareil, retest: c.retest, fwds: fs, fwdsN: fs.map(f => c.fwds.get(f)), equipements: [...c.reperes].filter(r => !horsEquipement(r)).length, n: c.lignes.length, debut, fin: debut + c.lignes.length });
      c.lignes.forEach(r => { rangs.push(r); debut++; if (rangs.length >= LIGNES_PAR_MORCEAU) fermer(); }); c.lignes = null; });
    fermer();
    // les débuts de lignes de chaque morceau, faits d'avance : la première recherche ne les paie pas
    morceaux.forEach(m => { debutsDe(m, 'bas'); debutsDe(m, 'lignes'); });
    // les installations : leur nom, leur ECP (la colonne, sinon cinq chiffres en tête du nom), combien de contrats et de lignes
    const I = new Map(); contrats.forEach(c => { if (!c.install) return; let i = I.get(c.install); if (!i) I.set(c.install, i = { nom: c.install, ecp: '', contrats: 0, n: 0 }); if (!i.ecp && c.ecp) i.ecp = c.ecp; i.contrats++; i.n += c.n; });
    return { meta: { v: 2, nom: nom || '', t: Date.now(), n, contrats, installs: [...I.values()], harnais: contrats.filter(c => c.h !== '—').length, dessins: contrats.reduce((s, c) => s + c.fwds.length, 0) }, morceaux }; };
  return { ajouter, fin, get n() { return n; } }; }
// une base faite d'un tableau de liaisons (un petit fichier lu dans la page, une base d'avant v72 relue)
function baseDesLiaisons(liaisons, nom) { const R = rangeurDeBase(); (liaisons || []).forEach(l => { if (l && l.de && l.vers) R.ajouter(l); }); return R.fin(nom); }

/* ---- RETROUVER : une ligne, un contrat, les débuts de lignes d'un morceau -------------------------------------------- */
// les débuts de lignes d'une chaîne de morceau (calculés une fois, gardés sur le morceau)
function debutsDe(m, cle) { const k = cle === 'bas' ? '_db' : '_dl'; if (m[k]) return m[k]; const s = m[cle], D = new Int32Array(m.n + 1); let p = 0, i = 0;
  D[i++] = 0; while (i <= m.n) { const q = s.indexOf('\n', p); if (q < 0) break; D[i++] = q + 1; p = q + 1; } D[m.n] = s.length + 1; return (m[k] = D); }
// le rang (dans le morceau) de la ligne qui contient la position p
function rangDansLeMorceau(D, p, n) { let a = 0, b = n - 1; while (a < b) { const c = (a + b + 1) >> 1; if (D[c] <= p) a = c; else b = c - 1; } return a; }
function morceauDe(B, g) { const M = B.morceaux; let a = 0, b = M.length - 1; while (a < b) { const c = (a + b + 1) >> 1; if (M[c].debut <= g) a = c; else b = c - 1; } return M[a]; }
// la ligne g de la base, telle qu'elle est gardée
function ligneBruteDeLaBase(B, g) { const m = morceauDe(B, g); if (!m) return ''; const D = debutsDe(m, 'lignes'), i = g - m.debut; return m.lignes.slice(D[i], D[i + 1] - 1); }
const ligneDeLaBase = (B, g, garder) => liaisonDeLaBase(ligneBruteDeLaBase(B, g), garder);
const contratDeLaBase = (B, h) => B && B.meta.contrats.find(c => c.h === h) || null;
// les liaisons d'un contrat, fraîches (un contrat qu'on ouvre devient un plan : rien n'y est partagé avec la base)
function liaisonsDuContratDeLaBase(B, c) { if (typeof c === 'string') c = contratDeLaBase(B, c); if (!c) return null; const out = [];
  for (let g = c.debut; g < c.fin;) { const m = morceauDe(B, g), D = debutsDe(m, 'lignes'), fin = Math.min(c.fin, m.debut + m.n);
    for (; g < fin; g++) { const i = g - m.debut; out.push(liaisonDeLaBase(m.lignes.slice(D[i], D[i + 1] - 1))); } }
  return out; }

/* ---- CHERCHER DANS TOUT ------------------------------------------------------------------------------------------- */
/* Un part number, un type de câble, un repère, un numéro de câble, un harness, un dessin : chaque ligne qui le porte, rangée
   sous son contrat. « 300XC1:B5 » : ce repère et cette borne, exactement (les deux cases qui se suivent) ; « "W-012" » entre
   guillemets : une case entière. Rend { motif, n (lignes), contrats: [{ k, n, lignes: [rangs] }], ms } ; null sous deux
   caractères. `contrats` (un Set de rangs de contrats) restreint la recherche ; `parContrat` : combien de lignes montrer. */
function chercherDansLaBase(B, q, o) { o = o || {}; const t0 = Date.now(), t = normaliserRecherche(String(q == null ? '' : q).trim()); if (!B || t.replace(/["\s]/g, '').length < 2) return null;
  const rb = /^([^:\s"]+)\s*:\s*([^:\s"]+)$/.exec(t), ex = /^"([^"]+)"$/.exec(t);
  const motif = rb ? '\u0001' + rb[1] + '\u0001' + rb[2] + '\u0001' : ex ? '\u0001' + ex[1] + '\u0001' : t;
  const C = B.meta.contrats, parContrat = new Map(), garde = o.parContrat == null ? 3 : o.parContrat; let n = 0, k = 0;
  for (const m of B.morceaux) { const s = m.bas; let p = s.indexOf(motif); if (p < 0) continue; const D = debutsDe(m, 'bas');
    while (p >= 0) { const i = rangDansLeMorceau(D, p, m.n), g = m.debut + i;
      while (k < C.length - 1 && C[k].fin <= g) k++;
      if (!o.contrats || o.contrats.has(k)) { n++; let x = parContrat.get(k); if (!x) parContrat.set(k, x = { k, n: 0, lignes: [] }); x.n++; if (x.lignes.length < garde) x.lignes.push(g); }
      p = i + 1 < m.n ? s.indexOf(motif, D[i + 1]) : -1; } }
  return { q: String(q).trim(), motif, exact: !!(rb || ex), borne: !!rb, n, contrats: [...parContrat.values()], ms: Date.now() - t0 }; }
// ce que la recherche a trouvé dans une ligne : les champs qui portent le motif (« part number », « repère »…)
const MOTS_CHAMPS_BASE = { harness: 'harness', install: 'installation', ecp: 'ECP', de: 'repère', borneDe: 'borne', pnDe: 'part number', descriptionDe: 'désignation', type: 'type de câble', cable: 'n° de câble', route: 'route',
  vers: 'repère', borneVers: 'borne', pnVers: 'part number', descriptionVers: 'désignation', fwd: 'dessin', appareil: 'appareil', retest: 'date' };
function champsTrouves(brute, R) { const f = brute.split('\u0001'), t = R.motif.replace(/^\u0001|\u0001$/g, ''), out = [];
  if (R.borne) { const [r, b] = t.split('\u0001'); [[3, 4], [10, 11]].forEach(([i, j]) => { if (normaliserRecherche(f[i]) === r && normaliserRecherche(f[j]) === b) out.push(CHAMPS_BASE[i], CHAMPS_BASE[j]); }); return out; }
  for (let i = 0; i < CHAMPS_CHERCHES; i++) { const v = normaliserRecherche(f[i]); if (R.exact ? v === t : v.includes(t)) out.push(CHAMPS_BASE[i]); }
  return out; }
/* Le mot qui dit ce qu'on a trouvé : le champ le plus fréquent parmi les lignes montrées (« part number », « repère »…). */
function genreTrouve(B, R) { const n = new Map(); R.contrats.slice(0, 40).forEach(x => x.lignes.forEach(g => new Set(champsTrouves(ligneBruteDeLaBase(B, g), R).map(c => MOTS_CHAMPS_BASE[c])).forEach(m => n.set(m, (n.get(m) || 0) + 1))));
  return [...n].sort((a, b) => b[1] - a[1]).map(x => x[0]); }

/* ---- LIRE LE CLASSEUR : le zip, ses mots, ses feuilles, au fil de l'eau ------------------------------------------- */
// le répertoire central d'un zip (la fin du fichier) : chaque entrée, son nom, sa méthode, ses tailles ; null si ce n'en est pas un lisible ici (zip64…)
function zipEntrees(u8) { const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); let e = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) return null; const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); if (p === 0xFFFFFFFF || p >= u8.length) return null;
  const Z = new Map(), dec = new TextDecoder();
  for (let k = 0; k < n && p + 46 <= u8.length; k++) { if (dv.getUint32(p, true) !== 0x02014b50) break;
    const ln = dv.getUint16(p + 28, true), lx = dv.getUint16(p + 30, true), lc = dv.getUint16(p + 32, true), nom = dec.decode(u8.subarray(p + 46, p + 46 + ln));
    Z.set(nom, { nom, methode: dv.getUint16(p + 10, true), comp: dv.getUint32(p + 20, true), brut: dv.getUint32(p + 24, true), local: dv.getUint32(p + 42, true) }); p += 46 + ln + lx + lc; }
  return Z; }
function zipDonnees(u8, x) { const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), p = x.local; if (dv.getUint32(p, true) !== 0x04034b50) throw new Error('entrée de zip illisible : ' + x.nom);
  const d = p + 30 + dv.getUint16(p + 26, true) + dv.getUint16(p + 28, true); return u8.subarray(d, d + x.comp); }
/* Le texte d'une entrée, morceau par morceau : `surTexte(t)` à chaque morceau décompressé ; rendre false arrête. */
async function zipLire(u8, x, surTexte) { const d = zipDonnees(u8, x), dec = new TextDecoder('utf-8');
  if (x.methode === 0) { surTexte(dec.decode(d)); return; } if (x.methode !== 8) throw new Error('compression inconnue (' + x.methode + ')');
  const r = new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  for (;;) { const { done, value } = await r.read(); if (done) break; if (surTexte(dec.decode(value, { stream: true })) === false) { try { await r.cancel(); } catch (_) { } return; } }
  const fin = dec.decode(); if (fin) surTexte(fin); }
async function zipTexte(u8, Z, nom) { const x = Z.get(nom); if (!x) return ''; let s = ''; await zipLire(u8, x, t => { s += t; }); return s; }
// le texte d'un XML : ses entités, et les _x000D_ d'Excel
const xmlTexte = s => s.indexOf('&') < 0 && s.indexOf('_x') < 0 ? s : s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'' }[e.toLowerCase()]).replace(/_x([0-9A-Fa-f]{4})_/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
const attrXml = (s, a) => { const i = s.indexOf(' ' + a + '="'); if (i < 0) return ''; const d = i + a.length + 3; return s.slice(d, s.indexOf('"', d)); };
// les mots partagés du classeur : le texte de chaque <si> (ses <t>, sans la lecture phonétique)
function lireMots(x, sst) { let p = 0; for (;;) { const a = x.indexOf('<si>', p); if (a < 0) return; const b = x.indexOf('</si>', a); if (b < 0) return; let s = x.slice(a + 4, b); p = b + 5;
  if (s.startsWith('<t>') && s.indexOf('<', 3) === s.length - 4) { sst.push(xmlTexte(s.slice(3, -4))); continue; }
  if (s.indexOf('<rPh') >= 0) s = s.replace(/<rPh\b[\s\S]*?<\/rPh>/g, ''); let t = ''; s.replace(/<t(?:\s[^>]*)?>([^<]*)<\/t>/g, (m, v) => { t += v; return m; }); sst.push(xmlTexte(t)); } }
// les styles qui sont des dates (une date Excel est un nombre de jours ; son style la dit date)
function stylesDates(x) { const fmts = new Map(); (x.match(/<numFmt\b[^>]*>/g) || []).forEach(n => fmts.set(+attrXml(n, 'numFmtId'), xmlTexte(attrXml(n, 'formatCode'))));
  const dateId = id => (id >= 14 && id <= 22) || (id >= 27 && id <= 36) || (id >= 45 && id <= 47) || (id >= 50 && id <= 58) || (fmts.has(id) && /[dy]/i.test(fmts.get(id).replace(/"[^"]*"|\\.|\[[^\]]*\]/g, '')));
  const xfs = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(x), S = new Set(); if (xfs) (xfs[1].match(/<xf\b[^>]*>/g) || []).forEach((f, i) => { if (dateId(+attrXml(f, 'numFmtId'))) S.add(i); }); return S; }
const deuxChiffres = n => (n < 10 ? '0' : '') + n, DATES_EXCEL = new Map();
const dateExcel = v => { let s = DATES_EXCEL.get(v); if (s !== undefined) return s; const d = new Date(Math.round((+v - 25569) * 864e5));
  s = isNaN(d) ? String(v) : deuxChiffres(d.getUTCDate()) + '/' + deuxChiffres(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear(); if (DATES_EXCEL.size < 100000) DATES_EXCEL.set(v, s); return s; };
const colonneDe = ref => { let c = 0; for (let i = 0; i < ref.length; i++) { const k = ref.charCodeAt(i); if (k < 65 || k > 90) break; c = c * 26 + k - 64; } return c - 1; };
/* Les cellules d'une ligne <row> : une chaîne par colonne (vide quand la case l'est) — le mot partagé, le texte en ligne, le
   nombre tel qu'Excel l'écrit, une date en jj/mm/aaaa. */
function cellulesXml(x, sst, dates) { const row = []; let p = 0, col = -1;
  for (;;) { p = x.indexOf('<c', p); if (p < 0) break; const k = x.charCodeAt(p + 2); if (k !== 32 && k !== 62 && k !== 47) { p += 2; continue; }
    const fa = x.indexOf('>', p), auto = x.charCodeAt(fa - 1) === 47, at = x.slice(p + 2, auto ? fa - 1 : fa); let inner = '';
    if (auto) p = fa + 1; else { const f = x.indexOf('</c>', fa); inner = x.slice(fa + 1, f); p = f + 4; }
    const r = attrXml(at, 'r'); col = r ? colonneDe(r) : col + 1; if (auto) continue;
    const t = attrXml(at, 't'); let v = '';
    if (t === 'inlineStr') { inner.replace(/<t(?:\s[^>]*)?>([^<]*)<\/t>/g, (m, s) => { v += s; return m; }); v = xmlTexte(v); }
    else { const a = inner.indexOf('<v>'); if (a < 0) continue; const raw = inner.slice(a + 3, inner.indexOf('</v>', a));
      v = t === 's' ? (sst[+raw] || '') : t === 'str' || t === 'e' ? xmlTexte(raw) : t === 'b' ? (raw === '1' ? 'TRUE' : 'FALSE') : t === 'd' ? dateExcel((Date.parse(raw) / 864e5) + 25569) : dates.has(+attrXml(at, 's')) ? dateExcel(raw) : raw; }
    while (row.length < col) row.push(''); row[col] = v; }
  return row; }
/* Une feuille, ligne à ligne : `surLigne(cellules, n° Excel)` ; rendre false l'arrête (une feuille qui n'est pas un retest).
   `surOctets(lus, debut)` : ce qui est décompressé — et, la première fois, le début du texte (sa <dimension>). */
async function lireFeuilleXml(u8, x, sst, dates, surLigne, surOctets) { let reste = '', fini = false, vu = 0, premier = true, precedente = 0;
  await zipLire(u8, x, t => { reste += t; vu += t.length; let p = 0; if (premier && surOctets) { premier = false; surOctets(vu, reste.slice(0, 2000)); }
    for (;;) { const a = reste.indexOf('<row', p); if (a < 0) break; const fa = reste.indexOf('>', a); if (fa < 0) break;
      // le numéro Excel de la ligne (un classeur sans r="…" : la suivante)
      const num = +attrXml(reste.slice(a, fa), 'r') || precedente + 1; precedente = num;
      if (reste.charCodeAt(fa - 1) === 47) { p = fa + 1; continue; }
      const b = reste.indexOf('</row>', fa); if (b < 0) break;
      if (surLigne(cellulesXml(reste.slice(fa + 1, b), sst, dates), num) === false) { fini = true; return false; } p = b + 6; }
    reste = reste.slice(p); if (surOctets) surOctets(vu); return !fini; }); }

/* ---- LIRE LES LIGNES COMME UN RETEST ------------------------------------------------------------------------------- */
/* La lecture de 02 (`lireTexte`), ligne à ligne : les en-têtes sont la ligne qui reconnaît le plus de colonnes parmi les
   trente premières d'une feuille ; une autre ligne d'en-têtes plus bas (un extrait collé à la suite) prend le relais ; une
   feuille sans en-têtes est ignorée et nommée. Chaque ligne complète devient une liaison (`surLiaison`). */
function lecteurDeRetest(surLiaison) { const L = { n: 0, rejets: 0, entete: 0, colonnes: 0, lues: [], ignorees: [], brutes: [], harness: false, install: false };
  let col = null, enMm = false, tampon = [], decide = false, feuille = '';
  // une case (une chaîne déjà : `liaison` la nettoie) ; l'installation et l'ECP, nettoyés ici
  const g = (row, i) => i != null && row[i] != null ? row[i] : '';
  const prendre = row => { const c = col; const l = liaison({ de: g(row, c.device1), borneDe: g(row, c.pin1), pnDe: g(row, c.pn1), vers: g(row, c.device2), borneVers: g(row, c.pin2), pnVers: g(row, c.pn2),
      cable: g(row, c.cabletag), type: g(row, c.cabletg), route: g(row, c.route), plan: g(row, c.fwd), fwd: g(row, c.fwd), descriptionDe: g(row, c.desc1), descriptionVers: g(row, c.desc2),
      longueur: c.length != null && g(row, c.length) !== '' ? g(row, c.length) + (enMm ? ' mm' : '') : '', harness: g(row, c.harness), appareil: g(row, c.appareil), retest: g(row, c.retest) });
    const ins = String(g(row, c.install)).trim(); if (ins) l.install = ins; const ecp = String(g(row, c.ecp)).trim(); if (ecp) l.ecp = ecp;
    if (liaisonComplete(l)) { L.n++; surLiaison(l); } else if (row.some(x => x)) L.rejets++; };
  const poser = (row, e) => { col = e.col; enMm = col.length != null && /mm/i.test(row[col.length] || ''); if (col.harness != null) L.harness = true; if (col.install != null || col.ecp != null) L.install = true; };
  // une ligne qui pourrait être des en-têtes : une case « Device1 » (le test complet ne coûte qu'alors)
  const entete = row => row.some(x => x && x.length >= 7 && x.length <= 16 && /^device[\s_-]*1$/i.test(x.trim()));
  const lire = row => { if (entete(row)) { const e = colonnesRetest(row.map(x => String(x == null ? '' : x).trim())); if (e) { poser(row, e); return; } } prendre(row); };
  const decider = () => { decide = true; let best = null;
    tampon.forEach(([row, num], i) => { const e = colonnesRetest(row.map(x => String(x == null ? '' : x).trim())); if (e && (!best || e.trouvees > best.e.trouvees)) best = { i, num, e, row }; });
    if (!best) { L.ignorees.push(feuille); if (!L.brutes.length) L.brutes = tampon.map(([row]) => row.join('\t')); tampon = []; return false; }
    poser(best.row, best.e); if (!L.entete) { L.entete = best.num; L.colonnes = best.e.trouvees; } L.lues.push(feuille);
    tampon.slice(best.i + 1).forEach(([row]) => lire(row)); tampon = []; return true; };
  return { L,
    feuille(nom) { feuille = nom || ''; col = null; tampon = []; decide = false; },
    // les trente premières lignes attendent (les en-têtes sont la meilleure d'entre elles) ; rend false quand la feuille
    // est jugée sans en-têtes : la suite ne sert à rien
    ligne(row, num) { if (!decide) { if (num <= 30) { tampon.push([row, num]); if (num < 30) return true; } if (!decider()) return false; if (num <= 30) return true; }
      if (!col) return false; lire(row); return true; },
    finFeuille() { if (!decide) decider(); } }; }
// le texte d'un fichier : UTF-8, sinon Windows-1252 (le CSV de l'Excel français)
function texteDesOctets(u8) { let t; try { t = new TextDecoder('utf-8', { fatal: true }).decode(u8); } catch (_) { t = new TextDecoder('windows-1252').decode(u8); } return t.charCodeAt(0) === 0xfeff ? t.slice(1) : t; }

/* ---- LIRE LA BASE : le point d'entrée du Worker -------------------------------------------------------------------- */
/* Un fichier (Excel ou CSV) → { lecture (en-têtes, feuilles lues et ignorées, lignes rejetées, ce qui a été lu), base }.
   `surProgres({ etape, fait, total })` dit le vrai : 'ouvre' (le fichier arrive), 'mots' (les mots partagés), 'lignes'
   (fait / total : les lignes lues sur celles que la feuille annonce), 'range' (les morceaux faits). Un classeur qu'on ne
   sait pas lire au fil de l'eau (un .xls, un zip64) passe par SheetJS quand il est là. */
async function lireLaBase(fichier, surProgres) { const prog = surProgres || (() => { }), nom = fichier.name || 'la base', t0 = Date.now();
  prog({ etape: 'ouvre', fait: 0, total: fichier.size || 0 });
  const u8 = new Uint8Array(await fichier.arrayBuffer()), R = rangeurDeBase(), lec = lecteurDeRetest(l => R.ajouter(l)), L = lec.L;
  // la barre : les octets décompressés sur ceux du fichier (le travail fait, vraiment) ; les mots : les lignes lues sur celles annoncées
  let annonce = 0, octets = 0, octetsTotal = 0, dernier = 0;
  const dire = force => { const t = Date.now(); if (force || t - dernier > 100) { dernier = t; prog({ etape: 'lignes', fait: L.n + L.rejets, total: annonce, n: L.n, octets, octetsTotal }); } };
  const zip = u8.length > 4 && u8[0] === 0x50 && u8[1] === 0x4b; let lu = false, moteur = 'flux';
  if (zip) { const Z = zipEntrees(u8);
    if (Z && Z.has('xl/workbook.xml')) {
      const wb = await zipTexte(u8, Z, 'xl/workbook.xml'), rels = await zipTexte(u8, Z, 'xl/_rels/workbook.xml.rels'), cible = new Map();
      (rels.match(/<Relationship\b[^>]*>/g) || []).forEach(r => { const id = attrXml(r, 'Id'), t = attrXml(r, 'Target'); if (id && t) cible.set(id, t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, '')); });
      const feuilles = (wb.match(/<sheet\b[^>]*>/g) || []).map(s => ({ nom: xmlTexte(attrXml(s, 'name')), x: Z.get(cible.get(attrXml(s, 'r:id'))) })).filter(f => f.x);
      prog({ etape: 'mots', fait: 0, total: 0 });
      const sst = [], xs = Z.get('xl/sharedStrings.xml');
      if (xs) { let reste = ''; await zipLire(u8, xs, t => { reste += t; const f = reste.lastIndexOf('</si>'); if (f >= 0) { lireMots(reste.slice(0, f + 5), sst); reste = reste.slice(f + 5); } }); }
      const dates = stylesDates(await zipTexte(u8, Z, 'xl/styles.xml'));
      octetsTotal = feuilles.reduce((s, f) => s + f.x.brut, 0); let avant = 0;
      for (const f of feuilles) { lec.feuille(f.nom);
        // le total que la feuille annonce (<dimension ref="A1:R300109"/>), lu sur son premier morceau
        await lireFeuilleXml(u8, f.x, sst, dates, (row, num) => { const r = lec.ligne(row, num); dire(); return r; }, (vu, debut) => { octets = avant + vu; if (debut != null) annonce += lignesAnnoncees(debut); });
        avant += f.x.brut; octets = avant; lec.finFeuille(); }
      lu = feuilles.length > 0; } }
  if (!lu && zip) { if (typeof XLSX === 'undefined') throw new Error('ce classeur ne se lit pas au fil de l’eau, et la bibliothèque Excel n’est pas là'); moteur = 'SheetJS';
    const wb = XLSX.read(u8, { type: 'array', dense: true }); for (const n of wb.SheetNames) { lec.feuille(n);
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, blankrows: true, defval: '', raw: false }); annonce += rows.length;
      for (let i = 0; i < rows.length; i++) { if (lec.ligne((rows[i] || []).map(c => c == null ? '' : String(c)), i + 1) === false) break; dire(); } lec.finFeuille(); } }
  else if (!zip) { const texte = texteDesOctets(u8); let p = 0, num = 0; lec.feuille(''); octetsTotal = texte.length;
    for (let i = 0; ;) { i = texte.indexOf('\n', i); if (i < 0) break; annonce++; i++; } if (!texte.endsWith('\n')) annonce++;
    while (p < texte.length) { let q = texte.indexOf('\n', p); if (q < 0) q = texte.length; const ligne = texte.slice(p, q).replace(/\r$/, ''); p = q + 1; num++; octets = p;
      if (lec.ligne(ligne.trim() ? cellules(ligne) : [], num) === false) break; dire(); }
    lec.finFeuille(); }
  octets = octetsTotal; dire(true);
  const base = R.fin(nom, prog);
  return { lecture: { nom, n: L.n, rejets: L.rejets, entete: L.entete, colonnes: L.colonnes, lues: L.lues, ignorees: L.ignorees.filter(Boolean), brutes: L.brutes.slice(0, 30), harness: L.harness, install: L.install, moteur, ms: Date.now() - t0 }, base }; }
/* Le total que la feuille annonce : ce que <dimension ref="A1:R300109"/> dit (lu par le Worker sur le premier morceau). */
const lignesAnnoncees = x => { const m = /<dimension ref="[A-Z]+\d+:[A-Z]+(\d+)"/.exec(x); return m ? +m[1] : 0; };

/* ---- COMPARER UN RETEST ENTIER AU DÉJÀ-FAIT ---------------------------------------------------------------------------- */
/* LES CONTRATS LES PLUS PROCHES du nôtre, à l'échelle du contrat : chaque ligne réduite à ce qui la fait (ses deux bouts,
   leur borne, le type de câble), avec nos repères tels quels — et une seconde fois sans la zone (« CB1:2 → RL1:A1 ») : une
   machine dont les repères sont décalés d'une zone se reconnaît aussi. Les candidats viennent de l'index par part number
   (les machines qui partagent le plus de nos part numbers), sans parcourir la base ; chacun est noté par la part de lignes
   communes (Jaccard). Rend [{ harness, appareil, retest, taux, communes, lignes, parZone }], les plus proches d'abord. */
const sansZone = r => { const d = decoderRepere(r); return d ? d.code + (d.ordre != null ? d.ordre : '') + d.variante : r; };
function clesDeContrat(liaisons, zone) { const S = new Set(), rep = zone ? r => r : sansZone;
  liaisons.forEach(l => { if (!l.de || !l.vers || l.de === l.vers) return; const a = rep(l.de) + ':' + (l.borneDe || ''), b = rep(l.vers) + ':' + (l.borneVers || ''); S.add((a < b ? a + '>' + b : b + '>' + a) + '|' + typeLu(l.type)); });
  return S; }
const jaccard = (A, B) => { let k = 0; A.forEach(x => { if (B.has(x)) k++; }); const u = A.size + B.size - k; return { taux: u ? k / u : 0, communes: k }; };
// les machines qui portent chaque repère (calculé une fois par index)
const machinesParRepere = index => index.parRepere || (index.parRepere = (() => { const M = new Map(); index.harnais.forEach(h => h.equipements.forEach((e, r) => (M.get(r) || M.set(r, []).get(r)).push(h))); return M; })());
function contratsProches(index, liaisons, n, sauf) { if (!index || !liaisons.length) return [];
  // les candidats : les machines qui portent nos repères (deux points chacun), puis nos part numbers (un point)
  const score = new Map(), plus = (h, k) => score.set(h, (score.get(h) || 0) + k), P = machinesParRepere(index), pns = new Set();
  new Set(liaisons.flatMap(l => [l.de, l.vers]).filter(r => r && !horsEquipement(r))).forEach(r => (P.get(r) || []).forEach(h => plus(h, 2)));
  liaisons.forEach(l => { if (l.pnDe) pns.add(l.pnDe); if (l.pnVers) pns.add(l.pnVers); });
  pns.forEach(pn => new Set((index.parPn.get(pn) || []).map(x => x.h)).forEach(h => plus(h, 1)));
  const cands = [...score].filter(([h]) => !sauf || !sauf(h)).sort((a, b) => b[1] - a[1] || (a[0].harness < b[0].harness ? -1 : 1)).slice(0, 60).map(x => x[0]);
  const A1 = clesDeContrat(liaisons, true), A2 = clesDeContrat(liaisons, false);
  /* Nos repères tels quels d'abord : sans la zone, deux équipements de même code et même ordre se confondent et la ressemblance
     gonfle ; elle ne sert que quand les repères ne disent presque rien (une autre zone), et compte alors un peu moins. */
  return cands.map(h => { const j1 = jaccard(A1, h.cles1 || (h.cles1 = clesDeContrat(h.liaisons, true))), j2 = jaccard(A2, h.cles2 || (h.cles2 = clesDeContrat(h.liaisons, false))), parZone = j1.taux < 0.3 && j2.taux * 0.9 > j1.taux, j = parZone ? { ...j2, taux: j2.taux * 0.9 } : j1;
      return { harness: h.harness, appareil: h.appareil, retest: h.retest, taux: j.taux, communes: j.communes, lignes: h.liaisons.length, parZone }; })
    .sort((a, b) => b.taux - a.taux || b.communes - a.communes || (a.harness < b.harness ? -1 : 1)).slice(0, n || 3); }
/* NOTRE CONTRAT CONTRE UNE MACHINE ENTIÈRE : ses repères correspondus aux nôtres d'un bloc (`correspondre`), chaque ligne
   jugée une fois — pareille, différente, manquante chez nous, en plus chez nous (`comparerEnsemble`) — et rangée sous le
   dessin (FWD) de la machine où elle est ; ce que nous avons en plus, sous notre folio. */
function comparerAuContrat(liaisons, H, fixes) { const C = comparerEnsemble(liaisons, H.liaisons, [...H.equipements.keys()], fixes || new Map()), parDessin = new Map();
  const ranger = (f, x) => { let d = parDessin.get(f); if (!d) parDessin.set(f, d = { fwd: f, lignes: [], compte: null }); d.lignes.push(x); };
  C.lignes.forEach(x => ranger(x.ref ? fwdDe(x.ref) : '\u0001' + (x.notre.fwd || x.notre.plan || ''), x));
  parDessin.forEach(d => { d.compte = compteDe(d.lignes); });
  return { ...C, harness: H.harness, dessins: [...parDessin.values()].sort((a, b) => (a.fwd[0] === '\u0001') - (b.fwd[0] === '\u0001') || String(a.fwd).localeCompare(String(b.fwd), 'fr', { numeric: true })) }; }
