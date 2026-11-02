/* LES CAPTURES À RELIRE AVANT DE LIVRER — l'accueil, l'exemple, un objet de chaque genre (disjoncteur, équipement,
   barrette, prise, fil) en carte puis en grand sur chaque onglet, le récapitulatif sur chaque onglet.
       node tests/ecran/captures.js <dossier> [clair|sombre|les-deux] [largeur] [genres…]
   ex. node tests/ecran/captures.js /tmp/captures les-deux 1440 disjoncteur equipement
   Les fichiers : <dossier>/<thème>-<largeur>-<écran>.png. Toutes les erreurs de la page sont dites à la fin. */
const fs = require('fs'), path = require('path');
const { ouvrir, exemple, objets, montrer, grand, onglets, onglet } = require('./commun');
const [, , DOSSIER = 'captures', QUOI = 'les-deux', L = '1440', ...GENRES] = process.argv;
const themes = QUOI === 'les-deux' ? ['clair', 'sombre'] : [QUOI];
const voulus = GENRES.length ? GENRES : ['accueil', 'disjoncteur', 'equipement', 'barrette', 'prise', 'fil', 'recap'];
fs.mkdirSync(DOSSIER, { recursive: true });
(async () => { const toutes = [];
  for (const theme of themes) {
    const { b, p, erreurs } = await ouvrir({ theme, l: +L, h: Math.round(+L * 0.625) }), nom = e => path.join(DOSSIER, `${theme}-${L}-${e}.png`);
    if (voulus.includes('accueil')) { await p.mouse.move(+L * 0.48, 420); await p.waitForTimeout(1400); await p.screenshot({ path: nom('accueil') }); }
    await exemple(p); await p.screenshot({ path: nom('exemple') });
    const O = await objets(p);
    for (const g of ['disjoncteur', 'equipement', 'barrette', 'prise']) { if (!voulus.includes(g) || !O[g]) continue;
      await montrer(p, O[g]); await p.screenshot({ path: nom(g + '-carte') });
      await grand(p); for (const k of await onglets(p)) { await onglet(p, k); await p.screenshot({ path: nom(g + '-' + k) }); } }
    if (voulus.includes('fil')) { await p.evaluate(() => { if (NIVEAU.grand) reduireFiche(); allerAuPlan(plans()[0]); const l = liaisonsDuPlan()[0]; montrerFil(sourceDe(l) || l); }); await p.waitForTimeout(600);
      await p.screenshot({ path: nom('fil-carte') }); await grand(p); for (const k of await onglets(p)) { await onglet(p, k); await p.screenshot({ path: nom('fil-' + k) }); } }
    if (voulus.includes('recap')) { await p.evaluate(() => { if (NIVEAU.grand) reduireFiche(); if (typeof fermerFiche === 'function') fermerFiche(); basculerBase(); }); await p.waitForTimeout(900);
      const ks = await p.evaluate(() => [...document.querySelectorAll('#base .rc-onglet')].map(x => x.dataset.onglet));
      for (const k of ks) { await p.evaluate(k => document.querySelector(`#base .rc-onglet[data-onglet="${k}"]`).click(), k); await p.waitForTimeout(500); await p.screenshot({ path: nom('recap-' + k) }); } }
    toutes.push(...erreurs.map(e => theme + ' : ' + e)); await b.close(); }
  console.log(toutes.length ? 'ERREURS\n' + toutes.join('\n') : 'captures faites — aucune erreur'); process.exit(toutes.length ? 1 : 0); })();
