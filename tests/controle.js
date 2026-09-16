/* ===========================================================================
   CONTRÔLE COMPLET DE L'OUTIL — à lancer avant tout déploiement.
   ---------------------------------------------------------------------------
       node tests/controle.js
   (sous Linux avec Playwright et Chromium ; voir tests/LISEZMOI.md)

   POURQUOI CE FICHIER EST DANS LE DÉPÔT. La batterie de contrôle vivait dans
   un dossier temporaire. Il a été vidé pendant une pause du projet, et le
   filet de sécurité a disparu avec : plus moyen de vérifier qu'un changement
   ne cassait rien. Versionnée, elle survit, elle se relit, et n'importe qui
   peut la lancer.

   CE QU'ELLE VÉRIFIE, dans l'ordre où ça compte :
     1. le fichier se charge seul, bibliothèque Excel comprise ;
     2. le DESSIN reste sain sur la base embarquée — c'est l'invariant le plus
        important : aucun fil ne traverse un bloc, aucun bloc n'en chevauche
        un autre ;
     3. le contrat d'essai se dessine et ses barrettes sont repérées ;
     4. les trois règles de prise de coupure répondent, et ne répondent PAS
        quand la localisation manque ;
     5. l'identification par empreinte reconnaît un équipement modifié ;
     6. le classement des contrats désigne le bon point de départ et lit les
        pièces manquantes dans le différentiel.

   Chaque contrôle affiche OK ou ÉCHEC avec la mesure. Le code de sortie vaut
   1 si un seul contrôle échoue, pour qu'un enchaînement automatique s'arrête.
   ========================================================================= */
const { chromium } = require('playwright');
const path = require('path');

const FICHIER = 'file://' + path.resolve(__dirname, '..', 'index.html');
let echecs = 0, total = 0;

