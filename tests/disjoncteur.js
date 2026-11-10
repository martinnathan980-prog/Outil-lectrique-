/* ===========================================================================
   LE DISJONCTEUR — le moteur sans navigateur, puis l'écran à la vraie souris.
       NODE_PATH=/opt/node22/lib/node_modules node tests/disjoncteur.js [--fichier=chemin]

   Le moteur : les familles de disjoncteurs (NSA935401 est un collier), le
   bilan thermique en somme des fractions, plus de marge (v80 : valide ou pas
   valide ; les mathématiques en détail : tests/disjoncteur-maths.js), la protection des fils sur la
   courbe lente (l'ambiante sur le continu seulement), la sélectivité 2:1,
   l'interpolation log-log que le dessin échantillonne.
   L'écran, sur 102CB1 : la gamme de la famille en segments jugés, le retenu pressé et
   d'où il vient ; le graphique (les quatre courbes du retenu dans un groupe
   décalé de log10(calibre), les fantômes de la famille, l'escalier, les étiquettes
   d'axes sans chevauchement) ; survoler un segment montre son fantôme, la
   légende isole une courbe, le réticule lit n'importe où, la carte d'un point
   dit ce que le disjoncteur tient à chaque température ; glisser un point
   (pointer capture) écrit le profil au contrat et Ctrl+Z le rend ; changer
   de calibre fait glisser les courbes ; la table des états, les paliers des
   fils, la jauge des chutes.
   Le folio : 102CB1 n'est plus une boîte mais sa forme (deux bornes, l'arc,
   le bouton en T), aux ports d'un équipement, avec « 10 A » à côté ; le
   calibre retenu dans la fiche s'y écrit, Ctrl+Z le rend. Le symbole cas par
   cas, sur des blocs fabriqués (debout, couché, coudes, une borne seule,
   tripolaires, une borne sur les deux flancs : la boîte), ses pôles
   appariés, ses textes dans le corps sans se chevaucher. Rend 1 au premier
   échec.
   =========================================================================== */
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.join(__dirname, '..', 'src'), NORMES = path.join(__dirname, '..', 'normes');
let total = 0, echecs = 0;
const ok = (c, nom, detail) => { total++; if (!c) echecs++; console.log('  ' + (c ? 'ok ' : 'KO ') + ' ' + nom + (detail ? '   ' + detail : '')); };

