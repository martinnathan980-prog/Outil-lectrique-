/* ===========================================================================
   LE CLASSEUR PILOTE TOUT PRÊT — Pilote-SEE.xlsm, les macros déjà dedans
   ---------------------------------------------------------------------------
       node see/classeur.js [--sortie=Pilote-SEE.xlsm] [--sans-bouton]

   Au bureau, le technicien n'a qu'UN fichier à ouvrir : « Activer le
   contenu », puis UN gros bouton « TESTER SEE ». Ni éditeur VBA ni import de
   .bas. Ce fichier écrit ce classeur à partir des modules see/vba/*.bas tels
   qu'ils sont au moment où on le lance (VBA_DOSSIER=… pour en prendre
   d'autres). Il REFUSE (code de sortie 1, rien d'écrit) si la macro du
   bouton, TesterSEE, n'est dans aucun module, ou si le dossier a un .bas
   qu'il ne lit pas ; --sans-bouton écrit quand même un classeur dont le
   bouton ne lance rien, pour un essai ici, jamais pour le bureau.

   LE PROJET VBA (xl/vbaProject.bin), construit selon [MS-OVBA] (Office VBA File
   Format Structure) dans un fichier composé [MS-CFB] version 3 (secteurs de
   512 octets, mini-flux de 64) :
     PROJECT            le texte du projet (§ 2.3.1) : ID, un Document= ou un
                        Module= par module, Name, HelpContextID,
                        VersionCompatible32, puis CMG / DPB / GC d'un projet
                        SANS mot de passe et visible, chiffrés comme le dit
                        § 2.4.3, [Host Extender Info], [Workspace]
     PROJECTwm          les noms des modules en Windows-1252 puis en UTF-16 (§ 2.3.3)
     VBA/_VBA_PROJECT   sept octets CC 61 FF FF 00 01 00 (§ 2.3.4.1 : Version
                        « MUST be 0xFFFF on write », PerformanceCache « MUST NOT
                        be present on write ») : aucun p-code, Office recompile
                        le projet depuis le texte des modules
     VBA/dir            compressé (§ 2.4.1), tous les enregistrements dans
                        l'ordre de § 2.3.4.2 : informations du projet (Win32,
                        LCID 0x409 — § 2.3.4.2.1.3 : « MUST be 0x00000409 » —,
                        page de code 1252, nom, version), références (stdole et
                        Office, comme Excel les écrit), modules (MODULEOFFSET 0,
                        cookies 0xFFFF « on write »)
     VBA/<module>       le texte du module, compressé, sans cache (§ 2.3.4.3)
   Les modules : ThisWorkbook et Feuil1, modules de DOCUMENT (VB_Base des
   classes Workbook et Worksheet d'Excel, le texte qu'Excel écrit pour un
   module vide), puis SEE_Commun, SEE_Sonde, SEE_Pilote, modules STANDARD :
   leur texte EXACT, octet pour octet (Windows-1252, CRLF, lignes Attribute
   comprises). Les choix (références, ordre, valeurs) sont ceux des
   vbaProject.bin écrits par Excel 2007 et 2010, comparés enregistrement par
   enregistrement (see/LISEZMOI.md, « Le classeur pilote tout prêt »).

   LE CLASSEUR (OOXML « macroEnabled ») : une feuille « Accueil » (codeName
   Feuil1, celui du module de document) avec les consignes, et un gros bouton
   vert : une forme DrawingML dont l'attribut macro="[0]!TesterSEE" est ce
   qu'Excel écrit pour une forme affectée à une macro du classeur. RIEN ne
   s'exécute à l'ouverture (ni Workbook_Open, ni Auto_Open : le générateur le
   refuse).

   Le zip est « stocké » (zipDe, src/08-dxf.js), daté du 1er janvier 1980
   comme ceux d'Excel : mêmes modules, mêmes octets.

   Vérifié par tests/classeur.js (relecture complète, sans dépendance), et une
   fois par oletools (olevba) et LibreOffice (see/LISEZMOI.md). PAS par Excel :
   il ne tourne pas ici.
   ========================================================================= */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const RACINE = path.join(__dirname, '..');

const MODULES_STANDARD = ['SEE_Commun', 'SEE_Sonde', 'SEE_Pilote'];
const MACRO_DU_BOUTON = 'TesterSEE';
const FEUILLE = { nom: 'Accueil', codeName: 'Feuil1' };
const CLASSEUR = 'ThisWorkbook';
const NOM_PROJET = 'VBAProject';
/* VB_Base des modules de document : les classes Workbook et Worksheet d'Excel ([MS-OVBA] § 3.1.3 et 3.1.4). */
const BASE_CLASSEUR = '0{00020819-0000-0000-C000-000000000046}', BASE_FEUILLE = '0{00020820-0000-0000-C000-000000000046}';
/* Les deux références qu'Excel met à tout projet neuf, mot pour mot comme dans ses vbaProject.bin (Excel 2007) : OLE
   Automation (stdole) et la bibliothèque Office. Le chemin n'est qu'une indication : VBA cherche une bibliothèque
   inscrite par son GUID et sa version (non vérifié ici ; c'est ce qui laisse un classeur d'Excel 2007, qui écrit ces
   mêmes lignes, s'ouvrir dans les Excel suivants). Les modules ne se servent d'aucune des deux, mais un projet d'Excel
   les a toujours. */
