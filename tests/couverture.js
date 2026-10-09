/* ===========================================================================
   LA COUVERTURE — ce que l'outil vérifie, et s'il vérifie tout.
       NODE_PATH=/opt/node22/lib/node_modules node tests/couverture.js [--sans-navigateur] [--fichier=chemin]

   Le lecteur : « Est-ce que chaque disjoncteur passe bien devant l'algorithme
   des disjoncteurs ? Est-ce qu'on vérifie bien pour chaque connecteur avec les
   contacts que je t'ai envoyés ? Pour chaque fil la chute en ligne, l'intensité
   admissible ? Les raccords, cheminées, colliers, band-it pour tous les
   connecteurs — sauf pour les EN 4165, il n'y en a pas ? »
   Ici, sur l'exemple embarqué ET sur un contrat inventé plus riche (huit
   disjoncteurs dont un sans profil, un sans part number, un tripolaire ; des
   connecteurs EN 2997, EN 3645, EN 3646, EN 4165, ASNE0059 ; des barrettes
   E0599 et NSA937901 ; deux prises en chaîne ; des fils AD (aluminium cuivré),
   un gros câble AM6, un fil sans type, un type inconnu, des longueurs réelles,
   des masses, un dédoublement), on parcourt CHAQUE repère et CHAQUE fil :
     1. LE MOTEUR, sans navigateur (01, 02, 09-* dans un bac à sable) : chaque
        disjoncteur jugé (verdict, idéal, chaque fil qu'il nourrit, la chute en
        ligne), chaque connecteur et chaque côté de prise (arrangement, contact
        à sertir par la table SEE, jauge, sexe, raccord et habillage — rien pour
        l'EN 4165), chaque barrette (modules, remplissage, jauge), chaque fil
        (câble, intensité déclassée, chute sur le fil et en ligne, contact à
        chaque bout) ; trois cas rejoués à la main ; les règles nouvelles ;
     2. LE CONTRÔLE, au navigateur (08-controle.js, la liste « à reprendre ») :
        chaque défaut une fois et une seule, au bon niveau, sur le bon repère.
   À la fin, LE TABLEAU DE COUVERTURE : règle × nature → vérifiée / pas
   vérifiée / impossible (et pourquoi). Rend 1 au premier échec.
   =========================================================================== */
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.join(__dirname, '..', 'src'), NORMES = path.join(__dirname, '..', 'normes');
let total = 0, echecs = 0;
const ok = (nom, cond, mesure) => { total++; if (!cond) echecs++; console.log('  ' + (cond ? 'OK    ' : 'ÉCHEC ') + nom + (mesure ? '   — ' + mesure : '')); };
const pres = (a, b, eps) => Math.abs(a - b) < (eps || 1e-9);

/* ---- le contrat inventé ------------------------------------------------------------------------------------------ */
const PN = { '200BT1': 'MS3470L14-5P', '201CB1': 'MS3320-10', '202CB2': '', '203CB3': 'ABC-15', '204CB4': 'MS14154-10', '205CB5': 'MS3320-5', '206CB6': 'MS3320-3', '207CB7': 'MS14105-35', '208CB8': 'MS3320-3',
  '210GN1': 'E0656A01N1S0', '310RL1': 'E0836IS35-22SA', '320PM1': 'EN2997', '330LP1': 'E0644D9S', '340SW1': 'NSA937802-03', '350VL1': 'ABS0864-08', '360HT1': 'E0644B9S', '371MT1': 'EN3645', '380CP1': 'E0644B9S',
  '500XC1': 'EN4165-2M', '411VC1': 'EN3646A6088AAN', '412VC2': 'ASNE0059-12-8', '530CP2': 'E0644B9S', '540PM2': 'EN2997Y1A12P', '550SW2': 'NSA937802-03', '560HT2': 'E0644B9S', '570MT2': 'EN3645', '580ST1': 'EN2997Y1A10P',
  '701VT1': 'E0599-1B201Z', '702VT2': 'NSA937901-20-04' };
const LIGNES = [
  // plan A : 28 V — une batterie, huit disjoncteurs, une barrette E0599 qui distribue (un DR20, un AD16), une NSA937901 vers un sous-disjoncteur
  ['A', '200BT1', '1', '201CB1', '1', 'W-A01', 'DR16', 1.2], ['A', '201CB1', '2', '701VT1', '1', 'W-A02', 'DR20', 3], ['A', '701VT1', '1', '701VT1', '2', 'W-A03', 'DR20'], ['A', '701VT1', '2', '310RL1', 'A1', 'W-A04', 'DR20', 5],
  ['A', '701VT1', '1', '701VT1', '3', 'W-A05', 'DR20'], ['A', '701VT1', '3', '320PM1', '1', 'W-A06', 'AD16', 8], ['A', '310RL1', 'A2', '330LP1', '1', 'W-A07', 'VNB22', 2], ['A', '330LP1', '2', '901G', '', 'W-A08', 'DR22'],
  ['A', '320PM1', '2', '901G', '', 'W-A09', 'AD16', 8], ['A', '202CB2', '2', '340SW1', '1', 'W-A10', 'DR22'], ['A', '340SW1', '2', '350VL1', '1', 'W-A11', 'DR22'], ['A', '350VL1', '2', '902G', '', 'W-A12', 'DR22'],
  ['A', '200BT1', '1', '202CB2', '1', 'W-A13', 'DR16'], ['A', '203CB3', '2', '360HT1', '1', 'W-A14', 'DR12', 6], ['A', '200BT1', '2', '203CB3', '1', 'W-A15', 'DR12'], ['A', '360HT1', '2', '902G', '', 'W-A16', 'DR12'],
  ['A', '204CB4', '2', '371MT1', '1', 'W-A17', 'DR16', 4], ['A', '204CB4', '4', '371MT1', '2', 'W-A18', 'DR16', 4], ['A', '204CB4', '6', '371MT1', '3', 'W-A19', 'DR16', 4],
  ['A', '210GN1', '1', '204CB4', '1', 'W-A20', 'DR16'], ['A', '210GN1', '2', '204CB4', '3', 'W-A21', 'DR16'], ['A', '210GN1', '3', '204CB4', '5', 'W-A22', 'DR16'],
  ['A', '205CB5', '2', '702VT2', '1', 'W-A23', 'DR22', 2], ['A', '702VT2', '1', '702VT2', '2', 'W-A24', 'DR22'], ['A', '702VT2', '2', '206CB6', '1', 'W-A25', 'DR22', 1], ['A', '206CB6', '2', '380CP1', '1', 'W-A26', 'DR24', 4],
  ['A', '380CP1', '2', '903G', '', 'W-A27', 'DR24'], ['A', '200BT1', '3', '205CB5', '1', 'W-A28', 'DR20'], ['A', '371MT1', '4', '903G', '', 'W-A29', 'DR16'],
  // plan B : un calculateur EN 4165, deux prises en chaîne (EN 3646 puis ASNE0059), un gros câble aluminium, un fil sans type, un type inconnu, un MLB24 à travers les deux prises depuis un 3 A
  ['B', '500XC1', 'A1', '411VC1', '1', 'W-B01', 'MLB24', 4], ['B', '411VC1', '1', '412VC2', '1', 'W-B02', 'MLB24', 6], ['B', '412VC2', '1', '530CP2', '1', 'W-B03', 'MLB24', 3],
  ['B', '500XC1', 'A2', '411VC1', '2', 'W-B04', 'MLB24', 4], ['B', '411VC1', '2', '412VC2', '2', 'W-B05', 'MLB24', 6], ['B', '412VC2', '2', '530CP2', '2', 'W-B06', 'MLB24', 3],
  ['B', '500XC1', 'A3', '411VC1', '3', 'W-B07', 'DR20'], ['B', '411VC1', '3', '540PM2', '1', 'W-B08', 'DR20'], ['B', '500XC1', 'A4', '411VC1', '4', 'W-B09', 'DR20'], ['B', '411VC1', '4', '540PM2', '2', 'W-B10', 'DR20'],
  ['B', '500XC1', 'B1', '550SW2', '1', 'W-B11', 'DR22'], ['B', '550SW2', '2', '500XC1', 'B2', 'W-B12', 'DR22'], ['B', '540PM2', '3', '904G', '', 'W-B13', 'DR20'], ['B', '530CP2', '3', '904G', '', 'W-B14', 'DR24'],
  ['B', '550SW2', '3', '905G', '', 'W-B15', ''], ['B', '500XC1', 'B3', '560HT2', '1', 'W-B16', 'ZZ22'], ['B', '560HT2', '2', '905G', '', 'W-B17', 'DR22'],
  ['B', '207CB7', '2', '570MT2', '1', 'W-B18', 'AM6', 10], ['B', '210GN1', '4', '207CB7', '1', 'W-B19', 'AM6'], ['B', '570MT2', '2', '906G', '', 'W-B20', 'AM6'],
  ['B', '208CB8', '2', '411VC1', '5', 'W-B21', 'MLB24', 4], ['B', '411VC1', '5', '412VC2', '5', 'W-B22', 'MLB24', 6], ['B', '412VC2', '5', '580ST1', '1', 'W-B23', 'MLB24', 3], ['B', '580ST1', '2', '906G', '', 'W-B24', 'MLB24'],
  ['B', '200BT1', '4', '208CB8', '1', 'W-B25', 'DR22']];
