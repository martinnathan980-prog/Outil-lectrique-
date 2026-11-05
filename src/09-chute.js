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
   (v86, l'audit B1 : « le courant ne traverse ni un relais ni un
   interrupteur ») LE COURANT TRAVERSE CE QUI CONDUIT. Un chemin ne s'arrête
   plus au premier équipement : il passe par le CONTACT d'un relais ou d'un
   contacteur (les bornes d'une même lettre, A1-A2-A3), par un INTERRUPTEUR
   (ses bornes), et par la BORNE d'un équipement où arrivent plusieurs
   câbles (un même potentiel) — le contact supposé FERMÉ, le pire cas, et
   dit ; la BOBINE d'un relais (X1, X2) consomme : le chemin y finit
   (`traverseeDe`, `natureDuBout`). Le courant d'un câble est celui de ce
   qu'il alimente en aval ; une BRANCHE DE COMMANDE — qui ne mène qu'à des
   bobines ou à des entrées de calculateur — n'est jamais jugée au courant
   total du disjoncteur : son courant est inconnu tant qu'il n'est pas
   écrit, et rien ne la fait grossir (`branchesDepuis`). Le CIRCUIT d'un
   disjoncteur, de la source aux charges et à la masse, sens du courant
   compris, se lit d'un appel (`circuitDuDisjoncteur` : le plan l'éclaire).
   Rien ici ne touche à la page : le moteur, comme 09.
   =========================================================================== */
'use strict';

/* La profondeur d'un chemin (en segments : un câble, un passage) et le nombre de chemins d'un disjoncteur : au-delà, le chemin
   est rendu tel quel (`fini: false`). Un relais et un interrupteur traversés allongent les chemins (v86) : 16 segments, c'est
   huit câbles bout à bout. */
const PROFONDEUR_CHUTE = 16, MAX_CHEMINS = 4000;
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
/* (v86) CE QUI CONDUIT dans un équipement, le contact supposé FERMÉ — le pire cas : tout ce qu'il peut alimenter l'est, et
   la fiche le dit (« à travers 103RL1, contact supposé fermé ») :
     · un RELAIS (RL) ou un CONTACTEUR (CT) : ses contacts de puissance s'écrivent par pôle, une lettre et un chiffre — A1,
       A2, A3 sont le pôle A (le commun et ses deux positions), B1, B2, B3 le pôle B — : les bornes d'un même pôle sont
       reliées. Sa BOBINE (X1, X2) ne conduit pas : elle consomme, le chemin y finit (`natureDuBout`). Un relais dont les
       bornes ne disent pas leur rôle (1, 2, 3, 4) ne se traverse pas : VOLTA ne devine pas laquelle est sa bobine ;
     · un INTERRUPTEUR (SW), un BOUTON-POUSSOIR (PB), un PRESSOSTAT (PR) : ses bornes conduisent entre elles — toutes, ou
       celles d'un même pôle quand elles s'écrivent par lettre (A1, A2 · B1, B2) : un interrupteur à quatre bornes 1, 2, 3, 4
       les relie toutes (ses pôles ne se lisent pas dans le fichier).
   `bornes` : les bornes de l'équipement que le fichier câble, sur tous les folios. Rend { quoi: 'relais' | 'contacteur' |
   'interrupteur', pole, bornes: [les autres bornes reliées à `borne`] } ou null (rien n'y conduit : une charge). */
const CODES_RELAIS = new Set(['RL', 'CT']), CODES_INTERRUPTEURS = new Set(['SW', 'PB', 'PR']), BORNE_DE_POLE = /^([A-Z])(\d{1,2})$/i;
const poleDeBorne = b => { const m = BORNE_DE_POLE.exec(String(b == null ? '' : b).trim()); return m ? m[1].toUpperCase() : ''; };
function traverseeDe(repere, borne, bornes) { const q = lireRepere(repere), b = String(borne == null ? '' : borne).trim(); if (!q || !q.num || !b) return null;
  const autres = [...new Set((bornes || []).map(x => String(x == null ? '' : x).trim()))].filter(x => x && x !== b), p = poleDeBorne(b);
  if (CODES_RELAIS.has(q.code)) return p && p !== 'X' ? { quoi: q.code === 'CT' ? 'contacteur' : 'relais', pole: p, bornes: autres.filter(x => poleDeBorne(x) === p) } : null;
  if (CODES_INTERRUPTEURS.has(q.code)) return { quoi: 'interrupteur', pole: p, bornes: p ? autres.filter(x => poleDeBorne(x) === p) : autres };
  return null; }
