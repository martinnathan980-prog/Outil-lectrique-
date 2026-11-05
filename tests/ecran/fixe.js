/* LE DESSIN EST FIXE (v86) : à tout zoom, chaque numéro de borne, chaque pastille, chaque lettre de connecteur reste à sa
   place dans le dessin, à sa taille, visible — comme un papier qu'on approche ou qu'on éloigne (la v85 faisait grandir les
   numéros au dézoom, chacun depuis son point : le lecteur, « plus rien ne se suit, les bornes se décalent »).
   Pour chaque folio de l'exemple : la boîte de chaque écriture et de chaque pastille, ramenée dans le repère du dessin
   (l'inverse de la matrice d'écran de la scène), au cadrage, à 50, 100, 200 et 400 % ; elle ne doit ni glisser ni changer
   de taille (au centième d'unité près). Et au cadrage, rien ne se tait ni ne se transforme.
       node tests/ecran/fixe.js [1920] */
const { ouvrir, exemple } = require('./commun');
const L = +(process.argv[2] || 1440), TOL = 0.02;
(async () => { const { b, p, erreurs } = await ouvrir({ l: L, h: L >= 1900 ? 1080 : 900 }); await exemple(p);
  const plans = await p.evaluate(() => plans()), fautes = []; let n = 0;
  for (const pl of plans) {
    await p.evaluate(pl => allerAuPlan(pl), pl); await p.waitForTimeout(1500);
    const prises = [];
    for (const pct of [0, 50, 100, 200, 400]) {
      prises.push(await p.evaluate(pct => { VUE.cadrage = 'feuille'; ajuster(false);
        if (pct) { const P = placeDuPlan(), s = pct / 100 * S100, c = app.dessin.bbox; app.vue = { s, tx: P.X - (c.x + c.w / 2) * s, ty: P.Y - (c.y + c.h / 2) * s }; appliquerVue(); }
        document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* une animation déjà finie */ } });
        const sc = $('scene'), M = sc.getScreenCTM().inverse(), pt = (x, y) => new DOMPoint(x, y).matrixTransform(M), cles = new Map();
        const els = [...sc.querySelectorAll('.comp text, .vt text, path.bpast')].filter(e => (e.textContent || e.tagName === 'path') && !e.closest('.feuille'));
        return { pct: zoomEnPourcent(app.vue.s), b: els.map(e => { const r = e.getBoundingClientRect(), a = pt(r.left, r.top), z = pt(r.right, r.bottom), cs = getComputedStyle(e);
          const g = e.closest('[data-name]') || e.closest('[data-vt]'), k0 = (g ? g.dataset.name || g.dataset.vt : '') + '|' + e.getAttribute('class') + '|' + (e.textContent || '');
          cles.set(k0, (cles.get(k0) || 0) + 1);
          return { k: k0 + '#' + cles.get(k0), x0: a.x, y0: a.y, x1: z.x, y1: z.y, cache: +cs.opacity < 0.5 || cs.visibility === 'hidden' || cs.display === 'none', tr: cs.transform !== 'none' }; }) }; }, pct)); }
    const ref = new Map(prises[0].b.map(o => [o.k, o])); n += prises[0].b.length;
    prises[0].b.forEach(o => { if (o.cache) fautes.push(`folio ${pl}, cadrage : « ${o.k} » est caché`); if (o.tr) fautes.push(`folio ${pl} : « ${o.k} » porte une mise à l'échelle d'écran`); });
    prises.slice(1).forEach(r => r.b.forEach(o => { const a = ref.get(o.k); if (!a) { fautes.push(`folio ${pl}, ${r.pct} % : « ${o.k} » n'existe pas au cadrage`); return; }
      const d = Math.max(Math.abs(o.x0 - a.x0), Math.abs(o.x1 - a.x1), Math.abs(o.y0 - a.y0), Math.abs(o.y1 - a.y1));
      if (d > TOL) fautes.push(`folio ${pl}, ${r.pct} % : « ${o.k} » a bougé de ${d.toFixed(2)} unité(s) depuis le cadrage (${prises[0].pct} %)`); })); }
  await b.close();
  if (erreurs.length) fautes.push(...erreurs);
  console.log(fautes.length ? `ÉCHEC — ${fautes.length} faute(s)\n` + fautes.slice(0, 30).join('\n')
    : `tout tient — ${plans.length} folios, ${n} écritures et pastilles, immobiles du cadrage à 400 % (à ${TOL} unité près), aucune cachée`);
  process.exit(fautes.length ? 1 : 0); })();