function ok(nom, cond, mesure) {
  total++;
  if (!cond) echecs++;
  console.log('  ' + (cond ? 'OK    ' : 'ÉCHEC ') + nom + (mesure ? '   — ' + mesure : ''));
}
function titre(t) { console.log('\n' + t); }

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await nav.newPage({ viewport: { width: 1500, height: 980 } });
  page.setDefaultTimeout(180000);
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));

  await page.goto(FICHIER);
  await page.waitForTimeout(1200);

  // ---- 1. chargement --------------------------------------------------
  titre('1. CHARGEMENT');
  const base = await page.evaluate(() => ({
    xlsx: typeof XLSX !== 'undefined' && !!XLSX.utils,
    manquantes: ['contratEssai', 'identifier', 'identIndexer', 'manquants', 'coupuresEntre',
      'rbLoad', 'rbAnalyse', 'contratsProches', 'differentiel', 'zonesExemple']
      .filter(f => typeof window[f] !== 'function'),
    zones: ZONES.provisoire.length, cadre: ZONES.CADRE
  }));
  ok('bibliothèque Excel intégrée', base.xlsx);
  ok('toutes les fonctions présentes', base.manquantes.length === 0,
    base.manquantes.length ? 'manquent : ' + base.manquantes.join(', ') : base.zones + ' zones, cadre ' + base.cadre + ' mm');

  // ---- 2. le dessin, sur la base embarquée ----------------------------
  titre('2. DESSIN — invariants sur la base embarquée');
  for (const rep of ['2541', '3563', '1692', '198', '426']) {
    const r = await page.evaluate(n => {
      exploreStart(n); const a = auditSchema();
      return { b: a.blocs, d: Math.round(a.tauxDroits * 100), c: a.croisements,
               ib: a.filsDansBloc, ch: a.blocsChevauches };
    }, rep);
    ok('repère ' + rep, r.ib === 0 && r.ch === 0 && r.d >= 90,
      r.b + ' blocs · ' + r.d + ' % droits · ' + r.c + ' croisements · filsDansBloc=' + r.ib + ' chevauch=' + r.ch);
  }

  // ---- 3. le contrat d'essai ------------------------------------------
  titre('3. CONTRAT D’ESSAI');
  const essai = await page.evaluate(() => {
    contratEssai(); fit(); const a = auditSchema();
    return { b: a.blocs, f: a.fils, d: Math.round(a.tauxDroits * 100),
             ib: a.filsDansBloc, ch: a.blocsChevauches,
             barrettes: (LAST.routing.barrettes || []).length };
  });
  ok('se dessine sans défaut', essai.ib === 0 && essai.ch === 0,
    essai.b + ' blocs · ' + essai.f + ' fils · ' + essai.d + ' % droits');
  ok('les deux barrettes sont repérées', essai.barrettes === 2, essai.barrettes + ' trouvée(s)');

  // ---- 4. les trois règles de coupure ---------------------------------
  titre('4. PRISES DE COUPURE — les trois règles');
  const coup = await page.evaluate(() => {
    const avant = manquants();                    // sans localisation
    ZONES.charger([['Device', 'Zone'],
      ['210SP1', 'Z2'],   // poste gauche, x=2500
      ['115CD', 'Z5'],    // cabine DROITE  -> règle côté
      ['409GH2', 'Z10'],  // poutre, x=12000 -> règle cadre 10000
      ['512VN', 'Z12'],   // EXTÉRIEUR       -> règle peau
      ['340AB1', 'Z2']]);
    const apres = manquants();
    return { avantCoup: avant.coupures.length, avantSansPos: avant.sansPosition,
      regles: apres.coupures.map(c => c.de + '>' + c.vers + ':' + c.regles.map(x => x.regle).join('+')) };
  });
  ok('sans localisation, aucune coupure inventée', coup.avantCoup === 0,
    coup.avantSansPos + ' liaisons signalées sans position');
  ok('règle « côté »', coup.regles.some(x => /côté/.test(x)), coup.regles.filter(x => /côté/.test(x))[0] || '—');
  ok('règle « peau »', coup.regles.some(x => /peau/.test(x)), coup.regles.filter(x => /peau/.test(x))[0] || '—');
  ok('règle « cadre 10000 »', coup.regles.some(x => /cadre/.test(x)), coup.regles.filter(x => /cadre/.test(x))[0] || '—');

  // ---- 5 et 6. identification et choix du contrat de départ -----------
  titre('5. IDENTIFICATION ET CHOIX DU CONTRAT');
  const gros = await page.evaluate(async () => {
    const EN = ['Harness', 'Device1', 'Pin1', 'PN1', 'Description1', 'Cable T/G', 'Cable Tag', 'Route',
      'Device2', 'Pin2', 'PN2', 'Description2', 'FWD', 'Cable Length (mm)', 'Appareil', 'Date retest'];
    const aoa = [[''], ['x'], [], EN];
    const add = (ap, d1, p1, pn1, d2, p2, pn2, rt) =>
      aoa.push(['H', d1, p1, pn1 || '', '', 'DR24', 't', rt || '1M', d2, p2, pn2 || '', '', 'SPE', '1200', ap, '']);
    // IRO AE : le même câblage que le contrat d'essai, barrettes en place
    add('IRO AE', '210SP1', '12', '*70', '667VT21', '1', 'ASNE0500-04');
    add('IRO AE', '667VT21', '1', 'ASNE0500-04', '667VT21', '2', 'ASNE0500-04');
    add('IRO AE', '667VT21', '2', 'ASNE0500-04', '115CD', '3', 'ABS0864-12');
    add('IRO AE', '667VT21', '3', 'ASNE0500-04', '118CD', '3', 'ABS0864-12');
    add('IRO AE', '667VT21', '4', 'ASNE0500-04', '409GH2', '7', 'NSA937802-05');
    add('IRO AE', '340AB1', '4', 'EN2997', '512VN', '1', 'E0644G9S');
    add('IRO AE', '340AB1', '4', 'EN2997', '512VN', '2', 'E0644G9S');
    add('IRO AE', '340AB1', '1', 'EN2997', '210SP1', '3', '*70');
    add('IRO AE', '340AB2', '1', 'EN2997', '210SP1', '4', '*70');
    add('IRO AE', '115CD', '8', 'ABS0864-12', '408VC1A', '1', 'EN3646', '1M');
    add('IRO AE', '408VC1A', '2', 'EN3646', '601RC', '2', 'E0836', '2M');
    add('IRO AE', '601RC', '5', 'E0836', '733LE', '1', 'E0644');
    add('IRO AE', '733LE', '4', 'E0644', '409GH2', '2', 'NSA937802-05');
    add('IRO AE', '118CD', '8', 'ABS0864-12', '512VN', '5', 'E0644G9S');
    add('IRO AE', '409GH2', '9', 'NSA937802-05', '845VG', '3', 'E0656');
    add('IRO AE', '845VG', '1', 'E0656', '601RC', '7', 'E0836');
    // IRO AD : même matériel, câblage différent
    add('IRO AD', '210SP1', '5', '*70', '115CD', '9', 'ABS0864-12');
    add('IRO AD', '340AB1', '7', 'EN2997', '512VN', '8', 'E0644G9S');
    // JCG AA : sans rapport
    for (let i = 0; i < 20; i++) add('JCG AA', '77ZZ' + i, '1', 'B', '88YY' + i, '2', 'C');

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Retest');
    await rbLoad(new File([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], 'r.xlsm'));
    document.getElementById('rmodal').style.display = 'none';

    contratEssai();
    const ident = identifier();
    const un = ident.filter(x => x.dev === '340AB1')[0];
    const cls = contratsProches();
    const dif = differentiel(cls[0].contrat);
    return {
      lignesLues: RB.rows.length - RB.head - 1,
      identifie340: un ? { v: un.verdict.t, top: (un.cands[0] || {}).nom, c2: (un.cands[0] || {}).cov2 } : null,
      meilleur: cls[0] ? cls[0].contrat : null,
      tauxCablage: cls[0] ? cls[0].tauxLiaisons : 0,
      second: cls[1] ? cls[1].contrat + ' ' + cls[1].tauxLiaisons + '%' : '—',
      pieces: dif ? dif.pieces.map(z => z.nom) : []
    };
  });
  ok('la base d’essai est lue', gros.lignesLues > 30, gros.lignesLues + ' lignes');
  ok('340AB1 reconnu malgré ses bornes déplacées',
    !!gros.identifie340 && gros.identifie340.top === '340AB1',
    gros.identifie340 ? gros.identifie340.top + ' · bornes déplacées ' + gros.identifie340.c2 + ' %' : '—');
  ok('le bon contrat de départ est désigné', gros.meilleur === 'IRO AE',
    gros.meilleur + ' à ' + gros.tauxCablage + ' % de câblage commun (second : ' + gros.second + ')');
  ok('la barrette manquante est lue dans le différentiel',
    gros.pieces.indexOf('667VT21') >= 0, gros.pieces.join(', ') || 'aucune');
  ok('la prise de coupure manquante aussi',
    gros.pieces.indexOf('408VC1A') >= 0, gros.pieces.join(', ') || 'aucune');

  // ---- 6. écrire les pièces dans le contrat, et savoir revenir --------
  titre('6. COMPLÉTER LE CONTRAT');
  const ecr = await page.evaluate(() => {
    const empreinte = () => (state.lk || []).map(l =>
      [l.from, l.fromTerm, l.to, l.toTerm].join('|')).sort().join('\n');
    const avant = empreinte(), nAvant = state.lk.length;
    const ref = contratsProches()[0].contrat;
    const plan = planPieces(ref);
    const r = appliquerPieces(plan);
    const apresN = state.lk.length;
    const a = auditSchema();
    // les pièces sont-elles réellement dans le dessin ?
    const noms = new Set((LAST.layout.comps || []).map(c => String(c.name).toUpperCase()));
    const posees = plan.map(x => x.piece).filter(n2 => noms.has(n2));
    // chaque ligne créée porte-t-elle sa provenance ?
    const sansSrc = state.lk.filter(l => l.src === undefined).length;
    const avecSrc = state.lk.filter(l => l.src).length;
    annulerPieces();
    return { nAvant, apresN, ajoutees: r.ajoutees, retirees: r.retirees, pieces: r.pieces,
      posees, avecSrc, sansSrc,
      identique: empreinte() === avant, nApresAnnul: state.lk.length,
      dessin: { ib: a.filsDansBloc, ch: a.blocsChevauches, b: a.blocs } };
  });
  ok('des pièces sont écrites', ecr.ajoutees > 0,
    ecr.pieces + ' pièce(s) · +' + ecr.ajoutees + ' liaisons · −' + ecr.retirees + ' remplacées ('
    + ecr.nAvant + ' → ' + ecr.apresN + ')');
  ok('les pièces apparaissent dans le dessin', ecr.posees.length > 0,
    ecr.posees.join(', ') || 'aucune · ' + ecr.dessin.b + ' blocs');
  ok('le dessin reste sain après écriture', ecr.dessin.ib === 0 && ecr.dessin.ch === 0,
    'filsDansBloc=' + ecr.dessin.ib + ' chevauch=' + ecr.dessin.ch);
  ok('chaque ligne créée porte sa provenance', ecr.sansSrc === ecr.nAvant - ecr.retirees,
    ecr.avecSrc + ' ligne(s) tracée(s)');
  const vide = await page.evaluate(() => {
    try { const r = appliquerPieces(null); return { ok: true, n: r.ajoutees }; }
    catch (e) { return { ok: false, msg: String(e && e.message || e) }; }
  });
  ok('un plan vide ne casse rien', vide.ok, vide.ok ? 'bilan à zéro' : vide.msg);
  ok('« Annuler » rend l’état EXACT d’avant', ecr.identique,
    ecr.nApresAnnul + ' liaisons, empreinte ' + (ecr.identique ? 'identique' : 'DIFFÉRENTE'));

  /* ---- 7. LES PIÈGES TROUVÉS À LA CHASSE AUX BOGUES ------------------
     Six défauts que rien ne signalait : l'outil ne se plaignait pas, il
     répondait mal, ou pas du tout. Chacun a maintenant son contrôle, pour
     qu'aucun ne puisse revenir sans qu'on le voie. */
  titre('7. LES PIÈGES DÉJÀ TOMBÉS');

  const pieges = await page.evaluate(async () => {
    const r = {};
    const L = (f, ft, t, tt) => ({ from: f, fromTerm: ft, to: t, toTerm: tt,
      nature: '', cable: '', ctype: '', route: '', plan: '', pn1: '', pn2: '' });

    // (a) une liaison à moitié saisie effaçait tout le dessin
    contratEssai(); const n0 = LAST.layout.comps.length;
    state.lk.push(L('', '', '', ''));          // le bouton « + » de la table
    state.lk.push(L('', '1', '210SP1', '9'));  // un seul bout renseigné
    try { render(); r.demiFil = !!LAST && LAST.layout.comps.length >= n0; }
    catch (e) { r.demiFil = false; r.demiFilMsg = String(e.message).slice(0, 90); }

    // (b) « 210SP1 » et « 210SP1 » (avec une espace) faisaient deux blocs
    state.lk = [L(' 210SP1 ', '1', 'BORNE', '2'), L('210SP1', '3', 'BORNE', '4')];
    state.eq = deriveEq(state.lk); render();
    // on compte les REPÈRES distincts, pas les blocs : un bornier se dessine
    // légitimement en plusieurs fragments portant le même nom.
    r.espaces = new Set(LAST.layout.comps.filter(c => c.kind !== 'tag')
      .map(c => String(c.name))).size;

    // (c) le SVG portait U+0001 : illisible par tout lecteur XML
    contratEssai();
    const S = svgAutonome();
    r.svgOk = !!S;
    if (S) {
      const doc = new DOMParser().parseFromString(S.txt, 'image/svg+xml');
      r.svgXml = !doc.querySelector('parsererror');
      r.svgCtrl = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(S.txt);
      r.svgFils = (S.txt.match(/class="cab"/g) || []).length;
    }

    // (d) « Annuler » emportait les corrections faites à la main
    await rbLoad(baseExemple()); rbCloseReport();
    contratEssai(); zonesExemple();
    appliquerPieces(planPieces(contratsProches()[0].contrat));
    state.lk.push(L('CTRL-MAIN', '1', '210SP1', '9'));
    annulerPieces();
    r.mainSurvit = (state.lk || []).some(l => l.from === 'CTRL-MAIN');
    state.lk = (state.lk || []).filter(l => l.from !== 'CTRL-MAIN');

    // (e) charger une 2e base laissait l'outil répondre d'après la 1re
    const EN = ['Harness','Device1','Pin1','PN1','Description1','Cable T/G','Cable Tag','Route',
      'Device2','Pin2','PN2','Description2','FWD','Cable Length (mm)','Appareil','Date retest'];
    const aoa = [[''], ['x'], [], EN,
      ['H','AAA','1','','','','','1M','BBB','2','','','SPE','1200','BASE2','']];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Retest');
    await rbLoad(new File([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], 'b2.xlsm'));
    rbCloseReport();
    r.contrats2 = Array.from(PROCHE.parContrat ? PROCHE.parContrat.keys() : []);
    contratEssai();
    r.vieuxContrat = contratsProches().some(x => x.contrat === 'IRO AE');

    // (f) un contrat identique au mien sortait premier et n'apprenait rien
    await rbLoad(baseExemple()); rbCloseReport();
    contratEssai();
    const moi = state.lk.map(l => ['H', l.from, l.fromTerm, '', '', '', '', '1M',
      l.to, l.toTerm, '', '', 'SPE', '1200', 'MON-JUMEAU', '']);
    const wb2 = XLSX.utils.book_new();
    const src = [[''], ['x'], [], EN];
    // on recopie la base d'exemple puis on y ajoute mon propre contrat
    for (let i = RB.head + 1; i < RB.rows.length; i++) if (RB.rows[i]) src.push(RB.rows[i]);
    XLSX.utils.book_append_sheet(wb2, XLSX.utils.aoa_to_sheet(src.concat(moi)), 'Retest');
    await rbLoad(new File([XLSX.write(wb2, { bookType: 'xlsx', type: 'array' })], 'jum.xlsm'));
    rbCloseReport();
    contratEssai();
    const cls = contratsProches();
    r.premier = cls[0] ? cls[0].contrat : '—';
    r.apport = cls[0] ? cls[0].piecesApportees : 0;
    r.jumeauApport = (cls.find(x => x.contrat === 'MON-JUMEAU') || {}).piecesApportees;
    return r;
  });

  ok('une liaison à moitié saisie ne vide pas l’écran', pieges.demiFil,
    pieges.demiFil ? 'le dessin tient' : (pieges.demiFilMsg || 'ÉCRAN BLANC'));
  ok('les espaces parasites ne dédoublent plus un repère', pieges.espaces === 2,
    pieges.espaces + ' bloc(s) pour 2 repères');
  ok('le SVG exporté est un XML valide', pieges.svgOk && pieges.svgXml && !pieges.svgCtrl,
    pieges.svgOk ? (pieges.svgFils + ' fils · caractère de contrôle : '
      + (pieges.svgCtrl ? 'OUI' : 'aucun')) : 'pas de SVG produit');
  ok('« Annuler » épargne une correction manuelle', pieges.mainSurvit,
    pieges.mainSurvit ? 'la correction survit' : 'CORRECTION PERDUE');
  ok('changer de base jette l’ancien index', !pieges.vieuxContrat,
    'contrats vus après rechargement : ' + pieges.contrats2.join(', '));
  ok('un contrat jumeau ne prend pas la tête', pieges.premier !== 'MON-JUMEAU',
    pieges.premier + ' apporte ' + pieges.apport + ' pièce(s) · le jumeau en apporte '
    + (pieges.jumeauApport == null ? '—' : pieges.jumeauApport));

  // ---- bilan ----------------------------------------------------------
  titre('BILAN');
  ok('aucune erreur console', erreurs.length === 0, erreurs.length ? erreurs.slice(0, 3).join(' | ') : 'aucune');
  console.log('\n  ' + (total - echecs) + ' / ' + total + ' contrôles passés'
    + (echecs ? '  —  ' + echecs + ' ÉCHEC(S)' : '  —  tout est vert'));

  await nav.close();
  process.exit(echecs ? 1 : 0);
})();
