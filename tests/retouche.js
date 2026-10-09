/* ===========================================================================
   RETOUCHE — un bloc se déplace à la souris, dans tous les sens, tout suit, et ça se garde.
   ---------------------------------------------------------------------------
       node tests/retouche.js [--fichier=chemin]

   Sur le folio 3 de l'exemple, à la vraie souris :
     · un bloc pris et glissé descend, ses fils se reroutent, le dessin reste
       sain (aucun fil dans un bloc, aucun chevauchement, aucun fil rompu) ;
     · il ne vient jamais à moins de huit unités d'un voisin de sa colonne ;
     · le folio est marqué retouché (« Dessin retouché · rendre au moteur ») ;
     · Ctrl+Z défait le geste ;
     · refait, il SE GARDE : après rechargement, le bloc est où on l'a mis ;
     · « rendre au moteur » rend le dessin du moteur ;
     · un clic sans glisser choisit toujours le bloc, et ne dit rien.
   Sur le folio 1, en LARGEUR comme en hauteur :
     · un bloc tiré loin à droite, hors de toute colonne, y va (au carreau près) et
       devient une colonne à lui ; le routage reste propre : aucun fil dans un bloc
       (le sien compris), aucun segment partagé, aucun fil rompu, aucun numéro de
       fil qui ne s'écrit plus, aucun croisement évitable ; et ça se garde ;
     · un petit pas de côté dans un dessin serré passe : le bloc va où on l'a
       mis, au carreau, et les colonnes voisines s'écartent (le mot le dit) ;
     · lâché sur un voisin : pendant le geste le fantôme est rouge, lâché il va à
       la place libre la plus proche, et le mot le dit (« posé … : la place était
       prise ») ;
     · pendant l'appui, rien ne se sélectionne (user-select: none) ;
     · Alt : le bloc suit la souris sans carreau ni aimant ;
     · un bloc choisi se pousse aux flèches (un carreau ; Maj : cinq), une série
       se défait d'un Ctrl+Z ; sans bloc choisi, la flèche change de folio.
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
  // l’outil s’ouvre sur l’accueil : la première fois, l’exemple se demande ; ensuite le contrat gardé revient
  const ouvrir = async (plan, recharger) => { if (recharger !== false) { await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined'); await page.evaluate(() => app.contrat.liaisons.length || atelier.exemple()); }
    await page.evaluate(plan => { app.plan = plan; app.choisi = null; app.cible = null; redessiner(); ajuster(); }, plan || '3'); await page.waitForTimeout(400); };
  // le centre d'un bloc à l'écran, et sa place dans le dessin
  const bloc = nom => page.evaluate(nom => { const c = app.dessin.comps.find(k => k.name === nom && k.kind !== 'tag'); const r = $('planche').getBoundingClientRect();
    return { x: r.left + app.vue.tx + (c.x + c.w / 2) * app.vue.s, y: r.top + app.vue.ty + (c.y + Math.min(c.h / 2, 25)) * app.vue.s, cx: c.x, cy: c.y, col: c.col, s: app.vue.s }; }, nom);
  const glisser = async (nom, dxEcran, dyEcran, opts) => { opts = opts || {}; const b = await bloc(nom); await page.mouse.move(b.x, b.y); await page.mouse.down();
    if (opts.alt) await page.keyboard.down('Alt');
    for (let k = 1; k <= 8; k++) { await page.mouse.move(b.x + (dxEcran || 0) * k / 8, b.y + dyEcran * k / 8); await page.waitForTimeout(30); }
    await page.waitForTimeout(120); const pendant = opts.pendant ? await page.evaluate(opts.pendant) : null;
    await page.mouse.up(); if (opts.alt) await page.keyboard.up('Alt'); await page.waitForTimeout(300); return pendant; };
  const sain = async () => { const m = await page.evaluate(P.mesurerDansLaPage); return !m.filsDansBloc && !m.chevauches && !m.superposees && !m.rompus; };
  // le routage PROPRE d'un dessin retouché : aucun fil dans un bloc, le sien compris (hors de ses bornes), aucun segment partagé,
  // aucun fil rompu, aucun numéro qui ne s'écrit plus, aucun croisement évitable
  const propre = () => page.evaluate(() => { const d = app.dessin, fils = d.fils.filter(w => !w.shunt), a = auditer(d); let traverse = 0;
    fils.forEach(w => { for (let i = 0; i < w.pts.length - 1; i++) { const p = w.pts[i], q = w.pts[i + 1], h = Math.abs(p.y - q.y) < 0.01;
      const xa = Math.min(p.x, q.x), xb = Math.max(p.x, q.x), ya = Math.min(p.y, q.y), yb = Math.max(p.y, q.y);
      d.comps.forEach(c => { if (c.kind === 'tag') return; if (h ? (p.y > c.y + 1 && p.y < c.y + c.h - 1 && xa < c.x + c.w - 2 && xb > c.x + 2) : (p.x > c.x + 1 && p.x < c.x + c.w - 1 && ya < c.y + c.h - 2 && yb > c.y + 2)) traverse++; }); } });
    const r = { traverse, chevauches: a.blocsChevauches, partages: compterPartages(d.fils), rompus: filsRompus(d.fils, d.barrettes), muets: compterMuets({ fils: d.fils, barrettes: d.barrettes }, d.comps), evitables: a.evitables,
      orthogonal: fils.every(w => w.pts.every((p, i) => !i || Math.abs(p.x - w.pts[i - 1].x) < 0.01 || Math.abs(p.y - w.pts[i - 1].y) < 0.01)) };
    r.ok = !r.traverse && !r.chevauches && !r.partages && !r.rompus && !r.muets && !r.evitables && r.orthogonal; return r; });
  const colles = () => page.evaluate(P.blocsCollesDansLaPage);
  const auto = () => page.evaluate(() => !$('btnAuto').hidden);
  const mot = () => page.evaluate(() => $('toast').classList.contains('on') ? $('toast').textContent : '');
  const pas = () => page.evaluate(() => PAS_PAPIER * app.dessin.bbox.k);

  /* ---- FOLIO 3 : en hauteur, Ctrl+Z, la garde, « rendre au moteur » ---- */
  await ouvrir('3');
  // un bloc qui a de la place sous lui : le plus bas de sa colonne
  const nom = await page.evaluate(() => { const cs = app.dessin.comps.filter(c => c.kind === 'equip' && !c.hub);
    const bas = cs.filter(c => !cs.some(o => o !== c && o.col === c.col && o.y > c.y)); return bas.sort((a, b) => a.y - b.y)[0].name; });
  const avant = await bloc(nom);
  await glisser(nom, 0, 90);
  const apres = await bloc(nom);
  ok(apres.cy > avant.cy + 5, nom + ' a descendu à la souris', Math.round(avant.cy) + ' → ' + Math.round(apres.cy));
  ok(await sain(), 'le dessin retouché reste sain');
  ok(!(await colles()).length, 'aucun bloc collé à un autre');
  ok(await auto(), 'le folio est marqué retouché');
  ok(await page.evaluate(() => /Dessin retouché · rendre au moteur/.test($('btnAuto').textContent)), 'le bouton dit « Dessin retouché · rendre au moteur »', await page.evaluate(() => $('btnAuto').textContent.trim().replace(/\s+/g, ' ')));
  await page.keyboard.press('Control+z'); await page.waitForTimeout(300);
  ok(Math.abs((await bloc(nom)).cy - avant.cy) < 0.5, 'Ctrl+Z défait le geste');
  ok(!(await auto()), 'plus marqué retouché après Ctrl+Z');
  // très loin vers le haut : il s'arrête contre un voisin, ou au bord de la feuille
  await glisser(nom, 0, -2000);
  ok(!(await colles()).length, 'poussé loin, il ne vient jamais à moins de huit unités d\'un voisin de sa colonne');
  ok(await page.evaluate(n => { const c = app.dessin.comps.find(k => k.name === n), bb = app.dessin.bbox; return c.y >= bb.y + (PAGE_CADRE + PAGE_MARGE) * bb.k - 0.5; }, nom), 'il reste sur la feuille');
  ok(await sain(), 'toujours sain');
  await glisser(nom, 0, 60); const garde = await bloc(nom);
  await page.waitForTimeout(600);
  await ouvrir('3'); await page.waitForTimeout(800);
  ok(Math.abs((await bloc(nom)).cy - garde.cy) < 0.5, 'la retouche se garde d\'une session à l\'autre', Math.round(garde.cy) + ' après rechargement : ' + Math.round((await bloc(nom)).cy));
  await page.click('#btnAuto'); await page.waitForTimeout(400);
  ok(Math.abs((await bloc(nom)).cy - avant.cy) < 0.5 && !(await auto()), '« rendre au moteur » rend le dessin du moteur');
  await page.evaluate(() => $('toast').classList.remove('on'));
  const b = await bloc(nom); await page.mouse.click(b.x, b.y); await page.waitForTimeout(200);
  ok(await page.evaluate(n => app.choisi === n, nom), 'un clic sans glisser choisit le bloc');
  ok(!(await mot()), 'un clic sans glisser ne dit rien (le mot ne vient que si le bloc a bougé)');

  /* ---- FOLIO 1 : en largeur ---- */
  await ouvrir('1', false);
  const g0 = await page.evaluate(() => ({ colX: app.dessin.geom.colX.slice(), colW: app.dessin.geom.colW.slice() }));
  // hors de toute colonne : 395SW1, loin à droite, dans la place libre au-delà du dessin (une goulotte et demie après la dernière colonne)
  const s0 = await bloc('395SW1'), pas1 = await pas();
  const voulu = await page.evaluate(() => { const g = app.dessin.geom, c = app.dessin.comps.find(k => k.name === '395SW1'), n = g.colX.length - 1; return g.colX[n] + g.colW[n] + 60 - c.x; });
  const sel = await glisser('395SW1', voulu * s0.s, 0, { pendant: () => ({ us: getComputedStyle($('planche')).userSelect, calque: !!document.getElementById('rt-calque') }) });
  const s1 = await bloc('395SW1'), dxMonde = s1.cx - s0.cx;
  ok(Math.abs(dxMonde - voulu) <= pas1 / 2 + 0.5 && Math.abs(s1.cy - s0.cy) < 0.5, '395SW1 va à droite où la souris le mène, hors de sa colonne', Math.round(voulu) + ' voulu, ' + Math.round(dxMonde) + ' obtenu (carreau ' + pas1.toFixed(1) + ')');
  // au pas du carreau de la feuille — ou sur un aimant : un bord aligné sur celui d'un voisin, une paroi de colonne
  ok(Math.abs(dxMonde / pas1 - Math.round(dxMonde / pas1)) < 0.02 || await page.evaluate(() => { const c = app.dessin.comps.find(k => k.name === '395SW1'), g = app.dessin.geom;
    return app.dessin.comps.some(o => o !== c && o.kind !== 'tag' && [o.x, o.x + o.w, o.x + o.w / 2].some(v => [c.x, c.x + c.w, c.x + c.w / 2].some(u => Math.abs(u - v) < 0.3))) || g.colX.some((x, k) => Math.abs(c.x - x) < 0.3 || Math.abs(c.x + c.w - x - g.colW[k]) < 0.3); }),
    'au pas du carreau de la feuille (ou sur un aimant)', (dxMonde / pas1).toFixed(2) + ' carreaux');
  ok(await page.evaluate(([nom, g0]) => { const c = app.dessin.comps.find(k => k.name === nom && k.kind !== 'tag'), g = app.dessin.geom;
    const dehors = g0.colX.every((x, k) => c.x + c.w <= x || c.x >= x + g0.colW[k]);
    return dehors && g.colX.length === g0.colX.length + 1 && c.col === g.colX.length - 1 && c.x >= g.colX[c.col] - 0.5 && c.x + c.w <= g.colX[c.col] + g.colW[c.col] + 0.5; }, ['395SW1', g0]),
    'posé hors de toute colonne, il devient une colonne à lui (les colonnes se relisent)');
  const p1 = await propre();
  ok(p1.ok, 'le routage reste propre : orthogonal, aucun fil dans un bloc (le sien compris), ni partagé, ni rompu, ni muet, aucun croisement évitable', JSON.stringify(p1));
  ok(sel.us === 'none' && sel.calque, 'pendant l\'appui, la planche ne sélectionne rien et le fantôme montre la place visée', JSON.stringify(sel));
  ok(await page.evaluate(() => !String(window.getSelection())), 'aucun texte sélectionné après le glisser');
  ok(/395SW1 déplacé/.test(await mot()), 'le mot dit que le bloc a bougé', await mot());
  // un petit pas de côté, dans un dessin serré : 101BT1 de deux carreaux à droite ; la colonne d'à côté s'écarte
  const t0 = await bloc('101BT1'), l0 = await bloc('104LP1');
  await glisser('101BT1', 2 * pas1 * t0.s, 0);
  const t1 = await bloc('101BT1'), l1 = await bloc('104LP1');
  ok(Math.abs(t1.cx - t0.cx - 2 * pas1) < 0.5 && t1.col === t0.col, 'un petit pas de côté passe : deux carreaux, dans sa colonne', (t1.cx - t0.cx).toFixed(1) + ' pour ' + (2 * pas1).toFixed(1));
  ok(l1.cx > l0.cx + 0.5 && /s.écartent/.test(await mot()), 'la colonne voisine s\'écarte pour garder sa goulotte, et le mot le dit', Math.round(l1.cx - l0.cx) + ' · ' + await mot());
  const p2 = await propre(); ok(p2.ok, 'toujours propre', JSON.stringify(p2));
  // sur un voisin : 102CB1 lâché sur 101BT1 — rouge pendant, la place libre la plus proche après, et le mot le dit
  const vise = await bloc('101BT1'), c0 = await bloc('102CB1');
  const rouge = await glisser('102CB1', vise.x - c0.x, vise.y - c0.y, { pendant: () => { const g = document.getElementById('rt-calque'); return !!g && g.dataset.pris === '1' && !!g.querySelector('.rt-fantome.pris'); } });
  ok(rouge, 'pendant le geste, le fantôme à la place visée est rouge : la place est prise');
  ok(await page.evaluate(() => atelier.audit().blocsChevauches === 0) && !(await colles()).length, 'lâché quand même, il ne chevauche rien');
  ok(/102CB1 posé \d+ px plus (haut|bas|à gauche|à droite).*: la place était prise/.test(await mot()), 'le mot dit où il est allé, et pourquoi', await mot());
  const p3 = await propre(); ok(p3.ok, 'toujours propre', JSON.stringify(p3));
  // Alt : sans carreau ni aimant
  const a0 = await bloc('104LP1');
  await glisser('104LP1', 37, 0, { alt: true });
  const a1 = await bloc('104LP1'), libre = a1.cx - a0.cx;
  ok(Math.abs(libre - 37 / a0.s) <= 0.6 && Math.abs(libre / pas1 - Math.round(libre / pas1)) > 0.05, 'Alt : il suit la souris, sans carreau', libre.toFixed(2) + ' pour ' + (37 / a0.s).toFixed(2));
  // les flèches : un bloc choisi se pousse d'un carreau, de cinq avec Maj ; Ctrl+Z défait la série
  await page.evaluate(() => $('toast').classList.remove('on'));
  const f0 = await bloc('104LP1'); await page.mouse.click(f0.x, f0.y); await page.waitForTimeout(250);
  ok(await page.evaluate(() => app.choisi === '104LP1'), '104LP1 choisi');
  const planAvant = await page.evaluate(() => app.plan);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
  const f1 = await bloc('104LP1');
  ok(Math.abs(f1.cx - f0.cx - pas1) < 0.5 && await page.evaluate(p => app.plan === p, planAvant), 'flèche droite : un carreau à droite (le folio ne change pas)', (f1.cx - f0.cx).toFixed(1));
  await page.keyboard.press('Shift+ArrowDown'); await page.waitForTimeout(150);
  const f2 = await bloc('104LP1');
  ok(Math.abs(f2.cy - f1.cy - 5 * pas1) < 0.5, 'Maj+flèche bas : cinq carreaux plus bas', (f2.cy - f1.cy).toFixed(1));
  const p4 = await propre(); ok(p4.ok, 'toujours propre', JSON.stringify(p4));
  await page.keyboard.press('Control+z'); await page.waitForTimeout(300);
  const f3 = await bloc('104LP1');
  ok(Math.abs(f3.cx - f0.cx) < 0.5 && Math.abs(f3.cy - f0.cy) < 0.5, 'un Ctrl+Z défait la série de poussées');
  // la garde, en largeur aussi
  const x1 = (await bloc('395SW1')).cx; await page.waitForTimeout(600);
  await ouvrir('1'); await page.waitForTimeout(800);
  ok(Math.abs((await bloc('395SW1')).cx - x1) < 0.5, 'le déplacement en largeur se garde d\'une session à l\'autre');
  // sans bloc choisi, la flèche change toujours de folio
  await page.evaluate(() => { app.choisi = null; app.cible = null; peindre(); });
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => app.plan === '2'), 'sans bloc choisi, la flèche droite va au folio suivant');
  await ouvrir('1', false); await page.click('#btnAuto'); await page.waitForTimeout(300);
  ok(!(await auto()), 'folio 1 rendu au moteur');
  ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
  console.log('\n  ' + (ko ? ko + ' échec(s)' : 'tout tient'));
  await nav.close(); process.exit(ko ? 1 : 0);
})();
