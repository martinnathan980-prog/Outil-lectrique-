/* ===========================================================================
   LES CONTRATS DÉJÀ FAITS ET LE DESSIN (FWD), à l'écran.
       node tests/fwd.js [--fichier=chemin]
   Une base d'essai (trois machines, dix dessins), puis à la vraie souris :
     · « Déjà fait » sur 102CB1 dit le dessin de chaque machine et ce qui y manque ;
     · la comparaison a trois échelles (équipement, voisinage à un ou deux pas,
       dessin entier), ses repères lus avec les nôtres ;
     · « Dessin » ouvre le calque : le FWD dessiné par le moteur, l'équipement
       comparé encadré, la colonne qui explique chaque repère, la recherche, un
       clic qui choisit, Échap qui ferme ; « Comparer » revient à la comparaison
       du dessin entier ;
     · reprendre à l'échelle du dessin ajoute les lignes cochées (avec la route,
       sans la longueur de l'autre machine), Ctrl+Z les rend ;
     · la bible cherche un repère et ouvre son dessin ;
     · un repère proposé « ? » se confirme ou se corrige d'un clic sur sa puce
       (nos repères de même code, tous, « nouveau chez nous », revenir à la
       proposition) ; le choix vaut à toutes les échelles et sur le calque.
   Rend 1 au premier échec.
   =========================================================================== */