/* (v86) CE QUE TIRE LE BOUT D'UN CHEMIN. Deux ENTRÉES DE COMMANDE : la BOBINE d'un relais ou d'un contacteur (RL, CT, à sa borne
   X1, X2) — elle tire ce que dit « Ce qu'il consomme » du relais —, et l'ENTRÉE d'un calculateur ou du connecteur d'un
   équipement (CP, XC) — quelques milliampères : la consommation d'un calculateur se tire sur ses broches d'alimentation, elle
   ne se compte pas sur une entrée. Le reste est une CHARGE (une lampe, une pompe, une vanne, un disjoncteur en aval…). Rend
   'bobine', 'entree' ou 'charge'. */
const CODES_ENTREES = new Set(['CP', 'XC']);
function natureDuBout(repere, borne) { const q = lireRepere(repere); if (!q || !q.num) return 'charge';
  if (CODES_RELAIS.has(q.code) && poleDeBorne(borne) === 'X') return 'bobine';
  return CODES_ENTREES.has(q.code) ? 'entree' : 'charge'; }
/* LES CHEMINS depuis un repère (un disjoncteur) : pour chaque fil qui en part, la suite des segments jusqu'à un
   équipement — [{ fil: liaison, de, vers }, { passage: repère, borne }, …]. Une barrette qui dessert plusieurs fils
   donne plusieurs chemins. Un chemin qui tourne en rond ou n'aboutit pas est rendu tel quel (`fini: false`). Chaque
   chemin dit sa borne de départ (`depart`) et s'il est en AMONT (`amont`) : il finit sur une source, ou il part de la
   même borne qu'un chemin qui y finit (la borne de ligne du disjoncteur) quand une autre borne alimente des charges.
   La chute en ligne et les câbles que le disjoncteur alimente (`chutesDepuis`, `filsDepuis`) laissent l'amont de côté.
   (v86) À TRAVERS LES ÉQUIPEMENTS : arrivé sur un équipement, le chemin passe le contact d'un relais, un interrupteur
   (`traverseeDe`) — un segment { passage, borne, borneSortie, traverse: 'relais' | 'contacteur' | 'interrupteur' } — et
   repart par les autres câbles de la même borne (`traverse` 'jonction' : un même potentiel ; l'équipement reste un bout du
   chemin, il consomme). Jamais vers une masse : un contact supposé fermé ne fait pas un court-circuit. Un chemin qui revient
   sur le disjoncteur d'où il part est une boucle : il ne compte pas. */
function cheminsDepuis(liaisons, repere) { const out = cheminsBruts(liaisons, repere);
  out.forEach(c => { const s0 = c.segments.find(s => s.fil); c.depart = s0 && s0.de[1] != null ? String(s0.de[1]) : ''; c.amont = estSource(c.bout[0]); });
  const lignes = new Set(out.filter(c => c.amont && c.depart).map(c => c.depart));
  if (lignes.size && out.some(c => !lignes.has(c.depart))) out.forEach(c => { if (lignes.has(c.depart)) c.amont = true; });
  return out; }
/* L'INDEX des liaisons par repère (les shunts d'une barrette — d'elle à elle-même — compris : ils font son potentiel), gardé
   d'un appel à l'autre pour les mêmes liaisons : le contrôle demande les chemins d'un disjoncteur une vingtaine de fois, et
   refaire l'index d'un plan de 3 000 liaisons à chaque fois coûtait plus que tout le reste. Il se vérifie à chaque appel, en
   une passe qui ne crée rien — les mêmes liaisons, aux mêmes rangs, avec les mêmes repères — : une liaison ajoutée, retirée,
   remplacée ou renommée le refait (les bornes se lisent sur la liaison même, elles n'y entrent pas). */
const INDEX_DES_CHEMINS = new WeakMap();
function indexDesChemins(L) { const c = INDEX_DES_CHEMINS.get(L);
  if (c && c.n === L.length) { let ok = true; for (let i = 0; ok && i < L.length; i++) { const l = L[i]; ok = l === c.refs[i] && (!l || (l.de === c.de[i] && l.vers === c.vers[i])); } if (ok) return c.parRep; }
  const parRep = new Map(), mettre = (r, l) => { const xs = parRep.get(r); if (!xs) parRep.set(r, [l]); else if (xs[xs.length - 1] !== l) xs.push(l); };
  L.forEach(l => { if (l && l.de && l.vers) { mettre(l.de, l); mettre(l.vers, l); } });
  INDEX_DES_CHEMINS.set(L, { n: L.length, refs: L.slice(), de: L.map(l => l && l.de), vers: L.map(l => l && l.vers), parRep });
  return parRep; }
