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

// un en-tête réduit à ses lettres et chiffres, sans accents : « Système » se lit « systeme », « Câble Tag » « cabletag »
const NORM = t => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
/* Les colonnes du retest, et les noms sous lesquels on les accepte. Cette
   table sert aussi à lire la base de retest (09) : un seul vocabulaire.
   L'INSTALLATION (telle antenne, tel cockpit) range les plans dans la
   bibliothèque (08-bibliotheque) : la base des contrats déjà faits qui la
   porte crée chaque installation avec ses plans ; son ECP (cinq chiffres),
   quand une colonne le dit, la numérote. */
/* (v84) les mêmes colonnes écrites en français (« Équipement 1 », « Borne 1 », « Longueur (mm) ») ou à l'anglaise
   (« From device », « To pin », « Wire number ») : un fichier venu d'un autre outil s'ouvre comme un retest, sans passer
   par le rattrapage. Un en-tête nu (« De », « Vers », « Borne ») reste au rattrapage : il ne dit pas de quel bout il parle. */
const COLONNES = [
  ['install',  ['install', 'installation', 'systeme', 'system']],
  ['ecp',      ['ecp', 'numeroecp', 'necp', 'noecp', 'numecp']],
  ['harness',  ['harness', 'faisceau']],
  ['device1',  ['device1', 'equipement1', 'equip1', 'repere1', 'fromdevice', 'devicefrom']],
  ['pin1',     ['pin1', 'borne1', 'broche1', 'frompin', 'pinfrom']],
  ['pn1',      ['pn1', 'partnumber1', 'reference1', 'frompn', 'pnfrom']],
  ['desc1',    ['description1', 'desc1', 'designation1']],
  ['cabletg',  ['cabletg', 'cabletypegauge', 'cabletypeetgauge', 'typegauge', 'cabletype', 'typedecable', 'typecable', 'wiretype']],
  ['cabletag', ['cabletag', 'cablenumber', 'cableno', 'cablenum', 'numerocable', 'numerodecable', 'ncable', 'nocable', 'wiretag', 'wirenumber', 'wireno']],
  ['route',    ['route', 'cheminement']],
  ['device2',  ['device2', 'equipement2', 'equip2', 'repere2', 'todevice', 'deviceto']],
  ['pin2',     ['pin2', 'borne2', 'broche2', 'topin', 'pinto']],
  ['pn2',      ['pn2', 'partnumber2', 'reference2', 'topn', 'pnto']],
  ['desc2',    ['description2', 'desc2', 'designation2']],
  ['fwd',      ['fwd', 'plan', 'dessin', 'drawing']],
  ['length',   ['cablelength', 'cablelengthmm', 'cablelengthinmm', 'cablelengthm', 'length', 'lengthmm', 'lengthm', 'longueur', 'longueurmm', 'longueurm', 'longueurenmm', 'longueurcable', 'longueurcablemm', 'longueurducable', 'longueurducablemm']],
  ['appareil', ['appareil', 'aircraft', 'contrat']],
  ['retest',   ['dateretest', 'retestdate', 'datederetest', 'dateduretest', 'dateinstallation', 'datedelinstallation', 'retest', 'date']]
];
// la colonne que VOLTA ajoute à l'installation corrigée (08-export) : relue, elle n'est pas une colonne du fichier à rendre
const COLONNES_DE_VOLTA = new Set(['modifieparvolta']);

/* (v77, les fichiers piégés : un CSV à virgules aux champs entre guillemets s'ouvrait VIDE ; un « ; » dans une description
   décalait les colonnes) — un CSV comme Excel l'écrit : un champ entre guillemets porte le séparateur, des guillemets
   doublés, des retours à la ligne ; le séparateur se lit HORS des guillemets. Un guillemet au milieu d'un champ (12" de
   câble) reste un caractère : seul celui qui ouvre un champ l'entoure. */
