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
   TOUT BOUGE (le lecteur : « bornier, fil, borne, tout »), à la vraie souris,
   chaque prise annoncée au survol (ce que la planche dit qu'on prend, ce qui
   s'allume, le curseur) :
     · une MASSE quitte sa borne et se pose sous son équipement, son fil la suit ;
       Ctrl+Z la recolle ;
     · une BORNE glisse le long de son bloc : posée sur la suivante, elles échangent
       leurs places, les fils suivent ; le ↺ est là, un double-clic la rend au
       moteur (le folio redevient celui du moteur), Ctrl+Z rend l'échange ;
     · la BARRETTE À POSER VT1 glisse de piste en piste dans sa goulotte ; un clic
       sur ↺ la rend ;
     · un FIL (folio 3) : sa verticale glisse d'une piste (un double-clic la rend),
       passe dans la goulotte voisine (Ctrl+Z l'en sort) ; son couloir descend ;
       visé à travers un bloc, le fantôme est rouge et le couloir se pose au plus
       près, hors du bloc, et le mot le dit ; ça se garde, « rendre au moteur »
       rend les fils ;
     · un MORCEAU DE BARRETTE (folio 2) se prend ; un RENVOI (un contrat découpé en
       folios) aussi — et un clic sans glisser mène toujours à son folio.
   Après chaque geste, le routage reste propre (aucun fil dans un bloc, oblique,
   partagé, rompu, muet ; aucun croisement évitable).
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

  /* ---- TOUT BOUGE : une masse, une borne, une barrette à poser, un fil (vertical, horizontal), un morceau de barrette ---- */
  // un point du dessin à l'écran ; la vue posée sur lui, à 160 %
  const ecran = (x, y) => page.evaluate(([x, y]) => { const r = $('planche').getBoundingClientRect(); return { x: r.left + app.vue.tx + x * app.vue.s, y: r.top + app.vue.ty + y * app.vue.s, s: app.vue.s }; }, [x, y]);
  const cadrer = async (x, y) => { await page.evaluate(([x, y]) => { const r = cadre(); app.vue = { s: 1.6, tx: r.width / 2 - x * 1.6, ty: r.height / 2 - y * 1.6 }; appliquerVue(); }, [x, y]); await page.waitForTimeout(60); };
  // survoler un point : ce que la planche dit qu'on y prendrait, ce qui s'allume, le ↺, le curseur
  const survoler = async p => { await page.mouse.move(p.x + 60, p.y + 60); await page.waitForTimeout(40); await page.mouse.move(p.x, p.y); await page.waitForTimeout(150);
    return page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); return { prise: $('planche').dataset.prise || '', allume: !!document.querySelector('#rt-survol .rt-allume, #rt-survol .rt-zone'),
      rendre: !!document.querySelector('#rt-survol .rt-rendre'), curseur: el ? getComputedStyle(el).cursor : '' }; }, [p.x, p.y]); };
  const glisserDe = async (p, dx, dy, pendant) => { await page.mouse.move(p.x, p.y); await page.mouse.down();
    for (let k = 1; k <= 8; k++) { await page.mouse.move(p.x + dx * k / 8, p.y + dy * k / 8); await page.waitForTimeout(40); }
    await page.waitForTimeout(150); const v = pendant ? await page.evaluate(pendant) : null; await page.mouse.up(); await page.waitForTimeout(350); return v; };
  const consignes = () => page.evaluate(() => JSON.parse(JSON.stringify((app.dessin.geom.consignes) || { fils: [], barrettes: [] })));
  const annuler = async () => { await page.keyboard.press('Control+z'); await page.waitForTimeout(350); };
  const [PISTE_, PAS_] = await page.evaluate(() => [PISTE, PAS_BORNE]);   // une piste de goulotte ; le demi-pas des bornes, des couloirs
  // la MASSE de 104LP1 : une pastille se prend comme un bloc, se pose sous lui, son fil la suit
  await page.evaluate(() => $('toast').classList.remove('on'));
  const m0 = await page.evaluate(() => { const i = app.dessin.comps.findIndex(k => k.kind === 'tag' && (partenaireDePastille(k, app.dessin.links) || {}).nom === '104LP1'), t = app.dessin.comps[i];
    return { i, x: t.x + t.w / 2, y: t.y + t.h / 2, nom: t.name }; });
  await cadrer(m0.x, m0.y);
  const sm = await survoler(await ecran(m0.x, m0.y));
  ok(sm.prise === 'bloc' && sm.curseur === 'grab', 'au survol, une masse se prend comme un bloc : le curseur le dit', JSON.stringify(sm));
  await glisserDe(await ecran(m0.x, m0.y), 0, 70);
  const m1 = await page.evaluate(i => { const t = app.dessin.comps[i]; return { y: t.y + t.h / 2 }; }, m0.i);
  ok(m1.y > m0.y + 20 && new RegExp(m0.nom + ' déplacé').test(await mot()), 'une masse quitte sa borne et se pose plus bas, et le mot le dit', Math.round(m0.y) + ' → ' + Math.round(m1.y) + ' · ' + await mot());
  const pm = await propre(); ok(pm.ok, 'son fil la suit, le routage reste propre', JSON.stringify(pm));
  await annuler();
  ok(Math.abs((await page.evaluate(i => { const t = app.dessin.comps[i]; return t.y + t.h / 2; }, m0.i)) - m0.y) < 0.5 && !(await auto()), 'Ctrl+Z la recolle à sa borne');
  // un BLOC posé à la main : au survol, le ↺ ; un clic le rend à la place que le moteur lui donnait
  const k0 = await bloc('104LP1'); await glisserDe(k0, 0, 60);
  const k1 = await bloc('104LP1'), sk = await survoler(k1);
  ok(k1.cy > k0.cy + 5 && sk.rendre, 'au survol d’un bloc posé à la main, le ↺ est là', JSON.stringify(sk));
  const rk = await page.evaluate(() => { const r = document.querySelector('#rt-survol .rt-rendre circle').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(rk.x, rk.y, { steps: 4 }); await page.mouse.click(rk.x, rk.y); await page.waitForTimeout(400);
  ok(Math.abs((await bloc('104LP1')).cy - k0.cy) < 0.5 && /104LP1 rendu au moteur/.test(await mot()) && !(await auto()), 'un clic sur ↺ le rend au moteur, et le folio redevient celui du moteur', await mot());
  // une BORNE de 101BT1 : elle glisse le long du bloc ; posée sur la suivante, elles échangent leurs places, les fils suivent
  const b0 = await page.evaluate(() => { const c = app.dessin.comps.find(k => k.name === '101BT1'), z = bornesPrenables(c).filter(z => z.x0 <= c.x + 1).sort((u, v) => u.y - v.y);
    return { x: (z[0].x0 + z[0].x1) / 2, y: z[0].y, y2: z[1].y, e1: z[0].etiq, e2: z[1].etiq }; });
  const hauteurDe = etiq => page.evaluate(e => { const c = app.dessin.comps.find(k => k.name === '101BT1'); return c.rangs.L.find(p => String(p.etiq) === String(e)).y; }, etiq);
  const boutDe = etiq => page.evaluate(e => { const l = app.dessin.links.find(l => (l.de === '101BT1' && String(l.borneDe) === String(e)) || (l.vers === '101BT1' && String(l.borneVers) === String(e))); return l.de === '101BT1' ? l.epA.y : l.epB.y; }, etiq);
  await cadrer(b0.x, b0.y);
  const sb = await survoler(await ecran(b0.x, b0.y));
  ok(sb.prise === 'borne' && sb.allume && sb.curseur === 'ns-resize', 'au survol, une borne s’allume et le curseur dit qu’elle glisse de haut en bas', JSON.stringify(sb));
  const pb = await ecran(b0.x, b0.y);
  await glisserDe(pb, 0, (b0.y2 - b0.y) * pb.s);
  ok(Math.abs(await hauteurDe(b0.e1) - b0.y2) < 0.5 && Math.abs(await hauteurDe(b0.e2) - b0.y) < 0.5, 'posée sur la borne ' + b0.e2 + ', la borne ' + b0.e1 + ' échange sa place avec elle', b0.e1 + ' : ' + await hauteurDe(b0.e1) + ', ' + b0.e2 + ' : ' + await hauteurDe(b0.e2));
  ok(Math.abs(await boutDe(b0.e1) - b0.y2) < 0.5, 'le fil de la borne la suit');
  ok(/échangent leurs places/.test(await mot()) && await auto(), 'le mot le dit, le folio est retouché', await mot());
  const pbo = await propre(); ok(pbo.ok, 'le routage reste propre', JSON.stringify(pbo));
  const pb2 = await ecran(b0.x, b0.y2), sb2 = await survoler(pb2);
  ok(sb2.rendre, 'au survol d’une borne retouchée, le ↺ est là');
  await page.mouse.dblclick(pb2.x, pb2.y); await page.waitForTimeout(400);
  ok(Math.abs(await hauteurDe(b0.e1) - b0.y) < 0.5 && Math.abs(await hauteurDe(b0.e2) - b0.y2) < 0.5 && /rendue au moteur/.test(await mot()), 'un double-clic la rend au moteur (l’autre aussi revient)', await mot());
  ok(!(await auto()), 'plus rien de retouché : le folio redevient celui du moteur');
  await annuler();
  ok(Math.abs(await hauteurDe(b0.e1) - b0.y2) < 0.5, 'Ctrl+Z rend l’échange');
  await annuler();
  ok(Math.abs(await hauteurDe(b0.e1) - b0.y) < 0.5 && !(await auto()), 'Ctrl+Z encore : les bornes du moteur');
  // la BARRETTE À POSER VT1 : elle glisse dans sa goulotte, de piste en piste ; le ↺ la rend
  const v0 = await page.evaluate(() => { const b = app.dessin.barrettes.find(b => b.nomVT === 'VT1'), bs = bornesDePiquage(b), G = goulottes({ comps: app.dessin.comps, geom: app.dessin.geom }), ch = G.chDe(b.x);
    return { x: b.x, y: (bs[0].y + bs[1].y) / 2, room: G.x1(ch) - RETRAIT - b.x }; });
  await cadrer(v0.x, v0.y);
  const sv = await survoler(await ecran(v0.x, v0.y));
  ok(sv.prise === 'vt' && sv.allume && sv.curseur === 'ew-resize', 'au survol, la barrette à poser s’allume, le curseur dit qu’elle glisse de côté', JSON.stringify(sv));
  const pv = await ecran(v0.x, v0.y), nv = Math.min(2, Math.floor(v0.room / PISTE_));
  await glisserDe(pv, nv * PISTE_ * pv.s, 0);
  const v1 = await page.evaluate(() => app.dessin.barrettes.find(b => b.nomVT === 'VT1').x);
  ok(Math.abs(v1 - v0.x - nv * PISTE_) < 0.6 && (await consignes()).barrettes.length === 1 && /VT1 glisse dans sa goulotte/.test(await mot()), 'VT1 glisse de ' + nv + ' pistes dans sa goulotte, et le mot le dit', v0.x + ' → ' + v1 + ' · ' + await mot());
  const pvo = await propre(); ok(pvo.ok, 'le routage reste propre', JSON.stringify(pvo));
  const sv2 = await survoler(await ecran(v1, v0.y));
  ok(sv2.rendre, 'au survol de la barrette retouchée, le ↺ est là');
  const rv = await page.evaluate(() => { const r = document.querySelector('#rt-survol .rt-rendre circle').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(rv.x, rv.y, { steps: 3 }); await page.mouse.click(rv.x, rv.y); await page.waitForTimeout(400);
  ok(Math.abs((await page.evaluate(() => app.dessin.barrettes.find(b => b.nomVT === 'VT1').x)) - v0.x) < 0.5 && /VT1 rendue au moteur/.test(await mot()), 'un clic sur ↺ la rend au moteur', await mot());
  // FOLIO 3 : un FIL — sa verticale glisse d'une piste, puis passe dans une autre goulotte ; son couloir monte ou descend
  await ouvrir('3', false);
  const w0 = await page.evaluate(() => { const d = app.dessin, G = goulottes({ comps: d.comps, geom: d.geom });
    for (const w of d.fils) { if (w.shunt) continue; for (let i = 0; i + 1 < w.pts.length; i++) { const a = w.pts[i], b = w.pts[i + 1], ch = G.chDe(a.x);
      if (Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) > 30 && ch >= 0 && a.x + PISTE <= G.x1(ch) - RETRAIT + 0.01 && ch + 1 < G.n) return { li: w.i, cable: w.cable, x: a.x, y: (a.y + b.y) / 2, ch, voisine: G.x0(ch + 1) + RETRAIT }; } } return null; });
  const verticales = li => page.evaluate(li => { const w = app.dessin.fils.find(f => f.i === li); return w.pts.filter((q, i) => i && Math.abs(q.x - w.pts[i - 1].x) < 0.5 && Math.abs(q.y - w.pts[i - 1].y) > 0.5).map(q => q.x); }, li);
  await cadrer(w0.x, w0.y);
  const sf = await survoler(await ecran(w0.x, w0.y));
  ok(sf.prise === 'fil-v' && sf.allume && sf.curseur === 'ew-resize', 'au survol, un tronçon vertical s’allume, le curseur dit qu’il glisse de côté', JSON.stringify(sf));
  const pf = await ecran(w0.x, w0.y);
  await glisserDe(pf, PISTE_ * pf.s, 0);
  ok((await verticales(w0.li)).some(x => Math.abs(x - w0.x - PISTE_) < 0.6) && new RegExp(w0.cable + ' glisse de 1 piste à droite').test(await mot()), w0.cable + ' : sa verticale glisse d’une piste, et le mot le dit', JSON.stringify(await verticales(w0.li)) + ' · ' + await mot());
  const pfo = await propre(); ok(pfo.ok, 'le routage reste propre', JSON.stringify(pfo));
  const pf2 = await ecran(w0.x + PISTE_, w0.y); await survoler(pf2);
  await page.mouse.dblclick(pf2.x, pf2.y); await page.waitForTimeout(400);
  ok((await verticales(w0.li)).some(x => Math.abs(x - w0.x) < 0.6) && !(await consignes()).fils.length && /rendu au moteur/.test(await mot()), 'un double-clic sur le fil le rend au moteur', await mot());
  const pf3 = await ecran(w0.x, w0.y);
  await glisserDe(pf3, (w0.voisine - w0.x) * pf3.s, 0);
  const vs = await verticales(w0.li);
  ok(vs.some(x => Math.abs(x - w0.voisine) < PISTE_) && /passe par une autre goulotte/.test(await mot()), w0.cable + ' passe par la goulotte voisine, où on l’a posé', JSON.stringify(vs) + ' · ' + await mot());
  const pfv = await propre(); ok(pfv.ok, 'le routage reste propre', JSON.stringify(pfv));
  await annuler();
  ok((await verticales(w0.li)).some(x => Math.abs(x - w0.x) < 0.6), 'Ctrl+Z le rend à sa goulotte');
  // le COULOIR d'un fil (un horizontal qui traverse une colonne) : il descend ; sur un bloc, la place est refusée et dite
  const h0 = await page.evaluate(() => { const d = app.dessin, g = d.geom;
    for (const w of d.fils) { if (w.shunt) continue; const [a0, b0] = boutsDuFil(d.links[w.i]); if (a0.ch === b0.ch) continue;
      for (let i = 0; i + 1 < w.pts.length; i++) { const a = w.pts[i], b = w.pts[i + 1]; if (Math.abs(a.y - b.y) > 0.5) continue; const xa = Math.min(a.x, b.x), xb = Math.max(a.x, b.x);
        const k = g.colX.findIndex((x, k) => x >= xa - 1 && x + g.colW[k] <= xb + 1); if (k < 0) continue;
        const bloc = d.comps.find(c => c.kind !== 'tag' && c.col === k && c.h > 40);
        return { li: w.i, cable: w.cable, x: g.colX[k] + g.colW[k] / 2, y: a.y, sur: bloc ? bloc.y + bloc.h / 2 : null }; } } return null; });
  const horizontales = li => page.evaluate(li => { const w = app.dessin.fils.find(f => f.i === li); return w.pts.filter((q, i) => i && Math.abs(q.y - w.pts[i - 1].y) < 0.5).map(q => q.y); }, li);
  await cadrer(h0.x, h0.y);
  const sh = await survoler(await ecran(h0.x, h0.y));
  ok(sh.prise === 'fil-h' && sh.allume && sh.curseur === 'ns-resize', 'au survol, un couloir s’allume, le curseur dit qu’il monte ou descend', JSON.stringify(sh));
  const ph = await ecran(h0.x, h0.y);
  await glisserDe(ph, 0, 4 * PAS_ * ph.s);
  const hs = await horizontales(h0.li);
  ok(hs.some(y => Math.abs(y - h0.y - 4 * PAS_) < 0.6) && new RegExp(h0.cable + '\\s: son couloir descend').test(await mot()), h0.cable + ' : son couloir descend de quatre demi-pas, et le mot le dit', JSON.stringify(hs) + ' · ' + await mot());
  const pho = await propre(); ok(pho.ok, 'le routage reste propre', JSON.stringify(pho));
  if (h0.sur != null) { const avant = JSON.stringify(await horizontales(h0.li)), ph2 = await ecran(h0.x, h0.y + 4 * PAS_);
    const rougeH = await glisserDe(ph2, 0, (h0.sur - h0.y - 4 * PAS_) * ph2.s, () => { const g = document.getElementById('rt-calque'); return !!g && g.dataset.pris === '1' && !!g.querySelector('.rt-fantome.pris'); });
    ok(rougeH, 'visé à travers un bloc, le fantôme du couloir est rouge pendant le geste');
    const hs2 = await horizontales(h0.li), bloc = await page.evaluate(([x, y]) => app.dessin.comps.find(c => c.kind !== 'tag' && x > c.x && x < c.x + c.w && y > c.y && y < c.y + c.h) || null, [h0.x, h0.sur]);
    ok(!hs2.some(y => bloc && y > bloc.y - 3 && y < bloc.y + bloc.h + 3) && /au plus près\s: la place visée croisait un bloc/.test(await mot()) && (await propre()).ok,
      'lâché sur le bloc, le couloir se pose au plus près, hors du bloc, le routage propre, et le mot le dit', JSON.stringify(hs2) + ' · ' + await mot()); }
  const gardee = (await consignes()).fils.find(k => k.li === h0.li);
  await page.waitForTimeout(600);
  await ouvrir('3'); await page.waitForTimeout(800);
  ok(gardee && (await horizontales(h0.li)).some(y => Math.abs(y - gardee.y) < 0.6) && JSON.stringify((await consignes()).fils.find(k => k.li === h0.li)) === JSON.stringify(gardee), 'la retouche d’un fil se garde d’une session à l’autre', JSON.stringify(gardee));
  await page.click('#btnAuto'); await page.waitForTimeout(400);
  ok(!(await auto()) && (await horizontales(h0.li)).some(y => Math.abs(y - h0.y) < 0.6), '« rendre au moteur » rend aussi les fils');
  // FOLIO 2 : un MORCEAU DE BARRETTE collé à sa borne se prend aussi
  await ouvrir('2', false);
  const mb0 = await page.evaluate(() => { const i = app.dessin.comps.findIndex(k => k.kind === 'tag' && estBarrette(k.name)), t = app.dessin.comps[i]; return t ? { i, x: t.x + t.w / 2, y: t.y + t.h / 2, nom: t.name } : null; });
  if (mb0) { await cadrer(mb0.x, mb0.y); await glisserDe(await ecran(mb0.x, mb0.y), 0, 60);
    const mb1 = await page.evaluate(i => { const t = app.dessin.comps[i]; return t.y + t.h / 2; }, mb0.i);
    ok(mb1 > mb0.y + 15 && (await propre()).ok, 'un morceau de barrette (' + mb0.nom + ') se prend et se pose ailleurs, le routage propre', Math.round(mb0.y) + ' → ' + Math.round(mb1));
    await annuler(); }
  // UN RENVOI (un contrat découpé en folios) : il se prend et se pose comme un bloc ; un clic sans glisser mène toujours à son folio
  await page.evaluate(() => { const L = []; let w = 100; const fil = (de, bd, vers, bv, route) => L.push({ de, borneDe: String(bd), vers, borneVers: String(bv), cable: 'W-' + (w++), type: 'DR22', route });
    for (let i = 0; i < 6; i++) { const r = 'R' + i, a = (100 + i) + 'LP' + (i + 1), b = (200 + i) + 'SW' + (i + 1), c = (300 + i) + 'RL' + (i + 1);
      fil(a, 1, b, 1, r); fil(b, 2, c, 'A1', r); fil(c, 'A2', (400 + i) + 'PM' + (i + 1), 1, r); if (i) fil(a, 2, (300 + i - 1) + 'RL' + i, 'X1', r); }
    atelier.charger(L); decouper(4); app.plan = '2'; app.choisi = null; app.cible = null; redessiner(); ajuster(); });
  const r0 = await page.evaluate(() => { const i = app.dessin.comps.findIndex(c => estRenvoi(c.name)), c = app.dessin.comps[i]; return { i, x: c.x + c.w / 2, y: c.y + c.h / 2, nom: c.name }; });
  await cadrer(r0.x, r0.y);
  const sr = await survoler(await ecran(r0.x, r0.y));
  ok(sr.prise === 'bloc' && sr.curseur === 'grab', 'au survol, un renvoi (' + r0.nom + ') se prend comme un bloc', JSON.stringify(sr));
  await glisserDe(await ecran(r0.x, r0.y), 0, 80);
  const r1 = await page.evaluate(i => app.dessin.comps[i].y + app.dessin.comps[i].h / 2, r0.i);
  ok(Math.abs(r1 - r0.y) > 10 && await auto() && (await propre()).ok, 'il se pose ailleurs, le routage propre', Math.round(r0.y) + ' → ' + Math.round(r1) + ' · ' + await mot());
  const pr0 = await ecran(r0.x, r1), cibleR = r0.nom.replace('▷F', '');
  await page.mouse.click(pr0.x, pr0.y); await page.waitForTimeout(400);
  ok(await page.evaluate(t => app.plan === t, cibleR), 'un clic sans glisser sur le renvoi mène toujours au folio ' + cibleR);
  ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
  console.log('\n  ' + (ko ? ko + ' échec(s)' : 'tout tient'));
  await nav.close(); process.exit(ko ? 1 : 0);
})();
