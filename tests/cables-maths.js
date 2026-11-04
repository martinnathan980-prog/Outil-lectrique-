/* ===========================================================================
   LE CALCUL DES CÂBLES — les formules verrouillées, sans navigateur.
       node tests/cables-maths.js
   Ce que VOLTA calcule pour un câble, chiffre par chiffre, contre des valeurs
   faites à la main : les tables (EN 2853, contacts AS39029), le déclassement
   (le « × 0,6 » : faisceau de 8 câbles à 60 %, fig. 11-5 de l'AC 43.13-1B),
   ce qu'un câble admet par palier, la température du conducteur (AC 43.13-1B
   § 11-66 d(6)), la chute d'un câble et d'un chemin, le côté source d'un
   disjoncteur, la pointe qui chauffe, les arrondis qui ne mentent pas, la
   masse ; puis la fiche d'un câble (08-fiche : `intensiteCalculee`,
   `chuteDuFil`, `coutDuType`), ses fonctions lues dans le fichier et jouées
   dans un bac à sable où la page est remplacée par le moteur.
   ========================================================================= */
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.join(__dirname, '..', 'src'), NORMES = path.join(__dirname, '..', 'normes');
const code = ['01-modele.js', '02-lecture.js', '09-barrettes.js', '09-disjoncteurs.js', '09-raccords.js', '09-chute.js', '09-references.js'].map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
const normes = fs.readdirSync(NORMES).filter(f => /\.csv$/i.test(f)).sort().map(f => fs.readFileSync(path.join(NORMES, f), 'utf8')).join('\n\n');
/* les fonctions de calcul de la fiche (08-fiche), lues telles quelles : une déclaration au bord gauche, ses lignes suivantes
   indentées — le style du fichier */
const FICHE = fs.readFileSync(path.join(SRC, '08-fiche.js'), 'utf8').split('\n');
const extraire = nom => { const i = FICHE.findIndex(l => l.startsWith('function ' + nom + '(') || l.startsWith('const ' + nom + ' ='));
  if (i < 0) throw new Error('08-fiche : ' + nom + ' introuvable'); let j = i + 1; while (j < FICHE.length && /^\s/.test(FICHE[j])) j++; return FICHE.slice(i, j).join('\n'); };
const fiche = ['arrondi', 'chuteAdmiseDe', 'etatDeChute', 'pireChuteEnPointe', 'intensiteCalculee', 'chuteDuFil', 'tientLeCourant', 'coutDuType'].map(extraire).join('\n');
const bac = { console }; vm.createContext(bac);
vm.runInContext('const NORME_EMBARQUEE = ' + JSON.stringify(normes) + ';\n' + code
  // la page, remplacée par le moteur : la norme, les hypothèses, le disjoncteur en amont et ses chutes (comme 08-disjoncteurs, `chutesDe`)
  + '\nconst app = { norme: normeEmbarquee(), simu: { ...HYPOTHESES } };\nconst nombre = x => x == null ? "—" : String(x).replace(".", ",");\n'
  + 'let ALIMS = new Map(), CHUTES_DJ = new Map(), CONSOS = new Map();\nconst alimentationDuFil = l => ALIMS.get(l) || null;\n'
  // les consommations écrites des équipements (« Ce qu'il consomme ») : la page les donne au moteur par `consommationDuRepere`
  + 'function consommationDuRepere(r) { return CONSOS.get(r) || null; }\n'
  + 'const chuteEnLigne = (l, cb) => (CHUTES_DJ.get(cb) || []).find(c => c.segments.some(s => s.fil === l)) || null;\n'
  + 'const intensiteDuFil = l => intensiteCalculee(l);\n'
  + 'function brancher(L, cb, profil, calibre) { const pts = pointsDuProfil(profil), perm = pts.find(p => p.t === Infinity), I = perm ? perm.i : calibre;\n'
  + '  const B = branchesDepuis(L, cb);\n'
  + '  cheminsDepuis(L, cb).forEach(ch => ch.segments.forEach(s => { if (s.fil && !ALIMS.has(s.fil)) ALIMS.set(s.fil, { nom: cb, calibre, perm: perm ? perm.i : null, pointe: pts[0] && pts[0].t !== Infinity ? pts[0] : null, points: pts, amont: !!ch.amont, branche: ch.amont ? null : B.get(s.fil) || null }); }));\n'
  + '  CHUTES_DJ.set(cb, chutesDepuis(app.norme, L, cb, I, app.simu, pts.filter(p => p.t !== Infinity), { famille: null, calibre }).sort((a, b) => b.dU - a.dU)); }\n'
  + fiche + '\nthis.ev = s => eval(s);', bac);
