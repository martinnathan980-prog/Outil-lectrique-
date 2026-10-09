/* ===========================================================================
   FICHE — ce qu'on voit quand on clique un bloc ou un fil (08 bis, 08 ter).
       NODE_PATH=/opt/node22/lib/node_modules node tests/fiche.js [--fichier=chemin]

   Sur l'exemple embarqué, la fiche de chaque sorte de bloc dit les choses
   dans l'ordre voulu, et rien d'autre :
     · l'EN-TÊTE : le repère, la ligne de nature (« équipement · 23 fils ·
       3 connecteurs · EN4165-2M »), puis l'état — seulement s'il y a
       quelque chose à reprendre ;
     · le RÉSUMÉ en tuiles : un connecteur par tuile (une tuile ouvre son
       onglet), les potentiels, les fils et ce qui reste libre d'une
       barrette, les deux côtés d'une prise ;
     · la RÉFÉRENCE et « Changer », puis la FACE, un dessin à plat : ni
       biseau, ni ombre, ni empilement ; autant de contacts pleins que de
       fils ; les groupes qui portent un potentiel teintés ; une légende,
       une fois par fiche ; une forme par famille (rectangle ASNE 0599,
       bouts ronds NSA937901, module carré EN 4165, insert circulaire) ;
     · AUTOUR (à sertir, toron, raccord) avant LES FILS, une ligne chacun ;
     · la fiche d'un FIL : ses deux bouts, puis les faits dans un cadre ;
     · à la VRAIE souris : un clic sur une puce (raccord, sexe) ou une variante
       écrit au contrat ET refait la fiche, la puce pressée gardant le focus
       (un bouton cliqué prend le focus : la fiche ne doit pas s'en servir
       pour refuser de se redessiner) ; une variante n'ouvre pas une
       comparaison ;
     · l'état dit les problèmes ET les points à voir ; les onglets d'un
       équipement sont ses tuiles (une seule rangée).
   Rend 1 au premier échec.
   =========================================================================== */
