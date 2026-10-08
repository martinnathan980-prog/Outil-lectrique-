/* ===========================================================================
   09 bis — LES DISJONCTEURS : la courbe de disjonction, le profil de charge
   qui doit rester à sa gauche, et le fil que le disjoncteur doit protéger
   ---------------------------------------------------------------------------
   Un disjoncteur thermique déclenche d'autant plus vite que le courant dépasse
   son calibre In : sa COURBE DE DISJONCTION donne le temps de déclenchement
   selon le multiple de In, à chaque température. Les quatre courbes de
   normes/disjoncteurs.csv (l'Excel du lecteur) sont l'enveloppe d'un
   disjoncteur thermique COMPENSÉ en température, type EN 2495 / Klixon 2TC
   (MS3320) : à 23 °C, 200 % → 3,3–16 s, 500 % → 0,4–1,3 s, 1000 % →
   0,1–0,3 s, comme les feuilles Sensata ; 125 °C est la courbe la plus RAPIDE
   (le bilame est déjà chaud), −55 °C la plus LENTE. Deux lectures :
     · LA CHARGE : le profil (démarrage, transition, états libres, permanent :
       un courant pendant une durée) doit rester À GAUCHE de la courbe la plus
       rapide, sinon le disjoncteur déclenche en service. Chaque phase
       transitoire consomme la fraction tᵢ / t_decl(Iᵢ) du temps de
       déclenchement ; le BILAN THERMIQUE est leur somme, qui doit rester
       sous 1 (la règle des organes à une constante de temps : fusibles,
       bilames — le simple cumul des durées sous-estimait l'échauffement d'un
       démarrage fort et bref). Le permanent dure toujours : il reste sous le
       premier multiple, là où le disjoncteur ne déclenche jamais. Pour
       l'escalier du graphique, le profil se lit toujours en points cumulés
       (une phase dure autant que toutes les phases au moins aussi fortes).
     · LE FIL : ce que le disjoncteur LAISSE PASSER se lit sur la courbe la
       plus lente — à −55 °C un 5 A laisse 2 In pendant 43 s, 1,47 In pour
       toujours —, et le fil aval doit le tenir à chaque palier de l'EN 2853
       (2 s, 10 s, 1 min, continu), déclassé comme la simulation.
   L'IDÉAL : le plus petit calibre qui (a) tient la charge avec sa marge —
   10 % de courant en plus, et au plus 75 % du temps de déclenchement
   consommé —, (b) protège chaque fil sur la courbe lente, (c) reste sous ce
   que les fils admettent en continu, (d) respecte la sélectivité 2:1 avec le
   disjoncteur voisin (Klixon : tout calibre déclenche avant un calibre
   double). Si rien ne remplit (b)–(d), l'idéal est celui de la charge et la
   réserve le dit : un disjoncteur plus petit ne tiendrait pas, c'est le fil
   qu'il faut changer. « Serré » (tient, sans la marge) reste un avertissement.
   Rien ici ne touche à la page : le moteur, comme 09.
   =========================================================================== */
'use strict';

// la gamme des calibres qu'on pose, en ampères — celle du lecteur (la famille réelle en a d'autres : 2, 2,5, 4, 20)
const CALIBRES = [1, 3, 5, 7.5, 10, 15, 25];
// la marge de l'idéal : 10 % de courant en plus, au plus 75 % du temps de déclenchement consommé (une valeur de pratique,
// pas de norme) ; la sélectivité : l'amont fait au moins le double de l'aval
const MARGE_DISJONCTION = 1.1, MARGE_FRACTION = 0.75, SELECTIVITE = 2;
/* LES FAMILLES de disjoncteurs d'aéronef (Sensata 2TC/3TC/6TC/9TC/7274, Crouzet, Safran, listings EN) : la norme, les
   pôles, la gamme de calibres, la compensation en température, l'ambiante admise, la masse (g), la famille de courbes
   de normes/disjoncteurs.csv (les compensés ; un 7274 demanderait les siennes), et les motifs de part number qui les
   nomment. Un calibre ne se lit en queue d'un part number que s'il suit l'une d'elles : NSA935401-10 est un collier. */
