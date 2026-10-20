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
    await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined'); await page.evaluate(() => ['equipement', 'disjoncteur', 'barrette', 'prise', 'masse', 'fil'].forEach(t => ['disjoncteur', 'connecteur', 'raccord', 'trajet', 'fils', 'dejafait'].forEach(k => retenirSection(t, k, true)))); await page.evaluate(() => atelier.exemple());   // l’outil s’ouvre sur la bibliothèque : la batterie, qui lit l’exemple, le demande ; les fiches s'ouvrent pliées : la batterie ouvre leurs sections
    await page.evaluate(() => { app.plan = '1'; if (app.base.ouvert) fermerBase(); redessiner(); ajuster(); }); await page.waitForTimeout(400);
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
    ok(await page.evaluate(() => !$('inspecteur').hidden && $('eq-rep') && $('eq-rep').value === '103RL1'), 'un clic sur 103RL1 ouvre sa fiche');
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
      // l'épingle : le volet d'hier, le plan recadré à côté ; puis la carte revient
      await page.click('#fi-epingle'); await page.waitForTimeout(500); await posee();
      const ep = await page.evaluate(() => ({ cls: document.body.className, droite: marges().droite, bord: Math.round(innerWidth - $('inspecteur').getBoundingClientRect().right), haut: Math.round($('inspecteur').getBoundingClientRect().top) }));
      r = await recouvre(['inspecteur']);
      ok(/insp-epingle/.test(ep.cls) && !/insp-flotte/.test(ep.cls) && ep.droite > 300 && ep.bord <= 12 && ep.haut === 52 && !r.length, 'l’épingle en fait le volet de droite, et la feuille se recadre à côté', JSON.stringify(ep) + ' ' + r.join(' '));
      await page.click('#fi-epingle'); await page.waitForTimeout(500); await posee();
      cc = await cache('103RL1');
      ok(await page.evaluate(() => document.body.classList.contains('insp-flotte') && marges().droite === 24 && !CARTE.epingle) && !cc, 'détachée, elle redevient une carte à côté de son bloc, le plan reprend toute la place', cc);
      // Échap la ferme tout de suite (les gestes n'attendent rien) ; c'est son double, sans identifiants, qui rentre dans le bloc
      await page.keyboard.press('Escape'); await page.waitForTimeout(40);
      const fermee = await page.evaluate(() => ({ cache: $('inspecteur').hidden, cible: !!app.cible, doubles: [...document.querySelectorAll('.carte-double')].map(d => d.getAttribute('aria-hidden') === 'true' && !d.querySelector('[id]')) }));
      ok(fermee.cache && !fermee.cible && fermee.doubles.length === 1 && fermee.doubles[0], 'Échap ferme la carte tout de suite ; son double (aria-hidden, sans identifiants) se résorbe dans le bloc', JSON.stringify(fermee));
      await posee(); ok(await page.evaluate(() => !document.querySelector('.carte-double') && !$('carte-lien').classList.contains('on')), 'le double s’efface, le fil aussi');
    }
    ok(await page.evaluate(() => $('base').hidden), 'le tableau reste fermé');
    const f = await pointDuCable('W-014'); await page.mouse.click(f.x, f.y); await page.waitForTimeout(500);
    ok(await page.evaluate(() => app.cible && app.cible.type === 'fil' && $('ba-equip').textContent.includes('W-014')), 'un clic sur W-014 ouvre la fiche du fil');
    await page.keyboard.press('b'); await page.waitForTimeout(600);
    ok(await page.evaluate(() => !$('base').hidden), 'B ouvre le tableau');
    ok(await page.evaluate(() => { app.base.filtre = ''; app.base.portee = 'folio'; rendreBase(); const n = $('ba-tbody').querySelectorAll('tr[data-i]').length;
      return n === verite().filter(l => l.plan === '1').length && n > 0; }), '« Ce folio » montre les liaisons du folio 1, rien d’autre');
    if (!tel) ok(await page.evaluate(() => document.body.classList.contains('insp-epingle') && !CARTE.epingle && $('base').getBoundingClientRect().right <= $('inspecteur').getBoundingClientRect().left + 1), 'le récapitulatif ouvert, la fiche se range en volet : le tableau s’arrête à côté d’elle');
    r = await recouvre(couvrants); ok(!r.length, 'la feuille n’est ni sous l’inspecteur ni sous le tableau', r.join(' '));
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
  /* LE RÉCAPITULATIF, pratique au quotidien (v58) : neuf onglets, chaque objet dans un seul ; peu de colonnes d'office,
     le reste au choix ; les mots du lecteur (câble, gauge, raccord) ; un état en un point et un mot, son pourquoi dans la
     bulle, la chute admise lue au moteur ; tout s'écrit d'un double-clic (Tab la suivante), ↺ rend le calcul ; le clic
     ouvre la fiche, l'onglet se garde, le CSV suit les colonnes. */
  console.log('\nle récapitulatif');
  { const page = await nav.newPage({ viewport: { width: 1440, height: 900 } }); const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
    await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined'); await page.evaluate(() => ['equipement', 'disjoncteur', 'barrette', 'prise', 'masse', 'fil'].forEach(t => ['disjoncteur', 'connecteur', 'raccord', 'trajet', 'fils', 'dejafait'].forEach(k => retenirSection(t, k, true)))); await page.evaluate(() => atelier.exemple());   // les fiches s'ouvrent pliées : la batterie lit leurs sections
    await page.evaluate(() => { app.plan = '1'; redessiner(); ajuster(); }); await page.keyboard.press('b'); await page.waitForTimeout(500);
    const entetes = () => page.evaluate(() => [...document.querySelectorAll('#ba-thead th')].map(t => t.textContent.replace(/[▲▼]/g, '').trim()).filter(Boolean).join(' · '));
    const onglets = await page.evaluate(() => [...document.querySelectorAll('#ba-onglets .rc-onglet span')].map(s => s.textContent).join(' · '));
    ok(onglets === 'Liaisons · Équipements · Disjoncteurs · Barrettes · Prises · Câbles · Raccords · Problèmes · Normes', 'neuf onglets, chaque objet dans un seul (plus de « Contacts » : la nomenclature les compte)', onglets);
    ok(await entetes() === 'De · Câble · Vers · Longueur · État', 'Liaisons, d’office : de, le câble, vers, la longueur, l’état', await entetes());
    // les mots du lecteur : partout où le récapitulatif parle (les phrases du contrôle et les titres des normes viennent d'ailleurs)
    const mots = await page.evaluate(() => { const vus = []; for (const [k] of ONGLETS) { changerOnglet(k); ouvrirMenuColonnes();
        const t = [$('ba-onglets').innerText, $('ba-thead').innerText, $('ba-puces').innerText, $('ba-filtre').placeholder, $('ba-ajouter').hidden ? '' : $('ba-ajouter').innerText, $('ba-colonnes-menu').innerText, k === 'problemes' || k === 'normes' ? '' : $('ba-tbody').innerText].join(' ');
        fermerMenuColonnes(); const m = t.match(/(^|[^\p{L}])(fils?|jauges?|habillages?)(?![\p{L}])/giu); if (m) vus.push(k + ' : ' + [...new Set(m.map(x => x.trim()))].join(', ')); }
      changerOnglet('liaisons'); return vus; });
    ok(!mots.length, 'le récapitulatif dit « câble », « gauge », « raccord » — plus « fil », « jauge », « habillage »', mots.join(' | '));
    const E = await page.evaluate(() => { const tr = [...document.querySelectorAll('#ba-tbody tr[data-i]')], ligne = c => tr.find(t => verite()[+t.dataset.i].cable === c), etat = t => t && t.querySelector('td.rc-c-etat .rc-etat');
      const w12 = etat(ligne('W-012')), l = verite().find(l => l.cable === 'W-012'), c = chuteDuFil(l, intensiteCalculee(l));
      return { w12: w12 ? w12.className + '|' + w12.textContent : '', bulle: w12 ? w12.dataset.bulle : '', admise: volts(c.max), w11: (etat(ligne('W-011')) || {}).textContent, mots: [...new Set(tr.map(t => (etat(t) || {}).textContent).filter(Boolean))].sort().join(',') }; });
    ok(/ko\|problème$/.test(E.w12) && /Intensité/.test(E.bulle) && new RegExp('Chute en ligne : .* (sur|>) ' + E.admise + ' admis').test(E.bulle) && E.w11 === 'à voir' && E.mots.split(',').every(m => ['ok', 'à voir', 'problème'].includes(m)),
      'un état par liaison, un point et un mot (ok, à voir, problème) ; W-012 : problème, l’intensité et la chute dans sa bulle, contre la chute admise du moteur ; W-011 (DR16) à voir : il est sous le 15 A que l’automatique retient', JSON.stringify(E));
    // Équipements : les équipements seuls, d'office le repère, le type, la norme, les problèmes
    await page.evaluate(() => { app.base.portee = 'tout'; changerOnglet('equipements'); }); await page.waitForTimeout(200);
    const Q = await page.evaluate(() => { const tr = [...document.querySelectorAll('#ba-tbody tr[data-k]')], ligne = n => tr.find(t => t.dataset.k === n), cases = t => t ? [...t.querySelectorAll('td')].map(x => x.textContent.trim()).filter(Boolean).join(' | ') : '';
      return { genres: [...new Set(tr.map(t => genreDuRepere(t.dataset.k)))].join(','), entetes: [...document.querySelectorAll('#ba-thead th')].map(t => t.textContent).filter(Boolean).join(' · '), xc: cases(ligne('300XC1')), bt: cases(ligne('101BT1')) }; });
    ok(Q.genres === 'eqpt' && Q.entetes === 'Repère · Type · Norme · Problèmes' && /^300XC1 \| Connecteur \| EN 4165-002 \| \d+ problèmes?$/.test(Q.xc) && /^101BT1 \| Batterie \| — \| ok$/.test(Q.bt),
      'Équipements : les équipements seuls (disjoncteurs, barrettes, prises ont leur onglet) — le repère, le type, la norme, les problèmes ; ni part number ni nombre de câbles', JSON.stringify(Q));
    await page.click('#ba-tbody tr[data-k="103RL1"] td.rc-c-norme'); await page.waitForTimeout(500);
    ok(await page.evaluate(() => app.cible && app.cible.nom === '103RL1' && !$('inspecteur').hidden && app.choisi === '103RL1' && document.querySelector('#ba-tbody tr[data-k="103RL1"]').classList.contains('on')), 'un clic sur une ligne ouvre sa fiche et l’allume sur le plan');
    // Disjoncteurs : le calibre retenu, son verdict (celui du moteur), le meilleur ; en retenir un autre d'ici, Ctrl+Z le rend
    await page.evaluate(() => changerOnglet('disjoncteurs')); await page.waitForTimeout(200);
    const D = await page.evaluate(() => { const d = disjonctionDe('102CB1'), tr = document.querySelector('#ba-tbody tr[data-k="102CB1"]');
      return { entetes: [...document.querySelectorAll('#ba-thead th')].map(t => t.textContent).filter(Boolean).join(' · '), cal: tr.querySelector('[data-f="calibre"]').textContent, calibre: d.calibre, attendu: nombre(d.calibre), pn: pnDuRepere('102CB1'),
        verdict: tr.querySelector('td.rc-c-etat .rc-etat').textContent, juge: !d.valide ? 'déclenche' : d.serre ? 'touche la courbe' : 'tient', ideal: d.calibreIdeal, retenir: !!tr.querySelector('[data-retenir]'), gamme: d.gamme.map(g => g.calibre) }; });
    ok(D.entetes === 'Repère · Calibre · Verdict · Meilleur · Problèmes' && D.cal === D.attendu && D.verdict === D.juge && D.retenir === (D.ideal !== D.calibre), 'Disjoncteurs : le calibre retenu, son verdict tel que le moteur le rend, le meilleur (« Retenir » quand il diffère)', JSON.stringify(D));
    const autre = D.retenir ? D.ideal : D.gamme.find(c => c !== D.calibre);
    if (D.retenir) await page.click('#ba-tbody tr[data-k="102CB1"] [data-retenir]');
    else { await page.dblclick('#ba-tbody tr[data-k="102CB1"] [data-f="calibre"]'); await page.selectOption('#ba-tbody select[data-f="calibre"]', String(autre)); }
    await page.waitForTimeout(700);
    ok(await page.evaluate(a => calibreDe('102CB1') === a && document.querySelector('#ba-tbody tr[data-k="102CB1"] [data-f="calibre"]').textContent === nombre(a), autre), 'retenir un autre calibre d’ici : ' + autre + ' A, comme dans la fiche');
    await page.evaluate(() => annuler()); await page.waitForTimeout(500);
    ok(await page.evaluate(d => calibreDe('102CB1') === d.calibre && pnDuRepere('102CB1') === d.pn, D), 'Ctrl+Z rend le calibre d’avant');
    // les colonnes : en ajouter une, revenir à celles d'office
    await page.evaluate(() => { changerOnglet('liaisons'); app.base.portee = 'folio'; rendreBase(true); }); await page.waitForTimeout(200);
    await page.click('#ba-colonnes'); await page.click('#ba-colonnes-menu input[data-col="jauge"]'); await page.waitForTimeout(300); const avec = await entetes();
    await page.click('#ba-colonnes-defaut'); await page.waitForTimeout(300); await page.keyboard.press('Escape'); const sans = await entetes();
    ok(avec === 'De · Câble · Vers · Longueur · État · Gauge' && sans === 'De · Câble · Vers · Longueur · État', '« Colonnes » : la gauge s’ajoute, « Revenir aux colonnes d’office » la retire', avec);
    // écrire d'un double-clic : au survol, la valeur a l'air d'un champ ; Tab passe à la suivante ; ↺ rend le calcul
    const k = await page.evaluate(() => [...document.querySelectorAll('#ba-tbody tr[data-i]')].find(t => verite()[+t.dataset.i].cable === 'W-013').dataset.k), sel = `#ba-tbody tr[data-k="${k}"]`;
    await page.hover(`${sel} [data-f="longueur"]`); await page.waitForTimeout(250);
    const air = await page.evaluate(s => { const v = document.querySelector(s + ' [data-f="longueur"]'), t = getComputedStyle(document.querySelector(s + ' [data-f="type"]'));
      return { champ: getComputedStyle(v).boxShadow !== 'none', souligne: t.textDecorationStyle === 'dotted' && t.textDecorationColor !== 'rgba(0, 0, 0, 0)', titre: v.title }; }, sel);
    ok(air.champ && air.souligne && /double-clic/i.test(air.titre), 'au survol, la valeur modifiable a l’air d’un champ et les autres de sa ligne se soulignent', JSON.stringify(air));
    await page.dblclick(`${sel} [data-f="longueur"]`); await page.fill(`${sel} input[data-f="longueur"]`, '3,25'); await page.press(`${sel} input[data-f="longueur"]`, 'Tab'); await page.waitForTimeout(500);
    const L1 = await page.evaluate(s => { const a = document.activeElement; return { L: verite().find(l => l.cable === 'W-013').longueur, main: !!document.querySelector(s + ' .rc-o.main'), rond: !!document.querySelector(s + ' .rc-auto[data-auto="longueur"]'), suite: a && a.tagName === 'INPUT' ? a.dataset.f : '' }; }, sel);
    ok(L1.L === 3.25 && L1.main && L1.rond && L1.suite === 'de', 'double-clic sur la longueur, 3,25, Tab : écrite (« main » et ↺), le curseur dans la case suivante', JSON.stringify(L1));
    await page.keyboard.press('Escape'); await page.waitForTimeout(200); await page.click(`${sel} .rc-auto[data-auto="longueur"]`); await page.waitForTimeout(400);
    ok(await page.evaluate(() => !(verite().find(l => l.cable === 'W-013').longueur > 0)), '↺ rend la longueur du retest (ici, l’hypothèse)');
    // la mémoire de l'onglet, l'export de ce qu'on voit
    ok(await page.evaluate(() => { changerOnglet('cables'); const o = JSON.parse(localStorage.getItem('atelier.recap.v2') || '{}'); changerOnglet('liaisons'); return o.onglet === 'cables'; }), 'l’onglet ouvert se garde dans ce navigateur');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#ba-csv')]);
    const csv = require('fs').readFileSync(await dl.path(), 'utf8').replace(/^﻿/, '').split('\n');
    ok(csv[0] === 'De;Câble;Vers;Longueur;État' && csv.length === 9, 'le CSV de l’onglet : ses colonnes, ses lignes (les huit du folio 1)', csv[0] + ' · ' + (csv.length - 1) + ' lignes');
    ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
    await page.close(); }
  // chaque dédoublement : une vraie barrette, une borne par fil, jamais deux fils au même niveau
  console.log('\nbarrettes à poser');
  const page = await nav.newPage({ viewport: { width: 1600, height: 950 } }); const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined'); await page.evaluate(() => ['equipement', 'disjoncteur', 'barrette', 'prise', 'masse', 'fil'].forEach(t => ['disjoncteur', 'connecteur', 'raccord', 'trajet', 'fils', 'dejafait'].forEach(k => retenirSection(t, k, true)))); await page.evaluate(() => atelier.exemple());   // l’outil s’ouvre sur la bibliothèque : la batterie, qui lit l’exemple, le demande ; les fiches s'ouvrent pliées : la batterie ouvre leurs sections
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
  await page.evaluate(() => document.querySelector('#ba-equip .fi-fil[data-i]').scrollIntoView({ block: 'center' })); await page.waitForTimeout(100);   // la fiche v3 pose les contacts plus bas : sous les yeux d'abord
  const li = await page.locator('#ba-equip .fi-fil[data-i]').first().boundingBox(); await page.mouse.move(li.x + li.width / 2, li.y + li.height / 2); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !!document.querySelector('#scene.focus') && !!document.querySelector('#ba-equip .fi-fil.vise')), 'survoler un fil de la fiche l’allume sur le plan');
  // le contrôle : le compte sur le bouton des repères, la liste « à reprendre » en tête de l'index, une ligne qui mène au bloc, sur son folio
  await page.keyboard.press('Escape'); await page.keyboard.press('r'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => !$('btnIndex').querySelector('.rd-point').hidden && /problème/.test($('ba-equip').querySelector('.ix-controle').textContent) && $('ba-equip').querySelectorAll('.co-item').length === new Set(CONTROLE.items.map(x => x.niveau + '|' + (x.nom || x.texte))).size && CONTROLE.items.some(x => x.nom === 'VT1') && /102CB1 4 problèmes/.test($('ba-equip').querySelector('.co-item').textContent) && !document.getElementById('controle')),
    'plus de pastille sur le plan : le bouton des repères porte le compte, l’index liste ce qu’il y a à reprendre, une ligne par repère (102CB1 : 4 problèmes — le permanent de 5 A dépasse aussi le contact 23 de son DR24, 3 A avec un 24 AWG ; le 10 A touche la courbe : il ne passe pas), les barrettes à poser comprises');
  ok(await page.evaluate(() => [...$('ba-equip').querySelectorAll('.ix-groupe')].some(g => /Disjoncteurs/.test(g.textContent)) && /10\sA/.test($('ba-equip').textContent)), 'l’index range les disjoncteurs à part, avec leur calibre');
  // « à reprendre » est replié en tête de l'index (le lecteur : on clique si on veut) : on le déplie, puis la ligne
  ok(await page.evaluate(() => !$('ba-equip').querySelector('.ix-controle').open), '« à reprendre » est replié par défaut');
  await page.click('#ba-equip .ix-controle > summary'); await page.waitForTimeout(200);
  await page.locator('#ba-equip .co-item', { hasText: '300XC1' }).click(); await page.waitForTimeout(600);
  ok(await page.evaluate(() => app.plan === '3' && app.cible && app.cible.nom === '300XC1' && !$('inspecteur').hidden), 'une ligne mène au folio 3 et à la fiche de 300XC1');
  ok(await page.evaluate(() => !$('ba-equip').querySelector('.fi-norme') && !/Conforme/.test($('ba-equip').textContent)), 'la fiche ne répète pas la norme à côté de la référence, et ne dit pas « conforme »');
  // le disjoncteur : le calibre retenu en grand (le 10 A du part number, juste), le meilleur (15 A), la gamme sous « Autre calibre », le graphique, les états ; un profil qui déclenche, Ctrl+Z
  await page.keyboard.press('Escape'); await page.evaluate(() => { allerAuPlan('1'); choisirBloc(app.dessin.comps.find(k => k.name === '102CB1' && k.kind !== 'tag')); }); await page.waitForTimeout(500);
  ok(await page.evaluate(() => { const s = document.querySelector('#ba-equip'), h = s.querySelector('.dj-heros'); return !!s.querySelector('.fi-dj[data-disj="102CB1"]') && h.querySelector('.dj-h-cal').textContent === '15A' && h.classList.contains('ok') && !h.querySelector('.dj-verdict-pastille') && $('dj-retenir').textContent.trim() === 'Automatique' && $('dj-retenir').getAttribute('aria-pressed') === 'true' && !s.querySelector('.dj-chip, [data-pn="*"]') && disjonctionDe('102CB1').gamme.length === 7 && s.querySelectorAll('.dj-graphe .dj-bande').length === 1 && !s.querySelector('.dj-fantome, .dj-legende') && s.querySelector('[data-dj="dem"][data-q="i"]').value === '9,31'; }),
    'la fiche de 102CB1 (la section Calibre) : l’automatique d’office — le 15 A, le plus petit qui passe (le retest porte un 10 A) —, en grand, sans pastille ; « Automatique » pressé ; plus de rangée de calibres ni de part number d’office ; sept calibres de 1 à 20 A (le MS3320 s’arrête à 20 A : feuille MS3320N) ; UNE bande sur le graphique, ni fantômes ni légende ; le profil modifiable');
  await page.click('#ba-equip [data-changer="dj|102CB1"]'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const s = document.querySelector('#ba-equip'), p = s.querySelector('.dj-chip[aria-pressed="true"]'), cs = [...s.querySelectorAll('.dj-chip')]; return p && p.dataset.cal === '15' && s.querySelector('.dj-chip.ideal').dataset.cal === '15' && cs.length >= 2 && cs.every(c => c.classList.contains('ok') && +c.dataset.cal >= 15); }),
    '« Autre calibre » : seulement les calibres de la gamme MS3320 qui passent (15, 20, 25 A), le 15 A pressé et étoilé');
  await page.click('#ba-equip [data-changer="dj|102CB1"]'); await page.waitForTimeout(200);
  // le 10 A du retest, retenu à la main (le récapitulatif le permet) : la suite le juge
  await page.evaluate(() => { retenirCalibre('102CB1', 10); choisirBloc(app.dessin.comps.find(k => k.name === '102CB1' && k.kind !== 'tag')); }); await page.waitForTimeout(600);
  await page.fill('#ba-equip [data-dj="perm"][data-q="i"]', '9,5'); await page.press('#ba-equip [data-dj="perm"][data-q="i"]', 'Enter'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => { const s = document.querySelector('#ba-equip'), h = s.querySelector('.dj-heros'); return h.classList.contains('ko') && /ne passe pas — il déclenche/.test(h.querySelector('.dj-h-ko').textContent) && !!s.querySelector('.dj-pt.ko[data-k="perm"]') && /Automatique \(\d+\sA\)/.test($('dj-retenir').textContent) && app.contrat.charges.get('102CB1').perm.i === 9.5 && CONTROLE.items.some(x => x.nom === '102CB1' && x.niveau === 'ko' && /10 A/.test(x.texte)); }),
    '9,5 A en permanence sur le 10 A retenu à la main : il ne passe pas (« il déclenche », écrit à côté), le point du permanent est rouge, « Automatique » propose le calibre qui passe, le contrôle le relève');
  await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => app.contrat.charges.get('102CB1').perm.i === 5 && !CONTROLE.items.some(x => x.nom === '102CB1' && /9,5\sA/.test(x.texte))), 'Ctrl+Z rend le profil de l’exemple (plus rien ne parle des 9,5 A)');
  await page.evaluate(() => { choisirBloc(app.dessin.comps.find(k => k.name === '102CB1' && k.kind !== 'tag')); }); await page.waitForTimeout(500);
  ok(await page.evaluate(() => { const li = [...document.querySelectorAll('#ba-equip .dj-fils .fi-ia')]; return li.length === 3 && li.some(x => /W-015/.test(x.textContent + [...x.querySelectorAll('input')].map(i => ' ' + i.value).join('')) && x.classList.contains('ko') && /3,9 A/.test(x.textContent)) && CONTROLE.items.some(x => x.nom === '102CB1' && /W-015/.test(x.texte) && x.niveau === 'ko'); }),
    'ses trois câbles sont jugés : le DR24 (W-015) ne tient pas 9,31 A pendant 2 min (3,9 A en faisceau, le point FAA), et le contrôle le dit');
  // « Automatique (15 A) » : le choix rendu à l'outil ; un état de plus, retiré ; le survol d'un point du profil
  await page.click('#dj-retenir'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => pnDuRepere('102CB1') === 'MS3320-10' && calibreDe('102CB1') === 15 && !(app.contrat.charges.get('102CB1') || {}).calibre && document.querySelector('#ba-equip .dj-h-cal').textContent === '15A' && $('dj-retenir').getAttribute('aria-pressed') === 'true' && !CONTROLE.items.some(x => x.nom === '102CB1' && /suffirait|touche la courbe/.test(x.texte))), '« Automatique (15 A) » rend le choix à l’outil : le 15 A en grand, le part number du retest intact, le contrôle n’a plus rien à dire du calibre (sauf que le retest porte un 10 A)');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  await page.evaluate(() => { choisirBloc(app.dessin.comps.find(k => k.name === '102CB1' && k.kind !== 'tag')); }); await page.waitForTimeout(500);
  ok(await page.evaluate(() => pnDuRepere('102CB1') === 'MS3320-10' && document.querySelector('#ba-equip .dj-h-cal').textContent === '10A'), 'Ctrl+Z rend le MS3320-10 du retest');
  await page.click('#dj-plus'); await page.waitForTimeout(600); await page.fill('#ba-equip .dj-etat[data-k="plus0"] [data-q="i"]', '12'); await page.fill('#ba-equip .dj-etat[data-k="plus0"] [data-q="t"]', '30'); await page.press('#ba-equip .dj-etat[data-k="plus0"] [data-q="t"]', 'Enter'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => { const c = app.contrat.charges.get('102CB1'); return c.plus.length === 1 && c.plus[0].i === 12 && c.plus[0].t === 30 && document.querySelectorAll('#ba-equip .dj-graphe .dj-pt').length === 3 && document.querySelector('#ba-equip .dj-heros').classList.contains('ko'); }), 'un état de plus (12 A pendant 30 s) : un point de plus sur le graphique, le 10 A déclenche');
  await page.evaluate(() => document.querySelector('#ba-equip .dj-graphe').scrollIntoView({ block: 'center' })); await page.waitForTimeout(100);   // la barre de navigation, collée en haut de la fiche, couvrirait le point
  const pt = await page.locator('#ba-equip .dj-graphe .dj-pt[data-k="plus0"] .dj-point').boundingBox(); await page.mouse.move(pt.x + pt.width / 2, pt.y + pt.height / 2); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const t = document.querySelector('#ba-equip .dj-tip'); return !t.hidden && /État 3/.test(t.textContent) && /12\sA/.test(t.textContent) && /déclenche/.test(t.textContent); }), 'survoler le point dit l’état, son courant, sa durée, et que le 10 A déclenche');
  await page.click('#ba-equip .dj-x[data-x="plus0"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => app.contrat.charges.get('102CB1').plus.length === 0 && document.querySelector('#ba-equip .dj-heros').classList.contains('ko') && /touche la courbe/.test(document.querySelector('#ba-equip .dj-h-ko').textContent)), 'l’état retiré : le 10 A ne déclenche plus, mais touche toujours la courbe — il ne passe toujours pas');
  // la fiche d'un fil : ses faits — le câble de la base, ce qu'il admet, le courant du disjoncteur en amont, la chute
  await page.evaluate(() => { const w = app.dessin.fils.find(w => w.cable === 'W-012'); if (w) { app.cible = { type: 'fil', l: verite()[w.i] }; ouvrirInspecteur(); } }); await page.waitForTimeout(400);
  // la fiche à sections : chaque fait à sa place (le câble de la base dans la bulle de sa tuile, l'intensité, la chute)
  ok(await page.evaluate(() => { const sec = s => document.querySelector(`#ba-equip details.fs[data-section="${s}"]`), bulle = (s, k) => [...sec(s).querySelectorAll('.fi-mes')].filter(m => m.textContent.includes(k)).map(m => m.textContent + ' ' + m.dataset.bulle).join(' '), id = [...document.querySelectorAll('#ba-equip .fi-tuile')].map(t => t.title).join(' '), i = bulle('fils', 'Intensité'), u = bulle('fils', 'Chute');
    return /1\sbrin/.test(id) && /Ø\s1,34\smm/.test(id) && /33,2\smΩ\/m/.test(id) && /6,9\sA admis en continu/.test(i) && /permanent\s5\sA/.test(i) && /sous 102CB1/.test(i) && /pointe\s9,31\sA/.test(i) && /depuis 102CB1/.test(u); }),
    'la fiche de W-012 (DR20) : 1 brin, Ø 1,34 mm, 33,2 mΩ/m (la tuile de son type) ; 11,5 × 0,6 = 6,9 A en continu (le point FAA du faisceau de 102CB1), 5 A permanent sous 102CB1, pointe 9,31 A (l’intensité : sa ligne, et sa bulle pour le détail) ; la chute en ligne depuis 102CB1');
  await page.evaluate(() => { allerAuPlan('3'); choisirBloc(app.dessin.comps.find(k => k.name === '300XC1' && k.kind !== 'tag')); }); await page.waitForTimeout(600);
  ok(await page.evaluate(() => document.querySelector('#ba-equip .ct-bulles [aria-pressed="true"]').dataset.connecteur === 'B' && !!document.querySelector('#ba-equip [data-panneau="B"]')), 'la fiche de 300XC1 s’ouvre sur le connecteur B, celui qui porte le problème');
  await page.click('#ba-equip .ct-bulles [data-connecteur="A"]'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const f = document.querySelector('#ba-equip details[data-section="connecteur"] .fi-groupe-raccord [data-hab="300XC1|A"]'); return !!f && /toron Ø\s[\d,]+\smm/.test(f.querySelector('.fi-hab-mots').textContent) && f.querySelectorAll('.fi-piece').length >= 1; }), 'le raccord du connecteur A de 300XC1, dans la section du connecteur : le toron (son diamètre), une ligne par pièce');
  ok(await page.evaluate(() => { const li = document.querySelector('#ba-equip details[data-section="connecteur"] .fi-contacts .fi-fil[data-i]'), l2 = li && li.nextElementSibling; return !!li && li.querySelector('.fi-sertir').textContent === 'EN3155-003F2020' && l2.querySelector('.fi-sertir').classList.contains('meme') && /^24AWG$/.test(li.querySelector('.fi-jg').textContent) && /W-320 · DR24/.test(li.dataset.bulle) && li.querySelector('.fi-cab-n').textContent === 'W-320' && !li.querySelector('.fi-dest, .fi-num'); }), 'une ligne de contact : la borne dans son rond, le contact de la table (plus pâle quand c’est le même qu’au-dessus), la gauge acceptée, le câble — plus « vers » (le lecteur : on s’en fout)');
  // ce qui englobe le connecteur : un EN 4165 prend une cheminée par module et un tyrap (R3) — ni raccord EN 3660, ni band-it, quoi qu'on choisisse ; le choix se garde quand même ; Ctrl+Z
  const piece = r => `(() => { const h = document.querySelector('#ba-equip [data-hab="300XC1|A"]'), p = h && h.querySelector('[data-role="${r}"] .fi-piece-ref'); return p ? p.textContent : ''; })()`;
  ok(await page.evaluate(`/^EN4165-015/.test(${piece('cheminee')}) && /^NSA935401-03/.test(${piece('tyrap')}) && !document.querySelector('#ba-equip [data-hab="300XC1|A"] [data-role="bande"], #ba-equip [data-hab="300XC1|A"] [data-role="raccord"]')`), 'le connecteur A de 300XC1 (EN 4165) : sa cheminée EN4165-015 et le tyrap qui tient le toron (R3), ni raccord EN 3660 ni band-it');
  await page.evaluate(() => { const b = document.querySelector('#ba-equip [data-hab="300XC1|A"] [data-changer^="rac|"]'); b.click(); }); await page.waitForTimeout(200);
  await page.evaluate(() => { document.querySelector('#ba-equip [data-hab="300XC1|A"] [data-raccord][data-champ="blindage"][data-v="GND"]').click(); }); await page.waitForTimeout(800);
  ok(await page.evaluate(`/^EN4165-015/.test(${piece('cheminee')}) && !document.querySelector('#ba-equip [data-hab="300XC1|A"] [data-role="bande"], #ba-equip [data-hab="300XC1|A"] [data-role="raccord"]') && app.contrat.raccords.get('300XC1|A').blindage === 'GND'`), 'reprise sur le corps choisie : le choix est gardé au contrat, mais toujours la cheminée, ni raccord durci ni band-it sur un EN 4165');
  await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => !app.contrat.raccords.get('300XC1|A')), 'Ctrl+Z défait le choix du raccord');
  // la chute en ligne depuis le disjoncteur, et la fiche d'un fil avec sa chute
  await page.evaluate(() => { allerAuPlan('1'); choisirBloc(app.dessin.comps.find(k => k.name === '102CB1' && k.kind !== 'tag')); }); await page.waitForTimeout(500);
  ok(await page.evaluate(() => { const li = [...document.querySelectorAll('#ba-equip .dj-fils .fi-ia')]; return li.length === 3 && li.every(x => /\d,\d+\sV$/.test(x.querySelector('.fi-u').textContent)) && li.some(x => /W-015/.test(x.textContent + [...x.querySelectorAll('input')].map(i => ' ' + i.value).join('')) && /chute en ligne vers 395SW1/.test(x.dataset.bulle)); }), 'la fiche de 102CB1 : la chute en ligne sur la ligne de chacun de ses trois fils (W-015 : vers 395SW1, dans sa bulle)');
  // les contrats déjà faits : une base (l'exemple décalé), « Déjà fait » sur la fiche, la comparaison, reprendre, Ctrl+Z
  await page.evaluate(() => { const d = r => r.replace(/^(\d)(\d\d)([A-Z]+)(\d*)/, (m, a, b, c, e) => String(+a + 2) + b + c + e);
    const B = contratExemple().map(l => liaison({ ...l, de: d(l.de), vers: d(l.vers), harness: 'H-1', appareil: 'H160', retest: '2024-07-08' }));
    B.push(liaison({ de: '302CB1', borneDe: '3', pnDe: 'MS3320-10', vers: '305XX9', borneVers: '1', pnVers: 'ZZZ', cable: 'W-099', type: 'DR20', plan: '1', harness: 'H-1', appareil: 'H160' }));
    adopterReferences(B, 'essai'); choisirBloc(app.dessin.comps.find(k => k.name === '102CB1' && k.kind !== 'tag')); }); await page.waitForTimeout(600);
  ok(await page.evaluate(() => { const d = document.querySelector('#ba-equip .fi-deja'); return !!d && d.querySelectorAll('.fi-cand').length === 1 && /302CB1/.test(d.textContent) && /75\s%/.test(d.textContent) && /H160/.test(d.textContent); }), '« Déjà fait » sur 102CB1 : 302CB1 de H-1 (H160), 75 % de lignes communes');
  await page.evaluate(() => { const d = document.querySelector('#ba-equip details[data-section="dejafait"]'); if (d) d.open = true; }); await page.click('#ba-equip .fi-cand'); await page.waitForTimeout(500);
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

  /* LA BIBLIOTHÈQUE à la vraie souris (l'accueil d'avant : l'outil s'ouvre maintenant sur elle — tests/bibliotheque.js la
     passe en entier), le contrat neuf, les folios aux noms longs, les mots au pluriel, les noms de fichier */
  console.log('\nla bibliothèque à la vraie souris, le contrat neuf, les folios aux noms de dessin');
  await parLeMenu('bibliotheque'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => BIB.vue === 'racine' && !$('bibliotheque').hidden && $('inspecteur').hidden && !!$('bi-reprendre') && app.contrat.liaisons.length === 201 && !!document.querySelector('#bibliotheque .bi-vide')),
    '« Bibliothèque » (le menu) : la bibliothèque, aucune install encore ; l’exemple reste sur la table, dessous (« Reprendre »)');
  // chaque geste de la bibliothèque répond à un clic de souris
  let fc = null; try { [fc] = await Promise.all([page.waitForEvent('filechooser', { timeout: 3000 }), page.click('#bibliotheque .bi-vide [data-bi="base"]')]); } catch (_) { }
  ok(!!fc, 'un clic de souris sur « Déposer la base des contrats déjà faits » ouvre le choix de fichier');
  await page.click('#bibliotheque .bi-carte.bi-demo .bi-carte-corps'); await page.waitForTimeout(300);
  await page.click('#bibliotheque .bi-plan[data-plan="exemple"] .bi-plan-ouvrir'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => app.contrat.liaisons.length === 201 && app.contrat.charges.has('102CB1') && $('bibliotheque').hidden && $('vide').hidden), 'l’Exemple, d’un clic (sa carte, son plan) : l’exemple sur la table, avec son profil de charge');
  ok(await page.evaluate(() => app.nom === 'Contrat d’exemple' && $('ctx-nom').textContent === 'Contrat d’exemple' && /^l’exemple embarqué · 201 liaisons · \d+ repères · 6 folios$/.test($('ctx-txt').textContent) && $('en-install').textContent === 'Exemple'), 'le menu dit que c’est l’exemple embarqué ; le fil de la barre du haut, « Exemple »', await page.evaluate(() => $('ctx-txt').textContent));
  // un autre fichier : rien du contrat d'avant ne survit ; le menu dit son nom ; Ctrl+Z rend l'exemple et ses choix
  await page.evaluate(() => chargerContrat(contratExemple().filter(l => l.plan === '1'), 'ouverture de neuf.xlsx', 'neuf.xlsx')); await page.waitForTimeout(500);
  ok(await page.evaluate(() => !app.contrat.charges.size && !app.contrat.designations.size && !app.contrat.sexes.size && !app.contrat.raccords.size && $('ctx-nom').textContent === 'neuf.xlsx' && !/exemple/.test($('ctx-txt').textContent) && !CONTROLE.items.some(x => x.nom === '102CB1' && /9,31/.test(x.texte))),
    'un autre fichier ouvert : rien du contrat d’avant ne survit (son 102CB1 n’a pas le profil de l’exemple), le menu dit le nom du fichier', await page.evaluate(() => $('ctx-nom').textContent + ' · ' + $('ctx-txt').textContent));
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

  /* LA PRISE EN MAIN (U.md § 5) : le menu allégé, ses deux sous-menus et ses bulles (au clavier aussi), « Vos fichiers » (cinq cartes,
     ce que chacune attend), une erreur d'import écrite dans sa carte (le contrat ouvert intact), le rattrapage qui attend
     « Charger », la base sans Harness, la base déposée et « Voir un équipement déjà fait », le collage et son aperçu
     (ajouter au contrat), le modèle CSV — le même que modeles/. */
  console.log('\nla prise en main : le menu, « Vos fichiers », les erreurs, le rattrapage, la base, le collage, le modèle');
  const fs = require('fs'), path = require('path');
  const depot = async (entree, nom, texte) => { await page.setInputFiles(entree, { name: nom, mimeType: 'text/csv', buffer: Buffer.from(texte, 'utf8') }); await page.waitForTimeout(700); };
  // le menu ⋮ allégé (le lecteur : « on n'en utilise que 10-20 % ») : l'essentiel en tête — ouvrir, vos fichiers (où l'on
  // dépose aussi la base des contrats déjà faits, écrit dessous), le récapitulatif, la nomenclature —, deux sous-menus qui
  // s'ouvrent en place (Exporter, Plus) ; chaque ligne a sa bulle courte, dite aussi au lecteur d'écran
  const M = await page.evaluate(() => { const lignes = p => [...$(p).querySelectorAll('button[role="menuitem"]:not([data-retour])')].map(b => b.dataset.act || '›' + b.dataset.sous).join(',');
    return { principal: lignes('mp-principal'), exporter: lignes('mp-exporter'), plus: lignes('mp-plus'), fichiers: $('mp-principal').querySelector('[data-act="fichiers"]').textContent,
      bulles: [...document.querySelectorAll('#menu button[role="menuitem"]:not([data-retour])')].every(b => { const a = b.dataset.aide || ''; return a.length > 30 && a.length <= 160 && !!$(b.getAttribute('aria-describedby')); }) }; });
  ok(M.principal === 'bibliotheque,ouvrir,fichiers,recapitulatif,nomenclature,›exporter,›plus' && M.exporter === 'svg,png,imprimer,retestcorrige,suivi' && M.plus === 'coller,exemple,pdf,bible,normes,hypotheses,cartouche' && M.bulles && /contrats déjà faits/.test(M.fichiers),
    'le menu en sept lignes (la bibliothèque, ouvrir, vos fichiers — « contrats déjà faits » écrit dessous —, récapitulatif, nomenclature, Exporter ›, Plus ›), le reste dans ses deux sous-menus (Exporter : le folio en SVG, en PNG, l’impression, le retest corrigé en Excel, le suivi ; Plus : « Lire un PDF de schéma… » après l’exemple) — plus de « Tout effacer » : on supprime dans la bibliothèque ; chaque ligne a sa bulle courte, dite aussi au lecteur d’écran', JSON.stringify(M));
  // au clavier : ↓ ↓ jusqu'à « Vos fichiers… », sa bulle tout de suite, à gauche du menu ; → n'y fait rien (ni folio suivant)
  const plan0 = await page.evaluate(() => app.plan), montre = () => page.evaluate(() => [...document.querySelectorAll('#menu .menu-panneau')].filter(p => !p.hidden).map(p => p.id).join());
  await page.click('#btnMenu'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(350);
  ok(await page.evaluate(() => { const b = document.activeElement, u = $('menu-bulle'), r = u.getBoundingClientRect(), m = $('menu').getBoundingClientRect();
    return !!b && b.dataset.act === 'fichiers' && u.classList.contains('on') && u.textContent === b.dataset.aide && /contrats déjà faits/.test(u.textContent) && r.right <= m.left && r.width <= 300 && r.top >= 0 && r.bottom <= innerHeight; }),
    'au clavier (↓ ↓), la bulle de « Vos fichiers… » se lit tout de suite, à gauche du menu, entière à l’écran : on y dépose aussi les contrats déjà faits');
  const large0 = await page.evaluate(() => Math.round($('menu').getBoundingClientRect().width));
  await page.keyboard.press('ArrowRight'); for (let k = 0; k < 3; k++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250);
  const S1 = await page.evaluate(() => ({ act: document.activeElement.dataset.act, large: Math.round($('menu').getBoundingClientRect().width), ouvert: $('menu').querySelector('[data-sous="exporter"]').getAttribute('aria-expanded') }));
  const m1 = await montre(); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(250);
  const S2 = await page.evaluate(() => ({ sous: document.activeElement.dataset.sous, plan: app.plan })), m2 = await montre();
  ok(m1 === 'mp-exporter' && S1.act === 'svg' && S1.large === large0 && S1.ouvert === 'true' && m2 === 'mp-principal' && S2.sous === 'exporter' && S2.plan === plan0,
    '→ ouvre « Exporter » en place (le menu garde sa largeur), le clavier sur « Folio en SVG » ; ← y revient, sur « Exporter » ; les flèches ne changent pas de folio', JSON.stringify({ m1, S1, m2, S2, large0 }));
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('Escape'); await page.waitForTimeout(200); const m3 = await montre();
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  ok(m3 === 'mp-principal' && await page.evaluate(() => $('menu').hidden && document.activeElement === $('btnMenu')), 'Échap dans un sous-menu y revient ; Échap encore ferme le menu, le clavier sur ⋮');
  // à la souris : « Plus » s'ouvre d'un clic, ses bulles au survol ; « ‹ Plus » ramène ; « Vos fichiers… »
  await page.click('#btnMenu'); await page.click('#menu [data-sous="plus"]'); await page.hover('#menu [data-act="exemple"]'); await page.waitForTimeout(450);
  ok(await page.evaluate(() => !$('mp-plus').hidden && $('mp-principal').hidden && $('menu-bulle').classList.contains('on') && /reste dans la bibliothèque/.test($('menu-bulle').textContent) && /Ctrl\+Z le rend/.test($('menu-bulle').textContent)), 'à la souris, « Plus » s’ouvre d’un clic à la place du menu ; au survol, la bulle de « Ouvrir l’exemple » (votre plan reste dans la bibliothèque, Ctrl+Z le rend)');
  await page.click('#mp-plus [data-retour]'); await page.waitForTimeout(200); await page.click('#menu [data-act="fichiers"]'); await page.waitForTimeout(500);
  const VF = await page.evaluate(() => ({ mode: app.fiche && app.fiche.mode, cartes: [...document.querySelectorAll('#fiche-corps .vf-carte')].map(c => c.dataset.entree + ':' + (c.className.match(/e-(\w+)/) || [])[1]).join(' '), apercus: [...document.querySelectorAll('#fiche-corps .vf-carte')].filter(c => c.querySelectorAll('.vf-apercu tbody tr').length === 3).length, ouverts: [...document.querySelectorAll('#fiche-corps details.vf-attend[open]')].map(d => d.dataset.volet).join(' '),
    zones: [...document.querySelectorAll('#fiche-corps .vf-zone')].map(z => z.closest('.vf-carte').dataset.entree).join(' '), cles: [...document.querySelectorAll('#vf-base .vf-cles div')].map(d => d.textContent).join(' · ') }));
  // (la bibliothèque a déjà une install : « À ranger », où sont allés les fichiers ouverts plus haut hors de toute install)
  ok(VF.mode === 'fichiers' && VF.cartes === 'bibliotheque:ok retest:vide base:vide bible:ok normes:ok hypotheses:ok' && VF.apercus === 4 && VF.ouverts === '' && VF.zones === 'retest base' && VF.cles === 'Harnessla machine · FWDle dessin · Appareille contrat',
    '« Vos fichiers » : six cartes et leur état, la bibliothèque en tête ; le retest et la base disent en une ligne ce qu’ils attendent (la base : Harness la machine, FWD le dessin, Appareil le contrat) et ont leur zone de dépôt ; trois lignes d’exemple (retest, base, bible, une norme) repliées dans « Ce que j’attends »', JSON.stringify(VF));
  const nEx = await page.evaluate(() => verite().length);
  await depot('#fichier', 'compta.csv', 'Date;Montant;Libellé\n03/10/2026;1250,00;Fournitures\n05/10/2026;318,40;Câbles\n');
  const E1 = await page.evaluate(() => ({ toast: $('toast').textContent, erreur: $('toast').classList.contains('erreur'), voir: !!document.querySelector('#toast .toast-voir'), n: verite().length, nom: app.nom }));
  ok(E1.erreur && E1.voir && /en-têtes du retest/.test(E1.toast) && E1.n === nEx && E1.nom === 'Contrat d’exemple', 'un fichier qui n’est pas un retest : le mot qui passe le signale, avec « Voir » ; le contrat ouvert ne bouge pas', E1.toast);
  await page.click('#toast .toast-voir'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const c = $('vf-retest'), e = c && c.querySelector('.vf-erreur'); return app.fiche.mode === 'fichiers' && c.classList.contains('e-ko') && !!e && /J’ai lu/.test(e.textContent) && /Date/.test(e.textContent) && /Montant/.test(e.textContent) && /Device1, Pin1, Device2, Pin2/.test(e.textContent) && !!e.querySelector('[data-vf="modele-retest"]'); }),
    '« Voir » : l’erreur est écrite dans la carte du retest, et y reste — ce que l’outil a lu (Date · Montant · Libellé), ce qu’il lui faut, un modèle');
  await depot('#fichier', 'vide.csv', '');
  ok(await page.evaluate(() => /vide\.csv est vide\s:\saucune ligne/.test($('vf-retest').querySelector('.vf-erreur').textContent)), 'un fichier vide : « vide.csv est vide : aucune ligne. », dans la carte');
  await page.setInputFiles('#fichier', { name: 'photo.txt', mimeType: 'text/plain', buffer: Buffer.concat([Buffer.from('89504E470D0A1A0A0000000D49484452', 'hex'), Buffer.alloc(400, 3)]) }); await page.waitForTimeout(700);
  ok(await page.evaluate(n => /photo\.txt n’est pas un tableau \(Excel ou CSV\)/.test($('vf-retest').querySelector('.vf-erreur').textContent) && verite().length === n, nEx), 'une image : « photo.txt n’est pas un tableau (Excel ou CSV). »');
  await depot('#fichier', 'presque-retest.csv', 'Equipement;Broche;Cable;Equipement;Broche\n102CB1;2;W-012;103RL1;A1\n103RL1;A2;W-013;104LP1;1\n101BT1;1;W-011;102CB1;1\n');
  const R1 = await page.evaluate(() => ({ n: verite().length, nom: app.nom, att: !!FICHIERS.attente, erreur: !!FICHIERS.erreurs.retest, dit: ($('vf-retest').querySelector('.vf-attente') || {}).textContent || '', lignes: $('vf-retest').querySelectorAll('.vf-attente .vf-apercu tbody tr').length }));
  ok(R1.n === nEx && R1.nom === 'Contrat d’exemple' && R1.att && !R1.erreur && /J’ai compris/.test(R1.dit) && /Equipement\s→\sDe/.test(R1.dit) && /Cable\s→\sFil/.test(R1.dit) && R1.lignes === 3, 'des colonnes devinées : rien n’est remplacé ; la carte dit ce qu’elle a compris (Equipement → De, Cable → Fil…), avec l’aperçu, et attend « Charger »', R1.dit.slice(0, 150));
  await page.click('#fiche-corps [data-vf="corriger"]'); await page.waitForTimeout(300);
  await page.selectOption('#fiche-corps .vf-carte-cols select[data-colonne="2"]', ''); await page.waitForTimeout(300);
  ok(await page.evaluate(() => FICHIERS.attente.map.cable === '' && !/W-012/.test($('vf-retest').querySelector('.vf-attente .vf-apercu').textContent)), '« Corriger » : la colonne Cable ignorée, l’aperçu se refait sans le numéro de fil');
  await page.click('#fiche-corps [data-vf="charger"]'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => verite().length === 3 && app.nom === 'presque-retest.csv' && !FICHIERS.attente && !FICHIERS.erreurs.retest), '« Charger » : les trois liaisons deviennent le contrat, l’erreur d’avant s’efface');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(600);
  ok(await page.evaluate(n => verite().length === n && app.nom === 'Contrat d’exemple', nEx), 'Ctrl+Z rend l’exemple');
  // la base des contrats déjà faits : sans Harness, le dire (et proposer de l'ouvrir comme contrat) ; deux harness : rangée
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
  ok(await page.evaluate(n => verite().length === n + 2 && app.nom === 'Contrat d’exemple' && verite().some(l => l.cable === 'W-901' && l.plan === '1'), nC), '« Ajouter au contrat » : les deux liaisons s’ajoutent à l’exemple, qui n’est pas remplacé');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(600);
  ok(await page.evaluate(n => verite().length === n, nC), 'Ctrl+Z les retire');
  // le modèle CSV : les seize en-têtes et trois lignes, relus comme un retest ; le même fichier que modeles/
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.evaluate(() => telechargerModele('retest'))]);
  const modele = fs.readFileSync(await dl.path(), 'utf8'), modeleDepot = fs.readFileSync(path.join(__dirname, '..', 'modeles', 'modele-retest.csv'), 'utf8');
  const lu = await page.evaluate(t => { const r = lireTexte(t.replace(/^\ufeff/, '')); return { n: r.liaisons.length, format: r.format, colonnes: r.colonnes, entetes: t.split(/\r?\n/)[0].split(';').length }; }, modele);
  ok(dl.suggestedFilename() === 'modele-retest.csv' && modele === modeleDepot && lu.n === 3 && lu.format === 'retest' && lu.colonnes === 16 && lu.entetes === 16, '« Télécharger un modèle (CSV) » : seize en-têtes, trois lignes, relus comme un retest — le même fichier que modeles/modele-retest.csv', JSON.stringify(lu));
  ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
  console.log('\n  ' + (ko ? ko + ' échec(s)' : 'tout tient'));
  await nav.close(); process.exit(ko ? 1 : 0);
})();