const REFERENCES = [
  ['stdole', '*\\G{00020430-0000-0000-C000-000000000046}#2.0#0#C:\\WINDOWS\\system32\\stdole2.tlb#OLE Automation'],
  ['Office', '*\\G{2DF8D04C-5BFA-101B-BDE5-00AA0044DE52}#2.0#0#C:\\Program Files\\Common Files\\Microsoft Shared\\OFFICE12\\MSO.DLL#Microsoft Office 12.0 Object Library'],
];
/* PROJECTVERSION : une valeur libre ; celle de l'exemple de [MS-OVBA] § 3.1.2.1. */
const VERSION_PROJET = { majeure: 0x49B5196B, mineure: 0x0006 };

/* ---- les octets --------------------------------------------------------- */
/* Un écrivain d'octets en petit-boutiste. */
class Octets {
  constructor() { this.t = new Uint8Array(1024); this.n = 0; }
  place(k) { if (this.n + k > this.t.length) { const t = new Uint8Array(Math.max(this.t.length * 2, this.n + k)); t.set(this.t.subarray(0, this.n)); this.t = t; } }
  u8(v) { this.place(1); this.t[this.n++] = v & 0xFF; return this; }
  u16(v) { return this.u8(v).u8(v >>> 8); }
  u32(v) { return this.u16(v & 0xFFFF).u16(v >>> 16); }
  octets(o) { this.place(o.length); this.t.set(o, this.n); this.n += o.length; return this; }
  fin() { return this.t.slice(0, this.n); }
}
/* Windows-1252 : les 32 octets 0x80–0x9F ont leurs propres caractères ; cinq n'en ont aucun. */
const CP1252_HAUT = '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008DŽ\u008F\u0090‘’“”•–—˜™š›œ\u009DžŸ';
const INDEFINIS_1252 = new Set([0x81, 0x8D, 0x8F, 0x90, 0x9D]);
function octetsCp1252(texte) { return Uint8Array.from(texte, c => { const x = c.charCodeAt(0);
  if (x < 0x80 || (x >= 0xA0 && x <= 0xFF)) return x; const k = CP1252_HAUT.indexOf(c);
  if (k < 0 || INDEFINIS_1252.has(0x80 + k)) throw new Error('caractère hors de Windows-1252 : ' + JSON.stringify(c)); return 0x80 + k; }); }
const utf16 = texte => { const o = new Uint8Array(texte.length * 2); for (let i = 0; i < texte.length; i++) { const x = texte.charCodeAt(i); o[2 * i] = x & 0xFF; o[2 * i + 1] = x >>> 8; } return o; };
const ascii = texte => Uint8Array.from(texte, c => { const x = c.charCodeAt(0); if (x > 0x7E) throw new Error('non ASCII : ' + texte); return x; });

/* ---- 1. la compression [MS-OVBA] § 2.4.1 --------------------------------
   L'algorithme de la spécification, à la lettre (§ 2.4.1.3.6 à 2.4.1.3.19.4) : morceaux de 4 096 octets, huit jetons par
   octet de drapeaux, la plus longue correspondance dans le morceau et, à longueur égale, la plus proche. La recherche
   ne parcourt que les positions qui commencent par les trois mêmes octets (une correspondance utile en a au moins
   trois) : le résultat est le même que la recherche exhaustive du § 2.4.1.3.19.4, octet pour octet. */
function bitsDuDecalage(ecart) { let b = 0; while ((1 << b) < ecart) b++; return Math.max(b, 4); }   // CopyToken Help
function compresser(source) {
  const n = source.length, sortie = new Uint8Array(1 + (Math.ceil(n / 4096) + 1) * 4098);
  const tete = new Int32Array(1 << 15), precedent = new Int32Array(4096);
  const cle = p => (Math.imul((source[p] << 16) | (source[p + 1] << 8) | source[p + 2], 0x9E3779B1) >>> 17);
  sortie[0] = 0x01;                                                     // SignatureByte
  let cc = 1, dc = 0;
  while (dc < n) {                                                      // un DecompressedChunk à la fois
    const debutC = cc, debutD = dc, finC = debutC + 4098, finD = Math.min(debutD + 4096, n);
    tete.fill(-1); let inscrit = debutD;
    cc = debutC + 2;
    while (dc < finD && cc < finC) {                                    // une TokenSequence
      const iDrapeaux = cc++; let drapeaux = 0;
      for (let i = 0; i < 8; i++) {
        if (!(dc < finD && cc < finC)) continue;
        while (inscrit < dc) { if (inscrit + 2 < finD) { const h = cle(inscrit); precedent[inscrit - debutD] = tete[h]; tete[h] = inscrit; } inscrit++; }
        let meilleure = 0, candidat = -1;                               // Matching
        if (dc + 2 < finD) for (let c = tete[cle(dc)]; c >= 0; c = precedent[c - debutD]) {
          let l = 0; while (dc + l < finD && source[c + l] === source[dc + l]) l++;
          if (l > meilleure) { meilleure = l; candidat = c; } }
        if (meilleure >= 3) {
          const bits = bitsDuDecalage(dc - debutD), longueur = Math.min(meilleure, (0xFFFF >>> bits) + 3), decalage = dc - candidat;
          if (cc + 1 < finC) { const jeton = ((decalage - 1) << (16 - bits)) | (longueur - 3);
            sortie[cc] = jeton & 0xFF; sortie[cc + 1] = jeton >>> 8; drapeaux |= 1 << i; cc += 2; dc += longueur; }
          else cc = finC;
        } else if (cc < finC) sortie[cc++] = source[dc++];
        else cc = finC;
      }
      sortie[iDrapeaux] = drapeaux;
    }
    let compresse = 1;
    if (dc < finD) {                                                    // RawChunk : 4 096 octets tels quels, complétés de zéros
      cc = debutC + 2; sortie.fill(0, cc, cc + 4096); sortie.set(source.subarray(debutD, finD), cc); cc += 4096; dc = finD; compresse = 0; }
    const entete = ((cc - debutC - 3) & 0x0FFF) | 0x3000 | (compresse << 15);
    sortie[debutC] = entete & 0xFF; sortie[debutC + 1] = entete >>> 8;
  }
  return sortie.slice(0, cc);
}
/* La décompression (§ 2.4.1.3.1 à 2.4.1.3.5), pour se relire avant d'écrire. tests/classeur.js a la sienne, écrite à part. */
function decompresser(c) {
  if (c[0] !== 0x01) throw new Error('compression : signature ' + c[0]);
  let out = new Uint8Array(Math.max(4096, c.length * 4)), n = 0, cc = 1;
  const place = k => { if (n + k > out.length) { const t = new Uint8Array(Math.max(out.length * 2, n + k)); t.set(out.subarray(0, n)); out = t; } };
  while (cc < c.length) {
    const debutC = cc, entete = c[cc] | (c[cc + 1] << 8), debutD = n, finC = Math.min(c.length, debutC + (entete & 0x0FFF) + 3);
    if (((entete >>> 12) & 7) !== 3) throw new Error('compression : en-tête de morceau ' + entete.toString(16));
    cc = debutC + 2;
    if (entete & 0x8000) while (cc < finC) { const drapeaux = c[cc++];
      for (let i = 0; i < 8 && cc < finC; i++) {
        if (!((drapeaux >>> i) & 1)) { place(1); out[n++] = c[cc++]; continue; }
        const jeton = c[cc] | (c[cc + 1] << 8), bits = bitsDuDecalage(n - debutD), longueur = (jeton & (0xFFFF >>> bits)) + 3, source = n - ((jeton >>> (16 - bits)) + 1);
        if (source < debutD) throw new Error('compression : copie hors du morceau');
        place(longueur); for (let k = 0; k < longueur; k++) out[n + k] = out[source + k]; n += longueur; cc += 2; } }
    else { place(4096); out.set(c.subarray(cc, cc + 4096), n); n += 4096; cc += 4096; }
  }
  return out.slice(0, n);
}
/* Compresse et se relit : le texte d'un module ne doit pas finir dans un morceau brut complété de zéros (§ 2.4.1.3.10). */
function compresseSur(octets, quoi) { const c = compresser(octets), d = decompresser(c);
  if (d.length !== octets.length || d.some((x, i) => x !== octets[i])) throw new Error('compression : ' + quoi + ' ne se relit pas à l\'identique');
  return c; }

