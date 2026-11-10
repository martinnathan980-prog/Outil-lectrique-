/* ===========================================================================
   LA REVUE (08-revue, v88) — le fil conducteur : les points à régler, un par un.

   Le lecteur : « Pas de fil conducteur : il faut le faire. » La batterie joue la revue sur le plan d'exemple :

     1. elle se propose (le panneau Repères, la touche V) et s'ouvre en bande sous la barre du haut : « Revue 1 / N », le
        point en une phrase, son geste — le plan et les fiches commencent dessous ;
     2. P passe au suivant, Maj+P revient ; le compte est celui de partout (« à régler ») ;
     3. Entrée fait le geste : un câble passe à la gauge proposée, le point s'en va, la revue avance seule ;
     4. « Écrire la consommation de … » met le curseur dans le champ : une valeur, Entrée, le point est réglé ;
     5. à la fin : ce qui est réglé, ce qui est passé, « Relire ce qui part » — l'Excel corrigé ;
     6. × (ou Échap, tout fermé) la quitte : la bande s'en va, la barre du haut retrouve sa place ;
     7. un fichier ouvert qui a des points à régler la propose dans son message.

       node tests/revue.js            (Playwright : NODE_PATH=$(npm root -g))
   Rend 1 au premier échec.
   =========================================================================== */
