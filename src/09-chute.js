/* ===========================================================================
   09 quater — LA CHUTE EN LIGNE, DE LA SOURCE À L'ÉQUIPEMENT
   ---------------------------------------------------------------------------
   La feuille Chute_en_ligne du lecteur : une source (le disjoncteur, son
   courant), puis des segments — un câble (sa longueur, son type), un
   connecteur (une prise de coupure, ses contacts), un câble, une prise… —
   jusqu'à l'équipement ; chaque segment a sa chute, le total aussi.
   Ici : depuis un repère, on SUIT LE POTENTIEL à travers les prises de
   coupure (le même contact des deux côtés), les barrettes (les bornes
   shuntées) et les barrettes à poser (un seul potentiel), jusqu'à ce qu'on
   arrive sur un équipement. Chaque câble compte sa longueur — celle du
   retest quand il la porte, sinon l'hypothèse — fois la résistance de son
   type (la base des câbles) fois le courant ; chaque prise traversée compte
   la résistance de contact de sa famille (table Familles) si on la connaît.
   Le régime et le retour de la simulation valent aussi en chaîne ; le total
   se compare à la chute admise (`chuteAdmise` : la règle du lecteur, 2 V en
   continu et en monophasé, 4 V en triphasé — sinon la table Réseau, dont la
   pointe de 2 min au plus a droit au double, AC 43.13-1B) ; et
   `filsDepuis` liste tout ce qu'un disjoncteur nourrit, à travers les
   passages, pour que la protection juge chaque fil et pas seulement les
   fils sertis sur lui.
   Rien ici ne touche à la page : le moteur, comme 09.
   =========================================================================== */
'use strict';

const PROFONDEUR_CHUTE = 12;
/* Un bout « de passage » : une prise de coupure, une barrette, une barrette à poser — le courant y entre et en ressort. */
const estPassage = r => estCoupure(r) || estBarrette(r) || VT_A_POSER.test(String(r || ''));
/* Les bornes d'un passage qui sont au même potentiel que `borne` : le même contact d'une prise ; les bornes shuntées
   d'une barrette (une liaison de la barrette à elle-même est un shunt) ; toutes celles d'une barrette à poser. */
function memePotentiel(liaisons, repere, borne) { if (VT_A_POSER.test(repere)) return null;   // null : tout
  if (!estBarrette(repere)) return new Set([borne]);
  const chef = new Map(), trouver = b => { while (chef.has(b) && chef.get(b) !== b) b = chef.get(b); return b; };
  liaisons.forEach(l => { if (l.de === repere && l.vers === repere && l.borneDe && l.borneVers) { [l.borneDe, l.borneVers].forEach(b => { if (!chef.has(b)) chef.set(b, b); });
    const a = trouver(l.borneDe), c = trouver(l.borneVers); if (a !== c) chef.set(c, a); } });
  if (!chef.has(borne)) return new Set([borne]); const r = trouver(borne); return new Set([...chef.keys()].filter(b => trouver(b) === r)); }
/* UNE SOURCE au bout d'un chemin (une batterie, une génératrice, un transfo-redresseur) : c'est le côté LIGNE du
   disjoncteur — d'où vient le courant, pas une charge qu'il alimente. « La chute de 102CB1 jusqu'à la batterie » ne veut
   rien dire, et le câble de la batterie n'est pas protégé par ce disjoncteur (il est en amont). */
const CODES_SOURCE = new Set(['BT', 'GN', 'TR']);
const estSource = r => { const q = lireRepere(r); return !!(q && CODES_SOURCE.has(q.code)); };
/* LES CHEMINS depuis un repère (un disjoncteur) : pour chaque fil qui en part, la suite des segments jusqu'à un
   équipement — [{ fil: liaison, de, vers }, { passage: repère, borne }, …]. Une barrette qui dessert plusieurs fils
   donne plusieurs chemins. Un chemin qui tourne en rond ou n'aboutit pas est rendu tel quel (`fini: false`). Chaque
   chemin dit sa borne de départ (`depart`) et s'il est en AMONT (`amont`) : il finit sur une source, ou il part de la
   même borne qu'un chemin qui y finit (la borne de ligne du disjoncteur) quand une autre borne alimente des charges.
   La chute en ligne et les câbles que le disjoncteur alimente (`chutesDepuis`, `filsDepuis`) laissent l'amont de côté. */