/* ---- 2. le chiffrement des états du projet [MS-OVBA] § 2.4.3.2 ------------
   CMG (protection : quatre octets à zéro), DPB (pas de mot de passe : un octet 0x00, longueur 1), GC (visible : un octet
   0xFF, longueur 1). ProjKey : la somme des octets du texte de l'ID du projet (accolades comprises). La graine et les
   octets ignorés sont libres (« any value ») : ils sont tirés de l'empreinte des modules, pour une sortie déterministe. */
function chiffrer(donnees, idProjet, graine, ignores) {
  let cleProjet = 0; for (const c of idProjet) cleProjet = (cleProjet + c.charCodeAt(0)) & 0xFF;
  const versionC = graine ^ 2, cleC = graine ^ cleProjet, sortie = [graine, versionC, cleC];
  let clair1 = cleProjet, chiffre1 = cleC, chiffre2 = versionC;
  const pousser = octet => { const c = (octet ^ ((chiffre2 + clair1) & 0xFF)) & 0xFF; sortie.push(c); chiffre2 = chiffre1; chiffre1 = c; clair1 = octet; };
  for (let k = 0; k < (graine & 6) / 2; k++) pousser(ignores[k] & 0xFF);
  for (let k = 0; k < 4; k++) pousser((donnees.length >>> (8 * k)) & 0xFF);
  donnees.forEach(pousser);
  return sortie.map(x => x.toString(16).toUpperCase().padStart(2, '0')).join('');
}

