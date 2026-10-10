/* ===========================================================================
   FICHE — ce qu'on voit quand on clique un bloc ou un fil (08 bis, 08-sections, 08 ter), la fiche v3.
       NODE_PATH=/opt/node22/lib/node_modules node tests/fiche.js [--fichier=chemin]

   Sur l'exemple embarqué, chaque fiche a le MÊME squelette, et l'ingénieur
   ne s'y perd pas :
     · LA BARRE en tête (‹ ›, ×, plus de fil d'Ariane ; le repère s'y écrit
       quand l'en-tête passe dessous), puis l'EN-TÊTE (le symbole, le type,
       le repère et son crayon, des TUILES — une étiquette, une valeur, un
       bord d'état ; un clic mène à la section), puis LES PROBLÈMES, repliés
       juste dessous, qui se déplient EN PLACE (une ligne par point, la
       section qui le démontre ; un clic l'ouvre et l'allume), puis PEU DE
       SECTIONS dans l'ordre fixe (Identité, Disjoncteur, Connecteur, De →
       vers, Fils, Déjà fait) ;
     · un équipement : les connecteurs en segments (le fautif marqué), la
       norme en puce (un clic montre la face), les bornes en plages, les
       contacts (Borne · Contact · Jauge ✓/✗), l'habillage en nomenclature ;
       une barrette : le module, la face vivante, les contacts par potentiel ;
       une prise : les deux faces côte à côte, les paires ; un fil : son
       identité, de → vers en deux cartes, l'intensité et la chute ;
     · TOUT se change sur place, « main » et « ↺ » : l'arrangement (une liste
       sous la valeur), le part number d'un connecteur (toutes ses liaisons
       d'un geste), la longueur et le numéro d'un fil, la zone et
       l'emplacement d'un repère, le contact à sertir, l'habillage ; Ctrl+Z
       défait chaque geste et la fiche reste ouverte ; écrire dans le profil
       d'un disjoncteur refait la fiche en place, la main dans le champ ;
     · ouvrir une fiche depuis une fiche EMPILE : ‹ (Alt+←) revient à la même
       place, › repart ; un bout de fil ouvre l'équipement sur son connecteur,
       le contact allumé ; le plan ne bouge pas si l'objet est en vue ;
     · les hypothèses de la simulation depuis la pastille « hyp. » ; l'index.
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
  const tuiles = () => q('.fi-tuile', 'xs => xs.map(t => t.querySelector(".fi-tuile-k").textContent + "=" + t.querySelector(".fi-tuile-v").textContent.replace(/\\s+/g, " ").trim() + (t.classList.contains("ko") ? "!" : t.classList.contains("att") ? "?" : "")).join(" | ")');
  const sec = s => `details.fs[data-section="${s}"]`;
  // la face est à plat : rien de ce qui faisait le relief, et toujours un corps
  const faceAPlat = async ou => { const n = await q(ou + ' .mj .mj-flanc, ' + ou + ' .mj .mj-ombre, ' + ou + ' .mj .mj-fut'), c = await q(ou + ' .mj .mj-corps'); return n === 0 && c > 0; };
  const vue = () => page.evaluate(() => JSON.stringify(app.vue));

  console.log('\nun équipement à trois connecteurs (300XC1, folio 3) : le squelette');
  await bloc('3', '300XC1'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const xs = [...document.querySelector('#ba-equip').children].slice(0, 4).map(e => e.className.split(' ')[0]); return xs.join() === 'fi-nav,fi-entete,fi-alerte,fs'; }), 'la barre, l’en-tête, les problèmes, puis les sections');
  ok(await q('.fi-ariane, .fi-maillon') === 0 && await q('#fi-prec:disabled, #fi-suiv:disabled') === 2 && await q('.fi-nav #in-fermer') === 1, 'plus de fil d’Ariane : ‹ › (éteints : rien avant, rien après) et ×');
  ok(await page.evaluate(() => $('eq-rep').value === '300XC1' && !!$('fi-crayon') && !!document.querySelector('#ba-equip .fi-symbole svg')) && await texte('.fi-genre') === 'Connecteur', 'l’en-tête : le symbole, le type (« Connecteur »), le repère et son crayon', await texte('.fi-genre'));
  ok(await tuiles() === 'Connecteurs=A·B·C! | Part number=EN4165-2M | Fils=23' && await q('.fi-tuile .fi-ko-t', 'xs => xs.map(x => x.textContent).join()') === 'B', 'les tuiles : « Connecteurs A · B · C » (B en rouge, la tuile bordée de rouge), « Part number EN4165-2M », « Fils 23 »', await tuiles());
  ok(await sections() === 'identite+ connecteur+ fils+ dejafait', 'quatre sections dans l’ordre fixe ; ouvertes d’office : l’identité, le connecteur, les fils', await sections());
  ok(await page.evaluate(() => { const b = document.querySelector('#ba-equip details.fi-alerte'); return !!b && !b.open && b.classList.contains('ko'); }) && /^1 problème$/.test(await texte('.fi-pb')) && await q(sec('connecteur') + ' .fs-badge.ko') === 1, 'les problèmes, repliés sous l’en-tête : « 1 problème » ; il est compté dans la pastille de « Connecteurs »');
  const yAvant = await page.evaluate(() => $('ba-equip').scrollTop);
  await page.click('#fi-pb'); await page.waitForTimeout(300);
  ok(await page.evaluate(y => { const b = document.querySelector('#ba-equip details.fi-alerte'), l = b.querySelectorAll('.fi-pb-l'); return b.open && l.length === 1 && /aucun arrangement/.test(l[0].textContent) && /Connecteur B/.test(l[0].querySelector('.fi-pb-s').textContent) && $('ba-equip').scrollTop === y; }, yAvant), 'un clic les déplie EN PLACE (la fiche ne descend pas) : une ligne, la section qui le démontre en petit (« Connecteur B »)');
  await page.click('#ba-equip .fi-pb-l'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const d = document.querySelector('#ba-equip details[data-section="connecteur"]'); return d.open && d.classList.contains('fs-allume'); }), 'un clic sur la ligne ouvre la section qui le démontre, et l’allume');
  await page.click('#fi-pb'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !document.querySelector('#ba-equip details.fi-alerte').open), 'et la barre se replie');
  ok(await q('.fi-segs .seg') === 3 && await q('.fi-segs .seg[aria-pressed="true"]', 'xs => xs[0].dataset.connecteur') === 'B' && await q('.fi-segs .seg.ko', 'xs => xs.map(x => x.dataset.connecteur).join()') === 'B', 'les connecteurs en segments A · B · C ; la fiche s’ouvre sur B, le fautif, marqué');
  ok(/Aucun arrangement/.test(await texte(sec('connecteur') + ' [data-panneau="B"]')) && await q(sec('connecteur') + ' [data-sexe="300XC1|B"]') === 2, 'B, qu’aucun arrangement ne loge, le dit et laisse changer le sexe des contacts');
  await page.click('#ba-equip .fi-segs [data-connecteur="A"]'); await page.waitForTimeout(400);
  const ligneDe = mot => page.evaluate(m => { const r = [...document.querySelectorAll('#ba-equip [data-panneau="A"] .fc')].find(x => x.querySelector('.fc-k').textContent === m); return r ? r.querySelector('.fc-k').textContent + ' ' + [...r.querySelector('.fc-v').childNodes].map(n => n.textContent.trim()).filter(Boolean).join(' ') : null; }, mot);
  ok(/^Bornes A1 à A11 11 fils$/.test(await ligneDe('Bornes') || ''), 'les bornes, en plages : « A1 à A11 », onze fils', await ligneDe('Bornes'));
  ok(await page.evaluate(() => { const r = [...document.querySelectorAll('#ba-equip [data-panneau="A"] .fc')].find(x => x.querySelector('.fc-k').textContent === 'Norme'), b = r && r.querySelector('.fi-norme-puce[data-face]');
    return !!b && /EN4165-002-12-20/.test(b.textContent) && !r.querySelector('.orig') && !!r.querySelector('[data-changer="arr|300XC1|A"]') && !r.querySelector('.fs-auto'); }) && await q('[data-panneau="A"] .fi-face') === 0,
    'la norme de A en puce (EN4165-002-12-20), « Changer » à sa droite, aucune pastille tant qu’elle est automatique ; la face attend un clic');
  await page.click('#ba-equip [data-panneau="A"] .fi-norme-puce[data-face]'); await page.waitForTimeout(400);
  ok(await faceAPlat('[data-panneau="A"]') && await q('[data-panneau="A"] .mj-module.corps-module .mj-cle') === 1, 'un clic sur la puce montre la face du module EN 4165, à plat, un module carré et son détrompeur');
  ok(await q('[data-panneau="A"] .mj-contact.plein') === 11 && await q('[data-panneau="A"] .mj-contact') === 12 && await q('[data-panneau="A"] .fi-contacts .fi-fil[data-i]') === 11, 'onze contacts pleins sur douze ; onze lignes de contact');
  ok(await q('[data-panneau="A"] .fi-contacts .fi-entetes span', 'xs => xs.map(x => x.textContent).join()') === 'Borne,Contact,Jauge' && await page.evaluate(() => { const li = document.querySelector('#ba-equip [data-panneau="A"] .fi-contacts .fi-fil[data-i]'), l2 = li.nextElementSibling;
    return li.querySelector('.fi-sertir').textContent === 'EN3155-003F2020' && l2.querySelector('.fi-sertir').textContent === '″' && /^24✓$/.test(li.querySelector('.fi-jg').textContent) && !/W-320|381RL1/.test(li.textContent) && /W-320/.test(li.dataset.bulle); }),
    'les contacts : Borne · Contact · Jauge — le contact de la table (« ″ » quand c’est le même qu’au-dessus), la jauge acceptée ✓ ; ni numéro de fil ni « vers » (la bulle du survol les dit)');

  console.log('\ntout se change sur place : l’arrangement, le part number, le contact');
  await page.click('#ba-equip [data-changer="arr|300XC1|A"]'); await page.waitForTimeout(300);
  ok(await q('[data-volet="arr|300XC1|A"] .cand') >= 2 && await q('[data-volet="arr|300XC1|A"] .cand[aria-pressed="true"]') === 1 && await page.evaluate(() => { const v = document.querySelector('#ba-equip [data-volet="arr|300XC1|A"]'), r = v.closest('.fc'); return !!r && r.querySelector('.fc-k').textContent === 'Norme'; }), '« Changer » ouvre la liste SOUS la valeur : les arrangements qui logent ces bornes, le retenu pressé');
  await page.click('#ba-equip [data-volet="arr|300XC1|A"] .cand:not([aria-pressed="true"])'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => { const d = app.contrat.designations.get('300XC1|A'), r = [...document.querySelectorAll('#ba-equip [data-panneau="A"] .fc')].find(x => x.querySelector('.fc-k').textContent === 'Norme'); return !!d && r.textContent.includes(d) && !!r.querySelector('.orig-main') && !!r.querySelector('.fs-auto[data-auto="arr:300XC1|A"]') && /EN4165-002-12-20/.test(r.querySelector('.fs-auto').textContent) && !document.querySelector('#ba-equip [data-volet]') && app.cible.type === 'bloc'; }), 'un autre arrangement retenu : la pastille « main », « ↺ EN4165-002-12-20 », la liste refermée');
  await page.click('#ba-equip .fs-auto[data-auto="arr:300XC1|A"]'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => !app.contrat.designations.get('300XC1|A') && /EN4165-002-12-20/.test(document.querySelector('#ba-equip [data-panneau="A"] .fi-norme-puce').textContent)), '« ↺ » rend le calcul');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => !!app.contrat.designations.get('300XC1|A') && app.cible && app.cible.nom === '300XC1' && !$('inspecteur').hidden && !!document.querySelector('#ba-equip details[data-section="connecteur"]')), 'Ctrl+Z défait le retour à l’automatique — et la fiche reste ouverte sur 300XC1');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => !app.contrat.designations.get('300XC1|A') && app.cible && app.cible.nom === '300XC1'), 'Ctrl+Z encore : l’arrangement automatique, la fiche toujours là');
  const pnAvant = await page.evaluate(() => verite().filter(l => (l.de === '300XC1' && /^A/.test(l.borneDe)) || (l.vers === '300XC1' && /^A/.test(l.borneVers))).length);
  await page.fill('#ba-equip [data-panneau="A"] [data-pn="A"]', 'EN4165-3M'); await page.press('#ba-equip [data-panneau="A"] [data-pn="A"]', 'Enter'); await page.waitForTimeout(800);
  ok(await page.evaluate(n => { const L = verite().flatMap(l => [l.de === '300XC1' && /^A/.test(l.borneDe) ? l.pnDe : null, l.vers === '300XC1' && /^A/.test(l.borneVers) ? l.pnVers : null]).filter(x => x !== null);
    const r = [...document.querySelectorAll('#ba-equip [data-panneau="A"] .fc')].find(x => x.querySelector('.fc-k').textContent === 'Part number'); return L.length === n && L.every(p => p === 'EN4165-3M') && !!r.querySelector('.orig-main') && /EN4165-2M/.test(r.querySelector('.fs-auto').textContent); }, pnAvant),
    'le part number de A, écrit une fois : les ' + pnAvant + ' liaisons du connecteur suivent, la pastille « main », « ↺ EN4165-2M »');
  ok(await page.evaluate(() => app.hist[app.hist.length - 1].quoi === 'part number de 300XC1 A'), 'un seul geste dans l’historique');
  await page.click('#ba-equip [data-panneau="A"] .fs-auto[data-auto="pn:A"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => verite().filter(l => l.de === '300XC1' && /^A/.test(l.borneDe)).every(l => l.pnDe === 'EN4165-2M' && !(l.avant && 'pnDe' in l.avant))), '« ↺ » rend le part number du fichier à toutes les liaisons');
  // le contact à sertir : une liste sous la ligne, les contacts de la table qui acceptent ce fil
  await page.click('#ba-equip [data-panneau="A"] .fi-contacts .fi-fil[data-i] .fi-sertir'); await page.waitForTimeout(400);
  const ct = await page.evaluate(() => { const v = document.querySelector('#ba-equip .fi-choix-ligne [data-volet^="sertir:"]'); return v ? [...v.querySelectorAll('[data-sertir-ref]')].map(b => b.dataset.v + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')) : null; });
  ok(!!ct && ct.length >= 1 && ct.some(x => /\*$/.test(x)), 'le contact d’une ligne : un clic ouvre, sous elle, les contacts de la table qui acceptent ce fil, le retenu pressé', (ct || []).join(' '));
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => !document.querySelector('#ba-equip .fi-choix') && !$('inspecteur').hidden && app.cible && app.cible.nom === '300XC1'), 'Échap ferme la liste, pas la fiche');

  console.log('\nl’habillage, à la vraie souris (351PM1, EN 2997)');
  await bloc('3', '351PM1'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const h = document.querySelector('#ba-equip [data-hab="351PM1|A"]'); return !!h && [...h.querySelectorAll('.fi-piece')].length >= 1 && !!h.querySelector('.fi-piece-r') && /toron Ø/.test(h.querySelector('.fi-hab-mots').textContent); }),
    'l’habillage de 351PM1 A, dans son connecteur : une ligne par pièce (son rôle, sa référence), le toron en petit');
  await page.click('#ba-equip [data-changer="rac|351PM1|A"]'); await page.waitForTimeout(300);
  await page.click('#ba-equip [data-raccord][data-champ="blindage"][data-v="GND"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => { const r = app.contrat.raccords.get('351PM1|A'), b = document.querySelector('#ba-equip [data-raccord][data-champ="blindage"][aria-pressed="true"]'), h = document.querySelector('#ba-equip [data-hab="351PM1|A"]'), rac = h.querySelector('[data-role="raccord"]');
    return !!r && r.blindage === 'GND' && b && b.dataset.v === 'GND' && !!rac && /durci/i.test(rac.textContent + ' ' + (rac.dataset.bulle || '')) && !!h.querySelector('[data-role="bande"]') && document.activeElement === b; }), '« sur le corps » : écrit au contrat, la fiche refaite (un raccord durci, une ligne Band-it), la puce pressée garde le focus, la liste reste ouverte');
  await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => !app.contrat.raccords.get('351PM1|A') && app.cible && app.cible.nom === '351PM1' && document.querySelector('#ba-equip details[data-section="connecteur"]').open && !document.querySelector('#ba-equip [data-role="bande"]')), 'Ctrl+Z défait le choix ; la fiche reste ouverte, plus de band-it');

  console.log('\nne jamais perdre l’ingénieur : la pile, la barre, le plan qui ne bouge pas');
  await bloc('3', '300XC1'); await page.waitForTimeout(400); await page.click('#ba-equip .fi-segs [data-connecteur="A"]'); await page.waitForTimeout(300);
  await page.evaluate(() => { $('ba-equip').scrollTop = 320; $('ba-equip').dispatchEvent(new Event('scroll')); }); await page.waitForTimeout(250); const v0 = await vue();
  ok(await page.evaluate(() => $('ba-equip').classList.contains('defile') && getComputedStyle(document.querySelector('#ba-equip .fi-nav-nom')).opacity === '1' && document.querySelector('#ba-equip .fi-nav-nom').textContent === '300XC1'), 'l’en-tête passé sous la barre : le repère s’y écrit en petit');
  await page.evaluate(() => { const li = document.querySelector('#ba-equip [data-panneau="A"] .fi-contacts .fi-fil[data-i]'); li.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(100);
  const haut0 = await page.evaluate(() => $('ba-equip').scrollTop);
  await page.click('#ba-equip [data-panneau="A"] .fi-contacts .fi-fil[data-i] .fi-ct'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => app.cible.type === 'fil' && app.cible.l.cable === 'W-320' && app.insp.pile.length === 2 && app.insp.pos === 1), 'un clic sur une ligne de contact ouvre la fiche de son fil, et l’empile');
  ok(await q('#fi-prec:not(:disabled)') === 1 && /300XC1/.test(await page.evaluate(() => $('fi-prec').title)), '‹ s’allume : « Revenir à 300XC1 »', await page.evaluate(() => $('fi-prec').title));
  ok(await vue() === v0, 'W-320 était en vue : le plan n’a pas bougé');
  await page.keyboard.press('Alt+ArrowLeft'); await page.waitForTimeout(600);
  ok(await page.evaluate(h => app.cible.type === 'bloc' && app.cible.nom === '300XC1' && Math.abs($('ba-equip').scrollTop - h) < 2 && document.querySelector('#ba-equip .fi-segs [aria-pressed="true"]').dataset.connecteur === 'A' && app.insp.pos === 0, haut0), 'Alt+← revient à 300XC1, au même défilement, sur le même connecteur');
  await page.keyboard.press('Alt+ArrowRight'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => app.cible.type === 'fil' && app.cible.l.cable === 'W-320'), 'Alt+→ repart vers W-320');
  ok(await sections() === 'identite+ trajet+ fils+', 'la fiche d’un fil : son identité, de → vers, l’intensité et la chute', await sections());
  await page.click('#ba-equip .fi-bout[data-bout="vers"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => app.cible.nom === '381RL1' && document.querySelector('#ba-equip details[data-section="connecteur"]').open && !!document.querySelector('#ba-equip details[data-section="connecteur"] .fi-fil.vise') && /W-320/.test(document.querySelector('#ba-equip .fi-fil.vise').dataset.bulle) && app.insp.pile.length === 3),
    'la carte « Vers » ouvre 381RL1, son connecteur ouvert, la ligne de W-320 allumée — empilé');
  await page.click('#fi-prec'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => app.cible.type === 'fil' && app.cible.l.cable === 'W-320'), '‹ ramène à W-320');
  await page.click('#ba-equip .fi-bout[data-bout="de"]'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => app.cible.nom === '300XC1' && app.insp.pile.length === 3 && app.insp.pos === 2), 'la carte « De » ouvre 300XC1 (et empile)');
  // le plan : un clic dessus REMPLACE le haut de la pile
  await page.evaluate(() => choisirBloc(app.dessin.comps.find(k => k.name === '351PM1' && k.kind !== 'tag'))); await page.waitForTimeout(400);
  ok(await page.evaluate(() => app.insp.pile.length === 3 && app.insp.pile[2].nom === '351PM1'), 'un clic sur le plan remplace le haut de la pile');
  // survoler une ligne allume son fil sur le plan
  await page.locator('#ba-equip ' + sec('fils') + ' .fi-ia[data-i] .fi-num').first().hover(); await page.waitForTimeout(400);
  ok(await page.evaluate(() => !!document.querySelector('#scene.focus .cab.hl') && !!document.querySelector('#ba-equip .fi-ia.vise')), 'survoler une ligne allume son fil sur le plan');
  ok(await page.evaluate(() => { const b = document.querySelector('.fi-bulle'); return !!b && !b.hidden && /admis/.test(b.textContent); }), 'et sa bulle dit d’où viennent ses chiffres (ce qu’il admet)', await page.evaluate(() => (document.querySelector('.fi-bulle') || {}).textContent));
  await page.mouse.move(5, 5);

  console.log('\nune barrette (668VT31, folio 3) : la face vivante');
  await bloc('3', '668VT31'); await page.waitForTimeout(400);
  ok(await tuiles() === 'Module=E0599-1B207Z | Potentiels=4 | Fils=12' && await q('.fi-alerte') === 0 && await texte('.fi-genre') === 'Barrette', 'les tuiles : « Module E0599-1B207Z », « Potentiels 4 », « Fils 12 » ; rien à reprendre, pas de barre des problèmes', await tuiles());
  ok(await sections() === 'identite+ connecteur+ fils+ dejafait' && /^Module/.test(await texte(sec('connecteur') + ' .fs-titre')), 'le module ouvert, ses contacts dedans ; pas d’habillage (sans objet)', await sections());
  ok(await faceAPlat('') && await q('.mj-module.corps-rectangle') === 1 && await q('.mj-contact.plein') === 12 && await q('.mj-contact') === 18 && await q('.mj-plaque.prise') === 4, 'la face ASNE 0599 : à plat, rectangulaire, douze contacts pleins sur dix-huit, quatre plaques teintées');
  ok(/Retest\s*: E0599-1A101Z/.test(await texte(sec('connecteur'))) && await q('[data-garder="E0599-1A101Z"]') === 1, 'l’écart avec le retest se dit (« Retest : E0599-1A101Z »), et l’on peut garder le retest');
  ok(await q(sec('connecteur') + ' .fi-groupe') === 4 && await q(sec('connecteur') + ' .fi-contacts .fi-fil[data-i]') === 12 && /^Potentiel 1 — bornes 8, 9, 10/.test(await texte(sec('connecteur') + ' .fi-groupe')), 'les contacts par potentiel (« Potentiel 1 — bornes 8, 9, 10 »), douze lignes, toutes montrées');
  const contactA = await page.locator('#ba-equip .fi-face .mj-contact.plein[data-lettre="A"] .mj-bague').boundingBox();
  await page.mouse.move(contactA.x + contactA.width / 2, contactA.y + contactA.height / 2); await page.waitForTimeout(350);
  ok(await page.evaluate(() => { const g = document.querySelector('#ba-equip .fi-face .mj-contact[data-lettre="A"]'), k = g.dataset.i, li = document.querySelector(`#ba-equip .fi-contacts .fi-fil[data-i="${k}"]`); return g.classList.contains('vise') && li && li.classList.contains('vise') && !!document.querySelector('#scene.focus .cab.hl'); }), 'survoler le contact A de la face allume sa ligne dans la fiche et son fil sur le plan');
  await page.mouse.click(contactA.x + contactA.width / 2, contactA.y + contactA.height / 2); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const g = document.querySelector('#ba-equip .fi-face .mj-contact[data-lettre="A"]'), li = document.querySelector(`#ba-equip .fi-contacts .fi-fil[data-i="${g.dataset.i}"]`); return g.classList.contains('choisi') && li.classList.contains('choisi') && FI.choisi === g.dataset.i && app.cible.nom === '668VT31'; }), 'un clic le CHOISIT : le contact et sa ligne restent marqués (la fiche reste sur la barrette)');
  await page.mouse.move(5, 5);
  await page.click('#ba-equip [data-changer="bar|668VT31"]'); await page.waitForTimeout(300);
  ok(await q('[data-volet="bar|668VT31"] .cand') >= 2 && await q('[data-volet="bar|668VT31"] .cand[aria-pressed="true"]') === 1 && await q('[data-volet="bar|668VT31"] .cand svg.picto') >= 2, '« Changer » : les variantes candidates avec leur picto, la retenue pressée');

  console.log('\nun disjoncteur (102CB1, folio 1)');
  await bloc('1', '102CB1'); await page.waitForTimeout(400);
  ok(/^3 problèmes · \d+ à voir$/.test(await texte('.fi-pb')) && await q('.fi-pbs .fi-pb-l') === await page.evaluate(() => { const n = document.querySelector('#ba-equip .fi-pb').textContent.match(/\d+/g).map(Number); return n[0] + n[1]; }), 'la barre dit les problèmes (trois : W-012 et W-015 dépassés par la charge, le contact 23 du DR24 sous son permanent) et les points à voir ; dépliée, elle les liste tous', await texte('.fi-pb'));
  ok(await sections() === 'identite+ disjoncteur+ fils+ dejafait' && await q(sec('disjoncteur') + ' .fi-dj[data-disj="102CB1"]') === 3 && await q('.dj-fils .fi-ia[data-i]') === 3, 'Identité · Disjoncteur (ses trois groupes : le calibre, la courbe, le profil) · Fils · Déjà fait — un disjoncteur de tableau n’a ni contacts ni raccord : pas de section Connecteur', await sections());
  ok(/^Calibre=10 A\? \| Part number=MS3320-10 \| Fils=3!$/.test(await tuiles()), 'les tuiles : « Calibre 10 A » (ambre : le meilleur est ailleurs), « Part number MS3320-10 », « Fils 3 » (rouge : deux trop fins)', await tuiles());
  // écrire dans le profil refait la fiche EN PLACE : la main reste dans le champ suivant, les tuiles et la barre suivent
  ok(await q(sec('disjoncteur') + ' .dj-etat', 'xs => xs.map(x => x.dataset.k).join()') === 'dem,trans,perm', 'le profil dans l’ordre : démarrage, transition, permanent');
  await page.click('#ba-equip [data-dj="dem"][data-q="i"]'); await page.fill('#ba-equip [data-dj="dem"][data-q="i"]', '60'); await page.keyboard.press('Tab'); await page.waitForTimeout(900);
  ok(await page.evaluate(() => { const a = document.activeElement; return app.contrat.charges.get('102CB1').dem.i === 60 && !!a && a.dataset.dj === 'dem' && a.dataset.q === 't' && a.closest('#ba-equip') && document.querySelector('#ba-equip .fi-tuile[data-aller="disjoncteur"]').classList.contains('ko') && !!document.querySelector('#ba-equip .dj-etat[data-k="dem"] .dj-verdict.ko'); }),
    '60 A au démarrage, puis Tab : écrit au contrat, la main reste dans le champ suivant (sa durée), et la fiche suit en place — la tuile du calibre au rouge, la pastille du démarrage aussi');
  await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => app.contrat.charges.get('102CB1').dem.i === 9.31 && app.cible && app.cible.nom === '102CB1'), 'Ctrl+Z rend le profil de l’exemple, la fiche toujours là');

  console.log('\nune barrette à poser (VT1, folio 1)');
  await bloc('1', 'VT1'); await page.waitForTimeout(400);
  ok(/^À poser sur=102CB1:2 \| Fils=3!$/.test(await tuiles()) && /^2 problèmes · 1 point à voir$/.test(await texte('.fi-pb')) && await q(sec('fils') + ' .fs-badge.ko') === 1 && await page.evaluate(() => document.querySelector('#ba-equip details[data-section="identite"]').open && $('vt-repere').value === '102VT1' && !!$('vt-poser')),
    'à poser sur 102CB1:2 ; un point à voir (le repère provisoire) et deux problèmes (W-012 et W-015, trop fins sous 102CB1, comptés dans « Fils ») ; l’identité ouverte propose « poser au contrat sous 102VT1 »', await tuiles() + ' · ' + await texte('.fi-pb'));
  ok(await faceAPlat('') && await q('.mj-module.corps-ovale') === 1 && await q('.mj-shunt-cadre') === 3 && await q('.mj-shunt-cadre.prise') === 1 && await q(sec('connecteur') + ' .fi-contacts .fi-fil') === 3 && await q(sec('connecteur') + ' .fi-contacts .fi-fil.neuf') === 1, 'la face NSA937901, trois lignes de contact dont le fil à créer');

  console.log('\nune prise de coupure (412VC3B, folio 5)');
  await bloc('5', '412VC3B'); await page.waitForTimeout(400);
  ok(await tuiles() === 'Arrangement=EN3646-002-12-08 | Contacts=7 | Fils=14' && /^Connecteur/.test(await texte(sec('connecteur') + ' .fs-titre')) && await texte('.fi-genre') === 'Prise de coupure', 'les tuiles : « Arrangement EN3646-002-12-08 », « Contacts 7 », « Fils 14 » ; la section « Connecteur »', await tuiles());
  ok(await page.evaluate(() => { const fs = [...document.querySelectorAll('#ba-equip .fi-faces.deux .fi-face')].map(f => f.getBoundingClientRect()); return fs.length === 2 && Math.abs(fs[0].top - fs[1].top) < 1 && fs[0].right <= fs[1].left; }) && await q('.mj-module.corps-circulaire') === 2 && await q('.fi-face .mj-contact.plein') === 14, 'fiche et embase côte à côte, circulaires, sept contacts pleins de chaque côté');
  ok(await q('.fi-paire') === 7 && await q('.fi-cote[data-i]') === 14 && await q('[data-hab]') === 2 && await q('.fi-paire .fi-jg.ok') === 14, 'sept paires (le contact de la table et la jauge ✓ de chaque côté) ; l’habillage, un bloc par côté');

  console.log('\nun fil (W-012, folio 1) : tout se corrige');
  await page.evaluate(() => { allerAuPlan('1'); choisirFil(app.dessin.fils.find(w => w.cable === 'W-012')); }); await page.waitForTimeout(400);
  ok(/^Câble=DR20 \| Jauge=20 AWG \| Longueur=5 m hyp\. \| Intensité=9,31 A!$/.test(await tuiles()) && await q('#fil-num') === 1 && await q(sec('identite') + ' [data-edit]', 'xs => xs.map(x => x.dataset.edit).join()') === 'cable,type,route,longueur', 'son en-tête (Câble, Jauge, Longueur d’hypothèse, Intensité en rouge : la pointe de 9,31 A, celle qui le juge, comme sa ligne) ; son identité : numéro, câble, route, longueur — chacun un champ', await tuiles());
  ok(await q(sec('identite') + ' .orig-hyp') === 1 && await q(sec('fils') + ' .fi-mes .fi-barre') === 2, 'la longueur d’hypothèse le dit (« hyp. ») ; l’intensité et la chute, une barre chacune');
  const du0 = await texte(sec('fils') + ' .fs-resume');
  await page.fill('#ba-equip [data-edit="longueur"]', '7,5'); await page.press('#ba-equip [data-edit="longueur"]', 'Enter'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => app.cible.l.longueur === 7.5 && !!document.querySelector('#ba-equip [data-section="identite"] .orig-main') && /hypothèse 5 m/.test(document.querySelector('#ba-equip .fs-auto[data-auto="champ:longueur"]').textContent)) && (await texte(sec('fils') + ' .fs-resume')) !== du0,
    'la longueur écrite (7,5 m) : la pastille « main », « ↺ hypothèse 5 m », la chute se refait', await texte(sec('fils') + ' .fs-resume'));
  await page.click('#ba-equip .fs-auto[data-auto="champ:longueur"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => app.cible.l.longueur == null && !!document.querySelector('#ba-equip [data-section="identite"] .orig-hyp')), '« ↺ » rend l’hypothèse');
  await page.fill('#ba-equip [data-edit="cable"]', 'W-012B'); await page.press('#ba-equip [data-edit="cable"]', 'Enter'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => verite().some(l => l.cable === 'W-012B') && $('fil-num').value === 'W-012B'), 'le numéro se change sur la fiche ; l’en-tête suit');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => verite().some(l => l.cable === 'W-012') && app.cible && app.cible.type === 'fil' && app.cible.l.cable === 'W-012' && !$('inspecteur').hidden), 'Ctrl+Z rend W-012, et la fiche reste ouverte sur lui');

  // les hypothèses de la simulation : la pastille « hyp. » de la fiche mène à leur fiche ; une tension changée rejuge la chute admise
  console.log('\nles hypothèses de la simulation, depuis la fiche du fil');
  const chute = () => page.evaluate(() => [...document.querySelectorAll('#ba-equip .fi-mes')].find(m => /Chute/.test(m.textContent)).querySelector('.fi-mes-v').textContent.replace(/\s+/g, ' '));
  ok(await q('.fi-hyp[data-hyp]') >= 1 && /\/ 1 V$/.test(await chute()), 'la fiche de W-012 a la pastille « hyp. » en lien, et 1 V admis sous 28 V', await chute());
  await page.click('#ba-equip ' + sec('identite') + ' .fi-hyp'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => app.fiche && app.fiche.mode === 'hypotheses' && !!document.querySelector('#fiche-corps #si-U') && document.querySelectorAll('#fiche-corps .hy-groupe').length >= 4), 'la pastille ouvre la fiche des hypothèses');
  await page.fill('#fiche-corps #si-U', '115'); await page.press('#fiche-corps #si-U', 'Enter'); await page.waitForTimeout(500);
  await page.click('#fi-fermer'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => !$('inspecteur').hidden && app.cible && app.cible.type === 'fil') && /\/ 4 V$/.test(await chute()), 'fermer la fiche des hypothèses rend celle de W-012, rejugée : 4 V admis sous 115 V', await chute());
  await page.evaluate(() => ficheHypotheses()); await page.waitForTimeout(300); await page.click('#hy-defaut'); await page.waitForTimeout(400); await page.click('#fi-fermer'); await page.waitForTimeout(400);

  console.log('\nl’identité d’un repère : l’emplacement, la zone (103RL1)');
  await bloc('1', '103RL1'); await page.waitForTimeout(400);
  ok(await q(sec('identite') + ' .fc-k', 'xs => xs.map(x => x.textContent).join()') === 'Repère,Zone,Désignation,Emplacement' && await q('#eq-nature') === 0, 'l’identité : Repère, Zone, Désignation, Emplacement — plus de nature, plus de folio');
  await page.fill('#eq-emp', 'baie avant, étagère 2'); await page.press('#eq-emp', 'Enter'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => app.contrat.designations.get('103RL1|emplacement') === 'baie avant, étagère 2' && /baie avant/.test(document.querySelector('#ba-equip details[data-section="identite"] .fs-resume').textContent)), 'l’emplacement s’écrit au contrat et se lit dans le résumé');
  await page.fill('#ba-equip [data-zone]', '105'); await page.press('#ba-equip [data-zone]', 'Enter'); await page.waitForTimeout(900);
  ok(await page.evaluate(() => app.cible.nom === '105RL1' && verite().some(l => l.de === '105RL1' || l.vers === '105RL1') && app.contrat.designations.get('105RL1|emplacement') === 'baie avant, étagère 2' && $('eq-rep').value === '105RL1'), 'la zone changée (105) renomme le repère : 105RL1, chaque fil suit, l’emplacement aussi');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => app.cible && app.cible.nom === '103RL1' && verite().some(l => l.vers === '103RL1') && !$('inspecteur').hidden), 'Ctrl+Z rend 103RL1, la fiche reprend son nom');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(600);
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
