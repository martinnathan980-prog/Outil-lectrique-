/* ===========================================================================
   LIRE UN PDF DE SCHÉMA — la visionneuse, le moteur, la relecture, le retest
   ---------------------------------------------------------------------------
       NODE_PATH=/opt/node22/lib/node_modules node tests/pdf.js [--images=dossier]

   Le BANC D'ESSAI : des PDF dont on sait la vérité, imprimés ici par Chromium
   (page.pdf : du texte réel, des traits vectoriels), relus par Volta hors
   ligne (un contexte sans réseau) :
     · les six folios de l'exemple (`atelier.exemple()`, le SVG de chaque
       folio sur un A3) — la vérité : les liaisons de `contratExemple()`. Volta
       écrit la borne « 1 » d'un connecteur qu'il a déduit sous la lettre A
       (« A » au-dessus de la pièce, « 1 » dedans) : le PDF ne distingue pas
       « 1 » de « A1 », le banc compare à l'étiquette que le folio DESSINE ;
     · quatre autres mains (tests/pdf/schemas.js) : les numéros dans le cadre,
       les textes tournés et les cadres en quatre traits, les renvois entre
       folios et les T sans point, des repères d'une autre convention (J105,
       CB-120) — la vérité du générateur.
   Rappel et précision des liaisons, borne à borne (sans le sens) : au moins
   98 % sur les folios de Volta, 95 % sur les autres. Puis, à la vraie souris :
   la visionneuse s'ouvre (le menu, un PDF glissé sur la bibliothèque), ses
   vignettes se rendent à la demande (un PDF de cinquante pages), la recherche
   surligne, une ligne de la relecture surligne sa liaison, une case se
   corrige, « Ouvrir comme plan » donne autant de liaisons, le retest Excel
   relu par Volta redonne les mêmes ; un PDF SCANNÉ (une image, du bruit, un
   léger angle) se dit scanné et se relie à la main, au clavier. Aucune
   requête réseau, aucune erreur dans la console.
   ========================================================================= */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const { fichierDemande } = require('./pilote');