/* ---- 3. les flux du projet [MS-OVBA] § 2.3 ------------------------------ */
/* VBA/dir, décompressé (§ 2.3.4.2) : PROJECTINFORMATION, PROJECTREFERENCES, PROJECTMODULES, puis 0x0010 et quatre zéros. */
function fluxDir(modules) {
  const o = new Octets(), nom = ascii(NOM_PROJET);
  const avecUnicode = (id, octets, reserve, unicode) => o.u16(id).u32(octets.length).octets(octets).u16(reserve).u32(unicode.length).octets(unicode);
  o.u16(0x0001).u32(4).u32(0x00000001);                   // PROJECTSYSKIND : Windows 32 bits
  o.u16(0x0002).u32(4).u32(0x00000409);                   // PROJECTLCID (MUST be 0x409)
  o.u16(0x0014).u32(4).u32(0x00000409);                   // PROJECTLCIDINVOKE (MUST be 0x409)
  o.u16(0x0003).u32(2).u16(1252);                         // PROJECTCODEPAGE : Windows-1252
  o.u16(0x0004).u32(nom.length).octets(nom);              // PROJECTNAME
  avecUnicode(0x0005, [], 0x0040, []);                    // PROJECTDOCSTRING : vide
  avecUnicode(0x0006, [], 0x003D, []);                    // PROJECTHELPFILEPATH : vide (les deux copies)
  o.u16(0x0007).u32(4).u32(0);                            // PROJECTHELPCONTEXT
  o.u16(0x0008).u32(4).u32(0);                            // PROJECTLIBFLAGS (MUST be 0)
  o.u16(0x0009).u32(4).u32(VERSION_PROJET.majeure).u16(VERSION_PROJET.mineure);   // PROJECTVERSION
  avecUnicode(0x000C, [], 0x003C, []);                    // PROJECTCONSTANTS : aucune
  REFERENCES.forEach(([nomRef, libid]) => { const n = ascii(nomRef), l = octetsCp1252(libid);
    avecUnicode(0x0016, n, 0x003E, utf16(nomRef));        // REFERENCENAME
    o.u16(0x000D).u32(4 + l.length + 6).u32(l.length).octets(l).u32(0).u16(0); });   // REFERENCEREGISTERED
  o.u16(0x000F).u32(2).u16(modules.length);               // PROJECTMODULES
  o.u16(0x0013).u32(2).u16(0xFFFF);                       // PROJECTCOOKIE (0xFFFF on write)
  modules.forEach(m => { const n = ascii(m.nom);
    o.u16(0x0019).u32(n.length).octets(n);                // MODULENAME
    o.u16(0x0047).u32(n.length * 2).octets(utf16(m.nom)); // MODULENAMEUNICODE
    avecUnicode(0x001A, n, 0x0032, utf16(m.nom));         // MODULESTREAMNAME : le flux porte le nom du module
    avecUnicode(0x001C, [], 0x0048, []);                  // MODULEDOCSTRING : vide
    o.u16(0x0031).u32(4).u32(0);                          // MODULEOFFSET : le texte commence au début du flux
    o.u16(0x001E).u32(4).u32(0);                          // MODULEHELPCONTEXT
    o.u16(0x002C).u32(2).u16(0xFFFF);                     // MODULECOOKIE (0xFFFF on write)
    o.u16(m.document ? 0x0022 : 0x0021).u32(0);           // MODULETYPE : document (0x22) ou standard (0x21)
    o.u16(0x002B).u32(0); });                             // fin du MODULE
  o.u16(0x0010).u32(0);                                   // fin du flux dir
  return o.fin();
}
/* PROJECT (§ 2.3.1), en Windows-1252, fins de ligne CRLF. Les fenêtres de l'éditeur : fermées (« 0, 0, 0, 0, C »). */
function fluxProject(modules, idProjet, sel) {
  const l = [`ID="${idProjet}"`, ...modules.map(m => m.document ? `Document=${m.nom}/&H00000000` : `Module=${m.nom}`),
    `Name="${NOM_PROJET}"`, 'HelpContextID="0"', 'VersionCompatible32="393222000"',
    `CMG="${chiffrer([0, 0, 0, 0], idProjet, sel[0], sel.slice(3))}"`,
    `DPB="${chiffrer([0x00], idProjet, sel[1], sel.slice(6))}"`,
    `GC="${chiffrer([0xFF], idProjet, sel[2], sel.slice(9))}"`,
    '', '[Host Extender Info]', '&H00000001={3832D640-CF90-11CF-8E43-00A0C911005A};VBE;&H00000000',
    '', '[Workspace]', ...modules.map(m => `${m.nom}=0, 0, 0, 0, C`)];
  return octetsCp1252(l.join('\r\n') + '\r\n');
}
/* PROJECTwm (§ 2.3.3) : pour chaque module, dans l'ordre de PROJECTMODULES, son nom terminé par 0x00, puis en UTF-16
   terminé par 0x0000 ; enfin 0x0000. */
function fluxProjectWm(modules) { const o = new Octets();
  modules.forEach(m => o.octets(ascii(m.nom)).u8(0).octets(utf16(m.nom)).u16(0)); return o.u16(0).fin(); }
/* Le texte d'un module de document vide, comme Excel l'écrit (§ 3.1.3). */
const texteDocument = (nom, base) => octetsCp1252([`Attribute VB_Name = "${nom}"`, `Attribute VB_Base = "${base}"`,
  'Attribute VB_GlobalNameSpace = False', 'Attribute VB_Creatable = False', 'Attribute VB_PredeclaredId = True',
  'Attribute VB_Exposed = True', 'Attribute VB_TemplateDerived = False', 'Attribute VB_Customizable = True', ''].join('\r\n'));

/* ---- 4. le fichier composé [MS-CFB] version 3 ----------------------------
   `racine` : { nom: octets | { …sous-stockage } }. Les flux de moins de 4 096 octets vont dans le mini-flux (secteurs de
   64 octets, mini-FAT), les autres dans des secteurs de 512. Dans l'ordre du fichier : la FAT, le répertoire, la
   mini-FAT, le mini-flux, les grands flux. Les frères d'un stockage forment un arbre binaire de recherche équilibré,
   tous ses nœuds noirs (§ 2.6.4 : « the simplest implementation … mark every node as black »), rangé par la longueur
   du nom puis par ses caractères mis en majuscules. Ni horodatage ni CLSID. */
const FINDECHAINE = 0xFFFFFFFE, LIBRE = 0xFFFFFFFF, SECTFAT = 0xFFFFFFFD, PASDEFLUX = 0xFFFFFFFF;
function avantCfb(a, b) { if (a.length !== b.length) return a.length - b.length;
  const A = a.toUpperCase(), B = b.toUpperCase(); for (let i = 0; i < A.length; i++) if (A.charCodeAt(i) !== B.charCodeAt(i)) return A.charCodeAt(i) - B.charCodeAt(i); return 0; }