const FAMILLES_DISJONCTEURS = [
  { famille: '2TC', norme: 'MS3320 / AS33201 / AS58091 · EN 2495', poles: 1, calibres: [1, 2, 2.5, 3, 4, 5, 7.5, 10, 15, 20, 25], tension: '28 V DC / 120 V AC 400 Hz', compense: true, tmin: -54, tmax: 121, masse: 24, courbe: 'disjoncteur', note: 'pouvoir de coupure 6000 A à 28 V DC ; trip-free ; calibres coordonnés 2:1', motifs: [/^2TC\d*-/i, /^MS3320-/i, /^AS33201-/i, /^AS58091-/i] },
  { famille: '3TC', norme: 'MS14105', poles: 1, calibres: [15, 20, 25, 30, 35], tension: '28 V DC / 120 V AC 400 Hz', compense: true, tmin: -54, tmax: 121, masse: 36, courbe: 'disjoncteur', note: '', motifs: [/^3TC\d*-/i, /^MS14105-/i] },
  { famille: '6TC', norme: 'MS14154 / AS14154', poles: 3, calibres: [1, 35], plage: true, tension: '115/200 V AC 400 Hz', compense: true, tmin: -54, tmax: 121, masse: 65, courbe: 'disjoncteur', note: 'tripolaire : une phase déclenche les trois', motifs: [/^6TC\d*-/i, /^MS14154-/i, /^AS14154-/i] },
  { famille: '9TC', norme: 'MS14153 / AS14153', poles: 3, calibres: [1, 35], plage: true, tension: '115/200 V AC 400 Hz', compense: true, tmin: -54, tmax: 121, masse: 110, courbe: 'disjoncteur', note: 'tripolaire', motifs: [/^9TC\d*-/i, /^MS14153-/i, /^AS14153-/i] },
  { famille: '7274', norme: 'MIL-C-5809 · MS22073 (7274-11) · MS26574 (7274-2)', poles: 1, calibres: [0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10, 15, 20], tension: '28 V DC / 120 V AC 400 Hz', compense: false, tmin: -55, tmax: 71, masse: 30, courbe: '', note: 'non compensé : 90–130 % à 71 °C, 135–180 % à −55 °C', motifs: [/^7274-\d+-/i, /^MS22073-/i, /^MS26574-/i] },
  { famille: 'EN2495', norme: 'EN 2495 (0,5–25 A) · EN 2995-001 (1–25 A)', poles: 1, calibres: [0.5, 25], plage: true, tension: '28 V DC / 115 V AC 400 Hz', compense: true, tmin: -55, tmax: 125, masse: 20, courbe: 'disjoncteur', note: 'Crouzet : EN2495 + MS33201 V', motifs: [/^EN\s?2495/i, /^EN\s?2995/i] },
  { famille: 'EN3661', norme: 'EN 3661-001', poles: 1, calibres: [20, 50], plage: true, tension: '28 V DC / 115 V AC 400 Hz', compense: true, tmin: -55, tmax: 125, masse: null, courbe: 'disjoncteur', note: '', motifs: [/^EN\s?3661/i] },
  { famille: 'EN2592', norme: 'EN 2592 · EN 2996-001', poles: 3, calibres: [1, 25], plage: true, tension: '115/200 V AC 400 Hz', compense: true, tmin: -55, tmax: 125, masse: null, courbe: 'disjoncteur', note: 'tripolaire', motifs: [/^EN\s?2592/i, /^EN\s?2996/i] },
  { famille: 'EN3662', norme: 'EN 3662-001', poles: 3, calibres: [20, 50], plage: true, tension: '115/200 V AC 400 Hz', compense: true, tmin: -55, tmax: 125, masse: null, courbe: 'disjoncteur', note: 'tripolaire', motifs: [/^EN\s?3662/i] },
  { famille: 'Safran 170', norme: 'MS25017 (encombrement) · MIL-C-5809', poles: 1, calibres: [125, 140, 150, 160, 180, 200], tension: '28 V DC / 115 V AC', compense: false, tmin: -40, tmax: 71, masse: 130, courbe: '', note: '3000 A à 28 V DC', motifs: [/^170-/i] }];
/* Les calibres qu'une queue de part number peut dire : « 10 », « 7,5 », « 7.5A », « 1/2 » ; « 2-1/2 » vaut 2,5 A, mais
   « 7274-11-1/2 » est la variante 11 en ½ A — on rend les deux lectures, la gamme de la famille tranche. */
function calibresEnQueue(pn) { const out = [], m = /[-\s](?:(\d+)-)?(\d+)\/(\d+)\s*A?$/i.exec(pn);
  if (m) { if (m[1]) out.push(+m[1] + m[2] / m[3]); out.push(m[2] / m[3]); }
  const n = /[-\s](\d{1,3}(?:[.,]\d{1,2})?)\s*A?$/i.exec(pn); if (n) out.push(parseFloat(n[1].replace(',', '.'))); return out; }
