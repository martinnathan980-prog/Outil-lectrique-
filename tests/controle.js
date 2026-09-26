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
     7. les pièges déjà tombés ne reviennent pas.
   La base de retest a ses propres contrôles dans tests/retest.js.
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
    manquantes: ['contratEssai', 'meilleurPlacement', 'router', 'sceneSvg', 'lireTexte', 'decouperEnFolios']
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
    return r;
  });
  ok('une liaison à moitié saisie ne vide pas l’écran', pieges.demiFil, pieges.demiFil ? 'le dessin tient' : (pieges.demiFilMsg || 'ÉCRAN BLANC'));
  ok('un folio reste atteignable depuis « tous les plans »', !pieges.folioBloque, pieges.folioBloque ? 'LES DEUX FLÈCHES SONT GRISÉES' : ('« ' + pieges.folioDepart + ' » → « ' + pieges.folioApres + ' »'));
  ok('les espaces parasites ne dédoublent plus un repère', pieges.espaces === 2, pieges.espaces + ' bloc(s) pour 2 repères');
  ok('le SVG exporté est un XML valide', pieges.svgOk && pieges.svgXml && !pieges.svgCtrl, pieges.svgOk ? (pieges.svgFils + ' fils · caractère de contrôle : ' + (pieges.svgCtrl ? 'OUI' : 'aucun')) : 'pas de SVG produit');

  titre('BILAN');
  ok('aucune erreur console', erreurs.length === 0, erreurs.length ? erreurs.slice(0, 3).join(' | ') : 'aucune');
  console.log('\n  ' + (total - echecs) + ' / ' + total + ' contrôles passés' + (echecs ? '  —  ' + echecs + ' ÉCHEC(S)' : '  —  tout est vert'));
  await nav.close(); process.exit(echecs ? 1 : 0);
})();
