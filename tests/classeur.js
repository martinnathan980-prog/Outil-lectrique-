/* ===========================================================================
   LE CLASSEUR PILOTE TOUT PRÊT (see/classeur.js) — relu de bout en bout
   ---------------------------------------------------------------------------
       node tests/classeur.js            (VBA_DOSSIER=… pour d'autres .bas)

   Ni Excel ni dépendance : le .xlsm écrit par see/classeur.js est relu avec des
   lecteurs écrits ICI, à part du générateur :
     · le zip (en-têtes locaux et répertoire central, CRC) ;
     · le classeur OOXML : XML bien formé, types de contenu (classeur à macros,
       projet VBA), relations, codeName du classeur et de la feuille accordés
       aux modules de document, ordre des éléments de la feuille, les trois
       boutons (des formes dont la macro est [0]!TesterSEE, [0]!EssaiDessinReel,
       [0]!EssaiSansFenetre, chacune une macro publique sans argument d'un
       module standard, sur des lignes vides entre deux consignes), les
       consignes ; rien ne se lance à l'ouverture ;
     · le fichier composé [MS-CFB] : en-tête, DIFAT, FAT, chaînes (aucun secteur
       pris deux fois, aucun perdu), répertoire (arbre de recherche rangé selon
       § 2.6.4, couleurs, entrées libres), mini-FAT et mini-flux ; relu aussi
       par SheetJS (XLSX.CFB), un second lecteur indépendant ;
     · le projet [MS-OVBA] : _VBA_PROJECT, VBA/dir décompressé par un
       décompresseur écrit pour ce test (§ 2.4.1.3, la table des bits du
       § 2.4.1.3.19) et lu ENREGISTREMENT PAR ENREGISTREMENT, dans l'ordre de
       § 2.3.4.2, PROJECT (ABNF de § 2.3.1, CMG / DPB / GC déchiffrés : non
       protégé, sans mot de passe, visible), PROJECTwm, puis le texte de chaque
       module comparé OCTET POUR OCTET aux .bas (et, pour les modules de
       document, au texte qu'Excel écrit) ;
     · la compression : les trois exemples de § 3.2 au bit près, et des
       allers-retours (vide, 1 octet, 4 096, 4 097, répétitif, aléatoire) ;
     · le chiffrement : les exemples de § 3.1.6 et d'un projet écrit par Excel ;
     · la sortie est déterministe ; le kit (see/kit.js) porte ce classeur en
       tête (ses quatre modules standard, SEE_Windows compris), son LIS-MOI
       est en UTF-8 avec BOM et CRLF et dit les trois boutons, les photos, et
       quoi faire si Excel reste bloqué ;
     · le REFUS : sans la macro du bouton (ou avec un .bas que le classeur ne
       lit pas), classeur.js et kit.js lèvent une exception, sortent avec le
       code 1 et n'écrivent rien, sauf --sans-bouton ; essayé sur des copies
       des .bas (dans le dossier temporaire du système, effacées à la fin) :
       une sans TesterSEE, une avec (une TesterSEE vide y est ajoutée si les
       .bas n'en ont pas encore).
   Puis le contrôleur s'éprouve : des fautes sont injectées une à une dans une
   copie du classeur, chacune doit être attrapée par le contrôle attendu.
   CE QUE CE TEST NE PROUVE PAS : qu'Excel ouvre le classeur. Il prouve qu'il
   suit la spécification et ressemble, enregistrement par enregistrement, à ce
   qu'Excel écrit (voir see/LISEZMOI.md pour la comparaison faite à la main).
   ========================================================================= */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), os = require('os'), { spawnSync } = require('child_process');
const RACINE = path.join(__dirname, '..');
const C = require(path.join(RACINE, 'see', 'classeur.js'));
const XLSX = require(path.join(RACINE, 'lib', 'xlsx.min.js'));
const DOSSIER = process.env.VBA_DOSSIER || path.join(RACINE, 'see', 'vba');

let total = 0, echecs = 0;
const ok = (nom, cond, mesure) => { total++; if (!cond) echecs++; console.log('  ' + (cond ? 'OK    ' : 'ÉCHEC ') + nom + (mesure ? '   — ' + mesure : '')); return !!cond; };
const titre = t => console.log('\n' + t);
const egaux = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const hex = o => [...o].map(x => x.toString(16).toUpperCase().padStart(2, '0')).join(' ');
const latin1 = o => Buffer.from(o).toString('latin1');

/* ce que le projet doit contenir, dit ici, sans le générateur */
const MODULES = [{ nom: 'ThisWorkbook', document: true }, { nom: 'Feuil1', document: true },
  { nom: 'SEE_Commun' }, { nom: 'SEE_Sonde' }, { nom: 'SEE_Pilote' }, { nom: 'SEE_Windows' }];
/* les trois boutons, dits ici sans le générateur : la macro et le texte */
const BOUTONS_ATTENDUS = [['TesterSEE', '1. TESTER SEE'], ['EssaiDessinReel', '2. SEE DESSINE'], ['EssaiSansFenetre', '3. SEE FERMÉ']];
const DOC_EXCEL = (nom, base) => [`Attribute VB_Name = "${nom}"`, `Attribute VB_Base = "${base}"`, 'Attribute VB_GlobalNameSpace = False',
  'Attribute VB_Creatable = False', 'Attribute VB_PredeclaredId = True', 'Attribute VB_Exposed = True',
  'Attribute VB_TemplateDerived = False', 'Attribute VB_Customizable = True', ''].join('\r\n');
const TEXTE_ATTENDU = {
  ThisWorkbook: Buffer.from(DOC_EXCEL('ThisWorkbook', '0{00020819-0000-0000-C000-000000000046}'), 'latin1'),   // la classe Workbook d'Excel
  Feuil1: Buffer.from(DOC_EXCEL('Feuil1', '0{00020820-0000-0000-C000-000000000046}'), 'latin1'),               // la classe Worksheet
};
for (const m of MODULES.filter(m => !m.document)) TEXTE_ATTENDU[m.nom] = fs.readFileSync(path.join(DOSSIER, m.nom + '.bas'));

/* ---- le décompresseur [MS-OVBA] § 2.4.1.3, écrit pour ce test ------------- */
/* Les bits du décalage d'un CopyToken selon la place dans le morceau : la table de § 2.4.1.3.19. */
const TABLE_BITS = [[16, 4], [32, 5], [64, 6], [128, 7], [256, 8], [512, 9], [1024, 10], [2048, 11], [4096, 12]];
function decompresserTest(o) {
  if (o[0] !== 0x01) throw new Error('SignatureByte ' + o[0]);
  const d = []; let i = 1;
  while (i < o.length) {
    const h = o[i] + 256 * o[i + 1], taille = (h & 0x0FFF) + 3, signature = (h >> 12) & 0x7, drapeau = (h >> 15) & 1;
    if (signature !== 0b011) throw new Error('CompressedChunkSignature ' + signature);
    const debutMorceau = d.length, finMorceau = Math.min(o.length, i + taille);
    i += 2;
    if (!drapeau) { if (taille !== 4098) throw new Error('morceau brut de ' + taille + ' octets');
      for (let k = 0; k < 4096; k++) d.push(o[i + k]); i += 4096; continue; }
    while (i < finMorceau) {
      const drapeaux = o[i++];
      for (let b = 0; b < 8 && i < finMorceau; b++) {
        if (!(drapeaux & (1 << b))) { d.push(o[i++]); continue; }
        const jeton = o[i] + 256 * o[i + 1], place = d.length - debutMorceau;
        i += 2;
        const bitsDecalage = (TABLE_BITS.find(([max]) => place <= max) || [0, 12])[1], bitsLongueur = 16 - bitsDecalage;
        const longueur = (jeton & ((1 << bitsLongueur) - 1)) + 3, decalage = (jeton >> bitsLongueur) + 1;
        if (decalage > place) throw new Error('CopyToken avant le début du morceau');
        for (let k = 0; k < longueur; k++) d.push(d[d.length - decalage]);
      }
    }
  }
  return Uint8Array.from(d);
}