console.log('\nLE MOTEUR');
{ const code = ['01-modele.js', '02-lecture.js', '09-barrettes.js', '09-chute.js', '09-disjoncteurs.js'].map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
  const normes = fs.readdirSync(NORMES).filter(f => /\.csv$/i.test(f)).sort().map(f => fs.readFileSync(path.join(NORMES, f), 'utf8')).join('\n\n');
  const bac = { console }; vm.createContext(bac);
  vm.runInContext('const NORME_EMBARQUEE = ' + JSON.stringify(normes) + ';\n' + code + '\nthis.X = { normeEmbarquee, courbesDeDisjonction, tempsDeDeclenchement, multipleAdmis, pointsDuProfil, verdictDisjonction, protectionDesFils, calibreDuPn, familleDuPn, FAMILLES_DISJONCTEURS, CALIBRES, MARGE_DISJONCTION, MARGE_FRACTION, SELECTIVITE, HYPOTHESES, tenueGarantie, calibresDeLaFamille, pnAvecCalibre };', bac);
  const X = bac.X, NE = X.normeEmbarquee(), C = X.courbesDeDisjonction(NE), c125 = C[0], lente = C[C.length - 1];
  // (v84 : les contrôles de la marge — 10 % de courant, 75 % du temps — sont tombés avec elle en v80 : valide ou pas valide)
  ok(X.MARGE_DISJONCTION === 1 && X.MARGE_FRACTION === 1 && X.SELECTIVITE === 2 && X.FAMILLES_DISJONCTEURS.length >= 9, 'plus de marge (v80) : le facteur de courant et la part du temps de déclenchement admise valent 1 ; la sélectivité 2:1 ; neuf familles de disjoncteurs');
  ok(X.calibreDuPn('NSA935401-10') === null && X.familleDuPn('NSA935401-10') === null && X.calibreDuPn('MS3320-10') === 10 && X.familleDuPn('MS3320-10').famille === 'MS3320' && X.familleDuPn('MS3320-10').courbe === 'ETA483' && X.familleDuPn('2TC7-20').famille === '2TC' && X.familleDuPn('2TC7-20').courbe === '2TC' && X.familleDuPn('MS14154-5').courbe === '6TC' && X.familleDuPn('483-G533-J1M1-B2S0ZN-5A').famille === 'ETA483' && X.familleDuPn('MS33201-5').famille === 'MS33201' && X.calibreDuPn('2TC7-20') === 20 && X.calibreDuPn('MS3320-2-1/2') === 2.5 && X.calibreDuPn('7274-11-1/2') === 0.5 && X.calibreDuPn('MS22073-5') === 5 && X.calibreDuPn('EN2995-001-7,5') === 7.5 && X.calibreDuPn('MS3320-99') === null && X.calibreDuPn('ABC-7,5A') === null && X.calibreDuPn('MS3470L14-5P') === null,
    'le calibre ne se lit qu’après une famille de disjoncteur : NSA935401-10 (un collier) → rien ; MS3320-10 → 10 (famille MS3320, courbes ETA483 : la feuille du lecteur) ; 2TC7-20 → 20 (courbes 2TC) ; MS14154-5 → 6TC ; 483-G533-J1M1-B2S0ZN-5A → ETA483 ; MS33201-5 → Crouzet, pas MS3320 ; MS3320-2-1/2 → 2,5 ; 7274-11-1/2 → ½ ; MS22073-5 → 5 ; EN2995-001-7,5 → 7,5 ; MS3320-99 (hors gamme), ABC-7,5A, MS3470L14-5P → rien');
  const PROFIL = { dem: { i: 9.31, t: 5 }, trans: { i: 9.31, t: 120 }, perm: { i: 5 } }, V = X.verdictDisjonction(NE, '', 10, PROFIL);
  ok(V.valide && !V.serre && V.avecMarge && V.somme > 0.05 && V.somme < 0.07 && !V.points[0].serre && V.calibreIdeal === 10 && V.reserve === '' && V.gamme.map(g => g.valide ? (g.serre ? 's' : 'o') : 'x').join('') === 'xxxxoooo',
    'l’Excel du lecteur sur un 10 A : 9,31 A pendant 2,1 min, il ne disjoncte qu’au-delà de 9,66 A — il ne disjoncte pas, c’est le plus petit qui ne disjoncte pas (v80 : plus de marge ; avec 10 % de courant en plus c’était le 15 A) ; la gamme du lecteur (1, 3, 5, 7,5, 10, 15, 20, 25 A) disjoncte jusqu’au 7,5 A', V.gamme.map(g => g.calibre + (g.valide ? (g.serre ? ' serré' : ' ok') : ' ko')).join(' · ') + ' · Σ ' + V.somme.toFixed(3));
  const P9 = X.verdictDisjonction(NE, '', 10, { perm: { i: 9.0 } });
  ok(P9.valide && !P9.serre && !P9.points[0].serre && P9.calibreIdeal === 10, 'un permanent de 9 A sur un 10 A : il ne disjoncte qu’au-delà de 9,24 A, il ne disjoncte pas — le 10 A est retenu (v80 : plus de « touche la courbe »)', 'seuil ' + P9.points[0].marges[0].admis.toFixed(2) + ' A');
  const P8 = X.verdictDisjonction(NE, '', 10, { perm: { i: 8.3 } });
  ok(P8.valide && !P8.serre && P8.avecMarge && P8.calibreIdeal === 10, 'à 8,3 A (11 % de marge) le permanent est dans le vert, l’idéal reste le 10 A');
  // la somme des fractions : chaque point tient seul, et pourtant le bilame déclenche
  const S = X.verdictDisjonction(NE, '', 10, { dem: { i: 15, t: 3 }, trans: { i: 12, t: 6 }, perm: { i: 5 } });
  ok(S.points.filter(p => p.t !== Infinity).every(p => p.marges[0].temps > p.t) && !S.valide && S.somme > 1 && S.points.filter(p => p.ok === false).length === 1 && S.points.find(p => p.ok === false).i === 15 && S.pire && S.pire.i === 15,
    '15 A pendant 3 s (tient 4,5 s) puis 12 A pendant 6 s (tient 10,4 s) : chaque point reste à gauche de la courbe, mais 67 % + 58 % du temps de déclenchement = déclenche ; le point qui pèse le plus est le fautif', 'Σ ' + S.somme.toFixed(2));
  const S15 = X.verdictDisjonction(NE, '', 15, { dem: { i: 20, t: 5 }, trans: { i: 12, t: 60 }, perm: { i: 5 } });
  ok(S15.valide && !S15.serre && S15.avecMarge && S15.somme > 0.7 && S15.somme < 0.76 && !S15.points.find(p => p.i === 20).serre && S15.calibreIdeal === 15, 'sur un 15 A, 20 A pendant 5 s (il disjoncterait au bout de 6,8 s : 74 %) puis 12 A (0,8 In : jamais) : il ne disjoncte pas — v80 : plus de « serré » ; le 10 A disjoncte (2 In pendant 5 s)', 'Σ ' + S15.somme.toFixed(2));
  // la protection du fil sur la courbe lente, la charge contre le fil, l'ambiante sur le continu seulement
  const FILS = [{ cable: 'W-011', type: 'DR16', borne: '1' }, { cable: 'W-012', type: 'DR20', borne: '2' }, { cable: 'W-015', type: 'DR24', borne: '2' }];
  ok(Math.abs(X.multipleAdmis(lente, 60) - 1.91) < 0.01 && Math.abs(X.multipleAdmis(lente, Infinity) - 1.469) < 0.001, 'la courbe lente (−55 °C) laisse passer 1,91 In pendant 1 min, 1,47 In pour toujours');
  const PR = X.protectionDesFils(NE, 10, PROFIL, FILS, { conditions: [] }), PF = X.protectionDesFils(NE, 10, PROFIL, FILS, { conditions: ['faisceau'] });
  // R2 règle 1 : le disjoncteur protège le fil quand ce qu'il laisse passer reste sous la courbe de DOMMAGE du fil (table Dommage des fils), plus sous ses intensités de service
  ok(PR.map(f => f.verdict).join() === 'ok,ok,fil' && PR.every(f => f.jugeSur === 'dommage') && PR[0].protege === true && PR[1].protege === false && PR[1].pireLaisse.palier === 10 && Math.abs(PR[1].pireLaisse.admise - 11.5 * Math.sqrt(165 / 40)) < 1e-9
    && PR[1].laisse.map(x => x.ok ? 'o' : 'x').join('') === 'xxoo' && PR[2].protege === false,
    'sous un 10 A, fil seul à 95 °C : le DR16 est protégé ; le DR20 ne l’est pas à 2 s (53 A laissés, 48 A avant dommage) ni à 10 s (le pire : 28,7 A pour 11,5 × √(165/40) = 23,4 A, le continu porté à 260 °C) — la FAA plafonne le 20 AWG à 7,5 A ; le DR24 non plus', PR.map(f => f.cable + ' ' + f.verdict + '/' + f.protege + ' ' + f.laisse.map(x => x.courant.toFixed(1) + '/' + x.admise.toFixed(1)).join(' ')).join(' · '));
  ok(PF[0].protege === true && Math.abs(PF[0].facteur - 0.6) < 1e-9 && PF[0].laisse.every(x => x.ok) && [[0, 53, 109], [1, 28.7, 48.8], [2, 19.1, 23.8], [3, 14.7, 23.8]].every(([i, c, a]) => Math.abs(PF[0].laisse[i].courant - c) < 0.1 && Math.abs(PF[0].laisse[i].admise - a) < 0.1) && Math.abs(PF[0].laisse[2].service - 12.9) < 0.01,
    'en faisceau (× 0,60, le point FAA 8 fils à 60 %), le DR16 est protégé par le 10 A (R2 § 3.4) : 2 s 53 / 109 A, 10 s 28,7 / 48,8, 1 min 19,1 / 23,8, continu 14,7 / 23,8 — l’ancienne règle le comparait aux 12,9 A de service à 1 min', PF[0].laisse.map(x => x.mot + ' ' + x.courant.toFixed(1) + '/' + x.admise.toFixed(1)).join(' · '));
  const PA = X.protectionDesFils(NE, 10, PROFIL, [FILS[0]], { conditions: [], ambiante: 70 })[0];
  ok(Math.abs(PA.continu - 19.5 * Math.sqrt(65 / 40)) < 1e-9 && Math.abs(PA.laisse[0].service - 81.5) < 1e-9 && Math.abs(PA.laisse[3].service - PA.continu) < 1e-9 && Math.abs(PA.laisse[3].admise - 19.5 * Math.sqrt(190 / 40)) < 1e-9 && Math.abs(PA.laisse[0].admise - Math.sqrt(23767 / 2)) < 1e-9 && Math.abs(PA.facteurCourt - 1) < 1e-9,
    'à 70 °C d’ambiante, le continu du DR16 monte à 19,5 × 1,27 A en service (et 19,5 × √(190/40) avant dommage), mais les paliers courts (adiabatiques) restent ceux de la norme : 81,5 A de service pendant 2 s, √(23 767 / 2) = 109 A avant dommage');
  // l'idéal à quatre conditions : la charge, les fils, le continu, la sélectivité — et sa réserve
  const VF = X.verdictDisjonction(NE, '', 10, PROFIL, { fils: FILS, hyp: { conditions: ['faisceau'] } });
  ok(VF.calibreIdeal === 10 && VF.reserve === 'fils' && VF.gamme.find(g => g.calibre === 1).fils === true && VF.gamme.filter(g => g.calibre >= 3).every(g => g.fils === false),
    'avec ses fils : seul le 1 A les protégerait tous, mais il disjoncte ; le retenu reste celui de la charge (10 A, le plus petit qui ne disjoncte pas) et la réserve dit « fils »');
  const VS = X.verdictDisjonction(NE, '', 10, { perm: { i: 2 } }, { autres: [15] });
  ok(VS.calibreIdeal === 3 && VS.gamme.find(g => g.calibre === 10).selectif === false && VS.gamme.find(g => g.calibre === 7.5).selectif === true && VS.gamme.find(g => g.calibre === 1).valide === false && VS.reserve === '',
    'un voisin de 15 A : le 10 A n’est pas à 2:1 (15 < 20), le 7,5 A l’est (15 ≥ 15) ; pour 2 A permanents l’idéal est le 3 A (le 1 A déclenche)');
  const VS2 = X.verdictDisjonction(NE, '', 10, { perm: { i: 7 } }, { autres: [15] });
  ok(VS2.calibreIdeal === 10 && VS2.reserve === 'selectivite' && VS2.gamme.find(g => g.calibre === 15).selectif === false && VS2.gamme.find(g => g.calibre === 25).selectif === false,
    'pour 7 A permanents avec ce voisin de 15 A, aucun calibre avec marge n’est à 2:1 (le 10 et le 15 sont trop près, le 25 ne le double pas) : l’idéal reste celui de la charge (10 A), réserve « sélectivité »');
  // la gamme du lecteur ne propose plus le 2,5 A : un part number qui le porte reste jugé, et montré
  const VG = X.verdictDisjonction(NE, '', 2.5, { perm: { i: 2 } });
  ok(VG.gamme.map(g => g.calibre).join() === '1,2.5,3,5,7.5,10,15,20,25' && VG.calibre === 2.5 && VG.gamme.find(g => g.calibre === 2.5).catalogue === false, 'un calibre hors de la gamme proposée (2,5 A, un part number) entre dans la gamme jugée, hors catalogue');
  // R2 règles 2 à 5 et 13 : la gamme de la famille, ce que le disjoncteur garantit, le meilleur calibre avec ses fils
  const MS = X.familleDuPn('MS3320-10', NE), H = X.HYPOTHESES, TOUT = { calibresPreferes: [] };
  ok(X.HYPOTHESES.calibresPreferes.join() === '1,3,5,7.5,10,15,20,25' && X.CALIBRES.join() === '1,3,5,7.5,10,15,20,25'
    && X.calibresDeLaFamille(MS, H).join() === '1,3,5,7.5,10,15,20' && X.calibresDeLaFamille(MS, TOUT).join() === '0.5,0.75,1,1.5,2,2.5,3,4,5,7.5,10,15,20' && X.calibresDeLaFamille(null, H).join() === X.CALIBRES.join()
    && X.calibresDeLaFamille(X.familleDuPn('EN3773-001-10', NE), H).join() === '1,3,5,7.5,10,15,20,25' && X.calibresDeLaFamille(X.familleDuPn('EN3773-001-10', NE), TOUT).join() === '1,1.5,2,2.5,3,4,5,7.5,10,15,20,25'
    && X.calibresDeLaFamille(X.familleDuPn('MS14105-35', NE), H).join() === '15,20,25,30,35' && X.calibresDeLaFamille(MS, { calibresPreferes: [1, 3, 5, 7.5, 10, 15, 25] }).join() === '1,3,5,7.5,10,15',
    'la gamme : le lecteur pose 1, 3, 5, 7,5, 10, 15, 20, 25 A (« 0,5, 0,75 n’existent pas ») — elle filtre le catalogue de la famille du part number (MS3320 : ½ à 20 A, table Familles et feuille MS3320N — pas de 25 A ; une plage, EN 3773 « 1 à 25 », prend la série d’aéronef), au-delà de 25 A la famille garde les siens (MS14105 : 30, 35 A) ; vide, tout le catalogue ; sans famille, la gamme du lecteur');
  // la sélectivité ne fait pas sauter le voisin : sous un 5 A, 1,5 A de charge garde son 3 A (le 2,5 A, à 2:1, n’est plus proposé), jamais le 10 A
  const V26 = X.verdictDisjonction(NE, '', 3, { perm: { i: 1.5 } }, { famille: MS, pn: 'MS3320-3', autres: [5] }), V25 = X.verdictDisjonction(NE, '', 5, { perm: { i: 2 } }, { famille: MS, pn: 'MS3320-5', autres: [3] });
  ok(V26.calibreIdeal === 3 && V26.reserve === 'selectivite' && V26.gamme.find(g => g.calibre === 10).selectif === true && V25.calibreIdeal === 3 && V25.reserve === 'selectivite' && V25.meilleur.pn === 'MS3320-3' && V25.gamme.find(g => g.calibre === 7.5).selectif === true,
    '206CB6 et 205CB5 du contrat inventé : l’aval (1,5 A sous un 5 A) garde son 3 A, réserve « sélectivité » ; l’amont (2 A au-dessus d’un 3 A) aussi : le 3 A, le plus petit qui ne disjoncte pas — la sélectivité se dit, elle ne fait plus monter le calibre (v80 : « 7,5 A ne disjoncte pas, pourquoi 10 A retenu ? »)');
  const T125 = X.tenueGarantie(NE, MS, 'ETA483', 125), T70 = X.tenueGarantie(NE, MS, 'ETA483', 73), T2TC = X.tenueGarantie(NE, X.familleDuPn('2TC7-20', NE), '2TC', 121), TE = X.tenueGarantie(NE, null, 'ETA483', 125);
  ok(T125.tient === 0.8 && T125.horsPlage && Math.abs(T70.tient - (1.15 + (73 - 25) / 96 * (0.80 - 1.15))) < 1e-9 && T70.interpolee && T2TC.tient === 0.85 && TE.tient === 0.93,
    'ce que le disjoncteur garantit de tenir (table Calibration) : MS3320N 0,80 In à 121 °C (et au-delà) ; à 73 °C, interpolé entre 25 °C (1,15) et 121 °C : 0,975 ; Klixon 2TC 0,85 In à 121 °C ; sans famille, la courbe ETA483 lue (0,93)', [T125.tient, T70.tient, T2TC.tient, TE.tient].join(' '));
  const P92 = X.verdictDisjonction(NE, '', 10, { perm: { i: 8.5 } }, { famille: MS });
  ok(!P92.valide && Math.abs(P92.points[0].marges[0].admis - 8) < 1e-9 && P92.points[0].marges[0].garanti === 8 && P92.calibreIdeal === 15,
    'un MS3320-10 au tableau à 125 °C ne garantit que 8 A : 8,5 A permanents (sous les 9,24 A de la courbe typique) ne sont plus sûrs — R2 règle 4 ; le meilleur passe au 15 A');
  const FIL3 = FILS.map(f => ({ ...f })), M10 = X.verdictDisjonction(NE, '', 10, PROFIL, { famille: MS, pn: 'MS3320-10', fils: FIL3, hyp: { conditions: ['faisceau'], marge: 10, margeTemps: 75 } }).meilleur, M0 = X.verdictDisjonction(NE, '', 10, PROFIL, { famille: MS, pn: 'MS3320-10', fils: FIL3, hyp: { conditions: ['faisceau'], marge: 0 } }).meilleur;
  ok(JSON.stringify(M10) === JSON.stringify(M0) && M10.calibre === 10 && M10.marge.courant === 0 && M10.marge.garanti === 8 && !M10.serre,
    'les hypothèses « marge 10 % » et « 75 % du temps » d’autrefois ne changent plus rien (v80) : le meilleur de 102CB1 reste le 10 A (MS3320-10), qui garantit 8 A au tableau à 125 °C', M10.pourquoi);
  ok(M0.calibre === 10 && M0.pn === 'MS3320-10' && M0.filsAChanger.map(x => x.cable + '→' + x.propose).join() === 'W-012→DR16,W-015→DR16' && M0.filsAChanger.every(x => x.masseProposee === 14.61) && /ne porte pas démarrage et transition 9,31 A/.test(M0.filsAChanger[0].raison) && M0.contactsTouches.map(x => x.propose).join() === '16,16',
    'sans marge (le profil sort du bilan au pire cas) : 10 A, W-012 et W-015 en DR16 (14,6 g/m), le DR16 W-011 suit déjà — « 10 A avec les trois fils en DR16 » de R2 ; jamais un calibre plus gros pour sauver un fil', M0.pourquoi);
  ok(X.pnAvecCalibre('MS3320-10', MS, 7.5) === 'MS3320-7-1/2' && X.pnAvecCalibre('EN2995-001-7,5', X.familleDuPn('EN2995-001-7,5', NE), 10) === 'EN2995-001-10' && X.pnAvecCalibre('483-G533-J1M1-B2S0ZN-5A', X.familleDuPn('483-G533-J1M1-B2S0ZN-5A', NE), 2.5) === '483-G533-J1M1-B2S0ZN-2-1/2A' && X.pnAvecCalibre('', MS, 15) === 'MS3320-15',
    'le part number du meilleur se construit sur celui du plan : MS3320-10 → MS3320-7-1/2 (les fractions des feuilles MS), EN2995-001-7,5 → EN2995-001-10, sans part number le motif de la famille');
  // R2 règle 5 : entre deux courbes, la tenue s'interpole en température
  const C71 = X.courbesDeDisjonction(NE, '', { tableauMin: -55, tableauMax: 71 }), c71 = C71[0], w = (71 - 23) / (125 - 23);
  ok(c71.interpolee && c71.temperature === 71 && c71.nom === '71 °C' && Math.abs(c71.points[0].m - (C[1].points[0].m + w * (C[0].points[0].m - C[1].points[0].m))) < 1e-9 && X.tempsDeDeclenchement(c71, 1.2) > X.tempsDeDeclenchement(c125, 1.2) && X.tempsDeDeclenchement(c71, 1.2) < X.tempsDeDeclenchement(C[1], 1.2),
    'un tableau à 71 °C : la courbe qui juge est interpolée entre le 23 °C le plus rapide et le 125 °C (premier multiple 0,99 In), plus lente que celle de 125 °C, plus rapide que celle de 23 °C', c71.nom + ' ' + c71.points[0].m.toFixed(3));
  // R2 règle 11 : un état qui survient en service trouve le bilame chaud
  const PC = { perm: { i: 6 }, plus: [{ nom: 'pointe', i: 12, t: 3 }] }, VC = X.verdictDisjonction(NE, '', 10, PC), VF0 = X.verdictDisjonction(NE, '', 10, PC, { hyp: { prechauffage: 1 } }), pc = VC.points.find(p => p.i === 12), pf = VF0.points.find(p => p.i === 12);
  ok(Math.abs(VC.chauffe - 1.6) < 1e-9 && Math.abs(pc.marges[0].temps - pf.marges[0].temps / 1.6) < 1e-9 && Math.abs(VC.somme - 1.6 * VF0.somme) < 1e-9 && VF0.chauffe === 1,
    'le préchauffage (MS3320N table VII, ÷ 1,6 au moins) : une pointe de 12 A en service sur un 10 A chargé à 60 % déclenche 1,6 fois plus vite ; l’hypothèse à 1 l’ôte', pc.marges[0].temps.toFixed(2) + ' s contre ' + pf.marges[0].temps.toFixed(2) + ' s');
  // le dessin échantillonne la fonction du moteur : entre deux points lus, le temps est bien l'interpolation log-log
  const a = c125.points[20], b = c125.points[21], m = Math.sqrt(a.m * b.m), t = X.tempsDeDeclenchement(c125, m);
  ok(Math.abs(Math.log(t) - (Math.log(a.t) + Math.log(b.t)) / 2) < 1e-9, 'entre deux points, le moteur interpole en log-log (la moyenne géométrique des temps au milieu géométrique des multiples)');
  ok(X.tempsDeDeclenchement(c125, c125.points[0].m * 0.999) === Infinity && isFinite(X.tempsDeDeclenchement(c125, 200)) && X.tempsDeDeclenchement(c125, 200) < c125.points[c125.points.length - 1].t, 'sous le premier multiple jamais ; au-delà du dernier, la pente continue'); }