function fichierCompose(racine) {
  const entrees = [{ nom: 'Root Entry', type: 5 }];
  const ranger = (parent, contenu) => { const ids = Object.keys(contenu).sort(avantCfb).map(nom => {
      if (nom.length > 31 || /[/\\:!]/.test(nom)) throw new Error('CFB : nom refusé ' + nom);
      const v = contenu[nom], e = v instanceof Uint8Array ? { nom, type: 2, octets: v } : { nom, type: 1 };
      const id = entrees.push(e) - 1; if (e.type === 1) ranger(e, v); return id; });
    for (let i = 1; i < ids.length; i++) if (avantCfb(entrees[ids[i - 1]].nom, entrees[ids[i]].nom) === 0) throw new Error('CFB : deux noms égaux');
    const arbre = (bas, haut) => { if (bas > haut) return PASDEFLUX; const m = (bas + haut) >> 1, e = entrees[ids[m]];
      e.gauche = arbre(bas, m - 1); e.droite = arbre(m + 1, haut); return ids[m]; };
    parent.enfant = arbre(0, ids.length - 1); };
  ranger(entrees[0], racine);
  const petits = entrees.filter(e => e.type === 2 && e.octets.length < 4096), grands = entrees.filter(e => e.type === 2 && e.octets.length >= 4096);
  let miniSecteurs = 0; petits.forEach(e => { e.debut = e.octets.length ? miniSecteurs : FINDECHAINE; e.nMini = Math.ceil(e.octets.length / 64); miniSecteurs += e.nMini; });
  const nRep = Math.ceil(entrees.length / 4), nMiniFat = Math.ceil(miniSecteurs / 128), nMiniFlux = Math.ceil(miniSecteurs * 64 / 512);
  const nGrands = grands.reduce((s, e) => s + Math.ceil(e.octets.length / 512), 0), autres = nRep + nMiniFat + nMiniFlux + nGrands;
  let nFat = 1; while (nFat * 128 < nFat + autres) nFat++;
  if (nFat > 109) throw new Error('CFB : fichier trop grand pour un en-tête sans DIFAT');
  const total = nFat + autres, fat = new Uint32Array(nFat * 128).fill(LIBRE);
  let s = 0; const chaine = k => { const d = s; for (let i = 0; i < k; i++, s++) fat[s] = i === k - 1 ? FINDECHAINE : s + 1; return k ? d : FINDECHAINE; };
  for (; s < nFat; s++) fat[s] = SECTFAT;
  const debutRep = chaine(nRep), debutMiniFat = chaine(nMiniFat), debutMiniFlux = chaine(nMiniFlux);
  grands.forEach(e => { e.debut = chaine(Math.ceil(e.octets.length / 512)); });
  if (s !== total) throw new Error('CFB : compte des secteurs');
  const fichier = new Uint8Array(512 * (1 + total)), v = new DataView(fichier.buffer), secteur = k => 512 * (1 + k);
  // l'en-tête (§ 2.2)
  fichier.set([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], 0);
  v.setUint16(24, 0x003E, true); v.setUint16(26, 0x0003, true); v.setUint16(28, 0xFFFE, true); v.setUint16(30, 9, true); v.setUint16(32, 6, true);
  v.setUint32(40, 0, true); v.setUint32(44, nFat, true); v.setUint32(48, debutRep, true); v.setUint32(52, 0, true); v.setUint32(56, 4096, true);
  v.setUint32(60, nMiniFat ? debutMiniFat : FINDECHAINE, true); v.setUint32(64, nMiniFat, true); v.setUint32(68, FINDECHAINE, true); v.setUint32(72, 0, true);
  for (let i = 0; i < 109; i++) v.setUint32(76 + 4 * i, i < nFat ? i : LIBRE, true);
  // la FAT
  fat.forEach((x, i) => v.setUint32(secteur(0) + 4 * i, x, true));
  // le répertoire (§ 2.6) : 128 octets par entrée, les entrées libres à zéro sauf leurs trois liens
  entrees[0].debut = nMiniFlux ? debutMiniFlux : FINDECHAINE; entrees[0].taille = miniSecteurs * 64;
  for (let i = 0; i < nRep * 4; i++) { const e = entrees[i], b = secteur(debutRep) + 128 * i;
    if (!e) { v.setUint32(b + 68, PASDEFLUX, true); v.setUint32(b + 72, PASDEFLUX, true); v.setUint32(b + 76, PASDEFLUX, true); continue; }
    fichier.set(utf16(e.nom), b); v.setUint16(b + 64, 2 * (e.nom.length + 1), true); fichier[b + 66] = e.type; fichier[b + 67] = 1;   // noir
    v.setUint32(b + 68, e.gauche == null ? PASDEFLUX : e.gauche, true); v.setUint32(b + 72, e.droite == null ? PASDEFLUX : e.droite, true);
    v.setUint32(b + 76, e.type === 2 ? PASDEFLUX : e.enfant, true);
    v.setUint32(b + 116, e.type === 1 ? 0 : e.debut, true); v.setUint32(b + 120, e.type === 5 ? e.taille : e.type === 2 ? e.octets.length : 0, true); }
  // la mini-FAT, le mini-flux, les grands flux
  const miniFat = new Uint32Array(nMiniFat * 128).fill(LIBRE);
  petits.forEach(e => { for (let i = 0; i < e.nMini; i++) miniFat[e.debut + i] = i === e.nMini - 1 ? FINDECHAINE : e.debut + i + 1;
    fichier.set(e.octets, secteur(debutMiniFlux) + 64 * (e.nMini ? e.debut : 0)); });
  miniFat.forEach((x, i) => v.setUint32(secteur(debutMiniFat) + 4 * i, x, true));
  grands.forEach(e => fichier.set(e.octets, secteur(e.debut)));
  return fichier;
}

