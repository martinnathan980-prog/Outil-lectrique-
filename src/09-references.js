/* ===========================================================================
   09 quinquies — LES CONTRATS DÉJÀ FAITS : ranger, reconnaître, comparer,
   reprendre
   ---------------------------------------------------------------------------
   La grande base du lecteur : des milliers de lignes de retest, un HARNESS
   (le faisceau d'une machine) par installation, avec l'appareil et la date.
   On ne repart jamais de zéro, on ne colle jamais un contrat entier : pour
   un équipement du contrat, on cherche le même équipement dans les
   références — même part number d'abord, sinon même code —, on mesure ce
   qui se ressemble (les bornes, les types de fil, ce qu'elles relient), on
   montre la différence ligne à ligne, et on reprend ce qu'on coche, recâblé
   sur nos repères. « La solution du PH n'est pas forcément la bonne » : ce
   qui est repris passe les mêmes contrôles que le reste.
   Rien ici ne touche à la page : le moteur, comme 09.
   =========================================================================== */
'use strict';

/* Une ligne d'un équipement, vue de lui : sa borne, le type de fil, l'autre bout (repère, code, borne, part number). */
function lignesDeRepere(liaisons, repere) { return liaisons.filter(l => l.de !== l.vers && (l.de === repere || l.vers === repere)).map(l => { const amont = l.vers === repere;
  const autre = amont ? l.de : l.vers, q = lireRepere(autre);
  return { l, borne: amont ? l.borneVers : l.borneDe, pn: amont ? l.pnVers : l.pnDe, type: typeDuFil(l.type) + (jaugeDuType(l.type) != null ? jaugeDuType(l.type) : ''), typeBrut: l.type,
           autre, codeAutre: q && q.code ? q.code : autre, borneAutre: amont ? l.borneDe : l.borneVers, pnAutre: amont ? l.pnDe : l.pnVers, amont, cable: l.cable }; }); }
const cleLigne = x => [x.borne, x.type, x.codeAutre, x.borneAutre].join('|'), cleLibre = x => [x.type, x.codeAutre, x.borneAutre].join('|');
/* L'INDEX des références : par harness, ses liaisons, son appareil, sa date, ses équipements (part numbers, lignes). */
function indexerReferences(liaisons) { const H = new Map();
  liaisons.forEach(l => { const h = l.harness || '—'; const e = H.get(h) || H.set(h, { harness: h, appareil: l.appareil || '', retest: l.retest || '', liaisons: [] }).get(h); e.liaisons.push(l);
    if (!e.appareil && l.appareil) e.appareil = l.appareil; if (!e.retest && l.retest) e.retest = l.retest; });
  H.forEach(e => { e.equipements = new Map(); reperesDe(e.liaisons).forEach(r => { if (estMasse(r)) return; const xs = lignesDeRepere(e.liaisons, r), q = lireRepere(r);
    e.equipements.set(r, { repere: r, code: q && q.code ? q.code : '', pns: [...new Set(xs.map(x => x.pn).filter(Boolean))], lignes: xs }); }); });
  return { harnais: H, liaisons: liaisons.length }; }
/* LA RESSEMBLANCE de deux équipements : la part des lignes communes (borne, type, ce qu'elle relie) ; `libre` ignore la
   borne (un équipement aux bornes déplacées se reconnaît encore). */
function ressemblance(A, B) { const a = new Set(A.map(cleLigne)), b = new Set(B.map(cleLigne)), al = new Set(A.map(cleLibre)), bl = new Set(B.map(cleLibre));
  const inter = [...a].filter(k => b.has(k)).length, union = new Set([...a, ...b]).size, il = [...al].filter(k => bl.has(k)).length, ul = new Set([...al, ...bl]).size;
  return { taux: union ? inter / union : 0, libre: ul ? il / ul : 0, communes: inter }; }
/* LES CANDIDATS pour un équipement du contrat : les équipements des références de même part number (d'abord), sinon
   de même code ; les mieux ressemblants en tête, `n` au plus. */
function candidatsDeReference(index, liaisons, repere, n) { if (!index) return []; const A = lignesDeRepere(liaisons, repere); if (!A.length) return [];
  const pns = new Set(A.map(x => x.pn).filter(Boolean)), q = lireRepere(repere), code = q && q.code ? q.code : '', out = [];
  index.harnais.forEach(h => h.equipements.forEach(e => { const parPn = e.pns.some(p => pns.has(p)), parCode = !!code && e.code === code; if (!parPn && !parCode) return;
    const r = ressemblance(A, e.lignes); out.push({ harness: h.harness, appareil: h.appareil, retest: h.retest, repere: e.repere, pns: e.pns, par: parPn ? 'pn' : 'code', ...r, lignes: e.lignes.length }); }));
  return out.sort((u, v) => (v.par === 'pn') - (u.par === 'pn') || v.taux - u.taux || v.libre - u.libre || v.communes - u.communes).slice(0, n || 3); }