function cheminsDepuis(liaisons, repere) { const out = cheminsBruts(liaisons, repere);
  out.forEach(c => { const s0 = c.segments.find(s => s.fil); c.depart = s0 && s0.de[1] != null ? String(s0.de[1]) : ''; c.amont = estSource(c.bout[0]); });
  const lignes = new Set(out.filter(c => c.amont && c.depart).map(c => c.depart));
  if (lignes.size && out.some(c => !lignes.has(c.depart))) out.forEach(c => { if (lignes.has(c.depart)) c.amont = true; });
  return out; }
function cheminsBruts(liaisons, repere) { const L = liaisons.filter(l => l.de && l.vers && l.de !== l.vers), out = [];
  const bouts = l => [[l.de, l.borneDe], [l.vers, l.borneVers]];
  const suivre = (chemin, ici, borne, vus) => { if (chemin.length > PROFONDEUR_CHUTE) { out.push({ segments: chemin, fini: false, bout: [ici, borne] }); return; }
    if (!estPassage(ici)) { out.push({ segments: chemin, fini: true, bout: [ici, borne] }); return; }
    // le potentiel se lit sur TOUTES les liaisons (les shunts d'une barrette vont d'elle à elle-même : L les a ôtés)
    const pot = memePotentiel(liaisons, ici, borne), suites = L.filter(l => !vus.has(l) && bouts(l).some(([r, b]) => r === ici && (!pot || pot.has(b))));
    if (!suites.length) { out.push({ segments: chemin, fini: false, bout: [ici, borne] }); return; }
    suites.forEach(l => { const [a, b] = bouts(l)[0][0] === ici && (!pot || pot.has(bouts(l)[0][1])) ? bouts(l) : bouts(l).slice().reverse();
      suivre([...chemin, { passage: ici, borne, borneSortie: a[1] }, { fil: l, de: a, vers: b }], b[0], b[1], new Set([...vus, l])); }); };
  L.filter(l => l.de === repere || l.vers === repere).forEach(l => { const [a, b] = l.de === repere ? bouts(l) : bouts(l).slice().reverse();
    suivre([{ fil: l, de: a, vers: b }], b[0], b[1], new Set([l])); });
  return out; }
/* LA CHUTE d'un chemin : chaque câble (ρ × L × I, ρ à la température de son conducteur — estimée sous ce courant,
   T2 = Tu + 40 × (I / I admise)², AC 43.13-1B § 11-66 d(6) ; ou celle de l'hypothèse, 20 °C comme l'Excel, si
   `chuteConducteur` = 'fixe'), chaque passage (R contact × I : la résistance de contact de la famille d'une prise si
   la norme la donne, sinon celle de la taille de contact du fil qui y arrive — une fois sur une prise, la paire
   accouplée ; deux fois sur une barrette, deux sertissages et la barre), LE DISJONCTEUR d'où part le chemin (sa chute
   propre, à I / In de sa chute à In — le bilame est plus froid sous In : c'est prudent ; table Chute disjoncteur ;
   l'AC 43.13-1B mesure la chute « entre le bus et la masse de l'équipement », le disjoncteur est entre les deux —
   l'hypothèse `chuteDisjoncteur` = false l'ôte), le total, et ce qu'on n'a pas su compter. Le RÉGIME de la simulation
   s'applique comme fil par fil : en alternatif I × (R cos φ + X sin φ), × √3 en triphasé (la chute composée), X à la
   fréquence de l'hypothèse ; le RETOUR par un fil identique double chaque segment, sauf en triphasé (aucun courant ne
   revient). `courant` en A ; `hyp` : les hypothèses ; `disjoncteur` : { famille, calibre } du disjoncteur de tête quand
   l'appelant les connaît (le calibre retenu), sinon ceux de son part number. Rend { segments: [{…, dU, T}], disjoncteur:
   { nom, famille, calibre, chuteIn, R, dU } | null, dU, longueur, inconnus, reel }. */
