/* ===========================================================================
   02 — LA LECTURE
   Un fichier Excel ou un texte tabulé entre ; des liaisons sortent.

   Le format qui compte est le RETEST : seize colonnes nommées, en-têtes en
   ligne 4 sous une date et un mémo. On le lit exactement, par le nom des
   colonnes. Un classeur Excel se lit feuille par feuille (une par harness :
   chaque feuille qui porte les en-têtes est lue, les autres sont nommées
   pour qu'on dise qu'elles sont ignorées). Un tableau qui n'est pas du
   retest — un export bricolé, un collage — passe par le rattrapage, qui
   devine l'ordre des colonnes.
   =========================================================================== */
'use strict';

const NORM = t => String(t == null ? '' : t).toLowerCase().replace(/[^a-z0-9]/g, '');
/* Les colonnes du retest, et les noms sous lesquels on les accepte. Cette
   table sert aussi à lire la base de retest (09) : un seul vocabulaire. */
const COLONNES = [
  ['harness',  ['harness', 'faisceau']],
  ['device1',  ['device1']],
  ['pin1',     ['pin1']],
  ['pn1',      ['pn1', 'partnumber1']],
  ['desc1',    ['description1', 'desc1']],
  ['cabletg',  ['cabletg', 'cabletypegauge']],
  ['cabletag', ['cabletag']],
  ['route',    ['route', 'cheminement']],
  ['device2',  ['device2']],
  ['pin2',     ['pin2']],
  ['pn2',      ['pn2', 'partnumber2']],
  ['desc2',    ['description2', 'desc2']],
  ['fwd',      ['fwd', 'plan', 'dessin', 'drawing']],
  ['length',   ['cablelength', 'cablelengthmm', 'cablelengthinmm', 'length', 'longueur']],
  ['appareil', ['appareil', 'aircraft', 'contrat']],
  ['retest',   ['dateretest', 'retestdate', 'datederetest', 'dateduretest', 'retest', 'date']]
];

function decouperLigne(ligne) {
  if (ligne.includes('\t')) return ligne.split('\t');
  if (ligne.includes(';'))  return ligne.split(';');
  return ligne.split(',');
}
const cellules = ligne => decouperLigne(ligne).map(x => String(x).trim());

/* Une ligne est-elle un en-tête du retest ? Ses colonnes, si elle nomme au
   moins les quatre qui font une liaison : { col, trouvees } ; sinon null. */
function colonnesRetest(row) {
  const col = {}; let n = 0;
  row.forEach((cell, c) => { const k = NORM(cell); if (!k) return;
    for (const [nom, alias] of COLONNES) {
      if (col[nom] == null && alias.includes(k)) { col[nom] = c; n++; break; } } });
  return col.device1 != null && col.device2 != null && col.pin1 != null && col.pin2 != null ? { col, trouvees: n } : null;
}
/* Où sont les en-têtes ? On prend, dans les trente premières lignes, celle
   qui reconnaît le plus de colonnes — à condition d'y trouver les quatre qui
   font une liaison. Un fichier réorganisé demain continuera de marcher. */
function trouverEnteteRetest(lignes) {
  let meilleure = null;
  for (let r = 0; r < Math.min(lignes.length, 30); r++) {
    // une ligne est un texte à découper, ou déjà un tableau de cellules (Excel)
    const row = Array.isArray(lignes[r]) ? lignes[r].map(x => String(x == null ? '' : x).trim()) : cellules(lignes[r] || '');
    const e = colonnesRetest(row);
    if (e && (!meilleure || e.trouvees > meilleure.trouvees)) meilleure = { ligne: r, col: e.col, trouvees: e.trouvees };
  }
  return meilleure;
}

