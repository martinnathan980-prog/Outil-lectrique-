/* ===========================================================================
   LE CERVEAU DES DISJONCTEURS — les mathématiques, sans navigateur (v84).
       node tests/disjoncteur-maths.js
   Un disjoncteur est valide ou pas valide, sans aucune marge : la courbe est
   une frontière, chaque point du profil tombe d'un côté ou de l'autre, et le
   calibre retenu est le plus petit qui ne disjoncte pas. On verrouille ici :
     1. la courbe, une frontière : le temps de déclenchement et le seuil (le
        multiple admis) en sont deux lectures, l'une l'inverse EXACTE de l'autre,
        monotones, continues, prolongées au-delà des points lus de la même pente ;
        la plus rapide est la plus rapide, la plus lente la plus lente ;
     2. le verdict : le seuil, le temps et le verdict disent toujours la même
        chose (des milliers de profils tirés au hasard, graine fixe), un arrondi
        d'affichage ne l'inverse jamais, aucune marge ne se glisse ;
     3. le bilan thermique, l'escalier, le préchauffage ;
     4. le calibre retenu, la gamme, la désignation construite, la chute ;
     5. les cas limites : courant nul, profil vide, durée infinie, courant énorme,
        calibre hors catalogue, courbe partielle, norme sans courbe ;
     6. ce que le câble admet : le même calcul que la fiche d'un câble, au palier
        de la durée.
   Rend 1 au premier échec.
   ========================================================================= */
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.join(__dirname, '..', 'src'), NORMES = path.join(__dirname, '..', 'normes');
const code = ['01-modele.js', '02-lecture.js', '09-barrettes.js', '09-disjoncteurs.js', '09-raccords.js', '09-chute.js', '09-references.js'].map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
const normes = fs.readdirSync(NORMES).filter(f => /\.csv$/i.test(f)).sort().map(f => fs.readFileSync(path.join(NORMES, f), 'utf8')).join('\n\n');
const bac = { console }; vm.createContext(bac);
vm.runInContext('const NORME_EMBARQUEE = ' + JSON.stringify(normes) + ';\n' + code + '\nthis.X = { normeEmbarquee, lireNorme, courbesDeDisjonction, tempsDeDeclenchement, multipleAdmis, pointsDuProfil, phasesDuProfil, verdictDisjonction, verdictDeCalibre, pourquoiDuCalibre, familleDuPn, calibreDuPn, calibresEnQueue, calibresDeLaFamille, catalogueDeLaFamille, pnAvecCalibre, chuteDuDisjoncteur, tenueGarantie, bilanThermique, facteurPrechauffage, HYPOTHESES, CALIBRES, motA, motDuree, protectionDesFils, admissionDuFil, palierDe };', bac);
const X = bac.X, NE = X.normeEmbarquee();
let total = 0, echecs = 0; const T0 = Date.now();
const ok = (nom, cond, mesure) => { total++; if (!cond) echecs++; console.log('  ' + (cond ? 'OK    ' : 'ÉCHEC ') + nom + (mesure ? '   — ' + mesure : '')); };
const td = X.tempsDeDeclenchement, mA = X.multipleAdmis;
const proche = (a, b, r) => Math.abs(a - b) <= (r || 1e-9) * Math.max(1, Math.abs(a), Math.abs(b));
// une grille en log : de 10^a à 10^b, n points par décade
const grille = (a, b, n) => { const xs = []; for (let e = a; e <= b + 1e-12; e += 1 / n) xs.push(Math.pow(10, e)); return xs; };
// toutes les familles de courbes de la norme, et quatre fenêtres de tableau (les courbes lues, interpolées)
const FAMILLES = [...new Set(NE.disjoncteurs.map(d => d.famille))], FENETRES = [{}, { tableauMin: -55, tableauMax: 71 }, { tableauMin: 0, tableauMax: 50 }, { tableauMin: -20, tableauMax: 100 }];
const TOUTES = FAMILLES.flatMap(f => FENETRES.map(H => ({ f, H, C: X.courbesDeDisjonction(NE, f, H) })));

