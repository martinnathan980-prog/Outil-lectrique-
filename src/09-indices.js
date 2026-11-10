/* ===========================================================================
   09 nonies — COMPARER DEUX INDICES D'UN MÊME FICHIER (v90)

   Le lecteur a travaillé l'indice A d'un retest ; on lui remet l'indice B. VOLTA dit ce qui a changé, sans rien
   inventer : les liaisons AJOUTÉES, RETIRÉES, CHANGÉES (le type, la longueur, la route, le folio, le harness, un part
   number) et REBRANCHÉES (le même câble, un bout posé ailleurs) ; les équipements qui apparaissent et ceux qui
   disparaissent.

   UNE LIAISON SE RECONNAÎT À SES DEUX BOUTS (repère + borne), dans un sens comme dans l'autre : chez nous les câbles
   n'ont plus de numéro. La colonne du fichier, quand elle est remplie, ne sert qu'à départager ce qui reste (un même
   numéro des deux côtés, un bout déplacé : c'est le même câble, rebranché). Sans numéro, deux restes qui partagent UN
   bout et le même type, sans autre candidat, sont le même câble aussi ; au moindre doute, VOLTA dit « retirée » et
   « ajoutée » — il ne devine pas.

   Ce que VOLTA a ajouté au plan (une barrette à poser, son câble à créer) n'est pas dans un fichier : les deux côtés
   sont ramenés à la forme du fichier (01, `sansBarrettesAPoser`) avant d'être comparés.

     comparerIndices(A, B) → { identiques, changees: [{ avant, apres, champs: [{ champ, avant, apres }] }],
                               rebranchees: [{ avant, apres, bouts: [{ avant, apres }], champs }],
                               ajoutees: [liaison], retirees: [liaison],
                               equipements: { ajoutes: [repère], retires: [repère] }, memes: [[avant, apres]], total }
   =========================================================================== */
const CHAMPS_COMPARES = [['type', 'type'], ['longueur', 'longueur'], ['route', 'route'], ['plan', 'folio'], ['harness', 'harness'], ['install', 'installation']];
const boutDIndice = (r, b) => r + '␁' + b;
const boutsDIndice = l => [boutDIndice(l.de, l.borneDe), boutDIndice(l.vers, l.borneVers)];
const cleDIndice = l => { const [x, y] = boutsDIndice(l); return x < y ? x + '␂' + y : y + '␂' + x; };
/* Les liaisons d'un indice, telles que le fichier les porte : complètes, sans ce que VOLTA ajoute, sans les boucles
   qu'une barrette à poser laisse quand on la retire. */
function liaisonsDuFichier(L) {
  return sansBarrettesAPoser((L || []).filter(liaisonComplete)).filter(l => !l.aCreer && !(l.de === l.vers && l.borneDe === l.borneVers));
}
/* Ce qui diffère entre deux liaisons reconnues pour la même : champ par champ ; les part numbers se comparent bout à
   bout (le sens du fichier peut s'être retourné). Une longueur se compare au centimètre. */
