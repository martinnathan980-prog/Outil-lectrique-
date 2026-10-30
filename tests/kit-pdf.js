/* ===========================================================================
   LE KIT PDF (node see/kit.js --pdf) — ce qui part au bureau par courriel
   ---------------------------------------------------------------------------
       node tests/kit-pdf.js

   Sans dépendance ni Python : le zip écrit par see/kit.js est relu par un
   lecteur écrit ICI (fin du répertoire central, entrées centrales et en-têtes
   locaux d'accord, méthode « stocké », CRC-32 recalculé), puis contrôlé :
     · DEUX fichiers, Kit-PDF/sonde_pdf.py puis Kit-PDF/LIS-MOI-D-ABORD.txt,
       et le dossier vide Kit-PDF/PDF-A-LIRE/ ; rien d'autre (pas de .bat) ;
     · la sonde octet pour octet see/pdf/sonde_pdf.py, le LIS-MOI octet pour
       octet see/pdf/kit/LIS-MOI-D-ABORD.txt ;
     · le LIS-MOI : UTF-8 avec BOM, CRLF seulement, lignes de 76 caractères
       au plus ; les étapes A à F dans l'ordre, puis « SI ÇA BLOQUE » ; il cite
       PDF-A-LIRE (le nom même que la sonde lit), .rapport.txt et le
       responsable, et jamais --clair ;
     · aucun fichier d'un type que la messagerie refuse, même zippé (la liste
       de Gmail, recopiée ICI, et non prise dans see/kit.js) ; le .py, le .txt,
       le .xlsm passent ;
     · la ligne de commande : --pdf écrit Kit-PDF.zip (ou --sortie=), code 0 ;
       --pdf avec --vba= ou --sans-bouton : code 1, aucun zip écrit ;
     · le REFUS : un .bat (ou tout type de la liste) glissé dans le contenu du
       kit lève une exception qui le nomme, et rien n'est rendu ;
     · sonde-pdf.bat reste dans le dépôt, hors du kit, et ne double plus ce
       que la sonde fait elle-même (l'avertissement, l'Explorateur).
   Puis le contrôleur s'éprouve : des fautes injectées une à une dans une copie
   du zip (un octet de la sonde, un .bat, un fichier de trop, le dossier qui
   manque, un LIS-MOI sans BOM, en LF, qui cite --clair, sans le responsable,
   aux étapes échangées, un CRC faux), chacune attrapée par le contrôle visé.
   CE QUE CE TEST NE PROUVE PAS : que Windows extrait le zip, que le
   double-clic lance Python, ni qu'une messagerie d'entreprise laisse passer
   le .py. Rien de cela n'a été essayé sous Windows.
   ========================================================================= */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process');
const RACINE = path.join(__dirname, '..');
const K = require(path.join(RACINE, 'see', 'kit.js'));
const { chargerAtelier } = require(path.join(RACINE, 'see', 'exporter.js'));

let total = 0, echecs = 0;
const ok = (nom, cond, mesure) => { total++; if (!cond) echecs++; console.log('  ' + (cond ? 'OK    ' : 'ÉCHEC ') + nom + (mesure ? '   — ' + mesure : '')); return !!cond; };
const titre = t => console.log('\n' + t);
const egaux = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

/* La liste de Gmail (les types qu'il refuse, même dans un zip), recopiée ici : le test ne la prend pas dans kit.js. */
const GMAIL = ['ade', 'adp', 'apk', 'appx', 'appxbundle', 'bat', 'cab', 'chm', 'cmd', 'com', 'cpl', 'diagcab', 'diagcfg', 'diagpack',
  'dll', 'dmg', 'ex_', 'exe', 'hta', 'img', 'ins', 'iso', 'isp', 'jar', 'jnlp', 'js', 'jse', 'lib', 'lnk', 'mde', 'msc', 'msi', 'msix',
  'msixbundle', 'msp', 'mst', 'nsh', 'pif', 'ps1', 'scr', 'sct', 'shb', 'sys', 'vb', 'vbe', 'vbs', 'vhd', 'vxd', 'wsc', 'wsf', 'wsh', 'xll'];
const refuseParGmail = nom => GMAIL.some(x => nom.toLowerCase().endsWith('.' + x));