/* La famille d'un part number de disjoncteur, et son calibre s'il est de la gamme de la famille ; rien pour tout le
   reste (un collier, un connecteur, un relais). */
function familleDuPn(pn) { pn = String(pn || '').trim(); if (!pn) return null; const F = FAMILLES_DISJONCTEURS.find(f => f.motifs.some(r => r.test(pn))); if (!F) return null;
  const dans = c => F.plage ? c >= F.calibres[0] - 1e-9 && c <= F.calibres[1] + 1e-9 : F.calibres.some(x => Math.abs(x - c) < 1e-9);
  const c = calibresEnQueue(pn).find(dans); return { ...F, pn, calibre: c != null ? c : null }; }
const calibreDuPn = pn => { const f = familleDuPn(pn); return f ? f.calibre : null; };
// un disjoncteur : le code CB (102CB1)
const estDisjoncteur = r => { const q = lireRepere(r); return !!(q && q.num && q.code === 'CB'); };

/* Les courbes d'une famille, de la plus rapide (le premier multiple le plus bas) à la plus lente. Chaque courbe : ses
   points tels que lus (`brut`, pour mémoire) et son ENVELOPPE (`points`) : par multiple croissant, le temps ne remonte
   jamais — les points lus sur une figure tremblent un peu, et l'outil ne doit jamais croire le disjoncteur plus lent
   qu'il n'est. */
function courbesDeDisjonction(norme, famille) { const src = norme && norme.disjoncteurs && norme.disjoncteurs.length ? norme : normeDesModules(norme);
  const rows = (src.disjoncteurs || []).filter(d => !famille || d.famille === famille), m = new Map();
  rows.forEach(d => (m.get(d.courbe) || m.set(d.courbe, { nom: d.courbe, famille: d.famille, temperature: d.temperature, brut: [] }).get(d.courbe)).brut.push({ m: d.multiple, t: d.temps }));
  return [...m.values()].map(c => { const brut = c.brut.slice().sort((a, b) => a.m - b.m || b.t - a.t); let mn = Infinity;
    const points = brut.map(p => { mn = Math.min(mn, p.t); return { m: p.m, t: mn }; }); return { ...c, brut, points }; })
    .filter(c => c.points.length).sort((a, b) => a.points[0].m - b.points[0].m || a.nom.localeCompare(b.nom)); }
/* Le temps que le disjoncteur tient à ce multiple : sous le premier point, toujours (Infinity) ; entre deux points, une
   interpolation en log-log (la courbe d'un thermique est une droite par morceaux sur papier log-log : c'est ce que la
   figure du constructeur dessine) ; au-delà du dernier, la pente du dernier segment. Le graphique de la fiche
   échantillonne cette fonction-ci : ce qu'on voit est exactement ce qui juge. */
function tempsDeDeclenchement(courbe, multiple) { const P = courbe.points; if (!P.length || !(multiple > 0)) return Infinity;
  if (multiple < P[0].m) return Infinity; if (P.length === 1) return P[0].t;
  let i = 1; while (i < P.length - 1 && P[i].m < multiple) i++;
  const a = P[i - 1], b = P[i]; if (b.m === a.m) return Math.min(a.t, b.t);
  const k = (Math.log(multiple) - Math.log(a.m)) / (Math.log(b.m) - Math.log(a.m));
  return Math.exp(Math.log(a.t) + k * (Math.log(b.t) - Math.log(a.t))); }
/* L'inverse : le multiple qu'une durée admet encore (« 5 s admettent jusqu'à 1,43 In ») ; une durée infinie, le premier
   multiple — en dessous, le disjoncteur ne déclenche jamais. Sous le dernier point, le dernier multiple : l'outil ne
   prête pas au disjoncteur plus qu'il n'a lu. */
function multipleAdmis(courbe, duree) { const P = courbe.points; if (!P.length) return Infinity; if (!isFinite(duree) || duree >= P[0].t) return P[0].m;
  if (duree <= P[P.length - 1].t) return P[P.length - 1].m; let i = 1; while (i < P.length - 1 && P[i].t > duree) i++;
  const a = P[i - 1], b = P[i]; if (a.t === b.t) return b.m; const k = (Math.log(duree) - Math.log(a.t)) / (Math.log(b.t) - Math.log(a.t));
  return Math.exp(Math.log(a.m) + k * (Math.log(b.m) - Math.log(a.m))); }

