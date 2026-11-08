/* ===========================================================================
   FABRIQUER LES DOCUMENTS INVENTÉS — une commande, tout se rejoue
       NODE_PATH=$(npm root -g) node tests/documents/fabriquer/tout.js [a,b,c,d,e]
   ---------------------------------------------------------------------------
   Écrit dans tests/documents/ :
     a-schema-vectoriel.pdf   A  le schéma de huit folios, texte sélectionnable
     b-schema-scanne.pdf      B  le même, scanné (des images, aucun texte) : trois folios
                                 nets (noir et blanc), trois gris, deux photocopies
     c-schema.vsdx            C  le même, dessiné dans Visio
     d-gros-document.pdf      D  le dossier de 300 pages
     e-gros-document-scanne.pdf  trente pages du dossier, scannées (gris, net,
                                 photocopie, tour à tour)
   et, pour chacun, sa VÉRITÉ au format du retest (*-verite.csv : les seize
   colonnes de src/02-lecture.js, plus « Dessin »), et documents.json (ce que la
   mesure, tests/lecture-documents.js, doit savoir de chaque document : ses
   pages, leur nature, leur style ; pour un scan, la qualité, l'angle et le
   décalage de chaque page). Les documents d'avant (une autre forme) restent
   dans tests/documents/v0/ : `node tests/lecture-documents.js --dossier=v0`.
   =========================================================================== */
'use strict';
const fs = require('fs'), path = require('path');
const { csvDeVerite } = require('./commun');
const { construireDocument } = require('./document');
const { DOCUMENT_A } = require('./document-a');
const { documentVisio } = require('./visio');
const { documentD } = require('./document-d');
const { navigateur, imprimerPdf, scanner } = require('./imprimer');
const { zipSync, strToU8 } = require('../../../vendor/fflate.min.js');

const ICI = path.join(__dirname, '..'), voulus = (process.argv[2] || 'a,b,c,d,e').split(',');
const ecrire = (nom, contenu) => { fs.writeFileSync(path.join(ICI, nom), contenu); return fs.statSync(path.join(ICI, nom)).size; };
const ko = n => (n / 1024 / 1024 >= 1 ? (n / 1024 / 1024).toFixed(1).replace('.', ',') + ' Mo' : Math.round(n / 1024) + ' Ko');

