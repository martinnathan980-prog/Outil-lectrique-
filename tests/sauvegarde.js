/* ===========================================================================
   LA SAUVEGARDE D'ENSEMBLE (08-sauvegarde, v88) — « Tout sauvegarder / tout restaurer ».

   Le lecteur : « Ton travail n'a aucune sauvegarde d'ensemble : faut le faire. » La batterie joue le vrai trajet :

     1. un navigateur où l'on a travaillé — une installation, des plans déposés, une hypothèse changée, un réglage de
        l'IA interne — : « Tout sauvegarder » enregistre UN fichier ;
     2. ce fichier ne porte ni l'adresse, ni le modèle, ni la clé de l'IA interne ;
     3. un navigateur VIDE (un autre poste) : il n'a rien ; on lui donne le fichier, il dit ce qu'il porte, « Restaurer »
        remet tout — les installations, les plans et leurs liaisons, l'hypothèse — et VOLTA redémarre dessus ;
     4. un fichier qui n'est pas une sauvegarde est refusé en mots, sans rien toucher.

       node tests/sauvegarde.js            (Playwright : NODE_PATH=$(npm root -g))
   Rend 1 au premier échec.
   =========================================================================== */
const { chromium } = require('playwright');
const path = require('path'), zlib = require('zlib');
const PAGE = 'file://' + path.resolve(__dirname, '..', 'index.html');

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  let ko = 0; const ok = (nom, c, detail) => { if (!c) ko++; console.log('  ' + (c ? 'ok ' : 'KO ') + ' ' + nom + (detail ? '   ' + detail : '')); };
  const ouvrir = async () => { const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }), page = await ctx.newPage(); page.setDefaultTimeout(60000);
    const erreurs = []; page.on('pageerror', e => erreurs.push(e.message)); await page.goto(PAGE); await page.waitForFunction(() => typeof BIB !== 'undefined' && BIB.pret); await page.waitForTimeout(300); return { ctx, page, erreurs }; };
  const fichier = (nom, texte) => ({ name: nom, mimeType: 'text/csv', buffer: Buffer.from(texte, 'utf8') });
  const etat = page => page.evaluate(() => ({ installs: installsVraies().map(i => i.nom).sort(), plans: plansVrais().map(p => p.nom).sort(), longueur: (app.simu || HYPOTHESES).longueur,
    ia: (() => { try { return localStorage.getItem('volta.ia.reglage') || ''; } catch (_) { return ''; } })() }));
  const ouvrirLEcran = async page => { await page.click('#btnMenu'); await page.click('#menu [data-sous="reglages"]'); await page.waitForTimeout(200); await page.click('#menu [data-act="sauvegarde"]'); await page.waitForTimeout(500); };

  /* ---- 1. un navigateur où l'on a travaillé ---------------------------------------------------------------------- */
  console.log('\n1. un navigateur où l’on a travaillé : « Tout sauvegarder » enregistre un fichier');
  const A = await ouvrir(), pa = A.page;
  const retest = lignes => pa.evaluate(lignes => { const E = contratExemple(), en = 'Harness;Device1;Pin1;PN1;Cable TG;Cable Tag;Route;Device2;Pin2;PN2';
    return [en, ...E.filter(l => lignes.includes(l.plan)).map(l => ['H-' + l.plan, l.de, l.borneDe, l.pnDe, l.type, l.cable, l.route, l.vers, l.borneVers, l.pnVers].join(';'))].join('\n'); }, lignes);
  await pa.click('#bibliotheque .bi-vide [data-bi="nouvelle"]'); await pa.waitForTimeout(150); await pa.keyboard.type('40217'); await pa.keyboard.type('Antenne VHF'); await pa.keyboard.press('Enter'); await pa.waitForTimeout(300);
  await pa.setInputFiles('#fichier-plans', [fichier('antenne-1.csv', await retest(['1', '2'])), fichier('antenne-2.csv', await retest(['3']))]);
  await pa.waitForFunction(() => plansVrais().length >= 2); await pa.waitForTimeout(600);
  // une hypothèse changée (la longueur supposée), et un réglage de l'IA interne qui ne doit jamais partir
  await pa.evaluate(() => { app.simu = { ...(app.simu || HYPOTHESES), longueur: 7 }; memoriserSimu(); localStorage.setItem('volta.ia.reglage', JSON.stringify({ adresse: 'https://ia.exemple.invalid/v1', modele: 'modele-secret', cle: 'CLE-TRES-SECRETE' })); });
  const E0 = await etat(pa), n0 = await pa.evaluate(async () => { const xs = await toutLireBiblio('contrats'); return xs.reduce((s, c) => s + ((c && (c.liaisons || c.V || [])).length || 0), 0); });
  ok('le navigateur de départ : une installation, trois plans (un par harness), la longueur supposée à 7 m, un réglage de l’IA interne', E0.installs.join() === 'Antenne VHF' && E0.plans.length === 3 && E0.longueur === 7 && /CLE-TRES-SECRETE/.test(E0.ia), JSON.stringify({ ...E0, ia: E0.ia ? 'réglée' : '' }));
  await ouvrirLEcran(pa);
  const P0 = await pa.evaluate(() => ({ mode: app.fiche && app.fiche.mode, titre: (document.querySelector('#fiche .titre') || {}).textContent, liste: [...document.querySelectorAll('#fiche .sv-liste')][0].textContent, quand: $('sv-quand').textContent, bouton: $('sv-sauver').textContent, menu: $('mn-sauvegarde').textContent }));
  ok('⋮ › Réglages › Sauvegarde : ce que ce navigateur garde (« 1 installation · 3 plans »), « Pas encore de sauvegarde », le geste « Tout sauvegarder »',
    P0.mode === 'sauvegarde' && P0.titre === 'Sauvegarde' && /1\sinstallation\s·\s3\splans/.test(P0.liste) && /Pas encore/.test(P0.quand) && P0.bouton === 'Tout sauvegarder' && P0.menu === 'jamais faite', JSON.stringify(P0));
  const [dl] = await Promise.all([pa.waitForEvent('download'), pa.click('#sv-sauver')]);
  const chemin = await dl.path(), octets = require('fs').readFileSync(chemin), nom = dl.suggestedFilename();
  await pa.waitForTimeout(400);
  const P1 = await pa.evaluate(() => ({ quand: $('sv-quand').textContent, toast: ($('toast') || {}).textContent || '' }));
  ok('un fichier s’enregistre (VOLTA-sauvegarde-AAAA-MM-JJ.volta), compressé ; l’écran dit quand, le message dit son nom et son poids',
    /^VOLTA-sauvegarde-\d{4}-\d{2}-\d{2}\.volta$/.test(nom) && octets[0] === 0x1f && octets[1] === 0x8b && /Dernière sauvegarde\s:\saujourd’hui/.test(P1.quand) && /Sauvegarde enregistrée/.test(P1.toast), nom + ' · ' + octets.length + ' octets · ' + JSON.stringify(P1));

  /* ---- 2. ce que le fichier porte, ce qu'il ne porte jamais ------------------------------------------------------ */
  console.log('\n2. le fichier : tout le travail, jamais l’IA interne');
  const texte = zlib.gunzipSync(octets).toString('utf8'), S = JSON.parse(texte);
  ok('son en-tête : le format, la version, la date, la version de VOLTA, le résumé (1 installation, 3 plans)',
    S.format === 'volta-sauvegarde' && S.version === 1 && S.quand > 0 && /^v\d+/.test(S.volta) && S.resume.installations === 1 && S.resume.plans === 3, JSON.stringify({ volta: S.volta, resume: S.resume }));
  const B = S.bases['volta-bibliotheque'];
  ok('la bibliothèque y est : ses trois magasins (installs, plans, contrats), les trois plans et leurs liaisons',
    !!B && ['installs', 'plans', 'contrats'].every(m => B.magasins[m]) && B.magasins.plans.valeurs.filter(p => p && p.install !== 'exemple').length === 3 && B.magasins.contrats.valeurs.length >= 3, B ? Object.keys(B.magasins).map(m => m + ' ' + B.magasins[m].valeurs.length).join(' · ') : 'absente');
  ok('les hypothèses y sont (la longueur à 7 m)', /"longueur":7/.test(S.local['atelier.simu.v1'] || ''), (S.local['atelier.simu.v1'] || '').slice(0, 60));
  ok('ni l’adresse, ni le modèle, ni la clé de l’IA interne — nulle part dans le fichier', !/CLE-TRES-SECRETE|modele-secret|ia\.exemple\.invalid|volta\.ia\./.test(texte) && !S.bases['volta-ia']);

  /* ---- 3. un navigateur vide : restaurer -------------------------------------------------------------------------- */
  console.log('\n3. un navigateur vide (un autre poste) : « Restaurer » remet tout');
  const Bn = await ouvrir(), pb = Bn.page, V0 = await etat(pb);
  ok('il n’a rien : ni installation, ni plan, la longueur de VOLTA (5 m)', !V0.installs.length && !V0.plans.length && V0.longueur === 5, JSON.stringify(V0));
  await pb.evaluate(() => localStorage.setItem('volta.ia.reglage', JSON.stringify({ adresse: 'https://autre-poste.invalid/v1', cle: 'CLE-DE-CE-POSTE' })));
  await ouvrirLEcran(pb);
  await pb.setInputFiles('#sv-fichier', { name: nom, mimeType: 'application/octet-stream', buffer: octets }); await pb.waitForSelector('#sv-recu'); await pb.waitForTimeout(200);
  const R0 = await pb.evaluate(() => ({ recu: $('sv-recu').textContent.replace(/\s+/g, ' '), encore: plansVrais().length }));
  ok('le fichier choisi dit ce qu’il porte (sa date, « 1 installation · 3 plans ») — et rien n’est encore remplacé',
    /Sauvegarde d’aujourd’hui à /.test(R0.recu) && /1\sinstallation\s·\s3\splans/.test(R0.recu) && /Restaurer/.test(R0.recu) && R0.encore === 0, R0.recu.slice(0, 140));
  await Promise.all([pb.waitForNavigation({ waitUntil: 'load' }), pb.click('#sv-restaurer')]);
  await pb.waitForFunction(() => typeof BIB !== 'undefined' && BIB.pret); await pb.waitForTimeout(500);
  const V1 = await etat(pb), n1 = await pb.evaluate(async () => { const xs = await toutLireBiblio('contrats'); return xs.reduce((s, c) => s + ((c && (c.liaisons || c.V || [])).length || 0), 0); });
  ok('VOLTA redémarre sur l’état du fichier : l’installation, ses trois plans, la longueur supposée à 7 m', V1.installs.join() === 'Antenne VHF' && V1.plans.join() === E0.plans.join() && V1.longueur === 7, JSON.stringify({ ...V1, ia: '' }));
  ok('les liaisons des plans sont revenues, toutes', n1 === n0 && n1 > 0, n1 + ' / ' + n0);
  ok('le réglage de l’IA interne de CE poste n’a pas bougé (une restauration n’y touche pas)', /CLE-DE-CE-POSTE/.test(V1.ia) && !/CLE-TRES-SECRETE/.test(V1.ia));
  // un plan restauré s'ouvre et se dessine
  const ouvert = await pb.evaluate(async () => { const p = plansVrais()[0]; await ouvrirPlan(p.id); await new Promise(r => setTimeout(r, 1500)); return { n: verite().length, blocs: app.dessin ? app.dessin.comps.length : 0 }; });
  ok('un plan restauré s’ouvre et se dessine', ouvert.n > 0 && ouvert.blocs > 0, JSON.stringify(ouvert));

  /* ---- 4. un fichier qui n'est pas une sauvegarde ------------------------------------------------------------------ */
  console.log('\n4. un fichier qui n’est pas une sauvegarde : refusé en mots, rien ne change');
  await ouvrirLEcran(pb);
  await pb.setInputFiles('#sv-fichier', { name: 'notes.volta', mimeType: 'application/octet-stream', buffer: Buffer.from('bonjour', 'utf8') }); await pb.waitForSelector('.sv-erreur'); await pb.waitForTimeout(150);
  const X = await pb.evaluate(() => ({ erreur: document.querySelector('.sv-erreur').textContent, recu: !!$('sv-recu'), plans: plansVrais().length }));
  ok('« notes.volta n’est pas une sauvegarde de VOLTA » ; aucun « Restaurer » ; les plans sont toujours là', /notes\.volta n’est pas une sauvegarde de VOLTA/.test(X.erreur) && !X.recu && X.plans === 3, X.erreur);

  console.log('\nBILAN');
  ok('aucune erreur dans les pages', !A.erreurs.length && !Bn.erreurs.length, [...A.erreurs, ...Bn.erreurs].slice(0, 3).join(' | ') || 'aucune');
  await nav.close();
  console.log(ko ? `\n  ${ko} ÉCHEC(S)` : '\n  tout est vert'); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