const { chromium } = require('playwright');
const P = require('./pilote');
const FICHIER = P.fichierDemande();
// la base d'essai : l'exemple décalé de deux centaines (H-1, un dessin par folio, une ligne en plus, une en moins, un type changé),
// soixante lignes de l'exemple (H-2), le folio 2 avec une barrette écrite « module 51, contact B » (H-3)
function baseEssai() {
  const d = r => /G$/.test(r) ? r : r.replace(/^(\d)(\d\d)([A-Z]+)(\d*)/, (m, a, b, c, e) => String(+a + 2) + b + c + e), E = contratExemple(), F = (p, v) => 'MEE256A78150' + String(p).padStart(2, '0') + v;
  const H1 = E.map(l => liaison({ ...l, de: d(l.de), vers: d(l.vers), fwd: F(l.plan, 'A'), harness: 'H-1', appareil: 'H160', retest: '08/07/2024', longueur: 2500 })).filter(l => l.cable !== 'W-014').map(l => l.cable === 'W-012' ? liaison({ ...l, type: 'DR16' }) : l);
  H1.push(liaison({ de: '302CB1', borneDe: '3', pnDe: 'MS3320-10', vers: '305XX9', borneVers: '1', pnVers: 'ZZZ', cable: 'W-099', type: 'DR20', plan: '1', fwd: F(1, 'A'), harness: 'H-1', appareil: 'H160', longueur: 2500 }));
  H1.push(liaison({ de: '305XX9', borneDe: '2', pnDe: 'ZZZ', vers: '901G', borneVers: '', cable: 'W-098', type: 'DR20', plan: '1', fwd: F(1, 'A'), harness: 'H-1', appareil: 'H160', longueur: 2500 }));
  const H2 = E.slice(0, 60).map(l => liaison({ ...l, fwd: F(l.plan, 'B'), harness: 'H-2', appareil: 'H175', retest: '27/10/2025' }));
  const H3 = E.filter(l => l.plan === '2').map(l => { const m = r => r === '667VT21' ? '677VT2' : r, b = (r, bo) => r === '667VT21' ? '5' + bo + 'B' : bo;
    return liaison({ ...l, de: m(l.de), borneDe: b(l.de, l.borneDe), vers: m(l.vers), borneVers: b(l.vers, l.borneVers), fwd: F(2, 'C'), harness: 'H-3', appareil: 'H160', retest: '12/03/2025', descriptionDe: l.de === '210SP1' ? 'CALCULATEUR' : '' }); });
  adopterReferences([...H1, ...H2, ...H3], 'essai');
}
// H-4, ajoutée plus tard : le folio 1 décalé dont le relais et la lampe n'ont ni le même repère ni de part number — l'outil ne peut les relier que par les voisins (« ? »)
function ajouterH4() {
  const d = r => /G$/.test(r) ? r : r.replace(/^(\d)(\d\d)([A-Z]+)(\d*)/, (m, a, b, c, e) => String(+a + 2) + b + c + e), E = contratExemple(), F = (p, v) => 'MEE256A78150' + String(p).padStart(2, '0') + v;
  const m4 = r => ({ '303RL1': '303RL7', '304LP1': '304LP5' })[r] || r, sansPn = r => r === '303RL7' || r === '304LP5';
  const H4 = E.filter(l => l.plan === '1').map(l => { const de = m4(d(l.de)), vers = m4(d(l.vers)); return liaison({ ...l, de, vers, pnDe: sansPn(de) ? '' : l.pnDe, pnVers: sansPn(vers) ? '' : l.pnVers, fwd: F(1, 'D'), harness: 'H-4', appareil: 'H160', retest: '02/02/2023' }); });
  adopterReferences([...app.references.liaisons, ...H4], 'essai');
}
(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  let ko = 0; const ok = (c, nom, detail) => { if (!c) ko++; console.log('  ' + (c ? 'ok ' : 'KO ') + ' ' + nom + (detail ? '   ' + detail : '')); };
  const page = await nav.newPage({ viewport: { width: 1600, height: 950 } }); page.setDefaultTimeout(120000);
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined');
  await page.evaluate(baseEssai); await page.waitForTimeout(300);
  await page.evaluate(() => { allerAuPlan('1'); choisirBloc(app.dessin.comps.find(k => k.name === '102CB1' && k.kind !== 'tag')); }); await page.waitForTimeout(500);
  // « Déjà fait » : deux machines, chacune avec son dessin et ce qui y manque
  ok(await page.evaluate(() => { const d = document.querySelector('#ba-equip .fi-deja'), cs = d ? [...d.querySelectorAll('.fi-cand')] : [];
    return cs.length === 2 && cs[0].dataset.fwd === 'MEE256A7815001B' && /5\séquipements/.test(cs[0].textContent) && /5\schez\snous/.test(cs[0].textContent) && cs[1].dataset.rep === '302CB1' && /il manque 305XX9/.test(cs[1].textContent) && /1\sfil diffère/.test(cs[1].textContent) && /disjoncteur n° 1 · zone 302/.test(cs[1].textContent) && /3\smachines\s· 10\sdessins/.test(d.textContent); }),
    '« Déjà fait » sur 102CB1 : H-2 (dessin …001B, 5 équipements, 5 chez nous) et H-1/302CB1 (il manque 305XX9, 1 fil diffère), le repère dit en mots');
  // la comparaison avec H-1/302CB1 : trois échelles
  await page.click('#ba-equip .fi-cand[data-rep="302CB1"]'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => app.cible && app.cible.type === 'ref' && document.querySelectorAll('#ba-equip .cp-portee [data-portee]').length === 3 && document.querySelector('#ba-equip .cp-portee [data-portee="equipement"]').getAttribute('aria-pressed') === 'true' && /Dessin MEE256A7815001A/.test(document.querySelector('#ba-equip .cp-bilan').textContent) && !!document.getElementById('cp-dessin') && document.querySelectorAll('#ba-equip .cp-liste .fi-fil.cp-manque').length === 1 && document.querySelectorAll('#ba-equip .cp-liste .fi-fil.cp-differe').length === 1),
    'la comparaison s’ouvre à l’échelle de l’équipement : trois échelles, le bilan du dessin, le bouton « Dessin », une ligne qui manque et une qui diffère');
  await page.click('#ba-equip .cp-portee [data-portee="voisinage"]'); await page.waitForTimeout(400);
  const V1 = await page.evaluate(() => ({ eq: document.querySelectorAll('#ba-equip .cp-liste .fi-groupe.cp-eq').length, manque: document.querySelectorAll('#ba-equip .cp-liste .fi-groupe.cp-eq-manque').length, bilan: document.querySelector('#ba-equip .cp-bilan').textContent, pas: document.querySelectorAll('#ba-equip .cp-portee .cp-pas').length }));
  ok(V1.eq === 5 && V1.manque === 1 && /Voisinage à 1\spas/.test(V1.bilan) && /il manque 305XX9/.test(V1.bilan) && V1.pas === 2, 'le voisinage à un pas : 5 équipements (302CB1 et ses voisins), 305XX9 manque chez nous, les puces 1 pas / 2 pas', JSON.stringify(V1));
  await page.click('#ba-equip .cp-portee [data-pas="2"]'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.querySelectorAll('#ba-equip .cp-liste .fi-groupe.cp-eq').length === 6 && /2\spas/.test(document.querySelector('#ba-equip .cp-bilan').textContent)), 'à deux pas : 304LP1 entre dans le voisinage (6 équipements)');
  await page.click('#ba-equip .cp-portee [data-portee="dessin"]'); await page.waitForTimeout(400);
  const VD = await page.evaluate(() => ({ eq: document.querySelectorAll('#ba-equip .cp-liste .fi-groupe.cp-eq').length, lignes: document.querySelectorAll('#ba-equip .cp-liste .fi-fil').length, coches: document.querySelectorAll('#ba-equip .cp-coche').length, corr: [...document.querySelectorAll('#ba-equip .fi-chip.cp-corr-nouveau')].map(x => x.textContent), bilan: document.querySelector('#ba-equip .cp-bilan').textContent }));
  ok(VD.eq === 6 && VD.coches === 5 && /^Dessin/.test(VD.bilan) && /6\séquipements/.test(VD.bilan) && /5\schez\snous/.test(VD.bilan) && /2\smanquent/.test(VD.bilan) && VD.corr.some(t => /305XX9/.test(t)), 'le dessin entier : 6 équipements, chaque ligne sous ses deux bouts, 5 cases à cocher (3 lignes uniques, deux d’entre elles sous deux équipements), 305XX9 nouveau chez nous', JSON.stringify(VD));
  // reprendre à l'échelle du dessin : tout cocher, reprendre, Ctrl+Z
  const avant = await page.evaluate(() => verite().length);
  await page.click('#cp-tout'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => /Reprendre 3/.test($('cp-reprendre').textContent) && !$('cp-reprendre').disabled), 'tout cocher : trois lignes uniques à reprendre');
  await page.click('#cp-reprendre'); await page.waitForTimeout(1200);
  ok(await page.evaluate(n => verite().length === n + 3 && verite().some(l => l.de === '102CB1' && l.borneDe === '3' && l.vers === '305XX9' && l.pnDe === 'MS3320-10' && !l.cable) && verite().some(l => l.de === '305XX9' && l.vers === '901G') && app.dessin.comps.some(c => c.name === '305XX9'), avant), 'reprendre : 102CB1:3 → 305XX9, 305XX9 → 901G et le fil qui différait entrent au contrat, recâblés sur nos repères, sans numéro');
  ok(await page.evaluate(n => verite().slice(n).every(l => l.longueur === undefined) && verite().slice(n).some(l => l.route === 'PUISSANCE'), avant), 'les lignes reprises ne portent pas les 2,5 m mesurés sur H-1 (l’hypothèse sert, la fiche le dit) mais gardent la route');
  await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(800);
  ok(await page.evaluate(n => verite().length === n, avant), 'Ctrl+Z défait la reprise');
  // le calque du dessin, depuis la comparaison
  await page.evaluate(() => { choisirBloc(app.dessin.comps.find(k => k.name === '102CB1' && k.kind !== 'tag')); }); await page.waitForTimeout(400);
  await page.click('#ba-equip .fi-cand[data-rep="302CB1"]'); await page.waitForTimeout(400); await page.click('#cp-dessin');
  await page.waitForFunction(() => document.querySelector('#fw-vue .comp[data-name]')); await page.waitForTimeout(400);
  const FW = await page.evaluate(() => ({ visible: !$('fwd').hidden, titre: $('fw-titre').textContent, cible: !!document.querySelector('#fw-vue .comp[data-name="302CB1"].fw-cible'), chez: document.querySelectorAll('#fw-vue .comp.fw-chez').length, manque: !!document.querySelector('#fw-vue .comp[data-name="305XX9"].fw-manque'), filsManque: document.querySelectorAll('#fw-vue .cab.fw-l-manque').length, filsDiff: document.querySelectorAll('#fw-vue .cab.fw-l-differe').length,
    items: document.querySelectorAll('#fw-liste .fw-eq').length, premier: document.querySelector('#fw-liste .fw-eq').dataset.nom, mots: document.querySelector('#fw-liste .fw-eq').textContent, bilan: document.querySelector('.fw-bilan').textContent, comparer: !$('fw-comparer').hidden }));
  ok(FW.visible && FW.titre === 'MEE256A7815001A' && FW.cible && FW.chez >= 4 && FW.manque && FW.filsManque === 2 && FW.filsDiff === 1 && FW.items === 6 && FW.premier === '302CB1' && /disjoncteur n° 1 · zone 302/.test(FW.mots) && /relié à/.test(FW.mots) && /5\schez\snous/.test(FW.bilan) && /1 manque/.test(FW.bilan) && FW.comparer,
    'le calque dessine MEE256A7815001A : 302CB1 encadré, les autres chez nous, 305XX9 en manque, deux fils qui manquent et un qui diffère en pointillé ; la colonne explique chaque repère, le comparé d’abord', JSON.stringify(FW));
  await page.fill('#fw-q', 'relais'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.querySelectorAll('#fw-liste .fw-eq').length === 1 && document.querySelector('#fw-liste .fw-eq').dataset.nom === '303RL1'), 'la recherche de la colonne filtre : « relais » ne laisse que 303RL1');
  await page.fill('#fw-q', ''); await page.waitForTimeout(300);
  await page.click('#fw-liste .fw-eq[data-nom="305XX9"]'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.querySelector('#fw-liste .fw-eq[data-nom="305XX9"]').classList.contains('on') && !!document.querySelector('#fw-vue .comp[data-name="305XX9"].fw-on')), 'un clic sur un repère de la colonne le choisit sur le dessin');
  const zoom0 = await page.evaluate(() => FWD.vue.s); await page.keyboard.press('+'); await page.waitForTimeout(200);
  ok(await page.evaluate(s => FWD.vue.s > s && !$('fwd').hidden && app.cible && app.cible.type === 'ref', zoom0), 'le clavier appartient au calque : + zoome, la fiche derrière ne bouge pas');
  await page.click('#fw-comparer'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => $('fwd').hidden && app.cible && app.cible.type === 'ref' && app.cible.fwd === 'MEE256A7815001A' && REF.portee === 'dessin' && document.querySelector('#ba-equip .cp-portee [data-portee="dessin"]').getAttribute('aria-pressed') === 'true'), '« Comparer » ferme le calque et ouvre la comparaison du dessin entier');
  await page.click('#cp-dessin'); await page.waitForFunction(() => document.querySelector('#fw-vue .comp[data-name]')); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => $('fwd').hidden && app.cible && app.cible.type === 'ref' && !$('inspecteur').hidden), 'Échap ferme le calque, et seulement lui');
  await page.evaluate(() => { REF.portee = 'equipement'; deselectionner(); });
  // la bible : la base par harness et par dessin, la recherche, un dessin qui s'ouvre
  await page.evaluate(() => ficheBible('')); await page.waitForTimeout(500);
  ok(await page.evaluate(() => !!$('rf-q') && document.querySelectorAll('#rf-base .rf-tab').length === 2 && document.querySelectorAll('#rf-base .rf-voir').length === 10 && /3\sharness/.test(document.querySelector('#fiche-corps').textContent) && /10\sdessins/.test(document.querySelector('#fiche-corps').textContent)), 'la bible : trois harness, dix dessins, chacun avec son bouton');
  await page.fill('#rf-q', '677VT'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.activeElement === $('rf-q') && document.querySelectorAll('#rf-base .rf-voir').length === 1 && document.querySelector('#rf-base .rf-voir').dataset.rep === '677VT2' && /barrette de jonction n° 2/.test($('rf-base').textContent) && /H-3/.test($('rf-base').textContent)), 'chercher « 677VT » : le repère 677VT2 de H-3, décodé, et son dessin — le champ garde le focus');
  await page.click('#rf-base .rf-voir'); await page.waitForFunction(() => document.querySelector('#fw-vue .comp[data-name]')); await page.waitForTimeout(400);
  const FB = await page.evaluate(() => ({ titre: $('fw-titre').textContent, choisi: !!document.querySelector('#fw-vue .comp[data-name="677VT2"].fw-on') && !!document.querySelector('#fw-liste .fw-eq[data-nom="677VT2"].on'), comparer: $('fw-comparer').hidden, chez: !!document.querySelector('#fw-liste .fw-eq[data-nom="677VT2"].chez'), mots: document.querySelector('#fw-liste .fw-eq[data-nom="677VT2"]').textContent, desc: /CALCULATEUR/.test(document.querySelector('#fw-liste .fw-eq[data-nom="210SP1"]').textContent), differe: document.querySelectorAll('#fw-vue .cab.fw-l-differe').length }));
  ok(FB.titre === 'MEE256A7815002C' && FB.choisi && FB.comparer && FB.chez && /→ 667VT21 · même part number/.test(FB.mots) && /4\sdiffèrent/.test(FB.mots) && FB.differe === 4 && FB.desc, 'depuis la bible : le dessin de H-3 s’ouvre sur 677VT2 (choisi), qui est notre 667VT21 par le part number, ses quatre fils aux bornes « module 51, contact B » diffèrent ; la description du retest se lit (CALCULATEUR)', JSON.stringify(FB));
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => $('fwd').hidden && app.fiche && app.fiche.mode === 'bible'), 'Échap ferme le calque, la bible reste');
  // les repères proposés « ? » se confirment ou se corrigent : H-4 (relais et lampe sans part number, reliés par les voisins)
  await page.evaluate(() => { fermerFiche(true); }); await page.evaluate(ajouterH4); await page.waitForTimeout(300);
  await page.evaluate(() => { REF.portee = 'equipement'; allerAuPlan('1'); choisirBloc(app.dessin.comps.find(k => k.name === '102CB1' && k.kind !== 'tag')); }); await page.waitForTimeout(400);
  await page.click('#ba-equip .fi-cand[data-ref="H-4"]'); await page.waitForTimeout(400);
  const Q0 = await page.evaluate(() => [...document.querySelectorAll('#ba-equip .cp-corr')].map(b => b.tagName + ':' + b.textContent));
  ok(Q0.includes('BUTTON:303RL7 → 103RL1\u00a0?') && Q0.includes('BUTTON:301BT1 → 101BT1') && Q0.length === 3, 'contre H-4 : « 303RL7 → 103RL1 ? » (même code, mêmes voisins) ; chaque puce « ses repères, chez nous » est un bouton', Q0.join(' · '));
  await page.click('#ba-equip .cp-corr[data-corr="303RL7"]'); await page.waitForTimeout(300);
  const CH = await page.evaluate(() => ({ note: document.querySelector('#ba-equip .cp-choix .fi-note').textContent, cands: [...document.querySelectorAll('#ba-equip .cp-cand')].map(b => b.dataset.vers), presse: (document.querySelector('#ba-equip .cp-cand[aria-pressed="true"]') || { dataset: {} }).dataset.vers, tous: !!$('cp-corr-tous'), defaire: !!$('cp-corr-defaire'), ouverte: document.querySelector('#ba-equip .cp-corr[data-corr="303RL7"]').getAttribute('aria-expanded') }));
  ok(/303RL7 · relais n° 7 · zone 303/.test(CH.note) && CH.cands[0] === '103RL1' && CH.presse === '103RL1' && CH.cands.includes('381RL1') && !CH.cands.includes('102CB1') && CH.cands[CH.cands.length - 1] === '' && CH.tous && !CH.defaire && CH.ouverte === 'true', 'la puce ouvre le choix : nos relais, la proposition 103RL1 en tête et pressée, « nouveau chez nous », « tous les repères »', JSON.stringify(CH));
  await page.click('#cp-corr-tous'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.querySelectorAll('#ba-equip .cp-cand').length > 40 && document.querySelector('#ba-equip .cp-cand').dataset.vers === '103RL1' && $('cp-corr-tous').getAttribute('aria-pressed') === 'true'), '« tous les repères » ouvre à tout le contrat, la proposition toujours en tête');
  await page.click('#ba-equip .cp-cand[data-vers="103RL1"]'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const b = document.querySelector('#ba-equip .cp-corr[data-corr="303RL7"]'); return b && b.classList.contains('cp-corr-choisi') && b.textContent === '303RL7 → 103RL1 ✓' && !document.querySelector('#ba-equip .cp-choix') && REF.fixes.size === 1 && !/303RL7 \?/.test(document.querySelector('#ba-equip .cp-liste').textContent); }), 'un clic sur la proposition la confirme : le « ? » s’en va de la puce et de la ligne, la puce dit ✓, le choix est gardé');
  await page.click('#ba-equip .cp-portee [data-portee="dessin"]'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => /5\schez\snous\s· 1\sproposé à confirmer/.test(document.querySelector('#ba-equip .cp-bilan').textContent) && !!document.querySelector('#ba-equip .cp-corr[data-corr="304LP5"].cp-corr-voisins') && [...document.querySelectorAll('#ba-equip .cp-eq-vers')].some(x => /103RL1 · votre choix/.test(x.textContent))), 'à l’échelle du dessin, le choix vaut aussi : 303RL7 → 103RL1 « votre choix », reste 304LP5 → 104LP1 ? à confirmer');
  await page.click('#ba-equip .cp-corr[data-corr="304LP5"]'); await page.waitForTimeout(300); await page.click('#ba-equip .cp-cand[data-vers=""]'); await page.waitForTimeout(400);
  const NV = await page.evaluate(() => ({ bilan: document.querySelector('#ba-equip .cp-bilan').textContent, puce: document.querySelector('#ba-equip .cp-corr[data-corr="304LP5"]').textContent, manque: document.querySelectorAll('#ba-equip .cp-eq-manque').length, lignes: document.querySelectorAll('#ba-equip .cp-liste .fi-fil.cp-manque').length }));
  ok(/4\schez\snous\s· il manque 304LP5 voyant/.test(NV.bilan) && !/à confirmer/.test(NV.bilan) && NV.puce === '304LP5 → 304LP5 (nouveau)' && NV.manque === 1 && NV.lignes >= 1, '« nouveau chez nous » pour 304LP5 : il manque chez nous, plus rien à confirmer, ses lignes manquent', JSON.stringify(NV));
  await page.click('#cp-dessin'); await page.waitForFunction(() => document.querySelector('#fw-vue .comp[data-name]')); await page.waitForTimeout(400);
  ok(await page.evaluate(() => !!document.querySelector('#fw-vue .comp[data-name="303RL7"].fw-chez') && !!document.querySelector('#fw-vue .comp[data-name="304LP5"].fw-manque') && /votre choix/.test(document.querySelector('#fw-liste .fw-eq[data-nom="303RL7"]').textContent)), 'le calque suit les choix : 303RL7 chez nous (votre choix), 304LP5 en manque');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.click('#ba-equip .cp-corr[data-corr="304LP5"]'); await page.waitForTimeout(300); await page.click('#cp-corr-defaire'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.querySelector('#ba-equip .cp-corr[data-corr="304LP5"]').textContent === '304LP5 → 104LP1\u00a0?' && REF.fixes.size === 1), '« revenir à la proposition de l’outil » rend 304LP5 → 104LP1 ?');
  ok(await page.evaluate(() => { const n = app.nom; app.nom = 'autre.xlsx'; const k = fixesPour('H-4').size; app.nom = n; return k === 0 && fixesPour('H-4').size === 1; }), 'les choix sont à ce contrat : un autre fichier n’en hérite pas');
  await page.evaluate(() => { REF.portee = 'equipement'; REF.fixes.clear(); deselectionner(); });
  ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
  // au téléphone : le calque se montre, en pile
  const tel = await nav.newPage({ viewport: { width: 390, height: 844 } }); const err2 = []; tel.on('pageerror', e => err2.push(e.message));
  await tel.goto(FICHIER); await tel.waitForFunction(() => typeof atelier !== 'undefined'); await tel.evaluate(baseEssai); await tel.waitForTimeout(300);
  await tel.evaluate(() => ouvrirFwd({ harness: 'H-2', fwd: 'MEE256A7815001B', repere: '102CB1', notre: '102CB1' })); await tel.waitForFunction(() => document.querySelector('#fw-vue .comp[data-name]')); await tel.waitForTimeout(300);
  ok(await tel.evaluate(() => { const s = $('fw-scene').getBoundingClientRect(), c = $('fw-colonne').getBoundingClientRect(); return !$('fwd').hidden && c.top >= s.bottom - 1 && s.width > 300; }) && !err2.length, 'au téléphone, la colonne passe sous le dessin, sans erreur', err2.join(' | '));
  console.log('\n  ' + (ko ? ko + ' échec(s)' : 'tout tient'));
  await nav.close(); process.exit(ko ? 1 : 0);
})();
