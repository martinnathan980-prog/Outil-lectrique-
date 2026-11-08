/* ===========================================================================
   VITESSE — l'outil répond vite, sur le vrai chemin (l'audit de fluidité).
   ---------------------------------------------------------------------------
       node tests/vitesse.js [--fichier=chemin]

   Mesuré comme chez le lecteur (navigator.webdriver caché : le placement part
   dans son Worker, avec ses aides), la charge de la machine relevée — les
   seuils s'élargissent quand d'autres programmes la chargent :
     · LA NORME EMBARQUÉE, relue à chaque ouverture : lue comme avant, table
       par table, ligne par ligne (la lecture d'avant est refaite ici, telle
       quelle, et comparée), en une fraction de seconde (elle figeait l'écran
       2,6 s) ; l'outil utilisable (la bibliothèque) en moins de deux secondes ;
     · LE PREMIER DESSIN d'un folio chargé (le folio 3 de l'exemple, 66 câbles)
       placé au loin : l'esquisse d'abord (trois secondes au plus), le dessin
       définitif ensuite (quinze au plus), le concours partagé avec des aides ;
     · LA TABLE VIVANTE, SOBRE : quand on est là, ses nappes dérivent sans
       brûler un cœur (le processeur de tout le navigateur) ; sans la main, elle
       s'endort (90 s, avancées ici) et ne brûle plus rien ;
     · (passe 87) LE GROS FICHIER — l'exemple quinze fois, 3 345 liaisons sur
       90 folios, comme le piège « geant » (tests/pieges.js) — ouvert en vrai,
       le calcul de fond actif : pendant que les folios se dessinent au loin,
       la page ne fige jamais plus de 300 ms ; dans la recherche, aucune lettre
       ne la fige plus de 50 ms, et la liste trouve ce qu'on a tapé.
   Rend 1 au premier échec.
   =========================================================================== */
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm');
const P = require('./pilote');
const FICHIER = P.fichierDemande();
// le plan géant des fichiers piégés : l'exemple quinze fois, la zone décalée d'un millier, chaque copie ses folios (tests/pieges.js)
function geantCsv() { const bac = { console }; vm.createContext(bac);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', '01-modele.js'), 'utf8') + '\nthis.E = contratExemple();', bac);
  const EX = [...bac.E].map(l => ({ ...l })), L = [];
  for (let k = 0; k < 15; k++) EX.forEach(l => { const z = r => String(r).replace(/^(\d+)/, m => String(+m + 1000 * (k + 1))); L.push({ ...l, de: z(l.de), vers: z(l.vers), cable: l.cable ? l.cable + '-' + k : '', plan: String(k * 6 + (+l.plan || 1)) }); });
  const ENT = ['Install', 'ECP', 'Harness', 'Device1', 'Pin1', 'PN1', 'Description1', 'Cable T/G', 'Cable Tag', 'Route', 'Device2', 'Pin2', 'PN2', 'Description2', 'FWD', 'Cable length (mm)', 'Appareil'];
  const c = v => { v = String(v == null ? '' : v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  return [ENT.join(';'), ...L.map(l => ['Essai', '12345', 'H-ESSAI-01', l.de, l.borneDe, l.pnDe, l.descDe || '', l.type, l.cable, l.route, l.vers, l.borneVers, l.pnVers, l.descVers || '', l.plan, l.lg == null ? '5000' : l.lg, 'APP-1'].map(c).join(';'))].join('\n'); }
const CHARGE = () => os.loadavg()[0] / Math.max(1, os.cpus().length);
const marge = () => Math.max(1, CHARGE() * 1.5);   // une machine chargée étire tout : le seuil avec elle
// le processeur de tout le navigateur lancé par ce processus (ses descendants, dans /proc), en ms
function cpuDuNavigateur() { const enfants = new Map();
  for (const d of fs.readdirSync('/proc')) { if (!/^\d+$/.test(d)) continue; try { const st = fs.readFileSync('/proc/' + d + '/stat', 'utf8'), p = st.slice(st.lastIndexOf(')') + 2).split(' '); enfants.set(+d, { ppid: +p[1], t: +p[11] + +p[12] }); } catch (_) { } }
  const pile = [process.pid], vus = new Set(); let t = 0; while (pile.length) { const p = pile.pop(); if (vus.has(p)) continue; vus.add(p); const e = enfants.get(p); if (e && p !== process.pid) t += e.t; enfants.forEach((v, k) => { if (v.ppid === p) pile.push(k); }); }
  return t * 10; }
/* LA LECTURE D'AVANT, refaite telle quelle (09-barrettes avant l'audit) : chaque ligne essayée contre les trente-deux
   tables, chaque cellule renormalisée à chaque fois. Le résultat de référence. */
function lectureDAvantDansLaPage() {
  const champ = (cles, cell, pris) => { const brut = NORMA(cell); if (!brut) return null;
    const essais = [brut, NORMA(String(cell).replace(/\s*[(\[][^)\]]*[)\]]\s*$/, ''))].filter((t, i, a) => t && a.indexOf(t) === i);
    for (const t of essais) for (const [c, alias] of cles) if (!(pris && pris[c] != null) && alias.includes(t)) return c; return null; };
  const colonnes = (nom, row) => { const cles = COLONNES_NORME[nom], col = {}, inconnues = []; row.forEach((cell, i) => { if (!String(cell || '').trim()) return; const c = champ(cles, cell, col); if (c) col[c] = i; else inconnues.push(i); }); return { col, inconnues }; };
  const reconnaitre = row => { const cands = []; ORDRE_RECONNAISSANCE.forEach(nom => { const { col, inconnues } = colonnes(nom, row); if (TABLE_NORME[nom](col)) cands.push({ nom, col, inconnues, n: Object.keys(col).length }); }); return cands; };
  const blocs = []; let b = null, titre = '';
  String(NORME_EMBARQUEE || '').split(/\r?\n/).forEach((ligne, k) => { if (!ligne.trim()) { b = null; return; }
    const sep = separateurDe(ligne), row = cellulesDeNorme(ligne, sep), cands = reconnaitre(row);
    if (cands.length) { const c = cands[0]; b = { ligne: k, titre, entete: row, separateur: sep, candidats: cands, hesite: enteteHesite(cands), table: c.nom, col: c.col, inconnues: c.inconnues, lignes: [] }; blocs.push(b); titre = ''; return; }
    if (!b) { if (row.length === 1) titre = ligne.trim(); return; }
    const cells = sep === b.separateur ? row : cellulesDeNorme(ligne, b.separateur);
    if (cells.length === 1) { b = null; titre = ligne.trim(); return; }
    b.lignes.push(cells); });
  const N = normeVide(); blocs.forEach(x => { N.tables++; lireBloc(x).lues.forEach(e => N[x.table].push(e)); });
  return { D: JSON.stringify(blocs), N: JSON.stringify(N) }; }

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  let ko = 0; const ok = (c, nom, detail) => { if (!c) ko++; console.log('  ' + (c ? 'ok ' : 'KO ') + ' ' + nom + (detail ? '   ' + detail : '')); };
  console.log('  charge de la machine : ' + os.loadavg().map(x => x.toFixed(1)).join(' / ') + ' (' + os.cpus().length + ' cœurs)');
  // comme chez le lecteur : pas de pilote automatique déclaré
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(`try { Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false, configurable: true }); } catch (_) { }`);
  const page = await ctx.newPage(); page.setDefaultTimeout(600000);
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  // — l'ouverture : la bibliothèque utilisable
  const t0 = Date.now(); await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined' && typeof BIB !== 'undefined' && BIB.pret, null, { polling: 20 }); const tOuvert = Date.now() - t0;
  ok(tOuvert < 2000 * marge(), 'l’outil s’ouvre sur sa bibliothèque en moins de deux secondes', tOuvert + ' ms');
  // — la norme embarquée : la même que la lecture d'avant, en une fraction du temps
  const n = await page.evaluate(lectureDAvantDansLaPage);
  const lue = await page.evaluate(() => { if (champDeCellule.formes) champDeCellule.formes.clear(); const t = performance.now(); const D = decouperTables(NORME_EMBARQUEE), N = normeEmbarquee(); return { ms: performance.now() - t, D: JSON.stringify(D), N: JSON.stringify(N), tables: N.tables, lignes: D.reduce((s, b) => s + b.lignes.length, 0) }; });
  ok(lue.D === n.D, 'la norme embarquée se DÉCOUPE comme avant : chaque table, son en-tête, ses candidates, chaque ligne', lue.tables + ' tables, ' + lue.lignes + ' lignes');
  ok(lue.N === n.N, 'et se LIT comme avant : chaque entrée de chaque table, à l’identique');
  ok(lue.ms < 700 * marge(), 'en une fraction de seconde (elle figeait l’écran 2,6 s)', Math.round(lue.ms) + ' ms (le découpage et la lecture)');
  // — le premier dessin d'un folio chargé, au loin : l'esquisse, puis le dessin définitif
  await page.evaluate(() => atelier.exemple()); await page.waitForTimeout(300);
  const d = await page.evaluate(async () => { const t0 = performance.now(); let tE = null; allerAuPlan('1'); allerAuPlan('3');
    await new Promise(ok => { const f = () => { if (app.dessin && app.dessin.provisoire === 'esquisse' && tE == null) tE = performance.now() - t0;
      if (app.plan === '3' && app.dessin && !app.dessin.provisoire) ok(); else setTimeout(f, 20); }; f(); });
    const e = etatPlacement(); return { esquisse: tE, ms: performance.now() - t0, aides: e.aides, faits: e.faits, relus: e.relus, n: liaisonsDuPlan().length, coeurs: navigator.hardwareConcurrency }; });
  ok(d.esquisse != null && d.esquisse < 3000 * marge(), `l’esquisse du folio 3 (${d.n} câbles) paraît vite`, Math.round(d.esquisse) + ' ms');
  ok(d.ms < 15000 * marge(), 'le dessin définitif suit', Math.round(d.ms) + ' ms, ' + d.aides + ' aide(s) pour ' + d.coeurs + ' cœurs');
  ok(d.coeurs < 2 || d.aides >= 1, 'le concours se partage avec des aides (un Worker par cœur libre, trois au plus)', d.aides + ' aide(s)');
  // — la table au repos : quelques secondes sans geste, le navigateur presque à l'arrêt (les autres folios placés, l'affinage arrêté)
  await page.waitForFunction(() => { const e = etatPlacement(); return !e.encours && !e.attentes.length; }, null, { timeout: 300000 }).catch(() => { });
  await page.evaluate(() => { affinage.actif = false; if (affinage.worker) { affinage.worker.terminate(); affinage.worker = null; } affinage.encours = null; affinage.file = []; arreterPlacement(); montrerAttente(); });
  // la table VIVANTE (v73) : quand on est là, ses deux nappes dérivent (7 Hz, translation seule) — sobrement : le navigateur
  // entier, la table éveillée ; puis la veille (90 s sans la main, avancée ici à 1,5 s) l'endort : plus rien ne tourne
  await page.mouse.move(900, 400); await page.mouse.move(1000, 450, { steps: 10 }); await page.waitForTimeout(1500);
  const vit = await page.evaluate(() => new Promise(r => { const t0 = TABLE.temps; setTimeout(() => r({ avance: TABLE.temps > t0, minuterie: !!TABLE.minuterie }), 800); }));
  const e0 = cpuDuNavigateur(), v0 = Date.now(); await page.waitForTimeout(4000); const cpuEveillee = (cpuDuNavigateur() - e0) / (Date.now() - v0) * 100;
  await page.evaluate(() => { TABLE.veilleApres = 1500; }); await page.waitForTimeout(5000);
  const dort = await page.evaluate(() => !TABLE.minuterie && TABLE.vitesse === 0 && $('table').classList.contains('dort'));
  const c0 = cpuDuNavigateur(), w0 = Date.now(); await page.waitForTimeout(4000); const cpu = (cpuDuNavigateur() - c0) / (Date.now() - w0) * 100;
  ok(vit.avance && vit.minuterie && dort, 'la table dérive quand on est là, et s’endort au repos (plus rien ne tourne)', JSON.stringify(vit));
  ok(cpuEveillee < 25 * marge(), 'éveillée, la table dérive sans brûler un cœur (le navigateur entier)', Math.round(cpuEveillee) + ' % d’un cœur');
  ok(cpu < 15 * marge(), 'au repos, la table ne brûle plus un cœur (le navigateur entier)', Math.round(cpu) + ' % d’un cœur (100 % avant)');
  /* — (passe 87, le regard, S11) LE GROS FICHIER, ouvert en vrai, le calcul de fond actif. La pastille relisait les 90 folios
     deux fois par seconde (la page figée 50 à 200 ms à chaque fois, des blocages de 1,3 à 2,4 s) ; chaque lettre tapée dans
     la recherche refaisait tout le contrat et les gestes du contrôle (0,6 à 0,8 s par lettre, 2,3 s pour la première). Les
     tâches longues se lisent dans la page (PerformanceObserver « longtask »). */
  const geant = await ctx.newPage(); geant.setDefaultTimeout(600000); geant.on('pageerror', e => erreurs.push(e.message));
  await geant.addInitScript(() => { window.__longues = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__longues.push([e.startTime, e.duration]))).observe({ type: 'longtask', buffered: true }); } catch (_) { } });
  await geant.goto(FICHIER); await geant.waitForFunction(() => typeof atelier !== 'undefined' && typeof BIB !== 'undefined' && BIB.pret, null, { polling: 50 });
  const ouv = await geant.evaluate(async t => { const a = performance.now(); await ouvrirFichier(new File([t], 'geant.csv', { type: 'text/csv' })); return { fin: performance.now(), ms: performance.now() - a, n: verite().length, folios: plans().length }; }, geantCsv());
  await geant.waitForTimeout(15000);
  const fond = await geant.evaluate(fin => { const xs = window.__longues.filter(x => x[0] >= fin).map(x => Math.round(x[1])); return { n: xs.length, pire: Math.max(0, ...xs), prets: etatPlacement().prets, ailleurs: placement.ailleurs }; }, ouv.fin);
  ok(ouv.n === 3345 && ouv.folios === 90 && fond.ailleurs, 'le gros fichier s’ouvre, son calcul de fond au loin', `${ouv.n} liaisons, ${ouv.folios} folios, lu et dessiné en ${Math.round(ouv.ms)} ms`);
  ok(fond.pire < 300 * marge(), 'pendant que ses folios se dessinent, la page ne fige jamais plus de 300 ms', `15 s : ${fond.n} tâche(s) de plus de 50 ms, la plus longue ${fond.pire} ms ; ${fond.prets} folios prêts`);
  await geant.mouse.click(1300, 300); await geant.waitForTimeout(300);
  const t1 = await geant.evaluate(() => performance.now()); await geant.keyboard.press('/');
  for (const c of '8103RL1') { await geant.keyboard.type(c); await geant.waitForTimeout(80); }
  const trouve = await geant.waitForFunction(() => { const l = document.getElementById('pa-liste'); return l && /8103RL1/.test(l.innerText) ? performance.now() : null; }, null, { timeout: 30000, polling: 'raf' }).then(h => h.jsonValue(), () => null);
  const frappe = await geant.evaluate(t1 => window.__longues.filter(x => x[0] >= t1).map(x => Math.round(x[1])), t1);
  ok(!!trouve, 'la recherche trouve 8103RL1 parmi les 3 345 liaisons', trouve ? Math.round(trouve - t1) + ' ms depuis « / » (sept lettres à 80 ms)' : 'pas trouvé');
  ok(Math.max(0, ...frappe) < 50 * marge(), 'aucune lettre ne fige la page plus de 50 ms (elle attend la fin de la frappe, l’index est prêt)', frappe.length ? 'tâches de plus de 50 ms : ' + frappe.join(', ') + ' ms' : 'aucune tâche de plus de 50 ms');
  await geant.close();
  ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
  console.log('\n  ' + (ko ? ko + ' échec(s)' : 'tout tient'));
  await nav.close(); process.exit(ko ? 1 : 0);
})();