/* LES ÉTATS d'un profil : le démarrage, la transition (chacun un courant et une durée), les états qu'on ajoute
   (`plus` : [{ nom, i, t }]), et le permanent (un courant, pour toujours). Rend [{ k, nom, i, t }], tels qu'écrits. */
const NOMS_PHASES = { dem: 'démarrage', trans: 'transition', perm: 'permanent' };
const nombreLu = v => { if (v == null || v === '') return null; const x = parseFloat(String(v).replace(',', '.')); return isNaN(x) ? null : x; };
function etatsDuProfil(profil) { profil = profil || {}; const e = k => profil[k] || {};
  return [{ k: 'dem', nom: NOMS_PHASES.dem, i: nombreLu(e('dem').i), t: nombreLu(e('dem').t) }, { k: 'trans', nom: NOMS_PHASES.trans, i: nombreLu(e('trans').i), t: nombreLu(e('trans').t) },
    ...(profil.plus || []).map((x, j) => ({ k: 'plus' + j, nom: String(x && x.nom || '').trim() || 'état ' + (j + 3), i: nombreLu(x && x.i), t: nombreLu(x && x.t) })),
    { k: 'perm', nom: NOMS_PHASES.perm, i: nombreLu(e('perm').i), t: Infinity }]; }
// les phases qui comptent : un courant et une durée (le permanent : toujours)
const phasesDuProfil = profil => etatsDuProfil(profil).filter(p => p.i > 0 && p.t > 0);
/* LE PROFIL en points (courant, durée cumulée), pour l'escalier du graphique : chaque état dure autant que tous les
   états au moins aussi forts que lui — le démarrage seul s'il est le plus fort, puis la transition avec le démarrage,
   puis le permanent, pour toujours. Deux états au même courant ne font qu'un point. Un état sans courant ne compte pas. */
function pointsDuProfil(profil) { const phases = phasesDuProfil(profil);
  const pts = []; phases.forEach(p => { if (pts.some(q => q.i === p.i)) return;
    const t = phases.reduce((s, q) => q.i >= p.i ? s + q.t : s, 0); pts.push({ nom: phases.filter(q => q.i === p.i).map(q => q.nom).join(' et '), k: p.k, i: p.i, t }); });
  return pts.sort((a, b) => b.i - a.i); }
/* LE BILAN THERMIQUE d'un profil sur une courbe, pour un calibre : chaque phase transitoire consomme la fraction
   tᵢ / t_decl(Iᵢ) du temps de déclenchement, la somme doit rester sous 1 ; le permanent reste sous le premier multiple.
   `k` grossit les courants (1,1 : la marge de l'idéal). */
function bilanThermique(courbe, calibre, phases, k) { let somme = 0, permOk = true; k = k || 1;
  phases.forEach(p => { const t = tempsDeDeclenchement(courbe, p.i * k / calibre); if (p.t === Infinity) { if (t !== Infinity) permOk = false; } else if (t !== Infinity) somme += p.t / t; });
  return { somme, permOk, sommeOk: somme < 1 - 1e-9, ok: permOk && somme < 1 - 1e-9 }; }
/* LE VERDICT d'un calibre sur un profil. `points` : l'escalier, chaque point jugé sur chaque courbe (ce que le
   disjoncteur tient à ce multiple, la fraction que ses phases consomment, s'il tient) ; `valide` : le bilan thermique
   tient sur la courbe la plus rapide ; `avecMarge` : il tient encore avec 10 % de courant en plus et moins de 75 % du
   temps consommé ; `serre` : valide sans la marge ; `gamme` : chaque calibre proposé (et le retenu s'il est ailleurs),
   jugé — valide, serre, marge, somme, fils (protège les fils aval sur la courbe lente et reste sous leur continu),
   selectif (2:1 avec les disjoncteurs voisins) ; `calibreIdeal` et `reserve` ('' complet, 'fils', 'selectivite' quand
   aucun calibre avec marge ne les satisfait, 'serre' quand aucun n'a la marge). `contexte` : { fils, hyp, autres } —
   les fils aval (pour b, c) et les calibres des disjoncteurs voisins (pour d). */