/* Rattrapage : deviner les colonnes d'un tableau quelconque. */
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
function categorie(cell) {
  const n = norm(cell); if (!n) return null;
  if (/\bplan\b|folio|feuille|^sheet$|planche|^page$|^schema$/.test(n)) return 'plan';
  if (/route|cheminement|chemin|tray|parcours|trajet|passage/.test(n)) return 'route';
  if (/^t\s*\/?\s*g$|gauge|((type|section)(?!.*equip))/.test(n) && !/equip/.test(n)) return 'type';
  if (/cable/.test(n)) return 'cable';
  if (/equip|device|^dev\d?$|^de$|from|depart|source|origine|vers|^to$|arrivee|destination|^rep$|repere/.test(n) && !/cable/.test(n)) return 'eq';
  if (/borne|term|broche|pin(?!\d*$)|^pin\d?$/.test(n) && !/^pn/.test(n)) return 'borne';
  if (/^pn\d?$|potentiel|^pot$|^fil|wire/.test(n)) return 'pn';
  return null;
}
function ressembleAUnEntete(cells) {
  const j = cells.map(norm).join(' ');
  return /equip|borne|cable|plan|pin|\bpn\b|term|folio|vers|depart|broche/.test(j)
      && !/^[+-]?[a-z]?\d/i.test((cells[0] || '').trim());
}
function devinerColonnes(cells) {
  const eqs = [], bornes = [], map = {};
  cells.forEach((c, i) => { const k = categorie(c);
    if (k === 'eq') eqs.push(i);
    else if (k === 'borne' || k === 'pn') bornes.push(i);
    else if (k && map[k] == null) map[k] = i; });
  if (eqs[0] != null) map.eq1 = eqs[0]; if (eqs[1] != null) map.eq2 = eqs[1];
  // une borne appartient au device qui la précède : 1re = borne, 2e = pn
  const seg = i => (map.eq2 != null && i > map.eq2) ? 2 : (map.eq1 != null && i >= map.eq1) ? 1 : 0;
  const s1 = bornes.filter(i => seg(i) === 1), s2 = bornes.filter(i => seg(i) === 2);
  if (s1[0] != null) map.b1 = s1[0]; if (s1[1] != null) map.pn1 = s1[1];
  if (s2[0] != null) map.b2 = s2[0]; if (s2[1] != null) map.pn2 = s2[1];
  return map;
}

/* Le point d'entrée : du texte, des liaisons.
   Rend { liaisons, format:'retest'|'libre', entete (n° de ligne Excel),
   entetes (combien de lignes d'en-tête : les feuilles d'un classeur, ou des
   extraits collés à la suite — chacune reprend ses colonnes), harnais }. */
function lireTexte(texte) {
  const brutes = String(texte || '').split(/\r?\n/);   // lignes vides gardées : numérotation Excel
  const pleines = brutes.filter(l => l.trim());
  if (!pleines.length) return { liaisons: [], format: 'vide' };

  const rt = trouverEnteteRetest(brutes);
  if (rt) {
    let c = rt.col, entetes = 1; const g = (row, i) => (i != null && row[i] != null) ? row[i] : '';
    // la longueur : des mm quand l'en-tête le dit (« Cable length (mm) »)
    const mm = entete => c.length != null && /mm/i.test(entete[c.length] || '');
    let enMm = mm(cellules(brutes[rt.ligne] || ''));
    const liaisons = [];
    for (let r = rt.ligne + 1; r < brutes.length; r++) {
      if (!brutes[r].trim()) continue;
      const row = cellules(brutes[r]);
      // une autre ligne d'en-tête (la feuille suivante d'un classeur, un extrait collé à la suite) : ses colonnes prennent le relais
      const e = colonnesRetest(row); if (e) { c = e.col; enMm = mm(row); entetes++; continue; }
      const l = liaison({ de: g(row, c.device1), borneDe: g(row, c.pin1), pnDe: g(row, c.pn1),
                          vers: g(row, c.device2), borneVers: g(row, c.pin2), pnVers: g(row, c.pn2),
                          cable: g(row, c.cabletag), type: g(row, c.cabletg),
                          route: g(row, c.route), plan: g(row, c.fwd),
                          // le FWD fait le folio, et reste gardé tel quel (le DESSIN d'origine) ; les descriptions aussi
                          fwd: g(row, c.fwd), descriptionDe: g(row, c.desc1), descriptionVers: g(row, c.desc2),
                          longueur: c.length != null && g(row, c.length) !== '' ? g(row, c.length) + (enMm ? ' mm' : '') : '',
                          harness: g(row, c.harness), appareil: g(row, c.appareil), retest: g(row, c.retest) });
      if (liaisonComplete(l)) liaisons.push(l);
    }
    return { liaisons, format: 'retest', entete: rt.ligne + 1, entetes, colonnes: rt.trouvees, harnais: [...new Set(liaisons.map(l => l.harness).filter(Boolean))] };
  }

  let map = null, debut = 0; const premiere = cellules(pleines[0]);
  if (ressembleAUnEntete(premiere)) { map = devinerColonnes(premiere); debut = 1; }
  if (!map || map.eq1 == null || map.eq2 == null)
    map = { eq1: 0, b1: 1, pn1: 2, eq2: 3, b2: 4, pn2: 5, cable: 6, type: 7, route: 8, plan: 9 };
  const g = (row, i) => (i != null && row[i] != null) ? row[i] : '';
  const liaisons = [];
  for (let r = debut; r < pleines.length; r++) { const row = cellules(pleines[r]);
    const l = liaison({ de: g(row, map.eq1), borneDe: g(row, map.b1), pnDe: g(row, map.pn1),
                        vers: g(row, map.eq2), borneVers: g(row, map.b2), pnVers: g(row, map.pn2),
                        cable: g(row, map.cable), type: g(row, map.type), route: g(row, map.route), plan: g(row, map.plan) });
    if (liaisonComplete(l)) liaisons.push(l); }
  return { liaisons, format: 'libre' };
}