console.log('\n1. LA COURBE EST UNE FRONTIÈRE : LE TEMPS ET LE SEUIL EN SONT DEUX LECTURES');
{ const MS = grille(-0.6, 2.6, 200), TS = grille(-4.5, 4.5, 100);
  let mono = 0, monoA = 0, inv = 0, ex = '', n = 0;
  TOUTES.forEach(({ f, C }) => C.forEach(c => {
    for (let i = 1; i < MS.length; i++) if (td(c, MS[i]) > td(c, MS[i - 1])) mono++;
    for (let i = 1; i < TS.length; i++) if (mA(c, TS[i]) > mA(c, TS[i - 1])) monoA++;
    // l'inverse exacte, sur la grille et sur chaque point lu (ses voisins immédiats aussi : les traits verticaux et horizontaux)
    const ms = MS.filter((_, i) => i % 3 === 0).concat(c.points.flatMap(p => [p.m, p.m * (1 - 1e-7), p.m * (1 + 1e-7)]));
    const ts = TS.filter((_, i) => i % 3 === 0).concat(c.points.flatMap(p => [p.t, p.t * (1 - 1e-7), p.t * (1 + 1e-7)]));
    const tds = ms.map(m => td(c, m)), mas = ts.map(t => mA(c, t));
    ms.forEach((m, i) => ts.forEach((t, j) => { n++; const a = t < tds[i], b = m < mas[j];
      // (pile sur la frontière, l'arrondi du dernier bit peut trancher d'un côté ou de l'autre : on ne compte que les écarts francs)
      if (a !== b && !proche(t, tds[i], 1e-12) && !proche(m, mas[j], 1e-12)) { inv++; if (!ex) ex = `${f} ${c.nom} : ${m} In, ${t} s`; } })); }));
  ok('le temps de déclenchement ne remonte jamais quand le courant croît, le seuil ne remonte jamais quand la durée croît — sur les ' + TOUTES.reduce((s, x) => s + x.C.length, 0) + ' courbes (7 familles × 4 fenêtres de tableau, les interpolées comprises)', mono === 0 && monoA === 0, mono + ' / ' + monoA);
  ok('l’inverse EXACTE : « durée < temps de déclenchement(courant) » ⟺ « courant < seuil(durée) », partout — dans les points lus, sur leurs traits verticaux et horizontaux, sous le premier multiple, au-delà du dernier point', inv === 0, n + ' couples jugés, ' + inv + ' en désaccord' + (ex ? ' (' + ex + ')' : ''));
  // continuité : la courbe passe par chacun de ses points (hors traits verticaux) et ne saute pas à leurs bornes
  let saut = 0, passe = 0;
  TOUTES.forEach(({ C }) => C.forEach(c => c.points.forEach((p, j) => { const P = c.points, vertical = (j && P[j - 1].m === p.m) || (j + 1 < P.length && P[j + 1].m === p.m);
    if (!vertical && !proche(td(c, p.m), p.t, 1e-12)) passe++;
    if (!vertical && j > 0 && j + 1 < P.length) { const g = td(c, p.m * (1 - 1e-9)), d = td(c, p.m * (1 + 1e-9)); if (!proche(g, p.t, 1e-6) || !proche(d, p.t, 1e-6)) saut++; } })));
  ok('continue : la courbe passe par chacun de ses points lus et ne saute à aucune borne de segment (hors traits verticaux, où elle prend le temps le plus court)', saut === 0 && passe === 0, saut + ' sauts, ' + passe + ' points manqués');
  const C = X.courbesDeDisjonction(NE), c125 = C[0], a = c125.points[20], b = c125.points[21], m = Math.sqrt(a.m * b.m);
  ok('entre deux points, une droite en log-log : au milieu géométrique des multiples, la moyenne géométrique des temps', proche(td(c125, m), Math.sqrt(a.t * b.t), 1e-12));
  const v = c125.points.findIndex((p, j) => j && c125.points[j - 1].m === p.m), V = c125.points[v];
  ok('sur un trait vertical (deux points lus au même multiple, 0,94466 In à 125 °C), le temps le plus court ; juste avant, le plus long', v > 0 && td(c125, V.m) === Math.min(...c125.points.filter(p => p.m === V.m).map(p => p.t)) && td(c125, V.m * (1 - 1e-12)) > td(c125, V.m), V.m + ' In : ' + td(c125, V.m).toFixed(1) + ' s');
  const Z = c125.points[0], L = c125.points[c125.points.length - 1];
  ok('les bords : sous le premier multiple, jamais ; à lui, son temps ; une durée infinie ou plus longue que le premier point, le premier multiple ; une durée nulle ou négative, rien (Infinity) ; un courant nul ou négatif, jamais',
    td(c125, Z.m * 0.999999) === Infinity && td(c125, Z.m) === Z.t && mA(c125, Infinity) === Z.m && mA(c125, Z.t * 10) === Z.m && mA(c125, 0) === Infinity && mA(c125, -1) === Infinity && td(c125, 0) === Infinity && td(c125, -2) === Infinity && td(c125, NaN) === Infinity);
  const s = (Math.log(L.t) - Math.log(c125.points[c125.points.length - 2].t)) / (Math.log(L.m) - Math.log(c125.points[c125.points.length - 2].m));
  ok('au-delà du dernier point lu (81,5 In, 2,8 ms), la pente de son dernier segment, des DEUX côtés : 200 In déclenchent en ' + (td(c125, 200) * 1000).toFixed(2) + ' ms, et 1 ms admet ' + mA(c125, 0.001).toFixed(1) + ' In — l’un l’inverse de l’autre',
    proche(td(c125, 200), L.t * Math.pow(200 / L.m, s), 1e-12) && proche(td(c125, mA(c125, 0.001)), 0.001, 1e-12) && mA(c125, 0.001) > L.m);
  const vide = { nom: 'vide', points: [] }, seul = { nom: 'seul', points: [{ m: 1.2, t: 100 }] };
  ok('une courbe vide ne fait jamais disjoncter ; une courbe d’un seul point garde son temps au-delà (pas de pente à prolonger), et son seuil sous ce temps n’existe pas', td(vide, 5) === Infinity && mA(vide, 1) === Infinity && td(seul, 1.1) === Infinity && td(seul, 9) === 100 && mA(seul, 1000) === 1.2 && mA(seul, 50) === Infinity);
  // les courbes PARTIELLES (relues sur un bout de figure) se prolongent aussi : rangées comme il faut
  const K = X.courbesDeDisjonction(NE, '7274'), k71 = K.find(c => /71/.test(c.nom)), k25 = K.find(c => /25 °C min/.test(c.nom)), k25x = K.find(c => /25 °C max/.test(c.nom)), k55 = K.find(c => /−55/.test(c.nom));
  ok('les courbes partielles (7274) se prolongent comme les autres, et restent rangées : à 10 In, la 71 °C (la plus rapide) disjoncte avant la 25 °C (' + (td(k71, 10) * 1000).toFixed(0) + ' contre ' + (td(k25, 10) * 1000).toFixed(0) + ' ms — gardée à son dernier temps, elle en mettait 62) ; en 2 s, la −55 °C (la plus lente) laisse passer plus que la 25 °C max (' + mA(k55, 2).toFixed(2) + ' contre ' + mA(k25x, 2).toFixed(2) + ' In — gardée, 3 In)',
    td(k71, 10) < td(k25, 10) && mA(k55, 2) > mA(k25x, 2) && mA(k55, 10) > mA(k25x, 10));
  // la plus rapide est la plus rapide, la plus lente la plus lente — là où toutes les courbes LUES de la famille l'ont été
  // (au-delà, une courbe partielle prolongée de sa pente au genou peut croiser sa voisine : la −55 °C de la 7274 passe sous la
  // 25 °C max vers 7 In, en moins de 0,6 s — loin des paliers de la protection, 2 s et plus)
  let pasRapide = 0, pasLente = 0, exR = '';
  TOUTES.forEach(({ f, H, C }) => { if (C.length < 2) return; const lues = X.courbesDeDisjonction(NE, f), mMax = Math.min(...lues.map(c => c.points[c.points.length - 1].m)), tMin = Math.max(...lues.map(c => c.points[c.points.length - 1].t));
    for (const m of MS.filter(m => m <= mMax)) { const t0 = td(C[0], m); if (C.slice(1).some(c => td(c, m) < t0 * (1 - 1e-9))) { pasRapide++; if (!exR) exR = f + ' ' + JSON.stringify(H) + ' ' + m.toFixed(3) + ' In'; } }
    for (const t of TS.filter(t => t >= tMin)) { const m0 = mA(C[C.length - 1], t); if (C.slice(0, -1).some(c => mA(c, t) > m0 * (1 + 1e-9))) pasLente++; } });
  ok('la courbe qui juge l’intempestif est, à chaque courant lu, la plus RAPIDE ; celle qui juge la protection, à chaque durée lue, la plus LENTE (toutes les familles, toutes les fenêtres)', pasRapide === 0 && pasLente === 0, pasRapide + ' / ' + pasLente + (exR ? ' (' + exR + ')' : ''));
  const C71 = X.courbesDeDisjonction(NE, '', { tableauMin: -55, tableauMax: 71 }), i71 = C71[0];
  ok('un tableau à 71 °C : la courbe qui juge est interpolée en température entre 23 °C min et 125 °C — à chaque courant, entre les deux', i71.interpolee && i71.temperature === 71 && MS.filter(m => m >= C[0].points[0].m && m <= 80).every(m => td(i71, m) >= td(C[0], m) * (1 - 1e-9) && td(i71, m) <= td(C[1], m) * (1 + 1e-9)));
  const norme = X.lireNorme('Famille;Courbe;Température;Multiple;Temps\nessai;chaud;100;1,1;1000\nessai;chaud;100;0;50\nessai;chaud;100;2;0\nessai;chaud;100;2;10\n'), ce = X.courbesDeDisjonction(norme)[0];
  ok('une ligne mal écrite dans une norme importée (multiple ou temps nuls) ne se lit pas : la courbe garde ses deux bons points, sans NaN', ce && ce.points.length === 2 && isFinite(td(ce, 1.5)) && td(ce, 1.5) > 10 && td(ce, 1.5) < 1000, ce ? ce.points.map(p => p.m + '/' + p.t).join(' ') : 'rien'); }

