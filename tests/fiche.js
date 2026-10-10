/* ===========================================================================
   FICHE — ce qu'on voit quand on clique un bloc ou un fil (08 bis, 08-sections, 08 ter).
       NODE_PATH=/opt/node22/lib/node_modules node tests/fiche.js [--fichier=chemin]

   Sur l'exemple embarqué, chaque fiche a le MÊME squelette, et l'ingénieur
   ne s'y perd pas :
     · la BARRE DE NAVIGATION en tête (‹ › et le fil d'Ariane), puis
       l'EN-TÊTE (le symbole, le repère et son crayon, la ligne de nature, la
       pastille des problèmes, repliée), puis les SECTIONS dans l'ordre fixe
       (Identité, Connecteur(s), Contacts, Fils et intensité, Chute de
       tension, Habillage et raccords, Déjà fait, Le détail du calcul,
       Problèmes) — ouvertes d'office celles qui définissent l'objet, les
       problèmes jamais ; chaque problème compté dans la pastille de la
       section qui le démontre, et « voir » y mène ;
     · un équipement : les connecteurs en segments (le fautif marqué), la face
       à plat, les contacts du connecteur choisi ; une barrette : le module,
       les contacts par potentiel ; une prise : les deux faces côte à côte,
       les paires ; un fil : son identité ouverte, de → vers en deux cartes ;
     · TOUT se change sur place, avec son origine et « ↺ automatique » :
       l'arrangement (une liste sous la valeur), le part number d'un
       connecteur (toutes ses liaisons d'un geste), la longueur et le numéro
       d'un fil, la nature (le code du repère), le contact à sertir,
       l'habillage ; Ctrl+Z défait chaque geste et la fiche reste ouverte ;
     · ouvrir une fiche depuis une fiche EMPILE : ‹ (Alt+←) revient à la même
       place, › repart ; un bout de fil ouvre l'équipement sur son connecteur,
       le contact allumé ; le plan ne bouge pas si l'objet est en vue ;
     · les hypothèses de la simulation depuis le mot « hypothèse » ; l'index.
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
  await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined'); await page.evaluate(() => atelier.exemple());   // l’outil s’ouvre sur l’accueil (plus sur l’exemple) : la batterie, qui lit l’exemple, le demande
  const bloc = (plan, nom) => page.evaluate(([plan, nom]) => { allerAuPlan(plan); const c = app.dessin.comps.find(k => k.name === nom && k.kind !== 'tag'); if (c) choisirBloc(c); else choisirBarretteAPoser(barretteAPoser(nom)); }, [plan, nom]);
  const q = (sel, fn) => page.evaluate(([sel, fn]) => { const xs = [...document.querySelectorAll('#ba-equip ' + sel)]; return new Function('xs', 'return (' + fn + ')(xs)')(xs); }, [sel, fn || 'xs => xs.length']);
  const texte = sel => page.evaluate(sel => { const e = document.querySelector('#ba-equip ' + sel); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
  const sections = () => q('details.fs', 'xs => xs.map(d => d.dataset.section + (d.open ? "+" : "")).join(" ")');
  const sec = s => `details.fs[data-section="${s}"]`;
  // la face est à plat : rien de ce qui faisait le relief, et toujours un corps
  const faceAPlat = async ou => { const n = await q(ou + ' .mj .mj-flanc, ' + ou + ' .mj .mj-ombre, ' + ou + ' .mj .mj-fut'), c = await q(ou + ' .mj .mj-corps'); return n === 0 && c > 0; };
  const vue = () => page.evaluate(() => JSON.stringify(app.vue));
  const ariane = () => q('.fi-ariane li', 'xs => xs.map(x => x.textContent.trim()).join(" › ")');

  console.log('\nun équipement à trois connecteurs (300XC1, folio 3) : le squelette');
  await bloc('3', '300XC1'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const xs = [...document.querySelector('#ba-equip').children].slice(0, 3).map(e => e.className.split(' ')[0]); return xs.join() === 'fi-nav,fi-entete,fs'; }), 'la barre de navigation, l’en-tête, puis les sections');
  ok(/^Contrat › Folio 3 › 300XC1 › connecteur B$/.test((await ariane())) && await q('#fi-prec:disabled, #fi-suiv:disabled') === 2, 'le fil d’Ariane : « Contrat › Folio 3 › 300XC1 › connecteur B » ; ‹ › éteints (rien avant, rien après)', await ariane());
  ok(await page.evaluate(() => $('eq-rep').value === '300XC1' && !!$('fi-crayon') && !!document.querySelector('#ba-equip .fi-symbole svg')) && /^connecteur · 23 fils · 3 connecteurs · EN4165-2M$/.test(await texte('.fi-sous')), 'l’en-tête : le symbole, le repère et son crayon, « connecteur · 23 fils · 3 connecteurs · EN4165-2M »', await texte('.fi-sous'));
  ok(await sections() === 'identite connecteur+ contacts+ fils chute habillage dejafait detail problemes', 'les sections dans l’ordre fixe ; ouvertes d’office : le connecteur et ses contacts — les problèmes jamais', await sections());
  ok(await q('.fi-pb.ko') === 1 && /^1 problème$/.test(await texte('.fi-pb')) && await q(sec('connecteur') + ' .fs-badge.ko') === 1 && await q(sec('problemes') + ' .fs-badge.ko') === 1, 'la pastille repliée : « 1 problème » ; il est compté dans la pastille de « Connecteurs » (où il se voit) et dans « Problèmes »');
  await page.click('#fi-pb'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => document.querySelector('#ba-equip details[data-section="problemes"]').open && /aucun arrangement/.test(document.querySelector('#ba-equip .fi-pbs').textContent)), 'un clic sur la pastille ouvre « Problèmes » et y descend');
  await page.click('#ba-equip .fi-pbs .fi-voir'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.querySelector('#ba-equip details[data-section="connecteur"]').open), '« voir » ouvre la section qui le démontre');
  ok(await q('.fi-segs .seg') === 3 && await q('.fi-segs .seg[aria-pressed="true"]', 'xs => xs[0].dataset.connecteur') === 'B' && await q('.fi-segs .seg.ko', 'xs => xs.map(x => x.dataset.connecteur).join()') === 'B', 'les connecteurs en segments A · B · C ; la fiche s’ouvre sur B, le fautif, marqué');
  ok(/aucun/.test(await texte(sec('connecteur') + ' [data-panneau="B"]')) && await q(sec('connecteur') + ' [data-sexe="300XC1|B"]') === 2, 'B, qu’aucun arrangement ne loge, le dit et laisse changer le sexe des contacts');
  await page.click('#ba-equip .fi-segs [data-connecteur="A"]'); await page.waitForTimeout(400);
  ok(await faceAPlat('[data-panneau="A"]') && await q('[data-panneau="A"] .mj-module.corps-module .mj-cle') === 1, 'A : la face du module EN 4165, à plat, un module carré et son détrompeur');
  ok(await q('[data-panneau="A"] .mj-contact.plein') === 11 && await q('[data-panneau="A"] .mj-contact') === 12 && await q(sec('contacts') + ' .fi-fil[data-i]') === 11, 'onze contacts pleins sur douze ; onze lignes dans « Contacts · A »');
  ok(await q('.fi-legende') === 1 && /11 fils, à la couleur de sa route/.test(await texte('.fi-legende')), 'une légende, une fois');
  ok(/^Contrat › Folio 3 › 300XC1 › connecteur A$/.test((await ariane())), 'le fil d’Ariane suit le connecteur montré');
  ok(await page.evaluate(() => { const r = document.querySelector('#ba-equip [data-panneau="A"] .fc'); return /arrangement/.test(r.textContent) && /EN4165-002-12-20/.test(r.textContent) && !!r.querySelector('.orig-auto') && !!r.querySelector('[data-changer="arr|300XC1|A"]') && !r.querySelector('.fs-auto'); }), 'l’arrangement : sa valeur, son origine (auto), « Changer » à sa droite, pas de ↺ tant qu’il est automatique');

  console.log('\ntout se change sur place : l’arrangement, le part number');
  await page.click('#ba-equip [data-changer="arr|300XC1|A"]'); await page.waitForTimeout(300);
  ok(await q('[data-volet="arr|300XC1|A"] .cand') >= 2 && await q('[data-volet="arr|300XC1|A"] .cand[aria-pressed="true"]') === 1 && await page.evaluate(() => { const v = document.querySelector('#ba-equip [data-volet="arr|300XC1|A"]'), r = v.closest('.fc'); return !!r && /arrangement/.test(r.textContent); }), '« Changer » ouvre la liste SOUS la valeur : les arrangements qui logent ces bornes, le retenu pressé');
  await page.click('#ba-equip [data-volet="arr|300XC1|A"] .cand:not([aria-pressed="true"])'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => { const d = app.contrat.designations.get('300XC1|A'), r = document.querySelector('#ba-equip [data-panneau="A"] .fc'); return !!d && r.textContent.includes(d) && !!r.querySelector('.orig-main') && !!r.querySelector('.fs-auto[data-auto="arr:300XC1|A"]') && /EN4165-002-12-20/.test(r.querySelector('.fs-auto').textContent) && !document.querySelector('#ba-equip [data-volet]') && app.cible.type === 'bloc'; }), 'un autre arrangement retenu : origine « main », « ↺ automatique (EN4165-002-12-20) », la liste refermée');
  await page.click('#ba-equip .fs-auto[data-auto="arr:300XC1|A"]'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => !app.contrat.designations.get('300XC1|A') && /EN4165-002-12-20/.test(document.querySelector('#ba-equip [data-panneau="A"] .fc').textContent)), '« ↺ automatique » rend le calcul');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => !!app.contrat.designations.get('300XC1|A') && app.cible && app.cible.nom === '300XC1' && !$('inspecteur').hidden && !!document.querySelector('#ba-equip details[data-section="connecteur"]')), 'Ctrl+Z défait le retour à l’automatique — et la fiche reste ouverte sur 300XC1');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => !app.contrat.designations.get('300XC1|A') && app.cible && app.cible.nom === '300XC1'), 'Ctrl+Z encore : l’arrangement automatique, la fiche toujours là');
  const pnAvant = await page.evaluate(() => verite().filter(l => (l.de === '300XC1' && /^A/.test(l.borneDe)) || (l.vers === '300XC1' && /^A/.test(l.borneVers))).length);
  await page.fill('#ba-equip [data-panneau="A"] [data-pn="A"]', 'EN4165-3M'); await page.press('#ba-equip [data-panneau="A"] [data-pn="A"]', 'Enter'); await page.waitForTimeout(800);
  ok(await page.evaluate(n => { const L = verite().flatMap(l => [l.de === '300XC1' && /^A/.test(l.borneDe) ? l.pnDe : null, l.vers === '300XC1' && /^A/.test(l.borneVers) ? l.pnVers : null]).filter(x => x !== null);
    const r = [...document.querySelectorAll('#ba-equip [data-panneau="A"] .fc')].find(x => /part number/.test(x.textContent)); return L.length === n && L.every(p => p === 'EN4165-3M') && !!r.querySelector('.orig-main') && /EN4165-2M/.test(r.querySelector('.fs-auto').textContent); }, pnAvant),
    'le part number de A, écrit une fois : les ' + pnAvant + ' liaisons du connecteur suivent, origine « main », « ↺ automatique (EN4165-2M) »');
  ok(await page.evaluate(() => app.hist[app.hist.length - 1].quoi === 'part number de 300XC1 A'), 'un seul geste dans l’historique');
  await page.click('#ba-equip [data-panneau="A"] .fs-auto[data-auto="pn:A"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => verite().filter(l => l.de === '300XC1' && /^A/.test(l.borneDe)).every(l => l.pnDe === 'EN4165-2M' && !(l.avant && 'pnDe' in l.avant))), '« ↺ automatique » rend le part number du fichier à toutes les liaisons');
  // le contact à sertir : une liste sous la ligne, les contacts de la table qui acceptent ce fil
  await page.click('#ba-equip ' + sec('contacts') + ' .fi-fil[data-i] .fi-sertir'); await page.waitForTimeout(400);
  const ct = await page.evaluate(() => { const v = document.querySelector('#ba-equip .fi-choix-ligne [data-volet^="sertir:"]'); return v ? [...v.querySelectorAll('[data-sertir-ref]')].map(b => b.dataset.v + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')) : null; });
  ok(!!ct && ct.length >= 1 && ct.some(x => /\*$/.test(x)), 'le contact à sertir d’une ligne : un clic ouvre, sous elle, les contacts de la table qui acceptent ce fil, le retenu pressé', (ct || []).join(' '));
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => !document.querySelector('#ba-equip .fi-choix') && !$('inspecteur').hidden && app.cible && app.cible.nom === '300XC1'), 'Échap ferme la liste, pas la fiche');

  console.log('\nl’habillage, à la vraie souris (351PM1, EN 2997)');
  await bloc('3', '351PM1'); await page.waitForTimeout(400);
  await page.click('#ba-equip ' + sec('habillage') + ' > summary'); await page.waitForTimeout(300);
  await page.click('#ba-equip [data-changer="rac|351PM1|A"]'); await page.waitForTimeout(300);
  await page.click('#ba-equip [data-raccord][data-champ="blindage"][data-v="GND"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => { const r = app.contrat.raccords.get('351PM1|A'), b = document.querySelector('#ba-equip [data-raccord][data-champ="blindage"][aria-pressed="true"]'), h = document.querySelector('#ba-equip [data-hab="351PM1|A"]');
    return !!r && r.blindage === 'GND' && b && b.dataset.v === 'GND' && /durci/.test(h.textContent) && /band-it/.test(h.textContent) && document.activeElement === b; }), '« sur le corps » : écrit au contrat, la fiche refaite (raccord durci, band-it), la puce pressée garde le focus, la liste reste ouverte');
  await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => !app.contrat.raccords.get('351PM1|A') && app.cible && app.cible.nom === '351PM1' && document.querySelector('#ba-equip details[data-section="habillage"]').open), 'Ctrl+Z défait le choix ; la fiche reste ouverte, « Habillage » toujours ouvert');
  await page.evaluate(() => { const d = document.querySelector('#ba-equip details[data-section="habillage"]'); d.querySelector('summary').click(); });   // la refermer : la mémoire des sections reprend son état d'office

  console.log('\nne jamais perdre l’ingénieur : la pile, le fil d’Ariane, le plan qui ne bouge pas');
  await bloc('3', '300XC1'); await page.waitForTimeout(400); await page.click('#ba-equip .fi-segs [data-connecteur="A"]'); await page.waitForTimeout(300);
  await page.evaluate(() => { $('ba-equip').scrollTop = 120; }); const v0 = await vue();
  await page.click('#ba-equip ' + sec('contacts') + ' .fi-fil[data-i] .fi-num'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => app.cible.type === 'fil' && app.cible.l.cable === 'W-320' && app.insp.pile.length === 2 && app.insp.pos === 1), 'un clic sur le numéro d’un fil ouvre sa fiche, et l’empile');
  ok(/300XC1\s:\sA1 › W-320$/.test((await ariane())) && await q('#fi-prec:not(:disabled)') === 1, 'le fil d’Ariane dit d’où l’on vient (« 300XC1 : A1 › W-320 ») ; ‹ s’allume', await ariane());
  ok(await vue() === v0, 'W-320 était en vue : le plan n’a pas bougé');
  await page.keyboard.press('Alt+ArrowLeft'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => app.cible.type === 'bloc' && app.cible.nom === '300XC1' && $('ba-equip').scrollTop === 120 && document.querySelector('#ba-equip .fi-segs [aria-pressed="true"]').dataset.connecteur === 'A' && app.insp.pos === 0), 'Alt+← revient à 300XC1, au même défilement, sur le même connecteur');
  await page.keyboard.press('Alt+ArrowRight'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => app.cible.type === 'fil' && app.cible.l.cable === 'W-320'), 'Alt+→ repart vers W-320');
  ok(await sections() === 'identite+ connecteur+ contacts fils+ chute detail problemes', 'la fiche d’un fil : son identité ouverte, de → vers, l’intensité ; le reste fermé', await sections());
  await page.click('#ba-equip .fi-bout[data-bout="vers"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => app.cible.nom === '381RL1' && document.querySelector('#ba-equip details[data-section="contacts"]').open && !!document.querySelector('#ba-equip details[data-section="contacts"] .fi-fil.vise') && /W-320/.test(document.querySelector('#ba-equip .fi-fil.vise').textContent) && app.insp.pile.length === 3),
    'la carte « vers » ouvre 381RL1, section Contacts ouverte, la ligne de W-320 allumée — empilé');
  await page.click('#fi-prec'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => app.cible.type === 'fil' && app.cible.l.cable === 'W-320'), '‹ ramène à W-320');
  await page.click('#ba-equip .fi-maillon[data-ariane="bloc:300XC1"]'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => app.cible.nom === '300XC1' && app.insp.pile.length === 3 && app.insp.pos === 2), 'un maillon du fil d’Ariane ouvre son repère (et empile)');
  // le plan : un clic dessus REMPLACE le haut de la pile
  await page.evaluate(() => choisirBloc(app.dessin.comps.find(k => k.name === '351PM1' && k.kind !== 'tag'))); await page.waitForTimeout(400);
  ok(await page.evaluate(() => app.insp.pile.length === 3 && app.insp.pile[2].nom === '351PM1'), 'un clic sur le plan remplace le haut de la pile');
  // survoler une ligne allume son fil sur le plan
  await page.locator('#ba-equip ' + sec('contacts') + ' .fi-fil[data-i] .fi-type').first().hover(); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !!document.querySelector('#scene.focus .cab.hl') && !!document.querySelector('#ba-equip .fi-fil.vise')), 'survoler une ligne allume son fil sur le plan');

  console.log('\nune barrette (668VT31, folio 3)');
  await bloc('3', '668VT31'); await page.waitForTimeout(400);
  ok(/^barrette · E0599-1B207Z · 4 potentiels · 12 fils$/.test(await texte('.fi-sous')) && await q('.fi-pb') === 0, 'la ligne de nature : « barrette · E0599-1B207Z · 4 potentiels · 12 fils » ; rien à reprendre, pas de pastille', await texte('.fi-sous'));
  ok(await sections() === 'identite connecteur+ contacts+ fils chute dejafait detail problemes' && /^Module/.test(await texte(sec('connecteur') + ' .fs-titre')), 'le module et ses contacts ouverts ; pas d’habillage (sans objet)', await sections());
  ok(await faceAPlat('') && await q('.mj-module.corps-rectangle') === 1 && await q('.mj-contact.plein') === 12 && await q('.mj-contact') === 18 && await q('.mj-plaque.prise') === 4, 'la face ASNE 0599 : à plat, rectangulaire, douze contacts pleins sur dix-huit, quatre plaques teintées');
  ok(/retest\s*: E0599-1A101Z/.test(await texte(sec('connecteur'))) && await q('[data-garder="E0599-1A101Z"]') === 1, 'l’écart avec le retest se dit (« retest : E0599-1A101Z · retenu : E0599-1B207Z »), et l’on peut garder le retest');
  await page.click('#ba-equip [data-tout]'); await page.waitForTimeout(300);
  ok(await q(sec('contacts') + ' .fi-groupe') === 4 && await q(sec('contacts') + ' .fi-fil[data-i]') === 12 && /^Potentiel 1 — bornes 8, 9, 10/.test(await texte(sec('contacts') + ' .fi-groupe')), 'les contacts par potentiel (« Potentiel 1 — bornes 8, 9, 10 »), douze lignes, « tout montrer »');
  await page.click('#ba-equip [data-changer="bar|668VT31"]'); await page.waitForTimeout(300);
  ok(await q('[data-volet="bar|668VT31"] .cand') >= 2 && await q('[data-volet="bar|668VT31"] .cand[aria-pressed="true"]') === 1 && await q('[data-volet="bar|668VT31"] .cand svg.picto') >= 2, '« Changer » : les variantes candidates avec leur picto, la retenue pressée');

  console.log('\nun disjoncteur (102CB1, folio 1)');
  await bloc('1', '102CB1'); await page.waitForTimeout(400);
  ok(/^3 problèmes · \d+ à voir$/.test(await texte('.fi-pb')) && await q(sec('problemes') + ' .fi-pb-l') === await page.evaluate(() => { const n = document.querySelector('#ba-equip .fi-pb').textContent.match(/\d+/g).map(Number); return n[0] + n[1]; }), 'la pastille dit les problèmes (trois : W-012 et W-015 dépassés par la charge, le contact 23 du DR24 sous son permanent) et les points à voir ; la section Problèmes les liste tous', await texte('.fi-pb'));
  ok(/^identite calibre\+ courbe\+ profil\+ connecteur contacts fils chute habillage dejafait detail problemes$/.test(await sections()) && await q(sec('calibre') + ' .fi-dj') === 1 && await q('.dj-fils .fi-fil') === 3 && await q('.dj-fils .fi-tag') === 2, 'ses sections propres (08 quinquies) parmi les communes ; ses trois fils, l’étiquette VT1 des deux de la borne dédoublée', await sections());
  ok(/disjoncteur de tableau/.test(await texte(sec('habillage'))) && !/tyrap|band-it/.test(await texte(sec('habillage'))), 'l’habillage d’un disjoncteur de tableau : le toron, sans raccord');

  console.log('\nune barrette à poser (VT1, folio 1)');
  await bloc('1', 'VT1'); await page.waitForTimeout(400);
  ok(/^barrette à poser sur 102CB1:2$/.test(await texte('.fi-sous')) && /^2 problèmes · 1 point à voir$/.test(await texte('.fi-pb')) && await q(sec('fils') + ' .fs-badge.ko') === 1 && await page.evaluate(() => document.querySelector('#ba-equip details[data-section="identite"]').open && $('vt-repere').value === '102VT1' && !!$('vt-poser')),
    'à poser sur 102CB1:2 ; un point à voir (le repère provisoire) et deux problèmes (W-012 et W-015, trop fins sous 102CB1, comptés dans « Fils et intensité ») ; l’identité ouverte propose « poser au contrat sous 102VT1 »', await texte('.fi-pb'));
  ok(await faceAPlat('') && await q('.mj-module.corps-ovale') === 1 && await q('.mj-shunt-cadre') === 3 && await q('.mj-shunt-cadre.prise') === 1 && await q(sec('contacts') + ' .fi-fil') === 3 && await q(sec('contacts') + ' .fi-fil.neuf') === 1, 'la face NSA937901, trois lignes de contact dont le fil à créer');

  console.log('\nune prise de coupure (412VC3B, folio 5)');
  await bloc('5', '412VC3B'); await page.waitForTimeout(400);
  ok(/^prise de coupure · EN3646-002-12-08 · 7 contacts · 14 fils$/.test(await texte('.fi-sous')) && /^Arrangement/.test(await texte(sec('connecteur') + ' .fs-titre')), 'la ligne de nature : « prise de coupure · EN3646-002-12-08 · 7 contacts · 14 fils » ; la section « Arrangement »', await texte('.fi-sous'));
  ok(await page.evaluate(() => { const fs = [...document.querySelectorAll('#ba-equip .fi-faces.deux .fi-face')].map(f => f.getBoundingClientRect()); return fs.length === 2 && Math.abs(fs[0].top - fs[1].top) < 1 && fs[0].right <= fs[1].left; }) && await q('.mj-module.corps-circulaire') === 2 && await q('.fi-face .mj-contact.plein') === 14, 'fiche et embase côte à côte, circulaires, sept contacts pleins de chaque côté');
  ok(await q('.fi-paire') === 7 && await q('.fi-cote[data-i]') === 14 && await q('[data-hab]') === 2, 'sept paires arrive ⇄ repart ; l’habillage, une ligne par côté');

  console.log('\nun fil (W-012, folio 1) : tout se corrige');
  await page.evaluate(() => { allerAuPlan('1'); choisirFil(app.dessin.fils.find(w => w.cable === 'W-012')); }); await page.waitForTimeout(400);
  ok(/^fil · DR20 · 20 AWG · /.test(await texte('.fi-sous')) && await q('#fil-num') === 1 && await q(sec('identite') + ' [data-edit]', 'xs => xs.map(x => x.dataset.edit).join()') === 'cable,type,route,longueur,plan', 'son identité : numéro, câble, route, longueur, folio — chacun un champ', await q(sec('identite') + ' [data-edit]', 'xs => xs.map(x => x.dataset.edit).join()'));
  ok(await q(sec('identite') + ' .orig-hyp') === 1 && await q(sec('fils') + ' .fi-barre') === 2, 'la longueur d’hypothèse le dit ; l’intensité en deux barres (permanent, pointe) contre l’admis');
  const du0 = await texte(sec('chute') + ' .fs-resume');
  await page.fill('#ba-equip [data-edit="longueur"]', '7,5'); await page.press('#ba-equip [data-edit="longueur"]', 'Enter'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => app.cible.l.longueur === 7.5 && !!document.querySelector('#ba-equip [data-section="identite"] .orig-main') && /hypothèse 5 m/.test(document.querySelector('#ba-equip .fs-auto[data-auto="champ:longueur"]').textContent)) && (await texte(sec('chute') + ' .fs-resume')) !== du0,
    'la longueur écrite (7,5 m) : origine « main », « ↺ automatique (hypothèse 5 m) », la chute se refait', await texte(sec('chute') + ' .fs-resume'));
  await page.click('#ba-equip .fs-auto[data-auto="champ:longueur"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => app.cible.l.longueur == null && !!document.querySelector('#ba-equip [data-section="identite"] .orig-hyp')), '« ↺ automatique » rend l’hypothèse');
  await page.fill('#ba-equip [data-edit="cable"]', 'W-012B'); await page.press('#ba-equip [data-edit="cable"]', 'Enter'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => verite().some(l => l.cable === 'W-012B') && $('fil-num').value === 'W-012B'), 'le numéro se change sur la fiche ; l’en-tête suit');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => verite().some(l => l.cable === 'W-012') && app.cible && app.cible.type === 'fil' && app.cible.l.cable === 'W-012' && !$('inspecteur').hidden), 'Ctrl+Z rend W-012, et la fiche reste ouverte sur lui');

  // les hypothèses de la simulation : le mot « hypothèse » de la fiche mène à leur fiche ; une tension changée rejuge la chute admise
  console.log('\nles hypothèses de la simulation, depuis la fiche du fil');
  ok(await q('.fi-hyp[data-hyp]') >= 1 && /1 V admis/.test(await texte(sec('chute'))), 'la fiche de W-012 écrit « hypothèse » en lien, et 1 V admis sous 28 V');
  await page.evaluate(() => { document.querySelector('#ba-equip details[data-section="identite"]').open = true; }); await page.click('#ba-equip ' + sec('identite') + ' .fi-hyp'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => app.fiche && app.fiche.mode === 'hypotheses' && !!document.querySelector('#fiche-corps #si-U') && document.querySelectorAll('#fiche-corps .hy-groupe').length >= 4), 'le mot ouvre la fiche des hypothèses');
  await page.fill('#fiche-corps #si-U', '115'); await page.press('#fiche-corps #si-U', 'Enter'); await page.waitForTimeout(500);
  await page.click('#fi-fermer'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => !$('inspecteur').hidden && app.cible && app.cible.type === 'fil') && /4 V admis/.test(await texte(sec('chute'))), 'fermer la fiche des hypothèses rend celle de W-012, rejugée : 4 V admis sous 115 V', await texte(sec('chute')));
  await page.evaluate(() => ficheHypotheses()); await page.waitForTimeout(300); await page.click('#hy-defaut'); await page.waitForTimeout(400); await page.click('#fi-fermer'); await page.waitForTimeout(400);

  console.log('\nla nature : le code du repère (103RL1 → disjoncteur)');
  await bloc('1', '103RL1'); await page.waitForTimeout(400);
  await page.evaluate(() => { document.querySelector('#ba-equip details[data-section="identite"]').open = true; });
  await page.selectOption('#eq-nature', 'CB'); await page.waitForTimeout(900);
  ok(await page.evaluate(() => app.cible.nom === '103CB1' && verite().some(l => l.de === '103CB1' || l.vers === '103CB1') && !!document.querySelector('#ba-equip .fi-dj')), '« disjoncteur » : 103RL1 devient 103CB1, sa fiche est celle d’un disjoncteur');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => app.cible && app.cible.nom === '103RL1' && verite().some(l => l.vers === '103RL1') && !$('inspecteur').hidden), 'Ctrl+Z rend 103RL1, la fiche reprend son nom');
  // la mesure : une fiche se rend vite
  const t = await page.evaluate(() => { const t0 = performance.now(); for (let k = 0; k < 5; k++) { $('ba-equip').dataset.cle = ''; rendreFiche(); } return (performance.now() - t0) / 5; });
  ok(t < 200, 'la fiche de 103RL1 se refait en moins de 200 ms', Math.round(t) + ' ms');

  console.log('\nl’index');
  await page.keyboard.press('Escape'); await page.keyboard.press('r'); await page.waitForTimeout(400);
  ok(await q('.ix-controle .fi-etat.ko') === 1 && await q('.ix-groupe') >= 5 && await q('.ix-item[data-nom]') > 50, 'l’index : « à reprendre » en tête, les groupes, les repères');
  ok(/^Repères\d+$/.test(await texte('.ix-tete h2')) && await q('.ix-tete .fi-sous') === 0, 'le titre porte le compte une fois (« Repères 67 »)', await texte('.ix-tete h2'));
  ok(await q('.ix-tete #fi-prec') === 1, 'l’index a ‹ : la fiche qu’on y a laissée');
  await page.click('#ba-equip .ix-tete #fi-prec'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => app.cible && app.cible.nom === '103RL1'), '‹ depuis l’index rouvre 103RL1');
  ok(await page.evaluate(() => { app.hist = []; app.contrat.liaisons = []; app.source = null; app.nFolios = 0; app.plan = '*'; app.cible = null; fermerInspecteur(); redessiner(); return $('folios').hidden && !$('vide').hidden; }), 'la table vide (l’accueil) : plus de barre de zoom ni de folios');
  await page.evaluate(() => { chargerContrat(contratExemple(), 'contrat d’exemple', 'Contrat d’exemple'); app.contrat.charges = chargesExemple(); synchroniser(); });
  ok(await page.evaluate(() => !$('folios').hidden), 'l’exemple rechargé : la barre du bas revient');
  ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
  console.log('\n  ' + (ko ? ko + ' échec(s)' : 'tout tient'));
  await nav.close(); process.exit(ko ? 1 : 0);
})();
