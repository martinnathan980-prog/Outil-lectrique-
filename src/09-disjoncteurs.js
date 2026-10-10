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
   le plus petit calibre de la gamme qui tient le permanent et les pointes
   avec la marge (hypothèses `marge` : 10 % de courant, `margeTemps` : 75 %
   du temps de déclenchement), à la température max du tableau, et qui reste
   sélectif 2:1 avec ses voisins s'il en est un — sans passer de l'autre côté
   d'un voisin pour y arriver. Puis, pour chaque fil qui
   ne le suit pas, la plus petite jauge de sa famille (la base des câbles)
   qui tient la charge et que ce calibre protège — ON NE MONTE JAMAIS LE
   CALIBRE POUR SAUVER UN FIL : un disjoncteur plus gros protège moins ; et
   les contacts que la jauge conseillée change de taille. `calibreIdeal` est
   ce calibre, `reserve` dit ce qui reste à faire ('fils', 'selectivite',
   'serre'). « Serré » (tient, sans la marge) reste un avertissement.
   Rien ici ne touche à la page : le moteur, comme 09.
   =========================================================================== */
'use strict';

// la gamme du lecteur : celle d'un disjoncteur dont le part number ne dit pas la famille — la même que sa liste préférée
// (HYPOTHESES.calibresPreferes, 09) : « c'est 1, 3, 5, 7,5, 10, 15, 20, 25 »
const CALIBRES = [1, 3, 5, 7.5, 10, 15, 20, 25];
// la série des calibres d'aéronef (MS3320N, MS22073M, MS14105, EN 3661 : la table Familles) — ce qu'une famille donnée en
// plage (« 1 à 25 ») propose
const SERIE_CALIBRES = [0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10, 15, 20, 25, 30, 35, 40, 50];
// les marges par défaut du meilleur calibre — les hypothèses `marge` et `margeTemps` les remplacent : 10 % de courant en
// plus (R2 règle 13), au plus 75 % du temps de déclenchement consommé (R2 § 3.1) ; la sélectivité : l'amont fait au moins
// le double de l'aval (Sensata : « coordinated ratings » 2:1)
const MARGE_DISJONCTION = 1.1, MARGE_FRACTION = 0.75, SELECTIVITE = 2;
// le préchauffage de la feuille MS3320N (table VII) : un disjoncteur préchargé à 60 % de In
const PRECHARGE = 0.6;
/* Les marges d'une hypothèse : le facteur de courant (1 + marge %), la fraction du temps de déclenchement admise. */
const margesDuMeilleur = H => { const m = H ? +H.marge : NaN, f = H ? +H.margeTemps : NaN, okM = isFinite(m) && m >= 0, okF = isFinite(f) && f > 0;
  return { marge: okM ? m : Math.round((MARGE_DISJONCTION - 1) * 100), k: okM ? 1 + m / 100 : MARGE_DISJONCTION, fraction: okF ? f / 100 : MARGE_FRACTION }; };
/* Des mots pour les phrases du moteur (`nombreFr` est dans 09-barrettes). */
const motA = x => nombreFr(x) + ' A';
const motPct = x => x > 9.995 ? '> 1 000 %' : nombreFr(Math.round(x * 100)) + ' %';
const motDuree = t => !isFinite(t) ? 'toujours' : t < 1 ? nombreFr(Math.round(t * 1000)) + ' ms' : t < 60 ? nombreFr(Math.round(t * 10) / 10) + ' s' : t < 3600 ? nombreFr(Math.round(t / 6) / 10) + ' min' : nombreFr(Math.round(t / 360) / 10) + ' h';
const motPalier = p => p === 2 ? 'pour 2 s' : p === 10 ? 'pour 10 s' : p === 60 ? 'pour 1 min' : 'en continu';
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
/* LA CHUTE PROPRE D'UN DISJONCTEUR à In (table Chute disjoncteur) : la ligne de sa famille et de son calibre — la famille
   par son nom, sinon par la famille de courbes qu'elle prend ; rien quand la table l'ignore. Rend { chute, nom, note } en V. */
