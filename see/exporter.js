#!/usr/bin/env node
/* ===========================================================================
   LE LOT — le paquet SEE d'un retest entier (et ses DXF), sans navigateur
   ---------------------------------------------------------------------------
       node see/exporter.js <retest.xlsx | --exemple> [--sortie=paquet.xlsx]
            [--folios=1-5;8] [--harness=H] [--profond] [--taches=N]
            [--dxf=dossier/] [--dxf-cadre=N] [--dxf-couleurs=N]
            [--dxf-blocs=folio] [--dxf-numeros=dedans]

   Le même paquet que le menu « Exporter pour SEE » de l'Atelier (see/
   FORMAT-PAQUET.md), pour huit cents folios d'un coup. Le code est CELUI DE
   LA PAGE : src/ (sauf 10-demarrage, qui lance la page) est chargé dans
   l'ordre de construire.js — le moteur (01-06, 09), puis l'interface (07,
   08) —, SheetJS (lib/xlsx.min.js) à côté. Rien n'est réécrit ici : la
   lecture du retest (`lireFichier`), les liaisons d'un folio et ses
   barrettes à poser numérotées d'un folio à l'autre (`folioDuContrat`,
   `avecBarrettesAPoser`), les couleurs des routes (`couleursDeRoutes`), le
   placement (`meilleurPlacement`, déterministe : le même dessin que la page
   pour un folio non retouché), le dessin (`dessinDuPlacement`), le modèle
   et le classeur (`modeleSEE`, `classeurSEE`), le DXF (`dxfDuFolio`, 08-dxf).

   Le code se charge dans une portée de fonction (vm.runInThisContext) et non
   dans un bac `vm.createContext` : dans un contexte à part, chaque accès à
   Math, Map, JSON passe par l'intercepteur du global du bac, et le placement
   y est trois fois plus lent (folio 4 de l'exemple : 21,6 s contre 7,4 s).
   Le processus du lot est lui-même le bac : il ne fait que ça.

   --exemple        le contrat d'exemple embarqué (six folios)
   --sortie=…       le fichier écrit (défaut : paquet-see-<nom du retest>.xlsx)
   --folios=1-5;8   les folios à exporter, par rang dans l'ordre de l'Atelier
                    (rangés 1…n dans le paquet ; la colonne Plan dit leur FWD)
   --harness=H      le harness à ouvrir, quand le fichier en porte plusieurs
   --profond        la recherche profonde de l'affinage (48 tours, comme la
                    page en arrière-plan) au lieu du concours : bien plus lent
   --taches=N       N folios placés en parallèle (worker_threads), un cœur
                    chacun ; le paquet est le même
   --dxf=dossier/   le REPLI : un DXF par folio dans ce dossier (créé s'il le
                    faut), « NN.<nom du folio>.dxf » (see/FORMAT-DXF.md), que
                    SEE importe d'un coup. Le classeur n'est alors écrit que si
                    --sortie est donné.
   --dxf-cadre=N    sans le cadre ni le cartouche (SEE a les siens)
   --dxf-couleurs=N les fils en BYLAYER plutôt qu'à la couleur de leur route
   --dxf-blocs=folio les blocs dessinés à l'échelle de chaque folio, insérés
                    à l'échelle 1 (défaut : définis à k = 1, insérés à 1/k)
   --dxf-numeros=dedans les numéros de fil là où l'Atelier les écrit (dans le
                    fil) plutôt que juste au-dessus
   Rend 1 si le retest ne se lit pas ou si un folio n'a pas pu se dessiner.
   =========================================================================== */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const RACINE = path.join(__dirname, '..'), SRC = path.join(RACINE, 'src');

/* ---- charger l'Atelier ------------------------------------------------- */
/* Les modules comme construire.js les assemble : chaque fichier sans sa ligne 'use strict', le moteur (et sa version :
   l'empreinte de son code, la même que dans index.html), puis l'interface, avec les normes embarquées. Rend `A`, qui
   lit un nom dans la portée de l'Atelier : A('meilleurPlacement')(L). */
