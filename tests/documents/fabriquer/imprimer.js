/* ===========================================================================
   IMPRIMER LES DOCUMENTS INVENTÉS — du SVG au PDF, et le PDF « scanné »
   ---------------------------------------------------------------------------
   Chromium (Playwright) imprime des pages SVG ou HTML en un vrai PDF : du texte
   sélectionnable, des traits vectoriels (`page.pdf`). Des pages de tailles
   mêlées (un A4 portrait de texte, un A3 paysage de schéma) passent par des
   pages CSS nommées.
   LE SCAN, DE TOUTE QUALITÉ (le lecteur : « des scans de toute qualité ») :
   chaque page rendue en image, posée un peu de travers, puis
     · « net »        300 ppp, noir et blanc (un seuil), à peine tournée — une
                      image d'un bit par point, compressée sans perte ;
     · « gris »       150 ppp, en niveaux de gris, un peu floue, bruitée, JPEG ;
     · « photocopie » 120 ppp, des traits épaissis et cassés, des taches de
                      toner, une traînée, les bords qui foncent, JPEG ;
   remise en PDF par un écrivain minimal (une image par page, AUCUN texte).
   Chaque page dit sa qualité, son angle et son décalage (en points de la page) :
   la mesure (tests/lecture-documents.js) en tire la borne haute d'un OCR.
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

/* Les trois qualités de scan */
const QUALITES = { net: { ppp: 300, flou: 0, bruit: 6, contraste: 1.6, gris: 0, seuil: 150, angle: 0.35, decal: 6 },
  gris: { ppp: 150, flou: 0.55, bruit: 22, contraste: 1.1, gris: -8, qualite: 0.62, angle: 0.9, decal: 14 },
  photocopie: { ppp: 120, flou: 0.6, bruit: 30, contraste: 1.55, gris: -14, qualite: 0.55, angle: 1.5, decal: 20, taches: 0.00035, trainee: true, bords: true, epais: true } };
/* Le SCAN d'une page : rendue à `ppp` points par pouce, tournée de `angle` degrés, floue, bruitée, en gris → JPEG, ou un bit
   par point (octets) */
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
    const d = g.getImageData(0, 0, c.width, c.height), a = d.data, W = c.width, H = c.height; let s = o.graine;
    // une photocopie : le toner bave, les traits s'épaississent (le plus sombre des voisins)
    if (o.epais) { const G = new Uint8ClampedArray(W * H); for (let i = 0; i < W * H; i++) G[i] = 0.3 * a[i * 4] + 0.59 * a[i * 4 + 1] + 0.11 * a[i * 4 + 2];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let m = 255; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && G[Y * W + X] < m) m = G[Y * W + X]; }
        const k = (y * W + x) * 4; a[k] = a[k + 1] = a[k + 2] = m; } }
    // une photocopie : une traînée de toner (une bande verticale plus grise), des bords qui foncent
    const xt = Math.floor(((o.graine * 7) % 1000) / 1000 * W), lt = Math.max(8, Math.round(W / 90));
    for (let k = 0, i = 0; k < a.length; k += 4, i++) { s = (s * 16807) % 2147483647; const r = s / 2147483647 - 0.5; s = (s * 16807) % 2147483647;
      let v = 0.3 * a[k] + 0.59 * a[k + 1] + 0.11 * a[k + 2] + r * o.bruit; if (s % 997 === 0) v -= 90 * (s / 2147483647);   // quelques poussières
      if (o.taches && (s % 100003) / 100003 < o.taches) v -= 160;   // les taches de toner
      if (o.trainee) { const x = i % W; if (x > xt && x < xt + lt) v -= 22; }
      if (o.bords) { const x = i % W, y = (i / W) | 0, b = Math.min(x, y, W - x, H - y) / Math.min(W, H); if (b < 0.05) v -= (0.05 - b) * 700; }
      v = Math.max(0, Math.min(255, (v - 128) * o.contraste + 128 + o.gris)); a[k] = a[k + 1] = a[k + 2] = v; }
    if (o.seuil) { // noir et blanc : un bit par point (0 noir, 1 blanc), les lignes complétées à l'octet
      const ligne = Math.ceil(W / 8), bits = new Uint8Array(ligne * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (a[(y * W + x) * 4] >= o.seuil) bits[y * ligne + (x >> 3)] |= 0x80 >> (x & 7);
      let bin = ''; for (let i = 0; i < bits.length; i += 32768) bin += String.fromCharCode.apply(null, bits.subarray(i, i + 32768)); return { bits: btoa(bin) }; }
    g.putImageData(d, 0, 0); return { jpeg: c.toDataURL('image/jpeg', o.qualite).split(',')[1] }; }, [png.toString('base64'), o]);
  if (b64.bits) return { bits: require('zlib').deflateSync(Buffer.from(b64.bits, 'base64'), { level: 9 }), px, py, w, h };
  return { jpeg: Buffer.from(b64.jpeg, 'base64'), px, py, w, h }; }