/* ---- 5. le projet VBA ---------------------------------------------------- */
/* Les modules, lus dans `dossier` : [{ nom, document, texte (octets) }], dans l'ordre du projet. Contrôles : le fichier
   existe, commence par son Attribute VB_Name, n'a que des CRLF, que des octets de Windows-1252 ; aucune macro ne se
   lance seule à l'ouverture ; aucun autre .bas dans le dossier (il manquerait au classeur et au kit sans que rien ne
   le dise). Rend aussi `macroDuBouton` : vrai si un module standard a la macro du bouton, publique et sans argument. */
function lireModules(dossier) {
  const modules = [{ nom: CLASSEUR, document: true, texte: texteDocument(CLASSEUR, BASE_CLASSEUR) },
    { nom: FEUILLE.codeName, document: true, texte: texteDocument(FEUILLE.codeName, BASE_FEUILLE) }];
  const enTrop = fs.existsSync(dossier) ? fs.readdirSync(dossier).filter(f => /\.bas$/i.test(f) && !MODULES_STANDARD.includes(f.slice(0, -4))) : [];
  if (enTrop.length) throw new Error(`${enTrop.join(', ')} : dans ${dossier}, mais le classeur ne lit que ${MODULES_STANDARD.map(m => m + '.bas').join(', ')}`
    + ' (MODULES_STANDARD, see/classeur.js) : l\'y ajouter, sinon ce module manquerait au classeur et au kit');
  MODULES_STANDARD.forEach(nom => { const chemin = path.join(dossier, nom + '.bas');
    if (!fs.existsSync(chemin)) throw new Error('module absent : ' + chemin);
    const texte = new Uint8Array(fs.readFileSync(chemin)), t = Buffer.from(texte).toString('latin1');
    if (!t.startsWith(`Attribute VB_Name = "${nom}"\r\n`)) throw new Error(nom + '.bas ne commence pas par Attribute VB_Name = "' + nom + '" et CRLF');
    if (/\r(?!\n)|(?<!\r)\n/.test(t)) throw new Error(nom + '.bas : fin de ligne qui n\'est pas CRLF');
    const faux = texte.findIndex(x => x === 0 || INDEFINIS_1252.has(x)); if (faux >= 0) throw new Error(nom + '.bas : octet ' + texte[faux] + ' hors de Windows-1252 (position ' + faux + ')');
    if (/^\s*(Public\s+|Private\s+)?Sub\s+(Auto_Open|Workbook_Open|Auto_Exec)\b/im.test(t)) throw new Error(nom + '.bas : une macro se lancerait à l\'ouverture');
    modules.push({ nom, document: false, texte }); });
  const macro = new RegExp('^\\s*(Public\\s+)?Sub\\s+' + MACRO_DU_BOUTON + '\\s*\\(\\s*\\)', 'im');
  return { modules, macroDuBouton: modules.some(m => !m.document && macro.test(Buffer.from(m.texte).toString('latin1'))) };
}
/* xl/vbaProject.bin. L'ID du projet et les graines du chiffrement viennent de l'empreinte SHA-1 des modules : la sortie
   ne dépend que d'eux. Rend aussi les flux, pour les contrôles. */
function projetVBA(modules) {
  const h = crypto.createHash('sha1'); modules.forEach(m => h.update(m.nom).update(m.texte)); const e = h.digest();
  const x = e.toString('hex').toUpperCase(), idProjet = `{${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}}`;
  const flux = { PROJECT: fluxProject(modules, idProjet, [...e.subarray(0, 12)]), PROJECTwm: fluxProjectWm(modules),
    VBA: { _VBA_PROJECT: Uint8Array.from([0xCC, 0x61, 0xFF, 0xFF, 0x00, 0x01, 0x00]), dir: compresseSur(fluxDir(modules), 'dir') } };
  modules.forEach(m => { flux.VBA[m.nom] = compresseSur(m.texte, m.nom); });
  return { octets: fichierCompose(flux), flux, idProjet };
}

/* ---- 6. le classeur OOXML ------------------------------------------------ */
const xml = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ENTETE_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main', NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
/* La feuille Accueil : [ligne, style, texte, hauteur en points]. Styles : 1 titre, 2 sous-titre, 3 consigne, 4 petit.
   Les recours, en petit, dans l'ordre où les barres d'Office se présentent. Un fichier venu d'Internet ou d'un
   courriel (la « marque du Web ») s'ouvre d'abord en MODE PROTÉGÉ : lecture seule, macros non chargées, le bouton ne
   fait rien et Alt+F8 n'est pas offert, mais cette feuille se lit ; son bouton est « Activer la modification ». Après
   lui vient, selon le poste, la barre jaune « Activer le contenu » ou la barre rouge des macros bloquées. (Le
   comportement par défaut documenté d'Office ; pas observé ici, faute d'Excel.) */
const LIGNES = [
  [2, 1, 'Pilote SEE : le test du poste', 36],
  [3, 2, 'Fais ce test sur ton petit plan d\'essai, jamais sur un vrai projet.', 21],
  [5, 3, '1.  Dans SEE Electrical Expert, ouvre ton petit plan d\'essai.', 27],
  [6, 3, '2.  Clique sur le gros bouton vert TESTER SEE, juste en dessous.', 27],
  [7, 3, '3.  Attends le message « C\'est fini ». Ne touche à rien pendant ce temps.', 27],
  [8, 3, '4.  Enregistre ce fichier (Ctrl+S), puis renvoie-le-moi.', 27],
  [10, 0, '', 33], [11, 0, '', 33], [12, 0, '', 33],
  [14, 4, 'Si une barre jaune dit « MODE PROTÉGÉ » : clique d\'abord sur « Activer la modification », puis lis la barre qui suit.', 18],
  [15, 4, 'Si une barre jaune « Activer le contenu » est en haut de l\'écran : clique d\'abord dessus.', 18],
  [16, 4, 'Si une barre rouge « Microsoft a bloqué l\'exécution des macros » apparaît : ferme Excel, fais un clic droit sur ce fichier,', 18],
  [17, 4, 'Propriétés, coche « Débloquer » en bas, OK, puis rouvre le fichier.', 18],
  [18, 4, 'Si le bouton ne fait rien et qu\'il n\'y a plus de barre : appuie sur Alt+F8, choisis TesterSEE, puis clique sur Exécuter.', 18],
];
/* Le bouton : colonne B, lignes 10 à 12 (trois lignes de 33 points = 132 pixels), 400 pixels de large. Sa position
   absolue (a:xfrm, en EMU : 9 525 par pixel, 12 700 par point) redit l'ancre : la colonne A fait 26 pixels, les lignes
   1 à 9 la somme de leurs hauteurs (15 points celles qui n'en ont pas). */
