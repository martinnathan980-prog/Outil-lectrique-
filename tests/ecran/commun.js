/* Outils d'écran partagés (captures, fumée, mesures) : ouvrir VOLTA dans Chromium, charger l'exemple, choisir un objet de
   chaque genre. Aucun fichier du lecteur ici : tout tourne sur le contrat d'exemple. */
const path = require('path');
const { chromium } = require('playwright');
const RACINE = path.resolve(__dirname, '../..');
const PAGE = 'file://' + path.join(RACINE, 'index.html');
async function ouvrir(o = {}) {
  const b = await chromium.launch(), theme = o.theme === 'clair' ? 'light' : o.theme === 'sombre' ? 'dark' : (o.theme || 'light');
  const p = await b.newPage({ viewport: { width: o.l || 1440, height: o.h || 900 }, colorScheme: theme, deviceScaleFactor: o.zoom || 1 });
  const erreurs = []; p.on('pageerror', e => erreurs.push(String(e && e.stack || e).slice(0, 400)));
  await p.goto(PAGE); await p.waitForTimeout(900);
  await p.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
  return { b, p, erreurs, theme };
}
async function exemple(p) { await p.evaluate(() => atelier.exemple()); await p.waitForTimeout(2600); }
/* un objet de chaque genre, trouvé sur les folios de l'exemple : { disjoncteur, equipement, barrette, prise } → { nom, plan } */
async function objets(p) {
  return p.evaluate(() => { const out = {};
    for (const pl of plans()) { allerAuPlan(pl);
      for (const c of app.dessin.comps) { if (c.kind === 'tag' || estMasse(c.name)) continue; const n = c.name;
        const g = estDisjoncteur(n) ? 'disjoncteur' : /VT/.test(n) ? 'barrette' : /VC/.test(n) ? 'prise' : c.kind === 'equip' ? 'equipement' : '';
        if (g && !out[g]) out[g] = { nom: n, plan: pl }; } }
    allerAuPlan(plans()[0]); return out; });
}
async function montrer(p, o) { await p.evaluate(({ nom, plan }) => { if (NIVEAU.grand) reduireFiche(); allerAuPlan(plan); montrerBloc(nom); }, o); await p.waitForTimeout(600); }
async function grand(p) { await p.evaluate(() => ouvrirGrand('')); await p.waitForTimeout(600); }
async function onglets(p) { return p.evaluate(() => [...document.querySelectorAll('#ba-equip .nv-onglet')].map(x => x.dataset.onglet)); }
async function onglet(p, k) { await p.evaluate(k => activerOnglet(k), k); await p.waitForTimeout(350); }
module.exports = { ouvrir, exemple, objets, montrer, grand, onglets, onglet, RACINE, PAGE };
