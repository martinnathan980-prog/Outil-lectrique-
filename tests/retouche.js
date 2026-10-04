/* ===========================================================================
   RETOUCHE — un bloc se déplace à la souris, tout suit, et ça se garde.
   ---------------------------------------------------------------------------
       node tests/retouche.js [--fichier=chemin]

   Sur le folio 3 de l'exemple, à la vraie souris :
     · un bloc pris et glissé descend, ses fils se reroutent, le dessin reste
       sain (aucun fil dans un bloc, aucun chevauchement, aucun fil rompu) ;
     · il ne vient jamais à moins de huit unités d'un voisin de sa colonne ;
     · le folio est marqué retouché (« automatique » paraît) ;
     · Ctrl+Z défait le geste ;
     · refait, il SE GARDE : après rechargement, le bloc est où on l'a mis ;
     · « automatique » rend le dessin du moteur ;
     · un clic sans glisser choisit toujours le bloc.
   Rend 1 au premier échec.
   =========================================================================== */
const { chromium } = require('playwright');
const P = require('./pilote');
const FICHIER = P.fichierDemande();

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await nav.newContext({ viewport: { width: 1500, height: 950 } }), page = await ctx.newPage(); page.setDefaultTimeout(300000);
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  let ko = 0; const ok = (c, nom, detail) => { if (!c) ko++; console.log('  ' + (c ? 'ok ' : 'KO ') + ' ' + nom + (detail ? '   ' + detail : '')); };
  const ouvrir = async () => { await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined');
    await page.evaluate(() => { app.plan = '3'; app.choisi = null; redessiner(); ajuster(); }); await page.waitForTimeout(400); };
  // le centre d'un bloc à l'écran, et sa hauteur dans le dessin
  const bloc = nom => page.evaluate(nom => { const c = app.dessin.comps.find(k => k.name === nom); const r = $('planche').getBoundingClientRect();
    return { x: r.left + app.vue.tx + (c.x + c.w / 2) * app.vue.s, y: r.top + app.vue.ty + (c.y + c.h / 2) * app.vue.s, cy: c.y, s: app.vue.s }; }, nom);
  const glisser = async (nom, dyEcran) => { const b = await bloc(nom); await page.mouse.move(b.x, b.y); await page.mouse.down();
    for (let k = 1; k <= 8; k++) { await page.mouse.move(b.x, b.y + dyEcran * k / 8); await page.waitForTimeout(30); }
    await page.mouse.up(); await page.waitForTimeout(300); };
  const sain = async () => { const m = await page.evaluate(P.mesurerDansLaPage); return !m.filsDansBloc && !m.chevauches && !m.superposees && !m.rompus; };
  const colles = () => page.evaluate(P.blocsCollesDansLaPage);
  const auto = () => page.evaluate(() => !$('btnAuto').hidden);

  await ouvrir();
  // un bloc qui a de la place sous lui : le plus bas de sa colonne
  const nom = await page.evaluate(() => { const cs = app.dessin.comps.filter(c => c.kind === 'equip' && !c.hub);
    const bas = cs.filter(c => !cs.some(o => o !== c && o.col === c.col && o.y > c.y)); return bas.sort((a, b) => a.y - b.y)[0].name; });
  const avant = await bloc(nom);
  await glisser(nom, 90);
  const apres = await bloc(nom);
  ok(apres.cy > avant.cy + 5, nom + ' a descendu à la souris', Math.round(avant.cy) + ' → ' + Math.round(apres.cy));
  ok(await sain(), 'le dessin retouché reste sain');
  ok(!(await colles()).length, 'aucun bloc collé à un autre');
  ok(await auto(), 'le folio est marqué retouché');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(300);
  ok(Math.abs((await bloc(nom)).cy - avant.cy) < 0.5, 'Ctrl+Z défait le geste');
  ok(!(await auto()), 'plus marqué retouché après Ctrl+Z');
  // très loin vers le haut : il s'arrête contre son voisin, ou au bord de la zone utile de la feuille
  await glisser(nom, -2000);
  ok(!(await colles()).length, 'poussé contre son voisin, il s\'arrête à huit unités');
  ok(await page.evaluate(n => { const c = app.dessin.comps.find(k => k.name === n), bb = app.dessin.bbox; return c.y >= bb.y + (PAGE_CADRE + PAGE_MARGE) * bb.k - 0.5; }, nom), 'il reste sur la feuille');
  ok(await sain(), 'toujours sain');
  await glisser(nom, 60); const garde = await bloc(nom);
  await page.waitForTimeout(600);
  await ouvrir(); await page.waitForTimeout(800);
  ok(Math.abs((await bloc(nom)).cy - garde.cy) < 0.5, 'la retouche se garde d\'une session à l\'autre', Math.round(garde.cy) + ' après rechargement : ' + Math.round((await bloc(nom)).cy));
  await page.click('#btnAuto'); await page.waitForTimeout(400);
  ok(Math.abs((await bloc(nom)).cy - avant.cy) < 0.5 && !(await auto()), '« automatique » rend le dessin du moteur');
  const b = await bloc(nom); await page.mouse.click(b.x, b.y); await page.waitForTimeout(200);
  ok(await page.evaluate(n => app.choisi === n, nom), 'un clic sans glisser choisit le bloc');
  ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
  console.log('\n  ' + (ko ? ko + ' échec(s)' : 'tout tient'));
  await nav.close(); process.exit(ko ? 1 : 0);
})();