const { chromium } = require('playwright');
const P = require('./pilote');
/* LE SYMBOLE CAS PAR CAS, dans la page : des blocs fabriqués (l'emprise d'un équipement, 144 × h, ses bornes [étiquette,
   flanc, hauteur]) passés à `blocSvg`, rendus dans un SVG de la page pour mesurer les textes (getBBox) ; et les pôles. */
function symboleCasParCasDansLaPage() {
  const bloc = (name, h, bornes) => { const c = { name, kind: 'equip', x: 0, y: 0, w: 144, h, lw: 20, rw: 20, rangs: { L: [], R: [] } };
    bornes.forEach(([etiq, f, y]) => c.rangs[f].push({ etiq, y, dir: f === 'L' ? -1 : 1 })); c.rangs.L.sort((u, v) => u.y - v.y); c.rangs.R.sort((u, v) => u.y - v.y); return c; };
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'); svg.setAttribute('width', '600'); svg.setAttribute('height', '400');
  svg.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden'; document.body.appendChild(svg);
  const lire = (c, calibre) => { svg.innerHTML = styleDessin() + blocSvg(c, '', false, null, calibre === undefined ? { calibre: 10 } : { calibre }); const g = svg.querySelector('.comp');
    const num = (e, a) => +e.getAttribute(a), bornes = [...g.querySelectorAll('.cb-borne')].map(e => ({ x: num(e, 'cx'), y: num(e, 'cy') }));
    const arcs = [...g.querySelectorAll('.cb-arc')].map(e => { const b = e.getBBox(), m = /^M([\d.\-]+) ([\d.\-]+) A[\d.\-]+ [\d.\-]+ 0 0 [01] ([\d.\-]+) ([\d.\-]+)$/.exec(e.getAttribute('d')); return { x0: b.x, x1: b.x + b.width, y0: b.y, y1: b.y + b.height, de: m && [+m[1], +m[2]], a: m && [+m[3], +m[4]] }; });
    const textes = [...g.querySelectorAll('text')].map(t => { const b = t.getBBox(); return { t: t.textContent, cls: t.getAttribute('class'), x0: b.x, y0: b.y, x1: b.x + b.width, y1: b.y + b.height }; });
    const X0 = c.lw - CONN_W, X1 = c.w - c.rw + CONN_W, dedans = textes.every(t => t.x0 >= X0 - 0.5 && t.x1 <= X1 + 0.5 && t.y0 >= -0.5 && t.y1 <= c.h + 0.5);
    // (la boîte d'un texte est sa ligne entière, montante et descendante comprises : deux lignes qui se suivent s'y recouvrent d'une
    // unité sans que les lettres se touchent — on tolère 1,5 unité, comme tests/controle.js)
    let chev = 0; for (let i = 0; i < textes.length; i++) for (let j = i + 1; j < textes.length; j++) { const a = textes[i], b = textes[j]; if (a.x1 > b.x0 && a.x0 < b.x1 && a.y1 > b.y0 + 1.5 && a.y0 < b.y1 - 1.5) chev++; }
    return { boite: !!g.querySelector('rect.body'), bornes, arcs, bouton: g.querySelectorAll('.cb-bouton').length, lien: g.querySelectorAll('.cb-lien').length, droites: g.querySelectorAll('line.lead').length, coudes: g.querySelectorAll('path.lead').length,
      cal: (g.querySelector('.cb-cal') || {}).textContent || '', rep: (g.querySelector('.rep-big') || {}).textContent || '', dedans, chev, textes: textes.map(t => t.t) }; };
  const R = {
    deboutDroite: lire(bloc('102CB1', 50, [['1', 'R', 18], ['2', 'R', 32]])),
    deboutGauche: lire(bloc('102CB1', 50, [['1', 'L', 18], ['2', 'L', 32]])),
    coucheAligne: lire(bloc('702CB1', 46, [['1', 'L', 23], ['2', 'R', 23]]), 7.5),
    coucheCoude: lire(bloc('705CB2', 64, [['1', 'L', 18], ['2', 'R', 46]]), 5),
    deboutEcarte: lire(bloc('511CB1', 92, [['1', 'R', 18], ['2', 'R', 74]]), 15),
    uneBorne: lire(bloc('701CB8', 46, [['1', 'R', 23]]), null),
    unDeuxTrois: lire(bloc('201CB6', 64, [['1', 'R', 18], ['2', 'R', 32], ['3', 'R', 46]]), null),
    triCouche: lire(bloc('802CB1', 92, [['A1', 'L', 18], ['B1', 'L', 46], ['C1', 'L', 74], ['A2', 'R', 18], ['B2', 'R', 46], ['C2', 'R', 74]])),
    triDebout: lire(bloc('802CB1', 106, [['1', 'R', 18], ['2', 'R', 32], ['3', 'R', 46], ['4', 'R', 60], ['5', 'R', 74], ['6', 'R', 88]])),
    deuxFlancs: lire(bloc('804CB3', 46, [['1', 'L', 23], ['1', 'R', 23]])) };
  svg.remove();
  const poles = (...etiqs) => polesDuDisjoncteur(etiqs.map((etiq, i) => ({ etiq, y: 18 + 14 * i }))).map(P => P.p.etiq + (P.q ? '/' + P.q.etiq : '')).join(' ');
  R.poles = { lettres: poles('A1', 'A2', 'B1', 'B2', 'C1', 'C2'), nombres: poles('1', '2', '3', '4', '5', '6'), lt: poles('L1', 'T1', 'L2', 'T2'), ligne: poles('LINE', 'LOAD'), trois: poles('1', '2', '3') };
  return R; }
