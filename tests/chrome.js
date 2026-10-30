/* ===========================================================================
   LE CHROME ET LES GESTES COMMUNS (v73) — la barre du haut, le rail, la barre des folios, le menu ⋮, la feuille des
   raccourcis, le mot qui passe, défaire et refaire ; à la vraie souris et au clavier.
       node tests/chrome.js
     1. REFAIRE : Ctrl+Z défait, Ctrl+Y et Ctrl+Maj+Z refont (jamais ne défont) ; ↶ et ↷ du rail, éteints quand leur pile
        est vide ; le mot dit l'ÉTAT D'ARRIVÉE (« Défait : W-012 revient en DR20 ») et offre le geste inverse ; un geste
        neuf vide la pile à refaire ; un plan qu'on ouvre aussi ; la bulle de ↶ dit ce qu'il déferait ;
     2. LE RAIL SE DÉPLIE au survol prolongé (250 ms, pas avant), 44 → 176 px, chaque outil avec son mot et sa touche ; il
        se replie dès qu'on clique, dès qu'on le quitte ; au clavier il reste plié (la bulle dit tout) ; au téléphone, jamais ;
     3. LES COMPTES : la pastille = les problèmes rouges du plan, sa bulle « N problèmes · M à voir » ; sans problème rouge,
        ce qui est à voir en ambre ; P parcourt les problèmes (« Problème 1 / N ») puis ce qui est à voir (« À voir 1 / M ») ;
     4. LE RETEST CORRIGÉ : la pilule de la barre du haut paraît au premier changement (« 1 changement · Retest corrigé ») ;
        dans ⋮ › Exporter il est en tête, son compte dessous, séparé des formats de dessin ; un clic le sort ;
     5. LES BULLES : la première après 400 ms, la suivante tout de suite (chaude), au clavier tout de suite, éteinte au
        premier appui ; le clavier rendu au ⋮ par Échap ne la fait pas paraître ; la bulle de la marque ne tombe plus sur le
        rail ;
     6. LES MOUVEMENTS : le menu tombe de son bouton (200 ms, son origine au ⋮), son double s'efface en 120 ms (le vrai est
        fermé tout de suite) ; le mot qui passe entre en 340 ms et sort en 200 ms ; un bouton pressé s'enfonce de
        `--presse` ; sous le mouvement réduit, rien de tout cela ;
     7. LA FEUILLE DES RACCOURCIS dit refaire, Ctrl+K et les touches de la fiche ; Tab n'en sort plus ; sa croix a sa bulle.
   ========================================================================= */