function champsChanges(a, b) {
  const out = [], dit = v => v == null ? '' : String(v), meme = (x, y, c) => c === 'longueur' ? Math.abs((+x || 0) - (+y || 0)) < 0.005 && (x == null) === (y == null) : dit(x) === dit(y);
  CHAMPS_COMPARES.forEach(([c, mot]) => { if (!meme(a[c], b[c], c)) out.push({ champ: mot, avant: a[c] == null ? '' : a[c], apres: b[c] == null ? '' : b[c] }); });
  const retourne = boutDIndice(a.de, a.borneDe) !== boutDIndice(b.de, b.borneDe) && boutDIndice(a.de, a.borneDe) === boutDIndice(b.vers, b.borneVers);
  const pn = (l, cote) => dit(cote === 'de' ? l.pnDe : l.pnVers);
  [['de', retourne ? 'vers' : 'de'], ['vers', retourne ? 'de' : 'vers']].forEach(([ca, cb]) => { const ra = ca === 'de' ? a.de : a.vers, rb = cb === 'de' ? b.de : b.vers;
    if (ra === rb && pn(a, ca) !== pn(b, cb)) out.push({ champ: 'part number', de: ra, avant: pn(a, ca), apres: pn(b, cb) }); });
  return out;
}
function comparerIndices(A, B) {
  const LA = liaisonsDuFichier(A), LB = liaisonsDuFichier(B);
  // 1. les mêmes deux bouts : la même liaison (plusieurs sur la même paire : dans l'ordre du fichier)
  const parCle = new Map(); LB.forEach((l, i) => { const k = cleDIndice(l); (parCle.get(k) || parCle.set(k, []).get(k)).push(i); });
  const prisB = new Set(), couples = [], restesA = [];
  LA.forEach(a => { const f = parCle.get(cleDIndice(a)), i = f && f.length ? f.shift() : -1; if (i < 0) restesA.push(a); else { prisB.add(i); couples.push([a, LB[i]]); } });
  let restesB = LB.filter((_, i) => !prisB.has(i));
  const changees = [], rebranchees = []; let identiques = 0;
  couples.forEach(([a, b]) => { const champs = champsChanges(a, b); if (champs.length) changees.push({ avant: a, apres: b, champs }); else identiques++; });
  // 2. ce qui reste : le même câble rebranché — par le numéro du fichier d'abord, puis par un bout commun et le même type
  const rebrancher = (a, b) => { const ba = boutsDIndice(a), bb = boutsDIndice(b), garde = ba.filter(x => bb.includes(x));
    const partA = ba.filter(x => !garde.includes(x)), partB = bb.filter(x => !garde.includes(x)), lire = x => { const [r, n] = x.split('␁'); return { repere: r, borne: n }; };
    rebranchees.push({ avant: a, apres: b, bouts: partA.map((x, i) => ({ avant: lire(x), apres: lire(partB[i] || partB[0]) })), champs: champsChanges(a, b).filter(c => c.champ !== 'part number') });
    restesB = restesB.filter(x => x !== b); };
  const encoreA = [];
  restesA.forEach(a => { const n = String(a.cable || '').trim(); if (!n) return encoreA.push(a);
    const mA = restesA.filter(x => String(x.cable || '').trim() === n), mB = restesB.filter(x => String(x.cable || '').trim() === n);
    if (mA.length === 1 && mB.length === 1) rebrancher(a, mB[0]); else encoreA.push(a); });
  const retirees = [];
  encoreA.forEach(a => { const ba = boutsDIndice(a), voisin = (x, bx) => bx.some(k => ba.includes(k)) && String(x.type || '') === String(a.type || '');
    const cand = restesB.filter(b => voisin(b, boutsDIndice(b)));
    // sans autre candidat, d'un côté comme de l'autre : sinon VOLTA ne devine pas
    const rivaux = cand.length === 1 ? encoreA.filter(x => x !== a && boutsDIndice(x).some(k => boutsDIndice(cand[0]).includes(k)) && String(x.type || '') === String(cand[0].type || '')) : [];
    if (cand.length === 1 && !rivaux.length && !String(cand[0].cable || '').trim()) rebrancher(a, cand[0]); else retirees.push(a); });
  // 3. les équipements : ceux que l'indice B apporte, ceux qu'il n'a plus
  const ra = new Set(reperesDe(LA)), rb = new Set(reperesDe(LB));
  const equipements = { ajoutes: [...rb].filter(r => !ra.has(r)), retires: [...ra].filter(r => !rb.has(r)) };
  return { identiques, changees, rebranchees, ajoutees: restesB, retirees, equipements, memes: couples, total: { avant: LA.length, apres: LB.length } };
}
/* Le bilan en une phrase — « 3 liaisons ajoutées, 1 retirée, 4 changées, 1 rebranchée » ; rien n'a changé : il le dit. */
function motDeLaComparaison(D) {
  const n = (k, un, pl) => k ? k + ' ' + (k > 1 ? pl : un) : '', parts = [n(D.ajoutees.length, 'liaison ajoutée', 'liaisons ajoutées'), n(D.retirees.length, 'retirée', 'retirées'), n(D.changees.length, 'changée', 'changées'), n(D.rebranchees.length, 'rebranchée', 'rebranchées')].filter(Boolean);
  if (!parts.length) return 'Les deux indices portent les mêmes ' + D.total.apres + ' liaisons';
  if (!D.ajoutees.length) parts[0] = parts[0].replace(/^(\d+) /, (_, k) => k + (k > 1 ? ' liaisons ' : ' liaison '));
  return parts.join(', ');
}