const { schemasDEssai, pageHtml } = require('./pdf/schemas');
const FICHIER = fichierDemande(), IMG = (process.argv.find(a => a.startsWith('--images=')) || '').slice(9);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'volta-pdf-'));
const out = []; const ok = (n, c, d) => { out.push((c ? '  ok   ' : '  KO   ') + n + (d ? '  ' + d : '')); console.log(out[out.length - 1]); };
const pct = x => (100 * x).toFixed(1).replace('.', ',') + ' %';

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  // ---- 1. les PDF du banc, imprimés par Chromium (un contexte à part, lui aussi sans réseau)
  const imp = await (await b.newContext({ offline: true })).newPage();
  const ctx = await b.newContext({ offline: true, viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage(); p.setDefaultTimeout(120000);
  const erreurs = [], reseau = [];
  p.on('pageerror', e => erreurs.push(e.message)); p.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
  p.on('request', r => { if (!/^(file|blob|data):/.test(r.url())) reseau.push(r.url()); });
  await p.goto(FICHIER); await p.waitForFunction(() => typeof atelier !== 'undefined');
  // les folios de l'exemple : un SVG par folio, sur un A3 paysage ; les étiquettes que chacun dessine (repère → borne → texte)
  const V = await p.evaluate(() => { atelier.exemple(); const out = [];
    for (const f of plans()) { allerAuPlan(f); const etiq = {}; app.dessin.comps.forEach(c => { if (!c.connecteurs || estDisjoncteur(c.name)) return; const x = etiq[c.name] = etiq[c.name] || {};
        c.connecteurs.forEach((g, bn) => { x[bn] = g.nom + etiquetteDansConnecteur(bn, g.nom); }); });
      out.push({ f, svg: svgDuFolio().txt.replace(/^<\?xml[^>]*\?>\s*/, ''), etiq, verite: contratExemple().filter(l => l.plan === f).map(l => ({ de: l.de, borneDe: l.borneDe, vers: l.vers, borneVers: l.borneVers })) }); }
    return out; });
  const imprimer = async (html, nom) => { await imp.setContent(html); await imp.waitForTimeout(150); const f = path.join(TMP, nom); await imp.pdf({ path: f, width: '420mm', height: '297mm', printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } }); return f; };
  const A3 = svg => `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:420mm 297mm;margin:0}html,body{margin:0}svg{display:block;width:404mm;height:281mm;margin:8mm;page-break-after:always}</style></head><body>${svg}</body></html>`;
  const banc = [];
  for (const v of V) banc.push({ nom: 'Volta folio ' + v.f, groupe: 'volta', fichier: await imprimer(A3(v.svg), 'volta-' + v.f + '.pdf'), verite: v.verite, etiq: v.etiq });
  for (const S of schemasDEssai()) banc.push({ nom: 'style ' + S.nom, groupe: 'styles', fichier: await imprimer(pageHtml(S), 'style-' + S.nom + '.pdf'), verite: S.verite });

  // ---- 2. le moteur sur chaque PDF : rappel et précision, borne à borne
  const lire = async f => p.evaluate(async b64 => { const lib = pdfjsPret(), doc = await lib.getDocument({ data: Uint8Array.from(atob(b64), c => c.charCodeAt(0)), isEvalSupported: false }).promise, pages = [];
    for (let i = 1; i <= doc.numPages; i++) pages.push(await pagePourLeMoteur(doc, i));
    const t0 = performance.now(), L = lireSchemaPdf(pages);
    return { ms: performance.now() - t0, n: doc.numPages, liaisons: L.liaisons.map(l => [l.de, l.borneDe, l.vers, l.borneVers, l.conf]), orphelins: L.pages.reduce((k, r) => k + r.orphelins.length, 0), champs: L.pages.map(r => r.champs), scannees: L.scannees }; }, fs.readFileSync(f).toString('base64'));
  const cle = (a, ba, c, bc) => { const x = a + ':' + String(ba || '').toUpperCase(), y = c + ':' + String(bc || '').toUpperCase(); return x < y ? x + ' | ' + y : y + ' | ' + x; };
  const totaux = { volta: { v: 0, t: 0, j: 0 }, styles: { v: 0, t: 0, j: 0 } }, lignes = [];
  for (const B of banc) { const R = await lire(B.fichier), et = (r, x) => (B.etiq && B.etiq[r] && B.etiq[r][x]) || x;
    const VV = new Map(); B.verite.forEach(l => { const k = cle(l.de, et(l.de, l.borneDe), l.vers, et(l.vers, l.borneVers)); VV.set(k, (VV.get(k) || 0) + 1); });
    const TT = new Map(); R.liaisons.forEach(([a, ba, c, bc]) => { const k = cle(a, ba, c, bc); TT.set(k, (TT.get(k) || 0) + 1); });
    let j = 0; const manque = [], trop = []; VV.forEach((n, k) => { const m = Math.min(n, TT.get(k) || 0); j += m; if (n > m) manque.push(k); }); TT.forEach((n, k) => { if (n > Math.min(n, VV.get(k) || 0)) trop.push(k); });
    const T = totaux[B.groupe]; T.v += B.verite.length; T.t += R.liaisons.length; T.j += j;
    lignes.push(`       ${B.nom.padEnd(16)} ${R.n} p.  vérité ${String(B.verite.length).padStart(3)}  trouvées ${String(R.liaisons.length).padStart(3)}  justes ${String(j).padStart(3)}  rappel ${pct(j / B.verite.length).padStart(7)}  précision ${pct(j / Math.max(1, R.liaisons.length)).padStart(7)}  ${Math.round(R.ms)} ms` + (manque.length ? '\n         manquent : ' + manque.join(' ; ') : '') + (trop.length ? '\n         en trop : ' + trop.join(' ; ') : ''));
    B.R = R; }
  lignes.forEach(l => console.log(l));
  const rp = T => [T.j / T.v, T.j / Math.max(1, T.t)];
  const [rv, pv] = rp(totaux.volta), [rs, ps] = rp(totaux.styles);
  ok('le banc, les six folios de Volta : rappel et précision ≥ 98 %', rv >= 0.98 && pv >= 0.98, `rappel ${pct(rv)} · précision ${pct(pv)} (${totaux.volta.j}/${totaux.volta.v})`);
  ok('le banc, quatre autres mains (cadres, textes tournés, renvois, une autre convention de repères) : rappel et précision ≥ 95 %', rs >= 0.95 && ps >= 0.95, `rappel ${pct(rs)} · précision ${pct(ps)} (${totaux.styles.j}/${totaux.styles.v})`);
  const C = banc.find(x => x.nom === 'style C').R, A = banc.find(x => x.nom === 'style A').R;
  ok('le cartouche se lit : le numéro du document, le folio et son compte, l’indice', C.champs[1].numero === 'HN-2041-07' && C.champs[1].folioNum === '2' && C.champs[1].folios === '3' && C.champs[1].indice === 'D' && A.champs[0].numero === 'PL-4471-020', JSON.stringify(C.champs[1]));
  ok('un bout de fil qui n’arrive nulle part est un orphelin (style A, un par folio)', A.orphelins === 2, A.orphelins + ' orphelins');
  // un PDF dont le texte est dessiné en traits (aucun texte, aucune image) : il se relie à la main, comme un scan
  const vecto = await lire(await imprimer(`<!doctype html><html><body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 420 297"><rect x="40" y="40" width="60" height="40" fill="none" stroke="#000"/><path d="M45 50h8M49 46v8M100 60h80" stroke="#000" fill="none"/><rect x="180" y="40" width="60" height="40" fill="none" stroke="#000"/></svg></body></html>`, 'vectorise.pdf'));
  ok('un PDF sans texte ni image (des lettres dessinées en traits) se dit tel : on le relie à la main', vecto.scannees === 1 && vecto.liaisons.length === 0, JSON.stringify({ scannees: vecto.scannees, n: vecto.liaisons.length }));

  // ---- 3. la visionneuse, à la vraie souris
  const ouvrir = async (f, nom) => { await p.evaluate(async ([b64, nom]) => { await ouvrirPdf(new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], nom, { type: 'application/pdf' })); }, [fs.readFileSync(f).toString('base64'), nom || path.basename(f)]);
    await p.waitForFunction(() => PDF.lecture || PDF.erreur); await p.waitForTimeout(400); };
  // par le menu : Plus › « Lire un PDF de schéma… » ouvre le sélecteur de fichier
  await p.evaluate(() => atelier.exemple()); await p.click('#btnMenu'); await p.click('#menu [data-sous="plus"]');
  const [choix] = await Promise.all([p.waitForEvent('filechooser'), p.click('#menu [data-act="pdf"]')]);
  await choix.setFiles(banc[2].fichier); await p.waitForFunction(() => PDF.lecture || PDF.erreur); await p.waitForTimeout(500);
  const O = await p.evaluate(() => ({ vu: !$('pdf').hidden, menu: $('menu').hidden, n: PDF.L.length, toile: $('pdf-canvas').width > 200, vig: document.querySelectorAll('#pdf-vignettes .pdf-vig').length,
    feuille: (() => { const r = $('pdf-feuille').getBoundingClientRect(), d = $('pdf-relecture').getBoundingClientRect(), g = $('pdf-vignettes').getBoundingClientRect(); return r.width > 300 && r.left >= g.right - 1 && r.right <= d.left + 1; })(),
    lignes: document.querySelectorAll('#pdf-tab tbody tr[data-i]').length, pied: [...document.querySelectorAll('#pdf-relecture .fiche-pied .btn')].map(x => x.textContent).join(' | ') }));
  ok('le menu (Plus › « Lire un PDF de schéma… ») ouvre la visionneuse : la page sur papier entre les vignettes et la relecture, une ligne par liaison', O.vu && O.menu && O.toile && O.feuille && O.vig === 1 && O.n === banc[2].R.liaisons.length && O.lignes === O.n && /Ouvrir comme plan/.test(O.pied) && /retest Excel/.test(O.pied), JSON.stringify(O));
  if (IMG) await p.screenshot({ path: path.join(IMG, 'pdf-volta3.png') });
  // la molette zoome autour du pointeur, la main déplace
  const z0 = await p.evaluate(() => ({ ...PDF.vue })); const sc = await p.evaluate(() => { const r = $('pdf-feuille').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await p.mouse.move(sc.x, sc.y); await p.mouse.wheel(0, -400); await p.waitForTimeout(300); const z1 = await p.evaluate(() => ({ ...PDF.vue }));
  await p.mouse.down(); await p.mouse.move(sc.x - 120, sc.y - 60, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(250); const z2 = await p.evaluate(() => ({ ...PDF.vue }));
  ok('la molette zoome autour du pointeur, la main déplace la page', z1.s > z0.s * 1.5 && Math.abs(z2.tx - z1.tx + 120) < 2 && Math.abs(z2.ty - z1.ty + 60) < 2, `×${(z1.s / z0.s).toFixed(2)} · déplacée de ${Math.round(z2.tx - z1.tx)}, ${Math.round(z2.ty - z1.ty)}`);
  await p.keyboard.press('0'); await p.waitForTimeout(200);
  // la recherche surligne
  await p.fill('#pdf-q', '668VT31'); await p.waitForTimeout(800);
  const S = await p.evaluate(() => ({ hits: PDF.hits.length, calque: document.querySelectorAll('#pdf-calque .pdf-hit').length, compte: $('pdf-q-n').textContent }));
  ok('la recherche trouve « 668VT31 » et le surligne sur la page', S.hits === 4 && S.calque === 4 && /^1\s\/\s4$/.test(S.compte), JSON.stringify(S));
  await p.fill('#pdf-q', ''); await p.waitForTimeout(400);
  // une ligne de la relecture surligne sa liaison (le trajet, les deux bouts, les textes lus) et dit ses raisons
  const iL = await p.evaluate(() => PDF.L.findIndex(l => l.de === '300XC1' || l.vers === '300XC1'));
  await p.click(`#pdf-tab tr[data-i="${iL}"] td[data-k="vers"]`); await p.waitForTimeout(400);
  const H = await p.evaluate(() => ({ traits: document.querySelectorAll('#pdf-calque .pdf-sel .pdf-trait').length, bouts: document.querySelectorAll('#pdf-calque .pdf-sel .pdf-bout').length, mots: document.querySelectorAll('#pdf-calque .pdf-sel .pdf-mot').length, raisons: ($('pdf-tab').querySelector('.pdf-raisons') || {}).textContent || '' }));
  ok('un clic sur une ligne surligne sa liaison sur la page (son trajet, ses deux bornes, ce qui a été lu) et dit pourquoi', H.traits >= 1 && H.bouts === 2 && H.mots >= 2 && /trait suivi|proche en proche/.test(H.raisons) && /borne/.test(H.raisons), JSON.stringify(H).slice(0, 200));
  if (IMG) await p.screenshot({ path: path.join(IMG, 'pdf-surligne.png') });
  // une case se corrige au double-clic : Entrée écrit, la liaison passe « main »
  await p.dblclick(`#pdf-tab tr[data-i="${iL}"] td[data-k="type"]`); await p.keyboard.type('DR22'); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
  const K = await p.evaluate(i => ({ type: PDF.L[i].type, main: [...PDF.L[i].main].join(), conf: $('pdf-tab').querySelector(`tr[data-i="${i}"] .pdf-conf`).textContent }), iL);
  ok('une case se corrige d’un double-clic : la valeur écrite, la liaison passe « main »', K.type === 'DR22' && K.main === 'type' && /main/.test(K.conf), JSON.stringify(K));
  // l'inverse : un clic sur un trait de la page choisit sa liaison, sa ligne s'allume (la page entière en vue)
  await p.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); cadrerPdf(); }); await p.waitForTimeout(200);
  const pj = await p.evaluate(() => { const j = PDF.L.findIndex((l, i) => i !== PDF.choisie && l.page === 0 && l.raisons[0] === 'trait suivi de bout en bout' && l.trajet.length >= 1);
    const [a, b] = PDF.L[j].trajet.reduce((x, y) => Math.hypot(y[1][0] - y[0][0], y[1][1] - y[0][1]) > Math.hypot(x[1][0] - x[0][0], x[1][1] - x[0][1]) ? y : x), r = $('pdf-feuille').getBoundingClientRect();
    return { j, x: r.left + (a[0] + b[0]) / 2 * PDF.vue.s, y: r.top + (a[1] + b[1]) / 2 * PDF.vue.s }; });
  await p.mouse.click(pj.x, pj.y); await p.waitForTimeout(300);
  ok('un clic sur un trait de la page choisit sa liaison : sa ligne s’allume dans la relecture', await p.evaluate(j => PDF.choisie === j && !!$('pdf-tab').querySelector(`tr.choisie[data-i="${j}"]`), pj.j), JSON.stringify(pj));
  // « Enregistrer en retest Excel » : les seize colonnes, relues par Volta
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#pdf-relecture [data-pdf="excel"]')]); const fx = path.join(TMP, 'retest.xlsx'); await dl.saveAs(fx);
  const X = await p.evaluate(async b64 => { const r = await lireFichier(new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], 'retest.xlsx'));
    const k = l => [l.de, l.borneDe, l.vers, l.borneVers, l.type || '', l.plan || ''].join('|'), a = r.liaisons.map(k).sort(), b = liaisonsDuPdf().map(l => k(liaison(l))).sort();
    return { format: r.format, n: r.liaisons.length, attendu: b.length, memes: JSON.stringify(a) === JSON.stringify(b), nom: '' }; }, fs.readFileSync(fx).toString('base64'));
  ok('« Enregistrer en retest Excel » : un classeur aux seize colonnes que Volta relit comme un retest — les mêmes liaisons, borne à borne', X.format === 'retest' && X.memes && X.n === X.attendu && dl.suggestedFilename() === 'volta-3-retest.xlsx', JSON.stringify(X) + ' ' + dl.suggestedFilename());
  // « Ouvrir comme plan » : un plan neuf, autant de liaisons, la visionneuse se range
  const nPdf = await p.evaluate(() => liaisonsDuPdf().length);
  await p.click('#pdf-relecture [data-pdf="plan"]'); await p.waitForTimeout(800);
  const P = await p.evaluate(() => ({ n: verite().length, nom: app.nom, cache: $('pdf').hidden, dessin: !!app.dessin, bib: bibliothequeOuverte() }));
  ok('« Ouvrir comme plan » : un plan neuf de l’installation, avec toutes les liaisons relues, dessiné ; la visionneuse se range', P.n === nPdf && P.cache && P.dessin && !P.bib && P.nom === 'volta-3', JSON.stringify(P));
  if (IMG) await p.screenshot({ path: path.join(IMG, 'pdf-plan.png') });
  // un PDF de plusieurs folios avec des renvois : la relecture les rassemble ; Échap ferme
  await ouvrir(banc.find(x => x.nom === 'style C').fichier);
  const R3 = await p.evaluate(() => ({ n: PDF.L.length, renvois: PDF.L.filter(l => l.pageVers != null).length, vig: document.querySelectorAll('#pdf-vignettes .pdf-vig').length, folios: [...new Set(PDF.L.map(l => l.folio))].join(), cart: ($('pdf-relecture').querySelector('.pdf-cart') || {}).textContent || '' }));
  ok('trois folios, des renvois qui relient un folio au suivant ; le cartouche dit le document et le folio', R3.vig === 3 && R3.renvois >= 6 && R3.folios === '1,2,3' && /HN-2041-07/.test(R3.cart), JSON.stringify(R3));
  await p.click('#pdf-vignettes .pdf-vig[data-page="2"]'); await p.waitForTimeout(400);
  ok('une vignette mène à sa page', await p.evaluate(() => PDF.page === 2 && $('pdf-num').textContent.trim() === '2 / 3' && document.querySelector('#pdf-vignettes .pdf-vig.on').dataset.page === '2'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  ok('Échap ferme la visionneuse ; le plan reste', await p.evaluate(() => $('pdf').hidden && !PDF.ouvert && verite().length > 0));

  // ---- 4. un PDF glissé sur la bibliothèque s'ouvre dans la visionneuse (pas comme un plan illisible)
  await p.evaluate(() => montrerBibliotheque('racine')); await p.waitForTimeout(300);
  const nAjouts = await p.evaluate(() => BIB.ajouts.length);
  await p.evaluate(async b64 => { const dt = new DataTransfer(); dt.items.add(new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], 'glisse.pdf', { type: 'application/pdf' }));
    const cible = $('bibliotheque'); ['dragenter', 'dragover', 'drop'].forEach(t => cible.dispatchEvent(new DragEvent(t, { dataTransfer: dt, bubbles: true, cancelable: true }))); }, fs.readFileSync(banc[0].fichier).toString('base64'));
  await p.waitForFunction(() => PDF.lecture && PDF.nom === 'glisse.pdf'); await p.waitForTimeout(300);
  const G = await p.evaluate(n => ({ vu: !$('pdf').hidden, ajouts: BIB.ajouts.length - n, depot: document.body.classList.contains('depot-actif'), n: PDF.L.length }), nAjouts);
  ok('un PDF glissé sur la bibliothèque s’ouvre dans la visionneuse : pas de plan raté, le voile du dépôt retombe', G.vu && G.ajouts === 0 && !G.depot && G.n === 8, JSON.stringify(G));
  await p.keyboard.press('Escape');

  // ---- 5. cinquante pages : on ouvre tout de suite, les vignettes se rendent quand elles paraissent
  const grand = await imprimer(`<!doctype html><html><head><meta charset="utf-8"><style>@page{size:420mm 297mm;margin:0}html,body{margin:0}svg{display:block;width:404mm;height:281mm;margin:8mm;page-break-after:always}</style></head><body>${Array.from({ length: 50 }, (_, i) => V[i % 6].svg).join('')}</body></html>`, 'cinquante.pdf');
  const t0 = Date.now(); await p.evaluate(async b64 => { ouvrirPdf(new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], 'cinquante.pdf', { type: 'application/pdf' })); }, fs.readFileSync(grand).toString('base64'));
  await p.waitForFunction(() => PDF.n === 50 && $('pdf-canvas').width > 200 && PDF.rendu.page === 1); const tOuvre = Date.now() - t0; await p.waitForTimeout(600);
  const vig = await p.evaluate(() => PDF.vignettes.size);
  await p.waitForFunction(() => !!PDF.lecture, null, { timeout: 120000 }); const tLu = Date.now() - t0;
  const G50 = await p.evaluate(() => ({ n: PDF.L.length, folios: new Set(PDF.L.map(l => l.page)).size }));
  ok('un PDF de cinquante pages : la première page paraît vite, les vignettes ne se rendent qu’en vue, toutes les pages se lisent', tOuvre < 8000 && vig < 20 && G50.folios === 50 && G50.n > 1500, `page 1 en ${tOuvre} ms · ${vig} vignettes rendues · lu en ${Math.round(tLu / 1000)} s · ${G50.n} liaisons`);
  await p.keyboard.press('Escape');

  // ---- 6. un PDF SCANNÉ (une image : du gris, du bruit, un léger angle) : il se dit scanné, on relie à la main
  const scan = await p.evaluate(async b64 => { const lib = pdfjsPret(), doc = await lib.getDocument({ data: Uint8Array.from(atob(b64), c => c.charCodeAt(0)), isEvalSupported: false }).promise, pg = await doc.getPage(1), k = 170 / 72, vp = pg.getViewport({ scale: k });
    const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height; const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); await pg.render({ canvasContext: g, viewport: vp }).promise;
    const sc = document.createElement('canvas'); sc.width = cv.width; sc.height = cv.height; const h = sc.getContext('2d'); h.fillStyle = '#f2f1ea'; h.fillRect(0, 0, sc.width, sc.height); h.translate(sc.width / 2, sc.height / 2); h.rotate(0.4 * Math.PI / 180); h.drawImage(cv, -cv.width / 2, -cv.height / 2);
    const im = h.getImageData(0, 0, sc.width, sc.height), d = im.data; let s = 7; for (let j = 0; j < d.length; j += 4) { s = (s * 16807) % 2147483647; const v = Math.max(0, Math.min(255, 0.3 * d[j] + 0.59 * d[j + 1] + 0.11 * d[j + 2] + (s / 2147483647 - 0.5) * 50)); d[j] = d[j + 1] = d[j + 2] = v; }
    h.putImageData(im, 0, 0); return sc.toDataURL('image/jpeg', 0.85); }, fs.readFileSync(banc[0].fichier).toString('base64'));
  const fscan = await imprimer(`<!doctype html><html><head><style>@page{size:420mm 297mm;margin:0}html,body{margin:0}img{display:block;width:420mm;height:297mm}</style></head><body><img src="${scan}"></body></html>`, 'scan.pdf');
  await ouvrir(fscan);
  const SC = await p.evaluate(() => ({ scannees: PDF.lecture.scannees, n: PDF.L.length, dit: ($('pdf-relecture').querySelector('.pdf-scan') || {}).textContent || '', excel: $('pdf-relecture').querySelector('[data-pdf="plan"]').disabled }));
  ok('un PDF scanné se dit scanné (aucun texte) : la relecture propose de relier à la main', SC.scannees === 1 && SC.n === 0 && /Page scannée/.test(SC.dit) && SC.excel, JSON.stringify(SC).slice(0, 160));
  if (IMG) await p.screenshot({ path: path.join(IMG, 'pdf-scan.png') });
  // relier à la main : un clic sur une borne (102CB1:1, le disjoncteur), un clic sur l'autre (101BT1:A1) ; au clavier
  await p.click('#pdf-relecture [data-pdf="assiste"]'); await p.waitForTimeout(200);
  const pos = await p.evaluate(() => { const r = $('pdf-feuille').getBoundingClientRect(), [w] = taillePage(), k = r.width / w; return { r: [r.left, r.top], k }; });
  // les deux bornes, lues sur le PDF vectoriel du même folio (en points), tournées comme le scan
  const vrai = await p.evaluate(async b64 => { const doc = await pdfjsPret().getDocument({ data: Uint8Array.from(atob(b64), c => c.charCodeAt(0)) }).promise, pg = await doc.getPage(1), vp = pg.getViewport({ scale: 1 }), tc = await pg.getTextContent();
    const M = SCHEMA_PDF.motsDesTextes(tc.items, vp.transform), cb = M.find(m => m.s === '102CB1'), bt = M.find(m => m.s === '101BT1'); return { cb: cb.c, bt: bt.c, w: vp.width, h: vp.height }; }, fs.readFileSync(banc[0].fichier).toString('base64'));
  const versEcran = q => { const a = 0.4 * Math.PI / 180, cx = vrai.w / 2, cy = vrai.h / 2, x = q[0] - cx, y = q[1] - cy; return [pos.r[0] + (x * Math.cos(a) - y * Math.sin(a) + cx) * pos.k, pos.r[1] + (x * Math.sin(a) + y * Math.cos(a) + cy) * pos.k]; };
  const [x1, y1] = versEcran([vrai.cb[0] + 40, vrai.cb[1] - 6]); await p.mouse.click(x1, y1); await p.waitForTimeout(250);
  await p.keyboard.type('102CB1'); await p.keyboard.press('Tab'); await p.keyboard.type('1'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  const [x2, y2] = versEcran([vrai.bt[0] - 30, vrai.bt[1] - 6]); await p.mouse.click(x2, y2); await p.waitForTimeout(250);
  const prop = await p.evaluate(() => ({ r: $('pdf-saisie').querySelector('[name=r]').value, b: $('pdf-saisie').querySelector('[name=b]').value, liste: [...$('pdf-reperes').options].map(o => o.value) }));
  await p.fill('#pdf-saisie [name=r]', '101BT1'); await p.fill('#pdf-saisie [name=b]', 'A1'); await p.press('#pdf-saisie [name=b]', 'Enter'); await p.waitForTimeout(300);
  const AS = await p.evaluate(() => { const l = PDF.L[PDF.L.length - 1]; return { n: PDF.L.length, l: l && [l.de, l.borneDe, l.vers, l.borneVers, l.folio].join(' '), plan: !$('pdf-relecture').querySelector('[data-pdf="plan"]').disabled, trait: document.querySelectorAll('#pdf-calque .pdf-trait').length }; });
  ok('relier à la main, au clavier : un clic, le repère, Tab, la borne, Entrée ; un clic sur l’autre borne, Entrée — la liaison est là, surlignée, et la liste des repères garde ce qui est déjà saisi', AS.n === 1 && AS.l === '102CB1 1 101BT1 A1 1' && AS.plan && AS.trait === 1 && prop.liste.includes('102CB1'), JSON.stringify({ AS, prop }));
  if (IMG) await p.screenshot({ path: path.join(IMG, 'pdf-assiste.png') });
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.waitForTimeout(200);

  // ---- 7. le dépôt d'un PDF passe par `ouvrirFichier` (Ctrl+O, « Vos fichiers ») ; rien n'est sorti sur le réseau
  await p.evaluate(async b64 => { await ouvrirFichier(new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], 'par-ouvrir.pdf', { type: 'application/pdf' })); }, fs.readFileSync(banc[1].fichier).toString('base64'));
  await p.waitForFunction(() => PDF.nom === 'par-ouvrir.pdf' && PDF.lecture);
  ok('un PDF ouvert comme un fichier (Ctrl+O, « Vos fichiers ») va à la visionneuse', await p.evaluate(() => !$('pdf').hidden && PDF.L.length === 20));
  await p.keyboard.press('Escape'); await p.evaluate(() => ficheFichiers('retest')); await p.waitForTimeout(300);
  ok('« Vos fichiers » : la carte du retest propose de lire un schéma en PDF', await p.evaluate(() => !!document.querySelector('#vf-retest [data-vf="pdf"]')));
  ok('aucune requête réseau (le contexte est hors ligne : pdf.js, son worker, les polices, tout est dans le fichier)', reseau.length === 0, reseau.slice(0, 3).join(' '));
  ok('aucune erreur dans la console', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));

  const ko = out.filter(x => x.startsWith('  KO')).length;
  console.log('\n  ' + (out.length - ko) + ' / ' + out.length + ' contrôles passés' + (ko ? '  — ' + ko + ' échec(s)' : ''));
  await b.close(); fs.rmSync(TMP, { recursive: true, force: true }); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('ÉCHEC', e); process.exit(1); });
