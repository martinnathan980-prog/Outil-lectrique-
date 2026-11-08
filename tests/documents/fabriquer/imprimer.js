/* ===========================================================================
   IMPRIMER LES DOCUMENTS INVENTÉS — du SVG au PDF, et le PDF « scanné »
   ---------------------------------------------------------------------------
   Chromium (Playwright) imprime des pages SVG ou HTML en un vrai PDF : du texte
   sélectionnable, des traits vectoriels (`page.pdf`). Des pages de tailles
   mêlées (un A4 portrait de texte, un A3 paysage de schéma) passent par des
   pages CSS nommées.
   LE SCAN : chaque page rendue en image (une résolution de scanner), un peu
   tournée, un peu floue, bruitée, en niveaux de gris, compressée en JPEG — puis
   remise en PDF par un écrivain minimal (une image par page, AUCUN texte).
   =========================================================================== */
'use strict';
const fs = require('fs');

const TAILLES = { A3: [420, 297], A4: [210, 297], A4P: [297, 210] };
function navigateur() { const { chromium } = require('playwright'); return chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }); }

/* Des pages [{ svg | html, taille }] → un PDF (octets). `lot` : combien de pages par passage (un très gros document
   s'imprime par morceaux, puis se recoud : `recoudre`). */
async function imprimerPdf(b, pages, chemin) {
  const p = await (await b.newContext({ offline: true })).newPage();
  const noms = [...new Set(pages.map(q => q.taille || 'A3'))];
  const css = noms.map(n => { const [w, h] = TAILLES[n]; return `@page p${n}{size:${w}mm ${h}mm;margin:0} .p${n}{page:p${n};width:${w}mm;height:${h}mm;overflow:hidden;position:relative}`; }).join('');
  const corps = pages.map((q, i) => `<div class="p${q.taille || 'A3'}"${i ? ' style="break-before:page"' : ''}>${q.svg || q.html}</div>`).join('');
  await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>@page{margin:0}html,body{margin:0;padding:0}svg{display:block}${css}</style></head><body>${corps}</body></html>`, { waitUntil: 'load', timeout: 600000 });
  await p.pdf({ path: chemin, preferCSSPageSize: true, printBackground: true, timeout: 0 });
  await p.context().close(); }

/* Le SCAN d'une page : rendue à `ppp` points par pouce, tournée de `angle` degrés, floue, bruitée, en gris → JPEG (octets) */
async function scannerPage(p, q, o) {
  const [w, h] = TAILLES[q.taille || 'A3'], px = Math.round(w / 25.4 * o.ppp), py = Math.round(h / 25.4 * o.ppp);
  await p.setViewportSize({ width: px, height: py });
  const contenu = q.svg ? q.svg.replace(/width="[\d.]+mm" height="[\d.]+mm"/, `width="${px}" height="${py}"`) : `<div style="width:${w}mm;height:${h}mm;transform-origin:0 0;transform:scale(${px / (w / 25.4 * 96)})">${q.html}</div>`;
  await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#fff;overflow:hidden}svg{display:block}</style></head><body>${contenu}</body></html>`);
  const png = await p.screenshot({ type: 'png', fullPage: false });
  const b64 = await p.evaluate(async ([png64, o]) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + png64; await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d');
    // le papier un peu gris, la page posée de travers, l'optique un peu floue
    g.fillStyle = '#f3f2ec'; g.fillRect(0, 0, c.width, c.height); g.save(); g.translate(c.width / 2 + o.dx, c.height / 2 + o.dy); g.rotate(o.angle * Math.PI / 180); g.filter = `blur(${o.flou}px)`; g.drawImage(im, -im.width / 2, -im.height / 2); g.restore();
    const d = g.getImageData(0, 0, c.width, c.height), a = d.data; let s = o.graine;
    for (let k = 0; k < a.length; k += 4) { s = (s * 16807) % 2147483647; const r = s / 2147483647 - 0.5; s = (s * 16807) % 2147483647;
      let v = 0.3 * a[k] + 0.59 * a[k + 1] + 0.11 * a[k + 2] + r * o.bruit; if (s % 997 === 0) v -= 90 * (s / 2147483647);   // quelques poussières
      v = Math.max(0, Math.min(255, (v - 128) * o.contraste + 128 + o.gris)); a[k] = a[k + 1] = a[k + 2] = v; }
    g.putImageData(d, 0, 0); return c.toDataURL('image/jpeg', o.qualite).split(',')[1]; }, [png.toString('base64'), o]);
  return { jpeg: Buffer.from(b64, 'base64'), px, py, w, h }; }

/* Un PDF d'images (une page, une image JPEG pleine page, aucun texte) : l'écrivain le plus simple qui soit */
function pdfDImages(images) {
  const objets = [], ajouter = c => { objets.push(c); return objets.length; };
  const catalogue = ajouter(null), pagesId = ajouter(null), kids = [];
  images.forEach((im, i) => { const W = im.w / 25.4 * 72, H = im.h / 25.4 * 72;
    const img = ajouter(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${im.px} /Height ${im.py} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.jpeg.length} >>\nstream\n`, 'latin1'), im.jpeg, Buffer.from('\nendstream', 'latin1')]));
    const flux = `q ${W.toFixed(2)} 0 0 ${H.toFixed(2)} 0 0 cm /Im${i} Do Q`;
    const contenu = ajouter(`<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`);
    kids.push(ajouter(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W.toFixed(2)} ${H.toFixed(2)}] /Resources << /XObject << /Im${i} ${img} 0 R >> >> /Contents ${contenu} 0 R >>`)); });
  objets[catalogue - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`; objets[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
  const morceaux = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')], decal = []; let n = morceaux[0].length;
  objets.forEach((o, i) => { decal.push(n); const b = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, 'latin1'), Buffer.isBuffer(o) ? o : Buffer.from(o, 'latin1'), Buffer.from('\nendobj\n', 'latin1')]); morceaux.push(b); n += b.length; });
  const xref = `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n${decal.map(d => String(d).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${objets.length + 1} /Root ${catalogue} 0 R >>\nstartxref\n${n}\n%%EOF\n`;
  morceaux.push(Buffer.from(xref, 'latin1')); return Buffer.concat(morceaux); }

/* Scanner des pages : chacune son angle, son décalage, son bruit (une graine par page : tout se rejoue) */
async function scanner(b, pages, chemin, o = {}) {
  const p = await (await b.newContext({ offline: true, deviceScaleFactor: 1 })).newPage(), images = [];
  for (let i = 0; i < pages.length; i++) { const k = (i * 7919 + 13) % 1000 / 1000;
    images.push(await scannerPage(p, pages[i], { ppp: o.ppp || 150, angle: (k - 0.45) * 1.6, dx: (k - 0.5) * 18, dy: ((k * 3.7) % 1 - 0.5) * 14, flou: o.flou || 0.55, bruit: o.bruit || 26, contraste: 1.12, gris: -6, qualite: o.qualite || 0.72, graine: 1009 + i * 37 })); }
  await p.context().close(); const pdf = pdfDImages(images); fs.writeFileSync(chemin, pdf); return { octets: pdf.length, pages: images.length }; }

module.exports = { navigateur, imprimerPdf, scanner, pdfDImages, TAILLES };
