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
   borne d'équipement) : posée par le routage au ras de la borne, une borne
   par fil — le fil à créer compris, borne 1 —, numérotées comme la fiche,
   jamais deux au même niveau ; plus aucune borne d'équipement ne porte deux
   fils dans le folio. Un clic dessus ouvre sa fiche ; la poser au contrat
   sous un vrai repère, et Ctrl+Z la rend.
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
    if (vp.width <= 700) {
      // fiche ouverte, la bande des folios reste, posée au-dessus du tiroir (sa hauteur est dite au style par --insp-h)
      e = await ecran(...c); await page.mouse.click(e.x, e.y); await page.waitForTimeout(600);
      const b = await page.evaluate(() => { const f = $('folios').getBoundingClientRect(), i = $('inspecteur').getBoundingClientRect(); return { display: getComputedStyle($('folios')).display, bas: Math.round(f.bottom), haut: Math.round(i.top), chip: !!document.querySelector('#fo-strip .chip.on'), insp: !$('inspecteur').hidden }; });
      ok(b.insp && b.display !== 'none' && Math.abs(b.bas - b.haut) <= 2 && b.chip, 'au téléphone, fiche ouverte, la bande des folios reste, posée au-dessus du tiroir', JSON.stringify(b));
      // un bloc haut visé depuis l'index (300XC1, le calculateur du folio 3) : cadré sur sa largeur, lisible, le haut du bloc à l'écran
      await page.evaluate(() => { fermerInspecteur(); allerAuPlan('3'); allerAuRepere('300XC1'); }); await page.waitForTimeout(900);
      const v = await page.evaluate(() => { const c = app.dessin.comps.find(k => k.name === '300XC1' && k.kind !== 'tag'), s = app.vue.s, r = $('planche').getBoundingClientRect(), y0 = r.top + app.vue.ty + c.y * s, x0 = r.left + app.vue.tx + c.x * s;
        return { w: Math.round(c.w * s), y0: Math.round(y0), x0: Math.round(x0), x1: Math.round(x0 + c.w * s), haut: $('entete').getBoundingClientRect().bottom, bas: $('folios').getBoundingClientRect().top }; });
      ok(v.w >= 100 && v.y0 >= v.haut && v.y0 < v.bas - 40 && v.x0 >= 0 && v.x1 <= 390, 'au téléphone, 300XC1 visé depuis l’index fait au moins 100 px de large et son haut (le repère) est dans la place libre', JSON.stringify(v));
      await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
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
    return app.dessin.barrettes.filter(b => b.nomVT).map(b => { const bs = bornesDePiquage(b);
      const fils = L.filter(l => l.origine && (l.de === b.nomVT || l.vers === b.nomVT)).length, ys = bs.map(p => Math.round(p.y * 2));
      return { pl, nom: b.nomVT, fils, bornes: bs.length, distinctes: new Set(ys).size === ys.length && bs.every((p, i) => !i || p.y - bs[i - 1].y >= 9.9),
        numeros: bs.map(p => p.n).sort().join(''), ecrit: svg.includes('>' + b.nomVT + '</text>'), doubles }; })
      .concat(doubles.length ? [{ pl, nom: '—', doubles }] : []); }));
  ok(vts.length > 0, 'l’exemple a des dédoublements', vts.length + ' barrettes à poser');
  vts.forEach(v => v.nom === '—' ? ok(false, `folio ${v.pl} : des bornes d’équipement portent encore deux fils`, v.doubles.join(' '))
    : ok(v.bornes === v.fils + 1 && v.distinctes && v.ecrit && !v.doubles.length && v.numeros === Array.from({ length: v.fils + 1 }, (_, i) => i + 1).join(''),
      `folio ${v.pl} · ${v.nom} : ${v.fils} fils + le fil à créer = ${v.fils + 1} bornes numérotées 1 à ${v.fils + 1}, chacune à sa hauteur, repère écrit`, v.bornes + ' bornes · ' + v.numeros));
  // la fiche de VT1, puis la poser au contrat sous un vrai repère, et la reprendre
  // un clic sur la barrette, à la vraie souris
  await page.evaluate(() => { app.plan = '1'; deselectionner(); redessiner(); ajuster(); }); await page.waitForTimeout(300);
  const vt1 = await page.evaluate(() => { const b = app.dessin.barrettes.find(b => b.nomVT === 'VT1'), bs = bornesDePiquage(b), r = $('planche').getBoundingClientRect();
    return { x: r.left + app.vue.tx + b.x * app.vue.s, y: r.top + app.vue.ty + (bs[0].y + bs[1].y) / 2 * app.vue.s }; });
  await page.mouse.click(vt1.x, vt1.y); await page.waitForTimeout(400);
  ok(await page.evaluate(() => app.cible && app.cible.nom === 'VT1' && !$('inspecteur').hidden), 'un clic sur la barrette VT1 ouvre sa fiche');
  ok(await page.evaluate(() => /à poser/i.test($('ba-equip').textContent) && $('ba-equip').querySelectorAll('.fi-fil').length === 3), 'la fiche de VT1 : à poser, trois bornes');
  await page.fill('#eq-rep', '102VT9'); await page.press('#eq-rep', 'Enter'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => { const L = app.contrat.liaisons.filter(l => l.de === '102VT9' || l.vers === '102VT9');
    return L.length === 5 && L.some(l => l.de === '102CB1' && l.borneDe === '2' && l.borneVers === '1' && !l.cable) && app.dessin.comps.some(c => c.name === '102VT9') && !app.dessin.barrettes.some(b => b.nomVT === 'VT1'); }),
    'VT1 posée sous 102VT9 : le fil à créer, les deux fils, deux shunts — dessinée comme avant');
  await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => app.contrat.liaisons.length === 201 && app.dessin.barrettes.some(b => b.nomVT === 'VT1')), 'Ctrl+Z rend VT1');
  // survoler une ligne de la fiche allume son fil sur le plan
  await page.evaluate(() => { choisirBloc(app.dessin.comps.find(k => k.name === '103RL1' && k.kind !== 'tag')); }); await page.waitForTimeout(300);
  const li = await page.locator('#ba-equip .fi-fil[data-i]').first().boundingBox(); await page.mouse.move(li.x + li.width / 2, li.y + li.height / 2); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !!document.querySelector('#scene.focus') && !!document.querySelector('#ba-equip .fi-fil.vise')), 'survoler un fil de la fiche l’allume sur le plan');
  // le contrôle : le compte sur le bouton des repères, la liste « à reprendre » en tête de l'index, une ligne qui mène au bloc, sur son folio
  await page.keyboard.press('Escape'); await page.keyboard.press('r'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => !$('btnIndex').querySelector('.rd-point').hidden && /problème/.test($('ba-equip').querySelector('.ix-controle').textContent) && $('ba-equip').querySelectorAll('.co-item').length === new Set(CONTROLE.items.map(x => x.niveau + '|' + (x.nom || x.texte))).size && CONTROLE.items.some(x => x.nom === 'VT1') && /102CB1 2 problèmes/.test($('ba-equip').querySelector('.co-item').textContent) && !document.getElementById('controle')),
    'plus de pastille sur le plan : le bouton des repères porte le compte, l’index liste ce qu’il y a à reprendre, une ligne par repère (102CB1 : 2 problèmes), les barrettes à poser comprises');
  ok(await page.evaluate(() => [...$('ba-equip').querySelectorAll('.ix-groupe')].some(g => /Disjoncteurs/.test(g.textContent)) && /10\sA/.test($('ba-equip').textContent)), 'l’index range les disjoncteurs à part, avec leur calibre');
  await page.locator('#ba-equip .co-item', { hasText: '300XC1' }).click(); await page.waitForTimeout(600);
  ok(await page.evaluate(() => app.plan === '3' && app.cible && app.cible.nom === '300XC1' && !$('inspecteur').hidden), 'une ligne mène au folio 3 et à la fiche de 300XC1');
  ok(await page.evaluate(() => !$('ba-equip').querySelector('.fi-norme') && !/Conforme/.test($('ba-equip').textContent)), 'la fiche ne répète pas la norme à côté de la référence, et ne dit pas « conforme »');
  // le disjoncteur : la gamme en puces (le 10 A du part number retenu, l'idéal étoilé), le graphique, les états ; un profil qui déclenche, Ctrl+Z
  await page.keyboard.press('Escape'); await page.evaluate(() => { allerAuPlan('1'); choisirBloc(app.dessin.comps.find(k => k.name === '102CB1' && k.kind !== 'tag')); }); await page.waitForTimeout(500);
  ok(await page.evaluate(() => { const s = document.querySelector('#ba-equip .fi-dj'), p = s && s.querySelector('.dj-chip[aria-pressed="true"]'); return !!s && p && p.dataset.cal === '10' && p.classList.contains('ok') && p.classList.contains('serre') && s.querySelector('.dj-chip.ideal').dataset.cal === '15' && s.querySelectorAll('.dj-chip').length === 7 && /part number/.test(s.querySelector('.dj-dou').textContent) && !!s.querySelector('.dj-graphe svg .dj-systeme') && s.querySelectorAll('.dj-courbe').length === 4 && s.querySelectorAll('.dj-fantome').length >= 5 && s.querySelector('[data-dj="dem"][data-q="i"]').value === '9,31' && !s.querySelector('.dj-note'); }),
    'la fiche de 102CB1 : sept calibres en puces, le 10 A du part number retenu, vert mais serré (il touche la courbe), l’étoile sur le 15 A ; quatre courbes, les autres calibres en fantôme, le profil en escalier ; aucune phrase');
  await page.fill('#ba-equip [data-dj="perm"][data-q="i"]', '9,5'); await page.press('#ba-equip [data-dj="perm"][data-q="i"]', 'Enter'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => { const s = document.querySelector('#ba-equip .fi-dj'), p = s && s.querySelector('.dj-chip[aria-pressed="true"]'); return !!s && p.classList.contains('ko') && !!s.querySelector('.dj-pt.ko[data-k="perm"]') && s.querySelector('.dj-chip.ideal').dataset.cal === '15' && app.contrat.charges.get('102CB1').perm.i === 9.5 && CONTROLE.items.some(x => x.nom === '102CB1' && x.niveau === 'ko' && /15 A/.test(x.texte)); }),
    '9,5 A en permanence : la puce du 10 A passe au rouge, le point du permanent aussi, l’étoile va au 15 A, le contrôle le relève');
  await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => app.contrat.charges.get('102CB1').perm.i === 5 && !CONTROLE.items.some(x => x.nom === '102CB1' && /permanent/.test(x.texte))), 'Ctrl+Z rend le profil de l’exemple');
  await page.evaluate(() => { choisirBloc(app.dessin.comps.find(k => k.name === '102CB1' && k.kind !== 'tag')); }); await page.waitForTimeout(500);
  ok(await page.evaluate(() => { const s = document.querySelector('#ba-equip .fi-dj'); const li = [...s.querySelectorAll('.dj-fils .fi-fil')]; return li.length === 3 && li.some(x => /W-015/.test(x.textContent) && x.classList.contains('ko') && /3,9 A/.test(x.textContent)) && CONTROLE.items.some(x => x.nom === '102CB1' && /W-015/.test(x.texte) && x.niveau === 'ko'); }),
    'ses trois fils sont jugés : le DR24 (W-015) ne tient pas 9,31 A pendant 2 min (3,9 A en faisceau, le point FAA), et le contrôle le dit');
  // un autre calibre par sa puce, puis rendu ; un état de plus, retiré ; le survol d'un point du profil
  await page.click('#ba-equip .dj-chip[data-cal="15"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => app.contrat.charges.get('102CB1').calibre === 15 && /choisi à la main/.test(document.querySelector('.dj-dou').textContent) && !CONTROLE.items.some(x => x.nom === '102CB1' && /suffirait/.test(x.texte))), 'la puce 15 A (l’idéal) le retient à la main ; le contrôle n’a plus rien à dire du calibre');
  await page.click('#ba-equip .dj-chip[data-cal="15"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => app.contrat.charges.get('102CB1').calibre === null && /part number/.test(document.querySelector('.dj-dou').textContent)), 'presser la puce retenue rend le calibre du part number');
  await page.click('#dj-plus'); await page.waitForTimeout(600); await page.fill('#ba-equip .dj-etat[data-k="plus0"] [data-q="i"]', '12'); await page.fill('#ba-equip .dj-etat[data-k="plus0"] [data-q="t"]', '30'); await page.press('#ba-equip .dj-etat[data-k="plus0"] [data-q="t"]', 'Enter'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => { const c = app.contrat.charges.get('102CB1'); return c.plus.length === 1 && c.plus[0].i === 12 && c.plus[0].t === 30 && document.querySelectorAll('#ba-equip .dj-graphe .dj-pt').length === 3 && document.querySelector('#ba-equip .dj-chip[aria-pressed="true"]').classList.contains('ko'); }), 'un état de plus (12 A pendant 30 s) : un point de plus sur le graphique, le 10 A déclenche');
  const pt = await page.locator('#ba-equip .dj-graphe .dj-pt[data-k="plus0"] .dj-point').boundingBox(); await page.mouse.move(pt.x + pt.width / 2, pt.y + pt.height / 2); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const t = document.querySelector('#ba-equip .dj-tip'); return !t.hidden && /État 3/.test(t.textContent) && /12\sA/.test(t.textContent) && /déclenche/.test(t.textContent); }), 'survoler le point dit l’état, son courant, sa durée, et que le 10 A déclenche');
  await page.click('#ba-equip .dj-x[data-x="plus0"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => app.contrat.charges.get('102CB1').plus.length === 0 && document.querySelector('#ba-equip .dj-chip[aria-pressed="true"]').classList.contains('ok')), 'l’état retiré : le 10 A tient de nouveau');
  // la fiche d'un fil : ses faits — le câble de la base, ce qu'il admet, le courant du disjoncteur en amont, la chute
  await page.evaluate(() => { const w = app.dessin.fils.find(w => w.cable === 'W-012'); if (w) { app.cible = { type: 'fil', l: verite()[w.i] }; ouvrirInspecteur(); } }); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const c = document.querySelector('#ba-equip .fi-faits'); return !!c && /1\sbrin/.test(c.textContent) && /Ø\s1,34\smm/.test(c.textContent) && /33,2\smΩ\/m/.test(c.textContent) && /6,9\sA\scontinu/.test(c.textContent) && /5\sA\spermanent · sous 102CB1/.test(c.textContent) && /pointe 9,31\sA/.test(c.textContent) && /en ligne depuis 102CB1/.test(c.textContent); }),
    'la fiche de W-012 (DR20) : 1 brin, Ø 1,34 mm, 33,2 mΩ/m ; 11,5 × 0,6 = 6,9 A en continu (le point FAA du faisceau de 102CB1) ; 5 A permanent sous 102CB1, pointe 9,31 A ; la chute en ligne depuis 102CB1');
  await page.evaluate(() => { allerAuPlan('3'); choisirBloc(app.dessin.comps.find(k => k.name === '300XC1' && k.kind !== 'tag')); }); await page.waitForTimeout(600);
  ok(await page.evaluate(() => document.querySelector('#ba-equip .fi-onglets [aria-selected="true"]').dataset.onglet === 'B' && !document.querySelector('#ba-equip [data-panneau="B"]').hidden), 'la fiche de 300XC1 s’ouvre sur l’onglet B, celui qui porte le problème');
  ok(await page.evaluate(() => { const f = document.querySelector('#ba-equip [data-panneau="A"] .fi-autour'); return !!f && /11\scâbles/.test(f.textContent) && /Ø\s[\d,]+\smm/.test(f.textContent) && /g\/m/.test(f.textContent) && /11× EN3155-003F2020/.test(f.textContent) && f.nextElementSibling && f.nextElementSibling.classList.contains('fi-liste'); }), 'le connecteur A de 300XC1, autour, avant ses fils : 11 contacts à sertir, le toron (11 câbles, un diamètre, une masse au mètre)');
  ok(await page.evaluate(() => { const li = document.querySelector('#ba-equip [data-panneau="A"] .fi-fil[data-i]'); return !!li && /DR24/.test(li.querySelector('.fi-type').textContent) && li.querySelector('.fi-sertir').textContent === '' && /381RL1:3/.test(li.querySelector('.fi-dest').textContent) && /W-320/.test(li.querySelector('.fi-w').textContent); }), 'une ligne de fil : le type, où il va, le numéro en retrait — le contact à sertir seulement s’il diffère de la nomenclature');
  // ce qui englobe le connecteur : un EN 4165 n'a pas de raccord (le lecteur) — ni tyrap, ni band-it, quoi qu'on choisisse ; le choix se garde quand même ; Ctrl+Z
  ok(await page.evaluate(() => { const h = document.querySelector('#ba-equip [data-panneau="A"] .fi-autour'); return !!h && /aucun/.test(h.textContent) && !/band-it|E0805|NSA935401/.test(h.textContent); }), 'le connecteur A de 300XC1 (EN 4165) : aucun raccord, ni tyrap ni band-it — « un EN 4165 n’en a pas »');
  await page.evaluate(() => { const b = document.querySelector('#ba-equip [data-panneau="A"] [data-changer^="rac|"]'); b.click(); }); await page.waitForTimeout(200);
  await page.evaluate(() => { document.querySelector('#ba-equip [data-panneau="A"] [data-raccord][data-champ="blindage"][data-v="GND"]').click(); }); await page.waitForTimeout(800);
  ok(await page.evaluate(() => { const h = document.querySelector('#ba-equip [data-panneau="A"] .fi-autour'); return !!h && /aucun/.test(h.textContent) && !/durci|E0805-01/.test(h.textContent) && app.contrat.raccords.get('300XC1|A').blindage === 'GND'; }), 'reprise sur le corps choisie : le choix est gardé au contrat, mais toujours aucun raccord ni band-it sur un EN 4165');
  await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => !app.contrat.raccords.get('300XC1|A')), 'Ctrl+Z défait le choix du raccord');
  // la chute en ligne depuis le disjoncteur, et la fiche d'un fil avec sa chute
  await page.evaluate(() => { allerAuPlan('1'); choisirBloc(app.dessin.comps.find(k => k.name === '102CB1' && k.kind !== 'tag')); }); await page.waitForTimeout(500);
  ok(await page.evaluate(() => { const c = document.querySelector('#ba-equip .dj-chutes'); return !!c && c.querySelectorAll('.fi-fil').length === 3 && /W-015/.test(c.textContent) && /V/.test(c.textContent); }), 'la fiche de 102CB1 : la chute en ligne jusqu’à ses trois équipements');
  // les contrats déjà faits : une base (l'exemple décalé), « Déjà fait » sur la fiche, la comparaison, reprendre, Ctrl+Z
  await page.evaluate(() => { const d = r => r.replace(/^(\d)(\d\d)([A-Z]+)(\d*)/, (m, a, b, c, e) => String(+a + 2) + b + c + e);
    const B = contratExemple().map(l => liaison({ ...l, de: d(l.de), vers: d(l.vers), harness: 'H-1', appareil: 'H160', retest: '2024-07-08' }));
    B.push(liaison({ de: '302CB1', borneDe: '3', pnDe: 'MS3320-10', vers: '305XX9', borneVers: '1', pnVers: 'ZZZ', cable: 'W-099', type: 'DR20', plan: '1', harness: 'H-1', appareil: 'H160' }));
    adopterReferences(B, 'essai'); choisirBloc(app.dessin.comps.find(k => k.name === '102CB1' && k.kind !== 'tag')); }); await page.waitForTimeout(600);
  ok(await page.evaluate(() => { const d = document.querySelector('#ba-equip .fi-deja'); return !!d && d.querySelectorAll('.fi-cand').length === 1 && /302CB1/.test(d.textContent) && /75\s%/.test(d.textContent) && /H160/.test(d.textContent); }), '« Déjà fait » sur 102CB1 : 302CB1 de H-1 (H160), 75 % de lignes communes');
  await page.click('#ba-equip .fi-cand'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => app.cible && app.cible.type === 'ref' && document.querySelectorAll('#ba-equip .cp-liste .cp-manque').length === 2 && document.querySelectorAll('#ba-equip .cp-liste .cp-identique').length === 4 && /305XX9/.test($('ba-equip').textContent) && $('cp-reprendre').disabled), 'la comparaison : une ligne manque chez nous (305XX9), trois pareilles ; rien à reprendre tant que rien n’est coché');
  const avant = await page.evaluate(() => verite().length);
  await page.click('#cp-tout'); await page.waitForTimeout(300); await page.click('#cp-reprendre'); await page.waitForTimeout(1200);
  ok(await page.evaluate(n => verite().length === n + 1 && verite().some(l => l.de === '102CB1' && l.borneDe === '3' && l.vers === '305XX9' && !l.cable) && app.cible && app.cible.type === 'bloc' && app.dessin.comps.some(c => c.name === '305XX9'), avant), 'reprendre : la liaison 102CB1:3 → 305XX9 entre au contrat, sans numéro, et se dessine');
  await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(800);
  ok(await page.evaluate(n => verite().length === n, avant), 'Ctrl+Z défait la reprise');
  await page.evaluate(() => { adopterReferences([], ''); });
  // l'édition manuelle depuis la fiche : « + fil » sur un équipement, supprimer un fil depuis sa fiche, « + équipement » dans l'index
  await page.evaluate(() => { allerAuPlan('1'); choisirBloc(app.dessin.comps.find(k => k.name === '103RL1' && k.kind !== 'tag')); }); await page.waitForTimeout(500);
  const n0 = await page.evaluate(() => verite().length); await page.click('#fi-fil-plus'); await page.waitForTimeout(600);
  ok(await page.evaluate(n => app.base.ouvert && verite().length === n + 1 && verite()[n].de === '103RL1' && document.activeElement && document.activeElement.dataset.f === 'vers', n0), '« + fil » sur 103RL1 : une ligne neuve dans le tableau, depuis 103RL1, le curseur sur « vers »');
  await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(600); await page.keyboard.press('b'); await page.waitForTimeout(300);
  await page.evaluate(() => { const w = app.dessin.fils.find(w => w.cable === 'W-013'); app.cible = { type: 'fil', l: verite()[w.i] }; ouvrirInspecteur(); }); await page.waitForTimeout(400);
  page.once('dialog', d => d.accept()); await page.click('#fi-menu'); await page.click('#fil-del'); await page.waitForTimeout(900);
  ok(await page.evaluate(n => verite().length === n - 1 && !verite().some(l => l.cable === 'W-013') && !app.dessin.fils.some(w => w.cable === 'W-013'), n0), 'supprimer W-013 depuis sa fiche : il quitte le contrat et le plan');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(600);
  ok(await page.evaluate(n => verite().length === n && verite().some(l => l.cable === 'W-013'), n0), 'Ctrl+Z le rend');
  // « + » ouvre un champ en ligne sous le titre (plus de boîte du navigateur) : on écrit le repère, Entrée l'ajoute
  await page.keyboard.press('r'); await page.waitForTimeout(400); await page.click('#ix-plus'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !!$('ix-nouveau') && document.activeElement === $('ix-nouveau')), '« + » dans l’index : un champ en ligne, le curseur dedans');
  await page.keyboard.type('105RL2'); await page.keyboard.press('Enter'); await page.waitForTimeout(600);
  ok(await page.evaluate(n => app.base.ouvert && verite().length === n + 1 && verite()[n].de === '105RL2' && !$('ix-nouveau'), n0), '« + » dans l’index : un équipement 105RL2, sa première ligne dans le tableau');
  await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(600);
  // R depuis une fiche venue de l'index ramène à la liste (il ne ferme plus le panneau)
  await page.evaluate(() => { app.cible = null; fermerInspecteur(); }); await page.keyboard.press('r'); await page.waitForTimeout(400);
  await page.locator('#ba-equip .co-item', { hasText: '102CB1' }).first().click(); await page.waitForTimeout(500); await page.keyboard.press('r'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => !$('inspecteur').hidden && app.insp.index && !app.cible && !!document.querySelector('#ba-equip .co-item')), 'R depuis la fiche de 102CB1 (venue de l’index) ramène à la liste des repères');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);

  /* L'ACCUEIL à la vraie souris, le contrat neuf, les folios aux noms longs, les mots au pluriel, les noms de fichier */
  console.log('\nl’accueil à la vraie souris, le contrat neuf, les folios aux noms de dessin');
  page.once('dialog', d => d.accept()); await page.click('#btnMenu'); await page.click('#menu [data-act="vider"]'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => !$('vide').hidden && !app.contrat.liaisons.length && !app.contrat.charges.size && $('inspecteur').hidden), '« Tout effacer » : l’accueil, un contrat neuf (plus de profil de charge), rien d’ouvert');
  // chaque geste de l'accueil répond à un clic de souris (la planche ne prend plus la capture du pointeur sur l'accueil)
  let fc = null; try { [fc] = await Promise.all([page.waitForEvent('filechooser', { timeout: 3000 }), page.click('#vd-ouvrir')]); } catch (_) { }
  ok(!!fc, 'un clic de souris sur « Ouvrir un fichier » ouvre le choix de fichier');
  fc = null; try { [fc] = await Promise.all([page.waitForEvent('filechooser', { timeout: 3000 }), page.click('#vd-zone')]); } catch (_) { }
  ok(!!fc, 'un clic sur la zone de dépôt aussi');
  await page.click('#vd-reprendre'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => app.contrat.liaisons.length === 201 && app.contrat.charges.has('102CB1') && $('vide').hidden), '« Reprendre » rend l’exemple, avec son profil de charge');
  page.once('dialog', d => d.accept()); await page.click('#btnMenu'); await page.click('#menu [data-act="vider"]'); await page.waitForTimeout(400);
  await page.click('#vd-exemple'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => app.contrat.liaisons.length === 201 && app.nom === 'Contrat d’exemple' && $('en-nom').textContent === 'Contrat d’exemple' && /^l’exemple embarqué · 201 liaisons · \d+ repères · 6 folios$/.test($('en-sous').textContent)), '« Voir l’exemple » le charge ; l’en-tête dit que c’est l’exemple embarqué', await page.evaluate(() => $('en-sous').textContent));
  // un autre fichier : rien du contrat d'avant ne survit ; l'en-tête dit son nom ; Ctrl+Z rend l'exemple et ses choix
  await page.evaluate(() => chargerContrat(contratExemple().filter(l => l.plan === '1'), 'ouverture de neuf.xlsx', 'neuf.xlsx')); await page.waitForTimeout(500);
  ok(await page.evaluate(() => !app.contrat.charges.size && !app.contrat.designations.size && !app.contrat.sexes.size && !app.contrat.raccords.size && $('en-nom').textContent === 'neuf.xlsx' && !/exemple/.test($('en-sous').textContent) && !CONTROLE.items.some(x => x.nom === '102CB1' && /9,31/.test(x.texte))),
    'un autre fichier ouvert : rien du contrat d’avant ne survit (son 102CB1 n’a pas le profil de l’exemple), l’en-tête dit le nom du fichier', await page.evaluate(() => $('en-nom').textContent + ' · ' + $('en-sous').textContent));
  await page.keyboard.press('Control+z'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => app.nom === 'Contrat d’exemple' && app.contrat.charges.has('102CB1') && app.contrat.liaisons.length === 201), 'Ctrl+Z rend l’exemple avec ses choix');
  // dix folios aux noms de dessin (FWD) : les puces s'abrègent, aucune ne déborde, la courante en entier, une liste déroulante en plus
  await page.evaluate(() => { const E = contratExemple(), F = p => 'MEE256A78150' + String(p).padStart(2, '0') + 'A', L = E.map(l => liaison({ ...l, plan: F(l.plan) }));
    for (let k = 7; k <= 10; k++) { const z = r => r.replace(/^(\d+)/, d => String(+d + 1000 * k)); E.filter(l => l.plan === '1').forEach(l => L.push(liaison({ ...l, de: z(l.de), vers: z(l.vers), cable: l.cable + '-' + k, plan: F(k) }))); }
    chargerContrat(L, 'essai', 'fwd.xlsx'); }); await page.waitForTimeout(800);
  ok(await page.evaluate(() => { const cs = [...document.querySelectorAll('#fo-strip .chip')], on = document.querySelector('#fo-strip .chip.on'), sel = $('fo-select'), r = $('fo-strip').getBoundingClientRect(), o = on && on.getBoundingClientRect();
    return cs.length === 10 && cs.every(c => c.classList.contains('abrege') && c.scrollWidth <= c.clientWidth + 1 && c.dataset.nom === 'Folio ' + c.dataset.plan && !c.title && c.textContent === c.dataset.plan) && on && on.dataset.plan === 'MEE256A7815001A' && getComputedStyle(on.querySelector('.chip-pre')).display !== 'none' && cs.filter(c => c !== on).every(c => getComputedStyle(c.querySelector('.chip-pre')).display === 'none') && o.left >= r.left - 1 && o.right <= r.right + 1 && !sel.hidden && sel.options.length === 10 && sel.value === 'MEE256A7815001A'; }),
    'dix folios aux noms de dessin (MEE256A7815001A…) : les puces abrégées (« …01A », le nom entier dedans et en bulle), aucune ne déborde, la courante en entier et dans la bande, une liste déroulante en plus');
  await page.selectOption('#fo-select', 'MEE256A7815009A'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => app.plan === 'MEE256A7815009A' && $('fo-lbl').textContent === '9 / 10' && document.querySelector('#fo-strip .chip.on').dataset.plan === 'MEE256A7815009A'), 'la liste déroulante va au folio 9');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(600);
  // les mots au pluriel, les noms de fichier enregistrés (ASCII : sous file://, Chromium remplace par « download » un nom qui porte un accent ou un tiret cadratin)
  ok(await page.evaluate(() => pluriel(2, 'harness') === '2 harness' && pluriel(2, 'fil') === '2 fils' && pluriel(1, 'harness') === '1 harness'), '« 2 harness », « 2 fils »');
  const nomTelecharge = async act => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.evaluate(act)]); return d.suggestedFilename(); };
  const noms = [await nomTelecharge('exporterSuivi()'), await nomTelecharge('exporterNomenclature()'), await nomTelecharge('exporterSVG()')];
  ok(noms[0] === 'Contrat-d-exemple-suivi.csv' && noms[1] === 'Contrat-d-exemple-nomenclature.csv' && /^Contrat_d_exemple-folio-1\.svg$/.test(noms[2]), 'les fichiers enregistrés ont un nom ASCII', noms.join(' · '));
  // un fichier à plusieurs harness : une fiche demande lequel ouvrir (tous restent des contrats déjà faits)
  await page.evaluate(() => { const L = contratExemple().map(l => liaison({ ...l, harness: +l.plan <= 3 ? 'H-A' : 'H-B', appareil: 'H160' })); ficheHarnais({ liaisons: L, harnais: ['H-A', 'H-B'] }, 'base.xlsx'); }); await page.waitForTimeout(400);
  ok(await page.evaluate(() => app.fiche && app.fiche.mode === 'harnais' && document.querySelectorAll('#choix-harness .ch-harness[data-harness]').length === 2 && !!$('ch-aucun')), 'un fichier à deux harness : la fiche demande lequel ouvrir, ou aucun');
  await page.click('#choix-harness .ch-harness[data-harness="H-B"]'); await page.waitForTimeout(900);
  ok(await page.evaluate(() => verite().length > 0 && verite().every(l => l.harness === 'H-B') && /^H-B/.test(app.nom) && !app.fiche), 'ouvrir H-B : seul ce harness est sur la table');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(600);
  ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
  console.log('\n  ' + (ko ? ko + ' échec(s)' : 'tout tient'));
  await nav.close(); process.exit(ko ? 1 : 0);
})();
