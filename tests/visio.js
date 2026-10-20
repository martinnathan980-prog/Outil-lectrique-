/* ===========================================================================
   LES SCHÉMAS VISIO (.vsdx), DANS LES DEUX SENS — écrire, relire, la relecture
   ---------------------------------------------------------------------------
       NODE_PATH=/opt/node22/lib/node_modules node tests/visio.js [--images=dossier]

   Le BANC D'ESSAI, hors ligne (un contexte sans réseau) :
     · L'ALLER-RETOUR : l'exemple embarqué (6 folios, 201 liaisons) part en
       .vsdx par le menu (⋮ › Exporter › « Les folios en Visio »), le paquet est
       contrôlé (ses parties, ses types, ses relations ; chaque partie Visio
       contre le schéma de MS-VSDX, si xmllint est là ; lu par libvisio, si ses
       outils sont là), puis Volta le relit : les mêmes 201 liaisons, borne à
       borne, avec leur câble, leur type et leur folio ;
     · QUATRE AUTRES MAINS (tests/visio/fabrique.js), « comme Visio les écrit » :
       des maîtres et leurs groupes, des colles indexées, des connecteurs posés
       sans colle, des textes séparés, la colle dynamique, des lignes, une
       polyligne, un T et un point de jonction, des repères dans les données, des
       points nommés, une page d'arrière-plan, des groupes tournés et retournés,
       des connecteurs courbes, des renvois entre pages (par leurs données OPC,
       leur lien, leur texte) — rappel et précision des liaisons ≥ 98 %.
   Puis, à la vraie souris : le menu (Plus › « Lire un schéma Visio… »), la page
   rendue entre les vignettes et la relecture, la molette et la main, la
   recherche, une ligne qui surligne sa liaison et dit pourquoi, une case
   corrigée, un clic sur un câble, « Supprimer » et « Rétablir », le retest
   Excel relu à l'identique, « Ouvrir comme plan », Échap, un .vsdx glissé sur
   la bibliothèque, un .vsd d'avant 2013 et un faux .vsdx qui le disent. Aucune
   requête réseau, aucune erreur dans la console.
   ========================================================================= */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process');