const CONTRAT_RICHE = LIGNES.map(([plan, de, borneDe, vers, borneVers, cable, type, longueur]) => ({ de, borneDe, pnDe: PN[de] || '', vers, borneVers, pnVers: PN[vers] || '', cable, type, plan, longueur: longueur || '' }));
const CHARGES_RICHES = { '201CB1': { dem: { i: 9.31, t: 5 }, trans: { i: 9.31, t: 120 }, perm: { i: 5 } }, '202CB2': { perm: { i: 3 } }, '204CB4': { perm: { i: 6 } }, '205CB5': { perm: { i: 2 } }, '206CB6': { perm: { i: 1.5 } },
  '207CB7': { dem: { i: 60, t: 3 }, perm: { i: 30 } }, '208CB8': { perm: { i: 1 } } };

/* ---- le tableau de couverture ------------------------------------------------------------------------------------ */
const NATURES = ['disjoncteur', 'connecteur', 'prise', 'barrette', 'fil'];
const COUVERTURE = new Map();   // règle → nature → { ok, non, impossible: Map(raison → n) }
function couvrir(regle, nature, etat, raison) { const r = COUVERTURE.get(regle) || COUVERTURE.set(regle, {}).get(regle), c = r[nature] || (r[nature] = { ok: 0, non: 0, impossible: new Map() });
  if (etat === 'impossible') c.impossible.set(raison || '?', (c.impossible.get(raison || '?') || 0) + 1); else c[etat ? 'ok' : 'non']++; }
function tableauDeCouverture() { const col = (c) => { if (!c) return '·'; const imp = [...c.impossible.values()].reduce((s, n) => s + n, 0); const parts = []; if (c.ok) parts.push(c.ok + ' vérifié' + (c.ok > 1 ? 's' : '')); if (c.non) parts.push(c.non + ' NON'); if (imp) parts.push(imp + ' impossible' + (imp > 1 ? 's' : '')); return parts.join(', '); };
  const lignes = [['règle', ...NATURES]]; COUVERTURE.forEach((r, regle) => lignes.push([regle, ...NATURES.map(n => col(r[n]))]));
  const w = lignes[0].map((_, k) => Math.max(...lignes.map(l => l[k].length)));
  console.log('\nLE TABLEAU DE COUVERTURE (les deux contrats)\n' + lignes.map((l, i) => '  ' + l.map((c, k) => c.padEnd(w[k])).join(' | ') + (i ? '' : '\n  ' + w.map(x => '-'.repeat(x)).join('-|-'))).join('\n'));
  const raisons = []; COUVERTURE.forEach((r, regle) => NATURES.forEach(n => { if (r[n]) r[n].impossible.forEach((k, raison) => raisons.push(`  · ${regle} × ${n} : ${k} — ${raison}`)); }));
  if (raisons.length) console.log('  Pourquoi « impossible » :\n' + raisons.join('\n')); }

/* ==================================================================================================================
   1. LE MOTEUR, SANS NAVIGATEUR
   ================================================================================================================== */
const code = ['01-modele.js', '02-lecture.js', '09-barrettes.js', '09-disjoncteurs.js', '09-raccords.js', '09-chute.js', '09-references.js'].map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
const normes = fs.readdirSync(NORMES).filter(f => /\.csv$/i.test(f)).sort().map(f => fs.readFileSync(path.join(NORMES, f), 'utf8')).join('\n\n');
const bac = { console }; vm.createContext(bac);
vm.runInContext('const NORME_EMBARQUEE = ' + JSON.stringify(normes) + ';\n' + code + '\nthis.X = { liaison, contratExemple, normeEmbarquee, estDisjoncteur, estBarrette, estCoupure, estMasse, estBornier, VT_A_POSER, lireRepere, reperesDe, besoinsDeBarrette, remplirModules, coupureEnModule, connecteursEnModules, connecteursDe,'
  + ' familleDuPn, calibreDuPn, verdictDisjonction, protectionDesFils, courbesDeDisjonction, multipleAdmis, pointsDuProfil, protectionDeJauge, CALIBRES, cheminsDepuis, chutesDepuis, chuteDuChemin, filsDepuis, INTERMITTENT_MAX,'
  + ' habillage, SANS_RACCORD, sansRaccord, cableDuType, cableFamilleDe, filDeNorme, resistanceDuFil, intensiteAdmise, facteurAmbiante, facteurDeclassement, chuteAdmise, jaugeDuType, typeDuFil, tailleDeJauge, resistanceDeContact,'
  + ' intensiteDeContact, contactPourCca, tenueEnTemperature, reactanceEstimee, HYPOTHESES, kRetour, simulerBornier, remplirSelonNorme, physiqueDeBarrette, bibleDeLOutil, familleDeReference, nomDeFamille, contactsDeTaille, contactDuFil, contactAccepte };', bac);
const X = bac.X, NE = X.normeEmbarquee(), H0 = { ...X.HYPOTHESES };

/* Tout le contrat relu, repère par repère et fil par fil : ce que les fiches calculent, ici sans la page. */
function relire(nom, liaisons, charges) { const L = liaisons.map(X.liaison), B = { nom, disjoncteurs: [], connecteurs: [], prises: [], barrettes: [], fils: [], reperes: [] };
  const contacts = new Map(), noter = (repere, fils, ou) => (fils || []).forEach(x => { if (!x.f || !x.f.l) return; (contacts.get(x.f.l) || contacts.set(x.f.l, []).get(x.f.l)).push({ repere, ou, taille: x.taille, sertir: x.sertir || null, contact: x.contact, jaugeOk: x.jaugeOk, sexe: x.sexe }); });
  const reperes = X.reperesDe(L).filter(r => !X.estMasse(r)); B.reperes = reperes;
  // chaque borne de chaque repère : sa famille de norme est-elle connue (un plan peut la juger) ?
  const normee = new Map(), marquer = (r, bornes, connu) => bornes.forEach(bo => normee.set(r + '\u0001' + bo, !!connu)); B.normee = normee;
  reperes.forEach(r => {
    if (X.VT_A_POSER.test(r)) return;
    const b = X.besoinsDeBarrette(r, L), pn = b.pn;
    if (X.estBarrette(r)) { const Q = X.remplirModules(b, NE, ''); noter(r, Q.fils, r); marquer(r, b.bornes, true); B.barrettes.push({ repere: r, pn, plan: Q, famille: Q.famille }); }
    else if (X.estCoupure(r)) { const { plan: Q } = X.coupureEnModule(r, L, NE, '', ''); noter(r, Q.fils, r); marquer(r, b.bornes, true); const am = Q.fils.filter(x => x.f.amont), av = Q.fils.filter(x => !x.f.amont);
      B.prises.push({ repere: r, pn, plan: Q, famille: Q.famille, fiche: X.habillage(NE, am.map(x => x.f), null, pn, Q.reference), embase: X.habillage(NE, av.map(x => x.f), null, pn, Q.reference), amont: am, aval: av }); }
    else { const C = X.connecteursDe(r, L).filter(c => c.nom), cav = new Map(X.connecteursEnModules(r, L, NE).map(c => [c.nom, c]));
      C.forEach(c => { const k = cav.get(c.nom), fils = c.bornes.flatMap(bo => b.parBorne.get(bo) || []); if (k) noter(r, k.plan.fils, r + ' ' + c.nom); marquer(r, c.bornes, k);
        B.connecteurs.push({ repere: r, nom: c.nom, pn: c.pn, bornes: c.bornes, fils, plan: k ? k.plan : null, famille: k ? k.plan.famille : X.familleDeReference(NE, c.pn, 'connecteur'), habit: X.habillage(NE, fils, null, c.pn, k && k.plan.modules[0] ? k.plan.modules[0].reference : '') }); });
      if (X.estDisjoncteur(r)) { const F = X.familleDuPn(pn), profil = charges[r] || null, fils = X.filsDepuis(L, r), voisins = [...new Set(X.cheminsDepuis(L, r).map(ch => ch.bout[0]).filter(x => x && x !== r && X.estDisjoncteur(x)))];
        const autres = voisins.map(v => X.calibreDuPn((L.find(l => l.de === v && l.pnDe) || {}).pnDe || (L.find(l => l.vers === v && l.pnVers) || {}).pnVers) || 0);
        const filsAvecContact = fils.map(f => { const xs = (contacts.get(f.l) || []).map(x => ({ x, i: X.intensiteDeContact(NE, x.taille) })).filter(y => y.i).sort((a, c) => a.i.intensite - c.i.intensite); return xs.length ? { ...f, taille: xs[0].x.taille } : f; });
        let d = X.verdictDisjonction(NE, '', (F && F.calibre) || 0, profil, { fils: filsAvecContact, hyp: H0, autres }); const calibre = (F && F.calibre) || d.calibreIdeal || null; if (calibre && calibre !== d.calibre) d = X.verdictDisjonction(NE, '', calibre, profil, { fils: filsAvecContact, hyp: H0, autres });
        const P = X.protectionDesFils(NE, calibre, profil, filsAvecContact, H0), I = profil && profil.perm && profil.perm.i > 0 ? profil.perm.i : calibre || H0.courant;
        B.disjoncteurs.push({ repere: r, pn, famille: F, calibre, origine: F && F.calibre ? 'pn' : calibre ? 'ideal' : '', profil, d, fils: P, chutes: X.chutesDepuis(NE, L, r, I, H0, d.points.filter(p => p.t !== Infinity)), voisins, autres }); } } });
  L.forEach(l => { if (!l.de || !l.vers || l.de === l.vers) return; const jauge = X.jaugeDuType(l.type), cab = l.type ? X.cableDuType(NE, l.type) : null, fn = l.type ? X.filDeNorme(NE, l.type, jauge) : null, rd = l.type ? X.resistanceDuFil(NE, l.type, jauge, H0.tconducteur) : null;
    const cb = B.disjoncteurs.find(D => D.fils.some(f => f.l === l)) || null, pf = cb ? cb.fils.find(f => f.l === l) : null, chemin = cb ? X.cheminsDepuis(L, cb.repere).find(ch => ch.segments.some(s => s.fil === l)) : null;
    const I = cb ? (cb.profil && cb.profil.perm && cb.profil.perm.i > 0 ? cb.profil.perm.i : cb.calibre || H0.courant) : H0.courant, Lm = l.longueur > 0 ? l.longueur : H0.longueur;
    const fac = fn ? X.facteurDeclassement(NE, H0.conditions) * X.facteurAmbiante(fn, H0.ambiante) * (rd.kConducteur || 1) : 1;
    B.fils.push({ l, cable: l.cable, type: l.type, jauge, cab, fn, rd, admet: fn && fn.intensite != null && !(rd && rd.refuse) ? fn.intensite * fac : null, fac, I, cb, pf, dU: rd && rd.rho != null ? rd.rho / 1000 * Lm * I : null, enLigne: chemin ? X.chuteDuChemin(NE, chemin, I, H0) : null,
      bouts: [l.de, l.vers].map(rep => (contacts.get(l) || []).find(x => x.repere === rep) || null), masse: X.estMasse(l.de) || X.estMasse(l.vers), tenue: l.type ? X.tenueEnTemperature(NE, l.type, H0.ambiante) : null }); });
  return B; }