const horsGuillemets = l => String(l).replace(/(^|[\t;,])\s*"(?:[^"]|"")*"/g, '$1');
// le séparateur d'une ligne, lu hors des guillemets : la tabulation (Excel, un collage), sinon « ; » (l'Excel français), sinon « , »
const sepDeLigne = ligne => { const h = horsGuillemets(String(ligne == null ? '' : ligne)); return h.includes('\t') ? '\t' : h.includes(';') ? ';' : ','; };
/* `sep` : celui du FICHIER (v84 — lu sur ses en-têtes, `lireTexte`) ; sans lui, celui de la ligne. Un CSV à virgules dont
   une description porte un « ; » (Excel ne l'entoure pas de guillemets : ce n'est pas son séparateur) se découpait au
   point-virgule — des repères inventés, une liaison perdue. */
function decouperLigne(ligne, sep) { const s = String(ligne == null ? '' : ligne);
  sep = sep || sepDeLigne(s);
  if (!s.includes('"')) return s.split(sep);
  const out = []; let cur = '', q = false, debut = true;
  for (let i = 0; i < s.length; i++) { const ch = s[i];
    if (q) { if (ch === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; continue; }
    if (ch === '"' && debut) { q = true; cur = ''; debut = false; continue; }
    if (ch === sep) { out.push(cur); cur = ''; debut = true; continue; }
    cur += ch; if (ch !== ' ') debut = false; }
  out.push(cur); return out; }
/* Les lignes d'un texte : un retour à la ligne DANS un champ entre guillemets reste dans sa cellule. Des guillemets qui ne
   se ferment pas (un texte qui n'est pas un CSV) : les lignes telles quelles. */
function lignesDuTexte(texte) { const t = String(texte || ''); if (!t.includes('"')) return t.split(/\r?\n/);
  const out = []; let cur = '', q = false, debut = true;
  for (let i = 0; i < t.length; i++) { const ch = t[i];
    if (q) { cur += ch; if (ch === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } continue; }
    if (ch === '"' && debut) { q = true; cur += ch; debut = false; continue; }
    if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; out.push(cur); cur = ''; debut = true; continue; }
    cur += ch; if (ch === '\t' || ch === ';' || ch === ',') debut = true; else if (ch !== ' ') debut = false; }
  if (q) return t.split(/\r?\n/);
  out.push(cur); return out; }
const cellules = (ligne, sep) => decouperLigne(ligne, sep).map(x => String(x).trim());

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
  // les trente premières lignes NON VIDES (v84 : une feuille lue depuis A1 peut commencer par des lignes vides)
  for (let r = 0, vues = 0; r < lignes.length && vues < 30; r++) {
    const brute = lignes[r]; if (Array.isArray(brute) ? !brute.some(x => x != null && String(x).trim()) : !String(brute || '').replace(/[\t;,]/g, '').trim()) continue; vues++;
    // une ligne est un texte à découper, ou déjà un tableau de cellules (Excel) ; son séparateur devient celui du fichier
    const texte = !Array.isArray(lignes[r]), sep = texte ? sepDeLigne(lignes[r] || '') : '';
    const row = texte ? cellules(lignes[r] || '', sep) : lignes[r].map(x => String(x == null ? '' : x).trim());
    const e = colonnesRetest(row);
    if (e && (!meilleure || e.trouvees > meilleure.trouvees)) meilleure = { ligne: r, col: e.col, trouvees: e.trouvees, sep, row };
  }
  return meilleure;
}
/* (v84) LES COLONNES QUE VOLTA NE LIT PAS (« Remarque », « Visa », une colonne d'atelier) : leur en-tête, leur rang. Elles
   ne disent rien au dessin, mais elles sont au fichier : chaque liaison les garde (`autres`, 01) et l'installation corrigée
   les rend. Un en-tête vide n'en fait pas une ; deux colonnes de même nom se distinguent (« Remarque (2) »). */
function colonnesInconnues(row, col) { const prises = new Set(Object.values(col)), vus = new Map(), out = [];
  row.forEach((cell, i) => { const t = String(cell == null ? '' : cell).trim(), k = NORM(t); if (!t || prises.has(i) || COLONNES_DE_VOLTA.has(k)) return;
    const n = (vus.get(t) || 0) + 1; vus.set(t, n); out.push([n > 1 ? t + ' (' + n + ')' : t, i]); });
  return out; }

