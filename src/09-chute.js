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
   Le régime et le retour de la simulation valent aussi en chaîne ; la pointe
   du profil se compare à la chute intermittente (≤ 2 min, AC 43.13-1B) ; et
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
/* LES CHEMINS depuis un repère (un disjoncteur) : pour chaque fil qui en part, la suite des segments jusqu'à un
   équipement — [{ fil: liaison, de, vers }, { passage: repère, borne }, …]. Une barrette qui dessert plusieurs fils
   donne plusieurs chemins. Un chemin qui tourne en rond ou n'aboutit pas est rendu tel quel (`fini: false`). */
function cheminsDepuis(liaisons, repere) { const L = liaisons.filter(l => l.de && l.vers && l.de !== l.vers), out = [];
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
/* LA CHUTE d'un chemin : chaque câble (ρ × L × I, ρ à la température du conducteur de l'hypothèse), chaque passage
   (R contact × I : la résistance de contact de la famille d'une prise si la norme la donne, sinon celle de la taille
   de contact du fil qui y arrive — une fois sur une prise, la paire accouplée ; deux fois sur une barrette, deux
   sertissages et la barre), le total, et ce qu'on n'a pas su compter. Le RÉGIME de la simulation s'applique comme
   fil par fil : en alternatif I × (R cos φ + X sin φ), × √3 en triphasé (la chute composée) ; le RETOUR par un fil
   identique double chaque segment. `courant` en A ; `hyp` : la longueur par défaut (m), la température du conducteur,
   le régime, cos φ, X (mΩ/m), le retour. Rend { segments: [{…, dU, note}], dU, longueur, inconnus, reel }. */
function chuteDuChemin(norme, chemin, courant, hyp) { const H = { ...HYPOTHESES, ...(hyp || {}) }, segs = [], inconnus = []; let dU = 0, longueur = 0, filPrecedent = null, reel = true;
  const regime = REGIMES[H.regime] ? H.regime : 'continu', cosphi = regime === 'continu' ? 1 : Math.min(1, Math.max(0, +H.cosphi || 0.8)), sinphi = Math.sqrt(Math.max(0, 1 - cosphi * cosphi));
  const kReg = regime === 'tri' ? Math.sqrt(3) : 1, kR = kRetour(H), xParM = regime === 'continu' ? 0 : (+H.reactance || 0) / 1000;
  chemin.segments.forEach(s => { if (s.fil) { const l = s.fil, L = l.longueur > 0 ? l.longueur : H.longueur, rd = resistanceDuFil(norme, l.type, jaugeDuType(l.type), H.tconducteur); filPrecedent = l; if (!(l.longueur > 0)) reel = false;
      const r = rd.rho != null ? rd.rho / 1000 * L * kR : null, X = xParM * L * kR, d = r == null ? null : kReg * (r * cosphi + X * sinphi) * courant;
      if (d == null) inconnus.push((l.cable || 'fil') + ' : type ' + (l.type || 'inconnu') + ', résistance inconnue' + (rd.refuse ? ' (conducteur ' + rd.conducteur + ' : la ligne cuivre ne vaut pas)' : '')); else dU += d; longueur += L;
      segs.push({ ...s, longueur: L, reelle: l.longueur > 0, rho: rd.rho, rhoSource: rd.source, conducteur: rd.conducteur, R: r, X, dU: d }); }
    else { const pn = pnDuPassage(norme, chemin, s.passage), coupure = estCoupure(s.passage), F = coupure ? familleDeNorme(norme, null, pn) : null;
      const taille = tailleDeJauge(norme, F ? F.famille : '', filPrecedent ? jaugeDuType(filPrecedent.type) : null), rTaille = resistanceDeContact(norme, taille);
      const r0 = F && F.resistance != null ? F.resistance / 1000 : rTaille != null ? rTaille * (coupure ? 1 : 2) : (coupure ? null : 0), r = r0 == null ? null : r0 * kR;
      const d = r == null ? null : kReg * r * cosphi * courant; if (d == null) inconnus.push(s.passage + ' : résistance de contact inconnue'); else dU += d;
      segs.push({ ...s, R: r, dU: d, famille: F ? F.famille : '', taille: F && F.resistance != null ? '' : taille, contacts: coupure ? 1 : 2 }); } });
  return { segments: segs, dU, longueur, inconnus, reel, regime, kRetour: kR, bout: chemin.bout, fini: chemin.fini }; }
// le part number d'un passage, lu sur un fil du chemin qui y arrive
const pnDuPassage = (norme, chemin, repere) => { for (const s of chemin.segments) { if (!s.fil) continue; if (s.fil.de === repere && s.fil.pnDe) return s.fil.pnDe; if (s.fil.vers === repere && s.fil.pnVers) return s.fil.pnVers; } return ''; };
/* L'INTERMITTENT de l'AC 43.13-1B (table 11-6) : une charge qui ne dure pas plus de deux minutes a droit au double de
   chute ; au-delà, c'est du continu. */
const INTERMITTENT_MAX = 120;
/* Toutes les chutes depuis un repère, prêtes à lire : la destination, le chemin en mots, le total — au courant
   permanent `courant`, comparé à la chute admise en continu ; et, si on donne les POINTES du profil ([{ i, t }] : les
   états courts, en points cumulés), la chute à chacun de ces courants (la chute est linéaire en courant), comparée à
   la chute admise en intermittent quand l'état dure deux minutes au plus, sinon au continu. `trop` et `tropPointe`
   disent le dépassement ; `reel` que toutes les longueurs sont celles du retest (sans quoi c'est l'hypothèse qui
   parle). */
function chutesDepuis(norme, liaisons, repere, courant, hyp, pointes) { const H = { ...HYPOTHESES, ...(hyp || {}) }, regime = REGIMES[H.regime] ? H.regime : 'continu', chute = chuteAdmise(norme, H.tension, regime);
  const admis = chute && chute.chuteMax != null ? chute.chuteMax : null, inter = chute ? (chute.chuteInter != null ? chute.chuteInter : chute.chuteMax) : null;
  const P = (pointes || []).filter(p => p && p.i > 0 && p.t > 0 && isFinite(p.t));
  return cheminsDepuis(liaisons, repere).map(ch => { const c = chuteDuChemin(norme, ch, courant, H), pct = H.tension ? c.dU / H.tension * 100 : null;
    const ps = P.map(p => { const dU = courant > 0 ? c.dU * p.i / courant : chuteDuChemin(norme, ch, p.i, H).dU, intermittent = p.t <= INTERMITTENT_MAX, a = intermittent ? inter : admis;
      return { i: p.i, t: p.t, nom: p.nom || '', dU, admis: a, intermittent, trop: !!(a != null && dU > a + 1e-9) }; });
    return { ...c, pct, admis, trop: !!(admis != null && c.dU > admis + 1e-9), tension: chute ? chute.tension : H.tension, pointes: ps, tropPointe: ps.some(p => p.trop),
             mots: c.segments.map(s => s.fil ? (s.fil.cable || 'fil') : '⇄ ' + s.passage).join(' → ') + ' → ' + c.bout[0] + (c.bout[1] ? ':' + c.bout[1] : '') }; }); }
/* LES FILS QU'UN DISJONCTEUR ALIMENTE : ceux qui le touchent (`direct`), et ceux de la suite de chaque chemin, à travers
   les prises de coupure et les barrettes — chacun une fois, avec sa borne de départ, l'autre bout et le passage par
   lequel il vient (`via`). C'est la liste que la protection doit juger : le disjoncteur protège tout ce qu'il nourrit,
   pas seulement ce qui est serti sur lui. Rend [{ cable, type, borne, autre, l, direct, via }]. */
function filsDepuis(liaisons, repere) { const vus = new Map();
  cheminsDepuis(liaisons, repere).forEach(ch => { let via = ''; ch.segments.forEach(s => { if (s.passage) { via = s.passage; return; } const l = s.fil; if (vus.has(l)) return;
    vus.set(l, { cable: l.cable, type: l.type, borne: s.de[1], autre: s.vers[0] + (s.vers[1] ? ':' + s.vers[1] : ''), l, direct: s.de[0] === repere, via }); }); });
  return [...vus.values()]; }