/* Un PDF d'images (une page, une image pleine page — JPEG, ou un bit par point compressé —, aucun texte) : l'écrivain le
   plus simple qui soit */
function pdfDImages(images) {
  const objets = [], ajouter = c => { objets.push(c); return objets.length; };
  const catalogue = ajouter(null), pagesId = ajouter(null), kids = [];
  images.forEach((im, i) => { const W = im.w / 25.4 * 72, H = im.h / 25.4 * 72;
    const img = im.bits ? ajouter(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${im.px} /Height ${im.py} /ColorSpace /DeviceGray /BitsPerComponent 1 /Filter /FlateDecode /Length ${im.bits.length} >>\nstream\n`, 'latin1'), im.bits, Buffer.from('\nendstream', 'latin1')]))
      : ajouter(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${im.px} /Height ${im.py} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.jpeg.length} >>\nstream\n`, 'latin1'), im.jpeg, Buffer.from('\nendstream', 'latin1')]));
    const flux = `q ${W.toFixed(2)} 0 0 ${H.toFixed(2)} 0 0 cm /Im${i} Do Q`;
    const contenu = ajouter(`<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`);
    kids.push(ajouter(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W.toFixed(2)} ${H.toFixed(2)}] /Resources << /XObject << /Im${i} ${img} 0 R >> >> /Contents ${contenu} 0 R >>`)); });
  objets[catalogue - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`; objets[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
  const morceaux = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')], decal = []; let n = morceaux[0].length;
  objets.forEach((o, i) => { decal.push(n); const b = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, 'latin1'), Buffer.isBuffer(o) ? o : Buffer.from(o, 'latin1'), Buffer.from('\nendobj\n', 'latin1')]); morceaux.push(b); n += b.length; });
  const xref = `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n${decal.map(d => String(d).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${objets.length + 1} /Root ${catalogue} 0 R >>\nstartxref\n${n}\n%%EOF\n`;
  morceaux.push(Buffer.from(xref, 'latin1')); return Buffer.concat(morceaux); }

/* Scanner des pages : chacune sa qualité (`qualite(i)` : net, gris, photocopie), son angle, son décalage, son bruit (une
   graine par page : tout se rejoue). Rend aussi, page par page, ce que la simulation d'OCR doit savoir : la qualité, la
   résolution, l'angle (degrés), le décalage (en points de la page). */
async function scanner(b, pages, chemin, o = {}) {
  const p = await (await b.newContext({ offline: true, deviceScaleFactor: 1 })).newPage(), images = [], poses = [];
  for (let i = 0; i < pages.length; i++) { const k = (i * 7919 + 13) % 1000 / 1000, nom = o.qualite ? o.qualite(i) : 'gris', Q = QUALITES[nom];
    const pose = { qualite: nom, ppp: Q.ppp, angle: (k - 0.45) * 2 * Q.angle, dx: (k - 0.5) * 2 * Q.decal, dy: ((k * 3.7) % 1 - 0.5) * 2 * Q.decal };
    images.push(await scannerPage(p, pages[i], { ...Q, ppp: Q.ppp, angle: pose.angle, dx: pose.dx, dy: pose.dy, graine: 1009 + i * 37 }));
    poses.push({ qualite: nom, ppp: Q.ppp, angle: Math.round(pose.angle * 1e4) / 1e4, dx: Math.round(pose.dx * 72 / Q.ppp * 1e3) / 1e3, dy: Math.round(pose.dy * 72 / Q.ppp * 1e3) / 1e3 }); }
  await p.context().close(); const pdf = pdfDImages(images); fs.writeFileSync(chemin, pdf); return { octets: pdf.length, pages: images.length, poses }; }

module.exports = { navigateur, imprimerPdf, scanner, pdfDImages, TAILLES, QUALITES };