const ev = s => bac.ev(s);
let total = 0, echecs = 0;
const ok = (nom, cond, mesure) => { total++; if (!cond) echecs++; console.log('  ' + (cond ? 'OK    ' : 'ÉCHEC ') + nom + (mesure ? '   — ' + mesure : '')); };
const pres = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-9 : tol);
const NE = ev('app.norme'), L = ev('contratExemple()');
const kT = T => (234.5 + T) / 254.5;   // le cuivre à T °C, depuis 20 °C (AC 43.13-1B § 11-66)

console.log('\n1. LES TABLES SE TIENNENT');
{ const F = NE.fils.filter(f => f.type === '*');
  const r135 = F.filter(f => !pres(f.resistance, f.resistance20 * kT(135), f.resistance * 0.005)), c10 = F.filter(f => !pres(f.chute10m, f.resistance * 10 * f.intensite / 1000, f.chute10m * 0.01));
  ok('EN 2853 : quatorze gauges, de 26 à 0 AWG ; la résistance à 135 °C est celle à 20 °C × (234,5 + 135)/254,5 (à 0,5 % près) ; la chute pour 10 m est R135 × 10 m × l’intensité continue (à 1 % près)', F.length === 14 && !r135.length && !c10.length, [...r135, ...c10].map(f => f.jauge).join(', ') || 'toutes');
  ok('les paliers courts ne descendent jamais sous le continu, et 2 s ≥ 10 s ≥ 1 min ≥ continu', F.every(f => f.i2s >= f.i10s && f.i10s >= f.i1min && f.i1min >= f.intensite));
  ok('le conducteur de la table est à 135 °C : 95 °C d’ambiante + 40 °C d’échauffement (EN 2853 note 1)', F.every(f => f.tr === 135)); }
{ const R = (ev('normeDesModules(app.norme).resistancesContacts') || []).filter(r => r.emploi === 'connecteur' && r.chuteMax != null && r.intensite > 0);
  const faux = R.filter(r => !pres(r.resistance, r.chuteMax / r.intensite, r.resistance * 0.02));
  ok('contacts AS39029 : la résistance d’une paire est sa chute max / son courant d’essai (22 : 73 mV / 5 A = 14,6 mΩ ; 20 : 55 / 7,5 = 7,3 ; 16 : 49 / 13 = 3,8 ; 12 : 42 / 23 = 1,8…), à 2 % près', R.length >= 8 && !faux.length, faux.map(r => r.taille).join(', ') || R.length + ' tailles');
  const C = (ev('normeDesModules(app.norme).courantsContacts') || []).filter(c => c.intensite != null), essai = { 28: 1.5, 26: 2, 24: 3, 22: 5, 20: 7.5, 18: 10, 16: 13, 14: 17, 12: 23, 10: 33, 8: 46 };
  const ecarts = C.filter(c => essai[c.jauge] != null && c.intensite > essai[c.jauge] + 1e-9);
  ok('courant des contacts : jamais plus que le courant d’essai AS39029 de la gauge sertie (24 AWG : 3 A, 22 : 5 A, 20 : 7,5 A, 18 : 10 A…) — c’est la gauge qui borne', C.length >= 30 && !ecarts.length, ecarts.map(c => c.taille + '/' + c.jauge + ' : ' + c.intensite).join(', ') || C.length + ' lignes'); }

console.log('\n2. LE DÉCLASSEMENT : LE « × 0,6 »');
ok('par défaut, un faisceau de 8 câbles chargé à 60 % (fig. 11-5 de l’AC 43.13-1B) : × 0,60 ; altitude 0 : × 1', pres(ev('facteurDeclassement(app.norme, HYPOTHESES.conditions, { fils: 8, charge: 60, altitude: 0 })'), 0.6));
ok('la phrase dit d’où il vient : « 11,5 A × 0,6 : faisceau de 8 câbles à 60 % » (DR20, en continu)', ev('motDuDeclassement(app.norme, "DR20", {}, Infinity)') === '11,5 A × 0,6 : faisceau de 8 câbles à 60 %', ev('motDuDeclassement(app.norme, "DR20", {}, Infinity)'));
ok('… pour 2 s, le palier de 2 s : « 39 A × 0,6 : … » ; à 70 °C d’ambiante, le continu dit aussi l’ambiante, pas le palier court', ev('motDuDeclassement(app.norme, "DR20", {}, 2)') === '39 A × 0,6 : faisceau de 8 câbles à 60 %' && /ambiante 70 °C$/.test(ev('motDuDeclassement(app.norme, "DR20", { ambiante: 70 }, Infinity)')) && !/ambiante/.test(ev('motDuDeclassement(app.norme, "DR20", { ambiante: 70 }, 2)')), ev('motDuDeclassement(app.norme, "DR20", { ambiante: 70 }, Infinity)'));
ok('sans condition cochée, rien ne déclasse : pas de phrase', ev('motDuDeclassement(app.norme, "DR20", { conditions: [] }, Infinity)') === '');

