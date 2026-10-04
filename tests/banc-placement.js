/* ===========================================================================
   BANC DE MESURE DU PLACEMENT — combien de fils sortent DROITS ?
   ---------------------------------------------------------------------------
       node tests/banc-placement.js            mesure l'état courant
       node tests/banc-placement.js --json     sortie machine, pour comparer
       node tests/banc-placement.js --fichier=ancien/index.html   un autre fichier

   POURQUOI CE FICHIER EXISTE. On discutait du placement sans jamais le
   mesurer : « c'est mieux », « c'est pire », à l'œil, sur un dessin à la
   fois. Or le critère est parfaitement mesurable — un fil droit est un fil à
   deux points — et tout changement d'algorithme se juge là-dessus, pas au
   ressenti. Ce banc pose donc une RÉFÉRENCE CHIFFRÉE sur douze topologies qui
   ressemblent à du vrai câblage d'aéronef, et rend un tableau comparable
   d'une version à l'autre.

   CE QU'IL MESURE, par cas :
     droits      part des fils parfaitement horizontaux (LE critère) — un
                 fil qui passe par un raccord et la verticale d'un piquage
                 n'est PAS droit, même si son dernier segment l'est
     croisements nombre de croisements entre fils (piquages compris)
     évitables   croisements qu'un autre ordre des pistes de leur goulotte
                 supprimerait sans en créer, à placement fixé : c'est la
                 part du routeur, elle doit valoir 0 — sinon le banc rend 1
     surface     largeur × hauteur de la planche, en milliers d'unités
     format      largeur ÷ hauteur de L'EMPRISE DES BLOCS — pas de la feuille.
                 Première version : on mesurait LAST.layout.bbox, et toutes
                 les topologies rendaient 0.71 ou 1.41, c'est-à-dire le format
                 A normalisé. Évidemment : la feuille est calée sur un format
                 de papier, quoi qu'on dessine dessus. On mesure donc ce que
                 les blocs occupent réellement. Un dessin à 8:1 ou à 1:6 ne
                 tient sur aucune page, même si ses fils sont tous droits —
                 sauf s'il tient à l'échelle 1 dans la zone utile de l'A3
                 paysage, la feuille de tous les folios.
     densité     surface des blocs ÷ surface de leur emprise. Dit si la page
                 est remplie ou si les blocs serpentent dans du vide : la
                 chaîne de 20 équipements sortait à 100 % de fils droits en
                 occupant DEUX FOIS la surface du carrefour qui a pourtant le
                 double de blocs. Le taux de fils droits, seul, ne le voyait
                 pas.
     allongement longueur totale des fils rapportée à la distance à vol
                 d'oiseau : 1.00 = tous les fils vont tout droit
     partag.     segments partagés par deux fils de nets différents — une
                 connexion qui n'existe pas ; règle dure, doit valoir 0
     marches     fils qui font un escalier (un segment de moins de 12 entre
                 deux angles, deux verticales à moins de 24) ; règle dure
     ms          temps de rendu
   et les invariants sacrés, qui ne sont pas des mesures mais des
   conditions : aucun fil à travers un bloc étranger, aucun chevauchement,
   aucun segment partagé, aucune marche. Un cas qui les viole est marqué
   FAUX, quel que soit son score, et le banc rend 1.

   Sur les trois folios de l'exemple, des CONTRÔLES EXACTS a posteriori,
   au routage réel, rendent 1 s'ils échouent : aucun échange de deux
   bornes, aucun changement de flanc d'une borne, aucun glissement d'un bloc
   ne fait mieux ; aucun segment partagé par deux fils étrangers ; aucun
   corps étiré sans raison ; les masses collées ; les cas montrés du doigt.
   ========================================================================= */
const { chromium } = require('playwright');
const path = require('path');
const { fichierDemande, chargerDansLaPage, essaiDansLaPage, exempleDansLaPage, mesurerDansLaPage, preparerDansLaPage, echangesEvidentsDansLaPage,
        flancsEvidentsDansLaPage, glissementsEvidentsDansLaPage, segmentsPartagesDansLaPage, marchesDansLaPage, corpsEtiresDansLaPage,
        pastillesColleesDansLaPage, blocLisibleDansLaPage, filDroitOuJustifieDansLaPage, calculateurDansLaPage, blocsCollesDansLaPage } = require('./pilote');