console.log(`   (${((Date.now() - T0) / 1000).toFixed(1)} s)`);
console.log('\n2. LE VERDICT : LE SEUIL, LE TEMPS ET LE VERDICT DISENT TOUJOURS LA MÊME CHOSE');
{ let graine = 84; const rnd = () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647; };
  const courant = () => +(0.2 + rnd() * 40).toFixed(2), duree = () => +Math.pow(10, -3 + rnd() * 5.5).toPrecision(3);
  const tirer = () => { const p = {}; if (rnd() < 0.85) p.dem = { i: courant(), t: duree() }; if (rnd() < 0.6) p.trans = { i: courant(), t: duree() }; if (rnd() < 0.85) p.perm = { i: +(rnd() * 18).toFixed(2) };
    if (rnd() < 0.4) p.plus = [{ nom: 'pointe', i: courant(), t: duree() }].concat(rnd() < 0.3 ? [{ nom: 'moteur', i: courant(), t: duree() }] : []); return p; };
  const FAM = [null, X.familleDuPn('MS3320-10', NE), X.familleDuPn('2TC7-20', NE), X.familleDuPn('7274-11-5', NE), X.familleDuPn('EN2495-5', NE), X.familleDuPn('MS14154-5', NE)];
  const HYP = [{}, { tableauMax: 71 }, { tableauMin: -20, tableauMax: 90 }, { prechauffage: 1 }, { prechauffage: 3.7 }];
  const c = { profils: 0, points: 0, seuilTemps: 0, okSeuil: 0, valide: 0, somme: 0, fraction: 0, parSomme: 0, monoCal: 0, monoI: 0, monoT: 0, ideal: 0, pire: 0, arrondi: 0, arrondiT: 0, gamme: 0 }, ex = {};
  const note = (k, x) => { c[k]++; if (!ex[k]) ex[k] = JSON.stringify(x).slice(0, 300); };
  // les arrondis de l'affichage : deux décimales pour les ampères, la grille de `motDuree` pour les durées (ms, 0,1 s, 0,1 min, 0,1 h)
  const lu = s => parseFloat(String(s).replace(/ /g, ' ').replace('−', '-').replace(',', '.'));
  const surGrille = t => { const s = X.motDuree(t), x = lu(s); return /ms$/.test(s) ? x / 1000 : /min$/.test(s) ? x * 60 : / h$/.test(s) ? x * 3600 : x; };
  for (let n = 0; n < 2500; n++) { const P = tirer(), F = FAM[n % FAM.length], H = HYP[(n >> 1) % HYP.length], cal = [1, 2.5, 3, 5, 7.5, 10, 15, 20, 25][n % 9];
    const V = X.verdictDisjonction(NE, '', cal, P, { famille: F, hyp: H }); if (V.sansProfil || V.sansCourbe) continue; c.profils++;
    V.points.forEach(p => { c.points++; const m = p.marges[0], perm = p.t === Infinity;
      const parTemps = perm ? p.avant === Infinity && (m.garanti == null || p.i <= m.garanti * (1 + 1e-12)) : p.t < p.avant, parSeuil = p.i < p.seuil;
      // une marche : l'inverse exacte ; le permanent : « ne disjoncte qu'au-delà de son seuil » quand il passe (courant ≤ seuil —
      // à ce qu'il garantit tout juste, il passe), « disjoncte dès son seuil » sinon (courant ≥ seuil — pile sur le premier
      // multiple de la courbe, il disjoncte : au bout du temps de ce point)
      if (!perm && parTemps !== parSeuil) note('seuilTemps', { P, cal, p: [p.i, p.t, p.seuil, p.avant] });
      if (perm && (parTemps ? !(p.i <= p.seuil * (1 + 1e-12)) : !(p.i >= p.seuil * (1 - 1e-12)))) note('seuilTemps', { P, cal, perm: [p.i, p.seuil] });
      // le verdict du point : son propre jugement, sauf celui que le bilan désigne (il passerait seul)
      if (p.parLaSomme ? !(p.ok === false && parTemps && V.somme >= 1) : p.ok !== parTemps) note('okSeuil', { P, cal, p: [p.i, p.t, p.ok, p.parLaSomme] });
      if (p.ok && !(Math.round(p.i * 100) <= Math.round(p.seuil * 100))) note('arrondi', { P, cal, p: [p.i, p.seuil] });
      if (p.ok === false && !p.parLaSomme && !(Math.round(p.i * 100) >= Math.round(p.seuil * 100))) note('arrondi', { P, cal, p: [p.i, p.seuil] });
      if (!perm && isFinite(p.avant) && (p.ok ? surGrille(p.t) > surGrille(p.avant) : !p.parLaSomme && surGrille(p.t) < surGrille(p.avant))) note('arrondiT', { P, cal, p: [p.t, p.avant] }); });
    const tous = V.points.every(p => p.ok !== false);
    if (V.valide !== tous) note('valide', { P, cal, F: F && F.famille, H, valide: V.valide, pts: V.points.map(p => [p.i, p.t, p.ok]) });
    if (V.valide && !(V.somme < 1 && V.points.every(p => p.t === Infinity || p.i < p.seuil))) note('somme', { P, cal });
    // la somme des parts des points est le bilan, quand chaque phase transitoire a sa marche
    const phases = X.phasesDuProfil(P), permI = Math.max(0, ...phases.filter(q => q.t === Infinity).map(q => q.i));
    if (phases.every(q => q.t === Infinity || q.i > permI) && !proche(V.points.reduce((s, p) => s + p.marges[0].fraction, 0), V.somme, 1e-9)) note('fraction', { P, cal });
    if (V.points.some(p => p.parLaSomme) && !(V.somme >= 1 && V.points.filter(p => p.parLaSomme).length === 1)) note('parSomme', { P, cal });
    // la gamme : monotone en calibre ; le même calibre, le même verdict ; son point qui décide dit le même verdict
    const vs = V.gamme.map(g => g.valide); for (let i = 1; i < vs.length; i++) if (vs[i - 1] && !vs[i]) note('monoCal', { P, F: F && F.famille, H, g: V.gamme.map(g => [g.calibre, g.valide]) });
    const g = V.gamme.find(x => x.calibre === cal); if (!g || g.valide !== V.valide || g.somme !== V.somme) note('gamme', { P, cal });
    if (V.gamme.some(x => !x.pire || (x.pire.ok === false) === x.valide)) note('pire', { P, cal });
    if (!V.valide && V.pire && V.pire.ok !== false) note('pire', { P, cal });
    const cat = V.gamme.filter(x => x.catalogue), mini = cat.find(x => x.valide); if ((mini ? mini.calibre : null) !== V.calibreIdeal) note('ideal', { P, ideal: V.calibreIdeal });
    // monotone en courant et en durée : plus fort, plus long, ne passe jamais mieux
    const fort = JSON.parse(JSON.stringify(P)); ['dem', 'trans', 'perm'].forEach(k => { if (fort[k]) fort[k].i *= 1.07; }); (fort.plus || []).forEach(x => { x.i *= 1.07; });
    if (X.verdictDisjonction(NE, '', cal, fort, { famille: F, hyp: H }).valide && !V.valide) note('monoI', { P, cal });
    const long = JSON.parse(JSON.stringify(P)); ['dem', 'trans'].forEach(k => { if (long[k]) long[k].t *= 1.3; }); (long.plus || []).forEach(x => { x.t *= 1.3; });
    if (X.verdictDisjonction(NE, '', cal, long, { famille: F, hyp: H }).valide && !V.valide) note('monoT', { P, cal }); }
  const dit = k => c[k] + (ex[k] ? ' — ' + ex[k] : '');
  ok(`chaque point (${c.points} sur ${c.profils} profils tirés au hasard, 6 familles, 5 jeux d’hypothèses, 9 calibres) : « sa durée reste sous le temps de déclenchement » ⟺ « son courant reste sous le seuil sur cette durée » ; le permanent qui passe reste sous son seuil (« il ne disjoncte qu’au-delà de »), celui qui disjoncte l’atteint (« il disjoncte dès »)`, c.seuilTemps === 0, dit('seuilTemps'));
  ok('le verdict d’un point est ce que disent son seuil et son temps — sauf le seul point que le bilan désigne quand chaque état passe seul et que leur somme atteint 1 (`parLaSomme`)', c.okSeuil === 0 && c.parSomme === 0, dit('okSeuil') + ' / ' + dit('parSomme'));
  ok('VALIDE ⟺ chaque point ne disjoncte pas — jamais un verdict « ne disjoncte pas » avec un point rouge sur la courbe, ni l’inverse ; valide, le bilan reste sous 1 et chaque courant sous son seuil', c.valide === 0 && c.somme === 0, dit('valide') + ' / ' + dit('somme'));
  ok('la somme des parts des points est exactement le bilan thermique (chaque phase à son préchauffage)', c.fraction === 0, dit('fraction'));
  ok('monotone : un calibre plus gros ne disjoncte jamais quand un plus petit ne disjoncte pas ; un courant plus fort (+ 7 %) ou un état plus long (+ 30 %) ne fait jamais passer ce qui disjonctait', c.monoCal === 0 && c.monoI === 0 && c.monoT === 0, [dit('monoCal'), dit('monoI'), dit('monoT')].join(' / '));
  ok('le calibre retenu est le plus petit du catalogue qui ne disjoncte pas ; chaque ligne de la gamme est le verdict de son calibre, et son point qui décide dit le même verdict qu’elle', c.ideal === 0 && c.gamme === 0 && c.pire === 0, [dit('ideal'), dit('gamme'), dit('pire')].join(' / '));
  ok('un arrondi d’affichage n’inverse jamais un verdict : le courant et le seuil arrondis au centième d’ampère, la durée et le temps de déclenchement sur la grille des mots (ms, 0,1 s, 0,1 min, 0,1 h) restent du même côté — au pire égaux', c.arrondi === 0 && c.arrondiT === 0, dit('arrondi') + ' / ' + dit('arrondiT'));
  // AUCUNE MARGE : un point juste sous la frontière ne disjoncte pas, juste dessus il disjoncte ; les hypothèses de marge d'autrefois ne changent rien
  const c0 = X.courbesDeDisjonction(NE)[0], s125 = mA(c0, 125) * 10, sous = X.verdictDisjonction(NE, '', 10, { dem: { i: s125 * 0.9999, t: 125 } }), dessus = X.verdictDisjonction(NE, '', 10, { dem: { i: s125 * 1.0001, t: 125 } });
  const permSous = X.verdictDisjonction(NE, '', 10, { perm: { i: c0.points[0].m * 10 * 0.9999 } }), permDessus = X.verdictDisjonction(NE, '', 10, { perm: { i: c0.points[0].m * 10 * 1.0001 } });
  const PROFIL = { dem: { i: 9.31, t: 5 }, trans: { i: 9.31, t: 120 }, perm: { i: 5 } }, avant = X.verdictDisjonction(NE, '', 10, PROFIL), marges = X.verdictDisjonction(NE, '', 10, PROFIL, { hyp: { marge: 10, margeTemps: 75 } });
  ok('AUCUNE MARGE : sur 125 s, un 10 A ne disjoncte pas à 0,01 % sous son seuil (' + s125.toFixed(3) + ' A) et disjoncte à 0,01 % au-dessus ; en permanent, de même autour de 9,236 A ; les hypothèses « marge 10 % » et « 75 % du temps » d’autrefois ne changent ni le verdict ni le calibre retenu',
    sous.valide && !dessus.valide && permSous.valide && !permDessus.valide && marges.valide === avant.valide && marges.calibreIdeal === avant.calibreIdeal && JSON.stringify(marges.gamme.map(g => g.valide)) === JSON.stringify(avant.gamme.map(g => g.valide))
    && avant.marges.marge === 0 && avant.marges.k === 1 && avant.marges.fraction === 1 && !avant.serre && avant.avecMarge === avant.valide && avant.gamme.every(g => g.marge === g.valide && !g.serre && g.sommeMarge === g.somme && g.permanentMargeOk === g.permanentOk)); }

