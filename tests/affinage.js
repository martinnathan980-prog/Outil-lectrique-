/* ===========================================================================
   AFFINAGE — la recherche profonde tourne en arrière-plan, et se garde.
   ---------------------------------------------------------------------------
       node tests/affinage.js [--fichier=chemin]

   Sous pilote automatique, l'affinage dort (les bancs mesurent le concours,
   déterministe) : on le réveille (`atelier.affinage(true)`) et on vérifie
     · que le moteur se refait en Worker depuis son <script id="moteur"> ;
     · qu'un folio s'affine jusqu'au bout, sans erreur, et que le dessin
       affiché reste sain ;
     · que le résultat SE GARDE : après rechargement, le folio revient
       affiné aussitôt, sans recalcul.
   Rend 1 au premier échec.
   =========================================================================== */
const { chromium } = require('playwright');
const P = require('./pilote');
const FICHIER = P.fichierDemande();

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await nav.newContext(), page = await ctx.newPage(); page.setDefaultTimeout(600000);
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  let ko = 0; const ok = (c, nom, detail) => { if (!c) ko++; console.log('  ' + (c ? 'ok ' : 'KO ') + ' ' + nom + (detail ? '   ' + detail : '')); };
  await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined'); await page.evaluate(() => atelier.exemple());   // l’outil s’ouvre sur l’accueil (plus sur l’exemple) : la batterie, qui lit l’exemple, le demande
  const dort = await page.evaluate(() => atelier.etatAffinage().actif === false);
  ok(dort, 'endormi sous pilote automatique');
  // le folio 1 de l'exemple : petit, il s'affine en quelques secondes
  await page.evaluate(() => { app.plan = '1'; app.choisi = null; redessiner(); });
  const e0 = await page.evaluate(() => atelier.affinage(true));
  ok(e0.actif, 'réveillé', JSON.stringify(e0));
  await page.waitForFunction(() => { const e = atelier.etatAffinage(); return e.worker === 'refusé' || e.finis >= 1; }, null, { timeout: 600000 });
  const e1 = await page.evaluate(() => atelier.etatAffinage());
  ok(e1.worker === 'oui', 'le moteur tourne en Worker', JSON.stringify(e1));
  ok(!e1.erreur, 'le moteur en Worker ne lève aucune erreur', e1.erreur || '');
  ok(e1.finis >= 1, 'le folio affiché est affiné jusqu\'au bout');
  const m = await page.evaluate(P.mesurerDansLaPage);
  ok(!m.filsDansBloc && !m.chevauches && !m.superposees && !m.rompus, 'le dessin affiché reste sain', JSON.stringify({ droits: m.taux, crois: m.croisements }));
  // la garde : on recharge, on réveille, le folio revient affiné sans recalcul
  await page.waitForTimeout(500);
  await page.reload(); await page.waitForFunction(() => typeof atelier !== 'undefined');
  await page.evaluate(() => { app.plan = '1'; app.choisi = null; redessiner(); atelier.affinage(true); });
  const garde = await page.waitForFunction(() => atelier.etatAffinage().finis >= 1, null, { timeout: 20000 }).then(() => true, () => false);
  ok(garde, 'le folio affiné se garde d\'une session à l\'autre');
  ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
  console.log('\n  ' + (ko ? ko + ' échec(s)' : 'tout tient'));
  await nav.close(); process.exit(ko ? 1 : 0);
})();