const FICHIER = fichierDemande();
/* Un dessin trop allongé s'imprime trop petit — sauf s'il tient à l'échelle 1 dans la zone utile de la feuille, la même
   pour tous les folios (A3 paysage) : alors sa forme ne coûte rien (04, `tientALEchelle`). */
const horsFeuille = r => (r.format > 2.2 || r.format < 0.45) && !r.aLEchelle;
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

  /* Le contrat IRO AE de la base de retest : une barrette VT dont deux bornes
     sont pontées (un shunt, qui ne se trace pas) et une prise de coupure. */
  ['barrette shuntée et prise de coupure — IRO AE', () => [
    ['210SP1', '12', '667VT21', '1'], ['667VT21', '1', '667VT21', '2'], ['667VT21', '2', '115CD', '3'],
    ['667VT21', '3', '118CD', '3'], ['667VT21', '4', '409GH2', '7'], ['340AB1', '4', '512VN', '1'],
    ['340AB1', '4', '512VN', '2'], ['340AB1', '1', '210SP1', '3'], ['340AB2', '1', '210SP1', '4'],
    ['115CD', '8', '408VC1A', '1'], ['408VC1A', '2', '601RC', '2'], ['601RC', '5', '733LE', '1'],
    ['733LE', '4', '409GH2', '2'], ['118CD', '8', '512VN', '5'], ['409GH2', '9', '845VG', '3'],
    ['845VG', '1', '601RC', '7'], ['210SP1', '5', '115CD', '9'], ['340AB1', '7', '512VN', '8']]],

  ['contrat d’essai — le cas réel de référence', null],   // null = contratEssai()

  /* Les trois folios du contrat d'exemple, ceux qu'on voit en ouvrant l'outil :
     le troisième est le cas qui compte — 66 liaisons, un calculateur à trois
     connecteurs, deux barrettes à shunts, deux prises de coupure, des masses. */
  ['exemple, folio 1 — batterie, disjoncteur, relais', { plan: '1' }],
  ['exemple, folio 2 — barrette, prise de coupure', { plan: '2' }],
  ['exemple, folio 3 — 66 liaisons, très chargé', { plan: '3' }],
  /* Trois folios de taille moyenne, de structures différentes : un calculateur avec deux barrettes de
     distribution et des sondes à masses ; une chaîne de deux prises de coupure entre deux tronçons ; deux
     équipements de dix bornes qui se parlent à travers une barrette à piquages. */
  ['exemple, folio 4 — calculateur, deux barrettes, sondes', { plan: '4' }],
  ['exemple, folio 5 — chaîne de prises de coupure', { plan: '5' }],
  ['exemple, folio 6 — dix bornes contre dix, par une barrette', { plan: '6' }]
];