function couvrirContrat(B, attendAval) { const s = B.nom + ' : ';
  console.log('\n' + s.toUpperCase() + B.reperes.length + ' repères, ' + B.fils.length + ' fils, ' + B.disjoncteurs.length + ' disjoncteurs, ' + B.connecteurs.length + ' connecteurs, ' + B.prises.length + ' prises, ' + B.barrettes.length + ' barrettes');
  // ---- chaque disjoncteur
  B.disjoncteurs.forEach(D => { const d = D.d, juge = !d.sansCourbe && (D.profil ? d.points.length > 0 : d.sansProfil);
    couvrir('disjoncteur : verdict sur les courbes (profil, bilan thermique)', 'disjoncteur', D.profil ? d.valide != null && d.points.every(p => p.ok != null) : 'impossible', D.profil ? '' : 'sans profil de charge : rien à juger, le contrôle le demande');
    couvrir('disjoncteur : calibre (part number d’une famille connue, sinon l’idéal)', 'disjoncteur', D.calibre != null ? true : 'impossible', D.calibre == null ? 'ni part number connu, ni profil : pas de calibre' : '');
    couvrir('disjoncteur : idéal (marge, fils, sélectivité) et gamme jugée', 'disjoncteur', D.profil ? d.calibreIdeal != null && d.gamme.length >= X.CALIBRES.length && d.gamme.every(g => g.valide != null) : 'impossible', D.profil ? '' : 'sans profil');
    couvrir('disjoncteur : sélectivité 2:1 avec les voisins', 'disjoncteur', D.voisins.length ? d.gamme.every(g => g.selectif != null) : 'impossible', D.voisins.length ? '' : 'aucun disjoncteur voisin sur ses chemins');
    couvrir('disjoncteur : chaque fil nourri jugé (charge, continu, courbe lente)', 'disjoncteur', D.fils.length ? D.fils.every(f => f.verdict) : 'impossible', D.fils.length ? '' : 'aucun fil');
    couvrir('disjoncteur : chute en ligne de chaque chemin (permanent, pointes)', 'disjoncteur', D.chutes.length ? D.chutes.every(c => c.dU != null && c.admis != null) : 'impossible', D.chutes.length ? '' : 'aucun chemin'); });
  ok(s + 'chaque disjoncteur passe devant l’algorithme : un verdict ou « sans profil », une gamme jugée, ses fils, ses chemins', B.disjoncteurs.every(D => (D.profil ? D.d.valide != null && D.d.gamme.length >= 7 : D.d.sansProfil) && D.fils.length > 0 && D.chutes.length > 0), B.disjoncteurs.map(D => D.repere + ':' + (D.calibre || '—') + 'A/' + D.origine + '/' + (D.profil ? (D.d.valide ? 'tient' : 'déclenche') : 'sans profil')).join(' '));
  // ---- chaque connecteur
  B.connecteurs.forEach(C => { const Q = C.plan, connu = !!C.famille, sans = X.sansRaccord(C.famille), raison = connu ? '' : 'famille hors des normes embarquées (' + (C.pn || 'sans part number') + ')';
    couvrir('connecteur : arrangement de la norme (ou « aucun ne loge »)', 'connecteur', connu ? !!(Q && (Q.reference || Q.verdicts.some(v => v.niveau === 'ko'))) : 'impossible', raison);
    const table = !!(Q && Q.famille && X.contactsDeTaille(NE, Q.famille, (Q.modules[0] ? Q.modules[0].module.contacts[0].taille : '')).length);
    couvrir('connecteur : contact à sertir par la table SEE, sexe', 'connecteur', connu && Q && Q.modules.length ? (table ? Q.fils.every(x => x.sertir && x.sexe) : 'impossible') : 'impossible', !connu ? raison : !Q || !Q.modules.length ? 'aucun arrangement ne loge : pas de contact' : 'pas de table SEE pour cette norme (' + Q.famille + ') : la jauge par la table Tailles seulement');
    couvrir('connecteur : jauge de chaque fil jugée par le contact', 'connecteur', connu && Q && Q.modules.length ? Q.fils.every(x => x.jaugeOk != null || x.f.jauge == null) : 'impossible', !connu ? raison : 'aucun arrangement ne loge');
    const toronInconnu = C.habit.toron == null && (!C.habit.faisceau.complet || !C.habit.faisceau.n);
    couvrir('connecteur : raccord, band-it, manchon, gaine, tyrap (toron)', 'connecteur', sans || toronInconnu ? 'impossible' : C.habit.raccord !== 'aucun' && C.habit.toron != null, sans ? 'sans raccord : ' + C.habit.pourquoi : 'toron inconnu (un câble sans Ø dans la base : ' + (C.habit.faisceau.inconnus.join(', ') || C.fils.map(f => f.type).join(', ')) + ')'); });
  ok(s + 'chaque connecteur d’une norme embarquée a son arrangement (ou dit qu’aucun ne loge), chaque fil posé son contact à sertir et sa jauge jugée', B.connecteurs.filter(c => c.famille).every(C => C.plan && (C.plan.reference ? C.plan.fils.every(x => x.sertir && x.jaugeOk != null) : C.plan.verdicts.some(v => v.niveau === 'ko'))),
    B.connecteurs.map(C => C.repere + ' ' + C.nom + ':' + (C.plan ? (C.plan.reference || 'aucun') : 'hors norme')).join(' '));
  ok(s + 'l’EN 4165 est sans raccord (ni band-it, ni manchon, ni gaine, ni tyrap) ; l’EN 3645 aussi, « à confirmer » ; toute autre famille a son raccord, et son toron dès que la base connaît ses câbles', B.connecteurs.every(C => C.famille === 'EN4165' ? C.habit.raccord === 'aucun' && !C.habit.collier && !C.habit.manchonRef && !C.habit.gaine && !C.habit.tyrap && !C.habit.aConfirmer
    : C.famille === 'EN3645' ? C.habit.raccord === 'aucun' && C.habit.aConfirmer : C.habit.raccord !== 'aucun' && (C.habit.toron != null || !C.habit.faisceau.complet || !C.habit.faisceau.n)), B.connecteurs.map(C => C.repere + ' ' + C.nom + ':' + C.habit.raccord).join(' '));
  // ---- chaque prise, ses deux côtés
  B.prises.forEach(P => { const Q = P.plan;
    couvrir('prise : arrangement (les normes en concurrence) et un fil par contact et par côté', 'prise', !!(Q.reference || Q.verdicts.some(v => v.niveau === 'ko')));
    couvrir('prise : contact à sertir par la table SEE, sexe fiche / embase', 'prise', Q.tableContacts ? Q.fils.every(x => x.sertir && x.sexe) && P.amont.every(x => x.sexe !== P.aval[0].sexe) : 'impossible', 'pas de table SEE pour ' + Q.famille);
    couvrir('prise : jauge jugée par le contact', 'prise', Q.fils.every(x => x.jaugeOk != null || x.f.jauge == null));
    ['fiche', 'embase'].forEach(c => couvrir('prise : raccord et habillage de chaque côté', 'prise', X.sansRaccord(P[c].famille) ? 'impossible' : P[c].raccord !== 'aucun' && P[c].toron != null, 'sans raccord : ' + P[c].pourquoi)); });
  ok(s + 'chaque prise a son arrangement, chaque fil son contact quand la norme a sa table SEE (femelle côté fiche, mâle côté embase), sa jauge jugée, et les deux côtés leur habillage', B.prises.every(P => P.plan.reference && P.plan.fils.every(x => (x.sertir || !P.plan.tableContacts) && x.jaugeOk != null) && P.amont.every(x => x.sexe === 'F') && P.aval.every(x => x.sexe === 'M') && P.fiche.raccord && P.embase.raccord),
    B.prises.map(P => P.repere + ':' + P.plan.reference + (P.plan.tableContacts ? '' : ' (sans table SEE)') + '/' + P.fiche.raccord + '+' + P.embase.raccord).join(' '));
  // ---- chaque barrette
  B.barrettes.forEach(Bt => { const Q = Bt.plan;
    couvrir('barrette : modules (la norme du part number, sinon la mieux taillée), chaque potentiel placé', 'barrette', Q.modules.length > 0 && (Q.places === Q.potentiels || Q.verdicts.some(v => v.niveau === 'ko')));
    couvrir('barrette : jauge de chaque fil par la taille du contact', 'barrette', Q.fils.every(x => x.jaugeOk != null || x.f.jauge == null));
    couvrir('barrette : contact à sertir par une table SEE', 'barrette', 'impossible', 'pas de table SEE pour les modules de jonction (NSA937901, ASNE 0599 : à demander)'); });
  ok(s + 'chaque barrette est posée en modules de sa norme, tous les potentiels placés, chaque fil sa jauge jugée', B.barrettes.every(Bt => Bt.plan.modules.length && Bt.plan.places === Bt.plan.potentiels && Bt.plan.fils.every(x => x.jaugeOk === true)), B.barrettes.map(Bt => Bt.repere + ':' + Bt.plan.reference).join(' '));
  // ---- chaque fil
  B.fils.forEach(F => { const typeConnu = !!F.type, cable = !!F.cab;
    couvrir('fil : câble connu de la base (résistance, Ø, masse)', 'fil', typeConnu ? cable : 'impossible', 'sans type');
    couvrir('fil : intensité admissible (EN 2853 par durée, déclassée faisceau, ambiante, conducteur)', 'fil', typeConnu ? (F.admet != null ? true : F.rd && F.rd.refuse ? 'impossible' : F.fn ? true : 'impossible') : 'impossible', !typeConnu ? 'sans type' : F.rd && F.rd.refuse ? 'conducteur ' + F.rd.conducteur + ' sans résistance dans la base' : 'jauge inconnue de l’EN 2853');
    couvrir('fil : chute sur le fil (ρ à T, longueur, courant)', 'fil', typeConnu ? F.dU != null : 'impossible', !typeConnu ? 'sans type' : F.rd && F.rd.refuse ? 'conducteur ' + F.rd.conducteur + ' sans résistance' : 'type inconnu de la base et de l’EN 2853');
    couvrir('fil : chute en ligne depuis le disjoncteur amont, courant du profil', 'fil', F.masse ? 'impossible' : F.cb ? F.enLigne != null && F.pf != null : 'impossible', F.masse ? 'un fil de masse : pas de chemin' : 'aucun disjoncteur en amont (le courant est l’hypothèse)');
    // le contact à chaque bout : un bout par ligne — une masse ou une famille hors norme ne peuvent pas en avoir
    [[F.l.de, F.l.borneDe, F.bouts[0]], [F.l.vers, F.l.borneVers, F.bouts[1]]].forEach(([rep, bo, x]) => { const connu = B.normee.get(rep + '\u0001' + bo);
      couvrir('fil : contact à chaque bout (le plan du repère)', 'fil', X.estMasse(rep) ? 'impossible' : connu ? !!x : 'impossible', X.estMasse(rep) ? 'une masse' : 'le bout est sur une famille hors des normes embarquées'); }); });
  ok(s + 'chaque fil typé a son câble ou sa ligne EN 2853, son intensité admissible déclassée, sa chute ; sans type, rien n’est inventé', B.fils.every(F => F.type ? (F.cab || F.fn) && (F.admet != null || (F.rd && F.rd.refuse) || !F.fn) : F.admet == null && F.dU == null), B.fils.filter(F => F.type && !(F.cab || F.fn)).map(F => F.cable + ':' + F.type).join(' ') || 'tous');
  const aval = B.fils.filter(F => F.pf && !F.pf.direct);
  ok(s + 'chaque fil qu’un disjoncteur nourrit — serti sur lui ou au-delà d’une prise ou d’une barrette — est jugé par lui, et sa chute en ligne suivie' + (attendAval ? ' (il y en a au-delà des passages)' : ''), B.fils.filter(F => !F.masse && F.cb).every(F => F.pf && F.pf.verdict && F.enLigne && F.enLigne.dU != null) && (!attendAval || aval.length > 0), aval.map(F => F.cable + ' par ' + F.pf.via).join(' ') || 'aucun fil au-delà d’un passage');
  return B; }