/* Un fichier (Excel ou texte) → son texte tabulé, et ce qu'on en a lu : les
   FEUILLES d'un classeur (nom, est-ce un retest, combien de lignes). Un
   classeur à plusieurs feuilles — une par harness, le format naturel d'un
   extrait de base — s'enchaîne feuille après feuille : celles qui portent les
   en-têtes du retest (`lireTexte` reprend ses colonnes à chaque en-tête
   rencontré), les autres sont IGNORÉES et nommées (`ignorees`) pour qu'on le
   dise. Sans aucune feuille de retest (une bible, une norme, un tableau
   libre) : la première feuille seule, comme avant. Excel passe par SheetJS,
   embarqué dans la page : rien ne part sur le réseau. */
async function lectureDuFichier(fichier) {
  const nom = (fichier.name || '').toLowerCase();
  const excel = /\.xls[xm]?$/.test(nom) || /sheet|excel/.test(fichier.type || '');
  if (!excel) return { texte: await fichier.text(), feuilles: [], lues: [], ignorees: [] };
  if (typeof XLSX === 'undefined') throw new Error('bibliothèque Excel absente');
  const wb = XLSX.read(await fichier.arrayBuffer(), { type: 'array' });
  const feuilles = wb.SheetNames.map(n => {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, blankrows: true, defval: '' }).map(r => (Array.isArray(r) ? r : [r]).map(c => c == null ? '' : String(c)));
    return { nom: n, retest: !!trouverEnteteRetest(rows), lignes: rows.filter(r => r.some(Boolean)).length, texte: rows.map(r => r.join('\t')).join('\n') }; });
  const retests = feuilles.filter(f => f.retest), lues = retests.length ? retests : feuilles.slice(0, 1);
  return { texte: lues.map(f => f.texte).join('\n'), feuilles: feuilles.map(({ nom, retest, lignes }) => ({ nom, retest, lignes })),
           lues: lues.map(f => f.nom), ignorees: feuilles.filter(f => !lues.includes(f)).map(f => f.nom) };
}
async function texteDuFichier(fichier) { return (await lectureDuFichier(fichier)).texte; }
/* Un fichier lu : les liaisons, et les feuilles lues ou ignorées, pour le dire. */
async function lireFichier(fichier) { const f = await lectureDuFichier(fichier); return { ...lireTexte(f.texte), feuilles: f.feuilles, lues: f.lues, ignorees: f.ignorees }; }