function chuteDuChemin(norme, chemin, courant, hyp, disjoncteur) { const H = { ...HYPOTHESES, ...(hyp || {}) }, segs = [], inconnus = []; let dU = 0, longueur = 0, filPrecedent = null, reel = true;
  const regime = REGIMES[H.regime] ? H.regime : 'continu', cosphi = regime === 'continu' ? 1 : Math.min(1, Math.max(0, +H.cosphi || 0.8)), sinphi = Math.sqrt(Math.max(0, 1 - cosphi * cosphi));
  const kReg = regime === 'tri' ? Math.sqrt(3) : 1, kR = kRetour(H, regime), xParM = regime === 'continu' ? 0 : (+H.reactance || 0) / 1000 * facteurFrequence(H);
  chemin.segments.forEach(s => { if (s.fil) { const l = s.fil, L = l.longueur > 0 ? l.longueur : H.longueur, tc = temperatureDuConducteur(norme, l.type, courant, H), rd = resistanceDuFil(norme, l.type, jaugeDuType(l.type), tc.T); filPrecedent = l; if (!(l.longueur > 0)) reel = false;
      const r = rd.rho != null ? rd.rho / 1000 * L * kR : null, X = xParM * L * kR, d = r == null ? null : kReg * (r * cosphi + X * sinphi) * courant;
      if (d == null) inconnus.push((l.type || 'câble') + ' vers ' + l.vers + ' : type ' + (l.type || 'inconnu') + ', résistance inconnue' + (rd.refuse ? ' (conducteur ' + rd.conducteur + ' : la ligne cuivre ne vaut pas)' : '')); else dU += d; longueur += L;
      segs.push({ ...s, longueur: L, reelle: l.longueur > 0, rho: rd.rho, rho20: rd.rho20, T: rd.T, tEstimee: tc.estimee, rhoSource: rd.source, conducteur: rd.conducteur, R: r, X, dU: d }); }
    else { const pn = pnDuPassage(norme, chemin, s.passage), coupure = estCoupure(s.passage), F = coupure ? familleDeNorme(norme, null, pn) : null;
      // la résistance de l'atelier par la gauge du câble qui arrive (l'Excel du lecteur) d'abord ; sinon celle de la famille de la prise, sinon celle de la taille
      const jauge = filPrecedent ? jaugeDuType(filPrecedent.type) : null, rAtelier = resistanceAtelier(norme, jauge), taille = tailleDeJauge(norme, F ? F.famille : '', jauge), rTaille = resistanceDeContact(norme, taille);
      const r0 = rAtelier != null ? rAtelier * (coupure ? 1 : 2) : F && F.resistance != null ? F.resistance / 1000 : rTaille != null ? rTaille * (coupure ? 1 : 2) : (coupure ? null : 0), r = r0 == null ? null : r0 * kR;
      const d = r == null ? null : kReg * r * cosphi * courant; if (d == null) inconnus.push(s.passage + ' : résistance de contact inconnue'); else dU += d;
      segs.push({ ...s, R: r, dU: d, famille: F ? F.famille : '', taille: rAtelier == null && F && F.resistance != null ? '' : taille, atelier: rAtelier != null, contacts: coupure ? 1 : 2 }); } });
  // le disjoncteur de tête : sa chute propre, sur l'aller seul (le retour ne le traverse pas)
  const cb = disjoncteurDuChemin(norme, chemin, H, disjoncteur);
  if (cb && cb.R == null) inconnus.push(cb.nom + ' : chute propre du disjoncteur inconnue (' + cb.raison + ')');
  // la chute de la table de l'atelier est une chute MAX : elle compte entière dès qu'un courant passe ; les autres, à I / In
  const dCb = cb && cb.R != null ? (cb.fixe ? (courant > 0 ? cb.chuteIn : 0) : kReg * cb.R * cosphi * courant) : null; if (dCb != null) dU += dCb;
  return { segments: segs, disjoncteur: cb ? { ...cb, dU: dCb } : null, dU, longueur, inconnus, reel, regime, kRetour: kR, conducteur: H.chuteConducteur === 'fixe' ? 'fixe' : 'estimee', bout: chemin.bout, fini: chemin.fini, courant }; }
/* LA CHUTE D'UN CÂBLE SEUL, sous `courant` : exactement comme un segment d'un chemin (la même résistance, à la même
   température du conducteur, le même régime, le même retour) — sans passage ni disjoncteur. La fiche d'un câble qu'aucun
   chemin de disjoncteur ne porte la prend ; sinon c'est son segment dans la chute en ligne qui parle (une seule valeur).
   Rend le segment : { longueur, reelle, rho (Ω/km), rho20, T (°C), R (Ω), dU (V) ou null }. */