const hauteurLigne = r => { const l = LIGNES.find(x => x[0] === r); return l ? l[3] : 15; };
const BOUTON = { col: 1, ligneDe: 9, ligneA: 12, largeur: 400 * 9525, hauteur: [10, 11, 12].reduce((s, r) => s + hauteurLigne(r), 0) * 12700,
  x: 26 * 9525, y: [1, 2, 3, 4, 5, 6, 7, 8, 9].reduce((s, r) => s + hauteurLigne(r), 0) * 12700 };
function partiesClasseur(vbaProject) {
  const textes = LIGNES.filter(l => l[2]).map(l => l[2]);
  const types = ENTETE_XML + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="bin" ContentType="application/vnd.ms-office.vbaProject"/>'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.ms-excel.sheet.macroEnabled.main+xml"/>'
    + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
    + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
    + '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>'
    + '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>'
    + '</Types>';
  const rels = ENTETE_XML + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + `<Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  // le classeur : codeName du module ThisWorkbook ; fileVersion comme Excel l'écrit pour un classeur à macros
  const classeur = ENTETE_XML + `<workbook xmlns="${NS}" xmlns:r="${NS_R}">`
    + '<fileVersion appName="xl" lastEdited="4" lowestEdited="4" rupBuild="4505" codeName="{37E998C4-C9E5-D4B9-71C8-EB1FF731991C}"/>'
    + `<workbookPr codeName="${CLASSEUR}"/>`
    + '<bookViews><workbookView xWindow="240" yWindow="15" windowWidth="16095" windowHeight="9660"/></bookViews>'
    + `<sheets><sheet name="${xml(FEUILLE.nom)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const relsClasseur = ENTETE_XML + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + `<Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/>`
    + `<Relationship Id="rId2" Type="${REL}/styles" Target="styles.xml"/>`
    + `<Relationship Id="rId3" Type="${REL}/sharedStrings" Target="sharedStrings.xml"/>`
    + '<Relationship Id="rId4" Type="http://schemas.microsoft.com/office/2006/relationships/vbaProject" Target="vbaProject.bin"/></Relationships>';
  const police = (taille, couleur, gras) => `<font>${gras ? '<b/>' : ''}<sz val="${taille}"/><color rgb="FF${couleur}"/><name val="Calibri"/><family val="2"/></font>`;
  const styles = ENTETE_XML + `<styleSheet xmlns="${NS}">`
    + '<fonts count="5">' + police(11, '000000') + police(26, '1E5B3A', true) + police(13, '404040') + police(16, '1A1A1A') + police(11, '595959') + '</fonts>'
    + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
    + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
    + [1, 2, 3, 4].map(f => `<xf numFmtId="0" fontId="${f}" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>`).join('') + '</cellXfs>'
    + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/></styleSheet>';
  const partage = ENTETE_XML + `<sst xmlns="${NS}" count="${textes.length}" uniqueCount="${textes.length}">`
    + textes.map(t => `<si><t>${xml(t)}</t></si>`).join('') + '</sst>';
  const feuille = ENTETE_XML + `<worksheet xmlns="${NS}" xmlns:r="${NS_R}">`
    + `<sheetPr codeName="${FEUILLE.codeName}"><pageSetUpPr fitToPage="1"/></sheetPr>`
    + `<dimension ref="B${Math.min(...LIGNES.filter(l => l[2]).map(l => l[0]))}:B${Math.max(...LIGNES.filter(l => l[2]).map(l => l[0]))}"/>`
    + '<sheetViews><sheetView showGridLines="0" showRowColHeaders="0" tabSelected="1" workbookViewId="0"><selection activeCell="A1" sqref="A1"/></sheetView></sheetViews>'
    + '<sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="1" width="3.7109375" customWidth="1"/><col min="2" max="2" width="120.7109375" customWidth="1"/></cols>'
    + '<sheetData>' + LIGNES.map(([r, s, t, h]) => `<row r="${r}" ht="${h}" customHeight="1">`
      + (t ? `<c r="B${r}" s="${s}" t="s"><v>${textes.indexOf(t)}</v></c>` : '') + '</row>').join('') + '</sheetData>'
    + '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>'
    + '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/><drawing r:id="rId1"/></worksheet>';   // imprimée : A4 paysage, une page de large
  const relsFeuille = ENTETE_XML + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + `<Relationship Id="rId1" Type="${REL}/drawing" Target="../drawings/drawing1.xml"/></Relationships>`;
  // le bouton : une forme (rectangle arrondi vert, texte blanc), affectée à la macro comme Excel l'écrit : [0]!Macro
  const b = BOUTON, dessin = ENTETE_XML
    + '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
    + `<xdr:twoCellAnchor><xdr:from><xdr:col>${b.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${b.ligneDe}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>`
    + `<xdr:to><xdr:col>${b.col}</xdr:col><xdr:colOff>${b.largeur}</xdr:colOff><xdr:row>${b.ligneA}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>`
    + `<xdr:sp macro="[0]!${MACRO_DU_BOUTON}" textlink="">`
    + `<xdr:nvSpPr><xdr:cNvPr id="2" name="Bouton TESTER SEE" descr="Lance la macro ${MACRO_DU_BOUTON}"/><xdr:cNvSpPr/></xdr:nvSpPr>`
    + `<xdr:spPr><a:xfrm><a:off x="${Math.round(b.x)}" y="${Math.round(b.y)}"/><a:ext cx="${b.largeur}" cy="${b.hauteur}"/></a:xfrm>`
    + '<a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="1E7B45"/></a:solidFill>'
    + '<a:ln w="28575"><a:solidFill><a:srgbClr val="145A32"/></a:solidFill></a:ln></xdr:spPr>'
    + '<xdr:txBody><a:bodyPr vertOverflow="clip" horzOverflow="clip" wrap="square" rtlCol="0" anchor="ctr"/><a:lstStyle/>'
    + '<a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="fr-FR" sz="3200" b="1"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr>'
    + '<a:t>TESTER SEE</a:t></a:r></a:p></xdr:txBody></xdr:sp><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>';
  const u = t => new Uint8Array(Buffer.from(t, 'utf8'));
  return [['[Content_Types].xml', u(types)], ['_rels/.rels', u(rels)], ['xl/workbook.xml', u(classeur)], ['xl/_rels/workbook.xml.rels', u(relsClasseur)],
    ['xl/worksheets/sheet1.xml', u(feuille)], ['xl/worksheets/_rels/sheet1.xml.rels', u(relsFeuille)], ['xl/drawings/drawing1.xml', u(dessin)],
    ['xl/styles.xml', u(styles)], ['xl/sharedStrings.xml', u(partage)], ['xl/vbaProject.bin', vbaProject]].map(([nom, octets]) => ({ nom, octets }));
}

