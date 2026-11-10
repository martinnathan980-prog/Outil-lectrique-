/* ===========================================================================
   LES FONCTIONS DE NOVEMBRE 2026 (v90 à v95) — jouées dans le navigateur, sur le plan d'exemple.

   Le lecteur : « tout est brillant… je te laisse carte blanche ». Cinq fonctions sont entrées vite ; cette batterie joue le
   trajet de chacune, pour qu'aucune ne casse sans bruit :

     1. NOUVEL INDICE (08-nouvel-indice) : un indice B donné, la phrase du bilan, « Passer à cet indice », les évolutions
        marquées sur le folio, « Effacer les marques », « Défaire » ;
     2. PLAN VIVANT (08-vivant) : tout fermé, un disjoncteur ouvert, un relais ouvert, un câble coupé, « Tout refermer »,
        « Quitter » qui ne laisse rien ;
     3. FICHE D'ATELIER (08-papier-atelier) : le bouton de l'onglet Pièces, la feuille préparée en clair avec sa tête,
        l'outillage sous un contact à sertir, tout remis après ;
     4. BILAN ÉLECTRIQUE (08-sources) : l'exemple, puis trois disjoncteurs (le connu, le partiel, l'inconnu nommé), l'Excel ;
     5. VUE D'ENSEMBLE (08-vue-ensemble) : quatre plans, leurs liens, les équipements partagés, un clic ouvre le plan ;
     6. L'ACCOUPLEMENT DÉDUIT (09-barrettes, `accouplementDeduit`) : quatre familles lues, rien quand on ne sait pas.

       node tests/fonctions.js            (Playwright : NODE_PATH=$(npm root -g))
   Rend 1 au premier échec.
   =========================================================================== */
const { ouvrir, exemple, montrer, grand, onglet } = require('./ecran/commun.js');