console.log('\n3. CE QU’UN CÂBLE ADMET, PALIER PAR PALIER');
{ const A = ev('admissionDuFil(app.norme, "DR20", {})'), B = ev('admissionDuFil(app.norme, "DR20", { ambiante: 70 })'), amb70 = Math.sqrt((135 - 70) / 40);
  ok('DR20 à 95 °C : 11,5 × 0,6 = 6,9 A en continu ; 2 s : 39 × 0,6 = 23,4 A ; 5 s se juge au palier de 10 s (20 × 0,6 = 12 A) ; 2,1 min, au continu (6,9 A)', pres(A.continu, 6.9) && pres(A.admise(2), 23.4) && pres(A.admise(5), 12) && pres(A.admise(125), 6.9) && pres(A.admise(Infinity), 6.9), [A.continu, A.admise(2), A.admise(5), A.admise(125)].map(x => x.toFixed(2)).join(' / '));
  ok('à 70 °C d’ambiante, le continu monte de √((135 − 70)/40) = 1,275 (EN 2853 note 2) — 2,1 min aussi (c’est du continu) — mais pas les paliers courts (2 s : toujours 23,4 A), comme la protection', pres(B.continu, 6.9 * amb70) && pres(B.admise(125), 6.9 * amb70) && pres(B.admise(2), 23.4), [B.continu, B.admise(125), B.admise(2)].map(x => x.toFixed(3)).join(' / '));
  const C = ev('admissionDuFil(app.norme, "AD20", {})');
  ok('un AD20 (aluminium cuivré, 49,6 mΩ/m contre 33,2 en cuivre) admet √(33,2 / 49,6) = 0,818 de la ligne cuivre : 6,9 × 0,818 = 5,65 A', pres(C.kc, Math.sqrt(33.2 / 49.6), 1e-6) && pres(C.continu, 6.9 * Math.sqrt(33.2 / 49.6), 1e-6), C.continu.toFixed(3));
  ok('un type hors de la norme (DR30) ou sans type : rien n’est inventé', ev('admissionDuFil(app.norme, "DR30", {}).continu') === null && ev('admissionDuFil(app.norme, "", {}).fil') === null); }

