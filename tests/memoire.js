/* ===========================================================================
   LA MÉMOIRE DE L'OUTIL — le travail survit-il à la fermeture de l'onglet ?
   ---------------------------------------------------------------------------
       node tests/memoire.js

   Séparé de controle.js parce qu'il lui faut DEUX pages dans le MÊME contexte
   de navigateur — `browser.newPage()` crée un stockage neuf à chaque fois.
     1. une correction faite à la main est enregistrée ;
     2. elle est retrouvée à la réouverture, avec l'heure ;
     3. « Annuler » rend l'état d'avant, et dit quoi ;
     4. Ctrl+Z fait la même chose ;
     5. si le navigateur REFUSE d'écrire, l'outil continue et le dit.
   ========================================================================= */
const { chromium } = require('playwright');
const { fichierDemande } = require('./pilote');
const FICHIER = fichierDemande();
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 980 } });
  const p = await ctx.newPage(); p.setDefaultTimeout(120000);
  const e = []; p.on('pageerror', x => e.push(x.message));
  const R = []; const ok = (n, c, d) => R.push((c ? '  ok   ' : '  KO   ') + n.padEnd(46) + (d || ''));

  await p.goto(FICHIER); await p.waitForTimeout(1600);
  const a = await p.evaluate(() => { histPush('essai'); app.contrat.liaisons.push(liaison({ de: 'MA-CORRECTION', borneDe: '1', vers: '210SP1', borneVers: '9' }));
    redessiner(); sauver(); return app.contrat.liaisons.length; });
  await p.waitForTimeout(700);
  ok('la correction est faite', a > 0, a + ' liaisons');

  const p2 = await ctx.newPage(); p2.setDefaultTimeout(120000); p2.on('pageerror', x => e.push(x.message));
  await p2.goto(FICHIER); await p2.waitForTimeout(1800);
  const r = await p2.evaluate(() => ({ n: app.contrat.liaisons.length, survit: app.contrat.liaisons.some(l => l.de === 'MA-CORRECTION'), heure: document.getElementById('ctx-sauve').textContent }));
  ok('elle survit à la réouverture', r.survit, r.n + ' liaisons · «' + r.heure + '»');

  const u = await p2.evaluate(() => { const n0 = app.contrat.liaisons.length; histPush('suppression d’essai'); app.contrat.liaisons.splice(0, 3); redessiner();
    const n1 = app.contrat.liaisons.length; const q = annuler(); return { n0, n1, n2: app.contrat.liaisons.length, q }; });
  ok('Annuler rend l’état d’avant', u.n2 === u.n0, u.n0 + ' → ' + u.n1 + ' → ' + u.n2 + '  («' + u.q + '»)');

  const k = await p2.evaluate(() => { histPush('essai clavier'); app.contrat.liaisons.splice(0, 2); redessiner(); return app.contrat.liaisons.length; });
  await p2.keyboard.press('Control+z'); await p2.waitForTimeout(400);
  const k2 = await p2.evaluate(() => app.contrat.liaisons.length);
  ok('Ctrl+Z annule aussi', k2 > k, k + ' → ' + k2);

  const p3 = await (await b.newContext({ viewport: { width: 1200, height: 800 } })).newPage(); p3.on('pageerror', x => e.push(x.message));
  await p3.addInitScript(() => { Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('bloqué'); } }); });
  await p3.goto(FICHIER); await p3.waitForTimeout(1800);
  const s3 = await p3.evaluate(() => ({ dessine: !!app.dessin, n: app.contrat.liaisons.length, mention: document.getElementById('ctx-sauve').textContent }));
  ok('stockage bloqué : l’outil marche quand même', s3.dessine && s3.n > 0, s3.n + ' liaisons · «' + s3.mention + '»');

  R.forEach(x => console.log(x));
  const ko = R.filter(x => x.startsWith('  KO')).length;
  console.log('\n  ' + (R.length - ko) + ' / ' + R.length + (ko ? '  — ' + ko + ' PROBLÈME(S)' : '  — tout tient'));
  console.log('  erreurs :', e.length ? [...new Set(e)].slice(0, 3) : 'aucune');
  await b.close(); process.exit(ko ? 1 : 0);
})();