(async () => {
  let ko = 0; const ok = (nom, c, detail) => { if (!c) ko++; console.log('  ' + (c ? 'ok ' : 'KO ') + ' ' + nom + (!c && detail ? '   ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); };
  const A = await ouvrir({ l: 1440, h: 900, theme: 'clair' }), p = A.p; await exemple(p);
  const menu = async act => { await p.click('#btnMenu'); await p.waitForTimeout(250); await p.click('#menu [data-act="' + act + '"]'); await p.waitForTimeout(450); };

  /* ---- 1. nouvel indice ------------------------------------------------------------------------------------------- */
  console.log('\n1. Nouvel indice : ce qui a changé, passer dessus, les marques sur le folio, défaire');
  const csv = await p.evaluate(() => { const E = contratExemple().map(l => ({ ...l }));
    E[0].type = 'DR12'; E[4].route = 'SIGNAL-2'; E[12].pnVers = 'ABS0864-14'; E[2].borneVers = '9'; E.splice(9, 1);
    E.push({ de: '102CB1', borneDe: '2', pnDe: 'MS3320-10', vers: '999XX1', borneVers: '4', pnVers: '', cable: 'W-900', type: 'DR20', route: 'PUISSANCE', plan: '1' });
    const e = l => [(l.ecrit && l.ecrit.de) || l.de, (l.ecrit && l.ecrit.borneDe) || l.borneDe, l.pnDe, l.type, l.cable, l.route, (l.ecrit && l.ecrit.vers) || l.vers, (l.ecrit && l.ecrit.borneVers) || l.borneVers, l.pnVers, l.plan].join(';');
    return ['Device1;Pin1;PN1;Cable TG;Cable Tag;Route;Device2;Pin2;PN2;Plan', ...E.map(e)].join('\n'); });
  await menu('indice');
  ok('le menu ouvre « Nouvel indice »', await p.evaluate(() => /Nouvel indice/.test(document.querySelector('#fiche .titre').textContent)));
  await p.setInputFiles('#in-fichier', { name: 'exemple-indice-B.csv', mimeType: 'text/csv', buffer: Buffer.from(csv, 'utf8') });
  await p.waitForSelector('#in-bilan', { timeout: 15000 }); await p.waitForTimeout(300);
  const lu = await p.evaluate(() => ({ phrase: document.querySelector('.in-phrase').textContent, sections: [...document.querySelectorAll('.in-bloc .hy-titre')].map(h => h.textContent) }));
  ok('la phrase dit les quatre sortes', lu.phrase === '1 liaison ajoutée, 1 retirée, 3 changées, 1 rebranchée', lu.phrase);
  ok('une section par sorte, et les équipements', ['Changées', 'Rebranchées', 'Ajoutées', 'Retirées', 'Équipements'].every((t, i) => (lu.sections[i] || '').startsWith(t)), lu.sections);
  await p.click('#in-passer'); await p.waitForTimeout(1500);
  const ap = await p.evaluate(() => ({ n: verite().length, neuf: verite().some(l => l.vers === '999XX1'), type0: verite()[0].type, toast: document.getElementById('toast').textContent, marques: MARQUES_INDICE.fils.size, halos: document.querySelectorAll('#scene .cab.in-neuf').length, bandeau: (document.getElementById('indice-marques') || {}).innerText || '' }));
  ok('les liaisons du fichier ont remplacé celles du plan', ap.n === 223 && ap.neuf && ap.type0 === 'DR12', ap);
  ok('le message le dit et propose « Défaire »', /VOLTA est passé au nouvel indice/.test(ap.toast) && /Défaire/.test(ap.toast), ap.toast);
  ok('les évolutions sont marquées sur le folio, le bandeau nomme les folios', ap.marques === 5 && ap.halos > 0 && /5 liaisons/.test(ap.bandeau) && /folios/.test(ap.bandeau), ap);
  await p.click('#indice-marques [data-in-effacer]'); await p.waitForTimeout(300);
  ok('« Effacer les marques » les retire', await p.evaluate(() => !document.getElementById('indice-marques') && !document.querySelector('#scene .cab.in-neuf')));
  await p.evaluate(() => annuler()); await p.waitForTimeout(800);
  ok('« Défaire » rend l’indice d’avant', await p.evaluate(() => verite().length === 223 && verite()[0].type === 'DR16' && !verite().some(l => l.vers === '999XX1')));

  /* ---- 2. plan vivant --------------------------------------------------------------------------------------------- */
  console.log('\n2. Plan vivant : ouvrir un disjoncteur, un relais, couper un câble');
  await p.evaluate(() => allerAuPlan(plans()[0])); await p.waitForTimeout(500); await menu('vivant');
  const centre = nom => p.evaluate(nom => { const g = document.querySelector('#scene .comp[data-name="' + nom + '"] .body') || document.querySelector('#scene .comp[data-name="' + nom + '"]'); const r = g.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, nom);
  const etat = () => p.evaluate(() => ({ dit: document.querySelector('#vivant .vv-dit').innerText.replace(/\n/g, ' | '), vifs: document.querySelectorAll('#scene .cab.vv-vif').length, morts: document.querySelectorAll('#scene .cab.vv-mort').length, prives: VIVANT.E.prives }));
  let e = await etat();
  ok('tout fermé : rien n’est privé de courant, et le bandeau dit quoi faire', /Tout est fermé/.test(e.dit) && e.vifs > 0 && !e.morts && !e.prives.length, e);
  const cb = await centre('102CB1'); await p.mouse.click(cb.x, cb.y); await p.waitForTimeout(400); e = await etat();
  ok('102CB1 ouvert : ses quatre équipements sont privés de courant', /102CB1 ouvert/.test(e.dit) && e.prives.join() === '103RL1,104LP1,300XC1,391LP1' && e.morts > 0, e);
  ok('le clic n’ouvre pas la fiche', await p.evaluate(() => document.getElementById('inspecteur').hidden));
  await p.mouse.click(cb.x, cb.y); await p.waitForTimeout(300);
  const rl = await centre('103RL1'); await p.mouse.click(rl.x, rl.y); await p.waitForTimeout(400); e = await etat();
  ok('103RL1 ouvert : seul 104LP1 est privé de courant', /103RL1 ouvert/.test(e.dit) && e.prives.join() === '104LP1', e);
  await p.click('#vivant [data-vv="refermer"]'); await p.waitForTimeout(300);
  const pt = await p.evaluate(() => { const L = liaisonsDuPlan(), w = [...document.querySelectorAll('#scene .cab.vv-vif')].find(x => x.dataset.i.split(' ').some(i => L[+i] && L[+i].vers === '104LP1')), n = w.getTotalLength(), q = w.getPointAtLength(n / 2), m = w.getScreenCTM(); return { x: q.x * m.a + q.y * m.c + m.e, y: q.x * m.b + q.y * m.d + m.f }; });
  await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(400); e = await etat();
  ok('un câble coupé : 104LP1 est privé de courant', /1 câble coupé/.test(e.dit) && e.prives.join() === '104LP1', e);
  await p.click('#vivant [data-vv="quitter"]'); await p.waitForTimeout(300);
  ok('« Quitter » ne laisse rien', await p.evaluate(() => !document.getElementById('vivant') && !document.getElementById('scene').classList.contains('vivant') && !document.querySelector('#scene .vv-vif, #scene .vv-mort, #scene .vv-ouvert')));

  /* ---- 3. fiche d'atelier ----------------------------------------------------------------------------------------- */
  console.log('\n3. Fiche d’atelier : la feuille de l’objet, en clair, avec l’outillage');
  const plan = await p.evaluate(() => { for (const pl of plans()) { allerAuPlan(pl); if (app.dessin.comps.some(c => c.name === '300XC1')) return pl; } return plans()[0]; });
  await p.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await montrer(p, { nom: '300XC1', plan }); await grand(p); await onglet(p, 'fabrication');
  const at = await p.evaluate(() => { const b = document.querySelector('#nv-p-fabrication [data-atelier]'), outil = (document.querySelector('#nv-p-fabrication .vu-outil') || {}).textContent || ''; const fin = preparerFicheAtelier();
    const pret = { classe: document.body.classList.contains('atelier'), theme: document.documentElement.dataset.theme, tete: (document.querySelector('#inspecteur .at-tete') || {}).textContent || '' }; fin();
    return { bouton: !!b, outil, pret, apres: { classe: document.body.classList.contains('atelier'), theme: document.documentElement.dataset.theme, tete: !!document.querySelector('.at-tete') } }; });
  ok('l’onglet Pièces porte « Fiche d’atelier »', at.bouton);
  ok('un contact à sertir dit son outillage', /^Outillage\s:\spince\s/.test(at.outil), at.outil);
  ok('la feuille se prépare en clair, avec le plan et la date', at.pret.classe && at.pret.theme === 'light' && /Fiche d’atelier/.test(at.pret.tete) && /VOLTA/.test(at.pret.tete), at.pret);
  ok('après, l’écran revient comme il était (sombre)', !at.apres.classe && at.apres.theme === 'dark' && !at.apres.tete, at.apres);
  await p.evaluate(() => { document.documentElement.dataset.theme = 'light'; reduireFiche(); deselectionner(); }); await p.waitForTimeout(300);

  /* ---- 4. bilan électrique ---------------------------------------------------------------------------------------- */
  console.log('\n4. Bilan électrique : le connu, le partiel, l’inconnu nommé');
  await menu('bilanelec');
  const b1 = await p.evaluate(() => { const B = bilanElectrique(); return { n: B.n, perm: B.perm, source: B.sources[0].source, pied: (document.querySelector('#fiche .hy-etat') || {}).textContent || '', table: document.querySelectorAll('#fiche .be-table tbody tr').length }; });
  ok('l’exemple : 102CB1 sous 101BT1, 5 A en permanence', b1.n === 1 && b1.perm === 5 && b1.source === '101BT1' && b1.table === 1 && /1 disjoncteur · 5\sA en permanence/.test(b1.pied), b1);
  const b2 = await p.evaluate(() => { const L = [['101BT1', '1', '102CB1', '1'], ['102CB1', '2', '104LP1', '1'], ['101BT1', '2', '105CB2', '1'], ['105CB2', '2', '106PM1', '1'], ['105CB2', '2', '107LP2', '1']].map(([de, borneDe, vers, borneVers]) => ({ de, borneDe, vers, borneVers, type: 'DR20', plan: '1' }));
    chargerContrat(L, 'essai', 'essai-bilan'); app.contrat.charges.set('104LP1', { perm: { i: 2 } }); app.contrat.charges.set('106PM1', { perm: { i: 3 }, dem: { i: 9, t: 2 } });
    const B = bilanElectrique(), x = n => B.sources.flatMap(s => s.lignes).find(l => l.cb === n); return { n: B.n, connu: B.connu, manque: B.manque, a: [x('102CB1').perm, x('102CB1').connu], b: [x('105CB2').perm, x('105CB2').pointe, x('105CB2').connu, x('105CB2').manque] }; });
  ok('deux disjoncteurs : l’un connu (2 A), l’autre en partie (3 A connus, 9 A au démarrage)', b2.n === 2 && b2.a[0] === 2 && b2.a[1] === true && b2.b[0] === 3 && b2.b[1] === 9 && b2.b[2] === false, b2);
  ok('ce qui manque est nommé, jamais compté pour zéro', !b2.connu && b2.manque.join() === '107LP2', b2.manque);
  await p.evaluate(() => ficheBilanElec()); await p.waitForTimeout(400);
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), p.click('#be-excel')]);
  ok('« Enregistrer en Excel » rend un classeur', !!dl && /bilan-electrique\.xlsx$/.test(dl.suggestedFilename()), dl && dl.suggestedFilename());

  /* ---- 5. vue d'ensemble ------------------------------------------------------------------------------------------ */
  console.log('\n5. Vue d’ensemble d’une installation : ses plans, ce qu’ils partagent');
  await p.evaluate(() => { const E = contratExemple(), i = creerInstall('Essai vue d’ensemble'), de = fs => E.filter(l => fs.includes(l.plan)).map(l => ({ ...l }));
    creerPlan(i.id, 'cabine-avant.xlsx', de(['1', '2'])); creerPlan(i.id, 'baie-avionique.xlsx', de(['3', '4'])); creerPlan(i.id, 'soute.xlsx', de(['5'])); creerPlan(i.id, 'queue.xlsx', de(['6']));
    BIB.groupes = null; if (typeof grouperLesPlans === 'function') { try { BIB.groupes = grouperLesPlans(); } catch (_) { } } montrerBibliotheque('install', i.id); });
  await p.waitForTimeout(600); await p.click('#bi-ensemble'); await p.waitForFunction(() => ENSEMBLE.etat === 'pret', null, { timeout: 15000 }); await p.waitForTimeout(300);
  const en = await p.evaluate(() => ({ chiffres: document.querySelector('.en-chiffres').innerText.replace(/\n/g, ' '), noeuds: document.querySelectorAll('.en-noeud').length, traits: document.querySelectorAll('.en-trait').length, communs: [...document.querySelectorAll('.en-communs li b')].map(x => x.textContent) }));
  ok('les chiffres de l’installation', /4 plans 223 liaisons/.test(en.chiffres) && /2 sur plusieurs plans/.test(en.chiffres), en.chiffres);
  ok('la carte : quatre plans, deux liens ; les équipements partagés nommés', en.noeuds === 4 && en.traits === 2 && en.communs.join() === '395SW1,667VT2', en);
  await p.click('.en-noeud'); await p.waitForTimeout(1500);
  ok('un clic sur un plan de la carte l’ouvre', await p.evaluate(() => BIB.vue === 'plan' && /baie-avionique/.test(app.nom)));

  /* ---- 6. l'accouplement déduit ----------------------------------------------------------------------------------- */
  console.log('\n6. Le connecteur d’accouplement déduit : quand la codification se lit, sinon rien');
  const ac = await p.evaluate(() => ['EN2997 RS 0 18 14 A N', 'EN3645 F 0 G N 16 A N', 'EN3646 A 0 14 19 A N', 'E0053 R 12 B 10 S N F', 'EN2997RS61814BN', 'EN4165-2M', 'MS3470L14-5P'].map(accouplementDeduit));
  ok('l’embase donne sa prise mobile, l’autre sexe, écrite comme le fichier', ac.slice(0, 4).join('|') === 'EN2997 RS 6 18 14 B N|EN3645 F 6 G N 16 B N|EN3646 A 6 14 19 B N|E0052 R 12 B 10 P N F', ac.slice(0, 4));
  ok('une prise mobile, une référence qui ne se lit pas : VOLTA ne devine pas', ac.slice(4).every(x => x === ''), ac.slice(4));

  ok('aucune erreur de page', !A.erreurs.length, A.erreurs.slice(0, 3));
  await A.b.close();
  console.log(ko ? '\n' + ko + ' échec(s)' : '\ntout est vert'); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('ERREUR', e.message); process.exit(1); });
