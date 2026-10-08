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
    const pot = memePotentiel(L, ici, borne), suites = L.filter(l => !vus.has(l) && bouts(l).some(([r, b]) => r === ici && (!pot || pot.has(b))));
    if (!suites.length) { out.push({ segments: chemin, fini: false, bout: [ici, borne] }); return; }
    suites.forEach(l => { const [a, b] = bouts(l)[0][0] === ici && (!pot || pot.has(bouts(l)[0][1])) ? bouts(l) : bouts(l).slice().reverse();
      suivre([...chemin, { passage: ici, borne, borneSortie: a[1] }, { fil: l, de: a, vers: b }], b[0], b[1], new Set([...vus, l])); }); };
  L.filter(l => l.de === repere || l.vers === repere).forEach(l => { const [a, b] = l.de === repere ? bouts(l) : bouts(l).slice().reverse();
    suivre([{ fil: l, de: a, vers: b }], b[0], b[1], new Set([l])); });
  return out; }
/* LA CHUTE d'un chemin : chaque câble (ρ × L × I), chaque passage (R contact × I), le total, et ce qu'on n'a pas su
   compter. `courant` en A ; `hyp` : la longueur par défaut (m). Rend { segments: [{…, dU, note}], dU, longueur, inconnus }. */
function chuteDuChemin(norme, chemin, courant, hyp) { const H = { ...HYPOTHESES, ...(hyp || {}) }, segs = [], inconnus = []; let dU = 0, longueur = 0;
  chemin.segments.forEach(s => { if (s.fil) { const l = s.fil, L = l.longueur > 0 ? l.longueur : H.longueur, rd = resistanceDuFil(norme, l.type, jaugeDuType(l.type));
      const r = rd.rho != null ? rd.rho / 1000 * L : null, d = r == null ? null : r * courant; if (d == null) inconnus.push((l.cable || 'fil') + ' : type ' + (l.type || 'inconnu') + ', résistance inconnue'); else dU += d; longueur += L;
      segs.push({ ...s, longueur: L, reelle: l.longueur > 0, rho: rd.rho, R: r, dU: d }); }
    else { const pn = pnDuPassage(norme, chemin, s.passage), F = estCoupure(s.passage) ? familleDeNorme(norme, null, pn) : null, r = F && F.resistance != null ? F.resistance / 1000 : (estCoupure(s.passage) ? null : 0);
      const d = r == null ? null : r * courant; if (d == null) inconnus.push(s.passage + ' : résistance de contact inconnue'); else dU += d; segs.push({ ...s, R: r, dU: d, famille: F ? F.famille : '' }); } });
  return { segments: segs, dU, longueur, inconnus, bout: chemin.bout, fini: chemin.fini }; }
// le part number d'un passage, lu sur un fil du chemin qui y arrive
const pnDuPassage = (norme, chemin, repere) => { for (const s of chemin.segments) { if (!s.fil) continue; if (s.fil.de === repere && s.fil.pnDe) return s.fil.pnDe; if (s.fil.vers === repere && s.fil.pnVers) return s.fil.pnVers; } return ''; };
/* Toutes les chutes depuis un repère, prêtes à lire : la destination, le chemin en mots, le total. */
function chutesDepuis(norme, liaisons, repere, courant, hyp) { const H = { ...HYPOTHESES, ...(hyp || {}) }, chute = chuteAdmise(norme, H.tension);
  return cheminsDepuis(liaisons, repere).map(ch => { const c = chuteDuChemin(norme, ch, courant, H), pct = H.tension ? c.dU / H.tension * 100 : null;
    return { ...c, pct, admis: chute && chute.chuteMax != null ? chute.chuteMax : null, trop: !!(chute && chute.chuteMax != null && c.dU > chute.chuteMax + 1e-9),
             mots: c.segments.map(s => s.fil ? (s.fil.cable || 'fil') : '⇄ ' + s.passage).join(' → ') + ' → ' + c.bout[0] + (c.bout[1] ? ':' + c.bout[1] : '') }; }); }