console.log('\n1. LE MOTEUR, SANS NAVIGATEUR');
const EX = couvrirContrat(relire('l’exemple embarqué', X.contratExemple(), { '102CB1': { dem: { i: 9.31, t: 5 }, trans: { i: 9.31, t: 120 }, perm: { i: 5 } } }));
const RI = couvrirContrat(relire('le contrat inventé', CONTRAT_RICHE, CHARGES_RICHES), true);
const dj = r => RI.disjoncteurs.find(D => D.repere === r), fil = (B, w) => B.fils.find(F => F.cable === w);
ok('le contrat inventé a bien ce qu’il promet : 8 disjoncteurs (un sans profil, un sans part number, un tripolaire MS14154 → 6TC), EN 2997, EN 3645, EN 3646, EN 4165, ASNE0059, E0599 et NSA937901, deux prises, un fil sans type, un type inconnu, un AD16, un AM6',
  RI.disjoncteurs.length === 8 && !dj('203CB3').profil && dj('202CB2').pn === '' && dj('204CB4').famille && dj('204CB4').famille.poles === 3 && dj('204CB4').calibre === 10 && ['EN2997', 'EN3645', 'EN3646', 'EN4165', 'ASNE0059'].every(f => RI.connecteurs.some(C => C.famille === f) || RI.prises.some(P => P.famille === f))
  && RI.barrettes.map(b => b.famille).sort().join() === 'E0599,NSA937901' && RI.prises.length === 2 && fil(RI, 'W-B15').type === '' && !fil(RI, 'W-B16').cab && fil(RI, 'W-A06').rd.conducteur === 'CCA' && fil(RI, 'W-B18').rd.conducteur === 'aluminium');

