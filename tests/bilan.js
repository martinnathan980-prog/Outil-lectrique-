/* ===========================================================================
   LE BILAN ANONYME ET LE CARNET DE SÉANCE (v76) — ce qui part ne dit rien de confidentiel
   ---------------------------------------------------------------------------
       node tests/bilan.js [--fichier=…]

     1. l'exemple, rejoué comme un VRAI fichier (un CSV aux colonnes de l'installation, une colonne de trop, ouvert par
        `ouvrirFichier`) : le bilan dit son format, ses colonnes reconnues et celle qu'il ne connaît pas ;
     2. L'ANONYMAT : aucun repère, part number, numéro de câble, harness, dessin, ni le nom du fichier, nulle part dans le
        texte copié — y compris une erreur de page qui en nomme un, et une note du carnet qui en nomme un ;
     3. le carnet : C l'ouvre (l'écran où l'on est, sans nom), Entrée garde la note, Échap ferme sans rien fermer d'autre
        et rend le clavier ; la note survit au rechargement ; elle s'efface depuis le bilan ;
     4. le menu ⋮ › Plus porte « Carnet de séance » et « Bilan anonyme » ; la feuille des raccourcis dit C ;
     5. stockage refusé : le carnet le dit, l'outil continue.
   ========================================================================= */
