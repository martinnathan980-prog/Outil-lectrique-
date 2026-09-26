/* ===========================================================================
   CONTRÔLE COMPLET DE L'OUTIL — à lancer avant tout déploiement.
   ---------------------------------------------------------------------------
       node tests/controle.js
   (sous Linux avec Playwright et Chromium ; voir tests/LISEZMOI.md)

   CE QU'IL VÉRIFIE, dans l'ordre où ça compte :
     1. le fichier se charge seul, bibliothèque Excel comprise ;
     2. le DESSIN reste sain sur les formes qui font mal — aucun fil ne
        traverse un bloc, aucun bloc n'en chevauche un autre — et tient sur
        une feuille ;
     3. le contrat d'essai se dessine, ses barrettes sont repérées, ses
        numéros de fil sont écrits sans se marcher dessus ;
     5. l'identification par empreinte reconnaît un équipement modifié, le
        classement désigne le bon contrat de départ, le différentiel lit les
        pièces manquantes ;
     6. les pièces s'écrivent dans le contrat, avec leur provenance, et
        « Annuler » rend l'état exact d'avant ;
     7. les pièges déjà tombés ne reviennent pas.
   Le code de sortie vaut 1 si un seul contrôle échoue.
   ========================================================================= */
const { chromium } = require('playwright');
const { fichierDemande, chargerDansLaPage, mesurerDansLaPage } = require('./pilote');

const FICHIER = fichierDemande();
let echecs = 0, total = 0;
function ok(nom, cond, mesure) { total++; if (!cond) echecs++;
  console.log('  ' + (cond ? 'OK    ' : 'ÉCHEC ') + nom + (mesure ? '   — ' + mesure : '')); }
