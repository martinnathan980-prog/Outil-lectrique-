/* ===========================================================================
   02 — LA LECTURE
   Un fichier Excel ou un texte tabulé entre ; des liaisons sortent.

   Le format qui compte est le RETEST : seize colonnes nommées, en-têtes en
   ligne 4 sous une date et un mémo. On le lit exactement, par le nom des
   colonnes. Un tableau qui n'est pas du retest — un export bricolé, un
   collage — passe par le rattrapage, qui devine l'ordre des colonnes.
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
  ['fwd',      ['fwd', 'plan']],
  ['length',   ['cablelength', 'cablelengthmm', 'cablelengthinmm', 'length', 'longueur']],
  ['appareil', ['appareil', 'aircraft', 'contrat']],
  ['retest',   ['dateretest', 'retestdate', 'datederetest', 'retest']]
];

function decouperLigne(ligne) {
  if (ligne.includes('\t')) return ligne.split('\t');
  if (ligne.includes(';'))  return ligne.split(';');
  return ligne.split(',');
}
const cellules = ligne => decouperLigne(ligne).map(x => String(x).trim());

/* Où sont les en-têtes ? On prend, dans les trente premières lignes, celle
   qui reconnaît le plus de colonnes — à condition d'y trouver les quatre qui
   font une liaison. Un fichier réorganisé demain continuera de marcher. */
function trouverEnteteRetest(lignes) {
  let meilleure = null;
  for (let r = 0; r < Math.min(lignes.length, 30); r++) {
    const row = cellules(lignes[r]); const col = {}; let n = 0;
    row.forEach((cell, c) => { const k = NORM(cell); if (!k) return;
      for (const [nom, alias] of COLONNES) {
        if (col[nom] == null && alias.includes(k)) { col[nom] = c; n++; break; } } });
    const complete = col.device1 != null && col.device2 != null && col.pin1 != null && col.pin2 != null;
    if (complete && (!meilleure || n > meilleure.trouvees)) meilleure = { ligne: r, col, trouvees: n };
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
   Rend { liaisons, format:'retest'|'libre', entete (n° de ligne Excel) }. */
function lireTexte(texte) {
  const brutes = String(texte || '').split(/\r?\n/);   // lignes vides gardées : numérotation Excel
  const pleines = brutes.filter(l => l.trim());
  if (!pleines.length) return { liaisons: [], format: 'vide' };

  const rt = trouverEnteteRetest(brutes);
  if (rt) {
    const c = rt.col, g = (row, i) => (i != null && row[i] != null) ? row[i] : '';
    const liaisons = [];
    for (let r = rt.ligne + 1; r < brutes.length; r++) {
      if (!brutes[r].trim()) continue;
      const row = cellules(brutes[r]);
      const l = liaison({ de: g(row, c.device1), borneDe: g(row, c.pin1), pnDe: g(row, c.pn1),
                          vers: g(row, c.device2), borneVers: g(row, c.pin2), pnVers: g(row, c.pn2),
                          cable: g(row, c.cabletag), type: g(row, c.cabletg),
                          route: g(row, c.route), plan: g(row, c.fwd) });
      if (liaisonComplete(l)) liaisons.push(l);
    }
    return { liaisons, format: 'retest', entete: rt.ligne + 1, colonnes: rt.trouvees };
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

/* Un fichier (Excel ou texte) → texte tabulé. Excel passe par SheetJS,
   embarqué dans la page : rien ne part sur le réseau. */
async function texteDuFichier(fichier) {
  const nom = (fichier.name || '').toLowerCase();
  const excel = /\.xls[xm]?$/.test(nom) || /sheet|excel/.test(fichier.type || '');
  if (!excel) return fichier.text();
  if (typeof XLSX === 'undefined') throw new Error('bibliothèque Excel absente');
  const wb = XLSX.read(await fichier.arrayBuffer(), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: true, defval: '' });
  return rows.map(r => (Array.isArray(r) ? r : [r]).map(c => c == null ? '' : String(c)).join('\t')).join('\n');
}
async function lireFichier(fichier) { return lireTexte(await texteDuFichier(fichier)); }
