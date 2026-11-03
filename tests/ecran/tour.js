/* LE TOUR DU SITE — chaque écran que le lecteur peut voir, hors fiches (captures.js) : l'accueil, la bibliothèque, le
   plan, le menu ⋮ et chacune de ses pages, l'index des repères, la recherche, l'ajout d'une liaison, la Bible.
       node tests/ecran/tour.js <dossier> [clair|sombre] [largeur]
   Les fichiers : <dossier>/<thème>-<écran>.png ; les erreurs de la page sont dites à la fin. */
const fs = require('fs'), path = require('path');
const { ouvrir, exemple } = require('./commun');
const [, , DOSSIER = 'tour', THEME = 'clair', L = '1440'] = process.argv;
fs.mkdirSync(DOSSIER, { recursive: true });
const PAGES = ['hypotheses', 'nomenclature', 'normes', 'bible', 'dejafait', 'fichiers', 'bilan', 'carnet', 'cartouche', 'comprendre', 'raccourcis', 'suivi', 'pdf', 'coller'];
(async () => { const { b, p, erreurs } = await ouvrir({ theme: THEME, l: +L, h: Math.round(+L * .625) }), nom = e => path.join(DOSSIER, `${THEME}-${e}.png`);
  const echap = async () => { for (let i = 0; i < 3; i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(150); } };
  await p.waitForTimeout(600); await p.screenshot({ path: nom('00-accueil') });
  await exemple(p); await p.screenshot({ path: nom('01-plan') });
  // le menu ⋮, puis ses deux sous-menus
  await p.click('#btnMenu'); await p.waitForTimeout(400); await p.screenshot({ path: nom('02-menu') });
  for (const s of ['exporter', 'plus']) { const vu = await p.evaluate(s => { const x = document.querySelector(`#menu [data-sous="${s}"]`); if (!x || !x.offsetParent) return false; x.click(); return true; }, s);
    if (vu) { await p.waitForTimeout(400); await p.screenshot({ path: nom('03-menu-' + s) }); } else { await p.click('#btnMenu').catch(() => {}); await p.waitForTimeout(250); } }
  await echap();
  for (const a of PAGES) {
    await p.evaluate(() => { if (typeof fermerFiche === 'function') try { fermerFiche(true); } catch (_) {} });
    await p.click('#btnMenu'); await p.waitForTimeout(250);
    const ok = await p.evaluate(a => { const x = document.querySelector(`#menu [data-act="${a}"]`); if (!x) return false; x.click(); return true; }, a);
    await p.waitForTimeout(1300); if (ok) await p.screenshot({ path: nom('10-' + a) }); await echap(); }
  // l'index des repères, la recherche, l'ajout d'une liaison, la Bible
  await p.evaluate(() => { try { fermerFiche(true); } catch (_) {} }); await p.click('#btnIndex').catch(() => {}); await p.waitForTimeout(900); await p.screenshot({ path: nom('20-index') }); await echap();
  await p.click('#q'); await p.keyboard.type('103', { delay: 40 }); await p.waitForTimeout(800); await p.screenshot({ path: nom('21-recherche') }); await echap();
  await p.click('#btnLiaison').catch(() => {}); await p.waitForTimeout(900); await p.screenshot({ path: nom('22-liaison') }); await echap();
  await p.click('#btnBible').catch(() => {}); await p.waitForTimeout(900); await p.screenshot({ path: nom('23-bible') }); await echap();
  // la bibliothèque : l'installation de l'exemple, ses plans
  await p.evaluate(() => montrerBibliotheque('racine')); await p.waitForTimeout(900); await p.screenshot({ path: nom('30-bibliotheque') });
  await p.evaluate(() => { const c = document.querySelector('.bi-carte[data-install] .bi-carte-corps, .bi-demo .bi-carte-corps'); if (c) c.click(); }); await p.waitForTimeout(1000); await p.screenshot({ path: nom('31-installation') });
  await b.close(); console.log(erreurs.length ? 'ERREURS\n' + erreurs.join('\n') : 'tour fait — aucune erreur'); })();
