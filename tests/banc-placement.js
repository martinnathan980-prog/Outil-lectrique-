/* ===========================================================================
   BANC DE MESURE DU PLACEMENT — combien de fils sortent DROITS ?
   ---------------------------------------------------------------------------
       node tests/banc-placement.js            mesure l'état courant
       node tests/banc-placement.js --json     sortie machine, pour comparer

   POURQUOI CE FICHIER EXISTE. On discutait du placement sans jamais le
   mesurer : « c'est mieux », « c'est pire », à l'œil, sur un dessin à la
   fois. Or le critère est parfaitement mesurable — un fil droit est un fil à
   deux points — et tout changement d'algorithme se juge là-dessus, pas au
   ressenti. Ce banc pose donc une RÉFÉRENCE CHIFFRÉE sur douze topologies qui
   ressemblent à du vrai câblage d'aéronef, et rend un tableau comparable
   d'une version à l'autre.

   CE QU'IL MESURE, par cas :
     droits      part des fils parfaitement horizontaux (LE critère)
     croisements nombre de croisements entre fils
     surface     largeur × hauteur de la planche, en milliers d'unités
     format      largeur ÷ hauteur de L'EMPRISE DES BLOCS — pas de la feuille.
                 Première version : on mesurait LAST.layout.bbox, et toutes
                 les topologies rendaient 0.71 ou 1.41, c'est-à-dire le format
                 A normalisé. Évidemment : la feuille est calée sur un format
                 de papier, quoi qu'on dessine dessus. On mesure donc ce que
                 les blocs occupent réellement. Un dessin à 8:1 ou à 1:6 ne
                 tient sur aucune page, même si ses fils sont tous droits.
     densité     surface des blocs ÷ surface de leur emprise. Dit si la page
                 est remplie ou si les blocs serpentent dans du vide : la
                 chaîne de 20 équipements sortait à 100 % de fils droits en
                 occupant DEUX FOIS la surface du carrefour qui a pourtant le
                 double de blocs. Le taux de fils droits, seul, ne le voyait
                 pas.
     allongement longueur totale des fils rapportée à la distance à vol
                 d'oiseau : 1.00 = tous les fils vont tout droit
     ms          temps de rendu
   et les deux invariants sacrés, qui ne sont pas des mesures mais des
   conditions : aucun fil à travers un bloc étranger, aucun chevauchement.
   Un cas qui les viole est marqué FAUX, quel que soit son score.
   ========================================================================= */
const { chromium } = require('playwright');
const path = require('path');

const FICHIER = 'file://' + path.resolve(__dirname, '..', 'index.html');
const JSON_OUT = process.argv.includes('--json');

/* ---- les douze topologies -------------------------------------------------
   Chacune est une forme qu'on rencontre vraiment dans un faisceau, pas une
   figure de théorie des graphes. Le nom dit ce qu'on regarde. */
