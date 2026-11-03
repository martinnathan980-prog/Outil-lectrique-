/* Une PLANCHE de captures (pour relire vite) : node tests/ecran/planche.js <sortie.png> <colonnes> <image>…  */
const path = require('path'), fs = require('fs'), { chromium } = require('playwright');
(async () => { const [, , OUT, COL, ...IMGS] = process.argv, n = +COL || 2, W = 1800;
  const html = `<html><body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(${n},1fr);gap:6px;padding:6px;font:13px sans-serif">${IMGS.map(i => `<figure style="margin:0;background:#fff"><img src="data:image/png;base64,${fs.readFileSync(i).toString('base64')}" style="width:100%;display:block"><figcaption style="padding:2px 6px">${path.basename(i)}</figcaption></figure>`).join('')}</body></html>`;
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: W, height: 800 } }); await p.setContent(html); await p.waitForTimeout(500);
  await p.screenshot({ path: OUT, fullPage: true }); await b.close(); })();