console.log(`   (${((Date.now() - T0) / 1000).toFixed(1)} s)`);
console.log('\n3. LE BILAN THERMIQUE, L’ESCALIER, LE PRÉCHAUFFAGE');
{ const C = X.courbesDeDisjonction(NE), c = C[0];
  ok('l’escalier : un état dure autant que tous les états au moins aussi forts — 20 A 5 s, 12 A 5 + 60 s, 5 A pour toujours ; deux états au même courant ne font qu’un point (9,31 A, 125 s)',
    JSON.stringify(X.pointsDuProfil({ dem: { i: 20, t: 5 }, trans: { i: 12, t: 60 }, perm: { i: 5 } }).map(p => [p.i, p.t])) === '[[20,5],[12,65],[5,null]]' && JSON.stringify(X.pointsDuProfil({ dem: { i: 9.31, t: 5 }, trans: { i: 9.31, t: 120 }, perm: { i: 5 } }).map(p => [p.nom, p.i, p.t])) === '[["démarrage et transition",9.31,125],["permanent",5,null]]');
  const S = X.verdictDisjonction(NE, '', 10, { dem: { i: 15, t: 3 }, trans: { i: 12, t: 6 }, perm: { i: 5 } }), s15 = S.points.find(p => p.i === 15), s12 = S.points.find(p => p.i === 12);
  ok('le bilan (règle de Miner) : 15 A pendant 3 s (seul, il disjoncterait au bout de ' + s15.avant.toFixed(2) + ' s) puis 12 A, 9 s en tout (au bout de ' + s12.avant.toFixed(2) + ' s) — chaque marche à gauche de la courbe, mais 3/4,55 + 6/10,36 = ' + S.somme.toFixed(3) + ' ≥ 1 : il disjoncte ; le 15 A est le point que la somme désigne, et le point qui décide',
    !S.valide && proche(S.somme, 3 / td(c, 1.5) + 6 / td(c, 1.2), 1e-12) && s15.ok === false && s15.parLaSomme && s15.i < s15.seuil && s12.ok && S.pire === s15);
  // le préchauffage : un état en service, après le permanent, trouve le bilame chaud
  const H = X.HYPOTHESES, ph = p => X.phasesDuProfil(p), k = H.prechauffage;
  ok('le préchauffage (MS3320N table VII, hypothèse 1,6) : en plein dès 60 % de In au permanent ; dessous, en proportion du carré du courant ; sans permanent ou à 1, rien ; un calibre plus gros se préchauffe moins',
    k === 1.6 && X.facteurPrechauffage(H, ph({ perm: { i: 6 } }), 10) === 1.6 && X.facteurPrechauffage(H, ph({ perm: { i: 9 } }), 10) === 1.6 && proche(X.facteurPrechauffage(H, ph({ perm: { i: 3 } }), 10), 1 + 0.6 * 0.25, 1e-12)
    && X.facteurPrechauffage(H, ph({ dem: { i: 9, t: 3 } }), 10) === 1 && X.facteurPrechauffage({ prechauffage: 1 }, ph({ perm: { i: 6 } }), 10) === 1 && X.facteurPrechauffage(H, ph({ perm: { i: 6 } }), 15) < X.facteurPrechauffage(H, ph({ perm: { i: 6 } }), 10));
  const PC = { perm: { i: 6 }, plus: [{ nom: 'pointe', i: 12, t: 3 }] }, VC = X.verdictDisjonction(NE, '', 10, PC), V1 = X.verdictDisjonction(NE, '', 10, PC, { hyp: { prechauffage: 1 } }), pc = VC.points.find(p => p.i === 12), p1 = V1.points.find(p => p.i === 12);
  ok('une pointe de 12 A en service sur un 10 A chargé à 60 % disjoncte 1,6 fois plus vite (' + pc.avant.toFixed(2) + ' s contre ' + p1.avant.toFixed(2) + ' s), son seuil se lit sur 1,6 fois sa durée, sa part du bilan est 1,6 fois plus grande',
    proche(pc.avant, p1.avant / 1.6, 1e-12) && proche(pc.seuil, mA(c, 3 * 1.6) * 10, 1e-12) && proche(VC.somme, 1.6 * V1.somme, 1e-12) && VC.chauffe === 1.6 && V1.chauffe === 1);
  // la régression v84 : le bilan passait (0,77) et le point de la pointe, rouge sur la courbe, disjonctait — le verdict disait « ne disjoncte pas »
  const R = X.verdictDisjonction(NE, '', 10, { dem: { i: 12.5, t: 6 }, perm: { i: 6 }, plus: [{ nom: 'pointe', i: 12, t: 0.5 }] }), rp = R.points.find(p => p.i === 12);
  ok('v84 — démarrage 12,5 A 6 s, pointe en service 12 A 0,5 s, permanent 6 A, sur un 10 A : le bilan reste à ' + R.somme.toFixed(2) + ', mais la marche de la pointe (au moins 12 A pendant 6,5 s, préchauffée : il disjoncte au bout de ' + rp.avant.toFixed(2) + ' s) est à droite de la courbe — il DISJONCTE (avant : « ne disjoncte pas » sous un point rouge)',
    R.somme < 1 && rp.ok === false && !rp.parLaSomme && !R.valide && R.pire === rp && R.calibreIdeal === 15); }

