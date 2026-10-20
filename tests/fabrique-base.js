/* ===========================================================================
   LA GRANDE BASE INVENTÉE — « l'énorme retest qui gère tous les contrats »
   ---------------------------------------------------------------------------
   La base du lecteur ne quitte jamais son PC : on en fabrique une, au même
   format (le retest, ses seize colonnes, plus l'installation et son ECP),
   aussi grosse qu'on veut (100 000 à 300 000 lignes), reproductible (une
   graine). Des INSTALLATIONS inventées (antenne, cockpit, treuil…), chacune
   son ECP à cinq chiffres et ses repères (l'exemple de Volta, la zone décalée
   d'un millier par installation : les machines d'une même installation
   portent les mêmes repères — c'est ce que « Déjà fait » reconnaît) ; dans
   chacune, des CONTRATS (un harness, un appareil, une date, ses dessins
   FWD), chacun un peu différent des autres (un type changé, une ligne de
   moins, une lampe de plus). Rien ne vient d'un vrai programme.
       const B = require('./fabrique-base');
       B.lignes(300000)          → [titre, mémo, '', en-têtes, …lignes]
       B.classeur(300000)        → Buffer d'un .xlsx (écrit comme Excel l'écrit)
       node tests/fabrique-base.js 300000 sortie.xlsx
   =========================================================================== */
const fs = require('fs'), path = require('path'), vm = require('vm');
const bac = { console }; vm.createContext(bac);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', '01-modele.js'), 'utf8') + '\nthis.E = contratExemple();', bac);
const EXEMPLE = bac.E;

const ENTETES = ['Install', 'ECP', 'Harness', 'Device1', 'Pin1', 'PN1', 'Description1', 'Cable T/G', 'Cable Tag', 'Route', 'Device2', 'Pin2', 'PN2', 'Description2', 'FWD', 'Cable length (mm)', 'Appareil', 'Date retest'];
const INSTALLATIONS = ['Antenne VHF', 'Antenne UHF', 'Radar météo', 'Cockpit gauche', 'Cockpit droit', 'Phare d’atterrissage', 'Treuil de secours', 'Crochet de charge', 'Caméra infrarouge',
  'Projecteur de recherche', 'Flottabilité de secours', 'Balise de détresse', 'Enregistreur de vol', 'Pilote automatique', 'Dégivrage des pales', 'Éclairage cabine', 'Prise de parc', 'Démarreur',
  'Batterie principale', 'Batterie de secours', 'Alternateur 1', 'Alternateur 2', 'Pompe carburant avant', 'Pompe carburant arrière', 'Jaugeage carburant', 'Feux de navigation', 'Feux anticollision',
  'Essuie-glace', 'Chauffage cabine', 'Climatisation', 'Ventilation avionique', 'Radioaltimètre', 'Transpondeur', 'Interphone', 'Radio HF', 'Radio VHF 2', 'Goniomètre', 'Système de détection d’obstacles',
  'Train d’atterrissage', 'Frein rotor', 'Commandes de vol', 'Surveillance moteur 1', 'Surveillance moteur 2', 'Détection incendie', 'Extinction incendie', 'Éclairage tableau de bord', 'Panneau supérieur',
  'Console centrale', 'Siège pilote', 'Treuil cargo', 'Barre de remorquage', 'Haut-parleur extérieur', 'Caméra de mission', 'Liaison de données', 'Poste opérateur', 'Rack avionique', 'Prise USB cabine',
  'Hélice de queue', 'Anémomètre', 'Centrale inertielle'];
const APPAREILS = ['H160', 'H175', 'HX-12', 'HX-40', 'Alcyon 2', 'Mistral 6', 'Borée', 'Sirocco 3'];
const TYPES = ['DR12', 'DR16', 'DR20', 'DR22', 'DR24', 'MLB22', 'MLB24', 'MLC24', 'BN24'];
const NATURES = { CB: 'DISJONCTEUR', RL: 'RELAIS', LP: 'LAMPE', BT: 'BATTERIE', XC: 'CONNECTEUR', VT: 'BARRETTE', VC: 'PRISE', SW: 'INTERRUPTEUR', PM: 'POMPE', VL: 'VANNE', CP: 'CAPTEUR',
  ST: 'SONDE', TB: 'BORNIER', HT: 'CHAUFFAGE', SP: 'CALCULATEUR', VN: 'VENTILATEUR', AB: 'ALIMENTATION', CD: 'COMMANDE', GH: 'GÉNÉRATEUR', RC: 'RÉCEPTEUR', LE: 'VOYANT', VG: 'JAUGE', PR: 'PRESSOSTAT' };