function cheminsBruts(liaisons, repere) { const out = [], parRep = indexDesChemins(Array.isArray(liaisons) ? liaisons : [...(liaisons || [])]);
  const du = r => parRep.get(r) || [], txt = b => String(b == null ? '' : b), bouts = l => [[l.de, l.borneDe], [l.vers, l.borneVers]];
  // les câbles d'un repère qui partent d'une de ses bornes (`bs` : un Set, null : n'importe laquelle), et un câble orienté depuis ce bout
  const partant = (r, bs) => du(r).filter(l => l.de !== l.vers && bouts(l).some(([x, b]) => x === r && (!bs || bs.has(txt(b)))));
  const depuis = (l, r, bs) => { const [a, z] = bouts(l); return a[0] === r && (!bs || bs.has(txt(a[1]))) ? [a, z] : [z, a]; };
  const bornesDu = r => [...new Set(du(r).flatMap(l => bouts(l).filter(([x]) => x === r).map(([, b]) => txt(b))))];
  const suivre = (chemin, ici, borne, vus) => { if (out.length >= MAX_CHEMINS) return;
    if (chemin.length > PROFONDEUR_CHUTE) { out.push({ segments: chemin, fini: false, bout: [ici, borne] }); return; }
    if (ici === repere) return;   // revenu sur le disjoncteur d'où il part : une boucle
    const passer = (l, bs, seg) => { const [a, z] = depuis(l, ici, bs); suivre([...chemin, { ...seg, borneSortie: a[1] }, { fil: l, de: a, vers: z }], z[0], z[1], new Set([...vus, l])); };
    if (estPassage(ici)) { const pot = memePotentiel(du(ici), ici, borne), suites = partant(ici, pot).filter(l => !vus.has(l));
      if (!suites.length) { out.push({ segments: chemin, fini: false, bout: [ici, borne] }); return; }
      suites.forEach(l => passer(l, pot, { passage: ici, borne })); return; }
    // un équipement : une masse, une source, un disjoncteur en aval, un repère qui n'en est pas un finissent le chemin
    const q = lireRepere(ici), b0 = txt(borne).trim();
    if (estMasse(ici) || estSource(ici) || estDisjoncteur(ici) || !q || !q.num || !b0) { out.push({ segments: chemin, fini: true, bout: [ici, borne] }); return; }
    const t = traverseeDe(ici, b0, bornesDu(ici)), loin = (l, bs) => depuis(l, ici, bs)[1][0], ouvert = (l, bs) => !vus.has(l) && !estMasse(loin(l, bs));
    const B0 = new Set([b0]), jonction = partant(ici, B0).filter(l => ouvert(l, B0)), BT = t ? new Set(t.bornes) : null, contact = t ? partant(ici, BT).filter(l => ouvert(l, BT) && !jonction.includes(l)) : [];
    // une charge est un bout (même quand sa borne mène plus loin) ; ce qui conduit n'en est un que s'il ne mène nulle part
    if (!t || (!jonction.length && !contact.length)) out.push({ segments: chemin, fini: true, bout: [ici, borne] });
    jonction.forEach(l => passer(l, B0, { passage: ici, borne, traverse: 'jonction' }));
    contact.forEach(l => passer(l, BT, { passage: ici, borne, traverse: t.quoi, pole: t.pole })); };
  partant(repere, null).forEach(l => { const [a, b] = depuis(l, repere, null); suivre([{ fil: l, de: a, vers: b }], b[0], b[1], new Set([l])); });
  return out; }
/* (v86) LES TRAVERSÉES d'un chemin jusqu'à un câble (ou jusqu'au bout) : les relais, contacteurs et interrupteurs qu'il passe,
   contact supposé fermé — [{ repere, quoi, de, a }] (les bornes d'entrée et de sortie). La fiche d'un câble les dit. */