function chuteDuDisjoncteur(norme, famille, calibre) { if (!(calibre > 0)) return null; const T = normeDesModules(norme).chutesDisjoncteurs || []; if (!T.length) return null;
  const F = famille && typeof famille === 'object' ? famille : (famille ? familleDuPn(String(famille), norme) || { famille: cleNorme(famille), courbe: '' } : null);
  const cles = F ? [cleNorme(F.famille), cleNorme(F.nom || ''), cleNorme(F.courbe || '')].filter(Boolean) : [FAMILLE_COURBES_DEFAUT];
  for (const k of cles) { const r = T.find(x => x.famille === k && x.calibres.some(c => Math.abs(c - calibre) < 1e-9)); if (r) return { chute: r.chuteMax, nom: r.nom, note: r.note }; }
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
const COURBES_LUES = new WeakMap();        // par table de courbes : les courbes déjà faites, par famille et fenêtre
function courbesDeDisjonction(norme, famille, hyp) { const src = norme && norme.disjoncteurs && norme.disjoncteurs.length ? norme : normeDesModules(norme), tous = src.disjoncteurs || [];
  // la famille demandée (le nom d'une famille de courbes, ou une famille de disjoncteurs qui dit sa courbe) ; sans famille, ETA483, sinon la première de la table
  let f = cleNorme(famille); if (f && !tous.some(d => d.famille === f)) { const F = famillesDisjoncteurs(norme).find(x => cleNorme(x.famille) === f || cleNorme(x.nom || '') === f); f = F && F.courbe && tous.some(d => d.famille === cleNorme(F.courbe)) ? cleNorme(F.courbe) : ''; }
  if (!f) f = tous.some(d => d.famille === FAMILLE_COURBES_DEFAUT) ? FAMILLE_COURBES_DEFAUT : (tous[0] ? tous[0].famille : '');
  const tmin = hyp && hyp.tableauMin != null && hyp.tableauMin !== '' ? +hyp.tableauMin : null, tmax = hyp && hyp.tableauMax != null && hyp.tableauMax !== '' ? +hyp.tableauMax : null;
  const cle = [f, tmin, tmax, tous.length].join('|'); let deja = COURBES_LUES.get(tous); if (!deja) COURBES_LUES.set(tous, deja = new Map()); if (deja.has(cle)) return deja.get(cle).slice();
  const rows = tous.filter(d => !f || d.famille === f), m = new Map();
  rows.forEach(d => (m.get(d.courbe) || m.set(d.courbe, { nom: d.courbe, famille: d.famille, temperature: d.temperature, brut: [] }).get(d.courbe)).brut.push({ m: d.multiple, t: d.temps }));
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
    out = [...new Set(cs.filter(c => c.temperature == null || (c.temperature >= lo && c.temperature <= hi)).concat([dessus, dessous].filter(Boolean)))].sort(parVitesse); }
  deja.set(cle, out); return out.slice(); }
/* UNE COURBE INTERPOLÉE en température entre deux courbes lues (A à Ta, B à Tb) : à chaque durée des deux courbes, le
   multiple admis, linéaire en température — la même règle que la tenue de la table Calibration ; tenue ensuite en
   enveloppe, comme les courbes lues. */
function interpolerCourbes(A, B, T) { const w = (T - A.temperature) / (B.temperature - A.temperature);
  const ts = [...new Set(A.points.concat(B.points).map(p => p.t))].sort((x, y) => y - x);
  const brut = ts.map(t => { const ma = multipleAdmis(A, t), mb = multipleAdmis(B, t); return { m: ma + w * (mb - ma), t }; }).sort((a, b) => a.m - b.m || b.t - a.t);
  let mn = Infinity; const points = brut.map(p => { mn = Math.min(mn, p.t); return { m: p.m, t: mn }; });
  return { nom: nombreFr(Math.round(T * 10) / 10) + ' °C', famille: A.famille, temperature: T, brut, points, interpolee: true, entre: [A.nom, B.nom] }; }
/* LA PROTECTION PAR JAUGE (table Protection, AC 43.13-1B table 11-3) : le calibre maximal du disjoncteur et du fusible
   pour cette jauge de fil, la taille de contact usuelle et son courant. Rien pour une jauge que la table ignore (elle
   commence au 22 AWG) : on ne l'invente pas. */
