/* ===========================================================================
   RELIEF — la vue en perspective d'une barrette, d'une prise de coupure.
   ---------------------------------------------------------------------------
       node tests/relief.js [--fichier=chemin]

   Pour chaque barrette et chaque prise de l'exemple :
     · la vue s'ouvre, dessine autant de fils que la pièce a de trous
       occupés, et une étiquette par fil, au numéro du contrat ;
     · aucune étiquette n'en chevauche une autre ;
     · le tableau a une ligne par module (ou contact) ;
   puis, sur l'une d'elles : un glissé fait tourner la pièce, le survol d'un
   fil l'allume, Échap ferme, un double-clic sur le bloc du plan rouvre.
   Rend 1 au premier échec.
   =========================================================================== */
const { chromium } = require('playwright');
const P = require('./pilote');
const FICHIER = P.fichierDemande();

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await nav.newPage({ viewport: { width: 1440, height: 1000 } }); page.setDefaultTimeout(300000);
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  let ko = 0; const ok = (c, nom, detail) => { if (!c) ko++; console.log('  ' + (c ? 'ok ' : 'KO ') + ' ' + nom + (detail ? '   ' + detail : '')); };
  await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined');
  const pieces = await page.evaluate(() => { const out = []; plans().forEach(p => { app.plan = p; app.choisi = null; redessiner();
    new Set(app.dessin.comps.filter(c => c.kind !== 'tag' && estBornier(c.name)).map(c => c.name)).forEach(n => out.push([p, n])); }); return out; });
  for (const [plan, nom] of pieces) {
    const r = await page.evaluate(([plan, nom]) => { app.plan = plan; app.choisi = null; redessiner(); ouvrirRelief(nom);
      const P = RELIEF.P, attendus = P.modules.reduce((n, m) => n + ['amont', 'aval'].reduce((k, s) => k + trousDe(m, filsDuModule(nom, m), s).filter(Boolean).length, 0), 0);
      const fils = document.querySelectorAll('#re-svg .re-fil').length, etiq = [...document.querySelectorAll('#re-svg .re-etiq')];
      const boites = etiq.map(g => { const [a, b] = [...g.querySelectorAll('text')].map(t => t.getBBox()); const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y); return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y }; }), chevauche = boites.some((a, i) => boites.some((b, j) => j > i && a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1));
      const cables = etiq.map(g => g.querySelector('.re-cable').textContent), lignes = document.querySelectorAll('#re-tableau tbody tr').length;
      const res = { attendus, fils, etiquettes: etiq.length, chevauche, lignes, modules: P.modules.length, cablesOk: cables.every(c => verite().some(l => l.cable === c)) };
      fermerRelief(); return res; }, [plan, nom]);
    ok(r.fils === r.attendus && r.etiquettes === r.attendus && r.cablesOk, nom + ' : un fil et une étiquette par trou occupé', r.fils + ' fils, ' + r.etiquettes + ' étiquettes, ' + r.attendus + ' trous occupés');
    ok(!r.chevauche, nom + ' : aucune étiquette sur une autre');
    ok(r.lignes === r.modules, nom + ' : une ligne par module', r.lignes + ' / ' + r.modules);
  }
  // à la main, sur la première barrette
  const [plan, nom] = pieces.find(([, n]) => /VT/.test(n)) || pieces[0];
  await page.evaluate(([plan, nom]) => { app.plan = plan; app.choisi = null; redessiner(); ajuster(); ouvrirRelief(nom); }, [plan, nom]);
  const avant = await page.evaluate(() => [RELIEF.az, RELIEF.el]);
  const sc = await page.locator('#re-scene').boundingBox();
  await page.mouse.move(sc.x + sc.width / 2, sc.y + sc.height / 2); await page.mouse.down(); await page.mouse.move(sc.x + sc.width / 2 + 80, sc.y + sc.height / 2 + 30, { steps: 6 }); await page.mouse.up();
  const apres = await page.evaluate(() => [RELIEF.az, RELIEF.el]);
  ok(apres[0] !== avant[0] && apres[1] !== avant[1], 'un glissé fait tourner la pièce', avant.map(x => x.toFixed(2)) + ' → ' + apres.map(x => x.toFixed(2)));
  const allume = await page.evaluate(() => { const g = document.querySelector('#re-svg .re-fil'); g.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); return g.classList.contains('on') && !!document.querySelector('#scene.focus'); });
  ok(allume, 'survoler un fil l\'allume dans la vue et sur le plan');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  ok(await page.evaluate(() => $('relief').hidden), 'Échap ferme la vue');
  const b = await page.evaluate(n => { const c = app.dessin.comps.find(k => k.name === n); const r = $('planche').getBoundingClientRect();
    return { x: r.left + app.vue.tx + (c.x + c.w / 2) * app.vue.s, y: r.top + app.vue.ty + (c.y + c.h / 2) * app.vue.s }; }, nom);
  await page.mouse.dblclick(b.x, b.y); await page.waitForTimeout(200);
  ok(await page.evaluate(n => !$('relief').hidden && RELIEF.nom === n, nom), 'un double-clic sur le bloc ouvre sa vue en relief');
  ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
  console.log('\n  ' + (ko ? ko + ' échec(s)' : 'tout tient'));
  await nav.close(); process.exit(ko ? 1 : 0);
})();
