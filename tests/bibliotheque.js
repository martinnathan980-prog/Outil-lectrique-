/* ===========================================================================
   LA BIBLIOTHÈQUE — l'ouverture de Volta : les installations et leurs plans.
       node tests/bibliotheque.js [--fichier=chemin] [--captures=dossier]

   À la vraie souris, sur un grand écran (1440 × 900), dans UN contexte de
   navigateur (le rechargement garde ce que la page a écrit) :
     · le lancement : la bibliothèque sur la table, vide (l'Exemple discret en
       dernier), le nom « Volta » partout (titre, marque) ;
     · créer une installation au clavier, y ajouter des plans par des fichiers
       (plusieurs à la fois : un retest, un fichier à deux harness — un plan
       chacun —, une compta qui le dit dans sa ligne), les ouvrir, revenir
       (le fil de la barre du haut, Échap, « Reprendre ») ;
     · renommer (une installation, un plan — le plan sur la table suit), déplacer
       un plan d'une installation à l'autre, supprimer (la confirmation dans la
       page, jamais une boîte du navigateur ; « Rétablir ») ;
     · la recherche, l'Exemple (et `atelier.exemple()`) ;
     · la base des contrats déjà faits : avec une colonne Install, elle crée
       chaque installation et ses plans ; sans, elle propose de les ranger ;
     · un fichier glissé sur la bibliothèque devient un plan ;
     · la mémoire : rechargée, la bibliothèque est là, le plan resté sur la
       table se reprend, et un plan rouvert a gardé ce qu'on y a fait.
   Rend 1 au premier échec.
   =========================================================================== */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const P = require('./pilote');