console.log('\n4. LE CALIBRE RETENU, LE SEUIL EN CHIFFRES, LA DÉSIGNATION, LA CHUTE');
{ const PROFIL = { dem: { i: 9.31, t: 5 }, trans: { i: 9.31, t: 120 }, perm: { i: 5 } }, MS = X.familleDuPn('MS3320-10', NE);
  const V = X.verdictDisjonction(NE, '', 10, PROFIL, { famille: MS, pn: 'MS3320-10' }), p = V.points[0], V75 = X.verdictDisjonction(NE, '', 7.5, PROFIL, { famille: MS });
  ok('102CB1 de l’exemple (9,31 A pendant 2,1 min, 5 A permanents), MS3320 à 125 °C : un 10 A ne disjoncte qu’au-delà de ' + p.seuil.toFixed(2) + ' A sur cette durée, il ne disjoncterait qu’après ' + (p.avant / 60).toFixed(1) + ' min — il ne disjoncte pas ; un 7,5 A disjoncte dès ' + V75.points[0].seuil.toFixed(2) + ' A — VOLTA retient le 10 A (MS3320-10)',
    V.valide && Math.abs(p.seuil - 9.656) < 0.001 && Math.abs(p.avant / 60 - 36.3) < 0.05 && !V75.valide && Math.abs(V75.points[0].seuil - 7.242) < 0.001 && V.calibreIdeal === 10 && V.meilleur.pn === 'MS3320-10' && V.pire === p);
  const G = V.gamme.find(g => g.calibre === 10);
  ok('en permanent, le MS3320-10 au tableau à 125 °C ne garantit que 8 A (la feuille MS3320N, 0,80 In à 121 °C) — moins que les 9,24 A de la courbe : c’est le plus bas des deux qui est le seuil', G.tenu === 8 && V.points[1].seuil === 8 && X.verdictDisjonction(NE, '', 10, { perm: { i: 8 } }, { famille: MS }).valide && !X.verdictDisjonction(NE, '', 10, { perm: { i: 8.01 } }, { famille: MS }).valide);
  const P9 = X.verdictDisjonction(NE, '', 10, { dem: { i: 9.31, t: 125 }, perm: { i: 9 } });
  ok('quand rien ne disjoncte, le point qui décide est le plus près de son seuil EN AMPÈRES : 9 A permanents sous 9,24 A, plutôt que 9,31 A sur 125 s sous 9,66 A', P9.valide && P9.pire.t === Infinity && P9.pire.i === 9);
  const P6 = X.verdictDisjonction(NE, '', 5, { dem: { i: 30, t: 10 }, perm: { i: 6 } });
  ok('quand il disjoncte et que le permanent est en cause, c’est lui qui décide (il disjoncte quoi qu’il arrive)', !P6.valide && P6.pire.t === Infinity && P6.pire.ok === false);
  const D = { ...X.verdictDisjonction(NE, '', 10, PROFIL), profil: PROFIL, contexte: {} }, q5 = X.pourquoiDuCalibre(NE, D, 5), q75 = X.pourquoiDuCalibre(NE, D, 7.5), q10 = X.pourquoiDuCalibre(NE, D, 10), q4 = X.pourquoiDuCalibre(NE, D, 4);
  ok('le pourquoi d’un calibre se lit dans sa ligne de la gamme (son point qui décide), sans rejuger le profil — et hors de la gamme, il se juge : « 5 A — disjoncte : le permanent… », « 7,5 A — disjoncte : démarrage et transition, 9,31 A pendant 2,1 min », « 10 A — ne disjoncte pas »',
    /^5 A — disjoncte : le permanent, 5 A pour toujours : il ne garantit que 4,62 A$/.test(q5.phrase) && q75.phrase === '7,5 A — disjoncte : démarrage et transition, 9,31 A pendant 2,1 min' && /^10 A — ne disjoncte pas/.test(q10.phrase) && /^4 A — disjoncte/.test(q4.phrase), [q5.phrase, q75.phrase, q10.phrase, q4.phrase].join(' | '));
  // la désignation construite : relue, elle redit le calibre qu'on lui a donné
  const allerRetour = [['MS3320-10', 'MS3320'], ['2TC7-20', '2TC'], ['EN2995-001-7,5', 'EN2495'], ['483-G533-J1M1-B2S0ZN-5A', 'ETA483'], ['MS22073-5', '7274'], ['MS14105-20', '3TC']].map(([pn]) => { const F = X.familleDuPn(pn, NE);
    const rates = X.catalogueDeLaFamille(F).filter(c => { const q = X.pnAvecCalibre(pn, F, c), f2 = X.familleDuPn(q, NE); return !f2 || f2.famille !== F.famille || f2.calibre !== c; }); return { pn, rates }; });
  ok('la désignation d’un autre calibre (« à vérifier au catalogue » : construite) se relit : pour chaque calibre du catalogue de six familles, le part number construit redit sa famille et son calibre — MS3320-10 → MS3320-7-1/2, EN2995-001-7,5 → EN2995-001-10, sans part number le motif de la famille',
    allerRetour.every(x => !x.rates.length) && X.pnAvecCalibre('MS3320-10', MS, 7.5) === 'MS3320-7-1/2' && X.pnAvecCalibre('MS3320-10', MS, 0.5) === 'MS3320-1/2' && X.pnAvecCalibre('MS3320-7-1/2', MS, 10) === 'MS3320-10' && X.pnAvecCalibre('EN2995-001-7,5', X.familleDuPn('EN2995-001-7,5', NE), 10) === 'EN2995-001-10' && X.pnAvecCalibre('', MS, 15) === 'MS3320-15' && X.pnAvecCalibre('MS3320-10', MS, 0) === null && X.pnAvecCalibre('MS3320-10', null, 5) === null,
    allerRetour.filter(x => x.rates.length).map(x => x.pn + ' : ' + x.rates.join(', ')).join(' · '));
  const c10 = X.chuteDuDisjoncteur(NE, MS, 10), c1 = X.chuteDuDisjoncteur(NE, MS, 1), cI = X.chuteDuDisjoncteur(NE, null, 2), cE = X.chuteDuDisjoncteur(NE, X.familleDuPn('2TC7-20', NE), 25);
  ok('la chute du disjoncteur : la table de l’atelier d’abord (10 A : 0,2 V, quelle que soit la famille) ; hors d’elle, la famille (MS3320 1 A : 1,10 V) ; un part number inconnu, l’ETA4120 que le lecteur pose (2 A : 0,55 V) ; un calibre nul, rien',
    c10.chute === 0.2 && c10.atelier && c1.chute === 1.1 && !c1.atelier && cI.chute === 0.55 && cI.defaut && cE.chute === 0.15 && cE.atelier && X.chuteDuDisjoncteur(NE, MS, 0) === null && X.chuteDuDisjoncteur(NE, MS, -3) === null); }