/* ---- 7. tout ensemble --------------------------------------------------- */
/* Rend { octets (le .xlsm), vba (xl/vbaProject.bin), flux, modules, idProjet, dossier, avertissements }. `o.dossierVba` :
   le dossier des .bas (défaut : VBA_DOSSIER, sinon see/vba).
   Sans la macro du bouton, REFUSE (exception, rien n'est écrit) : le classeur n'existe que pour ce bouton, et un bouton
   qui ne lance rien ferait perdre le jour 1 au bureau (« Impossible d'exécuter la macro », Alt+F8 vide, une photo).
   `o.sansBouton` (--sans-bouton) l'écrit quand même, pour un essai ici seulement : le constat est alors dans
   `avertissements`. */
function classeurPilote(o = {}) {
  const dossier = o.dossierVba || process.env.VBA_DOSSIER || path.join(RACINE, 'see', 'vba');
  const { modules, macroDuBouton } = lireModules(dossier), avertissements = [];
  if (!macroDuBouton) {
    const constat = `la macro ${MACRO_DU_BOUTON} (Public Sub ${MACRO_DU_BOUTON}(), sans argument) n'est dans aucun des modules lus`
      + ` (${MODULES_STANDARD.join(', ')}, dans ${dossier}) : le bouton « TESTER SEE » ne lancerait rien`;
    if (!o.sansBouton) throw new Error(constat + '. Rien n\'est écrit. (Pour un essai ici seulement, jamais pour le bureau : --sans-bouton.)');
    avertissements.push(constat);
  }
  const p = projetVBA(modules), zipDe = require('./exporter.js').chargerAtelier()('zipDe');
  return { octets: zipDe(partiesClasseur(p.octets), new Date(1980, 0, 1)), vba: p.octets, flux: p.flux, modules, idProjet: p.idProjet, dossier, avertissements };
}

if (require.main === module) {
  const args = process.argv.slice(2), arg = args.find(a => a.startsWith('--sortie='));
  const sortie = arg ? arg.slice(9) : 'Pilote-SEE.xlsm';
  try {
    const c = classeurPilote({ sansBouton: args.includes('--sans-bouton') });
    fs.writeFileSync(sortie, c.octets);
    c.modules.forEach(m => console.log(`  ${(m.document ? 'document ' : 'standard ') + m.nom.padEnd(14)} ${String(m.texte.length).padStart(7)} octets de texte → ${String(c.flux.VBA[m.nom].length).padStart(6)} compressés`));
    console.log(`${sortie} : ${c.octets.length} octets (vbaProject.bin : ${c.vba.length}), projet ${c.idProjet}`);
    c.avertissements.forEach(a => console.warn('AVERTISSEMENT : ' + a + ' — CE CLASSEUR NE DOIT PAS PARTIR AU BUREAU'));
  } catch (e) {
    console.error('Erreur : ' + ((e && e.message) || e));
    if (fs.existsSync(sortie)) console.error(`(${sortie} n'est pas réécrit : celui qui est là est un ancien, pas à jour.)`);
    process.exit(1);
  }
}
module.exports = { classeurPilote, projetVBA, lireModules, compresser, decompresser, chiffrer, fichierCompose, fluxDir, fluxProject, fluxProjectWm, texteDocument, partiesClasseur, avantCfb, octetsCp1252,
  MODULES_STANDARD, MACRO_DU_BOUTON, FEUILLE, CLASSEUR, BASE_CLASSEUR, BASE_FEUILLE, REFERENCES, VERSION_PROJET, NOM_PROJET };