function chuteDuCable(norme, l, courant, hyp) {
  const c = chuteDuChemin(norme, { segments: [{ fil: l, de: [l.de, l.borneDe], vers: [l.vers, l.borneVers] }], bout: [l.vers, l.borneVers], fini: true }, courant, { ...(hyp || {}), chuteDisjoncteur: false });
  return { ...c.segments[0], courant }; }
/* LE DISJONCTEUR D'OÙ PART un chemin, pour sa chute propre : le repère du premier fil, s'il est un disjoncteur ; sa famille et
   son calibre — ceux que l'appelant donne (le calibre retenu sur la fiche), sinon ceux de son part number ; sa chute à In
   (table Chute disjoncteur) et la résistance équivalente chute / In. Rien si l'hypothèse `chuteDisjoncteur` l'ôte. */
function disjoncteurDuChemin(norme, chemin, H, donne) { const s0 = chemin.segments.find(s => s.fil); if (!s0 || H.chuteDisjoncteur === false) return null;
  const nom = s0.de[0]; if (!estDisjoncteur(nom)) return null;
  const pn = s0.fil.de === nom ? s0.fil.pnDe : s0.fil.vers === nom ? s0.fil.pnVers : '', F = donne && donne.famille !== undefined ? donne.famille : familleDuPn(pn, norme);
  const calibre = donne && donne.calibre > 0 ? donne.calibre : F && F.calibre > 0 ? F.calibre : null;
  if (!calibre) return { nom, famille: F ? F.famille : '', calibre: null, chuteIn: null, R: null, raison: 'calibre inconnu' };
  const c = chuteDuDisjoncteur(norme, F, calibre);
  if (!c) return { nom, famille: F ? F.famille : '', calibre, chuteIn: null, R: null, raison: 'famille ' + (F ? F.famille : 'inconnue') + ', ' + String(calibre).replace('.', ',') + ' A : absent de la table Chute disjoncteur' };
  return { nom, famille: F ? F.famille : '', calibre, chuteIn: c.chute, R: c.chute / calibre, ligne: c.nom, note: c.note, fixe: !!c.atelier }; }
// le part number d'un passage, lu sur un fil du chemin qui y arrive
const pnDuPassage = (norme, chemin, repere) => { for (const s of chemin.segments) { if (!s.fil) continue; if (s.fil.de === repere && s.fil.pnDe) return s.fil.pnDe; if (s.fil.vers === repere && s.fil.pnVers) return s.fil.pnVers; } return ''; };
/* L'INTERMITTENT de l'AC 43.13-1B (table 11-6) : une charge qui ne dure pas plus de deux minutes a droit au double de
   chute ; au-delà, c'est du continu. La règle du lecteur (2 V, 4 V : des maxima) ne le connaît pas : sa chute admise
   en intermittent est la même. */
const INTERMITTENT_MAX = 120;
/* Toutes les chutes depuis un repère, prêtes à lire : la destination, le chemin en mots, le total — au courant
   permanent `courant`, comparé à la chute admise (`chuteAdmise` : la règle du lecteur, sinon la table Réseau) ; et, si
   on donne les POINTES du profil ([{ i, t }] : les états courts, en points cumulés), la chute à chacun de ces courants.
   Un état d'une minute au plus ne laisse pas au conducteur le temps de chauffer au-delà de ce que le permanent lui
   donne : sa chute est celle du permanent, linéaire en courant. Un état PLUS LONG (le palier continu de l'EN 2853,
   comme pour l'intensité : `palierDe`) a le temps de chauffer le câble — un 20 AWG met une vingtaine de secondes à
   prendre sa température — : sa chute se calcule à la température que CE courant donne au conducteur (v84 : la
   transition de 102CB1, 9,31 A pendant 2,1 min, comptait le DR20 à 116 °C, celle du permanent ; elle le chauffe à
   168 °C : 2,64 V, pas 2,33 V). Sans permanent, chaque pointe à sa propre température (prudent). Chacune se compare à
   la chute admise en intermittent quand l'état dure deux minutes au plus (la même que le continu sous la règle du
   lecteur), sinon au continu. `trop` et `tropPointe` disent le dépassement ; `reel` que toutes les longueurs sont
   celles du retest (sans quoi c'est l'hypothèse qui parle) ; `regle` d'où vient la chute admise ('lecteur', 'table').
   `disjoncteur` : { famille, calibre } du repère quand l'appelant les connaît (sa chute propre, `chuteDuChemin`). Les
   chemins en amont (vers la source : `cheminsDepuis`) ne sont pas des chutes en ligne. */
