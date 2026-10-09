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
/* Une ligne d'un équipement, vue de lui : sa borne, le type de fil, l'autre bout (repère, code, borne, part number). */
function ligneVueDe(l, amont) { const autre = amont ? l.de : l.vers, q = lireRepere(autre), j = jaugeDuType(l.type);
  return { l, borne: amont ? l.borneVers : l.borneDe, pn: amont ? l.pnVers : l.pnDe, type: typeDuFil(l.type) + (j != null ? j : ''), typeBrut: l.type,
           autre, codeAutre: q && q.code ? q.code : autre, borneAutre: amont ? l.borneDe : l.borneVers, pnAutre: amont ? l.pnDe : l.pnVers, amont, cable: l.cable }; }
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
   une fois, gardé en mémoire : des dizaines de milliers de lignes passent en une fraction de seconde. */
function indexerReferences(liaisons) { const H = new Map(), D = new Map(), parPn = new Map(), parCode = new Map();
  const equip = (M, r, extra) => { let e = M.get(r); if (!e) { const q = lireRepere(r); e = { repere: r, code: q && q.code ? q.code : '', nature: q && CODES[q.code] ? CODES[q.code].nom : '', pns: [], lignes: [], ...extra }; M.set(r, e); } return e; };
  liaisons.forEach(l => { const h = l.harness || '—', f = fwdDe(l);
    let eh = H.get(h); if (!eh) { eh = { harness: h, appareil: l.appareil || '', retest: l.retest || '', liaisons: [], equipements: new Map(), dessins: [] }; H.set(h, eh); }
    if (!eh.appareil && l.appareil) eh.appareil = l.appareil; if (!eh.retest && l.retest) eh.retest = l.retest; eh.liaisons.push(l);
    const k = cleDessin(h, f); let d = D.get(k);
    if (!d) { d = { cle: k, harness: h, fwd: f, appareil: eh.appareil, retest: eh.retest, liaisons: [], equipements: new Map(), masses: new Map(), fils: 0, pontages: 0 }; D.set(k, d); eh.dessins.push(f); }
    if (!d.appareil && l.appareil) d.appareil = l.appareil; if (!d.retest && l.retest) d.retest = l.retest; d.liaisons.push(l);
    if (!l.de || !l.vers) return;
    if (l.de === l.vers) d.pontages++; else d.fils++;
    [[l.de, false], [l.vers, true]].forEach(([r, amont]) => {
      if (horsEquipement(r)) { if (estMasse(r)) d.masses.set(r, (d.masses.get(r) || 0) + 1); return; }
      const eqH = equip(eh.equipements, r, { fwds: new Map() }), eqD = equip(d.equipements, r, { voisins: new Map(), pontages: 0 });
      if (l.de === l.vers) { if (!amont) eqD.pontages++; return; }   // un pontage n'est pas une ligne vue de l'équipement
      const x = ligneVueDe(l, amont); eqH.lignes.push(x); eqD.lignes.push(x); eqH.fwds.set(f, (eqH.fwds.get(f) || 0) + 1);
      if (x.pn) { if (!eqH.pns.includes(x.pn)) eqH.pns.push(x.pn); if (!eqD.pns.includes(x.pn)) eqD.pns.push(x.pn); }
      eqD.voisins.set(x.autre, (eqD.voisins.get(x.autre) || 0) + 1); }); });
  H.forEach(eh => eh.equipements.forEach(e => { const ent = { h: eh, e };
    e.pns.forEach(pn => (parPn.get(pn) || parPn.set(pn, []).get(pn)).push(ent)); if (e.code) (parCode.get(e.code) || parCode.set(e.code, []).get(e.code)).push(ent); }));
  return { harnais: H, dessins: D, parPn, parCode, liaisons: liaisons.length }; }
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
  const equipements = []; if (t) index.dessins.forEach(d => d.equipements.forEach(e => { if (equipements.length < max && (a(e.repere) || a(e.nature) || e.pns.some(a))) equipements.push({ harness: d.harness, fwd: d.fwd, appareil: d.appareil, e }); }));
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
