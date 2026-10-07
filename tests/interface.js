/* ===========================================================================
   INTERFACE — le plan n'est jamais recouvert, chaque dédoublement est une barrette.
       node tests/interface.js [--fichier=chemin]

   À la vraie souris, sur le grand écran puis sur un téléphone :
     · un clic sur un équipement ouvre sa fiche dans l'INSPECTEUR, à droite ;
       la feuille se recadre à côté : aucun coin de la feuille sous lui ;
     · un clic sur un fil ouvre la fiche du fil ;
     · B ouvre le TABLEAU en tiroir en bas : la feuille se recadre au-dessus ;
       « Ce folio » n'y montre que les liaisons du folio affiché ;
     · Échap ferme la fiche, puis le tableau.
   Puis, sur chaque folio, chaque BARRETTE À POSER (plusieurs fils sur une même
   borne d'équipement) : une vraie barrette, une colonne, une borne par fil —
   le fil à créer compris —, jamais deux fils au même niveau ; plus aucune
   borne d'équipement ne porte deux fils sur le plan. Enfin, la poser au
   contrat sous un vrai repère, et Ctrl+Z la rend.
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
    ok(await page.evaluate(() => { app.base.filtre = ''; app.base.portee = 'folio'; rendreBase(); const n = $('ba-tbody').querySelectorAll('tr[data-i]').length;
      return n === verite().filter(l => l.plan === '1').length && n > 0; }), '« Ce folio » montre les liaisons du folio 1, rien d’autre');
    r = await recouvre(); ok(!r.length, 'la feuille n’est ni sous l’inspecteur ni sous le tableau', r.join(' '));
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    ok(await page.evaluate(() => $('inspecteur').hidden && !app.cible), 'Échap ferme la fiche');
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    ok(await page.evaluate(() => $('base').hidden), 'Échap encore ferme le tableau');
    ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
    await page.close();
  }
  // chaque dédoublement : une vraie barrette, une borne par fil, jamais deux fils au même niveau
  console.log('\nbarrettes à poser');
  const page = await nav.newPage({ viewport: { width: 1600, height: 950 } }); const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined');
  const vts = await page.evaluate(() => plans().flatMap(pl => { app.plan = pl; redessiner(); const L = liaisonsDuPlan(), svg = $('svg').innerHTML;
    // plus aucune borne d'équipement à deux fils sur le plan
    const n = new Map(); L.forEach(l => { if (l.de === l.vers) return; [[l.de, l.borneDe], [l.vers, l.borneVers]].forEach(([r, b]) => { if (!r || !b || estBornier(r) || estMasse(r)) return; const k = r + ':' + b; n.set(k, (n.get(k) || 0) + 1); }); });
    const doubles = [...n].filter(([, k]) => k > 1).map(([k]) => k);
    return app.dessin.comps.filter(c => VT_A_POSER.test(c.name) && c.kind !== 'tag').map(c => { const bornes = Object.values(c.rangs || {}).flat();
      const fils = L.filter(l => l.origine && (l.de === c.name || l.vers === c.name)).length, ys = bornes.map(p => Math.round(p.y * 2));
      return { pl, nom: c.name, fils, bornes: bornes.length, distinctes: new Set(ys).size === ys.length, ecrit: svg.includes('>' + c.name + '</text>'), doubles }; })
      .concat(doubles.length ? [{ pl, nom: '—', doubles }] : []); }));
  ok(vts.length > 0, 'l’exemple a des dédoublements', vts.length + ' barrettes à poser');
  vts.forEach(v => v.nom === '—' ? ok(false, `folio ${v.pl} : des bornes d’équipement portent encore deux fils`, v.doubles.join(' '))
    : ok(v.bornes === v.fils + 1 && v.distinctes && v.ecrit && !v.doubles.length, `folio ${v.pl} · ${v.nom} : ${v.fils} fils + le fil à créer = ${v.fils + 1} bornes, chacune à sa hauteur, repère écrit`, v.bornes + ' bornes'));
  // la fiche de VT1, puis la poser au contrat sous un vrai repère, et la reprendre
  await page.evaluate(() => { app.plan = '1'; redessiner(); ajuster(); choisirBloc(app.dessin.comps.find(k => k.name === 'VT1' && k.kind !== 'tag')); }); await page.waitForTimeout(300);
  ok(await page.evaluate(() => /À poser/.test($('ba-equip').textContent) && $('ba-equip').querySelectorAll('.fi-fil').length === 3), 'la fiche de VT1 : à poser, trois bornes');
  await page.fill('#eq-rep', '102VT9'); await page.press('#eq-rep', 'Enter'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => { const L = app.contrat.liaisons.filter(l => l.de === '102VT9' || l.vers === '102VT9');
    return L.length === 5 && L.some(l => l.de === '102CB1' && l.borneDe === '2' && l.borneVers === '1' && !l.cable) && app.dessin.comps.some(c => c.name === '102VT9') && !app.dessin.comps.some(c => c.name === 'VT1'); }),
    'VT1 posée sous 102VT9 : le fil à créer, les deux fils, deux shunts — dessinée comme avant');
  await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => app.contrat.liaisons.length === 201 && app.dessin.comps.some(c => c.name === 'VT1')), 'Ctrl+Z rend VT1');
  // survoler une ligne de la fiche allume son fil sur le plan
  await page.evaluate(() => { choisirBloc(app.dessin.comps.find(k => k.name === '103RL1' && k.kind !== 'tag')); }); await page.waitForTimeout(300);
  const li = await page.locator('#ba-equip .fi-fil[data-i]').first().boundingBox(); await page.mouse.move(li.x + li.width / 2, li.y + li.height / 2); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !!document.querySelector('#scene.focus') && !!document.querySelector('#ba-equip .fi-fil.vise')), 'survoler un fil de la fiche l’allume sur le plan');
  // la pastille de contrôle : son état, sa liste, et une ligne qui mène au bloc, sur son folio
  await page.keyboard.press('Escape'); await page.click('#co-bouton'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => /problème/.test($('co-etat').textContent) && $('co-liste').querySelectorAll('.co-item').length === CONTROLE.items.length && CONTROLE.items.some(x => x.nom === 'VT1')),
    'la pastille de contrôle dit l’état du contrat ; sa liste a chaque point, les barrettes à poser comprises');
  await page.locator('.co-item', { hasText: '300XC1' }).click(); await page.waitForTimeout(600);
  ok(await page.evaluate(() => app.plan === '3' && app.cible && app.cible.nom === '300XC1' && !$('inspecteur').hidden && $('co-liste').hidden), 'une ligne mène au folio 3 et à la fiche de 300XC1');
  ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
  console.log('\n  ' + (ko ? ko + ' échec(s)' : 'tout tient'));
  await nav.close(); process.exit(ko ? 1 : 0);
})();
