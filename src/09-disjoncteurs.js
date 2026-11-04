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
     · LA CHARGE : VALIDE OU PAS VALIDE, sans aucune marge (v80). Le profil
       (démarrage, transition, états libres, permanent : un courant pendant une
       durée) se lit en ESCALIER — un état dure autant que tous les états au
       moins aussi forts que lui — et chaque marche doit rester À GAUCHE de la
       courbe la plus rapide : sa durée sous le temps de déclenchement à son
       courant, ou, ce qui est la même chose, son courant sous le SEUIL de la
       courbe sur cette durée. Et chaque phase transitoire consomme la
       fraction tᵢ / t_decl(Iᵢ) du temps de déclenchement : le BILAN THERMIQUE
       est leur somme, qui doit rester sous 1 (la règle des organes à une
       constante de temps : fusibles, bilames — l'escalier seul sous-estime
       l'échauffement d'un démarrage fort suivi d'une transition longue). Les
       deux, toujours : sans préchauffage, le bilan sous 1 met chaque marche à
       gauche ; un état en service, préchauffé, peut passer au bilan et pas sur
       sa marche. Le permanent dure toujours : il reste sous le premier
       multiple, là où le disjoncteur ne disjoncte jamais.
       Le permanent reste aussi sous ce que le disjoncteur GARANTIT de tenir
       à la température max du tableau (table Calibration, « Tient »,
       interpolée en température : MS3320N 0,80 In à 121 °C, Sensata 2TC
       0,85 In) — la courbe typique, elle, garde les transitoires. Un état
       qui survient en service (après le permanent) trouve le bilame chaud :
       son temps de déclenchement se divise par le facteur de préchauffage
       (MS3320N table VII : ÷ 1,6 à 3,7, hypothèse `prechauffage`).
     · LE FIL : ce que le disjoncteur LAISSE PASSER se lit sur la courbe la
       plus lente — à −55 °C un 5 A laisse 2 In pendant 43 s, 1,47 In pour
       toujours —, et le disjoncteur PROTÈGE le fil quand ce qu'il laisse
       passer reste, à chaque palier de l'EN 2853 (2 s, 10 s, 1 min,
       continu), sous la COURBE DE DOMMAGE du fil (recherche R2, table
       Dommage des fils) : en bref l'échauffement adiabatique depuis sa
       température de service (135 °C) jusqu'à la tenue du câble (CEI 60949 :
       √(I²t / t)), en continu l'EN 2853 déclassée et portée à la tenue,
       × √((T tenue − ambiante)/40) (AC 43.13-1B § 11-67 b-c, MIL-W-5088L
       § 6.7) — la plus grande des deux. AC 43.13-1B § 11-48 : « le
       disjoncteur protège le fil, pas l'équipement ». Sans courbe de dommage
       (un conducteur CCA ou aluminium, une tenue inconnue), la règle d'avant,
       plus sévère : ses intensités de SERVICE. La méthode retrouve la table
       11-3 de la FAA (tests/couverture.js). À part, trois verdicts : le
       calibre reste sous ce que le fil admet en service continu (verdict
       'calibre' : AS50881, AC § 11-48), sous le calibre maximal par jauge de
       l'AC 43.13-1B (table Protection) et sous le courant du contact.
     · L'AMBIANTE DU TABLEAU (hypothèses `tableauMin` / `tableauMax`) choisit
       les courbes qui jugent : la plus rapide au max pour l'intempestif, la
       plus lente au min pour la protection — celle de cette température,
       sinon INTERPOLÉE entre les deux courbes qui l'encadrent (le multiple
       admis à chaque durée, linéaire en température) ; par défaut −55 et
       125 °C, les deux bouts — le plus pessimiste.
   LA GAMME : les calibres du catalogue de la FAMILLE du part number (table
   Familles de disjoncteurs : MS3320 0,5 à 25 A, ETA483 1 à 35 A, 3TC 15 à
   35 A), filtrés par la liste préférée du lecteur (hypothèse
   `calibresPreferes` : 1, 3, 5, 7,5, 10, 15, 20, 25 A — « 0,5, 0,75
   n'existent pas » ; au-delà de 25 A, le catalogue reste) ; sans famille,
   la gamme du lecteur, la même.
   LE MEILLEUR CALIBRE (`meilleur`, R2 § 3.1 ; NASA TM-102179 étapes 3 à 7) :
   le plus petit calibre de la gamme qui ne disjoncte pas, à la température
   max du tableau — aucune marge (v80 : les hypothèses `marge` et
   `margeTemps` d'autrefois sont ignorées) ; la sélectivité 2:1 avec un
   voisin se dit, elle ne fait pas monter le calibre. Puis, pour chaque fil
   qui ne le suit pas, la plus petite jauge de sa famille (la base des
   câbles) qui porte la charge et que ce calibre protège — ON NE MONTE JAMAIS
   LE CALIBRE POUR SAUVER UN FIL : un disjoncteur plus gros protège moins ;
   et les contacts que la jauge conseillée change de taille. `calibreIdeal`
   est ce calibre, `reserve` dit ce qui reste à faire ('fils',
   'selectivite').
   Rien ici ne touche à la page : le moteur, comme 09.
   =========================================================================== */
'use strict';

// la gamme du lecteur : celle d'un disjoncteur dont le part number ne dit pas la famille — la même que sa liste préférée
// (HYPOTHESES.calibresPreferes, 09) : « c'est 1, 3, 5, 7,5, 10, 15, 20, 25 »
const CALIBRES = [1, 3, 5, 7.5, 10, 15, 20, 25];
// la série des calibres d'aéronef (MS3320N, MS22073M, MS14105, EN 3661 : la table Familles) — ce qu'une famille donnée en
// plage (« 1 à 25 ») propose
const SERIE_CALIBRES = [0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10, 15, 20, 25, 30, 35, 40, 50];
// (v80) plus de marge : valide ou pas valide — le facteur de courant et la part du temps de déclenchement admise valent 1
// (gardés pour qui les lit) ; la sélectivité : l'amont fait au moins le double de l'aval (Sensata : « coordinated ratings » 2:1)
const MARGE_DISJONCTION = 1, MARGE_FRACTION = 1, SELECTIVITE = 2;
// le préchauffage de la feuille MS3320N (table VII) : un disjoncteur préchargé à 60 % de In
const PRECHARGE = 0.6;
// (v80, le lecteur, qui l'avait déjà dit : « valide, pas valide, point — pas de réserve, pas de je ne sais quoi ») : la courbe
// a une zone où il ne disjoncte pas et une où il disjoncte ; aucune marge de courant, aucune fraction du temps gardée en
// réserve — un point sous la courbe est valide, un point dessus ne l'est pas. Les hypothèses `marge` et `margeTemps`
// d'autrefois sont ignorées (un réglage gardé dans un navigateur ne les ramène pas).
const margesDuMeilleur = () => ({ marge: 0, k: 1, fraction: 1 });
/* Des mots pour les phrases du moteur (`nombreFr` est dans 09-barrettes). */
const motA = x => nombreFr(x) + ' A';
const motDuree = t => !isFinite(t) ? 'toujours' : t < 1 ? nombreFr(Math.round(t * 1000)) + ' ms' : t < 60 ? nombreFr(Math.round(t * 10) / 10) + ' s' : t < 3600 ? nombreFr(Math.round(t / 6) / 10) + ' min' : nombreFr(Math.round(t / 360) / 10) + ' h';
const motPalier = p => p === 2 ? 'pour 2 s' : p === 10 ? 'pour 10 s' : p === 60 ? 'pour 1 min' : 'en continu';
// deux courants comparés, écrits sans que l'arrondi les confonde (09 quater, `enOrdre` : « 9,655 A … au-delà de 9,656 A »)
const deuxA = (a, b) => (typeof enOrdre === 'function' ? enOrdre(a, b) : [Math.round(a * 100) / 100, Math.round(b * 100) / 100]).map(x => String(x).replace('.', ',') + ' A');
/* LE POINT QUI DÉCIDE, EN MOTS (v84 : « chaque chiffre s'explique en clair » — ce qu'il tire, pendant combien de temps, et
   le seuil de ce calibre sur cette durée ; aucune réserve, aucun pourcentage) : « démarrage et transition, 9,31 A pendant
   2,1 min ; sur cette durée, il ne disjoncte qu’au-delà de 9,66 A » ; « le permanent, 6 A ; il disjoncte dès 4,62 A » ;
   le point que le bilan désigne : « seul, il ne disjoncterait qu’au-delà de 17,23 A, mais les états mis bout à bout le
   font disjoncter ». Une marche plus longue que son état (des états plus forts avant lui) tire « au moins » ce courant. */
function motDuPoint(q) { if (!q) return ''; const perm = q.t === Infinity, [I, S] = isFinite(q.seuil) ? deuxA(q.i, q.seuil) : [motA(q.i), ''];
  const quoi = perm ? `le permanent, ${I}` : `${q.nom}, ${q.duree < q.t ? 'au moins ' : ''}${I} pendant ${motDuree(q.t)}`;
  if (!S) return `${quoi} ; sur cette durée, il ne disjoncte jamais`;
  if (q.parLaSomme) return `${quoi} ; seul, il ne disjoncterait qu’au-delà de ${S}, mais les états mis bout à bout le font disjoncter`;
  return `${quoi} ; ${perm ? '' : 'sur cette durée, '}il ${q.ok === false ? 'disjoncte dès' : 'ne disjoncte qu’au-delà de'} ${S}`; }
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
/* LES FAMILLES DE DISJONCTEURS que l'outil connaît : la table Familles de disjoncteurs de la norme (normes/disjoncteurs.csv,
   modifiable dans la page des normes), chaque motif devenu une expression (« MS3320 » → /^MS3320[A-Z]?(?=[-\s]|$)/ : un
   nom qui finit par un chiffre admet une lettre de variante, MS3320L ; « 2TC » → /^2TC\d*(?=[-\s]|$)/ : un nom qui finit par
   une lettre admet des chiffres, 2TC27) ; la liste codée ci-dessus seulement si la norme n'en a pas. */
const motifEnRegex = m => { const q = String(m).toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); return new RegExp('^' + q + (/\d$/.test(q) ? '[A-Z]?' : '\\d*') + '(?=[-\\s/]|$)', 'i'); };
// lues une fois par table (la table change d'objet quand la norme change)
const FAMILLES_LUES = new WeakMap();
function famillesDisjoncteurs(norme) { const src = norme && norme.disjoncteursFamilles && norme.disjoncteursFamilles.length ? norme : normeDesModules(norme), T = src.disjoncteursFamilles || [];
  if (!T.length) return FAMILLES_DISJONCTEURS;
  const vu = FAMILLES_LUES.get(T); if (vu && vu.n === T.length) return vu.F;
  const F = T.map(f => ({ ...f, famille: f.nom || f.famille, regex: (f.motifs || [f.nom || f.famille]).map(motifEnRegex) })); FAMILLES_LUES.set(T, { n: T.length, F }); return F; }
/* La famille d'un part number de disjoncteur, et son calibre s'il est de la gamme de la famille ; rien pour tout le
   reste (un collier, un connecteur, un relais). `norme` : la norme active, sinon l'embarquée. */
function familleDuPn(pn, norme) { pn = String(pn || '').trim(); if (!pn) return null; const F = famillesDisjoncteurs(norme).find(f => (f.regex || f.motifs).some(r => r.test(pn))); if (!F) return null;
  const dans = c => F.plage ? c >= F.calibres[0] - 1e-9 && c <= F.calibres[1] + 1e-9 : F.calibres.some(x => Math.abs(x - c) < 1e-9);
  const c = calibresEnQueue(pn).find(dans); return { ...F, pn, calibre: c != null ? c : null }; }
/* LA CHUTE PROPRE D'UN DISJONCTEUR à In (table Chute disjoncteur) : d'abord la table de l'ATELIER (l'Excel du lecteur, « Du
   max » de 3 à 35 A, quelle que soit la famille : `atelier`, elle compte entière) ; sinon la ligne de sa famille et de son
   calibre — la famille par son nom, sinon par la famille de courbes qu'elle prend ; rien quand la table l'ignore. Rend
   { chute, nom, note, atelier } en V. */
function chuteDuDisjoncteur(norme, famille, calibre) { if (!(calibre > 0)) return null; const T = normeDesModules(norme).chutesDisjoncteurs || []; if (!T.length) return null;
  const at = T.find(x => x.famille === 'ATELIER' && x.calibres.some(c => Math.abs(c - calibre) < 1e-9)); if (at) return { chute: at.chuteMax, nom: at.nom, note: at.note, atelier: true };
  const F = famille && typeof famille === 'object' ? famille : (famille ? familleDuPn(String(famille), norme) || { famille: cleNorme(famille), courbe: '' } : null);
  // un part number inconnu (ou absent) : la famille que le lecteur pose (FAMILLE_DISJONCTEUR_DEFAUT), puis celle de ses courbes
  const cles = F ? [cleNorme(F.famille), cleNorme(F.nom || ''), cleNorme(F.courbe || '')].filter(Boolean) : [FAMILLE_DISJONCTEUR_DEFAUT, FAMILLE_COURBES_DEFAUT];
  for (const k of cles) { const r = T.find(x => x.famille === k && x.calibres.some(c => Math.abs(c - calibre) < 1e-9)); if (r) return { chute: r.chuteMax, nom: r.nom, note: r.note, defaut: !F }; }
  return null; }
/* LE CATALOGUE d'une famille : ses calibres (une plage « 1 à 25 » prend la série d'aéronef qu'elle couvre), filtrés par la
   liste préférée du lecteur (`calibresPreferes` : 1, 3, 5, 7,5, 10, 15, 20, 25 A par défaut) — jusqu'au plus grand calibre
   de la liste seulement : au-delà, elle ne dit rien, et une famille de 15 à 35 A (3TC) ou de 20 à 50 A (EN 3661) garde
   ses 30, 35, 50 A ; vide, ou si rien n'en reste, tout le catalogue ; sans famille, la gamme du lecteur (CALIBRES). */
function calibresDeLaFamille(F, H) { let cs = !F || !F.calibres || !F.calibres.length ? CALIBRES.slice() : F.plage ? SERIE_CALIBRES.filter(c => c >= F.calibres[0] - 1e-9 && c <= F.calibres[1] + 1e-9) : F.calibres.slice();
  const pref = (H && Array.isArray(H.calibresPreferes) ? H.calibresPreferes : []).map(Number).filter(x => x > 0), haut = Math.max(...pref);
  if (pref.length) { const f = cs.filter(c => c > haut + 1e-9 || pref.some(p => Math.abs(p - c) < 1e-9)); if (f.length) cs = f; }
  return [...new Set(cs)].sort((a, b) => a - b); }
/* CE QUE LE DISJONCTEUR GARANTIT DE TENIR à une température (table Calibration, « Tient » : le multiple de In tenu une
   heure) : les lignes de sa famille — son nom exact, sinon une ligne qui commence par lui (« MS3320 (2TC) »), sinon qui le
   contient (« MS14153 / MS14154 ») —, sinon celles de sa famille de courbes (ETA483, 2TC) ; à chaque température la plus
   basse des lignes (deux sources se recouvrent : la plus prudente) ; entre deux températures, interpolée ; hors de la
   plage, celle du bord (`horsPlage`). La feuille MS3320N ne garantit que 0,80 In à 121 °C et 70 000 ft, le 2TC de
   Sensata 0,85 In : la courbe typique (0,92 In à 125 °C) est plus optimiste. Rend { tient, temperature, famille, source,
   interpolee, horsPlage, points } ou null. */
function tenueGarantie(norme, F, courbe, T) { if (T == null || !isFinite(+T)) return null; T = +T;
  const rows = (normeDesModules(norme).calibrations || []).filter(r => r.tient != null && r.temperature != null); if (!rows.length) return null;
  const cle = r => cleNorme(r.famille), essais = [];
  if (F && F.famille) { const k = cleNorme(F.famille); essais.push(r => cle(r) === k, r => cle(r).startsWith(k), r => cle(r).includes(k)); }
  const kc = cleNorme((F && F.courbe) || courbe || FAMILLE_COURBES_DEFAUT); if (kc) essais.push(r => cle(r) === kc);
  let L = []; for (const e of essais) { L = rows.filter(e); if (L.length) break; } if (!L.length) return null;
  const parT = new Map(); L.forEach(r => parT.set(r.temperature, Math.min(parT.has(r.temperature) ? parT.get(r.temperature) : Infinity, r.tient)));
  const P = [...parT].sort((a, b) => a[0] - b[0]); let tient, interpolee = false, horsPlage = false;
  if (T <= P[0][0]) { tient = P[0][1]; horsPlage = T < P[0][0]; }
  else if (T >= P[P.length - 1][0]) { tient = P[P.length - 1][1]; horsPlage = T > P[P.length - 1][0]; }
  else { const j = P.findIndex(p => p[0] >= T), a = P[j - 1], b = P[j]; interpolee = b[0] !== T; tient = interpolee ? a[1] + (T - a[0]) / (b[0] - a[0]) * (b[1] - a[1]) : b[1]; }
  const src = L.filter(r => r.source).map(r => r.source);
  return { tient, temperature: T, famille: L[0].famille, norme: L[0].norme, source: src.length ? src[0] : '', interpolee, horsPlage, points: P }; }
/* LE PART NUMBER d'un autre calibre de la même famille : la queue du part number lu, son calibre remplacé, écrite comme
   lui (« MS3320-10 » → « MS3320-15 » ; une fraction à la façon des feuilles MS, « MS3320-7-1/2 » ; une décimale garde sa
   virgule) ; sans part number, le premier motif de la famille. À vérifier au catalogue : c'est une désignation construite. */
const FRACTIONS = { 0.5: '1/2', 0.75: '3/4', 0.25: '1/4' };
function pnAvecCalibre(pn, F, cal) { if (!F || !(cal > 0)) return null; const base = String(pn || '').trim();
  const q = /[-\s](?:\d+-)?\d+\/\d+\s*A?$/i.exec(base) || /[-\s]\d{1,3}(?:[.,]\d{1,2})?\s*A?$/i.exec(base);
  const ent = Math.floor(cal + 1e-9), reste = Math.round((cal - ent) * 100) / 100, decimal = q && /[.,]/.exec(q[0]);
  const ecrit = !reste ? String(ent) : decimal ? String(cal).replace('.', decimal[0]) : FRACTIONS[reste] ? (ent ? ent + '-' : '') + FRACTIONS[reste] : String(cal).replace('.', ',');
  if (!q) { const m = (F.motifs || [])[0]; return (typeof m === 'string' ? m : String(F.famille || '')).toUpperCase() + '-' + ecrit; }
  return base.slice(0, q.index) + q[0][0] + ecrit + (/A$/i.test(q[0]) ? 'A' : ''); }
const calibreDuPn = pn => { const f = familleDuPn(pn); return f ? f.calibre : null; };
// un disjoncteur : le code CB (102CB1)
const estDisjoncteur = r => { const q = lireRepere(r); return !!(q && q.num && q.code === 'CB'); };

/* Les courbes d'une famille, de la plus rapide (le premier multiple le plus bas) à la plus lente. Chaque courbe : ses
   points tels que lus (`brut`, pour mémoire) et son ENVELOPPE (`points`) : par multiple croissant, le temps ne remonte
   jamais — les points lus sur une figure tremblent un peu, et l'outil ne doit jamais croire le disjoncteur plus lent
   qu'il n'est. Avec les hypothèses (`hyp.tableauMin`, `hyp.tableauMax` : l'ambiante du tableau de disjoncteurs), on
   ne garde que les courbes qui ENCADRENT cette ambiante : celles dans la fenêtre, plus la plus RAPIDE au max (c'est elle
   qui juge l'intempestif) et la plus LENTE au min (c'est elle qui dit ce qui passe) — la courbe de cette température si
   la table l'a, sinon une courbe INTERPOLÉE entre les deux températures qui l'encadrent (`interpolee`, R2 règle 5) ;
   au-delà de la table, la courbe du bord. Par défaut −55 à 125 °C : les courbes lues, toutes. Une courbe sans
   température reste toujours. */
const FAMILLE_COURBES_DEFAUT = 'ETA483';   // la feuille du lecteur : ce que prend un part number inconnu
// les disjoncteurs que le lecteur pose (20 octobre 2026 : « tous des 4120 ») : la chute propre d'un part number inconnu
// (ses courbes sont celles de l'ETA483 à ±2 %, fiche 4120 vectorielle)
const FAMILLE_DISJONCTEUR_DEFAUT = 'ETA4120';
const COURBES_LUES = new WeakMap();        // par table de courbes : les courbes déjà faites, par famille et fenêtre
function courbesDeDisjonction(norme, famille, hyp) { const src = norme && norme.disjoncteurs && norme.disjoncteurs.length ? norme : normeDesModules(norme), tous = src.disjoncteurs || [];
  // la famille demandée (le nom d'une famille de courbes, ou une famille de disjoncteurs qui dit sa courbe) ; sans famille, ETA483, sinon la première de la table
  let f = cleNorme(famille); if (f && !tous.some(d => d.famille === f)) { const F = famillesDisjoncteurs(norme).find(x => cleNorme(x.famille) === f || cleNorme(x.nom || '') === f); f = F && F.courbe && tous.some(d => d.famille === cleNorme(F.courbe)) ? cleNorme(F.courbe) : ''; }
  if (!f) f = tous.some(d => d.famille === FAMILLE_COURBES_DEFAUT) ? FAMILLE_COURBES_DEFAUT : (tous[0] ? tous[0].famille : '');
  const tmin = hyp && hyp.tableauMin != null && hyp.tableauMin !== '' ? +hyp.tableauMin : null, tmax = hyp && hyp.tableauMax != null && hyp.tableauMax !== '' ? +hyp.tableauMax : null;
  const cle = [f, tmin, tmax, tous.length].join('|'); let deja = COURBES_LUES.get(tous); if (!deja) COURBES_LUES.set(tous, deja = new Map()); if (deja.has(cle)) return deja.get(cle).slice();
  const rows = tous.filter(d => !f || d.famille === f), m = new Map();
  // (un point sans multiple ou sans temps positifs — une ligne mal écrite dans une norme importée — ne se lit pas : son
  // logarithme n'existe pas)
  rows.filter(d => d.multiple > 0 && d.temps > 0 && isFinite(d.multiple) && isFinite(d.temps))
    .forEach(d => (m.get(d.courbe) || m.set(d.courbe, { nom: d.courbe, famille: d.famille, temperature: d.temperature, brut: [] }).get(d.courbe)).brut.push({ m: d.multiple, t: d.temps }));
  const parVitesse = (a, b) => a.points[0].m - b.points[0].m || a.nom.localeCompare(b.nom);
  const cs = [...m.values()].map(c => { const brut = c.brut.slice().sort((a, b) => a.m - b.m || b.t - a.t); let mn = Infinity;
    const points = brut.map(p => { mn = Math.min(mn, p.t); return { m: p.m, t: mn }; }); return { ...c, brut, points }; })
    .filter(c => c.points.length).sort(parVitesse);
  let out = cs;
  if (tmin != null || tmax != null) { const lo = tmin == null ? -Infinity : tmin, hi = tmax == null ? Infinity : tmax, T = cs.filter(c => c.temperature != null);
    const temps = [...new Set(T.map(c => c.temperature))].sort((a, b) => a - b), a = t => T.filter(c => c.temperature === t);
    const rapide = t => a(t)[0], lente = t => { const xs = a(t); return xs[xs.length - 1]; };
    // le côté rapide, au max du tableau ; le côté lent, au min — lue, sinon interpolée entre les deux qui l'encadrent
    const tH = temps.find(t => t >= hi), tH0 = temps.filter(t => t < hi).pop(), tL = temps.filter(t => t <= lo).pop(), tL1 = temps.find(t => t > lo);
    const dessus = tH == null ? null : tH > hi && tH0 != null ? interpolerCourbes(rapide(tH0), rapide(tH), hi) : rapide(tH);
    const dessous = tL == null ? null : tL < lo && tL1 != null ? interpolerCourbes(lente(tL), lente(tL1), lo) : lente(tL);
    out = [...new Set(cs.filter(c => c.temperature == null || (c.temperature >= lo && c.temperature <= hi)).concat([dessus, dessous].filter(c => c && c.points.length)))].sort(parVitesse); }
  deja.set(cle, out); return out.slice(); }
/* UNE COURBE INTERPOLÉE en température entre deux courbes lues (A à Ta, B à Tb) : à chaque durée des deux courbes, le
   multiple admis, linéaire en température — la même règle que la tenue de la table Calibration ; tenue ensuite en
   enveloppe, comme les courbes lues. */
function interpolerCourbes(A, B, T) { const w = (T - A.temperature) / (B.temperature - A.temperature);
  const ts = [...new Set(A.points.concat(B.points).map(p => p.t))].sort((x, y) => y - x);
  // (une durée qu'une des deux ne lit pas — sous son dernier point, sans pente — ne fait pas de point)
  const brut = ts.map(t => { const ma = multipleAdmis(A, t), mb = multipleAdmis(B, t); return { m: ma + w * (mb - ma), t }; }).filter(p => isFinite(p.m) && p.m > 0).sort((a, b) => a.m - b.m || b.t - a.t);
  let mn = Infinity; const points = brut.map(p => { mn = Math.min(mn, p.t); return { m: p.m, t: mn }; });
  return { nom: nombreFr(Math.round(T * 10) / 10) + ' °C', famille: A.famille, temperature: T, brut, points, interpolee: true, entre: [A.nom, B.nom] }; }
/* LA PROTECTION PAR JAUGE (table Protection, AC 43.13-1B table 11-3) : le calibre maximal du disjoncteur et du fusible
   pour cette jauge de fil, la taille de contact usuelle et son courant. Rien pour une jauge que la table ignore (elle
   commence au 22 AWG) : on ne l'invente pas. */
function protectionDeJauge(norme, jauge) { if (jauge == null) return null; return (normeDesModules(norme).protections || []).find(p => p.jauge === jauge) || null; }
/* LA COURBE EST UNE FRONTIÈRE, et rien d'autre (v84) : sur papier log-log, la ligne brisée de ses points (l'enveloppe :
   par multiple croissant, le temps ne remonte jamais), la verticale de son premier multiple au-dessus de son premier
   point, et, au-delà de son dernier point, le prolongement de son dernier segment (la pente d'un bilame vers les forts
   courants ; un dernier segment vertical ou horizontal garde son dernier temps). Un point (multiple, durée) qui touche
   la frontière ou passe au-delà DISJONCTE ; en deçà, il ne disjoncte pas. Les deux lectures ci-dessous sont les deux
   manières de lire LA MÊME frontière, l'une l'inverse exacte de l'autre (tests/disjoncteur-maths.js) :
       durée < tempsDeDeclenchement(multiple)   ⟺   multiple < multipleAdmis(durée)   ⟺   il ne disjoncte pas.
   (v84 : la règle « une courbe partielle ne se prolonge pas » est tombée — elle gardait le dernier temps au-delà du
   dernier point : la 7274 à 71 °C, la plus RAPIDE, y devenait plus lente que celle de 25 °C — 61 ms contre 42 ms à
   10 In —, et la −55 °C, la plus LENTE, ne laissait passer que 3 In pendant 2 s, moins que la 25 °C max (3,7 In) ; et
   l'inverse ne le savait pas : le seuil disait « disjoncte » là où le temps disait « ne disjoncte pas ».) */
const penteFinale = P => { const n = P.length, a = P[n - 2], b = P[n - 1];
  return n > 1 && b.m > a.m && b.t < a.t ? (Math.log(b.t) - Math.log(a.t)) / (Math.log(b.m) - Math.log(a.m)) : 0; };
/* Le temps de déclenchement à ce multiple : sous le premier multiple, jamais (Infinity) ; entre deux points, une droite
   en log-log (la courbe d'un thermique est une droite par morceaux sur papier log-log : c'est ce que la figure du
   constructeur dessine) ; sur un trait vertical (deux points lus au même multiple), le temps le plus court ; au-delà du
   dernier, la pente du dernier segment. Le graphique, lui, dessine une courbe lissée de ces points (08-courbe-dj, à 5 %
   au plus en temps de chacun) : le jugement reste sur les points lus. */
function tempsDeDeclenchement(courbe, multiple) { const P = courbe.points, n = P.length; if (!n || !(multiple > 0) || multiple < P[0].m) return Infinity;
  // le dernier point lu à ce multiple ou avant (sur un trait vertical, le plus bas)
  let j = 0; while (j + 1 < n && P[j + 1].m <= multiple) j++;
  const a = P[j]; if (j === n - 1) { const s = penteFinale(P); return s && multiple > a.m ? Math.exp(Math.log(a.t) + s * (Math.log(multiple) - Math.log(a.m))) : a.t; }
  if (a.m === multiple) return a.t;
  const b = P[j + 1], k = (Math.log(multiple) - Math.log(a.m)) / (Math.log(b.m) - Math.log(a.m));
  return Math.exp(Math.log(a.t) + k * (Math.log(b.t) - Math.log(a.t))); }
/* L'inverse : le multiple qu'une durée admet encore (« sur 5 s, il ne disjoncte qu'au-delà de 1,45 In ») — le SEUIL ; une
   durée infinie, le premier multiple (en dessous, le disjoncteur ne disjoncte jamais) ; sur un palier (deux points lus au
   même temps), le multiple le plus bas ; sous le dernier point, la pente du dernier segment, comme le temps (sans pente :
   rien ne le fait disjoncter si vite, Infinity) ; une durée nulle n'est rien (Infinity). */
function multipleAdmis(courbe, duree) { const P = courbe.points, n = P.length; if (!n || !(duree > 0)) return Infinity; if (duree >= P[0].t) return P[0].m;
  // le premier point lu à cette durée ou plus court (sur un palier, le plus à gauche)
  let j = 1; while (j < n && P[j].t > duree) j++;
  if (j === n) { const a = P[n - 1], s = penteFinale(P); return s ? Math.exp(Math.log(a.m) + (Math.log(duree) - Math.log(a.t)) / s) : Infinity; }
  const a = P[j - 1], b = P[j]; if (b.t === duree) return b.m;
  const k = (Math.log(duree) - Math.log(a.t)) / (Math.log(b.t) - Math.log(a.t));
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
   tᵢ / t_decl(Iᵢ) du temps de déclenchement (la règle de Miner, celle des organes à une constante de temps), la somme
   doit rester sous 1 ; le permanent reste sous le premier multiple — et sous ce que le disjoncteur garantit de tenir
   (`o.tient`, en multiple de In : la table Calibration) quand on le donne. `o.chauffe` divise le temps de déclenchement
   des états qui surviennent en service (le préchauffage). Aucune marge : sous 1, il ne disjoncte pas ; à 1 ou au-delà,
   il disjoncte. (Un 1e-12 près, au plus, sur ce qu'il garantit : l'arrondi d'une multiplication, pas une réserve.) */
const enService = p => /^plus/.test(String(p && p.k || ''));
const chauffeDe = (p, chauffe) => chauffe > 1 && enService(p) ? chauffe : 1;
function bilanThermique(courbe, calibre, phases, o) { let somme = 0, permOk = true; o = o || {};
  phases.forEach(p => { const m = p.i / calibre, t0 = tempsDeDeclenchement(courbe, m);
    if (p.t === Infinity) { if (t0 !== Infinity || (o.tient != null && m > o.tient + 1e-12)) permOk = false; }
    else if (t0 !== Infinity) somme += p.t * chauffeDe(p, o.chauffe) / t0; });
  return { somme, permOk, sommeOk: somme < 1, ok: permOk && somme < 1 }; }
/* LE PRÉCHAUFFAGE d'un calibre sous un profil : le facteur de l'hypothèse (MS3320N table VII, préchargé à 60 % de In :
   ÷ 1,6 à 3,7), en plein dès que le permanent atteint 60 % de In, au-dessous en proportion du carré du courant
   (l'échauffement d'un bilame va comme I²) ; sans permanent, rien. */
function facteurPrechauffage(H, phases, calibre) { const k = H ? +H.prechauffage : NaN; if (!(k > 1) || !(calibre > 0)) return 1;
  const perm = phases.filter(p => p.t === Infinity).reduce((m, p) => Math.max(m, p.i), 0); if (!(perm > 0)) return 1;
  return 1 + (k - 1) * Math.min(1, Math.pow(perm / (PRECHARGE * calibre), 2)); }
/* LE POINT QUI DÉCIDE d'un calibre (v84) : quand il disjoncte, le permanent s'il est en cause (il disjoncte quoi qu'il
   arrive), sinon l'état qui passe le plus loin au-delà de son seuil — et, si chaque état passe seul, celui que le bilan
   désigne (`parLaSomme`) ; quand il ne disjoncte pas, l'état le plus près de son seuil, EN AMPÈRES (le permanent compris :
   « 9 A en permanence, il ne disjoncte qu'au-delà de 9,24 A » est plus près que « 9,31 A pendant 2 min, au-delà de
   12 A »). Ses chiffres disent toujours la même chose que le verdict : `seuil` (A), `avant` (s), `ok`. */
function pointQuiDecide(points) { const P = points.filter(p => p.marges && p.marges.length), ko = P.filter(p => p.ok === false);
  if (ko.length) return ko.find(p => p.t === Infinity) || ko.slice().sort((a, b) => b.i / b.seuil - a.i / a.seuil)[0];
  return P.slice().sort((a, b) => a.seuil / a.i - b.seuil / b.i)[0] || null; }
/* LE VERDICT d'un calibre sur un profil — VALIDE OU PAS VALIDE, point (v80 ; v84 : les trois lectures toujours d'accord).
   `points` : l'escalier (`pointsDuProfil`), chaque point jugé sur chaque courbe (`marges[k]`) : `temps`, le temps où il
   disjoncterait à ce courant (le préchauffage compris) ; `admis`, le SEUIL — le courant au-delà duquel il disjoncte sur
   cette durée (pour le permanent, sur la courbe qui juge, au plus ce qu'il garantit, `garanti`) ; `fraction`, la part de
   ses phases dans le bilan ; `ok`. Les trois disent la même chose, par construction (tests/disjoncteur-maths.js) :
       ok  ⟺  durée < temps  ⟺  courant < seuil      (le permanent : temps infini et courant ≤ ce qu'il garantit)
   — sauf le point que le BILAN désigne quand chaque état passe seul mais que leur somme atteint 1 (`parLaSomme` : ok faux,
   alors que son courant reste sous son seuil). Chaque point porte aussi ces chiffres à plat, sur la courbe qui juge :
   `seuil`, `avant`, `parLaSomme`. `valide` : chaque point ne disjoncte pas ET le bilan reste sous 1 sur la courbe la plus
   rapide — l'un et l'autre, jamais l'un sans l'autre (un état en service, préchauffé, peut passer au bilan et pas sur
   l'escalier) ; `pire` : le point qui décide (`pointQuiDecide`). `gamme` : chaque calibre du catalogue de la famille (et
   le retenu s'il est ailleurs : `catalogue` faux), jugé — valide, somme, tenu (ce qu'il garantit au permanent), pire,
   fils (les protège tous et reste sous ce qu'ils admettent), selectif (2:1 avec les disjoncteurs voisins) ; `meilleur` :
   le plus petit calibre qui ne disjoncte pas, et ses fils (`meilleurDe`) — `calibreIdeal` et `reserve` le reprennent ;
   `tenue` : ce que la famille garantit à la température max du tableau. Les champs de la marge d'autrefois restent pour
   qui les lit, égaux au verdict : `avecMarge` = `valide`, `marge` = `valide`, `serre` faux, `sommeMarge` = `somme`,
   `permanentMargeOk` = `permanentOk`. `contexte` : { famille (celle du part number, `familleDuPn` : son catalogue, sa
   calibration, sa courbe), pn, fils, hyp, autres } — les fils aval, les hypothèses, les calibres des disjoncteurs voisins. */
function verdictDisjonction(norme, famille, calibre, profil, contexte) { contexte = contexte || {};
  const H = { ...HYPOTHESES, ...(contexte.hyp || {}) }, F = contexte.famille && typeof contexte.famille === 'object' ? contexte.famille : null, M = margesDuMeilleur(H);
  const courbes = courbesDeDisjonction(norme, famille || (F && F.courbe) || H.courbe || '', H), pts = pointsDuProfil(profil), phases = phasesDuProfil(profil), fils = contexte.fils || [], autres = (contexte.autres || []).filter(c => c > 0);
  // ce que le disjoncteur garantit de tenir à la température max du tableau, là où la courbe la plus rapide juge
  const tenue = courbes.length ? tenueGarantie(norme, F, courbes[0].famille, H.tableauMax) : null, tientM = tenue ? tenue.tient : null;
  const juger = cal => { const chauffe = facteurPrechauffage(H, phases, cal);
    const bilans = courbes.map((c, k) => bilanThermique(c, cal, phases, { tient: k === 0 ? tientM : null, chauffe }));
    const points = pts.map(p => { const multiple = p.i / cal, perm = p.t === Infinity, qs = phases.filter(q => q.i === p.i && q.t !== Infinity), duree = qs.reduce((s, q) => s + q.t, 0), chaud = qs.some(enService) ? chauffe : 1;
      const marges = courbes.map((c, k) => { const brut = tempsDeDeclenchement(c, multiple), temps = brut === Infinity ? Infinity : brut / chaud, tient = perm && k === 0 && tientM != null ? tientM : Infinity;
        const garanti = tient * cal, admis = Math.min(multipleAdmis(c, perm ? Infinity : p.t * chaud) * cal, garanti);
        // la part de ses phases dans le bilan, chacune à son préchauffage — la somme de celles des points est le bilan
        const fraction = perm || brut === Infinity ? 0 : qs.reduce((s, q) => s + q.t * chauffeDe(q, chauffe) / brut, 0);
        const ok = perm ? brut === Infinity && multiple <= tient + 1e-12 : p.t < temps;
        return { courbe: c.nom, temps, fraction, somme: bilans[k].somme, ok, parLaSomme: false, rapport: perm ? (ok ? Infinity : 0) : temps / p.t, admis, marge: admis / p.i, garanti: isFinite(garanti) ? garanti : null }; });
      return { ...p, multiple, duree, chauffe: chaud, marges }; });
    // le bilan atteint 1 alors que chaque point passe seul : le point qui pèse le plus disjoncte, par la somme
    courbes.forEach((c, k) => { if (bilans[k].sommeOk) return; const gros = points.filter(p => p.t !== Infinity).sort((a, b) => b.marges[k].fraction - a.marges[k].fraction)[0];
      if (gros && gros.marges[k].ok) { gros.marges[k].ok = false; gros.marges[k].parLaSomme = true; } });
    points.forEach(p => { const m = p.marges[0]; p.ok = m ? m.ok : null; p.serre = false; p.seuil = m ? m.admis : null; p.avant = m ? m.temps : null; p.parLaSomme = !!(m && m.parLaSomme); });
    const b0 = bilans[0], valide = !!(b0 && b0.ok && points.every(p => p.ok !== false));
    // ce que le calibre garantit au permanent sur la courbe qui juge : la courbe et la calibration, la plus basse
    const tenu = courbes.length ? Math.min(courbes[0].points[0].m, tientM != null ? tientM : Infinity) * cal : null;
    return { points, valide, avecMarge: valide, serre: false, somme: b0 ? b0.somme : 0, sommeMarge: b0 ? b0.somme : 0, permanentOk: !!(b0 && b0.permOk), permanentMargeOk: !!(b0 && b0.permOk), tenu, chauffe, bilans, pire: pointQuiDecide(points) }; };
  // chaque calibre jugé une fois (le retenu est aussi dans la gamme)
  const juges = new Map(), juge = c => { if (!juges.has(c)) juges.set(c, juger(c)); return juges.get(c); };
  const J = calibre > 0 && courbes.length ? juge(calibre) : null;
  const points = J ? J.points : pts.map(p => ({ ...p, multiple: null, marges: [], ok: null, serre: false, seuil: null, avant: null, parLaSomme: false }));
  const valide = !!(J && pts.length && J.valide);
  // la gamme : le catalogue de la famille (sans famille, la gamme du lecteur), et le calibre retenu s'il est ailleurs
  const catalogue = calibresDeLaFamille(F, H), calibres = [...new Set(catalogue.concat(calibre > 0 ? [calibre] : []))].sort((a, b) => a - b), protCtx = contexteDeProtection(norme, H, courbes, pts);
  const gamme = calibres.map(c => { const dans = catalogue.some(x => Math.abs(x - c) < 1e-9);
    if (!(courbes.length && pts.length)) return { calibre: c, catalogue: dans, valide: null, serre: false, marge: null, somme: null, pire: null, fils: null, selectif: null, ideal: false };
    const j = juge(c), pf = fils.map(f => protegerFil(norme, c, f, H, protCtx));
    return { calibre: c, catalogue: dans, valide: j.valide, serre: false, marge: j.valide, somme: j.somme, sommeMarge: j.somme, permanentOk: j.permanentOk, permanentMargeOk: j.permanentOk, tenu: j.tenu, pire: j.pire,
      fils: fils.length ? pf.every(f => f.protege !== false && f.verdict !== 'calibre' && !f.horsTable && !f.contactSurcharge) : null,
      selectif: autres.length ? autres.every(a => Math.max(a, c) >= SELECTIVITE * Math.min(a, c) - 1e-9) : null, ideal: false }; });
  const meilleur = meilleurDe(norme, { F, H, M, tenue, courbes, pts, fils, gamme, protCtx, autres, pn: contexte.pn || (F && F.pn) || '' });
  const calibreMini = (gamme.find(g => g.valide) || {}).calibre || null, calibreIdeal = meilleur.calibre, reserve = meilleur.reserve;
  gamme.forEach(g => { g.ideal = g.calibre === calibreIdeal; });
  return { courbes, points, valide, serre: false, avecMarge: valide, somme: J ? J.somme : null, bilans: J ? J.bilans : [], gamme, catalogue, calibreMini, calibreIdeal, reserve, pire: J ? J.pire : null, meilleur,
    famille: F, tenue, marges: M, chauffe: J ? J.chauffe : 1, calibre: calibre > 0 ? calibre : null, autres, sansProfil: !pts.length, sansCourbe: !courbes.length }; }

/* LES TROIS MOTS DU VERDICT (v73, l'ingénieur : « les mots du verdict changent d'un écran à l'autre » — la fiche disait
   « passe / ne passe pas — il touche la courbe », le récapitulatif « tient / touche la courbe / déclenche », les
   problèmes « calibre à revoir ») : UNE table, que la fiche, le récapitulatif, les problèmes, le PDF et l'export lisent.
     · PASSE : il ne disjoncte pas (`--ok`) ;
     · DÉCLENCHE : un état passe au-delà de son seuil, le bilan thermique atteint 1, ou le permanent dépasse ce qu'il
       garantit (`--ko`) ;
     · JUSTE n'est plus qu'un nom (v77 : « soit c'est rouge, soit c'est vert » ; v80 : plus de marge) : il disjoncte, et
       le moteur ne le rend plus (`marge` vaut `valide`).
   `verdictDeCalibre(g)` : une ligne de la gamme ({ valide, marge }) ou le verdict d'ensemble (`verdictDisjonction`,
   `disjonctionDe` : celui du calibre retenu) ; null quand rien ne se juge (pas de profil, pas de courbe). */
const VERDICTS_CALIBRE = Object.freeze({
  passe: Object.freeze({ cle: 'passe', mot: 'ne disjoncte pas', encre: '--ok', etat: 'ok', bulle: 'Il ne disjoncte pas : chaque point du profil reste du côté de sa courbe où il ne coupe pas.' }),
  // (v77, le lecteur : « si ça touche, c'est rouge — il faut arrêter de mettre presque ; soit c'est rouge, soit c'est vert »)
  juste: Object.freeze({ cle: 'juste', mot: 'disjoncte', encre: '--ko', etat: 'ko', bulle: 'Il disjoncte.' }),
  declenche: Object.freeze({ cle: 'declenche', mot: 'disjoncte', encre: '--ko', etat: 'ko', bulle: 'Il disjoncte.' }) });
function verdictDeCalibre(g) { if (!g || g.sansProfil || g.sansCourbe) return null;
  // le verdict d'ensemble d'un disjoncteur : celui de la ligne de sa gamme qui porte le calibre retenu
  if (Array.isArray(g.gamme) && g.calibre > 0) { const x = g.gamme.find(y => Math.abs(y.calibre - g.calibre) < 1e-9); if (x) return verdictDeCalibre(x); }
  const v = g.valide, m = g.marge != null && typeof g.marge !== 'object' ? g.marge : g.avecMarge; if (v == null) return null;
  return v === false ? VERDICTS_CALIBRE.declenche : m ? VERDICTS_CALIBRE.passe : VERDICTS_CALIBRE.juste; }
/* LE POURQUOI CHIFFRÉ d'un calibre de la gamme, en une ligne (la bulle d'un cran, d'une puce, d'une ligne du
   récapitulatif), son point qui décide en ampères (`motDuPoint`) : « 7,5 A — disjoncte : démarrage et transition, 9,31 A
   pendant 2,1 min ; sur cette durée, il disjoncte dès 7,24 A », « 10 A — ne disjoncte pas : … ; sur cette durée, il ne
   disjoncte qu’au-delà de 9,66 A ». `d` : le verdict d'un disjoncteur (`disjonctionDe`, 08 : son profil, sa courbe, son
   contexte). Rend { verdict, phrase } ou null. */
function pourquoiDuCalibre(norme, d, cal) { if (!d || !(cal > 0) || d.sansProfil || d.sansCourbe) return null;
  // (v84) la ligne de sa gamme porte déjà son point qui décide : le moteur ne rejuge plus tout le profil pour une bulle
  const ligne = G => (G || []).find(x => Math.abs(x.calibre - cal) < 1e-9);
  let g = ligne(d.gamme); if (!g) try { g = ligne(verdictDisjonction(norme, d.courbe || '', cal, d.profil, d.contexte || {}).gamme); } catch (_) { g = null; }
  const v = verdictDeCalibre(g); if (!v) return null;
  // (v84) son point qui décide, en ampères — plus de « ses pointes consomment 6 % », plus de « avec la marge » (il n'y en a pas)
  let suite = motDuPoint(g.pire);
  if (g.fils === false && v === VERDICTS_CALIBRE.passe) suite += (suite ? ' ; ' : '') + 'des câbles à grossir';
  const A = motA(cal);
  return { verdict: v, phrase: `${A} — ${v.mot}${suite ? ' : ' + suite : ''}` }; }
/* LE CATALOGUE ENTIER d'une famille, sans la liste préférée du lecteur (« Tout le catalogue MS3320 (13) ») : ses calibres
   (une plage « 1 à 25 » prend la série d'aéronef qu'elle couvre) ; sans famille, la gamme du lecteur. */
function catalogueDeLaFamille(F) { const cs = !F || !F.calibres || !F.calibres.length ? CALIBRES.slice() : F.plage ? SERIE_CALIBRES.filter(c => c >= F.calibres[0] - 1e-9 && c <= F.calibres[1] + 1e-9) : F.calibres.slice();
  return [...new Set(cs)].sort((a, b) => a - b); }

/* LE MEILLEUR CALIBRE, et ses fils (R2 § 3.1 ; NASA TM-102179 étapes 3 à 7 ; AC 43.13-1B § 11-48, § 11-67) :
     1. le calibre : le plus petit du catalogue qui ne disjoncte pas (`verdictDisjonction` : le permanent sous ce qu'il
        garantit à la température max du tableau, chaque état sous son seuil, le bilan sous 1) — sans aucune marge ; s'il
        n'est pas à 2:1 avec un voisin, il reste le retenu et la réserve le dit ('selectivite') ;
     2. chaque fil qu'il nourrit doit le SUIVRE (`filSuit`) : porter la charge, admettre le calibre en service, rester dans
        la table 11-3, avoir un contact qui l'admet, ne pas s'abîmer avant que le disjoncteur s'ouvre. Sinon on ne monte
        pas le calibre — un disjoncteur plus gros protège moins —, on grossit le fil : la plus petite jauge de sa famille
        (la base des câbles) qui suit (`jaugeQuiSuit`) ; si cette jauge change la taille du contact, la cavité change :
        c'est dit (`contactsTouches`).
   Rend { calibre, pn (le part number de ce calibre dans la famille, construit), famille, catalogue, pourquoi (une phrase),
   marge: { courant (%), temps (%), permanent (A), garanti (A), tient (× In), temperature, source, fraction, fractionMarge,
   reste, horsPlage }, filsAChanger: [{ cable, actuel, propose, raison, jaugeActuelle, jaugeProposee, masseActuelle,
   masseProposee, direct, via, bouts, aucune }], contactsTouches: [{ cable, actuel, propose, intensite, repere, bouts,
   raison }], filsInconnus, selectif, serre (toujours faux : plus de marge), reserve ('' | 'fils' | 'selectivite') }. */
function meilleurDe(norme, o) { const { F, H, M, tenue, courbes, pts, fils, gamme, protCtx } = o;
  const cat = gamme.filter(g => g.catalogue), nomF = F ? 'de la famille ' + F.famille : 'de la gamme du lecteur';
  const vide = { calibre: null, pn: null, famille: F ? F.famille : '', catalogue: cat.map(g => g.calibre), filsAChanger: [], contactsTouches: [], filsInconnus: [], selectif: null, serre: false, reserve: '', marge: null };
  if (!courbes.length) return { ...vide, pourquoi: 'aucune courbe de disjonction dans la norme : rien ne se choisit' };
  if (!pts.length) return { ...vide, pourquoi: 'le profil de charge est à renseigner : sans lui, aucun calibre ne se choisit' };
  // (v80) le retenu est LE PLUS PETIT QUI NE DISJONCTE PAS — la sélectivité avec un voisin se dit (réserve
  // 'selectivite'), elle ne fait plus monter le calibre (le lecteur : « 7,5 A ne disjoncte pas, pourquoi 10 A retenu ? ») ;
  // ne pas disjoncter est monotone en calibre (un calibre plus gros a un temps de déclenchement plus long à chaque courant,
  // garantit plus au permanent, se préchauffe moins) : au-dessus du retenu, aucun ne disjoncte (tests/disjoncteur-maths.js)
  const g = cat.find(x => x.valide) || null;
  if (!g) return { ...vide, pourquoi: `aucun calibre ${nomF} (${cat.map(x => nombreFr(x.calibre)).join(', ')} A) ne supporte ce profil sans disjoncter à ${courbes[0].nom}` };
  const cal = g.calibre, perm = pts.filter(p => p.t === Infinity).reduce((m, p) => Math.max(m, p.i), 0);
  // les fils qui ne suivent pas ce calibre, et la jauge qui les suivrait
  const filsAChanger = [], contactsTouches = [], filsInconnus = [];
  fils.forEach(f => { const p = protegerFil(norme, cal, f, H, protCtx); if (p.verdict === 'inconnu') { filsInconnus.push(f.type ? f.type + (f.autre ? ' vers ' + f.autre : '') : '?'); return; } if (filSuit(p)) return;
    const prop = jaugeQuiSuit(norme, cal, f, H, protCtx), bouts = f.l ? [f.l.de, f.l.vers].filter(r => r && !estMasse(r) && !estDisjoncteur(r)) : [], cabA = cableDuType(norme, f.type);
    filsAChanger.push({ cable: f.cable || '', actuel: f.type, propose: prop ? prop.type : null, raison: raisonsDuFil(p, cal).join(' ; '), jaugeActuelle: p.jauge, jaugeProposee: prop ? prop.cable.jauge : null,
      masseActuelle: cabA && cabA.masse != null ? cabA.masse : null, masseProposee: prop && prop.cable.masse != null ? prop.cable.masse : null, direct: f.direct !== false, via: f.via || '', bouts,
      aucune: prop ? '' : 'aucune gauge de la famille ' + typeDuFil(f.type) + ' de la base des câbles ne suit le ' + motA(cal) });
    const avant = p.contact ? p.contact.taille : '', apres = prop && prop.p.contact ? prop.p.contact.taille : '';
    if (prop && apres && apres !== avant) contactsTouches.push({ cable: f.cable || '', actuel: avant, propose: apres, intensite: prop.p.contact.intensite, repere: f.contactRepere || '', bouts,
      raison: `le ${prop.type} se sertit sur un contact taille ${apres} (${motA(prop.p.contact.intensite)})${avant ? ', le ' + f.type + ' était sur un ' + avant + (f.contactRepere ? ' (' + f.contactRepere + ')' : '') : ''} : la cavité change${bouts.length ? ' — ' + bouts.join(', ') : ''}` }); });
  // la marge : ce que le calibre garantit au permanent, ce que les pointes consomment
  const marge = { courant: M.marge, temps: Math.round(M.fraction * 100), permanent: perm, garanti: g.tenu, tient: tenue ? tenue.tient : null, temperature: +H.tableauMax,
    source: tenue ? tenue.famille + (tenue.source ? ' — ' + tenue.source : '') : 'la courbe ' + courbes[0].nom, fraction: g.somme, fractionMarge: g.somme, reste: perm > 0 && g.tenu ? g.tenu / perm - 1 : null, horsPlage: !!(tenue && tenue.horsPlage) };
  const reserve = filsAChanger.length ? 'fils' : g.selectif === false ? 'selectivite' : '';
  // pourquoi, en une phrase (la bulle « Meilleur » du récapitulatif — v84 : en ampères, sans « tient » ni pourcentage) : son
  // point qui décide et ce qu'il garantit en permanence, pourquoi pas le calibre d'en dessous (il disjoncte, forcément : le
  // retenu est le premier qui ne disjoncte pas), ce qui reste à faire
  const q = g.pire, enPerm = perm > 0 && q && q.t !== Infinity ? ` ; en permanence, ${motA(perm)} sous les ${motA(g.tenu)} qu’il garantit à ${nombreFr(+H.tableauMax)} °C` : '';
  const prev = cat.filter(x => x.calibre < cal - 1e-9).pop(), Ap = prev ? motA(prev.calibre) : '', qp = prev && prev.pire;
  const pourquoiPas = !qp ? '' : q && qp.k === q.k && !qp.parLaSomme && isFinite(qp.seuil) ? `le ${Ap}, lui, disjoncte dès ${deuxA(qp.i, qp.seuil)[1]}` : `le ${Ap} disjoncte : ${motDuPoint(qp)}`;
  const phrases = [`${motA(cal)} : le plus petit calibre ${nomF} qui ne disjoncte pas — ${motDuPoint(q)}${enPerm}`];
  if (pourquoiPas) phrases.push(pourquoiPas);
  if (g.selectif === false) phrases.push('il n’est pas à 2:1 avec le disjoncteur voisin : à voir');
  if (filsAChanger.length) phrases.push(filsAChanger.map(x => (x.actuel || 'un câble') + (x.bouts && x.bouts.length ? ' vers ' + x.bouts[x.bouts.length - 1] : '') + ' ' + (x.propose ? 'en ' + x.propose : '— ' + x.aucune)).join(', ') + (contactsTouches.length ? ' (' + (contactsTouches.length > 1 ? contactsTouches.length + ' contacts changent' : 'un contact change') + ' de taille)' : ''));
  else if (fils.length) phrases.push('ses câbles le suivent');
  return { calibre: cal, pn: F ? pnAvecCalibre(o.pn, F, cal) : null, famille: F ? F.famille : '', catalogue: cat.map(x => x.calibre), pourquoi: phrases.join(' ; '), marge, filsAChanger, contactsTouches, filsInconnus, selectif: g.selectif, serre: false, reserve }; }
/* UN FIL SUIT un calibre : il porte la charge, admet le calibre en service, reste dans la table 11-3, son contact admet le
   calibre et porte le permanent, et ce que le disjoncteur laisse passer reste sous sa courbe de dommage. */
const filSuit = p => p.verdict === 'ok' && p.protege !== false && !p.horsTable && !p.contactSurcharge && !p.contactDepasse;
/* Pourquoi un fil ne suit pas, en mots. */
function raisonsDuFil(p, cal) { const r = [];
  if (p.verdict === 'fil' && p.pire) r.push(`ne porte pas ${p.pire.nom} ${motA(p.pire.i)}${p.pire.t === Infinity ? '' : ' pendant ' + motDuree(p.pire.t)} : il admet ${motA(p.pire.admise)} ${motPalier(p.pire.palier)}`);
  if (p.verdict === 'calibre') r.push(`n’admet que ${motA(p.continu)} en service continu, moins que le calibre ${motA(cal)}`);
  if (p.horsTable) r.push(`la table 11-3 plafonne le ${p.jauge} AWG à ${motA(p.calibreMax)}`);
  if (p.contactDepasse) r.push(`son contact taille ${p.contact.taille} (${motA(p.contact.intensite)}) ne porte pas le permanent`);
  else if (p.contactSurcharge) r.push(`son contact taille ${p.contact.taille} n’admet que ${motA(p.contact.intensite)}`);
  if (p.protege === false && p.pireLaisse) { const x = p.pireLaisse; r.push(`le ${motA(cal)} laisse passer ${motA(x.courant)} ${motPalier(x.palier)} à ${p.courbeLente}, ${p.jugeSur === 'dommage' ? 'il s’abîme au-delà de ' : 'il n’admet que '}${motA(x.admise)}`); }
  return r; }
/* LA JAUGE QUI SUIT : dans la famille du fil (la base des câbles : DR24 → DR22, DR20…), de la plus fine à la plus grosse
   au-delà de la sienne, la première qui suit le calibre — jugée avec le contact usuel de sa jauge (un fil grossi se
   sertit sur un autre contact). Rend { type, cable, p } ou null. */
function jaugeQuiSuit(norme, cal, f, H, ctx) { const fam = typeDuFil(f.type), j0 = jaugeDuType(f.type); if (!fam || j0 == null) return null;
  const C = cablesDe(norme).filter(c => c.famille === fam && c.jauge != null && c.jauge < j0).sort((a, b) => b.jauge - a.jauge || a.cable.localeCompare(b.cable));
  for (const c of C) { const p = protegerFil(norme, cal, { ...f, type: c.cable, taille: '', contactRepere: '' }, H, ctx); if (filSuit(p)) return { type: c.cable, cable: c, p }; }
  return null; }

// les paliers de l'EN 2853 : ce qu'un fil admet pendant 2 s, 10 s, 1 min, et en continu
const PALIERS_EN2853 = [[2, '2 s'], [10, '10 s'], [60, '1 min'], [Infinity, 'continu']];
/* LA COURBE DE DOMMAGE d'un fil cuivre (table Dommage des fils, recherche R2) : la ligne de sa jauge dont la tenue est la
   plus haute sans dépasser la T max de la famille du câble (DR 260 °C, coaxiaux 200, BN 150) ; en t secondes, le plus
   grand de √(I²t / t) — l'adiabatique depuis 135 °C (CEI 60949) — et du continu — l'EN 2853 déclassée (faisceau,
   altitude) portée à la tenue, × √((T tenue − ambiante)/40) (AC 43.13-1B § 11-67 b-c ; MIL-W-5088L § 6.7 : un fil se
   classe sur ΔT = tenue − ambiante). Rien pour un conducteur qui n'est pas du cuivre (CCA, aluminium : K et β non
   trouvés), ni pour une famille sans T max : la protection se juge alors comme avant, sur les intensités de service. */
function dommageDuFil(norme, type, jauge, fil, rd, H, k) { if (!fil || fil.intensite == null || jauge == null || !rd || rd.conducteur !== 'cuivre') return null;
  const fam = cableFamilleDe(norme, type); if (!fam || fam.tmax == null) return null;
  const r = (normeDesModules(norme).dommages || []).filter(x => x.jauge === jauge && x.conducteur === 'cuivre' && x.i2t > 0 && x.tmax <= fam.tmax + 1e-9).sort((a, b) => b.tmax - a.tmax)[0]; if (!r) return null;
  const continu = fil.intensite * k * Math.sqrt(Math.max(0, r.tmax - (+H.ambiante)) / ECHAUFFEMENT_EN2853);
  return { tmax: r.tmax, tenueCable: fam.tmax, i2t: r.i2t, t0: r.t0, continu, source: r.source, statut: r.statut,
    limite: t => isFinite(t) && t > 0 ? Math.max(continu, Math.sqrt(r.i2t / t)) : continu }; }
/* LE CONTEXTE d'une protection : le déclassement des hypothèses, la courbe lente (celle du min du tableau), le profil. */
function contexteDeProtection(norme, H, courbes, pts) { const cs = courbes || courbesDeDisjonction(norme, H.courbe || '', H);
  return { k: facteurDeclassement(norme, H.conditions, { fils: H.fils, charge: H.charge, altitude: H.altitude }), lente: cs[cs.length - 1] || null, pts: pts || [] }; }
/* LA PROTECTION DES FILS. Chaque fil du disjoncteur — des deux côtés : le courant les traverse tous, et un dédoublement
   se partage on ne sait comment, chacun doit donc tenir tout — jugé deux fois :
     · LA CHARGE (`phases`, `pire`, `verdict`) : à chaque phase du profil, le courant reste sous ce que la norme des fils
       (EN 2853) admet pour cette durée, déclassé comme la simulation (faisceau, ambiante) ; sinon 'fil'. Et le calibre
       ne dépasse pas ce que le fil admet en service continu, sinon 'calibre' — un verdict à part : un fil doit porter en
       continu au moins le calibre qui le protège (AS50881 cité par Lectromec ; AC 43.13-1B § 11-48) ;
     · LA PROTECTION (`laisse`, `pireLaisse`, `protege`) : ce que le disjoncteur laisse passer sur la courbe la plus
       lente (celle du min du tableau), m(t) × In, reste à chaque palier de l'EN 2853 (2 s, 10 s, 1 min, continu) sous
       la COURBE DE DOMMAGE du fil (`dommageDuFil`, `jugeSur` = 'dommage') — aux paliers seulement : entre eux, le plus
       grand de l'adiabatique et du continu sous-estime ce que le fil supporte (l'adiabatique ignore le refroidissement,
       justement là où les deux se croisent) ; aux paliers, la méthode retrouve la table 11-3 de la FAA (R2) ; sans
       courbe de dommage (CCA, aluminium, tenue inconnue), sous ses intensités de service, comme avant (`jugeSur` =
       'service', plus sévère). Chaque case de `laisse` : le courant laissé, la limite qui juge (`admise`), l'intensité
       de service (`service`) et le dommage (`dommage`).
   Le déclassement : le faisceau s'applique à tout ; l'ambiante (EN 2853 note 2, √((Tr − Tu)/40)) seulement au CONTINU
   — les paliers 2 s, 10 s, 1 min sont adiabatiques ; un conducteur qui n'est pas du cuivre (AD, VN : aluminium cuivré ;
   AM, YV : aluminium, 20 % au moins) se déclasse encore, partout (comme la simulation : `kConducteur`) ; sans la
   résistance du câble, son intensité est inconnue, rien n'est inventé. `facteur` est celui du continu, `facteurCourt`
   celui des paliers. Deux garde-fous de plus, par fil :
     · LA TABLE 11-3 de l'AC 43.13-1B (table Protection) : le calibre ne dépasse pas le maximum de la jauge
       (`calibreMax`, `horsTable`) — rien pour une jauge qu'elle ignore (24, 26 AWG) ;
     · LE CONTACT : le courant du contact de la taille du fil (`f.taille` si l'appelant la connaît — le contact du plan —,
       sinon la taille usuelle de la jauge ; table Résistance des contacts, sinon Protection) : le permanent doit rester
       dessous (`contactDepasse`), et le calibre aussi (`contactSurcharge`), sans quoi une surcharge que le
       disjoncteur laisse passer cuit le contact.
   `fils` : [{ cable, type, taille?, … }] ; `hyp` : les hypothèses de la simulation (l'ambiante du tableau choisit la
   courbe lente, `courbe` sa famille). La tenue du câble à l'ambiante est dite aussi (`tenue`). */
function protectionDesFils(norme, calibre, profil, fils, hyp) { const H = { ...HYPOTHESES, ...(hyp || {}) }, ctx = contexteDeProtection(norme, H, null, pointsDuProfil(profil));
  return (fils || []).map(f => protegerFil(norme, calibre, f, H, ctx)); }
function protegerFil(norme, calibre, f, H, ctx) { const { k, lente, pts } = ctx;
  const jauge = jaugeDuType(f.type), fil = filDeNorme(norme, f.type, jauge), rd = resistanceDuFil(norme, f.type, jauge, H.tconducteur), tenue = tenueEnTemperature(norme, f.type, H.ambiante);
  const protection = protectionDeJauge(norme, jauge), calibreMax = protection ? protection.disjoncteurMax : null, horsTable = !!(calibre > 0 && calibreMax != null && calibre > calibreMax + 1e-9);
  // le contact : celui du plan si l'appelant le donne, sinon la taille usuelle de la jauge (table Protection, sinon la plus petite qui l'admet) — et la ligne de la table des contacts qui lui répond,
  // bornée par la jauge du fil serti et le fût quand on le connaît (table Courant des contacts : un 24 AWG dans un contact 20 porte 3 A, pas 7,5)
  const taille = f.taille || (protection && protection.tailleContact) || tailleDeJauge(norme, f.famille || '', jauge), ic = intensiteDeContact(norme, taille, jauge, null, f.fut != null ? f.fut : null), contact = ic ? { ...ic, taille: f.taille || ic.taille, parLePlan: !!f.taille } : null;
  const permanent = pts.filter(p => p.t === Infinity).reduce((m, p) => Math.max(m, p.i), 0);
  const contactSurcharge = !!(contact && calibre > 0 && calibre > contact.intensite + 1e-9), contactDepasse = !!(contact && permanent > contact.intensite + 1e-9);
  const commun = { fil: fil || null, jauge, conducteur: rd.conducteur, kConducteur: rd.kConducteur, tenue, calibreMax, horsTable, contact, contactSurcharge, contactDepasse, permanent, courbeLente: lente ? lente.nom : '' };
  if (!fil || fil.intensite == null || rd.refuse) return { ...f, ...commun, continu: null, facteur: 1, facteurCourt: 1, phases: [], pire: null, laisse: [], pireLaisse: null, protege: null, jugeSur: '', dommage: null, verdict: 'inconnu', refuse: !!rd.refuse };
  // ce que le câble admet, déclassé : LE calcul de la fiche d'un câble (09 quater, `admissionDuFil`) — le facteur suit le
  // PALIER de la durée (v84 : un état de 2,1 min se juge sur le continu, donc avec l'ambiante ; avant, le facteur du continu
  // n'allait qu'au permanent, et hors de 95 °C la transition de 102CB1 était jugée sans l'ambiante)
  const A = admissionDuFil(norme, f.type, H), facteur = A.facteurContinu, facteurCourt = A.facteurCourt, continu = A.continu, service = A.admise;
  const phases = pts.map(p => { const admise = service(p.t); return { ...p, admise, palier: palierDe(p.t), ok: p.i <= admise + 1e-9 }; });
  const pire = phases.filter(p => !p.ok).sort((a, b) => b.i / b.admise - a.i / a.admise)[0] || null;
  // LA PROTECTION : contre la courbe de dommage du fil ; à défaut, contre ses intensités de service (la règle d'avant, plus sévère)
  const dom = dommageDuFil(norme, f.type, jauge, fil, rd, H, k), limite = t => dom ? dom.limite(t) : service(t);
  const laisse = lente && calibre > 0 ? PALIERS_EN2853.map(([t, mot]) => { const multiple = multipleAdmis(lente, t), courant = multiple * calibre, admise = limite(t);
    return { palier: t, mot, multiple, courant, admise, service: service(t), dommage: dom ? admise : null, ok: courant <= admise + 1e-9 }; }) : [];
  const pireLaisse = laisse.filter(x => !x.ok).sort((a, b) => b.courant / b.admise - a.courant / a.admise)[0] || null;
  return { ...f, ...commun, continu, facteur, facteurCourt, phases, pire, laisse, pireLaisse, protege: laisse.length ? !pireLaisse : null, jugeSur: dom ? 'dommage' : 'service',
    dommage: dom ? { tmax: dom.tmax, tenueCable: dom.tenueCable, i2t: dom.i2t, continu: dom.continu, source: dom.source } : null, approx: !!fil.approx, refuse: false,
    verdict: pire ? 'fil' : (calibre > 0 && calibre > continu + 1e-9) ? 'calibre' : 'ok' }; }