let atelier = null;
function chargerAtelier() { if (atelier) return atelier;
  const modules = fs.readdirSync(SRC).filter(f => /^\d\d-.*\.js$/.test(f)).sort();
  const lire = f => `/* ───────── ${f} ───────── */\n` + fs.readFileSync(path.join(SRC, f), 'utf8').replace(/^'use strict';\s*$/m, '');
  const DU_MOTEUR = /^0[1-69]-/;
  const moteur = modules.filter(f => DU_MOTEUR.test(f)).map(lire).join('\n');
  const interfaceJs = modules.filter(f => !DU_MOTEUR.test(f) && f !== '10-demarrage.js').map(lire).join('\n');
  const version = require('crypto').createHash('sha1').update(moteur).digest('hex').slice(0, 12);
  const NORMES = path.join(RACINE, 'normes');
  const normes = fs.existsSync(NORMES) ? fs.readdirSync(NORMES).filter(f => /\.csv$/i.test(f)).sort().map(f => fs.readFileSync(path.join(NORMES, f), 'utf8')).join('\n\n') : '';
  const XLSX = require(path.join(RACINE, 'lib', 'xlsx.min.js'));
  const code = `(function (XLSX) { "use strict";\nconst VERSION_MOTEUR = '${version}';\n${moteur}\nconst NORME_EMBARQUEE = ${JSON.stringify(normes)};\n${interfaceJs}\nreturn nom => eval(nom); })`;
  const A = vm.runInThisContext(code, { filename: 'atelier.js' })(XLSX);
  atelier = Object.assign(A, { version, XLSX });
  return atelier; }

/* ---- le retest --------------------------------------------------------- */
/* Lu par la page elle-même (`lireFichier`, SheetJS) : un faux fichier suffit. Rend { liaisons, nom, harnais, lues }. */
async function lireRetest(chemin, harness) { const A = chargerAtelier();
  if (chemin === '--exemple') return { liaisons: A('contratExemple')().map(A('liaison')), nom: 'Contrat d’exemple', harnais: [], lues: [] };
  const octets = fs.readFileSync(chemin), nom = path.basename(chemin);
  const fichier = { name: nom, type: '', arrayBuffer: async () => octets.buffer.slice(octets.byteOffset, octets.byteOffset + octets.length), text: async () => octets.toString('utf8') };
  const r = await A('lireFichier')(fichier);
  let liaisons = r.liaisons;
  if (r.harnais && r.harnais.length > 1) {
    if (!harness) throw new Error(`« ${nom} » porte ${r.harnais.length} harness (${r.harnais.join(', ')}) : lequel ? --harness=…`);
    if (!r.harnais.includes(harness)) throw new Error(`harness « ${harness} » absent de « ${nom} » (${r.harnais.join(', ')})`);
    liaisons = liaisons.filter(l => l.harness === harness); }
  else if (harness) liaisons = liaisons.filter(l => l.harness === harness);
  if (!liaisons.length) throw new Error(`« ${nom} » est lu, mais aucune liaison n’est reconnue`);
  return { liaisons: liaisons.map(A('liaison')), nom: harness && r.harnais && r.harnais.length > 1 ? harness + ' (' + nom + ')' : nom, harnais: r.harnais || [], lues: r.lues || [] }; }

/* ---- les folios -------------------------------------------------------- */
/* Comme la page à l'ouverture d'un contrat : un folio par FWD, dans l'ordre de l'Atelier ; un contrat d'un seul dessin
   (aucun FWD, ou un seul) est le dessin entier ('*'). Les barrettes à poser se numérotent dans l'ordre des folios, avec
   une mémoire qui court d'un folio à l'autre (`app.contrat.provisoires` dans la page). Rend [{ rang, cle, plan, L }]. */
function foliosDuContrat(liaisons) { const A = chargerAtelier(), P = A('plansDe')(liaisons), memoire = new Map();
  const cles = P.length <= 1 ? [{ cle: '*', plan: P[0] || null }] : P.map(p => ({ cle: p, plan: p }));
  return cles.map((f, i) => { const { L, depart } = A('folioDuContrat')(liaisons, f.cle);
    return { rang: i + 1, ...f, L: A('avecBarrettesAPoser')(L, depart, memoire) }; }); }
const lirePlage = (texte, n) => { const s = new Set();
  String(texte).split(/[;,]/).map(t => t.trim()).filter(Boolean).forEach(t => { const m = /^(\d+)\s*-\s*(\d+)$/.exec(t);
    if (m) { for (let k = +m[1]; k <= +m[2]; k++) s.add(k); } else if (/^\d+$/.test(t)) s.add(+t); else throw new Error('--folios : « ' + t + ' » n’est ni un rang ni une plage'); });
  return [...s].filter(k => k >= 1 && k <= n).sort((a, b) => a - b); };