function protectionDeJauge(norme, jauge) { if (jauge == null) return null; return (normeDesModules(norme).protections || []).find(p => p.jauge === jauge) || null; }
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
   tᵢ / t_decl(Iᵢ) du temps de déclenchement, la somme doit rester sous 1 ; le permanent reste sous le premier multiple
   — et sous ce que le disjoncteur garantit de tenir (`o.tient`, en multiple de In : la table Calibration) quand on le
   donne. `k` grossit les courants (1,1 : la marge du meilleur calibre) ; `o.chauffe` divise le temps de déclenchement des
   états qui surviennent en service (le préchauffage). */
const enService = p => /^plus/.test(String(p && p.k || ''));
function bilanThermique(courbe, calibre, phases, k, o) { let somme = 0, permOk = true; k = k || 1; o = o || {};
  phases.forEach(p => { const m = p.i * k / calibre, t0 = tempsDeDeclenchement(courbe, m), t = o.chauffe > 1 && enService(p) && t0 !== Infinity ? t0 / o.chauffe : t0;
    if (p.t === Infinity) { if (t0 !== Infinity || (o.tient != null && m > o.tient + 1e-9)) permOk = false; } else if (t !== Infinity) somme += p.t / t; });
  return { somme, permOk, sommeOk: somme < 1 - 1e-9, ok: permOk && somme < 1 - 1e-9 }; }
/* LE PRÉCHAUFFAGE d'un calibre sous un profil : le facteur de l'hypothèse (MS3320N table VII, préchargé à 60 % de In :
   ÷ 1,6 à 3,7), en plein dès que le permanent atteint 60 % de In, au-dessous en proportion du carré du courant
   (l'échauffement d'un bilame va comme I²) ; sans permanent, rien. */
function facteurPrechauffage(H, phases, calibre) { const k = H ? +H.prechauffage : NaN; if (!(k > 1) || !(calibre > 0)) return 1;
  const perm = phases.filter(p => p.t === Infinity).reduce((m, p) => Math.max(m, p.i), 0); if (!(perm > 0)) return 1;
  return 1 + (k - 1) * Math.min(1, Math.pow(perm / (PRECHARGE * calibre), 2)); }
/* LE VERDICT d'un calibre sur un profil. `points` : l'escalier, chaque point jugé sur chaque courbe (ce que le
   disjoncteur tient à ce multiple — pour le permanent, sur la courbe qui juge, au plus ce qu'il garantit, `garanti` —, la
   fraction que ses phases consomment, s'il tient) ; `valide` : le bilan thermique tient sur la courbe la plus rapide ;
   `avecMarge` : il tient encore avec la marge de courant et sous la fraction admise du temps de déclenchement (hypothèses
   `marge`, `margeTemps`) ; `serre` : valide sans la marge ; `gamme` : chaque calibre du catalogue de la famille (et le
   retenu s'il est ailleurs : `catalogue` faux), jugé — valide, serre, marge, somme, fils (les protège tous et reste sous
   ce qu'ils admettent), selectif (2:1 avec les disjoncteurs voisins) ; `meilleur` : le meilleur calibre et ses fils
   (`meilleurDe`) — `calibreIdeal` et `reserve` le reprennent ; `tenue` : ce que la famille garantit à la température max
   du tableau. `contexte` : { famille (celle du part number, `familleDuPn` : son catalogue, sa calibration, sa courbe), pn,
   fils, hyp, autres } — les fils aval, les hypothèses, les calibres des disjoncteurs voisins. */