const { chromium } = require('playwright');
const { fichierDemande } = require('./pilote');
const FICHIER = fichierDemande();
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage(); p.setDefaultTimeout(120000);
  const e = []; p.on('pageerror', x => { if (!/boom-essai/.test(x.message)) e.push(x.message); });
  const R = []; const ok = (n, c, d) => R.push((c ? '  ok   ' : '  KO   ') + n.padEnd(60) + (d || ''));

  await p.goto(FICHIER); await p.waitForTimeout(1500); await p.evaluate(() => atelier.exemple()); await p.waitForTimeout(2000);
  // 1. l'exemple comme un fichier : une colonne « Remarque client » que Volta ne connaît pas
  await p.evaluate(async () => { const V = verite(), H = ['Harness', 'Device1', 'Pin1', 'PN1', 'Device2', 'Pin2', 'PN2', 'Cable Tag', 'Cable TG', 'Route', 'FWD', 'Remarque client'];
    const L = [H.join(';'), ...V.map(l => [l.harness || 'H-ESSAI-01', l.de, l.borneDe, l.pnDe, l.vers, l.borneVers, l.pnVers, l.cable, l.type, l.route, l.plan, 'à voir'].join(';'))];
    await ouvrirFichier(new File([L.join('\n')], 'InstallationConfidentielle-42.csv', { type: 'text/csv' })); });
  await p.waitForTimeout(2500);
  // une erreur de page qui nomme un repère : le bilan la garde, masquée
  await p.evaluate(() => { const r = verite()[0].de; setTimeout(() => { throw new Error('boom-essai sur ' + r); }, 0); }); await p.waitForTimeout(300);
  const B = await p.evaluate(() => { const t = texteDuBilan(), V = verite(), noms = new Set();
    V.forEach(l => [l.de, l.vers, l.pnDe, l.pnVers, l.cable, l.harness, l.plan, l.fwd].forEach(v => { v = String(v || '').trim(); if (v.length >= 3) noms.add(v); }));
    noms.add('InstallationConfidentielle'); return { t, noms: noms.size, fuites: [...noms].filter(n => t.includes(n)) }; });
  ok('le bilan dit le format (installation, en-têtes ligne 1)', /format : installation \(en-têtes ligne 1\)/.test(B.t));
  ok('… les colonnes reconnues, chacune avec ce que Volta y lit', /colonnes reconnues \(11\)/.test(B.t) && /Device1 → équipement 1/.test(B.t) && /Cable TG → type de câble/.test(B.t));
  ok('… et la colonne qu’il ne connaît pas', /colonnes non reconnues \(1\) : « Remarque client »/.test(B.t));
  ok('… les liaisons, les folios, les contacts, le contrôle', /201 liaisons · 6 folios/.test(B.t) && /bouts à sertir/.test(B.t) && /LE CONTRÔLE\n- \d+ problème/.test(B.t));
  ok('une référence inconnue se dit par sa forme (A, 9)', /formes : [A9*\-]+ ×\d/.test(B.t));
  ok('ANONYMAT : aucun nom du plan dans le texte copié', B.fuites.length === 0, B.noms + ' noms vérifiés' + (B.fuites.length ? ' — FUITES : ' + B.fuites.slice(0, 5).join(', ') : ''));
  ok('l’erreur de page est gardée, son repère masqué', /boom-essai sur ‹repère›/.test(B.t));

  // 2 bis (v77). L'AUTOTEST : un parcours court (le premier folio, sans les listes), une erreur provoquée dans une fiche qui
  // nomme un repère — le bilan dit l'autotest, l'écran sans nom, le message masqué, la pile en fonctions de Volta
  const AT = await p.evaluate(async () => { const r = verite()[0].de, vieux = ficheBloc;
    ficheBloc = nom => { if (nom === r) throw new Error('piège-autotest sur ' + r); return vieux(nom); };
    await lancerAutotest({ listes: false, budget: 25000, bilan: false, sauter: ['dossierpdf', 'png'] }); ficheBloc = vieux;
    const t = texteDuBilan(), V = verite(), noms = new Set(); V.forEach(l => [l.de, l.vers, l.pnDe, l.pnVers, l.cable, l.harness, l.plan].forEach(v => { v = String(v || '').trim(); if (v.length >= 3) noms.add(v); }));
    const s = t.split('L’AUTOTEST')[1] || ''; return { s: s.split('LES ERREURS DE LA PAGE')[0], fuites: [...noms].filter(n => s.includes(n)), enCours: AUTOTEST.enCours, cible: !!app.cible }; });
  ok('l’autotest : sa section dans le bilan (durée, folios, fiches par genre)', /lancé le .* · \d/.test(AT.s) && /folio : \d+ en/.test(AT.s) && /équipement : \d+ en/.test(AT.s) && !AT.enCours, AT.s.slice(0, 160).replace(/\n/g, ' / '));
  ok('… l’erreur d’une fiche : l’écran sans nom, le message masqué', /fiche d’un .* — (fiche non rendue : )?piège-autotest sur ‹repère›/.test(AT.s), (AT.s.match(/.*piège.*/) || ['pas trouvée'])[0]);
  ok('… ANONYMAT : aucun nom du plan dans la section de l’autotest ; le plan rendu tel qu’il était', AT.fuites.length === 0 && !AT.cible, AT.fuites.slice(0, 3).join(', '));

  // 3. le carnet : C sur le plan, une note qui nomme un repère, Entrée
  await p.evaluate(() => { fermerFiche(true); deselectionner(); allerAuPlan(plans()[0]); if (document.activeElement) document.activeElement.blur(); }); await p.waitForTimeout(500);
  await p.keyboard.press('c'); await p.waitForTimeout(350);
  const C1 = await p.evaluate(() => ({ ouvert: carnetOuvert(), ou: $('cn-ou').textContent, focus: document.activeElement && document.activeElement.id }));
  ok('C ouvre le carnet, le clavier dans la note', C1.ouvert && C1.focus === 'cn-texte', JSON.stringify(C1));
  ok('… l’écran où l’on est, sans un nom (« plan · folio 1 / 6 »)', C1.ou === 'plan · folio 1 / 6', C1.ou);
  const rep = await p.evaluate(() => verite()[0].de);
  await p.keyboard.type('Je cherchais le calibre de ' + rep + ' trop longtemps'); await p.keyboard.press('Enter'); await p.waitForTimeout(350);
  const C2 = await p.evaluate(() => ({ ouvert: carnetOuvert(), n: lireCarnet().length, toast: $('toast').textContent }));
  ok('Entrée garde la note et ferme la barre', !C2.ouvert && C2.n === 1 && /Noté dans le carnet/.test(C2.toast), JSON.stringify(C2));
  // Échap : la barre se ferme, la fiche ouverte dessous reste, le clavier revient
  await p.evaluate(() => aller({ type: 'bloc', nom: verite()[0].de })); await p.waitForTimeout(700);
  await p.evaluate(() => { const b = document.querySelector('#inspecteur button'); if (b) b.focus(); });
  const avant = await p.evaluate(() => document.activeElement && document.activeElement.outerHTML.slice(0, 60));
  await p.keyboard.press('c'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const C3 = await p.evaluate(() => ({ ouvert: carnetOuvert(), fiche: !$('inspecteur').hidden, focus: document.activeElement && document.activeElement.outerHTML.slice(0, 60) }));
  ok('Échap ferme la barre, pas la fiche ; le clavier revient', !C3.ouvert && C3.fiche && C3.focus === avant, JSON.stringify(C3));

  // la note survit au rechargement ; dans le texte copié, son repère est masqué
  await p.reload(); await p.waitForTimeout(1500); await p.evaluate(() => atelier.exemple()); await p.waitForTimeout(1500);
  const C4 = await p.evaluate(r => { const t = texteDuBilan(); return { n: lireCarnet().length, carnet: /LE CARNET \(1 note\)/.test(t), masque: /trop longtemps/.test(t) && !t.includes(r) }; }, rep);
  ok('la note survit au rechargement et part avec le bilan', C4.n === 1 && C4.carnet, JSON.stringify(C4));
  ok('… le repère qu’elle nomme y est masqué', C4.masque);
  // le document : le texte tel qu'il partira, la note, l'effacer
  await p.evaluate(() => MENU.actions.bilan()); await p.waitForTimeout(600);
  const D = await p.evaluate(() => ({ mode: app.fiche && app.fiche.mode, pre: !!$('bl-texte'), notes: document.querySelectorAll('.bl-notes li').length, copier: $('bl-copier') && $('bl-copier').textContent }));
  ok('⋮ › Plus › Bilan anonyme : le texte, le carnet, « Copier »', D.mode === 'bilan' && D.pre && D.notes === 1 && /Copier le bilan et le carnet/.test(D.copier || ''), JSON.stringify(D));
  await p.click('.bl-n-x'); await p.waitForTimeout(400);
  ok('la poubelle efface la note', await p.evaluate(() => lireCarnet().length === 0 && !document.querySelector('.bl-notes')));

  // 4. le menu et la feuille des raccourcis
  const M = await p.evaluate(() => ({ plus: [...document.querySelectorAll('#mp-plus [data-act]')].map(b => b.dataset.act), carnetC: (document.querySelector('#mp-plus [data-act="carnet"] .raccourci') || {}).textContent }));
  ok('⋮ › Plus porte « Carnet de séance » (C), « Autotest du plan » et « Bilan anonyme »', M.plus.includes('carnet') && M.plus.includes('autotest') && M.plus.includes('bilan') && M.carnetC === 'C', M.plus.join(','));
  await p.evaluate(() => { fermerFiche(true); montrerRaccourcis(); }); await p.waitForTimeout(300);
  ok('la feuille des raccourcis dit C', await p.evaluate(() => /carnet de séance/i.test($('raccourcis').textContent)));

  // 5. stockage refusé
  const p3 = await (await b.newContext({ viewport: { width: 1200, height: 800 } })).newPage(); p3.on('pageerror', x => e.push(x.message));
  await p3.addInitScript(() => { Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('bloqué'); } }); });
  await p3.goto(FICHIER); await p3.waitForTimeout(1500); await p3.evaluate(() => atelier.exemple()); await p3.waitForTimeout(800);
  const S3 = await p3.evaluate(() => { ouvrirCarnet(); $('cn-texte').value = 'une note'; garderNote(); return { toast: $('toast').textContent, bilan: texteDuBilan().length > 200 }; });
  ok('stockage refusé : le carnet le dit, le bilan se fait', /n’a pas pu s’écrire/.test(S3.toast) && S3.bilan, S3.toast);

  R.forEach(x => console.log(x));
  const ko = R.filter(x => x.startsWith('  KO')).length;
  console.log('\n  ' + (R.length - ko) + ' / ' + R.length + (ko ? '  — ' + ko + ' PROBLÈME(S)' : '  — tout tient'));
  console.log('  erreurs :', e.length ? [...new Set(e)].slice(0, 3) : 'aucune');
  await b.close(); process.exit(ko ? 1 : 0);
})();