const { chromium } = require('playwright');
const path = require('path');
const PAGE = 'file://' + path.resolve(__dirname, '..', 'index.html');

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  let ko = 0; const ok = (nom, c, detail) => { if (!c) ko++; console.log('  ' + (c ? 'ok ' : 'KO ') + ' ' + nom + (detail ? '   ' + detail : '')); };
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } }), page = await ctx.newPage(); page.setDefaultTimeout(60000);
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  await page.goto(PAGE); await page.waitForFunction(() => typeof BIB !== 'undefined' && BIB.pret); await page.evaluate(() => atelier.exemple()); await page.waitForTimeout(2600);
  const bande = () => page.evaluate(() => { const r = $('revue'), a = document.activeElement, c = compteARegler();
    return { on: REVUE.on, vue: !!r && !r.hidden, texte: r ? r.innerText.replace(/\s+/g, ' ').trim() : '', classe: document.documentElement.classList.contains('en-revue'), entete: getComputedStyle(document.documentElement).getPropertyValue('--entete').trim(),
      haut: r && !r.hidden ? Math.round(r.getBoundingClientRect().top) : -1, clavier: a ? a.tagName + (a.dataset && a.dataset.revue ? ':' + a.dataset.revue : a.className ? '.' + String(a.className).split(' ')[0] : '') : '', regler: c.regler, voir: c.voir,
      cible: app.cible ? (app.cible.nom || app.cible.type) : '', fiche: !$('inspecteur').hidden, sousLaBande: (() => { const i = $('inspecteur'); return !i.hidden && r && !r.hidden ? Math.round(i.getBoundingClientRect().top - r.getBoundingClientRect().bottom) : null; })() }; });
  const attendre = ms => page.waitForTimeout(ms);

  /* ---- 1. elle se propose, elle s'ouvre -------------------------------------------------------------------------- */
  console.log('\n1. la revue se propose et s’ouvre en bande, sous la barre du haut');
  await page.click('#btnIndex'); await attendre(400);
  const I = await page.evaluate(() => { const b = document.querySelector('#ix-revue'); return b ? b.textContent.replace(/\s+/g, ' ').trim() : ''; });
  ok('le panneau Repères la propose : « Commencer la revue », sa touche V', /^Commencer la revue\s?V$/.test(I), I);
  await page.keyboard.press('Escape'); await attendre(200);
  const A0 = await bande(); await page.keyboard.press('v'); await attendre(800); const A = await bande();
  ok('V l’ouvre : « Revue 1 / N » (N : ce qui est à régler, le compte de partout), le premier point, sa fiche ouverte', A.on && A.vue && new RegExp('^REVUE 1 / ' + A.regler + ' ').test(A.texte) && A.fiche && !!A.cible, A.texte.slice(0, 120) + ' · ' + A.regler + ' à régler');
  ok('la bande est sous la barre du haut (à 52 px), et tout commence dessous : --entete passe de 52 à 96 px, la fiche ne la touche pas', !A0.classe && A0.entete === '52px' && A.classe && A.entete === '96px' && A.haut === 52 && A.sousLaBande >= 0, JSON.stringify({ haut: A.haut, entete: A.entete, ecart: A.sousLaBande }));
  ok('le clavier est sur son geste (ou « Passer » quand le point n’a pas de geste) : Entrée, P répondent', /^BUTTON:(geste|passer)$/.test(A.clavier), A.clavier);

  /* ---- 2. P, Maj+P ---------------------------------------------------------------------------------------------- */
  console.log('\n2. P passe au suivant, Maj+P revient');
  await page.keyboard.press('p'); await attendre(700); const B = await bande();
  await page.keyboard.press('Shift+P'); await attendre(700); const B2 = await bande();
  ok('P : « Revue 2 / N », un autre point ; Maj+P : de retour au premier', new RegExp('^REVUE 2 / ' + A.regler + ' ').test(B.texte) && B.texte !== A.texte && B2.texte === A.texte, B.texte.slice(0, 90));

  /* ---- 3. Entrée fait le geste ----------------------------------------------------------------------------------- */
  console.log('\n3. Entrée fait le geste : le point s’en va, la revue avance');
  for (let i = 0; i < 12 && !/Passer en DR\d+ ⏎/.test((await bande()).texte); i++) { await page.keyboard.press('p'); await attendre(450); }
  const C0 = await bande(), geste = (/Passer en (DR\d+)/.exec(C0.texte) || [])[1];
  await page.keyboard.press('Enter'); await attendre(350); const C1 = await bande(); await attendre(1300); const C2 = await bande();
  ok('sur un câble mal protégé, le geste est celui de sa fiche (« Passer en DR.. ») ; Entrée le fait : un point à régler de moins', !!geste && C1.regler === C0.regler - 1, (geste || 'aucun geste') + ' · ' + C0.regler + ' → ' + C1.regler);
  ok('la bande dit « Réglé », puis passe seule au point suivant, son geste sous le clavier', /^REVUE Réglé/.test(C1.texte) && /^REVUE \d+ \/ \d+ /.test(C2.texte) && C2.texte !== C0.texte && /^BUTTON:(geste|passer)$/.test(C2.clavier), C1.texte + ' → ' + C2.texte.slice(0, 70));
  await page.keyboard.press('Control+z'); await attendre(900); const C3 = await bande();
  ok('« Défaire » rend le point : il est de nouveau à régler, la revue continue', C3.regler === C0.regler && C3.on && C3.vue, C3.regler + ' à régler');

  /* ---- 4. écrire une consommation -------------------------------------------------------------------------------- */
  console.log('\n4. « Écrire la consommation de … » : le curseur dans le champ, une valeur, Entrée');
  await page.evaluate(() => { quitterLaRevue(); commencerLaRevue(); }); await attendre(700);
  for (let i = 0; i < 12 && !/Écrire la consommation de \S+ ⏎/.test((await bande()).texte); i++) { await page.keyboard.press('p'); await attendre(450); }
  const D0 = await bande(); await page.keyboard.press('Enter'); await attendre(900); const D1 = await bande();
  ok('Entrée ouvre sa fiche à « Ce qu’il consomme », le curseur dans « Permanent »', /Écrire la consommation de/.test(D0.texte) && D1.clavier === 'INPUT.fc-in', D1.clavier);
  await page.keyboard.type('0,4'); await page.keyboard.press('Enter'); await attendre(1700); const D2 = await bande();
  ok('0,4 A, Entrée : la consommation est écrite, le point est réglé, la revue est au suivant', D2.regler === D0.regler - 1 && D2.on && /^REVUE \d+ \/ \d+ /.test(D2.texte) && D2.texte !== D0.texte, D0.regler + ' → ' + D2.regler + ' · ' + D2.texte.slice(0, 70));

  /* ---- 5. la fin ------------------------------------------------------------------------------------------------- */
  console.log('\n5. la fin : ce qui est réglé, ce qui est passé, « Relire ce qui part »');
  for (let i = 0; i < 16 && !(await page.evaluate(() => REVUE.fin)); i++) { await page.keyboard.press('p'); await attendre(350); }
  await attendre(300); const F = await bande();
  ok('« Revue faite » : N réglés · M passés ; « Reprendre les passés », « Voir les points à voir », « Relire ce qui part ⏎ »', /^REVUE Revue faite \d+ réglés? · \d+ passés? Reprendre .* Voir .* Relire ce qui part ⏎/.test(F.texte), F.texte);
  await page.click('#revue [data-revue="voir"]'); await attendre(700); const V1 = await bande();
  ok('« Voir les points à voir » continue la revue par eux : « À voir 1 / M », sans geste — « Suivant »', new RegExp('^À VOIR 1 / ' + F.voir + ' ').test(V1.texte) && /Suivant P/.test(V1.texte) && !/⏎/.test(V1.texte), V1.texte.slice(0, 110));
  for (let i = 0; i < 6 && !(await page.evaluate(() => REVUE.fin)); i++) { await page.keyboard.press('p'); await attendre(350); }
  await page.keyboard.press('Enter'); await attendre(900);
  const R = await page.evaluate(() => ({ revue: REVUE.on, mode: app.fiche && app.fiche.mode, titre: (document.querySelector('#fiche .titre') || {}).textContent || '', classe: document.documentElement.classList.contains('en-revue') }));
  ok('à la fin, Entrée ouvre « Ce qui part dans l’Excel » et la revue se retire', !R.revue && !R.classe && /Ce qui part dans l’Excel/.test(R.titre), JSON.stringify(R));

  /* ---- 6. la quitter --------------------------------------------------------------------------------------------- */
  console.log('\n6. × la quitte : la bande s’en va, la barre du haut retrouve sa place');
  await page.keyboard.press('Escape'); await attendre(300); await page.keyboard.press('v'); await attendre(700); const Q0 = await bande();
  await page.click('#revue [data-revue="quitter"]'); await attendre(400); const Q1 = await bande();
  ok('la bande disparaît, --entete revient à 52 px', Q0.on && !Q1.on && !Q1.vue && !Q1.classe && Q1.entete === '52px', JSON.stringify({ entete: Q1.entete }));
  await page.keyboard.press('v'); await attendre(600); for (let i = 0; i < 4; i++) { await page.keyboard.press('Escape'); await attendre(250); } const Q2 = await bande();
  ok('Échap ferme d’abord la fiche, puis — plus rien d’ouvert — quitte la revue', !Q2.on && !Q2.fiche, JSON.stringify({ on: Q2.on, fiche: Q2.fiche }));

  /* ---- 7. un fichier ouvert la propose ---------------------------------------------------------------------------- */
  console.log('\n7. un fichier ouvert, des points à régler : son message propose la revue');
  const csv = await page.evaluate(() => { const E = contratExemple(), en = 'Harness;Device1;Pin1;PN1;Cable TG;Cable Tag;Route;Device2;Pin2;PN2';
    return [en, ...E.filter(l => l.plan === '1').map(l => ['H-1', l.de, l.borneDe, l.pnDe, l.type, l.cable, l.route, l.vers, l.borneVers, l.pnVers].join(';'))].join('\n'); });
  await page.setInputFiles('#fichier', { name: 'folio-1.csv', mimeType: 'text/csv', buffer: Buffer.from(csv, 'utf8') }); await attendre(2500);
  const T = await page.evaluate(() => ({ toast: $('toast').textContent, geste: ($('toast').querySelector('.toast-geste') || {}).textContent || '', regler: compteARegler().regler }));
  ok('« VOLTA a lu N liaisons… » et son geste, « Commencer la revue »', /VOLTA a lu \d+ liaisons/.test(T.toast) && T.geste === 'Commencer la revue' && T.regler > 0, T.toast.slice(0, 90) + ' · ' + T.geste);
  await page.click('#toast .toast-geste'); await attendre(800); const T2 = await bande();
  ok('un clic : la revue commence sur ce plan', T2.on && new RegExp('^REVUE 1 / ' + T.regler + ' ').test(T2.texte), T2.texte.slice(0, 80));

  console.log('\nBILAN');
  ok('aucune erreur dans la page', !erreurs.length, erreurs.slice(0, 3).join(' | ') || 'aucune');
  await nav.close();
  console.log(ko ? `\n  ${ko} ÉCHEC(S)` : '\n  tout est vert'); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