function titre(t) { console.log('\n' + t); }

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await nav.newPage({ viewport: { width: 1500, height: 980 } });
  page.setDefaultTimeout(180000);
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  await page.goto(FICHIER); await page.waitForTimeout(1200);

  titre('1. CHARGEMENT');
  const charge = await page.evaluate(() => ({ xlsx: typeof XLSX !== 'undefined' && !!XLSX.utils,
    manquantes: ['contratEssai', 'identifier', 'baseExemple', 'chargerBase', 'reconnaissance', 'contratsProches', 'differentiel', 'planPieces', 'appliquerPieces', 'annulerPieces']
      .filter(f => typeof window[f] !== 'function') }));
  ok('bibliothèque Excel intégrée', charge.xlsx);
  ok('toutes les fonctions présentes', !charge.manquantes.length, charge.manquantes.length ? 'manquent : ' + charge.manquantes.join(', ') : 'toutes là');

  /* Les formes qui font mal : l'escalier d'un gros bornier, le carrefour à
     fort fan-out, le maillage complet (qui ne PEUT pas être droit — on ne lui
     demande que les invariants), la chaîne (qui doit se replier : droiture ET
     format), le peigne. */
  titre('2. DESSIN — les formes qui font mal');
  const formes = [
    ['escalier — bornier de 24 bornes vers 24 appareils', 95, () => { const a = []; for (let i = 0; i < 24; i++) a.push(['BORN1', String(i + 1), 'E' + i, '1']); return a; }],
    ['carrefour — un calculateur, 30 départs', 90, () => { const a = []; for (let i = 0; i < 30; i++) a.push(['CALC1', String(i + 1), 'D' + i, '1']); return a; }],
    ['maillage — 7 équipements tous reliés', 20, () => { const a = []; for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++) a.push(['M' + i, String(j), 'M' + j, String(i)]); return a; }],
    ['chaîne — 30 équipements en série', 80, () => { const a = []; for (let i = 0; i < 30; i++) a.push(['N' + i, '2', 'N' + (i + 1), '1']); return a; }, 3],
    ['peigne — 3 départs sur la même borne (barrette)', 90, () => [['SRC', '12', 'A1', '3'], ['SRC', '12', 'A2', '3'], ['SRC', '12', 'A3', '3'], ['A1', '8', 'B1', '2'], ['A2', '8', 'B2', '2']]]
  ];
  for (const [nom, seuil, gen, fmax] of formes) {
    await page.evaluate(chargerDansLaPage, gen());
    const r = await page.evaluate(mesurerDansLaPage);
    const fmt = Math.round(100 * Math.max(r.format, 1 / r.format)) / 100, d = Math.round(r.taux * 100);
    ok(nom, r.filsDansBloc === 0 && r.chevauches === 0 && d >= seuil && (!fmax || fmt <= fmax),
      r.blocs + ' blocs · ' + r.fils + ' fils · ' + d + ' % droits (seuil ' + seuil + ') · ' + r.croisements + ' croisements · filsDansBloc=' + r.filsDansBloc + ' chevauch=' + r.chevauches + (fmax ? ' · format ' + fmt + ':1 (max ' + fmax + ')' : ''));
  }

  titre('3. CONTRAT D’ESSAI');
  const essai = await page.evaluate(() => { atelier.essai(); const a = atelier.audit();
    return { b: a.blocs, f: a.fils, d: Math.round(a.tauxDroits * 100), ib: a.filsDansBloc, ch: a.blocsChevauches, barrettes: app.dessin.barrettes.length }; });
  ok('se dessine sans défaut', essai.ib === 0 && essai.ch === 0, essai.b + ' blocs · ' + essai.f + ' fils · ' + essai.d + ' % droits');
  ok('les deux barrettes sont repérées', essai.barrettes === 2, essai.barrettes + ' trouvée(s)');
  /* Le numéro de fil est l'information numéro un d'un câbleur : il doit être
     écrit, et jamais barré par un fil ni collé à un voisin. */
  const nums = await page.evaluate(() => { atelier.essai(); peindre(); const W = app.dessin.fils;
    const avecNom = W.filter(w => String(w.cable || '').trim()).length;
    const el = Array.from(document.querySelectorAll('#svg .filnum'));
    const boites = el.map(t => { const x = +t.getAttribute('x'), y = +t.getAttribute('y'); const l = t.textContent.length * 0.60 * 6; return { x0: x - l / 2, x1: x + l / 2, y0: y - 5.6, y1: y }; });
    let chevauche = 0; for (let i = 0; i < boites.length; i++) for (let j = i + 1; j < boites.length; j++) { const a = boites[i], b = boites[j]; if (a.x1 > b.x0 && a.x0 < b.x1 && a.y1 > b.y0 && a.y0 < b.y1) chevauche++; }
    const vert = []; W.forEach(w => { for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1]; if (Math.abs(a.x - b.x) < 0.6 && Math.abs(a.y - b.y) > 1) vert.push({ x: a.x, y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y) }); } });
    let barres = 0; boites.forEach(b => { if (vert.some(v => v.x > b.x0 && v.x < b.x1 && v.y1 > b.y0 && v.y0 < b.y1)) barres++; });
    return { avecNom, poses: el.length, chevauche, barres }; });
  ok('les numéros de fil sont écrits sur le dessin', nums.poses >= nums.avecNom * 0.9, nums.poses + ' / ' + nums.avecNom + ' fils étiquetés');
  ok('aucune étiquette n’en chevauche une autre', nums.chevauche === 0, nums.chevauche + ' chevauchement(s)');
  ok('aucune étiquette n’est barrée par un fil', nums.barres === 0, nums.barres + ' barrée(s)');

  titre('5. IDENTIFICATION ET CHOIX DU CONTRAT');
  const gros = await page.evaluate(async () => {
    const EN = ['Harness', 'Device1', 'Pin1', 'PN1', 'Description1', 'Cable T/G', 'Cable Tag', 'Route', 'Device2', 'Pin2', 'PN2', 'Description2', 'FWD', 'Cable Length (mm)', 'Appareil', 'Date retest'];
    const aoa = [[''], ['x'], [], EN];
    const add = (ap, d1, p1, pn1, d2, p2, pn2, rt) => aoa.push(['H', d1, p1, pn1 || '', '', 'DR24', 't', rt || '1M', d2, p2, pn2 || '', '', 'SPE', '1200', ap, '']);
    add('IRO AE', '210SP1', '12', '*70', '667VT21', '1', 'ASNE0500-04'); add('IRO AE', '667VT21', '1', 'ASNE0500-04', '667VT21', '2', 'ASNE0500-04');
    add('IRO AE', '667VT21', '2', 'ASNE0500-04', '115CD', '3', 'ABS0864-12'); add('IRO AE', '667VT21', '3', 'ASNE0500-04', '118CD', '3', 'ABS0864-12');
    add('IRO AE', '667VT21', '4', 'ASNE0500-04', '409GH2', '7', 'NSA937802-05'); add('IRO AE', '340AB1', '4', 'EN2997', '512VN', '1', 'E0644G9S');
    add('IRO AE', '340AB1', '4', 'EN2997', '512VN', '2', 'E0644G9S'); add('IRO AE', '340AB1', '1', 'EN2997', '210SP1', '3', '*70');
    add('IRO AE', '340AB2', '1', 'EN2997', '210SP1', '4', '*70'); add('IRO AE', '115CD', '8', 'ABS0864-12', '408VC1A', '1', 'EN3646', '1M');
    add('IRO AE', '408VC1A', '2', 'EN3646', '601RC', '2', 'E0836', '2M'); add('IRO AE', '601RC', '5', 'E0836', '733LE', '1', 'E0644');
    add('IRO AE', '733LE', '4', 'E0644', '409GH2', '2', 'NSA937802-05'); add('IRO AE', '118CD', '8', 'ABS0864-12', '512VN', '5', 'E0644G9S');
    add('IRO AE', '409GH2', '9', 'NSA937802-05', '845VG', '3', 'E0656'); add('IRO AE', '845VG', '1', 'E0656', '601RC', '7', 'E0836');
    add('IRO AD', '210SP1', '5', '*70', '115CD', '9', 'ABS0864-12'); add('IRO AD', '340AB1', '7', 'EN2997', '512VN', '8', 'E0644G9S');
    for (let i = 0; i < 20; i++) add('JCG AA', '77ZZ' + i, '1', 'B', '88YY' + i, '2', 'C');
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Retest');
    const lu = await chargerBase(new File([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], 'r.xlsm'));
    atelier.essai();
    const ident = identifier(); const un = ident.filter(x => x.dev === '340AB1')[0];
    const cls = contratsProches(); const dif = differentiel(cls[0].contrat);
    return { lignesLues: lu.lignes, identifie340: un ? { top: (un.cands[0] || {}).nom, c2: (un.cands[0] || {}).cov2 } : null,
      meilleur: cls[0] ? cls[0].contrat : null, tauxCablage: cls[0] ? cls[0].tauxLiaisons : 0,
      second: cls[1] ? cls[1].contrat + ' ' + cls[1].tauxLiaisons + '%' : '—', pieces: dif ? dif.pieces.map(z => z.nom) : [] };
  });
  ok('la base d’essai est lue', gros.lignesLues > 30, gros.lignesLues + ' lignes');
  ok('340AB1 reconnu malgré ses bornes déplacées', !!gros.identifie340 && gros.identifie340.top === '340AB1', gros.identifie340 ? gros.identifie340.top + ' · bornes déplacées ' + gros.identifie340.c2 + ' %' : '—');
  ok('le bon contrat de départ est désigné', gros.meilleur === 'IRO AE', gros.meilleur + ' à ' + gros.tauxCablage + ' % de câblage commun (second : ' + gros.second + ')');
  ok('la barrette manquante est lue dans le différentiel', gros.pieces.includes('667VT21'), gros.pieces.join(', ') || 'aucune');
  ok('la prise de coupure manquante aussi', gros.pieces.includes('408VC1A'), gros.pieces.join(', ') || 'aucune');

  titre('6. COMPLÉTER LE CONTRAT');
  const ecr = await page.evaluate(() => {
    const empreinte = () => app.contrat.liaisons.map(l => [l.de, l.borneDe, l.vers, l.borneVers].join('|')).sort().join('\n');
    const avant = empreinte(), nAvant = app.contrat.liaisons.length;
    const plan = planPieces(contratsProches()[0].contrat); const r = appliquerPieces(plan);
    const apresN = app.contrat.liaisons.length; const a = atelier.audit();
    const noms = new Set(app.dessin.comps.map(c => String(c.name).toUpperCase()));
    const posees = plan.map(x => x.piece).filter(n => noms.has(n));
    const sansSrc = app.contrat.liaisons.filter(l => l.provenance === undefined).length, avecSrc = app.contrat.liaisons.filter(l => l.provenance).length;
    annulerPieces();
    return { nAvant, apresN, ajoutees: r.ajoutees, retirees: r.retirees, pieces: r.pieces, posees, avecSrc, sansSrc, identique: empreinte() === avant, nApresAnnul: app.contrat.liaisons.length, dessin: { ib: a.filsDansBloc, ch: a.blocsChevauches, b: a.blocs } };
  });
  ok('des pièces sont écrites', ecr.ajoutees > 0, ecr.pieces + ' pièce(s) · +' + ecr.ajoutees + ' liaisons · −' + ecr.retirees + ' remplacées (' + ecr.nAvant + ' → ' + ecr.apresN + ')');
  ok('les pièces apparaissent dans le dessin', ecr.posees.length > 0, ecr.posees.join(', ') || 'aucune · ' + ecr.dessin.b + ' blocs');
  ok('le dessin reste sain après écriture', ecr.dessin.ib === 0 && ecr.dessin.ch === 0, 'filsDansBloc=' + ecr.dessin.ib + ' chevauch=' + ecr.dessin.ch);
  ok('chaque ligne créée porte sa provenance', ecr.sansSrc === ecr.nAvant - ecr.retirees, ecr.avecSrc + ' ligne(s) tracée(s)');
  const vide = await page.evaluate(() => { try { const r = appliquerPieces(null); return { ok: true, n: r.ajoutees }; } catch (e) { return { ok: false, msg: String(e && e.message || e) }; } });
  ok('un plan vide ne casse rien', vide.ok, vide.ok ? 'bilan à zéro' : vide.msg);
  ok('« Annuler » rend l’état EXACT d’avant', ecr.identique, ecr.nApresAnnul + ' liaisons, empreinte ' + (ecr.identique ? 'identique' : 'DIFFÉRENTE'));

  /* Les défauts que rien ne signalait : l'outil ne se plaignait pas, il
     répondait mal, ou pas du tout. Chacun a son contrôle. */
  titre('7. LES PIÈGES DÉJÀ TOMBÉS');
  const pieges = await page.evaluate(async () => {
    const r = {}; const L = (de, bDe, vers, bVers, plan) => liaison({ de, borneDe: bDe, vers, borneVers: bVers, plan });
    // (a) une liaison à moitié saisie effaçait tout le dessin
    atelier.essai(); const n0 = app.dessin.comps.length;
    app.contrat.liaisons.push(L('', '', '', '')); app.contrat.liaisons.push(L('', '1', '210SP1', '9'));
    try { redessiner(); r.demiFil = !!app.dessin && app.dessin.comps.length >= n0; } catch (e) { r.demiFil = false; r.demiFilMsg = String(e.message).slice(0, 90); }
    // (a bis) le pas-à-pas de folio était inaccessible depuis « tous les plans »
    chargerContrat([L('A1', '1', 'A2', '2', 'P1'), L('B1', '1', 'B2', '2', 'P2'), L('C1', '1', 'C2', '2', 'P3')], 'essai');
    r.folioDepart = document.getElementById('fo-lbl').textContent;
    r.folioBloque = document.getElementById('fo-prev').disabled && document.getElementById('fo-next').disabled;
    allerAuFolio(1); r.folioApres = document.getElementById('fo-lbl').textContent;
    // (b) « 210SP1 » et « 210SP1 » (avec une espace) faisaient deux blocs
    atelier.charger([L(' 210SP1 ', '1', 'BORNE', '2'), L('210SP1', '3', 'BORNE', '4')]);
    r.espaces = new Set(app.dessin.comps.filter(c => c.kind !== 'tag').map(c => String(c.name))).size;
    // (c) le SVG portait U+0001 : illisible par tout lecteur XML
    atelier.essai(); const S = svgDuFolio(); r.svgOk = !!S;
    if (S) { const doc = new DOMParser().parseFromString(S.txt, 'image/svg+xml'); r.svgXml = !doc.querySelector('parsererror'); r.svgCtrl = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(S.txt); r.svgFils = (S.txt.match(/class="cab"/g) || []).length; }
    // (d) « Annuler » emportait les corrections faites à la main
    await chargerBase(baseExemple()); atelier.essai();
    appliquerPieces(planPieces(contratsProches()[0].contrat));
    app.contrat.liaisons.push(L('CTRL-MAIN', '1', '210SP1', '9')); annulerPieces();
    r.mainSurvit = app.contrat.liaisons.some(l => l.de === 'CTRL-MAIN');
    // (e) charger une 2e base laissait l'outil répondre d'après la 1re
    const EN = ['Harness', 'Device1', 'Pin1', 'PN1', 'Description1', 'Cable T/G', 'Cable Tag', 'Route', 'Device2', 'Pin2', 'PN2', 'Description2', 'FWD', 'Cable Length (mm)', 'Appareil', 'Date retest'];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[''], ['x'], [], EN, ['H', 'AAA', '1', '', '', '', '', '1M', 'BBB', '2', '', '', 'SPE', '1200', 'BASE2', '']]), 'Retest');
    await chargerBase(new File([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], 'b2.xlsm'));
    atelier.essai(); const c2 = contratsProches(); r.contrats2 = [...base.parContrat.keys()]; r.vieuxContrat = c2.some(x => x.contrat === 'IRO AE');
    // (f) un contrat identique au mien sortait premier et n'apprenait rien
    await chargerBase(baseExemple()); atelier.essai();
    const moi = app.contrat.liaisons.map(l => ['H', l.de, l.borneDe, '', '', '', '', '1M', l.vers, l.borneVers, '', '', 'SPE', '1200', 'MON-JUMEAU', '']);
    const src = [[''], ['x'], [], EN]; for (let i = base.entete + 1; i < base.lignes.length; i++) if (base.lignes[i]) src.push(base.lignes[i]);
    const wb2 = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb2, XLSX.utils.aoa_to_sheet(src.concat(moi)), 'Retest');
    await chargerBase(new File([XLSX.write(wb2, { bookType: 'xlsx', type: 'array' })], 'jum.xlsm')); atelier.essai();
    const cls = contratsProches(); r.premier = cls[0] ? cls[0].contrat : '—'; r.apport = cls[0] ? cls[0].piecesApportees : 0;
    r.jumeauApport = (cls.find(x => x.contrat === 'MON-JUMEAU') || {}).piecesApportees;
    return r;
  });
  ok('une liaison à moitié saisie ne vide pas l’écran', pieges.demiFil, pieges.demiFil ? 'le dessin tient' : (pieges.demiFilMsg || 'ÉCRAN BLANC'));
  ok('un folio reste atteignable depuis « tous les plans »', !pieges.folioBloque, pieges.folioBloque ? 'LES DEUX FLÈCHES SONT GRISÉES' : ('« ' + pieges.folioDepart + ' » → « ' + pieges.folioApres + ' »'));
  ok('les espaces parasites ne dédoublent plus un repère', pieges.espaces === 2, pieges.espaces + ' bloc(s) pour 2 repères');
  ok('le SVG exporté est un XML valide', pieges.svgOk && pieges.svgXml && !pieges.svgCtrl, pieges.svgOk ? (pieges.svgFils + ' fils · caractère de contrôle : ' + (pieges.svgCtrl ? 'OUI' : 'aucun')) : 'pas de SVG produit');
  ok('« Annuler » épargne une correction manuelle', pieges.mainSurvit, pieges.mainSurvit ? 'la correction survit' : 'CORRECTION PERDUE');
  ok('changer de base jette l’ancien index', !pieges.vieuxContrat, 'contrats vus après rechargement : ' + pieges.contrats2.join(', '));
  ok('un contrat jumeau ne prend pas la tête', pieges.premier !== 'MON-JUMEAU', pieges.premier + ' apporte ' + pieges.apport + ' pièce(s) · le jumeau en apporte ' + (pieges.jumeauApport == null ? '—' : pieges.jumeauApport));

  titre('BILAN');
  ok('aucune erreur console', erreurs.length === 0, erreurs.length ? erreurs.slice(0, 3).join(' | ') : 'aucune');
  console.log('\n  ' + (total - echecs) + ' / ' + total + ' contrôles passés' + (echecs ? '  —  ' + echecs + ' ÉCHEC(S)' : '  —  tout est vert'));
  await nav.close(); process.exit(echecs ? 1 : 0);
})();
