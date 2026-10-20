/* ===========================================================================
   DESSIN — le folio et le geste sur le plan (l'audit du dessin v72).
   ---------------------------------------------------------------------------
       node tests/dessin.js [--fichier=chemin]

   Sur l'exemple, à la vraie souris quand le geste compte :
     · LE FOCUS : un bloc choisi garde ses crochets et sa pleine encre quand
       la souris survole un autre bloc (celui-ci se marque à peine) ; les
       numéros des câbles éteints reculent (moins de 0,3), ceux du câble allumé
       s'allument ; le trait allumé garde 2,4 px d'écran à tout zoom et va
       jusqu'à la borne (le bout dans le bloc) ; un câble qui part d'une
       barrette à poser l'allume, elle et son raccord ; une masse s'allume par
       sa place, pas par son nom ; dans un bloc voisin, les autres amenées
       restent éteintes ;
     · LA LISIBILITÉ : « Ajuster » (le bouton, la touche 0) alterne la feuille
       et le dessin — un recadrage de l'outil ne bascule rien ; les pas du zoom
       tombent sur des crans (75, 100 %) ; 1 = 100 %, 2 = 200 % ; le zoom a un
       plancher et un plafond ; chaque folio garde sa vue, même après un
       rechargement ; le folio se garde avec le contrat ; la recherche arrive
       lisible ; à la page entière les traits s'épaississent (`loin`) ;
     · SE DÉPLACER : le bouton du milieu et Espace + glisser déplacent la vue,
       jamais un bloc ; un clic du milieu ne choisit rien ; le curseur dit ce
       qui se prend (la croix sur un bloc, la main sur le papier) ;
     · LE CARTOUCHE d'un folio FWD : le rang dans la case, le dessin sur sa
       ligne, chaque texte dans sa case ; « sans » échelle ; « câbles » ;
     · LES RENVOIS : un drapeau (flèche, « F1 », l'autre bout entier), pas de
       boîte ; le clic va à l'autre folio, l'autre moitié choisie, allumée,
       lisible ; Alt+← revient à la même vue ;
     · LA BULLE du plan : un câble (de → vers, route), un bloc (ses câbles, les
       autres folios), et la référence croisée sous le repère ;
     · LE CLIC : choisir un bloc ne réécrit plus le folio (les crochets se
       posent dans le bloc) ; ce qui s'écrit sous un repère le repeint ; les
       crochets d'une prise entourent sa réglette ;
     · L'EXPORT : sans le quadrillage fin.
   Rend 1 au premier échec.
   =========================================================================== */