/* ---- le lecteur de zip, écrit pour ce test --------------------------------- */
const TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = o => { let c = 0xFFFFFFFF; for (const x of o) c = TABLE[(c ^ x) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
/* Rend [{ nom, octets }] dans l'ordre du répertoire central ; lève une exception au premier désaccord. */
function lireZip(z) {
  const v = new DataView(z.buffer, z.byteOffset, z.byteLength), u16 = k => v.getUint16(k, true), u32 = k => v.getUint32(k, true);
  let fin = z.length - 22; while (fin >= 0 && u32(fin) !== 0x06054b50) fin--;
  if (fin < 0) throw new Error('pas de fin de répertoire central');
  const n = u16(fin + 10), taille = u32(fin + 12), debut = u32(fin + 16);
  if (u16(fin + 8) !== n || u16(fin + 4) || u16(fin + 6) || debut + taille !== fin) throw new Error('fin de répertoire central incohérente');
  const entrees = []; let p = debut;
  for (let k = 0; k < n; k++) {
    if (u32(p) !== 0x02014b50) throw new Error('entrée centrale ' + k);
    const methode = u16(p + 10), crc = u32(p + 16), comp = u32(p + 20), brute = u32(p + 24), ln = u16(p + 28), lx = u16(p + 30), lc = u16(p + 32), local = u32(p + 42);
    const nom = Buffer.from(z.subarray(p + 46, p + 46 + ln)).toString('latin1');
    if (u32(local) !== 0x04034b50) throw new Error('en-tête local de ' + nom);
    const lnl = u16(local + 26), lxl = u16(local + 28), nomLocal = Buffer.from(z.subarray(local + 30, local + 30 + lnl)).toString('latin1');
    if (nomLocal !== nom || u16(local + 8) !== methode || u32(local + 14) !== crc || u32(local + 18) !== comp || u32(local + 22) !== brute)
      throw new Error('en-tête local et entrée centrale en désaccord : ' + nom);
    if (methode !== 0 || comp !== brute) throw new Error(nom + ' : méthode ' + methode + ' (le kit est « stocké »)');
    const octets = new Uint8Array(z.subarray(local + 30 + lnl + lxl, local + 30 + lnl + lxl + comp));
    if (octets.length !== brute || crc32(octets) !== crc) throw new Error(nom + ' : CRC ou taille');
    entrees.push({ nom, octets }); p += 46 + ln + lx + lc; }
  if (p !== fin) throw new Error('répertoire central : ' + (fin - p) + ' octets de trop');
  return entrees;
}

/* ---- le contrôleur : rend [{ nom, ok, mesure }] pour un zip ---------------- */
const SONDE = fs.readFileSync(path.join(RACINE, 'see', 'pdf', 'sonde_pdf.py'));
const LIS_MOI = fs.readFileSync(path.join(RACINE, 'see', 'pdf', 'kit', 'LIS-MOI-D-ABORD.txt'));
const A_LIRE_SONDE = (/^DOSSIER_A_LIRE = '([^']+)'$/m.exec(SONDE.toString('utf8')) || [])[1];
const ETAPES = ['ÉTAPE A', 'ÉTAPE B', 'ÉTAPE C', 'ÉTAPE D', 'ÉTAPE E', 'ÉTAPE F', 'SI ÇA BLOQUE'];
function controler(z) {
  const r = [], c = (nom, cond, mesure) => r.push({ nom, ok: !!cond, mesure: mesure || '' });
  let e = [], erreur = '';
  try { e = lireZip(z); } catch (x) { erreur = x.message; }
  c('le zip se relit : fin du répertoire central, entrées centrales et en-têtes locaux d\'accord, « stocké », CRC-32 recalculés', !erreur, erreur || e.length + ' entrées');
  const fichiers = e.filter(x => !x.nom.endsWith('/')), dossiers = e.filter(x => x.nom.endsWith('/'));
  c('le kit : DEUX fichiers, Kit-PDF/sonde_pdf.py puis Kit-PDF/LIS-MOI-D-ABORD.txt, et le dossier vide Kit-PDF/PDF-A-LIRE/ ; rien d\'autre',
    fichiers.map(x => x.nom).join('|') === 'Kit-PDF/sonde_pdf.py|Kit-PDF/LIS-MOI-D-ABORD.txt'
    && dossiers.length === 1 && dossiers[0].nom === 'Kit-PDF/' + A_LIRE_SONDE + '/' && dossiers[0].octets.length === 0, e.map(x => x.nom).join(', '));
  const py = fichiers.find(x => x.nom === 'Kit-PDF/sonde_pdf.py'), lis = fichiers.find(x => x.nom === 'Kit-PDF/LIS-MOI-D-ABORD.txt');
  c('sonde_pdf.py : octet pour octet see/pdf/sonde_pdf.py', py && egaux([...py.octets], [...SONDE]), py ? py.octets.length + ' octets' : 'absent');
  c('LIS-MOI-D-ABORD.txt : octet pour octet see/pdf/kit/LIS-MOI-D-ABORD.txt', lis && egaux([...lis.octets], [...LIS_MOI]), lis ? lis.octets.length + ' octets' : 'absent');
  c('aucun fichier d\'un type que la messagerie refuse, même zippé (la liste de Gmail : .bat, .cmd, .ps1, .js, .vbs, .iso…)',
    e.length && !e.some(x => refuseParGmail(x.nom)), e.filter(x => refuseParGmail(x.nom)).map(x => x.nom).join(', '));
  const o = lis ? lis.octets : new Uint8Array(0), t = Buffer.from(o.subarray(3)).toString('utf8');
  c('LIS-MOI : UTF-8 avec BOM, fins de ligne CRLF seulement (le Bloc-notes l\'ouvre tel quel)',
    o[0] === 0xEF && o[1] === 0xBB && o[2] === 0xBF && t.length && !/\r(?!\n)|(?<!\r)\n/.test(t) && !t.includes('�'));
  const longues = t.split('\r\n').filter(l => l.length > 76);
  c('LIS-MOI : des lignes de 76 caractères au plus', t.length && !longues.length, longues.length ? longues[0].slice(0, 40) + '…' : '');
  const places = ETAPES.map(x => t.indexOf(x));
  c('LIS-MOI : les étapes A, B, C, D, E, F dans l\'ordre, puis « SI ÇA BLOQUE »', places.every((x, i) => x >= 0 && (!i || x > places[i - 1])), places.join(' < '));
  c('LIS-MOI : cite PDF-A-LIRE (le nom que la sonde lit), .rapport.txt et le responsable',
    A_LIRE_SONDE === 'PDF-A-LIRE' && t.includes('« ' + A_LIRE_SONDE + ' »') && t.includes('.rapport.txt') && /responsable/.test(t));
  c('LIS-MOI : ne cite jamais --clair (le relevé anonymisé seulement)', t.length && !/--\s*clair/i.test(t));
  const etape = (a, b) => t.slice(t.indexOf(a), b ? t.indexOf(b) : undefined);
  c('LIS-MOI, A : Débloquer, puis Extraire tout ; rien ouvert depuis le zip',
    /Propriétés[\s\S]*Débloquer[\s\S]*Extraire tout[\s\S]*directement depuis le zip/.test(etape('ÉTAPE A', 'ÉTAPE B')));
  c('LIS-MOI, B : touche Windows, cmd, py --version, puis python --version ; 3.8 au moins ; sinon la photo',
    /touche Windows[\s\S]*cmd[\s\S]*py --version[\s\S]*3\.8[\s\S]*python --version[\s\S]*photo/.test(etape('ÉTAPE B', 'ÉTAPE C')));
  c('LIS-MOI, C : 2 ou 3 plans, un simple, un chargé, un avec des connecteurs, copiés dans PDF-A-LIRE ; ou choisis dans la fenêtre',
    /2 ou 3 plans[\s\S]*simple[\s\S]*chargé[\s\S]*connecteurs[\s\S]*Copier[\s\S]*PDF-A-LIRE[\s\S]*Coller[\s\S]*fenêtre/.test(etape('ÉTAPE C', 'ÉTAPE D')));
  c('LIS-MOI, D : double-clic sur sonde_pdf.py, attendre ; dans un éditeur : Ouvrir avec, Python ; sinon cmd dans la barre d\'adresse (ou cd), py sonde_pdf.py',
    /double-clique sur « sonde_pdf\.py »[\s\S]*Attends[\s\S]*éditeur[\s\S]*Ouvrir avec[\s\S]*« Python »[\s\S]*barre d'adresse[\s\S]*cmd[\s\S]*cd \/d[\s\S]*py sonde_pdf\.py/.test(etape('ÉTAPE D', 'ÉTAPE E')));
  c('LIS-MOI, E : chaque .rapport.txt dans le Bloc-notes, aucun vrai texte ; un doute : le responsable d\'abord',
    /\.rapport\.txt[\s\S]*Bloc-notes[\s\S]*AUCUN vrai texte[\s\S]*doute[\s\S]*responsable/.test(etape('ÉTAPE E', 'ÉTAPE F')));
  c('LIS-MOI, F : SEULEMENT les .rapport.txt, Envoyer vers, Dossier compressé ; les .tsv si le responsable est d\'accord ; jamais EN-CLAIR',
    /SEULEMENT[\s\S]*\.rapport\.txt[\s\S]*Envoyer vers[\s\S]*Dossier compressé[\s\S]*\.elements\.tsv[\s\S]*responsable[\s\S]*EN-CLAIR[\s\S]*JAMAIS/.test(etape('ÉTAPE F', 'SI ÇA BLOQUE')));
  c('LIS-MOI, SI ÇA BLOQUE : la photo de l\'écran', /photo/.test(etape('SI ÇA BLOQUE')));
  return r;
}

titre('Le kit PDF, écrit par kitPdf()');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-pdf-'));
let bon = null;
try { const k = K.kitPdf(); bon = k.zip;
  ok('kitPdf() : deux fichiers (la sonde, le LIS-MOI) et un dossier vide', k.fichiers.length === 2 && k.dossiers.length === 1,
    [...k.fichiers.map(f => f.nom), ...k.dossiers].join(', '));
  controler(k.zip).forEach(x => ok(x.nom, x.ok, x.mesure));
  ok('le dossier vide porte le nom que la sonde lit d\'un double-clic (DOSSIER_A_LIRE de sonde_pdf.py)', K.DOSSIER_A_LIRE === A_LIRE_SONDE, A_LIRE_SONDE); }
catch (e) { ok('le kit PDF s\'écrit', false, e.message); }

titre('La messagerie : la liste des types refusés');
const manquent = GMAIL.filter(x => !K.REFUSES_PAR_COURRIEL.test('Kit/a.' + x) || !K.REFUSES_PAR_COURRIEL.test('A.' + x.toUpperCase()));
ok('REFUSES_PAR_COURRIEL refuse chaque type de la liste de Gmail (' + GMAIL.length + ', en minuscules et en majuscules)', !manquent.length, manquent.join(', '));
const passent = ['sonde_pdf.py', 'LIS-MOI-D-ABORD.txt', 'Pilote-SEE.xlsm', 'r.zip', 'plan.pdf', '01-4f1c9a2e.elements.tsv', 'exemple.ex', 'a.json'];
ok('… et laisse passer ce que les kits portent (.py, .txt, .xlsm) et le reste', passent.every(n => !K.REFUSES_PAR_COURRIEL.test(n)), passent.filter(n => K.REFUSES_PAR_COURRIEL.test(n)).join(', '));

titre('Le refus : un type refusé dans le contenu du kit');
const leve = f => { try { f(); return ''; } catch (e) { return (e && e.message) || String(e); } };
const eBat = leve(() => K.kitPdf({ contenu: [...K.CONTENU_PDF, ['sonde-pdf.bat', 'see/pdf/sonde-pdf.bat']] }));
ok('sonde-pdf.bat glissé dans le kit PDF : exception qui le nomme, rien n\'est rendu', /Kit-PDF\/sonde-pdf\.bat/.test(eBat) && /messagerie/.test(eBat), eBat.slice(0, 90));
const nonRefuses = ['cmd', 'ps1', 'js', 'vbs', 'exe', 'iso', 'img', 'vhd', 'msix', 'appx', 'diagcab', 'dmg', 'xll', 'ex_', 'BAT']
  .filter(x => !/messagerie/.test(leve(() => K.kitPdf({ contenu: [['sonde.' + x, 'see/pdf/sonde_pdf.py']] }))));
ok('de même pour .cmd, .ps1, .js, .vbs, .exe, .iso, .img, .vhd, .msix, .appx, .diagcab, .dmg, .xll, .ex_, .BAT', !nonRefuses.length, nonRefuses.join(', '));

titre('La ligne de commande : node see/kit.js --pdf');
const lance = (args, cwd) => spawnSync(process.execPath, [path.join(RACINE, 'see', 'kit.js'), ...args], { encoding: 'utf8', cwd: cwd || TMP });
try {
  const r1 = lance(['--pdf', '--sortie=k1.zip']), z1 = fs.existsSync(path.join(TMP, 'k1.zip')) ? new Uint8Array(fs.readFileSync(path.join(TMP, 'k1.zip'))) : null;
  ok('--pdf --sortie=k1.zip : code 0, le zip écrit passe tous les contrôles, l\'écran nomme les deux fichiers et le dossier',
    r1.status === 0 && z1 && controler(z1).every(x => x.ok) && /sonde_pdf\.py/.test(r1.stdout) && /LIS-MOI-D-ABORD\.txt/.test(r1.stdout) && /PDF-A-LIRE\/\s+\(dossier vide\)/.test(r1.stdout),
    `code ${r1.status}${r1.stderr ? ' ; ' + r1.stderr.trim().slice(0, 80) : ''}`);
  const d2 = fs.mkdtempSync(path.join(TMP, 'defaut-')), r2 = lance(['--pdf'], d2);
  ok('--pdf sans --sortie : Kit-PDF.zip, dans le dossier courant (et pas Kit-SEE.zip)',
    r2.status === 0 && fs.existsSync(path.join(d2, 'Kit-PDF.zip')) && !fs.existsSync(path.join(d2, 'Kit-SEE.zip')), fs.readdirSync(d2).join(', '));
  const r3 = lance(['--pdf', '--sans-bouton', '--sortie=k3.zip']), r4 = lance(['--pdf', '--vba=ailleurs', '--sortie=k4.zip']);
  ok('--pdf avec --sans-bouton ou --vba= (options du kit SEE) : code 1, l\'erreur le dit, AUCUN zip écrit',
    r3.status === 1 && r4.status === 1 && /kit SEE/.test(r3.stderr) && !fs.existsSync(path.join(TMP, 'k3.zip')) && !fs.existsSync(path.join(TMP, 'k4.zip')),
    `codes ${r3.status}, ${r4.status}`);
} catch (e) { ok('la ligne de commande se lance', false, e.message); }

titre('sonde-pdf.bat : dans le dépôt, hors du kit');
const BAT = path.join(RACINE, 'see', 'pdf', 'sonde-pdf.bat'), bat = fs.existsSync(BAT) ? fs.readFileSync(BAT, 'latin1') : '';
ok('sonde-pdf.bat existe toujours (un autre canal : clé USB, partage), mais pas dans le kit PDF', bat.length > 0 && bon && !lireZip(bon).some(x => /\.bat$/i.test(x.nom)));
ok('il ne double plus la sonde : ni l\'Explorateur ni l\'avertissement final (la sonde les fait), il garde sa pause ; la sonde ouvre le dossier (os.startfile) et dit l\'avertissement',
  !/explorer/i.test(bat) && !/seul suffit/.test(bat) && /^pause\r$/m.test(bat) && /os\.startfile/.test(SONDE.toString('utf8')) && /le \.rapport\.txt seul suffit pour commencer/.test(SONDE.toString('utf8')));
ok('sonde-pdf.bat : ASCII, CRLF seulement', bat.length > 0 && /^[\x00-\x7F]*$/.test(bat) && !/\r(?!\n)|(?<!\r)\n/.test(bat));

titre('Le contrôleur éprouvé : des fautes injectées une à une dans une copie du kit');
const zipDe = chargerAtelier()('zipDe');
const parties = bon ? lireZip(bon) : [];
const avec = f => zipDe(f(parties.map(p => ({ nom: p.nom, octets: Uint8Array.from(p.octets) }))));
const lisMoi = (f) => avec(ps => ps.map(p => p.nom.endsWith('LIS-MOI-D-ABORD.txt') ? { nom: p.nom, octets: f(p.octets) } : p));
const texte = (o, f) => Uint8Array.from(Buffer.concat([Buffer.from(o.subarray(0, 3)), Buffer.from(f(Buffer.from(o.subarray(3)).toString('utf8')), 'utf8')]));
const MUTATIONS = [
  ['un octet de la sonde changé', 'sonde_pdf.py : octet pour octet', avec(ps => ps.map(p => { if (p.nom.endsWith('.py')) p.octets[1000] ^= 0x20; return p; }))],
  ['sonde-pdf.bat ajouté au kit', 'aucun fichier d\'un type', avec(ps => [...ps, { nom: 'Kit-PDF/sonde-pdf.bat', octets: new Uint8Array(fs.readFileSync(BAT)) }])],
  ['un troisième fichier (notes.txt)', 'le kit : DEUX fichiers', avec(ps => [...ps.slice(0, 2), { nom: 'Kit-PDF/notes.txt', octets: Uint8Array.from([0x61]) }, ...ps.slice(2)])],
  ['le dossier PDF-A-LIRE/ oublié', 'le kit : DEUX fichiers', avec(ps => ps.filter(p => !p.nom.endsWith('/')))],
  ['la sonde rangée sous un autre nom', 'le kit : DEUX fichiers', avec(ps => ps.map(p => p.nom.endsWith('.py') ? { nom: 'Kit-PDF/sonde.py', octets: p.octets } : p))],
  ['le LIS-MOI sans BOM', 'LIS-MOI : UTF-8 avec BOM', lisMoi(o => o.subarray(3))],
  ['le LIS-MOI en LF', 'LIS-MOI : UTF-8 avec BOM, fins de ligne CRLF', lisMoi(o => texte(o, t => t.replace(/\r\n/g, '\n')))],
  ['le LIS-MOI qui propose --clair', 'LIS-MOI : ne cite jamais --clair', lisMoi(o => texte(o, t => t.replace('Attends.', 'Attends (ou : py sonde_pdf.py --clair).')))],
  ['le LIS-MOI sans le responsable', 'LIS-MOI : cite PDF-A-LIRE', lisMoi(o => texte(o, t => t.replace(/responsable/g, 'chef')))],
  ['le LIS-MOI aux étapes E et F échangées', 'LIS-MOI : les étapes A, B', lisMoi(o => texte(o, t => t.replace('ÉTAPE E', 'ÉTAPE @').replace('ÉTAPE F', 'ÉTAPE E').replace('ÉTAPE @', 'ÉTAPE F')))],
  ['le LIS-MOI qui dit d\'envoyer les .tsv sans accord', 'LIS-MOI, F', lisMoi(o => texte(o, t => t.replace(/Ne les envoie que si ton\r\n   responsable est d'accord\./, 'Envoie-les aussi.')))],
  ['une ligne du LIS-MOI trop longue', 'LIS-MOI : des lignes de 76', lisMoi(o => texte(o, t => t.replace('Compte 15 minutes.', 'Compte 15 minutes. ' + 'x'.repeat(80))))],
  ['un CRC faux dans le répertoire central', 'le zip se relit', (() => { const z = Uint8Array.from(bon || []), v = new DataView(z.buffer);
    let fin = z.length - 22; while (fin > 0 && v.getUint32(fin, true) !== 0x06054b50) fin--; const c = v.getUint32(fin + 16, true); if (fin > 0) z[c + 16] ^= 0xFF; return z; })()],
];
const avant = bon ? controler(bon) : [];
let attrapees = 0;
for (const [nom, vise, z] of MUTATIONS) {
  const r = controler(z), cible = r.find(x => x.nom.startsWith(vise)), avantCible = avant.find(x => x.nom.startsWith(vise));
  if (cible && !cible.ok && avantCible && avantCible.ok) attrapees++;
  else ok(`la faute « ${nom} » est attrapée par « ${vise} »`, false, !avantCible ? 'contrôle introuvable' : !avantCible.ok ? 'contrôle déjà en échec sans la faute' : 'non vue');
}
ok(`le contrôleur attrape les ${MUTATIONS.length} fautes injectées une à une`, attrapees === MUTATIONS.length, `${attrapees} / ${MUTATIONS.length}`);

fs.rmSync(TMP, { recursive: true, force: true });
console.log('\n  ' + (total - echecs) + ' / ' + total + ' contrôles passés' + (echecs ? '  —  ' + echecs + ' ÉCHEC(S)' : '  —  tout est vert'));
process.exit(echecs ? 1 : 0);