console.log('\n2. TROIS CAS REJOUÉS À LA MAIN');
{ // (a) un DR20 sous un 10 A à 5 m : W-012 de l'exemple, 102CB1 → 103RL1
  const D = EX.disjoncteurs.find(D => D.repere === '102CB1'), f = D.fils.find(f => f.cable === 'W-012'), c = D.chutes.find(c => /103RL1/.test(c.mots)), w = fil(EX, 'W-012');
  ok('DR20 : 33,2 mΩ/m (la base), 5 m d’hypothèse, 5 A permanents → 0,83 V sur le fil, 2,96 % de 28 V, sous le volt admis ; la pointe 9,31 A pendant 125 s (> 2 min : le continu) → 1,55 V, trop', pres(w.dU, 0.0332 * 5 * 5) && pres(c.dU, 0.83) && !c.trop && pres(c.pointes[0].dU, 0.83 * 9.31 / 5) && c.pointes[0].t === 125 && !c.pointes[0].intermittent && c.pointes[0].admis === 1 && c.pointes[0].trop && !c.reel, JSON.stringify([w.dU, c.dU, c.pointes]));
  ok('DR20 : 11,5 A en continu × 0,6 (8 fils à 60 %, le point FAA) = 6,9 A < 9,31 A pendant 2,1 min (le palier continu) → la charge le dépasse ; 20 A pendant 2 s seraient admis (39 A × 0,6 = 23,4)', f.verdict === 'fil' && pres(f.continu, 6.9) && f.pire.i === 9.31 && f.pire.palier === Infinity && pres(X.intensiteAdmise(f.fil, 2) * f.facteurCourt, 23.4), JSON.stringify([f.verdict, f.continu, f.pire && f.pire.admise]));
  ok('DR20 : le 10 A laisse passer 1,91 In = 19,1 A pendant 1 min à −55 °C, plus que 6,9 A : pas protégé ; la table 11-3 plafonne un 20 AWG à 7,5 A : hors table ; le contact 20 (7,5 A, par la jauge) < 10 A : pas protégé en surcharge ; 5 A permanents y passent', f.protege === false && pres(f.pireLaisse.courant, X.multipleAdmis(X.courbesDeDisjonction(NE)[3], 60) * 10) && f.calibreMax === 7.5 && f.horsTable && f.contact && f.contact.taille === '20' && f.contact.intensite === 7.5 && !f.contact.parLePlan && f.contactSurcharge && !f.contactDepasse,
    JSON.stringify([f.pireLaisse && f.pireLaisse.courant, f.calibreMax, f.contact])); }
{ // (b) un MLB24 à travers deux prises : 208CB8 (3 A, 1 A permanent) → W-B21 (4 m) → 411VC1 (EN 3646, 8 mΩ d'exemple) → W-B22 (6 m) → 412VC2 (ASNE0059 : un 24 AWG va sur un contact 20, 7,3 mΩ) → W-B23 (3 m) → 580ST1
  const D = dj('208CB8'), c = D.chutes.find(c => /580ST1/.test(c.mots)), R = 0.117 * (4 + 6 + 3) + 0.008 + 0.0073;
  ok('MLB24 : 117 mΩ/m × 13 m = 1,521 Ω, + 8 mΩ (411VC1, la famille d’exemple) + 7,3 mΩ (412VC2 : la taille 20 de l’ASNE0059 pour du 24 AWG) = 1,536 Ω × 1 A = 1,536 V > 1 V admis sur des longueurs toutes réelles → problème', c && c.segments.length === 5 && c.mots === 'W-B21 → ⇄ 411VC1 → W-B22 → ⇄ 412VC2 → W-B23 → 580ST1:1' && pres(c.dU, R) && pres(c.dU, 1.5363, 1e-6) && c.trop && c.reel && pres(c.pct, R / 28 * 100) && pres(c.segments[1].R, 0.008) && pres(c.segments[3].R, 0.0073) && c.segments[3].taille === '20' && c.segments[3].contacts === 1,
    c && JSON.stringify([c.mots, c.dU, c.segments.map(s => s.R)]));
  ok('MLB24 sous le 3 A : 6,5 × 0,6 = 3,9 A en continu ≥ 3 A (le calibre passe) ; le contact de la prise est la taille 20 du plan (7,5 A) ; mais à −55 °C le 3 A laisse 9,9 A pendant 10 s (5,7 admis) et 5,7 A pendant 1 min (3,9 admis) : pas protégé en surcharge brève, les trois fils, dont deux au-delà d’une prise', D.fils.length === 4 && ['W-B21', 'W-B22', 'W-B23'].every(w => { const f = D.fils.find(f => f.cable === w); return f && f.verdict === 'ok' && pres(f.continu, 3.9) && f.protege === false && f.laisse.filter(x => !x.ok).length >= 2 && f.contact && f.contact.parLePlan && f.contact.taille === '20' && f.calibreMax == null; })
    && D.fils.find(f => f.cable === 'W-B22').via === '411VC1' && !D.fils.find(f => f.cable === 'W-B22').direct && D.fils.find(f => f.cable === 'W-B23').via === '412VC2' && D.fils.find(f => f.cable === 'W-B21').direct, D.fils.map(f => f.cable + ':' + f.verdict + '/' + f.protege + '/' + (f.contact && f.contact.taille)).join(' ')); }
{ // (c) un AD16 (aluminium cuivré) : 201CB1 (10 A) → 701VT1 → W-A06 (8 m) → 320PM1 (EN 2997)
  const D = dj('201CB1'), f = D.fils.find(f => f.cable === 'W-A06'), w = fil(RI, 'W-A06'), c = D.chutes.find(c => /320PM1/.test(c.mots)), kc = Math.sqrt(14.5 / 23);
  ok('AD16 : la résistance vient du câble (23 mΩ/m, CCA), jamais de la ligne cuivre ; l’intensité se déclasse de √(14,5/23) = 0,794 : 19,5 × 0,6 × 0,794 = 9,29 A en continu, moins que les 9,31 A pendant 2,1 min → la charge le dépasse (de justesse), par la barrette 701VT1', w.rd.rho === 23 && w.rd.conducteur === 'CCA' && pres(w.rd.kConducteur, kc) && pres(f.continu, 19.5 * 0.6 * kc) && f.verdict === 'fil' && !f.direct && f.via === '701VT1' && pres(f.facteurCourt, 0.6 * kc), JSON.stringify([w.rd.rho, f.continu, f.verdict, f.via]));
  ok('AD16 : la chute en ligne 201CB1 → 701VT1 → 320PM1 à 5 A : 33,2 × 3 + 2 × 7,3 (deux contacts 20 de la barrette) + 23 × 8, le tout × 5 = 1,491 V > 1 V, longueurs réelles → problème', c && pres(c.dU, (0.0332 * 3 + 2 * 0.0073 + 0.023 * 8) * 5) && c.trop && c.reel && c.segments[1].contacts === 2 && c.segments[1].taille === '20', c && JSON.stringify([c.dU, c.segments.map(s => s.R)]));
  ok('AD16 : serti sur un contact EN 3155 (cuivre) du plan EN 2997 de 320PM1 — la qualification CCA est à confirmer ; le contact 16 (13 A) tient le 10 A ; la table 11-3 admet 15 A pour du 16 AWG', w.bouts[1] && w.bouts[1].sertir && /^EN3155/.test(w.bouts[1].sertir.reference) && !X.contactPourCca(w.bouts[1].sertir.reference) && X.contactPourCca('ABS1493-22') && f.contact && f.contact.taille === '16' && f.contact.intensite === 13 && !f.contactSurcharge && f.calibreMax === 15 && !f.horsTable, w.bouts[1] && JSON.stringify(w.bouts[1].sertir)); }

console.log('\n3. LES RÈGLES NOUVELLES');
ok('la table Protection (AC 43.13-1B 11-3) : 22 → 5 A, 20 → 7,5, 16 → 15, 12 → 30, 4 → 100 ; 24 et 26 AWG : rien (la table commence au 22, on n’invente pas)', [[22, 5], [20, 7.5], [16, 15], [12, 30], [4, 100]].every(([j, m]) => X.protectionDeJauge(NE, j).disjoncteurMax === m) && X.protectionDeJauge(NE, 24) === null && X.protectionDeJauge(NE, 26) === null);
ok('l’intensité d’un contact : 22D et 22 → 5 A, 20 → 7,5, 16 → 13, 12 → 23, 8 → 46 (table des contacts) ; 4 → 80 et 0 → 150 (table Protection) ; 23 → 5 (la plus proche) ; XX → rien', X.intensiteDeContact(NE, '22D').intensite === 5 && X.intensiteDeContact(NE, '22').intensite === 5 && X.intensiteDeContact(NE, '20').intensite === 7.5 && X.intensiteDeContact(NE, '16').intensite === 13 && X.intensiteDeContact(NE, '8').intensite === 46 && X.intensiteDeContact(NE, '4').intensite === 80 && X.intensiteDeContact(NE, '4').source === 'protection' && X.intensiteDeContact(NE, '0').intensite === 150 && X.intensiteDeContact(NE, '23').intensite === 5 && X.intensiteDeContact(NE, 'XX') === null);
{ const P = X.protectionDesFils(NE, 10, { perm: { i: 6 } }, [{ cable: 'W-1', type: 'DR20', taille: '22' }, { cable: 'W-2', type: 'DR20' }], { conditions: [] });
  ok('le contact du plan l’emporte sur la jauge : un DR20 sur un contact 22 (5 A) sous 6 A permanents → le permanent dépasse le contact (problème) ; par la jauge (contact 20, 7,5 A) → seulement le calibre 10 A dépasse (à voir)', P[0].contact.parLePlan && P[0].contact.taille === '22' && P[0].contactDepasse && P[0].contactSurcharge && !P[1].contact.parLePlan && P[1].contact.taille === '20' && !P[1].contactDepasse && P[1].contactSurcharge && P[1].permanent === 6, JSON.stringify([P[0].contact, P[1].contact])); }