function verdictDisjonction(norme, famille, calibre, profil, contexte) { contexte = contexte || {};
  const H = { ...HYPOTHESES, ...(contexte.hyp || {}) }, F = contexte.famille && typeof contexte.famille === 'object' ? contexte.famille : null, M = margesDuMeilleur(H);
  const courbes = courbesDeDisjonction(norme, famille || (F && F.courbe) || H.courbe || '', H), pts = pointsDuProfil(profil), phases = phasesDuProfil(profil), fils = contexte.fils || [], autres = (contexte.autres || []).filter(c => c > 0);
  // ce que le disjoncteur garantit de tenir à la température max du tableau, là où la courbe la plus rapide juge
  const tenue = courbes.length ? tenueGarantie(norme, F, courbes[0].famille, H.tableauMax) : null, tientM = tenue ? tenue.tient : null;
  const juger = cal => { const chauffe = facteurPrechauffage(H, phases, cal), opt = i => ({ tient: i === 0 ? tientM : null, chauffe });
    const bilans = courbes.map((c, i) => bilanThermique(c, cal, phases, 1, opt(i))), marges = courbes.map((c, i) => bilanThermique(c, cal, phases, M.k, opt(i)));
    const points = pts.map(p => { const multiple = p.i / cal, qs = phases.filter(q => q.i === p.i && q.t !== Infinity), duree = qs.reduce((s, q) => s + q.t, 0), chaud = qs.some(enService) ? chauffe : 1;
      const m = courbes.map((c, k) => { const brut = tempsDeDeclenchement(c, multiple), temps = brut === Infinity ? Infinity : brut / chaud;
        const garanti = p.t === Infinity && k === 0 && tientM != null ? tientM * cal : Infinity, admis = Math.min(multipleAdmis(c, p.t === Infinity ? Infinity : p.t * chaud) * cal, garanti);
        const fraction = p.t === Infinity || temps === Infinity ? 0 : duree / temps, ok = p.t === Infinity ? temps === Infinity && p.i <= garanti + 1e-9 : temps > p.t;
        return { courbe: c.nom, temps, fraction, somme: bilans[k].somme, ok, rapport: p.t === Infinity ? (ok ? Infinity : 0) : temps / p.t, admis, marge: admis / p.i, garanti: isFinite(garanti) ? garanti : null }; });
      return { ...p, multiple, duree, chauffe: chaud, marges: m }; });
    // la somme déborde alors que chaque point tient seul : le point qui pèse le plus est le fautif
    courbes.forEach((c, k) => { if (bilans[k].sommeOk) return; const gros = points.filter(p => p.t !== Infinity).sort((a, b) => b.marges[k].fraction - a.marges[k].fraction)[0]; if (gros) gros.marges[k].ok = false; });
    const b0 = bilans[0], bm = marges[0], avecMarge = !!(b0 && b0.ok && bm.ok && b0.somme <= M.fraction + 1e-9);
    const gros = points.filter(q => q.t !== Infinity).sort((a, b) => b.marges[0].fraction - a.marges[0].fraction)[0] || null;
    points.forEach(p => { const m = p.marges[0]; p.ok = m ? m.ok : null;
      // serré : tient, mais sans la marge — le permanent sans sa marge de courant ; le transitoire qui pèse le plus
      p.serre = !!(m && m.ok && (p.t === Infinity ? m.marge < M.k - 1e-9 : p === gros && (!bm.sommeOk || b0.somme > M.fraction + 1e-9))); });
    // ce que le calibre garantit au permanent sur la courbe qui juge : la courbe et la calibration, la plus basse
    const tenu = courbes.length ? Math.min(courbes[0].points[0].m, tientM != null ? tientM : Infinity) * cal : null;
    return { points, valide: !!(b0 && b0.ok), avecMarge, serre: !!(b0 && b0.ok && !avecMarge), somme: b0 ? b0.somme : 0, sommeMarge: bm ? bm.somme : 0, permanentOk: !!(b0 && b0.permOk), permanentMargeOk: !!(bm && bm.permOk), tenu, chauffe, bilans }; };
  const J = calibre > 0 && courbes.length ? juger(calibre) : null;
  const points = J ? J.points : pts.map(p => ({ ...p, multiple: null, marges: [], ok: null, serre: false }));
  const valide = !!(J && pts.length && J.valide);
  // la gamme : le catalogue de la famille (sans famille, la gamme du lecteur), et le calibre retenu s'il est ailleurs
  const catalogue = calibresDeLaFamille(F, H), calibres = [...new Set(catalogue.concat(calibre > 0 ? [calibre] : []))].sort((a, b) => a - b), protCtx = contexteDeProtection(norme, H, courbes, pts);
  const gamme = calibres.map(c => { const dans = catalogue.some(x => Math.abs(x - c) < 1e-9);
    if (!(courbes.length && pts.length)) return { calibre: c, catalogue: dans, valide: null, serre: false, marge: null, somme: null, fils: null, selectif: null, ideal: false };
    const j = juger(c), pf = fils.map(f => protegerFil(norme, c, f, H, protCtx));
    return { calibre: c, catalogue: dans, valide: j.valide, serre: j.serre, marge: j.avecMarge, somme: j.somme, sommeMarge: j.sommeMarge, permanentOk: j.permanentOk, permanentMargeOk: j.permanentMargeOk, tenu: j.tenu,
      fils: fils.length ? pf.every(f => f.protege !== false && f.verdict !== 'calibre' && !f.horsTable && !f.contactSurcharge) : null,
      selectif: autres.length ? autres.every(a => Math.max(a, c) >= SELECTIVITE * Math.min(a, c) - 1e-9) : null, ideal: false }; });
  const meilleur = meilleurDe(norme, { F, H, M, tenue, courbes, pts, fils, gamme, protCtx, autres, pn: contexte.pn || (F && F.pn) || '' });
  const calibreMini = (gamme.find(g => g.valide) || {}).calibre || null, calibreIdeal = meilleur.calibre, reserve = meilleur.reserve;
  gamme.forEach(g => { g.ideal = g.calibre === calibreIdeal; });
  // le pire point : le fautif qui pèse le plus dans le bilan, sinon le plus près de la courbe
  const pire = points.filter(p => p.marges.length && p.ok === false).sort((a, b) => b.marges[0].fraction - a.marges[0].fraction)[0] || points.filter(p => p.marges.length).sort((a, b) => a.marges[0].rapport - b.marges[0].rapport)[0] || null;
  return { courbes, points, valide, serre: !!(J && valide && J.serre), avecMarge: !!(J && J.avecMarge), somme: J ? J.somme : null, bilans: J ? J.bilans : [], gamme, catalogue, calibreMini, calibreIdeal, reserve, pire, meilleur,
    famille: F, tenue, marges: M, chauffe: J ? J.chauffe : 1, calibre: calibre > 0 ? calibre : null, autres, sansProfil: !pts.length, sansCourbe: !courbes.length }; }

