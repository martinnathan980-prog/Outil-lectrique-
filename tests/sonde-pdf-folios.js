/* ===========================================================================
   LE CORPUS DE LA SONDE PDF — les six folios de l'exemple, imprimés en PDF
   ---------------------------------------------------------------------------
       NODE_PATH=/opt/node22/lib/node_modules node tests/sonde-pdf-folios.js . <dossier>

   Un vrai schéma de câblage vectoriel pour la sonde (see/pdf/sonde_pdf.py) :
   les six folios du contrat d'exemple placés et dessinés par le code de la
   page (see/exporter.js le charge comme le lot), chacun en SVG autonome
   (svgAutonome), imprimés par Chromium (page.pdf, A3 paysage). Écrit
     atelier-folios.pdf              les six folios, tels que l'Atelier les imprime : Skia rend le
                                     quadrillage de fond (un motif SVG) en IMAGE dans un motif PDF
     atelier-folios-sans-grille.pdf  les mêmes sans le quadrillage : du vectoriel pur
     atelier-folio-N.pdf             chaque folio seul
     atelier-verite.json             les textes du dessin (la sonde ne doit en laisser sortir aucun)
   Hors de tests/toutes.js : un outil pour fabriquer le corpus, pas un contrôle.
   =========================================================================== */
'use strict';
const fs = require('fs'), path = require('path');
const depot = path.resolve(process.argv[2] || '.'), dossier = path.resolve(process.argv[3] || 'corpus-pdf');
const E = require(path.join(depot, 'see', 'exporter.js'));
const { chromium } = require('playwright');
(async () => {
  fs.mkdirSync(dossier, { recursive: true });
  const A = E.chargerAtelier();
  const R = await E.lireRetest('--exemple');
  const folios = E.foliosDuContrat(R.liaisons);
  const cartouche = A('nouveauContrat')().cartouche;
  const routes = new Map([...A('couleursDeRoutes')(R.liaisons)]);
  const svgs = [], textes = new Set();
  const entites = t => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  folios.forEach((f, i) => {
    const Lm = f.L.map(({ origine, ...l }) => l);
    const P = A('meilleurPlacement')(Lm);
    const d = A('dessinDuPlacement')(P, f.L, routes);
    const S = A('svgAutonome')(d, cartouche, (i + 1) + ' / ' + folios.length, () => '', '#ffffff');
    svgs.push(S);
    for (const m of S.txt.matchAll(/<(?:text|tspan)[^>]*>([^<]*)<\/(?:text|tspan)>/g)) { const t = entites(m[1]).trim(); if (t) textes.add(t); }
  });
  const nav = await chromium.launch();
  const page = await nav.newPage();
  const html = svs => '<!doctype html><html><head><meta charset="utf-8"><style>@page{size:420mm 297mm;margin:0}html,body{margin:0;padding:0}'
    + '.f{width:420mm;height:297mm;page-break-after:always;overflow:hidden}.f svg{width:420mm;height:297mm;display:block}</style></head><body>'
    + svs.map(s => '<div class="f">' + s.txt.replace(/^<\?xml[^>]*>\s*/, '') + '</div>').join('') + '</body></html>';
  const imprimer = async (svs, nom) => { await page.setContent(html(svs));
    await page.pdf({ path: path.join(dossier, nom), width: '420mm', height: '297mm', printBackground: true, preferCSSPageSize: true }); };
  await imprimer(svgs, 'atelier-folios.pdf');
  for (let i = 0; i < svgs.length; i++) await imprimer([svgs[i]], 'atelier-folio-' + (i + 1) + '.pdf');
  // sans le quadrillage de fond (un motif que Skia rend en image) : du vectoriel pur
  await imprimer(svgs.map(s => ({ txt: s.txt.replace(/fill="url\(#gfine\)"/g, 'fill="none"') })), 'atelier-folios-sans-grille.pdf');
  await nav.close();
  fs.writeFileSync(path.join(dossier, 'atelier-verite.json'), JSON.stringify({ folios: svgs.length, textes: [...textes] }, null, 1));
  console.log(svgs.length + ' folios imprimés dans ' + dossier + ', ' + textes.size + ' textes distincts');
})().catch(e => { console.error(e); process.exit(1); });