console.log('\n4. LA TEMPÉRATURE DU CONDUCTEUR ET LA CHUTE D’UN CÂBLE');
{ const T5 = 95 + 40 * Math.pow(5 / 6.9, 2), T931 = 95 + 40 * Math.pow(9.31 / 6.9, 2);
  ok('DR20 à 5 A : T2 = 95 + 40 × (5 / 6,9)² = 116,0 °C ; à 9,31 A : 167,8 °C (AC 43.13-1B § 11-66 d(6), avec l’intensité déclassée sans l’ambiante)', pres(ev('temperatureDuConducteur(app.norme, "DR20", 5, {}).T'), T5) && pres(ev('temperatureDuConducteur(app.norme, "DR20", 9.31, {}).T'), T931) && pres(T5, 116.0, 0.05) && pres(T931, 167.8, 0.05), T5.toFixed(2) + ' / ' + T931.toFixed(2));
  const W12 = L.find(l => l.cable === 'W-012'); bac.W12 = W12;
  const s = ev('chuteDuCable(app.norme, W12, 5, {})'), sf = ev('chuteDuCable(app.norme, W12, 5, { chuteConducteur: "fixe" })');
  ok('la chute d’un câble seul : DR20, 5 m supposés, 5 A — 33,2 mΩ/m × 1,377 (116 °C) × 5 m × 5 A = 1,143 V ; à 20 °C (l’Excel) 0,830 V', pres(s.dU, 0.0332 * kT(T5) * 5 * 5) && pres(sf.dU, 0.83) && s.longueur === 5 && !s.reelle && pres(s.rho, 33.2 * kT(T5)), s.dU.toFixed(4) + ' / ' + sf.dU.toFixed(4));
  ok('R × I s’y vérifie : R = ρ (Ω/km) / 1000 × L (m), en Ω ; dU = R × I', pres(s.R, s.rho / 1000 * 5) && pres(s.dU, s.R * 5));
  ok('le retour par un câble double la chute ; en triphasé, √3 × I × R cos φ (le retour n’y compte pas)', pres(ev('chuteDuCable(app.norme, W12, 5, { retour: "fil" }).dU'), 2 * s.dU) && pres(ev('chuteDuCable(app.norme, W12, 5, { regime: "tri", cosphi: 0.8, retour: "fil" }).dU'), Math.sqrt(3) * 0.8 * s.dU));
  bac.W12L = ev('liaison')({ ...W12, longueur: 12 }); bac.W12Z = ev('liaison')({ ...W12, longueur: 0 }); bac.WX = ev('liaison')({ ...W12, type: 'ZZ20' }); bac.WY = ev('liaison')({ ...W12, type: 'ZZ' }); bac.WS = ev('liaison')({ ...W12, type: '' });
  ok('la longueur du fichier passe devant l’hypothèse (12 m, « réelle ») ; une longueur nulle prend l’hypothèse (5 m)', pres(ev('chuteDuCable(app.norme, W12L, 5, {}).longueur'), 12) && ev('chuteDuCable(app.norme, W12L, 5, {}).reelle') && ev('chuteDuCable(app.norme, W12Z, 5, {}).longueur') === 5 && !ev('chuteDuCable(app.norme, W12Z, 5, {}).reelle'));
  ok('un type inconnu de la base qui dit sa gauge (ZZ20) prend la ligne de sa gauge (cuivre, EN 2853 : 33,2 Ω/km), et le dit (« jauge ») ; sans gauge (ZZ) ou sans type, la chute ne se calcule pas (null) ; un courant nul : 0 V', ev('chuteDuCable(app.norme, WX, 5, {}).rhoSource') === 'jauge' && ev('chuteDuCable(app.norme, WX, 5, {}).rho20') === 33.2 && ev('chuteDuCable(app.norme, WY, 5, {}).dU') === null && ev('chuteDuCable(app.norme, WS, 5, {}).dU') === null && ev('chuteDuCable(app.norme, W12, 0, {}).dU') === 0); }