function verdictDisjonction(norme, famille, calibre, profil, contexte) { contexte = contexte || {};
  const courbes = courbesDeDisjonction(norme, famille), pts = pointsDuProfil(profil), phases = phasesDuProfil(profil), fils = contexte.fils || [], autres = (contexte.autres || []).filter(c => c > 0);
  const juger = cal => { const bilans = courbes.map(c => bilanThermique(c, cal, phases, 1)), marges = courbes.map(c => bilanThermique(c, cal, phases, MARGE_DISJONCTION));
    const points = pts.map(p => { const multiple = p.i / cal, duree = phases.filter(q => q.i === p.i && q.t !== Infinity).reduce((s, q) => s + q.t, 0);
      const m = courbes.map((c, k) => { const temps = tempsDeDeclenchement(c, multiple), admis = multipleAdmis(c, p.t) * cal, fraction = p.t === Infinity || temps === Infinity ? 0 : duree / temps;
        return { courbe: c.nom, temps, fraction, somme: bilans[k].somme, ok: p.t === Infinity ? temps === Infinity : temps > p.t, rapport: p.t === Infinity ? (temps === Infinity ? Infinity : 0) : temps / p.t, admis, marge: admis / p.i }; });
      return { ...p, multiple, duree, marges: m }; });
    // la somme déborde alors que chaque point tient seul : le point qui pèse le plus est le fautif
    courbes.forEach((c, k) => { if (bilans[k].sommeOk) return; const gros = points.filter(p => p.t !== Infinity).sort((a, b) => b.marges[k].fraction - a.marges[k].fraction)[0]; if (gros) gros.marges[k].ok = false; });
    const b0 = bilans[0], bm = marges[0], avecMarge = !!(b0 && b0.ok && bm.ok && b0.somme <= MARGE_FRACTION + 1e-9);
    const gros = points.filter(q => q.t !== Infinity).sort((a, b) => b.marges[0].fraction - a.marges[0].fraction)[0] || null;
    points.forEach(p => { const m = p.marges[0]; p.ok = m ? m.ok : null;
      // serré : tient, mais sans la marge — le permanent sans ses 10 % de courant ; le transitoire qui pèse le plus
      p.serre = !!(m && m.ok && (p.t === Infinity ? m.marge < MARGE_DISJONCTION - 1e-9 : p === gros && (!bm.sommeOk || b0.somme > MARGE_FRACTION + 1e-9))); });
    return { points, valide: !!(b0 && b0.ok), avecMarge, serre: !!(b0 && b0.ok && !avecMarge), somme: b0 ? b0.somme : 0, bilans }; };
  const J = calibre > 0 && courbes.length ? juger(calibre) : null;
  const points = J ? J.points : pts.map(p => ({ ...p, multiple: null, marges: [], ok: null, serre: false }));
  const valide = !!(J && pts.length && J.valide);
  // la gamme : celle qu'on propose, et le calibre retenu s'il est ailleurs (un part number de 2 A ou de 20 A)
  const calibres = [...new Set(CALIBRES.concat(calibre > 0 ? [calibre] : []))].sort((a, b) => a - b);
  const gamme = calibres.map(c => { if (!(courbes.length && pts.length)) return { calibre: c, valide: null, serre: false, marge: null, somme: null, fils: null, selectif: null, ideal: false };
    const j = juger(c), pf = fils.length ? protectionDesFils(norme, c, profil, fils, contexte.hyp) : [];
    return { calibre: c, valide: j.valide, serre: j.serre, marge: j.avecMarge, somme: j.somme, fils: fils.length ? pf.every(f => f.protege !== false && f.verdict !== 'calibre') : null,
      selectif: autres.length ? autres.every(a => Math.max(a, c) >= SELECTIVITE * Math.min(a, c) - 1e-9) : null, ideal: false }; });
  const candidats = gamme.filter(g => g.marge), complets = candidats.filter(g => g.fils !== false && g.selectif !== false);
  const calibreMini = (gamme.find(g => g.valide) || {}).calibre || null, choisi = complets[0] || candidats[0] || gamme.find(g => g.valide) || null, calibreIdeal = choisi ? choisi.calibre : null;
  const reserve = !choisi ? '' : complets.length ? '' : candidats.length ? (choisi.fils === false ? 'fils' : 'selectivite') : 'serre';
  gamme.forEach(g => { g.ideal = g.calibre === calibreIdeal; });
  // le pire point : le fautif qui pèse le plus dans le bilan, sinon le plus près de la courbe
  const pire = points.filter(p => p.marges.length && p.ok === false).sort((a, b) => b.marges[0].fraction - a.marges[0].fraction)[0] || points.filter(p => p.marges.length).sort((a, b) => a.marges[0].rapport - b.marges[0].rapport)[0] || null;
  return { courbes, points, valide, serre: !!(J && valide && J.serre), avecMarge: !!(J && J.avecMarge), somme: J ? J.somme : null, bilans: J ? J.bilans : [], gamme, calibreMini, calibreIdeal, reserve, pire,
    calibre: calibre > 0 ? calibre : null, autres, sansProfil: !pts.length, sansCourbe: !courbes.length }; }