/* Un folio : placé (le concours, ou la recherche profonde), dessiné, rendu en modèle SEE. */
function modeleDuFolio(f, o) { const A = chargerAtelier(), t0 = Date.now();
  const L = f.L, Lm = L.map(({ origine, ...l }) => l);   // le moteur ne lit pas `origine` (la page l'ôte aussi pour ses Workers)
  const P = o.profond ? A('placementProfond')(Lm, A('TOURS_PROFONDS')) : A('meilleurPlacement')(Lm);
  const d = A('dessinDuPlacement')(P, L, new Map(o.routes));
  const m = A('modeleSEE')(d, L, { folio: f.numero, plan: f.plan, cartouche: o.cartouche });
  return { modele: m, ms: Date.now() - t0 }; }

/* ---- le lot ------------------------------------------------------------ */
const arg = (args, k) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : null; };
/* Les réglages du DXF lus dans les arguments (--dxf-cadre=N, --dxf-couleurs=N, --dxf-blocs=folio, --dxf-numeros=dedans). */
const reglagesDxf = args => { const non = k => /^(n|non|0|false)$/i.test(arg(args, k) || ''), o = {};
  if (non('dxf-cadre')) o.cadre = false; if (non('dxf-couleurs')) o.couleurs = false;
  if (arg(args, 'dxf-blocs')) o.blocs = arg(args, 'dxf-blocs'); if (arg(args, 'dxf-numeros')) o.numeros = arg(args, 'dxf-numeros');
  return o; };
/* Écrit un DXF par folio dans `dossier` : [{ f (le folio : rang au contrat), m (son modèle) }], `total` les folios du
   contrat. Rend les chemins écrits. */
function ecrireDxf(paires, dossier, total, reglages) { const A = chargerAtelier(); fs.mkdirSync(dossier, { recursive: true });
  return paires.map(({ f, m }) => { const chemin = path.join(dossier, A('nomDuDxf')(m, f.rang, total));
    fs.writeFileSync(chemin, A('octetsCp1252')(A('dxfDuFolio')(m, { ...reglages, total, rang: f.rang }))); return chemin; }); }