(async () => {
  const t0 = Date.now(), b = await navigateur(), manifeste = fs.existsSync(path.join(ICI, 'documents.json')) ? JSON.parse(fs.readFileSync(path.join(ICI, 'documents.json'), 'utf8')) : { documents: {} };
  manifeste.documents = manifeste.documents || {};
  const A = construireDocument(DOCUMENT_A); A.verite.forEach(l => { l.page = DOCUMENT_A.folios.findIndex(f => 'SC-4520-201 F' + f.n === l.fwd) + 1; if (l.fwdVers) l.pageVers = +l.fwdVers.split(' F')[1]; });
  const pagesA = A.svgs.map(svg => ({ svg, taille: 'A3' }));
  const infoPagesA = A.folios.map(f => ({ sorte: 'schéma', style: 'A', numero: DOCUMENT_A.numero, folio: f.n, indice: DOCUMENT_A.indice, faisceau: DOCUMENT_A.faisceau }));
  if (voulus.includes('a')) { await imprimerPdf(b, pagesA, path.join(ICI, 'a-schema-vectoriel.pdf')); const n = ecrire('a-verite.csv', csvDeVerite(A.verite));
    manifeste.documents.A = { nom: 'Schéma PDF vectoriel (8 folios)', fichier: 'a-schema-vectoriel.pdf', verite: 'a-verite.csv', sorte: 'pdf', pages: infoPagesA };
    console.log(`A  a-schema-vectoriel.pdf  ${ko(fs.statSync(path.join(ICI, 'a-schema-vectoriel.pdf')).size)} · ${A.verite.length} liaisons · vérité ${ko(n)}`); }
  if (voulus.includes('b')) { const s = await scanner(b, pagesA, path.join(ICI, 'b-schema-scanne.pdf'), { qualite: i => i < 3 ? 'net' : i < 6 ? 'gris' : 'photocopie' }); ecrire('b-verite.csv', csvDeVerite(A.verite));
    manifeste.documents.B = { nom: 'Le même, scanné (net, gris, photocopie)', fichier: 'b-schema-scanne.pdf', verite: 'b-verite.csv', sorte: 'pdf', scan: true, pages: infoPagesA, poses: s.poses };
    console.log(`B  b-schema-scanne.pdf  ${ko(s.octets)} · ${s.pages} pages d'images`); }
  if (voulus.includes('c')) { const f = documentVisio(A.composes, DOCUMENT_A.titre), zip = Buffer.from(zipSync(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, strToU8(v)])), { level: 6 }));
    const n = ecrire('c-schema.vsdx', zip); ecrire('c-verite.csv', csvDeVerite(A.verite));
    manifeste.documents.C = { nom: 'Le même, dans Visio', fichier: 'c-schema.vsdx', verite: 'c-verite.csv', sorte: 'vsdx', pages: infoPagesA };
    console.log(`C  c-schema.vsdx  ${ko(n)} · ${Object.keys(f).length} parties`); }
  if (voulus.includes('d') || voulus.includes('e')) {
    const D = documentD(); console.log(`D  composé en ${D.ms} ms · ${D.pages.length} pages · ${D.verite.length} liaisons${D.journal.length ? ' · ' + D.journal.length + ' fils retirés' : ''}`);
    const infoPages = D.pages.map(p => ({ sorte: p.sorte, style: p.style || '', numero: p.numero || '', folio: p.folio || null, indice: p.indice || '', faisceau: p.faisceau || '', taille: p.taille }));
    if (voulus.includes('d')) { const t1 = Date.now(); await imprimerPdf(b, D.pages, path.join(ICI, 'd-gros-document.pdf')); const n = ecrire('d-verite.csv', csvDeVerite(D.verite));
      manifeste.documents.D = { nom: 'Gros document (300 pages)', fichier: 'd-gros-document.pdf', verite: 'd-verite.csv', sorte: 'pdf', pages: infoPages };
      console.log(`D  d-gros-document.pdf  ${ko(fs.statSync(path.join(ICI, 'd-gros-document.pdf')).size)} · imprimé en ${Math.round((Date.now() - t1) / 1000)} s · vérité ${ko(n)}`); }
    if (voulus.includes('e')) { // trente pages : la garde, le sommaire, les notes, les symboles, huit folios de chaque chapitre, un tableau, l'index
      const choix = [1, 2, 5, 7, ...[0, 1, 2].flatMap(c => Array.from({ length: 8 }, (_, k) => D.debuts[c] + k)), 292, 297];
      const s = await scanner(b, choix.map(p => D.pages[p - 1]), path.join(ICI, 'e-gros-document-scanne.pdf'), { qualite: i => ['gris', 'net', 'photocopie'][i % 3] });
      const dans = new Set(choix), rang = new Map(choix.map((p, i) => [p, i + 1]));
      const V = D.verite.filter(l => dans.has(l.page) && (!l.pageVers || dans.has(l.pageVers))).map(l => ({ ...l, page: rang.get(l.page), pageVers: l.pageVers ? rang.get(l.pageVers) : null }));
      ecrire('e-verite.csv', csvDeVerite(V));
      manifeste.documents.E = { nom: 'Gros document, trente pages scannées', fichier: 'e-gros-document-scanne.pdf', verite: 'e-verite.csv', sorte: 'pdf', scan: true, pagesSource: choix, pages: choix.map(p => infoPages[p - 1]), poses: s.poses };
      console.log(`E  e-gros-document-scanne.pdf  ${ko(s.octets)} · ${s.pages} pages · ${V.length} liaisons entières dans l'extrait`); } }
  await b.close();
  // la forme : celle des vrais schémas du lecteur (8 novembre 2026) ; les documents d'avant, sans ce mot, sont dans v0/
  manifeste.forme = 'v1'; manifeste.fabrique = new Date().toISOString().slice(0, 10); ecrire('documents.json', JSON.stringify(manifeste));
  console.log(`fait en ${Math.round((Date.now() - t0) / 1000)} s`);
})().catch(e => { console.error('ÉCHEC', e); process.exit(1); });