console.log('\n5. LA CHUTE EN LIGNE : LE CHEMIN, LA SOURCE, LA POINTE');
{ const P = ev('pointsDuProfil(chargesExemple().get("102CB1"))'); bac.P = P;
  ok('le profil de 102CB1 en points : 9,31 A pendant 125 s (démarrage et transition), puis 5 A pour toujours', P.length === 2 && P[0].i === 9.31 && P[0].t === 125 && P[1].i === 5 && P[1].t === Infinity);
  const CH = ev('cheminsDepuis(contratExemple(), "102CB1")');
  ok('102CB1 a trois chemins ; celui de sa borne 1 finit sur la batterie 101BT1 : la source, le côté ligne (`amont`), pas une charge', CH.length === 3 && CH.filter(c => c.amont).length === 1 && CH.find(c => c.amont).bout[0] === '101BT1' && CH.find(c => c.amont).depart === '1');
  const F = ev('filsDepuis(contratExemple(), "102CB1")').map(f => f.cable).sort().join(',');
  ok('les câbles que 102CB1 alimente : W-012 et W-015 — pas W-011, le câble de la batterie (il le nourrit)', F === 'W-012,W-015', F);
  const C = ev('chutesDepuis(app.norme, contratExemple(), "102CB1", 5, {}, P.filter(p => p.t !== Infinity), { famille: null, calibre: 10 })'), c12 = C.find(c => c.bout[0] === '103RL1');
  const T5 = 95 + 40 * Math.pow(5 / 6.9, 2), T931 = 95 + 40 * Math.pow(9.31 / 6.9, 2);
  ok('deux chutes en ligne (plus « jusqu’à la batterie ») ; vers 103RL1 : 1,143 V dans le DR20 + 0,2 V du 10 A (« Du max » de l’atelier, compté entier) = 1,343 V, sous les 2 V', C.length === 2 && pres(c12.dU, 0.0332 * kT(T5) * 25 + 0.2) && !c12.trop && c12.admis === 2 && c12.courant === 5, c12.dU.toFixed(4));
  const p = c12.pointes[0];
  ok('la transition (9,31 A pendant 2,1 min, plus d’une minute) chauffe le DR20 à 167,8 °C : 0,0332 × 1,581 × 5 × 9,31 + 0,2 = 2,643 V > 2 V — et non 2,33 V à la température du permanent', p.chauffe && pres(p.dU, 0.0332 * kT(T931) * 5 * 9.31 + 0.2) && p.trop && !p.intermittent, p.dU.toFixed(4));
  const C5 = ev('chutesDepuis(app.norme, contratExemple(), "102CB1", 5, {}, [{ i: 9.31, t: 5 }], { famille: null, calibre: 10 })').find(c => c.bout[0] === '103RL1'), q = C5.pointes[0];
  ok('un démarrage de 5 s (moins d’une minute) ne chauffe pas le câble au-delà du permanent : la chute monte avec le courant (1,143 × 9,31 / 5 + 0,2 = 2,328 V), comparée à l’intermittent', !q.chauffe && pres(q.dU, (C5.dU - 0.2) * 9.31 / 5 + 0.2) && q.intermittent, q.dU.toFixed(4)); }
{ // la borne de ligne passe par une barrette (le bus) : tout ce qui part de cette borne est en amont, même vers un autre disjoncteur
  const li = (de, bDe, vers, bVers, cable, type) => ev('liaison')({ de, borneDe: bDe, vers, borneVers: bVers, cable, type });
  const M = [li('1BT1', '1', '10VT1', '1', 'W-1', 'DR12'), li('10VT1', '1', '10VT1', '2', 'W-2', 'DR12'), li('10VT1', '2', '11CB1', '1', 'W-3', 'DR16'), li('10VT1', '1', '12CB2', '1', 'W-4', 'DR16'), li('11CB1', '2', '20LP1', '1', 'W-5', 'DR20')];
  bac.M = M; const ch = ev('cheminsDepuis(M, "11CB1")'), am = ch.filter(c => c.amont).map(c => c.bout[0]).sort().join(','), F = ev('filsDepuis(M, "11CB1")').map(f => f.cable).join(',');
  ok('11CB1 nourri par un bus (10VT1) depuis la batterie : sa borne 1 est la ligne — les chemins vers 1BT1 et vers le voisin 12CB2 sont en amont ; il alimente W-5 seul', am === '12CB2,1BT1' && F === 'W-5' && ev('chutesDepuis(app.norme, M, "11CB1", 3, {})').length === 1, am + ' · ' + F);
  const N = [li('1BT1', '1', '11CB1', '1', 'W-1', 'DR16')]; bac.N = N;
  ok('un disjoncteur dont on ne connaît que le câble de la batterie : ce chemin est en amont, il ne nourrit rien', ev('cheminsDepuis(N, "11CB1")').every(c => c.amont) && !ev('filsDepuis(N, "11CB1")').length); }

console.log('\n6. LES ARRONDIS NE MENTENT PAS');
ok('2,004 V contre 2 V : « 2,004 > 2 », pas « 2 > 2 » ; 6,90001 A contre 6,9 A : quatre décimales, arrondies vers l’extérieur', JSON.stringify(ev('enOrdre(2.004, 2)')) === '[2.004,2]' && JSON.stringify(ev('enOrdre(6.90001, 6.9)')) === '[6.9001,6.9]');
ok('des valeurs qui s’écrivent déjà différemment gardent deux décimales ; deux valeurs égales restent égales', JSON.stringify(ev('enOrdre(4.6261, 2)')) === '[4.63,2]' && JSON.stringify(ev('enOrdre(2, 2)')) === '[2,2]' && JSON.stringify(ev('enOrdre(9.31, 6.8999999999)')) === '[9.31,6.9]');