/* ---- le zip ---------------------------------------------------------------- */
const TABLE_CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t.push(c >>> 0); } return t; })();
const crc32 = o => { let c = 0xFFFFFFFF; for (const x of o) c = TABLE_CRC[(c ^ x) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
/* Rend [{ nom, octets }] dans l'ordre du répertoire central, après avoir contrôlé chaque entrée. */
function lireZip(z) {
  const v = new DataView(z.buffer, z.byteOffset, z.byteLength);
  let fin = z.length - 22; while (fin >= 0 && v.getUint32(fin, true) !== 0x06054b50) fin--;
  if (fin < 0) throw new Error('zip : pas de fin de répertoire central');
  const n = v.getUint16(fin + 10, true), parts = []; let p = v.getUint32(fin + 16, true);
  for (let k = 0; k < n; k++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error('zip : entrée centrale ' + k);
    const methode = v.getUint16(p + 10, true), crc = v.getUint32(p + 16, true), taille = v.getUint32(p + 20, true), brute = v.getUint32(p + 24, true);
    const ln = v.getUint16(p + 28, true), le = v.getUint16(p + 30, true), lc = v.getUint16(p + 32, true), local = v.getUint32(p + 42, true);
    const nom = latin1(z.subarray(p + 46, p + 46 + ln));
    if (v.getUint32(local, true) !== 0x04034b50) throw new Error('zip : en-tête local de ' + nom);
    const debut = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true), donnees = z.subarray(debut, debut + taille);
    const octets = methode === 0 ? new Uint8Array(donnees) : methode === 8 ? new Uint8Array(zlib.inflateRawSync(donnees)) : null;
    if (!octets || octets.length !== brute || crc32(octets) !== crc) throw new Error('zip : ' + nom + ' (méthode ' + methode + ', CRC ou taille)');
    parts.push({ nom, octets }); p += 46 + ln + le + lc; }
  return parts;
}

/* ---- le fichier composé [MS-CFB], relu ici ---------------------------------- */
const FIN = 0xFFFFFFFE, LIBRE = 0xFFFFFFFF, FATSECT = 0xFFFFFFFD, AUCUN = 0xFFFFFFFF;
/* L'ordre des frères (§ 2.6.4) : la longueur du nom d'abord, puis chaque caractère en majuscule. */
const avant = (a, b) => a.length !== b.length ? a.length - b.length : [...a.toUpperCase()].reduce((r, c, i) => r || c.charCodeAt(0) - b.toUpperCase().charCodeAt(i), 0);
/* Rend { entrees, flux: Map(chemin → octets), defauts: [textes] }. Ne lève que si le fichier est illisible. */
function lireCfb(o) {
  const v = new DataView(o.buffer, o.byteOffset, o.byteLength), defauts = [], u32 = k => v.getUint32(k, true), u16 = k => v.getUint16(k, true);
  const exige = (c, t) => { if (!c) defauts.push(t); };
  exige(egaux([...o.subarray(0, 8)], [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]), 'signature');
  exige(o.subarray(8, 24).every(x => x === 0), 'CLSID de l\'en-tête non nul');
  exige(u16(24) === 0x003E && u16(26) === 3, 'version ' + u16(26) + '.' + u16(24));
  exige(u16(28) === 0xFFFE && u16(30) === 9 && u16(32) === 6, 'ordre des octets ou tailles de secteur');
  exige(o.subarray(34, 40).every(x => x === 0) && u32(40) === 0 && u32(52) === 0, 'champs réservés');
  exige(u32(56) === 4096, 'seuil du mini-flux ' + u32(56));
  exige((o.length - 512) % 512 === 0, 'taille du fichier pas un multiple de 512');
  const nSecteurs = (o.length - 512) / 512, nFat = u32(44), secteur = k => 512 * (k + 1);
  exige(u32(68) === FIN && u32(72) === 0, 'DIFAT hors de l\'en-tête');
  const fatSecteurs = []; for (let i = 0; i < 109; i++) { const s = u32(76 + 4 * i); if (i < nFat) fatSecteurs.push(s); else exige(s === LIBRE, 'DIFAT[' + i + '] non libre'); }
  const fat = []; fatSecteurs.forEach(s => { for (let i = 0; i < 128; i++) fat.push(u32(secteur(s) + 4 * i)); });
  fatSecteurs.forEach(s => exige(fat[s] === FATSECT, 'secteur de FAT ' + s + ' non marqué FATSECT'));
  for (let s = nSecteurs; s < fat.length; s++) exige(fat[s] === LIBRE, 'FAT au-delà du fichier non libre');
  const pris = new Map(); fatSecteurs.forEach(s => pris.set(s, 'FAT'));
  const chaine = (debut, quoi) => { const c = []; for (let s = debut; s !== FIN; s = fat[s]) {
      if (s >= nSecteurs || c.length > nSecteurs) throw new Error('chaîne de ' + quoi + ' hors du fichier ou en boucle');
      exige(!pris.has(s), 'secteur ' + s + ' pris par ' + pris.get(s) + ' et ' + quoi); pris.set(s, quoi); c.push(s); } return c; };
  const lireChaine = c => { const r = new Uint8Array(c.length * 512); c.forEach((s, i) => r.set(o.subarray(secteur(s), secteur(s) + 512), 512 * i)); return r; };
  const rep = lireChaine(chaine(u32(48), 'répertoire')), entrees = [];
  for (let i = 0; i < rep.length / 128; i++) { const b = 128 * i, d = new DataView(rep.buffer, b, 128), ln = d.getUint16(64, true);
    const nom = ln >= 2 ? Buffer.from(rep.subarray(b, b + ln - 2)).toString('utf16le') : '';
    entrees.push({ id: i, nom, ln, type: rep[b + 66], couleur: rep[b + 67], g: d.getUint32(68, true), d: d.getUint32(72, true), enfant: d.getUint32(76, true),
      clsidNul: rep.subarray(b + 80, b + 96).every(x => x === 0), etat: d.getUint32(96, true), tempsNuls: rep.subarray(b + 100, b + 116).every(x => x === 0),
      debut: d.getUint32(116, true), taille: d.getUint32(120, true), tailleHaute: d.getUint32(124, true), brut: rep.subarray(b, b + 128) }); }
  const racine = entrees[0];
  exige(racine.type === 5 && racine.nom === 'Root Entry', 'entrée 0 : pas la racine');
  entrees.forEach(e => { if (e.type === 0) { exige(e.g === AUCUN && e.d === AUCUN && e.enfant === AUCUN && [...e.brut.subarray(0, 68), ...e.brut.subarray(80)].every(x => x === 0), 'entrée libre ' + e.id + ' non nulle'); return; }
    exige([1, 2, 5].includes(e.type), 'type ' + e.type + ' de ' + e.nom);
    exige(e.ln === 2 * (e.nom.length + 1) && e.ln <= 64 && e.brut[e.ln - 2] === 0 && e.brut[e.ln - 1] === 0, 'longueur du nom de ' + e.nom);
    exige(!/[/\\:!]/.test(e.nom), 'caractère interdit dans ' + e.nom);
    exige(e.couleur === 0 || e.couleur === 1, 'couleur de ' + e.nom);
    exige(e.clsidNul && e.etat === 0 && e.tempsNuls && e.tailleHaute === 0, 'CLSID, état, temps ou taille haute de ' + e.nom);
    if (e.type === 2) exige(e.enfant === AUCUN, 'un flux avec un enfant : ' + e.nom);
    if (e.type === 1) exige(e.debut === 0 && e.taille === 0, 'stockage avec des données : ' + e.nom); });
  // l'arbre : chaque stockage, ses frères en arbre de recherche ; aucune entrée vue deux fois, aucune oubliée
  const vues = new Set([0]), chemins = new Map();
  const parcourir = (parent, prefixe) => { const freres = [];
    const descendre = (id, profondeur) => { if (id === AUCUN) return; if (id >= entrees.length || vues.has(id) || profondeur > entrees.length) throw new Error('arbre du répertoire : entrée ' + id + ' revue ou hors du répertoire');
      vues.add(id); const e = entrees[id];
      if (e.g !== AUCUN) { exige(avant(entrees[e.g].nom, e.nom) < 0, 'arbre : ' + entrees[e.g].nom + ' à gauche de ' + e.nom); exige(!(e.couleur === 0 && entrees[e.g].couleur === 0), 'deux rouges de suite'); }
      if (e.d !== AUCUN) { exige(avant(e.nom, entrees[e.d].nom) < 0, 'arbre : ' + entrees[e.d].nom + ' à droite de ' + e.nom); exige(!(e.couleur === 0 && entrees[e.d].couleur === 0), 'deux rouges de suite'); }
      descendre(e.g, profondeur + 1); freres.push(e); descendre(e.d, profondeur + 1); };
    descendre(parent.enfant, 0);
    if (parent.enfant !== AUCUN) exige(entrees[parent.enfant].couleur === 1, 'la tête de l\'arbre de ' + parent.nom + ' n\'est pas noire');
    for (let k = 1; k < freres.length; k++) exige(avant(freres[k - 1].nom, freres[k].nom) < 0, 'frères mal rangés : ' + freres[k - 1].nom + ', ' + freres[k].nom);
    freres.forEach(e => { const ch = prefixe + e.nom; chemins.set(ch, e); if (e.type === 1) parcourir(e, ch + '/'); }); };
  parcourir(racine, '');
  entrees.forEach(e => { if (e.type !== 0) exige(vues.has(e.id), 'entrée ' + e.nom + ' hors de l\'arbre'); });
  // la mini-FAT, le mini-flux, puis chaque flux
  const miniFat = [];
  if (u32(64)) { const t = lireChaine(chaine(u32(60), 'mini-FAT')), dv = new DataView(t.buffer); for (let i = 0; i < t.length; i += 4) miniFat.push(dv.getUint32(i, true)); }
  exige(u32(64) === miniFat.length / 128 && (u32(64) ? true : u32(60) === FIN), 'nombre de secteurs de mini-FAT');
  const miniFlux = racine.debut === FIN ? new Uint8Array(0) : lireChaine(chaine(racine.debut, 'mini-flux'));
  exige(racine.taille % 64 === 0 && racine.taille <= miniFlux.length, 'taille du mini-flux ' + racine.taille);
  const miniPris = new Set(), flux = new Map();
  for (const [ch, e] of chemins) { if (e.type !== 2) continue;
    if (e.taille < 4096) { const r = []; let n = 0;
      for (let s = e.taille ? e.debut : FIN; s !== FIN; s = miniFat[s]) { if (s >= miniFat.length || n++ > miniFat.length) throw new Error('chaîne mini de ' + ch);
        exige(!miniPris.has(s), 'mini-secteur ' + s + ' pris deux fois'); miniPris.add(s); r.push(...miniFlux.subarray(64 * s, 64 * s + 64)); }
      exige(r.length === Math.ceil(e.taille / 64) * 64, 'longueur de la chaîne mini de ' + ch); flux.set(ch, Uint8Array.from(r.slice(0, e.taille))); }
    else { const c = chaine(e.debut, ch); exige(c.length === Math.ceil(e.taille / 512), 'longueur de la chaîne de ' + ch); flux.set(ch, lireChaine(c).subarray(0, e.taille)); } }
  miniFat.forEach((x, s) => exige(miniPris.has(s) || x === LIBRE, 'mini-secteur ' + s + ' ni pris ni libre'));
  exige(miniPris.size * 64 === racine.taille, 'mini-flux : ' + miniPris.size + ' mini-secteurs pris pour ' + racine.taille + ' octets');
  for (let s = 0; s < nSecteurs; s++) exige(pris.has(s) || fat[s] === LIBRE, 'secteur ' + s + ' ni pris ni libre');
  return { entrees, flux, defauts, chemins };
}

/* ---- le flux dir, enregistrement par enregistrement (§ 2.3.4.2) ------------- */
const NOMS_ENR = { 0x01: 'PROJECTSYSKIND', 0x4A: 'PROJECTCOMPATVERSION', 0x02: 'PROJECTLCID', 0x14: 'PROJECTLCIDINVOKE', 0x03: 'PROJECTCODEPAGE', 0x04: 'PROJECTNAME',
  0x05: 'PROJECTDOCSTRING', 0x06: 'PROJECTHELPFILEPATH', 0x07: 'PROJECTHELPCONTEXT', 0x08: 'PROJECTLIBFLAGS', 0x09: 'PROJECTVERSION', 0x0C: 'PROJECTCONSTANTS',
  0x16: 'REFERENCENAME', 0x0D: 'REFERENCEREGISTERED', 0x0F: 'PROJECTMODULES', 0x13: 'PROJECTCOOKIE', 0x19: 'MODULENAME', 0x47: 'MODULENAMEUNICODE',
  0x1A: 'MODULESTREAMNAME', 0x1C: 'MODULEDOCSTRING', 0x31: 'MODULEOFFSET', 0x1E: 'MODULEHELPCONTEXT', 0x2C: 'MODULECOOKIE', 0x21: 'MODULETYPE', 0x22: 'MODULETYPE',
  0x2B: 'fin de MODULE', 0x10: 'fin du flux dir' };
/* Lit le flux dir décompressé en une liste d'enregistrements { id, nom, … } ; lève sur un identifiant inconnu. */
function lireDir(d) {
  const v = new DataView(d.buffer, d.byteOffset, d.byteLength), r = []; let i = 0;
  const u16 = () => { const x = v.getUint16(i, true); i += 2; return x; }, u32 = () => { const x = v.getUint32(i, true); i += 4; return x; };
  const oct = n => { const x = d.subarray(i, i + n); if (x.length !== n) throw new Error('dir tronqué'); i += n; return x; };
  while (i < d.length) {
    const id = u16(), e = { id, nom: NOMS_ENR[id] };
    if (!e.nom) throw new Error('dir : identifiant inconnu 0x' + id.toString(16) + ' à l\'octet ' + (i - 2));
    if ([0x01, 0x4A, 0x02, 0x14, 0x07, 0x08, 0x31, 0x1E].includes(id)) { e.taille = u32(); e.valeur = u32(); }
    else if ([0x03, 0x0F, 0x13, 0x2C].includes(id)) { e.taille = u32(); e.valeur = u16(); }
    else if ([0x04, 0x19, 0x47].includes(id)) { e.taille = u32(); e.octets = oct(e.taille); }
    else if ([0x05, 0x06, 0x0C, 0x16, 0x1A, 0x1C].includes(id)) { e.taille = u32(); e.octets = oct(e.taille); e.reserve = u16(); e.taille2 = u32(); e.octets2 = oct(e.taille2); }
    else if (id === 0x09) { e.reserve = u32(); e.majeure = u32(); e.mineure = u16(); }
    else if (id === 0x0D) { e.taille = u32(); const n = u32(); e.libid = latin1(oct(n)); e.reserve1 = u32(); e.reserve2 = u16(); e.tailleLue = 4 + n + 6; }
    else { e.reserve = u32(); }
    r.push(e);
    if (id === 0x10) break;
  }
  return { enregistrements: r, reste: d.length - i };
}

/* ---- le déchiffrement des états du projet (§ 2.4.3.3) ----------------------- */
function dechiffrer(texteHex) {
  const o = texteHex.match(/../g).map(x => parseInt(x, 16)), graine = o[0], version = graine ^ o[1], cle = graine ^ o[2];
  let clair1 = cle, chiffre1 = o[2], chiffre2 = o[1], i = 3; const ignores = [];
  const lire = () => { const c = o[i++], x = (c ^ ((chiffre2 + clair1) & 0xFF)) & 0xFF; chiffre2 = chiffre1; chiffre1 = c; clair1 = x; return x; };
  for (let k = 0; k < (graine & 6) / 2; k++) ignores.push(lire());
  let longueur = 0; for (let k = 0; k < 4; k++) longueur += lire() * 256 ** k;
  const donnees = []; while (i < o.length) donnees.push(lire());
  return { graine, version, cle, ignores, longueur, donnees };
}
const cleDeLId = id => [...id].reduce((s, c) => (s + c.charCodeAt(0)) & 0xFF, 0);

/* ---- le XML : bien formé (balises équilibrées, entités connues), sans plus ---- */
function xmlBienForme(t) {
  if (!t.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')) return 'déclaration XML';
  const pile = [], re = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+="[^"<]*")*)\s*(\/?)>|<\?xml[^>]*\?>|([^<]+)/gy; let m, fin = 0;
  while ((m = re.exec(t))) { fin = re.lastIndex;
    if (m[5] !== undefined) { if (/&(?!(amp|lt|gt|quot|apos|#\d+);)/.test(m[5])) return 'entité inconnue'; continue; }
    if (!m[2]) continue;
    if (m[1]) { if (pile.pop() !== m[2]) return 'balise fermante </' + m[2] + '>'; }
    else if (!m[4]) pile.push(m[2]); }
  return fin !== t.length ? 'caractère inattendu à ' + fin : pile.length ? 'non fermée : ' + pile.join(' ') : null;
}
/* Les éléments <balise …> d'un texte XML, chacun en { attribut: valeur } (quel que soit l'ordre des attributs). */
const elements = (t, balise) => [...t.matchAll(new RegExp('<' + balise + '\\b([^>]*?)/?>', 'g'))].map(m => {
  const a = {}; for (const x of m[1].matchAll(/([\w:]+)="([^"]*)"/g)) a[x[1]] = x[2]; return a; });
const premier = (t, balise) => elements(t, balise)[0] || {};

/* =============================================================================
   LE CONTRÔLE D'UN CLASSEUR : parties (Map nom → octets) → [{ nom, ok, mesure }]
   ============================================================================= */
function controler(parties) {
  const res = [], verif = (nom, cond, mesure) => { res.push({ nom, ok: !!cond, mesure }); return !!cond; };
  const texte = n => parties.has(n) ? Buffer.from(parties.get(n)).toString('utf8') : '';
  // --- OOXML
  const ATTENDUES = ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/worksheets/sheet1.xml',
    'xl/worksheets/_rels/sheet1.xml.rels', 'xl/drawings/drawing1.xml', 'xl/styles.xml', 'xl/sharedStrings.xml', 'xl/vbaProject.bin'];
  verif('les parties du classeur : les dix attendues, aucune autre', egaux([...parties.keys()].sort(), [...ATTENDUES].sort()), [...parties.keys()].join(' '));
  const malFormes = [...parties.keys()].filter(n => /\.(xml|rels)$/.test(n)).map(n => [n, xmlBienForme(texte(n))]).filter(x => x[1]);
  verif('chaque partie XML est bien formée (UTF-8, déclaration, balises, entités)', !malFormes.length, malFormes.map(x => x.join(' : ')).join(' ; '));
  const types = texte('[Content_Types].xml'), defaut = e => (elements(types, 'Default').find(a => a.Extension === e) || {}).ContentType,
    surcharge = p => (elements(types, 'Override').find(a => a.PartName === p) || {}).ContentType;
  verif('[Content_Types] : le classeur est un classeur À MACROS (application/vnd.ms-excel.sheet.macroEnabled.main+xml)', surcharge('/xl/workbook.xml') === 'application/vnd.ms-excel.sheet.macroEnabled.main+xml', surcharge('/xl/workbook.xml'));
  verif('[Content_Types] : .bin est un projet VBA (application/vnd.ms-office.vbaProject)', defaut('bin') === 'application/vnd.ms-office.vbaProject', defaut('bin'));
  const sansType = [...parties.keys()].filter(n => n !== '[Content_Types].xml' && !surcharge('/' + n) && !defaut(n.split('.').pop()));
  const fantomes = elements(types, 'Override').map(a => (a.PartName || '').slice(1)).filter(n => !parties.has(n));
  verif('[Content_Types] : chaque partie a son type, chaque type sa partie', !sansType.length && !fantomes.length, [...sansType, ...fantomes].join(' '));
  const rel = (n, type) => { const a = elements(texte(n), 'Relationship').find(x => x.Type === type); return a ? { id: a.Id, cible: a.Target } : null; };
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
  verif('_rels/.rels : le document principal est xl/workbook.xml', (rel('_rels/.rels', R + 'officeDocument') || {}).cible === 'xl/workbook.xml');
  const rv = rel('xl/_rels/workbook.xml.rels', 'http://schemas.microsoft.com/office/2006/relationships/vbaProject');
  verif('xl/_rels/workbook.xml.rels : la relation vbaProject vise vbaProject.bin', rv && rv.cible === 'vbaProject.bin', rv && rv.cible);
  const cibles = ['worksheet', 'styles', 'sharedStrings'].map(t => rel('xl/_rels/workbook.xml.rels', R + t));
  verif('xl/_rels/workbook.xml.rels : feuille, styles, textes partagés, et leurs cibles existent', cibles.every(c => c && parties.has('xl/' + c.cible)), cibles.map(c => c && c.cible).join(' '));
  const wb = texte('xl/workbook.xml');
  verif('workbook.xml : codeName="ThisWorkbook", le module de document du classeur', premier(wb, 'workbookPr').codeName === 'ThisWorkbook', premier(wb, 'workbookPr').codeName);
  const feuilles = elements(wb, 'sheet');
  verif('workbook.xml : une seule feuille, « Accueil », reliée à sheet1.xml', feuilles.length === 1 && feuilles[0].name === 'Accueil' && cibles[0] && feuilles[0]['r:id'] === cibles[0].id && cibles[0].cible === 'worksheets/sheet1.xml', feuilles.map(f => f.name).join(' '));
  const ws = texte('xl/worksheets/sheet1.xml');
  verif('sheet1.xml : codeName="Feuil1", le module de document de la feuille', premier(ws, 'sheetPr').codeName === 'Feuil1', premier(ws, 'sheetPr').codeName);
  const ORDRE = ['sheetPr', 'dimension', 'sheetViews', 'sheetFormatPr', 'cols', 'sheetData', 'sheetCalcPr', 'sheetProtection', 'protectedRanges', 'scenarios', 'autoFilter',
    'sortState', 'dataConsolidate', 'customSheetViews', 'mergeCells', 'phoneticPr', 'conditionalFormatting', 'dataValidations', 'hyperlinks', 'printOptions', 'pageMargins',
    'pageSetup', 'headerFooter', 'rowBreaks', 'colBreaks', 'customProperties', 'cellWatches', 'ignoredErrors', 'smartTags', 'drawing', 'legacyDrawing'];
  const corps = ws.replace(/^[\s\S]*?<worksheet[^>]*>/, '').replace(/<\/worksheet>\s*$/, ''), enfants = []; let prof = 0;
  for (const m of corps.matchAll(/<(\/?)([\w:]+)[^>]*?(\/?)>/g)) { if (m[1]) prof--; else { if (prof === 0) enfants.push(m[2]); if (!m[3]) prof++; } }
  const rangs = enfants.map(e => ORDRE.indexOf(e));
  verif('sheet1.xml : ses éléments dans l\'ordre du schéma (CT_Worksheet)', rangs.every((r, i) => r >= 0 && (i === 0 || r > rangs[i - 1])), enfants.join(' '));
  const rd = rel('xl/worksheets/_rels/sheet1.xml.rels', R + 'drawing');
  verif('la feuille porte un dessin (drawing1.xml)', rd && rd.cible === '../drawings/drawing1.xml' && premier(ws, 'drawing')['r:id'] === rd.id && parties.has('xl/drawings/drawing1.xml'));
  const dessin = texte('xl/drawings/drawing1.xml'), formes = elements(dessin, 'xdr:sp'), macros = [...dessin.matchAll(/\smacro="([^"]*)"/g)].map(m => m[1]);
  const textesFormes = [...dessin.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => m[1]), ancres = [...dessin.matchAll(/<xdr:from><xdr:col>\d+<\/xdr:col><xdr:colOff>\d+<\/xdr:colOff><xdr:row>(\d+)<\/xdr:row>[\s\S]*?<xdr:to><xdr:col>\d+<\/xdr:col><xdr:colOff>\d+<\/xdr:colOff><xdr:row>(\d+)<\/xdr:row>/g)].map(m => [+m[1], +m[2]]);
  verif('le dessin : trois formes ancrées, « 1. TESTER SEE », « 2. SEE DESSINE », « 3. SEE FERMÉ »', formes.length === 3 && (dessin.match(/<xdr:twoCellAnchor>/g) || []).length === 3
    && egaux(textesFormes, BOUTONS_ATTENDUS.map(b => b[1])), formes.length + ' forme(s) : ' + textesFormes.join(', '));
  verif('les formes sont affectées aux macros [0]!TesterSEE, [0]!EssaiDessinReel, [0]!EssaiSansFenetre, comme Excel l\'écrit', egaux(macros, BOUTONS_ATTENDUS.map(b => '[0]!' + b[0])), macros.join(' '));
  const partage = [...texte('xl/sharedStrings.xml').matchAll(/<t>([^<]*)<\/t>/g)].map(m => m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'));
  const cellule = r => { const m = new RegExp('<c r="B' + r + '"[^>]*t="s"><v>(\\d+)</v></c>').exec(ws); return m ? partage[+m[1]] : ''; };
  const etapes = [5, 12, 24].map(cellule);
  verif('la feuille Accueil : un titre, puis trois étapes (projet d\'essai ouvert et bouton vert 1 ; « BRAVO » et bouton bleu 2, sinon SEE fermé et bouton orange 3 ; la photo de Resultat_Test, pas de fichier à renvoyer)',
    /^Pilote SEE/.test(cellule(2)) && etapes.every((c, i) => c.startsWith('ÉTAPE ' + (i + 1) + '.')) && /SEE.*projet d'essai/.test(etapes[0]) && /bouton vert 1/.test(cellule(6))
      && /BRAVO.*bouton bleu 2.*OK/.test(etapes[1]) && /^Sinon.*ferme SEE.*bouton orange 3/.test(cellule(18))
      && /photo.*Resultat_Test/.test(etapes[2]) && /photos/.test(cellule(25)) && !/Ctrl\+S|renvoie-le/.test(etapes.join(' ') + cellule(25)),
    [...etapes, cellule(18)].map(c => c.slice(0, 24)).join(' | '));
  // chaque bouton couvre des lignes vides de la feuille, sous la consigne de son étape et au-dessus de la suivante
  const sousEtape = [[5, 12], [12, 18], [18, 24]], lignesTexte = new Set([...ws.matchAll(/<c r="B(\d+)"/g)].map(m => +m[1]));
  verif('chaque bouton sur des lignes vides, entre la consigne de son étape et la suivante (ancres de ligne 0 : la ligne r est r-1)',
    ancres.length === 3 && ancres.every(([de, a], k) => de + 1 > sousEtape[k][0] && a < sousEtape[k][1] && a > de
      && Array.from({ length: a - de }, (_, i) => de + 1 + i).every(r => !lignesTexte.has(r))), ancres.map(x => x.join('-')).join(' '));
  verif('en petit, dans l\'ordre des barres d\'Office : MODE PROTÉGÉ (Activer la modification), Activer le contenu, la barre rouge (Propriétés, Débloquer), Alt+F8 (TesterSEE, EssaiDessinReel, EssaiSansFenetre, Exécuter), puis Excel bloqué (action OLE, Ctrl+Maj+Échap, Fin de tâche)',
    [27, 28, 29, 30, 31, 32, 33].map(cellule).join(' ').match(/MODE PROTÉGÉ.*Activer la modification.*Activer le contenu.*bloqué l'exécution des macros.*Propriétés.*Débloquer.*Alt\+F8.*TesterSEE.*EssaiDessinReel.*EssaiSansFenetre.*Exécuter.*action OLE.*Ctrl\+Maj\+Échap.*Fin de tâche/) !== null);
  // --- le fichier composé
  if (!parties.has('xl/vbaProject.bin')) return res;
  let cfb = null, erreurCfb = ''; try { cfb = lireCfb(parties.get('xl/vbaProject.bin')); } catch (e) { erreurCfb = e.message; }
  verif('le fichier composé : en-tête, DIFAT, FAT, chaînes, répertoire, mini-FAT conformes à [MS-CFB]', cfb && !cfb.defauts.length, cfb ? cfb.defauts.slice(0, 4).join(' ; ') : erreurCfb);
  if (!cfb) return res;
  const arbre = cfb.defauts.filter(t => /arbre|rangés|rouge|tête/.test(t));
  verif('le répertoire : chaque stockage tient ses frères en arbre de recherche rangé (§ 2.6.4), tête noire, jamais deux rouges', !arbre.length, arbre.join(' ; '));
  const F = cfb.flux, attendus = ['PROJECT', 'PROJECTwm', 'VBA/_VBA_PROJECT', 'VBA/dir', ...MODULES.map(m => 'VBA/' + m.nom)];
  verif('les flux : PROJECT, PROJECTwm, VBA/_VBA_PROJECT, VBA/dir et un par module, aucun autre', egaux([...F.keys()].sort(), attendus.sort()), [...F.keys()].join(' '));
  const vp = F.get('VBA/_VBA_PROJECT') || [];
  verif('VBA/_VBA_PROJECT : 61CC, Version 0xFFFF, 00, 0x0001, sans cache (§ 2.3.4.1 : Office recompile depuis le texte)', egaux([...vp], [0xCC, 0x61, 0xFF, 0xFF, 0x00, 0x01, 0x00]), hex(vp));
  // --- dir
  let dir; try { dir = lireDir(decompresserTest(F.get('VBA/dir'))); } catch (e) { verif('VBA/dir se décompresse et se lit', false, e.message); return res; }
  const E = dir.enregistrements, ids = E.map(e => e.id);
  const ATTENDU = [0x01, 0x02, 0x14, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0C, 0x16, 0x0D, 0x16, 0x0D, 0x0F, 0x13,
    ...MODULES.flatMap(m => [0x19, 0x47, 0x1A, 0x1C, 0x31, 0x1E, 0x2C, m.document ? 0x22 : 0x21, 0x2B]), 0x10];
  verif(`VBA/dir : ${ATTENDU.length} enregistrements, dans l'ordre de § 2.3.4.2, et rien après la fin`, egaux(ids, ATTENDU) && dir.reste === 0,
    ids.length + ' lus' + (dir.reste ? ', ' + dir.reste + ' octets après la fin' : ''));
  const un = id => E.find(e => e.id === id) || {};
  const utf16 = s => [...Buffer.from(s, 'utf16le')], ascii = s => [...Buffer.from(s, 'latin1')];
  const vides = [[0x05, 0x40], [0x06, 0x3D], [0x0C, 0x3C]].every(([id, r]) => { const e = un(id); return e.taille === 0 && e.reserve === r && e.taille2 === 0; });
  const infos = [[0x01, 4, 1, 'Win32'], [0x02, 4, 0x409, 'LCID'], [0x14, 4, 0x409, 'LCIDINVOKE'], [0x03, 2, 1252, 'page de code'], [0x07, 4, 0, 'HELPCONTEXT'], [0x08, 4, 0, 'LIBFLAGS']]
    .filter(([id, taille, valeur]) => un(id).taille !== taille || un(id).valeur !== valeur).map(x => x[3]);
  verif('PROJECTINFORMATION : Win32, LCID et LCIDINVOKE 0x409 (§ 2.3.4.2.1.3), page de code 1252, aide 0, LIBFLAGS 0', !infos.length, infos.join(' '));
  verif('PROJECTNAME « VBAProject », DOCSTRING, HELPFILEPATH, CONSTANTS vides (réservés 0x40, 0x3D, 0x3C), PROJECTVERSION (réservé 4)',
    egaux([...(un(0x04).octets || [])], ascii('VBAProject')) && vides && un(0x09).reserve === 4);
  const refs = E.filter(e => e.id === 0x16).map((n, k) => ({ n, r: E.filter(e => e.id === 0x0D)[k] }));
  const LIBID = /^\*\\G\{[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}\}#[0-9A-Fa-f]{1,4}\.[0-9A-Fa-f]{1,4}#[0-9A-Fa-f]{1,8}#[^#]*#[^#]*$/;
  verif('références : stdole (OLE Automation) puis Office, nom en Windows-1252 et UTF-16, Libid conforme (§ 2.1.1.8), tailles et réservés justes',
    refs.length === 2 && refs.every(({ n, r }, k) => latin1(n.octets) === ['stdole', 'Office'][k] && egaux([...n.octets2], utf16(['stdole', 'Office'][k])) && n.reserve === 0x3E
      && LIBID.test(r.libid) && r.taille === r.tailleLue && r.reserve1 === 0 && r.reserve2 === 0)
    && refs[0].r.libid.startsWith('*\\G{00020430-0000-0000-C000-000000000046}#2.0#') && refs[1].r.libid.startsWith('*\\G{2DF8D04C-5BFA-101B-BDE5-00AA0044DE52}#2.0#'),
    refs.map(x => x.r && x.r.libid.slice(0, 44)).join(' ; '));
  verif(`PROJECTMODULES : ${MODULES.length} modules, PROJECTCOOKIE 0xFFFF (§ 2.3.4.2.3.1 : « on write »)`, un(0x0F).valeur === MODULES.length && un(0x0F).taille === 2 && un(0x13).valeur === 0xFFFF);
  const blocs = []; let k = E.findIndex(e => e.id === 0x19); while (k >= 0 && E[k].id === 0x19) { blocs.push(E.slice(k, k + 9)); k += 9; }
  const modulesLus = blocs.map(b => ({ nom: latin1(b[0].octets), b }));
  const fautesModules = [];
  MODULES.forEach((m, i) => { const b = (modulesLus[i] || {}).b; if (!b) { fautesModules.push(m.nom + ' absent'); return; }
    const ok1 = latin1(b[0].octets) === m.nom && egaux([...b[1].octets], utf16(m.nom)) && latin1(b[2].octets) === m.nom && b[2].reserve === 0x32 && egaux([...b[2].octets2], utf16(m.nom))
      && b[3].taille === 0 && b[3].reserve === 0x48 && b[3].taille2 === 0 && b[4].taille === 4 && b[5].valeur === 0 && b[6].valeur === 0xFFFF && b[7].reserve === 0 && b[8].reserve === 0;
    if (!ok1) fautesModules.push(m.nom); });
  verif('chaque MODULE : nom (Windows-1252 et UTF-16), flux du même nom, sans description, aide 0, cookie 0xFFFF', !fautesModules.length, fautesModules.join(' '));
  const typesFaux = MODULES.filter((m, i) => !modulesLus[i] || modulesLus[i].b[7].id !== (m.document ? 0x22 : 0x21)).map(m => m.nom);
  verif('MODULETYPE : ThisWorkbook et Feuil1 modules de document (0x22), SEE_Commun, SEE_Sonde, SEE_Pilote modules standard (0x21)', !typesFaux.length, typesFaux.join(' '));
  // --- le texte des modules
  const textesLus = {};
  MODULES.forEach((m, i) => { const b = (modulesLus[i] || {}).b, brut = F.get('VBA/' + m.nom) || new Uint8Array(0);
    let lu = null, err = ''; try { lu = decompresserTest(brut.subarray(b ? b[4].valeur : 0)); textesLus[m.nom] = latin1(lu); } catch (e) { err = e.message; }
    const attendu = TEXTE_ATTENDU[m.nom];
    verif(`le texte de ${m.nom} : MODULEOFFSET 0, décompressé, identique OCTET POUR OCTET ${m.document ? 'au module vide qu\'Excel écrit' : 'à ' + m.nom + '.bas'}`,
      lu && b && b[4].valeur === 0 && lu.length === attendu.length && egaux([...lu], [...attendu]), err || (lu ? lu.length + ' / ' + attendu.length + ' octets' : '')); });
  // --- PROJECT
  const P = latin1(F.get('PROJECT')), L = P.split('\r\n');
  const idP = (/^ID="(\{[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}\})"$/.exec(L[0]) || [])[1];
  const lignesModules = MODULES.map(m => m.document ? `Document=${m.nom}/&H00000000` : `Module=${m.nom}`), n = MODULES.length;
  const hexa = (l, cle, min, max) => { const r = new RegExp('^' + cle + '="([0-9A-F]+)"$').exec(l || ''); return r && r[1].length >= min && r[1].length <= max && r[1].length % 2 === 0 ? r[1] : null; };
  const [cmg, dpb, gc] = [hexa(L[n + 4], 'CMG', 22, 28), hexa(L[n + 5], 'DPB', 16, 2000), hexa(L[n + 6], 'GC', 16, 22)];
  verif('PROJECT : ID, un Document= ou Module= par module, Name, HelpContextID, VersionCompatible32, CMG, DPB, GC, [Host Extender Info], [Workspace] (§ 2.3.1)',
    idP && egaux(L.slice(1, n + 1), lignesModules) && L[n + 1] === 'Name="VBAProject"' && L[n + 2] === 'HelpContextID="0"' && L[n + 3] === 'VersionCompatible32="393222000"'
      && cmg && dpb && gc && L[n + 7] === '' && L[n + 8] === '[Host Extender Info]' && L[n + 9] === '&H00000001={3832D640-CF90-11CF-8E43-00A0C911005A};VBE;&H00000000'
      && L[n + 10] === '' && L[n + 11] === '[Workspace]' && egaux(L.slice(n + 12, 2 * n + 12), MODULES.map(m => m.nom + '=0, 0, 0, 0, C')) && L.length === 2 * n + 13 && L[2 * n + 12] === '',
    L.length + ' lignes');
  if (cmg && dpb && gc && idP) {
    const [c, p, g] = [cmg, dpb, gc].map(dechiffrer), cle = cleDeLId(idP);
    verif('CMG, DPB, GC déchiffrés (§ 2.4.3.3) : version 2, clé = somme des octets de l\'ID', [c, p, g].every(x => x.version === 2 && x.cle === cle && x.longueur === x.donnees.length));
    verif('CMG : protection 0x00000000 (ni l\'utilisateur, ni Excel, ni l\'éditeur ne protègent le projet)', c.longueur === 4 && egaux(c.donnees, [0, 0, 0, 0]), hex(c.donnees));
    verif('DPB : pas de mot de passe (un octet 0x00, § 2.3.1.16) ; GC : projet visible (0xFF, § 2.3.1.17)', p.longueur === 1 && p.donnees[0] === 0 && g.longueur === 1 && g.donnees[0] === 0xFF, hex(p.donnees) + ' / ' + hex(g.donnees));
  } else verif('CMG, DPB, GC se déchiffrent', false);
  // --- PROJECTwm
  const wm = F.get('PROJECTwm'), noms = []; let q = 0;
  try { while (q < wm.length - 2) { const a = wm.indexOf(0, q); const nomA = latin1(wm.subarray(q, a)); q = a + 1; let b = q; while (wm[b] || wm[b + 1]) b += 2;
      if (Buffer.from(wm.subarray(q, b)).toString('utf16le') !== nomA) throw new Error('UTF-16 de ' + nomA); noms.push(nomA); q = b + 2; } } catch (e) { noms.push('!' + e.message); }
  verif('PROJECTwm : les noms en Windows-1252 et en UTF-16, dans l\'ordre de PROJECTMODULES, puis 0x0000 (§ 2.3.3)', egaux(noms, MODULES.map(m => m.nom)) && q === wm.length - 2 && wm[q] === 0 && wm[q + 1] === 0, noms.join(' '));
  // --- la macro du bouton, et rien qui se lance seul
  // (le texte relu DANS le projet, pas celui des .bas)
  const lancees = macros.map(m => m.replace(/^\[0\]!/, '')), sources = MODULES.filter(m => !m.document).map(m => textesLus[m.nom] || '');
  const absentes = lancees.filter(macro => !sources.some(s => new RegExp('^[ \\t]*(Public[ \\t]+)?Sub[ \\t]+' + macro + '[ \\t]*\\([ \\t]*\\)', 'mi').test(s)));
  verif(`le bouton lance une macro qui existe, chaque bouton : « Public Sub ${lancees.join('() », « Public Sub ')}() », sans argument, dans un module standard`,
    lancees.length > 0 && !absentes.length, absentes.length ? absentes.join(', ') + ' : dans aucun module de see/vba' : '');
  const sansCode = ['ThisWorkbook', 'Feuil1'].every(n => textesLus[n] !== undefined && textesLus[n].split('\r\n').every(l => l === '' || l.startsWith('Attribute ')));
  verif('rien ne se lance à l\'ouverture : ThisWorkbook et Feuil1 sans code, aucun Auto_Open ni Workbook_Open', sansCode
    && !Object.values(textesLus).some(s => /^[ \t]*(Public[ \t]+|Private[ \t]+)?Sub[ \t]+(Auto_Open|Workbook_Open|Auto_Exec)\b/mi.test(s)));
  return res;
}

/* =============================================================================
   LES CONTRÔLES
   ============================================================================= */
titre('Le classeur écrit (see/classeur.js, modules de ' + path.relative(RACINE, DOSSIER) + ')');
// sansBouton : le classeur s'écrit même si TesterSEE manque encore, pour que tout le reste soit relu ; son absence fait
// alors échouer « le bouton lance une macro qui existe », et le refus par défaut est contrôlé plus bas
const c1 = C.classeurPilote({ dossierVba: DOSSIER, sansBouton: true }), c2 = C.classeurPilote({ dossierVba: DOSSIER, sansBouton: true });
ok('la sortie est déterministe : deux écritures, les mêmes octets', egaux([...c1.octets], [...c2.octets]), c1.octets.length + ' octets');
let parties;
try { const z = lireZip(c1.octets); parties = new Map(z.map(p => [p.nom, p.octets]));
  ok('le zip se relit : en-têtes locaux et centraux, tailles, CRC ; [Content_Types].xml en premier', z[0].nom === '[Content_Types].xml', z.length + ' parties'); }
catch (e) { ok('le zip se relit', false, e.message); parties = new Map(); }
const resultats = controler(parties);
resultats.forEach(r => ok(r.nom, r.ok, r.mesure));
const macroLue = resultats.find(r => r.nom.startsWith('le bouton lance une macro qui existe')).ok;
let refus = ''; try { C.classeurPilote({ dossierVba: DOSSIER }); } catch (e) { refus = e.message; }
ok('sans --sans-bouton, le générateur REFUSE ces modules si la macro d\'un bouton manque, et seulement alors',
  !!refus === !macroLue && (!refus || refus.includes('TesterSEE')), refus.slice(0, 90));
ok('avec --sans-bouton, il le dit en avertissement, et seulement alors', (c1.avertissements.length > 0) === !macroLue, c1.avertissements.join(' ; ').slice(0, 90));

titre('Un second lecteur du fichier composé : SheetJS (XLSX.CFB)');
try { const cfb = lireCfb(parties.get('xl/vbaProject.bin')), s = XLSX.CFB.read(Buffer.from(parties.get('xl/vbaProject.bin')), { type: 'buffer' });
  const chemins = s.FullPaths.map((p, i) => [p.replace(/^Root Entry\//, ''), s.FileIndex[i]]).filter(([, f]) => f.type === 2);
  ok('SheetJS lit les mêmes flux, aux mêmes octets', chemins.length === cfb.flux.size && chemins.every(([p, f]) => cfb.flux.has(p) && egaux([...f.content], [...cfb.flux.get(p)])), chemins.length + ' flux'); }
catch (e) { ok('SheetJS lit le fichier composé', false, e.message); }

titre('La compression [MS-OVBA] § 2.4.1');
const octetsDe = s => Uint8Array.from(Buffer.from(s, 'latin1'));
const EXEMPLES = [
  ['§ 3.2.1, sans compression', 'abcdefghijklmnopqrstuv.', '01 19 B0 00 61 62 63 64 65 66 67 68 00 69 6A 6B 6C 6D 6E 6F 70 00 71 72 73 74 75 76 2E'],
  ['§ 3.2.2, compression normale', '#aaabcdefaaaaghijaaaaaklaaamnopqaaaaaaaaaaaarstuvwxyzaaa',
    '01 2F B0 00 23 61 61 61 62 63 64 65 82 66 00 70 61 67 68 69 6A 01 38 08 61 6B 6C 00 20 6D 6E 6F 70 06 71 02 70 04 00 72 73 74 75 76 10 77 78 79 7A 00 2C'],
  ['§ 3.2.3, compression maximale', 'a'.repeat(73), '01 03 B0 02 61 45 00'],
];
EXEMPLES.forEach(([nom, clair, attendu]) => { const c = C.compresser(octetsDe(clair));
  ok(`l'exemple ${nom} : compressé au bit près, et relu`, hex(c) === attendu && latin1(decompresserTest(Uint8Array.from(attendu.split(' '), x => parseInt(x, 16)))) === clair, hex(c).slice(0, 47)); });
let graine = 12345; const hasard = n => Uint8Array.from({ length: n }, () => (graine = (Math.imul(graine, 1103515245) + 12345) >>> 0) >>> 24);
const texteVBA = n => octetsDe(Array.from({ length: n }, (_, i) => '    If x' + (i % 7) + ' > 0 Then Journal "étape", "x", ' + i + '\r\n').join('')).subarray(0, n);
const ALLER_RETOUR = [['vide', new Uint8Array(0)], ['1 octet', octetsDe('A')], ['4 096 octets de texte', texteVBA(4096)], ['4 097 octets de texte', texteVBA(4097)],
  ['10 000 « a »', octetsDe('a'.repeat(10000))], ['« abc » répété (15 000 octets)', octetsDe('abc'.repeat(5000))], ['8 192 octets au hasard', hasard(8192)],
  ['10 000 octets au hasard', hasard(10000)], ['texte de 70 000 octets', texteVBA(70000)], ['SEE_Pilote.bas', TEXTE_ATTENDU.SEE_Pilote]];
ALLER_RETOUR.forEach(([nom, o]) => { const c = C.compresser(o); let d = null, e = ''; try { d = decompresserTest(c); } catch (x) { e = x.message; }
  const morceaux = Math.ceil(o.length / 4096), maxi = 1 + morceaux * 4098;
  ok(`aller-retour : ${nom}`, d && egaux([...d], [...o]) && c.length <= maxi, e || `${o.length} → ${c.length} octets`); });
const court = hasard(4000), cc = C.compresser(court), dc = decompresserTest(cc);
ok('4 000 octets au hasard : un morceau brut, complété de zéros comme le dit § 2.4.1.3.10 (le générateur le refuse pour un module)',
  cc.length === 1 + 4098 && cc[1] === 0xFF && cc[2] === 0x3F && egaux([...dc.subarray(0, 4000)], [...court]) && dc.length === 4096 && dc.subarray(4000).every(x => x === 0), cc.length + ' octets');

titre('Le chiffrement des états du projet [MS-OVBA] § 2.4.3');
const VECTEURS = [
  ['l\'exemple de § 3.1.6', '{917DED54-440B-4FD1-A5C1-74ACF261E600}', '0705D8E3D8EDDBF1DBF1DBF1DBF1', '0E0CD1ECDFF4E7F5E7F5E7', '1517CAF1D6F9D7F9D706'],
  ['un projet écrit par Excel 2007 (XlsxWriter, macro01.xlsm)', '{5890DC02-A2E6-42E1-A051-700029FB26BD}', 'DDDF6944971F9B1F9B1F9B1F9B', 'B4B600BD009501950195', '8B893FEA17EB17EBE8'],
];
VECTEURS.forEach(([nom, id, cmg, dpb, gc]) => { const [c, p, g] = [cmg, dpb, gc].map(dechiffrer);
  const rechiffre = [[c, cmg], [p, dpb], [g, gc]].every(([x, h]) => C.chiffrer(x.donnees, id, x.graine, x.ignores) === h);
  ok(`${nom} : non protégé, sans mot de passe, visible ; rechiffré au caractère près`, [c, p, g].every(x => x.version === 2 && x.cle === cleDeLId(id))
    && egaux(c.donnees, [0, 0, 0, 0]) && egaux(p.donnees, [0]) && egaux(g.donnees, [0xFF]) && rechiffre, `clé ${cleDeLId(id).toString(16).toUpperCase()}`); });

titre('Le refus : pas de classeur ni de kit sans la macro du bouton');
/* Deux copies des .bas, dans le dossier temporaire du système : SANS (toute « Sub TesterSEE » renommée) et AVEC (une
   TesterSEE vide ajoutée à SEE_Sonde si aucun module n'en a encore). Elles ne servent qu'au générateur : rien n'y est
   compilé ni exécuté. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'classeur-'));
const macroDans = t => /^[ \t]*(Public[ \t]+)?Sub[ \t]+TesterSEE[ \t]*\([ \t]*\)/mi.test(t);
const copieVba = (nom, retouche) => { const d = path.join(TMP, nom); fs.mkdirSync(d);
  const textes = C.MODULES_STANDARD.map(m => [m, fs.readFileSync(path.join(DOSSIER, m + '.bas')).toString('latin1')]);
  retouche(textes).forEach(([m, t]) => fs.writeFileSync(path.join(d, m + '.bas'), Buffer.from(t, 'latin1'))); return d; };
const SANS = copieVba('sans', ts => ts.map(([m, t]) => [m, t.replace(/^([ \t]*(?:Public[ \t]+)?Sub[ \t]+)TesterSEE\b/gmi, '$1TesterSEE_Retiree')]));
const AVEC = copieVba('avec', ts => ts.some(([, t]) => macroDans(t)) ? ts
  : ts.map(([m, t]) => [m, m === 'SEE_Sonde' ? t + '\r\nPublic Sub TesterSEE()\r\nEnd Sub\r\n' : t]));
const leve = f => { try { f(); return ''; } catch (e) { return (e && e.message) || String(e); } };
const lance = (script, args, env) => spawnSync(process.execPath, [path.join(RACINE, 'see', script), ...args], { encoding: 'utf8', cwd: TMP, env: { ...process.env, ...env } });
const K = require(path.join(RACINE, 'see', 'kit.js'));
try {
  const e1 = leve(() => C.classeurPilote({ dossierVba: SANS }));
  ok('classeurPilote, sans TesterSEE : exception qui nomme la macro et le recours --sans-bouton', /TesterSEE/.test(e1) && /--sans-bouton/.test(e1), e1.slice(0, 80));
  const SANS3 = copieVba('sans3', ts => ts.map(([m, t]) => [m, t.replace(/^([ \t]*(?:Public[ \t]+)?Sub[ \t]+)EssaiSansFenetre\b/gmi, '$1EssaiSansFenetre_Retiree')]));
  const e4 = leve(() => C.classeurPilote({ dossierVba: SANS3 }));
  ok('classeurPilote, sans EssaiSansFenetre (le bouton 3) : exception qui nomme la macro et le bouton « 3. SEE FERMÉ »', /EssaiSansFenetre/.test(e4) && /3\. SEE FERMÉ/.test(e4), e4.slice(0, 80));
  const s1 = C.classeurPilote({ dossierVba: SANS, sansBouton: true }), a1 = C.classeurPilote({ dossierVba: AVEC });
  ok('… avec sansBouton il s\'écrit et le dit ; avec TesterSEE il s\'écrit sans rien dire', s1.octets.length > 0 && s1.avertissements.length === 1 && a1.avertissements.length === 0);
  const e2 = leve(() => K.kit({ dossierVba: SANS }));
  ok('kit(), sans TesterSEE : exception, pas de zip', /TesterSEE/.test(e2), e2.slice(0, 80));
  const r1 = lance('kit.js', ['--vba=' + SANS, '--sortie=k1.zip']), r2 = lance('classeur.js', ['--sortie=c1.xlsm'], { VBA_DOSSIER: SANS });
  ok('node see/kit.js, sans TesterSEE : code de sortie 1, l\'erreur sur la sortie d\'erreur, AUCUN zip écrit',
    r1.status === 1 && /Erreur : .*TesterSEE/.test(r1.stderr) && !fs.existsSync(path.join(TMP, 'k1.zip')), `code ${r1.status}`);
  ok('node see/classeur.js, sans TesterSEE : code de sortie 1, AUCUN classeur écrit',
    r2.status === 1 && /Erreur : .*TesterSEE/.test(r2.stderr) && !fs.existsSync(path.join(TMP, 'c1.xlsm')), `code ${r2.status}`);
  const r3 = lance('kit.js', ['--vba=' + SANS, '--sans-bouton', '--sortie=k3.zip']), r4 = lance('kit.js', ['--vba=' + AVEC, '--sortie=k4.zip']);
  ok('node see/kit.js --sans-bouton : le zip s\'écrit, code 0, AVERTISSEMENT « ne doit pas partir au bureau »',
    r3.status === 0 && fs.existsSync(path.join(TMP, 'k3.zip')) && /AVERTISSEMENT.*NE DOIT PAS PARTIR AU BUREAU/.test(r3.stderr), `code ${r3.status}`);
  ok('node see/kit.js, avec TesterSEE : le zip s\'écrit, code 0, aucun avertissement',
    r4.status === 0 && fs.existsSync(path.join(TMP, 'k4.zip')) && !/AVERTISSEMENT/.test(r4.stderr), `code ${r4.status}${r4.stderr ? ' ; ' + r4.stderr.trim().slice(0, 80) : ''}`);
  fs.writeFileSync(path.join(AVEC, 'SEE_Autre.bas'), 'Attribute VB_Name = "SEE_Autre"\r\nPublic Sub TesterSEE()\r\nEnd Sub\r\n');
  const e3 = leve(() => C.classeurPilote({ dossierVba: AVEC }));
  fs.unlinkSync(path.join(AVEC, 'SEE_Autre.bas'));
  ok('un .bas de plus dans le dossier (SEE_Autre.bas, que le classeur ne lit pas) : refusé, et nommé', /SEE_Autre\.bas/.test(e3) && /MODULES_STANDARD/.test(e3), e3.slice(0, 80));
} catch (e) { ok('le refus s\'éprouve', false, e.message); }

titre('Le kit (see/kit.js), écrit avec les .bas qui ont TesterSEE');
try { const k = K.kit({ dossierVba: AVEC }), z = lireZip(k.zip), ref = C.classeurPilote({ dossierVba: AVEC });
  ok('Pilote-SEE.xlsm en tête du zip, identique au classeur écrit par see/classeur.js', z[0].nom === 'Kit-SEE/Pilote-SEE.xlsm' && egaux([...z[0].octets], [...ref.octets]), z.map(p => p.nom.replace('Kit-SEE/', '')).slice(0, 3).join(', ') + '…');
  ok('le kit : DEUX fichiers, le classeur puis le LIS-MOI, octet pour octet (ce qui sert ce jour-là, rien de plus)',
    K.CONTENU.every(([nom, src]) => { const p = z.find(x => x.nom === 'Kit-SEE/' + nom); return p && egaux([...p.octets], [...fs.readFileSync(path.join(RACINE, src))]); })
    && z.length === 2 && z[1].nom === 'Kit-SEE/LIS-MOI-D-ABORD.txt', z.map(p => p.nom).join(', '));
  const lis = fs.readFileSync(path.join(RACINE, 'see', 'kit', 'LIS-MOI-D-ABORD.txt')), t = lis.subarray(3).toString('utf8');
  ok('LIS-MOI-D-ABORD.txt : UTF-8 avec BOM, fins de ligne CRLF seulement', lis[0] === 0xEF && lis[1] === 0xBB && lis[2] === 0xBF && !/\r(?!\n)|(?<!\r)\n/.test(t) && !t.includes('�'));
  ok('LIS-MOI-D-ABORD.txt : débloquer le zip, le projet d\'essai vide dans le dossier « Robot » du Bureau (nom sans espace), MODE PROTÉGÉ (Activer la modification), Activer le contenu, « 1. TESTER SEE », la photo de Resultat_Test, « BRAVO », « 2. SEE DESSINE », OK, puis le bouton 3 pas à pas (File > Exit, « 3. SEE FERMÉ », le projet choisi, OK, la copie de sécurité)',
    /Débloquer[\s\S]*Extraire tout[\s\S]*projet d'essai VIDE[\s\S]*Robot \(sans espace\)[\s\S]*SANS espace[\s\S]*dossier « Robot »[\s\S]*Pilote-SEE\.xlsm[\s\S]*MODE PROTÉGÉ[\s\S]*Activer la modification[\s\S]*Activer le contenu[\s\S]*1\. TESTER SEE[\s\S]*photo[\s\S]*Resultat_Test[\s\S]*BRAVO[\s\S]*Essaie le bouton 3[\s\S]*2\. SEE DESSINE[\s\S]*clique sur OK[\s\S]*File, puis Exit[\s\S]*3\. SEE FERMÉ[\s\S]*Choisis ton projet d'ESSAI[\s\S]*clique sur OK[\s\S]*Et maintenant[\s\S]*avant-pilote/i.test(t));
  ok('LIS-MOI-D-ABORD.txt : rien que des photos (pas de fichier à renvoyer, ni Ctrl+S, ni zip à envoyer), et « LES PHOTOS À PRENDRE » pour chaque bouton',
    /Pas besoin de m'envoyer le fichier Excel/.test(t) && !/Ctrl\+S|Envoyer vers|Dossier compressé|Envoie-moi ce zip/i.test(t)
      && /LES PHOTOS À PRENDRE[\s\S]*bouton 1[\s\S]*Resultat_Test[\s\S]*bouton 2[\s\S]*bouton 3[\s\S]*Resultat_Test/.test(t));
  ok('LIS-MOI-D-ABORD.txt : « SI EXCEL RESTE BLOQUÉ » (action OLE : attendre 2 minutes, Ctrl + Maj + Échap, SEE, Fin de tâche)',
    /SI EXCEL RESTE BLOQUÉ[\s\S]*action OLE[\s\S]*2 minutes[\s\S]*Ctrl \+ Maj \+ Échap[\s\S]*SEE[\s\S]*Fin de tâche/.test(t));
  ok('LIS-MOI-D-ABORD.txt : les textes des boutons sont ceux du classeur', C.BOUTONS.every(b => t.includes('« ' + b.texte + ' »')));
  ok('le kit passe par courriel : aucun fichier d\'un type que la messagerie refuse, même zippé (.cmd, .ps1, .js...)',
    z.every(p => !K.REFUSES_PAR_COURRIEL.test(p.nom)) && K.REFUSES_PAR_COURRIEL.test('a/diagnostic.ps1') && K.REFUSES_PAR_COURRIEL.test('x.CMD'), z.filter(p => K.REFUSES_PAR_COURRIEL.test(p.nom)).map(p => p.nom).join(', '));
  const bloque = t.slice(t.indexOf('SI ÇA BLOQUE'));
  ok('LIS-MOI-D-ABORD.txt, « Le bouton ne fait rien » : d\'abord la barre jaune qui reste (Activer la modification ou le contenu), puis Alt+F8 et les trois macros',
    /Le bouton ne fait rien[\s\S]*barre jaune[\s\S]*Activer la modification[\s\S]*Activer le contenu[\s\S]*Alt\+F8[\s\S]*TesterSEE[\s\S]*EssaiDessinReel[\s\S]*EssaiSansFenetre/.test(bloque));
  ok('le kit porte les quatre modules standard du classeur, SEE_Windows compris', ref.modules.filter(m => !m.document).map(m => m.nom).join(',') === 'SEE_Commun,SEE_Sonde,SEE_Pilote,SEE_Windows'
    && egaux([...z[0].octets], [...ref.octets]), ref.modules.map(m => m.nom).join(', ')); }
catch (e) { ok('le kit s\'écrit', false, e.message); }

titre('Le contrôleur éprouvé : des fautes injectées une à une');
const vba0 = parties.get('xl/vbaProject.bin'), flux0 = C.projetVBA(C.lireModules(DOSSIER).modules).flux;
const avecVba = flux => { const p = new Map(parties); p.set('xl/vbaProject.bin', C.fichierCompose(flux)); return p; };
const avecFlux = (chemin, octets) => { const f = { ...flux0, VBA: { ...flux0.VBA } }; if (chemin.startsWith('VBA/')) f.VBA[chemin.slice(4)] = octets; else f[chemin] = octets; return avecVba(f); };
const avecTexte = (nom, a, b) => { const p = new Map(parties), t = Buffer.from(p.get(nom)).toString('utf8'); if (!t.includes(a)) return null; p.set(nom, new Uint8Array(Buffer.from(t.replace(a, b), 'utf8'))); return p; };
const modulesMut = C.lireModules(DOSSIER).modules;
const MUTATIONS = [
  ['un octet du texte de SEE_Sonde changé', 'le texte de SEE_Sonde', (() => { const t = Uint8Array.from(modulesMut.find(m => m.nom === 'SEE_Sonde').texte); t[5000] ^= 0x20; return avecFlux('VBA/SEE_Sonde', C.compresser(t)); })()],
  ['un module de document qui contient du code', 'le texte de ThisWorkbook', avecFlux('VBA/ThisWorkbook', C.compresser(Buffer.concat([TEXTE_ATTENDU.ThisWorkbook, Buffer.from('Private Sub Workbook_Open()\r\nEnd Sub\r\n')])))],
  ['_VBA_PROJECT avec une version d\'Office (0x00B5)', 'VBA/_VBA_PROJECT', avecFlux('VBA/_VBA_PROJECT', Uint8Array.from([0xCC, 0x61, 0xB5, 0x00, 0x00, 0x01, 0x00]))],
  ['SEE_Commun déclaré module de document', 'MODULETYPE', avecFlux('VBA/dir', C.compresser(C.fluxDir(modulesMut.map(m => m.nom === 'SEE_Commun' ? { ...m, document: true } : m))))],
  ['PROJECTwm dans un autre ordre', 'PROJECTwm', avecFlux('PROJECTwm', C.fluxProjectWm([...modulesMut].reverse()))],
  ['LCID 0x040C (§ 2.3.4.2.1.3 exige 0x409)', 'PROJECTINFORMATION', (() => { const d = C.fluxDir(modulesMut); d[16] = 0x0C; return avecFlux('VBA/dir', C.compresser(d)); })()],
  ['un projet protégé (CMG à 1)', 'CMG : protection', (() => { const t = latin1(flux0.PROJECT), id = /ID="([^"]+)"/.exec(t)[1], cmg = /CMG="([^"]+)"/.exec(t)[1];
    return avecFlux('PROJECT', Uint8Array.from(Buffer.from(t.replace(cmg, C.chiffrer([1, 0, 0, 0], id, 0x55, [1, 2, 3])), 'latin1'))); })()],
  ['un flux en trop dans VBA', 'les flux :', avecVba({ ...flux0, VBA: { ...flux0.VBA, __SRP_0: new Uint8Array(10) } })],
  ['deux frères échangés dans l\'arbre du répertoire', 'le répertoire : chaque stockage', (() => { const o = Uint8Array.from(vba0), v = new DataView(o.buffer), rep = 512 * (1 + v.getUint32(48, true));
    for (let i = 0; rep + 128 * i < o.length && i < 64; i++) { const b = rep + 128 * i, g = v.getUint32(b + 68, true), d = v.getUint32(b + 72, true);   // le répertoire est d'un seul tenant (classeur.js)
      if (g !== AUCUN && d !== AUCUN) { v.setUint32(b + 68, d, true); v.setUint32(b + 72, g, true); break; } }
    const p = new Map(parties); p.set('xl/vbaProject.bin', o); return p; })()],
  ['un secteur de flux marqué libre dans la FAT', 'le fichier composé :', (() => { const o = Uint8Array.from(vba0), v = new DataView(o.buffer), fat = 512 * (1 + v.getUint32(76, true));
    const dernier = (o.length - 512) / 512 - 1; v.setUint32(fat + 4 * dernier, LIBRE, true); const p = new Map(parties); p.set('xl/vbaProject.bin', o); return p; })()],
  ['le classeur déclaré sans macros', '[Content_Types] : le classeur est un classeur À MACROS', avecTexte('[Content_Types].xml', 'application/vnd.ms-excel.sheet.macroEnabled.main+xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml')],
  ['la relation vers vbaProject.bin perdue', 'xl/_rels/workbook.xml.rels : la relation vbaProject', avecTexte('xl/_rels/workbook.xml.rels', 'office/2006/relationships/vbaProject', 'office/2006/relationships/autre')],
  ['le codeName de la feuille qui ne répond à aucun module', 'sheet1.xml : codeName', avecTexte('xl/worksheets/sheet1.xml', 'codeName="Feuil1"', 'codeName="Feuil2"')],
  ['le bouton 1 affecté à une autre macro', 'les formes sont affectées', avecTexte('xl/drawings/drawing1.xml', 'macro="[0]!TesterSEE"', 'macro="[0]!Autre"')],
  ['le bouton 2 affecté à une macro qui n\'existe pas', 'le bouton lance une macro qui existe', avecTexte('xl/drawings/drawing1.xml', 'macro="[0]!EssaiDessinReel"', 'macro="[0]!EssaiDessinFantome"')],
  ['le bouton 2 posé sur la consigne de l\'étape 2', 'chaque bouton sur des lignes vides', avecTexte('xl/drawings/drawing1.xml', '<xdr:row>13</xdr:row>', '<xdr:row>11</xdr:row>')],
  ['le bouton 3 affecté à une macro qui n\'existe pas', 'le bouton lance une macro qui existe', avecTexte('xl/drawings/drawing1.xml', 'macro="[0]!EssaiSansFenetre"', 'macro="[0]!EssaiSansSEE"')],
  ['le bouton 3 posé sur la consigne « Sinon »', 'chaque bouton sur des lignes vides', avecTexte('xl/drawings/drawing1.xml', '<xdr:row>19</xdr:row>', '<xdr:row>17</xdr:row>')],
  ['le bouton 3 retiré du dessin', 'le dessin : trois formes ancrées', (() => { const p = new Map(parties), t = Buffer.from(p.get('xl/drawings/drawing1.xml')).toString('utf8');
    const i = t.lastIndexOf('<xdr:twoCellAnchor>'), j = t.lastIndexOf('</xdr:twoCellAnchor>') + '</xdr:twoCellAnchor>'.length;
    p.set('xl/drawings/drawing1.xml', new Uint8Array(Buffer.from(t.slice(0, i) + t.slice(j), 'utf8'))); return p; })()],
  ['la consigne « Excel bloqué » effacée de la feuille', 'en petit, dans l\'ordre des barres', avecTexte('xl/sharedStrings.xml', 'Fin de tâche', 'Fermer')],
  ['le recours du mode protégé effacé de la feuille', 'en petit, dans l\'ordre des barres', avecTexte('xl/sharedStrings.xml', '« MODE PROTÉGÉ »', '« MODE NORMAL »')],
  ['une balise mal fermée', 'chaque partie XML est bien formée', avecTexte('xl/styles.xml', '</fonts>', '</font>')],
  ['les éléments de la feuille dans le désordre', 'sheet1.xml : ses éléments', (() => { const p = new Map(parties), t = Buffer.from(p.get('xl/worksheets/sheet1.xml')).toString('utf8'), m = /<pageMargins[^>]*\/>/.exec(t);
    p.set('xl/worksheets/sheet1.xml', new Uint8Array(Buffer.from(t.replace(m[0], '').replace('<sheetData>', m[0] + '<sheetData>'), 'utf8'))); return p; })()],
];
let attrapees = 0;
for (const [nom, attendu, mut] of MUTATIONS) {
  const avantMut = resultats.find(r => r.nom.startsWith(attendu));
  if (!mut || !avantMut) { ok(`la faute « ${nom} » se pose et vise un contrôle existant`, false, attendu); continue; }
  const r = controler(mut), cible = r.find(x => x.nom.startsWith(attendu));
  if (cible && !cible.ok && avantMut.ok) attrapees++;
  else ok(`la faute « ${nom} » est attrapée par « ${attendu} »`, false, !avantMut.ok ? 'contrôle déjà en échec sans la faute' : cible ? 'non vue' : 'contrôle introuvable');
}
ok(`le contrôleur attrape les ${MUTATIONS.length} fautes injectées une à une`, attrapees === MUTATIONS.length, `${attrapees} / ${MUTATIONS.length}`);

fs.rmSync(TMP, { recursive: true, force: true });
console.log('\n  ' + (total - echecs) + ' / ' + total + ' contrôles passés' + (echecs ? '  —  ' + echecs + ' ÉCHEC(S)' : '  —  tout est vert'));
process.exit(echecs ? 1 : 0);
