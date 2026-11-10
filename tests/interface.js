/* ===========================================================================
   INTERFACE — le plan n'est jamais recouvert, chaque dédoublement est une barrette.
       node tests/interface.js [--fichier=chemin]

   À la vraie souris, sur le grand écran puis sur un téléphone :
     · un clic sur un équipement ouvre sa fiche dans l'INSPECTEUR : sur grand écran une CARTE (v72) qui naît du bloc, se
       pose à côté sans le cacher, reliée à lui par un fil, sans rétrécir le plan (il ne bouge pas) ; sa barre tenue la
       déplace ; l'épingle en fait le volet de droite, la feuille se recadre à côté (aucun coin sous lui), puis elle
       redevient une carte ; au téléphone, le tiroir, la feuille au-dessus ;
     · un clic sur un fil ouvre la fiche du fil ;
     · B ouvre le TABLEAU en tiroir en bas : la feuille se recadre au-dessus ;
       « Ce folio » n'y montre que les liaisons du folio affiché ;
     · Échap ferme la fiche tout de suite (son double, sans identifiants, se résorbe dans le bloc), puis le tableau.
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
    // (v74 : ces écrans se jugent sur l'exemple tel que la v73 l'ouvrait — le 10 A proposé, pas écrit ; la règle du calibre a son bloc dans disjoncteur.js)
  await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined'); await page.evaluate(() => ['equipement', 'disjoncteur', 'barrette', 'prise', 'masse', 'fil'].forEach(t => ['disjoncteur', 'connecteur', 'raccord', 'trajet', 'fils', 'dejafait'].forEach(k => retenirSection(t, k, true)))); await page.evaluate(P.deplierDansLaPage); await page.evaluate(() => atelier.exempleSansCalibreAuto());   // l’outil s’ouvre sur la bibliothèque : la batterie, qui lit l’exemple, le demande ; les fiches s'ouvrent pliées : la batterie ouvre leurs sections
    // (v73 : le plan s'ouvre cadré sur le dessin ; ces contrôles de la carte et des panneaux sont écrits sur la feuille entière, qu'ils
    // mesurent : ils la gardent — MIS À JOUR. Le recadrage à côté d'un panneau, cadré sur le dessin : tests/dessin.js)
    await page.evaluate(() => { app.plan = '1'; if (app.base.ouvert) fermerBase(); redessiner(); VUE.cadrage = 'feuille'; ajuster(); }); await page.waitForTimeout(400);
    /* la feuille à l'écran, et ce qui la recouvre : le tableau, le volet épinglé, le tiroir du téléphone. La CARTE (v72,
       08-carte) flotte sur le plan sans lui prendre de place : elle ne doit cacher que du plan, jamais son bloc */
    const recouvre = ids => page.evaluate(ids => { const bb = app.dessin.bbox, r = $('planche').getBoundingClientRect(), s = app.vue.s;
      const F = { x0: r.left + app.vue.tx + bb.x * s, y0: r.top + app.vue.ty + bb.y * s }; F.x1 = F.x0 + bb.w * s; F.y1 = F.y0 + bb.h * s;
      return ids.filter(id => !$(id).hidden && !(id === 'inspecteur' && document.body.classList.contains('insp-flotte'))).map(id => { const q = $(id).getBoundingClientRect();
        const dx = Math.min(F.x1, q.right) - Math.max(F.x0, q.left), dy = Math.min(F.y1, q.bottom) - Math.max(F.y0, q.top);
        return dx > 2 && dy > 2 ? id + ' ' + Math.round(dx) + '×' + Math.round(dy) : null; }).filter(Boolean); }, ids);
    const tel = vp.width <= 700, couvrants = ['inspecteur', 'base'];   // l'inspecteur compte en volet (épinglé, ou le récapitulatif ouvert) et en tiroir, pas en carte
    // le bloc et la carte : ce que la carte cache du bloc (rien, si elle est bien posée)
    const cache = nom => page.evaluate(nom => { const k = app.dessin.compDe.get(nom), r = $('planche').getBoundingClientRect(), s = app.vue.s, q = $('inspecteur').getBoundingClientRect();
      const X0 = r.left + app.vue.tx + k.x * s, Y0 = r.top + app.vue.ty + k.y * s, dx = Math.min(X0 + k.w * s, q.right) - Math.max(X0, q.left), dy = Math.min(Y0 + k.h * s, q.bottom) - Math.max(Y0, q.top);
      return dx > 1 && dy > 1 ? Math.round(dx) + '×' + Math.round(dy) : ''; }, nom);
    const boite = () => page.evaluate(() => { const q = $('inspecteur').getBoundingClientRect(); return { x: Math.round(q.left), y: Math.round(q.top), r: Math.round(q.right), b: Math.round(q.bottom) }; });
    // la carte posée : son élan fini (naître, glisser, s'épingler), son double effacé — une fiche chargée met plus d'une image à paraître
    const posee = () => page.waitForFunction(() => !$('inspecteur').getAnimations().length && !document.querySelector('.carte-double'), null, { timeout: 15000 }).then(() => page.waitForTimeout(60));
    const ecran = (x, y) => page.evaluate(([x, y]) => { const r = $('planche').getBoundingClientRect(); return { x: r.left + app.vue.tx + x * app.vue.s, y: r.top + app.vue.ty + y * app.vue.s }; }, [x, y]);
    // un point d'un câble que la main peut toucher : le milieu d'un de ses tronçons, hors de la carte si elle est ouverte
    const pointDuCable = cable => page.evaluate(cable => { const w = app.dessin.fils.find(w => w.cable === cable), r = $('planche').getBoundingClientRect(), q = $('inspecteur').hidden ? null : $('inspecteur').getBoundingClientRect();
      const pts = w.pts.slice(1).map((b, i) => { const a = w.pts[i]; return { x: r.left + app.vue.tx + (a.x + b.x) / 2 * app.vue.s, y: r.top + app.vue.ty + (a.y + b.y) / 2 * app.vue.s }; });
      return pts.find(p => !q || p.x < q.left - 2 || p.x > q.right + 2 || p.y < q.top - 2 || p.y > q.bottom + 2) || pts[0]; }, cable);
    const c = await page.evaluate(() => { const k = app.dessin.comps.find(c => c.name === '103RL1'); return [k.x + k.w / 2, k.y + k.h / 2]; });
    const vue0 = await page.evaluate(() => JSON.stringify(app.vue));
    let e = await ecran(...c); await page.mouse.click(e.x, e.y); await page.waitForTimeout(30);
    const naissance = tel ? null : await page.evaluate(() => ({ anim: $('inspecteur').getAnimations().length, flotte: document.body.classList.contains('insp-flotte') }));
    await page.waitForTimeout(470); await posee();
    ok(await page.evaluate(() => !$('inspecteur').hidden && app.cible && app.cible.nom === '103RL1' && /103RL1/.test(($('inspecteur').querySelector('.nc-rep-t') || {}).textContent || '') && !$('inspecteur').querySelector('input')), 'un clic sur 103RL1 ouvre sa carte : son repère se lit, aucun champ pour le retaper');
    let r = await recouvre(couvrants); ok(!r.length, tel ? 'la feuille n’est pas sous le tiroir' : 'la feuille n’est sous aucun panneau (la carte flotte, elle ne prend pas de place)', r.join(' '));
    if (!tel) {
      // LA CARTE : elle naît du bloc (une animation la fait grandir depuis lui), se pose à côté sans le cacher, et le plan ne bouge pas
      ok(naissance.flotte && naissance.anim > 0, 'la fiche est une carte qui naît du bloc cliqué (elle grandit depuis lui)', JSON.stringify(naissance));
      const vue1 = await page.evaluate(() => JSON.stringify(app.vue)), m = await page.evaluate(() => marges());
      ok(vue1 === vue0 && m.droite === 24, 'le plan n’est pas rétréci par la carte : il ne bouge pas, sa place reste entière', JSON.stringify({ vue0, vue1, droite: m.droite }));
      let cc = await cache('103RL1'); ok(!cc, 'la carte ne cache pas son bloc', cc);
      ok(await page.evaluate(() => $('carte-lien').classList.contains('on')), 'un fil relie la carte à son bloc');
      // la barre tenue la déplace ; le fil suit
      const b0 = await boite(), barre = await page.evaluate(() => { const n = document.querySelector('#ba-equip .fi-nav'), q = n.getBoundingClientRect(); return { x: q.left + q.width / 2 - 30, y: q.top + q.height / 2 }; });
      await page.mouse.move(barre.x, barre.y); await page.mouse.down(); await page.mouse.move(barre.x + 60, barre.y + 40, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(200); await posee();
      const b1 = await boite();
      ok(Math.abs(b1.x - b0.x - 60) <= 2 && Math.abs(b1.y - b0.y - 40) <= 2 && await page.evaluate(() => CARTE.deplacee && !$('inspecteur').hidden && $('carte-lien').classList.contains('on')), 'la barre tenue déplace la carte, le fil suit, la fiche reste ouverte', JSON.stringify({ b0, b1 }));
      // « Tout voir » (v79) : la fiche s'ouvre en grand, à droite ; Échap rend la carte, à côté de son bloc
      await page.click('#fi-tout-voir'); await page.waitForTimeout(600); await posee();
      const ep = await page.evaluate(() => ({ cls: document.body.className, onglets: document.querySelectorAll('#inspecteur [role="tab"]').length, bords: document.querySelectorAll('#inspecteur .carte-bords [data-bord]').length, droite: Math.round(innerWidth - $('inspecteur').getBoundingClientRect().right) }));
      ok(/insp-grand/.test(ep.cls) && ep.onglets >= 3 && ep.bords === 8 && ep.droite >= 0 && ep.droite <= 24, '« Tout voir » ouvre la fiche en grand, à droite : ses onglets, ses huit bords et coins pour la tirer', JSON.stringify(ep));
      await page.keyboard.press('Escape'); await page.waitForTimeout(500); await posee();
      cc = await cache('103RL1');
      ok(await page.evaluate(() => document.body.classList.contains('insp-flotte') && !document.body.classList.contains('insp-grand') && marges().droite === 24 && !$('inspecteur').hidden) && !cc, 'Échap la rend en carte, à côté de son bloc ; le plan reprend toute la place', cc);
      // Échap la ferme tout de suite (les gestes n'attendent rien) ; c'est son double, sans identifiants, qui rentre dans le bloc
      await page.keyboard.press('Escape'); await page.waitForTimeout(40);
      const fermee = await page.evaluate(() => ({ cache: $('inspecteur').hidden, cible: !!app.cible, doubles: [...document.querySelectorAll('.carte-double')].map(d => d.getAttribute('aria-hidden') === 'true' && !d.querySelector('[id]')) }));
      ok(fermee.cache && !fermee.cible && fermee.doubles.length === 1 && fermee.doubles[0], 'Échap ferme la carte tout de suite ; son double (aria-hidden, sans identifiants) se résorbe dans le bloc', JSON.stringify(fermee));
      await posee(); ok(await page.evaluate(() => !document.querySelector('.carte-double') && !$('carte-lien').classList.contains('on')), 'le double s’efface, le fil aussi');
    }
    ok(await page.evaluate(() => $('base').hidden), 'le tableau reste fermé');
    const f = await pointDuCable('W-014'); await page.mouse.click(f.x, f.y); await page.waitForTimeout(500);
    ok(await page.evaluate(() => app.cible && app.cible.type === 'fil' && app.cible.l.cable === 'W-014' && /DR24/.test(($('ba-equip').querySelector('.nc-rep-t') || {}).textContent || '') && !/W-014/.test($('ba-equip').textContent)), 'un clic sur un câble ouvre sa carte : son type et ses deux bouts, plus de numéro');
    const sAvantB = await page.evaluate(() => app.vue.s);
    await page.keyboard.press('b'); await page.waitForTimeout(600);
    // (sous charge, l'élan de la carte vers le volet — 300 ms — dure plus : on juge sa place une fois posée)
    await page.waitForFunction(() => !$('inspecteur').getAnimations().length, null, { timeout: 15000 }).catch(() => {});
    ok(await page.evaluate(() => !$('base').hidden), 'B ouvre le tableau');
    ok(await page.evaluate(() => { app.base.filtre = ''; app.base.portee = 'folio'; rendreBase(); const n = $('ba-tbody').querySelectorAll('tr[data-i]').length;
      return n === verite().filter(l => l.plan === '1').length && n > 0; }), '« Ce folio » montre les liaisons du folio 1, rien d’autre');
    if (!tel) ok(await page.evaluate(() => document.body.classList.contains('insp-epingle') && !CARTE.epingle && $('base').getBoundingClientRect().right <= $('inspecteur').getBoundingClientRect().left + 1), 'le récapitulatif ouvert, la fiche se range en volet : le tableau s’arrête à côté d’elle');
    // (v72, l'audit des pages P1-3 : le tiroir ne rapetisse plus le plan — il glisse dessous ; ce qu'on a choisi reste en vue)
    const garde = await page.evaluate(s0 => { const w = filDe(app.cible.l), r = $('planche').getBoundingClientRect(), s = app.vue.s, m = marges();
      const L = r.left + m.gauche - 2, R = r.right - m.droite + 2, T = r.top + m.haut - 2, B = r.bottom - m.bas + 2;
      const pts = w.pts.map(p => ({ x: r.left + app.vue.tx + p.x * s, y: r.top + app.vue.ty + p.y * s }));
      return { s0, s, vu: pts.every(p => p.x >= L && p.x <= R && p.y >= T && p.y <= B), pts: pts.map(p => Math.round(p.x) + ',' + Math.round(p.y)).join(' '), place: [L, R, T, B].map(Math.round).join(',') }; }, sAvantB);
    ok(garde.s >= garde.s0 - 1e-6 && garde.vu, 'le récapitulatif en moitié garde l’échelle du plan (il glisse dessous) ; le câble choisi reste dans la place libre, ni sous la fiche ni sous le tableau', JSON.stringify(garde));
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    ok(await page.evaluate(() => $('inspecteur').hidden && !app.cible), 'Échap ferme la fiche');
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);

    ok(await page.evaluate(() => $('base').hidden), 'Échap encore ferme le tableau');

    if (vp.width <= 700) {
      // fiche ouverte, la bande des folios reste, posée au-dessus du tiroir (sa hauteur est dite au style par --insp-h)
      e = await ecran(...c); await page.mouse.click(e.x, e.y); await page.waitForTimeout(600);
      // la bande glisse (220 ms) quand le tiroir a dit sa hauteur : on attend qu'elle soit posée (une page chargée est lente à peindre)
      await page.waitForFunction(() => !$('inspecteur').hidden && Math.abs($('folios').getBoundingClientRect().bottom - $('inspecteur').getBoundingClientRect().top) <= 2, null, { timeout: 4000 }).catch(() => {});
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
  /* (v89) LE RÉCAPITULATIF a sa batterie : tests/documents.js — ses onglets, ses colonnes, ses comptes, ses exports. */
  console.log('\nbarrettes à poser');
  const page = await nav.newPage({ viewport: { width: 1600, height: 950 } }); const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined'); await page.evaluate(() => ['equipement', 'disjoncteur', 'barrette', 'prise', 'masse', 'fil'].forEach(t => ['disjoncteur', 'connecteur', 'raccord', 'trajet', 'fils', 'dejafait'].forEach(k => retenirSection(t, k, true)))); await page.evaluate(P.deplierDansLaPage); await page.evaluate(() => atelier.exempleSansCalibreAuto());   // l’outil s’ouvre sur la bibliothèque : la batterie, qui lit l’exemple, le demande ; les fiches s'ouvrent pliées : la batterie ouvre leurs sections
  // une ligne du menu ⋮ : le menu, puis le sous-menu qui la porte s'il y a lieu (Exporter, Plus s'ouvrent en place), puis elle
  const parLeMenu = async act => { await page.click('#btnMenu');
    const sous = await page.evaluate(a => { const p = document.querySelector(`#menu [data-act="${a}"]`).closest('.menu-panneau'); return p.id === 'mp-principal' ? '' : p.id.slice(3); }, act);
    if (sous) await page.click(`#menu [data-sous="${sous}"]`); await page.click(`#menu [data-act="${act}"]`); };
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
    : ok(v.bornes === v.fils + 1 && v.distinctes && v.ecrit && !v.doubles.length && /^(\d+[A-Z]){2,}$/.test(v.numeros) && new Set(v.numeros.match(/\d+[A-Z]/g)).size === v.bornes,
      `folio ${v.pl} · ${v.nom} : ${v.fils} câbles + le câble à créer = ${v.fils + 1} bornes, chacune dite comme la pièce (module + lettre : 51H, 51J…), à sa hauteur, repère écrit`, v.bornes + ' bornes · ' + v.numeros));
  // la fiche de VT1, puis la poser au contrat sous un vrai repère, et la reprendre
  // un clic sur la barrette, à la vraie souris
  await page.evaluate(() => { app.plan = '1'; deselectionner(); redessiner(); ajuster(); }); await page.waitForTimeout(300);
  const vt1 = await page.evaluate(() => { const b = app.dessin.barrettes.find(b => b.nomVT === 'VT1'), bs = bornesDePiquage(b), r = $('planche').getBoundingClientRect();
    return { x: r.left + app.vue.tx + b.x * app.vue.s, y: r.top + app.vue.ty + (bs[0].y + bs[1].y) / 2 * app.vue.s }; });
  await page.mouse.click(vt1.x, vt1.y); await page.waitForTimeout(400);
  ok(await page.evaluate(() => app.cible && app.cible.nom === 'VT1' && !$('inspecteur').hidden), 'un clic sur la barrette VT1 ouvre sa fiche');
  ok(await page.evaluate(() => /ajoutée par VOLTA sur 102CB1:2/.test($('ba-equip').textContent) && /Barrette de jonction/.test($('ba-equip').querySelector('.nc-genre-mot').textContent) && /^Contacts\s*3/.test([...$('ba-equip').querySelectorAll('.nc-chiffre')].map(c => c.textContent.replace(/\s+/g, ' ').trim()).find(t => /^Contacts/.test(t)) || '') && !!$('vt-repere') && $('vt-poser').textContent.trim() === 'Lui donner son repère'),
    'la carte de VT1 : une barrette de jonction « ajoutée par VOLTA sur 102CB1:2 », trois contacts pris, un repère proposé — « Lui donner son repère »');
  await page.fill('#vt-repere', '102VT9'); await page.click('#vt-poser'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => { const L = app.contrat.liaisons.filter(l => l.de === '102VT9' || l.vers === '102VT9');
    return L.length >= 3 && L.some(l => (l.de === '102CB1' && l.borneDe === '2') || (l.vers === '102CB1' && l.borneVers === '2')) && (app.dessin.comps.some(c => c.name === '102VT9') || app.dessin.barrettes.some(b => b.nom === '102VT9')) && !app.dessin.barrettes.some(b => b.nomVT === 'VT1'); }),
    'VT1 reçoit 102VT9 : le câble vers 102CB1:2 et les deux autres arrivent sur elle, elle est sur le plan sous son repère');
  await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => app.contrat.liaisons.length === 223 && app.dessin.barrettes.some(b => b.nomVT === 'VT1')), 'Ctrl+Z rend VT1');
  /* (v89) LA FICHE (la carte, le grand, Modifier), LE DISJONCTEUR et « Déjà fait » ont leurs batteries : tests/fiche.js, tests/disjoncteur.js,
     tests/fwd.js. Ce qui se tapait ici dans la fiche ou l'index (« + fil », supprimer un fil, « + équipement ») n'existe plus : votre fichier est la source. */
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  console.log('\nla bibliothèque à la vraie souris, le contrat neuf, les folios aux noms de dessin');
  await parLeMenu('bibliotheque'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => BIB.vue === 'racine' && !$('bibliotheque').hidden && $('inspecteur').hidden && !!$('bi-reprendre') && app.contrat.liaisons.length === 223 && !!document.querySelector('#bibliotheque .bi-vide')),
    '« Bibliothèque » (le menu) : la bibliothèque, aucune install encore ; l’exemple reste sur la table, dessous (« Reprendre »)');
  // chaque geste de la bibliothèque répond à un clic de souris
  let fc = null; try { [fc] = await Promise.all([page.waitForEvent('filechooser', { timeout: 3000 }), page.click('#bibliotheque .bi-vide [data-bi="base"]')]); } catch (_) { }
  ok(!!fc, 'un clic de souris sur « Déposer la base des plans déjà faits » ouvre le choix de fichier');
  // l'exemple est resté sur la table : « Reprendre » le rend d'un seul clic (la tuile de l'Exemple ne paraît que sur une table vide : tests/bibliotheque.js)
  await page.mouse.move(800, 200); await page.waitForFunction(() => !!$('bi-reprendre') && $('bi-reprendre').checkVisibility({ opacityProperty: true }), null, { timeout: 8000 }).catch(() => {});
  await page.click('#bi-reprendre'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => app.contrat.liaisons.length === 223 && app.contrat.charges.has('102CB1') && $('bibliotheque').hidden && $('vide').hidden), '« Reprendre », d’un seul clic : l’exemple revient sur la table, avec son profil de charge');
  ok(await page.evaluate(() => app.nom === 'Plan d’exemple' && $('ctx-nom').textContent === 'Plan d’exemple' && /^223\sliaisons · \d+\srepères · 6\sfolios$/.test($('ctx-txt').textContent) && $('en-install').textContent === 'Exemple'), 'le menu dit le plan (« Plan d’exemple », ses liaisons, ses repères, ses folios) ; le fil de la barre du haut, « Exemple »', await page.evaluate(() => $('ctx-txt').textContent));
  // un autre fichier : rien du contrat d'avant ne survit ; le menu dit son nom ; Ctrl+Z rend l'exemple et ses choix
  await page.evaluate(() => chargerContrat(contratExemple().filter(l => l.plan === '1'), 'ouverture de neuf.xlsx', 'neuf.xlsx')); await page.waitForTimeout(500);
  ok(await page.evaluate(() => !app.contrat.charges.size && !app.contrat.designations.size && !app.contrat.sexes.size && !app.contrat.raccords.size && $('ctx-nom').textContent === 'neuf.xlsx' && !/exemple/.test($('ctx-txt').textContent) && !CONTROLE.items.some(x => x.nom === '102CB1' && /9,31/.test(x.texte))),
    'un autre fichier ouvert : rien du contrat d’avant ne survit (son 102CB1 n’a pas le profil de l’exemple), le menu dit le nom du fichier', await page.evaluate(() => $('ctx-nom').textContent + ' · ' + $('ctx-txt').textContent));
  await page.keyboard.press('Control+z'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => app.nom === 'Plan d’exemple' && app.contrat.charges.has('102CB1') && app.contrat.liaisons.length === 223), 'Ctrl+Z rend l’exemple avec ses choix');
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
  const nomTelecharge = async act => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.evaluate(act)]); return d.suggestedFilename(); };
  const noms = [await nomTelecharge('exporterSuivi()'), await nomTelecharge('exporterNomenclature()'), await nomTelecharge('exporterSVG()')];
  // (v84 : la nomenclature s'appelle la LPA ; passe 87 : le Suivi sort de son onglet de la LPA, sous son ancien nom)
  ok(noms[0] === 'Plan-d-exemple-suivi.csv' && noms[1] === 'Plan-d-exemple-LPA.csv' && /^Plan-d-exemple-folio-1\.svg$/.test(noms[2]), 'les fichiers enregistrés ont un nom ASCII', noms.join(' · '));
  // un fichier à plusieurs harness : une fiche demande lequel ouvrir (tous restent des plans déjà faits)
  await page.evaluate(() => { const L = contratExemple().map(l => liaison({ ...l, harness: +l.plan <= 3 ? 'H-A' : 'H-B', appareil: 'H160' })); ficheHarnais({ liaisons: L, harnais: ['H-A', 'H-B'] }, 'base.xlsx'); }); await page.waitForTimeout(400);
  ok(await page.evaluate(() => app.fiche && app.fiche.mode === 'harnais' && document.querySelectorAll('#choix-harness .ch-harness[data-harness]').length === 2 && !!$('ch-aucun')), 'un fichier à deux harness : la fiche demande lequel ouvrir, ou aucun');
  await page.click('#choix-harness .ch-harness[data-harness="H-B"]'); await page.waitForTimeout(900);
  ok(await page.evaluate(() => verite().length > 0 && verite().every(l => l.harness === 'H-B') && /^H-B/.test(app.nom) && !app.fiche), 'ouvrir H-B : seul ce harness est sur la table');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(600);

  /* LA PRISE EN MAIN (U.md § 5) : le menu allégé, ses deux sous-menus et ses bulles (au clavier aussi), « Vos fichiers » (cinq cartes,
     ce que chacune attend), une erreur d'import écrite dans sa carte (le contrat ouvert intact), le rattrapage qui attend
     « Charger », la base sans Harness, la base déposée et « Voir un équipement déjà fait », le collage et son aperçu
     (ajouter au contrat), le modèle CSV — le même que modeles/. */
  console.log('\nla prise en main : le menu, « Vos fichiers », les erreurs, le rattrapage, la base, le collage, le modèle');
  const fs = require('fs'), path = require('path');
  const depot = async (entree, nom, texte) => { await page.setInputFiles(entree, { name: nom, mimeType: 'text/csv', buffer: Buffer.from(texte, 'utf8') }); await page.waitForTimeout(700); };
  // le menu ⋮ allégé (le lecteur : « on n'en utilise que 10-20 % ») : l'essentiel en tête — ouvrir, vos fichiers (où l'on
  // dépose aussi la base des plans déjà faits, écrit dessous), le récapitulatif, la nomenclature —, deux sous-menus qui
  // s'ouvrent en place (Exporter, Plus) ; chaque ligne a sa bulle courte, dite aussi au lecteur d'écran
  // (v73, la demande E-2 d'A2 : les folios en Visio se rangent avec les dessins du plan entier, après le dossier PDF et
  // avant le suivi — `avant: 'suivi'`, 08-visio — MIS À JOUR : ils venaient en dernier)
  const M = await page.evaluate(() => { const lignes = p => [...$(p).querySelectorAll('button[role="menuitem"]:not([data-retour])')].map(b => b.dataset.act || '›' + b.dataset.sous).join(',');
    return { principal: lignes('mp-principal'), exporter: lignes('mp-exporter'), reglages: lignes('mp-reglages'), aide: lignes('mp-aide'), plus: lignes('mp-plus'), plusCache: $('mp-plus').hidden && !document.querySelector('#menu [data-sous="plus"]'), version: ($('menu-version') || {}).textContent || '', fichiers: $('mp-principal').querySelector('[data-act="fichiers"]').textContent,
      bulles: [...document.querySelectorAll('#menu button[role="menuitem"]:not([data-retour])')].every(b => { const a = b.dataset.aide || ''; return a.length > 30 && a.length <= 160 && !!$(b.getAttribute('aria-describedby')); }) }; });
  ok(M.principal === 'bibliotheque,ouvrir,fichiers,recapitulatif,nomenclature,historique,dejafait,›exporter,›reglages,›aide' && M.exporter === 'retestcorrige,svg,png,imprimer,dossierpdf,vsdx,suivi,nomenclaturecsv' && M.reglages === 'hypotheses,normes,cartouche,ia,sauvegarde' && M.aide === 'comprendre,raccourcis,exemple,carnet,autotest,bilan' && M.plus === 'coller,pdf,bible,visio' && M.plusCache && M.bulles && /installations · base · bible · normes/.test(M.fichiers),
    '(v88) le menu rangé — la bibliothèque, « Ouvrir un fichier… », vos fichiers ; récapitulatif, LPA, historique, comparer au déjà-fait, Exporter › ; Réglages › (ce qui juge : hypothèses, normes et bible, cartouche ; vos données : IA interne, sauvegarde) et Aide › (comment VOLTA réfléchit, raccourcis, l’exemple ; carnet, autotest, bilan) — plus de « Plus » fourre-tout (coller, lire un PDF ou un Visio, la bible : dans la palette) ; avant : huit lignes (la bibliothèque, ouvrir, vos fichiers — « installations · base · bible · normes » écrit dessous —, récapitulatif, nomenclature, comparer au déjà-fait, Exporter ›, Plus ›), le reste dans ses deux sous-menus (Exporter : D’ABORD l’installation corrigée en Excel, le livrable, seul dans son groupe (v73) ; le folio en SVG, en PNG, l’impression ; le plan entier : le dossier en PDF, le suivi, la nomenclature, les folios en Visio ; Plus : « Lire un PDF de schéma… » et « Lire un schéma Visio… » après l’exemple, « Comment Volta réfléchit » (v74) juste avant les raccourcis clavier, en dernier) — plus de « Tout effacer » : on supprime dans la bibliothèque ; chaque ligne a sa bulle courte, dite aussi au lecteur d’écran', JSON.stringify(M));
  // au clavier : ↓ ↓ jusqu'à « Vos fichiers… », sa bulle tout de suite, à gauche du menu ; → n'y fait rien (ni folio suivant)
  const plan0 = await page.evaluate(() => app.plan), montre = () => page.evaluate(() => [...document.querySelectorAll('#menu .menu-panneau')].filter(p => !p.hidden).map(p => p.id).join());
  await page.click('#btnMenu'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(350);
  ok(await page.evaluate(() => { const b = document.activeElement, u = $('menu-bulle'), r = u.getBoundingClientRect(), m = $('menu').getBoundingClientRect();
    return !!b && b.dataset.act === 'fichiers' && u.classList.contains('on') && u.textContent === b.dataset.aide && /plans déjà faits/.test(u.textContent) && r.right <= m.left && r.width <= 300 && r.top >= 0 && r.bottom <= innerHeight; }),
    'au clavier (↓ ↓), la bulle de « Vos fichiers… » se lit tout de suite, à gauche du menu, entière à l’écran : on y dépose aussi les plans déjà faits');
  await page.waitForFunction(() => !$('menu').getAnimations({ subtree: true }).length, null, { timeout: 10000 }).catch(() => {});   // (sous charge, son entrée dure)
  const large0 = await page.evaluate(() => Math.round($('menu').getBoundingClientRect().width));
  await page.keyboard.press('ArrowRight'); for (let k = 0; k < 5; k++) await page.keyboard.press('ArrowDown');   // jusqu'à « Exporter » (après le récapitulatif, la LPA, l'historique, « Comparer au déjà-fait »)
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250); await page.waitForFunction(() => !$('menu').getAnimations({ subtree: true }).length, null, { timeout: 10000 }).catch(() => {});
  const S1 = await page.evaluate(() => ({ act: document.activeElement.dataset.act, large: Math.round($('menu').getBoundingClientRect().width), ouvert: $('menu').querySelector('[data-sous="exporter"]').getAttribute('aria-expanded') }));
  const m1 = await montre(); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(250);
  const S2 = await page.evaluate(() => ({ sous: document.activeElement.dataset.sous, plan: app.plan })), m2 = await montre();
  ok(m1 === 'mp-exporter' && S1.act === 'retestcorrige' && S1.large === large0 && S1.ouvert === 'true' && m2 === 'mp-principal' && S2.sous === 'exporter' && S2.plan === plan0,
    '→ ouvre « Exporter » en place (le menu garde sa largeur), le clavier sur « L’installation corrigée » ; ← y revient, sur « Exporter » ; les flèches ne changent pas de folio', JSON.stringify({ m1, S1, m2, S2, large0 }));
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('Escape'); await page.waitForTimeout(200); const m3 = await montre();
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  ok(m3 === 'mp-principal' && await page.evaluate(() => $('menu').hidden && document.activeElement === $('btnMenu')), 'Échap dans un sous-menu y revient ; Échap encore ferme le menu, le clavier sur ⋮');
  // à la souris : « Plus » s'ouvre d'un clic, ses bulles au survol ; « ‹ Plus » ramène ; « Vos fichiers… »
  await page.click('#btnMenu'); await page.click('#menu [data-sous="aide"]'); await page.waitForFunction(() => !$('mp-aide').hidden && !$('menu').getAnimations({ subtree: true }).length, null, { timeout: 5000 }).catch(() => {}); await page.mouse.move(700, 500); await page.hover('#menu [data-act="exemple"]');
  // la bulle vient après son délai : on l'attend (sous charge, elle arrive vers 700 ms ; 450 ms fixes échouaient)
  await page.waitForFunction(() => $('menu-bulle').classList.contains('on') && /reste dans la bibliothèque/.test($('menu-bulle').textContent), null, { timeout: 5000 }).catch(() => {});
  ok(await page.evaluate(() => !$('mp-aide').hidden && $('mp-principal').hidden && $('menu-bulle').classList.contains('on') && /reste dans la bibliothèque/.test($('menu-bulle').textContent) && /Ctrl\+Z le rend/.test($('menu-bulle').textContent)), 'à la souris, « Aide » s’ouvre d’un clic à la place du menu ; au survol, la bulle de « Ouvrir l’exemple » (votre plan reste dans la bibliothèque, Ctrl+Z le rend)', await page.evaluate(() => $('menu-bulle').textContent));
  await page.click('#mp-aide [data-retour]'); await page.waitForTimeout(200); await page.click('#menu [data-act="fichiers"]'); await page.waitForTimeout(500);
  const VF = await page.evaluate(() => ({ mode: app.fiche && app.fiche.mode, cartes: [...document.querySelectorAll('#fiche-corps .vf-carte')].map(c => c.dataset.entree + ':' + (c.className.match(/e-(\w+)/) || [])[1]).join(' '), apercus: [...document.querySelectorAll('#fiche-corps .vf-carte')].filter(c => c.querySelectorAll('.vf-apercu tbody tr').length === 3).length, ouverts: [...document.querySelectorAll('#fiche-corps details.vf-attend[open]')].map(d => d.dataset.volet).join(' '),
    zones: [...document.querySelectorAll('#fiche-corps .vf-zone')].map(z => z.closest('.vf-carte').dataset.entree).join(' '), cles: [...document.querySelectorAll('#vf-base .vf-cles div')].map(d => d.textContent).join(' · ') }));
  // (la bibliothèque a déjà une install : « À ranger », où sont allés les fichiers ouverts plus haut hors de toute install)
  ok(VF.mode === 'fichiers' && VF.cartes === 'bibliotheque:ok retest:vide base:vide bible:ok normes:ok hypotheses:ok' && VF.apercus === 4 && VF.ouverts === '' && VF.zones === 'retest' && VF.cles === 'Harnessla machine · FWDle dessin · Appareille plan',
    '« Vos fichiers » : six cartes et leur état, la bibliothèque en tête ; l’installation et la base disent en une ligne ce qu’ils attendent (la base : Harness la machine, FWD le dessin, Appareil le contrat) ; une seule zone de dépôt, celle de l’installation (v73) ; trois lignes d’exemple (installation, base, bible, une norme) repliées dans « Ce que j’attends »', JSON.stringify(VF));
  const nEx = await page.evaluate(() => verite().length);
  await depot('#fichier', 'compta.csv', 'Date;Montant;Libellé\n03/10/2026;1250,00;Fournitures\n05/10/2026;318,40;Câbles\n');
  const E1 = await page.evaluate(() => ({ toast: $('toast').textContent, erreur: $('toast').classList.contains('erreur'), voir: !!document.querySelector('#toast .toast-voir'), n: verite().length, nom: app.nom }));
  ok(E1.erreur && E1.voir && /en-têtes d’un retest/.test(E1.toast) && E1.n === nEx && E1.nom === 'Plan d’exemple', 'un fichier qui n’est pas une installation : le mot qui passe le signale, avec « Voir » ; le contrat ouvert ne bouge pas', E1.toast);
  await page.click('#toast .toast-voir'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const c = $('vf-retest'), e = c && c.querySelector('.vf-erreur'); return app.fiche.mode === 'fichiers' && c.classList.contains('e-ko') && !!e && /VOLTA a lu/.test(e.textContent) && !/J’ai/.test(e.textContent) && /Date/.test(e.textContent) && /Montant/.test(e.textContent) && /Device1, Pin1, Device2, Pin2/.test(e.textContent) && !!e.querySelector('[data-vf="modele-retest"]'); }),
    '« Voir » : l’erreur est écrite dans la carte de l’installation, et y reste — ce que l’outil a lu (Date · Montant · Libellé), ce qu’il lui faut, un modèle');
  await depot('#fichier', 'vide.csv', '');
  ok(await page.evaluate(() => /vide\.csv est vide\s:\saucune ligne/.test($('vf-retest').querySelector('.vf-erreur').textContent)), 'un fichier vide : « vide.csv est vide : aucune ligne. », dans la carte');
  await page.setInputFiles('#fichier', { name: 'photo.txt', mimeType: 'text/plain', buffer: Buffer.concat([Buffer.from('89504E470D0A1A0A0000000D49484452', 'hex'), Buffer.alloc(400, 3)]) }); await page.waitForTimeout(700);
  ok(await page.evaluate(n => /photo\.txt n’est pas un tableau \(Excel ou CSV\)/.test($('vf-retest').querySelector('.vf-erreur').textContent) && verite().length === n, nEx), 'une image : « photo.txt n’est pas un tableau (Excel ou CSV). »');
  await depot('#fichier', 'presque-retest.csv', 'Equipement;Broche;Cable;Equipement;Broche\n102CB1;2;W-012;103RL1;A1\n103RL1;A2;W-013;104LP1;1\n101BT1;1;W-011;102CB1;1\n');
  const R1 = await page.evaluate(() => ({ n: verite().length, nom: app.nom, att: !!FICHIERS.attente, erreur: !!FICHIERS.erreurs.retest, dit: ($('vf-retest').querySelector('.vf-attente') || {}).textContent || '', lignes: $('vf-retest').querySelectorAll('.vf-attente .vf-apercu tbody tr').length }));
  ok(R1.n === nEx && R1.nom === 'Plan d’exemple' && R1.att && !R1.erreur && /VOLTA a compris/.test(R1.dit) && /Equipement\s→\sDe/.test(R1.dit) && /Cable\s→\sCâble/.test(R1.dit) && R1.lignes === 3, 'des colonnes devinées : rien n’est remplacé ; la carte dit ce qu’elle a compris (Equipement → De, Cable → Câble…), avec l’aperçu, et attend « Charger »', R1.dit.slice(0, 150));
  await page.click('#fiche-corps [data-vf="corriger"]'); await page.waitForTimeout(300);
  await page.selectOption('#fiche-corps .vf-carte-cols select[data-colonne="2"]', ''); await page.waitForTimeout(300);
  ok(await page.evaluate(() => FICHIERS.attente.map.cable === '' && !/W-012/.test($('vf-retest').querySelector('.vf-attente .vf-apercu').textContent)), '« Corriger » : la colonne Cable ignorée, l’aperçu se refait sans le numéro de fil');
  await page.click('#fiche-corps [data-vf="charger"]'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => verite().length === 3 && app.nom === 'presque-retest.csv' && !FICHIERS.attente && !FICHIERS.erreurs.retest), '« Charger » : les trois liaisons deviennent le contrat, l’erreur d’avant s’efface');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(600);
  ok(await page.evaluate(n => verite().length === n && app.nom === 'Plan d’exemple', nEx), 'Ctrl+Z rend l’exemple');
  // la base des plans déjà faits : sans Harness, le dire (et proposer de l'ouvrir comme contrat) ; deux harness : rangée
  await depot('#fichier-base', 'base-2024.csv', 'Device1;Pin1;Cable TG;Cable Tag;Device2;Pin2;FWD\n102CB1;2;DR20;W-012;103RL1;A1;F1\n103RL1;A2;DR22;W-013;104LP1;1;F1\n');
  await page.evaluate(() => ficheFichiers('base')); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const e = $('vf-base').querySelector('.vf-erreur'); return !!e && /aucune colonne Harness/.test(e.textContent) && /séparer les machines/.test(e.textContent) && !app.references && !!$('vf-base').querySelector('[data-vf="base-contrat"]'); }), 'une base sans colonne Harness : « Sans elle, je ne sais pas séparer les machines », et « Ouvrir … comme contrat »');
  const base = await page.evaluate(() => { const d = r => /G$/.test(r) ? r : r.replace(/^(\d)(\d\d)([A-Z]+)(\d*)/, (m, a, b, c, e) => String(+a + 2) + b + c + e), E = contratExemple();
    return ['Harness;Device1;Pin1;PN1;Cable TG;Cable Tag;Device2;Pin2;PN2;FWD;Appareil;Date retest', ...E.map(l => ['H-1', d(l.de), l.borneDe, l.pnDe, l.type, l.cable, d(l.vers), l.borneVers, l.pnVers, 'F' + l.plan, 'H175', '27/10/2025'].join(';')),
      ...E.slice(0, 40).map(l => ['H-2', l.de, l.borneDe, l.pnDe, l.type, l.cable, l.vers, l.borneVers, l.pnVers, 'G' + l.plan, 'H160', '12/03/2024'].join(';'))].join('\n'); });
  await depot('#fichier-base', 'base-2024.csv', base); await page.waitForTimeout(300);
  const B1 = await page.evaluate(() => ({ mode: app.fiche && app.fiche.mode, h: app.references && app.references.index.harnais.size, succes: ($('vf-base') && $('vf-base').querySelector('.vf-succes') || {}).textContent || '', bouton: !!document.querySelector('#vf-base [data-vf="deja-fait"]'), erreur: !!FICHIERS.erreurs.base }));
  ok(B1.mode === 'fichiers' && B1.h === 2 && /2\sharness/.test(B1.succes) && /\d\sdessins/.test(B1.succes) && /\d\sliaisons/.test(B1.succes) && B1.bouton && !B1.erreur, 'la base déposée : « Vos fichiers » revient sur sa carte avec les comptes (harness · dessins · liaisons), l’erreur d’avant effacée, et « Voir un équipement déjà fait »', B1.succes.slice(0, 90));
  await page.click('#vf-base [data-vf="deja-fait"]'); await page.waitForTimeout(900);
  ok(await page.evaluate(() => !$('inspecteur').hidden && app.cible && app.cible.type === 'bloc' && !!document.querySelector('#ba-equip .fi-deja .fi-cand')), '« Voir un équipement déjà fait » : la fiche du premier équipement qui a une correspondance, « Déjà fait » sous les yeux');
  await page.evaluate(() => { deselectionner(); adopterReferences([], ''); });
  // le collage : l'ordre et un exemple, l'aperçu de ce qui est compris, ajouter au contrat (ou le remplacer)
  await page.evaluate(() => ficheColler()); await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.querySelectorAll('#fiche-corps .co-ordre li').length === 10 && document.querySelectorAll('#fiche-corps .co-exemple .vf-apercu tbody tr').length === 3 && $('co-ajouter').disabled && $('co-remplacer').disabled), 'coller : l’ordre des dix colonnes, trois lignes d’exemple ; rien à ajouter tant que rien n’est collé');
  await page.fill('#co-txt', '210SP1;12;;115CD;3;;W-901;DR24;SIGNAL;1\n115CD;4;;116RL1;A1;;W-902;DR24;SIGNAL;1\nune ligne sans second bout'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => /2\sliaisons/.test($('co-apercu').textContent) && /1\sligne sans ses deux bouts/.test($('co-apercu').textContent) && $('co-apercu').querySelectorAll('tbody tr').length === 2 && /W-901/.test($('co-apercu').textContent) && !$('co-ajouter').disabled && !$('co-remplacer').disabled),
    'l’aperçu avant de charger : deux liaisons comprises (de 210SP1:12 vers 115CD:3, fil W-901…), une ligne laissée de côté ; « Ajouter » et « Remplacer »');
  const nC = await page.evaluate(() => verite().length); await page.click('#co-ajouter'); await page.waitForTimeout(800);
  ok(await page.evaluate(n => verite().length === n + 2 && app.nom === 'Plan d’exemple' && verite().some(l => l.cable === 'W-901' && l.plan === '1'), nC), '« Ajouter au contrat » : les deux liaisons s’ajoutent à l’exemple, qui n’est pas remplacé');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(600);
  ok(await page.evaluate(n => verite().length === n, nC), 'Ctrl+Z les retire');
  // le modèle CSV : les seize en-têtes et trois lignes, relus comme un retest ; le même fichier que modeles/
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.evaluate(() => telechargerModele('retest'))]);
  const modele = fs.readFileSync(await dl.path(), 'utf8'), modeleDepot = fs.readFileSync(path.join(__dirname, '..', 'modeles', 'modele-retest.csv'), 'utf8');
  const lu = await page.evaluate(t => { const r = lireTexte(t.replace(/^\ufeff/, '')); return { n: r.liaisons.length, format: r.format, colonnes: r.colonnes, entetes: t.split(/\r?\n/)[0].split(';').length }; }, modele);
  ok(dl.suggestedFilename() === 'modele-retest.csv' && modele === modeleDepot && lu.n === 3 && lu.format === 'retest' && lu.colonnes === 16 && lu.entetes === 16, '« Télécharger un modèle (CSV) » : seize en-têtes, trois lignes, relus comme une installation — le même fichier que modeles/modele-retest.csv', JSON.stringify(lu));
  ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));

  /* LES CORRECTIONS DE L'AUDIT v72 — l'interface et le parcours : les problèmes par genre (P suit la liste, « Toutes les
     poser »), la recherche qui trouve un part number, un type, une borne, l'index qui trouve les câbles, la description du
     retest sous le repère, la feuille des raccourcis (« ? »), le mot qui passe (« Rétablir », l'erreur qui reste), l'export
     qui dit sa portée, la table de 3 000 lignes virtuelle, la carte qui ne cache ni son bloc ni ses câbles, entière, à 1440
     comme à 1920, le survol oublié sous la carte posée, Échap qui ferme d'abord le menu de la fiche. */
  console.log('\nles corrections de l’audit v72 : le parcours');
  await page.close();
  { const page = await nav.newPage({ viewport: { width: 1440, height: 900 } }); page.setDefaultTimeout(300000); const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
    await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined' && BIB.pret); await page.evaluate(() => atelier.exempleSansCalibreAuto());
    // la feuille entière (v73 : le folio s'ouvre cadré sur son dessin, plus grand — la carte de 102CB1 couvrait alors 104LP1,
    // que le survol plus bas doit trouver libre : MIS À JOUR)
    await page.evaluate(() => { app.plan = '1'; redessiner(); VUE.cadrage = 'feuille'; ajuster(); }); await page.waitForTimeout(300);
    // les genres : l'index (R) les range, chacun son compte, « Voir le premier », le geste qui le traite
    await page.click('#btnIndex .rd-point'); await page.waitForTimeout(400);
    const G = await page.evaluate(() => ({ ouvert: document.querySelector('#ba-equip .ix-controle').open, genres: [...document.querySelectorAll('#ba-equip .co-genre')].map(g => g.dataset.genre + ':' + g.querySelector('.co-n').textContent + ':' + !!g.querySelector('[data-premier]') + ':' + ((g.querySelector('[data-geste]') || {}).textContent || '')) }));
    ok(G.ouvert && G.genres.length >= 5 && G.genres.every(g => /:true:/.test(g)) && /^regler\|arrangement:1:true:/.test(G.genres[0]) && G.genres.includes('regler|consommation:3:true:') && G.genres.includes('regler|aposer:3:true:Leur donner leur repère') && G.genres.some(g => /^voir\|protection:\d+:true:/.test(g)) && G.genres.findIndex(g => /^voir\|/.test(g)) > G.genres.findIndex(g => /^regler\|aposer/.test(g)),
      'un clic sur le compte ouvre le panneau Repères sur ce qui est à régler, par genre — puis ce qui est à voir : chacun son compte, « Voir le premier », et le geste qui le traite quand il y en a un (« Leur donner leur repère »)', G.genres.join(' | '));
    await page.click('#ba-equip .co-genre[data-genre="regler|arrangement"] [data-premier]'); await page.waitForTimeout(700);
    const P1 = await page.evaluate(() => ({ plan: app.plan, cible: app.cible && app.cible.nom, mot: $('toast').textContent }));
    await page.keyboard.press('p'); await page.waitForTimeout(700);
    const P2 = await page.evaluate(() => ({ plan: app.plan, cible: app.cible && app.cible.nom, mot: $('toast').textContent }));
    await page.keyboard.press('Shift+P'); await page.waitForTimeout(700);
    const P3 = await page.evaluate(() => ({ cible: app.cible && app.cible.nom, mot: $('toast').textContent }));
    ok(P1.plan === '3' && P1.cible === '300XC1' && /À régler 1 \/ \d+/.test(P1.mot) && P2.plan === '1' && P2.cible === '102CB1' && /À régler 2 \/ \d+/.test(P2.mot) && P3.cible === '300XC1',
      '« Voir le premier » mène à 300XC1 (folio 3) ; P au point suivant (102CB1, folio 1) ; Maj+P revient — le mot dit où l’on en est', [P1.mot, P2.mot, P3.mot].join(' · '));
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    await page.evaluate(() => { app.insp.index = false; basculerIndex(); CONTROLE.ouvert = true; rendreIndex($('ba-equip')); }); await page.waitForTimeout(300);
    if (!(await page.evaluate(() => document.querySelector('#ba-equip .ix-controle').open))) { await page.click('#ba-equip .ix-controle > summary'); await page.waitForTimeout(250); }
    const n0 = await page.evaluate(() => verite().length);
    // le dernier genre est sous le pli du panneau : on y défile (comme à la molette), puis on clique son geste
    await page.evaluate(() => document.querySelector('#ba-equip .co-genre[data-genre="regler|aposer"] [data-geste]').scrollIntoView({ block: 'center' })); await page.waitForTimeout(250);
    { const bb = await (await page.$('#ba-equip .co-genre[data-genre="regler|aposer"] [data-geste]')).boundingBox(); await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); } await page.waitForTimeout(1200);
    const T = await page.evaluate(n => ({ n: verite().length - n, vt: CONTROLE.items.filter(x => x.genre === 'aposer').length, quoi: (app.hist[app.hist.length - 1] || {}).quoi, geste: ((document.querySelector('#toast .toast-geste') || {}).textContent || ''), mot: $('toast').textContent }), n0);
    ok(T.vt === 0 && /3 barrettes/.test(T.quoi || '') && /^(Défaire|Rétablir)$/.test(T.geste), '« Leur donner leur repère » : les trois barrettes reçoivent chacune le repère proposé, en un seul geste — le message offre « Défaire »', JSON.stringify(T));
    await page.click('#toast .toast-geste'); await page.waitForTimeout(900);
    ok(await page.evaluate(n => verite().length === n && CONTROLE.items.filter(x => x.genre === 'aposer').length === 3, n0), '« Défaire » les rend à leur repère provisoire, toutes les trois (un seul geste)');
    await page.mouse.move(700, 450); await page.waitForTimeout(200);
    // l'onglet Problèmes du récapitulatif : les mêmes genres, en intercalaires, leurs gestes
    await page.evaluate(() => { fermerInspecteur(); app.base.portee = 'tout'; changerOnglet('problemes'); }); await page.waitForTimeout(500);
    const R = await page.evaluate(() => ({ genres: [...document.querySelectorAll('#ba-tbody tr.rc-genre')].map(t => t.querySelector('.rc-genre-mot').textContent), premier: document.querySelectorAll('#ba-tbody tr.rc-genre [data-premier]').length, gestes: [...document.querySelectorAll('#ba-tbody tr.rc-genre [data-geste]')].map(b => b.textContent) }));
    ok(R.genres.length >= 5 && R.genres[0] === 'connecteur qu’aucun arrangement ne loge' && R.genres.includes('consommations à écrire') && R.genres.includes('barrettes au repère provisoire') && R.gestes.includes('Leur donner leur repère'), 'l’onglet Problèmes range ses lignes par genre, comme le panneau Repères : un intercalaire chacun, son geste quand il y en a un', R.genres.join(' | ') + ' · ' + R.gestes.join(' / '));
    // (v78c, le lecteur : « Tableau CSV, ça dégage : que la croix ») le récapitulatif n'a plus de bouton d'export : tout est dans ⋮ › Exporter
    await page.evaluate(() => { app.base.portee = 'folio'; changerOnglet('liaisons'); allerAuPlan('1'); rendreBase(true); }); await page.waitForTimeout(400);
    ok(await page.evaluate(() => !!$('ba-x') && $('ba-x').checkVisibility() && ![...document.querySelectorAll('#base .rc-export, #base #ba-csv, #base .rc-taille')].some(e => e.checkVisibility())), 'la tête du récapitulatif : son titre, le plan, la croix — ni « Tableau en CSV », ni « Moitié · Page »');
    // le récapitulatif en moitié garde l'échelle ; fermé, la vue d'avant revient
    await page.evaluate(() => { fermerBase(); ajuster(); }); await page.waitForTimeout(400);
    const v0 = await page.evaluate(() => ({ ...app.vue })); await page.keyboard.press('b'); await page.waitForTimeout(600);
    const v1 = await page.evaluate(() => ({ ...app.vue })); await page.keyboard.press('b'); await page.waitForTimeout(600);
    const v2 = await page.evaluate(() => ({ ...app.vue }));
    ok(v1.s <= v0.s + 1e-9 && Math.abs(v2.s - v0.s) < 1e-9 && Math.abs(v2.tx - v0.tx) < 1 && Math.abs(v2.ty - v0.ty) < 1, 'B : le folio se recadre dans la place libre au-dessus du récapitulatif (v84) ; B encore : la vue d’avant, au point près', JSON.stringify({ v0: v0.s, v1: v1.s, v2: v2.s }));
    // la recherche : un part number, un type, une borne ; l'index : les câbles
    const Q = await page.evaluate(() => ({ pn: candidats('MS3320').map(c => c.type + ':' + c.nom), type: candidats('DR12').map(c => c.type + ':' + c.nom), borne: candidats('300XC1:B5').map(c => c.type + ':' + c.nom + ':' + c.borne), relais: candidats('103RL').map(c => c.nom) }));
    ok(Q.pn.includes('repere:102CB1') && Q.type[0] === 'type:DR12' && Q.borne[0] === 'borne:300XC1:B5', 'la recherche trouve un part number (MS3320 → 102CB1), un type (DR12 : tous ses câbles), une borne (300XC1:B5)', JSON.stringify(Q));
    await page.keyboard.press('/'); await page.keyboard.type('300XC1:B5'); await page.waitForTimeout(250); await page.keyboard.press('Enter'); await page.waitForTimeout(900);
    ok(await page.evaluate(() => app.plan === '3' && app.cible && app.cible.nom === '300XC1' && !$('inspecteur').hidden && /B5\s–\s397TB1:1/.test($('inspecteur').textContent)), '« 300XC1:B5 », Entrée : la carte de 300XC1, sur le folio 3 — elle dit le point de sa borne B5 (son câble vers 397TB1:1)');
    await page.keyboard.press('Escape'); await page.keyboard.press('/'); await page.keyboard.type('DR12'); await page.waitForTimeout(250); await page.keyboard.press('Enter'); await page.waitForTimeout(700);
    ok(await page.evaluate(() => app.base.ouvert && app.base.onglet === 'liaisons' && app.base.filtre === 'DR12' && [...document.querySelectorAll('#ba-tbody tr[data-i]')].every(t => verite()[+t.dataset.i].type === 'DR12')), '« DR12 », Entrée : le récapitulatif montre tous les câbles DR12');
    // (v84) le panneau Repères ne liste que des repères : un câble se cherche par la palette (« / » : son type, un bout, une borne — tests/dessin.js)
    await page.evaluate(() => { fermerBase(); deselectionner(); fermerInspecteur(); });
    // la description du retest sous le repère (Description1 / 2), quand on n'a pas écrit de désignation
    ok(await page.evaluate(() => { const l = verite().find(l => l.de === '103RL1'); l.descriptionDe = 'RELAIS DE COMMANDE'; const d = designationDe('103RL1'), r = reperesDuContrat().find(x => x.nom === '103RL1'); delete l.descriptionDe; return d === 'RELAIS DE COMMANDE' && /RELAIS/.test(r.sous); }), 'sans désignation, le repère prend la description de l’installation (sur le folio, dans l’index)');
    // la mémoire du contrat : les repères ne se relisent pas tant que rien ne change
    ok(await page.evaluate(() => { const a = reperesDuContrat(), b = reperesDuContrat(); histPush('essai'); designer('104LP1', 'LAMPE'); const c = reperesDuContrat(); annuler(); return a === b && c !== a && c.find(x => x.nom === '104LP1').sous === 'LAMPE'; }), 'les repères du contrat se gardent tant que le contrat ne change pas ; une désignation écrite les fait relire');
    // « ? » : la feuille des raccourcis ; Échap la ferme
    await page.keyboard.press('?'); await page.waitForTimeout(400);
    const K = await page.evaluate(() => ({ ouvert: raccourcisOuverts(), lignes: document.querySelectorAll('#raccourcis .rk-ligne').length, p: /Le problème suivant/.test($('raccourcis').textContent) }));
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    ok(K.ouvert && K.lignes >= 18 && K.p && await page.evaluate(() => !raccourcisOuverts()), '« ? » ouvre la feuille des raccourcis (P, Maj+B, Alt+←…) ; Échap la ferme', JSON.stringify(K));
    // le mot qui passe : un geste (8 s), une erreur qui reste jusqu'au clic
    const D = await page.evaluate(async () => { let fait = 0; dire('Essai.', false, { geste: 'Rétablir', faire: () => { fait++; } }); const b = document.querySelector('#toast .toast-geste'); b.click();
      const vus = []; const obs = new MutationObserver(() => { const m = $('toast').textContent; if (m !== vus[vus.length - 1]) vus.push(m); }); obs.observe($('toast'), { childList: true, characterData: true, subtree: true });
      dire('Une erreur.', true); await new Promise(r => setTimeout(r, 3500)); obs.disconnect(); const reste = $('toast').classList.contains('on'); return { fait, bouton: !!b, reste, vus }; });
    await page.mouse.click(700, 600); await page.waitForTimeout(200);
    ok(D.fait === 1 && D.bouton && D.reste && await page.evaluate(() => !$('toast').classList.contains('on')), 'le mot qui passe porte un geste (« Rétablir ») ; une erreur reste jusqu’au clic', JSON.stringify(D));
    ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
    // Échap ferme la carte (elle n'a plus de menu « ⋯ » : ses gestes sont sur elle)
    await page.evaluate(() => { allerAuPlan('1'); ajuster(); choisirBloc(app.dessin.comps.find(k => k.name === '102CB1' && k.kind !== 'tag')); }); await page.waitForTimeout(800);
    const E1 = await page.evaluate(() => ({ menu: !!$('fi-menu'), carte: !$('inspecteur').hidden }));
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    ok(!E1.menu && E1.carte && await page.evaluate(() => $('inspecteur').hidden), 'la carte n’a plus de « ⋯ » ; Échap la ferme', JSON.stringify(E1));
    // le survol du plan s'oublie quand la carte se pose sous la souris
    await page.evaluate(() => choisirBloc(app.dessin.comps.find(k => k.name === '102CB1' && k.kind !== 'tag'))); await page.waitForTimeout(800);
    const b1 = await page.evaluate(() => { const k = app.dessin.comps.find(c => c.name === '104LP1'), r = $('planche').getBoundingClientRect(); return { x: r.left + app.vue.tx + (k.x + k.w / 2) * app.vue.s, y: r.top + app.vue.ty + (k.y + k.h / 2) * app.vue.s }; });
    await page.evaluate(([x, y]) => { const q = $('inspecteur').getBoundingClientRect(); if (x >= q.left - 8 && x <= q.right + 8 && y >= q.top - 8 && y <= q.bottom + 8) poserCarte(70, 420); }, [b1.x, b1.y]); await page.waitForTimeout(300);   // la carte de 102CB1 ne doit pas couvrir 104LP1, qu'on va survoler
    await page.mouse.move(b1.x - 40, b1.y - 30); await page.mouse.move(b1.x, b1.y, { steps: 4 }); await page.waitForTimeout(350);
    const S0 = await page.evaluate(() => !!document.getElementById('rt-survol') || [...document.querySelectorAll('#scene .comp.hl, #scene .comp.sv')].some(g => g.dataset.name === '104LP1'));   // (un bloc choisi : l'autre, survolé, se marque à peine — `.sv`)
    await page.evaluate(([x, y]) => { poserCarte(x - 60, y - 60); lacherLeSurvol(); }, [b1.x, b1.y]); await page.waitForTimeout(200);
    const S1 = await page.evaluate(() => ({ survol: !!document.getElementById('rt-survol'), allume: [...document.querySelectorAll('#scene .comp.hl, #scene .comp.sv')].map(g => g.dataset.name), choisi: !!document.querySelector('#scene .comp[data-name="102CB1"] .selbox') }));
    S1.avant = S0; ok(S0 && !S1.survol && !S1.allume.includes('104LP1') && S1.choisi, 'la carte posée sous la souris : le plan oublie son survol (104LP1 s’éteint), seul ce qui est choisi reste allumé', JSON.stringify(S1));
    await page.keyboard.press('Escape');
    // la table de 3 000 lignes : virtuelle — peu de nœuds, toutes les lignes atteintes en défilant
    await page.evaluate(() => { const E = contratExemple(), L = []; for (let k = 0; k < 15; k++) E.forEach(l => L.push(liaison({ ...l, de: l.de + (k ? '-' + k : ''), vers: l.vers + (k ? '-' + k : ''), cable: l.cable + (k ? '-' + k : ''), plan: String(+l.plan + 6 * k) })));
      chargerContrat(L, 'essai', 'gros.xlsx'); app.base.portee = 'tout'; changerOnglet('liaisons'); ouvrirBase('page'); }); await page.waitForTimeout(1500);
    const V = await page.evaluate(async () => { const n = document.querySelectorAll('#ba-tbody tr').length, c = $('ba-corps'); c.scrollTop = c.scrollHeight; await new Promise(r => setTimeout(r, 300)); c.scrollTop = c.scrollHeight; await new Promise(r => setTimeout(r, 300));
      const ks = [...document.querySelectorAll('#ba-tbody tr[data-i]')].map(t => +t.dataset.i); return { lignes: verite().length, poses: n, fin: ks.includes(verite().length - 1), virtuel: !!RECAP.virtuel }; });
    ok(V.virtuel && V.lignes === 15 * 223 && V.poses < 250 && V.fin, 'le récapitulatif de plus de 3 000 liaisons, « Tout » : moins de 250 lignes posées, et le bas de la table atteint en défilant (plus de « Tout montrer »)', JSON.stringify(V));
    ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
    await page.close(); }
  // LA CARTE : ni le bloc, ni le départ de ses câbles, ni ses voisins tant qu'on peut ; entière (pas coupée par le bas)
  console.log('\nla carte : ni son bloc, ni ses câbles, entière (1440 et 1920)');
  for (const [W, H] of [[1440, 900], [1920, 1080]]) {
    const page = await nav.newPage({ viewport: { width: W, height: H } }); page.setDefaultTimeout(300000); const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
    await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined' && BIB.pret); await page.evaluate(() => atelier.exempleSansCalibreAuto());
    for (const [nom, f] of [['102CB1', '1'], ['300XC1', '3'], ['668VT3', '3']]) {
      await page.evaluate(([nom, f]) => { deselectionner(); allerAuPlan(f); ajuster(); choisirBloc(app.dessin.comps.find(k => k.name === nom && k.kind !== 'tag')); }, [nom, f]);
      await page.waitForFunction(() => !$('inspecteur').getAnimations().length, null, { timeout: 15000 }); await page.waitForTimeout(150);
      const C = await page.evaluate(nom => { const d = app.dessin, k = d.compDe.get(nom), r = $('planche').getBoundingClientRect(), s = app.vue.s, q = $('inspecteur').getBoundingClientRect(), X = x => r.left + app.vue.tx + x * s, Y = y => r.top + app.vue.ty + y * s;
        const coupe = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
        const bloc = coupe(q, { left: X(k.x), right: X(k.x + k.w), top: Y(k.y), bottom: Y(k.y + k.h) }), L = liaisonsDuPlan(), pres = p => p.x >= k.x - 24 && p.x <= k.x + k.w + 24 && p.y >= k.y - 24 && p.y <= k.y + k.h + 24;
        const departs = d.fils.filter(w => { const l = L[w.i]; return l && (l.de === nom || l.vers === nom) && w.pts && w.pts.length > 1; }).filter(w => { const n = w.pts.length, pts = pres(w.pts[0]) || !pres(w.pts[n - 1]) ? w.pts : [...w.pts].reverse(), a = pts[0], b = pts[1];
          return coupe(q, { left: Math.min(X(a.x), X(b.x)) - 2, right: Math.max(X(a.x), X(b.x)) + 2, top: Math.min(Y(a.y), Y(b.y)) - 2, bottom: Math.max(Y(a.y), Y(b.y)) + 2 }); }).map(w => w.cable);
        const box = $('ba-equip'), entiere = box.scrollHeight <= box.clientHeight + 2 || q.height >= 600;
        return { bloc, departs, entiere, h: Math.round(q.height), carte: [q.left, q.top].map(Math.round).join(',') }; }, nom);
      ok(!C.bloc && !C.departs.length && C.entiere, `${W} : la carte de ${nom} ne cache ni son bloc ni le départ de ses câbles, et se lit entière`, JSON.stringify(C));
    }
    ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
    await page.close(); }
  console.log('\n  ' + (ko ? ko + ' échec(s)' : 'tout tient'));
  await nav.close(); process.exit(ko ? 1 : 0);
})();