function chutesDepuis(norme, liaisons, repere, courant, hyp, pointes, disjoncteur) { const H = { ...HYPOTHESES, ...(hyp || {}) }, regime = REGIMES[H.regime] ? H.regime : 'continu', chute = chuteAdmise(norme, H.tension, regime, H);
  const admis = chute && chute.chuteMax != null ? chute.chuteMax : null, inter = chute ? (chute.chuteInter != null ? chute.chuteInter : chute.chuteMax) : null;
  const P = (pointes || []).filter(p => p && p.i > 0 && p.t > 0 && isFinite(p.t));
  return cheminsDepuis(liaisons, repere).filter(ch => !ch.amont).map(ch => { const c = chuteDuChemin(norme, ch, courant, H, disjoncteur), pct = H.tension ? c.dU / H.tension * 100 : null;
    const fixe = c.disjoncteur && c.disjoncteur.fixe && c.disjoncteur.dU != null ? c.disjoncteur.dU : 0;
    const ps = P.map(p => { const chauffe = !(courant > 0) || palierDe(p.t) === Infinity, dU = chauffe ? chuteDuChemin(norme, ch, p.i, H, disjoncteur).dU : (c.dU - fixe) * p.i / courant + fixe, intermittent = p.t <= INTERMITTENT_MAX, a = intermittent ? inter : admis;
      return { i: p.i, t: p.t, nom: p.nom || '', dU, admis: a, intermittent, chauffe, trop: !!(a != null && dU > a + 1e-9) }; });
    return { ...c, pct, admis, trop: !!(admis != null && c.dU > admis + 1e-9), tension: chute ? chute.tension : H.tension, regle: chute ? chute.regle : '', pointes: ps, tropPointe: ps.some(p => p.trop),
             mots: c.segments.map(s => s.fil ? (s.fil.type || 'câble') : '⇄ ' + s.passage).join(' → ') + ' → ' + c.bout[0] + (c.bout[1] ? ':' + c.bout[1] : '') }; }); }
/* LES FILS QU'UN DISJONCTEUR ALIMENTE : ceux qui le touchent (`direct`), et ceux de la suite de chaque chemin, à travers
   les prises de coupure et les barrettes — chacun une fois, avec sa borne de départ, l'autre bout et le passage par
   lequel il vient (`via`). C'est la liste que la protection doit juger : le disjoncteur protège tout ce qu'il nourrit,
   pas seulement ce qui est serti sur lui — et pas ce qui le nourrit (le côté source : `cheminsDepuis`, `amont`).
   Rend [{ cable, type, borne, autre, l, direct, via }]. */
function filsDepuis(liaisons, repere) { const vus = new Map();
  cheminsDepuis(liaisons, repere).filter(ch => !ch.amont).forEach(ch => { let via = ''; ch.segments.forEach(s => { if (s.passage) { via = s.passage; return; } const l = s.fil; if (vus.has(l)) return;
    vus.set(l, { cable: l.cable, type: l.type, borne: s.de[1], autre: s.vers[0] + (s.vers[1] ? ':' + s.vers[1] : ''), l, direct: s.de[0] === repere, via }); }); });
  return [...vus.values()]; }

/* ---- CE QU'UN CÂBLE ADMET : la table, le déclassement, en un seul endroit ---------------------------------------------
   L'intensité de l'EN 2853 (un câble seul à l'air libre, ambiante 95 °C, conducteur à 135 °C), déclassée :
     · le FAISCEAU (fig. 11-5 de l'AC 43.13-1B, lue au nombre de câbles et à la charge des hypothèses : 8 câbles à 60 %
       → × 0,60 par défaut) et l'ALTITUDE (fig. 11-6) — sur tous les paliers ;
     · l'AMBIANTE (EN 2853 note 2 : × √((135 − Tu)/40), 1 à 95 °C) — sur le continu seulement, comme la protection
       (09 bis, `protegerFil`) ;
     · un conducteur qui n'est pas du cuivre (`kConducteur` : CCA × √(R cuivre / R câble), aluminium − 20 % au moins) —
       partout.
   Le palier d'un état se lit sur sa DURÉE (`palierDe` : 2 s, 10 s, 1 min, sinon le continu) : un état de 2,1 min se
   juge sur le continu, avec le facteur du continu (avant v84, la fiche d'un câble mettait l'ambiante aussi sur les
   paliers courts). Rend { fil, rd, decl, amb, kc, continu (A), facteurContinu, facteurCourt, facteur(t), admise(t) } ;
   `fil` null hors de la norme, `continu` null sans intensité (ou un conducteur sans résistance : `rd.refuse`). */