/* LA CORRESPONDANCE des repères de la référence vers les nôtres : le même repère s'il existe chez nous ; sinon un
   repère de même part number ; sinon le même code, le numéro le plus proche (proposé, `sur`: 'code') ; sinon rien
   (l'équipement est nouveau pour nous). */
function correspondanceDesReperes(liaisons, refLignes, repereRef, repere) { const notres = reperesDe(liaisons), pnDe = new Map();
  liaisons.forEach(l => { if (l.pnDe) pnDe.set(l.de, l.pnDe); if (l.pnVers) pnDe.set(l.vers, l.pnVers); });
  const num = r => { const q = lireRepere(r); return q && q.num ? parseInt(q.num, 10) : NaN; }, code = r => { const q = lireRepere(r); return q && q.code ? q.code : ''; };
  const m = new Map(); m.set(repereRef, { vers: repere, sur: 'cible' });
  refLignes.forEach(x => { const r = x.autre; if (m.has(r)) return;
    if (notres.includes(r)) { m.set(r, { vers: r, sur: 'repère' }); return; }
    const parPn = x.pnAutre ? notres.find(n => pnDe.get(n) === x.pnAutre) : null; if (parPn) { m.set(r, { vers: parPn, sur: 'pn' }); return; }
    const c = code(r), memes = c ? notres.filter(n => code(n) === c) : [];
    if (memes.length) { const k = num(r), proche = memes.slice().sort((u, v) => Math.abs(num(u) - k) - Math.abs(num(v) - k))[0]; m.set(r, { vers: proche, sur: 'code' }); return; }
    m.set(r, { vers: r, sur: 'nouveau' }); });
  return m; }
/* LE DIFFÉRENTIEL : chaque ligne de la référence contre les nôtres — identique (même borne, même type, même chose
   reliée au même endroit), différente (la même borne, mais autre chose), manquante chez nous ; et ce que nous avons
   en plus. La correspondance des repères sert à lire « ce qu'elle relie » avec nos repères. */
function differentiel(liaisons, repere, refLiaisons, repereRef) { const A = lignesDeRepere(liaisons, repere), B = lignesDeRepere(refLiaisons, repereRef), corr = correspondanceDesReperes(liaisons, B, repereRef, repere);
  const pris = new Set(), lignes = [];
  B.forEach(b => { const vers = corr.get(b.autre), ident = A.find(a => !pris.has(a) && cleLigne(a) === cleLigne(b));
    if (ident) { pris.add(ident); lignes.push({ etat: 'identique', ref: b, notre: ident, vers }); return; }
    const meme = A.find(a => !pris.has(a) && a.borne === b.borne);
    if (meme) { pris.add(meme); lignes.push({ etat: 'differe', ref: b, notre: meme, vers }); return; }
    lignes.push({ etat: 'manque', ref: b, notre: null, vers }); });
  A.forEach(a => { if (!pris.has(a)) lignes.push({ etat: 'enplus', ref: null, notre: a }); });
  const r = ressemblance(A, B);
  return { lignes, correspondance: corr, taux: r.taux, libre: r.libre, compte: { identique: lignes.filter(x => x.etat === 'identique').length, differe: lignes.filter(x => x.etat === 'differe').length, manque: lignes.filter(x => x.etat === 'manque').length, enplus: lignes.filter(x => x.etat === 'enplus').length } }; }
/* REPRENDRE : les liaisons à ajouter chez nous pour les lignes cochées (manquantes, ou différentes qu'on remplace),
   recâblées sur nos repères par la correspondance ; le numéro de fil reste à donner. `plan` : le folio où les poser. */
function liaisonsAReprendre(diff, repere, lignes, plan) { const pnDe = new Map(); (diff.lignes || []).forEach(x => { if (x.notre && x.notre.pn) pnDe.set(repere, x.notre.pn); });
  return lignes.map(x => { const b = x.ref, c = diff.correspondance.get(b.autre), autre = c ? c.vers : b.autre, pn = pnDe.get(repere) || b.pn || '';
    const o = b.amont ? { de: autre, borneDe: b.borneAutre, pnDe: b.pnAutre, vers: repere, borneVers: b.borne, pnVers: pn } : { de: repere, borneDe: b.borne, pnDe: pn, vers: autre, borneVers: b.borneAutre, pnVers: b.pnAutre };
    return liaison({ ...o, cable: '', type: b.typeBrut, route: b.l.route || '', plan: plan || '', longueur: b.l.longueur }); }); }
/* LA FLOTTE : pour un équipement, toutes les machines où il apparaît (par part number), et ce qu'elles y font. */
function flotteDe(index, liaisons, repere) { if (!index) return []; const A = lignesDeRepere(liaisons, repere), pns = new Set(A.map(x => x.pn).filter(Boolean)); if (!pns.size) return [];
  const out = []; index.harnais.forEach(h => h.equipements.forEach(e => { if (e.pns.some(p => pns.has(p))) out.push({ harness: h.harness, appareil: h.appareil, retest: h.retest, repere: e.repere, lignes: e.lignes.length, ...ressemblance(A, e.lignes) }); }));
  return out.sort((u, v) => v.taux - u.taux); }