const secondes = ms => (ms / 1000).toFixed(1).replace('.', ',') + ' s';
async function exporter(args, ecrire) { ecrire = ecrire || (t => process.stdout.write(t + '\n'));
  const source = args.find(a => a === '--exemple' || !a.startsWith('--'));
  if (args.includes('--dxf')) throw new Error('--dxf demande un dossier : --dxf=dossier/');
  if (!source) throw new Error('usage : node see/exporter.js <retest.xlsx | --exemple> [--sortie=paquet.xlsx] [--folios=1-5;8] [--harness=H] [--profond] [--taches=N] [--dxf=dossier/]');
  const t0 = Date.now(), A = chargerAtelier(), R = await lireRetest(source, arg(args, 'harness'));
  const tous = foliosDuContrat(R.liaisons), choix = arg(args, 'folios') ? lirePlage(arg(args, 'folios'), tous.length) : tous.map(f => f.rang);
  const folios = tous.filter(f => choix.includes(f.rang)).map((f, i) => ({ ...f, numero: i + 1 }));
  if (!folios.length) throw new Error('aucun folio à exporter (' + tous.length + ' au contrat)');
  const profond = args.includes('--profond'), taches = Math.max(1, Math.min(folios.length, +(arg(args, 'taches') || 1) || 1));
  const cartouche = A('nouveauContrat')().cartouche, routes = [...A('couleursDeRoutes')(R.liaisons)];
  const sortie = arg(args, 'sortie') || 'paquet-see-' + (A('nomAscii')(R.nom.replace(/\.[^.]+$/, '')) || 'contrat') + '.xlsx';
  ecrire(`${R.nom} : ${R.liaisons.length} liaisons, ${tous.length} folio${tous.length > 1 ? 's' : ''}${folios.length < tous.length ? ', ' + folios.length + ' choisi' + (folios.length > 1 ? 's' : '') : ''} — ${profond ? 'recherche profonde (' + A('TOURS_PROFONDS') + ' tours)' : 'concours'}${taches > 1 ? ', ' + taches + ' tâches' : ''} · moteur ${A.version}`);
  const o = { profond, routes, cartouche }, modeles = new Array(folios.length);
  let faits = 0, echecs = 0;
  const dire = (f, r) => { faits++; const m = r.modele, F = m && m.folio;
    ecrire(`  folio ${String(f.numero).padStart(String(folios.length).length)}/${folios.length}  ${String(f.plan == null ? '—' : f.plan).padEnd(10)} ${String(f.L.length).padStart(4)} liaisons  ${secondes(r.ms).padStart(8)}`
      + (m ? `  ${F.Droits} droits · ${F.Croisements} croisement${F.Croisements > 1 ? 's' : ''} · ${F.NbBlocs} blocs · ${F.NbFils} fils` + (F.Remarque ? '\n      ! ' + F.Remarque : '') : '  ÉCHEC : ' + r.erreur)
      + `   [${faits}/${folios.length}, ${secondes(Date.now() - t0)}]`); };
  if (taches <= 1) folios.forEach((f, i) => { let r; try { r = modeleDuFolio(f, o); } catch (e) { r = { erreur: String((e && e.message) || e), ms: 0 }; echecs++; } modeles[i] = r.modele; dire(f, r); });
  else await new Promise((fini, rate) => { let suivant = 0, vivants = 0;
    const lancer = w => { if (suivant >= folios.length) { w.terminate(); if (--vivants === 0) fini(); return; } const i = suivant++; w.postMessage({ i, f: folios[i], o }); };
    for (let k = 0; k < taches; k++) { const w = new Worker(__filename, { workerData: { tache: k } }); vivants++;
      w.on('message', ({ i, r }) => { modeles[i] = r.modele; if (!r.modele) echecs++; dire(folios[i], r); lancer(w); });
      w.on('error', rate); lancer(w); } });
  const bons = modeles.filter(Boolean), dxf = arg(args, 'dxf'), n = k => bons.reduce((s, m) => s + m[k].length, 0);
  let dxfs = [];
  if (bons.length) { bons.forEach((m, i) => renumeroter(m, i + 1));
    if (!dxf || arg(args, 'sortie')) {
      const wb = A('classeurSEE')(bons, { fichier: R.nom, contrat: cartouche.titre });
      fs.writeFileSync(sortie, A.XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', compression: true }));
      ecrire(`${sortie} : ${bons.length} folio${bons.length > 1 ? 's' : ''}, ${n('blocs')} blocs, ${n('bornes')} bornes, ${n('fils')} fils — ${secondes(Date.now() - t0)}`); }
    if (dxf) { const t1 = Date.now();
      dxfs = ecrireDxf(folios.map((f, i) => ({ f, m: modeles[i] })).filter(x => x.m), dxf, tous.length, reglagesDxf(args));
      ecrire(`${dxf} : ${dxfs.length} DXF (${dxfs.map(c => path.basename(c)).slice(0, 3).join(', ')}${dxfs.length > 3 ? '…' : ''}), ${n('bornes')} bornes, ${n('fils')} fils — ${secondes(Date.now() - t1)}`); } }
  return { sortie: !dxf || arg(args, 'sortie') ? sortie : null, modeles: bons, echecs, folios: folios.length, dxf: dxfs }; }
// un folio qui a échoué laisse un trou : les suivants reprennent les rangs 1…n du paquet
function renumeroter(m, n) { if (m.folio.Folio === n) return; [[m.folio], m.blocs, m.connecteurs, m.bornes, m.fils, m.jonctions, m.legende].forEach(xs => xs.forEach(r => { r.Folio = n; })); }

if (!isMainThread && workerData && workerData.tache != null) {
  parentPort.on('message', ({ i, f, o }) => { let r; try { r = modeleDuFolio(f, o); } catch (e) { r = { erreur: String((e && e.message) || e), ms: 0 }; } parentPort.postMessage({ i, r }); }); }
else if (require.main === module) {
  exporter(process.argv.slice(2)).then(r => process.exit(r.echecs ? 1 : 0), e => { console.error('Erreur : ' + ((e && e.message) || e)); process.exit(1); }); }

module.exports = { chargerAtelier, lireRetest, foliosDuContrat, modeleDuFolio, exporter, lirePlage, ecrireDxf, reglagesDxf };