console.log('\n7. LA FICHE D’UN CÂBLE (08-fiche) : UNE SEULE VÉRITÉ');
{ ev('ALIMS = new Map(); CHUTES_DJ = new Map(); brancher(contratExemple(), "102CB1", chargesExemple().get("102CB1"), 10)');
  const LX = ev('[...ALIMS.keys()]'), W12 = LX.find(l => l.cable === 'W-012'), W11 = LX.find(l => l.cable === 'W-011'); bac.W12f = W12; bac.W11f = W11;
  const x = ev('intensiteCalculee(W12f)'), c = ev('chuteDuFil(W12f)'), T5 = 95 + 40 * Math.pow(5 / 6.9, 2);
  ok('W-012 (DR20 sous 102CB1) : 5 A du profil sur 6,9 A admis en continu ; sa pointe (9,31 A, 2,1 min) contre 6,9 A — elle dépasse', x.source === 'profil' && x.I === 5 && pres(x.continu, 6.9) && pres(x.pointe.admis, 6.9) && x.trop.length === 1 && x.trop[0].i === 9.31, `${x.I} A sur ${x.continu.toFixed(2)} A · pointe ${x.pointe.i} A sur ${x.pointe.admis.toFixed(2)} A`);
  ok('sa part de la chute en ligne est SON segment : 1,143 V (à 116 °C), plus 0,830 V à 20 °C — le total 1,343 V en est la somme avec le disjoncteur', pres(c.dU, 0.0332 * kT(T5) * 25) && pres(c.total.dU, c.dU + 0.2) && pres(c.T, T5) && c.I === 5, `${c.dU.toFixed(4)} V dans le câble, ${c.total.dU.toFixed(4)} V en ligne`);
  ok('sa résistance `rd` est celle de son conducteur sous son courant : ρ × L × I = sa part (R × I se vérifie sur la fiche et au récapitulatif)', pres(x.rd.rho / 1000 * c.L * x.I, c.dU) && pres(x.tc.T, T5));
  const y = ev('intensiteCalculee(W11f)'), d = ev('chuteDuFil(W11f)');
  ok('W-011 (la batterie → 102CB1, en amont) porte les 5 A de 102CB1, mais n’a pas de « chute en ligne » : sa chute est celle du câble seul (DR16, 5 m, 5 A)', y.I === 5 && y.al.amont && !d.total && pres(d.dU, 0.0145 * kT(95 + 40 * Math.pow(5 / 11.7, 2)) * 25), d.dU.toFixed(4));
  ev('ALIMS = new Map(); CHUTES_DJ = new Map(); brancher(contratExemple(), "102CB1", null, 10)');
  const z = ev('intensiteCalculee([...ALIMS.keys()].find(l => l.cable === "W-012"))'), cz = ev('chuteDuFil([...ALIMS.keys()].find(l => l.cable === "W-012"))');
  ok('sans profil, le câble porte au pire le calibre de son disjoncteur (10 A) — le même courant que sa chute en ligne, plus l’hypothèse de 2 A d’un côté et le calibre de l’autre', z.source === 'calibre' && z.I === 10 && cz.total.courant === 10 && cz.I === 10 && !z.trop.length, `${z.I} A · chute à ${cz.total.courant} A`);
  ev('ALIMS = new Map(); CHUTES_DJ = new Map()');
  const h = ev('intensiteCalculee(W12f)');
  ok('sans disjoncteur en amont, l’hypothèse (2 A), dite telle', h.source === 'hypothese' && h.I === 2 && !h.al);
  ev('app.simu = { ...HYPOTHESES, ambiante: 70 }; ALIMS = new Map(); CHUTES_DJ = new Map(); brancher(contratExemple(), "102CB1", { dem: { i: 20, t: 2 }, perm: { i: 5 } }, 10)');
  const a = ev('intensiteCalculee([...ALIMS.keys()].find(l => l.cable === "W-012"))');
  ok('à 70 °C, la pointe de 2 s se compare au palier 2 s déclassé du faisceau seul (39 × 0,6 = 23,4 A), le continu à 6,9 × 1,275 — comme la protection (avant v84 : 29,8 A pour 2 s)', pres(a.pointe.admis, 23.4) && pres(a.continu, 6.9 * Math.sqrt(65 / 40)), `${a.pointe.admis.toFixed(2)} A pour 2 s · ${a.continu.toFixed(2)} A en continu`);
  ev('app.simu = { ...HYPOTHESES }'); }
{ const W12 = L.find(l => l.cable === 'W-012'); bac.Wc = W12; bac.Wc5 = ev('liaison')({ ...W12, longueur: 5 });
  ok('le coût d’un câble grossi : (masse du nouveau − masse de l’ancien) g/m × longueur m — DR20 → DR16 sur 5 m : (14,61 − 6,85) × 5 = +39 g', ev('coutDuType(Wc5, "DR16")') === '+39 g sur 5 m', ev('coutDuType(Wc5, "DR16")'));
  ok('sans longueur au fichier, sur la longueur supposée, et dit (« supposés ») ; plus fin : un signe moins ; un type que la base ne pèse pas : rien', ev('coutDuType(Wc, "DR16")') === '+39 g sur 5 m supposés' && ev('coutDuType(Wc5, "DR22")') === '−14 g sur 5 m' && ev('coutDuType(Wc5, "ZZ16")') === '', ev('coutDuType(Wc5, "DR22")')); }