console.log('\n5. LES CAS LIMITES');
{ const vide = X.verdictDisjonction(NE, '', 10, {}), nul = X.verdictDisjonction(NE, '', 10, { dem: { i: 0, t: 5 }, perm: { i: 0 } }), neg = X.verdictDisjonction(NE, '', 10, { dem: { i: -3, t: 5 }, trans: { i: 4, t: -2 } });
  ok('un profil vide, un courant nul, un courant ou une durée négatifs : rien ne se juge — sans profil, ni verdict, ni calibre retenu, ni ligne de gamme jugée',
    [vide, nul, neg].every(V => V.sansProfil && !V.valide && V.calibreIdeal === null && V.pire === null && V.gamme.every(g => g.valide === null) && X.verdictDeCalibre(V) === null));
  const texte = X.verdictDisjonction(NE, '', 10, { dem: { i: '9,31', t: '125' }, perm: { i: 'abc' } });
  ok('des nombres écrits à la française se lisent (« 9,31 ») ; un texte n’est pas un nombre', texte.points.length === 1 && texte.points[0].i === 9.31 && texte.points[0].t === 125);
  const inf = X.verdictDisjonction(NE, '', 10, { dem: { i: 8, t: Infinity }, perm: { i: 3 } }), infP = inf.points.find(p => p.i === 8);
  ok('un démarrage qui dure toujours est un permanent : jugé sous le premier multiple et ce que le disjoncteur garantit (8 A sous 9,24 A : il ne disjoncte pas ; 9,5 A : il disjoncte)', infP.t === Infinity && inf.valide && !X.verdictDisjonction(NE, '', 10, { dem: { i: 9.5, t: Infinity } }).valide);
  const gros = X.verdictDisjonction(NE, '', 10, { dem: { i: 2000, t: 0.0005 }, perm: { i: 3 } }), gp = gros.points[0], tres = X.verdictDisjonction(NE, '', 10, { dem: { i: 2000, t: 0.05 }, perm: { i: 3 } });
  ok('un courant énorme (2 000 A sur un 10 A, 200 In) : au-delà des points lus, la pente du dernier segment — 0,5 ms passe (il disjoncterait au bout de ' + (gp.avant * 1000).toFixed(2) + ' ms, seuil ' + gp.seuil.toFixed(0) + ' A), 50 ms disjoncte ; le seuil et le temps toujours d’accord',
    gros.valide && gp.avant > 0.0005 && gp.seuil > 2000 && !tres.valide && tres.points[0].seuil < 2000);
  const hors = X.verdictDisjonction(NE, '', 2.5, { perm: { i: 2 } }), hg = hors.gamme.find(g => g.calibre === 2.5);
  ok('un calibre hors du catalogue (2,5 A, lu dans un part number) se juge et entre dans la gamme, hors catalogue ; le retenu reste pris dans le catalogue', hg && hg.catalogue === false && hg.valide === hors.valide && hors.calibreIdeal === 3 && X.CALIBRES.includes(hors.calibreIdeal));
  const zero = X.verdictDisjonction(NE, '', 0, { perm: { i: 2 } }), nan = X.verdictDisjonction(NE, '', NaN, { perm: { i: 2 } });
  ok('un calibre nul ou illisible : le profil n’est pas jugé (points sans verdict), mais la gamme l’est et le retenu se trouve', [zero, nan].every(V => !V.valide && V.calibre === null && V.points.every(p => p.ok === null && p.seuil === null) && V.calibreIdeal === 3));
  const sans = X.verdictDisjonction({ ...NE, disjoncteurs: [] }, '', 10, { perm: { i: 2 } });
  ok('une norme sans courbe de disjonction : rien ne se juge, et ça se dit (sansCourbe) — ni verdict, ni calibre retenu', sans.sansCourbe === true && !sans.valide && sans.calibreIdeal === null && X.verdictDeCalibre(sans) === null && sans.points.every(p => p.ok === null));
  const P74 = X.verdictDisjonction(NE, '', 5, { dem: { i: 60, t: 0.02 }, perm: { i: 2 } }, { famille: X.familleDuPn('MS22073-5', NE) }), p74 = P74.points[0];
  ok('une courbe partielle (MS22073 : la 7274 à 71 °C, lue jusqu’à 6,3 In) juge au-delà de son dernier point comme les autres : 12 In pendant 20 ms — il disjoncterait au bout de ' + (p74.avant * 1000).toFixed(1) + ' ms, seuil ' + p74.seuil.toFixed(1) + ' A ; le verdict, le seuil et le temps d’accord',
    p74.avant < 0.0615 && (p74.ok === (p74.t < p74.avant)) && (p74.ok === (p74.i < p74.seuil)) && P74.valide === p74.ok); }