/* LE MEILLEUR CALIBRE, et ses fils (R2 § 3.1 ; NASA TM-102179 étapes 3 à 7 ; AC 43.13-1B § 11-48, § 11-67) :
     1. le calibre : le plus petit du catalogue qui tient le permanent (courant majoré de la marge, sous ce qu'il garantit
        à la température max du tableau) et les pointes (courant majoré, au plus `margeTemps` de son temps de
        déclenchement), et qui reste sélectif 2:1 avec ses voisins quand un calibre qui tient l'est, du même côté de chacun
        que le plus petit qui tient (l'aval reste sous l'amont) ; sinon le plus petit qui tient avec la marge (réserve
        'selectivite') ; sinon le plus petit qui tient, serré (réserve 'serre') ;
     2. chaque fil qu'il nourrit doit le SUIVRE (`filSuit`) : porter la charge, admettre le calibre en service, rester dans
        la table 11-3, avoir un contact qui l'admet, ne pas s'abîmer avant que le disjoncteur s'ouvre. Sinon on ne monte
        pas le calibre — un disjoncteur plus gros protège moins —, on grossit le fil : la plus petite jauge de sa famille
        (la base des câbles) qui suit (`jaugeQuiSuit`) ; si cette jauge change la taille du contact, la cavité change :
        c'est dit (`contactsTouches`).
   Rend { calibre, pn (le part number de ce calibre dans la famille, construit), famille, catalogue, pourquoi (une phrase),
   marge: { courant (%), temps (%), permanent (A), garanti (A), tient (× In), temperature, source, fraction, fractionMarge,
   reste, horsPlage }, filsAChanger: [{ cable, actuel, propose, raison, jaugeActuelle, jaugeProposee, masseActuelle,
   masseProposee, direct, via, bouts, aucune }], contactsTouches: [{ cable, actuel, propose, intensite, repere, bouts,
   raison }], filsInconnus, selectif, serre, reserve ('' | 'fils' | 'selectivite' | 'serre') }. */