function traverseesDuChemin(chemin, jusqua) { const out = [];
  for (const s of (chemin && chemin.segments) || []) { if (s.fil && s.fil === jusqua) break;
    if (s.passage && s.traverse && s.traverse !== 'jonction' && !out.some(x => x.repere === s.passage && x.de === s.borne)) out.push({ repere: s.passage, quoi: s.traverse, de: String(s.borne == null ? '' : s.borne), a: String(s.borneSortie == null ? '' : s.borneSortie) }); }
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
   l'appelant les connaît (le calibre retenu), sinon ceux de son part number. `courants` (v84) : Map(câble → A), le
   courant de chaque câble quand il n'est pas le total (une branche dont la consommation est écrite : `branchesDepuis`) ;
   un passage porte le courant du câble qui y arrive, le disjoncteur le total. Rend { segments: [{…, dU, T, courant,
   porte}], disjoncteur: { nom, famille, calibre, chuteIn, R, dU } | null, dU, longueur, inconnus, reel, courant }.
   (v86) UN ÉQUIPEMENT TRAVERSÉ : le contact d'un relais, d'un contacteur, la chute d'un composant traversé de l'Excel du
   lecteur (table Chute disjoncteur, lignes RELAIS 0,2 V et CONTACTEUR 0,12 V — des « Du max » : entière dès qu'un courant
   passe, sur l'aller seul, comme le disjoncteur : `fixe`) ; un interrupteur n'est dans aucune table : sa chute n'est pas
   comptée, et le chemin le dit (`inconnus`) ; une borne commune à deux câbles (une jonction) ne chute pas. */
// la chute d'un composant traversé (l'Excel du lecteur) : 'relais' → la ligne RELAIS, 'contacteur' → CONTACTEUR ; null sinon
function chuteDuComposant(norme, quoi) { const k = quoi === 'relais' ? 'RELAIS' : quoi === 'contacteur' ? 'CONTACTEUR' : ''; if (!k) return null;
  const r = (normeDesModules(norme).chutesDisjoncteurs || []).find(x => x.famille === k && !(x.calibres || []).length && x.chuteMax != null);
  return r ? { chute: r.chuteMax, nom: r.nom, note: r.note } : null; }
const MOTS_TRAVERSEE = { relais: 'relais', contacteur: 'contacteur', interrupteur: 'interrupteur', jonction: 'borne commune' };
function chuteDuChemin(norme, chemin, courant, hyp, disjoncteur, courants) { const H = { ...HYPOTHESES, ...(hyp || {}) }, segs = [], inconnus = []; let dU = 0, longueur = 0, filPrecedent = null, reel = true;
  const regime = REGIMES[H.regime] ? H.regime : 'continu', cosphi = regime === 'continu' ? 1 : Math.min(1, Math.max(0, +H.cosphi || 0.8)), sinphi = Math.sqrt(Math.max(0, 1 - cosphi * cosphi));
  const kReg = regime === 'tri' ? Math.sqrt(3) : 1, kR = kRetour(H, regime), xParM = regime === 'continu' ? 0 : (+H.reactance || 0) / 1000 * facteurFrequence(H);
  const courantDe = l => l && courants && courants.has(l) ? courants.get(l) : courant;
  chemin.segments.forEach(s => { if (s.fil) { const l = s.fil, I = courantDe(l), L = l.longueur > 0 ? l.longueur : H.longueur, tc = temperatureDuConducteur(norme, l.type, I, H), rd = resistanceDuFil(norme, l.type, jaugeDuType(l.type), tc.T); filPrecedent = l; if (!(l.longueur > 0)) reel = false;
      const r = rd.rho != null ? rd.rho / 1000 * L * kR : null, X = xParM * L * kR, d = r == null ? null : kReg * (r * cosphi + X * sinphi) * I;
      if (d == null) inconnus.push((l.type || 'câble') + ' vers ' + l.vers + ' : type ' + (l.type || 'inconnu') + ', résistance inconnue' + (rd.refuse ? ' (conducteur ' + rd.conducteur + ' : la ligne cuivre ne vaut pas)' : '')); else dU += d; longueur += L;
      segs.push({ ...s, longueur: L, reelle: l.longueur > 0, rho: rd.rho, rho20: rd.rho20, T: rd.T, tEstimee: tc.estimee, rhoSource: rd.source, conducteur: rd.conducteur, R: r, X, dU: d, courant: I, porte: l }); }
    else if (s.traverse) { const I = courantDe(filPrecedent), comp = chuteDuComposant(norme, s.traverse), d = s.traverse === 'jonction' ? 0 : comp ? (I > 0 ? comp.chute : 0) : null;
      if (d == null) inconnus.push(s.passage + ' (' + MOTS_TRAVERSEE[s.traverse] + ') : sa chute n’est dans aucune table, elle n’est pas comptée'); else dU += d;
      segs.push({ ...s, R: s.traverse === 'jonction' ? 0 : null, dU: d, fixe: !!comp, composant: comp ? comp.nom : '', courant: I, porte: filPrecedent }); }
    else { const pn = pnDuPassage(norme, chemin, s.passage), coupure = estCoupure(s.passage), F = coupure ? familleDeNorme(norme, null, pn) : null, I = courantDe(filPrecedent);
      // la résistance de l'atelier par la gauge du câble qui arrive (l'Excel du lecteur) d'abord ; sinon celle de la famille de la prise, sinon celle de la taille
      const jauge = filPrecedent ? jaugeDuType(filPrecedent.type) : null, rAtelier = resistanceAtelier(norme, jauge), taille = tailleDeJauge(norme, F ? F.famille : '', jauge), rTaille = resistanceDeContact(norme, taille);
      const r0 = rAtelier != null ? rAtelier * (coupure ? 1 : 2) : F && F.resistance != null ? F.resistance / 1000 : rTaille != null ? rTaille * (coupure ? 1 : 2) : (coupure ? null : 0), r = r0 == null ? null : r0 * kR;
      const d = r == null ? null : kReg * r * cosphi * I; if (d == null) inconnus.push(s.passage + ' : résistance de contact inconnue'); else dU += d;
      segs.push({ ...s, R: r, dU: d, famille: F ? F.famille : '', taille: rAtelier == null && F && F.resistance != null ? '' : taille, atelier: rAtelier != null, contacts: coupure ? 1 : 2, courant: I, porte: filPrecedent }); } });
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
/* ---- LE COURANT D'UNE BRANCHE (v84, l'intégrateur : « chaque branche d'un disjoncteur est jugée au courant de ce qu'elle
   alimente en aval, quand cette consommation est écrite ») ------------------------------------------------------------
   Un câble porte ce qu'alimentent les chemins qui passent par lui : leurs bouts en aval (un équipement, un disjoncteur en
   aval). Trois cas :
     · il alimente TOUT ce que le disjoncteur dessert (le tronc, le seul câble d'un disjoncteur à une charge) : le courant
       total du profil du disjoncteur — exact (`tout`) ;
     · sinon, si la consommation de chacun de ses bouts est écrite (« Ce qu'il consomme » d'un équipement, le profil d'un
       disjoncteur en aval) : leur SOMME (`ecrite`) — les permanents s'ajoutent, les pointes aussi (tous au même instant,
       le pire), sur la plus longue durée, comme la somme qui fait le profil d'un disjoncteur (08-disjoncteurs) ;
     · sinon, le courant total du disjoncteur, la règle prudente — `manque` dit les bouts dont la consommation n'est pas
       écrite (la fiche : « courant total du disjoncteur : la consommation de ce qui est en aval n'est pas écrite »).
   Les consommations viennent de la page (`consommationDuRepere`, 08-fiche) ; le moteur seul (un Worker, une batterie)
   n'en a pas — `conso` les donne alors : repère → profil { perm: { i }, dem: { i, t }, … } ou null. Les chemins en amont
   ne comptent pas. Rend Map(câble → { tout, ecrite, commande, inconnu, bouts, manque, sans, profil, points, perm, pointe }).
   (v86, l'audit B1 : « un DR16 proposé sur le fil d'un interrupteur de commande ») LA BRANCHE DE COMMANDE. Chaque bout dit
   ce qu'il est (`natureDuBout`) : une BOBINE de relais ou une ENTRÉE de calculateur — une entrée de commande — ou une
   CHARGE. Une bobine compte la consommation écrite de son relais ; une entrée ne compte jamais celle de son calculateur
   (elle se tire sur ses broches d'alimentation). Alors :
     · une CHARGE sans consommation écrite : la règle prudente, le courant total du disjoncteur (`manque` : ce qui reste à
       écrire, ses charges et ses bobines) — une branche de puissance ;
     · sinon, des entrées de commande sans consommation (`sans` : [{ repere, nature }]) et rien d'écrit : son courant est
       INCONNU (`inconnu`) — jamais le total : rien ne le juge sur ce qu'il porte, rien ne le grossit, la fiche demande la
       consommation de la bobine ;
     · sinon, la somme de ce qui est écrit (`ecrite`), sans ces entrées de commande que `sans` nomme.
   `commande` : tout ce que la branche alimente est une entrée de commande (une bobine, une entrée de calculateur) — même
   quand son courant est écrit, un câble de commande ne grossit pas pour le disjoncteur (09 bis, `meilleurDe` ; 08-fiche,
   `plusFinQuiTient`) : sa surcharge ne se peut pas, une bobine ne tire pas plus que sa bobine. */
const consommationEcrite = r => { try { return typeof consommationDuRepere === 'function' ? consommationDuRepere(r) : null; } catch (_) { return null; } };
function profilDesBouts(profils) { let perm = 0, pic = 0, t = 0, pointe = false;
  profils.forEach(c => { const pts = pointsDuProfil(c), p = pts.find(x => x.t === Infinity), courts = pts.filter(x => x.t !== Infinity), ip = p ? p.i : 0;
    perm += ip; pic += courts.length ? courts[0].i : ip; if (courts.length) { pointe = true; t = Math.max(t, ...courts.map(x => x.t)); } });
  const out = {}; if (perm > 0) out.perm = { i: perm }; if (pointe && pic > perm) out.dem = { i: pic, t }; return out; }
const NATURES_DE_COMMANDE = new Set(['bobine', 'entree']);
function branchesDepuis(liaisons, repere, conso) { const lire = typeof conso === 'function' ? conso : consommationEcrite, chs = cheminsDepuis(liaisons, repere).filter(ch => !ch.amont);
  const tous = [...new Set(chs.map(ch => ch.bout[0]).filter(Boolean))], parFil = new Map(), out = new Map(), profils = new Map();
  // chaque câble : les bouts qu'il alimente, et ce qu'est chacun à son arrivée (une bobine, une entrée, une charge)
  chs.forEach(ch => { const r = ch.bout[0], n = r ? natureDuBout(r, ch.bout[1]) : '';
    ch.segments.forEach(s => { if (!s.fil) return; const M = parFil.get(s.fil) || parFil.set(s.fil, new Map()).get(s.fil); if (r) (M.get(r) || M.set(r, new Set()).get(r)).add(n); }); });
  const profilDe = r => { if (!profils.has(r)) { const c = r ? lire(r) : null; profils.set(r, c && pointsDuProfil(c).length ? c : null); } return profils.get(r); };
  parFil.forEach((M, l) => { const bouts = [...M.keys()].sort((a, b) => String(a).localeCompare(String(b), 'fr', { numeric: true })), tout = tous.every(r => M.has(r));
    const deCommande = r => [...M.get(r)].every(n => NATURES_DE_COMMANDE.has(n)), entree = r => [...M.get(r)].every(n => n === 'entree');
    const commande = bouts.length > 0 && bouts.every(deCommande), base = { tout, ecrite: false, commande, inconnu: false, bouts, manque: [], sans: [], profil: null, points: null, perm: null, pointe: null };
    if (tout || !bouts.length) { out.set(l, base); return; }
    // ce qui se compte : la consommation écrite d'une charge, d'une bobine (celle de son relais) — jamais celle d'un calculateur sur une entrée
    const compte = r => entree(r) ? null : profilDe(r), manque = bouts.filter(r => !compte(r)), charges = manque.filter(r => !deCommande(r));
    const sans = manque.filter(deCommande).map(r => ({ repere: r, nature: entree(r) ? 'entree' : 'bobine' })), ecrits = bouts.filter(r => compte(r));
    if (charges.length) { out.set(l, { ...base, manque: manque.filter(r => !entree(r)), sans }); return; }   // la règle prudente
    if (!ecrits.length) { out.set(l, { ...base, inconnu: true, manque: manque.filter(r => !entree(r)), sans }); return; }   // de la commande, rien d'écrit
    const profil = profilDesBouts(ecrits.map(profilDe)), points = pointsDuProfil(profil), p = points.find(x => x.t === Infinity);
    out.set(l, { ...base, ecrite: true, sans, profil, points, perm: p ? p.i : 0, pointe: points.length ? points[0].i : 0 }); });
  return out; }
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
   chemins en amont (vers la source : `cheminsDepuis`) ne sont pas des chutes en ligne. (v84) LES BRANCHES : un câble
   dont la consommation en aval est écrite (`branchesDepuis` ; `conso` pour le moteur seul) porte la sienne — son
   permanent au permanent, sa pointe à chaque pointe —, les autres le courant du disjoncteur ; le disjoncteur, le total.
   (v86) Un chemin qui passe par un câble au courant INCONNU (une branche de commande dont rien n'est écrit : `branchesDepuis`)
   n'a pas de chute en ligne : elle dépend de ce courant — la fiche du câble le dit, rien ne la juge. Un composant traversé
   (un relais : sa chute « Du max ») garde sa chute à chaque pointe. */
function chutesDepuis(norme, liaisons, repere, courant, hyp, pointes, disjoncteur, conso) { const H = { ...HYPOTHESES, ...(hyp || {}) }, regime = REGIMES[H.regime] ? H.regime : 'continu', chute = chuteAdmise(norme, H.tension, regime, H);
  const admis = chute && chute.chuteMax != null ? chute.chuteMax : null, inter = chute ? (chute.chuteInter != null ? chute.chuteInter : chute.chuteMax) : null;
  const P = (pointes || []).filter(p => p && p.i > 0 && p.t > 0 && isFinite(p.t));
  const Iperm = new Map(), Ipointe = new Map(), inconnus = new Set(); branchesDepuis(liaisons, repere, conso).forEach((b, l) => { if (b.ecrite) { Iperm.set(l, b.perm); Ipointe.set(l, b.pointe); } else if (b.inconnu) inconnus.add(l); });
  return cheminsDepuis(liaisons, repere).filter(ch => !ch.amont && !ch.segments.some(s => s.fil && inconnus.has(s.fil))).map(ch => { const c = chuteDuChemin(norme, ch, courant, H, disjoncteur, Iperm), pct = H.tension ? c.dU / H.tension * 100 : null;
    const dCb = c.disjoncteur && c.disjoncteur.dU != null ? c.disjoncteur.dU : 0, fixe = !!(c.disjoncteur && c.disjoncteur.fixe);
    // à une pointe : chaque câble au courant de sa pointe (celle de sa branche, sinon celle du disjoncteur) ; sous une minute, à la température du permanent (chaque segment monte avec son courant)
    const ps = P.map(p => { const enPointe = l => l && Ipointe.has(l) ? Ipointe.get(l) : p.i;
      const chauffe = !(courant > 0) || palierDe(p.t) === Infinity || c.segments.some(s => !(s.courant > 0) && enPointe(s.porte) > 0);
      const dU = chauffe ? chuteDuChemin(norme, ch, p.i, H, disjoncteur, Ipointe).dU
        : c.segments.reduce((u, s) => u + (s.dU != null && s.courant > 0 ? (s.fixe ? s.dU : s.dU * enPointe(s.porte) / s.courant) : 0), 0) + (fixe ? dCb : dCb * p.i / courant), intermittent = p.t <= INTERMITTENT_MAX, a = intermittent ? inter : admis;
      return { i: p.i, t: p.t, nom: p.nom || '', dU, admis: a, intermittent, chauffe, trop: !!(a != null && dU > a + 1e-9) }; });
    return { ...c, pct, admis, trop: !!(admis != null && c.dU > admis + 1e-9), tension: chute ? chute.tension : H.tension, regle: chute ? chute.regle : '', pointes: ps, tropPointe: ps.some(p => p.trop),
             mots: c.segments.map(s => s.fil ? (s.fil.type || 'câble') : '⇄ ' + s.passage).join(' → ') + ' → ' + c.bout[0] + (c.bout[1] ? ':' + c.bout[1] : '') }; }); }
/* LES FILS QU'UN DISJONCTEUR ALIMENTE : ceux qui le touchent (`direct`), et ceux de la suite de chaque chemin, à travers
   les prises de coupure et les barrettes — chacun une fois, avec sa borne de départ, l'autre bout et le passage par
   lequel il vient (`via`). C'est la liste que la protection doit juger : le disjoncteur protège tout ce qu'il nourrit,
   pas seulement ce qui est serti sur lui — et pas ce qui le nourrit (le côté source : `cheminsDepuis`, `amont`).
   (v84) Chacun dit sa BRANCHE (`branchesDepuis`) et, quand la consommation de ce qu'il alimente est écrite, les
   `points` de son profil à lui — la protection les prend à la place de ceux du disjoncteur (09 bis, `protegerFil`).
   (v86) `commande` : il ne mène qu'à des entrées de commande (des bobines, des entrées de calculateur) ; `inconnu` : son
   courant n'est pas connu (rien d'écrit) — la protection ne juge alors pas ce qu'il porte (jamais le courant total).
   Rend [{ cable, type, borne, autre, l, direct, via, branche, points, commande, inconnu }]. */
function filsDepuis(liaisons, repere, conso) { const vus = new Map(), B = branchesDepuis(liaisons, repere, conso);
  cheminsDepuis(liaisons, repere).filter(ch => !ch.amont).forEach(ch => { let via = ''; ch.segments.forEach(s => { if (s.passage) { via = s.passage; return; } const l = s.fil; if (vus.has(l)) return; const b = B.get(l) || null;
    vus.set(l, { cable: l.cable, type: l.type, borne: s.de[1], autre: s.vers[0] + (s.vers[1] ? ':' + s.vers[1] : ''), l, direct: s.de[0] === repere, via, branche: b, points: b && b.ecrite ? b.points : null, commande: !!(b && b.commande), inconnu: !!(b && b.inconnu) }); }); });
  return [...vus.values()]; }
/* (v86, l'audit M3 : « voir le circuit d'un disjoncteur ») LE CIRCUIT D'UN DISJONCTEUR, tel que le plan l'éclaire : ce que le
   courant parcourt, et dans quel sens —
     · LA SOURCE : les câbles du côté ligne (`amont`), de la batterie, de la génératrice, du TR jusqu'à lui, et le retour de
       la source à la masse (le courant revient par là) ;
     · L'ALLER : chaque câble de chaque chemin jusqu'aux charges, à travers les prises, les barrettes, les contacts supposés
       fermés (`cheminsDepuis`) ;
     · LE RETOUR : de chaque charge (une lampe, la bobine d'un relais, un calculateur) à la masse, par ses autres bornes — à
       travers une prise, une barrette, un interrupteur (une commande côté masse) s'il le faut.
   Chaque câble dit son SENS (`sens` : 'de' quand le courant y entre par son bout `de`, 'vers' sinon), son rôle, et les
   chemins où il est (`chemins` : leurs rangs ; un câble de la source est de tous). Rend { repere, cables: Map(liaison → {
   sens, role: 'source' | 'aller' | 'retour', chemins }), reperes: [les repères parcourus], charges: [{ repere, borne,
   nature, chemins }], traverses: [{ repere, quoi }], n: le nombre de chemins }. */
function circuitDuDisjoncteur(liaisons, repere) { const tous = (liaisons || []).filter(l => l && l.de && l.vers), chs = cheminsDepuis(tous, repere);
  const parRep = new Map(); tous.forEach(l => [l.de, l.vers].forEach(r => { const xs = parRep.get(r); if (!xs) parRep.set(r, [l]); else if (xs[xs.length - 1] !== l) xs.push(l); }));
  const du = r => parRep.get(r) || [], txt = b => String(b == null ? '' : b), bornesDu = r => [...new Set(du(r).flatMap(l => [[l.de, l.borneDe], [l.vers, l.borneVers]].filter(([x]) => x === r).map(([, b]) => txt(b))))];
  const cables = new Map(), reperes = new Set([repere]), charges = new Map(), traverses = new Map(), entre = (l, r, b) => l.de === r && txt(l.borneDe) === txt(b) ? 'de' : 'vers';
  const poser = (l, sens, role, i) => { let x = cables.get(l); if (!x) cables.set(l, x = { sens, role, chemins: [] }); if (i != null && !x.chemins.includes(i)) x.chemins.push(i); };
  /* LE RETOUR d'un repère vers la masse, par ses bornes `bs` : [[câble, sens depuis le repère]] de chaque suite qui y arrive */
  const versLaMasse = (r0, bs0) => { const res = [];
    const aller = (ici, bs, pile, vus, n) => { if (n > 6) return;
      du(ici).forEach(l => { if (l.de === l.vers || vus.has(l)) return; const a = [[l.de, l.borneDe], [l.vers, l.borneVers]].find(([x, b]) => x === ici && (!bs || bs.has(txt(b)))); if (!a) return;
        const z = a[0] === l.de && a[1] === l.borneDe ? [l.vers, l.borneVers] : [l.de, l.borneDe], p = [...pile, [l, entre(l, a[0], a[1])]], v = new Set([...vus, l]);
        if (estMasse(z[0])) { res.push({ cables: p, masse: z[0] }); return; }
        if (estPassage(z[0])) { aller(z[0], memePotentiel(du(z[0]), z[0], z[1]), p, v, n + 1); return; }
        const t = traverseeDe(z[0], txt(z[1]), bornesDu(z[0])); if (t && t.quoi === 'interrupteur') aller(z[0], new Set(t.bornes), p, v, n + 1); }); };
    aller(r0, bs0, [], new Set(), 0); return res; };
  chs.forEach((ch, i) => { const r = ch.bout[0];
    ch.segments.forEach(s => { if (s.fil) { const e = entre(s.fil, s.de[0], s.de[1]); poser(s.fil, ch.amont ? (e === 'de' ? 'vers' : 'de') : e, ch.amont ? 'source' : 'aller', ch.amont ? null : i); }
      else { reperes.add(s.passage); if (s.traverse && s.traverse !== 'jonction' && !ch.amont) traverses.set(s.passage, s.traverse); } });
    if (r) reperes.add(r);
    if (ch.amont && r && estSource(r)) versLaMasse(r, new Set(bornesDu(r).filter(b => b !== txt(ch.bout[1])))).forEach(x => { x.cables.forEach(([l, e]) => poser(l, e === 'de' ? 'vers' : 'de', 'source', null)); reperes.add(x.masse); });
    if (!ch.amont && r && ch.fini && !estMasse(r) && !estDisjoncteur(r)) { const k = r + '\u0001' + txt(ch.bout[1]), c = charges.get(k) || charges.set(k, { repere: r, borne: txt(ch.bout[1]), nature: natureDuBout(r, ch.bout[1]), chemins: [] }).get(k); c.chemins.push(i); } });
  // le retour de chaque charge, par ses autres bornes (une charge vue à deux bornes : ni l'une ni l'autre ne sont son retour) ;
  // une entrée de calculateur n'en a pas qui se dessine : ses quelques milliampères reviennent par le calculateur
  const arrivees = new Map(); charges.forEach(c => (arrivees.get(c.repere) || arrivees.set(c.repere, new Set()).get(c.repere)).add(c.borne));
  charges.forEach(c => c.nature !== 'entree' && versLaMasse(c.repere, new Set(bornesDu(c.repere).filter(b => !arrivees.get(c.repere).has(b)))).forEach(x => { x.cables.forEach(([l, e]) => { if (!cables.has(l) || cables.get(l).role === 'retour') c.chemins.forEach(i => poser(l, e, 'retour', i)); }); reperes.add(x.masse); }));
  return { repere, cables, reperes: [...reperes], charges: [...charges.values()], traverses: [...traverses].map(([r, quoi]) => ({ repere: r, quoi })), n: chs.length }; }

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