// des part numbers de plus, au même vocabulaire (inventés) : ce que telle machine a mis à la place
const VARIANTES_PN = { 'MS3320-10': ['MS3320-15', 'MS3320-5', 'MS3320-7'], 'E0836IS35-22SA': ['E0836IS35-22SB', 'E0836IS42-22SA'], 'E0644D9S': ['E0644D12S', 'E0644D9T'], 'EN2997Y1A12P': ['EN2997Y1A14P', 'EN2997Y1A10P'],
  'NSA937802-03': ['NSA937802-07', 'NSA937802-05'], 'ABS0864-08': ['ABS0864-10', 'ABS0864-12'] };

// le hasard reproductible (mulberry32)
function hasard(graine) { let a = graine >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const deux = n => String(n).padStart(2, '0');

/* Les lignes de la base : `n` liaisons environ (on s'arrête au contrat qui les dépasse), une graine. */
function lignes(n, graine) { const R = hasard(graine || 20261020), pick = xs => xs[Math.floor(R() * xs.length)], ent = (a, b) => a + Math.floor(R() * (b - a + 1));
  const out = [['Retest — base des contrats déjà faits (inventée pour les essais de Volta)'], ['Mémo : une ligne par liaison ; Harness = la machine, FWD = le dessin, Appareil = le contrat'], [], ENTETES];
  const ecps = new Set(); let total = 0, k = 0, contrats = 0;
  // une installation : son ECP, ses repères (la zone décalée), les folios de l'exemple qu'elle porte, son numéro de dessin
  const installs = INSTALLATIONS.map((nom, i) => { let e; do e = String(ent(30000, 69999)); while (ecps.has(e)); ecps.add(e);
    const folios = ['1', '2', '3', '4', '5', '6'].filter(() => R() < 0.55); if (!folios.length) folios.push(String(ent(1, 6)));
    return { nom, ecp: e, decale: 1000 * (i + 1), folios, dessin: 'MEE' + ent(200, 899) + 'A78' + ent(100, 999), harnais: 0 }; });
  const zone = (r, d) => /G$/.test(r) || !/^\d/.test(r) ? r : r.replace(/^(\d+)/, z => String(+z + d));
  while (total < n) { const I = installs[k++ % installs.length], ap = pick(APPAREILS), lettre = 'ABCDEFGH'[APPAREILS.indexOf(ap)], h = (332 + (k % 9)) + 'A60' + ent(1000, 9999) + '-0' + deux(++I.harnais) + '-' + lettre;
    const date = deux(ent(1, 28)) + '/' + deux(ent(1, 12)) + '/' + ent(2019, 2026), base = ent(1000, 9899); let num = ent(1000, 8999); contrats++;
    // un contrat : les folios de son installation (parfois un de moins), chaque ligne un peu à lui
    const fs2 = I.folios.filter((_, j) => j === 0 || R() > 0.12);
    fs2.forEach(f => { const fwd = I.dessin + deux(f) + lettre;
      EXEMPLE.filter(l => l.plan === f).forEach(l => { if (R() < 0.03) return;   // une ligne que cette machine n'a pas
        const de = zone(l.de, I.decale), vers = zone(l.vers, I.decale), cd = (/[A-Z]+/.exec(l.de.replace(/^\d+/, '')) || [''])[0], cv = (/[A-Z]+/.exec(l.vers.replace(/^\d+/, '')) || [''])[0];
        const type = R() < 0.06 ? pick(TYPES) : l.type, pv = p => p && VARIANTES_PN[p] && R() < 0.05 ? pick(VARIANTES_PN[p]) : p;
        out.push([I.nom, +I.ecp, h, de, nombreOuTexte(l.borneDe), pv(l.pnDe), NATURES[cd] || (estMasse(l.de) ? 'MASSE' : ''), type, base + '-' + (num++), l.route, vers, nombreOuTexte(l.borneVers), pv(l.pnVers), NATURES[cv] || (estMasse(l.vers) ? 'MASSE' : ''), fwd, ent(250, 6500), ap, date]); total++; });
      // une lampe, un relais en plus, sur ce dessin, chez certaines machines seulement
      if (R() < 0.25) { const r = (I.decale + ent(100, 699)) + pick(['LP', 'RL', 'SW', 'CP']) + ent(1, 9), x = zone('300XC1', I.decale);
        out.push([I.nom, +I.ecp, h, x, 'C' + ent(1, 30), 'EN4165-2M', 'CONNECTEUR', pick(TYPES), base + '-' + (num++), 'SIGNAL', r, ent(1, 4), pick(['E0644D9S', 'E0836IS35-22SA', 'NSA937802-03', 'E0644B9S']), NATURES[r.replace(/^\d+/, '').slice(0, 2)] || '', fwd, ent(250, 6500), ap, date]); total++; } }); }
  return { lignes: out, n: total, contrats, installations: Math.min(installs.length, contrats) };   // les installations servies (une par contrat, à tour de rôle)
}
const estMasse = r => /^\d+G$/.test(r);
// une borne « 1 » s'écrit en nombre dans Excel, « A1 » en texte — comme le fait un vrai classeur
const nombreOuTexte = v => /^\d+$/.test(String(v)) ? +v : v;
// une date jj/mm/aaaa → le nombre de jours d'Excel (une vraie date de classeur, au style date)
const serieExcel = d => { const [j, m, a] = d.split('/').map(Number); return Date.UTC(a, m - 1, j) / 864e5 + 25569; };

/* LE CLASSEUR, comme Excel l'écrit : les MOTS PARTAGÉS (sharedStrings), les nombres en nombres, la date au style date
   (la colonne « Date retest »), la feuille et sa <dimension> — fabriqué ici en quelques secondes (SheetJS met une minute
   pour 300 000 lignes et n'écrit pas de mots partagés). SheetJS le relit (la batterie le vérifie). */
function classeurExcel(L) { const zlib = require('zlib'), mots = new Map(), sst = [], xs = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const mot = s => { let k = mots.get(s); if (k === undefined) { k = sst.length; mots.set(s, k); sst.push(s); } return k; };
  const col = c => { let s = ''; c++; while (c) { const r = (c - 1) % 26; s = String.fromCharCode(65 + r) + s; c = Math.floor((c - 1) / 26); } return s; };
  const iDate = ENTETES.indexOf('Date retest'), lignesXml = [];
  L.forEach((r, i) => { if (!r.length) return; const n = i + 1;
    lignesXml.push(`<row r="${n}">` + r.map((v, c) => { if (v === '' || v == null) return ''; const ref = col(c) + n;
      if (typeof v === 'number') return `<c r="${ref}"><v>${v}</v></c>`;
      if (c === iDate && i > 3 && /^\d\d\/\d\d\/\d{4}$/.test(v)) return `<c r="${ref}" s="1"><v>${serieExcel(v)}</v></c>`;
      return `<c r="${ref}" t="s"><v>${mot(String(v))}</v></c>`; }).join('') + '</row>'); });
  const feuille = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:${col(ENTETES.length - 1)}${L.length}"/><sheetData>${lignesXml.join('')}</sheetData></worksheet>`;
  const motsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sst.length}" uniqueCount="${sst.length}">${sst.map(s => `<si><t${/^\s|\s$/.test(s) ? ' xml:space="preserve"' : ''}>${xs(s)}</t></si>`).join('')}</sst>`;
  const F = [['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Retest" sheetId="1" r:id="rId1"/></sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>'],
    ['xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>'],
    ['xl/sharedStrings.xml', motsXml], ['xl/worksheets/sheet1.xml', feuille]];
  return zipper(F.map(([nom, t]) => [nom, Buffer.from(t, 'utf8')])); }
