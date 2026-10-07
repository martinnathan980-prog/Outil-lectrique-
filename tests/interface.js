/* ===========================================================================
   INTERFACE — le plan n'est jamais recouvert, chaque dédoublement est une barrette.
       node tests/interface.js [--fichier=chemin]

   À la vraie souris, sur le grand écran puis sur un téléphone :
     · un clic sur un équipement ouvre sa fiche dans l'INSPECTEUR, à droite ;
       la feuille se recadre à côté : aucun coin de la feuille sous lui ;
     · un clic sur un fil ouvre la fiche du fil ;
     · B ouvre le TABLEAU en tiroir en bas : la feuille se recadre au-dessus ;
     · Échap ferme la fiche, puis le tableau ;
   et, sur chaque folio, chaque barrette à poser (plusieurs fils sur une même
   borne) a son repère et autant de pastilles que de fils, raccord compris.
   Rend 1 au premier échec.
   =========================================================================== */
const { chromium } = require('playwright');
const P = require('./pilote');
const FICHIER = P.fichierDemande();

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  let ko = 0; const ok = (c, nom, detail) => { if (!c) ko++; console.log('  ' + (c ? 'ok ' : 'KO ') + ' ' + nom + (detail ? '   ' + detail : '')); };
  for (const [titre, vp] of [['grand écran', { width: 1600, height: 950 }], ['téléphone', { width: 390, height: 844 }]]) {
    console.log('\n' + titre);
    const page = await nav.newPage({ viewport: vp }); page.setDefaultTimeout(300000);
    const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
    await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined');
    await page.evaluate(() => { app.plan = '1'; if (app.base.ouvert) fermerBase(); redessiner(); ajuster(); }); await page.waitForTimeout(400);
    // la feuille à l'écran, et ce qui la recouvre
    const recouvre = () => page.evaluate(() => { const bb = app.dessin.bbox, r = $('planche').getBoundingClientRect(), s = app.vue.s;
      const F = { x0: r.left + app.vue.tx + bb.x * s, y0: r.top + app.vue.ty + bb.y * s }; F.x1 = F.x0 + bb.w * s; F.y1 = F.y0 + bb.h * s;
      return ['inspecteur', 'base'].filter(id => !$(id).hidden).map(id => { const q = $(id).getBoundingClientRect();
        const dx = Math.min(F.x1, q.right) - Math.max(F.x0, q.left), dy = Math.min(F.y1, q.bottom) - Math.max(F.y0, q.top);
        return dx > 2 && dy > 2 ? id + ' ' + Math.round(dx) + '×' + Math.round(dy) : null; }).filter(Boolean); });
    const ecran = (x, y) => page.evaluate(([x, y]) => { const r = $('planche').getBoundingClientRect(); return { x: r.left + app.vue.tx + x * app.vue.s, y: r.top + app.vue.ty + y * app.vue.s }; }, [x, y]);
    const c = await page.evaluate(() => { const k = app.dessin.comps.find(c => c.name === '103RL1'); return [k.x + k.w / 2, k.y + k.h / 2]; });
    let e = await ecran(...c); await page.mouse.click(e.x, e.y); await page.waitForTimeout(500);
    ok(await page.evaluate(() => !$('inspecteur').hidden && $('eq-rep') && $('eq-rep').value === '103RL1'), 'un clic sur 103RL1 ouvre sa fiche');
    let r = await recouvre(); ok(!r.length, 'la feuille n’est pas sous l’inspecteur', r.join(' '));
    ok(await page.evaluate(() => $('base').hidden), 'le tableau reste fermé');
    const f = await page.evaluate(() => { const w = app.dessin.fils.find(w => w.cable === 'W-014'); const [a, b] = w.pts; return [(a.x + b.x) / 2, (a.y + b.y) / 2]; });
    e = await ecran(...f); await page.mouse.click(e.x, e.y); await page.waitForTimeout(500);
    ok(await page.evaluate(() => app.cible && app.cible.type === 'fil' && $('ba-equip').textContent.includes('W-014')), 'un clic sur W-014 ouvre la fiche du fil');
    await page.keyboard.press('b'); await page.waitForTimeout(600);
    ok(await page.evaluate(() => !$('base').hidden), 'B ouvre le tableau');
    r = await recouvre(); ok(!r.length, 'la feuille n’est ni sous l’inspecteur ni sous le tableau', r.join(' '));
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    ok(await page.evaluate(() => $('inspecteur').hidden && !app.cible), 'Échap ferme la fiche');
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    ok(await page.evaluate(() => $('base').hidden), 'Échap encore ferme le tableau');
    ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
    await page.close();
  }
  // chaque dédoublement : une barrette, un repère, une pastille par fil
  console.log('\nbarrettes à poser');
  const page = await nav.newPage(); await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined');
  const vts = await page.evaluate(() => plans().flatMap(pl => { app.plan = pl; redessiner(); const B = app.dessin.barrettes; nommerBarrettesAPoser(B);
    const L = liaisonsDuPlan(); return B.map(b => { const fils = L.filter(l => (l.de === b.propre && String(l.borneDe) === b.etiquette) || (l.vers === b.propre && String(l.borneVers) === b.etiquette)).length;
      const svg = $('svg').innerHTML; return { pl, nom: b.nomVT, ou: b.propre + ':' + b.etiquette, fils, pastilles: contactsDePiquage(b).length, ecrit: svg.includes('>' + b.nomVT + '</text>') }; }); }));
  ok(vts.length > 0, 'l’exemple a des dédoublements', vts.length + ' barrettes à poser');
  vts.forEach(v => ok(v.pastilles === v.fils + 1 && v.ecrit, `folio ${v.pl} · ${v.nom} (${v.ou}) : ${v.fils} fils + le raccord = ${v.fils + 1} pastilles, repère écrit`, v.pastilles + ' pastilles'));
  console.log('\n  ' + (ko ? ko + ' échec(s)' : 'tout tient'));
  await nav.close(); process.exit(ko ? 1 : 0);
})();
