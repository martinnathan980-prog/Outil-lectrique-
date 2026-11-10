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
   (v86, l'audit B1 et M3) LE COURANT TRAVERSE CE QUI CONDUIT : le contact
   d'un relais (A1-A2-A3), un interrupteur, la borne commune à deux câbles ;
   la bobine d'un relais consomme ; une branche de commande n'est jamais
   jugée au courant total (son courant est inconnu tant qu'il n'est pas
   écrit) ; le circuit d'un disjoncteur, de la source à la masse, dans le
   sens du courant.
   (v87, le lecteur, Q1 et Q3 ; la passe « calcul », S1, S3, S7) PLUS
   AUCUN COURANT PRÊTÉ : une branche dont une consommation manque a un
   courant inconnu (avant : le courant total du disjoncteur, « la règle
   prudente ») — les tests qui le comptaient écrivent maintenant la
   consommation de la lampe 104LP1, ou disent « inconnu » ; LE CÂBLE DE
   MASSE porte le courant de sa charge ; la fiche dit la chute AU MÊME
   INSTANT que le courant ; LA PROTECTION, la plus sévère de l'EN 2853 et
   de la table 11-3, dit laquelle décide ; LE CONTACT que la gauge borne
   ne demande pas « un contact plus gros ».
   ========================================================================= */
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.join(__dirname, '..', 'src'), NORMES = path.join(__dirname, '..', 'normes');
const code = ['01-modele.js', '02-lecture.js', '09-barrettes.js', '09-disjoncteurs.js', '09-raccords.js', '09-chute.js', '09-references.js'].map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
const normes = fs.readdirSync(NORMES).filter(f => /\.csv$/i.test(f)).sort().map(f => fs.readFileSync(path.join(NORMES, f), 'utf8')).join('\n\n');
/* les fonctions de calcul de la fiche (08-fiche), lues telles quelles : une déclaration au bord gauche, ses lignes suivantes
   indentées — le style du fichier */
const lignesDe = f => fs.readFileSync(path.join(SRC, f), 'utf8').split('\n');
const FICHE = lignesDe('08-fiche.js'), RECAP = lignesDe('08-recap.js'), DJ = lignesDe('08-disjoncteurs.js');
const extraireDe = (X, fichier) => nom => { const i = X.findIndex(l => l.startsWith('function ' + nom + '(') || l.startsWith('const ' + nom + ' ='));
  if (i < 0) throw new Error(fichier + ' : ' + nom + ' introuvable'); let j = i + 1; while (j < X.length && /^\s/.test(X[j])) j++; return X.slice(i, j).join('\n'); };
const extraire = extraireDe(FICHE, '08-fiche');
const fiche = ['arrondi', 'volts', 'nombreA', 'chuteAdmiseDe', 'etatDeChute', 'pireChuteEnPointe', 'intensiteCalculee', 'chuteDuFil', 'tientLeCourant', 'coutDuType', 'profilDePoints', 'alimentationDuRetour', 'motDeCommande', 'motDuCourantInconnu', 'ligneDeFil'].map(extraire).join('\n')
  // (v87, S3) l'instant d'une ligne, celui du récapitulatif ; (Q3, S7) la protection en une phrase, les contacts que la gauge borne
  + '\n' + extraireDe(RECAP, '08-recap')('instantsDuFil') + '\n' + ['pourPalier', 'motFacteur', 'secondes', 'amperes', 'majuscule', 'protectionEnMots', 'conditionsDeLaNorme', 'contactsDeLaGauge'].map(extraireDe(DJ, '08-disjoncteurs')).join('\n');
const bac = { console }; vm.createContext(bac);
vm.runInContext('const NORME_EMBARQUEE = ' + JSON.stringify(normes) + ';\n' + code
  // la page, remplacée par le moteur : la norme, les hypothèses, le disjoncteur en amont et ses chutes (comme 08-disjoncteurs, `chutesDe`)
  + '\nconst app = { norme: normeEmbarquee(), simu: { ...HYPOTHESES } };\nconst nombre = x => x == null ? "—" : String(x).replace(".", ",");\n'
  + 'let ALIMS = new Map(), CHUTES_DJ = new Map(), CONSOS = new Map(), INFOS = new Map();\nconst alimentationDuFil = l => ALIMS.get(l) || null;\nconst infosDisjoncteur = cb => INFOS.get(cb);\n'
  // ce que la page dessine (une puce, la clé d'un câble) : sans objet ici
  + 'const cleFil = l => l.cable, nomDuFil = f => f.cable || "", puceFil = () => "";\n'
  // les consommations écrites des équipements (« Ce qu'il consomme ») et le profil écrit d'un disjoncteur : la page les donne au moteur par `consommationDuRepere`
  + 'function consommationDuRepere(r) { return CONSOS.get(r) || null; }\n'
  + 'const chuteEnLigne = (l, cb) => (CHUTES_DJ.get(cb) || []).find(c => c.segments.some(s => s.fil === l)) || null;\n'
  + 'const intensiteDuFil = l => intensiteCalculee(l);\n'
  // (v87) le profil du disjoncteur ÉCRIT sur lui (le tronc le porte) ; le courant de la chute en ligne : son permanent, 0 sans lui (plus de calibre) ;
  // (S1) ses retours, comme la page (08-fiche, `carteDesAlimentations`)
  + 'function brancher(L, cb, profil, calibre) { const pts = pointsDuProfil(profil), perm = pts.find(p => p.t === Infinity), I = perm ? perm.i : 0; if (profil) CONSOS.set(cb, profil); else CONSOS.delete(cb);\n'
  + '  const B = branchesDepuis(L, cb), info = { nom: cb, calibre, perm: perm ? perm.i : null, pointe: pts[0] && pts[0].t !== Infinity ? pts[0] : null, points: pts, ecrit: !!profil, manque: [] }; INFOS.set(cb, info);\n'
  + '  cheminsDepuis(L, cb).forEach(ch => ch.segments.forEach(s => { if (s.fil && !ALIMS.has(s.fil)) ALIMS.set(s.fil, { ...info, amont: !!ch.amont, chemin: ch, branche: ch.amont ? null : B.get(s.fil) || null }); }));\n'
  + '  retoursDepuis(L, cb).forEach((R, l) => { if (!ALIMS.has(l)) ALIMS.set(l, { ...info, amont: R.retour === "source", chemin: null, branche: R.retour === "source" ? null : R, retour: { quoi: R.retour, de: R.de, cbs: [cb] } }); });\n'
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
  // (v86) le courant traverse le contact du relais 103RL1 et l'interrupteur 395SW1 : six chemins (avant : trois, arrêtés aux équipements)
  const CH = ev('cheminsDepuis(contratExemple(), "102CB1")');
  ok('102CB1 a six chemins : la batterie (sa borne 1, `amont` : la source, pas une charge), la lampe 104LP1 par le contact A1-A2 du relais, la bobine de 103RL1 par l’interrupteur 395SW1, et par 395SW1 au folio 3 les entrées A5, A6 de 300XC1 et la lampe 391LP1', CH.length === 6 && CH.filter(c => c.amont).length === 1 && CH.find(c => c.amont).bout[0] === '101BT1' && CH.find(c => c.amont).depart === '1' && ['104LP1:1', '103RL1:X1', '300XC1:A5', '300XC1:A6', '391LP1:3'].every(b => CH.some(c => !c.amont && c.bout.join(':') === b)), CH.filter(c => !c.amont).map(c => c.bout.join(':')).join(', '));
  const F = ev('filsDepuis(contratExemple(), "102CB1")').map(f => f.cable).sort().join(',');
  ok('les câbles que 102CB1 alimente : W-012 et W-015, et au-delà du relais et de l’interrupteur W-013, W-014, W-327, W-328, W-380 — pas W-011, le câble de la batterie (il le nourrit)', F === 'W-012,W-013,W-014,W-015,W-327,W-328,W-380', F);
  // (v87, le lecteur, Q1) aucune consommation écrite en aval : aucun courant prêté, donc aucune chute (avant : 3,71 V et 9,05 V au courant total de 102CB1)
  ev('CONSOS = new Map()');
  const C0 = ev('chutesDepuis(app.norme, contratExemple(), "102CB1", 5, {}, P.filter(p => p.t !== Infinity), { famille: null, calibre: 10 })');
  ok('sans consommation écrite en aval, aucune chute en ligne ne se calcule — plus de 3,71 V ni de 9,05 V au courant total de 102CB1 (le lecteur : « plus aucune chute inventée »)', C0.length === 0, C0.length + ' chute(s)');
  // la consommation de la lampe 104LP1 écrite comme le profil de 102CB1 (5 A, 9,31 A pendant 125 s) : sa branche, W-012 et W-013, porte ce courant
  ev('CONSOS = new Map([["104LP1", { perm: { i: 5 }, dem: { i: 9.31, t: 125 } }]])');
  const C = ev('chutesDepuis(app.norme, contratExemple(), "102CB1", 5, {}, P.filter(p => p.t !== Infinity), { famille: null, calibre: 10 })'), c104 = C.find(c => c.bout[0] === '104LP1');
  const T5 = 95 + 40 * Math.pow(5 / 6.9, 2), T931 = 95 + 40 * Math.pow(9.31 / 6.9, 2), T22 = i => 95 + 40 * Math.pow(i / 5.1, 2);
  const u104 = 0.2 + 0.0332 * kT(T5) * 25 + 0.2 + 0.060 * kT(T22(5)) * 25;
  ok('104LP1 écrite (5 A, 9,31 A pendant 125 s) : une seule chute en ligne se calcule, la sienne (la bobine, 391LP1 et les entrées de 300XC1 restent inconnues) — 0,2 V du 10 A + 1,143 V dans le DR20 + 0,2 V du relais 103RL1 (sa ligne RELAIS, « Du max ») + 2,169 V dans le DR22 (60 mΩ/m à 133,4 °C × 5 m × 5 A) = 3,712 V > 2 V', C.length === 1 && c104 && pres(c104.dU, u104) && c104.trop && c104.courant === 5 && c104.segments.some(s => s.traverse === 'relais' && s.dU === 0.2), c104 && c104.dU.toFixed(4));
  const p = c104.pointes[0];
  ok('la transition (9,31 A pendant 2,1 min, plus d’une minute) chauffe les deux câbles : le DR20 à 167,8 °C, le DR22 à 228,3 °C — 0,2 + 2,443 + 0,2 + 5,079 = 7,922 V ; le relais garde ses 0,2 V', p.chauffe && pres(p.dU, 0.2 + 0.0332 * kT(T931) * 5 * 9.31 + 0.2 + 0.060 * kT(T22(9.31)) * 5 * 9.31) && p.trop && !p.intermittent, p.dU.toFixed(4));
  const C5 = ev('chutesDepuis(app.norme, contratExemple(), "102CB1", 5, {}, [{ i: 9.31, t: 5 }], { famille: null, calibre: 10 })').find(c => c.bout[0] === '104LP1'), q = C5.pointes[0];
  ok('un démarrage de 5 s (moins d’une minute) ne chauffe pas les câbles au-delà du permanent : leur chute monte avec le courant, le disjoncteur et le relais gardent la leur (« Du max ») — (3,712 − 0,4) × 9,31 / 5 + 0,4 = 6,567 V, comparée à l’intermittent', !q.chauffe && pres(q.dU, (C5.dU - 0.4) * 9.31 / 5 + 0.4) && q.intermittent, q.dU.toFixed(4));
  ev('CONSOS = new Map()'); }
{ // la borne de ligne passe par une barrette (le bus) : tout ce qui part de cette borne est en amont, même vers un autre disjoncteur
  const li = (de, bDe, vers, bVers, cable, type) => ev('liaison')({ de, borneDe: bDe, vers, borneVers: bVers, cable, type });
  const M = [li('1BT1', '1', '10VT1', '1', 'W-1', 'DR12'), li('10VT1', '1', '10VT1', '2', 'W-2', 'DR12'), li('10VT1', '2', '11CB1', '1', 'W-3', 'DR16'), li('10VT1', '1', '12CB2', '1', 'W-4', 'DR16'), li('11CB1', '2', '20LP1', '1', 'W-5', 'DR20')];
  bac.M = M; const ch = ev('cheminsDepuis(M, "11CB1")'), am = ch.filter(c => c.amont).map(c => c.bout[0]).sort().join(','), F = ev('filsDepuis(M, "11CB1")').map(f => f.cable).join(',');
  // (v87) son profil écrit (3 A) : W-5, le tronc, le porte et sa chute se calcule ; sans rien d'écrit, aucune
  ok('11CB1 nourri par un bus (10VT1) depuis la batterie : sa borne 1 est la ligne — les chemins vers 1BT1 et vers le voisin 12CB2 sont en amont ; il alimente W-5 seul, qui porte son profil écrit (3 A) — rien d’écrit, pas de chute', am === '12CB2,1BT1' && F === 'W-5' && ev('chutesDepuis(app.norme, M, "11CB1", 3, {}, [], null, r => r === "11CB1" ? { perm: { i: 3 } } : null)').length === 1 && ev('chutesDepuis(app.norme, M, "11CB1", 3, {}, [], null, () => null)').length === 0, am + ' · ' + F);
  const N = [li('1BT1', '1', '11CB1', '1', 'W-1', 'DR16')]; bac.N = N;
  ok('un disjoncteur dont on ne connaît que le câble de la batterie : ce chemin est en amont, il ne nourrit rien', ev('cheminsDepuis(N, "11CB1")').every(c => c.amont) && !ev('filsDepuis(N, "11CB1")').length); }

console.log('\n6. LES ARRONDIS NE MENTENT PAS');
ok('2,004 V contre 2 V : « 2,004 > 2 », pas « 2 > 2 » ; 6,90001 A contre 6,9 A : quatre décimales, arrondies vers l’extérieur', JSON.stringify(ev('enOrdre(2.004, 2)')) === '[2.004,2]' && JSON.stringify(ev('enOrdre(6.90001, 6.9)')) === '[6.9001,6.9]');
ok('des valeurs qui s’écrivent déjà différemment gardent deux décimales ; deux valeurs égales restent égales', JSON.stringify(ev('enOrdre(4.6261, 2)')) === '[4.63,2]' && JSON.stringify(ev('enOrdre(2, 2)')) === '[2,2]' && JSON.stringify(ev('enOrdre(9.31, 6.8999999999)')) === '[9.31,6.9]');

console.log('\n7. LA FICHE D’UN CÂBLE (08-fiche) : UNE SEULE VÉRITÉ');
{ // (v87, le lecteur, Q1) sans consommation écrite, W-012 n'a plus de courant (avant : les 5 A et 9,31 A du profil de 102CB1, prêtés)
  ev('CONSOS = new Map(); ALIMS = new Map(); CHUTES_DJ = new Map(); brancher(contratExemple(), "102CB1", chargesExemple().get("102CB1"), 10)');
  const w = ev('intensiteCalculee([...ALIMS.keys()].find(l => l.cable === "W-012"))'), cw = ev('chuteDuFil([...ALIMS.keys()].find(l => l.cable === "W-012"))');
  ok('W-012, la consommation de 104LP1 pas écrite : courant INCONNU (`source` « inconnu », I null) — ni les 5 A ni les 9,31 A de 102CB1 —, rien qui dépasse, aucune chute ; ce qu’il faut écrire : 104LP1', w.source === 'inconnu' && w.I === null && !w.trop.length && !w.pointe && cw.dU === null && !cw.total && w.aval.manque.join() === '104LP1', w.source + ' · ' + w.aval.manque.join());
  // la lampe écrite comme le profil de 102CB1 : W-012 porte sa branche
  ev('CONSOS = new Map([["104LP1", { perm: { i: 5 }, dem: { i: 9.31, t: 125 } }]]); ALIMS = new Map(); CHUTES_DJ = new Map(); brancher(contratExemple(), "102CB1", chargesExemple().get("102CB1"), 10)');
  const LX = ev('[...ALIMS.keys()]'), W12 = LX.find(l => l.cable === 'W-012'), W11 = LX.find(l => l.cable === 'W-011'); bac.W12f = W12; bac.W11f = W11;
  const x = ev('intensiteCalculee(W12f)'), c = ev('chuteDuFil(W12f)'), T5 = 95 + 40 * Math.pow(5 / 6.9, 2);
  ok('W-012 (DR20 sous 102CB1), la consommation de 104LP1 écrite (5 A, 9,31 A pendant 125 s) : 5 A sur 6,9 A admis en continu (`source` « branche ») ; sa pointe (9,31 A, 2,1 min) contre 6,9 A — elle dépasse', x.source === 'branche' && x.I === 5 && pres(x.continu, 6.9) && pres(x.pointe.admis, 6.9) && x.trop.length === 1 && x.trop[0].i === 9.31, `${x.I} A sur ${x.continu.toFixed(2)} A · pointe ${x.pointe.i} A sur ${x.pointe.admis.toFixed(2)} A`);
  // (v86) sa chute en ligne va maintenant jusqu'à la lampe 104LP1, par le contact du relais : le disjoncteur, lui, le relais, le DR22
  ok('sa part de la chute en ligne est SON segment : 1,143 V (à 116 °C), plus 0,830 V à 20 °C — le total 3,712 V en est la somme avec le disjoncteur (0,2 V), le relais 103RL1 (0,2 V) et le DR22 vers 104LP1', pres(c.dU, 0.0332 * kT(T5) * 25) && pres(c.total.dU, c.dU + 0.2 + 0.2 + 0.060 * kT(95 + 40 * Math.pow(5 / 5.1, 2)) * 25) && c.total.bout[0] === '104LP1' && pres(c.T, T5) && c.I === 5, `${c.dU.toFixed(4)} V dans le câble, ${c.total.dU.toFixed(4)} V en ligne`);
  ok('sa résistance `rd` est celle de son conducteur sous son courant : ρ × L × I = sa part (R × I se vérifie sur la fiche et au récapitulatif)', pres(x.rd.rho / 1000 * c.L * x.I, c.dU) && pres(x.tc.T, T5));
  const y = ev('intensiteCalculee(W11f)'), d = ev('chuteDuFil(W11f)');
  ok('W-011 (la batterie → 102CB1, en amont) porte les 5 A de 102CB1 — la somme de ce qui est écrit en aval, son profil —, mais n’a pas de « chute en ligne » : sa chute est celle du câble seul (DR16, 5 m, 5 A)', y.I === 5 && y.source === 'profil' && y.al.amont && !d.total && pres(d.dU, 0.0145 * kT(95 + 40 * Math.pow(5 / 11.7, 2)) * 25), d.dU.toFixed(4));
  ev('CONSOS = new Map(); ALIMS = new Map(); CHUTES_DJ = new Map(); brancher(contratExemple(), "102CB1", null, 10)');
  const z = ev('intensiteCalculee([...ALIMS.keys()].find(l => l.cable === "W-012"))'), cz = ev('chuteDuFil([...ALIMS.keys()].find(l => l.cable === "W-012"))'), z11 = ev('intensiteCalculee([...ALIMS.keys()].find(l => l.cable === "W-011"))');
  ok('sans profil ni consommation : aucun courant prêté — ni le calibre de 102CB1 (avant v87 : 10 A « au pire »), ni pour le câble de la batterie — ; aucune chute', z.source === 'inconnu' && z.I === null && !cz.total && cz.dU === null && z11.I === null && z11.source === 'inconnu', `${z.source} · W-011 ${z11.source}`);
  ev('ALIMS = new Map(); CHUTES_DJ = new Map()');
  const h = ev('intensiteCalculee(W12f)');
  ok('(v88, le lecteur : « l’outil dit la vérité, pas inventé ») sans disjoncteur en amont, plus d’hypothèse : le courant est inconnu, aucun point de charge, rien de « trop fin »', h.source === 'sans' && h.I == null && h.inconnu === true && !h.al && h.pts.length === 0 && h.trop.length === 0, JSON.stringify({ source: h.source, I: h.I }));
  ev('app.simu = { ...HYPOTHESES, ambiante: 70 }; CONSOS = new Map([["104LP1", { dem: { i: 20, t: 2 }, perm: { i: 5 } }]]); ALIMS = new Map(); CHUTES_DJ = new Map(); brancher(contratExemple(), "102CB1", { dem: { i: 20, t: 2 }, perm: { i: 5 } }, 10)');
  const a = ev('intensiteCalculee([...ALIMS.keys()].find(l => l.cable === "W-012"))');
  ok('à 70 °C, la pointe de 2 s se compare au palier 2 s déclassé du faisceau seul (39 × 0,6 = 23,4 A), le continu à 6,9 × 1,275 — comme la protection (avant v84 : 29,8 A pour 2 s)', pres(a.pointe.admis, 23.4) && pres(a.continu, 6.9 * Math.sqrt(65 / 40)), `${a.pointe.admis.toFixed(2)} A pour 2 s · ${a.continu.toFixed(2)} A en continu`);
  ev('app.simu = { ...HYPOTHESES }; CONSOS = new Map()'); }
{ const W12 = L.find(l => l.cable === 'W-012'); bac.Wc = W12; bac.Wc5 = ev('liaison')({ ...W12, longueur: 5 });
  ok('le coût d’un câble grossi : (masse du nouveau − masse de l’ancien) g/m × longueur m — DR20 → DR16 sur 5 m : (14,61 − 6,85) × 5 = +39 g', ev('coutDuType(Wc5, "DR16")') === '+39 g sur 5 m', ev('coutDuType(Wc5, "DR16")'));
  ok('sans longueur au fichier, sur la longueur supposée, et dit (« supposés ») ; plus fin : un signe moins ; un type que la base ne pèse pas : rien', ev('coutDuType(Wc, "DR16")') === '+39 g sur 5 m supposés' && ev('coutDuType(Wc5, "DR22")') === '−14 g sur 5 m' && ev('coutDuType(Wc5, "ZZ16")') === '', ev('coutDuType(Wc5, "DR22")')); }

console.log('\n8. LE COURANT D’UNE BRANCHE : CE QU’ELLE ALIMENTE EN AVAL');
{ /* l'exemple (v86 : le courant traverse ce qui conduit) — 102CB1:2 → W-012 → le contact A1-A2 du relais 103RL1 → W-013 → la
     lampe 104LP1 : la PUISSANCE ; 102CB1:2 → W-015 → l'interrupteur 395SW1 → W-014 → la bobine de 103RL1 : la COMMANDE — et,
     par 395SW1 au folio 3, W-327 et W-328 vers les entrées A5, A6 du calculateur 300XC1, W-380 vers la lampe 391LP1 */
  const P = ev('pointsDuProfil(chargesExemple().get("102CB1"))'), T24 = i => 95 + 40 * Math.pow(i / 3.9, 2), T20 = i => 95 + 40 * Math.pow(i / 6.9, 2), T22 = i => 95 + 40 * Math.pow(i / 5.1, 2); bac.P = P;
  ev('CONSOS = new Map()');
  const B0 = ev('branchesDepuis(contratExemple(), "102CB1")'), br = c => [...B0].find(([l]) => l.cable === c)[1];
  // (v87, le lecteur, Q1) plus de « règle prudente » : une charge sans consommation écrite rend sa branche INCONNUE (avant : le courant total de 102CB1)
  ok('sans consommation écrite : W-012 et W-013, de part et d’autre du contact du relais, ont un courant INCONNU — plus le courant total de 102CB1 — ; ce qui manque : la lampe 104LP1', !br('W-012').ecrite && br('W-012').inconnu && br('W-013').inconnu && !br('W-012').commande && br('W-012').manque.join() === '104LP1' && br('W-013').manque.join() === '104LP1' && !B0.has(ev('contratExemple()').find(l => l.cable === 'W-011')), br('W-012').manque.join());
  ok('… W-014 ne mène qu’à la bobine de 103RL1 : une branche de COMMANDE, au courant inconnu — jamais le total (`inconnu`) ; ce qui manque : la bobine de 103RL1', br('W-014').commande && br('W-014').inconnu && br('W-014').sans.map(x => x.repere + '/' + x.nature).join() === '103RL1/bobine' && br('W-014').manque.join() === '103RL1');
  ok('… W-327 et W-328 ne mènent qu’aux entrées A5 et A6 du calculateur 300XC1 : de la commande aussi, et rien à écrire (la consommation d’un calculateur se tire sur ses broches d’alimentation, pas sur une entrée)', br('W-327').inconnu && br('W-328').inconnu && !br('W-327').manque.length && br('W-327').sans.map(x => x.repere + '/' + x.nature).join() === '300XC1/entree');
  ok('… W-015 alimente aussi la lampe 391LP1 (par la borne 4 de 395SW1, au folio 3), une charge sans consommation : inconnu lui aussi (avant : le courant total) ; sa branche dit les deux à écrire (la bobine de 103RL1, 391LP1)', !br('W-015').commande && br('W-015').inconnu && !br('W-015').ecrite && br('W-015').manque.join() === '103RL1,391LP1' && br('W-015').sans.map(x => x.repere).join() === '103RL1,300XC1', br('W-015').manque.join());
  ev('CONSOS = new Map([["104LP1", { perm: { i: 4.9 }, dem: { i: 9.2, t: 125 } }], ["103RL1", { perm: { i: 0.15 } }], ["391LP1", { perm: { i: 0.05 } }]])');
  const B1 = ev('branchesDepuis(contratExemple(), "102CB1")'), bs = c => [...B1].find(([l]) => l.cable === c)[1];
  ok('consommations écrites (104LP1 : 4,9 A, 9,2 A au démarrage pendant 125 s ; la bobine de 103RL1 : 0,15 A ; 391LP1 : 0,05 A) : W-012 et W-013 portent le même courant, 4,9 A, et 9,2 A en pointe — le contact du relais est en série', bs('W-012').ecrite && bs('W-012').perm === 4.9 && bs('W-013').perm === 4.9 && bs('W-013').pointe === 9.2 && bs('W-013').points[0].t === 125, `W-012 ${bs('W-012').perm} A · W-013 ${bs('W-013').perm} A`);
  ok('W-014 porte la bobine, 0,15 A (une branche de commande, écrite) ; W-015 la bobine et 391LP1, 0,2 A — sans les entrées de 300XC1, que VOLTA ne connaît pas (`sans`) ; W-380, 0,05 A ; W-327 reste inconnu', bs('W-014').ecrite && bs('W-014').commande && pres(bs('W-014').perm, 0.15) && pres(bs('W-015').perm, 0.2) && bs('W-015').sans.map(x => x.repere).join() === '300XC1' && pres(bs('W-380').perm, 0.05) && bs('W-327').inconnu, `W-014 ${bs('W-014').perm} A · W-015 ${bs('W-015').perm} A · W-380 ${bs('W-380').perm} A`);
  const F = ev('filsDepuis(contratExemple(), "102CB1")'), f15 = F.find(f => f.cable === 'W-015'), f14 = F.find(f => f.cable === 'W-014'), f27 = F.find(f => f.cable === 'W-327');
  ok('la protection reçoit le profil de la branche (`points`) : W-015, 0,2 A pour toujours ; W-014 est de commande (`commande`) ; W-327, au courant inconnu (`inconnu`), n’en reçoit aucun', f15.points && f15.points.length === 1 && pres(f15.points[0].i, 0.2) && f15.points[0].t === Infinity && f14.commande && !f14.inconnu && f27.inconnu && !f27.points && f14.via === '395SW1');
  const C = ev('chutesDepuis(app.norme, contratExemple(), "102CB1", 5, {}, P.filter(p => p.t !== Infinity), { famille: null, calibre: 10 })'), kX = C.find(c => c.bout[0] === '103RL1');
  const uX = 0.2 + 0.114 * kT(T24(0.2)) * 5 * 0.2 + 0.114 * kT(T24(0.15)) * 5 * 0.15;
  ok('la chute vers la bobine de 103RL1 : 0,2 V du 10 A + le DR24 W-015 à 0,2 A + le DR24 W-014 à 0,15 A = 0,458 V (avant v86 : 4,63 V au courant total) ; l’interrupteur 395SW1 n’est dans aucune table : sa chute n’est pas comptée, et le chemin le dit', kX && pres(kX.dU, uX) && !kX.trop && kX.inconnus.some(t => /^395SW1 \(interrupteur\) : sa chute n’est dans aucune table/.test(t)), kX && kX.dU.toFixed(4) + ' V');
  const k104 = C.find(c => c.bout[0] === '104LP1');
  ok('vers 104LP1 : W-012 et W-013 à 4,9 A au permanent, à 9,2 A pendant la pointe de 102CB1 (125 s : ils chauffent) ; le relais 0,2 V, le disjoncteur 0,2 V', k104 && pres(k104.dU, 0.2 + 0.0332 * kT(T20(4.9)) * 5 * 4.9 + 0.2 + 0.060 * kT(T22(4.9)) * 5 * 4.9) && pres(k104.pointes[0].dU, 0.2 + 0.0332 * kT(T20(9.2)) * 5 * 9.2 + 0.2 + 0.060 * kT(T22(9.2)) * 5 * 9.2), k104 && `${k104.dU.toFixed(4)} V · pointe ${k104.pointes[0].dU.toFixed(4)} V`);
  const li = (de, bDe, vers, bVers, cable, type) => ev('liaison')({ de, borneDe: bDe, vers, borneVers: bVers, cable, type });
  // UN INTERRUPTEUR EN SÉRIE, UN CONTACT EN SÉRIE : le circuit de l'exemple tel que le folio 1 le montre, sans le folio 3
  bac.S = [li('1CB1', '2', '2SW1', '1', 'W-a', 'DR24'), li('2SW1', '2', '3RL1', 'X1', 'W-b', 'DR24'), li('3RL1', 'X2', '9G', '', 'W-c', 'DR24'), li('1CB1', '2', '3RL1', 'A1', 'W-d', 'DR20'), li('3RL1', 'A2', '4LP1', '1', 'W-e', 'DR20'), li('4LP1', '2', '9G', '', 'W-f', 'DR20')];
  ev('CONSOS = new Map()');
  const S0 = ev('branchesDepuis(S, "1CB1")'), s0 = c => [...S0].find(([l]) => l.cable === c)[1];
  ok('un interrupteur en série vers la bobine d’un relais : ses deux câbles portent le MÊME courant — de commande, inconnu, jamais le total ; le contact du relais en série vers une lampe : ses deux câbles aussi, inconnus tant que la lampe n’est pas écrite (avant v87 : la règle prudente)', s0('W-a').inconnu && s0('W-b').inconnu && s0('W-a').sans[0].repere === '3RL1' && s0('W-d').inconnu && !s0('W-d').commande && s0('W-d').manque.join() === '4LP1' && s0('W-e').manque.join() === '4LP1');
  ev('CONSOS = new Map([["3RL1", { perm: { i: 0.12 } }], ["4LP1", { perm: { i: 3 } }]])');
  const S1 = ev('branchesDepuis(S, "1CB1")'), s1 = c => [...S1].find(([l]) => l.cable === c)[1];
  ok('la bobine écrite (0,12 A) : les deux câbles de l’interrupteur portent 0,12 A ; la lampe écrite (3 A) : les deux câbles du contact, 3 A', pres(s1('W-a').perm, 0.12) && pres(s1('W-b').perm, 0.12) && s1('W-d').perm === 3 && s1('W-e').perm === 3);
  bac.D = [li('5CB1', '2', '50VT1', '1', 'W-a', 'DR16'), li('50VT1', '1', '50VT1', '2', 'W-s', 'DR16'), li('50VT1', '1', '51EQ1', '1', 'W-b', 'DR22'), li('50VT1', '2', '52EQ2', '1', 'W-c', 'DR22'), li('5CB1', '2', '53EQ3', '1', 'W-d', 'DR22')];
  ev('CONSOS = new Map([["51EQ1", { perm: { i: 2 }, dem: { i: 5, t: 3 } }], ["52EQ2", { perm: { i: 1 } }]])');
  const B2 = ev('branchesDepuis(D, "5CB1")'), ba = [...B2].find(([l]) => l.cable === 'W-a')[1], bb = [...B2].find(([l]) => l.cable === 'W-b')[1], bd = [...B2].find(([l]) => l.cable === 'W-d')[1];
  ok('par une barrette : W-a alimente 51EQ1 et 52EQ2 — la somme (2 + 1 = 3 A ; au démarrage 5 + 1 = 6 A pendant 3 s) ; W-b, 51EQ1 seul ; W-d, 53EQ3 sans consommation : inconnu, et il dit quoi écrire', ba.ecrite && ba.perm === 3 && ba.pointe === 6 && ba.points[0].t === 3 && bb.perm === 2 && bb.pointe === 5 && !bd.ecrite && bd.inconnu && bd.manque.join() === '53EQ3', `W-a ${ba.perm} / ${ba.pointe} A · W-b ${bb.perm} / ${bb.pointe} A`);
  bac.E = [li('6CB1', '2', '60EQ1', '1', 'W-e', 'DR22')];
  const be = [...ev('branchesDepuis(E, "6CB1", r => r === "6CB1" ? { perm: { i: 3 } } : null)')][0][1], be0 = [...ev('branchesDepuis(E, "6CB1", () => null)')][0][1];
  ok('un disjoncteur à une seule charge, son profil écrit sur lui : son câble alimente tout — ce profil, exact (`tout`), sans rien demander ; sans rien d’écrit, ni sur lui ni sur sa charge : inconnu (avant v87 : le profil… qui n’existait pas)', be.tout && !be.ecrite && !be.inconnu && !be.manque.length && be0.tout && be0.inconnu && be0.manque.join() === '60EQ1');
  // LA FICHE D'UN CÂBLE (08-fiche), avec et sans les consommations
  ev('CONSOS = new Map(); ALIMS = new Map(); CHUTES_DJ = new Map(); brancher(contratExemple(), "102CB1", chargesExemple().get("102CB1"), 10)');
  const x13 = ev('intensiteCalculee([...ALIMS.keys()].find(l => l.cable === "W-013"))');
  ok('la fiche de W-013 (103RL1:A2 → 104LP1) : il est sous 102CB1, À TRAVERS le contact A1 → A2 de 103RL1 — plus jamais « Aucun disjoncteur en amont » — ; son courant est inconnu tant que 104LP1 n’est pas écrite (avant v87 : 5 A, la règle prudente)', x13.al && x13.al.nom === '102CB1' && x13.source === 'inconnu' && x13.I === null && x13.inconnu && x13.aval.manque.join() === '104LP1' && x13.traverses.length === 1 && x13.traverses[0].repere === '103RL1' && x13.traverses[0].quoi === 'relais' && x13.traverses[0].de === 'A1' && x13.traverses[0].a === 'A2', x13.traverses.map(t => t.repere + ' ' + t.de + '→' + t.a).join());
  const x14 = ev('intensiteCalculee([...ALIMS.keys()].find(l => l.cable === "W-014"))'), d14 = ev('chuteDuFil([...ALIMS.keys()].find(l => l.cable === "W-014"))');
  ok('la fiche de W-014 : une branche de commande — `source` « commande », courant inconnu (null), aucune pointe qui dépasse, pas de « courant total » ; il vient de 102CB1 à travers 395SW1 ; sa chute ne se calcule pas (elle dépend de ce courant)', x14.source === 'commande' && x14.I === null && !x14.trop.length && !x14.pointe && !x14.totalFaute && x14.commande && x14.traverses[0].repere === '395SW1' && d14.dU === null && !d14.total);
  bac.F14 = f14; const p14 = ev('protegerFil(app.norme, 10, { ...F14, inconnu: true, points: null }, { ...HYPOTHESES }, contexteDeProtection(app.norme, { ...HYPOTHESES }, null, pointsDuProfil(chargesExemple().get("102CB1"))))');
  ok('la protection d’un câble de commande au courant inconnu : rien ne juge ce qu’il porte (aucune phase, jamais « trop fin pour la transition ») — seul reste ce qui ne dépend pas de son courant (le calibre contre le câble)', !p14.phases.length && p14.verdict !== 'fil' && !p14.contactDepasse && p14.permanent === 0, p14.verdict);
  bac.FC = ev('filsDepuis(contratExemple(), "102CB1")'); const dm = ev('verdictDisjonction(app.norme, "", 10, chargesExemple().get("102CB1"), { fils: FC, hyp: { ...HYPOTHESES } })').meilleur.filsAChanger.map(x => x.cable).sort().join(',');
  ok('aucun câble de commande ne grossit pour le calibre (09 bis, `meilleurDe`) : W-014, W-327, W-328 restent ; les câbles de puissance que le 10 A ne protège pas, eux, le demandent — même au courant inconnu : la protection ne dépend d’aucun courant (le lecteur, Q1)', dm === 'W-012,W-013,W-015,W-380', dm);
  ev('CONSOS = new Map([["103RL1", { perm: { i: 0.15 } }], ["391LP1", { perm: { i: 0.05 } }]]); ALIMS = new Map(); CHUTES_DJ = new Map(); brancher(contratExemple(), "102CB1", chargesExemple().get("102CB1"), 10)');
  const x15 = ev('intensiteCalculee([...ALIMS.keys()].find(l => l.cable === "W-015"))');
  ok('la fiche de W-015, consommations écrites : il porte 0,2 A (`source` « branche ») sur 3,9 A admis — plus de pointe qui dépasse, plus de « Passer en DR16 » au courant total', x15.source === 'branche' && pres(x15.I, 0.2) && !x15.trop.length && !x15.pointe && !x15.totalFaute && x15.aval.sans.map(y => y.repere).join() === '300XC1', `${x15.I} A`);
  ev('CONSOS = new Map(); ALIMS = new Map(); CHUTES_DJ = new Map(); brancher(contratExemple(), "102CB1", chargesExemple().get("102CB1"), 10)');
  const y15 = ev('intensiteCalculee([...ALIMS.keys()].find(l => l.cable === "W-015"))'), y11 = ev('intensiteCalculee([...ALIMS.keys()].find(l => l.cable === "W-011"))');
  ok('sans consommation : W-015 a un courant inconnu (avant v87 : le total de 102CB1, 5 A et 9,31 A en pointe, qu’il ne portait pas) — rien qui dépasse — ; ce qui manque : 103RL1, 391LP1', y15.source === 'inconnu' && y15.I === null && !y15.trop.length && y15.aval.manque.join() === '103RL1,391LP1');
  ok('le câble de la batterie (W-011, en amont) porte le profil écrit de 102CB1 — la somme de ce qui est écrit en aval —, sans rien qui manque', y11.I === 5 && y11.source === 'profil' && !y11.partiel && !y11.aval); }

console.log('\n9. LA TRAVERSÉE : CE QUI CONDUIT, CE QUI CONSOMME');
{ const li = (de, bDe, vers, bVers, cable, type) => ev('liaison')({ de, borneDe: bDe, vers, borneVers: bVers, cable, type });
  ok('le contact A1 d’un relais conduit vers A2 et A3 (son pôle A), ni vers B1 ni vers sa bobine ; la bobine (X1) ne conduit pas ; un relais aux bornes 1, 2, 3 ne se traverse pas (VOLTA ne devine pas sa bobine)', JSON.stringify(ev('traverseeDe("5RL1", "A1", ["A1", "A2", "A3", "B1", "B2", "X1", "X2"])')) === JSON.stringify({ quoi: 'relais', pole: 'A', bornes: ['A2', 'A3'] }) && ev('traverseeDe("5RL1", "X1", ["A1", "X1", "X2"])') === null && ev('traverseeDe("381RL1", "1", ["1", "2", "3"])') === null);
  ok('un interrupteur relie toutes ses bornes (395SW1 : 1 avec 2, 3 et 4) — ou celles d’un même pôle quand elles s’écrivent par lettre ; un contacteur se lit comme un relais ; un bouton-poussoir, un pressostat comme un interrupteur ; une lampe ne conduit pas', ev('traverseeDe("395SW1", "1", ["1", "2", "3", "4"])').bornes.join() === '2,3,4' && ev('traverseeDe("7SW2", "A1", ["A1", "A2", "B1", "B2"])').bornes.join() === 'A2' && ev('traverseeDe("8CT1", "B1", ["B1", "B2", "X1"])').quoi === 'contacteur' && ev('traverseeDe("9PB1", "1", ["1", "2"])').quoi === 'interrupteur' && ev('traverseeDe("10PR1", "1", ["1", "2"])').quoi === 'interrupteur' && ev('traverseeDe("104LP1", "1", ["1", "2"])') === null);
  ok('ce que tire un bout : la bobine d’un relais, d’un contacteur (X1, X2) ; l’entrée d’un calculateur (CP) ou du connecteur d’un équipement (XC) ; le reste est une charge — un relais vu à son contact aussi', ev('natureDuBout("103RL1", "X1")') === 'bobine' && ev('natureDuBout("8CT1", "X2")') === 'bobine' && ev('natureDuBout("300XC1", "A5")') === 'entree' && ev('natureDuBout("5CP1", "3")') === 'entree' && ev('natureDuBout("104LP1", "1")') === 'charge' && ev('natureDuBout("103RL1", "A1")') === 'charge');
  bac.J = [li('1CB1', '2', '5LP1', '1', 'W-j1', 'DR22'), li('5LP1', '1', '6LP2', '1', 'W-j2', 'DR22'), li('5LP1', '2', '9G', '', 'W-j3', 'DR22'), li('6LP2', '2', '9G', '', 'W-j4', 'DR22')];
  const J = ev('cheminsDepuis(J, "1CB1")'), jB = ev('branchesDepuis(J, "1CB1", () => null)'), jb = c => [...jB].find(([l]) => l.cable === c)[1];
  ok('une borne où arrivent deux câbles est un même potentiel : le chemin finit sur la lampe 5LP1 (elle consomme) ET repart par sa borne 1 jusqu’à 6LP2 — W-j1 alimente les deux lampes, W-j2 la seconde', J.length === 2 && J.some(c => c.bout[0] === '5LP1') && J.some(c => c.bout[0] === '6LP2' && c.segments.some(s => s.traverse === 'jonction')) && jb('W-j1').tout && jb('W-j2').bouts.join() === '6LP2', J.map(c => c.bout[0]).join());
  bac.K = [li('1CB1', '2', '7SW1', '1', 'W-k1', 'DR22'), li('7SW1', '2', '1CB1', '2', 'W-k2', 'DR22'), li('7SW1', '3', '9G', '', 'W-k3', 'DR22'), li('7SW1', '3', '8LP1', '1', 'W-k4', 'DR22')];
  const K = ev('cheminsDepuis(K, "1CB1")');
  ok('un contact supposé fermé ne fait pas un court-circuit : l’interrupteur 7SW1, relié à la masse par sa borne 3, ne mène pas à la masse ; un chemin qui revient sur son disjoncteur (W-k2) est une boucle : il ne compte pas — reste la lampe 8LP1', K.length >= 1 && K.every(c => c.bout[0] === '8LP1'), K.map(c => c.bout[0]).join());
  bac.R = [li('1CB1', '2', '5RL1', 'A1', 'W-r1', 'DR20'), li('5RL1', 'A2', '6LP1', '1', 'W-r2', 'DR20'), li('1CB1', '3', '8CT1', 'A1', 'W-r3', 'DR20'), li('8CT1', 'A2', '7LP2', '1', 'W-r4', 'DR20'), li('1CB1', '4', '9SW1', '1', 'W-r5', 'DR20'), li('9SW1', '2', '8LP3', '1', 'W-r6', 'DR20')];
  // (v87) chaque lampe écrite à 5 A : sans consommation, aucune chute ne se calculerait (le lecteur, Q1)
  const CR = ev('chutesDepuis(app.norme, R, "1CB1", 5, { chuteDisjoncteur: false }, [], null, r => /LP/.test(r) ? { perm: { i: 5 } } : null)'), u = b => CR.find(c => c.bout[0] === b);
  ok('la chute d’un composant traversé : le relais 0,2 V, le contacteur 0,12 V (l’Excel du lecteur, « Du max ») — de mêmes câbles, à 5 A : les trois chemins ne diffèrent que de là ; l’interrupteur n’est dans aucune table : pas compté, et dit', pres(u('6LP1').dU - u('8LP3').dU, 0.2, 1e-9) && pres(u('7LP2').dU - u('8LP3').dU, 0.12, 1e-9) && u('8LP3').inconnus.length === 1 && !u('6LP1').inconnus.length, [u('6LP1').dU, u('7LP2').dU, u('8LP3').dU].map(x => x.toFixed(3)).join(' / ')); }

console.log('\n10. LE CIRCUIT D’UN DISJONCTEUR, TEL QUE LE PLAN L’ÉCLAIRE');
{ const K = ev('circuitDuDisjoncteur(contratExemple(), "102CB1")'), c = n => [...K.cables].find(([l]) => l.cable === n), r = n => c(n) ? c(n)[1].role + ' ' + c(n)[1].sens : '';
  ok('la source : W-011, de la batterie 101BT1 au disjoncteur (le courant y entre par son bout `de`) ; le retour de la batterie, W-018, de la masse à sa borne 2 (sens `vers`)', r('W-011') === 'source de' && r('W-018') === 'source vers', r('W-011') + ' · ' + r('W-018'));
  ok('l’aller, dans le sens du courant : W-012 puis W-013 par le contact du relais ; W-015 de 102CB1 vers 395SW1 (le fichier l’écrit dans l’autre sens : `vers`), W-014 vers la bobine, W-327, W-328 et W-380 par 395SW1', r('W-012') === 'aller de' && r('W-013') === 'aller de' && r('W-015') === 'aller vers' && r('W-014') === 'aller vers' && r('W-327') === 'aller de' && r('W-328') === 'aller de' && r('W-380') === 'aller vers');
  ok('le retour de chaque charge à la masse : W-016 (104LP1), W-017 (la bobine de 103RL1), W-355 (391LP1) ; pas celui du calculateur 300XC1 (une entrée revient par lui) : W-360 reste éteint', r('W-016') === 'retour de' && r('W-017') === 'retour de' && r('W-355') === 'retour de' && !c('W-360'));
  ok('les repères parcourus : la source, le disjoncteur, le relais et l’interrupteur traversés, les charges, les masses — douze câbles, aucun autre ; les traversées : 103RL1 (relais), 395SW1 (interrupteur)', ['101BT1', '102CB1', '103RL1', '104LP1', '395SW1', '300XC1', '391LP1', '901G', '909G'].every(x => K.reperes.includes(x)) && K.cables.size === 12 && K.traverses.map(t => t.repere + ' ' + t.quoi).join() === '103RL1 relais,395SW1 interrupteur', K.cables.size + ' câbles');
  ok('chaque câble dit les chemins où il est : W-015 en porte quatre (la bobine, deux entrées, la lampe 391LP1), W-013 un seul, son retour W-016 le même ; la source, aucun (elle est de tous)', c('W-015')[1].chemins.length === 4 && c('W-013')[1].chemins.length === 1 && c('W-016')[1].chemins.join() === c('W-013')[1].chemins.join() && !c('W-011')[1].chemins.length); }

console.log('\n11. L’INDEX DES CHEMINS, GARDÉ D’UN APPEL À L’AUTRE, SE REFAIT QUAND LE CONTRAT CHANGE');
{ const li = (de, bDe, vers, bVers, cable) => ev('liaison')({ de, borneDe: bDe, vers, borneVers: bVers, cable, type: 'DR22' });
  bac.X = [li('1CB1', '2', '5LP1', '1', 'W-x1'), li('5LP1', '2', '9G', '', 'W-x2'), li('1CB1', '2', '6RL1', 'A1', 'W-x3'), li('6RL1', 'A2', '7LP1', '1', 'W-x4')];
  const vu = () => ev('cheminsDepuis(X, "1CB1")').map(c => c.bout[0] + ':' + c.bout[1]).sort().join(' '), neuf = () => ev('cheminsDepuis([...X], "1CB1")').map(c => c.bout[0] + ':' + c.bout[1]).sort().join(' ');
  const a = vu(), b = vu();
  ev('X.push(liaison({ de: "1CB1", borneDe: "3", vers: "8LP1", borneVers: "1", cable: "W-x5", type: "DR22" }))'); const c = vu();
  ev('X[3].vers = "7LP9"'); const d = vu();
  ev('X.splice(0, 1)'); const e = vu();
  ev('X[1] = liaison({ ...X[1], vers: "6LP4", borneVers: "1" })'); const f = vu();
  ok('les mêmes liaisons : le même résultat d’un appel à l’autre (5LP1 et 7LP1, par le contact de 6RL1)', a === b && a === '5LP1:1 7LP1:1', a);
  ok('une liaison ajoutée, une autre renommée sur place, une retirée, une remplacée : chaque fois le chemin suit, comme sur un contrat neuf', c === '5LP1:1 7LP1:1 8LP1:1' && d === '5LP1:1 7LP9:1 8LP1:1' && e === '7LP9:1 8LP1:1' && f === '6LP4:1 8LP1:1' && f === neuf(), [c, d, e, f].join(' | ')); }

console.log('\n12. LE CÂBLE DE MASSE PORTE LE COURANT DE SA CHARGE (S1)');
{ /* le folio 1 à la main : le retour de la lampe 104LP1 (W-016, DR22 vers 901G), celui de la bobine de 103RL1 (W-017, DR24 depuis
     X2), celui de la batterie 101BT1 (W-018, DR16 depuis sa borne 2) ; et au folio 3, celui de 391LP1 (W-355). Avant, les trois
     du folio 1 étaient à « 2 A supposés » (aucun disjoncteur en amont) */
  ev('CONSOS = new Map()'); const R0 = ev('retoursDepuis(contratExemple(), "102CB1")'), r0 = c => { const e = [...R0].find(([l]) => l.cable === c); return e ? e[1] : null; };
  ok('les retours de 102CB1 : W-016 ferme 104LP1, W-017 la bobine de 103RL1 (depuis X2, sa borne de bobine), W-355 la lampe 391LP1 ; W-018 est le retour de la source 101BT1 — quatre câbles, aucun autre (pas W-360 : le calculateur 300XC1 n’est qu’une entrée)', R0.size === 4 && r0('W-016').retour === 'charge' && r0('W-016').de.join() === '104LP1' && r0('W-017').de.join() === '103RL1' && r0('W-355').de.join() === '391LP1' && r0('W-018').retour === 'source' && r0('W-018').de.join() === '101BT1' && !r0('W-360'), [...R0].map(([l, R]) => l.cable + ':' + R.retour).join(' '));
  ok('sans consommation écrite, le retour a le même courant que son aller — inconnu : W-016 comme W-013 (ce qui manque : 104LP1), W-017 comme W-014 (de commande : la bobine de 103RL1)', r0('W-016').inconnu && !r0('W-016').commande && r0('W-016').manque.join() === '104LP1' && r0('W-017').inconnu && r0('W-017').commande && r0('W-017').sans.map(x => x.repere + '/' + x.nature).join() === '103RL1/bobine');
  ev('CONSOS = new Map([["104LP1", { perm: { i: 4.9 }, dem: { i: 9.2, t: 125 } }], ["103RL1", { perm: { i: 0.15 } }], ["391LP1", { perm: { i: 0.05 } }]])');
  const R1 = ev('retoursDepuis(contratExemple(), "102CB1")'), r1 = c => [...R1].find(([l]) => l.cable === c)[1], B1 = ev('branchesDepuis(contratExemple(), "102CB1")'), b1 = c => [...B1].find(([l]) => l.cable === c)[1];
  ok('consommations écrites : le retour porte exactement son aller — W-016 = W-013 (4,9 A, 9,2 A pendant 125 s), W-017 = W-014 (0,15 A), W-355 = W-380 (0,05 A)', r1('W-016').ecrite && r1('W-016').perm === b1('W-013').perm && r1('W-016').pointe === b1('W-013').pointe && r1('W-016').points[0].t === 125 && pres(r1('W-017').perm, b1('W-014').perm) && pres(r1('W-355').perm, b1('W-380').perm), `W-016 ${r1('W-016').perm} / ${r1('W-016').pointe} A · W-017 ${r1('W-017').perm} A · W-355 ${r1('W-355').perm} A`);
  // la fiche (08-fiche, `intensiteCalculee`) : le retour lu comme la page le lit (la carte des alimentations : `brancher`)
  ev('ALIMS = new Map(); CHUTES_DJ = new Map(); brancher(contratExemple(), "102CB1", chargesExemple().get("102CB1"), 10)');
  const fx = c => ev('intensiteCalculee([...ALIMS.keys()].find(l => l.cable === "' + c + '"))'), x16 = fx('W-016'), x13 = fx('W-013'), x18 = fx('W-018'), x11 = fx('W-011');
  const T22 = i => 95 + 40 * Math.pow(i / 5.1, 2), T16 = i => 95 + 40 * Math.pow(i / 11.7, 2);
  ok('la fiche de W-016 (DR22, le retour de 104LP1) : 4,9 A sur 5,1 A admis en continu, et 9,2 A pendant 2,1 min — plus que les 5,1 A : le même problème que son aller W-013 (avant : « 2 A supposés »)', x16.retour && x16.retour.quoi === 'charge' && x16.retour.de.join() === '104LP1' && x16.source === 'branche' && x16.I === x13.I && x16.I === 4.9 && pres(x16.continu, 5.1) && x16.trop.length === 1 && x16.trop[0].i === 9.2 && x13.trop.length === 1, `${x16.I} A sur ${x16.continu.toFixed(2)} A · pointe ${x16.trop[0].i} A`);
  ok('la fiche de W-018 (DR16, le retour de la batterie) : les 5 A et 9,31 A pendant 2,1 min de 102CB1 — le même courant que son aller W-011 — sur 11,7 A admis : il les porte ; côté source, pas sous la protection de 102CB1', x18.retour && x18.retour.quoi === 'source' && x18.al.amont && x18.I === 5 && x18.I === x11.I && x18.pointe.i === 9.31 && pres(x18.continu, 11.7) && !x18.trop.length, `${x18.I} A, ${x18.pointe.i} A en pointe, sur ${x18.continu.toFixed(1)} A`);
  const d18 = ev('chuteDuFil([...ALIMS.keys()].find(l => l.cable === "W-018"))'), u18 = 0.0145 * kT(T16(5)) * 5 * 5;
  ok('sa chute, sur lui seul (le retour ne fait pas partie de la chute en ligne de l’aller) : 14,5 mΩ/m × 1,323 (102,3 °C) × 5 m × 5 A = 0,480 V', !d18.total && pres(d18.dU, u18) && pres(T16(5), 102.3, 0.05), d18.dU.toFixed(4) + ' V');
  ev('CONSOS = new Map(); ALIMS = new Map(); CHUTES_DJ = new Map(); brancher(contratExemple(), "102CB1", chargesExemple().get("102CB1"), 10)');
  const y16 = fx('W-016'), y17 = fx('W-017'), d16 = ev('chuteDuFil([...ALIMS.keys()].find(l => l.cable === "W-016"))');
  ok('sans consommation écrite : W-016 et W-017 ont un courant inconnu, comme leur aller — ni « 2 A supposés », ni le courant de 102CB1 — et aucune chute', y16.I === null && y16.source === 'inconnu' && y16.retour && y17.I === null && y17.source === 'commande' && d16.dU === null && motsDe(y16) === 'écrivez la consommation de 104LP1' && motsDe(y17) === 'écrivez la consommation de la bobine de 103RL1', motsDe(y16) + ' · ' + motsDe(y17));
  // deux disjoncteurs qui ramènent leur charge par le même câble de masse (une barrette de masse) : la somme de leurs parts
  const li = (de, bDe, vers, bVers, cable, type) => ev('liaison')({ de, borneDe: bDe, vers, borneVers: bVers, cable, type });
  bac.G = [li('1CB1', '2', '5LP1', '1', 'W-g1', 'DR22'), li('2CB2', '2', '6LP2', '1', 'W-g2', 'DR22'), li('5LP1', '2', '70VT1', '1', 'W-g3', 'DR22'), li('6LP2', '2', '70VT1', '2', 'W-g4', 'DR22'), li('70VT1', '1', '70VT1', '2', 'W-gs', 'DR22'), li('70VT1', '1', '9G', '', 'W-g5', 'DR20')];
  ev('CONSOS = new Map([["5LP1", { perm: { i: 2 }, dem: { i: 4, t: 3 } }], ["6LP2", { perm: { i: 1.5 } }]])');
  const RA = ev('retoursDepuis(G, "1CB1")'), RB = ev('retoursDepuis(G, "2CB2")'), w5 = r => [...r].find(([l]) => l.cable === 'W-g5');
  bac.PARTS = { retour: { quoi: 'charge', parts: [{ cb: '1CB1', R: w5(RA)[1] }, { cb: '2CB2', R: w5(RB)[1] }] } };
  ev('INFOS = new Map([["1CB1", { nom: "1CB1", calibre: 5, perm: 2, pointe: null, points: [], ecrit: false, manque: [] }], ["2CB2", { nom: "2CB2", calibre: 5, perm: 1.5, pointe: null, points: [], ecrit: false, manque: [] }]])');
  const S = ev('alimentationDuRetour(PARTS)');
  ok('un câble de masse partagé par deux disjoncteurs (une barrette de masse) : la somme de leurs parts — 2 + 1,5 = 3,5 A, et 4 + 1,5 = 5,5 A pendant 3 s ; une part inconnue la rendrait inconnue', w5(RA) && w5(RB) && S.branche.ecrite && pres(S.branche.perm, 3.5) && pres(S.branche.pointe, 5.5) && S.retour.cbs.join() === '1CB1,2CB2' && S.retour.de.join() === '5LP1,6LP2', `${S.branche.perm} A, ${S.branche.pointe} A en pointe`);
  ev('CONSOS = new Map(); ALIMS = new Map(); CHUTES_DJ = new Map(); INFOS = new Map()'); }

console.log('\n13. LA FICHE DIT LA CHUTE AU MÊME INSTANT QUE LE COURANT (S3)');
{ /* avant : la ligne de W-012 dans « Ses câbles » montrait 9,31 A sur 6,9 A (la pointe) à côté de 3,71 V (le permanent) ; le
     récapitulatif, 9,31 A et 7,92 V. Une seule paire, celle du récapitulatif (`instantsDuFil`) */
  ev('CONSOS = new Map([["104LP1", { perm: { i: 5 }, dem: { i: 9.31, t: 125 } }]]); ALIMS = new Map(); CHUTES_DJ = new Map(); brancher(contratExemple(), "102CB1", chargesExemple().get("102CB1"), 10)');
  bac.W12s = ev('[...ALIMS.keys()].find(l => l.cable === "W-012")');
  const r = ev('ligneDeFil({ l: W12s, vers: W12s.vers, borneVers: W12s.borneVers })'), I = ev('instantsDuFil({ x: intensiteCalculee(W12s), c: chuteDuFil(W12s), l: W12s })');
  const T931 = 95 + 40 * Math.pow(9.31 / 6.9, 2), T22 = i => 95 + 40 * Math.pow(i / 5.1, 2), u = 0.2 + 0.0332 * kT(T931) * 5 * 9.31 + 0.2 + 0.060 * kT(T22(9.31)) * 5 * 9.31;
  ok('W-012 : le moment le plus dur est la pointe (9,31 A sur 6,9 A, 7,922 V sur 2 V) — le récapitulatif montre cette paire', I.le.pointe && I.le.i === 9.31 && pres(I.le.admis, 6.9) && pres(I.le.u, u), `${I.le.i} A · ${I.le.u.toFixed(3)} V`);
  ok('la ligne de la fiche (« Ses câbles », `ligneDeFil`) montre la MÊME paire : 9,31 A et 7,922 V, la pointe dite — plus 9,31 A à côté de 3,712 V', r.charge.i === 9.31 && pres(r.charge.admis, 6.9) && pres(r.chute.u, u) && r.charge.pointe && r.chute.pointe && pres(r.chute.max, 2), `${r.charge.i} A · ${r.chute.u.toFixed(3)} V`);
  // la règle ne se perd pas d'un écran à l'autre : la carte et la section « Courant et chute » de la fiche, le tableau des câbles d'un disjoncteur prennent la paire là
  const corps = (X, debut) => { const i = X.findIndex(l => l.startsWith(debut)); let j = i + 1; while (j < X.length && /^\s/.test(X[j])) j++; return i < 0 ? '' : X.slice(i, j).join('\n'); };
  ok('… et la fiche du câble (`ficheFil` : la section « Courant et chute », la carte, Modifier) et le tableau des câbles d’un disjoncteur (`lignesFilsDisjoncteur`) prennent leur paire chez `instantsDuFil`', /instantsDuFil\(\{ x, c: ch, l \}\)/.test(corps(FICHE, 'function ficheFil(')) && /uI != null \? `<b>\$\{esc\(volts\(uI\)\)\}/.test(corps(FICHE, 'function ficheFil(')) && /instantsDuFil\(/.test(corps(DJ, 'function lignesFilsDisjoncteur(')));
  ev('CONSOS = new Map(); ALIMS = new Map(); CHUTES_DJ = new Map()'); }

console.log('\n14. LA PROTECTION EN UNE PHRASE (Q3) ; LE CONTACT QUE LA GAUGE BORNE (S7)');
{ const f = (type, jauge, continu, calibreMax) => ({ type, jauge, continu, calibreMax });
  // l'EN 2853 en faisceau (× 0,6) contre l'AC 43.13-1B, table 11-3 : DR20 6,9 A contre 7,5 A — DR22 5,1 A contre 5 A — DR24 3,9 A, absent de la table
  const p20 = ev('protectionEnMots')(f('DR20', 20, 6.9, 7.5), 10, {}), p22 = ev('protectionEnMots')(f('DR22', 22, 5.1, 5), 10, {}), p24 = ev('protectionEnMots')(f('DR24', 24, 3.9, null), 10, {});
  ok('sous un 10 A, la plus sévère des deux règles décide, et la phrase la nomme : DR20 — l’EN 2853 en faisceau (6,9 A, plus sévère que les 7,5 A de la table 11-3) ; DR22 — la table 11-3 (5 A, plus sévère que les 5,1 A de l’EN 2853) ; DR24 — l’EN 2853 (la table ne le connaît pas)',
    p20 === 'l’EN 2853 en faisceau : 6,9 A admis en continu, moins que les 10 A du calibre' && p22 === 'le maximum de l’AC 43.13-1B (table 11-3) pour un 22 AWG : 5 A, moins que les 10 A du calibre' && p24 === 'l’EN 2853 en faisceau : 3,9 A admis en continu, moins que les 10 A du calibre', p22);
  ok('protégé par les deux (un DR16, 11,7 A et 20 A, sous un 10 A) : rien à dire ; elle ne dépend d’aucun courant', ev('protectionEnMots')(f('DR16', 16, 11.7, 20), 10, {}) === '');
  const p70 = ev('protectionEnMots')(f('DR20', 20, 8.8, 9), 10, { ...ev('HYPOTHESES'), ambiante: 70 });
  ok('à 70 °C autour, l’EN 2853 dit aussi l’ambiante : « l’EN 2853 en faisceau, à 70 °C »', /^l’EN 2853 en faisceau, à 70 °C : 8,8 A admis en continu, moins que les 10 A du calibre$/.test(p70), p70);
  // le contact : un 24 AWG porte 3 A dans tout contact, un 20 AWG 7,5 A, un 22 AWG 5 A (table Courant des contacts) — c'est la gauge qui limite
  const g24 = ev('contactsDeLaGauge(24, 5)'), g20 = ev('contactsDeLaGauge(20, 10)'), g22 = ev('contactsDeLaGauge(22, 10)'), g18 = ev('contactsDeLaGauge(18, 10)');
  ok('5 A dans un 24 AWG, 10 A dans un 20 AWG ou un 22 AWG : aucune taille de contact n’y suffit (3 A, 7,5 A, 5 A au mieux) — « un contact plus gros » ne réglait rien, la gauge plus forte règle aussi le contact', g24.parLaGauge && g24.max.intensite === 3 && !g24.suffit && g20.parLaGauge && g20.max.intensite === 7.5 && g22.parLaGauge && g22.max.intensite === 5, `${g24.max.intensite} / ${g20.max.intensite} / ${g22.max.intensite} A`);
  ok('10 A dans un 18 AWG : la taille 20 n’en porte que 7,5 A, la taille 16 en porte 10 — VOLTA nomme la taille qui suffit', g18 && !g18.parLaGauge && g18.suffit && g18.suffit.taille === '16' && g18.suffit.intensite === 10, g18 && g18.suffit && g18.suffit.taille + ' : ' + g18.suffit.intensite + ' A'); }

// (une fonction de la fiche, lue telle quelle : ce qu'un courant inconnu demande d'écrire)
function motsDe(x) { bac.X0 = x; return ev('motDeCommande(X0)'); }
console.log(`\n  ${total - echecs} / ${total} contrôles passés  —  ${echecs ? echecs + ' ÉCHEC(S)' : 'tout est vert'}`);
process.exit(echecs ? 1 : 0);