const { chromium } = require('playwright');
const P = require('./pilote');
const FICHIER = P.fichierDemande();

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await nav.newPage({ viewport: { width: 1600, height: 950 } }); page.setDefaultTimeout(300000);
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  let ko = 0; const ok = (c, nom, detail) => { if (!c) ko++; console.log('  ' + (c ? 'ok ' : 'KO ') + ' ' + nom + (detail ? '   ' + detail : '')); };
  await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined');
  const bloc = (plan, nom) => page.evaluate(([plan, nom]) => { allerAuPlan(plan); const c = app.dessin.comps.find(k => k.name === nom && k.kind !== 'tag'); if (c) choisirBloc(c); else choisirBarretteAPoser(barretteAPoser(nom)); }, [plan, nom]);
  const q = (sel, fn) => page.evaluate(([sel, fn]) => { const xs = [...document.querySelectorAll('#ba-equip ' + sel)]; return new Function('xs', 'return (' + fn + ')(xs)')(xs); }, [sel, fn || 'xs => xs.length']);
  const texte = sel => page.evaluate(sel => { const e = document.querySelector('#ba-equip ' + sel); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
  // la face est à plat : rien de ce qui faisait le relief, et toujours un corps
  const faceAPlat = async ou => { const n = await q(ou + ' .mj .mj-flanc, ' + ou + ' .mj .mj-ombre, ' + ou + ' .mj .mj-fut'), c = await q(ou + ' .mj .mj-corps'); return n === 0 && c > 0; };

  console.log('\nun équipement à trois connecteurs (300XC1, folio 3)');
  await bloc('3', '300XC1'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const f = document.querySelector('#ba-equip'), xs = [...f.children].slice(0, 3).map(e => e.className.split(' ')[0]); return xs[0] === 'fi-tete' && xs[1] === 'fi-ligne' && xs[2] === 'fi-etat'; }), 'l’en-tête : le repère, la ligne de nature, puis l’état');
  ok(/^équipement · 23 fils · 3 connecteurs · EN4165-2M$/.test(await texte('.fi-sous')), 'la ligne de nature : « équipement · 23 fils · 3 connecteurs · EN4165-2M »', await texte('.fi-sous'));
  ok(await q('.fi-tuiles .fi-tuile[data-onglet-vers]') === 3 && /A.*11 contacts.*Ø/.test(await texte('.fi-tuiles')), 'le résumé : une tuile par connecteur, ses contacts, son toron, son raccord', await texte('.fi-tuiles'));
  ok(await q('.fi-tuiles') === 1 && await q('.fi-onglets.fi-tuiles [role="tab"]') === 3, 'les tuiles SONT les onglets : une seule rangée, pas deux');
  ok(await q('.fi-onglets [aria-selected="true"]', 'xs => xs[0] && xs[0].dataset.onglet') === 'B', 'la fiche s’ouvre sur B, le connecteur qui porte le problème');
  await page.click('#ba-equip .fi-tuile[data-onglet-vers="A"]'); await page.waitForTimeout(200);
  ok(await q('.fi-onglets [aria-selected="true"]', 'xs => xs[0] && xs[0].dataset.onglet') === 'A' && !(await q('[data-panneau="A"]', 'xs => xs[0].hidden')), 'la tuile A ouvre l’onglet A');
  ok(await faceAPlat('[data-panneau="A"]') && await q('[data-panneau="A"] .mj-module.corps-module .mj-cle') === 1, 'la face du module EN 4165 : à plat, un module carré et son détrompeur');
  ok(await q('[data-panneau="A"] .mj-contact.plein') === 11 && await q('[data-panneau="A"] .fi-fil[data-i]') === 11 && await q('[data-panneau="A"] .mj-contact') === 12, 'onze contacts pleins pour onze fils, sur douze contacts');
  ok(await q('[data-panneau="A"] .fi-legende') === 1 && /un fil, à la couleur de sa route/.test(await texte('[data-panneau="A"] .fi-legende')), 'une légende, une fois, qui dit ce qu’un contact plein veut dire');
  ok(await page.evaluate(() => { const p = document.querySelector('#ba-equip [data-panneau="A"] .fi-cadre'), xs = [...p.children].map(e => e.className.split(' ')[0]); return xs.indexOf('fi-ref-ligne') < xs.indexOf('fi-face') && xs.indexOf('fi-face') < xs.indexOf('fi-autour') && xs.indexOf('fi-autour') < xs.indexOf('fi-liste'); }), 'dans le cadre : la référence, la face, autour, puis les fils');
  ok(/aucun arrangement/.test(await texte('[data-panneau="B"] .fi-ref')) && await q('[data-panneau="B"] .fi-changer [data-sexe]') === 2, 'le connecteur B, qu’aucun arrangement ne loge, le dit et laisse changer le sexe des contacts');
  ok((await texte('.fi-etat')).split('aucun arrangement').length === 2, 'le problème de B n’est écrit qu’une fois (l’état), pas répété sous la référence');
  // un EN 4165 n'a pas de raccord : la ligne le dit, et rien ne se calcule au-dessous (ni band-it, ni manchon, ni gaine)
  ok(await page.evaluate(() => { const a = document.querySelector('#ba-equip [data-panneau="A"] .fi-autour'); const t = a ? a.textContent.slice(a.textContent.indexOf('à sertir')) : ''; return !!a && /raccordcheminée · EN4165-015 à confirmer/.test(t) && /cheminée EN4165-015 n’est pas public/.test(t) && !/band-it|manchon|gaine/.test(t); }), 'le connecteur A (EN 4165) : sa cheminée EN4165-015 « à confirmer » (R3 : son Ø intérieur n’est pas public, le manque le dit), pas de ligne band-it, manchon ni gaine', await texte('[data-panneau="A"] .fi-autour'));
  // à la vraie souris : la reprise de blindage sur le corps d'un EN 2997 — le contrat change, la fiche se refait, la puce garde le focus
  await bloc('3', '351PM1'); await page.waitForTimeout(400);
  await page.click('#ba-equip [data-changer^="rac|"]'); await page.waitForTimeout(200);
  await page.click('#ba-equip [data-raccord][data-champ="blindage"][data-v="GND"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => { const r = app.contrat.raccords.get('351PM1|A'), b = document.querySelector('#ba-equip [data-raccord][data-champ="blindage"][aria-pressed="true"]');
    return !!r && r.blindage === 'GND' && b && b.dataset.v === 'GND' && /durci/.test(document.querySelector('#ba-equip .fi-autour').textContent) && /band-it/.test(document.querySelector('#ba-equip .fi-autour').textContent) && document.activeElement === b; }), 'un clic de souris sur « sur le corps » (351PM1, EN 2997) : écrit au contrat, la fiche refaite (raccord durci, band-it), la puce pressée garde le focus');
  await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => !app.contrat.raccords.get('351PM1|A')), 'Ctrl+Z défait le choix du raccord');
  // une variante d'un connecteur, à la vraie souris : retenue (et pas une comparaison « référence introuvable »)
  await bloc('3', '300XC1'); await page.waitForTimeout(400); await page.click('#ba-equip .fi-tuile[data-onglet-vers="A"]'); await page.waitForTimeout(200);
  await page.click('#ba-equip [data-panneau="A"] [data-changer^="arr|"]'); await page.waitForTimeout(200);
  await page.click('#ba-equip [data-panneau="A"] .fi-changer .cand:not([aria-pressed="true"])'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => { const d = app.contrat.designations.get('300XC1|A'), b = document.querySelector('#ba-equip [data-panneau="A"] .cand[aria-pressed="true"]');
    return !!d && app.cible.type === 'bloc' && b && b.dataset.ref === d && document.querySelector('#ba-equip [data-panneau="A"] .fi-ref').textContent === d && !/introuvable/.test($('ba-equip').textContent); }), 'un clic de souris sur une variante la retient : la référence change, la variante est pressée, aucune comparaison ne s’ouvre', await texte('[data-panneau="A"] .fi-ref'));
  await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(600);

  console.log('\nune barrette (668VT31, folio 3)');
  await bloc('3', '668VT31'); await page.waitForTimeout(400);
  ok(/^barrette · E0599-1B207Z · 4 potentiels · 12 fils$/.test(await texte('.fi-sous')), 'la ligne de nature : « barrette · E0599-1B207Z · 4 potentiels · 12 fils »', await texte('.fi-sous'));
  ok(await q('.fi-etat') === 0, 'rien à reprendre : pas d’état');
  ok(/4\s*potentiels.*12\s*fils.*6\s*libres/i.test(await texte('.fi-tuiles')), 'le résumé : les potentiels, les fils, ce qui reste libre', await texte('.fi-tuiles'));
  ok(await faceAPlat('') && await q('.mj-module.corps-rectangle') === 1, 'la face du module ASNE 0599 : à plat, un bloc rectangulaire');
  ok(await q('.mj-contact.plein') === 12 && await q('.mj-contact') === 18 && await q('.mj-plaque.prise') === 4 && await q('.mj-plaque') === 5, 'douze contacts pleins sur dix-huit ; quatre plaques teintées sur cinq');
  ok(await q('.fi-groupe') === 4 && await q('.fi-fil[data-i]') === 12, 'les fils par potentiel : quatre groupes, douze lignes');
  ok(await q('.fi-changer .cand') >= 2 && await q('.fi-changer .cand[aria-pressed="true"]') === 1 && await q('.fi-changer .cand svg.picto') >= 2, '« Changer » : les variantes candidates avec leur picto, celle retenue pressée');

  console.log('\nun disjoncteur (102CB1, folio 1)');
  await bloc('1', '102CB1'); await page.waitForTimeout(400);
  ok(await q('details.fi-etat.ko') === 1 && await q('details.fi-etat li') === 4 && await q('details.fi-etat li.fi-att') === 2 && /2 problèmes · 2 à voir/.test(await texte('details.fi-etat summary')), 'l’état dit les deux problèmes ET les deux points à voir (le calibre serré, la barrette à poser — le DR16 n’est plus « pas protégé en surcharge brève » : le 10 A le protège, sous sa courbe de dommage, R2), jamais cachés derrière les problèmes', await texte('details.fi-etat summary'));
  ok(await q('.dj-fils .fi-fil') === 3 && await q('.fi-cadre:not(.fi-dj) .fi-fil') === 0 && await q('.dj-fils .fi-tag') === 2, 'ses fils sont listés une fois, dans sa disjonction, avec l’étiquette VT1 des deux fils de la borne dédoublée');
  ok(await q('.fi-tuiles') === 0, 'un seul connecteur : pas de tuiles qui répètent le cadre');

  console.log('\nune barrette à poser (VT1, folio 1)');
  await bloc('1', 'VT1'); await page.waitForTimeout(400);
  ok(/^barrette à poser sur 102CB1:2$/.test(await texte('.fi-sous')) && await q('details.fi-etat.att') === 1, 'la ligne de nature dit sur quoi elle se pose ; un point à voir');
  ok(await faceAPlat('') && await q('.mj-module.corps-ovale') === 1 && await q('.mj-shunt-cadre') === 3 && await q('.mj-shunt-cadre.prise') === 1, 'la face du module NSA937901 : à plat, aux bouts ronds, trois shunts dont un teinté');
  ok(await q('.fi-fil') === 3 && await q('.fi-fil.neuf') === 1, 'trois lignes de fil, dont celle à créer');

  console.log('\nune prise de coupure (412VC3B, folio 5)');
  await bloc('5', '412VC3B'); await page.waitForTimeout(400);
  ok(/^prise de coupure · EN3646-002-12-08 · 7 contacts · 14 fils$/.test(await texte('.fi-sous')), 'la ligne de nature : « prise de coupure · EN3646-002-12-08 · 7 contacts · 14 fils »', await texte('.fi-sous'));
  ok(/7\s*contacts.*7\s*fiche.*7\s*embase/i.test(await texte('.fi-tuiles')) && /Ø/.test(await texte('.fi-tuiles')), 'le résumé : les contacts, la fiche et l’embase avec leur toron', await texte('.fi-tuiles'));
  ok(await q('.fi-faces.deux .fi-face') === 2 && await faceAPlat('') && await q('.mj-module.corps-circulaire') === 2 && await q('.mj-cle') === 2, 'deux faces à plat, circulaires, chacune avec sa clé');
  ok(await q('.fi-face .mj-contact.plein') === 14 && await q('.fi-legende') === 1, 'sept contacts pleins de chaque côté, une seule légende');
  ok(await q('.fi-autour') === 2 && await q('.fi-paire') === 7 && await q('.fi-cote[data-i]') === 14, 'autour de la fiche et de l’embase, puis sept paires');

  console.log('\nun fil (W-012, folio 1)');
  await page.evaluate(() => { allerAuPlan('1'); const w = app.dessin.fils.find(w => w.cable === 'W-012'); app.cible = { type: 'fil', l: verite()[w.i] }; ouvrirInspecteur(); }); await page.waitForTimeout(400);
  ok(/^fil · DR20 · 20 AWG · /.test(await texte('.fi-sous')), 'la ligne de nature : « fil · DR20 · 20 AWG · puissance »', await texte('.fi-sous'));
  ok(await q('.fi-trajet .fi-bout') === 2 && /^de\s*102CB1/i.test(await texte('.fi-trajet .fi-bout')) && await q('.fi-cadre > .fi-faits') === 1, 'ses deux bouts, puis les faits dans un cadre', await texte('.fi-trajet .fi-bout'));
  ok(await q('.fi-faits dt', 'xs => xs.map(x => x.textContent).join(" ")') === 'câble admet courant chute longueur où', 'les faits : câble, admet, courant, chute, longueur, où');

  // les hypothèses de la simulation : le mot « hypothèse » de la fiche mène à leur fiche ; une tension changée rejuge la chute admise ; pas de Ctrl+Z (une hypothèse n'est pas le contrat), « Revenir aux valeurs de l'outil » les rend
  console.log('\nles hypothèses de la simulation, depuis la fiche du fil');
  const admis28 = await texte('.fi-faits');
  ok(await q('.fi-hyp[data-hyp]') >= 1 && /1 V admis/.test(admis28), 'la fiche de W-012 écrit « hypothèse » en lien, et 1 V admis sous 28 V');
  await page.click('#ba-equip .fi-hyp'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => app.fiche && app.fiche.mode === 'hypotheses' && !!document.querySelector('#fiche-corps #si-U') && document.querySelectorAll('#fiche-corps .hy-groupe').length >= 4 && document.querySelectorAll('#fiche-corps .hy-sert').length >= 8 && !!document.querySelector('#menu [data-act="hypotheses"]')), 'le mot ouvre la fiche des hypothèses : les champs par groupe, chacun avec ce qu’il sert ; le menu y mène aussi');
  await page.fill('#fiche-corps #si-U', '115'); await page.press('#fiche-corps #si-U', 'Enter'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => app.simu.tension === 115 && document.activeElement && document.activeElement.id === 'si-U' && !$('hy-defaut').disabled), '115 V : l’hypothèse est prise, le champ garde la main, « Revenir aux valeurs de l’outil » s’allume');
  await page.click('#fi-fermer'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => !$('inspecteur').hidden && app.cible && app.cible.type === 'fil') && /4 V admis/.test(await texte('.fi-faits')), 'fermer la fiche des hypothèses rend celle de W-012, rejugée : 4 V admis sous 115 V', await texte('.fi-faits'));
  await page.evaluate(() => ficheHypotheses()); await page.waitForTimeout(300); await page.click('#hy-defaut'); await page.waitForTimeout(400); await page.click('#fi-fermer'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => app.simu.tension === 28 && JSON.stringify(app.simu.conditions) === JSON.stringify(HYPOTHESES.conditions)) && /1 V admis/.test(await texte('.fi-faits')), '« Revenir aux valeurs de l’outil » : 28 V, 1 V admis de nouveau');

  console.log('\nl’index');
  await page.keyboard.press('Escape'); await page.keyboard.press('r'); await page.waitForTimeout(400);
  ok(await q('.ix-controle .fi-etat.ko') === 1 && await q('.ix-groupe') >= 5 && await q('.ix-item[data-nom]') > 50, 'l’index : « à reprendre » en tête, les groupes, les repères');
  ok(/^Repères\d+$/.test(await texte('.ix-tete h2')) && await q('.ix-tete .fi-sous') === 0, 'le titre porte le compte une fois (« Repères 67 »), pas « 67 repères » à côté', await texte('.ix-tete h2'));
  ok(await page.evaluate(() => { app.hist = []; app.contrat.liaisons = []; app.source = null; app.nFolios = 0; app.plan = '*'; app.cible = null; fermerInspecteur(); redessiner(); return $('folios').hidden && !$('vide').hidden; }), 'la table vide (l’accueil) : plus de barre de zoom ni de folios');
  await page.evaluate(() => { chargerContrat(contratExemple(), 'contrat d’exemple', 'Contrat d’exemple'); app.contrat.charges = chargesExemple(); synchroniser(); });
  ok(await page.evaluate(() => !$('folios').hidden), 'l’exemple rechargé : la barre du bas revient');
  ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
  console.log('\n  ' + (ko ? ko + ' échec(s)' : 'tout tient'));
  await nav.close(); process.exit(ko ? 1 : 0);
})();
