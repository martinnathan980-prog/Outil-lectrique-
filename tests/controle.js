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
     5. chaque disjoncteur a sa forme (06, « le disjoncteur ») aux ports
        d'un équipement, ses textes sans rien chevaucher ;
     7. les pièges déjà tombés ne reviennent pas.
   La base de retest a ses propres contrôles dans tests/retest.js.
   Le code de sortie vaut 1 si un seul contrôle échoue.
   ========================================================================= */
const { chromium } = require('playwright');
const { fichierDemande, chargerDansLaPage, mesurerDansLaPage } = require('./pilote');
const { genererDansLaPage } = require('./corpus');

/* LE DISJONCTEUR SUR LE FOLIO, dans la page : chaque disjoncteur du folio a-t-il sa forme (un arc, pas de boîte), garde-t-il
   la géométrie d'un équipement (la zone de son corps est le rectangle qu'aurait la boîte ; chaque fil que le routeur amène
   s'arrête à un port, x = 0 ou c.w à la hauteur d'une borne, d'où part une amenée du symbole, et aucune amenée n'en part
   ailleurs), et ses textes (repère, calibre, numéros de borne) ne chevauchent-ils aucun autre texte, ni ne sont barrés
   par un fil ? Les boîtes viennent de getBBox(). */
function disjoncteursDansLaPage() {
  const D = app.dessin, T = [];
  document.querySelectorAll('#scene text').forEach(t => { const cls = t.getAttribute('class') || '';
    if (!/^(filnum|rep|rep-strip|rep-petit|barnum|connnom|connpin|pinlbl|rep-big|des|rname|prnum|cb-cal)$/.test(cls)) return;
    let bb = t.getBBox(); const tr = t.getAttribute('transform'), m = tr && /rotate\(-90 ([\d.\-]+) ([\d.\-]+)\)/.exec(tr);
    if (m) { const cx = +m[1], cy = +m[2], P = [[bb.x, bb.y], [bb.x + bb.width, bb.y], [bb.x, bb.y + bb.height], [bb.x + bb.width, bb.y + bb.height]].map(([x, y]) => [cx + (y - cy), cy - (x - cx)]);
      const xs = P.map(q => q[0]), ys = P.map(q => q[1]); bb = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }; }
    const g = t.closest('.comp'); let dx = 0, dy = 0; if (g) { const k = /translate\(([\d.\-]+),([\d.\-]+)\)/.exec(g.getAttribute('transform')); if (k) { dx = +k[1]; dy = +k[2]; } }
    T.push({ txt: t.textContent, cls, cb: !!(g && estDisjoncteur(g.dataset.name)), x0: bb.x + dx, y0: bb.y + dy, x1: bb.x + dx + bb.width, y1: bb.y + dy + bb.height }); });
  const S = []; D.fils.forEach(w => { for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1]; S.push({ n: w.cable, x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y), h: Math.abs(a.y - b.y) < 0.6 }); } });
  (D.barrettes || []).forEach(b => { S.push({ n: 'piquage', x0: b.x, x1: b.x, y0: b.y1 + 3, y1: b.y2 - 3, h: false }); });
  const r = { cbs: 0, formes: 0, repli: [], geometrie: [], chev: [], barres: [], calibres: [] };
  for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) { const a = T[i], b = T[j]; if ((a.cb || b.cb) && a.x1 > b.x0 + 1.5 && a.x0 < b.x1 - 1.5 && a.y1 > b.y0 + 1.5 && a.y0 < b.y1 - 1.5) r.chev.push(a.txt + ' × ' + b.txt); }   // (v89) 1,5 unité de jeu : l'interligne, pas l'encre
  T.forEach(t => { if (t.cb) S.forEach(s => { const dedans = s.h ? (s.y0 > t.y0 + 0.4 && s.y0 < t.y1 - 0.4 && s.x1 > t.x0 + 0.4 && s.x0 < t.x1 - 0.4) : (s.x0 > t.x0 + 0.4 && s.x0 < t.x1 - 0.4 && s.y1 > t.y0 + 0.4 && s.y0 < t.y1 - 0.4); if (dedans) r.barres.push(s.n + ' barre ' + t.txt); }); });
  D.comps.filter(c => c.kind === 'equip' && estDisjoncteur(c.name)).forEach(c => { r.cbs++;
    const g = document.querySelector(`#scene .comp[data-name="${c.name}"]`), sur = c.name + ' L[' + (c.rangs.L || []).map(p => p.etiq + '@' + (p.y - c.y)) + '] R[' + (c.rangs.R || []).map(p => p.etiq + '@' + (p.y - c.y)) + ']';
    if (!g.querySelector('.cb-arc') || g.querySelector('rect.body') || g.querySelector('.conn')) { r.repli.push(sur); return; } r.formes++;
    const cal = g.querySelector('text.cb-cal'); r.calibres.push(cal ? cal.textContent : '');
    const z = g.querySelector('rect.cb-zone'), zone = z && [+z.getAttribute('x'), +z.getAttribute('y'), +z.getAttribute('width'), +z.getAttribute('height')];
    const ports = [...(c.rangs.L || []).map(p => ({ x: 0, y: p.y - c.y })), ...(c.rangs.R || []).map(p => ({ x: c.w, y: p.y - c.y }))];
    const bouts = [...g.querySelectorAll('.lead')].map(l => l.tagName === 'line' ? { x: +l.getAttribute('x1'), y: +l.getAttribute('y1') } : (m => ({ x: +m[1], y: +m[2] }))(/^M([\d.\-]+) ([\d.\-]+)/.exec(l.getAttribute('d'))));
    const au = (u, v) => Math.abs(u.x - v.x) < 0.06 && Math.abs(u.y - v.y) < 0.06;
    const fils = D.fils.filter(w => !w.shunt && (w.de === c.name || w.vers === c.name)).flatMap(w => [w.pts[0], w.pts[w.pts.length - 1]]).filter(q => q && q.y >= c.y - 0.5 && q.y <= c.y + c.h + 0.5 && (Math.abs(q.x - c.x) < 0.06 || Math.abs(q.x - c.x - c.w) < 0.06)).map(q => ({ x: q.x - c.x, y: q.y - c.y }));
    const ok = c.w === LARGEUR.equip && zone && zone.join() === [c.lw, 0, c.w - c.lw - c.rw, c.h].map(f1).join() && bouts.length === ports.length
      && ports.every(p => bouts.some(b => au(b, p))) && fils.length >= 1 && fils.every(q => ports.some(p => au(p, q)));
    if (!ok) r.geometrie.push(sur + ' amenées ' + JSON.stringify(bouts) + ' fils ' + JSON.stringify(fils)); });
  return r;
}

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
    return { b: a.blocs, f: a.fils, d: Math.round(a.tauxDroits * 100), ib: a.filsDansBloc, ch: a.blocsChevauches, cr: a.croisements, ev: a.evitables, barrettes: app.dessin.barrettes.filter(b => b.nomVT).length }; });
  ok('se dessine sans défaut', essai.ib === 0 && essai.ch === 0, essai.b + ' blocs · ' + essai.f + ' fils · ' + essai.d + ' % droits');
  ok('ses deux dédoublements sont deux barrettes à poser', essai.barrettes === 2, essai.barrettes + ' trouvée(s)');
  ok('aucun croisement évitable', essai.ev === 0, essai.cr + ' croisement(s), dont ' + essai.ev + ' évitable(s)');
  /* Le numéro de fil est l'information numéro un d'un câbleur : il doit être
     écrit, et jamais barré par un fil ni collé à un voisin. Il s'écrit pile
     sur son fil (son milieu sur l'axe du trait) : la ligne de base tombe sous
     le trait, et la boîte se mesure depuis elle. Un numéro debout (sur un
     vertical) occupe une boîte tournée, et son propre vertical passe derrière
     lui : ce n'est pas une barre. */
  const nums = await page.evaluate(() => { atelier.essai(); peindre(); const W = app.dessin.fils;
    const avecNom = W.filter(w => !w.shunt && String(w.cable || '').trim()).length;   // un shunt n'a pas de segment où écrire
    const el = Array.from(document.querySelectorAll('#svg .filnum'));
    const boites = el.map(t => { const x = +t.getAttribute('x'), y = +t.getAttribute('y'); const l = t.textContent.length * 0.60 * 6;
      return t.getAttribute('transform') ? { x0: x - 5.6, x1: x, y0: y - l / 2, y1: y + l / 2 } : { x0: x - l / 2, x1: x + l / 2, y0: y - 5.6, y1: y }; });
    let chevauche = 0; for (let i = 0; i < boites.length; i++) for (let j = i + 1; j < boites.length; j++) { const a = boites[i], b = boites[j]; if (a.x1 > b.x0 && a.x0 < b.x1 && a.y1 > b.y0 && a.y0 < b.y1) chevauche++; }
    const vert = []; W.forEach(w => { for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1]; if (Math.abs(a.x - b.x) < 0.6 && Math.abs(a.y - b.y) > 1) vert.push({ n: w.cable, x: a.x, y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y) }); } });
    let barres = 0; boites.forEach((b, i) => { if (vert.some(v => v.n !== el[i].textContent && v.x > b.x0 && v.x < b.x1 && v.y1 > b.y0 && v.y0 < b.y1)) barres++; });
    return { avecNom, poses: el.length, chevauche, barres }; });
  ok('un câble n’a plus de numéro sur le plan (v84 : les W-xxx se font plus tard, dans un autre logiciel) : aucun ne s’écrit', nums.poses === 0 && nums.avecNom > 0, nums.poses + ' numéro écrit pour ' + nums.avecNom + ' câbles');
  ok('aucune étiquette n’en chevauche une autre', nums.chevauche === 0, nums.chevauche + ' chevauchement(s)');
  ok('aucune étiquette n’est barrée par un fil', nums.barres === 0, nums.barres + ' barrée(s)');

  /* L'ŒIL DU CÂBLEUR, sur les trois folios de l'exemple (un facile, un
     moyen, un très chargé) : rien ne s'écrit sur rien. Les boîtes viennent
     de getBBox(), ce sont les vraies. Un numéro de pastille est DANS sa
     pastille, sur le fil : il ne compte pas. */
  titre('4. L’EXEMPLE, FOLIO PAR FOLIO — rien ne s’écrit sur rien');
  const oeil = await page.evaluate(() => {
    chargerContrat(contratExemple(), 'exemple', 'Plan d’exemple');
    const out = { folios: [], muets: 0, fils: 0, chev: [], barres: [], nus: [] };
    // (v89) une boîte de texte porte son interligne (la place d'un jambage qu'un repère en capitales n'a pas) : deux boîtes qui se
    // frôlent de moins de 1,5 unité ne se touchent pas à l'encre (« 102CB1 » au-dessus de « 10 A » : 4 unités de blanc)
    const JEU = 1.5;
    for (const plan of plansDe(app.contrat.liaisons)) { allerAuPlan(plan); const D = app.dessin;
      const T = []; document.querySelectorAll('#scene text').forEach(t => { const cls = t.getAttribute('class') || '';
        if (!/^(filnum|rep|rep-strip|rep-petit|barnum|connnom|connpin|pinlbl|rep-big|des|rname|prnum|cb-cal)$/.test(cls)) return;
        let bb = t.getBBox(); const tr = t.getAttribute('transform'), m = tr && /rotate\(-90 ([\d.\-]+) ([\d.\-]+)\)/.exec(tr);
        if (m) { const cx = +m[1], cy = +m[2], P = [[bb.x, bb.y], [bb.x + bb.width, bb.y], [bb.x, bb.y + bb.height], [bb.x + bb.width, bb.y + bb.height]].map(([x, y]) => [cx + (y - cy), cy - (x - cx)]);
          const xs = P.map(q => q[0]), ys = P.map(q => q[1]); bb = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }; }
        const g = t.closest('.comp'); let dx = 0, dy = 0; if (g) { const k = /translate\(([\d.\-]+),([\d.\-]+)\)/.exec(g.getAttribute('transform')); if (k) { dx = +k[1]; dy = +k[2]; } }
        T.push({ txt: t.textContent, cls, x0: bb.x + dx, y0: bb.y + dy, x1: bb.x + dx + bb.width, y1: bb.y + dy + bb.height }); });
      const S = []; D.fils.forEach(w => { for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1]; S.push({ n: w.cable, x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y), h: Math.abs(a.y - b.y) < 0.6 }); } });
      (D.barrettes || []).forEach(b => { S.push({ n: 'piquage', x0: b.x, x1: b.x, y0: b.y1 + 3, y1: b.y2 - 3, h: false }); });
      for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) { const a = T[i], b = T[j]; if (a.x1 > b.x0 + JEU && a.x0 < b.x1 - JEU && a.y1 > b.y0 + JEU && a.y0 < b.y1 - JEU) out.chev.push(plan + ' : ' + a.txt + ' × ' + b.txt); }
      // un numéro de fil s'écrit DANS son fil, centré sur son axe (le fil passe derrière lui, à l'horizontale comme debout) :
      // un segment de ce fil n'est pas une barre
      T.forEach(t => S.forEach(s => { if (t.cls === 'filnum' && s.n === t.txt) return;
        const dedans = s.h ? (s.y0 > t.y0 + 0.4 && s.y0 < t.y1 - 0.4 && s.x1 > t.x0 + 0.4 && s.x0 < t.x1 - 0.4) : (s.x0 > t.x0 + 0.4 && s.x0 < t.x1 - 0.4 && s.y1 > t.y0 + 0.4 && s.y0 < t.y1 - 0.4);
        if (dedans) out.barres.push(plan + ' : ' + s.n + ' barre ' + t.txt); }));
      const nommes = D.fils.filter(w => !w.shunt && String(w.cable || '').trim()); out.fils += nommes.length;
      const ecrits = new Set([...document.querySelectorAll('#scene .filnum')].map(t => t.textContent));
      nommes.forEach(w => { if (!ecrits.has(w.cable)) { out.muets++; out.nus.push(plan + ' : ' + w.cable); } });
      out.folios.push(plan + ' (' + T.length + ' textes)'); }
    return out; });
  ok('aucun texte n’en chevauche un autre (repères, numéros, lettres)', oeil.chev.length === 0, oeil.chev.length ? oeil.chev.slice(0, 4).join(' | ') : oeil.folios.join(', '));
  ok('aucun repère ni numéro n’est barré par un fil', oeil.barres.length === 0, oeil.barres.length ? oeil.barres.slice(0, 4).join(' | ') : 'aucun');
  ok('aucun numéro de câble sur les six folios de l’exemple', oeil.muets === oeil.fils && oeil.fils > 100, oeil.fils - oeil.muets + ' numéro(s) écrit(s) pour ' + oeil.fils + ' câbles');

  /* LE DISJONCTEUR a sa forme, pas une boîte d'équipement (le lecteur : « les disjoncteurs ont leur propre forme ») : sur
     le folio 1 de l'exemple (102CB1, ses deux fils à droite, le calibre lu dans le part number MS3320-10) et sur les
     folios du corpus qui portent un disjoncteur (tests/corpus.js : sans, minimal, série, piquages, barrette longue ;
     trois graines chacun — dont 1, 2 et 3 sur un même flanc), que personne n'a réglés. */
  titre('5. LE DISJONCTEUR SUR LE FOLIO — sa forme, aux ports d’un équipement');
  const dj = { folios: 0, cbs: 0, formes: 0, repli: [], geometrie: [], chev: [], barres: [], calibres: [] };
  const noterDj = (nom, r) => { dj.folios++; dj.cbs += r.cbs; dj.formes += r.formes; ['repli', 'geometrie', 'chev', 'barres', 'calibres'].forEach(k => r[k].forEach(x => dj[k].push(nom + ' : ' + x))); };
  noterDj('exemple 1', await page.evaluate(src => { chargerContrat(contratExemple(), 'exemple', 'Plan d’exemple'); allerAuPlan('1'); return eval('(' + src + ')')(); }, disjoncteursDansLaPage.toString()));
  for (const profil of ['sans', 'minimal', 'serie', 'piquages', 'barretteLongue']) for (let g = 1; g <= 3; g++) {
    const L = await page.evaluate(genererDansLaPage, [g * 7919, profil]);
    noterDj(profil + ' #' + g, await page.evaluate(([L, src]) => { chargerContrat(L.map(l => liaison(l)), 'corpus', 'corpus'); return eval('(' + src + ')')(); }, [L, disjoncteursDansLaPage.toString()])); }
  ok('chaque disjoncteur prend sa forme (l’arc, le bouton), aucun ne garde la boîte', dj.cbs >= 15 && dj.formes === dj.cbs, dj.repli.length ? dj.repli.slice(0, 3).join(' | ') : dj.cbs + ' disjoncteurs sur ' + dj.folios + ' folios, tous en symbole');
  ok('la géométrie d’un équipement, au point près : la zone du corps, chaque fil à un port, une amenée par port', dj.geometrie.length === 0, dj.geometrie.length ? dj.geometrie.slice(0, 2).join(' | ') : 'emprise 144 × h, ports en x = 0 et x = c.w');
  ok('aucun texte d’un disjoncteur n’en chevauche un autre', dj.chev.length === 0, dj.chev.length ? dj.chev.slice(0, 4).join(' | ') : 'aucun');
  ok('aucun texte d’un disjoncteur n’est barré par un fil', dj.barres.length === 0, dj.barres.length ? dj.barres.slice(0, 4).join(' | ') : 'aucun');
  ok('le calibre s’écrit quand on le sait (« 10 A » : le part number de 102CB1), rien quand ni le part number ni un choix ne le disent', dj.calibres[0] === 'exemple 1 : 10 A' && dj.calibres.slice(1).every(x => / : $/.test(x)), dj.calibres.slice(0, 3).join(' | '));
  const exportDj = await page.evaluate(() => { chargerContrat(contratExemple(), 'exemple', 'Plan d’exemple'); allerAuPlan('1'); const S = svgDuFolio(), doc = new DOMParser().parseFromString(S.txt, 'image/svg+xml'), g = doc.querySelector('.comp[data-name="102CB1"]');
    return { xml: !doc.querySelector('parsererror'), style: /\.cb-arc[,{]/.test(S.txt) && /\.cb-cal\{/.test(S.txt), arc: !!(g && g.querySelector('.cb-arc')), cal: g && g.querySelector('.cb-cal') ? g.querySelector('.cb-cal').textContent : '' }; });
  ok('le SVG enregistré porte le symbole et son style, et se relit en XML', exportDj.xml && exportDj.style && exportDj.arc && exportDj.cal === '10 A', JSON.stringify(exportDj));

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

  /* ---- 8. LA VÉRITÉ (v73, domaine C ; reprise à la v89 sur les règles d'aujourd'hui) : un seul compte — « à régler », c'est
     ce qui a un geste, partout pareil (la pastille, P, le dossier PDF) ; un courant connu ou INCONNU, jamais supposé (le
     lecteur : « l'outil dit la vérité, pas inventé ») ; deux part numbers ; les mots du verdict (« disjoncte / ne disjoncte
     pas », jamais « tient ») ; le disjoncteur rangé à part dans la LPA ; le dossier qui dit ses hypothèses */
  titre('8. LA VÉRITÉ : UN COMPTE, UN COURANT CONNU OU INCONNU, LES MOTS DU VERDICT');
  const V8 = await page.evaluate(async () => { const r = {}; atelier.exempleSansCalibreAuto(); await new Promise(f => setTimeout(f, 600)); rendreControle();
    const C = compteProblemes(), A = compteARegler(), xs = CONTROLE.items, p = document.querySelector('#btnIndex .rd-point');
    r.compte = { ko: C.ko, att: C.att, mot: C.mot, regler: A.regler, voir: A.voir, items: xs.length, pastille: p ? p.textContent : '', aria: document.getElementById('btnIndex').getAttribute('aria-label') };
    CONTROLE.pas = null; problemeSuivant(1); r.p1 = document.getElementById('toast').textContent;
    // P parcourt tout ce qui est à régler, PUIS ce qui est à voir : son rang dit « À voir 1 / att »
    for (let i = 1; i < C.ko; i++) problemeSuivant(1); r.pDernier = document.getElementById('toast').textContent; problemeSuivant(1); r.p2 = document.getElementById('toast').textContent;
    // le courant : W-011 (la source du 102CB1, dont le profil est écrit) est connu ; W-012 (vers 103RL1, dont la consommation
    // n'est pas écrite) est INCONNU — et sa chute aussi ; sa protection, elle, se juge toujours
    const l11 = verite().find(x => x.cable === 'W-011'), l12 = verite().find(x => x.cable === 'W-012'), I11 = intensiteDuFil(l11), I12 = intensiteDuFil(l12), c11 = chuteDuFil(l11), c12 = chuteDuFil(l12);
    r.connu = { I: I11.I, source: I11.source, inconnu: I11.inconnu, dU: c11.dU }; r.inconnu = { I: I12.I, source: I12.source, inconnu: I12.inconnu, dU: c12.dU };
    r.w012 = problemesDuCable(l12).map(x => x.niveau + ' ' + x.texte); r.hyp = 'courant' in HYPOTHESES;
    const ligne = lignesFilsDisjoncteur('102CB1').find(x => x.l === l12); r.ligne = ligne ? { inconnu: ligne.inconnu, bulle: ligne.bulle } : null;
    const o = await pdfDuPlan(app.contrat.liaisons, app.nom, { ouvert: true });
    const doc = await pdfjsPret().getDocument({ data: o, isEvalSupported: false }).promise, txt = async i => (await (await doc.getPage(i)).getTextContent()).items.map(x => x.str).join(' ').replace(/\s+/g, ' ');
    const garde = await txt(1), page2 = await txt(2); r.pdf = { regler: (garde.match(/(\d+) à régler/) || [])[1], voir: (garde.match(/(\d+) à voir/) || [])[1], reperes: (garde.match(/(\d+) repères/) || [])[1],
      hyp: /Hypothèses et sources/.test(page2) && /Les profils de charge/.test(page2) && /102CB1/.test(page2), courant: /Courant\s+\d/.test(page2), coupes: 0 };
    for (const i of [1, 2, doc.numPages - 1, doc.numPages]) if (/…/.test(await txt(i))) r.pdf.coupes++;
    r.reperes = reperesDuContrat().length;
    // deux part numbers sur 102CB1 : un problème, à régler, « Unifier sur… » — chaque câble dit depuis 102CB1, vers son autre bout
    const champ = l11.de === '102CB1' ? 'pnDe' : 'pnVers'; changerLiaison(l11, champ, '4120-F-10A', 'un autre part number'); rendreControle();
    const pn = CONTROLE.items.find(x => x.genre === 'pn'), g = pn ? gestesDuPoint(pn) : [];
    r.pn = { niveau: pn && pn.niveau, texte: pn && pn.texte, gestes: g.map(x => x.mot).join(' | '), regler: pn ? !!rangDuPoint(pn).regler : false };
    if (g[0]) g[0].faire(); rendreControle(); r.pnApres = CONTROLE.items.some(x => x.genre === 'pn'); r.pnFinal = pnDuRepere('102CB1');
    return r; });
  ok('UN compte : « à régler », c’est ce qui a un geste — la pastille, son nom, « P » (« À régler 1 / N » … « N / N », puis « À voir 1 / M ») comptent pareil',
    V8.compte.ko === V8.compte.regler && V8.compte.att === V8.compte.voir && V8.compte.ko + V8.compte.att === V8.compte.items && V8.compte.pastille === String(V8.compte.ko) && V8.compte.aria.includes(V8.compte.mot)
    && new RegExp('^À régler 1 / ' + V8.compte.ko + ' ·').test(V8.p1) && new RegExp('^À régler ' + V8.compte.ko + ' / ' + V8.compte.ko + ' ·').test(V8.pDernier) && new RegExp('^À voir 1 / ' + V8.compte.att + ' ·').test(V8.p2),
    `${V8.compte.mot} · pastille ${V8.compte.pastille} · ${V8.p1.slice(0, 40)} · ${V8.pDernier.slice(0, 24)} · ${V8.p2.slice(0, 30)}`);
  ok('le dossier PDF compte pareil (« N à régler », « M à voir »), un seul compte de repères (celui du menu), la page « Hypothèses et sources » après la garde, aucun « … »',
    +V8.pdf.regler === V8.compte.ko && +V8.pdf.voir === V8.compte.att && +V8.pdf.reperes === V8.reperes && V8.pdf.hyp && V8.pdf.coupes === 0, `${V8.pdf.regler} à régler · ${V8.pdf.voir} à voir · ${V8.pdf.reperes} repères (menu ${V8.reperes}) · hypothèses ${V8.pdf.hyp} · pages coupées ${V8.pdf.coupes}`);
  ok('un courant CONNU : W-011 porte le permanent écrit au profil de 102CB1 (5 A), sa chute se calcule', V8.connu.I === 5 && V8.connu.source === 'profil' && !V8.connu.inconnu && V8.connu.dU > 0.3 && V8.connu.dU < 0.7, JSON.stringify(V8.connu));
  ok('un courant INCONNU : W-012 (la consommation de 104LP1 n’est pas écrite) n’a ni courant ni chute — VOLTA n’invente rien ; plus de « courant » dans les Hypothèses, ni dans le dossier',
    V8.inconnu.I == null && V8.inconnu.inconnu === true && V8.inconnu.dU == null && !V8.hyp && !V8.pdf.courant && !!V8.ligne && V8.ligne.inconnu && /Courant inconnu : écrivez la consommation de 104LP1/.test(V8.ligne.bulle), JSON.stringify(V8.inconnu) + ' · ' + (V8.ligne ? V8.ligne.bulle.replace(/\s+/g, ' ').slice(0, 90) : 'pas de ligne'));
  ok('la fiche du câble a SES points : la consommation à écrire (le courant en dépend) et la protection, qui se juge toujours (6,9 A admis en continu sous un 10 A)',
    V8.w012.some(t => /^att Consommation de 104LP1 à écrire/.test(t)) && V8.w012.some(t => /6,9 A admis en continu, moins que les 10 A du calibre/.test(t)) && !V8.w012.some(t => /\b2 A\b|supposé/.test(t)), V8.w012.join(' | ').slice(0, 260));
  ok('deux part numbers sur 102CB1 : un problème à régler, chaque câble dit vers son autre bout, « Unifier sur… » qui le règle',
    V8.pn.niveau === 'ko' && V8.pn.regler && /deux part numbers/.test(V8.pn.texte || '') && /4120-F-10A \(DR16 vers 101BT1:1\)/.test(V8.pn.texte || '') && !/vers 102CB1/.test(V8.pn.texte || '') && /^Unifier sur MS3320-10 \| Unifier sur 4120-F-10A/.test(V8.pn.gestes) && !V8.pnApres && V8.pnFinal === 'MS3320-10', (V8.pn.texte || '') + ' · ' + V8.pn.gestes);
  const V9 = await page.evaluate(async () => { const r = {}; atelier.exempleSansCalibreAuto(); await new Promise(f => setTimeout(f, 400));
    const d = disjonctionDe('102CB1'), mot = c => { const g = d.gamme.find(x => x.calibre === c); return (verdictDeCalibre(g) || {}).mot; };
    r.calibre = d.calibre; r.mots = d.gamme.map(g => g.calibre + ' ' + mot(g.calibre)); r.pourquoi = [5, 10].map(c => (pourquoiDuCalibre(app.norme, d, c) || {}).phrase || '');
    const E = explication('calibre', { verdict: d, calibre: d.calibre, origine: d.origine, meilleur: d.passe }); r.gamme = (E.etapes || []).join(' ');
    const N = nomenclatureDuContrat(); r.nomen = { connecteur: N.connecteurs.some(x => /^MS3320/.test(x.reference)), dj: N.disjoncteurs.map(x => [x.repere, x.reference, x.calibre, x.retest, x.etat].join(' ')) };
    ficheNomenclature(); await new Promise(f => setTimeout(f, 300)); r.fourreau = [...document.querySelectorAll('#fiche th')].some(th => th.textContent === 'Fourreau'); r.titres = [...document.querySelectorAll('#fiche .no-st')].map(h => h.firstChild.textContent).join(','); fermerFiche();
    return r; });
  ok('un disjoncteur, c’est mathématique : chaque calibre de la gamme « disjoncte » ou « ne disjoncte pas », point — le retenu est le plus petit qui ne disjoncte pas (10 A) ; jamais « tient », « passe », « touche », ni réserve',
    V9.mots.join() === '1 disjoncte,3 disjoncte,5 disjoncte,7.5 disjoncte,10 ne disjoncte pas,15 ne disjoncte pas,20 ne disjoncte pas' && V9.calibre === 10 && !/tient|\bpasse\b|touche|réserve|trop juste|10\s%/.test(V9.mots.join(' ') + V9.pourquoi.join(' ')), V9.mots.join(' · '));
  ok('le pourquoi, en ampères : ce qu’il tire, pendant combien de temps, le seuil où ce calibre disjoncte sur cette durée (« 9,31 A pendant 2,1 min ; … il ne disjoncte qu’au-delà de 9,66 A »)',
    /^5 A — disjoncte : le permanent, 5 A ; il disjoncte dès [\d,]+ A/.test(V9.pourquoi[0]) && /^10 A — ne disjoncte pas : démarrage et transition, 9,31 A pendant 2,1 min ; sur cette durée, il ne disjoncte qu’au-delà de [\d,]+ A/.test(V9.pourquoi[1]), V9.pourquoi.join(' | '));
  ok('le « ? » du calibre lit la gamme de la famille (MS3320 s’arrête à 20 A : pas de 25 A) et dit « aucune marge »', /gamme 2TC|gamme MS3320/i.test(V9.gamme) && !/25 A/.test(V9.gamme) && /aucune marge/.test(V9.gamme), V9.gamme.slice(0, 160));
  ok('la LPA : un groupe « Disjoncteurs » (102CB1, MS3320-10, 10 A, « ne disjoncte pas »), plus de disjoncteur en connecteur, plus de colonne vide', !V9.nomen.connecteur && V9.nomen.dj.length === 1 && /^102CB1 MS3320-10 10 .*ne disjoncte pas$/.test(V9.nomen.dj[0]) && !V9.fourreau && /Disjoncteurs/.test(V9.titres), V9.nomen.dj.join(' | ') + ' · ' + V9.titres);

  titre('BILAN');
  ok('aucune erreur console', erreurs.length === 0, erreurs.length ? erreurs.slice(0, 3).join(' | ') : 'aucune');
  console.log('\n  ' + (total - echecs) + ' / ' + total + ' contrôles passés' + (echecs ? '  —  ' + echecs + ' ÉCHEC(S)' : '  —  tout est vert'));
  await nav.close(); process.exit(echecs ? 1 : 0);
})();