const { chromium } = require('playwright');
const P = require('./pilote');
const FICHIER = P.fichierDemande();

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } }), page = await ctx.newPage(); page.setDefaultTimeout(300000);
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  let ko = 0; const ok = (c, nom, detail) => { if (!c) ko++; console.log('  ' + (c ? 'ok ' : 'KO ') + ' ' + nom + (detail ? '   ' + detail : '')); };
  const charger = async () => { await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined'); };
  await charger(); await page.evaluate(() => atelier.exemple()); await page.waitForFunction(() => !!app.dessin);
  const folio = async p => { await page.evaluate(p => { deselectionner(); allerAuPlan(p); }, p); await page.waitForFunction(p => app.plan === p && !!app.dessin, p); await page.waitForTimeout(300); };
  const feuille = () => page.evaluate(() => { VUE.cadrage = 'feuille'; ajuster(); });
  // le centre d'un bloc à l'écran (son haut, pour un bloc très haut)
  const ecranDe = nom => page.evaluate(nom => { const c = app.dessin.comps.find(k => k.name === nom && k.kind !== 'tag'), r = $('planche').getBoundingClientRect();
    return { x: r.left + app.vue.tx + (c.x + c.w / 2) * app.vue.s, y: r.top + app.vue.ty + (c.y + Math.min(c.h / 2, 24)) * app.vue.s }; }, nom);
  const ecranDuPoint = (x, y) => page.evaluate(([x, y]) => { const r = $('planche').getBoundingClientRect(); return { x: r.left + app.vue.tx + x * app.vue.s, y: r.top + app.vue.ty + y * app.vue.s }; }, [x, y]);
  // la vue posée à `pct` % de la feuille, le point (x, y) du dessin au centre de la planche
  const zoomSur = (pct, x, y) => page.evaluate(([pct, x, y]) => { const r = cadre(), s = pct / 100 / app.dessin.bbox.k; app.vue = { s, tx: r.width / 2 - x * s, ty: r.height / 2 - y * s }; appliquerVue(); }, [pct, x, y]);
  const zoom = () => page.evaluate(() => $('zlbl').textContent);
  // la vue posée : l'animation du cadrage (260 ms, bien plus sur une machine chargée) est finie
  const posee = async () => { await page.waitForFunction(() => !anim); await page.waitForTimeout(60); };
  const opacite = (sel, n) => page.evaluate(([sel, n]) => { const e = document.querySelectorAll(sel)[n || 0]; if (!e) return null; let o = 1; for (let x = e; x && x.id !== 'svg'; x = x.parentElement) o *= +getComputedStyle(x).opacity; return +o.toFixed(3); }, [sel, n]);

  /* ---- LE FOCUS ---- */
  console.log('\nLE FOCUS');
  await folio('3'); await feuille(); await page.waitForTimeout(300);
  await page.evaluate(() => choisirBloc(app.dessin.comps.find(k => k.name === '352PM2' && k.kind !== 'tag'))); await page.waitForTimeout(400);
  const e351 = await ecranDe('351PM1'); await page.mouse.move(e351.x, e351.y - 40); await page.mouse.move(e351.x, e351.y, { steps: 3 }); await page.waitForTimeout(400);
  // l'opacité glisse (.12 s, bien plus sur une machine chargée) : on la lit posée
  await page.waitForFunction(() => { const g = [...document.querySelectorAll('#scene .comp')].find(x => x.dataset.name === '351PM1'); return !!g && g.classList.contains('sv') && +getComputedStyle(g).opacity > 0.5; }, null, { timeout: 8000 }).catch(() => {});
  const vol = await page.evaluate(() => { const g = n => [...document.querySelectorAll('#scene .comp')].find(x => x.dataset.name === n), c = g('352PM2'), s = g('351PM1');
    return { choix: +getComputedStyle(c).opacity, crochets: !!c.querySelector('.selbox'), survole: +getComputedStyle(s).opacity, sv: s.classList.contains('sv'), fiche: app.cible && app.cible.nom, filsSv: document.querySelectorAll('#scene .cab.sv').length }; });
  ok(vol.choix === 1 && vol.crochets && vol.fiche === '352PM2', 'un bloc choisi garde sa pleine encre et ses crochets quand la souris survole un autre bloc', JSON.stringify(vol));
  ok(vol.sv && vol.survole > 0.5 && vol.survole < 0.75 && vol.filsSv > 0, 'le bloc survolé (351PM1) et ses câbles se marquent à peine', JSON.stringify(vol));
  await page.mouse.move(1400, 880); await page.waitForTimeout(200);
  const nums = await page.evaluate(() => { const op = e => { let o = 1; for (let x = e; x && x.id !== 'svg'; x = x.parentElement) o *= +getComputedStyle(x).opacity; return o; };
    const t = [...document.querySelectorAll('#scene text.filnum')], eteints = t.filter(e => !e.classList.contains('hl')).map(op), allumes = t.filter(e => e.classList.contains('hl'));
    return { n: t.length, maxEteint: +Math.max(...eteints).toFixed(2), allumes: allumes.length, gras: allumes.every(e => +getComputedStyle(e).fontWeight >= 700), relies: t.every(e => e.dataset.i != null) }; });
  ok(nums.maxEteint < 0.3 && nums.allumes >= 2 && nums.gras && nums.relies, 'les numéros des câbles éteints reculent (moins de 0,3), ceux du bloc choisi s’allument, en gras ; chacun est relié à son câble', JSON.stringify(nums));
  // W-012 : de 102CB1 à 103RL1, par la barrette à poser VT1
  await folio('1'); await page.evaluate(() => choisirFil(app.dessin.fils.find(w => w.cable === 'W-012'))); await page.waitForTimeout(300);
  await zoomSur(200, 300, 235); await page.waitForTimeout(150);
  const w12 = await page.evaluate(() => { const p = document.querySelector('#scene .cab.hl'), cs = getComputedStyle(p), g = n => [...document.querySelectorAll('#scene .comp')].find(x => x.dataset.name === n);
    const rl = g('103RL1'), autre = rl && [...rl.querySelectorAll('.lead[data-i]')].find(l => !l.classList.contains('hl'));
    return { large: cs.strokeWidth, effet: cs.vectorEffect, ecran: +(parseFloat(cs.strokeWidth)).toFixed(2), bout: !!(rl && rl.querySelector('.lead.hl')), cb: !!(g('102CB1') && g('102CB1').querySelector('.lead.hl')),
      vt: !!document.querySelector('#scene .vt.hl[data-vt="VT1"]'), raccord: !!document.querySelector('#scene .cab.hl[data-vt="VT1"]'), autreAmenee: autre ? +getComputedStyle(autre).opacity : null }; });
  ok(w12.effet === 'non-scaling-stroke' && Math.abs(w12.ecran - 2.4) < 0.05, 'le trait allumé garde 2,4 px d’écran à tout zoom (ici 200 %)', JSON.stringify({ large: w12.large, effet: w12.effet }));
  ok(w12.bout && w12.cb, 'il va jusqu’aux bornes : le bout de câble dans 103RL1 et dans 102CB1 s’allume', JSON.stringify(w12));
  ok(w12.vt && w12.raccord, 'W-012 part de la barrette à poser VT1 : elle et son raccord (le câble à créer) s’allument avec lui', JSON.stringify(w12));
  ok(w12.autreAmenee != null && w12.autreAmenee < 0.3, 'dans 103RL1, les autres amenées restent éteintes', JSON.stringify(w12));
  // les masses par leur place : trois 901G au folio 1, un seul câble en touche une
  const masses = await page.evaluate(() => { choisirFil(app.dessin.fils.find(w => w.cable === 'W-018')); const g = [...document.querySelectorAll('#scene .comp')].filter(x => x.dataset.name === '901G');
    return { n: g.length, allumees: g.filter(x => x.classList.contains('hl')).length }; });
  ok(masses.n >= 2 && masses.allumees === 1, 'une masse s’allume par sa place : W-018 allume une 901G sur ' + masses.n, JSON.stringify(masses));

  /* ---- LA LISIBILITÉ ---- */
  console.log('\nLA LISIBILITÉ');
  await page.evaluate(() => deselectionner()); await feuille(); await page.waitForTimeout(300);
  const s0 = await page.evaluate(() => app.vue.s);
  await page.evaluate(() => $('zfit').click()); await posee();
  const s1 = await page.evaluate(() => ({ s: app.vue.s, c: VUE.cadrage, z: $('zlbl').textContent }));
  await page.evaluate(() => $('zfit').click()); await posee();
  const s2 = await page.evaluate(() => ({ s: app.vue.s, c: VUE.cadrage, z: $('zlbl').textContent }));
  ok(s1.c === 'dessin' && s1.s > s0 * 1.5 && s2.c === 'feuille' && Math.abs(s2.s - s0) < s0 * 0.02, '« Ajuster » alterne : la feuille, puis le dessin au plus près (folio 1 : ' + s1.z + '), puis la feuille', JSON.stringify({ s0, s1, s2 }));
  const prog = await page.evaluate(() => { ajuster(true); return VUE.cadrage; }); await page.waitForTimeout(400);
  ok(prog === 'feuille', 'un recadrage de l’outil (ajuster) ne bascule rien');
  await page.mouse.move(700, 450); await page.keyboard.press('0'); await posee();
  const t0 = await page.evaluate(() => VUE.cadrage); await page.keyboard.press('0'); await posee();
  ok(t0 === 'dessin' && await page.evaluate(() => VUE.cadrage) === 'feuille', 'la touche 0 alterne aussi');
  await folio('3'); await feuille(); await page.waitForTimeout(400);
  await page.evaluate(() => zoomerA(0.7)); const crans = [await zoom()]; for (const k of [1.25, 1.25, 1.25, 0.8]) { await page.evaluate(k => zoomer(k), k); crans.push(await zoom()); }
  ok(crans.join() === '70 %,75 %,100 %,150 %,100 %', 'les pas du zoom tombent sur des crans', crans.join(' → '));
  await page.mouse.move(700, 450); await page.keyboard.press('2'); const z2 = await zoom(); await page.keyboard.press('1'); const z1 = await zoom();
  ok(z2 === '200 %' && z1 === '100 %', 'la touche 2 : 200 %, la touche 1 : 100 %', z2 + ' · ' + z1);
  const bornes = await page.evaluate(() => { ajuster(); const f = app.vue.s; zoomer(0.001); const bas = app.vue.s / f; zoomer(1e5); const haut = $('zlbl').textContent; ajuster(); return { bas: +bas.toFixed(2), haut }; });
  ok(bornes.bas >= 0.49 && parseInt(bornes.haut) <= 600 && parseInt(bornes.haut) >= 400, 'le zoom va de la moitié de la feuille entière à 600 % au plus', JSON.stringify(bornes));
  ok(await page.evaluate(() => $('scene').classList.contains('loin')), 'à la page entière (un trait sous le pixel), le folio est « loin » : ses traits s’épaississent');
  await zoomSur(200, 640, 300); ok(!(await page.evaluate(() => $('scene').classList.contains('loin'))), 'à 200 %, il ne l’est plus');
  // une vue que la MAIN pose (la touche 2) se garde telle quelle ; celle que l'outil pose (une recherche) se refait en cadrage
  await page.mouse.move(700, 450); await page.keyboard.press('2');
  const v3 = await page.evaluate(() => ({ s: app.vue.s, cx: (cadre().width / 2 - app.vue.tx) / app.vue.s, main: VUE.main }));
  await folio('4'); await folio('3');
  const v3b = await page.evaluate(() => ({ s: app.vue.s, z: $('zlbl').textContent }));
  ok(v3.main && Math.abs(v3b.s - v3.s) < 0.001 && v3b.z === '200 %', 'chaque folio garde sa vue : le folio 3 quitté à 200 % s’y retrouve', JSON.stringify({ avant: v3, apres: v3b }));
  await page.evaluate(() => aller({ type: 'repere', nom: '352PM2' })); await posee();
  await folio('4'); await folio('3');
  ok(await zoom() === '59 %', 'une vue posée par l’outil (aller voir 352PM2) ne se garde pas : le folio revient cadré', await zoom());
  await page.mouse.move(700, 450); await page.keyboard.press('2'); await folio('4'); await folio('3');
  await page.waitForTimeout(1200);
  const garde = await page.evaluate(() => { const c = JSON.parse(localStorage.getItem('atelier.contrat.v2') || '{}'), v = JSON.parse(localStorage.getItem('atelier.vues.v1') || '[]'); return { plan: c.plan, vues: v.length }; });
  ok(garde.plan === '3' && garde.vues >= 2, 'le folio se garde avec le contrat (le lendemain, on rouvre au folio 3), les vues dans ce navigateur', JSON.stringify(garde));
  // le lendemain : la page quittée garde la vue ; rouvert sur le folio 3, `retrouverVue` la rend (relire et la bibliothèque
  // l'appelleront : demande au domaine du parcours), et l'aller-retour entre folios aussi
  await charger(); await page.evaluate(() => atelier.reprendre()); await page.waitForFunction(() => !!app.dessin);
  const lendemain = await page.evaluate(() => { const plan = app.plan, rendue = retrouverVue(); return { plan, rendue, z: $('zlbl').textContent }; });
  await page.evaluate(() => { allerAuPlan('4'); allerAuPlan('3'); }); await page.waitForTimeout(300);
  ok(lendemain.plan === '3' && lendemain.rendue && lendemain.z === '200 %' && await zoom() === '200 %', 'après un rechargement, on rouvre au folio 3, à sa vue (200 %)', JSON.stringify(lendemain));
  // la recherche : 412VC3B (folio 5) arrive lisible
  await page.evaluate(() => { allerAuPlan('1'); VUE.cadrage = 'feuille'; ajuster(); aller({ type: 'repere', nom: '412VC3B' }); }); await page.waitForTimeout(300); await posee();
  const rech = await page.evaluate(() => { const c = app.dessin.comps.find(k => k.name === '412VC3B' && k.kind !== 'tag'), r = cadre(), m = marges(); return { plan: app.plan, px: +(FS_FIL * app.vue.s).toFixed(1), tient: c.h * app.vue.s <= r.height - m.haut - m.bas, z: $('zlbl').textContent }; });
  ok(rech.plan === '5' && rech.px >= 9.9, 'la recherche de 412VC3B arrive lisible : un numéro de câble à ' + rech.px + ' px (' + rech.z + ')', JSON.stringify(rech));
  await page.evaluate(() => { deselectionner(); fermerInspecteur(); allerAuPlan('3'); const c = app.dessin.comps.find(k => k.name === '300XC1' && k.kind !== 'tag'); VUE.cadrage = 'feuille'; ajuster(); choisirBloc(c); viser('300XC1'); }); await page.waitForTimeout(300); await posee();
  const haut = await page.evaluate(() => { const c = app.dessin.comps.find(k => k.name === '300XC1' && k.kind !== 'tag'), r = cadre(), m = marges(), y0 = app.vue.ty + c.y * app.vue.s, y1 = y0 + c.h * app.vue.s; return { y0, y1, haut: m.haut, bas: r.height - m.bas }; });
  ok(haut.y0 >= haut.haut - 2 && haut.y1 <= haut.bas + 2, 'un bloc très haut (300XC1) visé se montre entier, au plus près', JSON.stringify(haut));

  /* ---- SE DÉPLACER ---- */
  console.log('\nSE DÉPLACER');
  await page.evaluate(() => { deselectionner(); fermerInspecteur(); });
  const b372 = await page.evaluate(() => { const c = app.dessin.comps.find(k => k.name === '372CP2' && k.kind !== 'tag'); return { x: c.x + c.w / 2, y: c.y + Math.min(c.h / 2, 25) }; });
  const glisserVue = async (bouton, espace) => { await zoomSur(200, b372.x, b372.y); const e = await ecranDuPoint(b372.x, b372.y);
    const av = await page.evaluate(() => ({ ty: app.vue.ty, y: app.dessin.comps.find(k => k.name === '372CP2' && k.kind !== 'tag').y, auto: !$('btnAuto').hidden }));
    await page.mouse.move(e.x, e.y); if (espace) await page.keyboard.down('Space'); await page.waitForTimeout(80);
    const curseur = await page.evaluate(([x, y]) => getComputedStyle(document.elementFromPoint(x, y)).cursor, [e.x, e.y]);
    await page.mouse.down({ button: bouton }); for (let k = 1; k <= 6; k++) { await page.mouse.move(e.x, e.y - 20 * k); await page.waitForTimeout(30); } await page.mouse.up({ button: bouton });
    if (espace) await page.keyboard.up('Space'); await page.waitForTimeout(300);
    const ap = await page.evaluate(() => ({ ty: app.vue.ty, y: app.dessin.comps.find(k => k.name === '372CP2' && k.kind !== 'tag').y, auto: !$('btnAuto').hidden, choisi: app.choisi }));
    return { vue: Math.round(ap.ty - av.ty), bloc: Math.round(ap.y - av.y), retouche: ap.auto && !av.auto, choisi: ap.choisi, curseur }; };
  const milieu = await glisserVue('middle', false);
  ok(milieu.vue < -80 && !milieu.bloc && !milieu.retouche && !milieu.choisi, 'le bouton du milieu sur un bloc, à 200 % : la vue glisse, le bloc reste', JSON.stringify(milieu));
  const esp = await glisserVue('left', true);
  ok(esp.vue < -80 && !esp.bloc && !esp.retouche && esp.curseur === 'grab', 'Espace + glisser sur un bloc : la vue glisse (la main ouverte), le bloc reste', JSON.stringify(esp));
  await zoomSur(200, b372.x, b372.y); const e3 = await ecranDuPoint(b372.x, b372.y);
  await page.mouse.click(e3.x, e3.y, { button: 'middle' }); await page.waitForTimeout(300);
  ok(!(await page.evaluate(() => app.choisi)), 'un clic du milieu ne choisit rien');
  await page.mouse.move(e3.x + 3, e3.y + 3); await page.waitForTimeout(150);
  const cur = await page.evaluate(([x, y]) => ({ prise: $('planche').dataset.prise, sur: getComputedStyle(document.elementFromPoint(x, y)).cursor, papier: getComputedStyle($('planche')).cursor }), [e3.x + 3, e3.y + 3]);
  ok(cur.prise === 'bloc' && cur.sur === 'move' && cur.papier === 'grab', 'le curseur dit ce qui se prend : la croix sur un bloc, la main sur le papier', JSON.stringify(cur));

  /* ---- LE CARTOUCHE D'UN FOLIO FWD ---- */
  console.log('\nLE CARTOUCHE');
  const cart = await page.evaluate(() => { const L = contratExemple().map(l => ({ ...l, plan: 'PL0042A7815000' + l.plan + 'A' })); chargerContrat(L, 'essai FWD', 'FWD essai'); allerAuPlan(plans()[2]);
    const t = c => { const e = document.querySelector('#scene text.' + c); return e ? e.textContent : null; }, bord = document.querySelector('#scene rect.cbord').getBBox();
    const textes = [...document.querySelectorAll('#scene text')].filter(e => /^(carth|cartx|cartT|cartF|cartA|cartD|legnom|legn)$/.test(e.getAttribute('class')));
    const dehors = textes.filter(e => { const b = e.getBBox(); return b.x < bord.x - 0.5 || b.x + b.width > bord.x + bord.width + 0.5; }).map(e => e.textContent);
    return { folio: t('cartF'), dessin: t('cartD'), dehors, echelle: [...document.querySelectorAll('#scene text.cartx')].map(e => e.textContent), legende: [...document.querySelectorAll('#scene text.legn')].map(e => e.textContent) }; });
  ok(cart.folio === '3 / 6' && cart.dessin === 'PL0042A78150003A', 'la case FOLIO dit le rang (3 / 6), le dessin FWD a sa ligne, en entier', JSON.stringify({ folio: cart.folio, dessin: cart.dessin }));
  ok(!cart.dehors.length, 'aucun texte du cartouche ne sort de sa case', cart.dehors.join(' | '));
  ok(cart.echelle.includes('sans') && cart.legende.length && cart.legende.every(t => /câbles?$/.test(t)), 'l’échelle dit « sans », la légende compte des câbles', JSON.stringify(cart.legende));

  /* ---- LES RENVOIS ---- */
  console.log('\nLES RENVOIS');
  await page.evaluate(() => { const L = []; let w = 100; const fil = (de, bd, vers, bv, route) => L.push({ de, borneDe: String(bd), vers, borneVers: String(bv), cable: 'W-' + (w++), type: 'DR22', route });
    for (let i = 0; i < 6; i++) { const r = 'R' + i, a = (100 + i) + 'LP' + (i + 1), b = (200 + i) + 'SW' + (i + 1), c = (300 + i) + 'RL' + (i + 1); fil(a, 1, b, 1, r); fil(b, 2, c, 'A1', r); fil(c, 'A2', (400 + i) + 'PM' + (i + 1), 1, r); if (i) fil(a, 2, (300 + i - 1) + 'RL' + i, 'X1', r); }
    atelier.charger(L); decouper(4); allerAuPlan('2'); VUE.cadrage = 'feuille'; ajuster(); }); await page.waitForTimeout(300);
  const dr = await page.evaluate(() => { const g = [...document.querySelectorAll('#scene .comp.renvoi')].find(x => x.dataset.name === '▷F1');
    return g ? { boite: !!g.querySelector('rect.body'), fleche: !!g.querySelector('.drapeau'), f: (g.querySelector('.dr-f') || {}).textContent, ou: (g.querySelector('.dr-ou') || {}).textContent } : null; });
  ok(dr && !dr.boite && dr.fleche && dr.f === 'F1' && dr.ou === '300RL1:X1', 'un renvoi est un drapeau : la flèche, « F1 », l’autre bout en entier — plus de boîte', JSON.stringify(dr));
  const rv = await page.evaluate(() => { const c = app.dessin.comps.find(k => k.name === '▷F1'); return { x: c.x + c.w / 2, y: c.y + c.h / 2 }; });
  await zoomSur(150, rv.x, rv.y); const vueAvant = await page.evaluate(() => ({ ...app.vue })); const er = await ecranDuPoint(rv.x, rv.y);
  await page.mouse.move(er.x - 30, er.y); await page.mouse.move(er.x, er.y, { steps: 2 }); await page.waitForTimeout(700);
  const bulleR = await page.evaluate(() => { const b = $('pl-bulle'); return b && !b.hidden ? b.textContent : ''; });
  ok(/Vers le folio 1/.test(bulleR) && /300RL1:X1/.test(bulleR), 'survolé, le renvoi dit où il mène', bulleR);
  await page.mouse.click(er.x, er.y); await page.waitForTimeout(400); await posee();
  const apres = await page.evaluate(() => ({ plan: app.plan, cible: app.cible && app.cible.type === 'fil' ? app.cible.l.cable : null, hl: document.querySelectorAll('#scene .cab.hl').length, px: +(FS_FIL * app.vue.s).toFixed(1), toast: $('toast').textContent }));
  ok(apres.plan === '1' && apres.cible === 'W-106' && apres.hl >= 1, 'le clic va au folio 1 : l’autre moitié (W-106) choisie et allumée', JSON.stringify(apres));
  ok(apres.px >= 9.9 && /Alt\+← revient au folio 2/.test(apres.toast), 'centrée, lisible, et le mot dit comment revenir', apres.px + ' px · ' + apres.toast);
  await page.mouse.move(700, 450); await page.keyboard.press('Alt+ArrowLeft'); await page.waitForTimeout(300); await posee();
  const retour = await page.evaluate(() => ({ plan: app.plan, vue: { ...app.vue }, cible: app.cible }));
  ok(retour.plan === '2' && Math.abs(retour.vue.s - vueAvant.s) < 1e-6 && Math.abs(retour.vue.tx - vueAvant.tx) < 1 && !retour.cible, 'Alt+← revient au folio 2, à la même vue', JSON.stringify({ avant: vueAvant, retour: retour.vue }));

  /* ---- LA BULLE, LA RÉFÉRENCE CROISÉE ---- */
  console.log('\nLA BULLE');
  await page.evaluate(() => atelier.exemple()); await folio('3'); await feuille(); await page.waitForTimeout(400);
  const w334 = await page.evaluate(() => { const w = app.dessin.fils.find(w => w.cable === 'W-334'), a = w.pts[0], b = w.pts[1]; return { x: (a.x + b.x) / 2, y: a.y }; });
  const ew = await ecranDuPoint(w334.x, w334.y); await page.mouse.move(ew.x - 20, ew.y - 20); await page.mouse.move(ew.x, ew.y, { steps: 2 }); await page.waitForTimeout(800);
  const bulleF = await page.evaluate(() => { const b = $('pl-bulle'); return b && !b.hidden ? b.textContent : ''; });
  ok(/W-334/.test(bulleF) && /→/.test(bulleF) && /BLINDÉ/.test(bulleF), 'la souris posée sur un câble : son numéro, de → vers, sa route', bulleF);
  const e3c = await ecranDe('300XC1'); await page.mouse.move(e3c.x, e3c.y + 60); await page.mouse.move(e3c.x, e3c.y + 80, { steps: 2 }); await page.waitForTimeout(800);
  const bulleB = await page.evaluate(() => { const b = $('pl-bulle'); return b && !b.hidden ? b.textContent : ''; });
  ok(/300XC1/.test(bulleB) && /\d+ câbles sur ce folio/.test(bulleB), 'sur un bloc : son repère, ses câbles sur ce folio', bulleB);
  await page.mouse.move(1400, 880); await folio('1'); await feuille(); await page.waitForTimeout(300);
  const xr = await page.evaluate(() => { const g = [...document.querySelectorAll('#scene .comp')].find(x => x.dataset.name === '395SW1'); return g && g.querySelector('.xref') ? g.querySelector('.xref').textContent : ''; });
  const e395 = await ecranDe('395SW1'); await page.mouse.move(e395.x, e395.y - 10); await page.mouse.move(e395.x, e395.y, { steps: 2 }); await page.waitForTimeout(800);
  const bulleX = await page.evaluate(() => { const b = $('pl-bulle'); return b && !b.hidden ? b.textContent : ''; });
  ok(xr === '↔ f. 3' && /aussi sur f\. 3/.test(bulleX), '395SW1, aussi au folio 3 : « ↔ f. 3 » sous son repère, et la bulle le dit', xr + ' · ' + bulleX);
  await page.mouse.move(1400, 880);

  /* ---- LE CLIC ---- */
  console.log('\nLE CLIC');
  await folio('3'); await feuille(); await page.waitForTimeout(300);
  const clic = await page.evaluate(() => { const sc = $('scene'), xs = []; let garde = true;
    for (let k = 0; k < 6; k++) { const n = k % 2 ? '351PM1' : '352PM2', t0 = performance.now(); choisirBloc(app.dessin.comps.find(x => x.name === n && x.kind !== 'tag')); xs.push(performance.now() - t0); if ($('scene') !== sc) garde = false; }
    const g = [...document.querySelectorAll('#scene .comp')].find(x => x.dataset.name === '351PM1');
    return { garde, crochets: !!(g && g.querySelector('.selbox')), seuls: document.querySelectorAll('#scene .selbox').length, ms: Math.round(xs.sort((a, b) => a - b)[3]) }; });
  ok(clic.garde && clic.crochets && clic.seuls === 1, 'choisir un bloc ne réécrit plus le folio : les crochets se posent dans le bloc (' + clic.ms + ' ms par choix)', JSON.stringify(clic));
  const rep = await page.evaluate(() => { const sc = $('scene'); app.contrat.designations.set('351PM1', 'POMPE ESSAI'); peindre(); const neuf = $('scene') !== sc, lu = [...document.querySelectorAll('#scene text.des')].some(t => t.textContent === 'POMPE ESSAI');
    app.contrat.designations.delete('351PM1'); peindre(); return { neuf, lu, crochets: !!document.querySelector('#scene .comp[data-name="351PM1"] .selbox') }; });
  ok(rep.neuf && rep.lu && rep.crochets, 'ce qui s’écrit sous un repère change : le folio se repeint, les crochets restent', JSON.stringify(rep));
  await page.evaluate(() => { deselectionner(); allerAuPlan('5'); choisirBloc(app.dessin.comps.find(k => k.name === '412VC3B' && k.kind !== 'tag')); }); await page.waitForTimeout(300);
  const prise = await page.evaluate(() => { const g = [...document.querySelectorAll('#scene .comp')].find(x => x.dataset.name === '412VC3B'), s = g.querySelector('.selbox').getBBox(), c = app.dessin.comps.find(k => k.name === '412VC3B' && k.kind !== 'tag'); return { large: Math.round(s.width), bloc: c.w }; });
  ok(prise.large < prise.bloc / 2, 'les crochets d’une prise entourent sa réglette, pas ses amenées', JSON.stringify(prise));

  /* ---- L'EXPORT ---- */
  const exp = await page.evaluate(() => { const S = svgDuFolio(); return { grille: /url\(#gfine\)/.test(S.txt.replace(/<pattern[\s\S]*?<\/pattern>/, '')), cables: /câbles?</.test(S.txt) }; });
  ok(!exp.grille && exp.cables, 'l’export n’emporte pas le quadrillage fin', JSON.stringify(exp));
  ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
  console.log('\n  ' + (ko ? ko + ' échec(s)' : 'tout tient'));
  await nav.close(); process.exit(ko ? 1 : 0);
})();