console.log('\n6. CE QUE LE CÂBLE ADMET : LE MÊME CALCUL QUE LA FICHE D’UN CÂBLE');
{ const P = { dem: { i: 9.31, t: 5 }, trans: { i: 30, t: 1.5 }, plus: [{ nom: 'pointe', i: 12, t: 30 }, { nom: 'moteur', i: 11, t: 125 }], perm: { i: 5 } }, FILS = [{ cable: 'W-1', type: 'DR16' }, { cable: 'W-2', type: 'DR20' }, { cable: 'W-3', type: 'DR24' }];
  let ecarts = 0; const vus = [];
  for (const hyp of [{}, { ambiante: 70 }, { ambiante: 120, conditions: [] }, { conditions: ['faisceau'], fils: 15, charge: 20, altitude: 30000 }]) {
    const H = { ...X.HYPOTHESES, ...hyp };
    X.protectionDesFils(NE, 10, P, FILS, hyp).forEach(f => { const A = X.admissionDuFil(NE, f.type, H);
      if (!proche(f.continu, A.continu, 1e-12) || !proche(f.facteur, A.facteurContinu, 1e-12) || !proche(f.facteurCourt, A.facteurCourt, 1e-12)) ecarts++;
      f.phases.forEach(p => { if (!proche(p.admise, A.admise(p.t), 1e-12)) ecarts++; vus.push(p.t); }); }); }
  const amb = X.protectionDesFils(NE, 10, P, [FILS[0]], { ambiante: 70 })[0], A70 = X.admissionDuFil(NE, 'DR16', { ...X.HYPOTHESES, ambiante: 70 }), p125 = amb.phases.find(p => p.t > 60 && p.t !== Infinity);
  ok('ce que le câble admet à chaque état est LE calcul de la fiche d’un câble (`admissionDuFil`) — quatre jeux d’hypothèses (95 °C, 70 °C, 120 °C sans faisceau, 15 câbles à 20 % à 30 000 ft), trois gauges, des états de 1,5 s à 125 s et le permanent',
    ecarts === 0 && vus.length > 40, ecarts + ' écarts');
  ok('le facteur suit le PALIER de la durée : à 70 °C d’ambiante, un état de 125 s se juge sur le continu, AVEC l’ambiante (' + p125.admise.toFixed(2) + ' A, comme le permanent) — avant v84, sans elle (' + (A70.fil.intensite * A70.facteurCourt).toFixed(2) + ' A)',
    X.palierDe(125) === Infinity && proche(p125.admise, amb.continu, 1e-12) && !proche(p125.admise, A70.fil.intensite * A70.facteurCourt, 1e-3)); }

console.log(`\n${total - echecs} / ${total} contrôles passés${echecs ? ` — ${echecs} échec(s)` : '  —  tout est vert'}`);
process.exit(echecs ? 1 : 0);