module.exports = { CAS };          // les topologies servent aussi aux essais sans navigateur
if (require.main === module) (async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await nav.newPage({ viewport: { width: 1500, height: 980 } });
  page.setDefaultTimeout(240000);
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e.message).slice(0, 140)));
  await page.goto(FICHIER);
  await page.waitForTimeout(1200);
  await page.evaluate(preparerDansLaPage);

  const res = [];
  for (const [nom, gen] of CAS) {
    const t0 = Date.now();
    if (!gen) await page.evaluate(essaiDansLaPage);
    else if (gen.plan) await page.evaluate(exempleDansLaPage, gen.plan);
    else await page.evaluate(chargerDansLaPage, gen());
    const ms = Date.now() - t0;
    const r = await page.evaluate(mesurerDansLaPage);
    const m = { blocs: r.blocs, fils: r.fils, larg: r.w, haut: r.h, droits: r.taux, crois: r.croisements, evit: r.evitables,
      surface: (r.w * r.h) / 1000, format: r.format, aLEchelle: r.aLEchelle, densite: r.densite, allong: r.allongement,
      ib: r.filsDansBloc, ch: r.chevauches, sup: r.superposees, rompus: r.rompus, partages: r.partages, marches: r.marches, ms };
    /* les gestes évidents : sur les folios de l'exemple, aucune permutation
       de deux bornes d'un connecteur, aucun changement de flanc d'une borne,
       aucun glissement d'un bloc ne doit faire mieux — moins de croisements
       ou de segments partagés sans moins de fils droits, ou l'inverse
       (vérification exacte, a posteriori, au routage réel) */
    if (gen && gen.plan) { m.echanges = await page.evaluate(echangesEvidentsDansLaPage);
      m.flancs = await page.evaluate(flancsEvidentsDansLaPage); m.glissements = await page.evaluate(glissementsEvidentsDansLaPage); }
    /* les cas que l'utilisateur a montrés du doigt, en contrôles exacts :
       aucun segment partagé par deux fils étrangers, aucun corps étiré sans
       raison, les masses collées à leur borne (tous les folios) ; sur le
       folio 2, W-120 droit ou un glissement qui ne fait pas mieux ; sur le
       folio 3, 381RL1 et 397TB1 lisibles */
    if (gen && gen.plan) { m.controles = [];
      const partages = await page.evaluate(segmentsPartagesDansLaPage);
      m.controles.push({ nom: 'aucun segment partagé par deux fils de nets différents', ok: !partages.n, detail: partages.detail.join(' | ') });
      const marches = await page.evaluate(marchesDansLaPage);
      m.controles.push({ nom: 'aucune marche : un fil est droit, fait un Z, ou un U par un couloir', ok: !marches.n, detail: marches.detail.join(' | ') });
      const etires = await page.evaluate(corpsEtiresDansLaPage);
      m.controles.push({ nom: 'aucun corps étiré (équipement ou réglette) que sa version tassée ne bat au juge (' + etires.etires + ' étiré' + (etires.etires > 1 ? 's' : '') + ')', ok: !etires.defauts.length, detail: etires.defauts.join(' | ') });
      const pastilles = await page.evaluate(pastillesColleesDansLaPage);
      m.controles.push({ nom: 'les masses (' + pastilles.masses + ') et les morceaux de barrette seuls (' + pastilles.morceaux + ') sont collés à leur borne', ok: !pastilles.loin.length, detail: pastilles.loin.join(' | ') });
      /* le calculateur seul dans sa colonne, au centre, ses morceaux de barrette entre lui et ce qu'ils servent (le
         lecteur : « deux équipements au-dessus du gros, c'est pas propre » ; 668VT31 au-dessus de 300XC1, 670VT41 rejetée
         au bord, 620SW4 sous 600XC4) */
      const colles = await page.evaluate(blocsCollesDansLaPage);
      m.controles.push({ nom: 'aucun bloc collé à un autre (huit unités au moins entre deux blocs d\'une colonne)', ok: !colles.length, detail: colles.join(' | ') });
      const calc = await page.evaluate(calculateurDansLaPage);
      if (calc.hub) m.controles.push({ nom: calc.hub + ' est seul dans sa colonne, au centre (' + calc.sousEnsembles + ' sous-ensembles), ses morceaux de barrette entre lui et ce qu\'ils servent', ok: !calc.defauts.length, detail: calc.defauts.join(' | ') });
      if (gen.plan === '2') { const f = await page.evaluate(filDroitOuJustifieDansLaPage, 'W-120');
        m.controles.push({ nom: 'W-120 (340AB1:1 → 210SP1:A3) est droit, ou le glissement qui le rendrait droit coûte plus qu\'il ne rapporte', ok: f.ok, detail: f.detail }); }
      /* chaque équipement du folio est lisible : aucune borne ne tourne le dos à son partenaire (un connecteur ne se coupe
         que justifié), aucun fil étranger dans son voisinage */
      const equips = await page.evaluate(() => atelier.dessin().comps.filter(c => c.kind === 'equip').map(c => c.name));
      const illisibles = [];
      for (const bloc of equips) { const df = await page.evaluate(blocLisibleDansLaPage, bloc); if (df.length) illisibles.push(bloc + ' : ' + df.join(', ')); }
      m.controles.push({ nom: 'les ' + equips.length + ' équipements sont lisibles : aucune borne ne tourne le dos à son partenaire, aucun fil étranger dans leur voisinage', ok: !illisibles.length, detail: illisibles.join(' | ') }); }
    res.push({ nom, ...m });
  }

  await nav.close();

  if (JSON_OUT) { console.log(JSON.stringify(res, null, 1)); process.exit(0); }

  /* ---- le tableau ---------------------------------------------------- */
  const pc = x => (Math.round(x * 1000) / 10).toFixed(1).padStart(5) + ' %';
  const n = (x, d) => Number(x).toFixed(d);
  console.log('\nBANC DE PLACEMENT — ' + res.length + ' topologies\n');
  console.log('  ' + 'cas'.padEnd(42) + 'blocs  fils   droits  croisem.  évit.  surface   format  densité  allong.  partag. marches    ms');
  console.log('  ' + '─'.repeat(141));
  let sD = 0, sF = 0, sC = 0, sE = 0, faux = 0;
  res.forEach(r => {
    const ko = r.ib || r.ch || r.sup || r.rompus || r.partages || r.marches;
    if (ko) faux++;
    sD += r.droits * r.fils; sF += r.fils; sC += r.crois; sE += r.evit;
    console.log('  ' + (ko ? '✗ ' : '  ') + r.nom.padEnd(40)
      + String(r.blocs).padStart(4) + String(r.fils).padStart(6)
      + '   ' + pc(r.droits) + String(r.crois).padStart(9) + String(r.evit).padStart(7)
      + n(r.surface, 0).padStart(9)
      + (n(r.format, 2) + (horsFeuille(r) ? '!' : ' ')).padStart(9)
      + (pc(r.densite) + (r.densite < 0.12 ? '!' : ' ')).padStart(9)
      + n(r.allong, 2).padStart(8) + String(r.partages).padStart(8) + String(r.marches).padStart(8) + String(r.ms).padStart(6)
      + (ko ? '   FAUX : filsDansBloc=' + r.ib + ' chevauch=' + r.ch + ' bornes superposées=' + r.sup + ' fils rompus=' + r.rompus + ' partagés=' + r.partages + ' marches=' + r.marches : ''));
  });
  console.log('  ' + '─'.repeat(141));
  console.log('  ' + 'ENSEMBLE, pondéré par le nombre de fils'.padEnd(42) + '        ' + pc(sF ? sD / sF : 0) + String(sC).padStart(9) + String(sE).padStart(7));
  if (sE) console.log('\n  ' + sE + ' croisement(s) ÉVITABLE(S) : le routeur laisse des croisements qu\'un autre ordre des pistes ôterait.');
  const vides = res.filter(r => r.densite < 0.12);
  if (vides.length) {
    console.log('\n  ' + vides.length + ' cas DESSINENT SURTOUT DU VIDE (densité marquée !) :');
    vides.forEach(r => console.log('    ' + r.nom + ' — les blocs occupent '
      + n(r.densite * 100, 1) + ' % de leur propre emprise'));
  }
  const horsPage = res.filter(horsFeuille);
  if (horsPage.length) {
    console.log('\n  ' + horsPage.length + ' cas NE TIENNENT SUR AUCUNE FEUILLE (format marqué !) :');
    horsPage.forEach(r => console.log('    ' + r.nom + ' — ' + Math.round(r.larg) + ' × '
      + Math.round(r.haut) + ', soit ' + n(r.format, 1) + ':1'));
  }
  if (faux) console.log('\n  ' + faux + ' cas VIOLENT un invariant sacré (fil dans un bloc, chevauchement, borne sur une autre, fil rompu, segment partagé, marche) — aucun score ne rachète ça.');
  let manques = 0;
  const gestes = [['echanges', 'les échanges évidents sont trouvés', 'paires', 'échange(s) de deux bornes'],
    ['flancs', 'les changements de flanc évidents sont trouvés', 'essais', 'changement(s) de flanc d\'une borne'],
    ['glissements', 'les glissements évidents sont trouvés', 'essais', 'glissement(s) d\'un bloc']];
  res.forEach(r => gestes.forEach(([cle, titre, compte, quoi]) => { const e = r[cle]; if (!e) return; manques += e.manques.length;
    console.log('\n  ' + (e.manques.length ? '✗ ' : '  ') + titre + ' — ' + r.nom + ' : '
      + (e.manques.length ? e.manques.length + ' manqué(s) sur ' + e[compte] + ' ' + quoi : 'aucun des ' + e[compte] + ' ' + quoi + ' ne fait mieux'));
    e.manques.forEach(x => console.log('      ' + x)); }));
  let rates = 0;
  res.filter(r => r.controles).forEach(r => r.controles.forEach(c => { if (!c.ok) rates++;
    console.log('\n  ' + (c.ok ? '  ' : '✗ ') + c.nom + ' — ' + r.nom + (c.detail ? ' : ' + c.detail : '')); }));
  if (erreurs.length) console.log('  erreurs console : ' + [...new Set(erreurs)].slice(0, 3).join(' | '));
  console.log('');
  process.exit(faux || manques || sE || rates ? 1 : 0);
})();