const { chromium } = require('playwright');
const { fichierDemande } = require('./pilote');
const FICHIER = fichierDemande();
const R = [], ok = (n, c, d) => R.push((c ? '  ok   ' : '  KO   ') + n + (c || !d ? '' : '   ← ' + String(d).slice(0, 400)));
const attendre = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const erreurs = [];
  const ouvrir = async (o = {}) => { const page = await nav.newPage({ viewport: o.viewport || { width: 1440, height: 900 }, reducedMotion: o.reduit ? 'reduce' : 'no-preference', hasTouch: !!o.toucher });
    page.setDefaultTimeout(120000); page.on('pageerror', e => erreurs.push(e.message));
    await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined' && typeof BIB !== 'undefined' && BIB.pret, null, { timeout: 120000 });
    await page.evaluate(() => atelier.exempleSansCalibreAuto()); await page.waitForTimeout(700); await page.evaluate(() => allerAuPlan('1'));   // (v74 : W-012 reste en DR20 — le geste à défaire en a besoin) await page.waitForTimeout(500);
    await page.mouse.move(700, 600); return page; };
  const centre = (page, sel) => page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
  const survoler = async (page, sel) => { const c = await centre(page, sel); await page.mouse.move(c.x, c.y); };
  const W012 = page => page.evaluate(() => verite().find(l => l.cable === 'W-012').type);
  const changer = page => page.evaluate(() => { const l = verite().find(x => x.cable === 'W-012'); changerLiaison(l, 'type', 'DR12', 'type de W-012'); });
  const mot = page => page.evaluate(() => $('toast').classList.contains('on') ? $('toast').textContent : '');

  /* ---- 1. défaire, refaire ---- */
  { const page = await ouvrir();
    const e0 = await page.evaluate(() => ({ u: $('btnUndo').disabled, r: $('btnRedo').disabled }));
    ok('à l’ouverture, ↶ et ↷ sont éteints (rien à défaire ni à refaire)', e0.u && e0.r, JSON.stringify(e0));
    await changer(page); await page.waitForTimeout(150);
    // la bulle de ↶ : ce qu'il déferait, écrit quand elle paraît
    await survoler(page, '#btnUndo'); await page.waitForFunction(() => $('btnUndo').classList.contains('bulle-on'), null, { timeout: 5000 }).catch(() => {});
    const b = await page.evaluate(() => ({ on: $('btnUndo').classList.contains('bulle-on'), t: $('btnUndo').querySelector('.bulle').innerText }));
    ok('la bulle de ↶ dit ce qu’il déferait (« Défaire : W-012 en DR12 »)', b.on && /W-012 en DR12/.test(b.t), JSON.stringify(b));
    await page.mouse.move(700, 600); await page.keyboard.press('Control+z'); await page.waitForTimeout(250);
    const d = { type: await W012(page), mot: await mot(page), r: await page.evaluate(() => $('btnRedo').disabled), geste: await page.evaluate(() => ($('toast').querySelector('.toast-geste') || {}).textContent) };
    ok('Ctrl+Z défait ; le mot dit l’état d’arrivée (« Défait : W-012 revient en DR20 ») et offre « Refaire » ; ↷ s’allume', d.type === 'DR20' && /^Défait\s:\sW-012 revient en DR20\./.test(d.mot) && d.geste === 'Refaire' && d.r === false, JSON.stringify(d));
    await page.keyboard.press('Control+y'); await page.waitForTimeout(250);
    const y = { type: await W012(page), mot: await mot(page) };
    ok('Ctrl+Y refait (« Refait : W-012 passe en DR12 »)', y.type === 'DR12' && /^Refait\s:\sW-012 passe en DR12\./.test(y.mot), JSON.stringify(y));
    await page.keyboard.press('Control+z'); await page.waitForTimeout(150);
    const n0 = await page.evaluate(() => app.hist.length);
    await page.keyboard.press('Control+Shift+z'); await page.waitForTimeout(250);
    const z = { type: await W012(page), n: await page.evaluate(() => app.hist.length), mot: await mot(page) };
    ok('Ctrl+Maj+Z REFAIT — il ne défait jamais un second geste', z.type === 'DR12' && z.n === n0 + 1 && /^Refait/.test(z.mot), JSON.stringify({ ...z, n0 }));
    // ↶ et ↷ du rail, et le geste du mot qui passe
    await page.click('#btnUndo'); await page.waitForTimeout(250); const u1 = await W012(page);
    await page.click('#toast .toast-geste'); await page.waitForTimeout(250); const u2 = await W012(page);
    await page.click('#btnUndo'); await page.waitForTimeout(200); await page.click('#btnRedo'); await page.waitForTimeout(250); const u3 = await W012(page);
    ok('↶ du rail défait, « Refaire » du mot refait, ↷ du rail refait', u1 === 'DR20' && u2 === 'DR12' && u3 === 'DR12', [u1, u2, u3].join(' → '));
    // un geste neuf vide la pile à refaire
    await page.keyboard.press('Control+z'); await page.waitForTimeout(150);
    await page.evaluate(() => { const l = verite().find(x => x.cable === 'W-011'); changerLiaison(l, 'type', 'DR14', 'type de W-011'); }); await page.waitForTimeout(150);
    const neuf = await page.evaluate(() => ({ r: $('btnRedo').disabled, pile: pileRefaire().length })); await page.keyboard.press('Control+y'); await page.waitForTimeout(200);
    ok('un geste neuf vide la pile à refaire (↷ s’éteint, Ctrl+Y dit « Rien à refaire »)', neuf.r && !neuf.pile && /Rien à refaire/.test(await mot(page)), JSON.stringify(neuf));
    // le grand geste du disjoncteur : défait d'un coup, dit en une phrase (le disjoncteur d'abord, puis ses câbles)
    await page.evaluate(() => { deciderCalibre('102CB1'); }); await page.waitForTimeout(150); await page.keyboard.press('Control+z'); await page.waitForTimeout(250);
    const dj = await mot(page);
    ok('défaire « Passer en 15 A et grossir les câbles » : « 102CB1 revient à 10 A (MS3320-10) · W-…, W-… reviennent en … »', /^Défait\s:\s102CB1 revient à 10\sA \(MS3320-10\) · W-0\d\d.* reviennent en /.test(dj), dj);
    await page.evaluate(() => retenirCalibre('102CB1', 20)); await page.waitForTimeout(150); await page.keyboard.press('Control+z'); await page.waitForTimeout(250);
    const cal = await mot(page);
    ok('défaire un calibre retenu à la main : « 102CB1 revient au calibre automatique, 15 A » (plus « Annulé : … automatique »)', /^Défait\s:\s102CB1 revient au calibre automatique, 15\sA\./.test(cal), cal);
    // un plan qu'on ouvre : un historique neuf, une pile à refaire neuve
    await page.keyboard.press('Control+y'); await page.waitForTimeout(150); await page.keyboard.press('Control+z'); await page.waitForTimeout(150);
    await page.evaluate(() => { app.hist = []; synchroniserHistorique(); }); const vide = await page.evaluate(() => ({ r: $('btnRedo').disabled, u: $('btnUndo').disabled }));
    ok('un historique neuf (un plan qu’on ouvre) emporte la pile à refaire', vide.r && vide.u, JSON.stringify(vide));
    await page.close(); }

  /* ---- 2. le rail se déplie ---- */
  { const page = await ouvrir();
    const l0 = await page.evaluate(() => Math.round($('rail').getBoundingClientRect().width));
    await survoler(page, '#btnBase'); await page.waitForTimeout(120);
    const tot = await page.evaluate(() => $('rail').classList.contains('deplie'));
    await page.waitForTimeout(450);
    const D = await page.evaluate(() => { const r = $('rail'), mots = [...r.querySelectorAll('.rd-mot')].map(m => ({ t: m.textContent, vu: m.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && m.getBoundingClientRect().right <= r.getBoundingClientRect().right + 1 }));
      return { deplie: r.classList.contains('deplie'), l: Math.round(r.getBoundingClientRect().width), mots: mots.filter(m => m.vu).map(m => m.t), touches: [...r.querySelectorAll('.rd-touche')].map(k => k.textContent).join(' '), bulle: $('btnBase').classList.contains('bulle-on') && $('btnBase').querySelector('.bulle-detail').checkVisibility(), haut: Math.round(r.getBoundingClientRect().top) }; });
    ok('le rail, à un jeu sous la barre du haut (62 px), 44 px plié', D.haut === 62 && l0 === 44, JSON.stringify({ haut: D.haut, l0 }));
    ok('à 120 ms de survol, rien ; à 570 ms, déplié en 176 px : chaque outil avec son mot et sa touche, la bulle dit ce qu’il fait', !tot && D.deplie && D.l === 176 && D.mots.length === 7 && D.mots.includes('Ajouter une liaison') && D.mots.includes('Refaire') && /B R \/ Ctrl Z Ctrl Y/.test(D.touches) && D.bulle, JSON.stringify(D));
    await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(300);
    const C = await page.evaluate(() => ({ deplie: $('rail').classList.contains('deplie'), recap: app.base.ouvert }));
    await page.waitForTimeout(500); const C2 = await page.evaluate(() => $('rail').classList.contains('deplie'));
    ok('un clic replie le rail (et fait son geste) ; la main restée dessus ne le rouvre pas', !C.deplie && C.recap && !C2, JSON.stringify({ ...C, C2 }));
    await page.mouse.move(700, 600); await page.keyboard.press('b'); await page.waitForTimeout(200);
    await survoler(page, '#btnCherche'); await page.waitForTimeout(500); await page.mouse.move(700, 600); await page.waitForTimeout(300);
    ok('quitter le rail le replie', await page.evaluate(() => !$('rail').classList.contains('deplie')));
    await page.keyboard.press('Shift'); await page.evaluate(() => $('btnIndex').focus()); await page.waitForTimeout(80);
    const K = await page.evaluate(() => ({ deplie: $('rail').classList.contains('deplie'), bulle: $('btnIndex').classList.contains('bulle-on'), t: $('btnIndex').querySelector('.bulle').innerText.replace(/\s+/g, ' ') }));
    await page.evaluate(() => $('btnIndex').blur());
    ok('au clavier, le rail reste plié ; la bulle paraît tout de suite : le nom, la touche et l’état (« Repères et problèmes R · 5 problèmes · 9 à voir »)', !K.deplie && K.bulle && /Repères et problèmes R \d+\sproblèmes · \d+\sà voir/.test(K.t), JSON.stringify(K));
    // les nouvelles icônes : une liaison (deux bornes reliées, un plus), la bible (le symbole de la barrette)
    const I = await page.evaluate(() => ({ liaison: $('btnLiaison').querySelectorAll('svg circle').length, bible: !!$('btnBible').querySelector('svg rect') && $('btnBible').querySelectorAll('svg circle').length }));
    ok('les icônes : « Ajouter une liaison » deux bornes reliées et un plus, « Bible » la barrette (trois contacts)', I.liaison === 2 && I.bible === 3, JSON.stringify(I));
    await page.close(); }
  { const page = await ouvrir({ viewport: { width: 390, height: 844 }, toucher: true });
    await page.tap('#btnBase').catch(() => {}); await page.waitForTimeout(500);
    ok('au téléphone, le rail ne se déplie jamais (il est en bas) et ses mots ne se montrent pas', await page.evaluate(() => !$('rail').classList.contains('deplie') && [...document.querySelectorAll('.rd-mot')].every(m => !m.checkVisibility())));
    await page.close(); }

  /* ---- 3. les comptes ---- */
  { const page = await ouvrir();
    const P = await page.evaluate(() => { const xs = CONTROLE.items, ko = xs.filter(x => x.niveau === 'ko').length, p = $('btnIndex').querySelector('.rd-point');
      return { ko, att: xs.length - ko, txt: p.textContent, cls: p.className, label: $('btnIndex').getAttribute('aria-label'), detail: $('bulle-index-detail').textContent }; });
    ok('la pastille = les problèmes rouges du plan ; son nom et sa bulle disent « N problèmes · M à voir »', P.txt === String(P.ko) && /\bko\b/.test(P.cls) && new RegExp(P.ko + '\\sproblèmes · ' + P.att + '\\sà voir').test(P.label) && new RegExp('^Repères et problèmes · ' + P.ko + '\\sproblèmes · ' + P.att + '\\sà voir$').test(P.detail), JSON.stringify(P));
    const ko = P.ko, mots = [];
    await page.evaluate(() => { CONTROLE.pas = null; });
    for (let i = 0; i < ko + 1; i++) { await page.keyboard.press('p'); await page.waitForTimeout(350); mots.push(await page.evaluate(() => $('toast').textContent)); }
    ok('P parcourt d’abord les problèmes (« Problème 1 / N » … « N / N »), puis ce qui est à voir (« À voir 1 / M »)', mots[0].startsWith('Problème 1 / ' + ko + ' ·') && mots[ko - 1].startsWith('Problème ' + ko + ' / ' + ko + ' ·') && mots[ko].startsWith('À voir 1 / ' + P.att + ' ·'), mots.join(' | '));
    await page.keyboard.press('Shift+P'); await page.waitForTimeout(350);
    ok('Maj+P revient au dernier problème', (await page.evaluate(() => $('toast').textContent)).startsWith('Problème ' + ko + ' / ' + ko));
    const att = await page.evaluate(() => libelleProblemes());
    ok('l’attente d’un folio les compte de même (« Les 5 problèmes · 9 à voir »)', new RegExp('^Les ' + ko + '\\sproblèmes · ' + P.att + '\\sà voir$').test(att), att);
    await page.close(); }

  /* ---- 4. le retest corrigé ---- */
  { const page = await ouvrir();
    const p0 = await page.evaluate(() => $('btnRetest').hidden);
    await changer(page); await page.waitForTimeout(200);
    const p1 = await page.evaluate(() => ({ vu: !$('btnRetest').hidden, t: $('btnRetest').innerText.replace(/\s+/g, ' ').trim(), ent: $('btnRetest').classList.contains('entre-v') }));
    ok('la pilule du retest corrigé paraît au premier changement (« 1 changement · Retest corrigé »), absente avant', p0 && p1.vu && /1\schangement/.test(p1.t) && /Retest corrigé/.test(p1.t) && p1.ent, JSON.stringify({ p0, ...p1 }));
    await page.click('#btnMenu'); await page.click('#menu [data-sous="exporter"]'); await page.waitForTimeout(300);
    const M = await page.evaluate(() => { const p = $('mp-exporter'), b = [...p.querySelectorAll('button[role="menuitem"]:not([data-retour])')], g = b[0].closest('.menu-bloc');
      return { premier: b[0].dataset.act, compte: $('mn-retest').textContent, seul: g.querySelectorAll('button').length === 1, filet: getComputedStyle(g.nextElementSibling).borderTopStyle, focus: document.activeElement.dataset.act, sous: $('mn-exporter').textContent }; });
    ok('⋮ › Exporter : le retest corrigé en PREMIÈRE ligne, son compte dessous (« 1 liaison modifiée »), seul dans son groupe, un filet avant le dessin', M.premier === 'retestcorrige' && /^1\sliaison modifiée$/.test(M.compte) && M.seul && M.filet === 'solid' && M.focus === 'retestcorrige', JSON.stringify(M));
    ok('la ligne Exporter du menu le dit en petit (« le retest corrigé · 1 changement »)', /le retest corrigé · 1\schangement/.test(M.sous), M.sous);
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    let sorti = false; page.once('download', () => { sorti = true; });
    await page.click('#btnRetest'); await page.waitForTimeout(1500);
    const rel = await page.evaluate(() => !!document.querySelector('#releve, .releve, [data-releve]') || !!(app.fiche && /retest|releve/i.test(app.fiche.mode || '')));
    ok('un clic sur la pilule sort le retest corrigé (ou ouvre son relevé)', sorti || rel, JSON.stringify({ sorti, rel }));
    await page.evaluate(() => { const l = verite().find(x => x.cable === 'W-012'); rendreChamp(l, 'type'); }); await page.waitForTimeout(200);
    ok('plus aucun changement : la pilule s’en va', await page.evaluate(() => $('btnRetest').hidden));
    await page.close(); }

  /* ---- 5. les bulles ---- */
  { const page = await ouvrir();
    await survoler(page, '#btnMenu'); await page.waitForTimeout(200); const a = await page.evaluate(() => $('btnMenu').classList.contains('bulle-on'));
    await page.waitForTimeout(350); const b = await page.evaluate(() => $('btnMenu').classList.contains('bulle-on'));
    ok('la première bulle attend 400 ms (rien à 200 ms, là à 550 ms)', !a && b, JSON.stringify({ a, b }));
    await survoler(page, '#zfit'); await page.waitForTimeout(60);
    ok('la suivante paraît tout de suite (la bulle chaude)', await page.evaluate(() => $('zfit').classList.contains('bulle-on') && !$('btnMenu').classList.contains('bulle-on')));
    await page.mouse.down(); await page.waitForTimeout(40); const appui = await page.evaluate(() => $('zfit').classList.contains('bulle-on')); await page.mouse.up(); await page.waitForTimeout(600);
    ok('un appui l’éteint ; elle se tait tant que la main reste sur le bouton', !appui && await page.evaluate(() => !$('zfit').classList.contains('bulle-on')));
    await page.mouse.move(700, 600); await page.waitForTimeout(1500);
    await survoler(page, '#en-biblio'); await page.waitForTimeout(600);
    const V = await page.evaluate(() => { const b = document.querySelector('#en-biblio .bulle').getBoundingClientRect(), r = $('rail').getBoundingClientRect(); return { on: $('en-biblio').classList.contains('bulle-on'), g: Math.round(b.left), r: Math.round(r.right), bas: Math.round(b.bottom), haut: Math.round(r.top) }; });
    ok('la bulle « Bibliothèque » de la marque ne tombe plus sur le rail (à sa droite)', V.on && V.g > V.r, JSON.stringify(V));
    const M = await page.evaluate(() => { const m = $('en-biblio').querySelector('.en-marque').getBoundingClientRect(), r = $('rail').getBoundingClientRect(); return { m: m.left + m.width / 2, r: r.left + r.width / 2 }; });
    ok('la marque se centre sur la colonne du rail', Math.abs(M.m - M.r) <= 1, JSON.stringify(M));
    await page.mouse.move(700, 600); await page.waitForTimeout(1500);
    await page.keyboard.press('Shift'); await page.evaluate(() => $('zin').focus()); await page.waitForTimeout(60);
    ok('au clavier, la bulle paraît tout de suite', await page.evaluate(() => $('zin').classList.contains('bulle-on')));
    await page.evaluate(() => document.activeElement.blur());
    await page.click('#btnMenu'); await page.waitForTimeout(200); await page.keyboard.press('Escape'); await page.waitForTimeout(250);
    ok('Échap rend le clavier au ⋮ sans faire paraître sa bulle (elle couvrait la croix d’un document)', await page.evaluate(() => document.activeElement === $('btnMenu') && !$('btnMenu').classList.contains('bulle-on')));
    await page.close(); }

  /* ---- 6. les mouvements ---- */
  { const page = await ouvrir();
    await page.click('#btnMenu'); const T = await page.evaluate(() => { const a = $('menu').getAnimations().find(x => x.animationName === 'menu-tombe'), cs = getComputedStyle($('menu')); return { nom: a && a.animationName, d: a && a.effect.getComputedTiming().duration, origine: cs.transformOrigin }; });
    ok('le menu TOMBE de son bouton : 200 ms, son origine sur le ⋮', T.nom === 'menu-tombe' && T.d === 200 && /^262px -26px/.test(T.origine), JSON.stringify(T));
    await page.waitForTimeout(300); await page.mouse.click(700, 600); await page.waitForTimeout(10);
    const F = await page.evaluate(() => { const d = document.querySelector('.menu-part'), a = d && d.getAnimations()[0]; return { cache: $('menu').hidden, double: !!d, sansId: d && !d.querySelector('[id]') && !d.id, inerte: d && d.inert && d.getAttribute('aria-hidden') === 'true', d: a && a.effect.getComputedTiming().duration }; });
    await page.waitForTimeout(400); const F2 = await page.evaluate(() => !document.querySelector('.menu-part'));
    ok('il se ferme tout de suite ; son double (sans identifiants, inerte) s’efface en 120 ms, puis s’en va', F.cache && F.double && F.sansId && F.inerte && F.d === 120 && F2, JSON.stringify({ ...F, F2 }));
    const S = await page.evaluate(() => { dire('Un mot.'); const t = $('toast'), on = getComputedStyle(t).transitionDuration; t.classList.remove('on'); const off = getComputedStyle(t).transitionDuration; return { on, off }; });
    ok('le mot qui passe entre en 340 ms et sort en 200 ms', /^0\.34s/.test(S.on) && /^0\.2s/.test(S.off), JSON.stringify(S));
    const D = await page.evaluate(() => [dureeDuMot('Un mot court.'), dureeDuMot('Le retest corrigé est enregistré : 201 liaisons, 1 liaison modifiée (1 case commentée, la feuille Modifications les liste).'), dureeDuMot('x', true)]);
    ok('un mot long reste plus longtemps (2,8 s une ligne, jusqu’à 6 s ; 8 s avec un geste)', D[0] === 2800 && D[1] > 5000 && D[1] <= 6000 && D[2] === 8000, D.join(' · '));
    await survoler(page, '#btnBase'); await page.mouse.down(); await page.waitForTimeout(150);
    const P = await page.evaluate(() => getComputedStyle($('btnBase')).transform); await page.mouse.up();
    ok('un bouton pressé s’enfonce de --presse (.97)', /matrix\(0\.97, 0, 0, 0\.97/.test(P), P);
    await page.close(); }
  { const page = await ouvrir({ reduit: true });
    await page.click('#btnMenu'); await page.waitForTimeout(200); await page.mouse.click(700, 600); await page.waitForTimeout(20);
    ok('sous le mouvement réduit, le menu n’a pas de double qui s’efface', await page.evaluate(() => !document.querySelector('.menu-part') && $('menu').hidden));
    await page.close(); }

  /* ---- 7. la feuille des raccourcis ---- */
  { const page = await ouvrir();
    await page.keyboard.press('?'); await page.waitForTimeout(500);
    const K = await page.evaluate(() => { const t = $('raccourcis').innerText; return { refaire: /Refaire/.test(t) && /Ctrl\s*Y/.test(t), palette: /Ctrl\s*K/.test(t), fiche: /Dans une fiche/.test(t) && /cadran/.test(t), bulle: !!$('rk-fermer').querySelector('.bulle'), entre: $('raccourcis').querySelector('.rk-feuille').classList.contains('entre-v') }; });
    ok('la feuille dit refaire (Ctrl+Y, Ctrl+Maj+Z), la palette (Ctrl+K), les touches de la fiche et du cadran ; elle se pose par la règle d’entrée commune', K.refaire && K.palette && K.fiche && K.bulle && K.entre, JSON.stringify(K));
    const ici = []; for (let i = 0; i < 6; i++) { await page.keyboard.press(i % 2 ? 'Shift+Tab' : 'Tab'); ici.push(await page.evaluate(() => !!document.activeElement.closest('.rk-feuille'))); }
    await page.evaluate(() => document.activeElement.blur()); await page.keyboard.press('Tab'); ici.push(await page.evaluate(() => !!document.activeElement.closest('.rk-feuille')));
    ok('Tab ne sort plus de la feuille (d’où que parte le clavier)', ici.every(Boolean), ici.join(' '));
    await page.waitForTimeout(100); ok('sa croix dit sa touche au clavier (« Fermer · Échap »)', await page.evaluate(() => $('rk-fermer').classList.contains('bulle-on') && /Fermer\s*Échap/.test($('rk-fermer').querySelector('.bulle').innerText)));
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    ok('Échap la ferme', await page.evaluate(() => !raccourcisOuverts()));
    await page.close(); }

  R.forEach(x => console.log(x));
  const ko = R.filter(x => x.startsWith('  KO')).length;
  console.log('\n  erreurs de page :', erreurs.length ? [...new Set(erreurs)].slice(0, 3).join(' | ') : 'aucune');
  console.log('  ' + (R.length - ko) + ' / ' + R.length + ' contrôles passés' + (ko ? ' — ' + ko + ' échec(s)' : ' — tout tient'));
  await nav.close(); process.exit(ko || erreurs.length ? 1 : 0);
})();