const { fichierDemande } = require('./pilote');
const { unzipSync, zipSync, strToU8, strFromU8 } = require('../vendor/fflate.min.js');
const { schemasVisio } = require('./visio/fabrique');
const FICHIER = fichierDemande(), IMG = (process.argv.find(a => a.startsWith('--images=')) || '').slice(9);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'volta-visio-'));
const out = []; const ok = (n, c, d) => { out.push((c ? '  ok   ' : '  KO   ') + n + (d ? '  ' + d : '')); console.log(out[out.length - 1]); };
const pct = x => (100 * x).toFixed(1).replace('.', ',') + ' %';
const zip = F => Buffer.from(zipSync(Object.fromEntries(Object.entries(F).map(([k, v]) => [k, strToU8(v)]))));
const a = c => spawnSync('sh', ['-c', 'command -v ' + c]).status === 0;

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ offline: true, viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage(); p.setDefaultTimeout(900000);
  const erreurs = [], reseau = [];
  p.on('pageerror', e => erreurs.push(e.message)); p.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
  p.on('request', r => { if (!/^(file|blob|data):/.test(r.url())) reseau.push(r.url()); });
  await p.goto(FICHIER); await p.waitForFunction(() => typeof atelier !== 'undefined');
  const lire = async (octets, nom) => p.evaluate(([b64, nom]) => { const lu = lireSchemaVisio(paquetVisio(Uint8Array.from(atob(b64), c => c.charCodeAt(0))));
    return { liaisons: lu.liaisons.map(l => ({ de: l.de, borneDe: l.borneDe, vers: l.vers, borneVers: l.borneVers, cable: l.cable, type: l.type, plan: l.plan, conf: l.conf, colle: l.colle, pageVers: l.pageVers })),
      pages: lu.pages.map(P => ({ nom: P.nom, plan: P.plan, folio: P.folio, orphelins: P.orphelins.length })), nom }; }, [octets.toString('base64'), nom]);
  const cle = (x, bx, y, by) => { const u = x + ':' + String(bx || '').toUpperCase(), v = y + ':' + String(by || '').toUpperCase(); return u < v ? u + ' | ' + v : v + ' | ' + u; };
  const comparer = (V, T, k) => { const VV = new Map(), TT = new Map(); V.forEach(l => { const c = k(l); VV.set(c, (VV.get(c) || 0) + 1); }); T.forEach(l => { const c = k(l); TT.set(c, (TT.get(c) || 0) + 1); });
    let j = 0; const manque = [], trop = []; VV.forEach((n, c) => { const m = Math.min(n, TT.get(c) || 0); j += m; if (n > m) manque.push(c); }); TT.forEach((n, c) => { if (n > Math.min(n, VV.get(c) || 0)) trop.push(c); });
    return { j, v: V.length, t: T.length, manque, trop }; };

  // ---- 1. QUATRE AUTRES MAINS : des .vsdx comme Visio les écrit, fabriqués sans l'écrivain de Volta
  const S = schemasVisio(), lus = {}; let tv = 0, tt = 0, tj = 0;
  for (const s of S) { const R = await lire(zip(s.fichiers), 'style-' + s.nom + '.vsdx'), C = comparer(s.verite, R.liaisons, l => cle(l.de, l.borneDe, l.vers, l.borneVers)); lus[s.nom] = R;
    tv += C.v; tt += C.t; tj += C.j;
    console.log(`       style ${s.nom} « ${s.titre} »  ${R.pages.length} p.  vérité ${String(C.v).padStart(3)}  trouvées ${String(C.t).padStart(3)}  justes ${String(C.j).padStart(3)}  rappel ${pct(C.j / C.v).padStart(7)}  précision ${pct(C.j / Math.max(1, C.t)).padStart(7)}`
      + (C.manque.length ? '\n         manquent : ' + C.manque.join(' ; ') : '') + (C.trop.length ? '\n         en trop : ' + C.trop.join(' ; ') : ''));
    ok(`style ${s.nom} (« ${s.titre} ») : rappel et précision ≥ 98 %`, C.j / C.v >= 0.98 && C.j / Math.max(1, C.t) >= 0.98, `${C.j}/${C.v} · ${C.t} trouvées`); }
  ok('quatre autres mains en tout : rappel et précision ≥ 98 %', tj / tv >= 0.98 && tj / tt >= 0.98, `rappel ${pct(tj / tv)} · précision ${pct(tj / tt)} (${tj}/${tv})`);
  const A = lus.A, B = lus.B, Cc = lus.C, D = lus.D;
  ok('le cartouche donne le FWD de chaque page (un numéro par page, ou le numéro du document et le folio ; l’arrière-plan compte)', A.pages.map(q => q.plan).join() === 'GB-7731-01,GB-7731-02' && Cc.pages.map(q => q.plan).join() === 'EL-5512 F1,EL-5512 F2,EL-5512 F3' && B.pages[0].plan === 'HM-102',
    [A, B, Cc].map(R => R.pages.map(q => q.plan).join('/')).join(' · '));
  ok('les renvois relient les pages : par leurs données (OPC), leur lien, leur texte', A.liaisons.filter(l => l.pageVers != null).length === 3 && Cc.liaisons.filter(l => l.pageVers != null).length === 5 && D.liaisons.filter(l => l.pageVers != null).length === 1,
    [A, Cc, D].map(R => R.liaisons.filter(l => l.pageVers != null).length).join(' · '));
  ok('un câble collé l’est à 99 % ; un trait posé sans colle est lu, et le dit (une confiance plus basse)', A.liaisons.filter(l => l.colle).every(l => l.conf >= 0.9) && B.liaisons.some(l => !l.colle && l.conf < 0.99) && A.liaisons.filter(l => l.colle).length >= 15, `${A.liaisons.filter(l => l.colle).length} collées sur ${A.liaisons.length}`);
  ok('un trait qui n’arrive nulle part est un orphelin (style B : un seul)', B.pages[0].orphelins === 1, B.pages[0].orphelins + ' orphelin(s)');

  // ---- 2. L'ALLER-RETOUR : les six folios de l'exemple en .vsdx, par le menu, puis relus
  await p.evaluate(() => atelier.exemple()); await p.waitForTimeout(500);
  await p.click('#btnMenu'); await p.click('#menu [data-sous="exporter"]');
  const t0 = Date.now(), [dl] = await Promise.all([p.waitForEvent('download', { timeout: 900000 }), p.click('#menu [data-act="vsdx"]')]);
  const fx = path.join(TMP, 'exemple.vsdx'); await dl.saveAs(fx); const tEcrit = Date.now() - t0, octets = fs.readFileSync(fx);
  const Z = unzipSync(new Uint8Array(octets)), noms = Object.keys(Z), texte = k => strFromU8(Z[k]);
  const ct = texte('[Content_Types].xml'), rels = texte('_rels/.rels'), drels = texte('visio/_rels/document.xml.rels'), prels = texte('visio/pages/_rels/pages.xml.rels');
  const pages = noms.filter(n => /^visio\/pages\/page\d+\.xml$/.test(n));
  const paquetOk = noms[0] === '[Content_Types].xml' && ['_rels/.rels', 'docProps/core.xml', 'docProps/app.xml', 'visio/document.xml', 'visio/_rels/document.xml.rels', 'visio/pages/pages.xml', 'visio/pages/_rels/pages.xml.rels'].every(n => noms.includes(n))
    && pages.length === 6 && pages.every(n => ct.includes(`PartName="/${n}" ContentType="application/vnd.ms-visio.page+xml"`) && prels.includes(`Target="${n.slice(12)}"`))
    && /visio\/2010\/relationships\/document" Target="visio\/document.xml"/.test(rels) && /relationships\/pages" Target="pages\/pages.xml"/.test(drels) && ct.includes('application/vnd.ms-visio.drawing.main+xml');
  ok('« Les folios en Visio » : un paquet OPC complet — les types de chaque partie, les relations du paquet au document, du document aux pages, une page par folio', paquetOk && dl.suggestedFilename() === 'Contrat-d-exemple.vsdx', `${noms.length} parties · ${pages.length} pages · ${Math.round(octets.length / 1024)} Ko · écrit en ${Math.round(tEcrit / 1000)} s · ${dl.suggestedFilename()}`);
  const p3 = texte('visio/pages/page3.xml'), nConn = (p3.match(/<Connect /g) || []).length, nGlu = (p3.match(/F="PAR\(PNT\(Sheet\.\d+!Connections\.\w+\.X/g) || []).length;
  ok('chaque câble est un connecteur collé aux deux bornes (un Connect et une formule à chaque bout), chaque bloc un groupe et ses bornes en points de connexion nommés', nConn === 2 * 66 && nGlu === 4 * 66 && /<Row N="B\d+" T="Connection">/.test(p3) && /N="Prompt" V="B5" U="STR"/.test(p3) && /Type="Group"/.test(p3), `folio 3 : ${nConn} Connects, ${nGlu} formules de colle`);
  // le schéma de MS-VSDX (annexe A), si xmllint est là : chaque partie Visio s'y conforme
  if (a('xmllint')) { const dir = path.join(TMP, 'xsd'); const fautes = [];
    noms.filter(n => /^visio\/.*\.xml$/.test(n)).forEach(n => { const f = path.join(dir, n); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, texte(n).replace(/ xml:space="preserve"/, ''));
      const r = spawnSync('xmllint', ['--noout', '--schema', path.join(__dirname, 'visio', 'schema', 'visio.xsd'), f], { encoding: 'utf8' }); if (r.status !== 0) fautes.push(n + ' : ' + (r.stderr || '').split('\n')[0]); });
    ok('chaque partie Visio (document, pages) se conforme au schéma de MS-VSDX (xmllint)', !fautes.length, fautes.slice(0, 2).join(' | ') || noms.filter(n => /^visio\/.*\.xml$/.test(n)).length + ' parties valides'); }
  else console.log('  —    xmllint absent : le schéma de MS-VSDX n’est pas vérifié');
  if (a('vsd2text')) { const r = spawnSync('vsd2text', [fx], { encoding: 'utf8' }); ok('libvisio (le lecteur Visio de LibreOffice) ouvre le fichier et en lit les textes', r.status === 0 && /300XC1/.test(r.stdout) && /W-012 DR20/.test(r.stdout), (r.stdout || '').split('\n').length + ' lignes de texte'); }
  else console.log('  —    libvisio absent : la lecture par un autre logiciel n’est pas vérifiée');
  // relu par Volta : les mêmes 201 liaisons, borne à borne, câble, type et folio compris
  const RR = await lire(octets, 'exemple.vsdx'), V0 = await p.evaluate(() => contratExemple().map(l => ({ de: l.de, borneDe: l.borneDe, vers: l.vers, borneVers: l.borneVers, cable: l.cable, type: l.type, plan: l.plan })));
  const CR = comparer(V0, RR.liaisons, l => cle(l.de, l.borneDe, l.vers, l.borneVers) + ' #' + l.plan + ' ' + l.cable + ' ' + l.type);
  console.log(`       aller-retour  6 folios  vérité ${CR.v}  relues ${CR.t}  justes ${CR.j}` + (CR.manque.length ? '\n         manquent : ' + CR.manque.slice(0, 8).join(' ; ') : '') + (CR.trop.length ? '\n         en trop : ' + CR.trop.slice(0, 8).join(' ; ') : ''));
  ok('l’aller-retour : l’exemple (6 folios, 201 liaisons) → .vsdx → relu = les mêmes 201 liaisons, borne à borne, câble, type et folio', CR.j === 201 && CR.t === 201 && RR.liaisons.every(l => l.colle && l.conf >= 0.99), `${CR.j}/${CR.v} · ${RR.liaisons.filter(l => l.colle).length} collées`);

  // ---- 3. LA RELECTURE, à la vraie souris
  await p.click('#btnMenu'); await p.click('#menu [data-sous="plus"]');
  const [choix] = await Promise.all([p.waitForEvent('filechooser'), p.click('#menu [data-act="visio"]')]);
  await choix.setFiles(fx); await p.waitForFunction(() => VISIO.ouvert && VISIO.lu); await p.waitForTimeout(500);
  const O = await p.evaluate(() => ({ vu: !$('visio').hidden, menu: $('menu').hidden, n: VISIO.L.length, vig: document.querySelectorAll('#visio-vignettes .pdf-vig').length, svg: !!document.querySelector('#visio-dessin svg path'),
    feuille: (() => { const r = $('visio-feuille').getBoundingClientRect(), d = $('visio-relecture').getBoundingClientRect(), g = $('visio-vignettes').getBoundingClientRect(); return r.width > 300 && r.left >= g.right - 1 && r.right <= d.left + 1; })(),
    lignes: document.querySelectorAll('#visio-tab tbody tr[data-i]').length, pied: [...document.querySelectorAll('#visio-relecture .fiche-pied .btn')].map(x => x.textContent).join(' | '), cart: ($('visio-relecture').querySelector('.pdf-cart') || {}).textContent || '' }));
  ok('Plus › « Lire un schéma Visio… » : la page rendue sur papier entre les vignettes et la relecture, une ligne par liaison, le cartouche lu', O.vu && O.menu && O.svg && O.feuille && O.vig === 6 && O.n === 201 && O.lignes === 201 && /Ouvrir comme plan/.test(O.pied) && /retest Excel/.test(O.pied) && /folio 1 \/ 6/.test(O.cart), JSON.stringify(O).slice(0, 220));
  if (IMG) await p.screenshot({ path: path.join(IMG, 'visio-exemple.png') });
  const sc = await p.evaluate(() => { const r = $('visio-feuille').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }), z0 = await p.evaluate(() => ({ ...VISIO.vue }));
  await p.mouse.move(sc.x, sc.y); await p.mouse.wheel(0, -400); await p.waitForTimeout(300); const z1 = await p.evaluate(() => ({ ...VISIO.vue }));
  await p.mouse.down(); await p.mouse.move(sc.x - 120, sc.y - 60, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(250); const z2 = await p.evaluate(() => ({ ...VISIO.vue }));
  ok('la molette zoome autour du pointeur, la main déplace la page', z1.s > z0.s * 1.5 && Math.abs(z2.tx - z1.tx + 120) < 2 && Math.abs(z2.ty - z1.ty + 60) < 2, `×${(z1.s / z0.s).toFixed(2)}`);
  await p.keyboard.press('0'); await p.waitForTimeout(200);
  await p.fill('#visio-q', '102CB1'); await p.waitForTimeout(600);
  const Q = await p.evaluate(() => ({ hits: VISIO.hits.length, calque: document.querySelectorAll('#visio-calque .pdf-hit').length, compte: $('visio-q-n').textContent }));
  ok('la recherche trouve « 102CB1 » et le surligne sur la page', Q.hits >= 1 && Q.calque >= 1 && /^1\s\/\s\d+$/.test(Q.compte), JSON.stringify(Q));
  await p.fill('#visio-q', ''); await p.waitForTimeout(300);
  const iL = await p.evaluate(() => VISIO.L.findIndex(l => l.page === 0 && (l.de === '103RL1' || l.vers === '103RL1')));
  await p.click(`#visio-tab tr[data-i="${iL}"] td[data-k="vers"]`); await p.waitForTimeout(400);
  const H = await p.evaluate(() => ({ traits: document.querySelectorAll('#visio-calque .pdf-sel .pdf-trait').length, bouts: document.querySelectorAll('#visio-calque .pdf-sel .pdf-bout').length, mots: document.querySelectorAll('#visio-calque .pdf-sel .pdf-mot').length, raisons: ($('visio-tab').querySelector('.pdf-raisons') || {}).textContent || '' }));
  ok('un clic sur une ligne surligne sa liaison sur la page (son trajet, ses deux bornes, ce qui a été lu) et dit pourquoi', H.traits >= 1 && H.bouts === 2 && H.mots >= 2 && /collé aux deux bouts/.test(H.raisons) && /point de connexion/.test(H.raisons), JSON.stringify(H).slice(0, 220));
  if (IMG) await p.screenshot({ path: path.join(IMG, 'visio-surligne.png') });
  await p.dblclick(`#visio-tab tr[data-i="${iL}"] td[data-k="type"]`); await p.keyboard.type('DR18'); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
  const K = await p.evaluate(i => ({ type: VISIO.L[i].type, main: [...VISIO.L[i].main].join(), conf: $('visio-tab').querySelector(`tr[data-i="${i}"] .pdf-conf`).textContent }), iL);
  ok('une case se corrige d’un double-clic : la valeur écrite, la liaison passe « main »', K.type === 'DR18' && K.main === 'type' && /main/.test(K.conf), JSON.stringify(K));
  await p.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); cadrerVisio(); }); await p.waitForTimeout(200);
  const pj = await p.evaluate(() => { const j = VISIO.L.findIndex((l, i) => i !== VISIO.choisie && l.page === 0 && l.trajet.length >= 1 && Math.hypot(l.trajet[0][1][0] - l.trajet[0][0][0], l.trajet[0][1][1] - l.trajet[0][0][1]) > 30);
    const [x, y] = VISIO.L[j].trajet[0], r = $('visio-feuille').getBoundingClientRect(); return { j, x: r.left + (x[0] + y[0]) / 2 * VISIO.vue.s, y: r.top + (x[1] + y[1]) / 2 * VISIO.vue.s }; });
  await p.mouse.click(pj.x, pj.y); await p.waitForTimeout(300);
  ok('un clic sur un câble de la page choisit sa liaison : sa ligne s’allume', await p.evaluate(j => VISIO.choisie === j && !!$('visio-tab').querySelector(`tr.choisie[data-i="${j}"]`), pj.j), JSON.stringify(pj));
  // « Supprimer cette liaison », puis « Rétablir » dans le mot qui passe
  const n0 = await p.evaluate(() => VISIO.L.length); await p.click('#visio-relecture [data-visio="suppr"]'); await p.waitForTimeout(200);
  const n1 = await p.evaluate(() => VISIO.L.length); await p.click('#toast .toast-voir'); await p.waitForTimeout(200);
  ok('« Supprimer cette liaison » se fait aussitôt ; « Rétablir », dans le mot qui passe, la rend', n1 === n0 - 1 && await p.evaluate(n => VISIO.L.length === n, n0), `${n0} → ${n1} → ${await p.evaluate(() => VISIO.L.length)}`);
  // le retest Excel : les seize colonnes, relues par Volta comme un retest
  const [dx] = await Promise.all([p.waitForEvent('download'), p.click('#visio-relecture [data-visio="excel"]')]); const fxl = path.join(TMP, 'retest.xlsx'); await dx.saveAs(fxl);
  const X = await p.evaluate(async b64 => { const r = await lireFichier(new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], 'retest.xlsx'));
    const k = l => [l.de, l.borneDe, l.vers, l.borneVers, l.type || '', l.cable || '', l.plan || ''].join('|'), a = r.liaisons.map(k).sort(), b = liaisonsDuVisio().map(l => k(liaison(l))).sort();
    return { format: r.format, n: r.liaisons.length, attendu: b.length, memes: JSON.stringify(a) === JSON.stringify(b) }; }, fs.readFileSync(fxl).toString('base64'));
  ok('« Enregistrer en retest Excel » : un classeur aux seize colonnes que Volta relit comme un retest — les mêmes liaisons', X.format === 'retest' && X.memes && X.n === 201 && dx.suggestedFilename() === 'exemple-retest.xlsx', JSON.stringify(X) + ' ' + dx.suggestedFilename());
  await p.click('#visio-relecture [data-visio="plan"]'); await p.waitForTimeout(1200);
  const P = await p.evaluate(() => ({ n: verite().length, nom: app.nom, cache: $('visio').hidden, folios: plans().join(), bib: bibliothequeOuverte() }));
  ok('« Ouvrir comme plan » : un plan neuf, ses six folios, toutes les liaisons relues ; la relecture se range', P.n === 201 && P.cache && P.folios === '1,2,3,4,5,6' && !P.bib && P.nom === 'exemple', JSON.stringify(P));
  if (IMG) await p.screenshot({ path: path.join(IMG, 'visio-plan.png') });
  // un style d'une autre main : ses renvois sur deux pages ; Échap ferme
  await p.evaluate(async b64 => { await ouvrirFichier(new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], 'gabarit.vsdx')); }, zip(S[0].fichiers).toString('base64'));
  await p.waitForFunction(() => VISIO.ouvert && VISIO.nom === 'gabarit.vsdx'); await p.waitForTimeout(300);
  const iR = await p.evaluate(() => VISIO.L.findIndex(l => l.pageVers != null)); await p.click(`#visio-tab tr[data-i="${iR}"] td[data-k="de"]`); await p.waitForTimeout(300);
  ok('un .vsdx ouvert comme un fichier (Ctrl+O, un dépôt) va à la relecture ; un renvoi relie deux pages et le dit', await p.evaluate(i => !$('visio').hidden && VISIO.L.length === 22 && /renvoi : page Page-1 → page Page-2/.test(VISIO.L[i].raisons[0]), iR));
  await p.click('#visio-vignettes .pdf-vig[data-page="2"]'); await p.waitForTimeout(300);
  ok('une vignette mène à sa page', await p.evaluate(() => VISIO.page === 2 && $('visio-num').textContent.trim() === '2 / 2'));
  if (IMG) for (const t of ['light', 'dark']) { await p.evaluate(t => { document.documentElement.dataset.theme = t; }, t); await p.waitForTimeout(200); await p.screenshot({ path: path.join(IMG, 'visio-gabarit-' + t + '.png') }); }
  await p.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  ok('Échap ferme la relecture ; le plan reste', await p.evaluate(() => $('visio').hidden && !VISIO.ouvert && verite().length === 201));
  // un .vsdx glissé sur la bibliothèque : la relecture, pas un plan raté
  await p.evaluate(() => montrerBibliotheque('racine')); await p.waitForTimeout(300); const nA = await p.evaluate(() => BIB.ajouts.length);
  await p.evaluate(async b64 => { const dt = new DataTransfer(); dt.items.add(new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], 'glisse.vsdx'));
    ['dragenter', 'dragover', 'drop'].forEach(t => $('bibliotheque').dispatchEvent(new DragEvent(t, { dataTransfer: dt, bubbles: true, cancelable: true }))); }, zip(S[1].fichiers).toString('base64'));
  await p.waitForFunction(() => VISIO.ouvert && VISIO.nom === 'glisse.vsdx'); await p.waitForTimeout(300);
  ok('un .vsdx glissé sur la bibliothèque s’ouvre dans la relecture : pas de plan raté, le voile du dépôt retombe', await p.evaluate(n => !$('visio').hidden && BIB.ajouts.length === n && !document.body.classList.contains('depot-actif') && VISIO.L.length === 11, nA));
  await p.keyboard.press('Escape');
  // ce qui n'en est pas : un .vsd d'avant 2013, un faux .vsdx — le mot qui passe le dit, rien ne casse
  // (ouvrirFichier passe la main à la relecture sans l'attendre, comme pour un PDF : on attend que le mot change)
  const M = await p.evaluate(async () => { const dit = async () => { for (let k = 0; k < 50 && /^Lecture de/.test($('toast').textContent); k++) await new Promise(r => setTimeout(r, 100)); return $('toast').textContent; };
    await ouvrirFichier(new File([new Uint8Array([0xD0, 0xCF, 0x11, 0xE0])], 'ancien.vsd')); const a = await dit();
    await ouvrirFichier(new File([new TextEncoder().encode('pas un zip')], 'faux.vsdx')); return [a, await dit(), $('visio').hidden]; });
  ok('un .vsd d’avant 2013 et un faux .vsdx le disent dans le mot qui passe ; la relecture reste fermée', /enregistrez-le en \.vsdx/.test(M[0]) && /ne s’ouvre pas comme un dessin Visio/.test(M[1]) && M[2], M.slice(0, 2).join(' | ').slice(0, 200));
  ok('aucune requête réseau (le contexte est hors ligne : le zip, le rendu, tout est dans le fichier)', reseau.length === 0, reseau.slice(0, 3).join(' '));
  ok('aucune erreur dans la console', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));

  const ko = out.filter(x => x.startsWith('  KO')).length;
  console.log('\n  ' + (out.length - ko) + ' / ' + out.length + ' contrôles passés' + (ko ? '  — ' + ko + ' échec(s)' : ''));
  await b.close(); fs.rmSync(TMP, { recursive: true, force: true }); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('ÉCHEC', e); process.exit(1); });