const CAS = [
  ['étoile — un calculateur, 12 équipements', () => {
    const a = []; for (let i = 0; i < 12; i++) a.push(['CALC1', String(i + 1), 'E' + i, '1']); return a; }],

  ['escalier — bornier 24 bornes, 24 destinataires', () => {
    const a = []; for (let i = 0; i < 24; i++) a.push(['BORN1', String(i + 1), 'E' + i, '1']); return a; }],

  ['peigne — 4 départs sur la même borne', () => [
    ['SRC', '12', 'A1', '3'], ['SRC', '12', 'A2', '3'], ['SRC', '12', 'A3', '3'], ['SRC', '12', 'A4', '3'],
    ['A1', '8', 'B1', '2'], ['A2', '8', 'B2', '2'], ['A3', '8', 'B3', '2']]],

  ['chaîne — 20 équipements en série', () => {
    const a = []; for (let i = 0; i < 20; i++) a.push(['N' + i, '2', 'N' + (i + 1), '1']); return a; }],

  ['deux borniers en cascade', () => {
    const a = [];
    for (let i = 0; i < 10; i++) a.push(['BORN1', String(i + 1), 'BORN2', String(i + 1)]);
    for (let i = 0; i < 10; i++) a.push(['BORN2', String(i + 1), 'E' + i, '1']);
    return a; }],

  ['masse commune — 15 équipements vers un point', () => {
    const a = []; for (let i = 0; i < 15; i++) a.push(['E' + i, '20', '904G', '']); return a; }],

  ['arbre — un maître, 3 relais, 12 feuilles', () => {
    const a = [];
    for (let r = 0; r < 3; r++) { a.push(['MAITRE', String(r + 1), 'R' + r, '1']);
      for (let f = 0; f < 4; f++) a.push(['R' + r, String(f + 2), 'F' + r + '' + f, '1']); }
    return a; }],

  ['carrefour — un bloc à 40 bornes traversé', () => {
    const a = []; for (let i = 0; i < 20; i++) { a.push(['G' + i, '1', 'HUB', String(i + 1)]);
      a.push(['HUB', String(i + 21), 'D' + i, '1']); } return a; }],

  ['deux îlots indépendants', () => {
    const a = [];
    for (let i = 0; i < 8; i++) a.push(['A' + i, '2', 'A' + (i + 1), '1']);
    for (let i = 0; i < 8; i++) a.push(['B' + i, '2', 'B' + (i + 1), '1']);
    return a; }],

  ['aller-retour — deux blocs, 12 fils entre eux', () => {
    const a = []; for (let i = 0; i < 12; i++) a.push(['X1', String(i + 1), 'X2', String(12 - i)]); return a; }],

  ['boucle — 10 équipements en anneau', () => {
    const a = []; for (let i = 0; i < 10; i++) a.push(['C' + i, '2', 'C' + ((i + 1) % 10), '1']); return a; }],

  /* Les cas ci-dessus nomment leurs borniers « BORN1 », que l'outil ne
     reconnaît PAS comme un bornier : ils mesuraient donc le placement d'un
     équipement ordinaire à 24 bornes, pas celui d'une réglette. Les deux qui
     suivent portent de vrais repères — VT pour une barrette, XC pour un
     bornier de répartition — et exercent le chemin qui compte. */
  ['réglette VT — 20 bornes vers 20 appareils', () => {
    const a = []; for (let i = 0; i < 20; i++) a.push(['667VT21', String(i + 1), 'E' + i, '1']); return a; }],

  ['réglette VT traversante — amont et aval', () => {
    const a = [];
    for (let i = 0; i < 14; i++) { a.push(['SRC' + (i % 3), String(i + 1), '667VT21', String(i + 1)]);
      a.push(['667VT21', String(i + 1), 'E' + i, '1']); }
    return a; }],

  ['contrat d’essai — le cas réel de référence', null]   // null = contratEssai()
];

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await nav.newPage({ viewport: { width: 1500, height: 980 } });
  page.setDefaultTimeout(240000);
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e.message).slice(0, 140)));
  await page.goto(FICHIER);
  await page.waitForTimeout(1200);

  const res = [];
  for (const [nom, gen] of CAS) {
    const m = await page.evaluate(lignes => {
      const t0 = performance.now();
      if (lignes) {
        state.lk = lignes.map(l => ({ from: l[0], fromTerm: l[1], to: l[2], toTerm: l[3],
          nature: '', cable: '', ctype: '', route: '', plan: '', pn1: '', pn2: '' }));
        state.eq = deriveEq(state.lk);
        OVR.clear(); ORDH.clear(); state.sel = null; state.xroots = null; state.forceFull = true;
        render();
      } else { contratEssai(); }
      const ms = Math.round(performance.now() - t0);
      const a = auditSchema();
      const W = LAST.routing.wires;
      /* ALLONGEMENT : longueur réellement tracée ÷ distance à vol d'oiseau.
         Un fil droit vaut 1.00 ; un fil qui fait trois coudes pour contourner
         un bloc coûte cher et se voit ici, alors que le taux de fils droits,
         lui, le compte simplement comme « pas droit ». Les deux ensemble
         disent si le dessin est tendu ou s'il serpente. */
      let tracee = 0, vol = 0;
      W.forEach(w => {
        for (let i = 0; i < w.pts.length - 1; i++)
          tracee += Math.hypot(w.pts[i + 1].x - w.pts[i].x, w.pts[i + 1].y - w.pts[i].y);
        const A = w.pts[0], B = w.pts[w.pts.length - 1];
        vol += Math.hypot(B.x - A.x, B.y - A.y);
      });
      /* L'EMPRISE : ce que les blocs occupent, feuille et cartouche exclus. */
      const C = LAST.layout.comps.filter(c => c.kind !== 'tag');
      const x0 = Math.min(...C.map(c => c.x)), x1 = Math.max(...C.map(c => c.x + c.w));
      const y0 = Math.min(...C.map(c => c.y)), y1 = Math.max(...C.map(c => c.y + c.h));
      const eW = Math.max(1, x1 - x0), eH = Math.max(1, y1 - y0);
      const aireBlocs = C.reduce((s2, c) => s2 + c.w * c.h, 0);
      const bb = LAST.layout.bbox;
      return { blocs: a.blocs, fils: a.fils, larg: eW, haut: eH,
        droits: W.length ? countStraight(W) / W.length : 1,
        crois: countCrossings(W),
        surface: (eW * eH) / 1000, format: eW / eH, densite: aireBlocs / (eW * eH),
        allong: vol > 0 ? tracee / vol : 1,
        ib: a.filsDansBloc, ch: a.blocsChevauches, ms };
    }, gen ? gen() : null);
    res.push({ nom, ...m });
  }

  await nav.close();

  if (JSON_OUT) { console.log(JSON.stringify(res, null, 1)); process.exit(0); }

  /* ---- le tableau ---------------------------------------------------- */
  const pc = x => (Math.round(x * 1000) / 10).toFixed(1).padStart(5) + ' %';
  const n = (x, d) => Number(x).toFixed(d);
  console.log('\nBANC DE PLACEMENT — ' + res.length + ' topologies\n');
  console.log('  ' + 'cas'.padEnd(42) + 'blocs  fils   droits  croisem.  surface   format  densité  allong.    ms');
  console.log('  ' + '─'.repeat(118));
  let sD = 0, sF = 0, faux = 0;
  res.forEach(r => {
    const ko = r.ib || r.ch;
    if (ko) faux++;
    sD += r.droits * r.fils; sF += r.fils;
    console.log('  ' + (ko ? '✗ ' : '  ') + r.nom.padEnd(40)
      + String(r.blocs).padStart(4) + String(r.fils).padStart(6)
      + '   ' + pc(r.droits) + String(r.crois).padStart(9)
      + n(r.surface, 0).padStart(9)
      + (n(r.format, 2) + (r.format > 2.2 || r.format < 0.45 ? '!' : ' ')).padStart(9)
      + (pc(r.densite) + (r.densite < 0.12 ? '!' : ' ')).padStart(9)
      + n(r.allong, 2).padStart(8) + String(r.ms).padStart(6)
      + (ko ? '   FAUX : filsDansBloc=' + r.ib + ' chevauch=' + r.ch : ''));
  });
  console.log('  ' + '─'.repeat(118));
  console.log('  ' + 'ENSEMBLE, pondéré par le nombre de fils'.padEnd(42) + '        ' + pc(sF ? sD / sF : 0));
  const vides = res.filter(r => r.densite < 0.12);
  if (vides.length) {
    console.log('\n  ' + vides.length + ' cas DESSINENT SURTOUT DU VIDE (densité marquée !) :');
    vides.forEach(r => console.log('    ' + r.nom + ' — les blocs occupent '
      + n(r.densite * 100, 1) + ' % de leur propre emprise'));
  }
  const horsPage = res.filter(r => r.format > 2.2 || r.format < 0.45);
  if (horsPage.length) {
    console.log('\n  ' + horsPage.length + ' cas NE TIENNENT SUR AUCUNE FEUILLE (format marqué !) :');
    horsPage.forEach(r => console.log('    ' + r.nom + ' — ' + Math.round(r.larg) + ' × '
      + Math.round(r.haut) + ', soit ' + n(r.format, 1) + ':1'));
  }
  if (faux) console.log('\n  ' + faux + ' cas VIOLENT un invariant sacré — aucun score ne rachète ça.');
  if (erreurs.length) console.log('  erreurs console : ' + [...new Set(erreurs)].slice(0, 3).join(' | '));
  console.log('');
  process.exit(faux ? 1 : 0);
})();
