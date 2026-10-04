/* ===========================================================================
   BANC DU CORPUS — l'outil sur des câblages qu'aucun réglage n'a vus.
   ---------------------------------------------------------------------------
       node tests/banc-corpus.js                 tous les cas (quatre graines par profil)
       node tests/banc-corpus.js --cas=deux,trois   les cas de ces profils
       node tests/banc-corpus.js --images=dossier   et une capture de chacun
       node tests/banc-corpus.js --profond=12    chaque cas après douze tours de recherche profonde (lent)

   Les six folios de l'exemple ont servi à régler le moteur ; ce banc dit si
   ce qu'on a corrigé tient ailleurs. Chaque cas (tests/corpus.js : une
   graine, un profil) est dessiné, mesuré, puis relu par les mêmes contrôles
   exacts que les folios de l'exemple : aucun geste évident manqué (échange
   de deux bornes, changement de flanc, glissement), aucun bloc illisible,
   aucun corps étiré sans raison, le calculateur seul dans sa colonne et au
   centre, aucun bloc collé à un autre, aucune borne sur une autre, aucun
   fil rompu, aucun segment partagé, aucune marche.

   C'est une MESURE : il rend 1 seulement si un invariant sacré est violé
   (fil dans un bloc, chevauchement, borne sur une autre, fil rompu, segment
   partagé, marche) ; les défauts de lisibilité se lisent dans le rapport.
   =========================================================================== */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const P = require('./pilote');
const { genererDansLaPage, PROFILS } = require('./corpus');

const FICHIER = P.fichierDemande();
const arg = k => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : null; };
const IMAGES = arg('images'), PROFOND = +(arg('profond') || 0);
const CAS = [];
PROFILS.forEach((profil, i) => { for (let k = 0; k < 4; k++) CAS.push([1000 + 37 * i + 101 * k, profil]); });
const CHOISIS = arg('cas') ? CAS.filter(([, p]) => arg('cas').split(',').includes(p)) : CAS;

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await nav.newPage({ viewport: { width: 1500, height: 980 } }); page.setDefaultTimeout(600000);
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined');
  await page.evaluate(P.preparerDansLaPage);
  if (IMAGES) fs.mkdirSync(IMAGES, { recursive: true });
  const lignes = []; let faux = 0, defautsTotal = 0, sD = 0, sF = 0, sC = 0;
  for (const [graine, profil] of CHOISIS) {
    const nom = profil + '-' + graine, t0 = Date.now();
    const L = await page.evaluate(genererDansLaPage, [graine, profil]);
    // --profond=N : le dessin de la recherche profonde (N tours), celui que l'affinage montre ensuite dans l'outil
    await page.evaluate(([L, N]) => { if (N) { const LL = L.map(liaison).filter(liaisonComplete); affinage.profonds.set(clePlacement(LL), placementProfond(LL, N)); }
      atelier.charger(L); }, [L, PROFOND]);
    const ms = Date.now() - t0, m = await page.evaluate(P.mesurerDansLaPage);
    const ko = m.filsDansBloc || m.chevauches || m.superposees || m.rompus || m.partages || m.marches; if (ko) faux++;
    const defauts = [];
    const ech = await page.evaluate(P.echangesEvidentsDansLaPage), fl = await page.evaluate(P.flancsEvidentsDansLaPage), gl = await page.evaluate(P.glissementsEvidentsDansLaPage), rd = await page.evaluate(P.redressementsEvidentsDansLaPage);
    ech.manques.forEach(x => defauts.push('échange ' + x)); fl.manques.forEach(x => defauts.push('flanc ' + x)); gl.manques.forEach(x => defauts.push('glissement ' + x)); rd.manques.forEach(x => defauts.push('redressement ' + x));
    (await page.evaluate(P.corpsEtiresDansLaPage)).defauts.forEach(x => defauts.push('étiré ' + x));
    (await page.evaluate(P.calculateurDansLaPage)).defauts.forEach(x => defauts.push('calculateur : ' + x));
    (await page.evaluate(P.blocsCollesDansLaPage)).forEach(x => defauts.push('collés : ' + x));
    const equips = await page.evaluate(() => atelier.dessin().comps.filter(c => c.kind === 'equip').map(c => c.name));
    for (const b of [...new Set(equips)]) (await page.evaluate(P.blocLisibleDansLaPage, b)).forEach(x => defauts.push('illisible ' + b + ' : ' + x));
    defautsTotal += defauts.length; sD += m.taux * m.fils; sF += m.fils; sC += m.croisements;
    lignes.push({ nom, m, ms, defauts, ko });
    console.log((ko ? '✗ ' : '  ') + nom.padEnd(14) + String(m.blocs).padStart(4) + ' blocs' + String(m.fils).padStart(5) + ' fils  '
      + (Math.round(m.taux * 1000) / 10).toFixed(1).padStart(5) + ' % droits' + String(m.croisements).padStart(4) + ' crois.' + String(defauts.length).padStart(4) + ' défauts' + String(ms).padStart(7) + ' ms'
      + (ko ? '   FAUX : fils dans un bloc=' + m.filsDansBloc + ' chevauch=' + m.chevauches + ' bornes superposées=' + m.superposees + ' fils rompus=' + m.rompus + ' partagés=' + m.partages + ' marches=' + m.marches : ''));
    defauts.forEach(x => console.log('      · ' + x));
    if (IMAGES) { const svg = await page.evaluate(() => svgAutonome(atelier.dessin(), app.contrat.cartouche, '1', designationDe).txt);
      const q = await nav.newPage({ viewport: { width: 1680, height: 1188 } });
      await q.setContent('<html><body style="margin:0;background:#fff">' + svg.replace(/^<\?xml[^>]*\?>\s*/, '').replace('<svg', '<svg style="width:1680px;height:1188px"') + '</body></html>');
      await q.screenshot({ path: path.join(IMAGES, nom + '.png') }); await q.close(); }
  }
  console.log('\n  ' + CHOISIS.length + ' cas · ' + (Math.round(1000 * sD / Math.max(1, sF)) / 10).toFixed(1) + ' % de fils droits · ' + sC + ' croisements · ' + defautsTotal + ' défauts de lisibilité · ' + faux + ' cas faux'
    + (erreurs.length ? ' · erreurs console : ' + [...new Set(erreurs)].slice(0, 3).join(' | ') : ''));
  await nav.close(); process.exit(faux || erreurs.length ? 1 : 0);
})();
