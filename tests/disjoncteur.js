/* ===========================================================================
   LE DISJONCTEUR — le moteur sans navigateur, puis l'écran à la vraie souris.
       NODE_PATH=/opt/node22/lib/node_modules node tests/disjoncteur.js [--fichier=chemin]

   Le moteur : les familles de disjoncteurs (NSA935401 est un collier), le
   bilan thermique en somme des fractions, la marge de l'idéal (10 % de
   courant, 75 % du temps de déclenchement), la protection des fils sur la
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
{ const code = ['01-modele.js', '02-lecture.js', '09-barrettes.js', '09-disjoncteurs.js'].map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
  const normes = fs.readdirSync(NORMES).filter(f => /\.csv$/i.test(f)).sort().map(f => fs.readFileSync(path.join(NORMES, f), 'utf8')).join('\n\n');
  const bac = { console }; vm.createContext(bac);
  vm.runInContext('const NORME_EMBARQUEE = ' + JSON.stringify(normes) + ';\n' + code + '\nthis.X = { normeEmbarquee, courbesDeDisjonction, tempsDeDeclenchement, multipleAdmis, pointsDuProfil, verdictDisjonction, protectionDesFils, calibreDuPn, familleDuPn, FAMILLES_DISJONCTEURS, CALIBRES, MARGE_DISJONCTION, MARGE_FRACTION, SELECTIVITE, HYPOTHESES, tenueGarantie, calibresDeLaFamille, pnAvecCalibre };', bac);
  const X = bac.X, NE = X.normeEmbarquee(), C = X.courbesDeDisjonction(NE), c125 = C[0], lente = C[C.length - 1];
  ok(X.MARGE_DISJONCTION === 1.1 && X.MARGE_FRACTION === 0.75 && X.SELECTIVITE === 2 && X.FAMILLES_DISJONCTEURS.length >= 9, 'les marges de l’idéal : 10 % de courant, 75 % du temps de déclenchement ; la sélectivité 2:1 ; neuf familles de disjoncteurs');
  ok(X.calibreDuPn('NSA935401-10') === null && X.familleDuPn('NSA935401-10') === null && X.calibreDuPn('MS3320-10') === 10 && X.familleDuPn('MS3320-10').famille === 'MS3320' && X.familleDuPn('MS3320-10').courbe === 'ETA483' && X.familleDuPn('2TC7-20').famille === '2TC' && X.familleDuPn('2TC7-20').courbe === '2TC' && X.familleDuPn('MS14154-5').courbe === '6TC' && X.familleDuPn('483-G533-J1M1-B2S0ZN-5A').famille === 'ETA483' && X.familleDuPn('MS33201-5').famille === 'MS33201' && X.calibreDuPn('2TC7-20') === 20 && X.calibreDuPn('MS3320-2-1/2') === 2.5 && X.calibreDuPn('7274-11-1/2') === 0.5 && X.calibreDuPn('MS22073-5') === 5 && X.calibreDuPn('EN2995-001-7,5') === 7.5 && X.calibreDuPn('MS3320-99') === null && X.calibreDuPn('ABC-7,5A') === null && X.calibreDuPn('MS3470L14-5P') === null,
    'le calibre ne se lit qu’après une famille de disjoncteur : NSA935401-10 (un collier) → rien ; MS3320-10 → 10 (famille MS3320, courbes ETA483 : la feuille du lecteur) ; 2TC7-20 → 20 (courbes 2TC) ; MS14154-5 → 6TC ; 483-G533-J1M1-B2S0ZN-5A → ETA483 ; MS33201-5 → Crouzet, pas MS3320 ; MS3320-2-1/2 → 2,5 ; 7274-11-1/2 → ½ ; MS22073-5 → 5 ; EN2995-001-7,5 → 7,5 ; MS3320-99 (hors gamme), ABC-7,5A, MS3470L14-5P → rien');
  const PROFIL = { dem: { i: 9.31, t: 5 }, trans: { i: 9.31, t: 120 }, perm: { i: 5 } }, V = X.verdictDisjonction(NE, '', 10, PROFIL);
  ok(V.valide && V.serre && !V.avecMarge && V.somme > 0.05 && V.somme < 0.07 && V.points[0].serre && V.calibreIdeal === 15 && V.reserve === '' && V.gamme.map(g => g.valide ? (g.serre ? 's' : 'o') : 'x').join('') === 'xxxxsoo',
    'l’Excel du lecteur sur un 10 A : tient (6 % du temps de déclenchement consommé) mais touche la courbe — avec 10 % de courant en plus, 9,31 A font 1,02 In et le 125 °C déclenche en 31 s ; l’idéal est le 15 A ; la gamme déclenche jusqu’au 7,5 A', V.gamme.map(g => g.calibre + (g.valide ? (g.serre ? ' serré' : ' ok') : ' ko')).join(' · ') + ' · Σ ' + V.somme.toFixed(3));
  const P9 = X.verdictDisjonction(NE, '', 10, { perm: { i: 9.0 } });
  ok(P9.valide && P9.serre && P9.points[0].serre && P9.calibreIdeal === 15, 'un permanent de 9 A sur un 10 A (admis 9,24 A, 2,6 % de marge) tient mais TOUCHE la courbe : l’idéal passe au 15 A', 'admis ' + P9.points[0].marges[0].admis.toFixed(2) + ' A');
  const P8 = X.verdictDisjonction(NE, '', 10, { perm: { i: 8.3 } });
  ok(P8.valide && !P8.serre && P8.avecMarge && P8.calibreIdeal === 10, 'à 8,3 A (11 % de marge) le permanent est dans le vert, l’idéal reste le 10 A');
  // la somme des fractions : chaque point tient seul, et pourtant le bilame déclenche
  const S = X.verdictDisjonction(NE, '', 10, { dem: { i: 15, t: 3 }, trans: { i: 12, t: 6 }, perm: { i: 5 } });
  ok(S.points.filter(p => p.t !== Infinity).every(p => p.marges[0].temps > p.t) && !S.valide && S.somme > 1 && S.points.filter(p => p.ok === false).length === 1 && S.points.find(p => p.ok === false).i === 15 && S.pire && S.pire.i === 15,
    '15 A pendant 3 s (tient 4,5 s) puis 12 A pendant 6 s (tient 10,4 s) : chaque point reste à gauche de la courbe, mais 67 % + 58 % du temps de déclenchement = déclenche ; le point qui pèse le plus est le fautif', 'Σ ' + S.somme.toFixed(2));
  const S15 = X.verdictDisjonction(NE, '', 15, { dem: { i: 20, t: 5 }, trans: { i: 12, t: 60 }, perm: { i: 5 } });
  ok(S15.valide && S15.serre && !S15.avecMarge && S15.somme > 0.7 && S15.somme < 0.76 && S15.points.find(p => p.i === 20).serre, 'sur un 15 A, 20 A pendant 5 s (tient 6,8 s : 74 %) puis 12 A (0,8 In : jamais) : tient, mais serré — avec 10 % de courant en plus, le démarrage consomme tout', 'Σ ' + S15.somme.toFixed(2));
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
  ok(VF.calibreIdeal === 15 && VF.reserve === 'fils' && VF.gamme.find(g => g.calibre === 1).fils === true && VF.gamme.filter(g => g.calibre >= 3).every(g => g.fils === false),
    'avec ses fils : seul le 1 A les protégerait tous, mais il déclenche ; l’idéal reste celui de la charge (15 A) et la réserve dit « fils »');
  const VS = X.verdictDisjonction(NE, '', 10, { perm: { i: 2 } }, { autres: [15] });
  ok(VS.calibreIdeal === 3 && VS.gamme.find(g => g.calibre === 10).selectif === false && VS.gamme.find(g => g.calibre === 7.5).selectif === true && VS.gamme.find(g => g.calibre === 1).valide === false && VS.reserve === '',
    'un voisin de 15 A : le 10 A n’est pas à 2:1 (15 < 20), le 7,5 A l’est (15 ≥ 15) ; pour 2 A permanents l’idéal est le 3 A (le 1 A déclenche)');
  const VS2 = X.verdictDisjonction(NE, '', 10, { perm: { i: 7 } }, { autres: [15] });
  ok(VS2.calibreIdeal === 10 && VS2.reserve === 'selectivite' && VS2.gamme.find(g => g.calibre === 15).selectif === false && VS2.gamme.find(g => g.calibre === 25).selectif === false,
    'pour 7 A permanents avec ce voisin de 15 A, aucun calibre avec marge n’est à 2:1 (le 10 et le 15 sont trop près, le 25 ne le double pas) : l’idéal reste celui de la charge (10 A), réserve « sélectivité »');
  const VG = X.verdictDisjonction(NE, '', 20, { perm: { i: 2 } });
  ok(VG.gamme.map(g => g.calibre).join() === '1,3,5,7.5,10,15,20,25' && VG.calibre === 20, 'un calibre hors de la gamme proposée (20 A, un part number) entre dans la gamme jugée');
  // R2 règles 2 à 5 et 13 : la gamme de la famille, ce que le disjoncteur garantit, le meilleur calibre avec ses fils
  const MS = X.familleDuPn('MS3320-10', NE), H = X.HYPOTHESES;
  ok(X.calibresDeLaFamille(MS, H).join() === '0.5,0.75,1,1.5,2,2.5,3,4,5,7.5,10,15,20,25' && X.calibresDeLaFamille(null, H).join() === X.CALIBRES.join() && X.calibresDeLaFamille(X.familleDuPn('EN3773-001-10', NE), H).join() === '1,1.5,2,2.5,3,4,5,7.5,10,15,20,25' && X.calibresDeLaFamille(MS, { calibresPreferes: [1, 3, 5, 7.5, 10, 15, 25] }).join() === '1,3,5,7.5,10,15,25',
    'la gamme : le catalogue de la famille du part number (MS3320 : ½ à 25 A, table Familles) ; une plage (EN 3773 : « 1 à 25 ») prend la série d’aéronef ; sans famille, les sept calibres du lecteur ; la liste préférée filtre');
  const T125 = X.tenueGarantie(NE, MS, 'ETA483', 125), T70 = X.tenueGarantie(NE, MS, 'ETA483', 73), T2TC = X.tenueGarantie(NE, X.familleDuPn('2TC7-20', NE), '2TC', 121), TE = X.tenueGarantie(NE, null, 'ETA483', 125);
  ok(T125.tient === 0.8 && T125.horsPlage && Math.abs(T70.tient - (1.15 + (73 - 25) / 96 * (0.80 - 1.15))) < 1e-9 && T70.interpolee && T2TC.tient === 0.85 && TE.tient === 0.93,
    'ce que le disjoncteur garantit de tenir (table Calibration) : MS3320N 0,80 In à 121 °C (et au-delà) ; à 73 °C, interpolé entre 25 °C (1,15) et 121 °C : 0,975 ; Klixon 2TC 0,85 In à 121 °C ; sans famille, la courbe ETA483 lue (0,93)', [T125.tient, T70.tient, T2TC.tient, TE.tient].join(' '));
  const P92 = X.verdictDisjonction(NE, '', 10, { perm: { i: 8.5 } }, { famille: MS });
  ok(!P92.valide && Math.abs(P92.points[0].marges[0].admis - 8) < 1e-9 && P92.points[0].marges[0].garanti === 8 && P92.calibreIdeal === 15,
    'un MS3320-10 au tableau à 125 °C ne garantit que 8 A : 8,5 A permanents (sous les 9,24 A de la courbe typique) ne sont plus sûrs — R2 règle 4 ; le meilleur passe au 15 A');
  const FIL3 = FILS.map(f => ({ ...f })), M10 = X.verdictDisjonction(NE, '', 10, PROFIL, { famille: MS, pn: 'MS3320-10', fils: FIL3, hyp: { conditions: ['faisceau'] } }).meilleur, M0 = X.verdictDisjonction(NE, '', 10, PROFIL, { famille: MS, pn: 'MS3320-10', fils: FIL3, hyp: { conditions: ['faisceau'], marge: 0 } }).meilleur;
  ok(M10.calibre === 15 && M10.pn === 'MS3320-15' && M10.reserve === 'fils' && M10.filsAChanger.map(x => x.cable + '→' + x.propose).join() === 'W-011→DR12,W-012→DR12,W-015→DR12' && M10.contactsTouches.length === 3 && M10.marge.courant === 10 && Math.abs(M10.marge.garanti - 12) < 1e-9 && /le 10 A est serré/.test(M10.pourquoi),
    'le meilleur, 102CB1 avec 10 % de marge au tableau à 125 °C (R2 § 3.4) : 15 A (MS3320-15 : le 10 A consomme 405 % de son temps de déclenchement à 9,31 × 1,1 A), et les trois fils en DR12 — le DR14 n’admet que 14,4 A en service, moins que le calibre ; les contacts passent en taille 12', M10.pourquoi);
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
    let chev = 0; for (let i = 0; i < textes.length; i++) for (let j = i + 1; j < textes.length; j++) { const a = textes[i], b = textes[j]; if (a.x1 > b.x0 && a.x0 < b.x1 && a.y1 > b.y0 && a.y0 < b.y1) chev++; }
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
(async () => {
  console.log('\nL’ÉCRAN');
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await nav.newPage({ viewport: { width: 1600, height: 950 } }); page.setDefaultTimeout(120000);
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined'); await page.evaluate(() => atelier.exemple());   // l’outil s’ouvre sur l’accueil (plus sur l’exemple) : la batterie, qui lit l’exemple, le demande
  const ouvrir = async () => { await page.evaluate(() => { allerAuPlan('1'); choisirBloc(app.dessin.comps.find(k => k.name === '102CB1' && k.kind !== 'tag')); }); await page.waitForTimeout(500); };
  await ouvrir();
  // LE FOLIO : 102CB1 a sa forme, pas la boîte d'un équipement — aux ports d'un équipement, choisi à l'encre (« Graphite »)
  const folioCb = () => page.evaluate(() => { const c = app.dessin.comps.find(k => k.name === '102CB1' && k.kind !== 'tag'), g = document.querySelector('#scene .comp[data-name="102CB1"]'), t = cls => [...g.querySelectorAll('text.' + cls)].map(e => e.textContent);
    const ports = [...(c.rangs.L || []).map(p => [0, p.y - c.y]), ...(c.rangs.R || []).map(p => [c.w, p.y - c.y])];
    const bouts = [...g.querySelectorAll('.lead')].map(l => l.tagName === 'line' ? [+l.getAttribute('x1'), +l.getAttribute('y1')] : (m => [+m[1], +m[2]])(/^M([\d.\-]+) ([\d.\-]+)/.exec(l.getAttribute('d'))));
    const sel = g.querySelector('.selbox');
    return { boite: !!g.querySelector('rect.body'), conn: !!g.querySelector('.conn'), bornes: g.querySelectorAll('.cb-borne').length, arcs: g.querySelectorAll('.cb-arc').length, bouton: g.querySelectorAll('.cb-bouton').length, rep: t('rep-big'), cal: t('cb-cal'),
      ports: bouts.length === ports.length && ports.every(p => bouts.some(b => Math.abs(b[0] - p[0]) < 0.06 && Math.abs(b[1] - p[1]) < 0.06)), largeur: c.w, sel: sel ? getComputedStyle(sel).stroke : '' }; });
  const F1 = await folioCb();
  ok(!F1.boite && !F1.conn && F1.bornes === 2 && F1.arcs === 1 && F1.bouton === 1 && F1.rep.join() === '102CB1' && F1.cal.join() === '10 A' && F1.ports && F1.largeur === 144 && F1.sel === 'rgb(29, 29, 31)',
    'le folio : 102CB1 n’est plus une boîte (ni corps, ni pièce de connecteur « A ») mais deux bornes, l’arc et le bouton en T, son repère et « 10 A » (le part number) ; chaque amenée part d’un port d’équipement (x = 0 ou 144, à la hauteur de sa borne) ; choisi, il est encadré à l’encre', JSON.stringify(F1));
  const S = '#ba-equip .fi-dj ';
  ok(await page.evaluate(() => { const s = document.querySelector('#ba-equip .fi-dj'), chips = [...s.querySelectorAll('.dj-chips .dj-chip')];
    return chips.length === 14 && chips.map(c => c.dataset.cal).join() === '0.5,0.75,1,1.5,2,2.5,3,4,5,7.5,10,15,20,25' && chips.map(c => c.classList.contains('serre') ? 's' : c.classList.contains('ok') ? 'o' : c.classList.contains('ko') ? 'x' : '?').join('') === 'xxxxxxxxxxsooo'
      && chips.filter(c => c.getAttribute('aria-pressed') === 'true').length === 1 && chips[10].getAttribute('aria-pressed') === 'true' && chips[11].classList.contains('ideal') && /part number MS3320-10/.test(s.querySelector('.dj-dou').textContent) && /MS3320/.test(s.querySelector('.dj-dou').textContent) && /l’idéal\s:\s15\sA · les fils ne suivent pas/.test(s.querySelector('.dj-ideal').textContent)
      && /W-011 en DR12, W-012 en DR12, W-015 en DR12/.test(s.querySelector('.dj-ideal span').title); }),
    'la gamme : le catalogue de la famille MS3320 (½ à 25 A, table Familles — R2 règle 3), quatorze segments jugés (rouge jusqu’au 7,5, ambre pour le 10 qui touche la courbe, vert dès le 15), le 10 du part number MS3320-10 pressé, l’étoile sur le 15, « ★ l’idéal : 15 A · les fils ne suivent pas » en titre, et son survol dit quels fils grossir (les trois en DR12)');
  ok(await page.evaluate(() => { const svg = document.querySelector('#ba-equip .dj-graphe svg'), cal = svg.querySelector('.dj-cal'), f = [...svg.querySelectorAll('.dj-fantome')];
    const kx = (400 - 44 - 12) / (+svg.closest('figure').dataset.xhi - +svg.closest('figure').dataset.xlo);
    return !!cal && cal.querySelectorAll('.dj-courbe').length === 4 && !!cal.querySelector('.dj-zone') && !!cal.querySelector('.dj-bande') && Math.abs(+cal.dataset.tx - Math.log10(10) * kx) < 0.1 && /translate/.test(cal.style.transform)
      && f.length === 14 && f.filter(g => g.classList.contains('retenu')).length === 1 && f.find(g => g.classList.contains('retenu')).dataset.cal === '10' && f.every(g => /translate/.test(g.style.transform))
      && !!svg.querySelector('.dj-systeme') && svg.querySelectorAll('.dj-pt').length === 2 && svg.querySelector('.dj-courbe.tirets') && !document.querySelector('#ba-equip .dj-note'); }),
    'le graphique : les quatre courbes, la zone et la bande dans un groupe décalé de log10(10) décades ; quatorze fantômes décalés (la famille), celui du 10 caché ; l’escalier et ses deux points ; le 23 °C max en tirets ; aucune phrase');
  ok(await page.evaluate(() => { const svg = document.querySelector('#ba-equip .dj-graphe svg'); const xs = [...svg.querySelectorAll('text.dj-grad')].filter(t => +t.getAttribute('y') > 280).map(t => { const b = t.getBBox(); return [b.x, b.x + b.width]; }).sort((a, b) => a[0] - b[0]);
    return xs.length >= 8 && xs.every((r, i) => !i || r[0] >= xs[i - 1][1] + 1); }), 'les graduations de l’abscisse ne se chevauchent pas (500 s’efface devant 1 000)');
  ok(await page.evaluate(() => { const svg = document.querySelector('#ba-equip .dj-graphe svg'); const ts = [...svg.querySelectorAll('.dj-fantome text:not(.cache), .dj-cal-etiq')].map(t => { const b = t.getBBox(); const m = /translate\(([-\d.]+)px/.exec(t.closest('g').style.transform); return [b.x + (m ? +m[1] : 0), b.width]; }).sort((a, b) => a[0] - b[0]);
    return ts.length >= 5 && ts.every((r, i) => !i || r[0] >= ts[i - 1][0] + ts[i - 1][1] - 1); }), 'les calibres en marge du haut ne se chevauchent pas (7,5 attend le survol)');
  // survoler un segment montre son fantôme ; la légende isole une courbe
  await page.hover(S + '.dj-chip[data-cal="5"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => { const g = document.querySelector('#ba-equip .dj-fantome[data-cal="5"]'); return g.classList.contains('vise') && getComputedStyle(g.querySelector('path:not(.dj-prise)')).stroke !== getComputedStyle(document.querySelector('#ba-equip .dj-fantome[data-cal="3"] path:not(.dj-prise)')).stroke; }), 'survoler le segment 5 A allume son fantôme sur le graphique');
  await page.hover(S + '.dj-leg[data-courbe="3"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => { const svg = document.querySelector('#ba-equip .dj-graphe svg'); return svg.classList.contains('isole') && svg.querySelector('.dj-courbe[data-courbe="3"]').classList.contains('vise') && +getComputedStyle(svg.querySelector('.dj-courbe[data-courbe="0"]')).opacity < 0.5 && +getComputedStyle(svg.querySelector('.dj-courbe[data-courbe="3"]')).opacity === 1; }), 'survoler « −55 °C » dans la légende isole sa courbe (les autres s’estompent)');
  await page.mouse.move(5, 5); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !document.querySelector('#ba-equip .dj-graphe svg').classList.contains('isole') && !document.querySelector('#ba-equip .dj-fantome.vise')), 'la souris partie, rien n’est plus isolé ni allumé');
  // le réticule, la carte d'un point
  // (à 1,9 A et 7 s passe maintenant le fantôme du 1,5 A, un calibre de la famille : le réticule se lit plus bas, sous les fantômes)
  const g = await page.locator(S + '.dj-graphe svg').boundingBox(); await page.mouse.move(g.x + g.width * 0.3, g.y + g.height * 0.8); await page.waitForTimeout(200);
  ok(await page.evaluate(() => { const t = document.querySelector('#ba-equip .dj-tip'), v = document.querySelector('#ba-equip .dj-vise'); return !t.hidden && !v.hidden && /\d A · [\d,]+ (s|ms|min)/.test(t.textContent) && t.querySelectorAll('.dj-tip-l').length === 4 && /le 10 A tient/.test(t.textContent) && /ne déclenche pas/.test(t.textContent); }), 'le réticule (à 1,9 A, 48 ms, sous les fantômes) : la carte lit le courant et la durée, et ce que le 10 A tient à chaque température (ici : ne déclenche pas)');
  await page.mouse.move(g.x + g.width * 0.85, g.y + g.height * 0.3); await page.waitForTimeout(200);
  ok(await page.evaluate(() => { const t = document.querySelector('#ba-equip .dj-tip'); return !t.hidden && /le 10 A tient/.test(t.textContent) && [...t.querySelectorAll('.dj-tip-l')].every(l => /(ms|s)$/.test(l.querySelector('b').textContent) && /> 1 000 %/.test(l.querySelector('em').textContent) && l.querySelector('em').classList.contains('ko')); }), 'le réticule loin à droite des courbes (≈ 300 A, 200 s) : à chaque température le temps de déclenchement (des millisecondes) et la part de la durée visée qu’il représente (« > 1 000 % », en rouge)');
  let pt = await page.locator(S + '.dj-pt[data-k="perm"] .dj-point').boundingBox(); await page.mouse.move(pt.x + pt.width / 2, pt.y + pt.height / 2); await page.waitForTimeout(200);
  ok(await page.evaluate(() => { const t = document.querySelector('#ba-equip .dj-tip'); return !t.hidden && /5 A · toujours/.test(t.textContent) && /permanent/.test(t.textContent) && /jusqu’à 8 A/.test(t.textContent) && /\+60 %/.test(t.textContent) && /jusqu’à 10,45 A/.test(t.textContent) && /ne déclenche jamais/.test(t.textContent) && document.querySelector('#ba-equip .dj-vise').hidden; }),
    'la carte du permanent : 5 A pour toujours, jusqu’à 8 A à 125 °C (+60 % : ce que le MS3320-10 GARANTIT, 0,80 In, MS3320N table VII — la courbe typique dirait 9,24 A), 10,45 A à 23 °C, ne déclenche jamais ; le réticule s’efface');
  pt = await page.locator(S + '.dj-pt[data-k="dem"] .dj-point').boundingBox(); await page.mouse.move(pt.x + pt.width / 2, pt.y + pt.height / 2); await page.waitForTimeout(200);
  ok(await page.evaluate(() => { const t = document.querySelector('#ba-equip .dj-tip'); return !t.hidden && /9,31 A · 2,1 min/.test(t.textContent) && /démarrage et transition/.test(t.textContent) && /tient 36,3 min/.test(t.textContent) && /6 %/.test(t.textContent) && /touche la courbe · 6 % du temps consommé/.test(t.textContent) && t.querySelector('.dj-tip-v.serre'); }),
    'la carte du démarrage : 9,31 A pendant 2,1 min, le 10 A tient 36,3 min à 125 °C, 6 % du temps de déclenchement consommé, touche la courbe');
  ok(await page.evaluate(() => { const t = document.querySelector('#ba-equip .dj-tip'), f = t.closest('.dj-graphe').getBoundingClientRect(), r = t.getBoundingClientRect(); return r.left >= f.left && r.right <= f.right + 1 && r.top >= f.top && r.bottom <= f.bottom + 1; }), 'la carte reste dans la figure');
  // glisser le point du permanent vers la droite : le courant monte, le contrat s'écrit, Ctrl+Z le rend
  pt = await page.locator(S + '.dj-pt[data-k="perm"] .dj-point').boundingBox(); const cx = pt.x + pt.width / 2, cy = pt.y + pt.height / 2;
  await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 20, cy, { steps: 4 }); await page.waitForTimeout(100);
  ok(await page.evaluate(() => document.querySelector('#ba-equip .dj-graphe svg').classList.contains('tient') && !document.querySelector('#ba-equip .dj-tip').hidden), 'pendant le glisser, le graphique tient le point et la carte suit');
  await page.mouse.move(cx + 28, cy, { steps: 4 }); await page.waitForTimeout(100);
  ok(await page.evaluate(() => { const p = document.querySelector('#ba-equip .dj-pt[data-k="perm"]'); return p.classList.contains('ko') && document.querySelector('#ba-equip .dj-chip[data-cal="10"]').classList.contains('ko'); }), 'glissé à droite de la courbe (≈ 9,8 A), le point passe au rouge et le segment 10 A aussi, en direct');
  await page.mouse.up(); await page.waitForTimeout(800);
  ok(await page.evaluate(() => { const c = app.contrat.charges.get('102CB1'); return c.perm.i > 9.24 && c.perm.i < 11 && document.querySelector('#ba-equip .dj-chip[aria-pressed="true"]').classList.contains('ko') && CONTROLE.items.some(x => x.nom === '102CB1' && x.niveau === 'ko' && /permanent/.test(x.texte)); }), 'lâché : le permanent est écrit au contrat, la fiche et le contrôle le relèvent', 'perm ' + await page.evaluate(() => app.contrat.charges.get('102CB1').perm.i));
  await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => app.contrat.charges.get('102CB1').perm.i === 5), 'Ctrl+Z rend le profil de l’exemple');
  await ouvrir();
  // changer de calibre : les courbes glissent (une transition sur le groupe), le fantôme du 10 reparaît
  const tx10 = await page.evaluate(() => +document.querySelector('#ba-equip .dj-cal').dataset.tx);
  await page.click(S + '.dj-chip[data-cal="15"]'); await page.waitForTimeout(60);
  const pendant = await page.evaluate(() => { const g = document.querySelector('#ba-equip .dj-cal'); return { tx: +g.dataset.tx, mat: getComputedStyle(g).transform, duree: getComputedStyle(g).transitionDuration }; });
  await page.waitForTimeout(700);
  const apres = await page.evaluate(() => { const g = document.querySelector('#ba-equip .dj-cal'); return { tx: +g.dataset.tx, mat: getComputedStyle(g).transform, retenu: document.querySelector('#ba-equip .dj-fantome.retenu').dataset.cal, dix: !document.querySelector('#ba-equip .dj-fantome[data-cal="10"]').classList.contains('retenu') }; });
  const m = s => { const r = /matrix\(([^)]+)\)/.exec(s); return r ? +r[1].split(',')[4] : NaN; };
  ok(pendant.tx > tx10 && Math.abs(pendant.tx - Math.log10(1.5) * (400 - 56) / 3.5 - tx10) < 0.5 && parseFloat(pendant.duree) > 0 && m(pendant.mat) < pendant.tx - 1 && Math.abs(m(apres.mat) - apres.tx) < 0.5 && apres.retenu === '15' && apres.dix,
    'le 15 A retenu : le groupe glisse de log10(1,5) décade (en transition, pas d’un coup), le fantôme du 15 se cache, celui du 10 reparaît', JSON.stringify({ tx10, pendant, apres }));
  ok((await folioCb()).cal.join() === '15 A', 'le folio écrit le calibre retenu : « 15 A » à côté du symbole');
  ok(await page.evaluate(() => /choisi à la main/.test(document.querySelector('#ba-equip .dj-dou').textContent) && !!document.querySelector('#ba-equip .dj-ideal .dj-etoile svg') && /l’idéal · les fils ne suivent pas/.test(document.querySelector('#ba-equip .dj-ideal').textContent) && CONTROLE.items.some(x => x.nom === '102CB1' && x.niveau === 'att' && /W-011 \(DR16\) : 11,7 A admis en continu \(× 0,6\) < calibre 15 A — pas protégé en surcharge/.test(x.texte))),
    '« choisi à la main », c’est l’idéal (avec sa réserve) ; le contrôle dit que le DR16 n’est pas protégé en surcharge par un 15 A (19,5 × 0,6 = 11,7 A admis en continu, le point FAA, moins que le calibre)', await page.evaluate(() => CONTROLE.items.filter(x => x.nom === '102CB1').map(x => x.niveau + ' ' + x.texte).join(' | ')));
  ok(await page.evaluate(() => CONTROLE.items.filter(x => x.nom === '102CB1').map(x => x.niveau + ' ' + x.texte).every(t => !/W-012 \(DR20\) : pas protégé en surcharge brève/.test(t))), 'un fil déjà en problème (W-012 : la charge le dépasse) ne reçoit pas en plus l’avertissement de surcharge brève');
  await page.click(S + '.dj-chip[data-cal="15"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => app.contrat.charges.get('102CB1').calibre === null && document.querySelector('#ba-equip .dj-cal').dataset.cal === '10'), 'presser de nouveau le 15 rend le 10 du part number');
  ok((await folioCb()).cal.join() === '10 A', 'et le folio écrit de nouveau « 10 A »');
  // la table des états, les paliers des fils, la jauge des chutes
  ok(await page.evaluate(() => { const s = document.querySelector('#ba-equip .fi-dj'), E = [...s.querySelectorAll('.dj-etat')]; return !!s.querySelector('.dj-entete') && E.map(e => e.dataset.k).join() === 'dem,trans,perm' && E[0].querySelector('.dj-verdict.serre') && E[1].querySelector('.dj-verdict.serre') && E[2].querySelector('.dj-verdict.ok') && E[2].querySelector('.dj-inf') && !E[2].querySelector('[data-q="t"]') && s.querySelectorAll('.dj-champ input').length === 5 && !!s.querySelector('#dj-plus'); }),
    'les états en table : démarrage, transition (pastilles ambre : leur point touche la courbe), permanent (pour toujours, sans durée, pastille sombre), cinq champs, « + un état »');
  ok(await page.evaluate(() => { const li = [...document.querySelectorAll('#ba-equip .dj-fils .fi-fil')], w15 = li.find(x => /W-015/.test(x.textContent)), pal = [...w15.querySelectorAll('.dj-pal')];
    const w11 = li[0], p11 = [...w11.querySelectorAll('.dj-pal')];
    return li.length === 3 && pal.length === 4 && pal.map(p => p.querySelector('i').textContent).join() === '2 s,10 s,1 min,continu' && pal[3].classList.contains('ko') && /3,9 A/.test(pal[3].textContent) && !pal[2].classList.contains('ko') && /démarrage et transition 9,31 A · 2,1 min/.test(w15.querySelector('.dj-dep').textContent) && w15.classList.contains('ko')
      && p11.filter(p => p.classList.contains('ko') || p.classList.contains('att')).length === 0 && /11,7 A/.test(p11[3].textContent) && !w11.querySelector('.dj-dep') && !w11.classList.contains('ko')
      && pal.filter(p => p.classList.contains('att')).length === 3 && pal.filter(p => /laisse/.test(p.textContent)).length === 1 && /laisse 28,7 A/.test(pal[1].textContent); }),
    'ses fils par palier : le DR24 (W-015) admet 6,5 × 0,6 = 3,9 A en continu (le point FAA), la case est rouge, l’état qui la dépasse est dit court, ses trois autres cases sont ambre et la pire (10 s : 28,7 A laissés, le fil s’abîme au-delà de 7,9 A) porte le chiffre ; le DR16 (W-011) n’a plus rien d’ambre : le 10 A le protège (1 min : 19,1 A laissés, 23,8 A avant dommage — R2 § 3.4)');
  ok(await page.evaluate(() => { const li = [...document.querySelectorAll('#ba-equip .dj-chutes .fi-fil')], j = li.map(x => parseFloat(x.querySelector('.dj-jauge i').style.width)); return li.length === 3 && j[0] > 60 && j[0] < 64 && j[1] === 100 && j[2] === 100 && li[2].classList.contains('ko') && /4,57 V/.test(li[2].textContent) && /16,3 %/.test(li[2].textContent) && /dépasse 1 V/.test(li[2].textContent) && /W-015/.test(li[2].querySelector('.dj-chemin').textContent)
      && /102CB1 : 0,14 V \(sa chute propre\)/.test(li[2].title) && /161 °C/.test(li[2].title); }),
    'la chute en ligne : trois chemins, une jauge contre 1 V admis — conducteur chaud (AC 43.13-1B § 11-66 d(6)) et chute propre du MS3320-10 comptée (0,14 V à 5 A) : 62 %, pleine pour 103RL1 (1,28 V), pleine et rouge pour 395SW1 (4,57 V, 16,3 % : le DR24 à 161 °C)');
  // un état de plus, en table ; sa carte dit qu'il déclenche ; retiré
  await page.click('#dj-plus'); await page.waitForTimeout(500); await page.fill(S + '.dj-etat[data-k="plus0"] [data-q="i"]', '12'); await page.fill(S + '.dj-etat[data-k="plus0"] [data-q="t"]', '30'); await page.press(S + '.dj-etat[data-k="plus0"] [data-q="t"]', 'Enter'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => { const e = document.querySelector('#ba-equip .dj-etat[data-k="plus0"]'); return !!e && e.querySelector('.dj-verdict.ko') && e.querySelector('input.dj-nom').value === 'État 3' && document.querySelectorAll('#ba-equip .dj-pt').length === 3 && document.querySelector('#ba-equip .dj-pt[data-k="plus0"].ko'); }), 'un état de plus (12 A, 30 s) : sa ligne a une pastille rouge, son point aussi');
  pt = await page.locator(S + '.dj-pt[data-k="plus0"] .dj-point').boundingBox(); await page.mouse.move(pt.x + pt.width / 2, pt.y + pt.height / 2); await page.waitForTimeout(200);
  ok(await page.evaluate(() => { const t = document.querySelector('#ba-equip .dj-tip'); return !t.hidden && /12 A · 30 s/.test(t.textContent) && /État 3/.test(t.textContent) && /tient 7,3 s/.test(t.textContent) && /410 %/.test(t.textContent) && /déclenche à 125 °C, 23 °C min · 416 % du temps consommé/.test(t.textContent) && t.querySelector('.dj-tip-v.ko'); }),
    'sa carte : 12 A pendant 30 s, un état EN SERVICE trouve le bilame chaud (préchauffage, MS3320N table VII : ÷ 1,6 à 60 % de In, ici 5 A sur 10 → ÷ 1,42) : le 10 A tient 10,4 / 1,42 = 7,3 s à 125 °C (410 % consommés par cet état), déclenche à 125 °C et 23 °C min, 416 % en tout');
  await page.click(S + '.dj-x[data-x="plus0"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => app.contrat.charges.get('102CB1').plus.length === 0 && document.querySelectorAll('#ba-equip .dj-pt').length === 2), 'retiré');
  // le calibre du folio suit l'historique : retenir le 15, Ctrl+Z
  await page.click(S + '.dj-chip[data-cal="15"]'); await page.waitForTimeout(700); const avecQuinze = (await folioCb()).cal.join();
  await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(600);
  const defait = await folioCb();
  ok(avecQuinze === '15 A' && defait.cal.join() === '10 A' && !defait.boite && await page.evaluate(() => app.contrat.charges.get('102CB1').calibre === null), 'retenir le 15 écrit « 15 A » sur le folio, Ctrl+Z y rend « 10 A »', avecQuinze + ' → ' + defait.cal.join());

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
  ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
  await nav.close();
  console.log('\n' + (echecs ? echecs + ' échec(s) sur ' + total : total + ' / ' + total + ' contrôles passés — tout est vert'));
  process.exit(echecs ? 1 : 0); })();