// un zip (deflate), à la main : l'en-tête local, les données, le répertoire central, sa fin
function zipper(fichiers) { const zlib = require('zlib'), parts = [], centre = []; let off = 0;
  fichiers.forEach(([nom, brut]) => { const n = Buffer.from(nom, 'utf8'), comp = zlib.deflateRawSync(brut, { level: 6 }), crc = zlib.crc32(brut);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8); h.writeUInt32LE(0, 10); h.writeUInt32LE(crc >>> 0, 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(brut.length, 22); h.writeUInt16LE(n.length, 26); h.writeUInt16LE(0, 28);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10); c.writeUInt32LE(0, 12); c.writeUInt32LE(crc >>> 0, 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(brut.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(off, 42);
    parts.push(h, n, comp); centre.push(c, n); off += 30 + n.length + comp.length; });
  const tc = centre.reduce((s, b) => s + b.length, 0), fin = Buffer.alloc(22); fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(fichiers.length, 8); fin.writeUInt16LE(fichiers.length, 10); fin.writeUInt32LE(tc, 12); fin.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, ...centre, fin]); }
/* Le classeur d'une base de `n` lignes : le Buffer d'un .xlsx. */
function classeur(n, graine) { const B = lignes(n, graine); return { buffer: classeurExcel(B.lignes), n: B.n, contrats: B.contrats, installations: B.installations }; }
/* Le même en CSV (« ; », comme l'Excel français l'écrit). */
function csv(n, graine) { const B = lignes(n, graine); return { texte: B.lignes.map(r => r.join(';')).join('\r\n') + '\r\n', n: B.n, contrats: B.contrats }; }

module.exports = { lignes, classeur, classeurExcel, zipper, csv, ENTETES, INSTALLATIONS, APPAREILS };
if (require.main === module) { const n = +(process.argv[2] || 100000), sortie = process.argv[3] || 'base-' + n + '.xlsx', t0 = Date.now();
  const C = /\.csv$/i.test(sortie) ? csv(n) : classeur(n); fs.writeFileSync(sortie, C.buffer || C.texte);
  console.log(sortie + ' : ' + C.n + ' liaisons, ' + C.contrats + ' contrats, ' + Math.round(fs.statSync(sortie).size / 1024) + ' Ko, ' + (Date.now() - t0) + ' ms'); }