/* Rattrapage : deviner les colonnes d'un tableau quelconque. */
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
function categorie(cell) {
  const n = norm(cell); if (!n) return null;
  if (/\bplan\b|folio|feuille|^sheet$|planche|^page$|^schema$/.test(n)) return 'plan';
  if (/route|cheminement|chemin|tray|parcours|trajet|passage/.test(n)) return 'route';
  if (/^t\s*\/?\s*g$|gauge|((type|section)(?!.*equip))/.test(n) && !/equip/.test(n)) return 'type';
  if (/cable/.test(n)) return 'cable';
  // « Fil », « N° de fil », « Wire » : le numéro du câble (pas un part number — audit v72 : il partait dans le PN)
  if (/^(n[o°]?\s*(de\s*)?)?fils?\b|^wire\b/.test(n)) return 'cable';
  if (/equip|device|^dev\d?$|^de$|from|depart|source|origine|vers|^to$|arrivee|destination|^rep$|repere/.test(n) && !/cable/.test(n)) return 'eq';
  if (/borne|term|broche|pin(?!\d*$)|^pin\d?$/.test(n) && !/^pn/.test(n)) return 'borne';
  if (/^pn\d?$|potentiel|^pot$/.test(n)) return 'pn';
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
  const brutes = lignesDuTexte(texte);   // lignes vides gardées : numérotation Excel (un retour à la ligne entre guillemets reste dans sa cellule)
  const pleines = brutes.filter(l => l.trim());
  if (!pleines.length) return { liaisons: [], format: 'vide' };

  const rt = trouverEnteteRetest(brutes);
  if (rt) {
    let c = rt.col, sep = rt.sep, entetes = 1, volta = null; const g = (row, i) => (i != null && row[i] != null) ? row[i] : '', journaux = [];
    // la longueur : des mm quand l'en-tête le dit (« Cable length (mm) »)
    const mm = entete => c.length != null && /mm/i.test(entete[c.length] || '');
    let enMm = mm(rt.row), autres = colonnesInconnues(rt.row, c);
    /* (v84 — « rien n'est perdu en silence ») : `liaisons` les liaisons entières (les deux bouts) ; `toutes` aussi celles
       dont un bout manque, à leur rang — le contrat les garde (ni dessinées, ni vérifiées : le contrôle et le récapitulatif
       les disent ; l'installation corrigée les rend) ; `laissees` les lignes qui ne nomment aucun bout ni aucun câble (une
       ligne de total, un reste de mise en page) : le n° de leur ligne, pour le dire. */
    // (v86) `rangs` : la ligne d'Excel de chaque liaison de `toutes` (le bilan d'ouverture la nomme : « lignes 7 et 30 »)
    const liaisons = [], toutes = [], laissees = [], rangs = [];
    for (let r = rt.ligne + 1; r < brutes.length; r++) {
      if (!brutes[r].trim()) continue;
      // ce que `lectureDuFichier` a lu d'un retest corrigé par VOLTA : sa feuille « VOLTA », ses journaux
      if (brutes[r].startsWith(MARQUE_VOLTA)) { try { volta = JSON.parse(brutes[r].slice(MARQUE_VOLTA.length)); } catch (_) { volta = null; } continue; }
      if (brutes[r].startsWith(MARQUE_JOURNAL)) { journaux.push(brutes[r].slice(MARQUE_JOURNAL.length)); continue; }
      // une autre ligne d'en-tête (la feuille suivante d'un classeur, un extrait collé à la suite) : ses colonnes, et son séparateur, prennent le relais
      if (/device|quip|rep[eè]re/i.test(brutes[r])) { const s2 = sepDeLigne(brutes[r]), h = cellules(brutes[r], s2), e = colonnesRetest(h);
        if (e) { c = e.col; sep = s2; enMm = mm(h); autres = colonnesInconnues(h, c); entetes++; continue; } }
      const row = cellules(brutes[r], sep);
      if (!row.some(x => x)) continue;   // une ligne de séparateurs seuls (« ;;;; ») : vide
      const lg = c.length != null ? g(row, c.length) : '', a = {}; let na = 0; autres.forEach(([nom, i]) => { const v = g(row, i); if (v) { a[nom] = v; na++; } });
      const l = liaison({ de: g(row, c.device1), borneDe: g(row, c.pin1), pnDe: g(row, c.pn1),
                          vers: g(row, c.device2), borneVers: g(row, c.pin2), pnVers: g(row, c.pn2),
                          cable: g(row, c.cabletag), type: g(row, c.cabletg),
                          route: g(row, c.route), plan: g(row, c.fwd),
                          // le FWD fait le folio, et reste gardé tel quel (le DESSIN d'origine) ; les descriptions aussi
                          fwd: g(row, c.fwd), descriptionDe: g(row, c.desc1), descriptionVers: g(row, c.desc2),
                          longueur: lg !== '' ? lg + (enMm ? ' mm' : '') : '', longueurBrute: lg,
                          harness: g(row, c.harness), appareil: g(row, c.appareil), retest: g(row, c.retest),
                          // l'installation et son ECP, quand la ligne les dit : la bibliothèque y range le plan (le moteur ne les lit pas)
                          install: g(row, c.install), ecp: g(row, c.ecp), autres: na ? a : null });
      if (liaisonComplete(l)) { liaisons.push(l); toutes.push(l); rangs.push(r + 1); }
      else if (l.de || l.vers || l.cable) { toutes.push(l); rangs.push(r + 1); }
      else laissees.push(r + 1);
    }
    // un repère écrit de deux façons se lit d'une seule (avant les contacts de la feuille « VOLTA », qui le nomment ainsi)
    const lectures = unifierLesReperes(toutes);
    // les contacts choisis à la main vivent sur la liaison : ils y reviennent ici, quel que soit le chemin du fichier ; le
    // reste (les profils de charge, les choix du contrat) se reprend sur le plan qu'il devient (08-export, `retenirVolta`)
    if (volta && Array.isArray(volta.contacts) && volta.contacts.length) { const par = new Map(volta.contacts.map(x => [x.cle, x]));
      liaisons.forEach(l => { const x = par.get([l.de, l.borneDe, l.vers, l.borneVers, l.cable].join('|')); if (!x) return; if (x.contactDe) l.contactDe = x.contactDe; if (x.contactVers) l.contactVers = x.contactVers; }); }
    if ((volta || journaux.length) && typeof retenirVolta === 'function') retenirVolta(volta, liaisons, journaux);
    return { liaisons, toutes, rangs, lectures, incompletes: toutes.length - liaisons.length, laissees, format: 'retest', entete: rt.ligne + 1, entetes, colonnes: rt.trouvees, harnais: [...new Set(liaisons.map(l => l.harness).filter(Boolean))], installs: [...new Set(liaisons.map(l => l.install).filter(Boolean))], volta, journaux };
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
  return { liaisons, lectures: unifierLesReperes(liaisons), format: 'libre' };
}
/* (v86, l'audit B3) UN REPÈRE ÉCRIT DE DEUX FAÇONS — « 103rl1 » et « 103RL1 », « 101 BT1 » et « 101BT1 » : le même
   équipement, une faute de frappe, que VOLTA dessinait deux fois (et chiffrait deux fois). Il se LIT d'une seule façon :
   celle du fichier en capitales sans espace s'il l'écrit ainsi, sinon la plus fréquente. Le fichier n'est pas réécrit :
   chaque liaison lue autrement garde ce qu'il écrivait (`ecrit`, 01 : l'installation corrigée le rend tel quel) ; le
   contrôle le dit, à régler, avec son geste (« Écrire 103RL1 partout », 08-controle) — seul ce geste l'écrit.
   Rend [{ lu, ecritures: [[écriture, nombre de bouts]] }], la façon lue en tête. */
function unifierLesReperes(L) { const par = new Map(), cibles = new Map(), out = [];
  L.forEach(l => ['de', 'vers'].forEach(a => { const r = l[a]; if (!r) return; const f = formeEcrite(r), m = par.get(f) || par.set(f, new Map()).get(f); m.set(r, (m.get(r) || 0) + 1); }));
  par.forEach((m, f) => { if (m.size < 2) return;
    const xs = [...m].sort((x, y) => (y[0] === f) - (x[0] === f) || y[1] - x[1] || COLLATEUR_FR.compare(x[0], y[0])), lu = xs[0][0];
    xs.slice(1).forEach(([r]) => cibles.set(r, lu)); out.push({ lu, ecritures: xs }); });
  if (cibles.size) L.forEach(l => [['de', 'borneDe'], ['vers', 'borneVers']].forEach(([a, b]) => { const lu = cibles.get(l[a]); if (!lu) return;
    // ce que le fichier écrivait : déjà gardé si la lecture changeait ce bout (« 677vt2 51 » + « B »), sinon tel quel
    const e = { ...(l.ecrit || {}) }; if (e[a] == null) { e[a] = l[a]; e[b] = l[b]; } l.ecrit = e; l[a] = lu; }));
  return out; }

/* Un fichier (Excel ou texte) → son texte tabulé, et ce qu'on en a lu : les
   FEUILLES d'un classeur (nom, est-ce un retest, combien de lignes). Un
   classeur à plusieurs feuilles — une par harness, le format naturel d'un
   extrait de base — s'enchaîne feuille après feuille : celles qui portent les
   en-têtes du retest (`lireTexte` reprend ses colonnes à chaque en-tête
   rencontré), les autres sont IGNORÉES et nommées (`ignorees`) pour qu'on le
   dise. Sans aucune feuille de retest (une bible, une norme, un tableau
   libre) : la première feuille seule, comme avant. Excel passe par SheetJS,
   embarqué dans la page : rien ne part sur le réseau. */
/* v73 — LE RETEST CORRIGÉ RELU (l'ingénieur, n° 2 : « rouvert, 207 liaisons au lieu de 201 : les six lignes de la feuille
   Modifications sont devenues des liaisons ; et le profil de charge est perdu ») : la feuille « Modifications » qu'écrit
   VOLTA (08-export) porte Device1, Pin1, Device2, Pin2 — elle a l'air d'un retest. Elle se reconnaît à son NOM, ou à son
   en-tête « Colonne · Avant · Après » : c'est un JOURNAL, laissé de côté et nommé (`journaux`) pour qu'on le dise. La
   feuille cachée « VOLTA » (`volta`) garde ce que les colonnes ne disent pas — profils de charge, hypothèses, choix des
   fiches — : elle se lit à part. Les deux passent aussi dans le texte, sur des lignes marquées que `lireTexte` reconnaît
   (le texte est ce que chaque chemin d'ouverture se transmet). */
const MARQUE_VOLTA = '⁣VOLTA⁣', MARQUE_JOURNAL = '⁣JOURNAL⁣';
const estJournal = (nom, rows) => NORM(nom) === 'modifications' || rows.slice(0, 12).some(r => { const k = new Set(r.map(NORM)); return k.has('colonne') && k.has('avant') && k.has('apres'); });
/* La feuille « VOLTA » : ses lignes [sorte, clé, valeur en mots, donnée JSON], sous l'en-tête « Sorte · Clé · Valeur · Donnée ». */
function lireFeuilleVolta(rows) { const v = { charges: [], hypotheses: {}, contacts: [], designations: [], sexes: [], raccords: [] }; let entete = false, format = '';
  const J = t => { try { return JSON.parse(t); } catch (_) { return undefined; } };
  rows.forEach(r => { const [s, k, , d] = r.map(x => String(x == null ? '' : x)); if (!entete) { entete = NORM(s) === 'sorte' && NORM(d) === 'donnee'; return; }
    const x = J(d); if (x === undefined) return;
    if (s === 'format') format = k; else if (s === 'charge') v.charges.push([k, x]); else if (s === 'hypothese') v.hypotheses[k] = x;
    else if (s === 'contact') v.contacts.push({ cle: k, contactDe: x.contactDe || '', contactVers: x.contactVers || '' });
    else if (s === 'designation') v.designations.push([k, x]); else if (s === 'sexe') v.sexes.push([k, x]); else if (s === 'raccord') v.raccords.push([k, x]); });
  return entete && /^volta/.test(format) ? { format, ...v } : null; }
/* (v84) UNE CASE D'EXCEL EN TEXTE, comme la lecture au fil de l'eau la rend (09-references, `cellulesXml`) : le nombre tel
   qu'Excel le garde, une DATE en jj/mm/aaaa — une case date du retest se lisait « 45957 » ici, « 27/10/2025 » dans un
   gros fichier. `lignesDeFeuille(ws)` : les lignes d'une feuille SheetJS (lue avec `cellNF`, qui garde le format). */
const dateDeSerie = v => { const d = new Date(Math.round((+v - 25569) * 864e5)); if (isNaN(d)) return String(v); const z = n => (n < 10 ? '0' : '') + n; return z(d.getUTCDate()) + '/' + z(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear(); };
const caseDate = c => !!c && ((c.t === 'n' && c.z && typeof XLSX !== 'undefined' && XLSX.SSF && XLSX.SSF.is_date(c.z)) || c.t === 'd');
function lignesDeFeuille(ws) { if (!ws) return [];
  const voir = c => { if (!caseDate(c)) return; const v = c.t === 'd' ? (c.v instanceof Date ? c.v.getTime() : Date.parse(c.v)) / 864e5 + 25569 : c.v; c.t = 's'; c.v = dateDeSerie(v); };
  if (Array.isArray(ws)) ws.forEach(r => { if (Array.isArray(r)) r.forEach(voir); }); else Object.keys(ws).forEach(k => { if (k[0] !== '!') voir(ws[k]); });
  /* (v84) LES CASES FUSIONNÉES vers le bas (un FWD, un harness fusionnés sur les lignes de leur dessin) : SheetJS ne donne la
     valeur qu'à la première ligne, les suivantes se lisaient vides — sans folio, sans harness. Chaque ligne de la fusion
     reçoit la valeur ; une fusion en largeur (un titre) ne se recopie pas dans les colonnes voisines. */
  const lire = (r, c) => Array.isArray(ws) ? (ws[r] || [])[c] : ws[XLSX.utils.encode_cell({ r, c })];
  const poser = (r, c, x) => { if (Array.isArray(ws)) { if (!ws[r]) ws[r] = []; ws[r][c] = x; } else ws[XLSX.utils.encode_cell({ r, c })] = x; };
  (ws['!merges'] || []).forEach(m => { if (!m || !m.s || !m.e || m.e.r <= m.s.r) return; const x = lire(m.s.r, m.s.c); if (!x || x.v == null || x.v === '') return;
    for (let r = m.s.r + 1; r <= m.e.r; r++) { const y = lire(r, m.s.c); if (!y || y.v == null || y.v === '') poser(r, m.s.c, { ...x }); } });
  // un booléen comme Excel l'écrit (TRUE, FALSE), comme la lecture au fil de l'eau
  const bool = c => { if (c && c.t === 'b') { c.t = 's'; c.v = c.v ? 'TRUE' : 'FALSE'; } };
  if (Array.isArray(ws)) ws.forEach(r => { if (Array.isArray(r)) r.forEach(bool); }); else Object.keys(ws).forEach(k => { if (k[0] !== '!') bool(ws[k]); });
  /* les lignes depuis A1 (v84) : la ligne n de la liste est la ligne n + 1 d'Excel, la colonne k la (k + 1)ᵉ — même quand la
     feuille ne commence pas en A1 (une première ligne vide) ; les numéros dits au lecteur sont ceux d'Excel, et la lecture au fil
     de l'eau (09-references) range ses lignes de même */
  const o = { header: 1, blankrows: true, defval: '' }; if (ws['!ref']) { const R = XLSX.utils.decode_range(ws['!ref']); R.s.r = 0; R.s.c = 0; o.range = R; }
  return XLSX.utils.sheet_to_json(ws, o).map(r => (Array.isArray(r) ? r : [r]).map(c => c == null ? '' : String(c))); }
/* Une ligne d'Excel en texte tabulé : une case qui porte une tabulation, un retour à la ligne (Alt+Entrée dans une
   description) ou un guillemet s'entoure de guillemets, comme un CSV — sans eux, la ligne se coupait en deux et les
   colonnes de la seconde moitié glissaient (v84). */
const caseEnTexte = v => /[\t\r\n"]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
// le texte d'un CSV : UTF-8, sinon Windows-1252 (le CSV de l'Excel français : ses accents se lisaient « � »)
async function texteDuCsv(fichier) { if (!fichier.arrayBuffer) return fichier.text(); const u8 = new Uint8Array(await fichier.arrayBuffer());
  let t; try { t = new TextDecoder('utf-8', { fatal: true }).decode(u8); } catch (_) { t = new TextDecoder('windows-1252').decode(u8); } return t.charCodeAt(0) === 0xfeff ? t.slice(1) : t; }
async function lectureDuFichier(fichier) {
  const nom = (fichier.name || '').toLowerCase();
  const excel = /\.(xls[xmb]?|ods)$/.test(nom) || /sheet|excel/.test(fichier.type || '');
  if (!excel) return { texte: await texteDuCsv(fichier), feuilles: [], lues: [], ignorees: [], journaux: [], volta: null };
  if (typeof XLSX === 'undefined') throw new Error('bibliothèque Excel absente');
  let wb; try { wb = XLSX.read(await fichier.arrayBuffer(), { type: 'array', cellNF: true }); }
  // ce que SheetJS dit en anglais, en mots : un classeur protégé, un fichier abîmé
  catch (e) { const m = String(e && e.message || e); throw new Error(/password|encrypt/i.test(m) ? 'il est protégé par un mot de passe — enregistrez-en une copie sans mot de passe' : /zip|end of data|corrupt|unsupported|invalid/i.test(m) ? 'le classeur semble abîmé ou d’un format inconnu' : m); }
  return lectureDesFeuilles(wb.SheetNames.map(n => ({ nom: n, rows: lignesDeFeuille(wb.Sheets[n]) })));
}
/* LES FEUILLES D'UN CLASSEUR → le texte que `lireTexte` lit (v84 : une seule règle pour les deux chemins — ce fichier-ci avec
   SheetJS, et la lecture au fil de l'eau d'un gros classeur dans le Worker, 09-references : les mêmes feuilles donnent le
   même texte, donc les mêmes liaisons). `feuilles` : [{ nom, rows }] dans l'ordre du classeur. */
function lectureDesFeuilles(liste) {
  let volta = null; const journaux = [];
  const feuilles = liste.map(({ nom: n, rows }) => {
    if (NORM(n) === 'volta') { const v = lireFeuilleVolta(rows); if (v) { volta = v; return null; } }
    if (estJournal(n, rows)) { journaux.push(n); return null; }
    return { nom: n, retest: !!trouverEnteteRetest(rows), lignes: rows.filter(r => r.some(Boolean)).length, texte: rows.map(r => r.map(caseEnTexte).join('\t')).join('\n') }; }).filter(Boolean);
  const retests = feuilles.filter(f => f.retest), lues = retests.length ? retests : feuilles.slice(0, 1);
  // un retest relu porte, après ses liaisons, ce qu'on a lu à part : la feuille « VOLTA », les journaux laissés de côté
  const marques = retests.length ? [volta ? MARQUE_VOLTA + JSON.stringify(volta) : '', ...journaux.map(j => MARQUE_JOURNAL + j)].filter(Boolean) : [];
  return { texte: lues.map(f => f.texte).concat(marques).join('\n'), feuilles: feuilles.map(({ nom, retest, lignes }) => ({ nom, retest, lignes })),
           lues: lues.map(f => f.nom), ignorees: feuilles.filter(f => !lues.includes(f)).map(f => f.nom), journaux, volta };
}
async function texteDuFichier(fichier) { return (await lectureDuFichier(fichier)).texte; }
/* Un fichier lu : les liaisons, et les feuilles lues ou ignorées, pour le dire. */
async function lireFichier(fichier) { const f = await lectureDuFichier(fichier); return { ...lireTexte(f.texte), feuilles: f.feuilles, lues: f.lues, ignorees: f.ignorees }; }