// les paliers de l'EN 2853 : ce qu'un fil admet pendant 2 s, 10 s, 1 min, et en continu
const PALIERS_EN2853 = [[2, '2 s'], [10, '10 s'], [60, '1 min'], [Infinity, 'continu']];
/* LA PROTECTION DES FILS. Chaque fil du disjoncteur — des deux côtés : le courant les traverse tous, et un dédoublement
   se partage on ne sait comment, chacun doit donc tenir tout — jugé deux fois :
     · LA CHARGE (`phases`, `pire`, `verdict`) : à chaque phase du profil, le courant reste sous ce que la norme des fils
       (EN 2853) admet pour cette durée, déclassé comme la simulation (faisceau, ambiante) ; sinon 'fil'. Et le calibre
       ne dépasse pas ce que le fil admet en continu, sinon 'calibre' — une surcharge que le disjoncteur laisse passer
       cuit le fil ;
     · LA PROTECTION (`laisse`, `pireLaisse`, `protege`) : ce que le disjoncteur laisse passer sur la courbe la plus
       lente (−55 °C), à chaque palier — m(t) × In —, reste sous ce que le fil admet pour cette durée ; sinon le fil
       n'est pas protégé en surcharge brève.
   Le déclassement : le faisceau s'applique à tout ; l'ambiante (EN 2853 note 2, √((Tr − Tu)/40)) seulement au CONTINU
   — les paliers 2 s, 10 s, 1 min sont adiabatiques (un 24 AWG à 19,5 A pendant 2 s monte à ~220 °C, la loi du régime
   permanent n'y vaut rien). `facteur` est celui du continu, `facteurCourt` celui des paliers. `fils` : [{ cable, type, … }]. */
function protectionDesFils(norme, calibre, profil, fils, hyp) { const H = { ...HYPOTHESES, ...(hyp || {}) }, pts = pointsDuProfil(profil), k = facteurDeclassement(norme, H.conditions);
  const courbes = courbesDeDisjonction(norme, ''), lente = courbes[courbes.length - 1] || null;
  return (fils || []).map(f => { const jauge = jaugeDuType(f.type), fil = filDeNorme(norme, f.type, jauge);
    if (!fil || fil.intensite == null) return { ...f, fil: fil || null, jauge, continu: null, facteur: 1, facteurCourt: 1, phases: [], pire: null, laisse: [], pireLaisse: null, protege: null, courbeLente: '', verdict: 'inconnu' };
    const facteur = k * facteurAmbiante(fil, H.ambiante), facteurDe = t => t === Infinity ? facteur : k, continu = fil.intensite * facteur;
    const phases = pts.map(p => { const admise = intensiteAdmise(fil, p.t) * facteurDe(p.t); return { ...p, admise, palier: palierDe(p.t), ok: p.i <= admise + 1e-9 }; });
    const pire = phases.filter(p => !p.ok).sort((a, b) => b.i / b.admise - a.i / a.admise)[0] || null;
    const laisse = lente && calibre > 0 ? PALIERS_EN2853.map(([t, mot]) => { const multiple = multipleAdmis(lente, t), courant = multiple * calibre, admise = intensiteAdmise(fil, t) * facteurDe(t); return { palier: t, mot, multiple, courant, admise, ok: courant <= admise + 1e-9 }; }) : [];
    const pireLaisse = laisse.filter(x => !x.ok).sort((a, b) => b.courant / b.admise - a.courant / a.admise)[0] || null;
    return { ...f, fil, jauge, continu, facteur, facteurCourt: k, phases, pire, laisse, pireLaisse, protege: laisse.length ? !pireLaisse : null, courbeLente: lente ? lente.nom : '', approx: !!fil.approx,
      verdict: pire ? 'fil' : (calibre > 0 && calibre > continu + 1e-9) ? 'calibre' : 'ok' }; }); }