console.log('\n8. LE COURANT D’UNE BRANCHE : CE QU’ELLE ALIMENTE EN AVAL');
{ // l'exemple : 102CB1:2 dessert le relais 103RL1 (W-012, DR20) et l'interrupteur 395SW1 (W-015, DR24 : la commande de la bobine)
  const P = ev('pointsDuProfil(chargesExemple().get("102CB1"))'), T = i => 95 + 40 * Math.pow(i / 3.9, 2); bac.P = P;
  ev('CONSOS = new Map()');
  const B0 = ev('branchesDepuis(contratExemple(), "102CB1")'), b15 = [...B0].find(([l]) => l.cable === 'W-015')[1], b12 = [...B0].find(([l]) => l.cable === 'W-012')[1];
  ok('sans consommation écrite : W-015 et W-012 n’alimentent chacun qu’une partie de 102CB1 — courant total, et la branche dit ce qui manque (395SW1, 103RL1)', !b15.ecrite && !b15.tout && b15.manque.join() === '395SW1' && !b12.ecrite && b12.manque.join() === '103RL1' && !B0.has(ev('contratExemple()').find(l => l.cable === 'W-011')), b15.manque.join() + ' · ' + b12.manque.join());
  ev('CONSOS = new Map([["103RL1", { perm: { i: 4.9 }, dem: { i: 9.2, t: 125 } }], ["395SW1", { perm: { i: 0.1 } }]])');
  const B1 = ev('branchesDepuis(contratExemple(), "102CB1")'), c15 = [...B1].find(([l]) => l.cable === 'W-015')[1], c12 = [...B1].find(([l]) => l.cable === 'W-012')[1];
  ok('consommations écrites (103RL1 : 4,9 A, 9,2 A au démarrage pendant 125 s ; 395SW1 : 0,1 A) : W-015 porte 0,1 A, W-012 porte 4,9 A et 9,2 A en pointe', c15.ecrite && c15.perm === 0.1 && c15.pointe === 0.1 && c12.ecrite && c12.perm === 4.9 && c12.pointe === 9.2 && c12.points[0].t === 125, `W-015 ${c15.perm} A · W-012 ${c12.perm} A / ${c12.pointe} A`);
  const F = ev('filsDepuis(contratExemple(), "102CB1")'), f15 = F.find(f => f.cable === 'W-015');
  ok('la protection reçoit le profil de la branche (`points`) : W-015, 0,1 A pour toujours', f15.points && f15.points.length === 1 && f15.points[0].i === 0.1 && f15.points[0].t === Infinity);
  const C = ev('chutesDepuis(app.norme, contratExemple(), "102CB1", 5, {}, P.filter(p => p.t !== Infinity), { famille: null, calibre: 10 })'), k15 = C.find(c => c.bout[0] === '395SW1');
  ok('la chute vers 395SW1 : le DR24 à 0,1 A (114 mΩ/m, 95 °C + presque rien, 5 m) + 0,2 V du 10 A (le disjoncteur porte le total) — 0,27 V au lieu de 4,63 V : plus de chute trop forte', pres(k15.segments[0].courant, 0.1) && pres(k15.dU, 0.114 * (234.5 + T(0.1)) / 254.5 * 5 * 0.1 + 0.2) && !k15.trop && !k15.tropPointe, k15.dU.toFixed(4) + ' V');
  const k12 = C.find(c => c.bout[0] === '103RL1'), T12 = i => 95 + 40 * Math.pow(i / 6.9, 2);
  ok('vers 103RL1 : le DR20 à 4,9 A au permanent, à 9,2 A pendant la pointe de 102CB1 (125 s : il chauffe)', pres(k12.segments[0].courant, 4.9) && pres(k12.dU, 0.0332 * (234.5 + T12(4.9)) / 254.5 * 25 / 5 * 4.9 + 0.2) && pres(k12.pointes[0].dU, 0.0332 * (234.5 + T12(9.2)) / 254.5 * 5 * 9.2 + 0.2), `${k12.dU.toFixed(4)} V · pointe ${k12.pointes[0].dU.toFixed(4)} V`);
  const li = (de, bDe, vers, bVers, cable, type) => ev('liaison')({ de, borneDe: bDe, vers, borneVers: bVers, cable, type });
  bac.D = [li('5CB1', '2', '50VT1', '1', 'W-a', 'DR16'), li('50VT1', '1', '50VT1', '2', 'W-s', 'DR16'), li('50VT1', '1', '51EQ1', '1', 'W-b', 'DR22'), li('50VT1', '2', '52EQ2', '1', 'W-c', 'DR22'), li('5CB1', '2', '53EQ3', '1', 'W-d', 'DR22')];
  ev('CONSOS = new Map([["51EQ1", { perm: { i: 2 }, dem: { i: 5, t: 3 } }], ["52EQ2", { perm: { i: 1 } }]])');
  const B2 = ev('branchesDepuis(D, "5CB1")'), ba = [...B2].find(([l]) => l.cable === 'W-a')[1], bb = [...B2].find(([l]) => l.cable === 'W-b')[1], bd = [...B2].find(([l]) => l.cable === 'W-d')[1];
  ok('par une barrette : W-a alimente 51EQ1 et 52EQ2 — la somme (2 + 1 = 3 A ; au démarrage 5 + 1 = 6 A pendant 3 s) ; W-b, 51EQ1 seul ; W-d, 53EQ3 sans consommation : le total, et il le dit', ba.ecrite && ba.perm === 3 && ba.pointe === 6 && ba.points[0].t === 3 && bb.perm === 2 && bb.pointe === 5 && !bd.ecrite && bd.manque.join() === '53EQ3', `W-a ${ba.perm} / ${ba.pointe} A · W-b ${bb.perm} / ${bb.pointe} A`);
  bac.E = [li('6CB1', '2', '60EQ1', '1', 'W-e', 'DR22')];
  const be = [...ev('branchesDepuis(E, "6CB1")')][0][1];
  ok('un disjoncteur à une seule charge : son câble alimente tout — le courant total du profil, exact (`tout`), sans rien demander', be.tout && !be.ecrite && !be.manque.length);
  // la fiche du câble, avec et sans les consommations
  ev('CONSOS = new Map([["103RL1", { perm: { i: 4.9 }, dem: { i: 9.2, t: 125 } }], ["395SW1", { perm: { i: 0.1 } }]]); ALIMS = new Map(); CHUTES_DJ = new Map(); brancher(contratExemple(), "102CB1", chargesExemple().get("102CB1"), 10)');
  const x15 = ev('intensiteCalculee([...ALIMS.keys()].find(l => l.cable === "W-015"))'), d15 = ev('chuteDuFil([...ALIMS.keys()].find(l => l.cable === "W-015"))');
  ok('la fiche de W-015, consommations écrites : il porte 0,1 A (`source` « branche ») sur 3,9 A admis — plus de pointe qui dépasse ; sa chute à 0,1 A', x15.source === 'branche' && pres(x15.I, 0.1) && !x15.trop.length && !x15.pointe && !x15.totalFaute && pres(d15.I, 0.1) && pres(d15.dU, d15.total.segments[0].dU), `${x15.I} A · ${d15.dU.toFixed(4)} V`);
  ev('CONSOS = new Map(); ALIMS = new Map(); CHUTES_DJ = new Map(); brancher(contratExemple(), "102CB1", chargesExemple().get("102CB1"), 10)');
  const y15 = ev('intensiteCalculee([...ALIMS.keys()].find(l => l.cable === "W-015"))'), y11 = ev('intensiteCalculee([...ALIMS.keys()].find(l => l.cable === "W-011"))');
  ok('sans consommation : W-015 porte le total de 102CB1 (5 A, 9,31 A en pointe), et la fiche peut le dire — `totalFaute`, ce qui manque : 395SW1', y15.source === 'profil' && y15.I === 5 && y15.trop.length === 2 && y15.totalFaute && y15.aval.manque.join() === '395SW1');
  ok('le câble de la batterie (W-011, en amont) porte le total sans « faute » : il nourrit tout', y11.I === 5 && !y11.totalFaute && !y11.aval); }

console.log(`\n  ${total - echecs} / ${total} contrôles passés  —  ${echecs ? echecs + ' ÉCHEC(S)' : 'tout est vert'}`);
process.exit(echecs ? 1 : 0);