const FICHIER = P.fichierDemande();
/* L'ÉCRAN (réécrit le 10 novembre 2026 pour le disjoncteur d'aujourd'hui — la charte : « un disjoncteur, c'est mathématique :
   valide ou pas valide, point » ; « le calibre écrit vient du fichier » ; « le disjoncteur se lit vivant »). Les anciens
   contrôles (le cadran, « À la main », la marge de 10 %, « touche la courbe ») jugeaient un écran qui n'existe plus. */
(async () => {
  console.log('\nL’ÉCRAN');
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await nav.newPage({ viewport: { width: 1600, height: 950 } }); page.setDefaultTimeout(120000);
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined'); await page.evaluate(() => atelier.exemple()); await page.waitForTimeout(600);
  const net = s => String(s || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
  const choisir = async () => { await page.evaluate(() => { if (typeof fermerFiche === 'function') fermerFiche(true); allerAuPlan('1'); choisirBloc(app.dessin.comps.find(k => k.name === '102CB1' && k.kind !== 'tag')); }); await page.waitForTimeout(500); };
  // la fiche en grand, sur l'onglet Calibre
  const calibre = async () => { await choisir(); if (!await page.evaluate(() => document.body.classList.contains('insp-grand'))) { await page.click('#fi-tout-voir'); await page.waitForTimeout(600); } await page.click('#nv-o-calibre'); await page.waitForTimeout(600); };
  await choisir();
  // LE FOLIO : 102CB1 a sa forme, pas la boîte d'un équipement — aux ports d'un équipement, choisi à l'encre
  const folioCb = () => page.evaluate(() => { const c = app.dessin.comps.find(k => k.name === '102CB1' && k.kind !== 'tag'), g = document.querySelector('#scene .comp[data-name="102CB1"]'), t = cls => [...g.querySelectorAll('text.' + cls)].map(e => e.textContent.replace(/ /g, ' '));
    const ports = [...(c.rangs.L || []).map(p => [0, p.y - c.y]), ...(c.rangs.R || []).map(p => [c.w, p.y - c.y])];
    const bouts = [...g.querySelectorAll('.lead')].map(l => l.tagName === 'line' ? [+l.getAttribute('x1'), +l.getAttribute('y1')] : (m => [+m[1], +m[2]])(/^M([\d.\-]+) ([\d.\-]+)/.exec(l.getAttribute('d'))));
    const sel = g.querySelector('.selbox'), rvb = sel ? (getComputedStyle(sel).stroke.match(/\d+/g) || []).map(Number) : [];
    return { boite: !!g.querySelector('rect.body'), conn: !!g.querySelector('.conn'), bornes: g.querySelectorAll('.cb-borne').length, arcs: g.querySelectorAll('.cb-arc').length, bouton: g.querySelectorAll('.cb-bouton').length, rep: t('rep-big'), cal: t('cb-cal'),
      ports: bouts.length === ports.length && ports.every(p => bouts.some(b => Math.abs(b[0] - p[0]) < 0.06 && Math.abs(b[1] - p[1]) < 0.06)), largeur: c.w, encre: rvb.length >= 3 && Math.max(...rvb.slice(0, 3)) < 70 && Math.max(...rvb.slice(0, 3)) - Math.min(...rvb.slice(0, 3)) < 12 }; });
  const F1 = await folioCb();
  ok(!F1.boite && !F1.conn && F1.bornes === 2 && F1.arcs === 1 && F1.bouton === 1 && F1.rep.join() === '102CB1' && F1.cal.join() === '10 A' && F1.ports && F1.largeur === 144 && F1.encre,
    'le folio : 102CB1 n’est pas une boîte (ni corps, ni pièce de connecteur) mais deux bornes, l’arc et le bouton en T, son repère et « 10 A » (celui de votre fichier : le plus petit qui ne disjoncte pas) ; chaque amenée part d’un port d’équipement (x = 0 ou 144, à la hauteur de sa borne) ; choisi, il est encadré à l’encre', JSON.stringify(F1));

  // LA CARTE : le genre se reconnaît (silhouette, « Disjoncteur »), la frise des calibres, trois chiffres — sans défiler
  const K = await page.evaluate(() => { const f = document.getElementById('ba-equip'), t = s => { const e = f.querySelector(s); return e ? e.textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim() : null; }, I = document.getElementById('inspecteur');
    return { genre: t('.nc-genre-mot'), rep: t('.nc-rep-t'), pn: t('.nc-meta-v .id'), silhouette: !!f.querySelector('.nc-sceau svg.silhouette.sl-disjoncteur'),
      frise: [...f.querySelectorAll('.dj-frise .vu-c')].map(x => ({ c: x.querySelector('b').textContent.replace(/\s*A\s*$/, '').trim(), k: ['oui', 'non', 'hors'].find(k => x.classList.contains(k)), ret: x.classList.contains('ret'), mot: x.querySelector(':scope > small').textContent.trim(), bulle: (x.dataset.bulle || '').replace(/[  ]/g, ' ') })),
      legende: [...f.querySelectorAll('.dj-frise .vu-legende > span')].map(x => x.textContent.trim()), chiffres: [...f.querySelectorAll('.nc-chiffres .nc-chiffre')].map(x => x.querySelector('.nc-k').textContent.trim() + ' ' + x.querySelector('.nc-v').textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim()),
      defile: [f, f.querySelector('.nc')].map(e => e.scrollHeight - e.clientHeight), bas: Math.round(I.getBoundingClientRect().bottom), h: innerHeight }; });
  ok(K.genre === 'Disjoncteur' && K.rep === '102CB1' && K.pn === 'MS3320-10' && K.silhouette, 'la carte : la silhouette du disjoncteur, « Disjoncteur », 102CB1, sa référence MS3320-10', JSON.stringify([K.genre, K.rep, K.pn, K.silhouette]));
  ok(K.frise.map(x => x.c + ':' + x.k).join(' ') === '1:non 3:non 5:non 7,5:non 10:oui 15:oui 20:oui 25:hors' && K.frise.filter(x => x.ret).map(x => x.c + ' ' + x.mot).join() === '10 retenu'
    && K.frise.filter(x => x.k !== 'hors').every(x => new RegExp('^' + x.c + ' A : il ' + (x.k === 'oui' ? 'ne disjoncte pas' : 'disjoncte') + '\\.').test(x.bulle) && /il tire [\d,]+ A/.test(x.bulle)) && /^Pas de MS3320 en 25 A/.test(K.frise[7].bulle)
    && K.legende.join() === 'ne disjoncte pas,disjoncte,pas en MS3320',
    'la frise des calibres : 1 à 7,5 A disjonctent, 10, 15 et 20 A ne disjonctent pas, le 10 « retenu » (le plus petit qui ne disjoncte pas) ; chaque bulle s’explique en ampères (« il tire… ») ; le 25 A n’existe pas en MS3320 ; la légende en trois mots', K.frise.map(x => x.c + ':' + x.k).join(' ') + ' | ' + K.legende.join());
  ok(K.chiffres.join(' · ').replace(/(\d)A/g, '$1 A') === 'Calibre 10 A · Permanent 5 A · Démarrage 9,31 A', 'trois chiffres clés : le calibre, le permanent, le démarrage — en ampères', K.chiffres.join(' · '));
  ok(K.defile.every(d => d <= 1) && K.bas <= K.h, 'la carte tient sans défiler, sa hauteur suit son contenu', JSON.stringify([K.defile, K.bas, K.h]));

  // LE CALIBRE, en grand : des onglets égaux, L'essentiel d'abord ; « Calibre » : la gamme, le profil, la conclusion, la courbe
  await page.click('#fi-tout-voir'); await page.waitForTimeout(600);
  const O = await page.evaluate(() => { const os = [...document.querySelectorAll('#ba-equip .nv-onglet')].filter(o => o.getBoundingClientRect().width > 0); return { noms: os.map(o => o.id.replace('nv-o-', '')), l: os.map(o => Math.round(o.getBoundingClientRect().width)), choisi: (os.find(o => o.getAttribute('aria-selected') === 'true') || {}).id, grand: document.body.classList.contains('insp-grand') }; });
  ok(O.grand && O.choisi === 'nv-o-essentiel' && O.noms.includes('calibre') && Math.max(...O.l) - Math.min(...O.l) <= 1, '« Tout voir » : la fiche en grand s’ouvre sur L’essentiel ; ses onglets (dont « Calibre ») ont tous la même largeur', JSON.stringify(O));
  await page.click('#nv-o-calibre'); await page.waitForTimeout(600);
  const G = await page.evaluate(() => { const p = document.getElementById('nv-p-calibre'), n = s => String(s || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim(), d = disjonctionDe('102CB1');
    const cals = [...p.querySelectorAll('.vu-cal')].map(x => ({ cal: x.dataset.cal, k: ['oui', 'non', 'hors'].find(k => x.classList.contains(k)), on: x.classList.contains('on'), mot: n(x.querySelector(':scope > small').textContent), bulle: n(x.dataset.bulle) }));
    const g = c => d.gamme.find(x => String(x.calibre) === c), pg = p.querySelector('.dj-pc-g').getBoundingClientRect(), pd = p.querySelector('.dj-pc-d').getBoundingClientRect(), co = p.querySelector('.dj-concl');
    return { titre: n(p.querySelector('.vu-bloc-cal .vu-titre').textContent), cals, moteur: cals.filter(x => x.cal).every(x => g(x.cal) && (x.k === 'oui') === !!g(x.cal).valide), petit: Math.min(...d.gamme.filter(x => x.valide && x.catalogue).map(x => x.calibre)), retenu: d.calibre,
      concl: { ok: co.classList.contains('ok'), t: n(co.querySelector('.dj-concl-t').textContent), d: n(co.querySelector('.dj-concl-d').textContent), bulle: n(co.querySelector('.dj-concl-d').dataset.bulle) },
      cote: pg.right <= pd.left + 2 && Math.abs(pg.top - pd.top) < 40, entete: [...p.querySelectorAll('.dj-entete > span')].map(x => n(x.textContent)).filter(Boolean), etats: [...p.querySelectorAll('.dj-etat')].map(e => n(e.querySelector('.dj-nom').textContent) + (e.querySelector('.dj-x') ? ' ×' : '') + (e.querySelector('.dj-inf') ? ' ∞' : '')),
      champs: [...p.querySelectorAll('.dj-champ input')].map(i => i.dataset.dj + '.' + i.dataset.q + '=' + i.value), plus: n((p.querySelector('#dj-plus') || {}).textContent),
      texte: n(p.innerText) + ' ' + [...p.querySelectorAll('[data-bulle]')].map(x => n(x.dataset.bulle)).join(' '), main: !!p.querySelector('.dj-main, #dj-retenir, .dj-cadran, .dj-heros') }; });
  ok(G.titre === 'Le calibre celui de votre fichier : il ne disjoncte pas' && G.cals.map(x => (x.cal || '—') + ':' + x.k).join(' ') === '1:non 3:non 5:non 7.5:non 10:oui 15:oui 20:oui —:hors' && G.cals.filter(x => x.on).map(x => x.cal + ' ' + x.mot).join() === '10 fichier' && G.moteur && G.petit === 10 && G.retenu === 10,
    '« Le calibre — celui de votre fichier : il ne disjoncte pas » ; la gamme MS3320 de 1 à 20 A, chaque calibre du côté que dit le moteur ; le retenu est le plus petit qui ne disjoncte pas (10 A), marqué « fichier »', G.titre + ' | ' + G.cals.map(x => (x.cal || '—') + ':' + x.k).join(' '));
  const b75 = (G.cals.find(x => x.cal === '7.5') || {}).bulle, b10 = (G.cals.find(x => x.cal === '10') || {}).bulle;
  ok(/^7,5 A : il disjoncte\. Au démarrage et en transition, il tire 9,31 A pendant 2,1 min ; sur 2,1 min, un 7,5 A disjoncte dès 7,24 A : il disjoncte\.$/.test(b75) && /^10 A : il ne disjoncte pas\. Au démarrage et en transition, il tire 9,31 A pendant 2,1 min ; sur 2,1 min, un 10 A ne disjoncte qu’au-delà de 9,66 A : il ne disjoncte pas\. C’est le calibre retenu\.$/.test(b10),
    'chaque calibre s’explique en ampères : ce qu’il tire, pendant combien de temps, le seuil où ce calibre disjoncte sur cette durée (7,5 A : dès 7,24 A sur 2,1 min ; 10 A : au-delà de 9,66 A)', b75 + ' | ' + b10);
  ok(G.concl.ok && G.concl.t === '10 A : il ne disjoncte pas.' && G.concl.d === 'Au démarrage et en transition, il tire 9,31 A pendant 2,1 min ; ce calibre ne disjoncte qu’au-delà de 9,66 A sur cette durée.' && /courbe 125 °C/.test(G.concl.bulle),
    'la conclusion d’abord, en ampères : « 10 A : il ne disjoncte pas. » — ce qu’il tire, pendant combien de temps, le seuil ; d’où vient le seuil (la courbe 125 °C) au survol', JSON.stringify(G.concl));
  ok(!/\bmarges?\b|10 %|trop juste|\btouche|réserve|\btient\b|\bpasse\b|déclenche\b/i.test(G.texte) && !G.main,
    'valide ou pas valide, point : ni marge, ni « 10 % », ni « trop juste », ni « touche la courbe », ni « tient », ni « passe » dans l’onglet (textes et bulles) ; plus de cadran ni de « À la main »', (G.texte.match(/.{0,30}(\bmarges?\b|10 %|trop juste|\btouche|réserve|\btient\b|\bpasse\b|déclenche\b).{0,30}/i) || [''])[0]);
  ok(G.entete.join() === 'État,Courant A,Durée s' && G.etats.join() === 'Démarrage ×,Transition ×,Permanent × ∞' && G.champs.join() === 'dem.i=9,31,dem.t=5,trans.i=9,31,trans.t=120,perm.i=5' && G.plus === 'Ajouter un état' && G.cote,
    'le profil de charge en TABLEAU (état, courant, durée sur une ligne) : démarrage, transition, puis le permanent (pour toujours, sans durée), cinq champs, chaque état son ×, « Ajouter un état » ; il s’écrit à côté de la courbe', JSON.stringify([G.entete, G.etats, G.champs, G.plus, G.cote]));

  const F = '#ba-equip ';
  const voir = async sel => { await page.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }); }, sel); await page.waitForTimeout(150); const b = await page.locator(sel).first().boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const tip = () => page.evaluate(() => { const t = document.querySelector('#ba-equip .dj-tip'); return t && !t.hidden ? t.textContent.replace(/[  ]/g, ' ') : ''; });
  // LA COURBE, comme une fiche de constructeur : les quatre courbes de vos tables, toujours ; dessinée à sa largeur
  const C1 = await page.evaluate(() => { const fig = document.querySelector('#ba-equip .dj-graphe'), svg = fig.querySelector('svg'), t = [...svg.querySelectorAll('text')].map(x => x.textContent.replace(/ /g, ' ')), cs = [...svg.querySelectorAll('.dj-courbe')], mots = s => [...svg.querySelectorAll(s)].map(x => x.textContent.replace(/ /g, ' '));
    const R = svg.querySelector('.dj-cadre').getBoundingClientRect(), dehors = [...svg.querySelectorAll('line, path')].filter(p => !p.closest('.dj-prof, .dj-vise') && !p.closest('[clip-path]') && !p.matches('.dj-tic-in')).filter(p => { const r = p.getBoundingClientRect(); return r.width + r.height > 0 && (r.top < R.top - 1 || r.bottom > R.bottom + 1 || r.left < R.left - 1 || r.right > R.right + 1); });
    return { clair: fig.classList.contains('ilot-clair'), largeur: Math.abs(svg.getBoundingClientRect().width - fig.clientWidth) <= 1, courbes: cs.map(x => x.classList.contains('bord') ? 'b' : 'm').join(''),
      vieux: !!svg.querySelector('.dj-bord, .dj-voisin, .dj-dommage, .dj-tic-nom, text.dj-calibre'), fonds: !!svg.querySelector('.dj-bande') && !!svg.querySelector('.dj-fond.sur') && !!svg.querySelector('.dj-fond.declenche'), temp: ['125 °C', '23 °C', '−55 °C'].every(m => mots('text.dj-t').includes(m)),
      zones: mots('text.dj-zone.sur').join() + ' / ' + mots('text.dj-zone.declenche').join(), dehors: dehors.length, points: svg.querySelectorAll('.dj-pt').length, escalier: [...svg.querySelectorAll('.dj-escalier')].map(x => x.getAttribute('class').replace('dj-escalier', '').trim()).join(),
      grad: ['0,1', '1', '10', '0,01 s', '0,1 s', '1 s', '10 s', '100 s', '1 000 s', '10 000 s', 'Temps de déclenchement', 'Multiples du courant nominal (In)'].every(m => t.includes(m)), ampere: t.some(m => /\d\s?k?A$/.test(m)), noms: t.includes('permanent') && t.some(x => /^démarrage et/.test(x)),
      papier: getComputedStyle(fig).backgroundColor, filets: [...svg.querySelectorAll('.dj-filet.fin')].reduce((n, p) => n + p.getAttribute('d').split('M').length - 1, 0) }; });
  ok(C1.clair && C1.largeur && C1.courbes === 'bmmb' && !C1.vieux && C1.fonds && C1.temp && C1.zones === 'ne disjoncte pas / disjoncte' && !C1.dehors && C1.points === 2 && C1.escalier === 'ok,ok' && C1.grad && !C1.ampere && C1.noms && C1.papier === 'rgb(255, 255, 255)' && C1.filets >= 6 * 8 + 3 * 8,
    'le graphique sur papier blanc, à sa largeur : les QUATRE courbes de vos tables, chaque température nommée, aucun trait hors du cadre ; l’abscisse en MULTIPLES DE In, aucun ampère ; deux zones nommées — « ne disjoncte pas », « disjoncte » — ; le profil en escalier, ses deux marches du bon côté', JSON.stringify(C1));
  // chaque zone nommée de son côté : « ne disjoncte pas » tout entier à gauche de la courbe la plus rapide, « disjoncte » à droite de la plus lente
  ok(await page.evaluate(() => { const svg = document.querySelector('#ba-equip .dj-graphe svg'), cs = [...svg.querySelectorAll('.dj-courbe')], dx = +svg.querySelector('.dj-cal').dataset.glisse;
    // en unités du dessin : les courbes sont dessinées au calibre 1 A, décalées de log10(calibre) décades (`data-glisse`)
    const xs = (p, y0, y1) => { const out = [], L = p.getTotalLength(); for (let s = 0; s <= L; s += 1) { const q = p.getPointAtLength(s); if (q.y >= y0 && q.y <= y1) out.push(q.x + dx); } return out; };
    const cote = (sel, p, gauche) => { const b = svg.querySelector(sel).getBBox(), x = xs(p, b.y, b.y + b.height); return !!x.length && (gauche ? b.x + b.width < Math.min(...x) : b.x > Math.max(...x)); };
    return cote('text.dj-zone.sur', cs[0], true) && cote('text.dj-zone.declenche', cs[cs.length - 1], false); }), 'chaque zone nommée de son côté : « ne disjoncte pas » à gauche de la courbe la plus rapide, « disjoncte » à droite de la plus lente');
  // plus de bascules : la vue passée à `grapheSvg` ne choisit plus rien (une vue d'hier rend le même dessin)
  ok(await page.evaluate(() => { const d = disjonctionDe('102CB1'), net = s => s.replace(/dj-clip-\d+/g, ''); return Object.isFrozen(DJ_VUE) && net(grapheSvg(d, { comparer: true, temperatures: false }, 400)) === net(grapheSvg(d, DJ_VUE, 400)) && !/dj-voisin/.test(grapheSvg(d, { comparer: true }, 400)); }),
    'rien à basculer : une vue d’hier (« comparer », « une seule bande ») rend le même dessin — les quatre températures, aucun calibre voisin');
  const lisse = () => page.evaluate(() => { const svg = document.querySelector('#ba-equip .dj-graphe svg'), cadre = svg.querySelector('.dj-cadre'), T = +cadre.getAttribute('y'), Bas = T + +cadre.getAttribute('height');
    return [...svg.querySelectorAll('.dj-courbe')].map(p => { const L = p.getTotalLength(), pts = []; for (let s = 0; s <= L; s += 2) { const q = p.getPointAtLength(s); if (q.y > T + 1 && q.y < Bas - 1) pts.push(q); }
      // tous les 2 pixels, de combien la direction tourne (`tour`) ; une CASSURE est un tour qu'aucun voisin ne prépare (le tour d'un pas,
      // moins le plus grand de ses deux voisins) — un coude lisse tourne peu à peu, une cassure d'un coup ; une INFLEXION, un tour qui
      // change de sens (la courbe d'un bilame tourne toujours du même côté : convexe)
      const d = []; for (let k = 2; k < pts.length; k++) { const a = Math.atan2(pts[k - 1].y - pts[k - 2].y, pts[k - 1].x - pts[k - 2].x), b = Math.atan2(pts[k].y - pts[k - 1].y, pts[k].x - pts[k - 1].x); d.push((b - a) * 180 / Math.PI); }
      let tour = 0, cassure = 0, recul = 0, inflexions = 0, sens = 0; d.forEach((x, k) => { tour = Math.max(tour, Math.abs(x)); cassure = Math.max(cassure, Math.abs(x) - Math.max(Math.abs(d[k - 1] || 0), Math.abs(d[k + 1] || 0)));
        if (Math.abs(x) > 0.05) { const s = Math.sign(x); if (sens && s !== sens) inflexions++; sens = s; } });
      for (let k = 1; k < pts.length; k++) recul = Math.max(recul, pts[k - 1].x - pts[k].x, pts[k - 1].y - pts[k].y);
      return { tour, cassure, recul, inflexions, n: pts.length }; }); });
  const L1 = await lisse();
  ok(L1.length === 4 && L1.every(x => x.n > 60 && x.tour < 8 && x.cassure < 1 && x.recul < 0.05 && x.inflexions === 0), 'les quatre courbes sont LISSES, MONOTONES et CONVEXES : tous les 2 pixels la direction tourne peu à peu (moins de 8°), jamais d’un coup (aucune cassure de plus de 1°), toujours du même côté (aucune inflexion), et la courbe ne revient jamais en arrière',
    L1.map(x => x.n + ' pts ' + x.tour.toFixed(1) + '° / ' + x.cassure.toFixed(2) + '° / ' + x.inflexions + ' / ' + x.recul.toFixed(2)).join(' · '));
  // le lissage, sur toutes les familles de courbes de la norme : près des points lus, monotone et convexe, près du moteur qui juge
  const LZ = await page.evaluate(() => { const vu = new Set(), out = [];
    ['ETA483', '2TC', '6TC', '7274', 'EN2495', '5TC', '3TC', '9TC'].forEach(f => courbesDeDisjonction(app.norme, f).forEach(c => { if (vu.has(c)) return; vu.add(c); const F = courbeLisse(c), P = c.points;
      let moteur = 0, mono = -Infinity, conv = Infinity; for (let u = Math.log10(Math.max(0.01, P[P.length - 1].t)); u <= Math.log10(P[0].t); u += 0.01) moteur = Math.max(moteur, Math.abs(Math.pow(10, F.val(u)) / multipleAdmis(c, Math.pow(10, u)) - 1));
      for (let u = F.u0; u < F.u1 - 0.02; u += 0.01) { mono = Math.max(mono, F.der(u)); conv = Math.min(conv, F.der(u + 0.01) - F.der(u)); }
      out.push({ nom: c.famille + ' ' + c.nom, n: c.brut.length, temps: F.ecart.temps, multiple: F.ecart.multiple, convexe: F.convexe, moteur, mono, conv }); })); return out; });
  ok(LZ.length >= 20 && LZ.every(x => x.convexe && x.temps <= 0.05 + 1e-9 && x.multiple <= 0.02 && x.mono <= 1e-6 && x.conv >= -1e-6),
    'chaque courbe de la norme (huit familles) est une spline de lissage monotone et convexe qui résume les points lus : à 5 % au plus EN TEMPS de chacun là où elle penche, à 2 % EN MULTIPLE sur l’asymptote (là, le courant se lit)',
    'pire : ' + ['temps', 'multiple'].map(k => { const x = LZ.slice().sort((a, b) => b[k] - a[k])[0]; return k + ' ' + (x[k] * 100).toFixed(1) + ' % (' + x.nom + ')'; }).join(', '));
  ok(LZ.filter(x => x.n >= 10 && !/partielle/.test(x.nom)).every(x => x.moteur < 0.04) && LZ.every(x => x.moteur < 0.075), 'le dessin lisse sans trahir le moteur (qui juge sur les points lus, en log-log entre deux) : à moins de 4 % en multiple, 7,5 % sur une courbe partielle',
    LZ.slice().sort((a, b) => b.moteur - a.moteur).slice(0, 3).map(x => x.nom + ' ' + (x.moteur * 100).toFixed(1) + ' %').join(' · '));
  ok(await page.evaluate(() => { const svg = document.querySelector('#ba-equip .dj-graphe svg'), R = svg.getBoundingClientRect(), bs = [...svg.querySelectorAll('text')].map(t => t.getBoundingClientRect()).filter(b => b.width > 0);
    let chev = 0; for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) { const a = bs[i], b = bs[j]; if (a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5) chev++; }
    return chev === 0 && bs.every(b => b.left >= R.left - 0.5 && b.right <= R.right + 0.5 && b.top >= R.top - 0.5 && b.bottom <= R.bottom + 0.5); }), 'aucune étiquette n’en chevauche une autre, toutes restent dans le dessin');

  // SURVOLER : une bulle courte, en ampères — ce qu'il tire, le seuil où le calibre disjoncte sur cette durée
  let c = await voir(F + '.dj-pt[data-k="dem"] .dj-point'); await page.mouse.move(c.x, c.y); await page.waitForTimeout(250);
  let tx = await tip(); ok(/9,31 A · 2,1 min/.test(tx) && /démarrage et transition — le 10 A à 125 °C/.test(tx) && /ne disjoncte pas — sur 2,1 min, il ne disjoncte qu’au-delà de 9,66 A/.test(tx) && !/juste|touche|marge|tient/.test(tx) && await page.evaluate(() => !!document.querySelector('#ba-equip .dj-tip-v.ok')),
    'survoler le démarrage : 9,31 A pendant 2,1 min, le 10 A à 125 °C « ne disjoncte pas — sur 2,1 min, il ne disjoncte qu’au-delà de 9,66 A »', tx);
  ok(await page.evaluate(() => { const t = document.querySelector('#ba-equip .dj-tip'), f = t.closest('.dj-graphe').getBoundingClientRect(), r = t.getBoundingClientRect(); return r.left >= f.left && r.right <= f.right + 1 && r.top >= f.top && r.bottom <= f.bottom + 1; }), 'la bulle reste dans la figure');
  c = await voir(F + '.dj-pt[data-k="perm"] .dj-point'); await page.mouse.move(c.x, c.y); await page.waitForTimeout(250); tx = await tip();
  ok(/5 A · toujours/.test(tx) && /permanent — le 10 A à 125 °C/.test(tx) && /ne disjoncte pas — en permanence, il ne disjoncte qu’au-delà de 8 A/.test(tx), 'le permanent : 5 A pour toujours ; « en permanence, il ne disjoncte qu’au-delà de 8 A »', tx);
  const g = await page.locator(F + '.dj-graphe svg').boundingBox(); await page.mouse.move(g.x + g.width * 0.86, g.y + g.height * 0.35); await page.waitForTimeout(250); tx = await tip();
  ok(/^[\d,]+ In · [\d,]+ (ms|s|min)/.test(tx) && /soit [\d,]+ A — le 10 A y disjoncte au bout de [\d,]+ (ms|s|min)/.test(tx) && await page.evaluate(() => !document.querySelector('#ba-equip .dj-vise').hidden), 'ailleurs, le réticule lit le multiple de In d’abord, la durée, puis le courant et au bout de combien de temps le 10 A y disjoncte', tx);
  await page.mouse.move(5, 5); await page.waitForTimeout(150);
  // GLISSER le point du permanent vers la droite : le courant monte, le champ suit en direct, le profil s'écrit, Ctrl+Z le rend
  c = await voir(F + '.dj-pt[data-k="perm"] .dj-point'); await page.mouse.move(c.x, c.y); await page.mouse.down(); await page.mouse.move(c.x + 20, c.y, { steps: 4 }); await page.waitForTimeout(150);
  const GL = await page.evaluate(() => ({ tient: document.querySelector('#ba-equip .dj-graphe svg').classList.contains('tient'), bulle: !document.querySelector('#ba-equip .dj-tip').hidden, champ: document.querySelector('#nv-p-calibre input[data-dj="perm"][data-q="i"]').value }));
  ok(GL.tient && GL.bulle && parseFloat(GL.champ.replace(',', '.')) > 5, 'pendant le glisser, le graphique tient le point, la bulle suit, et le champ du permanent bouge en direct', JSON.stringify(GL));
  await page.mouse.up(); await page.waitForTimeout(800);
  const lache = await page.evaluate(() => app.contrat.charges.get('102CB1').perm.i);
  ok(lache > 5 && lache < 12, 'lâché : le permanent est écrit au profil de charge', 'perm ' + lache);
  await page.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }); await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => app.contrat.charges.get('102CB1').perm.i === 5), 'Ctrl+Z rend le profil de l’exemple');

  // LE DISJONCTEUR VIVANT : écrire un courant, la conclusion et la courbe bougent en direct ; le calibre retenu suit le profil
  console.log('\nLE CALIBRE SUIT LE PROFIL');
  await calibre();
  const champ = (k, q) => page.locator(`#nv-p-calibre input[data-dj="${k}"][data-q="${q}"]`);
  await champ('perm', 'i').fill('9,5'); await page.waitForTimeout(500);
  const V1 = await page.evaluate(() => ({ concl: document.querySelector('#ba-equip .dj-concl').innerText.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim(), ok: document.querySelector('#ba-equip .dj-concl').classList.contains('ok') }));
  ok(V1.ok && /^15 A : il ne disjoncte pas\. ?En permanence, il tire 9,5 A ; ce calibre ne disjoncte qu’au-delà de 12 A\.$/.test(V1.concl), 'écrire 9,5 A en permanence : EN DIRECT, avant même de quitter le champ, la conclusion passe au 15 A — « En permanence, il tire 9,5 A ; ce calibre ne disjoncte qu’au-delà de 12 A »', V1.concl);
  await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(900);
  const V2 = await page.evaluate(() => { const n = s => String(s || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim(), p = document.getElementById('nv-p-calibre');
    return { foyer: document.activeElement && (document.activeElement.dataset.dj + '.' + document.activeElement.dataset.q), perm: app.contrat.charges.get('102CB1').perm.i, titre: n(p.querySelector('.vu-bloc-cal .vu-titre').textContent),
      cals: [...p.querySelectorAll('.vu-cal')].filter(x => x.dataset.cal).map(x => x.dataset.cal + ':' + ['oui', 'non'].find(k => x.classList.contains(k)) + (x.classList.contains('on') ? ':retenu' : '') + (x.classList.contains('fichier') ? ':fichier' : '')).join(' '),
      cal: calibreDe('102CB1'), pn: pnDuRepere('102CB1'), volta: pnDeVolta('102CB1'), folio: [...document.querySelectorAll('#scene .comp[data-name="102CB1"] text.cb-cal')].map(e => e.textContent.replace(/ /g, ' ')).join(),
      types: (disjonctionDe('102CB1').contexte.fils || []).filter(f => f.l).map(f => { const i = intensiteDuFil(f.l); return (i && i.commande ? 'c:' : 'p:') + f.l.type; }).sort().join(), rouge: CONTROLE.items.filter(x => x.nom === '102CB1' && x.niveau === 'ko').length, cables: CONTROLE.items.filter(x => x.nom === '102CB1' && /moins que les 15 A du calibre/.test(x.texte.replace(/[  ]/g, ' '))).length }; });
  ok(V2.foyer === 'trans.t' && V2.perm === 9.5 && V2.titre === 'Le calibre le plus petit qui ne disjoncte pas' && V2.cals === '1:non 3:non 5:non 7.5:non 10:non:fichier 15:oui:retenu 20:oui' && V2.cal === 15 && V2.folio === '15 A',
    'Maj+Tab : écrit au profil, la main reste dans le champ d’avant ; le 10 A de votre fichier disjoncte (toujours marqué « fichier »), VOLTA retient le plus petit qui ne disjoncte pas — 15 A —, et le folio l’écrit', JSON.stringify(V2));
  ok(V2.cables >= 1 && /^(c:DR24,?)+(p:DR12,?)+$/.test(V2.types), 'le calibre que VOLTA écrit à la place de celui qui disjoncte grossit avec lui les câbles de puissance qu’il ne protégerait plus (DR12) — jamais un fil de commande (ils restent en DR24, jugés contre le 15 A : « … moins que les 15 A du calibre »)', V2.types + ' · ' + V2.cables + ' fil(s) de commande à voir, ' + V2.rouge + ' problème(s) en rouge, part number ' + V2.pn);
  await page.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }); await page.keyboard.press('Control+z'); await page.waitForTimeout(800);
  const V3 = await page.evaluate(() => ({ perm: app.contrat.charges.get('102CB1').perm.i, cal: calibreDe('102CB1'), pn: pnDuRepere('102CB1'), folio: [...document.querySelectorAll('#scene .comp[data-name="102CB1"] text.cb-cal')].map(e => e.textContent.replace(/ /g, ' ')).join() }));
  ok(V3.perm === 5 && V3.cal === 10 && V3.pn === 'MS3320-10' && V3.folio === '10 A', 'Ctrl+Z : le permanent revient à 5 A, le calibre à 10 A (MS3320-10), le folio aussi', JSON.stringify(V3));
  /* (10 novembre 2026, un défaut trouvé par cette batterie) après une saisie qui change le calibre — la fiche se refait autour du
     champ, qui ne dit plus « change » en sortant —, la saisie suivante gardait l'ancienne ouverte : pas d'entrée d'historique,
     « Rien à défaire ». Chaque saisie a la sienne : le contrôle « deux Ctrl+Z », plus bas, le tient. */

  /* LE SEUL GESTE QUI ÉCRIT UN CALIBRE : la proposition justifiée de VOLTA (la charte, v86 : « le calibre écrit vient du fichier ;
     pas de Manuel sur le calibre ; seule la proposition justifiée de VOLTA — Retenir le 7,5 A — écrit, dans l'Excel corrigé »). */
  console.log('\nLA PROPOSITION DE VOLTA : « Retenir le 7,5 A »');
  await calibre();
  for (const k of ['dem', 'trans']) { await champ(k, 'i').fill('5'); await champ(k, 'i').press('Tab'); await page.waitForTimeout(600); }
  const commande = () => page.evaluate(() => verite().filter(l => { const i = intensiteDuFil(l); return i && i.commande && [l.de, l.vers].some(r => ['395SW1', '103RL1'].includes(r)); }).map(l => l.type).join());
  const etat = () => page.evaluate(() => { const n = s => String(s || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim(), p = document.getElementById('nv-p-calibre'), pr = document.querySelector('#ba-equip .dj-prop'), t = document.getElementById('toast');
    return { titre: p ? n(p.querySelector('.vu-bloc-cal .vu-titre').textContent) : '', prop: pr ? n(pr.querySelector('button').textContent) : '', dit: pr ? n(pr.textContent) : '', bulle: pr ? n(pr.querySelector('button').dataset.bulle) : '',
      cals: p ? [...p.querySelectorAll('.vu-cal')].filter(x => x.dataset.cal).map(x => x.dataset.cal + ':' + ['oui', 'non'].find(k => x.classList.contains(k)) + (x.classList.contains('on') ? ':retenu' : '') + (x.classList.contains('fichier') ? ':fichier' : '')).join(' ') : '',
      cal: calibreDe('102CB1'), pn: pnDuRepere('102CB1'), volta: pnDeVolta('102CB1'), folio: [...document.querySelectorAll('#scene .comp[data-name="102CB1"] text.cb-cal')].map(e => e.textContent.replace(/ /g, ' ')).join(),
      suffirait: CONTROLE.items.some(x => x.nom === '102CB1' && /un 7,5 A suffirait/.test(x.texte.replace(/[  ]/g, ' '))), toast: t ? n(t.innerText) : '', defaire: !!(t && [...t.querySelectorAll('button')].some(b => /Défaire/.test(b.textContent))),
      main: !!document.querySelector('#ba-equip .dj-main, #ba-equip #dj-retenir') || /À la main|\bManuel\b/.test(p ? p.innerText : '') }; });
  const cmd0 = await commande(), P1 = await etat();
  ok(P1.cal === 10 && P1.pn === 'MS3320-10' && P1.folio === '10 A' && P1.titre === 'Le calibre celui de votre fichier : il ne disjoncte pas' && /^Retenir le 7,5 A/.test(P1.prop) && /Le plus petit qui ne disjoncte pas — En permanence, il tire 5 A ; un 7,5 A ne disjoncte qu’au-delà de 6 A : il ne disjoncte pas\. Il ira dans l’Excel corrigé\./.test(P1.dit) && /Excel corrigé : MS3320-7-1\/2/.test(P1.bulle) && /Défaire/.test(P1.bulle) && P1.suffirait && !P1.main,
    'un profil plus léger (5 A partout) : le 10 A de votre fichier ne disjoncte pas, VOLTA le garde — et propose « Retenir le 7,5 A », justifié en ampères (« il tire 5 A ; un 7,5 A ne disjoncte qu’au-delà de 6 A »), « il ira dans l’Excel corrigé » ; le contrôle dit « un 7,5 A suffirait » ; aucun « À la main » ni « Manuel » sur le calibre', JSON.stringify(P1));
  await page.click('#ba-equip .dj-prop button'); await page.waitForTimeout(900);
  const P2 = await etat(), cmd1 = await commande();
  ok(P2.cal === 7.5 && P2.pn === 'MS3320-7-1/2' && P2.volta && P2.folio === '7,5 A' && /7\.5:oui:retenu 10:oui:fichier/.test(P2.cals) && !P2.prop && /102CB1 : 7,5 A \(MS3320-7-1\/2\).* — il ira dans l’Excel corrigé\./.test(P2.toast) && P2.defaire,
    'le geste : 7,5 A retenu (MS3320-7-1/2, écrit par VOLTA), le folio le dit, le 10 A reste marqué « fichier » ; le message dit « il ira dans l’Excel corrigé » et propose « Défaire »', JSON.stringify(P2));
  ok(cmd0 === cmd1 && /^DR24(,DR24)*$/.test(cmd0), 'les fils de commande ne sont jamais grossis par ce geste (la charte : jamais « Passer en DR16 » sur un fil de commande)', cmd0 + ' → ' + cmd1);
  await page.evaluate(() => { const b = [...document.querySelectorAll('#toast button')].find(x => /Défaire/.test(x.textContent)); if (b) b.click(); }); await page.waitForTimeout(800);
  const P3 = await etat();
  ok(P3.cal === 10 && P3.pn === 'MS3320-10' && !P3.volta && P3.folio === '10 A', '« Défaire » rend le 10 A de votre fichier (MS3320-10), le folio aussi', JSON.stringify([P3.cal, P3.pn, P3.volta, P3.folio]));
  await page.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
  await page.keyboard.press('Control+z'); await page.waitForTimeout(500); await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  const P4 = await page.evaluate(() => { const c = app.contrat.charges.get('102CB1'); return { dem: c.dem.i, trans: c.trans.i, cal: calibreDe('102CB1') }; });
  ok(P4.dem === 9.31 && P4.trans === 9.31 && P4.cal === 10, 'deux Ctrl+Z rendent le profil de l’exemple (9,31 A au démarrage et en transition)', JSON.stringify(P4));

  console.log('\nLE SYMBOLE, CAS PAR CAS');
  const C = await page.evaluate(symboleCasParCasDansLaPage);
  const sym = ['deboutDroite', 'deboutGauche', 'coucheAligne', 'coucheCoude', 'deboutEcarte', 'uneBorne', 'unDeuxTrois', 'triCouche', 'triDebout'].map(k => [k, C[k]]);
  ok(sym.every(([, r]) => !r.boite && r.arcs.length >= 1 && r.bouton === 1), 'chaque cas prend la forme : un arc par pôle, un seul bouton', sym.filter(([, r]) => r.boite).map(([k]) => k).join(', '));
  const [dd, dg] = [C.deboutDroite, C.deboutGauche];
  ok(dd.arcs[0].x1 <= dd.bornes[0].x - 2 && dg.arcs[0].x0 >= dg.bornes[0].x + 2 && dd.bornes.map(b => b.y).join() === '18,32' && dd.droites === 2 && dd.coudes === 0,
    'debout : les bornes aux hauteurs des fils (18 et 32), sans coude ; l’arc tourné vers le flanc vide (à gauche quand les fils sont à droite, et l’inverse)');
  ok(C.coucheAligne.coudes === 0 && C.coucheAligne.bornes.every(b => b.y === 23) && C.coucheAligne.arcs[0].y1 <= 23 && C.coucheAligne.cal === '7,5 A',
    'couché, aligné : les deux bornes à la hauteur du fil, l’arc au-dessus, pas de coude ; « 7,5 A » à la française');
  ok(C.coucheCoude.coudes === 1 && Math.abs(C.coucheCoude.bornes[1].x - C.coucheCoude.bornes[0].x) === 14 && C.deboutEcarte.coudes === 2 && Math.abs(C.deboutEcarte.bornes[1].y - C.deboutEcarte.bornes[0].y) === 14,
    'à deux hauteurs (couché) ou écartés de 56 (debout) : le symbole garde sa taille (14 entre les bornes), les fils font un coude');
  ok(C.uneBorne.bornes.length === 2 && C.uneBorne.droites + C.uneBorne.coudes === 1 && C.uneBorne.cal === '',
    'une seule borne sur le folio : la jumelle dessinée sans fil (2 bornes, 1 amenée) ; sans calibre connu, rien d’écrit');
  ok(C.unDeuxTrois.bornes.map(b => b.y).join() === '18,32,46,60' && C.unDeuxTrois.arcs.length === 2 && C.unDeuxTrois.lien === 1,
    '1, 2 et 3 d’un même flanc : le pôle 1/2, puis 3 et sa jumelle sous lui (jamais sur la borne 2), la liaison mécanique en pointillé', C.unDeuxTrois.bornes.map(b => b.y).join());
  ok(C.triCouche.arcs.length === 3 && C.triCouche.bouton === 1 && C.triCouche.lien === 1 && C.triCouche.coudes === 0, 'tripolaire couché (A1/A2, B1/B2, C1/C2) : trois arcs, un bouton, une liaison');
  ok(C.triDebout.arcs.length === 3 && C.triDebout.arcs.map(a => a.de && a.de[1] + '-' + a.a[1]).join() === '18-32,46-60,74-88' && C.triDebout.lien === 1, 'tripolaire debout, bornes 1 à 6 : les arcs 1/2, 3/4, 5/6', C.triDebout.arcs.map(a => a.de && a.de[1] + '-' + a.a[1]).join());
  ok(C.deuxFlancs.boite && C.deuxFlancs.arcs.length === 0, 'une borne sur les deux flancs : la forme ne tient pas, le disjoncteur garde la boîte (jamais pire qu’avant)');
  ok(sym.every(([, r]) => r.dedans && r.chev === 0 && r.rep), 'les textes (repère, calibre, numéros de borne) restent dans le corps réservé au bloc et ne se chevauchent pas', sym.filter(([, r]) => !r.dedans || r.chev).map(([k, r]) => k + ' ' + r.textes.join('/')).join(' | '));
  ok(C.poles.lettres === 'A1/A2 B1/B2 C1/C2' && C.poles.nombres === '1/2 3/4 5/6' && C.poles.lt === 'L1/T1 L2/T2' && C.poles.ligne === 'LINE/LOAD' && C.poles.trois === '1/2 3',
    'les pôles : A1/A2 par la lettre, 1/2 3/4 5/6 deux à deux, L1/T1 par le chiffre, LINE/LOAD ensemble, 1 2 3 → 1/2 et 3 seul', JSON.stringify(C.poles));
  /* LA CONSOMMATION DES ÉQUIPEMENTS FAIT LE PROFIL (la règle v74, toujours vraie) : sans profil écrit sur le disjoncteur, ce que
     consomme chaque équipement qu'il alimente, écrit à la main, fait son profil de charge. */
  console.log('\nLA CONSOMMATION DES ÉQUIPEMENTS FAIT LE PROFIL');
  const V74 = await page.evaluate(() => { fermerFiche(true); atelier.exemple(); const r = {};
    app.contrat.charges.delete('102CB1'); ecrireConso('103RL1', 'perm', '2'); ecrireConso('103RL1', 'dem', '9'); ecrireConso('103RL1', 'demt', '3');
    const p = chargeDe('102CB1'); r.conso = { somme: (p && p.somme || []).join(), perm: p && p.perm && p.perm.i, dem: p && p.dem && p.dem.i + '/' + p.dem.t, cal: calibreDe('102CB1'), pn: pnDuRepere('102CB1'), djs: disjoncteursDe('103RL1').join() };
    return r; });
  ok(V74.conso.somme === '103RL1' && V74.conso.perm === 2 && V74.conso.dem === '9/3' && V74.conso.djs === '102CB1' && V74.conso.cal === 10 && V74.conso.pn === 'MS3320-10',
    'la consommation de 103RL1 (2 A, 9 A pendant 3 s) fait le profil de 102CB1 ; le 10 A de votre fichier ne disjoncte pas, il reste', JSON.stringify(V74.conso));
  ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
  await nav.close();
  console.log('\n' + (echecs ? echecs + ' échec(s) sur ' + total : total + ' / ' + total + ' contrôles passés — tout est vert'));
  process.exit(echecs ? 1 : 0); })();