ok('un fil ordinaire n’entre pas dans un contact par la ligne « * * » d’un coaxial hors de la plage de sa taille : un AM6 (6 AWG) sur un contact 12 de l’EN 3645 (14–12 AWG) est refusé — un DR12 y va, un type inconnu sans jauge aussi', X.contactDuFil(NE, 'EN3645', '12', 'F', 'AM6', 6) === null && !X.contactAccepte(NE, 'EN3645', '12', 6, 'F', 'AM6') && X.contactAccepte(NE, 'EN3645', '12', 12, 'F', 'DR12') && X.contactDuFil(NE, 'EN3645', '12', 'M', 'ZZ', null) !== null && X.contactDuFil(NE, 'EN3645', '8', 'F', 'AM6', 6) === null);
{ const C = X.courbesDeDisjonction(NE, '', { tableauMin: -55, tableauMax: 125 }), C71 = X.courbesDeDisjonction(NE, '', { tableauMin: -55, tableauMax: 71 }), C23 = X.courbesDeDisjonction(NE, '', { tableauMin: 23, tableauMax: 23 }), C0 = X.courbesDeDisjonction(NE, '', { tableauMin: 0, tableauMax: 40 });
  ok('l’ambiante du tableau choisit les courbes : −55…125 (défaut) → les quatre ; −55…71 → les quatre (le 125 est la première au-dessus) ; 23…23 → les deux 23 °C seulement ; 0…40 → les deux 23 °C, le 125 au-dessus, le −55 au-dessous', C.length === 4 && C71.length === 4 && C23.map(c => c.nom).join('|') === '23 °C min|23 °C max' && C0.length === 4 && X.courbesDeDisjonction(NE).length === 4);
  const V23 = X.verdictDisjonction(NE, '', 10, { perm: { i: 9 } }, { hyp: { tableauMin: 23, tableauMax: 23 } }), V125 = X.verdictDisjonction(NE, '', 10, { perm: { i: 9 } }, { hyp: { tableauMin: -55, tableauMax: 125 } });
  ok('un tableau à 23 °C juge sur le 23 °C min : 9 A sur un 10 A tiennent avec marge (admis 10,45 A) ; à 125 °C ils touchent la courbe (admis 9,24 A)', V23.courbes.length === 2 && V23.valide && V23.avecMarge && pres(V23.points[0].marges[0].admis, 10.45, 1e-2) && V125.valide && V125.serre && !V125.avecMarge, JSON.stringify([V23.points[0].marges[0].admis, V125.points[0].marges[0].admis]));
  const P23 = X.protectionDesFils(NE, 12, { perm: { i: 5 } }, [{ cable: 'W-1', type: 'DR16' }], { conditions: [], tableauMin: 23, tableauMax: 23 })[0], P55 = X.protectionDesFils(NE, 12, { perm: { i: 5 } }, [{ cable: 'W-1', type: 'DR16' }], { conditions: [] })[0];
  ok('la courbe lente suit le min du tableau : à 23 °C, c’est le 23 °C max qui dit ce qui passe (18,9 A pendant 1 min sous un 12 A, moins que les 22,9 A du −55 °C) — le DR16 seul (21,5 A) reste protégé à 23 °C, pas à −55 °C', P23.courbeLente === '23 °C max' && P55.courbeLente === '−55 °C' && pres(P23.laisse[2].courant, 18.9, 0.1) && pres(P55.laisse[2].courant, 22.9, 0.1) && P23.protege === true && P55.protege === false && P55.pireLaisse.palier === 60, JSON.stringify([P23.laisse[2].courant, P55.laisse[2].courant])); }
{ const t = X.tenueEnTemperature(NE, 'VNB24', 150), t2 = X.tenueEnTemperature(NE, 'DR20', 150), t3 = X.tenueEnTemperature(NE, 'VNB24', 95), tAD = X.cableFamilleDe(NE, 'AD16');
  ok('la tenue en température : à 150 °C d’ambiante, le conducteur monte à 190 °C — le VN (180 °C) ne tient pas, le DR (260 °C) oui ; à 95 °C tout tient ; un AM (sans T max) ne dit rien', t && !t.ok && t.conducteurA === 190 && t.tmax === 180 && t2.ok && t3.ok && X.tenueEnTemperature(NE, 'AM6', 150) === null && X.tenueEnTemperature(NE, '', 95) === null, JSON.stringify(t));
  ok('(à réparer dans normes/cables.csv, ligne AD de la table Familles de câbles : la cellule Conducteur contient des « ; », les colonnes glissent — T max se lit null, T min 6, Tension −60 ; le conducteur reste lu CCA)', tAD && tAD.conducteur === 'CCA' && (tAD.tmax === 180 || tAD.tmax == null), JSON.stringify([tAD && tAD.tmin, tAD && tAD.tmax, tAD && tAD.tension])); }
{ const S = X.simulerBornier(X.remplirSelonNorme(X.physiqueDeBarrette('667VT21', X.contratExemple(), X.bibleDeLOutil()), NE), NE, { conditions: [] }), S2 = X.simulerBornier(X.remplirSelonNorme(X.physiqueDeBarrette('667VT21', X.contratExemple(), X.bibleDeLOutil()), NE), NE, { conditions: [], retour: 'fil' });
  ok('le retour par un fil identique double la chute de la simulation (667VT21, DR24 : 1,20 V → 2,40 V) ; chaque ligne porte la tenue du câble (DR : 260 °C, ok) ; par la structure, rien ne change', S.lignes[0].kRetour === 1 && S2.lignes[0].kRetour === 2 && pres(S2.lignes[0].dU, 2 * S.lignes[0].dU) && S2.retour === 'fil' && S.lignes.every(x => x.tenue && x.tenue.ok && x.tenue.tmax === 260), JSON.stringify([S.lignes[0].dU, S2.lignes[0].dU]));
  const L0 = X.contratExemple(), C1 = X.chutesDepuis(NE, L0, '102CB1', 5, {}), C2 = X.chutesDepuis(NE, L0, '102CB1', 5, { retour: 'fil' }), C3 = X.chutesDepuis(NE, L0, '102CB1', 5, { regime: 'tri', cosphi: 0.8, tension: 115 });
  ok('la chaîne suit le retour (W-015 : 2,85 V → 5,70 V) et le régime (triphasé sous 115 V : √3 × 0,8 × 2,85 = 3,95 V contre les 7 V de la ligne 200 V : passe)', pres(C1[2].dU, 2.85) && pres(C2[2].dU, 5.7) && C2[2].kRetour === 2 && pres(C3[2].dU, Math.sqrt(3) * 0.8 * 2.85) && C3[2].admis === 7 && C3[2].tension === 200 && !C3[2].trop && C1[2].trop, JSON.stringify([C1[2].dU, C2[2].dU, C3[2].dU]));
  const Ci = X.chutesDepuis(NE, L0, '102CB1', 1, {}, [{ i: 4, t: 10 }, { i: 3, t: 200 }])[2];
  ok('les pointes contre l’intermittent : 1 A → 0,57 V ; 4 A pendant 10 s → 2,28 V > 2 V (l’intermittent, ≤ 2 min) : trop ; 3 A pendant 200 s → 1,71 V > 1 V (le continu) : trop aussi', pres(Ci.dU, 0.57) && !Ci.trop && Ci.pointes.length === 2 && pres(Ci.pointes[0].dU, 2.28) && Ci.pointes[0].admis === 2 && Ci.pointes[0].intermittent && Ci.pointes[0].trop && pres(Ci.pointes[1].dU, 1.71) && Ci.pointes[1].admis === 1 && !Ci.pointes[1].intermittent && Ci.pointes[1].trop && Ci.tropPointe && X.INTERMITTENT_MAX === 120, JSON.stringify(Ci.pointes)); }