function meilleurDe(norme, o) { const { F, H, M, tenue, courbes, pts, fils, gamme, protCtx } = o;
  const cat = gamme.filter(g => g.catalogue), nomF = F ? 'de la famille ' + F.famille : 'de la gamme du lecteur';
  const vide = { calibre: null, pn: null, famille: F ? F.famille : '', catalogue: cat.map(g => g.calibre), filsAChanger: [], contactsTouches: [], filsInconnus: [], selectif: null, serre: false, reserve: '', marge: null };
  if (!courbes.length) return { ...vide, pourquoi: 'aucune courbe de disjonction dans la norme : rien ne se choisit' };
  if (!pts.length) return { ...vide, pourquoi: 'le profil de charge est à renseigner : sans lui, aucun calibre ne se choisit' };
  // sélectif, mais du même côté de chaque voisin que le plus petit calibre qui tient : sous un 5 A, un 1,5 A de charge ne
  // passe pas au 10 A pour être à 2:1 (il deviendrait l'amont de son amont) — sans calibre à 2:1 de ce côté, la réserve le dit
  const avecMarge = cat.filter(g => g.marge), c0 = avecMarge.length ? avecMarge[0].calibre : null, autres = o.autres || [];
  const memeCote = x => autres.every(a => (x.calibre < a - 1e-9) === (c0 < a - 1e-9));
  const selectifs = avecMarge.filter(x => x.selectif !== false && memeCote(x)), g = selectifs[0] || avecMarge[0] || cat.find(x => x.valide) || null;
  if (!g) return { ...vide, pourquoi: `aucun calibre ${nomF} (${cat.map(x => nombreFr(x.calibre)).join(', ')} A) ne tient ce profil à ${courbes[0].nom}` };
  const cal = g.calibre, perm = pts.filter(p => p.t === Infinity).reduce((m, p) => Math.max(m, p.i), 0), courts = pts.some(p => p.t !== Infinity);
  // les fils qui ne suivent pas ce calibre, et la jauge qui les suivrait
  const filsAChanger = [], contactsTouches = [], filsInconnus = [];
  fils.forEach(f => { const p = protegerFil(norme, cal, f, H, protCtx); if (p.verdict === 'inconnu') { filsInconnus.push(f.cable || f.type || '?'); return; } if (filSuit(p)) return;
    const prop = jaugeQuiSuit(norme, cal, f, H, protCtx), bouts = f.l ? [f.l.de, f.l.vers].filter(r => r && !estMasse(r) && !estDisjoncteur(r)) : [], cabA = cableDuType(norme, f.type);
    filsAChanger.push({ cable: f.cable || '', actuel: f.type, propose: prop ? prop.type : null, raison: raisonsDuFil(p, cal).join(' ; '), jaugeActuelle: p.jauge, jaugeProposee: prop ? prop.cable.jauge : null,
      masseActuelle: cabA && cabA.masse != null ? cabA.masse : null, masseProposee: prop && prop.cable.masse != null ? prop.cable.masse : null, direct: f.direct !== false, via: f.via || '', bouts,
      aucune: prop ? '' : 'aucune jauge de la famille ' + typeDuFil(f.type) + ' de la base des câbles ne suit le ' + motA(cal) });
    const avant = p.contact ? p.contact.taille : '', apres = prop && prop.p.contact ? prop.p.contact.taille : '';
    if (prop && apres && apres !== avant) contactsTouches.push({ cable: f.cable || '', actuel: avant, propose: apres, intensite: prop.p.contact.intensite, repere: f.contactRepere || '', bouts,
      raison: `le ${prop.type} se sertit sur un contact taille ${apres} (${motA(prop.p.contact.intensite)})${avant ? ', le ' + f.type + ' était sur un ' + avant + (f.contactRepere ? ' (' + f.contactRepere + ')' : '') : ''} : la cavité change${bouts.length ? ' — ' + bouts.join(', ') : ''}` }); });
  // la marge : ce que le calibre garantit au permanent, ce que les pointes consomment
  const marge = { courant: M.marge, temps: Math.round(M.fraction * 100), permanent: perm, garanti: g.tenu, tient: tenue ? tenue.tient : null, temperature: +H.tableauMax,
    source: tenue ? tenue.famille + (tenue.source ? ' — ' + tenue.source : '') : 'la courbe ' + courbes[0].nom, fraction: g.somme, fractionMarge: g.sommeMarge, reste: perm > 0 && g.tenu ? g.tenu / (perm * M.k) - 1 : null, horsPlage: !!(tenue && tenue.horsPlage) };
  const reserve = !g.marge ? 'serre' : filsAChanger.length ? 'fils' : g.selectif === false ? 'selectivite' : '';
  // pourquoi, en une phrase : ce qu'il tient, pourquoi pas le calibre d'en dessous, ce qui reste à faire
  const avec = M.marge ? ' + ' + nombreFr(M.marge) + ' %' : '';
  const tient = [perm > 0 ? `le permanent (${motA(perm)}${avec}, sous les ${motA(g.tenu)} qu’il garantit à ${nombreFr(+H.tableauMax)} °C)` : '',
    courts ? `les pointes (${motPct(g.sommeMarge)} de son temps de déclenchement à ${courbes[0].nom}${avec ? ', courant' + avec : ''} ; au plus ${marge.temps} %)` : ''].filter(Boolean).join(' et ');
  const prev = cat.filter(x => x.calibre < cal - 1e-9).pop(), Ap = prev ? motA(prev.calibre) : '';
  const pourquoiPas = !prev ? '' : !prev.valide ? (!prev.permanentOk ? `le ${Ap} ne garantit que ${motA(prev.tenu)} au permanent` : `le ${Ap} déclenche (${motPct(prev.somme)} de son temps de déclenchement)`)
    : !prev.marge ? (!prev.permanentMargeOk ? `le ${Ap} ne garantit que ${motA(prev.tenu)}, moins que le permanent${avec}` : `le ${Ap} est serré : ses pointes consomment ${motPct(prev.somme)} de son temps de déclenchement${avec ? ', ' + motPct(prev.sommeMarge) + ' avec le courant' + avec : ''}`)
    : prev.selectif === false ? `le ${Ap} n’est pas à 2:1 avec le disjoncteur voisin` : '';
  const phrases = [`${motA(cal)} : le plus petit calibre ${nomF} qui tient ${tient}${g.marge ? '' : ' — sans la marge : aucun ne l’a'}`];
  if (pourquoiPas) phrases.push(pourquoiPas);
  if (g.selectif === false) phrases.push('pas à 2:1 avec le disjoncteur voisin : aucun calibre qui tient ne l’est');
  if (filsAChanger.length) phrases.push(filsAChanger.map(x => (x.cable || 'un fil') + ' ' + (x.propose ? 'en ' + x.propose : '— ' + x.aucune)).join(', ') + (contactsTouches.length ? ' (' + (contactsTouches.length > 1 ? contactsTouches.length + ' contacts changent' : 'un contact change') + ' de taille)' : ''));
  else if (fils.length) phrases.push('ses fils le suivent');
  return { calibre: cal, pn: F ? pnAvecCalibre(o.pn, F, cal) : null, famille: F ? F.famille : '', catalogue: cat.map(x => x.calibre), pourquoi: phrases.join(' ; '), marge, filsAChanger, contactsTouches, filsInconnus, selectif: g.selectif, serre: !g.marge, reserve }; }
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
  const kc = rd.kConducteur || 1, facteur = k * facteurAmbiante(fil, H.ambiante) * kc, facteurCourt = k * kc, facteurDe = t => t === Infinity ? facteur : facteurCourt, continu = fil.intensite * facteur;
  const phases = pts.map(p => { const admise = intensiteAdmise(fil, p.t) * facteurDe(p.t); return { ...p, admise, palier: palierDe(p.t), ok: p.i <= admise + 1e-9 }; });
  const pire = phases.filter(p => !p.ok).sort((a, b) => b.i / b.admise - a.i / a.admise)[0] || null;
  // LA PROTECTION : contre la courbe de dommage du fil ; à défaut, contre ses intensités de service (la règle d'avant, plus sévère)
  const dom = dommageDuFil(norme, f.type, jauge, fil, rd, H, k), service = t => intensiteAdmise(fil, t) * facteurDe(t), limite = t => dom ? dom.limite(t) : service(t);
  const laisse = lente && calibre > 0 ? PALIERS_EN2853.map(([t, mot]) => { const multiple = multipleAdmis(lente, t), courant = multiple * calibre, admise = limite(t);
    return { palier: t, mot, multiple, courant, admise, service: service(t), dommage: dom ? admise : null, ok: courant <= admise + 1e-9 }; }) : [];
  const pireLaisse = laisse.filter(x => !x.ok).sort((a, b) => b.courant / b.admise - a.courant / a.admise)[0] || null;
  return { ...f, ...commun, continu, facteur, facteurCourt, phases, pire, laisse, pireLaisse, protege: laisse.length ? !pireLaisse : null, jugeSur: dom ? 'dommage' : 'service',
    dommage: dom ? { tmax: dom.tmax, tenueCable: dom.tenueCable, i2t: dom.i2t, continu: dom.continu, source: dom.source } : null, approx: !!fil.approx, refuse: false,
    verdict: pire ? 'fil' : (calibre > 0 && calibre > continu + 1e-9) ? 'calibre' : 'ok' }; }