const FICHIER = P.fichierDemande();
const CAPTURES = (process.argv.find(a => a.startsWith('--captures=')) || '').slice('--captures='.length);

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  let ko = 0; const ok = (c, nom, detail) => { if (!c) ko++; console.log('  ' + (c ? 'ok ' : 'KO ') + ' ' + nom + (detail ? '   ' + detail : '')); };
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage(); page.setDefaultTimeout(60000);
  const erreurs = [], dialogues = []; page.on('pageerror', e => erreurs.push(e.message));
  page.on('dialog', d => { dialogues.push(d.message()); d.dismiss().catch(() => { }); });
  const capture = async nom => { if (CAPTURES) { await page.waitForTimeout(300); await page.screenshot({ path: path.join(CAPTURES, nom + '.png') }); } };
  const pret = () => page.waitForFunction(() => typeof BIB !== 'undefined' && BIB.pret);
  const vue = () => page.evaluate(() => ({ vue: BIB.vue, install: BIB.install, visible: !$('bibliotheque').hidden, planId: app.planId, nom: app.nom, n: verite().length }));
  const nomInstall = id => page.evaluate(id => (BIB.installs.get(id) || {}).nom, id);
  const plansDe = nom => page.evaluate(nom => { const i = [...BIB.installs.values()].find(x => x.nom === nom); return i ? plansDeInstall(i.id).map(p => p.nom) : null; }, nom);
  // des retests au vrai format, faits des folios de l'exemple : le harness (et l'installation) de chaque folio
  const fabriquer = (lignes, harnessDe, installDe) => page.evaluate(([lignes, hs, is]) => { const E = contratExemple(), en = (is ? 'Install;' : '') + 'Harness;Device1;Pin1;PN1;Cable TG;Cable Tag;Route;Device2;Pin2;PN2;FWD;Appareil;Date retest';
    return [en, ...E.filter(l => lignes.includes(l.plan)).map(l => [...(is ? [is[l.plan]] : []), hs[l.plan], l.de, l.borneDe, l.pnDe, l.type, l.cable, l.route, l.vers, l.borneVers, l.pnVers, 'MEE256A78150' + l.plan.padStart(2, '0') + 'A', 'H160', '08/07/2024'].join(';'))].join('\n'); }, [lignes, harnessDe, installDe || null]);
  const fichier = (nom, texte) => ({ name: nom, mimeType: 'text/csv', buffer: Buffer.from(texte, 'utf8') });

  /* ---- le lancement ---------------------------------------------------------------------------------------------- */
  console.log('\nle lancement : la bibliothèque, et le nom');
  await page.goto(FICHIER); await pret(); await page.waitForTimeout(300);
  const L0 = await page.evaluate(() => ({ titre: document.title, marque: document.querySelector('.en-nom').textContent, vue: BIB.vue, visible: !$('bibliotheque').hidden, vide: !!document.querySelector('#bibliotheque .bi-vide'),
    demo: !!document.querySelector('#bibliotheque .bi-carte.bi-demo[data-install="exemple"]'), n: verite().length, accueil: !$('vide').hidden, recherche: getComputedStyle($('recherche')).visibility, volta: typeof volta !== 'undefined' && volta === atelier }));
  ok(L0.titre === 'Volta' && L0.marque === 'Volta' && L0.volta, 'le nom est « Volta » : le titre de la page, la marque de la barre du haut ; l’API répond aussi à `volta`', JSON.stringify({ titre: L0.titre, marque: L0.marque }));
  ok(L0.vue === 'racine' && L0.visible && L0.vide && L0.demo && !L0.n && !L0.accueil, 'au lancement, la bibliothèque sur la table, vide (deux gestes pour commencer, sans discours), l’Exemple discret en dernier — plus de page d’exemple qui explique', JSON.stringify(L0));
  ok(L0.recherche === 'hidden', 'sur la bibliothèque, la recherche des repères attend le plan');
  await capture('bibliotheque-vide');

  /* ---- une installation, au clavier ------------------------------------------------------------------------------- */
  console.log('\ncréer une installation (son ECP, son nom), y ajouter des plans par des fichiers');
  ok(await page.evaluate(() => !/install\b/i.test(document.querySelector('#bibliotheque').textContent.replace(/installations?/gi, '')) && /Nouvelle installation/.test($('bibliotheque').textContent)), 'on dit « installation », jamais « installation »');
  await page.click('#bibliotheque .bi-vide [data-bi="nouvelle"]'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => document.activeElement && document.activeElement.id === 'bi-ecp-nouvelle'), '« Nouvelle installation » : une carte neuve, le curseur dans son ECP');
  await page.keyboard.type('40217'); await page.waitForTimeout(50);
  ok(await page.evaluate(() => document.activeElement && document.activeElement.id === 'bi-nom-nouvelle'), 'ses cinq chiffres tapés, le clavier passe seul au nom');
  await page.keyboard.type('Antenne VHF'); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
  let v = await vue(); const idAntenne = v.install;
  ok(v.vue === 'install' && await nomInstall(idAntenne) === 'Antenne VHF' && await page.evaluate(id => BIB.installs.get(id).ecp === '40217' && !!document.querySelector('#bibliotheque .bi-zone.bi-zone-grande') && $('en-install').textContent === '40217Antenne VHF' && $('en-install').querySelector('.en-ecp').textContent === '40217' && !$('en-fil').hidden, idAntenne),
    'Entrée la crée et l’ouvre : vide, une grande zone de dépôt, le fil de la barre du haut dit « 40217 Antenne VHF »');
  // trois fichiers d'un geste : un retest, un fichier à deux harness (un plan chacun), une compta
  const a = await fabriquer(['1', '2'], { 1: 'H-ANT-1', 2: 'H-ANT-1' }), b = await fabriquer(['3', '4'], { 3: 'H-ANT-2', 4: 'H-ANT-3' });
  await page.setInputFiles('#fichier-plans', [fichier('antenne-vhf.csv', a), fichier('deux-harness.csv', b), fichier('compta.csv', 'Date;Montant;Libellé\n03/10/2026;1250,00;Fournitures\n')]);
  await page.waitForFunction(() => !BIB.ajouts.some(x => x.etat === 'lecture') && plansDeInstall(BIB.install).length >= 3); await page.waitForTimeout(250);
  const A1 = await page.evaluate(() => ({ plans: plansDeInstall(BIB.install).map(p => p.nom + ':' + p.n), lignes: document.querySelectorAll('#bibliotheque .bi-plan[data-plan]').length, neufs: document.querySelectorAll('#bibliotheque .bi-plan.nouveau .bi-neuf').length,
    ko: (document.querySelector('#bibliotheque .bi-ajout.ko') || {}).textContent || '', deviner: !!document.querySelector('#bibliotheque .bi-ajout.ko [data-bi="deviner"]'), toast: $('toast').textContent, ouvert: verite().length }));
  ok(A1.plans.length === 3 && A1.plans.some(p => /^antenne-vhf\.csv:\d+$/.test(p)) && A1.plans.some(p => /^H-ANT-2:/.test(p)) && A1.plans.some(p => /^H-ANT-3:/.test(p)) && A1.lignes === 3 && A1.neufs === 3,
    'trois plans : le retest, et un par harness du fichier qui en a deux — chacun sa ligne, marquée « nouveau »', A1.plans.join(' · '));
  ok(/compta\.csv n’a pas les en-têtes du retest/.test(A1.ko) && A1.deviner && /3 plans ajoutés à «\s?Antenne VHF\s?»/.test(A1.toast) && !A1.ouvert, 'la compta le dit dans sa ligne (et propose de deviner ses colonnes) ; le mot qui passe compte les plans ajoutés ; rien ne s’ouvre tout seul', A1.toast);
  await capture('ajout-de-plans');
  await page.click('#bibliotheque .bi-ajout.ko [data-bi="oublier-ajout"]'); await page.waitForTimeout(150);
  ok(!(await page.evaluate(() => document.querySelector('#bibliotheque .bi-ajout'))), 'la croix efface le message de la compta');

  /* ---- ouvrir un plan, revenir ------------------------------------------------------------------------------------ */
  console.log('\nouvrir un plan, revenir, reprendre');
  const idA = await page.evaluate(() => plansDeInstall(BIB.install).find(p => p.nom === 'antenne-vhf.csv').id);
  await page.click(`#bibliotheque .bi-plan[data-plan="${idA}"] .bi-plan-ouvrir`); await page.waitForFunction(() => BIB.vue === 'plan' && !!app.dessin); await page.waitForTimeout(300);
  v = await vue();
  ok(v.planId === idA && !v.visible && v.nom === 'antenne-vhf.csv' && v.n > 20 && await page.evaluate(() => !$('folios').hidden && plans().length === 2 && $('en-plan').textContent === 'antenne-vhf' && $('en-install').querySelector('.en-install-nom').textContent === 'Antenne VHF' && getComputedStyle($('recherche')).visibility === 'visible'),
    'un clic ouvre le plan sur la table : ses deux folios, le fil « Antenne VHF / antenne-vhf », la recherche des repères revient', JSON.stringify(v));
  await capture('plan-ouvert');
  // ce qu'on y fait se garde dans le plan
  await page.evaluate(() => { histPush('essai'); app.contrat.designations.set('101BT1', 'batterie principale'); redessiner(); sauver(); }); await page.waitForTimeout(700);
  await page.click('#en-install'); await page.waitForTimeout(250);
  v = await vue();
  ok(v.vue === 'install' && v.install === idAntenne && await page.evaluate(id => { const li = document.querySelector(`#bibliotheque .bi-plan[data-plan="${id}"]`); return !!li && li.classList.contains('sur-table') && /sur la table/.test(li.textContent); }, idA),
    'l’installation du fil ramène à ses plans ; le plan ouvert y est marqué « sur la table »');
  await page.click('#en-biblio'); await page.waitForTimeout(250);
  const R1 = await page.evaluate(() => ({ vue: BIB.vue, reprendre: ($('bi-reprendre') || {}).textContent || '', carte: (document.querySelector('#bibliotheque .bi-carte[data-install] .bi-carte-meta') || {}).textContent || '' }));
  ok(R1.vue === 'racine' && /Reprendre/.test(R1.reprendre) && /antenne-vhf/.test(R1.reprendre) && /3\splans/.test(R1.carte) && /ouverte aujourd’hui/.test(R1.carte), 'la marque ramène à la bibliothèque : « Reprendre » le plan resté sur la table ; la carte dit 3 plans, ouverte aujourd’hui', R1.carte);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  ok((await vue()).vue === 'plan', 'Échap, sur la bibliothèque, reprend le plan');
  await page.evaluate(() => montrerBibliotheque('install', BIB.plans.get(app.planId).install)); await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  ok((await vue()).vue === 'racine', 'Échap, dans une installation, remonte à la bibliothèque');
  await page.click('#bi-reprendre'); await page.waitForTimeout(200);
  ok((await vue()).vue === 'plan' && await page.evaluate(() => app.contrat.designations.get('101BT1') === 'batterie principale'), '« Reprendre » remet le plan, tel qu’on l’a laissé');

  /* ---- renommer, déplacer, supprimer -------------------------------------------------------------------------------- */
  console.log('\nrenommer, déplacer, supprimer — la confirmation dans la page');
  await page.click('#en-biblio'); await page.waitForTimeout(200);
  const carte = `#bibliotheque .bi-carte[data-install="${idAntenne}"]`;
  await page.hover(carte); await page.click(carte + ' .bi-plus'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => !!document.querySelector('#bibliotheque .bi-pop [data-bi="renommer"]') && !!document.querySelector('#bibliotheque .bi-pop [data-bi="supprimer"]')), 'le « ⋯ » d’une carte : Renommer, Supprimer…');
  await page.click('#bibliotheque .bi-pop [data-bi="renommer"]'); await page.waitForTimeout(150);
  await page.keyboard.press('Control+a'); await page.keyboard.type('Antenne VHF/UHF'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
  ok(await nomInstall(idAntenne) === 'Antenne VHF/UHF' && await page.evaluate(id => document.querySelector(`#bibliotheque .bi-carte[data-install="${id}"] .bi-carte-nom`).textContent === 'Antenne VHF/UHF', idAntenne), 'renommée sur place : Entrée garde le nom');
  // une deuxième installation, par le bouton de la tête — sans ECP sous la main : les lettres tapées vont au nom
  await page.click('#bi-nouvelle'); await page.keyboard.type('Cockpit'); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
  const idCockpit = (await vue()).install;
  ok(await nomInstall(idCockpit) === 'Cockpit' && await page.evaluate(id => BIB.installs.get(id).ecp === '' && /ECP\s*à saisir/.test(document.querySelector('.bi-ecp-tete').textContent), idCockpit), '« Nouvelle installation » de la tête, sans ECP : Cockpit, « ECP à saisir » au-dessus de son nom');
  // l'ECP, saisi en tête : trop court, il le dit et reste écrit ; complété, il est gardé
  await page.click('.bi-ecp-tete'); await page.waitForTimeout(100); await page.keyboard.type('388'); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  ok(await page.evaluate(id => BIB.installs.get(id).ecp === '' && /cinq chiffres/.test($('toast').textContent) && $('bi-ecp').value === '388' && $('bi-ecp').classList.contains('faux'), idCockpit), 'un ECP à trois chiffres : le mot qui passe le dit, le champ le garde, marqué');
  await page.keyboard.type('04'); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  ok(await page.evaluate(id => BIB.installs.get(id).ecp === '38804' && !BIB.edition, idCockpit), 'complété : 38804 est gardé');
  // le rail : toutes les installations, par ECP ; Alt+↓ passe à la suivante
  ok(await page.evaluate(() => [...document.querySelectorAll('#bibliotheque .bi-rail-l')].map(b => b.textContent.replace(/\d+$/, '')).join('|')) === '38804Cockpit|40217Antenne VHF/UHF|Exemple', 'le rail : les installations par ECP, l’Exemple en dernier');
  await page.keyboard.press('Alt+ArrowDown'); await page.waitForTimeout(150);
  ok((await vue()).install === idAntenne, 'Alt+↓ passe à l’installation suivante');
  await page.keyboard.press('Alt+ArrowUp'); await page.waitForTimeout(150);
  // la racine : rangées par ECP d'office, par nom sur demande (le choix se garde)
  await page.click('#en-biblio'); await page.waitForTimeout(150);
  const cartes = () => page.evaluate(() => [...document.querySelectorAll('#bibliotheque .bi-grille:not(.bi-grille-demo) .bi-carte-nom')].map(x => x.textContent).join());
  ok(await cartes() === 'Cockpit,Antenne VHF/UHF', 'la racine : rangées par ECP (38804 avant 40217)');
  await page.click('#bibliotheque [data-tri="nom"]'); await page.waitForTimeout(100);
  ok(await cartes() === 'Antenne VHF/UHF,Cockpit' && await page.evaluate(() => preferencesBiblio().tri === 'nom'), 'par nom : Antenne avant Cockpit, et le choix est gardé');
  await page.click('#bibliotheque [data-tri="ecp"]'); await page.waitForTimeout(100);
  await page.fill('#bi-q', '388'); await page.waitForTimeout(100);
  ok(await cartes() === 'Cockpit', 'chercher « 388 » : l’installation de l’ECP 38804');
  await page.fill('#bi-q', ''); await page.waitForTimeout(100);
  // déplacer H-ANT-3 d'Antenne vers Cockpit
  await page.click('#en-biblio'); await page.click(carte + ' .bi-carte-corps'); await page.waitForTimeout(200);
  const id3 = await page.evaluate(() => plansDeInstall(BIB.install).find(p => p.nom === 'H-ANT-3').id), ligne = `#bibliotheque .bi-plan[data-plan="${id3}"]`;
  await page.hover(ligne); await page.click(ligne + ' .bi-plus'); await page.click('#bibliotheque .bi-pop [data-bi="deplacer"]'); await page.waitForTimeout(150);
  await page.click(`#bibliotheque .bi-pop [data-bi="deplacer-vers"][data-vers="${idCockpit}"]`); await page.waitForTimeout(200);
  ok(JSON.stringify(await plansDe('Cockpit')) === '["H-ANT-3"]' && (await plansDe('Antenne VHF/UHF')).length === 2, 'déplacer un plan : « Déplacer vers… » Cockpit — il y est, il n’est plus dans Antenne');
  // renommer le plan qui est sur la table : le plan ouvert suit
  const lA = `#bibliotheque .bi-plan[data-plan="${idA}"]`;
  await page.hover(lA); await page.click(lA + ' .bi-plus'); await page.click('#bibliotheque .bi-pop [data-bi="renommer"]'); await page.waitForTimeout(150);
  await page.keyboard.press('Control+a'); await page.keyboard.type('VHF bord'); await page.keyboard.press('Enter'); await page.waitForTimeout(600);
  ok(await page.evaluate(id => BIB.plans.get(id).nom === 'VHF bord' && app.nom === 'VHF bord' && $('ctx-nom').textContent === 'VHF bord', idA), 'renommer le plan sur la table : le menu (et les exports) suivent');
  // supprimer : la confirmation s'écrit dans la ligne ; « Rétablir »
  const id2 = await page.evaluate(() => plansDeInstall(BIB.install).find(p => p.nom === 'H-ANT-2').id), l2 = `#bibliotheque .bi-plan[data-plan="${id2}"]`;
  await page.hover(l2); await page.click(l2 + ' .bi-plus'); await page.click('#bibliotheque .bi-pop [data-bi="supprimer"]'); await page.waitForTimeout(150);
  ok(await page.evaluate(id => { const c = document.querySelector(`#bibliotheque .bi-plan[data-plan="${id}"] .bi-confirme`); return !!c && /Supprimer «\s?H-ANT-2\s?»/.test(c.textContent) && BIB.plans.has(id); }, id2) && !dialogues.length,
    'supprimer : la confirmation s’écrit dans la ligne (aucune boîte du navigateur), rien n’est encore parti');
  await capture('confirmation');
  await page.click(l2 + ' [data-bi="oui"]'); await page.waitForTimeout(400);
  ok(await page.evaluate(id => !BIB.plans.has(id) && !document.querySelector(`#bibliotheque .bi-plan[data-plan="${id}"]`) && !!document.querySelector('#toast .toast-voir') && /Rétablir/.test($('toast').textContent), id2), '« Supprimer » : le plan part ; le mot qui passe offre « Rétablir »');
  await page.click('#toast .toast-voir'); await page.waitForTimeout(300);
  ok(await page.evaluate(id => BIB.plans.has(id) && !!document.querySelector(`#bibliotheque .bi-plan[data-plan="${id}"]`), id2), '« Rétablir » le rend');
  // supprimer une installation entière (Cockpit et son plan)
  await page.click('#en-biblio'); const cc = `#bibliotheque .bi-carte[data-install="${idCockpit}"]`;
  await page.hover(cc); await page.click(cc + ' .bi-plus'); await page.click('#bibliotheque .bi-pop [data-bi="supprimer"]'); await page.waitForTimeout(150);
  ok(await page.evaluate(id => /Supprimer «\s?Cockpit\s?»/.test(document.querySelector(`#bibliotheque .bi-carte[data-install="${id}"] .bi-confirme`).textContent), idCockpit), 'supprimer une installation : la confirmation s’écrit dans sa carte (ses plans partent avec elle)');
  await page.click(cc + ' [data-bi="oui"]'); await page.waitForTimeout(400);
  ok(await page.evaluate(([i, p]) => !BIB.installs.has(i) && !BIB.plans.has(p) && !document.querySelector(`#bibliotheque .bi-carte[data-install="${i}"]`), [idCockpit, id3]) && !dialogues.length, 'l’installation et son plan sont partis — sans une seule boîte du navigateur');

  /* ---- la recherche, l'exemple ---------------------------------------------------------------------------------- */
  console.log('\nla recherche, l’exemple');
  await page.keyboard.press('/'); await page.waitForTimeout(100);
  ok(await page.evaluate(() => document.activeElement && document.activeElement.id === 'bi-q'), '« / » met le curseur dans la recherche de la bibliothèque');
  await page.keyboard.type('h-ant-2'); await page.waitForTimeout(250);
  ok(await page.evaluate(() => document.querySelectorAll('#bibliotheque .bi-grille:not(.bi-grille-demo) .bi-carte').length === 1 && [...document.querySelectorAll('#bibliotheque .bi-plan[data-plan] .bi-plan-nom b')].map(b => b.textContent).join() === 'H-ANT-2' && document.activeElement.id === 'bi-q'),
    'chercher « h-ant-2 » : l’installation qui le porte, et le plan lui-même dessous ; le champ garde le clavier');
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => !BIB.q && document.querySelectorAll('#bibliotheque .bi-grille:not(.bi-grille-demo) .bi-carte').length === 1), 'Échap efface la recherche');
  await page.click('#bibliotheque .bi-carte.bi-demo .bi-carte-corps'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => BIB.vue === 'install' && BIB.install === 'exemple' && !document.querySelector('#bi-ajouter') && document.querySelectorAll('#bibliotheque .bi-plan[data-plan="exemple"]').length === 1), 'l’Exemple : une installation de démonstration, un plan, rien à y ajouter');
  await page.click('#bibliotheque .bi-plan[data-plan="exemple"] .bi-plan-ouvrir'); await page.waitForFunction(() => app.planId === 'exemple' && !!app.dessin); await page.waitForTimeout(200);
  ok(await page.evaluate(() => app.nom === NOM_EXEMPLE && verite().length === 201 && app.contrat.charges.has('102CB1') && BIB.vue === 'plan' && $('en-install').textContent === 'Exemple'), 'un clic l’ouvre : l’exemple tel qu’il est livré, 201 liaisons, son profil de charge ; le fil dit « Exemple »');
  await page.evaluate(() => montrerBibliotheque()); await page.evaluate(() => atelier.exemple()); await page.waitForTimeout(200);
  ok(await page.evaluate(() => BIB.vue === 'plan' && app.planId === 'exemple' && !app.hist.length && verite().length === 201), '`atelier.exemple()` ouvre l’exemple directement, sans historique — même depuis la bibliothèque');

  /* ---- la base des contrats déjà faits remplit la bibliothèque ------------------------------------------------- */
  console.log('\nla base des contrats déjà faits');
  const base = await fabriquer(['1', '2', '5', '6'], { 1: 'H-R1', 2: 'H-R2', 5: 'H-C1', 6: 'H-C1' }, { 1: 'Radar météo', 2: 'Radar météo', 5: 'Cockpit', 6: 'Cockpit' });
  await page.setInputFiles('#fichier-base', fichier('base-installs.csv', base)); await page.waitForFunction(() => !!app.references); await page.waitForTimeout(400);
  const B1 = await page.evaluate(() => ({ radar: (() => { const i = [...BIB.installs.values()].find(x => x.nom === 'Radar météo'); return i ? plansDeInstall(i.id).map(p => p.nom).join() : null; })(), cockpit: (() => { const i = [...BIB.installs.values()].find(x => x.nom === 'Cockpit'); return i ? plansDeInstall(i.id).map(p => p.nom + ':' + p.folios).join() : null; })(),
    harnais: app.references.index.harnais.size, succes: ($('vf-base') && ($('vf-base').querySelector('.vf-succes') || {}).textContent) || '' }));
  ok(B1.radar === 'H-R1,H-R2' && B1.cockpit === 'H-C1:2' && B1.harnais === 3 && /bibliothèque compte 2\sinstallations/.test(B1.succes), 'une base avec une colonne Install : chaque installation est créée avec ses plans (un par harness, ses dessins en folios) ; elle reste la base « Déjà fait » (3 harness)', JSON.stringify(B1));
  // sans colonne Install : la bibliothèque propose de ranger ses harness
  const base2 = await fabriquer(['3', '4'], { 3: 'H-X1', 4: 'H-X2' });
  await page.setInputFiles('#fichier-base', fichier('base-sans-install.csv', base2)); await page.waitForFunction(() => app.references && app.references.nom === 'base-sans-install.csv'); await page.waitForTimeout(300);
  await page.evaluate(() => { fermerFiche(); montrerBibliotheque('racine'); }); await page.waitForTimeout(200);
  ok(await page.evaluate(() => /compte 2\sharness qui ne sont rangés dans aucune installation/.test((document.querySelector('#bibliotheque .bi-bandeau') || {}).textContent || '')), 'sans colonne Install : la bibliothèque dit les harness qu’aucune installation ne range');
  await page.click('#bibliotheque .bi-bandeau [data-bi="ranger"]'); await page.waitForTimeout(200);
  await page.fill('#bi-ranger-nom', 'Base 2024'); await page.click('#bibliotheque [data-bi="ranger-ok"]'); await page.waitForTimeout(300);
  ok(JSON.stringify(await plansDe('Base 2024')) === '["H-X1","H-X2"]' && (await vue()).vue === 'install' && !(await page.evaluate(() => document.querySelector('#bibliotheque .bi-bandeau'))), '« Les ranger… » : cochés, dans une installation neuve « Base 2024 » — un plan par harness ; la ligne se tait');

  /* ---- glisser un fichier sur la bibliothèque ----------------------------------------------------------------- */
  const c3 = await fabriquer(['3'], { 3: 'H-GLISSE' });
  await page.evaluate(t => { const dt = new DataTransfer(); dt.items.add(new File([t], 'glisse.csv', { type: 'text/csv' }));
    const cible = document.querySelector('#bibliotheque .bi-feuille') || $('bibliotheque');
    cible.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true })); cible.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); }, c3);
  await page.waitForFunction(() => plansDeInstall(BIB.install).some(p => p.nom === 'glisse.csv'));
  ok(await page.evaluate(() => [...BIB.installs.values()].find(i => i.id === BIB.install).nom === 'Base 2024' && !document.body.classList.contains('depot-actif')), 'un retest glissé sur la bibliothèque devient un plan de l’installation qu’on regarde');

  /* ---- la mémoire, après rechargement ------------------------------------------------------------------------- */
  console.log('\nla mémoire, après rechargement');
  await page.evaluate(() => ouvrirPlan([...BIB.plans.values()].find(p => p.nom === 'VHF bord').id)); await page.waitForFunction(() => app.nom === 'VHF bord' && BIB.vue === 'plan');
  await page.evaluate(() => { histPush('essai 2'); app.contrat.designations.set('103RL1', 'relais de la radio'); redessiner(); sauver(); }); await page.waitForTimeout(700);
  await page.evaluate(() => ouvrirPlan('exemple')); await page.waitForFunction(() => app.planId === 'exemple'); await page.waitForTimeout(700);
  await page.reload(); await pret(); await page.waitForTimeout(300);
  const M = await page.evaluate(() => ({ vue: BIB.vue, installs: installsVraies().map(i => i.nom).sort().join(), n: plansVrais().length, reprendre: !!$('bi-reprendre'), table: app.planId }));
  ok(M.vue === 'racine' && M.installs === 'Antenne VHF/UHF,Base 2024,Cockpit,Radar météo' && M.n === 8 && M.reprendre && M.table === 'exemple', 'rechargée : la bibliothèque, ses quatre installations et ses huit plans ; le plan resté sur la table (l’exemple) se reprend', JSON.stringify(M));
  const idVhf = await page.evaluate(() => [...BIB.plans.values()].find(p => p.nom === 'VHF bord').id);
  await page.evaluate(id => montrerBibliotheque('install', BIB.plans.get(id).install), idVhf); await page.click(`#bibliotheque .bi-plan[data-plan="${idVhf}"] .bi-plan-ouvrir`); await page.waitForFunction(() => app.nom === 'VHF bord' && !!app.dessin);
  ok(await page.evaluate(() => app.contrat.designations.get('101BT1') === 'batterie principale' && app.contrat.designations.get('103RL1') === 'relais de la radio' && !app.hist.length), 'le plan rouvert a gardé ce qu’on y a fait (ses deux désignations), son historique repart de zéro');
  await capture('apres-rechargement');
  ok(!dialogues.length, 'aucune boîte du navigateur de toute la batterie', dialogues.join(' | '));
  ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
  console.log('\n  ' + (ko ? ko + ' échec(s)' : 'tout tient'));
  await nav.close(); process.exit(ko ? 1 : 0);
})();