ok('la réactance estimée d’un fil seul à 20 mm de la structure, 400 Hz : 20 AWG (0,597 mm²) ≈ 2,4 mΩ/m ; 0 AWG (53 mm²) ≈ 1,3 mΩ/m — une proposition, pas une valeur prise d’office (le gros câble reste « X à saisir »)', pres(X.reactanceEstimee(0.597), 2.4, 0.1) && pres(X.reactanceEstimee(53), 1.27, 0.05) && X.reactanceEstimee(0) === null
  && (() => { const S = X.simulerBornier(X.remplirSelonNorme(X.physiqueDeBarrette('667VT21', X.contratExemple().map(l => ({ ...l, type: 'YV0' })), X.bibleDeLOutil()), NE), NE, { regime: 'tri', conditions: [] }); return S.lignes.every(x => x.xRequis && x.dU === null && x.xEstime > 1 && x.xEstime < 1.5); })(), X.reactanceEstimee(0.597).toFixed(2) + ' ' + X.reactanceEstimee(53).toFixed(2));
{ const P = X.protectionDesFils(NE, 10, { perm: { i: 5 } }, [{ cable: 'W-1', type: 'AD6' }], { conditions: [] })[0];
  ok('un AD6 sans résistance dans la base : la ligne cuivre ne vaut pas, l’intensité est inconnue (refusé), rien n’est inventé', P.verdict === 'inconnu' && P.refuse && P.conducteur === 'CCA' && P.continu === null); }
{ const F = X.filsDepuis(X.contratExemple(), '102CB1'), G = X.filsDepuis(CONTRAT_RICHE.map(X.liaison), '205CB5');
  ok('les fils qu’un disjoncteur nourrit : 102CB1 → ses trois fils, tous directs ; 205CB5 → W-A23 (direct) puis W-A25 par 702VT2, vers 206CB6, et W-A28 qui l’alimente (direct)', F.length === 3 && F.every(f => f.direct && !f.via) && G.map(f => f.cable + (f.direct ? '' : ' par ' + f.via)).sort().join(', ') === 'W-A23, W-A25 par 702VT2, W-A28' && G.find(f => f.cable === 'W-A25').autre === '206CB6:1', G.map(f => f.cable + (f.direct ? '' : ' par ' + f.via)).join(', ')); }
{ // une barrette POSÉE par l'outil (VT1 de l'exemple sous 102VT9, comme `poserBarrette` l'écrit au contrat : un fil à créer sans numéro vers la
  // borne 1, des shunts sans numéro, les deux fils dédoublés déplacés sur les bornes 2 et 3) ne coupe pas le disjoncteur de ses fils
  const E = X.contratExemple(), i12 = E.findIndex(l => l.cable === 'W-012'), i15 = E.findIndex(l => l.cable === 'W-015');
  E[i12] = X.liaison({ ...E[i12], de: '102VT9', borneDe: '2', pnDe: '' }); E[i15] = X.liaison({ ...E[i15], vers: '102VT9', borneVers: '3', pnVers: '' });
  E.push(X.liaison({ de: '102CB1', borneDe: '2', pnDe: 'MS3320-10', vers: '102VT9', borneVers: '1', cable: '', type: 'DR20', route: 'PUISSANCE', plan: '1' }),
    X.liaison({ de: '102VT9', borneDe: '1', vers: '102VT9', borneVers: '2', cable: '', plan: '1' }), X.liaison({ de: '102VT9', borneDe: '2', vers: '102VT9', borneVers: '3', cable: '', plan: '1' }));
  const F = X.filsDepuis(E, '102CB1'), ch = X.cheminsDepuis(E, '102CB1'), bouts = ch.map(c => c.bout[0] + ':' + c.bout[1]).sort().join(', ');
  ok('VT1 posée sous 102VT9 : 102CB1 nourrit W-011, le fil à créer, puis W-012 et W-015 PAR 102VT9 (ses shunts sans numéro) ; les chemins vont jusqu’à 101BT1, 103RL1 et 395SW1', F.map(f => (f.cable || 'à créer') + (f.direct ? '' : ' par ' + f.via)).sort().join(', ') === 'W-011, W-012 par 102VT9, W-015 par 102VT9, à créer' && bouts === '101BT1:1, 103RL1:A1, 395SW1:1' && ch.every(c => c.fini), F.map(f => (f.cable || 'à créer') + (f.direct ? '' : ' par ' + f.via)).join(', ') + ' → ' + bouts);
  const P = X.protectionDesFils(NE, 10, { dem: { i: 9.31, t: 5 }, trans: { i: 9.31, t: 120 }, perm: { i: 5 } }, F, H0);
  ok('… et la protection les juge comme avant la pose : W-012 (DR20) et W-015 (DR24) dépassés par la charge, W-011 protégé en continu', P.find(f => f.cable === 'W-012').verdict === 'fil' && P.find(f => f.cable === 'W-015').verdict === 'fil' && P.find(f => f.cable === 'W-011').verdict === 'ok', P.map(f => (f.cable || 'à créer') + ':' + f.verdict).join(' ')); }
ok('SANS_RACCORD : l’EN 4165 (le lecteur) et l’EN 3645 (à confirmer) ; pas l’EN 2997, l’EN 3646, l’ASNE0059 ni une famille inconnue', X.sansRaccord('EN4165') && X.sansRaccord('EN3645') && !X.sansRaccord('EN2997') && !X.sansRaccord('EN3646') && !X.sansRaccord('ASNE0059') && !X.sansRaccord('') && /n’en a pas/.test(X.SANS_RACCORD.EN4165) && /à confirmer/.test(X.SANS_RACCORD.EN3645));

/* ==================================================================================================================
   2. LE CONTRÔLE, AU NAVIGATEUR : chaque défaut une fois, au bon niveau, sur le bon repère
   ================================================================================================================== */
