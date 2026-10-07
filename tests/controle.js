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
     format), le peigne (trois départs sur une borne : un seul peut être
     droit, les deux autres passent par la verticale du piquage — 3 fils
     droits sur 5, pas plus). */
  titre('2. DESSIN — les formes qui font mal');
  const formes = [
    ['escalier — bornier de 24 bornes vers 24 appareils', 95, () => { const a = []; for (let i = 0; i < 24; i++) a.push(['BORN1', String(i + 1), 'E' + i, '1']); return a; }],
    ['carrefour — un calculateur, 30 départs', 90, () => { const a = []; for (let i = 0; i < 30; i++) a.push(['CALC1', String(i + 1), 'D' + i, '1']); return a; }],
    ['maillage — 7 équipements tous reliés', 20, () => { const a = []; for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++) a.push(['M' + i, String(j), 'M' + j, String(i)]); return a; }],
    ['chaîne — 30 équipements en série', 80, () => { const a = []; for (let i = 0; i < 30; i++) a.push(['N' + i, '2', 'N' + (i + 1), '1']); return a; }, 3],
    ['peigne — 3 départs sur la même borne (barrette)', 60, () => [['SRC', '12', 'A1', '3'], ['SRC', '12', 'A2', '3'], ['SRC', '12', 'A3', '3'], ['A1', '8', 'B1', '2'], ['A2', '8', 'B2', '2']]]
  ];
  let evitables = 0;
  for (const [nom, seuil, gen, fmax] of formes) {
    await page.evaluate(chargerDansLaPage, gen());
    const r = await page.evaluate(mesurerDansLaPage);
    const fmt = Math.round(100 * Math.max(r.format, 1 / r.format)) / 100, d = Math.round(r.taux * 100);
    evitables += r.evitables;
    ok(nom, r.filsDansBloc === 0 && r.chevauches === 0 && d >= seuil && (!fmax || fmt <= fmax),
      r.blocs + ' blocs · ' + r.fils + ' fils · ' + d + ' % droits (seuil ' + seuil + ') · ' + r.croisements + ' croisements · filsDansBloc=' + r.filsDansBloc + ' chevauch=' + r.chevauches + (fmax ? ' · format ' + fmt + ':1 (max ' + fmax + ')' : ''));
  }
  /* Le routeur ne laisse aucun croisement qu'un autre ordre des pistes de sa
     goulotte ôterait : sur le maillage surtout, qui croise beaucoup. */
  ok('aucun croisement évitable sur ces formes', evitables === 0, evitables + ' croisement(s) évitable(s)');

  titre('3. CONTRAT D’ESSAI');
  const essai = await page.evaluate(() => { atelier.essai(); const a = atelier.audit();
    return { b: a.blocs, f: a.fils, d: Math.round(a.tauxDroits * 100), ib: a.filsDansBloc, ch: a.blocsChevauches, cr: a.croisements, ev: a.evitables, barrettes: new Set(app.dessin.comps.filter(c => VT_A_POSER.test(c.name)).map(c => c.name)).size }; });
  ok('se dessine sans défaut', essai.ib === 0 && essai.ch === 0, essai.b + ' blocs · ' + essai.f + ' fils · ' + essai.d + ' % droits');
  ok('ses deux dédoublements sont deux barrettes à poser', essai.barrettes === 2, essai.barrettes + ' trouvée(s)');
  ok('aucun croisement évitable', essai.ev === 0, essai.cr + ' croisement(s), dont ' + essai.ev + ' évitable(s)');
  /* Le numéro de fil est l'information numéro un d'un câbleur : il doit être
     écrit, et jamais barré par un fil ni collé à un voisin. Un numéro
     debout (le long d'un vertical) occupe une boîte tournée. */
  const nums = await page.evaluate(() => { atelier.essai(); peindre(); const W = app.dessin.fils;
    const avecNom = W.filter(w => !w.shunt && String(w.cable || '').trim()).length;   // un shunt n'a pas de segment où écrire
    const el = Array.from(document.querySelectorAll('#svg .filnum'));
    const boites = el.map(t => { const x = +t.getAttribute('x'), y = +t.getAttribute('y'); const l = t.textContent.length * 0.60 * 6;
      return t.getAttribute('transform') ? { x0: x - 5.6, x1: x, y0: y - l / 2, y1: y + l / 2 } : { x0: x - l / 2, x1: x + l / 2, y0: y - 5.6, y1: y }; });
    let chevauche = 0; for (let i = 0; i < boites.length; i++) for (let j = i + 1; j < boites.length; j++) { const a = boites[i], b = boites[j]; if (a.x1 > b.x0 && a.x0 < b.x1 && a.y1 > b.y0 && a.y0 < b.y1) chevauche++; }
    const vert = []; W.forEach(w => { for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1]; if (Math.abs(a.x - b.x) < 0.6 && Math.abs(a.y - b.y) > 1) vert.push({ x: a.x, y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y) }); } });
    let barres = 0; boites.forEach(b => { if (vert.some(v => v.x > b.x0 && v.x < b.x1 && v.y1 > b.y0 && v.y0 < b.y1)) barres++; });
    return { avecNom, poses: el.length, chevauche, barres }; });
  ok('les numéros de fil sont écrits sur le dessin', nums.poses >= nums.avecNom * 0.9, nums.poses + ' / ' + nums.avecNom + ' fils étiquetés');
  ok('aucune étiquette n’en chevauche une autre', nums.chevauche === 0, nums.chevauche + ' chevauchement(s)');
  ok('aucune étiquette n’est barrée par un fil', nums.barres === 0, nums.barres + ' barrée(s)');

  /* L'ŒIL DU CÂBLEUR, sur les trois folios de l'exemple (un facile, un
     moyen, un très chargé) : rien ne s'écrit sur rien. Les boîtes viennent
     de getBBox(), ce sont les vraies. Un numéro de pastille est DANS sa
     pastille, sur le fil : il ne compte pas. */
  titre('4. L’EXEMPLE, FOLIO PAR FOLIO — rien ne s’écrit sur rien');
  const oeil = await page.evaluate(() => {
    chargerContrat(contratExemple(), 'exemple', 'Contrat d’exemple');
    const out = { folios: [], muets: 0, fils: 0, chev: [], barres: [], nus: [] };
    for (const plan of plansDe(app.contrat.liaisons)) { allerAuPlan(plan); const D = app.dessin;
      const T = []; document.querySelectorAll('#scene text').forEach(t => { const cls = t.getAttribute('class') || '';
        if (!/^(filnum|rep|rep-strip|rep-petit|barnum|connnom|connpin|pinlbl|rep-big|des|rname|prnum)$/.test(cls)) return;
        let bb = t.getBBox(); const tr = t.getAttribute('transform'), m = tr && /rotate\(-90 ([\d.\-]+) ([\d.\-]+)\)/.exec(tr);
        if (m) { const cx = +m[1], cy = +m[2], P = [[bb.x, bb.y], [bb.x + bb.width, bb.y], [bb.x, bb.y + bb.height], [bb.x + bb.width, bb.y + bb.height]].map(([x, y]) => [cx + (y - cy), cy - (x - cx)]);
          const xs = P.map(q => q[0]), ys = P.map(q => q[1]); bb = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }; }
        const g = t.closest('.comp'); let dx = 0, dy = 0; if (g) { const k = /translate\(([\d.\-]+),([\d.\-]+)\)/.exec(g.getAttribute('transform')); if (k) { dx = +k[1]; dy = +k[2]; } }
        T.push({ txt: t.textContent, cls, x0: bb.x + dx, y0: bb.y + dy, x1: bb.x + dx + bb.width, y1: bb.y + dy + bb.height }); });
      const S = []; D.fils.forEach(w => { for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1]; S.push({ n: w.cable, x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y), h: Math.abs(a.y - b.y) < 0.6 }); } });
      (D.barrettes || []).forEach(b => { S.push({ n: 'piquage', x0: b.x, x1: b.x, y0: b.y1 + 3, y1: b.y2 - 3, h: false }); });
      for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) { const a = T[i], b = T[j]; if (a.x1 > b.x0 && a.x0 < b.x1 && a.y1 > b.y0 && a.y0 < b.y1) out.chev.push(plan + ' : ' + a.txt + ' × ' + b.txt); }
      // un numéro de fil s'écrit DANS son fil (le fil le traverse) : le segment de ce fil à sa hauteur n'est pas une barre
      T.forEach(t => S.forEach(s => { if (t.cls === 'filnum' && s.h && s.n === t.txt) return;
        const dedans = s.h ? (s.y0 > t.y0 + 0.4 && s.y0 < t.y1 - 0.4 && s.x1 > t.x0 + 0.4 && s.x0 < t.x1 - 0.4) : (s.x0 > t.x0 + 0.4 && s.x0 < t.x1 - 0.4 && s.y1 > t.y0 + 0.4 && s.y0 < t.y1 - 0.4);
        if (dedans) out.barres.push(plan + ' : ' + s.n + ' barre ' + t.txt); }));
      const nommes = D.fils.filter(w => !w.shunt && String(w.cable || '').trim()); out.fils += nommes.length;
      const ecrits = new Set([...document.querySelectorAll('#scene .filnum')].map(t => t.textContent));
      nommes.forEach(w => { if (!ecrits.has(w.cable)) { out.muets++; out.nus.push(plan + ' : ' + w.cable); } });
      out.folios.push(plan + ' (' + T.length + ' textes)'); }
    return out; });
  ok('aucun texte n’en chevauche un autre (repères, numéros, lettres)', oeil.chev.length === 0, oeil.chev.length ? oeil.chev.slice(0, 4).join(' | ') : oeil.folios.join(', '));
  ok('aucun repère ni numéro n’est barré par un fil', oeil.barres.length === 0, oeil.barres.length ? oeil.barres.slice(0, 4).join(' | ') : 'aucun');
  ok('chaque fil porte son numéro', oeil.muets === 0, oeil.muets ? oeil.nus.slice(0, 4).join(' | ') : oeil.fils + ' fils, tous numérotés');

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