function admissionDuFil(norme, type, hyp) { const H = { ...HYPOTHESES, ...(hyp || {}) }, jauge = jaugeDuType(type), fil = type ? filDeNorme(norme, type, jauge) : null;
  const rd = type ? resistanceDuFil(norme, type, jauge, null) : { kConducteur: 1, conducteur: 'cuivre', refuse: false };
  const decl = fil ? facteurDeclassement(norme, H.conditions, { fils: H.fils, charge: H.charge, altitude: H.altitude }) : 1, amb = fil ? facteurAmbiante(fil, H.ambiante) : 1, kc = rd.kConducteur || 1;
  const facteurContinu = decl * amb * kc, facteurCourt = decl * kc, facteur = t => palierDe(t) === Infinity ? facteurContinu : facteurCourt;
  const sait = !!(fil && fil.intensite != null && !rd.refuse);
  return { fil, rd, jauge, decl, amb, kc, facteurContinu, facteurCourt, facteur, continu: sait ? fil.intensite * facteurContinu : null, admise: t => sait ? intensiteAdmise(fil, t) * facteur(t) : null }; }
/* LE DÉCLASSEMENT EN MOTS (v84, le lecteur : « chaque chiffre s'explique en clair » — le « × 0,6 » ne disait pas d'où il
   venait) : « 11,5 A × 0,6 : faisceau de 8 câbles à 60 % » ; l'altitude, l'ambiante (en continu), le conducteur s'y
   ajoutent ; rien quand rien ne déclasse. `t` : la durée de l'état (Infinity : le continu). */
function motDuDeclassement(norme, type, hyp, t) { const H = { ...HYPOTHESES, ...(hyp || {}) }, A = admissionDuFil(norme, type, H); if (!A.fil || A.fil.intensite == null) return '';
  const continu = palierDe(t) === Infinity, k = A.facteur(t); if (Math.abs(k - 1) < 1e-9) return '';
  const pourquoi = detailDeclassement(norme, H.conditions, { fils: H.fils, charge: H.charge, altitude: H.altitude }).filter(d => Math.abs(d.facteur - 1) > 1e-9)
    .map(d => d.condition === 'faisceau' ? `faisceau de ${nombreFr(+H.fils)} câbles à ${nombreFr(+H.charge)} %` : d.condition === 'altitude' ? `${nombreFr(+H.altitude)} ft` : d.condition);
  if (continu && Math.abs(A.amb - 1) > 1e-9) pourquoi.push(`ambiante ${nombreFr(+H.ambiante)} °C`);
  if (Math.abs(A.kc - 1) > 1e-9) pourquoi.push(`conducteur ${A.rd.conducteur}`);
  return `${nombreFr(intensiteAdmise(A.fil, t))} A × ${nombreFr(k)}${pourquoi.length ? ' : ' + pourquoi.join(', ') : ''}`; }
/* DEUX VALEURS COMPARÉES, écrites sans que l'arrondi inverse ce qu'elles disent (v84 : « 2 V > 2 V admis » pour 2,004 V) :
   deux décimales, plus tant qu'elles s'écrivent pareil (quatre au plus). Rend [a, b] arrondis. */
function enOrdre(a, b) { if (a == null || b == null || !isFinite(a) || !isFinite(b)) return [a, b];
  for (let n = 2; n <= 4; n++) { const k = Math.pow(10, n), A = Math.round(a * k) / k, B = Math.round(b * k) / k; if (A !== B || Math.abs(a - b) < 1e-9) return [A, B]; }
  const k = 1e4; return a > b ? [Math.ceil(a * k) / k, Math.floor(b * k) / k] : [Math.floor(a * k) / k, Math.ceil(b * k) / k]; }