const fin = () => { tableauDeCouverture(); console.log('\n  ' + (total - echecs) + ' / ' + total + ' contrôles passés' + (echecs ? '  —  ' + echecs + ' ÉCHEC(S)' : '  —  tout est vert')); process.exit(echecs ? 1 : 0); };
if (process.argv.includes('--sans-navigateur')) { console.log('\n2. LE CONTRÔLE : sauté (--sans-navigateur)'); fin(); }
else (async () => {
  console.log('\n2. LE CONTRÔLE, AU NAVIGATEUR');
  const { chromium } = require('playwright'), P = require('./pilote');
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await nav.newPage({ viewport: { width: 1500, height: 950 } }); page.setDefaultTimeout(180000);
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  await page.goto(P.fichierDemande()); await page.waitForFunction(() => typeof atelier !== 'undefined'); await page.waitForTimeout(800);
  const lire = () => page.evaluate(() => controleDuContrat());
  const unique = items => { const vus = new Set(); return items.every(x => { const k = x.niveau + '|' + x.nom + '|' + x.texte; if (vus.has(k)) return false; vus.add(k); return true; }); };
  const reperesConnus = (items, reperes) => items.every(x => !x.nom || reperes.includes(x.nom) || /^VT\d+$/.test(x.nom));
  // ---- l'exemple embarqué
  const E = await lire(), ex = (nom, re, niveau) => E.filter(x => x.nom === nom && re.test(x.texte) && (!niveau || x.niveau === niveau));
  ok('l’exemple : chaque ligne une fois, sur un repère du contrat ou le tableau ; aucune erreur', unique(E) && reperesConnus(E, EX.reperes) && !erreurs.length, E.length + ' lignes' + (erreurs.length ? ' · ' + erreurs[0] : ''));
  ok('102CB1 : deux problèmes (W-012 et W-015, la charge les dépasse), le 10 A qui touche la courbe, le DR16 pas protégé en surcharge brève — comme avant', ex('102CB1', /W-012 \(DR20\) : démarrage/, 'ko').length === 1 && ex('102CB1', /W-015 \(DR24\) : démarrage/, 'ko').length === 1 && ex('102CB1', /touche la courbe/, 'att').length === 1 && ex('102CB1', /W-011 \(DR16\) : pas protégé en surcharge brève/, 'att').length === 1 && E.filter(x => x.nom === '102CB1' && x.niveau === 'ko').length === 2);
  ok('102CB1, les règles nouvelles : le 10 A dépasse les 7,5 A de la table 11-3 pour le DR20 ; les contacts 20 (7,5 A) et 22 (5 A) sont sous le calibre ; la chute en ligne vers 395SW1 (2,85 V) et la pointe vers 103RL1 (1,55 V) dépassent le volt admis, sur des longueurs d’hypothèse : à voir, pas des problèmes',
    ex('102CB1', /W-012 \(DR20\) : calibre 10 A > 7,5 A, le maximum de l’AC 43.13-1B \(table 11-3\) pour du 20 AWG/, 'att').length === 1 && ex('102CB1', /W-012 \(DR20\) : contact taille 20 \(7,5 A, par la jauge\) < calibre 10 A/, 'att').length === 1 && ex('102CB1', /W-015 \(DR24\) : contact taille 22 \(5 A, par la jauge\) < calibre 10 A/, 'att').length === 1
    && ex('102CB1', /chute en ligne vers 395SW1:1 : 2,85 V à 5 A > 1 V admis sous 28 V \(longueurs d’hypothèse\)/, 'att').length === 1 && ex('102CB1', /chute en ligne vers 103RL1:A1 en pointe : 1,55 V à 9,31 A pendant 2,1 min > 1 V admis \(longueurs d’hypothèse\)/, 'att').length === 1 && !E.some(x => x.nom === '102CB1' && /chute/.test(x.texte) && x.niveau === 'ko'),
    E.filter(x => x.nom === '102CB1').map(x => x.niveau + ' ' + x.texte).join(' | '));
  ok('300XC1 B (aucun arrangement) : un problème ; les trois barrettes à poser : à voir ; rien sur le tableau (types connus, tous typés, ambiante tenue)', ex('300XC1', /aucun arrangement/, 'ko').length === 1 && ['VT1', 'VT2', 'VT3'].every(v => E.filter(x => x.nom === v && x.niveau === 'att').length === 1) && !E.some(x => !x.nom), E.filter(x => !x.nom).map(x => x.texte).join(' | ') || 'rien sur le tableau');
  // ---- le contrat inventé
  await page.evaluate(([rows, charges]) => { chargerContrat(rows, 'contrat inventé', 'Couverture'); app.contrat.charges = new Map(Object.entries(charges)); rendreControle(); }, [CONTRAT_RICHE, CHARGES_RICHES]);
  await page.waitForTimeout(500);
  const R = await lire(), ri = (nom, re, niveau) => R.filter(x => x.nom === nom && re.test(x.texte) && (!niveau || x.niveau === niveau)), n1 = (nom, re, niveau) => ri(nom, re, niveau).length === 1;
  const dire = nom => R.filter(x => x.nom === nom).map(x => x.niveau + ' ' + x.texte).join(' | ');
  ok('le contrat inventé : chaque ligne une fois, sur un repère ou le tableau ; aucune erreur ; le contrôle tient en moins d’une seconde', unique(R) && reperesConnus(R, RI.reperes) && !erreurs.length && (await page.evaluate(() => { const t = performance.now(); controleDuContrat(); return performance.now() - t; })) < 1000, R.length + ' lignes');
  ok('201CB1 (10 A) : W-A02 (DR20) direct et W-A04 (DR20 par 701VT1), W-A06 (AD16 par 701VT1, 9,29 A) : la charge les dépasse — trois problèmes, chacun une fois', n1('201CB1', /^W-A02 \(DR20\) : démarrage/, 'ko') && n1('201CB1', /^W-A04 \(DR20\) \(par 701VT1\) : démarrage/, 'ko') && n1('201CB1', /^W-A06 \(AD16\) \(par 701VT1\) : démarrage et transition 9,31 A \/ 2,1 min > 9,29 A admis en continu/, 'ko'), dire('201CB1'));
  ok('201CB1 : la table 11-3 (7,5 A pour du 20 AWG) est sous le 10 A pour les deux DR20, une fois chacun ; les contacts du plan — le module C301 de 701VT1 met les trois fils du potentiel sur des contacts 16 (13 A), 320PM1 aussi — laissent passer le 10 A : rien sur les contacts ; la table admet 15 A pour l’AD16', ri('201CB1', /table 11-3\) pour du 20 AWG/, 'att').length === 2 && n1('201CB1', /^W-A02 \(DR20\) : calibre 10 A > 7,5 A/, 'att') && n1('201CB1', /^W-A04 \(DR20\) \(par 701VT1\) : calibre 10 A > 7,5 A/, 'att') && !R.some(x => x.nom === '201CB1' && /contact taille/.test(x.texte)) && !R.some(x => x.nom === '201CB1' && /W-A06.*table 11-3/.test(x.texte)) && RI.barrettes.find(b => b.repere === '701VT1').plan.reference === 'E0599-1C301Z', dire('201CB1'));
  ok('201CB1 : la chute en ligne vers 310RL1 (1,401 V) et vers 320PM1 (1,491 V) dépasse le volt admis sur des longueurs réelles : deux problèmes', n1('201CB1', /^chute en ligne vers 310RL1:A1 : 1,4 V à 5 A > 1 V admis sous 28 V$/, 'ko') && n1('201CB1', /^chute en ligne vers 320PM1:1 : 1,49 V à 5 A > 1 V admis sous 28 V$/, 'ko'), dire('201CB1'));
  ok('202CB2 (sans part number, 3 A permanents) : l’idéal 5 A retenu sans rien à dire du calibre ; le DR22 pas protégé en surcharge brève, c’est tout', R.filter(x => x.nom === '202CB2').length === 1 && n1('202CB2', /^W-A10 \(DR22\) : pas protégé en surcharge brève — le 5 A laisse/, 'att'), dire('202CB2'));
  ok('203CB3 (ABC-15, sans profil) : le profil à renseigner, et le part number d’une famille inconnue — deux points à voir, rien d’autre', R.filter(x => x.nom === '203CB3').length === 2 && n1('203CB3', /profil de charge est à renseigner/, 'att') && n1('203CB3', /^part number ABC-15 : famille de disjoncteur inconnue, le calibre ne s’y lit pas$/, 'att'), dire('203CB3'));
  ok('204CB4 (MS14154-10, tripolaire 6TC, 6 A par phase) : jugé comme un pôle — un 7,5 A suffirait ; ses trois DR16 pas protégés en surcharge brève ; rien sur les contacts 16 de 371MT1 (13 A) ni la table (15 A)', n1('204CB4', /10 A \(part number\) : un 7,5 A suffirait/, 'att') && ri('204CB4', /^W-A1[789] \(DR16\) : pas protégé en surcharge brève/, 'att').length === 3 && !R.some(x => x.nom === '204CB4' && /(contact|table 11-3)/.test(x.texte)) && !R.some(x => x.nom === '204CB4' && x.niveau === 'ko'), dire('204CB4'));
  ok('205CB5 (5 A) et 206CB6 (3 A) en cascade : la sélectivité 2:1 manque, dite sur chacun ; W-A25 (DR22 par 702VT2) pas protégé en surcharge brève sous le 5 A ; la chute reste sous le volt', n1('205CB5', /^sélectivité avec 206CB6 \(3 A\)/, 'att') && n1('206CB6', /^sélectivité avec 205CB5 \(5 A\)/, 'att') && n1('205CB5', /^W-A25 \(DR22\) \(par 702VT2\) : pas protégé en surcharge brève/, 'att') && !R.some(x => /^20[56]CB/.test(x.nom) && /chute en ligne/.test(x.texte)), dire('205CB5') + ' || ' + dire('206CB6'));
  ok('207CB7 (MS14105-35, 35 A, AM6 aluminium) : le calibre tient (30 A permanents, 60 A au démarrage) ; les deux AM6 (85 × 0,6 × 0,847 = 43,2 A) ne sont pas protégés en surcharge brève (le 35 A laisse 51,4 A pour toujours à −55 °C) ; le contact 4 (80 A, par la jauge) et la table (80 A pour du 6 AWG) passent ; la chute (0,66 V) aussi',
    !R.some(x => x.nom === '207CB7' && x.niveau === 'ko') && ri('207CB7', /^W-B1[89] \(AM6\) : pas protégé en surcharge brève — le 35 A laisse passer 51,4 A en continu à −55 °C, le fil admet 43,22 A$/, 'att').length === 2 && !R.some(x => x.nom === '207CB7' && /(contact taille|table 11-3|chute)/.test(x.texte)), dire('207CB7') || 'rien');
  ok('570MT2 (EN 3645, deux AM6) : aucun arrangement ne loge du 6 AWG — la ligne « * * » d’un contact coaxial ne l’accepte plus — : un problème sur l’équipement, et aucune « qualification CCA » sur un contact qui n’existe pas', n1('570MT2', /^A · aucun arrangement .* ne loge les bornes 1, 2 avec ces jauges$/, 'ko') && !R.some(x => x.nom === '570MT2' && /qualification/.test(x.texte)), dire('570MT2'));
  ok('208CB8 (3 A) : la chute en ligne à travers les deux prises (1,536 V) est un problème ; les trois MLB24 pas protégés en surcharge brève (le direct par la fiche, les deux autres par 411VC1 et 412VC2), une fois chacun', n1('208CB8', /^chute en ligne vers 580ST1:1 : 1,54 V à 1 A > 1 V admis sous 28 V$/, 'ko') && n1('208CB8', /^W-B21 \(MLB24\) : pas protégé en surcharge brève/, 'att') && n1('208CB8', /^W-B22 \(MLB24\) \(par 411VC1\) : pas protégé/, 'att') && n1('208CB8', /^W-B23 \(MLB24\) \(par 412VC2\) : pas protégé/, 'att'), dire('208CB8'));
  ok('320PM1 (EN 2997) : les deux AD16 sertis sur un contact EN 3155 cuivre — qualification CCA à confirmer, une ligne par fil, sur la prise de l’équipement', ri('320PM1', /^W-A0[69] \(AD16\) : conducteur CCA sur un contact EN3155\S+ — qualification CCA à confirmer$/, 'att').length === 2 && !R.some(x => x.nom !== '320PM1' && /qualification CCA/.test(x.texte)), dire('320PM1'));
  ok('le tableau : un type inconnu (ZZ22), un fil sans type (W-B15) ; VT1 à poser sur 200BT1:1 ; rien sur l’ambiante (95 °C : tout tient)', n1('', /^un type de fil inconnu de la base des câbles : ZZ22$/, 'att') && n1('', /^1 fil sans type/, 'att') && n1('VT1', /^à poser sur 200BT1:1$/, 'att') && !R.some(x => /ambiante/.test(x.texte)), R.filter(x => !x.nom).map(x => x.texte).join(' | '));
  ok('les prises 411VC1 et 412VC2, les barrettes 701VT1 et 702VT2, le calculateur 500XC1 : rien à reprendre (tout est logé, les jauges admises)', !R.some(x => /^(411VC1|412VC2|701VT1|702VT2|500XC1)$/.test(x.nom)), R.filter(x => /^(411VC1|412VC2|701VT1|702VT2|500XC1)$/.test(x.nom)).map(x => x.nom + ' ' + x.texte).join(' | ') || 'rien');
  // ---- l'ambiante : les câbles qui ne tiennent pas
  await page.evaluate(() => { app.simu = { ...app.simu, ambiante: 150 }; });
  const T = await lire();
  ok('à 150 °C d’ambiante, le tableau dit que le VN (180 °C max) ne tient pas l’échauffement de 40 °C — une fois, pour la famille (l’AD aussi, dès que sa ligne de normes/cables.csv sera réparée) ; les DR, MLB, AM ne sont pas cités', T.filter(x => !x.nom && /^ambiante 150 °C : (AD \(180 °C max\), )?VNB \(180 °C max\) ne tien(t|nent) pas l’échauffement de 40 °C de l’EN 2853 \(190 °C au conducteur\)$/.test(x.texte)).length === 1, T.filter(x => /ambiante/.test(x.texte)).map(x => x.texte).join(' | '));
  await page.evaluate(() => { app.simu = { ...app.simu, ambiante: 95 }; });
  ok('aucune erreur console', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  await nav.close(); fin(); })();
